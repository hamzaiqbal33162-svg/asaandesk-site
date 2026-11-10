// MediaRecorder writes WebM files without a duration, so players show "0:00" / Infinity until the end.
// addWebmDuration() inserts Segment > Info > Duration (EBML). Pure module (unit-tested).

const ID = { EBML: 0x1a45dfa3, Segment: 0x18538067, Info: 0x1549a966, Duration: 0x4489, TimecodeScale: 0x2ad7b1 };

function readVint(b, pos, keepMarker = false) {
  const first = b[pos];
  if (first === undefined) return null;
  let len = 1, mask = 0x80;
  while (len <= 8 && !(first & mask)) { len++; mask >>= 1; }
  if (len > 8) return null;
  let value = keepMarker ? first : first & (mask - 1);
  let allOnes = (first & (mask - 1)) === mask - 1;
  for (let i = 1; i < len; i++) { value = value * 256 + b[pos + i]; if (b[pos + i] !== 255) allOnes = false; }
  return { value, len, unknown: !keepMarker && allOnes };
}
const readId = (b, pos) => readVint(b, pos, true);
function encSize(n, len = 8) { const out = new Uint8Array(len); let v = n; for (let i = len - 1; i > 0; i--) { out[i] = v % 256; v = Math.floor(v / 256); } out[0] = (1 << (8 - len)) | v; return out; }
const encId = (id) => { const out = []; let v = id; while (v > 0) { out.unshift(v & 255); v = Math.floor(v / 256); } return Uint8Array.from(out); };
function readUint(b, pos, len) { let v = 0; for (let i = 0; i < len; i++) v = v * 256 + b[pos + i]; return v; }

/** Lists the direct children [{ id, start, dataStart, size, end }] of an element's data. */
export function ebmlChildren(b, start, end) {
  const out = [];
  let pos = start;
  while (pos < end) {
    const id = readId(b, pos); if (!id) break;
    const sz = readVint(b, pos + id.len); if (!sz) break;
    const dataStart = pos + id.len + sz.len;
    const size = sz.unknown ? end - dataStart : sz.value;
    out.push({ id: id.value, start: pos, dataStart, size, end: dataStart + size });
    pos = dataStart + size;
  }
  return out;
}

/** Reads the Duration (ms) stored in a WebM file, or null. */
export function webmDuration(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const seg = ebmlChildren(b, 0, b.length).find((e) => e.id === ID.Segment);
  if (!seg) return null;
  const info = ebmlChildren(b, seg.dataStart, Math.min(seg.end, b.length)).find((e) => e.id === ID.Info);
  if (!info) return null;
  const d = ebmlChildren(b, info.dataStart, info.end).find((e) => e.id === ID.Duration);
  if (!d) return null;
  const v = new DataView(b.buffer, b.byteOffset + d.dataStart, d.size);
  const scale = ebmlChildren(b, info.dataStart, info.end).find((e) => e.id === ID.TimecodeScale);
  const ts = scale ? readUint(b, scale.dataStart, scale.size) : 1e6;
  return (d.size === 4 ? v.getFloat32(0) : v.getFloat64(0)) * ts / 1e6;
}

/** Returns a copy of the WebM bytes with Duration = ms (unchanged when it cannot be patched). */
export function addWebmDuration(bytes, ms) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const top = ebmlChildren(b, 0, b.length);
  const seg = top.find((e) => e.id === ID.Segment);
  if (!seg) return b;
  const kids = ebmlChildren(b, seg.dataStart, Math.min(seg.end, b.length));
  const info = kids.find((e) => e.id === ID.Info);
  if (!info) return b;
  const infoKids = ebmlChildren(b, info.dataStart, info.end);
  const scaleEl = infoKids.find((e) => e.id === ID.TimecodeScale);
  const ts = scaleEl ? readUint(b, scaleEl.dataStart, scaleEl.size) : 1e6;
  const value = (ms * 1e6) / ts;
  const dur = new Uint8Array(11);
  dur.set(encId(ID.Duration), 0); dur[2] = 0x88;
  new DataView(dur.buffer).setFloat64(3, value);
  // New Info = old children without any Duration + our Duration.
  const parts = infoKids.filter((e) => e.id !== ID.Duration).map((e) => b.subarray(e.start, e.end));
  const bodyLen = parts.reduce((s, p) => s + p.length, 0) + dur.length;
  const head = encId(ID.Info), size = encSize(bodyLen, 8);
  const newInfo = new Uint8Array(head.length + size.length + bodyLen);
  let o = 0;
  newInfo.set(head, o); o += head.length; newInfo.set(size, o); o += size.length;
  for (const p of parts) { newInfo.set(p, o); o += p.length; }
  newInfo.set(dur, o);
  const delta = newInfo.length - (info.end - info.start);
  // Fix the Segment size when it is known (MediaRecorder writes "unknown").
  const segSize = readVint(b, seg.start + readId(b, seg.start).len);
  const out = new Uint8Array(b.length + delta);
  out.set(b.subarray(0, info.start), 0);
  out.set(newInfo, info.start);
  out.set(b.subarray(info.end), info.start + newInfo.length);
  if (!segSize.unknown) {
    const idLen = readId(b, seg.start).len;
    const enc = encSize(segSize.value + delta, segSize.len);
    out.set(enc, seg.start + idLen);
  }
  return out;
}
