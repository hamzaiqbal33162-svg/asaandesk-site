// Magic Layers editing model (pure: no DOM). Undo/redo history of whole design snapshots, and the box maths for
// moving, nudging and resizing a layer with its corner handles. app.js uses it; the unit tests check it directly.

/** A copy of one layer: geometry, text and picture settings are copied, the picture data URL string is shared. */
export function cloneLayer(l) {
  const c = { ...l };
  if (l.text) c.text = { ...l.text, ...(l.text.shadow ? { shadow: { ...l.text.shadow } } : {}) };
  if (l.image) c.image = { ...l.image, crop: l.image.crop ? { ...l.image.crop } : l.image.crop, filters: l.image.filters ? { ...l.image.filters } : l.image.filters };
  return c;
}
export const clonePages = (pages) => (pages || []).map((p) => ({ ...p, layers: p.layers.map(cloneLayer) }));

/**
 * Undo/redo of design snapshots. A snapshot is { pages, off, current, sel, name, template, kind, done }.
 * record(snap) saves the state BEFORE a change (and clears redo); undo(now) / redo(now) take the present state and
 * return the snapshot to show. `limit` keeps memory in check (pictures are shared strings, so snapshots are small).
 */
export class History {
  constructor(limit = 80) { this.limit = limit; this.past = []; this.future = []; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  clear() { this.past = []; this.future = []; }
  record(snap) {
    this.past.push(snap);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(now) {
    if (!this.past.length) return null;
    this.future.push(now);
    return this.past.pop();
  }
  redo(now) {
    if (!this.future.length) return null;
    this.past.push(now);
    return this.future.pop();
  }
}

const r2 = (v) => Math.round(v * 100) / 100;

/** The box moved by (dx, dy) design pixels. */
export const moveBox = (b, dx, dy) => ({ x: r2(b.x + dx), y: r2(b.y + dy), w: b.w, h: b.h });

/**
 * The box after dragging corner `handle` ("nw" | "ne" | "sw" | "se") by (dx, dy) design pixels. The opposite corner
 * stays put. keep = keep the width/height ratio (pictures and text; Shift frees it for pictures). min = smallest side.
 */
export function resizeBox(b, handle, dx, dy, { keep = true, min = 8 } = {}) {
  const left = handle === "nw" || handle === "sw", top = handle === "nw" || handle === "ne";
  let w = b.w + (left ? -dx : dx), h = b.h + (top ? -dy : dy);
  if (keep) {
    const sx = w / b.w, sy = h / b.h;
    let s = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
    s = Math.max(s, min / Math.min(b.w, b.h));
    w = b.w * s; h = b.h * s;
  } else {
    w = Math.max(min, w); h = Math.max(min, h);
  }
  const x = left ? b.x + b.w - w : b.x, y = top ? b.y + b.h - h : b.y;
  return { x: r2(x), y: r2(y), w: r2(w), h: r2(h) };
}

/** "#rrggbb" (or "#rgb") → [r, g, b], or null when it is not a colour. */
export function hexToRgb(hex) {
  let m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) { const s = /^#?([0-9a-f]{3})$/i.exec(String(hex || "").trim()); if (s) m = [0, s[1].split("").map((c) => c + c).join("")]; }
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Recolour picture pixels (RGBA bytes, changed in place) to one colour, the way a graphic is recoloured: the picture's
 * average shade becomes exactly the new colour, lighter and darker parts stay lighter and darker (so shading and
 * outlines survive), black stays black, white stays white, and transparency is kept. Returns the data.
 */
export function recolorPixels(data, hex) {
  const c = hexToRgb(hex);
  if (!c) throw new Error("Pick a colour first.");
  let sum = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 8) { sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; n++; }
  const mean = n ? sum / n / 255 : 0.5;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const L = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    const t = Math.max(0, Math.min(1, 0.5 + (L - mean)));
    for (let k = 0; k < 3; k++) data[i + k] = t < 0.5 ? c[k] * (t / 0.5) : c[k] + (255 - c[k]) * ((t - 0.5) / 0.5);
  }
  return data;
}

/** Source rectangle of an sw×sh picture that covers a dw×dh box (centred crop), for replacing a picture in its box. */
export function coverCrop(sw, sh, dw, dh) {
  const s = Math.max(dw / sw, dh / sh), w = dw / s, h = dh / s;
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}

/* ---------- effects on one layer (Canva: "apply effects to individual layers") ---------- */

// Picture effects are the same filter set Studio keeps on a picture layer, so they open in Studio as they are.
export const NO_FILTERS = Object.freeze({ brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 });
// Our own one-tap looks for a picture layer.
export const LAYER_LOOKS = [
  { id: "none", name: "None", f: {} },
  { id: "mono", name: "Black and white", f: { grayscale: 1, contrast: 1.1 } },
  { id: "warm", name: "Warm", f: { sepia: 0.3, saturate: 1.2, brightness: 1.03 } },
  { id: "cool", name: "Cool", f: { hue: -15, saturate: 0.9, brightness: 1.03 } },
  { id: "vivid", name: "Vivid", f: { saturate: 1.5, contrast: 1.12 } },
  { id: "faded", name: "Faded", f: { contrast: 0.8, saturate: 0.7, brightness: 1.08 } },
  { id: "vintage", name: "Old photo", f: { sepia: 0.75, contrast: 0.9, brightness: 1.05 } },
  { id: "soft", name: "Soft blur", f: { blur: 3 } },
];
export const lookFilters = (id) => ({ ...NO_FILTERS, ...(LAYER_LOOKS.find((l) => l.id === id)?.f || {}) });
const num = (v) => Math.round(v * 1000) / 1000;
/** CSS / canvas filter text for a picture's filters ("none" when nothing changes). */
export function filterCss(f) {
  if (!f) return "none";
  const p = [];
  if (f.brightness != null && f.brightness !== 1) p.push(`brightness(${num(f.brightness)})`);
  if (f.contrast != null && f.contrast !== 1) p.push(`contrast(${num(f.contrast)})`);
  if (f.saturate != null && f.saturate !== 1) p.push(`saturate(${num(f.saturate)})`);
  if (f.grayscale) p.push(`grayscale(${num(f.grayscale)})`);
  if (f.sepia) p.push(`sepia(${num(f.sepia)})`);
  if (f.hue) p.push(`hue-rotate(${num(f.hue)}deg)`);
  if (f.blur) p.push(`blur(${num(f.blur)}px)`);
  return p.length ? p.join(" ") : "none";
}
// Text shadow, Studio's format: offset x / y, blur (px), colour and opacity.
export const TEXT_SHADOW = Object.freeze({ x: 3, y: 4, blur: 8, color: "#000000", opacity: 0.45 });
/** CSS text-shadow for a text layer's shadow ("" when there is none). */
export function textShadowCss(sh) {
  if (!sh || !(sh.x || sh.y || sh.blur)) return "";
  const c = hexToRgb(sh.color) || [0, 0, 0];
  return `${num(sh.x || 0)}px ${num(sh.y || 0)}px ${num(sh.blur || 0)}px rgba(${c[0]}, ${c[1]}, ${c[2]}, ${num(sh.opacity ?? 0.5)})`;
}
/** CSS transform for a layer: its turn, then a picture's flips. */
export function layerTransform(l) {
  const t = [];
  if (l.rotation) t.push(`rotate(${l.rotation}deg)`);
  if (l.type === "image" && (l.image?.flipX || l.image?.flipY)) t.push(`scale(${l.image.flipX ? -1 : 1}, ${l.image.flipY ? -1 : 1})`);
  return t.join(" ");
}
/** Does the layer have any effect (filters, flips or a text shadow)? */
export const hasEffects = (l) => (l.type === "image" ? filterCss(l.image?.filters) !== "none" || !!l.image?.flipX || !!l.image?.flipY : !!textShadowCss(l.text?.shadow));

/** Arrow-key nudge: 1 px, or 10 px with Shift. Returns [dx, dy] or null for other keys. */
export function nudgeOf(key, shift) {
  const s = shift ? 10 : 1;
  return { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[key] || null;
}
