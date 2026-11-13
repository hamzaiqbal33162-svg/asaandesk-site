// Elements kit › 3D: our own "3D look" renders drawn as SVG (gradients, lit faces, soft shadows). Inserted as SVG
// (editors that parse plain vectors keep them as images because of the gradients). Item: {id, name, tags, svg}.
import { n, ptsPath, starPts, heartD, blobD, ell, ellRev, svgDoc } from "./assets-svg.js";

const shadow = (cx = 50, cy = 92, rx = 30, ry = 5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sh)"/>`;
const SH = `<radialGradient id="sh"><stop offset="0" stop-color="#1b2133" stop-opacity=".28"/><stop offset="1" stop-color="#1b2133" stop-opacity="0"/></radialGradient>`;
const ball = (id, a, b, c = "#fff") => `<radialGradient id="${id}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".22" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const lin = (id, stops, x2 = 1, y2 = 0) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
const R = (id, name, tags, defs, body, vb = [100, 100]) => ({ id, name, tags: "3d render shape " + tags, svg: svgDoc(vb[0], vb[1], body, { px: 240, defs: SH + defs }) });
const cube = (top, left, right) => `<path d="${ptsPath([[50, 14], [86, 33], [50, 52], [14, 33]])}" fill="${top}"/><path d="${ptsPath([[14, 33], [50, 52], [50, 92], [14, 73]])}" fill="${left}"/><path d="${ptsPath([[50, 52], [86, 33], [86, 73], [50, 92]])}" fill="${right}"/>`;

function star3d() {
  const o = starPts(5, 50, 50, 44, 19);
  let s = "";
  for (let i = 0; i < 10; i += 2) { const tip = o[i], l = o[(i + 9) % 10], r = o[i + 1]; s += `<path d="${ptsPath([[50, 50], l, tip])}" fill="#ffd34d"/><path d="${ptsPath([[50, 50], tip, r])}" fill="#f2a516"/>`; }
  return s;
}
function gem() {
  const top = [[24, 30], [76, 30], [90, 44], [10, 44]], g = [[10, 44], [90, 44], [50, 92]];
  return `<path d="${ptsPath(top)}" fill="#7dd3fc"/><path d="${ptsPath([[24, 30], [40, 44], [10, 44]])}" fill="#bae6fd"/><path d="${ptsPath([[40, 44], [50, 30], [60, 44]])}" fill="#e0f2fe"/><path d="${ptsPath([[76, 30], [90, 44], [60, 44]])}" fill="#38bdf8"/>` +
    `<path d="${ptsPath(g)}" fill="#0ea5e9"/><path d="${ptsPath([[10, 44], [40, 44], [50, 92]])}" fill="#38bdf8"/><path d="${ptsPath([[40, 44], [60, 44], [50, 92]])}" fill="#7dd3fc"/><path d="${ptsPath([[60, 44], [90, 44], [50, 92]])}" fill="#0284c7"/>`;
}
const dots = (pts, r = 4.2) => pts.map(([x, y]) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${r}" ry="${n(r * 0.62)}" fill="#1b2133"/>`).join("");

export const THREE_D_ITEMS = [
  R("sphere", "Sphere", "sphere ball round purple", ball("a", "#8b7cf7", "#3b2bb0"), shadow() + `<circle cx="50" cy="46" r="38" fill="url(#a)"/>`),
  R("glossy-ball", "Glossy ball", "ball glossy shiny teal", ball("a", "#2dd4bf", "#0f766e"), shadow() + `<circle cx="50" cy="46" r="38" fill="url(#a)"/><ellipse cx="38" cy="28" rx="11" ry="6" fill="#fff" fill-opacity=".7" transform="rotate(-30 38 28)"/>`),
  R("cube", "Cube", "cube box block orange", "", shadow(50, 94, 34) + cube("#ffb38f", "#ff7a59", "#e0532f")),
  R("cylinder", "Cylinder", "cylinder tube can pink", lin("a", [[0, "#be185d"], [0.4, "#f472b6"], [1, "#9d174d"]]), shadow(50, 90, 32) + `<path d="M22 26V76A28 9 0 0 0 78 76V26Z" fill="url(#a)"/><ellipse cx="50" cy="26" rx="28" ry="9" fill="#fbcfe8"/>`),
  R("cone", "Cone", "cone party hat yellow", lin("a", [[0, "#d97706"], [0.45, "#fcd34d"], [1, "#b45309"]]), shadow(50, 88, 32) + `<path d="M50 8L80 78A30 9 0 0 1 20 78Z" fill="url(#a)"/>`),
  R("pyramid", "Pyramid", "pyramid triangle egypt", "", shadow(50, 92, 36) + `<path d="${ptsPath([[50, 10], [14, 74], [52, 88]])}" fill="#fcd34d"/><path d="${ptsPath([[50, 10], [52, 88], [88, 70]])}" fill="#d97706"/>`),
  R("torus", "Donut ring", "torus donut ring", `<radialGradient id="a" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#c4b5fd"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#4c1d95"/></radialGradient>`, shadow(50, 84, 38) + `<path d="${ell(50, 50, 42, 28)}${ellRev(50, 46, 16, 8)}" fill="url(#a)"/>`),
  R("capsule", "Capsule", "capsule pill medicine", lin("a", [[0, "#2f80ff"], [0.5, "#93c5fd"], [1, "#1d4ed8"]], 0, 1) + lin("b", [[0, "#fb7185"], [0.5, "#fecdd3"], [1, "#e11d48"]], 0, 1), shadow(50, 90, 34) + `<g transform="rotate(-35 50 50)"><path d="M14 38H50V62H14A12 12 0 0 1 14 38Z" fill="url(#a)"/><path d="M50 38H86A12 12 0 0 1 86 62H50Z" fill="url(#b)"/></g>`),
  R("heart-3d", "Heart", "heart love valentine 3d", ball("a", "#fb7185", "#be123c", "#ffe4e6"), shadow(50, 94, 30) + `<path d="${heartD(10, 12, 80, 74)}" fill="url(#a)"/><ellipse cx="30" cy="30" rx="8" ry="5" fill="#fff" fill-opacity=".6" transform="rotate(-35 30 30)"/>`),
  R("star-3d", "Star", "star gold rating 3d", "", shadow(50, 94, 32) + star3d()),
  R("coin", "Coin", "coin gold money", lin("a", [[0, "#fde68a"], [0.5, "#f59e0b"], [1, "#b45309"]], 1, 1), shadow(50, 92, 30) + `<ellipse cx="54" cy="52" rx="34" ry="38" fill="#b45309"/><ellipse cx="50" cy="48" rx="34" ry="38" fill="url(#a)"/><ellipse cx="50" cy="48" rx="25" ry="29" fill="none" stroke="#fef3c7" stroke-width="2.4" stroke-opacity=".8"/><path d="${ptsPath(starPts(5, 50, 49, 15, 6.5))}" fill="#fef3c7" fill-opacity=".85"/>`),
  R("gift", "Gift box", "gift present box birthday", "", shadow(50, 95, 34) + cube("#fb7185", "#e11d48", "#9f1239") + `<path d="M30 23.5L66 42.5V82.5L60 85.6V45.7L24 26.7Z" fill="#fcd34d"/><path d="M68 23.5L32 42.5V82L40 86V46.7L74 27Z" fill="#f59e0b" fill-opacity=".9"/><ellipse cx="42" cy="20" rx="10" ry="6" fill="none" stroke="#fcd34d" stroke-width="4"/><ellipse cx="58" cy="20" rx="10" ry="6" fill="none" stroke="#f59e0b" stroke-width="4"/>`),
  R("dice", "Dice", "dice game cube dots", "", shadow(50, 94, 34) + cube("#ffffff", "#e5e7f0", "#c8ccd9") + dots([[50, 33]]) + dots([[24, 50], [40, 75]], 3.6) + dots([[60, 52], [68, 62], [77, 72]], 3.6)),
  R("gem", "Gem", "gem diamond jewel crystal", "", shadow(50, 94, 26) + gem()),
  R("arrow-3d", "Arrow", "arrow 3d right next", lin("a", [[0, "#34d399"], [1, "#059669"]], 0, 1), shadow(50, 88, 38) + `<path d="${ptsPath([[10, 40], [56, 40], [56, 22], [92, 52], [56, 82], [56, 64], [10, 64]])}" transform="translate(4 5)" fill="#065f46"/><path d="${ptsPath([[10, 40], [56, 40], [56, 22], [92, 52], [56, 82], [56, 64], [10, 64]])}" fill="url(#a)"/>`),
  R("bubble-3d", "Chat bubble", "chat speech bubble message 3d", lin("a", [[0, "#60a5fa"], [1, "#2563eb"]], 0, 1), shadow(50, 94, 34) + `<path d="M50 12C74 12 90 26 90 44C90 62 74 74 50 74C45 74 41 73 37 72L18 84L24 66C14 60 10 52 10 44C10 26 26 12 50 12Z" transform="translate(3 4)" fill="#1e3a8a"/><path d="M50 12C74 12 90 26 90 44C90 62 74 74 50 74C45 74 41 73 37 72L18 84L24 66C14 60 10 52 10 44C10 26 26 12 50 12Z" fill="url(#a)"/><circle cx="34" cy="44" r="5" fill="#fff"/><circle cx="50" cy="44" r="5" fill="#fff"/><circle cx="66" cy="44" r="5" fill="#fff"/>`),
  R("check-3d", "Check badge", "check tick done approved success 3d", ball("a", "#4ade80", "#15803d", "#dcfce7"), shadow(50, 94, 30) + `<circle cx="52" cy="50" r="38" fill="#14532d"/><circle cx="50" cy="46" r="38" fill="url(#a)"/><path d="M32 47L45 60L69 34" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`),
  R("bolt-3d", "Lightning bolt", "lightning bolt energy power flash 3d", lin("a", [[0, "#fde047"], [1, "#f59e0b"]], 0, 1), shadow(50, 94, 26) + `<path d="${ptsPath([[58, 6], [22, 54], [46, 54], [38, 94], [78, 40], [53, 40]])}" transform="translate(4 3)" fill="#b45309"/><path d="${ptsPath([[58, 6], [22, 54], [46, 54], [38, 94], [78, 40], [53, 40]])}" fill="url(#a)"/>`),
  R("ring-gold", "Gold ring", "ring gold torus jewellery", `<radialGradient id="a" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#fef3c7"/><stop offset=".45" stop-color="#f59e0b"/><stop offset="1" stop-color="#92400e"/></radialGradient>`, shadow(50, 88, 34) + `<path d="${ell(50, 52, 36, 32)}${ellRev(50, 52, 27, 23)}" fill="url(#a)"/>`),
  R("blob-3d", "Soft blob", "blob organic abstract soft 3d", ball("a", "#a78bfa", "#0d9488", "#f5f3ff"), shadow(50, 94, 32) + `<path d="${blobD(50, 48, 40, 2.1, 6)}" fill="url(#a)"/>`),
  R("pin-3d", "Location pin", "location pin map marker place 3d", ball("a", "#f87171", "#b91c1c", "#fee2e2"), shadow(50, 94, 14, 4) + `<path d="M50 92C50 92 18 58 18 38A32 32 0 0 1 82 38C82 58 50 92 50 92Z" fill="url(#a)"/><circle cx="50" cy="38" r="12" fill="#fff"/>`),
];
