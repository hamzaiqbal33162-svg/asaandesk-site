// Real-time collaboration for the PDF editor: the browser side of services/asaandesk-api/src/collab.js.
// Plain ES module, no dependencies, never touches the DOM (it only listens for "visibilitychange" to pause polling).
//
// Everything is end-to-end encrypted with AES-GCM (256-bit room key). The key travels only in the link's #fragment,
// which browsers never send to a server. The server stores ciphertext, numbers the ops (seq) and relays them.
// Writing needs the write token = base64url(SHA-256(rawKey || "asaandesk-collab-write")); the server keeps its hash.
//
//   createRoom({api, pdfBytes, user, name?, origin?, linkPath?})
//                                             -> {id, key, link, session, ownerToken, expiresAt}
//                                                link = `${origin ?? location.origin}${linkPath ?? '/tools/pdf-editor'}?room=<id>#k=<key>`
//   parseRoomLink(href)                       -> {id, key} | null          (reads ?room=<id> and #k=<key>)
//   joinRoom({api, id, key, user})            -> {session, pdfBytes, name, expiresAt}
//   deleteRoom({api, id, ownerToken})         -> closes the room for everyone (creator only)
//
//   session.send(op)           JSON value; queued, encrypted, batched into the next sync. Resolves with its seq.
//                              Rejects (err.code 'COLLAB_OP_TOO_LARGE') when the encrypted op is over 300 KB.
//   session.onOps(cb)          cb(ops, {client, seq, seqs}): REMOTE ops in seq order (runs from one client per call).
//                              Ops that arrive before the first onOps listener are buffered and delivered to it.
//   session.setPresence(obj)   e.g. {page, x, y}; merged over {name, color} from `user`, sent with the next sync.
//   session.onPresence(cb)     cb([{...obj, client, ageMs}]) for the OTHER people, whenever that set changes or updates.
//   session.onStatus(cb)       cb({state: 'live' | 'offline' | 'error', message})
//   session.client / session.id / session.seq (last seq received) / session.status / session.others
//   session.ready              Promise: resolves once the history of ops that existed at join time has been received.
//   session.close()            flushes queued ops, tells the others you left, stops. Returns a Promise.
// Each on*() returns an unsubscribe function. Listener errors are caught and logged.

const enc = new TextEncoder(), dec = new TextDecoder();
const KB = 1024, MB = 1048576, MAX_PDF = 15 * MB - KB, MAX_OP = 300 * KB, MAX_PRESENCE_JSON = 5000, REQUEST_BUDGET = 880 * KB, OPS_PER_REQUEST = 50;
const CHECK = 'asaandesk-collab-ok', WRITE_SUFFIX = 'asaandesk-collab-write';
const AAD_FILE = 'asaandesk-collab/file', AAD_CHECK = 'asaandesk-collab/check';
const ROOM_ID = /^[A-Za-z0-9_-]{12}$/, KEY_B64 = /^[A-Za-z0-9_-]{43}$/;
const TIMING = {active: 700, idle: 3000, activeWindow: 10000, kick: 40, burst: 60, backoffBase: 1000, backoffMax: 15000, timeout: 20000};
const MSG = {
  network: 'Could not reach the AsaanDesk server. Check your internet connection.',
  offline: 'Connection lost. Trying again…',
  live: 'Connected. Changes are shared live.',
  badLink: 'This editing link is incomplete or wrong. Ask for the full link again.',
  closed: 'The editing session is closed.',
  COLLAB_NOT_FOUND: 'This editing link has expired or was closed.',
  ASAANDESK_FORBIDDEN: 'This link cannot make changes. Open the full link again.',
  COLLAB_ROOM_FULL: 'This document has too many changes for one link. Download it and share a new editing link.',
  COLLAB_OP_TOO_LARGE: 'This change is too large to share live (limit 300 KB). Use a smaller image.',
  COLLAB_REQUEST_TOO_LARGE: 'Too many changes were sent at once. Try again.',
  FILE_TOO_LARGE: 'PDFs up to 15 MB can be edited together. Compress the file first.',
  ASAANDESK_LIMIT: 'Today\'s free limit for shared editing links is reached. Try again tomorrow.',
  ASAANDESK_FULL: 'Shared editing is busy right now. Try again later.',
};

// ---------- encoding + crypto helpers
function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64len = n => Math.ceil(n * 4 / 3); // unpadded base64url length of n bytes
const rand = n => crypto.getRandomValues(new Uint8Array(n));
const importKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function seal(key, plain, aad) {
  const iv = rand(12), ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: enc.encode(aad)}, key, plain));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return out;
}
async function unseal(key, sealed, aad) {
  return new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: sealed.subarray(0, 12), additionalData: enc.encode(aad)}, key, sealed.subarray(12)));
}
async function writeToken(raw) {
  const suffix = enc.encode(WRITE_SUFFIX), all = new Uint8Array(raw.length + suffix.length);
  all.set(raw); all.set(suffix, raw.length);
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', all)));
}
function keyBytes(key) {
  const raw = typeof key === 'string' ? (KEY_B64.test(key) ? unb64url(key) : null) : key instanceof Uint8Array ? key : null;
  if (!raw || raw.length !== 32) throw new Error(MSG.badLink);
  return raw;
}
async function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data && typeof data.arrayBuffer === 'function') return new Uint8Array(await data.arrayBuffer());
  throw new TypeError('pdfBytes must be a Uint8Array, ArrayBuffer or Blob.');
}
const apiBase = api => { if (!api || typeof api !== 'string') throw new TypeError('api (the AsaanDesk server URL) is required.'); return api.replace(/\/+$/, ''); };
function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal;
}

/** fetch + the API's {data} / {error} envelope. Errors carry .status (0 = network) and .code. */
async function call(api, path, init = {}) {
  let res;
  try { res = await fetch(api + path, {credentials: 'omit', ...init}); } catch (e) {
    throw Object.assign(new Error(MSG.network), {status: 0, code: 'NETWORK', cause: e});
  }
  if (res.ok && (res.headers.get('content-type') || '').startsWith('application/octet-stream')) return new Uint8Array(await res.arrayBuffer());
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.data === undefined) {
    const code = d.error?.code || 'HTTP_' + res.status, serverMessage = d.error?.message || '';
    throw Object.assign(new Error(MSG[code] || serverMessage || `Server error (${res.status}).`), {status: res.status, code, serverMessage});
  }
  return d.data;
}

// ---------- rooms
export async function createRoom({api, pdfBytes, user = {}, name = 'document.pdf', origin, linkPath = '/tools/pdf-editor', timing} = {}) {
  api = apiBase(api);
  const bytes = await toBytes(pdfBytes);
  if (bytes.byteLength > MAX_PDF) throw Object.assign(new Error(MSG.FILE_TOO_LARGE), {code: 'FILE_TOO_LARGE'});
  const raw = rand(32), key = await importKey(raw), token = await writeToken(raw);
  const meta = enc.encode(JSON.stringify({name: String(name || 'document.pdf').slice(0, 120), type: 'application/pdf'}));
  const plain = new Uint8Array(4 + meta.length + bytes.byteLength);
  new DataView(plain.buffer).setUint32(0, meta.length); plain.set(meta, 4); plain.set(bytes, 4 + meta.length);
  const sealed = await seal(key, plain, AAD_FILE), body = new Uint8Array(3 + sealed.length);
  body.set([0x41, 0x44, 0x31]); body.set(sealed, 3); // "AD1" envelope, like share links
  const check = b64url(await seal(key, enc.encode(CHECK), AAD_CHECK));
  const d = await call(api, '/collab', {method: 'POST', body, headers: {'content-type': 'application/octet-stream', 'x-write': token, 'x-check': check}});
  const k = b64url(raw), base = origin ?? (typeof location !== 'undefined' ? location.origin : '');
  return {id: d.id, key: k, link: `${base}${linkPath}?room=${d.id}#k=${k}`, ownerToken: d.ownerToken, expiresAt: d.expiresAt,
    session: startSession({api, id: d.id, key, token, user, timing})};
}

export function parseRoomLink(href) {
  let url;
  try { url = new URL(String(href), 'https://asaandesk.invalid'); } catch { return null; }
  const id = url.searchParams.get('room') || '', key = new URLSearchParams(url.hash.replace(/^#/, '')).get('k') || '';
  return ROOM_ID.test(id) && KEY_B64.test(key) ? {id, key} : null;
}

export async function joinRoom({api, id, key, user = {}, timing} = {}) {
  api = apiBase(api);
  if (!ROOM_ID.test(String(id))) throw new Error(MSG.badLink);
  const raw = keyBytes(key), k = await importKey(raw);
  const info = await call(api, `/collab/${id}`);
  // The check block proves the key is right before the (possibly large) file is downloaded.
  let ok = false;
  try { ok = dec.decode(await unseal(k, unb64url(info.check), AAD_CHECK)) === CHECK; } catch { /* wrong key */ }
  if (!ok) throw new Error(MSG.badLink);
  const body = await call(api, `/collab/${id}/file`);
  if (!(body instanceof Uint8Array) || body.length < 40 || body[0] !== 0x41 || body[1] !== 0x44 || body[2] !== 0x31) throw new Error(MSG.badLink);
  let plain;
  try { plain = await unseal(k, body.subarray(3), AAD_FILE); } catch { throw new Error(MSG.badLink); }
  const n = new DataView(plain.buffer, plain.byteOffset).getUint32(0);
  let meta = {};
  try { meta = JSON.parse(dec.decode(plain.subarray(4, 4 + n))); } catch { /* name is optional */ }
  return {pdfBytes: plain.slice(4 + n), name: meta.name || 'document.pdf', expiresAt: info.expiresAt,
    session: startSession({api, id, key: k, token: await writeToken(raw), user, timing})};
}

export async function deleteRoom({api, id, ownerToken}) {
  try { await call(apiBase(api), `/collab/${id}`, {method: 'DELETE', headers: {'x-owner': String(ownerToken || '')}}); } catch (e) {
    if (e.status === 403) e.message = 'Only the person who created this editing link can close it.';
    throw e;
  }
}

// ---------- live session (polling sync loop)
function startSession({api, id, key, token, user, timing}) {
  const T = {...TIMING, ...timing};
  const client = b64url(rand(12)); // 16 chars, new for every tab/session
  const AAD_OP = `asaandesk-collab/op/${id}`, AAD_PRESENCE = `asaandesk-collab/presence/${id}`, syncPath = `/collab/${id}/sync`;
  const listeners = {ops: new Set(), presence: new Set(), status: new Set()};
  const queue = [];            // encrypted ops waiting to be sent: {data, resolve, reject}
  const buffered = [];         // remote op runs received before anyone listened
  const seen = new Set();      // IVs of remote ops already delivered (drops the duplicate a retried request can leave)
  let others = new Map(), othersSig = '';
  let after = 0, closed = false, stopped = false, inflight = null, timer = null, timerAt = Infinity, failures = 0, flushing = false;
  let lastActivity = Date.now(), status = null, encChain = Promise.resolve(), presenceCipher = null, presenceVersion = 0, closing = null, stopError = null;
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  ready.catch(() => {});

  const doc = typeof document !== 'undefined' ? document : null;
  const hidden = () => Boolean(doc && doc.hidden);
  const onVisibility = () => { if (!hidden()) { lastActivity = Date.now(); schedule(0); } };
  doc?.addEventListener?.('visibilitychange', onVisibility);

  function emit(kind, ...args) { for (const cb of [...listeners[kind]]) { try { cb(...args); } catch (e) { console.error('[collab]', e); } } }
  function setStatus(state, message) {
    if (status && status.state === state && status.message === message) return;
    status = {state, message}; emit('status', status);
  }
  const othersList = () => [...others].map(([c, v]) => ({...v.obj, client: c, ageMs: v.ageMs}));

  function schedule(ms) {
    if (closed || stopped) return;
    const at = Date.now() + ms;
    if (timer !== null && timerAt <= at) return;
    clearTimeout(timer); timerAt = at;
    timer = setTimeout(() => { timer = null; timerAt = Infinity; tick(); }, Math.max(0, ms));
  }
  async function tick() {
    if (closed || stopped || inflight) return;
    if (hidden() && !queue.length) return; // paused until the tab is visible again (queued ops are still flushed)
    inflight = syncOnce().catch(e => { console.error('[collab]', e); return T.backoffMax; });
    const delay = await inflight;
    inflight = null;
    schedule(delay);
  }
  function takeBatch() {
    const out = [];
    let size = 0;
    while (queue.length && out.length < OPS_PER_REQUEST && (!out.length || size + queue[0].data.length + 3 <= REQUEST_BUDGET)) {
      const o = queue.shift(); size += o.data.length + 3; out.push(o);
    }
    return out;
  }
  function stop(err) {
    stopped = true; stopError = err; clearTimeout(timer); timer = null;
    doc?.removeEventListener?.('visibilitychange', onVisibility);
    for (const o of queue.splice(0)) o.reject(err);
    readyReject(err);
    setStatus('error', err.message);
  }

  /** One request. Never throws; returns the delay before the next one. */
  async function syncOnce() {
    const batch = takeBatch();
    let data;
    try {
      data = await call(api, syncPath, {method: 'POST', headers: {'content-type': 'application/json', 'x-write': token},
        body: JSON.stringify({client, after, ops: batch.map(o => o.data), presence: presenceCipher}), signal: timeoutSignal(T.timeout)});
    } catch (e) {
      if (e.status === 403 || e.status === 404 || e.status === 410) { batch.forEach(o => o.reject(e)); stop(e); return 0; }
      if (e.status === 400 || e.status === 413) { batch.forEach(o => o.reject(e)); failures = 0; setStatus('error', e.message); return T.active; }
      queue.unshift(...batch); // network, timeout, 429 or 5xx: retry the same ciphertexts later
      failures++;
      setStatus('offline', MSG.offline);
      return Math.min(T.backoffMax, T.backoffBase * 2 ** (failures - 1));
    }
    failures = 0;
    batch.forEach((o, i) => o.resolve(data.accepted?.[i]));
    if (closed) return 0;
    await receive(data);
    setStatus('live', MSG.live);
    if (data.seq > after) return T.burst; // more pages of history waiting
    readyResolve();
    if (queue.length) return T.burst;
    return Date.now() - lastActivity < T.activeWindow ? T.active : T.idle;
  }

  async function receive(data) {
    const runs = [];
    let run = null;
    for (const r of data.ops || []) {
      if (r.seq <= after) continue;
      after = r.seq;
      if (r.client === client) continue; // own op, already confirmed through `accepted`
      const iv = r.data.slice(0, 16);
      if (seen.has(iv)) continue;
      let op;
      try { op = JSON.parse(dec.decode(await unseal(key, unb64url(r.data), AAD_OP))); } catch { continue; }
      seen.add(iv);
      if (run && run.meta.client === r.client) { run.ops.push(op); run.meta.seq = r.seq; run.meta.seqs.push(r.seq); }
      else runs.push(run = {ops: [op], meta: {client: r.client, seq: r.seq, seqs: [r.seq]}});
    }
    if (runs.length) lastActivity = Date.now();
    for (const g of runs) {
      if (!listeners.ops.size || flushing) buffered.push(g);
      else emit('ops', g.ops, g.meta);
    }

    const next = new Map();
    for (const p of data.presence || []) {
      if (p.client === client) continue;
      const prev = others.get(p.client);
      let obj = prev && prev.data === p.data ? prev.obj : null;
      if (!obj) {
        try {
          const v = JSON.parse(dec.decode(await unseal(key, unb64url(p.data), AAD_PRESENCE)));
          obj = v && typeof v === 'object' && !Array.isArray(v) ? v : {value: v};
        } catch { continue; }
      }
      next.set(p.client, {data: p.data, obj, ageMs: p.age_ms});
    }
    const sig = [...next].map(([c, v]) => c + ':' + v.data).join('|');
    others = next;
    if (sig !== othersSig) {
      othersSig = sig;
      if (next.size) lastActivity = Date.now();
      emit('presence', othersList());
    }
  }

  function setPresence(obj = {}) {
    if (closed || stopped) return;
    const json = JSON.stringify({name: user?.name, color: user?.color, ...obj});
    const plain = enc.encode(json);
    if (plain.length > MAX_PRESENCE_JSON) throw new Error('Presence data is too large (keep it under 5 KB).');
    const v = ++presenceVersion;
    lastActivity = Date.now();
    const done = seal(key, plain, AAD_PRESENCE).then(s => { if (v === presenceVersion) presenceCipher = b64url(s); });
    schedule(T.active);
    return done;
  }

  function send(op) {
    if (closed || stopped) return Promise.reject(new Error(stopError?.message || MSG.closed));
    let plain;
    try { const json = JSON.stringify(op); if (json === undefined) throw new Error('nothing to send'); plain = enc.encode(json); } catch (e) {
      return Promise.reject(new Error('This change could not be shared: ' + e.message));
    }
    const size = b64len(plain.length + 28); // IV + AES-GCM tag
    if (size > MAX_OP) {
      return Promise.reject(Object.assign(new Error(`This change is too large to share live (${Math.ceil(size / KB)} KB after encryption, the limit is 300 KB). Downscale big images before adding them.`), {code: 'COLLAB_OP_TOO_LARGE', size}));
    }
    lastActivity = Date.now();
    return new Promise((resolve, reject) => {
      // Encrypt in call order so ops are queued (and numbered by the server) in the order send() was called.
      const job = encChain.then(async () => {
        const data = b64url(await seal(key, plain, AAD_OP));
        if (stopped) throw new Error(stopError?.message || MSG.closed);
        queue.push({data, resolve, reject});
        if (!inflight) schedule(T.kick);
      });
      encChain = job.catch(() => {});
      job.catch(reject);
    });
  }

  function close() {
    if (closing) return closing;
    closed = true;
    clearTimeout(timer); timer = null;
    doc?.removeEventListener?.('visibilitychange', onVisibility);
    closing = (async () => {
      await encChain;
      if (inflight) await inflight;
      if (!stopped) {
        // Flush what is still queued, and say goodbye so the others drop this cursor at once.
        do {
          const batch = takeBatch(), body = JSON.stringify({client, after: Number.MAX_SAFE_INTEGER, ops: batch.map(o => o.data), presence: null, leave: !queue.length});
          try {
            const d = await call(api, syncPath, {method: 'POST', headers: {'content-type': 'application/json', 'x-write': token}, body, keepalive: body.length < 60000, signal: timeoutSignal(T.timeout)});
            batch.forEach((o, i) => o.resolve(d.accepted?.[i]));
          } catch (e) { batch.forEach(o => o.reject(e)); for (const o of queue.splice(0)) o.reject(e); }
        } while (queue.length);
      }
      stopped = true;
      readyReject(new Error(MSG.closed));
      for (const set of Object.values(listeners)) set.clear();
    })();
    return closing;
  }

  const on = (kind, cb, replay) => {
    if (typeof cb !== 'function') throw new TypeError('callback must be a function');
    listeners[kind].add(cb);
    if (replay) queueMicrotask(() => { try { replay(); } catch (e) { console.error('[collab]', e); } });
    return () => listeners[kind].delete(cb);
  };
  const session = {
    id, client, ready, send, setPresence, close,
    get seq() { return after; },
    get status() { return status; },
    get others() { return othersList(); },
    onOps(cb) {
      // Ops received before the first listener are replayed to it (in order) right after this call returns.
      const flush = buffered.length && !flushing ? () => { while (buffered.length) { const g = buffered.shift(); emit('ops', g.ops, g.meta); } flushing = false; } : null;
      if (flush) flushing = true;
      return on('ops', cb, flush);
    },
    onPresence(cb) { return on('presence', cb, others.size ? () => listeners.presence.has(cb) && cb(othersList()) : null); },
    onStatus(cb) { return on('status', cb, status ? () => listeners.status.has(cb) && cb(status) : null); },
  };
  // First sync as soon as the initial presence ({name, color}) is encrypted.
  try { setPresence({}).then(() => schedule(0), () => schedule(0)); } catch (e) { console.error('[collab]', e); schedule(0); }
  return session;
}
