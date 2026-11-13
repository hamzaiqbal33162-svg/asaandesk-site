// Helpers for the editors' insert adapters (LEFT-RAIL PANELS PARITY, Nov 13): what the shared panel kit
// (shared/panels/) hands an editor (relative sizes, vector SVG, shape / frame / chart / table / grid specs) turned into
// the numbers and native objects each editor stores. Loaded only when something is inserted (dynamic import), so the
// editors' first load does not grow. Pure functions except imageSize() / photoDataUrl() (browser).
//   relBox(rel, aspect, base)      box whose longer side = rel × base (base = the page's shorter side)
//   textSize(spec, base)           font size of a kit text spec (rel = font size / shorter side; role defaults)
//   parsePath(d) / pathString()    any SVG path -> absolute M L C Q A Z segments (H/V/S/T expanded)
//   mapPath(d, sx, sy, tx, ty)     scaled + moved path (arcs kept), "" when it cannot be read
//   svgToParts(markup)             plain vector SVG -> { vb, parts, defaults } (element / sticker parts with up to three
//                                  recolourable colours $1..$3) or null (gradients, animation, images, filters...)
//   frameOutline(spec, w, h)       outline path of a photo frame in a w × h box (Studio's frame shapes or spec.d/vb)
//   framePlaceholderSvg / framedPhotoSvg   an empty frame picture / a photo clipped to the frame (cover crop)
//   chartModel(spec) / tableModel(spec) / gridRects(spec, box)
import { framePath } from "../studio/shapes.js";

export const svgUrl = (markup) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(String(markup || ""));
const n2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
export const escXml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Box for an inserted item: its longer side = rel × base; aspect = w / h. */
export function relBox(rel, aspect, base, def = 0.3) {
  const L = Math.max(4, (+rel > 0 ? +rel : def) * base), a = +aspect > 0 ? +aspect : 1;
  return a >= 1 ? { w: L, h: L / a } : { w: L * a, h: L };
}
export const ROLE_REL = { heading: 0.075, subheading: 0.045, body: 0.03, caption: 0.022 };
/** Font size for a kit text spec: rel is the font size as a fraction of the page's shorter side. */
export function textSize(spec, base, min = 6) {
  const rel = +spec?.rel > 0 ? +spec.rel : ROLE_REL[spec?.role] || ROLE_REL.body;
  return Math.max(min, Math.round(rel * base * 10) / 10);
}
/** The text of a kit text spec as it should read (uppercase applied when the editor has no caps flag). */
export const textOf = (spec, caps = true) => { const t = String(spec?.content ?? ""); return caps && spec?.uppercase ? t.toUpperCase() : t; };

/* ---------------- paths ---------------- */
const CMD = /[MmLlHhVvCcSsQqTtAaZz]/;
/** Absolute segments [["M", x, y], ["L", x, y], ["C", ...6], ["Q", ...4], ["A", rx, ry, rot, large, sweep, x, y], ["Z"]] or null. */
export function parsePath(d) {
  const s = String(d ?? ""); let i = 0;
  const out = [];
  const skip = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
  const num = () => { skip(); const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(s.slice(i, i + 40)); if (!m) return null; i += m[0].length; return +m[0]; };
  const flag = () => { skip(); const c = s[i]; if (c === "0" || c === "1") { i++; return +c; } return null; };
  let cmd = null, x = 0, y = 0, x0 = 0, y0 = 0, last = null; // last: [type, cx, cy] control point for S / T
  for (let guard = 0; guard < 200000; guard++) {
    skip();
    if (i >= s.length) break;
    if (/[a-zA-Z]/.test(s[i])) {
      if (!CMD.test(s[i])) return null;
      cmd = s[i++];
      if (cmd === "Z" || cmd === "z") { out.push(["Z"]); x = x0; y = y0; last = null; continue; }
    } else if (!cmd || cmd === "Z" || cmd === "z") return null;
    const C = cmd.toUpperCase(), rel = cmd !== C, ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === "M" || C === "L" || C === "T") {
      const a = num(), b = num(); if (a == null || b == null) return null;
      const nx = ox + a, ny = oy + b;
      if (C === "M") { out.push(["M", nx, ny]); x0 = nx; y0 = ny; cmd = rel ? "l" : "L"; last = null; }
      else if (C === "L") { out.push(["L", nx, ny]); last = null; }
      else { const [qx, qy] = last && last[0] === "Q" ? [2 * x - last[1], 2 * y - last[2]] : [x, y]; out.push(["Q", qx, qy, nx, ny]); last = ["Q", qx, qy]; }
      x = nx; y = ny;
    } else if (C === "H" || C === "V") {
      const a = num(); if (a == null) return null;
      if (C === "H") x = ox + a; else y = oy + a;
      out.push(["L", x, y]); last = null;
    } else if (C === "C") {
      const v = [num(), num(), num(), num(), num(), num()]; if (v.some((q) => q == null)) return null;
      const seg = ["C", ox + v[0], oy + v[1], ox + v[2], oy + v[3], ox + v[4], oy + v[5]];
      out.push(seg); last = ["C", seg[3], seg[4]]; x = seg[5]; y = seg[6];
    } else if (C === "S") {
      const v = [num(), num(), num(), num()]; if (v.some((q) => q == null)) return null;
      const [c1x, c1y] = last && last[0] === "C" ? [2 * x - last[1], 2 * y - last[2]] : [x, y];
      const seg = ["C", c1x, c1y, ox + v[0], oy + v[1], ox + v[2], oy + v[3]];
      out.push(seg); last = ["C", seg[3], seg[4]]; x = seg[5]; y = seg[6];
    } else if (C === "Q") {
      const v = [num(), num(), num(), num()]; if (v.some((q) => q == null)) return null;
      const seg = ["Q", ox + v[0], oy + v[1], ox + v[2], oy + v[3]];
      out.push(seg); last = ["Q", seg[1], seg[2]]; x = seg[3]; y = seg[4];
    } else if (C === "A") {
      const rx = num(), ry = num(), rot = num(), la = flag(), sw = flag(), a = num(), b = num();
      if ([rx, ry, rot, la, sw, a, b].some((q) => q == null)) return null;
      out.push(["A", Math.abs(rx), Math.abs(ry), rot, la, sw, ox + a, oy + b]); x = ox + a; y = oy + b; last = null;
    }
  }
  return out.length && out[0][0] === "M" ? out : null;
}
export const pathString = (segs) => segs.map((g) => g[0] + (g.length > 1 ? g.slice(1).map(n2).join(" ") : "")).join("");
/** Applies x' = sx·x + tx, y' = sy·y + ty to segments (arcs: radii scaled, sweep flipped when mirrored). */
export function mapSegs(segs, sx, sy, tx = 0, ty = 0) {
  const X = (v) => sx * v + tx, Y = (v) => sy * v + ty;
  return segs.map((g) => {
    if (g[0] === "Z") return g;
    if (g[0] === "A") return ["A", g[1] * Math.abs(sx), g[2] * Math.abs(sy), g[3], g[4], sx * sy < 0 ? 1 - g[5] : g[5], X(g[6]), Y(g[7])];
    return [g[0], ...g.slice(1).map((v, j) => (j % 2 ? Y(v) : X(v)))];
  });
}
export function mapPath(d, sx = 1, sy = 1, tx = 0, ty = 0) { const s = parsePath(d); return s ? pathString(mapSegs(s, sx, sy, tx, ty)) : ""; }
/** Bounding box of a path's points (control points included: a little generous for curves). */
export function pathBounds(d) {
  const s = parsePath(d); if (!s) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of s) { const v = g[0] === "A" ? g.slice(6) : g.slice(1); for (let j = 0; j + 1 < v.length; j += 2) { x0 = Math.min(x0, v[j]); x1 = Math.max(x1, v[j]); y0 = Math.min(y0, v[j + 1]); y1 = Math.max(y1, v[j + 1]); } }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

function arcPoints(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (!rx || !ry) return [[x2, y2]];
  const rad = (phi * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = co * dx + si * dy, yp = -si * dx + co * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp;
  let c = den ? Math.sqrt(Math.max(0, num / den)) : 0;
  if (fa === fs) c = -c;
  const cxp = (c * rx * yp) / ry, cyp = (-c * ry * xp) / rx;
  const cx = co * cxp - si * cyp + (x1 + x2) / 2, cy = si * cxp + co * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(dt) / (Math.PI / 16))), out = [];
  for (let i = 1; i <= n; i++) { const t = t1 + (dt * i) / n; out.push([cx + rx * Math.cos(t) * co - ry * Math.sin(t) * si, cy + rx * Math.cos(t) * si + ry * Math.sin(t) * co]); }
  return out;
}
/** A path as polygons (curves and arcs sampled): one point list per sub-path. */
export function flattenPath(d, steps = 12) {
  const s = parsePath(d); if (!s) return [];
  const subs = []; let cur = null, x = 0, y = 0, x0 = 0, y0 = 0;
  for (const g of s) {
    if (g[0] === "M") { cur = [[g[1], g[2]]]; subs.push(cur); x = x0 = g[1]; y = y0 = g[2]; continue; }
    if (!cur) { cur = [[x, y]]; subs.push(cur); }
    if (g[0] === "Z") { x = x0; y = y0; cur = null; continue; }
    if (g[0] === "L") cur.push([g[1], g[2]]);
    else if (g[0] === "C") for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * u * x + 3 * u * u * t * g[1] + 3 * u * t * t * g[3] + t * t * t * g[5], u * u * u * y + 3 * u * u * t * g[2] + 3 * u * t * t * g[4] + t * t * t * g[6]]); }
    else if (g[0] === "Q") for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * x + 2 * u * t * g[1] + t * t * g[3], u * u * y + 2 * u * t * g[2] + t * t * g[4]]); }
    else if (g[0] === "A") cur.push(...arcPoints(x, y, g[1], g[2], g[3], g[4], g[5], g[6], g[7]));
    const e = g[0] === "A" ? g.slice(6) : g.slice(-2); x = e[0]; y = e[1];
  }
  return subs.filter((p) => p.length >= 3);
}
/** Outline of a kit frame's own path as one polygon in 0..1 of its box (the largest sub-path), for frames whose
 *  shape is not one of Studio's: Studio stores it as frame.pts and draws, clips and exports it like its own shapes. */
export function framePoints(spec) {
  const vb = Array.isArray(spec?.vb) ? (spec.vb.length === 4 ? spec.vb : [0, 0, spec.vb[0], spec.vb[1]]) : null;
  if (!vb || !(vb[2] > 0 && vb[3] > 0)) return null;
  const subs = flattenPath(spec.d);
  if (!subs.length) return null;
  const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length]; a += ax * by - bx * ay; } return Math.abs(a / 2); };
  let pts = subs.reduce((best, p) => (area(p) > area(best) ? p : best), subs[0]);
  if (pts.length > 240) { const k = Math.ceil(pts.length / 240); pts = pts.filter((_, i) => i % k === 0); }
  const r4 = (v) => Math.round(v * 10000) / 10000;
  return pts.map(([px, py]) => [r4(Math.max(0, Math.min(1, (px - vb[0]) / vb[2]))), r4(Math.max(0, Math.min(1, (py - vb[1]) / vb[3])))]);
}

/* ---------------- colours ---------------- */
const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", gray: "#808080", grey: "#808080", pink: "#ffc0cb", navy: "#000080", teal: "#008080", gold: "#ffd700", silver: "#c0c0c0", brown: "#a52a2a", lime: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", maroon: "#800000", olive: "#808000", coral: "#ff7f50", crimson: "#dc143c", indigo: "#4b0082", violet: "#ee82ee", tomato: "#ff6347", salmon: "#fa8072", skyblue: "#87ceeb", tan: "#d2b48c", khaki: "#f0e68c", beige: "#f5f5dc", ivory: "#fffff0", lavender: "#e6e6fa", turquoise: "#40e0d0", chocolate: "#d2691e" };
/** '#rrggbb', 'none', or null when it is not a plain colour (url(), unknown names). */
export function normColor(v) {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s || s === "inherit") return undefined;
  if (s === "none" || s === "transparent") return "none";
  if (s === "currentcolor") return "#1b2133";
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join("");
  if (/^#[0-9a-f]{8}$/.test(s)) return s.slice(0, 7);
  const m = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/.exec(s);
  if (m) return "#" + [m[1], m[2], m[3]].map((x) => Math.max(0, Math.min(255, Math.round(+x))).toString(16).padStart(2, "0")).join("");
  return NAMED[s] || null;
}

/* ---------------- vector SVG -> element parts ---------------- */
const attrsOf = (s) => { const a = {}; for (const m of String(s).matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) a[m[1]] = m[3] ?? m[4]; return a; };
const styleOf = (a) => { const o = { ...a }; if (a.style) for (const kv of a.style.split(";")) { const [k, ...v] = kv.split(":"); if (k && v.length) o[k.trim()] = v.join(":").trim(); } return o; };
const unent = (t) => String(t).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(+c)).replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16))).replace(/&amp;/g, "&");
/** transform="translate() scale() matrix(a 0 0 d e f)" -> [sx, sy, tx, ty] (no rotation / skew), or null. */
function parseTransform(t) {
  let sx = 1, sy = 1, tx = 0, ty = 0;
  if (!t) return [sx, sy, tx, ty];
  for (const m of String(t).matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (v.some((q) => !Number.isFinite(q))) return null;
    // compose: current ∘ new (new applies first)
    let a = 1, d = 1, e = 0, f = 0;
    if (m[1] === "translate") { e = v[0] || 0; f = v[1] || 0; }
    else if (m[1] === "scale") { a = v[0] ?? 1; d = v[1] ?? a; }
    else if (m[1] === "matrix") { if (Math.abs(v[1]) > 1e-9 || Math.abs(v[2]) > 1e-9) return null; [a, , , d, e, f] = v; }
    else if (m[1] === "rotate" && !(+v[0])) continue;
    else return null;
    tx += sx * e; ty += sy * f; sx *= a; sy *= d;
  }
  return [sx, sy, tx, ty];
}
const ellipseD = (cx, cy, rx, ry) => `M${n2(cx - rx)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 0 ${n2(cx + rx)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 0 ${n2(cx - rx)} ${n2(cy)}Z`;
function rectD(x, y, w, h, rx, ry) {
  rx = Math.min(Math.max(0, rx || ry || 0), w / 2); ry = Math.min(Math.max(0, ry || rx || 0), h / 2);
  if (!rx || !ry) return `M${n2(x)} ${n2(y)}L${n2(x + w)} ${n2(y)}L${n2(x + w)} ${n2(y + h)}L${n2(x)} ${n2(y + h)}Z`;
  return `M${n2(x + rx)} ${n2(y)}L${n2(x + w - rx)} ${n2(y)}A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(x + w)} ${n2(y + ry)}L${n2(x + w)} ${n2(y + h - ry)}A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(x + w - rx)} ${n2(y + h)}L${n2(x + rx)} ${n2(y + h)}A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(x)} ${n2(y + h - ry)}L${n2(x)} ${n2(y + ry)}A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(x + rx)} ${n2(y)}Z`;
}
const pointsD = (pts, close) => { const v = String(pts || "").trim().split(/[\s,]+/).map(Number); if (v.length < 4 || v.some((q) => !Number.isFinite(q))) return null; let d = `M${n2(v[0])} ${n2(v[1])}`; for (let j = 2; j + 1 < v.length; j += 2) d += `L${n2(v[j])} ${n2(v[j + 1])}`; return d + (close ? "Z" : ""); };
const BAD_TAGS = /^(lineargradient|radialgradient|pattern|filter|mask|clippath|image|use|foreignobject|animate|animatetransform|animatemotion|set|style|textpath|symbol|marker|tspan|switch|script|a)$/i;
const FONT_OF = (ff) => (/mono|courier/i.test(ff || "") ? "mono" : /serif|times|georgia|cambria|garamond/i.test(ff || "") && !/sans/i.test(ff || "") ? "serif" : "sans");

/** Plain vector SVG (path / rect / circle / ellipse / line / polyline / polygon / simple text, groups with translate /
 *  scale) -> { vb: [w, h], parts, defaults: { c1, c2, c3 } } with the three most used colours as tokens $1..$3.
 *  null for anything else (gradients, filters, clip paths, images, animation, rotation, even-odd fills). */
export function svgToParts(markup, { maxParts = 600 } = {}) {
  const src = String(markup || "");
  if (/url\s*\(/i.test(src) || /fill-rule\s*[:=]\s*["']?evenodd/i.test(src) || /<!\[CDATA\[/.test(src)) return null;
  const root = /<svg\b([^>]*)>/i.exec(src);
  if (!root) return null;
  const ra = attrsOf(root[1]);
  let vb = String(ra.viewBox || ra.viewbox || "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((q) => !Number.isFinite(q)) || !(vb[2] > 0 && vb[3] > 0)) {
    const w = parseFloat(ra.width), h = parseFloat(ra.height);
    if (!(w > 0 && h > 0)) return null;
    vb = [0, 0, w, h];
  }
  const rootSt = styleOf(ra);
  const stack = [{ fill: normColor(rootSt.fill) ?? "#000000", stroke: normColor(rootSt.stroke) ?? "none", sw: parseFloat(rootSt["stroke-width"]) || 1, op: 1, fop: 1, sop: 1, cap: rootSt["stroke-linecap"], join: rootSt["stroke-linejoin"], dash: rootSt["stroke-dasharray"], tf: [1, 1, -vb[0], -vb[1]], ff: rootSt["font-family"], fs: parseFloat(rootSt["font-size"]) || 16, fw: rootSt["font-weight"], fst: rootSt["font-style"], anchor: rootSt["text-anchor"] }];
  if (stack[0].fill === null || stack[0].stroke === null) return null;
  const parts = [];
  const body = src.slice(root.index + root[0].length);
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>|([^<]+)/g;
  let inText = null, inDefs = 0, inTitle = 0;
  for (const m of body.matchAll(re)) {
    if (m[0].startsWith("<!--")) continue;
    if (m[5] != null) { if (inText) inText.t += m[5]; else if (!inDefs && !inTitle && m[5].trim()) return null; continue; }
    const close = m[1] === "/", tag = m[2].toLowerCase(), self = m[4] === "/";
    if (tag === "svg" && close) break;
    if (tag === "title" || tag === "desc" || tag === "metadata") { if (!self) inTitle += close ? -1 : 1; continue; }
    if (tag === "defs") { if (!self) inDefs += close ? -1 : 1; continue; }
    if (inDefs || inTitle) continue;
    if (BAD_TAGS.test(tag) || tag === "svg") return null;
    if (close) {
      if (tag === "g") { if (stack.length < 2) return null; stack.pop(); }
      else if (tag === "text" && inText) { const t = unent(inText.t).replace(/\s+/g, " ").trim(); if (t) parts.push({ ...inText.part, t }); inText = null; }
      continue;
    }
    const top = stack[stack.length - 1];
    const a = styleOf(attrsOf(m[3]));
    const tf0 = parseTransform(a.transform);
    if (!tf0) return null;
    const [psx, psy, ptx, pty] = top.tf;
    const tf = [psx * tf0[0], psy * tf0[1], ptx + psx * tf0[2], pty + psy * tf0[3]];
    const fillC = a.fill !== undefined ? normColor(a.fill) : top.fill, strokeC = a.stroke !== undefined ? normColor(a.stroke) : top.stroke;
    if (fillC === null || strokeC === null) return null;
    const st = {
      fill: fillC ?? top.fill, stroke: strokeC ?? top.stroke,
      sw: a["stroke-width"] != null ? parseFloat(a["stroke-width"]) || 0 : top.sw,
      op: top.op * (a.opacity != null ? +a.opacity : 1), fop: a["fill-opacity"] != null ? +a["fill-opacity"] : top.fop, sop: a["stroke-opacity"] != null ? +a["stroke-opacity"] : top.sop,
      cap: a["stroke-linecap"] || top.cap, join: a["stroke-linejoin"] || top.join, dash: a["stroke-dasharray"] ?? top.dash, tf,
      ff: a["font-family"] || top.ff, fs: a["font-size"] != null ? parseFloat(a["font-size"]) || top.fs : top.fs, fw: a["font-weight"] || top.fw, fst: a["font-style"] || top.fst, anchor: a["text-anchor"] || top.anchor,
    };
    if (a.display === "none" || a.visibility === "hidden") { if (tag === "g" && !self) stack.push({ ...st, fill: "none", stroke: "none" }); continue; }
    if (tag === "g") { if (!self) stack.push(st); continue; }
    if (tag === "text") {
      if (self) continue;
      if (Math.abs(st.tf[0] - st.tf[1]) > 1e-6 * Math.max(1, Math.abs(st.tf[0]))) return null; // stretched text
      const k = st.tf[0], x = parseFloat(a.x) || 0, y = parseFloat(a.y) || 0;
      const ls = parseFloat(a["letter-spacing"]);
      inText = { t: "", part: { x: n2(k * x + st.tf[2]), y: n2(k * y + st.tf[3]), size: n2(st.fs * k), fill: st.fill === "none" ? "#000000" : st.fill, bold: /bold|[6-9]00/.test(String(st.fw || "")), italic: /italic|oblique/.test(String(st.fst || "")), font: FONT_OF(st.ff), anchor: ["middle", "end"].includes(st.anchor) ? st.anchor : "start", ...(ls ? { ls: n2(ls * k) } : {}), ...(st.op * st.fop < 0.999 ? { op: n2(st.op * st.fop) } : {}) } };
      continue;
    }
    let d = null;
    const P = (k) => parseFloat(a[k]) || 0;
    if (tag === "path") d = a.d;
    else if (tag === "rect") { if (!(P("width") > 0 && P("height") > 0)) continue; d = rectD(P("x"), P("y"), P("width"), P("height"), P("rx"), P("ry")); }
    else if (tag === "circle") { if (!(P("r") > 0)) continue; d = ellipseD(P("cx"), P("cy"), P("r"), P("r")); }
    else if (tag === "ellipse") { if (!(P("rx") > 0 && P("ry") > 0)) continue; d = ellipseD(P("cx"), P("cy"), P("rx"), P("ry")); }
    else if (tag === "line") d = `M${n2(P("x1"))} ${n2(P("y1"))}L${n2(P("x2"))} ${n2(P("y2"))}`;
    else if (tag === "polyline" || tag === "polygon") d = pointsD(a.points, tag === "polygon");
    else return null; // unknown drawing element
    if (!d) continue;
    const segs = parsePath(d);
    if (!segs) return null;
    const fill = tag === "line" ? "none" : st.fill;
    if (fill === "none" && (st.stroke === "none" || !(st.sw > 0))) continue;
    const k = Math.sqrt(Math.abs(st.tf[0] * st.tf[1]));
    const part = { d: pathString(mapSegs(segs, st.tf[0], st.tf[1], st.tf[2], st.tf[3])), fill, stroke: st.sw > 0 ? st.stroke : "none", sw: n2(st.sw * k) };
    if (st.cap && st.cap !== "round") part.cap = st.cap;
    if (st.join && st.join !== "round") part.join = st.join;
    const op = st.op * (fill !== "none" ? st.fop : st.sop);
    if (op < 0.999) part.op = n2(Math.max(0, op));
    if (st.dash && st.dash !== "none" && part.stroke !== "none") { const dv = String(st.dash).split(/[\s,]+/).map(Number).filter((q) => q >= 0); if (dv.length) part.dash = dv.map((q) => n2(q * k)); }
    parts.push(part);
    if (parts.length > maxParts) return null;
  }
  if (!parts.length) return null;
  // The three most used colours become recolourable tokens ($1 main, $2, $3), like the elements library.
  const count = new Map();
  for (const p of parts) for (const c of [p.fill, p.stroke]) if (c && c !== "none" && c[0] === "#") count.set(c, (count.get(c) || 0) + 1);
  const top = [...count.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map((e) => e[0]);
  const tok = new Map(top.map((c, i) => [c, "$" + (i + 1)]));
  const defaults = {};
  top.forEach((c, i) => { defaults["c" + (i + 1)] = c; });
  for (const p of parts) { if (tok.has(p.fill)) p.fill = tok.get(p.fill); if (tok.has(p.stroke)) p.stroke = tok.get(p.stroke); }
  return { vb: [n2(vb[2]), n2(vb[3])], parts, defaults };
}

/* ---------------- frames, grids ---------------- */
const STUDIO_FRAMES = ["rect", "rounded", "circle", "heart", "star", "hexagon", "triangle", "diamond", "arch", "blob"];
export const isStudioFrame = (shape) => STUDIO_FRAMES.includes(shape);
const FRAME_ALIAS = { square: "rect", rectangle: "rect", portrait: "rect", landscape: "rect", polaroid: "rect", film: "rect", photo: "rect", round: "circle", oval: "circle", ellipse: "circle", "rounded-rect": "rounded", roundrect: "rounded", hex: "hexagon" };
/** Studio frame shape name for a kit frame spec ("path" when only spec.d describes it). */
export function frameShapeOf(spec) {
  const s = String(spec?.shape || "").toLowerCase();
  if (isStudioFrame(s)) return s;
  if (spec?.d && spec?.vb) return "path";
  return FRAME_ALIAS[s] || "rect";
}
/** Outline path of a kit frame in a w × h box. */
export function frameOutline(spec, w, h) {
  const shape = frameShapeOf(spec);
  if (shape === "path") {
    const [vw, vh] = Array.isArray(spec.vb) ? (spec.vb.length === 4 ? [spec.vb[2], spec.vb[3]] : spec.vb) : [100, 100];
    const ox = Array.isArray(spec.vb) && spec.vb.length === 4 ? -spec.vb[0] : 0, oy = Array.isArray(spec.vb) && spec.vb.length === 4 ? -spec.vb[1] : 0;
    const d = mapPath(spec.d, w / vw, h / vh, ox * (w / vw), oy * (h / vh));
    if (d) return d;
  }
  return framePath(shape === "path" ? "rect" : shape, w, h, shape === "rounded" ? Math.min(w, h) * 0.12 : 0);
}
/** Screen box of a device frame (0..1 of the frame) or null. */
export function deviceScreen(spec) {
  const s = spec?.screen;
  if (Array.isArray(s) && s.length === 4 && s.every((v) => Number.isFinite(+v))) return s.map(Number);
  return null;
}
/** An empty photo frame: light fill in the frame's outline with a small picture sign in the middle. */
export function framePlaceholderSvg(spec, w, h) {
  const d = frameOutline(spec, w, h), m = Math.min(w, h), s = m * 0.22, cx = w / 2, cy = h / 2;
  const icon = `<g fill="none" stroke="#9aa1b5" stroke-width="${n2(Math.max(1, m * 0.012))}" stroke-linejoin="round"><rect x="${n2(cx - s / 2)}" y="${n2(cy - s * 0.38)}" width="${n2(s)}" height="${n2(s * 0.76)}" rx="${n2(s * 0.08)}"/><path d="M${n2(cx - s * 0.42)} ${n2(cy + s * 0.3)}L${n2(cx - s * 0.12)} ${n2(cy)}L${n2(cx + s * 0.08)} ${n2(cy + s * 0.18)}L${n2(cx + s * 0.22)} ${n2(cy + s * 0.06)}L${n2(cx + s * 0.42)} ${n2(cy + s * 0.3)}"/><circle cx="${n2(cx + s * 0.18)}" cy="${n2(cy - s * 0.14)}" r="${n2(s * 0.07)}"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(w)} ${n2(h)}" width="${n2(w)}" height="${n2(h)}"><path d="${d}" fill="#e6e8ef"/>${icon}</svg>`;
}
/** A photo cropped to cover the frame and clipped to its outline (src should be a data URL so the picture stands alone). */
export function framedPhotoSvg(spec, w, h, src, nw, nh, fx = 0.5, fy = 0.5) {
  const d = frameOutline(spec, w, h);
  let iw = w, ih = h;
  if (nw > 0 && nh > 0) { const k = Math.max(w / nw, h / nh); iw = nw * k; ih = nh * k; }
  const ix = (w - iw) * fx, iy = (h - ih) * fy;
  const id = "f" + Math.random().toString(36).slice(2, 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${n2(w)} ${n2(h)}" width="${n2(w)}" height="${n2(h)}"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><image clip-path="url(#${id})" x="${n2(ix)}" y="${n2(iy)}" width="${n2(iw)}" height="${n2(ih)}" preserveAspectRatio="xMidYMid slice" href="${escXml(src)}" xlink:href="${escXml(src)}"/></svg>`;
}
/** Grid cells (spec.cells in 0..1) laid out in a box with spec.gap (fraction of the shorter side when < 1, else px)
 *  between neighbouring cells and none at the outer edge. */
export function gridRects(spec, box) {
  const cells = Array.isArray(spec?.cells) && spec.cells.length ? spec.cells : [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]];
  const m = Math.min(box.w, box.h), g = +spec?.gap > 0 ? (+spec.gap < 1 ? +spec.gap * m : +spec.gap) : 0;
  return cells.map(([cx, cy, cw, ch]) => {
    const l = cx > 0.001 ? g / 2 : 0, t = cy > 0.001 ? g / 2 : 0, r = cx + cw < 0.999 ? g / 2 : 0, b = cy + ch < 0.999 ? g / 2 : 0;
    return { x: box.x + cx * box.w + l, y: box.y + cy * box.h + t, w: Math.max(4, cw * box.w - l - r), h: Math.max(4, ch * box.h - t - b) };
  });
}

/* ---------------- frame / grid pictures (editors whose only graphic is a picture: Docs, Sheets) ---------------- */
// An empty frame or grid is a picture that carries its own description (<desc>adframe:… / adgrid:…</desc>), so a photo
// dropped on it later can fill the frame (clipped to its outline) or the grid cell under the pointer.
const b64dec = (s) => { const b = atob(s); try { return decodeURIComponent(escape(b)); } catch { return b; } };
/** The SVG markup of a picture's data URL (base64 or text), or "". */
export function svgOfSrc(src) {
  const m = /^data:image\/svg\+xml(;[^,]*)?,(.*)$/s.exec(String(src || ""));
  if (!m) return "";
  try { return /;base64/i.test(m[1] || "") ? b64dec(m[2]) : decodeURIComponent(m[2]); } catch { return ""; }
}
const META_RE = /<desc>ad(frame|grid):([^<]*)<\/desc>/;
/** { kind: "frame" | "grid", spec } kept inside a frame / grid picture, or null. */
export function frameMeta(src) {
  const m = META_RE.exec(svgOfSrc(src));
  if (!m) return null;
  try { return { kind: m[1], spec: JSON.parse(decodeURIComponent(m[2])) }; } catch { return null; }
}
export const withFrameMeta = (svg, kind, spec) => svg.replace(/^(<svg\b[^>]*>)/, `$1<desc>ad${kind}:${encodeURIComponent(JSON.stringify(spec))}</desc>`);
/** Device / film / instant-photo frames: the body drawing (spec.under, else spec.svg) under photo spots in every
 *  window (spec.screens, 0..1 boxes), spec.over on top; filled window by window like a grid. { svg, w, h, aspect } */
export function devicePicture(spec) {
  const vb = Array.isArray(spec.vb) ? (spec.vb.length === 4 ? [spec.vb[2], spec.vb[3]] : spec.vb) : [100, 100];
  const aspect = vb[0] / vb[1], W = aspect >= 1 ? 600 : Math.round(600 * aspect), H = aspect >= 1 ? Math.round(600 / aspect) : 600;
  const screens = (Array.isArray(spec.screens) && spec.screens.length ? spec.screens : [spec.screen]).filter((s) => Array.isArray(s) && s.length === 4);
  const inner = (s) => String(s || "").replace(/^\s*<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const meta = { cells: screens, gap: 0, box: { w: W, h: H }, vb, under: spec.under != null ? String(spec.under) : inner(spec.svg), over: spec.over ? String(spec.over) : "" };
  return { svg: withFrameMeta(gridSvgOf(gridRects(meta, { x: 0, y: 0, w: W, h: H }), W, H, new Map(), meta), "grid", meta), w: W, h: H, aspect };
}
/** An empty photo frame picture (SVG markup) for a kit frame spec: { svg, w, h } with its description inside. */
export function framePicture(spec) {
  if ((spec?.screen || spec?.screens) && (spec.svg || spec.under != null)) return devicePicture(spec);
  const vb = Array.isArray(spec?.vb) ? (spec.vb.length === 4 ? spec.vb : [0, 0, spec.vb[0], spec.vb[1]]) : null;
  const aspect = +spec?.aspect > 0 ? +spec.aspect : vb ? vb[2] / vb[3] : 1;
  const box = relBox(1, aspect, 400);
  const meta = { shape: String(spec?.shape || "rect"), ...(spec?.d && vb ? { d: String(spec.d), vb } : {}), box: { w: Math.round(box.w), h: Math.round(box.h) } };
  return { svg: withFrameMeta(framePlaceholderSvg(meta, meta.box.w, meta.box.h), "frame", meta), w: meta.box.w, h: meta.box.h, aspect };
}
function gridSvgOf(rects, W, H, photos = new Map(), meta = null) {
  const cells = rects.map((c, i) => photos.has(i)
    ? `<image data-cell="${i}" x="${n2(c.x)}" y="${n2(c.y)}" width="${n2(c.w)}" height="${n2(c.h)}" preserveAspectRatio="xMidYMid slice" href="${escXml(photos.get(i))}"/>`
    : framePlaceholderSvg({ shape: "rect" }, c.w, c.h).replace(/^<svg[^>]*>/, `<svg x="${n2(c.x)}" y="${n2(c.y)}" width="${n2(c.w)}" height="${n2(c.h)}" viewBox="0 0 ${n2(c.w)} ${n2(c.h)}">`)).join("");
  // device / film frames: the body drawing under the photos, its overlay (notch, glare, shine) above them
  const layer = (markup) => (markup && meta?.vb ? `<svg x="0" y="0" width="${W}" height="${H}" viewBox="0 0 ${meta.vb[0]} ${meta.vb[1]}" preserveAspectRatio="none">${markup}</svg>` : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${layer(meta?.under)}${cells}${layer(meta?.over)}</svg>`;
}
/** An empty grid picture (SVG markup) for a kit grid spec: { svg, w, h, cells }. */
export function gridPicture(spec, W = 600, H = 400) {
  const meta = { cells: Array.isArray(spec?.cells) ? spec.cells : undefined, gap: spec?.gap, box: { w: W, h: H } };
  const rects = gridRects(meta, { x: 0, y: 0, w: W, h: H });
  return { svg: withFrameMeta(gridSvgOf(rects, W, H), "grid", meta), w: W, h: H, cells: rects.length };
}
/** A frame / grid picture with a photo in it (new SVG markup). photo: a data URL; at: { u, v } in 0..1 of the picture
 *  (grids: the cell under the pointer; else the first empty cell). null when src is not a frame / grid picture. */
export function fillFramePicture(src, photo, nw, nh, at = null) {
  const meta = frameMeta(src);
  if (!meta) return null;
  if (meta.kind === "frame") { const { w, h } = meta.spec.box || { w: 400, h: 400 }; return withFrameMeta(framedPhotoSvg(meta.spec, w, h, photo, nw, nh), "frame", meta.spec); }
  const g = meta.spec, W = g.box?.w || 600, H = g.box?.h || 400, rects = gridRects(g, { x: 0, y: 0, w: W, h: H });
  const photos = new Map([...svgOfSrc(src).matchAll(/<image data-cell="(\d+)"[^>]*?href="([^"]+)"/g)].map((m) => [+m[1], m[2].replace(/&amp;/g, "&")]));
  let i = rects.findIndex((_, k) => !photos.has(k));
  if (at) { const u = at.u * W, v = at.v * H; const hit = rects.findIndex((c) => u >= c.x && u <= c.x + c.w && v >= c.y && v <= c.y + c.h); if (hit >= 0) i = hit; }
  if (i < 0) i = 0;
  photos.set(i, photo);
  return withFrameMeta(gridSvgOf(rects, W, H, photos, g), "grid", g);
}

/* ---------------- charts and tables ---------------- */
/** { kind, title, labels, series: [{ name, values }] } with sample data when the spec has none. */
export function chartModel(spec = {}) {
  let labels = Array.isArray(spec.labels) && spec.labels.length ? spec.labels.map(String) : null;
  let series = Array.isArray(spec.series) && spec.series.length ? spec.series : null;
  if (series && typeof series[0] === "number") series = [{ name: spec.title || "Value", values: series }];
  series = (series || [{ name: "Sales", values: [12, 19, 15, 24] }]).map((s, i) => ({ name: String(s?.name ?? `Series ${i + 1}`), values: (Array.isArray(s?.values) ? s.values : []).map((v) => (Number.isFinite(+v) ? +v : 0)) }));
  const n = Math.max(1, labels?.length || 0, ...series.map((s) => s.values.length));
  labels = labels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].slice(0, n);
  while (labels.length < n) labels.push(`Item ${labels.length + 1}`);
  for (const s of series) while (s.values.length < labels.length) s.values.push(0);
  return { kind: String(spec.kind || "column"), title: String(spec.title ?? ""), labels, series };
}
/** { rows, cols, cells: string[][], header, style } padded to rows × cols. */
export function tableModel(spec = {}) {
  const src = Array.isArray(spec.cells) ? spec.cells : [];
  const rows = Math.max(1, Math.min(60, +spec.rows || src.length || 3));
  const cols = Math.max(1, Math.min(26, +spec.cols || Math.max(0, ...src.map((r) => (Array.isArray(r) ? r.length : 0))) || 3));
  const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => String(src[r]?.[c] ?? (r === 0 && !src.length && spec.header !== false ? `Heading ${c + 1}` : ""))));
  return { rows, cols, cells, header: spec.header !== false, style: { ...(spec.style || {}) } };
}

/* ---------------- browser helpers ---------------- */
const sizes = new Map();
/** Natural size of a picture ({ nw, nh }; 0 × 0 when it cannot load). */
export function imageSize(src) {
  if (sizes.has(src)) return sizes.get(src);
  const p = new Promise((res) => {
    if (typeof Image !== "function") { res({ nw: 0, nh: 0 }); return; }
    const im = new Image();
    const t = setTimeout(() => res({ nw: 0, nh: 0 }), 8000);
    im.onload = () => { clearTimeout(t); res({ nw: im.naturalWidth || 0, nh: im.naturalHeight || 0 }); };
    im.onerror = () => { clearTimeout(t); res({ nw: 0, nh: 0 }); };
    im.src = src;
  });
  sizes.set(src, p);
  return p;
}
/** A picture as a data URL (so it can sit inside an SVG picture that stands on its own). */
export async function photoDataUrl(src) {
  if (/^data:/.test(src)) return src;
  const r = await fetch(src);
  if (!r.ok) throw new Error("The photo could not be loaded.");
  const b = await r.blob();
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error("The photo could not be read.")); fr.readAsDataURL(b); });
}
/** Size of an SVG drawing from its markup (viewBox / width / height). */
export function svgSize(markup) {
  const root = /<svg\b([^>]*)>/i.exec(String(markup || ""));
  if (!root) return { w: 0, h: 0 };
  const a = attrsOf(root[1]), vb = String(a.viewBox || "").trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { w: vb[2], h: vb[3] };
  return { w: parseFloat(a.width) || 0, h: parseFloat(a.height) || 0 };
}
