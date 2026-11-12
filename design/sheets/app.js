// AsaanDesk Sheets: the grid (virtualised), editing, clipboard, fill handle, rows/columns, sheets, formatting,
// sort / filter / find, charts, files (CSV, XLSX, JSON), autosave, Magic Insights and Magic Formulas.
import { Workbook, cellName, colName, rangeName, parseCellName, parseRangeName, shiftFormula, moveIndex, moveSpan, FormulaError, parseLiteral, numToText, generalText, serialToParts, parseDateText, serialFromDate } from "./formula.js";
import { FORMATS, displayText, fmtCode, isDateCode, fillSeries, sortRows, looksLikeHeader, toTSV, parseTSV, chartData } from "./model.js";
import { parseCSV, detectDelimiter, toCSV } from "./csv.js";
import { saveProject, listProjects, getProject, uid } from "../shared/store.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";

const $ = (id) => document.getElementById(id);
const KM = 16384, key = (r, c) => r * KM + c, unkey = (k) => [Math.floor(k / KM), k % KM];
const DEF_W = 110, DEF_H = 28, MIN_W = 28, MIN_H = 16, BAR_H = 37;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const plain = (v) => (v instanceof FormulaError ? v.code : v);
const els = {};
/** Runs an async action from a click; any failure becomes a friendly message instead of an uncaught error. */
const safe = (fn) => (...a) => Promise.resolve().then(() => fn(...a)).catch((e) => { console.error(e); toast("Sorry, something went wrong: " + (e?.message || e)); });
for (const id of ["oldTop", "docName", "saveState", "newBtn", "fileBtn", "fileMenu", "recentList", "csvInput", "xlsxInput", "jsonInput", "toolbar", "fbar", "stage", "undoBtn", "redoBtn", "boldBtn", "italicBtn", "textColor", "textSwatch", "fillColor", "fillSwatch", "clearFmtBtn", "wrapBtn", "sortAsc", "sortDesc", "filterBtn", "findBtn", "actionsBtn", "actionsMenu", "fmtBtn", "fmtMenu", "decLess", "decMore", "bordersBtn", "bordersMenu", "fontSelect", "sizeDown", "sizeInput", "sizeUp", "alignBtn", "alignMenu", "alignIcon", "valignBtn", "valignMenu", "paintBtn", "commentBtn", "moreBtn", "moreMenu", "mergeBtn", "unmergeBtn", "underlineBtn", "clearBtn", "freezeBtn", "commentPop", "commentCell", "commentText", "commentSave", "commentDel", "commentCancel", "chartBtn", "insightsBtn", "formulasBtn", "nameBox", "formulaInput", "grid", "corner", "colHead", "colHeadIn", "rowHead", "rowHeadIn", "scroller", "spacer", "cellLayer", "selBox", "fillHandle", "activeBox", "fillPreview", "copyAnts", "chartLayer", "cellInput", "fnHint", "side", "sideTitle", "sideClose", "sideBody", "addSheet", "tabs", "status", "ctxMenu", "gallery", "galleryCards", "toast", "ddBtn", "linkChip", "listBtn", "freezeColBtn", "actCond", "actDropdown", "actLink", "actPicture", "actDate", "actMagicChart", "actFormulas", "actInsights", "actWrite", "actBulk", "quickCalc", "quickCalcText", "quickMenu", "cellImgInput", "dateBtn", "datePick", "errChip", "errCode", "errWhy", "errFix"]) els[id] = $(id);
const { scroller, spacer, cellInput, formulaInput } = els;

/* ---------------- state ---------------- */

const S = {
  wb: null, metas: new WeakMap(), active: 0,
  sel: { ar: 0, ac: 0, er: 0, ec: 0, r1: 0, c1: 0, r2: 0, c2: 0 },
  edit: null, point: null, hint: null, tabStart: null,
  id: null, name: "Untitled sheet", past: [], future: [], clip: null,
  panel: null, lastInsights: null, ready: false, paint: null, mode: "edit",
};
const MODE = new URLSearchParams(location.search).get("mode") || "";
let shell = null; // the shared editor frame (editor-shell.js) once it is mounted
let Z = 1; // grid zoom (1 = 100%)
/** Fonts offered in the toolbar: name → CSS family list. */
const FONTS = { "": "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif", Arial: "Arial, Helvetica, sans-serif", Georgia: "Georgia, serif", "Times New Roman": "\"Times New Roman\", Times, serif", Verdana: "Verdana, Geneva, sans-serif", "Trebuchet MS": "\"Trebuchet MS\", sans-serif", Tahoma: "Tahoma, sans-serif", "Courier New": "\"Courier New\", monospace" };
const fontCss = (f) => FONTS[f] || (!f ? FONTS[""] : /,/.test(f) ? String(f).replace(/[;{}<>]/g, "") : `"${String(f).replace(/["\\]/g, "")}", system-ui, sans-serif`);
const sheet = () => S.wb.sheets[S.active];
function meta(s = sheet()) {
  let m = S.metas.get(s);
  if (!m) { m = { styles: new Map(), colW: new Map(), rowH: new Map(), autoH: new Set(), charts: [], filter: null, hidden: new Set(), view: null, comments: new Map(), merges: [], freeze: 0, freezeCols: 0, cf: [], dropdowns: [], images: new Map() }; S.metas.set(s, m); }
  return m;
}
/** Parsed range of a rule (cached on the rule). */
const ruleBox = (x) => (x._p && x._p.src === x.range ? x._p : (x._p = { src: x.range, ...(parseRangeName(x.range) || { r1: -1, c1: -1, r2: -2, c2: -2 }) }));
const inBox = (b, r, c) => r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2;
/** Conditional formatting: the style of the last matching rule for this cell, or null. */
function condStyle(m, r, c, v) {
  if (!m.cf.length) return null;
  let out = null;
  for (const rule of m.cf) {
    if (!inBox(ruleBox(rule), r, c)) continue;
    if (rule.op === "scale") { const fill = scaleFill(m, rule, v); if (fill) out = { ...(out || {}), fill }; continue; }
    if (!condTest(rule, v)) continue;
    out = { ...(out || {}), ...rule.style };
  }
  return out;
}
// Colour scale (Canva: "Add a color scale rule", numbers and dates): lowest value → min colour, highest → max colour.
const scaleCache = new Map();
let scaleTick = 0;
function scaleFill(m, rule, v) {
  const x = plain(v);
  if (typeof x !== "number") return null;
  let mm = scaleCache.get(rule.id);
  if (!mm || mm.tick !== scaleTick || mm.range !== rule.range) {
    const b = ruleBox(rule), s = S.wb.sheets.find((x) => meta(x) === m) || sheet();
    let lo = Infinity, hi = -Infinity;
    const r2 = Math.min(b.r2, b.r1 + 20000), c2 = Math.min(b.c2, b.c1 + 200);
    for (let r = b.r1; r <= r2; r++) for (let c = b.c1; c <= c2; c++) { const y = plain(S.wb.getValue(s, r, c)); if (typeof y === "number") { if (y < lo) lo = y; if (y > hi) hi = y; } }
    mm = { tick: scaleTick, range: rule.range, lo, hi };
    scaleCache.set(rule.id, mm);
  }
  if (!Number.isFinite(mm.lo)) return null;
  const t = mm.hi > mm.lo ? (x - mm.lo) / (mm.hi - mm.lo) : 1;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const a = rgb(rule.min || "#ffffff"), z = rgb(rule.max || "#16a34a");
  return "#" + a.map((av, i) => Math.round(av + (z[i] - av) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("");
}
/** Date typed in a rule ("12/25/2026", "2026-12-25", "25 Dec 2026") as a date number, or NaN. */
const ruleDate = (t) => { const d = parseDateText(String(t ?? "")); return d === null || d === undefined ? NaN : Math.floor(d); };
function condTest(rule, v) {
  const x = plain(v), num = (t) => (t === "" || t === null || t === undefined ? NaN : Number(t));
  const a = num(rule.v1), b = num(rule.v2), isN = typeof x === "number";
  const txt = x === null || x === undefined ? "" : String(x).toLowerCase(), want = String(rule.v1 ?? "").toLowerCase();
  const today = Math.floor(serialFromDate(new Date()));
  switch (rule.op) {
    case "notContains": return x !== null && !txt.includes(want);
    case "startsWith": return x !== null && txt.startsWith(want);
    case "endsWith": return x !== null && txt.endsWith(want);
    case "dateBefore": return isN && Math.floor(x) < ruleDate(rule.v1);
    case "dateAfter": return isN && Math.floor(x) > ruleDate(rule.v1);
    case "dateOn": return isN && Math.floor(x) === ruleDate(rule.v1);
    case "dateToday": return isN && Math.floor(x) === today;
    case "datePast7": return isN && Math.floor(x) <= today && Math.floor(x) > today - 7;
    case "dateNext7": return isN && Math.floor(x) >= today && Math.floor(x) < today + 7;
    case "gt": return isN && x > a;
    case "lt": return isN && x < a;
    case "ge": return isN && x >= a;
    case "le": return isN && x <= a;
    case "between": return isN && x >= Math.min(a, b) && x <= Math.max(a, b);
    case "eq": return x !== null && String(x).toLowerCase() === String(rule.v1 ?? "").toLowerCase();
    case "ne": return x !== null && String(x).toLowerCase() !== String(rule.v1 ?? "").toLowerCase();
    case "contains": return x !== null && String(x).toLowerCase().includes(String(rule.v1 ?? "").toLowerCase());
    case "empty": return x === null || x === "";
    case "notEmpty": return x !== null && x !== "";
    default: return false;
  }
}
const dropdownAt = (m, r, c) => (m.dropdowns.length ? m.dropdowns.find((d) => inBox(ruleBox(d), r, c)) || null : null);
/** Ranges kept in sheet metadata (rules, dropdowns) follow inserted / deleted rows and columns. */
function shiftRange(range, axis, at, count) {
  const p = parseRangeName(range);
  if (!p) return null;
  const sp = axis === "row" ? moveSpan(p.r1, p.r2, at, count) : moveSpan(p.c1, p.c2, at, count);
  if (!sp) return null;
  return axis === "row" ? rangeName(sp[0], p.c1, sp[1], p.c2) : rangeName(p.r1, sp[0], p.r2, sp[1]);
}
const styleAt = (r, c, s = sheet()) => meta(s).styles.get(key(r, c)) || null;

/* ---------------- geometry and rendering ---------------- */

const G = { colX: new Float64Array(1), rowY: new Float64Array(1), rows: 0, cols: 0 };
function geometryFor(s) {
  const m = meta(s), rows = s.rows, cols = s.cols;
  const colX = new Float64Array(cols + 1), rowY = new Float64Array(rows + 1);
  for (let c = 0; c < cols; c++) colX[c + 1] = colX[c] + (m.colW.get(c) ?? DEF_W) * Z;
  for (let r = 0; r < rows; r++) rowY[r + 1] = rowY[r] + (m.hidden.has(r) ? 0 : (m.rowH.get(r) ?? DEF_H) * Z);
  return { colX, rowY, rows, cols };
}
function layout() {
  Object.assign(G, geometryFor(sheet()));
  spacer.style.width = G.colX[G.cols] + "px";
  spacer.style.height = G.rowY[G.rows] + "px";
}
function idxAt(arr, n, pos) { let lo = 0, hi = n - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (arr[mid] <= pos) lo = mid; else hi = mid - 1; } return lo; }
const rectOf = (r1, c1, r2, c2) => ({ x: G.colX[c1], y: G.rowY[r1], w: G.colX[c2 + 1] - G.colX[c1], h: G.rowY[r2 + 1] - G.rowY[r1] });
function place(el, r1, c1, r2, c2) { const q = rectOf(r1, c1, r2, c2); el.style.left = q.x + "px"; el.style.top = q.y + "px"; el.style.width = q.w + "px"; el.style.height = q.h + "px"; }

const mctx = (() => { try { return document.createElement("canvas").getContext("2d"); } catch { return null; } })();
const widthCache = new Map();
function textWidth(t, bold = false) {
  const k = (bold ? "b" : "n") + t;
  let w = widthCache.get(k);
  if (w === undefined) {
    if (mctx) { mctx.font = `${bold ? 700 : 400} 13px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; w = mctx.measureText(t).width; } else w = t.length * 7;
    if (widthCache.size > 4000) widthCache.clear();
    widthCache.set(k, w);
  }
  return w;
}

let renderQueued = false;
function queueRender() { if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); } }
function cellText(v, st) { return v === null || v === undefined ? "" : displayText(v, st); }
const BORDER_SIDES = { t: "0 1px 0", b: "0 -1px 0", l: "1px 0 0", r: "-1px 0 0" };
const BORDER_THICK = { t: "0 2px 0", b: "0 -2px 0", l: "2px 0 0", r: "-2px 0 0" };
/** CSS for a cell's borders: solid / thick as inset shadows, dashed / dotted as gradient strips (layout stays the same). */
function borderCss(stl) {
  const col = stl.bc || "#334155", sides = [...stl.bd].filter((x) => BORDER_SIDES[x]);
  if (stl.bs === "dashed" || stl.bs === "dotted") {
    const on = stl.bs === "dashed" ? 5 : 1.5, off = stl.bs === "dashed" ? 3 : 2.5, t = stl.bs === "dotted" ? 1.5 : 1;
    const hz = `repeating-linear-gradient(90deg,${col} 0 ${on}px,transparent ${on}px ${on + off}px)`, vt = `repeating-linear-gradient(180deg,${col} 0 ${on}px,transparent ${on}px ${on + off}px)`;
    const pos = { t: [hz, `left top / 100% ${t}px`], b: [hz, `left bottom / 100% ${t}px`], l: [vt, `left top / ${t}px 100%`], r: [vt, `right top / ${t}px 100%`] };
    return "background-image:" + sides.map((x) => pos[x][0]).join(",") + ";background-position:" + sides.map((x) => pos[x][1].split(" / ")[0]).join(",") + ";background-size:" + sides.map((x) => pos[x][1].split(" / ")[1]).join(",") + ";background-repeat:no-repeat;";
  }
  const S2 = stl.bs === "thick" ? BORDER_THICK : BORDER_SIDES;
  return "box-shadow:" + sides.map((x) => `inset ${S2[x]} ${col}`).join(",") + ";";
}
/** HTML for one cell at (r, c), drawn at top (px) with width w and height h. */
function cellHtml(r, c, top, w, h, extra = "") {
  const s = sheet(), m = meta(s), wb = S.wb, left = G.colX[c];
  const v = wb.getValue(s, r, c);
  let cls = "c" + extra, css = "", text = "", title = "", inner = null;
  const cf = condStyle(m, r, c, v);
  const stl0 = m.styles.get(key(r, c));
  const stl = cf ? { ...(stl0 || {}), ...cf } : stl0;
  if (v !== null && v !== undefined) {
    text = displayText(v, stl);
    if (stl?.list && text) text = text.split("\n").map((l) => "• " + l).join("\n");
    const err = v instanceof FormulaError;
    const align = stl?.align || (err || typeof v === "boolean" ? "center" : typeof v === "number" ? "right" : "left");
    if (align === "right") cls += " n"; else if (align === "center") cls += " mid";
    if (err) cls += " e";
    if (stl?.wrap) cls += " w";
    else if (align === "left" && typeof v === "string" && text && !extra.includes("mg")) {
      const need = textWidth(text, stl?.b) * Z * ((stl?.size || 13) / 13) + 10;
      if (need > w) {
        let ext = w, cc = c + 1;
        while (ext < need && cc < G.cols && wb.getValue(s, r, cc) === null && !m.styles.get(key(r, cc))?.fill) { ext += G.colX[cc + 1] - G.colX[cc]; cc++; }
        if (ext > w) { cls += " ov"; w = ext - 1; if (!stl?.fill) css += "background:#fff;"; }
      }
    }
    if (wb.spillOf(s, r, c)) cls += " spill";
  }
  if (stl) {
    if (stl.fill) css += `background:${stl.fill};`; if (stl.b) css += "font-weight:700;"; if (stl.i) css += "font-style:italic;"; if (stl.u) css += "text-decoration:underline;"; if (stl.color) css += `color:${stl.color};`;
    if (stl.size) css += `font-size:${stl.size * Z}px;`;
    if (stl.font) css += `font-family:${esc(fontCss(stl.font))};`;
    if (stl.valign === "top") cls += " vt"; else if (stl.valign === "middle") cls += " vm";
    if (stl.bd) css += borderCss(stl);
  }
  const note = m.comments.get(key(r, c));
  if (note) { cls += " cm"; title = ` title="${esc("Comment: " + note)}"`; }
  if (stl?.link) { cls += " lk"; if (!note) title = ` title="${esc("Link: " + stl.link)}"`; }
  const dd = dropdownAt(m, r, c);
  if (dd) {
    cls += " dd";
    const opt = dd.options.find((o) => o.label === text);
    if (opt && text) inner = `<span class="pill" style="background:${esc(opt.color)}">${esc(text)}</span>`;
  }
  const img = m.images.get(key(r, c));
  if (img) { cls += " ci"; inner = `<img class="cimg" alt="" src="${esc(img)}">` + (text ? `<span>${esc(text)}</span>` : ""); }
  return `<div class="${cls}" data-ref="${colName(c)}${r + 1}"${title} style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;${css}">${inner ?? `<span>${esc(text)}</span>`}</div>`;
}
function render() {
  scaleTick++; // colour scales re-read their lowest / highest values once per frame
  if (!S.wb) return;
  const s = sheet(), m = meta(s);
  const st = scroller.scrollTop, sl = scroller.scrollLeft, vw = scroller.clientWidth || 1200, vh = scroller.clientHeight || 800;
  const r0 = idxAt(G.rowY, G.rows, st), r1 = idxAt(G.rowY, G.rows, st + vh), c0 = idxAt(G.colX, G.cols, sl), c1 = idxAt(G.colX, G.cols, sl + vw);
  const out = [], covered = new Set();
  for (const mg of m.merges) {
    if (mg.r2 < r0 || mg.r1 > r1 || mg.c2 < c0 || mg.c1 > c1) continue;
    for (let r = Math.max(mg.r1, r0); r <= Math.min(mg.r2, r1); r++) for (let c = Math.max(mg.c1, c0); c <= Math.min(mg.c2, c1); c++) covered.add(key(r, c));
    const q = rectOf(mg.r1, mg.c1, mg.r2, mg.c2);
    if (q.h) out.push(cellHtml(mg.r1, mg.c1, q.y, q.w, q.h, " mg"));
  }
  for (let r = r0; r <= r1; r++) {
    const top = G.rowY[r], h = G.rowY[r + 1] - top;
    if (!h) continue;
    for (let c = c0; c <= c1; c++) if (!covered.has(key(r, c))) out.push(cellHtml(r, c, top, G.colX[c + 1] - G.colX[c], h));
  }
  const frozen = m.freeze && st > 0 ? Math.min(m.freeze, G.rows) : 0;
  for (let r = 0; r < frozen; r++) { const h = G.rowY[r + 1] - G.rowY[r]; if (h) for (let c = c0; c <= c1; c++) out.push(cellHtml(r, c, st + G.rowY[r], G.colX[c + 1] - G.colX[c], h, " frz")); }
  // Frozen first column(s): drawn again at the left edge of the view while scrolling sideways.
  const frozenC = m.freezeCols && sl > 0 ? Math.min(m.freezeCols, G.cols) : 0;
  for (let c = 0; c < frozenC; c++) for (let r = r0; r <= r1; r++) { const h = G.rowY[r + 1] - G.rowY[r]; if (h) out.push(cellHtml(r, c, G.rowY[r], G.colX[c + 1] - G.colX[c], h, " frz frzc").replace(/left:[\d.]+px/, `left:${sl + G.colX[c]}px`)); }
  els.cellLayer.innerHTML = out.join("");
  const { r1: sr1, c1: sc1, r2: sr2, c2: sc2 } = S.sel;
  const ch = [];
  for (let c = c0; c <= c1; c++) ch.push(`<div class="h${c >= sc1 && c <= sc2 ? " on" : ""}${m.filter && m.filter.col === c ? " filtered" : ""}" data-c="${c}" style="left:${G.colX[c]}px;width:${G.colX[c + 1] - G.colX[c]}px">${colName(c)}</div>`);
  for (let c = 0; c < frozenC; c++) ch.push(`<div class="h frz${c >= sc1 && c <= sc2 ? " on" : ""}" data-c="${c}" style="left:${sl + G.colX[c]}px;width:${G.colX[c + 1] - G.colX[c]}px">${colName(c)}</div>`);
  els.colHeadIn.innerHTML = ch.join("");
  els.colHeadIn.style.transform = `translateX(${-sl}px)`;
  const rh = [];
  for (let r = r0; r <= r1; r++) {
    const h = G.rowY[r + 1] - G.rowY[r];
    if (!h) continue;
    rh.push(`<div class="h${r >= sr1 && r <= sr2 ? " on" : ""}${r > 0 && m.hidden.has(r - 1) ? " hidden-above" : ""}" data-r="${r}" style="top:${G.rowY[r]}px;height:${h}px">${r + 1}</div>`);
  }
  for (let r = 0; r < frozen; r++) rh.push(`<div class="h frz${r >= sr1 && r <= sr2 ? " on" : ""}" data-r="${r}" style="top:${st + G.rowY[r]}px;height:${G.rowY[r + 1] - G.rowY[r]}px">${r + 1}</div>`);
  els.rowHeadIn.innerHTML = rh.join("");
  els.rowHeadIn.style.transform = `translateY(${-st}px)`;
}

/* ---------------- selection ---------------- */

function setSel(ar, ac, er = ar, ec = ac) {
  ar = clamp(ar, 0, G.rows - 1); ac = clamp(ac, 0, G.cols - 1); er = clamp(er, 0, G.rows - 1); ec = clamp(ec, 0, G.cols - 1);
  S.sel = { ar, ac, er, ec, r1: Math.min(ar, er), r2: Math.max(ar, er), c1: Math.min(ac, ec), c2: Math.max(ac, ec) };
  drawSel();
  queueRender();
}
/** Selects the box r1..r2 × c1..c2 with (ar, ac) as the active cell. */
function setBox(r1, c1, r2, c2, ar = r1, ac = c1) {
  r1 = clamp(r1, 0, G.rows - 1); r2 = clamp(r2, r1, G.rows - 1); c1 = clamp(c1, 0, G.cols - 1); c2 = clamp(c2, c1, G.cols - 1);
  ar = clamp(ar, r1, r2); ac = clamp(ac, c1, c2);
  S.sel = { ar, ac, er: ar === r1 ? r2 : r1, ec: ac === c1 ? c2 : c1, r1, c1, r2, c2 };
  drawSel();
  queueRender();
}
function drawSel() {
  const { r1, c1, r2, c2, ar, ac } = S.sel;
  place(els.selBox, r1, c1, r2, c2);
  els.selBox.style.background = r1 === r2 && c1 === c2 ? "transparent" : "";
  place(els.activeBox, ar, ac, ar, ac);
  if (!S.edit) idleInput();
  els.nameBox.value = r1 === r2 && c1 === c2 ? cellName(ar, ac) : rangeName(r1, c1, r2, c2);
  if (!S.edit || S.edit.origin !== "bar") formulaInput.value = S.edit ? cellInput.value : inputFor(ar, ac);
  syncToolbar();
  showStats();
  cellExtras();
  if (S.panel === "formulas" && S.formulasTab === "explain") refreshExplain();
}
/** The ▾ button of a dropdown cell and the "Open link" chip of a link cell, next to the active cell. */
function cellExtras() {
  const { ar, ac } = S.sel, m = meta(), q = rectOf(ar, ac, ar, ac);
  const dd = dropdownAt(m, ar, ac);
  els.ddBtn.hidden = !dd;
  if (dd) Object.assign(els.ddBtn.style, { left: q.x + q.w - 22 + "px", top: q.y + Math.max(0, (q.h - 22) / 2) + "px" });
  const fmt = styleAt(ar, ac)?.fmt, v = S.wb.getValue(sheet(), ar, ac);
  const isDate = !dd && fmt && isDateCode(fmtCode(fmt)) && !/^h/i.test(fmtCode(fmt)) && (v === null || typeof v === "number") && !S.wb.getInput(sheet(), ar, ac).startsWith("=");
  els.dateBtn.hidden = !isDate;
  if (isDate) Object.assign(els.dateBtn.style, { left: q.x + q.w - 22 + "px", top: q.y + Math.max(0, (q.h - 22) / 2) + "px" });
  const link = styleAt(ar, ac)?.link;
  els.linkChip.hidden = !link;
  if (link) { els.linkChip.href = safeUrl(link); Object.assign(els.linkChip.style, { left: q.x + "px", top: q.y + q.h + 4 + "px" }); }
  // A formula error: say why, and offer a safe fix when there is one.
  const isErr = v instanceof FormulaError && !S.edit;
  els.errChip.hidden = true;
  if (isErr) {
    if (!CAT) { loadCatalog().then(() => { if (S.sel.ar === ar && S.sel.ac === ac) cellExtras(); }).catch(() => {}); return; }
    const hint = CAT.errorHint(v.code, inputFor(ar, ac));
    els.errCode.textContent = v.code;
    els.errWhy.textContent = hint.why;
    els.errFix.hidden = !hint.fix;
    els.errFix.textContent = hint.fix ? "Fix: " + hint.fixLabel : "";
    els.errFix.dataset.fix = hint.fix || "";
    els.errChip.hidden = false;
    Object.assign(els.errChip.style, { left: q.x + "px", top: q.y + q.h + (link ? 30 : 4) + "px" });
  }
}
/** Only web, mail and phone links open; anything else is treated as a web address. */
function safeUrl(u) {
  const t = String(u || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  return /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(t) ? "https://" + t : "#";
}
function inputFor(r, c) {
  const s = sheet(), sp = S.wb.spillOf(s, r, c);
  return sp ? S.wb.getInput(s, sp.anchor[0], sp.anchor[1]) : S.wb.getInput(s, r, c);
}
function ensureVisible(r, c) {
  const q = rectOf(r, c, r, c), W = scroller.clientWidth, H = scroller.clientHeight;
  if (q.x < scroller.scrollLeft) scroller.scrollLeft = q.x;
  else if (q.x + q.w > scroller.scrollLeft + W) scroller.scrollLeft = Math.min(q.x, q.x + q.w - W);
  if (q.y < scroller.scrollTop) scroller.scrollTop = q.y;
  else if (q.y + q.h > scroller.scrollTop + H) scroller.scrollTop = Math.min(q.y, q.y + q.h - H);
}
function move(dr, dc, extend = false, jump = false) {
  const { ar, ac, er, ec } = S.sel, m = meta();
  let r = extend ? er : ar, c = extend ? ec : ac;
  if (jump) [r, c] = jumpEdge(r, c, dr, dc);
  else { r += dr; c += dc; while (dr && r > 0 && r < G.rows - 1 && m.hidden.has(r)) r += dr; }
  r = clamp(r, 0, G.rows - 1); c = clamp(c, 0, G.cols - 1);
  if (extend) setSel(ar, ac, r, c); else setSel(r, c);
  ensureVisible(r, c);
}
function jumpEdge(r, c, dr, dc) {
  const s = sheet(), filled = (rr, cc) => S.wb.getValue(s, rr, cc) !== null;
  const inb = (rr, cc) => rr >= 0 && cc >= 0 && rr < G.rows && cc < G.cols;
  let nr = r + dr, nc = c + dc;
  if (!inb(nr, nc)) return [r, c];
  if (filled(r, c) && filled(nr, nc)) { while (inb(nr + dr, nc + dc) && filled(nr + dr, nc + dc)) { nr += dr; nc += dc; } return [nr, nc]; }
  while (!filled(nr, nc)) { if (!inb(nr + dr, nc + dc)) return [nr, nc]; nr += dr; nc += dc; }
  return [nr, nc];
}
function currentRegion(r, c) {
  const s = sheet(), used = S.wb.usedRange(s);
  const filled = (rr, cc) => rr >= 0 && cc >= 0 && rr < used.rows && cc < used.cols && S.wb.getValue(s, rr, cc) !== null;
  const rowHas = (rr, a, b) => { for (let cc = Math.max(0, a); cc <= b; cc++) if (filled(rr, cc)) return true; return false; };
  const colHas = (cc, a, b) => { for (let rr = Math.max(0, a); rr <= b; rr++) if (filled(rr, cc)) return true; return false; };
  let r1 = r, r2 = r, c1 = c, c2 = c, grown = true;
  while (grown) {
    grown = false;
    if (r1 > 0 && rowHas(r1 - 1, c1 - 1, c2 + 1)) { r1--; grown = true; }
    if (r2 < used.rows - 1 && rowHas(r2 + 1, c1 - 1, c2 + 1)) { r2++; grown = true; }
    if (c1 > 0 && colHas(c1 - 1, r1 - 1, r2 + 1)) { c1--; grown = true; }
    if (c2 < used.cols - 1 && colHas(c2 + 1, r1 - 1, r2 + 1)) { c2++; grown = true; }
  }
  return { r1, c1, r2, c2 };
}
/** The selection, or the block of data around the active cell when only one cell is selected. */
function workRange() {
  let { r1, c1, r2, c2 } = S.sel;
  const used = S.wb.usedRange(sheet());
  if (r1 === r2 && c1 === c2) ({ r1, c1, r2, c2 } = currentRegion(r1, c1));
  r2 = Math.min(r2, Math.max(r1, used.rows - 1)); c2 = Math.min(c2, Math.max(c1, used.cols - 1));
  return { r1, c1, r2, c2 };
}
const valuesOf = (r1, c1, r2, c2, s = sheet()) => { const out = []; for (let r = r1; r <= r2; r++) { const row = []; for (let c = c1; c <= c2; c++) row.push(S.wb.getValue(s, r, c)); out.push(row); } return out; };

function showStats() {
  const { r1, c1, r2, c2 } = S.sel, s = sheet();
  if ((r1 === r2 && c1 === c2) || (r2 - r1 + 1) * (c2 - c1 + 1) > 200000) { els.status.textContent = `${s.name} · ${G.rows.toLocaleString("en-US")} rows`; if (els.quickCalcText) els.quickCalcText.textContent = "Sum"; return; }
  let n = 0, sum = 0, filled = 0;
  const used = S.wb.usedRange(s);
  for (let r = r1; r <= Math.min(r2, used.rows - 1); r++) for (let c = c1; c <= Math.min(c2, used.cols - 1); c++) { const v = S.wb.getValue(s, r, c); if (v !== null) filled++; if (typeof v === "number") { n++; sum += v; } }
  const f = (x) => generalText(+x.toPrecision(10));
  els.status.textContent = n ? `Sum ${f(sum)} · Average ${f(sum / n)} · Count ${filled}` : `Count ${filled}`;
  if (els.quickCalcText) els.quickCalcText.textContent = n ? `Sum ${f(sum)}` : "Sum";
}

/* ---------------- toolbar state ---------------- */

els.fmtMenu.innerHTML = Object.entries(FORMATS).map(([id, f]) => `<button role="menuitem" type="button" data-fmt="${id}">${esc(f.label)}</button>`).join("");
els.fontSelect.innerHTML = Object.keys(FONTS).map((f) => `<option value="${esc(f)}" style="font-family:${esc(FONTS[f])}">${f || "Default"}</option>`).join("");
function syncToolbar() {
  const st = styleAt(S.sel.ar, S.sel.ac) || {};
  els.boldBtn.setAttribute("aria-pressed", String(!!st.b));
  els.italicBtn.setAttribute("aria-pressed", String(!!st.i));
  els.wrapBtn.setAttribute("aria-pressed", String(!!st.wrap));
  document.querySelectorAll("[data-align]").forEach((b) => b.classList.toggle("on", st.align === b.dataset.align));
  els.alignIcon.innerHTML = `<use href="#i-${st.align || "left"}"/>`;
  document.querySelectorAll("[data-fmt]").forEach((b) => b.classList.toggle("on", (st.fmt || "general") === b.dataset.fmt));
  document.querySelectorAll("[data-valign]").forEach((b) => b.classList.toggle("on", (st.valign || "bottom") === b.dataset.valign));
  if (document.activeElement !== els.sizeInput) els.sizeInput.value = String(st.size || 13);
  if (!((st.font || "") in FONTS) && ![...els.fontSelect.options].some((o) => o.value === st.font)) els.fontSelect.insertAdjacentHTML("beforeend", `<option value="${esc(st.font)}">${esc(st.font)}</option>`);
  els.fontSelect.value = st.font || "";
  els.textSwatch.style.background = st.color || "#1b2133";
  els.fillSwatch.style.setProperty("--fill", st.fill || "transparent");
  els.paintBtn.setAttribute("aria-pressed", String(!!S.paint));
  els.commentBtn.classList.toggle("on", meta().comments.has(key(S.sel.ar, S.sel.ac)));
  els.listBtn.setAttribute("aria-pressed", String(!!st.list));
  els.freezeBtn.textContent = meta().freeze ? (meta().freeze > 1 ? `Unfreeze rows 1–${meta().freeze}` : "Unfreeze the first row") : "Freeze the first row";
  { const gt = document.getElementById("gridToggle"); if (gt) gt.checked = !meta().noGrid; document.getElementById("grid")?.classList.toggle("nogrid", !!meta().noGrid); }
  els.freezeColBtn.textContent = meta().freezeCols ? "Unfreeze the first column" : "Freeze the first column";
}
function updateUndo() { els.undoBtn.disabled = !S.past.length; els.redoBtn.disabled = !S.future.length; }

/* ---------------- state save / load / undo ---------------- */

function serialize() {
  return {
    version: 1, name: S.name, active: S.active,
    sheets: S.wb.sheets.map((s) => {
      const m = meta(s);
      const cells = {};
      for (const cell of s.cells.values()) cells[cellName(cell.r, cell.c)] = cell.input;
      const styles = {};
      for (const [k, st] of m.styles) { const [r, c] = unkey(k); styles[cellName(r, c)] = st; }
      const comments = {};
      for (const [k, t] of m.comments) { const [r, c] = unkey(k); comments[cellName(r, c)] = t; }
      return { name: s.name, rows: s.rows, cols: s.cols, cells, styles, colW: Object.fromEntries(m.colW), rowH: Object.fromEntries(m.rowH), charts: m.charts.map((c) => ({ ...c })), filter: m.filter, comments, merges: m.merges.map((x) => ({ ...x })), freeze: m.freeze || 0, ...extraMetaTo(m) };
    }),
  };
}
/** Conditional formatting, dropdown lists, pictures in cells and frozen columns: to and from saved sheets. */
function extraMetaTo(m) {
  const images = {};
  for (const [k, src] of m.images) { const [r, c] = unkey(k); images[cellName(r, c)] = src; }
  return { freezeCols: m.freezeCols || 0, ...(m.noGrid ? { noGrid: true } : {}), cf: m.cf.map(({ _p, ...x }) => ({ ...x, style: { ...x.style } })), dropdowns: m.dropdowns.map(({ _p, ...d }) => ({ ...d, options: d.options.map((o) => ({ ...o })) })), images };
}
function extraMetaFrom(m, src) {
  m.freezeCols = src.freezeCols || 0;
  m.noGrid = !!src.noGrid;
  m.cf = (src.cf || []).map(({ _p, ...x }) => ({ ...x, id: x.id || uid(), style: { ...(x.style || {}) } }));
  m.dropdowns = (src.dropdowns || []).map(({ _p, ...d }) => ({ ...d, options: (d.options || []).map((o) => ({ ...o })) }));
  m.images = new Map();
  for (const [ref, img] of Object.entries(src.images || {})) { const p = parseCellName(ref); if (p && img) m.images.set(key(p.row, p.col), img); }
}
function load(state, { keepView = false } = {}) {
  const prev = { sel: S.sel, active: S.active, top: scroller.scrollTop, left: scroller.scrollLeft };
  S.wb = Workbook.fromJSON({ sheets: (state.sheets || []).map((s) => ({ name: s.name, rows: s.rows, cols: s.cols, cells: s.cells || {} })) });
  S.metas = new WeakMap();
  S.wb.sheets.forEach((s, i) => {
    const src = state.sheets?.[i] || {}, m = meta(s);
    for (const [ref, st] of Object.entries(src.styles || {})) { const p = parseCellName(ref); if (p && st) m.styles.set(key(p.row, p.col), { ...st }); }
    for (const [c, w] of Object.entries(src.colW || {})) m.colW.set(+c, +w);
    for (const [r, h] of Object.entries(src.rowH || {})) m.rowH.set(+r, +h);
    m.charts = (src.charts || []).map((ch) => ({ ...ch, id: ch.id || uid() }));
    m.filter = src.filter || null;
    for (const [ref, t] of Object.entries(src.comments || {})) { const p = parseCellName(ref); if (p && t) m.comments.set(key(p.row, p.col), String(t)); }
    m.merges = (src.merges || []).map((x) => ({ ...x }));
    m.freeze = src.freeze || 0;
    extraMetaFrom(m, src);
    applyFilter(s);
  });
  S.name = state.name || S.name;
  els.docName.value = S.name;
  document.title = `${S.name} | AsaanDesk Sheets`;
  shell?.setTitle?.(S.name);
  S.active = clamp(keepView ? prev.active : state.active ?? 0, 0, S.wb.sheets.length - 1);
  S.edit = null; S.point = null;
  layout();
  renderTabs();
  if (keepView) { setSel(prev.sel.ar, prev.sel.ac, prev.sel.er, prev.sel.ec); scroller.scrollTop = prev.top; scroller.scrollLeft = prev.left; }
  else { setSel(0, 0); scroller.scrollTop = 0; scroller.scrollLeft = 0; }
  render();
  renderCharts();
  updateUndo();
  refreshPages();
}
function refreshPages() { try { shell?.refresh?.(); } catch {} }
/** Tells the frame which saved project is open (Save to projects, notes and comments follow it). */
function linkShell() {
  if (!shell) return;
  try { shell.setProjectId?.(S.id || null); if (S.linkedId !== S.id) { S.linkedId = S.id; shell.setDesignId?.(S.id || "default"); } } catch {}
}
function sheetThumb(i) {
  const s = S.wb?.sheets[i];
  if (!s) return "";
  const m = meta(s), cells = [];
  for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) { const v = S.wb.getValue(s, r, c), st = m.styles.get(key(r, c)); if (st?.fill) cells.push(`<rect x="${c * 26}" y="${r * 9}" width="26" height="9" fill="${esc(st.fill)}"/>`); if (v !== null) cells.push(`<rect x="${c * 26 + 3}" y="${r * 9 + 3}" width="${typeof v === "number" ? 12 : 18}" height="3" rx="1" fill="#64748b"/>`); }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 108"><rect width="156" height="108" fill="#fff"/>${cells.join("")}<g stroke="#e5e7eb" stroke-width=".5">${Array.from({ length: 13 }, (_, r) => `<line x1="0" x2="156" y1="${r * 9}" y2="${r * 9}"/>`).join("")}${Array.from({ length: 7 }, (_, c) => `<line y1="0" y2="108" x1="${c * 26}" x2="${c * 26}"/>`).join("")}</g><text x="4" y="104" font-size="9" font-family="system-ui,sans-serif" fill="#334155">${esc(s.name)}</text></svg>`;
}
function snapshot() {
  S.past.push(JSON.stringify(serialize()));
  if (S.past.length > 60) S.past.shift();
  S.future = [];
  updateUndo();
}
function undo() { commitEdit(); if (!S.past.length) return; S.future.push(JSON.stringify(serialize())); load(JSON.parse(S.past.pop()), { keepView: true }); scheduleSave(); toast("Undone"); }
function redo() { commitEdit(); if (!S.future.length) return; S.past.push(JSON.stringify(serialize())); load(JSON.parse(S.future.pop()), { keepView: true }); scheduleSave(); toast("Redone"); }

let saveTimer = null, savePromise = null;
function setSaveState(t) {
  els.saveState.textContent = t;
  try { shell?.setSaved?.(/^Saving/.test(t) ? "saving" : t === "Saved" ? "saved" : "unsaved"); } catch {}
}
function scheduleSave() { setSaveState("Saving…"); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow(), 700); }
async function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const run = async () => {
    try {
      const rec = await saveProject({ id: S.id || undefined, app: "sheets", name: S.name, data: serialize() });
      S.id = rec.id;
      linkShell();
      setSaveState("Saved");
      const q = new URLSearchParams(location.search);
      if (q.get("id") !== S.id) { q.delete("template"); q.delete("new"); q.set("id", S.id); history.replaceState(null, "", location.pathname + "?" + q.toString()); }
    } catch (e) { setSaveState("Not saved: this browser blocked storage"); }
  };
  savePromise = (savePromise || Promise.resolve()).then(run, run);
  return savePromise;
}
document.addEventListener("visibilitychange", () => { if (document.hidden && saveTimer) saveNow(); });

function afterChange() {
  const s = sheet();
  if (s.rows !== G.rows || s.cols !== G.cols) layout();
  queueRender();
  drawSel();
  renderCharts();
  scheduleSave();
  refreshPanelSoon();
}

/* ---------------- changing cells ---------------- */

const DATE_FN = /^=\s*(TODAY|DATE|EDATE|EOMONTH|NOW)\s*\(/i;
/** list: [{ r, c, input, style? }] (style undefined = keep, null = remove). Typed values pick a number format. */
function setInputs(list, { snap = true, s = sheet() } = {}) {
  if (!list.length) return;
  if (S.mode !== "edit" && snap) { toast("You are viewing. Choose Editing at the top to change cells."); return; }
  if (snap) snapshot();
  const m = meta(s);
  for (const it of list) {
    const k = key(it.r, it.c), cur = m.styles.get(k);
    if (it.style !== undefined) { if (it.style && Object.keys(it.style).length) m.styles.set(k, { ...it.style }); else m.styles.delete(k); continue; }
    const input = String(it.input ?? "");
    // A typed web address becomes a link.
    if (/^(https?:\/\/|www\.)\S+$/i.test(input.trim()) && !cur?.link) m.styles.set(k, { ...(m.styles.get(k) || {}), link: input.trim() });
    if (!input || cur?.fmt) continue;
    const hint = input[0] === "=" ? (DATE_FN.test(input) ? (/NOW/i.test(input) ? "general" : "date") : null) : parseLiteral(input).fmt;
    if (hint && hint !== "general") m.styles.set(k, { ...(cur || {}), fmt: hint });
  }
  S.wb.setCells(list.map((it) => ({ sheet: s, r: it.r, c: it.c, input: String(it.input ?? "") })));
  autoHeights(s, new Set(list.map((it) => it.r)));
  if (s === sheet()) afterChange(); else scheduleSave();
}
function autoHeights(s, rows) {
  const m = meta(s), byRow = new Map();
  for (const [k, st] of m.styles) if (st.wrap || st.size > 15) { const r = Math.floor(k / KM); if (rows.has(r)) { if (!byRow.has(r)) byRow.set(r, []); byRow.get(r).push([k % KM, st]); } }
  if (!byRow.size && ![...rows].some((r) => m.autoH.has(r))) return;
  let changed = false;
  for (const r of rows) {
    if (m.rowH.has(r) && !m.autoH.has(r)) continue;
    let need = 0;
    for (const [c, st] of byRow.get(r) || []) {
      const v = S.wb.getValue(s, r, c);
      if (v === null) continue;
      const k = (st.size || 13) / 13, w = (m.colW.get(c) ?? DEF_W) - 10;
      const n = st.wrap ? String(displayText(v, st)).split("\n").reduce((a, line) => a + Math.max(1, Math.ceil((textWidth(line, st.b) * k) / Math.max(20, w))), 0) : 1;
      need = Math.max(need, n * 17 * k + 8);
    }
    const h = need > DEF_H ? Math.ceil(need) : null;
    if (h) { m.rowH.set(r, h); m.autoH.add(r); changed = true; }
    else if (m.autoH.has(r)) { m.rowH.delete(r); m.autoH.delete(r); changed = true; }
  }
  if (changed && s === sheet()) layout();
}
function clearSelection() {
  const { r1, c1, r2, c2 } = S.sel, s = sheet(), list = [];
  for (const cell of s.cells.values()) if (cell.r >= r1 && cell.r <= r2 && cell.c >= c1 && cell.c <= c2) list.push({ r: cell.r, c: cell.c, input: "" });
  const m = meta(s), pics = [...m.images.keys()].filter((k) => { const [r, c] = unkey(k); return r >= r1 && r <= r2 && c >= c1 && c <= c2; });
  if (pics.length) { snapshot(); for (const k of pics) m.images.delete(k); if (!list.length) { afterChange(); return; } setInputs(list, { snap: false }); return; }
  if (list.length) setInputs(list);
}
function applyStyle(patch) {
  commitEdit();
  snapshot();
  const m = meta();
  let { r1, c1, r2, c2 } = S.sel;
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    const k = key(r, c), st = { ...(m.styles.get(k) || {}), ...patch };
    for (const p of Object.keys(st)) if (st[p] === undefined || st[p] === null || st[p] === false || st[p] === "" || (p === "fmt" && st[p] === "general")) delete st[p];
    if (Object.keys(st).length) m.styles.set(k, st); else m.styles.delete(k);
  }
  if ("wrap" in patch || "size" in patch) autoHeights(sheet(), new Set(Array.from({ length: r2 - r1 + 1 }, (_, i) => r1 + i)));
  afterChange();
}
function clearFormats() {
  commitEdit(); snapshot();
  const { r1, c1, r2, c2 } = S.sel, m = meta();
  for (const k of [...m.styles.keys()]) { const [r, c] = unkey(k); if (r >= r1 && r <= r2 && c >= c1 && c <= c2) m.styles.delete(k); }
  afterChange();
}

/* ---------------- editing ---------------- */

const editorEl = () => (S.edit?.origin === "bar" ? formulaInput : cellInput);
function idleInput() {
  cellInput.classList.add("idle");
  if (!S.copying) cellInput.value = "";
  cellInput.style.width = cellInput.style.height = "";
  const q = rectOf(S.sel.ar, S.sel.ac, S.sel.ar, S.sel.ac);
  cellInput.style.left = q.x + "px";
  cellInput.style.top = q.y + "px";
}
function sizeEditor() {
  if (!S.edit) return;
  const q = rectOf(S.edit.r, S.edit.c, S.edit.r, S.edit.c), lines = cellInput.value.split("\n");
  const w = Math.max(q.w + 2, Math.min(560 * Z, Math.max(...lines.map((l) => textWidth(l))) * Z + 24));
  const h = Math.max(q.h + 2, lines.length * 17 * Z + 10);
  Object.assign(cellInput.style, { left: q.x - 1 + "px", top: q.y - 1 + "px", width: w + "px", height: h + "px" });
}
function beginEdit(mode, text, origin = "cell") {
  if (S.edit) return;
  if (S.mode !== "edit") { toast("You are viewing. Choose Editing at the top to change cells."); return; }
  const { ar: r, ac: c } = S.sel;
  ensureVisible(r, c);
  S.edit = { r, c, mode, origin, original: S.wb.getInput(sheet(), r, c) };
  S.point = null;
  if (origin === "cell") {
    cellInput.classList.remove("idle");
    cellInput.value = text ?? S.edit.original;
    sizeEditor();
    cellInput.focus({ preventScroll: true });
    const n = cellInput.value.length;
    cellInput.setSelectionRange(n, n);
    formulaInput.value = cellInput.value;
  }
  updateHint();
}
function commitEdit(dr = 0, dc = 0) {
  if (!S.edit) return false;
  const { r, c, original, origin } = S.edit;
  let value = origin === "bar" ? formulaInput.value : cellInput.value;
  // Canva's date shortcuts typed in a cell: /today, /tomorrow, /yesterday become that date.
  const quick = { "/today": 0, "/tomorrow": 1, "/yesterday": -1 }[String(value).trim().toLowerCase()];
  if (quick !== undefined) { const d = new Date(); d.setDate(d.getDate() + quick); value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  S.edit = null; S.point = null;
  hideHint();
  idleInput();
  if (value !== original) setInputs([{ r, c, input: value }]);
  if (dr || dc) {
    if (dc > 0) S.tabStart ??= c;
    if (dr > 0 && S.tabStart !== null) { const back = S.tabStart; S.tabStart = null; setSel(r + 1, back); ensureVisible(r + 1, back); }
    else { if (!dc) S.tabStart = null; setSel(r, c); move(dr, dc); }
  } else drawSel();
  if (origin === "bar" || document.activeElement === cellInput || document.activeElement === document.body) focusGrid();
  return true;
}
function cancelEdit() {
  if (!S.edit) return;
  S.edit = null; S.point = null;
  hideHint();
  idleInput();
  drawSel();
  focusGrid();
}
const coarse = () => matchMedia("(pointer: coarse)").matches;
function focusGrid() { if (!coarse() || S.edit) cellInput.focus({ preventScroll: true }); }

// Browser undo/redo of text while no cell is being edited: use the sheet's undo instead of replaying old typing.
cellInput.addEventListener("beforeinput", (e) => {
  if (S.edit || !/^history(Undo|Redo)$/.test(e.inputType || "")) return;
  e.preventDefault();
  if (e.inputType === "historyUndo") undo(); else redo();
});
cellInput.addEventListener("input", (e) => {
  if (!S.edit && /^history(Undo|Redo)$/.test(e.inputType || "")) { cellInput.value = ""; return; }
  if (!S.edit) { beginEdit("enter", cellInput.value); return; }
  S.point = null;
  formulaInput.value = cellInput.value;
  sizeEditor();
  updateHint();
});
cellInput.addEventListener("keydown", (e) => {
  if (e.isComposing || e.keyCode === 229) return; // typing with an input method (IME): let it finish
  const ctrl = e.ctrlKey || e.metaKey;
  if (S.edit) {
    if (S.hint?.list?.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); S.hint.i = (S.hint.i + (e.key === "ArrowDown" ? 1 : -1) + S.hint.list.length) % S.hint.list.length; els.fnHint.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === S.hint.i)); return; }
    if (e.key === "Tab" && S.hint?.list?.length) { e.preventDefault(); acceptHint(S.hint.list[S.hint.i]); return; }
    if (e.key === "Enter" && e.altKey) { e.preventDefault(); const p = cellInput.selectionStart; cellInput.value = cellInput.value.slice(0, p) + "\n" + cellInput.value.slice(cellInput.selectionEnd); cellInput.setSelectionRange(p + 1, p + 1); sizeEditor(); return; }
    if (e.key === "Enter") { e.preventDefault(); commitEdit(e.shiftKey ? -1 : 1, 0); return; }
    if (e.key === "Tab") { e.preventDefault(); commitEdit(0, e.shiftKey ? -1 : 1); return; }
    if (e.key === "Escape") { e.preventDefault(); if (S.hint) { hideHint(); return; } cancelEdit(); return; }
    if (S.edit.mode === "enter" && !e.shiftKey && !ctrl && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && !cellInput.value.startsWith("=")) {
      e.preventDefault();
      const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      S.tabStart = null;
      commitEdit(...d);
    }
    return;
  }
  gridKey(e);
});
function gridKey(e) {
  const ctrl = e.ctrlKey || e.metaKey, k = e.key;
  const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (arrows[k]) { e.preventDefault(); S.tabStart = null; move(...arrows[k], e.shiftKey, ctrl); return; }
  if (ctrl) {
    const l = k.toLowerCase();
    if (l === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (l === "y") { e.preventDefault(); redo(); return; }
    if (l === "b") { e.preventDefault(); applyStyle({ b: !(styleAt(S.sel.ar, S.sel.ac)?.b) }); return; }
    if (l === "i") { e.preventDefault(); applyStyle({ i: !(styleAt(S.sel.ar, S.sel.ac)?.i) }); return; }
    if (l === "a") { e.preventDefault(); setSel(0, 0, G.rows - 1, G.cols - 1); return; }
    if (l === "f" || l === "h") { e.preventDefault(); showFind(); return; }
    if (l === "s") { e.preventDefault(); saveNow().then(() => toast("Saved in this browser")); return; }
    if (l === "c" || l === "x") { prepareCopy(l === "x"); return; }
    if (l === "v") { S.pasteSeen = false; setTimeout(() => { if (!S.pasteSeen && S.clip) pasteData(S.clip); }, 250); return; }
    if (k === "Home") { e.preventDefault(); setSel(0, 0); ensureVisible(0, 0); return; }
    return;
  }
  switch (k) {
    case "Enter": e.preventDefault(); if (S.tabStart !== null) { const back = S.tabStart; S.tabStart = null; setSel(S.sel.ar + 1, back); ensureVisible(S.sel.ar, back); } else move(e.shiftKey ? -1 : 1, 0); return;
    case "Tab": e.preventDefault(); if (!e.shiftKey) S.tabStart ??= S.sel.ac; move(0, e.shiftKey ? -1 : 1); return;
    case "F2": e.preventDefault(); beginEdit("edit"); return;
    case "Delete": case "Backspace": e.preventDefault(); clearSelection(); return;
    case "Escape": S.clip = null; els.copyAnts.hidden = true; closeMenus(); return;
    case "Home": e.preventDefault(); setSel(S.sel.ar, 0); ensureVisible(S.sel.ar, 0); return;
    case "PageDown": case "PageUp": { e.preventDefault(); const n = Math.max(1, Math.floor(scroller.clientHeight / DEF_H) - 1); move(k === "PageDown" ? n : -n, 0, e.shiftKey); return; }
  }
}

formulaInput.addEventListener("focus", () => {
  if (S.edit && S.edit.origin === "cell") { S.edit.origin = "bar"; formulaInput.value = cellInput.value; }
});
formulaInput.addEventListener("input", () => {
  if (!S.edit) { const { ar: r, ac: c } = S.sel; S.edit = { r, c, mode: "edit", origin: "bar", original: S.wb.getInput(sheet(), r, c) }; }
  S.point = null;
  if (!cellInput.classList.contains("idle")) { cellInput.value = formulaInput.value; sizeEditor(); }
  updateHint();
});
formulaInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && S.hint?.list?.length) { e.preventDefault(); acceptHint(S.hint.list[S.hint.i]); return; }
  if (e.key === "Enter") { e.preventDefault(); if (S.edit) commitEdit(1, 0); else { move(1, 0); focusGrid(); } }
  else if (e.key === "Tab") { e.preventDefault(); if (S.edit) commitEdit(0, e.shiftKey ? -1 : 1); }
  else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); formulaInput.value = inputFor(S.sel.ar, S.sel.ac); }
});
els.nameBox.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const p = parseRangeName(els.nameBox.value);
  if (!p || p.sheet) { toast("Type a cell like B7 or a range like A1:C10."); return; }
  setSel(p.r1, p.c1, p.r2, p.c2);
  ensureVisible(p.r1, p.c1);
  focusGrid();
});
els.nameBox.addEventListener("focus", () => els.nameBox.select());

/* function hints while typing a formula */
let CAT = null;
const loadCatalog = async () => (CAT ||= await import("./catalog.js"));
function innermostFunction(text) {
  const stack = [];
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') q = !q;
    if (q) continue;
    if (ch === "(") { const m = /([A-Za-z][A-Za-z0-9.]*)\s*$/.exec(text.slice(0, i)); stack.push(m ? m[1].toUpperCase() : ""); }
    else if (ch === ")") stack.pop();
  }
  return stack.filter(Boolean).pop() || null;
}
async function updateHint() {
  const el = editorEl();
  if (!S.edit || !el.value.startsWith("=")) return hideHint();
  if (!CAT) { try { await loadCatalog(); } catch { return; } if (!S.edit) return; }
  const caret = el.selectionStart ?? el.value.length, before = el.value.slice(0, caret);
  const m = /(?:^=|[=(,+\-*/^&<>;:\s])([A-Za-z][A-Za-z0-9.]*)$/.exec(before);
  let html = "";
  S.hint = null;
  const magic = '<button type="button" class="magic-f" data-magicf="1">✦ <b>Magic Formulas</b><small>Build a formula step by step, or explain one</small></button>';
  if (before === "=") {
    // Just "=": the most used functions plus Magic Formulas, like the suggestion box in other spreadsheet apps.
    const list = ["SUM", "AVERAGE", "IF", "COUNTIF", "XLOOKUP", "PMT"].filter((n) => CAT.FUNCTION_INFO[n]);
    S.hint = { list, start: caret, end: caret, i: 0 };
    html = list.map((n, i) => `<button type="button" data-fn="${n}" class="${i ? "" : "on"}"><b>${n}</b><small>${esc(CAT.FUNCTION_INFO[n].desc)}</small></button>`).join("") + magic;
  } else if (m && !/^[A-Za-z]{1,3}\d+$/.test(m[1])) {
    const pre = m[1].toUpperCase(), list = Object.keys(CAT.FUNCTION_INFO).filter((n) => n.startsWith(pre)).slice(0, 6);
    if (list.length) { S.hint = { list, start: caret - m[1].length, end: caret, i: 0 }; html = list.map((n, i) => `<button type="button" data-fn="${n}" class="${i ? "" : "on"}"><b>${n}</b><small>${esc(CAT.FUNCTION_INFO[n].desc)}</small></button>`).join("") + magic; }
  }
  if (!html) { const fn = innermostFunction(before); if (fn && CAT.FUNCTION_INFO[fn]) html = `<div class="syntax"><b>${esc(CAT.FUNCTION_INFO[fn].syntax)}</b><small>${esc(CAT.FUNCTION_INFO[fn].desc)}</small></div>`; }
  if (!html) return hideHint();
  els.fnHint.innerHTML = html;
  const q = rectOf(S.edit.r, S.edit.c, S.edit.r, S.edit.c);
  els.fnHint.style.left = q.x + "px";
  els.fnHint.style.top = q.y + Math.max(q.h, cellInput.offsetHeight || q.h) + 4 + "px";
  els.fnHint.hidden = false;
}
function hideHint() { S.hint = null; els.fnHint.hidden = true; }
function acceptHint(name) {
  const el = editorEl(), h = S.hint;
  if (!h) return;
  el.value = el.value.slice(0, h.start) + name + "(" + el.value.slice(h.end);
  const p = h.start + name.length + 1;
  el.focus({ preventScroll: true });
  el.setSelectionRange(p, p);
  if (el === cellInput) { formulaInput.value = el.value; sizeEditor(); } else if (!cellInput.classList.contains("idle")) cellInput.value = el.value;
  updateHint();
}
els.fnHint.addEventListener("mousedown", (e) => e.preventDefault());
els.fnHint.addEventListener("click", (e) => {
  if (e.target.closest("[data-magicf]")) { cancelEdit(); safe(showFormulas)("build"); return; }
  const b = e.target.closest("[data-fn]");
  if (b) acceptHint(b.dataset.fn);
});

/* clicking cells while typing a formula puts their address into it */
function canPoint() {
  if (!S.edit) return false;
  const el = editorEl();
  if (!el.value.startsWith("=")) return false;
  const caret = el.selectionStart ?? el.value.length;
  if (S.point && caret === S.point.end) return true;
  return /[=(,+\-*/^&<>:;]\s*$/.test(el.value.slice(0, caret));
}
function pointRef(a, b) {
  const el = editorEl(), caret = el.selectionStart ?? el.value.length;
  if (!S.point || caret !== S.point.end) S.point = { start: caret, end: caret, anchor: a };
  const r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r), c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
  const ref = rangeName(r1, c1, r2, c2);
  el.value = el.value.slice(0, S.point.start) + ref + el.value.slice(S.point.end);
  S.point.end = S.point.start + ref.length;
  el.setSelectionRange(S.point.end, S.point.end);
  if (el === cellInput) { formulaInput.value = el.value; sizeEditor(); } else if (!cellInput.classList.contains("idle")) cellInput.value = el.value;
  els.copyAnts.hidden = false;
  place(els.copyAnts, r1, c1, r2, c2);
}

/* ---------------- mouse and touch on the grid ---------------- */

let drag = null;
function cellAt(x, y) {
  const b = spacer.getBoundingClientRect(), m = meta(), st = scroller.scrollTop;
  let py = Math.max(0, y - b.top);
  if (m.freeze && st > 0 && py - st < G.rowY[Math.min(m.freeze, G.rows)]) py -= st; // a click on the frozen top rows
  const sl = scroller.scrollLeft;
  let px = Math.max(0, x - b.left);
  if (m.freezeCols && sl > 0 && px - sl < G.colX[Math.min(m.freezeCols, G.cols)]) px -= sl; // a click on the frozen first column
  return { r: idxAt(G.rowY, G.rows, py), c: idxAt(G.colX, G.cols, px) };
}
function autoScroll(e) {
  const b = scroller.getBoundingClientRect();
  if (e.clientY > b.bottom - 16) scroller.scrollTop += 20; else if (e.clientY < b.top + 16) scroller.scrollTop -= 20;
  if (e.clientX > b.right - 16) scroller.scrollLeft += 20; else if (e.clientX < b.left + 16) scroller.scrollLeft -= 20;
}
spacer.addEventListener("mousedown", (e) => { if (!e.target.closest(".chart, .cell-input:not(.idle), .dd-btn, .link-chip, .date-pick, .err-chip")) e.preventDefault(); });
spacer.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".chart, .fill-handle, .fn-hint, .dd-btn, .link-chip, .date-pick, .err-chip") || (S.edit && e.target === cellInput)) return;
  closeMenus();
  const hit = cellAt(e.clientX, e.clientY);
  if (S.edit) {
    if (canPoint() && e.button === 0) { e.preventDefault(); pointRef(hit, hit); drag = { kind: "point", a: hit }; spacer.setPointerCapture?.(e.pointerId); return; }
    commitEdit();
  }
  els.copyAnts.hidden = !S.clip;
  if (e.button === 2) { const { r1, c1, r2, c2 } = S.sel; if (hit.r < r1 || hit.r > r2 || hit.c < c1 || hit.c > c2) setSel(hit.r, hit.c); return; }
  S.tabStart = null;
  if (e.pointerType === "touch" || e.pointerType === "pen") { touchTap(hit, e); return; }
  e.preventDefault();
  if (e.shiftKey) setSel(S.sel.ar, S.sel.ac, hit.r, hit.c); else setSel(hit.r, hit.c);
  drag = { kind: "sel" };
  spacer.setPointerCapture?.(e.pointerId);
  focusGrid();
});
spacer.addEventListener("pointermove", (e) => {
  if (!drag) return;
  autoScroll(e);
  const hit = cellAt(e.clientX, e.clientY);
  if (drag.kind === "sel") { if (hit.r !== S.sel.er || hit.c !== S.sel.ec) setSel(S.sel.ar, S.sel.ac, hit.r, hit.c); }
  else if (drag.kind === "point") pointRef(drag.a, hit);
  else if (drag.kind === "fill") fillMove(hit);
});
const endDrag = () => { const k = drag?.kind; if (k === "fill") fillEnd(); drag = null; if (k === "sel" && S.paint) paintNow(); };
spacer.addEventListener("pointerup", endDrag);
spacer.addEventListener("pointercancel", () => { if (drag?.kind === "fill") els.fillPreview.hidden = true; drag = null; });
spacer.addEventListener("dblclick", (e) => {
  if (e.target.closest(".chart, .fill-handle") || S.edit) return;
  const hit = cellAt(e.clientX, e.clientY);
  setSel(hit.r, hit.c);
  beginEdit("edit");
});
function touchTap(hit, e) {
  const start = { x: e.clientX, y: e.clientY, t: Date.now() };
  const up = (ev) => {
    spacer.removeEventListener("pointerup", up);
    if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 12) return;
    const dbl = S.lastTap && start.t - S.lastTap.t < 420 && S.lastTap.r === hit.r && S.lastTap.c === hit.c;
    S.lastTap = { t: start.t, r: hit.r, c: hit.c };
    setSel(hit.r, hit.c);
    if (S.paint) paintNow();
    else if (dbl) beginEdit("edit");
  };
  spacer.addEventListener("pointerup", up);
}
spacer.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".chart")) return;
  e.preventDefault();
  showCtx(e.clientX, e.clientY, cellMenuItems());
});
scroller.addEventListener("scroll", queueRender, { passive: true });
window.addEventListener("resize", queueRender);
// The editor frame's side panel opens and closes without a window resize: redraw when the grid area changes size.
try { new ResizeObserver(() => queueRender()).observe(scroller); } catch {}

/* fill handle */
els.fillHandle.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  commitEdit();
  e.preventDefault();
  e.stopPropagation();
  drag = { kind: "fill", src: { ...S.sel }, target: null };
  spacer.setPointerCapture?.(e.pointerId);
});
function fillMove(hit) {
  const s = drag.src;
  const down = hit.r - s.r2, up = s.r1 - hit.r, right = hit.c - s.c2, left = s.c1 - hit.c;
  const best = Math.max(down, up, right, left);
  if (best <= 0) { drag.target = null; els.fillPreview.hidden = true; return; }
  let t;
  if (best === down) t = { axis: "row", sign: 1, n: down, box: [s.r1, s.c1, hit.r, s.c2] };
  else if (best === up) t = { axis: "row", sign: -1, n: up, box: [hit.r, s.c1, s.r2, s.c2] };
  else if (best === right) t = { axis: "col", sign: 1, n: right, box: [s.r1, s.c1, s.r2, hit.c] };
  else t = { axis: "col", sign: -1, n: left, box: [s.r1, hit.c, s.r2, s.c2] };
  drag.target = t;
  els.fillPreview.hidden = false;
  place(els.fillPreview, ...t.box);
}
function fillEnd() {
  els.fillPreview.hidden = true;
  const t = drag?.target, src = drag?.src;
  if (t && src) applyFill(src, t);
}
function applyFill(src, { axis, sign, n }) {
  const s = sheet(), m = meta(s), list = [];
  if (axis === "row") {
    for (let c = src.c1; c <= src.c2; c++) {
      const seq = [], sts = [];
      for (let r = src.r1; r <= src.r2; r++) { seq.push(S.wb.getInput(s, r, c)); sts.push(m.styles.get(key(r, c)) || null); }
      const out = fillSeries(seq, n, { dr: sign }), order = sign < 0 ? [...sts].reverse() : sts;
      out.forEach((input, i) => { const r = sign > 0 ? src.r2 + 1 + i : src.r1 - 1 - i; if (r >= 0) list.push({ r, c, input, style: order[i % order.length] }); });
    }
  } else {
    for (let r = src.r1; r <= src.r2; r++) {
      const seq = [], sts = [];
      for (let c = src.c1; c <= src.c2; c++) { seq.push(S.wb.getInput(s, r, c)); sts.push(m.styles.get(key(r, c)) || null); }
      const out = fillSeries(seq, n, { dc: sign }), order = sign < 0 ? [...sts].reverse() : sts;
      out.forEach((input, i) => { const c = sign > 0 ? src.c2 + 1 + i : src.c1 - 1 - i; if (c >= 0) list.push({ r, c, input, style: order[i % order.length] }); });
    }
  }
  // Styles and inputs go in one change so undo restores both.
  snapshot();
  for (const it of list) { const k = key(it.r, it.c); if (it.style) m.styles.set(k, { ...it.style }); else m.styles.delete(k); }
  setInputs(list.map(({ r, c, input }) => ({ r, c, input })), { snap: false });
  if (axis === "row") setBox(sign > 0 ? src.r1 : src.r1 - n, src.c1, sign > 0 ? src.r2 + n : src.r2, src.c2, src.ar, src.ac);
  else setBox(src.r1, sign > 0 ? src.c1 : src.c1 - n, src.r2, sign > 0 ? src.c2 + n : src.c2, src.ar, src.ac);
}

/* column and row headers: select, drag to select, drag the edge to resize, double-click the edge to fit */
function headerHit(e, axis) {
  const el = axis === "col" ? els.colHead : els.rowHead, b = el.getBoundingClientRect();
  const pos = axis === "col" ? e.clientX - b.left + scroller.scrollLeft : e.clientY - b.top + scroller.scrollTop;
  const arr = axis === "col" ? G.colX : G.rowY, n = axis === "col" ? G.cols : G.rows;
  const i = idxAt(arr, n, pos);
  let edge = null;
  if (arr[i + 1] - pos < 5) edge = i;
  else if (pos - arr[i] < 5 && i > 0) { let j = i - 1; while (j > 0 && arr[j + 1] === arr[j]) j--; edge = j; }
  return { i, edge };
}
for (const axis of ["col", "row"]) {
  const el = axis === "col" ? els.colHead : els.rowHead;
  el.addEventListener("pointermove", (e) => {
    if (drag?.kind === "size" && drag.axis === axis) {
      const d = (axis === "col" ? e.clientX : e.clientY) - drag.p0;
      if (!drag.snapped) { snapshot(); drag.snapped = true; }
      const m = meta(), size = Math.round(Math.max(axis === "col" ? MIN_W : MIN_H, (drag.s0 + d) / Z));
      if (axis === "col") m.colW.set(drag.i, size); else { m.rowH.set(drag.i, size); m.autoH.delete(drag.i); }
      layout(); drawSel(); queueRender(); renderCharts();
      return;
    }
    if (drag?.kind === "heads" && drag.axis === axis) {
      const { i } = headerHit(e, axis);
      if (axis === "col") setSel(0, drag.i, G.rows - 1, i); else setSel(drag.i, 0, i, G.cols - 1);
      return;
    }
    el.style.cursor = headerHit(e, axis).edge !== null ? (axis === "col" ? "col-resize" : "row-resize") : "pointer";
  });
  el.addEventListener("pointerdown", (e) => {
    commitEdit();
    closeMenus();
    const { i, edge } = headerHit(e, axis);
    if (edge !== null && e.button === 0) {
      const arr = axis === "col" ? G.colX : G.rowY;
      drag = { kind: "size", axis, i: edge, p0: axis === "col" ? e.clientX : e.clientY, s0: arr[edge + 1] - arr[edge] };
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button === 2) { const { r1, r2, c1, c2 } = S.sel; const inside = axis === "col" ? i >= c1 && i <= c2 && r1 === 0 && r2 === G.rows - 1 : i >= r1 && i <= r2 && c1 === 0 && c2 === G.cols - 1; if (inside) return; }
    if (axis === "col") { if (e.shiftKey) setSel(0, S.sel.ac, G.rows - 1, i); else setSel(0, i, G.rows - 1, i); }
    else { if (e.shiftKey) setSel(S.sel.ar, 0, i, G.cols - 1); else setSel(i, 0, i, G.cols - 1); }
    drag = { kind: "heads", axis, i: axis === "col" ? (e.shiftKey ? S.sel.ac : i) : (e.shiftKey ? S.sel.ar : i) };
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    focusGrid();
  });
  el.addEventListener("pointerup", () => { if (drag?.kind === "size" && drag.snapped) { scheduleSave(); } if (drag && (drag.kind === "size" || drag.kind === "heads")) drag = null; });
  el.addEventListener("dblclick", (e) => { const { edge } = headerHit(e, axis); if (edge !== null) autoFit(axis, edge); });
  el.addEventListener("contextmenu", (e) => { e.preventDefault(); showCtx(e.clientX, e.clientY, cellMenuItems(axis)); });
}
function autoFit(axis, i) {
  const s = sheet(), m = meta(s), used = S.wb.usedRange(s);
  snapshot();
  if (axis === "col") {
    let w = 40;
    for (let r = 0; r < Math.min(used.rows, 5000); r++) { const v = S.wb.getValue(s, r, i); if (v !== null) w = Math.max(w, textWidth(displayText(v, m.styles.get(key(r, i))), m.styles.get(key(r, i))?.b) + 16); }
    m.colW.set(i, Math.min(600, Math.ceil(w)));
  } else { m.rowH.delete(i); m.autoH.delete(i); autoHeights(s, new Set([i])); }
  layout(); afterChange();
}
els.corner.addEventListener("click", () => { commitEdit(); setSel(0, 0, G.rows - 1, G.cols - 1); focusGrid(); });

/* ---------------- clipboard ---------------- */

function clipText(v, st) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") { const code = fmtCode(st?.fmt); return isDateCode(code) || /%/.test(code) ? displayText(v, st) : numToText(v); }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof FormulaError) return v.code;
  return String(v);
}
function prepareCopy(cut) {
  const { r1, c1, r2, c2 } = S.sel, s = sheet(), used = S.wb.usedRange(s);
  const R2 = Math.min(r2, Math.max(r1, used.rows - 1)), C2 = Math.min(c2, Math.max(c1, used.cols - 1));
  if ((R2 - r1 + 1) * (C2 - c1 + 1) > 500000) { toast("That is too many cells to copy at once."); return; }
  const inputs = [], styles = [], texts = [];
  for (let r = r1; r <= R2; r++) {
    const ir = [], sr = [], tr = [];
    for (let c = c1; c <= C2; c++) { const st = styleAt(r, c); ir.push(S.wb.getInput(s, r, c)); sr.push(st); tr.push(clipText(S.wb.getValue(s, r, c), st)); }
    inputs.push(ir); styles.push(sr); texts.push(tr);
  }
  const tsv = toTSV(texts);
  S.clip = { tsv, texts, inputs, styles, srcR: r1, srcC: c1, cut, sheet: s };
  els.copyAnts.hidden = false;
  place(els.copyAnts, r1, c1, R2, C2);
  S.copying = true;
  cellInput.value = tsv;
  cellInput.select();
  setTimeout(() => { S.copying = false; if (!S.edit) cellInput.value = ""; }, 0);
  toast(cut ? "Cut. Click where to put it and press Ctrl+V." : "Copied. Paste here or in Excel or Google Sheets.");
}
cellInput.addEventListener("copy", (e) => {
  if (S.edit || !S.clip) return;
  e.preventDefault();
  e.clipboardData.setData("text/plain", S.clip.tsv);
  e.clipboardData.setData("text/html", "<table>" + S.clip.texts.map((r) => "<tr>" + r.map((t) => `<td>${esc(t)}</td>`).join("") + "</tr>").join("") + "</table>");
});
cellInput.addEventListener("cut", (e) => {
  if (S.edit || !S.clip) return;
  e.preventDefault();
  e.clipboardData.setData("text/plain", S.clip.tsv);
});
cellInput.addEventListener("paste", (e) => {
  if (S.edit) return;
  e.preventDefault();
  S.pasteSeen = true;
  const text = e.clipboardData?.getData("text/plain") ?? "";
  if (S.clip && (!text || text.replace(/\r/g, "").replace(/\n$/, "") === S.clip.tsv)) pasteData(S.clip);
  else if (text) pasteData({ inputs: parseTSV(text).map((r) => r.map((v) => (v.startsWith("=") && !/^=[A-Za-z0-9(]/.test(v) ? "'" + v : v))) });
});
function pasteData(data) {
  S.pasteSeen = true;
  const h = data.inputs.length, w = Math.max(...data.inputs.map((r) => r.length));
  const { r1, c1, r2, c2 } = S.sel;
  const selH = r2 - r1 + 1, selW = c2 - c1 + 1;
  const th = selH % h === 0 && selH > h && selH <= 10000 ? selH / h : 1, tw = selW % w === 0 && selW > w ? selW / w : 1;
  const list = [], dest = new Set();
  for (let a = 0; a < th; a++) for (let b = 0; b < tw; b++) for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
    const r = r1 + a * h + i, c = c1 + b * w + j;
    let input = data.inputs[i]?.[j] ?? "";
    if (data.srcR !== undefined && !data.cut && input.startsWith("=")) input = shiftFormula(input, r - (data.srcR + i), c - (data.srcC + j));
    list.push({ r, c, input, style: data.styles ? data.styles[i]?.[j] || null : undefined });
    dest.add(key(r, c));
  }
  snapshot();
  const m = meta();
  for (const it of list) if (it.style !== undefined) { const k = key(it.r, it.c); if (it.style) m.styles.set(k, { ...it.style }); else m.styles.delete(k); }
  if (data.cut && data.sheet === sheet()) {
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) { const r = data.srcR + i, c = data.srcC + j; if (!dest.has(key(r, c))) { list.push({ r, c, input: "" }); m.styles.delete(key(r, c)); } }
    S.clip = null;
    els.copyAnts.hidden = true;
  }
  setInputs(list.map(({ r, c, input }) => ({ r, c, input })), { snap: false });
  setBox(r1, c1, r1 + h * th - 1, c1 + w * tw - 1);
}

/* ---------------- menus ---------------- */

const MENUS = [["fileBtn", "fileMenu"], ["actionsBtn", "actionsMenu"], ["fmtBtn", "fmtMenu"], ["bordersBtn", "bordersMenu"], ["alignBtn", "alignMenu"], ["valignBtn", "valignMenu"], ["moreBtn", "moreMenu"], ["quickCalc", "quickMenu"]];
function closeMenus(except) {
  for (const [b, mn] of MENUS) if (els[mn] !== except) { els[mn].hidden = true; els[b].setAttribute("aria-expanded", "false"); }
  if (except !== els.ctxMenu) els.ctxMenu.hidden = true;
}
function toggleMenu(btn, menu) {
  const open = menu.hidden;
  closeMenus(menu);
  menu.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  if (open) {
    // Menus float above everything (the toolbar may scroll sideways on small screens).
    const b = btn.getBoundingClientRect();
    menu.classList.add("float");
    const mb = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(b.left, innerWidth - mb.width - 8)) + "px";
    menu.style.top = (b.bottom + mb.height + 8 > innerHeight && b.top > mb.height + 8 ? b.top - mb.height - 6 : b.bottom + 6) + "px";
    menu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  }
  return open;
}
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".menu, .menu-wrap")) closeMenus(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { const open = [...MENUS.map(([, mn]) => els[mn]), els.ctxMenu].some((m) => !m.hidden); if (open) { closeMenus(); focusGrid(); } }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && e.target !== cellInput) { e.preventDefault(); commitEdit(); saveNow().then(() => toast("Saved in this browser")); }
  // Ctrl+Z / Ctrl+Y while focus is on the page or a button (e.g. after a menu click) undo the sheet, never the
  // browser's text history (which would replay old typing into the hidden cell editor).
  if ((e.ctrlKey || e.metaKey) && /^[zy]$/i.test(e.key) && e.target !== cellInput && !e.target.closest?.("input, textarea, select, [contenteditable]") && S.wb && S.mode === "edit") {
    e.preventDefault(); commitEdit();
    if (e.key.toLowerCase() === "y" || e.shiftKey) redo(); else undo();
  }
});
function showCtx(x, y, items) {
  closeMenus(els.ctxMenu);
  els.ctxMenu.innerHTML = items.map((it) => (it === "-" ? '<div class="menu-label"></div>' : `<button role="menuitem" type="button" data-ctx="${it.id}">${esc(it.label)}</button>`)).join("");
  els.ctxMenu.hidden = false;
  const b = els.ctxMenu.getBoundingClientRect();
  els.ctxMenu.style.left = Math.max(8, Math.min(x, innerWidth - b.width - 8)) + "px";
  els.ctxMenu.style.top = Math.max(8, Math.min(y, innerHeight - b.height - 8)) + "px";
  S.ctxItems = items;
  els.ctxMenu.querySelector("button")?.focus({ preventScroll: true });
}
els.ctxMenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ctx]");
  if (!b) return;
  const it = S.ctxItems.find((x) => x !== "-" && x.id === b.dataset.ctx);
  closeMenus();
  it?.run();
});
function cellMenuItems(axis) {
  const items = [
    { id: "cut", label: "Cut", run: () => { prepareCopy(true); } },
    { id: "copy", label: "Copy", run: () => { prepareCopy(false); tryClipboardWrite(); } },
    { id: "paste", label: "Paste", run: () => pasteFromMenu() },
    "-",
  ];
  if (axis !== "col") items.push({ id: "rowAbove", label: "Insert row above", run: () => structure("rowAbove") }, { id: "rowBelow", label: "Insert row below", run: () => structure("rowBelow") });
  if (axis !== "row") items.push({ id: "colLeft", label: "Insert column left", run: () => structure("colLeft") }, { id: "colRight", label: "Insert column right", run: () => structure("colRight") });
  if (axis !== "col") items.push({ id: "delRow", label: "Delete row", run: () => structure("delRow") });
  if (axis !== "row") items.push({ id: "delCol", label: "Delete column", run: () => structure("delCol") });
  items.push("-", { id: "clear", label: "Clear contents", run: () => clearSelection() }, { id: "sortAz", label: "Sort A to Z", run: () => sortSel(true) }, { id: "sortZa", label: "Sort Z to A", run: () => sortSel(false) }, { id: "chart", label: "Insert chart", run: safe(() => insertChart()) }, "-", { id: "comment", label: "Comment…", run: () => openComment() }, { id: "link", label: "Insert link…", run: () => showLink() }, { id: "dropdown", label: "Dropdown list…", run: () => showDropdown() }, { id: "cond", label: "Conditional formatting…", run: () => showCond() });
  // Canva: right-click → Freeze up to row / column (your selection), Unfreeze.
  const m = meta(), fr = S.sel.r2 + 1, fc = S.sel.c2 + 1;
  items.push("-");
  if (axis !== "col") items.push({ id: "freezeRows", label: `Freeze up to row ${fr}`, run: () => setFreeze("rows", fr) });
  if (axis !== "row") items.push({ id: "freezeCols", label: `Freeze up to column ${colName(fc - 1)}`, run: () => setFreeze("cols", fc) });
  if (m.freeze) items.push({ id: "unfreezeRows", label: "Unfreeze rows", run: () => setFreeze("rows", 0) });
  if (m.freezeCols) items.push({ id: "unfreezeCols", label: "Unfreeze columns", run: () => setFreeze("cols", 0) });
  return items;
}
async function tryClipboardWrite() { try { await navigator.clipboard?.writeText(S.clip.tsv); } catch {} }
async function pasteFromMenu() {
  try { const t = await navigator.clipboard.readText(); if (S.clip && t.replace(/\r/g, "").replace(/\n$/, "") === S.clip.tsv) pasteData(S.clip); else if (t) pasteData({ inputs: parseTSV(t) }); else if (S.clip) pasteData(S.clip); }
  catch { if (S.clip) pasteData(S.clip); else toast("Press Ctrl+V to paste."); }
}

/* ---------------- rows and columns ---------------- */

function structure(kind) {
  commitEdit();
  if (S.mode !== "edit") { toast("You are viewing. Choose Editing at the top to change cells."); return; }
  const { r1, c1, r2, c2 } = S.sel, s = sheet();
  const nr = r2 - r1 + 1, nc = c2 - c1 + 1;
  if (kind === "addRows") { snapshot(); s.rows += 1000; layout(); afterChange(); toast(`The sheet now has ${s.rows.toLocaleString("en-US")} rows.`); return; }
  const fullCols = r1 === 0 && r2 === G.rows - 1, fullRows = c1 === 0 && c2 === G.cols - 1;
  if (kind === "rowAbove") doStruct("row", r1, fullRows ? nr : 1);
  else if (kind === "rowBelow") doStruct("row", r2 + 1, fullRows ? nr : 1);
  else if (kind === "colLeft") doStruct("col", c1, fullCols ? nc : 1);
  else if (kind === "colRight") doStruct("col", c2 + 1, fullCols ? nc : 1);
  else if (kind === "delRow") { if (nr >= s.rows) { toast("A sheet needs at least one row."); return; } doStruct("row", r1, -nr); }
  else if (kind === "delCol") { if (nc >= s.cols) { toast("A sheet needs at least one column."); return; } doStruct("col", c1, -nc); }
}
function doStruct(axis, at, count) {
  snapshot();
  const s = sheet(), m = meta(s);
  if (axis === "row") { if (count > 0) S.wb.insertRows(s, at, count); else S.wb.deleteRows(s, at, -count); }
  else { if (count > 0) S.wb.insertCols(s, at, count); else S.wb.deleteCols(s, at, -count); }
  const styles = new Map();
  for (const [k, st] of m.styles) { let [r, c] = unkey(k); const x = moveIndex(axis === "row" ? r : c, at, count); if (x === null) continue; if (axis === "row") r = x; else c = x; styles.set(key(r, c), st); }
  m.styles = styles;
  const sizes = axis === "row" ? m.rowH : m.colW, moved = new Map();
  for (const [i, v] of sizes) { const x = moveIndex(i, at, count); if (x !== null) moved.set(x, v); }
  if (axis === "row") { m.rowH = moved; m.autoH = new Set([...m.autoH].map((i) => moveIndex(i, at, count)).filter((x) => x !== null)); } else m.colW = moved;
  m.charts = m.charts.filter((ch) => {
    if (ch.range) {
      const p = parseRangeName(ch.range);
      if (!p) return true;
      const span = axis === "row" ? moveSpan(p.r1, p.r2, at, count) : moveSpan(p.c1, p.c2, at, count);
      if (!span) return false;
      ch.range = axis === "row" ? rangeName(span[0], p.c1, span[1], p.c2) : rangeName(p.r1, span[0], p.r2, span[1]);
    } else if (ch.cols) {
      if (axis === "row") { const span = moveSpan(ch.r1, ch.r2, at, count); if (!span) return false; [ch.r1, ch.r2] = span; }
      else { ch.cols = ch.cols.map((c) => moveIndex(c, at, count)); if (ch.cols.some((c) => c === null)) return false; }
    }
    return true;
  });
  const notes = new Map();
  for (const [k, t] of m.comments) { let [r, c] = unkey(k); const x = moveIndex(axis === "row" ? r : c, at, count); if (x === null) continue; if (axis === "row") r = x; else c = x; notes.set(key(r, c), t); }
  m.comments = notes;
  const imgs = new Map();
  for (const [k, src] of m.images) { let [r, c] = unkey(k); const x = moveIndex(axis === "row" ? r : c, at, count); if (x === null) continue; if (axis === "row") r = x; else c = x; imgs.set(key(r, c), src); }
  m.images = imgs;
  m.cf = m.cf.map((x) => ({ ...x, range: shiftRange(x.range, axis, at, count) })).filter((x) => x.range);
  m.dropdowns = m.dropdowns.map((d) => ({ ...d, range: shiftRange(d.range, axis, at, count) })).filter((d) => d.range);
  m.merges = m.merges.map((g) => { const sp = axis === "row" ? moveSpan(g.r1, g.r2, at, count) : moveSpan(g.c1, g.c2, at, count); return sp ? (axis === "row" ? { ...g, r1: sp[0], r2: sp[1] } : { ...g, c1: sp[0], c2: sp[1] }) : null; }).filter((g) => g && (g.r2 > g.r1 || g.c2 > g.c1));
  m.filter = null;
  m.hidden.clear();
  layout();
  setSel(S.sel.ar, S.sel.ac, S.sel.er, S.sel.ec);
  afterChange();
  const n = Math.abs(count), what = axis === "row" ? (n > 1 ? `${n} rows` : "Row") : n > 1 ? `${n} columns` : "Column";
  toast(`${what} ${count > 0 ? "inserted" : "deleted"}. Formulas were updated.`);
}

/* ---------------- sheets (tabs) ---------------- */

function renderTabs() {
  els.tabs.innerHTML = S.wb.sheets.map((s, i) => `<button class="sheet-tab" role="tab" type="button" aria-selected="${i === S.active}" data-i="${i}" title="Double-click to rename, right-click for more">${esc(s.name)}</button>`).join("");
  refreshPages();
}
function switchSheet(i) {
  commitEdit();
  if (i === S.active || i < 0 || i >= S.wb.sheets.length) return;
  meta().view = { sel: S.sel, top: scroller.scrollTop, left: scroller.scrollLeft };
  S.active = i;
  layout();
  const v = meta().view;
  if (v) { setSel(v.sel.ar, v.sel.ac, v.sel.er, v.sel.ec); scroller.scrollTop = v.top; scroller.scrollLeft = v.left; } else { setSel(0, 0); scroller.scrollTop = 0; scroller.scrollLeft = 0; }
  renderTabs();
  render();
  renderCharts();
  refreshPanelSoon();
}
els.tabs.addEventListener("click", (e) => { const b = e.target.closest(".sheet-tab"); if (b && !b.querySelector("input")) switchSheet(+b.dataset.i); });
els.tabs.addEventListener("dblclick", (e) => { const b = e.target.closest(".sheet-tab"); if (b) renameTab(+b.dataset.i); });
els.tabs.addEventListener("contextmenu", (e) => {
  const b = e.target.closest(".sheet-tab");
  if (!b) return;
  e.preventDefault();
  const i = +b.dataset.i;
  switchSheet(i);
  showCtx(e.clientX, e.clientY, [
    { id: "rename", label: "Rename", run: () => renameTab(i) },
    { id: "dup", label: "Duplicate", run: () => duplicateSheet(i) },
    { id: "left", label: "Move left", run: () => moveSheet(i, -1) },
    { id: "right", label: "Move right", run: () => moveSheet(i, 1) },
    { id: "delete", label: "Delete sheet", run: () => deleteSheet(i) },
  ]);
});
function renameTab(i) {
  const b = els.tabs.querySelector(`[data-i="${i}"]`);
  if (!b) return;
  const s = S.wb.sheets[i];
  b.innerHTML = `<input type="text" value="${esc(s.name)}" aria-label="Sheet name" maxlength="31">`;
  const inp = b.querySelector("input");
  inp.focus(); inp.select();
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    const name = inp.value.trim();
    if (ok && name && name !== s.name) {
      const problem = S.wb.validName(name, s);
      if (problem) toast(problem);
      else { snapshot(); S.wb.renameSheet(s, name); afterChange(); }
    }
    renderTabs();
    focusGrid();
  };
  inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); });
  inp.addEventListener("blur", () => finish(true));
}
function addSheet() {
  commitEdit();
  snapshot();
  const s = S.wb.addSheet(null);
  renderTabs();
  switchSheet(S.wb.sheets.indexOf(s));
  afterChange();
}
function duplicateSheet(i) {
  snapshot();
  const src = S.wb.sheets[i], m = meta(src);
  const s = S.wb.addSheet(S.wb.uniqueName(src.name + " copy"), { rows: src.rows, cols: src.cols, index: i + 1 });
  S.wb.setCells([...src.cells.values()].map((c) => ({ sheet: s, r: c.r, c: c.c, input: c.input })));
  const n = meta(s);
  n.styles = new Map([...m.styles].map(([k, v]) => [k, { ...v }])); n.colW = new Map(m.colW); n.rowH = new Map(m.rowH);
  n.charts = m.charts.map((c) => ({ ...c, id: uid() }));
  n.comments = new Map(m.comments); n.merges = m.merges.map((g) => ({ ...g })); n.freeze = m.freeze;
  extraMetaFrom(n, extraMetaTo(m));
  renderTabs();
  switchSheet(i + 1);
  afterChange();
}
function moveSheet(i, d) {
  const j = i + d;
  if (j < 0 || j >= S.wb.sheets.length) return;
  snapshot();
  S.wb.moveSheet(i, j);
  S.active = j;
  renderTabs();
  afterChange();
}
function deleteSheet(i) {
  if (S.wb.sheets.length < 2) { toast("A workbook needs at least one sheet."); return; }
  snapshot();
  const name = S.wb.sheets[i].name;
  S.wb.removeSheet(i);
  S.active = Math.max(0, Math.min(i, S.wb.sheets.length - 1));
  layout();
  setSel(0, 0);
  renderTabs();
  render();
  afterChange();
  toast(`Deleted "${name}". Press Undo to bring it back.`);
}
els.addSheet.addEventListener("click", addSheet);

/* ---------------- sort, filter, find ---------------- */

function rowIsBold(r, c1, c2) { for (let c = c1; c <= c2; c++) if (styleAt(r, c)?.b) return true; return false; }
function sortSel(asc) {
  commitEdit();
  const { r1, c1, r2, c2 } = workRange(), s = sheet();
  if (r2 <= r1) { toast("Select the rows you want to sort (at least two)."); return; }
  const vals = valuesOf(r1, c1, r2, c2);
  const header = looksLikeHeader(vals) || (rowIsBold(r1, c1, c2) && !rowIsBold(r1 + 1, c1, c2));
  const kc = clamp(S.sel.ac, c1, c2), start = header ? r1 + 1 : r1;
  if (r2 <= start) { toast("There is only one row to sort."); return; }
  const items = [];
  for (let r = start; r <= r2; r++) {
    const inputs = [], styles = [];
    for (let c = c1; c <= c2; c++) { inputs.push(S.wb.getInput(s, r, c)); styles.push(styleAt(r, c)); }
    items.push({ r, key: plain(S.wb.getValue(s, r, kc)), inputs, styles });
  }
  const sorted = sortRows(items, (it) => it.key, asc);
  snapshot();
  const m = meta(), list = [];
  sorted.forEach((it, i) => {
    const R = start + i;
    it.inputs.forEach((input, j) => {
      const k = key(R, c1 + j);
      if (it.styles[j]) m.styles.set(k, { ...it.styles[j] }); else m.styles.delete(k);
      list.push({ r: R, c: c1 + j, input: input.startsWith("=") && R !== it.r ? shiftFormula(input, R - it.r, 0) : input });
    });
  });
  const keep = { ar: S.sel.ar, ac: S.sel.ac };
  setInputs(list, { snap: false });
  setBox(r1, c1, r2, c2, keep.ar, keep.ac);
  toast(`Sorted ${rangeName(start, c1, r2, c2)} by column ${colName(kc)}, ${asc ? "A to Z" : "Z to A"}${header ? " (heading row kept on top)" : ""}.`);
}

function applyFilter(s = sheet()) {
  const m = meta(s);
  m.hidden = new Set();
  const f = m.filter;
  if (!f) return;
  const show = new Set(f.show);
  for (let r = f.r1 + 1; r <= f.r2; r++) { const v = S.wb.getValue(s, r, f.col); const t = v === null ? "(empty)" : displayText(v, styleAt(r, f.col, s)); if (!show.has(t)) m.hidden.add(r); }
}
function showFilter() {
  commitEdit();
  const m = meta();
  const f = m.filter && S.sel.ac >= m.filter.c1 && S.sel.ac <= m.filter.c2 ? m.filter : null;
  const reg = f || workRange();
  const col = f && S.sel.ac === f.col ? f.col : clamp(S.sel.ac, reg.c1, reg.c2);
  if (reg.r2 <= reg.r1) { openSide("Filter", "filter"); els.sideBody.innerHTML = '<p class="muted">Click inside a table with a heading row first. The filter hides rows whose value you untick.</p>'; return; }
  const counts = new Map();
  for (let r = reg.r1 + 1; r <= reg.r2; r++) { const v = S.wb.getValue(sheet(), r, col); const t = v === null ? "(empty)" : displayText(v, styleAt(r, col)); counts.set(t, (counts.get(t) || 0) + 1); }
  const keys = [...counts.keys()].sort((a, b) => a.localeCompare(b, "en", { numeric: true })).slice(0, 400);
  const shown = f && f.col === col ? new Set(f.show) : null;
  const head = S.wb.getValue(sheet(), reg.r1, col);
  openSide("Filter", "filter");
  els.sideBody.innerHTML = `<p class="muted">Rows ${reg.r1 + 2}–${reg.r2 + 1}, column <b>${esc(head === null ? colName(col) : displayText(head, styleAt(reg.r1, col)))}</b>. Untick values to hide their rows.</p>
    <div class="actions"><button class="btn" type="button" id="fltAll">Tick all</button><button class="btn" type="button" id="fltNone">Untick all</button></div>
    <div class="filter-list" id="fltList">${keys.map((k, i) => `<label><input type="checkbox" value="${esc(k)}" ${!shown || shown.has(k) ? "checked" : ""} id="flt${i}"> ${esc(k)} <small>${counts.get(k)}</small></label>`).join("")}</div>
    <div class="actions"><button class="btn primary" type="button" id="fltApply">Apply filter</button><button class="btn" type="button" id="fltClear">Show all rows</button></div>`;
  const boxes = () => [...els.sideBody.querySelectorAll("#fltList input")];
  $("fltAll").onclick = () => boxes().forEach((b) => (b.checked = true));
  $("fltNone").onclick = () => boxes().forEach((b) => (b.checked = false));
  $("fltApply").onclick = () => {
    snapshot();
    m.filter = { ...reg, col, show: boxes().filter((b) => b.checked).map((b) => b.value) };
    applyFilter(); layout(); afterChange();
    toast(`${m.hidden.size} row${m.hidden.size === 1 ? "" : "s"} hidden by the filter.`);
  };
  $("fltClear").onclick = () => { snapshot(); m.filter = null; applyFilter(); layout(); afterChange(); toast("Showing all rows."); };
}

function showFind() {
  commitEdit();
  openSide("Find and replace", "find");
  els.sideBody.innerHTML = `<label class="field">Find <input type="text" id="findText" autocomplete="off"></label>
    <label class="field">Replace with <input type="text" id="replaceText" autocomplete="off"></label>
    <label class="field check"><input type="checkbox" id="findCase"> Match capital letters</label>
    <label class="field check"><input type="checkbox" id="findWhole"> Whole cell only</label>
    <label class="field check"><input type="checkbox" id="findFormulas"> Also look inside formulas</label>
    <div class="actions"><button class="btn primary" type="button" id="findNext">Find next</button><button class="btn" type="button" id="replaceOne">Replace</button><button class="btn" type="button" id="replaceAll">Replace all</button></div>
    <p class="find-status" id="findStatus" role="status"></p>`;
  const q = $("findText");
  q.focus();
  const opts = () => ({ text: q.value, cs: $("findCase").checked, whole: $("findWhole").checked, inF: $("findFormulas").checked });
  const regex = (o, g = false) => new RegExp(o.whole ? "^" + escRe(o.text) + "$" : escRe(o.text), (o.cs ? "" : "i") + (g ? "g" : ""));
  const matches = () => {
    const o = opts();
    if (!o.text) return [];
    const re = regex(o), s = sheet();
    return [...s.cells.values()].filter((cell) => re.test(cell.src ? (o.inF ? cell.input : cellText(cell.value, styleAt(cell.r, cell.c))) : cell.input)).sort((a, b) => a.r - b.r || a.c - b.c);
  };
  const status = (t) => ($("findStatus").textContent = t);
  const next = () => {
    const list = matches();
    if (!list.length) { status(q.value ? "Nothing found." : "Type something to find."); return null; }
    const { ar, ac } = S.sel;
    const i = list.findIndex((c) => c.r > ar || (c.r === ar && c.c > ac));
    const hit = list[i < 0 ? 0 : i];
    setSel(hit.r, hit.c);
    ensureVisible(hit.r, hit.c);
    status(`Found ${list.indexOf(hit) + 1} of ${list.length}.`);
    return hit;
  };
  const replaceIn = (cell, o) => cell.input.replace(regex(o, true), () => $("replaceText").value);
  $("findNext").onclick = next;
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); next(); } });
  $("replaceOne").onclick = () => {
    const o = opts(), cell = matches().find((c) => c.r === S.sel.ar && c.c === S.sel.ac);
    if (!cell) { next(); return; }
    if (cell.src && !o.inF) { status("That value comes from a formula. Tick “Also look inside formulas” to change formulas."); return; }
    setInputs([{ r: cell.r, c: cell.c, input: replaceIn(cell, o) }]);
    next();
  };
  $("replaceAll").onclick = () => {
    const o = opts(), list = matches().filter((c) => !c.src || o.inF);
    if (!list.length) { status("Nothing to replace."); return; }
    setInputs(list.map((cell) => ({ r: cell.r, c: cell.c, input: replaceIn(cell, o) })));
    status(`Replaced in ${list.length} cell${list.length > 1 ? "s" : ""}.`);
  };
}

/* ---------------- side panel ---------------- */

function openSide(title, kind) {
  S.panel = kind;
  els.sideTitle.textContent = title;
  els.side.hidden = false;
  els.side.dataset.kind = kind;
  for (const [id, k] of [["insightsBtn", "insights"], ["formulasBtn", "formulas"], ["findBtn", "find"], ["filterBtn", "filter"]]) els[id].classList.toggle("on", k === kind);
  queueRender();
}
function closeSide() {
  S.panel = null;
  els.side.hidden = true;
  for (const id of ["insightsBtn", "formulasBtn", "findBtn", "filterBtn"]) els[id].classList.remove("on");
  queueRender();
  focusGrid();
}
els.sideClose.addEventListener("click", closeSide);
let panelTimer = null;
function refreshPanelSoon() {
  clearTimeout(panelTimer);
  panelTimer = setTimeout(() => {
    if (S.panel === "insights" && S.insightsRange) safe(showInsights)(S.insightsRange);
    if (S.panel === "formulas" && S.formulasTab === "build") $("fbForm")?.dispatchEvent(new Event("input"));
  }, 400);
}

/* ---------------- Magic Insights ---------------- */

const TOTAL_ROW = /^\s*(grand\s+)?totals?\b/i;
/** Magic Insights profile of a block of cells (also used to keep charts made from it up to date). */
function insightsProfile(INS, rg, s = sheet()) {
  const rows = valuesOf(rg.r1, rg.c1, rg.r2, rg.c2, s);
  const dateCols = new Set(), colFmt = [];
  for (let j = 0; j <= rg.c2 - rg.c1; j++) {
    const fm = new Map();
    for (let r = rg.r1; r <= rg.r2; r++) { const f = styleAt(r, rg.c1 + j, s)?.fmt; if (f && typeof S.wb.getValue(s, r, rg.c1 + j) === "number") fm.set(f, (fm.get(f) || 0) + 1); }
    const top = [...fm.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    colFmt.push(top);
    if (top && isDateCode(fmtCode(top))) dateCols.add(j);
  }
  return { prof: INS.profile(rows, { dateCols, startCol: rg.c1 }), colFmt };
}
/** Charts made from an Insights summary (totals per group…) are worked out again when the cells change. */
async function refreshLiveCharts(s, m) {
  const live = m.charts.filter((c) => c.live && c.live.range);
  if (!live.length) return;
  const INS = await import("./insights.js");
  for (const ch of live) {
    const p = parseRangeName(ch.live.range);
    if (!p || (p.r2 - p.r1 + 1) * (p.c2 - p.c1 + 1) > 50000) continue;
    try {
      const { prof } = insightsProfile(INS, p, s);
      const sg = prof.suggestions.find((x) => x.title === ch.live.title && x.data);
      if (sg) ch.data = sg.data;
    } catch (e) { console.error(e); }
  }
}
async function showInsights(fixed = null) {
  commitEdit();
  const INS = await import("./insights.js");
  const s = sheet(), used = S.wb.usedRange(s);
  openSide("✦ Magic Insights", "insights");
  if (!used.rows) {
    els.sideBody.innerHTML = `<p>This sheet is empty. Type some data, open a file, or try the sample.</p><div class="actions"><button class="btn primary" type="button" id="insSample">Open the sales tracker sample</button></div>`;
    $("insSample").onclick = safe(() => newFromTemplate("sales-tracker").then(() => showInsights()));
    return;
  }
  let rg = fixed && fixed.sheet === s ? fixed : null;
  if (!rg) {
    let { r1, c1, r2, c2 } = S.sel;
    if (r1 === r2 && c1 === c2) {
      ({ r1, c1, r2, c2 } = currentRegion(r1, c1));
      if (r1 === r2 && c1 === c2 && S.wb.getValue(s, r1, c1) === null) ({ r1, c1, r2, c2 } = { r1: 0, c1: 0, r2: used.rows - 1, c2: used.cols - 1 });
    }
    r2 = Math.min(r2, used.rows - 1); c2 = Math.min(c2, used.cols - 1);
    // Leave out a "Total" row at the bottom so it is not counted twice.
    for (let c = c1; c <= c2 && r2 > r1; c++) { const v = S.wb.getValue(s, r2, c); if (v !== null) { if (typeof v === "string" && TOTAL_ROW.test(v)) r2--; break; } }
    rg = { sheet: s, r1, c1, r2, c2 };
  }
  S.insightsRange = rg;
  const { prof, colFmt } = insightsProfile(INS, rg, s);
  S.lastInsights = { prof, range: rangeName(rg.r1, rg.c1, rg.r2, rg.c2), sheet: s.name };
  const show = (j, v) => { if (v === null || v === undefined || Number.isNaN(v)) return "–"; const f = colFmt[j]; return f && f !== "percent" ? displayText(v, { fmt: f }) : f === "percent" ? displayText(v, { fmt: "percent" }) : generalText(+(+v).toPrecision(8)); };
  const stat = (j, name, label, v, raw = v) => `<div><dt>${label}</dt><dd data-stat="${name}" data-value="${raw}">${esc(show(j, v))}</dd></div>`;
  const cards = prof.columns.filter((c) => c.type !== "empty").map((c) => {
    const j = c.index;
    let body = "";
    if (c.type === "number" || c.type === "date") {
      body = `<dl>${c.type === "number" ? stat(j, "sum", "Total", c.sum) : ""}${stat(j, "mean", "Average", c.mean)}${stat(j, "median", "Middle (median)", c.median)}${stat(j, "min", "Smallest", c.min)}${stat(j, "max", "Largest", c.max)}<div><dt>Count</dt><dd data-stat="count" data-value="${c.count}">${c.count}</dd></div></dl>`;
    } else body = `<dl><div><dt>Filled</dt><dd data-stat="count" data-value="${c.count}">${c.count}</dd></div><div><dt>Empty</dt><dd data-stat="blanks" data-value="${c.blanks}">${c.blanks}</dd></div><div><dt>Different</dt><dd data-stat="distinct" data-value="${c.distinct}">${c.distinct}</dd></div></dl>`;
    const lines = INS.describe(c, (v) => show(j, v));
    const trend = c.trend === "up" ? '<span class="trend-up">▲ going up</span>' : c.trend === "down" ? '<span class="trend-down">▼ going down</span>' : "";
    return `<div class="stat-card" data-col="${esc(c.name)}" data-type="${c.type}"><h4><span>${esc(c.name)}</span><small>${c.type}</small></h4>${trend}${body}${lines.length ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}</div>`;
  }).join("");
  const sugg = prof.suggestions.map((sg, i) => `<div class="suggest"><div><b>${esc(sg.title)}</b>${esc(sg.why)} <span class="muted">(${sg.kind})</span></div><button class="btn" type="button" data-sug="${i}">Insert chart</button></div>`).join("");
  els.sideBody.innerHTML = `<p class="muted">Looked at <b>${S.lastInsights.range}</b>: ${prof.rows} row${prof.rows === 1 ? "" : "s"}${prof.header ? " under a heading row" : ""}. Select other cells and press Insights again to change this.</p>
    ${cards || '<p class="muted">No data found in these cells.</p>'}
    ${sugg ? `<h3>Chart ideas</h3>${sugg}<p class="muted" id="insLiveNote">Charts you add from here stay linked to these cells: they update by themselves when the numbers change.</p>` : ""}
    <div class="ai-line" id="aiSummary">${aiReady() ? '<button class="btn primary" type="button" id="aiSumBtn">✦ Write a short summary with AI</button><div id="aiSumOut"></div>' : "<b>AI summary:</b> coming soon. Everything above was worked out on this device; nothing was sent anywhere."}</div>`;
  els.sideBody.querySelectorAll("[data-sug]").forEach((b) => (b.onclick = safe(() => {
    const sg = prof.suggestions[+b.dataset.sug];
    if (sg.data) insertChart({ data: sg.data, kind: sg.kind, title: sg.title, near: rg, live: { range: rangeName(rg.r1, rg.c1, rg.r2, rg.c2), title: sg.title } });
    else {
      const cols = [sg.labelCol ?? null, ...sg.valueCols].filter((x) => x !== null).map((j) => rg.c1 + j);
      const contiguous = cols.every((c, i) => !i || c === cols[i - 1] + 1);
      if (sg.labelCol === null) insertChart({ cols, r1: rg.r1, r2: rg.r2, kind: sg.kind, title: sg.title, near: rg, noLabels: true });
      else if (contiguous) insertChart({ range: rangeName(rg.r1, cols[0], rg.r2, cols[cols.length - 1]), kind: sg.kind, title: sg.title, near: rg });
      else insertChart({ cols, r1: rg.r1, r2: rg.r2, kind: sg.kind, title: sg.title, near: rg });
    }
  })));
  const btn = $("aiSumBtn");
  if (btn) btn.onclick = async () => {
    const out = $("aiSumOut");
    btn.disabled = true; out.textContent = "Writing…";
    try {
      const data = await onlineAi("/sheets/insights", { range: S.lastInsights.range, rows: prof.rows, columns: prof.columns.map((c) => ({ name: c.name, type: c.type, count: c.count, blanks: c.blanks, sum: c.sum, mean: c.mean, median: c.median, min: c.min, max: c.max, trend: c.trend, outliers: c.outliers?.map((o) => o.value), top: c.top })) }, "AI summary");
      out.textContent = data?.summary || data?.text || "No summary came back.";
    } catch (e) { out.textContent = e.message; }
    btn.disabled = false;
  };
}

/* ---------------- Magic Formulas ---------------- */

async function showFormulas(tab = S.formulasTab || "find") {
  commitEdit();
  await loadCatalog();
  openSide("ƒ Magic Formulas", "formulas");
  S.formulasTab = tab;
  const tabs = [["find", "Find"], ["build", "Build"], ["explain", "Explain"], ["ai", "From words"]];
  els.sideBody.innerHTML = `<div class="ad-tabs pill-tabs" role="tablist">${tabs.map(([id, l]) => `<button type="button" role="tab" data-ftab="${id}" class="${id === tab ? "on" : ""}" aria-selected="${id === tab}">${l}</button>`).join("")}</div><div id="ftabBody"></div>`;
  els.sideBody.querySelectorAll("[data-ftab]").forEach((b) => (b.onclick = safe(() => showFormulas(b.dataset.ftab))));
  const body = $("ftabBody");
  if (tab === "find") {
    body.innerHTML = `<label class="field">Search functions <input type="text" id="fnSearch" placeholder="e.g. lookup, average with a condition, days" autocomplete="off"></label><ul class="fn-list" id="fnList"></ul>`;
    const list = $("fnList"), q = $("fnSearch");
    const draw = () => {
      const found = CAT.searchFunctions(q.value).slice(0, 40);
      list.innerHTML = found.map((f) => `<li><div><b>${f.name}</b> · ${esc(f.desc)}<br><code>${esc(f.syntax)}</code><br><small class="muted">Example: <code>${esc(f.example)}</code></small></div><button class="btn" type="button" data-use="${f.name}">Use</button></li>`).join("") || '<li class="muted">No function matches. Try other words.</li>';
    };
    q.addEventListener("input", draw);
    list.addEventListener("click", (e) => { const b = e.target.closest("[data-use]"); if (b) useFunction(b.dataset.use); });
    draw();
    q.focus();
  } else if (tab === "build") buildTab(body);
  else if (tab === "explain") {
    body.innerHTML = `<p class="muted">Select a cell with a formula, or paste one here.</p><label class="field">Formula <textarea id="exText" spellcheck="false"></textarea></label><div class="actions"><button class="btn primary" type="button" id="exBtn">Explain</button></div><div id="exOut" class="preview" aria-live="polite"></div>`;
    $("exBtn").onclick = () => explainInto($("exText").value);
    refreshExplain(true);
  } else {
    wordsTab(body);
    if (!aiReady()) return;
    body.insertAdjacentHTML("beforeend", `<h3>Ask AsaanDesk AI</h3><label class="field">Anything else? <textarea id="aiAsk" placeholder="e.g. total of column C where column B is Lahore"></textarea></label><div class="actions"><button class="btn primary" type="button" id="aiAskBtn">✦ Write the formula with AI</button></div><div id="aiAskOut" class="preview"></div>`);
    $("aiAskBtn").onclick = async () => {
      const out = $("aiAskOut"), reg = workRange();
      out.textContent = "Thinking…";
      try {
        const head = valuesOf(reg.r1, reg.c1, reg.r1, reg.c2)[0].map((v, j) => `${colName(reg.c1 + j)}: ${v === null ? "" : plain(v)}`);
        const data = await onlineAi("/sheets/formula", { prompt: $("aiAsk").value, columns: head, range: rangeName(reg.r1, reg.c1, reg.r2, reg.c2), cell: cellName(S.sel.ar, S.sel.ac) }, "AI formulas");
        const f = String(data?.formula || "").trim();
        if (!f.startsWith("=")) { out.textContent = data?.text || "No formula came back."; return; }
        out.innerHTML = `<code>${esc(f)}</code> <button class="btn" type="button" id="aiUse">Put in ${cellName(S.sel.ar, S.sel.ac)}</button>`;
        $("aiUse").onclick = () => setInputs([{ r: S.sel.ar, c: S.sel.ac, input: f }]);
      } catch (e) { out.textContent = e.message; }
    };
  }
}
/** Formulas from plain words: rules on this device for common requests (honestly labelled; AI is separate). */
function wordsCtx() {
  const s = sheet(), used = S.wb.usedRange(s);
  let rg = workRange();
  if (rg.r1 === rg.r2 && rg.c1 === rg.c2 && S.wb.getValue(s, rg.r1, rg.c1) === null && used.rows) rg = { r1: 0, c1: 0, r2: used.rows - 1, c2: used.cols - 1 };
  const columns = [], values = {};
  for (let c = rg.c1; c <= rg.c2; c++) {
    const h = S.wb.getValue(s, rg.r1, c), letter = colName(c);
    columns.push({ name: h === null ? "" : String(cellText(h, styleAt(rg.r1, c))), letter });
    const set = new Set();
    for (let r = rg.r1 + 1; r <= Math.min(rg.r2, rg.r1 + 2000); r++) { const v = S.wb.getValue(s, r, c); if (typeof v === "string" && v.length < 60) set.add(v.toLowerCase()); }
    values[letter] = set;
  }
  return { rg, ctx: { columns, values, r1: rg.r1 + 2, r2: rg.r2 + 1 } };
}
function wordsTab(body) {
  const { rg, ctx } = wordsCtx(), names = ctx.columns.filter((c) => c.name).map((c) => `${c.name} (${c.letter})`);
  const target = S.wb.getInput(sheet(), S.sel.ar, S.sel.ac) === "" && (S.sel.ar > rg.r2 || S.sel.ac > rg.c2) ? cellName(S.sel.ar, S.sel.ac) : cellName(Math.min(rg.r2 + 2, G.rows - 1), rg.c1);
  body.innerHTML = `<p class="muted" id="wfHonest">Type what you want in plain words. This works <b>on this device</b> for common requests: sum, average, count, highest, lowest, share and look up, with “where …” conditions. It follows simple rules and is not AI; understanding any sentence with AsaanDesk AI is <b>coming soon</b>.</p>
    <label class="field">What do you want to work out? <textarea id="wfAsk" placeholder="e.g. sum of Sales where City is Lahore"></textarea></label>
    <div class="actions"><button class="btn primary" type="button" id="wfGo">Make the formula</button></div>
    <div class="preview" id="wfOut" aria-live="polite">${names.length ? "Columns in this table: " + esc(names.join(", ")) : "Click inside a table with a heading row first."}</div>
    <label class="field">Put the formula in cell <input type="text" id="wf-target" value="${target}"></label>
    <div class="actions"><button class="btn" type="button" id="wfUse" disabled>Insert formula</button></div>
    <p class="muted">Try: “average of Sales where City is Karachi”, “how many rows where Status is Unpaid”, “highest Sales”, “look up Sales for Ali”.</p>`;
  let made = null;
  const go = () => {
    const out = $("wfOut"), r = CAT.wordsToFormula($("wfAsk").value, ctx);
    made = r.formula ? r : null;
    $("wfUse").disabled = !made;
    if (!made) { out.innerHTML = `<span class="bad">${esc(r.problem)}</span>`; return; }
    const tgt = parseCellName($("wf-target").value);
    const v = S.wb.evaluate(made.formula, sheet(), tgt ? { row: tgt.row, col: tgt.col } : undefined);
    out.innerHTML = `Formula: <code id="wfFormula">${esc(made.formula)}</code><br>${esc(made.how)}<br>Result now: <b id="wfResult">${esc(cellText(v, made.fmt ? { fmt: made.fmt } : null))}</b>`;
  };
  $("wfGo").onclick = go;
  $("wfAsk").addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } });
  $("wfUse").onclick = () => {
    const tgt = parseCellName($("wf-target").value);
    if (!made || !tgt) { toast("Type a cell like B7 for where to put it."); return; }
    snapshot();
    if (made.fmt) { const m = meta(), k = key(tgt.row, tgt.col); m.styles.set(k, { ...(m.styles.get(k) || {}), fmt: made.fmt }); }
    setInputs([{ r: tgt.row, c: tgt.col, input: made.formula }], { snap: false });
    setSel(tgt.row, tgt.col); ensureVisible(tgt.row, tgt.col);
    toast(`Formula added to ${cellName(tgt.row, tgt.col)}.`);
  };
}
function useFunction(name) {
  if (S.edit) { const el = editorEl(), p = el.selectionStart; el.value = el.value.slice(0, p) + name + "(" + el.value.slice(el.selectionEnd); el.setSelectionRange(p + name.length + 1, p + name.length + 1); el.focus(); return; }
  beginEdit("edit", "=" + name + "(");
}
function refreshExplain(force = false) {
  const el = $("exText");
  if (!el) return;
  const input = inputFor(S.sel.ar, S.sel.ac);
  if (input.startsWith("=") || force) { if (input.startsWith("=")) el.value = input; if (el.value) explainInto(el.value); }
}
function explainInto(text) {
  const out = $("exOut");
  if (!out || !CAT) return;
  const e = CAT.explainFormula(text);
  out.innerHTML = `<p>${esc(e.summary)}</p>${e.functions.length ? `<ul>${e.functions.map((f) => `<li><b>${f.name}</b>: ${esc(f.desc)} <code>${esc(f.syntax)}</code></li>`).join("")}</ul>` : ""}`;
}
function buildTab(body) {
  const sel = S.sel, multi = sel.r1 !== sel.r2 || sel.c1 !== sel.c2;
  const selRange = multi ? rangeName(sel.r1, sel.c1, sel.r2, sel.c2) : "";
  const target = multi ? cellName(Math.min(sel.r2 + 1, G.rows - 1), sel.c1) : cellName(sel.ar, sel.ac);
  const opSel = (id) => `<select id="${id}">${CAT.OPS.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join("")}</select>`;
  body.innerHTML = `<form id="fbForm" autocomplete="off" onsubmit="return false">
    <label class="field">What do you want to do? <select id="fbTask">${CAT.BUILDER_TASKS.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join("")}</select></label>
    <div id="fbFields"></div>
    <label class="field">Put the formula in cell <input type="text" id="fb-target" value="${target}"></label>
    <div class="preview" id="fbPreview" aria-live="polite"></div>
    <div class="actions"><button class="btn primary" type="button" id="fbInsert">Insert formula</button></div></form>`;
  const fields = $("fbFields");
  const drawFields = () => {
    const task = CAT.BUILDER_TASKS.find((t) => t.id === $("fbTask").value);
    fields.innerHTML = task.fields.map((f) => {
      if (f.type === "op") return `<label class="field">Condition ${opSel("fb-op")}</label>`;
      if (f.type === "check") return `<label class="field check"><input type="checkbox" id="fb-${f.key}"> ${esc(f.label)}</label>`;
      if (f.type === "rules") return [0, 1, 2].map((i) => `<div class="row2" data-rule="${i}" ${i ? "hidden" : ""}><label class="field">${i ? "Or if it" : "If it"} ${opSel(`fb-rop${i}`)}</label><label class="field">Value <input type="text" id="fb-rval${i}"></label><label class="field">Show <input type="text" id="fb-rres${i}"></label></div>`).join("") + '<div class="actions"><button class="btn" type="button" id="fbMoreRule">+ Another rule</button></div>';
      const pre = f.type === "range" ? selRange : f.type === "cell" ? (multi ? cellName(sel.r1, sel.c1) : "") : f.value || "";
      return `<label class="field">${esc(f.label)} <input type="text" id="fb-${f.key}" value="${esc(pre)}" placeholder="${f.type === "range" ? "e.g. B2:B20" : f.type === "cell" ? "e.g. B2" : ""}"></label>`;
    }).join("");
    const more = $("fbMoreRule");
    if (more) more.onclick = () => { const hidden = fields.querySelector("[data-rule][hidden]"); if (hidden) hidden.hidden = false; if (!fields.querySelector("[data-rule][hidden]")) more.hidden = true; };
    preview();
  };
  const collect = () => {
    const task = $("fbTask").value, f = {};
    for (const el of fields.querySelectorAll("[id^=fb-]")) f[el.id.slice(3)] = el.type === "checkbox" ? el.checked : el.value;
    if (task === "ifrules") f.rules = [0, 1, 2].filter((i) => !fields.querySelector(`[data-rule="${i}"]`).hidden).map((i) => ({ op: f["rop" + i], value: f["rval" + i], result: f["rres" + i] }));
    return { task, f };
  };
  const preview = () => {
    const { task, f } = collect(), out = CAT.buildFormula(task, f), pv = $("fbPreview");
    const tgt = parseCellName($("fb-target").value);
    $("fbInsert").disabled = !out.formula || !tgt;
    if (!out.formula) { pv.innerHTML = `<span class="bad">${esc(out.problem)}</span>`; return out; }
    const v = S.wb.evaluate(out.formula, sheet(), tgt ? { row: tgt.row, col: tgt.col } : undefined);
    pv.innerHTML = `Formula: <code id="fbFormula">${esc(out.formula)}</code><br>Result now: <b id="fbResult">${esc(cellText(v, out.fmt ? { fmt: out.fmt } : null))}</b>${tgt ? "" : '<br><span class="bad">Type a cell like B7 for where to put it.</span>'}`;
    return out;
  };
  $("fbTask").onchange = drawFields;
  $("fbForm").addEventListener("input", preview);
  $("fbForm").addEventListener("change", preview);
  $("fbInsert").onclick = () => {
    const out = preview(), tgt = parseCellName($("fb-target").value);
    if (!out.formula || !tgt) return;
    snapshot();
    if (out.fmt) { const m = meta(), k = key(tgt.row, tgt.col); const st = { ...(m.styles.get(k) || {}) }; if (out.fmt === "general") delete st.fmt; else st.fmt = out.fmt; if (Object.keys(st).length) m.styles.set(k, st); else m.styles.delete(k); }
    setInputs([{ r: tgt.row, c: tgt.col, input: out.formula }], { snap: false });
    setSel(tgt.row, tgt.col);
    ensureVisible(tgt.row, tgt.col);
    toast(`Formula added to ${cellName(tgt.row, tgt.col)}.`);
  };
  drawFields();
}

/* ---------------- charts ---------------- */

let chartLibP = null;
function loadScript(src) {
  return new Promise((res, rej) => { const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = () => rej(new Error("Could not load " + src)); document.head.appendChild(el); });
}
function loadCharts() {
  if (!chartLibP) {
    chartLibP = (async () => {
      // vector.js shares code with the PDF editor, which expects pdf-lib on the page.
      if (!window.PDFLib) await loadScript("/pdf-editor/lib/pdf-lib.min.js");
      import("../shared/brand.js").then((b) => { b.ensureFont("sans"); b.ensureFont("sans", true); }).catch(() => {});
      const [charts, vector] = await Promise.all([import("/pdf-editor/charts.js"), import("/pdf-editor/vector.js")]);
      return { chartPrims: charts.chartPrims, primsToSvg: vector.primsToSvg, PALETTE: charts.PALETTE || [] };
    })();
    chartLibP.catch(() => { chartLibP = null; });
  }
  return chartLibP;
}
function chartSource(ch, s) {
  if (ch.data) return ch.data;
  let rows;
  if (ch.cols) {
    rows = [];
    for (let r = ch.r1; r <= ch.r2; r++) rows.push(ch.cols.map((c, j) => { const v = S.wb.getValue(s, r, c); return j === 0 && !ch.noLabels && v !== null && r > ch.r1 ? displayText(v, styleAt(r, c, s)) : v; }));
    if (ch.noLabels) rows = rows.map((r, i) => [i === 0 ? "" : String(i), ...r]);
  } else {
    const p = parseRangeName(ch.range || "");
    if (!p) return { labels: [], series: [] };
    rows = valuesOf(p.r1, p.c1, p.r2, p.c2, s);
    if (p.c2 > p.c1) rows = rows.map((row, i) => row.map((v, j) => (j === 0 && v !== null && (i > 0 || typeof v === "number") ? displayText(v, styleAt(p.r1 + i, p.c1, s)) : v)));
  }
  return chartData(rows);
}
function chartSvg(lib, ch, s, w, h, withTitle) {
  const d = chartSource(ch, s);
  if (!d.labels.length || !d.series.length) return null;
  const pal = CHART_PALETTES[ch.palette || 0] || CHART_PALETTES[0];
  if (EXTRA_KINDS[ch.kind]) return extraChartSvg(d, ch, w, h, withTitle ? ch.title : "", pal);
  const values = ch.values ?? (ch.kind === "bar" && d.labels.length * d.series.length <= 14);
  const spec = { kind: ch.kind, title: withTitle ? ch.title : "", labels: d.labels, series: d.series, showValues: values ? true : undefined };
  let svg = lib.primsToSvg(lib.chartPrims(spec, w, h), w, h);
  // Colour themes: swap the engine's colours for the chosen palette.
  if (ch.palette) (lib.PALETTE || []).forEach((c, i) => { if (pal[i]) svg = svg.split(c).join(pal[i]).split(c.toUpperCase()).join(pal[i]); });
  if (ch.legend === false) svg = svg.replace(/<g[^>]*data-legend[^>]*>[\s\S]*?<\/g>/g, "");
  return svg;
}
const CHART_PALETTES = [
  ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#2f80ff", "#a64bf4"],
  ["#0f766e", "#14b8a6", "#5eead4", "#0e7490", "#134e4a", "#99f6e4", "#2dd4bf", "#115e59"],
  ["#be123c", "#fb7185", "#f59e0b", "#fbbf24", "#9f1239", "#fda4af", "#ea580c", "#fecdd3"],
  ["#1e3a8a", "#2563eb", "#60a5fa", "#0ea5e9", "#1d4ed8", "#93c5fd", "#0369a1", "#38bdf8"],
];
const PALETTE_NAMES = ["Bright", "Teal", "Rose", "Ocean"];
const EXTRA_KINDS = { hbar: "Horizontal bar", area: "Area", stacked: "Stacked columns", scatter: "Scatter" };
const svgEsc = (t) => String(t ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const shortNum = (v) => { const a = Math.abs(v); return a >= 1e9 ? +(v / 1e9).toFixed(1) + "B" : a >= 1e6 ? +(v / 1e6).toFixed(1) + "M" : a >= 1e3 ? +(v / 1e3).toFixed(1) + "K" : String(+v.toFixed(2)); };
/** Our own drawings for horizontal bars, area, stacked columns and scatter charts (SVG). */
function extraChartSvg(d, ch, w, h, title, pal) {
  const kind = ch.kind, S2 = d.series, L = d.labels, n = L.length, legend = ch.legend !== false && (S2.length > 1 || kind === "scatter");
  const font = 'font-family="system-ui,-apple-system,Segoe UI,sans-serif"', out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`];
  let top = 10;
  if (title) { out.push(`<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#1b2133" ${font}>${svgEsc(title)}</text>`); top = 32; }
  const bottom = h - (legend ? 26 : 8) - (kind === "hbar" ? 18 : 20);
  const lab = (t, max = 12) => { const s = String(t ?? ""); return s.length > max ? s.slice(0, max - 1) + "…" : s; };
  if (legend) S2.forEach((s, i) => { const x = 12 + i * Math.min(140, (w - 24) / S2.length); out.push(`<rect x="${x}" y="${h - 18}" width="10" height="10" rx="2" fill="${pal[i % pal.length]}"/><text x="${x + 14}" y="${h - 9}" font-size="11" fill="#475569" ${font}>${svgEsc(lab(s.name, 16))}</text>`); });
  const showV = ch.values ?? n * S2.length <= 14;
  if (kind === "hbar") {
    const left = Math.min(130, 16 + Math.max(...L.map((t) => lab(t, 16).length)) * 6.5), right = w - 30, max = niceMax(Math.max(0, ...S2.flatMap((s) => s.values)));
    const slot = (bottom + 12 - top) / Math.max(1, n), bh = Math.max(3, (slot * 0.7) / S2.length);
    for (let k = 0; k <= 4; k++) { const x = left + ((right - left) * k) / 4; out.push(`<line x1="${x}" x2="${x}" y1="${top}" y2="${bottom + 12}" stroke="#e5e7eb"/><text x="${x}" y="${bottom + 26}" text-anchor="middle" font-size="10" fill="#64748b" ${font}>${shortNum((max * k) / 4)}</text>`); }
    L.forEach((t, i) => {
      const y0 = top + i * slot + slot * 0.15;
      out.push(`<text x="${left - 6}" y="${y0 + (bh * S2.length) / 2 + 4}" text-anchor="end" font-size="11" fill="#334155" ${font}>${svgEsc(lab(t, 16))}</text>`);
      S2.forEach((s, j) => { const v = Math.max(0, s.values[i] || 0), bw = ((right - left) * v) / max; out.push(`<rect x="${left}" y="${y0 + j * bh}" width="${bw}" height="${bh - 1}" rx="2" fill="${pal[j % pal.length]}"/>`); if (showV) out.push(`<text x="${left + bw + 4}" y="${y0 + j * bh + bh - 2}" font-size="10" fill="#334155" ${font}>${shortNum(v)}</text>`); });
    });
  } else if (kind === "scatter") {
    const xs = S2[0].values, ys = (S2[1] || S2[0]).values, left = 46, right = w - 14;
    const xmax = niceMax(Math.max(0, ...xs)), ymax = niceMax(Math.max(0, ...ys));
    for (let k = 0; k <= 4; k++) { const y = bottom - ((bottom - top) * k) / 4, x = left + ((right - left) * k) / 4; out.push(`<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b" ${font}>${shortNum((ymax * k) / 4)}</text><text x="${x}" y="${bottom + 16}" text-anchor="middle" font-size="10" fill="#64748b" ${font}>${shortNum((xmax * k) / 4)}</text>`); }
    xs.forEach((xv, i) => { const cx = left + ((right - left) * Math.max(0, xv)) / xmax, cy = bottom - ((bottom - top) * Math.max(0, ys[i] || 0)) / ymax; out.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="${pal[0]}" fill-opacity=".8"><title>${svgEsc(L[i])}</title></circle>`); });
  } else {
    const left = 46, right = w - 12, stacked = kind === "stacked";
    const tops = L.map((_, i) => (stacked ? S2.reduce((a, s) => a + Math.max(0, s.values[i] || 0), 0) : Math.max(0, ...S2.map((s) => s.values[i] || 0))));
    const max = niceMax(Math.max(0, ...tops)), Y = (v) => bottom - ((bottom - top) * v) / max;
    for (let k = 0; k <= 4; k++) { const y = Y((max * k) / 4); out.push(`<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b" ${font}>${shortNum((max * k) / 4)}</text>`); }
    const slot = (right - left) / Math.max(1, n), every = Math.ceil(n / Math.max(1, Math.floor((right - left) / 46)));
    L.forEach((t, i) => { if (i % every === 0) out.push(`<text x="${left + slot * (i + 0.5)}" y="${bottom + 15}" text-anchor="middle" font-size="10.5" fill="#334155" ${font}>${svgEsc(lab(t, 9))}</text>`); });
    if (stacked) L.forEach((_, i) => { let acc = 0; S2.forEach((s, j) => { const v = Math.max(0, s.values[i] || 0), y1 = Y(acc), y2 = Y(acc + v); out.push(`<rect x="${left + slot * i + slot * 0.18}" y="${y2}" width="${slot * 0.64}" height="${Math.max(0, y1 - y2)}" fill="${pal[j % pal.length]}"/>`); acc += v; }); if (showV) out.push(`<text x="${left + slot * (i + 0.5)}" y="${Y(acc) - 4}" text-anchor="middle" font-size="10" fill="#334155" ${font}>${shortNum(acc)}</text>`); });
    else S2.forEach((s, j) => {
      const pts = s.values.map((v, i) => [left + slot * (i + 0.5), Y(Math.max(0, v || 0))]);
      out.push(`<path d="M${pts[0][0]} ${bottom}L${pts.map((p) => p.join(" ")).join("L")}L${pts[pts.length - 1][0]} ${bottom}Z" fill="${pal[j % pal.length]}" fill-opacity="${S2.length > 1 ? 0.35 : 0.5}"/><polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${pal[j % pal.length]}" stroke-width="2"/>`);
      if (showV) pts.forEach((p, i) => out.push(`<text x="${p[0]}" y="${p[1] - 5}" text-anchor="middle" font-size="10" fill="#334155" ${font}>${shortNum(s.values[i] || 0)}</text>`));
    });
    out.push(`<line x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}" stroke="#94a3b8"/>`);
  }
  out.push("</svg>");
  return out.join("");
}
/** Magic Charts: picks the chart that fits the data (months or dates → line, a few parts of a whole → donut, long names → horizontal bars, otherwise columns). */
function pickChartKind(d) {
  const n = d.labels.length, one = d.series.length === 1, all = d.series.flatMap((s) => s.values);
  const timeLike = d.labels.filter((t) => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|^(q[1-4]|week|day|\d{4}-\d\d|\d{1,2} [a-z]{3})/i.test(String(t))).length >= Math.max(3, n * 0.6);
  if (timeLike && n >= 4) return d.series.length > 1 ? "line" : "area";
  if (one && n >= 2 && n <= 6 && all.every((v) => v >= 0)) return "donut";
  if (d.labels.some((t) => String(t).length > 14) || n > 12) return "hbar";
  return d.series.length > 2 ? "stacked" : "bar";
}
function renderCharts() { return drawCharts().catch((e) => console.error(e)); }
async function drawCharts() {
  const s = sheet(), m = meta(s);
  const want = new Set(m.charts.map((c) => c.id));
  for (const el of [...els.chartLayer.children]) if (!want.has(el.dataset.id)) el.remove();
  if (!m.charts.length) return;
  await refreshLiveCharts(s, m);
  let lib;
  try { lib = await loadCharts(); } catch {
    for (const ch of m.charts) { const el = chartEl(ch); el.querySelector(".chart-body").innerHTML = '<div class="msg">The chart drawing tools could not load. Check your internet connection and try again.</div>'; }
    return;
  }
  if (sheet() !== s) return;
  for (const ch of m.charts) {
    if (ch.x === undefined) {
      const p = parseCellName(ch.at || "") || { row: 0, col: Math.min(G.cols - 1, 6) };
      ch.x = Math.round(G.colX[clamp(p.col, 0, G.cols)] / Z); ch.y = Math.round(G.rowY[clamp(p.row, 0, G.rows)] / Z);
    }
    const el = chartEl(ch);
    Object.assign(el.style, { left: ch.x + "px", top: ch.y + "px", width: ch.w + "px", height: ch.h + "px" });
    el.setAttribute("aria-label", `${ch.kind} chart: ${ch.title || "untitled"}`);
    const title = el.querySelector(".chart-title");
    if (document.activeElement !== title) title.value = ch.title || "";
    el.querySelector(".chart-kind").value = ch.kind;
    if (ch.kind === "image") { const body = el.querySelector(".chart-body"); if (!body.querySelector("img")) body.innerHTML = `<img alt="${esc(ch.title || "Picture")}" src="${esc(ch.src || "")}">`; continue; }
    let svg = null;
    try { svg = chartSvg(lib, ch, s, Math.max(60, ch.w - 2), Math.max(60, ch.h - BAR_H - 2), false); } catch (e) { console.error(e); }
    el.querySelector(".chart-body").innerHTML = svg || '<div class="msg">No numbers to draw here. Select labels and numbers, then insert the chart again.</div>';
  }
}
function chartEl(ch) {
  let el = els.chartLayer.querySelector(`[data-id="${ch.id}"]`);
  if (el) return el;
  el = document.createElement("div");
  el.className = "chart";
  el.dataset.id = ch.id;
  el.setAttribute("role", "figure");
  el.tabIndex = 0;
  el.innerHTML = ch.kind === "image"
    ? `<div class="chart-bar" title="Drag to move"><input class="chart-title" type="text" aria-label="Picture name" placeholder="Picture"><select class="chart-kind" hidden aria-hidden="true"><option value="image">Picture</option></select><button type="button" data-cact="del" aria-label="Delete picture" title="Delete picture">✕</button></div><div class="chart-body pic"></div><div class="chart-resize" title="Drag to resize"></div>`
    : `<div class="chart-bar" title="Drag to move"><input class="chart-title" type="text" aria-label="Chart title" placeholder="Chart title"><select class="chart-kind" aria-label="Chart type"><option value="bar">Columns</option><option value="hbar">Horizontal bar</option><option value="stacked">Stacked columns</option><option value="line">Line</option><option value="area">Area</option><option value="pie">Pie</option><option value="donut">Donut</option><option value="scatter">Scatter</option></select><button type="button" data-cact="opts" title="Chart options: legend, values, colours" aria-label="Chart options">⋯</button><button type="button" data-cact="svg" title="Download as SVG">SVG</button><button type="button" data-cact="png" title="Download as PNG picture">PNG</button><button type="button" data-cact="del" aria-label="Delete chart" title="Delete chart">✕</button></div><div class="chart-body"></div><div class="chart-resize" title="Drag to resize"></div>`;
  els.chartLayer.appendChild(el);
  const find = () => meta().charts.find((c) => c.id === ch.id);
  el.querySelector(".chart-kind").addEventListener("change", (e) => { const c = find(); if (!c) return; snapshot(); c.kind = e.target.value; renderCharts(); scheduleSave(); });
  el.querySelector(".chart-title").addEventListener("change", (e) => { const c = find(); if (!c) return; snapshot(); c.title = e.target.value; scheduleSave(); });
  el.querySelector(".chart-title").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); e.stopPropagation(); });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cact]");
    if (!b) return;
    const c = find();
    if (!c) return;
    if (b.dataset.cact === "del") { snapshot(); meta().charts = meta().charts.filter((x) => x.id !== c.id); renderCharts(); scheduleSave(); toast("Chart deleted."); }
    else if (b.dataset.cact === "opts") chartOptions(c, b);
    else safe(downloadChart)(c, b.dataset.cact);
  });
  el.addEventListener("keydown", (e) => { if ((e.key === "Delete" || e.key === "Backspace") && e.target === el) { e.preventDefault(); el.querySelector('[data-cact="del"]').click(); } });
  const startDrag = (e, mode) => {
    if (e.button !== 0) return;
    const c = find();
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    const p0 = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y, w: c.w, h: c.h };
    let moved = false;
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    const mv = (ev) => {
      const dx = (ev.clientX - p0.x) / Z, dy = (ev.clientY - p0.y) / Z;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) { snapshot(); moved = true; }
      if (mode === "move") { c.x = Math.max(0, Math.round(p0.cx + dx)); c.y = Math.max(0, Math.round(p0.cy + dy)); el.style.left = c.x + "px"; el.style.top = c.y + "px"; }
      else { c.w = Math.max(220, Math.round(p0.w + dx)); c.h = Math.max(170, Math.round(p0.h + dy)); el.style.width = c.w + "px"; el.style.height = c.h + "px"; }
    };
    const up = () => { target.removeEventListener("pointermove", mv); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", up); if (moved) { if (mode === "size") renderCharts(); scheduleSave(); } };
    target.addEventListener("pointermove", mv);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };
  el.querySelector(".chart-bar").addEventListener("pointerdown", (e) => { if (!e.target.closest("input, select, button")) startDrag(e, "move"); });
  el.querySelector(".chart-resize").addEventListener("pointerdown", (e) => startDrag(e, "size"));
  return el;
}
async function insertChart(opts = {}) {
  commitEdit();
  if (S.mode !== "edit") { toast("You are viewing. Choose Editing at the top to change cells."); return; }
  const s = sheet();
  let near = opts.near || null, range = opts.range || null;
  if (!opts.data && !opts.cols && !range) {
    const rg = workRange();
    if (rg.r1 === rg.r2 && rg.c1 === rg.c2 && S.wb.getValue(s, rg.r1, rg.c1) === null) { toast("Select the cells with your labels and numbers first."); return; }
    range = rangeName(rg.r1, rg.c1, rg.r2, rg.c2);
    near = rg;
  }
  const ch = { id: uid(), kind: opts.kind || "bar", title: opts.title || "", w: 440, h: 280 };
  if (opts.live) ch.live = { ...opts.live };
  if (opts.data) ch.data = opts.data; else if (opts.cols) Object.assign(ch, { cols: opts.cols, r1: opts.r1, r2: opts.r2, noLabels: !!opts.noLabels }); else ch.range = range;
  if (!ch.title) { const d = chartSource(ch, s); ch.title = d.series.length && d.series[0].name !== "Value" ? d.series.map((x) => x.name).join(", ") : "Chart"; }
  const rg = near || { r1: S.sel.r1, c2: S.sel.c2 };
  // Put the chart to the right of anything already used in the rows it will cover, so it hides no data.
  let after = rg.c2 + 1;
  const rowsCovered = Math.ceil((ch.h * Z) / (DEF_H * Z)) + 1, m0 = meta(s);
  for (const cell of s.cells.values()) if (cell.r >= rg.r1 && cell.r <= rg.r1 + rowsCovered && cell.c >= after) after = cell.c + 1;
  for (const k of m0.images.keys()) { const [r, c] = unkey(k); if (r >= rg.r1 && r <= rg.r1 + rowsCovered && c >= after) after = c + 1; }
  ch.x = Math.round(Math.max(0, Math.min(G.colX[Math.min(G.cols, after)] + 24, G.colX[G.cols] - ch.w * Z - 8)) / Z);
  ch.y = Math.round(G.rowY[rg.r1] / Z);
  snapshot();
  meta().charts.push(ch);
  await renderCharts();
  const vx = ch.x * Z, vw = ch.w * Z;
  scroller.scrollLeft = Math.max(0, Math.min(scroller.scrollLeft, vx - 20)) || scroller.scrollLeft;
  if (vx + vw > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = vx + vw - scroller.clientWidth + 20;
  afterChange();
  toast("Chart added. Drag its top bar to move it and the corner to resize. It updates when the numbers change.");
}
async function downloadChart(ch, type) {
  const lib = await loadCharts();
  const w = Math.max(320, ch.w), h = Math.max(220, ch.h - BAR_H + 30);
  let svg = chartSvg(lib, ch, sheet(), w, h, true);
  if (!svg) { toast("This chart has no numbers to save."); return; }
  svg = svg.replace(/^<svg([^>]*)>/, `<svg$1><rect width="${w}" height="${h}" fill="#ffffff"/>`);
  const base = (ch.title || "chart").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "chart";
  if (type === "svg") { download(new Blob([svg], { type: "image/svg+xml" }), base + ".svg"); return; }
  const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("The picture could not be drawn.")); img.src = url; });
    const k = 2, cv = document.createElement("canvas");
    cv.width = w * k; cv.height = h * k;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    download(blob, base + ".png");
  } catch (e) { toast(e.message); } finally { URL.revokeObjectURL(url); }
}

/* ---------------- files ---------------- */

function download(data, name, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const fileBase = () => (S.name || "sheet").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || "sheet";
let fflateP = null;
const loadFflate = () => (fflateP ||= loadScript(new URL("./lib/fflate/fflate.umd.js", import.meta.url).href).then(() => window.fflate).catch((e) => { fflateP = null; throw e; }));
function bookForExport() {
  return {
    title: S.name,
    sheets: S.wb.sheets.map((s) => {
      const m = meta(s), cells = [], seen = new Set();
      for (const cell of s.cells.values()) {
        const k = key(cell.r, cell.c);
        seen.add(k);
        const out = { r: cell.r, c: cell.c, v: cell.value, style: m.styles.get(k) };
        if (cell.src) { out.f = cell.src.slice(1); if (cell.spillKeys?.size && cell.want) out.array = rangeName(cell.r, cell.c, cell.r + cell.want.h - 1, cell.c + cell.want.w - 1); }
        cells.push(out);
      }
      for (const [k, sp] of s.spill) { seen.add(k); const [r, c] = unkey(k); cells.push({ r, c, v: sp.value, style: m.styles.get(k) }); }
      for (const [k, st] of m.styles) if (!seen.has(k)) { const [r, c] = unkey(k); cells.push({ r, c, v: null, style: st }); }
      return { name: s.name, cells, colW: Object.fromEntries(m.colW), rowH: Object.fromEntries(m.rowH), merges: m.merges.map((g) => rangeName(g.r1, g.c1, g.r2, g.c2)),
        // Kept in the Excel file too (Canva: "your frozen view will be preserved in the downloaded version").
        freeze: m.freeze || 0, freezeCols: m.freezeCols || 0, noGrid: !!m.noGrid,
        dropdowns: m.dropdowns.map((d) => ({ range: d.range, options: d.options.map((o) => o.label) })),
        cf: m.cf.filter((x) => x.op !== "scale").map((x) => ({ range: x.range, op: x.op, v1: x.v1, v2: x.v2, style: { ...x.style } })),
        scales: m.cf.filter((x) => x.op === "scale").map((x) => ({ range: x.range, min: x.min, max: x.max })) };
    }),
  };
}
async function exportXlsxBytes() {
  const [X, z] = await Promise.all([import("./xlsx.js"), loadFflate()]);
  return X.writeXlsx(bookForExport(), z);
}
function csvText(v, st) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") { const code = fmtCode(st?.fmt); return isDateCode(code) || /%/.test(code) ? displayText(v, st) : numToText(v); }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof FormulaError) return v.code;
  return String(v);
}
function sheetCsv(s = sheet()) {
  const u = S.wb.usedRange(s), rows = [];
  for (let r = 0; r < u.rows; r++) { const row = []; for (let c = 0; c < u.cols; c++) row.push(csvText(S.wb.getValue(s, r, c), styleAt(r, c, s))); rows.push(row); }
  return toCSV(rows);
}
async function fileAction(act) {
  closeMenus();
  commitEdit();
  try {
    if (act === "importCsv") els.csvInput.click();
    else if (act === "importXlsx") els.xlsxInput.click();
    else if (act === "openJson") els.jsonInput.click();
    else if (act === "exportCsv") { download(new Blob(["﻿" + sheetCsv()], { type: "text/csv;charset=utf-8" }), `${fileBase()}${S.wb.sheets.length > 1 ? " - " + sheet().name : ""}.csv`); toast("CSV downloaded (this sheet only)."); }
    else if (act === "exportXlsx") { const bytes = await exportXlsxBytes(); download(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileBase() + ".xlsx"); toast("Excel file downloaded."); }
    else if (act === "exportPdf") { const bytes = await exportPdfBytes(); download(new Blob([bytes], { type: "application/pdf" }), fileBase() + ".pdf"); toast("PDF downloaded (every sheet, with charts)."); }
    else if (act === "exportJson") { download(new Blob([JSON.stringify({ format: "asaandesk-sheet", ...serialize() })], { type: "application/json" }), fileBase() + ".asaandesk-sheet.json"); toast("Sheet file downloaded. Open it here any time with File → Open."); }
  } catch (e) { toast("Sorry, that did not work: " + e.message); }
}
els.fileMenu.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) fileAction(b.dataset.act); const r = e.target.closest("[data-open]"); if (r) safe(openProject)(r.dataset.open); });
els.fileBtn.addEventListener("click", safe(async () => { if (toggleMenu(els.fileBtn, els.fileMenu)) await drawRecent(); }));
async function drawRecent() {
  let list = [];
  try { list = await listProjects("sheets"); } catch {}
  els.recentList.innerHTML = list.slice(0, 8).map((p) => `<button role="menuitem" type="button" data-open="${esc(p.id)}">${esc(p.name || "Untitled sheet")}${p.id === S.id ? " (open)" : ""}<small>${new Date(p.updated).toLocaleString()}</small></button>`).join("") || '<div class="none">Nothing yet.</div>';
}
async function readText(file) {
  const buf = await file.arrayBuffer();
  const t = new TextDecoder("utf-8").decode(buf);
  return t.includes("�") ? new TextDecoder("windows-1252").decode(buf) : t;
}
els.csvInput.addEventListener("change", async () => { const f = els.csvInput.files[0]; els.csvInput.value = ""; if (f) await importCsv(f).catch((e) => toast("Could not read this file: " + e.message)); });
els.xlsxInput.addEventListener("change", async () => { const f = els.xlsxInput.files[0]; els.xlsxInput.value = ""; if (f) await importXlsx(f).catch((e) => toast("Could not open this Excel file: " + e.message)); });
els.jsonInput.addEventListener("change", async () => {
  const f = els.jsonInput.files[0];
  els.jsonInput.value = "";
  if (!f) return;
  try { const j = JSON.parse(await readText(f)); if (j.format !== "asaandesk-sheet" || !Array.isArray(j.sheets)) throw new Error("This is not an AsaanDesk sheet file."); await openState(j, f.name.replace(/\.asaandesk-sheet\.json$|\.json$/i, "")); }
  catch (e) { toast(e.message); }
});
async function importCsv(file) {
  const text = await readText(file);
  const delim = detectDelimiter(text), rows = parseCSV(text, delim).filter((r, i, a) => !(i === a.length - 1 && r.length === 1 && r[0] === ""));
  if (!rows.length) { toast("This file is empty."); return; }
  commitEdit();
  snapshot();
  const name = S.wb.uniqueName((file.name.replace(/\.(csv|tsv|txt)$/i, "").replace(/[[\]:*?/\\']/g, " ").trim() || "Imported").slice(0, 28));
  const width = Math.max(...rows.map((r) => r.length));
  const sh = S.wb.addSheet(name, { rows: Math.max(1000, rows.length + 100), cols: Math.min(KM, Math.max(26, width + 2)) });
  const m = meta(sh), list = [];
  rows.forEach((row, r) => row.forEach((v, c) => {
    if (v === "") return;
    const input = /^[=+@-]/.test(v) && !/^[-+]?[\d.,]+%?$/.test(v) ? "'" + v : v;
    list.push({ sheet: sh, r, c, input });
    const hint = parseLiteral(input).fmt;
    if (hint) m.styles.set(key(r, c), { fmt: hint });
  }));
  S.wb.setCells(list);
  if (looksLikeHeader(valuesOf(0, 0, Math.min(rows.length - 1, 30), width - 1, sh))) for (let c = 0; c < width; c++) m.styles.set(key(0, c), { ...(m.styles.get(key(0, c)) || {}), b: true });
  renderTabs();
  switchSheet(S.wb.sheets.indexOf(sh));
  afterChange();
  const dn = { ",": "commas", ";": "semicolons", "\t": "tabs", "|": "| bars" }[delim];
  toast(`Imported ${rows.length} row${rows.length > 1 ? "s" : ""} from ${file.name} (values separated by ${dn}).`);
}
function inputOfValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof FormulaError) return v.code;
  const t = String(v);
  return t.startsWith("'") || t.startsWith("=") || parseLiteral(t).value !== t ? "'" + t : t;
}
async function importXlsx(file) {
  const [X, z] = await Promise.all([import("./xlsx.js"), loadFflate()]);
  const book = X.readXlsx(new Uint8Array(await file.arrayBuffer()), z);
  const state = {
    name: file.name.replace(/\.xlsx$/i, ""), active: 0,
    sheets: book.sheets.map((sh) => {
      const cells = {}, styles = {};
      let maxR = 0, maxC = 0;
      for (const cell of sh.cells) {
        const ref = cellName(cell.r, cell.c);
        if (cell.f) cells[ref] = "=" + cell.f; else if (cell.v !== null && cell.v !== undefined) cells[ref] = inputOfValue(cell.v);
        if (cell.style) styles[ref] = cell.style;
        maxR = Math.max(maxR, cell.r); maxC = Math.max(maxC, cell.c);
      }
      return { name: sh.name, rows: Math.max(1000, maxR + 100), cols: Math.min(KM, Math.max(26, maxC + 3)), cells, styles, colW: sh.colW, rowH: sh.rowH, charts: [] };
    }),
  };
  await openState(state, state.name);
  const n = state.sheets.reduce((a, s) => a + Object.keys(s.cells).length, 0);
  toast(`Opened ${file.name}: ${state.sheets.length} sheet${state.sheets.length > 1 ? "s" : ""}, ${n.toLocaleString("en-US")} cells.`);
}
/** Opens a whole workbook as a new project (the current one is already saved). */
async function openState(state, name) {
  commitEdit();
  if (saveTimer) await saveNow();
  S.id = null;
  S.past = []; S.future = [];
  load({ ...state, name: name || state.name || "Untitled sheet" });
  closeSide();
  await saveNow();
}
async function openProject(id) {
  closeMenus();
  if (id === S.id) return;
  if (saveTimer) await saveNow();
  const p = await getProject(id).catch(() => null);
  if (!p) { toast("That sheet could not be found."); return; }
  S.id = p.id;
  S.past = []; S.future = [];
  load(p.data);
  setSaveState("Saved");
  linkShell();
  history.replaceState(null, "", location.pathname + "?id=" + encodeURIComponent(p.id));
}
async function newFromTemplate(id) {
  if (!id) { await openState({ name: "Untitled sheet", sheets: [{ name: "Sheet1" }] }, "Untitled sheet"); return; }
  const T = await import("./templates.js");
  await openState(T.buildTemplate(id));
}

/* gallery */
async function openGallery() {
  commitEdit();
  closeMenus();
  if (!els.galleryCards.dataset.ready) {
    const GL = await import("./gallery.js");
    els.galleryCards.insertAdjacentHTML("beforeend", GL.TEMPLATES.map((t) => `<button type="button" class="card" data-template="${t.id}"><span class="mini-svg">${GL.thumb(t.id)}</span>${esc(t.name)}</button>`).join(""));
    els.galleryCards.dataset.ready = "1";
  }
  if (typeof els.gallery.showModal === "function") els.gallery.showModal(); else els.gallery.setAttribute("open", "");
}
els.newBtn.addEventListener("click", safe(openGallery));
els.galleryCards.addEventListener("click", safe(async (e) => {
  const b = e.target.closest("[data-template]");
  if (!b) return;
  els.gallery.close?.();
  await newFromTemplate(b.dataset.template);
  toast(b.dataset.template ? "Template opened. It is your own copy: change anything." : "New blank sheet.");
}));

/* ---------------- formatting tools ---------------- */

const FMT_BY_CODE = Object.fromEntries(Object.entries(FORMATS).map(([id, f]) => [f.code, id]));
/** More or fewer decimal places for the selected cells (works on the first part of the number format). */
function bumpDecimals(delta) {
  const { ar, ac } = S.sel, st = styleAt(ar, ac) || {}, v = S.wb.getValue(sheet(), ar, ac);
  let code = fmtCode(st.fmt);
  if (/^general$/i.test(code)) { const d = typeof v === "number" ? (generalText(v).split(".")[1] || "").replace(/e.*$/i, "").length : 0; code = d ? "0." + "0".repeat(d) : "0"; }
  if (isDateCode(code)) { toast("Decimal places work on numbers, not dates."); return; }
  const sec = code.split(";")[0], m = /0(\.0+)?(?!.*0)/.exec(sec);
  if (!m) { toast("Decimal places work on numbers."); return; }
  const n = clamp((m[1] ? m[1].length - 1 : 0) + delta, 0, 10);
  const next = sec.slice(0, m.index) + "0" + (n ? "." + "0".repeat(n) : "") + sec.slice(m.index + m[0].length);
  applyStyle({ fmt: FMT_BY_CODE[next] || next });
}
function applyBorders(kind) {
  commitEdit();
  const { r1, c1, r2, c2 } = S.sel;
  if ((r2 - r1 + 1) * (c2 - c1 + 1) > 200000) { toast("Select fewer cells for borders."); return; }
  snapshot();
  const m = meta();
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    const k = key(r, c), st = { ...(m.styles.get(k) || {}) };
    let sides = kind === "none" ? "" : kind === "all" ? "trbl" : st.bd || "";
    if (kind === "outer") { if (r === r1) sides += "t"; if (r === r2) sides += "b"; if (c === c1) sides += "l"; if (c === c2) sides += "r"; }
    if (kind === "bottom" && r === r2) sides += "b";
    if (kind === "top" && r === r1) sides += "t";
    if (kind === "left" && c === c1) sides += "l";
    if (kind === "right" && c === c2) sides += "r";
    if (kind === "inner" || kind === "innerH") { if (r > r1) sides += "t"; if (r < r2) sides += "b"; }
    if (kind === "inner" || kind === "innerV") { if (c > c1) sides += "l"; if (c < c2) sides += "r"; }
    sides = [...new Set(sides)].join("");
    if (sides) { st.bd = sides; st.bc = S.borderColor || "#334155"; if (S.borderStyle && S.borderStyle !== "solid") st.bs = S.borderStyle; else delete st.bs; } else { delete st.bd; delete st.bc; delete st.bs; }
    if (Object.keys(st).length) m.styles.set(k, st); else m.styles.delete(k);
  }
  afterChange();
}
function setFontSize(n) {
  n = clamp(Math.round(+n || 13), 6, 96);
  els.sizeInput.value = String(n);
  applyStyle({ size: n === 13 ? undefined : n });
}
function mergeCells() {
  commitEdit();
  const { r1, c1, r2, c2 } = S.sel, s = sheet(), m = meta();
  if (r1 === r2 && c1 === c2) { toast("Select two or more cells to merge."); return; }
  if ((r2 - r1 + 1) * (c2 - c1 + 1) > 10000) { toast("Select fewer cells to merge."); return; }
  snapshot();
  m.merges = m.merges.filter((g) => g.r2 < r1 || g.r1 > r2 || g.c2 < c1 || g.c1 > c2);
  m.merges.push({ r1, c1, r2, c2 });
  const k = key(r1, c1);
  m.styles.set(k, { ...(m.styles.get(k) || {}), align: "center", valign: "middle" });
  const list = [];
  for (const cell of s.cells.values()) if (cell.r >= r1 && cell.r <= r2 && cell.c >= c1 && cell.c <= c2 && (cell.r !== r1 || cell.c !== c1)) list.push({ r: cell.r, c: cell.c, input: "" });
  if (list.length) setInputs(list, { snap: false }); else afterChange();
  toast(list.length ? "Cells merged. Only the top-left value was kept." : "Cells merged.");
}
function unmergeCells() {
  commitEdit();
  const { r1, c1, r2, c2 } = S.sel, m = meta(), before = m.merges.length;
  const keep = m.merges.filter((g) => g.r2 < r1 || g.r1 > r2 || g.c2 < c1 || g.c1 > c2);
  if (keep.length === before) { toast("There are no merged cells here."); return; }
  snapshot();
  m.merges = keep;
  afterChange();
  toast("Cells unmerged.");
}
function startPaint() {
  commitEdit();
  if (S.paint) { S.paint = null; spacer.classList.remove("painting"); syncToolbar(); toast("Paint format is off."); return; }
  S.paint = { style: { ...(styleAt(S.sel.ar, S.sel.ac) || {}) }, from: cellName(S.sel.ar, S.sel.ac) };
  spacer.classList.add("painting");
  syncToolbar();
  toast(`Copied the look of ${S.paint.from}. Now click or drag over the cells to paint it.`);
}
function paintNow() {
  const p = S.paint;
  S.paint = null;
  spacer.classList.remove("painting");
  if (!p) return;
  const { r1, c1, r2, c2 } = S.sel, m = meta();
  snapshot();
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { const k = key(r, c); if (Object.keys(p.style).length) m.styles.set(k, { ...p.style }); else m.styles.delete(k); }
  autoHeights(sheet(), new Set(Array.from({ length: Math.min(r2 - r1 + 1, 5000) }, (_, i) => r1 + i)));
  afterChange();
  toast(`Painted the look of ${p.from} on ${rangeName(r1, c1, r2, c2)}.`);
}
function openComment() {
  commitEdit();
  const { ar, ac } = S.sel;
  ensureVisible(ar, ac);
  render();
  S.commentAt = { s: sheet(), r: ar, c: ac };
  els.commentCell.textContent = cellName(ar, ac);
  els.commentText.value = meta().comments.get(key(ar, ac)) || "";
  els.commentDel.hidden = !els.commentText.value;
  els.commentPop.hidden = false;
  const b = spacer.getBoundingClientRect(), q = rectOf(ar, ac, ar, ac), pw = els.commentPop.offsetWidth, ph = els.commentPop.offsetHeight;
  els.commentPop.style.left = clamp(b.left + q.x + q.w + 8, 8, innerWidth - pw - 8) + "px";
  els.commentPop.style.top = clamp(b.top + q.y, 8, innerHeight - ph - 8) + "px";
  els.commentText.focus();
}
function closeComment() { els.commentPop.hidden = true; S.commentAt = null; focusGrid(); }
function saveComment(remove = false) {
  const at = S.commentAt;
  if (!at) return closeComment();
  const m = meta(at.s), k = key(at.r, at.c), t = remove ? "" : els.commentText.value.trim();
  if ((m.comments.get(k) || "") !== t) {
    snapshot();
    if (t) m.comments.set(k, t); else m.comments.delete(k);
    afterChange();
    toast(t ? `Comment saved on ${cellName(at.r, at.c)}.` : "Comment deleted.");
  }
  closeComment();
}
/** Canva's date pill: pick a date from a calendar for the selected cell (typing /today, /tomorrow, /yesterday works too). */
function showDatePick() {
  commitEdit();
  openSide("Date", "date");
  const v = plain(S.wb.getValue(sheet(), S.sel.ar, S.sel.ac));
  const cur = typeof v === "number" && v > 0 ? (() => { const p = serialToParts(v); return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; })() : new Date().toISOString().slice(0, 10);
  els.sideBody.innerHTML = `<p class="muted">Pick a date for ${esc(cellName(S.sel.ar, S.sel.ac))}. Tip: type /today, /tomorrow or /yesterday in any cell.</p>
    <label class="field">Date <input type="date" id="dpDate" value="${esc(cur)}"></label>
    <label class="field">Show it as <select id="dpFmt"><option value="dateMdy">Jan 15, 2024</option><option value="dateUs">1/15/2024</option><option value="monthYear">Jan 2024</option><option value="date">15 Jan 2024</option><option value="dateShort">15/01/2024</option></select></label>
    <div class="actions"><button class="btn primary" type="button" id="dpApply">Insert date</button></div>`;
  $("dpApply").onclick = () => {
    const d = $("dpDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { toast("Pick a date first."); return; }
    const r = S.sel.ar, c = S.sel.ac;
    setInputs([{ r, c, input: d }]);
    const m = meta(), k = key(r, c);
    m.styles.set(k, { ...(m.styles.get(k) || {}), fmt: $("dpFmt").value });
    afterChange();
    toast("Date added.");
  };
}
/** Freezes rows / columns up to n (0 unfreezes); they stay in view while scrolling and in the Excel file. */
function setFreeze(kind, n) {
  commitEdit();
  const m = meta();
  snapshot();
  if (kind === "rows") m.freeze = Math.max(0, Math.min(50, n)); else m.freezeCols = Math.max(0, Math.min(20, n));
  afterChange();
  toast(n ? `${kind === "rows" ? `Rows 1–${n}` : `Columns A–${colName(n - 1)}`} now stay in view while you scroll.` : `${kind === "rows" ? "Rows" : "Columns"} scroll again.`);
}
function toggleFreeze() {
  commitEdit();
  const m = meta();
  snapshot();
  m.freeze = m.freeze ? 0 : 1;
  afterChange();
  toast(m.freeze ? "The first row now stays on top while you scroll." : "The first row scrolls again.");
}
function setZoom(pct) {
  const z = clamp(Math.round(+pct || 100), 50, 200) / 100;
  if (z === Z) return;
  const fx = scroller.scrollLeft / Z, fy = scroller.scrollTop / Z;
  Z = z;
  spacer.style.setProperty("--z", String(Z));
  els.chartLayer.style.transform = Z === 1 ? "" : `scale(${Z})`;
  layout();
  scroller.scrollLeft = fx * Z; scroller.scrollTop = fy * Z;
  drawSel();
  render();
}
function setMode(mode) {
  commitEdit();
  S.mode = mode === "view" || mode === "comment" ? mode : "edit";
  document.body.dataset.mode = S.mode;
  if (!shell) toast(S.mode === "edit" ? "Editing: you can change everything." : S.mode === "comment" ? "Commenting: add comments, cells stay as they are." : "Viewing: nothing can be changed.");
}
function renameDoc(t) {
  S.name = String(t || "").trim() || "Untitled sheet";
  els.docName.value = S.name;
  document.title = `${S.name} | AsaanDesk Sheets`;
  scheduleSave();
}
function selectionText() {
  const { r1, c1, r2, c2 } = S.sel, s = sheet(), used = S.wb.usedRange(s);
  if (r1 === r2 && c1 === c2) return cellText(S.wb.getValue(s, r1, c1), styleAt(r1, c1));
  const R2 = Math.min(r2, Math.max(r1, used.rows - 1)), C2 = Math.min(c2, Math.max(c1, used.cols - 1)), rows = [];
  for (let r = r1; r <= Math.min(R2, r1 + 500); r++) { const row = []; for (let c = c1; c <= C2; c++) row.push(cellText(S.wb.getValue(s, r, c), styleAt(r, c))); rows.push(row); }
  return toTSV(rows);
}
function putText(str, style) {
  commitEdit();
  const t = String(str ?? "");
  if (/[\t\n]/.test(t.trim())) { pasteData({ inputs: parseTSV(t) }); return; }
  const { ar, ac } = S.sel;
  snapshot();
  if (style) { const m = meta(), k = key(ar, ac); m.styles.set(k, { ...(m.styles.get(k) || {}), ...style }); }
  setInputs([{ r: ar, c: ac, input: t }], { snap: false });
  autoHeights(sheet(), new Set([ar]));
  afterChange();
}
function insertPicture(src, name) {
  commitEdit();
  if (!src) return;
  snapshot();
  const ch = { id: uid(), kind: "image", src, title: name || "Picture", w: 240, h: 200, x: Math.round(G.colX[Math.min(G.cols, S.sel.c2 + 1)] / Z) + 16, y: Math.round(G.rowY[S.sel.r1] / Z) };
  meta().charts.push(ch);
  renderCharts();
  afterChange();
  toast("Picture added. Drag its top bar to move it and the corner to resize.");
}
/** Adds the sheets of a built workbook (templates) to this workbook. */
function addSheetFrom(src) {
  const s = S.wb.addSheet(S.wb.uniqueName(src.name || "Sheet"), { rows: src.rows || 1000, cols: src.cols || 26 });
  S.wb.setCells(Object.entries(src.cells || {}).map(([ref, input]) => { const p = parseCellName(ref); return p ? { sheet: s, r: p.row, c: p.col, input } : null; }).filter(Boolean));
  const m = meta(s);
  for (const [ref, st] of Object.entries(src.styles || {})) { const p = parseCellName(ref); if (p && st) m.styles.set(key(p.row, p.col), { ...st }); }
  for (const [c, w] of Object.entries(src.colW || {})) m.colW.set(+c, +w);
  for (const [r, h] of Object.entries(src.rowH || {})) m.rowH.set(+r, +h);
  m.charts = (src.charts || []).map((ch) => ({ ...ch, id: uid() }));
  for (const [ref, t] of Object.entries(src.comments || {})) { const p = parseCellName(ref); if (p) m.comments.set(key(p.row, p.col), t); }
  m.merges = (src.merges || []).map((g) => ({ ...g }));
  extraMetaFrom(m, src);
  m.freeze = src.freeze || 0;
  return s;
}
/** Templates panel: an empty workbook becomes the template; otherwise the template comes in as new sheet tabs. */
async function applyTemplate(id) {
  commitEdit();
  const T = await import("./templates.js");
  const st = T.buildTemplate(id);
  const empty = S.wb.sheets.every((s) => !s.cells.size && !meta(s).charts.length);
  snapshot();
  if (empty) { const keep = S.id; load({ ...st, name: st.name }); S.id = keep; }
  else {
    const first = S.wb.sheets.length;
    for (const src of st.sheets) addSheetFrom(src);
    renderTabs();
    switchSheet(first);
    afterChange();
  }
  scheduleSave();
  try { shell?.pushRecent?.(id); } catch {}
  toast(empty ? `${st.name} is ready. Change anything you like.` : `${st.name} was added as a new sheet tab at the bottom.`);
}

/* ---------------- side panels for the editor frame (Elements, Text, Tools) ---------------- */

const STICKERS = ["✅", "❌", "⭐", "🔥", "📌", "💡", "⚠️", "🎯", "📈", "📉", "💰", "🛒", "📦", "🗓️", "👍", "👎", "🟢", "🟡", "🔴", "🏆"];
const SYMBOLS = ["●", "■", "▲", "▼", "◆", "★", "→", "←", "↑", "↓", "✓", "✗"];
const CHIPS = [["Done", "#dcfce7", "#166534"], ["In progress", "#fef3c7", "#92400e"], ["Not started", "#e2e8f0", "#334155"], ["Late", "#fee2e2", "#991b1b"], ["Paid", "#dcfce7", "#166534"], ["Unpaid", "#ffe4e6", "#9f1239"], ["High", "#fee2e2", "#991b1b"], ["Low", "#e0f2fe", "#075985"]];
const CHART_ICON = {
  bar: '<svg viewBox="0 0 40 30"><path d="M4 26h32" stroke="#94a3b8"/><rect x="7" y="14" width="5" height="12" fill="#5b4cf0" stroke="none"/><rect x="15" y="8" width="5" height="18" fill="#8b5cf6" stroke="none"/><rect x="23" y="17" width="5" height="9" fill="#5b4cf0" stroke="none"/><rect x="31" y="5" width="5" height="21" fill="#8b5cf6" stroke="none"/></svg>',
  line: '<svg viewBox="0 0 40 30"><path d="M4 26h32" stroke="#94a3b8"/><path d="m5 21 8-7 7 4 8-10 8 3" stroke="#14b8a6" stroke-width="2.2" fill="none"/></svg>',
  pie: '<svg viewBox="0 0 40 30"><circle cx="20" cy="15" r="11" fill="#c4b5fd" stroke="none"/><path d="M20 15V4a11 11 0 0 1 10.4 14.6z" fill="#5b4cf0" stroke="none"/></svg>',
  donut: '<svg viewBox="0 0 40 30"><circle cx="20" cy="15" r="9" fill="none" stroke="#fdba74" stroke-width="5"/><path d="M20 6a9 9 0 0 1 9 9" fill="none" stroke="#f97316" stroke-width="5"/></svg>',
  hbar: '<svg viewBox="0 0 40 30"><path d="M6 3v24" stroke="#94a3b8"/><rect x="7" y="5" width="26" height="5" fill="#5b4cf0" stroke="none"/><rect x="7" y="12.5" width="17" height="5" fill="#8b5cf6" stroke="none"/><rect x="7" y="20" width="22" height="5" fill="#5b4cf0" stroke="none"/></svg>',
  area: '<svg viewBox="0 0 40 30"><path d="M4 26h32" stroke="#94a3b8"/><path d="M5 26V20l8-6 7 3 8-9 8 4v14z" fill="#99f6e4" stroke="#14b8a6" stroke-width="1.6"/></svg>',
  stacked: '<svg viewBox="0 0 40 30"><path d="M4 26h32" stroke="#94a3b8"/><rect x="8" y="16" width="6" height="10" fill="#5b4cf0" stroke="none"/><rect x="8" y="10" width="6" height="6" fill="#ff7a59" stroke="none"/><rect x="17" y="12" width="6" height="14" fill="#5b4cf0" stroke="none"/><rect x="17" y="6" width="6" height="6" fill="#ff7a59" stroke="none"/><rect x="26" y="18" width="6" height="8" fill="#5b4cf0" stroke="none"/><rect x="26" y="13" width="6" height="5" fill="#ff7a59" stroke="none"/></svg>',
  scatter: '<svg viewBox="0 0 40 30"><path d="M5 3v23h31" stroke="#94a3b8" fill="none"/><circle cx="11" cy="20" r="2.4" fill="#5b4cf0" stroke="none"/><circle cx="17" cy="16" r="2.4" fill="#5b4cf0" stroke="none"/><circle cx="22" cy="17" r="2.4" fill="#5b4cf0" stroke="none"/><circle cx="27" cy="10" r="2.4" fill="#5b4cf0" stroke="none"/><circle cx="32" cy="7" r="2.4" fill="#5b4cf0" stroke="none"/></svg>',
};
const CHART_NAMES = { bar: "Columns", line: "Line", pie: "Pie", donut: "Donut", hbar: "Horizontal bar", area: "Area", stacked: "Stacked columns", scatter: "Scatter" };
function stickerInto(text) {
  const { ar, ac } = S.sel, cur = S.wb.getInput(sheet(), ar, ac);
  if (cur.startsWith("=")) { toast("That cell has a formula. Pick an empty cell or a text cell."); return; }
  setInputs([{ r: ar, c: ac, input: cur ? `${text} ${cur}` : text }]);
}
function elementsPanel(el) {
  el.innerHTML = `<div class="sp">
    <h3 class="sp-h">Charts</h3>
    <button type="button" class="sp-wide" data-magicchart="1">✦ <b>Magic Charts</b>: the best chart for the selected data</button>
    <div class="sp-grid">${Object.keys(CHART_ICON).map((k) => `<button type="button" class="sp-tile" data-chart="${k}">${CHART_ICON[k]}<span>${CHART_NAMES[k]}</span></button>`).join("")}</div>
    <p class="sp-note">Select your labels and numbers first, then pick a chart. It updates when the numbers change.</p>
    <h3 class="sp-h">In a cell</h3>
    <div class="sp-grid"><button type="button" class="sp-tile" data-cellpic="1"><svg viewBox="0 0 40 30"><rect x="6" y="5" width="28" height="20" rx="3" fill="#ede9fe" stroke="#8b5cf6"/><circle cx="14" cy="12" r="3" fill="#8b5cf6" stroke="none"/><path d="M8 23l8-7 6 5 4-3 6 5" stroke="#5b4cf0" fill="none"/></svg><span>Picture in a cell</span></button><button type="button" class="sp-tile" data-celldd="1"><svg viewBox="0 0 40 30"><rect x="5" y="9" width="30" height="12" rx="6" fill="#dcfce7" stroke="#16a34a"/><path d="m27 13 3 3 3-3" stroke="#16a34a" fill="none"/></svg><span>Dropdown pills</span></button></div>
    <h3 class="sp-h">Stickers</h3>
    <div class="sp-emoji">${STICKERS.map((e) => `<button type="button" data-sticker="${e}" aria-label="Sticker ${e}">${e}</button>`).join("")}</div>
    <h3 class="sp-h">Status labels</h3>
    <div class="sp-chips">${CHIPS.map(([t, bg, fg], i) => `<button type="button" data-chip="${i}" style="background:${bg};color:${fg}">${t}</button>`).join("")}</div>
    <h3 class="sp-h">Shapes and symbols</h3>
    <div class="sp-emoji sym">${SYMBOLS.map((e) => `<button type="button" data-sticker="${e}" aria-label="Symbol ${e}">${e}</button>`).join("")}</div>
    <h3 class="sp-h">Progress bar</h3>
    <button type="button" class="sp-wide" data-progress="1"><span class="bar-demo">█████░░░░░</span> Progress bar from the percent on the left</button>
  </div>`;
  el.onclick = safe(async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.chart) await insertChart({ kind: b.dataset.chart });
    else if (b.dataset.magicchart) await magicChart();
    else if (b.dataset.cellpic) pictureInCell();
    else if (b.dataset.celldd) showDropdown();
    else if (b.dataset.sticker) stickerInto(b.dataset.sticker);
    else if (b.dataset.chip) { const [t, bg, fg] = CHIPS[+b.dataset.chip]; const { ar, ac } = S.sel; snapshot(); const m = meta(), k = key(ar, ac); m.styles.set(k, { ...(m.styles.get(k) || {}), fill: bg, color: fg, b: true, align: "center" }); setInputs([{ r: ar, c: ac, input: t }], { snap: false }); }
    else if (b.dataset.progress) {
      const { ar, ac } = S.sel;
      if (!ac) { toast("Pick a cell with a percent on its left (for example C2 when B2 holds 60%)."); return; }
      const x = `MIN(1,MAX(0,${cellName(ar, ac - 1)}))`;
      setInputs([{ r: ar, c: ac, input: `=REPT("█",ROUND(${x}*10,0))&REPT("░",10-ROUND(${x}*10,0))` }]);
    }
  });
}
const TEXT_STYLES = [
  { id: "heading", label: "Add a heading", text: "Heading", st: { b: true, size: 24, i: false } },
  { id: "subheading", label: "Add a subheading", text: "Subheading", st: { b: true, size: 17, i: false } },
  { id: "body", label: "Add a little bit of body text", text: "Body text", st: { b: false, size: undefined, i: false } },
  { id: "band", label: "Title band", text: "Title", st: { b: true, size: 18, fill: "#5b4cf0", color: "#ffffff", valign: "middle" } },
  { id: "header", label: "Table header", text: "Column", st: { b: true, fill: "#ece9ff", color: "#2a2373", bd: "b", bc: "#5b4cf0" } },
  { id: "note", label: "Small note", text: "Note", st: { i: true, size: 11, color: "#64748b" } },
  { id: "total", label: "Total row", text: "Total", st: { b: true, fill: "#f3f4fb", bd: "t", bc: "#334155" } },
];
function textPanel(el) {
  el.innerHTML = `<div class="sp">
    <p class="sp-note">Click a style to use it on the selected cells.</p>
    <div class="sp-text">${TEXT_STYLES.map((t) => `<button type="button" class="ts-${t.id}" data-tstyle="${t.id}">${esc(t.label)}</button>`).join("")}</div>
    <h3 class="sp-h">Fonts</h3>
    <div class="sp-fonts">${Object.keys(FONTS).map((f) => `<button type="button" data-font="${esc(f)}" style="font-family:${esc(FONTS[f])}">${f || "Default"}</button>`).join("")}</div>
  </div>`;
  el.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.tstyle) {
      const t = TEXT_STYLES.find((x) => x.id === b.dataset.tstyle), { ar, ac, r1, r2, c1, c2 } = S.sel;
      applyStyle(t.st);
      if (r1 === r2 && c1 === c2 && S.wb.getInput(sheet(), ar, ac) === "") setInputs([{ r: ar, c: ac, input: t.text }]);
      autoHeights(sheet(), new Set(Array.from({ length: Math.min(r2 - r1 + 1, 5000) }, (_, i) => r1 + i))); layout(); afterChange();
    } else if (b.dataset.font !== undefined) applyStyle({ font: b.dataset.font || undefined });
  };
}
function toolsPanel(el) {
  const tools = [["sortAz", "Sort A to Z", "i-az"], ["sortZa", "Sort Z to A", "i-za"], ["filter", "Filter rows", "i-filter"], ["find", "Find and replace", "i-find"], ["insights", "Magic Insights", "i-spark"], ["formulas", "Magic Formulas", "i-fx"], ["freeze", "Freeze the first row", "i-rows"], ["chart", "Chart from selection", "i-chart"], ["magicChart", "Magic Charts", "i-spark"], ["freezeCol", "Freeze the first column", "i-rows"], ["cond", "Conditional formatting", "i-fill"], ["dropdown", "Dropdown list", "i-filter"], ["link", "Insert link", "i-find"], ["bulk", "Bulk create designs", "i-rows"], ["pdf", "Download PDF", "i-chart"], ["write", "Magic Write", "i-spark"]];
  el.innerHTML = `<div class="sp">
    <div class="sp-tools">${tools.map(([id, l, ic]) => `<button type="button" data-tool="${id}"><svg><use href="#${ic}"/></svg><span>${l}</span></button>`).join("")}</div>
    <h3 class="sp-h">Formulas</h3>
    <input type="search" class="sp-search" id="toolFnSearch" placeholder="Search formulas, e.g. average, lookup" aria-label="Search formulas">
    <ul class="sp-fn" id="toolFnList"><li class="muted">Loading…</li></ul>
  </div>`;
  const list = el.querySelector("#toolFnList"), q = el.querySelector("#toolFnSearch");
  const draw = () => { if (!CAT) return; const found = CAT.searchFunctions(q.value).slice(0, 60); list.innerHTML = found.map((f) => `<li><button type="button" data-use="${f.name}"><b>${f.name}</b><small>${esc(f.desc)}</small></button></li>`).join("") || '<li class="muted">No formula matches.</li>'; };
  loadCatalog().then(draw).catch(() => { list.innerHTML = '<li class="muted">The formula list could not load.</li>'; });
  q.addEventListener("input", draw);
  el.onclick = safe(async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.use) { useFunction(b.dataset.use); return; }
    const t = b.dataset.tool;
    if (t === "magicChart") await magicChart(); else if (t === "freezeCol") toggleFreezeCols(); else if (t === "cond") showCond(); else if (t === "dropdown") showDropdown(); else if (t === "link") showLink(); else if (t === "bulk") showBulk(); else if (t === "pdf") await fileAction("exportPdf"); else if (t === "write") showWrite();
    else if (t === "sortAz") sortSel(true); else if (t === "sortZa") sortSel(false); else if (t === "filter") showFilter(); else if (t === "find") showFind();
    else if (t === "insights") { S.insightsRange = null; await showInsights(); } else if (t === "formulas") await showFormulas(); else if (t === "freeze") toggleFreeze(); else if (t === "chart") await insertChart();
  });
}
function resizeOpen(anchor) {
  let pop = document.getElementById("resizePop");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "resizePop"; pop.className = "comment-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Sheet size");
    pop.innerHTML = `<div class="comment-head"><b>Sheet size</b></div><label class="field">Rows <input type="text" id="rsRows" inputmode="numeric"></label><label class="field">Columns <input type="text" id="rsCols" inputmode="numeric"></label><div class="actions"><button class="btn primary" type="button" id="rsApply">Resize</button><button class="btn" type="button" id="rsCancel">Cancel</button></div>`;
    document.body.appendChild(pop);
    pop.querySelector("#rsCancel").onclick = () => (pop.hidden = true);
    pop.querySelector("#rsApply").onclick = () => {
      const s = sheet(), rows = clamp(parseInt(pop.querySelector("#rsRows").value, 10) || s.rows, 1, 200000), cols = clamp(parseInt(pop.querySelector("#rsCols").value, 10) || s.cols, 1, 702);
      const u = S.wb.usedRange(s);
      if (rows < u.rows || cols < u.cols) { toast(`Your data needs at least ${u.rows} rows and ${u.cols} columns.`); return; }
      snapshot(); s.rows = rows; s.cols = cols; S.wb.rebuild?.(); layout(); setSel(Math.min(S.sel.ar, rows - 1), Math.min(S.sel.ac, cols - 1)); afterChange();
      pop.hidden = true; toast(`This sheet now has ${rows.toLocaleString("en-US")} rows and ${cols} columns.`);
    };
  }
  pop.querySelector("#rsRows").value = sheet().rows; pop.querySelector("#rsCols").value = sheet().cols;
  pop.hidden = false;
  const b = anchor?.getBoundingClientRect?.() || { left: 80, bottom: 60 };
  pop.style.left = clamp(b.left, 8, innerWidth - 300) + "px"; pop.style.top = b.bottom + 8 + "px";
  pop.querySelector("#rsRows").focus();
}

/* ---------------- Canva-parity extras: chart options, freeze column, conditional formatting, dropdowns, links,
   pictures in cells, lists, quick calculations, Magic Charts / Write, PDF export, Bulk create ---------------- */

function chartOptions(c, anchor) {
  const flip = (k, def) => () => { snapshot(); c[k] = !(c[k] ?? def); renderCharts(); scheduleSave(); };
  const legendOn = c.legend !== false, valuesOn = c.values ?? false;
  const b = anchor.getBoundingClientRect();
  showCtx(b.left, b.bottom + 4, [
    { id: "legend", label: (legendOn ? "✓ " : "") + "Show legend", run: flip("legend", true) },
    { id: "values", label: (valuesOn ? "✓ " : "") + "Show values", run: () => { snapshot(); c.values = !valuesOn; renderCharts(); scheduleSave(); } },
    "-",
    ...PALETTE_NAMES.map((n, i) => ({ id: "pal" + i, label: ((c.palette || 0) === i ? "✓ " : "") + n + " colours", run: () => { snapshot(); c.palette = i; renderCharts(); scheduleSave(); } })),
  ]);
}
function toggleFreezeCols() {
  commitEdit();
  const m = meta();
  snapshot();
  m.freezeCols = m.freezeCols ? 0 : 1;
  afterChange();
  toast(m.freezeCols ? "The first column now stays in view while you scroll sideways." : "The first column scrolls again.");
}
function toggleList() { applyStyle({ list: !(styleAt(S.sel.ar, S.sel.ac)?.list) }); }

// Conditional formatting rules (Canva: rules for text, numbers or dates, colour scales, Manage rules: edit, duplicate, delete).
const CF_OPS = [["gt", "is greater than", "Numbers"], ["lt", "is less than", "Numbers"], ["ge", "is at least", "Numbers"], ["le", "is at most", "Numbers"], ["between", "is between", "Numbers"],
  ["eq", "is equal to", "Text"], ["ne", "is not equal to", "Text"], ["contains", "contains the text", "Text"], ["notContains", "does not contain the text", "Text"], ["startsWith", "starts with", "Text"], ["endsWith", "ends with", "Text"],
  ["dateBefore", "is a date before", "Dates"], ["dateAfter", "is a date after", "Dates"], ["dateOn", "is the date", "Dates"], ["dateToday", "is today", "Dates"], ["datePast7", "is in the past 7 days", "Dates"], ["dateNext7", "is in the next 7 days", "Dates"],
  ["empty", "is empty", "Cells"], ["notEmpty", "is not empty", "Cells"], ["scale", "colour scale (low to high)", "Colour scale"]];
const CF_LOOKS = [["Green fill", { fill: "#dcfce7", color: "#166534" }], ["Red fill", { fill: "#fee2e2", color: "#991b1b" }], ["Yellow fill", { fill: "#fef3c7", color: "#92400e" }], ["Blue fill", { fill: "#e0f2fe", color: "#075985" }], ["Purple fill", { fill: "#ede9fe", color: "#5b21b6" }], ["Bold red text", { color: "#dc2626", b: true }], ["Bold green text", { color: "#16a34a", b: true }], ["Bold text", { b: true }]];
const CF_SCALES = [["White to green", "#ffffff", "#57bb8a"], ["White to red", "#ffffff", "#e67c73"], ["Red to green", "#e67c73", "#57bb8a"], ["Green to red", "#57bb8a", "#e67c73"], ["White to blue", "#ffffff", "#4285f4"], ["Yellow to green", "#ffd666", "#57bb8a"]];
const CF_NO_VALUE = new Set(["empty", "notEmpty", "dateToday", "datePast7", "dateNext7", "scale"]);
function selRange() { const { r1, c1, r2, c2 } = S.sel; return r1 === r2 && c1 === c2 ? cellName(r1, c1) : rangeName(r1, c1, r2, c2); }
function cfLabel(x) {
  if (x.op === "scale") return "colour scale";
  const o = CF_OPS.find((q) => q[0] === x.op);
  return `${o ? o[1] : x.op}${CF_NO_VALUE.has(x.op) ? "" : " " + (x.v1 ?? "")}${x.op === "between" ? " and " + (x.v2 ?? "") : ""}`;
}
function showCond() {
  commitEdit();
  openSide("Conditional formatting", "cond");
  const m = meta();
  let editing = null; // id of the rule being edited
  const groups = [...new Set(CF_OPS.map((o) => o[2]))];
  els.sideBody.innerHTML = `<p class="muted">Cells change their look when the value matches. Rules update by themselves when numbers change.</p>
    <label class="field">Cells <input type="text" id="cfRange" value="${esc(selRange())}"></label>
    <label class="field">Rule <select id="cfOp">${groups.map((g) => `<optgroup label="${esc(g)}">${CF_OPS.filter((o) => o[2] === g).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</optgroup>`).join("")}</select></label>
    <div class="row2"><label class="field" id="cfV1Wrap"><span id="cfV1Label">Value</span> <input type="text" id="cfV1"></label><label class="field" id="cfV2Wrap" hidden>and <input type="text" id="cfV2"></label></div>
    <label class="field" id="cfLookWrap">Look <select id="cfLook">${CF_LOOKS.map(([l], i) => `<option value="${i}">${l}</option>`).join("")}</select></label>
    <div id="cfScaleWrap" hidden><label class="field">Colours <select id="cfScale">${CF_SCALES.map(([l], i) => `<option value="${i}">${l}</option>`).join("")}</select></label>
      <div class="row2"><label class="field">Lowest value <input type="color" id="cfMin" value="#ffffff"></label><label class="field">Highest value <input type="color" id="cfMax" value="#57bb8a"></label></div></div>
    <div class="actions"><button class="btn primary" type="button" id="cfAdd">Add rule</button><button class="btn" type="button" id="cfCancel" hidden>Cancel editing</button></div>
    <h3>Manage rules</h3><ul class="fn-list" id="cfList"></ul>`;
  const op = $("cfOp");
  const sync = () => {
    const v = op.value, isDate = v.startsWith("date");
    $("cfV2Wrap").hidden = v !== "between";
    $("cfV1Wrap").hidden = CF_NO_VALUE.has(v);
    $("cfV1Label").textContent = isDate ? "Date" : /contains|starts|ends|eq|ne/i.test(v) ? "Text" : "Value";
    $("cfV1").placeholder = isDate ? "12/25/2026" : "";
    $("cfLookWrap").hidden = v === "scale";
    $("cfScaleWrap").hidden = v !== "scale";
  };
  op.onchange = sync; sync();
  $("cfScale").onchange = () => { const s = CF_SCALES[+$("cfScale").value]; $("cfMin").value = s[1]; $("cfMax").value = s[2]; };
  const resetForm = () => { editing = null; $("cfAdd").textContent = "Add rule"; $("cfCancel").hidden = true; };
  const draw = () => {
    $("cfList").innerHTML = m.cf.map((x) => `<li><div><b>${esc(x.range)}</b> ${esc(cfLabel(x))}<br>${x.op === "scale" ? `<span class="pill" style="background:linear-gradient(90deg,${esc(x.min || "#fff")},${esc(x.max || "#57bb8a")});color:#1b2133">Low → high</span>` : `<span class="pill" style="background:${esc(x.style.fill || "#fff")};color:${esc(x.style.color || "#1b2133")};font-weight:${x.style.b ? 700 : 400}">${esc(x.lookName || "Look")}</span>`}</div>
      <span class="cf-btns"><button class="btn" type="button" data-cfedit="${esc(x.id)}">Edit</button><button class="btn" type="button" data-cfdup="${esc(x.id)}">Duplicate</button><button class="btn" type="button" data-cfdel="${esc(x.id)}">Delete</button></span></li>`).join("") || '<li class="muted">No rules yet.</li>';
  };
  draw();
  $("cfList").onclick = (e) => {
    const del = e.target.closest("[data-cfdel]"), dup = e.target.closest("[data-cfdup]"), ed = e.target.closest("[data-cfedit]");
    if (del) { snapshot(); m.cf = m.cf.filter((x) => x.id !== del.dataset.cfdel); if (editing === del.dataset.cfdel) resetForm(); afterChange(); draw(); toast("Rule deleted."); return; }
    if (dup) { const x = m.cf.find((q) => q.id === dup.dataset.cfdup); if (!x) return; snapshot(); const { _p, ...rest } = x; m.cf.splice(m.cf.indexOf(x) + 1, 0, { ...rest, id: uid(), style: { ...(x.style || {}) } }); afterChange(); draw(); toast("Rule duplicated. Edit the copy to make a similar rule."); return; }
    if (ed) {
      const x = m.cf.find((q) => q.id === ed.dataset.cfedit); if (!x) return;
      editing = x.id;
      $("cfRange").value = x.range; op.value = x.op; $("cfV1").value = x.v1 ?? ""; $("cfV2").value = x.v2 ?? "";
      const li = CF_LOOKS.findIndex((l) => l[0] === x.lookName); if (li >= 0) $("cfLook").value = String(li);
      if (x.op === "scale") { $("cfMin").value = x.min || "#ffffff"; $("cfMax").value = x.max || "#57bb8a"; }
      sync();
      $("cfAdd").textContent = "Save rule"; $("cfCancel").hidden = false;
      $("cfRange").focus();
    }
  };
  $("cfCancel").onclick = resetForm;
  $("cfAdd").onclick = () => {
    const range = $("cfRange").value.trim().toUpperCase();
    if (!parseRangeName(range)) { toast("Type cells like B2:B20."); return; }
    const v = op.value;
    if (v.startsWith("date") && !CF_NO_VALUE.has(v) && !Number.isFinite(ruleDate($("cfV1").value))) { toast("Type a date like 12/25/2026."); return; }
    const look = CF_LOOKS[+$("cfLook").value];
    const rule = v === "scale" ? { range, op: v, min: $("cfMin").value, max: $("cfMax").value, style: {} } : { range, op: v, v1: $("cfV1").value, v2: $("cfV2").value, style: { ...look[1] }, lookName: look[0] };
    snapshot();
    if (editing) { const i = m.cf.findIndex((q) => q.id === editing); if (i >= 0) m.cf[i] = { ...rule, id: editing }; else m.cf.push({ ...rule, id: uid() }); toast("Rule saved."); }
    else { m.cf.push({ ...rule, id: uid() }); toast("Rule added."); }
    resetForm();
    afterChange(); draw();
  };
}

const PILL_COLORS = ["#dcfce7", "#fef3c7", "#e0f2fe", "#fee2e2", "#ede9fe", "#fce7f3", "#ccfbf1", "#f1f5f9"];
// Dropdown pills (Canva: Create dropdown or a preset; rename, colour, delete, "+ Add new option"; turn existing text into
// options; when the same dropdown is used elsewhere, apply the changes to all similar dropdowns).
const DD_PRESETS = {
  status: ["Not started", "In progress", "Done", "Blocked"],
  priority: ["Low", "Medium", "High", "Urgent"],
  rating: ["Poor", "Fair", "Good", "Very good", "Excellent"],
  effort: ["Small", "Medium", "Large"],
  timing: ["This week", "Next week", "This month", "Later"],
  approval: ["Pending", "Approved", "Changes requested", "Rejected"],
};
const PRESET_COLORS = { "Not started": "#f1f5f9", "In progress": "#fef3c7", Done: "#dcfce7", Blocked: "#fee2e2", Low: "#e0f2fe", Medium: "#fef3c7", High: "#fee2e2", Urgent: "#fce7f3", Poor: "#fee2e2", Fair: "#fef3c7", Good: "#e0f2fe", "Very good": "#ede9fe", Excellent: "#dcfce7", Small: "#dcfce7", Large: "#fee2e2", "This week": "#fee2e2", "Next week": "#fef3c7", "This month": "#e0f2fe", Later: "#f1f5f9", Pending: "#fef3c7", Approved: "#dcfce7", "Changes requested": "#ede9fe", Rejected: "#fee2e2" };
const COLOR_NAMES = { "#dcfce7": "Green", "#fef3c7": "Amber", "#e0f2fe": "Blue", "#fee2e2": "Red", "#ede9fe": "Purple", "#fce7f3": "Pink", "#ccfbf1": "Teal", "#f1f5f9": "Grey", transparent: "No colour" };
function showDropdown() {
  commitEdit();
  openSide("Dropdown list", "dropdown");
  const m = meta(), cur = dropdownAt(m, S.sel.ar, S.sel.ac);
  let opts = cur ? cur.options.map((o) => ({ label: o.label, color: o.color, was: o.label })) : DD_PRESETS.status.map((label) => ({ label, color: PRESET_COLORS[label] }));
  const sameSet = (d) => cur && d !== cur && d.options.length === cur.options.length && d.options.every((o, i) => o.label === cur.options[i].label);
  const similar = cur ? m.dropdowns.filter(sameSet) : [];
  els.sideBody.innerHTML = `<p class="muted">People pick a value from the list with the ▾ button in the cell. Coloured pills make status columns easy to read.</p>
    <label class="field">Cells <input type="text" id="ddRange" value="${esc(cur ? cur.range : selRange())}"></label>
    <label class="field">Start from <select id="ddPreset"><option value="">${cur ? "This dropdown" : "Status (preset)"}</option>${Object.keys(DD_PRESETS).map((k) => `<option value="${k}">${k[0].toUpperCase() + k.slice(1)} (preset)</option>`).join("")}<option value="custom">Create dropdown (empty)</option></select></label>
    <button class="btn" type="button" id="ddFromCells" title="Every different value in the cells becomes a choice">Use the values already in these cells</button>
    <h3>Choices</h3><ol class="dd-rows" id="ddRows"></ol>
    <button class="btn" type="button" id="ddAddOpt">+ Add new option</button>
    ${similar.length ? `<label class="field check"><input type="checkbox" id="ddSimilar" checked> Apply changes to all similar dropdowns (${similar.length} more on this sheet)</label>` : ""}
    <div class="actions"><button class="btn primary" type="button" id="ddApply">${cur ? "Update dropdown" : "Add dropdown"}</button><button class="btn" type="button" id="ddRemove">Remove from these cells</button></div>`;
  const rows = $("ddRows");
  const read = () => { rows.querySelectorAll("li").forEach((li, i) => { opts[i].label = li.querySelector(".dd-l").value.trim(); opts[i].color = li.querySelector(".dd-c").value; }); };
  const draw = () => {
    rows.innerHTML = opts.map((o, i) => `<li><select class="dd-c" aria-label="Colour of choice ${i + 1}" style="background:${esc(o.color === "transparent" ? "#fff" : o.color)}">${[...PILL_COLORS, "transparent"].map((c) => `<option value="${c}"${c === o.color ? " selected" : ""}>${COLOR_NAMES[c] || c}</option>`).join("")}</select><input class="dd-l" type="text" maxlength="60" aria-label="Choice ${i + 1}" value="${esc(o.label)}"><button type="button" class="btn sm" data-up="${i}" aria-label="Move up"${i ? "" : " disabled"}>↑</button><button type="button" class="btn sm" data-down="${i}" aria-label="Move down"${i < opts.length - 1 ? "" : " disabled"}>↓</button><button type="button" class="btn sm" data-del="${i}" aria-label="Delete choice"${opts.length > 1 ? "" : " disabled"}>✕</button></li>`).join("");
  };
  draw();
  rows.addEventListener("change", (e) => { if (e.target.matches(".dd-c")) e.target.style.background = e.target.value === "transparent" ? "#fff" : e.target.value; });
  rows.addEventListener("click", (e) => {
    const up = e.target.closest("[data-up]"), dn = e.target.closest("[data-down]"), del = e.target.closest("[data-del]");
    if (!up && !dn && !del) return;
    read();
    if (up) { const i = +up.dataset.up; [opts[i - 1], opts[i]] = [opts[i], opts[i - 1]]; }
    if (dn) { const i = +dn.dataset.down; [opts[i + 1], opts[i]] = [opts[i], opts[i + 1]]; }
    if (del) opts.splice(+del.dataset.del, 1);
    draw();
  });
  $("ddAddOpt").onclick = () => { read(); if (opts.length >= 30) { toast("A dropdown can have up to 30 choices."); return; } opts.push({ label: `Option ${opts.length + 1}`, color: PILL_COLORS[opts.length % PILL_COLORS.length] }); draw(); rows.querySelector("li:last-child .dd-l")?.select(); };
  $("ddPreset").onchange = (e) => {
    const k = e.target.value;
    if (k === "custom") opts = [{ label: "Option 1", color: PILL_COLORS[0] }, { label: "Option 2", color: PILL_COLORS[1] }];
    else if (DD_PRESETS[k]) opts = DD_PRESETS[k].map((label) => ({ label, color: PRESET_COLORS[label] || PILL_COLORS[0] }));
    else opts = cur ? cur.options.map((o) => ({ label: o.label, color: o.color, was: o.label })) : DD_PRESETS.status.map((label) => ({ label, color: PRESET_COLORS[label] }));
    draw();
  };
  $("ddFromCells").onclick = () => {
    const p = parseRangeName($("ddRange").value.trim().toUpperCase());
    if (!p) { toast("Type cells like D2:D20."); return; }
    const s = sheet(), seen = [];
    for (let r = p.r1; r <= Math.min(p.r2, p.r1 + 5000); r++) for (let c = p.c1; c <= Math.min(p.c2, p.c1 + 50); c++) { const v = plain(S.wb.getValue(s, r, c)); const t = v === null || v === undefined ? "" : String(displayText(v, styleAt(r, c) || {})).trim(); if (t && !seen.includes(t)) seen.push(t); if (seen.length >= 30) break; }
    if (!seen.length) { toast("These cells are empty. Type the choices instead."); return; }
    opts = seen.map((label, i) => ({ label, color: PRESET_COLORS[label] || PILL_COLORS[i % PILL_COLORS.length] }));
    draw();
    toast(`${seen.length} choice${seen.length === 1 ? "" : "s"} taken from the cells.`);
  };
  $("ddApply").onclick = () => {
    read();
    const range = $("ddRange").value.trim().toUpperCase();
    const clean = []; for (const o of opts) if (o.label && !clean.some((x) => x.label === o.label)) clean.push(o);
    if (!parseRangeName(range)) { toast("Type cells like D2:D20."); return; }
    if (!clean.length) { toast("Type at least one choice."); return; }
    snapshot();
    const options = clean.map(({ label, color }) => ({ label, color }));
    const renames = clean.filter((o) => o.was && o.was !== o.label).map((o) => [o.was, o.label]);
    const targets = [range, ...(($("ddSimilar")?.checked ? similar : []).map((d) => d.range))];
    const updates = [];
    if (renames.length) for (const t of targets) {
      const b = parseRangeName(t); if (!b) continue;
      const s = sheet();
      for (let r = b.r1; r <= Math.min(b.r2, b.r1 + 20000); r++) for (let c = b.c1; c <= Math.min(b.c2, b.c1 + 100); c++) { const v = S.wb.getInput?.(s, r, c) ?? plain(S.wb.getValue(s, r, c)); const hit = renames.find(([a]) => a === v); if (hit) updates.push({ r, c, input: hit[1] }); }
    }
    const simSet = new Set($("ddSimilar")?.checked ? similar : []);
    m.dropdowns = m.dropdowns.filter((d) => d.range !== range && d !== cur && !simSet.has(d));
    for (const t of targets) m.dropdowns.push({ range: t, options: options.map((o) => ({ ...o })) });
    if (updates.length) setInputs(updates, { snap: false });
    afterChange();
    toast(cur ? `Dropdown updated${simSet.size ? ` (and ${simSet.size} similar)` : ""}.` : `Dropdown added to ${range}.`);
  };
  $("ddRemove").onclick = () => {
    const p = parseRangeName($("ddRange").value.trim().toUpperCase());
    if (!p) return;
    snapshot();
    m.dropdowns = m.dropdowns.filter((d) => { const b = ruleBox(d); return b.r2 < p.r1 || b.r1 > p.r2 || b.c2 < p.c1 || b.c1 > p.c2; });
    afterChange();
    toast("Dropdown removed.");
  };
}
function pickDropdown() {
  const dd = dropdownAt(meta(), S.sel.ar, S.sel.ac);
  if (!dd) return;
  const b = els.ddBtn.getBoundingClientRect(), { ar, ac } = S.sel;
  showCtx(b.left, b.bottom + 2, [...dd.options.map((o, i) => ({ id: "dd" + i, label: o.label, run: () => { setInputs([{ r: ar, c: ac, input: o.label }]); focusGrid(); } })), "-", { id: "ddclear", label: "Clear", run: () => setInputs([{ r: ar, c: ac, input: "" }]) }]);
  els.ctxMenu.querySelectorAll("[data-ctx]").forEach((x, i) => { if (dd.options[i]) x.dataset.dd = dd.options[i].label; });
}

function showLink() {
  commitEdit();
  openSide("Insert link", "link");
  const { ar, ac } = S.sel, cur = styleAt(ar, ac)?.link || "";
  els.sideBody.innerHTML = `<p class="muted">The cell shows the text; select it to see an "Open link" button.</p>
    <label class="field">Web address <input type="text" id="lnkUrl" placeholder="https://example.com" value="${esc(cur)}"></label>
    <label class="field">Text to show (optional) <input type="text" id="lnkText" value="${esc(S.wb.getInput(sheet(), ar, ac))}"></label>
    <div class="actions"><button class="btn primary" type="button" id="lnkApply">Add link</button><button class="btn" type="button" id="lnkRemove">Remove link</button></div>`;
  $("lnkUrl").focus();
  $("lnkApply").onclick = () => {
    const url = $("lnkUrl").value.trim();
    if (safeUrl(url) === "#") { toast("Type a web address like https://example.com"); return; }
    const text = $("lnkText").value.trim() || S.wb.getInput(sheet(), ar, ac) || url.replace(/^https?:\/\//i, "");
    snapshot();
    const mm = meta(), k = key(ar, ac);
    mm.styles.set(k, { ...(mm.styles.get(k) || {}), link: url });
    setInputs([{ r: ar, c: ac, input: text }], { snap: false });
    afterChange();
    toast("Link added.");
  };
  $("lnkRemove").onclick = () => { applyStyle({ link: undefined }); toast("Link removed."); };
}

function pictureInCell() { commitEdit(); els.cellImgInput.click(); }
/** Shrinks a picture to at most 480 px so it stays light in the saved sheet. */
function shrinkImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 480 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL(/png/i.test(file.type) ? "image/png" : "image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("This picture could not be read.")); };
    img.src = url;
  });
}
async function putCellImage(src) {
  const { ar, ac } = S.sel, m = meta();
  snapshot();
  m.images.set(key(ar, ac), src);
  if ((m.rowH.get(ar) ?? DEF_H) < 60) { m.rowH.set(ar, 60); m.autoH.delete(ar); layout(); }
  afterChange();
  toast(`Picture added to ${cellName(ar, ac)}. Delete or Backspace removes it.`);
}
els.cellImgInput.addEventListener("change", safe(async () => {
  const f = els.cellImgInput.files[0];
  els.cellImgInput.value = "";
  if (!f) return;
  if (!/^image\//.test(f.type)) { toast("Choose a picture file."); return; }
  await putCellImage(await shrinkImage(f));
}));

function quickCalcMenu() {
  const { r1, c1, r2, c2 } = S.sel, s = sheet(), used = S.wb.usedRange(s), xs = [];
  for (let r = r1; r <= Math.min(r2, used.rows - 1); r++) for (let c = c1; c <= Math.min(c2, used.cols - 1); c++) { const v = S.wb.getValue(s, r, c); if (typeof v === "number") xs.push(v); }
  const f = (x) => generalText(+(+x).toPrecision(10)), n = xs.length, sum = xs.reduce((a, b) => a + b, 0);
  const rows = [["SUM", "Sum", n ? f(sum) : "–"], ["AVERAGE", "Average", n ? f(sum / n) : "–"], ["COUNT", "Count", String(n)], ["MAX", "Largest", n ? f(Math.max(...xs)) : "–"], ["MIN", "Smallest", n ? f(Math.min(...xs)) : "–"]];
  els.quickMenu.innerHTML = `<div class="menu-label">Selected cells</div>` + rows.map(([fn, l, v]) => `<button role="menuitem" type="button" data-qc="${fn}">${l} = <b>${esc(v)}</b><small>add below</small></button>`).join("");
}
function insertQuickCalc(fn) {
  const { r1, c1, r2, c2 } = S.sel;
  if (r1 === r2 && c1 === c2) { toast("Select a few cells with numbers first."); return; }
  const at = Math.min(r2 + 1, G.rows - 1);
  setInputs(Array.from({ length: c2 - c1 + 1 }, (_, j) => ({ r: at, c: c1 + j, input: `=${fn}(${rangeName(r1, c1 + j, r2, c1 + j)})` })));
  setSel(at, c1, at, c2);
  ensureVisible(at, c1);
  toast(`${fn} added in row ${at + 1}.`);
}

async function magicChart() {
  commitEdit();
  const rg = workRange(), s = sheet();
  if (rg.r1 === rg.r2 && rg.c1 === rg.c2 && S.wb.getValue(s, rg.r1, rg.c1) === null) { toast("Select the cells with your labels and numbers first."); return; }
  const d = chartSource({ range: rangeName(rg.r1, rg.c1, rg.r2, rg.c2) }, s);
  if (!d.series.length) { toast("There are no numbers to draw in these cells."); return; }
  const kind = pickChartKind(d);
  await insertChart({ kind, range: rangeName(rg.r1, rg.c1, rg.r2, rg.c2), near: rg });
  const kname = (EXTRA_KINDS[kind] || CHART_NAMES[kind] || kind).toLowerCase();
  toast(`Magic Charts picked ${/^[aeiou]/.test(kname) ? "an" : "a"} ${kname} chart for this data. Change it with the chart type list.`);
}

function showWrite() {
  commitEdit();
  openSide("✦ Magic Write", "write");
  if (!aiReady()) {
    comingSoon(els.sideBody, { title: "Magic Write", what: "Describe what you need, like “a short note for this budget” or “ten product names for a bakery”, and AsaanDesk AI will write it into the selected cells.", offline: "Until then, Magic Formulas (Find, Build, Explain) and Magic Insights work right now on this device." });
    return;
  }
  els.sideBody.innerHTML = `<label class="field">What should I write? <textarea id="mwAsk" placeholder="e.g. ten product names for a bakery"></textarea></label><div class="actions"><button class="btn primary" type="button" id="mwGo">✦ Write into the sheet</button></div><div id="mwOut" class="preview"></div>`;
  $("mwGo").onclick = async () => {
    const out = $("mwOut");
    out.textContent = "Writing…";
    try {
      const data = await onlineAi("/sheets/write", { prompt: $("mwAsk").value, cell: cellName(S.sel.ar, S.sel.ac) }, "Magic Write");
      const text = String(data?.text || "").trim();
      if (!text) { out.textContent = "No text came back."; return; }
      putText(text);
      out.textContent = "Done.";
    } catch (e) { out.textContent = e.message; }
  };
}

/* PDF export: every sheet drawn on A4 landscape pages (cells, fills, borders, text, pictures and charts). */
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function pageCuts(edges, total, max) {
  const out = [];
  let start = 0;
  while (start < total - 0.5) {
    let end = Math.min(total, start + max);
    if (end < total) { const e = edges.filter((v) => v > start + max * 0.3 && v <= end).pop(); if (e) end = e; }
    out.push([start, end]);
    start = end;
  }
  return out.length ? out : [[0, Math.max(1, total)]];
}
async function exportPdfBytes() {
  if (!window.PDFLib) await loadScript("/pdf-editor/lib/pdf-lib.min.js");
  const { PDFDocument } = window.PDFLib;
  const pdf = await PDFDocument.create();
  pdf.setTitle(S.name || "Sheet"); pdf.setCreator("AsaanDesk Sheets");
  let lib = null;
  try { lib = await loadCharts(); } catch {}
  const PW = 1050, PH = 660, HEAD = 26, K = 2;
  for (const s of S.wb.sheets) {
    const m = meta(s), used = S.wb.usedRange(s);
    if (!used.rows && !m.charts.length && S.wb.sheets.length > 1) continue;
    const cols = Math.max(1, used.cols), rows = Math.max(1, used.rows);
    const X = [0], Y = [0];
    for (let c = 0; c < cols; c++) X.push(X[c] + (m.colW.get(c) ?? DEF_W));
    for (let r = 0; r < rows; r++) Y.push(Y[r] + (m.hidden.has(r) ? 0 : m.rowH.get(r) ?? DEF_H));
    let W = X[cols], H = Y[rows];
    const charts = [];
    for (const ch of m.charts) {
      if (ch.x === undefined) { const p = parseCellName(ch.at || "") || { row: 0, col: Math.min(cols, 6) }; ch.x = X[Math.min(p.col, cols)] ?? W; ch.y = Y[Math.min(p.row, rows)] ?? H; }
      let svg = null;
      if (ch.kind === "image") svg = ch.src;
      else if (lib) { try { const raw = chartSvg(lib, ch, s, Math.max(60, ch.w - 2), Math.max(60, ch.h - BAR_H - 2), true); if (raw) svg = URL.createObjectURL(new Blob([raw.replace(/^<svg([^>]*)>/, `<svg$1><rect width="100%" height="100%" fill="#fff"/>`)], { type: "image/svg+xml" })); } catch {} }
      const img = svg ? await loadImg(svg) : null;
      if (img) charts.push({ ch, img });
      W = Math.max(W, ch.x + ch.w); H = Math.max(H, ch.y + ch.h);
    }
    const pics = new Map();
    for (const [k, src] of m.images) pics.set(k, await loadImg(src));
    const covered = new Set(), merges = m.merges.filter((g) => g.r1 < rows && g.c1 < cols);
    for (const g of merges) for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) if (r !== g.r1 || c !== g.c1) covered.add(key(r, c));
    for (const [y0, y1] of pageCuts(Y, H, PH)) for (const [x0, x1] of pageCuts(X, W, PW)) {
      const cv = document.createElement("canvas"), cw = x1 - x0, chh = y1 - y0 + HEAD;
      cv.width = Math.ceil(cw * K); cv.height = Math.ceil(chh * K);
      const g = cv.getContext("2d");
      g.scale(K, K); g.fillStyle = "#fff"; g.fillRect(0, 0, cw, chh);
      g.fillStyle = "#64748b"; g.font = "600 11px system-ui, sans-serif"; g.textBaseline = "middle";
      g.fillText(`${S.name} · ${s.name}`, 2, HEAD / 2);
      g.translate(-x0, HEAD - y0);
      for (let r = 0; r < rows; r++) {
        if (Y[r + 1] <= y0 || Y[r] >= y1 || Y[r + 1] === Y[r]) continue;
        for (let c = 0; c < cols; c++) {
          if (X[c + 1] <= x0 || X[c] >= x1 || covered.has(key(r, c))) continue;
          const mg = merges.find((q) => q.r1 === r && q.c1 === c);
          const x = X[c], y = Y[r], w = (mg ? X[Math.min(mg.c2 + 1, cols)] : X[c + 1]) - x, h = (mg ? Y[Math.min(mg.r2 + 1, rows)] : Y[r + 1]) - y;
          const v = S.wb.getValue(s, r, c), cf = condStyle(m, r, c, v), st = { ...(m.styles.get(key(r, c)) || {}), ...(cf || {}) };
          if (st.fill) { g.fillStyle = st.fill; g.fillRect(x, y, w, h); }
          if (!m.noGrid) { g.strokeStyle = "#e5e7eb"; g.lineWidth = 0.5; g.strokeRect(x, y, w, h); }
          if (st.bd) { g.strokeStyle = st.bc || "#334155"; g.lineWidth = st.bs === "thick" ? 2 : 1; g.setLineDash(st.bs === "dashed" ? [5, 3] : st.bs === "dotted" ? [1.5, 2.5] : []); g.beginPath(); if (st.bd.includes("t")) { g.moveTo(x, y); g.lineTo(x + w, y); } if (st.bd.includes("b")) { g.moveTo(x, y + h); g.lineTo(x + w, y + h); } if (st.bd.includes("l")) { g.moveTo(x, y); g.lineTo(x, y + h); } if (st.bd.includes("r")) { g.moveTo(x + w, y); g.lineTo(x + w, y + h); } g.stroke(); g.setLineDash([]); }
          const pic = pics.get(key(r, c));
          if (pic) { const k2 = Math.min((w - 4) / pic.width, (h - 4) / pic.height); g.drawImage(pic, x + (w - pic.width * k2) / 2, y + (h - pic.height * k2) / 2, pic.width * k2, pic.height * k2); }
          if (v === null || v === undefined) continue;
          let text = displayText(v, st);
          if (st.list) text = text.split("\n").map((l) => "• " + l).join("\n");
          const size = st.size || 13, isNum = typeof v === "number";
          g.font = `${st.i ? "italic " : ""}${st.b ? 700 : 400} ${size}px ${fontCss(st.font)}`;
          g.fillStyle = v instanceof FormulaError ? "#c0392b" : st.color || (st.link ? "#1d4ed8" : "#1b2133");
          const align = st.align || (isNum ? "right" : typeof v === "boolean" || v instanceof FormulaError ? "center" : "left");
          g.textAlign = align === "right" ? "right" : align === "center" ? "center" : "left";
          const tx = align === "right" ? x + w - 5 : align === "center" ? x + w / 2 : x + 5;
          const lines = st.wrap ? wrapLines(g, text, w - 10) : text.split("\n").slice(0, 1);
          const lh = size * 1.3, blockH = lines.length * lh;
          let ty = st.valign === "top" ? y + 3 + lh / 2 : st.valign === "middle" ? y + (h - blockH) / 2 + lh / 2 : y + h - blockH - 3 + lh / 2;
          g.save(); g.beginPath(); g.rect(x, y, align === "left" && !st.wrap && !st.fill ? Math.max(w, x1 - x) : w, h); g.clip();
          for (const line of lines) { g.fillText(line, tx, ty); ty += lh; }
          g.restore();
        }
      }
      for (const { ch, img } of charts) if (ch.x < x1 && ch.x + ch.w > x0 && ch.y < y1 && ch.y + ch.h > y0) g.drawImage(img, ch.x, ch.y, ch.w, ch.h - (ch.kind === "image" ? 0 : BAR_H));
      const png = await new Promise((res) => cv.toBlob(res, "image/png"));
      const image = await pdf.embedPng(new Uint8Array(await png.arrayBuffer()));
      // CSS pixels → points (×0.75), shrunk to fit inside the page margins, kept in proportion.
      const page = pdf.addPage([842, 595]), fit = Math.min(1, 786 / (cw * 0.75), 539 / (chh * 0.75));
      const pw = cw * 0.75 * fit, ph = chh * 0.75 * fit;
      page.drawImage(image, { x: 28, y: 595 - 28 - ph, width: pw, height: ph });
    }
    for (const { img } of charts) if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
  if (!pdf.getPageCount()) pdf.addPage([842, 595]);
  return pdf.save({ useObjectStreams: false }); // plain page objects: wider support in older PDF readers
}
function wrapLines(g, text, max) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) { const t = line + word; if (g.measureText(t).width > max && line.trim()) { out.push(line.trimEnd()); line = word.trimStart(); } else line = t; }
    out.push(line);
  }
  return out;
}

/* Bulk create: one design per row of the selected table, downloaded as a ZIP of pictures. */
const BULK_DESIGNS = {
  badge: { name: "Name badge", w: 600, h: 380 },
  price: { name: "Price tag", w: 420, h: 560 },
  certificate: { name: "Certificate", w: 840, h: 600 },
  post: { name: "Social post", w: 600, h: 600 },
};
function bulkSvg(kind, f, color) {
  const D = BULK_DESIGNS[kind], e = svgEsc, font = 'font-family="system-ui,-apple-system,Segoe UI,sans-serif"';
  const t = e(f.title), sub = e(f.subtitle), det = e(f.detail), head = e(f.heading);
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${D.w} ${D.h}" width="${D.w}" height="${D.h}">`;
  if (kind === "badge") return `${open}<rect width="600" height="380" rx="28" fill="#fff"/><rect width="600" height="96" rx="28" fill="${color}"/><rect y="60" width="600" height="36" fill="${color}"/><text x="40" y="60" font-size="28" font-weight="700" fill="#fff" ${font}>${head}</text><text x="40" y="200" font-size="52" font-weight="800" fill="#1b2133" ${font}>${t}</text><text x="40" y="258" font-size="28" fill="${color}" font-weight="600" ${font}>${sub}</text><text x="40" y="320" font-size="22" fill="#64748b" ${font}>${det}</text><rect x="0" y="372" width="600" height="8" fill="${color}"/></svg>`;
  if (kind === "price") return `${open}<rect width="420" height="560" rx="30" fill="#fff" stroke="${color}" stroke-width="6"/><circle cx="210" cy="60" r="18" fill="none" stroke="${color}" stroke-width="5"/><text x="210" y="160" text-anchor="middle" font-size="36" font-weight="700" fill="#1b2133" ${font}>${t}</text><text x="210" y="210" text-anchor="middle" font-size="22" fill="#64748b" ${font}>${sub}</text><rect x="40" y="260" width="340" height="150" rx="20" fill="${color}"/><text x="210" y="355" text-anchor="middle" font-size="56" font-weight="800" fill="#fff" ${font}>${det}</text><text x="210" y="480" text-anchor="middle" font-size="22" fill="${color}" font-weight="600" ${font}>${head}</text></svg>`;
  if (kind === "certificate") return `${open}<rect width="840" height="600" fill="#fffdf7"/><rect x="24" y="24" width="792" height="552" fill="none" stroke="${color}" stroke-width="6"/><rect x="40" y="40" width="760" height="520" fill="none" stroke="${color}" stroke-width="1.5"/><text x="420" y="150" text-anchor="middle" font-size="44" font-weight="700" fill="${color}" ${font}>Certificate of achievement</text><text x="420" y="215" text-anchor="middle" font-size="22" fill="#64748b" ${font}>This is presented to</text><text x="420" y="300" text-anchor="middle" font-size="58" font-weight="800" fill="#1b2133" ${font}>${t}</text><line x1="220" x2="620" y1="325" y2="325" stroke="${color}" stroke-width="2"/><text x="420" y="380" text-anchor="middle" font-size="26" fill="#334155" ${font}>${sub}</text><text x="420" y="480" text-anchor="middle" font-size="20" fill="#64748b" ${font}>${det}</text><text x="420" y="520" text-anchor="middle" font-size="18" fill="${color}" font-weight="600" ${font}>${head}</text></svg>`;
  return `${open}<rect width="600" height="600" fill="${color}"/><circle cx="520" cy="80" r="160" fill="#fff" opacity=".12"/><circle cx="60" cy="560" r="120" fill="#fff" opacity=".1"/><text x="48" y="110" font-size="26" font-weight="600" fill="#fff" opacity=".9" ${font}>${head}</text><text x="48" y="300" font-size="64" font-weight="800" fill="#fff" ${font}>${t}</text><text x="48" y="370" font-size="32" fill="#fff" ${font}>${sub}</text><rect x="48" y="440" width="260" height="70" rx="35" fill="#fff"/><text x="178" y="485" text-anchor="middle" font-size="28" font-weight="700" fill="${color}" ${font}>${det}</text></svg>`;
}
function bulkData() {
  const rg = workRange(), s = sheet();
  const head = [], rows = [];
  for (let c = rg.c1; c <= rg.c2; c++) { const v = S.wb.getValue(s, rg.r1, c); head.push(v === null ? colName(c) : cellText(v, styleAt(rg.r1, c))); }
  for (let r = rg.r1 + 1; r <= rg.r2; r++) { const row = []; let any = false; for (let c = rg.c1; c <= rg.c2; c++) { const v = S.wb.getValue(s, r, c); if (v !== null) any = true; row.push(v === null ? "" : cellText(v, styleAt(r, c))); } if (any) rows.push(row); }
  return { range: rangeName(rg.r1, rg.c1, rg.r2, rg.c2), head, rows };
}
function showBulk() {
  commitEdit();
  openSide("Bulk create", "bulk");
  const data = bulkData();
  if (!data.rows.length) { els.sideBody.innerHTML = '<p class="muted">Click inside a table with a heading row first. Each row becomes one design.</p>'; return; }
  const opt = (sel) => `<option value="-1">(nothing)</option>` + data.head.map((h, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${esc(h)}</option>`).join("");
  els.sideBody.innerHTML = `<p class="muted">Data: <b>${esc(data.range)}</b>, ${data.rows.length} row${data.rows.length === 1 ? "" : "s"} → ${data.rows.length} design${data.rows.length === 1 ? "" : "s"}.</p>
    <label class="field">Design <select id="bkKind">${Object.entries(BULK_DESIGNS).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join("")}</select></label>
    <label class="field">Main text <select id="bkTitle">${opt(0)}</select></label>
    <label class="field">Second line <select id="bkSub">${opt(data.head.length > 1 ? 1 : -1)}</select></label>
    <label class="field">Detail <select id="bkDet">${opt(data.head.length > 2 ? 2 : -1)}</select></label>
    <label class="field">Small heading <input type="text" id="bkHead" value="${esc(S.name)}"></label>
    <label class="field">Colour <input type="color" id="bkColor" value="#5b4cf0"></label>
    <div class="bulk-prev" id="bkPrev"></div>
    <div class="actions"><button class="btn primary" type="button" id="bkGo">Create ${data.rows.length} design${data.rows.length === 1 ? "" : "s"}</button></div>`;
  const fields = (row) => { const pick = (id) => { const i = +$(id).value; return i < 0 ? "" : row[i] || ""; }; return { title: pick("bkTitle"), subtitle: pick("bkSub"), detail: pick("bkDet"), heading: $("bkHead").value }; };
  const draw = () => { const k = $("bkKind").value, col = $("bkColor").value; $("bkPrev").innerHTML = data.rows.slice(0, 6).map((row) => `<div class="bulk-card">${bulkSvg(k, fields(row), col)}</div>`).join(""); };
  els.sideBody.addEventListener("input", draw);
  els.sideBody.addEventListener("change", draw);
  draw();
  $("bkGo").onclick = safe(async () => {
    const k = $("bkKind").value, col = $("bkColor").value, D = BULK_DESIGNS[k], z = await loadFflate(), files = {};
    $("bkGo").disabled = true; $("bkGo").textContent = "Creating…";
    for (const [i, row] of data.rows.entries()) {
      const svg = bulkSvg(k, fields(row), col), img = await loadImg(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })));
      const cv = document.createElement("canvas"); cv.width = D.w; cv.height = D.h;
      const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, D.w, D.h);
      if (img) { g.drawImage(img, 0, 0, D.w, D.h); URL.revokeObjectURL(img.src); }
      const png = await new Promise((res) => cv.toBlob(res, "image/png"));
      const name = `${String(i + 1).padStart(3, "0")}-${(fields(row).title || "design").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "design"}`;
      files[name + ".png"] = new Uint8Array(await png.arrayBuffer());
      files[name + ".svg"] = z.strToU8(svg);
    }
    download(new Blob([z.zipSync(files, { level: 0 })], { type: "application/zip" }), `${fileBase()} - ${D.name}s.zip`);
    $("bkGo").disabled = false; $("bkGo").textContent = `Create ${data.rows.length} designs`;
    toast(`${data.rows.length} designs created (PNG and SVG) in one ZIP file.`);
  });
}

els.listBtn.addEventListener("click", toggleList);
els.freezeColBtn.addEventListener("click", () => { closeMenus(); toggleFreezeCols(); });
for (const [id, fn] of [["actCond", showCond], ["actDropdown", showDropdown], ["actDate", showDatePick], ["actLink", showLink], ["actPicture", pictureInCell], ["actMagicChart", magicChart], ["actFormulas", () => showFormulas()], ["actInsights", () => { S.insightsRange = null; return showInsights(); }], ["actWrite", showWrite], ["actBulk", showBulk]]) els[id].addEventListener("click", safe(async () => { closeMenus(); await fn(); }));
els.ddBtn.addEventListener("click", (e) => { e.stopPropagation(); pickDropdown(); });
els.errFix.addEventListener("click", (e) => {
  e.stopPropagation();
  const fix = els.errFix.dataset.fix, { ar, ac } = S.sel;
  if (!fix) return;
  setInputs([{ r: ar, c: ac, input: fix }]);
  toast(`Formula changed to ${fix}`);
  focusGrid();
});
/** Date cells: the 📅 button opens the browser's date picker; the chosen day goes into the cell. */
els.dateBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const { ar, ac } = S.sel, v = S.wb.getValue(sheet(), ar, ac), p = typeof v === "number" ? serialToParts(Math.floor(v)) : null;
  els.datePick.value = p ? `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}` : "";
  const q = rectOf(ar, ac, ar, ac);
  Object.assign(els.datePick.style, { left: q.x + "px", top: q.y + q.h + "px" });
  S.dateAt = { s: sheet(), r: ar, c: ac };
  try { els.datePick.showPicker(); } catch { els.datePick.classList.add("show"); els.datePick.focus(); }
});
els.datePick.addEventListener("change", () => {
  const at = S.dateAt;
  els.datePick.classList.remove("show");
  if (!at || !els.datePick.value || at.s !== sheet()) return;
  setInputs([{ r: at.r, c: at.c, input: els.datePick.value }]);
  focusGrid();
});
els.datePick.addEventListener("blur", () => els.datePick.classList.remove("show"));
els.quickCalc.addEventListener("click", quickCalcMenu);
els.quickMenu.addEventListener("click", (e) => { const b = e.target.closest("[data-qc]"); if (!b) return; closeMenus(); insertQuickCalc(b.dataset.qc); focusGrid(); });

/* ---------------- toolbar wiring ---------------- */

els.undoBtn.addEventListener("click", () => { closeMenus(); undo(); });
els.redoBtn.addEventListener("click", () => { closeMenus(); redo(); });
els.boldBtn.addEventListener("click", () => applyStyle({ b: !(styleAt(S.sel.ar, S.sel.ac)?.b) }));
els.italicBtn.addEventListener("click", () => applyStyle({ i: !(styleAt(S.sel.ar, S.sel.ac)?.i) }));
els.underlineBtn.addEventListener("click", () => { closeMenus(); applyStyle({ u: !(styleAt(S.sel.ar, S.sel.ac)?.u) }); });
els.wrapBtn.addEventListener("click", () => applyStyle({ wrap: !(styleAt(S.sel.ar, S.sel.ac)?.wrap) }));
els.textColor.addEventListener("input", (e) => { els.textSwatch.style.background = e.target.value; });
els.textColor.addEventListener("change", (e) => { els.textSwatch.style.background = e.target.value; applyStyle({ color: e.target.value }); });
els.fillColor.addEventListener("change", (e) => { applyStyle({ fill: e.target.value }); });
els.clearFmtBtn.addEventListener("click", () => { closeMenus(); clearFormats(); });
for (const b of document.querySelectorAll("[data-align]")) b.addEventListener("click", () => { closeMenus(); applyStyle({ align: styleAt(S.sel.ar, S.sel.ac)?.align === b.dataset.align ? undefined : b.dataset.align }); });
for (const b of document.querySelectorAll("[data-valign]")) b.addEventListener("click", () => { closeMenus(); applyStyle({ valign: b.dataset.valign === "bottom" ? undefined : b.dataset.valign }); });
for (const b of document.querySelectorAll("[data-border]")) b.addEventListener("click", () => { closeMenus(); applyBorders(b.dataset.border); });
// Border colour and style for the next borders; gridlines on / off per sheet (Canva: Border → Show Gridlines).
document.getElementById("borderColor").addEventListener("input", (e) => { S.borderColor = e.target.value; });
document.getElementById("borderStyle").addEventListener("change", (e) => { S.borderStyle = e.target.value; });
document.getElementById("gridToggle").addEventListener("change", (e) => { commitEdit(); snapshot(); meta().noGrid = !e.target.checked; afterChange(); toast(e.target.checked ? "Gridlines are shown." : "Gridlines are hidden (also in the PDF)."); });
for (const el of ["borderColor", "borderStyle", "gridToggle"]) document.getElementById(el).addEventListener("click", (e) => e.stopPropagation());
els.fmtMenu.addEventListener("click", (e) => { const b = e.target.closest("[data-fmt]"); if (!b) return; closeMenus(); applyStyle({ fmt: b.dataset.fmt }); });
els.decLess.addEventListener("click", () => bumpDecimals(-1));
els.decMore.addEventListener("click", () => bumpDecimals(1));
els.fontSelect.addEventListener("change", () => { applyStyle({ font: els.fontSelect.value || undefined }); focusGrid(); });
els.sizeDown.addEventListener("click", () => setFontSize((+els.sizeInput.value || 13) - 1));
els.sizeUp.addEventListener("click", () => setFontSize((+els.sizeInput.value || 13) + 1));
els.sizeInput.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); setFontSize(els.sizeInput.value); focusGrid(); } });
els.sizeInput.addEventListener("change", () => setFontSize(els.sizeInput.value));
els.paintBtn.addEventListener("click", startPaint);
els.commentBtn.addEventListener("click", openComment);
els.commentSave.addEventListener("click", () => saveComment());
els.commentDel.addEventListener("click", () => saveComment(true));
els.commentCancel.addEventListener("click", closeComment);
els.commentText.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") closeComment(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveComment(); });
els.mergeBtn.addEventListener("click", () => { closeMenus(); mergeCells(); });
els.unmergeBtn.addEventListener("click", () => { closeMenus(); unmergeCells(); });
els.sortAsc.addEventListener("click", () => { closeMenus(); sortSel(true); });
els.sortDesc.addEventListener("click", () => { closeMenus(); sortSel(false); });
els.clearBtn.addEventListener("click", () => { closeMenus(); commitEdit(); clearSelection(); });
els.freezeBtn.addEventListener("click", () => { closeMenus(); toggleFreeze(); });
els.filterBtn.addEventListener("click", () => (S.panel === "filter" ? closeSide() : showFilter()));
els.findBtn.addEventListener("click", () => { closeMenus(); S.panel === "find" ? closeSide() : showFind(); });
for (const [b, mn] of MENUS) if (b !== "fileBtn") els[b].addEventListener("click", () => toggleMenu(els[b], els[mn]));
els.actionsMenu.addEventListener("click", (e) => { const b = e.target.closest("[data-struct]"); if (!b) return; closeMenus(); structure(b.dataset.struct); });
els.chartBtn.addEventListener("click", safe(() => insertChart()));
els.insightsBtn.addEventListener("click", safe(() => { S.insightsRange = null; return showInsights(); }));
els.formulasBtn.addEventListener("click", safe(() => (S.panel === "formulas" ? closeSide() : showFormulas())));
els.docName.addEventListener("change", () => { renameDoc(els.docName.value); shell?.setTitle?.(S.name); });
els.docName.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); els.docName.blur(); focusGrid(); } });
for (const b of els.toolbar.querySelectorAll("button, select")) b.addEventListener("pointerdown", () => { if (S.edit && b.id !== "undoBtn") commitEdit(); });
els.toolbar.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  // After a plain button or a menu item, keyboard focus goes back to the grid (so Ctrl+Z, arrows and typing work);
  // not after a button that opens a menu or a panel with its own input.
  const keep = ["insightsBtn", "formulasBtn", "findBtn", "filterBtn", "commentBtn", "sizeDown", "sizeUp", "actCond", "actDropdown", "actLink", "actPicture", "actWrite", "actBulk", "actFormulas", "actInsights"].includes(b.id);
  const opensMenu = b.closest(".menu-wrap") && !b.closest(".menu");
  if (!keep && !opensMenu) setTimeout(focusGrid, 0);
});

/* ---------------- the editor frame ---------------- */

async function mountFrame() {
  let mod = null;
  try { mod = await import("../shared/editor-shell.js"); } catch { return false; }
  if (!mod?.mountShell) return false;
  const gallery = await import("./gallery.js");
  const dl = (act) => () => fileAction(act);
  shell = mod.mountShell({
    app: "sheets", kind: "Sheet", title: S.name || "Untitled sheet", home: "/tools/sheets",
    onTitle: (t) => renameDoc(t),
    stage: els.stage, toolbar: els.toolbar, formulaBar: els.fbar,
    resize: { label: "Resize", open: (anchor) => resizeOpen(anchor) },
    file: [
      { label: "New blank sheet", act: () => safe(newFromTemplate)("") },
      { label: "Import CSV…", group: "Open", act: dl("importCsv") },
      { label: "Open Excel file (.xlsx)…", group: "Open", act: dl("importXlsx") },
      { label: "Open AsaanDesk sheet file…", group: "Open", act: dl("openJson") },
      { label: "Recent sheets…", group: "Open", act: () => shell?.openPanel?.("projects") },
      { label: "Save now", group: "Save", act: () => saveNow().then(() => toast("Saved in this browser")) },
      { label: "Download Excel (.xlsx)", group: "Download", act: dl("exportXlsx") },
      { label: "Download CSV (this sheet)", group: "Download", act: dl("exportCsv") },
      { label: "Download PDF", group: "Download", act: dl("exportPdf") },
      { label: "Download AsaanDesk sheet file (.json)", group: "Download", act: dl("exportJson") },
    ],
    share: { download: [{ label: "Excel (.xlsx)", act: dl("exportXlsx") }, { label: "PDF", act: dl("exportPdf") }, { label: "CSV (this sheet)", act: dl("exportCsv") }, { label: "AsaanDesk sheet file (.json)", act: dl("exportJson") }] },
    templates: { gallery, tool: MODE === "insights" ? "magic-insights" : MODE === "formulas" ? "magic-formulas" : "sheets", apply: (id) => safe(applyTemplate)(id), placeholder: MODE === "insights" ? "Search data sets" : MODE === "formulas" ? "Search formula practice sheets" : "Search Sheet templates" },
    panels: { elements: (el) => elementsPanel(el), text: (el) => textPanel(el), tools: (el) => toolsPanel(el) },
    rail: ["templates", "elements", "text", "brand", "uploads", "tools", "projects", "apps", "translate"],
    insert: {
      image: (src, name) => insertPicture(src, name),
      text: (str, style) => putText(str, style === "heading" || style?.heading ? { b: true, size: 22 } : style === "subheading" ? { b: true, size: 16 } : null),
      color: (hex) => applyStyle({ fill: hex }),
      font: (family, css) => applyStyle({ font: css || family }),
    },
    getText: () => selectionText(),
    setText: (str) => putText(str),
    versions: {
      save: async () => { await saveNow(); return { id: S.id, app: "sheets", name: S.name, data: serialize(), thumb: sheetThumb(S.active) }; },
      restore: async (v) => { if (!v?.data) return; commitEdit(); snapshot(); load(v.data, { keepView: true }); scheduleSave(); toast("Version restored. Undo brings back what you had."); },
    },
    projects: {
      save: async () => { await saveNow(); return { id: S.id, app: "sheets", name: S.name, data: serialize() }; },
      open: async (rec) => {
        if (rec?.id && rec.id === S.id && rec.data) { commitEdit(); snapshot(); load(rec.data, { keepView: true }); scheduleSave(); return; } // same project, newer content
        if (rec?.id) await openProject(rec.id); else if (rec?.data) await openState(rec.data, rec.name);
      },
    },
    bottom: {
      notes: true, outline: null, timer: true, fullscreen: true, help: true,
      zoom: { get: () => Math.round(Z * 100), set: (pct) => setZoom(pct), min: 50, max: 200 },
      pages: {
        count: () => S.wb?.sheets.length || 1, current: () => S.active, go: (i) => switchSheet(i), add: () => addSheet(), thumb: (i) => sheetThumb(i),
        id: (i) => S.wb?.sheets[i]?.id ?? i,
        move: (from, to) => { if (from === to || !S.wb.sheets[from] || !S.wb.sheets[to]) return; commitEdit(); snapshot(); S.wb.moveSheet(from, to); S.active = to; renderTabs(); layout(); render(); renderCharts(); afterChange(); },
        duplicate: (i) => duplicateSheet(i),
        remove: (i) => deleteSheet(i),
      },
    },
    shortcuts: [["Ctrl+Z / Ctrl+Y", "Undo / redo"], ["Ctrl+B / Ctrl+I", "Bold / italic"], ["Ctrl+C / Ctrl+V", "Copy / paste cells"], ["Ctrl+F", "Find and replace"], ["F2 or double-click", "Edit a cell"], ["Enter / Tab", "Save and move down / right"], ["Alt+Enter", "New line in a cell"], ["Ctrl+S", "Save now"]],
    setMode: (m) => setMode(m),
  });
  document.body.classList.add("shelled");
  // The frame is mounted before the first workbook is loaded: only lay out once there is one.
  requestAnimationFrame(() => { if (S.wb) { layout(); render(); } });
  return true;
}

let toastTimer = null;
function toast(msg, ms = 3400) { if (shell?.toast) { shell.toast(msg, ms); return; } const t = els.toast; t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); }

/* ---------------- start ---------------- */

async function start() {
  const q = new URLSearchParams(location.search);
  let opened = false;
  try { await mountFrame(); } catch (e) { console.error(e); shell = null; }
  try {
    if (q.get("id")) { const p = await getProject(q.get("id")); if (p && p.app === "sheets") { S.id = p.id; load(p.data); opened = true; setSaveState("Saved"); } }
    if (!opened && q.get("template")) { const T = await import("./templates.js"); try { load(T.buildTemplate(q.get("template"))); opened = true; scheduleSave(); } catch {} }
    if (!opened && !q.has("new")) { const list = await listProjects("sheets"); if (list[0]) { S.id = list[0].id; load(list[0].data); opened = true; setSaveState("Saved"); } }
  } catch { /* storage blocked: start empty */ }
  if (!opened) load({ name: "Untitled sheet", sheets: [{ name: "Sheet1" }] });
  shell?.setTitle?.(S.name);
  linkShell();
  if (q.get("template")) try { shell?.pushRecent?.(q.get("template")); } catch {}
  const mode = q.get("mode");
  if (mode === "insights") {
    if (!S.wb.usedRange(sheet()).rows) { const T = await import("./templates.js"); load(T.buildTemplate("sales-tracker")); S.id = null; scheduleSave(); }
    await showInsights();
  } else if (mode === "formulas") await showFormulas("build");
  S.ready = true;
  focusGrid();
}

window.adApp = {
  get ready() { return S.ready; },
  get state() { return serialize(); },
  get workbook() { return S.wb; },
  get projectId() { return S.id; },
  sheetNames: () => S.wb.sheets.map((s) => s.name),
  activeSheet: () => sheet().name,
  value(ref, sheetName) { const s = sheetName ? S.wb.sheet(sheetName) : sheet(), p = parseCellName(ref); return plain(S.wb.getValue(s, p.row, p.col)); },
  text(ref, sheetName) { const s = sheetName ? S.wb.sheet(sheetName) : sheet(), p = parseCellName(ref); return cellText(S.wb.getValue(s, p.row, p.col), styleAt(p.row, p.col, s)); },
  input(ref, sheetName) { const s = sheetName ? S.wb.sheet(sheetName) : sheet(), p = parseCellName(ref); return S.wb.getInput(s, p.row, p.col); },
  style(ref) { const p = parseCellName(ref); return styleAt(p.row, p.col); },
  selection: () => rangeName(S.sel.r1, S.sel.c1, S.sel.r2, S.sel.c2),
  select(ref) { const p = parseRangeName(ref); commitEdit(); setSel(p.r1, p.c1, p.r2, p.c2); ensureVisible(p.r1, p.c1); render(); },
  /** Screen position (centre) of a cell, scrolled into view. */
  cellRect(ref) {
    const p = parseCellName(ref);
    ensureVisible(p.row, p.col);
    render();
    const b = spacer.getBoundingClientRect(), q = rectOf(p.row, p.col, p.row, p.col);
    return { x: b.left + q.x + q.w / 2, y: b.top + q.y + q.h / 2, w: q.w, h: q.h };
  },
  charts: () => meta().charts.map((c) => ({ ...c })),
  exportXlsx: () => exportXlsxBytes(),
  exportCsv: () => sheetCsv(),
  flushSave: () => saveNow(),
  insights: () => S.lastInsights,
  openPanel: (name) => (name === "insights" ? showInsights() : name === "formulas" ? showFormulas("build") : name === "find" ? showFind() : showFilter()),
  get editing() { return !!S.edit; },
  get zoom() { return Math.round(Z * 100); },
  setZoom: (p) => setZoom(p),
  get shell() { return !!shell; },
  fileAction: (act) => fileAction(act),
  applyTemplate: (id) => applyTemplate(id),
  comment(ref) { const p = parseCellName(ref); return meta().comments.get(key(p.row, p.col)) || null; },
  merges: () => meta().merges.map((g) => rangeName(g.r1, g.c1, g.r2, g.c2)),
  get freeze() { return meta().freeze || 0; },
  /** Formula cells on every sheet: how many, how many give numbers, and any errors. */
  formulaStats() {
    const out = { formulas: 0, numbers: 0, errors: [] };
    for (const s of S.wb.sheets) for (const c of s.cells.values()) if (c.src) { out.formulas++; if (typeof c.value === "number") out.numbers++; if (c.value instanceof FormulaError) out.errors.push(`${s.name}!${cellName(c.r, c.c)} ${c.value.code}`); }
    return out;
  },
  colWidth: (c) => G.colX[c + 1] - G.colX[c],
  get freezeCols() { return meta().freezeCols || 0; },
  rules: () => meta().cf.map((x) => ({ range: x.range, op: x.op, v1: x.v1, v2: x.v2, style: { ...x.style }, ...(x.op === "scale" ? { min: x.min, max: x.max } : {}) })),
  get noGrid() { return !!meta().noGrid; },
  dropdownColors: () => meta().dropdowns.map((d) => d.options.map((o) => o.color)),
  cellCss(ref) { const el = [...document.querySelectorAll(`#grid .c[data-ref="${String(ref).toUpperCase()}"]`)].pop(); return el ? el.getAttribute("style") : null; },
  dropdowns: () => meta().dropdowns.map((d) => ({ range: d.range, options: d.options.map((o) => o.label) })),
  hasImage(ref) { const p = parseCellName(ref); return meta().images.has(key(p.row, p.col)); },
  link(ref) { const p = parseCellName(ref); return styleAt(p.row, p.col)?.link || null; },
  exportPdf: () => exportPdfBytes(),
  putCellImage: (src) => putCellImage(src),
  bulkSvg: (kind, fields, color) => bulkSvg(kind, fields, color),
};
start().catch((e) => {
  console.error(e);
  if (!S.wb) load({ name: "Untitled sheet", sheets: [{ name: "Sheet1" }] });
  S.ready = true;
  toast("Something did not load fully. You can keep working: " + e.message);
});
