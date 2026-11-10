// Magic Layers: browser-only helpers (canvas, OCR worker, font matching, lazy loading of the site's
// pdf.js, pdf-lib and image models). Nothing here loads until a file is opened.
import { FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { OCR_PARAMS } from "./build.js";

const ORIGIN = location.origin;
export const makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/** Canvas or {data,width,height} → data URL (JPEG for backgrounds and photos, PNG when transparent). */
export function encode(src, type = "image/png", quality = 0.9) {
  let cv = src;
  if (!src.getContext) {
    cv = makeCanvas(src.width, src.height);
    cv.getContext("2d").putImageData(new ImageData(src.data instanceof Uint8ClampedArray ? src.data : new Uint8ClampedArray(src.data), src.width, src.height), 0, 0);
  }
  return cv.toDataURL(type, quality);
}
export function pixelsOf(cv) { const d = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height); return { data: d.data, width: cv.width, height: cv.height }; }

/** A picture file → canvas (orientation applied), at most maxSide px on the long side. */
export async function fileToCanvas(file, maxSide = 3000) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch {
    const url = URL.createObjectURL(file);
    try { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("bad image")); im.src = url; }); }
    catch { throw new Error("This picture could not be opened. Please use a JPG, PNG or WebP file."); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
  if (!(w0 > 0 && h0 > 0)) throw new Error("This picture is empty.");
  const k = Math.min(1, maxSide / Math.max(w0, h0));
  const cv = makeCanvas(Math.max(1, Math.round(w0 * k)), Math.max(1, Math.round(h0 * k)));
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close?.();
  return cv;
}

export function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src.split("/").pop() + ". Please check your connection."));
    document.head.append(s);
  });
}

/* ---------- site libraries (lazy) ---------- */
let pdfjsP = null, pdfLibP = null, toolsP = null;
export function loadPdfjs() {
  return (pdfjsP ||= import(ORIGIN + "/pdf-editor/lib/pdf.min.mjs").then((m) => { m.GlobalWorkerOptions.workerSrc = ORIGIN + "/pdf-editor/lib/pdf.worker.min.mjs"; return m; }).catch((e) => { pdfjsP = null; throw e; }));
}
export function loadPdfLib() {
  return (pdfLibP ||= (window.PDFLib ? Promise.resolve() : loadScript(ORIGIN + "/pdf-editor/lib/pdf-lib.min.js")).then(() => window.PDFLib).catch((e) => { pdfLibP = null; throw e; }));
}
export function loadImageTools() { return (toolsP ||= import(ORIGIN + "/pdf-editor/imagetools.js").catch((e) => { toolsP = null; throw e; })); }

/* ---------- OCR (tesseract.js from the PDF editor) ---------- */
let worker = null, ocrListener = null;
function getWorker() {
  return (worker ||= (async () => {
    if (!window.Tesseract) await loadScript(ORIGIN + "/pdf-editor/lib/ocr/tesseract.min.js");
    const base = ORIGIN + "/pdf-editor/lib/ocr/";
    const w = await window.Tesseract.createWorker("eng", 1, {
      workerPath: base + "worker.min.js", corePath: base + "core", langPath: base + "lang", workerBlobURL: false, gzip: true,
      logger: (m) => ocrListener?.(m),
    });
    await w.setParameters(OCR_PARAMS); // automatic page layout (see build.js)
    return w;
  })().catch((e) => { worker = null; throw e; }));
}
/** Tesseract result for a canvas or pixel data. onProgress({ message, loaded, total }). */
export async function ocr(img, onProgress) {
  ocrListener = (m) => {
    const pct = typeof m.progress === "number" ? m.progress : 0;
    const msg = /recogniz/i.test(m.status || "") ? "Reading the text…" : "Getting the text reader ready (first time only)…";
    onProgress?.({ message: msg, loaded: pct, total: 1 });
  };
  try {
    const w = await getWorker();
    const cv = img.getContext ? img : (() => { const c = makeCanvas(img.width, img.height); c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0); return c; })();
    const { data } = await w.recognize(cv, {}, { blocks: true, text: true });
    return data;
  } finally { ocrListener = null; }
}

/* ---------- closest font for a piece of picture text ---------- */
const cssFont = (family, bold, italic, px) => `${italic ? "italic " : ""}${bold ? 700 : 400} ${px}px ${FONT_FAMILIES[family]?.css || FONT_FAMILIES.sans.css}`;
let scratch = null;
/**
 * Renders the text in sans/serif/mono (regular and bold) at the width of the picture's letters and keeps
 * the one whose letter shapes overlap best. Returns { family, bold, size, measured } (picture px).
 */
export async function matchFont(img, seg, colors) {
  const x0 = Math.max(0, Math.round(seg.box.x0)), y0 = Math.max(0, Math.round(seg.box.y0));
  const w = Math.min(img.width - x0, Math.round(seg.box.x1 - seg.box.x0)), h = Math.min(img.height - y0, Math.round(seg.box.y1 - seg.box.y0));
  if (w < 4 || h < 4 || !seg.text.trim()) return null;
  const target = new Uint8Array(w * h);
  const span = Math.hypot(colors.ink[0] - colors.paper[0], colors.ink[1] - colors.paper[1], colors.ink[2] - colors.paper[2]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * img.width + x0 + x) * 4;
    const d = Math.hypot(img.data[i] - colors.paper[0], img.data[i + 1] - colors.paper[1], img.data[i + 2] - colors.paper[2]);
    target[y * w + x] = d > span * 0.5 ? 1 : 0;
  }
  scratch ||= makeCanvas(8, 8);
  scratch.width = w; scratch.height = h;
  const c = scratch.getContext("2d", { willReadFrequently: true });
  let best = null;
  for (const family of ["sans", "serif", "mono"]) {
    for (const bold of [false, true]) {
      await ensureFont(family, bold, false);
      c.font = cssFont(family, bold, false, 100);
      const m = c.measureText(seg.text);
      const inkW = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width);
      if (!(inkW > 0)) continue;
      let size = (100 * w) / inkW;
      const rowH = seg.rowH || h;
      size = Math.max(rowH * 0.45, Math.min(rowH * 1.6, size));
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#fff"; c.fillRect(0, 0, w, h);
      c.font = cssFont(family, bold, false, size);
      c.fillStyle = "#000";
      c.fillText(seg.text, c.measureText(seg.text).actualBoundingBoxLeft || 0, seg.baseline - y0);
      const d = c.getImageData(0, 0, w, h).data;
      let inter = 0, union = 0;
      for (let i = 0; i < w * h; i++) { const a = target[i], b = d[i * 4] < 128 ? 1 : 0; if (a & b) inter++; if (a | b) union++; }
      const score = union ? inter / union : 0;
      const mm = c.measureText(seg.text);
      if (!best || score > best.score) best = { family, bold, size, score, measured: mm.width, left: mm.actualBoundingBoxLeft || 0 };
    }
  }
  return best;
}

/** Width of a text run in its Studio font (so the text box is wide enough not to wrap). */
export async function measureRun(r) {
  await ensureFont(r.family, r.bold, r.italic);
  scratch ||= makeCanvas(8, 8);
  const c = scratch.getContext("2d");
  c.font = cssFont(r.family, r.bold, r.italic, r.size);
  return c.measureText(r.content).width;
}
export { FONT_FAMILIES, ensureFont };
