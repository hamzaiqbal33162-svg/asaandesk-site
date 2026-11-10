import * as pdfjsLib from "./lib/pdf.min.mjs";
import { removeTextRuns } from "./textremove.js";
import { loadPdfFont, previewSvg, drawWithPdfFont } from "./fontmatch.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./lib/pdf.worker.min.mjs", import.meta.url).href;
const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;

// Pages render at this zoom; every item position is stored in these screen pixels.
const SCALE = 1.5;
// Where the baseline sits inside a line-height:1 box.
const BASELINE = 0.85;

const CSS_FONT = {
  Helvetica: 'Helvetica, Arial, "Liberation Sans", sans-serif',
  Times: '"Times New Roman", Times, "Liberation Serif", serif',
  Courier: '"Courier New", Courier, "Liberation Mono", monospace',
};

const $ = (id) => document.getElementById(id);
const state = {
  sources: [],   // { bytes, doc (pdf.js), lib (pdf-lib), image: { type, width, height } | null }
  pages: [],     // { id, src, index, baseRotate, extraRotate, viewport, wrap, el, canvas, hits, itemsLayer }
  items: [],
  tool: "edit",
  selected: null,
  fileName: "document",
};
const fonts = new Map(); // "pageId:baseFont" -> reusable font from the PDF itself (see fontmatch.js)
let nextId = 1;

/* ---------- helpers ---------- */

function toast(msg, ms = 3500) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), ms);
}

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const unhex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const css = (c) => `rgb(${c.join(",")})`;
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const stripSubset = (n) => (n || "").replace(/^[A-Z]{6}\+/, "");

function fontKey({ family, bold, italic }) {
  if (family === "Times") return bold && italic ? "TimesRomanBoldItalic" : bold ? "TimesRomanBold" : italic ? "TimesRomanItalic" : "TimesRoman";
  const base = family === "Courier" ? "Courier" : "Helvetica";
  return base + (bold && italic ? "BoldOblique" : bold ? "Bold" : italic ? "Oblique" : "");
}

// Closest standard font, used when the PDF's own font can't write a character.
function detectFont(fontName, cssFamily) {
  const name = stripSubset(fontName);
  const bold = /bold|black|heavy|semibold|demi/i.test(name);
  const italic = /italic|oblique/i.test(name);
  let family = "Helvetica";
  if (/courier|mono|consol/i.test(name) || cssFamily === "monospace") family = "Courier";
  else if (/times|georgia|cambria|garamond|book|minion|serif/i.test(name) && !/sans/i.test(name)) family = "Times";
  else if (!name && cssFamily === "serif") family = "Times";
  return { family, bold, italic };
}

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
  const med = (k) => ring.map((o) => data[o + k]).sort((a, b) => a - b)[ring.length >> 1];
  const paper = [med(0), med(1), med(2)];
  return { ink: lum(paper) - lum(ink) < 40 ? [0, 0, 0] : ink, paper };
}

function pageOf(item) { return state.pages.find((p) => p.id === item.pageId); }

/* ---------- original fonts ---------- */

// The font a text run was written in, ready to write new text with.
function pdfFont(page, baseFont) {
  const key = `${page.id}:${baseFont}`;
  if (!fonts.has(key)) {
    let entry = null;
    try { entry = loadPdfFont(state.sources[page.src].lib.getPage(page.index), baseFont); } catch (e) { console.warn(e); }
    fonts.set(key, entry);
  }
  return fonts.get(key) ? key : null;
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

async function addPdf(bytes, name, replace, image = null) {
  let doc, lib;
  try {
    doc = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
    lib = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (e) {
    toast(e?.name === "PasswordException" ? "This PDF is password-protected. Remove the password first." : "This file could not be opened as a PDF.");
    return;
  }
  if (replace) {
    state.sources = [];
    state.pages = [];
    state.items = [];
    select(null);
    $("pages").replaceChildren();
    state.fileName = (name || "document").replace(/\.(pdf|png|jpe?g)$/i, "");
  }
  const src = state.sources.push({ bytes, doc, lib, image }) - 1;
  for (let i = 0; i < doc.numPages; i++) {
    const pdfPage = await doc.getPage(i + 1);
    const page = { id: nextId++, src, index: i, baseRotate: pdfPage.rotate, extraRotate: 0 };
    state.pages.push(page);
    buildPageShell(page);
    await renderPage(page);
  }
  refreshChrome();
}

async function openFiles(files, replace) {
  const ok = [...files].filter((f) => /pdf|png|jpe?g/i.test(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name));
  if (!ok.length) return toast("Please choose a PDF, PNG or JPG file.");
  for (const [i, f] of ok.entries()) await addFile(f, replace && i === 0);
}

function buildPageShell(page) {
  const wrap = document.createElement("div");
  wrap.className = "page-wrap";
  const tools = document.createElement("div");
  tools.className = "page-tools";
  tools.innerHTML = '<span class="num"></span><span class="ocr-status"></span><button data-act="ocr">Find text</button><button data-act="rotate">Rotate</button><button data-act="up">Move up</button><button data-act="remove">Delete page</button>';
  tools.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (act === "ocr") runOcr(page);
    if (act === "rotate") rotatePage(page);
    if (act === "up") movePageUp(page);
    if (act === "remove") removePage(page);
  });
  const el = document.createElement("div");
  el.className = "page";
  const canvas = document.createElement("canvas");
  const hits = document.createElement("div");
  hits.className = "layer hits";
  const items = document.createElement("div");
  items.className = "layer items";
  el.append(canvas, hits, items);
  wrap.append(tools, el);
  $("pages").append(wrap);
  Object.assign(page, { wrap, el, canvas, hits, itemsLayer: items, tools });
  el.addEventListener("pointerdown", (e) => onPagePointerDown(e, page));
}

async function renderPage(page) {
  const pdfPage = await state.sources[page.src].doc.getPage(page.index + 1);
  const viewport = pdfPage.getViewport({ scale: SCALE, rotation: (page.baseRotate + page.extraRotate) % 360 });
  page.viewport = viewport;
  const { canvas } = page;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  page.el.style.width = canvas.width + "px";
  page.el.style.height = canvas.height + "px";
  await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  const content = await pdfPage.getTextContent();
  page.hits.replaceChildren();
  let count = 0;
  for (const t of content.items) {
    if (!t.str || !t.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, t.transform);
    const size = Math.hypot(tx[2], tx[3]);
    if (size < 2 || Math.abs(tx[1]) > 0.01 * size) continue; // rotated text runs are not editable
    let baseFont = "";
    try { baseFont = pdfPage.commonObjs.get(t.fontName)?.name || ""; } catch {}
    addHit(page, {
      kind: "pdf",
      str: t.str,
      left: tx[4],
      baseline: tx[5],
      size,
      width: t.width * SCALE,
      baseFont,
      font: detectFont(baseFont, content.styles[t.fontName]?.fontFamily),
      pdf: { x: t.transform[4], y: t.transform[5], width: t.width, size: Math.hypot(t.transform[2], t.transform[3]) },
    });
    count++;
  }
  page.hasText = count > 0;
  // Pictures and scans have no text layer: read the text from the pixels instead.
  if (!page.hasText && !page.ocrDone) runOcr(page);
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
  hit.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    editExistingText(page, run, hit);
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
      // AsaanDesk: the OCR engine is shared with /pdf-editor/ (same files), so it downloads only once.
      if (!window.Tesseract) await loadScript("/pdf-editor/lib/ocr/tesseract.min.js");
      const base = new URL("/pdf-editor/lib/ocr/", location.href).href;
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
      font: { family: "Helvetica", bold: false, italic: false },
      confidence: Math.min(...ws.map((w) => w.confidence)),
    };
  });
}

/* ---------- items ---------- */

function editExistingText(page, run, hit) {
  const top = run.baseline - run.size * BASELINE;
  const box = run.box
    ? { x: run.box.x0 - 2, y: run.box.y0 - 2, w: run.box.x1 - run.box.x0 + 4, h: run.box.y1 - run.box.y0 + 4 }
    : { x: run.left - 1, y: top - 1, w: run.width + 2, h: run.size * 1.1 + 2 };
  const { ink, paper } = sampleColors(page.canvas, box.x, box.y, box.w, box.h);
  let font = run.font, size = run.size, matched = false;
  if (run.kind === "ocr") {
    const m = matchImageFont(page.canvas, run.box, run.str, run.baseline, ink, paper);
    if (m) { font = { family: m.family, bold: m.bold, italic: false }; size = m.size; matched = true; }
  }
  hit.remove();
  const origKey = run.kind === "pdf" && run.baseFont ? pdfFont(page, run.baseFont) : null;
  const item = addItem({
    type: "text",
    pageId: page.id,
    x: run.left,
    baseline: run.baseline,
    size,
    font: { ...font, orig: origKey ? { key: origKey, pageId: page.id } : null, useOrig: !!origKey, origName: run.baseFont ? prettyFont(run.baseFont) : null, matched },
    color: ink,
    text: run.str,
    cover: { ...box, color: paper },
    source: run.kind === "pdf" ? run.pdf : null,
    run,
  });
  focusText(item, true);
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
  for (const family of ["Helvetica", "Times", "Courier"]) {
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

function styleLabel(item) {
  const names = { Helvetica: "Sans (Arial/Helvetica)", Times: "Serif (Times)", Courier: "Mono (Courier)" };
  const orig = activeOrig(item);
  const name = orig ? item.font.origName : names[item.font.family];
  const where = orig ? "same font as the document" : item.font.matched ? "closest match to the picture" : item.font.orig && item.font.useOrig ? "closest font (some letters aren't in the document's font)" : "";
  const parts = [`<b>${name}</b>`, `${(item.size / SCALE).toFixed(1)} pt`, `<span class="swatch" style="background:${hex(item.color)}"></span> ${hex(item.color)}`];
  if (!orig && item.font.bold) parts.push("Bold");
  if (!orig && item.font.italic) parts.push("Italic");
  return `Detected style: ${parts.join(" · ")}${where ? ` <span style="color:var(--muted)">(${where})</span>` : ""}`;
}

function refreshStyleBar() {
  const item = state.selected;
  const isText = item?.type === "text";
  $("hint").hidden = isText;
  $("styleInfo").hidden = !isText;
  $("removeTextBtn").hidden = !(isText && item.cover);
  $("restoreBtn").hidden = !(isText && item.run);
  if (isText) $("styleInfo").innerHTML = styleLabel(item);
  else $("hint").textContent = state.pages.length
    ? "Click any text with a dotted outline to change it or remove it. The font, size and colour are picked up automatically."
    : "Open a file. Every piece of text it finds gets a dotted outline: click one to change or remove it.";
}

function addItem(data) {
  const item = { id: nextId++, ...data };
  state.items.push(item);
  drawItem(item);
  select(item);
  refreshChrome();
  return item;
}

function drawItem(item) {
  const page = pageOf(item);
  item.el?.remove();
  item.coverEl?.remove();
  const el = document.createElement("div");
  el.className = "item " + item.type;

  if (item.type === "text") {
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
    span.className = "txt";
    span.contentEditable = "true";
    span.spellcheck = false;
    span.textContent = item.text;
    span.addEventListener("input", () => { item.text = span.textContent; layoutItem(item); refreshStyleBar(); });
    span.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); span.blur(); } });
    span.addEventListener("focus", () => { item.editing = true; select(item); layoutItem(item); });
    span.addEventListener("blur", () => {
      item.editing = false;
      if (!item.text.trim() && !item.cover) removeItem(item);
      else layoutItem(item);
    });
    const preview = document.createElement("div");
    preview.className = "glyphs";
    el.append(span, preview);
    item.span = span;
    item.previewEl = preview;
    el.append(handle("move", item));
  } else {
    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = "";
      el.append(img);
    }
    el.append(handle("size", item));
    el.addEventListener("pointerdown", (e) => startDrag(e, item, "move"));
  }
  page.itemsLayer.append(el);
  item.el = el;
  layoutItem(item);
}

// The PDF's own font is used whenever it has every character typed.
function activeOrig(item) {
  const o = item.font.orig;
  const entry = o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
  return entry && entry.canWrite(item.text.replace(/\s+$/, "")) ? entry : null;
}

function layoutItem(item) {
  const s = item.el.style;
  if (item.type === "text") {
    Object.assign(s, { left: item.x + "px", top: item.baseline - item.size * BASELINE + "px" });
    const orig = activeOrig(item);
    Object.assign(item.span.style, {
      fontFamily: CSS_FONT[item.font.family],
      fontWeight: item.font.bold ? "700" : "400",
      fontStyle: item.font.italic ? "italic" : "normal",
      fontSize: item.size + "px",
      color: css(item.color),
    });
    // Outside editing, show the text drawn with the document's real glyphs (exactly what gets saved).
    const pv = orig && !item.editing ? previewSvg(orig, item.text, item.size, item.color) : null;
    item.previewEl.innerHTML = pv ? pv.svg : "";
    item.span.style.visibility = pv ? "hidden" : "visible";
    item.el.title = item.font.orig && item.font.useOrig && !orig ? "Some letters are not in this PDF's font, so the closest standard font is used" : "";
    if (item.coverEl) item.coverEl.style.background = css(item.cover.color);
  } else {
    Object.assign(s, { left: item.x + "px", top: item.y + "px", width: item.w + "px", height: item.h + "px" });
    if (item.type === "rect") s.background = css(item.color);
  }
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
  const start = { x: e.clientX, y: e.clientY, ix: item.x, iy: item.type === "text" ? item.baseline : item.y, w: item.w, h: item.h };
  const move = (ev) => {
    const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
    if (kind === "size") {
      const ratio = start.h / start.w;
      item.w = Math.max(10, start.w + dx);
      item.h = item.type === "image" ? item.w * ratio : Math.max(6, start.h + dy);
    } else if (item.type === "text") {
      item.x = start.ix + dx;
      item.baseline = start.iy + dy;
    } else {
      item.x = start.ix + dx;
      item.y = start.iy + dy;
    }
    layoutItem(item);
  };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function focusText(item, selectAll) {
  // The text box must be visible (not the glyph preview) before it can take focus.
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

function removeItem(item) {
  item.el?.remove();
  item.coverEl?.remove();
  state.items = state.items.filter((i) => i !== item);
  if (state.selected === item) select(null);
  refreshChrome();
}

function select(item) {
  if (state.selected?.el) state.selected.el.classList.remove("selected");
  state.selected = item;
  if (item?.el) item.el.classList.add("selected");
  // Keep the toolbar's space reserved so the page never jumps under the cursor.
  $("props").classList.toggle("off", !item || item.type === "image");
  if (item && item.type !== "image") {
    const isText = item.type === "text";
    for (const id of ["propFont", "propSize", "propBold", "propItalic", "propColor"]) $(id).hidden = !isText;
    $("propBg").hidden = !(item.type === "rect" || item.cover);
    if (isText) {
      $("optOrig").hidden = !item.font.orig;
      $("propFont").value = item.font.orig && item.font.useOrig ? "orig" : item.font.family;
      $("propSize").value = (item.size / SCALE).toFixed(1);
      $("propBold").classList.toggle("on", item.font.bold);
      $("propItalic").classList.toggle("on", item.font.italic);
      $("propColor").value = hex(item.color);
    }
    $("propBg").value = hex(item.type === "rect" ? item.color : item.cover?.color || [255, 255, 255]);
  }
  $("deleteBtn").disabled = !item;
  refreshStyleBar();
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
  toast("Text removed. Click the same spot to write something new there.");
}

// Undo every change to this piece of text and put the original back.
function restoreSelected() {
  const item = state.selected;
  if (!item?.run) return;
  const page = pageOf(item);
  removeItem(item);
  addHit(page, item.run);
}

/* ---------- page interactions ---------- */

function pointIn(page, e) {
  const r = page.el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

// New text copies the style of the last edited text, so it matches the document.
function lastTextStyle() {
  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    if (it.type === "text") return { size: it.size, font: { ...it.font }, color: it.color };
  }
  return { size: 12 * SCALE, font: { family: "Helvetica", bold: false, italic: false }, color: [0, 0, 0] };
}

function onPagePointerDown(e, page) {
  if (e.target.closest(".item")) return;
  const p = pointIn(page, e);
  if (state.tool === "text") {
    e.preventDefault();
    const st = lastTextStyle();
    const item = addItem({ type: "text", pageId: page.id, x: p.x, baseline: p.y + st.size * BASELINE, ...st, text: "" });
    setTimeout(() => focusText(item), 0);
    // One click adds one piece of text; go back to editing so stray clicks don't add more.
    setTool("edit");
    return;
  }
  if (state.tool === "cover") {
    e.preventDefault();
    const draft = document.createElement("div");
    draft.className = "draft";
    page.el.append(draft);
    let q = p;
    const box = () => ({ x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(q.x - p.x), h: Math.abs(q.y - p.y) });
    const move = (ev) => {
      q = pointIn(page, ev);
      const b = box();
      Object.assign(draft.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      draft.remove();
      const b = box();
      if (b.w < 4 || b.h < 4) return;
      addItem({ type: "rect", pageId: page.id, ...b, color: sampleColors(page.canvas, b.x - 3, b.y - 3, b.w + 6, b.h + 6).paper });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return;
  }
  select(null);
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

function placeImage(dataUrl, type, w, h) {
  const page = visiblePage();
  if (!page) return toast("Open a file first.");
  const maxW = page.canvas.width * 0.35;
  const k = Math.min(1, maxW / w);
  const r = page.el.getBoundingClientRect();
  const y = Math.min(Math.max(0, window.innerHeight / 2 - r.top - (h * k) / 2), page.canvas.height - h * k);
  addItem({ type: "image", pageId: page.id, dataUrl, imgType: type, x: (page.canvas.width - w * k) / 2, y, w: w * k, h: h * k });
}

function pageHasItems(page) { return state.items.some((i) => i.pageId === page.id); }

async function rotatePage(page) {
  if (pageHasItems(page)) return toast("Rotate the page before adding edits to it.");
  page.extraRotate = (page.extraRotate + 90) % 360;
  page.ocrDone = false;
  await renderPage(page);
}

function movePageUp(page) {
  const i = state.pages.indexOf(page);
  if (i <= 0) return;
  [state.pages[i - 1], state.pages[i]] = [state.pages[i], state.pages[i - 1]];
  page.wrap.parentNode.insertBefore(page.wrap, state.pages[i].wrap);
  refreshChrome();
}

function removePage(page) {
  if (state.pages.length === 1) return toast("A file needs at least one page.");
  state.items.filter((i) => i.pageId === page.id).forEach(removeItem);
  state.pages = state.pages.filter((p) => p !== page);
  page.wrap.remove();
  refreshChrome();
}

function isSingleImage() {
  return state.pages.length === 1 && !!state.sources[state.pages[0].src].image;
}

function refreshChrome() {
  const has = state.pages.length > 0;
  $("empty").hidden = has;
  $("downloadBtn").disabled = !has;
  $("downloadImgBtn").hidden = !has;
  refreshStyleBar();
  state.pages.forEach((p, i) => {
    p.wrap.querySelector(".num").textContent = `Page ${i + 1} of ${state.pages.length}`;
    p.tools.querySelector('[data-act="ocr"]').hidden = p.hasText !== false || p.ocrBusy;
  });
}

/* ---------- export ---------- */

async function exportBytes() {
  const out = await PDFDocument.create();
  const libDocs = [];
  for (const s of state.sources) libDocs.push(await PDFDocument.load(s.bytes, { ignoreEncryption: true }));
  const std = {};
  const stdFont = async (f) => (std[fontKey(f)] ??= await out.embedFont(StandardFonts[fontKey(f)]));
  const color = (c) => rgb(c[0] / 255, c[1] / 255, c[2] / 255);
  const k = 1 / SCALE;
  const notes = new Set();

  for (const page of state.pages) {
    const [p] = await out.copyPages(libDocs[page.src], [page.index]);
    out.addPage(p);
    const rot = (page.baseRotate + page.extraRotate) % 360;
    p.setRotation(degrees(rot));
    const at = (x, y) => page.viewport.convertToPdfPoint(x, y);
    const rotate = degrees(rot);
    const items = state.items.filter((i) => i.pageId === page.id);

    // Take the edited text out of the page itself.
    const edited = items.filter((i) => i.type === "text" && i.source);
    let removed = new Set();
    try { removed = removeTextRuns(p, edited.map((i) => i.source)); } catch (e) { console.warn("Text removal failed, covering instead", e); }

    for (const item of items) {
      if (item.type === "rect") {
        const [x, y] = at(item.x, item.y + item.h);
        p.drawRectangle({ x, y, width: item.w * k, height: item.h * k, color: color(item.color), rotate });
      } else if (item.type === "image") {
        const bytes = await (await fetch(item.dataUrl)).arrayBuffer();
        const img = item.imgType === "image/jpeg" ? await out.embedJpg(bytes) : await out.embedPng(bytes);
        const [x, y] = at(item.x, item.y + item.h);
        p.drawImage(img, { x, y, width: item.w * k, height: item.h * k, rotate });
      } else if (item.type === "text") {
        const wasRemoved = item.source && removed.has(edited.indexOf(item));
        if (item.cover && !wasRemoved) {
          const c = item.cover;
          const [x, y] = at(c.x, c.y + c.h);
          p.drawRectangle({ x, y, width: c.w * k, height: c.h * k, color: color(c.color), rotate });
        }
        const text = item.text.replace(/\s+$/, "");
        if (!text) continue;
        const [x, y] = at(item.x, item.baseline);
        const orig = activeOrig(item);
        if (orig) {
          drawWithPdfFont(p, orig, text, { x, y, size: item.size * k, color: item.color, rotationDeg: rot });
          continue;
        }
        if (item.font.orig && item.font.useOrig) notes.add("some new letters were not in the document's font, so the closest font was used");
        const f = await stdFont(item.font);
        try { f.encodeText(text); } catch {
          throw new Error(`"${text}" has letters that can't be written yet (English letters, numbers and common symbols work).`);
        }
        p.drawText(text, { x, y, size: item.size * k, font: f, color: color(item.color), rotate });
      }
    }
  }
  const bytes = await out.save();
  return { bytes, notes: [...notes] };
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
  btn.textContent = label;
  try { await fn(); } catch (e) { toast(e.message || "Could not save the file.", 6000); } finally { btn.disabled = false; btn.textContent = old; }
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

/* ---------- signature pad ---------- */

function setupSignPad() {
  const pad = $("signPad");
  const ctx = pad.getContext("2d");
  let drawing = false, inked = false;
  const clear = () => { ctx.clearRect(0, 0, pad.width, pad.height); inked = false; };
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
    Object.assign(ctx, { lineWidth: 3, lineCap: "round", lineJoin: "round", strokeStyle: "#10204a" });
    ctx.lineTo(...pos(e));
    ctx.stroke();
    inked = true;
  });
  pad.addEventListener("pointerup", () => (drawing = false));
  $("signClear").addEventListener("click", clear);
  $("signDialog").addEventListener("close", () => {
    if ($("signDialog").returnValue !== "ok" || !inked) return clear();
    // Trim empty space around the strokes.
    const { data, width, height } = ctx.getImageData(0, 0, pad.width, pad.height);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    const w = x1 - x0 + 8, h = y1 - y0 + 8;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(pad, x0 - 4, y0 - 4, w, h, 0, 0, w, h);
    placeImage(c.toDataURL("image/png"), "image/png", w / 2, h / 2);
    clear();
  });
}

/* ---------- wiring ---------- */

function setTool(tool) {
  if (tool === "image") return $("imageInput").click();
  if (tool === "sign") return $("signDialog").showModal();
  state.tool = tool;
  document.body.dataset.tool = tool;
  document.querySelectorAll(".tool").forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
}

function updateSelected(fn) {
  const item = state.selected;
  if (!item) return;
  fn(item);
  layoutItem(item);
}

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
  else { i.font.useOrig = false; i.font.family = e.target.value; }
}));
$("propSize").addEventListener("input", (e) => updateSelected((i) => {
  const v = parseFloat(e.target.value);
  if (v > 0) i.size = v * SCALE;
}));
$("propBold").addEventListener("click", () => updateSelected((i) => { i.font.bold = !i.font.bold; $("propBold").classList.toggle("on", i.font.bold); }));
$("propItalic").addEventListener("click", () => updateSelected((i) => { i.font.italic = !i.font.italic; $("propItalic").classList.toggle("on", i.font.italic); }));
$("propColor").addEventListener("input", (e) => updateSelected((i) => (i.color = unhex(e.target.value))));
$("propBg").addEventListener("input", (e) => updateSelected((i) => {
  if (i.type === "rect") i.color = unhex(e.target.value);
  else if (i.cover) i.cover.color = unhex(e.target.value);
}));
$("deleteBtn").addEventListener("click", () => state.selected && removeItem(state.selected));
$("removeTextBtn").addEventListener("pointerdown", (e) => e.preventDefault()); // keep the text selected
$("removeTextBtn").addEventListener("click", removeSelectedText);
$("restoreBtn").addEventListener("click", restoreSelected);

// "All PDF tools" on the start page: pick a file, then go straight to that tool.
const ACCEPT = { pdf: "application/pdf", image: "image/png,image/jpeg", jpg: "image/jpeg", png: "image/png" };
document.querySelectorAll("#toolsGrid button").forEach((b) => b.addEventListener("click", () => {
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
  else if (start === "merge") toast(`${state.pages.length} pages joined. Use Move up to reorder, then Download PDF.`);
  else if (start === "topdf") toast("Your picture is now a PDF page. Press Download PDF to save it.");
  else if (start === "toimg") downloadImage();
});
$("downloadBtn").addEventListener("click", downloadPdf);
$("downloadImgBtn").addEventListener("click", downloadImage);

document.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && state.selected && !e.target.isContentEditable && !/INPUT|SELECT/.test(e.target.tagName)) {
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

setupSignPad();
setTool("edit");

// Used by automated checks.
window.pdfEditor = { addPdf, addFile, exportBytes, exportImages, runOcr, state, fonts };
