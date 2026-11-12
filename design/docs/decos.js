// AsaanDesk Docs: our own decorative artwork (plain SVG, ASCII only, no DOM) for coloured header blocks,
// the Elements panel (shapes, lines, stickers, charts) and template thumbnails. Pure module: tests and gallery.js use it too.

const hexOk = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : d);
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMaxYMid meet">${body}</svg>`;

/** Band decorations: drawn on the right (or left) edge of a coloured block. c = main colour, c2 = second colour. */
export const DECOS = {
  petals: { label: "Petals", pos: "right", draw: (c, c2) => svg("0 0 300 200",
    `<ellipse cx="250" cy="20" rx="44" ry="120" transform="rotate(-38 250 20)" fill="${c}"/>` +
    `<ellipse cx="180" cy="190" rx="36" ry="105" transform="rotate(-50 180 190)" fill="${c2}"/>` +
    `<ellipse cx="290" cy="160" rx="30" ry="90" transform="rotate(-20 290 160)" fill="${c}" opacity=".85"/>`) },
  diamonds: { label: "Diamonds", pos: "right", draw: (c) => svg("0 0 132 40",
    [0, 1, 2, 3].map((i) => `<polygon points="${16 + i * 32},2 ${30 + i * 32},20 ${16 + i * 32},38 ${2 + i * 32},20" fill="${c}"/>`).join("")) },
  waves: { label: "Waves", pos: "right", draw: (c, c2) => svg("0 0 220 100",
    [0, 1, 2].map((i) => `<path d="M0 ${30 + i * 22} q27 -18 55 0 t55 0 t55 0 t55 0" fill="none" stroke="${i === 1 ? c2 : c}" stroke-width="7" stroke-linecap="round"/>`).join("")) },
  dots: { label: "Dots", pos: "right", draw: (c) => {
    let b = ""; for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) b += `<circle cx="${8 + x * 16}" cy="${8 + y * 16}" r="4" fill="${c}"/>`;
    return svg("0 0 132 84", b); } },
  circles: { label: "Circles", pos: "right", draw: (c, c2) => svg("0 0 200 140",
    `<circle cx="150" cy="40" r="60" fill="${c}"/><circle cx="90" cy="120" r="44" fill="${c2}"/><circle cx="190" cy="125" r="26" fill="none" stroke="${c}" stroke-width="6"/>`) },
  arc: { label: "Half circle", pos: "right", draw: (c) => svg("0 0 120 60", `<path d="M10 0 a50 50 0 0 0 100 0 z" fill="${c}"/>`) },
  leaves: { label: "Leaves", pos: "right", draw: (c, c2) => svg("0 0 160 120",
    `<path d="M20 110 C60 80 100 60 150 10" fill="none" stroke="${c2}" stroke-width="4"/>` +
    [[50, 86, -30], [78, 66, 20], [100, 50, -40], [122, 32, 15], [140, 18, -50]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="20" transform="rotate(${r} ${x} ${y})" fill="${c}"/>`).join("")) },
  steps: { label: "Steps", pos: "right", draw: (c, c2) => svg("0 0 120 60",
    `<rect x="10" y="40" width="34" height="20" fill="${c}"/><rect x="44" y="22" width="34" height="38" fill="${c2}"/><rect x="78" y="4" width="34" height="56" fill="${c}"/>`) },
  confetti: { label: "Confetti", pos: "right", draw: (c, c2) => svg("0 0 200 120",
    `<circle cx="30" cy="30" r="7" fill="${c}"/><rect x="70" y="14" width="12" height="12" transform="rotate(25 76 20)" fill="${c2}"/>` +
    `<path d="M120 40 l10 -18 l10 18 z" fill="${c}"/><circle cx="170" cy="22" r="5" fill="${c2}"/><rect x="150" y="70" width="14" height="7" transform="rotate(-30 157 73)" fill="${c}"/>` +
    `<circle cx="96" cy="88" r="9" fill="none" stroke="${c2}" stroke-width="4"/><path d="M40 90 q10 -12 20 0 t20 0" fill="none" stroke="${c}" stroke-width="4"/><circle cx="185" cy="100" r="6" fill="${c}"/>`) },
  flower: { label: "Flower", pos: "right", draw: (c, c2) => svg("0 0 100 100",
    [0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="28" rx="15" ry="24" transform="rotate(${a} 50 50)" fill="${c}"/>`).join("") + `<circle cx="50" cy="50" r="12" fill="${c2}"/>`) },
  sun: { label: "Sun", pos: "right", draw: (c, c2) => svg("0 0 120 120",
    Array.from({ length: 12 }, (_, i) => `<rect x="57" y="6" width="6" height="22" rx="3" transform="rotate(${i * 30} 60 60)" fill="${c2}"/>`).join("") + `<circle cx="60" cy="60" r="26" fill="${c}"/>`) },
  avatar: { label: "Avatar", pos: "left", draw: (c, c2) => svg("0 0 100 100",
    `<circle cx="50" cy="50" r="48" fill="${c2}"/>` +
    `<path d="M14 92 C18 70 34 62 50 62 C66 62 82 70 86 92 A48 48 0 0 1 14 92 z" fill="${c}"/>` +
    `<circle cx="50" cy="42" r="17" fill="#f1c7a1"/>` +
    `<path d="M33 40 C33 24 45 20 52 21 C63 22 69 30 67 41 C62 33 52 30 40 34 z" fill="#3b2a22"/>` +
    `<circle cx="44" cy="44" r="1.8" fill="#3b2a22"/><circle cx="56" cy="44" r="1.8" fill="#3b2a22"/><path d="M45 51 q5 4 10 0" fill="none" stroke="#a5543a" stroke-width="1.8" stroke-linecap="round"/>`) },
};
export const DECO_IDS = Object.keys(DECOS);

const b64 = (s) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64"));
export const svgDataUrl = (s) => "data:image/svg+xml;base64," + b64(s);

/** The decoration's SVG markup (null when unknown). */
export function decoSvg(id, c = "#5b4cf0", c2 = "#14b8a6") {
  const d = DECOS[id];
  return d ? d.draw(hexOk(c, "#5b4cf0"), hexOk(c2, "#14b8a6")) : null;
}
/** CSS declarations that paint a decoration as the block's background picture. */
export function decoCss(id, c, c2) {
  const s = decoSvg(id, c, c2);
  if (!s) return "";
  const left = DECOS[id].pos === "left";
  return `background-image:url(${svgDataUrl(s)});background-repeat:no-repeat;background-position:${left ? "14px" : "right 10px"} center;background-size:auto 86%`;
}

/* ---------------- Elements panel: shapes, lines, stickers, charts (inserted as pictures) ---------------- */
const S = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
export const SHAPES = {
  circle: { label: "Circle", w: 160, svg: (c) => S("0 0 100 100", `<circle cx="50" cy="50" r="48" fill="${c}"/>`) },
  square: { label: "Square", w: 160, svg: (c) => S("0 0 100 100", `<rect x="2" y="2" width="96" height="96" fill="${c}"/>`) },
  rounded: { label: "Rounded box", w: 220, svg: (c) => S("0 0 160 100", `<rect x="2" y="2" width="156" height="96" rx="18" fill="${c}"/>`) },
  triangle: { label: "Triangle", w: 160, svg: (c) => S("0 0 100 100", `<polygon points="50,4 96,96 4,96" fill="${c}"/>`) },
  star: { label: "Star", w: 160, svg: (c) => S("0 0 100 100", `<polygon points="50,4 62,38 98,38 69,59 80,95 50,73 20,95 31,59 2,38 38,38" fill="${c}"/>`) },
  heart: { label: "Heart", w: 160, svg: (c) => S("0 0 100 92", `<path d="M50 88 C10 60 2 40 2 26 C2 12 14 2 27 2 C38 2 46 9 50 18 C54 9 62 2 73 2 C86 2 98 12 98 26 C98 40 90 60 50 88 z" fill="${c}"/>`) },
  arrow: { label: "Arrow", w: 220, svg: (c) => S("0 0 160 80", `<polygon points="0,26 104,26 104,4 158,40 104,76 104,54 0,54" fill="${c}"/>`) },
  blob: { label: "Blob", w: 200, svg: (c) => S("0 0 120 100", `<path d="M62 4 C92 2 118 24 116 52 C114 80 88 98 58 96 C26 94 4 76 4 50 C4 22 32 6 62 4 z" fill="${c}"/>`) },
  hexagon: { label: "Hexagon", w: 160, svg: (c) => S("0 0 100 88", `<polygon points="25,2 75,2 98,44 75,86 25,86 2,44" fill="${c}"/>`) },
  petal: { label: "Leaf", w: 160, svg: (c) => S("0 0 100 100", `<path d="M6 94 C6 40 40 6 94 6 C94 60 60 94 6 94 z" fill="${c}"/>`) },
};
export const LINES = {
  solid: { label: "Line", w: 600, svg: (c) => S("0 0 600 12", `<rect x="0" y="5" width="600" height="2.5" fill="${c}"/>`) },
  thick: { label: "Thick line", w: 600, svg: (c) => S("0 0 600 12", `<rect x="0" y="3" width="600" height="6" rx="3" fill="${c}"/>`) },
  dashed: { label: "Dashed line", w: 600, svg: (c) => S("0 0 600 12", `<line x1="0" y1="6" x2="600" y2="6" stroke="${c}" stroke-width="3" stroke-dasharray="14 9"/>`) },
  dotted: { label: "Dotted line", w: 600, svg: (c) => S("0 0 600 12", Array.from({ length: 40 }, (_, i) => `<circle cx="${7 + i * 15}" cy="6" r="3" fill="${c}"/>`).join("")) },
  wave: { label: "Wavy line", w: 600, svg: (c) => S("0 0 600 24", `<path d="M0 12 ${Array.from({ length: 20 }, () => "q7.5 -10 15 0 t15 0").join(" ")}" fill="none" stroke="${c}" stroke-width="3"/>`) },
  diamonds: { label: "Diamond divider", w: 600, svg: (c) => S("0 0 600 20", `<rect x="0" y="9" width="270" height="2" fill="${c}"/><rect x="330" y="9" width="270" height="2" fill="${c}"/>` + [285, 300, 315].map((x) => `<polygon points="${x},3 ${x + 6},10 ${x},17 ${x - 6},10" fill="${c}"/>`).join("")) },
};
export const STICKERS = {
  badge: { label: "New badge", w: 140, svg: () => S("0 0 100 100", Array.from({ length: 16 }, (_, i) => `<rect x="44" y="0" width="12" height="100" transform="rotate(${i * 11.25} 50 50)" fill="#ff7a59"/>`).join("") + `<circle cx="50" cy="50" r="38" fill="#ff7a59"/><text x="50" y="58" font-family="Arial" font-weight="700" font-size="24" fill="#fff" text-anchor="middle">NEW</text>`) },
  check: { label: "Done tick", w: 120, svg: () => S("0 0 100 100", `<circle cx="50" cy="50" r="46" fill="#14b8a6"/><path d="M28 52 l15 15 l30 -32" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`) },
  idea: { label: "Idea bulb", w: 120, svg: () => S("0 0 100 100", `<circle cx="50" cy="40" r="28" fill="#ffd166"/><rect x="38" y="66" width="24" height="16" rx="3" fill="#6b7280"/><rect x="42" y="84" width="16" height="6" rx="3" fill="#6b7280"/><path d="M42 44 l8 10 l8 -10" fill="none" stroke="#b45309" stroke-width="3"/>`) },
  smile: { label: "Smiley", w: 120, svg: () => S("0 0 100 100", `<circle cx="50" cy="50" r="46" fill="#ffd166"/><circle cx="36" cy="40" r="6" fill="#1f2937"/><circle cx="64" cy="40" r="6" fill="#1f2937"/><path d="M30 60 q20 22 40 0" fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>`) },
  sparkle: { label: "Sparkle", w: 120, svg: () => S("0 0 100 100", `<path d="M50 4 C54 36 64 46 96 50 C64 54 54 64 50 96 C46 64 36 54 4 50 C36 46 46 36 50 4 z" fill="#8b5cf6"/>`) },
  pin: { label: "Pin", w: 100, svg: () => S("0 0 80 100", `<path d="M40 98 C40 98 8 60 8 38 A32 32 0 0 1 72 38 C72 60 40 98 40 98 z" fill="#ef4444"/><circle cx="40" cy="38" r="12" fill="#fff"/>`) },
  ribbon: { label: "Ribbon", w: 260, svg: () => S("0 0 240 70", `<polygon points="0,14 30,14 30,60 0,60 14,37" fill="#2f80ff" opacity=".7"/><polygon points="240,14 210,14 210,60 240,60 226,37" fill="#2f80ff" opacity=".7"/><rect x="24" y="6" width="192" height="46" rx="4" fill="#2f80ff"/><text x="120" y="37" font-family="Arial" font-weight="700" font-size="20" fill="#fff" text-anchor="middle">GREAT WORK</text>`) },
  flowerSticker: { label: "Flower", w: 120, svg: () => decoSvg("flower", "#f472b6", "#ffd166").replace(' preserveAspectRatio="xMaxYMid meet"', "") },
};
export const EMOJI = ["😀", "🎉", "👍", "✅", "⭐", "🔥", "💡", "📌", "📅", "📈", "🚀", "❤️", "🙏", "⚠️", "📝", "🌱"];

function barChart(c) {
  const v = [42, 66, 54, 88, 72];
  return S("0 0 320 200", `<rect width="320" height="200" fill="#fff"/><line x1="30" y1="170" x2="300" y2="170" stroke="#94a3b8"/>` +
    v.map((h, i) => `<rect x="${48 + i * 50}" y="${170 - h * 1.6}" width="30" height="${h * 1.6}" rx="3" fill="${c}" opacity="${0.55 + i * 0.1}"/><text x="${63 + i * 50}" y="188" font-family="Arial" font-size="11" fill="#475569" text-anchor="middle">Q${i + 1 > 4 ? "5" : i + 1}</text>`).join(""));
}
function pieChart(c) {
  const parts = [[0, 0.42, c], [0.42, 0.7, "#14b8a6"], [0.7, 0.88, "#ff7a59"], [0.88, 1, "#ffd166"]];
  const pt = (f) => [100 + 80 * Math.sin(f * 2 * Math.PI), 100 - 80 * Math.cos(f * 2 * Math.PI)].map((n) => n.toFixed(1)).join(" ");
  return S("0 0 320 200", `<rect width="320" height="200" fill="#fff"/>` + parts.map(([a, b, col]) => `<path d="M100 100 L${pt(a)} A80 80 0 ${b - a > 0.5 ? 1 : 0} 1 ${pt(b)} z" fill="${col}"/>`).join("") +
    ["Online 42%", "Shops 28%", "Partners 18%", "Other 12%"].map((t, i) => `<rect x="200" y="${52 + i * 26}" width="12" height="12" rx="2" fill="${parts[i][2]}"/><text x="218" y="${62 + i * 26}" font-family="Arial" font-size="12" fill="#1f2937">${t}</text>`).join(""));
}
function lineChart(c) {
  const v = [30, 48, 40, 70, 64, 92];
  const pts = v.map((y, i) => `${40 + i * 50},${170 - y * 1.5}`).join(" ");
  return S("0 0 320 200", `<rect width="320" height="200" fill="#fff"/><line x1="30" y1="170" x2="300" y2="170" stroke="#94a3b8"/><line x1="30" y1="20" x2="30" y2="170" stroke="#94a3b8"/>` +
    `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>` + v.map((y, i) => `<circle cx="${40 + i * 50}" cy="${170 - y * 1.5}" r="5" fill="${c}"/>`).join(""));
}
export const CHARTS = {
  bars: { label: "Bar chart", w: 420, svg: barChart },
  pie: { label: "Pie chart", w: 420, svg: pieChart },
  line: { label: "Line chart", w: 420, svg: lineChart },
};
