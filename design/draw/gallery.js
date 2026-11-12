// Draw template gallery (pure module: no DOM, no imports). Used by the editor's Templates panel and the intro page.
// A GENERATOR: hand-made base LAYOUTS (colouring pages, canvas templates, sample drawings) × our own colour PALETTES ×
// THEMES (each with its own motif drawing and title). Ids encode the combination: `<layout>~<palette>~<theme>`, e.g.
// `colour-mandala~p07~ocean`; templateById(id), svg(id) and thumb(id) all build from the id, so every one opens for real.
// TEMPLATES lists every layout once (grouped by section), then a second round in other colours/themes; any other valid
// id (42 × 12 × 10 = 5040) builds too. All artwork is ours: simple vector shapes, no photos, no outside files.

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
const motif = (th, x, y, size, { fill = "none", stroke = "#1f2937", sw = 6, rot = 0, opacity = 1 } = {}) =>
  `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot} ${r1(size / 2)} ${r1(size / 2)}) scale(${r1(size / 100 * 1000) / 1000})" fill="${fill}" stroke="${stroke}" stroke-width="${r1(sw * 100 / size)}" stroke-linejoin="round" stroke-linecap="round"${opacity < 1 ? ` opacity="${opacity}"` : ""}>${th.motif}</g>`;

/* ---------- layouts ---------- */
const line = (pal, sw = 7) => `fill="none" stroke="${pal.ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
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
function motifGrid(p, pal, th) {
  let out = banner(pal, 190, 50, 700, 110, th.title, 58);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const x = 60 + c * 340, y = 210 + r * 370;
    out += `<rect x="${x}" y="${y}" width="300" height="330" rx="26" ${line(pal, 5)}/>` + motif(th, x + 35, y + 30, 230, { stroke: pal.ink, sw: 7, rot: (r * 3 + c) % 2 ? 8 : -8 });
    out += `<line x1="${x + 40}" y1="${y + 300}" x2="${x + 260}" y2="${y + 300}" stroke="${pal.ink}" stroke-width="3" stroke-dasharray="10 10"/>`;
  }
  return out;
}
function bigMotif(p, pal, th) {
  return `<rect x="30" y="30" width="1020" height="1020" rx="40" ${line(pal, 8)}/><rect x="60" y="60" width="960" height="960" rx="28" ${line(pal, 4)}/>` +
    motif(th, 190, 120, 700, { stroke: pal.ink, sw: 9 }) + banner(pal, 240, 870, 600, 110, th.title, 56) +
    ring(6, (a, i) => `<circle cx="${130 + i * 164}" cy="${i % 2 ? 100 : 150}" r="14" ${line(pal, 5)}/>`);
}
function dotted(p, pal, th, w, h) {
  return `<defs><pattern id="${p}dot" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="2.4" fill="${pal.ink}" opacity=".22"/></pattern></defs>` +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${p}dot)"/>` +
    `<rect x="40" y="40" width="${w - 80}" height="${h - 80}" fill="none" stroke="${pal.acc[0]}" stroke-opacity=".45" stroke-width="4" rx="18"/>` +
    `<text x="80" y="104" ${FONT} font-size="34" font-weight="700" fill="${pal.acc[0]}">${esc(th.title)}</text>` + motif(th, w - 170, 70, 90, { stroke: pal.acc[1], sw: 5 });
}
function comic(p, pal, th) {
  const k = pal.ink, box = (x, y, bw, bh) => `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="${k}" stroke-width="8"/>`;
  return box(40, 40, 600, 420) + box(664, 40, 376, 420) + box(40, 484, 1000, 380) + box(40, 888, 380, 422) + box(444, 888, 596, 422) +
    `<path d="M120 110 h360 a40 40 0 0 1 40 40 v70 a40 40 0 0 1 -40 40 h-250 l-60 50 l14 -50 h-64 a40 40 0 0 1 -40 -40 v-70 a40 40 0 0 1 40 -40z" fill="#ffffff" stroke="${k}" stroke-width="5"/>` +
    `<text x="300" y="200" text-anchor="middle" ${FONT} font-size="40" font-weight="700" fill="${k}">${esc(th.title)}!</text>` +
    `<ellipse cx="860" cy="560" rx="140" ry="52" fill="#ffffff" stroke="${k}" stroke-width="5"/><path d="M800 606 l-30 46 l64 -40" fill="#ffffff" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M520 960 l40 60 l-56 0 l44 70" fill="none" stroke="${pal.acc[1]}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>` +
    motif(th, 740, 120, 220, { stroke: pal.acc[0], sw: 6, opacity: 0.55 }) + motif(th, 120, 1000, 200, { stroke: pal.acc[2], sw: 6, opacity: 0.55, rot: -10 });
}
function storyboard(p, pal, th, w) {
  let out = `<text x="${w / 2}" y="54" text-anchor="middle" ${FONT} font-size="34" font-weight="700" fill="${pal.ink}">Storyboard: ${esc(th.title)}</text>`;
  const fw = 540, fh = 290, gx = (w - fw * 3) / 4, top = 90, rowH = 470;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const x = gx + c * (fw + gx), y = top + r * rowH, n = r * 3 + c + 1;
    out += `<rect x="${x}" y="${y}" width="${fw}" height="${fh}" rx="10" fill="#ffffff" stroke="${pal.ink}" stroke-width="5"/>`;
    out += `<circle cx="${x + 30}" cy="${y + 30}" r="20" fill="${pal.acc[n % 4]}"/><text x="${x + 30}" y="${y + 38}" text-anchor="middle" ${FONT} font-size="22" font-weight="700" fill="#ffffff">${n}</text>`;
    for (let k = 0; k < 3; k++) out += `<line x1="${x}" y1="${y + fh + 40 + k * 34}" x2="${x + fw - (k === 2 ? 180 : 0)}" y2="${y + fh + 40 + k * 34}" stroke="${pal.ink}" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/>`;
  }
  return out;
}
function perspective(p, pal, th, w) {
  const hy = 470, vps = [[320, hy], [w - 320, hy]];
  let out = `<line x1="0" y1="${hy}" x2="${w}" y2="${hy}" stroke="${pal.acc[0]}" stroke-width="5"/>`;
  for (const [vx, vy] of vps) {
    for (let a = -84; a <= 84; a += 7) {
      const rad = (a * Math.PI) / 180, len = 2600;
      out += `<line x1="${vx}" y1="${vy}" x2="${r1(vx + Math.cos(rad) * len * (vx < w / 2 ? 1 : -1))}" y2="${r1(vy + Math.sin(rad) * len)}" stroke="${pal.acc[0]}" stroke-opacity=".35" stroke-width="2"/>`;
    }
    out += `<circle cx="${vx}" cy="${vy}" r="12" fill="${pal.acc[0]}"/>`;
  }
  return out + `<path d="M760 760 L960 640 L1160 760 L1160 980 L960 1060 L760 980 Z" fill="none" stroke="${pal.ink}" stroke-width="5" stroke-linejoin="round"/><path d="M960 640 V860 M760 760 L960 860 L1160 760" fill="none" stroke="${pal.ink}" stroke-width="4" stroke-dasharray="14 10"/>` +
    `<text x="60" y="80" ${FONT} font-size="32" font-weight="700" fill="${pal.ink}">Two-point perspective: ${esc(th.title)}</text>`;
}
function journal(p, pal, th, w, h) {
  let out = `<rect x="0" y="0" width="${w}" height="200" fill="${pal.acc[0]}" opacity=".16"/>` +
    `<text x="140" y="125" ${FONT} font-size="56" font-weight="700" fill="${pal.ink}">${esc(th.title)}</text>` + motif(th, w - 210, 40, 130, { stroke: pal.acc[1], sw: 6 });
  for (let y = 270; y < h - 40; y += 54) out += `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="${pal.acc[2]}" stroke-opacity=".55" stroke-width="2.5"/>`;
  return out + `<line x1="120" y1="200" x2="120" y2="${h}" stroke="${pal.acc[1]}" stroke-opacity=".7" stroke-width="3"/>`;
}
function frames(p, pal, th, w) {
  let out = `<text x="${w / 2}" y="70" text-anchor="middle" ${FONT} font-size="40" font-weight="700" fill="${pal.ink}">${esc(th.title)}: sketch practice</text>`;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const i = r * 2 + c, x = 90 + c * 900, y = 110 + r * 480;
    out += `<rect x="${x}" y="${y}" width="840" height="400" rx="22" fill="#ffffff" stroke="${pal.acc[i]}" stroke-width="6"/>` +
      `<text x="${x + 24}" y="${y + 446}" ${FONT} font-size="30" font-weight="700" fill="${pal.ink}">${i + 1}. ${esc(th.words[i])}</text>` +
      `<line x1="${x + 260}" y1="${y + 440}" x2="${x + 840}" y2="${y + 440}" stroke="${pal.ink}" stroke-opacity=".25" stroke-width="3"/>` +
      motif(th, x + 660, y + 230, 150, { stroke: pal.acc[i], sw: 5, opacity: 0.4 });
  }
  return out;
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
function stickers(p, pal, th, w, h) {
  let out = `<rect width="${w}" height="${h}" fill="${pal.paper}"/>` + `<rect x="0" y="0" width="${w}" height="150" fill="${pal.acc[0]}"/>` +
    `<text x="${w / 2}" y="98" text-anchor="middle" ${FONT} font-size="56" font-weight="700" fill="#ffffff">${esc(th.title)} stickers</text>`;
  const rnd = rng(7);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const i = r * 4 + c, x = 50 + c * 250 + (r % 2) * 30, y = 200 + r * 290, col = pal.acc[i % 4];
    out += motif(th, x, y, 200, { fill: col, stroke: "#ffffff", sw: 10, rot: Math.round((rnd() - 0.5) * 30) });
  }
  return out;
}
function card(p, pal, th, w, h) {
  const rnd = rng(11);
  let confetti = "";
  for (let i = 0; i < 46; i++) confetti += `<circle cx="${r1(rnd() * w)}" cy="${r1(rnd() * h)}" r="${r1(5 + rnd() * 9)}" fill="${pal.acc[i % 4]}" opacity=".75"/>`;
  return `<defs><linearGradient id="${p}card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.sky[3]}"/><stop offset="1" stop-color="${pal.sky[2]}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${p}card)"/>` + confetti +
    `<rect x="90" y="300" width="${w - 180}" height="700" rx="40" fill="#ffffff" opacity=".9"/>` +
    `<text x="${w / 2}" y="560" text-anchor="middle" ${FONT} font-size="96" font-weight="800" fill="${pal.acc[0]}">${esc(th.title)}</text>` +
    `<text x="${w / 2}" y="660" text-anchor="middle" ${FONT} font-size="40" fill="${pal.ink}">${esc(th.words.join(" · "))}</text>` +
    `<text x="${w / 2}" y="880" text-anchor="middle" ${FONT} font-size="34" fill="${pal.ink}" opacity=".7">Draw your own picture here</text>` +
    motif(th, 120, 60, 220, { fill: pal.acc[1], stroke: "#ffffff", sw: 8, rot: -12 }) + motif(th, w - 340, 60, 220, { fill: pal.acc[2], stroke: "#ffffff", sw: 8, rot: 12 }) +
    motif(th, w / 2 - 130, 1040, 260, { fill: pal.acc[3], stroke: "#ffffff", sw: 8 });
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

/* canvas templates (guides on paper) */
function letterTracing(p, pal, th, w, h) {
  const letters = [...new Set(th.words.join("").toUpperCase().replace(/[^A-Z]/g, ""))].slice(0, 6);
  let out = `<text x="${w / 2}" y="96" text-anchor="middle" ${FONT} font-size="46" font-weight="700" fill="${pal.ink}">Trace the letters: ${esc(th.title)}</text>` + motif(th, 60, 40, 80, { stroke: pal.acc[1], sw: 5 });
  letters.forEach((c, i) => {
    const y = 180 + i * 190;
    out += `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="${pal.acc[0]}" stroke-width="3"/><line x1="60" y1="${y + 70}" x2="${w - 60}" y2="${y + 70}" stroke="${pal.acc[0]}" stroke-width="2" stroke-dasharray="14 10" opacity=".7"/><line x1="60" y1="${y + 140}" x2="${w - 60}" y2="${y + 140}" stroke="${pal.acc[0]}" stroke-width="3"/>`;
    for (let k = 0; k < 5; k++) out += `<text x="${150 + k * 195}" y="${y + 136}" text-anchor="middle" ${FONT} font-size="136" font-weight="700" fill="none" stroke="${k ? pal.ink : pal.acc[1]}" stroke-width="${k ? 3 : 5}"${k ? ' stroke-dasharray="10 9" opacity=".55"' : ""}>${k % 2 ? c.toLowerCase() : c}</text>`;
  });
  return out;
}
function numberTracing(p, pal, th, w) {
  let out = `<text x="${w / 2}" y="90" text-anchor="middle" ${FONT} font-size="46" font-weight="700" fill="${pal.ink}">Trace and count</text>`;
  for (let n = 1; n <= 10; n++) {
    const col = (n - 1) % 2, row = Math.floor((n - 1) / 2), x = 60 + col * 500, y = 140 + row * 238;
    out += `<rect x="${x}" y="${y}" width="460" height="210" rx="24" fill="none" stroke="${pal.acc[n % 4]}" stroke-width="5"/>` +
      `<text x="${x + 110}" y="${y + 170}" text-anchor="middle" ${FONT} font-size="${n > 9 ? 120 : 170}" font-weight="700" fill="none" stroke="${pal.ink}" stroke-width="3" stroke-dasharray="10 9">${n}</text>`;
    for (let d = 0; d < n; d++) out += `<circle cx="${x + 240 + (d % 5) * 44}" cy="${y + 70 + Math.floor(d / 5) * 64}" r="16" fill="none" stroke="${pal.acc[(n + 1) % 4]}" stroke-width="4"/>`;
  }
  return out;
}
function handwriting(p, pal, th, w, h) {
  let out = `<rect x="0" y="0" width="${w}" height="170" fill="${pal.acc[2]}" opacity=".14"/><text x="70" y="110" ${FONT} font-size="54" font-weight="700" fill="${pal.ink}">${esc(th.title)}: handwriting</text>` + motif(th, w - 180, 30, 110, { stroke: pal.acc[2], sw: 6 });
  for (let y = 250; y < h - 120; y += 150) {
    out += `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="${pal.ink}" stroke-opacity=".55" stroke-width="3"/>` +
      `<line x1="60" y1="${y + 45}" x2="${w - 60}" y2="${y + 45}" stroke="${pal.acc[0]}" stroke-width="2.5" stroke-dasharray="12 10"/>` +
      `<line x1="60" y1="${y + 90}" x2="${w - 60}" y2="${y + 90}" stroke="${pal.ink}" stroke-opacity=".55" stroke-width="3"/>` +
      `<line x1="60" y1="${y + 120}" x2="${w - 60}" y2="${y + 120}" stroke="${pal.acc[1]}" stroke-opacity=".35" stroke-width="2"/>`;
  }
  return out;
}
function calligraphyGuide(p, pal, th, w, h) {
  let out = `<text x="70" y="90" ${FONT} font-size="40" font-weight="700" fill="${pal.ink}">Lettering practice: ${esc(th.title)}</text>`;
  const cid = `${p}cal`;
  out += `<defs><clipPath id="${cid}"><rect x="60" y="130" width="${w - 120}" height="${h - 190}"/></clipPath></defs><g clip-path="url(#${cid})">`;
  for (let y = 150; y < h - 60; y += 210) {
    out += `<rect x="60" y="${y + 60}" width="${w - 120}" height="80" fill="${pal.acc[0]}" opacity=".08"/>` +
      `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="${pal.acc[0]}" stroke-opacity=".5" stroke-width="2"/><line x1="60" y1="${y + 60}" x2="${w - 60}" y2="${y + 60}" stroke="${pal.acc[0]}" stroke-width="3"/>` +
      `<line x1="60" y1="${y + 140}" x2="${w - 60}" y2="${y + 140}" stroke="${pal.acc[0]}" stroke-width="3"/><line x1="60" y1="${y + 200}" x2="${w - 60}" y2="${y + 200}" stroke="${pal.acc[0]}" stroke-opacity=".5" stroke-width="2"/>`;
  }
  for (let x = -h; x < w + 200; x += 70) out += `<line x1="${x}" y1="${h}" x2="${r1(x + h * 0.7)}" y2="0" stroke="${pal.acc[1]}" stroke-opacity=".28" stroke-width="2"/>`;
  return out + `</g>`;
}
function musicStaff(p, pal, th, w, h) {
  let out = `<text x="${w / 2}" y="100" text-anchor="middle" ${FONT} font-size="48" font-weight="700" fill="${pal.ink}">${esc(th.title)}: a new song</text>` +
    `<text x="80" y="160" ${FONT} font-size="28" fill="${pal.ink}" opacity=".7">Words and music by ________________</text>`;
  for (let s = 0; s < 9; s++) {
    const y = 230 + s * 122;
    for (let l = 0; l < 5; l++) out += `<line x1="70" y1="${y + l * 16}" x2="${w - 70}" y2="${y + l * 16}" stroke="${pal.ink}" stroke-width="2"/>`;
    out += `<line x1="70" y1="${y}" x2="70" y2="${y + 64}" stroke="${pal.ink}" stroke-width="3"/><line x1="${w - 70}" y1="${y}" x2="${w - 70}" y2="${y + 64}" stroke="${pal.ink}" stroke-width="3"/>` +
      [1, 2, 3].map((b) => `<line x1="${r1(70 + ((w - 140) * b) / 4)}" y1="${y}" x2="${r1(70 + ((w - 140) * b) / 4)}" y2="${y + 64}" stroke="${pal.ink}" stroke-width="2"/>`).join("");
  }
  return out + motif(th, w - 190, 40, 120, { stroke: pal.acc[0], sw: 6 });
}
function isometric(p, pal, th, w, h) {
  const step = 60, t30 = Math.tan(Math.PI / 6);
  let out = "";
  for (let x = 0; x <= w; x += step * Math.cos(Math.PI / 6) * 2) out += `<line x1="${r1(x)}" y1="0" x2="${r1(x)}" y2="${h}" stroke="${pal.acc[0]}" stroke-opacity=".3" stroke-width="1.5"/>`;
  for (let c = -w; c < h + w; c += step) {
    out += `<line x1="0" y1="${r1(c)}" x2="${w}" y2="${r1(c + w * t30)}" stroke="${pal.acc[0]}" stroke-opacity=".3" stroke-width="1.5"/>`;
    out += `<line x1="0" y1="${r1(c)}" x2="${w}" y2="${r1(c - w * t30)}" stroke="${pal.acc[0]}" stroke-opacity=".3" stroke-width="1.5"/>`;
  }
  const cube = (cx, cy, s) => `<path d="M${cx} ${cy} l${r1(s * 0.866)} ${-s / 2} l${r1(-s * 0.866)} ${-s / 2} l${r1(-s * 0.866)} ${s / 2} z" fill="${pal.acc[1]}" opacity=".35"/><path d="M${cx} ${cy} l${r1(s * 0.866)} ${-s / 2} v${s} l${r1(-s * 0.866)} ${s / 2} z" fill="${pal.acc[2]}" opacity=".35"/><path d="M${cx} ${cy} l${r1(-s * 0.866)} ${-s / 2} v${s} l${r1(s * 0.866)} ${s / 2} z" fill="${pal.acc[0]}" opacity=".35"/>`;
  return out + `<rect x="40" y="36" width="560" height="64" rx="14" fill="${pal.paper}" opacity=".92"/><text x="64" y="80" ${FONT} font-size="32" font-weight="700" fill="${pal.ink}">Isometric grid: ${esc(th.title)}</text>` + cube(w - 220, h - 220, 120);
}
function dotJournal(p, pal, th, w, h) {
  let out = `<defs><pattern id="${p}bj" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="2.2" fill="${pal.ink}" opacity=".3"/></pattern></defs>` +
    `<rect x="60" y="240" width="${w - 120}" height="${h - 300}" fill="url(#${p}bj)"/>`;
  out += `<rect x="60" y="60" width="${w - 120}" height="150" rx="20" fill="${pal.acc[0]}" opacity=".14"/><text x="100" y="135" ${FONT} font-size="48" font-weight="700" fill="${pal.ink}">${esc(th.title)}</text>` +
    `<text x="100" y="185" ${FONT} font-size="26" fill="${pal.ink}" opacity=".7">Date ______________</text>` + motif(th, w - 210, 75, 120, { stroke: pal.acc[1], sw: 6 });
  const keys = ["Task", "Event", "Note", "Idea"];
  keys.forEach((kname, i) => { const y = 300 + i * 60; out += `<rect x="${w - 330}" y="${y - 28}" width="250" height="44" rx="12" fill="#ffffff" stroke="${pal.acc[i]}" stroke-width="3"/><circle cx="${w - 300}" cy="${y - 6}" r="9" fill="${pal.acc[i]}"/><text x="${w - 280}" y="${y + 4}" ${FONT} font-size="24" fill="${pal.ink}">${kname}</text>`; });
  return out + `<text x="${w - 330}" y="270" ${FONT} font-size="24" font-weight="700" fill="${pal.ink}">Key</text>`;
}
function pixelGrid(p, pal, th, w, h) {
  const n = 32, cell = Math.floor((Math.min(w, h) - 160) / n), x0 = Math.round((w - cell * n) / 2), y0 = 120;
  let out = `<text x="${w / 2}" y="80" text-anchor="middle" ${FONT} font-size="40" font-weight="700" fill="${pal.ink}">Pixel art: ${esc(th.title)}</text>`;
  const heart = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];
  heart.forEach((row, r) => [...row].forEach((v, c) => { if (v === "1") out += `<rect x="${x0 + (c + 1) * cell}" y="${y0 + (r + 1) * cell}" width="${cell}" height="${cell}" fill="${pal.acc[(r + c) % 2 ? 0 : 1]}" opacity=".85"/>`; }));
  for (let i = 0; i <= n; i++) {
    const sw = i % 8 ? 1.2 : 2.6;
    out += `<line x1="${x0 + i * cell}" y1="${y0}" x2="${x0 + i * cell}" y2="${y0 + n * cell}" stroke="${pal.ink}" stroke-opacity=".35" stroke-width="${sw}"/><line x1="${x0}" y1="${y0 + i * cell}" x2="${x0 + n * cell}" y2="${y0 + i * cell}" stroke="${pal.ink}" stroke-opacity=".35" stroke-width="${sw}"/>`;
  }
  return out;
}
function manga(p, pal, th, w, h) {
  const k = pal.ink, sw = 8;
  let out = `<path d="M40 40 H1040 V380 L40 300 Z" fill="none" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="M40 330 L560 400 L480 820 L40 820 Z" fill="none" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="M590 404 L1040 410 V820 L510 820 Z" fill="none" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="M40 850 H640 L600 1310 H40 Z" fill="none" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M670 850 H1040 V1310 H630 Z" fill="none" stroke="${k}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  for (let a = 0; a < 360; a += 6) { const rad = (a * Math.PI) / 180; out += `<line x1="${r1(830 + Math.cos(rad) * 120)}" y1="${r1(620 + Math.sin(rad) * 90)}" x2="${r1(830 + Math.cos(rad) * 300)}" y2="${r1(620 + Math.sin(rad) * 220)}" stroke="${k}" stroke-opacity=".35" stroke-width="2"/>`; }
  out += `<ellipse cx="300" cy="150" rx="190" ry="70" fill="#ffffff" stroke="${k}" stroke-width="5"/><path d="M360 214 l40 60 l-10 -66" fill="#ffffff" stroke="${k}" stroke-width="5" stroke-linejoin="round"/>` +
    `<text x="300" y="164" text-anchor="middle" ${FONT} font-size="38" font-weight="700" fill="${k}">${esc(th.words[0])}!</text>` +
    `<path d="M180 1000 l30 -60 l30 60 l60 -20 l-40 50 l50 40 l-70 0 l-20 60 l-20 -60 l-70 0 l50 -40 l-40 -50 z" fill="none" stroke="${pal.acc[1]}" stroke-width="6" stroke-linejoin="round"/>` +
    motif(th, 760, 980, 220, { stroke: pal.acc[0], sw: 6, opacity: 0.5 });
  return out;
}
function turnaround(p, pal, th, w, h) {
  const views = ["Front", "Three-quarter", "Side", "Back"], fw = 400, gx = (w - fw * 4) / 5;
  let out = `<text x="${w / 2}" y="70" text-anchor="middle" ${FONT} font-size="40" font-weight="700" fill="${pal.ink}">Character turnaround: ${esc(th.title)}</text>`;
  const guides = [["Head", 170], ["Shoulders", 330], ["Waist", 560], ["Knees", 790], ["Feet", 990]];
  for (const [g, y] of guides) out += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="${pal.acc[1]}" stroke-opacity=".55" stroke-width="2.5" stroke-dasharray="16 10"/><text x="44" y="${y - 10}" ${FONT} font-size="22" fill="${pal.acc[1]}">${g}</text>`;
  views.forEach((v, i) => {
    const x = gx + i * (fw + gx);
    out += `<rect x="${x}" y="110" width="${fw}" height="920" rx="20" fill="none" stroke="${pal.acc[0]}" stroke-width="4"/><line x1="${x + fw / 2}" y1="120" x2="${x + fw / 2}" y2="1020" stroke="${pal.acc[0]}" stroke-opacity=".35" stroke-width="2"/>` +
      `<text x="${x + fw / 2}" y="1062" text-anchor="middle" ${FONT} font-size="30" font-weight="700" fill="${pal.ink}">${v}</text>`;
  });
  return out;
}
function moodBoard(p, pal, th, w, h) {
  const k = pal.ink;
  const frame = (x, y, fw, fh, label, i, rot = 0) => `<g transform="rotate(${rot} ${x + fw / 2} ${y + fh / 2})"><rect x="${x}" y="${y}" width="${fw}" height="${fh}" rx="16" fill="#ffffff" stroke="${pal.acc[i % 4]}" stroke-width="6"/>` +
    `<rect x="${x + fw / 2 - 60}" y="${y - 20}" width="120" height="40" rx="6" fill="${pal.acc[(i + 1) % 4]}" opacity=".55"/><text x="${x + 24}" y="${y + fh - 24}" ${FONT} font-size="28" font-weight="700" fill="${k}" opacity=".7">${label}</text></g>`;
  let out = `<text x="70" y="90" ${FONT} font-size="48" font-weight="700" fill="${k}">${esc(th.title)}: mood board</text>` +
    frame(70, 150, 560, 420, th.words[0], 0, -2) + frame(690, 150, 480, 300, th.words[1], 1, 2) + frame(1230, 130, 620, 460, th.words[2], 2, -1) +
    frame(690, 500, 480, 500, th.words[3], 3, 1) + frame(70, 630, 560, 380, "Shapes", 1, 2) + frame(1230, 650, 300, 350, "Texture", 2, -3);
  pal.acc.concat(pal.sky.slice(0, 2)).forEach((c, i) => { out += `<circle cx="${1620 + (i % 3) * 90}" cy="${720 + Math.floor(i / 3) * 110}" r="38" fill="${c}"/>`; });
  return out + `<text x="1600" y="660" ${FONT} font-size="28" font-weight="700" fill="${k}">Colours</text>` + motif(th, 1720, 30, 100, { stroke: pal.acc[0], sw: 6 });
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
  for (let i = 0; i < 140; i++) {
    const y = 640 + rnd() * 420, x = rnd() * w, s = 6 + ((y - 640) / 420) * 18, c = pal.acc[i % 4];
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
    for (let yy = top + 30; yy < 960; yy += 54) for (let xx = x + 22; xx < x + bw - 30; xx += 46) if (rnd() > 0.45) wins += `<rect x="${r1(xx)}" y="${r1(yy)}" width="22" height="30" rx="3" fill="${pal.acc[3]}" opacity="${r1(0.55 + rnd() * 0.45)}"/>`;
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

// kind: colouring = outlines only (transparent; colour goes on a layer under the lines); canvas = guides on paper; full = whole painting.
const LAYOUTS_DEF = [
  { id: "colour-flower", label: "Flower colouring page", kind: "colouring", w: 1080, h: 1350, theme: "garden", tags: ["flower", "kids"], art: flower },
  { id: "night-sky", label: "Night sky with moon", kind: "full", w: 1080, h: 1080, theme: "space", tags: ["moon", "stars", "night", "mountains"], art: nightSky },
  { id: "dotted-sketch", label: "Dotted sketch page", kind: "canvas", w: 1080, h: 1080, theme: "school", tags: ["sketch", "dots", "grid", "notebook"], art: dotted },
  { id: "colour-mandala", label: "Mandala colouring page", kind: "colouring", w: 1080, h: 1080, theme: "garden", tags: ["mandala", "pattern", "relax"], art: mandala },
  { id: "sunset-hills", label: "Sunset over hills", kind: "full", w: 1920, h: 1080, theme: "garden", tags: ["landscape", "sunset", "painting", "hills"], art: sunset },
  { id: "comic-page", label: "Comic strip page", kind: "canvas", w: 1080, h: 1350, theme: "space", tags: ["comic", "panels", "story", "speech bubble"], art: comic },
  { id: "colour-house", label: "House colouring page", kind: "colouring", w: 1080, h: 1350, theme: "city", tags: ["house", "home", "kids"], art: house },
  { id: "sticker-sheet", label: "Sticker sheet", kind: "full", w: 1080, h: 1080, theme: "animals", tags: ["stickers", "cute", "icons"], art: stickers },
  { id: "storyboard", label: "Storyboard grid", kind: "canvas", w: 1920, h: 1080, theme: "city", tags: ["storyboard", "video", "frames", "scenes"], art: storyboard },
  { id: "colour-fish", label: "Fish colouring page", kind: "colouring", w: 1080, h: 1350, theme: "ocean", tags: ["fish", "sea", "kids"], art: fish },
  { id: "greeting-card", label: "Greeting card", kind: "full", w: 1080, h: 1350, theme: "birthday", tags: ["card", "greeting", "celebration"], art: card },
  { id: "perspective-grid", label: "Perspective grid", kind: "canvas", w: 1920, h: 1080, theme: "city", tags: ["perspective", "vanishing point", "drawing practice"], art: perspective },
  { id: "motif-grid", label: "Colouring sheet", kind: "colouring", w: 1080, h: 1350, theme: "animals", tags: ["colouring sheet", "grid", "kids"], art: motifGrid },
  { id: "journal-page", label: "Lined journal page", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["journal", "lines", "notes", "diary"], art: journal },
  { id: "big-motif", label: "Big picture colouring page", kind: "colouring", w: 1080, h: 1080, theme: "ocean", tags: ["big picture", "simple", "toddlers"], art: bigMotif },
  { id: "sketch-frames", label: "Sketch practice frames", kind: "canvas", w: 1920, h: 1080, theme: "sports", tags: ["practice", "frames", "sketchbook"], art: frames },
  // round 2: more distinct designs
  { id: "colour-butterfly", label: "Butterfly colouring page", kind: "colouring", w: 1080, h: 1350, theme: "garden", tags: ["butterfly", "insect", "kids"], art: butterfly },
  { id: "letter-tracing", label: "Letter tracing sheet", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["letters", "alphabet", "tracing", "handwriting", "kids"], art: letterTracing },
  { id: "mountain-lake", label: "Mountain lake", kind: "full", w: 1920, h: 1080, theme: "garden", tags: ["landscape", "mountains", "lake", "painting"], art: mountainLake },
  { id: "colour-rocket", label: "Rocket colouring page", kind: "colouring", w: 1080, h: 1350, theme: "space", tags: ["rocket", "space", "planets", "kids"], art: rocket },
  { id: "number-tracing", label: "Number tracing sheet", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["numbers", "counting", "tracing", "maths", "kids"], art: numberTracing },
  { id: "flower-field", label: "Flower field", kind: "full", w: 1920, h: 1080, theme: "garden", tags: ["flowers", "meadow", "spring", "painting"], art: flowerField },
  { id: "colour-owl", label: "Owl colouring page", kind: "colouring", w: 1080, h: 1350, theme: "animals", tags: ["owl", "bird", "night", "kids"], art: owl },
  { id: "handwriting-lines", label: "Handwriting practice lines", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["handwriting", "lines", "writing", "school"], art: handwriting },
  { id: "under-the-sea", label: "Under the sea", kind: "full", w: 1080, h: 1350, theme: "ocean", tags: ["sea", "fish", "coral", "painting"], art: underwater },
  { id: "colour-dinosaur", label: "Dinosaur colouring page", kind: "colouring", w: 1080, h: 1350, theme: "animals", tags: ["dinosaur", "volcano", "kids"], art: dinosaur },
  { id: "lettering-guide", label: "Hand lettering guide", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["calligraphy", "lettering", "slant lines", "practice"], art: calligraphyGuide },
  { id: "city-dusk", label: "City at dusk", kind: "full", w: 1920, h: 1080, theme: "city", tags: ["city", "skyline", "night", "painting"], art: cityDusk },
  { id: "colour-castle", label: "Castle colouring page", kind: "colouring", w: 1080, h: 1350, theme: "holidays", tags: ["castle", "fairy tale", "kids"], art: castle },
  { id: "music-staff", label: "Music staff paper", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["music", "notes", "staff", "song"], art: musicStaff },
  { id: "autumn-tree", label: "Autumn tree", kind: "full", w: 1080, h: 1350, theme: "garden", tags: ["autumn", "fall", "tree", "leaves", "painting"], art: autumnTree },
  { id: "colour-car", label: "Car colouring page", kind: "colouring", w: 1080, h: 1080, theme: "city", tags: ["car", "road", "vehicle", "kids"], art: car },
  { id: "isometric-grid", label: "Isometric grid", kind: "canvas", w: 1920, h: 1080, theme: "city", tags: ["isometric", "3d", "grid", "drawing practice"], art: isometric },
  { id: "colour-tree", label: "Apple tree colouring page", kind: "colouring", w: 1080, h: 1350, theme: "garden", tags: ["tree", "apples", "swing", "kids"], art: bigTree },
  { id: "dot-journal", label: "Dot grid journal page", kind: "canvas", w: 1080, h: 1350, theme: "school", tags: ["bullet journal", "dot grid", "planner", "notes"], art: dotJournal },
  { id: "colour-ice-cream", label: "Ice cream colouring page", kind: "colouring", w: 1080, h: 1350, theme: "food", tags: ["ice cream", "sweets", "summer", "kids"], art: iceCream },
  { id: "pixel-grid", label: "Pixel art grid", kind: "canvas", w: 1080, h: 1080, theme: "space", tags: ["pixel art", "grid", "8-bit", "game"], art: pixelGrid },
  { id: "colour-robot", label: "Robot colouring page", kind: "colouring", w: 1080, h: 1350, theme: "space", tags: ["robot", "gears", "kids"], art: robot },
  { id: "manga-page", label: "Manga page", kind: "canvas", w: 1080, h: 1350, theme: "sports", tags: ["manga", "comic", "panels", "action"], art: manga },
  { id: "colour-turtle", label: "Sea turtle colouring page", kind: "colouring", w: 1080, h: 1080, theme: "ocean", tags: ["turtle", "sea", "kids"], art: turtle },
  { id: "character-turnaround", label: "Character turnaround sheet", kind: "canvas", w: 1920, h: 1080, theme: "space", tags: ["character design", "turnaround", "animation"], art: turnaround },
  { id: "mood-board", label: "Mood board", kind: "canvas", w: 1920, h: 1080, theme: "garden", tags: ["mood board", "ideas", "collage", "inspiration"], art: moodBoard },
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
    bg: L.kind === "full" ? P.paper : L.kind === "canvas" ? P.paper : "#ffffff", colouring: L.kind === "colouring", full: L.kind === "full",
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
function body(t, prefix) {
  const L = LBY.get(t.layout);
  return L.art(`${prefix}-${safe(t.id)}-`, PBY.get(t.palette), TBY.get(t.theme), L.w, L.h);
}
/** The template's full-size artwork as a standalone SVG document (w × h px). Colouring pages and canvas templates are
 *  transparent (the drawing's paper colour shows through); sample drawings paint their own background. */
export function svg(id, prefix = "a") {
  const t = templateById(id);
  if (!t) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w}" height="${t.h}" viewBox="0 0 ${t.w} ${t.h}">${body(t, prefix)}</svg>`;
}

const cache = new Map();
/** Self-contained 320 × 200 preview, built on demand: the template on its paper, centred on a light canvas. */
export function thumb(id) {
  if (cache.has(id)) return cache.get(id);
  const t = templateById(id);
  if (!t) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="#eef0f6"/></svg>';
  const k = Math.min(296 / t.w, 184 / t.h), tw = r1(t.w * k), th = r1(t.h * k), x = r1((320 - tw) / 2), y = r1((200 - th) / 2);
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${esc(t.name)} template">` +
    `<rect width="320" height="200" fill="#eef0f6"/><rect x="${x}" y="${y}" width="${tw}" height="${th}" fill="${t.bg}" stroke="#d6dae6" stroke-width="1"/>` +
    `<svg x="${x}" y="${y}" width="${tw}" height="${th}" viewBox="0 0 ${t.w} ${t.h}" preserveAspectRatio="xMidYMid meet">${body(t, "t")}</svg></svg>`;
  if (cache.size > 400) cache.clear();
  cache.set(id, out);
  return out;
}
