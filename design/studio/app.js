// AsaanDesk Studio: app shell. URL parameters, start screen, opening/saving designs (IndexedDB autosave),
// the export dialog, Magic Resize / Animate / Mockup actions and the window.adApp test hooks.
import { S, on, emit, commit, resetHistory, curPage, pageSize, layerById, selLayers, toast, h } from "./state.js";
import * as E from "./editor.js";
import * as UI from "./panels.js";
import { PRESETS, PRESET_GROUPS, getPreset, presetPx, sizeLabel, isPrint, customPreset, exportPixels } from "./presets.js";
import { newDesign, normalizeDesign, designProblems, withNewIds, clone, textLayer, shapeLayer, elementLayer, imageLayer, newId } from "./model.js";
import { listTemplates, getTemplate } from "./templates.js";
import { magicResize } from "./resize.js";
import { applyCollage } from "./collage.js";
import { autoAnimate } from "./animate.js";
import { applyBrand } from "./brandkit.js";
import { textHeight } from "./textlayout.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff, putHandoff } from "../shared/store.js";
import { loadBrand, saveBrand } from "../shared/brand.js";
import { exportRaster, exportPdf as pdfExport, exportSvg as svgExport, exportJson, parseDesignFile, download, fileBase, needsVector } from "./exporter.js";
import { renderPage as renderCanvas, canvasBlob } from "./canvas.js";
import { renderMockup, productFor } from "./mockup.js";
import { recordWebm, renderGif } from "./motion.js";
import { present, close as closePresent, presenting, onPresentClose } from "./present.js";
import * as Gallery from "./gallery.js";
import * as X from "./extras.js";
import * as P3 from "./panels3.js";
import * as DL from "./download.js";
import { parsePageRange, formatPageRange } from "./pagetools.js";
import { createCtxBar, renderCtx } from "./ctxbar.js";
import { pageSvg } from "./svg.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const MODES = ["collage", "mockup", "present", "resize", "animate", "logo", "translate"];

/* ---------------- open / save ---------------- */
const CREATE_LINK = /[?&](new|preset|template|tool|group|mode)=/;
const URL_KEY = () => "ad-studio-url:" + location.pathname + location.search;
function rememberUrlProject(id) { try { sessionStorage.setItem(URL_KEY(), id); } catch {} }
function urlProject() { try { return sessionStorage.getItem(URL_KEY()); } catch { return null; } }
let saveTimer = 0, lastThumb = 0, thumbUrl = null, saving = Promise.resolve();
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 500); }
async function saveNow() {
  if (!S.design || !S.projectId) return;
  const design = clone(S.design), id = S.projectId;
  saving = saving.then(async () => {
    if (Date.now() - lastThumb > 4000 || !thumbUrl) {
      try { const c = await renderCanvas(design, 0, { width: 320, chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims, fill: "#ffffff" }); thumbUrl = c.toDataURL("image/jpeg", 0.8); lastThumb = Date.now(); } catch {}
    }
    await saveProject({ id, app: "studio", name: design.name, data: design, thumb: thumbUrl, preset: design.preset.label });
    S.savedAt = Date.now();
    setSaved("Saved");
  }).catch((e) => { console.warn(e); setSaved("Not saved (storage full?)"); });
  return saving;
}
function setSaved(t) { const el = $("#saveState"); if (el) el.textContent = t; shell?.setSaved(/^Saving/.test(t) ? "saving" : /^Saved/.test(t) ? "saved" : "unsaved"); }

/** Opens a design in the editor. opts: { projectId (existing), mode }. Returns the project id. */
async function openDesign(design, { projectId = null, mode = null, name = null, replace = false } = {}) {
  const d = normalizeDesign(design);
  const bad = designProblems(d);
  if (bad.length) throw new Error("This design can't be opened: " + bad.slice(0, 2).join(", "));
  if (name) d.name = name;
  closePresent();
  S.design = d; S.page = 0; S.sel = []; S.editing = null; S.cropping = null; S.mock = null;
  S.projectId = projectId || newId("d");
  thumbUrl = null; lastThumb = 0;
  resetHistory();
  showEditor();
  if (needsVector(d)) await UI.ensureVector().catch(() => toast("Charts could not load. Check your connection."));
  E.renderAll();
  UI.renderPagebar(); // first: its thumbnails set the page bar height, and so the canvas area that fit() uses
  E.fit();
  UI.renderProps();
  $("#nameInput").value = d.name;
  if (shell) { shell.setTitle(/^Untitled/.test(d.name) ? "" : d.name); shell.setProjectId(S.projectId); shell.setDesignId(S.projectId); }
  renderCtx();
  // A link that creates something (?new=1, ?preset=, ?template=, ?tool=, ?group=, ?mode=) keeps its address, so the
  // page shows the link the person clicked; a reload in this tab reopens the same design (rememberUrlProject).
  if (CREATE_LINK.test(location.search) && !/[?&]project=/.test(location.search)) rememberUrlProject(S.projectId);
  else history.replaceState(null, "", location.pathname + "?project=" + encodeURIComponent(S.projectId) + (shellTool ? "&tool=" + shellTool : ""));
  if (!projectId || replace) await saveNow();
  updateMerchChip();
  if (mode) applyMode(mode);
  emit("opened");
  return S.projectId;
}
function applyMode(mode) {
  if (mode === "present") startPresent();
  else if (mode === "resize") UI.openPanel("resize");
  else if (mode === "animate") UI.openPanel("animate");
  else if (mode === "translate") UI.openPanel("translate");
  else if (mode === "mockup") UI.openPanel("mockup");
  else if (mode === "collage") UI.openPanel("collage");
  else if (mode === "logo") UI.openPanel("templates", { group: "logo" });
}
function newCollage(presetId = "collage-square") {
  const d = newDesign(presetId, { name: "Photo collage" });
  const { w, h: H } = presetPx(d.preset);
  applyCollage(d.pages[0], "four", w, H, { gap: 16, radius: 0 });
  return d;
}
async function openTemplate(id, mode = null, replaceId = null) {
  const ref = Gallery.resolveTemplate(id);
  mode = mode || ref.mode;
  const t = Gallery.build(id) || getTemplate(ref.base);
  if (!t) { toast("That template was not found."); return null; }
  const d = t.design;
  d.pages = d.pages.map((p) => ({ ...p, id: newId("p"), layers: p.layers.map(withNewIds) }));
  return openDesign(d, { mode, name: t.title, projectId: replaceId, replace: !!replaceId });
}
async function openProject(id, mode = null) {
  const p = await getProject(id);
  if (!p) { toast("That design is no longer on this device."); showStart(); return null; }
  return openDesign(p.data, { projectId: p.id, mode });
}

/* ---------------- views ---------------- */
function showEditor() {
  mountFrame();
  if (shell) { shell.el.hidden = false; document.documentElement.classList.add("ad-shell-on"); }
  $("#startView").hidden = true;
  $("#startView").innerHTML = "";
  $("#editorView").hidden = false;
  document.body.classList.add("editing");
  document.body.classList.remove("start");
}
async function showStart(group = null) {
  if (S.editing) E.endEdit();
  if (S.design) await saveNow();
  closePresent();
  UI.closePanel();
  S.design = null; S.projectId = null;
  if (shell) { shell.el.hidden = true; document.documentElement.classList.remove("ad-shell-on"); }
  $("#editorView").hidden = true;
  $("#startView").hidden = false;
  document.body.classList.remove("editing");
  document.body.classList.add("start");
  const boot = $("#bootMsg"); if (boot) boot.hidden = true;
  history.replaceState(null, "", location.pathname + (group ? "?group=" + group : ""));
  await renderStart(group);
}

async function renderStart(group = null) {
  const root = $("#startView");
  root.innerHTML = "";
  let grp = group && PRESET_GROUPS.some((g) => g.id === group) ? group : "";
  const pendingMode = S.pendingMode;
  const hero = h("section.st-hero", {},
    h("h1", { text: pendingMode ? { resize: "Choose a design to resize", animate: "Choose a design to animate", translate: "Choose a design to translate", present: "Choose a design to present" }[pendingMode] || "What will you design today?" : "What will you design today?" }),
    h("p", { text: "Pick a size or a template. Everything runs in your browser and saves on this device." }));
  const search = h("input.ad-input.st-bigsearch", { type: "search", placeholder: "Search templates: sale, eid, wedding, business card…", "aria-label": "Search templates", id: "startSearch" });
  hero.append(search);
  const chips = h("div.st-chips.st-groupchips", { role: "group", "aria-label": "Design groups" });
  const presets = h("div.st-presets", { id: "presetGrid" });
  const tgrid = h("div.st-tgrid.st-tgrid-lg", { id: "templateGrid" });
  const recent = h("div.st-recent", { id: "recentGrid" });
  const drawGroup = () => {
    chips.innerHTML = "";
    for (const g of [{ id: "", label: "All" }, ...PRESET_GROUPS]) chips.append(h("button", { type: "button", class: "btn chip" + (grp === g.id ? " on" : ""), "data-group": g.id, text: g.label, "aria-pressed": String(grp === g.id), on: { click: () => { grp = g.id; history.replaceState(null, "", location.pathname + (grp ? "?group=" + grp : "")); drawGroup(); } } }));
    presets.innerHTML = "";
    for (const g of PRESET_GROUPS) {
      if (grp && g.id !== grp) continue;
      const items = PRESETS.filter((p) => p.group === g.id);
      const row = h("div.st-prow");
      for (const p of items) {
        const { w, h: H } = presetPx(p), k = 46 / Math.max(w, H);
        row.append(h("button.st-preset", { type: "button", "data-preset": p.id, "aria-label": `New ${p.label}, ${sizeLabel(p)}`, on: { click: () => startPreset(p.id) } },
          h("span.st-pshape", {}, h("i", { style: { width: Math.max(8, w * k) + "px", height: Math.max(8, H * k) + "px" } })),
          h("span.st-plabel", { text: p.label }), h("small", { text: sizeLabel(p) + (p.pages ? ` · ${p.pages} pages` : "") })));
      }
      presets.append(h("div.st-pgroup", {}, h("h3", { text: g.label }, h("small", { text: g.hint })), row));
    }
    drawTemplates();
  };
  const drawTemplates = () => {
    tgrid.innerHTML = "";
    const list = listTemplates({ query: search.value, group: grp });
    if (!list.length) tgrid.append(h("p.st-empty", { text: "No templates match. Try another word, like sale, eid, card or collage." }));
    for (const t of list) tgrid.append(UI.templateCard(t, () => openTemplate(t.id, pendingMode).then(() => { S.pendingMode = null; })));
  };
  search.addEventListener("input", () => { clearTimeout(search._t); search._t = setTimeout(drawTemplates, 120); });
  // Custom size.
  const cw = h("input.ad-input", { type: "number", value: 1080, min: 1, "aria-label": "Width", id: "customW" });
  const ch = h("input.ad-input", { type: "number", value: 1080, min: 1, "aria-label": "Height", id: "customH" });
  const cu = h("select.ad-input", { "aria-label": "Unit", id: "customUnit" }, h("option", { value: "px", text: "px" }), h("option", { value: "mm", text: "mm" }), h("option", { value: "in", text: "in" }));
  const custom = h("form.st-custom", { on: { submit: (e) => { e.preventDefault(); try { const p = customPreset(cw.value, ch.value, cu.value); openDesign(newDesign(p, { name: "Custom design" })); } catch (err) { toast(err.message); } } } },
    h("span", { text: "Custom size" }), cw, h("span", { text: "×" }), ch, cu, h("button.btn.primary", { type: "submit", text: "Create" }));
  const openFile = h("input", { type: "file", accept: ".json,.asaandesk.json,application/json", hidden: true, id: "openDesignFile" });
  openFile.addEventListener("change", async () => { const f = openFile.files[0]; if (!f) return; try { await openDesign(parseDesignFile(await f.text()), { name: null }); } catch (e) { toast(e.message); } openFile.value = ""; });
  root.append(hero, chips,
    h("section.st-block", {}, h("div.st-blockhead", {}, h("h2", { text: "Recent designs" })), recent),
    h("section.st-block", {}, h("div.st-blockhead", {}, h("h2", { text: "Start from a size" }), custom), presets),
    h("section.st-block", {}, h("div.st-blockhead", {}, h("h2", { text: "Templates" }), h("button.btn", { type: "button", text: "Open a design file", on: { click: () => openFile.click() } }), openFile), tgrid));
  drawGroup();
  // Recent designs.
  let recents = [];
  try { recents = await listProjects("studio"); } catch {}
  recent.innerHTML = "";
  if (!recents.length) recent.append(h("div.st-emptystate", { html: `<svg width="88" height="64" viewBox="0 0 88 64" aria-hidden="true"><rect x="4" y="8" width="56" height="48" rx="8" fill="#efedff" stroke="#c9c3ff" stroke-width="2"/><rect x="28" y="2" width="56" height="48" rx="8" fill="#fff" stroke="#c9c3ff" stroke-width="2"/><path d="M38 16h30M38 26h22M38 36h26" stroke="#8b80f5" stroke-width="3" stroke-linecap="round"/></svg><p>Your designs will show here. They are saved on this device as you work.</p>` }));
  for (const p of recents.slice(0, 24)) {
    const card = h("div.st-rcard", { "data-project": p.id });
    const open = h("button.st-rthumbbtn", { type: "button", "aria-label": "Open " + p.name, on: { click: () => openProject(p.id, pendingMode).then(() => { S.pendingMode = null; }) } });
    if (p.thumb) open.append(h("img", { src: p.thumb, alt: "" })); else open.append(h("span.st-noth", { text: "No preview" }));
    const del = h("button.btn.small.ghost", { type: "button", text: "Delete", "aria-label": "Delete " + p.name, on: { click: async () => { if (!confirm(`Delete "${p.name}" from this device?`)) return; await deleteProject(p.id); renderStart(grp); } } });
    card.append(open, h("div.st-rmeta", {}, h("strong", { text: p.name }), h("small", { text: (p.preset || "") + " · " + ago(p.updated) }), del));
    recent.append(card);
  }
}
const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + " min ago" : s < 86400 ? Math.round(s / 3600) + " h ago" : new Date(t).toLocaleDateString(); };
function startPreset(id, mode = S.pendingMode) {
  const p = getPreset(id);
  if (!p) { toast("Unknown size."); return null; }
  const d = p.group === "collage" ? newCollage(id) : newDesign(p);
  if (p.group === "merch") d.pages.forEach((pg) => { pg.background = { color: id === "mug" ? "#ffffff" : "none" }; });
  S.pendingMode = null;
  return openDesign(d, { mode: mode || (p.group === "collage" ? "collage" : null) });
}
function updateMerchChip() {
  const chip = $("#merchChip");
  const prod = productFor(S.design?.preset);
  chip.hidden = !prod;
  if (prod) chip.textContent = { tshirt: "👕 Preview on a T-shirt", hoodie: "Preview on a hoodie", mug: "☕ Preview on a mug" }[prod];
}

/* ---------------- top bar ---------------- */
function initBar() {
  $("#homeBtn").addEventListener("click", () => showStart());
  $("#undoBtn").addEventListener("click", () => emit("undo"));
  $("#redoBtn").addEventListener("click", () => emit("redo"));
  $("#zoomIn").addEventListener("click", () => E.setZoom(S.zoom * 1.25));
  $("#zoomOut").addEventListener("click", () => E.setZoom(S.zoom / 1.25));
  $("#zoomFit").addEventListener("click", () => E.fit());
  $("#presentBtn").addEventListener("click", () => startPresent());
  $("#downloadBtn").addEventListener("click", () => openExport());
  $("#merchChip").addEventListener("click", () => UI.openPanel("mockup"));
  $("#merchChip").addEventListener("pointerdown", (e) => e.stopPropagation());
  const name = $("#nameInput");
  name.addEventListener("input", () => { if (S.design) { S.design.name = name.value.slice(0, 80) || "Untitled design"; commit("name"); shell?.setTitle(/^Untitled/.test(S.design.name) ? "" : S.design.name); } });
  name.addEventListener("keydown", (e) => { if (e.key === "Enter") name.blur(); });
  on("zoom", (z) => { $("#zoomPct").textContent = Math.round(z * 100) + "%"; });
  on("history", () => { $("#undoBtn").disabled = !S.history?.canUndo; $("#redoBtn").disabled = !S.history?.canRedo; });
  on("change", () => { setSaved("Saving…"); scheduleSave(); });
  on("undo", () => restore(S.history.undo()));
  on("redo", () => restore(S.history.redo()));
  on("selection", () => { document.body.classList.toggle("has-sel", S.sel.length > 0); });
  on("render", () => UI.schedulePagebar());
  on("pages", () => UI.renderPagebar());
  on("open-template", (id) => { if (curPageEmpty()) openTemplate(id, null, S.projectId); else openTemplate(id).then(() => toast("Template opened as a new design. Your other design is saved.")); });
  on("open-project", (id) => openProject(id));
  on("download-png", async (d) => { const r = await exportRaster(d, 0, { scale: 1 }); download(r.blob, fileBase(d) + ".png"); });
  on("present", () => startPresent());
  on("expand-whiteboard", () => expandToWhiteboard());
  on("paste-text", (text) => { const { w, h: H } = pageSize(); const l = textLayer(text.slice(0, 2000), { w: w * 0.6, size: Math.round(Math.min(w, H) * 0.04) }); l.h = textHeight(l.text, l.w); E.addLayer(l); });
  on("resize", async (ids, res, rej) => { try { res(await resizeTo(ids)); } catch (e) { rej(e); } });
  on("animate-export", async (opts, res, rej) => { try { const r = await animateExport(opts); res(r); } catch (e) { rej(e); } });
  on("duplicate-design", async (label, res, rej) => {
    try {
      await saveNow();
      const d = clone(S.design); d.name = `${d.name || "Design"} (${label || "copy"})`;
      d.pages = d.pages.map((p) => ({ ...p, id: newId("p"), layers: p.layers.map(withNewIds) }));
      await openDesign(d);
      res?.();
    } catch (e) { rej?.(e); }
  });
  on("resize-in-place", (target) => {
    try {
      if (S.editing) E.endEdit();
      const d = magicResize(S.design, target);
      S.design.preset = d.preset; S.design.pages = d.pages; S.sel = [];
      S.page = Math.min(S.page, d.pages.length - 1);
      E.renderAll(); UI.renderPagebar(); E.fit(); renderCtx();
      commit("resize-in-place");
      toast(`This design is now ${d.preset.label}. Press Ctrl+Z to undo.`);
    } catch (e) { toast(e.message); }
  });
  // Copy style (paint roller), lock cycle and page titles (round 3).
  on("copy-style", () => { if (P3.startCopyStyle()) renderCtx(); });
  on("paste-style", (id) => { if (id) P3.pasteCopiedStyle([id]); else { P3.stopCopyStyle(); toast("Copy style stopped."); } renderCtx(); });
  on("paste-style-sel", () => { if (!P3.copiedStyle()) { toast("Copy a style first (Ctrl+Alt+C)."); return; } P3.pasteCopiedStyle(S.sel); renderCtx(); });
  on("lock-cycle", () => { P3.lockSelection(); renderCtx(); });
  on("context-menu", (x, y) => P3.contextMenu(x, y));
  on("link", () => P3.linkDialog());
  on("comment", (a) => shell?.commentOn?.(a));
  on("goto-page", () => { const n = S.design ? prompt(`Go to page (1 to ${S.design.pages.length})`, String(S.page + 1)) : null; const i = Math.round(+n) - 1; if (n !== null && i >= 0 && i < S.design.pages.length) E.goPage(i); });
  on("page-title", () => { UI.schedulePagebar(); shell?.refresh?.(); });
  on("mockup-use", async (m) => { try { await mockupToDesign(m); } catch (e) { toast(e.message); } });
  on("logo-to-brand", async () => { try { const src = await logoPng(); const b = loadBrand(); b.logos = [...(b.logos || []), { name: S.design.name || "Logo", src }]; if (!saveBrand(b)) throw new Error("The brand kit is full in this browser. Remove a logo first."); toast("Logo saved to your brand kit."); } catch (e) { toast(e.message); } });
  on("logo-to-card", async () => { try { await logoToCard(); } catch (e) { toast(e.message); } });
  on("mockup-download", async (m) => { try { const b = await mockupPng(m); download(b, `${fileBase(S.design)}-${m.product}-mockup.png`); toast("Mockup saved."); } catch (e) { toast(e.message); } });
  const bar = $("#pagebar");
  bar.querySelector("[data-act=add]").addEventListener("click", () => E.addPage());
  // Several pages picked (Ctrl / Cmd + click on thumbnails): duplicate or delete them all.
  const picked = () => (S.pageSel?.size > 1 ? [...S.pageSel].filter((i) => i < S.design.pages.length).sort((a, b) => a - b) : null);
  bar.querySelector("[data-act=dup]").addEventListener("click", () => { const p = picked(); if (p) { E.dupPages(p); S.pageSel = null; } else E.dupPage(); });
  bar.querySelector("[data-act=del]").addEventListener("click", () => { const p = picked(); if (p) { if (p.length >= S.design.pages.length) { toast("A design needs at least one page."); return; } if (confirm(`Delete ${p.length} pages?`)) { E.deletePages(p); S.pageSel = null; } } else if (confirm("Delete this page?")) E.deletePage(); });
  bar.querySelector("[data-act=left]").addEventListener("click", () => E.movePage(S.page, S.page - 1));
  bar.querySelector("[data-act=right]").addEventListener("click", () => E.movePage(S.page, S.page + 1));
  window.addEventListener("pagehide", () => { if (S.design) saveNow(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.design) saveNow(); });
}
const curPageEmpty = () => S.design && S.design.pages.every((p) => !p.layers.length);
function restore(d) {
  if (!d) return;
  if (S.editing) { S.editing = null; }
  S.cropping = null;
  S.design = d;
  S.page = Math.min(S.page, d.pages.length - 1);
  $("#nameInput").value = d.name;
  shell?.setTitle(/^Untitled/.test(d.name) ? "" : d.name);
  E.renderAll();
  UI.renderPagebar();
  renderCtx();
  emit("history");
  emit("layers");
  setSaved("Saving…");
  scheduleSave();
}

/* ---------------- present ---------------- */
/** Present: opts { presenter, autoplay, record } (Present full screen, Presenter view, Autoplay, Present and record). */
async function startPresent(from = S.page, opts = {}) {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  const root = await present(S.design, from, S.env, { ...opts, onRecording: (blob, withMic) => { download(blob, fileBase(S.design) + "-recording.webm"); toast(withMic ? "Your recording is saved (video with your voice)." : "Your recording is saved (no microphone was available)."); } });
  if (!opts.presenter) enhancePresent(root);
  onPresentClose(() => { E.fit(); });
}
const PRESENT_MODES = [["full", "Present full screen", "Show your pages, one at a time", {}], ["presenter", "Presenter view", "Notes, next page and a timer beside the slide", { presenter: true }], ["autoplay", "Autoplay", "Pages move on by themselves (page timing)", { autoplay: true }], ["record", "Present and record", "Record the slides with your voice (WebM)", { record: true }]];
let presentMenu = null;
function togglePresentMenu(anchor) {
  if (presentMenu) { presentMenu.remove(); presentMenu = null; return; }
  presentMenu = h("div.st-pmenu", { role: "menu", "aria-label": "Present" });
  for (const [id, label, hint, opts] of PRESENT_MODES) presentMenu.append(h("button.st-pmenu-item", { type: "button", role: "menuitem", "data-present": id, html: `<b>${label}</b><small>${hint}</small>`, on: { click: () => { presentMenu.remove(); presentMenu = null; startPresent(S.page, opts); } } }));
  document.body.append(presentMenu);
  const r = anchor.getBoundingClientRect();
  presentMenu.style.top = r.bottom + 6 + "px";
  presentMenu.style.left = Math.max(8, Math.min(innerWidth - presentMenu.offsetWidth - 8, r.right - presentMenu.offsetWidth)) + "px";
  const away = (e) => { if (presentMenu && !presentMenu.contains(e.target) && e.target !== anchor) { presentMenu.remove(); presentMenu = null; document.removeEventListener("pointerdown", away, true); } };
  setTimeout(() => document.addEventListener("pointerdown", away, true));
}

/* ---------------- export dialog ---------------- */
// Canva's Download panel: file type, size, quality (or a file-size limit), transparent background, PDF Standard /
// Print (bleed, crop marks, flatten, compress), video quality, All / This page / chosen pages, saved settings.
const RASTER = ["png", "jpg", "webp"];
function openExport() {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  const dlg = $("#exportDlg");
  const P = S.design.preset, print = isPrint(P);
  const f = dlg.querySelector("form");
  f.querySelector("[name=scale] option[value=print]").textContent = print ? `Print quality (${P.dpi} dpi)` : "Same as 1×";
  f.querySelector("[name=scale]").value = print ? "print" : "1";
  f.querySelector("[name=bleed]").checked = false;
  f.querySelector("[name=marks]").checked = false;
  f.querySelector("[name=flatten]").checked = false;
  f.querySelector("[name=compress]").checked = false;
  f.querySelector("[name=clear]").checked = P.group === "merch" || P.id.startsWith("sticker") || P.group === "logo";
  f.querySelector("[name=format]").value = print ? "pdfprint" : "png";
  f.querySelector("[name=pages]").value = "all";
  f.querySelector("[name=range]").value = "";
  f.querySelector("[name=save]").checked = false;
  // Saved download settings for this kind of design (Canva: "Save download settings").
  const saved = DL.loadDownloadSettings(P.group);
  if (saved) {
    for (const [k, v] of Object.entries(saved)) { const el = f.querySelector(`[name=${k}]`); if (!el || k === "pages" || k === "range") continue; if (el.type === "checkbox") el.checked = !!v; else if ([...(el.options || [])].some((o) => o.value === String(v)) || el.tagName !== "SELECT") el.value = v; }
    f.querySelector("[name=save]").checked = true;
  }
  fillPageChecks(f);
  dlg.querySelector(".st-dlgstatus").textContent = "";
  syncExport();
  if (saved?.quality) { const q = f.querySelector("[name=quality]"); if ([...q.options].some((o) => o.value === saved.quality)) q.value = saved.quality; syncExport(); }
  dlg.showModal();
}
const field = (f, n) => f.querySelector(`[name=${n}]`);
function fillPageChecks(f) {
  const box = f.querySelector(".st-pagechecks");
  box.innerHTML = "";
  S.design.pages.forEach((pg, i) => box.append(h("label.st-pagecheck", { title: pg.title || `Page ${i + 1}` }, h("input", { type: "checkbox", value: String(i), checked: true, "aria-label": `Page ${i + 1}` }), h("span", { text: String(i + 1) }))));
  box.onchange = () => { const list = [...box.querySelectorAll("input:checked")].map((x) => +x.value); field(f, "range").value = formatPageRange(list); syncExport(); };
  field(f, "range").oninput = () => { try { const set = new Set(parsePageRange(field(f, "range").value, S.design.pages.length)); box.querySelectorAll("input").forEach((x) => { x.checked = set.has(+x.value); }); f.querySelector(".st-dlgstatus").textContent = ""; } catch (e) { f.querySelector(".st-dlgstatus").textContent = e.message; } };
}
/** The pages the dialog will download (0-based). */
function chosenPages(f) {
  const v = field(f, "pages").value;
  if (v === "current") return [S.page];
  if (v === "custom") { const list = parsePageRange(field(f, "range").value || formatPageRange([...f.querySelectorAll(".st-pagechecks input:checked")].map((x) => +x.value)), S.design.pages.length); if (!list.length) throw new Error("Choose at least one page."); return list; }
  return S.design.pages.map((_, i) => i);
}
function syncExport() {
  const f = $("#exportDlg form"), fmt = field(f, "format").value;
  const P = S.design.preset, pdf = fmt === "pdf" || fmt === "pdfprint", video = ["mp4", "gif", "webm"].includes(fmt);
  // Quality choices for the file type.
  const q = field(f, "quality"), cur = q.value;
  const opts = DL.QUALITY[fmt] || [];
  if (q.dataset.fmt !== fmt) { q.innerHTML = ""; for (const [v, t] of opts) q.append(h("option", { value: v, text: t })); q.dataset.fmt = fmt; if (opts.some(([v]) => v === cur)) q.value = cur; }
  f.querySelector(".st-scale").hidden = !(RASTER.includes(fmt) || fmt === "zip");
  f.querySelector(".st-quality").hidden = !opts.length;
  f.querySelector(".st-limit").hidden = !(opts.length && q.value === "limit");
  f.querySelector(".st-vq").hidden = !video;
  field(f, "vq").querySelector("option[value='480']").textContent = fmt === "gif" ? "Small (480 px)" : "480p";
  field(f, "vq").querySelector("option[value='720']").textContent = fmt === "gif" ? "Medium (720 px)" : "720p";
  field(f, "vq").querySelector("option[value='1080']").textContent = fmt === "gif" ? "Large (1080 px, big file)" : "1080p";
  f.querySelector(".st-clear").hidden = !["png", "webp", "svg"].includes(fmt);
  f.querySelector("[name=marks]").closest("label").hidden = fmt !== "pdfprint";
  f.querySelector("[name=bleed]").closest("label").hidden = !P.bleed || !(["png", "jpg", "webp", "pdfprint"].includes(fmt) || (fmt === "pdf" && isPrint(P)));
  f.querySelector(".st-flatten").hidden = !pdf;
  f.querySelector(".st-compress").hidden = !pdf;
  f.querySelector(".st-cmyk").hidden = fmt !== "pdfprint";
  f.querySelector(".st-pages").hidden = ["json", "svg", "pptx"].includes(fmt) || S.design.pages.length < 2;
  f.querySelector(".st-pagepick").hidden = f.querySelector(".st-pages").hidden || field(f, "pages").value !== "custom";
  const sc = field(f, "scale").value, px = exportPixels(P, { scale: sc === "print" ? null : +sc, dpi: sc === "print" ? P.dpi : null, bleed: field(f, "bleed").checked && !field(f, "bleed").closest("label").hidden });
  const many = (() => { try { return chosenPages(f).length; } catch { return 0; } })();
  f.querySelector(".st-pxinfo").textContent = RASTER.includes(fmt) ? `${px.w} × ${px.h} px${many > 1 ? ` · ${many} files` : ""}` : fmt === "pdf" ? "Sharp text you can select. Photos at screen quality (96 dpi)." : fmt === "pdfprint" ? `Sharp text you can select. Pictures at ${Math.max(300, P.dpi)} dpi.` : fmt === "svg" ? "This page as SVG." : video ? (many > 1 ? `A slideshow: each page shows for its timing (${many} pages).` : "This page with its animations.") : fmt === "zip" ? "Every chosen page as a PNG in one ZIP." : fmt === "pptx" ? "Text stays editable in PowerPoint." : "Open it again later with “Open a design file”.";
}
async function runExport(e) {
  e.preventDefault();
  const dlg = $("#exportDlg"), f = dlg.querySelector("form"), status = dlg.querySelector(".st-dlgstatus");
  const fmt = field(f, "format").value, base = fileBase(S.design);
  const sc = field(f, "scale").value, P = S.design.preset;
  const bleed = field(f, "bleed").checked && !field(f, "bleed").closest("label").hidden, marks = field(f, "marks").checked && fmt === "pdfprint";
  const level = field(f, "quality").value, kb = +field(f, "limitKB").value;
  const go = dlg.querySelector("#exportGo");
  let pages;
  try { pages = chosenPages(f); } catch (err) { status.textContent = err.message; return; }
  // Save (or forget) the settings for this kind of design.
  const keep = {};
  for (const n of ["format", "scale", "quality", "limitKB", "vq", "bleed", "marks", "flatten", "compress", "clear"]) { const el = field(f, n); keep[n] = el.type === "checkbox" ? el.checked : el.value; }
  DL.saveDownloadSettings(P.group, field(f, "save").checked ? keep : null);
  status.textContent = "Working…";
  go.disabled = true;
  try {
    if (RASTER.includes(fmt)) {
      const transparent = fmt !== "jpg" && field(f, "clear").checked && !f.querySelector(".st-clear").hidden;
      const ro = { scale: sc === "print" ? null : +sc, dpi: sc === "print" ? P.dpi : null, bleed, type: fmt, transparent };
      let note = "";
      for (const i of pages) {
        let blob;
        if (level === "limit") {
          const r = await DL.fitUnderKB((quality, shrink) => exportRaster(S.design, i, { ...ro, quality, shrink, compress: fmt === "png" }).then((x) => x.blob), kb, { lossy: fmt !== "png" });
          blob = r.blob;
          if (!r.fits) note = ` Could not get under ${kb} KB; this is the smallest we could make (${Math.round(blob.size / 1024)} KB).`;
        } else blob = (await exportRaster(S.design, i, { ...ro, quality: DL.qualityValue(fmt, level), compress: fmt === "png" && level === "compress" })).blob;
        download(blob, `${base}${pages.length > 1 || S.design.pages.length > 1 ? "-" + (i + 1) : ""}.${fmt}`);
      }
      if (note) { status.textContent = "Done." + note; go.disabled = false; return; }
    } else if (fmt === "pdf" || fmt === "pdfprint") {
      const dpi = fmt === "pdfprint" ? Math.max(300, P.dpi) : 96;
      const bytes = await pdfExport(S.design, { pages, bleed, marks, dpi, flatten: field(f, "flatten").checked, compress: field(f, "compress").checked });
      download(new Blob([bytes], { type: "application/pdf" }), base + ".pdf");
    } else if (fmt === "svg") {
      const svg = await svgExport(S.design, S.page, { transparent: field(f, "clear").checked });
      download(new Blob([svg], { type: "image/svg+xml" }), `${base}${S.design.pages.length > 1 ? "-" + (S.page + 1) : ""}.svg`);
    } else if (fmt === "pptx") {
      download(await X.exportPptx(S.design, { onStatus: (m) => { status.textContent = m; } }), base + ".pptx");
    } else if (fmt === "mp4" || fmt === "gif" || fmt === "webm") {
      status.textContent = fmt === "gif" ? "Making your GIF…" : "Recording your video (it plays once in real time)…";
      await animateExport({ format: fmt, page: pages[0], pages, maxSide: +field(f, "vq").value || 1080, onProgress: (p) => { status.textContent = `${fmt === "gif" ? "Making your GIF" : "Recording"}… ${Math.round(p * 100)}%`; } });
    } else if (fmt === "zip") {
      download(await X.pagesZip({ ...S.design, pages: pages.map((i) => S.design.pages[i]) }, { base, type: "png", scale: sc === "print" ? null : +sc, dpi: sc === "print" ? P.dpi : null }), base + "-pages.zip");
    } else download(exportJson(S.design), base + ".asaandesk.json");
    status.textContent = "Done. Check your downloads.";
    setTimeout(() => dlg.open && dlg.close(), 700);
  } catch (err) { status.textContent = err.message || String(err); }
  go.disabled = false;
}
/* ---------------- Magic Resize / Animate / Mockups ---------------- */
async function resizeTo(ids) {
  if (S.editing) E.endEdit();
  const out = [];
  for (const id of ids) {
    const d = magicResize(S.design, id);
    const rec = await saveProject({ app: "studio", name: d.name, data: d, preset: d.preset.label, thumb: null });
    out.push({ projectId: rec.id, design: d, presetId: id });
  }
  // Thumbnails for the new designs (after the list is shown).
  setTimeout(async () => { for (const r of out) { try { const c = await renderCanvas(r.design, 0, { width: 320, fill: "#ffffff", chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims }); await saveProject({ id: r.projectId, app: "studio", name: r.design.name, data: r.design, preset: r.design.preset.label, thumb: c.toDataURL("image/jpeg", 0.8) }); } catch {} } }, 50);
  return out;
}
async function animateExport({ format = "webm", page = S.page, pages = null, fps, maxSide, onProgress } = {}) {
  const slideshow = pages && pages.length > 1 ? pages : null;
  if (!slideshow && !S.design.pages[page].layers.some((l) => l.animation)) {
    const m = autoAnimate(S.design.pages[page], pageSize());
    for (const l of S.design.pages[page].layers) l.animation = m.get(l.id) || null;
    commit("animate");
    toast("Added Auto animate first.");
  }
  if (format === "gif") {
    const r = await renderGif(S.design, page, { fps: fps || 12, maxSide: maxSide || 480, onProgress, env: S.env, pages: slideshow });
    download(r.blob, fileBase(S.design) + ".gif");
    return r;
  }
  const r = await recordWebm(S.design, page, { fps: fps || 30, maxSide: maxSide || 1080, onProgress, env: S.env, mp4: format === "mp4", pages: slideshow });
  download(r.blob, fileBase(S.design) + (format === "mp4" ? ".mp4" : ".webm"));
  return r;
}
async function mockupPng({ product = productFor(S.design.preset) || "tshirt", color = "#ffffff", view = "front", size = 1200, upload = null, place = null } = {}) {
  const c = await renderMockup(upload?.design || S.design, upload ? upload.page : S.page, { product, color, view, size, place, chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims });
  return canvasBlob(c, "image/png");
}
/** "Expand to whiteboard": this page as a picture plus its texts as sticky notes on a new whiteboard (store.js handoff). */
async function expandToWhiteboard() {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  const win = window.open("", "_blank");
  try {
    await saveNow();
    const pg = curPage(), { w, h: H } = pageSize();
    const r = await exportRaster(S.design, S.page, { scale: Math.min(1, 1600 / Math.max(w, H)), type: "png" });
    const src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
    const texts = pg.layers.filter((l) => l.type === "text" && !l.hidden).map((l) => l.text.content.trim()).filter(Boolean).slice(0, 40);
    const head = pg.layers.filter((l) => l.type === "text" && !l.hidden).sort((a, b) => b.text.size - a.text.size)[0];
    const title = head ? head.text.content.split("\n")[0].slice(0, 80) : `${S.design.name} – page ${S.page + 1}`;
    const id = await putHandoff({ type: "whiteboard", name: S.design.name || "Design", title, texts, image: { src, w: r.width, h: r.height } });
    const url = "/design/whiteboard/?handoff=" + encodeURIComponent(id);
    if (win) { win.location.href = url; toast("Opened on a new whiteboard in a new tab."); } else location.href = url;
    return id;
  } catch (e) { win?.close(); toast(e.message || "Could not open the whiteboard."); return null; }
}
/** The current page as a transparent PNG data URL (logos for the brand kit and business cards). */
async function logoPng(size = 600) {
  const r = await exportRaster(S.design, S.page, { scale: size / presetPx(S.design.preset).w, type: "png", transparent: true });
  return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
}
/** "Use on a business card": a new 2-sided card with the logo on the front and a contact layout on the back. */
async function logoToCard() {
  const src = await logoPng(600), name = S.design.name || "Your brand";
  const d = newDesign("business-card-us", { name: name + " business card" });
  const { w: W, h: H } = presetPx(d.preset);
  d.pages[0].layers.push(imageLayer(src, { x: W / 2 - 60, y: H / 2 - 60, w: 120, h: 120, nw: 600, nh: 600, name: "Logo" }));
  const back = d.pages[1];
  back.layers.push(imageLayer(src, { x: 18, y: H / 2 - 32, w: 64, h: 64, nw: 600, nh: 600, name: "Logo" }));
  const line = (t, y, o) => { const l = textLayer(t, { x: 100, y, w: W - 118, size: 11, ...o }); l.h = textHeight(l.text, l.w); back.layers.push(l); };
  line("Your Name", 54, { size: 18, bold: true }); line("Job title", 80, { size: 11, color: "#5b6478" }); line("+1 555 0100  ·  you@example.com", 118, { size: 9.5 }); line("www.example.com", 136, { size: 9.5 });
  await openDesign(d);
  toast("Business card made with your logo. Change the details on the back.");
}
/** "Use in a design": the mockup picture becomes a new square design you can add text to. */
async function mockupToDesign(m) {
  const blob = await mockupPng({ ...m, size: 1080 });
  const src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  const d = newDesign("instagram-post", { name: `${fileBase(S.design)} mockup` });
  d.pages[0].layers.push(imageLayer(src, { x: 0, y: 0, w: 1080, h: 1080, nw: 1080, nh: 1080, name: "Mockup" }));
  await openDesign(d);
  toast("Mockup placed in a new design. Your other design is saved.");
}

/* ---------------- editor frame (shared shell: top bar, rail, side panel, bottom bar) ---------------- */
let shell = null, shellTool = null, shellMod = null;
const BY_MODE = { collage: "photo-collages", mockup: "mockups", logo: "logos", resize: "magic-resize", animate: "magic-animate", translate: "translate-design" };
function detectTool() {
  const t = params.get("tool");
  if (Gallery.STUDIO_TOOLS[t]) return t;
  if (BY_MODE[params.get("mode")]) return BY_MODE[params.get("mode")];
  if (params.get("group") === "social") return "social-media-designs";
  if (params.get("group") === "print") return "print-designs";
  const tp = params.get("template");
  if (tp) { const t = Gallery.toolOf(tp); if (t) return t; }
  if (params.get("preset")) return Gallery.toolForPreset(params.get("preset"));
  if (params.get("new")) return "presentations";
  return null;
}
/** "Presentation", "Instagram post", "Business card", "Flyer" … from a design size. */
function kindOf(P) {
  if (P.group === "presentation") return "Presentation";
  return String(P.label || "Design").replace(/\s*\(.*\)\s*/, "").replace(/\s+(A\d|Letter|16:9|4:3|document)$/i, "").replace(/^Tri-fold brochure$/, "Brochure").trim() || "Design";
}
const OWN_PANELS = ["elements", "text", "brand", "uploads", "tools", "translate", "notes", ...UI.SUBPANELS];
const PANEL_LABELS = { elements: "Elements", text: "Text", brand: "Brand", uploads: "Uploads", tools: "Tools", translate: "Translate", notes: "Notes", resize: "Resize", animate: "Animate", translate2: "Translate", mockup: "Mockups", collage: "Photo collage", background: "Background", layers: "Layers", magic: "Magic tools", draw: "Draw", styles: "Styles", layouts: "Layouts", deckgen: "Magic deck", guides: "Rulers and guides", print: "Print", qr: "QR code and barcode", caption: "Caption and hashtags" };
async function quickExport(fmt) {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  const base = fileBase(S.design), P = S.design.preset, print = isPrint(P), many = S.design.pages.length > 1;
  if (fmt === "png" || fmt === "jpg" || fmt === "webp") { const r = await exportRaster(S.design, S.page, { scale: print ? null : 1, dpi: print ? P.dpi : null, type: fmt }); download(r.blob, `${base}${many ? "-" + (S.page + 1) : ""}.${fmt}`); }
  else if (fmt === "pdf") { const bytes = await pdfExport(S.design, { dpi: P.dpi }); download(new Blob([bytes], { type: "application/pdf" }), base + ".pdf"); }
  else if (fmt === "svg") download(new Blob([await svgExport(S.design, S.page)], { type: "image/svg+xml" }), `${base}${many ? "-" + (S.page + 1) : ""}.svg`);
  else if (fmt === "gif" || fmt === "webm" || fmt === "mp4") { toast(fmt === "gif" ? "Making your GIF…" : "Recording your video…"); await animateExport({ format: fmt }); }
  else if (fmt === "pptx") { toast("Making your PowerPoint…"); download(await X.exportPptx(S.design, { onStatus: (m) => toast(m, 1500) }), base + ".pptx"); }
  else if (fmt === "zip") { toast("Saving every page…"); download(await X.pagesZip(S.design, { base, type: "png", dpi: print ? P.dpi : null }), base + "-pages.zip"); }
  else if (fmt === "png-clear") { const r = await exportRaster(S.design, S.page, { scale: print ? null : 1, dpi: print ? P.dpi : null, type: "png", transparent: true }); download(r.blob, `${base}${many ? "-" + (S.page + 1) : ""}-transparent.png`); }
  else download(exportJson(S.design), base + ".asaandesk.json");
  toast("Download ready: " + ({ json: "design file", zip: "all pages (ZIP)", "png-clear": "PNG with no background" }[fmt] || fmt.toUpperCase()));
}
const DOWNLOADS = [["png", "PNG image"], ["jpg", "JPG image"], ["webp", "WebP image"], ["pdf", "PDF document"], ["pptx", "PowerPoint (.pptx)"], ["zip", "All pages as PNG (ZIP)"], ["png-clear", "PNG with no background"], ["svg", "SVG (vector)"], ["gif", "GIF animation"], ["webm", "WebM video"], ["mp4", "MP4 video"], ["json", "Design file"]];
async function makeCopy() {
  if (!S.design) return;
  await saveNow();
  const d = clone(S.design); d.name = (d.name || "Design") + " (copy)";
  d.pages = d.pages.map((p) => ({ ...p, id: newId("p"), layers: p.layers.map(withNewIds) }));
  await openDesign(d);
  toast("Copy made. The original is saved in Projects.");
}
let fileInput = null;
function openFilePicker() {
  if (!fileInput) {
    fileInput = h("input", { type: "file", accept: ".json,.asaandesk.json,application/json", hidden: true, id: "openDesignFileShell" });
    fileInput.addEventListener("change", async () => { const f = fileInput.files[0]; if (!f) return; try { await openDesign(parseDesignFile(await f.text()), { name: null }); } catch (e) { toast(e.message); } fileInput.value = ""; });
    document.body.append(fileInput);
  }
  fileInput.click();
}
const pageThumb = (i, width = 240) => pageSvg(S.design, i, presetPx(S.design.preset), { width, idp: "gv" + i + "-", urlOf: E.urlOf, chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims });
function mountFrame() {
  if (shell || !shellMod?.mountShell || !S.design) return;
  shellTool ||= Gallery.toolForPreset(S.design.preset.id);
  const byPreset = ["social-media-designs", "print-designs", "mockups", "magic-resize", "magic-animate", "translate-design"].includes(shellTool);
  const kind = byPreset ? kindOf(S.design.preset) : Gallery.STUDIO_TOOLS[shellTool]?.kind || kindOf(S.design.preset);
  const info = Gallery.STUDIO_TOOLS[shellTool] || {};
  const ctx = createCtxBar({ props: (sec) => UI.openProps(sec === "all" ? null : sec), panel: (name) => UI.openPanel(name) });
  const own = (id) => ({ render: (el) => UI.renderInto(id, el), label: PANEL_LABELS[id], refresh: true });
  const panels = {};
  for (const id of OWN_PANELS) panels[id] = own(id);
  shell = shellMod.mountShell({
    app: "studio", kind, timerKeys: true, title: /^Untitled/.test(S.design.name) ? "" : S.design.name, home: "/tools/" + shellTool,
    onTitle: (t) => { if (!S.design) return; S.design.name = t || "Untitled design"; $("#nameInput").value = S.design.name; commit("name"); },
    stage: $("#editorView"), toolbar: ctx,
    resize: { label: "Resize", open: () => UI.openPanel("resize") },
    file: [
      { label: "Create new design", act: () => showStart() },
      { label: "Add a new page", act: () => E.addPage() },
      { label: "Add pages from another design", act: () => P3.importPagesDialog() },
      { label: "Make a copy", act: makeCopy },
      { label: "Open a design file", act: openFilePicker },
      { label: "Undo", group: "Edit", act: () => emit("undo") },
      { label: "Redo", group: "Edit", act: () => emit("redo") },
      { label: "Resize to other sizes", group: "Edit", act: () => UI.openPanel("resize") },
      { label: "Present", group: "View", act: () => startPresent() },
      { label: "Presenter view", group: "View", act: () => startPresent(S.page, { presenter: true }) },
      { label: "Autoplay", group: "View", act: () => startPresent(S.page, { autoplay: true }) },
      { label: "Present and record", group: "View", act: () => startPresent(S.page, { record: true }) },
      { label: "Download slideshow video (WebM)", group: "Download", act: () => { toast("Playing every page once while recording; the video downloads at the end."); startPresent(0, { autoplay: true, record: true, noMic: true }); } },
      { label: "Rulers and guides", group: "View", act: () => UI.openPanel("guides") },
      { label: "Expand to whiteboard", group: "View", act: () => expandToWhiteboard() },
      { label: "Show all pages", group: "View", act: () => shell.slots.bottom.querySelector('[data-ads="grid"]')?.click() },
      ...DOWNLOADS.map(([f, label]) => ({ label: "Download " + label, group: "Download", act: () => quickExport(f) })),
      { label: "More download options…", group: "Download", act: () => openExport() },
    ],
    share: { download: [...DOWNLOADS.map(([f, label]) => ({ label, act: () => quickExport(f) })), { label: "Present full screen", act: () => startPresent() }], link: () => location.href },
    templates: { gallery: Gallery, tool: shellTool, apply: (id) => applyTemplateFromPanel(id), placeholder: `Search ${info.kind || kind} templates` },
    panels,
    rail: ["templates", "elements", "text", "brand", "uploads", "tools", "projects", "apps", "translate"],
    getText: () => { const out = []; for (const pg of S.design?.pages || []) for (const l of pg.layers) if (l.type === "text") out.push(l.text.content); return out.join("\n"); },
    insert: { text: (str) => emit("paste-text", String(str || "")), color: (c) => UI.applyColor(c), font: (f) => E.updateSel((l) => { if (l.type === "text") l.text.family = f; }, "font") },
    projects: { save: async () => { await saveNow(); return { name: S.design.name, data: clone(S.design), thumb: thumbUrl || "" }; }, open: async (rec) => { await openProject(rec.id); } },
    bottom: {
      notes: true, timer: true, fullscreen: true, help: true,
      zoom: { get: () => Math.round(S.zoom * 100), set: (v) => E.setZoom(v / 100), min: 5, max: 400 },
      pages: { count: () => S.design?.pages.length || 1, current: () => S.page, go: (i) => E.goPage(i), add: () => E.addPage(), thumb: (i) => pageThumb(i), name: (i) => S.design?.pages[i]?.title || "", duplicate: (i) => { E.goPage(i); E.dupPage(); }, remove: (i) => { if (S.design.pages.length < 2) return; E.goPage(i); E.deletePage(); }, move: (from, to) => E.movePage(from, to) },
    },
    setMode: (m) => { document.body.dataset.mode = m; if (m !== "edit") { if (S.editing) E.endEdit(); E.select([]); } },
    onPanel: (id) => { if (!id || !OWN_PANELS.includes(id)) UI.panelClosed(); },
    designId: S.projectId, projectId: S.projectId,
    // Comment mode: a click on an item comments on that item (Canva: comments on elements and pages).
    comment: { pick: (pt, under) => { const el = under?.closest?.(".st-layer"), l = el ? layerById(el.dataset.id) : null; return l ? { id: l.id, label: `Page ${S.page + 1}: ${l.name || l.type}` } : { id: curPage().id, label: `Page ${S.page + 1}` }; } },
    initialPanel: params.get("panel") || "templates",
  });
  shell.el.classList.add("st-shell");
  UI.setHost({ open: (n) => shell.openPanel(n), close: () => shell.closePanel() });
  // Top bar extras next to Share: undo/redo after the save state, Present and Download before Share.
  const top = shell.slots.top, shareB = top.querySelector('[data-ads="share"]');
  const saveEl = top.querySelector(".ads-save");
  for (const id of ["undoBtn", "redoBtn"]) { const b = $("#" + id); b.className = "ads-tb ads-sq ads-desk st-undo"; saveEl?.before(b); }
  const pb = $("#presentBtn"); pb.className = "ads-tb st-present-btn"; pb.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span class="ads-l">Present</span>`;
  const db = $("#downloadBtn"); db.className = "ads-tb ads-sq ads-desk"; db.title = "Download"; db.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>`;
  top.insertBefore(db, shareB); top.insertBefore(pb, shareB);
  const pmb = h("button.ads-tb.ads-sq.st-present-more", { type: "button", id: "presentMenuBtn", title: "More ways to present", "aria-label": "More ways to present", "aria-haspopup": "menu", html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`, on: { click: (e) => togglePresentMenu(e.currentTarget) } });
  top.insertBefore(pmb, shareB);
  UI.restoreProps();
  window.adShell = shell;
}
async function applyTemplateFromPanel(id) {
  const ref = Gallery.resolveTemplate(id);
  if (curPageEmpty()) await openTemplate(id, ref.mode, S.projectId);
  else { await openTemplate(id, ref.mode); toast("Template opened as a new design. Your other design is saved."); }
}
/** Present mode extras: speaker notes and the elapsed time. */
function enhancePresent(root) {
  if (!root) return;
  const bar = root.querySelector(".st-present-bar");
  if (!bar) return;
  const t0 = Date.now();
  const clock = h("span.st-ptimer", { "aria-label": "Time presenting", text: "0:00" });
  const notesBtn = h("button.pbtn.st-pnotes-btn", { type: "button", "aria-label": "Speaker notes", title: "Speaker notes", text: "Notes" });
  const box = h("div.st-pnotes", { hidden: true, role: "note" });
  const count = root.querySelector(".pcount");
  const cur = () => Math.max(0, (parseInt(count?.textContent || "1", 10) || 1) - 1);
  const fill = () => { box.textContent = S.design?.pages[cur()]?.notes || "No notes for this page."; };
  notesBtn.addEventListener("click", (e) => { e.stopPropagation(); box.hidden = !box.hidden; fill(); });
  bar.append(clock, notesBtn);
  root.append(box);
  if (count) new MutationObserver(fill).observe(count, { childList: true, characterData: true, subtree: true });
  const iv = setInterval(() => { if (!root.isConnected) { clearInterval(iv); return; } const s = Math.floor((Date.now() - t0) / 1000); clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 500);
}

/* ---------------- test hooks ---------------- */
function hooks() {
  const ensure = () => { if (!S.design) throw new Error("No design is open."); };
  window.adApp = {
    state: S,
    doc: () => clone(S.design),
    load: (design, mode) => openDesign(design, { mode }),
    openPreset: (id, mode) => startPreset(id, mode),
    openTemplate: (id, mode) => openTemplate(id, mode),
    openProject: (id) => openProject(id),
    home: () => showStart(),
    select: (id) => E.select(id),
    selected: () => selLayers().map(clone),
    layer: (id) => clone(layerById(id)),
    layers: () => clone(curPage().layers),
    page: () => S.page,
    goPage: (i) => E.goPage(i),
    undo: () => emit("undo"),
    redo: () => emit("redo"),
    canUndo: () => !!S.history?.canUndo,
    addText: (content, o = {}) => { const l = textLayer(content, { w: pageSize().w * 0.6, size: 64, ...o }); l.h = textHeight(l.text, l.w); return E.addLayer(l).id; },
    addShape: (kind = "rect", o = {}) => E.addLayer(shapeLayer(kind, { w: 200, h: 200, ...o })).id,
    addSticker: async (id, o = {}) => { const { ELEMENTS } = await import("/pdf-editor/elements.js"); const el = ELEMENTS.find((x) => x.id === id); return E.addLayer(elementLayer(el, { w: 200, ...o })).id; },
    /** Screen box (client px) of a layer, for real mouse actions in tests. */
    box: (id) => { const l = layerById(id); return l ? E.clientBox(l) : null; },
    handle: (name) => { const el = document.querySelector(`.st-selbox [data-handle="${name}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    toScreen: (x, y) => { const r = E.getViewport().getBoundingClientRect(); const [sx, sy] = E.toScreen(x, y); return { x: r.left + sx, y: r.top + sy }; },
    async exportPng(page = S.page, opts = {}) { ensure(); return (await exportRaster(S.design, page, { scale: 1, ...opts, type: opts.type || "png" })).blob; },
    async exportPdf(opts = {}) { ensure(); return pdfExport(S.design, { dpi: S.design.preset.dpi, ...opts }); },
    async exportSvg(page = S.page) { ensure(); return svgExport(S.design, page); },
    exportJson: () => exportJson(S.design),
    resizeTo: (ids) => resizeTo(Array.isArray(ids) ? ids : [ids]),
    animate: (opts = {}) => animateExport({ format: opts.format || "webm", ...opts }).then((r) => r.blob),
    autoAnimate: () => { const m = autoAnimate(curPage(), pageSize()); for (const l of curPage().layers) l.animation = m.get(l.id) || null; commit("animate"); return [...m.values()]; },
    mockupPng: (product, color, view) => mockupPng({ product, color, view }),
    applyBrand: (brand = loadBrand()) => { const r = applyBrand(S.design, brand); E.renderAll(); commit("brand"); return r; },
    translate: (target, all = false) => UI.translateDesign(target, all),
    present: (i, opts) => startPresent(i ?? S.page, opts || {}),
    presenting: () => presenting(),
    closePresent: () => closePresent(),
    openPanel: (name, o) => UI.openPanel(name, o),
    openProps: (sec) => UI.openProps(sec),
    expandToWhiteboard: () => expandToWhiteboard(),
    shell: () => shell,
    tool: () => shellTool,
    save: () => saveNow(),
    projects: () => listProjects("studio"),
    ready: null,
  };
}

/* ---------------- boot ---------------- */
async function boot() {
  hooks();
  shellTool = detectTool();
  shellMod = await import("../shared/editor-shell.js").catch((e) => { console.warn("Editor frame not available", e); return null; });
  E.initStage(document);
  UI.initPanels();
  initBar();
  const dlg = $("#exportDlg");
  dlg.querySelector("form").addEventListener("change", syncExport);
  dlg.querySelector("form").addEventListener("submit", runExport);
  dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
  const mode = MODES.includes(params.get("mode")) ? params.get("mode") : null;
  const group = params.get("group");
  try {
    if (params.get("project")) { if (await openProject(params.get("project"), mode)) return; }
    else if (CREATE_LINK.test(location.search) && ["reload", "back_forward"].includes(performance.getEntriesByType?.("navigation")?.[0]?.type)) {
      // Reload (or Back/Forward) of a create link in the same tab: reopen the design it made instead of starting
      // another one. A fresh click on "Create" still starts a new design.
      const id = urlProject(), rec = id ? await getProject(id).catch(() => null) : null;
      if (rec) { await openDesign(rec.data, { projectId: rec.id, mode }); return; }
    }
    if (params.get("handoff")) {
      const payload = await takeHandoff(params.get("handoff"));
      const d = payload?.design || (payload?.pages ? payload : null);
      if (d) { await openDesign(d, { mode, name: payload?.name || d.name }); return; }
      toast("That design link has already been used or has expired.");
    }
    if (params.get("template")) { if (await openTemplate(params.get("template"), mode)) return; }
    // A tool's "Create new" button and ?new=1: a blank design in the tool's size (Presentations: 16:9 slides).
    const tool = Gallery.STUDIO_TOOLS[params.get("tool")] ? params.get("tool") : null;
    if (!params.get("preset") && (params.get("new") || tool || group === "social" || group === "print")) {
      const t = Gallery.STUDIO_TOOLS[tool || (group === "social" ? "social-media-designs" : group === "print" ? "print-designs" : "presentations")];
      await startPreset(t.preset, mode || t.mode || null); return;
    }
    if (params.get("preset")) { if (getPreset(params.get("preset"))) { await startPreset(params.get("preset"), mode); return; } toast("Unknown size: " + params.get("preset")); }
    if (mode === "collage") { await openDesign(newCollage(), { mode: "collage" }); return; }
    if (mode === "logo") { await startPreset("logo", "logo"); return; }
    if (mode === "mockup") { await startPreset("tshirt", "mockup"); return; }
    if (mode) {
      // Resize, animate, translate and present need a design: use the latest one, or let the user pick.
      const recent = (await listProjects("studio").catch(() => []))[0];
      if (recent) { await openProject(recent.id, mode); return; }
      // Nothing made yet on this device: start from one of our sample designs, with the tool open.
      if (await openTemplate(mode === "present" ? "deck-startup-pitch" : "sale-post", mode)) return;
      S.pendingMode = mode;
    }
    await showStart(PRESET_GROUPS.some((g) => g.id === group) ? group : null);
  } catch (e) {
    console.error(e);
    toast(e.message || "Something went wrong while opening.");
    await showStart();
  }
}
window.adApp = window.adApp || {};
const ready = boot();
ready.then(() => { window.adApp.ready = true; document.body.dataset.ready = "1"; const m = document.getElementById("bootMsg"); if (m) m.hidden = true; });
