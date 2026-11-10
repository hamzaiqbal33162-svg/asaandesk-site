// Our own placeholder artwork for the website templates: simple generated SVG illustrations (no stock photos,
// no third-party images) plus a small stroke icon set for feature cards. Everything here is pure (no DOM).

const n = (v) => String(Math.round(v * 10) / 10);
/** SVG markup -> data: URL (percent-encoded, so quotes never break an HTML attribute or CSS url("…")). */
export const svgUrl = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
const doc = (w, h, bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
const rect = (x, y, w, h, fill, rx = 0, extra = "") => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${fill}"${extra}/>`;
const circ = (cx, cy, r, fill, extra = "") => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${extra}/>`;
const ell = (cx, cy, rx, ry, fill, rot = 0, extra = "") => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${n(cx)} ${n(cy)})"` : ""}${extra}/>`;
const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const line = (d, stroke, sw, extra = "") => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const rng = (seed) => { let s = (Math.abs(seed | 0) % 2147483646) + 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };
const leaf = (cx, cy, rot, fill, s = 1) => ell(cx, cy, 16 * s, 38 * s, fill, rot);

/** A palette: a (main), b (accent), c (light), d (dark), bg. */
export const PALETTES = {
  violet: { a: "#5b4cf0", b: "#ff7a59", c: "#ecebff", d: "#1f2440", bg: "#f6f5ff" },
  saffron: { a: "#d9480f", b: "#f2b632", c: "#fff1e0", d: "#3b2314", bg: "#fff8ef" },
  teal: { a: "#0f9488", b: "#f59e0b", c: "#dcf7f3", d: "#123b3a", bg: "#f2fbf9" },
  rose: { a: "#e11d48", b: "#7c3aed", c: "#ffe4ea", d: "#2a1530", bg: "#fff5f7" },
  ink: { a: "#2563eb", b: "#22c55e", c: "#e3edff", d: "#111827", bg: "#f5f8ff" },
  forest: { a: "#15803d", b: "#eab308", c: "#e3f6e8", d: "#132a1c", bg: "#f4fbf5" },
  slate: { a: "#334155", b: "#0ea5e9", c: "#e6edf5", d: "#0f172a", bg: "#f7f9fc" },
};
const pal = (p) => (typeof p === "string" ? PALETTES[p] : p) || PALETTES.violet;
const GREEN = "#2f9e57", GREEN2 = "#5cc27f";
const SKIN = ["#f1c7a1", "#d9a07a", "#b97b55", "#8d5a3b"];

const scenes = {
  shop(p) {
    let s = rect(0, 470, 800, 130, p.c) + circ(660, 110, 60, p.b, ' opacity=".25"');
    s += rect(170, 150, 460, 330, "#ffffff", 12) + rect(230, 170, 340, 52, p.d, 10);
    for (let i = 0; i < 6; i++) { const x = 170 + i * (460 / 6), w = 460 / 6; s += rect(x, 236, w, 40, i % 2 ? "#ffffff" : p.a) + circ(x + w / 2, 276, w / 2, i % 2 ? "#ffffff" : p.a); }
    s += rect(210, 330, 200, 120, p.c, 8) + circ(260, 400, 26, p.b) + rect(300, 370, 44, 60, p.a, 6) + circ(375, 410, 18, p.d, ' opacity=".7"');
    s += rect(452, 318, 132, 162, p.b, 8) + circ(565, 400, 7, "#ffffff");
    s += rect(100, 420, 54, 60, p.d, 6) + leaf(114, 385, -25, GREEN) + leaf(140, 380, 25, GREEN2) + leaf(127, 370, 0, GREEN);
    s += rect(650, 420, 54, 60, p.d, 6) + leaf(664, 385, -25, GREEN2) + leaf(690, 380, 25, GREEN) + leaf(677, 370, 0, GREEN2);
    return doc(800, 600, p.bg, s);
  },
  food(p) {
    let s = rect(0, 0, 800, 600, p.c) + circ(400, 330, 210, "#000000", ' opacity=".06"') + circ(400, 310, 200, "#ffffff") + circ(400, 310, 150, p.bg);
    s += circ(400, 310, 118, p.b) + circ(360, 280, 38, p.a) + circ(440, 330, 32, p.a) + circ(420, 260, 22, "#ffffff", ' opacity=".8"') + circ(370, 350, 20, "#ffffff", ' opacity=".7"');
    s += leaf(330, 330, 40, GREEN, 0.6) + leaf(455, 280, -30, GREEN2, 0.6) + leaf(400, 380, 80, GREEN, 0.55);
    for (let i = 0; i < 3; i++) s += line(`M${330 + i * 70} 110 C${310 + i * 70} 80 ${350 + i * 70} 60 ${330 + i * 70} 30`, p.d, 8, ' opacity=".25"');
    s += rect(110, 170, 16, 290, p.d, 8) + rect(98, 170, 8, 90, p.d, 4) + rect(130, 170, 8, 90, p.d, 4);
    s += path("M674 170 C710 200 712 300 690 320 L690 460 L676 460 Z", p.d) + rect(670, 300, 14, 160, p.d, 7);
    return doc(800, 600, p.c, s);
  },
  study(p) {
    let s = rect(0, 450, 800, 150, p.c) + rect(120, 80, 300, 200, p.d, 14) + line("M160 140 L300 140 M160 180 L360 180 M160 220 L260 220", "#ffffff", 10, ' opacity=".85"');
    s += rect(470, 392, 230, 58, p.a, 8) + rect(490, 338, 200, 54, p.b, 8) + rect(462, 288, 220, 50, p.d, 8) + rect(475, 300, 6, 26, "#ffffff", 3) + rect(500, 350, 6, 30, "#ffffff", 3);
    s += path("M582 160 L692 205 L582 250 L472 205 Z", p.d) + rect(530, 215, 104, 52, p.d, 10) + line("M692 205 L692 270", p.b, 6) + circ(692, 278, 10, p.b);
    s += path("M180 470 L216 330 L252 470 Z", p.b) + rect(150, 470, 132, 24, p.a, 6) + circ(216, 320, 18, "#ffd75e");
    s += rect(320, 420, 120, 18, p.b, 9, ' transform="rotate(-12 380 429)"') + path("M436 405 L462 400 L440 418 Z", p.d);
    return doc(800, 600, p.bg, s);
  },
  work(p) {
    let s = rect(0, 450, 800, 150, p.c) + rect(220, 140, 360, 240, p.d, 16) + rect(240, 160, 320, 200, "#ffffff", 8);
    const bars = [70, 120, 90, 150, 110];
    bars.forEach((h, i) => { s += rect(270 + i * 56, 330 - h, 36, h, i % 2 ? p.b : p.a, 6); });
    s += line("M270 230 L326 205 L382 220 L438 175 L494 190 L530 170", p.d, 5, ' opacity=".5"');
    s += path("M170 380 L630 380 L670 450 L130 450 Z", p.a) + rect(360, 395, 80, 10, "#ffffff", 5, ' opacity=".6"');
    s += rect(640, 330, 60, 76, p.b, 10) + line("M700 350 C730 350 730 390 700 390", p.b, 9) + line("M655 312 C650 300 662 292 657 280 M677 312 C672 300 684 292 679 280", p.d, 5, ' opacity=".35"');
    s += rect(80, 380, 60, 70, p.d, 8) + leaf(96, 345, -25, GREEN) + leaf(124, 342, 25, GREEN2) + leaf(110, 330, 0, GREEN);
    return doc(800, 600, p.bg, s);
  },
  event(p, seed = 7) {
    const r = rng(seed);
    let s = rect(0, 0, 800, 600, p.d) + path("M140 0 L60 600 L260 600 Z", p.c, ' opacity=".12"') + path("M660 0 L540 600 L760 600 Z", p.c, ' opacity=".12"') + path("M400 0 L310 600 L490 600 Z", p.b, ' opacity=".12"');
    s += rect(0, 470, 800, 130, p.a) + rect(0, 462, 800, 14, p.b);
    s += rect(385, 300, 30, 170, "#ffffff", 8) + rect(372, 210, 56, 110, "#ffffff", 28) + line("M372 260 L428 260 M372 280 L428 280", p.d, 4, ' opacity=".3"');
    const cols = [p.a, p.b, "#ffffff", p.c];
    for (let i = 0; i < 46; i++) { const x = r() * 800, y = r() * 430, c = cols[i % 4]; s += rect(x, y, 10 + r() * 10, 5 + r() * 6, c, 2, ` transform="rotate(${Math.round(r() * 180)} ${n(x)} ${n(y)})" opacity=".85"`); }
    return doc(800, 600, p.d, s);
  },
  map(p) {
    let s = rect(0, 0, 800, 600, "#e8f0e6") + path("M0 380 C160 330 260 470 420 420 C560 375 640 300 800 330 L800 410 C640 380 560 455 420 500 C260 548 160 410 0 460 Z", "#bfdcf5");
    s += line("M0 150 L800 230 M250 0 L330 600 M560 0 L520 600 M0 520 L800 470", "#ffffff", 26) + line("M0 150 L800 230 M250 0 L330 600 M560 0 L520 600", "#f6d38a", 6);
    s += rect(60, 30, 150, 90, "#d7e5d2", 10) + rect(380, 60, 120, 110, "#d7e5d2", 10) + rect(620, 60, 140, 110, "#d7e5d2", 10) + rect(380, 260, 110, 90, "#d7e5d2", 10) + rect(60, 240, 150, 100, "#d7e5d2", 10);
    s += path("M430 300 C430 245 515 245 515 300 C515 345 472 375 472 410 C472 375 430 345 430 300 Z", p.a, ' transform="translate(-30 -150) scale(1.3)"') + circ(564, 239, 22, "#ffffff");
    return doc(800, 600, "#e8f0e6", s);
  },
  abstract(p, seed = 1) {
    const r = rng(seed * 97 + 13), cols = [p.a, p.b, p.c, p.d];
    let s = "";
    for (let i = 0; i < 5; i++) {
      const c = cols[Math.floor(r() * 4)], x = r() * 800, y = r() * 600, k = r();
      if (k < 0.4) s += circ(x, y, 60 + r() * 140, c, ` opacity="${n(0.55 + r() * 0.45)}"`);
      else if (k < 0.75) s += rect(x - 120, y - 80, 160 + r() * 200, 120 + r() * 160, c, 30, ` transform="rotate(${Math.round(r() * 90 - 45)} ${n(x)} ${n(y)})" opacity="${n(0.6 + r() * 0.4)}"`);
      else s += line(`M${n(x - 300)} ${n(y)} C${n(x - 150)} ${n(y - 120)} ${n(x + 150)} ${n(y + 120)} ${n(x + 300)} ${n(y)}`, c, 26 + r() * 30, ' opacity=".8"');
    }
    return doc(800, 600, seed % 2 ? p.c : p.bg, s);
  },
  portrait(p, seed = 0) {
    const r = rng(seed * 31 + 5), skin = SKIN[seed % SKIN.length], hair = ["#2b1d14", "#4a2f1b", "#111111", "#6b4226"][Math.floor(r() * 4)];
    const shirt = [p.a, p.b, p.d][seed % 3], longHair = seed % 2 === 1;
    let s = circ(300, 300, 300, p.c);
    if (longHair) s += path("M175 250 C170 120 430 120 425 250 L440 420 L160 420 Z", hair);
    s += path("M90 600 C100 470 190 420 300 420 C410 420 500 470 510 600 Z", shirt) + rect(262, 330, 76, 110, skin, 30);
    s += ell(300, 250, 105, 120, skin) + path(longHair ? "M195 230 C200 140 400 140 405 230 C380 180 230 175 195 230 Z" : "M195 240 C185 140 410 135 405 240 C390 190 330 175 300 185 C260 175 215 195 195 240 Z", hair);
    s += circ(262, 262, 8, "#2b1d14") + circ(338, 262, 8, "#2b1d14") + line("M270 318 C290 334 310 334 330 318", "#8a4b3a", 6);
    return doc(600, 600, p.c, s);
  },
};

const products = {
  mug: (p) => rect(300, 230, 200, 230, p.a, 24) + line("M500 290 C580 290 580 400 500 400", p.a, 26) + rect(300, 230, 200, 30, "#ffffff", 14, ' opacity=".25"') + line("M360 200 C350 170 380 150 365 120 M430 200 C420 170 450 150 435 120", p.d, 9, ' opacity=".3"'),
  bag: (p) => line("M330 280 C330 160 470 160 470 280", p.d, 14) + path("M250 270 L550 270 L585 520 L215 520 Z", p.b) + rect(330, 340, 140, 60, "#ffffff", 10, ' opacity=".35"'),
  shirt: (p) => path("M310 170 L360 200 C380 220 420 220 440 200 L490 170 L600 230 L560 320 L510 300 L510 520 L290 520 L290 300 L240 320 L200 230 Z", p.a) + path("M360 200 C380 240 420 240 440 200", "none", ` stroke="${p.d}" stroke-width="8" opacity=".35"`),
  plant: (p) => path("M300 400 L500 400 L475 540 L325 540 Z", p.b) + rect(290, 380, 220, 34, p.d, 8) + leaf(345, 300, -30, GREEN, 1.6) + leaf(455, 300, 30, GREEN2, 1.6) + leaf(400, 260, 0, GREEN, 1.7) + leaf(320, 350, -60, GREEN2, 1.1) + leaf(480, 350, 60, GREEN, 1.1),
  bottle: (p) => rect(350, 150, 100, 70, p.d, 12) + rect(375, 210, 50, 40, p.d, 6) + rect(300, 245, 200, 290, p.a, 40) + rect(335, 330, 130, 90, "#ffffff", 12, ' opacity=".85"') + circ(400, 375, 26, p.b),
  candle: (p) => rect(320, 300, 160, 230, p.c, 16) + rect(320, 300, 160, 230, p.a, 16, ' opacity=".35"') + line("M400 300 L400 255", p.d, 6) + path("M400 160 C430 200 425 250 400 255 C375 250 370 200 400 160 Z", p.b) + path("M400 200 C412 220 410 245 400 247 C390 245 388 220 400 200 Z", "#fff3c4"),
  scarf: (p) => path("M220 180 C320 140 480 140 580 180 L560 520 C470 480 330 480 240 520 Z", p.a) + line("M260 230 C340 205 460 205 540 230 M255 300 C340 275 460 275 545 300 M250 370 C340 345 460 345 550 370", "#ffffff", 8, ' opacity=".5"') + line("M250 520 L250 560 M290 505 L290 548 M330 498 L330 540 M470 498 L470 540 M510 505 L510 548 M550 520 L550 560", p.b, 7),
  book: (p) => rect(260, 160, 280, 370, p.a, 14) + rect(285, 160, 18, 370, p.d, 4, ' opacity=".35"') + rect(330, 230, 170, 26, "#ffffff", 8, ' opacity=".85"') + rect(330, 272, 120, 16, "#ffffff", 8, ' opacity=".6"') + circ(415, 420, 50, p.b),
};

/** Scene illustration (800×600, portrait 600×600) as a data: URL. kind: shop, food, study, work, event, map, abstract, portrait. */
export function art(kind, palette = "violet", seed = 1) {
  const p = pal(palette);
  const fn = scenes[kind] || scenes.abstract;
  return svgUrl(fn(p, seed));
}
/** Product illustration (800×640) as a data: URL. kind: mug, bag, shirt, plant, bottle, candle, scarf, book. */
export function productArt(kind, palette = "violet") {
  const p = pal(palette);
  const body = (products[kind] || products.mug)(p);
  return svgUrl(doc(800, 640, p.c, ell(400, 560, 230, 26, "#000000", 0, ' opacity=".08"') + body));
}
export const ART_KINDS = Object.keys(scenes);
export const PRODUCT_KINDS = Object.keys(products);

/* ------------------------------------------------------------------ icons (24×24, stroked, our own) */
export const ICONS = {
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  heart: "M12 20s-7-4.5-9-9a4.8 4.8 0 019-3 4.8 4.8 0 019 3c-2 4.5-9 9-9 9z",
  check: "M4 12.5l5 5L20 6.5",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  phone: "M5 3h4l2 5-2.5 1.5a11 11 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M8 7h7",
  cart: "M3 4h2l2.4 11h10.2L20 7H6.2M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  leaf: "M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7",
  chat: "M4 5h16v11H9l-5 4z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  truck: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z",
  cup: "M5 8h12v5a6 6 0 01-12 0zM17 9h1.5a2.5 2.5 0 010 5H17M8 3v2M11 3v2M14 3v2",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 6.5M18 14a6 6 0 013.5 6",
  award: "M12 14a5.5 5.5 0 100-11 5.5 5.5 0 000 11zM8.5 12.5L7 21l5-3 5 3-1.5-8.5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  gift: "M4 10h16v4H4zM6 14h12v7H6zM12 10v11M12 10C9 10 7 8.5 8 6.5S12 7 12 10zM12 10c3 0 5-1.5 4-3.5S12 7 12 10z",
  palette: "M12 3a9 9 0 100 18c1.2 0 1.5-1 1-2s-.2-2.5 1.5-2.5H17a4 4 0 004-4C21 7 17 3 12 3zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  music: "M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z",
};
export const ICON_NAMES = Object.keys(ICONS);
/** Inline SVG for HTML (no xmlns needed inside HTML, decorative so aria-hidden). */
export const iconSvg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[name] || ICONS.star}"/></svg>`;
