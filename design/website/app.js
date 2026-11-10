// AsaanDesk Website builder: one-page sites from blocks. Edit text right in the preview, reorder blocks by drag,
// change the theme, and export one self-contained index.html or a .zip. Everything stays in this browser.
import { loadBrand, FONT_FAMILIES } from "../shared/brand.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff } from "../shared/store.js";
import {
  BLOCK_TYPES, BLOCK_ORDER, BG_CHOICES, CORNERS, MODES, renderSite, normalizeSite, newBlock, moveBlock, insertBlock,
  removeBlock, duplicateBlock, insertIndex, anchors, blockTitle, getPath, setPath, clone, esc, slugify, ICON_NAMES,
} from "./blocks.js";
import { ICONS, PALETTES } from "./art.js";
import { TEMPLATES, makeTemplate, templateArt, blankSite } from "./templates.js";
import { exportHtml as renderExport, buildZip, zipName } from "./exporter.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const APP = "website", LAST = "asaandesk-website-last";
const state = { site: null, projectId: null, selected: null, size: "desktop", tab: "blocks", ready: false, dirty: false };
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
  renderBlockList();
  if (panels) renderPanes();
  scheduleSave();
  return out;
}

/* ------------------------------------------------------------------ autosave */
let saveT = 0, savePromise = null;
function setSaveState(text) { const s = $("#saveState"); s.textContent = text; s.dataset.state = text === "Saved" ? "saved" : text === "Saving…" ? "saving" : "error"; }
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
  if (tab) setTab(tab);
  else if (changed && state.tab === "edit") renderEditPane();
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
  const k = W > 0 ? Math.min(1, (W - pad) / target) : 1;
  box.style.width = target + "px";
  box.style.height = Math.max(240, (H - top * (narrow ? 0 : 2)) / k) + "px";
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
  if (act === "dup") { const c = change((s) => duplicateBlock(s, id)); if (c) select(c.id, { scroll: true }); toast(`${labelOf(b)} duplicated`); return; }
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
function fillDatalist() { $("#anchorList").innerHTML = [["#top", "Top of the page"], ...anchorOptions()].map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(""); }
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
let imageCb = null;
function pickImage(cb) { imageCb = cb; const inp = $("#imageInput"); inp.value = ""; inp.click(); }
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
  $("#linkSection").innerHTML = `<option value="">Choose a section…</option>` + [["#top", "Top of the page"], ...anchorOptions()].map(([v, t]) => `<option value="${esc(v)}"${v === l.href ? " selected" : ""}>${esc(t)}</option>`).join("");
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
  state.site = id === "blank" ? blankSite() : makeTemplate(id);
  state.projectId = null; state.selected = null;
  hist.past = []; hist.future = []; hist.lastKey = "";
  openItems.clear();
  renderAll();
  await save();
  const t = TEMPLATES.find((x) => x.id === id);
  toast(`New site started from the ${t ? t.label : "blank"} template`);
  return state.site;
}
function renderAddGrid() {
  $("#addGrid").innerHTML = BLOCK_ORDER.map((type) => `<button type="button" class="add-card" data-type="${type}"><b>${esc(BLOCK_TYPES[type].label)}</b><small>${esc(BLOCK_TYPES[type].desc)}</small></button>`).join("");
}
function addBlock(type) {
  const b = newBlock(type, type === "header" ? { brand: state.site.name } : {});
  change((s) => insertBlock(s, b, insertIndex(s, state.selected)));
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
async function exportZip() { const { zipSync } = await import("./lib/fflate.js"); return buildZip(state.site, { zipSync }); }

/* ------------------------------------------------------------------ render all + events */
function renderAll() {
  if (document.activeElement !== $("#siteName")) $("#siteName").value = state.site.name;
  renderBlockList();
  renderPreview();
  renderPanes();
  updateUndo();
  layoutFrame();
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
  $("#newSiteBtn").addEventListener("click", () => { closeDlg($("#projectsDlg")); renderTemplateGrid(); openDlg($("#templatesDlg")); });
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
    try { cb(await fileToDataUrl(f)); } catch (err) { toast(err.message || "Could not use that picture."); }
  });
  $("#exportHtml").addEventListener("click", () => { download(exportHtml(), "index.html", "text/html;charset=utf-8"); toast("Downloaded index.html: it opens in any browser and works offline."); });
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

/* ------------------------------------------------------------------ start */
async function start() {
  setupEvents();
  setSize(isPhone() ? "phone" : "desktop");
  const params = new URLSearchParams(location.search);
  let rec = null;
  try {
    const h = params.get("handoff");
    if (h) { const p = await takeHandoff(h); if (p?.type === "website" && p.site) { state.site = normalizeSite(p.site); } }
    if (!state.site) {
      const want = params.get("project") || localStorage.getItem(LAST);
      if (want) rec = await getProject(want);
      if (!rec) rec = (await listProjects(APP))[0] || null;
    }
  } catch (e) { console.warn("Saved sites unavailable", e); }
  if (rec?.data) { state.site = normalizeSite(rec.data); state.projectId = rec.id; }
  if (!state.site) state.site = makeTemplate("business");
  renderAll();
  if (rec?.data) setSaveState("Saved"); else await save();
  state.ready = true;
  window.adApp.ready = true;
  document.body.classList.add("ready");
}

window.adApp = {
  state, ready: false,
  get site() { return state.site; },
  exportHtml, exportZip, applyTemplate, load, flush, undo, redo, select, addBlock, setSize,
  renderEdit: () => renderSite(state.site, { mode: "edit" }),
  moveBlock: (from, to) => change((s) => moveBlock(s, from, to)),
  setTheme: (patch) => change((s) => Object.assign(s.theme, patch)),
  setText: (blockId, path, value) => { const b = blockById(blockId); if (b) change(() => setPath(b.data, path, value)); },
  fileToDataUrl,
};
start().catch((e) => { console.error(e); toast("Something went wrong while starting: " + e.message); });
