// Photo template gallery (pure module: no DOM). Used by the photo editor's Templates panel and the intro pages of the
// four photo tools (photo-editor, background-remover, image-enhancer, ai-photo-editor).
// Templates come from a generator: our own base layouts × colour palettes × content themes. The id encodes the
// combination (tool~layout~theme[~palette], e.g. "pe~instant-photo~beach~p02"); templateById(id) and thumb(id) build
// from it. Every template is a finished design on a REAL photo from the shared library (CC0 / public domain;
// photo-library.js; the same id always gets the same photo): magazine covers, quote cards, polaroid stacks, collages,
// product shots with a price badge, postcards, event flyers, story frames, film and duotone looks, profile and passport
// crops; subject-on-colour cut-out designs (background remover); before/after enhancer presets; AI "prompt -> result"
// ideas. The editor really applies a template: it opens the template's full-size photo when no photo (or only an earlier
// template's photo) is open, then the look (filters, adjustments, duotone), the crop shape, frame and every overlay
// (text, shapes, extra photos) exactly as the thumbnail shows them (tpl-draw.js draws both from the same recipe).
import { kit, photoUrl, hash } from "../shared/tpl-kit.js";
import { PHOTOS, PEOPLE, pickPerson, isPerson } from "../shared/photo-library.js";
import { SAMPLES, sceneSvg, backdropSvg, backdropInner } from "./scenes.js";
import { esc, em, lookPhoto, overlaySvg, framed, borderPad, popBody, popBox, popShape, frameShapeD, isDarkHex } from "./tpl-draw.js";

export { SAMPLES, sceneSvg, backdropSvg };

const PE = "photo-editor", BR = "background-remover", IE = "image-enhancer", AI = "ai-photo-editor";
// How many templates each tool lists (Canva has no template type for these four tools: they are editor features).
export const COUNTS = { [PE]: 48, [BR]: 48, [IE]: 24, [AI]: 30 };

/* ---------- content themes: a library photo topic + short realistic copy (our own) ---------- */
const THEMES = {
  travel: { sample: "lake", topic: "travel holiday beach mountains valley hunza lake", cut: "travel mountains valley", label: "Travel", title: "Weekend escape", line: "Find your quiet place", brand: "Skyline Tours", handle: "@skylinetours", place: "Hunza Valley", word: "EXPLORE", price: "Rs 35,000", offer: "Early bird 20% off", date: "SAT 14 JUNE", day: "14", month: "JUNE", cta: "Book your trip", quote: "Collect moments, not things.", person: "Zara Hussain", role: "Travel planner", mag: "WANDER", tags: ["travel", "nature", "trip"] },
  city: { sample: "city", topic: "city skyline night architecture building", cut: "city building architecture", label: "City", title: "City lights", line: "Out on the town tonight", brand: "Metro Weekly", handle: "@metroweekly", place: "Old Town", word: "TONIGHT", price: "Rs 2,500", offer: "Free entry before 9 pm", date: "FRI 20 JUNE", day: "20", month: "JUNE", cta: "Get tickets", quote: "Every street has a story.", person: "Omar Sheikh", role: "City guide", mag: "METRO", tags: ["city", "night", "urban"] },
  garden: { sample: "flowers", topic: "flowers flower tulip dahlia garden nature", cut: "flowers flower tulip dahlia gazania lily", label: "Flowers", title: "Spring garden", line: "Fresh blooms this week", brand: "Bloom & Co.", handle: "@bloomandco", place: "Rose Garden Hall", word: "BLOOM", price: "Rs 1,200", offer: "Buy 2 bunches, get 1 free", date: "SUN 22 JUNE", day: "22", month: "JUNE", cta: "Shop flowers", quote: "Grow through what you go through.", person: "Hina Rashid", role: "Florist", mag: "BLOOM", tags: ["flowers", "home", "spring"] },
  people: { sample: "portrait", topic: "meeting office conference boardroom coworking", cut: "perfume lipstick fragrance", label: "Team", title: "Meet the team", line: "Our new studio is open", brand: "Northwind Studio", handle: "@northwindstudio", place: "Northwind office", word: "HELLO", price: "Rs 4,500", offer: "Book a free session", date: "MON 23 JUNE", day: "23", month: "JUNE", cta: "Say hello", quote: "Great teams start with great people.", person: "Sara Malik", role: "Team lead", mag: "WORK", tags: ["team", "office", "people"],
    // the background remover's subjects for this theme are beauty products
    cutCopy: { label: "Beauty", title: "New fragrance", line: "Glow all day", brand: "Bloom Beauty Bar", handle: "@bloombeauty", word: "GLOW", price: "Rs 4,500", tags: ["beauty", "product", "shop"] } },
  cafe: { sample: "product", topic: "coffee latte espresso cafe matcha", cut: "coffee latte espresso cup", label: "Coffee", title: "Coffee break", line: "Freshly brewed every morning", brand: "Morning Brew Cafe", handle: "@morningbrew", place: "12 Park Road", word: "BREW", price: "Rs 450", offer: "Buy one, get one free", date: "EVERY DAY", day: "08", month: "JULY", cta: "Order now", quote: "But first, a good cup of coffee.", person: "Kamran Javed", role: "Head barista", mag: "BREW", tags: ["cafe", "product", "shop"] },
  beach: { sample: "beach", topic: "beach sea resort island coast waves", cut: "sea beach island", label: "Beach", title: "Summer days", line: "Sun, sand and sea", brand: "Blue Bay Resort", handle: "@bluebayresort", place: "Blue Bay", word: "SUMMER", price: "Rs 18,000", offer: "Kids stay free", date: "5–7 JULY", day: "05", month: "JULY", cta: "Book a stay", quote: "Salt in the air, sand in my hair.", person: "Ali Raza", role: "Resort manager", mag: "COAST", tags: ["beach", "summer", "holiday"] },
  kitchen: { sample: "food", topic: "food fruit breakfast avocado blueberries pizza risotto", cut: "food fruit pizza avocado blueberries bread", label: "Food", title: "Fresh today", line: "Fruit bowls from 9 am", brand: "Green Bowl Kitchen", handle: "@greenbowl", place: "Food Street", word: "FRESH", price: "Rs 650", offer: "25% off all bowls", date: "FRI 20 JUNE", day: "20", month: "JUNE", cta: "Order now", quote: "Good food, good mood.", person: "Bilal Ahmed", role: "Head chef", mag: "TASTE", tags: ["food", "menu", "healthy"] },
  pets: { sample: "cat", topic: "animals cat bird horse pet", cut: "animals cat bird horse", label: "Pets", title: "Wild and free", line: "Nature walks for families", brand: "Happy Paws", handle: "@happypaws", place: "Happy Paws Clinic", word: "CUTE", price: "Rs 1,500", offer: "Free first check-up", date: "SAT 28 JUNE", day: "28", month: "JUNE", cta: "Book a visit", quote: "Home is where the cat is.", person: "Ayesha Khan", role: "Pet groomer", mag: "PAWS", tags: ["pets", "cat", "cute"] },
};
const CUTOUT_THEMES = ["cafe", "people", "pets", "kitchen", "garden"]; // subjects that cut out cleanly
// colour palettes: a accent, b second accent, d deep, l light (+ the older fields text / ink / frame and the look tone)
const PAL = [
  ["p01", "Snow", "#5b4cf0", "#ffb703", "#12122b", "#f4f3ff", 0, 0, 1],
  ["p02", "Coral", "#ff5a47", "#ffd166", "#2b1210", "#fff1ec", 10, 4, 0.9],
  ["p03", "Mint", "#0fb5a3", "#fde047", "#062b27", "#e6faf5", -6, -6, 0.85],
  ["p04", "Sky", "#2f80ff", "#ffcc33", "#0a1f44", "#eaf2ff", -12, 0, 1],
  ["p05", "Sunshine", "#f59e0b", "#ef4444", "#2a1a02", "#fff7e0", 16, 0, 1],
  ["p06", "Berry", "#d6336c", "#7c3aed", "#2a0716", "#ffeef5", 4, 12, 0.9],
  ["p07", "Forest", "#2f9e44", "#d9f99d", "#0b2410", "#effaea", 2, -10, 0.8],
  ["p08", "Midnight", "#6366f1", "#22d3ee", "#0b0d2a", "#eef0ff", -8, 6, 1],
  ["p09", "Sand", "#c08a4f", "#1f2937", "#2e2112", "#faf3e8", 12, 2, 0.75],
  ["p10", "Ink", "#111111", "#facc15", "#0a0a0a", "#f5f5f4", 0, 0, 1],
  ["p11", "Lilac", "#8b5cf6", "#f472b6", "#1e1035", "#f5f0ff", -2, 10, 0.9],
  ["p12", "Rose gold", "#b76e79", "#f4c7b8", "#3a1d22", "#fdf1ee", 8, 6, 0.85],
].map(([id, name, a, b, d, l, warm, tint, k]) => ({ id, name, a, b, d, l, warm, tint, k, accent: a, ink: d, text: "#ffffff", frame: l }));
const palById = Object.fromEntries(PAL.map((p) => [p.id, p]));
const LOOKS = "Photo looks and layouts", BACKS = "New backgrounds", ENH = "Enhance presets", IDEAS = "AI edit ideas";
const RATIO = { "1:1": 1, "4:5": 0.8, "16:9": 16 / 9, "9:16": 0.5625, passport: 35 / 45 };
const f = (id, v, pal) => [id, Math.min(100, Math.round(v * (pal?.k ?? 1)))];
const tone = (pal, a = {}) => ({ ...a, warmth: (a.warmth || 0) + (pal?.warm || 0), tint: (a.tint || 0) + (pal?.tint || 0) });

/* ---------- overlay helpers (fractions of the picture; text size = fraction of its height) ---------- */
const T = (text, o = {}) => ({ type: "text", text: String(text), x: 0.5, y: 0.5, size: 0.06, family: "sans", bold: true, italic: false, color: "#ffffff", align: "center", shadow: false, outline: null, bg: null, ...o });
const SH = (shape, x, y, w, h, fill, o = {}) => ({ type: "shape", shape, x, y, w, h, fill, opacity: 1, rotation: 0, stroke: "#ffffff", strokeWidth: 0, ...o });
const IM = (photo, x, y, w, h, o = {}) => ({ type: "image", photo, x, y, w, h, rotation: 0, opacity: 1, ...o });
/** Largest size (≤ max) at which the text fits maxW (fraction of the width) in a picture of aspect r. */
const fitS = (text, maxW, max, r, fam = "sans", bold = true, pad = 0) => Math.max(0.012, Math.min(max, (maxW * r) / (em(text, fam, bold) + pad + 0.04)));
/** One text layer per line, tight leading (o.y = centre of the first line). */
const lines = (arr, { lead = 1.0, ...o }) => arr.map((t, i) => T(t, { ...o, y: o.y + i * o.size * lead }));
/** The same size for every line so the longest fits. */
const fitAll = (arr, maxW, max, r, fam = "sans", bold = true) => Math.min(...arr.map((s) => fitS(s, maxW, max, r, fam, bold)));
function split2(s) {
  const w = String(s).split(" ");
  if (w.length < 2) return [s];
  let best = 1, bd = 1e9;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(" ").length - w.slice(i).join(" ").length); if (d < bd) { bd = d; best = i; } }
  return [w.slice(0, best).join(" "), w.slice(best).join(" ")];
}
/** Wrap into lines of about `n` characters. */
function wrap(s, nChars) {
  const out = []; let cur = "";
  for (const w of String(s).split(" ")) { if (cur && (cur + " " + w).length > nChars) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
  if (cur) out.push(cur);
  return out;
}
const up = (s) => String(s).toUpperCase();
const onA = (c) => (isDarkHex(c) ? "#ffffff" : "#14141f");
/** An instant-photo card (white card, photo, caption strip) turned by rot degrees, in px of a picture H = 1, W = r. */
function polaroid(r, cx, cy, wPx, rot, photo, caption, p, { shadow = true } = {}) {
  const m = wPx * 0.06, ph = wPx - 2 * m, hPx = ph + m + wPx * 0.24, a = (rot * Math.PI) / 180;
  const off = (dy) => [cx - Math.sin(a) * dy, cy + Math.cos(a) * dy]; // a point dy below the card centre, turned
  const [px, py] = off(-hPx / 2 + m + ph / 2), [tx, ty] = off(hPx / 2 - wPx * 0.12);
  const out = [];
  if (shadow) out.push(SH("rect", (cx + wPx * 0.02) / r, cy + 0.018, (wPx * 1.02) / r, hPx * 1.02, "#000000", { rotation: rot, opacity: 0.3, soft: 0.012 }));
  out.push(SH("rect", cx / r, cy, wPx / r, hPx, "#fbfaf7", { rotation: rot }));
  out.push(photo ? IM(photo, px / r, py, ph / r, ph, { rotation: rot }) : SH("rect", px / r, py, ph / r, ph, p.l, { rotation: rot }));
  if (caption) out.push(T(caption, { x: tx / r, y: ty, size: Math.min(wPx * 0.11, fitS(caption, (wPx * 0.86) / r, 1, r, "serif", false)), family: "serif", italic: true, bold: false, color: "#2b2b33", rotation: rot }));
  return out;
}

/* ---------- photo editor: finished designs on a photo (each also sets a look) ---------- */
const L = (id, name, tags, build) => ({ id, name, section: LOOKS, tags, build });
const PE_LAYOUTS = [
  L("warm-glow", "Travel post", ["travel", "warm", "golden", "post"], ({ th, p, r }) => {
    const t2 = split2(up(th.title)), s = fitAll(t2, 0.86, 0.13, r), last = 0.76, y0 = last - (t2.length - 1) * s;
    return { aspect: "4:5", filter: f("lahore-gold", 90, p), adjust: tone(p, { warmth: 18 }), overlays: [
      SH("rect", 0.5, 0.15, 1, 0.3, "#000000", { fade: "bottom", opacity: 0.35 }), SH("rect", 0.5, 0.77, 1, 0.46, p.d, { fade: "top", opacity: 0.92 }),
      T(up(th.word), { left: 0.07, y: 0.075, size: 0.024, bg: p.a, color: onA(p.a) }), T(up(th.brand), { right: 0.93, y: 0.075, size: 0.022, shadow: true }),
      ...lines(t2, { left: 0.065, y: y0, size: s }), SH("rect", 0.13, last + s * 0.62, 0.12, 0.006, p.b),
      T(th.line, { left: 0.07, y: last + s * 0.62 + 0.05, size: 0.032, bold: false })] };
  }),
  L("cool-fresh", "Frosted caption card", ["cool", "blue", "minimal", "card"], ({ th, p, r }) => ({ aspect: "1:1", filter: f("frost", 100, p), adjust: tone(p, { exposure: 12 }), overlays: [
    SH("rounded", 0.4, 0.74, 0.7, 0.4, "#ffffff", { opacity: 0.94 }),
    ...lines(split2(th.title), { left: 0.09, y: 0.62, size: fitAll(split2(th.title), 0.6, 0.11, r), color: p.d }), T(th.line, { left: 0.09, y: 0.62 + fitAll(split2(th.title), 0.6, 0.11, r) * 1.6, size: fitS(th.line, 0.6, 0.034, r, "sans", false), bold: false, color: p.d }),
    T(th.cta, { left: 0.09, y: 0.875, size: 0.03, bg: p.a, color: onA(p.a) }), T(th.handle, { right: 0.95, y: 0.06, size: 0.026, shadow: true })] })),
  L("classic-mono", "Black and white editorial", ["mono", "black and white", "editorial", "classic"], ({ th, p, r }) => {
    const t2 = split2(th.title), s = fitAll(t2, 0.86, 0.15, r, "serif"), y0 = 0.82 - s;
    return { aspect: "4:5", filter: f("mono", 100), adjust: { contrast: 20 }, frame: { id: "solid", color: "#ffffff", width: 3 }, overlays: [
      SH("rect", 0.5, 0.78, 1, 0.44, "#000000", { fade: "top", opacity: 0.75 }),
      T(`VOL. 03  ·  ${up(th.label)}`, { y: 0.07, size: 0.022, color: "#ffffff", shadow: true }), SH("line", 0.5, y0 - s * 0.7, 0.18, 0.01, "#ffffff"),
      ...lines(t2, { y: y0, size: s, family: "serif" }), T(up(th.line), { y: 0.92, size: fitS(up(th.line), 0.8, 0.026, r), bold: false })] };
  }),
  L("vintage-film", "Film photo with date stamp", ["retro", "film", "grain", "date"], ({ th, p, r }) => ({ aspect: "16:9", filter: f("film", 100, p), adjust: tone(p, { grain: 30, fade: 18 }), frame: { id: "film", color: "#111318", width: 4 }, overlays: [
    T(th.title, { left: 0.04, y: 0.16, size: fitS(th.title, 0.62, 0.14, r, "serif"), family: "serif", italic: true, shadow: true }), T("'26  06  14", { right: 0.96, y: 0.9, size: 0.055, family: "mono", color: "#ff9a3c" })] })),
  L("bright-airy", "Bright and airy post", ["light", "pastel", "bright", "post"], ({ th }) => ({ aspect: "4:5", adjust: { exposure: 22, shadows: 35, highlights: -12, saturation: -12, fade: 12 }, overlays: [
    T(th.handle, { y: 0.95, size: 0.026, shadow: true })] })),
  L("moody-dusk", "Moody quote", ["dark", "quote", "vignette", "mood"], ({ th, p, r }) => {
    const q = wrap(th.quote, 16), s = fitAll(q, 0.8, 0.07, r, "serif", false), y0 = 0.5 - ((q.length - 1) * s * 1.1) / 2;
    return { aspect: "4:5", filter: f("night", 80, p), adjust: tone(p, { vignette: 45, contrast: 15 }), overlays: [
      T("“", { y: y0 - s - 0.06, size: 0.16, family: "serif", color: p.b }), ...lines(q, { y: y0, size: s, family: "serif", italic: true, bold: false, lead: 1.1 }),
      SH("rect", 0.5, y0 + (q.length - 1) * s * 1.1 + s + 0.03, 0.1, 0.005, p.b), T(up(th.person), { y: y0 + (q.length - 1) * s * 1.1 + s + 0.075, size: 0.024 })] };
  }),
  L("pop-colour", "Bold sale post", ["vivid", "sale", "shop", "bright"], ({ th, p, r }) => ({ aspect: "1:1", filter: f("vivid", 100, p), adjust: tone(p, { vibrance: 20 }), overlays: [
    SH("rect", 0.5, 0.86, 1, 0.28, p.a, { opacity: 0.96 }), SH("ellipse", 0.82, 0.18, 0.27, 0.27, p.b), SH("ellipse", 0.82, 0.18, 0.23, 0.23, "transparent", { strokeWidth: 0.4, stroke: onA(p.b) }),
    T("30%", { x: 0.82, y: 0.165, size: 0.075, color: onA(p.b) }), T("OFF", { x: 0.82, y: 0.225, size: 0.035, color: onA(p.b) }),
    T("WEEKEND SALE", { y: 0.82, size: fitS("WEEKEND SALE", 0.88, 0.1, r), color: onA(p.a) }), T(th.offer, { y: 0.915, size: fitS(th.offer, 0.8, 0.034, r, "sans", false), bold: false, color: onA(p.a) })] })),
  L("soft-glow", "Dreamy story", ["soft", "dreamy", "story", "9:16"], ({ th, p, r }) => {
    const t2 = split2(th.title), s = fitAll(t2, 0.86, 0.1, r, "serif");
    return { aspect: "9:16", filter: f("soft", 90, p), adjust: tone(p, { clarity: -18, warmth: 8 }), overlays: [
      T(up(th.label), { y: 0.07, size: 0.02, bg: "#ffffff", color: p.d }), ...lines(t2, { y: 0.42, size: s, family: "serif", shadow: true }),
      T(th.line, { y: 0.42 + s * 2 + 0.01, size: fitS(th.line, 0.8, 0.026, r, "sans", false), bold: false, shadow: true }),
      SH("triangle", 0.5, 0.83, 0.06, 0.02, "#ffffff"), T("Swipe up", { y: 0.88, size: 0.024, bg: p.a, color: onA(p.a) })] };
  }),
  L("instant-photo", "Instant photo", ["polaroid", "frame", "caption"], ({ th, p, r }) => ({ aspect: "1:1", frame: { id: "polaroid", color: "#fbfaf7", width: 5 }, adjust: tone(p, { vibrance: 10 }), overlays: [
    T("JUNE 2026", { right: 0.95, y: 0.07, size: 0.032, family: "mono", color: "#ffb347" }),
    T(th.title, { y: 0.9, size: fitS(th.title, 0.8, 0.07, r, "serif", false), family: "serif", italic: true, bold: false, shadow: true })] })),
  L("square-post", "Menu post", ["post", "square", "menu", "food"], ({ th, p, r }) => ({ aspect: "1:1", adjust: tone(p, { vibrance: 15 }), overlays: [
    SH("rect", 0.5, 0.82, 1, 0.36, "#000000", { fade: "top", opacity: 0.6 }),
    T(up(th.brand), { left: 0.06, y: 0.07, size: 0.024, bg: "#ffffff", color: p.d }),
    SH("ellipse", 0.84, 0.19, 0.22, 0.22, p.b), T("ONLY", { x: 0.84, y: 0.155, size: 0.024, color: onA(p.b) }), T(th.price.replace("Rs ", ""), { x: 0.84, y: 0.205, size: fitS(th.price, 0.17, 0.055, r), color: onA(p.b) }),
    T(th.title, { y: 0.76, size: fitS(th.title, 0.9, 0.11, r), shadow: true }), T(th.line, { y: 0.87, size: 0.032, bold: false, bg: p.a, color: onA(p.a) })] })),
  L("quote-card", "Quote card", ["quote", "words", "frame"], ({ th, p, r }) => {
    const q = wrap(th.quote, 14), s = fitAll(q, 0.74, 0.075, r, "serif"), y0 = 0.3;
    return { aspect: "4:5", adjust: tone(p, { brightness: -30, vignette: 25 }), overlays: [
      SH("rect", 0.5, 0.5, 0.86, 0.89, "transparent", { strokeWidth: 0.5, stroke: "#ffffff", opacity: 0.85 }),
      T("“", { left: 0.11, y: 0.2, size: 0.14, family: "serif", color: p.b }), ...lines(q, { left: 0.13, y: y0, size: s, family: "serif", lead: 1.12 }),
      SH("rect", 0.17, y0 + (q.length - 1) * s * 1.12 + s * 0.9, 0.08, 0.006, p.b), T(th.person, { left: 0.13, y: y0 + (q.length - 1) * s * 1.12 + s * 0.9 + 0.045, size: 0.03 }),
      T(th.handle, { left: 0.13, y: 0.88, size: 0.024, bold: false })] };
  }),
  L("story-cover", "Story cover", ["story", "vertical", "9:16", "news"], ({ th, p, r }) => {
    const t = wrap(up(th.title), 9), s = fitAll(t, 0.86, 0.075, r);
    return { aspect: "9:16", filter: f("vivid", 60, p), adjust: tone(p), overlays: [
      SH("rect", 0.5, 0.78, 1, 0.48, p.d, { fade: "top", opacity: 0.95 }), T(up(th.brand), { left: 0.07, y: 0.05, size: 0.02, shadow: true }), T("NEW", { right: 0.93, y: 0.05, size: 0.018, bg: p.a, color: onA(p.a) }),
      ...lines(t, { left: 0.065, y: 0.7, size: s }), T(th.line, { left: 0.07, y: 0.7 + (t.length - 1) * s + s * 0.5 + 0.03, size: fitS(th.line, 0.86, 0.024, r, "sans", false), bold: false }),
      T("Read more", { left: 0.07, y: 0.92, size: 0.022, bg: "#ffffff", color: p.d })] };
  }),
  L("round-profile", "Round profile picture", ["profile", "avatar", "circle"], ({ th, p, r }) => ({ aspect: "1:1", frame: { id: "circle", color: p.a, width: 4 }, adjust: tone(p, { vibrance: 12 }), overlays: [
    SH("rect", 0.5, 0.92, 1, 0.24, p.a, { opacity: 0.95 }), T(up(th.role), { y: 0.885, size: fitS(up(th.role), 0.5, 0.045, r), color: onA(p.a) })] })),
  L("film-strip", "Film strip", ["film", "frame", "retro", "cinema"], ({ th, p, r }) => ({ aspect: "16:9", frame: { id: "film", color: "#111318", width: 4 }, filter: f("film", 60, p), adjust: tone(p, { vignette: 30 }), overlays: [
    T(up(th.title), { left: 0.05, y: 0.82, size: fitS(up(th.title), 0.6, 0.1, r), shadow: true }), T("FRAME 24  ·  ISO 400", { left: 0.055, y: 0.92, size: 0.032, family: "mono", bold: false, color: "#ffd166" })] })),
  L("poster-border", "Exhibition poster", ["poster", "border", "gallery", "art"], ({ th, p, r }) => ({ aspect: "4:5", frame: { id: "double", color: "#f7f1e8", width: 4 }, adjust: tone(p, { contrast: 10 }), overlays: [
    SH("rect", 0.5, 0.16, 1, 0.36, "#000000", { fade: "bottom", opacity: 0.6 }),
    ...lines(split2(th.title), { y: 0.09, size: fitAll(split2(th.title), 0.84, 0.13, r, "serif"), family: "serif" }), T("EXHIBITION  ·  12–30 JUNE", { y: 0.12 + fitAll(split2(th.title), 0.84, 0.13, r, "serif") * 1.3, size: 0.026, bold: false }),
    T(th.place, { y: 0.93, size: 0.03, bg: "#f7f1e8", color: "#2b2420" })] })),
  L("caption-bar", "Blog header", ["blog", "banner", "16:9", "header"], ({ th, p, r }) => {
    const t2 = split2(th.title), s = fitAll(t2, 0.38, 0.12, r);
    return { aspect: "16:9", adjust: tone(p), overlays: [
      SH("rect", 0.23, 0.5, 0.46, 1, p.d, { opacity: 0.86 }), T(up(th.label) + " GUIDE", { left: 0.05, y: 0.2, size: 0.04, color: p.b }),
      ...lines(t2, { left: 0.047, y: 0.38, size: s }), SH("rect", 0.08, 0.38 + s + 0.07, 0.06, 0.012, p.b),
      T(th.line, { left: 0.05, y: 0.38 + s + 0.15, size: fitS(th.line, 0.38, 0.045, r, "sans", false), bold: false }), T("Read the story  →", { left: 0.05, y: 0.86, size: 0.04, color: p.b })] };
  }),
  L("floating-card", "Floating card", ["card", "shadow", "frame", "print"], ({ th, p, r }) => ({ aspect: "4:5", frame: { id: "shadow", color: p.l, width: 4 }, adjust: tone(p, { clarity: 10 }), overlays: [
    SH("rect", 0.5, 0.8, 1, 0.4, "#000000", { fade: "top", opacity: 0.7 }), T(up(th.label), { left: 0.07, y: 0.07, size: 0.024, bg: "#ffffff", color: p.d }),
    ...lines(split2(up(th.title)), { left: 0.065, y: 0.88 - fitAll(split2(up(th.title)), 0.86, 0.13, r) - 0.05, size: fitAll(split2(up(th.title)), 0.86, 0.13, r) }), T(th.line, { left: 0.07, y: 0.93, size: 0.03, bold: false })] })),
  L("sea-breeze", "Resort banner", ["sea", "blue", "travel", "banner"], ({ th, p, r }) => ({ aspect: "16:9", filter: f("karachi-sea", 100, p), adjust: tone(p, { clarity: 8 }), overlays: [
    SH("rounded", 0.75, 0.68, 0.44, 0.52, "#ffffff", { opacity: 0.95 }),
    T(th.title, { left: 0.57, y: 0.55, size: fitS(th.title, 0.36, 0.13, r), color: p.d }), T(th.offer, { left: 0.57, y: 0.68, size: fitS(th.offer, 0.36, 0.05, r, "sans", false), bold: false, color: p.d }),
    T(`From ${th.price}`, { left: 0.57, y: 0.82, size: fitS(`From ${th.price}`, 0.36, 0.07, r), color: p.a === "#111111" ? p.d : p.a }), T(up(th.brand), { right: 0.96, y: 0.09, size: 0.04, shadow: true })] })),
  L("rainy-day", "Weather update", ["rain", "weather", "cool", "update"], ({ th, p, r }) => ({ aspect: "1:1", filter: f("monsoon", 100, p), adjust: tone(p, { fade: 10 }), overlays: [
    SH("rect", 0.5, 0.5, 1, 1, "#0b1220", { opacity: 0.25 }), T("24°", { left: 0.06, y: 0.22, size: 0.24, shadow: true }), T("Light rain", { left: 0.075, y: 0.38, size: 0.055, shadow: true }),
    T(`${th.place}  ·  Today`, { left: 0.075, y: 0.45, size: 0.032, bold: false, shadow: true }),
    SH("rounded", 0.5, 0.87, 0.88, 0.14, "#0b1220", { opacity: 0.7 }), T("MON 26°     TUE 23°     WED 25°", { y: 0.87, size: fitS("MON 26°     TUE 23°     WED 25°", 0.8, 0.034, r) })] })),
  L("mountain-morning", "Hiking event poster", ["morning", "event", "hike", "poster"], ({ th, p, r }) => {
    const t2 = split2(up(th.title)), s = fitAll(t2, 0.86, 0.12, r);
    return { aspect: "4:5", filter: f("hunza-morning", 100, p), adjust: tone(p), overlays: [
      SH("rect", 0.5, 0.16, 1, 0.36, "#000000", { fade: "bottom", opacity: 0.5 }), ...lines(t2, { left: 0.065, y: 0.1, size: s, shadow: true }),
      SH("rect", 0.5, 0.86, 1, 0.3, p.d, { fade: "top", opacity: 0.85 }), SH("rounded", 0.15, 0.85, 0.17, 0.15, p.a),
      T(th.day, { x: 0.15, y: 0.83, size: 0.07, color: onA(p.a) }), T(th.month, { x: 0.15, y: 0.885, size: 0.024, color: onA(p.a) }),
      T(th.cta, { left: 0.28, y: 0.82, size: fitS(th.cta, 0.64, 0.045, r) }), T(`${th.place}  ·  6 am`, { left: 0.28, y: 0.875, size: 0.028, bold: false })] };
  }),
  L("tea-time", "Cafe menu card", ["warm", "menu", "cafe", "card"], ({ th, p, r }) => {
    const items = [["Masala chai", "250"], ["Latte", "450"], ["Club sandwich", "750"]];
    return { aspect: "4:5", filter: f("chai", 100, p), adjust: tone(p, { vignette: 15 }), overlays: [
      SH("rounded", 0.5, 0.71, 0.84, 0.46, "#fffaf2", { opacity: 0.96 }), T(th.brand, { y: 0.545, size: fitS(th.brand, 0.76, 0.08, r, "serif"), family: "serif", color: "#2b1d12" }),
      SH("line", 0.5, 0.6, 0.2, 0.01, p.a), ...items.flatMap(([a, b], i) => [T(a, { left: 0.14, y: 0.66 + i * 0.065, size: 0.032, bold: false, color: "#2b1d12" }), T(b, { right: 0.86, y: 0.66 + i * 0.065, size: 0.032, color: p.a })]),
      T("Open 7 am – 9 pm", { y: 0.88, size: 0.024, bold: false, color: "#6b5a4a" }), T(up(th.word), { left: 0.07, y: 0.07, size: 0.026, bg: p.a, color: onA(p.a) })] };
  }),
  L("garden-green", "Workshop flyer", ["green", "workshop", "flyer", "event"], ({ th, p, r }) => ({ aspect: "4:5", filter: f("mehndi", 100, p), adjust: tone(p), overlays: [
    SH("rect", 0.5, 0.13, 1, 0.26, p.a, { opacity: 0.95 }), T("FREE WORKSHOP", { left: 0.07, y: 0.065, size: 0.024, color: onA(p.a) }),
    T(th.title, { left: 0.065, y: 0.15, size: fitS(th.title, 0.86, 0.09, r), color: onA(p.a) }), T(`${th.date}  ·  ${th.place}`, { left: 0.07, y: 0.215, size: fitS(`${th.date}  ·  ${th.place}`, 0.86, 0.028, r, "sans", false), bold: false, color: onA(p.a) }),
    T("Join free  →", { right: 0.93, y: 0.91, size: 0.034, bg: "#ffffff", color: p.d })] })),
  L("rose-blush", "Save the date", ["pink", "wedding", "save the date", "romantic"], ({ th, p, r }) => ({ aspect: "4:5", filter: f("rose-petal", 100, p), adjust: tone(p, { clarity: -10, brightness: -12 }), overlays: [
    SH("rect", 0.5, 0.5, 1, 1, "#2a0f1a", { opacity: 0.34 }), SH("rect", 0.5, 0.5, 0.84, 0.88, "transparent", { strokeWidth: 0.4 }), SH("rect", 0.5, 0.5, 0.8, 0.85, "transparent", { strokeWidth: 0.2 }),
    T("Save the date", { y: 0.36, size: fitS("Save the date", 0.7, 0.085, r, "serif", false), family: "serif", italic: true, bold: false, shadow: true }),
    T("Hina & Omar", { y: 0.47, size: fitS("Hina & Omar", 0.7, 0.075, r, "serif"), family: "serif", shadow: true }), SH("line", 0.5, 0.54, 0.16, 0.01, "#ffffff"),
    T("12 . 12 . 2026", { y: 0.6, size: 0.04, shadow: true }), T("ROSE GARDEN HALL", { y: 0.66, size: 0.024, bold: false, shadow: true })] })),
  L("old-town", "Heritage tour poster", ["vintage", "sepia", "history", "tour"], ({ th, p, r }) => ({ aspect: "4:5", filter: f("old-fort", 100, p), adjust: tone(p, { grain: 18, vignette: 25 }), overlays: [
    T("— SINCE 1926 —", { y: 0.1, size: 0.026, color: "#f3e3c3" }), T("THE OLD TOWN", { y: 0.17, size: fitS("THE OLD TOWN", 0.86, 0.09, r, "serif"), family: "serif", color: "#fff6e5", shadow: true }),
    SH("rect", 0.5, 0.85, 1, 0.3, "#1e140b", { fade: "top", opacity: 0.85 }), T("Guided walks every Sunday", { y: 0.83, size: fitS("Guided walks every Sunday", 0.8, 0.042, r, "serif", false), family: "serif", italic: true, bold: false, color: "#fff6e5" }),
    SH("line", 0.5, 0.88, 0.5, 0.01, "#f3e3c3"), T(`${th.brand}  ·  ${th.handle}`, { y: 0.92, size: 0.024, bold: false, color: "#f3e3c3" })] })),
  L("kite-sky", "Summer festival poster", ["sunny", "festival", "summer", "poster"], ({ th, p, r }) => {
    const t2 = ["SUMMER", "FEST"], s = fitAll(t2, 0.8, 0.16, r);
    return { aspect: "4:5", filter: f("kite-day", 100, p), adjust: tone(p), overlays: [
      ...lines(t2, { y: 0.1, size: s, color: "#ffffff", outline: p.a }), SH("star", 0.82, 0.42, 0.26, 0.21, p.b, { rotation: 12 }),
      T("FREE", { x: 0.82, y: 0.43, size: 0.036, color: onA(p.b), rotation: 12 }), SH("rect", 0.5, 0.9, 1, 0.2, p.a),
      T(`${th.date}  ·  ${th.place}`, { y: 0.875, size: fitS(`${th.date}  ·  ${th.place}`, 0.86, 0.04, r), color: onA(p.a) }), T("Music, food and games for all ages", { y: 0.93, size: 0.026, bold: false, color: onA(p.a) })] };
  }),
  L("noir-drama", "Film poster", ["black and white", "dramatic", "film", "movie"], ({ th, p, r }) => ({ aspect: "4:5", filter: f("noir", 100), adjust: { contrast: 30, vignette: 50, grain: 22 }, overlays: [
    T(`A ${up(th.brand)} FILM`, { y: 0.06, size: 0.022, bold: false, color: "#d9d9d9" }), SH("rect", 0.5, 0.83, 1, 0.4, "#000000", { fade: "top" }),
    T(up(th.title), { y: 0.76, size: fitS(up(th.title), 0.86, 0.1, r, "serif"), family: "serif" }), T("IN CINEMAS 20 JUNE", { y: 0.84, size: 0.03, color: p.b === "#1f2937" ? "#e5e5e5" : p.b }),
    T("Written and directed by Omar Sheikh\nMusic by Hina Rashid  ·  Photography by Ali Raza", { y: 0.92, size: 0.017, bold: false, color: "#bdbdbd" })] })),
  L("duotone-pop", "Concert poster", ["duotone", "two colours", "poster", "music"], ({ th, p, r }) => {
    const w = up(th.word), s = fitS(w, 0.9, 0.2, r);
    return { aspect: "4:5", duotone: DUO_OF[p.id] || "berry", adjust: { contrast: 15 }, overlays: [
      T(w, { y: 0.14, size: s, color: "transparent", outline: "#ffffff" }), T(w, { y: 0.14 + s * 0.98, size: s, color: "#ffffff" }),
      T("LIVE IN CONCERT", { y: 0.17 + s * 1.65, size: 0.03, bg: "#ffffff", color: "#111111" }), T(`${th.date}  ·  ${th.place}`, { y: 0.88, size: fitS(`${th.date}  ·  ${th.place}`, 0.86, 0.036, r) }),
      T(`Tickets ${th.price}  ·  ${th.handle}`, { y: 0.93, size: 0.024, bold: false })] };
  }),
  L("faded-matte", "Minimal quote post", ["matte", "faded", "quote", "minimal"], ({ th, p, r }) => {
    const q = wrap(th.quote, 18), s = fitAll(q, 0.56, 0.06, r, "serif");
    return { aspect: "1:1", adjust: tone(p, { fade: 35, contrast: -15, saturation: -12, shadows: 15 }), overlays: [
      SH("rect", 0.5, 0.5, 0.68, 0.52, "#fbfaf7", { opacity: 0.92 }), ...lines(q, { y: 0.5 - ((q.length - 1) * s * 1.15) / 2 - 0.03, size: s, family: "serif", color: "#1f1b16", lead: 1.15 }),
      T(`— ${th.person}`, { y: 0.5 + ((q.length - 1) * s * 1.15) / 2 + 0.07, size: 0.026, bold: false, color: p.a === "#111111" ? "#555555" : p.a })] };
  }),
  L("gritty-mono", "Street style story", ["mono", "grain", "street", "story"], ({ th, p, r }) => ({ aspect: "9:16", filter: f("mono", 100), adjust: { contrast: 45, grain: 40, clarity: 30 }, frame: { id: "film", color: "#111111", width: 3 }, overlays: [
    T("STREET", { x: 0.17, y: 0.46, size: Math.min(0.14, 0.8 / em("STREET")), rotation: -90, color: "#ffffff", opacity: 0.92 }),
    T(up(th.title), { right: 0.93, y: 0.86, size: fitS(up(th.title), 0.7, 0.05, r) }), T(`VOL. 07  ·  ${th.handle}`, { right: 0.93, y: 0.9, size: 0.018, bold: false })] })),
  L("magazine-cover", "Magazine cover", ["magazine", "cover", "title"], ({ th, p, r }) => ({ aspect: "4:5", adjust: tone(p, { clarity: 10 }), overlays: [
    T(th.mag, { y: 0.1, size: fitS(th.mag, 0.9, 0.16, r, "serif"), family: "serif", shadow: true }), T("ISSUE 07  ·  JUNE 2026  ·  Rs 500", { y: 0.185, size: 0.02, bold: false, shadow: true }),
    ...["The 10 best weekend trips", "Style notes for summer", "Meet the makers"].map((s, i) => T(s, { left: 0.06, y: 0.36 + i * 0.075, size: fitS(s, 0.36, 0.03, r), shadow: true })),
    SH("rect", 0.065, 0.36 + 2 * 0.075 + 0.045, 0.01, 0.06, p.b), SH("rect", 0.5, 0.86, 1, 0.3, "#000000", { fade: "top", opacity: 0.65 }),
    T(th.title, { left: 0.06, y: 0.82, size: fitS(th.title, 0.7, 0.085, r) }), T(th.line, { left: 0.06, y: 0.885, size: 0.03, bold: false }),
    SH("rect", 0.88, 0.9, 0.14, 0.09, "#ffffff"), T("|||| ||| ||", { x: 0.88, y: 0.895, size: 0.03, family: "mono", color: "#111111" })] })),
  L("postcard", "Travel postcard", ["postcard", "travel", "greetings"], ({ th, p, r }) => {
    const w = up(th.place), s = fitS(w, 0.8, 0.22, r);
    return { aspect: "16:9", frame: { id: "solid", color: "#fbfaf7", width: 3 }, adjust: tone(p, { vibrance: 15 }), overlays: [
      SH("rect", 0.5, 0.5, 1, 1, "#000000", { opacity: 0.28 }), T("Greetings from", { y: 0.3, size: 0.08, family: "serif", italic: true, bold: false, shadow: true }),
      T(w, { y: 0.52, size: s, color: p.b === "#1f2937" ? "#ffffff" : p.b, outline: p.d }), SH("rect", 0.9, 0.18, 0.1, 0.24, "#fbfaf7", { rotation: 6 }),
      SH("rect", 0.9, 0.18, 0.083, 0.2, "transparent", { strokeWidth: 0.4, stroke: p.a, rotation: 6 }), T("50", { x: 0.9, y: 0.18, size: 0.07, color: p.a, rotation: 6 }),
      T(th.line, { y: 0.84, size: 0.05, bold: false, shadow: true })] };
  }),
  L("video-thumbnail", "Video thumbnail", ["youtube", "thumbnail", "16:9", "video"], ({ th, p, r }) => {
    const t2 = split2(up(th.title)), s = fitAll(t2, 0.5, 0.17, r);
    return { aspect: "16:9", adjust: tone(p, { contrast: 20, vibrance: 25 }), overlays: [
      SH("rect", 0.32, 0.5, 0.64, 1, p.d, { fade: "right", opacity: 0.92 }), ...lines(t2, { left: 0.04, y: 0.3, size: s, color: "#ffffff", outline: "#000000" }),
      T("5 TIPS", { left: 0.045, y: 0.3 + s + 0.16, size: 0.09, bg: p.b, color: onA(p.b) }), SH("arrow", 0.62, 0.62, 0.12, 0.16, p.b, { rotation: -15, strokeWidth: 0.6, stroke: "#ffffff" }),
      SH("ellipse", 0.9, 0.17, 0.11, 0.2, p.a), T("NEW", { x: 0.9, y: 0.17, size: 0.06, color: onA(p.a) })] };
  }),
  L("collage-grid", "Photo grid collage", ["collage", "grid", "photos", "square"], ({ th, p, r, more }) => {
    const [a, b] = more(2);
    return { aspect: "1:1", frame: { id: "solid", color: "#ffffff", width: 2.5 }, adjust: tone(p), overlays: [
      IM(a, 0.755, 0.25, 0.49, 0.5), IM(b, 0.755, 0.755, 0.49, 0.49), SH("rect", 0.5, 0.5, 0.012, 1, "#ffffff"), SH("rect", 0.755, 0.5, 0.49, 0.012, "#ffffff"),
      SH("ellipse", 0.5, 0.5, 0.31, 0.31, "#ffffff"), T(up(th.word), { y: 0.48, size: fitS(up(th.word), 0.25, 0.06, r), color: p.d }), T(th.handle, { y: 0.54, size: fitS(th.handle, 0.24, 0.022, r, "sans", false), bold: false, color: p.a === "#111111" ? "#555555" : p.a })] };
  }),
  L("photo-strip", "Photo booth strip", ["photo booth", "strip", "collage", "story"], ({ th, p, r, more }) => {
    const [a, b] = more(2);
    return { aspect: "9:16", frame: { id: "solid", color: "#ffffff", width: 2.5 }, adjust: tone(p), overlays: [
      IM(a, 0.5, 0.455, 1, 0.29), IM(b, 0.5, 0.755, 1, 0.29), SH("rect", 0.5, 0.31, 1, 0.006, "#ffffff"), SH("rect", 0.5, 0.605, 1, 0.006, "#ffffff"),
      SH("rect", 0.5, 0.955, 1, 0.09, "#ffffff"), T(th.title, { y: 0.945, size: fitS(th.title, 0.8, 0.032, r, "serif", false), family: "serif", italic: true, bold: false, color: "#2b2b33" }),
      T("12 . 06 . 26", { y: 0.978, size: 0.012, family: "mono", bold: false, color: "#77777f" })] };
  }),
  L("polaroid-stack", "Instant photo stack", ["polaroid", "stack", "collage", "memories"], ({ th, p, r, more }) => {
    const [a, b, c3] = more(3);
    return { aspect: "4:5", adjust: tone(p, { blur: 50, brightness: -18, saturation: -10 }), overlays: [
      SH("rect", 0.5, 0.5, 1, 1, p.d, { opacity: 0.3 }), T(up(th.word), { y: 0.09, size: fitS(up(th.word), 0.8, 0.12, r), shadow: true }),
      ...polaroid(r, r * 0.33, 0.38, r * 0.48, -10, a, "", p), ...polaroid(r, r * 0.68, 0.4, r * 0.46, 8, b, "", p), ...polaroid(r, r * 0.5, 0.6, r * 0.56, -2, c3, th.title, p),
      T(th.handle, { y: 0.95, size: 0.024, bold: false, shadow: true })] };
  }),
  L("price-tag", "Product with price badge", ["product", "price", "shop", "badge"], ({ th, p, r }) => ({ aspect: "1:1", adjust: tone(p, { clarity: 12 }), overlays: [
    SH("star", 0.8, 0.2, 0.32, 0.32, p.b, { rotation: 8 }), T(th.price.replace("Rs ", "Rs\n"), { x: 0.8, y: 0.215, size: fitS(th.price.replace("Rs ", ""), 0.15, 0.045, r), color: onA(p.b), rotation: 8 }),
    T("NEW", { left: 0.06, y: 0.07, size: 0.03, bg: p.a, color: onA(p.a) }), SH("rounded", 0.5, 0.87, 0.88, 0.17, "#ffffff", { opacity: 0.96 }),
    T(th.title, { left: 0.1, y: 0.85, size: fitS(th.title, 0.5, 0.07, r), color: p.d }), T(th.brand, { left: 0.1, y: 0.9, size: 0.024, bold: false, color: "#555b6e" }),
    T(th.cta, { right: 0.9, y: 0.87, size: 0.03, bg: p.a, color: onA(p.a) })] })),
  L("sale-banner", "Sale banner", ["sale", "banner", "shop", "16:9"], ({ th, p, r }) => ({ aspect: "16:9", adjust: tone(p, { vibrance: 20 }), overlays: [
    SH("rect", 0.3, 0.5, 0.75, 1.6, p.a, { rotation: 12, opacity: 0.95 }), SH("rect", 0.04, 0.5, 0.05, 1.6, p.b, { rotation: 12 }),
    T("WEEKEND", { left: 0.06, y: 0.3, size: fitS("WEEKEND", 0.42, 0.17, r), color: onA(p.a) }), T("SALE", { left: 0.06, y: 0.52, size: fitS("SALE", 0.42, 0.25, r), color: onA(p.a) }),
    T("Up to 40% off", { left: 0.065, y: 0.73, size: 0.06, color: onA(p.a) }), T(th.cta + "  →", { left: 0.065, y: 0.86, size: 0.045, bg: "#ffffff", color: p.d })] })),
  L("event-flyer", "Event flyer", ["event", "flyer", "date", "night"], ({ th, p, r }) => {
    const t2 = split2(up(th.title)), s = fitAll(t2, 0.86, 0.12, r);
    return { aspect: "4:5", adjust: tone(p, { brightness: -12 }), overlays: [
      SH("rect", 0.5, 0.75, 1, 0.55, p.d, { fade: "top", opacity: 0.95 }), SH("rect", 0.15, 0.13, 0.17, 0.17, p.a),
      T(th.day, { x: 0.15, y: 0.115, size: 0.08, color: onA(p.a) }), T(th.month, { x: 0.15, y: 0.18, size: 0.024, color: onA(p.a) }),
      ...lines(t2, { left: 0.065, y: 0.66, size: s }), T(`${th.place}  ·  7 pm`, { left: 0.07, y: 0.66 + s + 0.07, size: 0.034, bold: false }),
      T(th.cta, { left: 0.07, y: 0.9, size: 0.03, bg: p.a, color: onA(p.a) }), T(th.handle, { right: 0.93, y: 0.9, size: 0.024, bold: false })] };
  }),
  L("recipe-card", "Recipe card", ["recipe", "food", "card", "menu"], ({ th, p, r }) => ({ aspect: "4:5", adjust: tone(p, { vibrance: 15 }), overlays: [
    SH("rounded", 0.5, 0.8, 0.88, 0.32, "#ffffff", { opacity: 0.96 }), T("RECIPE", { left: 0.1, y: 0.69, size: 0.022, color: p.a === "#111111" ? "#111111" : p.a }),
    T(th.title, { left: 0.1, y: 0.75, size: fitS(th.title, 0.78, 0.085, r, "serif"), family: "serif", color: "#1f1b16" }),
    ...[["20", "MIN"], ["2", "SERVES"], ["4", "STEPS"]].flatMap(([a, b], i) => [T(a, { x: 0.2 + i * 0.3, y: 0.83, size: 0.045, color: "#1f1b16" }), T(b, { x: 0.2 + i * 0.3, y: 0.875, size: 0.018, bold: false, color: "#77706a" })]),
    T(th.brand, { y: 0.93, size: 0.02, bold: false, color: "#77706a" })] })),
  L("travel-stamp", "Destination badge", ["travel", "stamp", "badge", "square"], ({ th, p, r }) => ({ aspect: "1:1", adjust: tone(p, { vibrance: 10 }), overlays: [
    SH("rect", 0.5, 0.2, 1, 0.4, "#000000", { fade: "bottom", opacity: 0.5 }), T(up(th.place), { left: 0.06, y: 0.11, size: fitS(up(th.place), 0.6, 0.09, r), shadow: true }),
    T(th.line, { left: 0.065, y: 0.19, size: 0.034, bold: false, shadow: true }),
    SH("ellipse", 0.8, 0.8, 0.3, 0.3, "transparent", { strokeWidth: 0.9 }), SH("ellipse", 0.8, 0.8, 0.25, 0.25, "transparent", { strokeWidth: 0.35 }),
    T("2026", { x: 0.8, y: 0.8, size: 0.06, shadow: true, rotation: -12 }), T("VISITED", { x: 0.8, y: 0.745, size: 0.022, rotation: -12 })] })),
  L("birthday-card", "Birthday card", ["birthday", "card", "party", "celebration"], ({ th, p, r }) => ({ aspect: "4:5", frame: { id: "solid", color: p.l, width: 3 }, adjust: tone(p, { exposure: 8 }), overlays: [
    ...[[0.1, 0.1, p.a, 20], [0.9, 0.12, p.b, -30], [0.16, 0.3, "#ffffff", 45], [0.86, 0.32, p.a, 10], [0.08, 0.6, p.b, -15], [0.92, 0.58, "#ffffff", 35]].map(([x, y, c, rot]) => SH("rect", x, y, 0.05, 0.016, c, { rotation: rot })),
    SH("ellipse", 0.24, 0.16, 0.025, 0.02, p.b), SH("ellipse", 0.74, 0.22, 0.02, 0.016, "#ffffff"), SH("rect", 0.5, 0.82, 1, 0.36, p.d, { fade: "top", opacity: 0.85 }),
    T("Happy birthday!", { y: 0.79, size: fitS("Happy birthday!", 0.86, 0.09, r, "serif"), family: "serif", italic: true, color: "#ffffff" }), T("Love from all of us at " + th.brand, { y: 0.88, size: fitS("Love from all of us at " + th.brand, 0.84, 0.03, r, "sans", false), bold: false })] })),
  L("profile-banner", "Profile banner", ["banner", "linkedin", "header", "profile"], ({ th, p, r }) => ({ aspect: "16:9", adjust: tone(p, { brightness: -6 }), overlays: [
    SH("rect", 0.26, 0.5, 0.52, 1, p.d, { opacity: 0.84 }), SH("rect", 0.52, 0.5, 0.008, 1, p.b),
    T(th.person, { left: 0.05, y: 0.33, size: fitS(th.person, 0.42, 0.1, r) }), T(`${th.role}, ${th.brand}`, { left: 0.05, y: 0.46, size: fitS(`${th.role}, ${th.brand}`, 0.42, 0.05, r, "sans", false), bold: false, color: p.b === "#1f2937" ? "#e5e7eb" : p.b }),
    T(`${th.handle}  ·  hello@${th.brand.toLowerCase().replace(/[^a-z]/g, "")}.example`, { left: 0.05, y: 0.66, size: fitS(`${th.handle}  ·  hello@northwindstudio.example`, 0.44, 0.035, r, "sans", false), bold: false })] })),
  L("testimonial", "Customer review", ["review", "quote", "customer", "stars"], ({ th, p, r }) => {
    const q = wrap(`“${th.quote}”`, 20), s = fitAll(q, 0.8, 0.055, r, "serif");
    return { aspect: "1:1", adjust: tone(p, { brightness: -38, saturation: -20 }), overlays: [
      ...[0, 1, 2, 3, 4].map((i) => SH("star", 0.36 + i * 0.07, 0.25, 0.055, 0.055, "#ffc531")),
      ...lines(q, { y: 0.4, size: s, family: "serif", italic: true, bold: false, lead: 1.15 }), SH("rect", 0.5, 0.4 + (q.length - 1) * s * 1.15 + 0.08, 0.08, 0.006, p.b === "#1f2937" ? "#ffffff" : p.b),
      T(th.person, { y: 0.4 + (q.length - 1) * s * 1.15 + 0.13, size: 0.036 }), T(`${th.role}, ${th.brand}`, { y: 0.4 + (q.length - 1) * s * 1.15 + 0.18, size: 0.026, bold: false, color: "#d9dbe4" })] };
  }),
];
// duotone per palette (the "Concert poster" layout)
const DUO_OF = { p01: "violet", p02: "coral", p03: "teal", p04: "ocean", p05: "sunset", p06: "berry", p07: "forest", p08: "ocean", p09: "sunset", p10: "violet", p11: "berry", p12: "coral" };
const PE_EXTRA = [{ id: "pe~passport~people", layout: "passport", theme: "people", name: "Passport photo 35 × 45 mm", section: LOOKS, tags: ["passport", "id", "35x45"], recipe: { kind: "look", aspect: "passport", panel: "export" } }]; // a real head-and-shoulders portrait
// layouts of earlier versions that were replaced: their ids open the closest new design
const ALIAS_LAYOUT = { meme: "video-thumbnail" };

/* ---------- background remover: the subject on a bold background (cut-out look), big type ---------- */
// back(p) -> bg spec; o(c) -> overlays. bg modes: color / image (backdrop) / transparent / blur.
const pop = (p, o) => ({ mode: "image", backdrop: { kind: "pop", c1: p.l, c2: p.a, c3: p.d, ...o } });
const B = (id, name, tags, back, o = {}) => ({ id, name, tags, bg: back, ...o });
const brTitle = (c, text, y, { w = 0.88, max = 0.15, ...o } = {}) => T(text, { y, size: fitS(text, w, max, c.r, o.family, true), color: "#ffffff", ...o });
const brSub = (c, text, y, o = {}) => T(text, { y, size: fitS(text, 0.84, 0.04, c.r, "sans", false), bold: false, color: "#ffffff", ...o });
const BR_LAYOUTS = [
  B("solid", "Bold colour cut-out", ["colour", "plain", "bold"], (p) => ({ mode: "color", color: p.a }), { clip: "blob",
    texts: (c) => [brTitle(c, up(c.th.word), 0.12, { color: onA(c.p.a) }), brSub(c, c.th.brand, 0.92, { color: onA(c.p.a) })] }),
  B("pastel", "Soft pastel product", ["pastel", "light", "shop", "product"], (p) => ({ mode: "color", color: p.l, shadow: { dist: 8, blur: 30, angle: 90, alpha: 25 } }), { aspect: "1:1", clip: "circle",
    texts: (c) => [brTitle(c, c.th.title, 0.1, { family: "serif", color: c.p.d, max: 0.13 }), T(c.th.price, { y: 0.91, size: 0.045, bg: c.p.a, color: onA(c.p.a) })] }),
  B("gradient", "Vivid gradient pop", ["gradient", "colour", "vivid"], (p) => pop(p, { c1: p.a, c2: p.d, grad: "diag", shape: "circle", sc: p.b, r: 0.34 }), { clip: "circle", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.11), brSub(c, c.th.line, 0.92)] }),
  B("blob-pop", "Blob cut-out", ["blob", "shape", "modern"], (p) => pop(p, { c1: p.l, c2: p.b === "#1f2937" ? p.l : p.b, grad: "linear", shape: "blob", sc: p.a, seed: 5 }), { clip: "blob", shadow: true,
    texts: (c) => [T(up(c.th.word), { left: 0.05, y: 0.12, size: fitS(up(c.th.word), 0.62, 0.17, c.r), color: c.p.d }), T(c.th.price, { left: 0.06, y: 0.9, size: 0.045, bg: c.p.d, color: "#ffffff" }), T(c.th.handle, { right: 0.95, y: 0.92, size: 0.03, color: c.p.d })] }),
  B("arch", "Arch window", ["arch", "modern", "shop", "elegant"], (p) => pop(p, { c1: p.l, c2: p.l, grad: "flat", shape: "arch", sc: p.a, cy: 0.62 }), { clip: "arch", shadow: true,
    texts: (c) => [brTitle(c, c.th.brand, 0.09, { family: "serif", color: c.p.d, max: 0.11 }), brSub(c, up(c.th.label) + " COLLECTION", 0.18, { color: c.p.d })] }),
  B("spotlight", "Spotlight", ["studio", "light", "product", "dark"], (p) => pop(p, { c1: p.a, c2: p.d, grad: "radial", shape: "none", pattern: "floor", c3: "#000000" }), { clip: "ellipse", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.11), T(c.th.price, { y: 0.91, size: 0.045, bg: "#ffffff", color: c.p.d })] }),
  B("sunset", "Sunrise half-circle", ["sunset", "warm", "gradient"], (p) => pop(p, { c1: p.b === "#1f2937" ? "#ffd166" : p.b, c2: p.a, grad: "linear", shape: "half", sf: "#ffffff", r: 0.4 }), { clip: "circle", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.word), 0.1, { color: c.p.d }), brSub(c, c.th.line, 0.19, { color: c.p.d })] }),
  B("profile-circle", "Profile circle", ["profile", "avatar", "circle"], (p) => ({ mode: "color", color: p.a }), { aspect: "1:1", frame: { id: "circle", color: "#ffffff", width: 4 }, clip: "none" }),
  B("see-through", "See-through PNG", ["transparent", "png", "cut out"], () => ({ mode: "transparent" }), { fixed: true, clip: "blob" }),
  B("soft-blur", "Soft blur portrait", ["blur", "focus", "portrait"], () => ({ mode: "blur", blur: 60 }), { fixed: true, clip: "ellipse",
    texts: (c) => [brTitle(c, c.th.title, 0.88, { family: "serif", shadow: true, max: 0.13 })] }),
  B("night", "Night sky", ["stars", "night", "dark"], () => pop({}, { c1: "#3a3f9f", c2: "#0d0f2e", grad: "radial", pattern: "stars", shape: "circle", sf: "#fef3c7", r: 0.33, cy: 0.52 }), { fixed: true, clip: "circle",
    texts: (c) => [brTitle(c, up(c.th.word), 0.1, { color: "#fef3c7" }), brSub(c, c.th.line, 0.93, { color: "#fef3c7" })] }),
  B("studio", "Studio light", ["studio", "grey", "product"], () => pop({}, { c1: "#ffffff", c2: "#c9ced8", c3: "#1b2133", grad: "radial", shape: "none", pattern: "floor" }), { fixed: true, clip: "ellipse", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.1, { color: "#1b2133" }), brSub(c, `${c.th.brand}  ·  ${c.th.price}`, 0.92, { color: "#1b2133" })] }),
  B("leaves", "Green leaves", ["nature", "green", "fresh"], () => pop({}, { c1: "#d8f3dc", c2: "#52b788", grad: "diag", pattern: "dots", pc: "#1b4332", shape: "blob", sc: "#2d6a4f", seed: 9 }), { fixed: true, clip: "blob", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.1, { color: "#1b4332" }), brSub(c, c.th.offer, 0.93, { color: "#1b4332" })] }),
  B("brick", "Brick wall", ["wall", "brick", "urban"], (p) => ({ mode: "image", backdrop: { kind: "brick", c1: p.l, c2: p.a, c3: p.d }, shadow: { dist: 10, blur: 18 } }), { clip: "rect", shadow: true,
    texts: (c) => [T(up(c.th.title), { y: 0.11, size: fitS(up(c.th.title), 0.82, 0.12, c.r, "sans", true, 0.7), bg: c.p.d, color: "#ffffff" }), brSub(c, c.th.handle, 0.93)] }),
  B("shelf", "On a wooden shelf", ["product", "wood", "shelf"], (p) => pop(p, { c1: p.l, c2: "#efe6da", grad: "linear", pattern: "wood", shape: "none" }), { clip: "ellipse", shadow: true,
    texts: (c) => [T(c.th.title, { left: 0.06, y: 0.11, size: fitS(c.th.title, 0.6, 0.13, c.r, "serif"), family: "serif", color: c.p.d }), T(c.th.price, { left: 0.065, y: 0.22, size: 0.05, color: c.p.a === "#111111" ? c.p.d : c.p.a })] }),
  B("marble", "Marble luxury", ["marble", "luxury", "product"], (p) => pop(p, { c1: "#f7f6f3", c2: "#e9e6e1", grad: "linear", pattern: "marble", shape: "circle", sc: "#ffffff", r: 0.33 }), { clip: "circle", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.brand), 0.09, { family: "serif", color: "#2b2420", max: 0.1 }), brSub(c, "Limited edition", 0.92, { family: "serif", italic: true, color: "#2b2420" })] }),
  B("bokeh", "Party lights", ["bokeh", "lights", "night", "party"], (p) => pop(p, { c1: p.a, c2: "#0b0b1a", grad: "radial", pattern: "bokeh", shape: "ring", sc: "#ffd166", sf: "#ffffff" }), { clip: "circle",
    texts: (c) => [brTitle(c, up(c.th.title), 0.1, { color: "#ffd166" }), brSub(c, c.th.offer, 0.93)] }),
  B("podium", "Product podium", ["podium", "product", "shop", "3d"], (p) => pop(p, { c1: p.l, c2: p.a, grad: "linear", pattern: "floor", shape: "square", sc: p.a, sf: p.a, r: 0.31, cy: 0.58 }), { clip: "rounded", shadow: true,
    texts: (c) => [T("NEW ARRIVAL", { y: 0.06, size: 0.03, bg: c.p.d, color: "#ffffff" }), brTitle(c, up(c.th.title), 0.16, { color: c.p.d, max: 0.11 }), T(c.th.price, { y: 0.93, size: 0.05, color: c.p.d })] }),
  B("rays", "Sale burst", ["rays", "bright", "sale"], (p) => pop(p, { c1: p.b === "#1f2937" ? "#ffd166" : p.b, c2: p.a, grad: "radial", pattern: "rays", shape: "circle", sc: "#ffffff", r: 0.32 }), { clip: "circle", shadow: true,
    texts: (c) => [brTitle(c, "SALE", 0.12, { color: "#ffffff", outline: c.p.d, max: 0.17 }), T("Up to 50% off", { y: 0.92, size: 0.045, bg: c.p.d, color: "#ffffff" })] }),
  B("halftone", "Pop art", ["pop art", "dots", "comic"], (p) => pop(p, { c1: p.b === "#1f2937" ? "#ffe066" : p.b, c2: p.b === "#1f2937" ? "#ffe066" : p.b, grad: "flat", pattern: "halftone", pc: p.a, po: 0.55, shape: "circle", sc: "#ffffff" }), { clip: "circle", outline: true,
    texts: (c) => [T("WOW!", { x: 0.2, y: 0.15, size: 0.14, color: "#ffffff", outline: "#111111", rotation: -12 }), T(up(c.th.title), { y: 0.91, size: fitS(up(c.th.title), 0.8, 0.08, c.r, "sans", true, 0.7), bg: "#111111", color: "#ffffff" })] }),
  B("split", "Two-tone split", ["two colours", "diagonal", "bold"], (p) => pop(p, { c1: p.l, c2: p.a, grad: "split", shape: "none" }), { clip: "rounded", shadow: true,
    texts: (c) => [T(up(c.th.word), { left: 0.05, y: 0.12, size: fitS(up(c.th.word), 0.5, 0.17, c.r), color: c.p.d }), T(c.th.cta, { right: 0.95, y: 0.91, size: 0.04, bg: c.p.d, color: "#ffffff" })] }),
  B("stripes", "Candy stripes", ["pattern", "stripes", "fun"], (p) => pop(p, { c1: p.a, c2: p.a, grad: "flat", pattern: "stripes", po: 0.25, shape: "blob", sc: "#ffffff", seed: 2 }), { clip: "blob", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.1, { color: onA(c.p.a) }), brSub(c, c.th.offer, 0.93, { color: onA(c.p.a) })] }),
  B("dots", "Polka dots", ["pattern", "dots", "fun"], (p) => pop(p, { c1: p.l, c2: p.l, grad: "flat", pattern: "dots", pc: p.a, po: 0.4, shape: "circle", sc: p.a, r: 0.32, cy: 0.56 }), { clip: "circle",
    texts: (c) => [brTitle(c, up(c.th.brand), 0.1, { color: c.p.d, max: 0.12 }), T(c.th.price, { y: 0.93, size: 0.045, bg: c.p.d, color: "#ffffff" })] }),
  B("confetti", "Party confetti", ["party", "birthday", "fun"], (p) => pop(p, { c1: "#fff7ed", c2: p.l, grad: "linear", pattern: "confetti", pc: p.a, shape: "stack", sc: p.b === "#1f2937" ? "#ffd166" : p.b, sf: p.a, cy: 0.58 }), { clip: "circle", shadow: true,
    texts: (c) => [brTitle(c, "Happy birthday!", 0.1, { family: "serif", italic: true, color: c.p.d, max: 0.13 })] }),
  B("waves", "Ocean waves", ["waves", "calm", "blue"], (p) => pop(p, { c1: "#e0f2fe", c2: "#38bdf8", grad: "linear", pattern: "waves", pc: "#0369a1", po: 0.6, shape: "circle", sc: "#ffffff", r: 0.32, cy: 0.52 }), { clip: "circle", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.word), 0.1, { color: "#0c4a6e" }), brSub(c, c.th.line, 0.93)] }),
  B("grid", "Grid paper", ["grid", "school", "clean"], (p) => pop(p, { c1: "#ffffff", c2: "#ffffff", grad: "flat", pattern: "grid", pc: p.a, po: 0.18, shape: "square", sc: p.l, sf: p.l, cy: 0.58 }), { clip: "rounded", shadow: true,
    texts: (c) => [T(c.th.title, { left: 0.06, y: 0.1, size: fitS(c.th.title, 0.7, 0.12, c.r), color: c.p.d }), T(c.th.line, { left: 0.065, y: 0.19, size: 0.034, bold: false, color: c.p.d })] }),
  B("terrazzo", "Terrazzo", ["pattern", "modern", "speckles"], (p) => pop(p, { c1: "#f6f1ea", c2: "#f6f1ea", grad: "flat", pattern: "terrazzo", c3: p.d, shape: "arch", sc: p.a, cy: 0.64 }), { clip: "arch", shadow: true,
    texts: (c) => [brTitle(c, c.th.brand, 0.09, { family: "serif", color: "#2b2420", max: 0.11 })] }),
  B("diamond", "Diamond frame", ["diamond", "shape", "bold"], (p) => pop(p, { c1: p.d, c2: p.a, grad: "diag", shape: "diamond", sc: p.b === "#1f2937" ? "#ffffff" : p.b, r: 0.28, cy: 0.58 }), { clip: "diamond", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.1, { max: 0.13 }), brSub(c, c.th.handle, 0.94)] }),
  B("checkfloor", "Retro checked floor", ["floor", "retro", "room"], (p) => ({ mode: "image", backdrop: { kind: "checkfloor", c1: p.l, c2: p.a, c3: p.d }, shadow: { dist: 8, blur: 16, angle: 100 } }), { clip: "ellipse", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.1, { color: c.p.d })] }),
  B("rainbow", "Rainbow", ["rainbow", "kids", "happy"], () => ({ mode: "image", backdrop: { kind: "rainbow" } }), { fixed: true, clip: "circle",
    texts: (c) => [brTitle(c, "Hello, sunshine!", 0.1, { color: "#6a4c93", max: 0.13 })] }),
  B("stars", "Star pattern", ["stars", "pattern", "kids"], (p) => ({ mode: "image", backdrop: { kind: "stars", c1: p.l, c2: p.a, c3: p.d }, outline: { width: 7 } }), { clip: "blob", outline: true,
    texts: (c) => [T("STAR OF THE WEEK", { y: 0.1, size: fitS("STAR OF THE WEEK", 0.84, 0.09, c.r, "sans", true, 0.7), bg: c.p.a, color: onA(c.p.a) })] }),
  B("hearts", "Hearts", ["love", "hearts", "valentine"], (p) => ({ mode: "image", backdrop: { kind: "hearts", c1: p.l, c2: p.a, c3: p.d } }), { clip: "heart",
    texts: (c) => [brTitle(c, "With love", 0.1, { family: "serif", italic: true, color: c.p.a === "#111111" ? "#111111" : c.p.a, max: 0.14 })] }),
  B("meadow", "Green meadow", ["grass", "outdoor", "spring"], () => ({ mode: "image", backdrop: { kind: "grass" } }), { fixed: true, clip: "ellipse",
    texts: (c) => [brTitle(c, "Out and about", 0.1, { color: "#1b4332", max: 0.13 })] }),
  B("notebook", "Notebook paper", ["paper", "school", "notes"], (p) => ({ mode: "image", backdrop: { kind: "paper", c1: p.l, c2: p.a, c3: p.d }, shadow: { dist: 6, blur: 12 } }), { clip: "rect", shadow: true,
    texts: (c) => [T("My weekly notes", { left: 0.15, y: 0.1, size: fitS("My weekly notes", 0.75, 0.11, c.r, "serif"), family: "serif", italic: true, color: "#1f2937" })] }),
  B("sticker", "Sticker with outline", ["sticker", "outline", "cut out"], (p) => ({ mode: "color", color: p.l, outline: { width: 10, color: "#ffffff" }, shadow: { dist: 6, blur: 10, alpha: 30 } }), { clip: "blob", outline: true, shadow: true,
    texts: (c) => [T(up(c.th.word) + "!", { x: 0.22, y: 0.14, size: 0.12, color: "#ffffff", outline: c.p.a, rotation: -10 }), T(c.th.handle, { right: 0.95, y: 0.93, size: 0.032, color: c.p.d })] }),
  B("floating", "Floating with shadow", ["shadow", "white", "product"], () => ({ mode: "color", color: "#ffffff", shadow: { dist: 18, blur: 30, angle: 90, alpha: 35 } }), { fixed: true, clip: "ellipse", shadow: true,
    texts: (c) => [brTitle(c, c.th.title, 0.1, { color: "#1b2133", max: 0.13 }), T(c.th.price, { y: 0.92, size: 0.045, bg: "#1b2133", color: "#ffffff" })] }),
  // ID photo backgrounds: the sample is a head-and-shoulders portrait from the people library
  B("id-blue", "ID photo, light blue", ["passport", "id", "blue"], () => ({ mode: "color", color: "#dbeafe" }), { fixed: true, aspect: "passport", clip: "none", sampleLabel: "Portrait sample" }),
  B("id-white", "ID photo, white", ["passport", "id", "white"], () => ({ mode: "color", color: "#ffffff" }), { fixed: true, aspect: "passport", clip: "none", sampleLabel: "Portrait sample" }),
  B("dark-studio", "Dark studio", ["dark", "studio", "dramatic"], (p) => pop(p, { c1: p.a, c2: "#05060a", grad: "radial", shape: "none", pattern: "floor", c3: "#000000" }), { clip: "ellipse", shadow: true,
    texts: (c) => [brTitle(c, up(c.th.title), 0.86, { max: 0.12 }), brSub(c, c.th.brand, 0.94, { color: "#d9dbe4" })] }),
  B("youtube-cutout", "Video thumbnail cut-out", ["youtube", "thumbnail", "16:9"], (p) => pop(p, { c1: p.a, c2: p.d, grad: "diag", pattern: "halftone", pc: "#ffffff", po: 0.12, shape: "circle", sc: p.b === "#1f2937" ? "#ffd166" : p.b, r: 0.36 }), { aspect: "16:9", clip: "circle", outline: true,
    texts: (c) => { const t2 = split2(up(c.th.title)), s = fitAll(t2, 0.3, 0.16, c.r); return [...lines(t2, { left: 0.04, y: 0.3, size: s, outline: "#000000" }), T("WATCH NOW", { left: 0.045, y: 0.3 + s + 0.16, size: 0.07, bg: "#ffffff", color: c.p.d })]; } }),
  B("product-sale", "Product sale badge", ["product", "sale", "price", "shop"], (p) => pop(p, { c1: p.l, c2: p.l, grad: "flat", pattern: "dots", pc: p.a, po: 0.18, shape: "blob", sc: p.a, seed: 7, cy: 0.58 }), { aspect: "1:1", clip: "blob", shadow: true,
    texts: (c) => [SH("star", 0.82, 0.2, 0.28, 0.28, c.p.b === "#1f2937" ? "#ffd166" : c.p.b, { rotation: 10 }), T("-25%", { x: 0.82, y: 0.215, size: 0.06, color: "#14141f", rotation: 10 }),
      T(c.th.title, { left: 0.05, y: 0.1, size: fitS(c.th.title, 0.58, 0.11, c.r), color: c.p.d }), T(c.th.price, { left: 0.06, y: 0.9, size: 0.055, bg: c.p.d, color: "#ffffff" })] }),
  B("team-card", "Staff pick card", ["staff pick", "product", "team", "recommend"], (p) => pop(p, { c1: p.a, c2: p.a, grad: "flat", shape: "arch", sc: p.l, sf: p.l, cy: 0.62 }), { aspect: "4:5", clip: "arch",
    texts: (c) => [T("STAFF PICK", { y: 0.07, size: 0.034, color: onA(c.p.a) }), SH("rect", 0.5, 0.9, 1, 0.2, c.p.d), T(c.th.title, { y: 0.87, size: fitS(c.th.title, 0.84, 0.08, c.r) }), T(`Chosen by ${c.th.person}, ${c.th.role}`, { y: 0.94, size: fitS(`Chosen by ${c.th.person}, ${c.th.role}`, 0.8, 0.03, c.r, "sans", false), bold: false })] }),
];

/* ---------- image enhancer presets (no palette); `look` = how the thumbnail shows the before/after ---------- */
const IE_LAYOUTS = [
  ["sharpen-2x", "Sharper and 2× bigger", [2, 20, 45, 1, 1, 0], ["upscale", "2x", "sharpen"], "split", "blur"],
  ["upscale-4x", "Upscale 4×", [4, 15, 30, 0, 0, 0], ["upscale", "4x", "print"], "loupe", "blur"],
  ["clean-noise", "Clean up noise", [1, 80, 15, 0, 1, 0], ["noise", "grain"], "diag", "noise"],
  ["old-photo", "Fix an old photo", [2, 55, 30, 1, 1, 1], ["restore", "old", "colour"], "cards", "old"],
  ["portrait", "Face-safe portrait", [2, 30, 25, 1, 1, 1], ["portrait", "skin", "face"], "split", "soft"],
  ["product", "Product detail", [2, 10, 60, 1, 1, 0], ["product", "shop", "detail"], "loupe", "blur"],
  ["low-light", "Low light rescue", [1, 60, 20, 1, 1, 0], ["dark", "night"], "rows", "dark"],
  ["crisp", "Same size, crisper", [1, 15, 55, 1, 0, 0], ["sharpen", "crisp"], "split", "blur"],
  ["print-2x", "Ready to print 2×", [2, 25, 40, 1, 1, 0], ["print", "2x"], "steps", "blur"],
  ["web-ready", "Clean for the web", [1, 20, 30, 1, 1, 0], ["web", "blog"], "diag", "dull"],
  ["social-2x", "Social post 2×", [2, 35, 20, 1, 1, 1], ["social", "post"], "cards", "blur"],
  ["landscape", "Landscape detail", [2, 15, 50, 0, 1, 0], ["landscape", "nature"], "loupe", "dull"],
  ["screenshot", "Text and screenshots", [2, 0, 70, 0, 0, 0], ["text", "screenshot", "sharp"], "rows", "blur"],
  ["night-clean", "Night photo clean-up", [1, 90, 10, 0, 1, 0], ["night", "noise"], "split", "noise"],
  ["gentle-2x", "Gentle 2× upscale", [2, 40, 15, 0, 0, 1], ["gentle", "2x", "soft"], "diag", "soft"],
  ["face-4x", "Portrait 4×", [4, 30, 20, 1, 1, 1], ["portrait", "4x", "face"], "steps", "blur"],
  ["logo-crisp", "Logo and graphics 4×", [4, 0, 75, 0, 0, 0], ["logo", "graphics", "4x"], "loupe", "blur"],
  ["document", "Document scan", [2, 20, 65, 0, 1, 0], ["document", "scan", "text"], "cards", "dull"],
  ["print-4x", "Poster print 4×", [4, 25, 35, 1, 1, 0], ["poster", "print", "4x"], "rows", "blur"],
  ["pet-fur", "Pet fur detail", [2, 15, 50, 1, 1, 0], ["pets", "fur", "detail"], "split", "blur"],
  ["food-photo", "Food photo", [2, 20, 40, 1, 1, 0], ["food", "menu", "colour"], "diag", "dull"],
  ["sky-clean", "Smooth sky", [1, 70, 10, 1, 1, 0], ["sky", "smooth", "landscape"], "steps", "noise"],
  ["sign-text", "Signs and labels", [2, 10, 60, 0, 1, 0], ["sign", "label", "text"], "loupe", "blur"],
  ["memory", "Family memory", [2, 50, 25, 1, 1, 1], ["family", "old", "restore"], "cards", "old"],
].map(([id, name, [scale, denoise, sharpen, ac, at, fs], tags, view, before]) => ({ id, name, tags, view, before, enhance: { scale, denoise, sharpen, autoColor: !!ac, autoContrast: !!at, faceSafe: !!fs } }));

/* ---------- AI photo editor ideas: the prompt for AsaanDesk AI, plus a close look made with the free tools until AI is on ---------- */
const AI_LAYOUTS = [
  ["blue-sky", "Make the sky blue", "Make the sky a clear blue", { adjust: { warmth: -40, tint: -10, saturation: 15 } }],
  ["evening", "Turn it into evening", "Make it look like a warm evening", { filter: ["thar-dusk", 90], adjust: { exposure: -15 } }],
  ["studio-light", "Soft studio light", "Add soft studio light", { adjust: { exposure: 15, shadows: 30, clarity: -10 } }],
  ["remove-people", "Remove people at the back", "Remove the people at the back", { panel: "erase" }],
  ["snow-day", "Snowy day", "Make it a snowy winter day", { filter: ["frost", 100], adjust: { exposure: 18, saturation: -25 } }],
  ["watercolour", "Watercolour painting", "Turn the photo into a watercolour painting", { adjust: { blur: 12, saturation: 25, fade: 25, clarity: -30 } }],
  ["retro-poster", "Retro poster", "Make it look like a retro travel poster", { filter: ["film", 100], adjust: { contrast: 30, grain: 25 } }],
  ["golden-hour", "Golden hour glow", "Give it a golden hour glow", { filter: ["lahore-gold", 100], adjust: { vignette: 20 } }],
  ["film-noir", "Film noir", "Make it a dramatic black and white film still", { filter: ["noir", 100], adjust: { contrast: 25, vignette: 35 } }],
  ["neon-night", "Neon night", "Add neon city light colours", { filter: ["night", 70], adjust: { tint: 40, saturation: 30, contrast: 15 } }],
  ["autumn", "Autumn colours", "Change the leaves to autumn colours", { adjust: { warmth: 35, tint: 10, saturation: 15 } }],
  ["spring", "Fresh spring", "Make everything look fresh and green", { adjust: { vibrance: 30, exposure: 10, tint: -8 } }],
  ["dreamy", "Dreamy and soft", "Make it soft and dreamy", { filter: ["soft", 100], adjust: { fade: 20, blur: 6, exposure: 10 } }],
  ["comic", "Comic book style", "Turn it into a comic book picture", { adjust: { contrast: 45, saturation: 40, clarity: 40 } }],
  ["cinematic", "Cinematic colour", "Give it a cinematic teal and orange look", { adjust: { warmth: 15, tint: -15, contrast: 20, vignette: 30 } }],
  ["foggy", "Foggy morning", "Add a soft morning fog", { adjust: { fade: 40, contrast: -25, saturation: -20, exposure: 8 } }],
  ["day-to-night", "Day to night", "Turn this daytime photo into night", { filter: ["night", 100], adjust: { exposure: -30, warmth: -25 } }],
  ["oil-painting", "Oil painting", "Make it look like an oil painting", { adjust: { saturation: 30, clarity: -35, blur: 6, contrast: 15 } }],
  ["seventies", "1970s photo", "Make it look like a photo from the 1970s", { filter: ["film", 100], adjust: { warmth: 25, fade: 25, grain: 30 } }],
  ["pastel", "Pastel dream", "Give it soft pastel colours", { adjust: { exposure: 15, saturation: -25, fade: 30, tint: 10 } }],
  ["neon-duotone", "Neon poster", "Turn it into a bold two-colour poster", { duotone: "violet", adjust: { contrast: 25 } }],
  ["sepia", "Sepia memory", "Make it an old sepia photo", { filter: ["old-fort", 100], adjust: { saturation: -40, grain: 20 } }],
  ["summer", "Bright summer", "Make it a bright summer day", { filter: ["kite-day", 100], adjust: { exposure: 12, vibrance: 25 } }],
  ["moody-rain", "Moody rain", "Make it look like a rainy evening", { filter: ["monsoon", 100], adjust: { exposure: -12, vignette: 30 } }],
  ["golden-autumn", "Golden autumn", "Give it warm autumn light", { filter: ["chai", 100], adjust: { warmth: 20 } }],
  ["product-white", "Product on white", "Put the product on a clean white background", { panel: "bg" }],
  ["sharpen-upscale", "Sharper and bigger", "Make the photo sharper and bigger", { panel: "enhance" }],
  ["remove-object", "Remove an object", "Remove the bin from the corner", { panel: "erase" }],
  ["cartoon", "Cartoon look", "Turn the photo into a cartoon", { adjust: { contrast: 35, saturation: 45, clarity: 45, sharpen: 40 } }],
  ["blueprint", "Blueprint", "Make it look like a blueprint", { duotone: "ocean", invert: true }],
].map(([id, name, prompt, look], i) => ({ id, name, prompt, view: ["result", "split", "chat", "result", "card"][i % 5], ...look }));

const TOOLS = {
  [PE]: { pre: "pe", layouts: PE_LAYOUTS, themes: Object.keys(THEMES), pals: PAL, extra: PE_EXTRA },
  [BR]: { pre: "br", layouts: BR_LAYOUTS, themes: CUTOUT_THEMES, pals: PAL, extra: [] },
  [IE]: { pre: "ie", layouts: IE_LAYOUTS, themes: Object.keys(THEMES), pals: null, extra: [] },
  [AI]: { pre: "ai", layouts: AI_LAYOUTS, themes: Object.keys(THEMES), pals: null, extra: [] },
};
const PRE_TOOL = Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [v.pre, k]));

/* ---------- people: Canva's photo collages show people in about half of them (women in nature, friends, couples,
   models), and a profile picture, ID photo, review, magazine cover or photo-booth strip always shows a person. ---------- */
// Each theme's person: `one` (the theme's own person: the name and role in its copy, `sex` matches that name), `head` (a
// head-and-shoulders portrait for profile pictures) and `group`.
const WHO = {
  travel: { one: "traveler woman travel trip", head: "woman smiling portrait traveler", group: "backpackers travel friends adventure", sex: "f" },
  city: { one: "young man city casual portrait", head: "man smiling portrait casual", group: "friends young city", sex: "m" },
  garden: { one: "woman park nature smiling", head: "woman smiling portrait", group: "family picnic outdoors", sex: "f" },
  people: { one: "business woman team member portrait", head: "business woman headshot", group: "team meeting office colleagues", sex: "f" },
  cafe: { one: "barista man coffee cafe", head: "barista man portrait", group: "friends young happy", sex: "m" },
  beach: { one: "man smiling outdoors vacation", head: "man smiling portrait", group: "friends holiday vacation", sex: "m" },
  kitchen: { one: "chef cook kitchen", head: "chef portrait", group: "family", sex: "m" },
  // no "pets" entry: a card of the Pets theme keeps its animal (a person must not stand in for a pet either)
};
// A spot: { kind, sex, group, landscape, region: [x0, x1, y0, y1] = where the face must sit in the finished picture so the
// design's text bands and panels never cover it }. The photo editor crops a template's photo from the centre, so the
// photo is chosen with its face already in that region (thumbnails draw the same centre crop as the design that opens).
const ID_SPOT = { kind: "woman professional headshot portrait", region: [0.35, 0.65, 0.3, 0.48] };
const PE_PERSON = { // always a person (the layout's name or copy is about one)
  "round-profile": (T) => ({ kind: T.head, sex: T.sex, region: [0.32, 0.68, 0.24, 0.5] }),
  "profile-banner": (T) => ({ kind: T.one, sex: T.sex, region: [0.6, 0.93, 0.15, 0.6] }),
  testimonial: (T) => ({ kind: "testimonial customer smiling", sex: T.sex }),
  "magazine-cover": () => ({ kind: "fashion model woman portrait", region: [0.35, 0.8, 0.16, 0.5] }),
  "rose-blush": () => ({ kind: "wedding couple bride groom", region: [0.2, 0.8, 0.1, 0.3] }),
  "birthday-card": () => ({ kind: "child girl smiling kids", region: [0.15, 0.85, 0.12, 0.5] }),
  "photo-strip": () => ({ kind: "young woman smiling happy portrait", region: [0.2, 0.8, 0.05, 0.24] }), // the top frame of the strip
  "video-thumbnail": () => ({ kind: "young woman smiling happy", region: [0.56, 0.95, 0.1, 0.55] }),
  "noir-drama": (T) => ({ kind: T.one, region: [0.2, 0.8, 0.14, 0.5] }),
  "gritty-mono": () => ({ kind: "fashion street style outfit", region: [0.35, 0.85, 0.08, 0.55] }),
  "classic-mono": () => ({ kind: "fashion model woman portrait", region: [0.15, 0.85, 0.12, 0.45] }),
};
const PE_LIFE = { // lifestyle layouts: a person when the theme is about people outdoors (travel, city, garden, beach) or the team
  "warm-glow": (T) => ({ kind: T.one, region: [0.15, 0.85, 0.12, 0.45] }),
  "soft-glow": (T) => ({ kind: T.one, region: [0.2, 0.8, 0.1, 0.33] }),
  "instant-photo": (T) => ({ kind: T.one, region: [0.15, 0.85, 0.12, 0.6] }),
  "story-cover": (T) => ({ kind: T.one, region: [0.15, 0.85, 0.1, 0.45] }),
  "kite-sky": () => ({ kind: "concert crowd festival friends", group: true, region: [0.1, 0.75, 0.36, 0.7] }),
  "mountain-morning": (T) => ({ kind: T.group, group: true, region: [0.1, 0.9, 0.3, 0.62] }),
  "event-flyer": (T) => ({ kind: T.group, group: true, region: [0.3, 0.9, 0.12, 0.45] }),
};
const LIFE_THEMES = new Set(["travel", "city", "garden", "beach"]);
// the "Meet the team" theme shows the team in every layout except the ones about a menu, a recipe, a place or the weather
const TEAM_SKIP = new Set(["faded-matte", "tea-time", "recipe-card", "postcard", "sea-breeze", "rainy-day", "old-town", "travel-stamp", "square-post", "polaroid-stack", "duotone-pop"]);
function peSpot(lid, tid, aspect) {
  const T = WHO[tid];
  if (!T) return null;
  if (PE_PERSON[lid]) return PE_PERSON[lid](T);
  if (PE_LIFE[lid] && (LIFE_THEMES.has(tid) || tid === "people")) return PE_LIFE[lid](T);
  if (tid === "people" && !TEAM_SKIP.has(lid)) return (RATIO[aspect] || 1) >= 1 ? { kind: T.group, group: true } : { kind: T.one };
  return null;
}
// Background remover: the cut-out subject is a person in portrait layouts; the Beauty, Coffee and Food themes show their
// person (a skincare model, a barista, a chef) in the bold cut-out styles, products and pets stay in the others.
const BR_PERSON = {
  "profile-circle": (T) => ({ kind: T.head, sex: T.sex, region: [0.32, 0.68, 0.24, 0.5] }),
  "soft-blur": (T) => ({ kind: T.one }),
  "id-blue": () => ({ ...ID_SPOT, kind: "man professional headshot portrait" }), "id-white": () => ({ ...ID_SPOT, kind: "woman headshot glasses portrait" }),
  "youtube-cutout": () => ({ kind: "creator youtuber vlog camera" }),
  stars: (T) => ({ kind: T.one }),
  rainbow: () => ({ kind: "child kids girl smiling" }),
  confetti: () => ({ kind: "child girl smiling kids" }),
  hearts: () => ({ kind: "couple love valentine" }),
  sticker: () => ({ kind: "young woman smiling happy" }),
  meadow: () => ({ kind: "child playing outdoors kids" }),
};
const BR_BOLD = new Set(["solid", "gradient", "blob-pop", "sunset", "bokeh", "halftone", "split", "stripes", "dots", "brick", "dark-studio", "terrazzo", "diamond", "waves", "checkfloor"]);
const BR_CHEF = new Set(["dark-studio", "gradient"]); // food stays food, except the chef's portrait styles
function brSpot(lid, tid) {
  const T = tid === "people" ? { one: "beauty skincare woman", head: "beauty skincare woman portrait", sex: "f" } : WHO[tid];
  if (!T) return null;
  if (BR_PERSON[lid]) return BR_PERSON[lid](T);
  if (BR_BOLD.has(lid) && (tid === "people" || tid === "cafe" || (tid === "kitchen" && BR_CHEF.has(lid)))) return { kind: T.one };
  return null;
}
// Image enhancer: portraits, family memories and social posts are people (and travel photos show the traveller).
const IE_PERSON = {
  portrait: (T) => ({ kind: T.head }), "face-4x": (T) => ({ kind: T.head }), "social-2x": (T) => ({ kind: T.one }),
  memory: () => ({ kind: "family parents kids", group: true }), "old-photo": () => ({ kind: "senior couple elderly grandparents" }),
};
// AI photo editor: the ideas people try on portraits (cartoon, film noir, 1970s, neon, studio light), and the team.
const AI_PERSON = {
  "remove-people": () => ({ kind: "manager leader team behind", group: true }), "film-noir": (T) => ({ kind: T.one }), cartoon: (T) => ({ kind: T.head }),
  seventies: (T) => ({ kind: T.one }), "neon-night": () => ({ kind: "woman smiling street city portrait" }), "studio-light": () => ({ kind: "woman headshot portrait" }),
  "golden-autumn": (T) => ({ kind: T.one }),
};
function ieAiSpot(tool, lid, tid) {
  const T = WHO[tid];
  if (!T) return null;
  const M = tool === IE ? IE_PERSON : AI_PERSON;
  if (M[lid]) return M[lid](T);
  if (tool === IE && tid === "travel" && ["sharpen-2x", "print-2x"].includes(lid)) return { kind: T.one };
  if (tool === AI && tid === "people") return { kind: T.group, group: true };
  return null;
}
const DEF_REGION = [0.15, 0.85, 0.12, 0.62];
/** The cover crop {x, y, w, h} (fractions of the photo) for a picture of aspect r: the editor's centre crop, or with
 * `region` the crop that moves the face as close to the region's middle as the photo allows. */
function cropOf(p, r, region = null) {
  const pr = p.w / p.h, cw = pr > r ? r / pr : 1, ch = pr > r ? 1 : pr / r;
  if (!region) return { x: (1 - cw) / 2, y: (1 - ch) / 2, w: cw, h: ch };
  const [x0, x1, y0, y1] = region, cl = (v, max) => Math.max(0, Math.min(max, v));
  return { x: cl((p.fx ?? 0.5) - cw * (x0 + x1) / 2, 1 - cw), y: cl((p.fy ?? 0.4) - ch * (y0 + y1) / 2, 1 - ch), w: cw, h: ch };
}
/** Is the face of p inside the region (fractions of the picture) of crop c? */
const faceInside = (p, c, [x0, x1, y0, y1] = DEF_REGION) => { const u = ((p.fx ?? 0.5) - c.x) / c.w, v = ((p.fy ?? 0.4) - c.y) / c.h; return u >= x0 && u <= x1 && v >= y0 && v <= y1; };
// How specific a tag is among the people photos (a rare tag like "barista" says more than "man" or "portrait").
const IDF = (() => { const df = new Map(); for (const p of PEOPLE) for (const t of new Set(p.tags || [])) df.set(t, (df.get(t) || 0) + 1); return (w) => (df.has(w) ? Math.log(PEOPLE.length / df.get(w)) : 0); })();
/** A people photo for a spot: the library's best matches for the kind (pickPerson), most specific tags first, and among
 * the right kind the one whose face already sits in the spot's region of the editor's centre crop at aspect r. When none
 * does, `crop` is the crop that puts the face there (the editor's applyLook should use it for the template's own photo).
 * r = null: any framing (thumbnails crop around the face). Deterministic per seed; never one of `exclude`. */
function personFor(spot, r, seed, exclude = [], { cropOk = true } = {}) {
  const ex = [...exclude.filter(Boolean)], pool = [];
  const o = { sex: spot.sex || null, group: spot.group ?? null, landscape: spot.landscape ?? null };
  for (let i = 0; i < 32; i++) {
    const p = pickPerson(spot.kind, `${seed}:${i}`, { ...o, exclude: ex });
    if (!p || !isPerson(p) || ex.includes(p.id)) break;
    pool.push(p); ex.push(p.id);
  }
  if (!pool.length) return null;
  const words = [...new Set(String(spot.kind).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2))];
  const score = (p) => words.reduce((s, w) => s + (p.tags?.includes(w) ? IDF(w) : 0), 0);
  const ranked = pool.map((p, i) => [p, score(p), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  // the right kind (close to the best score), in pickPerson's seeded order so templates of one kind vary
  const near = ranked.filter(([, s]) => s >= ranked[0][1] - 1.5).sort((a, b) => a[2] - b[2]).map(([p]) => p), all = ranked.map(([p]) => p);
  if (!r) return { photo: near[0], crop: null };
  const centre = (p) => faceInside(p, cropOf(p, r), spot.region), moved = (p) => faceInside(p, cropOf(p, r, spot.region || DEF_REGION), spot.region);
  let p = near.find(centre);
  if (p) return { photo: p, crop: null };
  if (cropOk && (p = near.find(moved))) return { photo: p, crop: cropOf(p, r, spot.region || DEF_REGION) };
  if ((p = all.find(centre))) return { photo: p, crop: null };
  if (cropOk && (p = all.find(moved))) return { photo: p, crop: cropOf(p, r, spot.region || DEF_REGION) };
  return { photo: all[0], crop: null };
}

/** A library photo for topic words (best first: a theme hit counts most, then tags), deterministic per seed; only
 * close matches are used, so a cat template gets an animal, a coffee template a cup. */
function choose(words, seed, exclude = []) {
  const ws = String(words).split(/\s+/).filter(Boolean);
  let best = 0; const scored = [];
  for (const p of PHOTOS) {
    if (exclude.includes(p.id)) continue;
    let s = 0;
    ws.forEach((w, i) => { const k = 1 - i * 0.06; if (p.theme === w) s += 3 * k; if (p.tags?.includes(w)) s += 2 * k; });
    if (s > 0) { scored.push([s, p]); if (s > best) best = s; }
  }
  scored.sort((a, b) => b[0] - a[0] || (a[1].id < b[1].id ? -1 : 1));
  const good = scored.filter(([s]) => s >= best * 0.6).map(([, p]) => p);
  // more photos of one design: the next best matches before anything off-topic
  const list = good.length ? good : scored.length ? scored.map(([, p]) => p) : PHOTOS.filter((p) => !exclude.includes(p.id));
  return list.length ? list[hash(String(seed)) % list.length] : null;
}
/** The template's photo from the library (same id -> same photo): a people photo where the template shows a person. */
const mainPhoto = (tool, th, id) => choose(tool === BR ? th.cut : th.topic, id);
/** More photos for collages (never the same one): the photo-booth strip shows people in every frame, the team theme its
 * team, and the front print of a lifestyle photo stack a person; the rest are photos of the theme. Boxes are 1:1 except
 * the strip's wide frames. */
function morePhotos(th, id, main, count, lid = "", tid = "") {
  const out = [], ex = [main?.id];
  const spotAt = (i) => {
    if (lid === "photo-strip") return [i % 2 ? { kind: "couple love happy", region: [0.15, 0.85, 0.15, 0.7] } : { kind: "friends young happy group", group: true, region: [0.15, 0.85, 0.15, 0.7] }, 1.94];
    if (tid === "people" && (lid === "collage-grid" || lid === "polaroid-stack")) return [i % 2 ? { kind: WHO.people.one } : { kind: WHO.people.group, group: true }, 1];
    if (lid === "polaroid-stack" && LIFE_THEMES.has(tid) && i === count - 1) return [{ kind: WHO[tid].one, region: [0.2, 0.8, 0.12, 0.55] }, 1];
    if (lid === "collage-grid" && LIFE_THEMES.has(tid) && i === 0) return [{ kind: WHO[tid].one, region: [0.2, 0.8, 0.12, 0.6] }, 0.98];
    return null;
  };
  for (let i = 0; i < count; i++) {
    // the editor centre-crops these extra photos into their boxes, so the face must already be in view there
    const sp = spotAt(i), q = (sp && personFor(sp[0], sp[1], `${id}:more${i}`, ex, { cropOk: false })?.photo) || choose(th.topic, `${id}:more${i}`, ex);
    out.push(q); ex.push(q?.id);
  }
  return out;
}
/** The template's photo { photo, crop }: a person for a person spot (its face where the design leaves room for it; crop
 * when the centre crop cannot show it there), else the theme's photo. */
function templatePhoto(tool, lid, tid, id, aspect) {
  const th = THEMES[tid];
  const spot = id === "pe~passport~people" ? ID_SPOT : tool === PE ? peSpot(lid, tid, aspect) : tool === BR ? brSpot(lid, tid) : ieAiSpot(tool, lid, tid);
  // background-remover cut-outs in a shape are fitted around the face in the thumbnail; full-frame ones are cropped
  const r = spot && (tool === PE || (tool === BR && spot.region)) ? RATIO[aspect] || null : null;
  return (spot && personFor(spot, r, id)) || { photo: mainPhoto(tool, th, id), crop: null };
}
/** Build the recipe for an id like "pe~instant-photo~beach~p02" (tool~layout~theme[~palette]). */
function recipe(id) {
  const parts = String(id || "").split("~"), [pre, lid0, tid, pid] = parts, tool = PRE_TOOL[pre], d = TOOLS[tool];
  if (!d || parts.length > 4) return null;
  const extra = d.extra.find((x) => x.id === id);
  if (extra) { const th = THEMES[extra.theme], tp = templatePhoto(tool, extra.layout, extra.theme, id, extra.recipe.aspect); return { ...extra.recipe, id, tool, sample: th.sample, photo: tp.photo, ...(tp.crop ? { crop: tp.crop } : {}), theme: extra.theme, layout: extra.layout, layoutName: extra.name, themeName: th.label, name: extra.name, section: extra.section, tags: extra.tags }; }
  const lid = ALIAS_LAYOUT[lid0] || lid0;
  const Lx = d.layouts.find((x) => x.id === lid), th = THEMES[tid];
  if (!Lx || !th || !d.themes.includes(tid)) return null;
  const pal = d.pals && !Lx.fixed ? palById[pid] : null;
  if (d.pals && !Lx.fixed && !pal) return null;
  if ((Lx.fixed || !d.pals) && pid) return null;
  // photo-editor layouts give their crop shape from the build (it does not depend on the photo)
  const probe = tool === PE ? Lx.build({ th, p: pal, r: 1, photo: null, id, more: () => [null, null, null] }) : null;
  // crop: where the photo editor should crop a people photo so the face sits where the design leaves room for it (only
  // when its centre crop cannot); thumbnails and designSvg draw that crop
  const { photo, crop } = templatePhoto(tool, lid, tid, id, probe ? probe.aspect : Lx.aspect);
  const base = { id, tool, sample: th.sample, photo, ...(crop ? { crop } : {}), theme: tid, layout: lid, palette: pal?.id || null, layoutName: Lx.name, themeName: th.label };
  const ratioOf = (aspect) => RATIO[aspect] || (photo ? photo.w / photo.h : 1.5);
  if (tool === PE) {
    const r = ratioOf(probe.aspect);
    const c = { th, p: pal, r, photo, id, more: (k) => morePhotos(th, id, photo, k, lid, tid) };
    const b = Lx.build(c);
    return { ...base, kind: "look", ...b, name: `${Lx.name} · ${th.title} · ${pal.name}`, section: Lx.section, tags: [...Lx.tags, ...th.tags, pal.name.toLowerCase()] };
  }
  if (tool === BR) {
    const p = pal || PAL[0], r = ratioOf(Lx.aspect), thc = th.cutCopy ? { ...th, ...th.cutCopy } : th, c = { th: thc, p, r, photo };
    const overlays = Lx.texts ? Lx.texts(c) : [];
    return { ...base, themeName: thc.label, kind: "bg", bg: Lx.bg(p), aspect: Lx.aspect, frame: Lx.frame, overlays, clip: Lx.clip || "blob", cutShadow: !!Lx.shadow, cutOutline: !!Lx.outline,
      name: `${Lx.name}${pal ? " · " + pal.name : ""} · ${Lx.sampleLabel || thc.label}`, section: BACKS, tags: [...Lx.tags, ...thc.tags, pal ? pal.name.toLowerCase() : "background"] };
  }
  if (tool === IE) return { ...base, kind: "enhance", enhance: { ...Lx.enhance }, view: Lx.view, before: Lx.before, name: `${Lx.name} · ${th.label}`, section: ENH, tags: [...Lx.tags, ...th.tags] };
  return { ...base, kind: "ai", prompt: Lx.prompt, filter: Lx.filter, adjust: Lx.adjust, duotone: Lx.duotone, invert: Lx.invert, panel: Lx.panel, view: Lx.view, name: `${Lx.name} · ${th.label}`, section: IDEAS, tags: [...(Lx.tags || []), ...th.tags, "ai"] };
}
/** Every combination of one layout, in a mixed order (themes and palettes rotate), as ids. */
function combos(tool, Lx, l) {
  const d = TOOLS[tool], nT = d.themes.length, pals = d.pals && !Lx.fixed ? d.pals : [null], nP = pals.length, out = [];
  for (let r = 0; r < nT * nP; r++) {
    const q = Math.floor(r / nT), t = r % nT, th = d.themes[(t + l) % nT], pal = pals[(q + t + 5 * l) % nP];
    out.push(`${d.pre}~${Lx.id}~${th}${pal ? "~" + pal.id : ""}`);
  }
  return out;
}
/** The first COUNT distinct combinations, round-robin over the layouts (no run of one layout). */
function listFor(tool) {
  const d = TOOLS[tool], lists = d.layouts.map((Lx, l) => combos(tool, Lx, l)), out = [];
  for (const x of d.extra) out.push(x.id);
  for (let r = 0; out.length < COUNTS[tool]; r++) {
    let any = false;
    for (const ls of lists) if (r < ls.length) { any = true; out.push(ls[r]); if (out.length >= COUNTS[tool]) break; }
    if (!any) break;
  }
  // keep the fixed extras near the front but not first
  if (d.extra.length && out.length > 6) { const ex = out.splice(0, d.extra.length); out.splice(5, 0, ...ex); }
  return out;
}
const RECIPE_CACHE = new Map();
export const templateById = (id) => { if (!RECIPE_CACHE.has(id)) RECIPE_CACHE.set(id, recipe(id)); return RECIPE_CACHE.get(id); };
export const TEMPLATES = Object.keys(TOOLS).flatMap((tool) => listFor(tool).map((id) => { const r = templateById(id); return { id, name: r.name, tool, app: "photo", section: r.section, tags: r.tags, layout: r.layout, layoutName: r.layoutName, theme: r.theme, themeName: r.themeName, palette: r.palette }; }));
export const TOTAL = TEMPLATES.length;
export const LAYOUTS = Object.values(TOOLS).reduce((nn, d) => nn + d.layouts.length + d.extra.length, 0);
export const TOTALS = Object.fromEntries(Object.keys(TOOLS).map((t) => [t, TEMPLATES.filter((x) => x.tool === t).length]));
export const LAYOUTS_BY_TOOL = Object.fromEntries(Object.entries(TOOLS).map(([t, d]) => [t, d.layouts.length + d.extra.length]));
/** Which photo tool (slug) uses which editor mode. */
export const TOOL_MODE = { [PE]: "full", [BR]: "bg", [IE]: "enhance", [AI]: "ai" };
export const MODE_TOOL = { full: PE, bg: BR, enhance: IE, ai: AI };
/** Width ÷ height of a template's finished picture (its crop shape, or its photo's own shape). */
export const ratioOf = (t) => RATIO[t?.aspect] || (t?.photo ? t.photo.w / t.photo.h : 1.5);

/* ---------- drawing (thumbnails 320 × 200; designSvg for bigger previews) ---------- */
const nn = (v) => String(Math.round(v * 100) / 100);
/** The finished picture of a "look" template, W×H, before its frame. */
const idGuide = (W, H) => `<g fill="none" stroke="#fff" stroke-width="${nn(W * 0.008)}" stroke-dasharray="${nn(W * 0.03)} ${nn(W * 0.02)}" opacity=".9"><ellipse cx="${nn(W / 2)}" cy="${nn(H * 0.44)}" rx="${nn(W * 0.27)}" ry="${nn(H * 0.29)}"/><path d="M0 ${nn(H * 0.12)}H${nn(W)}M0 ${nn(H * 0.8)}H${nn(W)}"/></g>`;
function lookBody(k, t, W, H, size) {
  let s = lookPhoto(k, t, t.photo, 0, 0, W, H, size, { crop: t.crop });
  for (const o of t.overlays || []) s += overlaySvg(k, o, W, H, size);
  if (t.aspect === "passport") s += idGuide(W, H);
  return `<g${k.clipRect(0, 0, W, H)}>${s}</g>`;
}
/** The finished picture of a background template: backdrop, the subject (photo clipped to the backdrop's shape: the
 * cut-out look), its shadow / sticker outline, then the overlays. */
function bgBody(k, t, W, H, size) {
  const b = t.bg, ph = t.photo, pr = ph ? ph.w / ph.h : W / H;
  // the editor draws the backdrop at the photo's own shape, then crops to the template's shape: do the same
  let FW = W, FH = H; if (pr > W / H) FW = H * pr; else FH = W / pr;
  const ox = (W - FW) / 2, oy = (H - FH) / 2;
  let back = "";
  const [VW, VH] = popBox(FW, FH);
  if (b.mode === "color") back = `<rect width="${nn(W)}" height="${nn(H)}" fill="${b.color}"/>`;
  else if (b.mode === "transparent") back = `<rect width="${nn(W)}" height="${nn(H)}" fill="${k.pattern(12, 12, '<rect width="12" height="12" fill="#fff"/><rect width="6" height="6" fill="#dfe2ec"/><rect x="6" y="6" width="6" height="6" fill="#dfe2ec"/>')}"/>`;
  else if (b.mode === "blur") back = lookPhoto(k, { adjust: { blur: 70, exposure: 4 } }, ph, 0, 0, W, H, size);
  else if (b.backdrop?.kind === "pop") back = `<svg x="${nn(ox)}" y="${nn(oy)}" width="${nn(FW)}" height="${nn(FH)}" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none">${popBody(b.backdrop, VW, VH, k.id("p"))}</svg>`;
  else back = `<svg x="${nn(ox)}" y="${nn(oy)}" width="${nn(FW)}" height="${nn(FH)}" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">${backdropInner(b.backdrop, k.id("b"))}</svg>`;
  // the subject's outline in the full box
  const kx = FW / VW, m = Math.min(FW, FH);
  let d, box = null;
  const clip = t.clip || "blob", bd = b.backdrop?.kind === "pop" ? b.backdrop : null;
  const scaled = (dd) => `<path d="${dd}" transform="translate(${nn(ox)} ${nn(oy)}) scale(${nn(kx)})"/>`;
  // the shape's box (px), where a person's head and shoulders are fitted (popShape geometry, in the scaled pop box)
  const popBoxOf = (spec, grow) => {
    const cx = VW / 2, cy = VH * (spec.cy ?? 0.54), R = Math.min(VW, VH) * (spec.r ?? 0.36) * grow;
    const [hx, y0, y1] = spec.shape === "arch" ? [R * 0.85, cy - R * 1.25, VH] : spec.shape === "half" ? [R * 1.4, VH - R * 1.4, VH] : spec.shape === "square" ? [R * 0.875, cy - R * 0.875, cy + R * 0.875]
      : spec.shape === "diamond" ? [R * 1.25, cy - R * 1.25, cy + R * 1.25] : spec.shape === "blob" || !spec.shape ? [R * 1.1, cy - R * 1.1, cy + R * 1.1] : [R, cy - R, cy + R];
    return { x: ox + (cx - hx) * kx, y: oy + y0 * kx, w: 2 * hx * kx, h: (y1 - y0) * kx };
  };
  if (clip === "none") d = `<rect width="${nn(W)}" height="${nn(H)}"/>`;
  else if (bd && bd.shape !== "none" && ["circle", "blob", "arch", "diamond", "rounded"].includes(clip) && clip === (bd.shape === "square" ? "rounded" : bd.shape === "half" ? "arch" : bd.shape === "ring" || bd.shape === "stack" ? "circle" : bd.shape)) {
    d = scaled(popShape(bd, VW, VH, bd.shape === "half" ? 0.75 : 0.93)); box = popBoxOf(bd, bd.shape === "half" ? 0.75 : 0.93);
  } else if (clip === "ellipse") { d = `<ellipse cx="${nn(W / 2)}" cy="${nn(H * 0.55)}" rx="${nn(m * 0.36)}" ry="${nn(m * 0.42)}"/>`; box = { x: W / 2 - m * 0.36, y: H * 0.55 - m * 0.42, w: m * 0.72, h: m * 0.84 }; }
  else if (clip === "circle") { d = `<circle cx="${nn(W / 2)}" cy="${nn(H * 0.54)}" r="${nn(m * 0.34)}"/>`; box = { x: W / 2 - m * 0.34, y: H * 0.54 - m * 0.34, w: m * 0.68, h: m * 0.68 }; }
  else if (clip === "rect" || clip === "rounded") { d = `<rect x="${nn(W / 2 - m * 0.33)}" y="${nn(H * 0.54 - m * 0.33)}" width="${nn(m * 0.66)}" height="${nn(m * 0.66)}" rx="${nn(clip === "rounded" ? m * 0.08 : m * 0.01)}"/>`; box = { x: W / 2 - m * 0.33, y: H * 0.54 - m * 0.33, w: m * 0.66, h: m * 0.66 }; }
  else if (clip === "arch") { d = scaled(popShape({ shape: "arch", cy: 0.6 }, VW, VH, 0.93)); box = popBoxOf({ shape: "arch", cy: 0.6 }, 0.93); }
  else if (clip === "heart") { d = `<path d="${frameShapeD("heart", m * 0.7, m * 0.66)}" transform="translate(${nn(W / 2 - m * 0.35)} ${nn(H * 0.55 - m * 0.33)})"/>`; box = { x: W / 2 - m * 0.3, y: H * 0.55 - m * 0.2, w: m * 0.6, h: m * 0.5 }; }
  else { const sp = { shape: clip === "diamond" ? "diamond" : "blob", seed: 4 }; d = scaled(popShape(sp, VW, VH, 0.93)); box = popBoxOf(sp, 0.93); }
  const cid = k.id("c");
  k.defs.push(`<clipPath id="${cid}">${d}</clipPath>`);
  const shapeOnly = d.replace(/\/>$/, ` fill="#ffffff"/>`);
  let subj = "";
  if (t.cutShadow || b.shadow) subj += `<g opacity=".55"${k.blur(m * 0.025)} transform="translate(${nn(m * 0.02)} ${nn(m * 0.035)})"><g fill="#000">${shapeOnly.replace(/fill="#ffffff"/, 'fill="#000000"')}</g></g>`;
  if (t.cutOutline || b.outline) subj += `<g transform="translate(0 0)">${shapeOnly.replace(/\/>$/, ` stroke="#ffffff" stroke-width="${nn(m * 0.035)}" stroke-linejoin="round"/>`)}</g>`;
  // a person in a shape: the photo is placed so the face sits in the upper part of the shape and the shape is covered by
  // the head and shoulders (the editor's real cut-out keeps the whole person; this preview clips it to the shape)
  let px = clip === "none" ? 0 : ox, py = clip === "none" ? 0 : oy, pw = clip === "none" ? W : FW, phh = clip === "none" ? H : FH;
  if (box && isPerson(ph)) {
    const fx = Math.min(0.85, Math.max(0.15, ph.fx ?? 0.5)), fy = Math.min(0.7, Math.max(0.08, ph.fy ?? 0.3)), ar = ph.w / ph.h;
    const tx = box.x + box.w / 2, ty = box.y + box.h * 0.36;
    phh = Math.max(box.h * 1.25, (box.h * 0.38) / fy, (box.h * 0.66) / (1 - fy), box.w / (2 * fx * ar), box.w / (2 * (1 - fx) * ar));
    pw = phh * ar; px = tx - fx * pw; py = ty - fy * phh;
  }
  subj += `<g clip-path="url(#${cid})">${lookPhoto(k, { adjust: { vibrance: 10, clarity: 8 } }, ph, px, py, pw, phh, size, { crop: clip === "none" ? t.crop : null })}</g>`;
  let s = back + subj;
  for (const o of t.overlays || []) s += overlaySvg(k, o, W, H, size);
  if (t.aspect === "passport") s += idGuide(W, H);
  if (b.mode === "transparent") s += pillSvg(W * 0.05, H * 0.06, "PNG", m * 0.06, "#1b2133", "#ffffff");
  return `<g${k.clipRect(0, 0, W, H)}>${s}</g>`;
}
const pillSvg = (x, y, label, fs, bg, fg, anchor = "start") => { const w = em(label) * fs + fs * 1.3, h = fs * 1.9, x0 = anchor === "end" ? x - w : x; return `<rect x="${nn(x0)}" y="${nn(y)}" width="${nn(w)}" height="${nn(h)}" rx="${nn(h / 2)}" fill="${bg}"/><text x="${nn(x0 + w / 2)}" y="${nn(y + h / 2 + fs * 0.35)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${nn(fs)}" font-weight="700" fill="${fg}">${esc(label)}</text>`; };
const sparkle = (x, y, s, fill) => `<path d="M${nn(x)} ${nn(y - s)}l${nn(s * 0.24)} ${nn(s * 0.62)} ${nn(s * 0.62)} ${nn(s * 0.24)}-${nn(s * 0.62)} ${nn(s * 0.24)}-${nn(s * 0.24)} ${nn(s * 0.62)}-${nn(s * 0.24)}-${nn(s * 0.62)}-${nn(s * 0.62)}-${nn(s * 0.24)} ${nn(s * 0.62)}-${nn(s * 0.24)}z" fill="${fill}"/>`;
const BEFORE = { blur: { adjust: { saturation: -25, contrast: -18 }, blur: 2.4 }, noise: { adjust: { saturation: -20 }, blur: 0.7, noise: true }, old: { filter: ["old-fort", 100], adjust: { fade: 45, contrast: -25 }, blur: 1.2 }, soft: { adjust: { contrast: -20, saturation: -15 }, blur: 1.6 }, dark: { adjust: { exposure: -60, saturation: -35 }, blur: 0.8 }, dull: { adjust: { fade: 35, saturation: -45, contrast: -20 }, blur: 1 } };
const AFTER = { adjust: { contrast: 14, vibrance: 22, clarity: 20, exposure: 4 } };
/** Image enhancer card: the real photo before (blurry / noisy / faded / dark) and after (crisp), several layouts. */
function enhanceSvg(k, t, size) {
  const e = t.enhance, ph = t.photo, bf = BEFORE[t.before] || BEFORE.blur, badge = e.scale === 1 ? "Crisp" : e.scale + "×";
  const before = (x, y, w, h, clip = "") => { let s = lookPhoto(k, bf, ph, x, y, w, h, size, { face: true, extraBlur: bf.blur, clip }); if (bf.noise) { const fid = k.id("n"); k.defs.push(`<filter id="${fid}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="3"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1.2 -.35"/></filter>`); s += `<rect x="${nn(x)}" y="${nn(y)}" width="${nn(w)}" height="${nn(h)}" filter="url(#${fid})" opacity=".55"${clip}/>`; } return s; };
  const after = (x, y, w, h, clip = "") => lookPhoto(k, AFTER, ph, x, y, w, h, size, { face: true, clip });
  const label = (x, y, txt, dark = true, anchor = "start") => pillSvg(x, y, txt, 9, dark ? "rgba(17,20,33,.72)" : "#5b4cf0", "#ffffff", anchor);
  let s = `<rect width="320" height="200" fill="${k.lin(["#f3f4fa", "#e6e9f3"], 90)}"/>`;
  const X = 8, Y = 8, W = 304, H = 184;
  switch (t.view) {
    case "loupe": {
      s += after(X, Y, W, H) + `<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="10" fill="none"/>`;
      const cx = 222, cy = 92, R = 58, zid = k.id("z");
      k.defs.push(`<clipPath id="${zid}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>`);
      s += `<g clip-path="url(#${zid})">${after(cx - (cx - X) * 2.2, cy - (cy - Y) * 2.2, W * 2.2, H * 2.2)}</g><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#fff" stroke-width="5"${k.shadow(3, 10, 0.35)}/>`;
      s += `<path d="M${cx + R * 0.7} ${cy + R * 0.7}l26 26" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`;
      s += `<g opacity=".95">${before(18, 112, 96, 66, k.clipRect(18, 112, 96, 66, 8))}</g><rect x="18" y="112" width="96" height="66" rx="8" fill="none" stroke="#fff" stroke-width="2.5"/>` + label(24, 118, "Before") + label(cx, cy + R - 30, badge, false, "end");
      break;
    }
    case "diag": {
      const cl = k.clip(`<path d="M${X} ${Y}H${X + W * 0.62}L${X + W * 0.38} ${Y + H}H${X}Z"/>`);
      s += after(X, Y, W, H, k.clipRect(X, Y, W, H, 10)) + `<g>${before(X, Y, W, H, cl)}</g><path d="M${X + W * 0.62} ${Y}L${X + W * 0.38} ${Y + H}" stroke="#fff" stroke-width="4"/>`;
      s += label(16, 16, "Before") + label(304, 16, "After", false, "end") + pillSvg(16, 160, badge, 11, "#ffffff", "#5b4cf0");
      break;
    }
    case "cards": {
      s += `<g transform="rotate(-6 92 104)"><rect x="22" y="38" width="132" height="132" rx="6" fill="#fff"${k.shadow(4, 10, 0.25)}/>${before(30, 46, 116, 100, k.clipRect(30, 46, 116, 100, 3))}<text x="88" y="162" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#555">Before</text></g>`;
      s += `<g transform="rotate(4 228 100)"><rect x="150" y="18" width="156" height="164" rx="6" fill="#fff"${k.shadow(6, 14, 0.3)}/>${after(158, 26, 140, 130, k.clipRect(158, 26, 140, 130, 3))}<text x="228" y="172" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#5b4cf0">After · ${esc(badge)}</text></g>`;
      s += `<circle cx="150" cy="104" r="15" fill="#5b4cf0"${k.shadow(2, 6, 0.3)}/><path d="M144 104h11M151 99l5 5-5 5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    }
    case "rows": {
      s += before(X, Y, W, H / 2 - 2, k.clipRect(X, Y, W, H / 2 - 2, 8)) + after(X, Y + H / 2 + 2, W, H / 2 - 2, k.clipRect(X, Y + H / 2 + 2, W, H / 2 - 2, 8));
      s += label(16, 16, "Before") + label(16, Y + H / 2 + 10, "After", false) + pillSvg(304, 166, badge, 11, "#ffffff", "#5b4cf0", "end");
      break;
    }
    case "steps": {
      const ws = [70, 96, 122], xs = [10, 86, 188];
      ws.forEach((w, i) => { const h = w * 1.15, y = 186 - h; s += (i ? after : before)(xs[i], y, w, h, k.clipRect(xs[i], y, w, h, 6)) + pillSvg(xs[i] + 6, y + 6, ["Original", "2×", e.scale === 4 ? "4×" : "Sharp"][i], 8, i === 2 ? "#5b4cf0" : "rgba(17,20,33,.72)", "#fff"); });
      s += `<text x="12" y="26" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#1b2133">${esc(t.layoutName)}</text>`;
      break;
    }
    default: {
      s += `<g>${before(X, Y, W, H, k.clipRect(X, Y, W / 2, H, 0))}</g>` + after(X, Y, W, H, k.clipRect(X + W / 2, Y, W / 2, H, 0));
      s += `<rect x="158.5" y="${Y}" width="3" height="${H}" fill="#fff"/><circle cx="160" cy="100" r="13" fill="#fff"${k.shadow(2, 6, 0.3)}/><path d="M155 100l-4-4v8zM165 100l4-4v8z" fill="#1b2133"/>`;
      s += label(16, 16, "Before") + label(304, 16, "After", false, "end") + pillSvg(304, 162, badge, 11, "#ffffff", "#5b4cf0", "end");
    }
  }
  return s;
}
/** AI idea card: the result (made with the free tools until AI is on) + the prompt chip with a sparkle. */
function aiSvg(k, t, size) {
  const ph = t.photo, prompt = t.prompt.length > 42 ? t.prompt.slice(0, 40) + "…" : t.prompt;
  const look = t.panel ? { adjust: { vibrance: 12, clarity: 10 } } : t;
  const chip = (x, y, maxW = 292) => { const fs = 10.5, w = Math.min(maxW, em(prompt, "sans", true) * fs * 1.04 + 48); return `<g${k.shadow(3, 8, 0.25)}><rect x="${x}" y="${y}" width="${nn(w)}" height="30" rx="15" fill="#ffffff"/></g>${sparkle(x + 16, y + 15, 8, "#8b5cf6")}<text x="${x + 30}" y="${y + 19}" font-family="Arial,Helvetica,sans-serif" font-size="${fs}" font-weight="600" fill="#1b2133">${esc(prompt)}</text>`; };
  let s = `<rect width="320" height="200" fill="${k.lin(["#f5f3ff", "#ece9fb"], 90)}"/>`;
  if (t.panel === "bg") { s += `<rect x="8" y="8" width="304" height="184" rx="10" fill="#ffffff"/>` + `<g${k.shadow(8, 16, 0.25)}>${lookPhoto(k, look, ph, 100, 30, 120, 120, size, { face: true, clip: k.clip(`<path d="${frameShapeD("blob", 120, 120)}" transform="translate(100 30)"/>`) })}</g>` + chip(14, 156); return s; }
  switch (t.view) {
    case "split": {
      s += lookPhoto(k, { adjust: {} }, ph, 8, 8, 304, 184, size, { face: true, clip: k.clipRect(8, 8, 152, 184, 0) }) + lookPhoto(k, look, ph, 8, 8, 304, 184, size, { face: true, clip: k.clipRect(160, 8, 152, 184, 0) });
      s += `<rect x="158.5" y="8" width="3" height="184" fill="#fff"/>` + chip(14, 14) + sparkle(292, 170, 10, "#ffffff");
      break;
    }
    case "chat": {
      s += `<rect x="8" y="8" width="304" height="184" rx="12" fill="#ffffff"/>`;
      s += lookPhoto(k, { adjust: {} }, ph, 18, 18, 86, 64, size, { face: true, clip: k.clipRect(18, 18, 86, 64, 8) }) + `<path d="M112 50h22M128 44l6 6-6 6" stroke="#8b5cf6" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      s += `<g${k.shadow(6, 14, 0.28)}>${lookPhoto(k, look, ph, 142, 18, 160, 120, size, { face: true, clip: k.clipRect(142, 18, 160, 120, 10) })}</g>` + sparkle(290, 30, 9, "#ffffff");
      s += chip(18, 150, 284);
      break;
    }
    case "card": {
      s += `<g${k.shadow(8, 16, 0.25)}>${lookPhoto(k, look, ph, 40, 14, 240, 140, size, { face: true, clip: k.clipRect(40, 14, 240, 140, 12) })}</g>` + chip(24, 160, 272) + sparkle(266, 30, 11, "#ffffff") + sparkle(250, 46, 6, "#ffffff");
      break;
    }
    default: {
      s += lookPhoto(k, look, ph, 8, 8, 304, 184, size, { face: true, clip: k.clipRect(8, 8, 304, 184, 10) });
      s += `<g${k.shadow(4, 10, 0.3)}>${lookPhoto(k, { adjust: {} }, ph, 18, 18, 70, 52, size, { face: true, clip: k.clipRect(18, 18, 70, 52, 6) })}</g><rect x="18" y="18" width="70" height="52" rx="6" fill="none" stroke="#fff" stroke-width="2"/>` + pillSvg(22, 54, "Before", 7, "rgba(17,20,33,.72)", "#fff");
      s += chip(14, 154) + sparkle(292, 28, 11, "#ffffff") + sparkle(276, 44, 6, "#ffffff");
    }
  }
  if (t.panel === "erase") s += `<circle cx="214" cy="96" r="26" fill="#8b5cf6" opacity=".35"/><circle cx="214" cy="96" r="26" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 4"/>`;
  return s;
}
/** A look / background template as a card: the design at its own shape on a soft backdrop. */
function designCard(k, t, size) {
  const r = ratioOf(t), frame = t.frame;
  const p0 = borderPad(frame, r * 100, 100), w0 = r * 100 + p0.left + p0.right, h0 = 100 + p0.top + p0.bottom;
  const sc = Math.min(312 / w0, 190 / h0), W = r * 100 * sc, H = 100 * sc;
  const body = t.kind === "bg" ? bgBody(k, t, W, H, size) : lookBody(k, t, W, H, size);
  const fr = framed(k, frame, body, W, H), x = (320 - fr.w) / 2, y = (200 - fr.h) / 2;
  const shape = frame && /^(circle|heart|star|hexagon|arch|diamond|blob|rounded)$/.test(frame.id);
  return `<rect width="320" height="200" fill="${k.lin(["#f2f3f8", "#e5e8f0"], 90)}"/>` + (shape ? "" : `<rect x="${nn(x)}" y="${nn(y)}" width="${nn(fr.w)}" height="${nn(fr.h)}" fill="#1b2133"${k.shadow(3, 8, 0.28)}/>`) + `<g transform="translate(${nn(x)} ${nn(y)})">${fr.svg}</g>`;
}
const cache = new Map();
export function thumb(id) {
  if (cache.has(id)) return cache.get(id);
  const t = templateById(id);
  if (!t) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="#eef0f7"/></svg>';
  const k = kit(id, "photo-thumb");
  const body = t.kind === "enhance" ? enhanceSvg(k, t, "thumb") : t.kind === "ai" ? aiSvg(k, t, "thumb") : designCard(k, t, "thumb");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${esc(t.name)} template">${k.defs.length ? `<defs>${k.defs.join("")}</defs>` : ""}${body}</svg>`;
  if (cache.size > 600) cache.clear();
  cache.set(id, svg);
  return svg;
}
/** The finished design of a look / background template at w px wide with the full-size photo (previews, checks). */
export function designSvg(id, width = 1000) {
  const t = templateById(id);
  if (!t || (t.kind !== "look" && t.kind !== "bg")) return "";
  const k = kit(id, "photo-full"), r = ratioOf(t), W = width, H = width / r;
  const fr = framed(k, t.frame, t.kind === "bg" ? bgBody(k, t, W, H, "full") : lookBody(k, t, W, H, "full"), W, H);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${nn(fr.w)}" height="${nn(fr.h)}" viewBox="0 0 ${nn(fr.w)} ${nn(fr.h)}">${k.defs.length ? `<defs>${k.defs.join("")}</defs>` : ""}${fr.svg}</svg>`;
}
/** Library photo URL of a template ("full" for the editor). */
export const photoOf = (t, size = "full") => photoUrl(t?.photo, size);
