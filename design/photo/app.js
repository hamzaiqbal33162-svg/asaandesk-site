// AsaanDesk photo editor: crop, adjust, filters, text/stickers/shapes, frames, background remover,
// magic eraser, image enhancer, passport sheet and export. Everything runs in this browser; only the
// optional "describe an edit" AI sends the photo online, and only when AsaanDesk AI is switched on.
//
// Modes: /design/photo/ (full editor), ?mode=bg (background remover flow), ?mode=enhance (image
// enhancer), ?mode=ai (AI photo editor). Edits are non-destructive: the state (doc.js) lists them and
// is re-applied to the pixels on every render; undo/redo swaps whole states.
import { ADJUSTMENTS, NEUTRAL, FILTERS, CROP_PRESETS, FULL_CROP, EXPORT_SIZES, isNeutral, renderPixels, applyFilter, geometryMatrix,
  orientedSize, aspectCrop, dragCrop, rotateCrop, flipCrop, exportDims, passportSheet, coverRect } from "./adjust.js";
import { DEFAULTS as ENHANCE_DEFAULTS, enhance as enhanceInline, safeScale } from "./enhance.js";
import { History, newState, cloneState, newOverlay, overlayBox, pickOverlay, framePad, FRAMES, SHAPES, TEXT_STYLES, uid } from "./doc.js";
import { makeCanvas, getData, fromData, scaleDown, resizeTo, toBlob, decodeFile, composeBackground, drawOverlay, prepareOverlays,
  applyFrame, elementsLib, stickerImage, PIXEL_LIMIT } from "./draw.js";
import { FONT_FAMILIES, loadBrand } from "../shared/brand.js";
import { saveProject, listProjects, getProject, deleteProject, putHandoff, takeHandoff } from "../shared/store.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";

const $ = (s, el = document) => el.querySelector(s);
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
const ui = { split: false, splitAt: 0.5, before: false, brush: 36, brushDirty: false, exportFmt: "jpg", exportQ: 90, exportSize: "original", customW: 1200,
  enhance: { ...ENHANCE_DEFAULTS }, stickerCat: "all", stickerQuery: "", lastEnhance: null, aiPrompt: "" };

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
  for (const k of [st?.pixels, st?.cutout, st?.bg?.imageId, "orig"]) if (k) keep.add(k);
  for (const id of [...pix.keys()]) if (!keep.has(id)) pix.delete(id);
}

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
function showBusy(msg, pct = null) {
  busy = true;
  $("#busy").hidden = false;
  setBusy(msg, pct);
}
function setBusy(msg, pct = null) {
  if (msg) $("#busyText").textContent = msg;
  const bar = $("#busyBar");
  bar.parentElement.hidden = pct == null;
  if (pct != null) bar.style.width = Math.round(Math.max(0, Math.min(1, pct)) * 100) + "%";
}
function hideBusy() { busy = false; $("#busy").hidden = true; }
const progressToBusy = (p) => setBusy(p.message || p.step, p.total ? p.loaded / p.total : p.done ?? null);
const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
function download(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
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
async function openFile(file) {
  if (!file || busy) return;
  try {
    showBusy("Opening the photo…");
    const r = await decodeFile(file, (m) => setBusy(m));
    fileName = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    pix.clear();
    putPix("orig", r.canvas, r.blob);
    st = newState({ w: r.canvas.width, h: r.canvas.height });
    st.pixels = "orig";
    hist.reset(cloneState(st));
    projectId = null;
    selId = null;
    ui.split = false;
    ui.lastEnhance = null;
    showEditor();
    if (r.scaled) toast(`This photo is very big, so it is edited at ${r.canvas.width}×${r.canvas.height} px.`, 4500);
    hideBusy();
    await renderNow();
    scheduleSave();
    if (mode === "bg") await runRemoveBackground();
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
    for (const [pid, blob] of Object.entries(rec.data.blobs || {})) {
      const r = await decodeFile(blob, null, { maxSide: 8192 });
      putPix(pid, r.canvas, blob);
    }
    st = rec.data.state;
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
    nav.append(h("button", { class: "tool" + (t.id === tool ? " on" : ""), role: "tab", "aria-selected": String(t.id === tool), "data-tool": t.id, html: icon(t.id) + `<span>${t.label}</span>`,
      onclick: () => setTool(t.id) }));
  }
}
function setTool(t) {
  if (busy) return;
  const was = tool;
  tool = t;
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
const cache = { comp: { key: null, c: null }, geo: { key: null, c: null }, ops: { key: null, c: null }, before: { key: null, c: null } };
const viewMode = () => (tool === "crop" ? "crop" : tool === "erase" ? "erase" : "normal");

// The subject over its chosen background (only after background removal), at "prev" or "full" size.
function composite(res) {
  const key = JSON.stringify([res, st.pixels, st.cutout, st.bg]);
  if (res === "prev" && cache.comp.key === key) return cache.comp.c;
  const bgImg = st.bg.mode === "image" && st.bg.imageId ? getPix(st.bg.imageId, res) : null;
  const c = composeBackground(getPix(st.pixels, res), getPix(st.cutout, res), st.bg, bgImg);
  if (res === "prev") cache.comp = { key, c };
  return c;
}
const sourceFor = (res, before) => (!before && st.bg.removed && st.cutout && pix.has(st.cutout) ? composite(res) : getPix(before ? "orig" : st.pixels, res));

// Geometry (turn, flip, straighten, crop) at a size whose long side is at most maxSide.
function geoStage(maxSide, withCrop, before = false) {
  const slot = before ? cache.before : cache.geo;
  const key = JSON.stringify([maxSide, withCrop, before, before ? "orig" : [st.pixels, st.cutout, st.bg], st.geom]);
  if (slot.key === key) return { c: slot.c, key };
  const src = sourceFor("prev", before);
  const geom = withCrop ? st.geom : { ...st.geom, crop: FULL_CROP };
  const g1 = geometryMatrix(src.width, src.height, geom, 1);
  const k = Math.min(1, maxSide / Math.max(g1.outW, g1.outH));
  const c = drawGeometry(src, geom, k);
  slot.key = key; slot.c = c;
  return { c, key };
}
function drawGeometry(src, geom, k) {
  const g = geometryMatrix(src.width, src.height, geom, k);
  const c = makeCanvas(g.outW, g.outH), x = c.getContext("2d");
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.setTransform(...g.matrix);
  x.drawImage(src, 0, 0);
  return c;
}
const hasOps = (s) => !isNeutral(s.adjust) || (s.filter.id !== "none" && s.filter.intensity > 0);
function opsStage(geo) {
  const key = geo.key + JSON.stringify([st.adjust, st.filter]);
  if (cache.ops.key === key) return cache.ops.c;
  const c = hasOps(st) ? fromData(renderPixels(getData(geo.c), { adjust: st.adjust, filter: st.filter })) : geo.c;
  cache.ops = { key, c };
  return c;
}
function finish(base, { overlays = true, frame = true } = {}) {
  const c = makeCanvas(base.width, base.height), x = c.getContext("2d");
  x.drawImage(base, 0, 0);
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
    out = getPix(st.pixels, "prev");
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
  const out = st.frame.id !== "none" ? applyFrame(geo.c, st.frame) : geo.c;
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
  const s = Math.min(aw / view.W, ah / view.H, view.mode === "erase" ? 4 : 2);
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
  if (!o || view.mode !== "normal" || tool !== "add") { box.hidden = true; return; }
  const b = overlayBox(o, view.photoW, view.photoH), s = view.scale;
  box.hidden = false;
  Object.assign(box.style, { left: (view.padL + b.cx - b.w / 2) * s + "px", top: (view.padT + b.cy - b.h / 2) * s + "px", width: b.w * s + "px", height: b.h * s + "px", transform: `rotate(${b.rot}deg)` });
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
function onBrushDown(e) {
  e.preventDefault();
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
  const btn = $("#eraseGo");
  if (btn) btn.disabled = false;
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
async function runRemoveBackground() {
  if (busy || !st) return;
  try {
    showBusy("Getting the background remover ready…", 0);
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
async function runEnhance() {
  if (busy || !st) return;
  try {
    const src = getPix(st.pixels, "full");
    const scale = safeScale(src.width, src.height, ui.enhance.scale, { maxPixels: PIXEL_LIMIT });
    showBusy("Enhancing…", 0);
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
    toast(scale < ui.enhance.scale && scale > 1 ? `Enhanced and upscaled ${res.scale}× (the largest safe size for this photo).` : `Enhanced: ${out.width}×${out.height} px. Drag the line to compare.`, 4500);
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
    const data = await onlineAi("/ai/photo-edit", { prompt, image, width: flat.width, height: flat.height }, "The AI photo editor");
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
  if (hasOps(st)) c = fromData((await runJob("render", getData(c), { adjust: st.adjust, filter: st.filter, seed: 7 })).img);
  const x = c.getContext("2d");
  for (const o of st.overlays) drawOverlay(x, o, c.width, c.height);
  c = applyFrame(c, st.frame);
  if (c.width !== target.w || c.height !== target.h) c = resizeTo(c, target.w, target.h);
  return c;
}
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
async function exportBlob({ format = ui.exportFmt, quality = ui.exportQ / 100, size = ui.exportSize, customW = ui.customW } = {}) {
  let c = await exportCanvas({ size, customW });
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
/** The finished photo as a one-page Studio design (Design JSON, see SPEC.md). */
async function designFromPhoto() {
  const c = await exportCanvas({ size: "original", maxLong: 2000 });
  const transparent = st.bg.removed && st.bg.mode === "transparent" || ["rounded", "circle"].includes(st.frame.id);
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
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saving = saveNow().catch((e) => console.warn("autosave", e)); }, 1500); }
async function saveNow() {
  if (!st) return null;
  const ids = [...new Set([st.pixels, st.cutout, st.bg.imageId, "orig"].filter((k) => k && pix.has(k)))];
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
  const p = $("#panel");
  p.innerHTML = "";
  if (!st) return;
  const build = { crop: panelCrop, adjust: panelAdjust, filters: panelFilters, add: panelAdd, bg: panelBackground, erase: panelErase, enhance: panelEnhance, ai: panelAi, export: panelExport }[tool];
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
    section("Straighten", slider({ id: "angle", label: "Angle", min: -45, max: 45, step: 0.5, value: st.geom.angle, fmt: (v) => `${v}°`,
      onInput: (v) => { st.geom.angle = v; scheduleRender({ draft: true }); }, onChange: () => { commit(); } })),
    h("div", { class: "row" },
      h("button", { class: "btn", onclick: () => { st.geom = { ...st.geom, rot: 0, flipX: false, flipY: false, angle: 0, crop: { ...FULL_CROP }, aspect: "free" }; commit(); renderPanel(); } }, "Reset"),
      h("button", { class: "btn primary", onclick: () => setTool(mode === "full" ? "adjust" : mode) }, "Done")),
    h("p", { class: "hint" }, "Drag the box or its corners. Arrow keys move it."),
  ];
}

function panelAdjust() {
  const groups = { light: "Light", colour: "Colour", detail: "Details" };
  const out = [];
  for (const [g, title] of Object.entries(groups)) {
    out.push(section(title, ADJUSTMENTS.filter((a) => a.group === g).map((a) => slider({ id: a.id, label: a.label, min: a.min, max: a.max, value: st.adjust[a.id] || 0,
      onInput: (v) => { st.adjust[a.id] = v; scheduleRender({ draft: true }); }, onChange: () => { commit(); } }))));
  }
  out.push(h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { st.adjust = { ...NEUTRAL }; commit(); renderPanel(); } }, "Reset all")));
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
function panelAdd() {
  const o = selOverlay();
  const out = [];
  out.push(section("Add", h("div", { class: "row" },
    h("button", { class: "btn", id: "addText", onclick: () => addOverlay(newOverlay("text", { family: loadBrand().fonts?.heading || "sans" })) }, "T  Text"),
    h("button", { class: "btn", onclick: () => addOverlay(newOverlay("shape", { shape: "rect", fill: loadBrand().colors?.[0] || "#5b4cf0" })) }, "◼  Shape"),
    h("button", { class: "btn", onclick: () => { ui.showStickers = !ui.showStickers; renderPanel(); } }, "★  Stickers")),
    h("div", { class: "chips" }, TEXT_STYLES.map((t) => chip(t.name, false, () => addOverlay(newOverlay("text", { ...t.props, text: t.id === "quote" ? "“Your words”" : "Your text" })))))));
  if (ui.showStickers) out.push(stickerPicker());
  if (o) out.push(overlayProps(o));
  else if (st.overlays.length) out.push(h("p", { class: "hint" }, "Tap something you added to change it."));
  out.push(section("Frame", h("div", { class: "chips" }, FRAMES.map((f) => chip(f.name, st.frame.id === f.id, () => { st.frame.id = f.id; commit(); renderPanel(); }, { "data-frame": f.id }))),
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
  return section(o.type === "text" ? "Text" : o.type === "shape" ? "Shape" : "Sticker", ...kids);
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

const BG_SWATCHES = ["#ffffff", "#000000", "#f3f4fb", "#5b4cf0", "#2f80ff", "#14b8a6", "#22c55e", "#f59e0b", "#ff7a59", "#f43f5e", "#1f2937", "#fde68a"];
function panelBackground() {
  const simple = mode === "bg";
  const out = [];
  if (!st.bg.removed || !st.cutout) {
    out.push(section(simple ? "Step 2 · Remove the background" : "Background remover",
      h("p", { class: "hint" }, "The background remover runs on this device. The first time it downloads a small model (about 19 MB with the engine)."),
      h("button", { class: "btn primary wide", id: "removeBg", onclick: runRemoveBackground }, st.cutout ? "Remove the background again" : "Remove background")));
    if (st.cutout) out.push(h("button", { class: "btn wide", onclick: () => { st.bg.removed = true; commit(); renderPanel(); } }, "Use the earlier cut-out"));
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
  if (simple) {
    const solid = st.bg.mode !== "transparent";
    out.push(section("Step 4 · Download", h("div", { class: "row" },
      h("button", { class: "btn primary", id: "bgDownloadPng", onclick: () => doExport({ format: "png", size: "original", suffix: "-no-bg" }) }, "Download PNG"),
      solid ? h("button", { class: "btn", id: "bgDownloadJpg", onclick: () => doExport({ format: "jpg", quality: 0.92, size: "original", suffix: "-new-bg" }) }, "Download JPG") : null),
      h("p", { class: "hint" }, solid ? "PNG keeps every detail; JPG is smaller." : "PNG keeps the see-through background.")));
  }
  out.push(h("button", { class: "btn wide subtle", onclick: () => { st.bg.removed = false; commit(); renderPanel(); } }, "Bring back the original background"));
  return out;
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

function panelErase() {
  return [
    section("Magic eraser", h("p", { class: "hint" }, "Brush over a person, object or text you want gone, then press Erase. It is filled in with what is around it."),
      slider({ id: "brush", label: "Brush size", min: 8, max: 120, value: ui.brush, fmt: (v) => v + " px", onInput: (v) => { ui.brush = v; } }),
      h("div", { class: "row" },
        h("button", { class: "btn primary", id: "eraseGo", disabled: !ui.brushDirty, onclick: runErase }, "Erase"),
        h("button", { class: "btn", onclick: clearBrush }, "Clear brush")),
      h("p", { class: "hint" }, "Works best on small things. The first use downloads the eraser model (about 42 MB with the engine).")),
  ];
}

function panelEnhance() {
  const e = ui.enhance;
  const set = (k, v) => { e[k] = v; renderPanel(); };
  const out = [section(mode === "enhance" ? "Image enhancer" : "Enhance",
    h("p", { class: "hint" }, "Sharper, cleaner and bigger, worked out on this device."),
    h("div", { class: "field" }, h("span", {}, "Upscale"), h("div", { class: "chips", role: "group", "aria-label": "Upscale" }, [1, 2, 4].map((s) => chip(s === 1 ? "Same size" : `${s}×`, e.scale === s, () => set("scale", s), { "data-scale": s })))),
    slider({ id: "denoise", label: "Clean noise", min: 0, max: 100, value: e.denoise, onInput: (v) => { e.denoise = v; } }),
    slider({ id: "sharpen-e", label: "Sharpen", min: 0, max: 100, value: e.sharpen, onInput: (v) => { e.sharpen = v; } }),
    h("div", { class: "chips" },
      chip("Auto colour", e.autoColor, () => set("autoColor", !e.autoColor)),
      chip("Auto contrast", e.autoContrast, () => set("autoContrast", !e.autoContrast)),
      chip("Face-safe", e.faceSafe, () => set("faceSafe", !e.faceSafe), { title: "Softer sharpening on skin" })),
    h("button", { class: "btn primary wide", id: "enhanceGo", onclick: runEnhance }, "Enhance photo"))];
  const src = getPix(st.pixels, "full");
  if (src) {
    const s = safeScale(src.width, src.height, e.scale, { maxPixels: PIXEL_LIMIT });
    out.push(h("p", { class: "hint", id: "enhanceSize" }, `Result: ${Math.round(src.width * s)}×${Math.round(src.height * s)} px${s < e.scale ? ` (${s}× is the largest safe size here)` : ""}.`));
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
function panelAi() {
  if (!aiReady()) { const box = h("div", { id: "aiSoon" }); aiComingSoon(box); return [box]; }
  const ta = h("textarea", { class: "ad-input", id: "aiPrompt", rows: 3, placeholder: "For example: make the sky a warm sunset", "aria-label": "Describe the edit", oninput: (e) => (ui.aiPrompt = e.target.value) }, ui.aiPrompt);
  return [section("Describe an edit", ta,
    h("div", { class: "chips" }, ["Make the sky blue", "Remove the people at the back", "Make it look like evening", "Add soft studio light"].map((t) => chip(t, false, () => { ui.aiPrompt = t; ta.value = t; }))),
    h("button", { class: "btn primary wide", id: "aiGo", onclick: () => runAiEdit(ta.value) }, "Edit with AI"),
    h("p", { class: "hint" }, "Your photo (up to 1536 px) and this text are sent to AsaanDesk AI. The result replaces the photo; Undo brings it back."))];
}

function panelExport() {
  const e = ui;
  const src = sourceFor("full", false);
  const g1 = geometryMatrix(src.width, src.height, st.geom, 1), p1 = framePad(st.frame, g1.outW, g1.outH);
  const dims = exportDims(g1.outW + p1.left + p1.right, g1.outH + p1.top + p1.bottom, e.exportSize, e.customW);
  const transparent = st.bg.removed && st.bg.mode === "transparent" || ["rounded", "circle"].includes(st.frame.id);
  return [
    section("Download", h("div", { class: "field" }, h("span", {}, "Format"), h("div", { class: "chips", role: "group", "aria-label": "Format" },
      ["jpg", "png", "webp"].map((f) => chip(f.toUpperCase(), e.exportFmt === f, () => { e.exportFmt = f; renderPanel(); }, { "data-format": f })))),
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
  for (const ev of ["pointerup", "pointercancel"]) brush.addEventListener(ev, () => (painting = null));
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
  pixels: (which = "pixels") => { const id = which === "orig" ? "orig" : st?.[which]; const c = id && getPix(id, "full"); return c ? { width: c.width, height: c.height, data: getData(c).data } : null; },
  previewCanvas: () => $("#view"),
  ready: null,
};

async function boot() {
  setModeUi();
  bind();
  const pid = params.get("project");
  if (pid && (await openProject(pid))) return;
  // another app (e.g. the AI image generator) can hand a picture over: { type: "image", blob, name }
  const hid = params.get("handoff");
  if (hid) {
    const p = await takeHandoff(hid).catch(() => null);
    if (p?.type === "image" && p.blob) { await openFile(new File([p.blob], p.name || "picture.png", { type: p.blob.type || "image/png" })); return; }
  }
  const t = params.get("tool");
  if (t && TOOLS.some((x) => x.id === t) && mode === "full") tool = t;
  await renderStart();
}
window.adApp.ready = boot().catch((e) => { console.error(e); toast("Something went wrong while starting. Please reload."); });
