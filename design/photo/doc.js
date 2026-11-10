// Photo editor document model (no DOM): the edit state, undo/redo history, overlays (text, stickers,
// shapes) and frames. Everything here is plain JSON so it autosaves to IndexedDB as is; pixels are kept
// separately by id (see app.js).
import { NEUTRAL, DEFAULT_GEOM, FULL_CROP } from "./adjust.js";

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Edit state for a picture of w×h. pixels / cutout are ids of stored pixel buffers. */
export function newState({ w, h }) {
  return {
    version: 1,
    src: { w, h },
    pixels: null,
    cutout: null,
    geom: { ...DEFAULT_GEOM, crop: { ...FULL_CROP } },
    adjust: { ...NEUTRAL },
    filter: { id: "none", intensity: 100 },
    bg: { removed: false, mode: "transparent", color: "#ffffff", blur: 40, imageId: null },
    overlays: [],
    frame: { id: "none", color: "#ffffff", width: 4 },
  };
}
export const cloneState = (s) => JSON.parse(JSON.stringify(s));

/** Undo / redo of whole states (each state is small JSON; pixels are shared by id). */
export class History {
  constructor(limit = 60) { this.limit = limit; this.past = []; this.future = []; this.current = null; }
  reset(state) { this.past = []; this.future = []; this.current = state; }
  push(state) {
    if (this.current !== null) { this.past.push(this.current); if (this.past.length > this.limit) this.past.shift(); }
    this.current = state;
    this.future = [];
  }
  undo() { if (!this.past.length) return null; this.future.push(this.current); this.current = this.past.pop(); return this.current; }
  redo() { if (!this.future.length) return null; this.past.push(this.current); this.current = this.future.pop(); return this.current; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  /** Every pixel id still reachable from the history (the rest can be freed). */
  pixelIds() {
    const ids = new Set();
    for (const s of [...this.past, this.current, ...this.future]) if (s) for (const k of [s.pixels, s.cutout, s.bg && s.bg.imageId]) if (k) ids.add(k);
    return ids;
  }
}

/* ---------- overlays ---------- */

export const SHAPES = [
  { id: "rect", name: "Rectangle" }, { id: "rounded", name: "Rounded box" }, { id: "ellipse", name: "Circle" },
  { id: "triangle", name: "Triangle" }, { id: "line", name: "Line" }, { id: "arrow", name: "Arrow" },
  { id: "star", name: "Star" }, { id: "heart", name: "Heart" },
];
export const TEXT_STYLES = [
  { id: "title", name: "Big title", props: { size: 0.1, bold: true, color: "#ffffff", shadow: true } },
  { id: "caption", name: "Caption", props: { size: 0.05, bold: false, color: "#ffffff", bg: "#1b2133" } },
  { id: "outline", name: "Outline", props: { size: 0.09, bold: true, color: "#ffd166", outline: "#1b2133" } },
  { id: "quote", name: "Quote", props: { size: 0.06, italic: true, family: "serif", color: "#ffffff", shadow: true } },
];

/**
 * Overlay positions are fractions of the finished picture: x, y = centre, w, h = size, rotation in degrees.
 * Text size is a fraction of the picture height (its w/h are measured when drawn).
 */
export function newOverlay(type, props = {}) {
  const base = { id: uid(), type, x: 0.5, y: 0.5, w: 0.3, h: 0.2, rotation: 0, opacity: 1 };
  if (type === "text") return { ...base, w: 0.4, h: 0.1, text: "Your text", size: 0.08, family: "sans", bold: true, italic: false, color: "#ffffff", align: "center", shadow: true, outline: null, bg: null, ...props };
  if (type === "sticker") return { ...base, w: 0.25, h: 0.25, elId: null, colors: {}, ...props };
  if (type === "shape") return { ...base, shape: "rect", fill: "#5b4cf0", stroke: "#ffffff", strokeWidth: 0, ...props };
  throw new Error("Unknown overlay type " + type);
}

/** Pixel box of an overlay in a W×H picture. */
export function overlayBox(o, W, H) {
  return { cx: o.x * W, cy: o.y * H, w: o.w * W, h: o.h * H, rot: o.rotation || 0 };
}

/** Is the point (px, py) inside the (possibly turned) overlay box, with pad px of slack? */
export function hitOverlay(o, px, py, W, H, pad = 0) {
  const b = overlayBox(o, W, H), t = (-(b.rot || 0) * Math.PI) / 180;
  const dx = px - b.cx, dy = py - b.cy;
  const lx = dx * Math.cos(t) - dy * Math.sin(t), ly = dx * Math.sin(t) + dy * Math.cos(t);
  return Math.abs(lx) <= b.w / 2 + pad && Math.abs(ly) <= b.h / 2 + pad;
}
/** Topmost overlay under a point (the last drawn wins). */
export function pickOverlay(list, px, py, W, H, pad = 0) {
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].hidden && hitOverlay(list[i], px, py, W, H, pad)) return list[i];
  return null;
}

/* ---------- frames ---------- */

export const FRAMES = [
  { id: "none", name: "None" },
  { id: "solid", name: "Clean border" },
  { id: "polaroid", name: "Instant photo" },
  { id: "double", name: "Double line" },
  { id: "film", name: "Film strip" },
  { id: "rounded", name: "Rounded corners" },
  { id: "circle", name: "Circle" },
  { id: "shadow", name: "Floating card" },
];
/** Extra space each frame adds around a W×H picture (width = % of the long side). */
export function framePad(frame, W, H) {
  const z = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!frame || frame.id === "none" || frame.id === "rounded" || frame.id === "circle") return z;
  const u = Math.round(((frame.width ?? 4) / 100) * Math.max(W, H));
  switch (frame.id) {
    case "solid": case "double": return { top: u, right: u, bottom: u, left: u };
    case "polaroid": return { top: u, right: u, bottom: Math.round(u * 3.5), left: u };
    case "film": return { top: Math.round(u * 2), right: Math.round(u * 0.5), bottom: Math.round(u * 2), left: Math.round(u * 0.5) };
    case "shadow": return { top: Math.round(u * 1.5), right: Math.round(u * 1.5), bottom: Math.round(u * 1.5), left: Math.round(u * 1.5) };
    default: return z;
  }
}
