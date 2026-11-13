// AsaanDesk Whiteboard: infinite board with notes, shapes, connectors, pen, frames, images, stickers,
// templates, PNG/SVG/PDF export and autosave (IndexedDB, this browser only).
import { normRect, routeConnector, unionRect, strokePath, smoothPoints, rectsIntersect, pointAlong } from "./geometry.js";
import { objectPrims, objectBounds, primsToSvg, drawPrimsCanvas, noteLayout, shapeLayout, textLayout, LINE, rotTransform, canRotate, rotatePoint, centerOf, fontCss, reactionBadges } from "./render.js";
import {
  newBoard, makeNote, makeText, makeShape, makeFrame, makeConnector, makeStroke, makeImage, makeSticker, makeTable, byIdOf, hitTest,
  expandGroups, frameChildren, objectsInRect, selectionBounds, moveObjects, resizeObject, normalizeObject, deleteObjects,
  copyObjects, pasteObjects, duplicateObjects, groupObjects, ungroupObjects, setLocked, reorder, alignObjects, strokesNear,
  History, parseBoard, boardToJSON, newId, NOTE_COLORS, INK_COLORS, HIGHLIGHT_COLORS, FILL_COLORS, SHAPE_KINDS, FORMAT,
} from "./model.js";
import { TEMPLATES, applyTemplate, templatePreviewSvg, templateBounds, templateById } from "./templates.js";
import { exportScope, boardToSvg, exportPdf as writePdf, fileBase, inlineLibraryPhotos } from "./exporters.js";
import { saveProject, listProjects, getProject, deleteProject, putHandoff } from "../shared/store.js";
import { boardToDeck, boardToDoc, boardSections } from "./convert.js";
import { ensureFont, loadBrand as loadBrandKit } from "../shared/brand.js";
import { makeWhiteboardInsert, makeWhiteboardDraw } from "./insert.js";

const SVGNS = "http://www.w3.org/2000/svg";
const $ = (s, el = document) => el.querySelector(s);
const boardEl = $("#board"), worldEl = $("#world"), camEl = $("#cam"), objsEl = $("#objs"), previewEl = $("#preview"), selEl = $("#sel");
const editorEl = $("#editor"), propsEl = $("#props"), minimapEl = $("#minimap"), sideEl = $("#side"), sideBody = $("#sideBody");
const LAST_KEY = "asaandesk-whiteboard-last";
const importModule = (p) => (globalThis.__adImport ? globalThis.__adImport(p) : import(p));

const state = {
  board: newBoard(), boardId: null, tool: "select", sel: new Set(), cam: { x: 0, y: 0, z: 1 },
  shapeKind: "rect", lineKind: "straight", noteColor: NOTE_COLORS[0].value,
  ink: { pen: { color: "#1b2133", width: 3 }, highlighter: { color: "#ffe600", width: 18 } },
  editing: null, space: false, saved: true, saving: false, panel: null, showMap: true, mode: "edit",
  quickFlow: true,
};
let shell = null; // the shared editor frame (top bar, rail, panels, bottom bar) once mounted
const hist = new History();
const board = () => state.board;
const byId = () => byIdOf(state.board);
const find = (id) => state.board.objects.find((o) => o.id === id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ helpers */
let toastTimer = 0;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src)); document.head.append(s); });
}
function download(data, name, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const isTyping = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
state.quickFlow = lsGet("asaandesk-whiteboard-quickflow") !== "off";

/* ------------------------------------------------------------------ camera */
function viewSize() { const r = boardEl.getBoundingClientRect(); return { w: r.width || innerWidth, h: r.height || innerHeight, left: r.left, top: r.top }; }
function toWorld(clientX, clientY) { const v = viewSize(), c = state.cam; return { x: (clientX - v.left - c.x) / c.z, y: (clientY - v.top - c.y) / c.z }; }
function toScreen(x, y) { const c = state.cam; return { x: x * c.z + c.x, y: y * c.z + c.y }; }
function viewCenter() { const v = viewSize(); return toWorld(v.left + v.w / 2, v.top + v.h / 2); }
function applyCam() {
  const c = state.cam;
  camEl.setAttribute("transform", `translate(${c.x} ${c.y}) scale(${c.z})`);
  const g = 24 * c.z;
  boardEl.style.backgroundSize = g < 8 ? "0 0" : `${g}px ${g}px`;
  boardEl.style.backgroundPosition = `${c.x}px ${c.y}px`;
  $("#zoomPct").textContent = Math.round(c.z * 100) + "%";
  try { shell?.setZoom?.(Math.round(c.z * 100)); } catch {}
  renderSelection();
  if (state.editing) positionEditor();
  scheduleMinimap();
}
function zoomAt(sx, sy, z) {
  const c = state.cam, nz = clamp(z, 0.1, 16);
  c.x = sx - ((sx - c.x) * nz) / c.z; c.y = sy - ((sy - c.y) * nz) / c.z; c.z = nz;
  applyCam();
}
function zoomBy(f) { const v = viewSize(); zoomAt(v.w / 2, v.h / 2, state.cam.z * f); }
function zoomToRect(r, maxZ = 1) {
  const v = viewSize();
  if (!r) { state.cam = { x: v.w / 2, y: v.h / 2, z: 1 }; applyCam(); return; }
  const phone = v.w < 641, padX = phone ? 24 : 90, padTop = phone ? 56 : 70, padBottom = phone ? 130 : 70;
  const z = clamp(Math.min((v.w - padX * 2) / Math.max(r.w, 1), (v.h - padTop - padBottom) / Math.max(r.h, 1), maxZ), 0.1, 4);
  state.cam = { z, x: v.w / 2 - (r.x + r.w / 2) * z, y: padTop + (v.h - padTop - padBottom) / 2 - (r.y + r.h / 2) * z };
  applyCam();
}
function boardRect() { const objs = board().objects; if (!objs.length) return null; const m = byId(); return unionRect(objs.map((o) => objectBounds(o, m))); }
const fit = () => zoomToRect(boardRect(), 1);

/* ------------------------------------------------------------------ render */
const cache = new Map(); // id -> { g, sig }
let raf = 0;
function requestRender() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderNow(); }); }
function sigOf(o, m) {
  // pictures: big data URLs by length only; library photos by path, plus the crop (focus, zoom) and round frame + ring
  if (o.type === "image") return `${o.id}|${o.x}|${o.y}|${o.w}|${o.h}|${o.src.length > 300 ? o.src.length : o.src}|${o.fit || ""}|${o.round ? 1 : 0}|${o.fx}|${o.fy}|${o.zoom}|${o.fill}|${o.stroke}|${o.sw}`;
  if (o.type === "connector") { const r = routeConnector(o, m).points; return JSON.stringify(o) + JSON.stringify(r); }
  return JSON.stringify(o);
}
function renderNow() {
  const m = byId(), seen = new Set();
  let prev = null;
  for (const o of board().objects) {
    seen.add(o.id);
    const hide = state.editing?.id === o.id;
    const sig = (hide ? "E" : "") + sigOf(o, m);
    let c = cache.get(o.id);
    if (!c) { const g = document.createElementNS(SVGNS, "g"); g.dataset.id = o.id; c = { g, sig: null }; cache.set(o.id, c); }
    if (c.sig !== sig) {
      c.g.innerHTML = primsToSvg(objectPrims(o, m, { hideText: hide }));
      const tr = rotTransform(o);
      if (tr) c.g.setAttribute("transform", tr); else c.g.removeAttribute("transform");
      c.g.setAttribute("class", `obj ${o.type}${o.tool === "highlighter" ? " hl" : ""}${o.locked ? " locked" : ""}`);
      c.g.dataset.type = o.type;
      c.sig = sig;
    }
    const want = prev ? prev.nextSibling : objsEl.firstChild;
    if (want !== c.g) objsEl.insertBefore(c.g, want);
    prev = c.g;
  }
  for (const [id, c] of cache) if (!seen.has(id)) { c.g.remove(); cache.delete(id); }
  renderSelection();
  scheduleMinimap();
  $("#empty").hidden = board().objects.length > 0 || !!state.panel;
  $("#undoBtn").disabled = !hist.canUndo;
  $("#redoBtn").disabled = !hist.canRedo;
}
function svgEl(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function renderSelection() {
  selEl.textContent = "";
  const z = state.cam.z, ids = state.sel;
  if (!ids.size) { renderProps(); return; }
  const m = byId(), list = board().objects.filter((o) => ids.has(o.id));
  const sw = 1.5, hs = 10 / z;
  for (const o of list) {
    if (o.type === "connector") {
      const pts = routeConnector(o, m).points;
      selEl.append(svgEl("path", { d: "M" + pts.map((p) => p.join(" ")).join(" L"), fill: "none", stroke: "#5b4cf0", "stroke-width": 4, opacity: 0.25 }));
      if (ids.size === 1 && !o.locked) for (const [k, p] of [["from", pts[0]], ["to", pts[pts.length - 1]]]) selEl.append(svgEl("circle", { cx: p[0], cy: p[1], r: 7 / z, fill: "#fff", stroke: "#5b4cf0", "stroke-width": 2, "data-handle": k }));
      continue;
    }
    const rotG = o.rot && canRotate(o) ? svgEl("g", { transform: rotTransform(o) }) : null;
    const b = o.type === "frame" || rotG ? { x: o.x, y: o.y, w: o.w, h: o.h } : objectBounds(o, m);
    (rotG ? (selEl.append(rotG), rotG) : selEl).append(svgEl("rect", { x: b.x - 3 / z, y: b.y - 3 / z, width: b.w + 6 / z, height: b.h + 6 / z, fill: "none", stroke: o.locked ? "#9aa1b5" : "#5b4cf0", "stroke-width": sw, "stroke-dasharray": ids.size > 1 || o.locked ? "5 4" : "none", rx: 4 / z }));
    if (o.locked) {
      const lx = b.x + b.w - 8 / z, ly = b.y - 18 / z, s = 1 / z;
      const g = svgEl("g", { transform: `translate(${lx} ${ly}) scale(${s})` });
      g.append(svgEl("rect", { x: -9, y: -2, width: 18, height: 16, rx: 4, fill: "#5b4cf0" }), svgEl("path", { d: "M-4 5V2a4 4 0 0 1 8 0v3M-5 5h10v7h-10z", fill: "none", stroke: "#fff", "stroke-width": 1.6 }));
      selEl.append(g);
    }
  }
  if (list.length === 1 && list[0].type !== "connector" && !list[0].locked) {
    const o = list[0];
    const g = o.rot && canRotate(o) ? svgEl("g", { transform: rotTransform(o) }) : selEl;
    if (g !== selEl) selEl.append(g);
    const handles = o.type === "text" ? ["w", "e"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    for (const h of handles) {
      const x = o.x + (h.includes("w") ? 0 : h.includes("e") ? o.w : o.w / 2), y = o.y + (h.includes("n") ? 0 : h.includes("s") ? o.h : o.h / 2);
      g.append(svgEl("rect", { x: x - hs / 2, y: y - hs / 2, width: hs, height: hs, rx: 2 / z, fill: "#fff", stroke: "#5b4cf0", "stroke-width": 1.5, "data-handle": h }));
    }
    if (!o.rot && state.quickFlow !== false && ["note", "shape", "text", "image", "sticker"].includes(o.type) && state.tool === "select") {
      // "+" handles (quick flowchart): drag one to another item for an attached arrow, or click it to add a connected node.
      const off = 24 / z, r = 8 / z, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      for (const [side, x, y] of [["top", cx, o.y - off], ["right", o.x + o.w + off, cy], ["bottom", cx, o.y + o.h + off], ["left", o.x - off, cy]]) {
        const lg = svgEl("g", { "data-handle": "link-" + side, class: "link-handle" });
        const tt = svgEl("title", {}); tt.textContent = "Add a connected item (Alt+Arrow)"; lg.append(tt);
        lg.append(svgEl("circle", { cx: x, cy: y, r, fill: "#fff", stroke: "#5b4cf0", "stroke-width": 1.5, "data-handle": "link-" + side }));
        lg.append(svgEl("path", { d: `M${x - r * 0.45} ${y}h${r * 0.9}M${x} ${y - r * 0.45}v${r * 0.9}`, stroke: "#5b4cf0", "stroke-width": 1.6, "data-handle": "link-" + side }));
        selEl.append(lg);
      }
    }
    if (canRotate(o)) {
      // Rotate handle: a round arrow button under the object (like Canva).
      const cx = o.x + o.w / 2, cy = o.y + o.h + 58 / z, r = 10 / z;
      const rg = svgEl("g", { "data-handle": "rot", class: "rot-handle" });
      rg.append(svgEl("circle", { cx, cy, r, fill: "#fff", stroke: "#5b4cf0", "stroke-width": 1.5, "data-handle": "rot" }));
      rg.append(svgEl("path", { d: `M${cx - r * 0.45} ${cy - r * 0.2}a${r * 0.5} ${r * 0.5} 0 1 0 ${r * 0.45} ${-r * 0.3}M${cx - r * 0.05} ${cy - r * 0.75}l${r * 0.15} ${r * 0.25}l${-r * 0.3} ${r * 0.1}`, fill: "none", stroke: "#5b4cf0", "stroke-width": 1.4, "data-handle": "rot" }));
      g.append(rg);
    }
  }
  if (list.length > 1) {
    const b = selectionBounds(board(), ids);
    if (b) selEl.append(svgEl("rect", { x: b.x - 8 / z, y: b.y - 8 / z, width: b.w + 16 / z, height: b.h + 16 / z, fill: "none", stroke: "#5b4cf0", "stroke-width": 1, "stroke-dasharray": "2 3" }));
  }
  renderProps();
}

/* ------------------------------------------------------------------ minimap */
let mmTimer = 0;
function scheduleMinimap() { if (!mmTimer) mmTimer = setTimeout(() => { mmTimer = 0; renderMinimap(); }, 60); }
let mmView = null;
function renderMinimap() {
  if (!state.showMap || (!globalThis.__adForceMap && getComputedStyle(minimapEl).display === "none")) return;
  const v = viewSize(), m = byId();
  const vp = { x: -state.cam.x / state.cam.z, y: -state.cam.y / state.cam.z, w: v.w / state.cam.z, h: v.h / state.cam.z };
  const all = unionRect([boardRect(), vp]);
  const pad = Math.max(all.w, all.h) * 0.05;
  mmView = { x: all.x - pad, y: all.y - pad, w: all.w + pad * 2, h: all.h + pad * 2 };
  minimapEl.setAttribute("viewBox", `${mmView.x} ${mmView.y} ${mmView.w} ${mmView.h}`);
  minimapEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const fillOf = (o) => (o.type === "note" ? o.color : o.type === "shape" ? (o.fill !== "none" ? o.fill : "#c9cede") : o.type === "frame" ? "#ffffff" : o.type === "image" ? "#b8bfd3" : "#9aa1b5");
  let s = "";
  for (const o of board().objects) {
    if (o.type === "connector") continue;
    const b = objectBounds(o, m);
    s += `<rect x="${b.x}" y="${b.y}" width="${Math.max(b.w, 2)}" height="${Math.max(b.h, 2)}" fill="${fillOf(o)}" stroke="#c9cede" stroke-width="1" vector-effect="non-scaling-stroke" rx="2"/>`;
  }
  s += `<rect class="vp" x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" rx="4"/>`;
  minimapEl.innerHTML = s;
}
function minimapPan(e) {
  if (!mmView) return;
  const r = minimapEl.getBoundingClientRect();
  const k = Math.min(r.width / mmView.w, r.height / mmView.h), ox = (r.width - mmView.w * k) / 2, oy = (r.height - mmView.h * k) / 2;
  const wx = mmView.x + (e.clientX - r.left - ox) / k, wy = mmView.y + (e.clientY - r.top - oy) / k;
  const v = viewSize();
  state.cam.x = v.w / 2 - wx * state.cam.z; state.cam.y = v.h / 2 - wy * state.cam.z;
  applyCam();
}
minimapEl.addEventListener("pointerdown", (e) => { e.preventDefault(); minimapEl.setPointerCapture?.(e.pointerId); minimapPan(e); const mv = (ev) => minimapPan(ev), up = () => { minimapEl.removeEventListener("pointermove", mv); minimapEl.removeEventListener("pointerup", up); }; minimapEl.addEventListener("pointermove", mv); minimapEl.addEventListener("pointerup", up); });

/* ------------------------------------------------------------------ changes, history, autosave */
function checkpoint() { hist.checkpoint(board().objects); }
function changed() { state.saved = false; scheduleSave(); requestRender(); }
function change(fn) { checkpoint(); const r = fn(); changed(); return r; }
function setSel(ids) { state.sel = new Set(ids); requestRender(); renderSelection(); }
function undo() {
  finishEdit();
  const prev = hist.undo(board().objects);
  if (!prev) return;
  board().objects = prev; afterRestore();
}
function redo() {
  finishEdit();
  const next = hist.redo(board().objects);
  if (!next) return;
  board().objects = next; afterRestore();
}
function afterRestore() { const ids = new Set(board().objects.map((o) => o.id)); state.sel = new Set([...state.sel].filter((id) => ids.has(id))); changed(); }

let saveTimer = 0;
function setSaveState(t) {
  $("#saveState").textContent = t;
  try { shell?.setSaved?.(t === "Saved" ? "saved" : t === "Saving…" ? "saving" : "unsaved"); } catch {}
}
function scheduleSave() { setSaveState("Saving…"); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow().catch((e) => { console.warn(e); setSaveState("Not saved"); toast("Could not save in this browser: " + (e.message || e)); }), 600); }
function thumbOf() {
  try {
    const b = { ...board(), objects: board().objects.map((o) => (o.type === "image" ? { ...makeShape({ x: o.x, y: o.y, w: o.w, h: o.h, fill: "#dfe3ee", stroke: "none" }), id: o.id } : o)) };
    const svg = boardToSvg(b, { margin: 30 });
    return svg.length < 300000 ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg) : null;
  } catch { return null; }
}
async function saveNow() {
  clearTimeout(saveTimer);
  if (!state.boardId) state.boardId = state.pendingId || newId();
  state.saving = true;
  try {
    await saveProject({ id: state.boardId, app: "whiteboard", name: board().name, data: boardToJSON(board()), thumb: thumbOf() });
    state.saved = true;
    lsSet(LAST_KEY, state.boardId);
    try { const u = new URL(location.href); if (u.searchParams.get("board") !== state.boardId || u.searchParams.has("new") || u.searchParams.has("template") || u.searchParams.has("handoff")) { u.searchParams.set("board", state.boardId); for (const k of ["new", "template", "handoff"]) u.searchParams.delete(k); history.replaceState(null, "", u); } } catch {}
    setSaveState("Saved");
  } finally { state.saving = false; }
}
function loadBoard(b, id = null) {
  finishEdit();
  state.board = b; state.boardId = id; state.sel = new Set(); hist.clear();
  // Notes and comments in the editor frame belong to this board (a new board gets its id now, saved later).
  state.pendingId = id || newId();
  try { shell?.setDesignId?.(state.pendingId); } catch {}
  for (const [, c] of cache) c.g.remove();
  cache.clear();
  $("#boardName").value = b.name;
  document.title = `${b.name} | Whiteboard | AsaanDesk`;
  try { shell?.setTitle?.(b.name); } catch {}
  renderNow(); fit();
}

/* ------------------------------------------------------------------ tools */
function setTool(t) {
  finishEdit();
  state.tool = t;
  document.body.dataset.tool = t;
  for (const b of document.querySelectorAll(".tool[data-tool]")) { const on = b.dataset.tool === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }
  if (t !== "select" && t !== "hand") setSel([]);
  renderProps();
}
for (const b of document.querySelectorAll(".tool[data-tool]")) b.addEventListener("click", () => setTool(b.dataset.tool));

/* ------------------------------------------------------------------ props bar (tool options / selection actions) */
const ICONS = {
  dup: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
  front: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>',
  back: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor" fill-opacity=".25"/><path d="M20 8v11a1 1 0 0 1-1 1H8"/></svg>',
  group: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="7" y="7" width="5" height="5"/><rect x="12" y="12" width="5" height="5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  bold: '<svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',
  italic: '<svg viewBox="0 0 24 24"><path d="M10 5h8M6 19h8M14 5l-4 14"/></svg>',
  rotate: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
  forward: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  backward: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  smile: '<svg viewBox="0 0 24 24"><circle cx="11" cy="12" r="7.5"/><path d="M8 13.5c1.6 2 4.4 2 6 0M8.6 9.6h.01M13.4 9.6h.01M19 3v5M16.5 5.5h5"/></svg>',
  sort: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="6" height="6" rx="1"/><rect x="3.5" y="14" width="6" height="6" rx="1"/><path d="M14 6h7M14 10h5M14 16h7M14 20h4"/></svg>',
  copytext: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 12h6M11 15.5h4"/></svg>',
};
const swatch = (attr, value, on, label) => `<button type="button" class="swatch${value === "none" ? " none" : ""}${on ? " on" : ""}" ${attr}="${value}" style="background:${value === "none" ? "#fff" : value}" aria-label="${label || value}" title="${label || value}" aria-pressed="${on}"></button>`;
const pbtn = (act, html, label, extra = "") => `<button type="button" class="pbtn${extra}" data-act="${act}" aria-label="${label}" title="${label}">${html}</button>`;
const SEP = '<span class="sep" aria-hidden="true"></span>';
const SHAPE_ICON = {
  rect: '<rect x="4" y="6" width="16" height="12"/>', rounded: '<rect x="4" y="6" width="16" height="12" rx="4"/>', ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>',
  diamond: '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/>', triangle: '<path d="M12 4l8.5 15h-17z"/>', star: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"/>',
};
let propsSig = "";
const TEXTY = new Set(["note", "shape", "text"]);
const REACTION_EMOJI = [["👍", "thumbs up yes agree"], ["❤️", "heart love"], ["😂", "laugh funny"], ["😮", "wow surprised"], ["🎉", "party celebrate"], ["🔥", "fire hot"],
  ["💡", "idea light bulb"], ["✅", "done check yes"], ["⭐", "star favourite"], ["👀", "eyes look"], ["🙌", "hands yay"], ["🤔", "thinking question"],
  ["👏", "clap applause"], ["😍", "love eyes"], ["🚀", "rocket launch"], ["⚠️", "warning risk"], ["❓", "question"], ["💯", "hundred perfect"],
  ["🙂", "smile happy"], ["😢", "sad"], ["👎", "thumbs down no"], ["💪", "strong"], ["📌", "pin important"], ["🌱", "grow new"]];
let lastCopiedText = "";
const FONTS = [["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"], ["calibri", "Calibri style"], ["cambria", "Cambria style"]];
const SECTION_FILLS = ["#ffffff", "#f6f5ff", "#eef6ff", "#effcf6", "#fff9e8", "#fff1f2", "#f1f2f8"];
function renderProps() {
  const t = state.tool, sel = board().objects.filter((o) => state.sel.has(o.id));
  const sig = JSON.stringify([t, state.shapeKind, state.lineKind, state.ink[t] || null, state.noteColor, sel.map((o) => [o.id, o.type, o.color, o.fill, o.stroke, o.size, o.bold, o.align, o.kind, o.arrow, o.locked, o.group, o.tool, o.element?.colors?.c1, o.italic, o.font, o.textColor, o.rot, o.dash, o.sw, o.author, (o.reactions || []).join("")])]);
  if (sig === propsSig) return;
  propsSig = sig;
  let h = "";
  if (t === "shape" && !sel.length) {
    h = `<span class="lbl">Shape</span>` + SHAPE_KINDS.map((k) => `<button type="button" class="pbtn${state.shapeKind === k.id ? " on" : ""}" data-kind="${k.id}" aria-label="${k.label}" title="${k.label}" aria-pressed="${state.shapeKind === k.id}"><svg viewBox="0 0 24 24">${SHAPE_ICON[k.id]}</svg></button>`).join("");
  } else if (t === "connector" && !sel.length) {
    h = `<span class="lbl">Line</span><button type="button" class="pbtn${state.lineKind === "straight" ? " on" : ""}" data-line="straight" aria-pressed="${state.lineKind === "straight"}">Straight</button><button type="button" class="pbtn${state.lineKind === "elbow" ? " on" : ""}" data-line="elbow" aria-pressed="${state.lineKind === "elbow"}">Elbow</button><span class="lbl">Drag from one item to another</span>`;
  } else if ((t === "pen" || t === "highlighter") && !sel.length) {
    const ink = state.ink[t], colors = t === "pen" ? INK_COLORS : HIGHLIGHT_COLORS, widths = t === "pen" ? [[2, "Thin"], [4, "Medium"], [8, "Thick"]] : [[12, "Thin"], [18, "Medium"], [30, "Thick"]];
    h = colors.map((c) => swatch("data-ink", c, ink.color === c)).join("") + SEP + widths.map(([w, l]) => `<button type="button" class="pbtn${ink.width === w ? " on" : ""}" data-width="${w}" aria-label="${l} line" aria-pressed="${ink.width === w}"><svg viewBox="0 0 24 24"><path d="M4 12h16" stroke-width="${Math.min(10, w / (t === "pen" ? 1.2 : 3))}"/></svg></button>`).join("");
  } else if (t === "note" && !sel.length) {
    h = `<span class="lbl">Note colour</span>` + NOTE_COLORS.map((c) => swatch("data-notecolor", c.value, state.noteColor === c.value, c.name)).join("");
  } else if (t === "eraser") {
    h = `<span class="lbl">Drag over pen and marker lines to remove them</span>`;
  } else if (sel.length) {
    const one = sel.length === 1 ? sel[0] : null, types = new Set(sel.map((o) => o.type)), only = (ty) => types.size === 1 && types.has(ty);
    if (only("note")) h += popBtn("note", sel[0].color, "Sticky note colour") + pbtn("author", "You", "Show the author's name on the note", sel.every((o) => o.author) ? " on" : "") +
      `<button type="button" class="pbtn" data-pop="react" aria-haspopup="dialog" aria-label="Add a reaction" title="Add a reaction">${ICONS.smile}</button>` +
      (sel.length > 1 ? `<button type="button" class="pbtn" data-pop="sort" aria-haspopup="dialog" aria-label="Sort the sticky notes" title="Sort">${ICONS.sort}Sort</button>` : "") + SEP;
    if (sel.some((o) => TEXTY.has(o.type) && o.text)) h += pbtn("copytext", ICONS.copytext, "Copy as text");
    if (only("shape")) h += popBtn("fill", sel[0].fill, "Fill colour") + popBtn("border", sel[0].stroke, "Border", true) +
      // Canva Quick Flow: change the shape (its lines stay connected) and turn the "+" arrows on / off.
      `<select data-set-shapekind aria-label="Change shape" title="Change shape (lines stay connected)">${SHAPE_KINDS.map((k) => `<option value="${k.id}"${sel.every((o) => o.kind === k.id) ? " selected" : ""}>${k.label}</option>`).join("")}</select>` +
      pbtn("quickflow", "Quick Flow", state.quickFlow === false ? "Enable Quick Flow (the + arrows around shapes)" : "Disable Quick Flow (hide the + arrows)", state.quickFlow === false ? "" : " on") + SEP;
    if (only("frame")) h += `<span class="lbl">Section colour</span>` + SECTION_FILLS.map((c) => swatch("data-set-fill", c, sel.every((o) => (o.fill || "#ffffff") === c))).join("") + SEP;
    if ([...types].every((ty) => TEXTY.has(ty))) {
      const size = sel[0].size, f = sel[0].font || "sans", al = one?.align || (one?.type === "text" ? "left" : "center");
      const tc = one ? (one.type === "text" ? one.color : one.textColor) || "#1b2133" : "#1b2133";
      h += `<select data-set-font aria-label="Font" title="Font">${FONTS.map(([v, l]) => `<option value="${v}"${f === v ? " selected" : ""} style="font-family:${fontCss(v).replace(/"/g, "'")}">${l}</option>`).join("")}</select>` +
        pbtn("smaller", "A−", "Smaller text") + `<span class="size" aria-label="Text size">${size}</span>` + pbtn("bigger", "A+", "Bigger text") +
        `<button type="button" class="pbtn pcolor" data-pop="text" aria-haspopup="dialog" aria-label="Text colour" title="Text colour"><span class="a" style="border-color:${tc}">A</span></button>` +
        pbtn("bold", ICONS.bold, "Bold", sel.every((o) => o.bold) ? " on" : "") + pbtn("italic", ICONS.italic, "Italic", sel.every((o) => o.italic) ? " on" : "") +
        `<select data-set-align aria-label="Text alignment"><option value="left"${al === "left" ? " selected" : ""}>Left</option><option value="center"${al === "center" ? " selected" : ""}>Centre</option><option value="right"${al === "right" ? " selected" : ""}>Right</option></select>`;
      h += SEP;
    }
    if (only("connector")) {
      const c = sel[0];
      h += popBtn("line", c.stroke || "#334155", "Line colour") + SEP +
        `<button type="button" class="pbtn${c.kind !== "elbow" ? " on" : ""}" data-set-kind="straight">Straight</button><button type="button" class="pbtn${c.kind === "elbow" ? " on" : ""}" data-set-kind="elbow">Elbow</button>` +
        pbtn("swapends", "⇄", "Swap line ends") +
        `<select data-set-arrow aria-label="Arrow heads"><option value="end"${(c.arrow ?? "end") === "end" ? " selected" : ""}>Arrow at end</option><option value="both"${c.arrow === "both" ? " selected" : ""}>Arrows both ends</option><option value="none"${c.arrow === "none" ? " selected" : ""}>No arrows</option></select>` + SEP;
    }
    if (only("stroke")) h += (sel[0].tool === "highlighter" ? HIGHLIGHT_COLORS : INK_COLORS).map((c) => swatch("data-set-strokecolor", c, sel.every((o) => o.color === c))).join("") + SEP;
    if (only("sticker") && one?.element?.parts?.some((p) => /^\$/.test(p.fill || "") || /^\$/.test(p.stroke || ""))) h += `<span class="lbl">Colour</span>` + ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#1b2133"].map((c) => swatch("data-set-sticker", c, one.element.colors?.c1 === c)).join("") + SEP;
    if (one && ["note", "shape", "text", "frame", "connector"].includes(one.type)) h += pbtn("edit", ICONS.edit + (one.type === "frame" ? "Rename" : "Text"), one.type === "frame" ? "Rename frame" : "Edit text");
    if (one?.type === "frame") h += pbtn("exportframe", "Export frame", "Export this frame");
    if (sel.some(canRotate)) h += pbtn("rotate", ICONS.rotate, "Rotate 90°");
    h += pbtn("duplicate", ICONS.dup, "Duplicate (Ctrl+D)") + pbtn(sel.every((o) => o.locked) ? "unlock" : "lock", sel.every((o) => o.locked) ? ICONS.unlock : ICONS.lock, sel.every((o) => o.locked) ? "Unlock" : "Lock") +
      pbtn("front", ICONS.front, "Bring to front (Ctrl+])") + pbtn("back", ICONS.back, "Send to back (Ctrl+[)") + `<button type="button" class="pbtn" data-pop="layer" aria-haspopup="dialog" aria-label="Position: forward, backward" title="Position">${ICONS.forward}</button>`;
    if (sel.length > 1) {
      const grouped = sel.every((o) => o.group && o.group === sel[0].group);
      h += pbtn(grouped ? "ungroup" : "group", ICONS.group + (grouped ? "Ungroup" : "Group"), grouped ? "Ungroup (Ctrl+Shift+G)" : "Group (Ctrl+G)");
      h += `<select data-align aria-label="Align"><option value="">Align…</option><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>${sel.length > 2 ? '<option value="hspace">Space across</option><option value="vspace">Space down</option>' : ""}</select>`;
    }
    h += pbtn("delete", ICONS.del, "Delete (Del)", " danger");
  }
  propsEl.innerHTML = h;
  propsEl.hidden = !h;
  if (popKind) { if (sel.length) fillPropsPop(); else closePropsPop(); }
}
/** Round colour button that opens the colour popover (ring = border style). */
function popBtn(kind, value, label, ring = false) {
  const v = !value || value === "none" ? "none" : value;
  return `<button type="button" class="pbtn pcolorbtn${ring ? " ring" : ""}" data-pop="${kind}" aria-haspopup="dialog" aria-label="${label}" title="${label}"><span class="cdot${v === "none" ? " none" : ""}" style="${ring ? `border-color:${v === "none" ? "#d5d9e6" : v}` : `background:${v === "none" ? "#fff" : v}`}"></span></button>`;
}
// The colour / position popover under the toolbar pill.
const propsPop = document.createElement("div");
propsPop.className = "props-pop"; propsPop.hidden = true; propsPop.setAttribute("role", "dialog"); propsPop.setAttribute("aria-label", "Colours");
document.body.append(propsPop);
let popKind = null, popAnchor = null;
const anyColor = (attr, v, label) => `<label class="pcolor any" title="${label}"><span class="rb"></span><input type="color" ${attr} value="${/^#[0-9a-f]{6}$/i.test(v || "") ? v : "#5b4cf0"}" aria-label="${label}"></label>`;
function fillPropsPop() {
  const sel = board().objects.filter((o) => state.sel.has(o.id)), o = sel[0];
  if (!o) return closePropsPop();
  const every = (fn) => sel.every(fn);
  let h = "";
  if (popKind === "note") h = `<b>Sticky note colour</b><div class="pp-row">${NOTE_COLORS.map((c) => swatch("data-set-note", c.value, every((x) => x.color === c.value), c.name)).join("")}</div>`;
  else if (popKind === "fill") h = `<b>Fill colour</b><div class="pp-row">${FILL_COLORS.map((c) => swatch("data-set-fill", c, every((x) => x.fill === c), c === "none" ? "No fill" : c)).join("")}${anyColor("data-set-fill-input", o.fill, "Any fill colour")}</div>`;
  else if (popKind === "border") h = `<b>Border</b><div class="pp-row">${["#5b4cf0", "#1b2133", "#2f80ff", "#14b8a6", "#22c55e", "#f59e0b", "#f43f5e", "#ffffff", "none"].map((c) => swatch("data-set-stroke", c, every((x) => x.stroke === c), c === "none" ? "No border" : c)).join("")}${anyColor("data-set-stroke-input", o.stroke, "Any border colour")}</div><div class="pp-row">${[[0, "Thin"], [2, "Medium"], [4, "Thick"]].map(([w, l]) => `<button type="button" class="pbtn${(o.sw ?? 2) === (w || 1) ? " on" : ""}" data-set-sw="${w || 1}">${l}</button>`).join("")}${pbtn("dash", "Dashed", "Dashed border", every((x) => x.dash) ? " on" : "")}</div>`;
  else if (popKind === "text") { const cur = o.type === "text" ? o.color : o.textColor; h = `<b>Text colour</b><div class="pp-row">${INK_COLORS.map((c) => swatch("data-set-textcolor", c, every((x) => (x.type === "text" ? x.color : x.textColor) === c))).join("")}${anyColor("data-set-textcolor-input", cur, "Any text colour")}</div>`; }
  else if (popKind === "line") h = `<b>Line colour</b><div class="pp-row">${["#334155", "#1b2133", "#5b4cf0", "#2f80ff", "#14b8a6", "#22c55e", "#f59e0b", "#f43f5e"].map((v) => swatch("data-set-linecolor", v, every((x) => x.stroke === v))).join("")}</div><div class="pp-row">${[[1, "Thin"], [2, "Medium"], [4, "Thick"]].map(([w, l]) => `<button type="button" class="pbtn${(o.sw ?? 2) === w ? " on" : ""}" data-set-sw="${w}">${l}</button>`).join("")}${pbtn("dash", "Dashed", "Dashed line", every((x) => x.dash) ? " on" : "")}</div>`;
  else if (popKind === "react") {
    const mine = (e) => sel.filter((x) => x.type === "note").every((x) => (x.reactions || []).includes(e));
    h = `<b>React</b><input type="search" class="ad-input pp-search" data-react-search placeholder="Search emoji (heart, idea…)" aria-label="Search emoji"><div class="pp-row pp-emoji">${REACTION_EMOJI.map(([e, n]) => `<button type="button" class="pbtn emo${mine(e) ? " on" : ""}" data-react="${e}" data-name="${n}" aria-label="${n}" title="${n}" aria-pressed="${mine(e)}">${e}</button>`).join("")}</div><span class="pp-hint">Click a reaction on a note to remove it.</span>`;
  }
  else if (popKind === "sort") h = `<b>Sort the sticky notes</b><div class="pp-col">${pbtn("sort-color", ICONS.sort + "Sort by colour", "Sort by colour: one row per colour")}${pbtn("sort-text", ICONS.sort + "Sort by name", "Sort by name: author name, then the note's words A to Z")}${pbtn("sort-topic", ICONS.sort + "Sort by topic", "Sort by topic: notes that share a word go together")}${pbtn("sort-react", ICONS.smile + "Sort by reactions", "Sort by reactions: most reactions first")}</div>`;
  else if (popKind === "layer") h = `<b>Position</b><div class="pp-col">${pbtn("front", ICONS.front + "Bring to front", "Bring to front (Ctrl+])")}${pbtn("forward", ICONS.forward + "Bring forward", "Bring forward (Ctrl+Shift+])")}${pbtn("backward", ICONS.backward + "Send backward", "Send backward (Ctrl+Shift+[)")}${pbtn("back", ICONS.back + "Send to back", "Send to back (Ctrl+[)")}</div>`;
  propsPop.innerHTML = h;
  placePropsPop();
}
function placePropsPop() {
  const a = popAnchor?.isConnected ? popAnchor : propsEl.querySelector(`[data-pop="${popKind}"]`);
  if (!a) return;
  popAnchor = a;
  const r = a.getBoundingClientRect(), w = propsPop.offsetWidth || 260;
  propsPop.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + "px";
  propsPop.style.top = Math.min(r.bottom + 8, innerHeight - (propsPop.offsetHeight || 120) - 8) + "px";
}
function openPropsPop(kind, anchor) {
  if (popKind === kind && !propsPop.hidden) return closePropsPop();
  popKind = kind; popAnchor = anchor; propsPop.hidden = false;
  fillPropsPop();
}
function closePropsPop() { popKind = null; popAnchor = null; propsPop.hidden = true; propsPop.innerHTML = ""; }
document.addEventListener("pointerdown", (e) => { if (popKind && !propsPop.contains(e.target) && !e.target.closest?.("[data-pop]")) closePropsPop(); }, true);
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && popKind) { closePropsPop(); e.stopPropagation(); } }, true);
window.addEventListener("resize", () => { if (popKind) placePropsPop(); });
const keepFocus = (e) => { if (!e.target.closest("select, input, label")) e.preventDefault(); }; // keep text editing / focus on the board
propsEl.addEventListener("pointerdown", keepFocus);
propsPop.addEventListener("pointerdown", keepFocus);
propsEl.addEventListener("click", onPropsClick);
propsPop.addEventListener("click", onPropsClick);
function onPropsClick(e) {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.pop) { openPropsPop(b.dataset.pop, b); return; }
  const sel = board().objects.filter((o) => state.sel.has(o.id) && !o.locked), ids = new Set(sel.map((o) => o.id));
  const d = b.dataset, edit = (fn) => { if (sel.length) change(() => sel.forEach(fn)); renderProps(); };
  if (d.kind) { state.shapeKind = d.kind; renderProps(); }
  else if (d.line) { state.lineKind = d.line; renderProps(); }
  else if (d.ink) { state.ink[state.tool].color = d.ink; renderProps(); }
  else if (d.width) { state.ink[state.tool].width = +d.width; renderProps(); }
  else if (d.notecolor) { state.noteColor = d.notecolor; renderProps(); }
  else if (d.setNote) edit((o) => { o.color = d.setNote; });
  else if (d.setFill) edit((o) => { o.fill = d.setFill; });
  else if (d.setStroke) edit((o) => { o.stroke = d.setStroke; });
  else if (d.setTextcolor) edit((o) => { if (o.type === "text") o.color = d.setTextcolor; else o.textColor = d.setTextcolor; });
  else if (d.setLinecolor) edit((o) => { o.stroke = d.setLinecolor; });
  else if (d.setKind) edit((o) => { o.kind = d.setKind; });
  else if (d.setStrokecolor) edit((o) => { o.color = d.setStrokecolor; });
  else if (d.setSticker) edit((o) => { o.element = { ...o.element, colors: { ...o.element.colors, c1: d.setSticker } }; });
  else if (d.setSw) edit((o) => { o.sw = +d.setSw; });
  else if (d.react) {
    const notes = sel.filter((o) => o.type === "note"), on = !notes.every((o) => (o.reactions || []).includes(d.react));
    if (notes.length) change(() => notes.forEach((o) => { const r = (o.reactions || []).filter((x) => x !== d.react); o.reactions = on ? [...r, d.react].slice(-8) : r; }));
    renderProps();
  }
  else if (d.act) action(d.act, ids);
}
propsPop.addEventListener("change", onPropsChange);
propsPop.addEventListener("input", (e) => {
  if (!e.target.matches("[data-react-search]")) return;
  const q = e.target.value.trim().toLowerCase();
  for (const b of propsPop.querySelectorAll("[data-react]")) b.hidden = !!q && !b.dataset.name.includes(q);
});
propsEl.addEventListener("change", onPropsChange);
function onPropsChange(e) {
  const s = e.target;
  const sel = board().objects.filter((o) => state.sel.has(o.id) && !o.locked);
  if (s.matches("[data-align]") && s.value) { change(() => alignObjects(board(), new Set(sel.map((o) => o.id)), s.value)); renderProps(); }
  else if (s.matches("[data-set-arrow]")) { change(() => sel.forEach((o) => { o.arrow = s.value; })); renderProps(); }
  else if (s.matches("[data-set-shapekind]")) { change(() => sel.forEach((o) => { if (o.type === "shape") o.kind = s.value; })); renderProps(); toast("Shape changed. Its lines stay connected."); }
  else if (s.matches("[data-set-align]")) { change(() => sel.forEach((o) => { o.align = s.value; })); renderProps(); }
  else if (s.matches("[data-set-font]")) { change(() => sel.forEach((o) => { o.font = s.value; normalizeObject(o); })); ensureFont(s.value, false).then(() => ensureFont(s.value, true)).then(() => { for (const c of cache.values()) c.sig = null; requestRender(); }).catch(() => {}); renderProps(); }
  else if (s.matches("[data-set-textcolor-input]")) { change(() => sel.forEach((o) => { if (o.type === "text") o.color = s.value; else o.textColor = s.value; })); renderProps(); }
  else if (s.matches("[data-set-fill-input]")) { change(() => sel.forEach((o) => { o.fill = s.value; })); renderProps(); }
  else if (s.matches("[data-set-stroke-input]")) { change(() => sel.forEach((o) => { o.stroke = s.value; })); renderProps(); }
  boardEl.focus({ preventScroll: true });
}
function action(act, ids = new Set([...state.sel])) {
  const all = new Set([...state.sel]);
  switch (act) {
    case "swapends": change(() => board().objects.forEach((o) => { if (ids.has(o.id) && o.type === "connector") { const f = o.from; o.from = o.to; o.to = f; } })); toast("Line ends swapped."); break;
    case "quickflow": state.quickFlow = state.quickFlow === false; lsSet("asaandesk-whiteboard-quickflow", state.quickFlow ? "on" : "off"); renderSelection(); propsSig = ""; renderProps(); toast(state.quickFlow ? "Quick Flow is on: use the + arrows around a shape to add the next step." : "Quick Flow is off: the + arrows are hidden."); break;
    case "duplicate": if (all.size) { const n = change(() => duplicateObjects(board(), all)); setSel(n); toast("Duplicated"); } break;
    case "delete": deleteSelection(); break;
    case "lock": if (all.size) { change(() => setLocked(board(), all, true)); toast("Locked: it can't be moved or changed until you unlock it"); } break;
    case "unlock": if (all.size) change(() => setLocked(board(), all, false)); break;
    case "front": case "back": case "forward": case "backward": if (all.size) change(() => reorder(board(), all, act)); break;
    case "group": if (ids.size > 1) { change(() => groupObjects(board(), ids)); toast("Grouped"); } break;
    case "ungroup": if (ids.size) change(() => ungroupObjects(board(), ids)); break;
    case "bigger": case "smaller": change(() => board().objects.forEach((o) => { if (ids.has(o.id) && o.size) { o.size = clamp(o.size + (act === "bigger" ? (o.size >= 24 ? 4 : 2) : (o.size > 24 ? -4 : -2)), 8, 120); normalizeObject(o); } })); break;
    case "italic": { const on = !board().objects.filter((o) => ids.has(o.id)).every((o) => o.italic); change(() => board().objects.forEach((o) => { if (ids.has(o.id)) { o.italic = on; normalizeObject(o); } })); break; }
    case "dash": { const on = !board().objects.filter((o) => ids.has(o.id)).every((o) => o.dash); change(() => board().objects.forEach((o) => { if (ids.has(o.id) && (o.type === "shape" || o.type === "connector")) o.dash = on; })); break; }
    case "sort-color": case "sort-text": case "sort-react": case "sort-topic": sortNotes(act.slice(5)); break;
    case "copytext": copyAsText(); break;
    case "author": { const on = !board().objects.filter((o) => ids.has(o.id)).every((o) => o.author); change(() => board().objects.forEach((o) => { if (ids.has(o.id) && o.type === "note") o.author = on ? "You" : ""; })); break; }
    case "rotate": change(() => board().objects.forEach((o) => { if (ids.has(o.id) && canRotate(o)) o.rot = (((o.rot || 0) + 90) % 360 + 360) % 360; })); break;
    case "bold": { const on = !board().objects.filter((o) => ids.has(o.id)).every((o) => o.bold); change(() => board().objects.forEach((o) => { if (ids.has(o.id)) { o.bold = on; normalizeObject(o); } })); break; }
    case "edit": { const o = find([...all][0]); if (o) startEdit(o); break; }
    case "exportframe": { const o = find([...all][0]); if (o) openExport(o.id); break; }
  }
  renderProps();
}
/** Lays the selected sticky notes out in a tidy grid: one row per colour, A to Z by text, or most reactions first. */
function sortNotes(by) {
  const notes = board().objects.filter((o) => state.sel.has(o.id) && o.type === "note" && !o.locked);
  if (notes.length < 2) { toast("Select two or more sticky notes to sort them."); return; }
  const x0 = Math.min(...notes.map((o) => o.x)), y0 = Math.min(...notes.map((o) => o.y));
  const cw = Math.max(...notes.map((o) => o.w)) + 24, ch = Math.max(...notes.map((o) => o.h)) + 34;
  let rows;
  if (by === "color") {
    const g = new Map();
    for (const o of notes) { if (!g.has(o.color)) g.set(o.color, []); g.get(o.color).push(o); }
    rows = [...g.values()];
  } else if (by === "topic") {
    // Topic = a word several notes share (ignoring small words); the biggest shared topic first, the rest in a last row.
    const STOP = new Set("a an the and or of to in on for with our we is are be by at as it this that from your you my more less new add".split(" "));
    const words = (o) => new Set(String(o.text || "").toLowerCase().match(/[a-z0-9']{3,}/g)?.filter((w) => !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, "")) || []);
    const left = new Map(notes.map((o) => [o, words(o)]));
    rows = [];
    while (left.size) {
      const count = new Map();
      for (const ws of left.values()) for (const w of ws) count.set(w, (count.get(w) || 0) + 1);
      const [best, n] = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || [];
      if (!best || n < 2) { rows.push([...left.keys()]); break; }
      const grp = [...left.keys()].filter((o) => left.get(o).has(best));
      grp.forEach((o) => left.delete(o));
      rows.push(grp);
    }
  } else {
    // "Name": the author's name label first (notes without one last), then the note's words A to Z.
    const byName = (a, b) => (a.author ? 0 : 1) - (b.author ? 0 : 1) || String(a.author || "").localeCompare(String(b.author || ""), undefined, { sensitivity: "base" }) || (a.text || "").localeCompare(b.text || "", undefined, { sensitivity: "base" });
    const s = notes.slice().sort(by === "text" ? byName : (a, b) => (b.reactions?.length || 0) - (a.reactions?.length || 0));
    const per = s.length <= 6 ? s.length : Math.ceil(Math.sqrt(s.length * 1.6));
    rows = [];
    for (let i = 0; i < s.length; i += per) rows.push(s.slice(i, i + per));
  }
  change(() => rows.forEach((r, ri) => r.forEach((o, ci) => { o.x = x0 + ci * cw; o.y = y0 + ri * ch; })));
  toast(by === "color" ? "Sorted by colour" : by === "text" ? "Sorted by name" : by === "topic" ? "Grouped by topic" : "Sorted by reactions", 1400);
}
/** Copies the text of the selected notes, shapes and text boxes (top to bottom) as plain lines. */
function copyAsText() {
  const list = board().objects.filter((o) => state.sel.has(o.id) && TEXTY.has(o.type) && o.text).sort((a, b) => a.y - b.y || a.x - b.x);
  if (!list.length) return;
  lastCopiedText = list.map((o) => o.text.replace(/\s*\n\s*/g, " ").trim()).join("\n");
  try { navigator.clipboard?.writeText?.(lastCopiedText)?.catch?.(() => {}); } catch {}
  toast(`Copied ${list.length} item${list.length > 1 ? "s" : ""} as text`, 1600);
}
/** The reaction badge (and its note) under a board point, if any. */
function reactionAt(w) {
  for (let i = board().objects.length - 1; i >= 0; i--) {
    const o = board().objects[i];
    if (o.type !== "note" || !o.reactions?.length || o.rot) continue;
    const b = reactionBadges(o).find((r) => w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h);
    if (b) return { o, e: b.e };
  }
  return null;
}
function deleteSelection() {
  if (!state.sel.size) return;
  const lockedOnly = board().objects.filter((o) => state.sel.has(o.id)).every((o) => o.locked);
  if (lockedOnly) { toast("Locked items can't be deleted. Unlock them first."); return; }
  change(() => deleteObjects(board(), state.sel));
  setSel([]);
}

/* ------------------------------------------------------------------ creating things */
function addObjects(list, { select = true, back = false } = {}) {
  change(() => { board().objects = back ? [...list, ...board().objects] : [...board().objects, ...list]; });
  if (select) setSel(list.map((o) => o.id));
}
function defaultShapeSize(kind) { return kind === "star" || kind === "diamond" ? [150, 140] : kind === "triangle" ? [150, 130] : kind === "ellipse" ? [170, 110] : [170, 110]; }
function createAt(tool, r, click) {
  let o;
  if (tool === "note") {
    const s = click ? 200 : Math.max(60, Math.max(r.w, r.h));
    o = makeNote({ x: click ? r.x - s / 2 : r.x, y: click ? r.y - s / 2 : r.y, w: s, h: s, color: state.noteColor });
  } else if (tool === "text") o = makeText({ x: r.x, y: click ? r.y - 15 : r.y, w: click ? 260 : Math.max(60, r.w) });
  else if (tool === "shape") {
    const [w, h] = defaultShapeSize(state.shapeKind);
    o = click ? makeShape({ x: r.x - w / 2, y: r.y - h / 2, w, h, kind: state.shapeKind }) : makeShape({ x: r.x, y: r.y, w: Math.max(20, r.w), h: Math.max(20, r.h), kind: state.shapeKind });
  } else if (tool === "frame") {
    const n = board().objects.filter((x) => x.type === "frame").length + 1;
    o = click ? makeFrame({ x: r.x - 320, y: r.y - 210, name: "Frame " + n }) : makeFrame({ x: r.x, y: r.y, w: Math.max(80, r.w), h: Math.max(60, r.h), name: "Frame " + n });
  }
  if (!o) return;
  addObjects([o], { back: tool === "frame" });
  setTool("select");
  setSel([o.id]);
  if (tool === "note" || tool === "text") startEdit(o);
}
/** Click on a quick-connect dot: a copy of the item (without its text) beside it, joined by an arrow. */
function quickAdd(id, side) {
  const o = find(id);
  if (!o) return;
  const gap = 90, d = { right: [o.w + gap, 0], left: [-(o.w + gap), 0], top: [0, -(o.h + gap)], bottom: [0, o.h + gap] }[side] || [o.w + gap, 0];
  const opposite = { right: "left", left: "right", top: "bottom", bottom: "top" }[side] || "left";
  let nid = null, cid = null;
  change(() => {
    [nid] = pasteObjects(board(), { objects: [o] }, d[0], d[1]);
    const n = find(nid);
    if (n && "text" in n) { n.text = ""; normalizeObject(n); }
    const c = makeConnector({ from: { id, side }, to: { id: nid, side: opposite }, kind: state.lineKind });
    cid = c.id;
    board().objects.push(c);
  });
  setTool("select");
  setSel([nid]);
  const n = find(nid);
  if (n && TEXTY.has(n.type)) startEdit(n);
  return { id: nid, connector: cid };
}
function addNoteAtCenter() { const c = viewCenter(); const o = makeNote({ x: c.x - 100, y: c.y - 100, color: state.noteColor }); addObjects([o]); startEdit(o); }

/* ------------------------------------------------------------------ text editing */
function editBox(o) {
  if (o.type === "note") { const L = noteLayout(o); return { box: L.box, size: L.size, lines: L.lines.length, align: o.align || "center", color: o.textColor, bold: !!o.bold, valign: true }; }
  if (o.type === "shape") { const L = shapeLayout(o); return { box: L.box, size: L.size, lines: L.lines.length, align: o.align || "center", color: o.textColor, bold: o.bold, valign: true }; }
  if (o.type === "text") { const L = textLayout(o); return { box: { x: o.x, y: o.y, w: o.w, h: L.h }, size: L.size, lines: L.lines.length, align: o.align || "left", color: o.color, bold: o.bold }; }
  if (o.type === "frame") return { box: { x: o.x, y: o.y - 26, w: Math.max(180, o.w * 0.6), h: 20 }, size: 14, lines: 1, align: "left", color: "#6a7389", bold: true };
  if (o.type === "connector") { const { p } = pointAlong(routeConnector(o, byId()).points, 0.5); return { box: { x: p[0] - 90, y: p[1] - 12, w: 180, h: 24 }, size: 14, lines: 1, align: "center", color: o.stroke, bold: false }; }
  return null;
}
function positionEditor() {
  const o = find(state.editing?.id);
  if (!o) return;
  const e = editBox(o), z = state.cam.z, p = toScreen(e.box.x, e.box.y);
  const textH = Math.max(1, e.lines) * e.size * LINE;
  const padTop = e.valign ? Math.max(0, (e.box.h - textH) / 2) : 0;
  Object.assign(editorEl.style, {
    left: p.x + "px", top: p.y + "px", width: Math.max(40, e.box.w * z) + "px", height: Math.max(e.size * LINE * z, e.box.h * z) + "px",
    fontSize: e.size * z + "px", paddingTop: padTop * z + "px", textAlign: e.align, color: e.color || "#1b2133", fontWeight: e.bold ? "700" : "400",
    background: o.type === "connector" ? "#fff" : "transparent", fontFamily: fontCss(o.font).replace(/'/g, '"'), fontStyle: o.italic ? "italic" : "normal",
  });
  if (o.rot && canRotate(o)) { const c = toScreen(o.x + o.w / 2, o.y + o.h / 2); editorEl.style.transformOrigin = `${c.x - p.x}px ${c.y - p.y}px`; editorEl.style.transform = `rotate(${o.rot}deg)`; }
  else editorEl.style.transform = "";
}
function startEdit(o) {
  if (!o || o.locked || !["note", "shape", "text", "frame", "connector"].includes(o.type)) return;
  if (state.editing?.id === o.id) return;
  finishEdit();
  checkpoint();
  const key = o.type === "frame" ? "name" : "text";
  state.editing = { id: o.id, key, before: o[key] || "" };
  setSel([o.id]);
  editorEl.value = o[key] || "";
  editorEl.hidden = false;
  editorEl.setAttribute("aria-label", o.type === "frame" ? "Frame name" : "Edit text");
  positionEditor();
  renderNow();
  editorEl.focus({ preventScroll: true });
  const n = editorEl.value.length; editorEl.setSelectionRange(n, n);
}
function finishEdit() {
  const ed = state.editing;
  if (!ed) return;
  state.editing = null;
  editorEl.hidden = true;
  const o = find(ed.id);
  if (o) {
    let v = editorEl.value;
    if (ed.key === "name") v = v.replace(/\s+/g, " ").trim() || "Frame";
    o[ed.key] = v;
    normalizeObject(o);
  }
  if (!o || (o[ed.key] || "") === ed.before) hist.past.pop();
  else changed();
  requestRender();
  if (document.activeElement === editorEl) boardEl.focus({ preventScroll: true });
}
editorEl.addEventListener("input", () => {
  const o = find(state.editing?.id);
  if (!o) return;
  o[state.editing.key] = editorEl.value;
  normalizeObject(o);
  positionEditor();
  requestRender();
});
editorEl.addEventListener("keydown", (e) => {
  e.stopPropagation();
  const single = state.editing && (state.editing.key === "name" || find(state.editing.id)?.type === "connector");
  if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey || single))) { e.preventDefault(); finishEdit(); }
});
editorEl.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== editorEl) finishEdit(); }, 0));

/* ------------------------------------------------------------------ rotation label, "You" cursor */
const rotLabel = document.createElement("div");
rotLabel.className = "rot-label"; rotLabel.hidden = true; rotLabel.setAttribute("aria-hidden", "true");
const youCursor = document.createElement("div");
youCursor.className = "you-cursor"; youCursor.hidden = true; youCursor.setAttribute("aria-hidden", "true");
youCursor.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 1l11 6.2-4.8 1.2L6.3 13z" fill="#8b5cf6" stroke="#fff" stroke-width="1.2"/></svg><span>You</span>';
function showRotLabel(e, deg) { const v = viewSize(); rotLabel.hidden = false; rotLabel.textContent = Math.round(deg) + "°"; rotLabel.style.left = e.clientX - v.left + 16 + "px"; rotLabel.style.top = e.clientY - v.top + 16 + "px"; }
function hideRotLabel() { rotLabel.hidden = true; }
boardEl.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") { youCursor.hidden = true; return; }
  const v = viewSize();
  youCursor.hidden = false;
  youCursor.style.transform = `translate(${e.clientX - v.left + 14}px, ${e.clientY - v.top + 16}px)`;
});
boardEl.addEventListener("pointerleave", () => { youCursor.hidden = true; });

/* ------------------------------------------------------------------ pointer input */
const pointers = new Map();
let act = null; // current gesture
function pinchInfo() { const [a, b] = [...pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
function local(e) { const v = viewSize(); return { x: e.clientX - v.left, y: e.clientY - v.top }; }
function hoverTarget(w, exclude) {
  const tol = 6 / state.cam.z;
  const hit = hitTest(board(), w.x, w.y, tol);
  return hit && hit.id !== exclude && hit.type !== "connector" && hit.type !== "stroke" ? hit : null;
}
function endFor(w, exclude) { const t = hoverTarget(w, exclude); return t ? { id: t.id, side: "auto" } : { x: Math.round(w.x), y: Math.round(w.y) }; }
function drawPreview(prims) { previewEl.innerHTML = prims ? primsToSvg(prims) : ""; }
function previewRect(r, dashed = true) {
  const z = state.cam.z;
  previewEl.innerHTML = `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="rgba(91,76,240,.06)" stroke="#5b4cf0" stroke-width="${1.5 / z}" ${dashed ? `stroke-dasharray="${6 / z} ${4 / z}"` : ""} rx="${3 / z}"/>`;
}

boardEl.addEventListener("pointerdown", (e) => {
  if (e.button === 2 || e.target === editorEl || e.target.closest?.(".empty .card")) return;
  if (state.editing && e.target !== editorEl) finishEdit();
  boardEl.focus({ preventScroll: true });
  if (e.isPrimary) pointers.clear(); // a new first finger or the mouse: forget pointers whose "up" was missed
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
  try { boardEl.setPointerCapture(e.pointerId); } catch {}
  if (pointers.size === 2 && [...pointers.values()].every((p) => p.type === "touch")) {
    // Two fingers: pinch to zoom and pan. Cancel whatever one finger started.
    if (act?.type === "draw" || act?.type === "create" || act?.type === "connect" || act?.type === "band") drawPreview(null);
    if (act?.moved) changed();
    const p = pinchInfo();
    act = { type: "pinch", start: p, cam: { ...state.cam } };
    return;
  }
  if (pointers.size > 1) return;
  const w = toWorld(e.clientX, e.clientY), t = state.tool;
  if (e.button === 1 || state.space || t === "hand" || state.mode !== "edit") {
    act = { type: "pan", sx: e.clientX, sy: e.clientY, cam: { ...state.cam } };
    boardEl.classList.add("panning");
    e.preventDefault();
    return;
  }
  if (t === "select") {
    const hEl = e.target.closest?.("[data-handle]");
    if (hEl) {
      const o = find([...state.sel][0]);
      if (o && !o.locked) {
        const k = hEl.dataset.handle;
        if (k === "from" || k === "to") act = { type: "endpoint", id: o.id, end: k, moved: false };
        else if (k === "rot") act = { type: "rotate", id: o.id, orig: o.rot || 0, moved: false };
        else if (k.startsWith("link-")) act = { type: "connect", from: { id: o.id, side: k.slice(5) }, start: w, quick: true };
        else act = { type: "resize", id: o.id, handle: k, start: w, orig: { x: o.x, y: o.y, w: o.w, h: o.h, points: o.points, rot: o.rot || 0 }, moved: false };
        return;
      }
    }
    const rb = !e.shiftKey && reactionAt(w);
    if (rb && !rb.o.locked) {
      // Clicking your reaction on a note takes it back (like Canva).
      change(() => { rb.o.reactions = rb.o.reactions.filter((x) => x !== rb.e); });
      setSel([rb.o.id]);
      toast("Reaction removed", 1200);
      act = null;
      return;
    }
    const hit = hitTest(board(), w.x, w.y, 6 / state.cam.z);
    if (hit) {
      const group = expandGroups(board(), [hit.id]);
      const wasSelected = state.sel.size === group.size && [...group].every((id) => state.sel.has(id));
      if (e.shiftKey) {
        const s = new Set(state.sel);
        const on = s.has(hit.id);
        for (const id of group) on ? s.delete(id) : s.add(id);
        setSel(s);
        act = null;
        return;
      }
      if (!state.sel.has(hit.id)) setSel(group);
      const ids = new Set(state.sel);
      for (const o of board().objects) if (ids.has(o.id) && o.type === "frame") for (const ch of frameChildren(board(), o)) if (!ch.locked) ids.add(ch.id);
      act = { type: "move", ids, last: w, cx: e.clientX, cy: e.clientY, moved: false, hitId: hit.id, wasSelected };
    } else {
      if (!e.shiftKey) setSel([]);
      act = { type: "band", start: w, base: e.shiftKey ? new Set(state.sel) : new Set() };
    }
    return;
  }
  if (t === "note" || t === "text" || t === "shape" || t === "frame") { act = { type: "create", tool: t, start: w, cx: e.clientX, cy: e.clientY }; return; }
  if (t === "connector") {
    const from = endFor(w, null);
    act = { type: "connect", from, start: w };
    return;
  }
  if (t === "pen" || t === "highlighter") { act = { type: "draw", tool: t, pts: [[w.x, w.y]] }; drawStrokePreview(); return; }
  if (t === "eraser") { act = { type: "erase", removed: false }; eraseAt(w); }
});

boardEl.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { ...pointers.get(e.pointerId), x: e.clientX, y: e.clientY });
  if (!act) return;
  const w = toWorld(e.clientX, e.clientY);
  switch (act.type) {
    case "pinch": {
      if (pointers.size < 2) return;
      const p = pinchInfo(), v = viewSize(), c0 = act.cam;
      const z = clamp(c0.z * (p.d / act.start.d), 0.1, 16);
      const wx = (act.start.mx - v.left - c0.x) / c0.z, wy = (act.start.my - v.top - c0.y) / c0.z;
      state.cam = { z, x: p.mx - v.left - wx * z, y: p.my - v.top - wy * z };
      applyCam();
      break;
    }
    case "pan": state.cam.x = act.cam.x + (e.clientX - act.sx); state.cam.y = act.cam.y + (e.clientY - act.sy); applyCam(); break;
    case "move": {
      if (!act.moved && Math.hypot(e.clientX - act.cx, e.clientY - act.cy) < 3) return;
      if (!act.moved) { checkpoint(); act.moved = true; }
      moveObjects(board(), act.ids, w.x - act.last.x, w.y - act.last.y);
      act.last = w;
      act.px = e.clientX; act.py = e.clientY;
      requestRender();
      edgePan(act);
      break;
    }
    case "rotate": {
      const o = find(act.id);
      if (!o) return;
      if (!act.moved) { checkpoint(); act.moved = true; }
      const [cx, cy] = centerOf(o);
      let deg = (Math.atan2(w.y - cy, w.x - cx) * 180) / Math.PI - 90;
      deg = ((deg % 360) + 360) % 360;
      const snap = e.shiftKey ? 15 : 45, near = Math.round(deg / snap) * snap;
      if (e.shiftKey || Math.abs(near - deg) < 4) deg = near % 360;
      o.rot = Math.round(deg * 10) / 10;
      requestRender();
      showRotLabel(e, o.rot);
      break;
    }
    case "resize": {
      const o = find(act.id), r = act.orig, h = act.handle;
      if (!o) return;
      if (!act.moved) { checkpoint(); act.moved = true; }
      // Rotated objects: work in the object's own (unrotated) frame.
      const lw = r.rot ? (() => { const p = rotatePoint(w.x, w.y, r.x + r.w / 2, r.y + r.h / 2, -r.rot), q = rotatePoint(act.start.x, act.start.y, r.x + r.w / 2, r.y + r.h / 2, -r.rot); return { x: p[0] - q[0], y: p[1] - q[1] }; })() : null;
      const dx = lw ? lw.x : w.x - act.start.x, dy = lw ? lw.y : w.y - act.start.y;
      let x = r.x, y = r.y, W = r.w, H = r.h;
      if (h.includes("e")) W = r.w + dx;
      if (h.includes("w")) { W = r.w - dx; x = r.x + dx; }
      if (h.includes("s")) H = r.h + dy;
      if (h.includes("n")) { H = r.h - dy; y = r.y + dy; }
      const min = 12;
      if (W < min) { if (h.includes("w")) x = r.x + r.w - min; W = min; }
      if (H < min) { if (h.includes("n")) y = r.y + r.h - min; H = min; }
      const keep = (o.type === "image" || o.type === "sticker") !== e.shiftKey && h.length === 2;
      if (keep) {
        const k = Math.max(W / r.w, H / r.h);
        const nW = r.w * k, nH = r.h * k;
        if (h.includes("w")) x = r.x + r.w - nW;
        if (h.includes("n")) y = r.y + r.h - nH;
        W = nW; H = nH;
      }
      if (o.type === "stroke") { o.points = r.points; o.w = r.w; o.h = r.h; }
      if (r.rot) {
        // Keep the opposite corner / edge where it is on screen.
        const ax = h.includes("w") ? 1 : h.includes("e") ? 0 : 0.5, ay = h.includes("n") ? 1 : h.includes("s") ? 0 : 0.5;
        const A0 = rotatePoint(r.x + r.w * ax, r.y + r.h * ay, r.x + r.w / 2, r.y + r.h / 2, r.rot);
        const A1 = rotatePoint(x + W * ax, y + H * ay, x + W / 2, y + H / 2, r.rot);
        x += A0[0] - A1[0]; y += A0[1] - A1[1];
      }
      resizeObject(o, { x, y, w: W, h: H });
      requestRender();
      break;
    }
    case "band": {
      const r = normRect(act.start.x, act.start.y, w.x, w.y);
      previewRect(r);
      act.rect = r;
      break;
    }
    case "create": {
      const r = normRect(act.start.x, act.start.y, w.x, w.y);
      act.rect = r;
      act.dragged ||= Math.hypot(e.clientX - act.cx, e.clientY - act.cy) > 6;
      if (act.dragged) {
        if (act.tool === "shape") drawPreview(objectPrims(makeShape({ ...r, kind: state.shapeKind }), byId()).concat());
        else previewRect(r, act.tool !== "note");
      }
      break;
    }
    case "connect":
    case "endpoint": {
      let c;
      if (act.type === "connect") {
        const to = endFor(w, act.from.id);
        c = makeConnector({ from: act.from, to, kind: state.lineKind });
        act.to = to;
      } else {
        const o = find(act.id);
        if (!o) return;
        if (!act.moved) { checkpoint(); act.moved = true; }
        const other = act.end === "from" ? o.to.id : o.from.id;
        o[act.end] = endFor(w, other);
        requestRender();
        c = null;
      }
      const tgt = hoverTarget(w, act.type === "connect" ? act.from.id : null);
      const z = state.cam.z;
      const hl = tgt ? `<rect x="${tgt.x - 4 / z}" y="${tgt.y - 4 / z}" width="${tgt.w + 8 / z}" height="${tgt.h + 8 / z}" fill="none" stroke="#14b8a6" stroke-width="${2 / z}" rx="${6 / z}"/>` : "";
      const m = byId();
      previewEl.innerHTML = hl + (c ? primsToSvg(objectPrims(c, m)) : "");
      break;
    }
    case "draw": {
      const coalesced = e.getCoalescedEvents?.() || [];
      for (const ev of coalesced.length ? coalesced : [e]) { const q = toWorld(ev.clientX, ev.clientY); act.pts.push([q.x, q.y]); }
      drawStrokePreview();
      break;
    }
    case "erase": eraseAt(w); break;
  }
});
/** Dragging items near an edge of the board scrolls it that way (the infinite board grows as you go). */
let edgeRaf = 0;
function edgePan(a) {
  if (edgeRaf) return;
  const step = () => {
    edgeRaf = 0;
    if (act !== a || a.type !== "move") return;
    const v = viewSize(), m = 36, sp = 14;
    const lx = a.px - v.left, ly = a.py - v.top;
    const dx = lx < m ? sp : lx > v.w - m ? -sp : 0, dy = ly < m ? sp : ly > v.h - m ? -sp : 0;
    if (!dx && !dy) { a.edgeSince = 0; return; }
    // Only after the pointer rests at the edge a moment, so a quick drag that ends there does not scroll.
    a.edgeSince ||= performance.now();
    if (performance.now() - a.edgeSince < 450) { edgeRaf = requestAnimationFrame(step); return; }
    state.cam.x += dx; state.cam.y += dy;
    const wd = { x: -dx / state.cam.z, y: -dy / state.cam.z };
    moveObjects(board(), a.ids, wd.x, wd.y);
    a.last = { x: a.last.x + wd.x, y: a.last.y + wd.y };
    applyCam(); requestRender();
    edgeRaf = requestAnimationFrame(step);
  };
  edgeRaf = requestAnimationFrame(step);
}
function drawStrokePreview() {
  const ink = state.ink[act.tool], hl = act.tool === "highlighter";
  previewEl.innerHTML = `<path d="${strokePath(act.pts)}" fill="none" stroke="${ink.color}" stroke-width="${ink.width}" stroke-linecap="round" stroke-linejoin="round" opacity="${hl ? 0.38 : 1}"${hl ? ' style="mix-blend-mode:multiply"' : ""}/>`;
}
function eraseAt(w) {
  const ids = strokesNear(board(), w.x, w.y, 10 / state.cam.z);
  if (!ids.length) return;
  if (!act.removed) { checkpoint(); act.removed = true; }
  const set = new Set(ids);
  board().objects = board().objects.filter((o) => !set.has(o.id));
  requestRender();
}
function endGesture(e) {
  const a = act;
  pointers.delete(e.pointerId);
  if (a?.type === "pinch") { if (pointers.size === 0) act = null; return; }
  act = null;
  boardEl.classList.remove("panning");
  if (!a) return;
  const w = toWorld(e.clientX, e.clientY);
  switch (a.type) {
    case "move":
      if (a.moved) changed();
      else if (a.wasSelected && state.sel.size === 1 && e.type === "pointerup") { const o = find(a.hitId); if (o && ["note", "shape", "text"].includes(o.type)) startEdit(o); }
      break;
    case "resize": case "endpoint": case "rotate": if (a.moved) changed(); drawPreview(null); hideRotLabel(); break;
    case "band": {
      drawPreview(null);
      if (a.rect && (a.rect.w > 2 || a.rect.h > 2)) setSel(expandGroups(board(), [...a.base, ...objectsInRect(board(), a.rect)]));
      break;
    }
    case "create": drawPreview(null); if (e.type === "pointerup") createAt(a.tool, a.dragged ? a.rect : { x: a.start.x, y: a.start.y, w: 0, h: 0 }, !a.dragged); break;
    case "connect": {
      drawPreview(null);
      if (e.type !== "pointerup") break;
      const to = endFor(w, a.from.id);
      if (a.quick && Math.hypot(w.x - a.start.x, w.y - a.start.y) * state.cam.z < 6) { quickAdd(a.from.id, a.from.side); break; }
      const free = a.from.id == null && to.id == null;
      if (free && Math.hypot(w.x - a.start.x, w.y - a.start.y) < 12) { toast("Drag from one item to another to connect them"); break; }
      if (a.from.id != null && a.from.id === to.id) break;
      const c = makeConnector({ from: a.from, to, kind: state.lineKind });
      addObjects([c]);
      setTool("select");
      setSel([c.id]);
      break;
    }
    case "draw": {
      drawPreview(null);
      if (a.pts.length < 1) break;
      const ink = state.ink[a.tool];
      const s = makeStroke({ points: smoothPoints(a.pts), tool: a.tool, color: ink.color, width: ink.width });
      // Draw tools from the panels: Glow pen (a soft halo) and pen transparency.
      if (a.tool === "pen" && state.penStyle === "glow") s.glow = true;
      if (a.tool === "pen" && state.penAlpha > 0 && state.penAlpha < 1) s.opacity = state.penAlpha;
      addObjects([s], { select: false });
      break;
    }
    case "erase": if (a.removed) changed(); break;
  }
}
boardEl.addEventListener("pointerup", endGesture);
boardEl.addEventListener("pointercancel", endGesture);
boardEl.addEventListener("dblclick", (e) => {
  if (state.mode !== "edit") return;
  if (e.target === editorEl || e.target.closest?.(".empty .card")) return;
  const w = toWorld(e.clientX, e.clientY);
  const hit = hitTest(board(), w.x, w.y, 6 / state.cam.z);
  if (hit && state.tool === "select") startEdit(hit);
  else if (!hit && state.tool === "select") { const o = makeNote({ x: w.x - 100, y: w.y - 100, color: state.noteColor }); addObjects([o]); startEdit(o); }
});
boardEl.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = local(e);
  const wheelMouse = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
  if (e.ctrlKey || e.metaKey || wheelMouse) {
    const k = e.deltaMode === 1 ? 0.05 : e.ctrlKey || e.metaKey ? 0.01 : 0.0015;
    zoomAt(p.x, p.y, state.cam.z * Math.exp(-e.deltaY * k));
  } else { state.cam.x -= e.deltaX; state.cam.y -= e.deltaY; applyCam(); }
}, { passive: false });
boardEl.addEventListener("contextmenu", (e) => { if (state.tool !== "select") e.preventDefault(); });

/* ------------------------------------------------------------------ keyboard */
// Canva-style keys: S sticky note, R rectangle, C circle, L line/arrow, T text, D draw; ours kept where they don't clash.
const TOOL_KEYS = { v: "select", h: "hand", n: "note", s: "note", t: "text", r: "shape:rect", c: "shape:ellipse", l: "connector", p: "pen", d: "pen", m: "highlighter", e: "eraser", f: "frame" };
const SHORTCUTS = [
  ["S or N", "Sticky note"], ["R", "Rectangle"], ["C", "Circle"], ["L", "Line or arrow (drag from item to item)"], ["T", "Text"], ["D or P", "Draw with the pen"],
  ["M", "Highlighter"], ["E", "Eraser"], ["F", "Section"], ["V", "Select"], ["H or hold Space", "Move the board"], ["Double-click", "Edit text / add a sticky note"],
  ["Ctrl+D", "Duplicate"], ["Ctrl+C / Ctrl+V", "Copy and paste"], ["Ctrl+Shift+C", "Copy as text"], ["Ctrl+G / Ctrl+Shift+G", "Group / ungroup"],
  ["Ctrl+Shift+L", "Lock or unlock"], ["Ctrl+] / Ctrl+[", "Bring to front / send to back"], ["Ctrl+Z / Ctrl+Y", "Undo / redo"],
  ["Alt+Arrow", "Add a connected item on that side (quick flowchart)"], ["Ctrl+wheel, + and -", "Zoom"], ["Shift+1", "Fit everything"], ["Ctrl+0", "Zoom to 100%"], ["Arrow keys", "Nudge (Shift = 10 px)"], ["Delete", "Delete"],
];
window.addEventListener("keydown", (e) => {
  if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
  // Keys pressed on the editor frame's own buttons (menus, rail, panels) belong to them, not to the board.
  if (e.target instanceof Element && e.target.closest(".ad-shell") && !e.target.closest("#work")) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (state.mode !== "edit" && !["+", "=", "-", "_", "!"].includes(e.key) && !(mod && k === "0")) return;
  if (e.key === " " && !e.repeat) { state.space = true; document.body.classList.add("space"); e.preventDefault(); return; }
  if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === "y") { e.preventDefault(); redo(); return; }
  if (mod && k === "d") { e.preventDefault(); action("duplicate"); return; }
  if (mod && k === "a") { e.preventDefault(); setSel(board().objects.map((o) => o.id)); return; }
  if (mod && k === "g") { e.preventDefault(); action(e.shiftKey ? "ungroup" : "group", new Set(state.sel)); return; }
  if (mod && e.shiftKey && k === "l") { e.preventDefault(); const sel = board().objects.filter((o) => state.sel.has(o.id)); action(sel.length && sel.every((o) => o.locked) ? "unlock" : "lock"); return; }
  if (mod && e.key === "]") { e.preventDefault(); action(e.shiftKey ? "forward" : "front"); return; }
  if (mod && e.key === "[") { e.preventDefault(); action(e.shiftKey ? "backward" : "back"); return; }
  if (mod && k === "0") { e.preventDefault(); const v = viewSize(); zoomAt(v.w / 2, v.h / 2, 1); return; }
  if (mod && e.shiftKey && k === "c") { e.preventDefault(); copyAsText(); return; }
  if (mod && k === "c") { copySelection(); return; }
  if (mod && k === "x") { if (copySelection()) deleteSelection(); return; }
  if (mod && k === "v") { pasteSoon(); return; }
  if (mod) return;
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); return; }
  if (e.key === "Escape") { if (state.sel.size) setSel([]); else setTool("select"); closeSide(); return; }
  if (e.key === "Enter" && state.sel.size === 1) { e.preventDefault(); startEdit(find([...state.sel][0])); return; }
  if (e.altKey && e.key.startsWith("Arrow") && state.sel.size === 1) {
    // Quick flowchart: Alt+Arrow adds a connected copy of the selected item on that side.
    const o = find([...state.sel][0]);
    if (o && !o.locked && !o.rot && ["note", "shape", "text", "image", "sticker"].includes(o.type)) { e.preventDefault(); quickAdd(o.id, { ArrowUp: "top", ArrowRight: "right", ArrowDown: "bottom", ArrowLeft: "left" }[e.key]); return; }
  }
  if (e.key.startsWith("Arrow") && state.sel.size) {
    e.preventDefault();
    const s = e.shiftKey ? 10 : 1, d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    change(() => moveObjects(board(), state.sel, d[0], d[1]));
    return;
  }
  if (e.key === "+" || e.key === "=") { zoomBy(1.2); return; }
  if (e.key === "-" || e.key === "_") { zoomBy(1 / 1.2); return; }
  if (e.key === "!" || (e.shiftKey && e.code === "Digit1")) { fit(); return; }
  if (TOOL_KEYS[k] && !e.altKey) {
    const [tool, kind] = TOOL_KEYS[k].split(":");
    if (kind) state.shapeKind = kind;
    setTool(tool);
    if (kind) { propsSig = ""; renderProps(); }
  }
});
window.addEventListener("keyup", (e) => { if (e.key === " ") { state.space = false; document.body.classList.remove("space"); } });
window.addEventListener("blur", () => { state.space = false; document.body.classList.remove("space"); });

/* ------------------------------------------------------------------ clipboard */
const CLIP_MARK = "ASAANDESK-BOARD:";
let clip = null, pasteTimer = 0, pasteCount = 0;
const BOARD_MIME = "application/x-asaandesk-board";
let lastPlainCopy = "";
/** Plain text of the selected notes, shapes and text boxes (top to bottom): what other apps get from Ctrl+C. */
function selectionPlainText() {
  return board().objects.filter((o) => state.sel.has(o.id) && TEXTY.has(o.type) && o.text).sort((a, b) => a.y - b.y || a.x - b.x).map((o) => o.text.replace(/\s*\n\s*/g, " ").trim()).join("\n");
}
function copySelection() {
  if (!state.sel.size) return false;
  clip = copyObjects(board(), state.sel);
  pasteCount = 0;
  // Other apps get the words (like Canva: copied stickies paste as text into a sheet or doc); this board keeps the items.
  lastPlainCopy = selectionPlainText();
  try { navigator.clipboard?.writeText?.(lastPlainCopy || CLIP_MARK + JSON.stringify(clip))?.catch?.(() => {}); } catch {}
  toast(`Copied ${state.sel.size} item${state.sel.size > 1 ? "s" : ""}`, 1400);
  return true;
}
function pastePayload(payload) {
  pasteCount++;
  const off = 24 * pasteCount;
  const ids = change(() => pasteObjects(board(), payload, off, off));
  setSel(ids);
}
function pasteSoon() { clearTimeout(pasteTimer); pasteTimer = setTimeout(() => { if (clip) pastePayload(clip); }, 120); }
document.addEventListener("copy", (e) => {
  if (isTyping(e.target) || !state.sel.size) return;
  const data = copyObjects(board(), state.sel), plainText = selectionPlainText();
  try {
    e.clipboardData?.setData(BOARD_MIME, JSON.stringify(data));
    e.clipboardData?.setData("text/plain", plainText || CLIP_MARK + JSON.stringify(data));
    lastPlainCopy = plainText;
    e.preventDefault();
  } catch {}
});
document.addEventListener("paste", async (e) => {
  if (isTyping(e.target)) return;
  const dt = e.clipboardData;
  const file = [...(dt?.files || [])].find((f) => f.type.startsWith("image/"));
  if (file) { clearTimeout(pasteTimer); e.preventDefault(); await addImageFile(file); return; }
  const text = dt?.getData("text/plain") || "";
  let boardData = "";
  try { boardData = dt?.getData(BOARD_MIME) || ""; } catch {}
  if (boardData || (clip && text && text === lastPlainCopy)) {
    // Board items copied here: paste the items, not their words.
    clearTimeout(pasteTimer); e.preventDefault();
    try { const p = boardData ? JSON.parse(boardData) : clip; if (p?.format === FORMAT + "-clip" && Array.isArray(p.objects)) { const same = clip && JSON.stringify(clip) === JSON.stringify(p); if (!same) pasteCount = 0; clip = p; pastePayload(p); } } catch {}
    return;
  }
  if (text.startsWith(CLIP_MARK)) {
    clearTimeout(pasteTimer); e.preventDefault();
    try { const p = JSON.parse(text.slice(CLIP_MARK.length)); if (p?.format === FORMAT + "-clip" && Array.isArray(p.objects)) { const same = clip && JSON.stringify(clip) === JSON.stringify(p); if (!same) pasteCount = 0; clip = p; pastePayload(p); } } catch {}
    return;
  }
  if (text.trim()) {
    clearTimeout(pasteTimer); e.preventDefault();
    const c = viewCenter(), o = makeText({ x: c.x - 150, y: c.y - 20, w: 300, text: text.slice(0, 5000) });
    addObjects([o]);
  }
});

/* ------------------------------------------------------------------ images */
const readDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("This image could not be opened.")); i.src = src; });
async function prepareImage(file) {
  if (!/^image\//.test(file.type)) throw new Error("Please choose an image file (PNG, JPG, WebP, GIF or SVG).");
  const url = await readDataUrl(file);
  const img = await loadImg(url);
  const w0 = img.naturalWidth || img.width || 300, h0 = img.naturalHeight || img.height || 200, max = 1600;
  const k = Math.min(1, max / Math.max(w0, h0));
  if (/^image\/(png|jpeg)$/.test(file.type) && k === 1) return { src: url, w: w0, h: h0 };
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return { src: c.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.9), w: c.width, h: c.height };
}
async function addImageFile(file, at = null) {
  try {
    const { src, w, h } = await prepareImage(file);
    const k = Math.min(1, 480 / Math.max(w, h)), c = at || viewCenter();
    const o = makeImage({ x: Math.round(c.x - (w * k) / 2), y: Math.round(c.y - (h * k) / 2), w: Math.round(w * k), h: Math.round(h * k), src, name: file.name || "Image" });
    addObjects([o]);
    setTool("select"); setSel([o.id]);
  } catch (err) { toast(err.message || String(err)); }
}
$("#imageBtn").addEventListener("click", () => $("#imageInput").click());
$("#imageInput").addEventListener("change", async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await addImageFile(f); });
boardEl.addEventListener("dragover", (e) => { if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === "file")) e.preventDefault(); });
boardEl.addEventListener("drop", async (e) => {
  const files = [...(e.dataTransfer?.files || [])];
  if (!files.length) return;
  e.preventDefault();
  const w = toWorld(e.clientX, e.clientY);
  for (const f of files) {
    if (/\.json$/i.test(f.name)) await openBoardFile(f);
    else await addImageFile(f, w);
  }
});

/* ------------------------------------------------------------------ side panel: templates and stickers */
function openSide(panel) {
  state.panel = panel;
  sideEl.hidden = false;
  document.body.classList.add("side-open");
  for (const b of sideEl.querySelectorAll("[data-panel]")) { const on = b.dataset.panel === panel; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
  if (panel === "templates") renderTemplates();
  else if (panel === "elements") renderElementsPanel(sideBody);
  else if (panel === "text") renderTextPanel(sideBody);
  else if (panel === "tools") renderToolsPanel(sideBody);
  else renderStickers();
  $("#empty").hidden = true;
}
function closeSide() { if (!state.panel) return; state.panel = null; sideEl.hidden = true; document.body.classList.remove("side-open"); requestRender(); }
$("#sideClose").addEventListener("click", closeSide);
for (const b of sideEl.querySelectorAll("[data-panel]")) b.addEventListener("click", () => openSide(b.dataset.panel));
$("#templatesBtn").addEventListener("click", () => (state.panel === "templates" ? closeSide() : openSide("templates")));
$("#stickerBtn").addEventListener("click", () => (state.panel === "stickers" ? closeSide() : openSide("stickers")));
$("#emptyTemplates").addEventListener("click", () => (shell ? shell.openPanel("templates") : openSide("templates")));
$("#emptyNote").addEventListener("click", addNoteAtCenter);

function renderTemplates() {
  sideBody.innerHTML = `<p class="muted">Pick a layout to add it to the middle of your view. You can change every part of it.</p><div class="tpl-grid">${TEMPLATES.map((t) => `<button type="button" class="tpl" data-template="${t.id}">${templatePreviewSvg(t.id)}<b>${t.name}</b><span>${t.desc}</span></button>`).join("")}</div>`;
}
sideBody.addEventListener("click", (e) => {
  const tb = e.target.closest("[data-template]");
  if (tb) { useTemplate(tb.dataset.template); return; }
  const sb = e.target.closest(".sticker-item");
  if (sb) { addSticker(sb.dataset.id); return; }
  const chip = e.target.closest(".chip");
  if (chip) { stickerCat = chip.dataset.cat; renderStickerGrid(); }
});
// Templates go in the middle of the view, or beside the existing work when they would cover it.
function templateSpot(id) {
  const c = viewCenter(), b = templateBounds(id), have = boardRect();
  const at = { x: c.x - b.w / 2, y: c.y - b.h / 2, w: b.w, h: b.h };
  if (have && rectsIntersect(at, have)) return { x: have.x + have.w + 140 + b.w / 2, y: have.y + have.h / 2 };
  return c;
}
function useTemplate(id, { fresh = false } = {}) {
  if (!templateById(id)) { toast("That template was not found."); return; }
  if (!board().objects.length && /^Untitled/.test(board().name || "Untitled")) {
    // A blank board takes the template's name (like starting a design from a template).
    board().name = templateById(id).name; $("#boardName").value = board().name; document.title = `${board().name} | Whiteboard | AsaanDesk`;
    try { shell?.setTitle?.(board().name); } catch {}
  }
  const c = templateSpot(id);
  const ids = change(() => applyTemplate(board(), id, Math.round(c.x), Math.round(c.y)));
  setTool("select");
  setSel(ids);
  if (innerWidth < 641) closeSide();
  if (shell && matchMedia("(max-width: 759.98px)").matches) try { shell.closePanel(); } catch {}
  const m = byId(), r = unionRect(board().objects.filter((o) => ids.includes(o.id)).map((o) => objectBounds(o, m)));
  if (fresh) { setSel([]); zoomToRect(r, 1); hist.clear(); renderNow(); }
  else zoomToRect(r, state.cam.z);
  toast(fresh ? "Template opened. Double-click any text to change it." : "Template added. Double-click any text to change it.");
}

let elementsMod = null, stickerCat = "all";
async function loadElements() { return (elementsMod ||= importModule("/pdf-editor/elements.js").catch((e) => { elementsMod = null; throw e; })); }
async function renderStickers() {
  sideBody.innerHTML = `<input type="search" class="ad-input" id="stickerSearch" placeholder="Search stickers (star, arrow, heart…)" aria-label="Search stickers"><div class="chips" id="stickerCats"></div><div class="stk-grid" id="stickerGrid" aria-live="polite"><p class="muted">Loading stickers…</p></div>`;
  $("#stickerSearch").addEventListener("input", renderStickerGrid);
  try {
    const E = await loadElements();
    if (state.panel !== "stickers") return;
    $("#stickerCats").innerHTML = [{ id: "all", label: "All" }, ...E.CATEGORIES].map((c) => `<button type="button" class="chip${c.id === stickerCat ? " on" : ""}" data-cat="${c.id}">${c.label}</button>`).join("");
    renderStickerGrid();
  } catch (err) {
    console.warn(err);
    const g = $("#stickerGrid"); if (g) g.innerHTML = '<p class="muted">Stickers could not be loaded. Check your connection and try again.</p>';
  }
}
async function renderStickerGrid() {
  if (!elementsMod || !$("#stickerGrid")) return;
  let M;
  try { M = await elementsMod; } catch { return; }
  const grid = $("#stickerGrid");
  if (!grid) return;
  for (const c of document.querySelectorAll("#stickerCats .chip")) c.classList.toggle("on", c.dataset.cat === stickerCat);
  const q = $("#stickerSearch")?.value || "";
  const list = M.searchElements(q, stickerCat).slice(0, q ? 120 : 90);
  grid.innerHTML = list.length ? list.map((el) => `<button type="button" class="sticker-item" data-id="${el.id}" aria-label="${el.name}" title="${el.name}">${M.elementSvg(el, {}, 48)}</button>`).join("") : '<p class="muted">No stickers match that word.</p>';
}
async function addSticker(id) {
  try {
    const M = await loadElements();
    const el = M.ELEMENTS.find((x) => x.id === id);
    if (!el) return;
    const [vw, vh] = el.vb, k = 130 / Math.max(vw, vh), c = viewCenter();
    const o = makeSticker({ x: Math.round(c.x - (vw * k) / 2), y: Math.round(c.y - (vh * k) / 2), w: Math.round(vw * k), h: Math.round(vh * k), element: { id: el.id, name: el.name, vb: el.vb, parts: el.parts, colors: { ...el.defaults } } });
    addObjects([o]);
    setTool("select"); setSel([o.id]);
  } catch (err) { toast("Stickers could not be loaded."); console.warn(err); }
}

/* ------------------------------------------------------------------ exports */
let pdfDepsP = null;
function pdfDeps() {
  return (pdfDepsP ||= (async () => {
    if (!window.PDFLib) await loadScript("/pdf-editor/lib/pdf-lib.min.js");
    if (!window.fontkit) await loadScript("/pdf-editor/lib/fontkit.umd.min.js").catch((e) => console.warn("fontkit unavailable, standard fonts will be used", e));
    const V = await importModule("/pdf-editor/vector.js");
    return { PDFLib: window.PDFLib, drawPrims: V.drawPrims };
  })().catch((e) => { pdfDepsP = null; throw e; }));
}
async function fontsReady() {
  await Promise.race([Promise.all([ensureFont("sans", false), ensureFont("sans", true)]), new Promise((r) => setTimeout(r, 4000))]);
  try { await document.fonts?.ready; } catch {}
}
async function exportPng(opts = {}) {
  await fontsReady();
  const { rect: r, objects, byId: m } = exportScope(board(), opts);
  let k = opts.scale || 2;
  const maxSide = 8192, maxArea = 40e6;
  k = Math.min(k, maxSide / Math.max(r.w, r.h), Math.sqrt(maxArea / (r.w * r.h)));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.w * k)); c.height = Math.max(1, Math.round(r.h * k));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.setTransform(k, 0, 0, k, -r.x * k, -r.y * k);
  const images = new Map();
  for (const o of objects) if (o.type === "image" && !images.has(o.src)) images.set(o.src, await loadImg(o.src).catch(() => null));
  for (const o of objects) {
    if (o.rot && canRotate(o)) { const [cx, cy] = centerOf(o); ctx.save(); ctx.translate(cx, cy); ctx.rotate((o.rot * Math.PI) / 180); ctx.translate(-cx, -cy); drawPrimsCanvas(ctx, objectPrims(o, m), { images }); ctx.restore(); }
    else drawPrimsCanvas(ctx, objectPrims(o, m), { images });
  }
  const blob = await new Promise((res) => (opts.type === "jpg" ? c.toBlob(res, "image/jpeg", 0.92) : c.toBlob(res, "image/png")));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height, scale: k, rect: r };
}
const exportSvg = (opts = {}) => boardToSvg(board(), opts);
async function exportPdf(opts = {}) { const deps = await pdfDeps(); return writePdf(board(), deps, { ...opts, onWarning: opts.onWarning || ((m) => setTimeout(() => toast(m, 5000), 1200)) }); }

function openExport(frameId = "") {
  finishEdit();
  const sel = $("#exportScope");
  const frames = board().objects.filter((o) => o.type === "frame");
  sel.innerHTML = `<option value="">Whole board</option>` + frames.map((f) => `<option value="${f.id}">Frame: ${(f.name || "Frame").replace(/[<&"]/g, "")}</option>`).join("");
  sel.value = frameId && frames.some((f) => f.id === frameId) ? frameId : "";
  if (!$("#exportDialog").open) $("#exportDialog").showModal();
}
$("#exportBtn").addEventListener("click", () => openExport(board().objects.find((o) => state.sel.has(o.id) && o.type === "frame")?.id || ""));
$("#exportClose").addEventListener("click", () => $("#exportDialog").close());
async function runExport(btn, kind, frameId = $("#exportScope").value || null) {
  if (btn?.getAttribute("aria-busy") === "true") return;
  finishEdit();
  const f = frameId ? find(frameId) : null;
  const name = fileBase(board().name) + (f ? "-" + fileBase(f.name) : "");
  if (!board().objects.length) { toast("The board is empty. Add something first."); return; }
  btn?.setAttribute("aria-busy", "true");
  try {
    if (kind === "png") { const { bytes } = await exportPng({ frameId }); download(bytes, name + ".png", "image/png"); }
    else if (kind === "jpg") { const { bytes } = await exportPng({ frameId, type: "jpg" }); download(bytes, name + ".jpg", "image/jpeg"); }
    else if (kind === "svg") download(await inlineLibraryPhotos(exportSvg({ frameId })), name + ".svg", "image/svg+xml");
    else { toast("Making your PDF…", 1500); download(await exportPdf({ frameId }), name + ".pdf", "application/pdf"); }
    toast(`Downloaded ${name}.${kind}`);
  } catch (err) { console.error(err); toast("Export failed: " + (err.message || err)); }
  finally { btn?.removeAttribute("aria-busy"); }
}
const downloadAs = (kind) => runExport(null, kind, null);

/* ------------------------------------------------------------------ convert: board -> presentation / doc */
const bytesToDataUrl = (bytes, type) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(new Blob([bytes], { type })); });
/** Arrows, drawings, stickers and pictures of a section on a transparent PNG (texts become editable layers instead). */
async function sectionPicture(sec, k) {
  const items = sec.items.filter((o) => !TEXTY.has(o.type) && o.type !== "frame");
  if (!items.length) return null;
  const r = sec.rect, s = Math.min(2, Math.max(0.5, k)), m = byId();
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.w * s)); c.height = Math.max(1, Math.round(r.h * s));
  const ctx = c.getContext("2d");
  ctx.setTransform(s, 0, 0, s, -r.x * s, -r.y * s);
  const images = new Map();
  for (const o of items) if (o.type === "image" && !images.has(o.src)) images.set(o.src, await loadImg(o.src).catch(() => null));
  for (const o of items) {
    if (o.rot && canRotate(o)) { const [cx, cy] = centerOf(o); ctx.save(); ctx.translate(cx, cy); ctx.rotate((o.rot * Math.PI) / 180); ctx.translate(-cx, -cy); drawPrimsCanvas(ctx, objectPrims(o, m), { images }); ctx.restore(); }
    else drawPrimsCanvas(ctx, objectPrims(o, m), { images });
  }
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) return null;
  return { src: await bytesToDataUrl(new Uint8Array(await blob.arrayBuffer()), "image/png"), w: c.width, h: c.height };
}
let converting = false;
async function convertBoard(kind) {
  if (converting) return;
  finishEdit();
  if (!board().objects.length) { toast("The board is empty. Add something first."); return; }
  converting = true;
  toast(kind === "slides" ? "Making your presentation…" : "Making your doc…", 2500);
  try {
    await saveNow().catch(() => {});
    let payload, url;
    if (kind === "slides") {
      const [SM, SP] = await Promise.all([importModule("/design/studio/model.js"), importModule("/design/studio/presets.js")]);
      const design = await boardToDeck(board(), { textLayer: SM.textLayer, shapeLayer: SM.shapeLayer, imageLayer: SM.imageLayer, newPage: SM.newPage, getPreset: SP.getPreset, designPreset: SP.designPreset }, sectionPicture);
      payload = { design, name: design.name, from: "whiteboard" };
      url = "/design/studio/";
    } else {
      let pic = null;
      try {
        const { bytes, width, height } = await exportPng({ scale: 1 });
        const w = Math.min(640, width), h = Math.round((height * w) / width);
        pic = { src: await bytesToDataUrl(bytes, "image/png"), w, h };
      } catch (e) { console.warn("No board picture for the doc", e); }
      payload = { type: "doc", doc: boardToDoc(board(), pic), from: "whiteboard" };
      url = "/design/docs/";
    }
    const id = await putHandoff(payload);
    lastHandoff = { kind, id, sections: boardSections(board()).length };
    if ($("#convertDialog").open) $("#convertDialog").close();
    location.assign(url + "?handoff=" + encodeURIComponent(id));
  } catch (e) { console.error(e); toast("Could not convert: " + (e.message || e)); }
  finally { converting = false; }
}
let lastHandoff = null;
/* Sections as "pages" in the bottom bar */
const sectionList = () => board().objects.filter((o) => o.type === "frame").sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
function currentSection() {
  const list = sectionList(), c = viewCenter();
  if (!list.length) return 0;
  let best = 0, bd = Infinity;
  list.forEach((f, i) => { const d = Math.hypot(f.x + f.w / 2 - c.x, f.y + f.h / 2 - c.y); if (d < bd) { bd = d; best = i; } });
  return best;
}
function goSection(i) {
  const list = sectionList();
  if (!list.length) { fit(); return; }
  const f = list[clamp(i, 0, list.length - 1)];
  zoomToRect({ x: f.x, y: f.y - 30, w: f.w, h: f.h + 30 }, 1.5);
}
function sectionThumb(i) {
  const list = sectionList();
  try { return boardToSvg(board(), list.length ? { frameId: list[clamp(i, 0, list.length - 1)].id } : { margin: 30 }).replace(/^<\?xml[^>]*>\s*/, ""); } catch { return ""; }
}
function openConvert() { finishEdit(); if (!$("#convertDialog").open) $("#convertDialog").showModal(); }
$("#convertClose").addEventListener("click", () => $("#convertDialog").close());
$("#convertSlides").addEventListener("click", () => convertBoard("slides"));
$("#convertDoc").addEventListener("click", () => convertBoard("doc"));
$("#exportPng").addEventListener("click", (e) => runExport(e.currentTarget, "png"));
$("#exportSvg").addEventListener("click", (e) => runExport(e.currentTarget, "svg"));
$("#exportPdf").addEventListener("click", (e) => runExport(e.currentTarget, "pdf"));

/* ------------------------------------------------------------------ boards list and files */
async function renderBoardList() {
  const ul = $("#boardList");
  let list = [];
  try { list = await listProjects("whiteboard"); } catch (e) { ul.innerHTML = '<li class="muted">Saved boards are not available in this browser (private mode?).</li>'; return; }
  if (!list.length) { ul.innerHTML = '<li class="muted">No saved boards yet. Your board is saved here automatically as you work.</li>'; return; }
  const fmt = (t) => { try { return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; } };
  ul.innerHTML = list.map((p) => `<li class="board-row${p.id === state.boardId ? " current" : ""}" data-id="${p.id}">${p.thumb ? `<img alt="" src="${p.thumb.replace(/"/g, "&quot;")}">` : '<span class="ph"></span>'}<div class="meta"><b></b><span>${p.id === state.boardId ? "Open now · " : ""}${fmt(p.updated)}</span></div><div class="acts"><button class="btn" type="button" data-b="open">Open</button><button class="btn" type="button" data-b="rename">Rename</button><button class="btn" type="button" data-b="delete" aria-label="Delete board">Delete</button></div></li>`).join("");
  ul.querySelectorAll(".board-row").forEach((li, i) => { li.querySelector("b").textContent = list[i].name || "Untitled board"; });
}
$("#boardsBtn").addEventListener("click", async () => { finishEdit(); if (!state.saved) await saveNow().catch(() => {}); await renderBoardList(); if (!$("#boardsDialog").open) $("#boardsDialog").showModal(); });
$("#boardsClose").addEventListener("click", () => $("#boardsDialog").close());
$("#boardList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-b]"), li = e.target.closest(".board-row");
  if (!b || !li) return;
  const id = li.dataset.id;
  if (b.dataset.b === "open") {
    const p = await getProject(id);
    if (!p) { toast("That board is gone."); return renderBoardList(); }
    try { loadBoard(parseBoard(p.data), id); lsSet(LAST_KEY, id); setSaveState("Saved"); $("#boardsDialog").close(); } catch (err) { toast(err.message); }
  } else if (b.dataset.b === "rename") {
    const p = await getProject(id);
    const name = prompt("New name for this board", p?.name || "");
    if (!name || !p) return;
    if (id === state.boardId) { board().name = name.trim().slice(0, 120); $("#boardName").value = board().name; await saveNow(); }
    else await saveProject({ ...p, name: name.trim().slice(0, 120), data: { ...p.data, name: name.trim().slice(0, 120) } });
    renderBoardList();
  } else if (b.dataset.b === "delete") {
    if (!confirm("Delete this board from this browser? This can't be undone.")) return;
    await deleteProject(id);
    if (id === state.boardId) startNewBoard(false);
    renderBoardList();
  }
});
function startNewBoard(close = true) {
  loadBoard(newBoard(), null);
  setSaveState("");
  try { const u = new URL(location.href); u.searchParams.delete("board"); history.replaceState(null, "", u); } catch {}
  lsSet(LAST_KEY, "");
  if (close) $("#boardsDialog").close();
}
$("#newBoardBtn").addEventListener("click", async () => { if (!state.saved && board().objects.length) await saveNow().catch(() => {}); startNewBoard(); toast("New board"); });
$("#saveFileBtn").addEventListener("click", () => { download(JSON.stringify(boardToJSON(board())), fileBase(board().name) + ".asaandesk-board.json", "application/json"); });
$("#openFileBtn").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#openFileInput").click(); } });
async function openBoardFile(file) {
  try {
    const b = parseBoard(await file.text());
    if (!state.saved && board().objects.length) await saveNow().catch(() => {});
    loadBoard(b, null);
    $("#boardsDialog").open && $("#boardsDialog").close();
    await saveNow();
    toast(`Opened "${b.name}"`);
  } catch (err) { toast(err instanceof SyntaxError ? "This file is not an AsaanDesk board." : err.message || String(err)); }
}
$("#openFileInput").addEventListener("change", async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await openBoardFile(f); });
$("#boardName").addEventListener("input", (e) => { board().name = e.target.value.slice(0, 120) || "Untitled board"; document.title = `${board().name} | Whiteboard | AsaanDesk`; scheduleSave(); });
$("#boardName").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); boardEl.focus(); } });

/* ------------------------------------------------------------------ zoom buttons, undo buttons */
$("#zoomIn").addEventListener("click", () => zoomBy(1.25));
$("#zoomOut").addEventListener("click", () => zoomBy(1 / 1.25));
$("#zoomPct").addEventListener("click", () => { const v = viewSize(); zoomAt(v.w / 2, v.h / 2, 1); });
$("#zoomFit").addEventListener("click", fit);
$("#mapBtn").addEventListener("click", (e) => { state.showMap = !state.showMap; document.body.classList.toggle("no-map", !state.showMap); e.currentTarget.setAttribute("aria-pressed", String(state.showMap)); lsSet("asaandesk-whiteboard-map", state.showMap ? "1" : "0"); renderMinimap(); });
$("#undoBtn").addEventListener("click", undo);
$("#redoBtn").addEventListener("click", redo);
window.addEventListener("resize", () => { applyCam(); });
window.addEventListener("beforeunload", () => { if (!state.saved) saveNow().catch(() => {}); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && !state.saved) saveNow().catch(() => {}); });

/* ------------------------------------------------------------------ Elements, Text and Tools panels */
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ico = (inner, vb = "0 0 24 24") => `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
/** Places new objects in the middle of the view, selects them; text-like ones can start editing. */
function placeAtCenter(list, { edit = false, at = null } = {}) {
  // at: a board point (items dropped from the panels land where they were dropped), else the middle of the view.
  const c = at || viewCenter(), m = byIdOf({ objects: list });
  const r = unionRect(list.map((o) => objectBounds(o, m)));
  const dx = Math.round(c.x - (r.x + r.w / 2)), dy = Math.round(c.y - (r.y + r.h / 2));
  // Stagger repeated adds so they don't land exactly on top of each other.
  const n = at ? 0 : (placeAtCenter.n = ((placeAtCenter.t || 0) > Date.now() - 8000 ? (placeAtCenter.n || 0) + 1 : 0)) % 6;
  if (!at) placeAtCenter.t = Date.now();
  for (const o of list) { if (o.type === "connector") { for (const k of ["from", "to"]) if (o[k].id == null) { o[k].x += dx + n * 24; o[k].y += dy + n * 24; } } else { o.x += dx + n * 24; o.y += dy + n * 24; } }
  const frames = list.filter((o) => o.type === "frame");
  if (frames.length) change(() => { board().objects = [...frames, ...board().objects, ...list.filter((o) => o.type !== "frame")]; });
  else change(() => { board().objects = [...board().objects, ...list]; });
  setTool("select");
  setSel(list.map((o) => o.id));
  if (edit && list.length === 1) startEdit(list[0]);
  else boardEl.focus({ preventScroll: true }); // so Delete, Ctrl+D and arrows work on what was just added
  if (innerWidth < 641 && !shell) closeSide();
  // Phones: close the bottom sheet so the new item is in view (like Canva).
  if (shell && matchMedia("(max-width: 759.98px)").matches) try { shell.closePanel(); } catch {}
  return list;
}
const LINE_KINDS = { arrow: { kind: "straight", arrow: "end" }, line: { kind: "straight", arrow: "none" }, double: { kind: "straight", arrow: "both" }, elbow: { kind: "elbow", arrow: "end" }, dashed: { kind: "straight", arrow: "end", dash: true } };
const REACTIONS = [["+1", "#5b4cf0"], ["Yes", "#16a34a"], ["No", "#e11d48"], ["?", "#f59e0b"], ["Idea", "#0ea5e9"], ["Love it", "#ec4899"]];
const VOTE_COLORS = ["#5b4cf0", "#f43f5e", "#14b8a6", "#f59e0b", "#2f80ff", "#1b2133"];
/** Adds one element by kind (used by the panels, the shell and tests). Returns the new objects. */
function addElement(kind, opt = {}) {
  if (state.mode !== "edit") { toast("Switch to Editing to change the board."); return []; }
  switch (kind) {
    case "note": { state.noteColor = opt.color || state.noteColor; return placeAtCenter([makeNote({ w: 200, h: 200, color: state.noteColor, text: opt.text || "" })], { edit: !opt.text }); }
    case "shape": { const [w, h] = defaultShapeSize(opt.kind || "rect"); return placeAtCenter([makeShape({ w, h, kind: opt.kind || "rect", fill: opt.fill || "#e8e5fe", stroke: opt.stroke || "#5b4cf0", text: opt.text || "" })]); }
    case "line": { const L = LINE_KINDS[opt.kind] || LINE_KINDS.arrow, c = makeConnector({ from: { x: 0, y: 0 }, to: { x: 220, y: opt.kind === "elbow" ? 120 : 0 }, kind: L.kind, arrow: L.arrow }); if (L.dash) c.dash = true; return placeAtCenter([c]); }
    case "table": { const [cols, rows] = String(opt.size || "3x3").split("x").map(Number); return placeAtCenter(makeTable({ cols, rows, cells: [Array.from({ length: cols }, (_, i) => "Heading " + (i + 1))] })); }
    case "flow": {
      // Quick flowchart: start, a step, a yes/no question and the end, already joined; then grow it with the "+" handles.
      const st = makeShape({ x: 0, y: 0, w: 170, h: 70, kind: "ellipse", fill: "#dcfce7", stroke: "#22c55e", text: "Start", bold: true });
      const s1 = makeShape({ x: -5, y: 140, w: 180, h: 80, kind: "rounded", fill: "#e8e5fe", stroke: "#5b4cf0", text: "Step" });
      const q = makeShape({ x: -15, y: 290, w: 200, h: 130, kind: "diamond", fill: "#fef3c7", stroke: "#f59e0b", text: "Yes or no?" });
      const en = makeShape({ x: 0, y: 490, w: 170, h: 70, kind: "ellipse", fill: "#ffe4e6", stroke: "#f43f5e", text: "End", bold: true });
      const ln = (a, b, text = "") => makeConnector({ from: { id: a.id, side: "bottom" }, to: { id: b.id, side: "top" }, kind: "elbow", arrow: "end", text });
      return placeAtCenter([st, s1, q, en, ln(st, s1), ln(s1, q), ln(q, en, "Yes")]);
    }
    case "section": { const n = board().objects.filter((x) => x.type === "frame").length + 1; return placeAtCenter([makeFrame({ w: opt.w || 720, h: opt.h || 460, name: opt.name || "Section " + n, fill: opt.fill || "#ffffff" })]); }
    case "heading": return placeAtCenter([makeText({ w: 520, text: opt.text || "Add a heading", size: 56, bold: true })]);
    case "subheading": return placeAtCenter([makeText({ w: 420, text: opt.text || "Add a subheading", size: 32, bold: true })]);
    case "body": return placeAtCenter([makeText({ w: 360, text: opt.text || "Add a little bit of body text", size: 20 })]);
    case "quote": { const t = makeText({ w: 420, text: opt.text || "“A short quote goes here.”", size: 28, align: "center" }); t.italic = true; t.font = "serif"; normalizeObject(t); return placeAtCenter([t]); }
    case "label": { const o = makeShape({ w: 260, h: 52, kind: "rounded", fill: "#1b2133", stroke: "#1b2133", text: opt.text || "Section title", size: 20, bold: true }); o.textColor = "#ffffff"; return placeAtCenter([o]); }
    case "vote": { const o = makeShape({ w: 34, h: 34, kind: "ellipse", fill: opt.color || VOTE_COLORS[0], stroke: "#ffffff", sw: 3 }); return placeAtCenter([o]); }
    case "reaction": { const [text, color] = REACTIONS.find((r) => r[0] === opt.text) || REACTIONS[0]; const o = makeShape({ w: Math.max(64, text.length * 13 + 30), h: 44, kind: "rounded", fill: color, stroke: color, text, size: 18, bold: true }); o.textColor = "#ffffff"; return placeAtCenter([o]); }
  }
  return [];
}
function wirePanel(el, handler) { if (el.__wbWired) el.removeEventListener("click", el.__wbWired); el.__wbWired = handler; el.addEventListener("click", handler); }
function renderElementsPanel(el) {
  el.classList.add("wb-panel");
  el.innerHTML = `<div class="wb-sec"><h3>Sticky notes</h3><div class="wb-row">${NOTE_COLORS.map((c) => `<button type="button" class="wb-note" data-wb="note" data-color="${c.value}" style="background:${c.value}" aria-label="${c.name} sticky note" title="${c.name} sticky note"></button>`).join("")}</div></div>
<div class="wb-sec"><h3>Shapes</h3><div class="wb-grid">${SHAPE_KINDS.map((k) => `<button type="button" class="wb-tile" data-wb="shape" data-kind="${k.id}" aria-label="${k.label}" title="${k.label}">${ico(SHAPE_ICON[k.id])}</button>`).join("")}</div></div>
<div class="wb-sec"><h3>Lines and arrows</h3><div class="wb-grid">${[["arrow", "Arrow", '<path d="M4 12h15M14 7l5 5-5 5"/>'], ["line", "Line", '<path d="M4 12h16"/>'], ["double", "Double arrow", '<path d="M5 12h14M9 8l-4 4 4 4M15 8l4 4-4 4"/>'], ["elbow", "Elbow arrow", '<path d="M4 6h8v12h7M16 15l3 3-3 3"/>'], ["dashed", "Dashed arrow", '<path d="M4 12h3M10 12h3M16 12h3M15 8l4 4-4 4"/>']].map(([k, l, d]) => `<button type="button" class="wb-tile" data-wb="line" data-kind="${k}" aria-label="${l}" title="${l}">${ico(d)}</button>`).join("")}<button type="button" class="wb-tile" data-wb="tool" data-tool-pick="connector" aria-label="Connect two items" title="Connector: drag from one item to another">${ico('<circle cx="5" cy="18" r="2.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><path d="M7 16l8-7"/>')}</button><button type="button" class="wb-tile txt" data-wb="flow" aria-label="Quick flowchart" title="Quick flowchart: start, step, question, end, already joined. Grow it with the + handles or Alt+Arrow.">${ico('<ellipse cx="12" cy="4" rx="4" ry="2.2"/><rect x="8" y="9" width="8" height="4" rx="1"/><path d="M12 15.5l3.5 2.5-3.5 2.5-3.5-2.5z"/><path d="M12 6.2V9M12 13v2.5"/>')}<span>Quick flow</span></button></div></div>
<div class="wb-sec"><h3>Draw and text</h3><div class="wb-grid"><button type="button" class="wb-tile txt" data-wb="tool" data-tool-pick="pen" aria-label="Draw with the pen" title="Draw (D)">${ico('<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3 3"/>')}<span>Draw</span></button><button type="button" class="wb-tile txt" data-wb="tool" data-tool-pick="highlighter" aria-label="Highlighter" title="Highlighter (M)">${ico('<path d="M9 14l-5 5h6l2-2"/><path d="M9 14l8.5-8.5 3 3L12 17z"/>')}<span>Marker</span></button><button type="button" class="wb-tile txt" data-wb="body" aria-label="Add a text box" title="Text (T)">${ico('<path d="M5 7V4h14v3M12 4v16M9 20h6"/>')}<span>Text</span></button></div></div>
<div class="wb-sec"><h3>Tables</h3><div class="wb-grid">${["2x2", "3x3", "4x3"].map((t) => `<button type="button" class="wb-tile txt" data-wb="table" data-size="${t}" aria-label="Table ${t.replace("x", " by ")}" title="Table ${t.replace("x", " × ")}">${ico('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 10h18M3 14.5h18M9 5v14M15 5v14"/>')}<span>${t.replace("x", " × ")}</span></button>`).join("")}</div></div>
<div class="wb-sec"><h3>Sections</h3><div class="wb-grid"><button type="button" class="wb-tile txt" data-wb="section" aria-label="Add a section" title="A titled area that keeps sticky notes together">${ico('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 6h7v-2h-7z"/>')}<span>Section</span></button><button type="button" class="wb-tile txt" data-wb="label" aria-label="Section title" title="Dark title pill">${ico('<rect x="3" y="8" width="18" height="8" rx="4" fill="currentColor"/>')}<span>Title</span></button></div></div>
<div class="wb-sec"><h3>Stickers</h3><input type="search" class="ad-input wb-stk-search" placeholder="Search stickers (star, arrow, heart…)" aria-label="Search stickers"><div class="chips wb-stk-cats"></div><div class="stk-grid wb-stk-grid" aria-live="polite"><p class="muted">Loading stickers…</p></div></div>`;
  wirePanel(el, (e) => {
    const b = e.target.closest("[data-wb], .wb-stk, .wb-chip");
    if (!b) return;
    if (b.classList.contains("wb-stk")) { addSticker(b.dataset.id); return; }
    if (b.classList.contains("wb-chip")) { el.__cat = b.dataset.cat; fillStickerGrid(el); return; }
    const d = b.dataset;
    if (d.wb === "tool") {
      if (d.toolPick === "pen") state.ink.pen.width = 3;
      setTool(d.toolPick);
      toast(d.toolPick === "connector" ? "Drag from one item to another to connect them" : d.toolPick === "pen" || d.toolPick === "highlighter" ? "Draw on the board. Press V or Esc to stop." : "Tool ready");
      if (shell && matchMedia("(max-width: 759.98px)").matches) try { shell.closePanel(); } catch {}
      return;
    }
    addElement(d.wb, { color: d.color, kind: d.kind, size: d.size });
  });
  if (shell) {
    // In the editor frame the shared kit's Elements panel has the shapes, lines and arrows, tables, graphics and
    // stickers (they insert as board objects): this part keeps only what is the board's own (Canva whiteboards too).
    for (const s of el.querySelectorAll(".wb-sec")) {
      const t = s.querySelector("h3")?.textContent;
      if (["Shapes", "Draw and text", "Tables", "Stickers"].includes(t)) s.remove();
      else if (t === "Lines and arrows") { s.querySelector("h3").textContent = "Connect and flow"; for (const b of s.querySelectorAll('[data-wb="line"]')) b.remove(); }
    }
  }
  el.querySelector(".wb-stk-search")?.addEventListener("input", () => fillStickerGrid(el));
  loadElements().then((E) => { const cats = el.querySelector(".wb-stk-cats"); if (!cats) return; el.__cat ||= "all"; cats.innerHTML = [{ id: "all", label: "All" }, ...E.CATEGORIES].map((c) => `<button type="button" class="chip wb-chip${c.id === el.__cat ? " on" : ""}" data-cat="${c.id}">${esc(c.label)}</button>`).join(""); fillStickerGrid(el); })
    .catch(() => { const g = el.querySelector(".wb-stk-grid"); if (g) g.innerHTML = '<p class="muted">Stickers could not be loaded. Check your connection and try again.</p>'; });
}
async function fillStickerGrid(el) {
  let M; try { M = await loadElements(); } catch { return; }
  const grid = el.querySelector(".wb-stk-grid"); if (!grid) return;
  for (const c of el.querySelectorAll(".wb-chip")) c.classList.toggle("on", c.dataset.cat === (el.__cat || "all"));
  const q = el.querySelector(".wb-stk-search")?.value || "";
  const list = M.searchElements(q, el.__cat || "all").slice(0, q ? 90 : 48);
  grid.innerHTML = list.length ? list.map((x) => `<button type="button" class="sticker-tile wb-stk" data-id="${x.id}" aria-label="${esc(x.name)}" title="${esc(x.name)}">${M.elementSvg(x, {}, 44)}</button>`).join("") : '<p class="muted">No stickers match that word.</p>';
}
function renderTextPanel(el) {
  el.classList.add("wb-panel");
  el.innerHTML = `<div class="wb-sec"><button type="button" class="wb-add-text primary" data-wb="heading">Add a text box</button></div>
<div class="wb-sec"><h3>Default text styles</h3>
<button type="button" class="wb-text h" data-wb="heading">Add a heading</button>
<button type="button" class="wb-text s" data-wb="subheading">Add a subheading</button>
<button type="button" class="wb-text b" data-wb="body">Add a little bit of body text</button></div>
<div class="wb-sec"><h3>Whiteboard text</h3>
<button type="button" class="wb-text q" data-wb="quote">“A short quote”</button>
<button type="button" class="wb-text l" data-wb="label"><span>Section title</span></button>
<button type="button" class="wb-text n" data-wb="note" data-color="#ffe27a"><span>Sticky note text</span></button></div>
<p class="muted">Double-click any text on the board to change it. Pick a font, size and colour in the bar above the board.</p>`;
  // In the editor frame the kit's Text panel has Add a text box and the default styles: keep the board's own text.
  if (shell) for (const s of el.querySelectorAll(".wb-sec")) if (!/Whiteboard text/.test(s.querySelector("h3")?.textContent || "")) s.remove();
  wirePanel(el, (e) => { const b = e.target.closest("[data-wb]"); if (b) addElement(b.dataset.wb, { color: b.dataset.color, text: b.dataset.wb === "note" ? "" : undefined }); });
}
let timer = { end: 0, left: 0, id: 0, total: 0 };
function renderToolsPanel(el) {
  el.classList.add("wb-panel");
  const t = state.tool;
  el.innerHTML = `<div class="wb-sec"><h3>Draw</h3><div class="wb-grid">
<button type="button" class="wb-tile txt${t === "pen" && state.ink.pen.width <= 4 ? " on" : ""}" data-draw="pen" aria-label="Pen">${ico('<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3 3"/>')}<span>Pen</span></button>
<button type="button" class="wb-tile txt${t === "pen" && state.ink.pen.width > 4 ? " on" : ""}" data-draw="marker" aria-label="Marker">${ico('<path d="M6 18l-2 3h5l1-1"/><path d="M7 15l9-9 3 3-9 9-4 1z"/>')}<span>Marker</span></button>
<button type="button" class="wb-tile txt${t === "highlighter" ? " on" : ""}" data-draw="highlighter" aria-label="Highlighter">${ico('<path d="M9 14l-5 5h6l2-2"/><path d="M9 14l8.5-8.5 3 3L12 17z"/>')}<span>Highlighter</span></button>
<button type="button" class="wb-tile txt${t === "eraser" ? " on" : ""}" data-draw="eraser" aria-label="Eraser">${ico('<path d="M8 20h12"/><path d="M4.5 15.5l9-9 6 6-7.5 7.5H8.5z"/>')}<span>Eraser</span></button>
</div><div class="wb-row">${INK_COLORS.slice(0, 8).map((c) => `<button type="button" class="swatch${state.ink.pen.color === c ? " on" : ""}" data-ink-pick="${c}" style="background:${c}" aria-label="Ink ${c}" title="Ink colour"></button>`).join("")}</div></div>
<div class="wb-sec"><h3>Timer</h3><div class="wb-row">${[1, 2, 3, 5, 10].map((m) => `<button type="button" class="wb-chipbtn" data-timer="${m}">${m} min</button>`).join("")}<button type="button" class="wb-chipbtn" data-timer="0">Stop</button></div>
<label class="wb-music">Music while it runs <select data-music aria-label="Timer music"><option value="">Off</option>${MUSIC_STYLES.map((s) => `<option value="${s.id}"${timerMusic.style === s.id ? " selected" : ""}>${s.label}</option>`).join("")}</select></label>
<p class="muted">A countdown shows on the board, with pause and restart. The music is made right here in your browser.</p></div>
<div class="wb-sec"><h3>Vote dots</h3><div class="wb-row">${VOTE_COLORS.map((c) => `<button type="button" class="wb-dot" data-wb="vote" data-color="${c}" style="background:${c}" aria-label="Add a vote dot" title="Add a vote dot"></button>`).join("")}</div></div>
<div class="wb-sec"><h3>Reactions</h3><div class="wb-row">${REACTIONS.map(([r, c]) => `<button type="button" class="wb-react" data-wb="reaction" data-text="${esc(r)}" style="background:${c}">${esc(r)}</button>`).join("")}</div></div>
<div class="wb-sec"><h3>AI ideas</h3><div class="wb-row"><input type="text" class="ad-input wb-ai-topic" data-ai-topic placeholder="Topic, e.g. team lunch ideas" aria-label="Topic for AI ideas" maxlength="120"><button type="button" class="wb-chipbtn" data-ai-go>Get ideas</button></div><p class="muted" data-ai-status role="status">Ideas are written on this device when your browser has built-in AI. Nothing is sent anywhere.</p></div>
<div class="wb-sec"><h3>View</h3><div class="wb-row"><button type="button" class="wb-chipbtn" data-view="hand">Move the view</button><button type="button" class="wb-chipbtn" data-view="fit">Fit the board</button><button type="button" class="wb-chipbtn" data-view="map">Mini map on/off</button></div></div>`;
  // In the editor frame the kit's Tools panel has Draw (Pen, Marker, Glow pen, Highlighter, Eraser on the board's pen).
  if (shell) for (const s of el.querySelectorAll(".wb-sec")) if (s.querySelector("h3")?.textContent === "Draw") s.remove();
  wirePanel(el, (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.draw) {
      if (d.draw === "pen") { state.ink.pen.width = 3; setTool("pen"); }
      else if (d.draw === "marker") { state.ink.pen.width = 8; setTool("pen"); }
      else setTool(d.draw);
      renderToolsPanel(el); renderProps();
    } else if (d.inkPick) { state.ink.pen.color = d.inkPick; if (state.tool !== "pen") setTool("pen"); renderToolsPanel(el); renderProps(); }
    else if (d.timer != null) startTimer(+d.timer);
    else if (d.view === "hand") setTool("hand");
    else if (d.view === "fit") fit();
    else if (d.view === "map") $("#mapBtn").click();
    else if (b.matches("[data-ai-go]")) aiIdeas(el);
    else if (d.wb) addElement(d.wb, { color: d.color, text: d.text });
  });
  const ms = el.querySelector("[data-music]");
  ms?.addEventListener("change", () => { timerMusic.style = ms.value; lsSet("asaandesk-whiteboard-music", ms.value); if (timer.running) playMusic(); else stopMusic(); });
}
/* Board timer: countdown chip with pause / restart / stop, optional music (generated, see music.js). */
const MUSIC_STYLES = [{ id: "focus", label: "Focus" }, { id: "dramatic", label: "Dramatic" }, { id: "upbeat", label: "Upbeat" }, { id: "energetic", label: "Energetic" }, { id: "lofi", label: "Lofi" }, { id: "calm", label: "Calm" }];
const timerMusic = { style: "", audio: null, urls: new Map(), playing: false };
let musicMod = null;
async function musicUrl(kind) {
  if (timerMusic.urls.has(kind)) return timerMusic.urls.get(kind);
  musicMod ||= import("./music.js");
  const M = await musicMod;
  const url = URL.createObjectURL(new Blob([M.wav(kind === "chime" ? M.chime() : M.musicLoop(kind))], { type: "audio/wav" }));
  timerMusic.urls.set(kind, url);
  return url;
}
async function playMusic() {
  stopMusic();
  if (!timerMusic.style) return;
  try {
    const a = (timerMusic.audio ||= Object.assign(document.createElement("audio"), { id: "wbMusic", loop: true }));
    if (!a.isConnected) document.body.append(a);
    a.loop = true; a.volume = 0.5; a.src = await musicUrl(timerMusic.style); a.dataset.style = timerMusic.style;
    timerMusic.playing = true;
    await a.play().catch((e) => { timerMusic.playing = false; console.warn("Music could not start", e); });
  } catch (e) { timerMusic.playing = false; console.warn(e); }
}
function stopMusic() { timerMusic.playing = false; try { timerMusic.audio?.pause(); } catch {} }
async function chimeNow() { try { const a = new Audio(await musicUrl("chime")); a.volume = 0.6; await a.play().catch(() => {}); } catch {} }
function drawTimer() {
  const chip = $("#wbTimer"), left = timer.running ? Math.max(0, timer.end - Date.now()) : timer.left;
  const m = Math.floor(left / 60000), sec = Math.ceil((left % 60000) / 1000) % 60, mm = sec === 0 && left % 60000 > 0 ? m + 1 : m;
  chip.hidden = !timer.total;
  chip.querySelector("b").textContent = `${mm}:${String(sec).padStart(2, "0")}`;
  chip.style.setProperty("--p", String(timer.total ? 1 - left / timer.total : 0));
  const pb = $("#wbTimerPause");
  pb.textContent = timer.running ? "❚❚" : "▶"; pb.setAttribute("aria-label", timer.running ? "Pause the timer" : "Resume the timer"); pb.title = timer.running ? "Pause" : "Resume";
  chip.dataset.running = String(!!timer.running);
}
function tickTimer() {
  if (!timer.running) return;
  const left = Math.max(0, timer.end - Date.now());
  drawTimer();
  if (!left) {
    clearInterval(timer.id); timer.running = false; timer.left = 0; stopMusic(); chimeNow();
    const chip = $("#wbTimer"); chip.classList.add("done"); toast("Time is up!"); setTimeout(() => chip.classList.remove("done"), 4000);
  }
}
/** AI ideas: sticky notes written by the browser's built-in AI (Chrome on-device) or AsaanDesk AI when it is on; honest message otherwise. */
async function aiIdeas(el) {
  const inp = el.querySelector("[data-ai-topic]"), st = el.querySelector("[data-ai-status]"), topic = inp.value.trim();
  if (!topic) { st.textContent = "Type a topic first."; inp.focus(); return; }
  if (state.mode !== "edit") { toast("Switch to Editing to change the board."); return; }
  try {
    const AI = await importModule("../shared/ai.js");
    st.textContent = "Checking for AI on this device…";
    // The browser's AI may still be downloading its model: give up after 25 s with an honest message.
    const late = new Promise((_, rej) => setTimeout(() => rej(new Error("Your browser's built-in AI is not ready yet (it may still be downloading). AsaanDesk AI is coming soon. Nothing was sent anywhere.")), 25000));
    const text = await Promise.race([AI.aiText("write", `Write 6 short brainstorm ideas (at most 6 words each) about: ${topic}. One idea per line. No numbers, no bullets.`, { onStatus: (m) => { st.textContent = m; } }), late]);
    const ideas = String(text).split(/\n+/).map((s) => s.replace(/^[\s\-*\d.)]+/, "").trim()).filter(Boolean).slice(0, 8);
    if (!ideas.length) { st.textContent = "No ideas came back. Try another topic."; return; }
    const frame = makeFrame({ x: 0, y: 0, w: 980, h: 640, name: "Ideas: " + topic.slice(0, 60) });
    const mid = makeShape({ x: 370, y: 260, w: 240, h: 120, kind: "ellipse", fill: "#5b4cf0", stroke: "#5b4cf0", text: topic.slice(0, 60), size: 20, bold: true });
    mid.textColor = "#ffffff";
    const notes = ideas.map((t, i) => { const a = (i / ideas.length) * Math.PI * 2 - Math.PI / 2; return makeNote({ x: 490 + Math.cos(a) * 360 - 75, y: 320 + Math.sin(a) * 230 - 70, w: 150, h: 140, color: NOTE_COLORS[i % 7].value, text: t }); });
    placeAtCenter([frame, mid, ...notes]);
    st.textContent = `Added ${ideas.length} ideas.`;
  } catch (e) { st.textContent = e?.message || "AI ideas are not available in this browser."; }
}
/** "Expand to whiteboard" from another app: { type: "whiteboard", name, title?, texts?: [string], image?: { src, w, h } } becomes a section. */
async function openFromHandoff(payload) {
  if (payload?.type !== "whiteboard") return false;
  const b = newBoard(String(payload.name || "Whiteboard").slice(0, 120));
  const objs = [], texts = (payload.texts || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 16);
  const img = payload.image?.src && /^data:image\/(png|jpeg);/.test(payload.image.src) ? payload.image : null;
  const iw = img ? 640 : 0, ih = img ? Math.round((640 * (img.h || 360)) / (img.w || 640)) : 0;
  const cols = 3, nw = 180, rows = Math.ceil(texts.length / cols);
  const w = Math.max(700, 60 + iw + (texts.length ? 40 + cols * (nw + 20) : 0)), h = Math.max(460, 80 + Math.max(ih, rows * 200));
  objs.push(makeFrame({ x: 0, y: 0, w, h, name: String(payload.title || payload.name || "From the design").slice(0, 80) }));
  if (img) objs.push(makeImage({ x: 30, y: 40, w: iw, h: ih, src: img.src, name: "Slide" }));
  texts.forEach((t, i) => objs.push(makeNote({ x: 30 + (iw ? iw + 40 : 0) + (i % cols) * (nw + 20), y: 40 + Math.floor(i / cols) * 200, w: nw, h: 180, color: NOTE_COLORS[i % 7].value, text: t.slice(0, 200) })));
  b.objects = objs;
  loadBoard(b, null);
  await saveNow().catch(() => {});
  toast("Expanded to a whiteboard. Add ideas all around it.");
  return true;
}
function startTimer(min) {
  clearInterval(timer.id);
  if (!min) { timer = { end: 0, left: 0, id: 0, total: 0, running: false }; stopMusic(); drawTimer(); return; }
  timer = { end: Date.now() + min * 60000, total: min * 60000, left: min * 60000, id: 0, running: true };
  $("#wbTimer").classList.remove("done");
  drawTimer(); timer.id = setInterval(tickTimer, 250);
  playMusic();
}
function pauseTimer() {
  if (!timer.total) return;
  if (timer.running) { timer.left = Math.max(0, timer.end - Date.now()); timer.running = false; clearInterval(timer.id); stopMusic(); }
  else if (timer.left > 0) { timer.end = Date.now() + timer.left; timer.running = true; timer.id = setInterval(tickTimer, 250); playMusic(); }
  else { startTimer(timer.total / 60000); return; }
  drawTimer();
}
$("#wbTimerStop").addEventListener("click", () => startTimer(0));
$("#wbTimerPause").addEventListener("click", pauseTimer);
$("#wbTimerReset").addEventListener("click", () => { if (timer.total) startTimer(timer.total / 60000); });

/* ------------------------------------------------------------------ the editor frame (shared shell) */
function selectedTexty() { return board().objects.filter((o) => state.sel.has(o.id) && TEXTY.has(o.type) && !o.locked); }
async function newBoardFromMenu() { finishEdit(); if (!state.saved && board().objects.length) await saveNow().catch(() => {}); startNewBoard(false); toast("New whiteboard"); }
// Insert adapter + draw tools for the shared left-rail panels (Elements, Text, Tools): native board objects.
const kitDeps = {
  get state() { return state; }, board, change, setSel, setTool, placeAtCenter, toWorld, viewSize, toast, find, finishEdit, loadElements, undo,
  fontReady: (family, bold, italic) => ensureFont(family, bold, italic).then(() => { for (const c of cache.values()) c.sig = null; requestRender(); }).catch(() => {}),
};
const kitInsert = makeWhiteboardInsert(kitDeps), kitDraw = makeWhiteboardDraw(kitDeps);
/** Brand panel › Apply brand to the whole board: the board's main shape colours (most used first) become the brand
 *  colours, big text gets the heading font and other text the body font. Sticky notes keep their note colours. */
function applyBrandToBoard(kit = {}) {
  if (state.mode !== "edit") { toast("Switch to Editing to change the board."); return false; }
  const cols = (kit.colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c) && !/^#(?:f{6}|0{6})$/i.test(c));
  const neutral = (c) => { if (!/^#[0-9a-f]{6}$/i.test(c || "")) return true; const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return Math.max(r, g, b) - Math.min(r, g, b) < 24; };
  const shapes = board().objects.filter((o) => o.type === "shape" && !o.cell && !o.locked);
  const count = new Map();
  for (const o of shapes) if (!neutral(o.fill)) count.set(o.fill.toLowerCase(), (count.get(o.fill.toLowerCase()) || 0) + 1);
  const map = new Map([...count.entries()].sort((a, b) => b[1] - a[1]).map(([c], i) => [c, cols.length ? cols[i % cols.length] : c]));
  const texts = board().objects.filter((o) => TEXTY.has(o.type) && !o.locked);
  const big = Math.max(0, ...board().objects.filter((o) => o.type === "text").map((o) => o.size || 0));
  const fam = (f) => (["sans", "serif", "mono", "calibri", "cambria"].includes(f) ? f : null), head = fam(kit.fonts?.heading), body = fam(kit.fonts?.body);
  change(() => {
    for (const o of shapes) { const to = map.get((o.fill || "").toLowerCase()); if (to) { if (o.stroke && o.stroke.toLowerCase() === o.fill.toLowerCase()) o.stroke = to; o.fill = to; } }
    for (const o of texts) { const f = o.type === "text" && (o.size || 0) >= big * 0.6 ? head : body; if (f) { o.font = f; normalizeObject(o); } }
  });
  for (const f of new Set([head, body].filter(Boolean))) ensureFont(f).then(() => { for (const c of cache.values()) c.sig = null; requestRender(); }).catch(() => {});
  toast(`Brand applied: ${map.size} colour${map.size === 1 ? "" : "s"} and the brand fonts.`);
  return true;
}
async function mountFrame() {
  let mod = null;
  try { mod = await importModule("../shared/editor-shell.js"); } catch { return null; }
  if (typeof mod?.mountShell !== "function") return null;
  let gallery = null;
  try { gallery = await import("./gallery.js"); } catch (e) { console.warn(e); }
  try {
    shell = mod.mountShell({
      app: "whiteboard", kind: "Whiteboard", timerKeys: true, title: board().name || "Untitled board", home: "/tools/whiteboard",
      onTitle: (t) => { const v = String(t || "").trim().slice(0, 120) || "Untitled board"; board().name = v; $("#boardName").value = v; document.title = `${v} | Whiteboard | AsaanDesk`; scheduleSave(); },
      stage: $("#work"), toolbar: propsEl, formulaBar: null,
      resize: { label: "Resize", open: () => openConvert() },
      shortcuts: SHORTCUTS,
      file: [
        { label: "New whiteboard", act: newBoardFromMenu },
        { label: "Convert to presentation", group: "Convert", act: () => convertBoard("slides") },
        { label: "Convert to doc", group: "Convert", act: () => convertBoard("doc") },
        { label: "Your boards…", act: () => $("#boardsBtn").click() },
        { label: "Open board file…", act: () => $("#openFileInput").click() },
        { label: "Save board file", act: () => $("#saveFileBtn").click() },
        { label: "Download PNG", group: "Download", act: () => downloadAs("png") },
        { label: "Download JPG", group: "Download", act: () => downloadAs("jpg") },
        { label: "Download PDF", group: "Download", act: () => downloadAs("pdf") },
        { label: "Download SVG", group: "Download", act: () => downloadAs("svg") },
        { label: "Export a section…", group: "Download", act: () => openExport(board().objects.find((o) => state.sel.has(o.id) && o.type === "frame")?.id || "") },
        { label: "Undo", group: "Edit", act: undo },
        { label: "Redo", group: "Edit", act: redo },
        { label: "Select all", group: "Edit", act: () => setSel(board().objects.map((o) => o.id)) },
        { label: "Fit the board on screen", group: "View", act: fit },
        { label: "Show or hide the mini map", group: "View", act: () => $("#mapBtn").click() },
      ],
      share: { download: [{ label: "PNG", act: () => downloadAs("png") }, { label: "JPG", act: () => downloadAs("jpg") }, { label: "PDF", act: () => downloadAs("pdf") }, { label: "SVG", act: () => downloadAs("svg") }], link: () => location.href },
      templates: gallery ? { gallery, tool: "whiteboard", apply: async (id) => { useTemplate(id); try { shell?.pushRecent?.(id); } catch {} }, placeholder: "Search Whiteboard templates", blank: () => newBoardFromMenu(), blankLabel: "Create a blank whiteboard" } : null,
      panels: { elements: { render: (el) => renderElementsPanel(el), kitLabel: "Whiteboard" }, text: (el) => renderTextPanel(el), tools: (el) => renderToolsPanel(el) },
      rail: ["templates", "elements", "text", "brand", "uploads", "tools", "projects", "apps", "translate"],
      insert: {
        ...kitInsert,
        text: (spec, pt) => (typeof spec === "string" ? addElement(pt === "heading" || pt === "h1" ? "heading" : pt === "subheading" || pt === "h2" ? "subheading" : "body", { text: spec || "Text" }) : kitInsert.text(spec, pt)),
        color: (hex) => {
          const sel = board().objects.filter((o) => state.sel.has(o.id) && !o.locked);
          if (!sel.length) { state.noteColor = hex; addElement("shape", { fill: hex, stroke: hex }); return; }
          change(() => sel.forEach((o) => { if (o.type === "note") o.color = hex; else if (o.type === "shape" || o.type === "frame") o.fill = hex; else if (o.type === "text") o.color = hex; else if (o.type === "connector") o.stroke = hex; else if (o.type === "stroke") o.color = hex; }));
        },
        font: (family) => { const sel = selectedTexty(); if (!sel.length) { toast("Select a text, note or shape first."); return; } change(() => sel.forEach((o) => { o.font = family; normalizeObject(o); })); ensureFont(family).then(() => { for (const c of cache.values()) c.sig = null; requestRender(); }).catch(() => {}); },
      },
      draw: kitDraw,
      applyBrand: (kit) => applyBrandToBoard(kit || loadBrandKit()),
      getText: () => { const sel = selectedTexty(); return (sel.length ? sel : board().objects.filter((o) => TEXTY.has(o.type))).map((o) => o.text || "").filter(Boolean).join("\n"); },
      setText: (str) => {
        const sel = selectedTexty(), list = (sel.length ? sel : board().objects.filter((o) => TEXTY.has(o.type))).filter((o) => o.text), lines = String(str || "").split("\n");
        if (list.length === 1) change(() => { list[0].text = String(str); normalizeObject(list[0]); });
        else if (list.length && lines.length === list.length) change(() => list.forEach((o, i) => { o.text = lines[i]; normalizeObject(o); }));
        else if (list.length) { change(() => { list[0].text = String(str); normalizeObject(list[0]); }); }
      },
      projects: {
        save: async () => { await saveNow(); return { id: state.boardId, name: board().name, data: boardToJSON(board()), thumb: thumbOf() }; },
        open: async (rec) => { try { const p = rec?.data ? rec : await getProject(rec?.id); loadBoard(parseBoard(p.data), p.id || null); if (p.id) lsSet(LAST_KEY, p.id); setSaveState("Saved"); } catch (e) { toast(e.message || "That board could not be opened."); } },
      },
      bottom: {
        notes: true, outline: null, timer: true, fullscreen: true, help: true,
        // Pages = the board's sections: jump to one, add one, see them all in the grid view.
        pages: {
          count: () => Math.max(1, sectionList().length),
          current: () => currentSection(),
          go: (i) => goSection(i),
          add: () => { addElement("section"); toast("Section added"); },
          thumb: (i) => sectionThumb(i),
        },
        zoom: { get: () => Math.round(state.cam.z * 100), set: (pct) => { const v = viewSize(); zoomAt(v.w / 2, v.h / 2, clamp(pct, 10, 1600) / 100); }, min: 10, max: 1600 },
      },
      setMode: (mode) => {
        state.mode = mode === "comment" || mode === "view" ? mode : "edit";
        document.body.dataset.mode = state.mode;
        if (state.mode !== "edit") { finishEdit(); setTool("select"); setSel([]); toast(state.mode === "view" ? "Viewing: the board can't be changed." : "Commenting: add comments, the board stays as it is."); }
      },
    });
    document.body.classList.add("has-shell");
    window.addEventListener("resize", () => applyCam());
    requestAnimationFrame(() => applyCam());
    return shell;
  } catch (e) {
    console.error("The editor frame could not start", e);
    shell = null;
    return null;
  }
}

/* ------------------------------------------------------------------ test hooks */
window.adApp = {
  state, hist,
  get board() { return state.board; },
  toJSON: () => boardToJSON(board()),
  load(json) { loadBoard(parseBoard(json), state.boardId); changed(); },
  exportPng: async (opts) => (await exportPng(opts)).bytes,
  exportPngInfo: exportPng,
  exportSvg, exportPdf,
  exportBounds: (opts) => exportScope(board(), opts).rect,
  route: (id) => { const o = find(id); return o ? routeConnector(o, byId()).points : null; },
  toScreen: (x, y) => { const p = toScreen(x, y), v = viewSize(); return { x: p.x + v.left, y: p.y + v.top }; },
  toWorld, setTool, select: (ids) => setSel(ids), applyTemplate: useTemplate, saveNow, undo, redo, fit, zoomToRect,
  downloadAs, get shell() { return shell; }, get lastCopiedText() { return lastCopiedText; }, sortNotes, copyAsText, addElement: (kind, opt) => addElement(kind, opt), zoomTo: (pct) => { const v = viewSize(); zoomAt(v.w / 2, v.h / 2, pct / 100); },
  get saved() { return state.saved; },
  /** The shared panels' insert adapter and draw tools (see insert.js). */
  insert: kitInsert, draw: kitDraw, applyBrand: (kit) => applyBrandToBoard(kit || loadBrandKit()),
};

/* ------------------------------------------------------------------ start */
async function init() {
  timerMusic.style = MUSIC_STYLES.some((s) => s.id === lsGet("asaandesk-whiteboard-music")) ? lsGet("asaandesk-whiteboard-music") : "";
  if (lsGet("asaandesk-whiteboard-map") === "0") { state.showMap = false; document.body.classList.add("no-map"); $("#mapBtn").setAttribute("aria-pressed", "false"); }
  boardEl.append(rotLabel, youCursor);
  await mountFrame();
  const params = new URLSearchParams(location.search);
  let handedOff = false;
  if (params.get("handoff")) {
    try { const { takeHandoff } = await import("../shared/store.js"); handedOff = await openFromHandoff(await takeHandoff(params.get("handoff"))); } catch (e) { console.warn("Could not open the design", e); }
    if (!handedOff) toast("That design link has already been used or has expired.");
  }
  const tplId = params.get("template"), fresh = handedOff || params.get("new") === "1" || (!!tplId && !params.get("board"));
  const id = fresh ? null : params.get("board") || lsGet(LAST_KEY);
  if (id) {
    try { const p = await getProject(id); if (p && p.app === "whiteboard") { loadBoard(parseBoard(p.data), id); setSaveState("Saved"); } } catch (e) { console.warn("Could not open the saved board", e); }
  }
  if (!state.boardId && !handedOff) loadBoard(newBoard(), null);
  if (tplId && templateById(tplId)) {
    if (fresh) { board().name = templateById(tplId).name; $("#boardName").value = board().name; try { shell?.setTitle?.(board().name); } catch {} }
    useTemplate(tplId, { fresh });
    try { shell?.pushRecent?.(tplId); } catch {}
  } else if (tplId) toast("That template was not found. Here is a blank board.");
  renderProps();
  window.adApp.ready = true;
  document.body.classList.add("ready");
  // Load the open fonts in the background so text looks the same as in the exports.
  const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  idle(() => { Promise.all([ensureFont("sans", false), ensureFont("sans", true)]).then(() => { for (const c of cache.values()) c.sig = null; requestRender(); }).catch(() => {}); });
}
applyCam();
init();
