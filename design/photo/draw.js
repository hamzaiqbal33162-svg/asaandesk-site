// Canvas helpers for the photo editor (browser only): decoding files (HEIC too), scaling, overlays
// (text, stickers, shapes), frames and cut-out backgrounds.
import { FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { framePad, overlayBox } from "./doc.js";
import { gaussPlane } from "./adjust.js";

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
/** The subject (cut-out) over the chosen background, at the cut-out's size. */
export function composeBackground(original, cutout, bg, bgImage) {
  const W = cutout.width, H = cutout.height;
  const out = makeCanvas(W, H), x = out.getContext("2d");
  if (bg.mode === "color") { x.fillStyle = bg.color || "#ffffff"; x.fillRect(0, 0, W, H); }
  else if (bg.mode === "blur") x.drawImage(blurredCopy(original, bg.blur ?? 40), 0, 0, W, H);
  else if (bg.mode === "image" && bgImage) {
    const s = Math.max(W / bgImage.width, H / bgImage.height), w = W / s, h = H / s;
    x.imageSmoothingQuality = "high";
    x.drawImage(bgImage, (bgImage.width - w) / 2, (bgImage.height - h) / 2, w, h, 0, 0, W, H);
  }
  x.drawImage(cutout, 0, 0, W, H);
  return out;
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
    if (o.shape === "line") { x.lineWidth = Math.max(2, sw || Math.min(W, H) * 0.012); x.lineCap = "round"; x.strokeStyle = o.fill; x.stroke(); }
    else {
      x.fillStyle = o.fill; x.fill();
      if (sw > 0) { x.lineWidth = sw; x.lineJoin = "round"; x.strokeStyle = o.stroke; x.stroke(); }
    }
  } else if (o.type === "sticker") {
    const ready = stickerReady(o);
    const img = ready && ready.done;
    if (img) x.drawImage(img, -b.w / 2, -b.h / 2, b.w, b.h);
  }
  x.restore();
}
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

/** Puts the frame around (or on) a picture; returns a new canvas (or the same one for "none"). */
export function applyFrame(src, frame) {
  if (!frame || frame.id === "none") return src;
  const W = src.width, H = src.height, p = framePad(frame, W, H);
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
    case "rounded": case "circle": {
      x.save();
      if (frame.id === "circle") { x.beginPath(); x.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2); }
      else roundRect(x, 0, 0, W, H, Math.min(W, H) * 0.08);
      x.clip();
      x.drawImage(src, 0, 0);
      x.restore();
      if (frame.width > 0) {
        const lw = u * 0.5;
        x.lineWidth = lw; x.strokeStyle = color;
        if (frame.id === "circle") { x.beginPath(); x.ellipse(W / 2, H / 2, W / 2 - lw / 2, H / 2 - lw / 2, 0, 0, Math.PI * 2); }
        else roundRect(x, lw / 2, lw / 2, W - lw, H - lw, Math.min(W, H) * 0.08);
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
