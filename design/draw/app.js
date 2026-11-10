// AsaanDesk Draw: bitmap painting with layers, brushes, pen pressure, fill, shapes and text. Everything runs in the
// browser and is saved only on this device (IndexedDB). Pixel maths lives in paint.js, undo in history.js.
import { BRUSHES, Stroke, stampMask, applyMask, clearMask, smudgeDab, floodFill, growMask, fillMask, composite, hexToRgb, rgbToHex, normHex, pushRecent, clamp, unionRect } from "./paint.js";
import { History, rectTileKeys, tileRect, copyRegion, makeTiles } from "./history.js";
import { nextLayerName, insertAt, removeAt, moveItem, afterDelete } from "./layers.js";
import { serializeDrawing, parseDrawing, PRESETS, clampSize, slugName, FILE_EXT } from "./fileformat.js";
import { saveProject, listProjects, getProject, deleteProject, uid } from "../shared/store.js";
import { loadBrand, FONT_FAMILIES, ensureFont } from "../shared/brand.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const TOOLS = [...Object.keys(BRUSHES), "fill", "shape", "text", "picker", "hand"];
const LABEL = { ...Object.fromEntries(Object.entries(BRUSHES).map(([k, b]) => [k, b.label])), fill: "Paint bucket", shape: "Shapes", text: "Text", picker: "Colour picker", hand: "Move the view" };
const HINT = {
  pencil: "Light, grainy lines, like a real pencil.",
  pen: "Smooth ink. With a stylus, press harder for thicker lines.",
  marker: "See-through ink. One stroke does not get darker where it crosses itself.",
  airbrush: "Soft spray. Go over an area again to build up colour.",
  calligraphy: "A flat nib: lines turn thick or thin with the direction.",
  smudge: "Drag to blend and push colours around.",
  eraser: "Rubs out paint on the selected layer.",
  fill: "Tap inside an area to fill it. A bigger colour range also fills similar colours.",
  shape: "Drag to draw. Hold Shift for a square, a circle or a straight line.",
  text: "Tap where the text should go, type, then press Enter.",
  picker: "Tap the drawing to take its colour. Tip: hold Alt while painting.",
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
};
const history = new History();
try { state.recent = (JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") || []).map(normHex).filter(Boolean).slice(0, 12); } catch {}
const brand = loadBrand();
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
function afterHistory() { renderLayerList(); updateHistoryButtons(); scheduleSave(); requestRender(); }
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
  scheduleSave(); updateHistoryButtons(); requestRender();
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
  };
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
function endStroke(pt) {
  const st = stroke;
  if (!st) return;
  if (pt) addDabs(st.engine.end({ ...pt, p: st.lastP ?? 1 }));
  flushStroke();
  const { w, h } = state.doc;
  const tiles = makeTiles(st.keys, { width: w, height: h, data: st.base }, st.cur);
  clearMask(maskBuf, w, st.total);
  stroke = null;
  if (tiles.length) pushHistory({ kind: "pixels", layer: st.layer, tiles });
  if (st.mode === "paint") addRecent(rgbToHex(st.rgb));
  markChanged(st.layer);
}
function abortStroke() {
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
  if (document.body.dataset.sheet) { toggleSheet(null); return; }
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
    const list = e.getCoalescedEvents?.() || [];
    for (const ce of list.length ? list : [e]) {
      const pt = toDoc(ce);
      if (ce.pointerType === "pen" && !(ce.pressure > 0)) pt.p = stroke.lastP;
      stroke.lastP = pt.p;
      addDabs(stroke.engine.move(pt));
    }
    scheduleFlush();
  } else if (shapeDraft && e.pointerId === shapeDraft.pointerId) moveShape(e);
  else if (BRUSHES[state.tool]) requestRender();
}
function onUp(e) {
  pointers.delete(e.pointerId);
  try { stage.releasePointerCapture(e.pointerId); } catch {}
  if (gesture) { if (touchList().length < 2) gesture = null; return; }
  if (pan && e.pointerId === pan.id) { pan = null; stage.classList.remove("panning"); return; }
  if (stroke && e.pointerId === stroke.pointerId) { endStroke(e.type === "pointercancel" ? null : toDoc(e)); return; }
  if (shapeDraft && e.pointerId === shapeDraft.pointerId) { if (e.type !== "pointercancel") moveShape(e); commitShape(); }
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
  if (s.size != null) { sizeRange.value = s.size; $("#sizeVal").textContent = Math.round(s.size) + " px"; }
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
sizeRange.addEventListener("input", () => { cur().size = +sizeRange.value; $("#sizeVal").textContent = sizeRange.value + " px"; saveSettings(); requestRender(); positionTextInput(); });
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
for (const box of [$("#brandColors"), $("#recentColors")]) box.addEventListener("click", (e) => { const b = e.target.closest(".swatch"); if (b) setColor(b.dataset.color); });
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
  $("#bgColor").value = d.background;
  $("#sizeInfo").textContent = `${d.w} × ${d.h} px`;
  renderLayerList(); updateHistoryButtons();
  state.cam.fitted = true;
  fit();
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

/* ---------- saving ---------- */
const STATUS_TEXT = { saved: "Saved", saving: "Saving…", unsaved: "Not saved yet", error: "Could not save" };
function setStatus(s) { state.saveStatus = s; const el = $("#saveStatus"); el.dataset.state = s; el.querySelector("span").textContent = STATUS_TEXT[s]; el.title = STATUS_TEXT[s] + " (in this browser)"; }
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
function toggleSheet(name) {
  const b = document.body;
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
const KEYS = { p: "pencil", m: "marker", a: "airbrush", k: "calligraphy", s: "smudge", e: "eraser", g: "fill", u: "shape", t: "text", i: "picker", h: "hand" };
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
};

async function start() {
  renderBrandSwatches();
  renderSwatches($("#recentColors"), state.recent, "Recent colour");
  setColor(state.recent[0] || state.color);
  setTool("pen");
  resizeView();
  const params = new URLSearchParams(location.search);
  let restored = false;
  if (!params.has("new")) {
    try {
      const id = params.get("id");
      const p = id ? await getProject(id) : (await listProjects("draw"))[0];
      if (p?.data) { await loadDrawing(p.data, { id: p.id }); restored = true; }
    } catch (e) { console.warn("Could not restore the last drawing", e); }
  }
  if (!restored) newDoc({}, { save: false });
  state.ready = true;
  document.body.classList.add("ready");
}
start();
