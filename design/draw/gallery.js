// Draw template gallery (pure module, no DOM). Used by the editor's Templates panel and the intro page.
// A GENERATOR: hand-made base LAYOUTS (colouring pages, canvas templates, sample drawings) × our own colour PALETTES ×
// THEMES (each with its own motif drawing, title and photo topic). Ids encode the combination: `<layout>~<palette>~<theme>`,
// e.g. `colour-mandala~p07~ocean`; templateById(id), svg(id), parts(id) and thumb(id) all build from the id, so every one
// opens for real. TEMPLATES lists every layout once (grouped by section), then a second round in other colours/themes; any
// other valid id (42 × 12 × 10 = 5040) builds too. Artwork is ours (vector shapes, the shared template kit for gradients,
// shadows and heavy type); real photos come from the shared library (CC0 / public domain): thumbnails use its small files,
// the opened artwork the full ones. parts(id) splits the artwork into layers (frame or background, photos, lines or guides,
// title) so the editor opens each template as separate, editable layers.
import { kit, headline, text as ktext, fit, icon as kicon, pickPhoto, mix, isDark, hash } from "../shared/tpl-kit.js";
import { PHOTOS } from "../shared/photo-library.js";

const LW = { k: 1, thumb: false }; // outline width factor: colouring art is drawn smaller inside its frame, so its lines get thicker

export const COUNT = 84; // Canva has no Draw template type (canva-template-counts.md: null): 2 per layout (42 layouts)

const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/[<&"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", '"': "&quot;" })[c]);
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const ring = (n, fn) => Array.from({ length: n }, (_, i) => fn((360 / n) * i, i)).join("");
const FONT = 'font-family="Arial, Helvetica, sans-serif"';

/* ---------- palettes (ours) ---------- */
const PALETTES = [
  { id: "p01", name: "Violet dusk", ink: "#1f2937", night: ["#0b1030", "#2b2f6b"], sky: ["#5b4cf0", "#ff7a59", "#ffc56b", "#ffe7b0"], hills: ["#c2577f", "#7d3c8c", "#3b2a6b"], acc: ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b"], paper: "#ffffff" },
  { id: "p02", name: "Ocean", ink: "#0f2a3d", night: ["#061a2b", "#0e3b5c"], sky: ["#0ea5e9", "#38bdf8", "#a5f3fc", "#ecfeff"], hills: ["#0d9488", "#0f766e", "#134e4a"], acc: ["#0284c7", "#06b6d4", "#22c55e", "#facc15"], paper: "#f8fdff" },
  { id: "p03", name: "Sunflower", ink: "#3b2f12", night: ["#1c1917", "#44403c"], sky: ["#f97316", "#fb923c", "#fde047", "#fef9c3"], hills: ["#84cc16", "#4d7c0f", "#365314"], acc: ["#eab308", "#f97316", "#65a30d", "#a16207"], paper: "#fffdf2" },
  { id: "p04", name: "Berry", ink: "#3b0a2a", night: ["#1e0b2b", "#4a1d5c"], sky: ["#be185d", "#ec4899", "#f9a8d4", "#fdf2f8"], hills: ["#9d174d", "#701a75", "#3b0764"], acc: ["#db2777", "#9333ea", "#f472b6", "#fbbf24"], paper: "#fff7fb" },
  { id: "p05", name: "Forest", ink: "#14291c", night: ["#04140c", "#14402a"], sky: ["#65a30d", "#a3e635", "#d9f99d", "#f7fee7"], hills: ["#16a34a", "#166534", "#052e16"], acc: ["#15803d", "#ca8a04", "#0d9488", "#b45309"], paper: "#fbfef6" },
  { id: "p06", name: "Candy", ink: "#312e81", night: ["#1e1b4b", "#3730a3"], sky: ["#a78bfa", "#f0abfc", "#fbcfe8", "#fff1f2"], hills: ["#f472b6", "#c084fc", "#818cf8"], acc: ["#ec4899", "#8b5cf6", "#38bdf8", "#fde047"], paper: "#fffaff" },
  { id: "p07", name: "Coral reef", ink: "#3f1d1d", night: ["#0c1b33", "#1d4e6b"], sky: ["#fb7185", "#fda4af", "#fed7aa", "#fff7ed"], hills: ["#f43f5e", "#be123c", "#1e3a8a"], acc: ["#f43f5e", "#fb923c", "#06b6d4", "#a3e635"], paper: "#fffaf7" },
  { id: "p08", name: "Mint", ink: "#134e4a", night: ["#042f2e", "#115e59"], sky: ["#2dd4bf", "#5eead4", "#ccfbf1", "#f0fdfa"], hills: ["#14b8a6", "#0f766e", "#134e4a"], acc: ["#14b8a6", "#10b981", "#0ea5e9", "#f59e0b"], paper: "#f7fffd" },
  { id: "p09", name: "Desert", ink: "#422006", night: ["#1c1006", "#57340f"], sky: ["#ea580c", "#f59e0b", "#fcd34d", "#fef3c7"], hills: ["#c2410c", "#9a3412", "#7c2d12"], acc: ["#d97706", "#b45309", "#dc2626", "#0891b2"], paper: "#fffbf2" },
  { id: "p10", name: "Midnight", ink: "#0f172a", night: ["#020617", "#1e293b"], sky: ["#6366f1", "#a855f7", "#f472b6", "#fde68a"], hills: ["#475569", "#334155", "#1e293b"], acc: ["#6366f1", "#22d3ee", "#f472b6", "#facc15"], paper: "#f8fafc" },
  { id: "p11", name: "Autumn", ink: "#3b1d0f", night: ["#1a0e05", "#4a2511"], sky: ["#b91c1c", "#ea580c", "#fbbf24", "#fef3c7"], hills: ["#b45309", "#92400e", "#78350f"], acc: ["#dc2626", "#ea580c", "#ca8a04", "#65a30d"], paper: "#fffaf3" },
  { id: "p12", name: "Arctic", ink: "#1e3a5f", night: ["#0b1d3a", "#1e3a8a"], sky: ["#93c5fd", "#bfdbfe", "#e0f2fe", "#ffffff"], hills: ["#cbd5e1", "#94a3b8", "#64748b"], acc: ["#3b82f6", "#06b6d4", "#a5b4fc", "#f472b6"], paper: "#f8fbff" },
];

/* ---------- themes: a motif drawn in a 100 × 100 box (parts marked fill="none" stay lines) + our own words ---------- */
const THEMES = [
  { id: "animals", label: "Animals", title: "Animal friends", words: ["Paws", "Tails", "Whiskers", "Hugs"],
    motif: '<ellipse cx="50" cy="66" rx="24" ry="20"/><circle cx="23" cy="40" r="10"/><circle cx="40" cy="22" r="10"/><circle cx="60" cy="22" r="10"/><circle cx="77" cy="40" r="10"/>' },
  { id: "space", label: "Space", title: "Into space", words: ["Launch", "Orbit", "Stars", "Moon"],
    motif: '<path d="M50 6c18 14 24 36 18 62H32C26 42 32 20 50 6z"/><circle cx="50" cy="36" r="9"/><path d="M32 54 16 76l16-4zM68 54l16 22-16-4z"/><path d="M42 72l8 20 8-20z"/>' },
  { id: "ocean", label: "Ocean", title: "Under the sea", words: ["Waves", "Shells", "Bubbles", "Reef"],
    motif: '<path d="M10 50c14-24 46-28 64-6l16-14v40L74 56C56 78 24 74 10 50z"/><circle cx="30" cy="46" r="4"/><path d="M50 36c6 8 6 20 0 28" fill="none"/>' },
  { id: "garden", label: "Garden", title: "In the garden", words: ["Bloom", "Seeds", "Leaves", "Sunshine"],
    motif: '<path d="M50 60v34M50 84c-10-12-22-12-28-6 8 6 20 8 28 6zM50 76c10-12 22-12 28-6-8 6-20 8-28 6z"/><circle cx="50" cy="16" r="11"/><circle cx="70" cy="30" r="11"/><circle cx="63" cy="52" r="11"/><circle cx="37" cy="52" r="11"/><circle cx="30" cy="30" r="11"/><circle cx="50" cy="35" r="10"/>' },
  { id: "city", label: "City", title: "City lights", words: ["Streets", "Towers", "Lights", "Bridges"],
    motif: '<path d="M8 92V42h22v50zM30 92V18h26v74zM56 92V52h18v40zM74 92V32h18v60z"/><path d="M36 30h6M48 30h2M36 44h6M48 44h2M36 58h6M48 58h2M14 54h10M14 68h10M80 44h6M80 58h6M80 72h6" fill="none"/><path d="M4 92h92" fill="none"/>' },
  { id: "holidays", label: "Holidays", title: "Happy holidays", words: ["Gifts", "Lights", "Family", "Cheer"],
    motif: '<rect x="14" y="42" width="72" height="50" rx="4"/><rect x="8" y="30" width="84" height="16" rx="4"/><path d="M50 30v62" fill="none"/><path d="M50 30c-8-18-30-18-26-4 2 6 14 6 26 4zM50 30c8-18 30-18 26-4-2 6-14 6-26 4z"/>' },
  { id: "school", label: "School", title: "Back to school", words: ["Books", "Pencils", "Friends", "Learn"],
    motif: '<path d="M14 80 66 28l14 14-52 52H14z"/><path d="M58 36l14 14M14 80l14 14" fill="none"/><path d="M66 28l8-8a6 6 0 0 1 8 0l6 6a6 6 0 0 1 0 8l-8 8z"/>' },
  { id: "birthday", label: "Birthday", title: "Happy birthday", words: ["Cake", "Balloons", "Party", "Wishes"],
    motif: '<ellipse cx="50" cy="38" rx="26" ry="32"/><path d="M45 70h10l-5 7z"/><path d="M50 77c-8 7 8 11 0 19" fill="none"/><path d="M38 24c4-6 10-8 14-6" fill="none"/>' },
  { id: "sports", label: "Sports", title: "Game day", words: ["Team", "Goal", "Win", "Play"],
    motif: '<circle cx="50" cy="50" r="40"/><path d="M50 10v80M10 50h80M22 22c16 16 16 40 0 56M78 22c-16 16-16 40 0 56" fill="none"/>' },
  { id: "food", label: "Food", title: "Snack time", words: ["Sweet", "Fresh", "Yummy", "Share"],
    motif: '<path d="M24 54h52l-8 38H32z"/><path d="M18 54c0-16 14-26 32-26s32 10 32 26z"/><circle cx="50" cy="20" r="7"/><path d="M38 60l4 30M50 60v30M62 60l-4 30" fill="none"/>' },
];
const motif = (th, x, y, size, { fill = "none", stroke = "#1f2937", sw = 6, rot = 0, opacity = 1 } = {}) => LW.thumb && size < 170 ? "" :
  `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot} ${r1(size / 2)} ${r1(size / 2)}) scale(${r1(size / 100 * 1000) / 1000})" fill="${fill}" stroke="${stroke}" stroke-width="${r1(sw * LW.k * 100 / size)}" stroke-linejoin="round" stroke-linecap="round"${opacity < 1 ? ` opacity="${opacity}"` : ""}>${th.motif}</g>`;

/* ---------- layouts ---------- */
const line = (pal, sw = 7) => `fill="none" stroke="${pal.ink}" stroke-width="${r1(sw * LW.k)}" stroke-linejoin="round" stroke-linecap="round"`;
const banner = (pal, x, y, w, h, text, size = 54) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ${line(pal, 6)}/><text x="${x + w / 2}" y="${r1(y + h / 2 + size * 0.36)}" text-anchor="middle" ${FONT} font-size="${size}" font-weight="700" fill="${pal.ink}">${esc(text)}</text>`;

function flower(p, pal, th) {
  const cx = 540, cy = 470, L = line(pal);
  return `<path d="M540 560 C 520 760 560 900 540 1110" fill="none" stroke="${pal.ink}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M548 820 C 640 720 760 730 800 760 C 740 850 630 870 548 820 Z" ${L}/><path d="M534 940 C 440 850 320 860 280 890 C 340 980 450 990 534 940 Z" ${L}/>` +
    ring(10, (a) => `<ellipse cx="${cx}" cy="${cy - 175}" rx="72" ry="140" transform="rotate(${a} ${cx} ${cy})" ${L}/>`) +
    ring(10, (a) => `<ellipse cx="${cx}" cy="${cy - 120}" rx="40" ry="80" transform="rotate(${a + 18} ${cx} ${cy})" ${L}/>`) +
    `<circle cx="${cx}" cy="${cy}" r="96" ${L}/>` + ring(8, (a) => `<circle cx="${cx}" cy="${cy - 50}" r="14" transform="rotate(${a} ${cx} ${cy})" ${L}/>`) +
    `<path d="M380 1100 H700 L668 1290 H412 Z" ${L}/><rect x="360" y="1080" width="360" height="60" rx="14" ${L}/>` +
    motif(th, 40, 60, 150, { stroke: pal.ink, sw: 7 }) + motif(th, 890, 60, 150, { stroke: pal.ink, sw: 7, rot: 12 }) + motif(th, 80, 1130, 150, { stroke: pal.ink, sw: 7, rot: -10 });
}
function house(p, pal, th) {
  const L = line(pal), k = pal.ink;
  return `<circle cx="900" cy="170" r="80" ${L}/>` + ring(12, (a) => `<line x1="900" y1="60" x2="900" y2="24" transform="rotate(${a} 900 170)" stroke="${k}" stroke-width="7" stroke-linecap="round"/>`) +
    `<path d="M120 200 c0 -50 80 -60 100 -20 c30 -40 110 -20 100 30 c40 0 50 60 0 60 h-190 c-50 0 -50 -70 -10 -70 z" ${L}/>` +
    `<rect x="250" y="330" width="70" height="150" ${L}/><path d="M180 560 L540 300 L900 560 Z" ${L}/>` +
    `<rect x="230" y="560" width="620" height="520" ${L}/><rect x="470" y="800" width="140" height="280" rx="10" ${L}/><circle cx="585" cy="950" r="10" fill="${k}"/>` +
    `<rect x="290" y="640" width="140" height="130" ${L}/><path d="M360 640 V770 M290 705 H430" stroke="${k}" stroke-width="7"/>` +
    `<rect x="650" y="640" width="140" height="130" ${L}/><path d="M720 640 V770 M650 705 H790" stroke="${k}" stroke-width="7"/>` +
    `<circle cx="540" cy="460" r="48" ${L}/><path d="M540 412 V508 M492 460 H588" stroke="${k}" stroke-width="6"/>` +
    `<path d="M40 1080 H1040 V1300 H40 Z" ${L}/><path d="M500 1080 L430 1300 H650 L580 1080 Z" ${L}/>` +
    `<rect x="935" y="820" width="46" height="260" ${L}/><circle cx="958" cy="760" r="110" ${L}/>` +
    motif(th, 40, 340, 130, { stroke: k, sw: 7 }) + motif(th, 740, 1110, 160, { stroke: k, sw: 7 }) + motif(th, 110, 1120, 140, { stroke: k, sw: 7, rot: -8 });
}
function fish(p, pal, th) {
  const L = line(pal), k = pal.ink;
  return `<path d="M40 1240 C 200 1180 300 1290 460 1230 C 620 1170 760 1290 1040 1220 V1310 H40 Z" ${L}/>` +
    `<path d="M120 1230 C 80 1100 170 1010 120 900 C 200 1000 140 1120 190 1230" ${L}/><path d="M900 1220 C 950 1080 860 1000 930 880 C 990 1010 960 1100 970 1220" ${L}/>` +
    `<path d="M200 560 C 320 330 700 320 820 560 C 700 800 320 790 200 560 Z" ${L}/><path d="M816 560 L1000 420 C 980 500 980 620 1000 700 Z" ${L}/>` +
    `<path d="M420 400 C 470 300 600 300 640 380" ${L}/><path d="M440 720 C 480 800 560 810 600 740" ${L}/>` +
    `<path d="M330 450 C 380 520 380 600 330 670" fill="none" stroke="${k}" stroke-width="7"/>` +
    ring(4, (a, i) => `<path d="M${430 + i * 80} 470 c40 30 40 70 0 100 M${430 + i * 80} 570 c40 30 40 70 0 100" fill="none" stroke="${k}" stroke-width="6" stroke-linecap="round"/>`) +
    `<circle cx="280" cy="530" r="34" ${L}/><circle cx="288" cy="526" r="12" fill="${k}"/>` +
    `<circle cx="160" cy="380" r="30" ${L}/><circle cx="120" cy="290" r="20" ${L}/><circle cx="880" cy="250" r="24" ${L}/><circle cx="930" cy="170" r="15" ${L}/>` +
    motif(th, 700, 950, 160, { stroke: k, sw: 7 }) + motif(th, 360, 940, 140, { stroke: k, sw: 7, rot: 10 }) + motif(th, 70, 60, 150, { stroke: k, sw: 7 });
}
function mandala(p, pal, th) {
  const c = 540, L = line(pal);
  return `<circle cx="${c}" cy="${c}" r="470" ${L}/>` +
    ring(24, (a) => `<path d="M${c} ${c - 470} q40 30 0 70 q-40 -40 0 -70z" transform="rotate(${a} ${c} ${c})" ${L}/>`) +
    `<circle cx="${c}" cy="${c}" r="380" ${L}/>` + ring(16, (a) => `<ellipse cx="${c}" cy="${c - 300}" rx="46" ry="82" transform="rotate(${a} ${c} ${c})" ${L}/>`) +
    `<circle cx="${c}" cy="${c}" r="215" ${L}/>` +
    ring(12, (a) => `<path d="M${c} ${c - 215} C ${c + 60} ${c - 160} ${c + 40} ${c - 110} ${c} ${c - 95} C ${c - 40} ${c - 110} ${c - 60} ${c - 160} ${c} ${c - 215} Z" transform="rotate(${a} ${c} ${c})" ${L}/>`) +
    `<circle cx="${c}" cy="${c}" r="90" ${L}/>` + ring(8, (a) => `<circle cx="${c}" cy="${c - 58}" r="20" transform="rotate(${a} ${c} ${c})" ${L}/>`) +
    `<circle cx="${c}" cy="${c}" r="26" ${L}/>` + ring(24, (a) => `<circle cx="${c}" cy="${c - 245}" r="9" transform="rotate(${a + 7.5} ${c} ${c})" fill="${pal.ink}"/>`) +
    [[12, 12], [958, 12], [12, 958], [958, 958]].map(([x, y], i) => motif(th, x, y, 110, { stroke: pal.ink, sw: 6, rot: i * 15 })).join("");
}

function sunset(p, pal, th, w, h) {
  const [s0, s1, s2, s3] = pal.sky, [h1, h2, h3] = pal.hills;
  return `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset=".45" stop-color="${s1}"/><stop offset=".75" stop-color="${s2}"/><stop offset="1" stop-color="${s3}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}sky)"/><circle cx="1180" cy="600" r="170" fill="#ffffff" opacity=".75"/>` +
    `<path d="M0 640 C 260 520 420 560 640 620 C 900 690 1080 560 1360 590 C 1600 615 1760 560 1920 600 V1080 H0 Z" fill="${h1}"/>` +
    `<path d="M0 760 C 300 660 560 700 820 760 C 1100 830 1400 700 1920 760 V1080 H0 Z" fill="${h2}"/>` +
    `<path d="M0 900 C 380 820 700 860 1000 900 C 1300 940 1600 860 1920 880 V1080 H0 Z" fill="${h3}"/>` +
    `<path d="M380 300 q20 -20 40 0 q20 -20 40 0 M520 240 q16 -16 32 0 q16 -16 32 0 M260 380 q14 -14 28 0 q14 -14 28 0" fill="none" stroke="${pal.ink}" stroke-width="7" stroke-linecap="round"/>` +
    motif(th, 1460, 700, 150, { fill: h3, stroke: h3, sw: 2 });
}
function nightSky(p, pal, th, w, h) {
  const rnd = rng(42);
  let stars = "";
  for (let i = 0; i < 90; i++) { const x = r1(rnd() * w), y = r1(rnd() * h * 0.62), s = r1(1.5 + rnd() * 3.5); stars += `<circle cx="${x}" cy="${y}" r="${s}" fill="#ffffff" opacity="${r1(0.5 + rnd() * 0.5)}"/>`; }
  const [n0, n1] = pal.night;
  return `<defs><linearGradient id="${p}night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n0}"/><stop offset="1" stop-color="${n1}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}night)"/>` + stars +
    `<circle cx="800" cy="240" r="110" fill="#fff4c4"/><circle cx="850" cy="205" r="100" fill="${n0}"/>` +
    `<path d="M0 760 L180 560 L330 700 L520 470 L700 690 L860 590 L1080 780 V1080 H0 Z" fill="${n1}"/><path d="M0 760 L180 560 L330 700 L520 470 L700 690 L860 590 L1080 780 V1080 H0 Z" fill="#000000" opacity=".25"/>` +
    `<path d="M0 860 C 240 800 480 840 700 880 C 860 905 980 870 1080 860 V1080 H0 Z" fill="#000000" opacity=".55"/>` +
    ring(5, (a, i) => { const x = 90 + i * 110, y = 880 - (i % 2) * 30; return `<path d="M${x} ${y} L${x + 40} ${y - 150} L${x + 80} ${y} Z" fill="#000000" opacity=".7"/><rect x="${x + 34}" y="${y}" width="12" height="40" fill="#000000" opacity=".7"/>`; }) +
    motif(th, 780, 880, 150, { fill: "#000000", stroke: "#000000", sw: 2, opacity: 0.6 });
}

/* ---------- more layouts (round 2): helpers ---------- */
const mirror = (s, w = 1080) => `<g transform="matrix(-1 0 0 1 ${w} 0)">${s}</g>`;
function starPath(cx, cy, r, n = 5, ir = 0.45) {
  let d = "";
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * ir : r; d += (i ? "L" : "M") + r1(cx + Math.cos(a) * rr) + " " + r1(cy + Math.sin(a) * rr); }
  return d + "Z";
}
/** A bumpy cloud/crown outline around an ellipse: n bumps. */
function scallop(cx, cy, rx, ry, n = 12, bump = 0.22) {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, x = r1(cx + Math.cos(a) * rx), y = r1(cy + Math.sin(a) * ry);
    if (!i) { d = `M${x} ${y}`; continue; }
    const am = ((i - 0.5) / n) * Math.PI * 2, k = 1 + bump * 2;
    d += ` Q${r1(cx + Math.cos(am) * rx * k)} ${r1(cy + Math.sin(am) * ry * k)} ${x} ${y}`;
  }
  return d + "Z";
}
function gearPath(cx, cy, r, teeth = 10) {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.22;
    d += (i ? "L" : "M") + r1(cx + Math.cos(a0) * rr) + " " + r1(cy + Math.sin(a0) * rr) + "L" + r1(cx + Math.cos(a1) * rr) + " " + r1(cy + Math.sin(a1) * rr);
  }
  return d + "Z";
}
const daisy = (cx, cy, r, L) => ring(8, (a) => `<ellipse cx="${cx}" cy="${r1(cy - r)}" rx="${r1(r * 0.42)}" ry="${r1(r * 0.75)}" transform="rotate(${a} ${cx} ${cy})" ${L}/>`) + `<circle cx="${cx}" cy="${cy}" r="${r1(r * 0.42)}" ${L}/>`;
const leaf = (x, y, s, rot, L) => `<path d="M0 0 C ${s * 0.4} ${-s * 0.5} ${s} ${-s * 0.4} ${s * 1.2} 0 C ${s} ${s * 0.4} ${s * 0.4} ${s * 0.5} 0 0 Z M0 0 L${s * 1.1} 0" transform="translate(${x} ${y}) rotate(${rot})" ${L}/>`;
const cloudPath = (x, y, s) => `M${x} ${y} c${-60 * s} 0 ${-60 * s} ${-80 * s} 0 ${-80 * s} c${10 * s} ${-60 * s} ${100 * s} ${-70 * s} ${120 * s} ${-14 * s} c${40 * s} ${-46 * s} ${126 * s} ${-26 * s} ${120 * s} ${30 * s} c${56 * s} 0 ${56 * s} ${64 * s} 0 ${64 * s} z`;
const grass = (y, w, L) => `<path d="M30 ${y} ${Array.from({ length: Math.floor((w - 60) / 40) }, (_, i) => `l20 -${i % 2 ? 34 : 22} l20 ${i % 2 ? 34 : 22}`).join(" ")}" ${L}/>`;

/* colouring pages (outlines only) */
function butterfly(p, pal, th) {
  const L = line(pal), k = pal.ink;
  const half = `<path d="M520 560 C 380 300 140 250 110 420 C 85 570 300 660 520 640 Z" ${L}/><path d="M520 680 C 360 690 200 790 240 940 C 280 1080 470 1010 520 820 Z" ${L}/>` +
    `<circle cx="270" cy="440" r="62" ${L}/><circle cx="270" cy="440" r="26" ${L}/><circle cx="410" cy="560" r="30" ${L}/><circle cx="180" cy="520" r="18" ${L}/>` +
    `<path d="M300 850 c40 -40 100 -40 140 10 c-40 50 -100 50 -140 -10 z" ${L}/><circle cx="320" cy="960" r="22" ${L}/>` +
    `<path d="M528 412 C 500 330 450 280 400 290" ${L}/><circle cx="392" cy="292" r="14" ${L}/>`;
  return half + mirror(half) + `<ellipse cx="540" cy="700" rx="30" ry="210" ${L}/><circle cx="540" cy="455" r="46" ${L}/>` +
    `<path d="M512 620 h56 M512 690 h56 M514 760 h52 M518 830 h44" fill="none" stroke="${k}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M150 1300 C 160 1240 170 1200 170 1150 M910 1300 C 900 1250 890 1210 890 1160" ${L}/>` + daisy(170, 1140, 46, L) + daisy(890, 1150, 40, L) +
    grass(1300, 1080, L) + motif(th, 860, 50, 150, { stroke: k, sw: 7 }) + motif(th, 70, 50, 130, { stroke: k, sw: 7, rot: -10 });
}
function rocket(p, pal, th) {
  const L = line(pal), k = pal.ink;
  return `<path d="M540 140 C 660 260 700 460 660 780 H420 C 380 460 420 260 540 140 Z" ${L}/><path d="M440 320 H640" ${L}/>` +
    `<circle cx="540" cy="450" r="80" ${L}/><circle cx="540" cy="450" r="54" ${L}/><circle cx="540" cy="630" r="24" ${L}/>` +
    `<path d="M430 640 L310 820 L330 900 L425 780 Z" ${L}/><path d="M650 640 L770 820 L750 900 L655 780 Z" ${L}/><path d="M520 700 h40 v170 h-40 z" ${L}/>` +
    `<path d="M440 780 h200 l-20 50 h-160 z" ${L}/><path d="M470 840 C 450 930 500 1000 540 1080 C 580 1000 630 930 610 840 Z" ${L}/><path d="M505 850 C 495 910 525 960 540 1010 C 555 960 585 910 575 850 Z" ${L}/>` +
    `<path d="${cloudPath(330, 1250, 1.1)}" ${L}/><path d="${cloudPath(700, 1260, 0.9)}" ${L}/>` +
    `<circle cx="180" cy="1000" r="100" ${L}/><ellipse cx="180" cy="1000" rx="180" ry="40" transform="rotate(-18 180 1000)" ${L}/>` +
    `<path d="M900 140 a90 90 0 1 0 70 150 a72 72 0 1 1 -70 -150 z" ${L}/>` +
    [[150, 200, 34], [300, 360, 22], [820, 520, 30], [960, 800, 24], [110, 640, 26], [860, 1040, 20]].map(([x, y, r]) => `<path d="${starPath(x, y, r)}" ${L}/>`).join("") +
    motif(th, 800, 1130, 130, { stroke: k, sw: 7 });
}
function owl(p, pal, th) {
  const L = line(pal), k = pal.ink;
  const side = `<path d="M370 360 L320 220 L460 320 Z" ${L}/><circle cx="430" cy="520" r="105" ${L}/><circle cx="430" cy="520" r="52" ${L}/><circle cx="440" cy="512" r="22" fill="${k}"/>` +
    `<path d="M300 640 C 220 760 240 900 340 990 C 360 860 360 760 330 650 Z" ${L}/><path d="M470 1050 l-20 40 M500 1050 v44 M530 1050 l20 40" ${L}/>`;
  let belly = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - (r % 2); c++) belly += `<path d="M${430 + c * 60 + (r % 2) * 30} ${760 + r * 60} q30 34 60 0" ${L}/>`;
  return `<path d="M540 300 C 760 300 820 520 800 760 C 780 980 660 1060 540 1060 C 420 1060 300 980 280 760 C 260 520 320 300 540 300 Z" ${L}/>` + side + mirror(side) +
    `<path d="M505 610 L575 610 L540 690 Z" ${L}/>` + belly +
    `<path d="M40 1090 C 300 1050 700 1070 1040 1020 M40 1140 C 300 1100 700 1120 1040 1070" ${L}/>` + leaf(120, 1110, 90, -150, L) + leaf(930, 1050, 90, -30, L) + leaf(820, 1140, 70, 30, L) +
    `<path d="M880 120 a90 90 0 1 0 70 150 a72 72 0 1 1 -70 -150 z" ${L}/>` + `<path d="${starPath(160, 160, 34)}" ${L}/><path d="${starPath(270, 90, 20)}" ${L}/>` +
    motif(th, 80, 1170, 130, { stroke: k, sw: 7 }) + motif(th, 870, 1170, 130, { stroke: k, sw: 7, rot: 8 });
}
function dinosaur(p, pal, th) {
  const L = line(pal), k = pal.ink;
  let spikes = "";
  for (let i = 0; i < 7; i++) { const x = 330 + i * 62, y = 640 - Math.sin((i / 6) * Math.PI) * 50; spikes += `<path d="M${r1(x)} ${r1(y + 30)} l30 -64 l30 64" ${L}/>`; }
  return `<ellipse cx="520" cy="790" rx="270" ry="170" ${L}/>` + spikes +
    `<path d="M690 690 C 760 560 760 420 790 330 M780 740 C 850 600 860 470 880 380" ${L}/><ellipse cx="860" cy="320" rx="96" ry="62" ${L}/>` +
    `<circle cx="880" cy="300" r="12" fill="${k}"/><path d="M860 350 q40 22 76 -6" ${L}/>` +
    `<path d="M270 760 C 180 760 100 820 40 900 C 140 890 220 870 290 850" ${L}/>` +
    `<path d="M360 900 v170 h80 v-150 M520 940 v130 h80 v-140 M650 900 v170 h76 v-190" ${L}/>` +
    ring(5, (a, i) => `<circle cx="${400 + i * 70}" cy="${760 + (i % 2) * 50}" r="${22 - (i % 2) * 6}" ${L}/>`) +
    `<path d="M40 1080 H1040" ${L}/><path d="M60 470 L170 290 L230 290 L340 470 Z" ${L}/><path d="M170 290 c-30 -40 -10 -80 30 -70 c20 -50 80 -30 70 10 c40 0 40 50 0 60" ${L}/>` +
    `<path d="M40 470 H360" ${L}/><path d="${cloudPath(560, 220, 0.7)}" ${L}/>` + `<path d="M960 1080 C 970 960 960 900 940 840" ${L}/>` + ring(5, (a) => leaf(940, 840, 100, a - 160, L)) +
    `<path d="${starPath(420, 120, 30)}" ${L}/>` + motif(th, 100, 1130, 150, { stroke: k, sw: 7 }) + motif(th, 780, 1130, 150, { stroke: k, sw: 7, rot: -8 });
}
function castle(p, pal, th) {
  const L = line(pal), k = pal.ink;
  const cren = (x, y, w, n) => `<path d="M${x} ${y} ${Array.from({ length: n }, (_, i) => `h${w / (n * 2)} v-34 h${w / (n * 2)} v34`).join(" ")}" ${L}/>`;
  const tower = (x, top, w) => `<rect x="${x}" y="${top}" width="${w}" height="${1200 - top}" ${L}/><path d="M${x - 20} ${top} L${x + w / 2} ${top - 200} L${x + w + 20} ${top} Z" ${L}/>` +
    `<path d="M${x + w / 2} ${top - 200} v-80 l70 24 l-70 24" ${L}/><path d="M${x + w / 2 - 26} ${top + 160} v-30 a26 26 0 0 1 52 0 v30 z" ${L}/><path d="M${x + w / 2 - 26} ${top + 360} v-30 a26 26 0 0 1 52 0 v30 z" ${L}/>`;
  return `<rect x="270" y="660" width="540" height="540" ${L}/>` + cren(270, 660, 540, 6) + tower(130, 520, 170) + tower(780, 520, 170) +
    `<rect x="450" y="400" width="180" height="260" ${L}/>` + cren(450, 400, 180, 3) + `<path d="M430 400 L540 210 L650 400 Z" ${L}/><path d="M540 210 v-80 l70 24 l-70 24" ${L}/>` +
    `<path d="M512 560 v-40 a28 28 0 0 1 56 0 v40 z" ${L}/>` +
    `<path d="M450 1200 V990 a90 90 0 0 1 180 0 V1200" ${L}/><path d="M480 960 V1200 M510 935 V1200 M540 925 V1200 M570 935 V1200 M600 960 V1200 M450 1040 H630 M450 1110 H630" fill="none" stroke="${k}" stroke-width="4"/>` +
    `<path d="M330 760 h70 M690 760 h70 M300 860 h50 M720 900 h60 M340 980 h60" ${L}/>` +
    `<path d="M440 1200 L360 1340 H720 L640 1200" ${L}/><path d="M40 1200 H440 M640 1200 H1040" ${L}/>` +
    `<path d="${cloudPath(150, 260, 0.8)}" ${L}/><path d="${cloudPath(850, 200, 0.7)}" ${L}/>` + motif(th, 60, 1220, 110, { stroke: k, sw: 7 }) + motif(th, 900, 1220, 110, { stroke: k, sw: 7 });
}
function car(p, pal, th) {
  const L = line(pal), k = pal.ink;
  const wheel = (cx) => `<circle cx="${cx}" cy="770" r="92" ${L}/><circle cx="${cx}" cy="770" r="40" ${L}/>` + ring(5, (a) => `<path d="M${cx} 730 V700" transform="rotate(${a} ${cx} 770)" ${L}/>`);
  return `<circle cx="900" cy="150" r="74" ${L}/>` + ring(10, (a) => `<path d="M900 52 V20" transform="rotate(${a} 900 150)" ${L}/>`) +
    `<path d="${cloudPath(220, 200, 0.8)}" ${L}/>` +
    `<path d="M70 640 V490 M70 540 l-36 -36 M70 580 l36 -36" ${L}/>` + `<path d="${scallop(70, 410, 64, 80, 8, 0.15)}" ${L}/>` +
    `<path d="M120 700 C 120 640 160 610 220 600 L 330 590 L 430 470 C 450 450 480 440 510 440 L 720 440 C 760 440 790 455 810 480 L 900 590 L 960 600 C 1000 610 1010 650 1010 700 L 1010 760 L 120 760 Z" ${L}/>` +
    `<path d="M370 590 L460 490 H600 V590 Z M630 590 V490 H760 L840 590 Z" ${L}/><path d="M615 600 V740 M660 640 h40" ${L}/>` +
    `<path d="M960 640 h40 v40 h-40 z M140 650 h40 v34 h-40 z" ${L}/>` + wheel(320) + wheel(820) +
    `<path d="M0 860 H1080 M0 1040 H1080" ${L}/>` + ring(6, (a, i) => `<path d="M${40 + i * 180} 950 h100" ${L}/>`) +
    motif(th, 60, 70, 120, { stroke: k, sw: 7 });
}
function bigTree(p, pal, th) {
  const L = line(pal), k = pal.ink;
  const apples = [[380, 380], [560, 300], [700, 420], [450, 560], [650, 600], [300, 520], [780, 560]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30" ${L}/><path d="M${x} ${y - 30} q6 -20 20 -24" ${L}/>`).join("");
  return `<path d="${scallop(540, 470, 400, 330, 16, 0.12)}" ${L}/>` + apples +
    `<path d="M470 760 C 490 900 480 1060 440 1250 H660 C 610 1060 600 900 620 760" ${L}/><path d="M520 840 C 470 800 420 790 380 800 M580 900 C 640 860 700 860 740 880" ${L}/>` +
    `<path d="M380 800 V1050 M300 800 V1050 M290 1050 h100 v24 h-100 z" ${L}/>` +
    `<path d="M40 1250 C 300 1210 800 1220 1040 1250 V1330 H40 Z" ${L}/>` + grass(1250, 1080, L) + daisy(140, 1170, 30, L) + daisy(950, 1180, 30, L) +
    `<path d="M120 160 q30 -30 60 0 q30 -30 60 0 M860 120 q24 -24 48 0 q24 -24 48 0" ${L}/>` + motif(th, 820, 1120, 120, { stroke: k, sw: 7 }) + motif(th, 60, 40, 120, { stroke: k, sw: 7 });
}
function iceCream(p, pal, th) {
  const L = line(pal), k = pal.ink, cid = `${p}cone`;
  let hatch = "";
  for (let i = -6; i < 10; i++) hatch += `<path d="M${380 + i * 60} 720 l360 520 M${700 - i * 60} 720 l-360 520"/>`;
  const sprinkles = [[470, 300, 20], [600, 330, -30], [520, 420, 60], [640, 440, 10], [420, 560, -40], [560, 600, 30], [680, 570, 70], [480, 680, -10]].map(([x, y, r]) => `<rect x="${x}" y="${y}" width="36" height="12" rx="6" transform="rotate(${r} ${x} ${y})" ${L}/>`).join("");
  return `<defs><clipPath id="${cid}"><path d="M380 720 L700 720 L540 1240 Z"/></clipPath></defs>` +
    `<path d="M380 720 L700 720 L540 1240 Z" ${L}/><g clip-path="url(#${cid})" fill="none" stroke="${k}" stroke-width="5">${hatch}</g>` +
    `<path d="M340 730 C 320 650 380 600 440 610 C 470 560 560 550 600 600 C 660 580 740 620 730 700 C 760 720 750 770 700 760 C 680 800 620 790 610 760 C 580 800 520 800 500 760 C 470 800 400 790 400 760 C 350 780 320 760 340 730 Z" ${L}/>` +
    `<path d="M380 600 C 360 520 420 470 480 480 C 510 430 600 430 630 480 C 700 470 740 540 700 600" ${L}/>` +
    `<path d="M420 470 C 400 380 460 320 540 320 C 620 320 680 380 660 470" ${L}/><circle cx="560" cy="270" r="44" ${L}/><path d="M560 226 C 570 170 610 140 650 130" ${L}/>` +
    sprinkles + [[160, 300], [900, 360], [180, 900], [920, 960]].map(([x, y]) => `<path d="M${x} ${y + 30} C ${x - 60} ${y - 10} ${x - 20} ${y - 60} ${x} ${y - 20} C ${x + 20} ${y - 60} ${x + 60} ${y - 10} ${x} ${y + 30} Z" ${L}/>`).join("") +
    motif(th, 820, 1150, 140, { stroke: k, sw: 7 }) + motif(th, 100, 1150, 140, { stroke: k, sw: 7, rot: -10 });
}
function robot(p, pal, th) {
  const L = line(pal), k = pal.ink;
  return `<path d="M540 260 V180" ${L}/><circle cx="540" cy="160" r="24" ${L}/><rect x="360" y="260" width="360" height="260" rx="40" ${L}/>` +
    `<rect x="320" y="340" width="40" height="100" rx="12" ${L}/><rect x="720" y="340" width="40" height="100" rx="12" ${L}/>` +
    `<circle cx="460" cy="370" r="44" ${L}/><circle cx="620" cy="370" r="44" ${L}/><circle cx="460" cy="370" r="16" fill="${k}"/><circle cx="620" cy="370" r="16" fill="${k}"/>` +
    `<rect x="440" y="440" width="200" height="50" rx="10" ${L}/><path d="M480 440 v50 M520 440 v50 M560 440 v50 M600 440 v50" ${L}/>` +
    `<rect x="500" y="520" width="80" height="60" ${L}/><rect x="300" y="580" width="480" height="420" rx="40" ${L}/>` +
    `<rect x="370" y="650" width="220" height="150" rx="16" ${L}/><circle cx="660" cy="680" r="28" ${L}/><circle cx="660" cy="770" r="28" ${L}/>` +
    `<path d="M480 900 C 440 860 410 900 440 930 L480 970 L520 930 C 550 900 520 860 480 900 Z" ${L}/><path d="M390 840 h180" ${L}/>` +
    `<path d="M300 640 L180 800 L230 840 L330 720" ${L}/><path d="M780 640 L900 800 L850 840 L750 720" ${L}/>` +
    `<path d="M160 800 l-30 60 M200 830 l10 60 M920 800 l30 60 M880 830 l-10 60" ${L}/>` +
    `<rect x="370" y="1000" width="110" height="180" ${L}/><rect x="600" y="1000" width="110" height="180" ${L}/><path d="M340 1180 h170 v50 h-170 z M570 1180 h170 v50 h-170 z" ${L}/>` +
    `<path d="${gearPath(150, 200, 60, 9)}" ${L}/><circle cx="150" cy="200" r="22" ${L}/><path d="${gearPath(930, 1080, 70, 10)}" ${L}/><circle cx="930" cy="1080" r="26" ${L}/>` +
    `<path d="M40 1240 H1040" ${L}/>` + motif(th, 840, 120, 140, { stroke: k, sw: 7 }) + motif(th, 80, 1060, 130, { stroke: k, sw: 7 });
}
function turtle(p, pal, th) {
  const L = line(pal), k = pal.ink;
  return `<path d="M210 640 C 230 330 850 330 870 640 Z" ${L}/><path d="M190 640 H890 C 890 690 190 690 190 640 Z" ${L}/>` +
    `<path d="M540 420 l70 40 v80 l-70 40 l-70 -40 v-80 z" ${L}/><path d="M400 470 l60 30 v70 l-60 30 l-60 -30 v-70 z M680 470 l60 30 v70 l-60 30 l-60 -30 v-70 z" ${L}/>` +
    `<path d="M470 460 L420 400 M610 460 L660 400 M540 580 V640 M400 600 V640 M680 600 V640" ${L}/>` +
    `<path d="M870 590 C 900 520 990 520 1010 590 C 1020 650 960 680 900 660" ${L}/><circle cx="960" cy="575" r="12" fill="${k}"/><path d="M955 620 q20 12 40 -4" ${L}/>` +
    `<ellipse cx="300" cy="700" rx="50" ry="70" ${L}/><ellipse cx="760" cy="700" rx="50" ry="70" ${L}/><path d="M200 620 l-60 30 l60 10" ${L}/>` +
    `<path d="M40 900 C 260 860 820 880 1040 900 V1040 H40 Z" ${L}/>` +
    `<path d="M120 900 C 90 800 150 760 120 680 C 190 760 140 820 170 900 M940 900 C 980 820 920 770 960 700 C 1010 780 960 830 990 900" ${L}/>` +
    [[220, 220, 22], [180, 300, 14], [860, 200, 26], [900, 120, 16], [520, 160, 18]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" ${L}/>`).join("") +
    motif(th, 420, 920, 110, { stroke: k, sw: 7 }) + motif(th, 640, 930, 100, { stroke: k, sw: 7, rot: 10 });
}

/* sample drawings (full paintings) */
function mountainLake(p, pal, th, w, h) {
  const [s0, s1, s2, s3] = pal.sky, [h1, h2, h3] = pal.hills;
  const peaks = `M0 640 L260 330 L380 450 L560 220 L760 470 L900 360 L1120 600 L1300 300 L1500 520 L1680 380 L1920 600 V660 H0 Z`;
  let trees = "";
  for (let i = 0; i < 16; i++) { const x = 40 + i * 120 + (i % 3) * 18, s = 70 + (i % 4) * 22; trees += `<path d="M${x} 700 l${s / 2} ${-s * 1.6} l${s / 2} ${s * 1.6} z" fill="${h3}"/>`; }
  return `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset=".6" stop-color="${s2}"/><stop offset="1" stop-color="${s3}"/></linearGradient>` +
    `<linearGradient id="${p}lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s2}"/><stop offset="1" stop-color="${s0}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}sky)"/><circle cx="1480" cy="200" r="90" fill="#ffffff" opacity=".8"/>` +
    `<path d="${peaks}" fill="${h2}"/><path d="M560 220 L640 330 L600 320 L560 360 L520 320 L490 300 Z M1300 300 L1370 400 L1330 390 L1300 420 L1260 390 Z M260 330 L310 400 L280 395 L250 410 L230 370 Z" fill="#ffffff" opacity=".9"/>` +
    `<rect y="700" width="${w}" height="${h - 700}" fill="url(#${p}lake)"/><g opacity=".35" transform="matrix(1 0 0 -0.6 0 1120)"><path d="${peaks}" fill="${h2}"/></g>` +
    `<rect y="660" width="${w}" height="50" fill="${h1}"/>` + trees +
    [0, 1, 2, 3, 4].map((i) => `<path d="M${300 + i * 300} ${820 + (i % 2) * 70} h${120 + (i % 3) * 40}" stroke="#ffffff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>`).join("") +
    `<path d="M600 900 h180 l-40 40 h-110 z M690 900 v-120 l60 90 z" fill="${pal.ink}" opacity=".8"/>` + motif(th, 1640, 760, 150, { fill: h3, stroke: h3, sw: 2, opacity: 0.8 });
}
function flowerField(p, pal, th, w, h) {
  const [s0, s1, s2, s3] = pal.sky, [h1, h2, h3] = pal.hills, rnd = rng(19);
  let flowers = "";
  for (let i = 0; i < (LW.thumb ? 80 : 140); i++) {
    const y = 640 + rnd() * 420, x = rnd() * w, s = 6 + ((y - 640) / 420) * 18, c = pal.acc[i % 4];
    if (LW.thumb) { flowers += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(s * 1.05)}" fill="${c}"/>`; continue; }
    flowers += `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x)}" y2="${r1(y + s * 2.2)}" stroke="${h3}" stroke-width="${r1(s / 4 + 1)}"/>` + ring(5, (a) => `<circle cx="${r1(x)}" cy="${r1(y - s * 0.7)}" r="${r1(s * 0.55)}" transform="rotate(${a} ${r1(x)} ${r1(y)})" fill="${c}"/>`) + `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(s * 0.4)}" fill="#fff4c4"/>`;
  }
  return `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s3}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}sky)"/><circle cx="1600" cy="210" r="110" fill="${s1}" opacity=".85"/>` +
    `<path d="${cloudPath(400, 260, 1.3)}" fill="#ffffff" opacity=".85"/><path d="${cloudPath(1100, 180, 1)}" fill="#ffffff" opacity=".75"/>` +
    `<path d="M0 560 C 400 470 800 520 1100 570 C 1400 620 1700 520 1920 560 V1080 H0 Z" fill="${h1}"/><path d="M0 700 C 500 620 1000 680 1920 640 V1080 H0 Z" fill="${h2}"/>` + flowers +
    `<path d="M600 300 q20 -30 40 0 q20 -30 40 0 M760 240 q14 -20 28 0 q14 -20 28 0" fill="none" stroke="${pal.ink}" stroke-width="6" stroke-linecap="round"/>` + motif(th, 1700, 700, 140, { fill: h3, stroke: h3, sw: 2, opacity: 0.85 });
}
function underwater(p, pal, th, w, h) {
  const rnd = rng(23), [a0, a1, a2, a3] = pal.acc;
  let bubbles = "", rays = "", weeds = "";
  for (let i = 0; i < 26; i++) bubbles += `<circle cx="${r1(rnd() * w)}" cy="${r1(80 + rnd() * 900)}" r="${r1(6 + rnd() * 18)}" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="3"/>`;
  for (let i = 0; i < 6; i++) rays += `<path d="M${100 + i * 170} 0 l120 0 l${-60 + i * 30} 1000 l-60 0 z" fill="#ffffff" opacity=".07"/>`;
  for (let i = 0; i < 9; i++) { const x = 40 + i * 125; weeds += `<path d="M${x} 1350 C ${x - 40} 1240 ${x + 40} 1160 ${x} 1060 C ${x + 30} 1150 ${x - 10} 1250 ${x + 24} 1350 Z" fill="${pal.hills[i % 3]}"/>`; }
  const fishAt = (x, y, s, c, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M-60 0 C -30 -40 40 -40 60 0 C 40 40 -30 40 -60 0 Z" fill="${c}"/><path d="M58 0 L100 -30 L100 30 Z" fill="${c}"/><circle cx="-34" cy="-6" r="7" fill="#ffffff"/><circle cx="-34" cy="-6" r="3.5" fill="${pal.ink}"/></g>`;
  return `<defs><linearGradient id="${p}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.night[1]}"/><stop offset="1" stop-color="${pal.night[0]}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}sea)"/>` + rays + `<path d="M0 1200 C 300 1150 700 1170 1080 1210 V1350 H0 Z" fill="${pal.sky[3]}" opacity=".9"/>` + weeds +
    `<path d="M700 1220 c-20 -90 40 -140 60 -60 c20 -90 90 -60 70 20 c60 -40 100 20 60 60 z" fill="${a0}"/>` +
    fishAt(300, 400, 1.6, a1, false) + fishAt(760, 620, 1.2, a2, true) + fishAt(420, 860, 1, a3, false) + bubbles + motif(th, 820, 180, 160, { fill: a3, stroke: a3, sw: 2, opacity: 0.8 });
}
function cityDusk(p, pal, th, w, h) {
  const [s0, s1, s2] = pal.sky, rnd = rng(31);
  let back = "", front = "", wins = "";
  for (let i = 0; i < 14; i++) { const bw = 100 + rnd() * 70, x = i * 140 - 20, bh = 260 + rnd() * 300; back += `<rect x="${r1(x)}" y="${r1(1080 - 200 - bh)}" width="${r1(bw)}" height="${r1(bh + 200)}" fill="${pal.night[1]}" opacity=".75"/>`; }
  for (let i = 0; i < 10; i++) {
    const bw = 150 + rnd() * 80, x = i * 200 - 10, bh = 200 + rnd() * 380, top = 1080 - 120 - bh;
    front += `<rect x="${r1(x)}" y="${r1(top)}" width="${r1(bw)}" height="${r1(bh + 120)}" fill="${pal.night[0]}"/>`;
    for (let yy = top + 30; yy < 960; yy += 54) for (let xx = x + 22; xx < x + bw - 30; xx += 46) if (rnd() > (LW.thumb ? 0.78 : 0.45)) wins += `<rect x="${r1(xx)}" y="${r1(yy)}" width="22" height="30" rx="3" fill="${pal.acc[3]}" opacity="${r1(0.55 + rnd() * 0.45)}"/>`;
  }
  return `<defs><linearGradient id="${p}dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.night[0]}"/><stop offset=".55" stop-color="${s0}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}dusk)"/><circle cx="1500" cy="260" r="70" fill="#fff4c4"/>` + back + front + wins +
    `<rect y="960" width="${w}" height="120" fill="#000000" opacity=".55"/>` + ring(9, (a, i) => `<rect x="${60 + i * 210}" y="1012" width="100" height="10" rx="5" fill="${s2}" opacity=".7"/>`) +
    motif(th, 120, 120, 130, { fill: "#ffffff", stroke: "#ffffff", sw: 2, opacity: 0.25 });
}
function autumnTree(p, pal, th, w, h) {
  const rnd = rng(37), [h1, h2, h3] = pal.hills, warm = ["#ea580c", "#dc2626", "#f59e0b", pal.acc[1]]; // autumn leaves stay warm in every palette
  let leaves = "";
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()), x = 540 + Math.cos(a) * 380 * d, y = 470 + Math.sin(a) * 300 * d; leaves += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(50 + rnd() * 40)}" fill="${warm[i % 4]}" opacity=".9"/>`; }
  let falling = "";
  for (let i = 0; i < 18; i++) { const x = rnd() * w, y = 800 + rnd() * 480; falling += `<path d="M0 0 C 10 -14 26 -14 30 0 C 26 14 10 14 0 0 Z" transform="translate(${r1(x)} ${r1(y)}) rotate(${Math.round(rnd() * 360)})" fill="${warm[i % 4]}"/>`; }
  return `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[3]}"/><stop offset="1" stop-color="${pal.sky[2]}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}sky)"/><path d="M0 1120 C 300 1060 800 1080 1080 1120 V1350 H0 Z" fill="${h1}"/>` +
    `<path d="M470 1160 C 490 980 480 860 460 720 C 420 660 360 640 320 650 C 380 620 440 640 480 690 L 500 600 L 560 600 C 560 680 580 650 640 610 C 700 580 760 600 790 620 C 740 630 680 660 610 740 C 590 880 590 1000 620 1160 Z" fill="${pal.ink}"/>` +
    leaves + falling + `<path d="M0 1240 C 300 1210 800 1220 1080 1250 V1350 H0 Z" fill="${h2}"/>` + motif(th, 860, 1150, 130, { fill: h3, stroke: h3, sw: 2, opacity: 0.85 });
}

/* ---------- colouring sheets that fill the frame (round 3) ---------- */
function motifGrid(p, pal, th) {
  let out = "";
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const x = 60 + c * 340, y = 40 + r * 440;
    out += `<rect x="${x}" y="${y}" width="300" height="400" rx="26" ${line(pal, 5)}/>` + motif(th, x + 35, y + 48, 230, { stroke: pal.ink, sw: 7, rot: (r * 3 + c) % 2 ? 8 : -8 });
    out += `<line x1="${x + 40}" y1="${y + 352}" x2="${x + 260}" y2="${y + 352}" stroke="${pal.ink}" stroke-width="3" stroke-dasharray="10 10"/>`;
  }
  return out;
}
function bigMotif(p, pal, th) {
  return motif(th, 150, 140, 780, { stroke: pal.ink, sw: 9 }) +
    ring(10, (a) => `<circle cx="${r1(540 + Math.cos((a * Math.PI) / 180) * 500)}" cy="${r1(540 + Math.sin((a * Math.PI) / 180) * 500)}" r="24" ${line(pal, 5)}/>`);
}

/* ================================================================ premium building blocks (kit based) */
// Photo topics per theme (the shared library ranks photos by these words; the seed is the template id).
const PHOTO_TOPIC = {
  animals: "cat horse bird kingfisher animal pet", space: "nebula space earth stars planet", ocean: "sea beach waves island coast", garden: "flowers flower garden tulip dahlia cosmos",
  city: "city skyline architecture building", holidays: "celebration festive confetti bokeh lights", school: "books education classroom pencils library",
  birthday: "celebration party confetti balloons cake", sports: "sport football tennis basketball fitness", food: "food fruit fruits pizza breakfast",
};
// Photos that really match the words (tag or theme hits only, best first; the seed orders equally good ones), so a
// template always shows on-topic photos; falls back to the library's own ranking when nothing matches.
function onTopic(words, seed) {
  const ws = String(words).toLowerCase().split(/\s+/).filter(Boolean);
  const sc = [];
  for (const p of PHOTOS) { let s = 0; for (const w of ws) { if (p.tags?.includes(w)) s += 2; if (p.theme === w) s += 2; } if (s) sc.push([s, hash(seed + "|" + p.id), p]); }
  sc.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return sc.map((x) => x[2]);
}
const R = (x, y, w, h, fill, rx = 0, ex = "") => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${rx ? ` rx="${r1(rx)}"` : ""} fill="${fill}"${ex}/>`;
const C = (cx, cy, r, fill, ex = "") => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${fill}"${ex}/>`;
const tx = (x, y, s, o) => ktext(x, y, s, o);
const rot = (deg, cx, cy, body) => (deg ? `<g transform="rotate(${deg} ${r1(cx)} ${r1(cy)})">${body}</g>` : body);
const tint = (c, t = 0.85) => mix(c, "#ffffff", t);
const hline = (x1, x2, y, col, sw = 3, ex = "") => `<path d="M${r1(x1)} ${r1(y)}H${r1(x2)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" fill="none"${ex}/>`;

function ctxOf(t, size, salt) {
  const L = LBY.get(t.layout), pal = PBY.get(t.palette), th = TBY.get(t.theme), K = kit(t.id, salt);
  const topic = PHOTO_TOPIC[th.id] || "nature";
  return {
    K, L, pal, th, w: L.w, h: L.h, size, id: t.id, p: `${salt}-${safe(t.id)}-`, topic,
    pic: (n = 0, tp = topic) => { const r = onTopic(tp, t.id); return r.length ? r[n % r.length] : pickPhoto(tp, `${t.id}:${n}`); },
    pics: (n, tp = topic) => { const r = onTopic(tp, t.id); return r.length >= n ? r.slice(0, n) : [...r, ...Array.from({ length: n - r.length }, (_, i) => pickPhoto(tp, `${t.id}:x${i}`))]; },
    photo: (ph, x, y, w, h, o = {}) => K.photo(ph, x, y, w, h, { size, fallback: tint(pal.acc[0], 0.6), ...o }),
  };
}
const paper = (c) => R(0, 0, c.w, c.h, c.K.lin([c.pal.paper, tint(c.pal.sky[3], 0.4)], 65));
const card = (c, x, y, w, h, fill = "#ffffff", rx = 18, sh = [8, 20, 0.16]) => R(x, y, w, h, fill, rx, c.K.shadow(...sh));
const badge = (x, y, n, col, r = 22) => C(x, y, r, col) + tx(x, y + r * 0.36, String(n), { size: r, weight: 900, fill: "#ffffff", anchor: "middle" });

/** Gradient title band: eyebrow, heavy one-line title, optional line under it. */
function titleBand(c, x, y, w, h, o = {}) {
  const { K, pal } = c, ink = o.ink || "#ffffff", mid = o.align === "middle", rx = o.rx ?? Math.min(h / 2, 40);
  let s = R(x, y, w, h, o.fill || K.lin([mix(pal.acc[0], pal.ink, 0.12), mix(pal.acc[1], pal.ink, 0.08)], 0), rx, K.shadow(h * 0.06, h * 0.16, 0.25));
  s += `<g${K.clipRect(x, y, w, h, rx)}>` + C(x + w - h * 0.15, y + h * 0.05, h * 0.78, "#ffffff", ' opacity=".12"') + C(x + w - h * 1.05, y + h * 1.1, h * 0.5, "#ffffff", ' opacity=".1"') + `</g>`;
  const padX = o.padX ?? h * 0.36, maxW = w - padX * 2 - (o.reserve || 0);
  const eh = o.eyebrow ? h * 0.12 : 0, sh = o.sub ? h * 0.14 : 0;
  const hl = fit(o.title, maxW, { size: o.size || h * (o.sub && o.eyebrow ? 0.34 : o.sub || o.eyebrow ? 0.4 : 0.5), min: 14, maxLines: 1 });
  const total = (eh ? eh * 1.55 : 0) + hl.size * 0.74 + (sh ? sh * 1.75 : 0);
  let yy = y + (h - total) / 2;
  const ax = mid ? x + w / 2 : x + padX, anchor = mid ? "middle" : "start";
  if (o.eyebrow) { s += tx(ax, yy + eh * 0.85, o.eyebrow, { size: eh, weight: 800, fill: ink, opacity: 0.85, ls: eh * 0.14, upper: true, anchor }); yy += eh * 1.55; }
  s += tx(ax, yy + hl.size * 0.74, hl.lines[0], { size: hl.size, weight: 900, fill: ink, anchor, ls: -hl.size * 0.01 });
  yy += hl.size * 0.74;
  if (o.sub) { const f = fit(o.sub, maxW, { size: sh, min: 10, maxLines: 1 }); s += tx(ax, yy + sh * 1.6, f.lines[0], { size: f.size, weight: 600, fill: ink, opacity: 0.9, anchor }); }
  return s;
}
/** Taped photo print: { bg (paper + shadow), photo, art (tape + caption) }, all turned by `deg`. */
function photoCard(c, ph, x, y, w, h, { deg = 0, cap = "", pad = 18 } = {}) {
  const capH = cap ? Math.max(46, h * 0.12) : pad, cx = x + w / 2, cy = y + h / 2;
  const tape = (x0, y0, d) => R(x0, y0, w * 0.26, 34, c.pal.acc[3], 4, ` opacity=".78" transform="rotate(${d} ${r1(x0 + w * 0.13)} ${r1(y0 + 17)})"`);
  let capSvg = "";
  if (cap) { const f = fit(cap, w - pad * 2, { size: Math.min(28, capH * 0.52), min: 12, maxLines: 1 }); capSvg = tx(cx, y + h - capH / 2 + f.size * 0.36, f.lines[0], { size: f.size, weight: 700, fill: c.pal.ink, anchor: "middle" }); }
  return {
    bg: rot(deg, cx, cy, R(x, y, w, h, "#ffffff", 10, c.K.shadow(10, 22, 0.22))),
    photo: rot(deg, cx, cy, c.photo(ph, x + pad, y + pad, w - pad * 2, h - pad - capH, { rx: 6 })),
    art: rot(deg, cx, cy, tape(x + w * 0.06, y - 16, -8) + tape(x + w * 0.68, y - 14, 7) + capSvg),
  };
}

/* ---------- colouring pages: clean outlines inside a bold frame ---------- */
function colouringPage(c, art) {
  const { K, pal, th, w, h, L } = c, a = pal.acc, sq = h <= w;
  const bandH = sq ? 168 : 196, by = 60;
  let bg = R(0, 0, w, h, "#ffffff");
  bg += R(18, 18, w - 36, h - 36, "none", 48, ` stroke="${K.lin([a[0], a[1], a[2]], 0)}" stroke-width="18"`);
  bg += R(48, 48, w - 96, h - 96, "none", 30, ` stroke="${a[3]}" stroke-width="7" stroke-dasharray="0.1 18" stroke-linecap="round"`);
  bg += titleBand(c, 100, by, w - 200, bandH, { eyebrow: `Colouring page · ${th.label}`, title: L.title || th.title, align: "middle" });
  bg += [[70, 70, a[2]], [w - 70, 70, a[3]], [70, h - 70, a[3]], [w - 70, h - 70, a[2]]].map(([x, y, col]) => `<path d="${starPath(x, y, 30, 4, 0.36)}" fill="${col}"/>`).join("");
  const fy = h - (sq ? 96 : 108);
  bg += tx(104, fy + 11, "Name", { size: 30, weight: 800, fill: pal.ink }) + hline(196, 500, fy + 12, pal.ink, 3, ' opacity=".45"');
  bg += [a[0], a[1], a[2], a[3], pal.hills[0], pal.sky[1]].map((col, i) => C(w - 114 - i * 60, fy, 22, col, ' stroke="#ffffff" stroke-width="5"')).join("");
  const ax = 96, ay = by + bandH + 36, aw = w - 192, ah = fy - 44 - ay;
  const s = Math.min(aw / w, ah / h), ox = ax + (aw - w * s) / 2, oy = ay + (ah - h * s) / 2;
  LW.k = 1.55; let lines = "";
  try { lines = art(c.p, pal, th, w, h); } finally { LW.k = 1; }
  return { bg, art: `<g transform="translate(${r1(ox)} ${r1(oy)}) scale(${Math.round(s * 1000) / 1000})">${lines}</g>` };
}

/* ---------- canvas templates (guides on paper, reference photos) ---------- */
function sketchStudy(c) { // 1080 × 1080
  const { K, pal, th, w } = c, a = pal.acc;
  let bg = paper(c) + titleBand(c, 50, 44, w - 100, 168, { eyebrow: `${th.label} · sketch study`, title: "Look, then draw", sub: "Big shapes first, small details last" });
  const pc = photoCard(c, c.pic(0), 64, 272, 420, 548, { deg: -3, cap: "Reference photo" });
  bg += pc.bg + card(c, 520, 250, 510, 790) + R(544, 330, 462, 686, K.dots(pal.ink, 28, 2.4, 0.32), 12);
  let art = pc.art + K.pill(544, 268, "Your sketch", { size: 22, fill: a[0], color: "#ffffff", weight: 800 }).svg;
  art += [[544, 330, 1, 1], [1006, 330, -1, 1], [544, 1016, 1, -1], [1006, 1016, -1, -1]].map(([x, y, dx, dy]) => `<path d="M${x} ${y + dy * 34}V${y}H${x + dx * 34}" fill="none" stroke="${a[1]}" stroke-width="6" stroke-linecap="round"/>`).join("");
  ["Big shapes", "Light and shade", "Small details"].forEach((s, i) => { art += badge(92, 884 + i * 60, i + 1, a[i], 20) + tx(126, 893 + i * 60, s, { size: 28, weight: 700, fill: pal.ink }); });
  return { bg, photo: pc.photo, art };
}
function comicPage(c) { // 1080 × 1350
  const { K, pal, th, w, h } = c, a = pal.acc, ink = pal.ink;
  const P = [[40, 196, 600, 384], [664, 196, 376, 384], [40, 604, 1000, 330], [40, 958, 380, 352], [444, 958, 596, 352]];
  let bg = R(0, 0, w, h, K.lin([a[0], a[1]], 60)) + R(0, 0, w, h, K.dots("#ffffff", 22, 3, 0.2));
  bg += `<path d="${starPath(0, 0, 100, 18, 0.78)}" transform="translate(330 100) scale(2.9 .82)" fill="${a[3]}"${K.shadow(6, 12, 0.25)}/>`;
  bg += P.map(([x, y, pw, ph]) => R(x, y, pw, ph, "#ffffff", 0, K.shadow(8, 14, 0.25))).join("");
  bg += R(664, 196, 376, 384, K.dots(a[0], 18, 3.2, 0.28)) + R(444, 958, 596, 352, K.dots(a[1], 18, 3.2, 0.22));
  const f = fit(`${th.title}!`, 540, { size: 76, min: 36, maxLines: 1 });
  let art = tx(330, 100 + f.size * 0.36, f.lines[0], { size: f.size, weight: 900, fill: "#ffffff", anchor: "middle", stroke: ink, sw: 9 });
  art += K.pill(w - 52, 74, "Episode 1", { size: 24, fill: ink, color: "#ffffff", anchor: "end", upper: true, ls: 2, weight: 800 }).svg;
  art += P.map(([x, y, pw, ph]) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="none" stroke="${ink}" stroke-width="8"/>`).join("");
  art += `<g transform="translate(0 150)"><path d="M120 110 h360 a40 40 0 0 1 40 40 v70 a40 40 0 0 1 -40 40 h-250 l-60 50 l14 -50 h-64 a40 40 0 0 1 -40 -40 v-70 a40 40 0 0 1 40 -40z" fill="#ffffff" stroke="${ink}" stroke-width="5"/>` +
    tx(300, 198, "Did you see that?", { size: 36, weight: 800, fill: ink, anchor: "middle" }) + `</g>`;
  art += `<ellipse cx="860" cy="690" rx="165" ry="54" fill="#ffffff" stroke="${ink}" stroke-width="5"/><circle cx="790" cy="760" r="14" fill="#ffffff" stroke="${ink}" stroke-width="4"/><circle cx="764" cy="788" r="8" fill="#ffffff" stroke="${ink}" stroke-width="4"/>` +
    tx(860, 700, "Hmm, what next?", { size: 26, weight: 700, fill: ink, anchor: "middle" });
  art += `<path d="${starPath(840, 1150, 120, 12, 0.62)}" fill="${a[3]}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>` +
    tx(840, 1166, "WHOOSH!", { size: 44, weight: 900, fill: ink, anchor: "middle", ex: ' transform="rotate(-8 840 1150)"' });
  art += `<path d="M520 1000 l40 60 l-56 0 l44 70" fill="none" stroke="${a[2]}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>`;
  art += motif(th, 740, 270, 220, { stroke: ink, sw: 6, opacity: 0.55 }) + motif(th, 120, 1040, 200, { stroke: a[0], sw: 6, opacity: 0.6, rot: -10 });
  return { bg, art };
}
function storyboard(c) { // 1920 × 1080
  const { K, pal, th, w } = c, a = pal.acc, ink = pal.ink, fw = 520, fh = 292, gx = 90, top = 214, rowH = 432;
  let bg = paper(c), photo = "", art = "";
  bg += K.pill(gx, 36, `Project: ${th.title}`, { size: 22, fill: a[0], color: "#ffffff", weight: 800 }).svg + tx(gx, 166, "Storyboard", { size: 88, weight: 900, fill: ink, ls: -1.5 });
  let xr = w - gx;
  for (const s of ["30 sec", "6 shots", "Scene 1"]) { const pl = K.pill(xr, 112, s, { size: 24, fill: "#ffffff", color: ink, stroke: tint(ink, 0.7), anchor: "end", weight: 800 }); bg += pl.svg; xr -= pl.w + 14; }
  for (let i = 0; i < 6; i++) {
    const x = gx + (i % 3) * (fw + gx), y = top + Math.floor(i / 3) * rowH, col = a[i % 4];
    bg += card(c, x - 14, y - 14, fw + 28, fh + 124) + R(x, y, fw, fh, tint(col, 0.88), 10);
    if (!i) { photo += c.photo(c.pic(0), x, y, fw, fh, { rx: 10 }); art += K.pill(x + fw - 16, y + 16, "Reference", { size: 20, fill: "#ffffff", color: ink, anchor: "end", weight: 800 }).svg; }
    art += badge(x + 32, y + 32, i + 1, col, 22);
    art += tx(x, y + fh + 44, "ACTION", { size: 18, weight: 800, fill: col, ls: 2 }) + hline(x + 104, x + fw, y + fh + 42, ink, 2.5, ' opacity=".3"');
    art += tx(x, y + fh + 90, "DIALOGUE", { size: 18, weight: 800, fill: col, ls: 2 }) + hline(x + 124, x + fw, y + fh + 88, ink, 2.5, ' opacity=".3"');
  }
  return { bg, photo, art };
}
function perspectiveSheet(c) { // 1920 × 1080
  const { K, pal, th, w } = c, a = pal.acc, ink = pal.ink, hy = 470, vps = [[320, hy], [w - 320, hy]];
  let bg = paper(c) + `<line x1="0" y1="${hy}" x2="${w}" y2="${hy}" stroke="${a[0]}" stroke-width="5"/>`;
  let d = "";
  for (const [vx, vy] of vps) for (let g = -84; g <= 84; g += 7) { const rad = (g * Math.PI) / 180; d += `M${vx} ${vy}L${r1(vx + Math.cos(rad) * 2600 * (vx < w / 2 ? 1 : -1))} ${r1(vy + Math.sin(rad) * 2600)}`; }
  bg += `<path d="${d}" stroke="${a[0]}" stroke-opacity=".3" stroke-width="2" fill="none"/>` + vps.map(([vx, vy]) => C(vx, vy, 12, a[0])).join("");
  bg += card(c, 60, 44, 720, 180) + tx(96, 96, "Drawing practice", { size: 22, weight: 800, fill: a[0], ls: 3, upper: true }) + tx(96, 160, "Two-point perspective", { size: 54, weight: 900, fill: ink, ls: -1 }) + tx(98, 200, `Theme: ${th.title}`, { size: 24, weight: 600, fill: ink, opacity: 0.7 });
  const pc = photoCard(c, c.pic(0, "city architecture building"), 70, 650, 470, 370, { deg: -2, cap: "Reference: corners and edges" });
  bg += pc.bg;
  let art = `<path d="M760 760 L960 640 L1160 760 L960 860 Z" fill="${tint(a[3], 0.35)}"/><path d="M760 760 L960 860 L960 1060 L760 980 Z" fill="${tint(a[0], 0.45)}"/><path d="M960 860 L1160 760 L1160 980 L960 1060 Z" fill="${tint(a[0], 0.15)}"/>` +
    `<path d="M760 760 L960 640 L1160 760 L1160 980 L960 1060 L760 980 Z M760 760 L960 860 L1160 760 M960 860 V1060" fill="none" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  art += K.pill(320, hy - 70, "VP 1", { size: 22, fill: ink, color: "#ffffff", anchor: "middle", weight: 800 }).svg + K.pill(w - 320, hy - 70, "VP 2", { size: 22, fill: ink, color: "#ffffff", anchor: "middle", weight: 800 }).svg;
  art += K.pill(w - 60, hy + 16, "Horizon line", { size: 20, fill: a[0], color: "#ffffff", anchor: "end", weight: 800 }).svg;
  return { bg, photo: pc.photo, art: pc.art + art };
}
function journalPage(c) { // 1080 × 1350
  const { K, pal, th, w, h } = c, a = pal.acc, ink = pal.ink;
  let bg = paper(c);
  for (let y = 474; y < h - 50; y += 54) bg += hline(60, w - 60, y, a[2], 2.5, ' opacity=".5"');
  bg += `<line x1="128" y1="400" x2="128" y2="${h}" stroke="${a[1]}" stroke-opacity=".7" stroke-width="3"/>`;
  const photo = c.photo(c.pic(0), 0, 0, w, 400) + c.K.scrim(0, 100, w, 300, "#05070f", 0, 0.8);
  let art = K.pill(64, 52, "My journal", { size: 24, fill: a[0], color: "#ffffff", upper: true, ls: 2, weight: 800 }).svg;
  art += headline(64, 214, 640, th.title, { size: 96, min: 44, maxLines: 1, weight: 900, fill: "#ffffff", ls: -1 }).svg;
  art += tx(66, 360, "Date ______________", { size: 28, weight: 600, fill: "#ffffff", opacity: 0.9 });
  art += rot(4, 895, 405, R(770, 300, 250, 210, tint(a[3], 0.25), 6, K.shadow(8, 16, 0.25)) + tx(796, 356, ["Three good", "things today"], { size: 28, weight: 900, fill: ink, lh: 1.15 }) +
    [0, 1, 2].map((i) => C(800, 428 + i * 30, 6, a[i]) + hline(816, 994, 430 + i * 30, ink, 2, ' opacity=".35"')).join(""));
  return { bg, photo, art };
}
function sketchFrames(c) { // 1920 × 1080
  const { K, pal, th, w } = c, a = pal.acc, ink = pal.ink, ps = c.pics(4);
  let bg = paper(c) + tx(80, 128, "Draw what you see", { size: 80, weight: 900, fill: ink, ls: -1.5 }) + tx(84, 176, "Copy each photo into the frame beside it", { size: 30, weight: 600, fill: ink, opacity: 0.7 });
  bg += K.pill(w - 80, 84, `${th.label} set`, { size: 26, fill: a[0], color: "#ffffff", anchor: "end", weight: 800 }).svg;
  let photo = "", art = "";
  for (let i = 0; i < 4; i++) {
    const x = 70 + (i % 2) * 910, y = 216 + Math.floor(i / 2) * 428;
    bg += card(c, x, y, 870, 396) + R(x + 370, y + 20, 480, 356, tint(a[i], 0.93), 12, ` stroke="${a[i]}" stroke-width="4" stroke-dasharray="14 10"`);
    photo += c.photo(ps[i], x + 20, y + 20, 330, 356, { rx: 12 });
    art += badge(x + 46, y + 46, i + 1, a[i], 22) + tx(x + 832, y + 358, th.words[i], { size: 28, weight: 800, fill: a[i], anchor: "end" });
  }
  return { bg, photo, art };
}
function letterTracing(c) { // 1080 × 1350
  const { pal, th, w } = c, a = pal.acc, ink = pal.ink;
  const letters = [...new Set(th.words.join("").toUpperCase().replace(/[^A-Z]/g, ""))].slice(0, 6);
  let bg = paper(c) + titleBand(c, 50, 40, w - 100, 176, { eyebrow: `${th.label} · alphabet`, title: "Trace the letters", sub: "Big letter first, then the small one" });
  let art = "";
  letters.forEach((ch, i) => {
    const y0 = 262 + i * 172;
    bg += R(50, y0, w - 100, 156, tint(a[i % 4], 0.9), 26);
    art += hline(70, w - 70, y0 + 46, a[0], 3) + `<line x1="70" y1="${y0 + 82}" x2="${w - 70}" y2="${y0 + 82}" stroke="${a[0]}" stroke-width="2" stroke-dasharray="14 10" opacity=".7"/>` + hline(70, w - 70, y0 + 136, a[0], 3);
    for (let kk = 0; kk < 5; kk++) {
      const L = esc(kk % 2 ? ch.toLowerCase() : ch);
      art += kk ? `<text x="${160 + kk * 190}" y="${y0 + 136}" text-anchor="middle" ${FONT} font-size="120" font-weight="700" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="10 9" opacity=".55">${L}</text>`
        : `<text x="160" y="${y0 + 136}" text-anchor="middle" ${FONT} font-size="120" font-weight="900" fill="${a[1]}">${L}</text>`;
    }
  });
  return { bg, art };
}
function numberTracing(c) { // 1080 × 1350
  const { pal, th, w } = c, a = pal.acc, ink = pal.ink;
  let bg = paper(c) + titleBand(c, 50, 40, w - 100, 176, { eyebrow: `${th.label} · numbers`, title: "Trace and count", sub: "Trace the number, then colour the dots" });
  let art = "";
  for (let n = 1; n <= 10; n++) {
    const x = 50 + ((n - 1) % 2) * 500, y = 250 + Math.floor((n - 1) / 2) * 212;
    bg += card(c, x, y, 480, 192, tint(a[n % 4], 0.88), 24, [4, 10, 0.12]);
    art += `<text x="${x + 105}" y="${y + 160}" text-anchor="middle" ${FONT} font-size="${n > 9 ? 110 : 150}" font-weight="700" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="10 9">${n}</text>`;
    for (let d = 0; d < n; d++) art += C(x + 236 + (d % 5) * 46, y + 66 + Math.floor(d / 5) * 66, 17, "#ffffff", ` stroke="${a[(n + 1) % 4]}" stroke-width="4"`);
  }
  return { bg, art };
}
function handwriting(c) { // 1080 × 1350
  const { K, pal, th, w, h } = c, a = pal.acc, ink = pal.ink;
  let bg = paper(c) + card(c, 50, 40, w - 100, 214) + C(157, 147, 92, K.lin([a[0], a[1]], 45));
  const photo = c.photo(c.pic(0), 76, 66, 162, 162, { clip: `<circle cx="157" cy="147" r="81"/>` });
  let art = tx(272, 104, th.title, { size: 24, weight: 800, fill: a[0], upper: true, ls: 2 }) + tx(270, 168, "Handwriting practice", { size: 56, weight: 900, fill: ink, ls: -1 }) +
    tx(272, 222, "Name ____________   Date ________", { size: 24, weight: 600, fill: ink, opacity: 0.7 });
  for (let y = 330; y < h - 120; y += 150) {
    bg += hline(60, w - 60, y, ink, 3, ' opacity=".5"') + `<line x1="60" y1="${y + 45}" x2="${w - 60}" y2="${y + 45}" stroke="${a[0]}" stroke-width="2.5" stroke-dasharray="12 10"/>` +
      hline(60, w - 60, y + 90, ink, 3, ' opacity=".5"') + hline(60, w - 60, y + 120, a[1], 2, ' opacity=".3"');
  }
  art += tx(80, 416, `${th.words[0]} and ${th.words[1].toLowerCase()}`, { size: 86, weight: 500, fill: ink, opacity: 0.28 });
  return { bg, photo, art };
}
function letteringGuide(c) { // 1080 × 1350
  const { K, pal, th, w, h } = c, a = pal.acc, cid = `${c.p}cal`;
  let bg = paper(c) + R(40, 40, w - 80, 236, K.lin([pal.night[0], pal.night[1]], 0), 32, K.shadow(10, 22, 0.25));
  let art = tx(84, 104, "Lettering practice", { size: 26, weight: 800, fill: a[3], upper: true, ls: 4 }) +
    tx(84, 228, th.words[0], { size: 118, weight: 700, fill: "#ffffff", font: "serif", italic: true }) + tx(w - 84, 226, "Aa Bb Cc", { size: 48, weight: 700, fill: "#ffffff", font: "serif", italic: true, anchor: "end", opacity: 0.6 });
  bg += `<defs><clipPath id="${cid}"><rect x="60" y="320" width="${w - 120}" height="${h - 370}"/></clipPath></defs><g clip-path="url(#${cid})">`;
  for (let y = 330; y < h - 200; y += 210) {
    bg += R(60, y + 60, w - 120, 80, a[0], 0, ' opacity=".08"') + hline(60, w - 60, y, a[0], 2, ' opacity=".5"') + hline(60, w - 60, y + 60, a[0], 3) + hline(60, w - 60, y + 140, a[0], 3) + hline(60, w - 60, y + 200, a[0], 2, ' opacity=".5"');
  }
  for (let x = -h; x < w + 200; x += 70) bg += `<line x1="${x}" y1="${h}" x2="${r1(x + h * 0.7)}" y2="0" stroke="${a[1]}" stroke-opacity=".25" stroke-width="2"/>`;
  bg += `</g>`;
  art += tx(84, 470, th.words[0], { size: 124, weight: 700, fill: a[0], font: "serif", italic: true }) + K.pill(w - 70, 352, "Your turn below", { size: 20, fill: a[0], color: "#ffffff", anchor: "end", weight: 800 }).svg;
  return { bg, art };
}
function musicStaff(c) { // 1080 × 1350
  const { pal, th, w } = c, a = pal.acc, ink = pal.ink;
  let bg = paper(c) + titleBand(c, 50, 40, w - 100, 186, { eyebrow: `${th.title} · song sheet`, title: "A new song", sub: "Words and music by ________________", reserve: 150 });
  let art = kicon("music", w - 230, 70, 124, "#ffffff", 2.4);
  let d = "", e = "";
  for (let s = 0; s < 9; s++) {
    const y = 300 + s * 110;
    for (let l = 0; l < 5; l++) d += `M70 ${y + l * 16}H${w - 70}`;
    for (let b = 0; b <= 4; b++) { const seg = `M${r1(70 + ((w - 140) * b) / 4)} ${y}V${y + 64}`; if (b % 4) d += seg; else e += seg; }
  }
  bg += `<path d="${d}" stroke="${ink}" stroke-width="2" fill="none"/><path d="${e}" stroke="${ink}" stroke-width="3.5" fill="none"/>`;
  [[150, 332], [230, 316], [320, 340], [400, 324]].forEach(([x, y], i) => { art += `<ellipse cx="${x}" cy="${y}" rx="15" ry="11" transform="rotate(-20 ${x} ${y})" fill="${a[i]}"/><path d="M${x + 13} ${y - 4}V${y - 62}" stroke="${a[i]}" stroke-width="4"/>`; });
  return { bg, art };
}
function isometricSheet(c) { // 1920 × 1080
  const { K, pal, th, w, h } = c, a = pal.acc, ink = pal.ink, step = LW.thumb ? 120 : 60, t30 = Math.tan(Math.PI / 6);
  let bg = paper(c);
  let d = "";
  for (let x = 0; x <= w; x += step * Math.cos(Math.PI / 6) * 2) d += `M${r1(x)} 0V${h}`;
  for (let cc = -w; cc < h + w; cc += step) d += `M0 ${r1(cc)}L${w} ${r1(cc + w * t30)}M0 ${r1(cc)}L${w} ${r1(cc - w * t30)}`;
  bg += `<path d="${d}" stroke="${a[0]}" stroke-opacity=".28" stroke-width="1.5" fill="none"/>`;
  bg += card(c, 60, 44, 720, 180) + tx(96, 96, th.title, { size: 22, weight: 800, fill: a[0], ls: 3, upper: true }) + tx(96, 160, "Isometric grid", { size: 58, weight: 900, fill: ink, ls: -1 }) + tx(98, 200, "Draw boxes, rooms and tiny towns", { size: 24, weight: 600, fill: ink, opacity: 0.7 });
  const pc = photoCard(c, c.pic(0, "city architecture building"), 70, 660, 430, 360, { deg: 2, cap: "Reference" });
  bg += pc.bg;
  const cube = (cx, cy, s, hg, col) => {
    const d = s * 0.866, t = cy - hg;
    return `<path d="M${r1(cx)} ${r1(t - s / 2)}L${r1(cx + d)} ${r1(t)}L${r1(cx)} ${r1(t + s / 2)}L${r1(cx - d)} ${r1(t)}Z" fill="${tint(col, 0.55)}"/>` +
      `<path d="M${r1(cx - d)} ${r1(t)}L${r1(cx)} ${r1(t + s / 2)}L${r1(cx)} ${r1(cy + s / 2)}L${r1(cx - d)} ${r1(cy)}Z" fill="${col}"/>` +
      `<path d="M${r1(cx + d)} ${r1(t)}L${r1(cx)} ${r1(t + s / 2)}L${r1(cx)} ${r1(cy + s / 2)}L${r1(cx + d)} ${r1(cy)}Z" fill="${mix(col, ink, 0.3)}"/>` +
      `<path d="M${r1(cx)} ${r1(t - s / 2)}L${r1(cx + d)} ${r1(t)}L${r1(cx + d)} ${r1(cy)}L${r1(cx)} ${r1(cy + s / 2)}L${r1(cx - d)} ${r1(cy)}L${r1(cx - d)} ${r1(t)}Z M${r1(cx - d)} ${r1(t)}L${r1(cx)} ${r1(t + s / 2)}L${r1(cx + d)} ${r1(t)}M${r1(cx)} ${r1(t + s / 2)}V${r1(cy + s / 2)}" fill="none" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  };
  const art = pc.art + `<g${K.shadow(10, 18, 0.2)}>` + [[1460, 760, 104, 260, a[0]], [1650, 830, 104, 170, a[1]], [1280, 850, 104, 140, a[2]], [1470, 940, 104, 90, a[3]], [1740, 960, 80, 60, a[2]]].map((b) => cube(...b)).join("") + `</g>`;
  return { bg, photo: pc.photo, art };
}
function dotJournal(c) { // 1080 × 1350
  const { K, pal, th, w } = c, a = pal.acc, ink = pal.ink;
  let bg = paper(c) + card(c, 50, 44, w - 100, 250);
  const photo = c.photo(c.pic(0), 70, 64, 330, 210, { rx: 14 });
  let art = tx(430, 110, "Weekly planner", { size: 22, weight: 800, fill: a[0], upper: true, ls: 3 }) + headline(430, 126, 560, th.title, { size: 70, min: 36, maxLines: 1, weight: 900, fill: ink, ls: -1 }).svg +
    tx(432, 250, "Week of ____________", { size: 26, weight: 600, fill: ink, opacity: 0.7 });
  bg += card(c, 50, 330, 650, 970) + R(70, 350, 610, 930, K.dots(ink, 30, 2.3, 0.32), 10);
  bg += card(c, 730, 330, 300, 300) + card(c, 730, 660, 300, 330) + card(c, 730, 1020, 300, 280);
  art += tx(756, 380, "Key", { size: 30, weight: 900, fill: ink });
  ["Task", "Event", "Note", "Idea"].forEach((s, i) => { art += C(772, 428 + i * 50, 11, a[i]) + tx(796, 437 + i * 50, s, { size: 26, weight: 600, fill: ink }); });
  art += tx(756, 710, "Top 3 today", { size: 30, weight: 900, fill: ink });
  for (let i = 0; i < 3; i++) art += R(758, 748 + i * 72, 30, 30, "#ffffff", 7, ` stroke="${a[i]}" stroke-width="4"`) + hline(804, 1000, 776 + i * 72, ink, 2, ' opacity=".35"');
  art += tx(756, 1070, "Mood", { size: 30, weight: 900, fill: ink }) + [a[0], a[1], a[2], a[3], pal.hills[0]].map((col, i) => C(776 + i * 54, 1140, 20, col)).join("") +
    tx(756, 1230, "Sleep ____ h", { size: 24, weight: 600, fill: ink, opacity: 0.75 });
  return { bg, photo, art };
}
function pixelArt(c) { // 1080 × 1080
  const { pal, th, w } = c, a = pal.acc, ink = pal.ink, n = 28, cell = 29, x0 = 60, y0 = 230;
  let bg = paper(c) + titleBand(c, 50, 40, w - 100, 150, { eyebrow: "8-bit art", title: `Pixel art: ${th.title}` });
  bg += card(c, x0 - 12, y0 - 12, n * cell + 24, n * cell + 24, "#ffffff", 14) + card(c, 896, y0 - 12, 134, n * cell + 24, "#ffffff", 14);
  let art = "";
  const sprite = (rows, ox, oy, cols) => rows.forEach((row, r) => [...row].forEach((v, cc) => { if (v !== "0") art += R(x0 + (ox + cc) * cell, y0 + (oy + r) * cell, cell, cell, cols[(+v - 1) % cols.length]); }));
  sprite(["01100110", "12211221", "12222221", "12222221", "01222210", "00122100", "00011000"], 2, 2, [a[0], mix(a[0], "#ffffff", 0.35)]);
  sprite(["0001000", "0012100", "1112111", "0122210", "0121210", "0100010"], 17, 15, [a[3], mix(a[3], ink, 0.25)]);
  const g1 = c.K.pattern(cell, cell, `<path d="M0 0H${cell}M0 0V${cell}" stroke="${ink}" stroke-opacity=".3" stroke-width="2.4" fill="none"/>`);
  const g7 = c.K.pattern(cell * 7, cell * 7, `<path d="M0 0H${cell * 7}M0 0V${cell * 7}" stroke="${ink}" stroke-opacity=".35" stroke-width="5.2" fill="none"/>`);
  art += `<g transform="translate(${x0} ${y0})">` + R(0, 0, n * cell + 1.5, n * cell + 1.5, g1) + R(0, 0, n * cell + 2.6, n * cell + 2.6, g7) + `</g>`;
  art += tx(963, 266, "Palette", { size: 20, weight: 800, fill: ink, anchor: "middle" });
  [a[0], a[1], a[2], a[3], pal.hills[0], pal.hills[1], pal.sky[1], ink].forEach((col, i) => { art += R(925, 284 + i * 92, 76, 76, col, 12); });
  return { bg, art };
}
function mangaPage(c) { // 1080 × 1350
  const { K, pal, th, w } = c, a = pal.acc, k = pal.ink, sw = 8;
  const g = (s) => `<g transform="translate(65 176) scale(.88)">${s}</g>`;
  const panels = ["M40 40 H1040 V380 L40 300 Z", "M40 330 L560 400 L480 820 L40 820 Z", "M590 404 L1040 410 V820 L510 820 Z", "M40 850 H640 L600 1310 H40 Z", "M670 850 H1040 V1310 H630 Z"];
  let bg = paper(c) + R(40, 36, w - 80, 116, k, 18, K.shadow(6, 14, 0.25));
  bg += g(panels.map((d, i) => `<path d="${d}" fill="#ffffff"/>` + (i === 1 || i === 4 ? `<path d="${d}" fill="${K.dots(k, 14, 2.6, 0.26)}"/>` : "")).join(""));
  let lines = panels.map((d) => `<path d="${d}" fill="none" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round"/>`).join("");
  for (let ang = 0; ang < 360; ang += 6) { const rad = (ang * Math.PI) / 180; lines += `<line x1="${r1(830 + Math.cos(rad) * 120)}" y1="${r1(620 + Math.sin(rad) * 90)}" x2="${r1(830 + Math.cos(rad) * 300)}" y2="${r1(620 + Math.sin(rad) * 220)}" stroke="${k}" stroke-opacity=".35" stroke-width="2"/>`; }
  lines += `<ellipse cx="300" cy="150" rx="190" ry="70" fill="#ffffff" stroke="${k}" stroke-width="5"/><path d="M360 214 l40 60 l-10 -66" fill="#ffffff" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>` +
    tx(300, 164, `${th.words[0]}!`, { size: 40, weight: 900, fill: k, anchor: "middle" }) +
    `<path d="M180 1000 l30 -60 l30 60 l60 -20 l-40 50 l50 40 l-70 0 l-20 60 l-20 -60 l-70 0 l50 -40 l-40 -50 z" fill="${tint(a[1], 0.5)}" stroke="${a[1]}" stroke-width="6" stroke-linejoin="round"/>` +
    motif(th, 760, 980, 220, { stroke: a[0], sw: 6, opacity: 0.5 });
  const art = tx(80, 118, "Chapter 1", { size: 62, weight: 900, fill: "#ffffff", ls: -1 }) + K.pill(w - 70, 70, th.title, { size: 26, fill: a[0], color: "#ffffff", anchor: "end", weight: 800 }).svg + g(lines);
  return { bg, art };
}
function turnaroundSheet(c) { // 1920 × 1080
  const { pal, th, w } = c, a = pal.acc, ink = pal.ink, views = ["Front", "Three-quarter", "Side", "Back"], x0 = 440, fw = 336, gap = 28;
  let bg = paper(c) + tx(70, 112, "Character turnaround", { size: 70, weight: 900, fill: ink, ls: -1.5 }) + tx(74, 160, `${th.title}: one character, four views`, { size: 28, weight: 600, fill: ink, opacity: 0.7 });
  const pc = photoCard(c, c.pic(0), 60, 214, 340, 470, { deg: -2, cap: "Character idea" });
  bg += pc.bg + card(c, 60, 724, 340, 316);
  let art = pc.art + tx(86, 776, "Notes", { size: 30, weight: 900, fill: ink }) + tx(86, 830, "Height: ___ heads", { size: 24, weight: 600, fill: ink, opacity: 0.8 }) +
    tx(86, 880, "Main colours", { size: 24, weight: 600, fill: ink, opacity: 0.8 }) + [a[0], a[1], a[2], a[3]].map((col, i) => C(104 + i * 56, 928, 20, col)).join("") + tx(86, 1000, "Shape: __________", { size: 24, weight: 600, fill: ink, opacity: 0.8 });
  views.forEach((v, i) => {
    const x = x0 + i * (fw + gap);
    bg += R(x, 200, fw, 820, "#ffffff", 20, ` stroke="${a[i]}" stroke-width="4"` + c.K.shadow(6, 14, 0.12));
    art += `<line x1="${x + fw / 2}" y1="214" x2="${x + fw / 2}" y2="1006" stroke="${a[i]}" stroke-opacity=".35" stroke-width="2"/>` + tx(x + fw / 2, 1058, v, { size: 30, weight: 800, fill: ink, anchor: "middle" }) + badge(x + 30, 230, i + 1, a[i], 18);
  });
  for (const [g, y] of [["Head", 290], ["Shoulders", 410], ["Waist", 600], ["Knees", 800], ["Feet", 990]]) art += `<line x1="${x0}" y1="${y}" x2="${w - 40}" y2="${y}" stroke="${a[1]}" stroke-opacity=".6" stroke-width="2.5" stroke-dasharray="16 10"/>` + tx(x0 + 60, y - 10, g, { size: 20, weight: 700, fill: a[1] });
  return { bg, photo: pc.photo, art };
}
function moodBoard(c) { // 1920 × 1080
  const { K, pal, th, w, h } = c, a = pal.acc, ink = pal.ink, ps = c.pics(5);
  let bg = R(0, 0, w, h, K.lin([pal.paper, tint(pal.sky[2], 0.55)], 30)) + R(0, 0, w, h, K.dots(ink, 26, 1.6, 0.12));
  bg += tx(80, 118, "Mood board", { size: 84, weight: 900, fill: ink, ls: -2 }) + tx(84, 166, th.title, { size: 32, weight: 700, fill: a[0] });
  let photo = "", art = "";
  [[80, 220, 520, 390, -3], [650, 150, 420, 320, 2], [1110, 190, 470, 350, -2], [650, 520, 420, 470, 3], [80, 652, 520, 380, 2]].forEach(([x, y, fw, fh, d], i) => {
    const pc = photoCard(c, ps[i], x, y, fw, fh, { deg: d, pad: 14 });
    bg += pc.bg; photo += pc.photo; art += pc.art;
  });
  bg += rot(-1, 1340, 705, card(c, 1140, 600, 400, 210)) + card(c, 1140, 850, 720, 170);
  art += rot(-1, 1340, 705, tx(1170, 650, "Colours", { size: 28, weight: 900, fill: ink }) + [a[0], a[1], a[2], a[3], pal.hills[0]].map((col, i) => C(1194 + i * 74, 726, 30, col) + tx(1194 + i * 74, 786, col.slice(1).toUpperCase(), { size: 13, weight: 700, fill: ink, anchor: "middle", opacity: 0.7 })).join(""));
  art += tx(1170, 900, "Words", { size: 28, weight: 900, fill: ink });
  let px = 1170;
  th.words.forEach((s, i) => { const pl = K.pill(px, 930, s, { size: 26, fill: tint(a[i], 0.8), color: ink, weight: 800 }); art += pl.svg; px += pl.w + 16; });
  art += rot(4, 1745, 350, R(1620, 200, 250, 300, tint(a[3], 0.3), 6, K.shadow(8, 16, 0.25)) + tx(1648, 262, ["Feel:", "bright,", "warm and", "playful"], { size: 34, weight: 900, fill: ink, lh: 1.15 }));
  return { bg, photo, art };
}

/* ---------- sample drawings (paintings with a poster title on its own layer) ---------- */
function painting(fn, o) {
  return (c) => {
    const { K, pal, w, h } = c, m = Math.min(w, h);
    let bg = fn(c.p, pal, c.th, w, h);
    if (o.glow) { const [gx, gy, gr] = o.glow; bg += C(gx, gy, gr, K.rad([["#ffffff", 0.55], ["#ffffff", 0]], 0.5, 0.5, 0.5)); }
    if (o.dots) bg += R(0, 0, w, h, K.dots("#ffffff", 34, 1.8, 0.16));
    bg += R(0, 0, w, h, K.rad([["#000000", 0], ["#000000", 0.3]], 0.5, 0.45, 0.85));
    const ink = o.under ? (isDark(o.under(pal)) ? "#ffffff" : pal.ink) : "#ffffff", light = ink === "#ffffff";
    let over = "", y = o.y;
    const ho = { size: o.size, min: o.size * 0.5, maxLines: 2, weight: 900, fill: ink, ls: -o.size * 0.012, ex: light ? K.shadow(3, 10, 0.45) : "" };
    if (o.bottom) { y = h - m * 0.07 - headline(o.x, 0, o.maxW, o.title, ho).h - m * 0.075; over += K.scrim(0, y - m * 0.18, w, h - y + m * 0.18, "#05070f", 0, 0.78); }
    const hl = headline(o.x, y, o.maxW, o.title, ho);
    over += hl.svg + K.pill(o.x, y + hl.h + m * 0.022, o.sub, { size: m * 0.024, fill: light ? "#ffffff" : pal.ink, color: light ? pal.ink : "#ffffff", weight: 800 }).svg;
    return { bg, over };
  };
}
function stickerSheet(c) { // 1080 × 1080
  const { K, pal, th, w, h } = c, a = pal.acc, ps = c.pics(3), rnd = rng(7);
  let bg = R(0, 0, w, h, K.lin([pal.paper, tint(pal.sky[2], 0.5)], 70)) + R(0, 0, w, h, K.dots(a[0], 30, 2, 0.18));
  bg += titleBand(c, 50, 40, w - 100, 140, { eyebrow: "Sticker sheet", title: `${th.title} stickers`, align: "middle" });
  let photo = "", art = "";
  for (let r = 0; r < 3; r++) for (let cc = 0; cc < 4; cc++) {
    const i = r * 4 + cc, x = 50 + cc * 250 + (r % 2) * 24, y = 222 + r * 280, col = a[i % 4], pi = [1, 6, 11].indexOf(i);
    if (pi >= 0) {
      bg += C(x + 104, y + 104, 104, "#ffffff", K.shadow(6, 12, 0.25));
      photo += c.photo(ps[pi], x + 12, y + 12, 184, 184, { clip: `<circle cx="${x + 104}" cy="${y + 104}" r="92"/>` });
    } else art += `<g${K.shadow(5, 10, 0.25)}>` + motif(th, x, y, 200, { fill: col, stroke: "#ffffff", sw: 12, rot: Math.round((rnd() - 0.5) * 30) }) + `</g>`;
  }
  return { bg, photo, art };
}
function greetingCard(c) { // 1080 × 1350
  const { K, pal, th, w, h } = c, a = pal.acc, rnd = rng(11);
  let bg = R(0, 0, w, h, K.lin([pal.sky[3], pal.sky[2]], 60));
  for (let i = 0; i < 40; i++) bg += C(rnd() * w, rnd() * h, 5 + rnd() * 9, a[i % 4], ' opacity=".75"');
  bg += R(60, 60, w - 120, 720, "#ffffff", 40, K.shadow(12, 26, 0.25));
  const photo = c.photo(c.pic(0), 78, 78, w - 156, 684, { rx: 30 });
  let art = card(c, 110, 670, w - 220, 600, "#ffffff", 36, [14, 30, 0.25]);
  const hl = headline(w / 2, 720, w - 300, th.title, { size: 96, min: 48, maxLines: 1, weight: 900, fill: a[0], anchor: "middle", ls: -1.5 });
  art += hl.svg + tx(w / 2, 720 + hl.h + 30, th.words.join(" · "), { size: 32, weight: 700, fill: pal.ink, anchor: "middle", opacity: 0.75 });
  art += tx(170, 932, "To:", { size: 30, weight: 800, fill: pal.ink }) + hline(230, 610, 934, pal.ink, 3, ' opacity=".35"');
  art += R(170, 980, w - 340, 230, tint(a[1], 0.92), 22, ` stroke="${a[1]}" stroke-width="4" stroke-dasharray="14 10"`) + tx(w / 2, 1104, "Draw your own picture here", { size: 30, weight: 700, fill: a[1], anchor: "middle" });
  art += motif(th, 40, 30, 180, { fill: a[1], stroke: "#ffffff", sw: 10, rot: -12 }) + motif(th, w - 210, 560, 170, { fill: a[2], stroke: "#ffffff", sw: 10, rot: 12 });
  return { bg, photo, art };
}

// kind: colouring = outlines in a frame (colour goes on a layer under the lines); canvas = guides on paper; full = whole painting.
const LAYOUTS_DEF = [
  { id: "colour-flower", label: "Flower colouring page", kind: "colouring", w: 1080, h: 1350, theme: "garden", tags: ["flower", "kids"], art: flower, title: "Bloom and colour" },
  { id: "night-sky", label: "Night sky poster", kind: "full", w: 1080, h: 1080, theme: "space", tags: ["moon", "stars", "night", "mountains", "poster"], build: painting(nightSky, { glow: [800, 240, 280], title: "Good night, stars", sub: "Add your own constellations", x: 70, y: 70, maxW: 620, size: 96 }) },
  { id: "dotted-sketch", label: "Sketch study with photo", kind: "canvas", w: 1080, h: 1080, theme: "school", tags: ["sketch", "dots", "grid", "notebook", "reference photo", "study"], build: sketchStudy },
  { id: "colour-mandala", label: "Mandala colouring page", kind: "colouring", w: 1080, h: 1080, theme: "garden", tags: ["mandala", "pattern", "relax"], art: mandala, title: "Calm mandala" },
  { id: "sunset-hills", label: "Golden hour poster", kind: "full", w: 1920, h: 1080, theme: "garden", tags: ["landscape", "sunset", "painting", "hills", "poster"], build: painting(sunset, { glow: [1180, 600, 460], title: "Golden hour", sub: "Paint the last light of the day", x: 120, y: 110, maxW: 980, size: 150, under: (pal) => pal.sky[0] }) },
  { id: "comic-page", label: "Comic strip page", kind: "canvas", w: 1080, h: 1350, theme: "space", tags: ["comic", "panels", "story", "speech bubble"], build: comicPage },
  { id: "colour-house", label: "House colouring page", kind: "colouring", w: 1080, h: 1350, theme: "city", tags: ["house", "home", "kids"], art: house, title: "Home sweet home" },
  { id: "sticker-sheet", label: "Sticker sheet", kind: "full", w: 1080, h: 1080, theme: "animals", tags: ["stickers", "cute", "icons", "photo stickers"], build: stickerSheet },
  { id: "storyboard", label: "Storyboard grid", kind: "canvas", w: 1920, h: 1080, theme: "city", tags: ["storyboard", "video", "frames", "scenes", "reference photo"], build: storyboard },
  { id: "colour-fish", label: "Fish colouring page", kind: "colouring", w: 1080, h: 1350, theme: "ocean", tags: ["fish", "sea", "kids"], art: fish, title: "Little fish" },
  { id: "greeting-card", label: "Photo greeting card", kind: "full", w: 1080, h: 1350, theme: "birthday", tags: ["card", "greeting", "celebration", "photo"], build: greetingCard },
  { id: "perspective-grid", label: "Perspective grid", kind: "canvas", w: 1920, h: 1080, theme: "city", tags: ["perspective", "vanishing point", "drawing practice", "reference photo"], build: perspectiveSheet },
  { id: "motif-grid", label: "Colouring sheet", kind: "colouring", w: 1080, h: 1350, theme: "animals", tags: ["colouring sheet", "grid", "kids"], art: motifGrid },
  { id: "journal-page", label: "Photo journal page", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["journal", "lines", "notes", "diary", "photo"], build: journalPage },
  { id: "big-motif", label: "Big picture colouring page", kind: "colouring", w: 1080, h: 1080, theme: "ocean", tags: ["big picture", "simple", "toddlers"], art: bigMotif },
  { id: "sketch-frames", label: "Photo sketch practice", kind: "canvas", w: 1920, h: 1080, theme: "sports", tags: ["practice", "frames", "sketchbook", "reference photo"], build: sketchFrames },
  // round 2: more distinct designs
  { id: "colour-butterfly", label: "Butterfly colouring page", kind: "colouring", w: 1080, h: 1350, theme: "garden", tags: ["butterfly", "insect", "kids"], art: butterfly, title: "Butterfly wings" },
  { id: "letter-tracing", label: "Letter tracing sheet", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["letters", "alphabet", "tracing", "handwriting", "kids"], build: letterTracing },
  { id: "mountain-lake", label: "Mountain lake poster", kind: "full", w: 1920, h: 1080, theme: "garden", tags: ["landscape", "mountains", "lake", "painting", "poster"], build: painting(mountainLake, { glow: [1480, 200, 260], title: "Wild and free", sub: "A quiet lake below the peaks", x: 110, y: 90, maxW: 980, size: 140, under: (pal) => pal.sky[0] }) },
  { id: "colour-rocket", label: "Rocket colouring page", kind: "colouring", w: 1080, h: 1350, theme: "space", tags: ["rocket", "space", "planets", "kids"], art: rocket, title: "Blast off!" },
  { id: "number-tracing", label: "Number tracing sheet", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["numbers", "counting", "tracing", "maths", "kids"], build: numberTracing },
  { id: "flower-field", label: "Spring meadow poster", kind: "full", w: 1920, h: 1080, theme: "garden", tags: ["flowers", "meadow", "spring", "painting", "poster"], build: painting(flowerField, { glow: [1600, 210, 280], title: "Hello spring", sub: "A meadow full of colour", x: 110, y: 100, maxW: 980, size: 140, under: (pal) => pal.sky[3] }) },
  { id: "colour-owl", label: "Owl colouring page", kind: "colouring", w: 1080, h: 1350, theme: "animals", tags: ["owl", "bird", "night", "kids"], art: owl, title: "Night owl" },
  { id: "handwriting-lines", label: "Handwriting practice lines", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["handwriting", "lines", "writing", "school"], build: handwriting },
  { id: "under-the-sea", label: "Under the sea poster", kind: "full", w: 1080, h: 1350, theme: "ocean", tags: ["sea", "fish", "coral", "painting", "poster"], build: painting(underwater, { dots: true, title: "Under the sea", sub: "Draw more fish to swim here", x: 70, y: 70, maxW: 760, size: 112 }) },
  { id: "colour-dinosaur", label: "Dinosaur colouring page", kind: "colouring", w: 1080, h: 1350, theme: "animals", tags: ["dinosaur", "volcano", "kids"], art: dinosaur, title: "Dino day" },
  { id: "lettering-guide", label: "Hand lettering guide", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["calligraphy", "lettering", "slant lines", "practice"], build: letteringGuide },
  { id: "city-dusk", label: "City lights poster", kind: "full", w: 1920, h: 1080, theme: "city", tags: ["city", "skyline", "night", "painting", "poster"], build: painting(cityDusk, { glow: [1500, 260, 240], title: "City lights", sub: "When the windows start to glow", x: 110, y: 90, maxW: 1000, size: 150 }) },
  { id: "colour-castle", label: "Castle colouring page", kind: "colouring", w: 1080, h: 1350, theme: "holidays", tags: ["castle", "fairy tale", "kids"], art: castle, title: "Once upon a time" },
  { id: "music-staff", label: "Music staff paper", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["music", "notes", "staff", "song"], build: musicStaff },
  { id: "autumn-tree", label: "Autumn tree poster", kind: "full", w: 1080, h: 1350, theme: "garden", tags: ["autumn", "fall", "tree", "leaves", "painting", "poster"], build: painting(autumnTree, { bottom: true, title: "Hello autumn", sub: "Leaves of red and gold", x: 70, maxW: 900, size: 104 }) },
  { id: "colour-car", label: "Car colouring page", kind: "colouring", w: 1080, h: 1080, theme: "city", tags: ["car", "road", "vehicle", "kids"], art: car, title: "Road trip" },
  { id: "isometric-grid", label: "Isometric grid", kind: "canvas", w: 1920, h: 1080, theme: "city", tags: ["isometric", "3d", "grid", "drawing practice"], build: isometricSheet },
  { id: "colour-tree", label: "Apple tree colouring page", kind: "colouring", w: 1080, h: 1350, theme: "garden", tags: ["tree", "apples", "swing", "kids"], art: bigTree, title: "Apple tree" },
  { id: "dot-journal", label: "Dot grid planner page", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["bullet journal", "dot grid", "planner", "notes", "photo"], build: dotJournal },
  { id: "colour-ice-cream", label: "Ice cream colouring page", kind: "colouring", w: 1080, h: 1350, theme: "food", tags: ["ice cream", "sweets", "summer", "kids"], art: iceCream, title: "Sweet treat" },
  { id: "pixel-grid", label: "Pixel art grid", kind: "canvas", w: 1080, h: 1080, theme: "space", tags: ["pixel art", "grid", "8-bit", "game"], build: pixelArt },
  { id: "colour-robot", label: "Robot colouring page", kind: "colouring", w: 1080, h: 1350, theme: "space", tags: ["robot", "gears", "kids"], art: robot, title: "Hello, robot" },
  { id: "manga-page", label: "Manga page", kind: "canvas", w: 1080, h: 1350, theme: "sports", tags: ["manga", "comic", "panels", "action"], build: mangaPage },
  { id: "colour-turtle", label: "Sea turtle colouring page", kind: "colouring", w: 1080, h: 1080, theme: "ocean", tags: ["turtle", "sea", "kids"], art: turtle, title: "Sea turtle" },
  { id: "character-turnaround", label: "Character turnaround sheet", kind: "canvas", w: 1920, h: 1080, theme: "space", tags: ["character design", "turnaround", "animation", "reference photo"], build: turnaroundSheet },
  { id: "mood-board", label: "Photo mood board", kind: "canvas", w: 1920, h: 1080, theme: "garden", tags: ["mood board", "ideas", "collage", "inspiration", "photos"], build: moodBoard },
];
const SECTION = { colouring: "Colouring pages", canvas: "Canvas templates", full: "Sample drawings" };
const KIND_TAGS = { colouring: ["colouring", "coloring", "outline"], canvas: ["canvas", "blank", "guide"], full: ["painting", "sample", "art"] };
const LBY = new Map(LAYOUTS_DEF.map((l) => [l.id, l])), PBY = new Map(PALETTES.map((x) => [x.id, x])), TBY = new Map(THEMES.map((x) => [x.id, x]));

export const LAYOUTS = LAYOUTS_DEF.length;
export const PALETTE_COUNT = PALETTES.length;
export const THEME_COUNT = THEMES.length;
export const MAX = LAYOUTS * PALETTES.length * THEMES.length;
// Old fixed ids (first gallery version) keep working: they open their layout with the first palette and its own theme.
const ALIAS = Object.fromEntries(LAYOUTS_DEF.map((l) => [l.id, `${l.id}~p01~${l.theme}`]));

const built = new Map();
/** Template info for any valid id (or old id): { id, name, tool, section, tags, w, h, bg, colouring, full, layout, palette, theme }. */
export function templateById(id) {
  const key = ALIAS[id] || String(id || "");
  if (built.has(key)) return built.get(key);
  const [lid, pid, tid] = key.split("~"), L = LBY.get(lid), P = PBY.get(pid), T = TBY.get(tid);
  if (!L || !P || !T || key.split("~").length !== 3) return null;
  const t = {
    id: key, name: `${L.label}: ${T.label} (${P.name})`, tool: "draw", app: "draw", section: SECTION[L.kind],
    tags: [...L.tags, ...KIND_TAGS[L.kind], T.id, T.title.toLowerCase(), P.name.toLowerCase()], w: L.w, h: L.h,
    bg: L.kind === "colouring" ? "#ffffff" : P.paper, colouring: L.kind === "colouring", full: L.kind === "full",
    layout: L.id, palette: P.id, theme: T.id, themeLabel: T.label, paletteName: P.name,
  };
  built.set(key, t);
  return t;
}

// The k-th pick of a layout walks all palette × theme pairs (k·17 + li·13 over 0..119), so neighbours differ in
// layout, palette and theme.
function nthId(li, k) {
  const n = PALETTES.length * THEMES.length, c = (k * 17 + li * 13) % n;
  return `${LAYOUTS_DEF[li].id}~${PALETTES[c % PALETTES.length].id}~${THEMES[Math.floor(c / PALETTES.length)].id}`;
}
// Order: every layout once first (so the first LAYOUTS cards are all different designs), grouped by section because the
// editor's Templates panel starts a header whenever the section changes; then a second round of every layout in other
// colours and themes under one "More templates for you" section.
const KIND_ORDER = ["colouring", "canvas", "full"];
const ROUND1 = KIND_ORDER.flatMap((kind) => LAYOUTS_DEF.map((L, li) => [L, li]).filter(([L]) => L.kind === kind).map(([, li]) => templateById(nthId(li, 0))));
const MORE = "More templates for you";
const ROUND2 = LAYOUTS_DEF.map((L, li) => ({ ...templateById(nthId(li, 1)), section: MORE }));
export const TEMPLATES = [...ROUND1, ...ROUND2].slice(0, Math.min(COUNT, MAX));
export const TOTAL = TEMPLATES.length;

const safe = (s) => String(s).replace(/[^a-z0-9-]/gi, "_");
// Layer names per kind: [background, photos, lines/guides, title]. Colouring pages get their "Colours" layer under "Lines".
const PART_NAMES = { colouring: ["Frame", "Photo", "Lines", "Title"], canvas: ["Background", "Reference photo", "Guides", "Title"], full: ["Painting", "Photo", "Details", "Title"] };
function build(t, size, salt) {
  const L = LBY.get(t.layout), c = ctxOf(t, size, salt);
  LW.thumb = size === "thumb"; // thumbnails leave out tiny decorations and draw dense detail lighter
  let r;
  try { r = (L.build || ((cx) => colouringPage(cx, L.art)))(c); } finally { LW.thumb = false; }
  return { L, defs: c.K.defs.length ? `<defs>${c.K.defs.join("")}</defs>` : "", list: [r.bg, r.photo, r.art, r.over] };
}
const doc = (t, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w}" height="${t.h}" viewBox="0 0 ${t.w} ${t.h}">${inner}</svg>`;
/** The template's full-size artwork as one standalone SVG document (w × h px), real photos at full size. Colouring pages
 *  paint a white page with a frame and black outlines; canvas templates and sample drawings paint their own background. */
export function svg(id, prefix = "a") {
  const t = templateById(id);
  if (!t) return "";
  const b = build(t, "full", prefix);
  return doc(t, b.defs + b.list.filter(Boolean).join(""));
}
/** The same artwork split into layers for the editor: [{ name, svg }] bottom to top (empty parts left out). */
export function parts(id, prefix = "a") {
  const t = templateById(id);
  if (!t) return [];
  const b = build(t, "full", prefix), names = PART_NAMES[b.L.kind];
  return b.list.map((s, i) => (s ? { name: names[i], svg: doc(t, b.defs + s) } : null)).filter(Boolean);
}

const cache = new Map();
/** Self-contained 320 × 200 preview, built on demand: the template's page with a soft shadow on a tinted desk. */
export function thumb(id) {
  if (cache.has(id)) return cache.get(id);
  const t = templateById(id);
  if (!t) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="#eef0f6"/></svg>';
  const pal = PBY.get(t.palette), K = kit(t.id, "desk");
  const k = Math.min(296 / t.w, 184 / t.h), tw = r1(t.w * k), th = r1(t.h * k), x = r1((320 - tw) / 2), y = r1((200 - th) / 2);
  const desk = K.lin([tint(pal.sky[3], 0.25), tint(pal.acc[0], 0.78)], 35), sh = K.shadow(3, 8, 0.28);
  const b = build(t, "thumb", "t");
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${esc(t.name)} template"><defs>${K.defs.join("")}</defs>` +
    `<rect width="320" height="200" fill="${desk}"/>` + (t.w < t.h ? `<rect x="${x}" y="${y}" width="${tw}" height="${th}" fill="#ffffff" opacity=".6" transform="rotate(6 160 100)"/>` : "") +
    `<rect x="${x}" y="${y}" width="${tw}" height="${th}" fill="${t.bg}"${sh}/>` +
    `<svg x="${x}" y="${y}" width="${tw}" height="${th}" viewBox="0 0 ${t.w} ${t.h}" preserveAspectRatio="xMidYMid meet">${b.defs}${b.list.filter(Boolean).join("")}</svg></svg>`;
  if (cache.size > 400) cache.clear();
  cache.set(id, out);
  return out;
}
