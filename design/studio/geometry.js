// Layout maths for the editor: rotated boxes, snapping with guides, align / distribute, handle resizing,
// grouping. Pure module (unit-tested in Node).
import { textHeight } from "./textlayout.js";

const RAD = Math.PI / 180;
export const rotate = (x, y, cx, cy, deg) => {
  const a = deg * RAD, c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
};
/** Four corners of a layer box after rotation (page coordinates). */
export function corners(l) {
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2, r = l.rotation || 0;
  return [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h]].map(([x, y]) => (r ? rotate(x, y, cx, cy, r) : [x, y]));
}
/** Axis-aligned bounds { x, y, w, h } of a layer (rotation included). */
export function aabb(l) {
  const c = corners(l), xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
export function unionBox(boxes) {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}
export const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const inside = (b, page, tol = 0.5) => b.x >= -tol && b.y >= -tol && b.x + b.w <= page.w + tol && b.y + b.h <= page.h + tol;

/* ---------------- snapping ---------------- */
/** Lines things snap to: page edges and centre, plus the edges and centres of the other layers. */
export function snapTargets(page, others = []) {
  const xs = [{ v: 0, kind: "page" }, { v: page.w / 2, kind: "center" }, { v: page.w, kind: "page" }];
  const ys = [{ v: 0, kind: "page" }, { v: page.h / 2, kind: "center" }, { v: page.h, kind: "page" }];
  for (const l of others) {
    const b = aabb(l);
    xs.push({ v: b.x, kind: "layer", box: b }, { v: b.x + b.w / 2, kind: "layer", box: b }, { v: b.x + b.w, kind: "layer", box: b });
    ys.push({ v: b.y, kind: "layer", box: b }, { v: b.y + b.h / 2, kind: "layer", box: b }, { v: b.y + b.h, kind: "layer", box: b });
  }
  return { xs, ys };
}
/**
 * Snaps a moving box: tries its left/centre/right against the x targets and top/middle/bottom against the
 * y targets. Returns { dx, dy, guides: [{ axis: 'x' | 'y', v, from, to }] } (guides span the matched things).
 */
export function snapBox(box, targets, threshold, page) {
  const best = (vals, cands) => {
    let out = null;
    for (const [i, v] of vals.entries()) for (const c of cands) {
      const d = c.v - v;
      if (Math.abs(d) <= threshold && (!out || Math.abs(d) < Math.abs(out.d) - 1e-9)) out = { d, v: c.v, c, i };
    }
    return out;
  };
  const sx = best([box.x, box.x + box.w / 2, box.x + box.w], targets.xs);
  const sy = best([box.y, box.y + box.h / 2, box.y + box.h], targets.ys);
  const dx = sx ? sx.d : 0, dy = sy ? sy.d : 0;
  const guides = [];
  const nb = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
  if (sx) {
    const hits = targets.xs.filter((c) => Math.abs(c.v - sx.v) < 0.01);
    const ys = [nb.y, nb.y + nb.h, ...hits.flatMap((c) => (c.box ? [c.box.y, c.box.y + c.box.h] : [0, page.h]))];
    guides.push({ axis: "x", v: sx.v, from: Math.min(...ys), to: Math.max(...ys), kind: sx.c.kind });
  }
  if (sy) {
    const hits = targets.ys.filter((c) => Math.abs(c.v - sy.v) < 0.01);
    const xs = [nb.x, nb.x + nb.w, ...hits.flatMap((c) => (c.box ? [c.box.x, c.box.x + c.box.w] : [0, page.w]))];
    guides.push({ axis: "y", v: sy.v, from: Math.min(...xs), to: Math.max(...xs), kind: sy.c.kind });
  }
  return { dx, dy, guides };
}
/** Snaps one value (an edge being resized) to the nearest target within threshold. */
export function snapValue(v, cands, threshold) {
  let best = null;
  for (const c of cands) { const d = c.v - v; if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, v: c.v }; }
  return best;
}
/** Rotation snapping: to multiples of `step` when `strict`, else softly to 0/45/90… within 4°. */
export function snapAngle(deg, strict = false, step = 15) {
  let a = ((deg % 360) + 540) % 360 - 180;
  if (strict) return Math.round(a / step) * step;
  const near = Math.round(a / 45) * 45;
  return Math.abs(near - a) < 4 ? near : Math.round(a * 10) / 10;
}

/* ---------------- align / distribute ---------------- */
/**
 * Moves layers so their bounds line up. mode: left | center | right | top | middle | bottom.
 * Several layers align to their common bounds; a single layer aligns to the page.
 * Returns { id: { x, y } }.
 */
export function alignLayers(layers, mode, page) {
  const boxes = layers.map(aabb);
  const ref = layers.length > 1 ? unionBox(boxes) : { x: 0, y: 0, w: page.w, h: page.h };
  const out = {};
  layers.forEach((l, i) => {
    const b = boxes[i];
    let dx = 0, dy = 0;
    if (mode === "left") dx = ref.x - b.x;
    else if (mode === "center") dx = ref.x + ref.w / 2 - (b.x + b.w / 2);
    else if (mode === "right") dx = ref.x + ref.w - (b.x + b.w);
    else if (mode === "top") dy = ref.y - b.y;
    else if (mode === "middle") dy = ref.y + ref.h / 2 - (b.y + b.h / 2);
    else if (mode === "bottom") dy = ref.y + ref.h - (b.y + b.h);
    out[l.id] = { x: l.x + dx, y: l.y + dy };
  });
  return out;
}
/** Even gaps between 3+ layers along 'x' or 'y' (first and last stay). Returns { id: { x, y } }. */
export function distributeLayers(layers, axis = "x") {
  const items = layers.map((l) => ({ l, b: aabb(l) }));
  const out = {};
  for (const { l } of items) out[l.id] = { x: l.x, y: l.y };
  if (items.length < 3) return out;
  const pos = axis === "x" ? "x" : "y", size = axis === "x" ? "w" : "h";
  items.sort((a, b) => a.b[pos] - b.b[pos]);
  const first = items[0].b, last = items[items.length - 1].b;
  const total = items.reduce((s, it) => s + it.b[size], 0);
  const gap = (last[pos] + last[size] - first[pos] - total) / (items.length - 1);
  let cur = first[pos];
  for (const it of items) { const d = cur - it.b[pos]; out[it.l.id][pos] = it.l[pos] + d; cur += it.b[size] + gap; }
  return out;
}

/* ---------------- resize with handles ---------------- */
// Handle -> which sides move: [sx, sy] where -1 = left/top edge, 1 = right/bottom edge, 0 = that axis stays.
export const HANDLES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
/**
 * New box for dragging `handle` of box `b` (rotated by b.rotation) to page point p.
 * keepRatio: keep the aspect ratio (shift, or corners of photos/stickers). The opposite handle stays put.
 */
export function resizeBox(b, handle, p, { keepRatio = false, min = 4 } = {}) {
  const [hx, hy] = HANDLES[handle];
  const r = b.rotation || 0, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  // Anchor (opposite point) in local coordinates relative to the centre.
  const ax = (-hx * b.w) / 2, ay = (-hy * b.h) / 2;
  const [axp, ayp] = rotate(cx + ax, cy + ay, cx, cy, r);
  // Pointer in the box's local frame, measured from the anchor.
  const [lx, ly] = rotate(p[0], p[1], axp, ayp, -r);
  let w = hx ? Math.max(min, (lx - axp) * hx) : b.w;
  let h = hy ? Math.max(min, (ly - ayp) * hy) : b.h;
  if (keepRatio) {
    const ratio = b.w / b.h;
    if (hx && hy) { const k = Math.max(w / b.w, h / b.h); w = Math.max(min, b.w * k); h = w / ratio; }
    else if (hx) h = w / ratio;
    else w = h * ratio;
  }
  // New centre: anchor + rotated half size towards the handle.
  const ox = hx ? (hx * w) / 2 : 0, oy = hy ? (hy * h) / 2 : 0;
  // For an axis that does not move, the centre stays on the anchor's line.
  const lcx = hx ? ox : -ax, lcy = hy ? oy : -ay;
  const [ncx, ncy] = rotate(axp + lcx, ayp + lcy, axp, ayp, r);
  return { x: ncx - w / 2, y: ncy - h / 2, w, h };
}

/** Scales a layer's content by kx/ky (used when a group or several layers are resized together). */
export function scaleLayer(l, kx, ky, ox = 0, oy = 0) {
  const k = Math.sqrt(Math.abs(kx * ky));
  l.x = ox + (l.x - ox) * kx; l.y = oy + (l.y - oy) * ky; l.w *= kx; l.h *= ky;
  if (l.type === "text") { l.text.size = Math.max(1, l.text.size * k); if (l.text.letterSpacing) l.text.letterSpacing *= k; if (l.text.outline) l.text.outline.width *= k; if (l.text.shadow) { l.text.shadow.x *= k; l.text.shadow.y *= k; l.text.shadow.blur *= k; } l.h = textHeight(l.text, l.w); }
  if (l.type === "shape" && l.shape.strokeWidth) l.shape.strokeWidth *= k;
  if (l.type === "shape" && l.shape.radius) l.shape.radius *= k;
  if (l.type === "image" && l.image.radius) l.image.radius *= k;
  if (l.type === "table" && l.table.size) l.table.size *= k;
  if (l.type === "group") for (const c of l.children) scaleLayer(c, kx, ky, 0, 0);
  return l;
}

/* ---------------- groups ---------------- */
/** Builds a group from page-level layers: children keep their look, stored relative to the group's box. */
export function makeGroup(layers, id, name = "Group") {
  const box = unionBox(layers.map(aabb));
  const children = layers.map((l) => ({ ...l, x: l.x - box.x, y: l.y - box.y }));
  return { id, type: "group", name, x: box.x, y: box.y, w: box.w, h: box.h, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null, children };
}
/** Children of a group back in page coordinates (group rotation and opacity applied to each). */
export function ungroup(g) {
  const gcx = g.x + g.w / 2, gcy = g.y + g.h / 2, r = g.rotation || 0;
  return g.children.map((c) => {
    const ccx = g.x + c.x + c.w / 2, ccy = g.y + c.y + c.h / 2;
    const [nx, ny] = r ? rotate(ccx, ccy, gcx, gcy, r) : [ccx, ccy];
    return { ...c, x: nx - c.w / 2, y: ny - c.h / 2, rotation: ((c.rotation || 0) + r) % 360, opacity: (c.opacity ?? 1) * (g.opacity ?? 1) };
  });
}
/** Re-fits a group's box to its children (after a child changed). */
export function refitGroup(g) {
  const b = unionBox(g.children.map(aabb));
  if (!b) return g;
  for (const c of g.children) { c.x -= b.x; c.y -= b.y; }
  // Keep the visual position when rotated: move the box by the rotated offset.
  const r = g.rotation || 0;
  const oldC = [g.x + g.w / 2, g.y + g.h / 2];
  const newLocalC = [g.x + b.x + b.w / 2, g.y + b.y + b.h / 2];
  const [ncx, ncy] = r ? rotate(newLocalC[0], newLocalC[1], oldC[0], oldC[1], r) : newLocalC;
  g.w = b.w; g.h = b.h; g.x = ncx - b.w / 2; g.y = ncy - b.h / 2;
  return g;
}

/** Page point -> a layer's local (unrotated) coordinates relative to its top-left. */
export function toLocal(l, px, py) {
  const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
  const [x, y] = rotate(px, py, cx, cy, -(l.rotation || 0));
  return [x - l.x, y - l.y];
}

/* ---------------- canvas view (zoom / pan) ---------------- */
/** Zoom and pan that show the whole page (plus bleed b) centred in a vw × vh canvas area. */
export function fitView(vw, vh, w, h, b = 0) {
  const pad = vw < 500 ? 20 : 48;
  const zoom = Math.max(0.02, Math.min(4, Math.min((vw - pad * 2) / (w + 2 * b), (vh - pad * 2) / (h + 2 * b))));
  return { zoom, panX: (vw - w * zoom) / 2, panY: (vh - h * zoom) / 2 };
}
/**
 * View after the canvas area changes size (window resize, a side panel opened or closed, the page bar grew).
 * A fitted page is fitted again, so it never ends up under a panel; a view the user zoomed or panned keeps the
 * same page point in the middle. view: { zoom, panX, panY, fit }, prev / next: { w, h } of the canvas area.
 */
export function viewAfterResize(view, prev, next, page, b = 0) {
  if (view.fit !== false || !prev) return { ...fitView(next.w, next.h, page.w, page.h, b), fit: true };
  return { zoom: view.zoom, panX: view.panX + (next.w - prev.w) / 2, panY: view.panY + (next.h - prev.h) / 2, fit: false };
}
