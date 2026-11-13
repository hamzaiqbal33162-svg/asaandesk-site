// Canvas helpers for the photo editor (browser only): decoding files (HEIC too), scaling, overlays
// (text, stickers, shapes), frames and cut-out backgrounds.
import { FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { borderPad, overlayBox, shadowPad, shadowMetrics, SHAPE_FRAMES } from "./doc.js";
import { gaussPlane, keystoneFactor } from "./adjust.js";

// iPhones and iPads cannot draw canvases over about 16.7 megapixels.
const IOS = typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
export const PIXEL_LIMIT = IOS ? 16e6 : 36e6;
export const MAX_WORK_SIDE = 6000, MAX_WORK_PIXELS = PIXEL_LIMIT;

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
export const ctxOf = (c) => c.getContext("2d", { willReadFrequently: true });
export const getData = (c) => ctxOf(c).getImageData(0, 0, c.width, c.height);
export function fromData(img) {
  const c = makeCanvas(img.width, img.height);
  const data = img.data instanceof Uint8ClampedArray ? img.data : new Uint8ClampedArray(img.data);
  c.getContext("2d").putImageData(new ImageData(data, img.width, img.height), 0, 0);
  return c;
}
/** Good-quality downscale (halving steps) so the long side is ≤ maxSide. Returns the source if small. */
export function scaleDown(src, maxSide) {
  const w = src.width, h = src.height, s = maxSide / Math.max(w, h);
  if (s >= 1) return src;
  const tw = Math.max(1, Math.round(w * s)), th = Math.max(1, Math.round(h * s));
  let cur = src, cw = w, ch = h;
  // halve while the half is still at least the target size, then one final smooth step
  while (Math.round(cw / 2) >= tw && Math.round(ch / 2) >= th) {
    cw = Math.max(1, Math.round(cw / 2)); ch = Math.max(1, Math.round(ch / 2));
    const n = makeCanvas(cw, ch), x = n.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(cur, 0, 0, cw, ch);
    cur = n;
  }
  if (cur.width === tw && cur.height === th) return cur;
  const out = makeCanvas(tw, th), x = out.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}
/** Exact w×h copy (smooth; big reductions go through halving steps first). */
export function resizeTo(src, w, h) {
  if (src.width === w && src.height === h) return src;
  const r = Math.max(src.width / w, src.height / h);
  const ds = r > 2 ? scaleDown(src, (Math.max(src.width, src.height) / r) * 1.5) : src;
  const out = makeCanvas(w, h), x = out.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(ds, 0, 0, w, h);
  return out;
}
export const toBlob = (c, type = "image/png", q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("The browser could not save this picture."))), type, q));

/* ---------- opening files ---------- */

export function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error("Could not load a part of the editor. Please check your connection."));
    document.head.append(s);
  });
}
export async function isHeic(file) {
  if (/^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "")) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const brand = String.fromCharCode(...head.slice(4, 12));
    return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brand);
  } catch { return false; }
}
async function bitmapToCanvas(blob, { maxSide = MAX_WORK_SIDE, maxPixels = MAX_WORK_PIXELS } = {}) {
  let bmp = null;
  try { bmp = await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch { /* fall back to <img> */ }
  if (!bmp) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      bmp = img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  if (!(w > 0 && h > 0)) throw new Error("This picture is empty.");
  const s = Math.min(1, maxSide / Math.max(w, h), Math.sqrt(maxPixels / (w * h)));
  const c = makeCanvas(w * s, h * s), x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return { canvas: c, scaled: s < 1, origW: w, origH: h };
}
/** File/Blob (JPG, PNG, WebP, HEIC…) → { canvas, scaled, origW, origH, blob } (blob = what to keep for autosave). */
export async function decodeFile(file, onStatus, limits = {}) {
  if (await isHeic(file)) {
    try { const r = await bitmapToCanvas(file, limits); return { ...r, blob: file }; } catch { /* this browser can't read HEIC itself */ }
    onStatus?.("Converting the HEIC photo…");
    if (!window.heic2any) await loadScript(new URL("./lib/heic2any.min.js", import.meta.url).href);
    let out;
    try { out = await window.heic2any({ blob: file, toType: "image/png" }); } catch { throw new Error("This HEIC photo could not be read. Please try another photo."); }
    const png = Array.isArray(out) ? out[0] : out;
    const r = await bitmapToCanvas(png, limits);
    return { ...r, blob: png };
  }
  if (file.type && !/^image\//.test(file.type)) throw new Error("Please choose a photo (JPG, PNG, WebP or HEIC).");
  try { const r = await bitmapToCanvas(file, limits); return { ...r, blob: file }; } catch (e) { throw new Error(e.message === "This picture is empty." ? e.message : "This file could not be opened as a photo."); }
}

/* ---------- cut-out backgrounds ---------- */

/** Blurred copy of a picture (fast: blur a small copy, then scale it back up). strength 0..100. */
export function blurredCopy(src, strength) {
  const small = scaleDown(src, 360);
  const d = getData(small), n = small.width * small.height, plane = new Float32Array(n);
  const sigma = 0.6 + (strength / 100) * 14;
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < n; i++) plane[i] = d.data[i * 4 + c];
    const b = gaussPlane(plane, small.width, small.height, sigma);
    for (let i = 0; i < n; i++) d.data[i * 4 + c] = b[i];
  }
  for (let i = 0; i < n; i++) d.data[i * 4 + 3] = 255;
  const bs = fromData(d), out = makeCanvas(src.width, src.height), x = out.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(bs, 0, 0, out.width, out.height);
  return out;
}
/** The cut-out's silhouette in one colour (for shadows and sticker outlines). */
function silhouette(cutout, color) {
  const c = makeCanvas(cutout.width, cutout.height), x = c.getContext("2d");
  x.drawImage(cutout, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
/**
 * The subject (cut-out) over the chosen background, at the cut-out's size. bg.shadow = { on, blur, dist, angle, color,
 * alpha } adds a drop shadow under the subject; bg.outline = { on, width, color } a sticker outline round it.
 * Sizes are % of the picture's long side / 10, so the preview and the full-size export look the same.
 */
export function composeBackground(original, cutout, bg, bgImage) {
  const W = cutout.width, H = cutout.height, unit = Math.max(W, H) / 1000;
  const out = makeCanvas(W, H), x = out.getContext("2d");
  if (bg.mode === "color") { x.fillStyle = bg.color || "#ffffff"; x.fillRect(0, 0, W, H); }
  else if (bg.mode === "blur") x.drawImage(blurredCopy(original, bg.blur ?? 40), 0, 0, W, H);
  else if (bg.mode === "image" && bgImage) {
    const s = Math.max(W / bgImage.width, H / bgImage.height), w = W / s, h = H / s;
    x.imageSmoothingQuality = "high";
    x.drawImage(bgImage, (bgImage.width - w) / 2, (bgImage.height - h) / 2, w, h, 0, 0, W, H);
  }
  let subject = cutout;
  if (bg.outline?.on && bg.outline.width > 0) {
    const r = bg.outline.width * unit * 2, sil = silhouette(cutout, bg.outline.color || "#ffffff");
    const c = makeCanvas(W, H), cx = c.getContext("2d"), steps = Math.max(12, Math.min(48, Math.round(r * 1.5)));
    for (let i = 0; i < steps; i++) { const a = (i / steps) * Math.PI * 2; cx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
    cx.drawImage(cutout, 0, 0);
    subject = c;
  }
  if (bg.shadow?.on) {
    const s = bg.shadow, a = ((s.angle ?? 45) * Math.PI) / 180, dist = (s.dist ?? 12) * unit * 2;
    const sil = silhouette(subject, s.color || "#000000");
    x.save();
    x.globalAlpha = Math.max(0, Math.min(1, (s.alpha ?? 45) / 100));
    if ("filter" in x) x.filter = `blur(${Math.max(0, (s.blur ?? 20) * unit * 0.8)}px)`;
    x.drawImage(sil, Math.cos(a) * dist, Math.sin(a) * dist);
    x.restore();
  }
  x.drawImage(subject, 0, 0, W, H);
  return out;
}

/* ---------- perspective (keystone): rows / columns drawn wider towards one side ---------- */
export function keystone(src, persp) {
  const kv = persp?.v || 0, kh = persp?.h || 0;
  if (!kv && !kh) return src;
  let cur = src;
  const W = src.width, H = src.height;
  if (kv) {
    const c = makeCanvas(W, H), x = c.getContext("2d");
    for (let y = 0; y < H; y++) { const f = keystoneFactor(kv, (y + 0.5) / H), w = W * f; x.drawImage(cur, 0, y, W, 1, (W - w) / 2, y, w, 1); }
    cur = c;
  }
  if (kh) {
    const c = makeCanvas(W, H), x = c.getContext("2d");
    for (let xx = 0; xx < W; xx++) { const f = keystoneFactor(kh, (xx + 0.5) / W), h = H * f; x.drawImage(cur, xx, 0, 1, H, xx, (H - h) / 2, 1, h); }
    cur = c;
  }
  return cur;
}

/* ---------- overlays ---------- */

export const fontCss = (family) => (FONT_FAMILIES[family] || FONT_FAMILIES.sans).css;
export const preloadFont = (o) => ensureFont(o.family || "sans", !!o.bold, !!o.italic);

let elementsMod = null;
export async function elementsLib() {
  elementsMod ||= import("/pdf-editor/elements.js");
  return elementsMod;
}
const stickerCache = new Map();
/** Loads (and caches) the picture of a sticker in its colours. */
export async function stickerImage(o) {
  const key = o.elId + JSON.stringify(o.colors || {});
  if (stickerCache.has(key)) return stickerCache.get(key);
  const p = (async () => {
    const E = await elementsLib();
    const el = E.ELEMENTS.find((e) => e.id === o.elId);
    if (!el) throw new Error("Sticker not found");
    const svg = E.elementSvg(el, o.colors || {}, 512);
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    return img;
  })();
  stickerCache.set(key, p);
  p.catch(() => stickerCache.delete(key));
  return p;
}
export const stickerReady = (o) => stickerCache.get(o.elId + JSON.stringify(o.colors || {}));

function roundRect(x, X, Y, W, H, r) {
  r = Math.max(0, Math.min(r, W / 2, H / 2));
  x.beginPath();
  x.moveTo(X + r, Y); x.lineTo(X + W - r, Y); x.arcTo(X + W, Y, X + W, Y + r, r);
  x.lineTo(X + W, Y + H - r); x.arcTo(X + W, Y + H, X + W - r, Y + H, r);
  x.lineTo(X + r, Y + H); x.arcTo(X, Y + H, X, Y + H - r, r);
  x.lineTo(X, Y + r); x.arcTo(X, Y, X + r, Y, r);
  x.closePath();
}
function shapePath(x, kind, w, h) {
  const hw = w / 2, hh = h / 2;
  x.beginPath();
  switch (kind) {
    case "ellipse": x.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2); break;
    case "rounded": roundRect(x, -hw, -hh, w, h, Math.min(w, h) * 0.18); break;
    case "triangle": x.moveTo(0, -hh); x.lineTo(hw, hh); x.lineTo(-hw, hh); x.closePath(); break;
    case "line": x.moveTo(-hw, 0); x.lineTo(hw, 0); break;
    case "arrow": {
      const t = Math.min(h * 0.5, w * 0.35), sh = h * 0.18;
      x.moveTo(-hw, -sh); x.lineTo(hw - t, -sh); x.lineTo(hw - t, -hh); x.lineTo(hw, 0); x.lineTo(hw - t, hh); x.lineTo(hw - t, sh); x.lineTo(-hw, sh); x.closePath();
      break;
    }
    case "star": {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.45 : 1;
        const px = Math.cos(a) * hw * r, py = Math.sin(a) * hh * r + hh * 0.1;
        if (i) x.lineTo(px, py); else x.moveTo(px, py);
      }
      x.closePath();
      break;
    }
    case "heart":
      x.moveTo(0, hh);
      x.bezierCurveTo(-hw * 1.1, hh * 0.1, -hw * 0.9, -hh * 1.05, 0, -hh * 0.45);
      x.bezierCurveTo(hw * 0.9, -hh * 1.05, hw * 1.1, hh * 0.1, 0, hh);
      x.closePath();
      break;
    default: x.rect(-hw, -hh, w, h);
  }
}

/** Text lines and their size in px for a text overlay in a W×H picture (used for drawing and hit tests). */
export function measureText(x, o, W, H) {
  const size = Math.max(4, o.size * H);
  x.font = `${o.italic ? "italic " : ""}${o.bold ? 700 : 400} ${size}px ${fontCss(o.family)}`;
  const lines = String(o.text || " ").split("\n");
  const widths = lines.map((l) => x.measureText(l || " ").width);
  const lh = size * 1.2, pad = o.bg ? size * 0.35 : o.outline ? size * 0.08 : 0;
  return { size, lines, widths, lh, w: Math.max(...widths) + pad * 2, h: lh * lines.length + pad * 2, pad };
}

/** Draws one overlay on a W×H picture. Text overlays get their measured w/h written back (0..1). */
export function drawOverlay(x, o, W, H) {
  if (o.hidden) return;
  x.save();
  x.globalAlpha = o.opacity ?? 1;
  const b = overlayBox(o, W, H);
  x.translate(b.cx, b.cy);
  x.rotate(((b.rot || 0) * Math.PI) / 180);
  if (o.type === "text") {
    const m = measureText(x, o, W, H);
    o.w = m.w / W; o.h = m.h / H;
    if (o.bg) { x.fillStyle = o.bg; roundRect(x, -m.w / 2, -m.h / 2, m.w, m.h, m.size * 0.25); x.fill(); }
    x.textBaseline = "middle";
    x.textAlign = o.align === "left" ? "left" : o.align === "right" ? "right" : "center";
    const ax = o.align === "left" ? -m.w / 2 + m.pad : o.align === "right" ? m.w / 2 - m.pad : 0;
    m.lines.forEach((line, i) => {
      const y = -m.h / 2 + m.pad + m.lh * (i + 0.5);
      if (o.outline) { x.lineJoin = "round"; x.lineWidth = m.size * 0.14; x.strokeStyle = o.outline; x.strokeText(line, ax, y); }
      if (o.shadow) { x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = m.size * 0.18; x.shadowOffsetY = m.size * 0.05; }
      x.fillStyle = o.color || "#ffffff";
      x.fillText(line, ax, y);
      x.shadowColor = "transparent";
    });
  } else if (o.type === "shape") {
    shapePath(x, o.shape, b.w, b.h);
    const sw = (o.strokeWidth || 0) * Math.min(W, H) * 0.01;
    // template extras: soft = blurred edge (fraction of the short side), fade = see-through towards that side (scrims)
    if (o.soft > 0 && "filter" in x) x.filter = `blur(${(o.soft * Math.min(W, H)).toFixed(1)}px)`;
    if (o.shape === "line") { x.lineWidth = Math.max(2, sw || Math.min(W, H) * 0.012); x.lineCap = "round"; x.strokeStyle = o.fill; x.stroke(); }
    else {
      x.fillStyle = o.fade ? fadeFill(x, o.fill, o.fade, b.w, b.h) : o.fill; x.fill();
      if (sw > 0) { x.lineWidth = sw; x.lineJoin = "round"; x.strokeStyle = o.stroke; x.stroke(); }
    }
  } else if (o.type === "sticker") {
    const ready = stickerReady(o);
    const img = ready && ready.done;
    if (img) x.drawImage(img, -b.w / 2, -b.h / 2, b.w, b.h);
  } else if (o.type === "image") {
    const img = overlayImage(o.pixId, Math.max(b.w, b.h));
    if (img) {
      if (o.flipX) x.scale(-1, 1);
      x.imageSmoothingQuality = "high";
      x.drawImage(img, -b.w / 2, -b.h / 2, b.w, b.h);
    }
  }
  x.restore();
}
/** A colour that fades to see-through towards one side of a w×h box drawn round 0,0 ("top", "bottom", "left", "right"). */
function fadeFill(x, hex, side, w, h) {
  const v = parseInt(String(hex).slice(1, 7), 16) || 0, rgb = `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
  const [x0, y0, x1, y1] = { top: [0, -h / 2, 0, h / 2], bottom: [0, h / 2, 0, -h / 2], left: [-w / 2, 0, w / 2, 0], right: [w / 2, 0, -w / 2, 0] }[side] || [0, -h / 2, 0, h / 2];
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},1)`);
  return g;
}
// Pictures of "image" overlays (Magic Grab) live in the app's pixel store; the app tells us how to find them.
let overlayImage = () => null;
/** fn(pixId, longSidePx) → canvas or null. */
export function setOverlayImages(fn) { overlayImage = typeof fn === "function" ? fn : () => null; }
/** Waits for fonts and sticker pictures used by the overlays. */
export async function prepareOverlays(list) {
  await Promise.all(list.map(async (o) => {
    if (o.type === "text") await preloadFont(o);
    if (o.type === "sticker") {
      const p = stickerImage(o);
      const img = await p.catch(() => null);
      p.done = img;
    }
  }));
}

/* ---------- frames ---------- */

/** Puts the frame around (or on) a picture, then its photo shadow (frame.shadow); returns a new canvas (or the same one). */
export function applyFrame(src, frame) {
  const framed = drawFrame(src, frame);
  return frame?.shadow?.id ? applyShadow(framed, frame.shadow) : framed;
}
/** Outline of a shape frame in a W×H box (path only; the caller clips, fills or strokes). */
function shapeFramePath(x, id, W, H, inset = 0) {
  const w = W - inset * 2, h = H - inset * 2, X = inset, Y = inset, cx = W / 2, cy = H / 2;
  x.beginPath();
  switch (id) {
    case "circle": x.ellipse(cx, cy, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2); break;
    case "rounded": roundRect(x, X, Y, w, h, Math.min(W, H) * 0.08); return;
    case "heart":
      x.moveTo(cx, Y + h);
      x.bezierCurveTo(X - w * 0.05, Y + h * 0.55, X + w * 0.02, Y - h * 0.02, cx, Y + h * 0.26);
      x.bezierCurveTo(X + w * 0.98, Y - h * 0.02, X + w * 1.05, Y + h * 0.55, cx, Y + h);
      break;
    case "star":
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.46 : 1;
        const px = cx + Math.cos(a) * (w / 2) * r, py = Y + h * 0.53 + Math.sin(a) * (h * 0.53) * r;
        if (i) x.lineTo(px, py); else x.moveTo(px, py);
      }
      break;
    case "hexagon": for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3, px = cx + Math.cos(a) * (w / 2), py = cy + Math.sin(a) * (h / 2); if (i) x.lineTo(px, py); else x.moveTo(px, py); } break;
    case "arch": { const r = w / 2; x.moveTo(X, Y + h); x.lineTo(X, Y + Math.min(h, r)); x.ellipse(cx, Y + Math.min(h, r), r, Math.min(h, r), 0, Math.PI, 0); x.lineTo(X + w, Y + h); break; }
    case "diamond": x.moveTo(cx, Y); x.lineTo(X + w, cy); x.lineTo(cx, Y + h); x.lineTo(X, cy); break;
    case "blob": {
      const k = [1, 0.9, 1.04, 0.92, 1.02, 0.88, 1.05, 0.95];
      const pts = k.map((r, i) => { const a = (i / k.length) * Math.PI * 2; return [cx + Math.cos(a) * (w / 2) * r * 0.97, cy + Math.sin(a) * (h / 2) * r * 0.97]; });
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const m0 = mid(pts[pts.length - 1], pts[0]);
      x.moveTo(m0[0], m0[1]);
      for (let i = 0; i < pts.length; i++) { const m = mid(pts[i], pts[(i + 1) % pts.length]); x.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      break;
    }
    default: x.rect(X, Y, w, h);
  }
  x.closePath();
}
function drawFrame(src, frame) {
  if (!frame || frame.id === "none") return src;
  const W = src.width, H = src.height, p = borderPad(frame, W, H);
  const out = makeCanvas(W + p.left + p.right, H + p.top + p.bottom), x = out.getContext("2d");
  const color = frame.color || "#ffffff";
  const u = Math.max(1, Math.round(((frame.width ?? 4) / 100) * Math.max(W, H)));
  switch (frame.id) {
    case "solid": case "polaroid":
      x.fillStyle = color; x.fillRect(0, 0, out.width, out.height);
      x.drawImage(src, p.left, p.top);
      break;
    case "double": {
      x.fillStyle = color; x.fillRect(0, 0, out.width, out.height);
      x.drawImage(src, p.left, p.top);
      x.strokeStyle = contrastInk(color); x.lineWidth = Math.max(1, u * 0.12);
      const d = u * 0.45;
      x.strokeRect(p.left - d, p.top - d, W + 2 * d, H + 2 * d);
      break;
    }
    case "film": {
      x.fillStyle = color === "#ffffff" ? "#111318" : color; x.fillRect(0, 0, out.width, out.height);
      x.drawImage(src, p.left, p.top);
      const hole = p.top * 0.42, gap = hole * 0.9;
      x.fillStyle = "#f4f4f6";
      for (let px = gap; px + hole < out.width; px += hole + gap) {
        roundRect(x, px, (p.top - hole) / 2, hole, hole * 0.8, hole * 0.2); x.fill();
        roundRect(x, px, out.height - p.bottom + (p.bottom - hole) / 2, hole, hole * 0.8, hole * 0.2); x.fill();
      }
      break;
    }
    case "rounded": case "circle": case "heart": case "star": case "hexagon": case "arch": case "diamond": case "blob": {
      x.save();
      shapeFramePath(x, frame.id, W, H);
      x.clip();
      x.drawImage(src, 0, 0);
      x.restore();
      if (frame.width > 0) {
        const lw = u * 0.5;
        x.lineWidth = lw; x.strokeStyle = color; x.lineJoin = "round";
        shapeFramePath(x, frame.id, W, H, lw / 2);
        x.stroke();
      }
      break;
    }
    case "shadow": {
      x.fillStyle = color; x.fillRect(0, 0, out.width, out.height);
      x.save();
      x.shadowColor = "rgba(27,33,51,.35)"; x.shadowBlur = u * 1.2; x.shadowOffsetY = u * 0.35;
      roundRect(x, p.left, p.top, W, H, Math.min(W, H) * 0.03); x.fillStyle = "#fff"; x.fill();
      x.restore();
      x.save(); roundRect(x, p.left, p.top, W, H, Math.min(W, H) * 0.03); x.clip(); x.drawImage(src, p.left, p.top); x.restore();
      break;
    }
    default: x.drawImage(src, p.left, p.top);
  }
  return out;
}
/**
 * Photo shadow (Edit > Shadows) round a finished picture: drop, glow, lifted corners, curved, angled (on the floor) or a
 * solid offset copy. It follows the picture's outline (shape frames, see-through parts). Returns a bigger canvas.
 */
export function applyShadow(src, s) {
  const W = src.width, H = src.height, p = shadowPad(s, W, H), m = shadowMetrics(s, W, H);
  const out = makeCanvas(W + p.left + p.right, H + p.top + p.bottom), x = out.getContext("2d");
  const color = s.color || "#000000";
  x.save();
  x.translate(p.left, p.top);
  x.globalAlpha = Math.max(0, Math.min(1, (s.amount ?? 50) / 100));
  if (m.blur > 0 && "filter" in x) x.filter = `blur(${m.blur.toFixed(1)}px)`;
  x.fillStyle = color;
  switch (s.id) {
    case "drop": case "block": case "glow": x.drawImage(silhouette(src, color), m.dx, m.dy); break;
    case "lift": {
      // two dark wedges under the lower corners, as if the corners curl up off the page
      for (const side of [-1, 1]) {
        x.save();
        x.translate(side < 0 ? W * 0.22 : W * 0.78, H - H * 0.02 + m.dist * 0.6);
        x.rotate(side * -0.06);
        x.beginPath(); x.ellipse(0, 0, W * 0.2, Math.max(2, H * 0.04 + m.dist * 0.25), 0, 0, Math.PI * 2); x.fill();
        x.restore();
      }
      break;
    }
    case "curved": {
      // the bottom edge bends: darker under the corners, lighter in the middle
      x.beginPath();
      x.moveTo(W * 0.02, H * 0.85); x.lineTo(W * 0.98, H * 0.85); x.lineTo(W * 0.98, H + m.dist);
      x.quadraticCurveTo(W / 2, H + m.dist * 0.15 - H * 0.04, W * 0.02, H + m.dist);
      x.closePath(); x.fill();
      break;
    }
    case "angled": {
      // the picture's outline laid on the floor behind it, slanting away from the light
      x.transform(1, 0, m.skew, m.squash, -m.skew * H, H * (1 - m.squash) + m.dist * 0.3);
      x.drawImage(silhouette(src, color), 0, 0);
      break;
    }
  }
  x.restore();
  x.drawImage(src, p.left, p.top);
  return out;
}
function contrastInk(hex) {
  const v = parseInt(String(hex).slice(1), 16) || 0;
  const l = 0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255);
  return l > 140 ? "#1b2133" : "#ffffff";
}

/** Checkerboard to show transparent areas. */
export function checker(x, w, h, size = 12) {
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#e6e8f0";
  for (let y = 0; y < h; y += size) for (let i = (y / size) % 2 ? size : 0; i < w; i += size * 2) x.fillRect(i, y, size, size);
}
