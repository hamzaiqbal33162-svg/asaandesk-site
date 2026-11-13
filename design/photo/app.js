// AsaanDesk photo editor: crop, adjust, filters, text/stickers/shapes, frames, background remover,
// magic eraser, image enhancer, passport sheet and export. Everything runs in this browser; only the
// optional "describe an edit" AI sends the photo online, and only when AsaanDesk AI is switched on.
//
// Modes: /design/photo/ (full editor), ?mode=bg (background remover flow), ?mode=enhance (image
// enhancer), ?mode=ai (AI photo editor). Edits are non-destructive: the state (doc.js) lists them and
// is re-applied to the pixels on every render; undo/redo swaps whole states.
import { ADJUSTMENTS, NEUTRAL, FILTERS, CROP_PRESETS, FULL_CROP, EXPORT_SIZES, isNeutral, renderPixels, applyFilter, geometryMatrix,
  orientedSize, aspectCrop, dragCrop, rotateCrop, flipCrop, exportDims, passportSheet, coverRect, hasColorFx, blendByMask, regionGrow,
  autoAdjust, smartCrop, alphaBox, DUOTONES, hasPixelFx, photoPalette, focusDepth, focusWeights, mixByWeights, expandPad, applyEraseMask } from "./adjust.js";
import { DEFAULTS as ENHANCE_DEFAULTS, enhance as enhanceInline, safeScale, unsharp, pickScale } from "./enhance.js";
import { History, newState, cloneState, newOverlay, overlayBox, pickOverlay, framePad, FRAMES, SHAPES, TEXT_STYLES, uid, ensureFx,
  styleOf, pasteStyle, SHADOWS, shadowById, statePixelIds, SHAPE_FRAMES } from "./doc.js";
import { makeCanvas, getData, fromData, scaleDown, resizeTo, toBlob, decodeFile, composeBackground, drawOverlay, prepareOverlays,
  applyFrame, elementsLib, stickerImage, PIXEL_LIMIT, keystone, blurredCopy, setOverlayImages, checker, measureText } from "./draw.js";
import { pdfFromJpeg, zipFiles } from "./pdf.js";
import { FONT_FAMILIES, loadBrand } from "../shared/brand.js";
import { saveProject, listProjects, getProject, deleteProject, putHandoff, takeHandoff } from "../shared/store.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import * as GALLERY from "./gallery.js";

const $ = (s, el = document) => el.querySelector(s);
// the tool settings box; it moves between the frame's side panels (which may take it out of the page for a moment)
let PANEL_EL = null;
const panelEl = () => (PANEL_EL ||= document.getElementById("panel"));
const params = new URLSearchParams(location.search);
const MODES = { full: "Photo editor", bg: "Background remover", enhance: "Image enhancer", ai: "AI photo editor" };
let mode = MODES[params.get("mode")] ? params.get("mode") : "full";
const phone = () => matchMedia("(max-width: 760px)").matches;
const PREV_MAX = Math.min(1800, Math.max(900, Math.round(Math.max(screen.width, screen.height) * Math.min(2, devicePixelRatio || 1))));

/* ---------- state ---------- */
const pix = new Map(); // id -> { full: canvas, prev: canvas|null, blob: Blob|null }
let st = null; // the working edit state (doc.js newState); history keeps snapshots
const hist = new History(60);
let projectId = null, fileName = "photo";
let tool = mode === "full" ? "adjust" : mode;
let selId = null;
let busy = false;
let lastExport = null;
let tplPhoto = null; // id of the library / sample photo a template opened (null: the user's own photo)
const ui = { split: false, splitAt: 0.5, before: false, brush: 36, brushDirty: false, exportFmt: "jpg", exportQ: 90, exportSize: "original", customW: 1200,
  enhance: { ...ENHANCE_DEFAULTS }, stickerCat: "all", stickerQuery: "", lastEnhance: null, aiPrompt: "", zoom: 100, addFocus: "elements",
  brushFor: null, clickTol: 30, editTab: "adjust" };
let shell = null, framePanel = null; // the shared editor frame (../shared/editor-shell.js) and its open side panel
const kitOwn = {}; // the photo editor's own section inside the kit's Elements / Text panels (shared/panels/)
let framing = false; // true from the moment the frame starts (it opens the first panel before mountShell returns)

const putPix = (id, canvas, blob = null) => { pix.set(id, { full: canvas, prev: null, blob }); return id; };
function getPix(id, res = "prev") {
  const p = pix.get(id);
  if (!p) return null;
  if (res === "full") return p.full;
  return (p.prev ||= scaleDown(p.full, PREV_MAX));
}
const newPix = (canvas) => putPix("p" + uid(), canvas);
function gcPix() {
  const keep = hist.pixelIds();
  for (const k of [...(st ? statePixelIds(st) : []), "orig"]) keep.add(k);
  for (const id of [...pix.keys()]) if (!keep.has(id)) pix.delete(id);
}
// grabbed objects (Magic Grab) are "image" overlays whose pictures are kept here like the photo
setOverlayImages((id, longSide) => (pix.has(id) ? getPix(id, longSide > PREV_MAX * 0.9 ? "full" : "prev") : null));

/* ---------- small UI helpers ---------- */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
let toastTimer = null;
function toast(msg, ms = 3200) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}
function showBusy(msg, pct = null, { quiet = false } = {}) {
  busy = true;
  $("#busy").hidden = false;
  $("#busy").classList.toggle("quiet", !!quiet);
  setBusy(msg, pct);
}
function setBusy(msg, pct = null) {
  if (msg) $("#busyText").textContent = msg;
  const bar = $("#busyBar");
  bar.parentElement.hidden = pct == null;
  if (pct != null) bar.style.width = Math.round(Math.max(0, Math.min(1, pct)) * 100) + "%";
}
function hideBusy() { busy = false; $("#busy").hidden = true; $("#busy").classList.remove("quiet"); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const progressToBusy = (p) => setBusy(p.message || p.step, p.total ? p.loaded / p.total : p.done ?? null);
const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
// Download names keep to plain letters, digits, dot, dash and underscore (template titles have "·" and spaces, which
// browsers may refuse, falling back to a nameless "download").
const safeName = (name) => {
  const m = /^(.*?)(\.[a-z0-9]+)?$/i.exec(String(name || "photo"));
  const base = m[1].normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-{2,}/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80) || "photo";
  return base + (m[2] || "");
};
function download(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: safeName(name) });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

const ICONS = {
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
  adjust: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  filters: '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>',
  add: '<path d="M4 7V4h12v3M10 4v15M7 19h6M19 12v8M15 16h8"/>',
  bg: '<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5"/>',
  erase: '<path d="M15 4l5 5-9 9H7l-3-3zM9 9l6 6M13 20h7"/>',
  enhance: '<path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7-4.7-1.8 4.7-1.8zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  ai: '<path d="M4 20L15 9M13 5v3M17 7h3M18 3v2M9 4h2M14 8l2 2"/>',
  export: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>',
  open: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>',
  edit: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M3 15l4-4 3 3 2-2"/><path d="M14.5 13.5 20 8l1.5 1.5L16 15h-1.5z"/>',
  effects: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
  opacity: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/><path d="M4 4h8v8H4zM12 12h8v8h-8z" fill="currentColor" opacity=".35"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  flip: '<path d="M12 3v18"/><path d="M8.5 7 3 17h5.5zM15.5 7 21 17h-5.5z"/>',
  retouch: '<circle cx="12" cy="10" r="6"/><path d="M9.5 9h.01M14.5 9h.01M9.5 12.5c1.4 1 3.6 1 5 0"/><path d="M17.5 17.5 21 21M15 19l2-2"/>',
  blur: '<circle cx="12" cy="12" r="8" stroke-dasharray="2.5 2.5"/><circle cx="12" cy="12" r="4"/>',
  focus: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="12" r="3.5"/>',
  pixel: '<path d="M5 19h14M7 15l8-8 3 3-8 8H7z"/><path d="M4 4h2v2H4zM8 4h2v2H8zM4 8h2v2H4z" fill="currentColor" stroke="none"/>',
  grab: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-.5A5.5 5.5 0 0 1 6 16.5L4.5 13a1.5 1.5 0 0 1 2.6-1.4L8 13"/>',
  expand: '<rect x="8" y="8" width="8" height="8" rx="1"/><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  style: '<rect x="4" y="3" width="14" height="6" rx="1.5"/><path d="M18 6h2v5h-8v3"/><rect x="10" y="14" width="4" height="7" rx="1"/>',
  colorize: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="15.5" r="3"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const TOOLS = [
  { id: "crop", label: "Crop" }, { id: "adjust", label: "Adjust" }, { id: "filters", label: "Filters" }, { id: "add", label: "Add" },
  { id: "bg", label: "Background" }, { id: "erase", label: "Eraser" }, { id: "enhance", label: "Enhance" }, { id: "ai", label: "AI edit" },
  { id: "export", label: "Export" },
];

/* ---------- history ---------- */
function commit() {
  hist.push(cloneState(st));
  gcPix();
  afterChange();
}
function afterChange({ panel = false } = {}) {
  $("#undoBtn").disabled = !hist.canUndo;
  $("#redoBtn").disabled = !hist.canRedo;
  if (panel) renderPanel();
  scheduleRender();
  scheduleSave();
}
function undo() {
  if (busy || !hist.canUndo) return;
  st = cloneState(hist.undo());
  if (selId && !st.overlays.some((o) => o.id === selId)) selId = null;
  afterChange({ panel: true });
}
function redo() {
  if (busy || !hist.canRedo) return;
  st = cloneState(hist.redo());
  if (selId && !st.overlays.some((o) => o.id === selId)) selId = null;
  afterChange({ panel: true });
}

/* ---------- opening ---------- */
async function openFile(file, opts = {}) {
  if (!file || busy) return;
  try {
    showBusy("Opening the photo…");
    const r = await decodeFile(file, (m) => setBusy(m));
    fileName = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    pix.clear();
    resetCaches(); // a new photo reuses the pixel id "orig", so the cached stages must go
    putPix("orig", r.canvas, r.blob);
    st = newState({ w: r.canvas.width, h: r.canvas.height });
    st.pixels = "orig";
    tplPhoto = opts.tplPhoto || null; // a template's (or sample) photo: picking another template swaps it for its own
    hist.reset(cloneState(st));
    projectId = null;
    selId = null;
    ui.split = false;
    ui.showOriginal = ui.before = false;
    ui.lastEnhance = null;
    ui.eraseFrom = null;
    ui.brushFor = null;
    clearBrush();
    showEditor();
    if (r.scaled) toast(`This photo is very big, so it is edited at ${r.canvas.width}×${r.canvas.height} px.`, 4500);
    hideBusy();
    await renderNow();
    scheduleSave();
    if (mode === "bg") { if (opts.pause) await sleep(opts.pause); await runRemoveBackground({ quiet: !!opts.quiet }); }
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "This photo could not be opened.");
  }
}
async function openProject(id) {
  const rec = await getProject(id).catch(() => null);
  if (!rec || rec.app !== "photo" || !rec.data?.state) return false;
  showBusy("Opening your saved photo…");
  try {
    pix.clear();
    resetCaches();
    for (const [pid, blob] of Object.entries(rec.data.blobs || {})) {
      const r = await decodeFile(blob, null, { maxSide: 8192 });
      putPix(pid, r.canvas, blob);
    }
    st = ensureFx(rec.data.state);
    tplPhoto = null;
    if (!pix.has(st.pixels)) throw new Error("This saved photo is incomplete.");
    fileName = rec.name || "photo";
    projectId = rec.id;
    hist.reset(cloneState(st));
    selId = null;
    showEditor();
    hideBusy();
    await renderNow();
    return true;
  } catch (e) {
    hideBusy();
    toast(e.message || "This saved photo could not be opened.");
    return false;
  }
}

/* ---------- screens ---------- */
function setModeUi() {
  document.body.dataset.mode = mode;
  $("#appName").textContent = MODES[mode];
  document.title = `${MODES[mode]} · AsaanDesk Design`;
  $("#fullLink").hidden = mode === "full";
}
function showEditor() {
  $("#start").hidden = true;
  $("#editor").hidden = false;
  $("#barActions").hidden = false;
  if (mode !== "full") tool = mode;
  renderTools();
  renderPanel();
  syncUrl();
  document.body.classList.add("has-photo");
  if (shell) {
    shell.setTitle(fileName);
    if (framePanel && FRAME_PANELS[framePanel]) shell.openPanel(framePanel);
  }
}
function syncUrl() {
  const q = new URLSearchParams();
  if (mode !== "full") q.set("mode", mode);
  if (projectId) q.set("project", projectId);
  const s = q.toString();
  history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
}
async function renderStart() {
  const hero = {
    full: ["Edit a photo", "Crop, fix the light and colours, add filters, text and stickers, remove the background or erase things. It all happens in your browser."],
    bg: ["Remove a photo background", "Upload a photo: the background goes in a few seconds. Keep it see-through, pick a colour, blur it or put in another picture."],
    enhance: ["Make a photo sharper and bigger", "Upscale 2× or 4×, clean up noise, sharpen and fix colours. Your photo never leaves this device."],
    ai: ["Describe an edit", "Tell AsaanDesk AI what to change in your photo."],
  }[mode];
  $("#heroTitle").textContent = hero[0];
  $("#heroText").textContent = hero[1];
  const soon = $("#startSoon");
  soon.hidden = !(mode === "ai" && !aiReady());
  $("#dropZone").hidden = mode === "ai" && !aiReady();
  if (!soon.hidden) aiComingSoon(soon);
  const box = $("#recent");
  box.innerHTML = "";
  if (mode !== "full") return;
  const list = await listProjects("photo").catch(() => []);
  if (!list.length) return;
  box.append(h("h2", {}, "Your recent photos"));
  const grid = h("div", { class: "recent-grid" });
  for (const p of list.slice(0, 12)) {
    const card = h("div", { class: "recent-card" },
      h("button", { class: "recent-open", "aria-label": `Open ${p.name}`, onclick: () => openProject(p.id) },
        p.thumb ? h("img", { src: p.thumb, alt: "" }) : h("span", { class: "noimg" }), h("span", { class: "rname" }, p.name), h("span", { class: "rdate" }, new Date(p.updated).toLocaleDateString())),
      h("button", { class: "recent-del", "aria-label": `Delete ${p.name}`, title: "Delete", onclick: async () => { await deleteProject(p.id); renderStart(); } }, "×"));
    grid.append(card);
  }
  box.append(grid);
}

function renderTools() {
  const nav = $("#tools");
  nav.innerHTML = "";
  for (const t of TOOLS) {
    nav.append(h("button", { class: "tool" + (t.id === tool ? " on" : ""), role: "tab", "aria-selected": String(t.id === tool), "data-tool": t.id, title: t.label, html: icon(t.id) + `<span>${t.label}</span>`,
      onclick: () => setTool(t.id) }));
  }
}
function setTool(t, opts) { return setToolFn(t, opts); }
function setToolFn(t, { fromFrame = false } = {}) {
  if (busy) return;
  if (shell && !fromFrame) { openToolPanel(t); return; }
  const was = tool;
  tool = t;
  if (was !== t) { ui.brushFor = null; clearBrush(); } // a selection made for one tool never carries over to another
  // tools that start with a brush in hand (Canva opens them ready to paint)
  if (was !== t && st) {
    if (t === "pixel") ui.brushFor = "pixel-erase";
    else if (t === "grab") ui.brushFor = "grab";
    else if (t === "blur" && (ui.blurTab || "brush") === "brush") ui.brushFor = "blur-add";
    if (t === "erase") { ui.eraseFrom = { pixels: st.pixels, cutout: st.cutout }; ui.eraseMode = "brush"; }
  }
  if (was === "crop" && t !== "crop") commitIfChanged();
  if (t !== "add") selId = null;
  renderTools();
  renderPanel();
  scheduleRender();
}
function commitIfChanged() {
  if (JSON.stringify(hist.current) !== JSON.stringify(st)) commit();
}

/* ---------- rendering ---------- */
const VIEW_MAX = () => Math.min(PREV_MAX, 1600);
const cache = { comp: { key: null, c: null }, geo: { key: null, c: null }, ops: { key: null, c: null }, before: { key: null, c: null }, erased: { key: null, c: null }, blur: { key: null, c: null } };
function resetCaches() { for (const k of Object.keys(cache)) cache[k] = { key: null, c: null }; }
const viewMode = () => (tool === "crop" ? "crop" : tool === "erase" || ui.brushFor ? "erase" : "normal");

// The subject over its chosen background (only after background removal), at "prev" or "full" size.
function composite(res) {
  const key = JSON.stringify([res, st.pixels, st.cutout, st.bg]);
  if (res === "prev" && cache.comp.key === key) return cache.comp.c;
  const bgImg = st.bg.mode === "image" && st.bg.imageId ? getPix(st.bg.imageId, res) : null;
  const c = composeBackground(getPix(st.pixels, res), getPix(st.cutout, res), st.bg, bgImg);
  if (res === "prev") cache.comp = { key, c };
  return c;
}
const plainSource = (res, before) => (!before && st.bg.removed && st.cutout && pix.has(st.cutout) ? composite(res) : getPix(before ? "orig" : st.pixels, res));
// The photo as edited before geometry: the cut-out over its new background, with the pixel eraser's see-through parts.
function sourceFor(res, before) {
  const base = plainSource(res, before), em = st.fx?.eraseMask;
  if (before || !em || !pix.has(em)) return base;
  const key = JSON.stringify([res, st.pixels, st.cutout, st.bg, em]);
  if (cache.erased.key === key) return cache.erased.c;
  let m = getPix(em, res);
  if (m.width !== base.width || m.height !== base.height) m = resizeTo(m, base.width, base.height);
  const c = fromData(applyEraseMask(getData(base), getData(m)));
  cache.erased = { key, c };
  return c;
}

// Geometry (turn, flip, straighten, crop) at a size whose long side is at most maxSide.
function geoStage(maxSide, withCrop, before = false) {
  const slot = before ? cache.before : cache.geo;
  const key = JSON.stringify([maxSide, withCrop, before, before ? "orig" : [st.pixels, st.cutout, st.bg, st.fx?.eraseMask], st.geom]);
  if (slot.key === key) return { c: slot.c, key, k: slot.k, geom: slot.geom };
  const src = sourceFor("prev", before);
  const geom = withCrop ? st.geom : { ...st.geom, crop: FULL_CROP };
  const g1 = geometryMatrix(src.width, src.height, geom, 1);
  const k = Math.min(1, maxSide / Math.max(g1.outW, g1.outH));
  const c = drawGeometry(src, geom, k);
  slot.key = key; slot.c = c; slot.k = k; slot.geom = geom;
  return { c, key, k, geom };
}
function drawGeometry(src, geom, k) {
  const g = geometryMatrix(src.width, src.height, geom, k);
  const c = makeCanvas(g.outW, g.outH), x = c.getContext("2d");
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.setTransform(...g.matrix);
  x.drawImage(src, 0, 0);
  return geom.persp && (geom.persp.h || geom.persp.v) ? keystone(c, geom.persp) : c;
}
const hasOps = (s) => !isNeutral(s.adjust) || (s.filter.id !== "none" && s.filter.intensity > 0) || hasPixelFx(s.fx);
// A mask kept in the photo's own pixels (cut-out, brushed area, blur mask), drawn through the same turn / crop as the photo at w×h.
function geoMask(m, res, k, w, h, geom = st.geom) {
  const src = sourceFor(res, false);
  if (m.width !== src.width || m.height !== src.height) m = resizeTo(m, src.width, src.height);
  let g = drawGeometry(m, geom, k);
  if (g.width !== w || g.height !== h) g = resizeTo(g, w, h);
  return getData(g);
}
// The alpha mask that limits the edits ("Apply to"), drawn through the same geometry as the photo at w×h, or null.
function areaMaskFor(res, k, w, h, geom = st.geom) {
  const fx = st.fx || {};
  if (!fx.area || fx.area === "all") return null;
  let m = null;
  if ((fx.area === "fg" || fx.area === "bg") && st.cutout && pix.has(st.cutout)) m = getPix(st.cutout, res);
  else if ((fx.area === "brush" || fx.area === "click") && fx.areaMask && pix.has(fx.areaMask)) m = getPix(fx.areaMask, res);
  if (!m) return null;
  return { mask: geoMask(m, res, k, w, h, geom), invert: fx.area === "bg" };
}
const blurOn = (fx) => !!(fx?.blur && fx.blur.amount > 0 && fx.blur.mask && pix.has(fx.blur.mask));
const focusOn = (fx) => !!(fx?.focus && fx.focus.blur > 0);
/**
 * Blur tool and Auto focus, after the colour edits: Auto focus keeps the chosen depth sharp (the subject by default,
 * slightly sharpened) and blurs the rest more the further it is from it; the Blur tool blurs the painted parts.
 */
function blurStage(c, res, k, geom = st.geom, key = null) {
  const fx = st.fx || {};
  if (!blurOn(fx) && !focusOn(fx)) return c;
  const ck = key && key + JSON.stringify([fx.blur, fx.focus, st.cutout]);
  if (ck && cache.blur.key === ck) return cache.blur.c;
  const W = c.width, H = c.height;
  let out = getData(c);
  if (focusOn(fx)) {
    // depth and weights on a small copy (they change slowly), then scaled up to the picture
    const s = Math.min(1, 480 / Math.max(W, H)), sw = Math.max(1, Math.round(W * s)), sh = Math.max(1, Math.round(H * s));
    const sub = st.cutout && pix.has(st.cutout) ? geoMask(getPix(st.cutout, res), res, k, sw, sh, geom).data : null;
    const wts = focusWeights(focusDepth(sub, sw, sh), fx.focus.pos ?? 0);
    const wm = makeCanvas(sw, sh), wd = wm.getContext("2d").createImageData(sw, sh);
    for (let i = 0; i < wts.length; i++) wd.data[i * 4 + 3] = Math.round(wts[i] * 255);
    wm.getContext("2d").putImageData(wd, 0, 0);
    const sharp = W * H <= 16e6 ? unsharp(out, { amount: 0.45, sigma: Math.max(0.8, Math.max(W, H) / 1500), faceSafe: true }) : out;
    out = mixByWeights(sharp, getData(blurredCopy(c, fx.focus.blur)), getData(resizeTo(wm, W, H)));
  }
  if (blurOn(fx)) {
    const cur = fromData(out);
    out = mixByWeights(out, getData(blurredCopy(cur, fx.blur.amount)), geoMask(getPix(fx.blur.mask, res), res, k, W, H, geom));
  }
  const done = fromData(out);
  if (ck) cache.blur = { key: ck, c: done };
  return done;
}
function applyArea(baseData, editedData, res, k, geom = st.geom) {
  const am = areaMaskFor(res, k, editedData.width, editedData.height, geom);
  return am ? blendByMask(baseData, editedData, am.mask, am.invert) : editedData;
}
function opsStage(geo) {
  const key = geo.key + JSON.stringify([st.adjust, st.filter, { ...st.fx, blur: null, focus: null }]);
  if (cache.ops.key !== key) {
    let c = geo.c;
    if (hasOps(st)) {
      const base = getData(geo.c);
      const edited = renderPixels(base, { adjust: st.adjust, filter: st.filter, fx: st.fx });
      c = fromData(applyArea(base, edited, "prev", geo.k, geo.geom));
    }
    cache.ops = { key, c };
  }
  return blurStage(cache.ops.c, "prev", geo.k, geo.geom, key);
}
function finish(base, { overlays = true, frame = true } = {}) {
  const c = makeCanvas(base.width, base.height), x = c.getContext("2d");
  x.globalAlpha = Math.max(0, Math.min(1, (st.fx?.opacity ?? 100) / 100));
  x.drawImage(base, 0, 0);
  x.globalAlpha = 1;
  if (overlays) for (const o of st.overlays) drawOverlay(x, o, c.width, c.height);
  return frame ? applyFrame(c, st.frame) : c;
}

// Changes are drawn on the next animation frame (scheduleRender), so the view, crop box, brush and selection
// box follow a click a frame later; `rendering` (window.adApp) is true until that frame has been drawn.
let renderQueued = false, renderDraft = false, renderToken = 0, renderRunning = 0;
const view = { W: 1, H: 1, photoW: 1, photoH: 1, padL: 0, padT: 0, scale: 1, cssW: 1, cssH: 1, mode: "normal" };
function scheduleRender({ draft = false } = {}) {
  renderDraft = renderDraft || draft;
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const d = renderDraft;
    renderDraft = false;
    renderNow({ draft: d }).catch((e) => { console.error(e); toast("Could not show the photo: " + e.message); });
  });
}
async function renderNow(opts) {
  if (!st) return;
  renderRunning++;
  try { await drawView(opts); } finally { renderRunning--; }
}
async function drawView({ draft = false } = {}) {
  const token = ++renderToken;
  const m = viewMode();
  if (m === "normal" && st.overlays.length) await prepareOverlays(st.overlays);
  if (token !== renderToken) return;
  const maxSide = draft ? Math.min(900, VIEW_MAX()) : VIEW_MAX();
  let out, photoW, photoH, pad = { left: 0, top: 0 };
  if (m === "erase") {
    out = /^refine/.test(ui.brushFor || "") && st.cutout ? refineView() : /^(blur|pixel)-/.test(ui.brushFor || "") ? brushPreview() : getPix(st.pixels, "prev");
    photoW = out.width; photoH = out.height;
  } else {
    const geo = geoStage(maxSide, m !== "crop");
    const ops = opsStage(geo);
    photoW = ops.width; photoH = ops.height;
    out = m === "normal" ? finish(ops) : ops;
    if (m === "normal") pad = framePad(st.frame, photoW, photoH);
  }
  const cv = $("#view");
  if (cv.width !== out.width || cv.height !== out.height) { cv.width = out.width; cv.height = out.height; }
  const x = cv.getContext("2d");
  x.clearRect(0, 0, cv.width, cv.height);
  x.drawImage(out, 0, 0);
  Object.assign(view, { W: out.width, H: out.height, photoW, photoH, padL: pad.left, padT: pad.top, mode: m });
  layoutStage();
  if (ui.split || ui.before) paintBefore(maxSide);
  updateOverlayUi();
  updateCropUi();
  updateBrushCanvas();
}
function paintBefore(maxSide = VIEW_MAX()) {
  const bv = $("#beforeView");
  if (view.mode !== "normal") { bv.hidden = true; return; }
  const geo = geoStage(maxSide, true, true);
  const out = st.frame.id !== "none" || st.frame.shadow?.id ? applyFrame(geo.c, st.frame) : geo.c;
  bv.width = view.W; bv.height = view.H;
  const x = bv.getContext("2d");
  x.clearRect(0, 0, bv.width, bv.height);
  x.drawImage(out, 0, 0, bv.width, bv.height);
  bv.hidden = false;
  bv.style.clipPath = ui.before ? "none" : `inset(0 ${(1 - ui.splitAt) * 100}% 0 0)`;
  const hd = $("#splitHandle");
  hd.hidden = !ui.split || ui.before;
  hd.style.left = ui.splitAt * 100 + "%";
}
function hideBefore() { $("#beforeView").hidden = true; $("#splitHandle").hidden = true; }
function layoutStage() {
  const stage = $("#stage");
  const pad = phone() ? 12 : 28;
  const aw = Math.max(50, stage.clientWidth - pad * 2), ah = Math.max(50, stage.clientHeight - pad * 2);
  const s = Math.min(aw / view.W, ah / view.H, view.mode === "erase" ? 4 : 2) * (shell ? ui.zoom / 100 : 1);
  view.cssW = Math.max(1, Math.floor(view.W * s));
  view.cssH = Math.max(1, Math.floor(view.H * s));
  view.scale = view.cssW / view.W;
  const wrap = $("#wrap");
  wrap.style.width = view.cssW + "px";
  wrap.style.height = view.cssH + "px";
}
const relayout = () => { if (st && !$("#editor").hidden) { layoutStage(); updateOverlayUi(); updateCropUi(); if (ui.split) paintBefore(); } };
addEventListener("resize", relayout);
// on phones the settings panel changes height as tools change, which resizes the photo area
if (typeof ResizeObserver === "function") new ResizeObserver(() => relayout()).observe(document.getElementById("stage"));

// pointer → photo pixels (of the preview) in the current view
function toPhoto(e) {
  const r = $("#wrap").getBoundingClientRect();
  return { x: (e.clientX - r.left) / view.scale - view.padL, y: (e.clientY - r.top) / view.scale - view.padT };
}

/* ---------- overlays on the photo (select, move, resize, turn) ---------- */
const selOverlay = () => st?.overlays.find((o) => o.id === selId) || null;
function updateOverlayUi() {
  const box = $("#sel");
  const o = selOverlay();
  if (!o || view.mode !== "normal" || tool !== "add") { box.hidden = true; updateOvBar(null); return; }
  const b = overlayBox(o, view.photoW, view.photoH), s = view.scale;
  box.hidden = false;
  Object.assign(box.style, { left: (view.padL + b.cx - b.w / 2) * s + "px", top: (view.padT + b.cy - b.h / 2) * s + "px", width: b.w * s + "px", height: b.h * s + "px", transform: `rotate(${b.rot}deg)` });
  updateOvBar(o, box);
}
/* Floating toolbar above the selected text, shape, sticker or picture, in Canva's order: colour, Edit, position
 * (forward / backward); then transparency, duplicate, delete. Shown in the editor frame only. */
let ovBarEl = null;
function updateOvBar(o, box) {
  if (!shell) return;
  if (!ovBarEl) { ovBarEl = h("div", { class: "ov-bar", id: "ovBar", role: "toolbar", "aria-label": "Selected item", hidden: true }); document.body.append(ovBarEl); }
  const bar = ovBarEl;
  if (!o || !box || box.hidden || (drag && drag.kind !== "split") || document.body.classList.contains("ads-viewing")) { bar.hidden = true; return; }
  const key = o.id + ":" + hist.past.length;
  if (bar.dataset.for !== key) {
    bar.dataset.for = key;
    const i = st.overlays.indexOf(o), live = () => scheduleRender(), done = () => { commit(); renderPanel(); };
    const kids = [];
    const colorOf = o.type === "text" ? o.color : o.type === "shape" ? o.fill : o.type === "sticker" && o.recolor ? o.colors?.c1 || "#5b4cf0" : null;
    if (colorOf && /^#[0-9a-f]{6}$/i.test(colorOf)) kids.push(h("label", { class: "ov-color", title: "Colour" }, h("input", { type: "color", value: colorOf, "aria-label": "Colour", "data-ov": "color",
      oninput: (e) => { const v = e.target.value; if (o.type === "text") o.color = v; else if (o.type === "shape") o.fill = v; else { o.colors = { ...o.colors, c1: v }; prepareOverlays([o]).then(live); } live(); }, onchange: done })));
    kids.push(h("button", { class: "btn", type: "button", "data-ov": "edit", title: o.type === "text" ? "Font, size, outline and box" : "Settings for this item", onclick: () => shell?.openPanel(o.type === "text" ? "text" : "elements") }, "Edit"));
    kids.push(h("button", { class: "btn", type: "button", "data-ov": "forward", title: "Position: bring forward", "aria-label": "Bring forward", disabled: i === st.overlays.length - 1, onclick: () => { st.overlays.splice(i, 1); st.overlays.splice(i + 1, 0, o); done(); } }, "Forward"));
    kids.push(h("button", { class: "btn", type: "button", "data-ov": "backward", title: "Position: send backward", "aria-label": "Send backward", disabled: i === 0, onclick: () => { st.overlays.splice(i, 1); st.overlays.splice(i - 1, 0, o); done(); } }, "Backward"));
    kids.push(h("span", { class: "pill-sep", "aria-hidden": "true" }));
    kids.push(h("label", { class: "ov-op", title: "Transparency" }, h("input", { type: "range", min: 5, max: 100, value: Math.round((o.opacity ?? 1) * 100), "aria-label": "Transparency", "data-ov": "opacity", oninput: (e) => { o.opacity = +e.target.value / 100; live(); }, onchange: done })));
    kids.push(h("button", { class: "btn", type: "button", "data-ov": "duplicate", title: "Duplicate", "aria-label": "Duplicate", onclick: () => addOverlay({ ...cloneState(o), id: uid(), x: Math.min(0.95, o.x + 0.04), y: Math.min(0.95, o.y + 0.04) }) }, "Duplicate"));
    kids.push(h("button", { class: "btn", type: "button", "data-ov": "delete", title: "Delete", "aria-label": "Delete", onclick: () => removeSelected() }, "Delete"));
    bar.replaceChildren(...kids);
  }
  bar.hidden = false;
  const r = box.getBoundingClientRect(), bw = bar.offsetWidth || 300, bh = bar.offsetHeight || 40;
  // above the item (clear of its turn handle), never over the frame's floating toolbar; else under the item
  const pill = document.querySelector(".ads-pill:not([hidden])")?.getBoundingClientRect(), minTop = Math.max(56, (pill && pill.height ? pill.bottom : 0) + 8);
  const top = r.top - bh - 46 >= minTop ? r.top - bh - 46 : r.bottom + 14;
  Object.assign(bar.style, { left: Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)) + "px", top: Math.max(8, Math.min(innerHeight - bh - 8, top)) + "px" });
}
let drag = null;
function onWrapDown(e) {
  if (!st || busy) return;
  if (view.mode === "normal" && ui.split && e.target.id === "splitHandle") {
    e.preventDefault();
    $("#wrap").setPointerCapture(e.pointerId);
    drag = { kind: "split" };
    return;
  }
  if (view.mode === "normal" && tool === "add") {
    const p = toPhoto(e);
    const handle = e.target.dataset?.h;
    let o = handle ? selOverlay() : pickOverlay(st.overlays, p.x, p.y, view.photoW, view.photoH, 6 / view.scale);
    if (!o) { if (selId) { selId = null; updateOverlayUi(); renderPanel(); } return; }
    if (o.id !== selId) { selId = o.id; renderPanel(); }
    updateOverlayUi();
    e.preventDefault();
    $("#wrap").setPointerCapture(e.pointerId);
    drag = { kind: handle || "move", o, p0: p, start: { ...o }, moved: false };
  }
}
function onWrapMove(e) {
  if (!drag) return;
  if (drag.kind === "split") {
    const r = $("#wrap").getBoundingClientRect();
    ui.splitAt = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    paintBefore();
    return;
  }
  const p = toPhoto(e), o = drag.o, s0 = drag.start, W = view.photoW, H = view.photoH;
  drag.moved = true;
  if (drag.kind === "move") {
    o.x = Math.max(-0.2, Math.min(1.2, s0.x + (p.x - drag.p0.x) / W));
    o.y = Math.max(-0.2, Math.min(1.2, s0.y + (p.y - drag.p0.y) / H));
  } else if (drag.kind === "scale") {
    const cx = s0.x * W, cy = s0.y * H;
    const f = Math.max(0.05, Math.hypot(p.x - cx, p.y - cy) / Math.max(1, Math.hypot(drag.p0.x - cx, drag.p0.y - cy)));
    if (o.type === "text") o.size = Math.max(0.01, Math.min(0.6, s0.size * f));
    else { o.w = Math.max(0.02, s0.w * f); o.h = Math.max(0.02, s0.h * f); }
  } else if (drag.kind === "rot") {
    let a = (Math.atan2(p.y - s0.y * H, p.x - s0.x * W) * 180) / Math.PI + 90;
    a = ((a + 540) % 360) - 180;
    for (const snap of [-180, -90, 0, 90, 180]) if (Math.abs(a - snap) < 4) a = snap;
    o.rotation = Math.round(a);
  }
  scheduleRender();
}
function onWrapUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.kind !== "split" && d.moved) { commit(); renderPanel(); }
}

/* ---------- crop box ---------- */
function frameDims() {
  const src = sourceFor("prev", false);
  return orientedSize(src.width, src.height, st.geom.rot);
}
function aspectValue() {
  const p = CROP_PRESETS.find((c) => c.id === st.geom.aspect);
  if (!p || !p.aspect) return null;
  if (p.aspect === "original") { const f = frameDims(); return f.w / f.h; }
  return p.aspect;
}
function updateCropUi() {
  const box = $("#crop");
  if (view.mode !== "crop") { box.hidden = true; return; }
  const c = st.geom.crop;
  box.hidden = false;
  Object.assign(box.style, { left: c.x * view.cssW + "px", top: c.y * view.cssH + "px", width: c.w * view.cssW + "px", height: c.h * view.cssH + "px" });
}
let cropDrag = null;
function onCropDown(e) {
  e.preventDefault();
  e.stopPropagation();
  const handle = e.target.dataset.h || "move";
  $("#crop").setPointerCapture(e.pointerId);
  cropDrag = { handle, x0: e.clientX, y0: e.clientY, start: { ...st.geom.crop }, frame: frameDims() };
}
function onCropMove(e) {
  if (!cropDrag) return;
  const dx = (e.clientX - cropDrag.x0) / view.cssW, dy = (e.clientY - cropDrag.y0) / view.cssH;
  st.geom.crop = dragCrop(cropDrag.start, cropDrag.handle, dx, dy, cropDrag.frame.w, cropDrag.frame.h, aspectValue());
  updateCropUi();
}
function onCropUp() {
  if (!cropDrag) return;
  cropDrag = null;
  commitIfChanged();
}
function onCropKey(e) {
  const step = e.shiftKey ? 0.05 : 0.01, map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (!map) return;
  e.preventDefault();
  const f = frameDims();
  st.geom.crop = dragCrop(st.geom.crop, "move", map[0], map[1], f.w, f.h, aspectValue());
  updateCropUi();
  commitIfChanged();
}

/* ---------- magic eraser brush ---------- */
function updateBrushCanvas() {
  const b = $("#brush");
  if (view.mode !== "erase") { b.hidden = true; return; }
  b.hidden = false;
  if (b.width !== view.W || b.height !== view.H) { b.width = view.W; b.height = view.H; ui.brushDirty = false; }
}
let painting = null;
const isClickSelect = () => ui.brushFor === "click" || /-click$/.test(ui.brushFor || "");
// Brushes whose strokes take effect as soon as the stroke ends (one undo step each), like Canva's blur and pixel eraser.
const LIVE_BRUSHES = new Set(["blur-add", "blur-remove", "pixel-erase", "pixel-restore"]);
function onBrushDown(e) {
  e.preventDefault();
  if (e.button === 1 || e.button === 2) return; // middle / right button: pan the view (see bind)
  if (isClickSelect()) { clickSelect(e); return; }
  const b = $("#brush");
  b.setPointerCapture(e.pointerId);
  const r = b.getBoundingClientRect(), s = b.width / r.width;
  painting = { s, last: [(e.clientX - r.left) * s, (e.clientY - r.top) * s] };
  paintAt(painting.last, painting.last);
}
function onBrushMove(e) {
  if (!painting) return;
  const b = $("#brush"), r = b.getBoundingClientRect();
  const p = [(e.clientX - r.left) * painting.s, (e.clientY - r.top) * painting.s];
  paintAt(painting.last, p);
  painting.last = p;
}
function paintAt(a, b2) {
  const b = $("#brush"), x = b.getContext("2d");
  x.strokeStyle = "rgb(255, 60, 90)";
  x.lineCap = x.lineJoin = "round";
  x.lineWidth = ui.brush / view.scale;
  x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b2[0] + 0.01, b2[1]); x.stroke();
  ui.brushDirty = true;
  for (const id of ["#eraseGo", "#areaUse", "#aiAreaUse", "#grabGo"]) { const btn = $(id); if (btn) btn.disabled = false; }
}
function onBrushUp() {
  if (!painting) return;
  painting = null;
  if (LIVE_BRUSHES.has(ui.brushFor) && ui.brushDirty) applyBrushStroke();
}
/** A full-size mask (photo pixels) with the brushed area painted in (or wiped out); full = the whole photo. Returns its pixel id. */
function paintMask(oldId, { remove = false, full = false } = {}) {
  const src = getPix(st.pixels, "full");
  const c = makeCanvas(src.width, src.height), x = c.getContext("2d");
  if (full) { x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height); return newPix(c); }
  if (oldId && pix.has(oldId)) x.drawImage(getPix(oldId, "full"), 0, 0, c.width, c.height);
  x.globalCompositeOperation = remove ? "destination-out" : "source-over";
  x.drawImage(resizeTo(brushMask(), c.width, c.height), 0, 0);
  return newPix(c);
}
/** The cut-out with the brushed area taken away (erase) or brought back from the photo (restore); returns its pixel id. */
function brushCutout(restore) {
  const cut = getPix(st.cutout, "full"), orig = getPix(st.pixels, "full");
  const mask = resizeTo(brushMask(), cut.width, cut.height);
  const out = makeCanvas(cut.width, cut.height), x = out.getContext("2d");
  x.drawImage(cut, 0, 0);
  if (!restore) { x.globalCompositeOperation = "destination-out"; x.drawImage(mask, 0, 0); }
  else {
    const t = makeCanvas(cut.width, cut.height), tx = t.getContext("2d");
    tx.drawImage(orig, 0, 0, cut.width, cut.height);
    tx.globalCompositeOperation = "destination-in"; tx.drawImage(mask, 0, 0);
    x.drawImage(t, 0, 0);
  }
  return newPix(out);
}
/** Blur brush / remove brush and pixel eraser / restore: the stroke just painted takes effect. */
function applyBrushStroke() {
  if (!st || !ui.brushDirty) return;
  const kind = ui.brushFor;
  if (kind === "blur-add" || kind === "blur-remove") {
    const b = st.fx.blur || { amount: 50, mask: null };
    if (kind === "blur-remove" && !b.mask) { clearBrush(); toast("Nothing is blurred there yet."); return; }
    st.fx.blur = { amount: b.amount || 50, mask: paintMask(b.mask, { remove: kind === "blur-remove" }) };
  } else if (kind === "pixel-erase") {
    st.fx.eraseMask = paintMask(st.fx.eraseMask);
  } else if (kind === "pixel-restore") {
    const cut = st.bg.removed && st.cutout && pix.has(st.cutout);
    if (!st.fx.eraseMask && !cut) { clearBrush(); toast("Nothing has been erased yet."); return; }
    if (st.fx.eraseMask) st.fx.eraseMask = paintMask(st.fx.eraseMask, { remove: true });
    if (cut) st.cutout = brushCutout(true);
  } else return;
  clearBrush();
  commit();
}
// What the photo looks like while brushing the blur (the blur so far) or the pixel eraser (see-through parts on a checkerboard).
function brushPreview() {
  const kind = ui.brushFor || "";
  if (kind.startsWith("pixel-")) {
    const src = sourceFor("prev", false), c = makeCanvas(src.width, src.height), x = c.getContext("2d");
    checker(x, c.width, c.height, Math.max(6, Math.round(c.width / 60)));
    x.drawImage(src, 0, 0);
    return c;
  }
  const src = getPix(st.pixels, "prev"), c = makeCanvas(src.width, src.height), x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  const b = st.fx.blur;
  if (b?.mask && pix.has(b.mask) && b.amount > 0) {
    const t = makeCanvas(c.width, c.height), tx = t.getContext("2d");
    tx.drawImage(getPix(b.mask, "prev"), 0, 0, c.width, c.height);
    tx.globalCompositeOperation = "source-in";
    tx.drawImage(blurredCopy(src, b.amount), 0, 0);
    x.drawImage(t, 0, 0);
  }
  return c;
}
// "Click" area: the pixels joined to the clicked one and close in colour (flood select), shown in the brush colour.
function clickSelect(e) {
  const b = $("#brush"), r = b.getBoundingClientRect(), s = b.width / r.width;
  const src = getData(getPix(st.pixels, "prev"));
  const m = regionGrow(src, (e.clientX - r.left) * s, (e.clientY - r.top) * s, ui.clickTol);
  for (let i = 0; i < m.data.length; i += 4) if (m.data[i + 3]) { m.data[i] = 255; m.data[i + 1] = 60; m.data[i + 2] = 90; }
  if (m.width !== b.width || m.height !== b.height) b.getContext("2d").drawImage(fromData(m), 0, 0, b.width, b.height);
  else b.getContext("2d").drawImage(fromData(m), 0, 0);
  ui.brushDirty = true;
  for (const id of ["#areaUse", "#eraseGo", "#grabGo", "#aiAreaUse"]) { const b2 = $(id); if (b2) b2.disabled = false; }
}
function brushMask() { const b = $("#brush"), c = makeCanvas(b.width, b.height); c.getContext("2d").drawImage(b, 0, 0); return c; }
// The cut-out to refine, over a faint copy of the original (so Restore shows what can come back).
function refineView() {
  const orig = getPix(st.pixels, "prev"), cut = getPix(st.cutout, "prev");
  const c = makeCanvas(orig.width, orig.height), x = c.getContext("2d");
  x.globalAlpha = 0.28; x.drawImage(orig, 0, 0); x.globalAlpha = 1; x.drawImage(cut, 0, 0, c.width, c.height);
  return c;
}
function clearBrush() {
  const b = $("#brush");
  b.getContext("2d").clearRect(0, 0, b.width, b.height);
  ui.brushDirty = false;
  const btn = $("#eraseGo");
  if (btn) btn.disabled = true;
}

/* ---------- worker jobs ---------- */
let worker = null, workerOk = false, jobN = 0;
const jobs = new Map();
function getWorker() {
  if (worker === false) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./photo-worker.js", import.meta.url), { type: "module" });
      worker.onmessage = (e) => {
        workerOk = true;
        const j = jobs.get(e.data.id);
        if (!j) return;
        if (e.data.type === "progress") j.onProgress?.(e.data);
        else { jobs.delete(e.data.id); if (e.data.type === "done") j.resolve(e.data); else j.reject(new Error(e.data.message)); }
      };
      worker.onerror = (e) => {
        console.error(e);
        const failed = [...jobs.values()];
        jobs.clear();
        worker.terminate();
        worker = false;
        // a browser without module workers: do the job here instead
        for (const j of failed) j.retry ? runInline(j.op, j.copy, j.opts, j.onProgress).then(j.resolve, j.reject) : j.reject(new Error("The photo helper stopped. Please try again."));
      };
    } catch { worker = false; return null; }
  }
  return worker;
}
async function runInline(op, img, opts, onProgress) {
  await tick();
  if (op === "enhance") { const out = enhanceInline(img, opts, onProgress); return { img: out, scale: out.scale }; }
  return { img: renderPixels(img, opts, { seed: opts.seed ?? 7 }), scale: 1 };
}
async function runJob(op, img, opts, onProgress) {
  const w = getWorker();
  if (!w) return runInline(op, img, opts, onProgress);
  const id = ++jobN;
  const retry = !workerOk; // until the worker has answered once, keep a copy to redo the job here
  const copy = retry ? { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height } : null;
  return new Promise((resolve, reject) => {
    jobs.set(id, { resolve, reject, onProgress, retry, copy, op, opts });
    w.postMessage({ id, op, img: { data: img.data, width: img.width, height: img.height }, opts }, [img.data.buffer]);
  });
}

/* ---------- tools that change pixels ---------- */
let IT = null;
async function imagetools() { IT ||= import("/pdf-editor/imagetools.js").catch((e) => { IT = null; throw new Error("Could not load the photo tools. Please check your connection."); }); return IT; }

async function cutoutFor(pixId) {
  const T = await imagetools();
  return T.removeBackground(getPix(pixId, "full"), { onProgress: progressToBusy });
}
async function runRemoveBackground({ quiet = false } = {}) {
  if (busy || !st) return;
  try {
    showBusy("Removing the background…", 0, { quiet });
    const cut = await cutoutFor(st.pixels);
    st.cutout = newPix(cut);
    st.bg.removed = true;
    commit();
    hideBusy();
    renderPanel();
    toast("Background removed. Pick a new background or download.");
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "The background could not be removed.", 5000);
  }
}
async function runErase() {
  if (busy || !st || !ui.brushDirty) { if (!ui.brushDirty) toast("Brush over the part you want to remove first."); return; }
  try {
    showBusy("Getting the magic eraser ready…", 0);
    const T = await imagetools();
    const out = await T.magicErase(getPix(st.pixels, "full"), $("#brush"), { onProgress: progressToBusy });
    const id = newPix(out);
    let cut = null;
    if (st.cutout) { setBusy("Updating the cut-out…"); cut = newPix(await cutoutFor(id)); }
    st.pixels = id;
    if (cut) st.cutout = cut;
    clearBrush();
    commit();
    hideBusy();
    toast("Erased. Brush again to remove more, or press Undo.");
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "The eraser could not finish.", 5000);
  }
}
async function runEnhance({ quiet = false } = {}) {
  if (busy || !st) return;
  try {
    const src = getPix(st.pixels, "full");
    const want = pickScale(src.width, src.height, ui.enhance.scale);
    const scale = safeScale(src.width, src.height, want, { maxPixels: PIXEL_LIMIT });
    showBusy("Enhancing…", 0, { quiet });
    await tick();
    const t0 = performance.now();
    const res = await runJob("enhance", getData(src), { ...ui.enhance, scale }, (p) => setBusy(p.step, p.done));
    const out = fromData(res.img);
    const oldCut = st.cutout ? getPix(st.cutout, "full") : null;
    st.pixels = newPix(out);
    if (oldCut) {
      // keep the cut-out: new pixels with the old outline (scaled)
      const c = makeCanvas(out.width, out.height), x = c.getContext("2d");
      x.drawImage(out, 0, 0);
      x.globalCompositeOperation = "destination-in";
      x.imageSmoothingQuality = "high";
      x.drawImage(oldCut, 0, 0, out.width, out.height);
      st.cutout = newPix(c);
    }
    ui.lastEnhance = { w: out.width, h: out.height, scale: res.scale, ms: Math.round(performance.now() - t0), from: { w: src.width, h: src.height } };
    commit();
    hideBusy();
    ui.split = true;
    ui.splitAt = 0.5;
    $("#splitBtn").setAttribute("aria-pressed", "true");
    renderPanel();
    toast(scale < want && scale > 1 ? `Enhanced and upscaled ${res.scale}× (the largest safe size for this photo).` : `Enhanced${ui.enhance.scale === "auto" ? ` (Auto picked ${scale}×)` : ""}: ${out.width}×${out.height} px. Drag the line to compare.`, 4500);
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "The enhancer could not finish.", 5000);
  }
}
async function runAiEdit(prompt) {
  if (busy || !st) return;
  prompt = String(prompt || "").trim();
  if (!prompt) { toast("Describe the edit first, for example “make the sky blue”."); return; }
  if (!aiReady()) { renderPanel(); return; }
  try {
    showBusy("Sending your photo to AsaanDesk AI…");
    const c = await exportCanvas({ size: "custom", customW: 0, maxLong: 1536 });
    const flat = flatten(c, "#ffffff");
    const image = flat.toDataURL("image/jpeg", 0.9);
    const body = { prompt, image, width: flat.width, height: flat.height };
    if (ui.aiMask) {
      // the brushed area through the same turn / flip / crop as the photo, at the sent size (white = change here)
      const src = getPix(st.pixels, "prev"), g = drawGeometry(resizeTo(ui.aiMask, src.width, src.height), st.geom, 1);
      body.mask = resizeTo(g, flat.width, flat.height).toDataURL("image/png");
    }
    const data = await onlineAi("/ai/photo-edit", body, "The AI photo editor");
    const src = data && (data.image || data.url);
    if (!src || typeof src !== "string") throw new Error("AsaanDesk AI did not send a picture back. Your photo was not changed.");
    setBusy("Loading the edited photo…");
    const blob = await (await fetch(src)).blob();
    const r = await decodeFile(new File([blob], "ai-edit.png", { type: blob.type || "image/png" }));
    const keepOrig = st.src;
    st = newState({ w: r.canvas.width, h: r.canvas.height });
    st.src = keepOrig;
    st.pixels = putPix("p" + uid(), r.canvas, blob);
    selId = null;
    commit();
    hideBusy();
    renderPanel();
    toast("Done. Press Undo to go back.");
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "AsaanDesk AI could not edit this photo. Nothing was changed.", 5000);
  }
}

/* ---------- export ---------- */
function flatten(c, color = "#ffffff") {
  const out = makeCanvas(c.width, c.height), x = out.getContext("2d");
  x.fillStyle = color; x.fillRect(0, 0, out.width, out.height);
  x.drawImage(c, 0, 0);
  return out;
}
/** The finished picture at full quality. size: original | 2048 | 1080 | custom (customW). maxLong caps the long side. */
async function exportCanvas({ size = "original", customW = 0, maxLong = 0 } = {}) {
  await prepareOverlays(st.overlays);
  const src = sourceFor("full", false);
  const g1 = geometryMatrix(src.width, src.height, st.geom, 1);
  const p1 = framePad(st.frame, g1.outW, g1.outH);
  const fullW = g1.outW + p1.left + p1.right, fullH = g1.outH + p1.top + p1.bottom;
  let target = exportDims(fullW, fullH, size, customW);
  if (maxLong && Math.max(target.w, target.h) > maxLong) { const s = maxLong / Math.max(target.w, target.h); target = { w: Math.round(target.w * s), h: Math.round(target.h * s) }; }
  const k = target.w / fullW;
  let c = drawGeometry(src, st.geom, k);
  if (hasOps(st)) {
    const base = getData(c);
    const edited = (await runJob("render", base, { adjust: st.adjust, filter: st.filter, fx: st.fx, seed: 7 })).img;
    c = fromData(applyArea(base, edited, "full", k));
  }
  c = blurStage(c, "full", k);
  if ((st.fx?.opacity ?? 100) < 100) { const t = makeCanvas(c.width, c.height), tx = t.getContext("2d"); tx.globalAlpha = st.fx.opacity / 100; tx.drawImage(c, 0, 0); c = t; }
  const x = c.getContext("2d");
  for (const o of st.overlays) drawOverlay(x, o, c.width, c.height);
  c = applyFrame(c, st.frame);
  if (c.width !== target.w || c.height !== target.h) c = resizeTo(c, target.w, target.h);
  return c;
}
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
async function exportBlob({ format = ui.exportFmt, quality = ui.exportQ / 100, size = ui.exportSize, customW = ui.customW } = {}) {
  let c = await exportCanvas({ size, customW });
  if (format === "pdf") {
    const jpg = await toBlob(flatten(c, "#ffffff"), "image/jpeg", Math.min(0.95, quality || 0.92));
    const blob = new Blob([pdfFromJpeg(new Uint8Array(await jpg.arrayBuffer()), { title: fileName })], { type: "application/pdf" });
    lastExport = { w: c.width, h: c.height, type: blob.type, bytes: blob.size, format: "pdf" };
    return blob;
  }
  if (format === "jpg") c = flatten(c, "#ffffff");
  let blob = await toBlob(c, MIME[format] || "image/png", format === "png" ? undefined : quality);
  if (format === "webp" && blob.type !== "image/webp") { blob = await toBlob(c, "image/png"); format = "png"; toast("This browser can't save WebP, so a PNG was saved instead."); }
  lastExport = { w: c.width, h: c.height, type: blob.type, bytes: blob.size, format };
  return blob;
}
async function doExport(opts = {}) {
  if (busy || !st) return;
  try {
    showBusy("Preparing your download…");
    await tick();
    const blob = await exportBlob(opts);
    const ext = lastExport.format === "jpg" ? "jpg" : lastExport.format;
    download(blob, `${fileName}${opts.suffix || "-edited"}.${ext}`);
    hideBusy();
    toast(`Saved ${lastExport.w}×${lastExport.h} px ${ext.toUpperCase()}.`);
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "The download could not be made.", 5000);
  }
}
// JPEG with 300 dpi in its JFIF header so print shops get the right size.
async function setJpegDpi(blob, dpi) {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff && b[3] === 0xe0 && String.fromCharCode(...b.slice(6, 11)) === "JFIF\0") {
    b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 255; b[16] = dpi >> 8; b[17] = dpi & 255;
  }
  return new Blob([b], { type: "image/jpeg" });
}
async function passportBlob() {
  const photo = await exportCanvas({ size: "original" });
  const s = passportSheet();
  const c = makeCanvas(s.width, s.height), x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, s.width, s.height);
  const r = coverRect(photo.width, photo.height, s.photo.w, s.photo.h);
  x.imageSmoothingQuality = "high";
  for (const q of s.rects) {
    x.fillStyle = "#ffffff"; x.fillRect(q.x, q.y, q.w, q.h);
    x.drawImage(photo, r.x, r.y, r.w, r.h, q.x, q.y, q.w, q.h);
    x.strokeStyle = "#c9cdd8"; x.lineWidth = 1;
    x.strokeRect(q.x - 0.5, q.y - 0.5, q.w + 1, q.h + 1);
  }
  x.fillStyle = "#8a91a5"; x.font = "20px system-ui, sans-serif";
  x.fillText("6 passport photos, 35 × 45 mm · print at 4 × 6 in (10 × 15 cm), no scaling", 40, s.height - 24);
  const blob = await setJpegDpi(await toBlob(c, "image/jpeg", 0.95), s.dpi);
  lastExport = { w: s.width, h: s.height, type: blob.type, bytes: blob.size, format: "jpg", passport: s };
  return blob;
}
async function doPassport() {
  if (busy || !st) return;
  try {
    showBusy("Making the passport sheet…");
    await tick();
    const blob = await passportBlob();
    download(blob, `${fileName}-passport-sheet.jpg`);
    hideBusy();
    const g = st.geom;
    toast(g.aspect === "passport" ? "Passport sheet saved (4×6 in, 6 photos)." : "Sheet saved. Tip: crop with the Passport 35×45 mm shape first.", 4500);
  } catch (e) {
    hideBusy();
    toast(e.message || "The sheet could not be made.");
  }
}

/* ---------- open in Studio ---------- */
const STUDIO_FILTERS = { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 };
/** Does the finished photo have see-through parts (cut-out, shape frame, photo shadow, pixel eraser, transparency)? */
const seeThrough = () => (st.bg.removed && st.bg.mode === "transparent") || SHAPE_FRAMES.has(st.frame.id) || !!st.frame.shadow?.id || !!st.fx?.eraseMask || (st.fx?.opacity ?? 100) < 100;
/** The finished photo as a one-page Studio design (Design JSON, see SPEC.md). */
async function designFromPhoto() {
  const c = await exportCanvas({ size: "original", maxLong: 2000 });
  const transparent = seeThrough();
  const src = transparent ? c.toDataURL("image/png") : flatten(c).toDataURL("image/jpeg", 0.92);
  const w = c.width, hgt = c.height;
  return {
    version: 1, name: fileName,
    preset: { id: "custom", label: "Custom size", w, h: hgt, unit: "px", dpi: 96, bleed: 0 },
    pages: [{ id: "p" + uid(), background: { color: "#ffffff" }, layers: [{
      id: "l" + uid(), type: "image", name: "Photo", x: 0, y: 0, w, h: hgt, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null,
      image: { src, crop: { x: 0, y: 0, w: 1, h: 1 }, filters: { ...STUDIO_FILTERS }, radius: 0, flipX: false, flipY: false, nw: w, nh: hgt },
    }] }],
  };
}
async function openInStudio() {
  if (busy || !st) return;
  try {
    showBusy("Opening in Studio…");
    const design = await designFromPhoto();
    const id = await putHandoff({ type: "design", design });
    await (saving || Promise.resolve());
    location.href = "/design/studio/?handoff=" + id;
  } catch (e) {
    hideBusy();
    toast(e.message || "Could not open Studio.");
  }
}

/* ---------- autosave ---------- */
let saveTimer = null, saving = null;
function scheduleSave() { shell?.setSaved?.("saving"); clearTimeout(saveTimer); saveTimer = setTimeout(() => { saving = saveNow().catch((e) => console.warn("autosave", e)); }, 1500); }
async function saveNow() {
  if (!st) return null;
  const ids = [...new Set([...statePixelIds(st), "orig"].filter((k) => k && pix.has(k)))];
  const blobs = {};
  for (const id of ids) {
    const p = pix.get(id);
    p.blob ||= await toBlob(p.full, "image/png");
    blobs[id] = p.blob;
  }
  const src = sourceFor("prev", false);
  const g1 = geometryMatrix(src.width, src.height, st.geom, 1);
  const thumb = drawGeometry(src, st.geom, Math.min(1, 240 / Math.max(g1.outW, g1.outH))).toDataURL("image/jpeg", 0.7);
  const rec = await saveProject({ id: projectId || undefined, app: "photo", name: fileName, data: { state: cloneState(st), blobs }, thumb });
  if (projectId !== rec.id) { projectId = rec.id; syncUrl(); }
  $("#saved").textContent = "Saved";
  shell?.setSaved?.("saved");
  try { shell?.setProjectId?.(rec.id); } catch {}
  return rec.id;
}

/* ---------- panels ---------- */
function slider({ id, label, min, max, step = 1, value, onInput, onChange, fmt = (v) => v, reset = 0 }) {
  const out = h("output", { for: "s-" + id }, fmt(value));
  const input = h("input", { type: "range", id: "s-" + id, min, max, step, value, "aria-label": label,
    oninput: (e) => { out.textContent = fmt(+e.target.value); onInput(+e.target.value); },
    onchange: (e) => onChange?.(+e.target.value) });
  const row = h("div", { class: "slider" }, h("label", { for: "s-" + id, title: "Double-click to reset", ondblclick: () => { input.value = reset; out.textContent = fmt(reset); onInput(reset); onChange?.(reset); } }, label), out, input);
  return row;
}
const chip = (label, on, onclick, extra = {}) => h("button", { class: "chip" + (on ? " on" : ""), "aria-pressed": String(!!on), onclick, ...extra }, label);
const section = (title, ...kids) => h("section", { class: "psec" }, title ? h("h3", {}, title) : null, ...kids);

function renderPanel() {
  const p = panelEl();
  p.innerHTML = "";
  if (!st) { if (shell || framing) p.append(...noPhotoBlock()); return; }
  ensureFx(st);
  const build = { crop: panelCrop, adjust: panelAdjust, filters: panelFilters, effects: panelEffects, add: panelAdd, bg: panelBackground, erase: panelErase, enhance: panelEnhance, ai: panelAi, export: panelExport,
    retouch: panelRetouch, blur: panelBlur, focus: panelFocus, pixel: panelPixel, grab: panelGrab, expand: panelExpand }[tool];
  p.append(...[build ? build() : null].flat().filter(Boolean));
  if (mode !== "full") p.append(h("p", { class: "full-link" }, h("button", { class: "linkish", onclick: () => switchToFull() }, "More tools: open the full photo editor →")));
}
function switchToFull() {
  mode = "full";
  tool = "adjust";
  setModeUi();
  showEditor();
  scheduleRender();
}

function panelCrop() {
  const f = frameDims();
  const presets = h("div", { class: "chips", role: "group", "aria-label": "Crop shape" },
    CROP_PRESETS.map((c) => chip(c.label, st.geom.aspect === c.id, () => {
      st.geom.aspect = c.id;
      const a = aspectValue();
      st.geom.crop = c.id === "free" ? st.geom.crop : aspectCrop(f.w, f.h, a);
      commit(); renderPanel();
    }, { "data-crop": c.id })));
  const turn = (dir) => {
    st.geom.rot = (st.geom.rot + (dir > 0 ? 90 : 270)) % 360;
    st.geom.crop = rotateCrop(st.geom.crop, dir);
    const a = CROP_PRESETS.find((c) => c.id === st.geom.aspect)?.aspect;
    if (typeof a === "number" && a !== 1) st.geom.aspect = "free";
    commit(); renderPanel();
  };
  const flip = (axis) => { if (axis === "x") st.geom.flipX = !st.geom.flipX; else st.geom.flipY = !st.geom.flipY; st.geom.crop = flipCrop(st.geom.crop, axis); commit(); };
  return [
    section("Shape", presets),
    section("Turn and flip", h("div", { class: "row" },
      h("button", { class: "btn", onclick: () => turn(-1), "aria-label": "Turn left 90°" }, "⟲ Left"),
      h("button", { class: "btn", onclick: () => turn(1), "aria-label": "Turn right 90°" }, "⟳ Right"),
      h("button", { class: "btn", onclick: () => flip("x"), "aria-label": "Flip left to right" }, "⇋ Flip"),
      h("button", { class: "btn", onclick: () => flip("y"), "aria-label": "Flip upside down" }, "⇵ Flip"))),
    section("Smart crop", h("p", { class: "hint" }, "Keeps the subject (or the most detailed part) inside the shape you picked."),
      h("button", { class: "btn wide", id: "smartCrop", onclick: doSmartCrop }, "Smart crop")),
    section("Straighten", slider({ id: "angle", label: "Angle", min: -45, max: 45, step: 0.5, value: st.geom.angle, fmt: (v) => `${v}°`,
      onInput: (v) => { st.geom.angle = v; scheduleRender({ draft: true }); }, onChange: () => { commit(); } })),
    section("Perspective",
      slider({ id: "perspv", label: "Vertical", min: -100, max: 100, value: st.geom.persp?.v || 0, onInput: (v) => { st.geom.persp = { h: st.geom.persp?.h || 0, v }; scheduleRender({ draft: true }); }, onChange: () => commit() }),
      slider({ id: "persph", label: "Horizontal", min: -100, max: 100, value: st.geom.persp?.h || 0, onInput: (v) => { st.geom.persp = { v: st.geom.persp?.v || 0, h: v }; scheduleRender({ draft: true }); }, onChange: () => commit() }),
      h("p", { class: "hint" }, "Straighten buildings and documents that lean in. Double-click a label to reset.")),
    h("div", { class: "row" },
      h("button", { class: "btn", onclick: () => { st.geom = { ...st.geom, rot: 0, flipX: false, flipY: false, angle: 0, crop: { ...FULL_CROP }, aspect: "free", persp: { h: 0, v: 0 } }; commit(); renderPanel(); } }, "Reset"),
      h("button", { class: "btn primary", onclick: () => setTool(mode === "full" ? "adjust" : mode) }, "Done")),
    h("p", { class: "hint" }, "Drag the box or its corners. Arrow keys move it."),
  ];
}

const AREAS = [["all", "Whole photo"], ["fg", "Foreground"], ["bg", "Background"], ["brush", "Brush"], ["click", "Click"]];
function panelAdjust() {
  const groups = { light: "Light", colour: "Colour", detail: "Details" };
  const out = [];
  const area = st.fx.area || "all";
  out.push(section("Apply to", h("div", { class: "chips", role: "group", "aria-label": "Apply the changes to" },
    AREAS.map(([id, label]) => chip(label, (ui.brushFor || area) === id, () => setArea(id), { "data-area": id }))), areaTools()));
  out.push(h("div", { class: "row" },
    h("button", { class: "btn", id: "autoAdjust", onclick: runAutoAdjust }, "Auto-adjust"),
    chip("Invert", !!st.fx.invert, () => { st.fx.invert = !st.fx.invert; commit(); renderPanel(); }, { id: "invertToggle" }),
    h("button", { class: "btn", id: "adjReset", onclick: () => { st.adjust = { ...NEUTRAL }; st.fx.invert = false; st.fx.area = "all"; st.fx.colors = []; ui.brushFor = null; clearBrush(); commit(); renderPanel(); } }, "Reset adjustments")));
  for (const [g, title] of Object.entries(groups)) {
    out.push(section(title, ADJUSTMENTS.filter((a) => a.group === g).map((a) => slider({ id: a.id, label: a.label, min: a.min, max: a.max, value: st.adjust[a.id] || 0,
      onInput: (v) => { st.adjust[a.id] = v; scheduleRender({ draft: true }); }, onChange: () => { commit(); } }))));
    if (g === "colour") out.push(photoColorsSection());
  }
  out.push(h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { st.adjust = { ...NEUTRAL }; commit(); renderPanel(); } }, "Reset all")));
  out.push(section("Copy style", h("p", { class: "hint" }, "Use this photo's look (light, colour, filter, effects, frame, shadow) on another photo."),
    h("div", { class: "row" },
      h("button", { class: "btn", id: "copyStyleBtn", onclick: copyStyle }, "Copy style"),
      h("button", { class: "btn", id: "pasteStyleBtn", disabled: !savedStyle(), onclick: pasteStyleNow }, "Paste style"))));
  return out;
}

/* ---------- Edit > Adjust: where the changes apply; one-tap fixes ---------- */
// Finds the subject (the background remover's cut-out) without changing the background, for Foreground / Background
// edits, background blur and auto focus.
async function findSubject({ quiet = false } = {}) {
  if (busy || !st) return false;
  if (st.cutout && pix.has(st.cutout)) return true;
  try {
    showBusy("Finding the subject…", 0, { quiet });
    const cut = await cutoutFor(st.pixels);
    st.cutout = newPix(cut);
    commit();
    hideBusy();
    return true;
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "The subject could not be found.", 5000);
    return false;
  }
}
function startBrush(kind) {
  ui.brushFor = ui.brushFor === kind ? null : kind;
  clearBrush();
  renderPanel();
  scheduleRender();
}
async function setArea(id) {
  if (id === "brush" || id === "click") { startBrush(id); return; }
  ui.brushFor = null; clearBrush();
  if ((id === "fg" || id === "bg") && !(await findSubject())) { renderPanel(); return; }
  st.fx.area = id;
  commit(); renderPanel(); scheduleRender();
  if (id !== "all") toast(`Changes now apply to the ${id === "fg" ? "foreground" : "background"} only.`);
}
function areaTools() {
  const kind = ui.brushFor;
  if (kind === "brush" || kind === "click") {
    return h("div", { class: "area-tools" },
      h("p", { class: "hint" }, kind === "brush" ? "Brush over the part you want to change, then press Use this area." : "Click the part you want to change (similar colours next to it are picked too). Click more places to add them."),
      kind === "brush" ? slider({ id: "brush", label: "Brush size", min: 8, max: 120, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } })
        : slider({ id: "clicktol", label: "Colour range", min: 5, max: 80, value: ui.clickTol, onInput: (v) => { ui.clickTol = v; } }),
      h("div", { class: "row" },
        h("button", { class: "btn primary", id: "areaUse", disabled: !ui.brushDirty, onclick: useBrushArea }, "Use this area"),
        h("button", { class: "btn", id: "areaClear", onclick: clearBrush }, "Clear"),
        h("button", { class: "btn", onclick: () => { ui.brushFor = null; clearBrush(); renderPanel(); scheduleRender(); } }, "Cancel")));
  }
  const a = st.fx.area || "all";
  return a === "all" ? null : h("p", { class: "hint", id: "areaNow" }, `The sliders below change the ${{ fg: "foreground", bg: "background", brush: "brushed area", click: "clicked area" }[a]} only.`);
}
function useBrushArea() {
  if (!ui.brushDirty) { toast("Brush or click on the photo first."); return; }
  st.fx.areaMask = newPix(brushMask());
  st.fx.area = ui.brushFor;
  ui.brushFor = null;
  clearBrush();
  commit(); renderPanel(); scheduleRender();
  toast("Changes now apply to that area only.");
}
function applyRefine() {
  if (!ui.brushDirty || !st.cutout) { toast("Brush over the edge first."); return; }
  const cut = getPix(st.cutout, "full"), orig = getPix(st.pixels, "full");
  const mask = resizeTo(brushMask(), cut.width, cut.height);
  const out = makeCanvas(cut.width, cut.height), x = out.getContext("2d");
  x.drawImage(cut, 0, 0);
  if (ui.brushFor === "refine-erase") { x.globalCompositeOperation = "destination-out"; x.drawImage(mask, 0, 0); }
  else {
    const t = makeCanvas(cut.width, cut.height), tx = t.getContext("2d");
    tx.drawImage(orig, 0, 0, cut.width, cut.height);
    tx.globalCompositeOperation = "destination-in"; tx.drawImage(mask, 0, 0);
    x.drawImage(t, 0, 0);
  }
  st.cutout = newPix(out);
  ui.brushFor = null;
  clearBrush();
  commit(); renderPanel(); scheduleRender();
  toast("Edges refined. Undo brings the earlier cut-out back.");
}
function runAutoAdjust() {
  const src = getPix(st.pixels, "prev");
  const small = scaleDown(src, 400), data = getData(small);
  let mask = null, inv = false;
  const a = st.fx.area || "all";
  if ((a === "fg" || a === "bg") && st.cutout) { mask = getData(resizeTo(getPix(st.cutout, "prev"), small.width, small.height)); inv = a === "bg"; }
  else if ((a === "brush" || a === "click") && st.fx.areaMask && pix.has(st.fx.areaMask)) mask = getData(resizeTo(getPix(st.fx.areaMask, "prev"), small.width, small.height));
  st.adjust = { ...NEUTRAL, ...autoAdjust(data, mask, inv) };
  commit(); renderPanel();
  toast("Auto-adjusted. Move any slider to fine-tune.");
}
function doSmartCrop() {
  const geom = { ...st.geom, crop: FULL_CROP };
  const src = sourceFor("prev", false);
  const g1 = geometryMatrix(src.width, src.height, geom, 1), k = Math.min(1, 360 / Math.max(g1.outW, g1.outH));
  const frame = drawGeometry(src, geom, k);
  let subject = null;
  if (st.cutout && pix.has(st.cutout)) { const m = getPix(st.cutout, "prev"); subject = alphaBox(getData(drawGeometry(m.width === src.width ? m : resizeTo(m, src.width, src.height), geom, k))); }
  const a = aspectValue();
  st.geom.crop = smartCrop(getData(frame), a, subject, a ? 1 : 0.85);
  commit(); renderPanel(); scheduleRender();
  toast(subject ? "Cropped around the subject." : "Cropped to keep the most detail.");
}

/* ---------- Edit > Effects ---------- */
async function focusEffect(kind) {
  if (kind === "focus") { await startFocus(); return; }
  if (!(await findSubject())) return;
  st.bg.removed = true; st.bg.mode = "blur"; st.bg.blur = 60;
  commit(); renderPanel(); scheduleRender();
  toast("Background blurred.");
}
function shadowControls() {
  const cut = st.bg.removed && st.cutout;
  if (!cut) {
    return h("div", { class: "row" }, chip("Floating card", st.frame.id === "shadow", () => { st.frame = { ...st.frame, id: st.frame.id === "shadow" ? "none" : "shadow" }; commit(); renderPanel(); }, { id: "fxShadow" }),
      h("span", { class: "hint" }, "Remove the background for a shadow under the subject."));
  }
  const sh = st.bg.shadow || { on: false, blur: 20, dist: 12, angle: 45, color: "#000000", alpha: 45 };
  const set = (k, v, live) => { st.bg.shadow = { ...sh, ...st.bg.shadow, [k]: v }; scheduleRender({ draft: !!live }); if (!live) commit(); };
  return h("div", {},
    h("div", { class: "row" }, chip("Shadow", !!sh.on, () => { st.bg.shadow = { ...sh, on: !sh.on }; commit(); renderPanel(); }, { id: "fxShadow" })),
    sh.on ? h("div", {},
      slider({ id: "shblur", label: "Blur", min: 0, max: 100, value: sh.blur, onInput: (v) => set("blur", v, true), onChange: (v) => set("blur", v) }),
      slider({ id: "shdist", label: "Distance", min: 0, max: 100, value: sh.dist, onInput: (v) => set("dist", v, true), onChange: (v) => set("dist", v) }),
      slider({ id: "shangle", label: "Angle", min: 0, max: 359, value: sh.angle, fmt: (v) => v + "°", onInput: (v) => set("angle", v, true), onChange: (v) => set("angle", v) }),
      slider({ id: "shalpha", label: "Strength", min: 0, max: 100, value: sh.alpha, fmt: (v) => v + "%", onInput: (v) => set("alpha", v, true), onChange: (v) => set("alpha", v) }),
      h("label", { class: "colour" }, "Colour ", h("input", { type: "color", value: sh.color, "aria-label": "Shadow colour", oninput: (e) => set("color", e.target.value, true), onchange: (e) => set("color", e.target.value) }))) : null);
}
function outlineControls() {
  if (!(st.bg.removed && st.cutout)) return null;
  const ol = st.bg.outline || { on: false, width: 8, color: "#ffffff" };
  const set = (k, v, live) => { st.bg.outline = { ...ol, ...st.bg.outline, [k]: v }; scheduleRender({ draft: !!live }); if (!live) commit(); };
  return h("div", {},
    h("div", { class: "row" }, chip("Sticker outline", !!ol.on, () => { st.bg.outline = { ...ol, on: !ol.on }; commit(); renderPanel(); }, { id: "fxOutline" })),
    ol.on ? h("div", {},
      slider({ id: "olw", label: "Width", min: 1, max: 30, value: ol.width, onInput: (v) => set("width", v, true), onChange: (v) => set("width", v) }),
      h("label", { class: "colour" }, "Colour ", h("input", { type: "color", value: ol.color, "aria-label": "Outline colour", oninput: (e) => set("color", e.target.value, true), onchange: (e) => set("color", e.target.value) }))) : null);
}
function panelEffects() {
  const fx = st.fx, duo = fx.duotone;
  const out = [];
  out.push(section("Duotone", h("div", { class: "duo-grid" },
    h("button", { class: "duo none" + (!duo ? " on" : ""), "data-duotone": "none", "aria-pressed": String(!duo), onclick: () => { st.fx.duotone = null; commit(); renderPanel(); } }, h("span", {}, "None")),
    DUOTONES.map((d) => h("button", { class: "duo" + (duo?.id === d.id ? " on" : ""), "data-duotone": d.id, title: d.name, "aria-label": `Duotone ${d.name}`, "aria-pressed": String(duo?.id === d.id),
      style: `background:linear-gradient(135deg, ${d.a}, ${d.b})`, onclick: () => { st.fx.duotone = { id: d.id, amount: duo?.amount ?? 100 }; commit(); renderPanel(); } }, h("span", {}, d.name)))),
    duo ? slider({ id: "duo", label: "Strength", min: 0, max: 100, value: duo.amount ?? 100, fmt: (v) => v + "%", onInput: (v) => { st.fx.duotone = { ...st.fx.duotone, amount: v }; scheduleRender({ draft: true }); }, onChange: () => commit() }) : null));
  out.push(section("Focus", h("div", { class: "row" },
    h("button", { class: "btn", id: "fxBgBlur", onclick: () => focusEffect("blur") }, "Blur the background"),
    h("button", { class: "btn", id: "fxAutoFocus", onclick: () => (st.fx.focus ? setTool("focus") : focusEffect("focus")) }, st.fx.focus ? "Auto focus settings" : "Auto focus"),
    h("button", { class: "btn", id: "fxBlurTool", onclick: () => setTool("blur") }, "Blur brush")),
    st.bg.removed && st.bg.mode === "blur" ? slider({ id: "bgblur", label: "Background blur", min: 5, max: 100, value: st.bg.blur, onInput: (v) => { st.bg.blur = v; scheduleRender({ draft: true }); }, onChange: () => commit() }) : null,
    h("p", { class: "hint" }, "Finds the subject on this device (the first time downloads a small model), then softens what is behind it.")));
  out.push(photoShadowSection());
  out.push(section("Shadow and outline", shadowControls(), outlineControls()));
  out.push(section("Transparency", slider({ id: "opacity", label: "Transparency", min: 0, max: 100, value: 100 - (fx.opacity ?? 100), fmt: (v) => v + "%",
    onInput: (v) => { st.fx.opacity = 100 - v; scheduleRender({ draft: true }); }, onChange: () => commit() }),
    h("p", { class: "hint" }, "See-through photos keep their transparency in PNG and WebP downloads.")));
  return out;
}

function panelFilters() {
  const grid = h("div", { class: "filter-grid", role: "listbox", "aria-label": "Filters" });
  const geo = geoStage(VIEW_MAX(), true);
  const small = scaleDown(geo.c, 132);
  const base = getData(small);
  for (const f of FILTERS) {
    const c = f.id === "none" ? small : fromData(applyFilter(base, f.id, 1));
    const tile = h("button", { class: "ftile" + (st.filter.id === f.id ? " on" : ""), role: "option", "aria-selected": String(st.filter.id === f.id), "data-filter": f.id,
      onclick: () => { st.filter = { id: f.id, intensity: st.filter.id === f.id ? st.filter.intensity : 100 }; commit(); renderPanel(); } });
    const cv = makeCanvas(c.width, c.height);
    cv.getContext("2d").drawImage(c, 0, 0);
    tile.append(cv, h("span", {}, f.name));
    grid.append(tile);
  }
  const out = [section("Filters", grid)];
  if (st.filter.id !== "none") out.push(section(null, slider({ id: "intensity", label: "Strength", min: 0, max: 100, value: st.filter.intensity, fmt: (v) => v + "%",
    onInput: (v) => { st.filter.intensity = v; scheduleRender({ draft: true }); }, onChange: () => commit() })));
  return out;
}

function addOverlay(o) {
  st.overlays.push(o);
  selId = o.id;
  commit();
  renderPanel();
}
/** The photo editor's part of the kit's Text panel: the selected text's words, font, colour, outline and box. */
function panelText() {
  const o = selOverlay();
  if (shell) {
    if (o?.type === "text") return [overlayProps(o)];
    return [h("p", { class: "hint", id: "textHint" }, st.overlays.some((x) => x.type === "text") ? "Click a text on the photo to change its words, font, colour, outline and box here." : "Add a text from this panel, then change its words, font, colour, outline and box here.")];
  }
  const brandFont = (k) => loadBrand().fonts?.[k] || "sans";
  const add = (props) => addOverlay(newOverlay("text", { family: brandFont("body"), ...props }));
  const out = [section("Text",
    h("button", { class: "text-add t-h", id: "addHeading", onclick: () => add({ text: "Add a heading", size: 0.1, bold: true, family: brandFont("heading") }) }, "Add a heading"),
    h("button", { class: "text-add t-s", id: "addSubheading", onclick: () => add({ text: "Add a subheading", size: 0.07, bold: true }) }, "Add a subheading"),
    h("button", { class: "text-add t-b", id: "addBody", onclick: () => add({ text: "Add a little bit of body text", size: 0.045, bold: false }) }, "Add a little bit of body text"),
    h("button", { class: "btn", id: "addText", onclick: () => add({ family: brandFont("heading") }) }, "T  Text box")),
  section("Text styles", h("div", { class: "style-grid" }, TEXT_STYLES.map((t) => h("button", { class: "style-tile", "data-style": t.id, onclick: () => add({ ...t.props, text: t.id === "quote" ? "“Your words”" : t.name }) },
    h("span", { style: `font-weight:${t.props.bold ? 800 : 500};${t.props.italic ? "font-style:italic;" : ""}color:${t.props.outline ? t.props.color : "#fff"};${t.props.bg ? `background:${t.props.bg};padding:2px 6px;` : ""}${t.props.outline ? `-webkit-text-stroke:1px ${t.props.outline};` : ""}` }, t.name)))))];
  if (o?.type === "text") out.push(overlayProps(o));
  else if (st.overlays.some((x) => x.type === "text")) out.push(h("p", { class: "hint" }, "Tap a text on the photo to change it."));
  return out;
}
function panelAdd() {
  if (shell && ui.addFocus === "text") return panelText();
  const o = selOverlay();
  const out = [];
  // In the editor frame the kit's Elements panel adds shapes, graphics, stickers and photos; this part keeps what only the
  // photo editor has: the selected item's settings and the frame round the photo itself.
  if (!shell) out.push(section("Add", h("div", { class: "row" },
    h("button", { class: "btn", id: "addText", onclick: () => addOverlay(newOverlay("text", { family: loadBrand().fonts?.heading || "sans" })) }, "T  Text"),
    h("button", { class: "btn", onclick: () => addOverlay(newOverlay("shape", { shape: "rect", fill: loadBrand().colors?.[0] || "#5b4cf0" })) }, "◼  Shape"),
    h("button", { class: "btn", onclick: () => { ui.showStickers = !ui.showStickers; renderPanel(); } }, "★  Stickers")),
    h("div", { class: "chips" }, TEXT_STYLES.map((t) => chip(t.name, false, () => addOverlay(newOverlay("text", { ...t.props, text: t.id === "quote" ? "“Your words”" : "Your text" })))))));
  if (o) out.push(overlayProps(o));
  else if (st.overlays.length) out.push(h("p", { class: "hint" }, "Tap something you added to change it."));
  if (ui.showStickers && !shell) out.push(stickerPicker());
  out.push(section(shell ? "Photo frame" : "Frame", h("div", { class: "chips" }, FRAMES.map((f) => chip(f.name, st.frame.id === f.id, () => { st.frame.id = f.id; commit(); renderPanel(); }, { "data-frame": f.id }))),
    st.frame.id !== "none" ? h("div", { class: "row" },
      h("label", { class: "colour" }, "Colour ", h("input", { type: "color", value: st.frame.color, "aria-label": "Frame colour", oninput: (e) => { st.frame.color = e.target.value; scheduleRender(); }, onchange: () => commit() })),
      slider({ id: "fw", label: "Width", min: 0, max: 12, step: 0.5, value: st.frame.width, onInput: (v) => { st.frame.width = v; scheduleRender({ draft: true }); }, onChange: () => commit() })) : null));
  return out;
}
function overlayProps(o) {
  const set = (k, v, live = false) => { o[k] = v; scheduleRender(); if (!live) commit(); };
  const kids = [];
  if (o.type === "text") {
    kids.push(h("textarea", { class: "ad-input text-input", id: "textInput", rows: 2, "aria-label": "Text", oninput: (e) => { o.text = e.target.value; scheduleRender(); }, onchange: () => commit() }, o.text));
    kids.push(h("div", { class: "row" },
      h("select", { class: "ad-input", "aria-label": "Font", onchange: (e) => set("family", e.target.value) }, Object.entries(FONT_FAMILIES).map(([k, f]) => h("option", { value: k, selected: o.family === k }, f.label))),
      h("label", { class: "colour" }, h("input", { type: "color", value: o.color, "aria-label": "Text colour", oninput: (e) => set("color", e.target.value, true), onchange: () => commit() })),
      chip("B", o.bold, () => { set("bold", !o.bold); renderPanel(); }, { "aria-label": "Bold" }),
      chip("I", o.italic, () => { set("italic", !o.italic); renderPanel(); }, { "aria-label": "Italic" })));
    kids.push(slider({ id: "tsize", label: "Size", min: 1, max: 40, step: 0.5, value: Math.round(o.size * 1000) / 10, onInput: (v) => { o.size = v / 100; scheduleRender(); }, onChange: () => commit() }));
    kids.push(h("div", { class: "chips" },
      ["left", "center", "right"].map((a) => chip({ left: "Left", center: "Centre", right: "Right" }[a], o.align === a, () => { set("align", a); renderPanel(); })),
      chip("Shadow", o.shadow, () => { set("shadow", !o.shadow); renderPanel(); }),
      chip("Outline", !!o.outline, () => { set("outline", o.outline ? null : "#1b2133"); renderPanel(); }),
      chip("Box", !!o.bg, () => { set("bg", o.bg ? null : "#1b2133"); renderPanel(); })));
    if (o.outline || o.bg) kids.push(h("div", { class: "row" },
      o.outline ? h("label", { class: "colour" }, "Outline ", h("input", { type: "color", value: o.outline, oninput: (e) => set("outline", e.target.value, true), onchange: () => commit() })) : null,
      o.bg ? h("label", { class: "colour" }, "Box ", h("input", { type: "color", value: o.bg, oninput: (e) => set("bg", e.target.value, true), onchange: () => commit() })) : null));
  } else if (o.type === "shape") {
    kids.push(h("div", { class: "chips" }, SHAPES.map((s) => chip(s.name, o.shape === s.id, () => { set("shape", s.id); renderPanel(); }))));
    kids.push(h("div", { class: "row" },
      h("label", { class: "colour" }, "Fill ", h("input", { type: "color", value: o.fill, oninput: (e) => set("fill", e.target.value, true), onchange: () => commit() })),
      h("label", { class: "colour" }, "Edge ", h("input", { type: "color", value: o.stroke, oninput: (e) => set("stroke", e.target.value, true), onchange: () => commit() }))));
    kids.push(slider({ id: "sw", label: "Edge width", min: 0, max: 5, step: 0.25, value: o.strokeWidth, onInput: (v) => { o.strokeWidth = v; scheduleRender(); }, onChange: () => commit() }));
  } else if (o.type === "image") {
    kids.push(h("p", { class: "hint" }, "Drag it anywhere; the corner handle resizes it, the top handle turns it."),
      h("div", { class: "row" }, chip("Flip", !!o.flipX, () => { set("flipX", !o.flipX); renderPanel(); }, { id: "grabFlip" })));
  } else if (o.type === "sticker" && o.recolor) {
    kids.push(h("div", { class: "row" }, ["c1", "c2"].map((k) => h("label", { class: "colour" }, k === "c1" ? "Main " : "Accent ",
      h("input", { type: "color", value: o.colors[k] || "#5b4cf0", oninput: (e) => { o.colors = { ...o.colors, [k]: e.target.value }; prepareOverlays([o]).then(() => scheduleRender()); }, onchange: () => commit() })))));
  }
  kids.push(slider({ id: "op", label: "Opacity", min: 5, max: 100, value: Math.round((o.opacity ?? 1) * 100), fmt: (v) => v + "%", onInput: (v) => { o.opacity = v / 100; scheduleRender(); }, onChange: () => commit() }));
  kids.push(slider({ id: "rot", label: "Turn", min: -180, max: 180, value: o.rotation || 0, fmt: (v) => v + "°", onInput: (v) => { o.rotation = v; scheduleRender(); }, onChange: () => commit() }));
  const i = st.overlays.indexOf(o);
  kids.push(h("div", { class: "row" },
    h("button", { class: "btn", "aria-label": "Bring forward", disabled: i === st.overlays.length - 1, onclick: () => { st.overlays.splice(i, 1); st.overlays.splice(i + 1, 0, o); commit(); renderPanel(); } }, "↑ Forward"),
    h("button", { class: "btn", "aria-label": "Send backward", disabled: i === 0, onclick: () => { st.overlays.splice(i, 1); st.overlays.splice(i - 1, 0, o); commit(); renderPanel(); } }, "↓ Back"),
    h("button", { class: "btn", onclick: () => addOverlay({ ...cloneState(o), id: uid(), x: Math.min(0.95, o.x + 0.04), y: Math.min(0.95, o.y + 0.04) }) }, "Duplicate"),
    h("button", { class: "btn danger", id: "deleteOverlay", onclick: () => removeSelected() }, "Delete")));
  return section(o.type === "text" ? "Text" : o.type === "shape" ? "Shape" : o.type === "image" ? (o.pixId && o.name && o.name !== "Grabbed object" ? "Picture" : "Grabbed object") : "Sticker", ...kids);
}
function removeSelected() {
  const o = selOverlay();
  if (!o) return;
  st.overlays = st.overlays.filter((x) => x !== o);
  selId = null;
  commit();
  renderPanel();
}
function stickerPicker() {
  const box = section("Stickers", h("p", { class: "hint" }, "Loading stickers…"));
  elementsLib().then((E) => {
    box.innerHTML = "<h3>Stickers</h3>";
    const grid = h("div", { class: "sticker-grid" });
    const fill = () => {
      grid.innerHTML = "";
      for (const el of E.searchElements(ui.stickerQuery, ui.stickerCat).slice(0, 60)) {
        const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(E.elementSvg(el, {}, 64));
        grid.append(h("button", { class: "stile", title: el.name, "aria-label": `Add sticker: ${el.name}`, onclick: async () => {
          const ar = el.vb[0] / el.vb[1], W = view.photoW, H = view.photoH;
          const w = 0.28, hh = (w * W) / ar / H;
          const o = newOverlay("sticker", { elId: el.id, w, h: hh, colors: {}, recolor: !!el.recolor });
          await stickerImage(o).catch(() => null);
          addOverlay(o);
        } }, h("img", { src, alt: "", loading: "lazy" })));
      }
      if (!grid.children.length) grid.append(h("p", { class: "hint" }, "No stickers match."));
    };
    box.append(h("div", { class: "row" },
      h("input", { class: "ad-input", type: "search", placeholder: "Search stickers", "aria-label": "Search stickers", value: ui.stickerQuery, oninput: (e) => { ui.stickerQuery = e.target.value; fill(); } }),
      h("select", { class: "ad-input", "aria-label": "Sticker group", onchange: (e) => { ui.stickerCat = e.target.value; fill(); } },
        h("option", { value: "all" }, "All"), E.CATEGORIES.map((c) => h("option", { value: c.id, selected: ui.stickerCat === c.id }, c.label)))), grid);
    fill();
  }).catch(() => { box.innerHTML = "<h3>Stickers</h3><p class='hint'>Stickers could not load. Please check your connection.</p>"; });
  return box;
}

const BG_LIMITS = "Runs on this device: photos up to 36 megapixels (16 on iPhone and iPad), JPG, PNG, WebP or HEIC. The first use downloads the model (about 19 MB with the engine); after that it also works offline. Hair, glass and busy edges may need a touch with Refine.";
const BG_SWATCHES = ["#ffffff", "#000000", "#f3f4fb", "#5b4cf0", "#2f80ff", "#14b8a6", "#22c55e", "#f59e0b", "#ff7a59", "#f43f5e", "#1f2937", "#fde68a"];
function panelBackground() {
  const simple = mode === "bg";
  const out = [];
  if (!st.bg.removed || !st.cutout) {
    out.push(section(simple ? "Step 2 · Remove the background" : "Background remover",
      h("p", { class: "hint", id: "bgLimits" }, BG_LIMITS),
      h("button", { class: "btn primary wide", id: "removeBg", onclick: runRemoveBackground }, st.cutout ? "Remove the background again" : "Remove background")));
    if (st.cutout) out.push(h("button", { class: "btn wide", onclick: () => { st.bg.removed = true; commit(); renderPanel(); } }, "Use the earlier cut-out"));
    out.push(bulkSection());
    return out;
  }
  const setBg = (patch, live = false) => { Object.assign(st.bg, patch); scheduleRender(); if (!live) { commit(); renderPanel(); } };
  out.push(section(simple ? "Step 3 · Pick a background" : "New background", h("div", { class: "chips", role: "group", "aria-label": "Background type" },
    chip("See-through", st.bg.mode === "transparent", () => setBg({ mode: "transparent" }), { "data-bg": "transparent" }),
    chip("Colour", st.bg.mode === "color", () => setBg({ mode: "color" }), { "data-bg": "color" }),
    chip("Blur", st.bg.mode === "blur", () => setBg({ mode: "blur" }), { "data-bg": "blur" }),
    chip("Picture", st.bg.mode === "image", () => $("#bgImageInput").click(), { "data-bg": "image" }))));
  if (st.bg.mode === "color") out.push(h("div", { class: "swatches" }, BG_SWATCHES.map((c) => h("button", { class: "sw" + (st.bg.color === c ? " on" : ""), style: `background:${c}`, "aria-label": `Background colour ${c}`, "data-color": c, onclick: () => setBg({ color: c }) })),
    h("label", { class: "colour" }, h("input", { type: "color", value: st.bg.color, "aria-label": "Any colour", oninput: (e) => setBg({ color: e.target.value }, true), onchange: () => { commit(); renderPanel(); } }))));
  if (st.bg.mode === "blur") out.push(slider({ id: "bgblur", label: "Blur", min: 5, max: 100, value: st.bg.blur, onInput: (v) => { st.bg.blur = v; scheduleRender({ draft: true }); }, onChange: () => commit() }));
  if (st.bg.mode === "image") out.push(h("button", { class: "btn", onclick: () => $("#bgImageInput").click() }, "Choose another picture"));
  out.push(h("div", { class: "row" }, chip("Show original", !!ui.showOriginal, () => toggleOriginal(), { id: "bgOriginal", title: "See the photo as it was (or hold \\)" })));
  out.push(section("Backdrops", h("p", { class: "hint" }, "Ready-made backgrounds in your brand colours."),
    h("div", { class: "chips", role: "group", "aria-label": "Backdrops" }, BACKDROP_CHIPS.map(([kind, label]) => chip(label, false, () => applyBackdrop(kind), { "data-backdrop": kind })))));
  out.push(section("Refine the edges", h("p", { class: "hint" }, "Brush where the cut-out took too much (Restore) or left some background (Erase), then press Apply."),
    h("div", { class: "row" },
      chip("Erase", ui.brushFor === "refine-erase", () => startBrush("refine-erase"), { id: "refineErase" }),
      chip("Restore", ui.brushFor === "refine-restore", () => startBrush("refine-restore"), { id: "refineRestore" })),
    /^refine/.test(ui.brushFor || "") ? h("div", {},
      slider({ id: "brush", label: "Brush size", min: 8, max: 120, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } }),
      h("div", { class: "row" },
        h("button", { class: "btn primary", id: "refineApply", onclick: applyRefine }, "Apply"),
        h("button", { class: "btn", onclick: () => { ui.brushFor = null; clearBrush(); renderPanel(); scheduleRender(); } }, "Cancel"))) : null));
  out.push(section("Shadow and outline", shadowControls(), outlineControls()));
  if (simple) {
    const solid = st.bg.mode !== "transparent";
    out.push(section("Step 4 · Download", h("div", { class: "row" },
      h("button", { class: "btn primary", id: "bgDownloadPng", onclick: () => doExport({ format: "png", size: "original", suffix: "-no-bg" }) }, "Download PNG"),
      solid ? h("button", { class: "btn", id: "bgDownloadJpg", onclick: () => doExport({ format: "jpg", quality: 0.92, size: "original", suffix: "-new-bg" }) }, "Download JPG") : null),
      h("p", { class: "hint" }, solid ? "PNG keeps every detail; JPG is smaller." : "PNG keeps the see-through background."),
      h("button", { class: "btn wide", id: "bgStudio", onclick: openInStudio }, "Use in a design")));
  }
  out.push(section("Describe a new background", h("p", { class: "hint", id: "bgGenNote" }, aiReady()
    ? "Type the scene you want behind the subject; AsaanDesk AI makes it (your photo is sent to it)."
    : "Making a background from a description needs AsaanDesk AI, which is coming soon. Meanwhile pick a colour, a backdrop or your own picture above."),
    h("button", { class: "btn wide", id: "bgGen", onclick: () => { ui.aiPrompt = ui.aiPrompt && /background/i.test(ui.aiPrompt) ? ui.aiPrompt : "Replace the background with "; setTool("ai"); } }, aiReady() ? "Describe a background…" : "Background from a description (coming soon)")));
  out.push(h("button", { class: "btn wide subtle", onclick: () => { st.bg.removed = false; commit(); renderPanel(); } }, "Bring back the original background"));
  out.push(bulkSection());
  out.push(h("p", { class: "hint", id: "bgLimitsAfter" }, BG_LIMITS));
  return out;
}
function bulkSection() {
  return section("Many photos at once", h("p", { class: "hint" }, "Pick up to 50 photos: each gets its background removed on this device and you get them back as see-through PNGs in one ZIP file."),
    h("button", { class: "btn wide", id: "bulkBg", onclick: () => $("#bulkInput").click() }, "Remove backgrounds from several photos"));
}
const BACKDROP_CHIPS = [["studio", "Studio"], ["gradient", "Gradient"], ["spotlight", "Spotlight"], ["podium", "Podium"], ["marble", "Marble"], ["clouds", "Sky"], ["bokeh", "Lights"], ["confetti", "Confetti"]];
async function applyBackdrop(kind) {
  if (!st?.cutout || busy) return;
  const cols = loadBrand().colors || [];
  const src = getPix(st.cutout, "full");
  const spec = { kind, c1: "#f3f4fb", c2: cols[0] || "#5b4cf0", c3: cols[3] || "#1b2133" };
  const c = await svgToCanvas(GALLERY.backdropSvg(spec, src.width, src.height, "bd"), src.width, src.height);
  st.bg.imageId = putPix("p" + uid(), c);
  st.bg.mode = "image";
  commit(); renderPanel();
}
/** Show the original photo over the result (a toggle; the Before button and the \\ key show it while held). */
function toggleOriginal(on = !ui.showOriginal) {
  ui.showOriginal = !!on;
  ui.before = ui.showOriginal;
  if (ui.before) paintBefore(); else if (ui.split) paintBefore(); else hideBefore();
  const b = $("#bgOriginal");
  if (b) { b.classList.toggle("on", ui.showOriginal); b.setAttribute("aria-pressed", String(ui.showOriginal)); }
}
async function setBgImage(file) {
  if (!file) return;
  try {
    const r = await decodeFile(file);
    st.bg.imageId = putPix("p" + uid(), scaleDown(r.canvas, 4000));
    st.bg.mode = "image";
    commit();
    renderPanel();
  } catch (e) { toast(e.message); }
}

/* ---------- Edit > Adjust > Photo colours: change one colour of the photo ---------- */
let paletteCache = { id: null, list: [] };
function photoColors() {
  if (paletteCache.id !== st.pixels) paletteCache = { id: st.pixels, list: photoPalette(getData(scaleDown(getPix(st.pixels, "prev"), 200)), 6) };
  return paletteCache.list;
}
const colorEdit = (hex) => (st.fx.colors || []).find((c) => c.hex === hex) || { hex, hue: 0, sat: 0, light: 0 };
function setColorEdit(hex, k, v, live = false) {
  const cur = { ...colorEdit(hex), [k]: v }, rest = (st.fx.colors || []).filter((c) => c.hex !== hex);
  st.fx.colors = cur.hue || cur.sat || cur.light ? [...rest, cur] : rest;
  scheduleRender({ draft: live });
  if (!live) commit();
}
function photoColorsSection() {
  const list = photoColors();
  if (!list.length) return null;
  if (!list.some((c) => c.hex === ui.colorSel)) ui.colorSel = list[0].hex;
  const sel = colorEdit(ui.colorSel), changed = (hex) => (st.fx.colors || []).some((c) => c.hex === hex);
  const sl = (id, k, label, min, fmt) => slider({ id, label, min, max: min === -180 ? 180 : 100, value: sel[k] || 0, fmt, onInput: (v) => setColorEdit(ui.colorSel, k, v, true), onChange: (v) => setColorEdit(ui.colorSel, k, v) });
  return section("Photo colours",
    h("p", { class: "hint" }, "The main colours in this photo. Pick one, then change just that colour (light and shaded parts of it change together)."),
    h("div", { class: "swatches", role: "group", "aria-label": "Photo colours" }, list.map((c) => h("button", {
      class: "sw" + (ui.colorSel === c.hex ? " on" : "") + (changed(c.hex) ? " changed" : ""), style: `background:${c.hex}`, "data-photo-color": c.hex,
      "aria-label": `Photo colour ${c.hex}${changed(c.hex) ? " (changed)" : ""}`, "aria-pressed": String(ui.colorSel === c.hex), title: c.hex, onclick: () => { ui.colorSel = c.hex; renderPanel(); } }))),
    sl("pchue", "hue", "Hue", -180, (v) => v + "°"), sl("pcsat", "sat", "Saturation", -100), sl("pclight", "light", "Brightness", -100),
    (st.fx.colors || []).length ? h("button", { class: "btn", id: "pcReset", onclick: () => { st.fx.colors = []; commit(); renderPanel(); } }, "Reset colours") : null);
}

/* ---------- copy style: one photo's look onto another ---------- */
const STYLE_KEY = "asaandesk-photo-style";
function savedStyle() { try { return JSON.parse(localStorage.getItem(STYLE_KEY) || "null"); } catch { return null; } }
function copyStyle() {
  if (!st) { toast("Open a photo first."); return; }
  try { localStorage.setItem(STYLE_KEY, JSON.stringify({ ...styleOf(st), from: fileName })); } catch { toast("This browser would not keep the style (storage is full or blocked)."); return; }
  syncStyleButtons();
  toast("Style copied: light, colour, filter, effects, frame and shadow. Open another photo and press Paste style.", 5200);
}
async function pasteStyleNow() {
  if (!st || busy) return;
  const s = savedStyle();
  if (!s) { toast("Copy a style first: open a photo you like and press Copy style."); return; }
  if (!pasteStyle(st, s)) { toast("That copied style could not be used."); return; }
  commit(); renderPanel();
  if (st.fx.focus && !(st.cutout && pix.has(st.cutout))) await findSubject({ quiet: true });
  toast(`Style pasted${s.from ? ` from “${s.from}”` : ""}. Undo takes it off.`);
}
function syncStyleButtons() { const has = !!savedStyle(); for (const id of ["#pasteStyle", "#pasteStyleBtn"]) { const b = $(id); if (b) b.disabled = !has; } }

/* ---------- Tools > Face retouch ---------- */
function panelRetouch() {
  const v = st.fx.retouch || 0;
  return [section("Face retouch",
    h("p", { class: "hint" }, "Smooths skin and small spots and evens the skin tone; eyes, lips and hair stay sharp. Works best on portraits. Skin is found by its colour, on this device."),
    slider({ id: "retouch", label: "Smooth skin", min: 0, max: 100, value: v, fmt: (x) => x + "%", onInput: (x) => { st.fx.retouch = x; scheduleRender({ draft: true }); }, onChange: () => { commit(); renderPanel(); } }),
    h("div", { class: "row" },
      v ? null : h("button", { class: "btn primary", id: "retouchGo", onclick: () => { st.fx.retouch = 50; commit(); renderPanel(); } }, "Retouch"),
      v ? h("button", { class: "btn", id: "retouchOff", onclick: () => { st.fx.retouch = 0; commit(); renderPanel(); } }, "Remove effect") : null))];
}

/* ---------- Tools > Blur (brush or whole photo) ---------- */
function setBlurBrush(kind) { ui.brushFor = kind; clearBrush(); renderPanel(); scheduleRender(); }
function panelBlur() {
  const b = st.fx.blur, tab = ui.blurTab || "brush", amount = b?.amount ?? 50;
  const setAmount = (v, live) => { st.fx.blur = { mask: b?.mask || null, amount: v }; scheduleRender({ draft: live }); if (!live) commit(); };
  const out = [section("Blur", h("div", { class: "chips", role: "tablist", "aria-label": "Blur" },
    chip("Brush", tab === "brush", () => { ui.blurTab = "brush"; setBlurBrush("blur-add"); }, { "data-blur-tab": "brush" }),
    chip("Whole photo", tab === "whole", () => { ui.blurTab = "whole"; ui.brushFor = null; clearBrush(); renderPanel(); scheduleRender(); }, { "data-blur-tab": "whole" })),
    slider({ id: "blurAmt", label: "Intensity", min: 1, max: 100, value: amount, onInput: (v) => setAmount(v, true), onChange: (v) => setAmount(v) }))];
  if (tab === "brush") {
    out.push(section(null,
      h("div", { class: "row" },
        chip("Blur brush", ui.brushFor === "blur-add", () => setBlurBrush("blur-add"), { id: "blurBrush" }),
        chip("Remove", ui.brushFor === "blur-remove", () => setBlurBrush("blur-remove"), { id: "blurRemove", title: "Brush over blurred parts to make them sharp again" }),
        chip("See the result", !ui.brushFor, () => setBlurBrush(null), { id: "blurView" })),
      slider({ id: "brush", label: "Brush size", min: 8, max: 160, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } }),
      h("p", { class: "hint" }, "Drag over the parts to blur. Each stroke blurs at once; Undo takes it back.")));
  } else {
    out.push(section(null, h("div", { class: "row" },
      h("button", { class: "btn primary", id: "blurWhole", onclick: () => { st.fx.blur = { amount, mask: paintMask(null, { full: true }) }; commit(); renderPanel(); } }, "Blur the whole photo")),
      h("p", { class: "hint" }, "Tip: blur the whole photo, then use Brush > Remove over the subject to bring it back into focus.")));
  }
  if (b?.mask) out.push(h("button", { class: "btn wide subtle", id: "blurOff", onclick: () => { st.fx.blur = null; ui.brushFor = tab === "brush" ? "blur-add" : null; clearBrush(); commit(); renderPanel(); } }, "Remove blur"));
  return out;
}

/* ---------- Tools > Auto focus ---------- */
async function startFocus() {
  if (!(await findSubject())) return;
  st.fx.focus = { blur: 50, pos: 0 };
  commit(); renderPanel();
  toast("Auto focus: the subject is sharper and the background softer.");
}
function panelFocus() {
  const f = st.fx.focus;
  if (!f) return [section("Auto focus",
    h("p", { class: "hint" }, "Keeps the subject sharp and softly blurs what is behind it, like a camera with a wide-open lens. The subject is found on this device (the first time downloads a small model)."),
    h("button", { class: "btn primary wide", id: "focusGo", onclick: startFocus }, "Auto focus"))];
  const set = (k, v, live) => { st.fx.focus = { ...st.fx.focus, [k]: v }; scheduleRender({ draft: live }); if (!live) commit(); };
  return [section("Auto focus",
    slider({ id: "focusBlur", label: "Blur intensity", min: 1, max: 100, value: f.blur, onInput: (v) => set("blur", v, true), onChange: (v) => set("blur", v) }),
    slider({ id: "focusPos", label: "Focus position", min: 0, max: 100, value: f.pos ?? 0, fmt: (v) => (v < 15 ? "Subject" : v > 85 ? "Far" : v + "%"), onInput: (v) => set("pos", v, true), onChange: (v) => set("pos", v) }),
    h("p", { class: "hint" }, "Focus position picks what stays sharp: the subject (left) or things further back (right). Depth is estimated from the subject and the picture's layout."),
    h("button", { class: "btn", id: "focusOff", onclick: () => { st.fx.focus = null; commit(); renderPanel(); } }, "Remove Auto focus"))];
}

/* ---------- Tools > Pixel eraser ---------- */
function panelPixel() {
  const k = ui.brushFor === "pixel-restore" ? "pixel-restore" : "pixel-erase";
  return [section("Pixel eraser",
    h("p", { class: "hint" }, "Drag to make parts of the photo see-through; Restore brings them back. Each stroke counts at once; Undo takes it back."),
    h("div", { class: "row" },
      chip("Erase", k === "pixel-erase", () => { ui.brushFor = "pixel-erase"; clearBrush(); renderPanel(); scheduleRender(); }, { id: "pixelErase" }),
      chip("Restore", k === "pixel-restore", () => { ui.brushFor = "pixel-restore"; clearBrush(); renderPanel(); scheduleRender(); }, { id: "pixelRestore" })),
    slider({ id: "brush", label: "Brush size", min: 4, max: 160, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } }),
    h("div", { class: "row" },
      st.fx.eraseMask ? h("button", { class: "btn", id: "pixelReset", onclick: () => { st.fx.eraseMask = null; commit(); renderPanel(); } }, "Restore everything") : null,
      h("button", { class: "btn primary", id: "pixelDone", onclick: () => setTool(mode === "full" ? "adjust" : mode) }, "Done")),
    h("p", { class: "hint" }, "See-through parts stay see-through in PNG and WebP downloads (JPG makes them white)."))];
}

/* ---------- Tools > Magic eraser: brush, click, foreground or text ---------- */
const ERASE_MODES = [["brush", "Brush"], ["click", "Click"], ["fg", "Foreground"], ["text", "Text"]];
async function setEraseMode(m) {
  ui.eraseMode = m;
  ui.brushFor = m === "click" ? "erase-click" : null;
  clearBrush();
  renderPanel(); scheduleRender();
  if (m === "fg") await selectForeground();
  else if (m === "text") await selectText();
}
// paints a mask (alpha per pixel, photo-sized RGBA image) on the brush canvas in the brush colour
function paintSelection(mask) {
  const b = $("#brush"), c = fromData(mask), t = makeCanvas(b.width, b.height), tx = t.getContext("2d");
  tx.drawImage(c, 0, 0, b.width, b.height);
  tx.globalCompositeOperation = "source-in"; tx.fillStyle = "rgb(255, 60, 90)"; tx.fillRect(0, 0, t.width, t.height);
  b.getContext("2d").drawImage(t, 0, 0);
  ui.brushDirty = true;
  for (const id of ["#eraseGo", "#grabGo"]) { const btn = $(id); if (btn) btn.disabled = false; }
}
async function selectForeground() {
  if (!(await findSubject())) return;
  await renderNow();
  paintSelection(getData(getPix(st.cutout, "prev")));
  toast("The main subject is selected. Press Erase to remove it.");
}
let OCR = null;
async function selectText() {
  if (busy) return;
  try {
    showBusy("Finding the text in the photo…", 0);
    OCR ||= Promise.all([import("../layers/browser.js"), import("../layers/build.js")]).catch((e) => { OCR = null; throw e; });
    const [BR, B] = await OCR;
    const src = getPix(st.pixels, "prev"), img = getData(src);
    const data = await BR.ocr(src, (p) => setBusy(p.message, p.total ? p.loaded / p.total : null));
    const pieces = B.ocrLines(data).flatMap((l) => B.splitLine(l)).map((seg) => ({ box: seg.box, ...B.sampleTextColors(img, seg.box) })).filter((p) => p.contrast >= 30)
      .map((p) => ({ box: p.box, ink: p.ink, paper: p.paper }));
    hideBusy();
    if (!pieces.length) { toast("No text was found in this photo. Brush over it instead.", 4500); return; }
    const ink = B.inkMask(img, pieces), m = makeCanvas(src.width, src.height).getContext("2d").createImageData(src.width, src.height);
    for (let i = 0; i < ink.length; i++) if (ink[i]) m.data[i * 4 + 3] = 255;
    await renderNow();
    paintSelection(m);
    toast(`${pieces.length} line${pieces.length > 1 ? "s" : ""} of text selected. Press Erase to remove ${pieces.length > 1 ? "them" : "it"}.`);
  } catch (e) {
    console.error(e);
    hideBusy();
    toast("The text reader could not start (it downloads once, about 10 MB). Brush over the text instead.", 5200);
  }
}
function panelErase() {
  const m = ui.eraseMode || "brush";
  const from = ui.eraseFrom;
  return [
    section("Magic eraser", h("div", { class: "chips", role: "group", "aria-label": "Select by" }, ERASE_MODES.map(([id, label]) => chip(label, m === id, () => setEraseMode(id), { "data-erase-mode": id }))),
      h("p", { class: "hint" }, { brush: "Brush over a person, object or text you want gone, then press Erase. It is filled in with what is around it.", click: "Click the things you want gone (similar colours next to the click are picked too). Click more places to add them.",
        fg: "The main subject is selected. Press Erase to remove it and fill in behind it.", text: "The text in the photo is selected letter by letter. Press Erase to remove it." }[m]),
      m === "brush" ? slider({ id: "brush", label: "Brush size", min: 8, max: 120, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } })
        : m === "click" ? slider({ id: "clicktol", label: "Colour range", min: 5, max: 80, value: ui.clickTol, onInput: (v) => { ui.clickTol = v; } }) : null,
      h("div", { class: "row" },
        h("button", { class: "btn primary", id: "eraseGo", disabled: !ui.brushDirty, onclick: runErase }, "Erase"),
        h("button", { class: "btn", id: "eraseDeselect", onclick: clearBrush }, "Deselect"),
        from && from.pixels !== st.pixels ? h("button", { class: "btn", id: "eraseReset", onclick: () => { st.pixels = from.pixels; st.cutout = from.cutout; clearBrush(); commit(); renderPanel(); toast("The erased things are back."); } }, "Reset edits") : null),
      h("p", { class: "hint" }, "Works best on small things; if something is still there, erase a slightly bigger area. The first use downloads the eraser model (about 42 MB with the engine).")),
  ];
}

/* ---------- Tools > Magic Grab: lift a thing out of the photo, fill in behind it ---------- */
function panelGrab() {
  const click = ui.brushFor === "grab-click";
  return [section("Magic Grab",
    h("p", { class: "hint" }, "Select a person or thing; it becomes its own layer you can move, resize and turn, and the photo is filled in behind it."),
    h("div", { class: "chips", role: "group", "aria-label": "Select by" },
      chip("Brush", !click, () => { ui.brushFor = "grab"; clearBrush(); renderPanel(); scheduleRender(); }, { "data-grab-mode": "brush" }),
      chip("Click", click, () => { ui.brushFor = "grab-click"; clearBrush(); renderPanel(); scheduleRender(); }, { "data-grab-mode": "click" })),
    click ? slider({ id: "clicktol", label: "Colour range", min: 5, max: 80, value: ui.clickTol, onInput: (v) => { ui.clickTol = v; } })
      : slider({ id: "brush", label: "Brush size", min: 8, max: 160, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } }),
    h("div", { class: "row" },
      h("button", { class: "btn primary", id: "grabGo", disabled: !ui.brushDirty, onclick: runGrab }, "Grab"),
      h("button", { class: "btn", id: "grabDeselect", onclick: clearBrush }, "Deselect")),
    h("p", { class: "hint" }, "The outline is tidied with the background remover's model and the gap filled with the eraser's model, both on this device (downloaded once). Undo puts it all back."))];
}
/** Grows an alpha mask canvas by r px (draws it shifted round a circle). */
function growMask(c, r) {
  if (r < 1) return c;
  const out = makeCanvas(c.width, c.height), x = out.getContext("2d"), n = Math.max(8, Math.min(24, Math.round(r)));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; x.drawImage(c, Math.cos(a) * r, Math.sin(a) * r); }
  x.drawImage(c, 0, 0);
  return out;
}
async function runGrab() {
  if (busy || !st) return;
  if (!ui.brushDirty) { toast("Brush over or click the thing you want to grab first."); return; }
  try {
    showBusy("Grabbing…", 0);
    const T = await imagetools();
    const full = getPix(st.pixels, "full"), W = full.width, H = full.height;
    const sel = resizeTo(brushMask(), W, H);
    const nb = alphaBox(getData(scaleDown(sel, 600)));
    if (!nb) throw new Error("Nothing is selected yet.");
    // the background remover's model on the selected part (with a margin) finds the thing's real outline
    const mx = 0.15 * nb.w * W + 8, my = 0.15 * nb.h * H + 8;
    const bx = Math.max(0, Math.floor(nb.x * W - mx)), by = Math.max(0, Math.floor(nb.y * H - my));
    const bw = Math.min(W, Math.ceil((nb.x + nb.w) * W + mx)) - bx, bh = Math.min(H, Math.ceil((nb.y + nb.h) * H + my)) - by;
    const crop = makeCanvas(bw, bh); crop.getContext("2d").drawImage(full, bx, by, bw, bh, 0, 0, bw, bh);
    setBusy("Finding the outline…");
    const cut = await T.removeBackground(crop, { onProgress: progressToBusy });
    const near = growMask(sel, Math.max(4, Math.round(Math.max(bw, bh) * 0.04)));
    const alpha = makeCanvas(W, H), ax = alpha.getContext("2d");
    ax.drawImage(cut, bx, by);
    ax.globalCompositeOperation = "destination-in"; ax.drawImage(near, 0, 0);
    // the model found little inside the selection (not a clear "thing"): use the selection itself
    const cnt = (c) => { const d = getData(scaleDown(c, 400)).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i] > 127; return n; };
    const useSel = cnt(alpha) < 0.25 * cnt(sel);
    const shape = useSel ? sel : alpha;
    const obj = makeCanvas(W, H), ox = obj.getContext("2d");
    ox.drawImage(shape, 0, 0); ox.globalCompositeOperation = "source-in"; ox.drawImage(full, 0, 0);
    setBusy("Filling in behind it…", 0);
    const filled = await T.magicErase(full, growMask(shape, Math.max(2, Math.round(Math.max(W, H) / 400))), { onProgress: progressToBusy });
    // the grabbed thing as it looks in the photo now (turn, crop and colour edits), cut to its own box
    let g = drawGeometry(obj, st.geom, 1);
    if (hasOps(st)) g = fromData((await runJob("render", getData(g), { adjust: st.adjust, filter: st.filter, fx: { ...st.fx, area: "all" }, seed: 7 })).img);
    const ob = alphaBox(getData(g));
    if (!ob) throw new Error("The grabbed part is outside the crop. Try again with Crop reset.");
    const px = Math.floor(ob.x * g.width), py = Math.floor(ob.y * g.height), pw = Math.ceil(ob.w * g.width), ph = Math.ceil(ob.h * g.height);
    const piece = makeCanvas(pw, ph); piece.getContext("2d").drawImage(g, px, py, pw, ph, 0, 0, pw, ph);
    st.pixels = newPix(filled);
    if (st.cutout) { setBusy("Updating the cut-out…"); st.cutout = newPix(await cutoutFor(st.pixels)); }
    const o = newOverlay("image", { pixId: newPix(piece), x: (px + pw / 2) / g.width, y: (py + ph / 2) / g.height, w: pw / g.width, h: ph / g.height });
    st.overlays.push(o);
    selId = o.id;
    ui.brushFor = null;
    clearBrush();
    commit();
    hideBusy();
    setTool("add");
    toast(useSel ? "Grabbed (as brushed). Drag it anywhere, resize it with the corner handle." : "Grabbed. Drag it anywhere, resize it with the corner handle; Undo puts it back.", 5200);
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "Magic Grab could not finish. Nothing was changed.", 5000);
  }
}

/* ---------- Tools > Magic Expand: more photo round the edges ---------- */
const EXPAND_SIZES = [["1:1", 1, "Square 1:1"], ["4:5", 4 / 5, "Portrait 4:5"], ["9:16", 9 / 16, "Story 9:16"], ["16:9", 16 / 9, "Wide 16:9"], ["4:3", 4 / 3, "Landscape 4:3"], ["3:2", 3 / 2, "Photo 3:2"]];
function expandTarget() {
  const s = ui.expandTo || "all";
  if (s === "all") return { all: ui.expandAll ?? 30 };
  const a = EXPAND_SIZES.find((x) => x[0] === s)?.[1] || 1;
  return st.geom.rot % 180 ? 1 / a : a; // sizes are as you see the photo (turned 90° swaps them)
}
function panelExpand() {
  const s = ui.expandTo || "all", full = getPix(st.pixels, "full");
  const p = expandPad(full.width, full.height, expandTarget(), PIXEL_LIMIT);
  return [section("Magic Expand",
    h("p", { class: "hint" }, "Makes the photo bigger and fills the new space from what is at its edges, on this device with the eraser's model."),
    h("div", { class: "chips", role: "group", "aria-label": "Expand to" },
      chip("Every side", s === "all", () => { ui.expandTo = "all"; renderPanel(); }, { "data-expand": "all" }),
      EXPAND_SIZES.map(([id, , label]) => chip(label, s === id, () => { ui.expandTo = id; renderPanel(); }, { "data-expand": id }))),
    s === "all" ? slider({ id: "expandAll", label: "Bigger by", min: 10, max: 100, value: ui.expandAll ?? 30, fmt: (v) => v + "%", onInput: (v) => { ui.expandAll = v; const q = expandPad(full.width, full.height, { all: v }, PIXEL_LIMIT); const el = $("#expandSize"); if (el) el.textContent = q ? `${full.width}×${full.height} → ${q.width}×${q.height} px` : "Too big for this device."; } }) : null,
    h("p", { class: "hint", id: "expandSize" }, p ? `${full.width}×${full.height} → ${p.width}×${p.height} px` : "The photo already has this shape (or the result would be too big)."),
    h("button", { class: "btn primary wide", id: "expandGo", disabled: !p, onclick: () => runExpand() }, "Expand"),
    h("p", { class: "hint" }, "Best on skies, walls, grass and water. Faces, hands and busy patterns at the edge may look smeared; Undo takes it back."))];
}
/** A canvas grown by pad (the old picture in the middle, the new space empty). */
function padCanvas(c, p, W, H) {
  const out = makeCanvas(p.width, p.height), sx = p.width / (W + p.left + p.right), sy = p.height / (H + p.top + p.bottom);
  out.getContext("2d").drawImage(c, p.left * sx, p.top * sy, W * sx, H * sy);
  return out;
}
async function runExpand(target = expandTarget()) {
  if (busy || !st) return;
  const full = getPix(st.pixels, "full"), W = full.width, H = full.height;
  const p = expandPad(W, H, target, PIXEL_LIMIT);
  if (!p) { toast("The photo already has that shape, or the result would be too big. Pick another size."); return; }
  try {
    showBusy("Getting Magic Expand ready…", 0);
    const T = await imagetools();
    // starting point: the photo's own colours stretched into the new space, then the model fills it in
    const big = makeCanvas(p.width, p.height), x = big.getContext("2d");
    x.drawImage(blurredCopy(full, 80), 0, 0, p.width, p.height);
    x.drawImage(full, p.left, p.top);
    const mask = makeCanvas(p.width, p.height), mx = mask.getContext("2d");
    mx.fillStyle = "#000"; mx.fillRect(0, 0, p.width, p.height);
    mx.clearRect(p.left + 1, p.top + 1, W - 2, H - 2);
    const out = await T.magicErase(big, mask, { onProgress: progressToBusy });
    // masks and the cut-out grow with the photo (nothing painted / see-through in the new space)
    const grow = (id) => (id && pix.has(id) ? newPix(padCanvas(getPix(id, "full"), p, W, H)) : id);
    st.pixels = newPix(out);
    st.cutout = grow(st.cutout);
    st.fx.areaMask = grow(st.fx.areaMask);
    st.fx.eraseMask = grow(st.fx.eraseMask);
    if (st.fx.blur?.mask) st.fx.blur = { ...st.fx.blur, mask: grow(st.fx.blur.mask) };
    st.geom = { ...st.geom, crop: { ...FULL_CROP }, aspect: "free" };
    commit();
    hideBusy();
    renderPanel();
    toast(`Expanded to ${p.width}×${p.height} px. Undo takes it back.`);
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "Magic Expand could not finish. Nothing was changed.", 5000);
  }
}

/* ---------- Background remover for many photos at once ---------- */
async function bulkRemove(files) {
  files = [...(files || [])].filter((f) => /^image\//.test(f.type) || /\.(hei[cf]|jpe?g|png|webp)$/i.test(f.name || "")).slice(0, 50);
  if (!files.length || busy) return;
  const done = [], failed = [];
  try {
    showBusy(`Removing backgrounds: 0 of ${files.length}…`, 0);
    const T = await imagetools();
    for (let i = 0; i < files.length; i++) {
      setBusy(`Removing backgrounds: ${i + 1} of ${files.length}…`, i / files.length);
      try {
        const r = await decodeFile(files[i]);
        const cut = await T.removeBackground(r.canvas);
        const blob = await toBlob(cut, "image/png");
        done.push({ name: safeName((files[i].name || `photo-${i + 1}`).replace(/\.[^.]+$/, "") + "-no-bg.png"), data: new Uint8Array(await blob.arrayBuffer()) });
      } catch (e) { console.error(e); failed.push(files[i].name || `photo ${i + 1}`); }
    }
    // the same name twice gets a number
    const seen = new Map();
    for (const f of done) { const n = seen.get(f.name) || 0; seen.set(f.name, n + 1); if (n) f.name = f.name.replace(/\.png$/, `-${n + 1}.png`); }
    hideBusy();
    if (!done.length) { toast("None of the photos could be done. Please try JPG or PNG photos.", 5000); return; }
    if (done.length === 1) download(new Blob([done[0].data], { type: "image/png" }), done[0].name);
    else download(new Blob([zipFiles(done)], { type: "application/zip" }), "photos-no-background.zip");
    ui.lastBulk = { done: done.length, failed: failed.length };
    toast(`Backgrounds removed: ${done.length} of ${files.length}${failed.length ? ` (could not open: ${failed.slice(0, 3).join(", ")})` : ""}.`, 6000);
  } catch (e) {
    console.error(e);
    hideBusy();
    toast(e.message || "The background remover could not start.", 5000);
  }
}

/* ---------- Edit > Shadows (round the whole photo) ---------- */
function photoShadowSection() {
  const sh = st.frame.shadow;
  const pick = (d) => { st.frame = { ...st.frame, shadow: d ? { id: d.id, blur: d.blur, dist: d.dist, dir: d.dir, amount: d.amount, color: sh?.color || "#000000" } : null }; commit(); renderPanel(); };
  const set = (k, v, live) => { st.frame = { ...st.frame, shadow: { ...st.frame.shadow, [k]: v } }; scheduleRender({ draft: !!live }); if (!live) commit(); };
  const d = sh && shadowById(sh.id);
  return section("Shadows",
    h("div", { class: "chips", role: "group", "aria-label": "Shadow style" }, chip("None", !sh, () => pick(null), { "data-shadow": "none" }),
      SHADOWS.map((s) => chip(s.name, sh?.id === s.id, () => pick(s), { "data-shadow": s.id }))),
    sh && d ? h("div", {},
      sh.id !== "block" ? slider({ id: "psblur", label: "Blur", min: 0, max: 100, value: sh.blur, onInput: (v) => set("blur", v, true), onChange: (v) => set("blur", v) }) : null,
      ["drop", "block", "angled"].includes(sh.id) ? slider({ id: "psdir", label: "Direction", min: 0, max: 359, value: sh.dir, fmt: (v) => v + "°", onInput: (v) => set("dir", v, true), onChange: (v) => set("dir", v) }) : null,
      sh.id !== "glow" ? slider({ id: "psdist", label: "Distance", min: 0, max: 100, value: sh.dist, onInput: (v) => set("dist", v, true), onChange: (v) => set("dist", v) }) : null,
      slider({ id: "psamount", label: "Intensity", min: 0, max: 100, value: sh.amount, fmt: (v) => v + "%", onInput: (v) => set("amount", v, true), onChange: (v) => set("amount", v) }),
      h("label", { class: "colour" }, "Colour ", h("input", { type: "color", value: sh.color || "#000000", "aria-label": "Shadow colour", oninput: (e) => set("color", e.target.value, true), onchange: (e) => set("color", e.target.value) })),
      h("p", { class: "hint" }, "The shadow adds space round the photo; it stays see-through in PNG downloads.")) : null);
}

function panelEnhance() {
  const e = ui.enhance;
  const set = (k, v) => { e[k] = v; renderPanel(); };
  const out = [section(mode === "enhance" ? "Image enhancer" : "Enhance",
    h("p", { class: "hint" }, "Sharper, cleaner and bigger, worked out on this device."),
    h("div", { class: "field" }, h("span", {}, "Upscale"), h("div", { class: "chips", role: "group", "aria-label": "Upscale" }, ["auto", 1, 2, 4].map((s) => chip(s === "auto" ? "Auto" : s === 1 ? "Same size" : `${s}×`, e.scale === s, () => set("scale", s), { "data-scale": s, title: s === "auto" ? "Picks 4× for small pictures, 2× for medium ones, and only cleans up big ones" : null })))),
    slider({ id: "denoise", label: "Clean noise", min: 0, max: 100, value: e.denoise, onInput: (v) => { e.denoise = v; } }),
    slider({ id: "sharpen-e", label: "Sharpen", min: 0, max: 100, value: e.sharpen, onInput: (v) => { e.sharpen = v; } }),
    h("div", { class: "chips" },
      chip("Auto colour", e.autoColor, () => set("autoColor", !e.autoColor)),
      chip("Auto contrast", e.autoContrast, () => set("autoContrast", !e.autoContrast)),
      chip("Face-safe", e.faceSafe, () => set("faceSafe", !e.faceSafe), { title: "Softer sharpening on skin" })),
    h("button", { class: "btn primary wide", id: "enhanceGo", onclick: runEnhance }, "Enhance photo")),
    section("Light and colour",
      ...[["brightness", "Brightness", "ebright"], ["contrast", "Contrast", "econtrast"], ["saturation", "Saturation", "esat"]].map(([k, label, id]) => slider({ id, label, min: -100, max: 100, value: st.adjust[k] || 0,
        onInput: (v) => { st.adjust[k] = v; scheduleRender({ draft: true }); }, onChange: () => commit() })),
      h("div", { class: "row" },
        h("button", { class: "btn", id: "enhAuto", onclick: runAutoAdjust }, "Auto colour and light"),
        h("button", { class: "btn", id: "enhFilters", onclick: () => openEdit("filters") }, "Filters…")))];
  const src = getPix(st.pixels, "full");
  if (src) {
    const want = pickScale(src.width, src.height, e.scale), s = safeScale(src.width, src.height, want, { maxPixels: PIXEL_LIMIT });
    out.push(h("p", { class: "hint", id: "enhanceSize" }, `Result: ${Math.round(src.width * s)}×${Math.round(src.height * s)} px${e.scale === "auto" ? ` (Auto: ${s}×)` : ""}${s < want ? ` (${s}× is the largest safe size here)` : ""}.`));
  }
  if (ui.lastEnhance) {
    const l = ui.lastEnhance;
    out.push(section("Done", h("p", { class: "hint" }, `${l.from.w}×${l.from.h} → ${l.w}×${l.h} px in ${(l.ms / 1000).toFixed(1)} s. Drag the line on the photo to compare.`),
      mode === "enhance" ? h("div", { class: "row" },
        h("button", { class: "btn primary", id: "enhDownloadPng", onclick: () => doExport({ format: "png", size: "original", suffix: "-enhanced" }) }, "Download PNG"),
        h("button", { class: "btn", id: "enhDownloadJpg", onclick: () => doExport({ format: "jpg", quality: 0.95, size: "original", suffix: "-enhanced" }) }, "Download JPG")) : null));
  }
  return out;
}

function aiComingSoon(el) {
  comingSoon(el, { title: "AI photo editor is coming soon",
    what: "Describe a change in your own words (“make the sky blue”, “remove the people at the back”) and AsaanDesk AI will edit the photo. It is not switched on yet, so nothing is sent anywhere.",
    offline: "These photo tools already work in your browser, free:" });
  const list = h("div", { class: "soon-tools" },
    [["Background remover", "?mode=bg"], ["Image enhancer", "?mode=enhance"], ["Magic eraser", "?tool=erase"], ["Crop and rotate", "?tool=crop"], ["Adjust light and colour", "?tool=adjust"],
      ["Filters", "?tool=filters"], ["Text, stickers and frames", "?tool=add"], ["Passport photo sheet", "?tool=export"]].map(([name, q]) =>
      h("a", { class: "chip", href: q, onclick: (ev) => { if (!st) return; ev.preventDefault(); if (q.startsWith("?mode=")) { mode = q.slice(6); setModeUi(); showEditor(); } else { mode = "full"; setModeUi(); tool = q.slice(6); showEditor(); } scheduleRender(); } }, name)));
  el.querySelector(".ad-soon").append(list);
}
// The AI prompt is kept on this device (also while AI is not switched on yet).
const AI_PROMPT_KEY = "asaandesk-photo-ai-prompt";
function savedPrompt() { try { return localStorage.getItem(AI_PROMPT_KEY) || ""; } catch { return ""; } }
function keepPrompt(v) { ui.aiPrompt = String(v || ""); try { localStorage.setItem(AI_PROMPT_KEY, ui.aiPrompt); } catch {} }
function panelAi() {
  const ready = aiReady();
  if (!ui.aiPrompt) ui.aiPrompt = savedPrompt();
  const ta = h("textarea", { class: "ad-input", id: "aiPrompt", rows: 3, placeholder: "For example: make the sky a warm sunset", "aria-label": "Describe the edit", oninput: (e) => keepPrompt(e.target.value) }, ui.aiPrompt);
  const clicking = ui.brushFor === "ai-click", brushing = ui.brushFor === "aibrush" || clicking;
  const where = section("Where", h("div", { class: "chips", role: "group", "aria-label": "Where to edit" },
      chip("Whole photo", !brushing && !ui.aiMask, () => { ui.aiMask = null; ui.brushFor = null; clearBrush(); renderPanel(); scheduleRender(); }, { "data-ai-area": "all" }),
      chip("Brush an area", ui.brushFor === "aibrush" || (!!ui.aiMask && !clicking), () => startBrush("aibrush"), { "data-ai-area": "brush" }),
      chip("Click things", clicking, () => startBrush("ai-click"), { "data-ai-area": "click" })),
    brushing ? h("div", { class: "area-tools" },
      h("p", { class: "hint" }, clicking ? "Click the things the AI should change (similar colours next to a click are picked too), then press Use this area." : "Brush over the part the AI should change, then press Use this area."),
      clicking ? slider({ id: "clicktol", label: "Colour range", min: 5, max: 80, value: ui.clickTol, onInput: (v) => { ui.clickTol = v; } })
        : slider({ id: "brush", label: "Brush size", min: 8, max: 120, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } }),
      h("div", { class: "row" },
        h("button", { class: "btn primary", id: "aiAreaUse", disabled: !ui.brushDirty, onclick: () => { ui.aiMask = brushMask(); ui.brushFor = null; clearBrush(); renderPanel(); scheduleRender(); } }, "Use this area"),
        h("button", { class: "btn", onclick: clearBrush }, "Clear"),
        h("button", { class: "btn", onclick: () => { ui.brushFor = null; clearBrush(); renderPanel(); scheduleRender(); } }, "Cancel")))
      : ui.aiMask ? h("p", { class: "hint", id: "aiAreaNow" }, "The edit will change the brushed area only.") : null);
  const out = [section("Describe an edit", ta,
    h("div", { class: "chips" }, ["Make the sky blue", "Remove the people at the back", "Make it look like evening", "Add soft studio light"].map((t) => chip(t, false, () => { keepPrompt(t); ta.value = t; })))),
    where,
    h("button", { class: "btn primary wide", id: "aiGo", onclick: () => (ready ? runAiEdit(ta.value) : aiNotYet(ta.value)) }, "Generate")];
  if (ready) out.push(h("p", { class: "hint" }, "Your photo (up to 1536 px) and this text are sent to AsaanDesk AI. The result replaces the photo; Undo brings it back."));
  else {
    if (ui.aiAsked) out.push(h("div", { class: "ai-msg", id: "aiSoonMsg", role: "status" },
      h("b", {}, "AsaanDesk AI is coming soon."),
      h("p", {}, `Nothing was sent and the photo was not changed. Your prompt “${ui.aiPrompt}” stays here for when AI is switched on.`),
      h("button", { class: "btn wide", id: "aiTryLook", onclick: () => closeLook(ui.aiPrompt) }, "Get a similar look with the free tools")));
    const box = h("div", { id: "aiSoon" }); aiComingSoon(box); out.push(box);
  }
  return out;
}
/** AI is off: keep the prompt and say so; nothing is sent, nothing is made up. */
function aiNotYet(prompt) {
  prompt = String(prompt || "").trim();
  if (!prompt) { toast("Describe the edit first, for example “make the sky blue”."); return; }
  keepPrompt(prompt);
  ui.aiAsked = true;
  renderPanel();
  toast("AsaanDesk AI is coming soon. Your prompt is kept; nothing was sent.", 5200);
}
/** The free-tools look whose idea is closest to the prompt (word overlap), or auto-adjust. */
function closeLook(prompt) {
  const words = (String(prompt || "").toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 2);
  let best = null, score = 0;
  for (const t of GALLERY.TEMPLATES) {
    if (t.tool !== "ai-photo-editor") continue;
    const r = GALLERY.templateById(t.id);
    if (r.panel) continue;
    const hay = `${r.prompt} ${r.layoutName} ${(r.tags || []).join(" ")}`.toLowerCase();
    const sc = words.filter((w) => hay.includes(w)).length;
    if (sc > score) { score = sc; best = r; }
  }
  if (best) { applyLook(best); commit(); renderPanel(); toast(`Made with the free tools: ${best.layoutName}. Change it in Edit > Adjust.`); }
  else runAutoAdjust();
}

function panelExport() {
  const e = ui;
  const src = sourceFor("full", false);
  const g1 = geometryMatrix(src.width, src.height, st.geom, 1), p1 = framePad(st.frame, g1.outW, g1.outH);
  const dims = exportDims(g1.outW + p1.left + p1.right, g1.outH + p1.top + p1.bottom, e.exportSize, e.customW);
  const transparent = seeThrough();
  return [
    section("Download", h("div", { class: "field" }, h("span", {}, "Format"), h("div", { class: "chips", role: "group", "aria-label": "Format" },
      ["jpg", "png", "webp", "pdf"].map((f) => chip(f.toUpperCase(), e.exportFmt === f, () => { e.exportFmt = f; renderPanel(); }, { "data-format": f })))),
    e.exportFmt !== "png" ? slider({ id: "quality", label: "Quality", min: 40, max: 100, value: e.exportQ, fmt: (v) => v + "%", onInput: (v) => (e.exportQ = v) }) : null,
    h("div", { class: "field" }, h("span", {}, "Size"), h("div", { class: "chips", role: "group", "aria-label": "Size" },
      EXPORT_SIZES.map((s) => chip(s.label, e.exportSize === s.id, () => { e.exportSize = s.id; renderPanel(); }, { "data-size": s.id })))),
    e.exportSize === "custom" ? h("label", { class: "row" }, "Width (px) ", h("input", { class: "ad-input num", id: "customW", type: "number", min: 16, max: 12000, value: e.customW, oninput: (ev) => { e.customW = +ev.target.value || 0; $("#exportDims").textContent = dimsText(); } })) : null,
    h("p", { class: "hint", id: "exportDims" }, `${dims.w}×${dims.h} px`),
    transparent && e.exportFmt === "jpg" ? h("p", { class: "hint" }, "JPG has no see-through areas, so they become white. Pick PNG to keep them.") : null,
    h("button", { class: "btn primary wide", id: "exportGo", onclick: () => doExport({}) }, "Download")),
    section("Passport photos", h("p", { class: "hint" }, "A 4×6 in (10×15 cm) sheet with 6 photos of 35×45 mm, ready to print. Crop with the Passport shape first; a plain light background works best."),
      h("button", { class: "btn wide", id: "passportGo", onclick: doPassport }, "Make passport sheet")),
    section("Design with it", h("p", { class: "hint" }, "Put this photo in Studio to add more text, shapes and pages."),
      h("button", { class: "btn wide", id: "studioGo", onclick: openInStudio }, "Use in a design")),
  ];
  function dimsText() { const d = exportDims(g1.outW + p1.left + p1.right, g1.outH + p1.top + p1.bottom, e.exportSize, e.customW); return `${d.w}×${d.h} px`; }
}

/* ---------- boot ---------- */
let nudgeTimer = null;
function bind() {
  const input = $("#openInput");
  input.addEventListener("change", () => { const f = input.files[0]; input.value = ""; openFile(f); });
  $("#bgImageInput").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; setBgImage(f); });
  $("#bulkInput").addEventListener("change", (e) => { const f = [...e.target.files]; e.target.value = ""; bulkRemove(f); });
  $("#bulkStart").addEventListener("click", () => $("#bulkInput").click());
  addEventListener("storage", (e) => { if (e.key === STYLE_KEY) syncStyleButtons(); });
  $("#pickBtn").addEventListener("click", () => input.click());
  $("#openBtn").addEventListener("click", () => input.click());
  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);
  $("#fullLink").addEventListener("click", (e) => { e.preventDefault(); if (st) switchToFull(); else location.href = location.pathname; });
  $("#downloadBtn").addEventListener("click", () => {
    if (mode === "bg") doExport({ format: "png", size: "original", suffix: "-no-bg" });
    else if (mode === "enhance") doExport({ format: "png", size: "original", suffix: "-enhanced" });
    else setTool("export");
  });
  const cmp = $("#compareBtn");
  const showB = (on) => { if (!st) return; ui.before = on; if (on) paintBefore(); else if (ui.split) paintBefore(); else hideBefore(); };
  cmp.addEventListener("pointerdown", (e) => { e.preventDefault(); showB(true); });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) cmp.addEventListener(ev, () => ui.before && showB(false));
  cmp.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); showB(true); } });
  cmp.addEventListener("keyup", () => showB(false));
  $("#splitBtn").addEventListener("click", () => {
    ui.split = !ui.split;
    $("#splitBtn").setAttribute("aria-pressed", String(ui.split));
    if (ui.split) paintBefore(); else hideBefore();
  });
  const wrap = $("#wrap");
  wrap.addEventListener("pointerdown", onWrapDown);
  wrap.addEventListener("pointermove", onWrapMove);
  wrap.addEventListener("pointerup", onWrapUp);
  wrap.addEventListener("pointercancel", onWrapUp);
  wrap.addEventListener("dblclick", () => { if (selOverlay()?.type === "text") $("#textInput")?.focus(); });
  const crop = $("#crop");
  crop.addEventListener("pointerdown", onCropDown);
  crop.addEventListener("pointermove", onCropMove);
  crop.addEventListener("pointerup", onCropUp);
  crop.addEventListener("pointercancel", onCropUp);
  crop.addEventListener("keydown", onCropKey);
  const brush = $("#brush");
  brush.addEventListener("pointerdown", onBrushDown);
  brush.addEventListener("pointermove", onBrushMove);
  for (const ev of ["pointerup", "pointercancel"]) brush.addEventListener(ev, onBrushUp);
  // brush tools: Ctrl + mouse wheel (or a trackpad pinch) zooms, the middle or right mouse button drags the view
  const stg = $("#stage");
  stg.addEventListener("wheel", (e) => { if (!st || !e.ctrlKey || !shell) return; e.preventDefault(); setZoom(ui.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
  let pan = null;
  stg.addEventListener("pointerdown", (e) => { if (!st || (e.button !== 1 && e.button !== 2)) return; e.preventDefault(); pan = { x: e.clientX, y: e.clientY, l: stg.scrollLeft, t: stg.scrollTop }; stg.setPointerCapture?.(e.pointerId); });
  stg.addEventListener("pointermove", (e) => { if (!pan) return; stg.scrollLeft = pan.l - (e.clientX - pan.x); stg.scrollTop = pan.t - (e.clientY - pan.y); });
  for (const ev of ["pointerup", "pointercancel"]) stg.addEventListener(ev, () => { pan = null; });
  stg.addEventListener("contextmenu", (e) => { if (st && view.mode === "erase") e.preventDefault(); });
  // open by dropping or pasting
  const drop = (e) => { e.preventDefault(); document.body.classList.remove("dragging"); const f = [...(e.dataTransfer?.files || [])].find((x) => /^image\//.test(x.type) || /\.hei[cf]$/i.test(x.name)); if (f) openFile(f); };
  addEventListener("dragover", (e) => { e.preventDefault(); document.body.classList.add("dragging"); });
  addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("dragging"); });
  addEventListener("drop", drop);
  addEventListener("paste", (e) => {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
    const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
    if (f) { e.preventDefault(); openFile(f); }
  });
  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && document.activeElement.type !== "range";
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); redo(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && !typing && selId) { e.preventDefault(); removeSelected(); }
    else if (e.key === "Escape" && selId) { selId = null; updateOverlayUi(); renderPanel(); }
    else if (e.key === "\\" && !typing && st && !e.repeat) showB(true);
    else if (selId && !typing && e.key.startsWith("Arrow")) {
      const o = selOverlay(), d = e.shiftKey ? 0.02 : 0.004;
      if (e.key === "ArrowLeft") o.x -= d; if (e.key === "ArrowRight") o.x += d; if (e.key === "ArrowUp") o.y -= d; if (e.key === "ArrowDown") o.y += d;
      e.preventDefault(); scheduleRender(); clearTimeout(nudgeTimer); nudgeTimer = setTimeout(commit, 400);
    }
  });
  addEventListener("keyup", (e) => { if (e.key === "\\") showB(false); });
}

/* ---------- the shared editor frame (top bar, left rail + side panel, floating toolbar, bottom bar) ---------- */
const HOMES = { full: "/tools/photo-editor", bg: "/tools/background-remover", enhance: "/tools/image-enhancer", ai: "/tools/ai-photo-editor" };
// Side panels that show a photo tool's settings (the #panel element moves into the open one).
const FRAME_PANELS = {
  edit: { tool: null, label: "Edit" },
  adjust: { tool: "adjust", label: "Adjust" }, filters: { tool: "filters", label: "Filters" }, effects: { tool: "effects", label: "Effects" },
  elements: { tool: "add", focus: "elements", label: "Elements" }, text: { tool: "add", focus: "text", label: "Text" },
  background: { tool: "bg", label: "Background" }, crop: { tool: "crop", label: "Crop" }, erase: { tool: "erase", label: "Eraser" },
  enhance: { tool: "enhance", label: "Enhance" }, ai: { tool: "ai", label: "AI edit" }, export: { tool: "export", label: "Download" },
  retouch: { tool: "retouch", label: "Face retouch" }, blur: { tool: "blur", label: "Blur" }, focus: { tool: "focus", label: "Auto focus" },
  pixel: { tool: "pixel", label: "Pixel eraser" }, grab: { tool: "grab", label: "Magic Grab" }, expand: { tool: "expand", label: "Magic Expand" },
};
const PANEL_OF = { crop: "crop", adjust: "edit", filters: "edit", effects: "edit", bg: "background", erase: "erase", enhance: "enhance", ai: "ai", export: "export",
  retouch: "retouch", blur: "blur", focus: "focus", pixel: "pixel", grab: "grab", expand: "expand" };
// tools reached from Tools (not tabs of their own); ?tool= opens them too
const EXTRA_TOOLS = ["retouch", "blur", "focus", "pixel", "grab", "expand"];
// Edit panel tabs (Canva's Edit: Effects / Filters / Adjust / Tools)
const EDIT_TABS = [["effects", "Effects"], ["filters", "Filters"], ["adjust", "Adjust"], ["tools", "Tools"]];
const FIRST_PANEL = { full: "templates", bg: "background", enhance: "enhance", ai: "ai" };
const panelFor = (t) => (t === "add" ? (ui.addFocus === "text" ? "text" : "elements") : PANEL_OF[t] || "adjust");
function openToolPanel(t) {
  if (!shell) return;
  if (t === "add" && !["elements", "text"].includes(framePanel || "")) ui.addFocus = "elements";
  if (PANEL_OF[t] === "edit") ui.editTab = t;
  shell.openPanel(panelFor(t));
}
function openEdit(tab) { ui.editTab = tab || ui.editTab || "adjust"; if (shell) shell.openPanel("edit"); else if (st && tab !== "tools") setTool(tab); }
function attachEditPanel(el) {
  const tabs = h("div", { class: "edit-tabs", role: "tablist", "aria-label": "Edit" }, EDIT_TABS.map(([id, label]) =>
    h("button", { class: "edit-tab" + (ui.editTab === id ? " on" : ""), role: "tab", "aria-selected": String(ui.editTab === id), "data-edit-tab": id, onclick: () => openEdit(id) }, label)));
  el.append(tabs);
  if (ui.editTab === "tools") { renderToolsHub(el); return; }
  if (st && mode !== "full") { mode = "full"; setModeUi(); syncUrl(); renderTools(); }
  el.append(panelEl());
  if (st) setTool(ui.editTab, { fromFrame: true }); else renderPanel();
}
function attachToolPanel(el, id) {
  if (id === "edit") { attachEditPanel(el); return; }
  const d = FRAME_PANELS[id];
  if (d.focus) ui.addFocus = d.focus;
  if (st && mode !== "full" && d.tool !== mode) { mode = "full"; setModeUi(); syncUrl(); renderTools(); }
  el.append(panelEl());
  if (st) setTool(d.tool, { fromFrame: true }); else renderPanel();
}
/** What a tool panel shows before a photo is open: open one, or start from a sample photo. */
function noPhotoBlock() {
  const out = [section("Start with a photo",
    h("p", { class: "hint" }, "Open a photo from this device, or try one of our sample photos. Nothing is uploaded."),
    h("button", { class: "btn primary wide", "data-act": "open-photo", onclick: () => $("#openInput").click() }, "Open a photo"),
    h("div", { class: "chips", role: "group", "aria-label": "Sample photos" }, Object.entries(GALLERY.SAMPLES).map(([k, v]) =>
      chip(v.name, false, () => openSample(k), { "data-sample": k }))))];
  if (mode === "ai") {
    // the prompt (from the intro page's example chips via ?prompt=, or typed earlier) is ready before a photo is open
    if (!ui.aiPrompt) ui.aiPrompt = savedPrompt();
    out.unshift(section("Describe an edit", h("textarea", { class: "ad-input", id: "aiPrompt", rows: 3, placeholder: "For example: make the sky a warm sunset", "aria-label": "Describe the edit", oninput: (e) => keepPrompt(e.target.value) }, ui.aiPrompt),
      h("p", { class: "hint" }, "Open a photo or a sample photo below, then press Generate.")));
    if (!aiReady()) { const box = h("div", { id: "aiSoonStart" }); aiComingSoon(box); out.push(box); }
  }
  return out;
}
/** Draw one of the gallery's sample photos (our own SVG artwork) and open it like an uploaded file. */
async function svgToCanvas(svg, w, h) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = makeCanvas(w, h);
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c;
}
async function openSample(name, title, opts = {}) {
  const s = GALLERY.SAMPLES[name] || GALLERY.SAMPLES.lake;
  const c = await svgToCanvas(GALLERY.sceneSvg(name, "sample"), s.w, s.h);
  const blob = await toBlob(c, "image/png");
  await openFile(new File([blob], (title || s.name) + ".png", { type: "image/png" }), { tplPhoto: "sample:" + name, ...opts });
}
/** A template's real photo from the shared library (full size); the drawn sample photo if it cannot load. */
async function openTemplatePhoto(t, opts = {}) {
  const url = GALLERY.photoOf(t, "full");
  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      await openFile(new File([blob], (t.photo.title || t.name || "photo") + ".jpg", { type: blob.type || "image/jpeg" }), { ...opts, tplPhoto: t.photo.id });
      if (st && tplPhoto === t.photo.id) return;
    } catch (e) { console.warn("template photo kept as the drawn sample", e); }
  }
  await openSample(t.sample, t.name, opts);
}
/** The open photo's finished size (after its crop shape) in px, for placing template text. */
function finishedSize() {
  const src = sourceFor("prev", false), g = geometryMatrix(src.width, src.height, st.geom, 1);
  return { W: Math.max(1, g.outW), H: Math.max(1, g.outH) };
}
/** Extra photos of a template (collages, photo stacks) as pixels cut to their boxes: { photoId: pixId }. */
async function loadTemplateImages(t) {
  const out = {}, list = (t.overlays || []).filter((o) => o.type === "image" && o.photo);
  if (!list.length) return out;
  const want = CROP_PRESETS.find((c) => c.id === t.aspect)?.aspect;
  const f = frameDims(), R = typeof want === "number" ? want : f.w / f.h, longPx = Math.max(st.src.w, st.src.h);
  await Promise.all(list.map(async (o) => {
    try {
      const blob = await (await fetch(GALLERY.photoOf({ photo: o.photo }, "full"))).blob();
      const r = await decodeFile(blob, null, { maxSide: 2400 });
      const ratio = (o.w * R) / o.h, pw = Math.max(16, Math.round(Math.min(1600, longPx * Math.max(o.w, o.h)))), ph = Math.max(16, Math.round(pw / ratio));
      const c = makeCanvas(pw, ph), sw = r.canvas.width, sh = r.canvas.height, k = Math.max(pw / sw, ph / sh);
      c.getContext("2d").drawImage(r.canvas, (pw - sw * k) / 2, (ph - sh * k) / 2, sw * k, sh * k);
      out[o.photo.id] = newPix(c);
    } catch (e) { console.warn("template photo skipped", e); }
  }));
  return out;
}
/** Overlays of a template (shapes, extra photos, text) for the open photo; text anchored by its left / right edge is
 * measured and placed the way the thumbnail shows it. */
function templateOverlays(t, imgs = {}) {
  const list = t.overlays || [...(t.shapes || []).map((s) => ({ type: "shape", ...s })), ...(t.texts || []).map((x) => ({ type: "text", ...x }))];
  const { W, H } = finishedSize(), x = makeCanvas(2, 2).getContext("2d"), out = [];
  for (const d of list) {
    const { type, left, right, photo, ...props } = d;
    if (type === "image") { const pid = photo && imgs[photo.id]; if (pid) out.push(newOverlay("image", { ...props, pixId: pid, name: photo.title || "Photo", tpl: true })); continue; }
    const o = newOverlay(type, { ...props, tpl: true });
    if (type === "text" && (left != null || right != null)) {
      let hw = 0;
      try { const m = measureText(x, o, W, H); hw = m.w / W / 2; } catch { /* no canvas text here */ }
      o.x = left != null ? left + hw : right - hw;
    }
    out.push(o);
  }
  return out;
}
function redrawTemplates() { try { shell?.panel("templates")?._redraw?.(); } catch {} }
const galleryView = {
  get TEMPLATES() { const cur = GALLERY.MODE_TOOL[mode]; return [...GALLERY.TEMPLATES.filter((t) => t.tool === cur), ...GALLERY.TEMPLATES.filter((t) => t.tool !== cur)]; },
  thumb: GALLERY.thumb,
};
function applyLook(t, imgs = {}) {
  st.adjust = { ...NEUTRAL, ...(t.adjust || {}) };
  st.filter = t.filter ? { id: t.filter[0], intensity: t.filter[1] } : { id: "none", intensity: 100 };
  if (t.frame) st.frame = { ...st.frame, ...t.frame };
  else if (t.kind === "look") st.frame = { ...st.frame, id: "none" };
  if (t.aspect) { const f = frameDims(); st.geom.aspect = t.aspect; st.geom.crop = (t.crop && tplPhoto === t.photo?.id) ? { ...t.crop } : aspectCrop(f.w, f.h, aspectValue()); } // a people template opens with its thumbnail's face crop
  ensureFx(st);
  st.fx = { ...st.fx, area: "all", duotone: t.duotone ? { id: t.duotone, amount: t.duotoneAmount ?? 100 } : null, invert: !!t.invert, opacity: t.opacity ?? 100 };
  st.overlays = st.overlays.filter((o) => !o.tpl);
  for (const o of templateOverlays(t, imgs)) st.overlays.push(o);
  selId = null;
}
/** Template text uses the editor's fonts: load them before the text is measured and placed. */
const templateFonts = (t) => prepareOverlays((t.overlays || t.texts || []).filter((o) => (o.type || "text") === "text")).catch(() => {});
/** Does the template open its own photo? Yes when nothing is open, or when the open photo came from another template. */
const wantsOwnPhoto = (t) => !st || (!!tplPhoto && !!t.photo && tplPhoto !== t.photo.id);
/** Apply a gallery template for real: a look or layout, a new background, enhancer settings (then Enhance), or an AI edit idea. */
async function applyTemplate(id) {
  const t = GALLERY.templateById(id);
  if (!t) throw new Error("That template was not found.");
  if (busy) throw new Error("Please wait: the photo is still being worked on.");
  const want = GALLERY.TOOL_MODE[t.tool] || "full";
  if (mode !== "full" && mode !== want) { mode = "full"; setModeUi(); syncUrl(); renderTools(); }
  const fresh = wantsOwnPhoto(t);
  // the background remover's model starts loading while the template's photo loads (faster first result)
  if ((t.kind === "bg" || t.panel === "bg") && (fresh || !st?.bg.removed)) imagetools().then((T) => T.preload?.("bg")).catch(() => {});
  if (fresh) { await openTemplatePhoto(t, { quiet: true, pause: 300 }); if (!st) throw new Error("The template's photo could not open."); }
  // keep the Templates panel open (like picking one template after another); other panels follow the tool
  const setTool = (x) => setToolFn(x, { fromFrame: !!shell && framePanel === "templates" });
  if (t.kind === "look") {
    const [imgs] = await Promise.all([loadTemplateImages(t), templateFonts(t)]);
    applyLook(t, imgs); commit();
    setTool(t.panel || ((t.overlays || t.texts || []).some((o) => (o.type || "text") === "text") ? "add" : "adjust"));
    toast(`${t.name} applied. Change anything you like.`);
  } else if (t.kind === "bg") {
    if (!st.bg.removed || !st.cutout) { setTool("bg"); if (fresh) await sleep(400); await runRemoveBackground({ quiet: true }); }
    if (!st.bg.removed) throw new Error("The background could not be removed, so the new one was not added.");
    const b = t.bg;
    if (b.mode === "image") {
      const src = getPix(st.cutout, "full");
      const c = await svgToCanvas(GALLERY.backdropSvg(b.backdrop, src.width, src.height, "bd"), src.width, src.height);
      st.bg.imageId = putPix("p" + uid(), c);
    }
    Object.assign(st.bg, { mode: b.mode }, b.color ? { color: b.color } : {}, b.blur ? { blur: b.blur } : {});
    st.bg.shadow = b.shadow || t.cutShadow ? { on: true, blur: 20, dist: 12, angle: 60, color: "#000000", alpha: 40, ...b.shadow } : null;
    st.bg.outline = b.outline || t.cutOutline ? { on: true, width: 8, color: "#ffffff", ...b.outline } : null;
    if (t.frame) st.frame = { ...st.frame, ...t.frame };
    if (t.aspect) { const f = frameDims(); st.geom.aspect = t.aspect; st.geom.crop = (t.crop && tplPhoto === t.photo?.id) ? { ...t.crop } : aspectCrop(f.w, f.h, aspectValue()); } // a people template opens with its thumbnail's face crop
    await templateFonts(t);
    st.overlays = st.overlays.filter((o) => !o.tpl);
    for (const o of templateOverlays(t)) st.overlays.push(o);
    commit();
    setTool("bg");
    showSplit();
    toast(`${t.name}: background changed. Drag the line to compare, then download.`);
  } else if (t.kind === "enhance") {
    Object.assign(ui.enhance, t.enhance);
    setTool("enhance");
    if (fresh) await sleep(500);
    await runEnhance({ quiet: true });
  } else if (t.kind === "ai") {
    ui.aiPrompt = t.prompt;
    if (aiReady() && !t.panel) { setTool("ai"); await runAiEdit(t.prompt); return; }
    if (t.panel === "bg") {
      setTool("bg");
      await runRemoveBackground({ quiet: true });
      if (st.bg.removed) { st.bg.mode = "color"; st.bg.color = "#ffffff"; commit(); renderPanel(); showSplit(); }
      toast("AI editing is coming soon. This was done with the free background remover instead.", 5200);
      return;
    }
    if (t.panel === "enhance") {
      Object.assign(ui.enhance, { scale: 2, denoise: 25, sharpen: 45, autoColor: true, autoContrast: true });
      setTool("enhance");
      await runEnhance({ quiet: true });
      toast("AI editing is coming soon. This was done with the free image enhancer instead.", 5200);
      return;
    }
    if (t.panel) { setTool(t.panel); toast("AI editing is coming soon. Meanwhile, brush over what you want gone and press Erase.", 5200); return; }
    applyLook(t); commit();
    setTool("ai");
    toast("AI photo editing is coming soon. We made a close look with the free tools instead; change it in Adjust.", 5200);
  }
}
function showSplit(at = 0.5) {
  ui.split = true; ui.splitAt = at;
  $("#splitBtn").setAttribute("aria-pressed", "true");
  scheduleRender();
}
function setZoom(pct) {
  ui.zoom = Math.max(25, Math.min(400, Math.round(+pct || 100)));
  relayout();
  shell?.refresh?.();
}
function turnPhoto(dir) {
  if (!st || busy) return;
  st.geom.rot = (st.geom.rot + (dir > 0 ? 90 : 270)) % 360;
  st.geom.crop = rotateCrop(st.geom.crop, dir);
  const a = CROP_PRESETS.find((c) => c.id === st.geom.aspect)?.aspect;
  if (typeof a === "number" && a !== 1) st.geom.aspect = "free";
  commit(); renderPanel();
}
function flipPhoto(axis) {
  if (!st || busy) return;
  if (axis === "x") st.geom.flipX = !st.geom.flipX; else st.geom.flipY = !st.geom.flipY;
  st.geom.crop = flipCrop(st.geom.crop, axis);
  commit(); renderPanel();
}
const needPhoto = (fn) => (...a) => { if (!st) { toast("Open a photo or pick a template first."); return; } return fn(...a); };
/* ---------- left-rail kit inserts (shared/panels: Elements, Text, Uploads, Brand, Tools → Draw) ----------
 * Everything lands on the open photo as an overlay you can move, resize and turn: text overlays, shape overlays (every
 * kit shape, paths too), site-library stickers, pictures (image overlays). A frame puts the photo itself in that shape.
 * pt = {x, y, clientX, clientY} for a drop; nothing for a click = the middle of the photo part you can see. */
const KIT_TEXT = { heading: 0.075, subheading: 0.045, body: 0.028, caption: 0.022 };
const KIT_WORDS = { heading: "Add a heading", subheading: "Add a subheading", body: "Add a little bit of body text", caption: "Add a caption" };
const KIT_SHAPES = new Set(["rect", "ellipse", "triangle", "line", "arrow", "star", "polygon", "heart"]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** A FONT_FAMILIES key for a kit family (a key already, or a CSS font list). */
function familyKey(f) {
  if (!f) return null;
  if (FONT_FAMILIES[f]) return f;
  const s = String(f).toLowerCase();
  for (const [k, v] of Object.entries(FONT_FAMILIES)) if (v.css.toLowerCase() === s || v.label.toLowerCase() === s) return k;
  if (/mono|courier|consol/.test(s)) return "mono";
  if (/cambria|caladea/.test(s)) return "cambria";
  if (/calibri|carlito/.test(s)) return "calibri";
  if ((/serif/.test(s) && !/sans/.test(s)) || /times|georgia|garamond|playfair|merriweather|lora|didot/.test(s)) return "serif";
  return "sans";
}
const picDims = () => (view.photoW > 1 && view.photoH > 1 ? { W: view.photoW, H: view.photoH } : finishedSize());
/** Drop point (or the middle of the visible photo) as fractions of the finished picture. */
function kitPoint(pt) {
  const wrap = $("#wrap"), r = wrap?.getBoundingClientRect?.();
  if (!r || !(r.width > 0) || view.mode !== "normal") return { x: 0.5, y: 0.5 };
  let cx, cy;
  if (pt && Number.isFinite(pt.clientX) && Number.isFinite(pt.clientY)) { cx = pt.clientX; cy = pt.clientY; }
  else {
    const s = (shell?.slots?.stage || $("#photoWork"))?.getBoundingClientRect?.();
    const L = Math.max(r.left, s?.left ?? -Infinity), T = Math.max(r.top, s?.top ?? -Infinity), R = Math.min(r.right, s?.right ?? Infinity), B = Math.min(r.bottom, s?.bottom ?? Infinity);
    cx = R > L ? (L + R) / 2 : r.left + r.width / 2; cy = B > T ? (T + B) / 2 : r.top + r.height / 2;
  }
  const p = toPhoto({ clientX: cx, clientY: cy });
  return { x: clamp(p.x / view.photoW, 0, 1), y: clamp(p.y / view.photoH, 0, 1) };
}
/** Box {x, y, w, h} (fractions) for an object whose longer side is rel × the picture's shorter side. */
function kitBox(rel, aspect, pt, def = 0.3) {
  const { W, H } = picDims(), S = Math.min(W, H), a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const L = (rel > 0 ? rel : def) * S;
  let w = a >= 1 ? L : L * a, h = a >= 1 ? L / a : L;
  const k = Math.min(1, (W * 0.98) / w, (H * 0.98) / h); w *= k; h *= k;
  const c = kitPoint(pt), fw = w / W, fh = h / H;
  return { x: clamp(c.x, fw / 2, 1 - fw / 2), y: clamp(c.y, fh / 2, 1 - fh / 2), w: fw, h: fh };
}
/** The kit adds to the open photo; with none open, a blank white 1080 × 1080 design starts first. */
async function kitPhoto() {
  if (st) return;
  if (busy) throw new Error("Please wait a moment, then try again.");
  if (mode !== "full") { mode = "full"; tool = "adjust"; setModeUi(); }
  const c = makeCanvas(1080, 1080), x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, 1080, 1080);
  await openFile(new File([await toBlob(c, "image/png")], "Blank design.png", { type: "image/png" }));
  if (!st) throw new Error("A blank design could not be started. Open a photo first.");
}
/** Adds overlays as one undo step, selects the first and shows it ready to move (the Add tool). */
function kitAdd(list, focus = "elements") {
  const arr = [].concat(list);
  for (const o of arr) st.overlays.push(o);
  selId = arr[0].id;
  ui.addFocus = focus;
  commit();
  if (tool !== "add") setTool("add", { fromFrame: true }); else renderPanel();
  scheduleRender();
  return arr.length > 1 ? arr.map((o) => o.id) : arr[0].id;
}
const isSvgSrc = (src) => /^data:image\/svg\+xml/i.test(src) || /^\s*<svg[\s>]/i.test(src) || /\.svg(\?|#|$)/i.test(src);
/** A picture (URL, data URL or SVG markup) as a canvas no longer than maxLong px; SVGs are drawn at that size. */
async function pictureCanvas(src, maxLong = 1600, aspectHint = 0) {
  if (/^\s*</.test(src)) src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  if (isSvgSrc(src)) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const a = aspectHint > 0 ? aspectHint : img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : svgAspect(decodeURIComponent(src.split(",").slice(1).join(","))) || 1;
    const w = a >= 1 ? maxLong : Math.round(maxLong * a), h = a >= 1 ? Math.round(maxLong / a) : maxLong;
    const c = makeCanvas(Math.max(1, w), Math.max(1, h));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  const blob = await (await fetch(src)).blob();
  const r = await decodeFile(blob, null, { maxSide: 4096 });
  return scaleDown(r.canvas, maxLong);
}
/** Width ÷ height from an SVG's viewBox (or width/height). */
function svgAspect(svg) {
  const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg || "");
  if (vb && +vb[1] > 0 && +vb[2] > 0) return +vb[1] / +vb[2];
  const w = /\swidth\s*=\s*["']([\d.]+)/i.exec(svg || ""), hh = /\sheight\s*=\s*["']([\d.]+)/i.exec(svg || "");
  return w && hh && +w[1] > 0 && +hh[1] > 0 ? +w[1] / +hh[1] : 0;
}
/** A picture overlay (image type: kept in the pixel store like Magic Grab pieces, saved with the project). */
async function kitPicture(src, name, pt, { rel, aspect, def = 0.5, box } = {}) {
  await kitPhoto();
  const { W, H } = picDims();
  const longPx = clamp(Math.round(Math.max(W, H) * 1.2), 256, 2000);
  const c = await pictureCanvas(src, longPx, aspect);
  const b = box || kitBox(rel, c.width / c.height, pt, def);
  return kitAdd(newOverlay("image", { pixId: newPix(c), name: String(name || "Picture").slice(0, 80), ...b }));
}
/** Is the picture light around the point c (fractions)? Text without its own colour is dark there, else white. */
function lightAt(c) {
  try {
    const v = $("#view"), x = v?.getContext("2d");
    if (!x || !v.width || !v.height || view.mode !== "normal") return false;
    const W = view.photoW, H = view.photoH, cx = view.padL + c.x * W, cy = view.padT + c.y * H, r = Math.max(4, Math.min(W, H) * 0.08);
    const d = x.getImageData(Math.max(0, Math.round(cx - r)), Math.max(0, Math.round(cy - r)), Math.max(1, Math.round(r * 2)), Math.max(1, Math.round(r * 2))).data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 20) { s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
    return n > 0 && s / n > 170;
  } catch { return false; }
}
function kitTextOverlay(spec, c, S, H) {
  const role = KIT_TEXT[spec.role] ? spec.role : "body";
  const px = (spec.rel > 0 ? spec.rel : KIT_TEXT[role]) * S;
  const content = String(spec.content ?? KIT_WORDS[role]);
  const p = { text: content, size: clamp(px / H, 0.008, 0.6), family: familyKey(spec.family) || loadBrand().fonts?.[role === "heading" ? "heading" : "body"] || "sans",
    bold: spec.bold != null ? !!spec.bold : spec.weight ? spec.weight >= 600 : role === "heading" || role === "subheading", italic: !!spec.italic,
    align: ["left", "center", "right"].includes(spec.align) ? spec.align : "center", x: c.x, y: c.y };
  if (spec.color) { p.color = spec.color; p.shadow = false; }
  else if (lightAt(c)) { p.color = "#1b2133"; p.shadow = false; } // on a light photo (or a blank design) dark text reads best
  if (spec.letterSpacing) p.spacing = +spec.letterSpacing || 0;
  if (spec.lineHeight) p.lineHeight = +spec.lineHeight || 0;
  if (spec.uppercase) p.upper = true;
  if (spec.stroke) p.outline = spec.stroke;
  if (spec.background) p.bg = spec.background;
  if (spec.name) p.name = spec.name;
  return newOverlay("text", p);
}
/** Text overlays: one, or a group (font combinations) placed by dx/dy or stacked, centred on pt. */
async function kitText(specs, pt) {
  await kitPhoto();
  const { W, H } = picDims(), S = Math.min(W, H), c = kitPoint(pt);
  const list = specs.map((s) => (typeof s === "string" ? { content: s } : s || {}));
  const placed = list.some((s) => Number.isFinite(s.dx) || Number.isFinite(s.dy));
  const sizes = list.map((s) => ((s.rel > 0 ? s.rel : KIT_TEXT[s.role] || KIT_TEXT.body) * S * (s.lineHeight || 1.2) * String(s.content ?? "x").split("\n").length));
  const total = sizes.reduce((a, b) => a + b, 0) + Math.max(0, list.length - 1) * 0.3 * (sizes[0] || 0) / 1.2;
  let y = c.y * H - total / 2;
  const out = list.map((s, i) => {
    const at = placed ? { x: c.x + ((s.dx || 0) * S) / W, y: c.y + ((s.dy || 0) * S) / H } : { x: c.x, y: (y + sizes[i] / 2) / H };
    if (!placed) y += sizes[i] + (0.3 * sizes[i]) / 1.2;
    return kitTextOverlay(s, { x: clamp(at.x, 0.02, 0.98), y: clamp(at.y, 0.02, 0.98) }, S, H);
  });
  await prepareOverlays(out).catch(() => {});
  return kitAdd(out, "text");
}
/** Kit shape spec → a native shape overlay (fill / edge colours, edge width stay editable). */
async function kitShape(spec, pt) {
  const kind = String(spec?.kind || "");
  if (!KIT_SHAPES.has(kind) && !spec?.d) return false; // not a shape we can draw: the kit's SVG fallback adds it
  await kitPhoto();
  const vb = Array.isArray(spec.vb) ? spec.vb.map(Number) : typeof spec.vb === "string" ? spec.vb.trim().split(/[\s,]+/).map(Number) : null;
  const aspect = spec.aspect || (vb && vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : kind === "line" ? 6 : kind === "arrow" ? 2 : 1);
  const b = kitBox(spec.rel, aspect, pt, kind === "line" ? 0.4 : 0.3);
  const { W, H } = picDims(), S = Math.min(W, H);
  const p = { ...b, shape: KIT_SHAPES.has(kind) ? (kind === "rect" && spec.radius > 0 ? "rounded" : kind) : "path" };
  if (p.shape === "path") { p.d = String(spec.d); p.vb = vb && vb.length === 4 ? vb : [0, 0, 100, 100]; }
  if (kind === "polygon") p.sides = spec.sides || 6;
  if (kind === "star" && spec.points) p.points = spec.points;
  if (spec.radius > 0) p.radius = spec.radius > 1 ? spec.radius / Math.max(1, (vb && Math.min(vb[2], vb[3])) || 100) : spec.radius;
  const stroke = spec.stroke && spec.stroke !== "none" ? spec.stroke : null;
  p.fill = kind === "line" ? stroke || spec.fill || "#1b2133" : spec.fill || (stroke ? "none" : loadBrand().colors?.[0] || "#5b4cf0");
  if (stroke) p.stroke = stroke;
  if (spec.strokeWidth > 0) {
    // stroke width in the shape's own units (viewBox), or px of a 100-unit box: as % of the picture's shorter side
    const unit = (vb && Math.max(vb[2], vb[3])) || 100, longPx = Math.max(b.w * W, b.h * H);
    p.strokeWidth = Math.round(((spec.strokeWidth / unit) * longPx / (S * 0.01)) * 100) / 100;
  } else if (stroke && kind !== "line") p.strokeWidth = 1;
  if (spec.dash) p.dash = Array.isArray(spec.dash) ? spec.dash.map(Number).filter((n) => n > 0) : [3, 2];
  if (spec.arrow) p.arrow = spec.arrow === true ? "end" : spec.arrow;
  if (spec.name) p.name = spec.name;
  return kitAdd(newOverlay("shape", p));
}
/** Site-library elements become real stickers (recolourable); other vector art becomes a picture overlay. */
async function kitSvg(markup, meta = {}, pt) {
  await kitPhoto();
  const id = meta.elementId;
  if (id) {
    const E = await elementsLib();
    const el = E.ELEMENTS.find((e) => e.id === id);
    if (el) {
      const b = kitBox(meta.rel, meta.aspect || el.vb[0] / el.vb[1], pt, 0.3);
      const o = newOverlay("sticker", { elId: el.id, ...b, colors: { ...(meta.colors || {}) }, recolor: !!el.recolor, name: el.name });
      await stickerImage(o).catch(() => null);
      return kitAdd(o);
    }
  }
  return kitPicture(String(markup || ""), meta.name || "Graphic", pt, { rel: meta.rel, aspect: meta.aspect || svgAspect(markup), def: 0.3 });
}
// Frame shapes the photo itself can take (Elements → Frames puts the photo in that frame).
const KIT_FRAMES = { rounded: "rounded", circle: "circle", ellipse: "circle", heart: "heart", star: "star", hexagon: "hexagon", diamond: "diamond", arch: "arch", blob: "blob" };
async function kitFrame(spec) {
  // device, film and instant-photo frames (a drawn body with photo windows): the kit adds their picture to place
  if (!spec || spec.device || spec.screen || spec.screens || spec.svg) return false;
  // an outline (d + vb) keeps its exact shape and proportions; a bare shape name uses the photo's own frame of that name
  const id = spec.d ? "path" : KIT_FRAMES[spec.shape] || KIT_FRAMES[spec.kind] || null;
  if (!id) return false;
  await kitPhoto();
  if (id === "path") {
    const vb = (Array.isArray(spec.vb) ? spec.vb : String(spec.vb || "100 100").trim().split(/[\s,]+/)).map(Number);
    st.frame = { ...st.frame, id, d: String(spec.d), vb: vb.length === 4 || vb.length === 2 ? vb : [100, 100], width: 0, name: spec.name || "Shape" };
  } else st.frame = { ...st.frame, id };
  commit(); renderPanel();
  const name = id === "path" ? String(spec.name || "shape").toLowerCase() : FRAMES.find((f) => f.id === id)?.name.toLowerCase() || id;
  toast(`Your photo is now in the ${name} frame. Undo takes it out.`);
  return id;
}
/** A finished drawing (Tools → Draw) lands where it was drawn: svg in stage px, w × h, pt = its middle. */
async function kitDrawing(svg, size = {}, pt) {
  await kitPhoto();
  const { W, H } = picDims();
  const sw = +size.w || 0, sh = +size.h || 0;
  let box = null;
  if (sw > 0 && sh > 0 && pt && Number.isFinite(pt.clientX) && view.scale > 0) {
    const c = kitPoint(pt), fw = Math.min(1, sw / view.scale / W), fh = Math.min(1, sh / view.scale / H);
    box = { x: clamp(c.x, fw / 2, 1 - fw / 2), y: clamp(c.y, fh / 2, 1 - fh / 2), w: fw, h: fh };
  }
  return kitPicture(String(svg || ""), size.name || "Drawing", pt, { aspect: sw > 0 && sh > 0 ? sw / sh : svgAspect(svg), def: 0.6, box });
}
/** Uploads, photos and pictures: with no photo open the picture becomes the photo; else it is added on top. */
async function insertImage(src, name, pt) {
  if (!st) {
    const blob = await (await fetch(src)).blob();
    await openFile(new File([blob], name || "picture.png", { type: blob.type || "image/png" }));
    if (!st) throw new Error("That picture could not be opened.");
    return "photo";
  }
  return kitPicture(src, name, pt, { def: 0.5 });
}
function buildInsert() {
  return {
    image: (src, name, pt) => insertImage(src, name, pt),
    shape: (spec, pt) => kitShape(spec || {}, pt),
    svg: (markup, meta, pt) => kitSvg(markup, meta || {}, pt),
    // text(spec, pt); the old form text(str, style) still works
    text: (spec, pt) => kitText([typeof spec === "string" ? { content: spec, role: /^(h1|heading|title)$/.test(pt || "") ? "heading" : /^(h2|subheading)$/.test(pt || "") ? "subheading" : "body" } : spec || {}], typeof pt === "string" ? undefined : pt),
    textGroup: (specs, pt) => kitText(Array.isArray(specs) && specs.length ? specs : [{}], pt),
    frame: (spec, pt) => kitFrame(spec || {}, pt),
    drawing: (svg, size, pt) => kitDrawing(svg, size || {}, pt),
    color: (hex) => {
      const o = selOverlay();
      if (o?.type === "text") o.color = hex; else if (o?.type === "shape") o.fill = hex;
      else if (st?.bg.removed) { st.bg.mode = "color"; st.bg.color = hex; }
      else { toast("Select a text or shape first, or remove the background to colour it."); return; }
      commit(); renderPanel();
    },
    font: (key) => { const o = selOverlay(); if (o?.type !== "text") { toast("Select a text first."); return; } if (FONT_FAMILIES[key]) { o.family = key; commit(); renderPanel(); } },
  };
}
const kitInsert = buildInsert();

/* ---------- Design panel (shell): Layouts = shapes for the whole photo, Styles = the filter looks; a template's style ---------- */
function designLayouts(box) {
  box.append(h("p", { class: "hint" }, "A shape for the whole photo. Crop moves it and fine-tunes it."));
  box.append(h("div", { class: "design-grid" }, CROP_PRESETS.filter((c) => c.id !== "free").map((c) => {
    const a = typeof c.aspect === "number" ? c.aspect : 4 / 3;
    return h("button", { class: "dtile", "data-layout": c.id, title: c.label, onclick: () => {
      if (!st) { toast("Open a photo or pick a template first."); return; }
      if (busy) return;
      st.geom.aspect = c.id;
      const f = frameDims();
      st.geom.crop = aspectCrop(f.w, f.h, aspectValue());
      commit(); renderPanel();
      toast(`Photo shape: ${c.label}`);
    } }, h("span", { class: "dshape" + (c.aspect === "original" ? " orig" : ""), style: `aspect-ratio:${a.toFixed(4)}` }), h("span", {}, c.label));
  })));
}
function designStyles(box) {
  box.append(h("p", { class: "hint" }, "Looks for the whole photo. Change their strength in Edit → Filters."));
  const grid = h("div", { class: "design-grid looks" });
  let thumbs = null;
  try { if (st) { const small = scaleDown(geoStage(VIEW_MAX(), true).c, 120); thumbs = { small, base: getData(small) }; } } catch { thumbs = null; }
  for (const f of FILTERS) {
    let pic = h("span", { class: "dlook", "aria-hidden": "true" });
    if (thumbs) { const c = f.id === "none" ? thumbs.small : fromData(applyFilter(thumbs.base, f.id, 1)); const cv = makeCanvas(c.width, c.height); cv.getContext("2d").drawImage(c, 0, 0); pic = cv; }
    grid.append(h("button", { class: "dtile", "data-style-filter": f.id, title: f.name, onclick: () => {
      if (!st) { toast("Open a photo or pick a template first."); return; }
      if (busy) return;
      st.filter = { id: f.id, intensity: 100 };
      commit(); renderPanel();
      toast(f.id === "none" ? "Original look" : `${f.name} look`);
    } }, pic, h("span", {}, f.name)));
  }
  box.append(grid);
}
/** "Apply this template style": the template's colour look (light, filter, duotone, frame) and its text font and
 *  colour on your photo and your texts; your photo, crop and words stay. One undo step. */
async function applyTemplateStyle(id) {
  const t = GALLERY.templateById(id);
  if (!t) throw new Error("That template was not found.");
  if (!st) throw new Error("Open a photo first: the template's style goes on your photo.");
  if (busy) throw new Error("Please wait: the photo is still being worked on.");
  const tplText = (t.overlays || t.texts || []).find((o) => (o.type || "text") === "text");
  if (!(t.adjust || t.filter || t.duotone || t.invert || t.frame || tplText)) throw new Error("This template changes the background or settings, not the style. Use the template itself.");
  if (t.adjust || t.filter || t.duotone || t.invert) {
    st.adjust = { ...NEUTRAL, ...(t.adjust || {}) };
    st.filter = t.filter ? { id: t.filter[0], intensity: t.filter[1] } : { id: "none", intensity: 100 };
    ensureFx(st);
    st.fx = { ...st.fx, duotone: t.duotone ? { id: t.duotone, amount: t.duotoneAmount ?? 100 } : null, invert: !!t.invert };
  }
  if (t.frame) st.frame = { ...st.frame, ...t.frame };
  if (tplText) for (const o of st.overlays) if (o.type === "text" && !o.tpl) Object.assign(o, { family: tplText.family || o.family, color: tplText.color || o.color, ...(tplText.outline !== undefined ? { outline: tplText.outline } : {}), ...(tplText.bg !== undefined ? { bg: tplText.bg } : {}), ...(tplText.shadow !== undefined ? { shadow: tplText.shadow } : {}) });
  await prepareOverlays(st.overlays).catch(() => {});
  commit(); renderPanel();
  return true;
}
async function mountFrame() {
  let mod;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("The editor frame could not load", e); return null; }
  // floating toolbar: start button, the photo tools, turn/flip, and the old top bar actions (same ids)
  const pill = h("div", { class: "photo-pill", id: "photoBar" },
    h("div", { class: "pill-start", id: "pillStart" },
      h("button", { class: "btn primary", id: "pillOpen", onclick: () => $("#openInput").click() }, "Upload a photo"),
      h("span", { class: "hint" }, "or pick a template")),
    h("button", { class: "btn pill-edit", id: "pillEdit", "aria-label": "Edit photo: effects, filters, adjust, tools", onclick: () => { if (!st) { toast("Open a photo or pick a template first."); return; } openEdit(ui.editTab === "tools" ? "adjust" : ui.editTab); } }, "Edit"),
    $("#tools"),
    h("span", { class: "pill-sep", "aria-hidden": "true" }),
    h("div", { class: "pill-group", id: "quickTools", role: "group", "aria-label": "Turn and flip" },
      h("button", { class: "btn icon", id: "quickRotate", "aria-label": "Turn right 90°", title: "Turn right 90°", html: icon("rotate"), onclick: () => turnPhoto(1) }),
      h("button", { class: "btn icon", id: "quickFlip", "aria-label": "Flip left to right", title: "Flip left to right", html: icon("flip"), onclick: () => flipPhoto("x") }),
      h("button", { class: "btn icon", id: "quickOpacity", "aria-label": "Transparency", title: "Transparency", html: icon("opacity"), onclick: () => { if (st) openEdit("effects"); } }),
      h("button", { class: "btn icon", id: "copyStyle", "aria-label": "Copy style", title: "Copy style (use this look on another photo)", html: icon("style"), onclick: copyStyle }),
      h("button", { class: "btn", id: "pasteStyle", "aria-label": "Paste style", title: "Paste the copied style on this photo", disabled: !savedStyle(), onclick: pasteStyleNow }, "Paste style")),
    h("span", { class: "pill-sep", "aria-hidden": "true" }),
    $("#barActions"));
  // Elements, Text and Tools are the shared kit's Canva panels (shared/panels/); the photo editor adds its own part to each:
  // Tools = every photo tool (first), Elements = the photo frame and the selected item, Text = the selected text's look.
  // No label / icon on those three: the rail keeps the kit's names.
  const panels = { tools: { title: "Photo tools", primary: true, render: renderToolsHub } };
  for (const [id, d] of Object.entries(FRAME_PANELS)) {
    if (id === "elements" || id === "text") { const t = id === "text" ? "Your text" : "Your photo"; panels[id] = { title: t, kitLabel: t, render: (el) => { kitOwn[id] = el; attachToolPanel(el, id); } }; }
    else panels[id] = { label: d.label, icon: icon(d.tool || id), refresh: true, render: (el) => attachToolPanel(el, id) };
  }
  const dl = (format) => needPhoto(() => doExport({ format, size: "original", quality: format === "png" ? undefined : 0.92 }));
  try {
    framing = true;
    shell = mod.mountShell({
      app: "photo", kind: "Photo", title: st ? fileName : "", home: HOMES[mode] || HOMES.full,
      onTitle: (t) => { fileName = String(t || "").trim().slice(0, 120) || "photo"; if (st) scheduleSave(); },
      stage: $("#photoWork"), toolbar: pill, formulaBar: null,
      resize: { label: "Resize", open: () => { if (!st) { toast("Open a photo first, then pick a size."); return; } setTool("crop"); } },
      file: [
        { label: "New design", act: () => { location.href = location.pathname + "?new=1" + (mode !== "full" ? "&mode=" + mode : ""); } },
        { label: "Open a photo…", act: () => $("#openInput").click() },
        { label: "Download PNG", group: "Download", act: dl("png") },
        { label: "Download JPG", group: "Download", act: dl("jpg") },
        { label: "Download WebP", group: "Download", act: dl("webp") },
        { label: "Download PDF", group: "Download", act: dl("pdf") },
        { label: "Download options…", group: "Download", act: needPhoto(() => setTool("export")) },
        { label: "Passport photo sheet", group: "Download", act: needPhoto(() => doPassport()) },
        { label: "Use in a design", group: "Download", act: needPhoto(() => openInStudio()) },
        { label: "Undo", group: "Edit", act: undo },
        { label: "Redo", group: "Edit", act: redo },
        { label: "Before and after", group: "Edit", act: needPhoto(() => $("#splitBtn").click()) },
        { label: "Copy style", group: "Edit", act: needPhoto(copyStyle) },
        { label: "Paste style", group: "Edit", act: needPhoto(pasteStyleNow) },
        { label: "Fit the photo on screen", group: "View", act: () => setZoom(100) },
      ],
      share: { download: [{ label: "PNG", act: dl("png") }, { label: "JPG", act: dl("jpg") }, { label: "WebP", act: dl("webp") }, { label: "PDF", act: dl("pdf") }], link: () => location.origin + location.pathname + (mode !== "full" ? "?mode=" + mode : "") },
      templates: { gallery: galleryView, apply: applyTemplate, applyStyle: (id) => applyTemplateStyle(id), placeholder: "Search photo templates" },
      // Design panel tabs next to Templates: Layouts (shapes for the whole photo) and Styles (the filter looks)
      design: { layouts: (box) => designLayouts(box), styles: (box) => designStyles(box) },
      panels,
      rail: ["templates", "edit", "elements", "text", "brand", "uploads", "tools", "background", "projects", "apps"],
      initialPanel: params.get("template") ? "templates" : FIRST_PANEL[mode],
      insert: kitInsert,
      projects: {
        save: async () => { if (!st) throw new Error("Open a photo first."); const pid = await saveNow(); shell.setProjectId?.(pid); const r = await getProject(pid); return { name: r.name, data: r.data, thumb: r.thumb }; },
        open: async (rec) => { if (!(await openProject(rec.id))) throw new Error("That project is not a photo, or it could not be opened."); },
      },
      bottom: { notes: true, outline: null, timer: true, fullscreen: true, help: true, pages: null, zoom: { get: () => ui.zoom, set: setZoom, min: 25, max: 400 } },
      shortcuts: [["Ctrl + Z / Ctrl + Shift + Z", "Undo and redo"], ["Hold \\", "See the original photo"], ["Delete", "Remove the selected text or sticker"], ["Arrow keys", "Move the selected text or sticker"]],
      onPanel: (id) => {
        framePanel = id;
        if (id && id !== "crop" && tool === "crop" && st) setTool(mode === "full" ? "adjust" : mode, { fromFrame: true });
        // the kit keeps Elements / Text drawn between visits: put the photo's own part (#panel) back in its section
        if ((id === "elements" || id === "text") && kitOwn[id]?.isConnected && !kitOwn[id].contains(panelEl())) attachToolPanel(kitOwn[id], id);
      },
    });
    document.body.classList.add("has-shell");
    return shell;
  } catch (e) {
    console.error("The editor frame could not start", e);
    shell = null;
    framing = false;
    return null;
  }
}
/** "Tools" side panel: every photo tool in one list. */
function renderToolsHub(el) {
  const ai = aiReady();
  const items = [["bg", "Background remover", "Cut out the subject, then pick a new background"], ["erase", "Magic eraser", "Brush, click, the subject or text: gone and filled in"],
    ["pixel", "Pixel eraser", "Make parts see-through; Restore brings them back"], ["grab", "Magic Grab", "Lift a thing out to move and resize it"],
    ["grabtext", "Grab text", "Turn the words in the photo into text you can edit (Magic Layers)"], ["expand", "Magic Expand", "More photo round the edges, any shape"],
    ["enhance", "Upscale and enhance", "Sharper, cleaner and up to 4× bigger"], ["blur", "Blur", "Blur parts with a brush, or the whole photo"],
    ["focus", "Auto focus", "Sharp subject, soft background; pick what stays sharp"], ["retouch", "Face retouch", "Smoother skin, fewer spots"],
    ["crop", "Crop, turn and flip", "Square, story, passport and more; smart crop, straighten, perspective"],
    ["ai", "Magic edit (AI)", ai ? "Describe a change in your own words" : "Coming soon with AsaanDesk AI"],
    ["colorize", "Colour a black-and-white photo (AI)", ai ? "AsaanDesk AI adds natural colours" : "Coming soon with AsaanDesk AI"],
    ["export", "Download and passport photos", "JPG, PNG, WebP or PDF in any size; a 4×6 passport sheet"]];
  const go = (t) => {
    if (!st) { toast("Open a photo or pick a template first."); return; }
    if (t === "grabtext") { grabText(); return; }
    if (t === "colorize") { ui.aiPrompt = "Colour this black-and-white photo with natural colours"; keepPrompt(ui.aiPrompt); setTool("ai"); return; }
    setTool(t);
  };
  el.append(h("div", { class: "hub" }, items.map(([t, name, sub]) => h("button", { class: "hub-item", "data-tool": t, onclick: () => go(t) },
    h("span", { class: "hub-ic", html: icon(t === "grabtext" ? "text" : t) }), h("span", {}, h("b", {}, name), h("small", {}, sub))))));
}
/** Grab text: the photo as it looks now goes to Magic Layers, which reads its text into editable text layers. */
async function grabText() {
  if (busy || !st) return;
  try {
    showBusy("Opening Magic Layers…");
    const c = await exportCanvas({ size: "original", maxLong: 3000 });
    const blob = await toBlob(flatten(c, "#ffffff"), "image/png");
    const id = await putHandoff({ type: "image", blob, name: fileName + ".png" });
    await (saving || Promise.resolve());
    location.href = "/design/layers/?handoff=" + id;
  } catch (e) {
    hideBusy();
    toast(e.message || "Could not open Magic Layers.");
  }
}

window.adApp = {
  get state() { return st ? cloneState(st) : null; },
  get mode() { return mode; },
  get tool() { return tool; },
  get busy() { return busy; },
  /** true while a change is still waiting to be drawn (the next animation frame, or fonts and stickers loading) */
  get rendering() { return renderQueued || renderRunning > 0; },
  get projectId() { return projectId; },
  get lastExport() { return lastExport; },
  get lastEnhance() { return ui.lastEnhance; },
  get history() { return { past: hist.past.length, future: hist.future.length }; },
  get view() { return { ...view }; },
  open: openFile,
  openProject,
  setTool,
  undo, redo,
  exportBlob: (o) => exportBlob(o),
  passportBlob,
  designFromPhoto,
  openInStudio,
  removeBackground: runRemoveBackground,
  erase: runErase,
  enhance: (opts) => { Object.assign(ui.enhance, opts || {}); return runEnhance(); },
  aiEdit: runAiEdit,
  save: () => saveNow(),
  pixels: (which = "pixels") => { const id = which === "orig" ? "orig" : st?.[which] ?? (pix.has(which) ? which : null); const c = id && getPix(id, "full"); return c ? { width: c.width, height: c.height, data: getData(c).data } : null; },
  previewCanvas: () => $("#view"),
  applyTemplate, openSample,
  setAdjust: (a) => { st.adjust = { ...st.adjust, ...a }; commit(); renderPanel(); },
  /** the brush canvas was painted by a test (marks it like a stroke would) */
  markBrushed: () => { ui.brushDirty = true; for (const id of ["#areaUse", "#eraseGo"]) { const b = $(id); if (b) b.disabled = false; } },
  /** a click on the photo for the "Click" area, at fractions of the brush canvas */
  clickArea: (fx, fy) => { const b = $("#brush"), r = b.getBoundingClientRect(); clickSelect({ clientX: r.left + fx * (r.width || b.width), clientY: r.top + fy * (r.height || b.height), preventDefault() {} }); },
  get brushFor() { return ui.brushFor; },
  /** a brush stroke painted by a test ends (blur and pixel eraser strokes take effect then) */
  endStroke: () => { painting = painting || {}; onBrushUp(); },
  palette: () => (st ? photoColors() : []),
  setColorEdit: (hex, k, v) => setColorEdit(hex, k, v),
  copyStyle, pasteStyle: pasteStyleNow,
  expand: (target) => runExpand(target),
  grab: runGrab,
  bulkRemove,
  get lastBulk() { return ui.lastBulk || null; },
  setFx: (patch) => { Object.assign(st.fx, patch); commit(); renderPanel(); },
  setShadow: (s) => { st.frame = { ...st.frame, shadow: s }; commit(); renderPanel(); },
  setFrame: (f) => { st.frame = { ...st.frame, ...f }; commit(); renderPanel(); },
  get shell() { return shell; },
  get zoom() { return ui.zoom; },
  setZoom,
  /** the left-rail kit's insert adapter (shared/panels/index.js): image, shape, svg, text, textGroup, frame, drawing… */
  insert: kitInsert,
  get selected() { return selId; },
  /** Design panel: Layouts / Styles tabs and "Apply this template style" */
  designLayouts, designStyles, applyTemplateStyle,
  ready: null,
};

async function boot() {
  setModeUi();
  bind();
  // ?prompt= (the AI photo editor's intro page links its example prompts here) fills the prompt box
  const qp = params.get("prompt");
  if (qp && qp.trim()) keepPrompt(qp.trim().slice(0, 500));
  await mountFrame();
  const pid = params.get("project");
  if (pid && (await openProject(pid))) return;
  // another app (e.g. the AI image generator) can hand a picture over: { type: "image", blob, name }
  const hid = params.get("handoff");
  if (hid) {
    const p = await takeHandoff(hid).catch(() => null);
    if (p?.type === "image" && p.blob) { await openFile(new File([p.blob], p.name || "picture.png", { type: p.blob.type || "image/png" })); return; }
  }
  const t = params.get("tool");
  const knownTool = (x) => TOOLS.some((y) => y.id === x) || EXTRA_TOOLS.includes(x);
  if (t && knownTool(t) && mode === "full") tool = t;
  await renderStart();
  const tpl = params.get("template");
  if (tpl) {
    if (GALLERY.templateById(tpl)) await applyTemplate(tpl).catch((e) => toast(e.message || "That template could not open."));
    else toast("That template was not found. Open a photo or pick another template.");
  } else if (shell && t && knownTool(t) && !phone()) openToolPanel(t);
}
window.adApp.ready = boot().catch((e) => { console.error(e); toast("Something went wrong while starting. Please reload."); });
