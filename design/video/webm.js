// WebM helpers (pure, no DOM). Chrome's MediaRecorder writes WebM files without a duration, so players show
// no length and seeking is poor. fixWebmDuration() writes the Duration into the Segment Info; readWebmInfo()
// reads back duration, codecs and frame size (used by the tests).
const ID = {
  EBML: 0x1a45dfa3, DocType: 0x4282, Segment: 0x18538067, SeekHead: 0x114d9b74, Seek: 0x4dbb, SeekPosition: 0x53ac,
  Info: 0x1549a966, TimecodeScale: 0x2ad7b1, Duration: 0x4489, Tracks: 0x1654ae6b, TrackEntry: 0xae, TrackType: 0x83,
  CodecID: 0x86, Video: 0xe0, PixelWidth: 0xb0, PixelHeight: 0xba, Audio: 0xe1, SamplingFrequency: 0xb5, Channels: 0x9f,
  Cluster: 0x1f43b675, Cues: 0x1c53bb6b, TrackNumber: 0xd7, Timecode: 0xe7, SimpleBlock: 0xa3, BlockGroup: 0xa0, Block: 0xa1,
};

function vlen(first, max) { let len = 1, mask = 0x80; while (len <= max && !(first & mask)) { mask >>= 1; len++; } return len > max ? 0 : len; }
/** One element header at p: { id, start, idLen, sizeLen, size (-1 = unknown), dataStart, end }. */
export function readElement(b, p) {
  if (p >= b.length) return null;
  const il = vlen(b[p], 4); if (!il || p + il >= b.length) return null;
  let id = 0; for (let i = 0; i < il; i++) id = id * 256 + b[p + i];
  const q = p + il, sl = vlen(b[q], 8); if (!sl || q + sl > b.length) return null;
  const mask = 0xff >> sl; let size = b[q] & mask, ones = size === mask;
  for (let i = 1; i < sl; i++) { size = size * 256 + b[q + i]; if (b[q + i] !== 0xff) ones = false; }
  if (ones) size = -1;
  const dataStart = q + sl;
  return { id, start: p, idLen: il, sizeLen: sl, size, dataStart, end: size < 0 ? b.length : Math.min(b.length, dataStart + size) };
}
function* children(b, start, end) {
  for (let p = start; p < end;) { const e = readElement(b, p); if (!e) return; yield e; if (e.size < 0) return; p = e.end; }
}
const uint = (b, p, n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + b[p + i]; return v; };
const float = (b, p, n) => { const dv = new DataView(b.buffer, b.byteOffset + p, n); return n === 8 ? dv.getFloat64(0) : n === 4 ? dv.getFloat32(0) : NaN; };
const str = (b, p, n) => String.fromCharCode(...b.subarray(p, p + n)).replace(/\0+$/, "");
/** Size as an EBML vint of `len` bytes (or the shortest length when len is 0). Null when it doesn't fit. */
export function encodeSize(n, len = 0) {
  if (!len) { len = 1; while (n >= 2 ** (7 * len) - 1) len++; }
  if (len > 8 || n >= 2 ** (7 * len) - 1) return null;
  const out = new Uint8Array(len); let v = n;
  for (let i = len - 1; i >= 0; i--) { out[i] = v % 256; v = Math.floor(v / 256); }
  out[0] |= 1 << (8 - len);
  return out;
}
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((s, x) => s + x.length, 0)); let o = 0; for (const x of parts) { out.set(x, o); o += x.length; } return out; };

function segmentParts(b) {
  const h = readElement(b, 0); if (!h || h.id !== ID.EBML) return null;
  const s = readElement(b, h.end); if (!s || s.id !== ID.Segment) return null;
  const parts = { header: h, segment: s, info: null, seekHead: null, tracks: null, cues: false };
  for (const e of children(b, s.dataStart, s.end)) {
    if (e.id === ID.Info) parts.info = e; else if (e.id === ID.SeekHead) parts.seekHead = e;
    else if (e.id === ID.Tracks) parts.tracks = e; else if (e.id === ID.Cues) parts.cues = true;
    if (e.id === ID.Cluster || e.size < 0) break;
  }
  return parts;
}

/** Returns a copy of the WebM bytes with Segment Info Duration = durationMs (or the input when it can't). */
export function fixWebmDuration(input, durationMs) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!(durationMs > 0)) return b;
  const parts = segmentParts(b);
  if (!parts?.info) return b;
  const { info, segment: s, seekHead } = parts;
  let scale = 1e6, dur = null;
  for (const c of children(b, info.dataStart, info.end)) {
    if (c.id === ID.TimecodeScale) scale = uint(b, c.dataStart, c.size) || 1e6;
    if (c.id === ID.Duration) dur = c;
  }
  const value = (durationMs * 1e6) / scale;
  if (dur) {
    if (dur.size !== 8 && dur.size !== 4) return b;
    const out = b.slice(), dv = new DataView(out.buffer, dur.dataStart, dur.size);
    if (dur.size === 8) dv.setFloat64(0, value); else dv.setFloat32(0, value);
    return out;
  }
  if (parts.cues) return b; // Cue offsets would move; MediaRecorder never writes Cues before clusters.
  const durEl = new Uint8Array(11); durEl.set([0x44, 0x89, 0x88]); new DataView(durEl.buffer).setFloat64(3, value);
  const content = concat(b.subarray(info.dataStart, info.end), durEl);
  const size = encodeSize(content.length, info.sizeLen) || encodeSize(content.length);
  if (!size) return b;
  const newInfo = concat(b.subarray(info.start, info.start + info.idLen), size, content);
  const delta = newInfo.length - (info.end - info.start);
  const out = concat(b.subarray(0, info.start), newInfo, b.subarray(info.end));
  if (s.size >= 0) { const ns = encodeSize(s.size + delta, s.sizeLen); if (!ns) return b; out.set(ns, s.start + s.idLen); }
  if (seekHead) {
    // SeekPosition is relative to the Segment data; everything after the old Info moved by delta.
    const at = seekHead.start > info.start ? seekHead.start + delta : seekHead.start;
    const sh = readElement(out, at);
    const infoRel = info.start - s.dataStart;
    for (const seek of children(out, sh.dataStart, sh.end)) {
      if (seek.id !== ID.Seek) continue;
      for (const c of children(out, seek.dataStart, seek.end)) {
        if (c.id !== ID.SeekPosition) continue;
        const v = uint(out, c.dataStart, c.size);
        if (v <= infoRel) continue;
        const nv = v + delta;
        if (nv >= 2 ** (8 * c.size)) return b;
        for (let i = c.size - 1, x = nv; i >= 0; i--) { out[c.dataStart + i] = x % 256; x = Math.floor(x / 256); }
      }
    }
  }
  return out;
}

/** { docType, durationMs, timecodeScale, tracks: [{ type, codec, width, height, rate, channels }] } or null. */
export function readWebmInfo(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const parts = segmentParts(b);
  if (!parts) return null;
  const out = { docType: "", durationMs: null, timecodeScale: 1e6, tracks: [] };
  for (const c of children(b, parts.header.dataStart, parts.header.end)) if (c.id === ID.DocType) out.docType = str(b, c.dataStart, c.size);
  if (parts.info) {
    let raw = null;
    for (const c of children(b, parts.info.dataStart, parts.info.end)) {
      if (c.id === ID.TimecodeScale) out.timecodeScale = uint(b, c.dataStart, c.size);
      if (c.id === ID.Duration) raw = float(b, c.dataStart, c.size);
    }
    if (raw != null) out.durationMs = (raw * out.timecodeScale) / 1e6;
  }
  if (parts.tracks) for (const t of children(b, parts.tracks.dataStart, parts.tracks.end)) {
    if (t.id !== ID.TrackEntry) continue;
    const tr = { type: 0, codec: "", width: 0, height: 0, rate: 0, channels: 0 };
    for (const c of children(b, t.dataStart, t.end)) {
      if (c.id === ID.TrackType) tr.type = uint(b, c.dataStart, c.size);
      if (c.id === ID.CodecID) tr.codec = str(b, c.dataStart, c.size);
      if (c.id === ID.Video) for (const v of children(b, c.dataStart, c.end)) { if (v.id === ID.PixelWidth) tr.width = uint(b, v.dataStart, v.size); if (v.id === ID.PixelHeight) tr.height = uint(b, v.dataStart, v.size); }
      if (c.id === ID.Audio) for (const a of children(b, c.dataStart, c.end)) { if (a.id === ID.SamplingFrequency) tr.rate = float(b, a.dataStart, a.size); if (a.id === ID.Channels) tr.channels = uint(b, a.dataStart, a.size); }
    }
    out.tracks.push(tr);
  }
  return out;
}

/**
 * Where the recorded media really ends: { video, audio } = time in seconds of the last video / audio block, from the
 * Cluster Timecode + the block's signed 16-bit offset, in TimecodeScale units. Works on a live recording that is still
 * growing (Segment and Clusters of unknown size; an element cut off at the end of the data is ignored), so it can read
 * the chunks a MediaRecorder has handed over so far. null when the data is not WebM. Not wired into stopping yet.
 */
export function webmEnd(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const el = (p) => {
    if (p >= b.length) return null;
    const il = vlen(b[p], 4); if (!il || p + il >= b.length) return null;
    let id = 0; for (let i = 0; i < il; i++) id = id * 256 + b[p + i];
    const q = p + il, sl = vlen(b[q], 8); if (!sl || q + sl > b.length) return null;
    const mask = 0xff >> sl; let size = b[q] & mask, ones = size === mask;
    for (let i = 1; i < sl; i++) { size = size * 256 + b[q + i]; if (b[q + i] !== 0xff) ones = false; }
    return { id, data: q + sl, size: ones ? -1 : size, end: ones ? b.length : q + sl + size };
  };
  const kids = (e, fn) => { for (let p = e.data; p < Math.min(e.end, b.length);) { const c = el(p); if (!c || c.size < 0) break; fn(c); p = c.end; } };
  const head = el(0); if (!head || head.id !== ID.EBML) return null;
  const seg = el(head.end); if (!seg || seg.id !== ID.Segment) return null;
  const type = {}, last = { video: null, audio: null };
  let scale = 1e6, tc = 0;
  const block = (p, end) => {
    const tl = vlen(b[p], 8); if (!tl || p + tl + 2 > end) return;
    const track = uint(b, p, tl) - (0x80 >> (tl - 1)) * 256 ** (tl - 1); // track number vint without its length marker
    const rel = ((b[p + tl] << 8) | b[p + tl + 1]) << 16 >> 16; // signed 16-bit offset from the Cluster Timecode
    const t = ((tc + rel) * scale) / 1e9, k = type[track] === 1 ? "video" : type[track] === 2 ? "audio" : null;
    if (k && (last[k] == null || t > last[k])) last[k] = t;
  };
  for (let p = seg.data; p < b.length;) {
    const e = el(p); if (!e) break;
    if (e.id === ID.Cluster) { p = e.data; continue; } // walk into Clusters (their size may be unknown)
    if (e.size < 0 || e.end > b.length) break; // this element is still being written
    if (e.id === ID.Info) kids(e, (c) => { if (c.id === ID.TimecodeScale) scale = uint(b, c.data, c.size); });
    else if (e.id === ID.Tracks) kids(e, (t) => { if (t.id !== ID.TrackEntry) return; let n = 0, ty = 0; kids(t, (c) => { if (c.id === ID.TrackNumber) n = uint(b, c.data, c.size); if (c.id === ID.TrackType) ty = uint(b, c.data, c.size); }); type[n] = ty; });
    else if (e.id === ID.Timecode) tc = uint(b, e.data, e.size);
    else if (e.id === ID.SimpleBlock) block(e.data, e.end);
    else if (e.id === ID.BlockGroup) kids(e, (c) => { if (c.id === ID.Block) block(c.data, c.end); });
    p = e.end;
  }
  return last;
}

/** Test helper: builds a tiny WebM-like EBML file (header, Segment of unknown size, Info, Tracks, one Cluster). */
export function buildTestWebm({ seekHead = false, segmentSize = "unknown", infoDuration = null } = {}) {
  const el = (id, data) => { const idb = []; for (let v = id; v > 0; v = Math.floor(v / 256)) idb.unshift(v % 256); return concat(new Uint8Array(idb), encodeSize(data.length), data); };
  const u = (n, len) => { const a = new Uint8Array(len); for (let i = len - 1, x = n; i >= 0; i--) { a[i] = x % 256; x = Math.floor(x / 256); } return a; };
  const s = (t) => new TextEncoder().encode(t);
  const f8 = (v) => { const a = new Uint8Array(8); new DataView(a.buffer).setFloat64(0, v); return a; };
  const header = el(ID.EBML, concat(el(0x4286, u(1, 1)), el(ID.DocType, s("webm"))));
  const info = el(ID.Info, concat(el(ID.TimecodeScale, u(1e6, 3)), el(0x4d80, s("Chrome")), el(0x5741, s("Chrome")), ...(infoDuration != null ? [el(ID.Duration, f8(infoDuration))] : [])));
  const tracks = el(ID.Tracks, concat(
    el(ID.TrackEntry, concat(el(0xd7, u(1, 1)), el(ID.TrackType, u(1, 1)), el(ID.CodecID, s("V_VP8")), el(ID.Video, concat(el(ID.PixelWidth, u(1280, 2)), el(ID.PixelHeight, u(720, 2)))))),
    el(ID.TrackEntry, concat(el(0xd7, u(2, 1)), el(ID.TrackType, u(2, 1)), el(ID.CodecID, s("A_OPUS")), el(ID.Audio, concat(el(ID.SamplingFrequency, f8(48000)), el(ID.Channels, u(2, 1))))))));
  const cluster = concat(new Uint8Array([0x1f, 0x43, 0xb6, 0x75, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), el(0xe7, u(0, 1)), el(0xa3, new Uint8Array([0x81, 0, 0, 0x80, 1, 2, 3, 4])));
  let body;
  if (seekHead) {
    // SeekHead first, pointing at Info (after it) and Tracks; positions relative to the Segment data start.
    const mk = (pos1, pos2) => el(ID.SeekHead, concat(
      el(ID.Seek, concat(el(0x53ab, u(ID.Info, 4)), el(ID.SeekPosition, u(pos1, 4)))),
      el(ID.Seek, concat(el(0x53ab, u(ID.Tracks, 4)), el(ID.SeekPosition, u(pos2, 4))))));
    const len = mk(0, 0).length;
    body = concat(mk(len, len + info.length), info, tracks, cluster);
  } else body = concat(info, tracks, cluster);
  const segHeader = segmentSize === "unknown"
    ? new Uint8Array([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
    : concat(new Uint8Array([0x18, 0x53, 0x80, 0x67]), encodeSize(body.length, 8));
  return concat(header, segHeader, body);
}
export const WEBM_IDS = ID;
