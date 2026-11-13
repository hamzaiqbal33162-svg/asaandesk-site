// Design document model (Studio format, see SPEC.md): factories, validation, tree helpers and the
// undo/redo history. Pure module: no DOM access.
import { getPreset, designPreset, presetPx } from "./presets.js";

let counter = 0;
export const newId = (prefix = "l") => `${prefix}${Date.now().toString(36).slice(-5)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const LAYER_TYPES = ["text", "image", "shape", "element", "chart", "table", "frame", "group"];
export const SHAPE_KINDS = ["rect", "ellipse", "triangle", "line", "arrow", "star", "polygon", "heart"];
export const FAMILIES = ["sans", "serif", "mono", "calibri", "cambria"];
export const ANIMATIONS = ["fade", "rise", "pop", "slide-left", "slide-right", "typewriter", "wipe"];
export const DEFAULT_FILTERS = { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 };

export const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

/** A new, empty design for a preset (object or id). */
export function newDesign(preset, { name } = {}) {
  const p = typeof preset === "string" ? getPreset(preset) : preset;
  if (!p) throw new Error("Unknown design size.");
  const pages = Array.from({ length: p.pages || 1 }, () => newPage());
  return { version: 1, name: name || `Untitled ${p.label}`, preset: designPreset(p), pages };
}
export function newPage(background = { color: "#ffffff" }) { return { id: newId("p"), background: clone(background), layers: [] }; }

const base = (type, x, y, w, h, extra) => ({ id: newId(), type, name: extra?.name || type[0].toUpperCase() + type.slice(1), x, y, w, h, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null, ...extra });

export function textLayer(content, { x = 0, y = 0, w = 400, size = 48, family = "sans", bold = false, italic = false, underline = false, color = "#1b2133", align = "left", lineHeight = 1.2, letterSpacing = 0, name, ...fx } = {}) {
  const t = { content: String(content ?? ""), family, size, bold, italic, underline, color, align, lineHeight, letterSpacing };
  if (fx.shadow) t.shadow = fx.shadow;
  if (fx.outline) t.outline = fx.outline;
  if (fx.bg) t.bg = fx.bg;
  return base("text", x, y, w, 10, { name: name || (String(content).split("\n")[0].slice(0, 24) || "Text"), text: t });
}
export function imageLayer(src, { x = 0, y = 0, w = 300, h = 200, name = "Image", nw = 0, nh = 0 } = {}) {
  return base("image", x, y, w, h, { name, image: { src, crop: { x: 0, y: 0, w: 1, h: 1 }, filters: { ...DEFAULT_FILTERS }, radius: 0, flipX: false, flipY: false, ...(nw ? { nw, nh } : {}) } });
}
export function shapeLayer(kind = "rect", { x = 0, y = 0, w = 200, h = 200, fill = "#5b4cf0", stroke = "none", strokeWidth = 0, radius = 0, sides = 6, points = 5, name } = {}) {
  if (kind === "line" || kind === "arrow") { if (stroke === "none") stroke = fill === "none" ? "#1b2133" : fill; if (!strokeWidth) strokeWidth = 8; fill = "none"; }
  return base("shape", x, y, w, h, { name: name || kind[0].toUpperCase() + kind.slice(1), shape: { kind, fill, stroke, strokeWidth, radius, sides, points } });
}
/** el = an entry of /pdf-editor/elements.js ELEMENTS (or { id, vb, parts, defaults }). */
export function elementLayer(el, { x = 0, y = 0, w, h, colors = {}, name } = {}) {
  const [vw, vh] = el.vb;
  if (!w && !h) { w = 160; }
  if (w && !h) h = (w * vh) / vw;
  if (h && !w) w = (h * vw) / vh;
  // QR codes and barcodes keep what they encode, so the QR tool can show and update it later.
  const extra = { ...(el.qr ? { qr: { ...el.qr } } : {}), ...(el.barcode ? { barcode: typeof el.barcode === "object" ? { ...el.barcode } : el.barcode } : {}) };
  return base("element", x, y, w, h, { name: name || el.name || "Sticker", element: { id: el.id, vb: [vw, vh], parts: clone(el.parts), colors: { ...(el.defaults || {}), ...colors }, ...extra } });
}
export function chartLayer(spec, { x = 0, y = 0, w = 480, h = 320, name = "Chart" } = {}) { return base("chart", x, y, w, h, { name, chart: { spec: clone(spec) } }); }
export function tableLayer(table, { x = 0, y = 0, w = 480, h = 160, size = 18, name = "Table" } = {}) { return base("table", x, y, w, h, { name, table: { ...clone(table), size } }); }
export function frameLayer({ x = 0, y = 0, w = 300, h = 300, shape = "rect", radius = 0, image = null, name = "Photo frame" } = {}) {
  return base("frame", x, y, w, h, { name, frame: { shape, radius, image: image ? clone(image) : null } });
}
export function groupLayer(children, box, name = "Group") { return base("group", box.x, box.y, box.w, box.h, { name, children }); }

/* ---------------- tree helpers ---------------- */
export function* walk(layers, parent = null) {
  for (const l of layers || []) { yield [l, parent]; if (l.type === "group") yield* walk(l.children, l); }
}
export function findLayer(design, id) {
  for (const [pi, page] of design.pages.entries()) for (const [l, parent] of walk(page.layers)) if (l.id === id) return { layer: l, parent, page, pageIndex: pi };
  return null;
}
export function allLayers(design) { const out = []; for (const p of design.pages) for (const [l] of walk(p.layers)) out.push(l); return out; }
/** Deep copy with fresh ids (layers, groups and children). */
export function withNewIds(layer) { const l = clone(layer); const re = (x) => { x.id = newId(); if (x.type === "group") x.children.forEach(re); }; re(l); return l; }
export function duplicatePage(page) { return { ...clone(page), id: newId("p"), layers: page.layers.map(withNewIds) }; }

/* ---------------- validation ---------------- */
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isColor = (v) => v === "none" || /^#[0-9a-f]{6}$/i.test(v || "");
/** Problems with a layer (empty list = valid). */
export function layerProblems(l, path = "layer") {
  const bad = [];
  const need = (ok, what) => { if (!ok) bad.push(`${path}: ${what}`); };
  need(l && typeof l === "object", "not an object");
  if (!l || typeof l !== "object") return bad;
  need(typeof l.id === "string" && l.id, "id");
  need(LAYER_TYPES.includes(l.type), "type " + l.type);
  need(["x", "y", "w", "h", "rotation", "opacity"].every((k) => isNum(l[k])), "geometry");
  need(l.w > 0 && l.h > 0, "size");
  need(l.opacity >= 0 && l.opacity <= 1, "opacity");
  need(typeof l.locked === "boolean" && typeof l.hidden === "boolean", "locked/hidden");
  need(l.animation === null || l.animation === undefined || (ANIMATIONS.includes(l.animation.type) && isNum(l.animation.delay) && isNum(l.animation.duration)), "animation");
  if (l.type === "text") {
    const t = l.text || {};
    need(typeof t.content === "string", "text.content");
    need(FAMILIES.includes(t.family), "text.family");
    need(isNum(t.size) && t.size > 0, "text.size");
    need(isColor(t.color), "text.color");
    need(["left", "center", "right", "justify"].includes(t.align), "text.align");
    need(isNum(t.lineHeight) && isNum(t.letterSpacing), "text.lineHeight/letterSpacing");
  } else if (l.type === "image") {
    const im = l.image || {};
    need(typeof im.src === "string" && im.src, "image.src");
    need(im.crop && ["x", "y", "w", "h"].every((k) => isNum(im.crop[k])) && im.crop.w > 0 && im.crop.h > 0, "image.crop");
    need(im.filters && Object.keys(DEFAULT_FILTERS).every((k) => isNum(im.filters[k])), "image.filters");
  } else if (l.type === "shape") {
    const s = l.shape || {};
    need(SHAPE_KINDS.includes(s.kind), "shape.kind");
    need(isColor(s.fill) && isColor(s.stroke), "shape colours");
  } else if (l.type === "element") {
    const e = l.element || {};
    need(typeof e.id === "string" && Array.isArray(e.vb) && e.vb.length === 2 && Array.isArray(e.parts) && e.parts.length > 0, "element");
  } else if (l.type === "chart") need(l.chart?.spec && Array.isArray(l.chart.spec.series), "chart.spec");
  else if (l.type === "table") need(Array.isArray(l.table?.cells), "table.cells");
  else if (l.type === "frame") need(["rect", "circle", "rounded", "heart", "star", "hexagon", "triangle", "diamond", "arch", "blob"].includes(l.frame?.shape) || (l.frame?.shape === "path" && Array.isArray(l.frame.pts) && l.frame.pts.length >= 3), "frame.shape");
  else if (l.type === "group") {
    need(Array.isArray(l.children) && l.children.length > 0, "group.children");
    (l.children || []).forEach((c, i) => bad.push(...layerProblems(c, `${path}.children[${i}]`)));
  }
  return bad;
}
/** Problems with a design (empty list = valid). */
export function designProblems(d) {
  const bad = [];
  if (!d || typeof d !== "object") return ["design: not an object"];
  if (d.version !== 1) bad.push("design: version");
  if (typeof d.name !== "string") bad.push("design: name");
  const p = d.preset;
  if (!p || !(p.w > 0 && p.h > 0) || !["px", "mm", "in"].includes(p.unit) || !(p.dpi > 0) || !(p.bleed >= 0)) bad.push("design: preset");
  if (!Array.isArray(d.pages) || !d.pages.length) bad.push("design: pages");
  const ids = new Set();
  (d.pages || []).forEach((pg, i) => {
    const bg = pg.background || {};
    if (!pg.id) bad.push(`page ${i}: id`);
    if (!(bg.color ? isColor(bg.color) : bg.image ? typeof bg.image === "string" : bg.gradient ? Array.isArray(bg.gradient.stops) : false)) bad.push(`page ${i}: background`);
    if (!Array.isArray(pg.layers)) { bad.push(`page ${i}: layers`); return; }
    pg.layers.forEach((l, j) => bad.push(...layerProblems(l, `page ${i} layer ${j}`)));
    for (const [l] of walk(pg.layers)) { if (ids.has(l.id)) bad.push(`duplicate id ${l.id}`); ids.add(l.id); }
  });
  return bad;
}

/** Fills missing optional fields so older or hand-written designs open cleanly. */
export function normalizeDesign(d) {
  const out = clone(d);
  out.version = 1;
  out.name ||= "Untitled design";
  const known = getPreset(out.preset?.id);
  out.preset = { ...(known ? designPreset(known) : {}), ...out.preset };
  out.preset.dpi ||= out.preset.unit === "px" ? 96 : 300;
  out.preset.bleed ||= 0;
  if (!out.pages?.length) out.pages = [newPage()];
  const fix = (l) => {
    l.id ||= newId(); l.name ||= l.type; l.rotation ??= 0; l.opacity ??= 1; l.locked ??= false; l.hidden ??= false; l.animation ??= null;
    if (l.type === "image") { l.image.crop ||= { x: 0, y: 0, w: 1, h: 1 }; l.image.filters = { ...DEFAULT_FILTERS, ...l.image.filters }; l.image.radius ??= 0; l.image.flipX ??= false; l.image.flipY ??= false; }
    if (l.type === "text") { const t = l.text; t.family = FAMILIES.includes(t.family) ? t.family : "sans"; t.lineHeight ??= 1.2; t.letterSpacing ??= 0; t.align ||= "left"; t.color ||= "#000000"; }
    if (l.type === "shape") { const s = l.shape; s.fill ||= "none"; s.stroke ||= "none"; s.strokeWidth ??= 0; s.radius ??= 0; s.sides ??= 6; s.points ??= 5; }
    if (l.type === "frame") { l.frame.radius ??= 0; l.frame.image ??= null; }
    if (l.type === "group") l.children.forEach(fix);
  };
  for (const pg of out.pages) { pg.id ||= newId("p"); pg.background ||= { color: "#ffffff" }; pg.layers ||= []; pg.layers.forEach(fix); }
  return out;
}

export const pageSize = (design) => presetPx(design.preset);

/* ---------------- undo / redo ---------------- */
/**
 * Snapshot history. commit(doc, key) records the state *after* a change; changes with the same key within
 * `merge` ms are merged into one step (typing, dragging a slider). Big data: URLs are interned so 100 steps
 * of a design with photos do not hold 100 copies of each photo.
 */
export class History {
  constructor(doc, { limit = 100, merge = 700, now = () => Date.now() } = {}) {
    this.limit = limit; this.mergeMs = merge; this.now = now;
    this.assets = new Map(); this.assetList = [];
    this.past = []; this.future = [];
    this.current = this.pack(doc); this.lastKey = null; this.lastAt = 0;
  }
  pack(doc) {
    return JSON.stringify(doc, (k, v) => {
      if (typeof v === "string" && v.length > 1024 && v.startsWith("data:")) {
        let i = this.assets.get(v);
        if (i === undefined) { i = this.assetList.length; this.assetList.push(v); this.assets.set(v, i); }
        return "\u0000asset:" + i;
      }
      return v;
    });
  }
  unpack(s) { return JSON.parse(s, (k, v) => (typeof v === "string" && v.startsWith("\u0000asset:") ? this.assetList[+v.slice(7)] : v)); }
  /** Returns true when something changed. */
  commit(doc, key = null) {
    const next = this.pack(doc);
    if (next === this.current) return false;
    const t = this.now();
    if (key && key === this.lastKey && t - this.lastAt < this.mergeMs && this.past.length) { this.current = next; this.lastAt = t; this.future = []; return true; }
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.current = next; this.future = []; this.lastKey = key; this.lastAt = t;
    return true;
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  undo() { if (!this.past.length) return null; this.future.push(this.current); this.current = this.past.pop(); this.lastKey = null; return this.unpack(this.current); }
  redo() { if (!this.future.length) return null; this.past.push(this.current); this.current = this.future.pop(); this.lastKey = null; return this.unpack(this.current); }
  reset(doc) { this.past = []; this.future = []; this.current = this.pack(doc); this.lastKey = null; }
  snapshot() { return this.unpack(this.current); }
}
