// AsaanDesk Draw: bitmap painting with layers, brushes, pen pressure, fill, shapes and text. Everything runs in the
// browser and is saved only on this device (IndexedDB). Pixel maths lives in paint.js, undo in history.js.
import { BRUSHES, Stroke, stampMask, applyMask, clearMask, smudgeDab, floodFill, growMask, fillMask, composite, hexToRgb, rgbToHex, normHex, pushRecent, clamp, unionRect, anchorOffset, drawingColors } from "./paint.js";
import { History, rectTileKeys, tileRect, copyRegion, makeTiles } from "./history.js";
import { nextLayerName, insertAt, removeAt, moveItem, afterDelete } from "./layers.js";
import { serializeDrawing, parseDrawing, PRESETS, clampSize, slugName, FILE_EXT } from "./fileformat.js";
import { saveProject, listProjects, getProject, deleteProject, uid, putHandoff } from "../shared/store.js";
import { recognise, shapeBounds, tracePath, SHAPE_NAMES } from "./shapes-assist.js";
import { loadBrand, FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { TEMPLATES as GALLERY, templateById, svg as templateSvg, parts as templateParts, thumb as templateThumb } from "./gallery.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const TOOLS = [...Object.keys(BRUSHES), "fill", "shape", "text", "picker", "move", "hand"];
const LABEL = { ...Object.fromEntries(Object.entries(BRUSHES).map(([k, b]) => [k, b.label])), fill: "Paint bucket", shape: "Shapes", text: "Text", picker: "Colour picker", move: "Select and move", hand: "Move the view" };
const HINT = {
  pencil: "Light, grainy lines, like a real pencil.",
  pen: "Smooth ink. With a stylus, press harder for thicker lines.",
  marker: "See-through ink. One stroke does not get darker where it crosses itself.",
  glow: "A glowing line: bright in the middle, soft colour around it. Looks best on dark paper.",
  highlighter: "A flat, see-through tip for marking things, like a highlighter pen.",
  airbrush: "Soft spray. Go over an area again to build up colour.",
  calligraphy: "A flat nib: lines turn thick or thin with the direction.",
  smudge: "Drag to blend and push colours around.",
  eraser: "Rubs out paint on the selected layer.",
  fill: "Tap inside an area to fill it. A bigger colour range also fills similar colours.",
  shape: "Drag to draw. Hold Shift for a square, a circle or a straight line.",
  text: "Tap where the text should go, type, then press Enter.",
  picker: "Tap the drawing to take its colour. Tip: hold Alt while painting.",
  move: "Leaves drawing mode. Drag to move what is on the selected layer (hold Shift to keep it straight); pick a brush to draw again.",
  hand: "Drag to move around. Pinch or use the mouse wheel to zoom.",
};
const SETTINGS_KEY = "asaandesk-draw-settings", RECENT_KEY = "asaandesk-draw-recent";
const MINZ = 0.05, MAXZ = 32;

/* ---------- state ---------- */
function defaultSettings() {
  const s = {};
  for (const [id, b] of Object.entries(BRUSHES)) s[id] = { size: b.size, opacity: b.opacity, smoothing: b.smoothing ?? 0 };
  s.fill = { opacity: 1, tolerance: 32, sampleAll: false };
  s.shape = { size: 6, opacity: 1, kind: "rect", fill: false };
  s.text = { size: 64, opacity: 1, font: "sans", bold: false };
  return s;
}
function loadSettings() {
  const d = defaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || {};
    for (const k of Object.keys(d)) if (saved[k] && typeof saved[k] === "object") d[k] = { ...d[k], ...saved[k] };
  } catch {}
  return d;
}
const state = {
  doc: null, tool: "pen", lastBrush: "pen", color: "#1f2937", recent: [], settings: loadSettings(),
  cam: { zoom: 1, x: 0, y: 0, fitted: true }, saveStatus: "saved", ready: false, penSeen: false,
  shapeAssist: false, lastShape: null,
};
// Shape assist (Canva Draw): rough lines, boxes, circles and triangles become clean shapes. Saved per browser.
const ASSIST_KEY = "asaandesk-draw-shape-assist";
const ASSIST_TOOLS = new Set(["pencil", "pen", "marker", "highlighter", "calligraphy"]);
try { state.shapeAssist = localStorage.getItem(ASSIST_KEY) === "1"; } catch {}
const history = new History();
try { state.recent = (JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") || []).map(normHex).filter(Boolean).slice(0, 12); } catch {}
const brand = loadBrand();
let shell = null, framePanel = null, pillColor = null; // the shared editor frame (../shared/editor-shell.js), when it loads
if (FONT_FAMILIES[brand.fonts?.heading] && !localStorage.getItem(SETTINGS_KEY)) state.settings.text.font = brand.fonts.heading;

/* ---------- elements ---------- */
const stage = $("#stage"), view = $("#view"), vctx = view.getContext("2d");
const textInput = $("#textInput"), toastEl = $("#toast");
const toolBtns = $$(".tool[data-tool]");
const sizeRange = $("#sizeRange"), opacityRange = $("#opacityRange"), smoothRange = $("#smoothRange"), tolRange = $("#tolRange");
const colorInput = $("#colorInput"), colorHex = $("#colorHex");
const layerList = $("#layerList"), layerOpacity = $("#layerOpacity");

/* ---------- small helpers ---------- */
let toastTimer = null;
function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800); }
const openDialog = (d) => { if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); };
const closeDialog = (d) => { if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); };
const isTyping = (t) => !!t && (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable || (t.tagName === "INPUT" && !["range", "checkbox", "radio", "color", "button"].includes(t.type)));
const fontCss = (f) => (FONT_FAMILIES[f] || FONT_FAMILIES.sans).css;
const makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const activeIndex = () => state.doc.layers.indexOf(state.doc.active);
const activeLayer = () => state.doc.active;
let layerSeq = 0;
function makeLayer(name, w = state.doc.w, h = state.doc.h) {
  const canvas = makeCanvas(w, h);
  return { id: "L" + ++layerSeq + Math.random().toString(36).slice(2, 6), name, opacity: 1, hidden: false, canvas, ctx: canvas.getContext("2d", { willReadFrequently: true }), version: 0, _src: null, _srcVersion: -1 };
}
function canDraw(layer) {
  if (!layer) return false;
  if (layer.hidden) { toast("This layer is hidden. Show it to draw on it."); return false; }
  return true;
}

/* ---------- camera ---------- */
let stageBox = { w: 800, h: 600 };
function stageRect() {
  const r = stage.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width || stageBox.w, height: r.height || stageBox.h };
}
function screenToDoc(cx, cy) { const r = stageRect(), c = state.cam; return { x: (cx - r.left - c.x) / c.zoom, y: (cy - r.top - c.y) / c.zoom }; }
function docToScreen(x, y) { const r = stageRect(), c = state.cam; return { x: r.left + c.x + x * c.zoom, y: r.top + c.y + y * c.zoom }; }
function fit() {
  if (!state.doc) return;
  const r = stageRect(), pad = r.width < 500 ? 14 : 36, d = state.doc;
  const z = clamp(Math.min((r.width - pad * 2) / d.w, (r.height - pad * 2) / d.h), MINZ, 4);
  Object.assign(state.cam, { zoom: z, x: (r.width - d.w * z) / 2, y: (r.height - d.h * z) / 2, fitted: true });
  afterCam();
}
function zoomTo(z, cx, cy) {
  const r = stageRect();
  if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  const p = screenToDoc(cx, cy), c = state.cam;
  c.zoom = clamp(z, MINZ, MAXZ);
  c.x = cx - r.left - p.x * c.zoom; c.y = cy - r.top - p.y * c.zoom; c.fitted = false;
  afterCam();
}
function afterCam() { $("#zoomPct").textContent = Math.round(state.cam.zoom * 100) + "%"; positionTextInput(); requestRender(); }
function resizeView() {
  const r = stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (r.width && r.height) stageBox = { w: r.width, h: r.height };
  const w = Math.max(1, Math.round(stageBox.w * dpr)), h = Math.max(1, Math.round(stageBox.h * dpr));
  if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
  if (state.cam.fitted) fit(); else requestRender();
}

/* ---------- rendering ---------- */
let renderQueued = false, hover = null, lastPointerType = "mouse", shapeDraft = null;
function requestRender() { if (!renderQueued) { renderQueued = true; requestAnimationFrame(render); } }
function render() {
  renderQueued = false;
  const d = state.doc;
  if (!d) return;
  const dpr = view.width / (stageBox.w || 1), c = state.cam;
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  vctx.clearRect(0, 0, view.width, view.height);
  vctx.setTransform(dpr * c.zoom, 0, 0, dpr * c.zoom, dpr * c.x, dpr * c.y);
  vctx.save();
  vctx.shadowColor = "rgba(27, 33, 51, .18)"; vctx.shadowBlur = 22 * dpr; vctx.shadowOffsetY = 6 * dpr;
  vctx.fillStyle = d.background; vctx.fillRect(0, 0, d.w, d.h);
  vctx.restore();
  vctx.imageSmoothingEnabled = c.zoom < 2;
  for (const l of d.layers) {
    if (l.hidden || l.opacity <= 0) continue;
    vctx.globalAlpha = l.opacity;
    vctx.drawImage(l.canvas, 0, 0);
  }
  vctx.globalAlpha = 1;
  if (shapeDraft) drawShape(vctx, shapeDraft);
  if (hover && BRUSHES[state.tool] && lastPointerType !== "touch" && !pan && !gesture) {
    const r = Math.max(0.5, state.settings[state.tool].size / 2), lw = 1 / c.zoom;
    vctx.lineWidth = lw;
    vctx.strokeStyle = "rgba(0, 0, 0, .55)"; vctx.beginPath(); vctx.arc(hover.x, hover.y, r, 0, Math.PI * 2); vctx.stroke();
    vctx.strokeStyle = "rgba(255, 255, 255, .85)"; vctx.beginPath(); vctx.arc(hover.x, hover.y, r + lw, 0, Math.PI * 2); vctx.stroke();
  }
}

/* ---------- history ---------- */
function pushHistory(e) { history.push(e); updateHistoryButtons(); }
function updateHistoryButtons() { $("#undoBtn").disabled = !history.canUndo; $("#redoBtn").disabled = !history.canRedo; }
const snapLayers = () => ({ list: state.doc.layers.map((l) => ({ l, name: l.name, opacity: l.opacity, hidden: l.hidden })), active: state.doc.active });
function restoreLayers(s) {
  for (const x of s.list) Object.assign(x.l, { name: x.name, opacity: x.opacity, hidden: x.hidden });
  state.doc.layers = s.list.map((x) => x.l);
  state.doc.active = s.active && state.doc.layers.includes(s.active) ? s.active : state.doc.layers.at(-1);
}
function applyEntry(e, side) {
  if (e.kind === "pixels") {
    for (const t of e.tiles) { const img = e.layer.ctx.createImageData(t.w, t.h); img.data.set(t[side]); e.layer.ctx.putImageData(img, t.x, t.y); }
    e.layer.version++; queueThumb(e.layer);
  } else if (e.kind === "layers") restoreLayers(e[side]);
  else if (e.kind === "bg") { state.doc.background = state.doc._savedBg = e[side]; $("#bgColor").value = e[side]; }
  else if (e.kind === "resize") {
    const s = e[side];
    for (const x of s.layers) { x.l.canvas.width = s.w; x.l.canvas.height = s.h; x.l.ctx.putImageData(x.img, 0, 0); x.l.version++; x.l._src = null; queueThumb(x.l); }
    state.doc.w = s.w; state.doc.h = s.h; maskBuf = null;
    sizeChanged();
  }
  else if (e.kind === "group") (side === "before" ? [...e.entries].reverse() : e.entries).forEach((x) => applyEntry(x, side));
}
function undo() {
  if (stroke || shapeDraft) return;
  if (textEdit) cancelText();
  const e = history.undo();
  if (!e) return;
  applyEntry(e, "before"); afterHistory();
}
function redo() {
  if (stroke || shapeDraft) return;
  const e = history.redo();
  if (!e) return;
  applyEntry(e, "after"); afterHistory();
}
function afterHistory() { renderLayerList(); updateHistoryButtons(); scheduleSave(); requestRender(); refreshDocColors(); }
function layerOp(fn, extraBytes = 0) {
  const before = snapLayers();
  fn();
  pushHistory({ kind: "layers", before, after: snapLayers(), extraBytes });
  renderLayerList(); scheduleSave(); requestRender();
}
/** Records the pixels of `layer` inside rect before and after fn(ctx) draws on it. */
function editRegion(layer, rect, fn) {
  const { w, h } = state.doc, keys = rectTileKeys(rect, w, h);
  const tiles = [...keys].map((k) => { const [x, y, tw, th] = tileRect(k, w, h); return { x, y, w: tw, h: th, before: layer.ctx.getImageData(x, y, tw, th).data }; });
  fn(layer.ctx);
  for (const t of tiles) t.after = layer.ctx.getImageData(t.x, t.y, t.w, t.h).data;
  if (tiles.length) pushHistory({ kind: "pixels", layer, tiles });
  markChanged(layer);
}
function markChanged(layer) {
  if (layer) { layer.version++; queueThumb(layer); }
  scheduleSave(); updateHistoryButtons(); requestRender(); refreshDocColors();
}

/* ---------- painting ---------- */
let stroke = null, maskBuf = null;
function beginStroke(e, pt) {
  const layer = activeLayer();
  if (!canDraw(layer)) return;
  const { w, h } = state.doc, tool = state.tool, b = BRUSHES[tool], s = state.settings[tool];
  const cur = layer.ctx.getImageData(0, 0, w, h);
  if (!maskBuf || maskBuf.length !== w * h) maskBuf = new Float32Array(w * h);
  stroke = {
    tool, layer, cur, base: new Uint8ClampedArray(cur.data), keys: new Set(), dirty: null, total: null, pointerId: e.pointerId,
    engine: new Stroke(tool, { size: s.size, smoothing: s.smoothing, seed: (Math.random() * 2 ** 31) | 0 }),
    rgb: hexToRgb(state.color), opacity: s.opacity, mode: b.mode || "paint", combine: b.combine || "max", smudge: {}, lastP: pt.p,
    points: [{ x: pt.x, y: pt.y }], assist: ASSIST_TOOLS.has(tool), size: s.size, shift: !!e.shiftKey,
  };
  armHold();
  addDabs(stroke.engine.begin(pt));
  flushStroke();
}
function addDabs(dabs) {
  const { w, h } = state.doc, st = stroke;
  for (const d of dabs) {
    const r = st.mode === "smudge" ? smudgeDab(st.cur, d, st.smudge, st.opacity) : stampMask(maskBuf, w, h, d, st.combine);
    if (!r) continue;
    st.dirty = unionRect(st.dirty, r); st.total = unionRect(st.total, r);
    rectTileKeys(r, w, h, st.keys);
  }
}
let flushQueued = false;
function scheduleFlush() { if (!flushQueued) { flushQueued = true; requestAnimationFrame(() => { flushQueued = false; flushStroke(); }); } }
function flushStroke() {
  const st = stroke;
  if (!st?.dirty) return;
  const r = st.dirty;
  st.dirty = null;
  if (st.mode !== "smudge") applyMask(st.cur, st.base, maskBuf, r, st.rgb, st.opacity, st.mode);
  st.layer.ctx.putImageData(st.cur, 0, 0, r[0], r[1], r[2] - r[0], r[3] - r[1]);
  requestRender();
}
function endStroke(pt, { snap = false } = {}) {
  const st = stroke;
  if (!st) return;
  clearTimeout(holdTimer);
  if (pt) { addDabs(st.engine.end({ ...pt, p: st.lastP ?? 1 })); st.points.push({ x: pt.x, y: pt.y }); }
  flushStroke();
  const { w, h } = state.doc;
  let cur = st.cur, shape = null;
  // Shift held while drawing: a straight line from where the stroke began to where it ends (Canva Draw)
  if (st.assist && st.shift && st.points.length > 1) { const a = st.points[0], b = st.points[st.points.length - 1]; if (Math.hypot(b.x - a.x, b.y - a.y) > 2) shape = { type: "line", x0: a.x, y0: a.y, x1: b.x, y1: b.y }; }
  else if (st.assist && (state.shapeAssist || snap)) shape = recognise(st.points, { minSize: Math.max(12, (st.size || 8) * 1.5) });
  if (shape) {
    // the rough stroke goes, the clean shape is drawn in its place: one undo step back to before the stroke
    st.cur.data.set(st.base);
    st.layer.ctx.putImageData(st.cur, 0, 0);
    drawCleanShape(st.layer.ctx, shape, st);
    cur = st.layer.ctx.getImageData(0, 0, w, h);
    rectTileKeys(shapeBounds(shape, (st.size || 8) + 2), w, h, st.keys);
    state.lastShape = shape.type;
    if (!st.shift) toast(`Shape assist: ${SHAPE_NAMES[shape.type] || "shape"}. Undo brings back the empty space.`);
  }
  const tiles = makeTiles(st.keys, { width: w, height: h, data: st.base }, cur);
  clearMask(maskBuf, w, st.total);
  stroke = null;
  if (tiles.length) pushHistory({ kind: "pixels", layer: st.layer, tiles });
  if (st.mode === "paint" || st.mode === "glow") addRecent(rgbToHex(st.rgb));
  markChanged(st.layer);
}
function drawCleanShape(ctx, shape, st) {
  ctx.save();
  ctx.globalAlpha = Math.max(0.02, Math.min(1, st.opacity ?? 1));
  ctx.strokeStyle = `rgb(${st.rgb[0]}, ${st.rgb[1]}, ${st.rgb[2]})`;
  ctx.lineWidth = Math.max(1, st.size || 8);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  tracePath(ctx, shape);
  ctx.stroke();
  ctx.restore();
}
// Hold still for a moment at the end of a stroke: it snaps to a clean shape even with Shape assist off (Canva's gesture).
let holdTimer = 0;
function armHold() {
  clearTimeout(holdTimer);
  const st = stroke;
  if (!st?.assist) return;
  holdTimer = setTimeout(() => {
    if (stroke !== st || st.points.length < 4) return;
    if (recognise(st.points, { minSize: Math.max(12, (st.size || 8) * 1.5) })) endStroke(null, { snap: true });
  }, 600);
}
function setShapeAssist(on) {
  state.shapeAssist = !!on;
  try { localStorage.setItem(ASSIST_KEY, on ? "1" : "0"); } catch {}
  for (const b of document.querySelectorAll("#shapeAssist, #shapeAssistToggle")) { b.setAttribute("aria-pressed", String(!!on)); b.classList.toggle("on", !!on); }
}
function abortStroke() {
  clearTimeout(holdTimer);
  const st = stroke;
  if (!st) return;
  stroke = null;
  if (st.total) {
    const r = st.total;
    st.cur.data.set(st.base);
    st.layer.ctx.putImageData(st.cur, 0, 0, r[0], r[1], r[2] - r[0], r[3] - r[1]);
    clearMask(maskBuf, state.doc.w, r);
  }
  requestRender();
}

/* ---------- fill, picker, shapes, text ---------- */
function layerPixels(l) { return l.ctx.getImageData(0, 0, state.doc.w, state.doc.h); }
function flatten(withBg) {
  const d = state.doc;
  return composite(d.layers.map((l) => ({ data: layerPixels(l), opacity: l.opacity, hidden: l.hidden })), d.w, d.h, withBg ? hexToRgb(d.background) : null);
}
function doFill(pt) {
  const layer = activeLayer();
  if (!canDraw(layer)) return;
  const { w, h } = state.doc, x = Math.floor(pt.x), y = Math.floor(pt.y), s = state.settings.fill;
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const cur = layerPixels(layer);
  const res = floodFill(s.sampleAll ? flatten(false) : cur, x, y, s.tolerance);
  if (!res?.count) return;
  const rect = growMask(res.mask, w, h, res.rect, 1);
  const tiles = [...rectTileKeys(rect, w, h)].map((k) => { const [tx, ty, tw, th] = tileRect(k, w, h); return { x: tx, y: ty, w: tw, h: th, before: copyRegion(cur, tx, ty, tw, th) }; });
  fillMask(cur, res.mask, rect, hexToRgb(state.color), s.opacity);
  layer.ctx.putImageData(cur, 0, 0, rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
  for (const t of tiles) t.after = copyRegion(cur, t.x, t.y, t.w, t.h);
  pushHistory({ kind: "pixels", layer, tiles });
  addRecent(state.color);
  markChanged(layer);
}
function compositePixel(x, y, withBg = false) {
  const d = state.doc, px = Math.floor(x), py = Math.floor(y);
  if (px < 0 || py < 0 || px >= d.w || py >= d.h) return withBg ? [...hexToRgb(d.background), 255] : [0, 0, 0, 0];
  const out = composite(d.layers.map((l) => ({ data: l.ctx.getImageData(px, py, 1, 1).data, opacity: l.opacity, hidden: l.hidden })), 1, 1, withBg ? hexToRgb(d.background) : null);
  return [...out.data];
}
function pickAt(pt, switchBack) {
  const c = compositePixel(pt.x, pt.y, true), hex = rgbToHex(c);
  setColor(hex);
  addRecent(hex);
  toast(`Colour ${hex} picked`);
  if (switchBack) setTool(state.lastBrush);
}
function drawShape(ctx, s) {
  const x = Math.min(s.x0, s.x1), y = Math.min(s.y0, s.y1), w = Math.abs(s.x1 - s.x0), h = Math.abs(s.y1 - s.y0);
  ctx.save();
  ctx.globalAlpha = s.opacity; ctx.lineWidth = s.size; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  ctx.beginPath();
  if (s.kind === "line") { ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke(); }
  else {
    if (s.kind === "ellipse") ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2);
    else ctx.rect(x, y, w, h);
    if (s.fill) ctx.fill(); else ctx.stroke();
  }
  ctx.restore();
}
function beginShape(e, pt) {
  const s = state.settings.shape;
  if (!canDraw(activeLayer())) return;
  shapeDraft = { kind: s.kind, x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y, size: s.size, opacity: s.opacity, fill: !!s.fill && s.kind !== "line", color: state.color, pointerId: e.pointerId };
}
function moveShape(e) {
  const s = shapeDraft, p = screenToDoc(e.clientX, e.clientY);
  let { x, y } = p;
  if (e.shiftKey) {
    const dx = x - s.x0, dy = y - s.y0;
    if (s.kind === "line") { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy); x = s.x0 + Math.cos(a) * len; y = s.y0 + Math.sin(a) * len; }
    else { const m = Math.max(Math.abs(dx), Math.abs(dy)); x = s.x0 + Math.sign(dx || 1) * m; y = s.y0 + Math.sign(dy || 1) * m; }
  }
  s.x1 = x; s.y1 = y;
  requestRender();
}
function commitShape() {
  const s = shapeDraft;
  shapeDraft = null;
  if (!s || Math.hypot(s.x1 - s.x0, s.y1 - s.y0) < 1) { requestRender(); return; }
  const pad = s.size + 2;
  editRegion(activeLayer(), [Math.min(s.x0, s.x1) - pad, Math.min(s.y0, s.y1) - pad, Math.max(s.x0, s.x1) + pad, Math.max(s.y0, s.y1) + pad], (ctx) => drawShape(ctx, s));
  addRecent(s.color);
}
let textEdit = null;
function placeText(pt) {
  if (!canDraw(activeLayer())) return;
  const te = { x: pt.x, y: pt.y, placing: true };
  textEdit = te;
  textInput.value = "";
  textInput.hidden = false;
  positionTextInput();
  ensureFont(state.settings.text.font, state.settings.text.bold).catch(() => {});
  // Focus right away: with only a deferred focus, keys typed straight after the tap went to the tool shortcuts
  // ("H" switched to the Move tool and threw the empty box away). Focus once more after this press in case the
  // browser moves focus on mousedown; a blur during the press itself does not close the box.
  textInput.focus({ preventScroll: true });
  setTimeout(() => {
    if (textEdit !== te) return;
    te.placing = false;
    if (document.activeElement !== textInput) textInput.focus({ preventScroll: true });
  }, 0);
}
function positionTextInput() {
  if (!textEdit) return;
  const s = state.settings.text, z = state.cam.zoom;
  Object.assign(textInput.style, {
    left: state.cam.x + textEdit.x * z + "px", top: state.cam.y + textEdit.y * z + "px",
    font: `${s.bold ? 700 : 400} ${s.size * z}px/1.25 ${fontCss(s.font)}`, color: state.color, opacity: String(s.opacity),
  });
  textInput.style.width = "0px"; textInput.style.height = "0px";
  textInput.style.width = textInput.scrollWidth + Math.max(8, s.size * z * 0.6) + "px";
  textInput.style.height = textInput.scrollHeight + 2 + "px";
}
function cancelText() { textEdit = null; textInput.hidden = true; textInput.value = ""; }
async function commitText() {
  if (!textEdit) return;
  const at = textEdit, text = textInput.value.replace(/\s+$/, "");
  cancelText();
  if (!text.trim()) return;
  const s = { ...state.settings.text }, color = state.color, layer = activeLayer();
  await ensureFont(s.font, s.bold).catch(() => null);
  const font = `${s.bold ? 700 : 400} ${s.size}px ${fontCss(s.font)}`, lines = text.split("\n"), lh = s.size * 1.25;
  layer.ctx.save(); layer.ctx.font = font;
  const wmax = Math.max(...lines.map((l) => layer.ctx.measureText(l).width));
  layer.ctx.restore();
  editRegion(layer, [at.x - 4, at.y - 4, at.x + wmax + s.size * 0.5 + 8, at.y + lh * lines.length + s.size * 0.5], (ctx) => {
    ctx.save(); ctx.font = font; ctx.textBaseline = "top"; ctx.fillStyle = color; ctx.globalAlpha = s.opacity;
    lines.forEach((l, i) => ctx.fillText(l, at.x, at.y + i * lh + (lh - s.size) / 2));
    ctx.restore();
  });
  addRecent(color);
}

/* ---------- pointer input ---------- */
const pointers = new Map();
let gesture = null, pan = null, spaceDown = false;
function pressureOf(e) { return e.pointerType === "pen" && e.pressure > 0 ? clamp(e.pressure, 0.05, 1) : 1; }
const toDoc = (e) => ({ ...screenToDoc(e.clientX, e.clientY), p: pressureOf(e) });
const touchList = () => [...pointers.values()].filter((p) => p.type === "touch");
function startGesture() {
  const [a, b] = touchList();
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  gesture = { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: state.cam.zoom, anchor: screenToDoc(mid.x, mid.y) };
}
function updateGesture() {
  const [a, b] = touchList();
  if (!a || !b) return;
  const r = stageRect(), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, c = state.cam;
  c.zoom = clamp(gesture.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.d), MINZ, MAXZ);
  c.x = mid.x - r.left - gesture.anchor.x * c.zoom; c.y = mid.y - r.top - gesture.anchor.y * c.zoom; c.fitted = false;
  afterCam();
}
function onDown(e) {
  if (!state.doc) return;
  lastPointerType = e.pointerType || "mouse";
  if (e.pointerType === "pen" && !state.penSeen) { state.penSeen = true; toast("Stylus found: draw with the pen, move the view with your fingers."); }
  closeMenus();
  // A tap on the canvas closes an open brush/layers sheet on phones. In the editor frame on wider screens the side panel
  // sits beside the canvas, so the canvas paints straight away and the panel stays open.
  if (document.body.dataset.sheet && (!shell || matchMedia("(max-width: 759.98px)").matches)) { toggleSheet(null); return; }
  const focused = document.activeElement;
  if (focused && focused !== document.body && focused !== textInput) focused.blur?.();
  try { stage.setPointerCapture(e.pointerId); } catch {}
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
  if (e.pointerType === "touch" && touchList().length >= 2) { abortStroke(); shapeDraft = null; pan = null; startGesture(); e.preventDefault(); return; }
  if (gesture) return;
  if (e.button === 1 || spaceDown || state.tool === "hand" || (e.pointerType === "touch" && state.penSeen)) {
    pan = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: state.cam.x, cy: state.cam.y };
    stage.classList.add("panning"); e.preventDefault();
    return;
  }
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (stroke || shapeDraft) return;
  e.preventDefault();
  if (textEdit) { commitText(); if (state.tool === "text") return; }
  const pt = toDoc(e), t = state.tool;
  if (BRUSHES[t]) {
    if (e.altKey && t !== "eraser" && t !== "smudge") { pickAt(pt, false); return; }
    beginStroke(e, pt);
  } else if (t === "fill") doFill(pt);
  else if (t === "picker") pickAt(pt, true);
  else if (t === "shape") beginShape(e, pt);
  else if (t === "text") placeText(pt);
  else if (t === "move") beginMove(e, pt);
}
// Select and move: drag everything on the active layer (one undo step for the whole move).
let moveDraft = null;
function beginMove(e, pt) {
  const layer = activeLayer();
  if (!canDraw(layer)) return;
  const { w, h } = state.doc, copy = makeCanvas(w, h);
  copy.getContext("2d").drawImage(layer.canvas, 0, 0);
  moveDraft = { layer, copy, base: layer.ctx.getImageData(0, 0, w, h), x: pt.x, y: pt.y, dx: 0, dy: 0, pointerId: e.pointerId };
}
function dragMove(e) {
  const m = moveDraft, pt = toDoc(e);
  m.dx = Math.round(pt.x - m.x); m.dy = Math.round(pt.y - m.y);
  if (e.shiftKey) { if (Math.abs(m.dx) > Math.abs(m.dy)) m.dy = 0; else m.dx = 0; }
  m.layer.ctx.clearRect(0, 0, state.doc.w, state.doc.h);
  m.layer.ctx.drawImage(m.copy, m.dx, m.dy);
  requestRender();
}
function commitMove() {
  const m = moveDraft;
  moveDraft = null;
  if (!m || (!m.dx && !m.dy)) return;
  const { w, h } = state.doc;
  const after = m.layer.ctx.getImageData(0, 0, w, h);
  const same = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
  const tiles = makeTiles(rectTileKeys([0, 0, w, h], w, h), { width: w, height: h, data: m.base.data }, after).filter((t) => !same(t.before, t.after));
  if (tiles.length) pushHistory({ kind: "pixels", layer: m.layer, tiles });
  markChanged(m.layer);
}
function onMove(e) {
  const p = pointers.get(e.pointerId);
  if (p) { p.x = e.clientX; p.y = e.clientY; }
  if (gesture) { updateGesture(); return; }
  if (pan && e.pointerId === pan.id) {
    const c = state.cam;
    c.x = pan.cx + e.clientX - pan.x; c.y = pan.cy + e.clientY - pan.y; c.fitted = false;
    afterCam();
    return;
  }
  if (e.pointerType !== "touch") { hover = screenToDoc(e.clientX, e.clientY); lastPointerType = e.pointerType || "mouse"; }
  if (stroke && e.pointerId === stroke.pointerId) {
    if (e.shiftKey) stroke.shift = true;
    const list = e.getCoalescedEvents?.() || [];
    for (const ce of list.length ? list : [e]) {
      const pt = toDoc(ce);
      if (ce.pointerType === "pen" && !(ce.pressure > 0)) pt.p = stroke.lastP;
      stroke.lastP = pt.p;
      const lastPt = stroke.points[stroke.points.length - 1];
      if (!lastPt || Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) > 1.5 / state.cam.zoom) { stroke.points.push({ x: pt.x, y: pt.y }); armHold(); }
      addDabs(stroke.engine.move(pt));
    }
    scheduleFlush();
  } else if (shapeDraft && e.pointerId === shapeDraft.pointerId) moveShape(e);
  else if (moveDraft && e.pointerId === moveDraft.pointerId) dragMove(e);
  else if (BRUSHES[state.tool]) requestRender();
}
function onUp(e) {
  pointers.delete(e.pointerId);
  try { stage.releasePointerCapture(e.pointerId); } catch {}
  if (gesture) { if (touchList().length < 2) gesture = null; return; }
  if (pan && e.pointerId === pan.id) { pan = null; stage.classList.remove("panning"); return; }
  if (stroke && e.pointerId === stroke.pointerId) { if (e.shiftKey) stroke.shift = true; endStroke(e.type === "pointercancel" ? null : toDoc(e)); return; }
  if (shapeDraft && e.pointerId === shapeDraft.pointerId) { if (e.type !== "pointercancel") moveShape(e); commitShape(); }
  if (moveDraft && e.pointerId === moveDraft.pointerId) { if (e.type !== "pointercancel") dragMove(e); commitMove(); }
}
stage.addEventListener("pointerdown", onDown);
stage.addEventListener("pointermove", onMove);
stage.addEventListener("pointerup", onUp);
stage.addEventListener("pointercancel", onUp);
stage.addEventListener("pointerleave", () => { if (!stroke) { hover = null; requestRender(); } });
stage.addEventListener("contextmenu", (e) => e.preventDefault());
stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.shiftKey && !e.ctrlKey) { state.cam.x -= e.deltaY; state.cam.fitted = false; afterCam(); return; }
  const k = (e.ctrlKey ? 0.01 : 0.0015) * (e.deltaMode === 1 ? 33 : 1);
  zoomTo(state.cam.zoom * Math.exp(-e.deltaY * k), e.clientX, e.clientY);
}, { passive: false });
// No page scroll or zoom from touches on the canvas (Safari ignores touch-action for some gestures).
stage.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
stage.addEventListener("dragover", (e) => { e.preventDefault(); });
stage.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) openAnyFile(f);
});

/* ---------- tools and options ---------- */
function setTool(t) {
  if (!TOOLS.includes(t)) return;
  if (textEdit && t !== "text") commitText();
  state.tool = t;
  if (BRUSHES[t]) state.lastBrush = t;
  document.body.dataset.tool = t;
  for (const b of toolBtns) { const on = b.dataset.tool === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }
  syncOptions();
  requestRender();
}
function syncOptions() {
  const t = state.tool, g = BRUSHES[t] ? "brush" : t, s = state.settings[t] || {};
  $("#brushTitle").textContent = LABEL[t];
  for (const o of $$(".opt[data-for]")) o.hidden = !o.dataset.for.split(" ").includes(g);
  $("#sizeLabel").textContent = g === "text" ? "Text size" : g === "shape" ? "Line width" : "Size";
  sizeRange.min = g === "text" ? 8 : 1;
  sizeRange.max = g === "text" ? 300 : g === "shape" ? 80 : 200;
  if (s.size != null) { sizeRange.value = s.size; $("#sizeVal").textContent = Math.round(s.size) + " px"; $("#sizeNum").value = Math.round(s.size); }
  $("#sizeNum").min = sizeRange.min; $("#sizeNum").max = sizeRange.max;
  syncSizePresets();
  $("#opacityLabel").textContent = t === "smudge" ? "Strength" : "Opacity";
  if (s.opacity != null) { opacityRange.value = Math.round(s.opacity * 100); $("#opacityVal").textContent = Math.round(s.opacity * 100) + "%"; }
  if (s.smoothing != null) { smoothRange.value = Math.round(s.smoothing * 100); $("#smoothVal").textContent = Math.round(s.smoothing * 100) + "%"; }
  const f = state.settings.fill, sh = state.settings.shape, tx = state.settings.text;
  tolRange.value = f.tolerance; $("#tolVal").textContent = f.tolerance;
  $("#sampleAll").checked = !!f.sampleAll;
  for (const b of $$("#shapeKinds [data-kind]")) { const on = b.dataset.kind === sh.kind; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }
  $("#shapeFill").checked = !!sh.fill;
  $("#fontSel").value = tx.font; $("#textBold").checked = !!tx.bold;
  $("#toolHint").textContent = HINT[t] || "";
  syncPill();
}
let settingsTimer = null;
function saveSettings() { clearTimeout(settingsTimer); settingsTimer = setTimeout(() => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch {} }, 300); }
function cur() { return (state.settings[state.tool] ||= {}); }
function changeSize(dir) {
  const s = cur();
  if (s.size == null) return;
  const max = +sizeRange.max, min = +sizeRange.min;
  s.size = clamp(Math.round(dir > 0 ? s.size * 1.2 + 1 : s.size / 1.2 - 0.5), min, max);
  syncOptions(); saveSettings(); requestRender(); positionTextInput();
}
sizeRange.addEventListener("input", () => { cur().size = +sizeRange.value; $("#sizeVal").textContent = sizeRange.value + " px"; $("#sizeNum").value = sizeRange.value; syncSizePresets(); saveSettings(); requestRender(); positionTextInput(); });
// thickness presets and an exact number (Canva Draw's Settings: presets or type a weight)
function setSize(v) {
  const s = cur();
  if (s.size == null) return;
  s.size = clamp(Math.round(+v) || 1, +sizeRange.min, +sizeRange.max);
  syncOptions(); saveSettings(); requestRender(); positionTextInput();
}
function syncSizePresets() { const v = Math.round(cur().size ?? -1); for (const b of $$("#sizePresets [data-size]")) { const on = +b.dataset.size === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); } }
$("#sizePresets").addEventListener("click", (e) => { const b = e.target.closest("[data-size]"); if (b) setSize(b.dataset.size); });
$("#sizeNum").addEventListener("change", () => setSize($("#sizeNum").value));
$("#sizeNum").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); setSize($("#sizeNum").value); } });
opacityRange.addEventListener("input", () => { cur().opacity = +opacityRange.value / 100; $("#opacityVal").textContent = opacityRange.value + "%"; saveSettings(); positionTextInput(); });
smoothRange.addEventListener("input", () => { cur().smoothing = +smoothRange.value / 100; $("#smoothVal").textContent = smoothRange.value + "%"; saveSettings(); });
tolRange.addEventListener("input", () => { state.settings.fill.tolerance = +tolRange.value; $("#tolVal").textContent = tolRange.value; saveSettings(); });
$("#sampleAll").addEventListener("change", (e) => { state.settings.fill.sampleAll = e.target.checked; saveSettings(); });
$("#shapeKinds").addEventListener("click", (e) => { const b = e.target.closest("[data-kind]"); if (!b) return; state.settings.shape.kind = b.dataset.kind; syncOptions(); saveSettings(); });
$("#shapeFill").addEventListener("change", (e) => { state.settings.shape.fill = e.target.checked; saveSettings(); });
const fontSel = $("#fontSel");
for (const [k, f] of Object.entries(FONT_FAMILIES)) fontSel.add(new Option(f.label, k));
fontSel.addEventListener("change", () => { state.settings.text.font = fontSel.value; ensureFont(fontSel.value, state.settings.text.bold).catch(() => {}); saveSettings(); positionTextInput(); });
$("#textBold").addEventListener("change", (e) => { state.settings.text.bold = e.target.checked; saveSettings(); positionTextInput(); });
for (const b of toolBtns) b.addEventListener("click", () => setTool(b.dataset.tool));

/* ---------- colour ---------- */
function setColor(hex) {
  const h = normHex(hex);
  if (!h) return;
  state.color = h;
  colorInput.value = h;
  if (document.activeElement !== colorHex) colorHex.value = h;
  document.documentElement.style.setProperty("--draw-color", h);
  for (const s of $$(".swatch")) s.classList.toggle("on", s.dataset.color === h);
  if (textEdit) textInput.style.color = h;
  if (pillColor) pillColor.value = h;
  requestRender();
}
function addRecent(hex) {
  const next = pushRecent(state.recent, hex);
  if (next.join() === state.recent.join()) return;
  state.recent = next;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  renderSwatches($("#recentColors"), next, "Recent colour");
}
function renderSwatches(box, colors, label) {
  box.replaceChildren(...colors.map((c) => {
    const b = document.createElement("button");
    b.className = "swatch" + (c === state.color ? " on" : ""); b.dataset.color = c; b.style.background = c;
    b.title = c; b.setAttribute("aria-label", `${label} ${c}`);
    return b;
  }));
}
function renderBrandSwatches() { renderSwatches($("#brandColors"), [...new Set((loadBrand().colors || []).map(normHex).filter(Boolean))].slice(0, 10), "Brand colour"); }
for (const box of [$("#brandColors"), $("#recentColors"), $("#docColors")]) box.addEventListener("click", (e) => { const b = e.target.closest(".swatch"); if (b) setColor(b.dataset.color); });
// "In this drawing": the colours already used (like Canva's document colours), worked out from a small copy
let docColorTimer = 0;
function refreshDocColors(now = false) {
  clearTimeout(docColorTimer);
  const run = () => {
    if (!state.doc) return;
    const { w, h } = state.doc, k = Math.min(1, 300 / Math.max(w, h));
    const c = makeCanvas(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))), x = c.getContext("2d");
    for (const l of state.doc.layers) if (!l.hidden && l.opacity > 0) { x.globalAlpha = l.opacity; x.drawImage(l.canvas, 0, 0, c.width, c.height); }
    const cols = drawingColors(x.getImageData(0, 0, c.width, c.height), { paper: state.doc.background });
    renderSwatches($("#docColors"), cols, "Colour in this drawing");
    $("#docColorsLbl").hidden = !cols.length;
  };
  if (now) run(); else docColorTimer = setTimeout(run, 600);
}
colorInput.addEventListener("input", () => setColor(colorInput.value));
colorInput.addEventListener("change", () => addRecent(colorInput.value));
colorHex.addEventListener("input", () => { const v = colorHex.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) setColor(v.startsWith("#") ? v : "#" + v); });
function commitHex() { const h = normHex(colorHex.value); if (h) { setColor(h); addRecent(h); } colorHex.value = state.color; }
colorHex.addEventListener("change", commitHex);
colorHex.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); commitHex(); colorHex.blur(); } });
window.addEventListener("asaandesk-brand", renderBrandSwatches);

/* ---------- layers panel ---------- */
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1"/></svg>';
const thumbs = new Map();
function renderLayerList() {
  const d = state.doc;
  thumbs.clear();
  const items = [];
  for (let i = d.layers.length - 1; i >= 0; i--) {
    const l = d.layers[i], li = document.createElement("li"), on = l === d.active;
    li.className = "layer" + (on ? " on" : "") + (l.hidden ? " off" : "");
    li.dataset.layerIndex = i; li.tabIndex = 0;
    if (on) li.setAttribute("aria-current", "true");
    li.setAttribute("aria-label", `${l.name}${l.hidden ? ", hidden" : ""}${on ? ", selected" : ""}`);
    const c = makeCanvas(84, 84); c.className = "thumb"; c.setAttribute("aria-hidden", "true");
    const name = document.createElement("span"); name.className = "lname"; name.textContent = l.name; name.title = "Double-click to rename";
    const eye = document.createElement("button"); eye.className = "eye"; eye.innerHTML = l.hidden ? EYE_OFF : EYE;
    eye.setAttribute("aria-label", `${l.hidden ? "Show" : "Hide"} ${l.name}`); eye.title = l.hidden ? "Show layer" : "Hide layer";
    li.append(c, name, eye);
    items.push(li);
    thumbs.set(l, c);
    drawThumb(l, c);
  }
  layerList.replaceChildren(...items);
  const i = activeIndex();
  layerOpacity.value = Math.round((d.active?.opacity ?? 1) * 100); $("#layerOpacityVal").textContent = layerOpacity.value + "%";
  $("#layerUp").disabled = i >= d.layers.length - 1;
  $("#layerDown").disabled = i <= 0;
  $("#layerMerge").disabled = i <= 0;
  $("#layerDel").disabled = d.layers.length <= 1;
  $("#addLayer").disabled = d.layers.length >= 50;
}
function drawThumb(layer, c) {
  const x = c.getContext("2d"), W = c.width, H = c.height, d = state.doc;
  x.clearRect(0, 0, W, H);
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#e9ebf3";
  for (let yy = 0; yy < H; yy += 12) for (let xx = (yy / 12) % 2 ? 12 : 0; xx < W; xx += 24) x.fillRect(xx, yy, 12, 12);
  const s = Math.min(W / d.w, H / d.h), dw = d.w * s, dh = d.h * s;
  x.imageSmoothingQuality = "high";
  x.drawImage(layer.canvas, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
const thumbQueue = new Set();
let thumbTimer = null;
function queueThumb(l) {
  thumbQueue.add(l);
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => { for (const x of thumbQueue) { const c = thumbs.get(x); if (c) drawThumb(x, c); } thumbQueue.clear(); }, 150);
}
function selectLayer(l) { if (l && state.doc.active !== l) { state.doc.active = l; renderLayerList(); scheduleSave(); } }
layerList.addEventListener("click", (e) => {
  const li = e.target.closest(".layer");
  if (!li) return;
  const l = state.doc.layers[+li.dataset.layerIndex];
  if (!l) return;
  if (e.target.closest(".eye")) { layerOp(() => { l.hidden = !l.hidden; }); return; }
  if (e.target.closest("input")) return;
  selectLayer(l);
});
layerList.addEventListener("dblclick", (e) => { const li = e.target.closest(".layer"); if (li && e.target.closest(".lname")) startRename(li); });
layerList.addEventListener("keydown", (e) => {
  const li = e.target.closest(".layer");
  if (!li || e.target.closest("input")) return;
  const i = +li.dataset.layerIndex, d = state.doc;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectLayer(d.layers[i]); }
  else if (e.key === "F2") { e.preventDefault(); startRename(li); }
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const j = clamp(i + (e.key === "ArrowUp" ? 1 : -1), 0, d.layers.length - 1);
    selectLayer(d.layers[j]);
    layerList.querySelector(`[data-layer-index="${j}"]`)?.focus();
  }
});
function startRename(li) {
  const l = state.doc.layers[+li.dataset.layerIndex], span = li.querySelector(".lname");
  if (!l || !span) return;
  const inp = document.createElement("input");
  inp.value = l.name; inp.maxLength = 60; inp.setAttribute("aria-label", "Layer name");
  span.replaceChildren(inp);
  inp.focus(); inp.select();
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const v = inp.value.trim();
    if (save && v && v !== l.name) layerOp(() => { l.name = v.slice(0, 60); });
    else renderLayerList();
  };
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") finish(true); else if (e.key === "Escape") finish(false); e.stopPropagation(); });
  inp.addEventListener("blur", () => finish(true));
}
function addLayer() {
  if (state.doc.layers.length >= 50) { toast("A drawing can have up to 50 layers."); return; }
  layerOp(() => { const l = makeLayer(nextLayerName(state.doc.layers)); state.doc.layers = insertAt(state.doc.layers, l, activeIndex() + 1); state.doc.active = l; });
}
function deleteLayer() {
  const d = state.doc;
  if (d.layers.length <= 1) { toast("A drawing needs at least one layer."); return; }
  const i = activeIndex(), n = d.layers.length;
  layerOp(() => { d.layers = removeAt(d.layers, i); d.active = d.layers[afterDelete(n, i)]; }, d.w * d.h * 4);
}
function moveLayer(dir) {
  const i = activeIndex(), j = i + dir;
  if (j < 0 || j >= state.doc.layers.length) return;
  layerOp(() => { state.doc.layers = moveItem(state.doc.layers, i, j); });
}
function duplicateLayer() {
  const d = state.doc, src = d.active;
  if (d.layers.length >= 50) { toast("A drawing can have up to 50 layers."); return; }
  const l = makeLayer(`${src.name} copy`.slice(0, 60));
  l.opacity = src.opacity;
  l.ctx.drawImage(src.canvas, 0, 0);
  layerOp(() => { d.layers = insertAt(d.layers, l, activeIndex() + 1); d.active = l; }, d.w * d.h * 4);
  markChanged(l);
}
function mergeDown() {
  const d = state.doc, i = activeIndex();
  if (i <= 0) { toast("There is no layer below to merge into."); return; }
  const upper = d.active, lower = d.layers[i - 1], lo = layerPixels(lower), up = layerPixels(upper);
  const merged = composite([{ data: lo, opacity: 1 }, { data: up, opacity: upper.hidden ? 0 : upper.opacity }], d.w, d.h, null);
  const tiles = makeTiles(rectTileKeys([0, 0, d.w, d.h], d.w, d.h), lo, merged);
  const img = lower.ctx.createImageData(d.w, d.h);
  img.data.set(merged.data);
  lower.ctx.putImageData(img, 0, 0);
  const before = snapLayers();
  d.layers = removeAt(d.layers, i); d.active = lower;
  pushHistory({ kind: "group", entries: [{ kind: "pixels", layer: lower, tiles }, { kind: "layers", before, after: snapLayers(), extraBytes: d.w * d.h * 4 }] });
  renderLayerList();
  markChanged(lower);
}
$("#addLayer").addEventListener("click", addLayer);
$("#layerDel").addEventListener("click", deleteLayer);
$("#layerUp").addEventListener("click", () => moveLayer(1));
$("#layerDown").addEventListener("click", () => moveLayer(-1));
$("#layerDup").addEventListener("click", duplicateLayer);
$("#layerMerge").addEventListener("click", mergeDown);
let opacityStart = null;
layerOpacity.addEventListener("input", () => {
  const l = state.doc.active;
  opacityStart ??= snapLayers();
  l.opacity = +layerOpacity.value / 100;
  $("#layerOpacityVal").textContent = layerOpacity.value + "%";
  requestRender();
});
layerOpacity.addEventListener("change", () => {
  if (!opacityStart) return;
  pushHistory({ kind: "layers", before: opacityStart, after: snapLayers() });
  opacityStart = null;
  queueThumb(state.doc.active); scheduleSave();
});
$("#bgColor").addEventListener("input", (e) => { state.doc.background = e.target.value; requestRender(); });
$("#bgColor").addEventListener("change", (e) => {
  const was = state.doc._savedBg ?? "#ffffff";
  if (was !== e.target.value) pushHistory({ kind: "bg", before: was, after: e.target.value });
  state.doc._savedBg = e.target.value; scheduleSave();
});
$("#docName").addEventListener("change", (e) => { state.doc.name = e.target.value.trim().slice(0, 80) || "My drawing"; e.target.value = state.doc.name; scheduleSave(); });

/* ---------- documents ---------- */
const defaultName = () => `Drawing ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
function setDoc(d) {
  abortStroke(); cancelText(); shapeDraft = null;
  state.doc = d;
  d._savedBg = d.background;
  history.clear(); maskBuf = null;
  $("#docName").value = d.name;
  try { shell?.setTitle?.(d.name); shell?.setProjectId?.(d.id); shell?.setDesignId?.(d.id); } catch {}
  $("#bgColor").value = d.background;
  $("#sizeInfo").textContent = `${d.w} × ${d.h} px`;
  renderLayerList(); updateHistoryButtons();
  state.cam.fitted = true;
  fit();
  refreshDocColors();
}
function newDoc({ w = 1080, h = 1080, background = "#ffffff", name } = {}, { save = true } = {}) {
  const [W, H] = clampSize(w, h);
  const d = { id: uid(), name: name || defaultName(), w: W, h: H, background: normHex(background) || "#ffffff", layers: [], active: null };
  state.doc = d;
  const l = makeLayer("Layer 1", W, H);
  d.layers = [l]; d.active = l;
  setDoc(d);
  if (save) scheduleSave(); else setStatus("saved");
}
async function decodeImage(blob) {
  if (typeof createImageBitmap === "function") { try { return await createImageBitmap(blob); } catch {} }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("This picture can't be opened. Try a PNG or JPG.")); };
    img.src = url;
  });
}
function dataUrlToBlob(src) {
  const comma = src.indexOf(","), mime = /^data:([^;,]+)/.exec(src)?.[1] || "image/png";
  const bin = atob(src.slice(comma + 1).replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
async function loadDrawing(input, { id = null } = {}) {
  const p = parseDrawing(input);
  const d = { id: id || uid(), name: p.name, w: p.width, h: p.height, background: p.background, layers: [], active: null };
  for (const L of p.layers) {
    const l = makeLayer(L.name, d.w, d.h);
    l.opacity = L.opacity; l.hidden = L.hidden;
    if (L.src) {
      const img = await decodeImage(dataUrlToBlob(L.src));
      l.ctx.drawImage(img, 0, 0);
      img.close?.();
      if (/^data:image\/png/.test(L.src)) { l._src = L.src; l._srcVersion = 0; }
    }
    d.layers.push(l);
  }
  d.active = d.layers[p.active];
  setDoc(d);
  if (id) setStatus("saved"); else scheduleSave();
  return d;
}
async function readText(file) { return typeof file.text === "function" ? file.text() : new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file); }); }
async function openAnyFile(file) {
  if (/\.json$/i.test(file.name) || file.type === "application/json") {
    try { await saveNow(); await loadDrawing(await readText(file)); toast("Drawing opened"); } catch (e) { toast(e.message || "This file can't be opened."); }
  } else if (/^image\//.test(file.type)) importImage(file);
  else toast("Open a picture (PNG, JPG) or an AsaanDesk drawing file.");
}
async function importImage(file) {
  try {
    const img = await decodeImage(file), d = state.doc;
    const s = Math.min(1, d.w / img.width, d.h / img.height), dw = Math.max(1, Math.round(img.width * s)), dh = Math.max(1, Math.round(img.height * s));
    if (d.layers.length >= 50) { toast("A drawing can have up to 50 layers."); return; }
    const l = makeLayer((file.name || "Picture").replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "Picture");
    l.ctx.imageSmoothingQuality = "high";
    l.ctx.drawImage(img, Math.round((d.w - dw) / 2), Math.round((d.h - dh) / 2), dw, dh);
    img.close?.();
    layerOp(() => { d.layers = insertAt(d.layers, l, activeIndex() + 1); d.active = l; }, d.w * d.h * 4);
    markChanged(l);
    toast("Picture added as a new layer");
  } catch (e) { toast(e.message || "This picture can't be opened."); }
}
$("#importInput").addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; closeMenus(); if (f) importImage(f); });
$("#openFile").addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; closeMenus(); if (f) openAnyFile(f); });
window.addEventListener("paste", (e) => {
  if (isTyping(e.target)) return;
  const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
  if (f) { e.preventDefault(); importImage(f); }
});

/* ---------- resize the canvas ---------- */
// mode "scale": every layer is stretched to the new size; mode "canvas": the pixels keep their size and sit at the
// anchor (tl, t, tr, l, c, r, bl, b, br); new space is clear (the paper shows) or filled on the bottom layer.
function sizeChanged() {
  $("#sizeInfo").textContent = `${state.doc.w} × ${state.doc.h} px`;
  state.cam.fitted = true;
  fit();
}
function resizeCanvas(w, h, { mode = "scale", anchor = "c", fill = null } = {}) {
  const d = state.doc;
  if (!d) return false;
  [w, h] = clampSize(w, h);
  if (w === d.w && h === d.h) return false;
  abortStroke(); if (textEdit) commitText(); shapeDraft = null;
  const ow = d.w, oh = d.h, [dx, dy] = mode === "canvas" ? anchorOffset(anchor, w - ow, h - oh) : [0, 0];
  const before = { w: ow, h: oh, layers: d.layers.map((l) => ({ l, img: l.ctx.getImageData(0, 0, ow, oh) })) };
  d.layers.forEach((l, i) => {
    const old = makeCanvas(ow, oh);
    old.getContext("2d").putImageData(before.layers[i].img, 0, 0);
    l.canvas.width = w; l.canvas.height = h;
    const x = l.ctx;
    if (mode === "scale") { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(old, 0, 0, w, h); }
    else {
      if (i === 0 && fill && normHex(fill)) {
        // fill only the new strips around the old picture
        x.save(); x.fillStyle = normHex(fill); x.beginPath(); x.rect(0, 0, w, h); x.rect(dx, dy, ow, oh); x.fill("evenodd"); x.restore();
      }
      x.drawImage(old, dx, dy);
    }
    l.version++; l._src = null; queueThumb(l);
  });
  d.w = w; d.h = h; maskBuf = null;
  const after = { w, h, layers: d.layers.map((l) => ({ l, img: l.ctx.getImageData(0, 0, w, h) })) };
  pushHistory({ kind: "resize", before, after, bytes: (ow * oh + w * h) * 4 * d.layers.length + 64 });
  renderLayerList(); sizeChanged(); scheduleSave(); requestRender();
  return true;
}
const RESIZE_PRESETS = [
  { id: "square", label: "Square", w: 1080, h: 1080 }, { id: "story", label: "Story", w: 1080, h: 1920 },
  { id: "a4", label: "A4 portrait", w: 1240, h: 1754 }, { id: "a4-landscape", label: "A4 landscape", w: 1754, h: 1240 },
  { id: "hd", label: "Wide HD", w: 1920, h: 1080 },
];
const rs = { mode: "scale", anchor: "c", ratio: 1 };
const rsW = $("#resizeW"), rsH = $("#resizeH");
function syncResizeUi() {
  for (const b of $$("#resizeMode [data-mode]")) { const on = b.dataset.mode === rs.mode; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }
  for (const b of $$("#resizeAnchor [data-anchor]")) { const on = b.dataset.anchor === rs.anchor; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }
  $("#resizeCanvasOpts").hidden = rs.mode !== "canvas";
  for (const b of $$("#resizePresets [data-preset]")) b.classList.toggle("on", +b.dataset.w === +rsW.value && +b.dataset.h === +rsH.value);
  $("#resizeNote").textContent = rs.mode === "scale" ? "Every layer is stretched to the new size. Undo puts it back." : "The drawing keeps its size; the canvas grows or is cut at the edges. Undo puts it back.";
}
for (const p of RESIZE_PRESETS) {
  const k = 34 / Math.max(p.w, p.h), b = document.createElement("button");
  b.type = "button"; b.className = "preset"; b.dataset.preset = p.id; b.dataset.w = p.w; b.dataset.h = p.h;
  b.innerHTML = `<span class="pv" style="width:${Math.round(p.w * k)}px;height:${Math.round(p.h * k)}px"></span><b></b><small></small>`;
  b.querySelector("b").textContent = p.label; b.querySelector("small").textContent = `${p.w} × ${p.h}`;
  b.addEventListener("click", () => { rsW.value = p.w; rsH.value = p.h; rs.ratio = p.h / p.w; syncResizeUi(); });
  $("#resizePresets").append(b);
}
function openResize() {
  if (!state.doc) return;
  closeMenus();
  rsW.value = state.doc.w; rsH.value = state.doc.h; rs.ratio = state.doc.h / state.doc.w;
  syncResizeUi();
  openDialog($("#resizeDialog"));
}
rsW.addEventListener("input", () => { if ($("#resizeLock").checked && +rsW.value > 0) rsH.value = Math.round(+rsW.value * rs.ratio); syncResizeUi(); });
rsH.addEventListener("input", () => { if ($("#resizeLock").checked && +rsH.value > 0) rsW.value = Math.round(+rsH.value / rs.ratio); syncResizeUi(); });
$("#resizeLock").addEventListener("change", (e) => { if (e.target.checked && +rsW.value > 0) rs.ratio = +rsH.value / +rsW.value; });
$("#resizeMode").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) { rs.mode = b.dataset.mode; syncResizeUi(); } });
$("#resizeAnchor").addEventListener("click", (e) => { const b = e.target.closest("[data-anchor]"); if (b) { rs.anchor = b.dataset.anchor; syncResizeUi(); } });
$("#resizeCancel").addEventListener("click", () => closeDialog($("#resizeDialog")));
$("#resizeApply").addEventListener("click", () => {
  const [w, h] = clampSize(rsW.value, rsH.value);
  const pick = document.querySelector('input[name="resizeFill"]:checked')?.value || "";
  const fill = pick === "color" ? $("#resizeFillColor").value : pick || null;
  closeDialog($("#resizeDialog"));
  if (resizeCanvas(w, h, { mode: rs.mode, anchor: rs.anchor, fill })) toast(`Canvas is now ${w} × ${h} px`);
  else toast("The canvas already has that size.");
});
$("#resizeBtn").addEventListener("click", openResize);

/* ---------- saving ---------- */
const STATUS_TEXT = { saved: "Saved", saving: "Saving…", unsaved: "Not saved yet", error: "Could not save" };
function setStatus(s) { try { shell?.setSaved?.(s === "saved" ? "saved" : s === "saving" ? "saving" : "unsaved"); } catch {} state.saveStatus = s; const el = $("#saveStatus"); el.dataset.state = s; el.querySelector("span").textContent = STATUS_TEXT[s]; el.title = STATUS_TEXT[s] + " (in this browser)"; }
function canvasDataUrl(c) {
  return new Promise((res) => {
    const fallback = () => res(c.toDataURL("image/png"));
    try {
      c.toBlob((b) => {
        if (!b) return fallback();
        const r = new FileReader();
        r.onload = () => res(r.result); r.onerror = fallback;
        r.readAsDataURL(b);
      }, "image/png");
    } catch { fallback(); }
  });
}
async function layerSrc(l) {
  if (l._src && l._srcVersion === l.version) return l._src;
  const v = l.version, src = await canvasDataUrl(l.canvas);
  l._src = src; l._srcVersion = v;
  return src;
}
async function drawingJson() {
  const d = state.doc, layers = [];
  for (const l of d.layers) layers.push({ name: l.name, opacity: l.opacity, hidden: l.hidden, src: await layerSrc(l) });
  return serializeDrawing({ name: d.name, width: d.w, height: d.h, background: d.background, active: activeIndex(), layers });
}
function thumbDataUrl() {
  const d = state.doc, s = Math.min(1, 240 / Math.max(d.w, d.h));
  const c = makeCanvas(Math.max(1, Math.round(d.w * s)), Math.max(1, Math.round(d.h * s))), x = c.getContext("2d");
  x.fillStyle = d.background; x.fillRect(0, 0, c.width, c.height);
  x.scale(s, s);
  for (const l of d.layers) if (!l.hidden) { x.globalAlpha = l.opacity; x.drawImage(l.canvas, 0, 0); }
  return c.toDataURL("image/jpeg", 0.8);
}
let saveTimer = null, saving = null, changeSeq = 0;
function scheduleSave() {
  if (!state.doc) return;
  changeSeq++;
  setStatus("unsaved");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 900);
}
async function saveNow() {
  clearTimeout(saveTimer);
  while (saving) await saving;
  if (!state.doc || state.saveStatus === "saved") return;
  const seq = changeSeq, d = state.doc;
  setStatus("saving");
  saving = (async () => {
    try {
      const data = await drawingJson();
      await saveProject({ id: d.id, app: "draw", name: d.name, data, thumb: thumbDataUrl() });
      if (state.doc === d) setStatus(seq === changeSeq ? "saved" : "unsaved");
      if (seq !== changeSeq) { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveNow(), 600); }
    } catch (e) {
      console.warn("Autosave failed", e);
      setStatus("error");
      toast("Could not save in this browser. Export a drawing file to keep your work.");
    } finally { saving = null; }
  })();
  return saving;
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && state.saveStatus === "unsaved") saveNow(); });

/* ---------- export ---------- */
function bufferToCanvas(buf) {
  const c = makeCanvas(buf.width, buf.height), x = c.getContext("2d"), img = x.createImageData(buf.width, buf.height);
  img.data.set(buf.data); x.putImageData(img, 0, 0);
  return c;
}
const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("The picture could not be made. Try a smaller canvas."))), type, q));
const exportPng = ({ background = true } = {}) => canvasBlob(bufferToCanvas(flatten(background)), "image/png");
const exportJpg = () => canvasBlob(bufferToCanvas(flatten(true)), "image/jpeg", 0.92);
const exportJson = async () => JSON.stringify(await drawingJson());
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.rel = "noopener";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
async function doExport(kind) {
  closeMenus();
  const base = slugName(state.doc.name);
  try {
    if (kind === "png") download(await exportPng({ background: true }), base + ".png");
    else if (kind === "png-clear") download(await exportPng({ background: false }), base + "-transparent.png");
    else if (kind === "jpg") download(await exportJpg(), base + ".jpg");
    else if (kind === "json") download(new Blob([await exportJson()], { type: "application/json" }), base + FILE_EXT);
    else return;
    const hidden = state.doc.layers.filter((l) => l.hidden).length;
    toast(kind === "json" ? "Drawing file saved. Open it here later to keep editing." : `Picture saved${hidden ? ` (${hidden} hidden layer${hidden > 1 ? "s" : ""} left out)` : ""}`);
  } catch (e) { toast(e.message || "Export failed."); }
}
$("#exportMenu").addEventListener("click", (e) => { const b = e.target.closest("[data-export]"); if (b) doExport(b.dataset.export); });

/* ---------- menus, dialogs, sheets ---------- */
function closeMenus() {
  $("#exportMenu").hidden = true; $("#exportBtn").setAttribute("aria-expanded", "false");
  $("#topBar").classList.remove("menu-open"); $("#moreBtn").setAttribute("aria-expanded", "false");
}
$("#exportBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const m = $("#exportMenu"), open = m.hidden;
  closeMenus();
  m.hidden = !open; $("#exportBtn").setAttribute("aria-expanded", String(open));
  if (open && shell) {
    // The toolbar pill scrolls sideways, so the menu is placed on the page under the button.
    const r = $("#exportBtn").getBoundingClientRect();
    Object.assign(m.style, { top: Math.round(r.bottom + 6) + "px", right: Math.max(8, Math.round(innerWidth - r.right)) + "px", left: "auto" });
  }
  if (open) m.querySelector("button")?.focus();
});
$("#exportMenu").addEventListener("keydown", (e) => {
  const items = $$("#exportMenu [data-export]"), i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
});
$("#moreBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const open = !$("#topBar").classList.contains("menu-open");
  closeMenus();
  $("#topBar").classList.toggle("menu-open", open); $("#moreBtn").setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => { if (!e.target.closest(".export-wrap, #fileGroup, #moreBtn")) closeMenus(); });
const SHEET_PANEL = { brush: "tools", layers: "layers" };
function toggleSheet(name) {
  const b = document.body;
  if (shell) {
    // In the editor frame the brush settings and layers live in the side panel (a bottom sheet on phones).
    if (!name || framePanel === SHEET_PANEL[name]) shell.closePanel(); else shell.openPanel(SHEET_PANEL[name]);
    return;
  }
  if (!name || b.dataset.sheet === name) delete b.dataset.sheet; else b.dataset.sheet = name;
  $("#brushSheetBtn").setAttribute("aria-expanded", String(b.dataset.sheet === "brush"));
  $("#layersSheetBtn").setAttribute("aria-expanded", String(b.dataset.sheet === "layers"));
}
$("#colorChip").addEventListener("click", () => toggleSheet("brush"));
$("#brushSheetBtn").addEventListener("click", () => toggleSheet("brush"));
$("#layersSheetBtn").addEventListener("click", () => toggleSheet("layers"));
for (const b of $$("[data-close-sheet]")) b.addEventListener("click", () => toggleSheet(null));

const presetList = $("#presetList");
for (const p of PRESETS) {
  const k = 40 / Math.max(p.w, p.h);
  const lab = document.createElement("label");
  lab.className = "preset"; lab.dataset.preset = p.id;
  lab.innerHTML = `<input type="radio" name="preset" value="${p.id}"${p.id === "square" ? " checked" : ""}><span class="pv" style="width:${Math.round(p.w * k)}px;height:${Math.round(p.h * k)}px"></span><b></b><small></small>`;
  lab.querySelector("b").textContent = p.label;
  lab.querySelector("small").textContent = p.id === "custom" ? p.note : `${p.w} × ${p.h}`;
  lab.title = p.note;
  presetList.append(lab);
}
presetList.addEventListener("change", () => { $("#customSize").hidden = presetList.querySelector("input:checked")?.value !== "custom"; });
$("#newBtn").addEventListener("click", () => { closeMenus(); openDialog($("#newDialog")); });
$("#newCancel").addEventListener("click", () => closeDialog($("#newDialog")));
$("#newCreate").addEventListener("click", async () => {
  const id = presetList.querySelector("input:checked")?.value || "square", p = PRESETS.find((x) => x.id === id);
  const [w, h] = id === "custom" ? clampSize($("#customW").value, $("#customH").value) : [p.w, p.h];
  closeDialog($("#newDialog"));
  if (state.saveStatus !== "saved") await saveNow();
  newDoc({ w, h, background: $("#newBg").value });
  toast(`New ${w} × ${h} drawing`);
});
$("#drawingsBtn").addEventListener("click", () => { closeMenus(); showDrawings(); });
$("#drawingsClose").addEventListener("click", () => closeDialog($("#drawingsDialog")));
async function showDrawings() {
  if (state.saveStatus !== "saved") await saveNow();
  const list = await listProjects("draw").catch(() => []), ul = $("#drawingsList");
  ul.replaceChildren();
  if (!list.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "No saved drawings yet."; ul.append(li); }
  for (const p of list) {
    const li = document.createElement("li");
    if (p.id === state.doc?.id) li.className = "on";
    li.innerHTML = `<img alt=""><b></b><small></small><div class="row"><button class="btn sm primary" data-open>Open</button><button class="btn sm danger" data-del>Delete</button></div>`;
    if (p.thumb) li.querySelector("img").src = p.thumb;
    li.querySelector("b").textContent = p.name || "Drawing";
    li.querySelector("small").textContent = `${p.data?.width || "?"} × ${p.data?.height || "?"} · ${new Date(p.updated).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
    li.querySelector("[data-open]").addEventListener("click", async () => {
      try { const rec = await getProject(p.id); await loadDrawing(rec.data, { id: rec.id }); closeDialog($("#drawingsDialog")); toast(`Opened "${rec.name}"`); } catch (e) { toast(e.message || "This drawing can't be opened."); }
    });
    const del = li.querySelector("[data-del]");
    let armed = null;
    del.addEventListener("click", async () => {
      if (!armed) { del.textContent = "Tap again to delete"; armed = setTimeout(() => { armed = null; del.textContent = "Delete"; }, 3000); return; }
      clearTimeout(armed);
      await deleteProject(p.id);
      if (p.id === state.doc.id) newDoc({}, { save: false });
      showDrawings();
    });
    ul.append(li);
  }
  openDialog($("#drawingsDialog"));
}

/* ---------- keyboard ---------- */
const KEYS = { p: "pencil", m: "marker", w: "glow", l: "highlighter", a: "airbrush", k: "calligraphy", s: "smudge", e: "eraser", g: "fill", u: "shape", t: "text", i: "picker", v: "move", h: "hand" };
$("#undoBtn").addEventListener("click", undo);
$("#redoBtn").addEventListener("click", redo);
$("#zoomIn").addEventListener("click", () => zoomTo(state.cam.zoom * 1.25));
$("#zoomOut").addEventListener("click", () => zoomTo(state.cam.zoom / 1.25));
$("#zoomPct").addEventListener("click", fit);
textInput.addEventListener("input", positionTextInput);
textInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
  else if (e.key === "Escape") { e.preventDefault(); cancelText(); }
});
textInput.addEventListener("blur", () => { if (textEdit && !textEdit.placing) commitText(); });
window.addEventListener("keydown", (e) => {
  if (isTyping(e.target)) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (textEdit && e.target !== textInput && !mod && !e.altKey) {
    // The text box is open but the key landed elsewhere: it belongs to the text, never to the tool shortcuts.
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); return; }
    if (e.key === "Escape") { e.preventDefault(); cancelText(); return; }
    if (e.key.length === 1) { textInput.focus({ preventScroll: true }); return; }
  }
  if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && k === "y") { e.preventDefault(); redo(); return; }
  if (mod && k === "s") { e.preventDefault(); saveNow().then(() => toast("Saved in this browser")); return; }
  if (mod || e.altKey) return;
  if (e.key === " " && (e.target === document.body || stage.contains(e.target))) { e.preventDefault(); if (!spaceDown) { spaceDown = true; stage.classList.add("grab"); } return; }
  if (e.key === "Escape") { closeMenus(); if (document.body.dataset.sheet) toggleSheet(null); return; }
  if (e.target.closest?.("dialog")) return;
  if (k === "b") { setTool(state.lastBrush); return; }
  if (KEYS[k]) { setTool(KEYS[k]); return; }
  if (e.key === "[") { changeSize(-1); return; }
  if (e.key === "]") { changeSize(1); return; }
  if (e.key === "+" || e.key === "=") { zoomTo(state.cam.zoom * 1.25); return; }
  if (e.key === "-") { zoomTo(state.cam.zoom / 1.25); return; }
  if (e.key === "0") fit();
});
window.addEventListener("keyup", (e) => { if (e.key === " ") { spaceDown = false; stage.classList.remove("grab"); } });
window.addEventListener("blur", () => { spaceDown = false; stage.classList.remove("grab"); });

/* ---------- editor frame: toolbar pill, templates, elements, text, panels ---------- */
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
}
const TOOL_ICON = (t) => document.querySelector(`.tool[data-tool="${t}"] svg`)?.outerHTML || "";
// Context toolbar (the floating pill over the canvas): brush, colour, size, opacity, eraser, undo/redo, zoom, export.
const pillBrush = el("button", { type: "button", class: "btn pill-brush", id: "pillBrush", title: "Brushes and tools", "aria-label": "Brushes and tools" });
pillColor = el("input", { type: "color", id: "pillColor", value: "#1f2937", "aria-label": "Colour" });
const pillSize = el("input", { type: "range", id: "pillSize", min: "1", max: "200", value: "8", "aria-label": "Brush size" });
const pillSizeVal = el("output", { class: "pill-val", id: "pillSizeVal", text: "8" });
const pillOpacity = el("input", { type: "range", id: "pillOpacity", min: "1", max: "100", value: "100", "aria-label": "Opacity" });
const pillOpacityVal = el("output", { class: "pill-val", id: "pillOpacityVal", text: "100%" });
const pillEraser = el("button", { type: "button", class: "btn sq pill-eraser", id: "pillEraser", title: "Eraser (E)", "aria-label": "Eraser", "aria-pressed": "false" });
const ASSIST_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15c2-6 5-9 8-7s1 7 4 7 3-3 4-5"/><circle cx="17" cy="6" r="3" stroke-dasharray="2 2"/></svg>';
const pillAssist = el("button", { type: "button", class: "btn pill-assist", id: "shapeAssist", title: "Shape assist: rough lines, arrows, boxes, circles, stars and hearts become clean shapes", "aria-label": "Shape assist", "aria-pressed": String(state.shapeAssist), html: ASSIST_ICON + "<span>Shape assist</span>", onclick: () => { setShapeAssist(!state.shapeAssist); toast(state.shapeAssist ? "Shape assist on: draw a rough line, arrow, box, circle, triangle, diamond, star or heart." : "Shape assist off. Hold still at the end of a stroke to snap one shape."); } });
const pillStudio = el("button", { type: "button", class: "btn pill-studio", id: "drawStudio", title: "Open this drawing in Studio to add text, shapes and pages", "aria-label": "Open in Studio", text: "Open in Studio", onclick: () => openInStudio() });
const pill = el("div", { class: "draw-pill", id: "drawPill", role: "toolbar", "aria-label": "Brush settings" },
  pillBrush, el("span", { class: "pill-sep", "aria-hidden": "true" }),
  el("label", { class: "pill-color", title: "Colour" }, pillColor, el("span", { class: "chip", "aria-hidden": "true" })),
  el("label", { class: "pill-range", title: "Size" }, el("span", { class: "pill-lbl", text: "Size" }), pillSize, pillSizeVal),
  el("label", { class: "pill-range", title: "Opacity" }, el("span", { class: "pill-lbl", text: "Opacity" }), pillOpacity, pillOpacityVal),
  pillEraser, pillAssist, el("span", { class: "pill-sep", "aria-hidden": "true" }));
let paintTool = "pen";
function syncPill() {
  const t = state.tool, s = state.settings[t] || {};
  if (t !== "eraser" && BRUSHES[t]) paintTool = t;
  pillBrush.innerHTML = TOOL_ICON(t) + `<span>${LABEL[t] || "Brush"}</span>`;
  pillEraser.innerHTML = TOOL_ICON("eraser");
  pillEraser.setAttribute("aria-pressed", String(t === "eraser")); pillEraser.classList.toggle("on", t === "eraser");
  pillSize.min = sizeRange.min; pillSize.max = sizeRange.max;
  pillSize.disabled = s.size == null; pillOpacity.disabled = s.opacity == null;
  if (s.size != null) { pillSize.value = s.size; pillSizeVal.textContent = Math.round(s.size); }
  if (s.opacity != null) { pillOpacity.value = Math.round(s.opacity * 100); pillOpacityVal.textContent = Math.round(s.opacity * 100) + "%"; }
  for (const b of document.querySelectorAll("[data-brush]")) { const on = b.dataset.brush === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }
}
pillBrush.addEventListener("click", () => { if (shell) shell.openPanel("tools"); });
pillColor.addEventListener("input", () => setColor(pillColor.value));
pillColor.addEventListener("change", () => addRecent(pillColor.value));
pillSize.addEventListener("input", () => {
  const s = cur(); if (s.size == null) return;
  s.size = +pillSize.value; sizeRange.value = pillSize.value; $("#sizeVal").textContent = pillSize.value + " px"; pillSizeVal.textContent = pillSize.value;
  saveSettings(); requestRender(); positionTextInput();
});
pillOpacity.addEventListener("input", () => {
  const s = cur(); if (s.opacity == null) return;
  s.opacity = +pillOpacity.value / 100; opacityRange.value = pillOpacity.value; $("#opacityVal").textContent = pillOpacity.value + "%"; pillOpacityVal.textContent = pillOpacity.value + "%";
  saveSettings(); positionTextInput();
});
pillEraser.addEventListener("click", () => setTool(state.tool === "eraser" ? paintTool : "eraser"));

/* Templates: our own vector artwork (gallery.js) painted onto layers of a new drawing. */
async function svgImage(text) {
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("The template picture could not be drawn.")); img.src = url; });
    return { img, done: () => URL.revokeObjectURL(url) };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}
// An SVG drawn as a picture cannot load other files, so the library photos in a template (same-origin
// /pdf-editor/photos/…) are put inside it as data: URLs first. A photo that cannot be read is left out: the
// template keeps its neutral photo frame colour and still opens.
const photoData = new Map();
async function inlinePhotos(text) {
  const re = /href="(\/pdf-editor\/photos\/[^"]+)"/g;
  const urls = [...new Set([...text.matchAll(re)].map((m) => m[1]))];
  await Promise.all(urls.filter((u) => !photoData.has(u)).map(async (u) => {
    try {
      const r = await fetch(u);
      if (!r.ok) return;
      const blob = await r.blob();
      const data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result || "")); fr.onerror = () => res(""); fr.readAsDataURL(blob); });
      if (/^data:image\//.test(data)) { if (photoData.size > 24) photoData.clear(); photoData.set(u, data); }
    } catch {}
  }));
  return text.replace(re, (m, u) => `href="${photoData.get(u) || ""}"`);
}
async function applyTemplate(id, { fresh = false } = {}) {
  const t = templateById(id);
  if (!t) { toast("That template was not found."); return false; }
  if (!fresh && state.saveStatus !== "saved") await saveNow();
  // One layer per part of the artwork (frame/background, photos, lines/guides, title), bottom to top.
  const list = (typeof templateParts === "function" && templateParts(id)) || [];
  const src = list.length ? list : [{ name: t.full ? t.name : t.colouring ? "Lines" : "Template", svg: templateSvg(id) }];
  const imgs = [];
  try { for (const p of src) imgs.push({ name: p.name, ...(await svgImage(await inlinePhotos(p.svg))) }); }
  catch (e) { imgs.forEach((x) => x.done()); throw e; }
  newDoc({ w: t.w, h: t.h, background: t.bg, name: t.name }, { save: false });
  const d = state.doc, base = d.layers[0];
  const layers = imgs.map((im, i) => {
    const l = i ? makeLayer(String(im.name).slice(0, 60)) : base;
    if (!i) base.name = String(im.name).slice(0, 60);
    l.ctx.drawImage(im.img, 0, 0, d.w, d.h);
    im.done();
    return l;
  });
  if (t.colouring) {
    // Colour goes on a layer under the lines, so the lines stay sharp; the bucket looks at all layers.
    const c = makeLayer("Colours"); d.layers = [...layers.slice(0, -1), c, layers[layers.length - 1]]; d.active = c;
    state.settings.fill.sampleAll = true; saveSettings();
  } else if (!t.full) { const top = makeLayer("Drawing"); d.layers = [...layers, top]; d.active = top; }
  else { d.layers = layers; d.active = layers[0]; }
  renderLayerList(); syncOptions();
  layers.slice(1).forEach((l) => { l.version++; queueThumb(l); });
  markChanged(base);
  if (t.colouring) setTool("fill");
  toast(t.colouring ? "Colouring page ready: pick a colour and tap inside a shape." : `Template "${t.name}" opened. Your last drawing is in My drawings.`);
  try { shell?.pushRecent?.(id); if (!fresh && matchMedia("(max-width: 759.98px)").matches) shell?.closePanel?.(); } catch {}
  return true;
}

/* Elements: shapes stamped onto the selected layer in the current colour. Paths use a 100 × 100 box. */
const STAMPS = [
  ["square", "Square", "M10 10H90V90H10Z"], ["circle", "Circle", "M8 50a42 42 0 1 0 84 0a42 42 0 1 0 -84 0Z"], ["triangle", "Triangle", "M50 8L92 90H8Z"],
  ["star", "Star", "M50 6l12.4 27.6 30 3.2-22.5 20.2 6.4 29.6L50 71.4 23.7 86.6l6.4-29.6L7.6 36.8l30-3.2Z"],
  ["heart", "Heart", "M50 88C20 66 6 50 6 32 6 18 17 8 30 8c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 24 0 18-14 34-44 56Z"],
  ["arrow", "Arrow", "M6 40H60V18L94 50 60 82V60H6Z"], ["speech", "Speech bubble", "M14 12H86a8 8 0 0 1 8 8V62a8 8 0 0 1-8 8H44L24 90l4-20H14a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8Z"],
  ["cloud", "Cloud", "M28 78C14 78 6 68 6 57c0-11 9-20 20-20 2-15 14-25 28-25 13 0 24 8 27 20 9 1 16 9 16 19 0 15-11 27-26 27Z"],
  ["hexagon", "Hexagon", "M28 8H72L94 50 72 92H28L6 50Z"], ["moon", "Moon", "M62 8A42 42 0 1 0 92 66 34 34 0 1 1 62 8Z"],
  ["bolt", "Lightning", "M58 4L18 56H46L38 96 82 40H54Z"], ["diamond", "Diamond", "M50 4L94 50 50 96 6 50Z"],
];
let stampOutline = false;
function stampShape(id, { outline = stampOutline } = {}) {
  const sh = STAMPS.find((s) => s[0] === id), layer = activeLayer();
  if (!sh || !canDraw(layer) || typeof Path2D !== "function") return false;
  const d = state.doc, size = Math.round(Math.min(d.w, d.h) * 0.36), x = Math.round((d.w - size) / 2), y = Math.round((d.h - size) / 2), k = size / 100;
  const lw = Math.max(2, state.settings.shape.size || 6);
  editRegion(layer, [x - lw, y - lw, x + size + lw, y + size + lw], (ctx) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const path = new Path2D(sh[2]);
    if (outline) { ctx.lineWidth = lw / k; ctx.lineJoin = "round"; ctx.strokeStyle = state.color; ctx.stroke(path); } else { ctx.fillStyle = state.color; ctx.fill(path); }
    ctx.restore();
  });
  addRecent(state.color);
  return true;
}
function renderElementsPanel(box) {
  const svgOf = (d) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/></svg>`;
  const outline = el("label", { class: "check" }, el("input", { type: "checkbox", id: "stampOutline", onchange: (e) => { stampOutline = e.target.checked; grid.classList.toggle("outline", stampOutline); } }), " Outline only");
  const grid = el("div", { class: "stamp-grid" }, STAMPS.map(([id, label, d]) => el("button", { type: "button", class: "stamp", "data-stamp": id, title: `Add a ${label.toLowerCase()}`, "aria-label": `Add a ${label.toLowerCase()}`, html: svgOf(d), onclick: () => { if (stampShape(id)) toast(`${label} added in the current colour`); } })));
  const draw = (kind, label) => el("button", { type: "button", class: "btn sm", "data-draw-shape": kind, text: label, onclick: () => { state.settings.shape.kind = kind; setTool("shape"); toast("Drag on the canvas to draw it."); } });
  box.append(
    el("p", { class: "muted small", text: "Shapes go in the middle of the selected layer, in the colour you picked." }), outline, grid,
    el("h3", { class: "panel-h3", text: "Draw your own" }), el("div", { class: "row wrap" }, draw("line", "Line"), draw("rect", "Box"), draw("ellipse", "Circle")));
}

/* Text: ready-made text styles written in the middle of the canvas, or the Text tool to place it yourself. */
async function insertText(str, { size = 64, bold = false, font = state.settings.text.font } = {}) {
  const layer = activeLayer(), text = String(str || "").trim();
  if (!text || !canDraw(layer)) return false;
  const d = state.doc, px = Math.max(8, Math.round(size * Math.max(d.w, d.h) / 1080));
  await ensureFont(font, bold).catch(() => null);
  const f = `${bold ? 700 : 400} ${px}px ${fontCss(font)}`, lines = text.split("\n"), lh = px * 1.25;
  layer.ctx.save(); layer.ctx.font = f;
  const wmax = Math.min(d.w, Math.max(...lines.map((l) => layer.ctx.measureText(l).width)));
  layer.ctx.restore();
  const x = Math.round((d.w - wmax) / 2), y = Math.round((d.h - lh * lines.length) / 2), color = state.color;
  editRegion(layer, [x - 8, y - 8, x + wmax + px * 0.5 + 8, y + lh * lines.length + px * 0.5], (ctx) => {
    ctx.save(); ctx.font = f; ctx.textBaseline = "top"; ctx.fillStyle = color;
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh + (lh - px) / 2));
    ctx.restore();
  });
  addRecent(color);
  return true;
}
function renderTextPanel(box) {
  const styles = [["Add a heading", 120, true, "heading"], ["Add a subheading", 72, true, "subheading"], ["Add a little body text", 44, false, "body"]];
  box.append(
    el("button", { type: "button", class: "btn primary block", "data-text-tool": "1", text: "Type on the canvas", onclick: () => { setTool("text"); toast("Tap the canvas where the text should go, type, then press Enter."); } }),
    el("h3", { class: "panel-h3", text: "Default text styles" }),
    ...styles.map(([label, size, bold, kind]) => el("button", { type: "button", class: `text-style ${kind}`, "data-text-style": kind, text: label, onclick: async () => { if (await insertText(label.replace(/^Add an? (little )?/, "").replace(/^./, (c) => c.toUpperCase()), { size, bold })) toast("Text added. Undo removes it."); } })),
    el("h3", { class: "panel-h3", text: "Fonts" }),
    el("div", { class: "font-list" }, Object.entries(FONT_FAMILIES).map(([k, f]) => el("button", { type: "button", class: "font-pick", "data-font": k, style: `font-family:${f.css}`, text: f.label, onclick: () => { state.settings.text.font = k; fontSel.value = k; saveSettings(); ensureFont(k, false).catch(() => {}); toast(`Font: ${f.label}`); } }))));
}
function renderBrushesPanel(box) {
  const ids = [...Object.keys(BRUSHES), "fill", "shape", "text", "picker", "move"];
  box.append(el("div", { class: "brush-grid" }, ids.map((t) => el("button", { type: "button", class: "brush-pick", "data-brush": t, "aria-pressed": "false", title: LABEL[t], html: TOOL_ICON(t) + `<span>${LABEL[t]}</span>`, onclick: () => setTool(t) }))));
  box.append(el("div", { class: "assist-row" },
    el("button", { type: "button", class: "btn sm assist-toggle" + (state.shapeAssist ? " on" : ""), id: "shapeAssistToggle", "aria-pressed": String(state.shapeAssist), html: ASSIST_ICON + "<span>Shape assist</span>", onclick: () => setShapeAssist(!state.shapeAssist) }),
    el("p", { class: "muted small", text: "Draw a rough line, arrow, box, circle, triangle, diamond, star or heart with the pen, pencil, marker or highlighter: it becomes a clean shape. Or hold still for a moment at the end of a stroke." })));
  box.append($("#brushPanel"));
  syncPill();
}
function renderLayersPanel(box) { box.append($("#layersPanel")); }

async function insertPicture(src, name) {
  const blob = typeof src === "string" ? dataUrlToBlob(src) : src;
  const f = typeof File === "function" ? new File([blob], name || "Picture", { type: blob.type || "image/png" }) : Object.assign(blob, { name: name || "Picture" });
  await importImage(f);
}

async function mountFrame() {
  let mod = null;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("The editor frame could not load", e); return null; }
  if (typeof mod?.mountShell !== "function") return null;
  const stageWrap = document.querySelector("main.work");
  pill.append($(".grp.hist"), el("span", { class: "pill-sep", "aria-hidden": "true" }), $(".grp.zoom"), $(".export-wrap"), pillStudio);
  try {
    shell = mod.mountShell({
      app: "draw", kind: "Drawing", title: state.doc?.name || "My drawing", home: "/tools/draw",
      onTitle: (t) => { if (!state.doc) return; state.doc.name = String(t || "").trim().slice(0, 80) || "My drawing"; $("#docName").value = state.doc.name; scheduleSave(); },
      stage: stageWrap, toolbar: pill, formulaBar: null, resize: { label: "Resize", open: () => openResize() },
      file: [
        { label: "New drawing…", act: () => $("#newBtn").click(), hint: "Pick a canvas size" },
        { label: "Resize canvas…", act: () => openResize(), hint: "Scale the drawing or change the canvas" },
        { label: "New blank square drawing", act: async () => { if (state.saveStatus !== "saved") await saveNow(); newDoc({}); toast("New 1080 × 1080 drawing"); } },
        { label: "My drawings…", act: () => $("#drawingsBtn").click() },
        { label: "Add an image as a layer…", act: () => $("#importInput").click() },
        { label: "Open a drawing file…", act: () => $("#openFile").click() },
        { label: "Download PNG", group: "Download", act: () => doExport("png") },
        { label: "Download PNG (transparent)", group: "Download", act: () => doExport("png-clear") },
        { label: "Download JPG", group: "Download", act: () => doExport("jpg") },
        { label: "Save drawing file (keeps layers)", group: "Download", act: () => doExport("json") },
        { label: "Open in Studio", group: "Download", act: () => openInStudio(), hint: "Add text, shapes and pages" },
        { label: "Undo", group: "Edit", act: undo },
        { label: "Redo", group: "Edit", act: redo },
        { label: "Add a layer", group: "Edit", act: addLayer },
        { label: "Fit the drawing on screen", group: "View", act: fit },
      ],
      share: { download: [{ label: "PNG", act: () => doExport("png") }, { label: "PNG (transparent)", act: () => doExport("png-clear") }, { label: "JPG", act: () => doExport("jpg") }, { label: "Drawing file", act: () => doExport("json") }], link: () => location.origin + "/tools/draw" },
      templates: { gallery: { TEMPLATES: GALLERY, thumb: templateThumb }, tool: "draw", apply: (id) => applyTemplate(id), placeholder: "Search Draw templates" },
      panels: {
        tools: { label: "Brushes", icon: "tools", render: (b) => renderBrushesPanel(b) },
        elements: (b) => renderElementsPanel(b),
        text: (b) => renderTextPanel(b),
        layers: { label: "Layers", icon: "pages", render: (b) => renderLayersPanel(b) },
      },
      rail: ["templates", "tools", "elements", "text", "layers", "brand", "uploads", "projects", "apps"],
      insert: {
        image: (src, name) => insertPicture(src, name),
        text: (str, style) => insertText(str, style === "heading" || style === "h1" ? { size: 120, bold: true } : style === "subheading" || style === "h2" ? { size: 72, bold: true } : { size: 44 }),
        color: (hex) => { setColor(hex); addRecent(state.color); },
        font: (key) => { if (FONT_FAMILIES[key]) { state.settings.text.font = key; fontSel.value = key; saveSettings(); toast(`Text font: ${FONT_FAMILIES[key].label}. Pick Text and tap the canvas.`); } },
      },
      projects: {
        save: async () => { await saveNow(); return { name: state.doc.name, data: await drawingJson(), thumb: thumbDataUrl() }; },
        open: async (rec) => { const p = rec?.data ? rec : await getProject(rec?.id); if (state.saveStatus !== "saved") await saveNow(); await loadDrawing(p.data, { id: p.id }); },
      },
      bottom: {
        notes: true, outline: null, timer: true, fullscreen: true, help: true, pages: null,
        zoom: { get: () => Math.round(state.cam.zoom * 100), set: (pct) => zoomTo(clamp(pct, 5, 800) / 100), min: 5, max: 800 },
      },
      shortcuts: [["B", "Brush"], ["W", "Glow pen"], ["L", "Highlighter"], ["E", "Eraser"], ["G", "Paint bucket"], ["U", "Shapes"], ["T", "Text"], ["I", "Colour picker"], ["H / Space", "Move the view"], ["[ and ]", "Brush size"], ["+ / - / 0", "Zoom in, out, fit"]],
      onPanel: (id) => {
        framePanel = id;
        const sheet = id === "tools" ? "brush" : id === "layers" ? "layers" : null;
        if (sheet) document.body.dataset.sheet = sheet; else delete document.body.dataset.sheet;
        $("#brushSheetBtn").setAttribute("aria-expanded", String(sheet === "brush"));
        $("#layersSheetBtn").setAttribute("aria-expanded", String(sheet === "layers"));
      },
      setMode: (mode) => { state.mode = mode; if (mode !== "edit") { abortStroke(); cancelText(); } },
    });
    // Render the brush and layer panels now, so their controls exist in the frame before the first open.
    shell.panel?.("tools"); shell.panel?.("layers");
    document.body.classList.add("has-shell");
    if (state.doc) { shell.setTitle?.(state.doc.name); shell.setProjectId?.(state.doc.id); }
    return shell;
  } catch (e) {
    console.warn("The editor frame could not start", e);
    shell = null;
    const bar = $("#topBar"), st = $("#saveStatus");
    for (const g of [pill.querySelector(".grp.hist"), pill.querySelector(".grp.zoom")]) if (g) bar.insertBefore(g, st);
    const ex = pill.querySelector(".export-wrap"); if (ex) bar.append(ex);
    return null;
  }
}

/* ---------- Open in Studio: the flattened drawing as one picture on a page of the same size ---------- */
const STUDIO_FILTERS = { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 };
function designForStudio() {
  const d = state.doc, c = bufferToCanvas(flatten(false));
  const src = c.toDataURL("image/png");
  return {
    version: 1, name: d.name || "My drawing",
    preset: { id: "custom", label: "Custom size", w: d.w, h: d.h, unit: "px", dpi: 96, bleed: 0 },
    pages: [{ id: "p" + uid(), background: { color: d.background || "#ffffff" }, layers: [{
      id: "l" + uid(), type: "image", name: "Drawing", x: 0, y: 0, w: d.w, h: d.h, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null,
      image: { src, crop: { x: 0, y: 0, w: 1, h: 1 }, filters: { ...STUDIO_FILTERS }, radius: 0, flipX: false, flipY: false, nw: d.w, nh: d.h },
    }] }],
  };
}
async function openInStudio() {
  if (!state.doc) return;
  try {
    if (state.saveStatus !== "saved") await saveNow();
    const id = await putHandoff({ type: "design", design: designForStudio() });
    location.href = "/design/studio/?handoff=" + id;
  } catch (e) { toast(e.message || "Could not open Studio."); }
}

/* ---------- start ---------- */
if (typeof ResizeObserver === "function") new ResizeObserver(() => resizeView()).observe(stage);
window.addEventListener("resize", resizeView);

window.adApp = {
  state, history,
  setTool, setColor, undo, redo, fit, addLayer, deleteLayer, moveLayer, duplicateLayer, mergeDown,
  newDrawing: (o) => newDoc(o), load: (json) => loadDrawing(json), importImage, flushSave: () => saveNow(),
  exportPng, exportJpg, exportJson,
  getPixel(which, x, y, { background = false } = {}) {
    if (which === "composite") return compositePixel(x, y, background);
    const l = state.doc.layers[which];
    return l ? [...l.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data] : null;
  },
  layers: () => state.doc.layers.map((l) => ({ name: l.name, opacity: l.opacity, hidden: l.hidden, active: l === state.doc.active })),
  docToScreen, screenToDoc,
  applyTemplate, templates: () => GALLERY.map((t) => t.id), templateInfo: (id) => templateById(id), stampShape, insertText, zoomTo: (pct) => zoomTo(pct / 100),
  resizeCanvas, openResize,
  recogniseShape: (points, o) => recognise(points, o), setShapeAssist, designForStudio, openInStudio,
  /** the colours shown under "In this drawing", worked out now */
  docColors: () => { refreshDocColors(true); return [...document.querySelectorAll("#docColors .swatch")].map((b) => b.dataset.color); },
  setSize,
  get shell() { return shell; },
};

async function start() {
  await mountFrame();
  renderBrandSwatches();
  renderSwatches($("#recentColors"), state.recent, "Recent colour");
  setColor(state.recent[0] || state.color);
  setTool("pen");
  resizeView();
  const params = new URLSearchParams(location.search);
  const tplId = params.get("template");
  let restored = false;
  if (!params.has("new") && !tplId) {
    try {
      const id = params.get("id");
      const p = id ? await getProject(id) : (await listProjects("draw"))[0];
      if (p?.data) { await loadDrawing(p.data, { id: p.id }); restored = true; }
    } catch (e) { console.warn("Could not restore the last drawing", e); }
  }
  if (!restored) newDoc({}, { save: false });
  if (tplId) {
    if (templateById(tplId)) { try { await applyTemplate(tplId, { fresh: true }); } catch (e) { console.warn(e); toast(e.message || "That template could not open."); } }
    else toast("That template was not found. Here is a blank drawing.");
  }
  state.ready = true;
  document.body.classList.add("ready");
}
start();
