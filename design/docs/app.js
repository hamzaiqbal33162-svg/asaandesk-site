// AsaanDesk Docs: a document editor (contenteditable page + a clean model in model.js).
// Big libraries load only when used: docx (Word export), mammoth (Word import), pdf-lib + fonts (PDF export).
import { htmlToModel, modelToHtml, runsToHtml, escHtml, newDoc, normalizeDoc, countWords, outline, exportHtmlPage, modelToMarkdown, modelToText, mdToModel, textToModel, mapDocText, isRtlLang, PAGE_SIZES, fontKeyFromCss } from "./model.js";
import { FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff } from "../shared/store.js";
import { aiText, aiStatus, comingSoon } from "../shared/ai.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const editor = $("#editor"), viewer = $("#viewer"), paper = $("#paper"), paperWrap = $("#paperWrap");
const isPhone = () => matchMedia("(max-width: 640px)").matches;

const state = { id: null, doc: newDoc(), zoom: 1, dirty: false, saving: null, lastSaved: 0, aiBusy: false };
let savedRange = null;

/* ---------------- small UI helpers ---------------- */
let toastTimer = 0;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function download(data, name, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const scripts = new Map();
function loadScript(src) {
  if (!scripts.has(src)) scripts.set(src, new Promise((res, rej) => {
    const s = Object.assign(document.createElement("script"), { src, async: true });
    s.onload = () => res();
    s.onerror = () => { scripts.delete(src); rej(new Error("Could not load " + src.split("/").pop() + ". Check your connection and try again.")); };
    document.head.append(s);
  }));
  return scripts.get(src);
}
const safeName = (s) => (String(s || "document").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "document").slice(0, 80);
function exec(cmd, val = null) { try { return document.execCommand(cmd, false, val); } catch { return false; } }

/* ---------------- selection ---------------- */
function inEditor(node) { return !!node && (node === editor || editor.contains(node)); }
function rememberSelection() {
  const sel = getSelection();
  if (sel.rangeCount && inEditor(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
}
function restoreSelection() {
  editor.focus({ preventScroll: true });
  if (savedRange && inEditor(savedRange.startContainer)) {
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  } else placeCaret(editor.lastElementChild || editor, false);
}
function placeCaret(el, atStart = true) {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(atStart);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
  savedRange = r.cloneRange();
}
function closestIn(node, sel) {
  let n = node?.nodeType === 3 ? node.parentNode : node;
  while (n && n !== editor) { if (n.matches?.(sel)) return n; n = n.parentNode; }
  return null;
}
const caretNode = () => { const s = getSelection(); return s.rangeCount && inEditor(s.anchorNode) ? s.anchorNode : savedRange?.startContainer || null; };
/** Top-level-ish blocks touched by the current selection. */
function selectedBlocks(sel = "p,h1,h2,h3,li,blockquote,pre") {
  const r = savedRange;
  if (!r) return [];
  const all = $$(sel, editor).filter((b) => !b.closest("td,th") || b.matches("li"));
  const hit = all.filter((b) => r.intersectsNode(b));
  // Prefer innermost blocks (li over the blockquote around it, etc.).
  const inner = hit.filter((b) => !hit.some((o) => o !== b && b.contains(o)));
  if (inner.length) return inner;
  const one = closestIn(r.startContainer, sel);
  return one ? [one] : [];
}

/* ---------------- undo / redo (snapshots, so every change can be undone) ---------------- */
const hist = { undo: [], redo: [], cur: null, timer: 0 };
const imgTokens = new Map(), imgBack = new Map();
function tokenize(html) {
  return html.replace(/src="(data:[^"]{200,})"/g, (m, u) => { if (!imgTokens.has(u)) { const id = "adimg:" + imgTokens.size; imgTokens.set(u, id); imgBack.set(id, u); } return `src="${imgTokens.get(u)}"`; });
}
const untokenize = (html) => html.replace(/src="(adimg:\d+)"/g, (m, id) => `src="${imgBack.get(id) || ""}"`);
function nodePath(node) {
  const path = [];
  while (node && node !== editor) { const p = node.parentNode; if (!p) return null; path.unshift([...p.childNodes].indexOf(node)); node = p; }
  return node === editor ? path : null;
}
function fromPath(path) { let n = editor; for (const i of path || []) { n = n?.childNodes[i]; if (!n) return null; } return n; }
function capture() {
  const sel = getSelection();
  let caret = null;
  if (sel.rangeCount && inEditor(sel.anchorNode)) { const r = sel.getRangeAt(0); caret = { s: nodePath(r.startContainer), so: r.startOffset, e: nodePath(r.endContainer), eo: r.endOffset }; }
  return { html: tokenize(editor.innerHTML).replace(/ class="sel"/g, ""), caret };
}
function histReset() { clearTimeout(hist.timer); hist.undo = []; hist.redo = []; hist.cur = capture(); updateUndoButtons(); }
function histCommit() {
  clearTimeout(hist.timer);
  hist.timer = 0;
  const s = capture();
  if (!hist.cur) { hist.cur = s; return; }
  if (s.html === hist.cur.html) { hist.cur.caret = s.caret; return; }
  hist.undo.push(hist.cur);
  if (hist.undo.length > 150) hist.undo.shift();
  hist.cur = s;
  hist.redo = [];
  updateUndoButtons();
}
function histSchedule() { clearTimeout(hist.timer); hist.timer = setTimeout(histCommit, 700); }
function restoreSnap(s) {
  editor.innerHTML = untokenize(s.html);
  editor.focus({ preventScroll: true });
  try {
    const c = s.caret, a = c && fromPath(c.s), b = c && fromPath(c.e);
    if (a && b) { const r = document.createRange(); r.setStart(a, Math.min(c.so, a.nodeType === 3 ? a.length : a.childNodes.length)); r.setEnd(b, Math.min(c.eo, b.nodeType === 3 ? b.length : b.childNodes.length)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  } catch { /* caret is a nicety */ }
  rememberSelection();
  afterChange(false);
}
function undo() { if (hist.timer) histCommit(); const prev = hist.undo.pop(); if (!prev) return; hist.redo.push(hist.cur); hist.cur = prev; restoreSnap(prev); updateUndoButtons(); }
function redo() { if (hist.timer) histCommit(); const next = hist.redo.pop(); if (!next) return; hist.undo.push(hist.cur); hist.cur = next; restoreSnap(next); updateUndoButtons(); }
function updateUndoButtons() { $('[data-cmd="undo"]').disabled = !hist.undo.length && !hist.timer; $('[data-cmd="redo"]').disabled = !hist.redo.length; }

/** Runs an editing step as one undoable change. */
function change(fn) {
  restoreSelection();
  histCommit();
  const out = fn();
  normalizeEditor();
  histCommit();
  rememberSelection();
  afterChange(true);
  refreshToolbar();
  return out;
}

/* ---------------- model sync, counts, autosave ---------------- */
let syncTimer = 0;
function afterChange(soon = true) { clearTimeout(syncTimer); syncTimer = setTimeout(syncModel, soon ? 200 : 0); markDirty(); }
function syncModel() {
  clearTimeout(syncTimer);
  syncTimer = 0;
  state.doc.blocks = htmlToModel(editor);
  if (!state.doc.blocks.length) state.doc.blocks = [{ type: "p", runs: [] }];
  updateCounts();
  if (!$("#panelOutline").hidden) renderOutline();
  editor.classList.toggle("is-empty", state.doc.blocks.length === 1 && state.doc.blocks[0].type === "p" && !state.doc.blocks[0].runs.length);
  return state.doc;
}
function updateCounts() {
  const c = countWords(state.doc);
  $("#wordCount").textContent = `${c.words.toLocaleString()} word${c.words === 1 ? "" : "s"}`;
  $("#charCount").textContent = `${c.chars.toLocaleString()} characters`;
}
let saveTimer = 0;
function markDirty() { state.dirty = true; setSaveState("Saving…"); clearTimeout(saveTimer); saveTimer = setTimeout(() => flushSave(), 800); }
function setSaveState(t, err = false) { const s = $("#saveState"); s.textContent = t; s.classList.toggle("err", err); }
async function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  if (syncTimer) syncModel();
  if (state.saving) await state.saving.catch(() => {});
  const doc = state.doc;
  doc.title = $("#docTitle").value.trim() || "Untitled document";
  state.saving = (async () => {
    const rec = await saveProject({ id: state.id || undefined, app: "docs", name: doc.title, data: JSON.parse(JSON.stringify(doc)), thumb: modelToText(doc).slice(0, 160) });
    state.id = rec.id;
    state.dirty = false;
    state.lastSaved = rec.updated;
    const u = new URL(location.href);
    if (u.searchParams.get("id") !== rec.id) { ["template", "mode", "new", "handoff"].forEach((k) => u.searchParams.delete(k)); u.searchParams.set("id", rec.id); history.replaceState(null, "", u); }
    setSaveState("Saved");
  })();
  try { await state.saving; } catch (e) { setSaveState("Not saved", true); toast("Could not save in this browser (storage may be blocked)."); console.warn(e); }
  finally { state.saving = null; }
  return state.id;
}
addEventListener("pagehide", () => { if (state.dirty) flushSave(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && state.dirty) flushSave(); });

/* ---------------- rendering ---------------- */
function normalizeEditor() {
  // Bare text or inline nodes directly in the page become paragraphs; the page always ends with a paragraph.
  for (const n of [...editor.childNodes]) {
    if ((n.nodeType === 3 && n.nodeValue.trim()) || (n.nodeType === 1 && /^(SPAN|B|I|U|S|A|FONT|STRONG|EM|CODE|IMG)$/.test(n.tagName))) {
      // Keep the caret where it was while the node moves into its new paragraph.
      const sel = getSelection(), r = sel.rangeCount ? sel.getRangeAt(0) : null;
      const keep = r && n.contains(r.startContainer) && n.contains(r.endContainer) ? [r.startContainer, r.startOffset, r.endContainer, r.endOffset] : null;
      const p = document.createElement("p");
      n.replaceWith(p);
      p.append(n);
      if (keep) { const k = document.createRange(); k.setStart(keep[0], keep[1]); k.setEnd(keep[2], keep[3]); sel.removeAllRanges(); sel.addRange(k); }
    }
  }
  // Font sizes picked with nothing selected apply to the next typed letters (Chrome marks them xxx-large).
  if (state.pendingSize) for (const el of $$('span[style*="xxx-large"]', editor)) el.style.fontSize = state.pendingSize + "pt";
  // Tables, code, rules, pictures and page breaks always have a paragraph after them, so the caret can get below.
  const last = editor.lastElementChild;
  if (!last || /^(TABLE|PRE|HR|FIGURE)$/.test(last.tagName) || last.classList.contains("pb") || (last.tagName === "P" && last.querySelector("img") && !last.textContent.trim())) editor.append(Object.assign(document.createElement("p"), { innerHTML: "<br>" }));
}
function renderDoc() {
  editor.innerHTML = modelToHtml(state.doc.blocks, { editor: true }) || "<p><br></p>";
  normalizeEditor();
  $("#docTitle").value = state.doc.title;
  document.title = `${state.doc.title} | AsaanDesk Docs`;
  applyPage();
  updateCounts();
  editor.classList.toggle("is-empty", !editor.textContent.trim() && !editor.querySelector("img,table,hr,.pb"));
  if (!$("#panelOutline").hidden) renderOutline();
  ensureFont(state.doc.font);
  savedRange = null;
  histReset();
}
function setDoc(doc, { id = null } = {}) {
  state.doc = normalizeDoc(doc);
  state.id = id;
  renderDoc();
  deselectImage();
  closeLink();
}
function applyPage() {
  const p = state.doc.page, ps = PAGE_SIZES[p.size] || PAGE_SIZES.A4;
  const root = document.documentElement.style;
  root.setProperty("--pw", ps.w + "mm");
  root.setProperty("--ph", ps.h + "mm");
  root.setProperty("--m", p.margin + "mm");
  root.setProperty("--doc-font", (FONT_FAMILIES[state.doc.font] || FONT_FAMILIES.calibri).css);
  root.setProperty("--doc-size", (state.doc.size || 11) + "pt");
  $("#pageHead").textContent = p.header || "";
  $("#pageFoot").textContent = [p.footer, p.pageNumbers ? "Page 1" : ""].filter(Boolean).join("   ·   ");
  $("#pageInfo").textContent = `${ps.label} · ${Math.round(state.zoom * 100)}%`;
  $("#pageSize").value = p.size;
  $("#pageMargin").value = String(p.margin);
  $("#pageHeader").value = p.header || "";
  $("#pageFooter").value = p.footer || "";
  $("#pageNumbers").checked = p.pageNumbers !== false;
  $("#docFont").value = state.doc.font;
  // Printing: page size, margins, header, footer and page numbers through @page margin boxes.
  const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ") + '"';
  $("#printStyle").textContent = `@page { size: ${p.size === "Letter" ? "letter" : "A4"}; margin: ${p.margin}mm;
  ${p.header ? `@top-center { content: ${q(p.header)}; font: 9pt sans-serif; color: #6a7389; }` : ""}
  @bottom-center { content: ${p.footer ? q(p.footer + (p.pageNumbers ? "    " : "")) : '""'}${p.pageNumbers ? ' "Page " counter(page) " of " counter(pages)' : ""}; font: 9pt sans-serif; color: #6a7389; } }`;
}
function applyZoom() {
  let z = $("#zoom").value;
  if (z === "fit") { const avail = viewer.clientWidth - 40; z = Math.max(0.3, Math.min(2, avail / paper.offsetWidth)); }
  state.zoom = +z || 1;
  paperWrap.style.zoom = String(state.zoom);
  $("#pageInfo").textContent = `${(PAGE_SIZES[state.doc.page.size] || PAGE_SIZES.A4).label} · ${Math.round(state.zoom * 100)}%`;
  positionImgHandle();
}

/* ---------------- toolbar state ---------------- */
function refreshToolbar() {
  const node = caretNode();
  for (const c of ["bold", "italic", "underline", "strikeThrough"]) { let on = false; try { on = document.queryCommandState(c); } catch {} $(`[data-cmd="${c}"]`).classList.toggle("on", !!on && inEditor(node)); }
  const blk = closestIn(node, "h1,h2,h3,pre,blockquote,p,li");
  const type = !blk ? "p" : /^H[1-3]$/.test(blk.tagName) ? blk.tagName.toLowerCase() : blk.closest("pre") ? "code" : blk.closest("blockquote") ? "quote" : "p";
  $("#blockType").value = type;
  const li = closestIn(node, "li");
  const list = li?.parentElement;
  $('[data-cmd="bullet"]').classList.toggle("on", !!list && list.tagName === "UL" && !list.classList.contains("check"));
  $('[data-cmd="number"]').classList.toggle("on", !!list && list.tagName === "OL");
  $('[data-cmd="check"]').classList.toggle("on", !!list && list.classList.contains("check"));
  const el = node ? (node.nodeType === 3 ? node.parentElement : node) : null;
  if (el && inEditor(el)) {
    const cs = getComputedStyle(el);
    const fk = fontKeyFromCss(cs.fontFamily);
    if (fk) $("#fontFamily").value = fk;
    const pt = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2;
    const sizeSel = $("#fontSize");
    if (![...sizeSel.options].some((o) => +o.value === pt)) sizeSel.add(new Option(String(pt), String(pt)));
    sizeSel.value = String(pt);
    const al = cs.textAlign === "start" ? (cs.direction === "rtl" ? "right" : "left") : cs.textAlign === "end" ? (cs.direction === "rtl" ? "left" : "right") : cs.textAlign;
    for (const [cmd, a] of [["justifyLeft", "left"], ["justifyCenter", "center"], ["justifyRight", "right"], ["justifyFull", "justify"]]) $(`[data-cmd="${cmd}"]`).classList.toggle("on", al === a);
    const b = closestIn(node, "p,h1,h2,h3,li,blockquote");
    $('[data-cmd="rtl"]').classList.toggle("on", !!b && (b.closest("[dir]")?.getAttribute("dir") === "rtl"));
    $("#lineSpacing").value = b?.style.lineHeight && [...$("#lineSpacing").options].some((o) => o.value === b.style.lineHeight) ? b.style.lineHeight : "";
  }
  // Table tools while the caret is in a table.
  $("#tableTools").hidden = !closestIn(node, "td,th");
  updateUndoButtons();
}
document.addEventListener("selectionchange", () => {
  const sel = getSelection();
  if (!sel.rangeCount || !inEditor(sel.anchorNode)) return;
  rememberSelection();
  refreshToolbar();
  updateAiSel();
});

/* ---------------- formatting commands ---------------- */
function setBlockType(type) {
  change(() => {
    const blocks = selectedBlocks();
    // Leave lists first so a list item can become a heading or quote.
    if (blocks.some((b) => b.matches("li"))) { const l = blocks.find((b) => b.matches("li")).parentElement; exec(l.tagName === "OL" ? "insertOrderedList" : "insertUnorderedList"); rememberSelection(); }
    const bq = closestIn(caretNode(), "blockquote");
    if (type === "quote") { if (!bq) exec("formatBlock", "<blockquote>"); return; }
    if (bq) {
      // Out of the quote: its paragraphs move back into the page.
      const kids = [...bq.childNodes];
      const blocksIn = kids.some((k) => k.nodeType === 1 && /^(P|H1|H2|H3|PRE|UL|OL|TABLE|DIV)$/.test(k.tagName));
      let first;
      if (blocksIn) { first = kids.find((k) => k.nodeType === 1); bq.replaceWith(...kids); }
      else { first = document.createElement("p"); first.append(...kids); bq.replaceWith(first); }
      if (first) placeCaret(first, false);
      if (type === "p") return;
    }
    exec("formatBlock", type === "code" ? "<pre>" : `<${type}>`);
  });
}
function toggleList(kind) {
  change(() => {
    const li = closestIn(caretNode(), "li");
    const list = li?.parentElement;
    if (kind === "check") {
      if (list?.classList.contains("check")) { exec("insertUnorderedList"); return; }
      if (!list || list.tagName !== "UL") exec("insertUnorderedList");
      const ul = closestIn(getSelection().anchorNode, "li")?.parentElement;
      if (ul && ul.tagName === "UL") { ul.classList.add("check"); for (const x of ul.children) if (x.tagName === "LI" && !x.hasAttribute("data-checked")) x.setAttribute("data-checked", "false"); }
      return;
    }
    if (list?.classList.contains("check") && kind === "bullet") { list.classList.remove("check"); [...list.children].forEach((x) => x.removeAttribute("data-checked")); return; }
    exec(kind === "number" ? "insertOrderedList" : "insertUnorderedList");
    const ul = closestIn(getSelection().anchorNode, "li")?.parentElement;
    if (ul && !(kind === "bullet" && ul.tagName === "UL" && ul.classList.contains("check"))) { ul.classList.remove("check"); [...ul.children].forEach((x) => x.removeAttribute?.("data-checked")); }
  });
}
function indent(delta) {
  change(() => {
    if (closestIn(caretNode(), "li")) { exec(delta > 0 ? "indent" : "outdent"); return; }
    for (const b of selectedBlocks("p,h1,h2,h3,blockquote,pre")) {
      const n = Math.max(0, Math.min(8, (+b.dataset.indent || 0) + delta));
      if (n) { b.dataset.indent = n; b.style.marginLeft = n * 36 + "pt"; } else { delete b.dataset.indent; b.style.marginLeft = ""; }
    }
  });
}
function setLineSpacing(v) {
  change(() => { for (const b of selectedBlocks("p,h1,h2,h3,li,blockquote")) b.style.lineHeight = v || ""; });
}
function toggleRtl() {
  change(() => {
    const blocks = selectedBlocks("p,h1,h2,h3,li,blockquote");
    const on = !blocks.every((b) => b.getAttribute("dir") === "rtl");
    for (const b of blocks) { if (on) b.setAttribute("dir", "rtl"); else b.removeAttribute("dir"); }
  });
}
function withCss(fn) { exec("styleWithCSS", true); try { fn(); } finally { exec("styleWithCSS", false); } }
function setFontFamily(key) {
  const f = FONT_FAMILIES[key];
  if (!f) return;
  ensureFont(key); ensureFont(key, true); ensureFont(key, false, true);
  change(() => withCss(() => exec("fontName", f.css)));
}
function setFontSize(pt) {
  state.pendingSize = savedRange && savedRange.collapsed ? pt : 0;
  change(() => {
    withCss(() => exec("fontSize", "7"));
    for (const el of $$('span[style*="xxx-large"], font[size="7"]', editor)) {
      if (el.tagName === "FONT") { const s = document.createElement("span"); s.style.fontSize = pt + "pt"; s.append(...el.childNodes); el.replaceWith(s); }
      else el.style.fontSize = pt + "pt";
    }
  });
}
function insertHtml(html) { exec("insertHTML", html); }
function insertTable(rows = 3, cols = 3) {
  change(() => {
    const head = `<tr>${Array.from({ length: cols }, () => "<th><br></th>").join("")}</tr>`;
    const body = Array.from({ length: rows - 1 }, () => `<tr>${Array.from({ length: cols }, () => "<td><br></td>").join("")}</tr>`).join("");
    insertHtml(`<table class="ad-table" data-new="1"><tbody>${head}${body}</tbody></table><p><br></p>`);
    const t = editor.querySelector('table[data-new="1"]');
    if (t) { t.removeAttribute("data-new"); placeCaret(t.querySelector("th,td")); }
  });
}
function tableOp(op) {
  const cell = closestIn(caretNode(), "td,th");
  if (!cell) return;
  const tr = cell.parentElement, table = cell.closest("table");
  const ci = [...tr.children].indexOf(cell);
  const rows = [...table.querySelectorAll("tr")];
  const blankCell = (tag) => Object.assign(document.createElement(tag), { innerHTML: "<br>" });
  change(() => {
    if (op === "rowAbove" || op === "rowBelow") {
      const nr = document.createElement("tr");
      for (let i = 0; i < tr.children.length; i++) nr.append(blankCell("td"));
      if (op === "rowAbove" && tr === rows[0] && tr.querySelector("th")) tr.after(nr); else tr[op === "rowAbove" ? "before" : "after"](nr);
      placeCaret(nr.children[Math.min(ci, nr.children.length - 1)]);
    } else if (op === "colLeft" || op === "colRight") {
      for (const r of rows) { const ref = r.children[Math.min(ci, r.children.length - 1)]; const c = blankCell(ref?.tagName === "TH" ? "th" : "td"); ref ? ref[op === "colLeft" ? "before" : "after"](c) : r.append(c); }
      placeCaret(tr.children[op === "colLeft" ? ci : ci + 1]);
    } else if (op === "delRow") {
      if (rows.length <= 1) { removeTable(table); return; }
      const next = tr.nextElementSibling || tr.previousElementSibling;
      tr.remove();
      placeCaret(next.children[Math.min(ci, next.children.length - 1)]);
    } else if (op === "delCol") {
      if (tr.children.length <= 1) { removeTable(table); return; }
      for (const r of rows) r.children[ci]?.remove();
      placeCaret(tr.children[Math.min(ci, tr.children.length - 1)]);
    } else if (op === "header") {
      const first = rows[0];
      const toTh = !first.querySelector("th");
      for (const c of [...first.children]) { const n = document.createElement(toTh ? "th" : "td"); n.append(...c.childNodes); if (!n.childNodes.length) n.innerHTML = "<br>"; c.replaceWith(n); }
      placeCaret(first.children[Math.min(ci, first.children.length - 1)]);
    } else if (op === "delTable") removeTable(table);
  });
}
function removeTable(table) {
  const p = Object.assign(document.createElement("p"), { innerHTML: "<br>" });
  table.replaceWith(p);
  placeCaret(p);
  $("#tableTools").hidden = true;
}
function moveCell(dir) {
  const cell = closestIn(caretNode(), "td,th");
  if (!cell) return false;
  const cells = [...cell.closest("table").querySelectorAll("th,td")];
  let i = cells.indexOf(cell) + dir;
  if (i >= cells.length) { tableOp("rowBelow"); return true; }
  if (i < 0) i = 0;
  const target = cells[i];
  const r = document.createRange();
  r.selectNodeContents(target);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
  rememberSelection();
  return true;
}

/* ---------------- images ---------------- */
async function fileToDataUrl(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That picture could not be opened.")); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const keep = k === 1 && (file.type === "image/png" || file.type === "image/jpeg") && file.size < 2.5e6;
    if (keep) return { src: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); }), w: img.naturalWidth, h: img.naturalHeight };
    const c = Object.assign(document.createElement("canvas"), { width: Math.max(1, Math.round(img.naturalWidth * k)), height: Math.max(1, Math.round(img.naturalHeight * k)) });
    const g = c.getContext("2d");
    const png = file.type === "image/png" || file.type === "image/gif" || file.type === "image/webp";
    if (!png) { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(img, 0, 0, c.width, c.height);
    return { src: c.toDataURL(png ? "image/png" : "image/jpeg", 0.9), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}
async function insertImageFiles(files) {
  const list = [...files].filter((f) => /^image\//.test(f.type));
  if (!list.length) return;
  const items = [];
  for (const f of list) { try { items.push({ ...(await fileToDataUrl(f)), alt: f.name.replace(/\.[^.]+$/, "") }); } catch (e) { toast(e.message); } }
  if (!items.length) return;
  const maxW = Math.round(editor.clientWidth || 600);
  change(() => {
    const blk = closestIn(caretNode(), "td,th,li");
    const html = items.map((it) => `<img src="${it.src}" alt="${escHtml(it.alt).replace(/"/g, "&quot;")}" style="width:${Math.min(it.w, maxW, 640)}px">`).join("");
    insertHtml(blk ? html : `<p class="imgp">${html}</p><p><br></p>`);
  });
  toast(items.length === 1 ? "Picture added. Click it to resize." : `${items.length} pictures added.`);
}
let selImg = null;
function selectImage(img) {
  deselectImage();
  selImg = img;
  img.classList.add("sel");
  const r = document.createRange();
  r.selectNode(img);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  savedRange = r.cloneRange();
  $("#imgTools").hidden = false;
  const pct = Math.round((img.getBoundingClientRect().width / Math.max(1, editor.getBoundingClientRect().width)) * 100);
  $("#imgWidth").value = String(Math.max(10, Math.min(100, pct)));
  $("#imgWidthOut").textContent = $("#imgWidth").value + "%";
  positionImgHandle();
}
function deselectImage() {
  if (selImg) selImg.classList.remove("sel");
  selImg = null;
  $("#imgTools").hidden = true;
  $("#imgHandle").hidden = true;
}
function positionImgHandle() {
  const h = $("#imgHandle");
  if (!selImg || !selImg.isConnected) { h.hidden = true; return; }
  const r = selImg.getBoundingClientRect(), v = viewer.getBoundingClientRect();
  h.hidden = false;
  h.style.left = r.right - v.left + viewer.scrollLeft - 8 + "px";
  h.style.top = r.bottom - v.top + viewer.scrollTop - 8 + "px";
}
function setImgWidth(px) {
  if (!selImg) return;
  selImg.style.width = Math.max(24, Math.round(px)) + "px";
  selImg.style.height = "";
  selImg.removeAttribute("height");
  positionImgHandle();
}
function imgAction(act) {
  if (!selImg) return;
  const img = selImg;
  if (act === "delete") {
    change(() => { const p = img.closest(".imgp"); deselectImage(); if (p && p.querySelectorAll("img").length === 1 && !p.textContent.trim()) p.remove(); else img.remove(); });
    return;
  }
  change(() => {
    let p = img.closest("p");
    if (!p || p.closest("td,th,li")) return;
    p.style.textAlign = act === "left" ? "" : act;
  });
  selectImage(img);
}
{
  const h = $("#imgHandle");
  let start = null;
  h.addEventListener("pointerdown", (e) => { if (!selImg) return; e.preventDefault(); h.setPointerCapture(e.pointerId); histCommit(); start = { x: e.clientX, w: selImg.getBoundingClientRect().width / state.zoom }; });
  h.addEventListener("pointermove", (e) => { if (!start) return; setImgWidth(Math.min(editor.clientWidth, start.w + (e.clientX - start.x) / state.zoom)); });
  const end = () => { if (!start) return; start = null; histCommit(); afterChange(); if (selImg) selectImage(selImg); };
  h.addEventListener("pointerup", end);
  h.addEventListener("pointercancel", end);
  $("#imgWidth").addEventListener("input", (e) => { $("#imgWidthOut").textContent = e.target.value + "%"; setImgWidth((editor.clientWidth * +e.target.value) / 100); });
  $("#imgWidth").addEventListener("change", () => { histCommit(); afterChange(); });
  viewer.addEventListener("scroll", positionImgHandle, { passive: true });
  addEventListener("resize", () => { positionImgHandle(); if ($("#zoom").value === "fit") applyZoom(); });
}

/* ---------------- links ---------------- */
function openLink() {
  rememberSelection();
  const pop = $("#linkPop");
  const a = closestIn(caretNode(), "a");
  $("#linkUrl").value = a?.getAttribute("href") || "";
  $("#linkRemove").hidden = !a;
  const r = savedRange?.getBoundingClientRect();
  pop.hidden = false;
  pop.style.left = Math.max(12, Math.min(innerWidth - 340, (r?.left || 100))) + "px";
  pop.style.top = Math.min(innerHeight - 160, (r?.bottom || 120) + 8) + "px";
  $("#linkUrl").focus();
}
function closeLink() { $("#linkPop").hidden = true; }
function applyLink() {
  let url = $("#linkUrl").value.trim();
  if (!url) { closeLink(); return; }
  if (!/^(https?:|mailto:|tel:|#)/i.test(url)) url = (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(url) ? "mailto:" : "https://") + url;
  closeLink();
  change(() => {
    const a = closestIn(savedRange?.startContainer, "a");
    if (a && savedRange.collapsed) { a.setAttribute("href", url); return; }
    if (savedRange?.collapsed) insertHtml(`<a href="${escHtml(url).replace(/"/g, "&quot;")}">${escHtml(url)}</a>`);
    else exec("createLink", url);
  });
}

/* ---------------- toolbar wiring ---------------- */
const CMDS = {
  undo: () => { undo(); refreshToolbar(); },
  redo: () => { redo(); refreshToolbar(); },
  bold: () => change(() => exec("bold")),
  italic: () => change(() => exec("italic")),
  underline: () => change(() => exec("underline")),
  strikeThrough: () => change(() => exec("strikeThrough")),
  clear: () => change(() => { exec("removeFormat"); exec("unlink"); }),
  justifyLeft: () => change(() => exec("justifyLeft")),
  justifyCenter: () => change(() => exec("justifyCenter")),
  justifyRight: () => change(() => exec("justifyRight")),
  justifyFull: () => change(() => exec("justifyFull")),
  rtl: toggleRtl,
  bullet: () => toggleList("bullet"),
  number: () => toggleList("number"),
  check: () => toggleList("check"),
  indent: () => indent(1),
  outdent: () => indent(-1),
  link: openLink,
  table: () => insertTable(3, 3),
  image: () => { rememberSelection(); $("#imageInput").click(); },
  hr: () => change(() => insertHtml("<hr><p><br></p>")),
  pagebreak: () => change(() => insertHtml('<div class="pb" contenteditable="false" data-pb="1"></div><p><br></p>')),
};
// Buttons keep the text selection (mousedown would otherwise move focus away from the page).
for (const el of $$("#toolbar .tb, .ctxbar .btn, #side .btn, #linkPop .btn")) el.addEventListener("mousedown", (e) => { if (el.tagName === "BUTTON") e.preventDefault(); });
$("#toolbar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cmd]");
  if (b && CMDS[b.dataset.cmd]) { CMDS[b.dataset.cmd](); return; }
  const p = e.target.closest("[data-panel-btn]");
  if (p) togglePanel(p.dataset.panelBtn);
});
$("#blockType").addEventListener("change", (e) => setBlockType(e.target.value));
$("#fontFamily").addEventListener("change", (e) => setFontFamily(e.target.value));
$("#fontSize").addEventListener("change", (e) => setFontSize(+e.target.value));
$("#lineSpacing").addEventListener("change", (e) => setLineSpacing(e.target.value));
$("#textColor").addEventListener("change", (e) => change(() => withCss(() => exec("foreColor", e.target.value))));
$("#hiliteColor").addEventListener("change", (e) => change(() => withCss(() => exec("hiliteColor", e.target.value))));
for (const el of ["#blockType", "#fontFamily", "#fontSize", "#lineSpacing", "#textColor", "#hiliteColor"]) $(el).addEventListener("pointerdown", rememberSelection);
$("#zoom").addEventListener("change", applyZoom);
$("#tableTools").addEventListener("click", (e) => { const b = e.target.closest("[data-tbl]"); if (b) { restoreSelection(); tableOp(b.dataset.tbl); } });
$("#imgTools").addEventListener("click", (e) => { const b = e.target.closest("[data-img]"); if (b) imgAction(b.dataset.img); });
$("#imageInput").addEventListener("change", async (e) => { const files = [...e.target.files]; e.target.value = ""; await insertImageFiles(files); });
$("#linkApply").addEventListener("click", applyLink);
$("#linkCancel").addEventListener("click", () => { closeLink(); restoreSelection(); });
$("#linkRemove").addEventListener("click", () => { closeLink(); change(() => { const a = closestIn(savedRange?.startContainer, "a"); if (a) { const r = document.createRange(); r.selectNodeContents(a); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } exec("unlink"); }); });
$("#linkUrl").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") { closeLink(); restoreSelection(); } });

function fillSelects() {
  const ff = $("#fontFamily"), df = $("#docFont");
  for (const [k, f] of Object.entries(FONT_FAMILIES)) { ff.add(new Option(f.label.replace(/ \(.*\)/, ""), k)); df.add(new Option(f.label, k)); }
  const fs = $("#fontSize");
  for (const s of [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]) fs.add(new Option(String(s), String(s)));
  fs.value = "11";
  const langs = [["ur", "Urdu"], ["en", "English"], ["ar", "Arabic"], ["hi", "Hindi"], ["pa", "Punjabi"], ["zh", "Chinese"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["tr", "Turkish"]];
  for (const [c, n] of langs) $("#aiLang").add(new Option(n, c));
}

/* ---------------- editor events ---------------- */
editor.addEventListener("beforeinput", (e) => {
  if (e.inputType === "historyUndo") { e.preventDefault(); undo(); return; }
  if (e.inputType === "historyRedo") { e.preventDefault(); redo(); return; }
  if (e.inputType !== "insertText" && e.inputType !== "insertCompositionText" && !e.isComposing) histCommit();
});
editor.addEventListener("input", (e) => {
  if (e.inputType === "insertText" || e.inputType === "insertCompositionText") {
    histSchedule();
    if (state.pendingSize && editor.querySelector('span[style*="xxx-large"]')) normalizeEditor();
    if (e.data === " ") autoFormat();
  }
  else { normalizeEditor(); histCommit(); }
  rememberSelection();
  afterChange(true);
  updateUndoButtons();
});
/** Markdown-style shortcuts typed at the start of a paragraph: "# ", "## ", "- ", "1. ", "[] ", "> ". */
function autoFormat() {
  const sel = getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return;
  const p = closestIn(sel.anchorNode, "p,h1,h2,h3");
  if (!p || p.parentElement !== editor || p.tagName !== "P") return;
  const r = document.createRange();
  r.setStart(p, 0);
  r.setEnd(sel.anchorNode, sel.anchorOffset);
  const before = r.toString().replace(/ /g, " ");
  const m = before.match(/^(#{1,3}|[-*]|1[.)]|\[\]|>) $/);
  if (!m) return;
  histCommit();
  sel.removeAllRanges();
  sel.addRange(r);
  exec("delete");
  const k = m[1];
  if (k[0] === "#") exec("formatBlock", `<h${k.length}>`);
  else if (k === "-" || k === "*") exec("insertUnorderedList");
  else if (k === "[]") { exec("insertUnorderedList"); const ul = closestIn(getSelection().anchorNode, "li")?.parentElement; if (ul) { ul.classList.add("check"); for (const x of ul.children) x.setAttribute("data-checked", "false"); } }
  else if (k === ">") exec("formatBlock", "<blockquote>");
  else exec("insertOrderedList");
  histCommit();
}
editor.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (selImg && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); imgAction("delete"); return; }
  if (selImg && !mod) deselectImage();
  if (mod && !e.altKey && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); refreshToolbar(); return; }
  if (mod && k === "y") { e.preventDefault(); redo(); refreshToolbar(); return; }
  if (mod && (k === "b" || k === "i" || k === "u") && !e.shiftKey && !e.altKey) { e.preventDefault(); rememberSelection(); CMDS[{ b: "bold", i: "italic", u: "underline" }[k]](); return; }
  if (mod && e.shiftKey && k === "x") { e.preventDefault(); rememberSelection(); CMDS.strikeThrough(); return; }
  if (mod && k === "k") { e.preventDefault(); openLink(); return; }
  if (mod && e.altKey && /^Digit[0-3]$/.test(e.code)) { e.preventDefault(); rememberSelection(); setBlockType(e.code === "Digit0" ? "p" : "h" + e.code.slice(5)); return; }
  if (mod && e.shiftKey && (e.code === "Digit7" || e.code === "Digit8" || e.code === "Digit9")) { e.preventDefault(); rememberSelection(); toggleList({ Digit7: "number", Digit8: "bullet", Digit9: "check" }[e.code]); return; }
  if (mod && e.key === "Enter") { e.preventDefault(); rememberSelection(); CMDS.pagebreak(); return; }
  if (e.key === "Tab") {
    rememberSelection();
    if (closestIn(caretNode(), "td,th")) { e.preventDefault(); moveCell(e.shiftKey ? -1 : 1); return; }
    e.preventDefault();
    indent(e.shiftKey ? -1 : 1);
    return;
  }
  if (e.key === "Enter" && !e.shiftKey && !mod) {
    const pre = closestIn(caretNode(), "pre");
    if (pre) {
      e.preventDefault();
      histCommit();
      // Enter on an empty last line leaves the code block.
      const r = getSelection().getRangeAt(0);
      const part = (a, b) => { const x = document.createRange(); x.setStart(...a); x.setEnd(...b); const f = x.cloneContents(); f.querySelectorAll("br").forEach((br) => br.replaceWith("\n")); return f.textContent; };
      const before = part([pre, 0], [r.startContainer, r.startOffset]), after = part([r.endContainer, r.endOffset], [pre, pre.childNodes.length]);
      if (!after.replace(/\n/g, "") && before.trim() && (before.endsWith("\n"))) {
        // Drop the empty last line (line breaks or a trailing newline), then continue in a new paragraph.
        const strip = (el) => { for (let n = el.lastChild; n; n = el.lastChild) { if (n.nodeName === "BR") n.remove(); else if (n.nodeType === 3 && /\n$/.test(n.nodeValue)) { n.nodeValue = n.nodeValue.replace(/\n+$/, ""); if (!n.nodeValue) n.remove(); else break; } else if (n.nodeType === 1 && n.lastChild && n.nodeName === "CODE") { strip(n); break; } else break; } };
        strip(pre);
        const p = Object.assign(document.createElement("p"), { innerHTML: "<br>" });
        pre.after(p);
        placeCaret(p);
      } else exec("insertLineBreak");
      histCommit();
      afterChange();
      return;
    }
  }
});
editor.addEventListener("click", (e) => {
  const img = e.target.closest?.("img");
  if (img && inEditor(img)) { selectImage(img); return; }
  deselectImage();
  // Check lists: the box sits left of the item (right in right-to-left text).
  const li = e.target.closest?.("ul.check > li");
  if (li && e.target === li) {
    const r = li.getBoundingClientRect(), rtl = getComputedStyle(li).direction === "rtl";
    if ((!rtl && e.clientX < r.left + 2) || (rtl && e.clientX > r.right - 2)) {
      histCommit();
      li.setAttribute("data-checked", li.getAttribute("data-checked") === "true" ? "false" : "true");
      histCommit();
      afterChange();
    }
  }
});
editor.addEventListener("paste", async (e) => {
  const dt = e.clipboardData;
  if (!dt) return;
  const files = [...dt.files].filter((f) => /^image\//.test(f.type));
  const html = dt.getData("text/html"), text = dt.getData("text/plain");
  if (files.length && !html) { e.preventDefault(); rememberSelection(); await insertImageFiles(files); return; }
  e.preventDefault();
  rememberSelection();
  if (closestIn(caretNode(), "pre")) { change(() => exec("insertText", text)); return; }
  if (html) {
    const body = new DOMParser().parseFromString(html, "text/html").body;
    const blocks = htmlToModel(body);
    if (!blocks.length) return;
    if (blocks.length === 1 && blocks[0].type === "p" && !blocks[0].align && !blocks[0].dir) change(() => insertHtml(runsToHtml(blocks[0].runs) || ""));
    else change(() => insertHtml(modelToHtml(blocks, { editor: true })));
    return;
  }
  if (!text) return;
  if (!text.includes("\n")) { change(() => exec("insertText", text)); return; }
  change(() => insertHtml(text.replace(/\r\n?/g, "\n").split("\n").map((l) => `<p>${escHtml(l) || "<br>"}</p>`).join("")));
});
editor.addEventListener("drop", (e) => {
  const files = [...(e.dataTransfer?.files || [])];
  if (!files.length) return;
  e.preventDefault();
  const imgs = files.filter((f) => /^image\//.test(f.type));
  if (imgs.length) {
    const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (pos && inEditor(pos.startContainer)) savedRange = pos;
    insertImageFiles(imgs);
  } else importFile(files[0]);
});
editor.addEventListener("focus", () => { if (!editor.childNodes.length) normalizeEditor(); });
$("#docTitle").addEventListener("input", () => { state.doc.title = $("#docTitle").value; document.title = `${state.doc.title || "Untitled document"} | AsaanDesk Docs`; markDirty(); });
$("#docTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); editor.focus(); } });
document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === "s") { e.preventDefault(); flushSave().then(() => toast("Saved on this device.")); }
  else if (mod && k === "p") { e.preventDefault(); doExport("print"); }
  else if (mod && (k === "f" || k === "h") && !e.shiftKey) { e.preventDefault(); openPanel("find"); $("#" + (k === "h" ? "replaceText" : "findText")).focus(); }
  else if (e.key === "Escape") { closeMenus(); if (!$("#linkPop").hidden) { closeLink(); restoreSelection(); } }
});

/* ---------------- side panels ---------------- */
function openPanel(name) {
  closeMenus();
  $("#side").hidden = false;
  for (const s of $$(".panel-sec")) s.hidden = s.dataset.panel !== name;
  $("#magicBtn").setAttribute("aria-expanded", String(name === "magic"));
  $("#openBtn").setAttribute("aria-expanded", String(name === "recent"));
  $$("[data-panel-btn]").forEach((b) => b.classList.toggle("on", b.dataset.panelBtn === name));
  if (name === "outline") renderOutline();
  if (name === "recent") renderRecent();
  if (name === "magic") setupMagic();
  if (name === "find") { const s = getSelection().toString(); if (s && s.length < 80 && !s.includes("\n")) $("#findText").value = s; runFind(); }
}
function closePanel() {
  $("#side").hidden = true;
  $$("[data-panel-btn]").forEach((b) => b.classList.remove("on"));
  $("#magicBtn").setAttribute("aria-expanded", "false");
  clearFindHighlights();
}
function togglePanel(name) { const sec = $(`.panel-sec[data-panel="${name}"]`); if (!$("#side").hidden && !sec.hidden) closePanel(); else openPanel(name); }
$("#sideClose").addEventListener("click", closePanel);
$("#magicBtn").addEventListener("click", () => { rememberSelection(); togglePanel("magic"); });
$("#openBtn").addEventListener("click", () => togglePanel("recent"));
$("#newBtn").addEventListener("click", () => newDocument());
$("#newBtn2").addEventListener("click", () => newDocument());
$("#templatesBtn").addEventListener("click", openTemplates);
$("#importBtn").addEventListener("click", () => $("#importInput").click());
$("#importInput").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importFile(f); });

function closeMenus() {
  for (const [btn, menu] of [["#downloadBtn", "#downloadMenu"], ["#moreBtn", "#moreMenu"]]) { $(menu).hidden = true; $(btn).setAttribute("aria-expanded", "false"); }
}
function toggleMenu(btn, menu) {
  const open = $(menu).hidden;
  closeMenus();
  $(menu).hidden = !open;
  $(btn).setAttribute("aria-expanded", String(open));
  if (open) $(menu).querySelector("button")?.focus();
}
$("#downloadBtn").addEventListener("click", (e) => { e.stopPropagation(); rememberSelection(); toggleMenu("#downloadBtn", "#downloadMenu"); });
$("#moreBtn").addEventListener("click", (e) => { e.stopPropagation(); toggleMenu("#moreBtn", "#moreMenu"); });
$("#downloadMenu").addEventListener("click", (e) => { const b = e.target.closest("[data-export]"); if (b) { closeMenus(); doExport(b.dataset.export); } });
$("#moreMenu").addEventListener("click", (e) => {
  const b = e.target.closest("[data-more]");
  if (!b) return;
  closeMenus();
  ({ new: () => newDocument(), templates: openTemplates, open: () => openPanel("recent"), find: () => openPanel("find"), outline: () => openPanel("outline"), page: () => openPanel("page") })[b.dataset.more]?.();
});
for (const m of ["#downloadMenu", "#moreMenu"]) $(m).addEventListener("keydown", (e) => {
  const items = $$("button", $(m)), i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
});
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) closeMenus(); if (!e.target.closest("#linkPop") && !e.target.closest('[data-cmd="link"]')) closeLink(); });

function renderOutline() {
  const box = $("#outlineList");
  box.innerHTML = "";
  const heads = $$("h1,h2,h3", editor).filter((h) => h.textContent.trim());
  if (!heads.length) { box.innerHTML = '<p class="muted small">No headings yet. Use “Heading 1–3” in the text style menu.</p>'; return; }
  for (const h of heads) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "l" + h.tagName[1], textContent: h.textContent.trim() });
    b.addEventListener("click", () => { h.scrollIntoView({ block: "start", behavior: "smooth" }); placeCaret(h, true); editor.focus({ preventScroll: true }); if (isPhone()) closePanel(); });
    box.append(b);
  }
}

/* ---------------- page setup ---------------- */
function pageChanged() {
  const p = state.doc.page;
  p.size = $("#pageSize").value;
  p.margin = +$("#pageMargin").value;
  p.header = $("#pageHeader").value;
  p.footer = $("#pageFooter").value;
  p.pageNumbers = $("#pageNumbers").checked;
  state.doc.font = $("#docFont").value;
  ensureFont(state.doc.font);
  applyPage();
  if ($("#zoom").value === "fit") applyZoom();
  markDirty();
}
for (const id of ["pageSize", "pageMargin", "pageNumbers", "docFont"]) $("#" + id).addEventListener("change", pageChanged);
for (const id of ["pageHeader", "pageFooter"]) $("#" + id).addEventListener("input", pageChanged);

/* ---------------- find & replace ---------------- */
let finds = [], findIdx = -1;
function textIndex() {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let text = "", map = [], lastBlock = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const blk = closestIn(n, "p,h1,h2,h3,li,pre,td,th,blockquote") || editor;
    if (lastBlock && blk !== lastBlock) text += "\n";
    lastBlock = blk;
    map.push({ node: n, start: text.length });
    text += n.nodeValue;
  }
  return { text, map };
}
function posAt(idx, map, end = false) {
  for (let i = map.length - 1; i >= 0; i--) { const m = map[i]; if (idx > m.start || (!end && idx === m.start) || (end && idx === m.start && i === 0)) return { node: m.node, off: Math.min(idx - m.start, m.node.nodeValue.length) }; }
  return null;
}
function runFind(keep = false) {
  const q = $("#findText").value;
  finds = [];
  if (q) {
    const { text, map } = textIndex();
    const cs = $("#findCase").checked;
    const hay = cs ? text : text.toLowerCase(), needle = cs ? q : q.toLowerCase();
    for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + Math.max(1, needle.length))) {
      if (text.slice(i, i + q.length).includes("\n")) continue;
      const a = posAt(i, map), b = posAt(i + q.length, map, true);
      if (!a || !b) continue;
      const r = document.createRange();
      r.setStart(a.node, a.off);
      r.setEnd(b.node, b.off);
      finds.push(r);
    }
  }
  if (!keep || findIdx >= finds.length) findIdx = finds.length ? 0 : -1;
  paintFinds();
}
function paintFinds() {
  const n = finds.length;
  $("#findStatus").textContent = !$("#findText").value ? "" : n ? `${findIdx + 1} of ${n} match${n === 1 ? "" : "es"}` : "No matches.";
  if (globalThis.CSS?.highlights && globalThis.Highlight) {
    CSS.highlights.set("ad-find", new Highlight(...finds));
    CSS.highlights.set("ad-find-cur", new Highlight(...(findIdx >= 0 ? [finds[findIdx]] : [])));
  }
  const cur = finds[findIdx];
  if (cur) { const el = cur.startContainer.parentElement; el?.scrollIntoView({ block: "center", behavior: "smooth" }); }
}
function clearFindHighlights() { if (globalThis.CSS?.highlights) { CSS.highlights.delete("ad-find"); CSS.highlights.delete("ad-find-cur"); } }
function stepFind(d) { if (!finds.length) runFind(); if (!finds.length) return; findIdx = (findIdx + d + finds.length) % finds.length; paintFinds(); }
function replaceRange(r, text) {
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
  if (text) exec("insertText", text); else exec("delete");
}
$("#findText").addEventListener("input", () => runFind());
$("#findCase").addEventListener("change", () => runFind());
$("#findText").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); } });
$("#findNext").addEventListener("click", () => stepFind(1));
$("#findPrev").addEventListener("click", () => stepFind(-1));
$("#replaceOne").addEventListener("click", () => {
  if (!finds.length) runFind();
  const r = finds[findIdx];
  if (!r) return;
  editor.focus({ preventScroll: true });
  histCommit();
  replaceRange(r, $("#replaceText").value);
  histCommit();
  afterChange();
  runFind(true);
});
$("#replaceAll").addEventListener("click", () => {
  runFind();
  const n = finds.length;
  if (!n) { toast("Nothing to replace."); return; }
  editor.focus({ preventScroll: true });
  histCommit();
  for (const r of [...finds].reverse()) replaceRange(r, $("#replaceText").value);
  histCommit();
  afterChange();
  runFind();
  toast(`Replaced ${n} match${n === 1 ? "" : "es"}.`);
});

/* ---------------- Magic Write (AI) ---------------- */
let aiPending = null; // { kind: 'replace' | 'insert', text, range }
async function setupMagic() {
  updateAiSel();
  const info = $("#aiInfo"), soon = $("#soonBox");
  let s = null;
  try { s = await aiStatus(); } catch { s = null; }
  if (s?.anyText) {
    info.textContent = s.online ? "Uses AsaanDesk AI online." : "Uses the AI built into this browser. Your text stays on this device.";
    soon.innerHTML = "";
  } else {
    info.textContent = "AI writing is not available in this browser yet.";
    comingSoon(soon, { title: "AsaanDesk AI is coming soon", what: "Magic Write will rewrite, shorten, fix and translate your text right here.", offline: "It already works in Chrome versions with built-in AI. Everything else in Docs works offline, without AI." });
  }
}
function updateAiSel() {
  const t = savedRange && !savedRange.collapsed ? savedRange.toString().trim() : "";
  $("#aiSel").textContent = t ? `Selected: “${t.length > 90 ? t.slice(0, 90) + "…" : t}”` : "Select text in your document, then pick an action.";
}
function aiMessage(text, kind = "") { const m = $("#aiMsg"); m.textContent = text; m.className = "ai-msg" + (kind ? " " + kind : ""); m.hidden = !text; }
function setMagicTab(tab) {
  $$("[data-mtab]").forEach((b) => { const on = b.dataset.mtab === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
  $$("[data-mtab-body]").forEach((b) => { b.hidden = b.dataset.mtabBody !== tab; });
}
$$("[data-mtab]").forEach((b) => b.addEventListener("click", () => setMagicTab(b.dataset.mtab)));
async function runAi(task, style) {
  if (state.aiBusy) return;
  const range = savedRange && inEditor(savedRange.startContainer) ? savedRange.cloneRange() : null;
  let text = "";
  if (task === "write") {
    text = $("#aiPrompt").value.trim();
    if (!text) { aiMessage("Describe what you want written first."); $("#aiPrompt").focus(); return; }
  } else {
    text = range && !range.collapsed ? range.toString().trim() : "";
    if (!text) { aiMessage("Select some text in your document first, then pick an action."); return; }
  }
  state.aiBusy = true;
  $("#aiResult").hidden = true;
  aiMessage("Working…", "busy");
  $$("[data-ai], #translateDoc").forEach((b) => (b.disabled = true));
  try {
    const context = task === "write" ? modelToText(syncModel()).slice(0, 600) : "";
    const out = await aiText(task, text, { style, target: $("#aiLang").value, context, onStatus: (m) => aiMessage(m, "busy") });
    if (!out) throw new Error("The AI did not return any text. Your text was not changed.");
    aiPending = { kind: task === "write" ? "insert" : "replace", text: out, range };
    $("#aiText").textContent = out;
    $("#aiReplace").textContent = task === "write" ? "Insert at cursor" : "Replace selection";
    $("#aiResult").hidden = false;
    aiMessage("");
  } catch (e) {
    aiPending = null;
    const unavailable = e?.code === "AI_UNAVAILABLE";
    aiMessage(unavailable ? `${e.message} Your text was not changed.` : `${e?.message || "Something went wrong."}${/not changed/.test(e?.message || "") ? "" : " Your text was not changed."}`);
  } finally {
    state.aiBusy = false;
    $$("[data-ai], #translateDoc").forEach((b) => (b.disabled = false));
  }
}
$$("[data-ai]").forEach((b) => b.addEventListener("click", () => runAi(b.dataset.ai, b.dataset.style)));
$("#aiReplace").addEventListener("click", () => {
  if (!aiPending) return;
  const { text, range, kind } = aiPending;
  if (range && inEditor(range.startContainer)) savedRange = range;
  change(() => {
    if (kind === "replace" && savedRange && !savedRange.collapsed) exec("insertText", text);
    else if (text.includes("\n")) insertHtml(text.split(/\n+/).map((l) => `<p>${escHtml(l)}</p>`).join(""));
    else exec("insertText", text);
  });
  aiPending = null;
  $("#aiResult").hidden = true;
  aiMessage("Done. Use Undo (Ctrl+Z) to go back.", "ok");
});
$("#aiInsert").addEventListener("click", () => {
  if (!aiPending) return;
  const { text, range } = aiPending;
  const blk = closestIn(range?.endContainer, "p,h1,h2,h3,li,blockquote,pre") || editor.lastElementChild;
  change(() => {
    const top = blk?.closest("ul,ol,blockquote,table") || blk;
    const ps = text.split(/\n+/).map((l) => Object.assign(document.createElement("p"), { textContent: l }));
    if (top && top !== editor) top.after(...ps); else editor.append(...ps);
    placeCaret(ps[ps.length - 1], false);
  });
  aiPending = null;
  $("#aiResult").hidden = true;
  aiMessage("Added below. Use Undo (Ctrl+Z) to go back.", "ok");
});
$("#aiDiscard").addEventListener("click", () => { aiPending = null; $("#aiResult").hidden = true; aiMessage(""); });
$("#translateDoc").addEventListener("click", async () => {
  if (state.aiBusy) return;
  const target = $("#aiLang").value, name = $("#aiLang").selectedOptions[0].textContent;
  const doc = syncModel();
  if (!countWords(doc).words) { aiMessage("Your document is empty. Type or paste some text first."); return; }
  state.aiBusy = true;
  $$("[data-ai], #translateDoc").forEach((b) => (b.disabled = true));
  aiMessage(`Translating into ${name}…`, "busy");
  try {
    const next = await mapDocText(doc, (t) => aiText("translate", t, { target }), { rtl: isRtlLang(target), onProgress: (d, n) => aiMessage(`Translating into ${name}… ${d} of ${n}`, "busy") });
    histCommit();
    editor.innerHTML = modelToHtml(next.blocks, { editor: true });
    normalizeEditor();
    histCommit();
    afterChange();
    syncModel();
    aiMessage(`Translated into ${name}. Use Undo (Ctrl+Z) to get the original back.`, "ok");
  } catch (e) {
    aiMessage(`${e?.message || "Translation failed."} Your document was not changed.`);
  } finally {
    state.aiBusy = false;
    $$("[data-ai], #translateDoc").forEach((b) => (b.disabled = false));
  }
});

/* ---------------- new, templates, recent, import ---------------- */
async function newDocument(title) {
  if (state.dirty) await flushSave();
  setDoc(newDoc(title || "Untitled document"));
  const u = new URL(location.href);
  u.search = "";
  history.replaceState(null, "", u);
  placeCaret(editor.firstElementChild, true);
  if (isPhone()) closePanel();
  return state.doc;
}
let templatesMod = null;
const loadTemplates = async () => (templatesMod ||= await import("./templates.js"));
async function openTemplate(id) {
  const { templateById } = await loadTemplates();
  const t = templateById(id);
  if (!t) { toast("That template was not found."); return false; }
  if (state.dirty) await flushSave();
  setDoc(t.build());
  await flushSave();
  return true;
}
async function openTemplates() {
  const { TEMPLATES } = await loadTemplates();
  const grid = $("#tplGrid");
  if (!grid.children.length) {
    for (const t of TEMPLATES) {
      const d = t.build();
      const b = Object.assign(document.createElement("button"), { type: "button", className: "tpl" });
      b.dataset.template = t.id;
      const thumb = document.createElement("div");
      thumb.className = "tpl-thumb";
      thumb.setAttribute("aria-hidden", "true");
      for (const blk of d.blocks.slice(0, 9)) {
        const txt = (blk.runs || []).map((r) => r.text).join("").slice(0, 60);
        const div = document.createElement("div");
        if (blk.type === "h1") { div.className = "t1"; div.textContent = txt; }
        else if (blk.type === "h2" || blk.type === "h3") { div.className = "t2"; div.textContent = txt; }
        else if (blk.type === "table" || blk.type === "hr") div.className = "ln";
        else div.textContent = txt;
        if (blk.align === "center") div.style.textAlign = "center";
        if (blk.dir === "rtl") div.dir = "rtl";
        thumb.append(div);
      }
      const name = document.createElement("b"); name.textContent = t.name;
      const desc = document.createElement("span"); desc.textContent = t.desc;
      b.append(thumb, name, desc);
      b.addEventListener("click", async () => { $("#tplDialog").close(); await openTemplate(t.id); toast(`“${t.name}” is ready. Change any text.`); });
      grid.append(b);
    }
  }
  $("#tplDialog").showModal();
}
$("#tplClose").addEventListener("click", () => $("#tplDialog").close());
$("#tplDialog").addEventListener("click", (e) => { if (e.target === $("#tplDialog")) $("#tplDialog").close(); });

async function renderRecent() {
  const ul = $("#recentList");
  ul.innerHTML = "";
  let list = [];
  try { list = await listProjects("docs"); } catch { ul.innerHTML = '<li class="muted small">Recent documents are not available in this browser.</li>'; return; }
  if (!list.length) { ul.innerHTML = '<li class="muted small">Nothing saved yet. Your documents save automatically as you type.</li>'; return; }
  for (const p of list.slice(0, 30)) {
    const li = document.createElement("li");
    const open = Object.assign(document.createElement("button"), { type: "button", className: "open" + (p.id === state.id ? " cur" : "") });
    open.innerHTML = '<span class="name"></span><span class="when"></span>';
    open.querySelector(".name").textContent = p.name || "Untitled document";
    open.querySelector(".when").textContent = new Date(p.updated).toLocaleString();
    open.addEventListener("click", async () => { if (state.dirty) await flushSave(); const rec = await getProject(p.id); if (rec) { setDoc(rec.data, { id: rec.id }); const u = new URL(location.href); u.search = "?id=" + rec.id; history.replaceState(null, "", u); if (isPhone()) closePanel(); } });
    const del = Object.assign(document.createElement("button"), { type: "button", className: "btn", textContent: "Delete" });
    del.setAttribute("aria-label", `Delete ${p.name || "document"}`);
    del.addEventListener("click", async () => {
      if (!confirm(`Delete “${p.name || "Untitled document"}” from this device?`)) return;
      await deleteProject(p.id);
      if (p.id === state.id) { state.id = null; state.dirty = true; }
      renderRecent();
    });
    li.append(open, del);
    ul.append(li);
  }
}

async function importFile(file) {
  const name = file.name.replace(/\.[^.]+$/, "") || "Imported document";
  const ext = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  try {
    let doc;
    if (ext === "docx" || /wordprocessingml/.test(file.type)) {
      toast("Opening Word file…", 6000);
      await loadScript("lib/mammoth/mammoth.browser.min.js");
      const res = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const body = new DOMParser().parseFromString(res.value, "text/html").body;
      doc = normalizeDoc({ ...newDoc(name), blocks: htmlToModel(body) });
    } else if (ext === "html" || ext === "htm" || file.type === "text/html") {
      const d = new DOMParser().parseFromString(await file.text(), "text/html");
      doc = normalizeDoc({ ...newDoc(d.title || name), blocks: htmlToModel(d.body) });
    } else if (ext === "md" || ext === "markdown") doc = mdToModel(await file.text(), name);
    else if (ext === "json") {
      const j = JSON.parse(await file.text());
      if (!Array.isArray(j?.blocks)) throw new Error("This JSON file is not an AsaanDesk document.");
      doc = normalizeDoc(j);
    } else if (ext === "txt" || /^text\//.test(file.type)) doc = textToModel(await file.text(), name);
    else throw new Error("Open a Word (.docx), web page (.html), Markdown (.md), text (.txt) or AsaanDesk (.json) file.");
    if (state.dirty) await flushSave();
    setDoc(doc);
    await flushSave();
    toast(`Opened “${file.name}”.`);
    if (isPhone()) closePanel();
  } catch (e) {
    console.warn(e);
    toast(e?.message?.length < 160 ? e.message : "That file could not be opened.", 5000);
  }
}

/* ---------------- export ---------------- */
async function loadImageAsPng(src) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => rej(new Error("image")); i.src = src; });
  const c = Object.assign(document.createElement("canvas"), { width: img.naturalWidth || 300, height: img.naturalHeight || 150 });
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  return { bytes: new Uint8Array(await blob.arrayBuffer()) };
}
/** Draws text the PDF fonts can't (e.g. Urdu) into a PNG, wrapped to the line width, in the right direction. */
async function rasterize(text, o) {
  const k = 3, size = o.size * k, widthPx = Math.max(10, Math.round(o.widthPt * k)), lineH = size * (o.lineHeight || 1.5);
  const fam = (FONT_FAMILIES[o.family] || FONT_FAMILIES.sans).css + ', "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';
  const font = `${o.italic ? "italic " : ""}${o.bold ? "700 " : "400 "}${size}px ${fam}`;
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  g.font = font;
  const lines = [];
  for (const para of String(text).split("\n")) {
    let cur = "";
    for (const w of para.split(/(\s+)/)) {
      const t = cur + w;
      if (cur.trim() && g.measureText(t.trim()).width > widthPx) { lines.push(cur.trim()); cur = w.trimStart(); } else cur = t;
    }
    lines.push(cur.trim());
  }
  c.width = widthPx;
  c.height = Math.max(1, Math.ceil(lines.length * lineH + size * 0.2));
  g.font = font;
  g.fillStyle = o.color || "#1b2133";
  g.textBaseline = "alphabetic";
  g.direction = o.dir === "rtl" ? "rtl" : "ltr";
  const align = o.align || (o.dir === "rtl" ? "right" : "left");
  g.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const x = align === "center" ? widthPx / 2 : align === "right" ? widthPx : 0;
  lines.forEach((l, i) => g.fillText(l, x, (i + 1) * lineH - (lineH - size) / 2 - size * 0.2));
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), widthPt: widthPx / k, heightPt: c.height / k };
}
async function exportDocx() {
  await loadScript("lib/docx/docx.umd.min.js");
  const { modelToDocx } = await import("./docx-export.js");
  return modelToDocx(syncModel(), window.docx, { loadImage: loadImageAsPng });
}
let pdfDeps = null;
async function loadPdfDeps() {
  pdfDeps ||= (async () => {
    await loadScript("/pdf-editor/lib/pdf-lib.min.js");
    await loadScript("/pdf-editor/lib/fontkit.umd.min.js").catch(() => null);
    const fm = await import("/pdf-editor/fontmatch.js");
    const { modelToPdf } = await import("./pdf-export.js");
    return { fm, modelToPdf };
  })().catch((e) => { pdfDeps = null; throw e; });
  return pdfDeps;
}
async function exportPdf() {
  const { fm, modelToPdf } = await loadPdfDeps();
  return modelToPdf(syncModel(), { PDFLib: window.PDFLib, writeLines: fm.writeLines, pickWriter: fm.pickWriter, rasterize, loadImage: loadImageAsPng });
}
async function doExport(kind) {
  const doc = syncModel();
  doc.title = $("#docTitle").value.trim() || "Untitled document";
  const base = safeName(doc.title);
  try {
    if (kind === "docx") { toast("Making the Word file…", 8000); download(await exportDocx(), base + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); toast("Word file downloaded."); }
    else if (kind === "pdf") { toast("Making the PDF…", 15000); download(await exportPdf(), base + ".pdf", "application/pdf"); toast("PDF downloaded."); }
    else if (kind === "html") download(exportHtmlPage(doc), base + ".html", "text/html;charset=utf-8");
    else if (kind === "md") download(modelToMarkdown(doc), base + ".md", "text/markdown;charset=utf-8");
    else if (kind === "txt") download(modelToText(doc), base + ".txt", "text/plain;charset=utf-8");
    else if (kind === "json") download(JSON.stringify(doc, null, 1), base + ".asaandesk-doc.json", "application/json");
    else if (kind === "print") { deselectImage(); setTimeout(() => print(), 50); }
  } catch (e) {
    console.warn(e);
    toast(e?.message || "That download did not work. Please try again.", 5000);
  }
}

/* ---------------- start ---------------- */
async function start() {
  fillSelects();
  exec("defaultParagraphSeparator", "p");
  const q = new URLSearchParams(location.search);
  let opened = false;
  try {
    if (q.get("handoff")) {
      const p = await takeHandoff(q.get("handoff"));
      if (p?.type === "doc" && p.doc) { setDoc(p.doc); opened = true; }
      else if (p?.type === "text" && p.text) { setDoc(textToModel(p.text, p.title)); opened = true; }
    }
    if (!opened && q.get("template")) opened = await openTemplate(q.get("template"));
    if (!opened && q.get("id")) { const rec = await getProject(q.get("id")); if (rec?.app === "docs") { setDoc(rec.data, { id: rec.id }); opened = true; } }
    if (!opened && !q.has("new") && !q.get("mode")) { const [last] = await listProjects("docs"); if (last) { setDoc(last.data, { id: last.id }); opened = true; } }
  } catch (e) { console.warn("Saved documents could not be read", e); }
  if (!opened) setDoc(newDoc());
  if (isPhone()) $("#zoom").value = "1";
  applyZoom();
  const mode = q.get("mode");
  if (mode === "write" || mode === "translate") { openPanel("magic"); setMagicTab(mode); if (mode === "write") $("#aiPrompt").focus(); else placeCaret(editor.firstElementChild, true); }
  else if (q.get("panel") && ["find", "outline", "page", "recent"].includes(q.get("panel"))) openPanel(q.get("panel"));
  else placeCaret(editor.firstElementChild || editor, true);
  setSaveState(state.id ? "Saved" : "Not saved yet");
  ensureFont(state.doc.font);
  setTimeout(() => { ensureFont(state.doc.font, true); ensureFont(state.doc.font, false, true); }, 1500);
  refreshToolbar();
}

const ready = start().catch((e) => { console.error(e); toast("Docs could not start: " + e.message, 8000); });

// Test hooks for automated checks.
window.adApp = {
  app: "docs",
  version: "1.0.0",
  ready,
  state,
  getModel: () => JSON.parse(JSON.stringify(syncModel())),
  setModel: (doc) => { setDoc(doc, { id: state.id }); markDirty(); return state.doc; },
  getHtml: () => editor.innerHTML,
  exportDocx,
  exportPdf,
  exportHtml: () => exportHtmlPage(syncModel()),
  exportMarkdown: () => modelToMarkdown(syncModel()),
  exportText: () => modelToText(syncModel()),
  importFile,
  openTemplate,
  openPanel,
  flushSave,
  undo,
  redo,
  history: hist,
};
