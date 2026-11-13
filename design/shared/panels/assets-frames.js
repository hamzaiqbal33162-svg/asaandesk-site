// Elements kit › Frames (Basic shapes, Film and photo, Devices, Paper) and Grids. Our own drawings.
// Frame item spec = the insert interface's frame spec: {shape (Studio frame name when it matches: rect, rounded, circle,
// heart, star, hexagon, triangle, diamond, arch, blob), d + vb (the fillable outline), holes [[x, y, w, h, r]] (several
// fillable windows: film strips, photo booth), device + screen [x, y, w, h] (0..1 of the frame: the device's fillable
// screen), under / over (SVG fragments drawn below / above the photo: card, bezel, tape, sprockets), name}.
// Grid item spec: {cells: [[x, y, w, h]] in 0..1 of the page, gap, name}.
import { n, ptsPath, regPoly, starPts, rrect, ell, heartD, blobD } from "./assets-svg.js";

const B = (id, name, tags, shape, d, vb = [100, 100]) => ({ id, name, tags: "frame photo " + tags, spec: { shape, d, vb } });
const scallop = (cx, cy, R, k, depth) => { let d = ""; for (let i = 0; i < k; i++) { const a0 = (i / k) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / k) * Math.PI * 2 - Math.PI / 2, am = (a0 + a1) / 2; const p = (a, r) => `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`; d += (i ? "" : `M${p(a0, R - depth)}`) + `Q${p(am, R + depth * 1.4)} ${p(a1, R - depth)}`; } return d + "Z"; };

const BASIC = [
  B("square", "Square", "square", "rect", rrect(0, 0, 100, 100)),
  B("rounded", "Rounded square", "rounded square", "rounded", rrect(0, 0, 100, 100, 16)),
  B("circle", "Circle", "circle round", "circle", ell(50, 50, 50)),
  B("triangle", "Triangle", "triangle", "triangle", ptsPath([[50, 0], [100, 100], [0, 100]])),
  B("heart", "Heart", "heart love", "heart", heartD(0, 0, 100, 92), [100, 92]),
  B("star", "Star", "star", "star", ptsPath(starPts(5, 50, 52, 50, 22))),
  B("hexagon", "Hexagon", "hexagon", "hexagon", ptsPath(regPoly(6, 50, 50, 50))),
  B("diamond", "Diamond", "diamond", "diamond", ptsPath([[50, 0], [100, 50], [50, 100], [0, 50]])),
  B("arch", "Arch", "arch window", "arch", "M0 130V50A50 50 0 0 1 100 50V130Z", [100, 130]),
  B("blob", "Blob", "blob organic", "blob", blobD(50, 50, 48, 2.3, 7)),
  B("oval", "Oval", "oval portrait ellipse", "path", ell(40, 55, 40, 55), [80, 110]),
  B("landscape", "Landscape", "landscape wide rectangle 16:9", "path", rrect(0, 0, 160, 90), [160, 90]),
  B("pentagon", "Pentagon", "pentagon", "path", ptsPath(regPoly(5, 50, 52.6, 52.6))),
  B("flower", "Flower", "flower scalloped badge", "path", scallop(50, 50, 44, 10, 5)),
  B("cloud", "Cloud", "cloud", "path", "M30 90C12 90 0 78 0 62C0 47 12 36 27 37C30 18 46 6 64 9C78 11 88 22 91 35C108 33 124 45 124 63C124 78 112 90 96 90Z", [124, 90]),
  B("bubble", "Speech bubble", "speech bubble chat", "path", rrect(0, 0, 140, 90, 18) + "M24 86L52 88L16 116Z", [140, 116]),
  B("pill", "Pill", "pill capsule", "path", rrect(0, 0, 70, 130, 35), [70, 130]),
];

const card = (w, h, fill = "#fff", stroke = "#dfe1ea") => `<rect x=".6" y=".6" width="${n(w - 1.2)}" height="${n(h - 1.2)}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
const sprockets = (w, y0, y1, step = 10) => { let s = ""; for (let x = 4; x < w - 4; x += step) s += `<rect x="${n(x)}" y="${n(y0)}" width="5" height="4" rx="1" fill="#f3f3f6"/><rect x="${n(x)}" y="${n(y1)}" width="5" height="4" rx="1" fill="#f3f3f6"/>`; return s; };
const H = (holes) => holes.map(([x, y, w, h, r]) => rrect(x, y, w, h, r || 0)).join("");
// Decorated frames (film, instant photo, devices) as adapters expect them: device + screen [x, y, w, h] (0..1, the
// first window), screens (every window), svg = the decoration drawing (card, strip, bezel) without the photo.
const decorated = (vb, holes, under, over) => {
  const rel = (h) => [h[0] / vb[0], h[1] / vb[1], h[2] / vb[0], h[3] / vb[1]].map((v) => Math.round(v * 10000) / 10000);
  return { vb, holes, d: H(holes), under, over, screen: rel(holes[0]), screens: holes.map(rel), screenRadius: holes[0][4] || 0, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb[0]} ${vb[1]}" width="${vb[0] * 3}" height="${vb[1] * 3}">${under}${over}</svg>` };
};
const film = (id, name, tags, vb, holes, under, over = "") => ({ id, name, tags: "frame photo film " + tags, spec: { shape: "path", device: id, ...decorated(vb, holes, under, over) } });
const strip = (k) => { const w = 14 + k * 66, holes = Array.from({ length: k }, (_, i) => [10 + i * 66, 14, 60, 52]); return film(`film-${k}`, `Film strip, ${k} frames`, "strip negative cinema movie", [w, 80], holes, `<rect width="${w}" height="80" fill="#1f2230"/>` + sprockets(w, 4, 72)); };
const FILM = [
  film("instant", "Instant photo", "instant polaroid print snapshot", [100, 122], [[8, 8, 84, 84]], card(100, 122)),
  film("instant-wide", "Wide instant photo", "instant wide polaroid print", [140, 112], [[8, 8, 124, 80]], card(140, 112)),
  strip(3), strip(2),
  film("booth", "Photo booth strip", "photo booth strip vertical", [70, 214], [[7, 7, 56, 56], [7, 69, 56, 56], [7, 131, 56, 56]], card(70, 214)),
  film("slide", "Slide mount", "slide mount 35mm transparency", [100, 100], [[20, 26, 60, 48, 3]], `<rect x="1" y="1" width="98" height="98" rx="10" fill="#f4efe4" stroke="#d9d0bd" stroke-width="1.5"/>`),
  film("taped", "Taped photo", "taped photo scrapbook tape", [100, 112], [[8, 10, 84, 84]], card(100, 112), `<path d="M-2 4L20 -6L28 10L6 20Z" fill="#f2df9a" fill-opacity=".85"/><path d="M80 -6L102 4L94 20L72 10Z" fill="#f2df9a" fill-opacity=".85"/>`),
  film("classic-print", "Classic print", "classic print border vintage", [110, 90], [[9, 9, 92, 72]], card(110, 90, "#fbf8f1", "#e3dccb") + `<rect x="6" y="6" width="98" height="78" fill="none" stroke="#d8cfba" stroke-width=".8"/>`),
  film("negative", "Film negative", "film negative amber vintage", [146, 66], [[8, 12, 62, 42], [76, 12, 62, 42]], `<rect width="146" height="66" fill="#8a4a1d"/>` + sprockets(146, 3, 59, 9)),
];

// Devices: screen [x, y, w, h] in 0..1 of the frame is the fillable photo (the lead's adapter convention).
const dev = (id, name, tags, vb, scr, r, under, over = "") => ({ id, name, tags: "frame device mockup screen " + tags, spec: { shape: "path", device: id, ...decorated(vb, [[...scr, r]], under, over) } });
const DARK = "#1d2030", METAL = "#c9ccd6";
const DEVICES = [
  dev("phone", "Phone", "phone mobile smartphone", [62, 124], [4, 9, 54, 106], 5, `<rect x="0" y="0" width="62" height="124" rx="11" fill="${DARK}"/>`, `<rect x="23" y="4" width="16" height="3.4" rx="1.7" fill="#3a3f52"/>`),
  dev("desktop", "Desktop", "desktop monitor computer imac", [160, 132], [6, 6, 148, 86], 1, `<rect width="160" height="104" rx="7" fill="${DARK}"/><path d="M68 104H92L96 124H64Z" fill="${METAL}"/><rect x="48" y="122" width="64" height="8" rx="3" fill="#b9bdc9"/>`, `<rect x="0" y="92" width="160" height="12" fill="#e8e9ef"/>`),
  dev("tablet", "Tablet", "tablet ipad", [104, 136], [7, 9, 90, 118], 3, `<rect width="104" height="136" rx="10" fill="${DARK}"/>`, `<circle cx="52" cy="4.6" r="1.4" fill="#3a3f52"/>`),
  dev("laptop", "Laptop", "laptop notebook macbook", [184, 114], [24, 7, 136, 86], 1, `<rect x="18" y="0" width="148" height="100" rx="7" fill="${DARK}"/><path d="M0 100H184L176 112H8Z" fill="${METAL}"/>`, `<rect x="78" y="100" width="28" height="3" rx="1.5" fill="#a6aab8"/>`),
  dev("watch", "Smartwatch", "watch smartwatch wrist", [70, 112], [11, 31, 48, 50], 10, `<rect x="16" y="0" width="38" height="30" rx="5" fill="#3a3f52"/><rect x="16" y="82" width="38" height="30" rx="5" fill="#3a3f52"/><rect x="5" y="25" width="60" height="62" rx="17" fill="${DARK}"/>`, `<rect x="65" y="44" width="4" height="12" rx="2" fill="#3a3f52"/>`),
  dev("browser", "Browser window", "browser window website web page", [160, 112], [1, 18, 158, 93], 0, `<rect x=".6" y=".6" width="158.8" height="110.8" rx="7" fill="#fff" stroke="#d8dbe6" stroke-width="1.2"/><path d="M1 8A7 7 0 0 1 8 1H152A7 7 0 0 1 159 8V18H1Z" fill="#eef0f6"/><circle cx="9" cy="9.5" r="2.3" fill="#ff7a59"/><circle cx="16" cy="9.5" r="2.3" fill="#f59e0b"/><circle cx="23" cy="9.5" r="2.3" fill="#22c55e"/><rect x="36" y="5.5" width="96" height="8" rx="4" fill="#fff"/>`),
  dev("phone-landscape", "Phone, landscape", "phone landscape horizontal mobile", [124, 62], [9, 4, 106, 54], 5, `<rect width="124" height="62" rx="11" fill="${DARK}"/>`),
  dev("tv", "TV screen", "tv television display screen", [170, 112], [5, 5, 160, 90], 1, `<rect width="170" height="100" rx="4" fill="${DARK}"/><path d="M30 100L22 112H34L42 100ZM140 100L148 112H136L128 100Z" fill="#3a3f52"/>`),
];

// Paper: torn and cut edges (deterministic jitter, so every copy is the same).
const jit = (i, s) => Math.sin(i * 12.9898 + s * 78.233) * 43758.5453 % 1;
function torn(w, h, edges, s = 1, amp = 4, step = 7) {
  const pts = [];
  const edge = (x0, y0, x1, y1, on, nx, ny) => { const L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.round(L / step)); for (let i = 0; i < k; i++) { const t = i / k, j = on ? Math.abs(jit(i + x0 + y0, s)) * amp : 0; pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]); } };
  edge(0, 0, w, 0, edges.includes("t"), 0, 1); edge(w, 0, w, h, edges.includes("r"), -1, 0); edge(w, h, 0, h, edges.includes("b"), 0, -1); edge(0, h, 0, 0, edges.includes("l"), 1, 0);
  return ptsPath(pts);
}
const stamp = (w, h, r = 3.2) => { let d = `M0 0`; const k = Math.round(w / (r * 3)), m = Math.round(h / (r * 3)), sx = w / k, sy = h / m; for (let i = 0; i < k; i++) d += `H${n(i * sx + sx / 2 - r)}A${r} ${r} 0 0 0 ${n(i * sx + sx / 2 + r)} 0`; d += `H${w}`; for (let i = 0; i < m; i++) d += `V${n(i * sy + sy / 2 - r)}A${r} ${r} 0 0 0 ${w} ${n(i * sy + sy / 2 + r)}`; d += `V${h}`; for (let i = k - 1; i >= 0; i--) d += `H${n(i * sx + sx / 2 + r)}A${r} ${r} 0 0 0 ${n(i * sx + sx / 2 - r)} ${h}`; d += "H0"; for (let i = m - 1; i >= 0; i--) d += `V${n(i * sy + sy / 2 + r)}A${r} ${r} 0 0 0 0 ${n(i * sy + sy / 2 - r)}`; return d + "Z"; };
const P = (id, name, tags, d, vb, over = "") => ({ id, name, tags: "frame paper " + tags, spec: { shape: "path", d, vb, over } });
const PAPER = [
  P("torn-top-bottom", "Torn paper", "torn ripped edges", torn(100, 120, "tb", 1, 6), [100, 120]),
  P("torn-strip", "Ripped strip", "torn ripped strip banner", torn(160, 60, "tb", 2, 5, 6), [160, 60]),
  P("torn-all", "Torn square", "torn deckle all edges", torn(100, 100, "trbl", 3, 4, 6), [100, 100]),
  P("torn-bottom", "Torn page", "torn page notebook bottom", torn(100, 130, "b", 4, 7), [100, 130]),
  P("note-fold", "Folded note", "note folded corner page dog ear", ptsPath([[0, 0], [100, 0], [100, 96], [80, 116], [0, 116]]), [100, 116], `<path d="M100 96L80 116V96Z" fill="#e6e1d3" stroke="#d2cbb8" stroke-width=".8"/>`),
  P("stamp", "Postage stamp", "stamp postage perforated", stamp(96, 116), [96, 116]),
  P("ticket", "Ticket", "ticket admit coupon stub", "M0 0H150V34A10 10 0 0 0 150 54V88H0V54A10 10 0 0 0 0 34Z", [150, 88]),
];

// Flowers, blobs and retro edges: one smooth outline each (polar curves), so every editor gets a single fillable shape.
const polar = (fn, cx = 50, cy = 50, k = 180, sx = 1, sy = 1) => ptsPath(Array.from({ length: k }, (_, i) => { const a = (i / k) * Math.PI * 2 - Math.PI / 2, r = fn(a); return [cx + r * Math.cos(a) * sx, cy + r * Math.sin(a) * sy]; }));
const Fp = (id, name, tags, d, vb = [100, 100], over = "") => ({ id, name, tags: "frame photo " + tags, spec: { shape: "path", d, vb, over } });
const FLOWERS = [
  Fp("flower-5", "Five petals", "flower petals five blossom", polar((a) => 29 + 20 * Math.abs(Math.cos(2.5 * a)))),
  Fp("flower-6", "Six petals", "flower petals six blossom", polar((a) => 31 + 18 * Math.abs(Math.cos(3 * a)))),
  Fp("flower-8", "Eight petals", "flower petals eight blossom", polar((a) => 34 + 15 * Math.abs(Math.cos(4 * a)))),
  Fp("daisy", "Daisy", "flower daisy petals", polar((a) => 37 + 12 * Math.abs(Math.cos(6 * a)))),
  Fp("clover", "Clover", "flower clover four leaf", polar((a) => 26 + 23 * Math.abs(Math.cos(2 * a)) ** 0.7)),
  Fp("bloom", "Soft bloom", "flower bloom soft scalloped cloud", polar((a) => 42 + 6 * Math.cos(7 * a))),
  Fp("scallop-12", "Scalloped circle", "flower scalloped badge round", scallop(50, 50, 43, 12, 4.5)),
];
const BLOBS = [[1.3, 6], [2.3, 7], [3.1, 6], [4.7, 8], [5.9, 7], [7.2, 6], [8.8, 7], [9.4, 8]].map(([s, k], i) => Fp(`blob-${i + 1}`, `Blob ${i + 1}`, "blob organic abstract fluid", blobD(50, 50, 46, s, k)));
const edge = "#3b2f2a";
const wavyRect = (w, h, amp, waves) => { const pts = [], per = (w + h) * 2, k = 240; for (let i = 0; i < k; i++) { let p = (i / k) * per, x, y, nx, ny; if (p < w) { x = p; y = 0; nx = 0; ny = 1; } else if ((p -= w) < h) { x = w; y = p; nx = -1; ny = 0; } else if ((p -= h) < w) { x = w - p; y = h; nx = 0; ny = -1; } else { p -= w; x = 0; y = h - p; nx = 1; ny = 0; } const o = amp * (1 + Math.sin((i / k) * Math.PI * 2 * waves)); pts.push([x + nx * o, y + ny * o]); } return ptsPath(pts); };
const RETRO = [
  Fp("wavy-circle", "Wavy circle", "retro wavy circle groovy", polar((a) => 45 + 3 * Math.sin(18 * a)), undefined, `<path d="${polar((a) => 45 + 3 * Math.sin(18 * a))}" fill="none" stroke="${edge}" stroke-width="2"/>`),
  Fp("groovy-square", "Groovy square", "retro squircle groovy rounded", polar((a) => 48 / (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** 0.25), undefined, `<path d="${polar((a) => 48 / (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** 0.25)}" fill="none" stroke="${edge}" stroke-width="2.4"/>`),
  Fp("sunburst", "Sunburst", "retro sunburst seal burst", ptsPath(starPts(28, 50, 50, 49, 43)), undefined, `<path d="${ptsPath(starPts(28, 50, 50, 49, 43))}" fill="none" stroke="${edge}" stroke-width="1.6"/>`),
  Fp("wavy-frame", "Wavy frame", "retro wavy edge rectangle", wavyRect(100, 120, 2.2, 22), [100, 120]),
  Fp("tv-screen", "Retro TV", "retro tv screen rounded vintage", polar((a) => 50 / (Math.abs(Math.cos(a)) ** 3 + Math.abs(Math.sin(a)) ** 3) ** (1 / 3), 60, 45, 180, 1.18, 0.88), [120, 90], `<path d="${polar((a) => 50 / (Math.abs(Math.cos(a)) ** 3 + Math.abs(Math.sin(a)) ** 3) ** (1 / 3), 60, 45, 180, 1.18, 0.88)}" fill="none" stroke="${edge}" stroke-width="3"/>`),
  Fp("ornate-oval", "Ornate oval", "retro ornate oval scalloped vintage", polar((a) => 46 + 2.4 * Math.cos(24 * a), 40, 55, 240, 0.84, 1.15), [80, 110], `<path d="${polar((a) => 46 + 2.4 * Math.cos(24 * a), 40, 55, 240, 0.84, 1.15)}" fill="none" stroke="${edge}" stroke-width="1.8"/>`),
  Fp("stamp-circle", "Stamped circle", "retro stamp circle notched", ptsPath(Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * Math.PI * 2, r = i % 2 ? 46 : 49; return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]; }))),
  Fp("arch-window", "Arch window", "retro arch window doorway vintage", "M4 136V50A46 46 0 0 1 96 50V136Z", [100, 140], `<path d="M4 136V50A46 46 0 0 1 96 50V136Z" fill="none" stroke="${edge}" stroke-width="3"/><path d="M11 136V52A39 39 0 0 1 89 52V136" fill="none" stroke="${edge}" stroke-width="1.2"/>`),
];
// Letters: chunky block capitals on a 6 × 8 grid, each ONE outline (holes joined by a zero-width keyhole) so frame
// adapters that take a single polygon keep the counter of A, B, D, O, P, Q and R.
const GLYPHS = {
  A: [[[0, 8], [0, 2], [2, 0], [4, 0], [6, 2], [6, 8], [4, 8], [4, 6], [2, 6], [2, 8]], [[2, 2.2], [4, 2.2], [4, 4], [2, 4]]],
  B: [[[0, 0], [4.5, 0], [6, 1.5], [6, 2.6], [5.1, 4], [6, 5.4], [6, 6.5], [4.5, 8], [0, 8]], [[2, 1.8], [3.9, 1.8], [3.9, 3.1], [2, 3.1]], [[2, 4.9], [3.9, 4.9], [3.9, 6.2], [2, 6.2]]],
  C: [[[1.5, 0], [6, 0], [6, 2], [2, 2], [2, 6], [6, 6], [6, 8], [1.5, 8], [0, 6.5], [0, 1.5]]],
  D: [[[0, 0], [4, 0], [6, 2], [6, 6], [4, 8], [0, 8]], [[2, 2], [3.4, 2], [4, 2.6], [4, 5.4], [3.4, 6], [2, 6]]],
  E: [[[0, 0], [6, 0], [6, 2], [2, 2], [2, 3], [5, 3], [5, 5], [2, 5], [2, 6], [6, 6], [6, 8], [0, 8]]],
  F: [[[0, 0], [6, 0], [6, 2], [2, 2], [2, 3], [5, 3], [5, 5], [2, 5], [2, 8], [0, 8]]],
  G: [[[1.5, 0], [6, 0], [6, 2], [2, 2], [2, 6], [4, 6], [4, 5.2], [3, 5.2], [3, 3.5], [6, 3.5], [6, 8], [1.5, 8], [0, 6.5], [0, 1.5]]],
  H: [[[0, 0], [2, 0], [2, 3], [4, 3], [4, 0], [6, 0], [6, 8], [4, 8], [4, 5], [2, 5], [2, 8], [0, 8]]],
  I: [[[0, 0], [6, 0], [6, 2], [4, 2], [4, 6], [6, 6], [6, 8], [0, 8], [0, 6], [2, 6], [2, 2], [0, 2]]],
  J: [[[1, 0], [6, 0], [6, 6.5], [4.5, 8], [1.5, 8], [0, 6.5], [0, 5], [2, 5], [2, 6], [4, 6], [4, 2], [1, 2]]],
  K: [[[0, 0], [2, 0], [2, 3], [4, 0], [6.3, 0], [3.4, 4], [6.3, 8], [4, 8], [2, 5], [2, 8], [0, 8]]],
  L: [[[0, 0], [2, 0], [2, 6], [6, 6], [6, 8], [0, 8]]],
  M: [[[0, 8], [0, 0], [2, 0], [3, 2], [4, 0], [6, 0], [6, 8], [4, 8], [4, 4.2], [3, 6], [2, 4.2], [2, 8]]],
  N: [[[0, 8], [0, 0], [2, 0], [4, 4.2], [4, 0], [6, 0], [6, 8], [4, 8], [2, 3.8], [2, 8]]],
  O: [[[1.5, 0], [4.5, 0], [6, 1.5], [6, 6.5], [4.5, 8], [1.5, 8], [0, 6.5], [0, 1.5]], [[2, 2], [4, 2], [4, 6], [2, 6]]],
  P: [[[0, 0], [4.5, 0], [6, 1.5], [6, 3.5], [4.5, 5], [2, 5], [2, 8], [0, 8]], [[2, 1.9], [4, 1.9], [4, 3.1], [2, 3.1]]],
  Q: [[[1.5, 0], [4.5, 0], [6, 1.5], [6, 6], [6.3, 6.9], [5.5, 8], [4.9, 7.3], [4.5, 8], [1.5, 8], [0, 6.5], [0, 1.5]], [[2, 2], [4, 2], [4, 6], [2, 6]]],
  R: [[[0, 0], [4.5, 0], [6, 1.5], [6, 3.5], [5, 4.5], [6.3, 8], [4, 8], [3, 5], [2, 5], [2, 8], [0, 8]], [[2, 1.9], [4, 1.9], [4, 3.1], [2, 3.1]]],
  S: [[[1.5, 0], [6, 0], [6, 2], [2, 2], [2, 3], [4.5, 3], [6, 4.5], [6, 6.5], [4.5, 8], [0, 8], [0, 6], [4, 6], [4, 5], [1.5, 5], [0, 3.5], [0, 1.5]]],
  T: [[[0, 0], [6, 0], [6, 2], [4, 2], [4, 8], [2, 8], [2, 2], [0, 2]]],
  U: [[[0, 0], [2, 0], [2, 6], [4, 6], [4, 0], [6, 0], [6, 6.5], [4.5, 8], [1.5, 8], [0, 6.5]]],
  V: [[[0, 0], [2, 0], [3, 4.6], [4, 0], [6, 0], [4.1, 8], [1.9, 8]]],
  W: [[[0, 0], [2, 0], [2, 4], [3, 2.6], [4, 4], [4, 0], [6, 0], [6, 8], [4, 8], [3, 6.6], [2, 8], [0, 8]]],
  X: [[[0, 0], [2.2, 0], [3, 2.4], [3.8, 0], [6, 0], [4.2, 4], [6, 8], [3.8, 8], [3, 5.6], [2.2, 8], [0, 8], [1.8, 4]]],
  Y: [[[0, 0], [2.2, 0], [3, 2.6], [3.8, 0], [6, 0], [4, 4.6], [4, 8], [2, 8], [2, 4.6]]],
  Z: [[[0, 0], [6, 0], [6, 2], [2.9, 6], [6, 6], [6, 8], [0, 8], [0, 6], [3.1, 2], [0, 2]]],
};
const area2 = (p) => p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0);
function glyphPath([outer, ...holes]) {
  let ring = area2(outer) > 0 ? outer.slice() : outer.slice().reverse();
  for (let h of holes) {
    h = area2(h) < 0 ? h.slice() : h.slice().reverse(); // holes run the other way round
    let best = [0, 0, Infinity];
    ring.forEach(([x, y], i) => h.forEach(([u, v], j) => { const d = (x - u) ** 2 + (y - v) ** 2; if (d < best[2]) best = [i, j, d]; }));
    const [i, j] = best, hr = [...h.slice(j), ...h.slice(0, j), h[j]];
    ring = [...ring.slice(0, i + 1), ...hr, ring[i], ...ring.slice(i + 1)];
  }
  const k = 12, ox = 6;
  return ptsPath(ring.map(([x, y]) => [ox + x * k, 2 + y * k]));
}
const LETTERS = Object.entries(GLYPHS).map(([ch, g]) => Fp(`letter-${ch.toLowerCase()}`, `Letter ${ch}`, `letter alphabet initial ${ch.toLowerCase()} monogram`, glyphPath(g), [84, 100]));

export const FRAME_SECTIONS = [
  { id: "basic", label: "Basic shapes", items: BASIC },
  { id: "film", label: "Film and photo", items: FILM },
  { id: "devices", label: "Devices", items: DEVICES },
  { id: "paper", label: "Paper", items: PAPER },
  { id: "flowers", label: "Flowers", items: FLOWERS },
  { id: "blobs", label: "Blobs", items: BLOBS },
  { id: "retro", label: "Retro", items: RETRO },
  { id: "letters", label: "Letters", items: LETTERS },
];

// ---------- grids (Canva-style collage layouts that fill the page)
const cols = (k) => Array.from({ length: k }, (_, i) => [i / k, 0, 1 / k, 1]);
const rows = (k) => Array.from({ length: k }, (_, i) => [0, i / k, 1, 1 / k]);
const mat = (c, r) => Array.from({ length: c * r }, (_, i) => [(i % c) / c, Math.floor(i / c) / r, 1 / c, 1 / r]);
const LAYOUTS = [
  ["1", "Single photo", [[0, 0, 1, 1]]], ["2c", "Two columns", cols(2)], ["2r", "Two rows", rows(2)], ["3c", "Three columns", cols(3)], ["3r", "Three rows", rows(3)],
  ["2x2", "Four squares", mat(2, 2)], ["1-2r", "One left, two right", [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]],
  ["2-1r", "Two left, one right", [[0, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0, 0.5, 1]]], ["1-2b", "One top, two bottom", [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]],
  ["2-1b", "Two top, one bottom", [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1, 0.5]]], ["1-3b", "One top, three bottom", [[0, 0, 1, 0.6], ...[0, 1, 2].map((i) => [i / 3, 0.6, 1 / 3, 0.4])]],
  ["3-1b", "Three top, one bottom", [...[0, 1, 2].map((i) => [i / 3, 0, 1 / 3, 0.4]), [0, 0.4, 1, 0.6]]], ["1-3r", "One left, three right", [[0, 0, 0.6, 1], ...[0, 1, 2].map((i) => [0.6, i / 3, 0.4, 1 / 3])]],
  ["2x3", "Six, two across", mat(2, 3)], ["3x2", "Six, three across", mat(3, 2)], ["3x3", "Nine squares", mat(3, 3)], ["4c", "Four columns", cols(4)], ["4r", "Four rows", rows(4)],
  ["big-left", "Big left", [[0, 0, 2 / 3, 1], [2 / 3, 0, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]]], ["big-top", "Big top", [[0, 0, 1, 2 / 3], ...[0, 1, 2].map((i) => [i / 3, 2 / 3, 1 / 3, 1 / 3])]],
  ["center-tall", "Tall centre", [[0, 0, 0.3, 0.5], [0, 0.5, 0.3, 0.5], [0.3, 0, 0.4, 1], [0.7, 0, 0.3, 0.5], [0.7, 0.5, 0.3, 0.5]]],
  ["mosaic", "Mosaic", [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.25], [0.5, 0.25, 0.5, 0.25], [0, 0.5, 0.25, 0.5], [0.25, 0.5, 0.25, 0.5], [0.5, 0.5, 0.5, 0.5]]],
  ["1-4b", "One big, four small", [[0, 0, 1, 0.6], ...[0, 1, 2, 3].map((i) => [i / 4, 0.6, 0.25, 0.4])]], ["thirds-l", "Third and two thirds", [[0, 0, 1 / 3, 1], [1 / 3, 0, 2 / 3, 1]]],
  ["golden", "Golden split", [[0, 0, 0.62, 1], [0.62, 0, 0.38, 1]]], ["4x4", "Sixteen squares", mat(4, 4)], ["offset", "Offset four", [[0, 0, 0.6, 0.5], [0.6, 0, 0.4, 0.5], [0, 0.5, 0.4, 0.5], [0.4, 0.5, 0.6, 0.5]]],
  ["l-shape", "Corner feature", [[0, 0, 2 / 3, 2 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]]],
  ["2-2-wide", "Two, wide, two", [[0, 0, 0.5, 0.3], [0.5, 0, 0.5, 0.3], [0, 0.3, 1, 0.4], [0, 0.7, 0.5, 0.3], [0.5, 0.7, 0.5, 0.3]]],
  ["side-strip", "Side strip", [[0, 0, 0.75, 1], ...[0, 1, 2, 3].map((i) => [0.75, i / 4, 0.25, 0.25])]],
];
export const GRID_ITEMS = LAYOUTS.map(([id, name, cells]) => ({ id, name, tags: `grid collage layout photo ${cells.length} ${name.toLowerCase()}`, spec: { cells, gap: 0.015, name: `Grid: ${name}` } }));
