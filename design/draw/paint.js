// AsaanDesk Draw: pure pixel maths (no DOM), so the same code runs in the browser and in Node tests.
// Buffers are ImageData-like: { width, height, data: Uint8ClampedArray RGBA, straight (not premultiplied) alpha }.
// Rectangles are [x0, y0, x1, y1] with x1/y1 exclusive.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const makeBuffer = (width, height) => ({ width, height, data: new Uint8ClampedArray(Math.max(0, width * height * 4)) });
export function pixelAt(buf, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) return [0, 0, 0, 0];
  const i = (y * buf.width + x) * 4, d = buf.data;
  return [d[i], d[i + 1], d[i + 2], d[i + 3]];
}
export function unionRect(a, b) {
  if (!a) return b ? b.slice() : null;
  if (!b) return a.slice();
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
export function clipRect(r, w, h) {
  const out = [clamp(Math.floor(r[0]), 0, w), clamp(Math.floor(r[1]), 0, h), clamp(Math.ceil(r[2]), 0, w), clamp(Math.ceil(r[3]), 0, h)];
  return out[2] > out[0] && out[3] > out[1] ? out : null;
}

/* ---------- colours ---------- */
export function hexToRgb(hex) {
  let h = String(hex ?? "").trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
export const rgbToHex = (rgb) => "#" + rgb.slice(0, 3).map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
export const normHex = (v) => { const c = hexToRgb(v); return c ? rgbToHex(c) : null; };
/** Adds a colour to the front of a recent-colours list (unique, newest first). */
export function pushRecent(list, hex, max = 12) {
  const h = normHex(hex);
  if (!h) return list.slice(0, max);
  return [h, ...list.filter((c) => c !== h)].slice(0, max);
}

/* ---------- randomness ---------- */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Paper grain for the pencil: a stable value in 0..1 for every pixel. */
export function grainAt(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/* ---------- brushes ---------- */
// size = diameter in canvas pixels, opacity = most a stroke can cover (strength for smudge), hardness 0 (soft) .. 1 (crisp),
// spacing = dab distance as a share of the diameter, pressureSize/pressureOpacity = how much pen pressure changes them,
// aspect/angle = flat nib shape, flow = coverage per dab ("add" brushes build up), combine "max" = no build-up within one stroke.
export const BRUSHES = {
  pencil: { label: "Pencil", size: 3, opacity: 0.9, hardness: 1, spacing: 0.12, pressureSize: 0.35, pressureOpacity: 0.4, grain: 0.45, smoothing: 0.15, combine: "max" },
  pen: { label: "Pen", size: 8, opacity: 1, hardness: 0.9, spacing: 0.08, pressureSize: 0.85, smoothing: 0.45, combine: "max" },
  marker: { label: "Marker", size: 22, opacity: 0.5, hardness: 0.75, spacing: 0.06, aspect: 0.6, angle: -30, smoothing: 0.3, combine: "max" },
  airbrush: { label: "Airbrush", size: 48, opacity: 0.6, hardness: 0, spacing: 0.08, flow: 0.06, scatter: 0.2, pressureOpacity: 1, smoothing: 0.2, combine: "add" },
  calligraphy: { label: "Calligraphy", size: 18, opacity: 1, hardness: 1, spacing: 0.04, aspect: 0.2, angle: 35, pressureSize: 0.5, smoothing: 0.4, combine: "max" },
  smudge: { label: "Smudge", size: 28, opacity: 0.7, hardness: 0.3, spacing: 0.12, smoothing: 0.2, mode: "smudge" },
  eraser: { label: "Eraser", size: 26, opacity: 1, hardness: 0.85, spacing: 0.08, smoothing: 0.2, combine: "max", mode: "erase" },
};

/**
 * Turns pointer samples into evenly spaced dabs. Points are { x, y, p } (p = pressure 0..1, default 1).
 * begin(pt) / move(pt) / end(pt) return the new dabs: { x, y, r, a, hardness, aspect, angle, grain }.
 */
export class Stroke {
  constructor(brushId, { size, smoothing, seed = 1 } = {}) {
    this.b = BRUSHES[brushId] || BRUSHES.pen;
    this.size = Math.max(0.5, size ?? this.b.size);
    this.smoothing = clamp(smoothing ?? this.b.smoothing ?? 0, 0, 0.95);
    this.rng = mulberry32(seed);
    this.last = null;
    this.carry = 0;
  }
  radiusAt(p) { const ps = this.b.pressureSize || 0; return Math.max(0.5, (this.size / 2) * (1 - ps + ps * p)); }
  flowAt(p) { const po = this.b.pressureOpacity || 0; return (this.b.flow ?? 1) * (1 - po + po * p); }
  step(p) { return Math.max(0.35, 2 * this.radiusAt(p) * this.b.spacing); }
  dab(x, y, p) {
    const b = this.b, r = this.radiusAt(p);
    let dx = 0, dy = 0;
    if (b.scatter) { const ang = this.rng() * Math.PI * 2, d = Math.sqrt(this.rng()) * b.scatter * r; dx = Math.cos(ang) * d; dy = Math.sin(ang) * d; }
    return { x: x + dx, y: y + dy, r, a: this.flowAt(p), hardness: b.hardness ?? 1, aspect: b.aspect || 1, angle: ((b.angle || 0) * Math.PI) / 180, grain: b.grain || 0 };
  }
  begin(pt) {
    const p = pt.p ?? 1;
    this.last = { x: pt.x, y: pt.y, p };
    this.carry = 0;
    return [this.dab(pt.x, pt.y, p)];
  }
  move(pt, final = false) {
    if (!this.last) return this.begin(pt);
    const k = final ? 0 : this.smoothing;
    const x0 = this.last.x, y0 = this.last.y, p0 = this.last.p, p1 = pt.p ?? 1;
    const tx = x0 + (pt.x - x0) * (1 - k), ty = y0 + (pt.y - y0) * (1 - k);
    const dx = tx - x0, dy = ty - y0, len = Math.hypot(dx, dy);
    const out = [];
    if (len < 1e-6) { this.last.p = p1; return out; }
    let pos = Math.max(0, this.step(p0) - this.carry), lastPos = null;
    while (pos <= len) {
      const t = pos / len, p = p0 + (p1 - p0) * t;
      out.push(this.dab(x0 + dx * t, y0 + dy * t, p));
      lastPos = pos;
      pos += this.step(p);
    }
    this.carry = lastPos == null ? this.carry + len : len - lastPos;
    this.last = { x: tx, y: ty, p: p1 };
    return out;
  }
  end(pt) { return pt ? this.move(pt, true) : []; }
}

/** Coverage 0..1 of one dab at offset (dx, dy) from its centre: anti-aliased edge, soft falloff, flat nib. */
export function dabCoverage(dx, dy, dab) {
  const { r, hardness = 1, aspect = 1, angle = 0 } = dab;
  let u = dx, v = dy;
  if (aspect !== 1 || angle) { const c = Math.cos(angle), s = Math.sin(angle); u = dx * c + dy * s; v = -dx * s + dy * c; }
  const n = Math.hypot(u, v / aspect) / r; // 0 at the centre, 1 on the outline
  const pl = Math.hypot(u, v);
  const edge = n > 1e-9 ? pl * (1 / n - 1) : r * aspect; // pixels to the outline along the ray
  let cov = edge + 0.5;
  if (cov <= 0) return 0;
  if (cov > 1) cov = 1;
  if (hardness < 1 && n > hardness) { const t = clamp((1 - n) / (1 - hardness), 0, 1); cov *= t * t * (3 - 2 * t); }
  return cov;
}

/** Adds one dab to a stroke mask (Float32Array w*h, 0..1). Returns the touched rect or null. */
export function stampMask(mask, w, h, dab, combine = "max") {
  const ext = dab.r + 1.5;
  const x0 = Math.max(0, Math.floor(dab.x - ext)), x1 = Math.min(w - 1, Math.ceil(dab.x + ext));
  const y0 = Math.max(0, Math.floor(dab.y - ext)), y1 = Math.min(h - 1, Math.ceil(dab.y + ext));
  if (x0 > x1 || y0 > y1) return null;
  const a = dab.a ?? 1, g = dab.grain || 0, add = combine === "add";
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = dabCoverage(x + 0.5 - dab.x, y + 0.5 - dab.y, dab);
      if (c <= 0) continue;
      let v = c * a;
      if (g) v *= 1 - g * grainAt(x, y);
      const i = y * w + x;
      if (add) mask[i] += v * (1 - mask[i]);
      else if (v > mask[i]) mask[i] = v;
    }
  }
  return [x0, y0, x1 + 1, y1 + 1];
}

/** Writes base + stroke mask into dst inside rect: paint (source-over in rgb) or erase (removes alpha). */
export function applyMask(dst, base, mask, rect, rgb, opacity = 1, mode = "paint") {
  const W = dst.width, D = dst.data, B = base.data || base;
  const [x0, y0, x1, y1] = rect;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * W + x, j = i * 4, m = mask[i] * opacity;
      if (m <= 0) { D[j] = B[j]; D[j + 1] = B[j + 1]; D[j + 2] = B[j + 2]; D[j + 3] = B[j + 3]; continue; }
      if (mode === "erase") {
        D[j] = B[j]; D[j + 1] = B[j + 1]; D[j + 2] = B[j + 2]; D[j + 3] = B[j + 3] * (1 - m);
        continue;
      }
      const ba = B[j + 3] / 255, k = ba * (1 - m), oa = m + k;
      D[j] = (rgb[0] * m + B[j] * k) / oa;
      D[j + 1] = (rgb[1] * m + B[j + 1] * k) / oa;
      D[j + 2] = (rgb[2] * m + B[j + 2] * k) / oa;
      D[j + 3] = oa * 255;
    }
  }
}
/** Clears the mask inside rect (after a stroke). */
export function clearMask(mask, w, rect) {
  if (!rect) return;
  for (let y = rect[1]; y < rect[3]; y++) mask.fill(0, y * w + rect[0], y * w + rect[2]);
}

/**
 * Smudge: picks up the colour under the dab and drags it along. state = {} at stroke start (keeps the carried colour).
 * strength 0..1: how much of the carried colour is laid down and how long it lasts. Works in premultiplied space.
 */
export function smudgeDab(buf, dab, state, strength = 0.7) {
  const W = buf.width, H = buf.height, D = buf.data, ext = dab.r + 1.5;
  const x0 = Math.max(0, Math.floor(dab.x - ext)), x1 = Math.min(W - 1, Math.ceil(dab.x + ext));
  const y0 = Math.max(0, Math.floor(dab.y - ext)), y1 = Math.min(H - 1, Math.ceil(dab.y + ext));
  if (x0 > x1 || y0 > y1) return null;
  let sw = 0, sr = 0, sg = 0, sb = 0, sa = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = dabCoverage(x + 0.5 - dab.x, y + 0.5 - dab.y, dab);
    if (c <= 0) continue;
    const j = (y * W + x) * 4, f = D[j + 3] / 255;
    sw += c; sr += D[j] * f * c; sg += D[j + 1] * f * c; sb += D[j + 2] * f * c; sa += D[j + 3] * c;
  }
  if (sw <= 0) return null;
  const sample = [sr / sw, sg / sw, sb / sw, sa / sw];
  if (!state.color) state.color = sample.slice();
  const col = state.color, s = clamp(strength, 0, 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = dabCoverage(x + 0.5 - dab.x, y + 0.5 - dab.y, dab);
    if (c <= 0) continue;
    const k = c * s, j = (y * W + x) * 4, f = D[j + 3] / 255;
    const a = D[j + 3] * (1 - k) + col[3] * k;
    if (a <= 0.01) { D[j + 3] = 0; continue; }
    const r = D[j] * f * (1 - k) + col[0] * k, g = D[j + 1] * f * (1 - k) + col[1] * k, b = D[j + 2] * f * (1 - k) + col[2] * k;
    D[j] = (r * 255) / a; D[j + 1] = (g * 255) / a; D[j + 2] = (b * 255) / a; D[j + 3] = a;
  }
  const pick = 1 - s;
  for (let q = 0; q < 4; q++) col[q] = col[q] * (1 - pick) + sample[q] * pick;
  return [x0, y0, x1 + 1, y1 + 1];
}

/* ---------- paint bucket ---------- */
/**
 * Scanline flood fill (4-connected) from (sx, sy): pixels whose premultiplied colour and alpha are within `tolerance`
 * (0..255) of the seed pixel. Returns { mask: Uint8Array (1 = filled), count, rect } or null when outside.
 */
export function floodFill(src, sx, sy, tolerance = 32) {
  const W = src.width, H = src.height, d = src.data;
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
  const i0 = (sy * W + sx) * 4, sa = d[i0 + 3], f0 = sa / 255;
  const sr = d[i0] * f0, sg = d[i0 + 1] * f0, sb = d[i0 + 2] * f0, tol = clamp(tolerance, 0, 255);
  const mask = new Uint8Array(W * H);
  const match = (p) => {
    const j = p * 4, a = d[j + 3];
    if (Math.abs(a - sa) > tol) return false;
    const f = a / 255;
    return Math.abs(d[j] * f - sr) <= tol && Math.abs(d[j + 1] * f - sg) <= tol && Math.abs(d[j + 2] * f - sb) <= tol;
  };
  let count = 0, minx = sx, maxx = sx, miny = sy, maxy = sy;
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop(), row = y * W;
    if (mask[row + x] || !match(row + x)) continue;
    let l = x, r = x;
    while (l > 0 && !mask[row + l - 1] && match(row + l - 1)) l--;
    while (r < W - 1 && !mask[row + r + 1] && match(row + r + 1)) r++;
    for (let i = l; i <= r; i++) mask[row + i] = 1;
    count += r - l + 1;
    if (l < minx) minx = l;
    if (r > maxx) maxx = r;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue;
      const nrow = ny * W;
      let run = false;
      for (let i = l; i <= r; i++) {
        const ok = !mask[nrow + i] && match(nrow + i);
        if (ok && !run) { stack.push(i, ny); run = true; } else if (!ok) run = false;
      }
    }
  }
  return { mask, count, rect: [minx, miny, maxx + 1, maxy + 1] };
}

/** Grows a fill mask by n pixels (8 neighbours) so anti-aliased outline edges get covered. New pixels are marked 2. */
export function growMask(mask, w, h, rect, n = 1) {
  let r = rect.slice();
  for (let k = 0; k < n; k++) {
    const g = [Math.max(0, r[0] - 1), Math.max(0, r[1] - 1), Math.min(w, r[2] + 1), Math.min(h, r[3] + 1)];
    const add = [];
    for (let y = g[1]; y < g[3]; y++) for (let x = g[0]; x < g[2]; x++) {
      const i = y * w + x;
      if (mask[i]) continue;
      let hit = false;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < w && mask[yy * w + xx] === 1) { hit = true; break; }
        }
      }
      if (hit) add.push(i);
    }
    for (const i of add) mask[i] = 2;
    r = g;
  }
  return r;
}

/** Paints a fill mask: pixels marked 1 get the colour on top, grown edge pixels (2) get it underneath. */
export function fillMask(dst, mask, rect, rgb, opacity = 1) {
  const W = dst.width, D = dst.data, m = clamp(opacity, 0, 1);
  for (let y = rect[1]; y < rect[3]; y++) for (let x = rect[0]; x < rect[2]; x++) {
    const i = y * W + x, v = mask[i];
    if (!v) continue;
    const j = i * 4, ba = D[j + 3] / 255;
    if (v === 1) {
      const k = ba * (1 - m), oa = m + k;
      if (oa <= 0) continue;
      for (let c = 0; c < 3; c++) D[j + c] = (rgb[c] * m + D[j + c] * k) / oa;
      D[j + 3] = oa * 255;
    } else {
      const k = m * (1 - ba), oa = ba + k;
      if (oa <= 0) continue;
      for (let c = 0; c < 3; c++) D[j + c] = (D[j + c] * ba + rgb[c] * k) / oa;
      D[j + 3] = oa * 255;
    }
  }
}

/* ---------- layers ---------- */
/**
 * Flattens layers (bottom first): [{ data: buffer | Uint8ClampedArray, opacity, hidden }] with source-over and the
 * layer opacity, skipping hidden layers. background = [r, g, b] (opaque paper) or null (transparent).
 */
export function composite(layers, width, height, background = null) {
  const out = makeBuffer(width, height), O = out.data, n = width * height;
  const vis = layers.filter((l) => !l.hidden && l.opacity > 0).map((l) => ({ d: l.data.data || l.data, o: clamp(l.opacity, 0, 1) }));
  const bg = background ? background.slice(0, 3) : null;
  for (let p = 0; p < n; p++) {
    const j = p * 4;
    let r = 0, g = 0, b = 0, a = 0;
    if (bg) { r = bg[0]; g = bg[1]; b = bg[2]; a = 255; }
    for (const L of vis) {
      const S = L.d, sa = (S[j + 3] / 255) * L.o;
      if (sa <= 0) continue;
      const k = 1 - sa;
      r = S[j] * sa + r * k; g = S[j + 1] * sa + g * k; b = S[j + 2] * sa + b * k; a = 255 * sa + a * k;
    }
    if (a > 0) { const u = 255 / a; O[j] = r * u; O[j + 1] = g * u; O[j + 2] = b * u; O[j + 3] = a; }
  }
  return out;
}
