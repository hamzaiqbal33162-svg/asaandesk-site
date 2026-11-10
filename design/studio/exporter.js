// Exports (browser): PNG / JPG per page, vector PDF, SVG, the .asaandesk.json design file. Heavy libraries
// (pdf-lib, fontkit, the site's chart/table modules) load only when first needed.
import { presetPx, bleedPx, exportPixels } from "./presets.js";
import { renderPage, canvasBlob, loadImages, ensureFonts, drawLayer } from "./canvas.js";
import { pageSvg } from "./svg.js";
import { buildPdf, pdfModules, tableMeasure } from "./pdf.js";
import { designProblems, normalizeDesign } from "./model.js";

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
    chartPrims: (spec, w, h) => charts.chartPrims(spec, w, h),
    tablePrims: (t, w) => tables.tablePrims(t, w, t.size || 16, tableMeasure(t.size || 16)).prims,
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
  const jpg = opts.type === "jpg";
  const c = await renderPage(design, index, { scale: px.scale, bleed: px.bleedPx, chartPrims: env.chartPrims, tablePrims: env.tablePrims, fill: jpg ? "#ffffff" : null });
  const blob = await canvasBlob(c, jpg ? "image/jpeg" : "image/png", opts.quality ?? 0.92);
  return { blob, width: c.width, height: c.height };
}

function dataUrlBytes(src) { const i = src.indexOf(","); const bin = atob(src.slice(i + 1)); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return u; }
async function toPngBytes(canvas) { return new Uint8Array(await (await canvasBlob(canvas, "image/png")).arrayBuffer()); }

/** Vector PDF. opts: { pages, bleed, marks, dpi }. Returns Uint8Array. */
export async function exportPdf(design, opts = {}) {
  await ensurePdfLib();
  await ensureFonts(design);
  const images = await loadImages(design);
  const env = {
    // Photos that are not PNG/JPG data (WebP, GIF, blob: links) are converted to PNG first.
    async imageBytes(src) {
      if (/^data:image\/(png|jpe?g);base64,/.test(src)) return { bytes: dataUrlBytes(src), type: /png/.test(src.slice(0, 20)) ? "png" : "jpg" };
      const img = images.get(src) || (await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
      if (!img) return null;
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      return { bytes: await toPngBytes(c), type: "png" };
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
    async rasterLayer(l, scale) {
      const k = Math.max(2, Math.min(scale, 4096 / Math.max(l.w, l.h)));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(l.w * k)); c.height = Math.max(1, Math.round(l.h * k));
      const ctx = c.getContext("2d"); ctx.scale(k, k);
      drawLayer(ctx, { ...l, x: 0, y: 0, rotation: 0, animation: null }, { images });
      return { bytes: await toPngBytes(c), type: "png" };
    },
  };
  return buildPdf(design, opts, env);
}

/** SVG of one page (photos embedded as they are, fonts with safe fallbacks). */
export async function exportSvg(design, index, { bleed = false } = {}) {
  const env = needsVector(design) ? await vectorEnv() : {};
  const size = presetPx(design.preset);
  const svg = pageSvg(design, index, size, { bleed: bleed ? bleedPx(design.preset) : 0, idp: "x" + index, chartPrims: env.chartPrims, tablePrims: env.tablePrims });
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
