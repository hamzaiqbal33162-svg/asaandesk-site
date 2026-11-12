// Photo editor maths (no DOM): adjustments, filters, crop/rotate geometry, export sizes and the
// passport sheet layout. Works on ImageData-like objects {data: Uint8ClampedArray RGBA, width, height},
// so the same code runs in the page, in a worker and in Node tests.
//
// Spatial effects (blur, sharpen, clarity, grain) scale with the picture (ref = long side / 1000), so the
// small on-screen preview and the full-size export look the same.

export const ADJUSTMENTS = [
  { id: "exposure", label: "Exposure", min: -100, max: 100, group: "light" },
  { id: "brightness", label: "Brightness", min: -100, max: 100, group: "light" },
  { id: "contrast", label: "Contrast", min: -100, max: 100, group: "light" },
  { id: "highlights", label: "Highlights", min: -100, max: 100, group: "light" },
  { id: "shadows", label: "Shadows", min: -100, max: 100, group: "light" },
  { id: "whites", label: "Whites", min: -100, max: 100, group: "light" },
  { id: "blacks", label: "Blacks", min: -100, max: 100, group: "light" },
  { id: "fade", label: "Fade", min: 0, max: 100, group: "light" },
  { id: "saturation", label: "Saturation", min: -100, max: 100, group: "colour" },
  { id: "vibrance", label: "Vibrance", min: -100, max: 100, group: "colour" },
  { id: "warmth", label: "Warmth", min: -100, max: 100, group: "colour" },
  { id: "tint", label: "Tint", min: -100, max: 100, group: "colour" },
  { id: "hue", label: "Hue", min: -180, max: 180, group: "colour" },
  { id: "sharpen", label: "Sharpen", min: 0, max: 100, group: "detail" },
  { id: "clarity", label: "Clarity", min: -100, max: 100, group: "detail" },
  { id: "blur", label: "Blur", min: 0, max: 100, group: "detail" },
  { id: "vignette", label: "Vignette", min: -100, max: 100, group: "detail" },
  { id: "grain", label: "Grain", min: 0, max: 100, group: "detail" },
];
export const NEUTRAL = Object.freeze(Object.fromEntries(ADJUSTMENTS.map((a) => [a.id, 0])));
export const isNeutral = (adj) => !adj || ADJUSTMENTS.every((a) => !adj[a.id]);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const s2l = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const l2s = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
export const blankImage = (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
export const cloneImage = (img) => ({ data: new Uint8ClampedArray(img.data), width: img.width, height: img.height });

/* ---------- blur helpers ---------- */

// Box radii for three passes that approximate a Gaussian of sigma (Kovesi).
function boxRadii(sigma) {
  const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return [0, 1, 2].map((i) => Math.max(0, ((i < m ? wl : wu) - 1) / 2));
}
function boxH(src, dst, w, h, r) {
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      dst[row + x] = s * k;
      s += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
}
function boxV(src, dst, w, h, r) {
  const k = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += src[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = s * k;
      s += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
    }
  }
}
/** Gaussian blur (three box passes) of one float plane; returns a new Float32Array. */
export function gaussPlane(src, w, h, sigma) {
  const out = Float32Array.from(src);
  if (!(sigma > 0.3)) return out;
  const tmp = new Float32Array(w * h);
  for (const r of boxRadii(sigma)) {
    const rr = Math.round(r);
    if (rr < 1) continue;
    boxH(out, tmp, w, h, rr);
    boxV(tmp, out, w, h, rr);
  }
  return out;
}

/* ---------- adjustments ---------- */

// Per-channel tone curve: exposure (stops, in linear light), brightness (gamma), contrast (around mid grey).
function toneLut(adj) {
  const lut = new Float32Array(256);
  const ev = 2 ** ((adj.exposure || 0) / 50);
  const gamma = 2 ** (-(adj.brightness || 0) / 100);
  const c = adj.contrast || 0, k = 1 + c / 125, sa = (c / 100) * 5;
  const wh = (adj.whites || 0) / 100, bk = (adj.blacks || 0) / 100;
  for (let v = 0; v < 256; v++) {
    let x = v / 255;
    if (ev !== 1) x = l2s(Math.min(1, s2l(x) * ev));
    if (gamma !== 1) x = x ** gamma;
    if (c) {
      // S-curve when adding contrast (no hard clipping; c = 0 is the identity), straight line when reducing
      const d = x - 0.5;
      x = c > 0 ? 0.5 + Math.tanh(d * sa) / (2 * Math.tanh(sa / 2)) : 0.5 + d * k;
    }
    // whites / blacks move the white and black points (mostly the brightest / darkest tones; the curve never turns back)
    if (wh) x += wh * 0.22 * x * x * x;
    if (bk) x += bk * 0.22 * (1 - x) ** 3;
    lut[v] = clamp01(x);
  }
  return lut;
}

/**
 * Apply the adjustment set (values -100..100 or 0..100, see ADJUSTMENTS) to an image.
 * Returns a new image; alpha is kept. opts.seed changes the grain pattern.
 */
export function applyAdjustments(img, adj = NEUTRAL, { seed = 7 } = {}) {
  const { width: w, height: h } = img;
  const src = img.data, out = new Uint8ClampedArray(src.length);
  const n = w * h;
  const a = { ...NEUTRAL, ...adj };
  const ref = Math.max(w, h) / 1000;
  const lut = toneLut(a);
  const sh = a.shadows / 100, hl = a.highlights / 100;
  const warm = a.warmth / 100, tint = a.tint / 100;
  const sat = 1 + a.saturation / 100, vib = a.vibrance / 100;
  const fade = a.fade / 100, lo = 0.2 * fade, hi = 1 - 0.08 * fade;
  const rW = 1 + 0.16 * warm + 0.05 * tint, gW = 1 - 0.13 * tint, bW = 1 - 0.16 * warm + 0.05 * tint;
  const doHS = sh !== 0 || hl !== 0, doSat = sat !== 1 || vib !== 0, doWB = warm !== 0 || tint !== 0;
  // hue: turn the colours round the grey axis (YIQ), brightness stays
  const hr = ((a.hue || 0) * Math.PI) / 180, hc = Math.cos(hr), hs = -Math.sin(hr), doHue = !!a.hue; // + = red → yellow → green, like CSS hue-rotate
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = lut[src[o]], g = lut[src[o + 1]], b = lut[src[o + 2]];
    if (doHS) {
      const L = luma(r, g, b);
      // shadows: a bump over the dark tones (pure black stays black); highlights: the bright tones
      const wS = smooth(0, 0.22, L) * (1 - smooth(0.22, 0.7, L)), wH = smooth(0.45, 0.95, L);
      const L2 = clamp01(L + sh * 0.3 * wS + hl * 0.3 * wH);
      if (L > 0.02) { const k = Math.min(4, L2 / L); r *= k; g *= k; b *= k; } else { const d = L2 - L; r += d; g += d; b += d; }
    }
    if (doWB) { r *= rW; g *= gW; b *= bW; }
    if (doHue) {
      const Y = 0.299 * r + 0.587 * g + 0.114 * b, I = 0.596 * r - 0.274 * g - 0.322 * b, Q = 0.211 * r - 0.523 * g + 0.312 * b;
      const I2 = I * hc - Q * hs, Q2 = I * hs + Q * hc;
      r = Y + 0.956 * I2 + 0.621 * Q2; g = Y - 0.272 * I2 - 0.647 * Q2; b = Y - 1.106 * I2 + 1.703 * Q2;
    }
    if (doSat) {
      const L = luma(r, g, b);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const s0 = mx > 1e-4 ? (mx - mn) / mx : 0;
      const f = sat * (1 + vib * (1 - s0) * 1.3);
      r = L + (r - L) * f; g = L + (g - L) * f; b = L + (b - L) * f;
    }
    if (fade) { r = lo + clamp01(r) * (hi - lo); g = lo + clamp01(g) * (hi - lo); b = lo + clamp01(b) * (hi - lo); }
    out[o] = r * 255; out[o + 1] = g * 255; out[o + 2] = b * 255; out[o + 3] = src[o + 3];
  }
  // local contrast (clarity) and sharpening on brightness only, so colours do not fringe
  if (a.clarity || a.sharpen) {
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = luma(out[i * 4], out[i * 4 + 1], out[i * 4 + 2]);
    const delta = new Float32Array(n);
    if (a.clarity) {
      const bl = gaussPlane(L, w, h, Math.max(2, 18 * ref));
      const k = (a.clarity / 100) * 0.9;
      for (let i = 0; i < n; i++) { const m = L[i] / 255, mid = 1 - (2 * m - 1) ** 2; delta[i] += k * (L[i] - bl[i]) * (0.35 + 0.65 * mid); }
    }
    if (a.sharpen) {
      const bl = gaussPlane(L, w, h, Math.max(0.7, 1.1 * ref));
      const k = (a.sharpen / 100) * 1.6;
      for (let i = 0; i < n; i++) delta[i] += k * (L[i] - bl[i]);
    }
    for (let i = 0; i < n; i++) { const d = delta[i]; if (d) { const o = i * 4; out[o] += d; out[o + 1] += d; out[o + 2] += d; } }
  }
  if (a.blur) {
    const sigma = (a.blur / 100) * 20 * ref;
    if (sigma > 0.3) {
      const plane = new Float32Array(n);
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < n; i++) plane[i] = out[i * 4 + c];
        const bl = gaussPlane(plane, w, h, sigma);
        for (let i = 0; i < n; i++) out[i * 4 + c] = bl[i];
      }
    }
  }
  if (a.vignette || a.grain) {
    const v = a.vignette / 100, gr = (a.grain / 100) * 0.16 * 255;
    const cell = Math.max(1, Math.round(ref));
    for (let y = 0; y < h; y++) {
      const dy = (y + 0.5) / h * 2 - 1;
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (v) {
          const dx = (x + 0.5) / w * 2 - 1;
          const wgt = smooth(0.35, 1.25, Math.sqrt((dx * dx + dy * dy) / 2) * 1.25) * Math.abs(v) * 0.85;
          for (let c = 0; c < 3; c++) out[o + c] = v > 0 ? out[o + c] * (1 - wgt) : out[o + c] + (255 - out[o + c]) * wgt;
        }
        if (gr) {
          const L = luma(out[o], out[o + 1], out[o + 2]) / 255;
          const nz = (hash2((x / cell) | 0, (y / cell) | 0, seed) - 0.5) * 2 * gr * (1 - 0.6 * Math.abs(2 * L - 1));
          out[o] += nz; out[o + 1] += nz; out[o + 2] += nz;
        }
      }
    }
  }
  return { data: out, width: w, height: h };
}

export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* ---------- filters ---------- */

// Our own looks. grade: mono (0..1), sepia (0..1), split toning (shadow / highlight tint colours),
// curve (per-channel points 0..255). adjust: the same sliders as the Adjust tab.
export const FILTERS = [
  { id: "none", name: "Original" },
  { id: "vivid", name: "Vivid", adjust: { saturation: 30, vibrance: 25, contrast: 18, clarity: 10 } },
  { id: "lahore-gold", name: "Lahore Gold", adjust: { warmth: 32, contrast: 12, saturation: 8, vignette: 18 }, grade: { split: { shadows: "#5a3a1e", highlights: "#ffcf7a", amount: 0.28 } } },
  { id: "karachi-sea", name: "Karachi Sea", adjust: { warmth: -22, saturation: 12, contrast: 8, highlights: -10 }, grade: { split: { shadows: "#0e5a66", highlights: "#bff3ff", amount: 0.3 } } },
  { id: "monsoon", name: "Monsoon", adjust: { saturation: -18, fade: 14, contrast: -6, warmth: -10, shadows: 12 }, grade: { split: { shadows: "#24524a", highlights: "#dfeee6", amount: 0.3 } } },
  { id: "mono", name: "Mono", adjust: { contrast: 14, clarity: 8 }, grade: { mono: 1 } },
  { id: "film", name: "Film", adjust: { fade: 18, grain: 22, saturation: -8, contrast: 6 }, grade: { split: { shadows: "#1f4e5f", highlights: "#ffe0b5", amount: 0.22 }, curve: { r: [[0, 8], [128, 132], [255, 248]], b: [[0, 18], [128, 124], [255, 238]] } } },
  { id: "soft", name: "Soft", adjust: { contrast: -16, fade: 20, highlights: -18, clarity: -18, warmth: 6 } },
  { id: "night", name: "Night", adjust: { exposure: -10, contrast: 20, saturation: -15, vignette: 35, warmth: -18 }, grade: { split: { shadows: "#14205a", highlights: "#cfd9ff", amount: 0.3 } } },
  { id: "hunza-morning", name: "Hunza Morning", adjust: { exposure: 10, highlights: -18, vibrance: 28, warmth: -6, fade: 6, clarity: 12 } },
  { id: "thar-dusk", name: "Thar Dusk", adjust: { warmth: 45, tint: 10, contrast: 15, vignette: 25, saturation: 6 }, grade: { split: { shadows: "#4a2350", highlights: "#ffb36b", amount: 0.25 } } },
  { id: "chai", name: "Chai", adjust: { fade: 14, contrast: 6, warmth: 12 }, grade: { sepia: 0.55 } },
  { id: "mehndi", name: "Mehndi", adjust: { warmth: 16, tint: -14, saturation: 10, contrast: 8 }, grade: { split: { shadows: "#3d4a1a", highlights: "#ffb05c", amount: 0.25 } } },
  { id: "rose-petal", name: "Rose Petal", adjust: { tint: 18, fade: 10, contrast: -6, exposure: 6 }, grade: { split: { shadows: "#5a2a3e", highlights: "#ffd1dc", amount: 0.25 } } },
  { id: "old-fort", name: "Old Fort", adjust: { grain: 30, vignette: 32, fade: 20, contrast: 12 }, grade: { sepia: 0.85 } },
  { id: "frost", name: "Frost", adjust: { warmth: -36, saturation: -26, exposure: 10, fade: 10, highlights: 10 } },
  { id: "kite-day", name: "Kite Day", adjust: { vibrance: 40, contrast: 20, warmth: 10, clarity: 18, saturation: 8 } },
  { id: "noir", name: "Noir", adjust: { contrast: 40, vignette: 40, grain: 18, shadows: -10 }, grade: { mono: 1 } },
];
export const filterById = (id) => FILTERS.find((f) => f.id === id) || FILTERS[0];

const hexRgb = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "")); const v = m ? parseInt(m[1], 16) : 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
// Piecewise-linear curve through points [[in, out], ...] (0..255) as a 256-entry table.
export function curveLut(points) {
  const lut = new Uint8ClampedArray(256);
  const pts = [...points].sort((p, q) => p[0] - q[0]);
  if (pts[0][0] > 0) pts.unshift([0, pts[0][1]]);
  if (pts[pts.length - 1][0] < 255) pts.push([255, pts[pts.length - 1][1]]);
  let j = 0;
  for (let v = 0; v < 256; v++) {
    while (j < pts.length - 2 && v > pts[j + 1][0]) j++;
    const [x0, y0] = pts[j], [x1, y1] = pts[j + 1];
    lut[v] = Math.round(x1 === x0 ? y1 : y0 + ((y1 - y0) * (v - x0)) / (x1 - x0));
  }
  return lut;
}

function grade(img, g) {
  if (!g) return img;
  const out = new Uint8ClampedArray(img.data), n = img.width * img.height;
  const curves = g.curve ? ["r", "g", "b"].map((k) => (g.curve[k] ? curveLut(g.curve[k]) : null)) : null;
  const sp = g.split ? { s: hexRgb(g.split.shadows), h: hexRgb(g.split.highlights), a: g.split.amount ?? 0.25 } : null;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = out[o], gg = out[o + 1], b = out[o + 2];
    if (g.mono) { const L = luma(r, gg, b); r += (L - r) * g.mono; gg += (L - gg) * g.mono; b += (L - b) * g.mono; }
    if (g.sepia) {
      const sr = 0.393 * r + 0.769 * gg + 0.189 * b, sg = 0.349 * r + 0.686 * gg + 0.168 * b, sb = 0.272 * r + 0.534 * gg + 0.131 * b;
      r += (sr - r) * g.sepia; gg += (sg - gg) * g.sepia; b += (sb - b) * g.sepia;
    }
    if (sp) {
      const L = clamp01(luma(r, gg, b) / 255), ws = (1 - L) * (1 - L) * sp.a, wh = L * L * sp.a;
      // overlay-style toning: move towards the tint colour, keeping brightness
      r += (sp.s[0] - 128) * ws + (sp.h[0] - 128) * wh;
      gg += (sp.s[1] - 128) * ws + (sp.h[1] - 128) * wh;
      b += (sp.s[2] - 128) * ws + (sp.h[2] - 128) * wh;
    }
    out[o] = r; out[o + 1] = gg; out[o + 2] = b;
    if (curves) { if (curves[0]) out[o] = curves[0][out[o]]; if (curves[1]) out[o + 1] = curves[1][out[o + 1]]; if (curves[2]) out[o + 2] = curves[2][out[o + 2]]; }
  }
  return { data: out, width: img.width, height: img.height };
}

/** Apply a filter look at an intensity of 0..1 (mixes the look with the input). */
export function applyFilter(img, id, intensity = 1, { seed = 7 } = {}) {
  const f = filterById(id);
  const t = clamp01(intensity);
  if (f.id === "none" || t === 0) return cloneImage(img);
  const looked = applyAdjustments(grade(img, f.grade), f.adjust || NEUTRAL, { seed: seed + 101 });
  if (t === 1) return looked;
  const out = looked.data, src = img.data;
  for (let i = 0; i < out.length; i += 4) {
    out[i] = src[i] + (out[i] - src[i]) * t;
    out[i + 1] = src[i + 1] + (out[i + 1] - src[i + 1]) * t;
    out[i + 2] = src[i + 2] + (out[i + 2] - src[i + 2]) * t;
  }
  return looked;
}

/**
 * Face retouch (skin smoothing) and changed photo colours first (they look at the photo's own colours), then the
 * filter look, then the person's own adjustments, then the colour effects (duotone, invert).
 */
export function renderPixels(img, { adjust = NEUTRAL, filter = null, fx = null } = {}, opts = {}) {
  let out = img;
  if (fx && fx.retouch > 0) out = retouchSkin(out, fx.retouch);
  if (fx && hasPhotoColors(fx)) out = applyPhotoColors(out === img ? cloneImage(img) : out, fx.colors);
  if (filter && filter.id && filter.id !== "none" && filter.intensity > 0) out = applyFilter(out, filter.id, filter.intensity / 100, opts);
  if (!isNeutral(adjust)) out = applyAdjustments(out, adjust, opts);
  if (hasColorFx(fx)) out = applyColorFx(out === img ? cloneImage(img) : out, fx);
  return out === img ? cloneImage(img) : out;
}

/* ---------- colour effects: duotone and invert ---------- */

export const DUOTONES = [
  { id: "berry", name: "Berry", a: "#2b1055", b: "#ff7eb3" },
  { id: "ocean", name: "Ocean", a: "#0b2545", b: "#7ee8fa" },
  { id: "sunset", name: "Sunset", a: "#3a0ca3", b: "#ffb703" },
  { id: "forest", name: "Forest", a: "#1b4332", b: "#d8f3dc" },
  { id: "lemon", name: "Lemon", a: "#283618", b: "#fefae0" },
  { id: "coral", name: "Coral", a: "#22223b", b: "#ff8c69" },
  { id: "violet", name: "Violet", a: "#240046", b: "#c77dff" },
  { id: "teal", name: "Teal", a: "#03045e", b: "#48cae4" },
];
export const duotoneById = (id) => DUOTONES.find((d) => d.id === id) || null;
export const hasColorFx = (fx) => !!(fx && (fx.invert || (fx.duotone && fx.duotone.id && (fx.duotone.amount ?? 100) > 0)));
/** Any per-pixel effect in fx: duotone, invert, changed photo colours or face retouch. */
export const hasPixelFx = (fx) => !!(fx && (hasColorFx(fx) || fx.retouch > 0 || hasPhotoColors(fx)));
/** Duotone maps brightness to a colour between a (shadows) and b (highlights); invert flips every colour. Alpha kept. */
export function applyColorFx(img, fx) {
  const d = img.data, n = img.width * img.height;
  const duo = fx.duotone && duotoneById(fx.duotone.id), amt = duo ? clamp01((fx.duotone.amount ?? 100) / 100) : 0;
  const A = duo ? hexRgb(duo.a) : null, B = duo ? hexRgb(duo.b) : null;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = d[o], g = d[o + 1], b = d[o + 2];
    if (duo) {
      const t = luma(r, g, b) / 255;
      r += (A[0] + (B[0] - A[0]) * t - r) * amt; g += (A[1] + (B[1] - A[1]) * t - g) * amt; b += (A[2] + (B[2] - A[2]) * t - b) * amt;
    }
    if (fx.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
    d[o] = r; d[o + 1] = g; d[o + 2] = b;
  }
  return img;
}

/* ---------- edit only part of the photo (foreground / background / brushed or clicked area) ---------- */

/** out = original + (edited - original) × weight, weight from the mask's alpha (inverted for "background"). */
export function blendByMask(orig, edited, mask, invert = false) {
  const out = new Uint8ClampedArray(edited.data.length), o = orig.data, e = edited.data, m = mask.data;
  for (let i = 0; i < out.length; i += 4) {
    let w = m[i + 3] / 255;
    if (invert) w = 1 - w;
    out[i] = o[i] + (e[i] - o[i]) * w; out[i + 1] = o[i + 1] + (e[i + 1] - o[i + 1]) * w; out[i + 2] = o[i + 2] + (e[i + 2] - o[i + 2]) * w;
    out[i + 3] = o[i + 3] + (e[i + 3] - o[i + 3]) * w;
  }
  return { data: out, width: edited.width, height: edited.height };
}

/** Pixels similar in colour to the one at (x, y) and joined to it (flood select). tol 0..100. Returns an alpha mask image. */
export function regionGrow(img, x, y, tol = 30) {
  const { width: w, height: h, data: d } = img, mask = blankImage(w, h);
  x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(h - 1, Math.round(y)));
  const o0 = (y * w + x) * 4, r0 = d[o0], g0 = d[o0 + 1], b0 = d[o0 + 2];
  const lim = (tol / 100) * 441.7 * 0.6, lim2 = lim * lim;
  const seen = new Uint8Array(w * h), stack = [y * w + x];
  seen[y * w + x] = 1;
  while (stack.length) {
    const p = stack.pop(), o = p * 4;
    const dr = d[o] - r0, dg = d[o + 1] - g0, db = d[o + 2] - b0;
    if (dr * dr + dg * dg + db * db > lim2) continue;
    mask.data[o] = mask.data[o + 1] = mask.data[o + 2] = 255; mask.data[o + 3] = 255;
    const px = p % w, py = (p / w) | 0;
    if (px > 0 && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
    if (px < w - 1 && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
    if (py > 0 && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
    if (py < h - 1 && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
  }
  return mask;
}

/* ---------- one-tap fixes ---------- */

/**
 * Auto-adjust: settings that bring the (masked) pixels to a balanced exposure, contrast and white balance.
 * mask: optional alpha image of the same size (only pixels with alpha > 127 count; invertMask counts the others).
 */
export function autoAdjust(img, mask = null, invertMask = false) {
  const d = img.data, n = img.width * img.height, hist = new Uint32Array(256);
  let sr = 0, sg = 0, sb = 0, ss = 0, cnt = 0;
  const step = Math.max(1, Math.floor(n / 200000));
  for (let i = 0; i < n; i += step) {
    const o = i * 4;
    if (d[o + 3] < 128) continue;
    if (mask) { const inside = mask.data[o + 3] > 127; if (inside === invertMask) continue; }
    const r = d[o], g = d[o + 1], b = d[o + 2], L = luma(r, g, b);
    hist[Math.min(255, Math.round(L))]++; sr += r; sg += g; sb += b; cnt++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); ss += mx > 0 ? (mx - mn) / mx : 0;
  }
  const out = { ...NEUTRAL };
  if (!cnt) return out;
  const pct = (q) => { let acc = 0; const t = q * cnt; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= t) return v / 255; } return 1; };
  const p5 = pct(0.05), p50 = pct(0.5), p95 = pct(0.95);
  const mid = Math.min(0.97, Math.max(0.03, p50));
  const gamma = Math.log(0.46) / Math.log(mid);
  out.brightness = Math.round(clamp(-100 * Math.log2(gamma), -60, 60));
  const spread = p95 - p5;
  out.contrast = Math.round(clamp(spread < 0.7 ? (0.8 - spread) * 90 : spread > 0.95 ? -10 : 0, -20, 40));
  if (p95 > 0.97) out.highlights = -20;
  if (p5 < 0.03) out.shadows = 20;
  const mr = sr / cnt, mg = sg / cnt, mb = sb / cnt, m = (mr + mg + mb) / 3 || 1;
  out.warmth = Math.round(clamp(((mb - mr) / m) * 120, -40, 40));
  out.tint = Math.round(clamp(((mg - (mr + mb) / 2) / m) * 150, -30, 30));
  const sat = ss / cnt;
  out.vibrance = sat < 0.25 ? 20 : sat < 0.4 ? 10 : 0;
  return out;
}

/**
 * Smart crop: the crop box of the given aspect (w/h of the frame) that keeps the most detail, or centred on the
 * subject box (normalised {x, y, w, h}) when one is known. Returns a normalised crop {x, y, w, h}.
 */
export function smartCrop(img, aspect, subject = null, fill = 1) {
  const W = img.width, H = img.height;
  const a = aspect || W / H;
  let cw = W, ch = W / a;
  if (ch > H) { ch = H; cw = H * a; }
  cw *= fill; ch *= fill;
  const fw = cw / W, fh = ch / H;
  let cx, cy;
  if (subject && subject.w > 0 && subject.h > 0) { cx = subject.x + subject.w / 2; cy = subject.y + subject.h / 2; }
  else {
    // detail (edge energy) per column and row, then the window with the most of it
    const d = img.data, col = new Float64Array(W), row = new Float64Array(H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const o = (y * W + x) * 4;
      const e = Math.abs(luma(d[o + 4], d[o + 5], d[o + 6]) - luma(d[o - 4], d[o - 3], d[o - 2])) + Math.abs(luma(d[o + W * 4], d[o + W * 4 + 1], d[o + W * 4 + 2]) - luma(d[o - W * 4], d[o - W * 4 + 1], d[o - W * 4 + 2]));
      col[x] += e; row[y] += e;
    }
    const best = (arr, size) => {
      const n = arr.length, win = Math.max(1, Math.round(size));
      if (win >= n) return n / 2;
      let s = 0; for (let i = 0; i < win; i++) s += arr[i];
      let bs = s, bi = 0;
      for (let i = win; i < n; i++) { s += arr[i] - arr[i - win]; if (s > bs) { bs = s; bi = i - win + 1; } }
      return bi + win / 2;
    };
    cx = best(col, cw) / W; cy = best(row, ch) / H;
  }
  const x = Math.max(0, Math.min(1 - fw, cx - fw / 2)), y = Math.max(0, Math.min(1 - fh, cy - fh / 2));
  return { x, y, w: fw, h: fh };
}
/** Bounding box (normalised) of the pixels whose alpha is over 127, or null. */
export function alphaBox(img) {
  const { width: w, height: h, data: d } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h };
}

/* ---------- photo colours: change one of the photo's own colours (Edit > Adjust > Photo colours) ---------- */

// OKLab (Björn Ottosson's published maths): distances that follow how different two colours look.
const LIN = new Float32Array(256);
for (let v = 0; v < 256; v++) LIN[v] = s2l(v / 255);
function oklab(r, g, b, out) {
  const R = LIN[r | 0], G = LIN[g | 0], B = LIN[b | 0];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  out[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return out;
}
export const hexToOklab = (hex) => { const [r, g, b] = hexRgb(hex); return oklab(r, g, b, [0, 0, 0]); };
export const rgbHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
export function rgbToHsl(r, g, b, out = [0, 0, 0]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 1e-6) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6; if (h < 0) h += 1;
  }
  out[0] = h; out[1] = clamp01(s); out[2] = l;
  return out;
}
export function hslToRgb(h, s, l, out = [0, 0, 0]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (((h % 1) + 1) % 1) * 6, x = c * (1 - Math.abs((hp % 2) - 1)), m = l - c / 2;
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  out[0] = (r + m) * 255; out[1] = (g + m) * 255; out[2] = (b + m) * 255;
  return out;
}

/**
 * The photo's main colours (the colour boxes to pick from): k-means in OKLab on a sample of the opaque pixels,
 * look-alike colours merged, very small ones left out. Returns [{ hex, share }], the biggest first.
 */
export function photoPalette(img, n = 6) {
  const { data: d, width: w, height: h } = img, total = w * h;
  const step = Math.max(1, Math.floor(total / 6000));
  const pts = [], rgb = [], t = [0, 0, 0];
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (d[o + 3] < 128) continue;
    oklab(d[o], d[o + 1], d[o + 2], t);
    pts.push(t[0], t[1], t[2]); rgb.push(d[o], d[o + 1], d[o + 2]);
  }
  const m = pts.length / 3;
  if (!m) return [];
  const dist2 = (i, c) => { const a = pts[i * 3] - c[0], b = pts[i * 3 + 1] - c[1], e = pts[i * 3 + 2] - c[2]; return a * a + b * b + e * e; };
  // deterministic start: the sample nearest the mean, then each next centre is the sample farthest from all centres
  const mean = [0, 0, 0];
  for (let i = 0; i < m; i++) { mean[0] += pts[i * 3] / m; mean[1] += pts[i * 3 + 1] / m; mean[2] += pts[i * 3 + 2] / m; }
  let first = 0, fd0 = Infinity;
  for (let i = 0; i < m; i++) { const dd = dist2(i, mean); if (dd < fd0) { fd0 = dd; first = i; } }
  const C = [[pts[first * 3], pts[first * 3 + 1], pts[first * 3 + 2]]];
  const near = new Float64Array(m).fill(Infinity), k = Math.min(m, n + 3);
  while (C.length < k) {
    const c = C[C.length - 1];
    let fi = -1, fd = -1;
    for (let i = 0; i < m; i++) { const dd = dist2(i, c); if (dd < near[i]) near[i] = dd; if (near[i] > fd) { fd = near[i]; fi = i; } }
    if (fd < 1e-6) break;
    C.push([pts[fi * 3], pts[fi * 3 + 1], pts[fi * 3 + 2]]);
  }
  const lab = new Int32Array(m);
  for (let it = 0; it < 10; it++) {
    const S = C.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < m; i++) {
      let bi = 0, bd = Infinity;
      for (let j = 0; j < C.length; j++) { const dd = dist2(i, C[j]); if (dd < bd) { bd = dd; bi = j; } }
      lab[i] = bi;
      const s = S[bi]; s[0] += pts[i * 3]; s[1] += pts[i * 3 + 1]; s[2] += pts[i * 3 + 2]; s[3]++;
    }
    for (let j = 0; j < C.length; j++) if (S[j][3]) C[j] = [S[j][0] / S[j][3], S[j][1] / S[j][3], S[j][2] / S[j][3]];
  }
  const groups = C.map((c) => ({ c, n: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < m; i++) { const G = groups[lab[i]]; G.n++; G.r += rgb[i * 3]; G.g += rgb[i * 3 + 1]; G.b += rgb[i * 3 + 2]; }
  const out = [];
  for (const g of groups.filter((x) => x.n).sort((a, b) => b.n - a.n)) {
    const into = out.find((o) => Math.hypot(o.c[0] - g.c[0], o.c[1] - g.c[1], o.c[2] - g.c[2]) < 0.07);
    if (into) { into.n += g.n; into.r += g.r; into.g += g.g; into.b += g.b; } else out.push({ ...g });
  }
  return out.filter((g) => g.n / m >= 0.015).slice(0, n).map((g) => ({ hex: rgbHex(g.r / g.n, g.g / g.n, g.b / g.n), share: g.n / m }));
}
/** fx.colors: [{ hex, hue (-180..180 degrees), sat (-100..100), light (-100..100) }]; is any of them a change? */
export const hasPhotoColors = (fx) => !!(fx && Array.isArray(fx.colors) && fx.colors.some((c) => c && c.hex && (c.hue || c.sat || c.light)));
/**
 * Changes the pixels that look like each picked colour: turn its hue, make it more or less colourful, lighter or
 * darker. Pixels are matched in OKLab, so light and shaded parts of the same colour change together, with a soft
 * edge (no hard borders). Each change is measured against the photo's own colour, so picked colours don't chain.
 */
export function applyPhotoColors(img, colors) {
  const list = (colors || []).filter((c) => c && c.hex && (c.hue || c.sat || c.light)).map((c) => {
    const t = hexToOklab(c.hex), grey = Math.hypot(t[1], t[2]) < 0.04;
    return { t, wl: grey ? 1 : 0.3, r0: grey ? 0.045 : 0.06, r1: grey ? 0.11 : 0.15,
      hue: (c.hue || 0) / 360, sat: clamp((c.sat || 0) / 100, -1, 1), light: clamp((c.light || 0) / 100, -1, 1) };
  });
  if (!list.length) return img;
  const d = img.data, n = img.width * img.height, q = [0, 0, 0], hsl = [0, 0, 0], rgb = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2];
    oklab(r, g, b, q);
    let R = r, G = g, B = b, got = false;
    for (const c of list) {
      const dl = c.wl * (q[0] - c.t[0]), da = q[1] - c.t[1], db = q[2] - c.t[2];
      const dist = Math.sqrt(dl * dl + da * da + db * db);
      if (dist >= c.r1) continue;
      const wgt = 1 - smooth(c.r0, c.r1, dist);
      if (!got) { rgbToHsl(r, g, b, hsl); got = true; }
      const S = c.sat > 0 ? hsl[1] + (1 - hsl[1]) * c.sat : hsl[1] * (1 + c.sat);
      const L = c.light > 0 ? hsl[2] + (1 - hsl[2]) * c.light * 0.85 : hsl[2] * (1 + c.light * 0.85);
      hslToRgb(hsl[0] + c.hue, S, L, rgb);
      R += (rgb[0] - r) * wgt; G += (rgb[1] - g) * wgt; B += (rgb[2] - b) * wgt;
    }
    d[o] = R; d[o + 1] = G; d[o + 2] = B;
  }
  return img;
}

/* ---------- face retouch: smoother skin ---------- */

/** Soft skin likelihood 0..1 (YCbCr skin range, fading out over a few units outside it; very dark pixels are not skin). */
export function skinWeight(r, g, b) {
  if (0.299 * r + 0.587 * g + 0.114 * b < 35) return 0;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const out = Math.max(77 - cb, cb - 127, 133 - cr, cr - 173, 0);
  return clamp01(1 - out / 8);
}
/**
 * Face retouch, amount 0..100: on skin, the fine detail (texture, pores, small spots) is lowered while strong edges
 * (eyes, lips, hair, glasses) stay. The skin area is softened as one region, so spots inside it are smoothed too.
 * The smoothing size follows the picture size, so the preview and the full-size download match.
 */
export function retouchSkin(img, amount = 50) {
  const k = clamp01(amount / 100), { width: w, height: h, data: src } = img, n = w * h;
  const out = cloneImage(img);
  if (!(k > 0) || !n) return out;
  const W = new Float32Array(n);
  for (let i = 0; i < n; i++) { const o = i * 4; W[i] = src[o + 3] > 0 ? skinWeight(src[o], src[o + 1], src[o + 2]) : 0; }
  const Wb = gaussPlane(W, w, h, Math.max(1, Math.min(w, h) / 200));
  const sigma = Math.max(1.2, (Math.min(w, h) / 220) * (0.6 + k));
  const plane = new Float32Array(n), low = [];
  for (let c = 0; c < 3; c++) { for (let i = 0; i < n; i++) plane[i] = src[i * 4 + c]; low.push(gaussPlane(plane, w, h, sigma)); }
  for (let i = 0; i < n; i++) {
    const wt = Math.min(1, Math.max(W[i], Wb[i] * 1.25)) * k;
    if (wt < 0.01) continue;
    const o = i * 4, hr = src[o] - low[0][i], hg = src[o + 1] - low[1][i], hb = src[o + 2] - low[2][i];
    const f = wt * (1 - smooth(14, 34, (Math.abs(hr) + Math.abs(hg) + Math.abs(hb)) / 3)) * 0.92;
    out.data[o] = src[o] - hr * f; out.data[o + 1] = src[o + 1] - hg * f; out.data[o + 2] = src[o + 2] - hb * f;
  }
  return out;
}

/* ---------- blur and auto focus ---------- */

/**
 * Estimated depth 0 (near) .. 1 (far) for auto focus, from the subject's alpha (one byte per pixel or RGBA data,
 * w×h, or null): the subject is nearest; the background counts as further away the further it is from the subject
 * and the higher up it is in the picture. (No depth camera data is used: it is an estimate.)
 */
export function focusDepth(alpha, w, h) {
  const n = w * h, A = new Float32Array(n);
  if (alpha) { const rgba = alpha.length >= n * 4; for (let i = 0; i < n; i++) A[i] = (rgba ? alpha[i * 4 + 3] : alpha[i]) / 255; }
  const near = gaussPlane(A, w, h, Math.max(2, Math.max(w, h) * 0.12));
  let mx = 0;
  for (let i = 0; i < n; i++) if (near[i] > mx) mx = near[i];
  const out = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, up = 1 - y / Math.max(1, h - 1);
    const away = mx > 0 ? 1 - near[i] / mx : up;
    out[i] = (1 - A[i]) * (0.25 + 0.75 * clamp01(0.7 * away + 0.3 * up));
  }
  return out;
}
/** Blur weight per pixel (0 sharp .. 1 blurred) for a focus position 0..100 (0 = the subject stays sharp, 100 = the far background). */
export function focusWeights(depth, pos = 0) {
  const p = clamp01(pos / 100), out = new Float32Array(depth.length);
  for (let i = 0; i < depth.length; i++) out[i] = smooth(0.06, 0.42, Math.abs(depth[i] - p));
  return out;
}
/** sharp × (1 − w) + blurred × w per pixel (w: Float32Array 0..1, or an RGBA mask image whose alpha is the weight). */
export function mixByWeights(sharp, blurred, w) {
  const out = new Uint8ClampedArray(sharp.data.length), a = sharp.data, b = blurred.data, rgba = !(w instanceof Float32Array);
  for (let i = 0, p = 0; i < out.length; i += 4, p++) {
    const t = rgba ? w.data[i + 3] / 255 : w[p];
    out[i] = a[i] + (b[i] - a[i]) * t; out[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * t; out[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * t; out[i + 3] = a[i + 3];
  }
  return { data: out, width: sharp.width, height: sharp.height };
}

/* ---------- magic expand and pixel eraser ---------- */

/**
 * Space to add round a w×h photo so it becomes the target shape: a number (width / height) or { all: percent }
 * (that much bigger on every side). The photo stays in the middle. Returns { left, right, top, bottom, width, height }
 * or null when nothing needs adding or the result would be over maxPixels.
 */
export function expandPad(w, h, target, maxPixels = 36e6) {
  let W = w, H = h;
  if (typeof target === "number" && target > 0) { if (w / h < target - 1e-3) W = Math.round(h * target); else if (w / h > target + 1e-3) H = Math.round(w / target); }
  else if (target && target.all > 0) { const p = Math.min(200, target.all) / 100; W = Math.round(w * (1 + p)); H = Math.round(h * (1 + p)); }
  if (W === w && H === h) return null;
  if (W * H > maxPixels) return null;
  const left = Math.floor((W - w) / 2), top = Math.floor((H - h) / 2);
  return { left, right: W - w - left, top, bottom: H - h - top, width: W, height: H };
}
/** Pixel eraser: alpha × (1 − mask alpha); mask is an RGBA image of the same size (painted = erased). Changes img. */
export function applyEraseMask(img, mask) {
  const d = img.data, m = mask.data;
  for (let i = 3; i < d.length; i += 4) if (m[i]) d[i] = (d[i] * (255 - m[i])) / 255;
  return img;
}

/* ---------- perspective (keystone) ---------- */

/**
 * Width factor of row (or column) position t in 0..1 for a keystone amount k in -100..100: positive widens the top
 * (left), negative the bottom (right); the narrowest line stays 1, so the picture always fills its frame.
 */
export const keystoneFactor = (k, t) => 1 + (Math.abs(k) / 100) * 0.35 * (k > 0 ? 1 - t : t);

/* ---------- geometry: rotate, flip, straighten, crop ---------- */

export const CROP_PRESETS = [
  { id: "free", label: "Free", aspect: null },
  { id: "original", label: "Original", aspect: "original" },
  { id: "1:1", label: "1:1", aspect: 1 },
  { id: "4:5", label: "4:5", aspect: 4 / 5 },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
  { id: "9:16", label: "9:16", aspect: 9 / 16 },
  { id: "passport", label: "Passport 35×45 mm", aspect: 35 / 45 },
];
export const FULL_CROP = Object.freeze({ x: 0, y: 0, w: 1, h: 1 });
export const DEFAULT_GEOM = Object.freeze({ rot: 0, flipX: false, flipY: false, angle: 0, crop: FULL_CROP, aspect: "free" });

export const orientedSize = (w, h, rot = 0) => (((rot % 360) + 360) % 180 ? { w: h, h: w } : { w, h });
/** Zoom needed so an image turned by deg (straighten) still covers its own frame (no empty corners). */
export function coverScale(w, h, deg) {
  const t = (Math.abs(deg) * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return Math.max((w * c + h * s) / w, (w * s + h * c) / h);
}
// 2-D affine [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f (canvas setTransform order)
export const matMul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
export const matApply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
export const matInvert = (m) => { const det = m[0] * m[3] - m[1] * m[2]; return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det]; };
const T = (x, y) => [1, 0, 0, 1, x, y], S = (x, y = x) => [x, 0, 0, y, 0, 0];
const R = (deg) => { const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t); return [c, s, -s, c, 0, 0]; };

/**
 * Transform from source pixels (W×H) to output pixels: quarter turns, flips (as seen on screen),
 * straighten angle (with cover zoom) and the crop {x,y,w,h} (0..1 of the turned frame), scaled by k.
 * Returns { matrix, outW, outH, frameW, frameH } (frame = the turned picture before cropping).
 */
export function geometryMatrix(W, H, geom = DEFAULT_GEOM, k = 1) {
  const g = { ...DEFAULT_GEOM, ...geom };
  const fr = orientedSize(W, H, g.rot);
  const crop = g.crop || FULL_CROP;
  const s = g.angle ? coverScale(fr.w, fr.h, g.angle) : 1;
  let m = T(-W / 2, -H / 2);
  m = matMul(R(g.rot), m);
  m = matMul(S(g.flipX ? -1 : 1, g.flipY ? -1 : 1), m);
  if (g.angle) m = matMul(matMul(S(s), R(g.angle)), m);
  m = matMul(T(fr.w / 2 - crop.x * fr.w, fr.h / 2 - crop.y * fr.h), m);
  m = matMul(S(k), m);
  return { matrix: m, outW: Math.max(1, Math.round(crop.w * fr.w * k)), outH: Math.max(1, Math.round(crop.h * fr.h * k)), frameW: fr.w, frameH: fr.h };
}

/** Largest centred crop (0..1 of the frame) with the given aspect (w/h) inside a frameW×frameH picture. */
export function aspectCrop(frameW, frameH, aspect) {
  if (!aspect) return { ...FULL_CROP };
  const fa = frameW / frameH;
  if (aspect > fa) { const h = fa / aspect; return { x: 0, y: (1 - h) / 2, w: 1, h }; }
  const w = aspect / fa;
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

/** Keep a crop's centre and area roughly, but give it the aspect; stays inside the frame. */
export function fitCrop(crop, frameW, frameH, aspect) {
  if (!aspect) return clampCrop(crop);
  const cx = crop.x + crop.w / 2, cy = crop.y + crop.h / 2;
  const area = crop.w * frameW * crop.h * frameH;
  let pw = Math.sqrt(area * aspect), ph = pw / aspect;
  const s = Math.min(1, frameW / pw, frameH / ph);
  pw *= s; ph *= s;
  const w = pw / frameW, h = ph / frameH;
  return clampCrop({ x: cx - w / 2, y: cy - h / 2, w, h });
}
export function clampCrop(c) {
  const w = clamp(c.w, 0.01, 1), h = clamp(c.h, 0.01, 1);
  return { x: clamp(c.x, 0, 1 - w), y: clamp(c.y, 0, 1 - h), w, h };
}

/**
 * Drag a crop box handle ('move', 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw') by dx, dy (0..1 of the frame).
 * With an aspect (w/h in pixels) corner drags keep it; the box stays inside the frame and ≥ minPx.
 */
export function dragCrop(c, handle, dx, dy, frameW, frameH, aspect = null, minPx = 24) {
  const minW = Math.min(1, minPx / frameW), minH = Math.min(1, minPx / frameH);
  if (handle === "move") return { x: clamp(c.x + dx, 0, 1 - c.w), y: clamp(c.y + dy, 0, 1 - c.h), w: c.w, h: c.h };
  let x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h;
  if (handle.includes("w")) x0 = clamp(x0 + dx, 0, x1 - minW);
  if (handle.includes("e")) x1 = clamp(x1 + dx, x0 + minW, 1);
  if (handle.includes("n")) y0 = clamp(y0 + dy, 0, y1 - minH);
  if (handle.includes("s")) y1 = clamp(y1 + dy, y0 + minH, 1);
  if (aspect) {
    const r = aspect * (frameH / frameW); // aspect in 0..1 units
    let w = x1 - x0, h = y1 - y0;
    const horiz = handle === "e" || handle === "w", vert = handle === "n" || handle === "s";
    if (horiz) h = w / r; else if (vert) w = h * r; else if (w / h > r) w = h * r; else h = w / r;
    // keep the edge opposite the handle fixed, then shrink to fit the frame
    const ax = handle.includes("w") ? x1 : handle.includes("e") ? x0 : (x0 + x1) / 2;
    const ay = handle.includes("n") ? y1 : handle.includes("s") ? y0 : (y0 + y1) / 2;
    const maxW = handle.includes("w") ? ax : handle.includes("e") ? 1 - ax : 2 * Math.min(ax, 1 - ax);
    const maxH = handle.includes("n") ? ay : handle.includes("s") ? 1 - ay : 2 * Math.min(ay, 1 - ay);
    const s = Math.min(1, maxW / w, maxH / h);
    w *= s; h *= s;
    x0 = handle.includes("w") ? ax - w : handle.includes("e") ? ax : ax - w / 2;
    y0 = handle.includes("n") ? ay - h : handle.includes("s") ? ay : ay - h / 2;
    return { x: x0, y: y0, w, h };
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Crop after a quarter turn: the same picture area, expressed in the new frame. */
export function rotateCrop(c, dir) {
  return dir > 0 ? { x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w } : { x: c.y, y: 1 - c.x - c.w, w: c.h, h: c.w };
}
export const flipCrop = (c, axis) => (axis === "x" ? { ...c, x: 1 - c.x - c.w } : { ...c, y: 1 - c.y - c.h });

/* ---------- export sizes and the passport sheet ---------- */

export const EXPORT_SIZES = [
  { id: "original", label: "Original" },
  { id: "2048", label: "2048 px", long: 2048 },
  { id: "1080", label: "1080 px", long: 1080 },
  { id: "custom", label: "Custom" },
];
/** Output size for an export option: long side (2048/1080), custom width (height follows), or original. */
export function exportDims(w, h, size = "original", customW = 0) {
  if (size === "custom" && customW > 0) { const W = Math.round(clamp(customW, 16, 12000)); return { w: W, h: Math.max(1, Math.round((h * W) / w)) }; }
  const opt = EXPORT_SIZES.find((s) => s.id === String(size));
  if (!opt || !opt.long) return { w, h };
  const s = opt.long / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

export const mmToPx = (mm, dpi = 300) => Math.round((mm / 25.4) * dpi);
/**
 * A 4×6 in sheet with `count` passport photos (35×45 mm) in a centred grid with cutting gaps.
 * Returns { width, height, dpi, photo: {w, h}, rects: [{x, y, w, h}] } in pixels.
 */
export function passportSheet({ sheetW = 4, sheetH = 6, photoWmm = 35, photoHmm = 45, dpi = 300, count = 6, gapMm = 4 } = {}) {
  const width = Math.round(sheetW * dpi), height = Math.round(sheetH * dpi);
  const pw = mmToPx(photoWmm, dpi), ph = mmToPx(photoHmm, dpi), gap = mmToPx(gapMm, dpi);
  let cols = Math.max(1, Math.floor((width + gap) / (pw + gap)));
  let rows = Math.ceil(count / cols);
  while (rows * ph + (rows - 1) * gap > height && cols > 1) { cols--; rows = Math.ceil(count / cols); }
  const gw = cols * pw + (cols - 1) * gap, gh = rows * ph + (rows - 1) * gap;
  const x0 = Math.round((width - gw) / 2), y0 = Math.round((height - gh) / 2);
  const rects = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    rects.push({ x: x0 + c * (pw + gap), y: y0 + r * (ph + gap), w: pw, h: ph });
  }
  return { width, height, dpi, photo: { w: pw, h: ph }, rects, cols, rows };
}

/** Source rectangle to cover-fit a sw×sh picture into a dw×dh box (centred). */
export function coverRect(sw, sh, dw, dh) {
  const s = Math.max(dw / sw, dh / sh);
  const w = dw / s, h = dh / s;
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}
