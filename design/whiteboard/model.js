// Whiteboard document model and editing operations (pure, no DOM).
// Board = { format: 'asaandesk-board', version: 1, name, objects: [Obj] }   (array order = stacking order)
// Obj = { id, type, x, y, w, h, locked, group, ... }   type: note | text | shape | connector | stroke | frame | image | sticker
import { routeConnector, pointsBounds, rectContains, rectsIntersect, pointInOutline, distToPolyline } from "./geometry.js";
import { objectBounds, textLayout, rotatePoint, canRotate } from "./render.js";

export const FORMAT = "asaandesk-board";
export const NOTE_COLORS = [
  { name: "Yellow", value: "#ffe27a" }, { name: "Peach", value: "#ffc29f" }, { name: "Pink", value: "#ffb3cf" }, { name: "Lilac", value: "#d9cbff" },
  { name: "Sky", value: "#b4dcff" }, { name: "Mint", value: "#b7efd2" }, { name: "Lime", value: "#dff28f" }, { name: "White", value: "#ffffff" },
];
export const INK_COLORS = ["#1b2133", "#5b4cf0", "#2f80ff", "#14b8a6", "#22c55e", "#f59e0b", "#ff7a59", "#f43f5e", "#ffffff"];
export const HIGHLIGHT_COLORS = ["#ffe600", "#7cf29c", "#7fd3ff", "#ff9ad5", "#ffb057"];
export const FILL_COLORS = ["#ffffff", "#e8e5fe", "#dbeafe", "#ccfbf1", "#dcfce7", "#fef3c7", "#ffe4e6", "#5b4cf0", "#2f80ff", "#14b8a6", "#f59e0b", "#f43f5e", "#1b2133", "none"];
export const SHAPE_KINDS = [
  { id: "rect", label: "Rectangle" }, { id: "rounded", label: "Rounded" }, { id: "ellipse", label: "Ellipse" },
  { id: "diamond", label: "Diamond" }, { id: "triangle", label: "Triangle" }, { id: "star", label: "Star" },
];

let seq = 0;
export const newId = () => Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
const base = (type, x, y, w, h, extra) => ({ id: newId(), type, x, y, w, h, locked: false, group: null, ...extra });

export const makeNote = ({ x = 0, y = 0, w = 200, h = 200, color = "#ffe27a", text = "", size = 28 } = {}) => base("note", x, y, w, h, { color, text, size, textColor: "#1b2133" });
export function makeText({ x = 0, y = 0, w = 260, text = "", size = 24, color = "#1b2133", bold = false, align = "left" } = {}) {
  const o = base("text", x, y, w, 0, { text, size, color, bold, align });
  o.h = textLayout(o).h;
  return o;
}
export const makeShape = ({ x = 0, y = 0, w = 160, h = 110, kind = "rect", fill = "#e8e5fe", stroke = "#5b4cf0", sw = 2, text = "", size = 18, bold = false } = {}) =>
  base("shape", x, y, w, h, { kind, fill, stroke, sw, text, size, bold, textColor: "#1b2133" });
/** Table: a grid of rectangle cells sharing one group (each cell's text is edited with a double-click). */
export function makeTable({ x = 0, y = 0, cols = 3, rows = 3, cw = 150, ch = 54, head = "#e8e5fe", stroke = "#9aa1b5", cells = null } = {}) {
  const group = newId(), out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const o = makeShape({ x: x + c * cw, y: y + r * ch, w: cw, h: ch, kind: "rect", fill: r === 0 && head ? head : "#ffffff", stroke, sw: 1, text: cells?.[r]?.[c] ?? "", size: 16, bold: r === 0 });
    o.group = group; o.cell = [r, c];
    out.push(o);
  }
  return out;
}
export const makeFrame = ({ x = 0, y = 0, w = 640, h = 420, name = "Frame", fill = "#ffffff" } = {}) => base("frame", x, y, w, h, { name, fill });
export const makeConnector = ({ from, to, kind = "straight", arrow = "end", stroke = "#334155", sw = 2, text = "" } = {}) =>
  base("connector", 0, 0, 0, 0, { from: { ...from }, to: { ...to }, kind, arrow, stroke, sw, text });
export function makeStroke({ points, tool = "pen", color = "#1b2133", width = 3 } = {}) {
  const b = pointsBounds(points);
  return base("stroke", b.x, b.y, b.w, b.h, { tool, color, width, points: points.map(([x, y]) => [round2(x - b.x), round2(y - b.y)]), pw: b.w, ph: b.h });
}
export const makeImage = ({ x = 0, y = 0, w, h, src, name = "Image" }) => base("image", x, y, w, h, { src, name });
export const makeSticker = ({ x = 0, y = 0, w = 120, h = 120, element }) => base("sticker", x, y, w, h, { element: { ...element } });
const round2 = (v) => Math.round(v * 100) / 100;

export function newBoard(name = "Untitled board") { return { format: FORMAT, version: 1, name, objects: [] }; }
export const byIdOf = (board) => { const m = new Map(board.objects.map((o) => [o.id, o])); return (id) => m.get(id); };
export const isConnector = (o) => o?.type === "connector";

/* ---------------------------------------------------------------- queries */
/** Connectors attached (at either end) to any of the ids. */
export function attachedConnectors(board, ids) {
  const set = ids instanceof Set ? ids : new Set(ids);
  return board.objects.filter((o) => o.type === "connector" && (set.has(o.from?.id) || set.has(o.to?.id)));
}
/** ids plus every object that shares a group with one of them. */
export function expandGroups(board, ids) {
  const set = new Set(ids);
  const groups = new Set(board.objects.filter((o) => set.has(o.id) && o.group).map((o) => o.group));
  if (groups.size) for (const o of board.objects) if (o.group && groups.has(o.group)) set.add(o.id);
  return set;
}
/** Objects fully inside a frame (moved with it). */
export function frameChildren(board, frame) {
  const byId = byIdOf(board);
  return board.objects.filter((o) => o !== frame && o.type !== "frame" && o.type !== "connector" && rectContains(frame, objectBounds(o, byId)));
}
/** Topmost object at a board point (frames only by their name label or border). tol in board px. */
export function hitTest(board, x0, y0, tol = 4) {
  const byId = byIdOf(board);
  let x = x0, y = y0;
  for (let i = board.objects.length - 1; i >= 0; i--) {
    const o = board.objects[i];
    if (o.type === "frame") continue;
    x = x0; y = y0;
    if (o.rot && canRotate(o)) [x, y] = rotatePoint(x0, y0, o.x + o.w / 2, o.y + o.h / 2, -o.rot);
    if (o.type === "connector") { if (distToPolyline(routeConnector(o, byId).points, x, y) <= Math.max(tol + 2, (o.sw || 2) / 2 + tol)) return o; continue; }
    if (o.type === "stroke") { if (distToPolyline(o.points.map(([px, py]) => [o.x + px, o.y + py]), x, y) <= (o.width || 3) / 2 + tol) return o; continue; }
    if (pointInOutline(o, x, y, tol)) return o;
  }
  x = x0; y = y0;
  for (let i = board.objects.length - 1; i >= 0; i--) {
    const o = board.objects[i];
    if (o.type !== "frame") continue;
    const label = { x: o.x, y: o.y - 26, w: Math.max(80, o.w * 0.6), h: 26 };
    const inLabel = x >= label.x && x <= label.x + label.w && y >= label.y && y <= label.y + label.h;
    const inside = x >= o.x - tol && x <= o.x + o.w + tol && y >= o.y - tol && y <= o.y + o.h + tol;
    const nearEdge = inside && (x <= o.x + tol * 2 || x >= o.x + o.w - tol * 2 || y <= o.y + tol * 2 || y >= o.y + o.h - tol * 2);
    if (inLabel || nearEdge) return o;
  }
  return null;
}
/** Frame whose inside contains the point (for "click inside a frame" behaviour). */
export function frameAt(board, x, y) {
  for (let i = board.objects.length - 1; i >= 0; i--) { const o = board.objects[i]; if (o.type === "frame" && x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o; }
  return null;
}
/** Objects touched by a rubber-band rectangle (frames only when fully inside). */
export function objectsInRect(board, r) {
  const byId = byIdOf(board);
  return board.objects.filter((o) => { const b = objectBounds(o, byId); return o.type === "frame" ? rectContains(r, { x: o.x, y: o.y, w: o.w, h: o.h }) : rectsIntersect(r, b); }).map((o) => o.id);
}
export function selectionBounds(board, ids) {
  const byId = byIdOf(board);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of board.objects) {
    if (!ids.has(o.id)) continue;
    const b = o.type === "connector" ? objectBounds(o, byId) : { x: o.x, y: o.y, w: o.w, h: o.h };
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* ---------------------------------------------------------------- edits */
/** Moves objects (locked ones stay). Free connector ends inside the moved set move too. */
export function moveObjects(board, ids, dx, dy) {
  const set = ids instanceof Set ? ids : new Set(ids);
  for (const o of board.objects) {
    if (!set.has(o.id) || o.locked) continue;
    if (o.type === "connector") {
      for (const end of [o.from, o.to]) if (end && end.id == null) { end.x += dx; end.y += dy; }
      continue;
    }
    o.x = round2(o.x + dx); o.y = round2(o.y + dy);
  }
}
/** Sets a new box for an object (strokes and stickers scale their contents). */
export function resizeObject(o, box) {
  if (o.locked) return;
  const w = Math.max(4, box.w), h = Math.max(4, box.h);
  if (o.type === "stroke") {
    const kx = o.w ? w / o.w : 1, ky = o.h ? h / o.h : 1;
    o.points = o.points.map(([x, y]) => [round2(x * kx), round2(y * ky)]);
  }
  o.x = round2(box.x); o.y = round2(box.y); o.w = round2(w); o.h = round2(h);
  if (o.type === "text") o.h = textLayout(o).h;
}
/** Keeps derived sizes right (text boxes grow with their text). */
export function normalizeObject(o) { if (o.type === "text") o.h = textLayout(o).h; return o; }

/** Removes objects (not locked) and connectors attached to them. Returns the removed ids. */
export function deleteObjects(board, ids) {
  const set = new Set([...ids].filter((id) => !board.objects.find((o) => o.id === id)?.locked));
  for (const c of attachedConnectors(board, set)) set.add(c.id);
  board.objects = board.objects.filter((o) => !set.has(o.id));
  return set;
}
/** Deep copy of objects (strings shared, so big image data is not duplicated). */
export function cloneDeep(v) {
  if (Array.isArray(v)) return v.map(cloneDeep);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = cloneDeep(v[k]); return o; }
  return v;
}
/** Copy payload of objects plus the connectors between them. */
export function copyObjects(board, ids) {
  const set = new Set(ids);
  for (const c of board.objects) if (c.type === "connector" && set.has(c.from?.id) && set.has(c.to?.id)) set.add(c.id);
  return { format: FORMAT + "-clip", objects: cloneDeep(board.objects.filter((o) => set.has(o.id))) };
}
/** Adds copied objects with new ids, shifted by (dx, dy). Groups get new ids too. Returns the new ids. */
export function pasteObjects(board, payload, dx = 24, dy = 24) {
  const idMap = new Map(), groupMap = new Map();
  const list = cloneDeep(payload?.objects || []);
  for (const o of list) idMap.set(o.id, newId());
  const out = [];
  for (const o of list) {
    o.id = idMap.get(o.id);
    o.locked = false;
    if (o.group) { if (!groupMap.has(o.group)) groupMap.set(o.group, newId()); o.group = groupMap.get(o.group); }
    if (o.type === "connector") {
      for (const k of ["from", "to"]) {
        const end = o[k];
        if (end.id != null && idMap.has(end.id)) end.id = idMap.get(end.id);
        else if (end.id == null) { end.x += dx; end.y += dy; }
      }
    } else { o.x = round2(o.x + dx); o.y = round2(o.y + dy); }
    out.push(o);
  }
  // Frames go to the back so they never cover what was pasted with them.
  const frames = out.filter((o) => o.type === "frame");
  board.objects = [...frames, ...board.objects, ...out.filter((o) => o.type !== "frame")];
  return out.map((o) => o.id);
}
export const duplicateObjects = (board, ids) => pasteObjects(board, copyObjects(board, ids), 24, 24);

export function groupObjects(board, ids) {
  const list = board.objects.filter((o) => ids.has(o.id));
  if (list.length < 2) return null;
  const g = newId();
  for (const o of list) o.group = g;
  return g;
}
export function ungroupObjects(board, ids) { let n = 0; for (const o of board.objects) if (ids.has(o.id) && o.group) { o.group = null; n++; } return n; }
export function setLocked(board, ids, locked) { for (const o of board.objects) if (ids.has(o.id)) o.locked = !!locked; }

/** Stacking order: front | back | forward | backward. */
export function reorder(board, ids, how) {
  const objs = board.objects, sel = (o) => ids.has(o.id);
  if (how === "front") board.objects = [...objs.filter((o) => !sel(o)), ...objs.filter(sel)];
  else if (how === "back") board.objects = [...objs.filter(sel), ...objs.filter((o) => !sel(o))];
  else if (how === "forward") {
    const a = objs.slice();
    for (let i = a.length - 2; i >= 0; i--) if (sel(a[i]) && !sel(a[i + 1])) [a[i], a[i + 1]] = [a[i + 1], a[i]];
    board.objects = a;
  } else if (how === "backward") {
    const a = objs.slice();
    for (let i = 1; i < a.length; i++) if (sel(a[i]) && !sel(a[i - 1])) [a[i], a[i - 1]] = [a[i - 1], a[i]];
    board.objects = a;
  }
}
/** Align (left | center | right | top | middle | bottom) or distribute (hspace | vspace) the selection. */
export function alignObjects(board, ids, how) {
  const list = board.objects.filter((o) => ids.has(o.id) && o.type !== "connector" && !o.locked);
  if (list.length < 2) return 0;
  const b = { x: Math.min(...list.map((o) => o.x)), y: Math.min(...list.map((o) => o.y)) };
  b.r = Math.max(...list.map((o) => o.x + o.w)); b.b = Math.max(...list.map((o) => o.y + o.h));
  const mv = (o, x, y) => moveObjects(board, [o.id], x - o.x, y - o.y);
  if (how === "hspace" || how === "vspace") {
    const h = how === "hspace", sorted = list.slice().sort((p, q) => (h ? p.x - q.x : p.y - q.y));
    if (sorted.length < 3) return 0;
    const total = sorted.reduce((s, o) => s + (h ? o.w : o.h), 0), span = h ? b.r - b.x : b.b - b.y;
    const gap = (span - total) / (sorted.length - 1);
    let pos = h ? b.x : b.y;
    for (const o of sorted) { if (h) mv(o, pos, o.y); else mv(o, o.x, pos); pos += (h ? o.w : o.h) + gap; }
    return sorted.length;
  }
  for (const o of list) {
    if (how === "left") mv(o, b.x, o.y);
    else if (how === "center") mv(o, (b.x + b.r) / 2 - o.w / 2, o.y);
    else if (how === "right") mv(o, b.r - o.w, o.y);
    else if (how === "top") mv(o, o.x, b.y);
    else if (how === "middle") mv(o, o.x, (b.y + b.b) / 2 - o.h / 2);
    else if (how === "bottom") mv(o, o.x, b.b - o.h);
  }
  return list.length;
}
/** Strokes (pen / highlighter) within `radius` of a board point: what the eraser removes. */
export function strokesNear(board, x, y, radius) {
  return board.objects.filter((o) => o.type === "stroke" && !o.locked && distToPolyline(o.points.map(([px, py]) => [o.x + px, o.y + py]), x, y) <= radius + (o.width || 3) / 2).map((o) => o.id);
}

/* ---------------------------------------------------------------- history */
export class History {
  constructor(limit = 120) { this.past = []; this.future = []; this.limit = limit; }
  /** Call before a change with the current objects. */
  checkpoint(objects) { this.past.push(cloneDeep(objects)); if (this.past.length > this.limit) this.past.shift(); this.future = []; }
  undo(objects) { if (!this.past.length) return null; this.future.push(cloneDeep(objects)); return this.past.pop(); }
  redo(objects) { if (!this.future.length) return null; this.past.push(cloneDeep(objects)); return this.future.pop(); }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  clear() { this.past = []; this.future = []; }
}

/* ---------------------------------------------------------------- file format */
const TYPES = new Set(["note", "text", "shape", "connector", "stroke", "frame", "image", "sticker"]);
const finite = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
/** Validates a board read from a file or storage; throws a friendly error when it is not a board. */
export function parseBoard(input) {
  const j = typeof input === "string" ? JSON.parse(input) : input;
  if (!j || (j.format && j.format !== FORMAT) || !Array.isArray(j.objects)) throw new Error("This file is not an AsaanDesk board.");
  const ids = new Set();
  const objects = [];
  for (const raw of j.objects) {
    if (!raw || !TYPES.has(raw.type)) continue;
    const o = { ...raw, id: raw.id && !ids.has(String(raw.id)) ? String(raw.id) : newId(), x: finite(raw.x), y: finite(raw.y), w: finite(raw.w), h: finite(raw.h), locked: !!raw.locked, group: raw.group || null };
    // Pictures: data URLs, or the site's own template photo library (/pdf-editor/photos/<file>).
    if (o.type === "image" && !/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);/i.test(String(o.src || "")) && !/^\/pdf-editor\/photos\/[\w.-]+\.(jpe?g|png|webp)$/i.test(String(o.src || ""))) continue;
    if (o.type === "stroke" && !Array.isArray(o.points)) continue;
    if (o.type === "connector" && (!o.from || !o.to)) continue;
    ids.add(o.id);
    objects.push(normalizeObject(o));
  }
  // Connectors to objects that do not exist become free ends.
  for (const o of objects) if (o.type === "connector") for (const k of ["from", "to"]) if (o[k].id != null && !ids.has(o[k].id)) o[k] = { x: finite(o[k].x), y: finite(o[k].y) };
  return { format: FORMAT, version: 1, name: String(j.name || "Untitled board").slice(0, 120), objects };
}
export const boardToJSON = (board) => ({ format: FORMAT, version: 1, name: board.name, objects: board.objects });
