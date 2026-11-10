// Whiteboard geometry (pure, no DOM): shape outlines, boundary points, connector routing,
// stroke smoothing and hit tests. Coordinates are board pixels, y down.

export const SIDES = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
const n2 = (v) => Math.round(v * 100) / 100;
const P = (p) => `${n2(p[0])} ${n2(p[1])}`;

export const center = (o) => [o.x + o.w / 2, o.y + o.h / 2];
export const rectOf = (o) => ({ x: o.x, y: o.y, w: o.w, h: o.h });
export function unionRect(rects) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) { if (!r) continue; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export const rectsIntersect = (a, b) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
export const rectContains = (outer, inner) => inner.x >= outer.x - 0.01 && inner.y >= outer.y - 0.01 && inner.x + inner.w <= outer.x + outer.w + 0.01 && inner.y + inner.h <= outer.y + outer.h + 0.01;
export function normRect(x0, y0, x1, y1) { return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }; }
export function pointsBounds(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* ---------------------------------------------------------------- outlines */
const STAR_UNIT = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, r = i % 2 ? 0.45 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const b = pointsBounds(pts);
  return pts.map(([x, y]) => [(x - b.x) / b.w, (y - b.y) / b.h]);
})();

/** Polygon points of a shape kind in its box (null for rect-like and ellipse outlines). */
export function shapePolygon(kind, x, y, w, h) {
  if (kind === "diamond") return [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
  if (kind === "triangle") return [[x + w / 2, y], [x + w, y + h], [x, y + h]];
  if (kind === "star") return STAR_UNIT.map(([u, v]) => [x + u * w, y + v * h]);
  return null;
}
/** Outline kind used for routing and hit tests of any object. */
export function outlineKind(o) {
  if (o.type === "shape") return o.kind === "rounded" ? "rect" : o.kind;
  return "rect";
}
/** Ellipse as four cubic Bézier arcs (works the same in SVG, canvas Path2D and pdf-lib). */
export function ellipsePath(cx, cy, rx, ry) {
  const k = 0.5522847498;
  return `M${P([cx + rx, cy])} C${P([cx + rx, cy + ry * k])} ${P([cx + rx * k, cy + ry])} ${P([cx, cy + ry])} C${P([cx - rx * k, cy + ry])} ${P([cx - rx, cy + ry * k])} ${P([cx - rx, cy])} C${P([cx - rx, cy - ry * k])} ${P([cx - rx * k, cy - ry])} ${P([cx, cy - ry])} C${P([cx + rx * k, cy - ry])} ${P([cx + rx, cy - ry * k])} ${P([cx + rx, cy])} Z`;
}
export function roundRectPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${P([x, y])} L${P([x + w, y])} L${P([x + w, y + h])} L${P([x, y + h])} Z`;
  const k = r * 0.4477152502; // r - r*0.5523
  return `M${P([x + r, y])} L${P([x + w - r, y])} C${P([x + w - k, y])} ${P([x + w, y + k])} ${P([x + w, y + r])} L${P([x + w, y + h - r])} C${P([x + w, y + h - k])} ${P([x + w - k, y + h])} ${P([x + w - r, y + h])} L${P([x + r, y + h])} C${P([x + k, y + h])} ${P([x, y + h - k])} ${P([x, y + h - r])} L${P([x, y + r])} C${P([x, y + k])} ${P([x + k, y])} ${P([x + r, y])} Z`;
}
export const polygonPath = (pts) => `M${pts.map(P).join(" L")} Z`;
/** Path of a shape kind: rect | rounded | ellipse | diamond | triangle | star. */
export function shapePath(kind, x, y, w, h) {
  if (kind === "ellipse") return ellipsePath(x + w / 2, y + h / 2, w / 2, h / 2);
  if (kind === "rounded") return roundRectPath(x, y, w, h, Math.min(18, w / 4, h / 4));
  const poly = shapePolygon(kind, x, y, w, h);
  return poly ? polygonPath(poly) : roundRectPath(x, y, w, h, 0);
}

/* ---------------------------------------------------------------- boundary points */
function rayPolygon(c, d, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - c[0]) * ey - (a[1] - c[1]) * ex) / den;
    const u = ((a[0] - c[0]) * d[1] - (a[1] - c[1]) * d[0]) / den;
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
  }
  return best === Infinity ? null : best;
}
/** The point where the ray from the object's centre towards (tx, ty) leaves its outline. */
export function boundaryPoint(o, tx, ty) {
  const c = center(o);
  let dx = tx - c[0], dy = ty - c[1];
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) { dx = 1; dy = 0; }
  const kind = outlineKind(o);
  if (kind === "ellipse") {
    const rx = Math.max(o.w / 2, 1e-6), ry = Math.max(o.h / 2, 1e-6);
    const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
    return [c[0] + dx * t, c[1] + dy * t];
  }
  const poly = shapePolygon(kind, o.x, o.y, o.w, o.h) || [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
  const t = rayPolygon(c, [dx, dy], poly);
  return t == null ? c : [c[0] + dx * t, c[1] + dy * t];
}
/** Port on one side (top | right | bottom | left) of the outline. */
export function sidePoint(o, side) {
  const d = SIDES[side] || SIDES.right, c = center(o);
  return boundaryPoint(o, c[0] + d[0] * 1e4, c[1] + d[1] * 1e4);
}
/** Distance from a point to the outline of an object (0 = on it). Used by tests and hit tests. */
export function distToOutline(o, x, y) {
  const kind = outlineKind(o);
  if (kind === "ellipse") {
    const c = center(o), b = boundaryPoint(o, x, y);
    const rIn = Math.hypot(b[0] - c[0], b[1] - c[1]), r = Math.hypot(x - c[0], y - c[1]);
    return Math.abs(r - rIn);
  }
  const poly = shapePolygon(kind, o.x, o.y, o.w, o.h) || [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) best = Math.min(best, distToSegment(x, y, poly[i], poly[(i + 1) % poly.length]));
  return best;
}

/* ---------------------------------------------------------------- hit tests */
export function distToSegment(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
export function distToPolyline(pts, x, y) {
  if (!pts.length) return Infinity;
  if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSegment(x, y, pts[i - 1], pts[i]));
  return best;
}
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Is (x, y) inside the object's filled outline (with a tolerance in board px)? */
export function pointInOutline(o, x, y, tol = 0) {
  if (x < o.x - tol || y < o.y - tol || x > o.x + o.w + tol || y > o.y + o.h + tol) return false;
  const kind = outlineKind(o);
  if (kind === "ellipse") {
    const rx = o.w / 2 + tol, ry = o.h / 2 + tol, c = center(o);
    return ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 <= 1;
  }
  const poly = shapePolygon(kind, o.x, o.y, o.w, o.h);
  if (!poly) return true;
  return pointInPolygon(x, y, poly) || distToOutline(o, x, y) <= tol;
}

/* ---------------------------------------------------------------- connector routing */
export const STUB = 24;
const sideDir = (s) => SIDES[s];
/** Picks facing sides for two boxes from their relative position. */
export function autoSides(a, b) {
  const ca = center(a), cb = center(b);
  const dx = cb[0] - ca[0], dy = cb[1] - ca[1];
  const kx = Math.abs(dx) / Math.max(1, (a.w + b.w) / 2), ky = Math.abs(dy) / Math.max(1, (a.h + b.h) / 2);
  if (kx >= ky) return dx >= 0 ? ["right", "left"] : ["left", "right"];
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}
/** Drops repeated points and points in the middle of straight runs. */
export function simplify(pts) {
  const out = [];
  for (const p of pts) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.01) out.push(p); }
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1], b = out[i], c = out[i + 1];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    const dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]);
    if (Math.abs(cross) < 0.01 && dot >= 0) out.splice(i, 1);
  }
  return out;
}
/**
 * Orthogonal route from port p1 (leaving along side s1 of box A) to port p2 (entering box B from side s2).
 * Boxes are used to go around the shapes when the target is behind the start.
 */
export function elbowRoute(p1, s1, boxA, p2, s2, boxB, stub = STUB) {
  const d1 = sideDir(s1), d2 = sideDir(s2);
  const st1 = boxA.w || boxA.h ? stub : 0, st2 = boxB.w || boxB.h ? stub : 0;
  const a1 = [p1[0] + d1[0] * st1, p1[1] + d1[1] * st1], a2 = [p2[0] + d2[0] * st2, p2[1] + d2[1] * st2];
  const h1 = d1[0] !== 0, h2 = d2[0] !== 0;
  let pts;
  if (h1 && h2) {
    if (d1[0] === -d2[0] && (a2[0] - a1[0]) * d1[0] >= 0) {
      const mx = (p1[0] + p2[0]) / 2;
      const midX = (mx - a1[0]) * d1[0] >= 0 && (a2[0] - mx) * d1[0] >= 0 ? mx : (a1[0] + a2[0]) / 2;
      pts = [p1, [midX, p1[1]], [midX, p2[1]], p2];
    } else if (d1[0] === d2[0]) {
      const x = d1[0] > 0 ? Math.max(a1[0], a2[0]) : Math.min(a1[0], a2[0]);
      pts = [p1, [x, p1[1]], [x, p2[1]], p2];
    } else {
      const midY = gapBetween(boxA.y, boxA.h, boxB.y, boxB.h, stub);
      pts = [p1, a1, [a1[0], midY], [a2[0], midY], a2, p2];
    }
  } else if (!h1 && !h2) {
    if (d1[1] === -d2[1] && (a2[1] - a1[1]) * d1[1] >= 0) {
      const my = (p1[1] + p2[1]) / 2;
      const midY = (my - a1[1]) * d1[1] >= 0 && (a2[1] - my) * d1[1] >= 0 ? my : (a1[1] + a2[1]) / 2;
      pts = [p1, [p1[0], midY], [p2[0], midY], p2];
    } else if (d1[1] === d2[1]) {
      const y = d1[1] > 0 ? Math.max(a1[1], a2[1]) : Math.min(a1[1], a2[1]);
      pts = [p1, [p1[0], y], [p2[0], y], p2];
    } else {
      const midX = gapBetween(boxA.x, boxA.w, boxB.x, boxB.w, stub);
      pts = [p1, a1, [midX, a1[1]], [midX, a2[1]], a2, p2];
    }
  } else if (h1) {
    const c = [p2[0], p1[1]];
    const okOut = (c[0] - p1[0]) * d1[0] >= st1 * 0.5, okIn = (p2[1] - c[1]) * -d2[1] >= st2 * 0.5;
    pts = okOut && okIn ? [p1, c, p2] : [p1, a1, [a1[0], a2[1]], a2, p2];
  } else {
    const c = [p1[0], p2[1]];
    const okOut = (c[1] - p1[1]) * d1[1] >= st1 * 0.5, okIn = (p2[0] - c[0]) * -d2[0] >= st2 * 0.5;
    pts = okOut && okIn ? [p1, c, p2] : [p1, a1, [a2[0], a1[1]], a2, p2];
  }
  return simplify(pts);
}
// A coordinate in the gap between two spans [a0, a0+al] and [b0, b0+bl], or past both of them.
function gapBetween(a0, al, b0, bl, stub) {
  if (a0 + al < b0) return (a0 + al + b0) / 2;
  if (b0 + bl < a0) return (b0 + bl + a0) / 2;
  return Math.max(a0 + al, b0 + bl) + stub;
}

/** End of a connector: attached to an object ({id, side}) or a free point ({x, y}). */
function endInfo(end, byId) {
  const o = end?.id != null ? byId(end.id) : null;
  if (o && o.type !== "connector") return { o, box: rectOf(o), side: end.side && end.side !== "auto" ? end.side : null };
  const x = end?.x ?? 0, y = end?.y ?? 0;
  return { o: null, box: { x, y, w: 0, h: 0 }, pt: [x, y], side: null };
}
/**
 * Route of a connector: { points, fromSide, toSide }. byId(id) returns a board object.
 * straight: from boundary to boundary along the centre line (or from the chosen side ports);
 * elbow: orthogonal with stubs leaving each shape at a right angle.
 */
export function routeConnector(c, byId) {
  const A = endInfo(c.from, byId), B = endInfo(c.to, byId);
  const ca = A.o ? center(A.o) : A.pt, cb = B.o ? center(B.o) : B.pt;
  if (c.kind === "elbow") {
    let [s1, s2] = autoSides(A.box, B.box);
    if (A.side) s1 = A.side;
    if (B.side) s2 = B.side;
    const p1 = A.o ? sidePoint(A.o, s1) : A.pt, p2 = B.o ? sidePoint(B.o, s2) : B.pt;
    return { points: elbowRoute(p1, s1, A.box, p2, s2, B.box), fromSide: s1, toSide: s2 };
  }
  const p1 = A.o ? (A.side ? sidePoint(A.o, A.side) : boundaryPoint(A.o, cb[0], cb[1])) : A.pt;
  const p2 = B.o ? (B.side ? sidePoint(B.o, B.side) : boundaryPoint(B.o, ca[0], ca[1])) : B.pt;
  return { points: [p1, p2], fromSide: A.side, toSide: B.side };
}
export function polylineLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/** Point and direction at a fraction (0..1) of a polyline's length. */
export function pointAlong(pts, f = 0.5) {
  const L = polylineLength(pts);
  let want = L * f;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (want <= l || i === pts.length - 1) { const t = l ? Math.min(1, want / l) : 0; return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: l ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0] }; }
    want -= l;
  }
  return { p: pts[0] || [0, 0], dir: [1, 0] };
}
/** Polyline with rounded corners (quadratic curves, radius r). */
export function roundedPolylinePath(pts, r = 10) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${P(pts[0])} L${P(pts[1])}`;
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.5) { d += ` L${P(b)}`; continue; }
    const p = [b[0] - ((b[0] - a[0]) / l1) * rr, b[1] - ((b[1] - a[1]) / l1) * rr], q = [b[0] + ((c[0] - b[0]) / l2) * rr, b[1] + ((c[1] - b[1]) / l2) * rr];
    d += ` L${P(p)} Q${P(b)} ${P(q)}`;
  }
  return d + ` L${P(pts[pts.length - 1])}`;
}
/** Filled arrow head at `tip`, pointing along the direction from `from` to `tip`. */
export function arrowHeadPath(tip, from, size = 12) {
  let dx = tip[0] - from[0], dy = tip[1] - from[1];
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const bx = tip[0] - dx * size, by = tip[1] - dy * size, w = size * 0.55;
  return polygonPath([tip, [bx - dy * w, by + dx * w], [bx + dy * w, by - dx * w]]);
}

/* ---------------------------------------------------------------- freehand strokes */
/** Light smoothing: drops near-duplicate points, then a 3-point moving average (ends kept). */
export function smoothPoints(pts, minDist = 1.5) {
  const out = [];
  for (const p of pts) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) >= minDist) out.push([p[0], p[1]]); }
  const last = pts[pts.length - 1];
  if (out.length && last && (out[out.length - 1][0] !== last[0] || out[out.length - 1][1] !== last[1])) out.push([last[0], last[1]]);
  if (out.length < 3) return out;
  return out.map((p, i) => (i === 0 || i === out.length - 1 ? p : [n2((out[i - 1][0] + p[0] * 2 + out[i + 1][0]) / 4), n2((out[i - 1][1] + p[1] * 2 + out[i + 1][1]) / 4)]));
}
/** Smooth SVG path through stroke points (quadratic curves between midpoints). */
export function strokePath(pts) {
  if (!pts.length) return "";
  if (pts.length === 1) return `M${P(pts[0])} L${P([pts[0][0] + 0.01, pts[0][1]])}`;
  if (pts.length === 2) return `M${P(pts[0])} L${P(pts[1])}`;
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += ` Q${P(pts[i])} ${P(m)}`;
  }
  return d + ` L${P(pts[pts.length - 1])}`;
}

/* ---------------------------------------------------------------- paths */
/** Scales then moves an SVG path (absolute and relative M L H V C S Q T A Z): x' = x*sx + tx. */
export function transformPath(d, sx, sy, tx, ty) {
  const tokens = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  let out = [], cmd = "", i = 0, first = true;
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) { cmd = tokens[i++]; out.push(cmd); if (cmd.toUpperCase() === "Z") continue; }
    const C = cmd.toUpperCase(), n = counts[C];
    if (!n) { i++; continue; }
    const a = tokens.slice(i, i + n).map(Number);
    i += n;
    const rel = cmd !== C && !(first && C === "M");
    const X = (v) => n2(v * sx + (rel ? 0 : tx)), Y = (v) => n2(v * sy + (rel ? 0 : ty));
    let r;
    if (C === "H") r = [X(a[0])];
    else if (C === "V") r = [Y(a[0])];
    else if (C === "A") r = [n2(a[0] * Math.abs(sx)), n2(a[1] * Math.abs(sy)), a[2], a[3], sx * sy < 0 ? 1 - a[4] : a[4], X(a[5]), Y(a[6])];
    else r = a.map((v, j) => (j % 2 ? Y(v) : X(v)));
    first = false;
    out.push(r.join(" "));
  }
  return out.join(" ");
}
