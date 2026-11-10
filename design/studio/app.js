// AsaanDesk Studio: app shell. URL parameters, start screen, opening/saving designs (IndexedDB autosave),
// the export dialog, Magic Resize / Animate / Mockup actions and the window.adApp test hooks.
import { S, on, emit, commit, resetHistory, curPage, pageSize, layerById, selLayers, toast, h } from "./state.js";
import * as E from "./editor.js";
import * as UI from "./panels.js";
import { PRESETS, PRESET_GROUPS, getPreset, presetPx, sizeLabel, isPrint, customPreset, exportPixels } from "./presets.js";
import { newDesign, normalizeDesign, designProblems, withNewIds, clone, textLayer, shapeLayer, elementLayer, newId } from "./model.js";
import { listTemplates, getTemplate } from "./templates.js";
import { magicResize } from "./resize.js";
import { applyCollage } from "./collage.js";
import { autoAnimate } from "./animate.js";
import { applyBrand } from "./brandkit.js";
import { textHeight } from "./textlayout.js";
import { saveProject, listProjects, getProject, deleteProject, takeHandoff } from "../shared/store.js";
import { loadBrand } from "../shared/brand.js";
import { exportRaster, exportPdf as pdfExport, exportSvg as svgExport, exportJson, parseDesignFile, download, fileBase, needsVector } from "./exporter.js";
import { renderPage as renderCanvas, canvasBlob } from "./canvas.js";
import { renderMockup, productFor } from "./mockup.js";
import { recordWebm, renderGif } from "./motion.js";
import { present, close as closePresent, presenting, onPresentClose } from "./present.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const MODES = ["collage", "mockup", "present", "resize", "animate", "logo", "translate"];

/* ---------------- open / save ---------------- */
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
function setSaved(t) { const el = $("#saveState"); if (el) el.textContent = t; }

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
  history.replaceState(null, "", location.pathname + "?project=" + encodeURIComponent(S.projectId));
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
  const t = getTemplate(id);
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
  $("#editorView").hidden = true;
  $("#startView").hidden = false;
  document.body.classList.remove("editing");
  document.body.classList.add("start");
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
  name.addEventListener("input", () => { if (S.design) { S.design.name = name.value.slice(0, 80) || "Untitled design"; commit("name"); } });
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
  on("paste-text", (text) => { const { w, h: H } = pageSize(); const l = textLayer(text.slice(0, 2000), { w: w * 0.6, size: Math.round(Math.min(w, H) * 0.04) }); l.h = textHeight(l.text, l.w); E.addLayer(l); });
  on("resize", async (ids, res, rej) => { try { res(await resizeTo(ids)); } catch (e) { rej(e); } });
  on("animate-export", async (opts, res, rej) => { try { const r = await animateExport(opts); res(r); } catch (e) { rej(e); } });
  on("mockup-download", async (m) => { try { const b = await mockupPng(m); download(b, `${fileBase(S.design)}-${m.product}-mockup.png`); toast("Mockup saved."); } catch (e) { toast(e.message); } });
  const bar = $("#pagebar");
  bar.querySelector("[data-act=add]").addEventListener("click", () => E.addPage());
  bar.querySelector("[data-act=dup]").addEventListener("click", () => E.dupPage());
  bar.querySelector("[data-act=del]").addEventListener("click", () => { if (confirm("Delete this page?")) E.deletePage(); });
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
  E.renderAll();
  UI.renderPagebar();
  emit("history");
  emit("layers");
  setSaved("Saving…");
  scheduleSave();
}

/* ---------------- present ---------------- */
async function startPresent(from = S.page) {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  await present(S.design, from, S.env);
  onPresentClose(() => { E.fit(); });
}

/* ---------------- export dialog ---------------- */
function openExport() {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  const dlg = $("#exportDlg");
  const P = S.design.preset, print = isPrint(P);
  const f = dlg.querySelector("form");
  f.querySelector("[name=scale] option[value=print]").textContent = print ? `Print quality (${P.dpi} dpi)` : "Same as 1×";
  f.querySelector("[name=bleed]").closest("label").hidden = !P.bleed;
  f.querySelector("[name=marks]").closest("label").hidden = !print;
  f.querySelector("[name=scale]").value = print ? "print" : "1";
  f.querySelector("[name=bleed]").checked = false;
  f.querySelector("[name=marks]").checked = false;
  f.querySelector("[name=format]").value = print ? "pdf" : "png";
  f.querySelector("[name=pages]").value = "all";
  dlg.querySelector(".st-dlgstatus").textContent = "";
  syncExport();
  dlg.showModal();
}
const field = (f, n) => f.querySelector(`[name=${n}]`);
function syncExport() {
  const f = $("#exportDlg form"), fmt = field(f, "format").value;
  const P = S.design.preset;
  f.querySelector(".st-scale").hidden = !["png", "jpg"].includes(fmt);
  f.querySelector("[name=marks]").closest("label").hidden = fmt !== "pdf" || !isPrint(P);
  f.querySelector("[name=bleed]").closest("label").hidden = !P.bleed || !["png", "jpg", "pdf"].includes(fmt);
  f.querySelector(".st-pages").hidden = fmt === "json" || S.design.pages.length < 2 || fmt === "svg";
  const sc = field(f, "scale").value, px = exportPixels(P, { scale: sc === "print" ? null : +sc, dpi: sc === "print" ? P.dpi : null, bleed: field(f, "bleed").checked });
  f.querySelector(".st-pxinfo").textContent = ["png", "jpg"].includes(fmt) ? `${px.w} × ${px.h} px` : fmt === "pdf" ? "Vector PDF: sharp text you can select, at any size." : fmt === "svg" ? "Current page as SVG." : "Open it again later with “Open a design file”.";
}
async function runExport(e) {
  e.preventDefault();
  const dlg = $("#exportDlg"), f = dlg.querySelector("form"), status = dlg.querySelector(".st-dlgstatus");
  const fmt = field(f, "format").value, base = fileBase(S.design);
  const pages = field(f, "pages").value === "current" ? [S.page] : S.design.pages.map((_, i) => i);
  const sc = field(f, "scale").value, P = S.design.preset, bleed = field(f, "bleed").checked, marks = field(f, "marks").checked;
  status.textContent = "Working…";
  const go = dlg.querySelector("#exportGo");
  go.disabled = true;
  try {
    if (fmt === "png" || fmt === "jpg") {
      for (const i of pages) {
        const r = await exportRaster(S.design, i, { scale: sc === "print" ? null : +sc, dpi: sc === "print" ? P.dpi : null, bleed, type: fmt });
        download(r.blob, `${base}${pages.length > 1 ? "-" + (i + 1) : ""}.${fmt}`);
      }
    } else if (fmt === "pdf") {
      const bytes = await pdfExport(S.design, { pages, bleed, marks, dpi: P.dpi });
      download(new Blob([bytes], { type: "application/pdf" }), base + ".pdf");
    } else if (fmt === "svg") {
      download(new Blob([await svgExport(S.design, S.page)], { type: "image/svg+xml" }), `${base}${S.design.pages.length > 1 ? "-" + (S.page + 1) : ""}.svg`);
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
async function animateExport({ format = "webm", page = S.page, fps, maxSide, onProgress } = {}) {
  if (!S.design.pages[page].layers.some((l) => l.animation)) {
    const m = autoAnimate(S.design.pages[page], pageSize());
    for (const l of S.design.pages[page].layers) l.animation = m.get(l.id) || null;
    commit("animate");
    toast("Added Auto animate first.");
  }
  if (format === "gif") {
    const r = await renderGif(S.design, page, { fps: fps || 12, maxSide: maxSide || 480, onProgress, env: S.env });
    download(r.blob, fileBase(S.design) + ".gif");
    return r;
  }
  const r = await recordWebm(S.design, page, { fps: fps || 30, maxSide: maxSide || 1080, onProgress, env: S.env });
  download(r.blob, fileBase(S.design) + ".webm");
  return r;
}
async function mockupPng({ product = productFor(S.design.preset) || "tshirt", color = "#ffffff", view = "front", size = 1200 } = {}) {
  const c = await renderMockup(S.design, S.page, { product, color, view, size, chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims });
  return canvasBlob(c, "image/png");
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
    present: (i) => startPresent(i ?? S.page),
    presenting: () => presenting(),
    closePresent: () => closePresent(),
    openPanel: (name, o) => UI.openPanel(name, o),
    save: () => saveNow(),
    projects: () => listProjects("studio"),
    ready: null,
  };
}

/* ---------------- boot ---------------- */
async function boot() {
  hooks();
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
    if (params.get("handoff")) {
      const payload = await takeHandoff(params.get("handoff"));
      const d = payload?.design || (payload?.pages ? payload : null);
      if (d) { await openDesign(d, { mode, name: payload?.name || d.name }); return; }
      toast("That design link has already been used or expired.");
    }
    if (params.get("template")) { if (await openTemplate(params.get("template"), mode)) return; }
    if (params.get("preset")) { if (getPreset(params.get("preset"))) { await startPreset(params.get("preset"), mode); return; } toast("Unknown size: " + params.get("preset")); }
    if (mode === "collage") { await openDesign(newCollage(), { mode: "collage" }); return; }
    if (mode === "logo") { await startPreset("logo", "logo"); return; }
    if (mode === "mockup") { await startPreset("tshirt", "mockup"); return; }
    if (mode) {
      // Resize, animate, translate and present need a design: use the latest one, or let the user pick.
      const recent = (await listProjects("studio").catch(() => []))[0];
      if (recent) { await openProject(recent.id, mode); return; }
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
ready.then(() => { window.adApp.ready = true; document.body.dataset.ready = "1"; });
