// Elements kit: the catalogue. Every category of Canva's Elements panel, filled with our own (or CC0) assets, as one
// item model the panel draws and inserts:
//   item {id: "cat/local", cat, sec, name, tags, kind: insert kind (shape svg image chart table frame grid video audio),
//         thumb() -> SVG markup | thumbUrl, aspect (w/h), spec, svgKind, elementId, animated, duration, credit, …}
//   CATEGORIES [{id, label, tile, flat, note, load() -> sections [{id, label, items}]}], loadAll(), search(q), itemById()
// Heavy libraries load only when a category needs them (/pdf-editor/elements.js for Graphics/Stickers/Icons, the CC0
// PHOTOS set for Photos).
import { shapeSvg, frameSvg, gridSvg, chartSvg, tableSvg, svgDoc, ptsPath, starPts, n } from "./assets-svg.js";

const tags = (...xs) => xs.flat().join(" ").toLowerCase();
const VB = (spec) => spec.vb || [100, 100];

// ---------- category tiles (our own icons: a coloured rounded card over a tilted lighter card)
function tile(c1, c2, glyph) {
  return svgDoc(64, 64, `<rect x="12" y="6" width="46" height="46" rx="11" fill="${c2}" transform="rotate(9 35 29)"/><rect x="7" y="11" width="46" height="46" rx="11" fill="url(#t)"/><g transform="translate(7 11)">${glyph}</g>`,
    { px: 64, defs: `<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` });
}
const W = "#fff";
const TILES = {
  shapes: tile("#2dd4bf", "#0e7490", `<path d="${ptsPath([[30, 9], [40, 26], [20, 26]])}" fill="${W}"/><circle cx="15" cy="16" r="7" fill="#ccfbf1"/><rect x="24" y="29" width="13" height="13" rx="2" fill="#99f6e4"/><circle cx="12" cy="36" r="2" fill="${W}"/><circle cx="18" cy="36" r="2" fill="${W}"/>`),
  graphics: tile("#fb923c", "#ea580c", `<g transform="translate(23 21)">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-9" rx="5.5" ry="8" fill="#fde047" transform="rotate(${a})"/>`).join("")}<circle r="6.5" fill="#92400e"/></g><path d="M23 30V43M23 38Q16 34 13 37M23 36Q30 32 33 35" stroke="#16a34a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
  photos: tile("#60a5fa", "#2563eb", `<rect x="9" y="10" width="28" height="26" rx="3" fill="${W}"/><rect x="12" y="13" width="22" height="16" fill="#bfdbfe"/><circle cx="29" cy="17" r="2.6" fill="#fde047"/><path d="M12 29L19 21L25 27L28 24L34 29Z" fill="#16a34a"/>`),
  videos: tile("#e879f9", "#a21caf", `<circle cx="23" cy="23" r="13" fill="${W}" fill-opacity=".95"/><path d="M19.5 16.5V29.5L30 23Z" fill="#a21caf"/>`),
  "3d": tile("#c084fc", "#7e22ce", `<path d="${ptsPath([[23, 8], [37, 16], [23, 24], [9, 16]])}" fill="#e9d5ff"/><path d="${ptsPath([[9, 16], [23, 24], [23, 39], [9, 31]])}" fill="#a855f7"/><path d="${ptsPath([[23, 24], [37, 16], [37, 31], [23, 39]])}" fill="#6b21a8"/>`),
  forms: tile("#4ade80", "#15803d", `<rect x="8" y="10" width="30" height="10" rx="5" fill="${W}"/><circle cx="14" cy="15" r="3" fill="#15803d"/><rect x="8" y="25" width="30" height="11" rx="5.5" fill="#166534"/><path d="M15 30.5L18 33.5L24 27.5" stroke="${W}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  animations: tile("#34d399", "#047857", `<circle cx="23" cy="23" r="13" fill="#fde047"/><circle cx="18.5" cy="20" r="1.8" fill="#4a2f1b"/><circle cx="27.5" cy="20" r="1.8" fill="#4a2f1b"/><path d="M17 26Q23 31 29 26" stroke="#4a2f1b" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M38 11L41 8M39 17H43" stroke="${W}" stroke-width="2" stroke-linecap="round"/>`),
  audio: tile("#fb7185", "#be123c", `<path d="M18 31V13L33 10V28" stroke="${W}" stroke-width="3" fill="none" stroke-linejoin="round"/><ellipse cx="15" cy="31" rx="4.6" ry="3.6" fill="${W}"/><ellipse cx="30" cy="28" rx="4.6" ry="3.6" fill="${W}"/>`),
  sheets: tile("#60a5fa", "#1d4ed8", `<rect x="8" y="9" width="30" height="28" rx="3" fill="${W}"/><rect x="8" y="9" width="30" height="7" rx="2" fill="#bfdbfe"/><path d="M8 23H38M8 30H38M18 9V37M28 9V37" stroke="#93c5fd" stroke-width="1.4"/><text x="11" y="15" font-family="Arial" font-size="5.5" font-weight="bold" fill="#1d4ed8">fx</text>`),
  tables: tile("#fb923c", "#c2410c", `<rect x="8" y="10" width="30" height="27" rx="2.5" fill="${W}"/><rect x="8" y="10" width="30" height="7" rx="2" fill="#fdba74"/><path d="M8 24H38M8 30.5H38M18 10V37M28 10V37" stroke="#fdba74" stroke-width="1.6"/>`),
  charts: tile("#2dd4bf", "#4f46e5", `<rect x="8" y="9" width="30" height="28" rx="3" fill="${W}" fill-opacity=".9"/><path d="M12 32L19 22L25 27L34 14" stroke="#7c3aed" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 33L19 26L25 30L34 20V34H12Z" fill="#a78bfa" fill-opacity=".5"/>`),
  frames: tile("#4ade80", "#047857", `<path d="${(() => { let d = ""; for (let i = 0; i < 12; i++) { const a0 = (i / 12) * 6.283, a1 = ((i + 1) / 12) * 6.283, am = (a0 + a1) / 2; d += (i ? "" : `M${n(23 + 14 * Math.cos(a0))} ${n(23 + 14 * Math.sin(a0))}`) + `Q${n(23 + 18.5 * Math.cos(am))} ${n(23 + 18.5 * Math.sin(am))} ${n(23 + 14 * Math.cos(a1))} ${n(23 + 14 * Math.sin(a1))}`; } return d + "Z"; })()}" fill="${W}"/><circle cx="23" cy="23" r="12" fill="#bae6fd"/><path d="M11.5 26Q18 20 24 25T34.5 25A12 12 0 0 1 11.5 26Z" fill="#16a34a"/>`),
  grids: tile("#38bdf8", "#0369a1", `<rect x="8" y="8" width="14" height="14" rx="2" fill="${W}"/><rect x="24" y="8" width="14" height="14" rx="2" fill="#e0f2fe"/><rect x="8" y="24" width="14" height="14" rx="2" fill="#e0f2fe"/><rect x="24" y="24" width="14" height="14" rx="2" fill="${W}"/>`),
  mockups: tile("#fbbf24", "#d97706", `<path d="M16 9L9 13L6 21L11 23L13 20V38H33V20L35 23L40 21L37 13L30 9Q23 14 16 9Z" fill="${W}"/><rect x="17" y="21" width="12" height="9" rx="1.5" fill="#fcd34d"/>`),
  stickers: tile("#f472b6", "#be185d", `<path d="${ptsPath(starPts(5, 23, 24, 15, 6.8))}" fill="#fde047"/><path d="M30 36L37 29Q38 36 30 36Z" fill="${W}"/>`),
  icons: tile("#818cf8", "#4338ca", `<path d="M23 10A9 9 0 0 1 28.5 26V30H17.5V26A9 9 0 0 1 23 10Z" fill="${W}"/><rect x="18" y="32" width="10" height="3" rx="1.5" fill="${W}"/>`),
  collections: tile("#a78bfa", "#6d28d9", `<rect x="9" y="12" width="17" height="17" rx="3" fill="#ede9fe"/><circle cx="31" cy="18" r="7" fill="${W}"/><path d="${ptsPath([[23, 27], [31, 39], [15, 39]])}" fill="#ddd6fe"/>`),
  ai: tile("#94a3b8", "#475569", `<path d="M12 36L30 18" stroke="${W}" stroke-width="3" stroke-linecap="round"/><path d="M33 8C34 13 35 14 40 15C35 16 34 17 33 22C32 17 31 16 26 15C31 14 32 13 33 8Z" fill="#fde047"/>`),
};

// ---------- loaders per category
const mk = (cat, sec, it, extra) => ({ cat, sec, ...it, id: `${cat}/${it.id}`, local: it.id, tags: tags(it.name, it.tags || "", sec.id), ...extra });
async function shapes() {
  const { SHAPE_SECTIONS } = await import("./assets-shapes.js");
  return SHAPE_SECTIONS.map((s) => ({ ...s, items: s.items.map((it) => mk("shapes", s, it, { kind: "shape", line: !!it.line, aspect: VB(it.spec)[0] / VB(it.spec)[1], rel: it.line ? 0.45 : 0.3, thumb: () => shapeSvg(it.spec, 120) })) }));
}
async function frames() {
  const { FRAME_SECTIONS } = await import("./assets-frames.js");
  return FRAME_SECTIONS.map((s) => ({ ...s, items: s.items.map((it) => mk("frames", s, it, { kind: "frame", aspect: VB(it.spec)[0] / VB(it.spec)[1], rel: 0.45, thumb: () => frameSvg(it.spec, 160) })) }));
}
// Sub-sections for every category (Canva shows each as one row with See all). defs: [id, label, local ids or a test];
// anything left over goes into the last section.
function group(cat, items, defs, make) {
  const left = new Set(items.map((x) => x.id)), out = [];
  for (const [id, label, pick] of defs) {
    const s = { id, label };
    const mine = items.filter((x) => left.has(x.id) && (Array.isArray(pick) ? pick.includes(x.id) : pick(x)));
    for (const x of mine) left.delete(x.id);
    out.push({ ...s, items: mine.map((x) => make(s, x)) });
  }
  const last = out.at(-1); for (const x of items) if (left.has(x.id)) last.items.push(make(last, x));
  return out.filter((s) => s.items.length);
}
async function grids() {
  const { GRID_ITEMS } = await import("./assets-frames.js");
  return group("grids", GRID_ITEMS, [["one-two", "One and two photos", (x) => x.spec.cells.length <= 2], ["three", "Three photos", (x) => x.spec.cells.length === 3], ["four", "Four photos", (x) => x.spec.cells.length === 4], ["five-six", "Five and six photos", (x) => x.spec.cells.length <= 6], ["many", "Many photos", () => true]],
    (s, it) => mk("grids", s, it, { kind: "grid", aspect: 1, rel: 1, thumb: () => gridSvg(it.spec, 160) }));
}
async function charts() {
  const { CHART_SECTIONS } = await import("./assets-data.js");
  return CHART_SECTIONS.map((s) => ({ ...s, items: s.items.map((it) => mk("charts", s, it, { kind: "chart", aspect: it.spec.aspect || 1.5, rel: 0.55, thumb: () => chartSvg(it.spec, 240) })) }));
}
async function tables() {
  const { TABLE_ITEMS } = await import("./assets-data.js");
  const v = (k) => (x) => x.spec.style.variant === k;
  return group("tables", TABLE_ITEMS, [["lines", "Lined tables", v("lines")], ["header", "Header tables", v("header")], ["blocks", "Colour blocks", v("solid")], ["minimal", "Minimal tables", () => true]],
    (s, it) => mk("tables", s, it, { kind: "table", aspect: 192 / 96, rel: 0.6, thumb: () => tableSvg(it.spec, 200) }));
}
async function sheets() {
  const { SHEET_ITEMS } = await import("./assets-data.js");
  return group("sheets", SHEET_ITEMS, [["money", "Money and sales", ["budget", "sales", "expenses", "prices", "inventory"]], ["plans", "Plans and school", ["todo", "schedule", "grades", "attendance"]], ["blank", "Start from scratch", () => true]],
    (s, it) => mk("sheets", s, it, { kind: "table", aspect: 1.4, rel: 0.6, thumb: () => tableSvg(it.spec, 240) }));
}
async function threeD() {
  const { THREE_D_ITEMS } = await import("./assets-3d.js");
  return group("3d", THREE_D_ITEMS, [["shapes", "3D shapes", ["sphere", "glossy-ball", "cube", "cylinder", "cone", "pyramid", "torus", "capsule", "blob-3d"]], ["symbols", "3D symbols", ["heart-3d", "star-3d", "check-3d", "bolt-3d", "arrow-3d", "bubble-3d", "pin-3d"]], ["objects", "3D objects", () => true]],
    (s, it) => mk("3d", s, it, { kind: "svg", svgKind: "3d", aspect: 1, rel: 0.32, thumb: () => it.svg, markup: () => it.svg }));
}
async function forms() {
  const { FORM_ITEMS } = await import("./assets-forms.js");
  return group("forms", FORM_ITEMS, [["fields", "Fields", ["text-field", "email-field", "textarea", "dropdown", "date-field", "search-bar", "upload"]], ["choices", "Choices and ratings", ["checkbox", "checkbox-list", "radio", "toggle-on", "toggle-off", "slider", "rating", "yes-no", "emoji-feedback"]], ["buttons", "Buttons and steps", ["button", "button-outline", "steps"]], ["cards", "Form cards", () => true]],
    (s, it) => { const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(it.svg); return mk("forms", s, it, { kind: "svg", svgKind: "form", aspect: m ? m[1] / m[2] : 2, rel: 0.4, thumb: () => it.svg, markup: () => it.svg }); });
}
let MOTION = null;
const motion = () => (MOTION ||= import("./assets-motion.js"));
const motionItem = (cat, s, it, m) => mk(cat, s, it, { kind: "svg", svgKind: "animation", animated: true, aspect: 1, rel: 0.25, thumb: () => m.frameSvg(it), animThumb: () => m.animatedSvg(it), markup: () => m.animatedSvg(it), motion: it });
const ANIM_GROUPS = [["fun", "Fun and party", ["bounce-ball", "heartbeat", "smiley", "confetti-pop", "music-notes", "new-badge"]], ["signs", "Signs and status", ["loading-dots", "pulse", "arrow-bounce", "check-draw", "clock", "bell"]], ["shine", "Shine and weather", () => true]];
async function animations() {
  const m = await motion();
  return group("animations", m.STICKER_ITEMS, ANIM_GROUPS, (s, it) => motionItem("animations", s, it, m));
}
async function videos() {
  const m = await motion();
  const groups = [["nature", "Nature", ["ocean", "clouds", "snow", "rain", "sunrise", "fireflies"]], ["night", "Night and celebration", ["starry-night", "fireworks", "city-night", "bokeh", "confetti"]], ["abstract", "Abstract backgrounds", ["aurora", "bubbles", "neon-grid", "flow-lines", "rings"]]];
  return groups.map(([id, label, ids]) => { const s = { id, label }; return { ...s, items: ids.map((x) => m.VIDEO_ITEMS.find((v) => v.id === x)).filter(Boolean).map((it) => mk("videos", s, it, { kind: "video", animated: true, aspect: it.w / it.h, rel: 0.6, duration: it.dur, thumb: () => m.frameSvg(it, undefined, 320), animThumb: () => m.animatedSvg(it, 320), markup: () => m.animatedSvg(it), motion: it, credit: "Animated loop: our own vector motion (not filmed footage)" })) }; });
}
async function audio() {
  const { AUDIO_SECTIONS } = await import("./assets-audio.js");
  return AUDIO_SECTIONS.map((s) => ({ ...s, items: s.items.map((tr) => mk("audio", s, { id: tr.id, name: tr.name, tags: `${tr.tags || ""} ${tr.mood} ${tr.kind === "sfx" ? "sound effect sfx" : "music track song background"} audio` }, { kind: "audio", duration: tr.dur, track: tr, credit: "Made in your browser with WebAudio (our own synth arrangement)" })) }));
}
let LIB = null;
const lib = () => (LIB ||= import("../../../pdf-editor/elements.js"));
const libItem = (cat, s, el, m, svgKind) => mk(cat, s, { id: el.id, name: el.name, tags: el.tags.join(" ") }, { kind: "svg", svgKind, elementId: el.id, aspect: el.vb[0] / el.vb[1], rel: svgKind === "icon" ? 0.18 : 0.3, thumb: () => m.elementSvg(el, {}, 120), markup: () => m.elementSvg(el, {}, 400) });
const libSecs = async (cat, defs, svgKind) => { const m = await lib(); return defs.map(([id, label]) => { const s = { id, label }; return { ...s, items: m.ELEMENTS.filter((e) => e.cat === id).map((el) => libItem(cat, s, el, m, svgKind)) }; }); };
const graphics = () => libSecs("graphics", [["deco", "Decorations"], ["badges", "Badges and ribbons"], ["callouts", "Speech bubbles"], ["arrows", "Arrows"], ["frames", "Borders"], ["lines", "Dividers"], ["shapes", "Shapes"]], "graphic");
async function stickers() {
  const [secs, m] = await Promise.all([libSecs("stickers", [["faces", "Faces"], ["stamps", "Stamps"]], "sticker"), motion()]);
  const s = { id: "animated", label: "Animated stickers" };
  return [{ ...s, items: m.STICKER_ITEMS.map((it) => motionItem("stickers", s, it, m)) }, ...secs];
}
async function icons() {
  const m = await lib(), els = m.ELEMENTS.filter((e) => e.cat === "icons").map((e) => ({ ...e, id: e.id }));
  const ids = (s) => s.split(" ").map((x) => "icon-" + x);
  return group("icons", els, [["status", "Ticks, stars and signs", ids("check check-circle cross cross-circle star heart thumbs-up warning info question idea flag bookmark plus eye")], ["contact", "Contact and people", ids("mobile call mail location home user users globe wifi battery")], ["work", "Work and money", ids("clock calendar lock unlock key cart money coin gift bell camera document folder search settings download upload link trash pencil printer")], ["life", "Weather, nature and culture", () => true]],
    (s, el) => libItem("icons", s, el, m, "icon"));
}
const PHOTO_GROUPS = [["nature", "Nature and landscapes", ["nature", "mountains", "sea", "sky", "forest", "flowers", "animals"]], ["city", "City and travel", ["city", "travel", "architecture", "pakistan"]], ["food", "Food and drink", ["food", "coffee", "restaurant"]], ["work", "Work and study", ["office", "workspace", "meeting", "business", "tech", "education"]], ["life", "Lifestyle", ["fitness", "sport", "medical", "fashion", "beauty", "celebration", "interior"]], ["textures", "Textures and backgrounds", ["textures", "abstract", "space"]]];
async function photos() {
  const { PHOTOS, photoUrl } = await import("../photo-library.js");
  return PHOTO_GROUPS.map(([id, label, themes]) => { const s = { id, label }; return { ...s, items: PHOTOS.filter((p) => themes.includes(p.theme)).map((p) => mk("photos", s, { id: p.id, name: p.title, tags: [p.theme, ...p.tags].join(" ") + " photo picture image" }, { kind: "image", aspect: p.w / p.h, thumbUrl: photoUrl(p, "thumb"), src: photoUrl(p, "full"), credit: "CC0 public-domain photo (Wikimedia Commons)" })) }; });
}
async function mockups() {
  const { MOCKUP_ITEMS } = await import("./assets-mockups.js");
  return group("mockups", MOCKUP_ITEMS, [["screens", "Screens and devices", ["laptop-desk", "phone-table", "desktop-setup", "tablet-pencil", "watch-wrist", "phone-case"]], ["print", "Print and wall", ["poster-wall", "framed-print", "book", "business-cards", "billboard", "notebook"]], ["merch", "Merch and packaging", () => true]],
    (s, it) => mk("mockups", s, it, { kind: "svg", svgKind: "mockup", aspect: it.spec.vb[0] / it.spec.vb[1], rel: 0.5, thumb: () => frameSvg(it.spec, 220), markup: () => frameSvg(it.spec, 600) }));
}

export const COLLECTIONS = [
  ["celebration", "Party and celebration", "party celebration confetti balloons gift fireworks birthday bunting crown"],
  ["business", "Business essentials", "business chart corporate office meeting growth briefcase revenue approved"],
  ["eid", "Eid and Ramadan nights", "crescent moon eid ramadan lantern hanging night starry fireworks"],
  ["education", "School and learning", "school education study book pencil grades students learning"],
  ["nature", "Nature and calm", "nature leaf flower ocean forest calm clouds mountain sunrise"],
  ["tech", "Apps and tech", "phone laptop app tech screen browser toggle search smartwatch"],
  ["feedback", "Reviews and feedback", "rating review feedback emoji smiley check poll happy"],
  ["arrows", "Arrows and pointers", "arrow pointer chevron direction"],
  ["food", "Food and cafe", "food coffee cafe restaurant cup mug"],
  ["travel", "Travel and places", "travel city beach location pin ticket island"],
].map(([id, name, q]) => ({ id, name, q: q.split(" ") }));

export const CATEGORIES = [
  { id: "shapes", label: "Shapes", load: shapes },
  { id: "graphics", label: "Graphics", load: graphics },
  { id: "photos", label: "Photos", load: photos, note: "Free CC0 photos (public domain, Wikimedia Commons)." },
  { id: "videos", label: "Videos", load: videos, note: "Animated loops: our own vector motion, not filmed footage. Video editors get a real WebM clip." },
  { id: "3d", label: "3D", load: threeD },
  { id: "forms", label: "Forms", load: forms, note: "Pictures of form controls for mockups, web designs and printable forms." },
  { id: "animations", label: "Animations", load: animations },
  { id: "audio", label: "Audio", load: audio, note: "Music loops and sound effects made in your browser. Press play to preview." },
  { id: "sheets", label: "Sheets", load: sheets, note: "Small ready-made spreadsheets with real numbers and totals." },
  { id: "tables", label: "Tables", load: tables },
  { id: "charts", label: "Charts", load: charts },
  { id: "frames", label: "Frames", load: frames },
  { id: "grids", label: "Grids", load: grids },
  { id: "mockups", label: "Mockups", load: mockups, note: "Mockup scenes with a placeholder. For a frame you fill with your own photo, use Frames › Devices." },
  { id: "stickers", label: "Stickers", load: stickers },
  { id: "icons", label: "Icons", load: icons },
  { id: "collections", label: "Collections", collections: true, load: async () => [] },
  { id: "ai", label: "AI-generated", soon: true, load: async () => [] },
].map((c) => ({ ...c, tile: TILES[c.id] }));
export const catById = (id) => CATEGORIES.find((c) => c.id === id);

// ---------- loading, lookup, collections and search
const LOADED = new Map();
/** Sections of one category (cached promise). */
export function loadCat(id) {
  if (!LOADED.has(id)) { const c = catById(id); const p = (c ? c.load() : Promise.resolve([])); LOADED.set(id, p); p.catch(() => LOADED.delete(id)); }
  return LOADED.get(id);
}
let ALL = null;
/** Every item of every category (loads them all). */
export function loadAll() {
  return (ALL ||= Promise.all(CATEGORIES.map((c) => loadCat(c.id).catch((e) => { console.warn("elements: could not load", c.id, e); return []; }))).then((secs) => secs.flat().flatMap((s) => s.items)));
}
export async function itemById(id) {
  const cat = String(id).split("/")[0];
  const secs = await loadCat(cat).catch(() => []);
  for (const s of secs) { const it = s.items.find((x) => x.id === id); if (it) return it; }
  return null;
}
const words = (q) => String(q || "").toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
const HAY = new WeakMap();
const hay = (it) => { let h = HAY.get(it); if (!h) { h = [...new Set(words(`${it.name} ${it.tags} ${it.cat} ${catById(it.cat)?.label || ""}`))]; HAY.set(it, h); } return h; };
/** Score of an item for the query words (0 = no match). Every word must match (whole word, prefix or plural). */
export function score(it, ws) {
  let total = 0;
  for (const w of ws) {
    const stem = w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
    let best = 0;
    for (const h of hay(it)) best = Math.max(best, h === w || h === stem ? 3 : h.startsWith(stem) ? 2 : stem.length >= 4 && h.includes(stem) ? 1 : 0);
    if (!best) return 0;
    total += best;
  }
  return total + (words(it.name).some((x) => ws.includes(x)) ? 1 : 0);
}
/** Search every category: [{cat, label, items, best}], the category with the best match first (ties: category order),
 *  best matches first inside each. */
export async function search(q) {
  const ws = words(q); if (!ws.length) return [];
  const all = await loadAll();
  const by = new Map();
  for (const it of all) { const s = score(it, ws); if (s > 0) { if (!by.has(it.cat)) by.set(it.cat, []); by.get(it.cat).push([s, it]); } }
  // A query that names a category ("charts", "photo", "video") puts that category first.
  const named = (c) => ws.some((w) => { const s = w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w; const l = c.label.toLowerCase(); return c.id === w || c.id === s || l === w || (s.length >= 3 && l.startsWith(s)); }) ? 1 : 0;
  return CATEGORIES.filter((c) => by.has(c.id)).map((c, i) => { const l = by.get(c.id).sort((a, b) => b[0] - a[0]); return { cat: c.id, label: c.label, items: l.map((x) => x[1]), best: l[0][0], order: i, named: named(c) }; })
    .sort((a, b) => b.named - a.named || b.best - a.best || a.order - b.order);
}
/** A collection's items grouped by category (sections), from its keywords. */
export async function collectionSections(col) {
  const all = await loadAll(), seen = new Set(), by = new Map();
  for (const it of all) {
    if (it.cat === "collections" || seen.has(it.id)) continue;
    if (!col.q.some((w) => score(it, [w]) >= 2)) continue;
    seen.add(it.id);
    if (!by.has(it.cat)) by.set(it.cat, []);
    const list = by.get(it.cat); if (list.length < 24) list.push(it);
  }
  return CATEGORIES.filter((c) => by.has(c.id)).map((c) => ({ id: `${col.id}-${c.id}`, label: c.label, items: by.get(c.id) }));
}
export const _test = { words, hay };
