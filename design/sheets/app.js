// AsaanDesk Sheets: the grid (virtualised), editing, clipboard, fill handle, rows/columns, sheets, formatting,
// sort / filter / find, charts, files (CSV, XLSX, JSON), autosave, Magic Insights and Magic Formulas.
import { Workbook, cellName, colName, rangeName, parseCellName, parseRangeName, shiftFormula, moveIndex, moveSpan, FormulaError, parseLiteral, numToText, generalText } from "./formula.js";
import { FORMATS, displayText, fmtCode, isDateCode, fillSeries, sortRows, looksLikeHeader, toTSV, parseTSV, chartData } from "./model.js";
import { parseCSV, detectDelimiter, toCSV } from "./csv.js";
import { saveProject, listProjects, getProject, uid } from "../shared/store.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";

const $ = (id) => document.getElementById(id);
const KM = 16384, key = (r, c) => r * KM + c, unkey = (k) => [Math.floor(k / KM), k % KM];
const DEF_W = 100, DEF_H = 25, MIN_W = 28, MIN_H = 16, BAR_H = 37;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const plain = (v) => (v instanceof FormulaError ? v.code : v);
const els = {};
/** Runs an async action from a click; any failure becomes a friendly message instead of an uncaught error. */
const safe = (fn) => (...a) => Promise.resolve().then(() => fn(...a)).catch((e) => { console.error(e); toast("Sorry, something went wrong: " + (e?.message || e)); });
for (const id of ["docName", "saveState", "newBtn", "fileBtn", "fileMenu", "recentList", "csvInput", "xlsxInput", "jsonInput", "toolbar", "undoBtn", "redoBtn", "fmtSelect", "boldBtn", "italicBtn", "textColor", "textSwatch", "fillColor", "fillSwatch", "clearFmtBtn", "wrapBtn", "sortAsc", "sortDesc", "filterBtn", "findBtn", "rowsBtn", "rowsMenu", "chartBtn", "insightsBtn", "formulasBtn", "nameBox", "formulaInput", "grid", "corner", "colHead", "colHeadIn", "rowHead", "rowHeadIn", "scroller", "spacer", "cellLayer", "selBox", "fillHandle", "activeBox", "fillPreview", "copyAnts", "chartLayer", "cellInput", "fnHint", "side", "sideTitle", "sideClose", "sideBody", "addSheet", "tabs", "status", "ctxMenu", "gallery", "galleryCards", "toast"]) els[id] = $(id);
const { scroller, spacer, cellInput, formulaInput } = els;

/* ---------------- state ---------------- */

const S = {
  wb: null, metas: new WeakMap(), active: 0,
  sel: { ar: 0, ac: 0, er: 0, ec: 0, r1: 0, c1: 0, r2: 0, c2: 0 },
  edit: null, point: null, hint: null, tabStart: null,
  id: null, name: "Untitled sheet", past: [], future: [], clip: null,
  panel: null, lastInsights: null, ready: false,
};
const sheet = () => S.wb.sheets[S.active];
function meta(s = sheet()) {
  let m = S.metas.get(s);
  if (!m) { m = { styles: new Map(), colW: new Map(), rowH: new Map(), autoH: new Set(), charts: [], filter: null, hidden: new Set(), view: null }; S.metas.set(s, m); }
  return m;
}
const styleAt = (r, c, s = sheet()) => meta(s).styles.get(key(r, c)) || null;

/* ---------------- geometry and rendering ---------------- */

const G = { colX: new Float64Array(1), rowY: new Float64Array(1), rows: 0, cols: 0 };
function geometryFor(s) {
  const m = meta(s), rows = s.rows, cols = s.cols;
  const colX = new Float64Array(cols + 1), rowY = new Float64Array(rows + 1);
  for (let c = 0; c < cols; c++) colX[c + 1] = colX[c] + (m.colW.get(c) ?? DEF_W);
  for (let r = 0; r < rows; r++) rowY[r + 1] = rowY[r] + (m.hidden.has(r) ? 0 : m.rowH.get(r) ?? DEF_H);
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
function render() {
  if (!S.wb) return;
  const s = sheet(), m = meta(s), wb = S.wb;
  const st = scroller.scrollTop, sl = scroller.scrollLeft, vw = scroller.clientWidth || 1200, vh = scroller.clientHeight || 800;
  const r0 = idxAt(G.rowY, G.rows, st), r1 = idxAt(G.rowY, G.rows, st + vh), c0 = idxAt(G.colX, G.cols, sl), c1 = idxAt(G.colX, G.cols, sl + vw);
  const out = [];
  for (let r = r0; r <= r1; r++) {
    const top = G.rowY[r], h = G.rowY[r + 1] - top;
    if (!h) continue;
    for (let c = c0; c <= c1; c++) {
      const left = G.colX[c];
      let w = G.colX[c + 1] - left;
      const v = wb.getValue(s, r, c), stl = m.styles.get(key(r, c));
      let cls = "c", css = "", text = "";
      if (v !== null && v !== undefined) {
        text = displayText(v, stl);
        const err = v instanceof FormulaError;
        const align = stl?.align || (err || typeof v === "boolean" ? "center" : typeof v === "number" ? "right" : "left");
        if (align === "right") cls += " n"; else if (align === "center") cls += " mid";
        if (err) cls += " e";
        if (stl?.wrap) cls += " w";
        else if (align === "left" && typeof v === "string" && text) {
          const need = textWidth(text, stl?.b) + 10;
          if (need > w) {
            let ext = w, cc = c + 1;
            while (ext < need && cc < G.cols && wb.getValue(s, r, cc) === null && !m.styles.get(key(r, cc))?.fill) { ext += G.colX[cc + 1] - G.colX[cc]; cc++; }
            if (ext > w) { cls += " ov"; w = ext - 1; if (!stl?.fill) css += "background:#fff;"; }
          }
        }
        if (wb.spillOf(s, r, c)) cls += " spill";
      }
      if (stl) { if (stl.fill) css += `background:${stl.fill};`; if (stl.b) css += "font-weight:700;"; if (stl.i) css += "font-style:italic;"; if (stl.color) css += `color:${stl.color};`; }
      out.push(`<div class="${cls}" data-ref="${colName(c)}${r + 1}" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;${css}"><span>${esc(text)}</span></div>`);
    }
  }
  els.cellLayer.innerHTML = out.join("");
  const { r1: sr1, c1: sc1, r2: sr2, c2: sc2 } = S.sel;
  const ch = [];
  for (let c = c0; c <= c1; c++) ch.push(`<div class="h${c >= sc1 && c <= sc2 ? " on" : ""}${m.filter && m.filter.col === c ? " filtered" : ""}" data-c="${c}" style="left:${G.colX[c]}px;width:${G.colX[c + 1] - G.colX[c]}px">${colName(c)}</div>`);
  els.colHeadIn.innerHTML = ch.join("");
  els.colHeadIn.style.transform = `translateX(${-sl}px)`;
  const rh = [];
  for (let r = r0; r <= r1; r++) {
    const h = G.rowY[r + 1] - G.rowY[r];
    if (!h) continue;
    rh.push(`<div class="h${r >= sr1 && r <= sr2 ? " on" : ""}${r > 0 && m.hidden.has(r - 1) ? " hidden-above" : ""}" data-r="${r}" style="top:${G.rowY[r]}px;height:${h}px">${r + 1}</div>`);
  }
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
  if (S.panel === "formulas" && S.formulasTab === "explain") refreshExplain();
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
  if ((r1 === r2 && c1 === c2) || (r2 - r1 + 1) * (c2 - c1 + 1) > 200000) { els.status.textContent = `${s.name} · ${G.rows.toLocaleString("en-US")} rows`; return; }
  let n = 0, sum = 0, filled = 0;
  const used = S.wb.usedRange(s);
  for (let r = r1; r <= Math.min(r2, used.rows - 1); r++) for (let c = c1; c <= Math.min(c2, used.cols - 1); c++) { const v = S.wb.getValue(s, r, c); if (v !== null) filled++; if (typeof v === "number") { n++; sum += v; } }
  const f = (x) => generalText(+x.toPrecision(10));
  els.status.textContent = n ? `Sum ${f(sum)} · Average ${f(sum / n)} · Count ${filled}` : `Count ${filled}`;
}

/* ---------------- toolbar state ---------------- */

els.fmtSelect.innerHTML = Object.entries(FORMATS).map(([id, f]) => `<option value="${id}">${esc(f.label)}</option>`).join("") + '<option value="custom" hidden>Custom</option>';
function syncToolbar() {
  const st = styleAt(S.sel.ar, S.sel.ac) || {};
  els.boldBtn.setAttribute("aria-pressed", String(!!st.b));
  els.italicBtn.setAttribute("aria-pressed", String(!!st.i));
  els.wrapBtn.setAttribute("aria-pressed", String(!!st.wrap));
  document.querySelectorAll("[data-align]").forEach((b) => b.classList.toggle("on", st.align === b.dataset.align));
  els.fmtSelect.value = !st.fmt ? "general" : FORMATS[st.fmt] ? st.fmt : "custom";
  if (st.color) els.textSwatch.style.background = st.color;
  if (st.fill) els.fillSwatch.style.background = st.fill;
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
      return { name: s.name, rows: s.rows, cols: s.cols, cells, styles, colW: Object.fromEntries(m.colW), rowH: Object.fromEntries(m.rowH), charts: m.charts.map((c) => ({ ...c })), filter: m.filter };
    }),
  };
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
    applyFilter(s);
  });
  S.name = state.name || S.name;
  els.docName.value = S.name;
  document.title = `${S.name} | AsaanDesk Sheets`;
  S.active = clamp(keepView ? prev.active : state.active ?? 0, 0, S.wb.sheets.length - 1);
  S.edit = null; S.point = null;
  layout();
  renderTabs();
  if (keepView) { setSel(prev.sel.ar, prev.sel.ac, prev.sel.er, prev.sel.ec); scroller.scrollTop = prev.top; scroller.scrollLeft = prev.left; }
  else { setSel(0, 0); scroller.scrollTop = 0; scroller.scrollLeft = 0; }
  render();
  renderCharts();
  updateUndo();
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
function setSaveState(t) { els.saveState.textContent = t; }
function scheduleSave() { setSaveState("Saving…"); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow(), 700); }
async function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const run = async () => {
    try {
      const rec = await saveProject({ id: S.id || undefined, app: "sheets", name: S.name, data: serialize() });
      S.id = rec.id;
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
  if (snap) snapshot();
  const m = meta(s);
  for (const it of list) {
    const k = key(it.r, it.c), cur = m.styles.get(k);
    if (it.style !== undefined) { if (it.style && Object.keys(it.style).length) m.styles.set(k, { ...it.style }); else m.styles.delete(k); continue; }
    const input = String(it.input ?? "");
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
  for (const [k, st] of m.styles) if (st.wrap) { const r = Math.floor(k / KM); if (rows.has(r)) { if (!byRow.has(r)) byRow.set(r, []); byRow.get(r).push([k % KM, st]); } }
  if (!byRow.size && ![...rows].some((r) => m.autoH.has(r))) return;
  let changed = false;
  for (const r of rows) {
    if (m.rowH.has(r) && !m.autoH.has(r)) continue;
    let lines = 1;
    for (const [c, st] of byRow.get(r) || []) {
      const v = S.wb.getValue(s, r, c);
      if (v === null) continue;
      const w = (m.colW.get(c) ?? DEF_W) - 10;
      const n = String(displayText(v, st)).split("\n").reduce((a, line) => a + Math.max(1, Math.ceil(textWidth(line, st.b) / Math.max(20, w))), 0);
      lines = Math.max(lines, n);
    }
    const h = lines > 1 ? Math.max(DEF_H, lines * 17 + 8) : null;
    if (h) { m.rowH.set(r, h); m.autoH.add(r); changed = true; }
    else if (m.autoH.has(r)) { m.rowH.delete(r); m.autoH.delete(r); changed = true; }
  }
  if (changed && s === sheet()) layout();
}
function clearSelection() {
  const { r1, c1, r2, c2 } = S.sel, s = sheet(), list = [];
  for (const cell of s.cells.values()) if (cell.r >= r1 && cell.r <= r2 && cell.c >= c1 && cell.c <= c2) list.push({ r: cell.r, c: cell.c, input: "" });
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
  if ("wrap" in patch) autoHeights(sheet(), new Set(Array.from({ length: r2 - r1 + 1 }, (_, i) => r1 + i)));
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
  const w = Math.max(q.w + 2, Math.min(560, Math.max(...lines.map((l) => textWidth(l))) + 24));
  const h = Math.max(q.h + 2, lines.length * 17 + 10);
  Object.assign(cellInput.style, { left: q.x - 1 + "px", top: q.y - 1 + "px", width: w + "px", height: h + "px" });
}
function beginEdit(mode, text, origin = "cell") {
  if (S.edit) return;
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
  const value = origin === "bar" ? formulaInput.value : cellInput.value;
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

cellInput.addEventListener("input", () => {
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
  if (m && !/^[A-Za-z]{1,3}\d+$/.test(m[1])) {
    const pre = m[1].toUpperCase(), list = Object.keys(CAT.FUNCTION_INFO).filter((n) => n.startsWith(pre)).slice(0, 6);
    if (list.length) { S.hint = { list, start: caret - m[1].length, end: caret, i: 0 }; html = list.map((n, i) => `<button type="button" data-fn="${n}" class="${i ? "" : "on"}"><b>${n}</b><small>${esc(CAT.FUNCTION_INFO[n].desc)}</small></button>`).join(""); }
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
els.fnHint.addEventListener("click", (e) => { const b = e.target.closest("[data-fn]"); if (b) acceptHint(b.dataset.fn); });

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
  const b = spacer.getBoundingClientRect();
  return { r: idxAt(G.rowY, G.rows, Math.max(0, y - b.top)), c: idxAt(G.colX, G.cols, Math.max(0, x - b.left)) };
}
function autoScroll(e) {
  const b = scroller.getBoundingClientRect();
  if (e.clientY > b.bottom - 16) scroller.scrollTop += 20; else if (e.clientY < b.top + 16) scroller.scrollTop -= 20;
  if (e.clientX > b.right - 16) scroller.scrollLeft += 20; else if (e.clientX < b.left + 16) scroller.scrollLeft -= 20;
}
spacer.addEventListener("mousedown", (e) => { if (!e.target.closest(".chart, .cell-input:not(.idle)")) e.preventDefault(); });
spacer.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".chart, .fill-handle, .fn-hint") || (S.edit && e.target === cellInput)) return;
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
const endDrag = () => { if (drag?.kind === "fill") fillEnd(); drag = null; };
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
    if (dbl) beginEdit("edit");
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
      const m = meta(), size = Math.round(Math.max(axis === "col" ? MIN_W : MIN_H, drag.s0 + d));
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

function closeMenus(except) {
  for (const [btn, menu] of [[els.fileBtn, els.fileMenu], [els.rowsBtn, els.rowsMenu]]) if (menu !== except) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  if (except !== els.ctxMenu) els.ctxMenu.hidden = true;
}
function toggleMenu(btn, menu) {
  const open = menu.hidden;
  closeMenus(menu);
  menu.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector("button")?.focus({ preventScroll: true });
  return open;
}
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".menu, .menu-wrap")) closeMenus(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { const open = [els.fileMenu, els.rowsMenu, els.ctxMenu].some((m) => !m.hidden); if (open) { closeMenus(); focusGrid(); } }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && e.target !== cellInput) { e.preventDefault(); commitEdit(); saveNow().then(() => toast("Saved in this browser")); }
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
  items.push("-", { id: "clear", label: "Clear contents", run: () => clearSelection() }, { id: "sortAz", label: "Sort A to Z", run: () => sortSel(true) }, { id: "sortZa", label: "Sort Z to A", run: () => sortSel(false) }, { id: "chart", label: "Insert chart", run: safe(() => insertChart()) });
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
  const rows = valuesOf(rg.r1, rg.c1, rg.r2, rg.c2);
  const dateCols = new Set(), colFmt = [];
  for (let j = 0; j <= rg.c2 - rg.c1; j++) {
    const fm = new Map();
    for (let r = rg.r1; r <= rg.r2; r++) { const f = styleAt(r, rg.c1 + j)?.fmt; if (f && typeof S.wb.getValue(s, r, rg.c1 + j) === "number") fm.set(f, (fm.get(f) || 0) + 1); }
    const top = [...fm.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    colFmt.push(top);
    if (top && isDateCode(fmtCode(top))) dateCols.add(j);
  }
  const prof = INS.profile(rows, { dateCols, startCol: rg.c1 });
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
    ${sugg ? `<h3>Chart ideas</h3>${sugg}` : ""}
    <div class="ai-line" id="aiSummary">${aiReady() ? '<button class="btn primary" type="button" id="aiSumBtn">✦ Write a short summary with AI</button><div id="aiSumOut"></div>' : "<b>AI summary:</b> coming soon. Everything above was worked out on this device; nothing was sent anywhere."}</div>`;
  els.sideBody.querySelectorAll("[data-sug]").forEach((b) => (b.onclick = safe(() => {
    const sg = prof.suggestions[+b.dataset.sug];
    if (sg.data) insertChart({ data: sg.data, kind: sg.kind, title: sg.title, near: rg });
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
  const tabs = [["find", "Find"], ["build", "Build"], ["explain", "Explain"], ["ai", "Describe (AI)"]];
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
    if (!aiReady()) {
      comingSoon(body, { title: "Describe it in words", what: "Type what you need, like “total sales for Lahore in March”, and AsaanDesk AI will write the formula for you.", offline: "Until then, Find, Build and Explain all work right now on this device." });
      return;
    }
    body.innerHTML = `<label class="field">What do you want to work out? <textarea id="aiAsk" placeholder="e.g. total of column C where column B is Lahore"></textarea></label><div class="actions"><button class="btn primary" type="button" id="aiAskBtn">✦ Write the formula</button></div><div id="aiAskOut" class="preview"></div>`;
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
      return { chartPrims: charts.chartPrims, primsToSvg: vector.primsToSvg };
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
  const spec = { kind: ch.kind, title: withTitle ? ch.title : "", labels: d.labels, series: d.series, showValues: ch.kind === "bar" && d.labels.length * d.series.length <= 14 ? true : undefined };
  return lib.primsToSvg(lib.chartPrims(spec, w, h), w, h);
}
function renderCharts() { return drawCharts().catch((e) => console.error(e)); }
async function drawCharts() {
  const s = sheet(), m = meta(s);
  const want = new Set(m.charts.map((c) => c.id));
  for (const el of [...els.chartLayer.children]) if (!want.has(el.dataset.id)) el.remove();
  if (!m.charts.length) return;
  let lib;
  try { lib = await loadCharts(); } catch {
    for (const ch of m.charts) { const el = chartEl(ch); el.querySelector(".chart-body").innerHTML = '<div class="msg">The chart drawing tools could not load. Check your internet connection and try again.</div>'; }
    return;
  }
  if (sheet() !== s) return;
  for (const ch of m.charts) {
    if (ch.x === undefined) {
      const p = parseCellName(ch.at || "") || { row: 0, col: Math.min(G.cols - 1, 6) };
      ch.x = G.colX[clamp(p.col, 0, G.cols)]; ch.y = G.rowY[clamp(p.row, 0, G.rows)];
    }
    const el = chartEl(ch);
    Object.assign(el.style, { left: ch.x + "px", top: ch.y + "px", width: ch.w + "px", height: ch.h + "px" });
    el.setAttribute("aria-label", `${ch.kind} chart: ${ch.title || "untitled"}`);
    const title = el.querySelector(".chart-title");
    if (document.activeElement !== title) title.value = ch.title || "";
    el.querySelector(".chart-kind").value = ch.kind;
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
  el.innerHTML = `<div class="chart-bar" title="Drag to move"><input class="chart-title" type="text" aria-label="Chart title" placeholder="Chart title"><select class="chart-kind" aria-label="Chart type"><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option><option value="donut">Donut</option></select><button type="button" data-cact="svg" title="Download as SVG">SVG</button><button type="button" data-cact="png" title="Download as PNG picture">PNG</button><button type="button" data-cact="del" aria-label="Delete chart" title="Delete chart">✕</button></div><div class="chart-body"></div><div class="chart-resize" title="Drag to resize"></div>`;
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
      const dx = ev.clientX - p0.x, dy = ev.clientY - p0.y;
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
  const s = sheet();
  let near = opts.near || null, range = opts.range || null;
  if (!opts.data && !opts.cols && !range) {
    const rg = workRange();
    if (rg.r1 === rg.r2 && rg.c1 === rg.c2 && S.wb.getValue(s, rg.r1, rg.c1) === null) { toast("Select the cells with your labels and numbers first."); return; }
    range = rangeName(rg.r1, rg.c1, rg.r2, rg.c2);
    near = rg;
  }
  const ch = { id: uid(), kind: opts.kind || "bar", title: opts.title || "", w: 440, h: 280 };
  if (opts.data) ch.data = opts.data; else if (opts.cols) Object.assign(ch, { cols: opts.cols, r1: opts.r1, r2: opts.r2, noLabels: !!opts.noLabels }); else ch.range = range;
  if (!ch.title) { const d = chartSource(ch, s); ch.title = d.series.length && d.series[0].name !== "Value" ? d.series.map((x) => x.name).join(", ") : "Chart"; }
  const rg = near || { r1: S.sel.r1, c2: S.sel.c2 };
  ch.x = Math.max(0, Math.min(G.colX[Math.min(G.cols, rg.c2 + 1)] + 24, G.colX[G.cols] - ch.w - 8));
  ch.y = G.rowY[rg.r1];
  snapshot();
  meta().charts.push(ch);
  await renderCharts();
  scroller.scrollLeft = Math.max(0, Math.min(scroller.scrollLeft, ch.x - 20)) || scroller.scrollLeft;
  if (ch.x + ch.w > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = ch.x + ch.w - scroller.clientWidth + 20;
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
      return { name: s.name, cells, colW: Object.fromEntries(m.colW), rowH: Object.fromEntries(m.rowH) };
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
    const T = await import("./templates.js");
    els.galleryCards.insertAdjacentHTML("beforeend", T.TEMPLATES.map((t) => `<button type="button" class="card" data-template="${t.id}"><span class="mini" style="background:${t.color}">${"<i></i>".repeat(8)}</span>${esc(t.name)}<small>${esc(t.desc)}</small></button>`).join(""));
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

/* ---------------- toolbar wiring ---------------- */

els.undoBtn.addEventListener("click", undo);
els.redoBtn.addEventListener("click", redo);
els.boldBtn.addEventListener("click", () => applyStyle({ b: !(styleAt(S.sel.ar, S.sel.ac)?.b) }));
els.italicBtn.addEventListener("click", () => applyStyle({ i: !(styleAt(S.sel.ar, S.sel.ac)?.i) }));
els.wrapBtn.addEventListener("click", () => applyStyle({ wrap: !(styleAt(S.sel.ar, S.sel.ac)?.wrap) }));
els.textColor.addEventListener("change", (e) => { els.textSwatch.style.background = e.target.value; applyStyle({ color: e.target.value }); });
els.fillColor.addEventListener("change", (e) => { els.fillSwatch.style.background = e.target.value; applyStyle({ fill: e.target.value }); });
els.clearFmtBtn.addEventListener("click", clearFormats);
document.querySelectorAll("[data-align]").forEach((b) => b.addEventListener("click", () => applyStyle({ align: styleAt(S.sel.ar, S.sel.ac)?.align === b.dataset.align ? undefined : b.dataset.align })));
els.fmtSelect.addEventListener("change", () => { if (els.fmtSelect.value !== "custom") applyStyle({ fmt: els.fmtSelect.value }); focusGrid(); });
els.sortAsc.addEventListener("click", () => sortSel(true));
els.sortDesc.addEventListener("click", () => sortSel(false));
els.filterBtn.addEventListener("click", () => (S.panel === "filter" ? closeSide() : showFilter()));
els.findBtn.addEventListener("click", () => (S.panel === "find" ? closeSide() : showFind()));
els.rowsBtn.addEventListener("click", () => toggleMenu(els.rowsBtn, els.rowsMenu));
els.rowsMenu.addEventListener("click", (e) => { const b = e.target.closest("[data-struct]"); if (!b) return; closeMenus(); structure(b.dataset.struct); });
els.chartBtn.addEventListener("click", safe(() => insertChart()));
els.insightsBtn.addEventListener("click", safe(() => { S.insightsRange = null; return showInsights(); }));
els.formulasBtn.addEventListener("click", safe(() => (S.panel === "formulas" ? closeSide() : showFormulas())));
els.docName.addEventListener("change", () => { S.name = els.docName.value.trim() || "Untitled sheet"; els.docName.value = S.name; document.title = `${S.name} | AsaanDesk Sheets`; scheduleSave(); });
els.docName.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); els.docName.blur(); focusGrid(); } });
for (const b of els.toolbar.querySelectorAll("button, select")) b.addEventListener("pointerdown", () => { if (S.edit && b.id !== "undoBtn") commitEdit(); });
els.toolbar.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b && !b.closest(".menu-wrap") && !["insightsBtn", "formulasBtn", "findBtn", "filterBtn"].includes(b.id)) setTimeout(focusGrid, 0);
});

let toastTimer = null;
function toast(msg, ms = 3400) { const t = els.toast; t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); }

/* ---------------- start ---------------- */

async function start() {
  const q = new URLSearchParams(location.search);
  let opened = false;
  try {
    if (q.get("id")) { const p = await getProject(q.get("id")); if (p && p.app === "sheets") { S.id = p.id; load(p.data); opened = true; setSaveState("Saved"); } }
    if (!opened && q.get("template")) { const T = await import("./templates.js"); try { load(T.buildTemplate(q.get("template"))); opened = true; scheduleSave(); } catch {} }
    if (!opened && !q.has("new")) { const list = await listProjects("sheets"); if (list[0]) { S.id = list[0].id; load(list[0].data); opened = true; setSaveState("Saved"); } }
  } catch { /* storage blocked: start empty */ }
  if (!opened) load({ name: "Untitled sheet", sheets: [{ name: "Sheet1" }] });
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
};
start().catch((e) => {
  console.error(e);
  if (!S.wb) load({ name: "Untitled sheet", sheets: [{ name: "Sheet1" }] });
  S.ready = true;
  toast("Something did not load fully. You can keep working: " + e.message);
});
