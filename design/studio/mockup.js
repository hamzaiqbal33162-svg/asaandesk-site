// Product mockups: our own simple SVG illustrations of a T-shirt, a hoodie and a mug, with the current design
// placed on the print area (clipped to the product; the mug wraps the design around a cylinder with shading).
import { renderPage } from "./canvas.js";
import { presetPx } from "./presets.js";

export const PRODUCTS = [
  { id: "tshirt", label: "T-shirt", cat: "Clothing" },
  { id: "hoodie", label: "Hoodie", cat: "Clothing" },
  { id: "tote", label: "Tote bag", cat: "Clothing" },
  { id: "mug", label: "Mug", cat: "Home" },
  { id: "poster", label: "Framed poster", cat: "Home" },
  { id: "frame", label: "Square frame", cat: "Home" },
  { id: "phone", label: "Phone screen", cat: "Devices" },
  { id: "laptop", label: "Laptop screen", cat: "Devices" },
  { id: "card", label: "Business card", cat: "Print" },
  { id: "brochure", label: "Tri-fold brochure", cat: "Print" },
  { id: "book", label: "Book cover", cat: "Print" },
  { id: "magazine", label: "Magazine", cat: "Print" },
  { id: "bottle", label: "Bottle label", cat: "Products" },
];
export const SHIRT_COLORS = [
  { id: "#ffffff", label: "White" }, { id: "#1f2937", label: "Black" }, { id: "#1e3a8a", label: "Navy" }, { id: "#b91c1c", label: "Red" },
  { id: "#9ca3af", label: "Grey" }, { id: "#eab308", label: "Mustard" }, { id: "#166534", label: "Green" }, { id: "#f9a8d4", label: "Pink" },
  { id: "#f5f0e6", label: "Cream" }, { id: "#7c3aed", label: "Purple" },
];

const shade = (hex, k) => {
  const v = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  const out = c.map((x) => Math.max(0, Math.min(255, Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k))));
  return "#" + out.map((x) => x.toString(16).padStart(2, "0")).join("");
};
const isDark = (hex) => { const v = hex.replace("#", ""); const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)); return r * 0.299 + g * 0.587 + b * 0.114 < 110; };

// Shapes in a 1000 × 1000 box.
const SHAPES = {
  tshirt: {
    body: "M405 150C432 214 568 214 595 150L700 172L872 298L800 402L716 356L722 900Q500 918 278 900L284 356L200 402L128 298L300 172Z",
    details: (c) => `<path d="M405 150C432 214 568 214 595 150" fill="none" stroke="${shade(c, -0.18)}" stroke-width="16" stroke-linecap="round"/>
      <path d="M300 172L284 356M700 172L716 356" stroke="#000" stroke-opacity=".10" stroke-width="3" fill="none"/>
      <path d="M216 384L276 350M784 384L724 350" stroke="#000" stroke-opacity=".08" stroke-width="3" fill="none"/>`,
    area: { x: 350, y: 255, w: 300, h: 400 }, // 12 × 16 in
  },
  hoodie: {
    body: "M360 196L640 196L770 238L888 560L832 604L742 430L744 884Q500 904 256 884L258 430L168 604L112 560L230 238Z",
    details: (c) => `<path d="M352 214C330 96 670 96 648 214C600 250 400 250 352 214Z" fill="${shade(c, -0.1)}"/>
      <path d="M400 214C392 150 608 150 600 214C560 236 440 236 400 214Z" fill="${shade(c, -0.35)}"/>
      <path d="M452 236L444 400M548 236L556 400" stroke="${shade(c, isDark(c) ? 0.5 : -0.4)}" stroke-width="7" stroke-linecap="round"/>
      <path d="M362 690L638 690L690 846L310 846Z" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="4" stroke-linejoin="round"/>
      <path d="M258 846L744 846L744 884Q500 904 256 884Z" fill="#000" fill-opacity=".07"/>
      <path d="M230 238L258 430M770 238L742 430" stroke="#000" stroke-opacity=".10" stroke-width="3" fill="none"/>`,
    area: { x: 360, y: 280, w: 280, h: 327 }, // 12 × 14 in
  },
  mug: {
    body: "M240 230L240 760Q240 812 292 812L648 812Q700 812 700 760L700 230Z",
    details: (c) => `<path d="M700 330C866 326 884 650 700 664L700 612C812 604 806 384 700 382Z" fill="${shade(c, -0.06)}" stroke="#000" stroke-opacity=".08" stroke-width="3"/>
      <ellipse cx="470" cy="230" rx="230" ry="40" fill="${shade(c, -0.08)}"/>
      <ellipse cx="470" cy="232" rx="212" ry="31" fill="${shade(c, -0.42)}"/>`,
    area: { x: 260, y: 272, w: 420, h: 528 }, // visible half of an 8.5 × 3.5 in wrap (below the rim)
  },
  tote: {
    body: "M290 340L710 340L740 880Q500 900 260 880Z",
    under: (c) => `<path d="M370 342C360 170 470 150 476 342M524 342C530 150 640 170 630 342" fill="none" stroke="${shade(c, -0.3)}" stroke-width="26" stroke-linecap="round"/>`,
    details: (c) => `<path d="M290 340L710 340L712 372L288 372Z" fill="${shade(c, -0.08)}"/>`,
    area: { x: 350, y: 430, w: 300, h: 340 },
  },
  poster: {
    body: "M290 150H710V750H290Z", flat: true, floor: false,
    under: () => `<rect x="300" y="168" width="420" height="600" fill="#000" fill-opacity=".12"/>`,
    details: () => `<path d="M290 150H710V750H290Z" fill="none" stroke="#3f2d20" stroke-width="34" stroke-linejoin="miter"/>`,
    area: { x: 307, y: 167, w: 386, h: 566 },
  },
  frame: {
    body: "M310 230H690V610H310Z", flat: true, floor: false,
    under: () => `<rect x="268" y="196" width="464" height="464" fill="#000" fill-opacity=".1"/><rect x="262" y="182" width="476" height="476" fill="#f8fafc" stroke="#1f2937" stroke-width="22"/>`,
    details: () => `<path d="M310 230H690V610H310Z" fill="none" stroke="#e5e7eb" stroke-width="2"/>`,
    area: { x: 310, y: 230, w: 380, h: 380 },
  },
  phone: {
    body: "M352 176Q352 160 368 160H632Q648 160 648 176V824Q648 840 632 840H368Q352 840 352 824Z", flat: true,
    under: () => `<rect x="330" y="132" width="340" height="736" rx="52" fill="#111827"/>`,
    details: () => `<rect x="455" y="168" width="90" height="22" rx="11" fill="#111827"/>`,
    area: { x: 352, y: 196, w: 296, h: 628 },
  },
  laptop: {
    body: "M232 222H768V598H232Z", flat: true,
    under: () => `<rect x="212" y="202" width="576" height="416" rx="18" fill="#1f2937"/><path d="M140 618H860L820 668Q500 684 180 668Z" fill="#cbd5e1"/><path d="M440 618H560L552 632H448Z" fill="#94a3b8"/>`,
    details: () => ``,
    area: { x: 232, y: 222, w: 536, h: 376 },
  },
  card: {
    body: "M280 380H720V632H280Z", flat: true,
    under: () => `<rect x="300" y="330" width="440" height="252" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2" transform="rotate(-8 520 456)"/><rect x="286" y="392" width="440" height="252" fill="#000" fill-opacity=".1"/>`,
    details: () => `<path d="M280 380H720V632H280Z" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/>`,
    area: { x: 280, y: 380, w: 440, h: 252 },
  },
  book: {
    body: "M350 160H690V840H350Z", flat: true,
    under: () => `<path d="M350 160L690 160L712 178L712 858L372 858L350 840Z" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/><path d="M700 172V852" stroke="#e2e8f0" stroke-width="4"/><path d="M706 176V856" stroke="#e2e8f0" stroke-width="3"/>`,
    details: () => `<rect x="350" y="160" width="22" height="680" fill="#000" fill-opacity=".12"/><path d="M372 160V840" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`,
    area: { x: 350, y: 160, w: 340, h: 680 },
  },
  magazine: {
    body: "M330 150H690V830H330Z", flat: true,
    under: () => `<rect x="360" y="170" width="360" height="680" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2" transform="rotate(7 540 510)"/><rect x="340" y="166" width="360" height="680" fill="#000" fill-opacity=".1"/>`,
    details: () => `<path d="M330 150H690V830H330Z" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="2"/>`,
    area: { x: 330, y: 150, w: 360, h: 680 },
  },
  bottle: {
    body: "M370 480H630V740H370Z", flat: true,
    under: (c) => `<path d="M455 120H545V200C545 236 640 280 640 360V860Q640 890 610 890H390Q360 890 360 860V360C360 280 455 236 455 200Z" fill="${shade(c, -0.55)}" fill-opacity=".9"/><rect x="448" y="92" width="104" height="44" rx="8" fill="#1f2937"/><path d="M392 380V850" stroke="#fff" stroke-opacity=".25" stroke-width="14" stroke-linecap="round"/>`,
    details: () => `<path d="M370 480H630V740H370Z" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/>`,
    area: { x: 370, y: 480, w: 260, h: 260 },
  },
  brochure: {
    body: "M120 300H880V838H120Z", flat: true,
    under: () => `<rect x="132" y="316" width="760" height="538" fill="#000" fill-opacity=".1"/>`,
    details: () => `<defs><linearGradient id="f1" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient><linearGradient id="f2" x1="1" x2="0"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
      <rect x="373" y="300" width="40" height="538" fill="url(#f1)"/><rect x="587" y="300" width="40" height="538" fill="url(#f2)"/><path d="M373 300V838M627 300V838" stroke="#000" stroke-opacity=".18" stroke-width="2"/>`,
    area: { x: 120, y: 300, w: 760, h: 538 },
  },
};

function svgImage(markup) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("Mockup picture failed.")); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup); });
}
function productSvg(kind, color) {
  const s = SHAPES[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">${s.under ? s.under(color) : ""}
    <path d="${s.body}" fill="${color}" stroke="${shade(color, -0.25)}" stroke-width="3" stroke-linejoin="round"/>${s.details(color)}</svg>`;
}
function shadeSvg(kind) {
  const s = SHAPES[kind];
  if (s.flat) return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient></defs><path d="${s.body}" fill="url(#g)"/></svg>`;
  if (kind === "mug") return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="240" x2="700" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".18" stop-color="#000" stop-opacity=".06"/><stop offset=".32" stop-color="#fff" stop-opacity=".28"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient></defs>
    <path d="${s.body}" fill="url(#g)"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="200" x2="800" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".07"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <linearGradient id="v" y1="150" y2="920" x1="0" x2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient></defs>
    <path d="${s.body}" fill="url(#g)"/><path d="${s.body}" fill="url(#v)"/>
    <path d="M420 300C440 420 430 560 452 700M590 320C575 470 600 600 580 760" stroke="#000" stroke-opacity=".035" stroke-width="22" fill="none" stroke-linecap="round"/></svg>`;
}

/**
 * Renders a mockup canvas (size × size px). opts: { product: 'tshirt' | 'hoodie' | 'mug', color, view: 'front' | 'left' | 'right', size }.
 */
export async function renderMockup(design, pageIndex, { product = "tshirt", color = "#ffffff", view = "front", size = 1000, place = null, chartPrims, tablePrims } = {}) {
  // place = { scale (1 = fit the print area), dx, dy (share of the print area), rot (degrees) }: where the design sits.
  const pl = { scale: 1, dx: 0, dy: 0, rot: 0, ...(place || {}) };
  const S = SHAPES[product];
  if (!S) throw new Error("Unknown product " + product);
  const k = size / 1000;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  // Backdrop and floor shadow.
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, "#f6f5ff"); bg.addColorStop(1, "#e7e5f7");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  ctx.save(); ctx.scale(k, k);
  ctx.fillStyle = "rgba(27,33,51,.12)";
  if (S.floor !== false) { ctx.beginPath(); ctx.ellipse(500, product === "mug" ? 822 : product === "laptop" ? 690 : product === "card" ? 660 : 930, 300, product === "mug" ? 26 : 22, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.drawImage(await svgImage(productSvg(product, color)), 0, 0, 1000, 1000);
  // The design.
  const { w: W, h: H } = presetPx(design.preset);
  const a = S.area;
  const body = new Path2D(S.body);
  if (product === "mug") {
    const res = Math.min(4, 2400 / W);
    const page = await renderPage(design, pageIndex, { scale: res, chartPrims, tablePrims });
    // Fit the design's height to the mug's print height; the width wraps around the mug.
    const offset = view === "left" ? -0.25 : view === "right" ? 0.25 : 0;
    const cols = Math.round(a.w);
    ctx.save(); ctx.clip(body);
    for (let i = 0; i < cols; i++) {
      const x0 = (i / cols) * 2 - 1, x1 = ((i + 1) / cols) * 2 - 1;
      const u0 = 0.5 + offset + Math.asin(x0) / (2 * Math.PI), u1 = 0.5 + offset + Math.asin(x1) / (2 * Math.PI);
      const sx = ((u0 % 1) + 1) % 1 * page.width, sw = Math.max(0.5, (u1 - u0) * page.width);
      ctx.drawImage(page, sx, 0, Math.min(sw, page.width - sx), page.height, a.x + i, a.y, 1.02, a.h);
    }
    ctx.restore();
  } else {
    const s = Math.min(a.w / W, a.h / H) * Math.max(0.2, Math.min(2, pl.scale));
    const dw = W * s, dh = H * s;
    const page = await renderPage(design, pageIndex, { width: Math.min(2400, dw * k * 2), chartPrims, tablePrims });
    ctx.save(); ctx.clip(body);
    ctx.translate(a.x + a.w / 2 + pl.dx * a.w, a.y + Math.min(dh, a.h) / 2 + pl.dy * a.h);
    if (pl.rot) ctx.rotate((pl.rot * Math.PI) / 180);
    ctx.drawImage(page, -dw / 2, -Math.min(dh, a.h) / 2, dw, dh);
    ctx.restore();
  }
  ctx.drawImage(await svgImage(shadeSvg(product)), 0, 0, 1000, 1000);
  ctx.restore();
  return c;
}
/** The product a preset is printed on (merch presets), else null. */
export const productFor = (preset) => ({ tshirt: "tshirt", hoodie: "hoodie", mug: "mug" })[preset?.id] || null;
export { productSvg, shadeSvg, SHAPES as MOCKUP_SHAPES };
