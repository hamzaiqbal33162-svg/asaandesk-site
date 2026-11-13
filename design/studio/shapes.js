// Vector primitives for shape, element (sticker) and frame layers, in the layer's local box (0,0 top-left, w × h).
// Same format as /pdf-editor/vector.js, so the PDF export can hand them to drawPrims():
//   path: { d, fill, stroke, sw, cap, join, op }    text: { t, x, y, size, fill, bold, italic, font, anchor, ls }
// Pure module (vector.js itself needs pdf-lib loaded first, so the small path helpers live here too).

const n = (v) => +(+v).toFixed(3);
export const rectPath = (x, y, w, h, r = 0) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
  return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`;
};
export const ellipsePath = (cx, cy, rx, ry) => `M${n(cx - rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 1 ${n(cx + rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 1 ${n(cx - rx)} ${n(cy)}Z`;
export const polyPath = (pts) => "M" + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L") + "Z";

/** Points of a regular polygon / star fitted to the box (x0, y0, w, h). */
export function polygonPoints(sides, x0, y0, w, h) {
  sides = Math.max(3, Math.min(24, Math.round(sides) || 6));
  const pts = Array.from({ length: sides }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides; return [Math.cos(a), Math.sin(a)]; });
  return fitPoints(pts, x0, y0, w, h);
}
export function starPoints(points, x0, y0, w, h, inner = 0.45) {
  points = Math.max(3, Math.min(24, Math.round(points) || 5));
  const pts = Array.from({ length: points * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / points, r = i % 2 ? inner : 1; return [r * Math.cos(a), r * Math.sin(a)]; });
  return fitPoints(pts, x0, y0, w, h);
}
function fitPoints(pts, x0, y0, w, h) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return pts.map(([x, y]) => [x0 + ((x - minX) / (maxX - minX)) * w, y0 + ((y - minY) / (maxY - minY)) * h]);
}
export function heartPath(x, y, w, h) {
  const X = (v) => n(x + v * w), Y = (v) => n(y + v * h);
  return `M${X(0.5)} ${Y(0.22)}C${X(0.38)} ${Y(-0.02)} ${X(0)} ${Y(0.02)} ${X(0)} ${Y(0.32)}C${X(0)} ${Y(0.56)} ${X(0.25)} ${Y(0.76)} ${X(0.5)} ${Y(1)}C${X(0.75)} ${Y(0.76)} ${X(1)} ${Y(0.56)} ${X(1)} ${Y(0.32)}C${X(1)} ${Y(0.02)} ${X(0.62)} ${Y(-0.02)} ${X(0.5)} ${Y(0.22)}Z`;
}

/** Primitives of a shape layer in its w × h box. */
export function shapePrims(s, w, h) {
  const sw = s.stroke && s.stroke !== "none" ? Math.max(0, +s.strokeWidth || 0) : 0;
  const i = sw / 2; // keep the stroke inside the box
  const iw = Math.max(0.5, w - sw), ih = Math.max(0.5, h - sw);
  // Border style (Canva: solid, dashed, dotted).
  const dashOf = (w) => (s.dash === "dashed" ? [w * 3, w * 2] : s.dash === "dotted" ? [0.01, w * 2] : null);
  const style = { fill: s.fill || "none", stroke: sw ? s.stroke : "none", sw, join: "round", cap: "round", ...(sw && dashOf(sw) ? { dash: dashOf(sw) } : {}) };
  switch (s.kind) {
    case "ellipse": return [{ d: ellipsePath(w / 2, h / 2, iw / 2, ih / 2), ...style }];
    case "triangle": return [{ d: polyPath([[w / 2, i], [w - i, h - i], [i, h - i]]), ...style }];
    case "polygon": return [{ d: polyPath(polygonPoints(s.sides || 6, i, i, iw, ih)), ...style }];
    case "star": return [{ d: polyPath(starPoints(s.points || 5, i, i, iw, ih, s.inner || 0.45)), ...style }];
    case "heart": return [{ d: heartPath(i, i, iw, ih), ...style }];
    case "line": {
      const lw = Math.max(1, +s.strokeWidth || 4), col = s.stroke !== "none" ? s.stroke : s.fill;
      return [{ d: `M${n(lw / 2)} ${n(h / 2)}L${n(w - lw / 2)} ${n(h / 2)}`, fill: "none", stroke: col, sw: lw, cap: "round", ...(dashOf(lw) ? { dash: dashOf(lw) } : {}) }];
    }
    case "arrow": {
      const lw = Math.max(1, +s.strokeWidth || 4), col = s.stroke !== "none" ? s.stroke : s.fill;
      const head = Math.min(w * 0.4, Math.max(lw * 2.6, h * 0.42));
      const y = h / 2, x2 = w - lw / 2;
      return [{ d: `M${n(lw / 2)} ${n(y)}L${n(x2)} ${n(y)}M${n(x2 - head)} ${n(y - head * 0.8)}L${n(x2)} ${n(y)}L${n(x2 - head)} ${n(y + head * 0.8)}`, fill: "none", stroke: col, sw: lw, cap: "round", join: "round" }];
    }
    default: return [{ d: rectPath(i, i, iw, ih, Math.max(0, (+s.radius || 0) - i)), ...style }];
  }
}

const TOKEN_FALLBACK = { c1: "#5b4cf0", c2: "#ff7a59", c3: "#e8e5fe" };
const hex = (v) => { const s = String(v || "").trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(s)) return s; if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join(""); return null; };
export function resolveColor(v, colors = {}) {
  if (v == null || v === "" || v === "none") return "none";
  if (typeof v === "string" && v[0] === "$") { const k = "c" + v.slice(1); return hex(colors[k]) || TOKEN_FALLBACK[k] || "#000000"; }
  return hex(v) || "#000000";
}
/** Primitives of an element (sticker) in its own viewBox units (vb[0] × vb[1]); scale them to the box. */
export function elementPrims(e) {
  return (e.parts || []).map((p) => {
    if (p.t != null) return { t: p.t, x: p.x, y: p.y, size: p.size, fill: resolveColor(p.fill ?? "#000000", e.colors), bold: !!p.bold, italic: !!p.italic, font: p.font || "sans", anchor: p.anchor || "start", ls: p.ls || 0, op: p.op };
    return { d: p.d, fill: resolveColor(p.fill, e.colors), stroke: resolveColor(p.stroke, e.colors), sw: p.sw ?? 1, cap: p.cap || "round", join: p.join || "round", op: p.op, ...(Array.isArray(p.dash) && p.dash.length ? { dash: p.dash } : {}) };
  });
}
/** Colours used by an element's parts (token keys first): ['c1', 'c2', '#ffffff' ...]. */
export function elementTokens(e) {
  const set = new Set();
  for (const p of e.parts || []) for (const v of [p.fill, p.stroke]) if (typeof v === "string" && v[0] === "$") set.add("c" + v.slice(1));
  return [...set].sort();
}

/** Clip outline of a photo frame / rounded image in its w × h box. */
/** Photo frame shapes (Canva's Frames: basic shapes, hearts, stars, arches, blobs …). */
export const FRAME_SHAPES = [["rect", "Square"], ["rounded", "Rounded"], ["circle", "Circle"], ["heart", "Heart"], ["star", "Star"], ["hexagon", "Hexagon"], ["triangle", "Triangle"], ["diamond", "Diamond"], ["arch", "Arch"], ["blob", "Blob"]];
/** Outline points of the shaped frames in a w × h box (null for rect / rounded / circle). f: the frame (shape "path":
 *  its own outline f.pts in 0..1 of the box, from the Elements panel's frames). */
export function frameOutline(shape, w, h, f = null) {
  const N = 96;
  if (shape === "path") return Array.isArray(f?.pts) && f.pts.length >= 3 ? f.pts.map(([x, y]) => [x * w, y * h]) : null;
  if (shape === "star") return starPoints(5, 0, 0, w, h, 0.5);
  if (shape === "hexagon") return polygonPoints(6, 0, 0, w, h);
  if (shape === "triangle") return [[w / 2, 0], [w, h], [0, h]];
  if (shape === "diamond") return [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
  if (shape === "heart") return fitPoints(Array.from({ length: N }, (_, i) => { const t = (i / N) * Math.PI * 2; return [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; }), 0, 0, w, h);
  if (shape === "blob") return fitPoints(Array.from({ length: N }, (_, i) => { const t = (i / N) * Math.PI * 2, r = 1 + 0.09 * Math.sin(3 * t + 0.6) + 0.06 * Math.cos(5 * t); return [r * Math.cos(t), r * Math.sin(t)]; }), 0, 0, w, h);
  if (shape === "arch") { const r = w / 2, top = Math.min(r, h); const arc = Array.from({ length: 33 }, (_, i) => { const a = Math.PI + (i / 32) * Math.PI; return [r + r * Math.cos(a), top + top * Math.sin(a)]; }); return [[0, h], ...arc, [w, h]]; }
  return null;
}
export function framePath(shape, w, h, radius = 0, f = null) {
  const pts = frameOutline(shape, w, h, f);
  if (pts) return polyPath(pts);
  if (shape === "circle") return ellipsePath(w / 2, h / 2, w / 2, h / 2);
  if (shape === "rounded") return rectPath(0, 0, w, h, radius || Math.min(w, h) * 0.12);
  return rectPath(0, 0, w, h, radius || 0);
}

/** Crop (0..1 of the source) that covers a w × h box with an nw × nh image, centred. */
export function coverCrop(nw, nh, w, h) {
  if (!(nw > 0 && nh > 0)) return { x: 0, y: 0, w: 1, h: 1 };
  const src = nw / nh, box = w / h;
  if (src > box) { const cw = box / src; return { x: (1 - cw) / 2, y: 0, w: cw, h: 1 }; }
  const ch = src / box; return { x: 0, y: (1 - ch) / 2, w: 1, h: ch };
}

/** CSS filter string for image filters (also used by canvas ctx.filter). */
export function cssFilter(f) {
  if (!f) return "none";
  const parts = [];
  if (f.brightness != null && f.brightness !== 1) parts.push(`brightness(${n(f.brightness)})`);
  if (f.contrast != null && f.contrast !== 1) parts.push(`contrast(${n(f.contrast)})`);
  if (f.saturate != null && f.saturate !== 1) parts.push(`saturate(${n(f.saturate)})`);
  if (f.grayscale) parts.push(`grayscale(${n(f.grayscale)})`);
  if (f.sepia) parts.push(`sepia(${n(f.sepia)})`);
  if (f.hue) parts.push(`hue-rotate(${n(f.hue)}deg)`);
  if (f.blur) parts.push(`blur(${n(f.blur)}px)`);
  return parts.length ? parts.join(" ") : "none";
}
export const hasFilters = (f) => cssFilter(f) !== "none";

/** Linear gradient line (CSS angle: 0deg = to top, 90deg = to right) for a w × h area. */
export function gradientLine(angle, w, h) {
  const a = ((+angle || 0) * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  return { x1: w / 2 - (dx * len) / 2, y1: h / 2 - (dy * len) / 2, x2: w / 2 + (dx * len) / 2, y2: h / 2 + (dy * len) / 2 };
}
