// AsaanDesk Studio page and layout tools that follow Canva's help pages (round 3). Pure module: no DOM.
//  - Automatic page numbers (Text > Dynamic text > Page numbers): Numbers only / Page + number / Page X of Y,
//    "Show numbers on", Apply properties to all pages, Remove all; they renumber when pages are added, deleted,
//    hidden or moved (hidden pages are skipped, like presenting).
//  - Page ranges for Download ("1-3, 5"), Tidy up (equal gaps in a row, column or grid), Copy style (paint roller),
//    Resize canvas to selection, and the lock states (full lock / position only).
import { textLayer, newId } from "./model.js";
import { textHeight } from "./textlayout.js";

/* ---------------- automatic page numbers ---------------- */
export const PAGE_NUM_FORMATS = [["number", "Numbers only"], ["page", "Page + number"], ["of", "Page X of Y"]];
export const PAGE_NUM_SHOW = [["all", "All pages"], ["not-first", "All pages except the first"], ["not-first-last", "All pages except the first and last"], ["this", "This page only"]];
export const PAGE_NUM_SPOTS = [["bottom-right", "Bottom right"], ["bottom-center", "Bottom centre"], ["bottom-left", "Bottom left"], ["top-right", "Top right"], ["top-left", "Top left"]];

export const isPageNumber = (l) => !!(l && l.type === "text" && l.text?.dynamic?.kind === "page");
export function pageNumberText(format, n, total) {
  if (format === "page") return `Page ${n}`;
  if (format === "of") return `Page ${n} of ${total}`;
  return String(n);
}
/** Number of each page (1-based) and the total, skipping hidden pages. A hidden page shows the number it would take. */
export function pageNumbers(design) {
  const shown = design.pages.filter((p) => !p.hidden).length || design.pages.length;
  let n = 0;
  return { total: shown, nums: design.pages.map((p) => (p.hidden ? n + 1 : ++n)) };
}
/**
 * Brings every page-number text up to date. New pages (added after the numbers) get a number too when the
 * design's choice covers them; a number someone deleted on purpose stays deleted. Returns the ids that changed.
 */
export function renumberPages(design) {
  if (!design?.pages) return [];
  const changed = [];
  const cfg = design.pageNumbers;
  if (cfg && cfg.show !== "this") {
    const tpl = design.pages.flatMap((p) => p.layers || []).find(isPageNumber);
    const count = design.pages.length;
    design.pages.forEach((pg, i) => {
      if (pg.pn) return;
      pg.pn = 1;
      if (!tpl || pg.layers.some(isPageNumber) || !pagesFor(cfg.show, count).includes(i)) return;
      const l = JSON.parse(JSON.stringify(tpl)); l.id = newId(); l.animation = null;
      pg.layers.push(l); changed.push(l.id);
    });
  }
  const { total, nums } = pageNumbers(design);
  design.pages.forEach((pg, i) => {
    for (const l of pg.layers || []) {
      if (!isPageNumber(l)) continue;
      const txt = pageNumberText(l.text.dynamic.format, nums[i], total);
      if (l.text.content !== txt) {
        l.text.content = txt; l.name = "Page number";
        l.h = textHeight(l.text, l.w);
        changed.push(l.id);
      }
    }
  });
  return changed;
}
/** Which pages get a number for a "Show numbers on" choice. */
export function pagesFor(show, count, current = 0) {
  return Array.from({ length: count }, (_, i) => i).filter((i) => show === "this" ? i === current : show === "not-first" ? i > 0 : show === "not-first-last" ? i > 0 && i < count - 1 : true);
}
/** Box for a page number at a spot on a W × H page. */
export function pageNumberBox(spot, W, H, size) {
  const m = Math.round(Math.min(W, H) * 0.045), w = Math.max(size * 9, W * 0.28);
  const [v, hz] = spot.split("-");
  const align = hz === "center" ? "center" : hz === "left" ? "left" : "right";
  const x = hz === "center" ? (W - w) / 2 : hz === "left" ? m : W - m - w;
  return { x, w, align, top: v === "top", m };
}
/**
 * Adds (or replaces) page numbers. opts: { format, show, spot, current, style: { family, size, color, bold, italic } }.
 * Returns the number of page numbers on the design afterwards.
 */
export function addPageNumbers(design, W, H, opts = {}) {
  const format = opts.format || "number", spot = opts.spot || "bottom-right";
  const size = opts.style?.size || Math.max(8, Math.round(Math.min(W, H) * 0.028));
  removePageNumbers(design);
  design.pageNumbers = { format, show: opts.show || "all", spot };
  for (const p of design.pages) p.pn = 1;
  for (const i of pagesFor(opts.show || "all", design.pages.length, opts.current || 0)) {
    const b = pageNumberBox(spot, W, H, size);
    const l = textLayer("1", { x: b.x, y: 0, w: b.w, size, align: b.align, color: opts.style?.color || "#5b6478", family: opts.style?.family || "sans", bold: !!opts.style?.bold, italic: !!opts.style?.italic, name: "Page number" });
    l.text.dynamic = { kind: "page", format };
    l.h = textHeight(l.text, l.w);
    l.y = b.top ? b.m : H - b.m - l.h;
    l.id = newId();
    design.pages[i].layers.push(l);
  }
  renumberPages(design);
  return countPageNumbers(design);
}
export const countPageNumbers = (design) => design.pages.reduce((s, p) => s + p.layers.filter(isPageNumber).length, 0);
export function removePageNumbers(design) {
  let n = 0;
  delete design.pageNumbers;
  for (const p of design.pages) { const before = p.layers.length; p.layers = p.layers.filter((l) => !isPageNumber(l)); n += before - p.layers.length; }
  return n;
}
/** "Apply properties to all pages": copies the font, colour, effects, format and place of one page number to the others. */
export function applyPageNumberStyle(design, from) {
  if (!isPageNumber(from)) return 0;
  let n = 0;
  for (const p of design.pages) for (const l of p.layers) {
    if (!isPageNumber(l) || l === from) continue;
    const content = l.text.content;
    l.text = JSON.parse(JSON.stringify(from.text)); l.text.content = content;
    Object.assign(l, { x: from.x, y: from.y, w: from.w, rotation: from.rotation, opacity: from.opacity });
    l.h = textHeight(l.text, l.w);
    n++;
  }
  renumberPages(design);
  return n;
}

/* ---------------- page selection for Download ---------------- */
/** "1-3, 5, 8-" -> [0, 1, 2, 4, 7, …] (0-based, sorted, unique). Throws on text it can't read. */
export function parsePageRange(text, count) {
  const s = String(text || "").trim();
  if (!s || /^all$/i.test(s)) return Array.from({ length: count }, (_, i) => i);
  const out = new Set();
  for (const part of s.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\d+)?\s*(?:(-|–|to)\s*(\d+)?)?$/i.exec(part);
    if (!m || (!m[1] && !m[3])) throw new Error(`"${part}" is not a page number or range (try 1-3, 5).`);
    const a = m[1] ? +m[1] : 1, b = m[2] ? (m[3] ? +m[3] : count) : a;
    if (a < 1 || b < 1 || a > count || b > count) throw new Error(`Page ${Math.max(a, b)} does not exist (this design has ${count} page${count === 1 ? "" : "s"}).`);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i - 1);
  }
  return [...out].sort((x, y) => x - y);
}
/** [0, 1, 2, 4] -> "1-3, 5" */
export function formatPageRange(list) {
  const s = [...new Set(list)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i] + 1}-${s[j] + 1}` : String(s[i] + 1));
    i = j;
  }
  return out.join(", ");
}

/* ---------------- slideshow video / GIF of several pages ---------------- */
/**
 * Timeline for an MP4 / GIF download of several pages: each page shows for its Timing (default 5 s) or as long as
 * its animations need. animLen(page) -> seconds. Returns [{ index, start, dur }].
 */
export function slideTimeline(design, pages, animLen = () => 0) {
  let t = 0;
  return pages.map((i) => { const pg = design.pages[i]; const dur = Math.max(+pg.duration || 5, animLen(pg) || 0); const e = { index: i, start: t, dur }; t += dur; return e; });
}
export const timelineLength = (tl) => (tl.length ? tl[tl.length - 1].start + tl[tl.length - 1].dur : 0);
/** Which page shows at time t, and the time inside that page. */
export function pageAtTime(tl, t) {
  for (const e of tl) if (t < e.start + e.dur) return { index: e.index, local: Math.max(0, t - e.start) };
  const e = tl[tl.length - 1];
  return { index: e.index, local: e.dur };
}

/* ---------------- Tidy up ---------------- */
/**
 * Canva "Tidy up": puts the selected boxes in a neat row, column or grid with equal gaps, in reading order,
 * keeping the group where it is. boxes: [{ id, x, y, w, h }]. Returns { id: { x, y } }.
 */
export function tidyUp(boxes) {
  if (boxes.length < 2) return {};
  const minX = Math.min(...boxes.map((b) => b.x)), minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)), maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const spanX = maxX - minX, spanY = maxY - minY;
  const avgW = boxes.reduce((s, b) => s + b.w, 0) / boxes.length, avgH = boxes.reduce((s, b) => s + b.h, 0) / boxes.length;
  // Rows: boxes whose vertical centres are close belong to the same row.
  const sorted = [...boxes].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows = [];
  for (const b of sorted) {
    const cy = b.y + b.h / 2, r = rows.find((row) => Math.abs(row.cy - cy) < Math.max(row.h, b.h) * 0.5);
    if (r) { r.items.push(b); r.cy = (r.cy * (r.items.length - 1) + cy) / r.items.length; r.h = Math.max(r.h, b.h); } else rows.push({ cy, h: b.h, items: [b] });
  }
  let cols = Math.max(...rows.map((r) => r.items.length));
  if (rows.length === 1 && spanY > spanX) cols = 1; // a tall, narrow pile: a column
  if (cols === 1 && rows.length === 1) cols = boxes.length;
  // Reading order, then a grid of `cols` columns.
  const order = rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
  const nRows = Math.ceil(order.length / cols);
  const colW = Array.from({ length: cols }, (_, c) => Math.max(0, ...order.filter((_, i) => i % cols === c).map((b) => b.w)));
  const rowH = Array.from({ length: nRows }, (_, r) => Math.max(0, ...order.slice(r * cols, r * cols + cols).map((b) => b.h)));
  const gapX = cols > 1 ? Math.max(avgW * 0.08, (spanX - colW.reduce((a, b) => a + b, 0)) / (cols - 1)) : 0;
  const gapY = nRows > 1 ? Math.max(avgH * 0.08, (spanY - rowH.reduce((a, b) => a + b, 0)) / (nRows - 1)) : 0;
  const gap = cols > 1 && nRows > 1 ? Math.min(gapX, gapY) : cols > 1 ? gapX : gapY;
  const out = {};
  let y = minY;
  for (let r = 0; r < nRows; r++) {
    let x = minX;
    for (let c = 0; c < cols; c++) {
      const b = order[r * cols + c];
      if (!b) break;
      out[b.id] = { x: Math.round((x + (colW[c] - b.w) / 2) * 100) / 100, y: Math.round((y + (rowH[r] - b.h) / 2) * 100) / 100 };
      x += colW[c] + gap;
    }
    y += rowH[r] + gap;
  }
  return out;
}

/* ---------------- Copy style (paint roller) ---------------- */
const TEXT_OPTIONAL = ["strike", "upper", "shadow", "outline", "bg", "effect", "curve"];
const TEXT_STYLE = ["family", "size", "bold", "italic", "underline", "color", "align", "lineHeight", "letterSpacing", ...TEXT_OPTIONAL];
/** The style part of a layer (what Copy style carries). */
export function styleOf(l) {
  const c = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const s = { type: l.type, opacity: l.opacity };
  if (l.type === "text") { s.text = {}; for (const k of TEXT_STYLE) if (l.text[k] !== undefined) s.text[k] = c(l.text[k]); }
  else if (l.type === "shape") s.shape = { fill: l.shape.fill, stroke: l.shape.stroke, strokeWidth: l.shape.strokeWidth, radius: l.shape.radius, dash: l.shape.dash, gradient: c(l.shape.gradient) };
  else if (l.type === "image") s.image = { filters: c(l.image.filters), radius: l.image.radius, border: c(l.image.border) };
  else if (l.type === "frame") s.frame = { radius: l.frame.radius, border: c(l.frame.border) };
  else if (l.type === "element") s.element = { colors: c(l.element.colors) };
  else if (l.type === "table") s.table = { headerFill: l.table.headerFill, size: l.table.size };
  // Any layer can take the main colour of another (Canva copies the colour across types).
  s.color = l.type === "text" ? l.text.color : l.type === "shape" ? (l.shape.fill !== "none" ? l.shape.fill : l.shape.stroke) : l.type === "element" ? Object.values(l.element.colors || {})[0] : null;
  return s;
}
/** Applies a copied style to a layer. Same type: the full style; other types: colour and transparency. Returns true when it changed something. */
export function pasteStyle(l, s) {
  if (!s || !l) return false;
  const before = JSON.stringify(l);
  const c = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  l.opacity = s.opacity ?? l.opacity;
  if (s.type === l.type) {
    if (l.type === "text") { for (const k of TEXT_OPTIONAL) delete l.text[k]; Object.assign(l.text, c(s.text)); }
    else if (l.type === "shape") { const line = l.shape.kind === "line" || l.shape.kind === "arrow"; Object.assign(l.shape, c(s.shape)); if (line) l.shape.fill = "none"; for (const k of ["dash", "gradient"]) if (l.shape[k] === undefined) delete l.shape[k]; }
    else if (l.type === "image") { Object.assign(l.image, c(s.image)); if (l.image.border === undefined) delete l.image.border; }
    else if (l.type === "frame") { Object.assign(l.frame, c(s.frame)); if (l.frame.border === undefined) delete l.frame.border; }
    else if (l.type === "element") { const keys = Object.keys(l.element.colors || {}), vals = Object.values(s.element.colors || {}); keys.forEach((k, i) => { if (vals[i]) l.element.colors[k] = vals[i]; }); }
    else if (l.type === "table") Object.assign(l.table, c(s.table));
  } else if (s.color && /^#[0-9a-f]{6}$/i.test(s.color)) {
    if (l.type === "text") l.text.color = s.color;
    else if (l.type === "shape") { if (l.shape.fill !== "none") l.shape.fill = s.color; else l.shape.stroke = s.color; }
    else if (l.type === "element") { const k = Object.keys(l.element.colors || {})[0]; if (k) l.element.colors[k] = s.color; }
  }
  return JSON.stringify(l) !== before;
}

/* ---------------- Resize canvas to selection ---------------- */
/** New page size and the shift for every layer so the selection's box becomes the page. box: { x, y, w, h } (page px). */
export function canvasToSelection(box, { min = 40, max = 8000 } = {}) {
  const w = Math.round(Math.max(min, Math.min(max, box.w))), h = Math.round(Math.max(min, Math.min(max, box.h)));
  return { w, h, dx: -(box.x - (w - box.w) / 2), dy: -(box.y - (h - box.h) / 2) };
}

/* ---------------- links (Canva: Link on text and elements) ---------------- */
/** A link someone typed -> a safe URL (https:, http:, mailto:, tel:) or "" when it can't be a link. */
export function normalizeLink(s) {
  let v = String(s || "").trim();
  if (!v) return "";
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v)) v = "mailto:" + v;
  else if (/^\+?[\d ()-]{6,}$/.test(v)) v = "tel:" + v.replace(/[^\d+]/g, "");
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v.replace(/^\/+/, "");
  if (!/^(https?:\/\/[^\s/$.?#][^\s]*|mailto:[^\s]+|tel:\+?\d+)$/i.test(v)) return "";
  return v.slice(0, 2000);
}

/* ---------------- locks ---------------- */
/** Canva's lock cycle (Alt+Shift+L): unlocked -> locked -> position only -> unlocked. */
export function nextLock(l) { return !l.locked ? "full" : l.lockMode === "position" ? "none" : "position"; }
export function setLock(l, mode) {
  if (mode === "none") { l.locked = false; delete l.lockMode; }
  else { l.locked = true; if (mode === "position") l.lockMode = "position"; else delete l.lockMode; }
}
/** Can the content of this layer still be edited (text typed, photo replaced)? */
export const contentEditable = (l, page) => !page?.locked && (!l.locked || l.lockMode === "position");
