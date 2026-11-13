// Code generator template gallery (editor Templates panel + the /tools/code-generator intro page). Pure ES module, no DOM.
// Each template opens one of the widgets in widgets.js with designed starting options (colours, copy and, where a picture
// belongs, real photos from the shared library as "photo:<id>" values). Thumbnails are small finished previews of that
// widget in a browser or phone frame, drawn with the shared template kit (library "thumb" photos only).
import { kit, text, fit, rect, circle, line, mix, isDark, esc } from "../shared/tpl-kit.js";
import { photoOf, photoFor, photoUrl } from "./photos.js";

// Every widget id (same order as widgets.js); a template id is "<widget>" or "<widget>~<look>".
const WIDGET_IDS = ["countdown", "pricing", "faq", "contact", "whatsapp", "slider", "testimonials", "qr", "hours", "calculator", "tipzakat", "linkbio", "quiz", "timer", "flashcards", "converter", "hero", "product", "menu", "booking", "team", "stats", "newsletter"];

// Colour looks (ours). The first four are the original "second looks"; their ids stay valid.
export const LOOKS = {
  night: { name: "Night", accent: "#f59e0b", bg: "#111827", text: "#f9fafb", corners: "round" },
  mint: { name: "Mint", accent: "#059669", bg: "#ecfdf5", text: "#064e3b", corners: "soft" },
  rose: { name: "Rose", accent: "#e11d48", bg: "#fff1f2", text: "#4c0519", corners: "round" },
  ocean: { name: "Ocean", accent: "#0369a1", bg: "#f0f9ff", text: "#0c4a6e", corners: "square" },
  indigo: { name: "Indigo", accent: "#5b4cf0", bg: "#ffffff", text: "#141a33", corners: "soft" },
  coral: { name: "Coral", accent: "#f2552c", bg: "#fff8f4", text: "#2b1712", corners: "round" },
  forest: { name: "Forest", accent: "#1f7a4d", bg: "#f6faf3", text: "#14251a", corners: "soft" },
  gold: { name: "Gold", accent: "#d4a64a", bg: "#16130e", text: "#f8f1e3", corners: "soft" },
  plum: { name: "Plum", accent: "#8b2fc9", bg: "#fbf5ff", text: "#25112f", corners: "round" },
  sky: { name: "Sky", accent: "#0ea5e9", bg: "#ffffff", text: "#0b2a3a", corners: "round" },
  sand: { name: "Sand", accent: "#b4652e", bg: "#fbf6ee", text: "#2c241b", corners: "soft" },
};
// The original second looks: [widget, look, name, heading]. Every one still opens (some are listed below).
const ALT = [
  ["countdown", "night", "Course launch countdown", "Classes start in"], ["pricing", "mint", "Clinic price list", "Clinic visit prices"],
  ["faq", "ocean", "School FAQ", "Questions parents ask"], ["testimonials", "rose", "Salon reviews", "Our clients say"],
  ["slider", "night", "Portfolio slider", ""], ["hours", "mint", "Cafe opening hours", "Cafe hours"],
  ["contact", "rose", "Wedding RSVP form", "Will you join us?"], ["whatsapp", "ocean", "Support chat button", ""],
  ["qr", "night", "Menu QR card", "Scan for our menu"], ["linkbio", "rose", "Creator link page", ""],
  ["calculator", "ocean", "Shop calculator", "Shop calculator"], ["tipzakat", "mint", "Bill splitter", ""],
  ["quiz", "night", "Class quiz", "Science check"], ["flashcards", "rose", "Word flashcards", "New words"],
  ["timer", "mint", "Workout timer", "Plank timer"], ["converter", "ocean", "Kitchen converter", "Kitchen units"],
];

// Designed starters: look (colours) + options. A string "@words" becomes the best library photo for those words.
const PRESETS = {
  hero: { look: "sand", raw: { eyebrow: "Now open in Gulberg", title: "Fresh coffee, slow mornings", image: "@coffee cafe cup latte", layout: "split" } },
  "hero~night": { look: "night", raw: { eyebrow: "Launch week", title: "Your shop online by Friday", lead: "Pick a design, add your products and start taking orders on WhatsApp.", button: "Start free", button2: "See examples", facts: "2,400 shops live\n4.8 average rating\n24/7 help on WhatsApp", image: "@skyline city night", alt: "A city skyline at night", layout: "overlay" } },
  product: { look: "forest", raw: { image: "@cardamom spice" } },
  menu: { look: "gold", raw: { image: "@naan bread" } },
  booking: { look: "coral", raw: { image: "@restaurant dinner coffee espresso" } },
  team: { look: "indigo", raw: {} },
  stats: { look: "indigo", raw: { style: "photo", eyebrow: "Since 2015", image: "@modern office building", title: "Trusted by teams across Pakistan" } },
  newsletter: { look: "plum", raw: { image: "@fruit fruits fresh" } },
  countdown: { look: "coral", raw: { eyebrow: "Summer sale", image: "@dresses boutique fashion", title: "Our big sale ends in" } },
  "countdown~night": { raw: { eyebrow: "New batch", image: "@classroom lecture education", title: "Classes start in", note: "Seats are limited to 30 students.", button: "Reserve a seat" } },
  pricing: { look: "indigo", raw: {} },
  "pricing~mint": { raw: { lead: "Clear prices, no surprises. Reports on WhatsApp the same day.", currency: "Rs", badge: "Most booked", plans: [
    { name: "General visit", price: "1,500", period: "/visit", features: "15 minutes with a doctor\nPrescription on WhatsApp\nFollow-up in 7 days", button: "Book a visit", link: "#book", best: false },
    { name: "Family check-up", price: "6,500", period: "/4 people", features: "Full check-up for four\nBlood tests included\nReports the same day", button: "Book for family", link: "#family", best: true },
    { name: "Home visit", price: "4,000", period: "/visit", features: "A doctor at your door\nBasic tests at home\nEvenings and weekends", button: "Ask for a home visit", link: "#home", best: false },
  ] } },
  faq: { look: "sky", raw: { title: "Questions people ask" } },
  "faq~ocean": { raw: { items: [
    { q: "When does the school day start?", a: "Gates open at 7:30 am and classes start at 8:00 am, Monday to Friday." },
    { q: "Is there a school bus?", a: "Yes, three routes cover the city. Ask the office for the stops near you." },
    { q: "How do parents get report cards?", a: "Report cards are shared on the parent app and at the parent-teacher meeting each term." },
    { q: "Can my child join in the middle of the year?", a: "Yes, if a seat is free. We arrange a short assessment first." },
  ] } },
  testimonials: { look: "indigo", raw: { eyebrow: "Reviews", layout: "grid" } },
  "testimonials~rose": { raw: { eyebrow: "4.9 on Google", layout: "slider", items: [
    { quote: "Best haircut I have had in years. They listened and the colour is perfect.", name: "Mehwish T.", role: "Lahore", rating: 5 },
    { quote: "Calm salon, spotless tools and they always run on time.", name: "Zainab K.", role: "Karachi", rating: 5 },
    { quote: "My bridal makeup lasted the whole night. Thank you!", name: "Areeba S.", role: "Islamabad", rating: 5 },
    { quote: "Friendly staff and fair prices. I book every month.", name: "Noor F.", role: "Lahore", rating: 4 },
  ] } },
  slider: { look: "indigo", raw: { ratio: "16/9", slides: [
    { image: "@hunza valley", caption: "Hunza in spring", alt: "Hunza valley with mountains" },
    { image: "@passu cones", caption: "The Passu Cones", alt: "Sharp peaks of the Passu Cones" },
    { image: "@badshahi mosque", caption: "Lahore by night", alt: "Badshahi Mosque lit at night" },
  ] } },
  "slider~night": { raw: { ratio: "16/9", slides: [
    { image: "@skyline chicago", caption: "Lakeside towers", alt: "City skyline by a lake" },
    { image: "@bridge night", caption: "Bridges after dark", alt: "A lit bridge over a river at night" },
    { image: "@building modern office", caption: "Glass and light", alt: "A modern office building at blue hour" },
  ] } },
  hours: { look: "sand", raw: { title: "Opening hours", image: "@espresso coffee cup" } },
  "hours~mint": { raw: { image: "@tea plantation", note: "Fresh chai all day. Kitchen closes 30 minutes earlier." } },
  contact: { look: "indigo", raw: { title: "Let's talk", image: "@coworking office interior" } },
  "contact~rose": { raw: { lead: "Please reply by 20 December so we can save your seat.", subject: "RSVP for the wedding", phone: false, button: "Send my reply", image: "@wedding rings celebration" } },
  whatsapp: { look: "forest", raw: {} },
  qr: { look: "indigo", raw: {} },
  linkbio: { look: "coral", raw: { cover: "@naan bread" } },
  "linkbio~rose": { raw: { name: "Hira Studio", bio: "Hand-made candles and gifts.\nShips across Pakistan.", cover: "@lavender field flowers", links: [
    { label: "Shop the new collection", url: "https://example.com/shop" }, { label: "Order on WhatsApp", url: "https://wa.me/?text=Hi!" },
    { label: "Gift boxes for weddings", url: "https://example.com/gifts" }, { label: "Follow on Instagram", url: "https://example.com/instagram" },
  ] } },
  calculator: { look: "night", raw: {} },
  tipzakat: { look: "mint", raw: {} },
  quiz: { look: "indigo", raw: { image: "@chalkboard classroom" } },
  flashcards: { look: "plum", raw: {} },
  timer: { look: "coral", raw: {} },
  converter: { look: "sky", raw: {} },
};

// The gallery list: every widget once (photo-led website blocks first), then 9 second looks.
const S = { web: "Website blocks", wid: "Widgets for your website", con: "Contact and sharing", app: "Small apps", learn: "Learning and games" };
const LIST = [
  ["hero", "Hero banner with photo", S.web, ["landing", "header", "photo", "website"]],
  ["product", "Product card", S.web, ["shop", "price", "buy", "photo"]],
  ["menu", "Restaurant menu card", S.web, ["food", "cafe", "dishes", "prices"]],
  ["booking", "Table booking form", S.web, ["reservation", "appointment", "date", "form"]],
  ["stats", "Stats band", S.web, ["numbers", "counter", "about"]],
  ["team", "Team cards", S.web, ["people", "staff", "about us"]],
  ["newsletter", "Newsletter signup", S.web, ["email", "subscribe", "mailing list"]],
  ["hero~night", "Launch hero (dark)", S.web, ["landing", "launch", "night", "photo"]],
  ["countdown", "Sale countdown", S.wid, ["timer", "sale", "launch", "event", "clock"]],
  ["pricing", "Pricing table", S.wid, ["plans", "prices", "packages"]],
  ["testimonials", "Testimonial cards", S.wid, ["reviews", "stars", "customers"]],
  ["faq", "FAQ accordion", S.wid, ["questions", "answers", "help"]],
  ["slider", "Photo slider", S.wid, ["photos", "carousel", "gallery", "travel"]],
  ["hours", "Business hours", S.wid, ["opening times", "open now", "shop", "cafe"]],
  ["countdown~night", "Course launch countdown", S.wid, ["timer", "class", "school", "night"]],
  ["pricing~mint", "Clinic price list", S.wid, ["plans", "doctor", "clinic", "mint"]],
  ["testimonials~rose", "Salon reviews slider", S.wid, ["reviews", "slider", "salon", "rose"]],
  ["faq~ocean", "School FAQ", S.wid, ["questions", "school", "parents", "ocean"]],
  ["slider~night", "Portfolio slider", S.wid, ["photos", "carousel", "portfolio", "night"]],
  ["hours~mint", "Cafe opening hours", S.wid, ["opening times", "cafe", "tea", "mint"]],
  ["contact", "Contact form with photo", S.con, ["email", "form", "message"]],
  ["contact~rose", "Wedding RSVP form", S.con, ["rsvp", "wedding", "form", "rose"]],
  ["linkbio", "Link in bio page", S.con, ["links", "social", "bio"]],
  ["linkbio~rose", "Creator link page", S.con, ["links", "creator", "shop", "rose"]],
  ["whatsapp", "WhatsApp chat button", S.con, ["chat", "button", "support"]],
  ["qr", "QR code card", S.con, ["qr", "link", "wifi", "phone"]],
  ["calculator", "Simple calculator", S.app, ["calculator", "maths", "numbers"]],
  ["tipzakat", "Tip and zakat calculator", S.app, ["tip", "bill", "split", "zakat"]],
  ["timer", "Timer and stopwatch", S.app, ["timer", "stopwatch", "focus", "clock"]],
  ["converter", "Unit converter", S.app, ["units", "convert", "length", "weight", "temperature"]],
  ["quiz", "Quiz", S.learn, ["quiz", "questions", "score", "test", "school"]],
  ["flashcards", "Flashcards", S.learn, ["cards", "flip", "study", "learn", "school"]],
];
export const TEMPLATES = LIST.map(([id, name, section, tags]) => {
  const [w, look] = id.split("~");
  return { id, name, tool: "code-generator", section, tags: look ? [...tags] : tags, layout: w, widget: w, ...(look ? { look } : {}) };
});
export const TOTAL = TEMPLATES.length;
export const LAYOUTS = new Set(TEMPLATES.map((t) => t.widget)).size;

const photoize = (v, seed) => {
  if (typeof v === "string") return v.startsWith("@") ? photoFor(v.slice(1), seed) : v;
  if (Array.isArray(v)) return v.map((x, i) => photoize(x, seed + ":" + i));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, photoize(x, seed + ":" + k)]));
  return v;
};
/** { widget, raw } for a template id: the widget to open and the option values to start from. */
export function starter(id) {
  const s = String(id || ""), parts = s.split("~"), [w, look] = parts;
  if (!WIDGET_IDS.includes(w) || parts.length > 2 || (parts.length === 2 && !LOOKS[look])) return null;
  const P = PRESETS[s], L = LOOKS[look || P?.look];
  const raw = L ? { accent: L.accent, bg: L.bg, text: L.text, corners: L.corners } : {};
  const alt = ALT.find((x) => x[0] === w && x[1] === look);
  if (alt?.[3]) raw.title = alt[3];
  if (P?.raw) Object.assign(raw, photoize(P.raw, s));
  return { widget: w, raw };
}

/* ---------------------------------------------------------------- thumbnails */
const W0 = 320, H0 = 200;
const F = "Inter,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const colours = (o) => {
  const a = o.accent || "#5b4cf0", bg = o.bg || "#ffffff", ink = o.text || "#141a33", dark = isDark(bg);
  return { a, a2: mix(a, dark ? "#ffffff" : "#0b1020", 0.3), bg, ink, dark, soft: mix(a, bg, 0.88), muted: mix(ink, bg, 0.4), line: mix(ink, bg, 0.86), on: isDark(a) ? "#ffffff" : "#111827" };
};
const T1 = (x, y, s, o = {}) => text(x, y, s, { font: F, ...o });
const thumbPhoto = (v) => photoOf(v);
/** Fit one line of text into width w (shrinks down to min). */
const one = (x, y, s, w, o = {}) => { const f = fit(s, w, { size: o.size || 12, min: o.min || 6, maxLines: 1 }); return T1(x, y, f.lines, { ...o, size: f.size }); };
const stars = (x, y, n, s = 7) => T1(x, y, "★".repeat(n) + "☆".repeat(5 - n), { size: s, fill: "#f5a524", weight: 700, ls: 1 });
const btn = (k, c, x, y, label, { w, h = 13, size = 6.5, ghost = false, anchor = "start", fill } = {}) => {
  const bw = w || label.length * size * 0.6 + 16, x0 = anchor === "middle" ? x - bw / 2 : x;
  return rect(x0, y, bw, h, ghost ? "none" : fill || k.lin([c.a, c.a2], 0), h / 2, ghost ? ` stroke="${c.line}" stroke-width="1"` : (fill ? "" : k.shadow(3, 6, 0.25, c.a))) + T1(x0 + bw / 2, y + h / 2 + size * 0.36, label, { size, weight: 800, fill: ghost ? c.ink : fill ? c.a : c.on, anchor: "middle" });
};
const pill = (x, y, label, fillc, ink, size = 5.5) => { const w = label.length * size * 0.66 + 10; return rect(x, y, w, size * 2.1, fillc, size * 1.05) + T1(x + w / 2, y + size * 1.45, label.toUpperCase(), { size, weight: 800, fill: ink, anchor: "middle", ls: 0.4 }); };

/** Backdrop + browser window; draw(R) paints the page inside R (clipped). */
function browserScene(k, c, url, draw) {
  const back = c.dark ? k.lin([mix(c.bg, "#000000", 0.2), mix(c.a, c.bg, 0.75)], 120) : k.lin([mix(c.a, "#ffffff", 0.78), mix(c.a2, "#ffffff", 0.9)], 120);
  let s = rect(0, 0, W0, H0, back) + k.blob(286, 18, 46, c.a, { ex: ' opacity=".22"' }) + k.blob(26, 190, 40, c.a2, { ex: ' opacity=".18"' });
  const b = k.browser(14, 12, 292, 182, { dark: c.dark, url });
  const R = { x: 14, y: b.top, w: 292, h: 194 - b.top };
  const clip = k.clip(`<path d="M${R.x} ${R.y.toFixed(1)}H${R.x + R.w}V${R.y + R.h - 10}a10 10 0 0 1 -10 10H${R.x + 10}a10 10 0 0 1 -10 -10Z"/>`);
  s += b.svg + `<g${clip}>` + rect(R.x, R.y, R.w, R.h, c.bg) + draw(R) + `</g>`;
  return s;
}
/** Promo card: gradient background, big headline on the left, a phone on the right; draw(S) paints the screen. */
function phoneScene(k, c, head, sub, draw) {
  let s = rect(0, 0, W0, H0, k.lin([c.a, c.a2], 135)) + rect(0, 0, W0, H0, k.dots("#ffffff", 12, 1, 0.16)) + k.blob(70, 196, 70, "#ffffff", { ex: ' opacity=".12"' });
  const f = fit(head, 150, { size: 25, min: 13, maxLines: 3 });
  s += text(18, 46 + f.size * 0.8, f.lines, { size: f.size, weight: 900, fill: "#ffffff", font: F, lh: 1.02 });
  const yy = 46 + f.size * 0.8 + (f.lines.length - 1) * f.size * 1.02 + 16;
  if (sub) s += text(18, yy, fit(sub, 150, { size: 8.5, maxLines: 2 }).lines, { size: 8.5, weight: 600, fill: "#ffffff", opacity: 0.85, font: F, lh: 1.3 });
  const ph = k.phone(196, 16, 104, 206, { color: "#0b0b12" });
  s += ph.svg + `<g${k.clipRect(ph.x, ph.y, ph.w, ph.h, ph.rx)}>` + rect(ph.x, ph.y, ph.w, ph.h, c.bg) + draw(ph) + `</g>` + k.phoneNotch(ph.x, ph.y, ph.w);
  return s;
}

const BIOS = ["Twelve years in hotel kitchens before opening her own.", "Keeps every order on time and suppliers honest.", "Answers your WhatsApp messages within minutes.", "Knows every street of the city by heart."];
const ART = {
  hero(k, c, o) {
    const p = thumbPhoto(o.image);
    if (o.layout === "overlay") return browserScene(k, c, "yourshop.pk", (R) => k.photo(p, R.x, R.y, R.w, R.h) + k.scrim(R.x, R.y, R.w, R.h, "#05070f", 0.15, 0.92)
      + pill(R.x + 18, R.y + 30, o.eyebrow || "Launch", c.a, c.on) + text(R.x + 18, R.y + 66, fit(o.title, 230, { size: 26, min: 14, maxLines: 2 }).lines, { size: fit(o.title, 230, { size: 26, min: 14, maxLines: 2 }).size, weight: 900, fill: "#ffffff", font: F, lh: 1 })
      + btn(k, c, R.x + 18, R.y + 116, o.button || "Start free") + btn(k, { ...c, ink: "#ffffff", line: "#ffffffaa" }, R.x + 80, R.y + 116, o.button2 || "See examples", { ghost: true })
      + ["2,400|shops live", "4.8|rating", "24/7|help"].map((t, i) => { const [n, l] = t.split("|"); return T1(R.x + 18 + i * 62, R.y + 152, n, { size: 11, weight: 900, fill: "#ffffff" }) + T1(R.x + 18 + i * 62, R.y + 160, l, { size: 5.5, fill: "#ffffff", opacity: 0.75 }); }).join(""));
    return browserScene(k, c, "freshbrew.pk", (R) => {
      const f = fit(o.title || "Fresh coffee, slow mornings", 150, { size: 22, min: 12, maxLines: 3 });
      let s = rect(R.x, R.y, R.w, R.h, k.rad([[c.soft, 1], [c.bg, 0]], 0.1, 0.1, 0.8)) + pill(R.x + 16, R.y + 18, o.eyebrow || "Now open", c.soft, c.a);
      s += text(R.x + 16, R.y + 38 + f.size * 0.8, f.lines, { size: f.size, weight: 900, fill: c.ink, font: F, lh: 1 });
      const ty = R.y + 38 + f.size * 0.8 + (f.lines.length - 1) * f.size + 12;
      s += text(R.x + 16, ty, fit("Beans roasted every week and warm bread from 8 am.", 145, { size: 6.5, maxLines: 2 }).lines, { size: 6.5, fill: c.muted, font: F, lh: 1.35 });
      s += btn(k, c, R.x + 16, ty + 16, "See the menu") + btn(k, c, R.x + 82, ty + 16, "Find us", { ghost: true });
      s += line(R.x + 16, ty + 40, R.x + 160, ty + 40, c.line, 0.8) + ["4.9|rating", "12k|cups", "7|days"].map((t, i) => { const [n, l] = t.split("|"); return T1(R.x + 16 + i * 46, ty + 54, n, { size: 10, weight: 900, fill: c.ink }) + T1(R.x + 16 + i * 46, ty + 62, l, { size: 5, fill: c.muted }); }).join("");
      s += rect(R.x + 190, R.y + 26, 90, 124, k.lin([c.a, c.a2], 135), 14) + k.photo(p, R.x + 176, R.y + 14, 92, 126, { rx: 12 });
      return s;
    });
  },
  product(k, c, o) {
    return browserScene(k, c, "spicebox.pk/shop", (R) => {
      const p = thumbPhoto(o.image);
      let s = rect(R.x, R.y, R.w, R.h, c.soft) + k.card(R.x + 14, R.y + 12, R.w - 28, R.h - 24, { fill: c.bg, rx: 12, sh: [6, 14, 0.2] });
      s += k.photo(p, R.x + 14, R.y + 12, 120, R.h - 24, { rx: 12 }) + pill(R.x + 22, R.y + 20, "Bestseller", c.a, c.on);
      const X = R.x + 146;
      s += T1(X, R.y + 30, "SPICES · 250 G", { size: 5.5, weight: 800, fill: c.a, ls: 0.6 });
      s += text(X, R.y + 46, fit("Green cardamom, hand-sorted", 120, { size: 13, min: 8, maxLines: 2 }).lines, { size: 12, weight: 900, fill: c.ink, font: F, lh: 1.05 });
      s += stars(X, R.y + 76, 5) + T1(X + 42, R.y + 76, "4.8 · 212 reviews", { size: 5.5, fill: c.muted });
      s += T1(X, R.y + 100, "Rs 1,450", { size: 17, weight: 900, fill: c.ink, ls: -0.4 }) + T1(X + 86, R.y + 100, "Rs 1,800", { size: 6.5, fill: c.muted, ex: ' text-decoration="line-through"' });
      s += rect(X, R.y + 106, 34, 9, "#dcfce7", 4.5) + T1(X + 17, R.y + 112.3, "Save 19%", { size: 4.8, weight: 800, fill: "#166534", anchor: "middle" });
      s += ["Free delivery over Rs 3,000", "Cash on delivery"].map((t, i) => T1(X, R.y + 126 + i * 9, "✓  " + t, { size: 5.5, fill: c.ink })).join("");
      s += btn(k, c, X, R.y + 140, "Order on WhatsApp", { w: 116, h: 14 });
      return s;
    });
  },
  menu(k, c, o) {
    return browserScene(k, c, "karachikitchen.pk/menu", (R) => {
      const p = thumbPhoto(o.image), X = R.x + 46, Wd = R.w - 92;
      let s = rect(R.x, R.y, R.w, R.h, mix(c.bg, "#000000", 0.1)) + k.card(X, R.y + 8, Wd, R.h + 20, { fill: c.bg, rx: 12, sh: [8, 18, 0.45] });
      s += `<g${k.clipRect(X, R.y + 8, Wd, 64, 12)}>` + k.photo(p, X, R.y + 8, Wd, 70) + k.scrim(X, R.y + 8, Wd, 70, "#0a0806", 0.05, 0.9) + `</g>`;
      s += pill(X + 12, R.y + 22, "Served 6 to 11 pm", c.a, c.on, 4.6) + T1(X + 12, R.y + 60, "Tonight's menu", { size: 17, weight: 900, fill: "#ffffff", ls: -0.3 });
      const dishes = [["Chicken karahi", "1,850", "Chef's pick"], ["Daal makhani", "750", "Veg"], ["Seekh kebab platter", "1,200", ""], ["Garlic naan", "180", ""], ["Mango lassi", "350", "New"]];
      dishes.forEach(([n, pr, tag], i) => {
        const y = R.y + 88 + i * 16;
        s += T1(X + 12, y, n, { size: 7, weight: 800, fill: c.ink });
        const nw = n.length * 7 * 0.58;
        if (tag) s += rect(X + 16 + nw, y - 6, tag.length * 3.4 + 6, 7.5, c.soft, 3.7) + T1(X + 19 + nw + tag.length * 1.7, y - 0.6, tag.toUpperCase(), { size: 4, weight: 800, fill: c.a, anchor: "middle" });
        s += line(X + 24 + nw + (tag ? tag.length * 3.4 + 8 : 0), y - 1.5, X + Wd - 40, y - 1.5, c.line, 1, ' stroke-dasharray="1 2"');
        s += T1(X + Wd - 12, y, "Rs " + pr, { size: 7, weight: 900, fill: c.a, anchor: "end" });
      });
      return s;
    });
  },
  booking(k, c, o) {
    return browserScene(k, c, "olivetable.pk/book", (R) => {
      const p = thumbPhoto(o.image);
      let s = rect(R.x, R.y, R.w, R.h, c.soft) + k.card(R.x + 12, R.y + 10, R.w - 24, R.h - 20, { fill: c.bg, rx: 12, sh: [6, 14, 0.22] });
      s += k.photo(p, R.x + 12, R.y + 10, 104, R.h - 20, { rx: 12 }) + rect(R.x + 12, R.y + 10, R.w - 24, 4, k.lin([c.a, c.a2], 0), 2);
      const X = R.x + 128, fw = R.w - 156;
      s += T1(X, R.y + 34, "Book your table", { size: 14, weight: 900, fill: c.ink, ls: -0.3 }) + T1(X, R.y + 45, "We confirm by phone within the hour.", { size: 5.5, fill: c.muted });
      const field = (x, y, w, lab, val) => T1(x, y, lab, { size: 5, weight: 800, fill: c.ink }) + rect(x, y + 3, w, 13, c.bg, 4, ` stroke="${c.line}"`) + T1(x + 5, y + 11.5, val, { size: 5.5, fill: c.muted });
      s += field(X, R.y + 58, fw, "What would you like?", "Dinner  ▾");
      s += field(X, R.y + 82, fw * 0.36, "Date", "Fri 14 Nov") + field(X + fw * 0.39, R.y + 82, fw * 0.3, "Time", "8:00 pm") + field(X + fw * 0.72, R.y + 82, fw * 0.28, "People", "4");
      s += field(X, R.y + 106, fw * 0.48, "Your name", "Hamza R.") + field(X + fw * 0.52, R.y + 106, fw * 0.48, "Phone", "0300 1234567");
      s += btn(k, c, X, R.y + 132, "Request booking", { w: fw, h: 14 });
      return s;
    });
  },
  stats(k, c, o) {
    return browserScene(k, c, "nimbus.pk/about", (R) => {
      const p = thumbPhoto(o.image);
      let s = (p ? k.photo(p, R.x, R.y, R.w, R.h) + rect(R.x, R.y, R.w, R.h, k.lin([["#080a18", 0.5], ["#080a18", 0.9]], 90)) : rect(R.x, R.y, R.w, R.h, k.lin([c.a, c.a2], 135)));
      s += pill(R.x + R.w / 2 - 22, R.y + 20, o.eyebrow || "Since 2015", "#ffffff33", "#ffffff", 5);
      s += T1(R.x + R.w / 2, R.y + 52, fit(o.title || "Numbers we are proud of", 250, { size: 15, min: 9, maxLines: 1 }).lines[0], { size: fit(o.title || "Numbers we are proud of", 250, { size: 15, min: 9, maxLines: 1 }).size, weight: 900, fill: "#ffffff", anchor: "middle", ls: -0.3 });
      [["12,000+", "Happy customers"], ["98%", "Orders on time"], ["4.9", "Average rating"], ["35", "Cities"]].forEach(([n, l], i) => {
        const x = R.x + 40 + i * 71;
        if (i) s += line(x - 36, R.y + 84, x - 36, R.y + 126, "#ffffff", 0.6, ' opacity=".3"');
        s += T1(x, R.y + 110, n, { size: n.length > 5 ? 15 : 19, weight: 900, fill: "#ffffff", anchor: "middle", ls: -0.6 }) + T1(x, R.y + 124, l, { size: 5.5, weight: 700, fill: "#ffffff", opacity: 0.8, anchor: "middle" });
      });
      return s;
    });
  },
  team(k, c) {
    return browserScene(k, c, "nimbus.pk/team", (R) => {
      let s = pill(R.x + R.w / 2 - 20, R.y + 12, "Our people", c.soft, c.a, 4.8) + T1(R.x + R.w / 2, R.y + 40, "Meet the team", { size: 16, weight: 900, fill: c.ink, anchor: "middle", ls: -0.4 });
      [["Ayesha Khan", "FOUNDER"], ["Omar Siddiqui", "OPERATIONS"], ["Sara Malik", "CUSTOMER CARE"], ["Bilal Ahmed", "DELIVERY LEAD"]].forEach(([n, r], i) => {
        const x = R.x + 12 + i * 69, y = R.y + 54;
        s += k.card(x, y, 62, 100, { fill: c.bg, rx: 9, sh: [4, 10, 0.18], stroke: c.line });
        s += `<g${k.clipRect(x, y, 62, 30, 9)}>` + rect(x, y, 62, 30, k.lin([c.a, c.a2], 135)) + rect(x, y, 62, 30, k.dots("#ffffff", 6, 0.6, 0.3)) + `</g>`;
        s += circle(x + 31, y + 32, 15, "#ffffff") + circle(x + 31, y + 32, 13, k.lin([c.a2, c.a], 135)) + T1(x + 31, y + 36, n.split(" ").map((w) => w[0]).join(""), { size: 9, weight: 900, fill: c.on, anchor: "middle" });
        s += T1(x + 31, y + 60, n, { size: 5.8, weight: 800, fill: c.ink, anchor: "middle" }) + T1(x + 31, y + 68, r, { size: 3.8, weight: 800, fill: c.a, anchor: "middle", ls: 0.3 });
        s += text(x + 31, y + 79, fit(BIOS[i], 52, { size: 4.3, min: 3.5, maxLines: 3 }).lines, { size: 4.3, fill: c.muted, anchor: "middle", font: F, lh: 1.35 });
      });
      return s;
    });
  },
  newsletter(k, c, o) {
    return browserScene(k, c, "greengrocer.pk", (R) => {
      const p = thumbPhoto(o.image);
      let s = rect(R.x, R.y, R.w, R.h, c.soft) + k.card(R.x + 12, R.y + 10, R.w - 24, R.h - 20, { fill: c.bg, rx: 12, sh: [6, 14, 0.2] });
      s += k.photo(p, R.x + 12, R.y + 10, 110, R.h - 20, { rx: 12 });
      const X = R.x + 134;
      s += pill(X, R.y + 22, "Every Friday", c.soft, c.a, 4.8);
      s += text(X, R.y + 50, ["Get our best", "deals first"], { size: 14, weight: 900, fill: c.ink, font: F, lh: 1.02 });
      s += ["Early access to every sale", "A free recipe card each month", "No spam; leave any time"].map((t, i) => circle(X + 4, R.y + 81 + i * 11, 3.6, k.lin([c.a, c.a2], 135)) + circle(X + 4, R.y + 81 + i * 11, 1, "#ffffff") + T1(X + 12, R.y + 83 + i * 11, t, { size: 5.6, weight: 600, fill: c.ink })).join("");
      s += rect(X, R.y + 118, 136, 18, c.bg, 9, ` stroke="${c.line}"` + k.shadow(3, 6, 0.12)) + T1(X + 8, R.y + 129.5, "you@example.com", { size: 5.5, fill: c.muted }) + btn(k, c, X + 86, R.y + 120.5, "Subscribe", { w: 47, h: 13 });
      s += T1(X, R.y + 146, "We never share your email address.", { size: 4.8, fill: c.muted });
      return s;
    });
  },
  countdown(k, c, o) {
    const p = thumbPhoto(o.image);
    return browserScene(k, c, "yourshop.pk/sale", (R) => {
      let s = p ? k.photo(p, R.x, R.y, R.w, R.h) + rect(R.x, R.y, R.w, R.h, k.lin([["#080a18", 0.35], ["#080a18", 0.88]], 90)) : rect(R.x, R.y, R.w, R.h, k.lin([c.soft, c.bg], 90));
      const ink = p ? "#ffffff" : c.ink;
      if (o.eyebrow) { const w = o.eyebrow.length * 3.6 + 14; s += pill(R.x + R.w / 2 - w / 2, R.y + 16, o.eyebrow, c.a, c.on, 5.2); }
      s += T1(R.x + R.w / 2, R.y + 50, fit(o.title, 250, { size: 17, min: 9, maxLines: 1 }).lines[0], { size: fit(o.title, 250, { size: 17, min: 9, maxLines: 1 }).size, weight: 900, fill: ink, anchor: "middle", ls: -0.4 });
      ["02", "14", "37", "09"].forEach((n, i) => {
        const x = R.x + 40 + i * 55;
        s += rect(x, R.y + 64, 46, 50, p ? "#ffffff" : c.bg, 9, p ? ' fill-opacity=".14" stroke="#ffffff" stroke-opacity=".35"' : ` stroke="${c.line}"` + k.shadow(4, 8, 0.15));
        s += T1(x + 23, R.y + 96, n, { size: 21, weight: 900, fill: p ? "#ffffff" : c.a, anchor: "middle", ls: -0.6 }) + T1(x + 23, R.y + 107, ["DAYS", "HOURS", "MINUTES", "SECONDS"][i], { size: 4.2, weight: 800, fill: ink, opacity: 0.75, anchor: "middle", ls: 0.4 });
      });
      s += btn(k, c, R.x + R.w / 2, R.y + 128, o.button || "Shop the sale", { anchor: "middle", h: 14, size: 6.5 });
      return s;
    });
  },
  pricing(k, c, o) {
    return browserScene(k, c, "nimbus.pk/pricing", (R) => {
      let s = rect(R.x, R.y, R.w, R.h, k.rad([[c.soft, 1], [c.bg, 0]], 0.5, 0, 0.9));
      s += T1(R.x + R.w / 2, R.y + 26, fit(o.title || "Simple, honest prices", 240, { size: 15, maxLines: 1 }).lines[0], { size: 15, weight: 900, fill: c.ink, anchor: "middle", ls: -0.4 });
      const plans = o.plans || [{ name: "Starter", price: "Free", period: "", features: "1 user\nBasic support\nMonthly tips" }, { name: "Standard", price: "1,500", period: "/month", features: "5 users\nPriority support\nMonthly report" }, { name: "Business", price: "4,000", period: "/month", features: "Unlimited users\nPhone support\nHelp with setup" }];
      plans.slice(0, 3).forEach((pl, i) => {
        const best = i === 1, x = R.x + 18 + i * 88, y = R.y + (best ? 38 : 46), h = best ? 122 : 108;
        s += best ? rect(x, y, 80, h, k.lin([c.a, c.a2], 160), 10, k.shadow(8, 14, 0.35, c.a)) : k.card(x, y, 80, h, { fill: c.bg, rx: 10, sh: [4, 10, 0.12], stroke: c.line });
        const ink = best ? c.on : c.ink;
        if (best) s += rect(x + 10, y - 5, 40, 10, c.ink, 5) + T1(x + 30, y + 1.8, (o.badge || "Most popular").slice(0, 12), { size: 4.4, weight: 800, fill: c.bg, anchor: "middle" });
        s += T1(x + 9, y + 18, pl.name.toUpperCase().slice(0, 15), { size: 5, weight: 800, fill: ink, ls: 0.5 });
        s += T1(x + 9, y + 40, (/\d/.test(pl.price) ? "Rs " : "") + pl.price, { size: /\d/.test(pl.price) && pl.price.length > 4 ? 13 : 15, weight: 900, fill: ink, ls: -0.4 }) + T1(x + 9, y + 49, pl.period || "forever", { size: 5, fill: ink, opacity: 0.7 });
        s += String(pl.features || "").split("\n").slice(0, 3).map((f, j) => T1(x + 9, y + 64 + j * 9, "✓", { size: 5.5, weight: 900, fill: best ? c.on : c.a }) + T1(x + 16, y + 64 + j * 9, fit(f, 58, { size: 4.8, min: 3.6, maxLines: 1 }).lines[0], { size: fit(f, 58, { size: 4.8, min: 3.6, maxLines: 1 }).size, weight: 600, fill: ink, opacity: best ? 0.92 : 0.8 })).join("");
        s += rect(x + 9, y + h - 20, 62, 12, best ? c.bg : "none", 6, best ? "" : ` stroke="${c.line}"`) + T1(x + 40, y + h - 12, best ? "Choose" : "Start", { size: 5.5, weight: 800, fill: best ? c.ink : c.ink, anchor: "middle" });
      });
      return s;
    });
  },
  testimonials(k, c, o) {
    return browserScene(k, c, "nimbus.pk/reviews", (R) => {
      const items = o.items || [{ quote: "Fast delivery and the food was still warm.", name: "Sana R.", role: "Lahore" }, { quote: "They fixed my phone screen in one hour.", name: "Bilal A.", role: "Karachi" }, { quote: "Clear prices and quick replies on WhatsApp.", name: "Hina K.", role: "Islamabad" }];
      let s = rect(R.x, R.y, R.w, R.h, k.lin([c.soft, c.bg], 90));
      if (o.eyebrow) s += pill(R.x + R.w / 2 - (o.eyebrow.length * 3.3 + 10) / 2, R.y + 10, o.eyebrow, c.soft, c.a, 5);
      s += T1(R.x + R.w / 2, R.y + 40, fit(o.title || "What our customers say", 250, { size: 15, maxLines: 1 }).lines[0], { size: 15, weight: 900, fill: c.ink, anchor: "middle", ls: -0.4 });
      const slider = o.layout === "slider", cw = slider ? 108 : 86, x0 = slider ? R.x + 14 : R.x + 13;
      items.slice(0, slider ? 3 : 3).forEach((t, i) => {
        const x = x0 + i * (cw + 8), y = R.y + 52;
        s += k.card(x, y, cw, 92, { fill: c.bg, rx: 9, sh: [5, 12, 0.16], stroke: c.line }) + T1(x + cw - 8, y + 24, "“", { size: 26, weight: 900, fill: c.a, opacity: 0.18, anchor: "end", font: "Georgia,serif" });
        s += stars(x + 8, y + 14, t.rating || 5, 6.5);
        s += text(x + 8, y + 28, fit(t.quote, cw - 16, { size: 6, min: 5, maxLines: 4 }).lines, { size: 6, weight: 600, fill: c.ink, font: F, lh: 1.4 });
        s += line(x + 8, y + 68, x + cw - 8, y + 68, c.line, 0.6) + circle(x + 15, y + 80, 6.5, k.lin([c.a, c.a2], 135)) + T1(x + 15, y + 82.3, t.name.split(" ").map((w) => w[0]).join("").slice(0, 2), { size: 5, weight: 900, fill: c.on, anchor: "middle" });
        s += T1(x + 25, y + 79, t.name, { size: 5.5, weight: 800, fill: c.ink }) + T1(x + 25, y + 86, t.role || "", { size: 4.6, fill: c.muted });
      });
      if (slider) s += [-1, 1].map((d) => circle(R.x + R.w / 2 + d * 12, R.y + 155, 7, c.bg, ` stroke="${c.line}"`) + T1(R.x + R.w / 2 + d * 12, R.y + 158, d < 0 ? "‹" : "›", { size: 9, weight: 900, fill: c.ink, anchor: "middle" })).join("");
      return s;
    });
  },
  faq(k, c, o) {
    return browserScene(k, c, "help.nimbus.pk", (R) => {
      const items = o.items || [{ q: "How do I place an order?", a: "Send us a message on WhatsApp or use the contact form. We reply within a few hours." }, { q: "Do you deliver?" }, { q: "Can I pay cash on delivery?" }, { q: "Can I return an item?" }];
      let s = rect(R.x, R.y, R.w, R.h, k.lin([c.soft, c.bg], 90)) + rect(R.x + 40, R.y + 8, R.w - 80, R.h, c.bg, 10, k.shadow(6, 14, 0.18)) + rect(R.x + 40, R.y + 8, R.w - 80, 4, k.lin([c.a, c.a2], 0), 2);
      const X = R.x + 54, Wd = R.w - 108;
      s += T1(X, R.y + 34, fit(o.title || "Questions people ask", Wd, { size: 14, maxLines: 1 }).lines[0], { size: 14, weight: 900, fill: c.ink, ls: -0.3 });
      let y = R.y + 44;
      items.slice(0, 4).forEach((it, i) => {
        const open = i === 0, h = open ? 38 : 19;
        s += rect(X, y, Wd, h, c.bg, 6, ` stroke="${open ? c.a : c.line}"`) + T1(X + 8, y + 12, fit(it.q, Wd - 34, { size: 6.6, min: 5, maxLines: 1 }).lines[0], { size: 6.6, weight: 800, fill: c.ink });
        s += circle(X + Wd - 11, y + 9.5, 5.5, open ? k.lin([c.a, c.a2], 135) : c.soft) + T1(X + Wd - 11, y + 12, open ? "–" : "+", { size: 8, weight: 900, fill: open ? c.on : c.a, anchor: "middle" });
        if (open) s += text(X + 8, y + 23, fit(it.a || "", Wd - 20, { size: 5.6, maxLines: 2 }).lines, { size: 5.6, fill: c.muted, font: F, lh: 1.35 });
        y += h + 5;
      });
      return s;
    });
  },
  slider(k, c, o) {
    return browserScene(k, c, "nimbus.pk/gallery", (R) => {
      const sl = o.slides || [], p = thumbPhoto(sl[0]?.image), p2 = thumbPhoto(sl[1]?.image);
      let s = rect(R.x, R.y, R.w, R.h, c.dark ? c.bg : c.soft);
      if (p2) s += k.photo(p2, R.x + 214, R.y + 18, 70, 130, { rx: 8, opacity: 0.55 });
      s += k.photo(p, R.x + 14, R.y + 12, 216, 140, { rx: 10 }) + k.scrim(R.x + 14, R.y + 82, 216, 70, "#000000", 0, 0.7);
      s += T1(R.x + 26, R.y + 140, sl[0]?.caption || "Fresh every morning", { size: 11, weight: 900, fill: "#ffffff", ls: -0.2 });
      s += [0, 1].map((d) => circle(R.x + (d ? 216 : 28), R.y + 82, 8, "#ffffff", ' opacity=".92"' + k.shadow(2, 4, 0.25)) + T1(R.x + (d ? 216 : 28), R.y + 85.5, d ? "›" : "‹", { size: 10, weight: 900, fill: "#111827", anchor: "middle" })).join("");
      s += [0, 1, 2].map((i) => rect(R.x + 106 + i * 10 - (i ? 0 : 4), R.y + 157, i ? 5 : 13, 5, i ? c.line : c.a, 2.5)).join("");
      return s;
    });
  },
  hours(k, c, o) {
    return browserScene(k, c, "chaiwala.pk/visit", (R) => {
      const p = thumbPhoto(o.image), X = R.x + 70, Wd = R.w - 140;
      let s = rect(R.x, R.y, R.w, R.h, k.lin([c.soft, mix(c.a2, c.bg, 0.85)], 135)) + k.card(X, R.y + 8, Wd, R.h + 16, { fill: c.bg, rx: 12, sh: [8, 16, 0.25] });
      if (p) s += k.photo(p, X, R.y + 8, Wd, 46, { clip: `<path d="M${X} ${R.y + 54}V${R.y + 20}a12 12 0 0 1 12 -12h${Wd - 24}a12 12 0 0 1 12 12V${R.y + 54}Z"/>` });
      s += T1(X + 12, R.y + 72, fit(o.title || "Opening hours", 90, { size: 11, maxLines: 1 }).lines[0], { size: 11, weight: 900, fill: c.ink }) + rect(X + Wd - 48, R.y + 63, 38, 12, "#dcfce7", 6) + T1(X + Wd - 29, R.y + 71, "Open now", { size: 5.2, weight: 800, fill: "#166534", anchor: "middle" });
      [["Mon – Fri", "9:00 am – 6:00 pm"], ["Saturday", "9:00 am – 3:00 pm"], ["Sunday", "Closed"]].forEach(([d, t], i) => {
        const y = R.y + 92 + i * 17, today = i === 0;
        s += T1(X + 12, y, d, { size: 6.5, weight: today ? 900 : 600, fill: today ? c.a : c.ink }) + T1(X + Wd - 12, y, t, { size: 6.5, weight: today ? 900 : 500, fill: today ? c.a : i === 2 ? c.muted : c.ink, anchor: "end" }) + line(X + 12, y + 6, X + Wd - 12, y + 6, c.line, 0.6);
      });
      return s;
    });
  },
  contact(k, c, o) {
    return browserScene(k, c, "nimbus.pk/contact", (R) => {
      const p = thumbPhoto(o.image);
      let s = rect(R.x, R.y, R.w, R.h, c.soft) + k.card(R.x + 12, R.y + 10, R.w - 24, R.h - 20, { fill: c.bg, rx: 12, sh: [6, 14, 0.2] });
      s += k.photo(p, R.x + 12, R.y + 10, 116, R.h - 20, { rx: 12 });
      const X = R.x + 140, fw = R.w - 166;
      s += T1(X, R.y + 34, fit(o.title || "Send us a message", fw, { size: 15, maxLines: 1 }).lines[0], { size: 15, weight: 900, fill: c.ink, ls: -0.4 }) + T1(X, R.y + 45, fit(o.lead || "We usually reply within one working day.", fw, { size: 5.5, maxLines: 1 }).lines[0], { size: 5.5, fill: c.muted });
      const field = (y, lab, h = 13) => T1(X, y, lab, { size: 5.2, weight: 800, fill: c.ink }) + rect(X, y + 3, fw, h, c.bg, 4, ` stroke="${c.line}"`);
      s += field(R.y + 58, "Your name") + field(R.y + 82, "Your email") + field(R.y + 106, "Message", 18);
      s += btn(k, c, X, R.y + 133, o.button || "Send message", { w: 76, h: 14 });
      return s;
    });
  },
  quiz(k, c, o) {
    return browserScene(k, c, "class7.school.pk", (R) => {
      const p = thumbPhoto(o.image), X = R.x + 50, Wd = R.w - 100;
      let s = rect(R.x, R.y, R.w, R.h, k.lin([c.soft, c.bg], 90)) + k.card(X, R.y + 8, Wd, R.h + 20, { fill: c.bg, rx: 12, sh: [8, 16, 0.22] });
      if (p) s += k.photo(p, X, R.y + 8, Wd, 38, { clip: `<path d="M${X} ${R.y + 46}V${R.y + 20}a12 12 0 0 1 12 -12h${Wd - 24}a12 12 0 0 1 12 12V${R.y + 46}Z"/>` });
      s += T1(X + 12, R.y + 62, fit(o.title || "Quick quiz", Wd - 50, { size: 12, maxLines: 1 }).lines[0], { size: 12, weight: 900, fill: c.ink }) + T1(X + Wd - 12, R.y + 62, "1 / 3", { size: 6.5, weight: 900, fill: c.a, anchor: "end" });
      s += T1(X + 12, R.y + 78, "1. Which planet is closest to the sun?", { size: 6.5, weight: 800, fill: c.ink });
      ["Venus", "Mercury", "Mars"].forEach((a, i) => {
        const y = R.y + 84 + i * 17, right = i === 1;
        s += rect(X + 12, y, Wd - 24, 13, right ? "#dcfce7" : c.bg, 5, ` stroke="${right ? "#22c55e" : c.line}"`) + circle(X + 21, y + 6.5, 3, right ? "#16a34a" : "none", right ? "" : ` stroke="${c.muted}"`) + T1(X + 29, y + 9, a, { size: 6, weight: 700, fill: right ? "#14532d" : c.ink });
      });
      s += btn(k, c, X + 12, R.y + 140, "Check my answers", { w: 74, h: 13 });
      return s;
    });
  },
  flashcards(k, c) {
    return browserScene(k, c, "learn.nimbus.pk", (R) => {
      let s = rect(R.x, R.y, R.w, R.h, k.lin([c.soft, c.bg], 90)) + T1(R.x + R.w / 2, R.y + 24, "Learn the capitals", { size: 13, weight: 900, fill: c.ink, anchor: "middle", ls: -0.3 });
      s += `<g transform="rotate(6 ${R.x + 170} ${R.y + 90})">` + rect(R.x + 100, R.y + 40, 130, 82, c.bg, 12, ` stroke="${c.line}"` + k.shadow(4, 10, 0.15)) + `</g>`;
      s += `<g transform="rotate(-4 ${R.x + 146} ${R.y + 90})">` + rect(R.x + 80, R.y + 42, 132, 84, k.lin([c.a, c.a2], 135), 12, k.shadow(8, 16, 0.3, c.a)) + T1(R.x + 146, R.y + 62, "QUESTION", { size: 5, weight: 800, fill: c.on, anchor: "middle", ls: 1, opacity: 0.75 }) + T1(R.x + 146, R.y + 88, "Capital of Japan?", { size: 11, weight: 900, fill: c.on, anchor: "middle" }) + T1(R.x + 146, R.y + 110, "Tap to flip", { size: 5.5, fill: c.on, anchor: "middle", opacity: 0.8 }) + `</g>`;
      s += btn(k, c, R.x + 104, R.y + 140, "‹ Back", { ghost: true, w: 34 }) + T1(R.x + R.w / 2, R.y + 149, "1 / 4", { size: 6.5, weight: 800, fill: c.muted, anchor: "middle" }) + btn(k, c, R.x + 154, R.y + 140, "Next ›", { w: 34 });
      return s;
    });
  },
  linkbio(k, c, o) {
    return phoneScene(k, c, o.name || "Ayesha's Kitchen", "All my links on one page, ready for your bio.", (S) => {
      const p = thumbPhoto(o.cover);
      let s = rect(S.x, S.y, S.w, S.h, k.lin([mix(c.a, c.bg, 0.78), c.bg], 160));
      if (p) s += k.photo(p, S.x + 6, S.y + 14, S.w - 12, 48, { rx: 8 });
      s += circle(S.x + S.w / 2, S.y + 64, 15, c.bg) + circle(S.x + S.w / 2, S.y + 64, 13, k.lin([c.a, c.a2], 135)) + T1(S.x + S.w / 2, S.y + 68, (o.name || "Ayesha's Kitchen").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(), { size: 9, weight: 900, fill: c.on, anchor: "middle" });
      s += T1(S.x + S.w / 2, S.y + 90, fit(o.name || "Ayesha's Kitchen", S.w - 10, { size: 8, maxLines: 1 }).lines[0], { size: 8, weight: 900, fill: c.ink, anchor: "middle" });
      const links = (o.links || [{ label: "See our menu" }, { label: "Order on WhatsApp" }, { label: "Photos of our food" }, { label: "Find us on the map" }]).slice(0, 4);
      links.forEach((l, i) => { const y = S.y + 100 + i * 19; s += rect(S.x + 8, y, S.w - 16, 14, i ? c.bg : k.lin([c.a, c.a2], 0), 7, i ? ` stroke="${c.line}"` : "") + T1(S.x + S.w / 2, y + 9.3, fit(l.label, S.w - 26, { size: 5.5, maxLines: 1 }).lines[0], { size: 5.5, weight: 800, fill: i ? c.ink : c.on, anchor: "middle" }); });
      return s;
    });
  },
  whatsapp(k, c) {
    return phoneScene(k, { ...c, a: "#1fa855", a2: "#0b7a3b" }, "Chat on WhatsApp", "A floating button that starts a chat with your shop.", (S) => {
      let s = rect(S.x, S.y, S.w, S.h, "#efe7de") + rect(S.x, S.y, S.w, 34, "#075e54") + circle(S.x + 14, S.y + 22, 6, "#ffffff", ' opacity=".9"') + T1(S.x + 24, S.y + 21, "Nimbus Store", { size: 5.8, weight: 800, fill: "#ffffff" }) + T1(S.x + 24, S.y + 28, "online", { size: 4.4, fill: "#ffffff", opacity: 0.8 });
      [["Hi! Is the blue kurta in stock?", 0], ["Yes, sizes M and L. Want me to hold one?", 1], ["Yes please, size M!", 0]].forEach(([t, me], i) => {
        const y = S.y + 44 + i * 26, w = 62;
        s += rect(me ? S.x + 6 : S.x + S.w - w - 6, y, w, 20, me ? "#ffffff" : "#dcf8c6", 5, k.shadow(1, 2, 0.12)) + text(me ? S.x + 10 : S.x + S.w - w - 2, y + 8, fit(t, w - 8, { size: 4.6, maxLines: 2 }).lines, { size: 4.6, fill: "#111827", font: F, lh: 1.3 });
      });
      s += circle(S.x + S.w - 18, S.y + S.h - 26, 12, "#25d366", k.shadow(3, 6, 0.3)) + `<path d="M${S.x + S.w - 24} ${S.y + S.h - 20}l1.4-4a7 7 0 1 1 2.6 2.6z" fill="#ffffff"/>`;
      return s;
    });
  },
  qr(k, c, o) {
    return phoneScene(k, c, o.title || "Scan for our menu", "A QR code card for a link, WhatsApp, phone or Wi-Fi.", (S) => {
      let s = rect(S.x, S.y, S.w, S.h, c.soft) + k.card(S.x + 8, S.y + 26, S.w - 16, 132, { fill: c.bg, rx: 10, sh: [4, 10, 0.18] });
      const q = S.x + 20, qy = S.y + 38, cell = 3.6;
      const R = (n) => { let h = 7; for (let i = 0; i < 22 * 22; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; n.push(h % 3 === 0); } return n; };
      const bits = R([]);
      let mods = "";
      for (let r = 0; r < 18; r++) for (let cc = 0; cc < 18; cc++) { const inF = (r < 7 && cc < 7) || (r < 7 && cc > 10) || (r > 10 && cc < 7); if (!inF && bits[r * 22 + cc]) mods += `M${(q + cc * cell).toFixed(1)} ${(qy + r * cell).toFixed(1)}h${cell}v${cell}h-${cell}z`; }
      s += `<path d="${mods}" fill="${c.dark ? "#111827" : c.ink}"/>`;
      for (const [fx, fy] of [[0, 0], [11, 0], [0, 11]]) s += rect(q + fx * cell, qy + fy * cell, cell * 7, cell * 7, c.dark ? "#111827" : c.ink, 3) + rect(q + fx * cell + cell, qy + fy * cell + cell, cell * 5, cell * 5, c.bg, 2) + rect(q + fx * cell + cell * 2, qy + fy * cell + cell * 2, cell * 3, cell * 3, c.a, 1.5);
      s += T1(S.x + S.w / 2, S.y + 118, "Scan me", { size: 9, weight: 900, fill: c.a, anchor: "middle" }) + T1(S.x + S.w / 2, S.y + 128, "nimbus.pk/menu", { size: 5, fill: c.muted, anchor: "middle" });
      return s;
    });
  },
  calculator(k, c) {
    return phoneScene(k, c, "Simple calculator", "Keyboard support, brackets and per cent.", (S) => {
      let s = rect(S.x, S.y, S.w, S.h, c.dark ? c.bg : "#111827") + T1(S.x + S.w - 10, S.y + 40, "1,250 × 12", { size: 6.5, fill: "#9ca3af", anchor: "end" }) + T1(S.x + S.w - 10, S.y + 62, "15,000", { size: 19, weight: 900, fill: "#ffffff", anchor: "end", ls: -0.6 });
      const keys = ["C", "( )", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "⌫", "="];
      keys.forEach((kk, i) => { const col = i % 4, row = Math.floor(i / 4), x = S.x + 7 + col * 22.5, y = S.y + 74 + row * 22, op = col === 3; s += circle(x + 10, y + 10, 9.5, op ? c.a : row === 0 ? "#4b5563" : "#2a3045") + T1(x + 10, y + 13, kk, { size: 7, weight: 800, fill: op ? c.on : "#ffffff", anchor: "middle" }); });
      return s;
    });
  },
  tipzakat(k, c) {
    return phoneScene(k, c, "Split the bill", "Tip, share per person or a zakat estimate.", (S) => {
      let s = rect(S.x, S.y, S.w, S.h, c.bg) + T1(S.x + 8, S.y + 34, "Split the bill", { size: 8.5, weight: 900, fill: c.ink });
      s += T1(S.x + 8, S.y + 48, "Bill", { size: 4.8, weight: 800, fill: c.muted }) + rect(S.x + 8, S.y + 51, S.w - 16, 14, c.soft, 4) + T1(S.x + 13, S.y + 60.5, "Rs 4,600", { size: 6.5, weight: 800, fill: c.ink });
      ["10%", "15%", "20%"].forEach((t, i) => { const x = S.x + 8 + i * 27; s += rect(x, S.y + 72, 24, 13, i === 1 ? k.lin([c.a, c.a2], 0) : c.soft, 6.5) + T1(x + 12, S.y + 80.5, t, { size: 5.5, weight: 800, fill: i === 1 ? c.on : c.ink, anchor: "middle" }); });
      s += T1(S.x + 8, S.y + 98, "People", { size: 4.8, weight: 800, fill: c.muted }) + rect(S.x + 8, S.y + 101, S.w - 16, 14, c.soft, 4) + T1(S.x + S.w / 2, S.y + 110.5, "−     4     +", { size: 6.5, weight: 800, fill: c.ink, anchor: "middle" });
      s += rect(S.x + 8, S.y + 124, S.w - 16, 44, k.lin([c.a, c.a2], 135), 8) + T1(S.x + 15, S.y + 138, "EACH PAYS", { size: 4.6, weight: 800, fill: c.on, ls: 0.6, opacity: 0.85 }) + T1(S.x + 15, S.y + 158, "Rs 1,323", { size: 15, weight: 900, fill: c.on, ls: -0.5 });
      return s;
    });
  },
  timer(k, c) {
    return phoneScene(k, c, "Focus timer", "Countdown or stopwatch, with a beep at the end.", (S) => {
      const cx = S.x + S.w / 2, cy = S.y + 86, r = 34, L = 2 * Math.PI * r;
      let s = rect(S.x, S.y, S.w, S.h, c.bg) + T1(cx, S.y + 36, "Focus timer", { size: 8, weight: 900, fill: c.ink, anchor: "middle" });
      s += circle(cx, cy, r, "none", ` stroke="${c.soft}" stroke-width="7"`) + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.a}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(L * 0.72).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      s += T1(cx, cy + 6, "24:59", { size: 16, weight: 900, fill: c.ink, anchor: "middle", ls: -0.5 });
      s += btn(k, c, cx - 38, S.y + 136, "Pause", { w: 36, h: 14 }) + btn(k, c, cx + 2, S.y + 136, "Reset", { w: 36, h: 14, ghost: true });
      return s;
    });
  },
  converter(k, c) {
    return phoneScene(k, c, "Unit converter", "Length, weight, volume and temperature.", (S) => {
      let s = rect(S.x, S.y, S.w, S.h, c.bg) + T1(S.x + 8, S.y + 34, "Unit converter", { size: 8, weight: 900, fill: c.ink });
      ["Length", "Weight", "Temp"].forEach((t, i) => { const x = S.x + 8 + i * 27; s += rect(x, S.y + 42, 24, 12, i ? c.soft : k.lin([c.a, c.a2], 0), 6) + T1(x + 12, S.y + 50, t, { size: 4.8, weight: 800, fill: i ? c.ink : c.on, anchor: "middle" }); });
      s += rect(S.x + 8, S.y + 62, S.w - 16, 22, c.soft, 6) + T1(S.x + 14, S.y + 77, "1", { size: 10, weight: 900, fill: c.ink }) + T1(S.x + S.w - 14, S.y + 77, "metre ▾", { size: 5.5, weight: 700, fill: c.muted, anchor: "end" });
      s += circle(S.x + S.w / 2, S.y + 92, 7, k.lin([c.a, c.a2], 135)) + T1(S.x + S.w / 2, S.y + 95, "⇅", { size: 7, weight: 900, fill: c.on, anchor: "middle" });
      s += rect(S.x + 8, S.y + 100, S.w - 16, 22, c.soft, 6) + T1(S.x + 14, S.y + 115, "3.2808", { size: 10, weight: 900, fill: c.a }) + T1(S.x + S.w - 14, S.y + 115, "feet ▾", { size: 5.5, weight: 700, fill: c.muted, anchor: "end" });
      s += T1(S.x + S.w / 2, S.y + 140, "1 m = 3.2808 ft", { size: 6.5, weight: 800, fill: c.ink, anchor: "middle" });
      return s;
    });
  },
};

const cache = new Map();
/** A finished-looking preview of the template's widget (320×200 SVG string; library thumb photos only). */
export function thumb(id) {
  const key = String(id || "");
  if (cache.has(key)) return cache.get(key);
  const st = starter(key) || { widget: "countdown", raw: {} };
  const o = { ...st.raw }, c = colours(o);
  const k = kit("code:" + key);
  let body = "";
  try { body = (ART[st.widget] || ART.countdown)(k, c, o); } catch { body = rect(0, 0, W0, H0, c.soft); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W0} ${H0}" role="img" aria-label="${esc((TEMPLATES.find((t) => t.id === key)?.name) || st.widget)} template">${k.defs.length ? `<defs>${k.defs.join("")}</defs>` : ""}${body}</svg>`;
  if (cache.size > 200) cache.clear();
  cache.set(key, svg);
  return svg;
}
export { photoUrl };
