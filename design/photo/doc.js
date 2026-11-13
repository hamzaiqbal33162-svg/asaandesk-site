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
    fx: newFx(),
  };
}
/**
 * Effects and where the edits apply. area: "all" | "fg" | "bg" | "brush" | "click" (fg/bg use the cut-out; brush/click
 * use areaMask, an alpha mask stored by pixel id); duotone { id, amount } or null; opacity 0..100 (see-through photo).
 */
// colors: changed photo colours [{ hex, hue, sat, light }]; retouch: face retouch 0..100; blur: { amount 0..100,
// mask (pixel id, painted = blurred) } or null; focus: auto focus { blur 0..100, pos 0..100 } or null;
// eraseMask: pixel eraser (pixel id, painted = see-through) or null.
export const newFx = () => ({ area: "all", areaMask: null, invert: false, duotone: null, opacity: 100, colors: [], retouch: 0, blur: null, focus: null, eraseMask: null });
/** Older saved photos have no fx (or fewer fx fields) yet. */
export function ensureFx(s) { if (s) s.fx = { ...newFx(), ...(s.fx || {}) }; return s; }

/* ---------- copy style: the look of one photo, to paste on another ---------- */

/** The parts of the edit state that make a photo's look (no pixels, crop or masks; those belong to one photo). */
export function styleOf(s) {
  const fx = s.fx || {};
  return {
    v: 1, adjust: { ...s.adjust }, filter: { ...s.filter },
    fx: { invert: !!fx.invert, duotone: fx.duotone ? { ...fx.duotone } : null, opacity: fx.opacity ?? 100, retouch: fx.retouch || 0, colors: (fx.colors || []).map((c) => ({ ...c })), focus: fx.focus ? { ...fx.focus } : null },
    frame: { ...s.frame, shadow: s.frame?.shadow ? { ...s.frame.shadow } : null },
  };
}
/** Puts a copied style on a state (changes s). Unknown or broken styles are refused (returns false). */
export function pasteStyle(s, style) {
  if (!style || style.v !== 1 || !style.adjust || !style.filter) return false;
  ensureFx(s);
  s.adjust = { ...s.adjust, ...style.adjust };
  s.filter = { id: String(style.filter.id || "none"), intensity: Number(style.filter.intensity ?? 100) };
  const f = style.fx || {};
  s.fx = { ...s.fx, invert: !!f.invert, duotone: f.duotone || null, opacity: f.opacity ?? 100, retouch: f.retouch || 0, colors: Array.isArray(f.colors) ? f.colors : [], focus: f.focus || null };
  if (style.frame) s.frame = { ...s.frame, ...style.frame };
  return true;
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
    for (const s of [...this.past, this.current, ...this.future]) if (s) for (const k of statePixelIds(s)) ids.add(k);
    return ids;
  }
}

/** Pixel ids one state uses: the photo, cut-out, background picture, masks and grabbed objects. */
export function statePixelIds(s) {
  const fx = s.fx || {};
  return [s.pixels, s.cutout, s.bg && s.bg.imageId, fx.areaMask, fx.blur && fx.blur.mask, fx.eraseMask, ...(s.overlays || []).filter((o) => o.type === "image").map((o) => o.pixId)].filter(Boolean);
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
  // a part of the photo lifted out by Magic Grab (pixels stored by id, like the photo itself)
  if (type === "image") return { ...base, pixId: null, name: "Grabbed object", ...props };
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
  { id: "heart", name: "Heart" },
  { id: "star", name: "Star" },
  { id: "hexagon", name: "Hexagon" },
  { id: "arch", name: "Arch" },
  { id: "diamond", name: "Diamond" },
  { id: "blob", name: "Soft blob" },
];
/** Frames that cut the photo to a shape (no extra space round it; the rest becomes see-through). */
export const SHAPE_FRAMES = new Set(["rounded", "circle", "heart", "star", "hexagon", "arch", "diamond", "blob", "path"]); // path = any outline (frame.d in frame.vb) from the Elements panel
/** Extra space a frame (and its photo shadow, frame.shadow) adds around a W×H picture (width = % of the long side). */
export function framePad(frame, W, H) {
  const p = borderPad(frame, W, H);
  if (!frame || !frame.shadow || !frame.shadow.id) return p;
  const s = shadowPad(frame.shadow, W + p.left + p.right, H + p.top + p.bottom);
  return { top: p.top + s.top, right: p.right + s.right, bottom: p.bottom + s.bottom, left: p.left + s.left };
}
/** Space for the frame alone. */
export function borderPad(frame, W, H) {
  const z = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!frame || frame.id === "none" || SHAPE_FRAMES.has(frame.id)) return z;
  const u = Math.round(((frame.width ?? 4) / 100) * Math.max(W, H));
  switch (frame.id) {
    case "solid": case "double": return { top: u, right: u, bottom: u, left: u };
    case "polaroid": return { top: u, right: u, bottom: Math.round(u * 3.5), left: u };
    case "film": return { top: Math.round(u * 2), right: Math.round(u * 0.5), bottom: Math.round(u * 2), left: Math.round(u * 0.5) };
    case "shadow": return { top: Math.round(u * 1.5), right: Math.round(u * 1.5), bottom: Math.round(u * 1.5), left: Math.round(u * 1.5) };
    default: return z;
  }
}

/* ---------- photo shadows (Edit > Shadows) ---------- */

// Our own set of shadow styles. Sizes: blur and distance 0..100 (‰ of the long side × 0.8 / × 0.6), dir in degrees
// (0 = to the right, 90 = down), amount 0..100 (how dark).
export const SHADOWS = [
  { id: "drop", name: "Drop", blur: 30, dist: 20, dir: 60, amount: 45 },
  { id: "glow", name: "Glow", blur: 45, dist: 0, dir: 90, amount: 55 },
  { id: "lift", name: "Lifted corners", blur: 25, dist: 25, dir: 90, amount: 50 },
  { id: "curved", name: "Curved", blur: 30, dist: 20, dir: 90, amount: 45 },
  { id: "angled", name: "Angled", blur: 20, dist: 30, dir: 30, amount: 40 },
  { id: "block", name: "Solid offset", blur: 0, dist: 25, dir: 45, amount: 100 },
];
export const shadowById = (id) => SHADOWS.find((s) => s.id === id) || null;
/** Shadow sizes in px for a W×H picture. */
export function shadowMetrics(s, W, H) {
  const unit = Math.max(W, H) / 1000, a = ((s.dir ?? 90) * Math.PI) / 180;
  const blur = s.id === "block" ? 0 : Math.max(0, (s.blur ?? 30) * unit * 0.8), dist = (s.id === "glow" ? 0 : (s.dist ?? 20)) * unit * 0.6;
  return { unit, blur, dist, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, a, skew: Math.cos(a) * 0.9, squash: 0.28 };
}
/** Box (in the picture's own px, may go outside 0..W / 0..H) that the shadow covers, blur included. */
export function shadowBox(s, W, H) {
  const m = shadowMetrics(s, W, H), g = m.blur > 0 ? m.blur * 2 + 1 : 0;
  let x0 = 0, y0 = 0, x1 = W, y1 = H;
  switch (s.id) {
    case "drop": case "block": x0 = m.dx; y0 = m.dy; x1 = W + m.dx; y1 = H + m.dy; break;
    case "glow": break;
    case "lift": y0 = H * 0.7; y1 = H + m.dist + H * 0.03; break;
    case "curved": y0 = H * 0.8; y1 = H + m.dist; break;
    case "angled": { const top = H * (1 - m.squash), sx = -m.skew * H; x0 = Math.min(0, sx); x1 = Math.max(W, W + sx); y0 = top; y1 = H + m.dist * 0.3; break; }
    default: return null;
  }
  return { x0: x0 - g, y0: y0 - g, x1: x1 + g, y1: y1 + g };
}
/** Extra space round a W×H picture so its shadow fits. */
export function shadowPad(s, W, H) {
  const b = s && shadowBox(s, W, H);
  if (!b) return { top: 0, right: 0, bottom: 0, left: 0 };
  return { left: Math.ceil(Math.max(0, -b.x0)), top: Math.ceil(Math.max(0, -b.y0)), right: Math.ceil(Math.max(0, b.x1 - W)), bottom: Math.ceil(Math.max(0, b.y1 - H)) };
}
