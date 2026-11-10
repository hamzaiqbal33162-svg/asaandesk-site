// Small animated GIF encoder (our own code): median-cut palette shared by all frames, LZW compression,
// only the changed rectangle of each frame is stored, loops forever. Pure module.

/** Median-cut palette (<= maxColors) from RGBA pixel arrays (sampled). Returns [[r, g, b], ...]. */
export function buildPalette(frames, maxColors = 256, maxSamples = 60000) {
  const total = frames.reduce((s, f) => s + f.length / 4, 0);
  const step = Math.max(1, Math.floor(total / maxSamples));
  const px = [];
  let i = 0;
  for (const f of frames) for (let p = 0; p < f.length; p += 4, i++) if (i % step === 0) px.push([f[p], f[p + 1], f[p + 2]]);
  // Exact palette when there are few colours (flat designs).
  const uniq = new Map();
  for (const c of px) { uniq.set((c[0] << 16) | (c[1] << 8) | c[2], c); if (uniq.size > maxColors) break; }
  if (uniq.size <= maxColors) return [...uniq.values()];
  let boxes = [px];
  while (boxes.length < maxColors) {
    // Split the box with the widest channel range (ties: the bigger box).
    let bi = -1, bestRange = -1, ch = 0;
    boxes.forEach((b, k) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        const r = (hi - lo) * Math.log2(b.length + 1);
        if (r > bestRange) { bestRange = r; bi = k; ch = c; }
      }
    });
    if (bi < 0 || bestRange <= 0) break;
    const b = boxes[bi].sort((a, c) => a[ch] - c[ch]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.filter((b) => b.length).map((b) => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return s.map((v) => Math.round(v / b.length)); });
}

/** Maps RGBA pixels to palette indexes (5-bit-per-channel cache of nearest colours). */
export function makeMapper(palette) {
  const cache = new Int16Array(32768).fill(-1);
  return (data) => {
    const out = new Uint8Array(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let idx = cache[key];
      if (idx < 0) {
        let best = 1e9;
        for (let k = 0; k < palette.length; k++) {
          const p = palette[k], d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 3;
          if (d < best) { best = d; idx = k; }
        }
        cache[key] = idx;
      }
      out[j] = idx;
    }
    return out;
  };
}

class Bytes {
  constructor() { this.buf = new Uint8Array(1 << 16); this.len = 0; }
  byte(b) { if (this.len >= this.buf.length) { const n = new Uint8Array(this.buf.length * 2); n.set(this.buf); this.buf = n; } this.buf[this.len++] = b; }
  bytes(a) { for (const b of a) this.byte(b); }
  u16(v) { this.byte(v & 255); this.byte((v >> 8) & 255); }
  str(s) { for (const c of s) this.byte(c.charCodeAt(0)); }
  out() { return this.buf.slice(0, this.len); }
}

/** GIF LZW compression of indexes; returns the data sub-blocks (without the min code size byte). */
export function lzw(indexes, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  const out = [];
  let cur = 0, bits = 0, size = minCode + 1, next = eoi + 1;
  const put = (code) => { cur |= code << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; } };
  let dict = new Map();
  put(clear);
  let prefix = indexes[0];
  for (let i = 1; i < indexes.length; i++) {
    const k = indexes[i], key = prefix * 4096 + k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    put(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else { put(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; }
    prefix = k;
  }
  put(prefix);
  put(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}

/**
 * Encodes frames [{ data: RGBA Uint8ClampedArray, delay: ms }] of size w × h into an animated GIF (Uint8Array).
 */
export function encodeGif(frames, w, h, { loop = 0, palette = null } = {}) {
  if (!frames.length) throw new Error("No frames to save.");
  const pal = palette || buildPalette(frames.map((f) => f.data));
  let bitsPer = 1;
  while (1 << bitsPer < pal.length) bitsPer++;
  const tableSize = 1 << bitsPer;
  const map = makeMapper(pal);
  const o = new Bytes();
  o.str("GIF89a"); o.u16(w); o.u16(h);
  o.byte(0x80 | ((bitsPer - 1) << 4) | (bitsPer - 1)); o.byte(0); o.byte(0);
  for (let i = 0; i < tableSize; i++) { const c = pal[i] || [0, 0, 0]; o.byte(c[0]); o.byte(c[1]); o.byte(c[2]); }
  // Loop forever (NETSCAPE2.0).
  o.byte(0x21); o.byte(0xff); o.byte(11); o.str("NETSCAPE2.0"); o.byte(3); o.byte(1); o.u16(loop); o.byte(0);
  let prev = null;
  for (const f of frames) {
    const idx = map(f.data);
    // Changed rectangle versus the previous frame.
    let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1;
    if (prev) {
      x0 = w; y0 = h; x1 = -1; y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0, p = y * w; x < w; x++, p++) if (idx[p] !== prev[p]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
    }
    const rw = x1 - x0 + 1, rh = y1 - y0 + 1;
    const sub = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++) sub.set(idx.subarray((y0 + y) * w + x0, (y0 + y) * w + x0 + rw), y * rw);
    const delay = Math.max(2, Math.round((f.delay || 100) / 10));
    o.byte(0x21); o.byte(0xf9); o.byte(4); o.byte(1 << 2); o.u16(delay); o.byte(0); o.byte(0); // disposal 1: keep
    o.byte(0x2c); o.u16(x0); o.u16(y0); o.u16(rw); o.u16(rh); o.byte(0);
    const minCode = Math.max(2, bitsPer);
    o.byte(minCode);
    const data = lzw(sub, minCode);
    for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); o.byte(chunk.length); o.bytes(chunk); }
    o.byte(0);
    prev = idx;
  }
  o.byte(0x3b);
  return o.out();
}
