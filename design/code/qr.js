// A small QR code encoder (ISO/IEC 18004): byte mode (UTF-8), error correction L/M/Q/H, versions 1-40,
// Reed-Solomon over GF(256), all 8 masks with the standard penalty rules, format and version info.
// No DOM, no dependencies: qrMatrix() returns rows of booleans (true = dark), qrSvg() an SVG string.

export const ECC = { L: 0, M: 1, Q: 2, H: 3 };
const FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };
// Error-correction codewords per block and number of blocks, by level then version (index 0 unused).
export const ECC_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
export const BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** Modules available for data + error correction (everything that is not a function pattern). */
export function rawDataModules(ver) {
  let n = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const a = Math.floor(ver / 7) + 2; n -= (25 * a - 10) * a - 55; if (ver >= 7) n -= 36; }
  return n;
}
export const dataCodewords = (ver, ecl) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * BLOCKS[ecl][ver];
/** Centre coordinates of the alignment patterns. */
export function alignmentPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
  const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

/* ---------- GF(256) and Reed-Solomon ---------- */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
export const gfMul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
export const gfExp = (i) => EXP[((i % 255) + 255) % 255];
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1]; }
    root = gfMul(root, 2);
  }
  return r;
}
export function rsRemainder(data, degree) {
  const div = rsDivisor(degree), out = new Array(degree).fill(0);
  for (const b of data) {
    const f = b ^ out.shift(); out.push(0);
    div.forEach((c, i) => { out[i] ^= gfMul(c, f); });
  }
  return out;
}

/* ---------- data bits ---------- */
const utf8 = (text) => (typeof text === "string" ? new TextEncoder().encode(text) : Uint8Array.from(text));
const countBits = (ver) => (ver <= 9 ? 8 : 16);
const fits = (len, ver, ecl) => 4 + countBits(ver) + len * 8 <= dataCodewords(ver, ecl) * 8;

/** Smallest version (from minVersion) that holds `len` bytes at this level, or 0 when it is too long. */
export function pickVersion(len, ecl = "M", minVersion = 1) {
  for (let v = Math.max(1, minVersion); v <= 40; v++) if (fits(len, v, ecl)) return v;
  return 0;
}
/** Maximum number of bytes (UTF-8) a version holds at a level. */
export const capacity = (ver, ecl) => Math.floor((dataCodewords(ver, ecl) * 8 - 4 - countBits(ver)) / 8);

function codewords(bytes, ver, ecl) {
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, countBits(ver));
  for (const b of bytes) put(b, 8);
  const cap = dataCodewords(ver, ecl) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // Split into blocks, add error correction, interleave.
  const nBlocks = BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver];
  const raw = Math.floor(rawDataModules(ver) / 8), nShort = nBlocks - (raw % nBlocks), shortLen = Math.floor(raw / nBlocks);
  const blocks = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, eccLen);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) out.push(b[i]); });
  return out;
}

/* ---------- matrix ---------- */
export const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r * c) % 3) + ((r + c) % 2)) % 2 === 0,
];
export function formatBits(ecl, mask) {
  const data = (FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
export function versionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}

function baseMatrix(ver) {
  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r, c, v) => { m[r][c] = !!v; fn[r][c] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (r0, c0) => {
    for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      const d = Math.max(Math.abs(dr), Math.abs(dc));
      set(r, c, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(3, size - 4); finder(size - 4, 3);
  const al = alignmentPositions(ver), n = al.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(al[i] + dr, al[j] + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }
  // Reserve the format areas (written for real after masking) and the dark module.
  placeFormat(m, fn, "L", 0);
  if (ver >= 7) {
    const bits = versionBits(ver);
    for (let i = 0; i < 18; i++) { const b = (bits >>> i) & 1, a = size - 11 + (i % 3), k = Math.floor(i / 3); set(k, a, b); set(a, k, b); }
  }
  return { size, m, fn };
}
function placeFormat(m, fn, ecl, mask) {
  const size = m.length, bits = formatBits(ecl, mask);
  const set = (r, c, v) => { m[r][c] = !!v; fn[r][c] = true; };
  for (let i = 0; i < 15; i++) {
    const b = (bits >>> i) & 1;
    if (i < 6) set(i, 8, b); else if (i < 8) set(i + 1, 8, b); else set(size - 15 + i, 8, b);
    if (i < 8) set(8, size - 1 - i, b); else if (i < 9) set(8, 7, b); else set(8, 14 - i, b);
  }
  set(size - 8, 8, 1);
}
function placeData(m, fn, cw) {
  const size = m.length;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const c = right - j, up = ((right + 1) & 2) === 0, r = up ? size - 1 - v : v;
      if (fn[r][c]) continue;
      if (i < cw.length * 8) m[r][c] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
      i++;
    }
  }
}
const applyMask = (m, fn, mask) => { const f = MASKS[mask]; for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (!fn[r][c] && f(r, c)) m[r][c] = !m[r][c]; };

/** Standard penalty score (N1 runs, N2 2x2 blocks, N3 finder-like patterns, N4 dark balance). */
export function penalty(m) {
  const size = m.length;
  let p = 0;
  for (let r = 0; r < size; r++) {
    let runR = 0, runC = 0, lastR = null, lastC = null, bitsR = 0, bitsC = 0;
    for (let c = 0; c < size; c++) {
      const a = m[r][c], b = m[c][r];
      if (a === lastR) runR++; else { if (runR >= 5) p += 3 + runR - 5; lastR = a; runR = 1; }
      if (b === lastC) runC++; else { if (runC >= 5) p += 3 + runC - 5; lastC = b; runC = 1; }
      bitsR = ((bitsR << 1) & 0x7ff) | (a ? 1 : 0);
      bitsC = ((bitsC << 1) & 0x7ff) | (b ? 1 : 0);
      if (c >= 10 && (bitsR === 0x5d0 || bitsR === 0x05d)) p += 40;
      if (c >= 10 && (bitsC === 0x5d0 || bitsC === 0x05d)) p += 40;
    }
    if (runR >= 5) p += 3 + runR - 5;
    if (runC >= 5) p += 3 + runC - 5;
  }
  for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) {
    const s = m[r][c] + m[r][c + 1] + m[r + 1][c] + m[r + 1][c + 1];
    if (s === 0 || s === 4) p += 3;
  }
  let dark = 0;
  for (const row of m) for (const v of row) dark += v;
  p += Math.abs(Math.ceil((dark * 100) / (size * size) / 5) - 10) * 10;
  return p;
}

/**
 * QR code for `text` (string → UTF-8 bytes, or a byte array).
 * Options: ecl 'L'|'M'|'Q'|'H' (default M), version (fixed) or minVersion, mask 0-7 (default: best).
 * Returns { version, ecl, mask, size, modules: boolean[][] }.
 */
export function qrMatrix(text, { ecl = "M", version = 0, minVersion = 1, mask = -1 } = {}) {
  if (!(ecl in ECC)) throw new Error("Error correction must be L, M, Q or H.");
  const bytes = utf8(text);
  const ver = version || pickVersion(bytes.length, ecl, minVersion);
  if (!ver || !fits(bytes.length, ver, ecl)) throw new Error(`This text is too long for a QR code (${bytes.length} bytes).`);
  const cw = codewords(bytes, ver, ecl);
  const { size, m, fn } = baseMatrix(ver);
  placeData(m, fn, cw);
  let best = mask;
  if (!(best >= 0 && best <= 7)) {
    let low = Infinity;
    for (let k = 0; k < 8; k++) {
      placeFormat(m, fn, ecl, k); applyMask(m, fn, k);
      const p = penalty(m);
      applyMask(m, fn, k);
      if (p < low) { low = p; best = k; }
    }
  }
  applyMask(m, fn, best);
  placeFormat(m, fn, ecl, best);
  return { version: ver, ecl, mask: best, size, modules: m };
}

/** SVG markup (one path, crisp edges) with a quiet zone of `margin` modules. */
export function qrSvg(text, { ecl = "M", margin = 4, dark = "#000000", light = "#ffffff", px = 0, title = "" , ...rest } = {}) {
  const q = qrMatrix(text, { ecl, ...rest });
  const n = q.size + margin * 2;
  let d = "";
  q.modules.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      let k = c; while (k + 1 < row.length && row[k + 1]) k++;
      d += `M${c + margin} ${r + margin}h${k - c + 1}v1h-${k - c + 1}z`;
      c = k;
    }
  });
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const size = px ? ` width="${px}" height="${px}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}"${size} shape-rendering="crispEdges" role="img" aria-label="${esc(title || "QR code")}"><rect width="${n}" height="${n}" fill="${light}"/><path fill="${dark}" d="${d}"/></svg>`;
}
