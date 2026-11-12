// Shape assist (pure, no DOM): turns a rough freehand stroke into a clean line, arrow, rectangle, ellipse (circle),
// triangle, diamond, star or heart, like Canva Draw's shape assist. recognise(points) ->
//   { type: "line", x0, y0, x1, y1 } | { type: "arrow", x0, y0, x1, y1, head } (x1, y1 = the tip)
//   | { type: "rect", x, y, w, h } | { type: "ellipse", cx, cy, rx, ry } | { type: "heart", x, y, w, h }
//   | { type: "triangle" | "diamond" | "star", points: [[x, y] × 3 | 4 | 10] } | null (keep the freehand stroke).
// Points are { x, y } in drawing pixels, in the order they were drawn.

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function clean(points) {
  const out = [];
  for (const p of points || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (!out.length || dist(out[out.length - 1], p) > 0.5) out.push({ x: p.x, y: p.y });
  }
  return out;
}
const pathLength = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; };
/** Area of the polygon the points draw (closed). */
export function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a) / 2;
}
/** Convex hull (monotone chain), counter-clockwise. */
export function hull(pts) {
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (s.length < 3) return s;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Evenly spaced copy of the path (n points), so slow and fast parts of a stroke count the same. */
function resample(pts, n) {
  const total = pathLength(pts);
  if (total === 0) return pts.slice(0, 1);
  const step = total / (n - 1), out = [{ ...pts[0] }];
  let acc = 0;
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let d = dist(a, b);
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(p); a = p; d = dist(a, b); acc = 0;
    }
    acc += d;
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out;
}
const segDist = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
};

/**
 * Recognise the stroke. opts.minSize: smaller strokes are left alone (drawing pixels).
 * Returns null when the stroke does not look like one of the shapes (a squiggle, a signature, a scribble).
 */
export function recognise(points, { minSize = 12 } = {}) {
  const pts = clean(points);
  if (pts.length < 3) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const w = x1 - x0, h = y1 - y0, diag = Math.hypot(w, h);
  if (diag < minSize) return null;
  const first = pts[0], last = pts[pts.length - 1], len = pathLength(pts), gap = dist(first, last);

  // straight line: the ends are far apart and every point is close to the line between them
  if (gap > 0.6 * len) {
    let dev = 0;
    for (const p of pts) dev = Math.max(dev, segDist(p, first, last));
    if (dev > Math.max(4, 0.08 * gap) || len > 1.2 * gap) return arrowOf(pts, minSize);
    const ang = Math.atan2(last.y - first.y, last.x - first.x), snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    if (Math.abs(ang - snap) < (5 * Math.PI) / 180) { const l = gap; return { type: "line", x0: first.x, y0: first.y, x1: first.x + Math.cos(snap) * l, y1: first.y + Math.sin(snap) * l }; }
    return { type: "line", x0: first.x, y0: first.y, x1: last.x, y1: last.y };
  }
  // an arrow: a straight shaft, then a short head at its far end (drawn in one go: shaft, barb, back, other barb)
  if (gap > Math.max(0.3 * diag, 18)) return arrowOf(pts, minSize);
  // closed shapes: the stroke comes back near where it started and goes round once
  if (Math.min(w, h) < minSize * 0.6) return null;
  if (len > 1.7 * Math.PI * Math.max(w, h)) return null; // went round more than once or zig-zagged inside
  const rs = resample(pts, 72);
  const box = w * h, fill = polygonArea(rs) / box, hl = hull(rs), hullFill = polygonArea(hl) / box;
  const s = Math.min(w, h) / 2;
  const heart = heartFit(rs, x0, y0, w, h);
  if (polygonArea(rs) < 0.75 * polygonArea(hl)) {
    // dents: a star (five points round the middle) or a deep-notched heart; anything else stays as drawn
    const star = starOf(rs);
    if (star) return star;
    return heart.err < 0.1 ? { type: "heart", x: x0, y: y0, w, h } : null;
  }
  // ellipse fit: normalised radius should be 1 everywhere
  const cx = x0 + w / 2, cy = y0 + h / 2, rx = w / 2, ry = h / 2;
  let eErr = 0;
  for (const p of rs) eErr += Math.abs(Math.hypot((p.x - cx) / rx, (p.y - cy) / ry) - 1);
  eErr /= rs.length;
  // rectangle fit: distance to the nearest edge of the bounding box
  let rErr = 0;
  for (const p of rs) rErr += Math.min(p.x - x0, x1 - p.x, p.y - y0, y1 - p.y);
  rErr /= rs.length * s;
  // triangle fit: the biggest triangle on the hull, then distance to its sides
  let tri = null, ta = 0;
  const hp = hl.length > 40 ? hl.filter((_, i) => i % Math.ceil(hl.length / 40) === 0) : hl;
  for (let i = 0; i < hp.length; i++) for (let j = i + 1; j < hp.length; j++) for (let k = j + 1; k < hp.length; k++) {
    const a = Math.abs((hp[j].x - hp[i].x) * (hp[k].y - hp[i].y) - (hp[k].x - hp[i].x) * (hp[j].y - hp[i].y)) / 2;
    if (a > ta) { ta = a; tri = [hp[i], hp[j], hp[k]]; }
  }
  let tErr = Infinity;
  if (tri) { tErr = 0; for (const p of rs) tErr += Math.min(segDist(p, tri[0], tri[1]), segDist(p, tri[1], tri[2]), segDist(p, tri[2], tri[0])); tErr /= rs.length * s; }
  // diamond fit: distance to the four sides joining the middles of the box's edges
  const dia = [[cx, y0], [x1, cy], [cx, y1], [x0, cy]];
  let dErr = 0;
  for (const p of rs) dErr += Math.min(...dia.map((q, i) => segDist(p, { x: q[0], y: q[1] }, { x: dia[(i + 1) % 4][0], y: dia[(i + 1) % 4][1] })));
  dErr /= rs.length * s;
  const cands = [];
  if (hullFill > 0.86 && rErr < 0.14) cands.push(["rect", rErr]);
  if (hullFill > 0.66 && hullFill < 0.9 && eErr < 0.14) cands.push(["ellipse", eErr]);
  if (tri && ta / polygonArea(hl) > 0.85 && hullFill < 0.68 && tErr < 0.12) cands.push(["triangle", tErr]);
  if (hullFill > 0.4 && hullFill < 0.64 && dErr < 0.1 && (!tri || ta / polygonArea(hl) < 0.8)) cands.push(["diamond", dErr]);
  // a heart only wins when it fits clearly better than an ellipse (they look alike to a rough test)
  if (heart.err < 0.1 && heart.err < eErr * 0.7) cands.push(["heart", heart.err]);
  if (!cands.length) return null;
  cands.sort((a, b) => a[1] - b[1]);
  const type = cands[0][0];
  if (type === "rect") return { type, x: x0, y: y0, w, h };
  if (type === "diamond") return { type, points: dia };
  if (type === "heart") return { type, x: x0, y: y0, w, h };
  if (type === "ellipse") {
    if (Math.abs(w - h) < 0.12 * Math.max(w, h)) { const r = (w + h) / 4; return { type, cx, cy, rx: r, ry: r }; }
    return { type, cx, cy, rx, ry };
  }
  return { type, points: tri.map((p) => [p.x, p.y]) };
}

/* ---------- arrow ---------- */
function arrowOf(pts, minSize) {
  const first = pts[0];
  let td = 0;
  for (const p of pts) td = Math.max(td, dist(first, p));
  // the tip is where the stroke first gets (nearly) furthest from the start: drawing the second barb passes it again
  let ti = pts.findIndex((p) => dist(first, p) >= td - Math.max(3, 0.03 * td));
  while (ti + 1 < pts.length && dist(first, pts[ti + 1]) >= dist(first, pts[ti])) ti++;
  td = dist(first, pts[ti]);
  const tip = pts[ti], shaft = pts.slice(0, ti + 1), rest = pts.slice(ti);
  if (td < Math.max(minSize * 2, 30) || rest.length < 3) return null;
  let dev = 0;
  for (const p of shaft) dev = Math.max(dev, segDist(p, first, tip));
  if (dev > Math.max(5, 0.08 * td) || pathLength(shaft) > 1.25 * td) return null;
  const restLen = pathLength(rest);
  if (restLen < 0.12 * td || restLen > 1.8 * td) return null;
  // the head: every point near the tip and behind it, at least one clearly off the shaft line
  const ux = (tip.x - first.x) / td, uy = (tip.y - first.y) / td;
  let head = 0, off = 0;
  const barb = [null, null]; // the point furthest out on each side of the shaft
  for (const p of rest) {
    const dx = p.x - tip.x, dy = p.y - tip.y, along = dx * ux + dy * uy, across = -dx * uy + dy * ux;
    if (along > 0.08 * td + 4) return null;
    head = Math.max(head, Math.hypot(dx, dy));
    off = Math.max(off, Math.abs(across));
    const k = across > 0 ? 0 : 1;
    if (!barb[k] || Math.abs(across) > Math.abs(barb[k].across)) barb[k] = { along, across };
  }
  if (head > 0.6 * td || off < Math.max(4, 0.06 * td)) return null;
  // each real barb points back along the shaft (within about 70° of straight back): a hook or a bend is not an arrow
  const barbs = barb.filter((b) => b && Math.abs(b.across) > 0.06 * td);
  if (!barbs.length || barbs.some((b) => b.along > -0.35 * Math.abs(b.across))) return null;
  // snap the shaft to 45° steps when it is nearly there (like a line)
  let x1 = tip.x, y1 = tip.y;
  const ang = Math.atan2(tip.y - first.y, tip.x - first.x), snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
  if (Math.abs(ang - snap) < (5 * Math.PI) / 180) { x1 = first.x + Math.cos(snap) * td; y1 = first.y + Math.sin(snap) * td; }
  return { type: "arrow", x0: first.x, y0: first.y, x1, y1, head: Math.max(8, Math.min(head, 0.45 * td)) };
}
/** The two barb ends of an arrow (30° either side of the shaft, pointing back). */
export function arrowBarbs(sh) {
  const a = Math.atan2(sh.y1 - sh.y0, sh.x1 - sh.x0), t = Math.PI / 6;
  return [[sh.x1 - Math.cos(a - t) * sh.head, sh.y1 - Math.sin(a - t) * sh.head], [sh.x1 - Math.cos(a + t) * sh.head, sh.y1 - Math.sin(a + t) * sh.head]];
}

/* ---------- heart ---------- */
// Our heart outline as two cubic curves in a unit box (point at the bottom, notch at the top), measured once.
const HEART_RAW = [[0.5, 1], [-0.05, 0.55], [0.02, -0.02], [0.5, 0.26], [0.98, -0.02], [1.05, 0.55], [0.5, 1]];
const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
const HEART = (() => {
  const raw = [];
  for (let i = 0; i <= 40; i++) raw.push(bez(HEART_RAW[0], HEART_RAW[1], HEART_RAW[2], HEART_RAW[3], i / 40));
  for (let i = 1; i <= 40; i++) raw.push(bez(HEART_RAW[3], HEART_RAW[4], HEART_RAW[5], HEART_RAW[6], i / 40));
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return { box, pts: raw.map((p) => [(p[0] - box.x) / box.w, (p[1] - box.y) / box.h]) };
})();
/** How well the stroke follows our heart drawn in its box: mean distance both ways (stroke → heart, heart → stroke) / half the short side. */
function heartFit(rs, x0, y0, w, h) {
  const tp = HEART.pts.map(([u, v]) => ({ x: x0 + u * w, y: y0 + v * h }));
  const near = (p, list) => { let m = Infinity; for (let i = 0; i < list.length - 1; i++) m = Math.min(m, segDist(p, list[i], list[i + 1])); return m; };
  const closed = [...rs, rs[0]];
  let a = 0, b = 0;
  for (const p of rs) a += near(p, tp);
  for (const p of tp) b += near(p, closed);
  return { err: (a / rs.length + b / tp.length) / 2 / (Math.min(w, h) / 2) };
}

/* ---------- star ---------- */
/** Five points round the middle with deep dents between them → a clean five-pointed star, else null. */
function starOf(rs) {
  // area centroid of the outline
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < rs.length; i++) { const p = rs[i], q = rs[(i + 1) % rs.length], c = p.x * q.y - q.x * p.y; A += c; cx += (p.x + q.x) * c; cy += (p.y + q.y) * c; }
  if (Math.abs(A) < 1e-6) return null;
  cx /= 3 * A; cy /= 3 * A;
  const n = rs.length, r = rs.map((p) => Math.hypot(p.x - cx, p.y - cy)), sm = r.map((_, i) => (r[(i - 1 + n) % n] + r[i] + r[(i + 1) % n]) / 3);
  const rmax = Math.max(...sm);
  const peaks = [];
  for (let i = 0; i < n; i++) {
    let top = true;
    for (let k = 1; k <= 3 && top; k++) if (sm[(i + k) % n] > sm[i] || sm[(i - k + n) % n] > sm[i]) top = false;
    if (top && sm[i] > 0.6 * rmax && !peaks.some((j) => Math.min(Math.abs(j - i), n - Math.abs(j - i)) < 5)) peaks.push(i);
  }
  if (peaks.length !== 5) return null;
  peaks.sort((a, b) => a - b);
  const troughs = peaks.map((p, k) => { const q = peaks[(k + 1) % 5], span = (q - p + n) % n; let m = Infinity; for (let j = 1; j < span; j++) m = Math.min(m, sm[(p + j) % n]); return m; });
  const R = peaks.reduce((s, i) => s + sm[i], 0) / 5, ri = troughs.reduce((s, v) => s + v, 0) / 5;
  if (!(ri < 0.72 * R) || ri < 0.15 * R) return null;
  // turn: the mean of the points' angles, each taken modulo 72°
  let sx = 0, sy = 0;
  for (const i of peaks) { const a = Math.atan2(rs[i].y - cy, rs[i].x - cx) * 5; sx += Math.cos(a); sy += Math.sin(a); }
  const rot = Math.atan2(sy, sx) / 5;
  const points = Array.from({ length: 10 }, (_, k) => { const a = rot + (k * Math.PI) / 5, rr = k % 2 ? ri : R; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  // the clean star must follow the stroke
  let err = 0;
  for (const p of rs) { let m = Infinity; for (let k = 0; k < 10; k++) { const a = points[k], b = points[(k + 1) % 10]; m = Math.min(m, segDist(p, { x: a[0], y: a[1] }, { x: b[0], y: b[1] })); } err += m; }
  return err / rs.length < 0.12 * R ? { type: "star", points } : null;
}

/** Bounding box [x0, y0, x1, y1] of a recognised shape, grown by pad. */
export function shapeBounds(sh, pad = 0) {
  if (sh.type === "line") return [Math.min(sh.x0, sh.x1) - pad, Math.min(sh.y0, sh.y1) - pad, Math.max(sh.x0, sh.x1) + pad, Math.max(sh.y0, sh.y1) + pad];
  if (sh.type === "arrow") { const xs = [sh.x0, sh.x1, ...arrowBarbs(sh).map((p) => p[0])], ys = [sh.y0, sh.y1, ...arrowBarbs(sh).map((p) => p[1])]; return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad]; }
  if (sh.type === "rect" || sh.type === "heart") return [sh.x - pad, sh.y - pad, sh.x + sh.w + pad, sh.y + sh.h + pad];
  if (sh.type === "ellipse") return [sh.cx - sh.rx - pad, sh.cy - sh.ry - pad, sh.cx + sh.rx + pad, sh.cy + sh.ry + pad];
  const xs = sh.points.map((p) => p[0]), ys = sh.points.map((p) => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}
/** Draws the clean shape as an outline on a 2D context (stroke style set by the caller). */
export function tracePath(ctx, sh) {
  ctx.beginPath();
  if (sh.type === "line") { ctx.moveTo(sh.x0, sh.y0); ctx.lineTo(sh.x1, sh.y1); }
  else if (sh.type === "arrow") { const [a, b] = arrowBarbs(sh); ctx.moveTo(sh.x0, sh.y0); ctx.lineTo(sh.x1, sh.y1); ctx.moveTo(a[0], a[1]); ctx.lineTo(sh.x1, sh.y1); ctx.lineTo(b[0], b[1]); }
  else if (sh.type === "rect") ctx.rect(sh.x, sh.y, sh.w, sh.h);
  else if (sh.type === "ellipse") ctx.ellipse(sh.cx, sh.cy, Math.max(0.5, sh.rx), Math.max(0.5, sh.ry), 0, 0, Math.PI * 2);
  else if (sh.type === "heart") {
    const m = ([u, v]) => [sh.x + ((u - HEART.box.x) / HEART.box.w) * sh.w, sh.y + ((v - HEART.box.y) / HEART.box.h) * sh.h];
    const P = HEART_RAW.map(m);
    ctx.moveTo(P[0][0], P[0][1]);
    ctx.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]);
    ctx.bezierCurveTo(P[4][0], P[4][1], P[5][0], P[5][1], P[6][0], P[6][1]);
    ctx.closePath();
  } else { ctx.moveTo(sh.points[0][0], sh.points[0][1]); for (const p of sh.points.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); }
}
export const SHAPE_NAMES = { line: "Line", arrow: "Arrow", rect: "Rectangle", ellipse: "Ellipse", triangle: "Triangle", diamond: "Diamond", star: "Star", heart: "Heart" };
