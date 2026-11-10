// Magic Layers for PDF files: every text item becomes a text layer (font family from the font name, size,
// colour from the operator list, exact position), every embedded picture becomes an image layer, and the
// rest (vector drawings, shading, inline images) is rendered as a background picture without the text.
// pdf.js and pdf-lib are passed in (deps), so the same code runs in the browser and in the Node tests.
import { scanOperatorList, itemColors, pdfTextRuns, mergeRuns, textLayer, imageLayer, unitSquareBox, runBox, sampleTextColors, inkMask, toHex, pictureLayers } from "./build.js";
import { patchPdfBytes } from "./pdfpatch.js";

export const CSS_PER_PT = 96 / 72;
export const MAX_PAGES = 30;
export const MAX_IMAGES = 60;

/** pdf.js image object (from page.objs / commonObjs) → something drawImage accepts. */
export function imageSource(obj, makeCanvas) {
  if (!obj) return null;
  if (obj.bitmap) return obj.bitmap;
  const { width: w, height: h, data, kind } = obj;
  if (!(w > 0 && h > 0) || !data) return null;
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext("2d");
  const id = ctx.createImageData(w, h);
  const d = id.data;
  if (kind === 3) d.set(data.subarray ? data.subarray(0, w * h * 4) : data.slice(0, w * h * 4));
  else if (kind === 2) {
    for (let i = 0, j = 0; i < w * h; i++, j += 3) { d[i * 4] = data[j]; d[i * 4 + 1] = data[j + 1]; d[i * 4 + 2] = data[j + 2]; d[i * 4 + 3] = 255; }
  } else if (kind === 1) { // 1 bit per pixel, rows padded to whole bytes, 1 = white
    const row = (w + 7) >> 3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = data[y * row + (x >> 3)] & (128 >> (x & 7)) ? 255 : 0;
      const o = (y * w + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
    }
  } else return null;
  ctx.putImageData(id, 0, 0);
  return cv;
}

const objOf = (page, id) => new Promise((resolve) => {
  const objs = String(id).startsWith("g_") ? page.commonObjs : page.objs;
  const t = setTimeout(() => resolve(null), 8000);
  try { objs.get(id, (v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(null); }); } catch { clearTimeout(t); resolve(null); }
});

/**
 * Draws one placed PDF image with its full transform (rotation and flips baked in) on a canvas the size of
 * its box. Returns { canvas, box, alpha } or null.
 */
export function drawPlacement(src, srcW, srcH, box, makeCanvas, maxSide = 3000) {
  if (!(box.w >= 1 && box.h >= 1)) return null;
  const k = Math.min(4, Math.max(1, Math.max(srcW / box.w, srcH / box.h)), maxSide / Math.max(box.w, box.h));
  const cw = Math.max(1, Math.round(box.w * k)), ch = Math.max(1, Math.round(box.h * k));
  const cv = makeCanvas(cw, ch);
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  const m = box.matrix;
  ctx.setTransform(cw / box.w, 0, 0, ch / box.h, (-box.x * cw) / box.w, (-box.y * ch) / box.h);
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.transform(1 / srcW, 0, 0, -1 / srcH, 0, 1);
  ctx.drawImage(src, 0, 0);
  const px = ctx.getImageData(0, 0, cw, ch).data;
  let alpha = false;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { alpha = true; break; }
  return { canvas: cv, alpha };
}

async function renderPage(page, scale, makeCanvas) {
  const vp = page.getViewport({ scale });
  const cv = makeCanvas(Math.max(1, Math.round(vp.width)), Math.max(1, Math.round(vp.height)));
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  await page.render({ canvasContext: ctx, canvas: cv, viewport: vp }).promise;
  return cv;
}
const pixelsOf = (cv) => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height); return { data: d.data, width: cv.width, height: cv.height }; };

/** What is on one pdf.js page: text runs (CSS px), image placements and the page kind. */
export async function analysePage(page, OPS, fontInfoFor) {
  const ops = await page.getOperatorList();
  const tc = await page.getTextContent();
  const vp = page.getViewport({ scale: CSS_PER_PT });
  const { chars, images } = scanOperatorList(ops, OPS);
  const items = tc.items.filter((it) => typeof it.str === "string");
  const colors = itemColors(items, chars);
  const fontInfo = (name) => fontInfoFor(page, tc.styles, name);
  const runs = mergeRuns(pdfTextRuns(items, colors, vp.transform, fontInfo));
  const visible = runs.filter((r) => !r.invisible);
  const kind = visible.length ? "vector" : runs.length ? "scan" : "picture";
  const placements = images.map((im) => ({ ...im, box: unitSquareBox(im.ctm, vp.transform) }));
  return { w: vp.width, h: vp.height, runs, kind, placements, viewport: vp };
}

/** Font name + flags of a pdf.js font (pdf.js 4 exports `name`; newer ones with fontExtraProperties). */
export function fontInfoFor(page, styles, fontName) {
  let f = null;
  try { f = page.commonObjs.get(fontName); } catch { /* not loaded */ }
  const loaded = f?.loadedName && !/^g_|^f\d/.test(f.loadedName) ? f.loadedName : "";
  return { name: f?.name || loaded || "", bold: !!(f?.bold || f?.black), italic: !!f?.italic, fallback: styles?.[fontName]?.fontFamily || f?.fallbackName || "" };
}

/**
 * The whole PDF → pages of layers. deps: { pdfjs, PDFLib, makeCanvas, encode(canvas|pixels, type), inpaint,
 * ocr, matchFont, removeBg, measure(run), step(id, status, detail), loadPdfLib() }.
 * opts: { text, removeText, images, maxPages, quality }.
 */
export async function pdfLayers(bytes, deps, opts = {}) {
  const o = { text: true, removeText: true, images: true, maxPages: MAX_PAGES, quality: 2, ...opts };
  const { pdfjs, makeCanvas, encode } = deps;
  const step = deps.step || (() => {});
  const notes = [];
  step("read", "run");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), fontExtraProperties: true, isEvalSupported: false, verbosity: 0 }).promise;
  const count = Math.min(doc.numPages, o.maxPages);
  if (doc.numPages > o.maxPages) notes.push(`This PDF has ${doc.numPages} pages. The first ${o.maxPages} were split into layers.`);
  const info = [];
  for (let p = 1; p <= count; p++) {
    step("read", "run", `Page ${p} of ${count}`);
    const page = await doc.getPage(p);
    const a = await analysePage(page, pdfjs.OPS, fontInfoFor);
    a.page = page;
    a.splitImages = o.images && a.kind === "vector" && a.placements.length <= MAX_IMAGES;
    if (a.kind === "vector" && a.placements.length > MAX_IMAGES) notes.push(`Page ${p} has many small pictures, so they stay in the background.`);
    info.push(a);
  }
  step("read", "done", `${count} page${count > 1 ? "s" : ""}`);

  // background copy: invisible text, layered images taken out
  let patched = null;
  if (info.some((a) => a.kind === "vector" && (o.removeText || a.splitImages))) {
    step("bg", "run", "Taking the text out of the background");
    try {
      const PDFLib = deps.PDFLib || (await deps.loadPdfLib());
      const r = await patchPdfBytes(PDFLib, bytes, { dropImages: (pi) => !!info[pi]?.splitImages, hideText: !!o.removeText });
      patched = await pdfjs.getDocument({ data: r.bytes, isEvalSupported: false, verbosity: 0 }).promise;
    } catch (e) {
      notes.push("The text was erased from the background picture instead (this PDF could not be rewritten).");
      patched = null;
    }
  }

  const pages = [];
  for (let p = 0; p < info.length; p++) {
    const a = info[p];
    const tag = info.length > 1 ? `Page ${p + 1} of ${info.length}: ` : "";
    const q = Math.max(0.5, Math.min(o.quality, 4000 / Math.max(a.w, a.h)));
    const scale = CSS_PER_PT * q;
    const layers = [];
    if (a.kind === "picture") {
      // no text layer in the file (a scan or a flat picture): read the text with OCR like an image
      step("bg", "run", tag + "Reading the page picture");
      const cv = await renderPage(a.page, scale, makeCanvas);
      const r = await pictureLayers(pixelsOf(cv), { ...deps, step: (id, st, d) => step(id, st, d ? tag + d : tag.replace(/: $/, "")) }, { text: o.text, removeText: o.removeText, subject: false, scale: 1 / q });
      pages.push({ w: a.w, h: a.h, layers: r.layers, kind: a.kind });
      continue;
    }
    step("bg", "run", tag + "Drawing the background");
    let original = null;
    const getOriginal = async () => (original ||= pixelsOf(await renderPage(a.page, scale, makeCanvas)));
    const runs = a.runs.filter((r) => (a.kind === "scan" ? true : !r.invisible));
    let bgPixels;
    if (a.kind === "vector" && !o.removeText && !a.splitImages) {
      bgPixels = await getOriginal();
    } else if (a.kind === "vector" && patched) {
      const cv = await renderPage(await patched.getPage(p + 1), scale, makeCanvas);
      bgPixels = cv;
    } else {
      // scan with an invisible text layer, or the PDF could not be rewritten: erase the letters from the render
      const img = await getOriginal();
      const pieces = runs.map((r) => {
        const b = runBox(r);
        const box = { x0: b.x0 * q, y0: b.y0 * q, x1: b.x1 * q, y1: b.y1 * q };
        const c = sampleTextColors(img, box);
        if (!r.color || a.kind === "scan") r.color = toHex(c.ink);
        return { box, ink: c.ink, paper: c.paper };
      }).filter((pc) => pc.box.x1 > pc.box.x0 && pc.box.y1 > pc.box.y0);
      if (o.removeText && pieces.length && deps.inpaint) {
        const mask = inkMask(img, pieces);
        const r = await deps.inpaint(img, { data: mask, width: img.width, height: img.height });
        bgPixels = { data: r.data, width: img.width, height: img.height };
      } else bgPixels = img;
    }
    layers.push(imageLayer({ src: await encode(bgPixels, "image/jpeg"), x: 0, y: 0, w: a.w, h: a.h, name: "Background" }));
    if (a.splitImages) {
      step("bg", "run", tag + "Taking out the pictures");
      let n = 0;
      for (const pl of a.placements) {
        const obj = await objOf(a.page, pl.objId);
        const sw = obj?.width || obj?.bitmap?.width, sh = obj?.height || obj?.bitmap?.height;
        const src = imageSource(obj, makeCanvas);
        if (!src || !sw || !sh) continue;
        const drawn = drawPlacement(src, sw, sh, pl.box, makeCanvas);
        if (!drawn) continue;
        const type = drawn.alpha || drawn.canvas.width * drawn.canvas.height < 128 * 128 ? "image/png" : "image/jpeg";
        layers.push(imageLayer({ src: await encode(drawn.canvas, type), x: pl.box.x, y: pl.box.y, w: pl.box.w, h: pl.box.h, name: `Picture ${++n}` }));
      }
    }
    if (o.text) {
      for (const r of runs) {
        if (!r.color) { const img = await getOriginal(); const b = runBox(r); r.color = toHex(sampleTextColors(img, { x0: b.x0 * q, y0: b.y0 * q, x1: b.x1 * q, y1: b.y1 * q }).ink); }
        if (deps.measure) r.measured = await deps.measure(r);
        layers.push(textLayer(r));
      }
    }
    step("bg", "run", tag + "Done");
    pages.push({ w: a.w, h: a.h, layers, kind: a.kind });
  }
  step("bg", "done");
  try { await doc.destroy(); await patched?.destroy(); } catch { /* already gone */ }
  return { pages, notes };
}
