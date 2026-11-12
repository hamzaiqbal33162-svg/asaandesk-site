// AsaanDesk Studio template gallery (shared convention: editor Templates panel + /tools/<slug> intro pages).
// Pure ES module: no DOM, only relative imports of pure modules. Every template is our own design.
//
// The list is a GENERATOR: our hand-designed base LAYOUTS per tool × own colour PALETTES × font pairings
// (Presentations: deck contents × themes × layout variants). Ids encode the combination:
//   "<layout>"                 the hand-designed original      e.g. "sale-post"
//   "<layout>~p07~f1"          palette 7, font pairing 1        e.g. "sale-post~p07~f1"
//   "deck~<content>~<theme>~v2" presentation: content × theme × layout variant
//   "mockup-<layout>…", "print-<layout>…", "resize-|animate-|translate-<layout>…"  same design opened in a tool mode
// thumb(id) and build(id) make the design from the id on demand (nothing is pre-built for templates not on screen).
//   TEMPLATES: [{ id, name, tool, section, tags, preset, pages, href, mode? }]
import { listTemplates, getTemplate, templateThumbSvg, makeDeck, DECK_PARTS } from "./templates.js";
import { colorSlots } from "./brandkit.js";
import { walk } from "./model.js";
import { textHeight } from "./textlayout.js";
import { presetPx } from "./presets.js";
import { polish, hashKey } from "./depth.js";

const STUDIO = "/design/studio/";

/* ---------------- polish: depth and motion (round 4) ---------------- */
// Every template gets the depth pass (layered soft shadows, gradient fills with highlights, glossy round shapes).
// About a third of the layouts also get a 3D (extruded) headline, another third a tilted photo-stack card.
// Templates shown on screens (social media, presentations, posters, flyers, invitations and the Magic tools)
// get default entrance animations that play in Present and in MP4 / WebM / GIF downloads.
export const ANIMATED_TOOLS = new Set(["presentations", "social-media-designs", "posters", "flyers", "invitations", "magic-resize", "magic-animate", "translate-design"]);
const PAPER_TOOLS = new Set(["business-cards", "print-designs", "brochures"]);
const OWN_LOOK = /-(3d|motion)(-[a-z0-9]+)?$/; // the round-4 dedicated layouts carry their own depth and motion
/** Layout key of a gallery id (the same for every palette / font / mirrored variant of a layout). */
const layoutKey = (ref) => (ref.deck ? `deck.${ref.deck[0]}.${ref.deck[1]}.v${ref.deck[2]}` : ref.base);
/** Which touches a layout gets: { extrude, stack, animate, own }. tool = the tool the template is listed under. */
export function lookOf(key, tool) {
  const own = OWN_LOOK.test(key), h = hashKey(key) % 3;
  return { own, extrude: own ? /-3d/.test(key) : h === 0, stack: !own && h === 1, animate: ANIMATED_TOOLS.has(tool) || /-motion/.test(key) };
}

/** design-tools slug for a template's size (preset id). */
export function toolForPreset(presetId) {
  const p = String(presetId || "");
  if (p.startsWith("presentation")) return "presentations";
  if (p.startsWith("business-card")) return "business-cards";
  if (p.startsWith("invitation")) return "invitations";
  if (p.startsWith("flyer")) return "flyers";
  if (p.startsWith("brochure")) return "brochures";
  if (p.startsWith("poster")) return "posters";
  if (p.startsWith("label")) return "labels";
  if (p.startsWith("sticker")) return "stickers";
  if (p === "tshirt") return "t-shirts";
  if (p === "hoodie") return "hoodies";
  if (p === "mug") return "mugs";
  if (p.startsWith("collage")) return "photo-collages";
  if (p === "logo") return "logos";
  if (["a4", "a5", "a3", "letter"].includes(p)) return "print-designs";
  return "social-media-designs";
}

/** Studio tools (design-tools slugs) with the size a blank design starts with and the editor kind label. */
export const STUDIO_TOOLS = {
  "presentations": { preset: "presentation-16x9", kind: "Presentation" },
  "social-media-designs": { preset: "instagram-post", kind: "Social media" },
  "print-designs": { preset: "flyer-a4", kind: "Print" },
  "business-cards": { preset: "business-card-us", kind: "Business card" },
  "invitations": { preset: "invitation-5x7", kind: "Invitation" },
  "flyers": { preset: "flyer-a4", kind: "Flyer" },
  "brochures": { preset: "brochure-trifold-a4", kind: "Brochure" },
  "t-shirts": { preset: "tshirt", kind: "T-shirt" },
  "mugs": { preset: "mug", kind: "Mug" },
  "stickers": { preset: "sticker-round-3in", kind: "Sticker" },
  "hoodies": { preset: "hoodie", kind: "Hoodie" },
  "labels": { preset: "label-product-2x1", kind: "Label" },
  "posters": { preset: "poster-18x24", kind: "Poster" },
  "photo-collages": { preset: "collage-square", kind: "Photo collage", mode: "collage" },
  "mockups": { preset: "tshirt", kind: "Mockup", mode: "mockup" },
  "logos": { preset: "logo", kind: "Logo", mode: "logo" },
  "magic-resize": { preset: "instagram-post", kind: "Magic Resize", mode: "resize" },
  "magic-animate": { preset: "instagram-post", kind: "Magic Animate", mode: "animate" },
  "translate-design": { preset: "instagram-post", kind: "Translate", mode: "translate" },
};

/**
 * How many templates each tool lists = Canva's count for that design type (canva.com/<type>/templates,
 * 11 Nov 2026; Canva shows at most about 20,000). Magic tools have no Canva template type: 24 starters each.
 */
export const COUNTS = {
  "presentations": 20134, "social-media-designs": 20066, "print-designs": 20000, "business-cards": 20077, "invitations": 20084,
  "flyers": 20065, "brochures": 7805, "t-shirts": 15768, "mugs": 3699, "stickers": 16935, "hoodies": 1743, "labels": 7342,
  "posters": 20103, "photo-collages": 20082, "mockups": 10832, "logos": 20123, "magic-resize": 24, "magic-animate": 24, "translate-design": 24,
};

/* ---------------- palettes, font pairings, mirrored layouts ---------------- */
// Own palettes: 24 base hues × 10 colour schemes (+ the original colours). Recolouring keeps every colour's
// lightness, so contrast stays as designed.
const HUE_NAMES = ["Red", "Scarlet", "Orange", "Amber", "Yellow", "Lime", "Spring", "Leaf", "Green", "Emerald", "Jade", "Mint", "Teal", "Cyan", "Sky", "Azure", "Blue", "Indigo", "Violet", "Purple", "Orchid", "Magenta", "Pink", "Rose"];
const SCHEMES = [["duo", [0, 180, 0]], ["trio", [0, 120, 240]], ["soft", [0, 30, -30]], ["split", [0, 150, 210]], ["mono", [0, 0, 0]], ["bright", [0, 60, 200]], ["calm", [0, -40, 160]], ["warm", [0, 25, 50]], ["cool", [0, -25, -50]], ["pop", [0, 90, 270]]];
export const PALETTE_COUNT = 1 + HUE_NAMES.length * SCHEMES.length;
/** Palette q (0 = the template's own colours): { id, name, hues }. */
export function palette(q) {
  if (!q) return { id: "p0", name: "", hues: null };
  const i = (q - 1) % HUE_NAMES.length, sc = SCHEMES[Math.floor((q - 1) / HUE_NAMES.length) % SCHEMES.length];
  return { id: "p" + q, name: `${HUE_NAMES[i]} ${sc[0]}`, hues: sc[1].map((o) => (i * 15 + o + 360) % 360) };
}
export const FONTS = [
  { id: "f0", name: "", map: null },
  { id: "f1", name: "modern", map: { sans: "calibri", serif: "cambria", calibri: "sans", cambria: "serif" } },
  { id: "f2", name: "classic", heading: { sans: "serif", serif: "sans", calibri: "cambria", cambria: "calibri" } },
  { id: "f3", name: "elegant", map: { sans: "serif", calibri: "cambria" } },
  { id: "f4", name: "clean", map: { serif: "sans", cambria: "calibri" } },
  { id: "f5", name: "editorial", heading: { sans: "cambria", calibri: "cambria", serif: "cambria" }, body: { serif: "calibri", sans: "calibri", cambria: "calibri" } },
];
const SPACE = PALETTE_COUNT * FONTS.length * 2; // palette × font pairing × mirrored or not
const MIX = 1009; // prime, coprime with SPACE: spreads neighbouring entries over very different combinations

const hex6 = (c) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null);
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hh = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, s, l];
}
function hex(h, s, l) {
  const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
}
/** Recolours a design (in place) to a palette: main colours, most used first, take the palette's hues. */
export function recolor(design, pal) {
  if (!pal?.hues) return design;
  const slots = colorSlots(design);
  const extra = [];
  for (const pg of design.pages) for (const [l] of walk(pg.layers)) {
    if (l.type === "table" && hex6(l.table.headerFill)) extra.push({ get: () => l.table.headerFill, set: (v) => { l.table.headerFill = v; }, weight: 2 });
    if (l.type === "element" && hex6(l.element.colors?.c3)) extra.push({ get: () => l.element.colors.c3, set: (v) => { l.element.colors.c3 = v; }, weight: 0.5 });
  }
  const all = [...slots, ...extra], score = new Map();
  for (const s of all) { const c = s.get().toLowerCase(); const [, sat, l] = hsl(c); if (sat >= 0.12 && l > 0.06 && l < 0.985) score.set(c, (score.get(c) || 0) + s.weight); }
  const main = [...score.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map((e) => e[0]);
  const map = {};
  main.forEach((c, i) => { const [, sat, l] = hsl(c); map[c] = hex(pal.hues[i % pal.hues.length], Math.max(sat, l > 0.9 ? 0.5 : 0.45), l); });
  for (const s of all) { const c = s.get().toLowerCase(); if (map[c]) s.set(map[c]); }
  return design;
}
/** Applies a font pairing (in place); text boxes keep their width and get their new height. */
export function refont(design, font) {
  if (!font || (!font.map && !font.heading)) return design;
  for (const pg of design.pages) {
    const texts = [...walk(pg.layers)].map(([l]) => l).filter((l) => l.type === "text");
    if (!texts.length) continue;
    const big = Math.max(...texts.map((t) => t.text.size));
    for (const t of texts) {
      const to = font.map ? font.map[t.text.family] : t.text.size >= big * 0.6 ? font.heading[t.text.family] : font.body ? font.body[t.text.family] : null;
      if (to && to !== t.text.family) { t.text.family = to; t.h = textHeight(t.text, t.w); }
    }
  }
  return design;
}

/** Mirrors a design's layout left ↔ right (in place): positions, rotations, text alignment, gradients, photo flips. */
export function mirror(design) {
  const W = presetPx(design.preset).w;
  const flip = (layers, width) => {
    for (const l of layers) {
      l.x = width - l.x - l.w;
      if (l.rotation) l.rotation = -l.rotation;
      if (l.type === "text") l.text.align = l.text.align === "left" ? "right" : l.text.align === "right" ? "left" : l.text.align;
      if (l.type === "image") l.image.flipX = !l.image.flipX;
      if (l.type === "group") flip(l.children, l.w);
    }
  };
  for (const pg of design.pages) {
    flip(pg.layers, W);
    const g = pg.background?.gradient;
    if (g) g.angle = (360 - (g.angle ?? 135)) % 360;
  }
  return design;
}

/* ---------------- the list ---------------- */
const SECTION_BY_TOOL = {
  "presentations": (tags) => (/lesson|school|education|class|thesis|workshop/.test(tags) ? "Education and training" : /report|review|status|quarterly/.test(tags) ? "Reports and reviews" : "Business and pitch decks"),
  "social-media-designs": (tags, preset) => ({ "instagram-post": "Instagram posts", "instagram-story": "Stories", "whatsapp-status": "Stories", "facebook-post": "Facebook", "facebook-cover": "Facebook", "youtube-thumbnail": "YouTube", "youtube-banner": "YouTube", "linkedin-post": "LinkedIn and X", "x-post": "LinkedIn and X", "pinterest-pin": "Pinterest" })[preset] || "More templates for you",
};
const tagsOf = (t) => t.tags.filter((w) => /^[a-z0-9%-]+$/.test(w)).slice(0, 8);
const VARIANT_NAMES = ["classic", "centred", "photo", "bold", "framed", "banded"];
const ALIAS_PREFIX = { print: null, mockup: "mockup", resize: "resize", animate: "animate", translate: "translate" };
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const low = (x) => x.charAt(0).toLowerCase() + x.slice(1);

let BASE = null, BASE_BY_ID = null;
const LAYS = new Map();
function base() {
  if (BASE) return BASE;
  BASE = listTemplates().map((t) => ({ id: t.id, title: t.title, presetId: t.presetId, group: t.group, pages: t.pages, tags: tagsOf(t), tool: toolForPreset(t.presetId) }));
  BASE_BY_ID = new Map(BASE.map((t) => [t.id, t]));
  return BASE;
}
/** Base layouts a tool's list is generated from: [{ id, title, tags, presetId, pages, mode, section }]. */
function layoutsOf(tool) {
  if (LAYS.has(tool)) return LAYS.get(tool);
  const all = base();
  const sec = (t) => SECTION_BY_TOOL[tool]?.(t.tags.join(" "), t.presetId) || (tool === "mockups" ? "Mockups" : "More templates for you");
  const mk = (list, prefix = "", mode = null) => list.map((t) => ({ id: prefix ? `${prefix}-${t.id}` : t.id, title: t.title, tags: t.tags, presetId: t.presetId, pages: t.pages, mode, section: sec(t) }));
  let out;
  if (tool === "print-designs") out = [...mk(all.filter((t) => t.tool === "print-designs")), ...mk(all.filter((t) => t.group === "print"), "print")];
  else if (tool === "mockups") out = mk(all.filter((t) => t.group === "merch"), "mockup", "mockup");
  else if (tool === "magic-resize") out = mk(all.filter((t) => t.group === "social"), "resize", "resize");
  else if (tool === "magic-animate") out = mk(all.filter((t) => t.group === "social"), "animate", "animate");
  else if (tool === "translate-design") out = mk(all.filter((t) => t.group === "social"), "translate", "translate");
  else out = mk(all.filter((t) => t.tool === tool));
  if (tool === "presentations") {
    // The hand-made decks first, then every content × theme × layout variant in a mixed order.
    const contents = DECK_PARTS.contents, combos = [];
    for (const th of DECK_PARTS.themes) for (let v = 0; v < DECK_PARTS.variants; v++) combos.push([th, v]);
    for (let r = 0; r < combos.length; r++) for (let i = 0; i < contents.length; i++) {
      const key = contents[i], c = DECK_PARTS.content(key), [th, v] = combos[(r + i * 11) % combos.length];
      if (th === c.theme && v === 0) continue; // that one is the hand-made deck itself
      const tags = [...c.tags.split(/\s+/).slice(0, 6), DECK_PARTS.themeName(th).toLowerCase(), VARIANT_NAMES[v]];
      out.push({ id: `deck.${key}.${th}.v${v}`, title: `${DECK_PARTS.themeName(th)} ${VARIANT_NAMES[v]} ${low(c.title)}`, tags, presetId: "presentation-16x9", pages: 10, mode: null, section: SECTION_BY_TOOL.presentations(tags.join(" ")), look: DECK_PARTS.styleOf(th) + v });
    }
    // First one deck per distinct design (deck style × layout variant), so the first page shows different layouts.
    for (const l of out) if (!l.look) { const m = /^deck-(.+)$/.exec(l.id); const c = m && DECK_PARTS.content(m[1]); l.look = c ? DECK_PARTS.styleOf(c.theme) + 0 : "own-" + l.id; }
    const seen = new Set(), head = [], tail = [];
    for (const l of out) (seen.has(l.look) ? tail : head).push(l), seen.add(l.look);
    out = [...head, ...tail];
  }
  LAYS.set(tool, out);
  return out;
}
/** Number of templates a tool lists (Canva's count; fewer only if the combinations run out). */
export function totalFor(tool) {
  const L = layoutsOf(tool).length;
  return Math.min(COUNTS[tool] ?? 60, L * SPACE);
}
/** The k-th template of a tool (0-based): originals first, then layouts × palettes × fonts × mirrored, well mixed. */
export function templateAt(tool, k) {
  const lays = layoutsOf(tool), L = lays.length;
  if (!L || k < 0 || k >= totalFor(tool)) return null;
  const lay = lays[k % L], j = (Math.floor(k / L) * MIX) % SPACE;
  const q = j % PALETTE_COUNT, f = Math.floor(j / PALETTE_COUNT) % FONTS.length, m = Math.floor(j / (PALETTE_COUNT * FONTS.length));
  const pal = palette(q), font = FONTS[f];
  const id = j ? `${lay.id}~p${q}~f${f}${m ? "~m" : ""}` : lay.id;
  const words = [pal.name, font.name, m ? "mirrored" : ""].filter(Boolean).join(" ");
  const name = words ? cap(`${words} ${low(lay.title)}`) : lay.title;
  const look = lookOf(lay.id.replace(/^(print|mockup|resize|animate|translate)-/, ""), tool);
  const extra = [look.animate ? "animated" : "", look.extrude ? "3d" : ""].filter(Boolean);
  const tags = [...lay.tags, ...(words ? words.toLowerCase().split(" ") : []), ...extra.filter((w) => !lay.tags.includes(w))];
  const e = { id, name, tool, section: lay.section, tags, preset: lay.presetId, pages: lay.pages, href: `${STUDIO}?preset=${lay.presetId}&template=${encodeURIComponent(id)}` };
  if (lay.mode) e.mode = lay.mode;
  if (look.animate) e.animated = true;
  return e;
}
/** A page of a tool's templates. */
export function templatesFor(tool, offset = 0, limit = 40) {
  const out = [], n = totalFor(tool);
  for (let k = Math.max(0, offset); k < Math.min(n, offset + limit); k++) out.push(templateAt(tool, k));
  return out;
}
/** Search a tool's templates (name, tags, section): { total, items } for one page of results. */
export function search(tool, q = "", offset = 0, limit = 40) {
  const words = String(q || "").toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  if (!words.length) return { total: totalFor(tool), items: templatesFor(tool, offset, limit) };
  const items = [];
  let total = 0;
  for (let k = 0, n = totalFor(tool); k < n; k++) {
    const e = templateAt(tool, k);
    const hay = (e.name + " " + e.section + " " + e.tags.join(" ")).toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    if (total >= offset && items.length < limit) items.push(e);
    total++;
  }
  return { total, items };
}
/* Filter chips for the Templates panel ("All filters"): topic, colour family and font style. */
const TOPICS = {
  business: "business corporate company pitch plan report office ceo consultant startup investor", education: "school lesson class education teacher student thesis course workshop study",
  marketing: "marketing campaign promo brand social launch product", sale: "sale discount offer deal shop black friday price", event: "event party concert festival meetup night ticket invite",
  food: "food menu restaurant cafe coffee bakery recipe chai cook", wedding: "wedding bride engagement anniversary love valentine", birthday: "birthday kids party balloon cake",
  "real-estate": "real estate home house property listing realtor", fitness: "fitness gym yoga run sport workout trainer", beauty: "beauty salon makeup nail hair spa",
  travel: "travel trip tour holiday vacation adventure", holidays: "eid ramadan christmas diwali new year halloween festival greeting", quote: "quote motivation inspiration words",
  photo: "photo collage moodboard dump album polaroid", health: "health medical clinic doctor dental pharmacy", tech: "tech app software code developer it",
  // More topics like Canva's presentation topics (each one matches real templates; checked with a count script).
  pitch: "pitch investor startup funding", report: "report annual quarterly review results", plan: "plan strategy roadmap goals okr",
  science: "science biology chemistry physics lab research", history: "history timeline heritage museum", math: "math maths numbers algebra geometry",
  language: "english language grammar vocabulary reading", kids: "kids children nursery preschool", nonprofit: "nonprofit charity fundraiser donation volunteer ngo",
  finance: "finance budget money bank investment accounting", hr: "hr hiring onboarding employee recruitment culture", sales: "sales pipeline quota client",
  product: "product launch feature", design: "design portfolio creative critique agency", nature: "nature eco green environment sustainability climate",
  music: "music band concert album dj", fashion: "fashion clothing boutique apparel", sports: "sports football cricket match league",
  game: "game gaming quiz trivia", architecture: "architecture building interior", training: "training workshop onboarding",
  community: "community town neighbourhood club", meeting: "meeting agenda weekly", portfolio: "portfolio", timeline: "timeline", thesis: "thesis research defense",
};
const TOPIC_LABEL = { "real-estate": "Real estate", hr: "HR and hiring", plan: "Plans and strategy", pitch: "Pitch deck", report: "Reports", thesis: "Thesis defence", kids: "Kids", game: "Games and quizzes" };
const HUE_FAMILY = { red: ["Red", "Scarlet", "Rose"], orange: ["Orange", "Amber"], yellow: ["Yellow", "Lime"], green: ["Spring", "Leaf", "Green", "Emerald", "Jade"], teal: ["Mint", "Teal", "Cyan"], blue: ["Sky", "Azure", "Blue", "Indigo"], purple: ["Violet", "Purple", "Orchid"], pink: ["Magenta", "Pink"] };
export const FILTERS = [
  { key: "topic", label: "Topic", options: Object.keys(TOPICS).map((v) => ({ value: v, label: TOPIC_LABEL[v] || v.charAt(0).toUpperCase() + v.slice(1) })) },
  { key: "colour", label: "Colour", options: [{ value: "original", label: "Original colours" }, ...Object.keys(HUE_FAMILY).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))] },
  { key: "style", label: "Style", options: ["modern", "classic", "elegant", "clean", "editorial", "mirrored"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })) },
  { key: "look", label: "Look", options: [{ value: "animated", label: "Animated" }, { value: "3d", label: "3D style" }] },
];
function matchFilters(e, f) {
  if (f.look && !e.tags.includes(f.look)) return false;
  if (f.topic) { const words = TOPICS[f.topic]?.split(" ") || [f.topic]; const hay = " " + (e.name + " " + e.tags.join(" ")).toLowerCase() + " "; if (!words.some((w) => hay.includes(" " + w))) return false; }
  if (f.colour) { const first = e.name.split(" ")[0]; if (f.colour === "original" ? /~p\d/.test(e.id) : !(HUE_FAMILY[f.colour] || []).includes(first)) return false; }
  if (f.style && !e.tags.includes(f.style)) return false;
  return true;
}
/** Paged gallery for the shell's Templates panel: page(tool, { q, offset, limit, filters }) -> { items, total }. */
export function page(tool, { q = "", offset = 0, limit = 40, filters = {} } = {}) {
  const f = Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v));
  if (!Object.keys(f).length) return search(tool, q, offset, limit);
  const words = String(q || "").toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  const items = [];
  let total = 0;
  for (let k = 0, n = totalFor(tool); k < n; k++) {
    const e = templateAt(tool, k);
    if (words.length) { const hay = (e.name + " " + e.section + " " + e.tags.join(" ")).toLowerCase(); if (!words.every((w) => hay.includes(w))) continue; }
    if (!matchFilters(e, f)) continue;
    if (total >= offset && items.length < limit) items.push(e);
    total++;
  }
  return { total, items };
}
/** Distinct hand-designed layouts behind a tool's list (Presentations: 6 deck styles × 4 layout variants + 2 more decks). */
export function layoutsFor(tool) {
  if (tool === "presentations") return new Set(layoutsOf(tool).map((l) => l.look)).size;
  return new Set(layoutsOf(tool).map((l) => l.id.replace(/^(print|mockup|resize|animate|translate)-/, ""))).size;
}

/** Own colour palettes a tool's list uses (incl. the template's own colours), font pairings, and mirrored or not. */
export const palettesFor = () => PALETTE_COUNT;
export const fontsFor = () => FONTS.length;
/** Content themes: Presentations = 12 topics × 12 colour/style themes; other tools: the layouts' own content. */
export const themesFor = (tool) => (tool === "presentations" ? DECK_PARTS.contents.length * DECK_PARTS.themes.length : 1);

/** The first page of every tool (60, Presentations 120) for simple lists; use templatesFor / search for the rest. */
export const TEMPLATES = Object.keys(STUDIO_TOOLS).flatMap((tool) => templatesFor(tool, 0, tool === "presentations" ? 120 : 60));
/** All templates over every studio tool, and the distinct layouts behind them. */
export const TOTAL = Object.keys(STUDIO_TOOLS).reduce((n, t) => n + totalFor(t), 0);
export const LAYOUTS = new Set(base().filter((t) => !t.id.startsWith("deck-")).map((t) => t.id)).size + layoutsFor("presentations") - 2;
/** First page of one tool (kept for simple callers). */
export const forTool = (tool) => TEMPLATES.filter((t) => t.tool === tool);
/** Which tool a gallery id belongs to (null when unknown). */
export function toolOf(id) {
  const r = resolveTemplate(id);
  if (r.deck) return "presentations";
  const m = /^(print|mockup|resize|animate|translate)-/.exec(String(id));
  if (m) return { print: "print-designs", mockup: "mockups", resize: "magic-resize", animate: "magic-animate", translate: "translate-design" }[m[1]];
  const b = BASE_BY_ID.get(r.base);
  return b ? b.tool : null;
}

/**
 * What a gallery id stands for: { base (hand-made template id), mode, palette, font, mirror, deck: [content, theme, variant] }.
 */
export function resolveTemplate(id) {
  base();
  const parts = String(id || "").split("~");
  let head = parts[0], mode = null, deck = null;
  const dm = /^deck\.(.+)\.([a-z]+)\.v(\d)$/.exec(head);
  if (dm) deck = [dm[1], dm[2], +dm[3]];
  else if (!BASE_BY_ID.has(head)) {
    const m = /^(print|mockup|resize|animate|translate)-(.+)$/.exec(head);
    if (m && BASE_BY_ID.has(m[2])) { head = m[2]; mode = ALIAS_PREFIX[m[1]]; }
  }
  const num = (re) => { const x = parts.slice(1).map((p) => re.exec(p)).find(Boolean); return x ? +x[1] : 0; };
  const pal = Math.min(PALETTE_COUNT - 1, num(/^p(\d+)$/)), font = Math.min(FONTS.length - 1, num(/^f(\d+)$/));
  return { base: deck ? "deck-" + deck[0] : head, mode, palette: pal, font, mirror: parts.includes("m"), deck };
}
/** The design for a gallery id (a fresh copy you can change): { title, design } or null. */
export function build(id) {
  const ref = resolveTemplate(id);
  const t = ref.deck ? makeDeck(...ref.deck) : getTemplate(ref.base);
  if (!t) return null;
  if (ref.palette) recolor(t.design, palette(ref.palette));
  if (ref.font) refont(t.design, FONTS[ref.font]);
  if (ref.mirror) mirror(t.design);
  const tool = toolOf(id);
  const look = lookOf(layoutKey(ref), tool);
  // Plain layouts (flat colour + plain text) on screens and paper also get a soft background and a 3D headline;
  // glossy orbs only on screen designs. Merch prints (shirts, mugs, stickers, labels, logos) keep their flat look.
  polish(t.design, { depth: !look.own, extrude: look.extrude && !look.own, stack: look.stack, animate: look.animate, plain: look.animate || PAPER_TOOLS.has(tool), orbs: look.animate });
  const lay = tool && layoutsOf(tool).find((l) => l.id === String(id).split("~")[0]);
  const words = [ref.palette ? palette(ref.palette).name : "", FONTS[ref.font].name, ref.mirror ? "mirrored" : ""].filter(Boolean).join(" ");
  const title0 = lay ? lay.title : t.title;
  const title = words ? cap(`${words} ${low(title0)}`) : title0;
  t.design.name = title;
  return { title, design: t.design, animated: look.animate };
}

// T-shirt and hoodie templates show as the print on a garment, like the print-product template cards on Canva.
// Our own simple silhouettes (the same shapes as mockup.js, copied here so this module stays free of canvas code).
const GARMENT = {
  tshirt: {
    body: "M405 150C432 214 568 214 595 150L700 172L872 298L800 402L716 356L722 900Q500 918 278 900L284 356L200 402L128 298L300 172Z",
    extra: '<path d="M405 150C432 214 568 214 595 150" fill="none" stroke="#d9dbe3" stroke-width="16" stroke-linecap="round"/>',
    area: { x: 350, y: 255, w: 300, h: 400 },
  },
  hoodie: {
    body: "M360 196L640 196L770 238L888 560L832 604L742 430L744 884Q500 904 256 884L258 430L168 604L112 560L230 238Z",
    extra: '<path d="M352 214C330 96 670 96 648 214C600 250 400 250 352 214Z" fill="#e9eaf0"/><path d="M400 214C392 150 608 150 600 214C560 236 440 236 400 214Z" fill="#c9cbd5"/><path d="M362 690L638 690L690 846L310 846Z" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="4"/>',
    area: { x: 360, y: 280, w: 280, h: 327 },
  },
};
/** The print SVG placed on the garment's print area (contain), on a neutral card background. */
export function thumbMockup(kind, printSvg, maxPx = 320) {
  const g = GARMENT[kind];
  if (!g || !printSvg) return printSvg;
  const a = g.area;
  const inner = printSvg.replace(/^<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(?:width|height|x|y|xmlns)="[^"]*"/g, "")} x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" preserveAspectRatio="xMidYMid meet">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxPx}" height="${maxPx}" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#eef0f5"/>` +
    `<path d="${g.body}" fill="#fbfbfd" stroke="#c4c7d2" stroke-width="5" stroke-linejoin="round"/>${g.extra}${inner}</svg>`;
}

/** Small "Animated" pill (play triangle + word) in the bottom-left corner of a W × H page, for thumbnails. */
export function animatedBadge(W, H) {
  const s = Math.min(W, H) * (W > H * 1.4 ? 0.075 : W * 1.4 < H ? 0.085 : 0.062), m = s * 0.4, w = s * 3.9;
  return `<g data-badge="animated" aria-label="Animated"><rect x="${m}" y="${H - m - s}" width="${w}" height="${s}" rx="${s / 2}" fill="#1b2133" fill-opacity="0.82"/>` +
    `<path d="M${m + s * 0.36} ${H - m - s * 0.74}L${m + s * 0.72} ${H - m - s / 2}L${m + s * 0.36} ${H - m - s * 0.26}Z" fill="#ffffff"/>` +
    `<text x="${m + s * 0.9}" y="${H - m - s * 0.31}" font-family="Arial, Helvetica, sans-serif" font-size="${s * 0.52}" font-weight="700" fill="#ffffff">Animated</text></g>`;
}
/** Self-contained SVG string (own artwork, generic fonts, no image files) of a template's first page. */
export function thumb(id, maxPx = 320) {
  const b = build(id);
  if (!b) return "";
  let svg = templateThumbSvg({ id: String(id).replace(/[^a-z0-9-]/gi, "-"), design: b.design }, maxPx);
  const pid = typeof b.design.preset === "string" ? b.design.preset : b.design.preset?.id;
  if (b.animated) { const { w, h } = presetPx(b.design.preset); svg = svg.replace(/<\/svg>$/, animatedBadge(w, h) + "</svg>"); }
  return pid === "tshirt" || pid === "hoodie" ? thumbMockup(pid, svg, maxPx) : svg;
}
