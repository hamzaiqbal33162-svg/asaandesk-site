// Exports (browser): PNG / JPG per page, vector PDF, SVG, the .asaandesk.json design file. Heavy libraries
// (pdf-lib, fontkit, the site's chart/table modules) load only when first needed.
import { presetPx, bleedPx, exportPixels } from "./presets.js";
import { renderPage, canvasBlob, loadImages, ensureFonts, drawLayer } from "./canvas.js";
import { pageSvg } from "./svg.js";
import { buildPdf, pdfModules, tableMeasure } from "./pdf.js";
import { designProblems, normalizeDesign, imageLayer } from "./model.js";
import { encodePng8, deflateBrowser } from "./download.js";
import { withFills } from "./tableops.js";
import { extraChartPrims } from "./chartsx.js";

const scripts = new Map();
export function loadScript(src) {
  if (!scripts.has(src)) scripts.set(src, new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => { scripts.delete(src); rej(new Error("Could not load " + src + ". Check your internet connection.")); }; document.head.append(s); }));
  return scripts.get(src);
}
/** pdf-lib + fontkit from the PDF editor (loaded once, on first use). */
export async function ensurePdfLib() {
  if (!window.PDFLib) await loadScript("/pdf-editor/lib/pdf-lib.min.js");
  if (!window.fontkit) await loadScript("/pdf-editor/lib/fontkit.umd.min.js").catch(() => null);
  return window.PDFLib;
}
/** Chart and table drawing (the site's modules need pdf-lib loaded first). */
let vec = null;
export async function vectorEnv() {
  if (vec) return vec;
  await ensurePdfLib();
  const { charts, tables } = await pdfModules();
  vec = {
    charts, tables,
    chartPrims: (spec, w, h) => extraChartPrims(spec, w, h) || charts.chartPrims(spec, w, h),
    tablePrims: (t, w) => withFills(t, tables.tablePrims(t, w, t.size || 16, tableMeasure(t.size || 16))),
    tableHeight: (t, w) => tables.layoutTable(t, w, t.size || 16, tableMeasure(t.size || 16)).height,
  };
  return vec;
}
export const vectorReady = () => vec;
export const needsVector = (design) => design.pages.some((p) => JSON.stringify(p.layers, (k, v) => (typeof v === "string" && v.length > 200 ? "" : v)).match(/"type":"(chart|table)"/));

export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
export const fileBase = (design) => (design.name || "design").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 60) || "design";

/** Raster export of one page. opts: { scale | dpi, bleed: bool, type: 'png' | 'jpg', quality }. */
export async function exportRaster(design, index, opts = {}) {
  const P = design.preset;
  const px = exportPixels(P, { scale: opts.dpi ? null : opts.scale || 1, dpi: opts.dpi || null, bleed: !!opts.bleed });
  const env = needsVector(design) ? await vectorEnv() : {};
  const type = opts.type || "png", jpg = type === "jpg", webp = type === "webp";
  const opaque = jpg || (webp && !opts.transparent);
  const c = await renderPage(design, index, { scale: px.scale * (opts.shrink || 1), bleed: px.bleedPx, chartPrims: env.chartPrims, tablePrims: env.tablePrims, fill: opaque ? "#ffffff" : null, ...(opts.transparent && !jpg ? { background: false } : {}) });
  return { blob: await encodeCanvas(c, type, opts), width: c.width, height: c.height };
}
/** Canvas -> file: PNG (or Canva's "Compress": a palette PNG), JPG or WebP at a quality. */
export async function encodeCanvas(c, type = "png", opts = {}) {
  if (type === "png" && opts.compress) {
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    return new Blob([await encodePng8(data, c.width, c.height, deflateBrowser)], { type: "image/png" });
  }
  const mime = { jpg: "image/jpeg", webp: "image/webp" }[type] || "image/png";
  const blob = await canvasBlob(c, mime, opts.quality ?? 0.92);
  if (type === "webp" && blob.type !== "image/webp") throw new Error("This browser can't make WebP files. Choose PNG or JPG.");
  return blob;
}
/**
 * Canva "Download selection": the selected items only, cut to their box, as PNG (transparent) or JPG.
 * layers: layers of one page (page coordinates). Returns { blob, width, height }.
 */
export async function exportLayers(design, layers, { scale = 2, type = "png", quality = 0.92 } = {}) {
  const env = needsVector(design) ? await vectorEnv() : {};
  const box = layers.map(boxOf).reduce((a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) }));
  const k = Math.min(scale, 8000 / Math.max(1, box.r - box.x, box.b - box.y));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round((box.r - box.x) * k)); c.height = Math.max(1, Math.round((box.b - box.y) * k));
  const ctx = c.getContext("2d");
  if (type === "jpg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
  const mini = { ...design, pages: [{ id: "sel", background: { color: "none" }, layers }] };
  const images = await loadImages(mini);
  await ensureFonts(mini);
  ctx.scale(k, k); ctx.translate(-box.x, -box.y);
  for (const l of layers) drawLayer(ctx, l, { images, chartPrims: env.chartPrims, tablePrims: env.tablePrims });
  return { blob: await encodeCanvas(c, type, { quality }), width: c.width, height: c.height };
}
// Box of a layer on the page, rotation included.
function boxOf(l) {
  const a = ((l.rotation || 0) * Math.PI) / 180, cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
  const w = l.w * cs + l.h * sn, h = l.w * sn + l.h * cs, cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, r: cx + w / 2, b: cy + h / 2 };
}

function dataUrlBytes(src) { const i = src.indexOf(","); const bin = atob(src.slice(i + 1)); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return u; }
async function toPngBytes(canvas) { return new Uint8Array(await (await canvasBlob(canvas, "image/png")).arrayBuffer()); }

/** Vector PDF. opts: { pages, bleed, marks, dpi }. Returns Uint8Array. */
export async function exportPdf(design, opts = {}) {
  await ensurePdfLib();
  await ensureFonts(design);
  // Canva "Flatten PDF": every page becomes one picture (at the PDF's dpi), so nothing can be edited or picked apart.
  if (opts.flatten) {
    const P = design.preset, b = opts.bleed ? bleedPx(P) : 0, { w, h } = presetPx(P);
    const list = opts.pages || design.pages.map((_, i) => i);
    const pages = [];
    for (const i of list) {
      const r = await exportRaster(design, i, { dpi: opts.dpi || 96, bleed: !!opts.bleed, type: opts.compress ? "jpg" : "png", quality: 0.85 });
      const src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
      pages.push({ id: "f" + i, background: { color: "#ffffff" }, layers: [imageLayer(src, { x: -b, y: -b, w: w + 2 * b, h: h + 2 * b, nw: r.width, nh: r.height, name: "Page" })] });
    }
    return buildPdf({ ...design, pages }, { ...opts, pages: null, flatten: false }, { imageBytes: async (src) => ({ bytes: dataUrlBytes(src), type: /png/.test(src.slice(0, 20)) ? "png" : "jpg" }) });
  }
  const images = await loadImages(design);
  // Canva "Compress PDF": photos are made smaller (at most 1600 px a side, JPG when they have no see-through parts).
  const shrink = async (img, bytes, type) => {
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let alpha = false; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { alpha = true; break; }
    const out = alpha ? { bytes: await toPngBytes(c), type: "png" } : { bytes: new Uint8Array(await (await canvasBlob(c, "image/jpeg", 0.75)).arrayBuffer()), type: "jpg" };
    return out.bytes.length < bytes.length ? out : { bytes, type };
  };
  const env = {
    // Photos that are not PNG/JPG data (WebP, GIF, blob: links) are converted to PNG first.
    async imageBytes(src) {
      const img0 = opts.compress ? images.get(src) : null;
      if (/^data:image\/(png|jpe?g);base64,/.test(src)) { const r = { bytes: dataUrlBytes(src), type: /png/.test(src.slice(0, 20)) ? "png" : "jpg" }; return img0 ? shrink(img0, r.bytes, r.type) : r; }
      // Template photos (same-origin library JPGs): the file itself goes in, not a much bigger PNG copy.
      if (/^\/pdf-editor\/photos\/[a-z0-9-]+\.jpe?g$/i.test(src)) { try { const res = await fetch(src); if (res.ok) { const r = { bytes: new Uint8Array(await res.arrayBuffer()), type: "jpg" }; return img0 ? shrink(img0, r.bytes, r.type) : r; } } catch {} }
      const img = images.get(src) || (await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
      if (!img) return null;
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      const r = { bytes: await toPngBytes(c), type: "png" };
      return opts.compress ? shrink(img, r.bytes, r.type) : r;
    },
    // Photos with filters or flips: the finished look at print resolution.
    async rasterImage(l, scale) {
      const im = images.get(l.image.src);
      const nat = im ? Math.max(im.naturalWidth * l.image.crop.w / l.w, im.naturalHeight * l.image.crop.h / l.h) : 1;
      const k = Math.max(1, Math.min(scale, nat, 4096 / Math.max(l.w, l.h)));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(l.w * k)); c.height = Math.max(1, Math.round(l.h * k));
      const ctx = c.getContext("2d"); ctx.scale(k, k);
      drawLayer(ctx, { ...l, x: 0, y: 0, rotation: 0, opacity: 1, animation: null }, { images });
      return { bytes: await toPngBytes(c), type: "png" };
    },
    // Text in letters the open fonts do not have (e.g. Urdu): a sharp picture of the text.
    // Also gradient text and shapes. pad: room around the box for glows and shadows.
    async rasterLayer(l, scale, pad = 0) {
      const W = l.w + 2 * pad, H = l.h + 2 * pad;
      const k = Math.max(2, Math.min(scale, 4096 / Math.max(W, H)));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
      const ctx = c.getContext("2d"); ctx.scale(k, k);
      drawLayer(ctx, { ...l, x: pad, y: pad, rotation: 0, animation: null }, { images });
      return { bytes: await toPngBytes(c), type: "png" };
    },
  };
  return buildPdf(design, opts, env);
}

/** SVG of one page (photos embedded as they are, fonts with safe fallbacks). */
export async function exportSvg(design, index, { bleed = false, transparent = false } = {}) {
  const env = needsVector(design) ? await vectorEnv() : {};
  const size = presetPx(design.preset);
  // Template photos are site files: the saved SVG links them with the full address, so it still shows them elsewhere.
  const abs = (s) => (typeof location !== "undefined" && /^\/[^/]/.test(s || "") ? location.origin + s : s);
  const svg = pageSvg(design, index, size, { bleed: bleed ? bleedPx(design.preset) : 0, idp: "x" + index, chartPrims: env.chartPrims, tablePrims: env.tablePrims, links: true, transparent, urlOf: abs });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Made with AsaanDesk Studio -->\n` + svg.replace("<svg ", '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
}

/** The design file (.asaandesk.json). */
export function exportJson(design) {
  return new Blob([JSON.stringify({ app: "asaandesk-studio", ...design }, null, 1)], { type: "application/json" });
}
/** Reads a design file. Throws a friendly error for files that are not AsaanDesk designs. */
export function parseDesignFile(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error("This file is not a design file (.asaandesk.json)."); }
  if (d && d.design && d.design.pages) d = d.design;
  delete d.app;
  const n = normalizeDesign(d);
  const bad = designProblems(n);
  if (bad.length) throw new Error("This design file is damaged: " + bad.slice(0, 2).join(", "));
  return n;
}
