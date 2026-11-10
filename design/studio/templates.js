// AsaanDesk Studio templates: our own original designs, built from our stickers (/pdf-editor/elements.js),
// shapes and text with placeholder colours. Pure module (no DOM access at import time), so the site's
// Templates Marketplace can import it:   import { listTemplates, templateSvg } from "/design/studio/templates.js";
import { ELEMENTS } from "/pdf-editor/elements.js";
import { getPreset, presetPx, designPreset, PRESET_GROUPS } from "./presets.js";
import { textHeight } from "./textlayout.js";
import { pageSvg } from "./svg.js";
import { collageFrames } from "./collage.js";

const EL = new Map(ELEMENTS.map((e) => [e.id, e]));
let seq = 0;
const lid = () => "t" + (seq++).toString(36);
const common = (type, x, y, w, h, o = {}) => ({ id: lid(), type, name: o.name || type[0].toUpperCase() + type.slice(1), x, y, w, h, rotation: o.rot || 0, opacity: o.op ?? 1, locked: false, hidden: false, animation: null });

// Text: T(content, x, y, w, { size, family, bold, italic, color, align, lh, ls, shadow, outline, bg, underline })
function T(content, x, y, w, o = {}) {
  const text = { content, family: o.family || "sans", size: o.size || 32, bold: !!o.bold, italic: !!o.italic, underline: !!o.underline, color: o.color || "#1b2133", align: o.align || "left", lineHeight: o.lh || 1.2, letterSpacing: o.ls || 0 };
  if (o.shadow) text.shadow = o.shadow;
  if (o.outline) text.outline = o.outline;
  if (o.bg) text.bg = o.bg;
  const l = { ...common("text", x, y, w, 10, { ...o, name: o.name || content.split("\n")[0].slice(0, 24) }), text };
  l.h = textHeight(text, w);
  return l;
}
// Shapes: S(kind, x, y, w, h, fill, { stroke, sw, radius, sides, points })
const S = (kind, x, y, w, h, fill, o = {}) => ({ ...common("shape", x, y, w, h, { ...o, name: o.name || kind[0].toUpperCase() + kind.slice(1) }), shape: { kind, fill: kind === "line" || kind === "arrow" ? "none" : fill, stroke: kind === "line" || kind === "arrow" ? fill : o.stroke || "none", strokeWidth: o.sw || (kind === "line" || kind === "arrow" ? 4 : 0), radius: o.radius || 0, sides: o.sides || 6, points: o.points || 5 } });
const R = (x, y, w, h, fill, o) => S("rect", x, y, w, h, fill, o);
const C = (x, y, w, h, fill, o) => S("ellipse", x, y, w, h, fill, o);
// Stickers: E(id, x, y, w, { h, c1, c2, c3, rot })
function E(id, x, y, w, o = {}) {
  const el = EL.get(id);
  if (!el) throw new Error("Unknown sticker " + id);
  const h = o.h || (w * el.vb[1]) / el.vb[0];
  const colors = { ...el.defaults };
  for (const k of ["c1", "c2", "c3"]) if (o[k]) colors[k] = o[k];
  return { ...common("element", x, y, w, h, { ...o, name: o.name || el.name }), element: { id: el.id, vb: [...el.vb], parts: JSON.parse(JSON.stringify(el.parts)), colors } };
}
// Photo frames (empty until the user drops a photo).
const F = (x, y, w, h, o = {}) => ({ ...common("frame", x, y, w, h, { ...o, name: o.name || "Photo frame" }), frame: { shape: o.shape || "rect", radius: o.radius || 0, image: null, ...(o.border ? { border: o.border } : {}) } });
const bg = (v) => (Array.isArray(v) ? { gradient: { angle: v[2] ?? 135, stops: [v[0], v[1]] } } : { color: v });
const page = (background, layers) => ({ id: lid(), background: bg(background), layers: layers.flat().filter(Boolean) });
/** Stacks layers downwards from y with gaps (a number between items sets the next gap). */
function flow(y, ...items) {
  let gap = 0;
  const out = [];
  for (const it of items) { if (typeof it === "number") { gap = it; continue; } it.y = y; y += it.h + gap; out.push(it); }
  return out;
}

const DEFS = [];
function tpl(id, title, presetId, tags, build) { DEFS.push({ id, title, presetId, tags, build }); }

const INK = "#1b2133", MUTED = "#6a7389", IND = "#5b4cf0", COR = "#ff7a59", TEA = "#14b8a6", AMB = "#f59e0b", ROS = "#f43f5e", WHITE = "#ffffff", GOLD = "#fde68a", NAVY = "#1e1b4b";

/* ================= Social media ================= */
tpl("sale-post", "Weekend sale post", "instagram-post", "sale discount offer weekend shop riyayat chhoot sale pesh kash", (W, H) => [page([IND, "#a64bf4", 135], [
  E("deco-confetti", 40, 40, 240, { c1: GOLD, c2: COR }),
  E("badge-half-off", 790, 70, 220, { c1: COR, c2: WHITE, rot: 12 }),
  flow(250,
    T("WEEKEND", 90, 0, 900, { size: 60, bold: true, color: GOLD, align: "center", ls: 14 }), 6,
    T("BIG SALE", 40, 0, 1000, { size: 190, bold: true, color: WHITE, align: "center", lh: 1 }), 24,
    T("Up to 50% off on everything", 90, 0, 900, { size: 46, color: "#ede9fe", align: "center" })),
  R(330, 760, 420, 110, COR, { radius: 55, name: "Button" }),
  T("Shop now", 330, 782, 420, { size: 48, bold: true, color: WHITE, align: "center" }),
  E("deco-sparkles", 900, 860, 130, { c1: GOLD, c2: WHITE }),
])]);
tpl("quote-post", "Daily quote post", "instagram-post", "quote motivation thought aqwal qoul soch inspiration", (W, H) => [page("#fff7ed", [
  E("deco-sprig", 820, 60, 200, { c1: TEA, c2: "#0f766e", rot: 20 }),
  T("“", 90, 150, 300, { size: 300, name: "Quote mark", family: "serif", bold: true, color: COR, lh: 1 }),
  flow(470,
    T("Small steps every day add up to big results.", 110, 0, 860, { size: 74, family: "serif", italic: true, color: INK, lh: 1.25 }), 40,
    E("line-ornament", 110, 0, 320, { c1: COR }), 30,
    T("— Your name", 110, 0, 600, { size: 38, color: MUTED, bold: true })),
])]);
tpl("new-arrival-post", "New arrival post", "instagram-post", "new arrival product launch shop collection naya maal nayi cheez", (W, H) => [page("#ecfdf5", [
  C(300, 90, 480, 480, "#ccfbf1"),
  F(330, 120, 420, 420, { shape: "circle", name: "Product photo" }),
  E("badge-new", 760, 90, 170, { c1: ROS, c2: WHITE, rot: -10 }),
  flow(620,
    T("NEW ARRIVAL", 60, 0, 960, { size: 104, bold: true, color: "#0f766e", align: "center", ls: 4 }), 12,
    T("Fresh collection is here", 60, 0, 960, { size: 46, color: "#115e59", align: "center" })),
  R(0, 950, 1080, 130, TEA, { name: "Footer band" }),
  T("www.yourshop.pk", 0, 990, 1080, { size: 40, bold: true, color: WHITE, align: "center" }),
])]);
tpl("eid-post", "Eid Mubarak post", "instagram-post", "eid mubarak festival greeting eid ul fitr eid ul adha chand mubarakbad", (W, H) => [page([NAVY, "#4338ca", 160], [
  E("deco-hanging-stars", 60, 0, 220, { c1: GOLD, c2: GOLD }),
  E("deco-lantern", 860, 0, 140, { c1: GOLD, c2: "#fbbf24", c3: "#fff7cc" }),
  E("icon-crescent-star", 440, 230, 200, { c1: GOLD }),
  flow(470,
    T("Eid Mubarak", 60, 0, 960, { size: 140, family: "serif", bold: true, color: GOLD, align: "center", shadow: { x: 0, y: 6, blur: 18, color: "#000000", opacity: 0.35 } }), 20,
    E("line-ornament", 340, 0, 400, { c1: GOLD }), 20,
    T("Wishing you joy, peace and happiness", 90, 0, 900, { size: 44, color: "#e0e7ff", align: "center" })),
  T("From all of us at Your Shop", 90, 960, 900, { size: 30, color: "#a5b4fc", align: "center" }),
])]);
tpl("food-special-post", "Today's special food post", "instagram-post", "food menu restaurant special deal khana menu deal dhaba", (W, H) => [page("#fff1e6", [
  F(60, 60, 960, 560, { shape: "rounded", radius: 40, name: "Food photo" }),
  C(800, 470, 220, 220, ROS, { name: "Price circle" }),
  T("Rs 499\nonly", 800, 513, 220, { size: 44, bold: true, color: WHITE, align: "center", lh: 1.05 }),
  flow(680,
    T("Today's Special", 70, 0, 700, { size: 88, family: "serif", bold: true, color: "#9a3412", lh: 1 }), 16,
    T("Chicken karahi with fresh naan and raita", 70, 0, 680, { size: 40, color: "#7c2d12" })),
  E("icon-chai", 70, 925, 80, { c1: "#9a3412" }),
  T("Order on WhatsApp 0300 1234567", 170, 945, 800, { size: 36, bold: true, color: "#9a3412" }),
])]);
tpl("announcement-story", "Big news story", "instagram-story", "announcement news story opening branch khabar elaan", (W, H) => [page([COR, ROS, 160], [
  E("deco-burst", 140, 260, 800, { c1: "#ffd2c2", c2: "#ffffff", op: 0.35 }),
  flow(560,
    T("BIG NEWS", 60, 0, 960, { size: 170, bold: true, color: WHITE, align: "center", lh: 1, shadow: { x: 0, y: 8, blur: 20, color: "#7f1d1d", opacity: 0.3 } }), 40,
    T("We are opening our second branch in Lahore", 120, 0, 840, { size: 64, color: WHITE, align: "center", lh: 1.25 })),
  E("arrow-down", 500, 1380, 80, { c1: WHITE }),
  R(290, 1560, 500, 120, WHITE, { radius: 60, name: "Button" }),
  T("Tap to know more", 290, 1594, 500, { size: 44, bold: true, color: ROS, align: "center" }),
])]);
tpl("coming-soon-story", "Coming soon story", "instagram-story", "coming soon launch teaser countdown jald aa raha hai", (W, H) => [page(INK, [
  E("deco-sparkles", 120, 180, 200, { c1: GOLD, c2: WHITE }),
  E("deco-sparkle", 820, 360, 120, { c1: GOLD }),
  F(140, 560, 800, 800, { shape: "rounded", radius: 48, name: "Teaser photo" }),
  T("COMING SOON", 40, 380, 1000, { size: 116, bold: true, color: WHITE, align: "center", ls: 2 }),
  T("15 . 12 . 2026", 60, 1440, 960, { size: 76, family: "mono", bold: true, color: AMB, align: "center" }),
  T("Stay tuned", 60, 1560, 960, { size: 48, color: "#cbd5e1", align: "center" }),
])]);
tpl("whatsapp-offer-status", "WhatsApp status offer", "whatsapp-status", "whatsapp status offer deal discount pesh kash riyayat", (W, H) => [page("#dcfce7", [
  E("badge-sale", 340, 200, 400, { c1: ROS, c2: WHITE }),
  flow(520,
    T("Special offer", 60, 0, 960, { size: 130, family: "serif", bold: true, color: "#166534", align: "center" }), 30,
    T("Flat 30% off this week on all orders", 120, 0, 840, { size: 64, color: "#14532d", align: "center", lh: 1.25 })),
  F(140, 1000, 800, 520, { shape: "rounded", radius: 36, name: "Product photo" }),
  R(140, 1620, 800, 130, "#16a34a", { radius: 65, name: "Contact pill" }),
  E("icon-call", 190, 1650, 70, { c1: WHITE }),
  T("0300 1234567", 280, 1655, 600, { size: 54, bold: true, color: WHITE }),
])]);
tpl("workshop-facebook", "Workshop event post", "facebook-post", "event workshop class training free taqreeb workshop dars", (W, H) => [page("#efedff", [
  F(0, 0, 480, 630, { name: "Event photo" }),
  flow(70,
    T("Free Workshop", 530, 0, 640, { size: 76, family: "serif", bold: true, color: INK, lh: 1.05 }), 12,
    T("Learn digital marketing in one day", 530, 0, 620, { size: 34, color: MUTED })),
  E("icon-calendar", 530, 300, 44, { c1: IND }), T("Saturday, 20 December · 10 am", 590, 304, 560, { size: 30, color: INK }),
  E("icon-location", 530, 370, 44, { c1: IND }), T("AsaanDesk Hall, Karachi", 590, 374, 560, { size: 30, color: INK }),
  R(530, 470, 340, 84, IND, { radius: 42, name: "Button" }),
  T("Register free", 530, 491, 340, { size: 34, bold: true, color: WHITE, align: "center" }),
])]);
tpl("business-facebook-cover", "Business cover", "facebook-cover", "facebook cover business shop page banner karobar dukaan", (W, H) => [page([TEA, "#2f80ff", 110], [
  C(-120, -200, 560, 560, WHITE, { op: 0.12 }), C(1320, 300, 520, 520, WHITE, { op: 0.12 }),
  E("deco-dots", 1380, 60, 160, { c1: WHITE, op: 0.6 }),
  flow(180,
    T("Your Business Name", 220, 0, 1200, { size: 108, bold: true, color: WHITE, align: "center" }), 18,
    T("Quality you can trust since 2010", 220, 0, 1200, { size: 44, color: "#e0f2fe", align: "center" })),
])]);
tpl("howto-youtube", "How-to thumbnail", "youtube-thumbnail", "youtube thumbnail tutorial how to video seekhain tareeqa", (W, H) => [page("#ffe14d", [
  C(760, 100, 480, 480, INK),
  F(780, 120, 440, 440, { shape: "circle", name: "Your photo" }),
  T("HOW TO", 60, 60, 640, { size: 96, bold: true, color: INK }),
  T("Edit any PDF", 60, 180, 700, { size: 120, bold: true, color: WHITE, outline: { width: 6, color: INK }, lh: 1 }),
  T("in 5 minutes", 60, 440, 520, { size: 70, bold: true, color: WHITE, bg: { color: ROS, pad: 0.25, radius: 0.3 } }),
  E("arrow-curved", 560, 470, 180, { c1: INK, rot: -20 }),
])]);
tpl("vlog-youtube", "Travel vlog thumbnail", "youtube-thumbnail", "youtube vlog travel trip safar thumbnail hunza", (W, H) => [page(["#0ea5e9", IND, 120], [
  F(620, 0, 660, 720, { name: "Trip photo" }),
  T("MY FIRST", 60, 140, 620, { size: 90, bold: true, color: WHITE, shadow: { x: 0, y: 6, blur: 14, color: "#000000", opacity: 0.4 } }),
  T("HUNZA\nTRIP", 60, 250, 540, { size: 118, bold: true, color: GOLD, outline: { width: 5, color: NAVY }, lh: 1 }),
  E("face-star-eyes", 70, 520, 150, {}),
  T("Part 1", 250, 560, 300, { size: 64, bold: true, color: WHITE }),
])]);
tpl("cooking-channel-art", "Cooking channel art", "youtube-banner", "youtube channel art banner cooking recipes khana pakana", (W, H) => [page(NAVY, [
  C(200, 300, 900, 900, IND, { op: 0.45 }), C(1500, 100, 900, 900, COR, { op: 0.3 }),
  E("deco-sparkles", 540, 560, 150, { c1: GOLD, c2: WHITE }),
  flow(560,
    T("Asaan Cooking", 507, 0, 1546, { size: 150, family: "serif", bold: true, color: WHITE, align: "center", lh: 1 }), 20,
    T("New recipes every Friday", 507, 0, 1546, { size: 60, color: GOLD, align: "center" })),
  E("icon-chai", 1840, 600, 140, { c1: GOLD }),
])]);
tpl("hiring-linkedin", "We're hiring post", "linkedin-post", "hiring job vacancy career naukri bharti linkedin", (W, H) => [page(WHITE, [
  R(0, 0, 24, 627, IND, { name: "Accent bar" }),
  C(780, 120, 380, 380, "#efedff"),
  E("icon-users", 860, 200, 220, { c1: IND }),
  flow(110,
    T("We're hiring!", 80, 0, 660, { size: 92, bold: true, color: INK }), 18,
    T("Graphic Designer · Full time · Lahore", 80, 0, 660, { size: 36, color: MUTED }), 40,
    T("Send your CV: jobs@yourcompany.pk", 80, 0, 660, { size: 30, bold: true, color: WHITE, bg: { color: IND, pad: 0.45, radius: 0.5 } })),
])]);
tpl("tip-x-post", "Tip of the day post", "x-post", "tip advice x twitter post mashwara tip", (W, H) => [page("#0f172a", [
  E("icon-idea", 1330, 110, 200, { c1: GOLD }),
  flow(180,
    T("TIP OF THE DAY", 120, 0, 900, { size: 48, family: "mono", bold: true, color: TEA, ls: 4 }), 30,
    T("Save your work as a PDF before you share it.", 120, 0, 1100, { size: 92, bold: true, color: WHITE, lh: 1.15 })),
  T("@yourname", 120, 760, 600, { size: 36, color: "#94a3b8" }),
])]);
tpl("recipe-pin", "Recipe pin", "pinterest-pin", "recipe pinterest food cooking tarkeeb khana", (W, H) => [page("#fff7ed", [
  F(60, 60, 880, 760, { shape: "rounded", radius: 40, name: "Dish photo" }),
  flow(870,
    T("Easy Chicken Karahi", 60, 0, 880, { size: 92, family: "serif", bold: true, color: "#7c2d12", align: "center", lh: 1.05 }), 20,
    T("Ready in 30 minutes", 60, 0, 880, { size: 46, color: "#9a3412", align: "center" })),
  E("icon-clock", 455, 1180, 90, { c1: "#9a3412" }),
  R(220, 1320, 560, 100, "#9a3412", { radius: 50, name: "Button" }),
  T("Full recipe on our blog", 220, 1348, 560, { size: 38, bold: true, color: WHITE, align: "center" }),
])]);

/* ================= Presentations ================= */
tpl("pitch-deck", "Startup pitch deck (5 slides)", "presentation-16x9", "presentation slides pitch deck startup business investors pesh kash slides", (W, H) => {
  const head = (t, c = INK) => T(t, 140, 120, 1400, { size: 92, bold: true, color: c });
  return [
    page([ "#2f80ff", "#a64bf4", 135], [
      E("deco-sparkles", 1500, 160, 240, { c1: GOLD, c2: WHITE }),
      flow(380, T("Bright Ideas Co.", 140, 0, 1500, { size: 150, bold: true, color: WHITE }), 20, T("Investor presentation 2026", 140, 0, 1200, { size: 60, color: "#e0e7ff" })),
      R(140, 760, 220, 10, GOLD, { radius: 5, name: "Accent line" }),
      T("Your name · Founder", 140, 800, 1000, { size: 40, color: WHITE }),
    ]),
    page(WHITE, [
      head("The problem"),
      T("•  Small shops lose hours on paperwork\n•  Good tools are costly and hard to use\n•  Most apps ignore local languages", 140, 330, 1000, { size: 52, color: INK, lh: 1.7 }),
      C(1300, 300, 460, 460, "#ffe5dc"),
      E("icon-warning", 1400, 390, 260, { c1: COR }),
    ]),
    page("#efedff", [
      head("Our solution"),
      ...[["icon-check-circle", "Simple", "Works in a few taps"], ["icon-mobile", "Mobile first", "Made for phones"], ["icon-globe", "Local", "English and Urdu"]].flatMap(([ic, t1, t2], i) => [
        R(140 + i * 560, 340, 500, 560, WHITE, { radius: 36, name: "Card" }),
        E(ic, 140 + i * 560 + 180, 410, 140, { c1: IND }),
        T(t1, 140 + i * 560 + 40, 600, 420, { size: 56, bold: true, color: INK, align: "center" }),
        T(t2, 140 + i * 560 + 40, 690, 420, { size: 38, color: MUTED, align: "center" }),
      ]),
    ]),
    page(WHITE, [
      head("Our numbers"),
      ...[["12k", "happy users"], ["98%", "would recommend us"], ["4.8", "average rating"]].flatMap(([big, small], i) => [
        T(big, 140 + i * 560, 400, 500, { size: 190, bold: true, color: [IND, COR, TEA][i], align: "center", lh: 1 }),
        T(small, 140 + i * 560, 620, 500, { size: 44, color: MUTED, align: "center" }),
      ]),
      E("icon-star", 1505, 700, 90, { c1: AMB }),
    ]),
    page(INK, [
      E("deco-confetti", 1400, 120, 320, { c1: GOLD, c2: COR }),
      flow(380, T("Thank you", 140, 0, 1400, { size: 170, bold: true, color: WHITE }), 30, T("hello@brightideas.pk · 0300 1234567", 140, 0, 1400, { size: 48, color: "#cbd5e1" })),
    ]),
  ];
});
tpl("lesson-slides", "Science lesson slides", "presentation-4x3", "presentation lesson class school science sabaq taleem slides", (W, H) => [
  page(["#e0f2fe", "#ecfdf5", 180], [
    E("icon-sun", 760, 60, 180, { c1: AMB }), E("icon-cloud", 620, 150, 200, { c1: "#0ea5e9" }),
    flow(300, T("Science class", 80, 0, 860, { size: 44, color: "#0369a1", bold: true }), 10, T("The Water Cycle", 80, 0, 860, { size: 104, family: "serif", bold: true, color: "#0c4a6e", lh: 1 })),
    T("Class 5 · Lesson 3", 80, 640, 860, { size: 32, color: "#0369a1" }),
  ]),
  page(WHITE, [
    T("Three big steps", 80, 60, 860, { size: 64, bold: true, color: "#0c4a6e" }),
    ...[["Evaporation", "Sun heats water and it rises"], ["Condensation", "Vapour cools into clouds"], ["Precipitation", "Water falls as rain"]].flatMap(([a, b], i) => [
      C(80, 200 + i * 170, 110, 110, ["#e0f2fe", "#ccfbf1", "#ede9fe"][i]),
      T(String(i + 1), 80, 226 + i * 170, 110, { size: 52, bold: true, color: "#0369a1", align: "center" }),
      T(a, 230, 205 + i * 170, 700, { size: 44, bold: true, color: INK }),
      T(b, 230, 262 + i * 170, 700, { size: 30, color: MUTED }),
    ]),
    E("arrow-circular", 800, 560, 150, { c1: TEA }),
  ]),
  page("#fef3c7", [
    E("icon-question", 412, 120, 200, { c1: AMB }),
    flow(360, T("Quiz time!", 80, 0, 864, { size: 96, bold: true, color: "#92400e", align: "center" }), 20, T("What makes water rise into the sky?", 80, 0, 864, { size: 44, color: "#78350f", align: "center" })),
  ]),
]);

/* ================= Logos ================= */
tpl("chai-badge-logo", "Chai cafe badge logo", "logo", "logo badge cafe tea chai dhaba nishan cafe", (W, H) => [page(WHITE, [
  C(150, 150, 700, 700, NAVY),
  C(185, 185, 630, 630, "none", { stroke: GOLD, sw: 6, name: "Ring" }),
  E("icon-chai", 390, 250, 220, { c1: GOLD }),
  T("CHAI\nCORNER", 200, 480, 600, { size: 74, bold: true, color: WHITE, align: "center", ls: 6, lh: 1.05 }),
  T("EST. 2026", 200, 668, 600, { size: 38, color: GOLD, align: "center", ls: 10 }),
])]);
tpl("monogram-logo", "Monogram logo", "logo", "logo monogram initials studio nishan naam", (W, H) => [page(WHITE, [
  E("shape-hexagon", 330, 160, 340, { c1: IND }),
  T("AK", 330, 245, 340, { size: 170, family: "serif", bold: true, color: WHITE, align: "center", lh: 1 }),
  T("Ayesha Khan Studio", 100, 590, 800, { size: 64, bold: true, color: INK, align: "center" }),
  T("DESIGN · PHOTO", 100, 690, 800, { size: 34, color: MUTED, align: "center", ls: 12 }),
])]);
tpl("flower-wordmark-logo", "Flower shop wordmark", "logo", "logo wordmark flowers florist phool dukaan nishan", (W, H) => [page(WHITE, [
  E("deco-flower", 435, 210, 130, { c1: COR, c2: AMB }),
  T("bloomify", 120, 380, 760, { size: 170, bold: true, color: INK, align: "center", lh: 1 }),
  T("fresh flowers daily", 120, 580, 760, { size: 56, family: "serif", italic: true, color: COR, align: "center" }),
])]);

/* ================= Print ================= */
tpl("modern-business-card", "Modern business card", "business-card-us", "business card visiting card contact karobari card", (W, H) => [
  page(INK, [
    R(W - 40, 0, 40, H, IND, { name: "Accent bar" }),
    T("Ali Raza", 24, 28, 260, { size: 26, bold: true, color: WHITE }),
    T("Marketing Manager", 24, 62, 260, { size: 12.5, color: "#a5b4fc" }),
    R(24, 88, 60, 2, COR, { name: "Line" }),
    ...[["icon-call", "0300 1234567"], ["icon-mail", "ali@yourcompany.pk"], ["icon-globe", "www.yourcompany.pk"]].flatMap(([ic, t], i) => [E(ic, 24, 106 + i * 22, 14, { c1: "#a5b4fc" }), T(t, 46, 106 + i * 22, 230, { size: 11.5, color: WHITE })]),
  ]),
  page(IND, [
    E("deco-sparkle", W / 2 - 22, 40, 44, { c1: GOLD }),
    T("YOUR COMPANY", 20, 92, W - 40, { size: 24, bold: true, color: WHITE, align: "center", ls: 3 }),
    T("Ideas that grow", 20, 126, W - 40, { size: 12, family: "serif", italic: true, color: "#e0e7ff", align: "center" }),
  ]),
]);
tpl("minimal-business-card", "Minimal business card", "business-card-eu", "business card minimal visiting card interior designer card", (W, H) => [
  page("#fff7ed", [
    T("Sara Ahmed", 24, 30, 270, { size: 28, family: "serif", bold: true, color: "#7c2d12" }),
    T("Interior Designer", 24, 68, 270, { size: 13, color: "#9a3412" }),
    E("line-ornament", 24, 92, 120, { c1: "#9a3412" }),
    T("0321 7654321\nsara@studio.pk\nGulberg III, Lahore", 24, 120, 270, { size: 11.5, color: INK, lh: 1.45 }),
  ]),
  page("#7c2d12", [
    T("SA", 0, 60, W, { size: 64, family: "serif", bold: true, color: "#fff7ed", align: "center", lh: 1 }),
    T("INTERIORS", 0, 140, W, { size: 12, color: "#fed7aa", align: "center", ls: 6 }),
  ]),
]);
tpl("wedding-invitation", "Wedding invitation", "invitation-5x7", "wedding invitation marriage shadi dawat nama nikah walima card", (W, H) => [page("#fffbf5", [
  R(24, 24, W - 48, H - 48, "none", { stroke: "#b8860b", sw: 2, name: "Border" }),
  R(34, 34, W - 68, H - 68, "none", { stroke: "#b8860b", sw: 0.8, name: "Inner border" }),
  E("deco-sprig", W / 2 - 50, 60, 100, { c1: "#b8860b", c2: "#7c6f3a", rot: 90 }),
  flow(170,
    T("Together with their families", 60, 0, W - 120, { size: 17, family: "serif", italic: true, color: "#7c6f3a", align: "center" }), 18,
    T("Hina & Bilal", 40, 0, W - 80, { size: 56, family: "serif", bold: true, color: "#7c2d12", align: "center" }), 18,
    T("request the pleasure of your company at their wedding", 70, 0, W - 140, { size: 17, family: "serif", color: INK, align: "center", lh: 1.4 }), 28,
    E("line-ornament", W / 2 - 80, 0, 160, { c1: "#b8860b" }), 24,
    T("Saturday, 27 December 2026", 40, 0, W - 80, { size: 20, bold: true, color: INK, align: "center" }), 8,
    T("7:00 pm · Pearl Banquet, Lahore", 40, 0, W - 80, { size: 16, color: INK, align: "center" }), 26,
    T("Dinner to follow", 40, 0, W - 80, { size: 15, family: "serif", italic: true, color: "#7c6f3a", align: "center" })),
])]);
tpl("birthday-invitation", "Kids birthday invitation", "invitation-5x7", "birthday invitation party kids salgirah dawat party card", (W, H) => [page("#fef3c7", [
  E("deco-bunting", 0, 0, W, { c1: ROS, c2: IND }),
  E("deco-balloons", 24, 470, 120, { c1: ROS, c2: IND, c3: AMB }),
  E("deco-balloons", W - 144, 470, 120, { c1: TEA, c2: COR, c3: AMB }),
  flow(150,
    T("You're invited!", 40, 0, W - 80, { size: 30, bold: true, color: ROS, align: "center" }), 14,
    T("Zara is\nturning 7", 30, 0, W - 60, { size: 54, bold: true, color: IND, align: "center", lh: 1.05 }), 26,
    T("Sunday, 14 December · 4 pm", 40, 0, W - 80, { size: 20, color: INK, align: "center" }), 6,
    T("Fun Land, DHA Phase 5", 40, 0, W - 80, { size: 18, color: INK, align: "center" }), 22,
    T("RSVP: 0300 1234567", 120, 0, W - 240, { size: 16, bold: true, color: WHITE, align: "center", bg: { color: IND, pad: 0.5, radius: 0.6 } })),
])]);
tpl("eid-invitation", "Eid party invitation", "invitation-5x7", "eid invitation party milan dawat eid ul fitr chand raat", (W, H) => [page(["#064e3b", "#065f46", 180], [
  E("deco-lantern", 40, 0, 70, { c1: GOLD, c2: "#fbbf24", c3: "#fff7cc" }),
  E("deco-lantern", W - 110, 0, 70, { c1: GOLD, c2: "#fbbf24", c3: "#fff7cc" }),
  E("icon-crescent-star", W / 2 - 50, 120, 100, { c1: GOLD }),
  flow(250,
    T("Eid Milan Party", 30, 0, W - 60, { size: 52, family: "serif", bold: true, color: GOLD, align: "center" }), 14,
    T("Join us to celebrate Eid ul Fitr with food, family and friends", 60, 0, W - 120, { size: 18, color: WHITE, align: "center", lh: 1.4 }), 30,
    T("Friday, 20 March · 8 pm", 40, 0, W - 80, { size: 21, bold: true, color: WHITE, align: "center" }), 8,
    T("Our home, Model Town, Lahore", 40, 0, W - 80, { size: 16, color: "#d1fae5", align: "center" })),
  E("deco-hanging-stars", W / 2 - 60, H - 150, 120, { c1: GOLD, c2: GOLD, rot: 180 }),
])]);
tpl("sale-flyer", "Mega sale flyer", "flyer-a5", "flyer sale discount clothes shoes leaflet parcha riyayat", (W, H) => [page(WHITE, [
  R(-12, -12, W + 24, 392, ROS, { name: "Top band" }),
  E("badge-half-off", W - 190, 40, 150, { c1: GOLD, c2: ROS, rot: 10 }),
  flow(70, T("MEGA\nSALE", 40, 0, 380, { size: 96, bold: true, color: WHITE, lh: 0.95 }), 14, T("On all clothes and shoes", 40, 0, 380, { size: 24, color: "#ffe4e6" })),
  F(40, 330, W - 80, 250, { shape: "rounded", radius: 24, name: "Product photo" }),
  flow(610, T("Only this weekend · 12–14 December", 40, 0, W - 80, { size: 22, bold: true, color: INK }), 8, T("Main Boulevard, Gulberg, Lahore", 70, 0, W - 110, { size: 18, color: MUTED })),
  E("icon-location", 40, 646, 22, { c1: ROS }),
  R(40, 700, W - 80, 56, INK, { radius: 28, name: "Contact bar" }),
  T("Call 0300 1234567", 40, 715, W - 80, { size: 22, bold: true, color: WHITE, align: "center" }),
])]);
tpl("tech-meetup-flyer", "Tech meetup flyer", "flyer-a4", "flyer event meetup tech conference taqreeb ijtima", (W, H) => [page(NAVY, [
  E("deco-stars", W - 210, 50, 160, { c1: GOLD, c2: WHITE }),
  flow(90, T("TECH\nMEETUP", 70, 0, W - 160, { size: 96, bold: true, color: WHITE, lh: 1 }), 6, T("Karachi 2026", 70, 0, W - 140, { size: 56, family: "serif", italic: true, color: GOLD })),
  F(70, 390, W - 140, 340, { shape: "rounded", radius: 28, name: "Event photo" }),
  flow(770,
    T("Talks, workshops and networking for builders and makers", 70, 0, W - 140, { size: 30, color: "#e0e7ff", lh: 1.35 }), 26,
    T("Saturday, 17 January · 2 pm to 7 pm", 70, 0, W - 140, { size: 28, bold: true, color: WHITE }), 6,
    T("Expo Centre, Hall 2", 70, 0, W - 140, { size: 26, color: "#c7d2fe" })),
  R(70, 990, W - 140, 72, TEA, { radius: 36, name: "Button" }),
  T("Free entry · Register at meetup.pk", 70, 1010, W - 140, { size: 28, bold: true, color: WHITE, align: "center" }),
])]);
tpl("grand-opening-flyer", "Grand opening flyer", "flyer-letter", "flyer grand opening new shop iftitah nayi dukaan", (W, H) => [page("#ecfdf5", [
  E("deco-bunting", 0, 0, W, { c1: TEA, c2: AMB }),
  flow(230, T("GRAND", 60, 0, W - 120, { size: 70, bold: true, color: "#0f766e", align: "center", ls: 16 }), 0, T("OPENING", 60, 0, W - 120, { size: 128, bold: true, color: "#065f46", align: "center", lh: 1 })),
  C(W / 2 - 130, 470, 260, 260, AMB, { name: "Offer circle" }),
  C(W / 2 - 116, 484, 232, 232, "none", { stroke: WHITE, sw: 3, name: "Ring" }),
  T("10% OFF\nfirst 100\ncustomers", W / 2 - 110, 545, 220, { size: 30, bold: true, color: WHITE, align: "center", lh: 1.1 }),
  flow(790, T("Saturday, 3 January · 11 am", 60, 0, W - 120, { size: 36, bold: true, color: INK, align: "center" }), 10, T("Shop 12, Main Market, Islamabad", 60, 0, W - 120, { size: 28, color: MUTED, align: "center" })),
  E("icon-gift", W / 2 - 40, 930, 80, { c1: TEA }),
])]);
tpl("school-trifold-brochure", "School tri-fold brochure", "brochure-trifold-a4", "brochure trifold school admissions pamphlet school dakhla", (W, H) => {
  const p3 = W / 3, pad = 34, cw = p3 - pad * 2;
  return [
    page(WHITE, [
      // Panel 1 (inside flap), panel 2 (back), panel 3 (front cover)
      flow(60, T("Why parents choose us", pad, 0, cw, { size: 28, bold: true, color: IND }), 16,
        T("• Small classes\n• Caring teachers\n• Science and computer labs\n• Sports and art every week\n• Safe transport", pad, 0, cw, { size: 17, color: INK, lh: 1.6 })),
      F(pad, 420, cw, 280, { shape: "rounded", radius: 18, name: "Classroom photo" }),
      flow(60, T("Visit us", p3 + pad, 0, cw, { size: 28, bold: true, color: IND }), 16,
        T("Street 5, F-8/3, Islamabad\n051 1234567\ninfo@greenvalley.edu.pk", p3 + pad, 0, cw, { size: 17, color: INK, lh: 1.6 })),
      E("icon-location", p3 + cw / 2 - 30 + pad, 300, 60, { c1: IND }),
      R(2 * p3, 0, p3, H, IND, { name: "Cover panel" }),
      E("deco-sprig", 2 * p3 + p3 / 2 - 50, 110, 100, { c1: GOLD, c2: WHITE }),
      flow(260, T("Green Valley School", 2 * p3 + pad, 0, cw, { size: 46, family: "serif", bold: true, color: WHITE, align: "center", lh: 1.1 }), 20,
        T("Admissions open 2026", 2 * p3 + pad, 0, cw, { size: 22, color: GOLD, align: "center" })),
    ]),
    page("#f8f7ff", [
      ...[["About us", "We have helped children learn with joy since 1998. Our teachers know every child by name."], ["Facilities", "Bright classrooms, a library, labs, a playground and a clinic."], ["Admissions", "Classes Playgroup to Matric. Visit with your child for a short test and a tour."]].flatMap(([h, b], i) => [
        E(["icon-home", "icon-idea", "icon-document"][i], i * p3 + pad, 60, 54, { c1: IND }),
        T(h, i * p3 + pad, 130, cw, { size: 30, bold: true, color: INK }),
        T(b, i * p3 + pad, 180, cw, { size: 17, color: INK, lh: 1.55 }),
        F(i * p3 + pad, 420, cw, 280, { shape: "rounded", radius: 18, name: "Photo" }),
      ]),
    ]),
  ];
});
tpl("music-night-poster", "Music night poster", "poster-18x24", "poster concert music qawwali event mausiqi mehfil", (W, H) => [page([NAVY, "#a64bf4", 160], [
  E("deco-burst", W / 2 - 700, 520, 1400, { c1: "#c4b5fd", c2: "#ffffff", op: 0.25 }),
  C(W / 2 - 430, 760, 860, 860, GOLD),
  F(W / 2 - 400, 790, 800, 800, { shape: "circle", name: "Artist photo" }),
  flow(180, T("LIVE MUSIC", 80, 0, W - 160, { size: 210, bold: true, color: WHITE, align: "center", lh: 1 }), 0, T("NIGHT", 80, 0, W - 160, { size: 210, bold: true, color: GOLD, align: "center", lh: 1 })),
  flow(1740, T("Qawwali · Sufi · Folk", 80, 0, W - 160, { size: 84, color: WHITE, align: "center" }), 30,
    T("Friday, 9 January · 9 pm · Alhamra Hall", 80, 0, W - 160, { size: 60, bold: true, color: GOLD, align: "center" })),
])]);
tpl("motivation-poster", "Motivation poster", "poster-a3", "poster motivation quote wall himmat soch poster", (W, H) => [page("#fff7ed", [
  E("deco-sparkles", W - 260, 120, 160, { c1: COR, c2: AMB }),
  flow(470,
    T("DREAM BIG", 60, 0, W - 120, { size: 170, family: "serif", bold: true, color: INK, align: "center", lh: 1 }), 30,
    E("line-swoosh", W / 2 - 250, 0, 500, { c1: COR }), 40,
    T("WORK HARD", 60, 0, W - 120, { size: 120, bold: true, color: COR, align: "center", lh: 1 }), 30,
    T("STAY HUMBLE", 60, 0, W - 120, { size: 120, bold: true, color: TEA, align: "center", lh: 1 })),
])]);
tpl("shipping-label", "Shipping label", "label-shipping-4x6", "label shipping courier parcel delivery address parcel label", (W, H) => {
  const bars = [];
  let x = 40;
  for (let i = 0; x < W - 44; i++) { const w = [2, 4, 1.5, 3, 1, 5][(i * 7) % 6]; if (i % 2 === 0) bars.push(R(x, 470, w, 70, INK, { name: "Bar" })); x += w + 1.5; }
  return [page(WHITE, [
    R(0, 0, W, 64, INK, { name: "Header" }),
    T("SHIP TO", 20, 18, 200, { size: 24, bold: true, color: WHITE, ls: 2 }),
    E("arrow-up", W - 70, 10, 22, { c1: WHITE }), E("arrow-up", W - 44, 10, 22, { c1: WHITE }),
    T("Fatima Noor\nHouse 21, Street 4, Block B\nSatellite Town, Rawalpindi\n0333 1112223", 20, 84, W - 40, { size: 19, color: INK, lh: 1.45 }),
    R(20, 240, W - 40, 1.5, "#94a3b8", { name: "Divider" }),
    T("FROM", 20, 256, 200, { size: 14, bold: true, color: MUTED, ls: 2 }),
    T("Your Shop · Shop 3, Liberty Market, Lahore · 0300 1234567", 20, 280, W - 40, { size: 14, color: INK, lh: 1.4 }),
    R(20, 350, 160, 90, "none", { stroke: INK, sw: 2, name: "Box" }),
    T("COD\nRs 2,450", 20, 366, 160, { size: 20, bold: true, color: INK, align: "center" }),
    E("stamp-urgent", 200, 362, 160, { c1: ROS }),
    ...bars,
    T("ORDER 104512", 40, 546, W - 80, { size: 14, family: "mono", color: INK, align: "center", ls: 3 }),
  ])];
});
tpl("honey-product-label", "Honey jar label", "label-product-2x1", "label product honey jar shehad label", (W, H) => [page("#fef3c7", [
  R(5, 5, W - 10, H - 10, "none", { stroke: "#92400e", sw: 1.2, radius: 6, name: "Border" }),
  E("icon-leaf", 12, 30, 30, { c1: "#65a30d" }),
  T("Pure Honey", 48, 18, W - 56, { size: 25, family: "serif", bold: true, color: "#92400e" }),
  T("500 g · 100% natural", 48, 54, W - 56, { size: 11, color: "#78350f" }),
])]);
tpl("pickle-round-label", "Pickle jar round label", "label-round-2in", "label round jar pickle achaar homemade label", (W, H) => [page(WHITE, [
  C(0, 0, W, H, "#ecfdf5", { name: "Circle" }),
  C(8, 8, W - 16, H - 16, "none", { stroke: "#15803d", sw: 1.5 }),
  E("deco-sprig", W / 2 - 22, 22, 44, { c1: "#15803d", c2: "#166534", rot: 90 }),
  T("Homemade", 20, 66, W - 40, { size: 18, family: "serif", italic: true, color: "#15803d", align: "center" }),
  T("MANGO\nPICKLE", 20, 90, W - 40, { size: 24, bold: true, color: "#14532d", align: "center", lh: 1.05 }),
  T("Net 400 g", 20, 148, W - 40, { size: 11, color: "#166534", align: "center" }),
])]);
tpl("thank-you-sticker", "Thank you sticker", "sticker-round-3in", "sticker round thank you order packaging shukriya sticker", (W, H) => [page(WHITE, [
  C(0, 0, W, H, IND, { name: "Circle" }),
  E("deco-hearts", W / 2 - 34, 40, 68, { c1: ROS, c2: "#fecdd3" }),
  T("THANK YOU", 20, 110, W - 40, { size: 40, bold: true, color: WHITE, align: "center" }),
  T("for your order", 20, 160, W - 40, { size: 22, family: "serif", italic: true, color: GOLD, align: "center" }),
])]);
tpl("good-vibes-sticker", "Good vibes sticker", "sticker-square-3in", "sticker square smiley happy good vibes khush sticker", (W, H) => [page("#fef3c7", [
  E("face-happy", W / 2 - 70, 40, 140, {}),
  T("Good vibes\nonly", 20, 190, W - 40, { size: 30, bold: true, color: INK, align: "center", lh: 1.05 }),
])]);

/* ================= Merch ================= */
tpl("chai-lover-tshirt", "Chai lover T-shirt", "tshirt", "t-shirt tshirt shirt print chai tea funny qameez print", (W, H) => [page("none", [
  flow(240,
    E("icon-chai", W / 2 - 210, 0, 420, { c1: COR }), 50,
    T("CHAI LOVER", 40, 0, W - 80, { size: 150, bold: true, color: INK, align: "center", lh: 1 }), 20,
    T("since forever", 60, 0, W - 120, { size: 96, family: "serif", italic: true, color: IND, align: "center" })),
])]);
tpl("team-hoodie", "Team hoodie print", "hoodie", "hoodie sweatshirt team sports club print", (W, H) => [page("none", [
  E("deco-crown", W / 2 - 150, 120, 300, { c1: AMB, c2: COR }),
  T("TEAM", 60, 450, W - 120, { size: 130, bold: true, color: INK, align: "center", ls: 30 }),
  T("LAHORE LIONS", 40, 620, W - 80, { size: 160, bold: true, color: AMB, align: "center", lh: 1, outline: { width: 6, color: INK } }),
  T("EST. 2026", 60, 1000, W - 120, { size: 70, bold: true, color: INK, align: "center", ls: 12 }),
])]);
tpl("morning-mug", "Good morning mug", "mug", "mug cup wrap chai coffee morning cup print", (W, H) => [page("#fff7ed", [
  E("deco-dots", 20, 20, 70, { c1: COR, op: 0.6 }),
  T("Good\nmorning", 40, 90, 260, { size: 58, family: "serif", italic: true, bold: true, color: "#7c2d12", lh: 1 }),
  E("icon-sun", W / 2 - 80, 88, 160, { c1: AMB }),
  T("Chai first, then everything else", W - 300, 110, 260, { size: 32, bold: true, color: INK, lh: 1.15 }),
  E("deco-dots", W - 90, H - 90, 70, { c1: TEA, op: 0.6 }),
])]);

/* ================= Collages ================= */
const collagePage = (W, H, layout, o, extra = []) => page(o.bg || WHITE, [...collageFrames(layout, W, H, { gap: o.gap ?? 16, radius: o.radius || 0 }), ...extra]);
tpl("four-photo-grid", "4 photo grid", "collage-square", "collage grid photos 4 tasveerain album", (W, H) => [collagePage(W, H, "four", { gap: 16 }, [
  R(W / 2 - 220, H / 2 - 50, 440, 100, WHITE, { radius: 50, name: "Label" }),
  T("Summer 2026", W / 2 - 220, H / 2 - 28, 440, { size: 44, bold: true, color: INK, align: "center" }),
])]);
tpl("trip-trio-collage", "Trip photo trio", "collage-landscape", "collage trip travel photos safar tasveerain three", (W, H) => [collagePage(W, H, "three", { gap: 20, radius: 24, bg: "#fff7ed" }, [
  T("Our trip to Swat", 50, H - 120, 420, { size: 40, family: "serif", bold: true, color: INK, bg: { color: WHITE, pad: 0.4, radius: 0.5 } }),
])]);
tpl("mosaic-collage", "Photo mosaic", "collage-square", "collage mosaic photos family album tasveerain", (W, H) => [collagePage(W, H, "mosaic", { gap: 10, bg: INK })]);
tpl("nine-photo-grid", "9 photo grid", "collage-square", "collage grid nine photos instagram tasveerain", (W, H) => [collagePage(W, H, "nine", { gap: 8 })]);

/* ================= Documents ================= */
tpl("company-letterhead", "Company letterhead", "a4", "letterhead letter company document a4 khat letter pad", (W, H) => [page(WHITE, [
  R(-12, -12, W + 24, 132, IND, { name: "Header band" }),
  T("YOUR COMPANY", 60, 36, 360, { size: 32, bold: true, color: WHITE, ls: 2 }),
  T("www.yourcompany.pk · 0300 1234567", 440, 48, W - 500, { size: 14, color: "#e0e7ff", align: "right" }),
  flow(190, T("10 November 2026", 60, 0, W - 120, { size: 15, color: MUTED }), 30, T("Dear customer,", 60, 0, W - 120, { size: 16, color: INK }), 16,
    T("Thank you for choosing us. Write your letter here. This page is A4 with a 3 mm bleed, so the coloured band prints right to the edge.", 60, 0, W - 120, { size: 16, color: INK, lh: 1.6 }), 40,
    T("Kind regards,\nYour name", 60, 0, W - 120, { size: 16, color: INK, lh: 1.6 })),
  R(60, H - 90, W - 120, 1.5, "#c7d2fe", { name: "Footer line" }),
  T("Office 5, Blue Area, Islamabad", 60, H - 76, W - 120, { size: 12, color: MUTED, align: "center" }),
])]);
tpl("achievement-certificate", "Certificate of achievement", "a4", "certificate award school achievement sanad inaam a4", (W, H) => [page("#fffbf5", [
  R(28, 28, W - 56, H - 56, "none", { stroke: "#b8860b", sw: 4, name: "Border" }),
  R(42, 42, W - 84, H - 84, "none", { stroke: "#b8860b", sw: 1, name: "Inner border" }),
  E("badge-rosette", W / 2 - 70, 110, 140, { c1: "#b8860b", c2: ROS }),
  flow(300,
    T("Certificate of Achievement", 80, 0, W - 160, { size: 46, family: "serif", bold: true, color: INK, align: "center" }), 40,
    T("This certificate is proudly presented to", 80, 0, W - 160, { size: 18, family: "serif", italic: true, color: MUTED, align: "center" }), 26,
    T("Student Name", 80, 0, W - 160, { size: 52, family: "serif", bold: true, color: IND, align: "center" }), 8,
    E("line-ornament", W / 2 - 150, 0, 300, { c1: "#b8860b" }), 26,
    T("for outstanding performance in Mathematics, 2026", 100, 0, W - 200, { size: 18, color: INK, align: "center", lh: 1.4 })),
  R(120, H - 230, 220, 1.5, INK, { name: "Signature line" }), R(W - 340, H - 230, 220, 1.5, INK, { name: "Signature line" }),
  T("Principal", 120, H - 218, 220, { size: 15, color: MUTED, align: "center" }), T("Class teacher", W - 340, H - 218, 220, { size: 15, color: MUTED, align: "center" }),
])]);

/* ================= catalogue ================= */
let built = null;
function buildAll() {
  if (built) return built;
  built = DEFS.map((d) => {
    const p = getPreset(d.presetId);
    if (!p) throw new Error(`Template ${d.id}: unknown preset ${d.presetId}`);
    const { w, h } = presetPx(p);
    seq = 0;
    const pages = d.build(w, h);
    const tags = [...new Set(d.tags.toLowerCase().split(/\s+/).filter(Boolean))];
    return { id: d.id, title: d.title, presetId: p.id, group: p.group, tags, pages: pages.length, design: { version: 1, name: d.title, preset: designPreset(p), pages } };
  });
  return built;
}
export const TEMPLATE_GROUPS = PRESET_GROUPS;
const copy = (t) => ({ ...t, tags: [...t.tags], design: JSON.parse(JSON.stringify(t.design)) });

/**
 * Template catalogue for the Studio start screen and the site's Templates Marketplace.
 * listTemplates({ query, group }) -> [{ id, title, tags, presetId, group, pages, design }] (copies, safe to change).
 * query matches title, tags (English + Roman Urdu) and the size name; group is a preset group id.
 */
export function listTemplates({ query = "", group = "" } = {}) {
  const words = String(query || "").toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  const pool = buildAll().filter((t) => !group || group === "all" || t.group === group);
  if (!words.length) return pool.map(copy);
  const scored = [];
  for (const t of pool) {
    const hay = [...t.tags, ...t.title.toLowerCase().split(/[^a-z0-9%]+/), ...getPreset(t.presetId).label.toLowerCase().split(/[^a-z0-9%]+/), t.group];
    let score = 0;
    for (const w of words) {
      const stem = w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
      let best = 0;
      for (const h of hay) best = Math.max(best, h === w || h === stem ? 3 : h.startsWith(stem) ? 2 : stem.length >= 3 && h.includes(stem) ? 1 : 0);
      if (!best) { score = -1; break; }
      score += best;
    }
    if (score > 0) scored.push([score, t]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map((s) => copy(s[1]));
}
/** One template (a copy) or null. */
export function getTemplate(id) { const t = buildAll().find((x) => x.id === id); return t ? copy(t) : null; }
/** Number of templates per preset group. */
export function templateCounts() { const out = {}; for (const t of buildAll()) out[t.group] = (out[t.group] || 0) + 1; return out; }

/**
 * Self-contained SVG thumbnail for the Templates Marketplace: the first page fitted into a maxPx × maxPx box
 * (longest side = maxPx). Generic font fallbacks, no DOM, no font loading, no image files.
 */
let thumbSeq = 0;
export function templateThumbSvg(t, maxPx = 320) {
  const tt = typeof t === "string" ? buildAll().find((x) => x.id === t) : t;
  if (!tt) return "";
  const size = presetPx(tt.design.preset);
  const width = size.w >= size.h ? maxPx : (maxPx * size.w) / size.h;
  // Unique ids per call, so the same template can be shown twice on one page.
  return pageSvg(tt.design, 0, size, { width: Math.round(width * 100) / 100, idp: "tt" + (thumbSeq++).toString(36) + "-" + tt.id, editor: true });
}
/** Live SVG thumbnail of a template's first page (or `pageIndex`), `width` px wide. No image files needed. */
export function templateSvg(t, { width = 240, pageIndex = 0 } = {}) {
  const tt = typeof t === "string" ? buildAll().find((x) => x.id === t) : t;
  if (!tt) return "";
  const size = presetPx(tt.design.preset);
  return pageSvg(tt.design, pageIndex, size, { width, idp: "tp" + (thumbSeq++).toString(36) + "-" + tt.id + "-" + pageIndex, editor: true });
}
