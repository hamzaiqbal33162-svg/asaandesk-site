// Text panel (shared kit, every editor) in Canva's order: Search text and fonts; "Add a text box"; Write with AI;
// Brand Kit fonts (when the kit has its own); Default text styles (heading, subheading, body); Dynamic text (Page
// numbers, Captions); Font combinations (50 of our own, square tiles drawn as SVG with the fonts AsaanDesk ships:
// shared/brand.js FONT_FAMILIES).
// Click adds at the centre of the page, drag drops where you let go; both go through opts.insert (text / textGroup /
// pageNumber) with the shared fallbacks (panels/insert.js: svg -> image), and report window "ads-kit-insert".
// Our own wording, colours and drawings; English only. Write with AI: the editor's opts.magicWrite() when it has one,
// else on-device AI (shared/ai.js) when the browser has it, else an honest "coming soon" (never a fake result).
import { FONT_FAMILIES, loadBrand } from "../brand.js";
import { insertWithFallback, kitDrag, esc, ensureCss } from "./insert.js";

const PANEL = "text";
const CSS = new URL("./text-tools.css", import.meta.url).href;
// A font combination tile is 200 x 120 units; inserted, its 200 units span GROUP_REL of the page's shorter side.
export const GROUP_REL = 0.62;
const K = GROUP_REL / 200;
const r4 = (n) => Math.round(n * 10000) / 10000;
const fam = (f) => (FONT_FAMILIES[f] || FONT_FAMILIES.sans).css;

// ---------- font combinations: [id, name, search words, lines]; a line = [text, family, size, baseline y, style]
// style tokens: b bold · m medium · l light · i italic · u uppercase · L/R left/right aligned · ls.N letter spacing (em)
//               #hex colour · st#hex outline colour · sw.N outline width (em) · bg#hex box colour behind the line
const C = [
  ["summer-sale", "Summer sale", "sale shop offer discount bold", [["Summer", "sans", 34, 46, "b u ls.04 #ff7a59"], ["Sale", "sans", 46, 88, "b u"], ["Up to 50% off", "sans", 11, 108, "u ls.3 #657089"]]],
  ["grand-opening", "Grand opening", "opening shop event launch serif", [["Grand", "serif", 34, 48, "b u ls.06 #1e3a8a"], ["Opening", "serif", 28, 78, "i #1e3a8a"], ["Saturday · 10 am", "sans", 10, 102, "u ls.3 #657089"]]],
  ["save-the-date", "Save the date", "wedding date invitation elegant", [["Save the date", "cambria", 24, 48, "i #be185d"], ["14 · 02 · 2027", "serif", 20, 78, "ls.1"], ["Ayesha & Bilal", "sans", 10, 102, "u ls.3 #be185d"]]],
  ["fresh-coffee", "Fresh coffee", "cafe coffee food menu", [["Fresh coffee", "calibri", 13, 42, "u ls.4 #b45309"], ["Brewed Daily", "serif", 25, 76, "b #3b2314"], ["open 7 am to 10 pm", "calibri", 12, 100, "i #b45309"]]],
  ["tech-talk", "Tech talk", "tech event code webinar mono", [["Tech talk", "mono", 28, 50, "b u #5b4cf0"], ["Building for the web", "sans", 15, 76], ["Dec 3 · online", "mono", 10, 100, "u ls.2 #14b8a6"]]],
  ["quote", "Quote", "quote words inspiration serif", [["“", "serif", 40, 44, "b #5b4cf0"], ["Small steps every day", "serif", 16, 72, "i"], ["— A. Khan", "sans", 10, 98, "u ls.3 #657089"]]],
  ["thank-you", "Thank you", "thanks order shop card", [["Thank you", "cambria", 33, 64, "i #0f766e"], ["for your order", "sans", 11, 90, "u ls.35"]]],
  ["webinar", "Free webinar", "webinar business online event", [["Free webinar", "sans", 12, 40, "b u ls.3 #14b8a6"], ["Grow your shop", "sans", 20, 68, "b"], ["Online · 8 pm", "sans", 11, 94, "u ls.25 #657089"]]],
  ["eid", "Eid greeting", "eid greeting festival card", [["Eid Mubarak", "cambria", 27, 62, "b #0f766e"], ["Peace and blessings", "sans", 9, 86, "u ls.3 #b45309"]]],
  ["birthday", "Birthday", "birthday party kids card", [["Happy", "serif", 26, 44, "i #e11d48"], ["Birthday", "sans", 28, 78, "b u ls.06"], ["Sara turns 7!", "calibri", 13, 102, "#e11d48"]]],
  ["menu", "Today's menu", "food menu restaurant", [["Today's menu", "sans", 14, 40, "b u ls.25"], ["Chicken Karahi", "serif", 23, 70, "i #b45309"], ["Rs 950 · serves two", "calibri", 12, 96, "#657089"]]],
  ["explore", "Explore", "travel trip tour", [["Explore", "sans", 30, 54, "b u ls.12 #0ea5e9"], ["the northern valleys", "serif", 17, 80, "i"], ["7 days · from Rs 45,000", "sans", 9, 102, "u ls.1 #657089"]]],
  ["no-excuses", "No excuses", "fitness gym sport motivation", [["No excuses", "sans", 24, 56, "b u #e11d48"], ["just results", "calibri", 18, 82, "i"], ["Join today", "sans", 10, 104, "b u ls.4 #e11d48"]]],
  ["studio", "Studio", "minimal design interior light", [["studio", "sans", 30, 62, "l ls.25"], ["design & interiors", "serif", 13, 86, "i #657089"]]],
  ["weekly", "The weekly", "news newsletter magazine", [["The weekly", "serif", 24, 50, "b u"], ["news · notes · ideas", "sans", 11, 74, "ls.2 #657089"], ["Issue 12", "cambria", 14, 98, "i #5b4cf0"]]],
  ["for-rent", "For rent", "property rent house real estate", [["For rent", "sans", 28, 54, "b u ls.08 #16a34a"], ["3 bed · 2 bath · DHA", "calibri", 15, 80], ["Call 0300 1234567", "sans", 10, 102, "b ls.2 #16a34a"]]],
  ["couple", "Couple names", "wedding names couple elegant", [["Ayesha", "cambria", 28, 46, "i #be185d"], ["&", "serif", 18, 68, "i #b45309"], ["Bilal", "cambria", 28, 96, "i #be185d"]]],
  ["fun-fair", "Fun fair", "kids fair games outline", [["Fun", "serif", 30, 48, "b #f59e0b"], ["Fair", "sans", 34, 86, "b #0ea5e9 st#1b2133 sw.03"], ["kids · games · food", "calibri", 11, 106, "ls.2 #657089"]]],
  ["live-music", "Live music", "music concert night event", [["Live", "sans", 40, 62, "b u ls.15 #e11d48"], ["Music night", "sans", 14, 88, "u ls.4"]]],
  ["bold-ideas", "Bold ideas", "outline bold big modern", [["Bold", "sans", 44, 62, "b u ls.04 #ffffff st#1b2133 sw.04"], ["Ideas", "sans", 44, 104, "b u ls.04 #5b4cf0"]]],
  ["annual-report", "Annual report", "business report corporate", [["Annual report", "sans", 16, 50, "b u ls.12 #1e3a8a"], ["2026", "serif", 34, 86], ["Kashif Traders Ltd", "calibri", 11, 106, "#657089"]]],
  ["half-off", "Half off", "sale offer tag discount", [["50% off", "sans", 30, 60, "b #ffffff bg#e11d48"], ["this weekend only", "calibri", 14, 94, "i"]]],
  ["with-love", "With love", "love card greeting script", [["with love", "cambria", 34, 62, "i #e11d48"], ["from Lahore", "sans", 11, 88, "u ls.4 #657089"]]],
  ["chapter-one", "Chapter one", "story book typewriter mono", [["Chapter One", "mono", 22, 48, "b"], ["The letter that never came", "mono", 11, 72, "#657089"], ["— a short story", "mono", 10, 94, "i #5b4cf0"]]],
  ["make-it-simple", "Make it simple", "tagline slogan brand", [["Make it simple.", "sans", 19, 58, "b"], ["Make it yours.", "sans", 19, 84, "b #5b4cf0"]]],
  ["hiring", "We are hiring", "jobs hiring career work", [["We are", "sans", 14, 40, "b u ls.3 #657089"], ["Hiring", "sans", 36, 78, "b u ls.04 #14b8a6"], ["Apply at jobs@shop.pk", "calibri", 11, 102]]],
  ["learn-excel", "Learn Excel", "course class education learn", [["Learn Excel", "sans", 26, 54, "b #16a34a"], ["in 30 days", "serif", 20, 80, "i"], ["Free certificate", "sans", 10, 102, "u ls.3 #657089"]]],
  ["price", "Price", "price offer product shop", [["Rs 1,499", "serif", 36, 62, "b"], ["Only this month", "sans", 10, 88, "u ls.35 #ff7a59"]]],
  ["podcast", "Podcast", "podcast show audio episode", [["The morning show", "sans", 15, 46, "b u ls.04 #7c3aed"], ["Episode 24 · Money talk", "calibri", 14, 72], ["Listen now", "mono", 10, 96, "u ls.3 #7c3aed"]]],
  ["slow-living", "Slow living", "lifestyle blog magazine serif", [["The Art of", "serif", 22, 50, "i"], ["Slow living", "serif", 21, 82, "b u ls.05 #0f766e"]]],
  ["dream-big", "Dream big", "motivation quote poster", [["Dream", "sans", 34, 50, "b u ls.2 #5b4cf0"], ["Big", "sans", 34, 86, "b u ls.2 #ff7a59"], ["start small · keep going", "calibri", 11, 106, "i #657089"]]],
  ["invited", "You are invited", "invitation dinner event", [["You are invited", "sans", 11, 38, "u ls.3 #b45309"], ["Annual Dinner", "cambria", 22, 70, "b"], ["Friday, 8 pm · Pearl Hall", "calibri", 12, 96, "#657089"]]],
  ["cupcakes", "Cupcakes", "bakery cake food sweet", [["freshly baked", "serif", 16, 40, "i #b45309"], ["Cupcakes", "sans", 28, 74, "b u ls.06 #be185d"], ["order on WhatsApp", "calibri", 12, 98]]],
  ["go-green", "Go green", "eco nature environment", [["go green", "calibri", 34, 62, "b #16a34a"], ["one tree at a time", "serif", 15, 88, "i"]]],
  ["match-day", "Match day", "sport cricket football match", [["Final", "sans", 40, 54, "b u ls.02 #1e3a8a"], ["Match day", "sans", 18, 80, "b u ls.3 #f59e0b"], ["Sunday 4 pm · city stadium", "calibri", 10, 102, "#657089"]]],
  ["project-update", "Project update", "work business update report", [["Project update", "sans", 21, 56, "b L"], ["Week 46 · on track", "calibri", 14, 80, "L #14b8a6"]]],
  ["maison", "Maison", "fashion jewellery elegant luxury", [["Maison", "serif", 30, 60, "u ls.28"], ["fine jewellery", "cambria", 14, 86, "i #b45309"]]],
  ["new-collection", "New collection", "fashion shop new launch", [["New", "sans", 13, 38, "b u ls.4 #ffffff bg#5b4cf0"], ["Collection", "serif", 30, 74, "b"], ["autumn / winter 2026", "calibri", 11, 98, "ls.1 #657089"]]],
  ["admissions", "Admissions open", "school admission education", [["Admissions", "sans", 24, 50, "b u #0ea5e9"], ["Open", "sans", 34, 86, "b u ls.2"], ["Class 1 to Matric · 2027", "calibri", 11, 106, "#657089"]]],
  ["retro", "Retro weekend", "retro vintage outline fun", [["Retro", "sans", 36, 58, "b u ls.06 #f59e0b st#1b2133 sw.03"], ["Weekend", "serif", 24, 88, "i #e11d48"]]],
  ["how-to", "How to", "tutorial guide steps", [["How to", "mono", 14, 40, "b ls.1 #14b8a6"], ["Bake Bread", "sans", 28, 72, "b"], ["in 5 easy steps", "serif", 15, 96, "i #657089"]]],
  ["contact", "Get in touch", "contact email phone business", [["Get in touch", "sans", 16, 46, "b u ls.18"], ["hello@asaan.pk", "calibri", 16, 72, "#5b4cf0"], ["+92 300 1234567", "mono", 12, 94, "#657089"]]],
  ["limited", "Limited edition", "product limited launch", [["Limited", "sans", 30, 52, "b u ls.04"], ["Edition", "serif", 30, 86, "i #e11d48"]]],
  ["style", "Style", "fashion style light minimal", [["Style", "sans", 34, 62, "l u ls.3"], ["new arrivals", "cambria", 16, 88, "i #be185d"]]],
  ["give-hope", "Give hope", "charity donation help", [["Give hope", "cambria", 30, 54, "b #0f766e"], ["Donate today", "sans", 12, 80, "b u ls.3 #ffffff bg#0f766e"], ["every rupee counts", "calibri", 12, 104, "i #657089"]]],
  ["level-up", "Level up", "gaming game night", [["Level up", "sans", 30, 58, "b u #7c3aed"], ["Game night · Friday", "mono", 10, 84, "u ls.2 #14b8a6"]]],
  ["doctor", "Doctor", "doctor clinic health medical", [["Dr. Sana Malik", "serif", 20, 50, "b #1e3a8a"], ["Family physician", "calibri", 14, 74, "i"], ["Mon–Sat · 5–9 pm", "sans", 10, 96, "u ls.25 #0ea5e9"]]],
  ["farm-fresh", "Farm fresh", "farm organic food market", [["Farm fresh", "serif", 28, 56, "b #16a34a"], ["Organic · local · daily", "sans", 9, 80, "u ls.15 #b45309"]]],
  ["simple-title", "Simple title", "simple title heading basic", [["Your title", "sans", 28, 56, "b L"], ["A short line of supporting text", "calibri", 10, 78, "L #657089"]]],
  ["support", "Big number", "number stat support service", [["24/7", "sans", 46, 70, "b #5b4cf0"], ["Support", "sans", 12, 96, "u ls.5"]]],
];
function line([t, f, s, y, style = ""]) {
  const o = { t, f, s, y, w: 400, i: false, ls: 0, up: false, c: "#1b2133", a: "center", st: "", sw: 0, bg: "" };
  for (const k of style.split(/\s+/).filter(Boolean)) {
    if (k === "b") o.w = 700; else if (k === "m") o.w = 500; else if (k === "l") o.w = 300; else if (k === "i") o.i = true; else if (k === "u") o.up = true;
    else if (k === "L") o.a = "left"; else if (k === "R") o.a = "right";
    else if (k.startsWith("ls")) o.ls = +k.slice(2); else if (k.startsWith("sw")) o.sw = +k.slice(2);
    else if (k.startsWith("st#")) o.st = k.slice(2); else if (k.startsWith("bg#")) o.bg = k.slice(2); else if (k[0] === "#") o.c = k;
  }
  if (o.up) o.t = o.t.toUpperCase();
  return o;
}
export const COMBOS = C.map(([id, name, words, lines]) => ({ id, name, words, lines: lines.map(line) }));

/** Rough width of a line in tile units (for the box behind a line and the tests' "fits in the tile" check). */
export function estWidth(l) {
  const n = [...l.t].length, caps = l.t === l.t.toUpperCase() && /[A-Z]/.test(l.t);
  const per = l.f === "mono" ? 0.6 : caps ? (l.w >= 600 ? 0.72 : 0.68) : (l.f === "serif" || l.f === "cambria") ? (l.i ? 0.48 : 0.53) : (l.w >= 600 ? 0.58 : 0.53);
  return n * l.s * per + l.ls * l.s * Math.max(0, n - 1);
}
const lineBox = (l) => ({ top: l.y - l.s * 0.8 - (l.bg ? l.s * 0.22 : 0), bot: l.y + l.s * 0.24 + (l.bg ? l.s * 0.2 : 0) });
function bounds(lines) { const bs = lines.map(lineBox); return { top: Math.min(...bs.map((b) => b.top)), bot: Math.max(...bs.map((b) => b.bot)) }; }
const lineX = (l) => (l.a === "left" ? 14 : l.a === "right" ? 186 : 100);
function lineSvg(l) {
  const x = lineX(l), anchor = l.a === "left" ? "start" : l.a === "right" ? "end" : "middle";
  let out = "";
  if (l.bg) { const w = estWidth(l) + l.s * 0.9, x0 = l.a === "left" ? x - l.s * 0.45 : l.a === "right" ? x - w + l.s * 0.45 : x - w / 2; out += `<rect x="${r4(x0)}" y="${r4(l.y - l.s * 0.98)}" width="${r4(w)}" height="${r4(l.s * 1.3)}" rx="${r4(l.s * 0.18)}" fill="${l.bg}"/>`; }
  out += `<text x="${x}" y="${l.y}" text-anchor="${anchor}" font-family="${esc(fam(l.f))}" font-size="${l.s}" font-weight="${l.w}"${l.i ? ' font-style="italic"' : ""}${l.ls ? ` letter-spacing="${r4(l.ls * l.s)}"` : ""} fill="${l.c}"${l.st ? ` stroke="${l.st}" stroke-width="${r4(Math.max(0.6, l.sw * l.s))}" stroke-linejoin="round"` : ""}>${esc(l.t)}</text>`;
  return out;
}
/** SVG of a combination: tile = the square panel preview (content centred); else the tight drawing (svg/image fallback). */
export function comboSvg(c, { tile = true } = {}) {
  const b = bounds(c.lines), h = b.bot - b.top + 8;
  const head = tile ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${r4((b.top + b.bot) / 2 - 100)} 200 200" aria-hidden="true" focusable="false">`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 ${r4(b.top - 4)} 188 ${r4(h)}" width="${Math.round(188 * 3)}" height="${Math.round(h * 3)}">`;
  return head + c.lines.map(lineSvg).join("") + "</svg>";
}
const ROLE = (l, max) => (l.s === max ? "heading" : l.s >= 16 ? "subheading" : l.s >= 12 ? "body" : "caption");
/** The text boxes of a combination for insert.textGroup: sizes and offsets relative to the page's shorter side. */
export function comboSpecs(c) {
  const b = bounds(c.lines), gc = (b.top + b.bot) / 2, max = Math.max(...c.lines.map((l) => l.s));
  return c.lines.map((l, i) => {
    const s = { content: l.t, role: ROLE(l, max), rel: r4(l.s * K), family: l.f, bold: l.w >= 600, weight: l.w, italic: l.i, color: l.c, align: l.a, letterSpacing: l.ls, lineHeight: 1.15, uppercase: l.up, dx: 0, dy: r4((l.y - l.s * 0.32 - gc) * K), width: r4(176 * K), name: `${c.name} ${i + 1}` };
    if (l.st) { s.stroke = l.st; s.strokeWidth = l.sw; }
    if (l.bg) s.background = l.bg;
    return s;
  });
}
const comboMeta = (c) => { const b = bounds(c.lines), h = b.bot - b.top + 8; return { rel: r4(Math.max(188, h) * K), aspect: r4(188 / h) }; };

// ---------- single text boxes (defaults, brand fonts, captions, Write with AI results)
export const STYLES = {
  heading: { label: "Add a heading", content: "Your heading", role: "heading", rel: 0.075, family: "sans", bold: true },
  subheading: { label: "Add a subheading", content: "Your subheading", role: "subheading", rel: 0.045, family: "sans", bold: true },
  body: { label: "Add a little bit of body text", content: "Your body text goes here.", role: "body", rel: 0.03, family: "sans" },
};
export const TEXT_BOX = { content: "Your text here", role: "body", rel: 0.03, family: "sans" };
export const CAPTION = { content: "Your caption text", role: "caption", rel: 0.032, family: "sans", bold: true, color: "#ffffff", background: "#1b2133", align: "center" };
/** SVG drawing of one text box (fallback for editors without insert.text). Units: 1000 = the page's shorter side. */
export function textSvg(spec) {
  const s = Math.max(8, (spec.rel || 0.03) * 1000), lines = String(spec.content ?? "").split("\n");
  const l0 = { t: "", f: spec.family || "sans", s, w: spec.weight || (spec.bold ? 700 : 400), i: !!spec.italic, ls: spec.letterSpacing || 0 };
  const content = lines.map((t) => (spec.uppercase ? t.toUpperCase() : t));
  const w = Math.max(s, ...content.map((t) => estWidth({ ...l0, t }))) + s * (spec.background ? 1 : 0.3), lh = s * (spec.lineHeight || 1.2), h = lh * lines.length + s * 0.45;
  const x = spec.align === "left" ? s * 0.15 : spec.align === "right" ? w - s * 0.15 : w / 2, anchor = spec.align === "left" ? "start" : spec.align === "right" ? "end" : "middle";
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r4(w)} ${r4(h)}" width="${Math.round(w)}" height="${Math.round(h)}">`;
  if (spec.background) out += `<rect width="${r4(w)}" height="${r4(h)}" rx="${r4(s * 0.2)}" fill="${spec.background}"/>`;
  content.forEach((t, i) => { out += `<text x="${r4(x)}" y="${r4(lh * i + s * 1.02)}" text-anchor="${anchor}" font-family="${esc(fam(l0.f))}" font-size="${r4(s)}" font-weight="${l0.w}"${l0.i ? ' font-style="italic"' : ""}${l0.ls ? ` letter-spacing="${r4(l0.ls * s)}"` : ""} fill="${spec.color || "#1b2133"}"${spec.stroke ? ` stroke="${spec.stroke}" stroke-width="${r4((spec.strokeWidth || 0.03) * s)}"` : ""}>${esc(t)}</text>`; });
  return { svg: out + "</svg>", rel: r4(Math.max(w, h) / 1000), aspect: r4(w / h) };
}
function pageNumberSvg(n) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><text x="60" y="78" text-anchor="middle" font-family="${esc(fam("sans"))}" font-size="56" font-weight="700" fill="#1b2133">${n}</text></svg>`; }

// ---------- inserting (click = centre of the page; drag = drop point through the shell's dropKit route)
export function textItem(spec, meta) { const t = textSvg(spec); return { kit: "text", spec, svg: t.svg, opts: { panel: PANEL, name: spec.name || spec.content?.slice(0, 40) || "Text", rel: t.rel, aspect: t.aspect, ...meta } }; }
function comboItem(c) { return { kit: "textGroup", spec: comboSpecs(c), svg: comboSvg(c, { tile: false }), opts: { panel: PANEL, category: "combos", item: c.id, name: c.name, ...comboMeta(c) } }; }
export async function run(ctx, el, item, pt) {
  el?.classList.add("busy");
  try {
    const r = await insertWithFallback(ctx, item.kit, item.spec, pt, { ...item.opts, svg: () => item.svg });
    if (!r.ok) ctx.toast?.(r.error || "Could not add it here.");
    return r;
  } finally { el?.classList.remove("busy"); }
}
/** Click and drag for one panel item: make() builds {kit, spec, svg, opts} (also on dragstart, so the DOM stays light). */
export function insertable(ctx, el, make) {
  el.addEventListener("click", () => run(ctx, el, make()));
  kitDrag(el, { kit: "text", lazy: true });
  el.addEventListener("dragstart", () => el.setAttribute("data-ads-drag", JSON.stringify(make())));
  return el;
}

// ---------- DOM helpers
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k === "text") e.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const I = {
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.8 4.8"/>',
  t: '<path d="M5.5 7V5h13v2M12 5v14M9.3 19h5.4"/>',
  wand: '<path d="m4.5 19.5 10-10M13 8l3 3"/><path d="M17.5 3.5v3M16 5h3M20 9.5v2M19 10.5h2M10 3.5v2M9 4.5h2"/>',
  edit: '<path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
};
const ic = (n) => `<svg class="ads-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[n]}</svg>`;
export function section(id, title, ...extra) {
  const head = h("div", { class: "kt-shead" }, h("h3", { class: "ads-h3 kt-h3", text: title }), ...extra);
  return h("section", { class: "kt-sec", "data-kit-sec": id, "aria-label": title }, head);
}
export const seeAll = (label, onclick) => h("button", { type: "button", class: "kt-seeall", text: label, onclick });

// Thumbnails for Dynamic text: our own small drawings.
const THUMB = {
  captions: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ktcap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f80ff"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><rect width="64" height="64" rx="12" fill="url(#ktcap)"/><circle cx="32" cy="24" r="9" fill="#fff" opacity=".35"/><rect x="10" y="42" width="44" height="7" rx="3.5" fill="#fff"/><rect x="16" y="52" width="32" height="5" rx="2.5" fill="#fff" opacity=".7"/></svg>',
  pages: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#fff4e8"/><rect x="9" y="8" width="30" height="40" rx="4" fill="#ff7a59"/><rect x="25" y="16" width="30" height="40" rx="4" fill="#5b4cf0"/><text x="40" y="44" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#fff">2</text><text x="17" y="27" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#fff">1</text></svg>',
};

// ---------- the panel
export function renderText(box, ctx) {
  ensureCss(CSS);
  const opts = ctx.opts || {};
  const root = h("div", { class: "kt-root kt-text" });
  box.append(root);

  // Search text and fonts
  const q = h("input", { type: "search", class: "ads-search-in", placeholder: "Search text and fonts", "aria-label": "Search text and fonts", "data-kit": "search", autocomplete: "off" });
  const searchRow = h("label", { class: "ads-search kt-search", html: ic("search") }, q);
  root.append(searchRow);

  // Add a text box + Write with AI
  const addBox = h("button", { type: "button", class: "kt-addbox", "data-kit-item": "add-text-box", "aria-label": "Add a text box", html: ic("t") + "<span>Add a text box</span>" });
  insertable(ctx, addBox, () => textItem(TEXT_BOX, { category: "add", item: "add-text-box", name: "Text box" }));
  const mwBtn = h("button", { type: "button", class: "kt-mw", "data-kit": "magic-write", "aria-expanded": "false", html: ic("wand") + "<span>Write with AI</span>" });
  const mwBox = magicWriteBox(ctx);
  mwBtn.addEventListener("click", () => {
    if (typeof opts.magicWrite === "function") { try { opts.magicWrite(); } catch (e) { ctx.toast?.(e?.message || "Write with AI could not open."); } return; }
    mwBox.hidden = !mwBox.hidden; mwBtn.setAttribute("aria-expanded", String(!mwBox.hidden));
    if (!mwBox.hidden) mwBox.querySelector("textarea")?.focus();
  });
  root.append(h("div", { class: "kt-top", "data-kit-sec": "add" }, addBox, mwBtn), mwBox);

  // Search results: fonts (shown only while searching)
  const fontsSec = section("font-results", "Fonts");
  fontsSec.classList.add("kt-only-search");
  const fontList = h("div", { class: "kt-fonts" });
  fontsSec.append(fontList);
  for (const [key, f] of Object.entries(FONT_FAMILIES)) {
    for (const [st, bold, italic] of [["Regular", false, false], ["Bold", true, false], ["Italic", false, true], ["Bold italic", true, true]]) {
      const label = `${f.label.replace(/ \(.*\)$/, "")} ${st}`;
      const b = h("button", { type: "button", class: "kt-font", "data-kit-item": `font-${key}-${st.replace(" ", "-").toLowerCase()}`, "data-search": `${f.label} ${key} ${st} font`, style: `font-family:${f.css};font-weight:${bold ? 700 : 400};font-style:${italic ? "italic" : "normal"}` }, h("span", { text: label }));
      insertable(ctx, b, () => textItem({ content: label, role: "body", rel: 0.04, family: key, bold, italic }, { category: "fonts", item: `${key}-${st}` }));
      fontList.append(b);
    }
  }
  root.append(fontsSec);

  // Brand Kit fonts
  const kit = loadBrand();
  const bf = { heading: kit.fonts?.heading || "sans", subheading: kit.fonts?.subheading || kit.fonts?.heading || "sans", body: kit.fonts?.body || "sans" };
  const brandSec = section("brand-fonts", "Brand Kit fonts", seeAll("Edit", () => ctx.openPanel?.("brand")));
  const ownFonts = Object.values(bf).some((f) => f !== "sans") || (kit.name && kit.name !== "My brand");
  brandSec.querySelector(".kt-shead").append(h("small", { class: "kt-kitname", text: kit.name || "My brand" }));
  for (const role of ["heading", "subheading", "body"]) {
    const st = STYLES[role], f = FONT_FAMILIES[bf[role]] || FONT_FAMILIES.sans;
    const b = h("button", { type: "button", class: `kt-style kt-${role}`, "data-kit-item": `brand-${role}`, "data-search": `brand ${role} ${f.label}`, style: `font-family:${f.css}` }, h("span", { text: role === "body" ? "Body text" : role === "heading" ? "Heading" : "Subheading" }), h("small", { text: f.label }));
    insertable(ctx, b, () => textItem({ ...st, family: bf[role], color: kit.colors?.[3] && role !== "body" ? kit.colors[3] : undefined }, { category: "brand-fonts", item: `brand-${role}` }));
    brandSec.append(b);
  }
  if (ownFonts) root.append(brandSec);

  // Default text styles
  const defSec = section("default-styles", "Default text styles");
  for (const [id, st] of Object.entries(STYLES)) {
    const b = h("button", { type: "button", class: `kt-style kt-${id}`, "data-kit-item": id, "data-search": `default ${id} ${st.label}`, style: `font-family:${fam("sans")}` }, h("span", { text: st.label }));
    insertable(ctx, b, () => textItem(st, { category: "default-styles", item: id }));
    defSec.append(b);
  }
  root.append(defSec);

  // Dynamic text: Captions + Page numbers
  const dynSec = section("dynamic", "Dynamic text");
  const capB = h("button", { type: "button", class: "kt-dyn", "data-kit-item": "captions", "data-search": "captions subtitles dynamic", html: `<span class="kt-dthumb">${THUMB.captions}</span>` }, h("span", { class: "kt-dtext" }, h("b", { text: "Captions" }), h("small", { text: typeof opts.captions === "function" ? "Captions for your video" : "A caption text box" })));
  if (typeof opts.captions === "function") capB.addEventListener("click", () => { try { opts.captions(); } catch (e) { ctx.toast?.(e?.message || "Captions could not open."); } });
  else insertable(ctx, capB, () => textItem(CAPTION, { category: "dynamic", item: "captions", name: "Caption" }));
  const pnB = h("button", { type: "button", class: "kt-dyn", "data-kit-item": "page-numbers", "data-search": "page numbers dynamic", html: `<span class="kt-dthumb">${THUMB.pages}</span>` }, h("span", { class: "kt-dtext" }, h("b", { text: "Page numbers" }), h("small", { text: "Numbers that follow the page" })));
  const pageItem = () => { let n = 1; try { n = (opts.bottom?.pages?.current?.() ?? 0) + 1; } catch {} const svg = pageNumberSvg(n); return { kit: "pageNumber", spec: { content: String(n), role: "caption", rel: 0.05, align: "center", name: "Page number" }, svg, opts: { panel: PANEL, category: "dynamic", item: "page-numbers", name: "Page number", rel: 0.06, aspect: 1 } }; };
  insertable(ctx, pnB, pageItem);
  dynSec.append(pnB, capB);
  root.append(dynSec);

  // Font combinations (all of them in the panel, like Canva's long grid)
  const combSec = section("combos", "Font combinations");
  const grid = h("div", { class: "kt-combos" });
  for (const c of COMBOS) {
    const b = h("button", { type: "button", class: "kt-combo", "data-kit-item": `combo-${c.id}`, "data-search": `${c.name} ${c.words} ${[...new Set(c.lines.map((l) => FONT_FAMILIES[l.f]?.label || l.f))].join(" ")} ${c.lines.map((l) => l.t).join(" ")}`, "aria-label": `Add the font combination ${c.name}`, title: c.name, html: comboSvg(c) });
    insertable(ctx, b, () => comboItem(c));
    grid.append(b);
  }
  combSec.append(grid);
  root.append(combSec);

  // The editor's own text tools (if any) as one more section
  if (ctx.own) {
    // The section's own name (kitLabel / title); "label" is the rail button's name, so only a non-"Text" label is used.
    const own = section("own", ctx.ownMeta?.kitLabel || ctx.ownMeta?.title || (ctx.ownMeta?.label && ctx.ownMeta.label !== "Text" ? ctx.ownMeta.label : "More text tools"));
    const host = h("div", { class: "kt-own" }); own.append(host); root.append(own);
    try { ctx.own(host); } catch (e) { console.error(e); }
    if (!host.childNodes.length) own.remove();
  }

  const none = h("p", { class: "ads-muted kt-none", hidden: true, "data-kit": "no-results", text: "No fonts or combinations match. Try another word." });
  root.append(none);
  q.addEventListener("input", () => {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    root.classList.toggle("kt-searching", !!words.length);
    let any = 0;
    for (const el of root.querySelectorAll("[data-search]")) {
      const t = (el.dataset.search || "").toLowerCase();
      const ok = !words.length || words.every((w) => t.includes(w));
      el.classList.toggle("kt-hide", !ok); if (ok && words.length && el.closest(".kt-sec")) any++;
    }
    for (const sec of root.querySelectorAll(".kt-sec")) sec.classList.toggle("kt-hide", !!words.length && !sec.querySelector("[data-search]:not(.kt-hide)"));
    none.hidden = !words.length || any > 0;
  });
  return root;
}

// ---------- Write with AI box (when the editor has no opts.magicWrite)
function magicWriteBox(ctx) {
  const ta = h("textarea", { class: "ads-ta kt-mwin", rows: 3, placeholder: "Describe what to write, for example: a short tagline for a bakery", "aria-label": "What should the AI write?" });
  const status = h("p", { class: "ads-muted kt-mwstatus", role: "status", "aria-live": "polite" });
  const out = h("div", { class: "kt-mwout", hidden: true });
  const add = h("button", { type: "button", class: "ads-btn sm primary", text: "Add to design", "data-kit-item": "magic-write-result" });
  const again = h("button", { type: "button", class: "ads-btn sm", text: "Try again" });
  const actions = h("div", { class: "ads-row", hidden: true }, add, again);
  const go = h("button", { type: "button", class: "ads-btn primary kt-mwgo", text: "Write for me" });
  const chips = h("div", { class: "kt-mwchips" }, ["A tagline for a bakery", "Three tips for saving money", "A welcome line for a newsletter"].map((t) => h("button", { type: "button", class: "ads-fchip", text: t, onclick: () => { ta.value = t; ta.focus(); } })));
  const box = h("div", { class: "kt-mwbox", hidden: true, "data-kit-sec": "magic-write", role: "group", "aria-label": "Write with AI" }, ta, chips, go, status, out, actions);
  const write = async () => {
    const prompt = ta.value.trim();
    if (!prompt) { status.textContent = "Describe what to write first."; ta.focus(); return; }
    go.disabled = true; again.disabled = true; status.textContent = "Checking for writing AI on this device…"; box.classList.remove("kt-soon");
    try {
      const { aiText } = await import("../ai.js");
      const kit = loadBrand();
      const text = await aiText("write", prompt, { context: kit.voice ? `Brand voice: ${kit.voice}` : "", onStatus: (s) => { status.textContent = s; } });
      out.textContent = text; out.hidden = false; actions.hidden = false; status.textContent = "Written on this device. Nothing was sent anywhere.";
    } catch (e) {
      out.hidden = true; actions.hidden = true;
      if (e?.code === "AI_UNAVAILABLE") { box.classList.add("kt-soon"); status.textContent = "Coming soon: writing with AI needs AsaanDesk AI. In recent desktop Chrome with on-device AI it works right here. Nothing was sent anywhere."; }
      else status.textContent = (e?.message || "Writing with AI did not work here.") + " Nothing was sent anywhere.";
    } finally { go.disabled = false; again.disabled = false; }
  };
  go.addEventListener("click", write); again.addEventListener("click", write);
  add.addEventListener("click", () => { const t = out.textContent.trim(); if (t) run(ctx, add, textItem({ content: t, role: "body", rel: 0.03, family: "sans", width: 0.7 }, { category: "magic-write", item: "magic-write-result", name: "AI text" })); });
  return box;
}
