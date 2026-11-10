// AsaanDesk Whiteboard: infinite board with notes, shapes, connectors, pen, frames, images, stickers,
// templates, PNG/SVG/PDF export and autosave (IndexedDB, this browser only).
import { normRect, routeConnector, unionRect, strokePath, smoothPoints, rectsIntersect, pointAlong } from "./geometry.js";
import { objectPrims, objectBounds, primsToSvg, drawPrimsCanvas, noteLayout, shapeLayout, textLayout, LINE } from "./render.js";
import {
  newBoard, makeNote, makeText, makeShape, makeFrame, makeConnector, makeStroke, makeImage, makeSticker, byIdOf, hitTest,
  expandGroups, frameChildren, objectsInRect, selectionBounds, moveObjects, resizeObject, normalizeObject, deleteObjects,
  copyObjects, pasteObjects, duplicateObjects, groupObjects, ungroupObjects, setLocked, reorder, alignObjects, strokesNear,
  History, parseBoard, boardToJSON, newId, NOTE_COLORS, INK_COLORS, HIGHLIGHT_COLORS, FILL_COLORS, SHAPE_KINDS, FORMAT,
} from "./model.js";
import { TEMPLATES, applyTemplate, templatePreviewSvg, templateBounds } from "./templates.js";
import { exportScope, boardToSvg, exportPdf as writePdf, fileBase } from "./exporters.js";
import { saveProject, listProjects, getProject, deleteProject } from "../shared/store.js";
import { ensureFont } from "../shared/brand.js";

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
  editing: null, space: false, saved: true, saving: false, panel: null, showMap: true,
};
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
  renderSelection();
  if (state.editing) positionEditor();
  scheduleMinimap();
}
function zoomAt(sx, sy, z) {
  const c = state.cam, nz = clamp(z, 0.1, 4);
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
  if (o.type === "image") return `${o.id}|${o.x}|${o.y}|${o.w}|${o.h}|${o.src.length}`;
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
    const b = o.type === "frame" ? { x: o.x, y: o.y, w: o.w, h: o.h } : objectBounds(o, m);
    selEl.append(svgEl("rect", { x: b.x - 3 / z, y: b.y - 3 / z, width: b.w + 6 / z, height: b.h + 6 / z, fill: "none", stroke: o.locked ? "#9aa1b5" : "#5b4cf0", "stroke-width": sw, "stroke-dasharray": ids.size > 1 || o.locked ? "5 4" : "none", rx: 4 / z }));
    if (o.locked) {
      const lx = b.x + b.w - 8 / z, ly = b.y - 18 / z, s = 1 / z;
      const g = svgEl("g", { transform: `translate(${lx} ${ly}) scale(${s})` });
      g.append(svgEl("rect", { x: -9, y: -2, width: 18, height: 16, rx: 4, fill: "#5b4cf0" }), svgEl("path", { d: "M-4 5V2a4 4 0 0 1 8 0v3M-5 5h10v7h-10z", fill: "none", stroke: "#fff", "stroke-width": 1.6 }));
      selEl.append(g);
    }
  }
  if (list.length === 1 && list[0].type !== "connector" && !list[0].locked) {
    const o = list[0];
    const handles = o.type === "text" ? ["w", "e"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    for (const h of handles) {
      const x = o.x + (h.includes("w") ? 0 : h.includes("e") ? o.w : o.w / 2), y = o.y + (h.includes("n") ? 0 : h.includes("s") ? o.h : o.h / 2);
      selEl.append(svgEl("rect", { x: x - hs / 2, y: y - hs / 2, width: hs, height: hs, rx: 2 / z, fill: "#fff", stroke: "#5b4cf0", "stroke-width": 1.5, "data-handle": h }));
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
function setSaveState(t) { $("#saveState").textContent = t; }
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
  if (!state.boardId) state.boardId = newId();
  state.saving = true;
  try {
    await saveProject({ id: state.boardId, app: "whiteboard", name: board().name, data: boardToJSON(board()), thumb: thumbOf() });
    state.saved = true;
    lsSet(LAST_KEY, state.boardId);
    try { const u = new URL(location.href); if (u.searchParams.get("board") !== state.boardId) { u.searchParams.set("board", state.boardId); history.replaceState(null, "", u); } } catch {}
    setSaveState("Saved");
  } finally { state.saving = false; }
}
function loadBoard(b, id = null) {
  finishEdit();
  state.board = b; state.boardId = id; state.sel = new Set(); hist.clear();
  for (const [, c] of cache) c.g.remove();
  cache.clear();
  $("#boardName").value = b.name;
  document.title = `${b.name} | Whiteboard | AsaanDesk`;
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
};
const swatch = (attr, value, on, label) => `<button type="button" class="swatch${value === "none" ? " none" : ""}${on ? " on" : ""}" ${attr}="${value}" style="background:${value === "none" ? "#fff" : value}" aria-label="${label || value}" title="${label || value}" aria-pressed="${on}"></button>`;
const pbtn = (act, html, label, extra = "") => `<button type="button" class="pbtn${extra}" data-act="${act}" aria-label="${label}" title="${label}">${html}</button>`;
const SEP = '<span class="sep" aria-hidden="true"></span>';
const SHAPE_ICON = {
  rect: '<rect x="4" y="6" width="16" height="12"/>', rounded: '<rect x="4" y="6" width="16" height="12" rx="4"/>', ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>',
  diamond: '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/>', triangle: '<path d="M12 4l8.5 15h-17z"/>', star: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"/>',
};
let propsSig = "";
function renderProps() {
  const t = state.tool, sel = board().objects.filter((o) => state.sel.has(o.id));
  const sig = JSON.stringify([t, state.shapeKind, state.lineKind, state.ink[t] || null, state.noteColor, sel.map((o) => [o.id, o.type, o.color, o.fill, o.stroke, o.size, o.bold, o.align, o.kind, o.arrow, o.locked, o.group, o.tool, o.element?.colors?.c1])]);
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
    if (only("note")) h += NOTE_COLORS.map((c) => swatch("data-set-note", c.value, sel.every((o) => o.color === c.value), c.name)).join("") + SEP;
    if (only("shape")) h += `<span class="lbl">Fill</span>` + FILL_COLORS.slice(0, 13).map((c) => swatch("data-set-fill", c, sel.every((o) => o.fill === c))).join("") + SEP + `<span class="lbl">Border</span>` + ["#5b4cf0", "#1b2133", "#14b8a6", "#f43f5e", "none"].map((c) => swatch("data-set-stroke", c, sel.every((o) => o.stroke === c))).join("") + SEP;
    if (only("shape") || only("text")) {
      const size = sel[0].size;
      h += pbtn("smaller", "A−", "Smaller text") + `<span class="size" aria-label="Text size">${size}</span>` + pbtn("bigger", "A+", "Bigger text") + pbtn("bold", ICONS.bold, "Bold", sel.every((o) => o.bold) ? " on" : "");
      if (only("text")) h += INK_COLORS.slice(0, 8).map((c) => swatch("data-set-textcolor", c, sel.every((o) => o.color === c))).join("") + `<select data-set-align aria-label="Text alignment"><option value="left"${one?.align === "left" ? " selected" : ""}>Left</option><option value="center"${one?.align === "center" ? " selected" : ""}>Centre</option><option value="right"${one?.align === "right" ? " selected" : ""}>Right</option></select>`;
      h += SEP;
    }
    if (only("connector")) {
      const c = sel[0];
      h += ["#334155", "#5b4cf0", "#2f80ff", "#14b8a6", "#f59e0b", "#f43f5e"].map((v) => swatch("data-set-linecolor", v, sel.every((o) => o.stroke === v))).join("") + SEP +
        `<button type="button" class="pbtn${c.kind !== "elbow" ? " on" : ""}" data-set-kind="straight">Straight</button><button type="button" class="pbtn${c.kind === "elbow" ? " on" : ""}" data-set-kind="elbow">Elbow</button>` +
        `<select data-set-arrow aria-label="Arrow heads"><option value="end"${(c.arrow ?? "end") === "end" ? " selected" : ""}>Arrow at end</option><option value="both"${c.arrow === "both" ? " selected" : ""}>Arrows both ends</option><option value="none"${c.arrow === "none" ? " selected" : ""}>No arrows</option></select>` + SEP;
    }
    if (only("stroke")) h += (sel[0].tool === "highlighter" ? HIGHLIGHT_COLORS : INK_COLORS).map((c) => swatch("data-set-strokecolor", c, sel.every((o) => o.color === c))).join("") + SEP;
    if (only("sticker") && one?.element?.parts?.some((p) => /^\$/.test(p.fill || "") || /^\$/.test(p.stroke || ""))) h += `<span class="lbl">Colour</span>` + ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#1b2133"].map((c) => swatch("data-set-sticker", c, one.element.colors?.c1 === c)).join("") + SEP;
    if (one && ["note", "shape", "text", "frame", "connector"].includes(one.type)) h += pbtn("edit", ICONS.edit + (one.type === "frame" ? "Rename" : "Text"), one.type === "frame" ? "Rename frame" : "Edit text");
    if (one?.type === "frame") h += pbtn("exportframe", "Export frame", "Export this frame");
    h += pbtn("duplicate", ICONS.dup, "Duplicate (Ctrl+D)") + pbtn(sel.every((o) => o.locked) ? "unlock" : "lock", sel.every((o) => o.locked) ? ICONS.unlock : ICONS.lock, sel.every((o) => o.locked) ? "Unlock" : "Lock") +
      pbtn("front", ICONS.front, "Bring to front (Ctrl+])") + pbtn("back", ICONS.back, "Send to back (Ctrl+[)");
    if (sel.length > 1) {
      const grouped = sel.every((o) => o.group && o.group === sel[0].group);
      h += pbtn(grouped ? "ungroup" : "group", ICONS.group + (grouped ? "Ungroup" : "Group"), grouped ? "Ungroup (Ctrl+Shift+G)" : "Group (Ctrl+G)");
      h += `<select data-align aria-label="Align"><option value="">Align…</option><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>${sel.length > 2 ? '<option value="hspace">Space across</option><option value="vspace">Space down</option>' : ""}</select>`;
    }
    h += pbtn("delete", ICONS.del, "Delete (Del)", " danger");
  }
  propsEl.innerHTML = h;
  propsEl.hidden = !h;
}
propsEl.addEventListener("pointerdown", (e) => { if (!e.target.closest("select")) e.preventDefault(); }); // keep text editing / focus on the board
propsEl.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
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
  else if (d.setTextcolor) edit((o) => { o.color = d.setTextcolor; });
  else if (d.setLinecolor) edit((o) => { o.stroke = d.setLinecolor; });
  else if (d.setKind) edit((o) => { o.kind = d.setKind; });
  else if (d.setStrokecolor) edit((o) => { o.color = d.setStrokecolor; });
  else if (d.setSticker) edit((o) => { o.element = { ...o.element, colors: { ...o.element.colors, c1: d.setSticker } }; });
  else if (d.act) action(d.act, ids);
});
propsEl.addEventListener("change", (e) => {
  const s = e.target;
  const sel = board().objects.filter((o) => state.sel.has(o.id) && !o.locked);
  if (s.matches("[data-align]") && s.value) { change(() => alignObjects(board(), new Set(sel.map((o) => o.id)), s.value)); renderProps(); }
  else if (s.matches("[data-set-arrow]")) { change(() => sel.forEach((o) => { o.arrow = s.value; })); renderProps(); }
  else if (s.matches("[data-set-align]")) { change(() => sel.forEach((o) => { o.align = s.value; })); renderProps(); }
  boardEl.focus({ preventScroll: true });
});
function action(act, ids = new Set([...state.sel])) {
  const all = new Set([...state.sel]);
  switch (act) {
    case "duplicate": if (all.size) { const n = change(() => duplicateObjects(board(), all)); setSel(n); toast("Duplicated"); } break;
    case "delete": deleteSelection(); break;
    case "lock": if (all.size) { change(() => setLocked(board(), all, true)); toast("Locked: it can't be moved or changed until you unlock it"); } break;
    case "unlock": if (all.size) change(() => setLocked(board(), all, false)); break;
    case "front": case "back": case "forward": case "backward": if (all.size) change(() => reorder(board(), all, act)); break;
    case "group": if (ids.size > 1) { change(() => groupObjects(board(), ids)); toast("Grouped"); } break;
    case "ungroup": if (ids.size) change(() => ungroupObjects(board(), ids)); break;
    case "bigger": case "smaller": change(() => board().objects.forEach((o) => { if (ids.has(o.id) && o.size) { o.size = clamp(o.size + (act === "bigger" ? (o.size >= 24 ? 4 : 2) : (o.size > 24 ? -4 : -2)), 8, 120); normalizeObject(o); } })); break;
    case "bold": { const on = !board().objects.filter((o) => ids.has(o.id)).every((o) => o.bold); change(() => board().objects.forEach((o) => { if (ids.has(o.id)) { o.bold = on; normalizeObject(o); } })); break; }
    case "edit": { const o = find([...all][0]); if (o) startEdit(o); break; }
    case "exportframe": { const o = find([...all][0]); if (o) openExport(o.id); break; }
  }
  renderProps();
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
function addNoteAtCenter() { const c = viewCenter(); const o = makeNote({ x: c.x - 100, y: c.y - 100, color: state.noteColor }); addObjects([o]); startEdit(o); }

/* ------------------------------------------------------------------ text editing */
function editBox(o) {
  if (o.type === "note") { const L = noteLayout(o); return { box: L.box, size: L.size, lines: L.lines.length, align: "center", color: o.textColor, bold: false, valign: true }; }
  if (o.type === "shape") { const L = shapeLayout(o); return { box: L.box, size: L.size, lines: L.lines.length, align: "center", color: o.textColor, bold: o.bold, valign: true }; }
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
    background: o.type === "connector" ? "#fff" : "transparent",
  });
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
  if (e.button === 1 || state.space || t === "hand") {
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
        else act = { type: "resize", id: o.id, handle: k, start: w, orig: { x: o.x, y: o.y, w: o.w, h: o.h, points: o.points }, moved: false };
        return;
      }
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
      const z = clamp(c0.z * (p.d / act.start.d), 0.1, 4);
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
      requestRender();
      break;
    }
    case "resize": {
      const o = find(act.id), r = act.orig, h = act.handle;
      if (!o) return;
      if (!act.moved) { checkpoint(); act.moved = true; }
      const dx = w.x - act.start.x, dy = w.y - act.start.y;
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
    case "resize": case "endpoint": if (a.moved) changed(); drawPreview(null); break;
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
      addObjects([s], { select: false });
      break;
    }
    case "erase": if (a.removed) changed(); break;
  }
}
boardEl.addEventListener("pointerup", endGesture);
boardEl.addEventListener("pointercancel", endGesture);
boardEl.addEventListener("dblclick", (e) => {
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
const TOOL_KEYS = { v: "select", h: "hand", n: "note", t: "text", s: "shape", c: "connector", p: "pen", m: "highlighter", e: "eraser", f: "frame" };
window.addEventListener("keydown", (e) => {
  if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
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
  if (mod && k === "c") { copySelection(); return; }
  if (mod && k === "x") { if (copySelection()) deleteSelection(); return; }
  if (mod && k === "v") { pasteSoon(); return; }
  if (mod) return;
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); return; }
  if (e.key === "Escape") { if (state.sel.size) setSel([]); else setTool("select"); closeSide(); return; }
  if (e.key === "Enter" && state.sel.size === 1) { e.preventDefault(); startEdit(find([...state.sel][0])); return; }
  if (e.key.startsWith("Arrow") && state.sel.size) {
    e.preventDefault();
    const s = e.shiftKey ? 10 : 1, d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    change(() => moveObjects(board(), state.sel, d[0], d[1]));
    return;
  }
  if (e.key === "+" || e.key === "=") { zoomBy(1.2); return; }
  if (e.key === "-" || e.key === "_") { zoomBy(1 / 1.2); return; }
  if (e.key === "!" || (e.shiftKey && e.code === "Digit1")) { fit(); return; }
  if (TOOL_KEYS[k] && !e.altKey) setTool(TOOL_KEYS[k]);
});
window.addEventListener("keyup", (e) => { if (e.key === " ") { state.space = false; document.body.classList.remove("space"); } });
window.addEventListener("blur", () => { state.space = false; document.body.classList.remove("space"); });

/* ------------------------------------------------------------------ clipboard */
const CLIP_MARK = "ASAANDESK-BOARD:";
let clip = null, pasteTimer = 0, pasteCount = 0;
function copySelection() {
  if (!state.sel.size) return false;
  clip = copyObjects(board(), state.sel);
  pasteCount = 0;
  try { navigator.clipboard?.writeText?.(CLIP_MARK + JSON.stringify(clip)).catch(() => {}); } catch {}
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
  const data = copyObjects(board(), state.sel);
  try { e.clipboardData?.setData("text/plain", CLIP_MARK + JSON.stringify(data)); e.preventDefault(); } catch {}
});
document.addEventListener("paste", async (e) => {
  if (isTyping(e.target)) return;
  const dt = e.clipboardData;
  const file = [...(dt?.files || [])].find((f) => f.type.startsWith("image/"));
  if (file) { clearTimeout(pasteTimer); e.preventDefault(); await addImageFile(file); return; }
  const text = dt?.getData("text/plain") || "";
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
  if (panel === "templates") renderTemplates(); else renderStickers();
  $("#empty").hidden = true;
}
function closeSide() { if (!state.panel) return; state.panel = null; sideEl.hidden = true; document.body.classList.remove("side-open"); requestRender(); }
$("#sideClose").addEventListener("click", closeSide);
for (const b of sideEl.querySelectorAll("[data-panel]")) b.addEventListener("click", () => openSide(b.dataset.panel));
$("#templatesBtn").addEventListener("click", () => (state.panel === "templates" ? closeSide() : openSide("templates")));
$("#stickerBtn").addEventListener("click", () => (state.panel === "stickers" ? closeSide() : openSide("stickers")));
$("#emptyTemplates").addEventListener("click", () => openSide("templates"));
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
function useTemplate(id) {
  const c = templateSpot(id);
  const ids = change(() => applyTemplate(board(), id, Math.round(c.x), Math.round(c.y)));
  setTool("select");
  setSel(ids);
  if (innerWidth < 641) closeSide();
  const m = byId(), r = unionRect(board().objects.filter((o) => ids.includes(o.id)).map((o) => objectBounds(o, m)));
  zoomToRect(r, state.cam.z);
  toast("Template added. Double-click any text to change it.");
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
  for (const o of objects) drawPrimsCanvas(ctx, objectPrims(o, m), { images });
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
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
async function runExport(btn, kind) {
  if (btn.getAttribute("aria-busy") === "true") return;
  const frameId = $("#exportScope").value || null;
  const f = frameId ? find(frameId) : null;
  const name = fileBase(board().name) + (f ? "-" + fileBase(f.name) : "");
  if (!board().objects.length) { toast("The board is empty. Add something first."); return; }
  btn.setAttribute("aria-busy", "true");
  try {
    if (kind === "png") { const { bytes } = await exportPng({ frameId }); download(bytes, name + ".png", "image/png"); }
    else if (kind === "svg") download(exportSvg({ frameId }), name + ".svg", "image/svg+xml");
    else { toast("Making your PDF…", 1500); download(await exportPdf({ frameId }), name + ".pdf", "application/pdf"); }
    toast(`Downloaded ${name}.${kind}`);
  } catch (err) { console.error(err); toast("Export failed: " + (err.message || err)); }
  finally { btn.removeAttribute("aria-busy"); }
}
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
  get saved() { return state.saved; },
};

/* ------------------------------------------------------------------ start */
async function init() {
  if (lsGet("asaandesk-whiteboard-map") === "0") { state.showMap = false; document.body.classList.add("no-map"); $("#mapBtn").setAttribute("aria-pressed", "false"); }
  const params = new URLSearchParams(location.search);
  const id = params.get("board") || lsGet(LAST_KEY);
  if (id) {
    try { const p = await getProject(id); if (p && p.app === "whiteboard") { loadBoard(parseBoard(p.data), id); setSaveState("Saved"); } } catch (e) { console.warn("Could not open the saved board", e); }
  }
  if (!state.boardId) loadBoard(newBoard(), null);
  if (params.get("template")) useTemplate(params.get("template"));
  renderProps();
  window.adApp.ready = true;
  document.body.classList.add("ready");
  // Load the open fonts in the background so text looks the same as in the exports.
  const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  idle(() => { Promise.all([ensureFont("sans", false), ensureFont("sans", true)]).then(() => { for (const c of cache.values()) c.sig = null; requestRender(); }).catch(() => {}); });
}
applyCam();
init();
