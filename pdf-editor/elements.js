// AsaanDesk PDF editor - "Elements" library (stickers, shapes, stamps, icons ...).
// Every element here is original artwork, drawn from plain geometry by the helpers below. No
// third-party icon set, logo or image is used.
//
// Element: {id, cat, name, tags, vb:[w,h], recolor, defaults:{c1,c2,c3}, parts}
//   path part: {d, fill, stroke, sw, cap, join, op}   (defaults: fill/stroke 'none', sw 1, cap/join 'round', op 1)
//   text part: {t, x, y, size, fill, bold, italic, font:'sans'|'serif'|'mono', anchor:'start'|'middle'|'end', ls}
// Colours are '#rrggbb', 'none' or the tokens '$1' (main), '$2' (accent), '$3' (light tint).
// Paths only use absolute M L C Q Z commands and holes are drawn with reversed winding, so they
// fill the same with the SVG default (nonzero) rule and with pdf-lib's page.drawSvgPath().

const RAD = Math.PI / 180;
const f = (v) => { const r = Math.round(v * 100) / 100; return String(r === 0 ? 0 : r); };
const pt = (x, y) => `${f(x)} ${f(y)}`;
const P = (p) => pt(p[0], p[1]);

/* ------------------------------------------------------------------ geometry helpers */
// Arc of an ellipse from angle a0 to a1 (degrees, 0 = right, 90 = down) as cubic segments (no move).
function arcTo(cx, cy, rx, ry, a0, a1) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 1e-9));
  const st = (a1 - a0) / n * RAD, k = 4 / 3 * Math.tan(st / 4);
  let s = '';
  for (let i = 0; i < n; i++) {
    const t0 = a0 * RAD + i * st, t1 = t0 + st;
    const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
    s += ` C${pt(cx + rx * (c0 - k * s0), cy + ry * (s0 + k * c0))} ${pt(cx + rx * (c1 + k * s1), cy + ry * (s1 - k * c1))} ${pt(cx + rx * c1, cy + ry * s1)}`;
  }
  return s;
}
const onE = (cx, cy, rx, ry, a) => [cx + rx * Math.cos(a * RAD), cy + ry * Math.sin(a * RAD)];
const arc = (cx, cy, rx, ry, a0, a1) => `M${P(onE(cx, cy, rx, ry, a0))}${arcTo(cx, cy, rx, ry, a0, a1)}`;
const ellipse = (cx, cy, rx, ry = rx) => `${arc(cx, cy, rx, ry, 0, 360)} Z`;
const circle = (cx, cy, r) => ellipse(cx, cy, r, r);
const poly = (pts) => `M${pts.map(P).join(' L')} Z`;
const pl = (...pts) => `M${pts.map(P).join(' L')}`;
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  if (!(r > 0)) return rect(x, y, w, h);
  return `M${pt(x + r, y)} L${pt(x + w - r, y)}${arcTo(x + w - r, y + r, r, r, -90, 0)} L${pt(x + w, y + h - r)}${arcTo(x + w - r, y + h - r, r, r, 0, 90)}` +
    ` L${pt(x + r, y + h)}${arcTo(x + r, y + h - r, r, r, 90, 180)} L${pt(x, y + r)}${arcTo(x + r, y + r, r, r, 180, 270)} Z`;
}
const ngonPts = (cx, cy, R, n, rot = -90) => Array.from({length: n}, (_, i) => onE(cx, cy, R, R, rot + i * 360 / n));
const ngon = (cx, cy, R, n, rot) => poly(ngonPts(cx, cy, R, n, rot));
const star = (cx, cy, R, r, n = 5, rot = -90) => poly(Array.from({length: n * 2}, (_, i) => onE(cx, cy, i % 2 ? r : R, i % 2 ? r : R, rot + i * 180 / n)));
// Catmull-Rom spline through points as cubic Beziers.
function smooth(pts, closed = true, t = 1) {
  const n = pts.length, g = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let s = `M${P(pts[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2);
    s += ` C${pt(b[0] + (c[0] - a[0]) * t / 6, b[1] + (c[1] - a[1]) * t / 6)} ${pt(c[0] - (d[0] - b[0]) * t / 6, c[1] - (d[1] - b[1]) * t / 6)} ${P(c)}`;
  }
  return closed ? `${s} Z` : s;
}
// Closed outline with a round bump between every pair of points (clockwise points bump outwards).
function bumpy(pts, k = 0.62) {
  let s = `M${P(pts[0])}`;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], nx = (b[1] - a[1]) * k, ny = -(b[0] - a[0]) * k;
    s += ` C${pt(a[0] + nx, a[1] + ny)} ${pt(b[0] + nx, b[1] + ny)} ${P(b)}`;
  }
  return `${s} Z`;
}

// Parse our own path data (absolute M L C Q Z) into subpaths.
function parse(d) {
  const tok = d.match(/[A-Za-z]|-?\d*\.?\d+/g) || [], subs = [];
  let cur = null, cmd = null, i = 0;
  const Q2 = () => [+tok[i++], +tok[i++]];
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z') { cur.closed = true; cmd = null; } continue; }
    if (cmd === 'M') { cur = {start: Q2(), segs: [], closed: false}; subs.push(cur); cmd = 'L'; }
    else if (cmd === 'L') cur.segs.push({c: 'L', p: [Q2()]});
    else if (cmd === 'C') cur.segs.push({c: 'C', p: [Q2(), Q2(), Q2()]});
    else if (cmd === 'Q') cur.segs.push({c: 'Q', p: [Q2(), Q2()]});
    else throw new Error(`elements: unsupported path command ${cmd}`);
  }
  return subs;
}
// Map every point of a path (M L C Q Z only).
const tf = (d, fn) => parse(d).map(({start, segs, closed}) =>
  `M${P(fn(...start))}${segs.map((s) => ` ${s.c}${s.p.map((p) => P(fn(...p))).join(' ')}`).join('')}${closed ? ' Z' : ''}`).join(' ');
const rot = (d, deg, cx = 50, cy = 50) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return tf(d, (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
const sc = (d, sx, sy = sx, cx = 0, cy = 0) => tf(d, (x, y) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
// Reverse the direction of every subpath.
function rev(d) {
  return parse(d).map(({start, segs, closed}) => {
    const ends = [start, ...segs.map((s) => s.p[s.p.length - 1])], last = ends[segs.length];
    const same = Math.hypot(last[0] - start[0], last[1] - start[1]) < 0.01;
    let s = closed ? `M${P(start)}${same ? '' : ` L${P(last)}`}` : `M${P(last)}`;
    for (let i = segs.length - 1; i >= 0; i--) {
      const g = segs[i], to = P(ends[i]);
      s += g.c === 'L' ? ` L${to}` : g.c === 'C' ? ` C${P(g.p[1])} ${P(g.p[0])} ${to}` : ` Q${P(g.p[0])} ${to}`;
    }
    return closed ? `${s} Z` : s;
  }).join(' ');
}
function area(d) {
  let a = 0;
  for (const {start, segs} of parse(d)) {
    const pts = [start, ...segs.flatMap((s) => s.p)];
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; });
  }
  return a / 2;
}
// Outer shape with holes: each hole gets the opposite winding (works with the nonzero rule).
const holes = (outer, ...inner) => [outer, ...inner.map((h) => (Math.sign(area(h)) === Math.sign(area(outer)) ? rev(h) : h))].join(' ');
// Flatten a path into polylines (closed ones end on their first point).
function flatten(d, n = 12) {
  return parse(d).map(({start, segs, closed}) => {
    const out = [start];
    let p0 = start;
    for (const s of segs) {
      if (s.c === 'L') out.push(s.p[0]);
      else for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        out.push([0, 1].map((j) => (s.c === 'C' ? u * u * u * p0[j] + 3 * u * u * t * s.p[0][j] + 3 * u * t * t * s.p[1][j] + t * t * t * s.p[2][j] : u * u * p0[j] + 2 * u * t * s.p[0][j] + t * t * s.p[1][j])));
      }
      p0 = s.p[s.p.length - 1];
    }
    if (closed) out.push(start);
    return out;
  });
}
function walker(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = (s) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1, t = Math.max(0, Math.min(1, (s - cum[i - 1]) / seg));
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };
  const closed = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.01;
  return {cum, total, at, closed};
}
// Dashed version of a path, as separate stroke segments (no dash arrays needed in the PDF).
function dashes(d, dash, gap) {
  return flatten(d).map((pts) => {
    const {cum, total, at, closed} = walker(pts), r = dash / (dash + gap);
    const k = Math.max(1, Math.round((closed ? total : total + gap) / (dash + gap)));
    const per = closed ? total / k : total / (k - 1 + r);
    let s = '';
    for (let j = 0; j < k; j++) {
      const s0 = j * per, s1 = Math.min(total, s0 + per * r), mid = [];
      for (let i = 0; i < cum.length; i++) if (cum[i] > s0 + 0.01 && cum[i] < s1 - 0.01) mid.push(pts[i]);
      s += ` ${pl(at(s0), ...mid, at(s1))}`;
    }
    return s.trim();
  }).join(' ');
}
// Small dots spread evenly along a path.
function dots(d, spacing, r) {
  return flatten(d).map((pts) => {
    const {total, at, closed} = walker(pts), k = Math.max(1, Math.round(total / spacing));
    return Array.from({length: closed ? k : k + 1}, (_, j) => circle(...at(j * total / k), r)).join(' ');
  }).join(' ');
}
// Open arrow head (chevron) with its tip at x,y pointing along angle `ang` (degrees).
const chev = (x, y, ang, len = 16, spread = 40) => pl(onE(x, y, len, len, ang + 180 - spread), [x, y], onE(x, y, len, len, ang + 180 + spread));
// Solid triangular head.
function tri(x, y, ang, len, half) {
  const b = onE(x, y, len, len, ang + 180);
  return poly([[x, y], onE(b[0], b[1], half, half, ang + 90), onE(b[0], b[1], half, half, ang - 90)]);
}
// Arc with an arrow head at its end.
function arcArrow(cx, cy, r, a0, a1, len = 18) {
  const s = Math.sign(a1 - a0), t = a1 * RAD, ang = Math.atan2(Math.cos(t) * s, -Math.sin(t) * s) / RAD;
  const tip = onE(...onE(cx, cy, r, r, a1), 2, 2, ang);
  return `${arc(cx, cy, r, r, a0, a1)} ${chev(tip[0], tip[1], ang, len)}`;
}
// Smooth open curve through points with an arrow head at the end.
function curveArrow(pts, len = 18) {
  const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;
  return `${smooth(pts, false)} ${chev(...onE(b[0], b[1], 2, 2, ang), ang, len)}`;
}
const HEART = 'M50 88 C30 74 6 58 6 34 C6 18 18 8 31 8 C40 8 46 13 50 20 C54 13 60 8 69 8 C82 8 94 18 94 34 C94 58 70 74 50 88 Z';
const heart = (cx, cy, s) => tf(HEART, (x, y) => [cx + (x - 50) * s / 100, cy + (y - 48) * s / 100]);
const DROP = 'M50 6 C50 6 84 44 84 64 C84 83 69 96 50 96 C31 96 16 83 16 64 C16 44 50 6 50 6 Z';
const drop = (cx, cy, s) => tf(DROP, (x, y) => [cx + (x - 50) * s / 100, cy + (y - 51) * s / 100]);
const SPARK = 'M0 -1 C0.1 -0.32 0.32 -0.1 1 0 C0.32 0.1 0.1 0.32 0 1 C-0.1 0.32 -0.32 0.1 -1 0 C-0.32 -0.1 -0.1 -0.32 0 -1 Z';
const spark = (cx, cy, r) => tf(SPARK, (x, y) => [cx + x * r, cy + y * r]);
// Pointed leaf from base (x,y) along angle ang.
function leaf(x, y, len, w, ang) {
  const u = onE(0, 0, 1, 1, ang), v = [-u[1], u[0]], at = (a, b) => [x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b];
  return `M${pt(x, y)} C${P(at(len * 0.3, w))} ${P(at(len * 0.75, w * 0.9))} ${P(at(len, 0))} C${P(at(len * 0.75, -w * 0.9))} ${P(at(len * 0.3, -w))} ${pt(x, y)} Z`;
}
// Crescent: circle (cx,cy,R) minus circle (ox,oy,r), as one contour.
function crescent(cx, cy, R, ox, oy, r) {
  const dx = ox - cx, dy = oy - cy, d = Math.hypot(dx, dy), a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const px = cx + a * dx / d, py = cy + a * dy / d, i1 = [px - h * dy / d, py + h * dx / d], i2 = [px + h * dy / d, py - h * dx / d];
  const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]) / RAD, phi = Math.atan2(dy, dx) / RAD;
  const sweep = (a0, a1, avoid, contain) => { // choose direction from a0 to a1 that avoids/contains a direction
    let cw = ((a1 - a0) % 360 + 360) % 360; const inCw = (((avoid - a0) % 360 + 360) % 360) < cw;
    return (contain ? !inCw : inCw) ? cw - 360 : cw;
  };
  const o0 = ang([cx, cy], i1), o1 = ang([cx, cy], i2), n0 = ang([ox, oy], i2), n1 = ang([ox, oy], i1);
  return `M${P(i1)}${arcTo(cx, cy, R, R, o0, o0 + sweep(o0, o1, phi, false))}${arcTo(ox, oy, r, r, n0, n0 + sweep(n0, n1, phi + 180, true))} Z`;
}
// Rounded-rectangle speech bubble with a tail on the bottom edge (a < b on the bottom edge, tip below).
function bubble(x, y, w, h, r, a, b, tip) {
  return `M${pt(x + r, y)} L${pt(x + w - r, y)}${arcTo(x + w - r, y + r, r, r, -90, 0)} L${pt(x + w, y + h - r)}${arcTo(x + w - r, y + h - r, r, r, 0, 90)}` +
    ` L${pt(b, y + h)} L${P(tip)} L${pt(a, y + h)} L${pt(x + r, y + h)}${arcTo(x + r, y + h - r, r, r, 90, 180)} L${pt(x, y + r)}${arcTo(x + r, y + r, r, r, 180, 270)} Z`;
}
// Elliptic bubble with a gap between angles g0 < g1 (bottom) closed by a tail to `tip`.
const bubbleOval = (cx, cy, rx, ry, g0, g1, tip) => `M${P(onE(cx, cy, rx, ry, g1))}${arcTo(cx, cy, rx, ry, g1, g0 + 360)} L${P(tip)} Z`;
// Deterministic pseudo random numbers.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/* ------------------------------------------------------------------ text metrics (Helvetica/Arial Bold) */
const HB = {};
'A722B722C722D722E667F611G778H722I278J556K722L611M833N722O778P667Q778R722S667T611U722V667W944X667Y667Z611'.replace(/([A-Z])(\d+)/g, (_, c, w) => { HB[c] = +w; });
const charW = (c) => HB[c] ?? ('0123456789'.includes(c) ? 556 : {' ': 278, '%': 889, ':': 333, '.': 278, '-': 333, '!': 333, s: 556, t: 333, _: 556}[c] ?? 600);
const textW = (t, size, ls = 0) => [...t].reduce((a, c) => a + charW(c), 0) * size / 1000 + ls * (t.length - 1);

/* ------------------------------------------------------------------ catalogue */
export const CATEGORIES = [
  {id: 'shapes', label: 'Shapes'},
  {id: 'arrows', label: 'Arrows'},
  {id: 'icons', label: 'Icons'},
  {id: 'stamps', label: 'Stamps'},
  {id: 'badges', label: 'Badges & ribbons'},
  {id: 'faces', label: 'Faces'},
  {id: 'callouts', label: 'Speech bubbles'},
  {id: 'frames', label: 'Frames'},
  {id: 'lines', label: 'Lines & dividers'},
  {id: 'deco', label: 'Decorations'},
];
const CAT_TAGS = {
  shapes: 'shape shakal', arrows: 'arrow teer nishan pointer', icons: 'icon symbol', stamps: 'stamp mohar seal ink',
  badges: 'badge ribbon sticker label', faces: 'face emoji chehra smiley', callouts: 'speech bubble callout baat chat comment',
  frames: 'frame border hashiya', lines: 'line divider lakeer separator', deco: 'decoration sajawat decor',
};
const IND = '#5b4cf0', COR = '#ff7a59', TEA = '#14b8a6', AMB = '#f59e0b', ROS = '#f43f5e', GRN = '#22c55e', SLA = '#334155', SKY = '#0ea5e9', WHT = '#ffffff';
const dc = (c1, c2, c3) => ({c1, c2, c3});
const D = {
  ind: dc(IND, COR, '#e8e5fe'), cor: dc(COR, IND, '#ffe5dc'), tea: dc(TEA, IND, '#ccfbf1'), amb: dc(AMB, IND, '#fef3c7'),
  ros: dc(ROS, AMB, '#ffe4e6'), grn: dc(GRN, '#15803d', '#dcfce7'), sla: dc(SLA, COR, '#e2e8f0'), sky: dc(SKY, AMB, '#e0f2fe'),
};
const CAT_DEF = {shapes: D.ind, arrows: D.ind, icons: D.ind, stamps: dc('#dc2626', '#dc2626', '#fee2e2'), badges: D.cor,
  faces: dc('#fcd34d', '#4a2f1b', '#ff7b8a'), callouts: dc(IND, COR, WHT), frames: D.ind, lines: D.ind, deco: D.ind};
const TOKEN_FALLBACK = {c1: IND, c2: COR, c3: '#e8e5fe'};

export const ELEMENTS = [];
const isTok = (v) => typeof v === 'string' && v[0] === '$';
function add(cat, id, name, tags, vb, parts, defaults) {
  ELEMENTS.push({
    id, cat, name,
    tags: [...new Set(`${tags} ${CAT_TAGS[cat]}`.toLowerCase().trim().split(/\s+/))],
    vb, recolor: parts.some((p) => isTok(p.fill) || isTok(p.stroke)),
    defaults: {...CAT_DEF[cat], ...defaults}, parts: parts.filter(Boolean),
  });
}
// Part shorthands.
const S = (d, stroke = '$1', sw = 7, x) => ({d, stroke, sw, ...x});
const F = (d, fill = '$1', x) => ({d, fill, ...x});
const FS = (d, fill, stroke, sw, x) => ({d, fill, stroke, sw, ...x});
const T = (t, x, y, size, fill = '$1', o) => ({t, x, y, size, fill, bold: true, italic: false, font: 'sans', anchor: 'middle', ls: 0, ...o});

/* ================================================================== ARROWS */
{
  const W = 8, right = `M10 30 L104 30 ${chev(108, 30, 0, 24)}`;
  add('arrows', 'arrow-right', 'Arrow right', 'right straight seedha daayan', [120, 60], [S(right, '$1', W)]);
  add('arrows', 'arrow-left', 'Arrow left', 'left back baayan', [120, 60], [S(sc(right, -1, 1, 60), '$1', W)]);
  add('arrows', 'arrow-up', 'Arrow up', 'up upar', [60, 120], [S(tf(right, (x, y) => [y, 120 - x]), '$1', W)]);
  add('arrows', 'arrow-down', 'Arrow down', 'down neeche', [60, 120], [S(tf(right, (x, y) => [60 - y, x]), '$1', W)]);
  add('arrows', 'arrow-block', 'Block arrow', 'solid bold thick right', [120, 70],
    [FS(poly([[8, 23], [68, 23], [68, 7], [113, 35], [68, 63], [68, 47], [8, 47]]), '$1', '$1', 6)], D.cor);
  add('arrows', 'arrow-double', 'Double arrow', 'both ways two sided left right', [140, 60],
    [S(`M18 30 L122 30 ${chev(126, 30, 0, 22)} ${chev(14, 30, 180, 22)}`, '$1', W)]);
  add('arrows', 'arrow-curved', 'Curved arrow', 'curve bend mor', [100, 100], [S(`M16 88 C16 50 40 24 82 24 ${chev(88, 24, 0, 22)}`, '$1', W)], D.tea);
  add('arrows', 'arrow-uturn', 'U-turn arrow', 'uturn turn back wapis', [100, 100],
    [S(`M78 90 L78 46 C78 24 64 12 50 12 C36 12 22 24 22 46 L22 76 ${chev(22, 84, 90, 22)}`, '$1', W)]);
  add('arrows', 'arrow-circular', 'Circular arrow', 'circle refresh repeat redo round gol', [100, 100], [S(arcArrow(50, 53, 34, -40, 222, 20), '$1', W)], D.tea);
  add('arrows', 'arrow-sync', 'Two circular arrows', 'sync cycle exchange refresh loop', [100, 100],
    [S(`${arcArrow(50, 50, 36, 196, 326, 19)} ${arcArrow(50, 50, 36, 16, 146, 19)}`, '$1', W)], D.cor);
  add('arrows', 'arrow-loop', 'Hand-drawn loop arrow', 'hand drawn sketch doodle loop curly', [140, 80],
    [S(curveArrow([[8, 64], [34, 63], [58, 54], [70, 36], [61, 21], [47, 27], [50, 45], [70, 58], [100, 58], [130, 42]], 20), '$1', 6)], D.cor);
  add('arrows', 'arrow-wave', 'Hand-drawn wavy arrow', 'hand drawn sketch doodle wave curvy', [120, 80],
    [S(curveArrow([[8, 66], [28, 42], [52, 56], [78, 32], [108, 22]], 20), '$1', 6)], D.ros);
  add('arrows', 'arrow-sketch', 'Sketch arrow', 'hand drawn sketch marker doodle', [116, 70],
    [S('M8 52 C36 44 66 46 100 30 M76 22 L103 28 L88 51', '$1', 6), S('M14 58 C40 51 68 52 96 38', '$1', 2.5, {op: 0.45})], D.sla);
  add('arrows', 'chevron', 'Chevron', 'chevron next aagay', [68, 100], [S('M20 12 L50 50 L20 88', '$1', 14)]);
  add('arrows', 'chevrons', 'Double chevron', 'chevrons fast forward next', [100, 100], [S('M16 16 L46 50 L16 84 M52 16 L82 50 L52 84', '$1', 12)], D.cor);
  add('arrows', 'chevron-circle', 'Chevron in circle', 'circle next button', [100, 100], [F(circle(50, 50, 46)), S('M43 28 L64 50 L43 72', WHT, 10)], D.tea);
  add('arrows', 'arrow-circle', 'Arrow in circle', 'circle go button right', [100, 100], [F(circle(50, 50, 46)), S(`M26 50 L70 50 ${chev(73, 50, 0, 19)}`, WHT, 9)]);
  add('arrows', 'sign-here', 'Sign here (left)', 'sign here signature dastakhat tab flag', [172, 56],
    [FS(poly([[6, 28], [32, 5], [166, 5], [166, 51], [32, 51]]), '$1', '$1', 6), T('SIGN HERE', 99, 35.5, 20, '$2', {ls: 1})], dc('#fbbf24', '#1e293b', '#fef3c7'));
  add('arrows', 'sign-here-right', 'Sign here (right)', 'sign here signature dastakhat tab flag', [172, 56],
    [FS(poly([[166, 28], [140, 5], [6, 5], [6, 51], [140, 51]]), '$1', '$1', 6), T('SIGN HERE', 73, 35.5, 20, '$2', {ls: 1})], dc('#fbbf24', '#1e293b', '#fef3c7'));
  add('arrows', 'arrow-diagonal', 'Diagonal arrow', 'diagonal up right corner', [100, 100], [S(`M18 82 L78 22 ${chev(82, 18, -45, 24)}`, '$1', W)]);
  add('arrows', 'arrow-elbow', 'Turn arrow', 'turn elbow corner mor', [100, 100], [S(`M22 12 L22 56 C22 70 30 78 44 78 L80 78 ${chev(86, 78, 0, 20)}`, '$1', W)], D.amb);
  {
    const ang = Math.atan2(58, 54) / RAD;
    add('arrows', 'arrow-dashed', 'Dashed curved arrow', 'dashed dotted path route curve', [140, 80],
      [S(`${dashes('M10 66 Q70 -6 124 52', 11, 9)} ${chev(...onE(124, 52, 4, 4, ang), ang, 21)}`, '$1', 6)], D.tea);
  }
  add('arrows', 'arrow-dot', 'Arrow with dot', 'dot start point line', [120, 40], [F(circle(13, 20, 8)), S('M26 20 L98 20', '$1', 6), FS(tri(114, 20, 0, 20, 12), '$1', '$1', 3)], D.ros);
  add('arrows', 'arrow-pointer', 'Pointer arrow', 'pointer thin line annotation', [120, 40], [S('M6 20 L98 20', '$1', 4), FS(tri(114, 20, 0, 20, 10), '$1', '$1', 3)], D.sla);
  add('arrows', 'arrow-growth', 'Growth arrow', 'growth trend up chart profit taraqqi', [112, 80],
    [S(`M8 70 L40 32 L64 56 L94 18 ${chev(98, 13, -51.3, 22)}`, '$1', W)], D.grn);
}

/* ================================================================== SHAPES */
{
  const sh = (id, name, tags, d, def, vb = [100, 100], sw = 0) => add('shapes', `shape-${id}`, name, tags, vb, [sw ? FS(d, '$1', '$1', sw) : F(d)], def);
  sh('rounded-square', 'Rounded square', 'square box rounded chokor', rrect(6, 6, 88, 88, 18), D.ind);
  sh('square', 'Square', 'square box rectangle chokor', rect(6, 6, 88, 88), D.sla);
  sh('circle', 'Circle', 'circle round dot daira gol', circle(50, 50, 45), D.cor);
  sh('oval', 'Oval', 'oval ellipse anda', ellipse(60, 40, 56, 36), D.tea, [120, 80]);
  sh('triangle', 'Triangle', 'triangle tikon', poly([[50, 12], [91, 85], [9, 85]]), D.tea, [100, 100], 8);
  sh('diamond', 'Diamond', 'diamond rhombus heera', poly([[50, 6], [93, 50], [50, 94], [7, 50]]), D.ros, [100, 100], 6);
  sh('pentagon', 'Pentagon', 'pentagon five sides', ngon(50, 53, 45, 5), D.amb, [100, 100], 6);
  sh('hexagon', 'Hexagon', 'hexagon six sides', ngon(50, 50, 45, 6, 0), D.ind, [100, 100], 6);
  sh('octagon', 'Octagon', 'octagon eight sides stop', ngon(50, 50, 46, 8, 22.5), D.ros, [100, 100], 4);
  sh('star', 'Star', 'star sitara five point', star(50, 54, 46, 20, 5), D.amb, [100, 100], 5);
  sh('star-6', 'Six-point star', 'star sitara six point', star(50, 50, 46, 25, 6), D.ind, [100, 100], 4);
  sh('star-8', 'Eight-point star', 'star sitara eight point burst', star(50, 50, 47, 31, 8, -90), D.cor, [100, 100], 4);
  sh('heart', 'Heart', 'heart love dil pyar', HEART, D.ros);
  sh('blob', 'Blob', 'blob organic round soft', smooth([[50, 7], [79, 13], [94, 40], [87, 71], [61, 92], [29, 89], [9, 64], [13, 29]]), D.tea);
  sh('blob-2', 'Blob 2', 'blob organic wavy soft', smooth([[38, 8], [72, 9], [92, 31], [80, 52], [91, 76], [64, 93], [33, 86], [9, 68], [13, 36]]), D.cor);
  sh('ring', 'Ring', 'ring donut circle outline daira', holes(circle(50, 50, 46), circle(50, 50, 27)), D.ind);
  sh('half-circle', 'Half circle', 'half circle semicircle dome', `M4 50${arcTo(50, 50, 46, 46, 180, 360)} Z`, D.amb, [100, 54]);
  sh('plus', 'Plus', 'plus cross add jama', poly([[36, 8], [64, 8], [64, 36], [92, 36], [92, 64], [64, 64], [64, 92], [36, 92], [36, 64], [8, 64], [8, 36], [36, 36]]), D.grn, [100, 100], 8);
  sh('parallelogram', 'Parallelogram', 'parallelogram slanted', poly([[32, 8], [114, 8], [88, 64], [6, 64]]), D.sky, [120, 72], 5);
  sh('arch', 'Arch', 'arch door window mehrab', `M12 94 L12 50${arcTo(50, 50, 38, 38, 180, 360)} L88 94 Z`, D.tea, [100, 100], 4);
  sh('pill', 'Pill', 'pill capsule rounded rectangle button', rrect(4, 4, 132, 52, 26), D.ind, [140, 60]);
  sh('drop', 'Drop', 'drop water teardrop boond pani', DROP, D.sky);
  sh('shield', 'Shield', 'shield secure protect', 'M50 6 L88 19 L88 46 C88 72 70 88 50 96 C30 88 12 72 12 46 L12 19 Z', D.ind, [100, 100], 4);
  sh('speech', 'Speech shape', 'speech bubble chat message', bubble(4, 4, 92, 70, 16, 24, 44, [18, 94]), D.cor);
  add('shapes', 'shape-circle-outline', 'Circle outline', 'circle outline ring daira', [100, 100], [S(circle(50, 50, 44), '$1', 8)], D.cor);
  add('shapes', 'shape-square-outline', 'Square outline', 'square outline box chokor', [100, 100], [S(rrect(8, 8, 84, 84, 14), '$1', 8)], D.ind);
}

/* ================================================================== BADGES & RIBBONS */
{
  const seal = star(50, 50, 47, 41.5, 26);
  add('badges', 'badge-seal', 'Seal', 'seal zigzag certificate quality mohar', [100, 100],
    [FS(seal, '$1', '$1', 2), S(circle(50, 50, 32), WHT, 2.5, {op: 0.75}), F(star(50, 51, 15, 6.3, 5), WHT)], D.ind);
  add('badges', 'badge-seal-check', 'Seal with tick', 'seal check tick verified sahi approved', [100, 100],
    [FS(seal, '$1', '$1', 2), S('M31 52 L45 66 L71 37', WHT, 9)], dc('#16a34a', IND, '#dcfce7'));
  add('badges', 'badge-rosette', 'Rosette', 'rosette award prize winner inaam medal', [100, 100], [
    F(poly([[36, 62], [50, 66], [41, 98], [34, 89], [22, 93]]), '$2'), F(poly([[64, 62], [50, 66], [59, 98], [66, 89], [78, 93]]), '$2'),
    FS(star(50, 42, 39, 34, 20), '$1', '$1', 3), F(circle(50, 42, 26), '$3'), F(star(50, 43, 15, 6.3, 5), '$1')], dc(ROS, IND, '#ffe4e6'));
  add('badges', 'badge-banner', 'Ribbon banner', 'banner ribbon title heading patti', [200, 70], [
    F(poly([[4, 22], [46, 22], [46, 64], [4, 64], [17, 43]]), '$2'), F(poly([[196, 22], [154, 22], [154, 64], [196, 64], [183, 43]]), '$2'),
    F(poly([[28, 50], [46, 50], [46, 64]]) + ' ' + poly([[172, 50], [154, 50], [154, 64]]), '#000000', {op: 0.28}), F(rect(28, 6, 144, 44))], dc(ROS, '#be123c', '#ffe4e6'));
  add('badges', 'badge-corner-ribbon', 'Corner ribbon', 'corner ribbon kona sash', [100, 100], [
    F(`${poly([[28, 8], [36, 8], [36, 0]])} ${poly([[92, 72], [92, 64], [100, 64]])}`, '$2'), F(poly([[28, 8], [56, 8], [92, 44], [92, 72]])),
    S('M34 8 L92 66 M50 8 L92 50', WHT, 1.4, {op: 0.7}), F(star(67, 33, 7, 2.9, 5, -45), WHT)], dc(ROS, '#9f1239', '#ffe4e6'));
  add('badges', 'badge-new', 'NEW badge', 'new naya burst', [100, 100], [FS(star(50, 50, 47, 39, 16), '$1', '$1', 3), T('NEW', 50, 59, 25, WHT, {ls: 1})], D.ros);
  add('badges', 'badge-sale', 'SALE tag', 'sale tag price discount offer', [124, 70],
    [FS(holes(poly([[6, 35], [32, 5], [118, 5], [118, 65], [32, 65]]), circle(28, 35, 8)), '$1', '$1', 6), T('SALE', 76, 43, 22, WHT, {ls: 1.5})], D.cor);
  add('badges', 'badge-half-off', '50% OFF badge', '50 percent off sale discount offer', [100, 100],
    [FS(star(50, 50, 47, 42, 22), '$1', '$1', 3), T('50%', 50, 54, 28, WHT), T('OFF', 50, 74, 15, WHT, {ls: 2})], D.ros);
  add('badges', 'badge-best', 'BEST medal', 'best medal award winner top', [100, 112], [
    F(poly([[30, 62], [46, 70], [36, 108], [29, 98], [18, 102]]) + ' ' + poly([[70, 62], [54, 70], [64, 108], [71, 98], [82, 102]]), '$2'),
    F(circle(50, 44, 40)), S(circle(50, 44, 33), WHT, 2, {op: 0.65}), F(star(50, 24, 6, 2.5, 5), WHT), T('BEST', 50, 54, 20, WHT, {ls: 1})], dc(IND, AMB, '#e8e5fe'));
  add('badges', 'badge-first', '1st place medal', 'first 1st winner medal gold awwal', [100, 124], [
    F(poly([[18, 2], [40, 2], [62, 56], [44, 62]]), '$2'), F(poly([[82, 2], [60, 2], [38, 56], [56, 62]]), '$2'),
    F(poly([[82, 2], [60, 2], [38, 56], [56, 62]]), '#000000', {op: 0.18}), F(circle(50, 84, 36)), S(circle(50, 84, 28), WHT, 3, {op: 0.55}), T('1st', 50, 95, 30, WHT)], dc(AMB, IND, '#fef3c7'));
  add('badges', 'badge-hot', 'HOT label', 'hot trending popular garam', [120, 50], [F(rrect(3, 3, 114, 44, 22)), T('HOT', 61.5, 34, 24, WHT, {ls: 3})], D.ros);
  add('badges', 'badge-free', 'FREE badge', 'free muft offer', [100, 100], [F(circle(50, 50, 46)), S(dashes(circle(50, 50, 39), 5, 4), WHT, 2.5), T('FREE', 50, 59, 23, WHT, {ls: 1})], D.grn);
  add('badges', 'badge-pennant', 'Bookmark ribbon', 'bookmark pennant ribbon vertical', [60, 100],
    [F(poly([[8, 2], [52, 2], [52, 96], [30, 77], [8, 96]])), S(dashes('M14 6 L14 82', 4, 3) + ' ' + dashes('M46 6 L46 82', 4, 3), WHT, 1.5, {op: 0.75}), F(star(30, 30, 11, 4.6, 5), WHT)], D.ind);
  add('badges', 'badge-rating', '5 star rating', 'rating stars review five sitare', [170, 44],
    [F(rrect(2, 2, 166, 40, 20), '$3'), F(Array.from({length: 5}, (_, i) => star(29 + i * 28, 23.5, 12, 5.2, 5)).join(' '))], dc(AMB, IND, '#fef3c7'));
}

/* ================================================================== STAMPS */
{
  const RED = '#dc2626', BLUE = '#1d4ed8', GREEN = '#15803d';
  const rectStamp = (id, word, ink, tags, o = {}) => {
    const size = o.size || 26, ls = o.ls ?? 2, icon = o.check ? 30 : 0, h = o.sub ? 80 : 62;
    const w = Math.round(textW(word, size, ls) + 40 + icon), cx = (w + icon) / 2;
    const parts = [S(rrect(3, 3, w - 6, h - 6, 7), '$1', o.thick || 4.5)];
    if (o.double !== false) parts.push(S(rrect(9.5, 9.5, w - 19, h - 19, 3.5), '$1', 1.6));
    if (o.check) parts.push(S(`M${pt(22, 31)} L${pt(29, 38)} L${pt(42, 23)}`, '$1', 5));
    parts.push(T(word, cx, (o.sub ? 38 : h / 2) + size * 0.36, size, '$1', {ls, font: o.font || 'sans'}));
    if (o.sub) parts.push(T(o.sub, w / 2, 62, 11, '$1', {font: 'mono', ls: 0.5}));
    add('stamps', `stamp-${id}`, `${word[0]}${word.slice(1).toLowerCase()} stamp`, `${word.toLowerCase()} ${tags}`, [w, h], parts, dc(ink, ink, '#ffffff'));
  };
  const roundStamp = (id, word, ink, tags, o = {}) => {
    const size = Math.min(19, 96 / textW(word, 1, 0)), ls = 1;
    const top = o.check ? S('M47 26 L56 35 L74 16', '$1', 5) : F(star(60, 26, 7, 3, 5) + ' ' + star(42, 31, 4.5, 1.9, 5) + ' ' + star(78, 31, 4.5, 1.9, 5));
    add('stamps', `stamp-${id}`, `${word[0]}${word.slice(1).toLowerCase()} stamp`, `${word.toLowerCase()} ${tags} round circle`, [120, 120], [
      S(circle(60, 60, 55), '$1', 4), S(circle(60, 60, 48), '$1', 1.5), top,
      F(star(60, 94, 7, 3, 5) + ' ' + star(42, 89, 4.5, 1.9, 5) + ' ' + star(78, 89, 4.5, 1.9, 5)),
      F(poly([[0, 46], [120, 46], [113, 60], [120, 74], [0, 74], [7, 60]])), T(word, 60, 60 + size * 0.36, size, WHT, {ls})], dc(ink, ink, '#ffffff'));
  };
  rectStamp('approved', 'APPROVED', GREEN, 'manzoor ok accepted pass');
  rectStamp('paid', 'PAID', RED, 'ada payment invoice bill paisa', {size: 34, ls: 5});
  rectStamp('draft', 'DRAFT', BLUE, 'masauda rough version');
  rectStamp('copy', 'COPY', BLUE, 'naqal duplicate', {font: 'serif', size: 30, ls: 4, double: false, thick: 5});
  rectStamp('urgent', 'URGENT', RED, 'fori jaldi important priority');
  rectStamp('confidential', 'CONFIDENTIAL', RED, 'khufia raaz secret private', {size: 22, ls: 1.5, double: false, thick: 4});
  roundStamp('verified', 'VERIFIED', GREEN, 'tasdeeq verified checked genuine');
  rectStamp('rejected', 'REJECTED', RED, 'namanzoor radd declined fail');
  rectStamp('received', 'RECEIVED', BLUE, 'wasool mil gaya date tareekh', {size: 24, sub: 'DATE: ____________'});
  roundStamp('original', 'ORIGINAL', BLUE, 'asal genuine real');
  rectStamp('sample', 'SAMPLE', BLUE, 'namoona specimen example');
  rectStamp('void', 'VOID', RED, 'mansookh cancel cancelled invalid', {size: 34, ls: 8, double: false, thick: 6});
  roundStamp('done', 'DONE', GREEN, 'mukammal complete finished khatam', {check: true});
  rectStamp('checked', 'CHECKED', GREEN, 'check tick sahi reviewed inspected', {check: true});
}

/* ================================================================== FACES */
{
  const base = F(circle(50, 50, 46));
  const eyes = (y = 42, rx = 5.5, ry = 7.5) => [F(`${ellipse(35, y, rx, ry)} ${ellipse(65, y, rx, ry)}`, '$2'), F(`${circle(36.8, y - 3, 1.8)} ${circle(66.8, y - 3, 1.8)}`, WHT)];
  const cheeks = (op = 0.45) => F(`${ellipse(24, 60, 7, 4.5)} ${ellipse(76, 60, 7, 4.5)}`, '$3', {op});
  const smile = S('M30 60 C38 74 62 74 70 60', '$2', 5.5);
  const grin = [F('M24 56 L76 56 C76 74 64 86 50 86 C36 86 24 74 24 56 Z', '$2'), F('M29 56 L71 56 L70 61 C70 63 69 64 67 64 L33 64 C31 64 30 63 30 61 Z', WHT),
    F('M36 79 C40 72 60 72 64 79 C60 83 55 86 50 86 C45 86 40 83 36 79 Z', '#ff6b81')];
  const face = (id, name, tags, parts, def) => add('faces', `face-${id}`, name, tags, [100, 100], [base, ...parts], def);
  face('happy', 'Happy face', 'happy smile khush muskurahat', [...eyes(), cheeks(), smile]);
  face('laughing', 'Laughing face', 'laugh laughing lol hansi grin', [cheeks(), S('M26 43 Q35 32 44 43 M56 43 Q65 32 74 43', '$2', 5.5), ...grin]);
  face('wink', 'Winking face', 'wink aankh maarna playful', [F(ellipse(35, 42, 5.5, 7.5), '$2'), F(circle(36.8, 39, 1.8), WHT), S('M57 44 Q65 37 73 44', '$2', 5.5), cheeks(), smile]);
  face('love', 'Heart eyes face', 'love heart eyes pyar mohabbat dil', [F(`${heart(34, 42, 26)} ${heart(66, 42, 26)}`, '#f43f5e'),
    F('M32 60 L68 60 C68 72 60 80 50 80 C40 80 32 72 32 60 Z', '$2'), F('M40 75 C43 71 57 71 60 75 C57 78 54 80 50 80 C46 80 43 78 40 75 Z', '#ff6b81')]);
  face('sad', 'Sad face', 'sad unhappy udaas dukhi', [...eyes(46, 5, 6.5), S('M24 33 L39 27 M61 27 L76 33', '$2', 4.5), S('M34 75 C40 64 60 64 66 75', '$2', 5.5)]);
  face('crying', 'Crying face', 'cry crying tears rona aansu', [S('M26 43 Q34 49 42 43 M58 43 Q66 49 74 43', '$2', 5), S('M24 32 L39 27 M61 27 L76 32', '$2', 4.5),
    F('M33 76 C37 63 63 63 67 76 C61 72 39 72 33 76 Z', '$2'), F(`${drop(31, 60, 15)} ${drop(69, 60, 15)}`, '#60a5fa')]);
  face('surprised', 'Surprised face', 'surprised shocked wow hairan', [F(`${circle(35, 43, 6.5)} ${circle(65, 43, 6.5)}`, '$2'), F(`${circle(37, 40.5, 2)} ${circle(67, 40.5, 2)}`, WHT),
    S('M27 27 Q35 20 43 27 M57 27 Q65 20 73 27', '$2', 4.5), F(ellipse(50, 70, 8, 11), '$2')]);
  face('cool', 'Cool face with glasses', 'cool sunglasses chashma swag', [
    F('M17 34 L46 34 C46 46 41 52 32 52 C23 52 17 46 17 34 Z M54 34 L83 34 C83 46 77 52 68 52 C59 52 54 46 54 34 Z', '#1e293b'), S('M12 35 L88 35', '#1e293b', 4.5),
    S('M23 39 L30 39 M60 39 L67 39', WHT, 2.5, {op: 0.7}), S('M36 66 C44 72 58 70 66 61', '$2', 5.5)]);
  face('thinking', 'Thinking face', 'thinking hmm soch sochna doubt', [...eyes(43, 5, 7), S('M26 29 Q34 22 42 27 M58 31 L72 30', '$2', 4.5), S('M53 69 L68 66', '$2', 5),
    FS('M24 80 C24 75 28 72 33 72 L40 72 L41 61 C41 56 48 56 48 61 L48 74 C52 76 54 80 52 86 C50 92 44 94 38 94 L32 94 C27 94 24 90 24 86 Z', '$1', '$2', 3.5)]);
  face('angry', 'Angry face', 'angry mad ghussa naraz', [S('M24 30 L42 38 M76 30 L58 38', '$2', 6), F(`${ellipse(35, 47, 5, 6)} ${ellipse(65, 47, 5, 6)}`, '$2'),
    S('M34 75 C42 66 58 66 66 75', '$2', 5.5)], {c1: '#fb7a5a'});
  face('sleepy', 'Sleepy face', 'sleepy sleep tired neend thaka', [S('M27 45 Q35 51 43 45 M57 45 Q65 51 73 45', '$2', 5), F(ellipse(50, 70, 5, 6), '$2'),
    S('M66 10 L78 10 L66 22 L78 22', '$2', 3.5), S('M84 2 L92 2 L84 10 L92 10', '$2', 3)]);
  face('star-eyes', 'Star eyes face', 'star struck excited wow sitara', [FS(`${star(35, 42, 11, 4.6, 5)} ${star(65, 42, 11, 4.6, 5)}`, '#f43f5e', '#f43f5e', 2), ...grin]);
  face('neutral', 'Neutral face', 'neutral meh blank plain', [...eyes(), S('M36 66 L64 66', '$2', 5.5)]);
  face('tongue', 'Silly face', 'silly tongue funny mazaq', [F(ellipse(35, 42, 5.5, 7.5), '$2'), F(circle(36.8, 39, 1.8), WHT), S('M57 44 Q65 37 73 44', '$2', 5.5),
    F('M42 65 L58 65 L58 76 C58 84 42 84 42 76 Z', '#ff6b81'), S('M50 68 L50 76', '#e11d48', 2, {op: 0.5}), S('M32 60 C40 70 60 70 68 60', '$2', 5.5)]);
  face('shy', 'Blushing face', 'blush shy sharmana cute', [S('M26 44 Q35 36 44 44 M56 44 Q65 36 74 44', '$2', 5), cheeks(0.75), S('M41 63 Q50 70 59 63', '$2', 5)]);
}

/* ================================================================== ICONS */
{
  const W = 7;
  const ic = (id, name, tags, parts, def) => add('icons', `icon-${id}`, name, tags, [100, 100], parts, def);
  ic('check', 'Tick', 'check tick sahi done yes ok', [S('M16 52 L40 76 L86 26', '$1', 13)], D.grn);
  ic('check-circle', 'Tick in circle', 'check tick sahi done yes ok circle', [F(circle(50, 50, 46)), S('M28 52 L44 67 L73 36', WHT, 9)], D.grn);
  ic('cross', 'Cross', 'cross x wrong ghalat no close', [S('M24 24 L76 76 M76 24 L24 76', '$1', 13)], D.ros);
  ic('cross-circle', 'Cross in circle', 'cross x wrong ghalat no close circle', [F(circle(50, 50, 46)), S('M34 34 L66 66 M66 34 L34 66', WHT, 9)], D.ros);
  ic('star', 'Star', 'star sitara favourite rating', [FS(star(50, 54, 42, 18, 5), '$3', '$1', W)], D.amb);
  ic('heart', 'Heart', 'heart dil love like pyar', [FS(heart(50, 50, 88), '$3', '$1', W)], D.ros);
  ic('mobile', 'Mobile phone', 'phone fone mobile smartphone cell', [FS(rrect(27, 6, 46, 88, 11), '$3', '$1', W), S('M44 18 L56 18', '$1', 5), F(circle(50, 80, 4.5))]);
  {
    const pad = (a, len) => { const p = onE(72, 28, 47, 47, a); return rot(rrect(p[0] - 13, p[1] - len / 2, 26, len, 11), a, p[0], p[1]); };
    ic('call', 'Phone call', 'phone fone call telephone contact', [S(arc(72, 28, 47, 47, 174, 96), '$1', 17), F(`${pad(182, 32)} ${pad(88, 32)}`)], D.grn);
  }
  ic('mail', 'Mail', 'mail email khat letter envelope message', [FS(rrect(8, 20, 84, 60, 10), '$3', '$1', W), S('M14 28 L50 54 L86 28', '$1', W)]);
  ic('location', 'Location pin', 'location pin map jagah pata address place', [F(holes('M50 94 C50 94 16 60 16 38 C16 19 31 6 50 6 C69 6 84 19 84 38 C84 60 50 94 50 94 Z', circle(50, 38, 13)))], D.ros);
  ic('clock', 'Clock', 'clock time ghari waqt', [FS(circle(50, 50, 42), '$3', '$1', W), S('M50 28 L50 50 L65 60', '$1', W)]);
  ic('calendar', 'Calendar', 'calendar date tareekh schedule month', [F(rrect(10, 16, 80, 76, 10), '$3'), F(`M10 26${arcTo(20, 26, 10, 10, 180, 270)} L80 16${arcTo(80, 26, 10, 10, 270, 360)} L90 38 L10 38 Z`),
    S(rrect(10, 16, 80, 76, 10), '$1', W), S('M32 8 L32 24 M68 8 L68 24', '$1', W),
    F([[32, 56], [50, 56], [68, 56], [32, 74], [50, 74]].map((p) => circle(p[0], p[1], 4.5)).join(' ')), F(circle(68, 74, 5.5), '$2')]);
  ic('home', 'Home', 'home house ghar makan', [F(poly([[20, 44], [50, 18], [80, 44], [80, 90], [20, 90]]), '$3'), S('M8 50 L50 13 L92 50', '$1', W), S('M20 42 L20 90 L80 90 L80 42', '$1', W),
    F('M40 90 L40 67 C40 63 43 60 47 60 L53 60 C57 60 60 63 60 67 L60 90 Z', '$2')]);
  ic('user', 'Person', 'user person profile aadmi banda account', [FS(circle(50, 32, 18), '$3', '$1', W), FS('M14 90 C14 70 30 58 50 58 C70 58 86 70 86 90 Z', '$3', '$1', W)]);
  ic('users', 'People', 'users people team group log', [FS(circle(67, 30, 14), '$3', '$1', 6), S('M60 56 C64 55 66 54 70 54 C83 54 93 64 93 80', '$1', 6),
    FS(circle(38, 38, 17), '$3', '$1', W), FS('M8 92 C8 74 22 62 38 62 C54 62 68 74 68 92 Z', '$3', '$1', W)]);
  const lockBody = holes(rrect(16, 42, 68, 50, 10), 'M46 70 L44 80 C44 82 45 83 47 83 L53 83 C55 83 56 82 56 80 L54 70 C57 68 58 65 58 62 C58 57 54 54 50 54 C46 54 42 57 42 62 C42 65 43 68 46 70 Z');
  ic('lock', 'Lock', 'lock locked taala secure password', [S('M30 44 L30 32 C30 20 39 12 50 12 C61 12 70 20 70 32 L70 44', '$1', 8), F(lockBody)]);
  ic('unlock', 'Unlock', 'unlock open taala khula', [S('M30 44 L30 30 C30 18 39 10 50 10 C60 10 67 15 69 22', '$1', 8), F(lockBody)], D.tea);
  ic('warning', 'Warning', 'warning alert caution khatra danger', [FS(poly([[50, 12], [91, 84], [9, 84]]), '$1', '$1', 10), S('M50 38 L50 58', WHT, 9), F(circle(50, 72, 5.5), WHT)], D.amb);
  ic('info', 'Info', 'info information maloomat help', [F(circle(50, 50, 46)), F(circle(50, 28, 6.5), WHT), S('M50 45 L50 74', WHT, 10)], D.sky);
  ic('question', 'Question', 'question help sawal faq', [F(circle(50, 50, 46)), S('M36 38 C36 28 43 22 50 22 C58 22 65 28 65 36 C65 44 58 47 53 51 C51 53 50 55 50 60', WHT, 9), F(circle(50, 75, 5.5), WHT)]);
  ic('idea', 'Light bulb', 'idea bulb lightbulb roshni tip', [FS('M50 8 C32 8 20 21 20 38 C20 50 27 57 33 64 C36 67 37 70 37 74 L63 74 C63 70 64 67 67 64 C73 57 80 50 80 38 C80 21 68 8 50 8 Z', '$3', '$1', W),
    S('M39 84 L61 84 M43 93 L57 93', '$1', W)], D.amb);
  ic('flag', 'Flag', 'flag jhanda goal mark', [F('M22 14 C34 6 46 20 62 12 C70 8 76 8 84 11 L84 52 C76 50 70 50 62 54 C46 62 34 46 22 54 Z', '$2'), S('M20 94 L20 9', '$1', W)]);
  ic('thumbs-up', 'Thumbs up', 'thumbs up like good acha', [F(rrect(8, 44, 18, 46, 4)), FS('M32 46 L45 18 C47 12 58 12 58 23 L56 38 L80 38 C88 38 92 44 90 52 L84 80 C82 86 78 90 72 90 L32 90 Z', '$3', '$1', W)]);
  ic('bookmark', 'Bookmark', 'bookmark save mark', [FS('M24 10 L76 10 L76 90 L50 70 L24 90 Z', '$3', '$1', W)], D.cor);
  ic('cart', 'Shopping cart', 'cart shopping tokri trolley buy kharidari', [S('M6 14 L18 14 L30 64 L80 64', '$1', W), FS('M22 26 L90 26 L82 54 L29 54 Z', '$3', '$1', W),
    F(`${circle(36, 82, 7)} ${circle(74, 82, 7)}`)]);
  ic('money', 'Banknote', 'money cash paisa raqam note banknote rupee', [FS(rrect(6, 24, 88, 52, 8), '$3', '$1', W), S(circle(50, 50, 12), '$1', 6), F(`${circle(21, 38, 4)} ${circle(79, 62, 4)}`)], dc('#16a34a', AMB, '#dcfce7'));
  ic('coin', 'Coin', 'coin sikka money paisa', [FS(circle(50, 50, 42), '$3', '$1', W), S(circle(50, 50, 28), '$1', 3.5), F(star(50, 51.5, 14, 6, 5))], D.amb);
  ic('gift', 'Gift', 'gift tohfa present box birthday', [FS(rrect(14, 44, 72, 48, 6), '$3', '$1', W), FS(rrect(8, 30, 84, 16, 5), '$3', '$1', W), S('M50 30 L50 92', '$2', W),
    S('M50 29 C42 14 24 16 29 26 C33 33 44 31 50 29 C56 31 67 33 71 26 C76 16 58 14 50 29 Z', '$2', 6)]);
  ic('bell', 'Bell', 'bell ghanti notification alert reminder', [FS('M50 12 C34 12 25 24 25 40 L25 58 L15 72 L85 72 L75 58 L75 40 C75 24 66 12 50 12 Z', '$3', '$1', W),
    S('M41 82 Q50 92 59 82', '$1', W), S('M50 5 L50 12', '$1', W)], D.amb);
  ic('camera', 'Camera', 'camera photo tasveer picture', [FS('M10 32 C10 28 14 24 18 24 L32 24 L38 14 L62 14 L68 24 L82 24 C86 24 90 28 90 32 L90 80 C90 84 86 88 82 88 L18 88 C14 88 10 84 10 80 Z', '$3', '$1', W),
    FS(circle(50, 55, 16), WHT, '$1', W), F(circle(77, 36, 3.5))]);
  ic('document', 'Document', 'document file page kaghaz paper', [FS(poly([[20, 6], [60, 6], [80, 26], [80, 94], [20, 94]]), '$3', '$1', W), S('M59 7 L59 27 L79 27', '$1', W),
    S('M33 46 L67 46 M33 60 L67 60 M33 74 L55 74', '$1', 5)]);
  ic('folder', 'Folder', 'folder files directory', [FS('M8 22 C8 18 11 14 16 14 L38 14 L46 24 L84 24 C88 24 92 28 92 32 L92 80 C92 84 88 88 84 88 L16 88 C11 88 8 84 8 80 Z', '$3', '$1', W), S('M8 38 L92 38', '$1', 5)], D.amb);
  ic('search', 'Search', 'search find talash dhoondo magnifier', [FS(circle(42, 42, 28), '$3', '$1', W), S('M63 63 L88 88', '$1', 11)]);
  {
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = i * 45; pts.push(onE(50, 50, 35, 35, a - 15), onE(50, 50, 46, 46, a - 8), onE(50, 50, 46, 46, a + 8), onE(50, 50, 35, 35, a + 15)); }
    ic('settings', 'Settings gear', 'settings gear options setup', [FS(holes(poly(pts), circle(50, 50, 16)), '$1', '$1', 4)], D.sla);
  }
  const tray = 'M14 66 L14 84 C14 88 16 90 20 90 L80 90 C84 90 86 88 86 84 L86 66';
  ic('download', 'Download', 'download save neeche', [S(`M50 10 L50 62 ${chev(50, 64, 90, 22, 45)} ${tray}`, '$1', W)], D.tea);
  ic('upload', 'Upload', 'upload send upar', [S(`M50 64 L50 12 ${chev(50, 10, -90, 22, 45)} ${tray}`, '$1', W)], D.tea);
  ic('link', 'Link', 'link chain url jor', [S(`${rot(rrect(8, 38, 50, 24, 12), -45)} ${rot(rrect(42, 38, 50, 24, 12), -45)}`, '$1', W)]);
  ic('trash', 'Trash', 'trash delete bin koora dustbin', [FS('M22 26 L26 86 C26 90 29 92 32 92 L68 92 C71 92 74 90 74 86 L78 26 Z', '$3', '$1', W), S('M12 25 L88 25 M38 24 L38 13 L62 13 L62 24', '$1', W),
    S('M42 42 L42 76 M58 42 L58 76', '$1', 5)], D.ros);
  {
    const p = (d) => rot(d, -45, 50, 50);
    ic('pencil', 'Pencil', 'pencil pen qalam edit write likho', [F(p(rect(26, 39, 54, 22))), F(p(rect(80, 39, 7, 22)), '#94a3b8'), F(p(rrect(84, 39, 12, 22, 5)), '$2'),
      F(p(poly([[26, 39], [26, 61], [8, 50]])), '#f6d7b0'), F(p(poly([[13.5, 46.9], [13.5, 53.1], [8, 50]])), SLA)], D.amb);
  }
  ic('wifi', 'Wi-Fi', 'wifi internet signal network', [S(`${arc(50, 80, 58, 58, 225, 315)} ${arc(50, 80, 39, 39, 225, 315)} ${arc(50, 80, 20, 20, 225, 315)}`, '$1', 8), F(circle(50, 80, 6.5))]);
  ic('battery', 'Battery', 'battery charge power', [S(rrect(6, 28, 80, 44, 9), '$1', W), F(rrect(89, 41, 7, 18, 3)), F(`${rrect(16, 38, 16, 24, 3)} ${rrect(36, 38, 16, 24, 3)} ${rrect(56, 38, 16, 24, 3)}`)], D.grn);
  ic('leaf', 'Leaf', 'leaf patta nature green eco', [F('M14 86 C10 50 30 14 88 12 C90 60 62 90 14 86 Z'), S('M18 82 C38 62 56 42 76 24', '$3', 4)], D.grn);
  ic('sun', 'Sun', 'sun sooraj day dhoop weather', [F(circle(50, 50, 19)), S(Array.from({length: 8}, (_, i) => pl(onE(50, 50, 30, 30, i * 45), onE(50, 50, 43, 43, i * 45))).join(' '), '$1', 7)], D.amb);
  ic('moon', 'Moon', 'moon chaand night raat', [F(crescent(46, 52, 40, 70, 34, 32))], D.ind);
  ic('cloud', 'Cloud', 'cloud badal weather', [FS('M26 78 C14 78 6 70 6 60 C6 50 14 42 24 42 C26 28 36 20 50 20 C62 20 72 28 75 40 C86 40 94 49 94 59 C94 70 86 78 76 78 Z', '$3', '$1', W)], D.sky);
  ic('umbrella', 'Umbrella', 'umbrella chhatri rain barish', [FS('M8 52 C8 28 28 12 50 12 C72 12 92 28 92 52 C86 46 78 46 72 52 C66 46 56 46 50 52 C44 46 34 46 28 52 C22 46 14 46 8 52 Z', '$1', '$1', 4),
    S('M50 52 L50 82 C50 90 38 90 38 82', '$2', W), S('M50 12 L50 6', '$1', 5)], D.sky);
  ic('crescent-star', 'Crescent and star', 'crescent star chaand sitara islam eid ramadan ramzan', [F(crescent(46, 50, 40, 62, 42, 32)), F(star(69, 47, 14, 5.6, 5, -72))], dc('#0f766e', AMB, '#ccfbf1'));
  ic('mosque', 'Mosque', 'mosque masjid dome islam eid prayer namaz', [F(holes(
    'M14 64 L86 64 L86 92 L58 92 L58 80 C58 74 54 70 50 70 C46 70 42 74 42 80 L42 92 L14 92 Z ' +
    'M29 64 C23 55 26 44 37 38 C45 34 49 30 50 22 C51 30 55 34 63 38 C74 44 77 55 71 64 Z ' +
    `${rect(6, 36, 9, 56)} ${poly([[5, 37], [10.5, 22], [16, 37]])} ${rect(85, 36, 9, 56)} ${poly([[84, 37], [89.5, 22], [95, 37]])} ${rect(3, 52, 15, 4)} ${rect(82, 52, 15, 4)}`,
    'M22 86 L22 78 C22 75 24 73 26 73 C28 73 30 75 30 78 L30 86 Z', 'M70 86 L70 78 C70 75 72 73 74 73 C76 73 78 75 78 78 L78 86 Z')),
  S('M50 22 L50 13', '$1', 2.5), F(crescent(50, 10, 4.5, 52.5, 8.5, 3.6))], dc('#0f766e', AMB, '#ccfbf1'));
  ic('chai', 'Cup of chai', 'cup chai tea coffee mug drink', [FS('M16 40 L74 40 L70 78 C69 86 62 90 56 90 L34 90 C28 90 21 86 20 78 Z', '$3', '$1', W), S('M74 48 C86 47 90 54 88 62 C86 70 78 72 71 70', '$1', W),
    S('M32 30 C28 24 36 20 32 12 M46 30 C42 24 50 20 46 12 M60 30 C56 24 64 20 60 12', '$1', 4.5, {op: 0.6})], dc('#b45309', COR, '#fde7c7'));
  ic('eye', 'Eye', 'eye aankh view see dekho', [FS('M6 50 C18 28 34 20 50 20 C66 20 82 28 94 50 C82 72 66 80 50 80 C34 80 18 72 6 50 Z', '$3', '$1', W), F(circle(50, 50, 13))]);
  ic('printer', 'Printer', 'printer print chhapo', [S('M28 36 L28 10 L72 10 L72 36', '$1', W), FS(rrect(8, 36, 84, 38, 8), '$3', '$1', W), FS(rect(28, 60, 44, 32), WHT, '$1', W), F(circle(78, 48, 4))], D.sla);
  ic('plus', 'Plus', 'plus add jama new', [S('M50 16 L50 84 M16 50 L84 50', '$1', 13)], D.tea);
  ic('globe', 'Globe', 'globe world internet duniya web', [FS(circle(50, 50, 42), '$3', '$1', W), S(`${ellipse(50, 50, 18, 42)} M8 50 L92 50 M16 30 L84 30 M16 70 L84 70`, '$1', 5)], D.sky);
  ic('key', 'Key', 'key chaabi password access', [S(`${circle(30, 50, 16)} M46 50 L90 50 L90 64 M76 50 L76 62`, '$1', 8)], D.amb);
}

/* ================================================================== SPEECH BUBBLES */
{
  const cb = (id, name, tags, vb, parts, def) => add('callouts', `bubble-${id}`, name, tags, vb, parts, def);
  const oval = bubbleOval(60, 44, 54, 38, 112, 132, [16, 96]);
  cb('round', 'Round speech bubble', 'round oval talk', [120, 100], [FS(oval, '$3', '$1', 4)]);
  const rb = bubble(4, 4, 112, 72, 14, 26, 50, [18, 96]);
  cb('rect', 'Speech bubble', 'rectangle box talk', [120, 100], [FS(rb, '$3', '$1', 4)]);
  cb('rect-right', 'Speech bubble (right)', 'rectangle box talk reply', [120, 100], [FS(sc(rb, -1, 1, 60), '$3', '$1', 4)], {c1: COR});
  cb('top', 'Tooltip bubble', 'tooltip hint note top', [120, 100], [FS(sc(rb, 1, -1, 0, 50), '$3', '$1', 4)], {c1: TEA});
  {
    const r = rng(7), pts = Array.from({length: 9}, (_, i) => onE(61, 45, 42 + r() * 4, 26 + r() * 3, -80 + i * 40));
    cb('thought', 'Thought bubble', 'thought think soch cloud idea', [120, 108], [FS(bumpy(pts, 0.6), '$3', '$1', 4), FS(circle(24, 91, 6.5), '$3', '$1', 3.5), FS(circle(11, 101, 3.8), '$3', '$1', 3)]);
  }
  {
    const r = rng(11), pts = [];
    for (let i = 0; i < 26; i++) {
      const a = -90 + i * 360 / 26, out = i % 2 === 0;
      pts.push(i === 16 ? [8, 99] : onE(60, 48, (out ? 56 : 42) + r() * 5, (out ? 44 : 31) + r() * 4, a));
    }
    cb('shout', 'Shout bubble', 'shout yell loud wow boom chilla', [120, 100], [FS(poly(pts), '$1', '$1', 3), FS(poly(pts.map(([x, y]) => [60 + (x - 60) * 0.8, 48 + (y - 48) * 0.8])), '$3', '$3', 2)], dc(AMB, COR, '#fef3c7'));
  }
  cb('typing', 'Typing bubble', 'typing dots chat message solid', [120, 100], [F(rb), F(`${circle(36, 40, 7)} ${circle(60, 40, 7)} ${circle(84, 40, 7)}`, WHT)]);
  cb('chat', 'Chat bubbles', 'chat conversation two message', [120, 100], [F(bubble(40, 4, 76, 50, 12, 84, 100, [108, 68]), '$2'), F(bubble(4, 36, 78, 50, 12, 18, 36, [12, 98])),
    F(`${circle(26, 61, 4.5)} ${circle(43, 61, 4.5)} ${circle(60, 61, 4.5)}`, WHT)], {c2: TEA});
  cb('outline', 'Outline speech bubble', 'outline oval simple', [120, 100], [S(bubbleOval(60, 44, 54, 38, 80, 102, [52, 98]), '$1', 4)], {c1: SLA});
  cb('whisper', 'Whisper bubble', 'whisper dashed quiet soft', [120, 100], [F(oval, '$3'), S(dashes(oval, 7, 6), '$1', 3.5)], {c1: '#8b5cf6'});
}

/* ================================================================== FRAMES */
{
  const fr = (id, name, tags, vb, parts, def) => add('frames', `frame-${id}`, name, tags, vb, parts, def);
  fr('thin', 'Thin frame', 'thin simple rectangle box', [140, 100], [S(rect(4, 4, 132, 92), '$1', 2.5)], D.sla);
  fr('double', 'Double frame', 'double lines border', [140, 100], [S(rect(4, 4, 132, 92), '$1', 3), S(rect(11, 11, 118, 78), '$1', 1.5)]);
  fr('rounded', 'Rounded frame', 'rounded soft corners', [140, 100], [S(rrect(5, 5, 130, 90, 16), '$1', 6)], D.tea);
  fr('corners', 'Corner brackets', 'corners brackets focus kone', [140, 100], [S('M4 26 L4 4 L26 4 M114 4 L136 4 L136 26 M136 74 L136 96 L114 96 M26 96 L4 96 L4 74', '$1', 5)], D.cor);
  fr('dotted', 'Dotted frame', 'dotted dots nuqte', [140, 100], [F(dots(rect(6, 6, 128, 88), 8.6, 2.3))], D.ros);
  fr('dashed', 'Dashed frame', 'dashed cut coupon', [140, 100], [S(dashes(rrect(6, 6, 128, 88, 10), 10, 7), '$1', 3)], D.ind);
  {
    const corner = 'M11 40 L11 20 C11 15 15 11 20 11 L40 11 C47 11 49 18 44.5 20.5 C41 22.5 38 19.5 40.5 17.5 M11 40 C11 47 18 49 20.5 44.5 C22.5 41 19.5 38 17.5 40.5';
    const all = (d) => [d, sc(d, -1, 1, 70), sc(d, 1, -1, 0, 50), sc(d, -1, -1, 70, 50)].join(' ');
    const dia = poly([[21, 16], [26, 21], [21, 26], [16, 21]]) + ' ' + circle(30, 30, 1.8);
    fr('ornate', 'Ornament corners', 'ornament ornate classic decorative wedding shaadi', [140, 100], [S(rrect(4, 4, 132, 92, 6), '$1', 2), S(all(corner), '$1', 1.6), F(all(dia), '$2')], dc('#b45309', AMB, '#fef3c7'));
  }
  fr('photo', 'Photo frame', 'photo picture tasveer', [140, 100], [F(holes(rrect(2, 2, 136, 96, 8), rrect(14, 14, 112, 72, 3))), S(rrect(8, 8, 124, 84, 5), '$3', 1.2, {op: 0.8})], dc(SLA, COR, '#cbd5e1'));
  fr('polaroid', 'Instant photo frame', 'polaroid instant photo tasveer snapshot', [100, 120], [FS(holes(rrect(3, 3, 94, 114, 3), rect(11, 11, 78, 78)), '$3', '$1', 1.5)], dc('#94a3b8', COR, '#fffdf8'));
  {
    const dm = (x, y, s) => poly([[x, y - s], [x + s, y], [x, y + s], [x - s, y]]);
    fr('certificate', 'Certificate border', 'certificate sanad diploma award border', [160, 113], [F(holes(rect(2, 2, 156, 109), rect(7, 7, 146, 99))), S(rect(12, 12, 136, 89), '$2', 1.2),
      S(rect(15, 15, 130, 83), '$1', 0.6, {op: 0.7}), F([[12, 12], [148, 12], [12, 101], [148, 101]].map(([x, y]) => dm(x, y, 5)).join(' '), '$2'),
      F([[80, 12], [80, 101], [12, 56.5], [148, 56.5]].map(([x, y]) => dm(x, y, 3)).join(' '), '$2')], dc('#1e3a8a', '#b45309', '#fef3c7'));
  }
  fr('circle', 'Circle frame', 'circle round gol daira', [100, 100], [F(holes(circle(50, 50, 48), circle(50, 50, 41))), S(circle(50, 50, 37), '$1', 1.2)], D.tea);
  fr('tag', 'Tag label', 'tag label price', [150, 80], [S(`${poly([[6, 40], [30, 6], [144, 6], [144, 74], [30, 74]])} ${circle(28, 40, 5)}`, '$1', 3)], D.cor);
  {
    const pts = [], add4 = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
    add4(10, 10, 130, 10, 12); add4(130, 10, 130, 90, 8); add4(130, 90, 10, 90, 12); add4(10, 90, 10, 10, 8);
    fr('scalloped', 'Scalloped frame', 'scalloped wavy cute lace', [140, 100], [S(bumpy(pts, 0.55), '$1', 2.5)], D.ros);
  }
}

/* ================================================================== LINES & DIVIDERS */
{
  const ln = (id, name, tags, parts, def, vb = [200, 24]) => add('lines', `line-${id}`, name, tags, vb, parts, def);
  ln('plain', 'Line', 'plain simple straight seedhi', [S('M4 12 L196 12', '$1', 3)], D.sla);
  ln('bold', 'Bold line', 'bold thick mota', [S('M6 12 L194 12', '$1', 8)]);
  ln('double', 'Double line', 'double two', [S('M4 8 L196 8 M4 16 L196 16', '$1', 2.5)]);
  ln('dashed', 'Dashed line', 'dashed cut dash', [S(dashes('M6 12 L194 12', 12, 9), '$1', 4)], D.cor);
  ln('dotted', 'Dotted line', 'dotted dots nuqte', [F(dots('M6 12 L194 12', 10, 2.6))], D.tea);
  ln('wavy', 'Wavy line', 'wavy wave lehar curvy', [S(smooth(Array.from({length: 25}, (_, i) => [4 + i * 8, 12 + 6.5 * Math.sin(i * Math.PI / 4)]), false), '$1', 3.5)], D.sky);
  ln('zigzag', 'Zigzag line', 'zigzag zig zag', [S(pl(...Array.from({length: 17}, (_, i) => [4 + i * 12, i % 2 ? 5 : 19])), '$1', 3.5)], D.amb);
  ln('arrow', 'Line with arrow', 'arrow teer pointer', [S(`M4 12 L190 12 ${chev(195, 12, 0, 12, 40)}`, '$1', 3)]);
  ln('ornament', 'Ornament divider', 'ornament classic diamond fancy', [S('M6 12 L82 12 M118 12 L194 12', '$1', 2), F(`${poly([[100, 3], [109, 12], [100, 21], [91, 12]])} ${circle(87, 12, 2.4)} ${circle(113, 12, 2.4)}`)], dc('#b45309', AMB, '#fef3c7'));
  ln('swoosh', 'Underline swoosh', 'underline swoosh highlight brush', [F('M4 22 C50 10 120 4 196 5 C198 5 198 8 196 8 C124 11 56 19 7 27 C3 28 2 23 4 22 Z')], D.cor, [200, 30]);
  ln('brush', 'Brush stroke', 'brush paint stroke highlight marker', [F(smooth([[10, 9], [40, 7], [80, 8.5], [120, 6.5], [160, 7.5], [190, 8], [197, 11], [192, 15], [198, 19], [189, 22], [150, 23.5],
    [110, 22], [70, 23.5], [30, 22], [9, 21.5], [3, 18], [8, 15], [2, 12]], true, 0.7), '$1', {op: 0.92})], D.amb, [200, 30]);
  ln('dot-dash', 'Dot-dash line', 'dot dash morse', [S(Array.from({length: 7}, (_, i) => `M${pt(6 + i * 30, 12)} L${pt(16 + i * 30, 12)}`).join(' '), '$1', 4), F(Array.from({length: 6}, (_, i) => circle(26 + i * 30, 12, 2.6)).join(' '))], D.ros);
  ln('hand', 'Hand-drawn underline', 'hand drawn sketch underline marker', [S(smooth([[6, 12], [50, 9.5], [100, 11.5], [150, 9], [194, 11]], false), '$1', 3.5), S(smooth([[24, 17], [70, 14.5], [120, 16], [170, 14]], false), '$1', 2.5, {op: 0.6})], D.ind);
  ln('fading-dots', 'Fading dots', 'dots fade gradient nuqte', [F(Array.from({length: 15}, (_, i) => circle(16 + i * 12, 12, Math.max(0.8, 4.2 - Math.abs(i - 7) * 0.48))).join(' '))], D.tea);
  ln('diamonds', 'Diamond chain', 'diamonds chain pattern', [F(Array.from({length: 13}, (_, i) => poly([[10 + i * 15, 6], [16 + i * 15, 12], [10 + i * 15, 18], [4 + i * 15, 12]])).join(' '))], D.ind);
}

/* ================================================================== DECORATIONS */
{
  const de = (id, name, tags, vb, parts, def) => add('deco', `deco-${id}`, name, tags, vb, parts, def);
  de('sparkle', 'Sparkle', 'sparkle shine chamak glitter star', [100, 100], [F(spark(46, 54, 42)), F(`${spark(84, 18, 12)} ${spark(18, 16, 7)}`, '$2')], dc(AMB, IND, '#fef3c7'));
  de('sparkles', 'Sparkles', 'sparkles shine chamak glitter magic', [100, 100], [F(spark(36, 60, 30)), F(spark(74, 30, 20), '$2'), F(spark(78, 76, 11), '$1', {op: 0.7})], dc(IND, '#8b5cf6', '#e8e5fe'));
  {
    const C = [IND, COR, TEA, AMB, ROS, GRN, SKY], r = rng(5), parts = [];
    for (let i = 0; i < 22; i++) {
      const x = 8 + r() * 84, y = 8 + r() * 84, c = C[i % C.length], kind = i % 4, a = r() * 180;
      if (kind === 0) parts.push(F(rot(rect(x - 5, y - 2.2, 10, 4.4), a, x, y), c));
      else if (kind === 1) parts.push(F(circle(x, y, 2.6 + r() * 1.4), c));
      else if (kind === 2) parts.push(F(rot(poly([[x, y - 4], [x + 4, y + 3], [x - 4, y + 3]]), a, x, y), c));
      else parts.push(S(rot(`M${pt(x - 6, y)} C${pt(x - 3, y - 5)} ${pt(x, y + 5)} ${pt(x + 6, y)}`, a, x, y), c, 2.5));
    }
    de('confetti', 'Confetti', 'confetti party celebration jashan birthday', [100, 100], parts);
  }
  de('burst', 'Burst', 'burst rays pop boom explosion', [100, 100], [S(Array.from({length: 16}, (_, i) => pl(onE(50, 50, 22, 22, i * 22.5), onE(50, 50, i % 2 ? 36 : 46, i % 2 ? 36 : 46, i * 22.5))).join(' '), '$1', 6)], D.cor);
  de('swirl', 'Swirl', 'swirl spiral curl ghoomta', [100, 100], [S(smooth(Array.from({length: 30}, (_, i) => { const t = i * 0.5, r = 2 + t * 2.95; return [50 + r * Math.cos(t), 50 + r * Math.sin(t)]; }), false), '$1', 5)], D.ind);
  de('dots', 'Dot pattern', 'dots halftone pattern nuqte', [100, 100], [F(Array.from({length: 36}, (_, k) => { const i = k % 6, j = (k - i) / 6, r = 6 - (i + j) * 0.48; return circle(12 + i * 15, 12 + j * 15, Math.max(1, r)); }).join(' '))], D.tea);
  {
    const leaves = [[49, 78, -150], [49, 78, -30], [51, 56, -150], [51, 56, -30], [51, 34, -145], [51, 34, -35]].map(([x, y, a]) => leaf(x, y, 30, 9, a));
    de('sprig', 'Leaf sprig', 'leaves pattay sprig branch plant nature', [100, 100], [S('M50 96 C47 72 54 40 50 8', '$2', 4), F(leaves.join(' ')), F(leaf(50, 14, 14, 6, -90))], D.grn);
  }
  {
    const balloon = (cx, cy) => `M${pt(cx, cy + 22)} C${pt(cx - 22, cy + 14)} ${pt(cx - 20, cy - 22)} ${pt(cx, cy - 22)} C${pt(cx + 20, cy - 22)} ${pt(cx + 22, cy + 14)} ${pt(cx, cy + 22)} Z ${poly([[cx, cy + 21], [cx + 4, cy + 27], [cx - 4, cy + 27]])}`;
    const hl = (cx, cy) => rot(ellipse(cx - 7, cy - 9, 3, 6), 25, cx - 7, cy - 9);
    de('balloons', 'Balloons', 'balloons ghubbaray party birthday', [100, 110], [S('M30 54 C26 70 40 80 50 106 M70 48 C74 70 58 80 50 106 M50 64 C46 80 54 92 50 106', SLA, 1.5),
      F(balloon(30, 30), '$2'), F(balloon(70, 24), AMB), F(balloon(50, 40)), F(`${hl(30, 30)} ${hl(70, 24)} ${hl(50, 40)}`, WHT, {op: 0.55})], dc(ROS, SKY, '#ffe4e6'));
  }
  de('crown', 'Crown', 'crown taaj king queen royal', [100, 100], [FS('M12 74 L16 30 L34 52 L50 22 L66 52 L84 30 L88 74 Z', '$1', '$1', 5), F(rrect(10, 74, 80, 13, 4)),
    F(`${circle(16, 27, 5.5)} ${circle(50, 18, 6)} ${circle(84, 27, 5.5)} ${circle(30, 80.5, 3.2)} ${circle(50, 80.5, 3.2)} ${circle(70, 80.5, 3.2)}`, '$2')], dc(AMB, ROS, '#fef3c7'));
  de('hearts', 'Hearts', 'hearts dil love pyar valentine', [100, 100], [F(heart(38, 58, 60)), F(heart(76, 28, 34), '$2'), F(heart(78, 78, 22), '$1', {op: 0.6})], dc(ROS, COR, '#ffe4e6'));
  de('stars', 'Stars', 'stars sitare night', [100, 100], [FS(star(36, 58, 30, 13, 5), '$1', '$1', 3), FS(star(76, 26, 18, 7.8, 5), '$2', '$2', 2), FS(star(80, 76, 11, 4.8, 5), '$1', '$1', 2, {op: 0.65})], dc(AMB, IND, '#fef3c7'));
  de('flower', 'Flower', 'flower phool bloom spring', [100, 100], [F(Array.from({length: 6}, (_, i) => rot(ellipse(50, 26, 14, 21), i * 60)).join(' ')), F(circle(50, 50, 13), '$2')], dc('#fb7185', AMB, '#ffe4e6'));
  {
    const band = (r1, r2) => `M${pt(50 - r2, 56)}${arcTo(50, 56, r2, r2, 180, 360)} L${pt(50 + r1, 56)}${arcTo(50, 56, r1, r1, 360, 180)} Z`;
    de('rainbow', 'Rainbow', 'rainbow qaus qazah colours weather', [100, 60], [F(band(37, 46), ROS), F(band(28, 37), AMB), F(band(19, 28), GRN), F(band(10, 19), SKY)]);
  }
  de('lantern', 'Lantern', 'lantern fanoos lalten ramadan ramzan eid light', [64, 110], [S(circle(32, 8, 5), '$1', 3), F('M18 30 L32 15 L46 30 Z'), F(rrect(13, 28, 38, 7, 2.5)),
    FS('M16 35 L48 35 L54 58 L48 80 L16 80 L10 58 Z', '$3', '$1', 3), S('M32 35 L32 80 M10 58 L54 58', '$1', 1.6, {op: 0.6}),
    F('M32 46 C36 52 38 56 38 60 C38 64 35 67 32 67 C29 67 26 64 26 60 C26 56 28 52 32 46 Z', '$2'), F(rrect(13, 79, 38, 7, 2.5)), F('M20 86 L44 86 L32 102 Z')], dc('#0f766e', AMB, '#fde68a'));
  de('squiggle', 'Squiggle', 'squiggle doodle scribble loop', [120, 60], [S(smooth([[6, 40], [22, 22], [34, 36], [28, 48], [20, 38], [38, 18], [58, 34], [52, 46], [44, 36], [62, 16], [82, 32], [76, 44], [68, 34], [86, 16], [114, 24]], false), '$1', 4.5)], D.ros);
  {
    const q = (t) => [(1 - t) ** 2 * 4 + 2 * (1 - t) * t * 100 + t * t * 196, (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 34 + t * t * 10];
    const C = ['$1', '$2', AMB, TEA], parts = [S('M4 10 Q100 34 196 10', SLA, 1.5)];
    for (let i = 0; i < 8; i++) { const a = q(0.045 + i * 0.118), b = q(0.045 + i * 0.118 + 0.1); parts.push(F(poly([a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 30]]), C[i % 4])); }
    de('bunting', 'Bunting flags', 'bunting flags jhandiyan party celebration', [200, 66], parts, dc(ROS, IND, '#ffe4e6'));
  }
  de('hanging-stars', 'Hanging stars', 'hanging stars sitare eid ramadan night', [100, 100], [S('M20 0 L20 38 M50 0 L50 62 M80 0 L80 28', '$2', 1.5),
    FS(`${star(20, 50, 13, 5.6, 5)} ${star(50, 76, 17, 7.3, 5)} ${star(80, 39, 12, 5.2, 5)}`, '$1', '$1', 2)], dc(AMB, SLA, '#fef3c7'));
}

/* ------------------------------------------------------------------ search */
const HAY = new Map();
for (const el of ELEMENTS) {
  const cat = CATEGORIES.find((c) => c.id === el.cat);
  HAY.set(el, [...new Set([...el.name.toLowerCase().split(/[^a-z0-9%]+/), ...el.tags, ...cat.label.toLowerCase().split(/[^a-z0-9%]+/), el.cat, ...el.id.split('-')].filter(Boolean))]);
}
export function searchElements(query = '', cat) {
  const pool = cat && cat !== 'all' ? ELEMENTS.filter((e) => e.cat === cat) : ELEMENTS;
  const words = String(query || '').toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  if (!words.length) return pool.slice();
  const hits = [];
  for (const el of pool) {
    const hay = HAY.get(el);
    let score = 0;
    for (const w of words) {
      const stem = w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
      let best = 0;
      for (const h of hay) best = Math.max(best, h === w || h === stem ? 3 : h.startsWith(stem) ? 2 : stem.length >= 3 && h.includes(stem) ? 1 : 0);
      if (!best) { score = -1; break; }
      score += best;
    }
    if (score > 0) hits.push([score, el]);
  }
  return hits.sort((a, b) => b[0] - a[0]).map((h) => h[1]);
}

/* ------------------------------------------------------------------ colours + SVG output */
const normHex = (v) => {
  const s = String(v).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return null;
};
// '$1'/'$2'/'$3' -> colors.c1 ?? el.defaults.c1 ?? fallback; '#rgb' -> '#rrggbb'; missing -> 'none'.
export function resolveColor(value, el, colors = {}) {
  if (value == null || value === '' || value === 'none') return 'none';
  if (isTok(value)) {
    const k = `c${value.slice(1)}`;
    return normHex(colors?.[k]) || normHex(el?.defaults?.[k]) || TOKEN_FALLBACK[k] || '#000000';
  }
  return normHex(value) || '#000000';
}
// '#rrggbb' -> [r,g,b] in 0..1 (handy for pdf-lib rgb()).
export const hexToRgb01 = (hex) => { const h = normHex(hex) || '#000000'; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]));
export const FONT_FAMILY = {sans: 'Arial, Helvetica, sans-serif', serif: '"Times New Roman", serif', mono: '"Courier New", monospace'};
export function elementSvg(el, colors = {}, px) {
  const [w, h] = el.vb;
  let W = w, H = h;
  if (px) { const s = px / Math.max(w, h); W = f(w * s); H = f(h * s); }
  const body = el.parts.map((p) => {
    if (p.t != null) {
      const fill = resolveColor(p.fill ?? '#000000', el, colors);
      return `<text x="${f(p.x)}" y="${f(p.y)}" font-size="${f(p.size)}" fill="${fill}" font-family="${esc(FONT_FAMILY[p.font] || FONT_FAMILY.sans)}"` +
        ` font-weight="${p.bold ? 'bold' : 'normal'}" font-style="${p.italic ? 'italic' : 'normal'}" text-anchor="${p.anchor || 'start'}"` +
        `${p.ls ? ` letter-spacing="${f(p.ls)}"` : ''}${p.op != null && p.op < 1 ? ` fill-opacity="${p.op}"` : ''}>${esc(p.t)}</text>`;
    }
    const fill = resolveColor(p.fill, el, colors), stroke = resolveColor(p.stroke, el, colors), op = p.op ?? 1;
    let a = `<path d="${p.d}" fill="${fill}"`;
    if (stroke !== 'none') a += ` stroke="${stroke}" stroke-width="${f(p.sw ?? 1)}" stroke-linecap="${p.cap || 'round'}" stroke-linejoin="${p.join || 'round'}"`;
    if (op < 1) a += `${fill !== 'none' ? ` fill-opacity="${op}"` : ''}${stroke !== 'none' ? ` stroke-opacity="${op}"` : ''}`;
    return `${a}/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${W}" height="${H}">${body}</svg>`;
}
