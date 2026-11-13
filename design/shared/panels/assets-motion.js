// Elements kit › Animations (animated stickers) and Videos (motion loops). All our own drawings, animated with a tiny
// description language that gives BOTH an animated SVG (SMIL, plays in <img> and in editors that keep SVG) and a still
// frame at any time t (thumbnails, posters, and the frames of a real WebM recorded on a canvas for video editors).
// Node: N(tag, attrs, {an: [{a, v, d, b, kt}], tr: [{t: translate|rotate|scale, v, d, b, kt}], c: [children]}).
//   v = values (numbers, "x y" strings, "#rrggbb" or same-shape strings), d = duration s, b = begin offset s (negative =
//   already running), kt = keyTimes (0..1). Linear interpolation, repeats forever.
// Videos are labelled honestly in the panel: "Animated loop" (our own vector motion, not filmed footage).
import { n, esc, ptsPath, starPts, heartD, ell, svgDoc, svgToDataUrl } from "./assets-svg.js";

export const N = (tag, attrs = {}, o = {}) => ({ tag, attrs, an: o.an || [], tr: o.tr || [], c: o.c || [], text: o.text });
const attrStr = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
const vs = (v) => v.map((x) => (Array.isArray(x) ? x.join(" ") : x)).join(";");
const ktStr = (kt) => (kt ? ` keyTimes="${kt.join(";")}"` : "");

function emit(node) {
  const kids = node.c.map(emit).join("") + (node.text != null ? esc(node.text) : "");
  const an = node.an.map((x) => `<animate attributeName="${x.a}" values="${esc(vs(x.v))}" dur="${n(x.d)}s" begin="${n(x.b || 0)}s"${ktStr(x.kt)} repeatCount="indefinite"/>`).join("");
  const tr = node.tr.map((x) => `<animateTransform attributeName="transform" type="${x.t}" values="${vs(x.v)}" dur="${n(x.d)}s" begin="${n(x.b || 0)}s"${ktStr(x.kt)} additive="sum" repeatCount="indefinite"/>`).join("");
  return `<${node.tag}${attrStr(node.attrs)}>${kids}${an}${tr}</${node.tag}>`;
}
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function lerp(a, b, k) {
  a = Array.isArray(a) ? a.join(" ") : String(a); b = Array.isArray(b) ? b.join(" ") : String(b);
  if (a[0] === "#" && b[0] === "#") { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join(""); }
  const nb = b.match(/-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0;
  return a.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (m) => { const y = nb[i++]; return y === undefined ? m : n(+m + (+y - +m) * k); });
}
/** Value of an animation at time t (seconds). */
export function valueAt(x, t) {
  const v = x.v, last = v.length - 1;
  if (!last) return v[0];
  let p = (((t - (x.b || 0)) / x.d) % 1 + 1) % 1;
  const kt = x.kt || v.map((_, i) => i / last);
  let i = 0; while (i < last - 1 && p > kt[i + 1]) i++;
  const span = kt[i + 1] - kt[i] || 1;
  return lerp(v[i], v[i + 1], Math.max(0, Math.min(1, (p - kt[i]) / span)));
}
function still(node, t) {
  const a = { ...node.attrs };
  for (const x of node.an) a[x.a] = valueAt(x, t);
  if (node.tr.length) a.transform = [a.transform, ...node.tr.map((x) => `${x.t}(${valueAt(x, t)})`)].filter(Boolean).join(" ");
  return `<${node.tag}${attrStr(a)}>${node.c.map((c) => still(c, t)).join("")}${node.text != null ? esc(node.text) : ""}</${node.tag}>`;
}
/** Animated SVG of a motion item. */
export const animatedSvg = (it, px) => svgDoc(it.w, it.h, it.nodes.map(emit).join(""), { px: px || Math.max(it.w, it.h) * (it.w > 200 ? 2 : 2.4), defs: it.defs || "" });
/** Still frame of a motion item at time t (default: its poster time). */
export const frameSvg = (it, t = it.poster ?? it.dur * 0.37, px) => svgDoc(it.w, it.h, it.nodes.map((x) => still(x, t)).join(""), { px: px || Math.max(it.w, it.h) * (it.w > 200 ? 2 : 2.4), defs: it.defs || "" });

// ---------- helpers for the drawings
const rnd = (s) => { let x = s >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
const G = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("")}</linearGradient>`;
const RG = (id, stops) => `<radialGradient id="${id}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("")}</radialGradient>`;
const rect = (w, h, fill) => N("rect", { width: w, height: h, fill });
const wave = (y, amp, wl, x0, x1, H) => { let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += wl) d += `Q${n(x + wl / 4)} ${n(y - amp)} ${n(x + wl / 2)} ${y}T${n(x + wl)} ${y}`; return d + `V${H}H${x0}Z`; };
const cloudD = (cx, cy, s) => ell(cx, cy, s * 1.2, s * 0.7) + ell(cx - s, cy + s * 0.2, s * 0.8, s * 0.5) + ell(cx + s, cy + s * 0.22, s * 0.85, s * 0.5);
const sparkD = (cx, cy, r) => `M${n(cx)} ${n(cy - r)}C${n(cx + r * 0.12)} ${n(cy - r * 0.12)} ${n(cx + r * 0.12)} ${n(cy - r * 0.12)} ${n(cx + r)} ${n(cy)}C${n(cx + r * 0.12)} ${n(cy + r * 0.12)} ${n(cx + r * 0.12)} ${n(cy + r * 0.12)} ${n(cx)} ${n(cy + r)}C${n(cx - r * 0.12)} ${n(cy + r * 0.12)} ${n(cx - r * 0.12)} ${n(cy + r * 0.12)} ${n(cx - r)} ${n(cy)}C${n(cx - r * 0.12)} ${n(cy - r * 0.12)} ${n(cx - r * 0.12)} ${n(cy - r * 0.12)} ${n(cx)} ${n(cy - r)}Z`;
const CONF = ["#5b4cf0", "#14b8a6", "#ff7a59", "#f59e0b", "#ec4899", "#2f80ff", "#22c55e"];

// ---------- Animations: animated stickers (100 × 100)
const S = (id, name, tags, dur, nodes, defs = "") => ({ id, name, tags: "animated animation sticker gif motion " + tags, w: 100, h: 100, dur, nodes, defs, animated: true });
const STICKERS = [
  S("bounce-ball", "Bouncing ball", "ball bounce jump", 1, [
    N("g", { transform: "translate(50 90)" }, { tr: [{ t: "scale", v: ["1 1", "0.55 0.55", "1 1"], d: 1, kt: [0, 0.5, 1] }], c: [N("ellipse", { cx: 0, cy: 0, rx: 18, ry: 4, fill: "#1b2133", "fill-opacity": 0.18 })] }),
    N("circle", { cx: 50, cy: 70, r: 16, fill: "#ff7a59" }, { tr: [{ t: "translate", v: ["0 0", "0 -48", "0 0"], d: 1, kt: [0, 0.5, 1] }] }),
  ]),
  S("heartbeat", "Beating heart", "heart love beat pulse valentine", 1.2, [N("g", { transform: "translate(50 52)" }, { tr: [{ t: "scale", v: [1, 1.16, 1, 1.1, 1], d: 1.2, kt: [0, 0.15, 0.3, 0.45, 1] }], c: [N("path", { d: heartD(-36, -34, 72, 66), fill: "#f43f5e" }), N("ellipse", { cx: -18, cy: -18, rx: 7, ry: 4, fill: "#fff", "fill-opacity": 0.55, transform: "rotate(-35 -18 -18)" })] })]),
  S("spin-star", "Spinning star", "star spin rotate rating", 3, [N("g", { transform: "translate(50 50)" }, { tr: [{ t: "rotate", v: [0, 360], d: 3 }], c: [N("path", { d: ptsPath(starPts(5, 0, 0, 42, 18)), fill: "#f59e0b" })] })]),
  S("sparkles", "Twinkling sparkles", "sparkle twinkle shine magic stars", 1.6, [[50, 46, 30, 0], [22, 24, 13, -0.5], [80, 76, 15, -1]].map(([x, y, r, b]) => N("g", { transform: `translate(${x} ${y})` }, { tr: [{ t: "scale", v: [0.4, 1, 0.4], d: 1.6, b }], an: [{ a: "opacity", v: [0.4, 1, 0.4], d: 1.6, b }], c: [N("path", { d: sparkD(0, 0, r), fill: "#8b5cf6" })] }))),
  S("smiley", "Blinking smiley", "smiley face happy emoji blink", 3, [N("circle", { cx: 50, cy: 50, r: 42, fill: "#fcd34d" }), ...[36, 64].map((x) => N("g", { transform: `translate(${x} 42)` }, { tr: [{ t: "scale", v: ["1 1", "1 1", "1 0.1", "1 1"], d: 3, kt: [0, 0.9, 0.95, 1] }], c: [N("ellipse", { cx: 0, cy: 0, rx: 5, ry: 7, fill: "#4a2f1b" })] })), N("path", { d: "M30 60Q50 80 70 60", fill: "none", stroke: "#4a2f1b", "stroke-width": 5, "stroke-linecap": "round" })]),
  S("loading-dots", "Loading dots", "loading dots wait typing progress", 1.2, [0, 1, 2].map((i) => N("circle", { cx: 26 + i * 24, cy: 50, r: 9, fill: "#5b4cf0" }, { tr: [{ t: "translate", v: ["0 0", "0 -14", "0 0", "0 0"], d: 1.2, b: -1.2 + i * 0.2, kt: [0, 0.2, 0.4, 1] }], an: [{ a: "opacity", v: [0.4, 1, 0.4, 0.4], d: 1.2, b: -1.2 + i * 0.2, kt: [0, 0.2, 0.4, 1] }] }))),
  S("pulse", "Pulse rings", "pulse ring ripple radar live", 2, [...[0, -1].map((b) => N("circle", { cx: 50, cy: 50, r: 10, fill: "none", stroke: "#14b8a6", "stroke-width": 4 }, { an: [{ a: "r", v: [10, 46], d: 2, b }, { a: "opacity", v: [1, 0], d: 2, b }] })), N("circle", { cx: 50, cy: 50, r: 11, fill: "#14b8a6" })]),
  S("arrow-bounce", "Bouncing arrow", "arrow down scroll bounce pointer", 1, [N("g", {}, { tr: [{ t: "translate", v: ["0 -6", "0 8", "0 -6"], d: 1 }], c: [N("path", { d: "M50 14V74M28 54L50 76L72 54", fill: "none", stroke: "#2f80ff", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" })] })]),
  S("new-badge", "New badge", "new badge burst label sale", 1, [N("g", { transform: "translate(50 50)" }, { tr: [{ t: "rotate", v: [-7, 7, -7], d: 1 }, { t: "scale", v: [1, 1.06, 1], d: 0.5 }], c: [N("path", { d: ptsPath(starPts(16, 0, 0, 46, 38)), fill: "#ff7a59" }), N("text", { x: 0, y: 8, "font-family": "Arial, Helvetica, sans-serif", "font-size": 22, "font-weight": "bold", fill: "#fff", "text-anchor": "middle" }, { text: "NEW" })] })]),
  S("sun", "Shining sun", "sun summer weather sunny rays", 2, [N("g", { transform: "translate(50 50)" }, { tr: [{ t: "rotate", v: [0, 30], d: 2 }], c: [N("path", { d: Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return `M${n(Math.cos(a) * 30)} ${n(Math.sin(a) * 30)}L${n(Math.cos(a) * 44)} ${n(Math.sin(a) * 44)}`; }).join(""), stroke: "#f59e0b", "stroke-width": 6, "stroke-linecap": "round" })] }), N("circle", { cx: 50, cy: 50, r: 22, fill: "#fcd34d" }, { an: [{ a: "r", v: [22, 24, 22], d: 2 }] })]),
  S("rain-cloud", "Rain cloud", "rain cloud weather rainy drops", 1, [...[30, 46, 62, 76].map((x, i) => N("path", { d: `M${x} 58L${x - 3} 68`, stroke: "#2f80ff", "stroke-width": 4, "stroke-linecap": "round" }, { tr: [{ t: "translate", v: ["0 0", "-4 26"], d: 1, b: -i * 0.25 }], an: [{ a: "opacity", v: [1, 0], d: 1, b: -i * 0.25 }] })), N("path", { d: cloudD(52, 40, 18), fill: "#94a3b8" })]),
  S("confetti-pop", "Confetti pop", "confetti party celebration pop burst", 1.6, Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, r = rnd(i + 7)(); return N("rect", { x: -3, y: -5, width: 6, height: 10, rx: 1.5, fill: CONF[i % CONF.length], transform: "translate(50 54)" }, { tr: [{ t: "translate", v: ["0 0", `${n(Math.cos(a) * (34 + r * 10))} ${n(Math.sin(a) * (34 + r * 10) - 6)}`], d: 1.6, kt: [0, 1] }, { t: "rotate", v: [0, 300], d: 1.6 }], an: [{ a: "opacity", v: [1, 1, 0], d: 1.6, kt: [0, 0.6, 1] }] }); })),
  S("check-draw", "Check mark", "check tick done success complete", 2, [N("circle", { cx: 50, cy: 50, r: 42, fill: "#22c55e" }), N("path", { d: "M30 52L44 66L72 36", fill: "none", stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 64 }, { an: [{ a: "stroke-dashoffset", v: [64, 0, 0, 64], d: 2, kt: [0, 0.35, 0.9, 1] }] })]),
  S("clock", "Ticking clock", "clock time hour deadline", 4, [N("circle", { cx: 50, cy: 50, r: 42, fill: "#fff", stroke: "#1b2133", "stroke-width": 5 }), N("path", { d: Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return `M${n(50 + Math.cos(a) * 33)} ${n(50 + Math.sin(a) * 33)}L${n(50 + Math.cos(a) * 37)} ${n(50 + Math.sin(a) * 37)}`; }).join(""), stroke: "#1b2133", "stroke-width": 3, "stroke-linecap": "round" }), N("path", { d: "M50 50V28", stroke: "#1b2133", "stroke-width": 5, "stroke-linecap": "round" }, { tr: [{ t: "rotate", v: ["0 50 50", "360 50 50"], d: 48 }] }), N("path", { d: "M50 50V20", stroke: "#ff7a59", "stroke-width": 3, "stroke-linecap": "round" }, { tr: [{ t: "rotate", v: ["0 50 50", "360 50 50"], d: 4 }] }), N("circle", { cx: 50, cy: 50, r: 4, fill: "#1b2133" })]),
  S("flame", "Flickering flame", "fire flame hot burn trending", 0.8, [N("g", { transform: "translate(50 92)" }, { tr: [{ t: "scale", v: ["1 1", "0.96 1.07", "1.03 0.96", "1 1"], d: 0.8 }], c: [N("path", { d: "M0 0C-26 0 -32 -22 -22 -40C-16 -50 -6 -56 -4 -80C10 -66 30 -50 26 -24C24 -8 16 0 0 0Z", fill: "#f97316" }), N("path", { d: "M0 0C-12 0 -16 -10 -12 -20C-8 -28 -2 -32 0 -44C8 -36 16 -26 13 -14C11 -5 7 0 0 0Z", fill: "#fde047" })] })]),
  S("bell", "Ringing bell", "bell notification ring alert", 1, [N("g", { transform: "translate(50 16)" }, { tr: [{ t: "rotate", v: [-16, 16, -16], d: 1 }], c: [N("path", { d: "M0 2C-20 2 -26 20 -26 40C-26 54 -32 60 -36 64H36C32 60 26 54 26 40C26 20 20 2 0 2Z", fill: "#f59e0b" }), N("circle", { cx: 0, cy: 72, r: 8, fill: "#b45309" }), N("circle", { cx: 0, cy: 0, r: 5, fill: "#b45309" })] })]),
  S("shooting-star", "Shooting star", "shooting star wish night comet", 2, [N("g", {}, { tr: [{ t: "translate", v: ["-30 30", "30 -30"], d: 2 }], an: [{ a: "opacity", v: [0, 1, 1, 0], d: 2, kt: [0, 0.2, 0.8, 1] }], c: [N("path", { d: "M14 86L52 48", stroke: "#fcd34d", "stroke-width": 6, "stroke-linecap": "round", "stroke-opacity": 0.5 }), N("path", { d: ptsPath(starPts(5, 60, 40, 16, 7)), fill: "#fcd34d" })] })]),
  S("music-notes", "Music notes", "music notes song melody sound", 2, [[34, 0, "#5b4cf0"], [64, -1, "#ec4899"]].map(([x, b, col]) => N("g", { transform: `translate(${x} 70)` }, { tr: [{ t: "translate", v: ["0 0", "6 -44"], d: 2, b }], an: [{ a: "opacity", v: [0, 1, 1, 0], d: 2, b, kt: [0, 0.15, 0.7, 1] }], c: [N("ellipse", { cx: 0, cy: 10, rx: 8, ry: 6, fill: col, transform: "rotate(-20 0 10)" }), N("path", { d: "M7 8V-22L22 -16", fill: "none", stroke: col, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" })] }))),
];

// ---------- Videos: animated motion loops (320 × 180, 4 s, seamless)
const V = (id, name, tags, nodes, defs = "", extra = {}) => ({ id, name, tags: "video loop motion background animated " + tags, w: 320, h: 180, dur: 4, nodes, defs, animated: true, ...extra });
function field(count, seed, make) { const r = rnd(seed); return Array.from({ length: count }, (_, i) => make(i, r)); }
const VIDEOS = [
  V("ocean", "Ocean waves", "ocean sea waves water beach calm", [
    rect(320, 180, "url(#sky)"), N("circle", { cx: 236, cy: 62, r: 22, fill: "#ffe3a3" }),
    ...[[96, 6, 80, "#7cc6e8", 4], [118, 7, 100, "#3a9ad0", 2], [140, 8, 80, "#1f6fae", 4 / 3]].map(([y, a, wl, c, d]) => N("path", { d: wave(y, a, wl, -wl, 320 + wl, 180), fill: c }, { tr: [{ t: "translate", v: ["0 0", `${-wl} 0`], d }] })),
  ], G("sky", [[0, "#ffd9c2"], [0.55, "#ffeedd"], [1, "#d7f0ff"]])),
  V("starry-night", "Starry night", "night stars sky moon twinkle space", [
    rect(320, 180, "url(#sky)"), N("path", { d: "M262 30A20 20 0 1 0 282 58A16 16 0 1 1 262 30Z", fill: "#fff3c4" }),
    ...field(34, 3, (i, r) => N("circle", { cx: n(r() * 320), cy: n(r() * 150), r: n(0.6 + r() * 1.6), fill: "#fff" }, { an: [{ a: "opacity", v: [0.25, 1, 0.25], d: [1, 2, 4][i % 3], b: -n(r() * 4) }] })),
    N("path", { d: "M0 0L-34 -10", stroke: "#fff", "stroke-width": 2, "stroke-linecap": "round" }, { tr: [{ t: "translate", v: ["90 20", "230 62"], d: 4, kt: [0, 1] }], an: [{ a: "opacity", v: [0, 0, 1, 0], d: 4, kt: [0, 0.6, 0.75, 1] }] }),
    N("path", { d: "M0 180V150Q60 132 120 148T240 140T320 150V180Z", fill: "#0b1024" }),
  ], G("sky", [[0, "#0b1440"], [1, "#3b2a6d"]])),
  V("bubbles", "Floating bubbles", "bubbles water underwater rise soda", [rect(320, 180, "url(#bg)"), ...field(16, 5, (i, r) => { const x = n(10 + r() * 300), s = n(4 + r() * 12); return N("circle", { cx: x, cy: 200, r: s, fill: "#fff", "fill-opacity": 0.18, stroke: "#fff", "stroke-opacity": 0.75, "stroke-width": 1.4 }, { tr: [{ t: "translate", v: ["0 0", `${n((r() - 0.5) * 30)} -230`], d: i % 2 ? 4 : 2, b: -n(r() * 4) }] }); })], G("bg", [[0, "#2dd4bf"], [1, "#0e7490"]])),
  V("aurora", "Colour blobs", "gradient blobs aurora abstract colourful soft", [rect(320, 180, "#1b1340"), ...[[80, 70, "#8b5cf6", "60 20"], [230, 60, "#14b8a6", "-50 40"], [170, 140, "#ec4899", "40 -40"], [40, 150, "#2f80ff", "50 -10"]].map(([x, y, c, m], i) => N("circle", { cx: x, cy: y, r: 90, fill: `url(#b${i})` }, { tr: [{ t: "translate", v: ["0 0", m, "0 0"], d: 4 }] }))], [0, 1, 2, 3].map((i) => RG(`b${i}`, [[0, ["#8b5cf6", "#14b8a6", "#ec4899", "#2f80ff"][i], 0.85], [1, ["#8b5cf6", "#14b8a6", "#ec4899", "#2f80ff"][i], 0]])).join("")),
  V("snow", "Snowfall", "snow winter snowflakes cold christmas", [rect(320, 180, "url(#bg)"), N("path", { d: "M0 180V150Q80 128 160 146T320 140V180Z", fill: "#fff" }), ...field(44, 9, (i, r) => N("circle", { cx: n(r() * 320), cy: -10, r: n(1 + r() * 2.4), fill: "#fff" }, { tr: [{ t: "translate", v: ["0 0", `${n((r() - 0.5) * 40)} 200`], d: i % 3 ? 4 : 2, b: -n(r() * 4) }] }))], G("bg", [[0, "#5b7ab8"], [1, "#b8c9e8"]])),
  V("rain", "Rain", "rain rainy storm drops weather", [rect(320, 180, "url(#bg)"), ...field(46, 11, (i, r) => { const x = n(r() * 340); return N("path", { d: `M${x} -20L${n(+x - 6)} -2`, stroke: "#c7d6ea", "stroke-width": 1.3, "stroke-linecap": "round", "stroke-opacity": 0.8 }, { tr: [{ t: "translate", v: ["0 0", "-22 210"], d: i % 2 ? 1 : 0.5, b: -n(r() * 2) }] }); })], G("bg", [[0, "#2a3446"], [1, "#56637b"]])),
  V("sunrise", "Sunrise", "sunrise sun morning dawn warm hills", [rect(320, 180, "url(#sky)"), N("g", { transform: "translate(160 112)" }, { tr: [{ t: "rotate", v: [0, 30], d: 4 }], c: [N("path", { d: Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return `M${n(Math.cos(a) * 40)} ${n(Math.sin(a) * 40)}L${n(Math.cos(a) * 70)} ${n(Math.sin(a) * 70)}`; }).join(""), stroke: "#fff3c4", "stroke-width": 5, "stroke-linecap": "round", "stroke-opacity": 0.7 })] }), N("circle", { cx: 160, cy: 112, r: 32, fill: "#ffd166" }, { an: [{ a: "r", v: [32, 35, 32], d: 4 }] }), N("path", { d: "M0 180V128Q80 104 160 126T320 118V180Z", fill: "#f29e6d" }), N("path", { d: "M0 180V148Q100 128 200 148T320 144V180Z", fill: "#c2614b" })], G("sky", [[0, "#ff9a8b"], [0.6, "#ffd3a5"], [1, "#fff1d6"]])),
  // Each layer: clouds every `per` px moving left by `per` per loop, so the loop has no jump.
  V("clouds", "Drifting clouds", "clouds sky blue drift calm day", [rect(320, 180, "url(#sky)"), N("circle", { cx: 260, cy: 40, r: 18, fill: "#fff3c4" }), ...[[110, 34, 8, 0.55], [160, 70, 12, 0.8], [320, 116, 20, 1]].map(([per, y, s, op]) => N("g", {}, { tr: [{ t: "translate", v: ["0 0", `${-per} 0`], d: 4 }], c: Array.from({ length: Math.ceil(320 / per) + 2 }, (_, k) => N("path", { d: cloudD(40 + k * per, y, s), fill: "#fff", "fill-opacity": op })) })), N("path", { d: "M0 180V160Q80 146 160 158T320 154V180Z", fill: "#7cc7a4" })], G("sky", [[0, "#5ea8f2"], [1, "#cde6ff"]])),
  V("confetti", "Confetti shower", "confetti party celebration birthday falling", [rect(320, 180, "#fff8ef"), ...field(40, 13, (i, r) => { const x = n(r() * 320), c = CONF[i % CONF.length]; return N("g", { transform: `translate(${x} -12)` }, { tr: [{ t: "translate", v: ["0 0", `${n((r() - 0.5) * 50)} 200`], d: i % 2 ? 4 : 2, b: -n(r() * 4) }], c: [N("rect", { x: -3, y: -5, width: 6, height: 10, rx: 1.5, fill: c }, { tr: [{ t: "rotate", v: [0, 360], d: i % 3 ? 2 : 1 }] })] }); })]),
  V("bokeh", "Bokeh lights", "bokeh lights glow blur party night city", [rect(320, 180, "#140d2b"), ...field(20, 17, (i, r) => N("circle", { cx: n(r() * 320), cy: n(r() * 180), r: n(10 + r() * 22), fill: `url(#b${i % 4})` }, { an: [{ a: "opacity", v: [0.3, 0.95, 0.3], d: [2, 4][i % 2], b: -n(r() * 4) }], tr: [{ t: "translate", v: ["0 0", `${n((r() - 0.5) * 20)} ${n((r() - 0.5) * 20)}`, "0 0"], d: 4 }] }))], ["#f59e0b", "#ec4899", "#8b5cf6", "#22d3ee"].map((c, i) => RG(`b${i}`, [[0, c, 0.9], [0.6, c, 0.35], [1, c, 0]])).join("")),
  V("neon-grid", "Neon grid", "retro neon grid synthwave 80s sun", (() => { const ys = [104, 108, 114, 122, 133, 148, 168, 196]; return [rect(320, 180, "url(#bg)"), N("circle", { cx: 160, cy: 92, r: 46, fill: "url(#sun)" }),N("rect", { y: 100, width: 320, height: 80, fill: "#1a0636" }), N("path", { d: Array.from({ length: 17 }, (_, i) => `M${160 + (i - 8) * 6} 100L${160 + (i - 8) * 60} 180`).join(""), stroke: "#ff4fd8", "stroke-width": 1.2, "stroke-opacity": 0.8 }), ...ys.slice(0, -1).map((y, i) => N("line", { x1: 0, x2: 320, y1: y, y2: y, stroke: "#ff4fd8", "stroke-width": 1.4 }, { an: [{ a: "y1", v: [y, ys[i + 1]], d: 1 }, { a: "y2", v: [y, ys[i + 1]], d: 1 }] }))]; })(), G("bg", [[0, "#2b0b52"], [1, "#ff6ec7"]]) + G("sun", [[0, "#ffe66d"], [1, "#ff3d81"]])),
  V("city-night", "City at night", "city night skyline buildings windows lights", (() => { const r = rnd(21), out = [rect(320, 180, "url(#sky)"), N("circle", { cx: 264, cy: 36, r: 14, fill: "#fff3c4" })]; let x = 0; while (x < 320) { const w = 26 + r() * 30, h = 50 + r() * 90; out.push(N("rect", { x: n(x), y: n(180 - h), width: n(w), height: n(h), fill: "#161a2e" })); for (let wy = 180 - h + 8; wy < 172; wy += 12) for (let wx = x + 5; wx < x + w - 7; wx += 9) if (r() > 0.45) out.push(N("rect", { x: n(wx), y: n(wy), width: 4, height: 6, fill: "#ffd166" }, r() > 0.75 ? { an: [{ a: "opacity", v: [1, 1, 0.15, 0.15, 1], d: 4, b: -n(r() * 4), kt: [0, 0.45, 0.5, 0.95, 1] }] } : {})); x += w + 2; } return out; })(), G("sky", [[0, "#0f1535"], [1, "#4b3a7a"]])),
  V("flow-lines", "Flowing lines", "abstract lines flow waves modern clean", [rect(320, 180, "#fbfaff"), ...[0, 1, 2, 3, 4, 5].map((i) => N("path", { d: `M-10 ${60 + i * 12}C80 ${10 + i * 20} 180 ${150 - i * 10} 330 ${70 + i * 14}`, fill: "none", stroke: ["#5b4cf0", "#8b5cf6", "#14b8a6", "#2f80ff", "#ec4899", "#f59e0b"][i], "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "120 60" }, { an: [{ a: "stroke-dashoffset", v: [0, -180], d: [4, 2][i % 2] }] }))]),
  V("fireflies", "Fireflies", "fireflies forest dusk night glow nature", [rect(320, 180, "url(#sky)"), N("path", { d: "M0 180V120L18 90L34 120L52 70L72 120L90 96L108 130H130L150 84L172 128L196 100L214 130L240 78L262 126L284 104L302 130L320 110V180Z", fill: "#0c2a24" }), ...field(18, 23, (i, r) => N("circle", { cx: n(20 + r() * 280), cy: n(60 + r() * 100), r: 3, fill: "url(#ff)" }, { tr: [{ t: "translate", v: ["0 0", `${n((r() - 0.5) * 30)} ${n((r() - 0.5) * 24)}`, `${n((r() - 0.5) * 30)} ${n((r() - 0.5) * 24)}`, "0 0"], d: 4 }], an: [{ a: "r", v: [2, 5, 2], d: [2, 4][i % 2], b: -n(r() * 4) }, { a: "opacity", v: [0.4, 1, 0.4], d: [2, 4][i % 2], b: -n(r() * 4) }] }))], G("sky", [[0, "#173b4d"], [1, "#1f5c4a"]]) + RG("ff", [[0, "#fdffb6"], [0.5, "#e8ff6b", 0.7], [1, "#e8ff6b", 0]])),
  V("rings", "Rotating rings", "rings circles tech abstract rotate loading", [rect(320, 180, "#0e1330"), ...[[30, 4, "#22d3ee", 1], [46, 6, "#8b5cf6", -1], [62, 3, "#ec4899", 1], [78, 8, "#2f80ff", -1]].map(([r, dash, c, dir]) => N("circle", { cx: 160, cy: 90, r, fill: "none", stroke: c, "stroke-width": 3, "stroke-dasharray": `${dash * 3} ${dash * 2}`, "stroke-linecap": "round" }, { tr: [{ t: "rotate", v: ["0 160 90", `${dir * 360} 160 90`], d: 4 }] })), N("circle", { cx: 160, cy: 90, r: 14, fill: "#22d3ee" }, { an: [{ a: "opacity", v: [0.5, 1, 0.5], d: 2 }] })]),
  V("fireworks", "Fireworks", "fireworks celebration new year night party eid", [rect(320, 180, "url(#sky)"), ...[[80, 64, "#f59e0b", 0], [210, 50, "#ec4899", -0.7], [262, 104, "#22d3ee", -1.4], [140, 96, "#a3e635", -2.1]].map(([x, y, c, b]) => N("g", { transform: `translate(${x} ${y})` }, { tr: [{ t: "scale", v: [0.1, 1, 1.1], d: 2, b, kt: [0, 0.6, 1] }], an: [{ a: "opacity", v: [0, 1, 0], d: 2, b, kt: [0, 0.15, 1] }], c: [N("path", { d: Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return `M${n(Math.cos(a) * 12)} ${n(Math.sin(a) * 12)}L${n(Math.cos(a) * 34)} ${n(Math.sin(a) * 34)}`; }).join(""), stroke: c, "stroke-width": 2.6, "stroke-linecap": "round" })] })), N("path", { d: "M0 180V160H40V150H70V162H110V146H150V158H200V150H240V164H280V152H320V180Z", fill: "#0a0e22" })], G("sky", [[0, "#0a0e2a"], [1, "#2a1f5c"]])),
];

export const STICKER_ITEMS = STICKERS;
export const VIDEO_ITEMS = VIDEOS;

// ---------- recording a motion loop as a real WebM (for editors whose insert adapter takes video files)
export const canRecord = () => typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined" && !!HTMLCanvasElement.prototype.captureStream;
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("frame failed")); i.src = src; });
const nextFrame = () => new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; globalThis.requestAnimationFrame?.(go); setTimeout(go, 34); });
const blobToDataUrl = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
const CACHE = new Map();
/** Records one loop (it.dur seconds, real time) of a motion item to a WebM data URL. Cached per item. */
export function recordWebm(it, { width = 640, fps = 30 } = {}) {
  if (CACHE.has(it.id)) return CACHE.get(it.id);
  const p = (async () => {
    if (!canRecord()) throw new Error("This browser cannot record video.");
    const h = Math.round((width * it.h) / it.w), cv = document.createElement("canvas"); cv.width = width; cv.height = h;
    const g = cv.getContext("2d");
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "video/webm";
    const draw = async (t) => { const img = await loadImg(svgToDataUrl(frameSvg(it, t, width))); g.drawImage(img, 0, 0, width, h); };
    await draw(0);
    const rec = new MediaRecorder(cv.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 1_800_000 });
    const chunks = []; rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start(200);
    const t0 = performance.now();
    for (;;) { const t = (performance.now() - t0) / 1000; if (t >= it.dur) break; await draw(t); await nextFrame(); }
    await draw(it.dur);
    rec.stop(); await stopped;
    if (!chunks.length) throw new Error("Recording gave no data.");
    return blobToDataUrl(new Blob(chunks, { type: "video/webm" }));
  })();
  CACHE.set(it.id, p);
  p.catch(() => CACHE.delete(it.id));
  return p;
}
