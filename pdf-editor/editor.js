import * as pdfjsLib from "./lib/pdf.min.mjs";
import { removeTextRuns, scanPage, runStyle, inkFromStrokes, initMetrics } from "./textremove.js";
import { loadPdfFont, previewSvg, writeLines, fontTraits, fontDescriptor, METRIC_FAMILIES, metricFile } from "./fontmatch.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./lib/pdf.worker.min.mjs", import.meta.url).href;
const { PDFDocument, rgb, degrees, BlendMode, LineCapStyle, PDFString } = window.PDFLib;
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
let nextId = 1;

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
  const med = (k) => ring.map((o) => data[o + k]).sort((a, b) => a - b)[ring.length >> 1];
  const paper = [med(0), med(1), med(2)];
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
function pdfFont(page, baseFont) {
  const key = `${page.id}:${baseFont}`;
  if (!fonts.has(key)) {
    let entry = null;
    try { entry = loadPdfFont(libPage(page), baseFont); } catch (e) { console.warn(e); }
    fonts.set(key, entry);
  }
  return fonts.get(key) ? key : null;
}

// Loads the open screen font for a family/weight/slant once, then re-lays out text that uses it.
const faces = new Map();
function ensureFace(family, bold, italic) {
  const fam = METRIC_FAMILIES[family] ? family : "sans";
  const key = metricFile(fam, bold, italic);
  if (!faces.has(key) && typeof FontFace === "function") {
    const face = new FontFace(METRIC_FAMILIES[fam].css.replace(/"/g, ""), `url(${new URL("fonts/" + key, import.meta.url).href})`, { weight: bold ? "700" : "400", style: italic ? "italic" : "normal" });
    document.fonts.add(face);
    faces.set(key, face.load().then(() => state.items.forEach((i) => i.type === "text" && i.el && layoutItem(i))).catch(() => {}));
  }
  return faces.get(key);
}

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

async function loadSource(bytes, image = null) {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
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
    $("pages").replaceChildren();
    fonts.clear();
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
  el.addEventListener("pointerdown", (e) => onPagePointerDown(e, page));
}

function sizeBox(page) {
  const z = state.zoom;
  page.el.style.transform = z === 1 ? "" : `scale(${z})`;
  page.box.style.width = page.canvas.width * z + "px";
  page.box.style.height = page.canvas.height * z + "px";
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
    let baseFont = "";
    try { baseFont = pdfPage.commonObjs.get(t.fontName)?.name || ""; } catch {}
    const traits = fontTraits(baseFont);
    if (!baseFont && content.styles[t.fontName]?.fontFamily === "serif") traits.family = "serif";
    if (!baseFont && content.styles[t.fontName]?.fontFamily === "monospace") traits.family = "mono";
    addHit(page, {
      kind: "pdf",
      str: t.str,
      left: tx[4],
      baseline: tx[5],
      size,
      width: t.width * SCALE,
      baseFont,
      font: traits,
      pdf: { x: t.transform[4], y: t.transform[5], width: t.width, size: Math.hypot(t.transform[2], t.transform[3]) },
    });
    count++;
  }
  page.hasText = count > 0;
  page.rendered = true;
  // Ink that is already on the page sets the pen's default colour and width.
  try {
    const annots = await pdfPage.getAnnotations();
    const ink = annots.find((a) => a.subtype === "Ink" && a.color);
    if (ink) page.ink = { color: [...ink.color].slice(0, 3), width: ink.borderStyle?.width || 1, source: "ink annotation" };
  } catch {}
  // Pictures and scans have no text layer: read the text from the pixels instead.
  if (!page.hasText && !page.ocrDone && !page.blank) runOcr(page);
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
      if (!window.Tesseract) await loadScript("lib/ocr/tesseract.min.js");
      const base = new URL("lib/ocr/", location.href).href;
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
// size and colour, starting at the same left edge, one line-spacing apart. Each line also takes the
// other pieces of the same baseline that continue it. Returns { lines: [{ runs, text, left, baseline, width }], index }.
function paragraphOf(page, run) {
  const free = (page.runs || []).filter((r) => r.hit.isConnected && r.run.kind === "pdf").map((r) => r.run);
  const S = run.size, fill = runFill(page, run);
  const same = (o) => o.baseFont === run.baseFont && Math.abs(o.size - S) <= S * 0.03 && runFill(page, o) === fill;
  const lineOf = (r0) => {
    const line = [r0];
    for (let dir of [-1, 1]) {
      let edge = r0;
      for (;;) {
        const next = free.filter((o) => !line.includes(o) && same(o) && Math.abs(o.baseline - r0.baseline) < S * 0.15 &&
          (dir > 0 ? o.left >= edge.left + edge.width - S * 0.3 && o.left - (edge.left + edge.width) < S * 1.2
                   : o.left + o.width <= edge.left + S * 0.3 && edge.left - (o.left + o.width) < S * 1.2))
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
    return { runs: line, text, left, baseline: r0.baseline, width: last.left + last.width - left };
  };
  const first = lineOf(run);
  const lines = [first];
  const startAt = (y) => free.find((o) => same(o) && !lines.some((l) => l.runs.includes(o)) && Math.abs(o.left - first.left) < S * 0.25 && Math.abs(o.baseline - y) < S * 0.12);
  // Line spacing: the nearest line above or below that starts at the same left edge.
  let gap = null;
  for (const o of free) {
    if (!same(o) || first.runs.includes(o) || Math.abs(o.left - first.left) >= S * 0.25) continue;
    const d = Math.abs(o.baseline - first.baseline);
    if (d >= S * 0.95 && d <= S * 2.6 && (gap === null || d < gap)) gap = d;
  }
  if (gap) {
    for (let y = first.baseline + gap, o; lines.length < 60 && (o = startAt(y)); y += gap) lines.push(lineOf(o));
    for (let y = first.baseline - gap, o; lines.length < 60 && (o = startAt(y)); y -= gap) lines.unshift(lineOf(o));
  }
  return { lines, index: lines.indexOf(first), gap };
}

function editExistingText(page, run, hit, silent = false) {
  const top = run.baseline - run.size * BASELINE;
  const box = run.box
    ? { x: run.box.x0 - 2, y: run.box.y0 - 2, w: run.box.x1 - run.box.x0 + 4, h: run.box.y1 - run.box.y0 + 4 }
    : { x: run.left - 1, y: top - 1, w: run.width + 2, h: run.size * 1.1 + 2 };
  const { ink, paper } = sampleColors(page.canvas, box.x, box.y, box.w, box.h);
  let font = { ...run.font }, size = run.size, matched = false, color = ink, spacing = null, lineGap = null, needsCover = run.kind === "ocr";
  if (run.kind === "pdf") {
    // Exact style from the content stream: colour, size, spacing, horizontal scale, leading.
    const scan = pageScan(page);
    const st = scan ? runStyle(scan, run.pdf) : null;
    if (st) {
      if (st.fill && !st.invisible) color = st.fill;
      if (st.size > 0) size = st.size * SCALE;
      spacing = { charSpacing: st.charSpacing, wordSpacing: st.wordSpacing, hScale: st.hScale };
      if (st.leading > 0.5) lineGap = st.leading * SCALE;
      needsCover = st.invisible; // OCR text layers: the visible letters are part of the picture
    }
    // The content stream names the font exactly (pdf.js does not always expose it).
    if (st?.baseFont) run.baseFont = st.baseFont;
    try { Object.assign(font, fontTraits(run.baseFont, fontDescriptor(libPage(page), run.baseFont))); } catch {}
  }
  if (run.kind === "ocr" || needsCover) {
    const b = run.box || { x0: run.left, y0: top, x1: run.left + run.width, y1: run.baseline + run.size * 0.2 };
    const m = matchImageFont(page.canvas, b, run.str, run.baseline, ink, paper);
    if (m) { font = { family: m.family, bold: m.bold, italic: false }; if (run.kind === "ocr") size = m.size; matched = true; }
  }
  const origKey = run.kind === "pdf" && run.baseFont ? pdfFont(page, run.baseFont) : null;
  ensureFace(famOf(font), font.bold, font.italic);
  const fontState = { ...font, underline: false, orig: origKey ? { key: origKey, pageId: page.id } : null, useOrig: !!origKey, origName: run.baseFont ? prettyFont(run.baseFont) : null, matched };

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
  const lines0 = para.lines.map((l) => {
    const b = { x: l.left - 1, y: l.baseline - size * BASELINE - 1, w: l.width + 2, h: size * 1.1 + 2 };
    return { text: l.text, left: l.left, baseline: l.baseline, box: { ...b, color: sampleColors(page.canvas, b.x, b.y, b.w, b.h).paper }, sources: l.runs.map((r) => r.pdf), runs: l.runs };
  });
  const runs = para.lines.flatMap((l) => l.runs);
  for (const r of runs) page.runs.find((x) => x.run === r)?.hit.remove();
  lineGap = para.gap || lineGap || neighbourGap(page, run) || size * 1.2;
  const x = Math.min(...lines0.map((l) => l.left)), baseline = lines0[0].baseline;
  const item = addItem({
    type: "text", pageId: page.id, x, baseline, size, font: fontState, color, text: lines0.map((l) => l.text).join("\n"),
    lines0, needsCover, spacing, lineGap, runs,
    base: { x, baseline, size, lineGap, color: [...color], font: fontSig(fontState) },
  }, false);
  if (!silent) focusLine(item, para.index);
  return item;
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
// Which original lines changed: a moved or restyled box rewrites every line.
function linePlan(item) {
  const lines = item.text.split("\n").map((l) => l.replace(/\s+$/, ""));
  const o = item.lines0 || [], b = item.base;
  const restyled = !b || item.x !== b.x || item.baseline !== b.baseline || item.size !== b.size || item.lineGap !== b.lineGap || String(item.color) !== String(b.color) || fontSig(item.font) !== b.font;
  const changed = lines.map((l, i) => restyled || i >= o.length || l !== o[i].text.replace(/\s+$/, ""));
  const gone = o.map((_, i) => i >= lines.length || changed[i]);
  return { lines, changed, gone, restyled };
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
  if (item.text.includes("\n")) parts.push(`line spacing ${(lineGapOf(item) / item.size).toFixed(2)}`);
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
  const item = { id: nextId++, ...data };
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
    span.className = "txt";
    setEditable(span);
    span.spellcheck = false;
    span.textContent = item.text;
    span.addEventListener("input", () => { item.text = span.innerText.replace(/\r/g, ""); layoutItem(item); refreshStyleBar(); });
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
    });
    const preview = document.createElement("div");
    preview.className = "glyphs";
    el.append(preview, span);
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
    el.append(handle("size", item));
    el.addEventListener("pointerdown", (e) => {
      if (state.tool === "draw" && state.pen.kind === "eraser") return;
      startDrag(e, item, "move");
    });
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

let measureCtx = null;
function textWidth(text, fontCss) {
  measureCtx ||= document.createElement("canvas").getContext("2d");
  measureCtx.font = fontCss;
  return measureCtx.measureText(text).width;
}

function layoutItem(item) {
  const s = item.el.style;
  if (item.type === "text") {
    const fam = famOf(item.font), S = item.size, G = lineGapOf(item);
    const sp = item.spacing || {};
    Object.assign(s, { left: item.x + "px", top: item.baseline - S * BASELINE + "px" });
    const lines = item.text.split("\n");
    const weight = item.font.bold ? "700" : "400", style = item.font.italic ? "italic" : "normal";
    const fontCss = `${style} ${weight} ${S}px ${CSS_FONT[fam]}`;
    const k = FONT_K[fam] ?? 0.34;
    Object.assign(item.span.style, {
      fontFamily: CSS_FONT[fam],
      fontWeight: weight,
      fontStyle: style,
      fontSize: S + "px",
      lineHeight: G + "px",
      marginTop: S * BASELINE - (G / 2 + k * S) + "px",
      letterSpacing: (sp.charSpacing || 0) * SCALE + "px",
      wordSpacing: (sp.wordSpacing || 0) * SCALE + "px",
      textDecoration: item.font.underline ? "underline" : "none",
      color: css(item.color),
      caretColor: css(item.color),
      transform: "",
    });
    // The document's own font, when this box may use it; each line uses it if it has all that line's letters.
    const o = item.font.orig;
    const docFont = o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
    const spPx = { charSpacing: (sp.charSpacing || 0) * SCALE, wordSpacing: (sp.wordSpacing || 0) * SCALE, hScale: sp.hScale || 1 };
    const plan = item.lines0 ? linePlan(item) : null;
    // Paragraph boxes: unchanged lines stay as the page shows them; changed lines get a patch and are drawn here.
    if (plan) item.coverEls?.forEach((c, i) => { c.style.display = plan.gone[i] ? "block" : "none"; c.style.background = css(item.lines0[i].box.color); });
    let html = "", widest = 0, widestText = "";
    lines.forEach((line, i) => {
      if (plan && !plan.changed[i]) { if (line.length > widestText.length) widestText = line; return; }
      const pv = docFont && docFont.canWrite(line.replace(/\s+$/, "")) ? previewSvg(docFont, line, S, item.color, spPx) : null;
      const under = (w) => (item.font.underline && w ? `<div style="position:absolute;left:0;top:${i * G + S * (BASELINE + 0.12)}px;width:${w}px;height:${Math.max(1, S * 0.06)}px;background:${css(item.color)}"></div>` : "");
      if (pv) {
        html += `<div style="position:absolute;left:0;top:${i * G}px">${pv.svg}</div>${under(pv.width)}`;
        if (pv.width > widest) { widest = pv.width; widestText = line; }
      } else if (plan || docFont) {
        const w = (textWidth(line, fontCss) + spPx.charSpacing * [...line].length) * spPx.hScale;
        html += `<div style="position:absolute;left:0;top:${i * G + S * BASELINE - (S / 2 + k * S)}px;white-space:pre;font:${fontCss.replace(/"/g, "'")};line-height:${S}px;letter-spacing:${spPx.charSpacing}px;word-spacing:${spPx.wordSpacing}px;color:${css(item.color)};transform:scaleX(${spPx.hScale});transform-origin:0 0${item.font.underline ? ";text-decoration:underline" : ""}">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`;
        if (w > widest) { widest = w; widestText = line; }
      }
    });
    const ghost = !!(plan || docFont);
    item.previewEl.innerHTML = ghost ? html : "";
    item.span.classList.toggle("ghost", ghost);
    let ratio = sp.hScale || 1;
    if (ghost && widestText) {
      // Stretch the invisible editable text to the drawn widths so the caret lands between the right letters.
      const natural = textWidth(widestText, fontCss) + spPx.charSpacing * [...widestText].length;
      const drawn = docFont && docFont.canWrite(widestText) ? previewSvg(docFont, widestText, S, item.color, spPx)?.width : natural * (sp.hScale || 1);
      if (natural > 0 && drawn > 0) ratio = drawn / natural;
    }
    if (Math.abs(ratio - 1) > 0.005) { item.span.style.transform = `scaleX(${ratio})`; item.span.style.transformOrigin = "0 0"; }
    item.el.title = docFont && !lines.every((l) => docFont.canWrite(l.replace(/\s+$/, ""))) ? "Some letters are not in this PDF's font, so those lines use the closest matching font" : "";
    if (item.coverEl) item.coverEl.style.background = css(item.cover.color);
  } else {
    Object.assign(s, { left: item.x + "px", top: item.y + "px", width: item.w + "px", height: item.h + "px" });
    s.opacity = item.opacity ?? "";
    if (item.type === "rect") s.background = css(item.color);
    if (item.type === "hl") s.background = `rgba(${item.color.join(",")},.42)`;
    if ((item.type === "shape" || item.type === "draw") && item.svgEl) item.el.innerHTML = shapeSvg(item), item.svgEl = item.el.firstElementChild, item.el.append(handle("size", item));
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
  const z = state.zoom;
  const start = { x: e.clientX, y: e.clientY, ix: item.x, iy: item.type === "text" ? item.baseline : item.y, w: item.w, h: item.h };
  let moved = false;
  const move = (ev) => {
    const dx = (ev.clientX - start.x) / z, dy = (ev.clientY - start.y) / z;
    moved = true;
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
  if (state.selected === item) select(null);
  refreshChrome();
  if (record) commit();
}

function select(item) {
  if (state.selected?.el) state.selected.el.classList.remove("selected");
  state.selected = item;
  if (item?.el) item.el.classList.add("selected");
  // Keep the toolbar's space reserved so the page never jumps under the cursor.
  $("props").classList.toggle("off", !item);
  if (item) {
    const isText = item.type === "text";
    const colored = isText || ["hl", "shape", "draw"].includes(item.type);
    for (const id of ["propFont", "propSize", "propBold", "propItalic", "propUnderline"]) $(id).hidden = !isText;
    $("leadingWrap").hidden = !isText;
    $("opacityWrap").hidden = isText || item.type === "link";
    $("propColor").hidden = !colored;
    if (colored && !isText) $("propColor").value = hex(item.color);
    $("propBg").hidden = !(item.type === "rect" || item.cover || item.lines0);
    $("propOpacity").value = item.opacity ?? 1;
    if (isText) {
      $("optOrig").hidden = !item.font.orig;
      $("propFont").value = item.font.orig && item.font.useOrig ? "orig" : famOf(item.font);
      $("propSize").value = (item.size / SCALE).toFixed(1);
      $("propLeading").value = (lineGapOf(item) / item.size).toFixed(2);
      $("propBold").classList.toggle("on", item.font.bold);
      $("propItalic").classList.toggle("on", item.font.italic);
      $("propUnderline").classList.toggle("on", !!item.font.underline);
      $("propColor").value = hex(item.color);
    }
    $("propBg").value = hex(item.type === "rect" ? item.color : item.cover?.color || item.lines0?.[0]?.box.color || [255, 255, 255]);
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
const DOM_KEYS = ["el", "span", "previewEl", "svgEl", "coverEl", "coverEls", "editing", "before"];
function snapshot() {
  return state.items.map((i) => {
    const o = {};
    for (const [k, v] of Object.entries(i)) if (!DOM_KEYS.includes(k)) o[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...v } : Array.isArray(v) ? [...v] : v;
    if (o.font) o.font = { ...i.font };
    return o;
  });
}
let commitTimer = null;
function commit(reset = false) {
  clearTimeout(commitTimer);
  if (reset) { history.past = [snapshot()]; history.future = []; }
  else { history.past.push(snapshot()); if (history.past.length > 100) history.past.shift(); history.future = []; }
  refreshHistory();
}
const commitSoon = () => { clearTimeout(commitTimer); commitTimer = setTimeout(() => commit(), 450); };
function restore(snap) {
  for (const i of state.items) { i.el?.remove(); i.coverEl?.remove(); i.coverEls?.forEach((c) => c.remove()); }
  state.selected = null;
  state.items = snap.map((o) => ({ ...o, font: o.font ? { ...o.font } : o.font, cover: o.cover ? { ...o.cover } : o.cover }));
  for (const i of state.items) drawItem(i);
  // Original text comes back wherever no edit covers it any more.
  for (const page of state.pages) for (const { run, hit } of page.runs || []) {
    const edited = state.items.some((i) => i.runs?.includes(run));
    if (edited && hit.isConnected) hit.remove();
    if (!edited && !hit.isConnected) page.hits.append(hit);
  }
  select(null);
  refreshChrome();
}
function undo() {
  if (history.past.length < 2) return;
  history.future.push(history.past.pop());
  restore(history.past[history.past.length - 1]);
  refreshHistory();
}
function redo() {
  if (!history.future.length) return;
  const s = history.future.pop();
  history.past.push(s);
  restore(s);
  refreshHistory();
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
    ensureFace(famOf(st.font), st.font.bold, st.font.italic);
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
  const maxW = page.canvas.width * 0.35;
  const k = Math.min(1, maxW / w);
  const r = page.el.getBoundingClientRect();
  const y = Math.min(Math.max(0, (window.innerHeight / 2 - r.top) / state.zoom - (h * k) / 2), page.canvas.height - h * k);
  addItem({ type: "image", pageId: page.id, dataUrl, imgType: type, x: (page.canvas.width - w * k) / 2, y, w: w * k, h: h * k, ...extra });
}

/* ---------- pages ---------- */

function pageHasItems(page) { return state.items.some((i) => i.pageId === page.id); }

async function rotatePage(page) {
  if (pageHasItems(page)) return toast("Rotate the page before adding edits to it.");
  page.extraRotate = (page.extraRotate + 90) % 360;
  page.ocrDone = false;
  page.scan = undefined;
  await renderPage(page);
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
  return insertPageAfter(page, { id: nextId++, src: page.src, index: page.index, baseRotate: page.baseRotate, extraRotate: page.extraRotate, blank: page.blank });
}

async function insertBlankAfter(page) {
  const vp = page.viewport;
  const src = await loadSource(await blankPdf(vp.width / SCALE, vp.height / SCALE));
  await insertPageAfter(page, { id: nextId++, src, index: 0, baseRotate: 0, extraRotate: 0, blank: true });
}

function removePage(page) {
  if (state.pages.length === 1) return toast("A file needs at least one page.");
  state.items.filter((i) => i.pageId === page.id).forEach((i) => removeItem(i, false));
  state.pages = state.pages.filter((p) => p !== page);
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
  state.pages.forEach(sizeBox);
  $("zoomPct").textContent = Math.round(state.zoom * 100) + "%";
}
function fitZoom() {
  const widest = Math.max(...state.pages.map((p) => p.canvas.width), 1);
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
}

/* ---------- export ---------- */

async function exportBytes() {
  document.activeElement?.blur?.();
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
        const G = lineGapOf(item), plan = item._plan;
        const patch = (c) => { const [x, y] = at(c.x, c.y + c.h); p.drawRectangle({ x, y, width: c.w * k, height: c.h * k, color: color(c.color), rotate }); };
        // A changed line whose letters could not be taken out of the stream (or sit in a picture) gets a paper patch.
        if (plan) item.lines0.forEach((l, li) => { if (plan.gone[li] && (item.needsCover || !lineRemoved(item, li))) patch(l.box); });
        else if (item.cover) patch(item.cover);
        const lines = item.text.split("\n").map((t, i) => {
          const [x, y] = at(item.x, item.baseline + i * G);
          return { text: t.replace(/\s+$/, ""), x, y, i };
        }).filter((l) => l.text && (!plan || plan.changed[l.i]));
        const o = item.font.orig;
        const docFont = o && item.font.useOrig && o.pageId === item.pageId ? fonts.get(o.key) : null;
        for (const l of lines) {
          // Line by line: a line keeps the document's font whenever that font has all of its letters.
          const used = await writeLines(out, p, {
            lines: [l], size: item.size * k, color: item.color, rotationDeg: rot, pdfFont: docFont,
            family: famOf(item.font), bold: item.font.bold, italic: item.font.italic, underline: item.font.underline,
            spacing: item.spacing, embedded,
          });
          if (docFont && used !== "document") notes.add("some new letters were not in the document's font, so the closest matching font was used");
        }
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

/* ---------- wiring ---------- */

function setTool(tool) {
  if (tool === "image") return $("imageInput").click();
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
  if (v > 0) { const ratio = lineGapOf(i) / i.size; i.size = v * SCALE; i.lineGap = i.size * ratio; }
}));
$("propLeading").addEventListener("input", (e) => updateSelected((i) => {
  const v = parseFloat(e.target.value);
  if (v >= 0.5) i.lineGap = i.size * v;
}));
const toggleFont = (key, id) => $(id).addEventListener("click", () => updateSelected((i) => {
  i.font[key] = !i.font[key];
  $(id).classList.toggle("on", i.font[key]);
  if (key !== "underline") { i.font.useOrig = false; ensureFace(famOf(i.font), i.font.bold, i.font.italic); }
}));
toggleFont("bold", "propBold");
toggleFont("italic", "propItalic");
toggleFont("underline", "propUnderline");
$("propColor").addEventListener("input", (e) => updateSelected((i) => { i.color = unhex(e.target.value); if (i.type === "shape" || i.type === "draw") lastDrawColor = i.color; }));
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
// Used by automated checks.
window.pdfEditor = { addPdf, addFile, exportBytes, exportImages, runOcr, state, fonts, undo, redo, setZoom, startBlank, pdfjsLib };
