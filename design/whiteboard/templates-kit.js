// Building blocks for the whiteboard templates (pure, no DOM): a board frame with a bold title header, section panels
// with coloured header pills, sticky-note grids, avatars (round people photos), line icons (stickers), photos from the
// shared library (places, things and people, cropped around faces) and connectors. Every template is drawn on a
// 1280 × 800 board so its thumbnail is readable. Colours are the base colours of variants.js (palettes recolour them).
// All wording is our own.
import { makeNote, makeShape, makeText, makeFrame, makeConnector, makeImage, makeSticker, makeStroke } from "./model.js";
import { textWidth } from "./render.js";
import { pickPhoto, pickPerson, photoUrl, PEOPLE as LIB_PEOPLE } from "../shared/photo-library.js";

export const W = 1280, H = 800, M = 40, TOP = 160, BOT = 764;
/** Accent, tint and paper slots (recoloured by the palettes in variants.js). */
export const A = ["#5b4cf0", "#2f80ff", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e"];
export const TI = ["#e8e5fe", "#dbeafe", "#ccfbf1", "#fef3c7", "#ffe4e6", "#dcfce7"];
export const PAPER = ["#f8f7ff", "#f4f8ff", "#f2fbf9", "#fffaf0", "#fff7f8", "#f4fbf6"];
export const N = { yellow: "#ffe27a", peach: "#ffc29f", pink: "#ffb3cf", lilac: "#d9cbff", sky: "#b4dcff", mint: "#b7efd2", lime: "#dff28f" };
export const NOTES = [N.yellow, N.sky, N.pink, N.mint, N.lilac, N.peach, N.lime];
export const INK = "#1b2133", TEAL = "#0f766e", GREY = "#5d6478", SOFT = "#8a91a5", LINE = "#e3e6ef", WHITE = "#ffffff";

/* ---------------------------------------------------------------- content theme (variants) */
let CUR = null, SEED = "board";
/** Sets the content theme (variants.js THEMES entry or null) and the photo seed (template id) for the next build. */
export function setBuild(theme, seed) { CUR = theme?.items ? theme : null; SEED = String(seed || "board"); resetPeople(); }
export const themed = () => !!CUR;
/** Sticky-note phrases: the layout's own, or the theme's phrases from offset off. */
export const th = (list, off = 0) => (CUR?.items ? list.map((_, i) => CUR.items[(off + i) % CUR.items.length]) : list);
/** A title: the default, or f(theme topic). */
export const tv = (def, f) => (CUR?.topic ? f(CUR.topic) : def);
/** People "Name, Role" (the layout's own or the theme's). */
export const who = (list, off = 0) => (CUR?.people ? list.map((_, i) => CUR.people[(off + i) % CUR.people.length]) : list);
export const topicWord = (def = "") => (CUR ? `${CUR.label} ${CUR.topic}` : def);
export const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const low = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const nameOf = (p) => String(p).split(",")[0].trim();
const roleOf = (p) => String(p).split(",").slice(1).join(",").trim();
export { nameOf, roleOf };
export const initials = (name) => nameOf(name).replace(/^(Dr|Mr|Ms|Mrs|Coach|Chef)\.? /, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/* ---------------------------------------------------------------- primitives */
export function txt(x, y, w, text, size = 20, o = {}) {
  const t = makeText({ x, y, w, text, size, bold: !!o.bold, color: o.color || INK, align: o.align || "left" });
  if (o.italic) t.italic = true;
  if (o.role) t.role = o.role;
  return t;
}
/** Largest size (max..min) that keeps text on one line in w. */
export function fitSize(text, w, max, min = 14, bold = true) {
  let s = max;
  while (s > min && textWidth(text, s, bold) > w) s -= 1;
  return s;
}
/** Largest size ≤ max at which the longest word of text fits in width w (words are never split). */
export function wordFit(text, w, max, bold = false) {
  const longest = String(text || "").split(/\s+/).reduce((a, b) => (textWidth(b, max, bold) > textWidth(a, max, bold) ? b : a), "");
  let s = max;
  while (s > 9 && textWidth(longest, s, bold) > w) s -= 1;
  return s;
}
const INNER = { ellipse: 0.72, diamond: 0.56, triangle: 0.56, star: 0.4 };
export function shape(x, y, w, h, o = {}) {
  const kind = o.kind || "rounded", inner = INNER[kind] ? w * INNER[kind] : w - 16;
  const s = makeShape({ x, y, w, h, kind, fill: o.fill ?? WHITE, stroke: o.stroke ?? o.fill ?? WHITE, sw: o.sw ?? 1.5, text: o.text || "", size: o.text ? wordFit(o.text, inner, o.size || 18, !!o.bold) : o.size || 18, bold: !!o.bold });
  if (o.tc) s.textColor = o.tc;
  if (o.align) s.align = o.align;
  if (o.opacity != null) s.opacity = o.opacity;
  if (o.dash) s.dash = true;
  if (o.italic) s.italic = true;
  if (o.role) s.role = o.role;
  return s;
}
export function note(x, y, w, h, text, color = N.yellow, o = {}) {
  const n = makeNote({ x, y, w, h, color, text, size: wordFit(text, w - 28, o.size || 24, !!o.bold) });
  if (o.author) n.author = o.author;
  if (o.bold) n.bold = true;
  if (o.align) n.align = o.align;
  return n;
}
/** Coloured pill with white bold text (section header). */
export const pill = (x, y, w, h, text, fill = INK, o = {}) => shape(x, y, w, h, { fill, stroke: fill, text, size: o.size || 20, bold: true, tc: o.tc || WHITE, role: o.role });
/** Small tag (rounded label) like "Design" on a card. */
export const tag = (x, y, text, fill, o = {}) => { const w = Math.round(textWidth(text, o.size || 14, true) + 24); return shape(x, y, w, o.h || 26, { fill, stroke: fill, text, size: o.size || 14, bold: true, tc: o.tc || INK }); };
export function link(a, b, o = {}) {
  const c = makeConnector({ from: { id: a.id, side: o.fromSide || "auto" }, to: { id: b.id, side: o.toSide || "auto" }, kind: o.kind || "straight", arrow: o.arrow ?? "end", text: o.text || "", stroke: o.stroke || "#475069", sw: o.sw ?? 2.5 });
  if (o.dash) c.dash = true;
  return c;
}
export function line(x1, y1, x2, y2, o = {}) {
  const c = makeConnector({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, kind: o.kind || "straight", arrow: o.arrow ?? "none", stroke: o.stroke || "#475069", sw: o.sw ?? 2.5, text: o.text || "" });
  if (o.dash) c.dash = true;
  return c;
}
export const pen = (points, color = INK, width = 4) => makeStroke({ points, color, width });

/* ---------------------------------------------------------------- icons (own line drawings, 24 × 24) */
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;
export const ICONS = {
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2V17h5v-1c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z",
  target: C(12, 12, 9) + C(12, 12, 5) + C(12, 12, 1),
  users: "M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.3c2.2.7 3.5 2.8 3.5 5.7",
  user: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5",
  calendar: "M4 6h16v15H4zM4 10.5h16M8.5 3v5M15.5 3v5",
  check: "M5 12.5l4.5 4.5L19 7",
  checkCircle: C(12, 12, 9) + "M8 12.5l3 3 5-6",
  star: "M12 3l2.7 5.6 6.1.8-4.4 4.3 1.1 6.1L12 16.9l-5.5 2.9 1.1-6.1-4.4-4.3 6.1-.8z",
  flag: "M5 21V4M5 4h12l-2.5 4.5L17 13H5",
  chart: "M4 20h16M7.5 16.5v-5M12 16.5V7M16.5 16.5v-8",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  rocket: "M12 2.5c3.2 2.3 5 6 5 10.5l-2 3.5H9l-2-3.5c0-4.5 1.8-8.2 5-10.5zM12 8.5a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM9.5 16.5l-2.5 4.5M14.5 16.5l2.5 4.5",
  heart: "M12 20.5s-8-4.6-8-10.5a4.5 4.5 0 0 1 8-2.8a4.5 4.5 0 0 1 8 2.8c0 5.9-8 10.5-8 10.5z",
  alert: "M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.2v.3",
  clock: C(12, 12, 9) + "M12 7v5l3.5 2",
  chat: "M4 5h16v11H10l-6 4.5z",
  gear: C(12, 12, 3.5) + "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
  money: "M3 7h18v10H3zM6.5 10v4M17.5 10v4" + C(12, 12, 2.6),
  cart: "M3 4h2.5l2.2 11h10.8L21 7.5H6.4" + C(9.5, 19.5, 1.3) + C(17, 19.5, 1.3),
  pin: "M12 21s-6.5-6.4-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 14.6 12 21 12 21z" + C(12, 9.5, 2.5),
  camera: "M4 8h3.5l1.8-2.5h5.4L16.5 8H20v11H4z" + C(12, 13.3, 3.2),
  book: "M4 5.5c3-1.2 6-1 8 .8c2-1.8 5-2 8-.8v13.5c-3-1.2-6-1-8 .8c-2-1.8-5-2-8-.8zM12 6.3v13.5",
  home: "M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5.5h4V20",
  mail: "M3.5 6h17v12h-17zM3.5 7l8.5 6 8.5-6",
  cloud: "M7 18.5h10a4 4 0 0 0 .4-8a6 6 0 0 0-11.4-1A4.5 4.5 0 0 0 7 18.5z",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4.5M16 6h3a3 3 0 0 1-3 4.5M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z",
  search: C(10.5, 10.5, 6) + "M15 15l5 5",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.5M4.5 12h.5M4.5 18h.5",
  smile: C(12, 12, 9) + "M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2M9 9.5v1M15 9.5v1",
  frown: C(12, 12, 9) + "M8.5 16.5c1-1.3 2.2-2 3.5-2s2.5.7 3.5 2M9 9.5v1M15 9.5v1",
  meh: C(12, 12, 9) + "M8.5 15.5h7M9 9.5v1M15 9.5v1",
  angry: C(12, 12, 9) + "M8.5 16.5c1-1.3 2.2-2 3.5-2s2.5.7 3.5 2M8 8.5l2.5 1.5M16 8.5l-2.5 1.5",
  bolt: "M13 2.5L5 14h6l-1 7.5L18 10h-6z",
  arrow: "M4 12h15M13.5 6l6 6-6 6",
  palette: "M12 3a9 9 0 0 0 0 18c1.4 0 2-.9 2-1.9 0-1.2-1-1.6-1-2.6 0-1 .9-1.5 2-1.5h2.2A3.8 3.8 0 0 0 21 11c0-4.4-4-8-9-8z" + C(7.5, 11, 1) + C(10, 7.3, 1) + C(14.5, 7.3, 1),
  leaf: "M5 19.5C5 11 11 5 20 4.5c0 9-6 15-14.5 15zM5 19.5l7.5-7.5",
  plane: "M2.5 13l19-8.5-6.5 16-3.3-6.7z",
  phone: "M7.5 2.5h9v19h-9zM11 18.5h2",
  lock: "M5.5 11h13v10h-13zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  shield: "M12 3l8 3v6c0 4.6-3.4 8.1-8 9.3C7.4 20.1 4 16.6 4 12V6z",
  layers: "M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5",
  db: "M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3",
  server: "M4 4h16v6.5H4zM4 13.5h16V20H4zM7.5 7.2h.5M7.5 16.7h.5",
  globe: C(12, 12, 9) + "M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9s-1.3 6.5-3.7 9c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3z",
  edit: "M4 20l1.2-4.4L16 4.8l3.2 3.2L8.4 18.8zM14 6.8l3.2 3.2",
  coffee: "M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3v3M12 3v3",
  gift: "M4 9h16v4H4zM5.5 13h13v8h-13zM12 9v12M12 9c-2.5 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2.5 3-5 3z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  food: "M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 3c-2.2 1-3.5 3.2-3.5 6.5V13H17v8",
  fitness: "M3.5 9v6M6.5 7v10M17.5 7v10M20.5 9v6M6.5 12h11",
  school: "M2.5 9L12 4.5 21.5 9 12 13.5zM6.5 11v5c1.5 1.6 3.4 2.5 5.5 2.5s4-.9 5.5-2.5v-5",
  map: "M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2zM9 4.5v13M15 6.5v13",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1",
  play: C(12, 12, 9) + "M10 8.5v7l5.5-3.5z",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  anchor: C(12, 5.5, 2) + "M12 7.5V21M7 11h10M4.5 14a7.5 7.5 0 0 0 15 0",
  wind: "M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7",
  mountain: "M2.5 20l7-12 4 6.5 2.5-3.5 5.5 9z",
  tool: "M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-5-5l2.5 2.5-1.5 1.5z",
};
/** A line icon (sticker) in a colour slot (recoloured with the palette). */
export function icon(name, x, y, size = 28, color = WHITE, sw = 2) {
  const d = ICONS[name] || ICONS.star;
  const s = makeSticker({ x, y, w: size, h: size, element: { id: "icon-" + name, name: cap(name), vb: [24, 24], parts: [{ d, fill: "none", stroke: "$1", sw, cap: "round", join: "round" }], colors: { c1: color } } });
  return s;
}
/** Rounded square (or circle) badge with an icon. */
export function badge(x, y, size, name, fill = A[0], color = WHITE, o = {}) {
  const b = shape(x, y, size, size, { kind: o.circle ? "ellipse" : "rounded", fill, stroke: fill });
  const k = Math.round(size * 0.56);
  const i = icon(name, x + (size - k) / 2, y + (size - k) / 2, k, color, o.sw || 2);
  if (o.role) { b.role = o.role; i.role = o.role; }
  return [b, i];
}
/* ---------------------------------------------------------------- people (shared library photos) */
// First names (and family words) used on the boards -> "f" / "m", so a person's photo matches the name.
const SEX_F = new Set("sara hina ayesha aisha maham nasreen sana zara noor asma laila rida maria mehak rabia amna mona nadia iqra hira areeba fatima nida komal sobia anum shazia uzma saima mahnoor mariam maryam alina sadia mehwish lubna zainab huma sadaf samina bushra farah kiran saba ms mrs miss mum mom mother grandma granny aunt bride sister daughter".split(" "));
const SEX_M = new Set("bilal omar umar danish saad rashid imran tariq ali hamza musa kamran faisal usman hamid ahmed hassan yusuf farhan shahid adeel sami kashif jawad raza waqas babar naveed ehsan ayaan rayan junaid hammad fahad asad zain haris talha adnan arif khalid nabeel salman shoaib waleed zubair mr dad father grandpa grandad uncle groom brother son".split(" "));
/** "f", "m" or null from a name like "Dr. Ayesha, Lead" or "Mum, Plans". */
export function sexOf(name) {
  for (const w of nameOf(name).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)) { if (SEX_F.has(w)) return "f"; if (SEX_M.has(w)) return "m"; }
  return null;
}
// Role words -> the kind of photo (words the shared library understands); the default is a business headshot.
const ROLE_KIND = [
  [/\bnurse\b/i, "nurse"], [/\b(?:dr|doctor|gp|lab)\b/i, "doctor"], [/\b(?:chef|kitchen|cook)\b/i, "chef"],
  [/\b(?:coach|yoga|strength|trainer|nutrition|fitness)\b/i, "fitness trainer"], [/\b(?:principal|science|teacher|tutor|art|sports)\b/i, "teacher"],
  [/\b(?:agent|broker|viewings|realtor)\b/i, "realtor"], [/\b(?:customers?|buyers?|neighbours?|guests?|shoppers?)\b/i, "customer smiling"],
  [/\b(?:grandma|grandpa|grandad|granny|grandmother|grandfather)\b/i, "senior elderly"],
  [/\b(?:mum|mom|dad|bride|groom|best man|family|maps|games|photos|food|planner)\b/i, "smiling casual"],
];
// Children: the library has few child portraits, so two boys are tight face crops from a family photo (focus + zoom).
// Oldest first; each board uses each child crop once.
const KIDS = [
  { id: "person-child-girl-smiling", sex: "f" }, { id: "person-child-playing-leaves", sex: "f", fx: 0.55, fy: 0.3, zoom: 1.6 },
  { id: "person-teen-striped-shirt", sex: "m" }, { id: "person-family-picnic", sex: "m", fx: 0.255, fy: 0.54, zoom: 3.4 },
  { id: "person-family-picnic", sex: "m", fx: 0.595, fy: 0.63, zoom: 3.8 },
];
const KID_IDS = [...new Set(KIDS.map((k) => k.id))];
let PEEPS = new Map(), PUSED = [], KUSED = new Set();
/** Clears the people picked for the board being built (each build picks its own, without repeats). */
export function resetPeople() { PEEPS = new Map(); PUSED = []; KUSED = new Set(); }
const r2 = (v) => Math.round(v * 100) / 100;
/** Focus point (0..1) to keep in view when a people photo is cropped: the face, with a little head room. */
const focusOf = (p) => ({ fx: r2(p.fx ?? 0.5), fy: r2(Math.min(1, (p.fy ?? 0.44) + 0.06)) });
/** Crop of a library photo for a spot: { p, fx, fy, zoom?, nw, nh }. */
const cropOf = (p, c = {}) => ({ p, ...focusOf(p), ...(c.fx != null ? { fx: c.fx, fy: c.fy } : {}), ...(c.zoom > 1 ? { zoom: c.zoom } : {}), nw: p.w, nh: p.h });
/** The people photo (crop) for a person on this board: the same name gets the same face, different names different faces. */
export function personFor(name, o = {}) {
  if (!LIB_PEOPLE.length) return null;
  const key = nameOf(name).toLowerCase() + "|" + (o.kind || "");
  if (PEEPS.has(key)) return PEEPS.get(key);
  const sex = o.sex || sexOf(name), word = sex === "f" ? "woman" : sex === "m" ? "man" : "";
  let crop = null;
  if (/\b(?:child|kids?|girl|boy)\b/i.test(o.kind || "")) {
    const i = KIDS.findIndex((k, j) => !KUSED.has(j) && (!sex || k.sex === sex));
    const p = i >= 0 ? LIB_PEOPLE.find((x) => x.id === KIDS[i].id) : null;
    if (p) { KUSED.add(i); crop = cropOf(p, KIDS[i]); }
  }
  if (!crop) {
    const role = ROLE_KIND.find(([re]) => re.test(String(name)))?.[1];
    const kind = o.kind ? `${o.kind} ${word} portrait` : role ? `${role} ${word} portrait` : `business ${word} professional headshot portrait`;
    // grown-ups never get a child's or a teen's photo
    const p = pickPerson(kind.replace(/\s+/g, " ").trim(), `${SEED}:${key}`, { exclude: [...PUSED, ...KID_IDS], sex });
    if (p) crop = cropOf(p);
  }
  PEEPS.set(key, crop);
  if (crop) PUSED.push(crop.p.id);
  return crop;
}
/** Round people photo of a person (white ring), a normal image layer: replaceable, cropped around the face. */
export function avatar(x, y, d, name, fill = A[1], o = {}) {
  const c = personFor(name, o);
  if (!c) return initialsAvatar(x, y, d, name, fill, o);
  const { p, ...crop } = c;
  const img = makeImage({ x, y, w: d, h: d, src: photoUrl(p, "full"), name: `${nameOf(name)} photo` });
  Object.assign(img, { fit: "cover", round: true, ...crop, fill, stroke: o.ring || WHITE, sw: o.sw ?? 3 });
  if (o.role) img.role = o.role;
  return img;
}
/** Round avatar with initials (white ring): only when the people photo library is empty. */
export function initialsAvatar(x, y, d, name, fill = A[1], o = {}) {
  const s = shape(x, y, d, d, { kind: "ellipse", fill, stroke: o.ring || WHITE, sw: o.sw ?? 3, text: initials(name), size: Math.round(d * 0.36), bold: true, tc: WHITE });
  if (o.role) s.role = o.role;
  return s;
}
// People photo kind per content theme (the theme's own kind of people), for picture spots that show people.
const THEME_PEOPLE = { school: "teacher students class", shop: "fashion shopping style", clinic: "doctor nurse", restaurant: "chef cooking", wedding: "wedding couple bride groom", "real-estate": "realtor showing home", fitness: "fitness gym workout", startup: "team startup laptop", ngo: "team volunteers community", travel: "traveler trip", marketing: "creator influencer camera" };
/** The theme's people kind (or def on the layout's own text). */
export const themePeople = (def) => (CUR && THEME_PEOPLE[CUR.id] ? THEME_PEOPLE[CUR.id] : def);

/* ---------------------------------------------------------------- photos (shared library) */
let photoN = 0;
/** A photo that fills (and crops to) its box, on a white card. topic picks the photo; the template id is the seed. */
export function photo(x, y, w, h, topic, o = {}) {
  const t = `${CUR ? CUR.label + " " + CUR.topic + " " : ""}${topic}`;
  const p = pickPhoto(t, `${SEED}:${o.slot ?? photoN++}`, { exclude: o.exclude || [], landscape: o.landscape ?? (w >= h) });
  const out = [];
  const m = o.card === false ? 0 : o.card ?? 8;
  if (m) out.push(shape(x - m, y - m, w + m * 2, h + m * 2 + (o.caption ? 34 : 0), { kind: "rect", fill: WHITE, stroke: LINE, sw: 1 }));
  const img = makeImage({ x, y, w, h, src: photoUrl(p, "full"), name: p?.title || "Photo" });
  img.fit = "cover";
  out.push(img);
  if (o.caption) out.push(txt(x, y + h + 6, w, o.caption, 18, { bold: true, align: "center", color: INK }));
  if (o.used) o.used.push(p?.id);
  return out;
}
/** A people photo (kind = who: "fashion model woman", "traveler"…) that fills its box, cropped around the face. */
export function personPhoto(x, y, w, h, kind, o = {}) {
  const exclude = [...PUSED, ...(o.exclude || []), ...(/\b(?:child|kids?|girl|boy)\b/i.test(kind) ? [] : KID_IDS)];
  const p = LIB_PEOPLE.length ? pickPerson(kind, `${SEED}:p${o.slot ?? photoN++}`, { exclude, landscape: o.landscape ?? null, sex: o.sex || null }) : null;
  if (!p) return photo(x, y, w, h, kind, o);
  PUSED.push(p.id);
  const out = [];
  const m = o.card === false ? 0 : o.card ?? 8;
  if (m) out.push(shape(x - m, y - m, w + m * 2, h + m * 2 + (o.caption ? 34 : 0), { kind: "rect", fill: WHITE, stroke: LINE, sw: 1 }));
  const img = makeImage({ x, y, w, h, src: photoUrl(p, "full"), name: p.title || "Photo" });
  const { p: _p, ...crop } = cropOf(p);
  Object.assign(img, { fit: "cover", ...crop });
  out.push(img);
  if (o.caption) out.push(txt(x, y + h + 6, w, o.caption, 18, { bold: true, align: "center", color: INK }));
  if (o.used) o.used.push(p.id);
  return out;
}
export const resetPhotos = () => { photoN = 0; resetPeople(); };

/* ---------------------------------------------------------------- board frame + header */
const PEOPLE = ["Sara Ahmed, Lead", "Bilal Khan, Design", "Hina Raza, Ops", "Omar Shah, Sales"];
/**
 * The board: a frame (name = section name) with a bold title header: icon badge, title, subtitle, team avatars and a
 * chip on the right. o = { name, title, sub, icon, acc, paper, chip, people (count), frame: false, w, h }.
 */
export function board(o) {
  const w = o.w || W, h = o.h || H, acc = A[o.acc ?? 0], out = [];
  // Header style: "badge" (icon + title), "band" (title on a coloured band) or "center" (big centred title).
  // Chosen per template id so neighbouring cards and variants look different.
  const style = o.style || ["badge", "band", "center"][hashOf(SEED) % 3];
  const band = style === "band", center = style === "center", role = "title";
  if (o.frame !== false) { const f = makeFrame({ x: 0, y: 0, w, h, name: o.name || o.title, fill: PAPER[o.paper ?? o.acc ?? 0] }); f.stroke = LINE; out.push(f); }
  if (band) out.push(shape(o.frame === false ? M : 0, o.frame === false ? 8 : 0, o.frame === false ? w - M * 2 : w, 140, { kind: o.frame === false ? "rounded" : "rect", fill: acc, stroke: acc, role }));
  const right = o.people === 0 && !o.chip ? 0 : 300;
  const tx = center ? M + right : band ? M + 8 : M + 96, tw = w - tx - M - right;
  if (!band && !center) out.push(...badge(M, 36, 76, o.icon || "bulb", acc, WHITE, { role }));
  out.push(txt(tx, 30, tw, o.title, fitSize(o.title, tw, center ? 54 : 52, 26), { bold: true, color: band ? WHITE : INK, role, align: center ? "center" : "left" }));
  if (o.sub) out.push(txt(tx + 2, 98, tw, o.sub, fitSize(o.sub, tw, 21, 13, false), { color: band ? "#eef0ff" : GREY, role, align: center ? "center" : "left" }));
  const n = o.people ?? 4;
  if (n) {
    const ppl = who(PEOPLE).slice(0, n), d = 50;
    ppl.forEach((p, i) => out.push(avatar(w - M - d - (n - 1 - i) * (d - 8), 34, d, p, band ? INK : A[(i + 1) % 6], { role, ring: band ? acc : WHITE })));
  }
  if (o.chip) { const cw = Math.round(textWidth(o.chip, 16, true) + 34); out.push(shape(w - M - cw, 98, cw, 38, { fill: band ? WHITE : TI[o.acc ?? 0], stroke: band ? WHITE : TI[o.acc ?? 0], text: o.chip, size: 16, bold: true, tc: INK, role })); }
  return out;
}
function hashOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** A white section card with a coloured header pill (icon inside). Returns { objs, x, y, w, h } (inner area). */
export function panel(x, y, w, h, title, o = {}) {
  const acc = o.fill || A[o.acc ?? 0], objs = [];
  objs.push(shape(x, y, w, h, { fill: o.bg || WHITE, stroke: o.bg ? o.bg : LINE, sw: 1.5 }));
  const ph = o.ph || 46;
  objs.push(pill(x + 12, y + 12, w - 24, ph, title, acc, { size: o.size || fitSize(title, w - 24 - (o.icon && w > 200 ? 90 : 30), 20, 13), tc: o.tc }));
  if (o.icon && w > 200) objs.push(icon(o.icon, x + 26, y + 12 + (ph - 24) / 2, 24, o.tc || WHITE));
  return { objs, x: x + 14, y: y + 12 + ph + 12, w: w - 28, h: h - ph - 38 };
}
/** Sticky notes in a grid inside a box: cols columns, square-ish notes. */
export function notesIn(box, texts, o = {}) {
  const cols = o.cols || 2, g = o.gap ?? 12, nw = Math.floor((box.w - g * (cols - 1)) / cols);
  const rows = Math.ceil(texts.length / cols), nh = o.nh || Math.min(o.maxh || nw, Math.floor((box.h - g * (rows - 1)) / Math.max(1, rows)));
  return texts.map((t, i) => note(box.x + (i % cols) * (nw + g), box.y + Math.floor(i / cols) * (nh + g), nw, nh, t, Array.isArray(o.color) ? o.color[i % o.color.length] : o.color || NOTES[i % NOTES.length], { size: o.size || 22, author: o.authors?.[i] }));
}
/** Even columns across the content area: returns [{ x, w }]. */
export function columns(n, x0 = M, x1 = W - M, g = 20) { const w = (x1 - x0 - g * (n - 1)) / n; return Array.from({ length: n }, (_, i) => ({ x: Math.round(x0 + i * (w + g)), w: Math.round(w) })); }
/** A table of shapes: header row in the accent colour, zebra rows. rows[0] = header. */
export function table(x, y, cw, rh, rows, o = {}) {
  const out = [], acc = o.acc || A[0];
  rows.forEach((r, ri) => {
    let cx = x;
    r.forEach((c, ci) => {
      const w = Array.isArray(cw) ? cw[ci] : cw, head = ri === 0, first = ci === 0 && o.firstCol;
      const fill = head ? acc : first ? (o.firstFill || TI[0]) : ri % 2 ? WHITE : (o.zebra || "#f6f7fb");
      out.push(shape(cx, y + ri * rh, w, rh, { kind: "rect", fill, stroke: head ? acc : LINE, sw: 1, text: String(c ?? ""), size: head ? o.hsize || 17 : o.size || 16, bold: head || first, tc: head ? WHITE : INK, align: o.align?.[ci] }));
      cx += w;
    });
  });
  return out;
}
/** Horizontal progress bar (track + fill + label). */
export function bar(x, y, w, h, pct, color = A[2], o = {}) {
  const out = [shape(x, y, w, h, { fill: o.track || "#eceef5", stroke: o.track || "#eceef5" })];
  if (pct > 0) out.push(shape(x, y, Math.max(h, w * Math.min(1, pct)), h, { fill: color, stroke: color }));
  if (o.label) out.push(txt(x + w + 10, y + h / 2 - 11, 70, o.label, 17, { bold: true, color: INK }));
  return out;
}
