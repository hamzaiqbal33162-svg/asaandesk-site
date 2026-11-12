// Code generator template gallery (editor Templates panel + the /tools/code-generator intro page). Pure ES module, no DOM.
// Each template is one of the widgets in widgets.js (same id); thumbnails are our own small drawings.
const T = (id, name, section, tags) => ({ id, name, tool: "code-generator", section, tags });
const BASE = [
  T("countdown", "Countdown timer", "Widgets for your website", ["timer", "sale", "launch", "event", "clock"]),
  T("pricing", "Pricing table", "Widgets for your website", ["plans", "prices", "packages"]),
  T("faq", "FAQ accordion", "Widgets for your website", ["questions", "answers", "quiz", "help"]),
  T("testimonials", "Testimonial cards", "Widgets for your website", ["reviews", "stars", "customers"]),
  T("slider", "Image slider", "Widgets for your website", ["photos", "carousel", "gallery"]),
  T("hours", "Business hours", "Widgets for your website", ["opening times", "open now", "shop"]),
  T("contact", "Contact form", "Contact and sharing", ["email", "form", "message"]),
  T("whatsapp", "WhatsApp chat button", "Contact and sharing", ["chat", "button", "support"]),
  T("qr", "QR code card", "Contact and sharing", ["qr", "link", "wifi", "phone"]),
  T("linkbio", "Link in bio page", "Contact and sharing", ["links", "social", "bio"]),
  T("calculator", "Simple calculator", "Small apps", ["calculator", "maths", "numbers"]),
  T("tipzakat", "Tip and zakat calculator", "Small apps", ["tip", "bill", "split", "zakat"]),
  T("quiz", "Quiz", "Learning and games", ["quiz", "questions", "score", "test", "school"]),
  T("flashcards", "Flashcards", "Learning and games", ["cards", "flip", "study", "learn", "school"]),
  T("timer", "Timer and stopwatch", "Small apps", ["timer", "stopwatch", "focus", "clock"]),
  T("converter", "Unit converter", "Small apps", ["units", "convert", "length", "weight", "temperature"]),
];
// Second looks: the same 12 widgets in our own colour styles, with headings for a different purpose.
// id "<widget>~<look>"; apply sets the widget's colours (and heading) before it opens.
export const LOOKS = {
  night: { name: "Night", accent: "#f59e0b", bg: "#111827", text: "#f9fafb", corners: "round" },
  mint: { name: "Mint", accent: "#059669", bg: "#ecfdf5", text: "#064e3b", corners: "soft" },
  rose: { name: "Rose", accent: "#e11d48", bg: "#fff1f2", text: "#4c0519", corners: "round" },
  ocean: { name: "Ocean", accent: "#0369a1", bg: "#f0f9ff", text: "#0c4a6e", corners: "square" },
};
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
export const TEMPLATES = [
  ...BASE,
  ...ALT.map(([w, look, name, title]) => ({ ...T(`${w}~${look}`, name, BASE.find((b) => b.id === w).section, [...BASE.find((b) => b.id === w).tags, LOOKS[look].name.toLowerCase()]), widget: w, look, title })),
];
export const TOTAL = TEMPLATES.length;
export const LAYOUTS = BASE.length;
/** { widget, raw } for a template id: the widget to open and the option values to start from ({} = the widget's own). */
export function starter(id) {
  const [w, look] = String(id || "").split("~");
  if (!BASE.some((b) => b.id === w)) return null;
  if (!look) return { widget: w, raw: {} };
  const L = LOOKS[look];
  if (!L) return null;
  const alt = ALT.find((x) => x[0] === w && x[1] === look);
  const raw = { accent: L.accent, bg: L.bg, text: L.text, corners: L.corners };
  if (alt?.[3]) raw.title = alt[3];
  return { widget: w, raw };
}

const C = { a: "#5b4cf0", b: "#14b8a6", c: "#f59e0b", d: "#1b2133", l: "#eceafe", g: "#e5e7eb" };
const r = (x, y, w, h, f, rx = 4, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${extra}/>`;
const t = (x, y, s, size = 14, f = C.d, w = 700, anchor = "start") => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${w}" fill="${f}" text-anchor="${anchor}">${s}</text>`;
const bars = (x, y, n, w = 90) => Array.from({ length: n }, (_, i) => r(x, y + i * 10, w - i * 14, 5, "#c9cdd8", 2.5)).join("");
const ART = {
  countdown: () => t(160, 62, "SALE ENDS IN", 13, C.a, 700, "middle") + [0, 1, 2, 3].map((i) => r(46 + i * 60, 76, 48, 54, "#fff", 8, ` stroke="${C.g}"`) + t(70 + i * 60, 110, ["02", "14", "37", "09"][i], 20, C.d, 800, "middle") + t(70 + i * 60, 124, ["days", "hrs", "min", "sec"][i], 8, "#6b7280", 500, "middle")).join(""),
  pricing: () => [0, 1, 2].map((i) => r(40 + i * 82, i === 1 ? 40 : 52, 74, i === 1 ? 128 : 112, i === 1 ? C.a : "#fff", 8, i === 1 ? "" : ` stroke="${C.g}"`) + t(77 + i * 82, i === 1 ? 72 : 80, ["Rs 500", "Rs 900", "Rs 1.5k"][i], 13, i === 1 ? "#fff" : C.d, 800, "middle") + r(52 + i * 82, i === 1 ? 140 : 140, 50, 12, i === 1 ? "#fff" : C.l, 6)).join(""),
  faq: () => [0, 1, 2, 3].map((i) => r(40, 36 + i * 34, 240, i === 0 ? 46 : 26, "#fff", 6, ` stroke="${C.g}"`) + r(52, 46 + i * 34 + (i ? 0 : 0), 140, 6, C.d, 3) + t(266, 54 + i * 34, i === 0 ? "−" : "+", 16, C.a, 700, "end")).join("") + r(52, 62, 180, 5, "#c9cdd8", 2.5),
  testimonials: () => [0, 1].map((i) => r(34 + i * 130, 46, 120, 110, "#fff", 10, ` stroke="${C.g}"`) + t(48 + i * 130, 72, "★★★★★", 13, C.c) + bars(48 + i * 130, 84, 3) + `<circle cx="${56 + i * 130}" cy="138" r="9" fill="${i ? C.b : C.a}"/>` + r(70 + i * 130, 135, 50, 6, C.d, 3)).join(""),
  slider: () => r(40, 36, 240, 120, C.l, 10) + `<circle cx="110" cy="76" r="16" fill="${C.c}"/><path d="M40 146l70-50 50 34 40-26 80 52v0H40z" fill="${C.a}" opacity=".75"/>` + `<circle cx="56" cy="96" r="12" fill="#fff"/><path d="M59 90l-6 6 6 6" stroke="${C.d}" stroke-width="2" fill="none"/><circle cx="264" cy="96" r="12" fill="#fff"/><path d="M261 90l6 6-6 6" stroke="${C.d}" stroke-width="2" fill="none"/>` + [0, 1, 2].map((i) => `<circle cx="${148 + i * 12}" cy="170" r="4" fill="${i ? "#c9cdd8" : C.a}"/>`).join(""),
  hours: () => r(70, 30, 180, 140, "#fff", 10, ` stroke="${C.g}"`) + r(84, 42, 70, 16, "#dcfce7", 8) + t(119, 54, "Open now", 10, "#15803d", 700, "middle") + ["Mon – Fri", "Saturday", "Sunday"].map((d, i) => t(86, 82 + i * 24, d, 11, C.d, 600) + t(236, 82 + i * 24, ["9 – 6", "10 – 4", "Closed"][i], 11, "#6b7280", 500, "end")).join(""),
  contact: () => r(60, 26, 200, 150, "#fff", 10, ` stroke="${C.g}"`) + t(76, 50, "Send a message", 13) + [0, 1].map((i) => r(76, 60 + i * 26, 168, 18, "#f3f4f6", 5)).join("") + r(76, 112, 168, 34, "#f3f4f6", 5) + r(76, 152, 70, 16, C.a, 8),
  whatsapp: () => r(40, 30, 240, 140, "#f8fafc", 10, ` stroke="${C.g}"`) + bars(58, 50, 4, 150) + r(150, 100, 100, 30, "#fff", 12, ` stroke="${C.g}"`) + t(200, 119, "Chat with us", 10, C.d, 600, "middle") + `<circle cx="258" cy="148" r="18" fill="#22c55e"/><path d="M250 156l2-6a8 8 0 1 1 4 4z" fill="#fff"/>`,
  qr: () => r(100, 24, 120, 152, "#fff", 10, ` stroke="${C.g}"`) + [[112, 36], [176, 36], [112, 100]].map(([x, y]) => r(x, y, 32, 32, C.d, 3) + r(x + 7, y + 7, 18, 18, "#fff", 2) + r(x + 11, y + 11, 10, 10, C.d, 1)).join("") + Array.from({ length: 16 }, (_, i) => r(150 + (i % 4) * 9 + ((i * 7) % 3) * 2, 104 + Math.floor(i / 4) * 8, 6, 6, C.d, 1)).join("") + t(160, 158, "Scan me", 11, C.a, 700, "middle"),
  linkbio: () => r(95, 18, 130, 164, C.l, 14) + `<circle cx="160" cy="46" r="14" fill="${C.a}"/>` + t(160, 76, "@yourname", 10, C.d, 700, "middle") + [0, 1, 2, 3].map((i) => r(108, 86 + i * 22, 104, 16, i ? "#fff" : C.a, 8)).join(""),
  calculator: () => r(106, 18, 108, 164, C.d, 12) + r(116, 30, 88, 26, "#2a3045", 6) + t(198, 49, "128", 15, "#fff", 700, "end") + Array.from({ length: 12 }, (_, i) => r(116 + (i % 4) * 23, 64 + Math.floor(i / 4) * 34, 18, 26, i % 4 === 3 ? C.c : "#3a4160", 5)).join(""),
  quiz: () => r(60, 22, 200, 156, "#fff", 10, ` stroke="${C.g}"`) + t(76, 46, "1. Closest planet?", 12) + ["Venus", "Mercury", "Mars"].map((a, i) => r(76, 56 + i * 24, 168, 18, i === 1 ? "#dcfce7" : "#f3f4f6", 6) + `<circle cx="88" cy="${65 + i * 24}" r="4" fill="${i === 1 ? "#16a34a" : "#c9cdd8"}"/>` + t(98, 69 + i * 24, a, 10, C.d, 600)).join("") + r(76, 134, 92, 18, C.a, 9) + t(122, 147, "Check", 10, "#fff", 700, "middle") + t(244, 147, "2 / 3", 12, C.a, 800, "end"),
  timer: () => r(80, 26, 160, 148, "#fff", 12, ` stroke="${C.g}"`) + t(160, 52, "Focus timer", 12, C.d, 700, "middle") + t(160, 104, "24:59", 34, C.a, 800, "middle") + r(100, 126, 56, 20, C.a, 10) + t(128, 140, "Pause", 10, "#fff", 700, "middle") + r(164, 126, 56, 20, "#fff", 10, ` stroke="${C.g}"`) + t(192, 140, "Reset", 10, C.d, 700, "middle"),
  flashcards: () => r(92, 40, 150, 100, C.l, 12) + r(78, 50, 150, 100, C.a, 12) + t(153, 106, "Capital of Japan", 12, "#fff", 700, "middle") + r(110, 160, 40, 16, "#fff", 8, ` stroke="${C.g}"`) + t(160, 172, "1 / 4", 10, "#6b7280", 600, "middle") + r(170, 160, 40, 16, C.a, 8),
  converter: () => r(60, 26, 200, 148, "#fff", 10, ` stroke="${C.g}"`) + t(76, 50, "Unit converter", 12) + r(76, 60, 168, 18, "#f3f4f6", 5) + t(84, 73, "Length", 10, C.d, 600) + r(76, 86, 80, 18, "#f3f4f6", 5) + t(84, 99, "Metres", 10, C.d, 600) + r(164, 86, 80, 18, "#f3f4f6", 5) + t(172, 99, "Feet", 10, C.d, 600) + r(76, 114, 168, 40, C.l, 8) + t(160, 140, "1 m = 3.2808 ft", 13, C.a, 800, "middle"),
  tipzakat: () => r(60, 26, 200, 150, "#fff", 10, ` stroke="${C.g}"`) + t(76, 50, "Split the bill", 13) + r(76, 60, 168, 18, "#f3f4f6", 5) + ["10%", "15%", "20%"].map((p, i) => r(76 + i * 58, 86, 52, 20, i === 1 ? C.b : "#f3f4f6", 10) + t(102 + i * 58, 100, p, 10, i === 1 ? "#fff" : C.d, 700, "middle")).join("") + t(76, 134, "Each pays", 11, "#6b7280", 500) + t(244, 160, "Rs 1,150", 18, C.d, 800, "end"),
};
/** Our own drawn thumbnail (320×200 SVG string). */
export function thumb(id) {
  const [w, look] = String(id || "").split("~");
  const L = LOOKS[look];
  let body = (ART[w] || ART.countdown)();
  if (L) body = body.replaceAll(C.a, L.accent).replaceAll('fill="#fff"', `fill="${L.bg}"`).replaceAll(C.d, L.text);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${L ? (look === "night" ? "#1f2937" : L.bg) : "#f4f5fa"}"/>${body}</svg>`;
}
