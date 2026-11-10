// Product mockups: our own simple SVG illustrations of a T-shirt, a hoodie and a mug, with the current design
// placed on the print area (clipped to the product; the mug wraps the design around a cylinder with shading).
import { renderPage } from "./canvas.js";
import { presetPx } from "./presets.js";

export const PRODUCTS = [
  { id: "tshirt", label: "T-shirt" },
  { id: "hoodie", label: "Hoodie" },
  { id: "mug", label: "Mug" },
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
};

function svgImage(markup) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("Mockup picture failed.")); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup); });
}
function productSvg(kind, color) {
  const s = SHAPES[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
    <path d="${s.body}" fill="${color}" stroke="${shade(color, -0.25)}" stroke-width="3" stroke-linejoin="round"/>${s.details(color)}</svg>`;
}
function shadeSvg(kind) {
  const s = SHAPES[kind];
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
export async function renderMockup(design, pageIndex, { product = "tshirt", color = "#ffffff", view = "front", size = 1000, chartPrims, tablePrims } = {}) {
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
  ctx.beginPath(); ctx.ellipse(product === "mug" ? 500 : 500, product === "mug" ? 822 : 930, product === "mug" ? 300 : 300, product === "mug" ? 26 : 22, 0, 0, Math.PI * 2); ctx.fill();
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
    const s = Math.min(a.w / W, a.h / H);
    const dw = W * s, dh = H * s;
    const page = await renderPage(design, pageIndex, { width: Math.min(2400, dw * k * 2), chartPrims, tablePrims });
    ctx.save(); ctx.clip(body);
    ctx.drawImage(page, a.x + (a.w - dw) / 2, a.y, dw, dh);
    ctx.restore();
  }
  ctx.drawImage(await svgImage(shadeSvg(product)), 0, 0, 1000, 1000);
  ctx.restore();
  return c;
}
/** The product a preset is printed on (merch presets), else null. */
export const productFor = (preset) => ({ tshirt: "tshirt", hoodie: "hoodie", mug: "mug" })[preset?.id] || null;
export { productSvg, shadeSvg, SHAPES as MOCKUP_SHAPES };
