// AsaanDesk Website builder: one-page sites from blocks. Edit text right in the preview, reorder blocks by drag,
// change the theme, and export one self-contained index.html or a .zip. Everything stays in this browser.
import { loadBrand, FONT_FAMILIES } from "../shared/brand.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff } from "../shared/store.js";
import {
  BLOCK_TYPES, BLOCK_ORDER, BG_CHOICES, CORNERS, MODES, renderSite, normalizeSite, newBlock, moveBlock, insertBlock,
  removeBlock, duplicateBlock, insertIndex, anchors, blockTitle, getPath, setPath, clone, esc, slugify, ICON_NAMES, embedHeight,
  addPage, switchPage, renamePage, removePage, movePage, duplicatePage, pageList, pageFile, normSettings, cleanDomain, validGaId, sha256Hex, MAX_PAGES,
  ANIMS, MAX_SECTIONS, canAddBlock, publishChecks, setPageSlug, setPageMeta, siteBase, cleanSubpath,
} from "./blocks.js";
import { qrSvg } from "../code/qr.js";
import { ICONS, PALETTES } from "./art.js";
import { TEMPLATES, makeTemplate, templateArt, blankSite } from "./templates.js";
import { exportHtml as renderExport, exportHtmlFile, buildZipFile, absolutePhotos, zipName } from "./exporter.js";
import * as gallery from "./gallery.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const APP = "website", LAST = "asaandesk-website-last";
const state = { site: null, projectId: null, selected: null, size: "desktop", tab: "blocks", ready: false, dirty: false, zoom: 0, k: 1, mode: "edit" };
let shell = null; // the shared editor frame (../shared/editor-shell.js), when it started
const hist = { past: [], future: [], lastKey: "", lastAt: 0 };
const openItems = new Set();
const isPhone = () => !!globalThis.matchMedia?.("(max-width: 640px)").matches;
const svgI = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = { up: "M12 19V5M6 11l6-6 6 6", down: "M12 5v14M6 13l6 6 6-6", dup: "M8 8h11v11H8zM5 16V5h11", del: "M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3" };
const blockById = (id) => state.site?.blocks.find((b) => b.id === id) || null;
const labelOf = (b) => BLOCK_TYPES[b.type]?.label || b.type;

/* ------------------------------------------------------------------ small UI helpers */
let toastT = 0;
function toast(msg) {
  const t = $("#toast");
  if (shell) { t.textContent = msg; try { shell.toast(msg); return; } catch {} }
  t.textContent = msg; t.hidden = false;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800);
}
const openDlg = (d) => { if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); };
const closeDlg = (d) => { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); };
function el(tag, attrs = {}, html = "") {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
  if (html) e.innerHTML = html;
  return e;
}
const fmtDate = (t) => { try { return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };

/* ------------------------------------------------------------------ history + changes */
const snapshot = () => JSON.stringify(state.site);
function pushHistory(key = "") {
  const now = Date.now();
  if (key && key === hist.lastKey && now - hist.lastAt < 1500) { hist.lastAt = now; return; }
  hist.past.push(snapshot());
  if (hist.past.length > 80) hist.past.shift();
  hist.future = []; hist.lastKey = key; hist.lastAt = now;
  updateUndo();
}
function updateUndo() { $("#undoBtn").disabled = !hist.past.length; $("#redoBtn").disabled = !hist.future.length; }
function restore(json) {
  state.site = normalizeSite(JSON.parse(json));
  hist.lastKey = "";
  if (!blockById(state.selected)) state.selected = null;
  renderAll(); scheduleSave(); updateUndo();
}
function undo() { if (!hist.past.length) return; hist.future.push(snapshot()); restore(hist.past.pop()); }
function redo() { if (!hist.future.length) return; hist.past.push(snapshot()); restore(hist.future.pop()); }

/** Every model change goes through here: history, preview, panels and autosave. */
function change(fn, { key = "", preview = true, panels = true, delay = 0 } = {}) {
  pushHistory(key);
  const out = fn(state.site);
  if (preview) schedulePreview(delay);
  scheduleMobile();
  renderBlockList();
  updateBar();
  if (panels) renderPanes();
  scheduleSave();
  return out;
}

/* ------------------------------------------------------------------ autosave */
let saveT = 0, savePromise = null;
function setSaveState(text) { const s = $("#saveState"); s.textContent = text; s.dataset.state = text === "Saved" ? "saved" : text === "Saving…" ? "saving" : "error"; try { shell?.setSaved(s.dataset.state === "error" ? "unsaved" : s.dataset.state); if (state.projectId) shell?.setProjectId(state.projectId); } catch {} }
function scheduleSave() { state.dirty = true; setSaveState("Saving…"); clearTimeout(saveT); saveT = setTimeout(save, 700); }
async function save() {
  clearTimeout(saveT); saveT = 0;
  while (savePromise) await savePromise;
  state.dirty = false;
  const site = clone(state.site);
  savePromise = saveProject({ id: state.projectId || undefined, app: APP, name: site.name, data: site })
    .then((rec) => { state.projectId = rec.id; try { localStorage.setItem(LAST, rec.id); } catch {} if (!state.dirty) setSaveState("Saved"); })
    .catch((e) => { console.warn(e); state.dirty = true; setSaveState("Not saved"); })
    .finally(() => { savePromise = null; });
  return savePromise;
}
async function flush() { if (state.dirty || saveT) await save(); else if (savePromise) await savePromise; }

/* ------------------------------------------------------------------ preview (same-origin iframe) */
let frameDoc = null, previewT = 0;
function schedulePreview(ms = 0) { clearTimeout(previewT); if (!ms) renderPreview(); else previewT = setTimeout(renderPreview, ms); }
function renderPreview() {
  clearTimeout(previewT);
  const frame = $("#preview"), d = frame.contentDocument;
  if (!d) return;
  const html = renderSite(state.site, { mode: "edit" });
  if (frameDoc === d && d.body && d.getElementById("site-css")) {
    // Update in place: keeps the scroll position and avoids a white flash.
    const nd = new DOMParser().parseFromString(html, "text/html");
    const se = d.scrollingElement || d.documentElement, y = se.scrollTop;
    d.title = nd.title;
    d.getElementById("site-css").textContent = nd.getElementById("site-css").textContent;
    d.body.innerHTML = nd.body.innerHTML;
    se.scrollTop = y;
  } else {
    d.open(); d.write(html); d.close();
    frameDoc = d;
    wireFrame(d);
  }
  markSelected(false);
}
function wireFrame(d) {
  d.addEventListener("click", onFrameClick, true);
  d.addEventListener("input", onFrameInput);
  d.addEventListener("keydown", onFrameKey);
  d.addEventListener("focusout", onFrameBlur);
  d.addEventListener("submit", (e) => e.preventDefault(), true);
  d.addEventListener("dragstart", (e) => { if (!e.target?.closest?.("[data-edit]")) e.preventDefault(); });
}
function readEditable(node) {
  let v = typeof node.innerText === "string" ? node.innerText : node.textContent;
  v = String(v || "").replace(/\u00a0/g, " ");
  if (!node.dataset.multi) v = v.replace(/\s*\n+\s*/g, " ");
  return v.replace(/\n{3,}/g, "\n\n").trim();
}
function onFrameClick(e) {
  const t = e.target;
  if (!t?.closest) return;
  const blockEl = t.closest("[data-block]");
  if (t.closest("a")) e.preventDefault();
  if (t.closest("summary")) e.preventDefault();
  if (t.closest('button[type="submit"]')) e.preventDefault();
  if (!blockEl) return;
  const id = blockEl.dataset.block;
  const pl = t.closest("[data-page]");
  if (pl) { goPage(+pl.dataset.page); return; } // a page in the site menu opens that page
  if (t.closest("[data-edit]")) { select(id); return; }
  const img = t.closest("[data-img]");
  if (img) { select(id); replaceImage(id, img.dataset.img); return; }
  const link = t.closest("[data-link]");
  if (link) { select(id); openLinkDialog(id, link.dataset.link); return; }
  if (t.closest(".menu-btn, input, textarea, [data-order]")) { select(id); return; }
  select(id, { tab: isPhone() ? null : "edit" });
}
function onFrameInput(e) {
  const ed = e.target?.closest?.("[data-edit]");
  const blockEl = ed?.closest("[data-block]");
  const b = blockById(blockEl?.dataset.block);
  if (!b) return;
  const path = ed.dataset.edit, value = readEditable(ed);
  pushHistory(`${b.id}:${path}`);
  setPath(b.data, path, value);
  syncPanelField(b.id, path, value);
  scheduleSave();
  scheduleMobile();
}
function onFrameKey(e) {
  const ed = e.target?.closest?.("[data-edit]");
  if (ed) {
    if ((e.key === "Enter" && !ed.dataset.multi) || e.key === "Escape") { e.preventDefault(); ed.blur(); }
    else if (e.key === " " && ed.closest("summary")) { e.preventDefault(); try { ed.ownerDocument.execCommand("insertText", false, " "); } catch {} }
    return;
  }
  const img = e.target?.closest?.("[data-img]");
  if (img && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); img.click(); return; }
  globalKeys(e);
}
function onFrameBlur(e) {
  if (!e.target?.closest?.("[data-edit]")) return;
  renderBlockList();
  hist.lastKey = "";
}
function markSelected(scroll) {
  const d = frameDoc;
  if (!d?.body) return;
  d.querySelectorAll(".ed-sel").forEach((x) => x.classList.remove("ed-sel"));
  const node = state.selected ? d.querySelector(`[data-block="${state.selected}"]`) : null;
  if (node) { node.classList.add("ed-sel"); if (scroll) node.scrollIntoView?.({ behavior: "smooth", block: "start" }); }
}
function select(id, { scroll = false, tab = null } = {}) {
  const changed = state.selected !== id;
  state.selected = id;
  $$(".blk-item").forEach((li) => { const on = li.dataset.id === id; li.classList.toggle("sel", on); });
  markSelected(scroll);
  if (tab && shell && tab === "edit" && shell.el.dataset.panel !== "layers") { if (changed && state.tab === "edit") renderEditPane(); }
  else if (tab) setTab(tab);
  else if (changed && state.tab === "edit") renderEditPane();
  updateBar();
}
function syncPanelField(blockId, path, value) {
  const inp = $(`#editPane [data-block="${blockId}"][data-path="${path}"]`);
  if (inp && document.activeElement !== inp) inp.value = Array.isArray(value) ? value.join("\n") : value;
}

/* ------------------------------------------------------------------ preview size */
function setSize(size) {
  state.size = size;
  $$(".sizes [data-size]").forEach((b) => { const on = b.dataset.size === size; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  layoutFrame();
}
function layoutFrame() {
  const stage = $("#stage"), box = $("#frameBox");
  const W = stage.clientWidth, H = stage.clientHeight;
  const narrow = W > 0 && W < 560;
  const pad = narrow ? 0 : 40, top = narrow ? 0 : 18;
  const target = state.size === "phone" ? 390 : state.size === "tablet" ? 768 : Math.max(980, W - pad);
  const fit = W > 0 ? Math.min(1, (W - pad) / target) : 1;
  const k = state.zoom ? state.zoom : fit;
  state.k = k;
  box.style.width = target + "px";
  box.style.height = Math.max(240, (H - top * (narrow ? 0 : 2)) / Math.max(k, fit)) + "px";
  box.style.transform = k < 1 ? `scale(${k})` : "";
  box.style.left = Math.max(0, (W - target * k) / 2) + "px";
  box.style.top = top + "px";
  box.dataset.size = state.size;
  box.classList.toggle("flat", narrow && state.size === "phone");
}

/* ------------------------------------------------------------------ side panel tabs + phone sheet */
function setTab(tab) {
  state.tab = tab;
  $$(".side-head [data-tab]").forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  $$(".pane").forEach((p) => { p.hidden = p.id !== "pane-" + tab; });
  $$(".tools [data-panel]").forEach((b) => b.classList.toggle("on", document.body.classList.contains("sheet-open") && b.dataset.panel === tab));
  renderPanes();
}
function openSheet(tab) {
  const open = document.body.classList.contains("sheet-open");
  if (open && state.tab === tab) { closeSheet(); return; }
  document.body.classList.add("sheet-open");
  setTab(tab);
}
function closeSheet() { document.body.classList.remove("sheet-open"); $$(".tools [data-panel]").forEach((b) => b.classList.remove("on")); }
function renderPanes() { if (state.tab === "edit") renderEditPane(); else if (state.tab === "theme") renderThemePane(); }

/* ------------------------------------------------------------------ blocks list (drag to reorder) */
function renderBlockList() {
  const ol = $("#blockList");
  if (drag) return;
  const n = state.site.blocks.length;
  ol.innerHTML = state.site.blocks.map((b, i) => {
    const label = labelOf(b), sub = blockTitle(b);
    return `<li class="blk-item${b.id === state.selected ? " sel" : ""}" data-id="${b.id}">
<button type="button" class="handle" aria-label="Move ${esc(label)}: drag, or press Alt and the arrow keys" title="Drag to move"><span aria-hidden="true">⠿</span></button>
<button type="button" class="blk-name" data-act="edit"><b>${esc(label)}</b><small>${sub ? esc(sub) : "&nbsp;"}</small></button>
<span class="acts"><button type="button" class="mini" data-act="up" aria-label="Move ${esc(label)} up" title="Move up"${i === 0 ? " disabled" : ""}>${svgI(ICON.up)}</button><button type="button" class="mini" data-act="down" aria-label="Move ${esc(label)} down" title="Move down"${i === n - 1 ? " disabled" : ""}>${svgI(ICON.down)}</button><button type="button" class="mini" data-act="dup" aria-label="Duplicate ${esc(label)}" title="Duplicate">${svgI(ICON.dup)}</button><button type="button" class="mini" data-act="del" aria-label="Delete ${esc(label)}" title="Delete">${svgI(ICON.del)}</button></span></li>`;
  }).join("");
}
function blockAction(act, id) {
  const i = state.site.blocks.findIndex((b) => b.id === id);
  if (i < 0) return;
  const b = state.site.blocks[i];
  if (act === "edit") { select(id, { scroll: true, tab: "edit" }); return; }
  if (act === "up" || act === "down") { change((s) => moveBlock(s, i, act === "up" ? i - 1 : i + 1)); select(id, { scroll: true }); focusItem(id, act === "up" ? '[data-act="up"]' : '[data-act="down"]'); return; }
  if (act === "dup") { if (!canAddBlock(state.site)) { toast(fullMsg()); return; } const c = change((s) => duplicateBlock(s, id)); if (c) select(c.id, { scroll: true }); toast(`${labelOf(b)} duplicated`); return; }
  if (act === "del") {
    change((s) => removeBlock(s, id));
    if (state.selected === id) state.selected = null;
    renderPanes();
    toast(`${labelOf(b)} removed. Press Undo to bring it back.`);
  }
}
function focusItem(id, sel) { const btn = $(`.blk-item[data-id="${id}"] ${sel}`); if (btn && !btn.disabled) btn.focus(); else $(`.blk-item[data-id="${id}"] .handle`)?.focus(); }
let drag = null;
function setupList() {
  const ol = $("#blockList");
  ol.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    const li = e.target.closest(".blk-item");
    if (btn && li) blockAction(btn.dataset.act, li.dataset.id);
  });
  ol.addEventListener("keydown", (e) => {
    const li = e.target.closest(".blk-item");
    if (!li || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const i = state.site.blocks.findIndex((b) => b.id === li.dataset.id);
    change((s) => moveBlock(s, i, e.key === "ArrowUp" ? i - 1 : i + 1));
    focusItem(li.dataset.id, ".handle");
  });
  ol.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".handle");
    if (!h || (e.button ?? 0) > 0) return;
    e.preventDefault();
    const li = h.closest(".blk-item"), items = $$(".blk-item", ol), from = items.indexOf(li);
    drag = { li, from, to: from, startY: e.clientY, rects: items.map((x) => x.getBoundingClientRect()), base: ol.getBoundingClientRect(), id: e.pointerId, line: el("div", { class: "drop-line", "aria-hidden": "true" }) };
    try { h.setPointerCapture(e.pointerId); } catch {}
    li.classList.add("dragging");
    ol.append(drag.line);
    placeLine();
  });
  ol.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.li.style.transform = `translateY(${e.clientY - drag.startY}px)`;
    let k = 0;
    drag.rects.forEach((r, i) => { if (i !== drag.from && r.top + r.height / 2 < e.clientY) k++; });
    drag.to = k;
    placeLine();
  });
  const end = (e, cancel) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { from, to, li, line } = drag;
    line.remove(); li.style.transform = ""; li.classList.remove("dragging");
    const id = li.dataset.id;
    drag = null;
    if (!cancel && to !== from) {
      change((s) => moveBlock(s, from, to));
      select(id, { scroll: true });
      toast(`${labelOf(blockById(id))} moved`);
    } else renderBlockList();
  };
  ol.addEventListener("pointerup", (e) => end(e, false));
  ol.addEventListener("pointercancel", (e) => end(e, true));
  ol.addEventListener("lostpointercapture", (e) => { if (drag && e.pointerId === drag.id) end(e, false); });
}
function placeLine() {
  const others = drag.rects.filter((_, i) => i !== drag.from);
  const y = drag.to < others.length ? others[drag.to].top - 4 : (others.at(-1)?.bottom ?? drag.base.top) + 2;
  drag.line.style.top = `${y - drag.base.top}px`;
}

/* ------------------------------------------------------------------ Edit pane (fields from the block definition) */
function anchorOptions() {
  const ids = anchors(state.site);
  return state.site.blocks.filter((b) => ids[b.id]).map((b) => [`#${ids[b.id]}`, `${labelOf(b)}${blockTitle(b) ? ": " + blockTitle(b) : ""}`]);
}
/** Link targets on other pages: "page:<slug>" (home = "page:index"); shown in the link dialog and the "Goes to" lists. */
function pageOptions() {
  const pages = pageList(state.site), cur = state.site.page || 0;
  return pages.length < 2 ? [] : pages.map((p, i) => [`page:${i ? p.slug : "index"}`, `Page: ${p.name}${i === cur ? " (this page)" : ""}`]);
}
function fillDatalist() { $("#anchorList").innerHTML = [["#top", "Top of the page"], ...anchorOptions(), ...pageOptions()].map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(""); }
function input(b, path, type, value, { key = path, onInput, label, multiline = false, placeholder = "" } = {}) {
  const lab = el("label", { class: "fld" }, `<span>${esc(label)}</span>`);
  const inp = el(multiline ? "textarea" : "input", { class: "ad-input", "data-block": b.id, "data-path": path, placeholder: placeholder || null, list: type === "href" ? "anchorList" : null });
  if (!multiline) inp.type = type === "email" ? "email" : type === "tel" ? "tel" : "text";
  if (multiline) inp.rows = 3;
  inp.value = value ?? "";
  inp.addEventListener("input", () => change(() => onInput(inp.value), { key: `${b.id}:${key}`, panels: false, delay: 220 }));
  inp.addEventListener("blur", () => { hist.lastKey = ""; });
  lab.append(inp);
  return lab;
}
function imageField(b, path, label, optional, { style = false } = {}) {
  const val = style ? b.style?.bgImage : getPath(b.data, path);
  const box = el("div", { class: "fld" }, `<span>${esc(label)}</span>`);
  const row = el("div", { class: "img-fld" });
  row.append(val ? el("img", { src: val, alt: "" }) : el("span", { class: "noimg", text: "No picture" }));
  const rep = el("button", { type: "button", class: "btn", "data-path": path, text: val ? "Replace" : "Upload" });
  rep.addEventListener("click", () => pickImage((url) => { change(() => { if (style) b.style.bgImage = url; else setPath(b.data, path, url); }); toast("Picture updated"); }));
  row.append(rep);
  if (val && (optional || style)) {
    const rm = el("button", { type: "button", class: "btn", text: "Remove" });
    rm.addEventListener("click", () => change(() => { if (style) b.style.bgImage = ""; else setPath(b.data, path, ""); }));
    row.append(rm);
  }
  box.append(row);
  return box;
}
function fieldEl(b, f, base = "") {
  const path = base + f.k, val = getPath(b.data, path);
  switch (f.t) {
    case "text": case "email": case "tel": case "href": case "area":
      return input(b, path, f.t, val, { label: f.label, multiline: f.t === "area", onInput: (v) => setPath(b.data, path, v) });
    case "lines":
      return input(b, path, "lines", (Array.isArray(val) ? val : []).join("\n"), { label: f.label, multiline: true, onInput: (v) => setPath(b.data, path, v.split("\n")) });
    case "link": {
      const fs = el("fieldset", { class: "sub-fld" }, `<legend>${esc(f.label)}</legend>`);
      fs.append(input(b, path + ".label", "text", val?.label, { label: "Text", onInput: (v) => setPath(b.data, path + ".label", v), placeholder: "Leave empty to hide" }));
      fs.append(input(b, path + ".href", "href", val?.href, { label: "Goes to", onInput: (v) => setPath(b.data, path + ".href", v), placeholder: "#contact, https://…, phone or email" }));
      return fs;
    }
    case "select": case "icon": {
      const lab = el("label", { class: "fld" }, `<span>${esc(f.label)}</span>`);
      const sel = el("select", { class: "ad-input", "data-block": b.id, "data-path": path });
      const opts = f.t === "icon" ? ICON_NAMES.map((n) => [n, n[0].toUpperCase() + n.slice(1)]) : f.options;
      sel.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}"${v === val ? " selected" : ""}>${esc(l)}</option>`).join("");
      sel.addEventListener("change", () => change(() => setPath(b.data, path, sel.value), { panels: false }));
      if (f.t === "icon") { const row = el("div", { class: "icon-row" }); const pv = el("span", { class: "icon-pv" }, svgI(ICONS[val] || ICONS.star)); sel.addEventListener("change", () => { pv.innerHTML = svgI(ICONS[sel.value]); }); row.append(pv, sel); lab.append(row); }
      else lab.append(sel);
      return lab;
    }
    case "bool": {
      const lab = el("label", { class: "check" });
      const cb = el("input", { type: "checkbox", "data-block": b.id, "data-path": path });
      cb.checked = !!val;
      cb.addEventListener("change", () => change(() => setPath(b.data, path, cb.checked), { panels: false }));
      lab.append(cb, document.createTextNode(" " + f.label));
      return lab;
    }
    case "color": {
      const box = el("div", { class: "fld" }, `<span>${esc(f.label)}</span>`);
      const row = el("div", { class: "color-row" });
      const c = el("input", { type: "color", "data-block": b.id, "data-path": path, "aria-label": f.label, value: /^#[0-9a-f]{6}$/i.test(val || "") ? val : "#1b2133" });
      const code = el("code", { text: val || "Default" });
      const reset = el("button", { type: "button", class: "btn", text: "Default", "data-reset": path });
      c.addEventListener("input", () => { code.textContent = c.value; change(() => setPath(b.data, path, c.value), { key: `${b.id}:${path}`, panels: false, delay: 60 }); });
      reset.addEventListener("click", () => { code.textContent = "Default"; change(() => setPath(b.data, path, ""), { panels: false }); });
      row.append(c, code, reset); box.append(row);
      return box;
    }
    case "image": return imageField(b, path, f.label, f.optional);
    case "list": {
      const arr = Array.isArray(val) ? val : [];
      const fs = el("fieldset", { class: "list-fld" }, `<legend>${esc(f.label)} <small>(${arr.length})</small></legend>`);
      arr.forEach((item, i) => {
        const key = `${b.id}:${path}.${i}`;
        const det = el("details", { class: "item-card", open: openItems.has(key) || null });
        const first = f.item.find((x) => ["text", "area"].includes(x.t));
        const name = String(item?.[first?.k] ?? item?.label ?? "").replace(/\s+/g, " ").trim().slice(0, 36);
        const sum = el("summary", {}, `<span class="item-name">${esc(f.itemLabel)} ${i + 1}${name ? ": " + esc(name) : ""}</span>`);
        const acts = el("span", { class: "acts" });
        const mk = (act, label, icon, dis) => { const x = el("button", { type: "button", class: "mini", "aria-label": `${label} ${f.itemLabel.toLowerCase()} ${i + 1}`, title: label, disabled: dis || null }, svgI(icon)); x.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); listAction(b, path, i, act, f); }); return x; };
        acts.append(mk("up", "Move up", ICON.up, i === 0), mk("down", "Move down", ICON.down, i === arr.length - 1), mk("del", "Remove", ICON.del));
        sum.append(acts);
        det.append(sum);
        const body = el("div", { class: "item-body" });
        for (const sub of f.item) body.append(fieldEl(b, sub, `${path}.${i}.`));
        det.append(body);
        det.addEventListener("toggle", () => { if (det.open) openItems.add(key); else openItems.delete(key); });
        fs.append(det);
      });
      const add = el("button", { type: "button", class: "btn wide add-item", text: `+ Add ${f.itemLabel.toLowerCase()}` });
      add.addEventListener("click", () => { openItems.add(`${b.id}:${path}.${arr.length}`); change(() => { const a = getPath(b.data, path); if (Array.isArray(a)) a.push(f.add()); else setPath(b.data, path, [f.add()]); }); });
      fs.append(add);
      return fs;
    }
    default: return el("span");
  }
}
function listAction(b, path, i, act) {
  const arr = getPath(b.data, path);
  if (!Array.isArray(arr)) return;
  const shift = (from, to) => { const keyA = `${b.id}:${path}.${from}`, keyB = `${b.id}:${path}.${to}`; const a = openItems.has(keyA), c = openItems.has(keyB); openItems.delete(keyA); openItems.delete(keyB); if (a) openItems.add(keyB); if (c) openItems.add(keyA); };
  if (act === "up" && i > 0) { shift(i, i - 1); change(() => arr.splice(i - 1, 0, arr.splice(i, 1)[0])); }
  else if (act === "down" && i < arr.length - 1) { shift(i, i + 1); change(() => arr.splice(i + 1, 0, arr.splice(i, 1)[0])); }
  else if (act === "del") { openItems.delete(`${b.id}:${path}.${i}`); change(() => arr.splice(i, 1)); toast("Removed. Press Undo to bring it back."); }
}
/* Animate (Canva parity): an entrance animation per block, or one for every block on the page. They play in Preview and on
   the published site when the block scrolls into view (never while editing). */
const animName = (k) => ANIMS.find(([v]) => v === (k || ""))?.[1] || "None";
function setAnim(id, anim) {
  const b = blockById(id);
  if (!b || b.type === "header" || !ANIMS.some(([v]) => v === anim)) return false;
  change(() => { b.style.anim = anim; }, { panels: false });
  return true;
}
function animateAll(anim) {
  if (!ANIMS.some(([v]) => v === anim)) return 0;
  let n = 0;
  change((s) => { for (const b of s.blocks) if (b.type !== "header") { b.style.anim = anim; n++; } });
  toast(anim ? `${animName(anim)} animation on all ${n} blocks of this page. Open Preview to see it.` : "Animations removed from this page.");
  return n;
}
function animField(b) {
  const box = el("fieldset", { class: "sub-fld" }, "<legend>Animate</legend>");
  const lab = el("label", { class: "fld" }, "<span>When the block comes into view</span>");
  const sel = el("select", { class: "ad-input", id: "blockAnim", "aria-label": "Block animation" });
  sel.innerHTML = ANIMS.map(([v, l]) => `<option value="${v}"${(b.style.anim || "") === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  sel.addEventListener("change", () => setAnim(b.id, sel.value));
  lab.append(sel);
  const all = el("button", { type: "button", class: "btn wide", id: "animAll", text: "Use on every block of this page" });
  all.addEventListener("click", () => animateAll(sel.value));
  box.append(lab, all, el("p", { class: "hint", text: "Animations play in Preview and on the published site, once, as visitors scroll. Visitors who turn off motion see no animation." }));
  return box;
}
function renderEditPane() {
  const pane = $("#editPane");
  const b = blockById(state.selected);
  pane.innerHTML = "";
  fillDatalist();
  if (!b) { pane.innerHTML = `<div class="empty-pane"><p><b>No block selected</b></p><p class="hint">Click a block in the preview or in the Blocks list to change its pictures, buttons, colours and more. To change text, just click it in the preview and type.</p></div>`; return; }
  const def = BLOCK_TYPES[b.type], i = state.site.blocks.indexOf(b);
  const head = el("div", { class: "edit-head" }, `<div><h3>${esc(def.label)}</h3><small class="hint">Block ${i + 1} of ${state.site.blocks.length}</small></div>`);
  const acts = el("span", { class: "acts" });
  for (const [act, label] of [["up", "Move up"], ["down", "Move down"], ["dup", "Duplicate"], ["del", "Delete"]]) {
    const x = el("button", { type: "button", class: "mini", "data-act": act, "aria-label": `${label} this block`, title: label }, svgI(ICON[act]));
    x.addEventListener("click", () => blockAction(act, b.id));
    acts.append(x);
  }
  head.append(acts);
  pane.append(head);
  pane.append(el("p", { class: "hint" }, "Tip: click any text in the preview to type over it. Click a picture to replace it."));
  for (const f of def.fields) pane.append(fieldEl(b, f));
  // Background, section link
  const bgBox = el("fieldset", { class: "sub-fld" }, "<legend>Background</legend>");
  const sel = el("select", { class: "ad-input", "aria-label": "Background colour", id: "blockBg" });
  const custom = /^#/.test(b.style.bg || "");
  sel.innerHTML = BG_CHOICES.map(([v, l]) => `<option value="${v}"${(b.style.bg || "") === v ? " selected" : ""}>${l}</option>`).join("") + `<option value="custom"${custom ? " selected" : ""}>Pick a colour…</option>`;
  const color = el("input", { type: "color", "aria-label": "Custom background colour", id: "blockBgColor", value: custom ? b.style.bg : "#f4f1ff", hidden: custom ? null : true });
  sel.addEventListener("change", () => { color.hidden = sel.value !== "custom"; change(() => { b.style.bg = sel.value === "custom" ? color.value : sel.value; }, { panels: false }); });
  color.addEventListener("input", () => change(() => { b.style.bg = color.value; }, { key: `${b.id}:bg`, panels: false, delay: 60 }));
  const row = el("div", { class: "color-row" }); row.append(sel, color);
  bgBox.append(el("label", { class: "fld" }, "<span>Colour</span>"));
  bgBox.lastChild.append(row);
  if (!(b.type === "hero" && b.data.layout === "cover")) bgBox.append(imageField(b, "style.bgImage", "Background picture (darkened so text stays readable)", true, { style: true }));
  pane.append(bgBox);
  if (b.type !== "header") pane.append(animField(b));
  if (BLOCK_TYPES[b.type].anchor) {
    const ids = anchors(state.site);
    const lab = input(b, "anchor", "text", b.anchor ?? ids[b.id], { label: `Section link name (menu links use #${ids[b.id]})`, onInput: (v) => { b.anchor = slugify(v); } });
    pane.append(lab);
  }
}

/* ------------------------------------------------------------------ Theme pane */
function renderThemePane() {
  const pane = $("#themePane"), t = state.site.theme, brand = loadBrand();
  const fonts = Object.entries(FONT_FAMILIES).map(([k, f]) => [k, f.label]);
  const opt = (list, v) => list.map(([k, l]) => `<option value="${esc(k)}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  const sw = (target) => (brand.colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).map((c) => `<button type="button" class="swatch${c.toLowerCase() === String(t[target]).toLowerCase() ? " on" : ""}" data-target="${target}" data-color="${c}" style="background:${c}" aria-label="Use brand colour ${c} as ${target === "primary" ? "main" : "accent"} colour" title="${c}"></button>`).join("");
  pane.innerHTML = `
<h3 class="pane-title">Site details</h3>
<label class="fld"><span>Page title (browser tab and search results)</span><input class="ad-input" id="themeTitle" type="text" maxlength="120"></label>
<label class="fld"><span>Short description (Google and link previews)</span><textarea class="ad-input" id="themeDesc" rows="3" maxlength="300"></textarea></label>
<h3 class="pane-title">Colour sets</h3>
<div class="presets">${Object.entries(PALETTES).map(([k, p]) => `<button type="button" class="preset" data-preset="${k}" aria-label="Use the ${k} colour set"><span class="dots"><i style="background:${p.a}"></i><i style="background:${p.b}"></i></span>${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
<h3 class="pane-title">Colours</h3>
<div class="fld"><span>Main colour (buttons, links)</span><div class="color-row"><input type="color" id="themePrimary" aria-label="Main colour" value="${esc(t.primary)}"><code id="themePrimaryHex">${esc(t.primary)}</code></div><div class="swatches" aria-label="Brand kit colours">${sw("primary")}</div></div>
<div class="fld"><span>Accent colour (badges, highlights)</span><div class="color-row"><input type="color" id="themeAccent" aria-label="Accent colour" value="${esc(t.accent)}"><code>${esc(t.accent)}</code></div><div class="swatches">${sw("accent")}</div></div>
<div class="fld"><span>Page background and text</span><div class="color-row"><input type="color" id="themeBg" aria-label="Page background colour" value="${esc(t.bg)}"><input type="color" id="themeText" aria-label="Text colour" value="${esc(t.text)}"></div></div>
${(brand.colors || []).length ? `<button type="button" class="btn wide" id="useBrand">Use my brand kit (${esc(brand.name || "brand")})</button>` : ""}
<h3 class="pane-title">Light or dark</h3>
<div class="ad-tabs" role="group" aria-label="Light or dark">${["light", "dark"].map((m) => `<button type="button" data-mode="${m}" class="${t.mode === m ? "on" : ""}" aria-pressed="${t.mode === m}">${m === "light" ? "Light" : "Dark"}</button>`).join("")}</div>
<h3 class="pane-title">Fonts</h3>
<label class="fld"><span>Headings</span><select class="ad-input" id="themeHeadingFont">${opt(fonts, t.headingFont)}</select></label>
<label class="fld"><span>Text</span><select class="ad-input" id="themeBodyFont">${opt(fonts, t.bodyFont)}</select></label>
<h3 class="pane-title">Corners</h3>
<div class="ad-tabs" role="group" aria-label="Corner style">${Object.entries(CORNERS).map(([k, c]) => `<button type="button" data-corners="${k}" class="${t.corners === k ? "on" : ""}" aria-pressed="${t.corners === k}">${c.label}</button>`).join("")}</div>`;
  $("#themeTitle").value = state.site.name;
  $("#themeDesc").value = state.site.description || "";
  const quiet = { panels: false };
  $("#themeTitle").addEventListener("input", (e) => { change((s) => { s.name = e.target.value; }, { ...quiet, key: "name", delay: 300 }); if (document.activeElement !== $("#siteName")) $("#siteName").value = e.target.value; });
  $("#themeDesc").addEventListener("input", (e) => change((s) => { s.description = e.target.value; }, { ...quiet, key: "desc", preview: false }));
  const colorInput = (id, k) => $(id).addEventListener("input", (e) => { change((s) => { s.theme[k] = e.target.value; }, { ...quiet, key: "theme." + k, delay: 50 }); const code = e.target.parentElement.querySelector("code"); if (code) code.textContent = e.target.value; });
  colorInput("#themePrimary", "primary"); colorInput("#themeAccent", "accent"); colorInput("#themeBg", "bg"); colorInput("#themeText", "text");
  $("#themeHeadingFont").addEventListener("change", (e) => change((s) => { s.theme.headingFont = e.target.value; }, quiet));
  $("#themeBodyFont").addEventListener("change", (e) => change((s) => { s.theme.bodyFont = e.target.value; }, quiet));
}
function themeClick(e) {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.color) { change((s) => { s.theme[b.dataset.target] = b.dataset.color; }); toast("Colour applied"); }
  else if (b.dataset.preset) { const p = PALETTES[b.dataset.preset]; change((s) => { s.theme.primary = p.a; s.theme.accent = p.b; }); }
  else if (b.dataset.mode) { const m = b.dataset.mode; change((s) => { s.theme.mode = m; s.theme.bg = MODES[m].bg; s.theme.text = MODES[m].text; }); }
  else if (b.dataset.corners) change((s) => { s.theme.corners = b.dataset.corners; });
  else if (b.id === "useBrand") {
    const br = loadBrand(), c = (br.colors || []).filter((x) => /^#[0-9a-f]{6}$/i.test(x));
    change((s) => { if (c[0]) s.theme.primary = c[0]; if (c[1]) s.theme.accent = c[1]; if (FONT_FAMILIES[br.fonts?.heading]) s.theme.headingFont = br.fonts.heading; if (FONT_FAMILIES[br.fonts?.body]) s.theme.bodyFont = br.fonts.body; });
    toast("Brand kit colours and fonts applied");
  }
}

/* ------------------------------------------------------------------ images */
let imageCb = null, imageMax = 1600;
function pickImage(cb, max = 1600) { imageCb = cb; imageMax = max; const inp = $("#imageInput"); inp.value = ""; inp.click(); }
function replaceImage(blockId, path) { pickImage((url) => { const b = blockById(blockId); if (!b) return; change(() => setPath(b.data, path, url)); toast("Picture replaced"); }); }
const readAsDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read the picture.")); r.readAsDataURL(file); });
/** Picture file -> data: URL, downscaled to at most 1600 px (JPEG, or PNG when it has see-through parts). */
async function fileToDataUrl(file, max = 1600) {
  if (!/^image\//.test(file.type || "")) throw new Error("Please choose a picture (JPG, PNG, WebP, GIF or SVG).");
  if (file.size > 30e6) throw new Error("That picture is too big (30 MB at most).");
  const raw = await readAsDataUrl(file);
  if (/svg|gif/.test(file.type)) return raw;
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return raw; }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size < 400e3) { bmp.close?.(); return raw; }
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const g = c.getContext("2d");
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  let alpha = false;
  if (/png|webp/.test(file.type)) { try { const d = g.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) { alpha = true; break; } } catch {} }
  const out = c.toDataURL(alpha ? "image/png" : "image/jpeg", 0.86);
  return out.length > 30 && (k < 1 || out.length < raw.length) ? out : raw;
}

/* ------------------------------------------------------------------ link dialog */
let linkCtx = null;
function openLinkDialog(blockId, path) {
  const b = blockById(blockId);
  if (!b) return;
  const l = getPath(b.data, path) || { label: "", href: "" };
  linkCtx = { blockId, path, inList: /\.\d+$/.test(path) };
  $("#linkLabel").value = l.label || "";
  $("#linkHref").value = l.href || "";
  fillDatalist();
  $("#linkSection").innerHTML = `<option value="">Choose a page or section…</option>` + [["#top", "Top of the page"], ...anchorOptions(), ...pageOptions()].map(([v, t]) => `<option value="${esc(v)}"${v === l.href ? " selected" : ""}>${esc(t)}</option>`).join("");
  $("#linkRemove").textContent = linkCtx.inList ? "Remove this link" : "Hide this button";
  openDlg($("#linkDlg"));
  $("#linkLabel").focus();
}
function saveLink(remove = false) {
  const b = linkCtx && blockById(linkCtx.blockId);
  if (!b) return;
  const { path, inList } = linkCtx;
  if (remove && inList) { const parts = path.split("."), i = +parts.pop(); change(() => getPath(b.data, parts.join("."))?.splice(i, 1)); }
  else if (remove) change(() => setPath(b.data, path, { label: "", href: getPath(b.data, path)?.href || "" }));
  else change(() => setPath(b.data, path, { label: $("#linkLabel").value.trim(), href: $("#linkHref").value.trim() }));
  linkCtx = null;
  closeDlg($("#linkDlg"));
}

/* ------------------------------------------------------------------ templates, blocks, projects */
function renderTemplateGrid() {
  const g = $("#tplGrid");
  if (g.childElementCount) return;
  const card = (id, label, desc, img) => `<button type="button" class="tpl" data-template="${id}" aria-label="Start a ${esc(label)} site"><span class="tpl-img">${img ? `<img src="${img}" alt="" loading="lazy">` : `<span class="tpl-blank" aria-hidden="true">+</span>`}</span><span class="meta"><b>${esc(label)}</b><small>${esc(desc)}</small></span></button>`;
  g.innerHTML = TEMPLATES.map((t) => card(t.id, t.label, t.desc, templateArt(t.id))).join("") + card("blank", "Blank page", "Just a header, a headline and a footer. Add blocks yourself.", "");
}
async function applyTemplate(id) {
  await flush();
  state.site = id === "blank" ? blankSite() : gallery.hasTemplate(id) ? gallery.makeSite(id) : makeTemplate(id);
  state.projectId = null; state.selected = null;
  hist.past = []; hist.future = []; hist.lastKey = "";
  openItems.clear();
  renderAll();
  await save();
  const t = gallery.TEMPLATES.find((x) => x.id === id) || TEMPLATES.find((x) => x.id === id);
  toast(`New site started from the ${t ? t.name || t.label : "blank"} template`);
  return state.site;
}
function renderAddGrid() {
  $("#addGrid").innerHTML = BLOCK_ORDER.map((type) => `<button type="button" class="add-card" data-type="${type}"><b>${esc(BLOCK_TYPES[type].label)}</b><small>${esc(BLOCK_TYPES[type].desc)}</small></button>`).join("");
}
const fullMsg = () => `A page can have up to ${MAX_SECTIONS} sections. Remove one, or add a new page.`;
function addBlock(type) {
  if (!canAddBlock(state.site)) { toast(fullMsg()); return null; }
  const b = newBlock(type, type === "header" ? { brand: state.site.name } : {});
  // A menu bar (navigation menu) always goes to the top of the page, like Canva's "Navigation menu".
  change((s) => insertBlock(s, b, type === "header" ? 0 : insertIndex(s, state.selected)));
  select(b.id, { scroll: true });
  toast(`${labelOf(b)} added`);
  return b.id;
}
async function renderProjects() {
  const ul = $("#projList");
  let list = [];
  try { list = await listProjects(APP); } catch { ul.innerHTML = `<li class="hint">Could not read saved sites in this browser.</li>`; return; }
  if (!list.length) { ul.innerHTML = `<li class="hint">No saved sites yet.</li>`; return; }
  ul.innerHTML = list.map((p) => `<li class="proj${p.id === state.projectId ? " current" : ""}" data-id="${esc(p.id)}"><div class="info"><b>${esc(p.name || "Untitled site")}</b><small>${p.id === state.projectId ? "Open now · " : ""}Saved ${esc(fmtDate(p.updated))} · ${p.data?.blocks?.length || 0} blocks</small></div>
<span class="row"><button type="button" class="btn" data-act="open"${p.id === state.projectId ? " disabled" : ""}>Open</button><button type="button" class="btn" data-act="rename">Rename</button><button type="button" class="btn" data-act="dup">Duplicate</button><button type="button" class="btn danger" data-act="del">Delete</button></span></li>`).join("");
}
async function projectAction(act, id, li, btn) {
  if (act === "open") { await flush(); const rec = await getProject(id); if (rec?.data) { loadRecord(rec); closeDlg($("#projectsDlg")); toast(`Opened ${rec.name}`); } return; }
  if (act === "dup") { await flush(); const rec = await getProject(id); if (rec) { await saveProject({ app: APP, name: `${rec.name} (copy)`, data: { ...rec.data, name: `${rec.name} (copy)` } }); await renderProjects(); toast("Copy saved"); } return; }
  if (act === "del") {
    if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "Sure? Delete"; setTimeout(() => { if (btn.isConnected) { btn.dataset.sure = ""; btn.textContent = "Delete"; } }, 4000); return; }
    await deleteProject(id);
    if (id === state.projectId) {
      const next = (await listProjects(APP))[0];
      if (next) loadRecord(next); else { state.site = blankSite(); state.projectId = null; renderAll(); await save(); }
    }
    await renderProjects(); toast("Site deleted");
    return;
  }
  if (act === "rename") {
    const info = li.querySelector(".info"), rec = await getProject(id);
    info.innerHTML = "";
    const inp = el("input", { class: "ad-input", type: "text", "aria-label": "New name", maxlength: "120" });
    inp.value = rec?.name || "";
    const ok = el("button", { type: "button", class: "btn primary", text: "Save" });
    const done = async () => {
      const name = inp.value.trim() || rec.name;
      if (id === state.projectId) { change((s) => { s.name = name; }, { panels: false }); $("#siteName").value = name; await flush(); }
      else await saveProject({ ...rec, name, data: { ...rec.data, name } });
      await renderProjects();
    };
    ok.addEventListener("click", done);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); done(); } });
    info.append(inp, ok); inp.focus(); inp.select();
  }
}
function loadRecord(rec) {
  state.site = normalizeSite(rec.data); state.projectId = rec.id; state.selected = null;
  hist.past = []; hist.future = []; openItems.clear();
  try { localStorage.setItem(LAST, rec.id); } catch {}
  renderAll(); setSaveState("Saved"); state.dirty = false;
}
function load(json) {
  const data = json?.app === APP && json.site ? json.site : json;
  if (!data || !Array.isArray(data.blocks)) throw new Error("This file is not an AsaanDesk website.");
  state.site = normalizeSite(data); state.projectId = null; state.selected = null;
  hist.past = []; hist.future = []; openItems.clear();
  renderAll(); return save();
}

/* ------------------------------------------------------------------ export */
function download(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = el("a", { href: url, download: name, rel: "noopener" });
  a.style.display = "none";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
const exportHtml = () => renderExport(state.site);
// Downloads carry the template photos inside (index.html) or in images/ (ZIP), so the site works anywhere, offline too.
async function exportZip() { const { zipSync } = await import("./lib/fflate.js"); return buildZipFile(state.site, { zipSync }); }

/* ------------------------------------------------------------------ render all + events */
function renderAll() {
  if (document.activeElement !== $("#siteName")) $("#siteName").value = state.site.name;
  try { if (shell && document.activeElement !== shell.el.querySelector(".ads-title")) shell.setTitle(state.site.name); } catch {}
  updateBar();
  renderBlockList();
  renderPreview();
  renderPanes();
  updateUndo();
  layoutFrame();
  if (shell) { refreshPagesPanel(); scheduleMobile(); try { shell.refresh?.(); } catch {} }
}
function globalKeys(e) {
  const mod = e.ctrlKey || e.metaKey, k = (e.key || "").toLowerCase();
  if (!mod) return;
  if (k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  else if (k === "y") { e.preventDefault(); redo(); }
  else if (k === "s") { e.preventDefault(); flush().then(() => toast("Saved in this browser")); }
}
function setupEvents() {
  setupList();
  $("#siteName").addEventListener("input", (e) => change((s) => { s.name = e.target.value; }, { key: "name", panels: false, delay: 300 }));
  $("#siteName").addEventListener("blur", () => { hist.lastKey = ""; if (state.tab === "theme") renderThemePane(); });
  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);
  $$(".sizes [data-size]").forEach((b) => b.addEventListener("click", () => setSize(b.dataset.size)));
  $$(".side-head [data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $(".side-head .ad-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const tabs = ["blocks", "edit", "theme"], i = tabs.indexOf(state.tab);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3];
    setTab(next); $(`.side-head [data-tab="${next}"]`).focus();
  });
  $$(".tools [data-panel]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.panel)));
  $("#closeSheet").addEventListener("click", closeSheet);
  $("#themePane").addEventListener("click", themeClick);
  $$("[data-open]").forEach((b) => b.addEventListener("click", async () => {
    closeSheet();
    if (b.dataset.open === "templates") { renderTemplateGrid(); openDlg($("#templatesDlg")); }
    else { await flush(); await renderProjects(); openDlg($("#projectsDlg")); }
  }));
  const openAdd = () => { closeSheet(); renderAddGrid(); openDlg($("#addDlg")); };
  $("#addBlockBtn").addEventListener("click", openAdd);
  $("#addBlockBtn2").addEventListener("click", openAdd);
  $("#addGrid").addEventListener("click", (e) => { const c = e.target.closest("[data-type]"); if (!c) return; closeDlg($("#addDlg")); addBlock(c.dataset.type); });
  $("#tplGrid").addEventListener("click", async (e) => { const c = e.target.closest("[data-template]"); if (!c) return; closeDlg($("#templatesDlg")); await applyTemplate(c.dataset.template); });
  $$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => closeDlg(b.closest("dialog"))));
  $$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) closeDlg(d); }));
  $("#projList").addEventListener("click", (e) => { const btn = e.target.closest("button[data-act]"), li = e.target.closest(".proj"); if (btn && li) projectAction(btn.dataset.act, li.dataset.id, li, btn).catch((err) => toast(err.message)); });
  $("#newSiteBtn").addEventListener("click", () => { closeDlg($("#projectsDlg")); if (shell) { shell.openPanel("templates"); return; } renderTemplateGrid(); openDlg($("#templatesDlg")); });
  $("#saveJsonBtn").addEventListener("click", () => { download(JSON.stringify({ app: APP, version: 1, site: state.site }, null, 1), `${slugify(state.site.name)}.asaandesk-site.json`, "application/json"); toast("Saved a copy of this site as a file"); });
  $("#importInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const text = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read that file.")); r.readAsText(f); });
      let json;
      try { json = JSON.parse(text); } catch { throw new Error("This file is not an AsaanDesk website."); }
      await flush(); await load(json); closeDlg($("#projectsDlg")); toast("Site opened");
    } catch (err) { toast(err.message || "Could not open that file."); }
    e.target.value = "";
  });
  $("#linkForm").addEventListener("submit", (e) => { e.preventDefault(); saveLink(false); });
  $("#linkRemove").addEventListener("click", () => saveLink(true));
  $("#linkSection").addEventListener("change", (e) => { if (e.target.value) $("#linkHref").value = e.target.value; });
  $("#imageInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0], cb = imageCb;
    imageCb = null;
    if (!f || !cb) return;
    try { cb(await fileToDataUrl(f, imageMax)); } catch (err) { toast(err.message || "Could not use that picture."); }
  });
  $("#exportHtml").addEventListener("click", async () => {
    const name = pageFile(state.site, state.site.page || 0);
    let html;
    try { html = await exportHtmlFile(state.site); } catch { html = exportHtml(); }
    download(html, name, "text/html;charset=utf-8");
    toast(state.site.pages?.length > 1 ? `Downloaded ${name} (this page). The ZIP has every page.` : "Downloaded index.html: it opens in any browser and works offline.");
  });
  $("#exportZip").addEventListener("click", async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try { download(await exportZip(), zipName(state.site), "application/zip"); toast("Downloaded the zip: index.html plus an images folder."); }
    catch (err) { toast("Could not make the zip: " + err.message); }
    finally { btn.disabled = false; }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("sheet-open") && !$("dialog[open]")) { closeSheet(); return; }
    const t = e.target;
    if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
    globalKeys(e);
  });
  $("#preview").addEventListener("load", () => { const d = $("#preview").contentDocument; if (d && d !== frameDoc) { frameDoc = null; renderPreview(); } });
  const ro = globalThis.ResizeObserver ? new ResizeObserver(() => layoutFrame()) : null;
  ro?.observe($("#stage"));
  window.addEventListener("resize", layoutFrame);
  window.addEventListener("pagehide", () => { if (state.dirty) save(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && state.dirty) save(); });
}

/* ------------------------------------------------------------------ pages, previews and publishing (Canva parity) */
const settings = () => normSettings(state.site.settings);
function setSettings(patch, opts = {}) { change((s) => { s.settings = { ...normSettings(s.settings), ...patch }; }, { panels: false, ...opts }); }
const panelOpen = (id) => !!shell && shell.el.dataset.panel === id;

/** Opens page i of a multi-page site in the editor. */
function goPage(i) {
  if (!state.site.pages?.length) return false;
  i = Math.max(0, Math.min(state.site.pages.length - 1, i | 0));
  if (i === (state.site.page || 0)) return true;
  switchPage(state.site, i);
  state.selected = null; openItems.clear();
  renderAll(); scheduleSave(); refreshPagesPanel();
  toast(`Page: ${state.site.pages[i].name}`);
  return true;
}
function addPageUI(name) {
  const n = pageList(state.site).length;
  if (n >= MAX_PAGES) { toast(`A site can have up to ${MAX_PAGES} pages.`); return -1; }
  const i = change((s) => addPage(s, String(name || "").trim() || `Page ${n + 1}`));
  state.selected = null; renderAll(); refreshPagesPanel();
  toast(`Page added: ${state.site.pages[i].name}. It has the site menu and footer.`);
  return i;
}
function pageAction(act, i) {
  const s = state.site, P = s.pages || [];
  if (act === "open") return goPage(i);
  if (act === "up" || act === "down") { change((x) => movePage(x, i, act === "up" ? i - 1 : i + 1)); refreshPagesPanel(); renderAll(); return true; }
  if (act === "dup") { change((x) => duplicatePage(x, i)); state.selected = null; renderAll(); refreshPagesPanel(); toast("Page duplicated"); return true; }
  if (act === "del") {
    const name = P[i]?.name;
    if (!change((x) => removePage(x, i))) { toast("The home page stays. Delete other pages instead."); return false; }
    state.selected = null; renderAll(); refreshPagesPanel(); toast(`${name} deleted. Press Undo to bring it back.`);
    return true;
  }
  return false;
}
function pageThumb(i) {
  const p = pageList(state.site)[i], t = { ...state.site.theme };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" rx="8" fill="#f4f3ff"/><rect x="0" y="0" width="160" height="16" fill="#fff"/><circle cx="12" cy="8" r="4" fill="${esc(t.primary || "#5b4cf0")}"/><rect x="12" y="28" width="96" height="9" rx="4.5" fill="${esc(t.primary || "#5b4cf0")}"/><rect x="12" y="44" width="130" height="5" rx="2.5" fill="#c9c6f5"/><rect x="12" y="54" width="100" height="5" rx="2.5" fill="#c9c6f5"/><text x="12" y="86" font-family="Arial" font-size="13" font-weight="700" fill="#1b2133">${esc(p?.name || "")}</text></svg>`;
}
function renderPagesPanel(box) {
  box.replaceChildren();
  const pages = pageList(state.site), cur = state.site.page || 0, multi = pages.length > 1, S = settings();
  box.append(el("p", { class: "ws-hint", text: "Every page is its own file (index.html, about.html …). The site menu lists the pages; link a button to a page from its link box." }));
  const list = el("ol", { class: "ws-pages", id: "pageList", "aria-label": "Pages" });
  pages.forEach((p, i) => {
    const li = el("li", { class: "ws-page" + (i === cur ? " on" : ""), "data-page-index": String(i) });
    const top = el("div", { class: "ws-prow" });
    const open = el("button", { type: "button", class: "ws-pthumb", "data-pact": "open", "aria-label": `Open page ${p.name}`, title: "Open this page" }, pageThumb(i));
    open.addEventListener("click", () => pageAction("open", i));
    const nameBox = el("div", { class: "ws-pname-box" });
    if (multi) {
      const nm = el("input", { class: "ad-input ws-pname", type: "text", maxlength: "60", "aria-label": `Name of page ${i + 1}`, "data-pname": String(i) });
      nm.value = p.name;
      nm.addEventListener("change", () => { const v = nm.value.trim(); if (!v) { nm.value = p.name; return; } change((x) => renamePage(x, i, v)); renderAll(); refreshPagesPanel(); });
      nameBox.append(nm);
    } else nameBox.append(el("b", { text: "Home" }));
    nameBox.append(el("small", { class: "ws-pfile", text: `${pageFile(state.site, i)}${i === cur ? " · open now" : ""}${i === 0 ? " · home page" : ""}` }));
    const acts = el("span", { class: "acts" });
    const mk = (act, label, icon, dis) => { const b = el("button", { type: "button", class: "mini", "data-pact": act, "aria-label": `${label}: ${p.name}`, title: label, disabled: dis || null }, svgI(icon)); b.addEventListener("click", () => pageAction(act, i)); return b; };
    if (multi) acts.append(mk("up", "Move up", ICON.up, i <= 1), mk("down", "Move down", ICON.down, i === 0 || i === pages.length - 1), mk("dup", "Duplicate page", ICON.dup), mk("del", "Delete page", ICON.del, i === 0));
    top.append(open, nameBox, acts);
    li.append(top);
    if (multi) {
      // Page settings (Canva: menu label, page title, custom URL path, description, hide from menu).
      const d = el("textarea", { class: "ad-input ws-pdesc", rows: "2", maxlength: "300", placeholder: "Page description for search results (150 to 160 characters is best)", "aria-label": `Description of page ${p.name}`, "data-pdesc": String(i) });
      d.value = p.description || "";
      const dn = el("small", { class: "ws-hint ws-dcount", text: `${(p.description || "").length} characters` });
      d.addEventListener("input", () => { dn.textContent = `${d.value.length} characters${d.value.length > 160 ? " (search results cut after about 160)" : ""}`; change((x) => { if (x.pages?.[i]) x.pages[i].description = d.value; }, { key: `pdesc:${i}`, preview: false, panels: false }); });
      li.append(d, dn);
      const det = el("details", { class: "ws-pset", "data-pset": String(i) });
      det.append(el("summary", { text: i ? "Page title, address and menu" : "Page title" }));
      const ti = el("input", { class: "ad-input ws-ptitle", type: "text", maxlength: "120", placeholder: i ? `${p.name} | ${state.site.name}` : state.site.name, "aria-label": `Page title of ${p.name}`, "data-ptitle": String(i) });
      ti.value = p.title || "";
      ti.addEventListener("input", () => change((x) => setPageMeta(x, i, { title: ti.value }), { key: `ptitle:${i}`, preview: false, panels: false }));
      det.append(el("label", { class: "fld" }, "<span>Page title (browser tab and search results)</span>"));
      det.lastChild.append(ti);
      if (i > 0) {
        const pa = el("input", { class: "ad-input ws-pslug", type: "text", maxlength: "48", placeholder: "about-us", "aria-label": `Web address of ${p.name}`, "data-pslug": String(i), spellcheck: "false" });
        pa.value = p.slug;
        pa.addEventListener("change", () => { const old = p.slug; change((x) => setPageSlug(x, i, pa.value), { panels: false }); pa.value = state.site.pages[i].slug; renderAll(); refreshPagesPanel(); if (state.site.pages[i].slug !== old) toast(`Address: ${state.site.pages[i].slug}.html`); });
        det.append(el("label", { class: "fld" }, "<span>Page address (custom URL path)</span>"));
        det.lastChild.append(pa);
      }
      if (i > 0) {
        const hl = el("label", { class: "check" });
        const hc = el("input", { type: "checkbox", "data-phide": String(i) });
        hc.checked = !!p.hide;
        hc.addEventListener("change", () => { change((x) => setPageMeta(x, i, { hide: hc.checked })); toast(hc.checked ? `${p.name} is hidden from the menu. Link to it from a button.` : `${p.name} is back in the menu.`); });
        hl.append(hc, document.createTextNode(" Hide this page from the menu"));
        det.append(hl);
      }
      li.append(det);
    }
    list.append(li);
  });
  box.append(list);
  const add = el("button", { type: "button", class: "btn primary wide", id: "addPageBtn", text: "+ Add a page" });
  add.addEventListener("click", () => addPageUI());
  box.append(add);
  const lab = el("label", { class: "check ws-navtoggle" });
  const cb = el("input", { type: "checkbox", id: "navPagesToggle" });
  cb.checked = S.navPages;
  cb.addEventListener("change", () => setSettings({ navPages: cb.checked }));
  lab.append(cb, document.createTextNode(" Show the pages in the site menu"));
  box.append(lab);
  box.append(el("p", { class: "ws-hint", text: `Up to ${MAX_PAGES} pages. New pages copy the home page's menu bar and footer.` }));
}
function refreshPagesPanel() { if (panelOpen("pages")) { const b = shell.panel("pages"); if (b) renderPagesPanel(b); } }

/* Live previews: the Mobile preview panel and the full-screen Preview. Page links inside them open that page. */
function wirePreviewLinks(fr, onPage) {
  fr.addEventListener("load", () => {
    const d = fr.contentDocument;
    if (!d) return;
    const h = fr.dataset.hash || "";
    if (h) { fr.dataset.hash = ""; try { d.getElementById(h.slice(1))?.scrollIntoView(); } catch {} }
    d.addEventListener("click", (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (/^https?:/i.test(href)) { e.preventDefault(); window.open(href, "_blank", "noopener"); return; }
      if (/^(mailto|tel|sms):/i.test(href) || href.startsWith("#")) return;
      e.preventDefault();
      const m = /^([\w-]+)\.html(#[\w-]+)?$/.exec(href);
      if (!m) return;
      const pages = pageList(state.site);
      const j = m[1] === "index" ? 0 : pages.findIndex((p, k) => k > 0 && p.slug === m[1]);
      if (j >= 0) onPage(j, m[2] || "");
    });
    d.addEventListener("submit", (e) => e.preventDefault(), true);
  });
}
let mobT = 0;
function renderMobilePanel(box) {
  box.replaceChildren();
  box.append(el("p", { class: "ws-hint", id: "mobileNote", text: "Your site on a phone (390 px wide). It updates while you edit; tap the menu to try it." }));
  const wrap = el("div", { class: "ws-mob" });
  const fr = el("iframe", { id: "mobilePreview", title: "Mobile preview" });
  wrap.append(fr); box.append(wrap);
  const full = el("button", { type: "button", class: "btn wide ws-mob-full", id: "mobileFullPreview", text: "Full-screen preview" });
  full.addEventListener("click", () => { openPreview(); setPvSize("phone"); });
  box.append(full);
  wirePreviewLinks(fr, (j, hash) => { fr.dataset.hash = hash; goPage(j); });
  requestAnimationFrame(() => { wrap.style.setProperty("--k", String((wrap.clientWidth || 300) / 390)); updateMobile(); });
}
function updateMobile() {
  const fr = $("#mobilePreview");
  if (!fr || !panelOpen("mobile")) return;
  // "Resize on mobile" off: the phone shows the desktop layout (1200 px wide) zoomed out, like on a real phone.
  const w = settings().mobileResize ? 390 : 1200, wrap = fr.parentElement;
  fr.style.width = w + "px"; fr.style.height = Math.round((w * 760) / 390) + "px";
  wrap?.style.setProperty("--k", String((wrap.clientWidth || 300) / w));
  const note = $("#mobileNote");
  if (note) note.textContent = settings().mobileResize ? "Your site on a phone (390 px wide). It updates while you edit; tap the menu to try it." : "Resize on mobile is off: phones show the desktop layout, zoomed out. Turn it on in Publish settings.";
  fr.srcdoc = renderSite(state.site, { mode: "export", preview: true });
}
function scheduleMobile() { if (!panelOpen("mobile")) return; clearTimeout(mobT); mobT = setTimeout(updateMobile, 450); }

let pv = null;
function openPreview(i = state.site.page || 0) {
  closePreview();
  const pages = pageList(state.site);
  const dlg = el("dialog", { class: "ws-preview", id: "sitePreview", "aria-label": "Preview of the website" });
  const bar = el("div", { class: "ws-pv-bar" });
  const sel = el("select", { class: "ws-sel", id: "pvPage", "aria-label": "Page" });
  sel.innerHTML = pages.map((p, k) => `<option value="${k}">${esc(p.name)}</option>`).join("");
  sel.disabled = pages.length < 2;
  const sizes = el("div", { class: "ad-tabs", role: "group", "aria-label": "Preview size" });
  for (const [sz, label] of [["desktop", "Desktop"], ["tablet", "Tablet"], ["phone", "Phone"]]) { const b = el("button", { type: "button", "data-pv-size": sz, "aria-pressed": String(sz === "desktop"), text: label }); b.addEventListener("click", () => setPvSize(sz)); sizes.append(b); }
  const tab = el("button", { type: "button", class: "btn", id: "pvTab", text: "Open in a new tab" });
  tab.addEventListener("click", () => previewSite());
  const close = el("button", { type: "button", class: "btn primary", id: "pvClose", text: "Close preview" });
  close.addEventListener("click", closePreview);
  bar.append(el("b", { class: "ws-pv-title", text: "Preview" }), sel, sizes, tab, close);
  const stage = el("div", { class: "ws-pv-stage", "data-size": "desktop" });
  const fr = el("iframe", { id: "pvFrame", title: "Website preview" });
  stage.append(fr);
  dlg.append(bar, stage);
  document.body.append(dlg);
  dlg.addEventListener("close", () => { dlg.remove(); if (pv?.dlg === dlg) pv = null; });
  dlg.showModal();
  pv = { dlg, fr };
  sel.addEventListener("change", () => showPv(+sel.value));
  wirePreviewLinks(fr, (j, hash) => { fr.dataset.hash = hash; showPv(j); });
  showPv(i);
  return dlg;
}
function showPv(i) {
  if (!pv) return;
  pv.page = i;
  $("#pvPage").value = String(i);
  pv.fr.srcdoc = renderSite(state.site, { mode: "export", preview: true, page: state.site.pages?.length ? i : null });
}
function setPvSize(sz) {
  if (!pv) return;
  pv.fr.parentElement.dataset.size = sz;
  for (const b of pv.dlg.querySelectorAll("[data-pv-size]")) b.setAttribute("aria-pressed", String(b.dataset.pvSize === sz));
  // Phone with "Resize on mobile" off: the desktop layout (1200 px) shrunk to phone width, as a phone shows it.
  if (sz === "phone" && !settings().mobileResize) {
    const H = Math.max(300, pv.fr.parentElement.clientHeight - 32), k = 390 / 1200, full = Math.round(H / k);
    pv.fr.style.cssText = `width:1200px;max-width:none;height:${full}px;flex:none;transform:scale(${k});transform-origin:top center;margin:0 -405px ${H - full}px`;
  } else pv.fr.style.cssText = "";
}
function closePreview() { if (pv?.dlg?.open) pv.dlg.close(); pv = null; }

/* Publish dialog: site details, favicon, social image, address, search visibility, password, analytics, cookies. */
function letterFavicon() {
  const t = state.site.theme, c = /^#[0-9a-f]{6}$/i.test(t.primary) ? t.primary : "#5b4cf0";
  const ch = (String(state.site.name || "W").trim()[0] || "W").toUpperCase().replace(/[<&>"]/g, "W");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${c}"/><text x="32" y="45" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700" fill="#ffffff">${ch}</text></svg>`);
}
/** QR code of the website address (SVG text), or "" without an address. Made in the browser (../code/qr.js). */
function websiteQr() {
  const url = siteBase(settings());
  if (!url) { toast("Add your website address first (Publish → Website address)."); return ""; }
  return qrSvg(url, { ecl: "M", margin: 4, px: 640, title: `QR code for ${url}` });
}
async function websiteQrPng(size = 1024) {
  const svg = websiteQr();
  if (!svg) return null;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.drawImage(img, 0, 0, size, size);
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("no PNG"))), "image/png"));
}
async function publishZip() {
  const { zipSync } = await import("./lib/fflate.js");
  const bytes = await buildZipFile(state.site, { zipSync, publish: true });
  download(bytes, zipName(state.site), "application/zip");
  const n = pageList(state.site).length;
  toast(`Downloaded the website: ${n} page${n > 1 ? "s" : ""}, images${settings().domain ? ", sitemap.xml" : ""} and robots.txt. Upload the files to your host.`);
  return bytes;
}
function openPublish() {
  $("#publishDlg")?.remove();
  const S = settings();
  const dlg = el("dialog", { id: "publishDlg", class: "ws-publish", "aria-labelledby": "pubHead" });
  dlg.innerHTML = `<div class="dlg ws-pub">
<div class="dlg-head"><h2 id="pubHead">Publish your website</h2><button class="btn sq" type="button" data-close aria-label="Close">✕</button></div>
<p class="hint">AsaanDesk does not host websites yet. Publishing here means one download: a ZIP with every page, the pictures, robots.txt and (with an address) sitemap.xml, ready to upload to any static web host.</p>
<div class="ws-pub-grid">
<section aria-labelledby="pubSec1"><h3 id="pubSec1">Site details</h3>
<label class="fld"><span>Website title (browser tab and search results)</span><input class="ad-input" id="pubTitle" type="text" maxlength="120"></label>
<label class="fld"><span>Description (search results and link previews)</span><textarea class="ad-input" id="pubDesc" rows="3" maxlength="300"></textarea></label>
<div class="fld"><span>Favicon (the small icon in the browser tab; square, 280 x 280 px is best)</span><div class="img-fld"><img id="pubFavImg" alt="Favicon preview" width="40" height="40"><button type="button" class="btn" id="pubFavUpload">Upload</button><button type="button" class="btn" id="pubFavLetter">Use a letter</button><button type="button" class="btn" id="pubFavClear">Default</button></div></div>
<h3>Social media link preview</h3>
<div class="fld"><span>Image (shown when the link is shared)</span><div class="img-fld"><img id="pubOgImg" alt="Social image preview" width="80" height="42"><span class="noimg" id="pubOgNone">None</span><button type="button" class="btn" id="pubOgUpload">Upload</button><button type="button" class="btn" id="pubOgHero">Use the hero picture</button><button type="button" class="btn" id="pubOgClear">Remove</button></div></div>
<label class="fld"><span>Title (empty = the page title)</span><input class="ad-input" id="pubOgTitle" type="text" maxlength="120"></label>
<label class="fld"><span>Text (empty = the description)</span><textarea class="ad-input" id="pubOgDesc" rows="2" maxlength="300"></textarea></label>
<div class="ws-og" id="pubOgCard" aria-label="How a shared link looks"><span class="ws-og-img" id="pubOgCardImg"></span><span class="ws-og-txt"><small id="pubOgCardHost"></small><b id="pubOgCardTitle"></b><span id="pubOgCardDesc"></span></span></div>
</section>
<section aria-labelledby="pubSec2"><h3 id="pubSec2">Address and search</h3>
<label class="fld"><span>Website address (your own domain, optional)</span><input class="ad-input" id="pubDomain" type="text" placeholder="www.example.com" autocomplete="off"></label>
<label class="fld"><span>Subpath (optional folder after the domain)</span><input class="ad-input" id="pubSubpath" type="text" placeholder="shop" autocomplete="off" spellcheck="false"></label>
<p class="hint" id="pubDomainHint">Used for sitemap.xml and link previews. Point the domain at the host where you upload the files.</p>
<label class="check"><input type="checkbox" id="pubIndex"> Show this site in search engines</label>
<label class="check"><input type="checkbox" id="pubNav"> Show the pages in the site menu</label>
<label class="check"><input type="checkbox" id="pubMobile"> Resize on mobile (stack the layout for phones)</label>
<div class="fld"><span>QR code of the website</span><div class="ws-qr"><span class="ws-qr-img" id="pubQr"></span><span class="ws-qr-acts"><small class="hint" id="pubQrHint"></small><button type="button" class="btn" id="pubQrSvg">Download SVG</button><button type="button" class="btn" id="pubQrPng">Download PNG</button></span></div></div>
<h3>Visitors</h3>
<div class="fld"><span>Password (optional)</span><div class="row"><input class="ad-input" id="pubPass" type="password" autocomplete="new-password" placeholder="New password"><button type="button" class="btn" id="pubPassSet">Set</button><button type="button" class="btn" id="pubPassClear">Remove</button></div><small class="hint" id="pubPassState"></small></div>
<label class="fld"><span>Google Analytics ID (optional)</span><input class="ad-input" id="pubGa" type="text" placeholder="G-XXXXXXXXXX" autocomplete="off"></label><small class="hint" id="pubGaHint"></small>
<label class="check"><input type="checkbox" id="pubCookie"> Show a cookie banner (analytics starts only after Accept)</label>
<label class="fld"><span>Cookie banner text</span><input class="ad-input" id="pubCookieText" type="text" maxlength="300" placeholder="We use cookies to see how visitors use this site. You can say no."></label>
<div class="row ws-cookie-opts"><label class="fld"><span>Banner position</span><select class="ad-input" id="pubCookiePos"><option value="bottom">Bottom</option><option value="top">Top</option></select></label><label class="fld"><span>Banner colour</span><select class="ad-input" id="pubCookieTone"><option value="dark">Black</option><option value="light">White</option></select></label></div>
<label class="check"><input type="checkbox" id="pubCookieBtn"> "Cookie settings" button so visitors can change their choice later</label>
<p class="hint">A visitor's choice is kept on their device for 12 months. You are responsible for the privacy and cookie rules where your visitors live.</p>
</section>
</div>
<section class="ws-pub-pages" aria-labelledby="pubSec3"><h3 id="pubSec3">Pages</h3><ol class="ws-pub-plist" id="pubPages"></ol><button type="button" class="btn" id="pubPagesEdit">Page titles, addresses and descriptions…</button></section>
<section class="ws-pub-check" aria-labelledby="pubSec4"><h3 id="pubSec4">Check before publishing</h3><ul class="ws-checks" id="pubChecks" aria-live="polite"></ul><button type="button" class="btn" id="pubCheckAgain">Check again</button></section>
<div class="row end ws-pub-actions"><button type="button" class="btn" id="pubPreview">Preview</button><button type="button" class="btn primary" id="pubZip">Download website (ZIP)</button></div>
<p class="hint">To go live, upload the ZIP's files to a static host (for example Netlify Drop, Cloudflare Pages, GitHub Pages or your own hosting). To unpublish, delete the files there.</p>
</div>`;
  document.body.append(dlg);
  const q = (s) => dlg.querySelector(s);
  const sync = () => {
    const X = settings();
    q("#pubFavImg").src = X.favicon || letterFavicon();
    q("#pubOgImg").hidden = !X.ogImage; q("#pubOgNone").hidden = !!X.ogImage; if (X.ogImage) q("#pubOgImg").src = X.ogImage;
    q("#pubPassState").textContent = X.passHash ? "Password is on: visitors type it to open the pages. It is a simple lock; the files are not encrypted." : "No password: anyone with the address can open the site.";
    q("#pubGaHint").textContent = X.gaId ? `Analytics is on (${X.gaId}).` : "Analytics is off.";
    q("#pubCookie").checked = X.cookie;
    // Link preview card: what a chat app or social site shows for the link.
    const P = pageList(state.site)[0];
    q("#pubOgCardImg").style.backgroundImage = X.ogImage ? `url("${X.ogImage}")` : "";
    q("#pubOgCardImg").hidden = !X.ogImage;
    q("#pubOgCardHost").textContent = X.domain ? siteBase(X).replace(/^https:\/\//, "").replace(/\/$/, "") : "your-website-address";
    q("#pubOgCardTitle").textContent = X.ogTitle.trim() || P.title || state.site.name || "My website";
    q("#pubOgCardDesc").textContent = (X.ogDesc.trim() || P.description || state.site.description || "").slice(0, 160);
    // QR code of the address
    const url = siteBase(X);
    q("#pubQr").innerHTML = url ? qrSvg(url, { ecl: "M", margin: 2, title: `QR code for ${url}` }) : "";
    q("#pubQrHint").textContent = url ? `Opens ${url}` : "Add your website address above to make its QR code.";
    q("#pubQrSvg").disabled = q("#pubQrPng").disabled = !url;
    // Pages + checks
    q("#pubPages").innerHTML = pageList(state.site).map((p, i) => `<li><b>${esc(p.name)}</b><small>${esc(url ? url + (i ? pageFile(state.site, i) : "") : pageFile(state.site, i))}${p.hide ? " · hidden from the menu" : ""}</small><small>${esc(p.title || (i ? `${p.name} | ${state.site.name}` : state.site.name))}</small></li>`).join("");
    renderChecks();
  };
  const renderChecks = () => {
    const list = publishChecks(state.site);
    const icon = { error: "Fix", warn: "Check", info: "Note", ok: "Ready" };
    q("#pubChecks").innerHTML = list.map((c) => `<li class="ws-ck ${c.level}" data-level="${c.level}"><b>${icon[c.level]}</b><span>${esc(c.text)}</span>${c.page != null && pageList(state.site).length > 1 ? `<button type="button" class="btn small" data-go-page="${c.page}">Open page</button>` : ""}</li>`).join("");
    return list;
  };
  q("#pubTitle").value = state.site.name; q("#pubDesc").value = state.site.description || "";
  q("#pubDomain").value = S.domain; q("#pubSubpath").value = S.subpath; q("#pubIndex").checked = S.indexable; q("#pubNav").checked = S.navPages; q("#pubMobile").checked = S.mobileResize;
  q("#pubOgTitle").value = S.ogTitle; q("#pubOgDesc").value = S.ogDesc;
  q("#pubGa").value = S.gaId; q("#pubCookie").checked = S.cookie; q("#pubCookieText").value = S.cookieText;
  q("#pubCookiePos").value = S.cookiePos; q("#pubCookieTone").value = S.cookieTheme; q("#pubCookieBtn").checked = S.cookieButton;
  sync();
  q("#pubOgTitle").addEventListener("input", (e) => { setSettings({ ogTitle: e.target.value }, { key: "ogTitle", preview: false }); sync(); });
  q("#pubOgDesc").addEventListener("input", (e) => { setSettings({ ogDesc: e.target.value }, { key: "ogDesc", preview: false }); sync(); });
  q("#pubSubpath").addEventListener("change", (e) => { const v = cleanSubpath(e.target.value); e.target.value = v; setSettings({ subpath: v }); if (v && !settings().domain) toast("Add the website address too: the subpath goes after it."); sync(); });
  q("#pubMobile").addEventListener("change", (e) => { setSettings({ mobileResize: e.target.checked }); toast(e.target.checked ? "Resize on mobile is on: phones get the stacked layout." : "Resize on mobile is off: phones show the desktop layout, zoomed out."); });
  q("#pubCookiePos").addEventListener("change", (e) => setSettings({ cookiePos: e.target.value }));
  q("#pubCookieTone").addEventListener("change", (e) => setSettings({ cookieTheme: e.target.value }));
  q("#pubCookieBtn").addEventListener("change", (e) => setSettings({ cookieButton: e.target.checked }));
  q("#pubQrSvg").addEventListener("click", () => { const svg = websiteQr(); if (svg) { download(svg, `${slugify(state.site.name)}-qr.svg`, "image/svg+xml"); toast("QR code downloaded (SVG)."); } });
  q("#pubQrPng").addEventListener("click", async () => { try { const png = await websiteQrPng(); if (png) { download(png, `${slugify(state.site.name)}-qr.png`, "image/png"); toast("QR code downloaded (PNG)."); } } catch (err) { toast("Could not make the PNG: " + err.message); } });
  q("#pubPagesEdit").addEventListener("click", () => { dlg.close(); if (shell) shell.openPanel("pages"); else toast("Open the Pages panel to change page titles and addresses."); });
  q("#pubCheckAgain").addEventListener("click", () => { const l = renderChecks(); const n = l.filter((c) => c.level === "error" || c.level === "warn").length; toast(n ? `${n} thing${n > 1 ? "s" : ""} to check before publishing.` : "Everything looks ready to publish."); });
  q("#pubChecks").addEventListener("click", (e) => { const b = e.target.closest("[data-go-page]"); if (!b) return; dlg.close(); goPage(+b.dataset.goPage); if (shell) shell.openPanel("pages"); });
  q("#pubTitle").addEventListener("input", (e) => { const v = e.target.value; change((s) => { s.name = v; }, { key: "name", panels: false, delay: 300 }); $("#siteName").value = v; try { shell?.setTitle(v); } catch {} });
  q("#pubDesc").addEventListener("input", (e) => { change((s) => { s.description = e.target.value; }, { key: "desc", preview: false, panels: false }); sync(); });
  q("#pubFavUpload").addEventListener("click", () => pickImage((url) => { setSettings({ favicon: url }); sync(); toast("Favicon updated"); }, 256));
  q("#pubFavLetter").addEventListener("click", () => { setSettings({ favicon: letterFavicon() }); sync(); toast("Favicon: the first letter of your site"); });
  q("#pubFavClear").addEventListener("click", () => { setSettings({ favicon: "" }); sync(); });
  q("#pubOgUpload").addEventListener("click", () => pickImage((url) => { setSettings({ ogImage: url }); sync(); toast("Social preview image set"); }, 1200));
  q("#pubOgHero").addEventListener("click", () => {
    const img = pageList(state.site)[0].blocks.find((b) => b.type === "hero" && b.data.image)?.data.image || state.site.blocks.find((b) => b.data?.image)?.data.image;
    if (!img) { toast("Add a picture to the hero first, or upload one."); return; }
    setSettings({ ogImage: img }); sync(); toast("Social preview image: the hero picture");
  });
  q("#pubOgClear").addEventListener("click", () => { setSettings({ ogImage: "" }); sync(); });
  q("#pubDomain").addEventListener("change", (e) => {
    const raw = e.target.value.trim(), d = cleanDomain(raw);
    if (raw && !d) { q("#pubDomainHint").textContent = "That does not look like a web address. Example: www.example.com"; return; }
    e.target.value = d; setSettings({ domain: d });
    q("#pubDomainHint").textContent = d ? `Pages will use ${siteBase(settings())} in sitemap.xml and link previews.` : "Used for sitemap.xml and link previews.";
    sync();
  });
  q("#pubIndex").addEventListener("change", (e) => setSettings({ indexable: e.target.checked }));
  q("#pubNav").addEventListener("change", (e) => { setSettings({ navPages: e.target.checked }); refreshPagesPanel(); });
  q("#pubPassSet").addEventListener("click", () => { const v = q("#pubPass").value; if (v.length < 4) { toast("Use at least 4 characters."); return; } setSettings({ passHash: sha256Hex(v) }); q("#pubPass").value = ""; sync(); toast("Password set for the downloaded site"); });
  q("#pubPassClear").addEventListener("click", () => { setSettings({ passHash: "" }); sync(); });
  q("#pubGa").addEventListener("change", (e) => {
    const v = e.target.value.trim().toUpperCase();
    if (v && !validGaId(v)) { q("#pubGaHint").textContent = "Please enter a valid measurement ID that starts with G- (for example G-AB12CD34EF)."; return; }
    e.target.value = v;
    // Like Canva: adding a measurement ID turns the cookie banner on (visitors agree before analytics starts).
    const turnOn = v && !settings().cookie;
    setSettings(turnOn ? { gaId: v, cookie: true } : { gaId: v }); sync();
    if (turnOn) toast("Analytics added. The cookie banner is on, so analytics starts only after a visitor accepts.");
  });
  q("#pubCookie").addEventListener("change", (e) => setSettings({ cookie: e.target.checked }));
  q("#pubCookieText").addEventListener("input", (e) => setSettings({ cookieText: e.target.value }, { key: "cookieText", preview: false }));
  q("#pubPreview").addEventListener("click", () => { dlg.close(); openPreview(); });
  q("#pubZip").addEventListener("click", async (e) => { const b = e.currentTarget; b.disabled = true; try { await publishZip(); } catch (err) { toast("Could not make the ZIP: " + err.message); } finally { b.disabled = false; } });
  q("[data-close]").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
  return dlg;
}

/* ------------------------------------------------------------------ editor frame (shared shell) */
// Layout choices per block: [path, options]; "style.variant" is a section design (cards / list / numbered …).
const LAYOUTS = {
  hero: ["data.layout", [["split", "Text and picture"], ["left", "Picture and text"], ["cover", "Picture behind"], ["card", "Text card on picture"], ["banner", "Wide picture below"], ["minimal", "Big text"], ["center", "Centred text"]]],
  about: ["data.side", [["left", "Picture left"], ["right", "Picture right"]]],
  features: ["style.variant", [["", "Cards"], ["list", "List"], ["numbers", "Numbered"]]],
  gallery: ["style.variant", [["", "Grid"], ["mosaic", "Mosaic"]]],
  testimonials: ["style.variant", [["", "Cards"], ["single", "Big quotes"]]],
};
const layGet = (b, L2) => (L2[0] === "style.variant" ? b.style?.variant || "" : b.data[L2[0].slice(5)]) ?? "";
const laySet = (b, L2, v) => { if (L2[0] === "style.variant") b.style.variant = v; else b.data[L2[0].slice(5)] = v; };
const STICKERS = [
  ["Star", '<path d="M60 8l15 31 34 5-25 24 6 34-30-16-30 16 6-34-25-24 34-5z" fill="#f59e0b"/>'],
  ["Heart", '<path d="M60 104S12 74 12 42a24 24 0 0148-8 24 24 0 0148 8c0 32-48 62-48 62z" fill="#e11d48"/>'],
  ["Circle", '<circle cx="60" cy="60" r="48" fill="#5b4cf0"/>'],
  ["Blob", '<path d="M88 22c18 14 22 42 10 62s-42 28-62 16S6 60 18 38 70 8 88 22z" fill="#14b8a6"/>'],
  ["New badge", '<path d="M60 6l12 14 18-4 4 18 16 10-10 16 4 18-18 4-6 18-18-8-18 8-6-18-18-4 4-18-10-16 16-10 4-18 18 4z" fill="#ff7a59"/><text x="60" y="68" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="#fff">NEW</text>'],
  ["Arrow", '<path d="M14 52h62V30l32 30-32 30V68H14z" fill="#2563eb"/>'],
  ["Sparkle", '<path d="M60 10c4 30 20 46 50 50-30 4-46 20-50 50-4-30-20-46-50-50 30-4 46-20 50-50z" fill="#8b5cf6"/>'],
  ["Speech bubble", '<path d="M14 18h92v62H50l-24 22V80H14z" fill="#22c55e"/>'],
];
const stickerUrl = (body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480">${body}</svg>`);
const IMG_FIELD = { hero: "image", about: "image", map: "image", header: "logo" };
const selBlock = () => blockById(state.selected);

function previewSite() {
  const url = URL.createObjectURL(new Blob([renderExport(absolutePhotos(state.site, location.origin))], { type: "text/html;charset=utf-8" }));
  const win = window.open(url, "_blank");
  try { if (win) win.opener = null; } catch {}
  if (!win) toast("Your browser blocked the new tab. Use Download index.html instead.");
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return url;
}
async function newSite() {
  await flush();
  state.site = blankSite(); state.projectId = null; state.selected = null;
  hist.past = []; hist.future = []; openItems.clear();
  renderAll(); await save(); toast("New blank site started");
}
function openSide(tab) { if (!shell) { openSheet(tab); return; } shell.openPanel("layers"); setTab(tab); }
let menuEl = null;
function closeMenu() { menuEl?.remove(); menuEl = null; document.removeEventListener("pointerdown", menuOutside, true); }
function menuOutside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function smallMenu(anchor, items) {
  if (menuEl) { const same = menuEl._anchor === anchor; closeMenu(); if (same) return; }
  menuEl = el("div", { class: "ws-menu", role: "menu" });
  menuEl._anchor = anchor;
  for (const [label, act, on] of items) {
    const b = el("button", { type: "button", role: "menuitemradio", "aria-checked": String(!!on), class: on ? "on" : "", text: label });
    b.addEventListener("click", () => { closeMenu(); act(); });
    menuEl.append(b);
  }
  document.body.append(menuEl);
  const r = anchor.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(r.left, innerWidth - menuEl.offsetWidth - 8)) + "px";
  menuEl.style.top = Math.min(r.bottom + 6, innerHeight - menuEl.offsetHeight - 8) + "px";
  menuEl.querySelector("button")?.focus();
  setTimeout(() => document.addEventListener("pointerdown", menuOutside, true));
}
const SIZE_ITEMS = () => [["Desktop (full width)", () => setSize("desktop"), state.size === "desktop"], ["Tablet (768 px)", () => setSize("tablet"), state.size === "tablet"], ["Phone (390 px)", () => setSize("phone"), state.size === "phone"]];

/** The floating toolbar pill: add block, the selected block's actions, undo/redo and preview sizes. */
function buildBar() {
  const bar = el("div", { class: "ws-bar", id: "blockBar" });
  const sep = () => el("span", { class: "ws-sep", "aria-hidden": "true" });
  const mini = (act, label) => { const b = el("button", { type: "button", class: "tool ws-b", "data-bact": act, "aria-label": `${label} the selected block`, title: label }, svgI(ICON[act])); b.addEventListener("click", () => { if (state.selected) blockAction(act, state.selected); }); return b; };
  const name = el("span", { class: "ws-name", id: "barName", text: "Select a block" });
  const bg = el("select", { class: "ws-sel", id: "barBg", "aria-label": "Block background colour", title: "Background colour" });
  bg.innerHTML = BG_CHOICES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("") + `<option value="custom">Custom colour</option>`;
  const bgc = el("input", { type: "color", class: "ws-color", id: "barBgColor", "aria-label": "Custom background colour", title: "Pick a background colour", value: "#f4f1ff" });
  bg.addEventListener("change", () => { const b = selBlock(); if (!b) return; change(() => { b.style.bg = bg.value === "custom" ? bgc.value : bg.value; }); });
  bgc.addEventListener("input", () => { const b = selBlock(); if (!b) return; bg.value = "custom"; change(() => { b.style.bg = bgc.value; }, { key: `${b.id}:bg`, delay: 60 }); });
  const lay = el("select", { class: "ws-sel", id: "barLayout", "aria-label": "Block layout", title: "Layout" });
  lay.addEventListener("change", () => { const b = selBlock(), L2 = b && LAYOUTS[b.type]; if (!L2) return; change(() => laySet(b, L2, lay.value)); });
  const font = el("select", { class: "ws-sel", id: "barFont", "aria-label": "Heading text style", title: "Text style (headings)" });
  font.innerHTML = Object.entries(FONT_FAMILIES).map(([k, f]) => `<option value="${esc(k)}">${esc(f.label.replace(/ \(.*\)$/, ""))}</option>`).join("");
  font.addEventListener("change", () => change((s) => { s.theme.headingFont = font.value; }));
  const animB = el("button", { type: "button", class: "tool ws-b", id: "barAnimate", title: "Animate: how the block appears when visitors scroll to it" }, svgI("M4 12h3M17 12h3M12 4v3M12 17v3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2") + "<span>Animate</span>");
  animB.addEventListener("click", () => {
    const b = selBlock();
    if (!b || b.type === "header") { toast("Select a block (not the menu bar) to animate it."); return; }
    smallMenu(animB, [...ANIMS.map(([v, l]) => [l, () => { setAnim(b.id, v); toast(v ? `${l}: plays in Preview and on the published site.` : "Animation removed."); }, (b.style.anim || "") === v]),
      [`Use ${animName(b.style.anim)} on every block`, () => animateAll(b.style.anim || ""), false]]);
  });
  const edit = el("button", { type: "button", class: "tool ws-b", id: "barEdit", title: "Edit pictures, links and list items" }, svgI("M4 20h4L19 9l-4-4L4 16zM14 6l4 4") + "<span>Edit</span>");
  edit.addEventListener("click", () => openSide(state.selected ? "edit" : "blocks"));
  const theme = el("button", { type: "button", class: "tool ws-b", id: "barTheme", title: "Site colours, fonts and corners" }, svgI("M12 3a9 9 0 100 18c1.2 0 1.5-1 1-2s-.2-2.5 1.5-2.5H17a4 4 0 004-4C21 7 17 3 12 3z") + "<span>Theme</span>");
  theme.addEventListener("click", () => openSide("theme"));
  const prev = el("button", { type: "button", class: "tool ws-b", id: "barPreview", title: "Preview the whole site (all pages, desktop / tablet / phone)" }, svgI("M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z") + "<span>Preview</span>");
  prev.addEventListener("click", () => openPreview());
  const pub = el("button", { type: "button", class: "tool ws-b ws-pub-btn", id: "barPublish", title: "Publish: site settings and a ready-to-upload ZIP" }, svgI("M12 16V4M7 9l5-5 5 5M5 20h14") + "<span>Publish</span>");
  pub.addEventListener("click", () => openPublish());
  bar.append($("#addBlockBtn"), sep(), name, mini("up", "Move up"), mini("down", "Move down"), mini("dup", "Duplicate"), mini("del", "Delete"), bg, bgc, lay, font, animB, edit, theme, sep(), $("#undoBtn"), $("#redoBtn"), sep(), $(".topbar .sizes"), sep(), prev, pub);
  return bar;
}
function updateBar() {
  const bar = $("#blockBar");
  if (!bar || !state.site) return;
  const b = selBlock(), i = b ? state.site.blocks.indexOf(b) : -1;
  bar.classList.toggle("has-sel", !!b);
  $("#barName").textContent = b ? `${labelOf(b)} (${i + 1}/${state.site.blocks.length})` : "Select a block";
  for (const x of $$("[data-bact]", bar)) x.disabled = !b || (x.dataset.bact === "up" && i === 0) || (x.dataset.bact === "down" && i === state.site.blocks.length - 1);
  const bg = $("#barBg"), bgc = $("#barBgColor"), lay = $("#barLayout");
  bg.disabled = bgc.disabled = !b;
  const ab = $("#barAnimate");
  if (ab) { ab.disabled = !b || b.type === "header"; ab.classList.toggle("on", !!b?.style?.anim); }
  const custom = /^#/.test(b?.style.bg || "");
  bg.value = custom ? "custom" : b?.style.bg || "";
  if (custom) bgc.value = b.style.bg;
  const L2 = b && LAYOUTS[b.type];
  lay.hidden = !L2;
  if (L2) { lay.innerHTML = L2[1].map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join(""); lay.value = layGet(b, L2) || L2[1][0][0]; }
  $("#barFont").value = state.site.theme.headingFont;
}
function blockThumb(i) {
  const b = state.site.blocks[i];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" rx="8" fill="#f4f3ff"/><rect x="12" y="14" width="${b?.type === "hero" ? 110 : 80}" height="10" rx="5" fill="#5b4cf0"/><rect x="12" y="34" width="130" height="6" rx="3" fill="#c9c6f5"/><rect x="12" y="46" width="100" height="6" rx="3" fill="#c9c6f5"/><text x="12" y="84" font-family="Arial" font-size="13" font-weight="700" fill="#1b2133">${esc(b ? labelOf(b) : "")}</text></svg>`;
}
function insertImage(src, name = "Picture") {
  const b = selBlock();
  if (b && IMG_FIELD[b.type]) { change(() => { b.data[IMG_FIELD[b.type]] = src; }); toast(`Picture placed in the ${labelOf(b)} block`); return; }
  if (b?.type === "gallery") { change(() => b.data.images.push({ src, caption: "" })); toast("Picture added to the gallery"); return; }
  if (b?.type === "products") { change(() => b.data.items.push({ image: src, name: String(name || "New product").replace(/\.[a-z0-9]+$/i, "").slice(0, 40), price: "Rs 1,000", text: "" })); toast("Product added with this picture"); return; }
  if (!canAddBlock(state.site)) { toast(fullMsg()); return; }
  const nb = newBlock("about", { title: "", text: "Click to write about this picture.", image: src, button: { label: "", href: "" }, side: "left" });
  change((s) => insertBlock(s, nb, insertIndex(s, state.selected)));
  select(nb.id, { scroll: true });
  toast("Picture added in a new block");
}
function insertText(str, style) {
  const heading = style === "heading" || style === "h1" || style === "subheading" || style === "h2";
  if (!canAddBlock(state.site)) { toast(fullMsg()); return; }
  const nb = newBlock("about", heading ? { title: String(str || "Add a heading"), text: style === "subheading" || style === "h2" ? "" : "Click to add your text.", image: "", button: { label: "", href: "" } } : { title: "", text: String(str || "Add a little bit of body text"), image: "", button: { label: "", href: "" } });
  change((s) => insertBlock(s, nb, insertIndex(s, state.selected)));
  select(nb.id, { scroll: true });
  toast("Text block added. Click it in the preview to type.");
}
function renderElements(box) {
  box.append(el("p", { class: "ws-hint", text: "Click a block to add it under the selected one. Stickers go into the selected block's picture." }));
  box.append(el("h3", { class: "ws-h3", text: "Blocks" }));
  const grid = el("div", { class: "ws-elgrid" });
  for (const type of BLOCK_ORDER) {
    const c = el("button", { type: "button", class: "ws-el", "data-type": type, title: BLOCK_TYPES[type].desc }, `<b>${esc(BLOCK_TYPES[type].label)}</b><small>${esc(BLOCK_TYPES[type].desc)}</small>`);
    c.addEventListener("click", () => addBlock(type));
    grid.append(c);
  }
  box.append(grid, el("h3", { class: "ws-h3", text: "Shapes and stickers" }));
  const sg = el("div", { class: "ws-stickers" });
  for (const [name, body] of STICKERS) {
    const c = el("button", { type: "button", class: "ws-sticker", "data-sticker": name, "aria-label": `Add sticker: ${name}`, title: name }, `<svg viewBox="0 0 120 120" aria-hidden="true">${body}</svg>`);
    c.addEventListener("click", () => insertImage(stickerUrl(body), name));
    sg.append(c);
  }
  box.append(sg);
}
function renderTextPanel(box) {
  for (const [label, style, cls] of [["Add a heading", "heading", "big"], ["Add a subheading", "subheading", "mid"], ["Add a little bit of body text", "body", "small"]]) {
    const b = el("button", { type: "button", class: `ws-textbtn ${cls}`, "data-text": style, text: label });
    b.addEventListener("click", () => insertText(label, style));
    box.append(b);
  }
  box.append(el("h3", { class: "ws-h3", text: "Font combinations" }), el("p", { class: "ws-hint", text: "Sets the fonts for the whole site." }));
  const keys = Object.keys(FONT_FAMILIES);
  const pairs = keys.flatMap((hk) => keys.filter((bk) => bk !== hk && bk !== "mono").slice(0, 2).map((bk) => [hk, bk])).slice(0, 8);
  for (const [hk, bk] of pairs) {
    const b = el("button", { type: "button", class: "ws-pair", "data-pair": `${hk}+${bk}` }, `<b style="font-family:${esc(FONT_FAMILIES[hk].css)}">${esc(FONT_FAMILIES[hk].label.replace(/ \(.*\)$/, ""))} heading</b><small style="font-family:${esc(FONT_FAMILIES[bk].css)}">${esc(FONT_FAMILIES[bk].label.replace(/ \(.*\)$/, ""))} body text</small>`);
    b.addEventListener("click", () => { change((s) => { s.theme.headingFont = hk; s.theme.bodyFont = bk; }); toast("Fonts applied to the site"); });
    box.append(b);
  }
}
function textOf() { const b = selBlock() || state.site.blocks.find((x) => x.type === "hero"); return b ? [b.data.title, b.data.text].filter((x) => typeof x === "string" && x).join("\n") : ""; }
function setTextOf(str) {
  const b = selBlock() || state.site.blocks.find((x) => x.type === "hero");
  if (!b) return;
  const lines = String(str || "").split("\n"), keys = ["title", "text"].filter((k) => typeof b.data[k] === "string" && b.data[k]);
  change(() => { if (keys.length === 2 && lines.length >= 2) { b.data.title = lines[0]; b.data.text = lines.slice(1).join("\n"); } else if (keys[0]) b.data[keys[0]] = String(str); });
}
async function mountFrame() {
  let mod = null;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("Editor frame unavailable", e); return null; }
  try {
    const bar = buildBar();
    shell = mod.mountShell({
      app: "website", kind: "Website", title: state.site?.name || "My website", home: "/tools/websites", projectId: state.projectId,
      onTitle: (t) => { const v = String(t || "").trim().slice(0, 120) || "My website"; change((s) => { s.name = v; }, { panels: false }); $("#siteName").value = v; },
      stage: $("#stage"), toolbar: bar, formulaBar: null,
      resize: { label: "Resize", open: (a) => smallMenu(a, SIZE_ITEMS()) },
      file: [
        { label: "Create a new site", act: newSite, hint: "Blank page" },
        { label: "Start from a template", act: () => shell.openPanel("templates") },
        { label: "My sites…", act: () => $('[data-open="projects"]').click() },
        { label: "Open a saved file (.json)…", act: () => $("#importInput").click() },
        { label: "Save as file (.json)", act: () => $("#saveJsonBtn").click() },
        { label: "Add a block…", act: () => $("#addBlockBtn").click() },
        { label: "Add a page", act: () => addPageUI(), hint: "With the site menu and footer" },
        { label: "Site details and theme", act: () => openSide("theme") },
        { label: "Publish website…", act: () => openPublish(), hint: "Title, favicon, address, search, password" },
        { label: "Download index.html", group: "Download", act: () => $("#exportHtml").click(), hint: "One file, works offline" },
        { label: "Download ZIP", group: "Download", act: () => $("#exportZip").click(), hint: "Every page and an images folder" },
        { label: "Download website to publish (ZIP)", group: "Download", act: () => publishZip(), hint: "Pages, images, robots.txt, sitemap.xml" },
        { label: "Preview", group: "View", act: () => openPreview(), hint: "All pages, desktop / tablet / phone" },
        { label: "Preview site in a new tab", group: "View", act: previewSite },
        { label: "Mobile preview panel", group: "View", act: () => shell.openPanel("mobile") },
        ...["desktop", "tablet", "phone"].map((sz) => ({ label: `${sz[0].toUpperCase() + sz.slice(1)} preview`, group: "View", act: () => setSize(sz) })),
        { label: "Undo", group: "Edit", act: undo },
        { label: "Redo", group: "Edit", act: redo },
      ],
      share: { download: [
        { label: "Website (index.html)", act: () => $("#exportHtml").click() },
        { label: "ZIP (index.html + images)", act: () => $("#exportZip").click() },
        { label: "Publish website…", act: () => openPublish(), hint: "Settings and a ready-to-upload ZIP" },
        { label: "Preview", act: () => openPreview(), icon: "eye" },
        { label: "Preview site in a new tab", act: previewSite, icon: "eye" },
      ], link: () => location.origin + "/tools/websites" },
      templates: { gallery, tool: "websites", apply: async (id) => { await applyTemplate(id); }, placeholder: "Search website templates" },
      panels: {
        elements: (box) => renderElements(box),
        text: (box) => renderTextPanel(box),
        layers: { label: "Blocks", icon: "outline", render: (box) => { box.append($("#side")); } },
        pages: { label: "Pages", icon: "pages", render: (box) => renderPagesPanel(box), refresh: true },
        mobile: { label: "Mobile preview", icon: "device", render: (box) => renderMobilePanel(box), refresh: true },
      },
      rail: ["templates", "elements", "text", "layers", "pages", "brand", "uploads", "mobile", "projects", "apps", "translate"],
      insert: {
        image: (src, name) => insertImage(src, name),
        text: (str, style) => insertText(str, style),
        color: (hex) => { const b = selBlock(); if (b) change(() => { b.style.bg = hex; }); else change((s) => { s.theme.primary = hex; }); },
        font: (key) => { if (!FONT_FAMILIES[key]) return; change((s) => { s.theme.headingFont = key; }); toast("Heading font applied"); },
      },
      getText: textOf, setText: setTextOf,
      projects: {
        save: async () => { await flush(); return { name: state.site.name, data: clone(state.site) }; },
        open: async (rec) => { await flush(); const r = rec?.data ? rec : await getProject(rec?.id); if (!r?.data) throw new Error("That site could not be opened."); loadRecord(r); toast(`Opened ${r.name || "the site"}`); },
      },
      bottom: {
        notes: true, outline: null, timer: true, fullscreen: true, help: true,
        zoom: { get: () => Math.round((state.k || 1) * 100), set: (pct) => { state.zoom = Math.max(10, Math.min(200, pct)) / 100; layoutFrame(); }, min: 10, max: 200 },
        // Pages = the site's pages (Canva websites): count, switch, add; sections stay in the Blocks panel.
        pages: { count: () => (state.site ? pageList(state.site).length : 1), current: () => state.site?.page || 0, go: (i) => goPage(i), add: () => addPageUI(), thumb: pageThumb },
      },
      shortcuts: [["Ctrl+Z", "Undo"], ["Ctrl+Y", "Redo"], ["Ctrl+S", "Save now"], ["Alt+↑ / Alt+↓", "Move a block in the Blocks list"]],
      setMode: (m) => { state.mode = m; document.body.dataset.mode = m; if (m !== "edit") { frameDoc?.activeElement?.blur?.(); toast(m === "view" ? "Viewing: the site can't be changed." : "Commenting: add comments, the site stays as it is."); } },
      initialPanel: isPhone() ? null : "templates",
    });
    shell.panel("layers"); // moves the Blocks / Edit / Theme panel into the frame now (it stays hidden until opened)
    $("#closeSheet").addEventListener("click", () => shell.closePanel());
    document.body.classList.add("has-shell");
    return shell;
  } catch (e) {
    console.warn("The editor frame could not start", e); shell = null;
    const tools = $(".topbar .tools"); // put the moved buttons back in the old top bar
    if (tools && !tools.contains($("#undoBtn"))) { tools.insertBefore($("#addBlockBtn"), tools.querySelector(".sizes") ? null : null); tools.append($("#undoBtn"), $("#redoBtn"), $("#blockBar .sizes") || ""); }
    return null;
  }
}

/* ------------------------------------------------------------------ start */
async function start() {
  setupEvents();
  await mountFrame();
  setSize(isPhone() ? "phone" : "desktop");
  const params = new URLSearchParams(location.search);
  const tplId = params.get("template"), fresh = params.get("new") === "1";
  let rec = null, embed = null;
  try {
    if (fresh || tplId) throw "skip"; // a new design: do not open the last site
    const h = params.get("handoff");
    if (h) {
      const p = await takeHandoff(h);
      if (p?.type === "website" && p.site) { state.site = normalizeSite(p.site); }
      else if (p?.type === "website-embed" && typeof p.html === "string" && p.html.trim()) embed = p; // from the Code generator
    }
    if (!state.site) {
      const want = params.get("project") || localStorage.getItem(LAST);
      if (want) rec = await getProject(want);
      if (!rec) rec = (await listProjects(APP))[0] || null;
    }
  } catch (e) { if (e !== "skip") console.warn("Saved sites unavailable", e); }
  if (rec?.data) { state.site = normalizeSite(rec.data); state.projectId = rec.id; }
  if (tplId && (gallery.hasTemplate(tplId) || tplId === "blank")) state.site = gallery.hasTemplate(tplId) ? gallery.makeSite(tplId) : blankSite();
  else if (tplId) toast("That template was not found. Here is a blank site.");
  if (!state.site && (fresh || tplId)) state.site = blankSite();
  if (!state.site) state.site = makeTemplate("business");
  if (embed) {
    // "Add to a website" from the Code generator: the widget becomes an Embed block on the open page.
    const b = newBlock("embed", { title: String(embed.name || "").slice(0, 80), code: embed.html.slice(0, 400000), height: embedHeight(embed.height) });
    insertBlock(state.site, b, insertIndex(state.site, null));
    state.selected = b.id;
  }
  renderAll();
  if (embed) { await save(); select(state.selected, { scroll: true }); toast(`${embed.name || "Widget"} added to ${state.site.name} as an Embed block.`); }
  else if (rec?.data) setSaveState("Saved"); else await save();
  state.ready = true;
  window.adApp.ready = true;
  document.body.classList.add("ready");
}

window.adApp = {
  state, ready: false,
  get site() { return state.site; },
  exportHtml, exportZip, applyTemplate, load, flush, undo, redo, select, addBlock, setSize, blockAction, previewSite,
  get shell() { return shell; }, gallery: () => gallery.TEMPLATES, heroTitle: (id) => gallery.heroTitle(id),
  addPage: (name) => addPageUI(name), goPage, pageAction, openPreview, closePreview, openPublish, publishZip,
  settings: () => settings(), setSettings, pages: () => pageList(state.site).map((p, i) => ({ name: p.name, slug: p.slug, file: pageFile(state.site, i) })),
  renderEdit: () => renderSite(state.site, { mode: "edit" }),
  moveBlock: (from, to) => change((s) => moveBlock(s, from, to)),
  setTheme: (patch) => change((s) => Object.assign(s.theme, patch)),
  setText: (blockId, path, value) => { const b = blockById(blockId); if (b) change(() => setPath(b.data, path, value)); },
  fileToDataUrl,
  // Round 3 (Canva help-page parity): animations, page settings, final checks, QR code, section limit.
  setAnim, animateAll, checks: () => publishChecks(state.site), websiteQr, websiteQrPng, maxSections: MAX_SECTIONS,
  setPageMeta: (i, meta) => change((s) => setPageMeta(s, i, meta)), setPageSlug: (i, path) => change((s) => setPageSlug(s, i, path)),
  setBlockData: (blockId, patch) => { const b = blockById(blockId); if (b) change(() => Object.assign(b.data, patch)); return !!b; },
};
start().catch((e) => { console.error(e); toast("Something went wrong while starting: " + e.message); });
