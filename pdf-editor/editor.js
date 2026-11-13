import * as pdfjsLib from "./lib/pdf.min.mjs";
import { removeTextRuns, scanPage, runStyle, inkFromStrokes, initMetrics, appendToStream, invert, applyMatrix } from "./textremove.js";
import { loadPdfFont, previewSvg, openPreviewSvg, pickWriter, layoutLine, spacedWidth, fontTraits, fontDescriptor, METRIC_FAMILIES, metricFile, heightMatchByClass, weightMatch, loadFontFile, heightRuns, scaledSpacing } from "./fontmatch.js";
import { jsFontFamily, jsFontUsable, docGlyphs, openGlyphs, glyphsAdvance, paintGlyphs, paintUnion, inkMetrics, pickWeight } from "./textpaint.js";
import { primsToSvg, drawPrims, rectPath } from "./vector.js";
import { chartPrims, parseChartData, PALETTE } from "./charts.js";
import { newTable, tablePrims, wrapText } from "./tables.js";
import { writeCommentAnnots, readCommentAnnots } from "./comments.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./lib/pdf.worker.min.mjs", import.meta.url).href;
const { PDFDocument, rgb, degrees, BlendMode, LineCapStyle, PDFString, PDFHexString, PDFName, PDFDict } = window.PDFLib;
await initMetrics();

// Pages render at this zoom; every item position is stored in these page pixels (before view zoom).
const SCALE = 1.5;
// Where the baseline sits inside a line-height:1 box.
const BASELINE = 0.85;

// Screen fonts: the same open fonts the PDF is written with, then common system look-alikes.
const CSS_FONT = {
  sans: '"AD Sans", Arial, Helvetica, sans-serif',
  serif: '"AD Serif", "Times New Roman", Times, serif',
  mono: '"AD Mono", "Courier New", Courier, monospace',
  calibri: '"AD Calibri", Calibri, Carlito, sans-serif',
  cambria: '"AD Cambria", Cambria, Caladea, serif',
};
// Half the difference between ascent and descent (em), to put the first baseline exactly in place.
const FONT_K = { sans: 0.3465, serif: 0.3375, mono: 0.2665, calibri: 0.3415, cambria: 0.34 };
const OLD_FAMILY = { Helvetica: "sans", Times: "serif", Courier: "mono" };
const famOf = (f) => OLD_FAMILY[f.family] || f.family || "sans";

const $ = (id) => document.getElementById(id);
const state = {
  sources: [],   // { bytes, doc (pdf.js), lib (pdf-lib), image: { type, width, height } | null }
  pages: [],     // { id, src, index, baseRotate, extraRotate, viewport, wrap, box, el, canvas, hits, itemsLayer, runs, scan, ink }
  items: [],
  tool: "edit",
  selected: null,
  fileName: "document",
  zoom: 1,
  pen: { kind: "pen", color: [16, 32, 74], width: 2 * SCALE, userSet: false, source: null },
};
const fonts = new Map(); // "pageId:baseFont" -> reusable font from the PDF itself (see fontmatch.js)
// "source:loadedName" -> the font object pdf.js drew a text run with (its loaded face and code -> character map), so
// edited text is painted by the very same text rasteriser call as the page's own text (see textpaint.js).
const jsFonts = new Map();
let nextId = 1;
// Items get random ids so edits from several people (live collaboration) never clash.
const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "").slice(0, 12);

/* ---------- helpers ---------- */

function toast(msg, ms = 3500) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove("show");
  void t.offsetWidth;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), ms);
}

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const unhex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const css = (c) => `rgb(${c.join(",")})`;
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const stripSubset = (n) => (n || "").replace(/^[A-Z]{6}\+/, "");

// Ink colour (darkest pixel) and paper colour (median of the border) around a box.
function sampleColors(canvas, x, y, w, h) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.width, Math.ceil(x + w)), y1 = Math.min(canvas.height, Math.ceil(y + h));
  if (x1 <= x0 || y1 <= y0) return { ink: [0, 0, 0], paper: [255, 255, 255] };
  const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let ink = [255, 255, 255];
  for (let i = 0; i < data.length; i += 4) {
    const c = [data[i], data[i + 1], data[i + 2]];
    if (lum(c) < lum(ink)) ink = c;
  }
  const ring = [];
  const W = x1 - x0, H = y1 - y0;
  for (let i = 0; i < W; i++) ring.push(i * 4, ((H - 1) * W + i) * 4);
  for (let j = 0; j < H; j++) ring.push(j * W * 4, (j * W + W - 1) * 4);
  // Paper = the colour covering most of the box (letters and a cell's border lines are always the minority). The ring
  // median used before turned grey when a table row's box touched both of its cell borders (FIX-4: grey band).
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | (data[i + 2] >> 3);
    const b = buckets.get(key); if (b) { b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; } else buckets.set(key, { n: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  let top = null; for (const b of buckets.values()) if (!top || b.n > top.n) top = b;
  const med = (k) => ring.map((o) => data[o + k]).sort((a, b) => a - b)[ring.length >> 1];
  const paper = top && top.n * 3 >= data.length / 4 ? [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)] : [med(0), med(1), med(2)];
  return { ink: lum(paper) - lum(ink) < 40 ? [0, 0, 0] : ink, paper };
}

function pageOf(item) { return state.pages.find((p) => p.id === item.pageId); }
const libPage = (page) => state.sources[page.src].lib.getPage(page.index);

// Text style and drawings read straight from the page's content stream (computed once per page).
function pageScan(page) {
  if (page.scan === undefined) {
    try { page.scan = scanPage(libPage(page)); } catch (e) { console.warn("Content stream not readable", e); page.scan = null; }
  }
  return page.scan;
}

/* ---------- fonts ---------- */

// The font a text run was written in, ready to write new text with.
// A font is looked up in the resources it was drawn with (page, form XObject or form field): the same
// name can mean different font objects in different places.
const resIds = new WeakMap();
let resCount = 0;
const resId = (r) => { if (!r) return "page"; if (!resIds.has(r)) resIds.set(r, "r" + resCount++); return resIds.get(r); };
function pdfFont(page, baseFont, resources = null) {
  const key = `${page.id}:${resId(resources)}:${baseFont}`;
  if (!fonts.has(key)) {
    let entry = null;
    try { entry = loadPdfFont(libPage(page), baseFont, resources); } catch (e) { console.warn(e); }
    fonts.set(key, entry);
  }
  return fonts.get(key) ? key : null;
}

// Loads the open screen font for a family/weight/slant once, then re-lays out text that uses it.
const faces = new Map();
function ensureFace(family, bold, italic, weight = null) {
  const fam = METRIC_FAMILIES[family] ? family : "sans";
  const key = metricFile(fam, bold, italic, weight);
  if (!faces.has(key) && typeof FontFace === "function") {
    const face = new FontFace(METRIC_FAMILIES[fam].css.replace(/"/g, ""), `url(${new URL("fonts/" + key, import.meta.url).href})`, { weight: String(weight ?? (bold ? 700 : 400)), style: italic ? "italic" : "normal" });
    document.fonts.add(face);
    faces.set(key, face.load().then(() => state.items.forEach((i) => i.type === "text" && i.el && layoutItem(i))).catch(() => {}));
  }
  return faces.get(key);
}

// The open look-alike fonts as font programs, to measure their letter heights against the document's font.
const openFonts = new Map();
function openFontOf(fam, bold, italic, weight = null) {
  const file = metricFile(fam, bold, italic, weight);
  if (!openFonts.has(file) && window.fontkit) {
    openFonts.set(file, null);
    loadFontFile(file)
      .then((b) => { openFonts.set(file, window.fontkit.create(b)); state.items.forEach((i) => i.type === "text" && i.el && layoutItem(i)); })
      .catch(() => openFonts.delete(file));
  }
  return openFonts.get(file) || null;
}
// How much taller the document's letters are than the open font's, per letter class (see heightMatchByClass):
// lines the document's font can't write are drawn with the open font at these heights, on screen and in the
// saved PDF alike. Without the document's font program (or a font the user picked) nothing is scaled.
const heightCache = new Map();
const NO_SCALE = { all: 1, cap: 1, asc: 1, x: 1 };
function heightKs(item) {
  const o = item.font.orig, sp = openSpec(item);
  const docFont = o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
  const fam = famOf(item.font), open = openFontOf(fam, sp.bold, sp.italic, sp.weight);
  if (!docFont?.fk || !open) return NO_SCALE;
  const key = `${o.key}|${metricFile(fam, sp.bold, sp.italic, sp.weight)}`;
  if (!heightCache.has(key)) heightCache.set(key, heightMatchByClass(docFont, open));
  return heightCache.get(key);
}
// How much heavier (em) the document's letters are than the open look-alike as drawn (see weightMatch): that much
// stroke is added to the look-alike, on screen and in the saved PDF alike. Only used until (or when) the weight
// could not be measured on the rendered page (fallbackFit).
const weightCache = new Map();
function weightEm(item) {
  const o = item.font.orig, sp = openSpec(item);
  const docFont = o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
  const fam = famOf(item.font), open = openFontOf(fam, sp.bold, sp.italic, sp.weight);
  if (!docFont?.fk || !open) return 0;
  const key = `${o.key}|${metricFile(fam, sp.bold, sp.italic, sp.weight)}`;
  if (!weightCache.has(key)) weightCache.set(key, weightMatch(docFont, open, 1 / heightKs(item).all));
  return weightCache.get(key);
}

/* ---------- edited text painted like the page's own text (see textpaint.js) ----------
 * pdf.js draws the page's letters with the browser's text rasteriser; edited lines are painted on a canvas with the
 * same calls (same face, font string, size clamp, advances, spacing, render mode), on the same device pixel grid as
 * the page picture under them. Lines the document's font can't write use the look-alike font, loaded the way pdf.js
 * loads the font it will find in the saved PDF, at a weight measured on the rendered page (fallbackFit).
 */
// Device pixels per page pixel of the page picture on show (its sharp copy, or the 1x canvas).
const paintRatio = (page) => (page?.sharp ? page.sharpR || 1 : 1);

// A look-alike font file as a canvas face: plain family, no weight/style descriptors (like pdf.js's FontFace for an
// embedded font), so the browser never adds synthetic bold or slant on top.
const paintFaces = new Map();
function paintFace(file) {
  if (!paintFaces.has(file) && typeof FontFace === "function") {
    const name = "ADP " + file.replace(/\.ttf$/, "");
    const e = { family: `"${name}", sans-serif`, ready: false, promise: null };
    e.promise = loadFontFile(file)
      .then((b) => { const f = new FontFace(name, b.slice()); document.fonts.add(f); return f.load(); })
      .then(() => { e.ready = true; state.items.forEach((i) => i.type === "text" && i.el && i.el.dataset.paintWait && layoutItem(i)); })
      .catch(() => { e.failed = true; });
    paintFaces.set(file, e);
  }
  return paintFaces.get(file) || null;
}
// fontkit object of a look-alike font file, as a promise (openFontOf is the synchronous, cached view of it).
const openJobs = new Map();
function openFontAsync(file) {
  if (!openJobs.has(file)) {
    openJobs.set(file, fontkitReady().then(() => loadFontFile(file)).then((b) => {
      if (!openFonts.get(file)) openFonts.set(file, window.fontkit.create(b));
      return openFonts.get(file);
    }).catch(() => null));
  }
  return openJobs.get(file);
}

// The original letters' own outline (render mode 1/2 with a stroke): copied to new letters with its width and join.
function ownOutline(item) {
  const ink = item.ink || {};
  return ink.lineWidth > 0 && (ink.render === 1 || ink.render === 2) ? { render: ink.render, color: ink.stroke || item.color, width: ink.lineWidth * SCALE, join: ink.join ?? 0 } : null;
}
// Render mode, outline colour/width (page px) and join for painting: a text effect outline, else the original's own
// outline, plus `extra` thickness (the measured weight make-up of the look-alike font): added to the original's own
// outline when it has one, else as filled outline copies (smear, see textpaint.js paintSmear; an outline only for
// see-through text), exactly as fontmatch.js pickWriter writes it into the PDF.
// path: draw the look-alike as its united outline even without a make-up (when that matched the original better).
function inkSpec(item, fxOutline, extra = 0, path = false) {
  if (fxOutline) return { render: fxOutline.hollow ? 1 : 2, stroke: fxOutline.color, lineWidth: fxOutline.width, join: 1, smear: 0, path: false };
  const own = ownOutline(item), clear = item.ink?.fillAlpha < 1;
  if (own) {
    if (own.render === 2 && (extra > 0 || path) && !clear) return { render: 2, stroke: own.color, lineWidth: own.width, join: own.join, smear: extra, path: true };
    return { render: own.render, stroke: own.color, lineWidth: own.width + extra, join: own.join, smear: 0, path: false };
  }
  if (!(extra > 0) && !path) return { render: 0, stroke: null, lineWidth: 0, join: 0, smear: 0, path: false };
  return clear ? { render: 2, stroke: item.color, lineWidth: extra, join: 1, smear: 0, path: false } : { render: 0, stroke: null, lineWidth: 0, join: 0, smear: extra, path: true };
}

// Look-alike text, run by run with its per-letter-class height factors (as fontmatch.js pickWriter writes it): text,
// or with a weight make-up the united outline path (textpaint.js paintUnion), as the saved PDF draws it.
function paintOpen(ctx, o) {
  let off = 0;
  for (const run of heightRuns(o.text, o.ks)) {
    const sp = scaledSpacing({ charSpacing: o.spPx.charSpacing, wordSpacing: 0, hScale: o.spPx.hScale }, run.k);
    const at = o.x + off, hs = sp.hScale || 1, cs = sp.charSpacing || 0, size = o.S * run.k;
    if (o.smear > 0 || o.path) {
      paintUnion(ctx, { fk: o.fk, text: run.text, x: at, y: o.base, size, hScale: hs, charSpacing: cs, color: o.color, smear: o.smear, alpha: o.alpha ?? 1, stroke: o.stroke, lineWidth: o.render === 2 ? o.lineWidth : 0, join: o.join });
      off += glyphsAdvance(openGlyphs(o.fk, run.text), size, cs) * hs;
    } else {
      off += paintGlyphs(ctx, { family: o.face.family, glyphs: openGlyphs(o.fk, run.text), x: at, y: o.base, size, hScale: hs, charSpacing: cs, color: o.color, render: o.render, stroke: o.stroke, lineWidth: o.lineWidth, join: o.join, alpha: o.alpha ?? 1, onePx: o.onePx });
    }
  }
  return off;
}

/**
 * The look-alike font's weight for a document font, measured on pixels (requirement: never by font name): the
 * original line as pdf.js renders it against each weight of the look-alike family drawn with the same text, size,
 * spacing, outline and pixel grid (textpaint.js inkMetrics / pickWeight). The weight that is not heavier than the
 * original is used, plus a make-up of the missing thickness. Measured at two resolutions R (device px per page px):
 *  - on screen: the resolution the page is shown at, so the browser's own rendering is matched (font hinting rounds
 *    stems to whole pixels: on Linux Chrome draws Arial up to 10% heavier than Liberation Sans, at 1x Carlito crisper
 *    than Calibri);
 *  - for the saved PDF: PDF_R, where hinting no longer matters, i.e. the outlines' own thickness that every viewer
 *    draws (poppler and macOS draw outlines as designed; a screen-matched make-up was +11% heavy in pdftoppm).
 * One measurement per document font, family, slant and R: { weight, strokeEm } or null.
 */
const PDF_R = 12;
const fitCache = new Map();
const screenR = (item) => Math.round(paintRatio(pageOf(item)) * 100) / 100;
// Per box: measured on the box's own original letters (at 1x hinting treats "Male" and "0300…" differently).
const fitKey = (item, R) => (item.font.orig ? `${item.id}|${item.font.orig.key}|${famOf(item.font)}|${!!item.font.italic}|${R}` : null);
// Only while the box keeps the document's style (a font, weight or slant picked by hand is used as picked).
const useFit = (item) => !!(item.font.orig && item.font.useOrig && item.base && fontSig(item.font) === item.base.font);
function fallbackFit(item, R = PDF_R) {
  const key = fitKey(item, R);
  if (!key || !useFit(item)) return Promise.resolve(null);
  if (!fitCache.has(key)) {
    const e = { value: undefined, promise: null };
    e.promise = measureFit(item, R).catch((err) => { console.warn("Weight measurement failed", err); return null; }).then((v) => {
      e.value = v;
      state.items.forEach((i) => i.type === "text" && i.el && fitKey(i, screenR(i)) === key && layoutItem(i));
      return v;
    });
    fitCache.set(key, e);
  }
  return fitCache.get(key).promise;
}
// The measured fit for an item right now: undefined while it is being measured, null when there is none.
function fitNow(item, R) {
  if (!useFit(item)) return null;
  const e = fitCache.get(fitKey(item, R));
  if (!e) { fallbackFit(item, R); return undefined; }
  return e.value;
}
// Weight and slant of the look-alike font file for an item (at resolution R: the screen's by default).
function openSpec(item, R = screenR(item)) {
  const fit = useFit(item) ? fitCache.get(fitKey(item, R))?.value : null;
  return fit ? { bold: fit.weight >= 600, italic: !!item.font.italic, weight: fit.weight } : { bold: !!item.font.bold, italic: !!item.font.italic, weight: item.font.weight ?? null };
}
async function measureFit(item, key) {
  const page = pageOf(item), docFont = itemDocFont(item);
  // the line that was clicked (the one being edited), else the longest
  const l = item.lines0?.[item.fitLine ?? -1]?.text.trim() ? item.lines0[item.fitLine] : (item.lines0 || []).reduce((a, b) => (!a || b.text.trim().length > a.text.trim().length ? b : a), null);
  if (!page || !docFont || !l || !l.box) return null;
  const text = l.text.replace(/\s+$/, "");
  if (!/\S/.test(text)) return null;
  const S = item.size0 || item.size, fam = famOf(item.font), italic = !!item.font.italic;
  // For the saved PDF: letters over ~256 device px are drawn by the browser as plain outlines (no hinting, which still
  // rounds 12 px stems by up to a pixel), i.e. the outline geometry every PDF viewer draws.
  let R = key;
  if (key === PDF_R) { R = Math.max(PDF_R, Math.ceil(320 / S)); while (R > PDF_R && l.box.w * l.box.h * R * R > 16e6) R--; }
  // whole device pixels from the page's corner, as on screen (same sub-pixel position of every letter)
  const box = l.box, bx = Math.floor(box.x * R) / R, by = Math.floor(box.y * R) / R;
  const W = Math.ceil((box.x + box.w - bx) * R), H = Math.ceil((box.y + box.h - by) * R);
  if (W < 4 || H < 4 || W * H > 16e6) return null;
  const paper = box.color || [255, 255, 255], color = item.color, spPx = spacingPx(item);
  // 1. the original line exactly as pdf.js renders it
  const pdfPage = await state.sources[page.src].doc.getPage(page.index + 1);
  const viewport = pdfPage.getViewport({ scale: SCALE * R, rotation: (page.baseRotate + page.extraRotate) % 360 });
  const tc = document.createElement("canvas");
  tc.width = W; tc.height = H;
  const tctx = tc.getContext("2d", { willReadFrequently: true });
  await pdfPage.render({ canvasContext: tctx, viewport, transform: [1, 0, 0, 1, -bx * R, -by * R] }).promise;
  const target = inkMetrics(tctx.getImageData(0, 0, W, H), paper, color);
  // 2. the look-alike family's weights, painted the same way on the same pixel grid
  const draw = async (weight, extra, path = false) => {
    const file = metricFile(fam, weight >= 600, italic, weight);
    const fk = await openFontAsync(file), face = paintFace(file);
    await face?.promise;
    if (!fk || !face?.ready) return null;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = css(paper); ctx.fillRect(0, 0, W, H);
    ctx.setTransform(R, 0, 0, R, -bx * R, -by * R);
    const keep = [...text].filter((ch) => /\s/.test(ch) || fk.hasGlyphForCodePoint(ch.codePointAt(0))).join("");
    paintOpen(ctx, { fk, face, ks: heightMatchByClass(docFont, fk), text: keep, x: l.left, base: l.baseline, S, spPx, color, ...inkSpec(item, null, extra, path), alpha: item.ink?.fillAlpha < 1 ? item.ink.fillAlpha : 1, onePx: 1 / R });
    return inkMetrics(ctx.getImageData(0, 0, W, H), paper, color);
  };
  const cands = [];
  for (const weight of METRIC_FAMILIES[fam]?.weights || [400, 700]) { const m = await draw(weight, 0); if (m) cands.push({ weight, m }); }
  const pick = pickWeight(target, cands);
  if (!pick) return null;
  // How far off a rendering is: stroke width and darkness, relative. On screen the ink may also be drawn a little
  // see-through (alpha 0.7..1): at 1x the original small letters can come out greyer than any look-alike weight
  // (darkness scales with alpha, the stroke width does not). The saved PDF is always drawn opaque.
  const screen = key !== PDF_R;
  const fade = (m) => (screen ? Math.max(0.7, Math.min(1, target.dark / m.dark)) : 1);
  const off = (m) => Math.abs(m.w / target.w - 1) + Math.abs((m.dark * fade(m)) / target.dark - 1);
  let best = { path: false, extra: 0, m: pick.m, e: off(pick.m) };
  // Plain text unless it is more than 3% off. Then the united outline (textpaint.js paintUnion) with a make-up that
  // adds about its own width to every stem; a few steps on what it really adds here (the outline goes through the
  // path rasteriser: no hinting, no text contrast), kept only when it comes closer than the plain text.
  if (best.e > 0.03) {
    let extra = Math.max(0, pick.stroke / R), top = best;
    for (let i = 0; i < 4; i++) {
      const m = await draw(pick.weight, extra, true);
      if (!m) break;
      if (off(m) < top.e) top = { path: true, extra, m, e: off(m) };
      const miss = (target.w - m.w) / R;
      if (Math.abs(miss) < (0.003 * target.w) / R) break;
      const next = Math.max(0, extra + miss);
      if (next === extra) break;
      extra = next;
    }
    best = top;
  }
  // The saved PDF gets half of the make-up measured on outlines: viewers disagree on look-alike outlines (poppler draws
  // Liberation Sans as heavy as Arial already, Chrome/pdf.js 6% lighter); half keeps both within about +-4%.
  const extra = key === PDF_R ? best.extra / 2 : best.extra;
  const fit = { weight: pick.weight, strokeEm: +Math.min(0.08, Math.max(0, extra / S)).toFixed(5), path: best.path, alpha: +fade(best.m).toFixed(3) };
  fitLog.push({ font: item.font.origName, family: fam, R, target: { w: +(target.w / R).toFixed(3), dark: +target.dark.toFixed(3) }, cands: cands.map((c) => ({ weight: c.weight, w: +(c.m.w / R).toFixed(3), dark: +c.m.dark.toFixed(3) })), result: { w: +(best.m.w / R).toFixed(3), dark: +best.m.dark.toFixed(3) }, fit });
  return fit;
}
const fitLog = [];


function fillFontSelect() {
  const sel = $("propFont");
  sel.innerHTML = '<option value="orig" id="optOrig">Same as document</option>' +
    Object.entries(METRIC_FAMILIES).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join("");
}

/* ---------- loading ---------- */

async function imageToPdf(bytes, type) {
  const doc = await PDFDocument.create();
  const img = type === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  // 96 px per inch -> PDF points, so the page matches the image's real size.
  const w = img.width * 0.75, h = img.height * 0.75;
  doc.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  return { pdf: await doc.save(), width: img.width, height: img.height };
}

async function blankPdf(w = 595.28, h = 841.89) {
  const doc = await PDFDocument.create();
  doc.addPage([w, h]);
  return doc.save();
}

async function addFile(file, replace) {
  let bytes = new Uint8Array(await file.arrayBuffer());
  let image = null;
  const isImage = /^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  if (isImage) {
    const type = file.type || (/\.png$/i.test(file.name) ? "image/png" : "image/jpeg");
    try {
      const r = await imageToPdf(bytes, type);
      image = { type, width: r.width, height: r.height };
      bytes = r.pdf;
    } catch {
      return toast("This image could not be opened. Use a PNG or JPG file.");
    }
  }
  await addPdf(bytes, file.name, replace, image);
}

// fontkit (reading and embedding font files, about 700 KB) is loaded the first time a file is opened.
let fontkitLoading = null;
const fontkitReady = () => (window.fontkit ? Promise.resolve() : (fontkitLoading ||= loadScript(new URL("lib/fontkit.umd.min.js", import.meta.url).href).catch((e) => { fontkitLoading = null; throw e; })));

async function loadSource(bytes, image = null) {
  await fontkitReady().catch(() => console.warn("fontkit unavailable: document fonts will be replaced by open fonts"));
  // fontExtraProperties keeps each font's code -> character map (toFontChar) for painting edited text like pdf.js.
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false, fontExtraProperties: true }).promise;
  const lib = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return state.sources.push({ bytes, doc, lib, image }) - 1;
}

async function addPdf(bytes, name, replace, image = null) {
  let src;
  if (replace) {
    state.sources = [];
    state.pages = [];
    state.items = [];
    history.past = [];
    history.future = [];
    select(null);
    pageObserver?.disconnect();
    $("pages").replaceChildren();
    fonts.clear();
    jsFonts.clear();
    fitCache.clear();
    state.fileName = (name || "document").replace(/\.(pdf|png|jpe?g)$/i, "");
  }
  try {
    src = await loadSource(bytes, image);
  } catch (e) {
    toast(e?.name === "PasswordException" ? "This PDF is password-protected. Remove the password first." : "This file could not be opened as a PDF.");
    return;
  }
  const doc = state.sources[src].doc;
  document.body.classList.add("loading");
  for (let i = 0; i < doc.numPages; i++) {
    const pdfPage = await doc.getPage(i + 1);
    const page = { id: nextId++, src, index: i, baseRotate: pdfPage.rotate, extraRotate: 0 };
    state.pages.push(page);
    buildPageShell(page);
    if (i === 0 && (replace || state.pages.length === 1)) autoZoom(pdfPage);
    await renderPage(page);
  }
  document.body.classList.remove("loading");
  refreshChrome();
  commit(replace);
}

async function openFiles(files, replace) {
  const ok = [...files].filter((f) => /pdf|png|jpe?g/i.test(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name));
  if (!ok.length) return toast("Please choose a PDF, PNG or JPG file.");
  for (const [i, f] of ok.entries()) await addFile(f, replace && i === 0);
}

async function startBlank() {
  await addPdf(await blankPdf(), "new-document.pdf", true);
  setTool("text");
  toast("Blank A4 page ready. Click on it to add text, or add images, shapes and a signature.");
}

function buildPageShell(page, after = null) {
  const wrap = document.createElement("div");
  wrap.className = "page-wrap";
  const tools = document.createElement("div");
  tools.className = "page-tools";
  tools.innerHTML = '<span class="num"></span><span class="ocr-status"></span><button data-act="ocr">Find text</button><button data-act="rotate">Rotate</button><button data-act="up" title="Move up">↑</button><button data-act="down" title="Move down">↓</button><button data-act="dup">Duplicate</button><button data-act="blank">+ Blank page</button><button data-act="remove">Delete page</button>';
  tools.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (act === "ocr") runOcr(page);
    if (act === "rotate") rotatePage(page);
    if (act === "up") movePage(page, -1);
    if (act === "down") movePage(page, 1);
    if (act === "dup") duplicatePage(page);
    if (act === "blank") insertBlankAfter(page);
    if (act === "remove") removePage(page);
  });
  const box = document.createElement("div");
  box.className = "page-box";
  const el = document.createElement("div");
  el.className = "page";
  const canvas = document.createElement("canvas");
  const hits = document.createElement("div");
  hits.className = "layer hits";
  const items = document.createElement("div");
  items.className = "layer items";
  el.append(canvas, hits, items);
  box.append(el);
  wrap.append(tools, box);
  if (after) after.wrap.after(wrap);
  else $("pages").append(wrap);
  Object.assign(page, { wrap, box, el, canvas, hits, itemsLayer: items, tools });
  pageObserver?.observe(box);
  el.addEventListener("pointerdown", (e) => onPagePointerDown(e, page));
  el.addEventListener("pointermove", (e) => {
    if (!collab.session) return;
    const q = pointIn(page, e);
    lastPointer = { page: state.pages.indexOf(page), x: Math.round(q.x), y: Math.round(q.y) };
    collabPresenceSoon();
  });
}

function sizeBox(page) {
  const z = state.zoom;
  page.el.style.transform = z === 1 ? "" : `scale(${z})`;
  page.box.style.width = page.cssW * z + "px";
  page.box.style.height = page.cssH * z + "px";
}

/* ---------- sharp pages ----------
 * Every position in the editor is in page pixels (SCALE per PDF point). page.canvas holds the page at
 * 1 device pixel per page pixel; every pixel check (ink colour, hidden text, OCR) reads it, so those
 * checks never depend on the screen. Over it, pages near the visible area get a sharp copy drawn with
 * device pixels x zoom per page pixel, so the document's own text is as crisp as the new text drawn
 * over it (a 1x picture on a 2x screen, or zoomed in, looks soft and grey next to crisp new text,
 * which made edits easy to spot). The sharp copy is dropped again when the page scrolls far away.
 */
const MAX_CANVAS_AREA = 16e6; // browsers refuse bigger canvases (iOS Safari: 16.7 M pixels)
function sharpRatio(page) {
  const r = (window.devicePixelRatio || 1) * state.zoom;
  return Math.max(1, Math.min(r, 4, Math.sqrt(MAX_CANVAS_AREA / Math.max(1, page.cssW * page.cssH))));
}
function dropSharp(page) {
  page.sharpTask?.cancel();
  page.sharpGen = (page.sharpGen || 0) + 1;
  const had = !!page.sharp;
  if (page.sharp) { page.sharp.width = page.sharp.height = 0; page.sharp.remove(); page.sharp = null; }
  page.sharpR = 1;
  if (had) refreshPaint(page); // painted text follows the page picture's resolution
}
// The page picture changed resolution: look-alike lines take that resolution's measured weight, then everything is
// painted again on the new pixel grid.
function refreshPaint(page) {
  for (const [item, p] of painted) if (p.pageId === page.id && item.el?.isConnected && /open/.test(item.el.dataset.paint || "")) layoutItem(item);
  repaintPage(page);
}
async function sharpen(page) {
  if (!page.rendered || page.visible === false || !page.cssW) return;
  const r = sharpRatio(page);
  if (Math.abs(r - (page.sharpR || 1)) < 0.05) return;
  if (r <= 1.01) return dropSharp(page);
  const gen = (page.sharpGen = (page.sharpGen || 0) + 1);
  page.sharpTask?.cancel();
  try {
    const pdfPage = await state.sources[page.src].doc.getPage(page.index + 1);
    if (gen !== page.sharpGen) return;
    const viewport = pdfPage.getViewport({ scale: SCALE * r, rotation: (page.baseRotate + page.extraRotate) % 360 });
    const c = document.createElement("canvas");
    c.className = "sharp";
    c.width = Math.round(page.cssW * r);
    c.height = Math.round(page.cssH * r);
    Object.assign(c.style, { width: page.cssW + "px", height: page.cssH + "px" });
    page.sharpTask = pdfPage.render({ canvasContext: c.getContext("2d"), viewport });
    await page.sharpTask.promise;
    if (gen !== page.sharpGen) { c.width = c.height = 0; return; }
    if (page.sharp) { page.sharp.width = page.sharp.height = 0; page.sharp.remove(); }
    page.canvas.after(c);
    page.sharp = c;
    page.sharpR = r;
    refreshPaint(page);
  } catch (e) {
    if (e?.name !== "RenderingCancelledException") console.warn("Sharp page render failed", e);
  }
}
let sharpTimer = 0;
function sharpenSoon() {
  clearTimeout(sharpTimer);
  sharpTimer = setTimeout(() => state.pages.forEach((p) => sharpen(p)), 120);
}
const pageObserver = typeof IntersectionObserver === "function"
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const page = state.pages.find((p) => p.box === e.target);
      if (!page) continue;
      page.visible = e.isIntersecting;
      if (page.visible) sharpen(page);
      else if (page.sharp) dropSharp(page);
    }
  }, { root: $("viewer"), rootMargin: "100% 0px" })
  : null;
window.addEventListener("resize", sharpenSoon);

async function renderPage(page) {
  const pdfPage = await state.sources[page.src].doc.getPage(page.index + 1);
  const viewport = pdfPage.getViewport({ scale: SCALE, rotation: (page.baseRotate + page.extraRotate) % 360 });
  page.viewport = viewport;
  dropSharp(page);
  const { canvas } = page;
  canvas.width = page.cssW = Math.floor(viewport.width);
  canvas.height = page.cssH = Math.floor(viewport.height);
  page.el.style.width = canvas.width + "px";
  page.el.style.height = canvas.height + "px";
  sizeBox(page);
  await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  const content = await pdfPage.getTextContent();
  page.hits.replaceChildren();
  page.runs = [];
  let count = 0;
  for (const t of content.items) {
    if (!t.str || !t.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, t.transform);
    const size = Math.hypot(tx[2], tx[3]);
    if (size < 2 || Math.abs(tx[1]) > 0.01 * size) continue; // rotated text runs are not editable
    let baseFont = "", js = null;
    try {
      const jf = pdfPage.commonObjs.get(t.fontName);
      baseFont = jf?.name || "";
      if (jsFontUsable(jf)) { js = `${page.src}:${t.fontName}`; jsFonts.set(js, jf); }
    } catch {}
    const traits = fontTraits(baseFont);
    if (!baseFont && content.styles[t.fontName]?.fontFamily === "serif") traits.family = "serif";
    if (!baseFont && content.styles[t.fontName]?.fontFamily === "monospace") traits.family = "mono";
    const run = {
      kind: "pdf",
      str: t.str,
      left: tx[4],
      baseline: tx[5],
      size,
      width: t.width * SCALE,
      baseFont,
      js,
      font: traits,
      pdf: { x: t.transform[4], y: t.transform[5], width: t.width, size: Math.hypot(t.transform[2], t.transform[3]) },
    };
    count++;
    // Text that is not really on show (white on white, hidden behind something, clipped away) is never
    // offered for editing, so it can't come back into view by accident.
    if (!inkUnder(page.canvas, run)) continue;
    addHit(page, run);
  }
  // Filled form fields: their values live in the field's appearance, not in the page text.
  for (const run of widgetRuns(page)) { addHit(page, run); count++; }
  page.hasText = count > 0;
  page.rendered = true;
  repaintPage(page);
  sharpen(page);
  // Ink that is already on the page sets the pen's default colour and width.
  try {
    const annots = await pdfPage.getAnnotations();
    const ink = annots.find((a) => a.subtype === "Ink" && a.color);
    if (ink) page.ink = { color: [...ink.color].slice(0, 3), width: ink.borderStyle?.width || 1, source: "ink annotation" };
  } catch {}
  importComments(page);
  // Pictures and scans have no text layer: read the text from the pixels instead.
  if (!page.hasText && !page.ocrDone && !page.blank) runOcr(page);
}

// Is there visible ink where this text is drawn? (Paper-coloured or covered text has none.)
function inkUnder(canvas, run) {
  const x = Math.max(0, Math.floor(run.left)), y = Math.max(0, Math.floor(run.baseline - run.size * 0.8));
  const w = Math.min(canvas.width - x, Math.ceil(Math.max(run.width, 2))), h = Math.min(canvas.height - y, Math.ceil(run.size));
  if (w < 2 || h < 2) return false;
  const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(x, y, w, h).data;
  // Paper: the median colour of the box's edge.
  const ring = [];
  for (let i = 0; i < w; i++) ring.push(i * 4, ((h - 1) * w + i) * 4);
  for (let j = 0; j < h; j++) ring.push(j * w * 4, (j * w + w - 1) * 4);
  const paper = [0, 1, 2].map((k) => ring.map((o) => d[o + k]).sort((a, b) => a - b)[ring.length >> 1]);
  for (let i = 0; i < d.length; i += 4) if (Math.max(Math.abs(d[i] - paper[0]), Math.abs(d[i + 1] - paper[1]), Math.abs(d[i + 2] - paper[2])) > 40) return true;
  return false;
}

// Lines of text inside filled form fields (from their appearance streams), as editable runs.
function widgetRuns(page) {
  const scan = pageScan(page);
  if (!scan?.widgets.length) return [];
  const out = [];
  for (const w of scan.widgets) {
    const shows = scan.shows.filter((s) => s.widget === w.index && s.text.trim() && s.glyphs.length && s.upright);
    const lines = [];
    for (const s of shows) {
      const line = lines.find((l) => Math.abs(l.y - s.y) < s.size * 0.3);
      if (line) line.shows.push(s); else lines.push({ y: s.y, shows: [s] });
    }
    for (const l of lines) {
      l.shows.sort((a, b) => a.x - b.x);
      const first = l.shows[0], last = l.shows[l.shows.length - 1];
      const g0 = first.glyphs[0], g1 = last.glyphs[last.glyphs.length - 1];
      const text = l.shows.map((s) => s.text).join("");
      const lead = text.length - text.trimStart().length;
      const [left, baseline] = page.viewport.convertToViewportPoint(first.glyphs[Math.min(lead, first.glyphs.length - 1)].x0, g0.y0);
      const [right] = page.viewport.convertToViewportPoint(g1.x1, g1.y1);
      const x0 = first.glyphs[Math.min(lead, first.glyphs.length - 1)].x0;
      out.push({
        kind: "pdf", str: text.trim(), left, baseline, size: first.size * SCALE, width: right - left, widget: w.index,
        baseFont: first.baseFont, font: fontTraits(first.baseFont),
        pdf: { x: x0, y: g0.y0, width: g1.x1 - x0, size: first.size },
      });
    }
  }
  return out;
}

function addHit(page, run) {
  const hit = document.createElement("div");
  hit.className = "hit";
  Object.assign(hit.style, {
    left: run.left + "px",
    top: run.baseline - run.size * BASELINE + "px",
    width: Math.max(run.width, 4) + "px",
    height: run.size * 1.1 + "px",
  });
  hit.title = "Click to edit";
  (page.runs ||= []).push({ run, hit });
  hit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    // Like a text box in Canva: the caret goes where you click (double-click selects a word, triple-click the line),
    // so Delete/Backspace removes only what you mean, never the whole line.
    editExistingText(page, run, hit, false, { x: e.clientX, y: e.clientY });
  });
  page.hits.append(hit);
}

/* ---------- OCR (text inside images) ---------- */

let ocrWorker = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.append(s);
  });
}
async function getOcrWorker() {
  if (!ocrWorker) {
    ocrWorker = (async () => {
      // Next to this script (also when the editor runs from another page, like /pdf-editor-pro/).
      const base = new URL("lib/ocr/", import.meta.url).href;
      if (!window.Tesseract) await loadScript(base + "tesseract.min.js");
      return window.Tesseract.createWorker("eng", 1, {
        workerPath: base + "worker.min.js",
        corePath: base + "core",
        langPath: base + "lang",
        workerBlobURL: false,
        gzip: true,
      });
    })();
  }
  return ocrWorker;
}

async function runOcr(page) {
  if (page.ocrBusy) return;
  page.ocrBusy = true;
  const status = page.tools.querySelector(".ocr-status");
  status.textContent = "Reading text…";
  status.classList.add("busy");
  try {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(page.canvas);
    let found = 0;
    for (const line of data.lines || []) {
      for (const seg of splitLine(line)) {
        if (!seg.str.trim() || seg.confidence < 40) continue;
        addHit(page, seg);
        found++;
      }
    }
    page.ocrDone = true;
    status.textContent = found ? `${found} text pieces found` : "No text found";
  } catch (e) {
    console.error(e);
    status.textContent = "Text reading failed";
  } finally {
    page.ocrBusy = false;
    status.classList.remove("busy");
  }
}

// Table rows come back as one OCR line; split them where the gap between words is wide.
function splitLine(line) {
  const words = (line.words || []).filter((w) => w.text.trim());
  if (!words.length) return [];
  const rowH = line.rowAttributes?.row_height || line.bbox.y1 - line.bbox.y0;
  const segs = [];
  let cur = [words[0]];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].bbox.x0 - words[i - 1].bbox.x1;
    if (gap > rowH * 1.2) { segs.push(cur); cur = []; }
    cur.push(words[i]);
  }
  segs.push(cur);
  const bl = line.baseline;
  return segs.map((ws) => {
    const x0 = Math.min(...ws.map((w) => w.bbox.x0)), x1 = Math.max(...ws.map((w) => w.bbox.x1));
    const y0 = Math.min(...ws.map((w) => w.bbox.y0)), y1 = Math.max(...ws.map((w) => w.bbox.y1));
    const mid = (x0 + x1) / 2;
    const baseline = bl && bl.x1 !== bl.x0 ? bl.y0 + ((bl.y1 - bl.y0) * (mid - bl.x0)) / (bl.x1 - bl.x0) : y1;
    const size = Math.max(6, rowH);
    return {
      kind: "ocr",
      str: ws.map((w) => w.text).join(" "),
      left: x0,
      baseline,
      size,
      width: x1 - x0,
      box: { x0, y0, x1, y1 },
      font: { family: "sans", bold: false, italic: false },
      confidence: Math.min(...ws.map((w) => w.confidence)),
    };
  });
}

/* ---------- editing existing text ---------- */

// Distance to the next line of the same paragraph (same font and size, overlapping columns),
// so new lines typed into a text keep the document's line spacing.
function neighbourGap(page, run) {
  let best = null;
  for (const { run: o } of page.runs || []) {
    if (o === run || o.baseFont !== run.baseFont || Math.abs(o.size - run.size) > run.size * 0.06) continue;
    if (o.left > run.left + run.width || run.left > o.left + o.width) continue;
    const d = Math.abs(o.baseline - run.baseline);
    if (d >= run.size * 0.95 && d <= run.size * 2.6 && (best === null || d < best)) best = d;
  }
  return best;
}

// Fill colour of a run straight from the content stream (cached on the run).
function runFill(page, run) {
  if (run._fill === undefined) {
    const scan = run.kind === "pdf" ? pageScan(page) : null;
    run._fill = scan ? String(runStyle(scan, run.pdf)?.fill || "") : "";
  }
  return run._fill;
}

// The paragraph a clicked run belongs to, like a text box in a design tool: lines in the same font,
// size and colour, one line-spacing apart, sharing a left edge, a centre or a right edge (left, centred,
// right-aligned or justified text). Each line also takes the other pieces of the same baseline that
// continue it. Returns { lines: [{ runs, text, left, baseline, width }], index, gap, align }.
function paragraphOf(page, run) {
  const free = (page.runs || []).filter((r) => r.hit.isConnected && r.run.kind === "pdf").map((r) => r.run);
  const S = run.size, fill = runFill(page, run);
  // Same font, size and colour, and in the same place (page text vs one form field). When the colour can't
  // be read from the PDF, the colour of the ink on screen has to match instead.
  const ink = (r) => (r._ink ||= sampleColors(page.canvas, r.left, r.baseline - r.size * 0.8, Math.max(r.width, 2), r.size).ink);
  const same = (o) => o.baseFont === run.baseFont && Math.abs(o.size - S) <= S * 0.03 && (o.widget ?? null) === (run.widget ?? null) &&
    runFill(page, o) === fill && (fill || Math.max(...ink(o).map((v, i) => Math.abs(v - ink(run)[i]))) < 40);
  const cache = new Map();
  // A label and its value ("Contact Detail:" + "03004164269,") are two columns, not one line, even when the gap
  // between them is under the joining distance: wider than a word space in running text (pdf.js itself starts a new
  // run past 0.6 em) after a colon. Joined, an edited value was redrawn one space after its label, out of its column.
  const columnGap = (l, r) => /:\s*$/.test(l.str) && r.left - (l.left + l.width) > S * 0.6;
  const lineOf = (r0) => {
    if (cache.has(r0)) return cache.get(r0);
    const line = [r0];
    for (let dir of [-1, 1]) {
      let edge = r0;
      for (;;) {
        const next = free.filter((o) => !line.includes(o) && same(o) && Math.abs(o.baseline - r0.baseline) < S * 0.15 &&
          (dir > 0 ? o.left >= edge.left + edge.width - S * 0.3 && o.left - (edge.left + edge.width) < S * 1.2 && !columnGap(edge, o)
                   : o.left + o.width <= edge.left + S * 0.3 && edge.left - (o.left + o.width) < S * 1.2 && !columnGap(o, edge)))
          .sort((a, b) => (dir > 0 ? a.left - b.left : b.left - a.left))[0];
        if (!next) break;
        line.push(next);
        edge = next;
      }
    }
    line.sort((a, b) => a.left - b.left);
    let text = "";
    line.forEach((o, i) => { text += (i && o.left - (line[i - 1].left + line[i - 1].width) > S * 0.15 && !/\s$/.test(text) ? " " : "") + o.str; });
    const left = line[0].left, last = line[line.length - 1];
    const L = { runs: line, text, left, baseline: r0.baseline, width: last.left + last.width - left };
    for (const o of line) cache.set(o, L);
    return L;
  };
  const first = lineOf(run);
  // Table rows are separate boxes: a border (any horizontal rule) between two lines puts them in different cells, so
  // they never join into one paragraph (a column of 8 rows used to become one box; editing one cell re-flowed all).
  const vpPt = (x, y) => page.viewport.convertToViewportPoint(x, y);
  const hRules = (pageScan(page)?.rules || []).map((ru) => { const [ax, ay] = vpPt(ru.x1, ru.y1), [bx, by] = vpPt(ru.x2, ru.y2); return { x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by) }; })
    .filter((r) => r.y1 - r.y0 < 1.5 && r.x1 - r.x0 >= 4);
  const ruledBetween = (A, B) => {
    const up = A.baseline <= B.baseline ? A : B, dn = up === A ? B : A;
    const yTop = up.baseline + S * 0.3, yBot = dn.baseline - S * 0.75;
    const lo = Math.min(up.left, dn.left), hi = Math.max(up.left + up.width, dn.left + dn.width);
    if (hRules.some((r) => (r.y0 + r.y1) / 2 > yTop && (r.y0 + r.y1) / 2 < yBot && r.x0 < hi && r.x1 > lo)) return true;
    // Table/form rows without borders: both lines have other text on their own baseline across a column gap (a label
    // with its value, a description with its amount). Those are rows of a table, not lines of one paragraph.
    return rowPartner(up) && rowPartner(dn);
  };
  const rowPartner = (L) => (L._partner ??= free.some((o) => !L.runs.includes(o) && Math.abs(o.baseline - L.baseline) < S * 0.2 &&
    (o.left > L.left + L.width + S * 1.5 || o.left + o.width < L.left - S * 1.5)));
  // Another line of text between two lines (same column, normal size: not a superscript) means they are not
  // consecutive lines of one paragraph. Without this a form's value column joined "Male" with the address two rows
  // below, skipping the phone number between them, and that box then covered the phone number.
  const between = (A, B) => {
    const lo = Math.min(A.baseline, B.baseline) + S * 0.45, hi = Math.max(A.baseline, B.baseline) - S * 0.45;
    const x0 = Math.min(A.left, B.left), x1 = Math.max(A.left + A.width, B.left + B.width);
    return (page.runs || []).some(({ run: o }) => !A.runs.includes(o) && !B.runs.includes(o) && o.size >= S * 0.8 && o.baseline > lo && o.baseline < hi && o.left < x1 && o.left + o.width > x0);
  };
  const anchor = { left: (l) => l.left, right: (l) => l.left + l.width, center: (l) => l.left + l.width / 2 };
  const tol = { left: S * 0.25, right: S * 0.3, center: S * 0.5 };
  let best = null;
  for (const mode of ["left", "right", "center"]) {
    const a0 = anchor[mode](first);
    const fits = (L) => Math.abs(anchor[mode](L) - a0) < tol[mode];
    // Line spacing: the nearest line above or below that lines up the same way.
    let gap = null;
    for (const o of free) {
      if (!same(o) || first.runs.includes(o)) continue;
      const d = Math.abs(o.baseline - first.baseline);
      if (d < S * 0.95 || d > S * 2.6 || (gap !== null && d >= gap)) continue;
      if (fits(lineOf(o)) && !ruledBetween(first, lineOf(o)) && !between(first, lineOf(o))) gap = d;
    }
    const lines = [first], used = new Set([first]);
    if (gap) {
      for (const dir of [1, -1]) {
        for (let y = first.baseline + dir * gap; lines.length < 60; y += dir * gap) {
          const near = [...new Set(free.filter((o) => same(o) && Math.abs(o.baseline - y) < S * 0.12).map(lineOf))].filter((L) => !used.has(L) && fits(L));
          const L = near.sort((a, b) => Math.abs(anchor[mode](a) - a0) - Math.abs(anchor[mode](b) - a0))[0];
          const prev = dir > 0 ? lines[lines.length - 1] : lines[0];
          if (!L || ruledBetween(prev, L) || between(prev, L)) break;
          used.add(L);
          if (dir > 0) lines.push(L); else lines.unshift(L);
        }
      }
    }
    if (!best || lines.length > best.lines.length) best = { mode, lines, gap };
  }
  let align = best.mode;
  if (best.lines.length > 1) {
    // Left and right edges both line up (all but the last line): justified text.
    const body = best.lines.slice(0, -1), right = Math.max(...body.map(anchor.right));
    // Two lines are not enough to tell (a short last line is normal for left-aligned text too).
    if (align === "left" && body.length >= 2 && body.every((l) => right - anchor.right(l) < S * 0.6 && /\s/.test(l.text.trim()))) align = "justify";
  } else {
    // A single line: centred on the page, or ending at the right margin of the page's text.
    const W = page.canvas.width, all = free.length ? free : [run];
    const leftMargin = Math.min(...all.map((o) => o.left)), rightMargin = Math.max(...all.map((o) => o.left + o.width));
    const c = first.left + first.width / 2, r = first.left + first.width;
    if (Math.abs(c - W / 2) < W * 0.02 && first.left > leftMargin + S) align = "center";
    else if (Math.abs(r - rightMargin) < S * 0.5 && first.left > leftMargin + S * 2 && free.some((o) => o.left + o.width < first.left - S)) align = "right";
    else align = "left";
  }
  return { lines: best.lines, index: best.lines.indexOf(first), gap: best.gap, align };
}

function editExistingText(page, run, hit, silent = false, point = null) {
  const top = run.baseline - run.size * BASELINE;
  const box = run.box
    ? { x: run.box.x0 - 2, y: run.box.y0 - 2, w: run.box.x1 - run.box.x0 + 4, h: run.box.y1 - run.box.y0 + 4 }
    : { x: run.left - 1, y: top - 1, w: run.width + 2, h: run.size * 1.1 + 2 };
  const { ink, paper } = sampleColors(page.canvas, box.x, box.y, box.w, box.h);
  let font = { ...run.font }, size = run.size, matched = false, color = ink, spacing = null, lineGap = null, needsCover = run.kind === "ocr", paint = null;
  let st = null;
  if (run.kind === "pdf") {
    // Exact style from the content stream: colour, size, spacing, horizontal scale, leading.
    const scan = pageScan(page);
    st = scan ? runStyle(scan, run.pdf) : null;
    if (st) {
      if (st.fill && !st.invisible) color = st.fill;
      // How the original letters are painted besides their fill (outline modes, stroke, see-through), copied to new text.
      paint = { render: st.render === 1 || st.render === 2 ? st.render : 0, stroke: st.stroke, lineWidth: st.lineWidth, join: st.lineJoin ?? 0, fillAlpha: st.fillAlpha ?? 1, strokeAlpha: st.strokeAlpha ?? 1 };
      if (st.size > 0) size = st.size * SCALE;
      spacing = { charSpacing: st.charSpacing, wordSpacing: st.wordSpacing, hScale: st.hScale };
      if (st.leading > 0.5) lineGap = st.leading * SCALE;
      needsCover = st.invisible; // OCR text layers: the visible letters are part of the picture
    }
    // The content stream names the font exactly (pdf.js does not always expose it).
    if (st?.baseFont) run.baseFont = st.baseFont;
    try { Object.assign(font, fontTraits(run.baseFont, fontDescriptor(libPage(page), run.baseFont, st?.resources))); } catch {}
  }
  if (run.kind === "ocr" || needsCover) {
    const b = run.box || { x0: run.left, y0: top, x1: run.left + run.width, y1: run.baseline + run.size * 0.2 };
    const m = matchImageFont(page.canvas, b, run.str, run.baseline, ink, paper);
    if (m) { font = { family: m.family, bold: m.bold, italic: false }; if (run.kind === "ocr") size = m.size; matched = true; }
  }
  const origKey = run.kind === "pdf" && run.baseFont ? pdfFont(page, run.baseFont, st?.resources) : null;
  const jfRun = run.js ? jsFonts.get(run.js) : null, entry = origKey ? fonts.get(origKey) : null;
  if (entry && jfRun && !entry.fk && !entry.jsHas) entry.jsHas = (code) => jfRun.toFontChar[code] !== undefined || !!jfRun.missingFile;
  ensureFace(famOf(font), font.bold, font.italic, font.weight);
  // js: the pdf.js font the run was drawn with (edited text is painted through it, see paintPlan)
  const fontState = { ...font, underline: false, orig: origKey ? { key: origKey, pageId: page.id } : null, useOrig: !!origKey, origName: run.baseFont ? prettyFont(run.baseFont) : null, matched, js: run.kind === "pdf" ? run.js || null : null };

  // Picture (OCR) text: one line with a cover, as before.
  if (run.kind !== "pdf") {
    hit.remove();
    const item = addItem({ type: "text", pageId: page.id, x: run.left, baseline: run.baseline, size, font: fontState, color, text: run.str,
      cover: { ...box, color: paper }, needsCover: true, source: null, spacing, lineGap: lineGap || neighbourGap(page, run) || size * 1.2, runs: [run] }, false);
    if (!silent) focusText(item, true);
    return item;
  }

  // Text in the PDF: the whole paragraph becomes one editable box; only lines that change are rewritten.
  const para = paragraphOf(page, run);
  const cell = cellOf(page, run);
  const lines0 = para.lines.map((l) => {
    // Paper patch (only used if the letters can't be taken out of the PDF): never over a table border.
    const b = clipToCell({ x: l.left - 1, y: l.baseline - size * BASELINE - 1, w: l.width + 2, h: size * 1.1 + 2 }, cell);
    return { text: l.text, left: l.left, baseline: l.baseline, box: { ...b, color: sampleColors(page.canvas, b.x, b.y, b.w, b.h).paper }, sources: l.runs.map((r) => r.pdf), runs: l.runs };
  });
  const runs = para.lines.flatMap((l) => l.runs);
  for (const r of runs) page.runs.find((x) => x.run === r)?.hit.remove();
  lineGap = para.gap || lineGap || neighbourGap(page, run) || size * 1.2;
  // The box: lines keep their alignment, and a paragraph wraps inside its own width when a line gets longer.
  const align = para.align, multi = para.lines.length > 1;
  const widest = Math.max(...para.lines.map((l) => l.width));
  const boxW = multi || align !== "left" ? widest : null;
  const x = align === "center" ? Math.min(...para.lines.map((l) => l.left + l.width / 2)) - widest / 2
    : align === "right" ? Math.max(...para.lines.map((l) => l.left + l.width)) - widest
    : Math.min(...lines0.map((l) => l.left));
  const baseline = lines0[0].baseline;
  const data = {
    type: "text", pageId: page.id, x, baseline, size, font: fontState, color, text: lines0.map((l) => l.text).join("\n"),
    lines0, needsCover, spacing, lineGap, runs, align, boxW, wrap: multi, justifyHard: align === "justify", ink: paint,
    widget: run.widget ?? null, fontStream: st?.stream ?? 0, cell, size0: size, lineGap0: lineGap, fitLine: para.index,
  };
  data.base = { x, baseline, size, lineGap, color: [...color], font: fontSig(fontState), style: styleSig(data) };
  const item = addItem(data, false);
  // Measure the original letters' weight now (in the background), so a line that needs the look-alike font is
  // already drawn at the right weight when the first missing letter is typed.
  // (subset fonts, "ABCDEF+Name", are the ones that miss letters; others are measured when first needed)
  if (origKey && /^[A-Z]{6}\+/.test(run.baseFont)) { fallbackFit(item, screenR(item)); fallbackFit(item, PDF_R); }
  if (!silent) { if (point) focusAt(item, point, para.index); else focusLine(item, para.index); }
  return item;
}

// Caret at a screen point inside an item's text (falls back to the end of the clicked line).
function focusAt(item, point, index) {
  item.editing = true;
  layoutItem(item);
  item.span.focus({ preventScroll: true });
  let range = null;
  try {
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(point.x, point.y);
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(point.x, point.y); if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); } }
  } catch { range = null; }
  if (!range || !item.span.contains(range.startContainer)) {
    const node = item.span.firstChild, lines = item.text.split("\n");
    if (!node) return focusText(item, false);
    const end = lines.slice(0, Math.max(0, index) + 1).reduce((n, l) => n + l.length + 1, 0) - 1;
    range = document.createRange(); range.setStart(node, Math.max(0, Math.min(end, node.length)));
  }
  range.collapse(true);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
}

// The table cell (or form field) a run sits in, in page pixels: the nearest borders around it.
function cellOf(page, run) {
  const scan = pageScan(page);
  if (!scan) return null;
  const vp = (x, y) => page.viewport.convertToViewportPoint(x, y);
  if (run.widget != null && scan.widgets[run.widget]) {
    const r = scan.widgets[run.widget].rect, [l, t] = vp(r[0], r[3]), [rr, b] = vp(r[2], r[1]), pad = 2 * SCALE;
    return { left: Math.min(l, rr) + pad, right: Math.max(l, rr) - pad, top: Math.min(t, b), bottom: Math.max(t, b) };
  }
  const mid = run.baseline - run.size * 0.35;
  const cell = {};
  for (const ru of scan.rules) {
    const [ax, ay] = vp(ru.x1, ru.y1), [bx, by] = vp(ru.x2, ru.y2);
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    if (x1 - x0 < 1.5 && y0 <= mid && y1 >= mid) {
      if (x0 > run.left + 1 && (cell.right === undefined || x0 < cell.right)) cell.right = x0;
      if (x1 < run.left - 0.5 && (cell.left === undefined || x1 > cell.left)) cell.left = x1;
    } else if (y1 - y0 < 1.5 && x0 <= run.left + 1 && x1 >= run.left + 1) {
      if (y0 > run.baseline && (cell.bottom === undefined || y0 < cell.bottom)) cell.bottom = y0;
      if (y1 < run.baseline - run.size * 0.6 && (cell.top === undefined || y1 > cell.top)) cell.top = y1;
    }
  }
  return Object.keys(cell).length ? cell : null;
}
// Shrinks a patch so it stays inside the cell (a border line is never painted over).
function clipToCell(b, cell) {
  if (!cell) return b;
  let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
  if (cell.left !== undefined) x0 = Math.max(x0, cell.left + 1);
  if (cell.right !== undefined) x1 = Math.min(x1, cell.right - 1);
  if (cell.top !== undefined) y0 = Math.max(y0, cell.top + 1);
  if (cell.bottom !== undefined) y1 = Math.min(y1, cell.bottom - 1);
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}
// Longer text stays inside its table cell or form field: it wraps inside the cell when there is room below,
// otherwise it shrinks (down to 60%) so it never runs over a border. Text that fits is left exactly as it is.
function fitCell(item) {
  if (item.type !== "text" || !item.cell || !item.size0) return;
  const c = item.cell;
  if (item.boxW0 === undefined) { item.boxW0 = item.boxW ?? null; item.wrap0 = !!item.wrap; }
  const left = !item.align || item.align === "left" || item.align === "justify";
  const avail = c.right === undefined ? null : left ? c.right - item.x - item.size0 * 0.12 : c.left !== undefined ? c.right - c.left - item.size0 * 0.24 : null;
  const roomH = c.bottom === undefined ? Infinity : c.bottom - (item.baseline - item.size0 * 0.8) - item.size0 * 0.1;
  const fits = (k, cellWrap) => {
    item.size = item.size0 * k;
    item.lineGap = item.lineGap0 * k;
    if (cellWrap) { item.boxW = Math.max(item.boxW0 ?? 0, avail); item.wrap = true; } else { item.boxW = item.boxW0; item.wrap = item.wrap0; }
    const lines = displayLines(item);
    return !(avail !== null && lines.some((l) => l.width > avail + 0.5)) && (lines.length - 1) * item.lineGap + item.size <= roomH;
  };
  const canWrap = left && avail !== null && (roomH >= item.size0 * 2.2 || item.text.includes("\n") || item.wrap0);
  // A paragraph in a cell wraps at the cell's width, not at its widest line: in a column of values (name, ID
  // number, …) a longer value just runs on to the right inside its cell and the lines below stay where they are.
  if (canWrap && item.wrap0 && fits(1, true)) return;
  if (fits(1, false)) return;
  if (canWrap && fits(1, true)) return;
  for (let k = 0.95; k >= 0.6 - 1e-9; k -= 0.05) if ((canWrap && fits(k, true)) || fits(k, false)) return;
  fits(0.6, canWrap);
}

// Selects one line of a text box (typing replaces that line; Enter adds a line below it).
function focusLine(item, index) {
  item.editing = true;
  layoutItem(item);
  item.span.focus();
  const node = item.span.firstChild;
  const lines = item.text.split("\n");
  if (!node || index < 0) return focusText(item, true);
  const start = lines.slice(0, index).reduce((n, l) => n + l.length + 1, 0);
  const range = document.createRange();
  range.setStart(node, Math.min(start, node.length));
  range.setEnd(node, Math.min(start + lines[index].length, node.length));
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

const fontSig = (f) => JSON.stringify([famOf(f), !!f.bold, !!f.italic, !!f.underline, !!f.useOrig]);
// Wrap width and wrapping move nothing in left-aligned text (a line that keeps its words stays where it is), so
// for left alignment they don't count as a restyle: widening the box to its cell must not rewrite every line.
const styleSig = (i) => { const left = (i.align || "left") === "left"; return JSON.stringify([i.align || "left", left ? null : i.boxW ?? null, left ? null : !!i.wrap, i.spacing || null, i.fx || null]); };
// Which original lines changed (lines as drawn, after wrapping): a moved or restyled box rewrites every line.
function linePlan(item) {
  const display = displayLines(item);
  const lines = display.map((l) => l.text.replace(/\s+$/, ""));
  const o = item.lines0 || [], b = item.base;
  const restyled = !b || item.x !== b.x || item.baseline !== b.baseline || item.size !== b.size || item.lineGap !== b.lineGap || String(item.color) !== String(b.color) || fontSig(item.font) !== b.font || styleSig(item) !== b.style;
  const changed = lines.map((l, i) => restyled || i >= o.length || l !== o[i].text.replace(/\s+$/, ""));
  const gone = o.map((_, i) => i >= lines.length || changed[i]);
  return { lines, display, changed, gone, restyled };
}

// The document font this text box may use (it is used line by line wherever it has every letter).
function itemDocFont(item) {
  const o = item.font.orig;
  return o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
}
const fontCssOf = (item) => `${item.font.italic ? "italic" : "normal"} ${item.font.bold ? "700" : "400"} ${item.size}px ${CSS_FONT[famOf(item.font)]}`;
const spacingPx = (item) => { const sp = item.spacing || {}; return { charSpacing: (sp.charSpacing || 0) * SCALE, wordSpacing: (sp.wordSpacing || 0) * SCALE, hScale: sp.hScale || 1 }; };
const docWidth = (font, text, size) => [...text].reduce((w, ch) => w + (font.info.known ? font.info.width(font.uniToCode.get(ch)) / 1000 * size : size * 0.5), 0);
// Drawn width of a line (page pixels), in the document's font when it writes the line, else the open font.
function lineWidth(item, text, docFont = itemDocFont(item)) {
  const wOf = docFont && docFont.canWrite(text) ? (t) => docWidth(docFont, t, item.size) : (t) => textWidth(t, fontCssOf(item));
  return spacedWidth(wOf, text, spacingPx(item));
}
/**
 * The lines of a text box as drawn: typed line breaks, plus automatic breaks where a line is wider than
 * the box (when the box wraps). Each: { text, width, hard, justify }.
 */
function displayLines(item) {
  const docFont = itemDocFont(item);
  const W = (t) => lineWidth(item, t, docFont);
  const wrapAt = item.wrap && item.boxW && !item.fx?.curve ? item.boxW : null;
  const out = [];
  item.text.split("\n").forEach((h) => {
    const parts = wrapAt && W(h.replace(/\s+$/, "")) > wrapAt + 0.5 ? wrapText(h, wrapAt, W) : [h];
    parts.forEach((t, i) => out.push({ text: t, hard: i === parts.length - 1 }));
  });
  const just = item.align === "justify";
  return out.map((l, i) => {
    const next = out[i + 1];
    return { ...l, width: W(l.text.replace(/\s+$/, "")), justify: just && !!next && !!next.text.trim() && (!l.hard || !!item.justifyHard) && /\S\s+\S/.test(l.text.trim()) };
  });
}

function prettyFont(name) {
  return stripSubset(name).replace(/-\d+$/, "").replace(/(PS)?MT$/, "").replace(/[-,_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
}

// Picture text has no font name: draw the same words in each candidate font, scaled to the
// same width, and keep the one whose letter shapes overlap the original pixels best.
function matchImageFont(canvas, box, text, baselineY, ink, paper) {
  const x0 = Math.round(box.x0), y0 = Math.round(box.y0);
  const w = Math.round(box.x1 - box.x0), h = Math.round(box.y1 - box.y0);
  if (w < 4 || h < 4 || !text.trim()) return null;
  const src = canvas.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, w, h).data;
  const mid = (lum(ink) + lum(paper)) / 2;
  const target = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) target[i] = lum([src[i * 4], src[i * 4 + 1], src[i * 4 + 2]]) < mid ? 1 : 0;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d", { willReadFrequently: true });
  let best = null;
  for (const family of ["sans", "serif", "mono"]) {
    for (const bold of [false, true]) {
      const face = (px) => `${bold ? "bold " : ""}${px}px ${CSS_FONT[family]}`;
      c.font = face(100);
      const m = c.measureText(text);
      const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      if (!inkW) continue;
      const size = (100 * w) / inkW;
      c.fillStyle = "#fff";
      c.fillRect(0, 0, w, h);
      c.font = face(size);
      c.fillStyle = "#000";
      c.fillText(text, c.measureText(text).actualBoundingBoxLeft, baselineY - y0);
      const d = c.getImageData(0, 0, w, h).data;
      let inter = 0, union = 0;
      for (let i = 0; i < w * h; i++) {
        const a = target[i], b = d[i * 4] < 128 ? 1 : 0;
        if (a & b) inter++;
        if (a | b) union++;
      }
      const score = union ? inter / union : 0;
      if (!best || score > best.score) best = { family, bold, size, score };
    }
  }
  return best;
}

const writable = (item) => item.text.split("\n").map((l) => l.replace(/\s+$/, "")).join("");

function styleLabel(item) {
  const orig = activeOrig(item);
  const fam = famOf(item.font);
  const name = orig ? item.font.origName : METRIC_FAMILIES[fam]?.label || fam;
  const where = orig ? "same font as the document"
    : item.font.matched ? "closest match to the picture"
    : item.font.orig && item.font.useOrig ? "closest font: some letters aren't in the document's font"
    : item.font.origName ? "closest font to " + item.font.origName : "";
  const parts = [`<b>${name}</b>`, `${(item.size / SCALE).toFixed(1)} pt`, `<span class="swatch" style="background:${hex(item.color)}"></span> ${hex(item.color)}`];
  if (!orig && item.font.bold) parts.push("Bold");
  if (!orig && item.font.italic) parts.push("Italic");
  if (item.spacing?.charSpacing) parts.push(`spacing ${item.spacing.charSpacing.toFixed(2)}`);
  if (item.text.includes("\n") || item.wrap) parts.push(`line spacing ${(lineGapOf(item) / item.size).toFixed(2)}`);
  if (item.align && item.align !== "left") parts.push({ center: "centred", right: "right-aligned", justify: "justified" }[item.align]);
  return `Detected style: ${parts.join(" · ")}${where ? ` <span class="muted">(${where})</span>` : ""}`;
}

function penLabel() {
  const p = state.pen;
  const kind = { pen: "Pen", marker: "Marker", highlighter: "Highlighter", eraser: "Eraser" }[p.kind];
  if (p.kind === "eraser") return "Eraser: drag over a drawing to remove it.";
  const src = p.source ? ` <span class="muted">(matched to the ${p.source} already in this PDF)</span>` : "";
  return `${kind}: <span class="swatch" style="background:${hex(p.color)}"></span> ${hex(p.color)} · ${(p.width / SCALE).toFixed(2)} pt${src}`;
}

function refreshStyleBar() {
  const item = state.selected;
  const isText = item?.type === "text";
  const pen = state.tool === "draw" && !item;
  $("hint").hidden = isText || pen;
  $("styleInfo").hidden = !isText;
  $("penInfo").hidden = !pen;
  $("removeTextBtn").hidden = !(isText && (item.cover || item.lines0));
  $("restoreBtn").hidden = !(isText && item.runs?.length);
  if (isText) $("styleInfo").innerHTML = styleLabel(item);
  else if (pen) $("penInfo").innerHTML = penLabel();
  else $("hint").textContent = state.pages.length
    ? "Click any text with a dotted outline to change it or remove it. The font, size, colour and spacing are picked up automatically."
    : "Open a file. Every piece of text it finds gets a dotted outline: click one to change or remove it.";
}

/* ---------- items ---------- */

function addItem(data, record = true) {
  const item = { id: uid(), ...data };
  state.items.push(item);
  drawItem(item);
  select(item);
  refreshChrome();
  if (record) commit();
  return item;
}

function setEditable(span) {
  try { span.contentEditable = "plaintext-only"; } catch {}
  if (span.contentEditable !== "plaintext-only") span.contentEditable = "true";
}

function drawItem(item) {
  const page = pageOf(item);
  if (!page) return;
  item.el?.remove();
  item.coverEl?.remove();
  item.coverEls?.forEach((c) => c.remove());
  const el = document.createElement("div");
  el.className = "item " + item.type;

  if (item.type === "text") {
    if (item.lines0) {
      // One patch per original line, shown only while that line is changed (clicking it reopens the text).
      item.coverEls = item.lines0.map((l) => {
        const c = document.createElement("div");
        c.className = "item-cover";
        Object.assign(c.style, { position: "absolute", left: l.box.x + "px", top: l.box.y + "px", width: l.box.w + "px", height: l.box.h + "px", background: css(l.box.color) });
        c.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); focusText(item); });
        page.itemsLayer.append(c);
        return c;
      });
    }
    if (item.cover) {
      // The patch over the old text; clicking it reopens the text for editing (also after "Remove text").
      const c = document.createElement("div");
      c.className = "item-cover";
      Object.assign(c.style, { position: "absolute", left: item.cover.x + "px", top: item.cover.y + "px", width: item.cover.w + "px", height: item.cover.h + "px" });
      c.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); focusText(item); });
      page.itemsLayer.append(c);
      item.coverEl = c;
    }
    const span = document.createElement("span");
    span.className = "txt ghost";
    setEditable(span);
    span.spellcheck = false;
    span.textContent = item.text;
    span.addEventListener("input", () => { item.text = span.innerText.replace(/\r/g, ""); fitCell(item); layoutItem(item); refreshStyleBar(); collabTouch(item); });
    span.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); span.blur(); return; }
      if (e.key === "Enter" && span.contentEditable === "true") { e.preventDefault(); document.execCommand("insertText", false, "\n"); }
    });
    span.addEventListener("paste", (e) => {
      if (span.contentEditable !== "true") return;
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    });
    span.addEventListener("focus", () => { item.editing = true; item.before = item.text; select(item); layoutItem(item); });
    span.addEventListener("blur", () => {
      item.editing = false;
      if (!item.text.trim() && !item.cover && !item.lines0) removeItem(item, false);
      else { layoutItem(item); if (item.text !== item.before) commit(); }
      collabApplyPending(item);
    });
    const back = document.createElement("div");
    back.className = "tbg";
    const preview = document.createElement("div");
    preview.className = "glyphs";
    el.append(back, preview, span);
    item.span = span;
    item.previewEl = preview;
    item.bgEl = back;
    el.append(handle("move", item));
    item.widthHandle = handle("width", item);
    item.widthHandle.title = "Drag to set the text box width (text wraps inside it)";
    el.append(item.widthHandle);
  } else {
    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = "";
      el.append(img);
      if (item.credit) el.title = `Photo: ${item.credit.title || ""} by ${item.credit.author} (${item.credit.license})`;
    }
    if (item.type === "shape" || item.type === "draw") {
      el.innerHTML = shapeSvg(item);
      item.svgEl = el.firstElementChild;
    }
    if (item.type === "link") {
      const label = document.createElement("span");
      label.className = "link-url";
      label.textContent = "🔗 " + item.url;
      el.append(label);
      el.title = item.url;
    }
    if (item.type !== "comment") el.append(handle("size", item));
    el.addEventListener("pointerdown", (e) => {
      if (state.tool === "draw" && state.pen.kind === "eraser") return;
      if (item.type === "comment") { e.stopPropagation(); openComments(item); }
      startDrag(e, item, "move");
    });
    if (item.type === "table") el.addEventListener("dblclick", (e) => editTableCell(item, e));
    if (item.type === "chart") el.addEventListener("dblclick", () => openChartDialog(item));
  }
  el.classList.add("enter");
  page.itemsLayer.append(el);
  item.el = el;
  layoutItem(item);
}

// The PDF's own font is used whenever it has every character typed.
function activeOrig(item) {
  const o = item.font.orig;
  const entry = o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
  return entry && entry.canWrite(writable(item)) ? entry : null;
}

const lineGapOf = (item) => item.lineGap || item.size * 1.2;

// The PDF is written without kerning or ligatures, so text is measured and shown on screen without them too
// (Chrome kerns by default, which drew look-alike-font lines up to 4% narrower than they are saved).
let measureCtx = null;
function textWidth(text, fontCss) {
  measureCtx ||= document.createElement("canvas").getContext("2d");
  measureCtx.font = fontCss;
  if ("fontKerning" in measureCtx) measureCtx.fontKerning = "none"; // PDF text is not kerned either
  return measureCtx.measureText(text).width;
}

const escHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * How one piece of an edited line is painted (see textpaint.js): { kind, w (page px), draw(ctx, x, baseline, onePx) },
 * { wait: true } while a font or the weight measurement is still loading, or null (drawn the old way).
 *  - "doc": the document's own font, through the very font object pdf.js drew the original letters with;
 *  - "open-measured" / "open": the look-alike font (letters the document's font lacks), at the weight measured on the
 *    rendered page (or, without a measurement, the outline-based estimate).
 */
function paintPlan(item, t, { docFont, spPx, fxOutline, S, fam, isPlan }) {
  // Text over a picture (OCR, a patch the page layer can't be under), with a background box or a shadow: as before.
  if (typeof document === "undefined" || item.needsCover || item.cover || item.fx?.bg || item.fx?.shadow) return null;
  const alpha = item.ink?.fillAlpha < 1 ? item.ink.fillAlpha : 1;
  if (docFont && docFont.canWrite(t)) {
    const jf = item.font.js ? jsFonts.get(item.font.js) : null;
    const glyphs = jf ? docGlyphs(docFont, jf, t) : null;
    if (!glyphs) return null;
    const ink = inkSpec(item, fxOutline);
    const bold = jf.black ? "900" : jf.bold ? "bold" : "normal";
    return {
      kind: "doc",
      w: glyphsAdvance(glyphs, S, spPx.charSpacing, spPx.wordSpacing) * spPx.hScale,
      draw: (ctx, x, base, onePx) => paintGlyphs(ctx, { family: jsFontFamily(jf), bold, italic: !!jf.italic, glyphs, x, y: base, size: S, hScale: spPx.hScale, charSpacing: spPx.charSpacing, wordSpacing: spPx.wordSpacing, color: item.color, ...ink, alpha, remeasure: !!jf.remeasure, onePx }),
    };
  }
  if (!isPlan && !docFont) return null;
  const fit = fitNow(item, screenR(item));
  if (fit === undefined) return { wait: true };
  const sp = openSpec(item), file = metricFile(fam, sp.bold, sp.italic, sp.weight);
  const face = paintFace(file), fk = openFontOf(fam, sp.bold, sp.italic, sp.weight);
  if (!face || face.failed) return null;
  if (!face.ready || !fk) return { wait: true };
  if ([...t].some((ch) => !/\s/.test(ch) && !fk.hasGlyphForCodePoint(ch.codePointAt(0)))) return null;
  const extra = fxOutline ? 0 : fit ? fit.strokeEm * S : weightEm(item) * S;
  const ink = inkSpec(item, fxOutline, extra, !fxOutline && !!fit?.path), ks = heightKs(item), upm = fk.unitsPerEm || 1000;
  const w = [...t].reduce((a, ch) => a + ((fk.glyphForCodePoint(ch.codePointAt(0))?.advanceWidth ?? upm / 2) / upm) * S + spPx.charSpacing, 0) * spPx.hScale;
  const a2 = alpha * (fit?.alpha ?? 1); // the screen-measured ink alpha (see measureFit; the saved PDF stays opaque)
  return { kind: fit ? "open-measured" : "open", file, w, draw: (ctx, x, base, onePx) => paintOpen(ctx, { fk, face, ks, text: t, x, base, S, spPx, color: item.color, ...ink, alpha: a2, onePx }) };
}

/*
 * Painted text lives in ONE layer per page that has exactly the page picture's box and pixels (the sharp copy, or the
 * 1x canvas): same CSS size and place, same device size, same scale, right above it. The browser then composites the
 * new letters exactly like the page's own letters (a small canvas inside the text box was resampled by the
 * compositor and came out softer: measured up to 8% lighter on VM115). The paper patches over the replaced lines are
 * painted there too (their DOM covers stay, transparent, for clicking).
 */
const painted = new Map(); // item -> { pageId, patches: [box], pieces: [{ draw, x, base }] } (page px)
function repaintPage(page) {
  if (!page?.el) return;
  const live = new Set(state.items), mine = [];
  for (const [item, p] of painted) {
    if (!live.has(item) || !item.el?.isConnected) { painted.delete(item); continue; }
    if (p.pageId === page.id) mine.push([item, p]);
  }
  let c = page.paintLayer;
  if (!mine.length || !page.cssW) {
    if (c) { c.width = c.height = 0; c.remove(); page.paintLayer = null; }
    return;
  }
  const base = page.sharp || page.canvas, r = paintRatio(page);
  if (!c) { c = document.createElement("canvas"); c.className = "paint-layer"; page.paintLayer = c; }
  if (c.width !== base.width || c.height !== base.height) { c.width = base.width; c.height = base.height; }
  Object.assign(c.style, { width: page.cssW + "px", height: page.cssH + "px" });
  if (c.parentNode !== page.el || c.nextSibling !== page.hits) page.el.insertBefore(c, page.hits);
  const ctx = c.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  // pdf.js drew the page at SCALE x r device px per point: page px x r, the same mapping here
  ctx.setTransform(r, 0, 0, r, 0, 0);
  mine.sort((a, b) => state.items.indexOf(a[0]) - state.items.indexOf(b[0]));
  for (const [, p] of mine) {
    for (const b of p.patches) { ctx.fillStyle = css(b.color); ctx.fillRect(b.x, b.y, b.w, b.h); }
    for (const q of p.pieces) q.draw(ctx, q.x, q.base, 1 / r);
  }
}

function layoutItem(item) {
  const s = item.el.style;
  if (item.type === "text") {
    const fam = famOf(item.font), S = item.size, G = lineGapOf(item);
    const fx = item.fx || {};
    Object.assign(s, { left: item.x + "px", top: item.baseline - S * BASELINE + "px" });
    const weight = item.font.bold ? "700" : "400", style = item.font.italic ? "italic" : "normal";
    const fontCss = fontCssOf(item);
    const k = FONT_K[fam] ?? 0.34;
    // The document's own font, when this box may use it; each line uses it if it has all that line's letters.
    const docFont = itemDocFont(item);
    const spPx = spacingPx(item);
    const plan = item.lines0 ? linePlan(item) : null;
    const lines = plan ? plan.display : displayLines(item);
    // Paragraph boxes: unchanged lines stay as the page shows them; changed lines get a patch and are drawn here.
    if (plan) item.coverEls?.forEach((c, i) => { c.style.display = plan.gone[i] ? "block" : "none"; c.style.background = css(item.lines0[i].box.color); });
    const boxW = item.boxW ?? null, alignK = { center: 0.5, right: 1 }[item.align] ?? 0;
    const offsetOf = (l) => (boxW == null || l.justify ? 0 : (boxW - l.width) * alignK);
    const fxOutline = fx.outline ? { color: unhex(fx.outline.color), width: Math.max(0.4, fx.outline.width * S), hollow: !!fx.outline.hollow } : null;
    // The original letters' own outline (render mode 1/2 with a stroke, often used to make text heavier) and
    // see-through fill: new letters are painted exactly the same way.
    const ink = item.ink || {};
    const own = !fxOutline && ink.lineWidth > 0 && (ink.render === 1 || ink.render === 2) ? { color: ink.stroke || item.color, width: ink.lineWidth * SCALE, hollow: ink.render === 1 } : null;
    const outline = fxOutline || own;
    const alpha = ink.fillAlpha < 1 ? `;opacity:${ink.fillAlpha}` : "";
    // Painted like the page's own text (one canvas for the box, see paintPlan); SVG/HTML below only while a font is
    // still loading or for fonts pdf.js itself draws as outlines.
    const paints = [];
    let waiting = false, drawn = 0;
    const piece = (t, x, top) => {
      const pp = fx.curve ? null : paintPlan(item, t, { docFont, spPx, fxOutline, S, fam, isPlan: !!plan });
      if (pp?.wait) waiting = true;
      if (pp?.draw) { paints.push({ x, top, ...pp }); return ""; }
      drawn++;
      const pv = docFont && docFont.canWrite(t) ? previewSvg(docFont, t, S, item.color, spPx, outline) : null;
      if (pv) return `<div style="position:absolute;left:${x}px;top:${top}px${alpha}">${pv.svg}</div>`;
      // The open look-alike drawn from its own outlines exactly as it is saved: same glyphs, widths, per-letter
      // heights and weight (screen text would add kerning and the browser's own rendering).
      const open = plan || docFont ? openFontOf(fam, item.font.bold, item.font.italic, item.font.weight) : null;
      if (open) {
        const emb = fxOutline ? 0 : weightEm(item) * S;
        const st = emb > 0 ? (own ? { ...own, width: own.width + emb } : { color: item.color, width: emb }) : outline;
        return `<div style="position:absolute;left:${x}px;top:${top}px${alpha}">${openPreviewSvg(open, t, S, item.color, spPx, heightKs(item), st).svg}</div>`;
      }
      const stroke = outline ? `;-webkit-text-stroke:${outline.width}px ${css(outline.color)};paint-order:normal${outline.hollow ? ";-webkit-text-fill-color:transparent" : ""}` : "";
      return `<div style="position:absolute;left:${x}px;top:${top + S * BASELINE - (S / 2 + k * S)}px;white-space:pre;font:${fontCss.replace(/"/g, "'")};font-kerning:none;line-height:${S}px;letter-spacing:${spPx.charSpacing}px;word-spacing:${spPx.wordSpacing}px;color:${css(item.color)};transform:scaleX(${spPx.hScale});transform-origin:0 0${stroke}">${escHtml(t)}</div>`;
    };
    let html = "", bg = "";
    const boxes = [];
    lines.forEach((l, i) => {
      const text = l.text.replace(/\s+$/, "");
      if (plan && !plan.changed[i]) return;
      if (!text) return;
      const top = i * G, off = offsetOf(l), base = top + S * BASELINE;
      if (fx.curve) {
        // Text on an arc: each letter turned to follow the curve (same maths as the PDF writer).
        const theta = (Math.abs(fx.curve) / 100) * Math.PI * 1.5, R = l.width / theta, sg = Math.sign(fx.curve);
        let pos = 0;
        for (const ch of text) {
          const adv = lineWidth(item, ch, docFont);
          const a = (pos + adv / 2 - l.width / 2) / R;
          const px = off + l.width / 2 + R * Math.sin(a), py = base + sg * R * (1 - Math.cos(a));
          if (ch.trim()) html += `<div style="position:absolute;left:${px - adv / 2}px;top:${py - S * BASELINE}px;width:${adv}px;height:${S}px;transform:rotate(${sg * a}rad);transform-origin:${adv / 2}px ${S * BASELINE}px">${piece(ch, 0, 0)}</div>`;
          pos += adv;
        }
        return;
      }
      if (l.justify && boxW) {
        const words = text.trim().split(/ +/), ws = words.map((w) => lineWidth(item, w, docFont));
        const gap = (boxW - ws.reduce((a, b) => a + b, 0)) / Math.max(1, words.length - 1);
        let x = 0;
        words.forEach((w, j) => { html += piece(w, x, top); x += ws[j] + gap; });
      } else html += piece(text, off, top);
      const w = l.justify && boxW ? boxW : l.width, x0 = l.justify && boxW ? 0 : off;
      if (item.font.underline) html += `<div style="position:absolute;left:${x0}px;top:${base + S * 0.12}px;width:${w}px;height:${Math.max(1, S * 0.06)}px;background:${css(item.color)}"></div>`;
      boxes.push({ x0, x1: x0 + w, base });
    });
    if (fx.bg && boxes.length) {
      const padX = S * 0.28, padY = S * 0.14, r = fx.bg.mode === "line" ? S * 0.12 : S * 0.22;
      const rects = fx.bg.mode === "line" ? boxes.map((b) => [b.x0, b.x1, b.base, b.base]) : [[Math.min(...boxes.map((b) => b.x0)), Math.max(...boxes.map((b) => b.x1)), boxes[0].base, boxes[boxes.length - 1].base]];
      for (const [x0, x1, b0, b1] of rects) bg += `<div style="position:absolute;left:${x0 - padX}px;top:${b0 - S * 0.8 - padY}px;width:${x1 - x0 + 2 * padX}px;height:${b1 - b0 + S * 1.02 + 2 * padY}px;border-radius:${r}px;background:${fx.bg.color}"></div>`;
    }
    item.previewEl.innerHTML = html;
    // painted pieces and the patches over replaced lines go to the page's paint layer (see repaintPage)
    const prevPaint = painted.get(item);
    if (paints.length) {
      const ox = item.x, oy = item.baseline - S * BASELINE;
      painted.set(item, {
        pageId: item.pageId,
        patches: plan ? item.lines0.filter((_, i) => plan.gone[i]).map((l) => l.box) : [],
        pieces: paints.map((p) => ({ draw: p.draw, x: ox + p.x, base: oy + p.top + S * BASELINE })),
      });
      item.coverEls?.forEach((c) => (c.style.background = "transparent"));
    } else painted.delete(item);
    if (paints.length || prevPaint) {
      repaintPage(pageOf(item));
      if (prevPaint && prevPaint.pageId !== item.pageId) repaintPage(state.pages.find((p) => p.id === prevPaint.pageId));
    }
    item.el.dataset.paint = [...new Set(paints.map((p) => p.kind))].concat(drawn ? ["svg"] : []).join(",");
    item.el.dataset.paintFont = [...new Set(paints.map((p) => p.file).filter(Boolean))].join(",");
    item.el.dataset.paintWait = waiting ? "1" : "";
    item.bgEl.innerHTML = bg;
    const sh = fx.shadow;
    if (sh) {
      const [r, g, b] = unhex(sh.color), ang = ((sh.angle ?? 45) * Math.PI) / 180, d = (sh.dist ?? 0.08) * S;
      item.previewEl.style.filter = `drop-shadow(${(Math.cos(ang) * d).toFixed(2)}px ${(Math.sin(ang) * d).toFixed(2)}px 0 rgba(${r},${g},${b},${sh.op ?? 0.5}))`;
    } else item.previewEl.style.filter = "";
    // The invisible editable text sits over the drawing: same font, size, spacing, alignment and wrapping,
    // stretched to the drawn widths so the caret lands between the right letters.
    let widest = 0, widestText = "";
    for (const l of lines) if (l.width > widest) { widest = l.width; widestText = l.text.replace(/\s+$/, ""); }
    let ratio = spPx.hScale;
    if (widestText) {
      const natural = textWidth(widestText, fontCss) + spPx.charSpacing * [...widestText].length + spPx.wordSpacing * (widestText.match(/ /g) || []).length;
      if (natural > 0 && widest > 0) ratio = widest / natural;
    }
    const wraps = !!(item.wrap && boxW && !fx.curve), spanW = boxW == null ? null : Math.max(boxW, widest);
    Object.assign(item.span.style, {
      fontFamily: CSS_FONT[fam],
      fontWeight: weight,
      fontStyle: style,
      fontSize: S + "px",
      lineHeight: G + "px",
      marginTop: S * BASELINE - (G / 2 + k * S) + "px",
      letterSpacing: spPx.charSpacing + "px",
      wordSpacing: spPx.wordSpacing + "px",
      textDecoration: item.font.underline ? "underline" : "none",
      fontKerning: "none",
      fontVariantLigatures: "none",
      color: css(item.color),
      caretColor: css(item.color),
      whiteSpace: wraps ? "pre-wrap" : "pre",
      width: spanW == null ? "" : spanW / ratio + "px",
      textAlign: boxW == null ? "" : item.align || "left",
      marginLeft: spanW == null ? "" : (boxW - spanW) * alignK + "px",
      transform: Math.abs(ratio - 1) > 0.005 ? `scaleX(${ratio})` : "",
      transformOrigin: "0 0",
    });
    if (item.widthHandle) Object.assign(item.widthHandle.style, { left: (boxW ?? widest) + 4 + "px", top: S * 0.05 + "px", height: Math.max(12, S * 0.9) + "px" });
    item.el.title = docFont && !lines.every((l) => docFont.canWrite(l.text.replace(/\s+$/, ""))) ? "Some letters are not in this PDF's font, so those lines use the closest matching font" : "";
    if (item.coverEl) item.coverEl.style.background = css(item.cover.color);
  } else if (item.type === "comment") {
    Object.assign(s, { left: item.x + "px", top: item.y + "px" });
    const n = state.items.filter((i) => i.type === "comment").indexOf(item) + 1;
    item.el.innerHTML = `<span class="pin" style="--c:${item.color || "#f59e0b"}">${n}</span>`;
    item.el.classList.toggle("resolved", !!item.resolved);
    item.el.title = item.thread?.[0] ? `${item.thread[0].author}: ${item.thread[0].text}` : "New comment";
  } else {
    if (item.type === "table") item.h = tableLayout(item).height;
    Object.assign(s, { left: item.x + "px", top: item.y + "px", width: item.w + "px", height: item.h + "px" });
    s.opacity = item.opacity ?? "";
    if (item.type === "rect") s.background = css(item.color);
    if (item.type === "hl") s.background = `rgba(${item.color.join(",")},.42)`;
    if ((item.type === "shape" || item.type === "draw") && item.svgEl) item.el.innerHTML = shapeSvg(item), item.svgEl = item.el.firstElementChild, item.el.append(handle("size", item));
    if (item.type === "element" || item.type === "chart" || item.type === "table") {
      const svg = item.type === "element" ? primsToSvg(elementParts(item), item.w, item.h, { vw: item.vb[0], vh: item.vb[1] })
        : item.type === "chart" ? primsToSvg(chartPrims(item.spec, item.w, item.h), item.w, item.h)
        : primsToSvg(tableLayout(item).prims, item.w, item.h);
      item.el.innerHTML = svg;
      item.el.append(handle("size", item));
    }
  }
}

// Sticker colours: "$1" / "$2" / "$3" take the item's chosen colours.
function elementParts(item) {
  const c = { $1: item.colors?.c1, $2: item.colors?.c2, $3: item.colors?.c3 };
  const res = (v) => (v && v[0] === "$" ? c[v] || item.defaults?.["c" + v[1]] || "#5b4cf0" : v);
  return item.parts.map((p) => ({ ...p, fill: res(p.fill), stroke: res(p.stroke) }));
}

// Table layout in page pixels (same open font as the PDF: Liberation Sans).
function tableLayout(item) {
  const measure = (t, bold) => textWidth(t, `${bold ? 700 : 400} ${item.size}px ${CSS_FONT.sans}`);
  const r = tablePrims(item.table, item.w, item.size, measure);
  item._layout = r.layout;
  return { prims: r.prims, height: r.layout.height, layout: r.layout };
}

function handle(kind, item) {
  const h = document.createElement("span");
  h.className = "handle " + kind;
  h.addEventListener("pointerdown", (e) => startDrag(e, item, kind));
  return h;
}

function startDrag(e, item, kind) {
  e.stopPropagation();
  e.preventDefault();
  select(item);
  const z = state.zoom;
  const start = { x: e.clientX, y: e.clientY, ix: item.x, iy: item.type === "text" ? item.baseline : item.y, w: item.w, h: item.h,
    bw: item.type === "text" ? item.boxW ?? Math.max(...displayLines(item).map((l) => l.width), item.size) : 0 };
  let moved = false;
  const move = (ev) => {
    const dx = (ev.clientX - start.x) / z, dy = (ev.clientY - start.y) / z;
    moved = true;
    if (kind === "width") {
      // Text box width: the text wraps inside it.
      item.boxW = Math.max(item.size * 1.5, start.bw + dx);
      item.wrap = true;
    } else if (kind === "size") {
      const ratio = start.h / start.w;
      item.w = Math.max(10, start.w + dx);
      item.h = item.type === "image" || item.type === "element" ? item.w * ratio : Math.max(6, start.h + dy);
    } else if (item.type === "text") {
      item.x = start.ix + dx;
      item.baseline = start.iy + dy;
    } else {
      item.x = start.ix + dx;
      item.y = start.iy + dy;
    }
    layoutItem(item);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (moved) commit();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function focusText(item, selectAll) {
  item.editing = true;
  layoutItem(item);
  item.span.focus();
  const range = document.createRange();
  range.selectNodeContents(item.span);
  if (!selectAll) range.collapse(false);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function removeItem(item, record = true) {
  item.el?.remove();
  item.coverEl?.remove();
  item.coverEls?.forEach((c) => c.remove());
  state.items = state.items.filter((i) => i !== item);
  if (painted.has(item)) repaintPage(pageOf(item));
  if (state.selected === item) select(null);
  refreshChrome();
  if (item.type === "comment") refreshComments();
  if (record) commit();
}

function select(item) {
  if (state.selected?.type === "comment" && state.selected !== item && !state.selected.thread?.length) { const c = state.selected; state.selected = null; removeItem(c, false); }
  if (state.selected?.el) state.selected.el.classList.remove("selected");
  state.selected = item;
  if (item?.el) item.el.classList.add("selected");
  // Keep the toolbar's space reserved so the page never jumps under the cursor.
  $("props").classList.toggle("off", !item || item.type === "comment");
  if (item) {
    const t = item.type, isText = t === "text";
    const colored = isText || ["hl", "shape", "draw", "element"].includes(t);
    for (const id of ["propFont", "propBold", "propItalic", "propUnderline", "fxBtn", "aiBtn"]) $(id).hidden = !isText;
    $("propSize").hidden = !(isText || t === "table");
    $("leadingWrap").hidden = !isText;
    $("letterWrap").hidden = !isText;
    $("alignWrap").hidden = !isText;
    $("opacityWrap").hidden = isText || t === "link" || t === "table";
    $("propColor").hidden = !(colored || t === "table");
    $("propColor2").hidden = !(t === "element" && item.parts?.some((p) => p.fill === "$2" || p.stroke === "$2"));
    $("bgRemoveBtn").hidden = $("eraserBtn").hidden = t !== "image";
    $("chartEditBtn").hidden = t !== "chart";
    $("tableTools").hidden = t !== "table";
    if (colored && !isText) $("propColor").value = t === "element" ? item.colors?.c1 || item.defaults?.c1 || "#5b4cf0" : hex(item.color);
    if (t === "element") $("propColor2").value = item.colors?.c2 || item.defaults?.c2 || "#ff7a59";
    if (t === "table") {
      $("propColor").value = item.table.color || "#1f2937";
      $("propSize").value = (item.size / SCALE).toFixed(1);
      $("tblBorder").value = item.table.border?.color || "#94a3b8";
      $("tblHeadColor").value = item.table.headerFill || "#5b4cf0";
      document.querySelector('[data-tbl="header"]').classList.toggle("on", !!item.table.header);
      document.querySelector('[data-tbl="stripe"]').classList.toggle("on", !!item.table.stripe);
    }
    $("propBg").hidden = !(t === "rect" || item.cover || item.lines0);
    $("propOpacity").value = item.opacity ?? 1;
    if (isText) {
      $("optOrig").hidden = !item.font.orig;
      $("propFont").value = item.font.orig && item.font.useOrig ? "orig" : famOf(item.font);
      $("propSize").value = (item.size / SCALE).toFixed(1);
      $("propLeading").value = (lineGapOf(item) / item.size).toFixed(2);
      $("propLetter").value = +(item.spacing?.charSpacing || 0).toFixed(2);
      $("propBold").classList.toggle("on", item.font.bold);
      $("propItalic").classList.toggle("on", item.font.italic);
      $("propUnderline").classList.toggle("on", !!item.font.underline);
      $("propColor").value = hex(item.color);
      document.querySelectorAll("#alignWrap [data-align]").forEach((b) => b.classList.toggle("on", (item.align || "left") === b.dataset.align));
      syncFxPanel(item);
    }
    $("propBg").value = hex(item.type === "rect" ? item.color : item.cover?.color || item.lines0?.[0]?.box.color || [255, 255, 255]);
  }
  if (!item || item.type !== "text") { $("fxPanel").hidden = true; $("fxBtn").setAttribute("aria-expanded", "false"); }
  $("deleteBtn").disabled = !item;
  refreshStyleBar();
  collabPresenceSoon();
}

// Take the text away completely, leaving the background as it was.
function removeSelectedText() {
  const item = state.selected;
  if (item?.type !== "text") return;
  item.text = "";
  item.span.textContent = "";
  item.span.blur();
  layoutItem(item);
  refreshStyleBar();
  commit();
  toast("Text removed. Click the same spot to write something new there.");
}

// Undo every change to this piece of text and put the original back.
function restoreSelected() {
  const item = state.selected;
  if (!item?.runs?.length) return;
  const page = pageOf(item);
  removeItem(item, false);
  for (const r of item.runs) { const e = page.runs.find((x) => x.run === r); if (e && !e.hit.isConnected) page.hits.append(e.hit); }
  commit();
}

/* ---------- undo / redo ---------- */

const history = { past: [], future: [] };
const DOM_KEYS = ["el", "span", "previewEl", "svgEl", "coverEl", "coverEls", "editing", "before", "bgEl", "widthHandle"];
// Deep copies of plain data (tables, charts, comment threads, effects); runs stay shared references.
const clone = (v) => (v === null || typeof v !== "object" ? v : Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])));
function snapshot() {
  return state.items.map((i) => {
    const o = {};
    for (const [k, v] of Object.entries(i)) {
      if (DOM_KEYS.includes(k) || k.startsWith("_") || k === "cur") continue;
      o[k] = k === "runs" ? [...v] : k === "lines0" ? v.map((l) => ({ ...l })) : k === "font" ? { ...v } : clone(v);
    }
    return o;
  });
}
let commitTimer = null;
function commit(reset = false) {
  clearTimeout(commitTimer);
  if (reset) { history.past = [snapshot()]; history.future = []; }
  else { history.past.push(snapshot()); if (history.past.length > 100) history.past.shift(); history.future = []; }
  refreshHistory();
  if (!reset) collabSync();
}
const commitSoon = () => { clearTimeout(commitTimer); commitTimer = setTimeout(() => commit(), 450); };
function restore(snap) {
  for (const i of state.items) { i.el?.remove(); i.coverEl?.remove(); i.coverEls?.forEach((c) => c.remove()); }
  state.selected = null;
  state.items = snap.map((o) => { const c = {}; for (const [k, v] of Object.entries(o)) c[k] = k === "runs" ? [...v] : k === "lines0" ? v.map((l) => ({ ...l })) : k === "font" ? { ...v } : clone(v); return c; });
  for (const i of state.items) drawItem(i);
  state.pages.forEach(repaintPage); // boxes that are gone leave the paint layers too
  // Original text comes back wherever no edit covers it any more.
  for (const page of state.pages) for (const { run, hit } of page.runs || []) {
    const edited = state.items.some((i) => i.runs?.includes(run));
    if (edited && hit.isConnected) hit.remove();
    if (!edited && !hit.isConnected) page.hits.append(hit);
  }
  select(null);
  refreshChrome();
  refreshComments();
}
function undo() {
  if (history.past.length < 2) return;
  history.future.push(history.past.pop());
  restore(history.past[history.past.length - 1]);
  refreshHistory();
  collabSync();
}
function redo() {
  if (!history.future.length) return;
  const s = history.future.pop();
  history.past.push(s);
  restore(s);
  refreshHistory();
  collabSync();
}
function refreshHistory() {
  $("undoBtn").disabled = history.past.length < 2;
  $("redoBtn").disabled = !history.future.length;
}

/* ---------- page interactions ---------- */

function pointIn(page, e) {
  const r = page.el.getBoundingClientRect();
  return { x: (e.clientX - r.left) / state.zoom, y: (e.clientY - r.top) / state.zoom };
}

// New text copies the style of the last edited text, so it matches the document.
function lastTextStyle() {
  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    if (it.type === "text") return { size: it.size, font: { ...it.font }, color: it.color, spacing: it.spacing, lineGap: it.lineGap };
  }
  return { size: 12 * SCALE, font: { family: "sans", bold: false, italic: false }, color: [0, 0, 0], lineGap: 12 * SCALE * 1.2 };
}

function onPagePointerDown(e, page) {
  if (e.target.closest(".item") && !(state.tool === "draw" && state.pen.kind === "eraser")) return;
  const p = pointIn(page, e);
  if (state.tool === "text") {
    e.preventDefault();
    const st = lastTextStyle();
    ensureFace(famOf(st.font), st.font.bold, st.font.italic, st.font.weight);
    const item = addItem({ type: "text", pageId: page.id, x: p.x, baseline: p.y + st.size * BASELINE, ...st, text: "" }, false);
    // Focus right inside the tap/click (phones only open the keyboard for a focus made during the gesture);
    // preventDefault above keeps the browser from moving focus back on mouseup.
    focusText(item);
    requestAnimationFrame(() => { if (document.activeElement !== item.span && item.el?.isConnected) focusText(item); });
    // One click adds one piece of text; go back to editing so stray clicks don't add more.
    setTool("edit");
    return;
  }
  if (state.tool === "cover") {
    e.preventDefault();
    dragBox(page, p, "", (b) => {
      if (b.w < 4 || b.h < 4) return;
      addItem({ type: "rect", pageId: page.id, x: b.x, y: b.y, w: b.w, h: b.h, color: sampleColors(page.canvas, b.x - 3, b.y - 3, b.w + 6, b.h + 6).paper });
    });
    return;
  }
  if (state.tool === "highlight") {
    e.preventDefault();
    dragBox(page, p, "hl", (b) => { if (b.w >= 4 && b.h >= 3) addItem({ type: "hl", pageId: page.id, x: b.x, y: b.y, w: b.w, h: b.h, color: HL_COLOR }); });
    return;
  }
  if (state.tool === "shape") {
    e.preventDefault();
    const kind = $("shapeKind").value;
    dragBox(page, p, "", (b) => {
      const line = kind === "line" || kind === "arrow";
      if (b.w < 4 && b.h < 4) return;
      addItem({ type: "shape", kind, pageId: page.id, x: b.x, y: b.y, w: Math.max(b.w, line ? 1 : 6), h: Math.max(b.h, line ? 1 : 6), flipX: b.flipX, flipY: b.flipY, color: lastDrawColor, width: 2 });
    });
    return;
  }
  if (state.tool === "draw") {
    e.preventDefault();
    if (state.pen.kind === "eraser") erase(page, p);
    else freehand(page, p);
    return;
  }
  if (state.tool === "comment") {
    e.preventDefault();
    const item = addItem({ type: "comment", pageId: page.id, x: p.x - 12, y: p.y - 12, thread: [], color: "#f59e0b" }, false);
    setTool("edit");
    openComments(item);
    return;
  }
  if (state.tool === "link") {
    e.preventDefault();
    dragBox(page, p, "", (b) => {
      if (b.w < 6 || b.h < 6) return toast("Drag a box over the words that should open the link.");
      const url = cleanUrl(prompt("Web link, email or phone number:", "https://"));
      if (!url) return toast("No link added. Use a full web address like https://example.com");
      addItem({ type: "link", pageId: page.id, x: b.x, y: b.y, w: b.w, h: b.h, url });
    });
    return;
  }
  select(null);
}

/* ---------- highlight, draw, shapes, links ---------- */

const SHAPE_COLOR = [220, 38, 38];
const HL_COLOR = [255, 214, 0];
const PEN = { pen: { opacity: 1 }, marker: { opacity: 1 }, highlighter: { opacity: 0.4 } };
function shapeSvg(item) {
  const c = css(item.color), w = item.width || 2;
  if (item.type === "draw") {
    const pts = item.points.map(([x, y]) => `${x},${y}`).join(" ");
    const op = PEN[item.pen || "pen"]?.opacity ?? 1;
    return `<svg viewBox="0 0 ${item.vw} ${item.vh}" preserveAspectRatio="none"${item.pen === "highlighter" ? ' style="mix-blend-mode:multiply"' : ""}><polyline points="${pts}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${item.width || 3}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  // Drawn in the item's real pixel size, so nothing gets stretched.
  const W = Math.max(item.w, 1), H = Math.max(item.h, 1), svg = (body) => `<svg viewBox="0 0 ${W} ${H}">${body}</svg>`;
  if (item.kind === "fbox") return svg(`<rect width="${W}" height="${H}" fill="${c}"/>`);
  if (item.kind === "fcircle") return svg(`<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W / 2}" ry="${H / 2}" fill="${c}"/>`);
  if (item.kind === "circle") return svg(`<ellipse cx="${W / 2}" cy="${H / 2}" rx="${Math.max(W / 2 - w / 2, 1)}" ry="${Math.max(H / 2 - w / 2, 1)}" fill="none" stroke="${c}" stroke-width="${w}"/>`);
  if (item.kind === "box") return svg(`<rect x="${w / 2}" y="${w / 2}" width="${Math.max(W - w, 1)}" height="${Math.max(H - w, 1)}" fill="none" stroke="${c}" stroke-width="${w}"/>`);
  const x1 = item.flipX ? W : 0, x2 = W - x1, y1 = item.flipY ? H : 0, y2 = H - y1;
  let head = "";
  if (item.kind === "arrow") {
    const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.max(10, w * 5);
    const pts = [0.45, -0.45].map((d) => `${x2 - len * Math.cos(ang + d)},${y2 - len * Math.sin(ang + d)}`);
    head = `<polygon points="${x2},${y2} ${pts.join(" ")}" fill="${c}"/>`;
  }
  return svg(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>${head}`);
}

// Drag out a box on the page (used by cover, highlight, shapes and links).
function dragBox(page, p, draftClass, done) {
  const draft = document.createElement("div");
  draft.className = "draft " + draftClass;
  page.el.append(draft);
  let q = p;
  const box = () => ({ x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x), h: Math.abs(q.y - p.y), flipX: q.x < p.x, flipY: q.y < p.y });
  const move = (ev) => { q = pointIn(page, ev); const b = box(); Object.assign(draft.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" }); };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    draft.remove();
    done(box());
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

// The pen picks up the ink already on the page (ink annotations, else freehand drawings in the page).
function penForPage(page) {
  if (state.pen.userSet) return;
  let ink = page.ink;
  if (!ink) {
    const scan = pageScan(page);
    ink = scan ? inkFromStrokes(scan.strokes) : null;
    page.ink = ink || false;
  }
  if (!ink) ink = state.pages.map((p) => p.ink).find(Boolean);
  if (ink) {
    state.pen.color = ink.color;
    state.pen.width = Math.max(0.5, ink.width) * SCALE;
    state.pen.source = ink.source;
    $("penColor").value = hex(ink.color);
    $("penWidth").value = (state.pen.width / SCALE).toFixed(2);
    $("penWidthOut").textContent = (state.pen.width / SCALE).toFixed(2) + " pt";
    refreshStyleBar();
  }
}

function freehand(page, p) {
  penForPage(page);
  const pen = state.pen;
  const kind = pen.kind, color = kind === "highlighter" && !pen.userSet ? HL_COLOR : pen.color;
  const width = kind === "marker" ? Math.max(pen.width, 4 * SCALE) : kind === "highlighter" ? Math.max(pen.width, 9 * SCALE) : pen.width;
  const pts = [[p.x, p.y]];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "draft-svg");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  Object.entries({ fill: "none", stroke: css(color), "stroke-opacity": PEN[kind].opacity, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }).forEach(([k, v]) => line.setAttribute(k, v));
  svg.append(line);
  page.el.append(svg);
  const move = (ev) => {
    const q = pointIn(page, ev), last = pts[pts.length - 1];
    if (Math.hypot(q.x - last[0], q.y - last[1]) < 1.5) return;
    pts.push([q.x, q.y]);
    line.setAttribute("points", pts.map((a) => a.join(",")).join(" "));
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    svg.remove();
    if (pts.length < 2) return;
    const xs = pts.map((a) => a[0]), ys = pts.map((a) => a[1]), pad = width / 2 + 2;
    const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad, w = Math.max(...xs) - x + pad, h = Math.max(...ys) - y + pad;
    addItem({ type: "draw", pen: kind, pageId: page.id, x, y, w, h, vw: w, vh: h, points: pts.map(([a, b]) => [+(a - x).toFixed(1), +(b - y).toFixed(1)]), color, width });
    select(null);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

// Eraser: removes drawings the pointer passes over.
function erase(page, p) {
  let removedAny = false;
  const hitTest = (q) => {
    for (const it of state.items.filter((i) => i.type === "draw" && i.pageId === page.id)) {
      const sx = it.w / it.vw, sy = it.h / it.vh, r = (it.width || 3) / 2 + 6;
      if (it.points.some(([a, b]) => Math.hypot(it.x + a * sx - q.x, it.y + b * sy - q.y) <= r)) { removeItem(it, false); removedAny = true; }
    }
  };
  hitTest(p);
  const move = (ev) => hitTest(pointIn(page, ev));
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    if (removedAny) commit();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
let lastDrawColor = SHAPE_COLOR;

function cleanUrl(raw) {
  let url = (raw || "").trim();
  if (!url) return null;
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(url)) url = "mailto:" + url;
  else if (/^\+?[\d\s-]{7,}$/.test(url)) url = "tel:" + url.replace(/[\s-]/g, "");
  else if (!/^(https?:|mailto:|tel:)/i.test(url)) url = "https://" + url;
  try { const u = new URL(url); return /^(https?:|mailto:|tel:)$/.test(u.protocol) ? u.href : null; } catch { return null; }
}

function findReplace(find, replace, matchCase) {
  if (!find) return 0;
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, matchCase ? "g" : "gi");
  let count = 0;
  const apply = (item) => {
    const next = item.text.replace(re, () => { count++; return replace; });
    if (next === item.text) return;
    item.text = next;
    if (item.span) item.span.textContent = next;
    layoutItem(item);
  };
  for (const page of state.pages) {
    for (const { run, hit } of page.runs || []) {
      re.lastIndex = 0;
      if (!hit.isConnected || !re.test(run.str)) continue;
      re.lastIndex = 0;
      apply(editExistingText(page, run, hit, true));
    }
  }
  for (const item of state.items) if (item.type === "text" && !item.fromFind) { re.lastIndex = 0; if (re.test(item.text)) { re.lastIndex = 0; apply(item); } }
  select(null);
  refreshChrome();
  commit();
  return count;
}

function visiblePage() {
  const mid = window.innerHeight / 2;
  let best = state.pages[0], dist = Infinity;
  for (const p of state.pages) {
    const r = p.el.getBoundingClientRect();
    const d = Math.abs((r.top + r.bottom) / 2 - mid);
    if (d < dist) { dist = d; best = p; }
  }
  return best;
}

function placeImage(dataUrl, type, w, h, extra = {}) {
  const page = visiblePage();
  if (!page) return toast("Open a file first.");
  const k = Math.min(1, (page.cssW * 0.35) / w);
  const at = placeBox(w * k, h * k);
  if (at) addItem({ type: "image", pageId: at.page.id, dataUrl, imgType: type, x: at.x, y: at.y, w: at.w, h: at.h, ...extra });
}

/* ---------- pages ---------- */

function pageHasItems(page) { return state.items.some((i) => i.pageId === page.id); }

async function rotatePage(page) {
  if (pageHasItems(page)) return toast("Rotate the page before adding edits to it.");
  page.extraRotate = (page.extraRotate + 90) % 360;
  page.ocrDone = false;
  page.scan = undefined;
  await renderPage(page);
  collabPages();
}

function movePage(page, dir) {
  const i = state.pages.indexOf(page), j = i + dir;
  if (j < 0 || j >= state.pages.length) return;
  const other = state.pages[j];
  [state.pages[i], state.pages[j]] = [other, page];
  if (dir < 0) other.wrap.before(page.wrap); else other.wrap.after(page.wrap);
  page.wrap.classList.remove("moved");
  void page.wrap.offsetWidth;
  page.wrap.classList.add("moved");
  refreshChrome();
}

async function insertPageAfter(after, page) {
  state.pages.splice(state.pages.indexOf(after) + 1, 0, page);
  buildPageShell(page, after);
  await renderPage(page);
  refreshChrome();
  page.wrap.scrollIntoView({ behavior: "smooth", block: "center" });
}

function duplicatePage(page) {
  return insertPageAfter(page, { id: uid(), src: page.src, index: page.index, baseRotate: page.baseRotate, extraRotate: page.extraRotate, blank: page.blank });
}

async function insertBlankAfter(page) {
  const vp = page.viewport;
  const src = await loadSource(await blankPdf(vp.width / SCALE, vp.height / SCALE));
  await insertPageAfter(page, { id: uid(), src, index: 0, baseRotate: 0, extraRotate: 0, blank: true });
}

function removePage(page) {
  if (state.pages.length === 1) return toast("A file needs at least one page.");
  state.items.filter((i) => i.pageId === page.id).forEach((i) => removeItem(i, false));
  state.pages = state.pages.filter((p) => p !== page);
  pageObserver?.unobserve(page.box);
  page.wrap.remove();
  refreshChrome();
  commit();
}

function isSingleImage() {
  return state.pages.length === 1 && !!state.sources[state.pages[0].src].image;
}

/* ---------- zoom ---------- */

function setZoom(z) {
  state.zoom = Math.min(3, Math.max(0.25, +z.toFixed(2)));
  state.pages.forEach((p) => p.cssW && sizeBox(p));
  sharpenSoon();
  $("zoomPct").textContent = Math.round(state.zoom * 100) + "%";
}
function fitZoom() {
  const widest = Math.max(...state.pages.map((p) => p.cssW || 0), 1);
  const avail = $("viewer").clientWidth - 40;
  setZoom(Math.min(1.5, avail / widest));
}
function autoZoom(pdfPage) {
  const w = pdfPage.getViewport({ scale: SCALE }).width;
  const avail = $("viewer").clientWidth - 40;
  setZoom(w > avail ? avail / w : 1);
}

function refreshChrome() {
  const has = state.pages.length > 0;
  $("empty").hidden = has;
  document.body.classList.toggle("has-doc", has);
  $("downloadBtn").disabled = !has;
  $("downloadImgBtn").hidden = !has;
  refreshStyleBar();
  state.pages.forEach((p, i) => {
    p.wrap.querySelector(".num").textContent = `Page ${i + 1} of ${state.pages.length}`;
    p.tools.querySelector('[data-act="ocr"]').hidden = p.hasText !== false || p.ocrBusy || !!p.blank;
  });
  if (collab.session) collabPages();
}

/* ---------- export ---------- */

// A font used inside a form XObject, registered on the exported page so page text can use it too.
function pageFontFrom(p, streamIndex, font) {
  const st = scanPage(p).shows.find((s) => s.stream === streamIndex && s.fontRes === font.resName);
  const ref = st?.resources?.lookup(PDFName.of("Font"))?.get(PDFName.of(font.resName));
  if (!ref) return null;
  const key = p.node.newFontDictionary(font.resName, ref);
  return { ...font, resName: key.toString().slice(1) };
}

// Writing into a form field's appearance stream: a stand-in "page" whose operators are collected and
// appended to that stream, with positions turned into the appearance's own coordinates.
function widgetTarget(out, p, index) {
  const w = scanPage(p).widgets[index];
  if (!w) return null;
  const ctx = out.context, ref = w.annot.lookup(PDFName.of("AP")).get(PDFName.of("N"));
  const stream = ctx.lookup(ref);
  let res = stream.dict.lookup(PDFName.of("Resources"));
  if (!(res instanceof PDFDict)) { res = ctx.obj({}); stream.dict.set(PDFName.of("Resources"), res); }
  let fontsDict = res.lookup(PDFName.of("Font"));
  if (!(fontsDict instanceof PDFDict)) { fontsDict = ctx.obj({}); res.set(PDFName.of("Font"), fontsDict); }
  const ops = [];
  const inv = invert(w.ctm), scale = Math.hypot(w.ctm[0], w.ctm[1]) || 1;
  let n = 0;
  const page = {
    doc: out,
    pushOperators: (...o) => ops.push(...o),
    maybeEmbedGraphicsState: () => undefined,
    drawLine: () => {}, // no underline inside form fields
    node: {
      Resources: () => res,
      newFontDictionary: (name, fontRef) => { let key; do key = PDFName.of(`${name}-AD${n++}`); while (fontsDict.has(key)); fontsDict.set(key, fontRef); return key; },
    },
  };
  return {
    page, scale,
    at: (x, y) => { const [fx, fy] = applyMatrix(inv, x, y); return { x: fx, y: fy }; },
    finish: (value) => {
      if (ops.length) appendToStream(ctx, ref, ops.map(String).join("\n"));
      // Keep the form data in step with what is shown.
      w.field.set(PDFName.of("V"), PDFHexString.fromText(value));
    },
  };
}

async function exportBytes() {
  document.activeElement?.blur?.();
  await fontkitReady();
  const out = await PDFDocument.create();
  const libDocs = [];
  for (const s of state.sources) libDocs.push(await PDFDocument.load(s.bytes, { ignoreEncryption: true }));
  const color = (c) => rgb(c[0] / 255, c[1] / 255, c[2] / 255);
  const k = 1 / SCALE;
  const notes = new Set();
  const embedded = new Map();

  for (const page of state.pages) {
    const [p] = await out.copyPages(libDocs[page.src], [page.index]);
    out.addPage(p);
    // Comments that came with the file are edited here and written again below, so drop the old copies.
    if (page.commentsImported) {
      const annots = p.node.Annots();
      for (let i = (annots?.size() || 0) - 1; i >= 0; i--) {
        const a = annots.lookup(i);
        const sub = a instanceof PDFDict ? a.get(PDFName.of("Subtype")) : null;
        if (sub === PDFName.of("Text") || sub === PDFName.of("Popup")) annots.remove(i);
      }
    }
    const rot = (page.baseRotate + page.extraRotate) % 360;
    p.setRotation(degrees(rot));
    const at = (x, y) => page.viewport.convertToPdfPoint(x, y);
    const rotate = degrees(rot);
    const items = state.items.filter((i) => i.pageId === page.id);

    // Take the changed lines of edited text out of the page itself (unchanged lines stay exactly as they were).
    const srcs = [], owners = [];
    for (const it of items) {
      if (it.type !== "text" || !it.lines0) continue;
      it._plan = linePlan(it);
      it.lines0.forEach((l, li) => { if (it._plan.gone[li]) l.sources.forEach((src) => { srcs.push(src); owners.push([it, li]); }); });
    }
    let removed = new Set();
    try { removed = removeTextRuns(p, srcs); } catch (e) { console.warn("Text removal failed, covering instead", e); }
    const lineRemoved = (it, li) => owners.every(([o, l], idx) => o !== it || l !== li || removed.has(idx));

    for (const item of items) {
      const opacity = item.opacity ?? 1;
      if (item.type === "rect") {
        const [x, y] = at(item.x, item.y + item.h);
        p.drawRectangle({ x, y, width: item.w * k, height: item.h * k, color: color(item.color), opacity, rotate });
      } else if (item.type === "image") {
        const bytes = await (await fetch(item.dataUrl)).arrayBuffer();
        const img = item.imgType === "image/jpeg" ? await out.embedJpg(bytes) : await out.embedPng(bytes);
        const [x, y] = at(item.x, item.y + item.h);
        p.drawImage(img, { x, y, width: item.w * k, height: item.h * k, opacity, rotate });
      } else if (item.type === "hl") {
        const [x, y] = at(item.x, item.y + item.h);
        p.drawRectangle({ x, y, width: item.w * k, height: item.h * k, color: color(item.color), opacity: 0.42 * opacity, blendMode: BlendMode.Multiply, rotate });
      } else if (item.type === "shape") {
        const c = color(item.color), bw = (item.width || 2) * k;
        if (item.kind === "box" || item.kind === "fbox") {
          const [x, y] = at(item.x, item.y + item.h);
          const fill = item.kind === "fbox";
          p.drawRectangle({ x, y, width: item.w * k, height: item.h * k, ...(fill ? { color: c, opacity } : { borderColor: c, borderWidth: bw, borderOpacity: opacity }), rotate });
        } else if (item.kind === "circle" || item.kind === "fcircle") {
          const [cx, cy] = at(item.x + item.w / 2, item.y + item.h / 2);
          const sideways = rot % 180 !== 0;
          const xs = ((sideways ? item.h : item.w) * k) / 2, ys = ((sideways ? item.w : item.h) * k) / 2;
          p.drawEllipse({ x: cx, y: cy, xScale: xs, yScale: ys, ...(item.kind === "fcircle" ? { color: c, opacity } : { borderColor: c, borderWidth: bw, borderOpacity: opacity }) });
        } else {
          const [x1, y1] = at(item.flipX ? item.x + item.w : item.x, item.flipY ? item.y + item.h : item.y);
          const [x2, y2] = at(item.flipX ? item.x : item.x + item.w, item.flipY ? item.y : item.y + item.h);
          p.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: bw, color: c, opacity, lineCap: LineCapStyle.Round });
          if (item.kind === "arrow") {
            const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.max(10 * k, bw * 5);
            const [a1, a2] = [0.45, -0.45].map((d) => [x2 - len * Math.cos(ang + d), y2 - len * Math.sin(ang + d)]);
            p.drawSvgPath(`M 0 0 L ${a1[0] - x2} ${-(a1[1] - y2)} L ${a2[0] - x2} ${-(a2[1] - y2)} Z`, { x: x2, y: y2, color: c, opacity, borderWidth: 0 });
          }
        }
      } else if (item.type === "draw") {
        // One smooth path in user space (drawSvgPath flips y, so y is negated here).
        const pts = item.points.map(([px, py]) => at(item.x + (px * item.w) / item.vw, item.y + (py * item.h) / item.vh));
        const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(2)} ${(-y).toFixed(2)}`).join(" ");
        const hl = item.pen === "highlighter";
        p.drawSvgPath(d, { x: 0, y: 0, borderColor: color(item.color), borderWidth: (item.width || 3) * k, borderLineCap: LineCapStyle.Round, borderOpacity: (hl ? 0.4 : 1) * opacity, ...(hl ? { blendMode: BlendMode.Multiply } : {}) });
      } else if (item.type === "link") {
        const [x1, y1] = at(item.x, item.y + item.h), [x2, y2] = at(item.x + item.w, item.y);
        const ctx = out.context;
        const annot = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(item.url) } }));
        p.node.addAnnot(annot);
      } else if (item.type === "text") {
        await exportText(out, p, page, item, { at, k, rot, embedded, notes, lineRemoved, color });
      } else if (item.type === "element" || item.type === "chart" || item.type === "table") {
        // Vector drawing: sharp at any zoom, text stays real text.
        const prims = item.type === "element" ? elementParts(item) : item.type === "chart" ? chartPrims(item.spec, item.w, item.h) : tableLayout(item).prims;
        const sx = item.type === "element" ? (item.w / item.vb[0]) * k : k, sy = item.type === "element" ? (item.h / item.vb[1]) * k : k;
        await drawPrims(out, p, prims, { origin: at(item.x, item.y), sx, sy, rotationDeg: rot, opacity, embedded });
      } else if (item.type === "comment") {
        writeComment(out, p, item, at);
      }
    }
  }
  const bytes = await out.save();
  return { bytes, notes: [...notes] };
}

// Writes one text box: patches over replaced lines, then its background, shadow, the text itself (with its
// outline) and underline. Curved text is written letter by letter along the same arc as on screen.
async function exportText(out, p, page, item, { at, k, rot, embedded, notes, lineRemoved, color }) {
  const G = lineGapOf(item), plan = item._plan, fx = item.fx || {};
  const patch = (c) => { const [x, y] = at(c.x, c.y + c.h); p.drawRectangle({ x, y, width: c.w * k, height: c.h * k, color: color(c.color), rotate: degrees(rot) }); };
  // A changed line whose letters could not be taken out of the stream (or sit in a picture) gets a paper patch.
  if (plan) item.lines0.forEach((l, li) => { if (plan.gone[li] && (item.needsCover || !lineRemoved(item, li))) patch(l.box); });
  else if (item.cover) patch(item.cover);
  const display = plan ? plan.display : displayLines(item);
  let docFont = itemDocFont(item);
  const heightFrom = docFont; // letter heights of the look-alike are matched to this font (see heightMatchByClass)
  // Text of a filled form field goes back into the field's own appearance (drawn above the page), in that
  // appearance's coordinates; text from a form XObject is written on the page with the XObject's own font.
  const target = item.widget != null ? widgetTarget(out, p, item.widget) : null;
  if (docFont && !target && item.fontStream) docFont = pageFontFrom(p, item.fontStream, docFont);
  const tp = target ? target.page : p, sc = target ? target.scale : 1;
  const toT = (x, y) => { if (!target) return [x, y]; const q = target.at(x, y); return [q.x, q.y]; };
  const S = item.size / sc, size = S * k, spacing = item.spacing ? { ...item.spacing, charSpacing: (item.spacing.charSpacing || 0) / sc, wordSpacing: (item.spacing.wordSpacing || 0) / sc } : null;
  const r = (rot * Math.PI) / 180, dir = [Math.cos(r), Math.sin(r)], up = [-Math.sin(r), Math.cos(r)];
  const boxW = item.boxW != null ? (item.boxW * k) / sc : null;
  // A text effect outline, else the original letters' own outline (render mode 1/2 + stroke) and see-through fill.
  const ink = item.ink || {};
  const own = !fx.outline && ink.lineWidth > 0 && (ink.render === 1 || ink.render === 2);
  const outline = fx.outline ? { color: unhex(fx.outline.color), width: Math.max(0.3, fx.outline.width * size) } : own ? { color: ink.stroke || item.color, width: ink.lineWidth / sc } : null;
  const render = fx.outline ? (fx.outline.hollow ? 1 : 2) : own ? ink.render : 0;
  const join = fx.outline ? 1 : own ? ink.join ?? 0 : 1;
  const inkAlpha = ink.fillAlpha < 1 ? ink.fillAlpha : 1;
  // Lines the document's font can't write: the look-alike at the weight measured on the page at PDF_R (the outlines'
  // own thickness, which every viewer draws; see fallbackFit).
  const fit = useFit(item) ? await fallbackFit(item, PDF_R) : null, spec = openSpec(item, PDF_R);
  let shadow = null;
  if (fx.shadow) {
    const ang = ((fx.shadow.angle ?? 45) * Math.PI) / 180, d = (fx.shadow.dist ?? 0.08) * size, dx = Math.cos(ang) * d, dy = Math.sin(ang) * d;
    shadow = { color: unhex(fx.shadow.color), op: fx.shadow.op ?? 0.5, off: [dir[0] * dx - up[0] * dy, dir[1] * dx - up[1] * dy] };
  }
  const lines = [];
  for (const [i, l] of display.entries()) {
    const text = l.text.replace(/\s+$/, "");
    if (!text || (plan && !plan.changed[i])) continue;
    // Line by line: a line keeps the document's font whenever that font has all of its letters.
    const w = await pickWriter(out, tp, { size, pdfFont: docFont, heightFrom, family: famOf(item.font), bold: spec.bold, italic: spec.italic, weight: spec.weight, embedded, emboldenEm: fx.outline ? 0 : fit ? fit.strokeEm : null, outlinePath: !fx.outline && !!fit?.path }, text);
    if (docFont && w.used !== "document") notes.add("some new letters were not in the document's font, so the closest matching font was used");
    const [x, y] = toT(...at(item.x, item.baseline + i * G));
    const lay = layoutLine(text, w.widthOf, { x, y, dir, boxW, align: item.align || "left", justify: l.justify, spacing });
    lines.push({ i, w, text, x, y, lay });
  }
  if (!lines.length) return;
  if (fx.curve) {
    // Letters along an arc: theta = total angle, R = radius, sg = arch (+) or smile (-).
    for (const L of lines) {
      const chars = [...L.text], adv = chars.map((ch) => spacedWidth(L.w.widthOf, ch, spacing));
      const width = adv.reduce((a, b) => a + b, 0);
      const start = boxW == null ? 0 : item.align === "center" ? (boxW - width) / 2 : item.align === "right" ? boxW - width : 0;
      const theta = (Math.abs(fx.curve) / 100) * Math.PI * 1.5, R = width / theta, sg = Math.sign(fx.curve);
      let pos = 0;
      L.glyphs = [];
      chars.forEach((ch, j) => {
        const a = (pos + adv[j] / 2 - width / 2) / R, ang = r - sg * a, gd = [Math.cos(ang), Math.sin(ang)];
        const cu = start + width / 2 + R * Math.sin(a), cv = sg * R * (1 - Math.cos(a));
        if (ch.trim()) L.glyphs.push({ ch, x: L.x + dir[0] * cu - up[0] * cv - (gd[0] * adv[j]) / 2, y: L.y + dir[1] * cu - up[1] * cv - (gd[1] * adv[j]) / 2, deg: (ang * 180) / Math.PI });
        pos += adv[j];
      });
    }
  } else if (fx.bg && !target) {
    const padX = S * 0.28 * k, padY = S * 0.14 * k, rad = (fx.bg.mode === "line" ? S * 0.12 : S * 0.22) * k;
    const [ox, oy] = at(item.x, item.baseline);
    const spans = lines.map((L) => ({ u0: L.lay.start, u1: L.lay.start + L.lay.width, v: L.i * G * k }));
    const rects = fx.bg.mode === "line" ? spans.map((sp) => [sp.u0, sp.u1, sp.v, sp.v]) : [[Math.min(...spans.map((sp) => sp.u0)), Math.max(...spans.map((sp) => sp.u1)), spans[0].v, spans[spans.length - 1].v]];
    const [cr, cg, cb] = unhex(fx.bg.color);
    for (const [u0, u1, v0, v1] of rects) {
      const U = u0 - padX, V = v0 - size * 0.8 - padY;
      p.drawSvgPath(rectPath(0, 0, u1 - u0 + 2 * padX, v1 - v0 + size * 1.02 + 2 * padY, rad), { x: ox + dir[0] * U - up[0] * V, y: oy + dir[1] * U - up[1] * V, scale: 1, rotate: degrees(rot), color: rgb(cr / 255, cg / 255, cb / 255), borderWidth: 0 });
    }
  }
  const pass = (ink, off, opacity, stroke) => {
    for (const L of lines) {
      if (L.glyphs) for (const g of L.glyphs) L.w.draw(g.ch, g.x + off[0], g.y + off[1], { color: ink, rotationDeg: g.deg, spacing: null, render, stroke, opacity, join });
      else for (const seg of L.lay.segs) L.w.draw(seg.t, seg.x + off[0], seg.y + off[1], { color: ink, rotationDeg: rot, spacing, render, stroke, opacity, join });
    }
  };
  if (shadow) pass(shadow.color, shadow.off, shadow.op, outline ? { ...outline, color: shadow.color } : null);
  pass(item.color, [0, 0], inkAlpha, outline);
  if (target) target.finish(item.text.split("\n").map((t) => t.replace(/\s+$/, "")).join("\n"));
  if (item.font.underline && !fx.curve && !target) {
    for (const L of lines) {
      const off = size * 0.12, x0 = L.x + dir[0] * L.lay.start - up[0] * off, y0 = L.y + dir[1] * L.lay.start - up[1] * off;
      p.drawLine({ start: { x: x0, y: y0 }, end: { x: x0 + dir[0] * L.lay.width, y: y0 + dir[1] * L.lay.width }, thickness: Math.max(0.5, size * 0.06), color: color(item.color) });
    }
  }
}

// A comment thread as standard PDF comments (see comments.js).
function writeComment(out, p, item, at) {
  const [x1, y1] = at(item.x, item.y), [x2, y2] = at(item.x + 24, item.y + 24);
  writeCommentAnnots(out, p, item, [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]);
}

// Comments already in the file become editable threads (and are written back on download).
function importComments(page) {
  if (page.commentsImported) return;
  let threads = [];
  try { threads = readCommentAnnots(libPage(page)); } catch { return; }
  if (!threads.length) return;
  page.commentsImported = true;
  for (const t of threads) {
    const [vx, vy] = page.viewport.convertToViewportPoint(t.rect[0], t.rect[3]);
    const item = { id: uid(), type: "comment", pageId: page.id, x: vx, y: vy, color: t.color, resolved: t.resolved, thread: t.thread.map((m) => ({ id: uid(), ...m })) };
    state.items.push(item);
    drawItem(item);
  }
  refreshComments();
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function withBusy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true;
  btn.classList.add("busy");
  btn.textContent = label;
  try { await fn(); } catch (e) { toast(e.message || "Could not save the file.", 6000); } finally { btn.disabled = false; btn.classList.remove("busy"); btn.textContent = old; }
}

async function downloadPdf() {
  await withBusy($("downloadBtn"), "Saving…", async () => {
    const { bytes, notes } = await exportBytes();
    const name = state.fileName + "-edited.pdf";
    saveBlob(new Blob([bytes], { type: "application/pdf" }), name);
    toast("Saved " + name + (notes.length ? " (" + notes.join(", ") + ")" : ""));
  });
}

// Renders every edited page to a picture. A file that started as a picture keeps its original size.
async function exportImages() {
  const { bytes } = await exportBytes();
  const doc = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
  const info = isSingleImage() ? state.sources[state.pages[0].src].image : null;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const base = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: info ? info.width / base.width : 2 });
    const c = document.createElement("canvas");
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: ctx, viewport: vp }).promise;
    const type = info?.type === "image/jpeg" ? "image/jpeg" : "image/png";
    out.push({ blob: await new Promise((r) => c.toBlob(r, type, 0.95)), type });
  }
  return out;
}

async function downloadImage() {
  await withBusy($("downloadImgBtn"), "Saving…", async () => {
    const images = await exportImages();
    images.forEach(({ blob, type }, i) => {
      const ext = type === "image/jpeg" ? "jpg" : "png";
      saveBlob(blob, `${state.fileName}-edited${images.length > 1 ? "-page-" + (i + 1) : ""}.${ext}`);
    });
    toast(images.length > 1 ? `Saved ${images.length} pictures, one per page` : "Saved picture");
  });
}

/* ---------- signature: draw, type or upload ---------- */

const SIGN_FONTS = [
  '"Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive',
  '"Lucida Handwriting", "Bradley Hand", "Comic Sans MS", cursive',
  'italic 600 "Georgia", "Times New Roman", serif',
];

function trimCanvas(src) {
  const ctx = src.getContext("2d");
  const { data, width, height } = ctx.getImageData(0, 0, src.width, src.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 9, h = y1 - y0 + 9;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(src, x0 - 4, y0 - 4, w, h, 0, 0, w, h);
  return c;
}

function setupSignPad() {
  const pad = $("signPad");
  const ctx = pad.getContext("2d");
  let drawing = false, inked = false, tab = "draw", upload = null, styleIdx = 0;
  const color = () => $("signColor").value;
  const clear = () => {
    ctx.clearRect(0, 0, pad.width, pad.height);
    inked = false;
    upload = null;
    $("signUploadPreview").hidden = true;
    $("signName").value = "";
    renderStyles();
  };
  const pos = (e) => {
    const r = pad.getBoundingClientRect();
    return [(e.clientX - r.left) * (pad.width / r.width), (e.clientY - r.top) * (pad.height / r.height)];
  };
  pad.addEventListener("pointerdown", (e) => {
    drawing = true;
    pad.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  });
  pad.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    Object.assign(ctx, { lineWidth: 3, lineCap: "round", lineJoin: "round", strokeStyle: color() });
    ctx.lineTo(...pos(e));
    ctx.stroke();
    inked = true;
  });
  pad.addEventListener("pointerup", () => (drawing = false));

  // Typed signature: the name in a few handwriting styles to pick from.
  const typed = (i) => {
    const name = $("signName").value.trim();
    const c = document.createElement("canvas");
    c.width = 560; c.height = 120;
    if (!name) return c;
    const x = c.getContext("2d");
    const f = SIGN_FONTS[i];
    const fit = (px) => (f.startsWith("italic") ? f.replace("italic 600", `italic 600 ${px}px`) : `${px}px ${f}`);
    let px = 64;
    x.font = fit(px);
    while (x.measureText(name).width > 520 && px > 20) x.font = fit(--px);
    x.fillStyle = color();
    x.textBaseline = "middle";
    x.fillText(name, 20, 62);
    return c;
  };
  function renderStyles() {
    const box = $("signStyles");
    box.replaceChildren(...SIGN_FONTS.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sign-style" + (i === styleIdx ? " on" : "");
      const c = typed(i);
      b.append(c);
      b.addEventListener("click", () => { styleIdx = i; renderStyles(); });
      return b;
    }));
  }
  $("signName").addEventListener("input", renderStyles);
  $("signColor").addEventListener("input", () => { renderStyles(); if (upload) showUpload(); });

  // Uploaded signature photo: paper turns transparent, ink takes the chosen colour.
  const showUpload = () => {
    const prev = $("signUploadPreview");
    const x = prev.getContext("2d");
    const k = Math.min(prev.width / upload.width, prev.height / upload.height, 1);
    x.clearRect(0, 0, prev.width, prev.height);
    x.drawImage(upload, 0, 0, upload.width * k, upload.height * k);
    const img = x.getImageData(0, 0, prev.width, prev.height), d = img.data, ink = unhex(color());
    for (let i = 0; i < d.length; i += 4) {
      const l = lum([d[i], d[i + 1], d[i + 2]]);
      const a = l > 200 ? 0 : l < 120 ? 255 : Math.round(((200 - l) / 80) * 255);
      d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2]; d[i + 3] = Math.min(d[i + 3], a);
    }
    x.putImageData(img, 0, 0);
    prev.hidden = false;
  };
  $("signUpload").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const img = new Image();
    img.onload = () => { upload = img; showUpload(); };
    img.src = URL.createObjectURL(f);
  });

  document.querySelectorAll("#signDialog [data-tab]").forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    document.querySelectorAll("#signDialog [data-tab]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
    document.querySelectorAll("#signDialog [data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
    if (tab === "type") { renderStyles(); $("signName").focus(); }
  }));
  $("signClear").addEventListener("click", clear);
  $("signDialog").addEventListener("close", () => {
    if ($("signDialog").returnValue !== "ok") return;
    let src = null;
    if (tab === "draw" && inked) src = pad;
    if (tab === "type" && $("signName").value.trim()) src = typed(styleIdx);
    if (tab === "upload" && upload) src = $("signUploadPreview");
    const c = src && trimCanvas(src);
    if (!c) return toast("Nothing to place yet: draw, type or upload your signature first.");
    placeImage(c.toDataURL("image/png"), "image/png", c.width / 2, c.height / 2);
    clear();
  });
  renderStyles();
}

/* ---------- placing new things ---------- */

// A spot in the middle of the page on screen for a new w x h thing (page pixels).
function placeBox(w, h) {
  const page = visiblePage();
  if (!page) { toast("Open a file first, or start with a blank page."); return null; }
  const k = Math.min(1, (page.canvas.width * 0.8) / w);
  w *= k; h *= k;
  const r = page.el.getBoundingClientRect();
  let y = Math.min(Math.max(10, (window.innerHeight / 2 - r.top) / state.zoom - h / 2), Math.max(10, page.canvas.height - h - 10));
  const x = (page.canvas.width - w) / 2;
  // Don't drop a new thing on top of the last ones: move down (then up) to the nearest free spot.
  const taken = state.items.filter((i) => i.pageId === page.id && i.el && i.type !== "comment").map((i) => {
    const b = i.el.getBoundingClientRect();
    return { x: (b.left - r.left) / state.zoom, y: (b.top - r.top) / state.zoom, w: b.width / state.zoom, h: b.height / state.zoom };
  });
  const clear = (yy) => taken.every((b) => b.x >= x + w || b.x + b.w <= x || b.y >= yy + h || b.y + b.h <= yy);
  if (!clear(y)) {
    const max = Math.max(10, page.canvas.height - h - 10);
    for (let d = 16; d < page.canvas.height; d += 16) {
      if (y + d <= max && clear(y + d)) { y += d; break; }
      if (y - d >= 10 && clear(y - d)) { y -= d; break; }
    }
  }
  return { page, x, y, w, h };
}

/* ---------- text: spacing, alignment, effects ---------- */

function syncFxPanel(item) {
  const fx = item.fx || {};
  $("fxShadow").checked = !!fx.shadow;
  if (fx.shadow) { $("fxShadowColor").value = fx.shadow.color; $("fxShadowDist").value = fx.shadow.dist; $("fxShadowOp").value = fx.shadow.op; }
  $("fxOutline").checked = !!fx.outline;
  if (fx.outline) { $("fxOutlineColor").value = fx.outline.color; $("fxOutlineW").value = fx.outline.width; $("fxHollow").checked = !!fx.outline.hollow; }
  $("fxCurve").value = fx.curve || 0;
  $("fxCurveOut").textContent = fx.curve || 0;
  $("fxBg").checked = !!fx.bg;
  if (fx.bg) { $("fxBgColor").value = fx.bg.color; $("fxBgMode").value = fx.bg.mode || "box"; }
}
function readFxPanel() {
  const fx = {};
  if ($("fxShadow").checked) fx.shadow = { color: $("fxShadowColor").value, dist: +$("fxShadowDist").value, op: +$("fxShadowOp").value, angle: 45 };
  if ($("fxOutline").checked) fx.outline = { color: $("fxOutlineColor").value, width: +$("fxOutlineW").value, hollow: $("fxHollow").checked };
  if (+$("fxCurve").value) fx.curve = +$("fxCurve").value;
  if ($("fxBg").checked) fx.bg = { color: $("fxBgColor").value, mode: $("fxBgMode").value };
  return Object.keys(fx).length ? fx : undefined;
}
function setAlign(align) {
  updateSelected((i) => {
    if (i.type !== "text") return;
    // A box is needed to centre or right-align in: the widest line now, so nothing jumps.
    if (align !== "left" && i.boxW == null) i.boxW = Math.max(...displayLines(i).map((l) => l.width), i.size);
    i.align = align;
    document.querySelectorAll("#alignWrap [data-align]").forEach((b) => b.classList.toggle("on", b.dataset.align === align));
  });
}
function positionPopover(pop, btn) {
  pop.hidden = false;
  if (matchMedia("(max-width: 640px)").matches) { Object.assign(pop.style, { left: "", top: "" }); return; }
  const r = btn.getBoundingClientRect(), w = pop.offsetWidth;
  Object.assign(pop.style, { left: Math.max(8, Math.min(innerWidth - w - 8, r.left)) + "px", top: r.bottom + 8 + "px" });
}

/* ---------- tables ---------- */

function addTable(rows, cols, header) {
  const size = 11 * SCALE;
  ensureFace("sans", false, false); ensureFace("sans", true, false);
  const at = placeBox(Math.min(cols * 130, 520), rows * size * 2);
  if (!at) return;
  const table = newTable(rows, cols);
  table.header = header;
  if (!header) table.cells[0] = table.cells[0].map(() => "");
  const item = addItem({ type: "table", pageId: at.page.id, x: at.x, y: at.y, w: at.w, h: 10, size, table });
  setTool("edit");
  setTimeout(() => editTableCell(item, null, header ? 1 : 0, 0), 30);
}
// Types into one cell: a text box over the cell; Tab / Shift+Tab move between cells, Esc finishes.
function editTableCell(item, e, row, col) {
  const L = item._layout || tableLayout(item).layout;
  if (e) {
    const r = item.el.getBoundingClientRect(), x = (e.clientX - r.left) / state.zoom, y = (e.clientY - r.top) / state.zoom;
    row = L.rows.findIndex((rw) => y >= rw.y && y < rw.y + rw.h);
    col = L.colX.findIndex((cx, i) => i < L.colX.length - 1 && x >= cx && x < L.colX[i + 1]);
    if (row < 0 || col < 0) return;
  }
  item.cur = { r: row, c: col };
  item.el.querySelector(".cell-edit")?.remove();
  const rw = L.rows[row], cell = rw.cells[col], t = item.table;
  const ed = document.createElement("div");
  ed.className = "cell-edit";
  setEditable(ed);
  ed.textContent = t.cells[row][col];
  const head = t.header && row === 0;
  Object.assign(ed.style, { left: cell.x + "px", top: rw.y + "px", width: cell.w + "px", minHeight: rw.h + "px", padding: L.pad + "px", font: `${head ? 700 : 400} ${item.size}px ${CSS_FONT.sans.replace(/"/g, "'")}`, lineHeight: L.lineH + "px",
    color: head ? t.headerColor : t.color, background: head ? t.headerFill : "#fff", textAlign: t.align?.[col] || "left" });
  const before = t.cells[row][col];
  let saved = false;
  const save = () => { if (saved) return; saved = true; t.cells[row][col] = ed.innerText.replace(/\r/g, "").replace(/\n$/, ""); layoutItem(item); if (t.cells[row][col] !== before) commit(); };
  ed.addEventListener("pointerdown", (ev) => ev.stopPropagation());
  // The cell box grows while typing; the table itself is redrawn when the cell is left.
  ed.addEventListener("input", () => { t.cells[row][col] = ed.innerText.replace(/\r/g, "").replace(/\n$/, ""); collabTouch(item); });
  ed.addEventListener("keydown", (ev) => {
    if (ev.key === "Tab") {
      ev.preventDefault(); save();
      const n = row * t.cells[0].length + col + (ev.shiftKey ? -1 : 1), cols = t.cells[0].length;
      if (n >= 0 && n < t.cells.length * cols) editTableCell(item, null, Math.floor(n / cols), n % cols); else ed.blur();
    } else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); ed.blur(); }
  });
  ed.addEventListener("blur", () => { save(); ed.remove(); });
  item.el.append(ed);
  select(item);
  ed.focus();
  const range = document.createRange(); range.selectNodeContents(ed); range.collapse(false);
  getSelection().removeAllRanges(); getSelection().addRange(range);
}
function tableAction(act) {
  const item = state.selected;
  if (item?.type !== "table") return;
  const t = item.table, cols = t.cells[0].length, cur = item.cur || { r: t.cells.length - 1, c: cols - 1 };
  if (act === "addRow") t.cells.splice(cur.r + 1, 0, Array(cols).fill(""));
  if (act === "delRow") { if (t.cells.length > 1) t.cells.splice(cur.r, 1); item.cur = { r: Math.min(cur.r, t.cells.length - 1), c: cur.c }; }
  if (act === "addCol") { t.cells.forEach((row) => row.splice(cur.c + 1, 0, "")); const f = t.colW[cur.c] / 2; t.colW.splice(cur.c, 1, f, f); t.align.splice(cur.c + 1, 0, "left"); }
  if (act === "delCol" && cols > 1) { t.cells.forEach((row) => row.splice(cur.c, 1)); t.colW.splice(cur.c, 1); t.align.splice(cur.c, 1); item.cur = { r: cur.r, c: Math.min(cur.c, cols - 2) }; }
  if (act === "header") t.header = !t.header;
  if (act === "stripe") t.stripe = !t.stripe;
  layoutItem(item);
  select(item);
  commit();
}

/* ---------- charts ---------- */

let chartEditing = null, chartKind = "bar";
function chartSpecFromDialog() {
  const data = parseChartData($("chartData").value);
  return { kind: chartKind, title: $("chartTitle").value.trim(), labels: data.labels, series: data.series, showValues: $("chartValues").checked, colors: PALETTE };
}
function chartPreview() {
  try {
    const spec = chartSpecFromDialog();
    $("chartPreview").innerHTML = primsToSvg(chartPrims(spec, 420, 260), 420, 260);
    $("chartError").textContent = "";
    $("chartOk").disabled = false;
  } catch (e) { $("chartError").textContent = e.message; $("chartOk").disabled = true; }
}
function openChartDialog(item) {
  chartEditing = item || null;
  ensureFace("sans", false, false); ensureFace("sans", true, false);
  if (item) { chartKind = item.spec.kind; $("chartTitle").value = item.spec.title || ""; $("chartData").value = item.dataText || ""; $("chartValues").checked = item.spec.showValues !== false; }
  document.querySelectorAll("#chartKinds [data-kind]").forEach((b) => b.classList.toggle("on", b.dataset.kind === chartKind));
  $("chartOk").textContent = item ? "Update chart" : "Add chart";
  chartPreview();
  $("chartDialog").showModal();
}

/* ---------- elements (stickers) and photos ---------- */

let elementsLib = null, elCat = "", photosLib = null, sideTab = "elements";
function openSide(tab) {
  sideTab = tab;
  $("side").hidden = false;
  document.body.classList.add("side-open");
  document.querySelectorAll("#side [data-side]").forEach((b) => { b.classList.toggle("on", b.dataset.side === tab); b.setAttribute("aria-selected", b.dataset.side === tab); });
  document.querySelectorAll("#side [data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== tab));
  if (tab === "elements") renderElements();
  if (tab === "photos") renderPhotos();
  if (tab === "comments") refreshComments();
}
function closeSide() { $("side").hidden = true; document.body.classList.remove("side-open"); }
async function renderElements() {
  try { elementsLib ||= await import("./elements.js"); } catch { $("elGrid").innerHTML = '<p class="muted">Elements could not be loaded. Check the connection and try again.</p>'; return; }
  const { CATEGORIES, searchElements, elementSvg } = elementsLib;
  if (!$("elCats").childElementCount) {
    $("elCats").replaceChildren(...[{ id: "", label: "All" }, ...CATEGORIES].map((c) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (c.id === elCat ? " on" : ""); b.textContent = c.label; b.dataset.cat = c.id;
      b.addEventListener("click", () => { elCat = c.id; $("elCats").querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === b)); renderElements(); });
      return b;
    }));
  }
  const list = searchElements($("elSearch").value, elCat || undefined);
  $("elGrid").replaceChildren(...list.slice(0, 240).map((el) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "el-tile"; b.title = el.name; b.dataset.el = el.id;
    b.innerHTML = elementSvg(el, {}, 56);
    b.addEventListener("click", () => placeElement(el));
    return b;
  }));
  if (!list.length) $("elGrid").innerHTML = '<p class="muted">Nothing found. Try another word, like "arrow", "star" or "stamp".</p>';
}
function placeElement(el) {
  const [vw, vh] = el.vb, size = 150;
  const at = placeBox(vw >= vh ? size : (size * vw) / vh, vw >= vh ? (size * vh) / vw : size);
  if (!at) return;
  if (el.parts.some((p) => p.t !== undefined)) { ensureFace("sans", true, false); ensureFace("serif", true, false); }
  addItem({ type: "element", elId: el.id, name: el.name, pageId: at.page.id, x: at.x, y: at.y, w: at.w, h: at.h, vb: [vw, vh], parts: el.parts, defaults: el.defaults || {}, colors: {} });
  setTool("edit");
}
async function renderPhotos() {
  if (!photosLib) {
    try { photosLib = (await (await fetch(new URL("photos/photos.json", import.meta.url))).json()).photos || []; }
    catch { $("photoGrid").innerHTML = '<p class="muted">Photos could not be loaded. Check the connection and try again.</p>'; return; }
  }
  const words = $("photoSearch").value.toLowerCase().split(/\s+/).filter(Boolean);
  const list = photosLib.filter((ph) => words.every((w) => (ph.title + " " + ph.tags.join(" ")).toLowerCase().includes(w)));
  $("photoGrid").replaceChildren(...list.map((ph) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "photo-tile"; b.title = `${ph.title} · ${ph.author} · ${ph.license}`; b.dataset.photo = ph.id;
    const img = document.createElement("img");
    img.src = "photos/" + ph.thumb; img.alt = ph.title; img.loading = "lazy"; img.decoding = "async";
    b.append(img);
    b.addEventListener("click", () => placePhoto(ph, b));
    return b;
  }));
  if (!list.length) $("photoGrid").innerHTML = '<p class="muted">No photo matches. Try "mountain", "sea", "flowers" or "office".</p>';
}
async function placePhoto(ph, btn) {
  btn.classList.add("busy");
  try {
    const blob = await (await fetch(new URL("photos/" + ph.file, import.meta.url))).blob();
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    placeImage(dataUrl, "image/jpeg", ph.w, ph.h, { credit: { title: ph.title, author: ph.author, license: ph.license, source: ph.source } });
    toast(`Photo by ${ph.author} (${ph.license}), free to use.`);
  } catch { toast("That photo could not be loaded. Try again."); } finally { btn.classList.remove("busy"); }
}

/* ---------- comments ---------- */

const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const myName = () => (store.get("asaandesk-name") || "").trim() || "Guest";
function openComments(item) {
  openSide("comments");
  if (item) { select(item); refreshComments(item); }
}
function refreshComments(focusItem) {
  const all = state.items.filter((i) => i.type === "comment");
  $("commentCount").textContent = all.filter((c) => !c.resolved && c.thread?.length).length || "";
  all.forEach((c) => c.el && layoutItem(c));
  if ($("side").hidden || sideTab !== "comments") return;
  if (!$("myName").value) $("myName").value = store.get("asaandesk-name") || "";
  const show = all.filter((c) => !c.resolved || $("showResolved").checked || c === focusItem);
  if (!show.length) { $("threads").innerHTML = '<p class="muted">No comments yet. Choose <b>Comment</b>, then click anywhere on a page.</p>'; return; }
  const fmt = (ms) => new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  $("threads").replaceChildren(...show.map((c) => {
    const card = document.createElement("div");
    card.className = "thread" + (c === state.selected ? " active" : "") + (c.resolved ? " resolved" : "");
    card.dataset.comment = c.id;
    const head = document.createElement("div");
    head.className = "thread-head";
    const n = all.indexOf(c) + 1, page = state.pages.findIndex((p) => p.id === c.pageId) + 1;
    head.innerHTML = `<span class="pin small" style="--c:${c.color || "#f59e0b"}">${n}</span><span>Page ${page}</span><span class="grow"></span>`;
    const act = (label, fn, cls = "") => { const b = document.createElement("button"); b.type = "button"; b.className = "linkbtn " + cls; b.textContent = label; b.addEventListener("click", fn); return b; };
    if (c.thread?.length) head.append(act(c.resolved ? "Reopen" : "Resolve", () => { c.resolved = !c.resolved; c.resolvedBy = myName(); c.resolvedAt = Date.now(); commit(); refreshComments(); }, "resolve"));
    head.append(act("Delete", () => { removeItem(c); refreshComments(); }, "danger"));
    card.append(head);
    for (const m of c.thread || []) {
      const msg = document.createElement("div");
      msg.className = "msg";
      const who = document.createElement("b"); who.textContent = m.author;
      const when = document.createElement("span"); when.className = "muted"; when.textContent = " · " + fmt(m.at);
      const body = document.createElement("p"); body.textContent = m.text;
      msg.append(who, when, body);
      card.append(msg);
    }
    const box = document.createElement("textarea");
    box.rows = 2; box.placeholder = c.thread?.length ? "Reply…" : "Write a comment…"; box.className = "reply";
    const post = act(c.thread?.length ? "Reply" : "Post", () => {
      const text = box.value.trim();
      if (!text) return box.focus();
      (c.thread ||= []).push({ id: uid(), author: myName(), text, at: Date.now() });
      if (c.resolved) c.resolved = false;
      commit();
      refreshComments(c);
    }, "post");
    box.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post.click(); });
    card.append(box, post);
    card.addEventListener("click", (e) => { if (e.target === card || e.target.closest(".msg")) { select(c); c.el?.scrollIntoView({ block: "center", behavior: "smooth" }); } });
    if (c === focusItem) requestAnimationFrame(() => { card.scrollIntoView({ block: "nearest" }); if (!c.thread?.length) box.focus(); });
    return card;
  }));
}
/* ---------- AI writing ---------- */

let aiMod = null, aiSel = null;
function captureAiSelection() {
  const item = state.selected?.type === "text" ? state.selected : null;
  aiSel = null;
  if (!item) return;
  const sel = getSelection();
  if (sel.rangeCount && !sel.isCollapsed && item.span.contains(sel.anchorNode) && item.span.contains(sel.focusNode)) {
    const pre = document.createRange();
    pre.selectNodeContents(item.span);
    pre.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    const start = pre.toString().length, len = sel.toString().length;
    if (len) aiSel = { item, start, end: start + len };
  }
}
async function toggleAiPanel(btn) {
  const pop = $("aiPanel");
  if (!pop.hidden) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); return; }
  captureAiSelection();
  aiMod ||= await import("./ai.js");
  if (!$("aiLang").childElementCount) $("aiLang").innerHTML = aiMod.LANGUAGES.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
  const item = state.selected?.type === "text" ? state.selected : null;
  $("aiScope").textContent = aiSel ? `Works on the selected words: “${item.text.slice(aiSel.start, aiSel.end).slice(0, 60)}”` : item ? "Works on the whole text box. Select some words first to change only them." : "Click a text box first to rewrite it, or write something new below.";
  pop.querySelectorAll("[data-ai]").forEach((b) => (b.disabled = b.dataset.ai !== "write" && !item));
  $("aiStatus").textContent = "";
  positionPopover(pop, btn);
  btn.setAttribute("aria-expanded", "true");
  const st = await aiMod.aiStatus();
  if (!st.any) $("aiStatus").textContent = "AI writing needs Chrome's built-in AI on this device (Chrome on a computer). Online AI is not switched on yet.";
}
async function aiAction(task, style) {
  aiMod ||= await import("./ai.js");
  const status = $("aiStatus"), item = state.selected?.type === "text" ? state.selected : null;
  const buttons = $("aiPanel").querySelectorAll("[data-ai]");
  buttons.forEach((b) => (b.disabled = true));
  try {
    if (task === "write") {
      const result = await aiMod.runAi("write", $("aiPrompt").value, { context: item?.text || "", onStatus: (m) => (status.textContent = m) });
      const st = item ? { size: item.size, font: { ...item.font, orig: null, useOrig: false }, color: item.color, lineGap: item.lineGap, spacing: item.spacing } : lastTextStyle();
      const page = item ? pageOf(item) : visiblePage();
      if (!page) throw new Error("Open a file first.");
      const x = item ? item.x : page.canvas.width * 0.12;
      const baseline = item ? item.baseline + displayLines(item).length * lineGapOf(item) + st.size * 1.2 : (window.innerHeight / 2 - page.el.getBoundingClientRect().top) / state.zoom;
      addItem({ type: "text", pageId: page.id, x, baseline, ...st, text: result, boxW: page.canvas.width * 0.76 - x * 0.5, wrap: true });
      status.textContent = "Added. Edit it like any text; Undo removes it.";
    } else {
      if (!item) throw new Error("Click a text box first.");
      const sel = aiSel?.item === item ? aiSel : null;
      const source = sel ? item.text.slice(sel.start, sel.end) : item.text;
      const result = await aiMod.runAi(task, source, { style, target: $("aiLang").value, context: item.text, onStatus: (m) => (status.textContent = m) });
      if (!result) throw new Error("AI gave an empty answer. Try again.");
      item.text = sel ? item.text.slice(0, sel.start) + result + item.text.slice(sel.end) : result;
      item.span.textContent = item.text;
      if (sel) aiSel = { item, start: sel.start, end: sel.start + result.length };
      layoutItem(item);
      commit();
      status.textContent = "Done. Undo (Ctrl+Z) brings the old text back.";
    }
  } catch (e) {
    status.textContent = e.message || "AI could not finish. Try again.";
  } finally {
    buttons.forEach((b) => (b.disabled = b.dataset.ai !== "write" && !(state.selected?.type === "text")));
  }
}

/* ---------- pictures: background remover and magic eraser (on this device) ---------- */

const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("The picture could not be read.")); i.src = src; });
const progressLabel = (p) => (p.stage === "download" && p.total ? `Downloading ${Math.round((p.loaded / p.total) * 100)}%` : p.stage === "run" ? "Working…" : p.stage === "model" ? "Preparing…" : null);
async function removeBg() {
  const item = state.selected;
  if (item?.type !== "image") return;
  const btn = $("bgRemoveBtn");
  await withBusy(btn, "Preparing…", async () => {
    const { removeBackground } = await import("./imagetools.js");
    const img = await loadImage(item.dataUrl);
    const canvas = await removeBackground(img, { onProgress: (p) => { const l = progressLabel(p); if (l) btn.textContent = l; } });
    item.dataUrl = canvas.toDataURL("image/png");
    item.imgType = "image/png";
    drawItem(item);
    select(item);
    commit();
    toast("Background removed on this device. Undo brings it back.");
  });
}
let eraser = null;
async function openEraser() {
  const item = state.selected;
  if (item?.type !== "image") return;
  const img = await loadImage(item.dataUrl);
  import("./imagetools.js").then((m) => m.preload?.("erase")).catch(() => {});
  const maxW = Math.min(820, innerWidth - 64), maxH = Math.max(200, Math.min(560, innerHeight - 280));
  const k = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
  const W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
  for (const c of [$("eraseImg"), $("eraseMask")]) { c.width = W; c.height = H; c.style.width = W + "px"; c.style.height = H + "px"; }
  $("eraseImg").getContext("2d").drawImage(img, 0, 0, W, H);
  eraser = { item, img, k, strokes: [] };
  redrawMask();
  $("eraseStatus").textContent = "";
  $("eraseRun").disabled = false;
  $("eraseDialog").showModal();
}
function redrawMask() {
  const c = $("eraseMask"), x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  for (const s of eraser.strokes) paintStroke(x, s, 1, "rgba(255, 70, 90, 0.55)");
}
function paintStroke(x, s, scale, color) {
  Object.assign(x, { strokeStyle: color, fillStyle: color, lineWidth: s.size * scale, lineCap: "round", lineJoin: "round" });
  x.beginPath();
  s.pts.forEach(([a, b], i) => (i ? x.lineTo(a * scale, b * scale) : x.moveTo(a * scale, b * scale)));
  if (s.pts.length === 1) { x.arc(s.pts[0][0] * scale, s.pts[0][1] * scale, (s.size * scale) / 2, 0, Math.PI * 2); x.fill(); } else x.stroke();
}
async function runEraser() {
  if (!eraser?.strokes.length) { $("eraseStatus").textContent = "Brush over something first."; return; }
  const { item, img, k } = eraser;
  const full = document.createElement("canvas");
  full.width = img.naturalWidth; full.height = img.naturalHeight;
  // The mask uses the composite-free stroke colour so semi-transparent overlaps don't leave gaps.
  const fx = full.getContext("2d");
  for (const s of eraser.strokes) paintStroke(fx, s, 1 / k, "#ffffff");
  $("eraseRun").disabled = true;
  try {
    const { magicErase } = await import("./imagetools.js");
    const out = await magicErase(img, full, { onProgress: (p) => { const l = progressLabel(p); if (l) $("eraseStatus").textContent = l; } });
    item.dataUrl = item.imgType === "image/jpeg" ? out.toDataURL("image/jpeg", 0.92) : out.toDataURL("image/png");
    drawItem(item);
    select(item);
    commit();
    $("eraseDialog").close();
    toast("Erased on this device. Undo brings it back.");
  } catch (e) {
    $("eraseStatus").textContent = e.message || "Could not erase. Try a smaller area.";
  } finally { $("eraseRun").disabled = false; }
}
function setupEraser() {
  const c = $("eraseMask");
  let cur = null;
  const pos = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height]; };
  c.addEventListener("pointerdown", (e) => { if (!eraser) return; c.setPointerCapture(e.pointerId); cur = { size: +$("eraseBrush").value, pts: [pos(e)] }; eraser.strokes.push(cur); redrawMask(); });
  c.addEventListener("pointermove", (e) => { if (!cur) return; cur.pts.push(pos(e)); redrawMask(); });
  c.addEventListener("pointerup", () => (cur = null));
  $("eraseUndo").addEventListener("click", () => { eraser?.strokes.pop(); if (eraser) redrawMask(); });
  $("eraseRun").addEventListener("click", runEraser);
}

/* ---------- live collaboration ---------- */

const collab = { session: null, id: null, link: null, owner: null, sent: new Map(), pages: "", pending: new Map(), touch: new Map(), queue: Promise.resolve(), chunks: new Map(), cursors: new Map(), color: null };
const COLLAB_COLORS = ["#5b4cf0", "#ff7a59", "#14b8a6", "#f43f5e", "#f59e0b", "#22c55e", "#2f80ff", "#a64bf4"];
collab.color = COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
const b64 = { enc: (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); }, dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };

// Everything the others need to rebuild the same document: every source file, in one locked bundle.
function packSources() {
  const head = new TextEncoder().encode(JSON.stringify({ fileName: state.fileName, sources: state.sources.map((s) => ({ size: s.bytes.length, image: s.image })) }));
  const total = 8 + head.length + state.sources.reduce((n, s) => n + s.bytes.length, 0);
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  out.set([65, 68, 66, 49]); dv.setUint32(4, head.length);
  out.set(head, 8);
  let o = 8 + head.length;
  for (const s of state.sources) { out.set(s.bytes, o); o += s.bytes.length; }
  return out;
}
function unpackSources(bytes) {
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== "ADB1") return { fileName: "document", sources: [{ bytes, image: null }] };
  const n = new DataView(bytes.buffer, bytes.byteOffset).getUint32(4), head = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + n)));
  let o = 8 + n;
  return { fileName: head.fileName, sources: head.sources.map((s) => { const b = bytes.slice(o, o + s.size); o += s.size; return { bytes: b, image: s.image }; }) };
}
const pageList = () => state.pages.map((p) => ({ id: p.id, src: p.src, index: p.index, baseRotate: p.baseRotate, extraRotate: p.extraRotate, blank: !!p.blank }));
const runIndex = (page, r) => (page.runs || []).findIndex((x) => x.run === r);
function serializeItem(i) {
  const o = {};
  for (const [k, v] of Object.entries(i)) if (!DOM_KEYS.includes(k) && !k.startsWith("_") && k !== "cur") o[k] = v;
  const page = pageOf(i) || {};
  if (i.runs) o.runs = i.runs.map((r) => runIndex(page, r));
  if (i.lines0) o.lines0 = i.lines0.map((l) => ({ ...l, runs: (l.runs || []).map((r) => runIndex(page, r)) }));
  return JSON.parse(JSON.stringify(o));
}
function deserializeItem(o, page) {
  const i = JSON.parse(JSON.stringify(o));
  const run = (ix) => page.runs?.[ix]?.run;
  if (o.runs) i.runs = o.runs.map(run).filter(Boolean);
  if (o.lines0) i.lines0 = o.lines0.map((l) => ({ ...l, runs: (l.runs || []).map(run).filter(Boolean) }));
  if (i.type === "text") {
    if (i.font?.orig) pdfFont(page, i.font.orig.key.split(":").slice(1).join(":"));
    ensureFace(famOf(i.font), i.font.bold, i.font.italic, i.font.weight);
  }
  return i;
}
async function collabSend(op) {
  if (!collab.session) return;
  const json = JSON.stringify(op);
  const parts = json.length > 180000 ? Math.ceil(json.length / 180000) : 1;
  try {
    if (parts === 1) await collab.session.send(op);
    else {
      const cid = uid();
      for (let n = 0; n < parts; n++) await collab.session.send({ t: "chunk", cid, n, of: parts, s: json.slice(n * 180000, (n + 1) * 180000) });
    }
  } catch (e) { toast(e.message || "A change could not be shared. Check the connection.", 6000); }
}
// Sends what changed since the last time (items added, changed or removed, and the page list).
function collabSync() {
  if (!collab.session) return;
  const seen = new Set();
  for (const i of state.items) {
    if (i.editing && i.type === "text") continue;
    const data = serializeItem(i), key = JSON.stringify(data);
    seen.add(i.id);
    if (collab.sent.get(i.id) !== key) { collab.sent.set(i.id, key); collabSend({ t: "set", item: data }); }
  }
  for (const id of [...collab.sent.keys()]) if (!seen.has(id) && !state.items.some((i) => i.id === id)) { collab.sent.delete(id); collabSend({ t: "del", id }); }
  collabPages();
}
function collabPages() {
  if (!collab.session) return;
  collab.srcSent ??= state.sources.length;
  for (; collab.srcSent < state.sources.length; collab.srcSent++) {
    const src = state.sources[collab.srcSent];
    if (src.bytes.length > 4 * 1048576) { toast("Files over 4 MB can't be added while editing live. Add them before you share."); continue; }
    collabSend({ t: "src", n: collab.srcSent, b64: b64.enc(src.bytes), image: src.image });
  }
  const sig = JSON.stringify(pageList());
  if (sig !== collab.pages) { collab.pages = sig; collabSend({ t: "pages", pages: pageList() }); }
}
// Typing: share the text a moment after each keystroke, not only when you click away.
function collabTouch(item) {
  if (!collab.session) return;
  clearTimeout(collab.touch.get(item.id));
  collab.touch.set(item.id, setTimeout(() => {
    const data = serializeItem(item), key = JSON.stringify(data);
    if (collab.sent.get(item.id) !== key) { collab.sent.set(item.id, key); collabSend({ t: "set", item: data }); }
  }, 350));
}
function collabApplyPending(item) {
  const next = collab.pending.get(item.id);
  if (!next) return;
  collab.pending.delete(item.id);
  applyRemoteSet(next);
}
let presenceTimer = null, lastPointer = null;
function collabPresenceSoon() {
  if (!collab.session || presenceTimer) return;
  presenceTimer = setTimeout(() => {
    presenceTimer = null;
    const p = lastPointer;
    collab.session?.setPresence({ name: myName(), color: collab.color, page: p?.page ?? null, x: p?.x ?? null, y: p?.y ?? null, sel: state.selected?.id || null });
  }, 120);
}
async function ensureSources(list) {
  for (const [n, s] of list.entries()) if (!state.sources[n]) await loadSource(s.bytes, s.image);
}
async function applyPages(list) {
  const keep = new Set(list.map((p) => p.id));
  for (const page of [...state.pages]) if (!keep.has(page.id)) {
    state.items.filter((i) => i.pageId === page.id).forEach((i) => removeItem(i, false));
    page.wrap?.remove();
    state.pages = state.pages.filter((p) => p !== page);
  }
  const next = [];
  for (const d of list) {
    let page = state.pages.find((p) => p.id === d.id);
    if (!page) {
      if (!state.sources[d.src]) continue;
      page = { id: d.id, src: d.src, index: d.index, baseRotate: d.baseRotate, extraRotate: d.extraRotate, blank: d.blank, commentsImported: true };
      buildPageShell(page, next[next.length - 1] || null);
      if (!next.length) $("pages").prepend(page.wrap);
      state.pages.push(page);
      await renderPage(page);
    } else if (page.extraRotate !== d.extraRotate) {
      page.extraRotate = d.extraRotate; page.ocrDone = false; page.scan = undefined;
      await renderPage(page);
    }
    next.push(page);
  }
  state.pages = next;
  for (const page of next) $("pages").append(page.wrap);
  collab.pages = JSON.stringify(pageList());
  if (next.length === 1 && !state.zoomSet) { fitZoom(); state.zoomSet = true; }
}
function applyRemoteSet(data) {
  const page = state.pages.find((p) => p.id === data.pageId);
  if (!page) return;
  const cur = state.items.find((i) => i.id === data.id);
  if (cur?.editing) { collab.pending.set(cur.id, data); return; }
  const item = deserializeItem(data, page);
  collab.sent.set(data.id, JSON.stringify(data));
  if (cur) {
    for (const k of Object.keys(cur)) if (!DOM_KEYS.includes(k)) delete cur[k];
    Object.assign(cur, item);
    drawItem(cur);
    if (state.selected === cur) select(cur);
  } else {
    state.items.push(item);
    drawItem(item);
  }
  for (const r of item.runs || []) page.runs.find((x) => x.run === r)?.hit.remove();
}
function applyRemoteDel(id) {
  const item = state.items.find((i) => i.id === id);
  collab.sent.delete(id);
  if (!item) return;
  const page = pageOf(item);
  removeItem(item, false);
  for (const r of item.runs || []) { const e = page?.runs.find((x) => x.run === r); if (e && !e.hit.isConnected && !state.items.some((i) => i.runs?.includes(r))) page.hits.append(e.hit); }
}
async function applyOps(ops) {
  for (let op of ops) {
    if (op.t === "chunk") {
      const c = collab.chunks.get(op.cid) || [];
      c[op.n] = op.s;
      collab.chunks.set(op.cid, c);
      if (c.filter((x) => x !== undefined).length < op.of) continue;
      collab.chunks.delete(op.cid);
      op = JSON.parse(c.join(""));
    }
    if (op.t === "init") {
      if (op.fileName) state.fileName = op.fileName;
      await applyPages(op.pages);
      for (const it of op.items) applyRemoteSet(it);
    } else if (op.t === "src") {
      if (!state.sources[op.n]) await loadSource(b64.dec(op.b64), op.image || null);
      collab.srcSent = Math.max(collab.srcSent ?? 0, op.n + 1);
    } else if (op.t === "pages") await applyPages(op.pages);
    else if (op.t === "set") applyRemoteSet(op.item);
    else if (op.t === "del") applyRemoteDel(op.id);
  }
  refreshChrome();
  refreshComments();
  // Undo only steps back through your own changes made after this point.
  commit(true);
}
function renderPeople(others) {
  const people = $("people");
  const me = { client: "me", name: myName(), color: collab.color };
  people.replaceChildren(...[me, ...others].map((o) => {
    const b = document.createElement("span");
    b.className = "avatar";
    b.style.background = o.color || "#64748b";
    b.textContent = (o.name || "?").trim().slice(0, 1).toUpperCase();
    b.title = o.client === "me" ? `${o.name} (you)` : o.name;
    return b;
  }));
  people.hidden = !collab.session;
  // Cursors of the others on the pages.
  const live = new Set();
  for (const o of others) {
    live.add(o.client);
    let c = collab.cursors.get(o.client);
    const page = o.page != null ? state.pages[o.page] : null;
    if (!page || o.x == null) { c?.remove(); collab.cursors.delete(o.client); continue; }
    if (!c) { c = document.createElement("div"); c.className = "cursor"; collab.cursors.set(o.client, c); }
    c.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 1l11 7-5 1-2 5z" fill="${o.color}" stroke="#fff" stroke-width="1.2"/></svg><span style="background:${o.color}">${escHtml(o.name || "Guest")}</span>`;
    Object.assign(c.style, { left: o.x + "px", top: o.y + "px" });
    if (c.parentElement !== page.el) page.el.append(c);
    for (const it of state.items) it.el?.classList.toggle("remote-sel", others.some((x) => x.sel === it.id));
  }
  for (const [id, c] of collab.cursors) if (!live.has(id)) { c.remove(); collab.cursors.delete(id); }
}
function wireSession(session) {
  collab.session = session;
  session.onOps((ops) => { collab.queue = collab.queue.then(() => applyOps(ops)).catch((e) => console.error(e)); });
  session.onPresence((others) => renderPeople(others));
  session.onStatus((st) => {
    $("collabStatus").textContent = st.state === "live" ? "Live: changes are shared as you make them." : st.message || "";
    document.body.classList.toggle("collab-offline", st.state !== "live");
    if (st.state === "error") toast(st.message || "Live editing stopped.", 6000);
  });
  renderPeople([]);
  $("collabBtn").classList.add("on");
  $("collabBtn").textContent = "Live";
  collabPresenceSoon();
}
async function startCollab() {
  if (!state.pages.length) return toast("Open a file first.");
  const name = $("collabName").value.trim() || myName();
  store.set("asaandesk-name", name);
  $("collabStart").disabled = true;
  $("collabStatus").textContent = "Locking the file and creating the link…";
  try {
    const { createRoom } = await import("./collab.js");
    const { API } = await import("./config.js");
    const room = await createRoom({ api: API, pdfBytes: packSources(), user: { name, color: collab.color }, name: state.fileName + ".pdf", origin: location.origin, linkPath: location.pathname });
    Object.assign(collab, { id: room.id, owner: room.ownerToken, link: room.link + "" });
    if (API !== "https://asaandesk-api.asaandesk.workers.dev") collab.link = room.link.replace("#", `&api=${encodeURIComponent(API)}#`);
    wireSession(room.session);
    collab.sent.clear();
    const items = state.items.map(serializeItem);
    items.forEach((d) => collab.sent.set(d.id, JSON.stringify(d)));
    collab.pages = JSON.stringify(pageList());
    await collabSend({ t: "init", fileName: state.fileName, pages: pageList(), items });
    $("collabLink").value = collab.link;
    $("collabLinkRow").hidden = false;
    $("collabStart").hidden = true;
    $("collabStop").hidden = false;
    $("collabStatus").textContent = "Live. Send this link to the people who should edit with you. It works for 7 days.";
  } catch (e) {
    $("collabStatus").textContent = e.message || "The live link could not be created. Check the connection and try again.";
  } finally { $("collabStart").disabled = false; }
}
async function joinCollab(link) {
  const { parseRoomLink, joinRoom } = await import("./collab.js");
  const { API } = await import("./config.js");
  const r = parseRoomLink(link);
  if (!r) return;
  document.body.classList.add("loading");
  toast("Opening the shared PDF…", 8000);
  try {
    const { session, pdfBytes } = await joinRoom({ api: API, id: r.id, key: r.key, user: { name: myName(), color: collab.color } });
    const pack = unpackSources(pdfBytes);
    state.sources = []; state.pages = []; state.items = []; $("pages").replaceChildren(); fonts.clear();
    state.fileName = pack.fileName || "document";
    await ensureSources(pack.sources);
    Object.assign(collab, { id: r.id, link });
    wireSession(session);
    await session.ready;
    await collab.queue;
    refreshChrome();
    toast(`You're editing live with others. Changes are shared as you make them.`);
  } catch (e) {
    toast(e.message || "This live link could not be opened.", 8000);
  } finally { document.body.classList.remove("loading"); }
}
async function stopCollab() {
  if (collab.owner) { try { const { deleteRoom } = await import("./collab.js"); const { API } = await import("./config.js"); await deleteRoom({ api: API, id: collab.id, ownerToken: collab.owner }); } catch {} }
  await collab.session?.close?.();
  Object.assign(collab, { session: null, id: null, owner: null, link: null });
  renderPeople([]);
  $("collabBtn").classList.remove("on");
  $("collabBtn").innerHTML = 'Share<span class="hide-sm"> live</span>';
  $("collabLinkRow").hidden = true; $("collabStart").hidden = false; $("collabStop").hidden = true;
  $("collabStatus").textContent = "Live sharing stopped and the link was closed.";
}

/* ---------- wiring ---------- */

function setTool(tool) {
  if (tool === "image") return $("imageInput").click();
  if (tool === "table") { if (!state.pages.length) return toast("Open a file first, or start with a blank page."); return $("tableDialog").showModal(); }
  if (tool === "chart") { if (!state.pages.length) return toast("Open a file first, or start with a blank page."); return openChartDialog(null); }
  if (tool === "elements") return $("side").hidden || sideTab === "comments" ? openSide(sideTab === "photos" ? "photos" : "elements") : closeSide();
  if (tool === "ai") return toggleAiPanel(document.querySelector('.tool[data-tool="ai"]'));
  if (tool === "sign") return $("signDialog").showModal();
  if (tool === "find") {
    if (!state.pages.length) return toast("Open a file first.");
    if (state.pages.some((p) => !p.rendered)) return toast("Pages are still loading. Try Find & replace again in a moment.");
    return $("findDialog").showModal();
  }
  state.tool = tool;
  document.body.dataset.tool = tool;
  document.querySelectorAll(".tool").forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
  $("penBar").hidden = tool !== "draw";
  if (tool === "draw") { const p = visiblePage(); if (p) penForPage(p); }
  refreshStyleBar();
}

function updateSelected(fn, record = true) {
  const item = state.selected;
  if (!item) return;
  fn(item);
  fitCell(item);
  layoutItem(item);
  refreshStyleBar();
  if (record) commitSoon();
}

fillFontSelect();
$("openInput").addEventListener("change", (e) => { openFiles(e.target.files, true); e.target.value = ""; });
$("mergeInput").addEventListener("change", (e) => { openFiles(e.target.files, state.pages.length === 0); e.target.value = ""; });
document.querySelectorAll(".tool").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));
$("imageInput").addEventListener("change", (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => placeImage(reader.result, f.type, img.naturalWidth, img.naturalHeight);
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
});

$("propFont").addEventListener("change", (e) => updateSelected((i) => {
  if (e.target.value === "orig") i.font.useOrig = true;
  else { i.font.useOrig = false; i.font.family = e.target.value; ensureFace(i.font.family, i.font.bold, i.font.italic); }
}));
$("propSize").addEventListener("input", (e) => updateSelected((i) => {
  const v = parseFloat(e.target.value);
  if (v > 0) { const ratio = lineGapOf(i) / i.size; i.size = v * SCALE; i.lineGap = i.size * ratio; if (i.size0) { i.size0 = i.size; i.lineGap0 = i.lineGap; } }
}));
$("propLeading").addEventListener("input", (e) => updateSelected((i) => {
  const v = parseFloat(e.target.value);
  if (v >= 0.5) { i.lineGap = i.size * v; if (i.size0) i.lineGap0 = i.size0 * v; }
}));
const toggleFont = (key, id) => $(id).addEventListener("click", () => updateSelected((i) => {
  i.font[key] = !i.font[key];
  $(id).classList.toggle("on", i.font[key]);
  if (key === "bold") i.font.weight = i.font.bold ? 700 : 400;
  if (key !== "underline") { i.font.useOrig = false; ensureFace(famOf(i.font), i.font.bold, i.font.italic, i.font.weight); }
}));
toggleFont("bold", "propBold");
toggleFont("italic", "propItalic");
toggleFont("underline", "propUnderline");
$("propColor").addEventListener("input", (e) => updateSelected((i) => {
  if (i.type === "element") i.colors = { ...i.colors, c1: e.target.value };
  else if (i.type === "table") i.table.color = e.target.value;
  else { i.color = unhex(e.target.value); if (i.type === "shape" || i.type === "draw") lastDrawColor = i.color; }
}));
$("propColor2").addEventListener("input", (e) => updateSelected((i) => { if (i.type === "element") i.colors = { ...i.colors, c2: e.target.value }; }));
$("propLetter").addEventListener("input", (e) => updateSelected((i) => {
  const v = parseFloat(e.target.value);
  if (i.type === "text" && Number.isFinite(v)) i.spacing = { ...(i.spacing || {}), charSpacing: Math.max(-5, Math.min(40, v)) };
}));
document.querySelectorAll("#alignWrap [data-align]").forEach((b) => b.addEventListener("click", () => setAlign(b.dataset.align)));
for (const id of ["fxShadow", "fxShadowColor", "fxShadowDist", "fxShadowOp", "fxOutline", "fxOutlineColor", "fxOutlineW", "fxHollow", "fxCurve", "fxBg", "fxBgColor", "fxBgMode"]) {
  $(id).addEventListener("input", (e) => {
    // Picking a colour or moving a slider switches that effect on.
    const on = { fxShadowColor: "fxShadow", fxShadowDist: "fxShadow", fxShadowOp: "fxShadow", fxOutlineColor: "fxOutline", fxOutlineW: "fxOutline", fxHollow: "fxOutline", fxBgColor: "fxBg", fxBgMode: "fxBg" }[e.target.id];
    if (on) $(on).checked = true;
    $("fxCurveOut").textContent = $("fxCurve").value;
    updateSelected((i) => { if (i.type === "text") i.fx = readFxPanel(); });
  });
}
$("fxBtn").addEventListener("click", () => {
  const pop = $("fxPanel");
  if (!pop.hidden) { pop.hidden = true; $("fxBtn").setAttribute("aria-expanded", "false"); return; }
  if (state.selected?.type === "text") syncFxPanel(state.selected);
  positionPopover(pop, $("fxBtn"));
  $("fxBtn").setAttribute("aria-expanded", "true");
});
$("fxClose").addEventListener("click", () => { $("fxPanel").hidden = true; $("fxBtn").setAttribute("aria-expanded", "false"); });
$("fxClear").addEventListener("click", () => updateSelected((i) => { if (i.type === "text") { delete i.fx; syncFxPanel(i); } }));
// Keep the text selection while the AI and Effects buttons are pressed.
for (const id of ["aiBtn", "fxBtn"]) $(id).addEventListener("pointerdown", (e) => e.preventDefault());
document.querySelector('.tool[data-tool="ai"]').addEventListener("pointerdown", (e) => e.preventDefault());
$("aiBtn").addEventListener("click", () => toggleAiPanel($("aiBtn")));
$("aiPanel").querySelectorAll("[data-ai]").forEach((b) => b.addEventListener("click", () => aiAction(b.dataset.ai, b.dataset.style)));
$("aiPrompt").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); aiAction("write"); } });
document.addEventListener("pointerdown", (e) => {
  for (const [pop, btns] of [["fxPanel", ["fxBtn"]], ["aiPanel", ["aiBtn"]]]) {
    if ($(pop).hidden || e.target.closest("#" + pop) || btns.some((b) => e.target.closest("#" + b)) || e.target.closest('.tool[data-tool="ai"]')) continue;
    if (pop === "fxPanel" && e.target.closest(".item.selected")) continue;
    $(pop).hidden = true;
  }
});
// Tables
$("tableDialog").addEventListener("close", () => { if ($("tableDialog").returnValue === "ok") addTable(Math.max(1, Math.min(40, +$("tblRows").value || 3)), Math.max(1, Math.min(12, +$("tblCols").value || 3)), $("tblHead").checked); });
document.querySelectorAll("[data-tbl]").forEach((b) => b.addEventListener("click", () => tableAction(b.dataset.tbl)));
$("tblBorder").addEventListener("input", (e) => updateSelected((i) => { if (i.type === "table") i.table.border = { ...(i.table.border || { width: 1 }), color: e.target.value }; }));
$("tblHeadColor").addEventListener("input", (e) => updateSelected((i) => { if (i.type === "table") i.table.headerFill = e.target.value; }));
// Charts
document.querySelectorAll("#chartKinds [data-kind]").forEach((b) => b.addEventListener("click", () => { chartKind = b.dataset.kind; document.querySelectorAll("#chartKinds [data-kind]").forEach((x) => x.classList.toggle("on", x === b)); chartPreview(); }));
for (const id of ["chartTitle", "chartData", "chartValues"]) $(id).addEventListener("input", chartPreview);
$("chartDialog").addEventListener("close", () => {
  if ($("chartDialog").returnValue !== "ok") return;
  let spec;
  try { spec = chartSpecFromDialog(); } catch (e) { return toast(e.message); }
  if (chartEditing && state.items.includes(chartEditing)) {
    chartEditing.spec = spec; chartEditing.dataText = $("chartData").value;
    layoutItem(chartEditing); select(chartEditing); commit();
  } else {
    const at = placeBox(440, 280);
    if (at) addItem({ type: "chart", pageId: at.page.id, x: at.x, y: at.y, w: at.w, h: at.h, spec, dataText: $("chartData").value });
  }
  setTool("edit");
});
$("chartEditBtn").addEventListener("click", () => state.selected?.type === "chart" && openChartDialog(state.selected));
// Side panel: elements, photos, comments
document.querySelectorAll("#side [data-side]").forEach((b) => b.addEventListener("click", () => openSide(b.dataset.side)));
$("sideClose").addEventListener("click", closeSide);
let searchTimer = null;
$("elSearch").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderElements, 120); });
$("photoSearch").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderPhotos, 120); });
$("showResolved").addEventListener("change", () => refreshComments());
$("myName").addEventListener("change", (e) => { store.set("asaandesk-name", e.target.value.trim()); collabPresenceSoon(); });
// Pictures
$("bgRemoveBtn").addEventListener("click", removeBg);
$("eraserBtn").addEventListener("click", openEraser);
setupEraser();
// Live collaboration
$("collabBtn").addEventListener("click", () => {
  $("collabName").value = store.get("asaandesk-name") || "";
  $("collabStatus").textContent = collab.session ? "Live: changes are shared as you make them." : "";
  $("collabDialog").showModal();
});
$("collabStart").addEventListener("click", startCollab);
$("collabStop").addEventListener("click", stopCollab);
$("collabCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("collabLink").value); toast("Link copied."); } catch { $("collabLink").select(); } });
$("collabName").addEventListener("change", (e) => { store.set("asaandesk-name", e.target.value.trim()); collabPresenceSoon(); });
$("propOpacity").addEventListener("input", (e) => updateSelected((i) => { i.opacity = parseFloat(e.target.value); }));
$("findDialog").addEventListener("close", () => {
  if ($("findDialog").returnValue !== "ok") return;
  const n = findReplace($("findText").value, $("replaceText").value, $("findCase").checked);
  toast(n ? `Replaced ${n} time${n > 1 ? "s" : ""}. Check the pages, then Download PDF.` : "That text was not found in the PDF's text.");
});
$("propBg").addEventListener("input", (e) => updateSelected((i) => {
  if (i.type === "rect") i.color = unhex(e.target.value);
  else if (i.cover) i.cover.color = unhex(e.target.value);
  else if (i.lines0) i.lines0 = i.lines0.map((l) => ({ ...l, box: { ...l.box, color: unhex(e.target.value) } }));
}));
$("deleteBtn").addEventListener("click", () => state.selected && removeItem(state.selected));
$("removeTextBtn").addEventListener("pointerdown", (e) => e.preventDefault()); // keep the text selected
$("removeTextBtn").addEventListener("click", removeSelectedText);
$("restoreBtn").addEventListener("click", restoreSelected);
$("undoBtn").addEventListener("click", undo);
$("redoBtn").addEventListener("click", redo);
$("zoomIn").addEventListener("click", () => setZoom(state.zoom * 1.2));
$("zoomOut").addEventListener("click", () => setZoom(state.zoom / 1.2));
$("zoomFit").addEventListener("click", fitZoom);
$("blankBtn").addEventListener("click", startBlank);
$("previewBtn").addEventListener("click", () => {
  document.activeElement?.blur?.();
  select(null);
  const on = document.body.classList.toggle("preview");
  $("previewBtn").classList.toggle("on", on);
  $("previewBtn").setAttribute("aria-pressed", String(on));
});

// Pen bar
$("penKind").addEventListener("change", (e) => { state.pen.kind = e.target.value; refreshStyleBar(); document.body.dataset.pen = state.pen.kind; });
$("penColor").addEventListener("input", (e) => { state.pen.color = unhex(e.target.value); state.pen.userSet = true; state.pen.source = null; refreshStyleBar(); });
$("penWidth").addEventListener("input", (e) => {
  state.pen.width = parseFloat(e.target.value) * SCALE;
  state.pen.userSet = true;
  state.pen.source = null;
  $("penWidthOut").textContent = parseFloat(e.target.value).toFixed(2) + " pt";
  refreshStyleBar();
});
$("penColor").value = hex(state.pen.color);
$("penWidth").value = state.pen.width / SCALE;
$("penWidthOut").textContent = (state.pen.width / SCALE).toFixed(2) + " pt";

// "Start with" on the start page: pick a file, then go straight to that tool.
const ACCEPT = { pdf: "application/pdf", image: "image/png,image/jpeg", jpg: "image/jpeg", png: "image/png" };
document.querySelectorAll("#toolsGrid button").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.start === "blank") return startBlank();
  const input = $("startInput");
  input.accept = ACCEPT[b.dataset.accept];
  input.multiple = b.dataset.start === "merge";
  input.dataset.start = b.dataset.start;
  input.click();
}));
$("startInput").addEventListener("change", async (e) => {
  const start = e.target.dataset.start;
  await openFiles(e.target.files, true);
  e.target.value = "";
  if (!state.pages.length) return;
  if (start === "sign") setTool("sign");
  else if (start === "image") setTool("image");
  else if (start === "rotate") toast("Press Rotate above any page, then Download PDF.");
  else if (start === "merge") toast(`${state.pages.length} pages joined. Use ↑ and ↓ to reorder, then Download PDF.`);
  else if (start === "topdf") toast("Your picture is now a PDF page. Press Download PDF to save it.");
  else if (start === "toimg") downloadImage();
});
$("downloadBtn").addEventListener("click", downloadPdf);
$("downloadImgBtn").addEventListener("click", downloadImage);

document.addEventListener("keydown", (e) => {
  const typing = e.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
  if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && state.selected && !typing) {
    e.preventDefault();
    removeItem(state.selected);
  }
  if (e.key === "Escape") { document.activeElement?.blur(); select(null); }
});

const viewer = $("viewer");
viewer.addEventListener("dragover", (e) => { e.preventDefault(); viewer.classList.add("drag"); });
viewer.addEventListener("dragleave", () => viewer.classList.remove("drag"));
viewer.addEventListener("drop", (e) => {
  e.preventDefault();
  viewer.classList.remove("drag");
  openFiles(e.dataTransfer.files, state.pages.length === 0);
});
// Pinch-free zoom with Ctrl + wheel.
viewer.addEventListener("wheel", (e) => {
  if (!e.ctrlKey || !state.pages.length) return;
  e.preventDefault();
  setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
}, { passive: false });

// Tools row (desktop): every tool stays reachable; the ones that do not fit go into a "More" menu instead of being cut
// off at the window edge (Canva keeps its toolbar whole).
(function fitToolsRow() {
  const row = document.querySelector(".bar > .tools");
  if (!row) return;
  const more = document.createElement("button");
  more.type = "button"; more.className = "tool more-tools"; more.hidden = true;
  more.setAttribute("aria-haspopup", "menu"); more.setAttribute("aria-expanded", "false"); more.title = "More tools";
  more.textContent = "More ▾";
  row.append(more);
  let menu = null;
  const close = () => { menu?.remove(); menu = null; more.setAttribute("aria-expanded", "false"); };
  more.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu) return close();
    menu = document.createElement("div"); menu.className = "more-tools-menu"; menu.setAttribute("role", "menu");
    for (const t of row.querySelectorAll(".tool.folded")) {
      const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = t.textContent.trim();
      b.addEventListener("click", () => { close(); t.click(); requestAnimationFrame(fit); });
      menu.append(b);
    }
    document.body.append(menu);
    const r = more.getBoundingClientRect();
    menu.style.top = r.bottom + 6 + "px"; menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8)) + "px";
    more.setAttribute("aria-expanded", "true");
    menu.querySelector("button")?.focus();
  });
  document.addEventListener("pointerdown", (e) => { if (menu && !menu.contains(e.target) && e.target !== more) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu) { close(); more.focus(); } });
  const fit = () => {
    const kids = [...row.children].filter((el) => el !== more);
    kids.forEach((el) => el.classList.remove("folded"));
    more.hidden = true;
    if (matchMedia("(max-width: 640px)").matches || row.scrollWidth <= row.clientWidth + 1) return;
    more.hidden = false;
    for (let i = kids.length - 1; i >= 0 && row.scrollWidth > row.clientWidth + 1; i--) if (!kids[i].classList.contains("active")) kids[i].classList.add("folded");
  };
  if (typeof ResizeObserver === "function") new ResizeObserver(() => requestAnimationFrame(fit)).observe(row);
  addEventListener("resize", fit);
  requestAnimationFrame(fit);
})();

setupSignPad();
setTool("edit");
refreshHistory();

// AsaanDesk: /pdf-editor/?start=sign|merge|rotate|image|topdf|toimg|blank opens the matching tool directly.
{
  const want = new URLSearchParams(location.search).get("start");
  if (want === "blank") startBlank();
  const btn = want && document.querySelector(`#toolsGrid button[data-start="${CSS.escape(want)}"]`);
  if (btn) document.querySelectorAll('label[for="openInput"].bigbtn').forEach((l) => l.addEventListener("click", (e) => { e.preventDefault(); btn.click(); }));
}
// A live-editing link (?room=…#k=…) opens the shared document.
if (new URLSearchParams(location.search).get("room")) joinCollab(location.href);
// Used by automated checks.
// paintReady: resolves when every weight measurement and look-alike face started so far is done (tests wait on it).
const paintReady = async () => { await Promise.all([...fitCache.values()].map((e) => e.promise)); await Promise.all([...paintFaces.values()].map((e) => e.promise)); };
window.pdfEditor = { addPdf, addFile, exportBytes, exportImages, runOcr, state, fonts, undo, redo, setZoom, startBlank, pdfjsLib, select, layoutItem, displayLines, collab, commit, history, paintReady, fitLog };
