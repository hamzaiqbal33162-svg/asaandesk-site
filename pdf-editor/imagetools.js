// Background remover and magic eraser that run fully in the browser.
//
// Nothing here loads until a tool is used: the first call (or preload()) downloads ONNX Runtime Web
// (WASM, one thread, so no COOP/COEP headers are needed) and the model, both from this site, through
// the normal HTTP cache. Sessions stay in memory for repeated use (unload() frees them).
//
//   Background removal: U²-Netp (Apache-2.0), 320×320 saliency mask, upsampled to full resolution.
//   Magic eraser:       MI-GAN Places2 512 ONNX pipeline (MIT). The brushed area is cropped with
//                       context, resized to 512, filled, resized back and blended in with a feather.
//   No model / failure: fallbackInpaint() (pure JS pyramid fill + texture), used automatically.
//
// The *Data functions work on {data: Uint8ClampedArray (RGBA), width, height} and need no DOM, so they
// also run in Node (tests/imagetools.test.mjs) and in workers. Licences: models/LICENSES.md, lib/ort/.

const HERE = new URL('./', import.meta.url);
const ORT_DIR = new URL('lib/ort/', HERE);
const MODEL_DIR = new URL('models/', HERE);

export const RUNTIME = Object.freeze({
  name: 'ONNX Runtime Web', version: '1.30.0', licence: 'MIT', size: '14 MB', bytes: 14239897,
  source: 'https://github.com/microsoft/onnxruntime',
});

export const MODELS = Object.freeze({
  bg: Object.freeze({
    name: 'U²-Netp', task: 'Background removal', licence: 'Apache-2.0', size: '4.6 MB', bytes: 4574861,
    file: 'u2netp.onnx', input: 320, credit: 'U²-Net by Xuebin Qin et al.',
    source: 'https://github.com/xuebinqin/U-2-Net',
  }),
  erase: Object.freeze({
    name: 'MI-GAN', task: 'Magic eraser', licence: 'MIT', size: '28 MB', bytes: 28079181,
    // Stored in two pieces (each under the 25 MiB file limit of Cloudflare and of the local dev server), joined after download.
    file: 'migan_pipeline_v2.onnx', parts: ['migan_pipeline_v2.onnx.part0', 'migan_pipeline_v2.onnx.part1'], input: 512, credit: 'MI-GAN by Picsart AI Research',
    source: 'https://github.com/Picsart-AI-Research/MI-GAN',
  }),
});

const LABEL = {bg: 'background', erase: 'eraser'};
const NO_WASM = {
  bg: 'Background removal needs a modern browser with WebAssembly.',
  erase: 'The magic eraser needs a modern browser with WebAssembly.',
};
const MAX_PIXELS = 50e6;

/* ---------- small helpers ---------- */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const mbText = (bytes) => (bytes >= 9.5e6 ? `${Math.round(bytes / 1e6)} MB` : `${(bytes / 1e6).toFixed(1)} MB`);
const isNode = () => typeof process === 'object' && !!(process.versions && process.versions.node);

function emitter(onProgress) {
  return (p) => {
    if (typeof onProgress !== 'function') return;
    try { onProgress(p); } catch { /* a broken progress UI must not stop the tool */ }
  };
}

// Let the page paint the progress message before a long synchronous step.
function tick() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      let done = false;
      const go = () => { if (!done) { done = true; setTimeout(resolve, 0); } };
      requestAnimationFrame(go);
      setTimeout(go, 50); // rAF does not fire in background tabs
    } else setTimeout(resolve, 0);
  });
}

function wasmSupported() {
  try {
    // A module that uses a SIMD instruction: ONNX Runtime Web 1.30 ships only SIMD builds.
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function'
      && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch {
    return false;
  }
}

function checkImage(img, what = 'image') {
  if (!img || !img.data || !(img.width > 0) || !(img.height > 0)) throw new Error(`The ${what} is empty or has not finished loading.`);
  if (img.width * img.height > MAX_PIXELS) throw new Error('This image is too big (over 50 megapixels). Please use a smaller image.');
  if (img.data.length < img.width * img.height * 4) throw new Error(`The ${what} data is incomplete.`);
}

/* ---------- downloads and sessions ---------- */

// A model file, or its pieces downloaded one after the other and joined.
async function fetchModel(info, onLoaded, what) {
  if (!info.parts) return fetchBytes(new URL(info.file, MODEL_DIR), onLoaded, what);
  const pieces = [];
  let done = 0;
  for (const part of info.parts) {
    const b = await fetchBytes(new URL(part, MODEL_DIR), (n) => onLoaded(done + n), what);
    pieces.push(b);
    done += b.byteLength;
  }
  const out = new Uint8Array(done);
  let o = 0;
  for (const b of pieces) { out.set(b, o); o += b.byteLength; }
  if (out.byteLength !== info.bytes) throw new Error(`The ${what} download was incomplete. Please try again.`);
  return out;
}

async function fetchBytes(url, onLoaded, what) {
  if (url.protocol === 'file:' && isNode()) { // tests in Node read the same files from disk
    const {readFile} = await import('node:fs/promises');
    const buf = await readFile(decodeURIComponent(url.pathname));
    onLoaded(buf.byteLength);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const offline = `Could not download the ${what}. Please check your internet connection and try again.`;
  let res;
  try { res = await fetch(url.href); } catch { throw new Error(offline); }
  if (!res.ok) throw new Error(`Could not download the ${what} (error ${res.status}). Please try again later.`);
  try {
    if (!res.body || typeof res.body.getReader !== 'function') {
      const b = new Uint8Array(await res.arrayBuffer());
      onLoaded(b.byteLength);
      return b;
    }
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onLoaded(loaded);
    }
    const out = new Uint8Array(loaded);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.byteLength; }
    return out;
  } catch {
    throw new Error(offline);
  }
}

let ort = null; // the onnxruntime-web module once loaded
let runtimeJob = null;

function loadRuntime() {
  if (runtimeJob) return runtimeJob;
  const job = {listeners: new Set(), loaded: 0, done: false};
  // ?v= keeps the glue and the wasm in step when the site's service worker serves cached copies
  const ortFile = (name) => new URL(`${name}?v=${RUNTIME.version}`, ORT_DIR);
  job.promise = (async () => {
    const [mod, wasmBinary] = await Promise.all([
      import(ortFile('ort.wasm.min.mjs').href),
      fetchBytes(ortFile('ort-wasm-simd-threaded.wasm'), (n) => {
        job.loaded = n;
        for (const f of job.listeners) f();
      }, 'image engine'),
    ]);
    mod.env.wasm.numThreads = 1; // GitHub Pages has no COOP/COEP, so no SharedArrayBuffer threads
    mod.env.wasm.proxy = false;
    mod.env.wasm.wasmPaths = {mjs: ortFile('ort-wasm-simd-threaded.mjs').href, wasm: ortFile('ort-wasm-simd-threaded.wasm').href};
    mod.env.wasm.wasmBinary = wasmBinary; // already downloaded above with progress
    mod.env.logLevel = 'error';
    ort = mod;
    job.done = true;
    return mod;
  })();
  job.promise.catch(() => { if (runtimeJob === job) runtimeJob = null; }); // allow a retry
  runtimeJob = job;
  return job;
}

const sessionJobs = {};

function loadSession(kind, onProgress) {
  let job = sessionJobs[kind];
  if (!job) {
    job = {listeners: new Set(), last: null, session: null};
    job.emit = (p) => { job.last = p; for (const f of job.listeners) f(p); };
    job.promise = createSession(kind, job.emit).then((s) => { job.session = s; return s; });
    job.promise.catch(() => { if (sessionJobs[kind] === job) delete sessionJobs[kind]; });
    sessionJobs[kind] = job;
  }
  if (onProgress && !job.session) {
    job.listeners.add(onProgress);
    if (job.last) onProgress(job.last);
    const off = () => job.listeners.delete(onProgress);
    job.promise.then(off, off);
  }
  return job.promise;
}

async function createSession(kind, emit) {
  if (!wasmSupported()) throw new Error(NO_WASM[kind]);
  const info = MODELS[kind];
  const label = LABEL[kind];
  const rt = loadRuntime();
  const rtPending = !rt.done;
  const total = (rtPending ? RUNTIME.bytes : 0) + info.bytes;
  const message = `Downloading the ${label} model (${mbText(total)}, first time only)…`;
  let modelLoaded = 0;
  let lastPct = -1;
  const report = () => {
    const loaded = Math.min(total, (rtPending ? Math.min(rt.loaded, RUNTIME.bytes) : 0) + Math.min(modelLoaded, info.bytes));
    const pct = Math.floor((loaded / total) * 100);
    if (pct === lastPct) return;
    lastPct = pct;
    emit({stage: 'download', loaded, total, message});
  };
  rt.listeners.add(report);
  report();
  let bytes;
  try {
    [, bytes] = await Promise.all([
      rt.promise,
      fetchModel(info, (n) => { modelLoaded = n; report(); }, `${label} model`),
    ]);
  } finally {
    rt.listeners.delete(report);
  }
  emit({stage: 'model', loaded: total, total, message: `Starting the ${label} model…`});
  await tick();
  try {
    return await ort.InferenceSession.create(bytes, {executionProviders: ['wasm'], graphOptimizationLevel: 'all'});
  } catch (e) {
    throw new Error(`Could not start the ${label} model in this browser (${(e && e.message) || e}). Please reload the page and try again.`);
  }
}

// One inference at a time per session (ONNX Runtime Web sessions are not re-entrant).
const runQueue = {};
function runExclusive(kind, fn) {
  const next = (runQueue[kind] || Promise.resolve()).then(fn, fn);
  runQueue[kind] = next.catch(() => {});
  return next;
}

/** Start downloading the runtime and a model early ('bg' | 'erase'). Safe to call many times. */
export function preload(kind) {
  if (!MODELS[kind]) return Promise.resolve(false);
  return loadSession(kind).then(() => true, () => false);
}

/** True when the model for kind is downloaded and ready (no download message needed). */
export function isReady(kind) {
  return !!(sessionJobs[kind] && sessionJobs[kind].session);
}

/** Free a loaded model ('bg' | 'erase') when the editor closes; the next use loads it again. */
export async function unload(kind) {
  const job = sessionJobs[kind];
  if (!job) return;
  delete sessionJobs[kind];
  try {
    const s = await job.promise;
    await (runQueue[kind] || Promise.resolve());
    await s.release();
  } catch { /* nothing to free */ }
}

/* ---------- resampling ---------- */

// 1-D taps for mapping source span [s0, s0+sn) onto dn samples: area average when shrinking,
// bilinear (pixel centres, edge clamped) when enlarging.
function taps(s0, sn, dn) {
  const scale = sn / dn;
  const start = new Int32Array(dn + 1);
  const idx = [];
  const wts = [];
  for (let i = 0; i < dn; i++) {
    start[i] = idx.length;
    if (scale > 1) {
      const a = i * scale;
      const b = a + scale;
      for (let j = Math.floor(a); j < Math.ceil(b) && j < sn; j++) {
        const w = Math.min(b, j + 1) - Math.max(a, j);
        if (w > 1e-7) { idx.push(s0 + j); wts.push(w / scale); }
      }
    } else {
      const x = clamp((i + 0.5) * scale - 0.5, 0, sn - 1);
      const j = Math.floor(x);
      const f = x - j;
      idx.push(s0 + j); wts.push(1 - f);
      if (f > 0) { idx.push(s0 + Math.min(j + 1, sn - 1)); wts.push(f); }
    }
  }
  start[dn] = idx.length;
  return {start, idx: Int32Array.from(idx), wts: Float32Array.from(wts)};
}

/**
 * Resample the rectangle (x0,y0,w,h) of an interleaved image (stride channels per pixel, first nch
 * used) to dw×dh. Returns interleaved Float32Array(dw*dh*nch).
 */
export function resample(src, stride, nch, sw, x0, y0, w, h, dw, dh) {
  const tx = taps(x0, w, dw);
  const ty = taps(y0, h, dh);
  const tmp = new Float32Array(dw * h * nch);
  for (let y = 0; y < h; y++) {
    const row = (y0 + y) * sw;
    const o = y * dw * nch;
    for (let i = 0; i < dw; i++) {
      for (let c = 0; c < nch; c++) {
        let s = 0;
        for (let k = tx.start[i]; k < tx.start[i + 1]; k++) s += src[(row + tx.idx[k]) * stride + c] * tx.wts[k];
        tmp[o + i * nch + c] = s;
      }
    }
  }
  const out = new Float32Array(dw * dh * nch);
  const rowLen = dw * nch;
  for (let j = 0; j < dh; j++) {
    const o = j * rowLen;
    for (let k = ty.start[j]; k < ty.start[j + 1]; k++) {
      const wgt = ty.wts[k];
      const t = (ty.idx[k] - y0) * rowLen;
      for (let i = 0; i < rowLen; i++) out[o + i] += tmp[t + i] * wgt;
    }
  }
  return out;
}

/* ---------- binary mask tools ---------- */

// Square (Chebyshev) dilation of a 0/1 mask by r pixels, O(n) via prefix sums.
function dilate(mask, w, h, r) {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(w * h);
  const pre = new Int32Array(Math.max(w, h) + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + mask[row + x];
    for (let x = 0; x < w; x++) tmp[row + x] = pre[Math.min(w, x + r + 1)] - pre[Math.max(0, x - r)] > 0 ? 1 : 0;
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) out[y * w + x] = pre[Math.min(h, y + r + 1)] - pre[Math.max(0, y - r)] > 0 ? 1 : 0;
  }
  return out;
}

// Box blur of a 0/1 mask (radius r, exact integer sums, normalised by the in-image window) → 0..1.
function boxBlurMask(mask, w, h, r) {
  const out = new Float32Array(w * h);
  if (r <= 0) { for (let i = 0; i < w * h; i++) out[i] = mask[i]; return out; }
  const tmp = new Int32Array(w * h);
  const pre = new Int32Array(Math.max(w, h) + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + mask[row + x];
    for (let x = 0; x < w; x++) tmp[row + x] = pre[Math.min(w, x + r + 1)] - pre[Math.max(0, x - r)];
  }
  for (let x = 0; x < w; x++) {
    const cw = Math.min(w, x + r + 1) - Math.max(0, x - r);
    for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const a = Math.max(0, y - r);
      const b = Math.min(h, y + r + 1);
      out[y * w + x] = (pre[b] - pre[a]) / (cw * (b - a));
    }
  }
  return out;
}

/**
 * Turn a mask ({data,width,height}, RGBA or one byte per pixel) into 0/1 per image pixel.
 * RGBA: if any pixel is not fully opaque, alpha > 0 means erase; otherwise any colour > 0 (luminance > 0).
 * A mask of a different size is scaled to the image (nearest neighbour).
 */
export function maskToHoles(mask, width, height) {
  if (!mask || !mask.data || !(mask.width > 0) || !(mask.height > 0)) throw new Error('The eraser mask is empty.');
  const {width: mw, height: mh, data: d} = mask;
  const n = mw * mh;
  const src = new Uint8Array(n);
  if (d.length >= n * 4) {
    let useAlpha = false;
    for (let i = 3; i < n * 4; i += 4) if (d[i] !== 255) { useAlpha = true; break; }
    if (useAlpha) for (let i = 0; i < n; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    else for (let i = 0; i < n; i++) src[i] = (d[i * 4] | d[i * 4 + 1] | d[i * 4 + 2]) > 0 ? 1 : 0;
  } else if (d.length >= n) {
    for (let i = 0; i < n; i++) src[i] = d[i] > 0 ? 1 : 0;
  } else throw new Error('The eraser mask data is incomplete.');
  if (mw === width && mh === height) return src;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(mh - 1, Math.floor(((y + 0.5) * mh) / height));
    for (let x = 0; x < width; x++) out[y * width + x] = src[sy * mw + Math.min(mw - 1, Math.floor(((x + 0.5) * mw) / width))];
  }
  return out;
}

/**
 * How far the eraser reaches beyond the brushed pixels: the hole is grown by `dilate` px (fully
 * replaced), then blended over 2×`feather` px. Pixels farther than `margin` (Chebyshev) stay unchanged.
 */
export function eraseRadii(width, height) {
  const m = Math.max(width, height);
  const dilateR = Math.max(2, Math.round(m / 500));
  const feather = Math.max(1, Math.round(m / 800));
  return {dilate: dilateR, feather, margin: dilateR + 2 * feather};
}

// Region around the brushed pixels, the grown hole and the feathered blend alpha (all region-local).
function planErase(holes, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1, count = 0;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      if (!holes[row + x]) continue;
      count++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (!count) return null;
  const R = eraseRadii(W, H);
  const m = R.margin + 1;
  const rx = Math.max(0, x0 - m), ry = Math.max(0, y0 - m);
  const rw = Math.min(W, x1 + 1 + m) - rx, rh = Math.min(H, y1 + 1 + m) - ry;
  const local = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) local.set(holes.subarray((ry + y) * W + rx, (ry + y) * W + rx + rw), y * rw);
  const hole = dilate(local, rw, rh, R.dilate); // replaced completely
  const alpha = boxBlurMask(dilate(local, rw, rh, R.dilate + R.feather), rw, rh, R.feather); // 1 on hole, 0 beyond margin
  return {rx, ry, rw, rh, hole, alpha, count, radii: R};
}

// Split the hole into separate work boxes (region-local, inclusive-exclusive) so far-apart strokes
// each get their own full-detail crop. Boxes include the feather margin and never overlap.
function holeGroups(plan, maxGroups = 8) {
  const {rw, rh, hole, radii} = plan;
  const T = 16;
  const tw = Math.ceil(rw / T), th = Math.ceil(rh / T);
  const tb = new Int32Array(tw * th * 4).fill(-1);
  for (let y = 0; y < rh; y++) {
    const ty = (y / T) | 0;
    for (let x = 0; x < rw; x++) {
      if (!hole[y * rw + x]) continue;
      const t = (ty * tw + ((x / T) | 0)) * 4;
      if (tb[t] < 0) { tb[t] = x; tb[t + 1] = y; tb[t + 2] = x + 1; tb[t + 3] = y + 1; }
      else {
        if (x < tb[t]) tb[t] = x;
        if (x + 1 > tb[t + 2]) tb[t + 2] = x + 1;
        if (y + 1 > tb[t + 3]) tb[t + 3] = y + 1;
      }
    }
  }
  const label = new Int32Array(tw * th).fill(-1);
  let boxes = [];
  const stack = [];
  for (let s = 0; s < tw * th; s++) {
    if (tb[s * 4] < 0 || label[s] >= 0) continue;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    label[s] = boxes.length;
    stack.push(s);
    while (stack.length) {
      const t = stack.pop();
      box[0] = Math.min(box[0], tb[t * 4]); box[1] = Math.min(box[1], tb[t * 4 + 1]);
      box[2] = Math.max(box[2], tb[t * 4 + 2]); box[3] = Math.max(box[3], tb[t * 4 + 3]);
      const tx = t % tw, ty = (t / tw) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue;
        const nt = ny * tw + nx;
        if (tb[nt * 4] >= 0 && label[nt] < 0) { label[nt] = boxes.length; stack.push(nt); }
      }
    }
    boxes.push(box);
  }
  const grow = 2 * radii.feather + 1;
  boxes = boxes.map((b) => [Math.max(0, b[0] - grow), Math.max(0, b[1] - grow), Math.min(rw, b[2] + grow), Math.min(rh, b[3] + grow)]);
  let gap = 24;
  for (;;) {
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a[0] - gap < b[2] && b[0] - gap < a[2] && a[1] - gap < b[3] && b[1] - gap < a[3]) {
            boxes[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
            boxes.splice(j, 1);
            merged = true;
            break outer;
          }
        }
      }
    }
    if (boxes.length <= maxGroups) return boxes;
    gap *= 2;
  }
}

/* ---------- pure-JS inpainting (fallback) ---------- */

// Push-pull pyramid fill of the pixels where known < 1, with a few relaxation sweeps per level.
function pyramidFill(rgb, known, w, h) {
  const levels = [{w, h, c: rgb, k: known}];
  for (;;) {
    const L = levels[levels.length - 1];
    let missing = false;
    for (let i = 0; i < L.w * L.h; i++) if (L.k[i] === 0) { missing = true; break; }
    if (!missing || (L.w === 1 && L.h === 1)) break;
    levels.push(pullLevel(L));
  }
  const top = levels[levels.length - 1];
  let F = top.c.slice();
  for (let i = 0; i < top.w * top.h; i++) if (top.k[i] === 0) F[i * 3] = F[i * 3 + 1] = F[i * 3 + 2] = 128;
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l], U = levels[l + 1];
    const up = upsample2(F, U.w, U.h, L.w, L.h);
    const idx = [];
    for (let i = 0; i < L.w * L.h; i++) {
      const k = L.k[i];
      if (k >= 1) { up[i * 3] = L.c[i * 3]; up[i * 3 + 1] = L.c[i * 3 + 1]; up[i * 3 + 2] = L.c[i * 3 + 2]; continue; }
      idx.push(i);
      if (k > 0) for (let c = 0; c < 3; c++) up[i * 3 + c] = k * L.c[i * 3 + c] + (1 - k) * up[i * 3 + c];
    }
    relax(up, L.c, L.k, Int32Array.from(idx), L.w, L.h, l === 0 ? 6 : 3);
    F = up;
  }
  return F;
}

function pullLevel(L) {
  const {w, h, c, k} = L;
  const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2);
  const K = [1, 3, 3, 1];
  // horizontal: premultiplied colour + weight + kernel mass
  const tc = new Float32Array(w2 * h * 3), tk = new Float32Array(w2 * h), tm = new Float32Array(w2);
  for (let X = 0; X < w2; X++) for (let t = 0; t < 4; t++) { const x = 2 * X - 1 + t; if (x >= 0 && x < w) tm[X] += K[t]; }
  for (let y = 0; y < h; y++) {
    for (let X = 0; X < w2; X++) {
      let s0 = 0, s1 = 0, s2 = 0, sk = 0;
      for (let t = 0; t < 4; t++) {
        const x = 2 * X - 1 + t;
        if (x < 0 || x >= w) continue;
        const i = y * w + x;
        const wk = K[t] * k[i];
        if (wk === 0) continue;
        s0 += wk * c[i * 3]; s1 += wk * c[i * 3 + 1]; s2 += wk * c[i * 3 + 2]; sk += wk;
      }
      const o = y * w2 + X;
      tc[o * 3] = s0; tc[o * 3 + 1] = s1; tc[o * 3 + 2] = s2; tk[o] = sk;
    }
  }
  const c2 = new Float32Array(w2 * h2 * 3), k2 = new Float32Array(w2 * h2);
  for (let Y = 0; Y < h2; Y++) {
    let mass = 0;
    for (let t = 0; t < 4; t++) { const y = 2 * Y - 1 + t; if (y >= 0 && y < h) mass += K[t]; }
    for (let X = 0; X < w2; X++) {
      let s0 = 0, s1 = 0, s2 = 0, sk = 0;
      for (let t = 0; t < 4; t++) {
        const y = 2 * Y - 1 + t;
        if (y < 0 || y >= h) continue;
        const i = y * w2 + X;
        if (tk[i] === 0) continue;
        s0 += K[t] * tc[i * 3]; s1 += K[t] * tc[i * 3 + 1]; s2 += K[t] * tc[i * 3 + 2]; sk += K[t] * tk[i];
      }
      const o = Y * w2 + X;
      if (sk > 0) { c2[o * 3] = s0 / sk; c2[o * 3 + 1] = s1 / sk; c2[o * 3 + 2] = s2 / sk; }
      k2[o] = Math.min(1, (2 * sk) / (mass * tm[X]));
    }
  }
  return {w: w2, h: h2, c: c2, k: k2};
}

function upsample2(F, w2, h2, w, h) {
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const fy = clamp(y / 2 - 0.25, 0, h2 - 1);
    const y0 = Math.floor(fy), y1 = Math.min(h2 - 1, y0 + 1), ay = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = clamp(x / 2 - 0.25, 0, w2 - 1);
      const x0 = Math.floor(fx), x1 = Math.min(w2 - 1, x0 + 1), ax = fx - x0;
      const a = (y0 * w2 + x0) * 3, b = (y0 * w2 + x1) * 3, c = (y1 * w2 + x0) * 3, d = (y1 * w2 + x1) * 3;
      const o = (y * w + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const top = F[a + ch] + (F[b + ch] - F[a + ch]) * ax;
        const bot = F[c + ch] + (F[d + ch] - F[c + ch]) * ax;
        out[o + ch] = top + (bot - top) * ay;
      }
    }
  }
  return out;
}

// Gauss-Seidel sweeps over the unknown pixels: value = k·known + (1-k)·mean of 4 neighbours.
function relax(F, C, K, idx, w, h, iters) {
  for (let it = 0; it < iters; it++) {
    const order = it & 1;
    for (let n = 0; n < idx.length; n++) {
      const i = idx[order ? idx.length - 1 - n : n];
      const x = i % w, y = (i - x) / w;
      const l = x > 0 ? i - 1 : i + (x + 1 < w ? 1 : 0);
      const r = x + 1 < w ? i + 1 : l;
      const u = y > 0 ? i - w : i + (y + 1 < h ? w : 0);
      const d = y + 1 < h ? i + w : u;
      const k = K[i];
      for (let c = 0; c < 3; c++) {
        const m = 0.25 * (F[l * 3 + c] + F[r * 3 + c] + F[u * 3 + c] + F[d * 3 + c]);
        F[i * 3 + c] = k > 0 ? k * C[i * 3 + c] + (1 - k) * m : m;
      }
    }
  }
}

// Fill one work box with the pyramid fill plus fine texture copied from a nearby untouched area.
function fallbackFillBox(img, plan, box, fill, texture) {
  const W = img.width, H = img.height, src = img.data;
  const {rx, ry, rw, hole} = plan;
  const bx0 = rx + box[0], by0 = ry + box[1], bw = box[2] - box[0], bh = box[3] - box[1];
  const ctx = Math.max(16, Math.round(Math.max(bw, bh) * 0.35));
  const cx0 = Math.max(0, bx0 - ctx), cy0 = Math.max(0, by0 - ctx);
  const cw = Math.min(W, bx0 + bw + ctx) - cx0, ch = Math.min(H, by0 + bh + ctx) - cy0;
  const isHole = (x, y) => {
    const lx = x - rx, ly = y - ry;
    return lx >= 0 && ly >= 0 && lx < rw && ly < plan.rh && hole[ly * rw + lx] === 1;
  };
  const rgb = new Float32Array(cw * ch * 3), known = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x, s = ((cy0 + y) * W + cx0 + x) * 4;
      if (isHole(cx0 + x, cy0 + y)) continue;
      known[i] = 1;
      rgb[i * 3] = src[s]; rgb[i * 3 + 1] = src[s + 1]; rgb[i * 3 + 2] = src[s + 2];
    }
  }
  const F = pyramidFill(rgb, known, cw, ch);

  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const li = y * rw + x;
      if (plan.alpha[li] === 0) continue;
      const fi = ((ry + y - cy0) * cw + (rx + x - cx0)) * 3;
      fill[li * 3] = F[fi]; fill[li * 3 + 1] = F[fi + 1]; fill[li * 3 + 2] = F[fi + 2];
    }
  }
  if (texture) addTexture(img, plan, box, fill, isHole);
}

// Adds fine detail (pixel minus local mean) from untouched patches of similar colour near the hole,
// in overlapping P×P tiles with sine windows at half-tile steps (squared weights sum to 1, so the
// texture keeps its natural strength and tiles blend without seams).
function addTexture(img, plan, box, fill, isHole) {
  const W = img.width, H = img.height, src = img.data;
  const {rx, ry, rw, hole} = plan;
  const hb = holeBox(plan, box);
  const P = clamp(Math.round(Math.max(W, H) / 40), 12, 48) & ~1;
  const half = P / 2;
  if (W < P || H < P) return;
  const reach = 3 * P;
  const ax0 = Math.max(0, rx + hb[0] - reach), ay0 = Math.max(0, ry + hb[1] - reach);
  const ax1 = Math.min(W - P, rx + hb[2] + reach - P), ay1 = Math.min(H - P, ry + hb[3] + reach - P);
  let cands = [];
  for (let y = ay0; y <= ay1; y += half) {
    for (let x = ax0; x <= ax1; x += half) {
      let ok = true;
      for (let v = 0; v < P && ok; v += 2) for (let u = 0; u < P; u += 2) if (isHole(x + u, y + v)) { ok = false; break; }
      if (ok && (isHole(x + P - 1, y) || isHole(x, y + P - 1) || isHole(x + P - 1, y + P - 1))) ok = false;
      if (ok) cands.push({x, y, d: null, m: null});
    }
  }
  if (!cands.length) return;
  if (cands.length > 300) { const step = cands.length / 300; cands = Array.from({length: 300}, (_, i) => cands[Math.floor(i * step)]); }
  for (const c of cands) {
    let m0 = 0, m1 = 0, m2 = 0;
    for (let v = 0; v < P; v += 2) for (let u = 0; u < P; u += 2) { const p = ((c.y + v) * W + c.x + u) * 4; m0 += src[p]; m1 += src[p + 1]; m2 += src[p + 2]; }
    const n = (P / 2) * (P / 2);
    c.m = [m0 / n, m1 / n, m2 / n];
  }
  const detail = (c) => {
    if (c.d) return c.d;
    const lm = localMean(src, W, c.x, c.y, P, P, 4, isHole);
    c.d = new Float32Array(P * P * 3);
    for (let v = 0; v < P; v++) for (let u = 0; u < P; u++) {
      const p = ((c.y + v) * W + c.x + u) * 4, q = (v * P + u) * 3;
      c.d[q] = src[p] - lm[q]; c.d[q + 1] = src[p + 1] - lm[q + 1]; c.d[q + 2] = src[p + 2] - lm[q + 2];
    }
    return c.d;
  };
  const win = new Float32Array(P);
  for (let u = 0; u < P; u++) win[u] = Math.sin((Math.PI * (u + 0.5)) / P);
  let seed = 0x9e3779b9 ^ (hb[0] * 73856093) ^ (hb[1] * 19349663);
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const SIG2 = 2 * 40 * 40;
  const bw = hb[2] - hb[0], bh = hb[3] - hb[1];
  const acc = new Float32Array(bw * bh * 3);
  for (let ty = hb[1] - half; ty < hb[3]; ty += half) {
    for (let tx = hb[0] - half; tx < hb[2]; tx += half) {
      const fx = clamp(tx + half, box[0], box[2] - 1), fy = clamp(ty + half, box[1], box[3] - 1);
      const fi = (fy * rw + fx) * 3;
      let best = null, bd = Infinity;
      for (let k = 0; k < 6; k++) {
        const c = cands[Math.floor(rnd() * cands.length)];
        const d = (c.m[0] - fill[fi]) ** 2 + (c.m[1] - fill[fi + 1]) ** 2 + (c.m[2] - fill[fi + 2]) ** 2;
        if (d < bd) { bd = d; best = c; }
      }
      const a = Math.exp(-bd / SIG2);
      if (a < 0.02) continue;
      const d = detail(best);
      for (let v = 0; v < P; v++) {
        const y = ty + v;
        if (y < hb[1] || y >= hb[3]) continue;
        for (let u = 0; u < P; u++) {
          const x = tx + u;
          if (x < hb[0] || x >= hb[2] || !hole[y * rw + x]) continue;
          const w = a * win[u] * win[v], q = (v * P + u) * 3, o = ((y - hb[1]) * bw + x - hb[0]) * 3;
          acc[o] += w * d[q]; acc[o + 1] += w * d[q + 1]; acc[o + 2] += w * d[q + 2];
        }
      }
    }
  }
  for (let y = hb[1]; y < hb[3]; y++) {
    for (let x = hb[0]; x < hb[2]; x++) {
      const li = y * rw + x;
      if (!hole[li]) continue;
      const o = ((y - hb[1]) * bw + x - hb[0]) * 3;
      fill[li * 3] += acc[o]; fill[li * 3 + 1] += acc[o + 1]; fill[li * 3 + 2] += acc[o + 2];
    }
  }
}

// Mean colour of the untouched pixels in a (2r+1)² box around each pixel of a rectangle. -1 = none.
function localMean(src, W, x0, y0, w, h, r, isHole) {
  const H = src.length / 4 / W;
  const ex0 = Math.max(0, x0 - r), ey0 = Math.max(0, y0 - r);
  const ew = Math.min(W, x0 + w + r) - ex0, eh = Math.min(H, y0 + h + r) - ey0;
  // horizontal sums over the extended rectangle, then vertical
  const hs = new Float32Array(ew * eh * 4);
  const row = new Float32Array((ew + 1) * 4);
  for (let y = 0; y < eh; y++) {
    const iy = ey0 + y;
    row.fill(0, 0, 4);
    for (let x = 0; x < ew; x++) {
      const p = (iy * W + ex0 + x) * 4;
      const k = isHole(ex0 + x, iy) ? 0 : 1;
      const o = (x + 1) * 4, q = x * 4;
      row[o] = row[q] + k * src[p]; row[o + 1] = row[q + 1] + k * src[p + 1];
      row[o + 2] = row[q + 2] + k * src[p + 2]; row[o + 3] = row[q + 3] + k;
    }
    for (let x = 0; x < ew; x++) {
      const a = Math.max(0, x - r) * 4, b = Math.min(ew, x + r + 1) * 4, o = (y * ew + x) * 4;
      for (let c = 0; c < 4; c++) hs[o + c] = row[b + c] - row[a + c];
    }
  }
  const out = new Float32Array(w * h * 3);
  for (let x = 0; x < w; x++) {
    const ex = x0 - ex0 + x;
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
    const top = (yy) => (yy * ew + ex) * 4;
    // sliding window over rows of the extended rectangle
    const first = y0 - ey0;
    for (let yy = Math.max(0, first - r); yy < Math.min(eh, first + r + 1); yy++) {
      const t = top(yy); s0 += hs[t]; s1 += hs[t + 1]; s2 += hs[t + 2]; s3 += hs[t + 3];
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 3;
      if (s3 > 0.5) { out[o] = s0 / s3; out[o + 1] = s1 / s3; out[o + 2] = s2 / s3; } else out[o] = -1;
      const ey = first + y;
      const add = ey + r + 1, del = ey - r;
      if (add < eh) { const t = top(add); s0 += hs[t]; s1 += hs[t + 1]; s2 += hs[t + 2]; s3 += hs[t + 3]; }
      if (del >= 0) { const t = top(del); s0 -= hs[t]; s1 -= hs[t + 1]; s2 -= hs[t + 2]; s3 -= hs[t + 3]; }
    }
  }
  return out;
}

// Exact bounding box of the hole pixels inside a work box (region-local).
function holeBox(plan, box) {
  const {rw, hole} = plan;
  let x0 = box[2], y0 = box[3], x1 = box[0], y1 = box[1];
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      if (!hole[y * rw + x]) continue;
      if (x < x0) x0 = x;
      if (x + 1 > x1) x1 = x + 1;
      if (y < y0) y0 = y;
      if (y + 1 > y1) y1 = y + 1;
    }
  }
  return x1 > x0 ? [x0, y0, x1, y1] : box;
}

function composite(img, plan, fill) {
  const out = new Uint8ClampedArray(img.data);
  const {rx, ry, rw, rh, alpha} = plan;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const li = y * rw + x;
      const a = alpha[li];
      if (a === 0) continue;
      const o = ((ry + y) * img.width + rx + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(out[o + c] * (1 - a) + fill[li * 3 + c] * a);
    }
  }
  return {data: out, width: img.width, height: img.height};
}

/**
 * Pure-JS inpainting (no model). img: {data,width,height} RGBA; mask: see maskToHoles.
 * Returns {data,width,height}; pixels farther than eraseRadii().margin from the mask are unchanged.
 */
export function fallbackInpaint(img, mask, {texture = true} = {}) {
  checkImage(img);
  const plan = planErase(maskToHoles(mask, img.width, img.height), img.width, img.height);
  if (!plan) return {data: new Uint8ClampedArray(img.data), width: img.width, height: img.height};
  const fill = new Float32Array(plan.rw * plan.rh * 3);
  for (const box of holeGroups(plan, 64)) fallbackFillBox(img, plan, box, fill, texture);
  return composite(img, plan, fill);
}

/* ---------- magic eraser (model) ---------- */

async function modelFillBox(session, img, plan, box, fill) {
  const S = MODELS.erase.input;
  const W = img.width, H = img.height;
  const {rx, ry, rw, rh, hole} = plan;
  const gx = rx + box[0], gy = ry + box[1], gw = box[2] - box[0], gh = box[3] - box[1];
  const m = Math.max(gw, gh);
  const side = Math.max(S, m + 2 * Math.max(128, Math.round(m * 0.25)));
  const cw = Math.min(W, side), ch = Math.min(H, side);
  const cx = clamp(Math.round(gx + gw / 2 - cw / 2), 0, W - cw);
  const cy = clamp(Math.round(gy + gh / 2 - ch / 2), 0, H - ch);

  const rgb = resample(img.data, 4, 3, W, cx, cy, cw, ch, S, S);
  const holeCrop = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    const ly = cy + y - ry;
    if (ly < 0 || ly >= rh) continue;
    for (let x = 0; x < cw; x++) {
      const lx = cx + x - rx;
      if (lx >= 0 && lx < rw && hole[ly * rw + lx]) holeCrop[y * cw + x] = 1;
    }
  }
  const hs = resample(holeCrop, 1, 1, cw, 0, 0, cw, ch, S, S);
  const h01 = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) h01[i] = hs[i] > 1e-3 ? 1 : 0;
  // the pipeline shrinks the hole by ~2 px when it blends; grow it so the fill covers ours fully
  const h512 = dilate(h01, S, S, 2);
  const imgT = new Uint8Array(3 * S * S), maskT = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) {
    for (let c = 0; c < 3; c++) imgT[c * S * S + i] = Math.min(255, Math.round(rgb[i * 3 + c]));
    maskT[i] = h512[i] ? 0 : 255; // MI-GAN pipeline: 255 = keep, 0 = fill
  }
  const res = await runExclusive('erase', () => session.run({
    [session.inputNames[0]]: new ort.Tensor('uint8', imgT, [1, 3, S, S]),
    [session.inputNames[1]]: new ort.Tensor('uint8', maskT, [1, 1, S, S]),
  }));
  const o = res[session.outputNames[0]].data;
  const oi = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) { oi[i * 3] = o[i]; oi[i * 3 + 1] = o[S * S + i]; oi[i * 3 + 2] = o[2 * S * S + i]; }
  const back = resample(oi, 3, 3, S, 0, 0, S, S, cw, ch);
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const li = y * rw + x;
      if (plan.alpha[li] === 0) continue;
      const bi = ((ry + y - cy) * cw + (rx + x - cx)) * 3;
      fill[li * 3] = back[bi]; fill[li * 3 + 1] = back[bi + 1]; fill[li * 3 + 2] = back[bi + 2];
    }
  }
}

/**
 * Magic eraser on pixel data. Returns {data, width, height, method: 'model' | 'fallback' | 'none'}.
 * Options: model (default true; false = pure JS only), onProgress.
 */
export async function magicEraseData(img, mask, {onProgress, model = true} = {}) {
  checkImage(img);
  const emit = emitter(onProgress);
  const plan = planErase(maskToHoles(mask, img.width, img.height), img.width, img.height);
  if (!plan) {
    emit({stage: 'done', loaded: 1, total: 1, message: 'Nothing to erase. Brush over the part you want to remove.'});
    return {data: new Uint8ClampedArray(img.data), width: img.width, height: img.height, method: 'none'};
  }
  let session = null;
  let reason = model ? '' : 'model turned off';
  if (model) {
    try {
      session = await loadSession('erase', emit);
    } catch (e) {
      reason = (e && e.message) || String(e);
      emit({stage: 'model', loaded: 0, total: 1, message: 'The eraser model could not load, so the quick eraser is used instead.'});
    }
  }
  const fill = new Float32Array(plan.rw * plan.rh * 3);
  let boxes = [];
  if (session) {
    boxes = holeGroups(plan, 8);
    try {
      for (let i = 0; i < boxes.length; i++) {
        const part = boxes.length > 1 ? ` (part ${i + 1} of ${boxes.length})` : '';
        emit({stage: 'run', loaded: i, total: boxes.length, message: `Filling in the erased area${part}…`});
        await tick();
        await modelFillBox(session, img, plan, boxes[i], fill);
      }
    } catch (e) { // e.g. out of memory on a small phone: finish with the quick eraser
      reason = (e && e.message) || String(e);
      session = null;
    }
  }
  if (!session) {
    boxes = holeGroups(plan, 64);
    emit({stage: 'run', loaded: 0, total: 1, message: 'Filling in the erased area with the quick eraser…'});
    await tick();
    for (const box of boxes) fallbackFillBox(img, plan, box, fill, true);
  }
  const out = composite(img, plan, fill);
  const method = session ? 'model' : 'fallback';
  emit({stage: 'done', loaded: 1, total: 1, message: 'Done', method});
  return session ? {...out, method} : {...out, method, reason};
}

/* ---------- background removal ---------- */

/**
 * Background removal on pixel data. Returns {data, width, height, mask} at the input size: the subject
 * keeps its pixels, the background gets alpha 0 (soft edges). mask = Uint8Array alpha (0..255).
 */
export async function removeBackgroundData(img, {onProgress} = {}) {
  checkImage(img);
  const emit = emitter(onProgress);
  const session = await loadSession('bg', emit);
  emit({stage: 'run', loaded: 0, total: 1, message: 'Removing the background…'});
  await tick();
  const W = img.width, H = img.height, S = MODELS.bg.input;
  const px = resample(img.data, 4, 4, W, 0, 0, W, H, S, S);
  // flatten transparency onto white, then normalise like rembg (÷ max, ImageNet mean/std)
  let max = 1;
  for (let i = 0; i < S * S; i++) {
    const a = px[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) {
      const v = px[i * 4 + c] * a + 255 * (1 - a);
      px[i * 4 + c] = v;
      if (v > max) max = v;
    }
  }
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const input = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) input[c * S * S + i] = (px[i * 4 + c] / max - mean[c]) / std[c];
  const res = await runExclusive('bg', () => session.run({[session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, S, S])}));
  const pred = res[session.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < S * S; i++) { if (pred[i] < lo) lo = pred[i]; if (pred[i] > hi) hi = pred[i]; }
  const span = hi - lo > 1e-6 ? hi - lo : 1;
  const m320 = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) m320[i] = (pred[i] - lo) / span;
  const mask = alphaFromSaliency(resample(m320, 1, 1, S, 0, 0, S, S, W, H), W, H);
  const out = new Uint8ClampedArray(img.data);
  for (let i = 0; i < W * H; i++) out[i * 4 + 3] = Math.round((out[i * 4 + 3] * mask[i]) / 255);
  emit({stage: 'done', loaded: 1, total: 1, message: 'Done'});
  return {data: out, width: W, height: H, mask};
}

// Upsampled saliency (0..1) → alpha bytes: gentle levels to drop faint haze, then a slight feather.
function alphaFromSaliency(m, W, H) {
  const LO = 0.06, HI = 0.94;
  const a = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = Math.round(clamp((m[i] - LO) / (HI - LO), 0, 1) * 255);
  const r = Math.max(1, Math.round(Math.max(W, H) / 1200));
  return blurBytes(a, W, H, r);
}

function blurBytes(a, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let s = 0;
    for (let x = -r; x <= r; x++) s += a[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / (2 * r + 1);
      s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(s / (2 * r + 1));
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/* ---------- DOM wrappers ---------- */

function makeCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  throw new Error('This tool needs a browser.');
}

const isPixelData = (s) => !!s && !!s.data && typeof s.width === 'number' && typeof s.height === 'number' && typeof s.getContext !== 'function';

// Image / canvas / ImageBitmap / ImageData-like → ImageData-like (optionally drawn at tw×th).
async function readPixels(src, what, tw, th) {
  if (!src) throw new Error(`No ${what} was given.`);
  if (isPixelData(src)) return src;
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement && !(src.complete && src.naturalWidth)) {
    try { await src.decode(); } catch { throw new Error(`The ${what} could not be loaded.`); }
  }
  const w = tw || src.naturalWidth || src.videoWidth || src.displayWidth || src.width;
  const h = th || src.naturalHeight || src.videoHeight || src.displayHeight || src.height;
  if (!(w > 0) || !(h > 0)) throw new Error(`The ${what} is empty or has not finished loading.`);
  if (w * h > MAX_PIXELS) throw new Error('This image is too big (over 50 megapixels). Please use a smaller image.');
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(src, 0, 0, w, h);
  try {
    return ctx.getImageData(0, 0, w, h);
  } catch {
    throw new Error('The browser blocked reading this image because it comes from another website. Please upload the image file and try again.');
  }
}

function toCanvas(out) {
  const cv = makeCanvas(out.width, out.height);
  const data = out.data instanceof Uint8ClampedArray ? out.data : new Uint8ClampedArray(out.data);
  cv.getContext('2d').putImageData(new ImageData(data, out.width, out.height), 0, 0);
  return cv;
}

/**
 * Remove the background of an image. source: HTMLImageElement | HTMLCanvasElement | ImageBitmap |
 * ImageData-like. Returns a canvas at the original size with a transparent background.
 */
export async function removeBackground(source, {onProgress} = {}) {
  const img = await readPixels(source, 'image');
  return toCanvas(await removeBackgroundData(img, {onProgress}));
}

/**
 * Fill the brushed area of an image. mask: canvas / image / ImageData-like; painted pixels (alpha > 0,
 * or colour > 0 on an opaque mask) are erased. A mask canvas of another size is scaled to the image.
 * Returns a canvas; pixels outside the slightly grown mask are unchanged.
 */
export async function magicErase(source, mask, {onProgress} = {}) {
  const img = await readPixels(source, 'image');
  const m = await readPixels(mask, 'eraser mask', isPixelData(mask) ? 0 : img.width, isPixelData(mask) ? 0 : img.height);
  return toCanvas(await magicEraseData(img, m, {onProgress}));
}
