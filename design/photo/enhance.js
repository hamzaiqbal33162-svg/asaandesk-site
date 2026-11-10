// Image enhancer maths (no DOM; runs in a Web Worker and in Node tests).
//   Upscale: Lanczos-3, separable, processed in bands of output rows so big pictures don't need one huge
//            temporary buffer; premultiplied alpha so transparent edges don't get dark halos.
//   Denoise: edge-keeping bilateral filter, strength tuned from the measured noise level (Immerkær).
//   Sharpen: unsharp mask on brightness only, softer on skin tones ("face-safe").
//   Auto colour / auto contrast: per-channel and brightness histogram stretch + gentle grey-world balance.
import { gaussPlane } from "./adjust.js";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const LIMITS = Object.freeze({ maxSide: 8192, maxPixels: 36e6 });
export const DEFAULTS = Object.freeze({ scale: 2, denoise: 25, sharpen: 35, autoColor: true, autoContrast: true, faceSafe: true });

/** Largest upscale factor ≤ want that keeps the result within LIMITS. */
export function safeScale(w, h, want, { maxSide = LIMITS.maxSide, maxPixels = LIMITS.maxPixels } = {}) {
  const s = Math.min(want, maxSide / Math.max(w, h), Math.sqrt(maxPixels / (w * h)));
  return Math.max(1, Math.floor(s * 100) / 100);
}

/* ---------- resampling ---------- */

export function lanczos(x, a = 3) {
  if (x === 0) return 1;
  if (x <= -a || x >= a) return 0;
  const px = Math.PI * x;
  return (a * Math.sin(px) * Math.sin(px / a)) / (px * px);
}

// 1-D taps mapping n source samples onto m (pixel centres aligned). Widened when shrinking (anti-alias).
function taps(n, m, a) {
  const scale = m / n, fs = Math.min(1, scale), support = a / fs;
  const maxT = Math.ceil(support) * 2 + 1;
  const idx = new Int32Array(m * maxT), wts = new Float32Array(m * maxT), cnt = new Int32Array(m);
  for (let i = 0; i < m; i++) {
    const c = (i + 0.5) / scale - 0.5;
    const lo = Math.ceil(c - support), hi = Math.floor(c + support);
    let sum = 0, k = 0;
    for (let j = lo; j <= hi && k < maxT; j++) {
      const w = lanczos((j - c) * fs, a);
      if (w === 0) continue;
      idx[i * maxT + k] = clamp(j, 0, n - 1);
      wts[i * maxT + k] = w;
      sum += w; k++;
    }
    for (let t = 0; t < k; t++) wts[i * maxT + t] /= sum;
    cnt[i] = k;
  }
  return { idx, wts, cnt, maxT };
}

/**
 * Lanczos resize of an RGBA image to dw×dh. Works through the output in bands of rows (opts.band) and
 * reports progress (0..1) after each band through opts.onProgress.
 */
export function resizeLanczos(img, dw, dh, { a = 3, band = 0, onProgress } = {}) {
  const { width: sw, height: sh, data: src } = img;
  dw = Math.max(1, Math.round(dw)); dh = Math.max(1, Math.round(dh));
  let alpha = false;
  for (let i = 3; i < src.length; i += 4) if (src[i] !== 255) { alpha = true; break; }
  const tx = taps(sw, dw, a), ty = taps(sh, dh, a);
  const out = new Uint8ClampedArray(dw * dh * 4);
  const B = band || Math.max(16, Math.min(256, Math.floor(2e6 / (dw * 4))));
  const rowCache = new Map(); // source row -> horizontally resampled Float32Array(dw*4)
  const hRow = (y) => {
    let r = rowCache.get(y);
    if (r) return r;
    r = new Float32Array(dw * 4);
    const row = y * sw * 4;
    for (let i = 0; i < dw; i++) {
      let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
      const base = i * tx.maxT;
      for (let t = 0; t < tx.cnt[i]; t++) {
        const p = row + tx.idx[base + t] * 4, w = tx.wts[base + t];
        if (alpha) { const al = src[p + 3] * w; s0 += src[p] * al; s1 += src[p + 1] * al; s2 += src[p + 2] * al; s3 += al; }
        else { s0 += src[p] * w; s1 += src[p + 1] * w; s2 += src[p + 2] * w; }
      }
      const o = i * 4;
      r[o] = s0; r[o + 1] = s1; r[o + 2] = s2; r[o + 3] = alpha ? s3 : 255;
    }
    rowCache.set(y, r);
    return r;
  };
  for (let y0 = 0; y0 < dh; y0 += B) {
    const y1 = Math.min(dh, y0 + B);
    let need = Infinity;
    for (let y = y0; y < y1; y++) for (let t = 0; t < ty.cnt[y]; t++) need = Math.min(need, ty.idx[y * ty.maxT + t]);
    for (const k of rowCache.keys()) if (k < need) rowCache.delete(k); // rows above this band are done
    for (let y = y0; y < y1; y++) {
      const base = y * ty.maxT, o0 = y * dw * 4;
      const acc = new Float32Array(dw * 4);
      for (let t = 0; t < ty.cnt[y]; t++) {
        const r = hRow(ty.idx[base + t]), w = ty.wts[base + t];
        for (let i = 0; i < acc.length; i++) acc[i] += r[i] * w;
      }
      for (let i = 0; i < dw; i++) {
        const o = i * 4;
        if (alpha) {
          const al = acc[o + 3];
          if (al <= 0.5) { out[o0 + o + 3] = 0; continue; }
          out[o0 + o] = acc[o] / al; out[o0 + o + 1] = acc[o + 1] / al; out[o0 + o + 2] = acc[o + 2] / al; out[o0 + o + 3] = al;
        } else { out[o0 + o] = acc[o]; out[o0 + o + 1] = acc[o + 1]; out[o0 + o + 2] = acc[o + 2]; out[o0 + o + 3] = 255; }
      }
    }
    if (onProgress) onProgress(y1 / dh);
  }
  return { data: out, width: dw, height: dh };
}

export function resizeNearest(img, dw, dh) {
  const { width: sw, height: sh, data: src } = img, out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(((y + 0.5) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(((x + 0.5) * sw) / dw));
      const s = (sy * sw + sx) * 4, o = (y * dw + x) * 4;
      out[o] = src[s]; out[o + 1] = src[s + 1]; out[o + 2] = src[s + 2]; out[o + 3] = src[s + 3];
    }
  }
  return { data: out, width: dw, height: dh };
}

export function resizeBilinear(img, dw, dh) {
  const { width: sw, height: sh, data: src } = img, out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const fy = clamp(((y + 0.5) * sh) / dh - 0.5, 0, sh - 1), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ay = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = clamp(((x + 0.5) * sw) / dw - 0.5, 0, sw - 1), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), ax = fx - x0;
      const a = (y0 * sw + x0) * 4, b = (y0 * sw + x1) * 4, c = (y1 * sw + x0) * 4, d = (y1 * sw + x1) * 4, o = (y * dw + x) * 4;
      for (let k = 0; k < 4; k++) out[o + k] = (src[a + k] * (1 - ax) + src[b + k] * ax) * (1 - ay) + (src[c + k] * (1 - ax) + src[d + k] * ax) * ay;
    }
  }
  return { data: out, width: dw, height: dh };
}

/* ---------- noise ---------- */

/** Noise level (standard deviation, 0..255 units) of the brightness, Immerkær's fast estimate. */
export function estimateNoise(img) {
  const { width: w, height: h, data: d } = img;
  if (w < 3 || h < 3) return 0;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  let s = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const v = L[i - w - 1] - 2 * L[i - w] + L[i - w + 1] - 2 * L[i - 1] + 4 * L[i] - 2 * L[i + 1] + L[i + w - 1] - 2 * L[i + w] + L[i + w + 1];
    s += Math.abs(v);
  }
  return (s * Math.sqrt(Math.PI / 2)) / (6 * (w - 2) * (h - 2));
}

/** Edge-keeping bilateral filter. sigmaR in 0..255 colour units (mean per-channel difference). */
export function bilateral(img, { radius = 2, sigmaS = 1.6, sigmaR = 20 } = {}) {
  const { width: w, height: h, data: src } = img, out = new Uint8ClampedArray(src.length);
  const sw = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const ws = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaS * sigmaS));
    if (ws > 0.01) sw.push([dx, dy, ws]);
  }
  const rl = new Float32Array(766);
  for (let d = 0; d < 766; d++) { const m = d / 3; rl[d] = Math.exp(-(m * m) / (2 * sigmaR * sigmaR)); }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, r0 = src[o], g0 = src[o + 1], b0 = src[o + 2];
      let sr = 0, sg = 0, sb = 0, sw0 = 0;
      for (let k = 0; k < sw.length; k++) {
        const t = sw[k], xx = clamp(x + t[0], 0, w - 1), yy = clamp(y + t[1], 0, h - 1), p = (yy * w + xx) * 4;
        const r = src[p], g = src[p + 1], b = src[p + 2];
        const wt = t[2] * rl[Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0)];
        sr += r * wt; sg += g * wt; sb += b * wt; sw0 += wt;
      }
      out[o] = sr / sw0; out[o + 1] = sg / sw0; out[o + 2] = sb / sw0; out[o + 3] = src[o + 3];
    }
  }
  return { data: out, width: w, height: h };
}

/** 3×3 median per channel (removes speckles). */
export function median3(img) {
  const { width: w, height: h, data: src } = img, out = new Uint8ClampedArray(src.length), v = new Uint8Array(9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v[k++] = src[(clamp(y + dy, 0, h - 1) * w + clamp(x + dx, 0, w - 1)) * 4 + c];
      v.sort();
      out[o + c] = v[4];
    }
    out[o + 3] = src[o + 3];
  }
  return { data: out, width: w, height: h };
}

/** Denoise with strength 0..100; the filter follows the measured noise so clean photos stay crisp. */
export function denoise(img, strength = 25) {
  if (!(strength > 0)) return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height };
  const sigma = estimateNoise(img);
  const k = strength / 50;
  const sigmaR = clamp(Math.max(sigma * 2.4, 6) * k, 3, 60);
  let out = bilateral(img, { radius: strength > 60 ? 3 : 2, sigmaS: strength > 60 ? 2 : 1.5, sigmaR });
  if (strength > 80) out = bilateral(out, { radius: 2, sigmaS: 1.5, sigmaR: sigmaR * 0.7 });
  return out;
}

/* ---------- sharpening ---------- */

// Skin-tone test in YCbCr (common range used for face detection).
export function isSkin(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/** Unsharp mask on brightness. amount ~0..2, sigma in px, threshold in 0..255; faceSafe softens skin. */
export function unsharp(img, { amount = 0.6, sigma = 1, threshold = 2, faceSafe = true } = {}) {
  const { width: w, height: h, data: src } = img, n = w * h, out = new Uint8ClampedArray(src);
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = luma(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]);
  const bl = gaussPlane(L, w, h, sigma);
  for (let i = 0; i < n; i++) {
    let d = L[i] - bl[i];
    const ad = Math.abs(d);
    if (ad < threshold * 1.5) d *= smooth(threshold * 0.5, threshold * 1.5, ad);
    const o = i * 4;
    const wgt = faceSafe && isSkin(src[o], src[o + 1], src[o + 2]) ? 0.45 : 1;
    const v = clamp(d * amount * wgt, -48, 48);
    out[o] = src[o] + v; out[o + 1] = src[o + 1] + v; out[o + 2] = src[o + 2] + v;
  }
  return { data: out, width: w, height: h };
}

/* ---------- auto colour / contrast ---------- */

function percentiles(hist, total, lo, hi) {
  let a = 0, b = 255, s = 0;
  for (let v = 0; v < 256; v++) { s += hist[v]; if (s > total * lo) { a = v; break; } }
  s = 0;
  for (let v = 255; v >= 0; v--) { s += hist[v]; if (s > total * (1 - hi)) { b = v; break; } }
  return [a, b];
}

/** Stretch the brightness histogram (0.5% clipped each end) to the full range; colours keep their hue. */
export function autoContrast(img, { clip = 0.005, strength = 1, maxGain = 3.5 } = {}) {
  const { data: src } = img, n = img.width * img.height, out = new Uint8ClampedArray(src);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[Math.round(luma(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]))]++;
  let [lo, hi] = percentiles(hist, n, clip, 1 - clip);
  if (hi - lo < 8) return { data: out, width: img.width, height: img.height };
  const gain = Math.min(maxGain, 255 / (hi - lo));
  const mid = (lo + hi) / 2;
  for (let i = 0; i < n * 4; i++) {
    if ((i & 3) === 3) continue;
    const v = (src[i] - mid) * gain + 127.5;
    out[i] = src[i] + (v - src[i]) * strength;
  }
  return { data: out, width: img.width, height: img.height };
}

/** White balance + per-channel levels: removes colour casts (each channel stretched, then grey-world nudge). */
export function autoColor(img, { clip = 0.005, strength = 0.7 } = {}) {
  const { data: src } = img, n = img.width * img.height, out = new Uint8ClampedArray(src);
  const hists = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) hists[c][src[i * 4 + c]]++;
  const lv = hists.map((hh) => percentiles(hh, n, clip, 1 - clip));
  // the channels share one target range so the brightest/darkest colours become neutral
  const tLo = Math.min(...lv.map((l) => l[0])), tHi = Math.max(...lv.map((l) => l[1]));
  const luts = lv.map(([lo, hi]) => {
    const lut = new Float32Array(256);
    for (let v = 0; v < 256; v++) lut[v] = hi - lo < 8 ? v : tLo + ((v - lo) * (tHi - tLo)) / (hi - lo);
    return lut;
  });
  const mean = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) mean[c] += luts[c][src[i * 4 + c]];
  const m = (mean[0] + mean[1] + mean[2]) / 3;
  const gain = mean.map((v) => clamp(m / Math.max(1, v), 0.88, 1.12));
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) {
    const o = i * 4 + c, v = clamp(luts[c][src[o]] * gain[c], 0, 255);
    out[o] = src[o] + (v - src[o]) * strength;
  }
  return { data: out, width: img.width, height: img.height };
}

/* ---------- the whole enhancer ---------- */

/**
 * opts: { scale (1|2|4…), denoise 0..100, sharpen 0..100, autoColor, autoContrast, faceSafe }.
 * onProgress({ step, done }) with done 0..1 for the whole job.
 */
export function enhance(img, opts = {}, onProgress = null) {
  const o = { ...DEFAULTS, ...opts };
  const report = (step, done) => { if (onProgress) onProgress({ step, done: Math.min(1, done) }); };
  let cur = img;
  report("Balancing colours…", 0.02);
  if (o.autoColor) cur = autoColor(cur);
  if (o.autoContrast) cur = autoContrast(cur, { strength: 0.85 });
  report("Cleaning noise…", 0.08);
  if (o.denoise > 0) cur = denoise(cur, o.denoise);
  const scale = safeScale(cur.width, cur.height, o.scale || 1);
  if (scale > 1) {
    report("Upscaling…", 0.3);
    cur = resizeLanczos(cur, Math.round(cur.width * scale), Math.round(cur.height * scale), { onProgress: (p) => report("Upscaling…", 0.3 + 0.55 * p) });
  }
  if (o.sharpen > 0) {
    report("Sharpening…", 0.86);
    cur = unsharp(cur, { amount: (o.sharpen / 100) * 1.3, sigma: 0.6 + 0.35 * scale, threshold: 2, faceSafe: o.faceSafe });
  }
  if (cur === img) cur = { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height };
  report("Done", 1);
  return { ...cur, scale };
}

/* ---------- quality measures (used by the tests and the e2e check) ---------- */

/** Mean squared brightness gradient (Tenengrad); higher = crisper. */
export function sharpness(img) {
  const { width: w, height: h, data: d } = img;
  let s = 0;
  const L = (x, y) => { const i = (y * w + x) * 4; return luma(d[i], d[i + 1], d[i + 2]); };
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const gx = L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1);
    const gy = L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1);
    s += gx * gx + gy * gy;
  }
  return s / ((w - 2) * (h - 2));
}

/** Peak signal-to-noise ratio (dB) between two same-size images, colour channels only. */
export function psnr(a, b) {
  let s = 0, n = 0;
  for (let i = 0; i < a.data.length; i++) { if ((i & 3) === 3) continue; const d = a.data[i] - b.data[i]; s += d * d; n++; }
  return s === 0 ? Infinity : 10 * Math.log10((255 * 255) / (s / n));
}

/** Width in px of a dark→light step along row y between x0 and x1 (10%..90% rise); smaller = sharper. */
export function edgeRise(img, y, x0, x1) {
  const { width: w, data: d } = img;
  const v = [];
  for (let x = x0; x <= x1; x++) { const i = (y * w + x) * 4; v.push(luma(d[i], d[i + 1], d[i + 2])); }
  const lo = Math.min(...v), hi = Math.max(...v);
  const at = (f) => { const t = lo + (hi - lo) * f; for (let i = 1; i < v.length; i++) if (v[i] >= t && v[i - 1] < t) return i - 1 + (t - v[i - 1]) / (v[i] - v[i - 1]); return NaN; };
  return at(0.9) - at(0.1);
}
