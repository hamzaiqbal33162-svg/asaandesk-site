// AI image / AI art generator presets (editor Templates panel + the intro pages). Pure ES module, no DOM.
// A template here is a ready prompt + style + shape: it fills the form; pictures only come from AsaanDesk AI.
// Thumbnails are finished example designs in Canva's pattern: a real library photo (CC0 / public domain) restyled with an
// SVG "look" (watercolour, pencil, clay, anime, flat poster, duotone, truck art…) inside a layout (prompt card, poster,
// framed print, phone story, sketchbook, before/after…), with the prompt and style shown. They are style examples made
// from stock photos, never pictures made by AsaanDesk AI. design(id, "full") draws the same design with full-size photos.
import { kit, PAL, fit, text, headline, rect, circle, pathEl, line, icon, isDark, mix as mix6, hash, pickPhoto } from "../shared/tpl-kit.js";
import { PHOTOS } from "../shared/photo-library.js";
import { styleById } from "./gen.js";
import { look } from "./looks.js";

// ph = library photos that show the subject (fallback); want = tag words: the best-matching library photos are used, so
// new photos added to the shared library (cafe, office, fashion…) are picked up without code changes.
const P = (id, name, tool, section, style, aspect, prompt, tags, ph, head, want = "") => ({ id, name, tool, section, style, aspect, prompt, tags, ph, head, want });
const LIST = [
  P("product-photo", "Product photo", "ai-image-generator", "Photos", "photo", "1:1", "A glass perfume bottle on a marble table, soft studio light, clean background", ["product", "shop", "photo", "beauty"], ["perfume-decanter", "espresso-cup-top-view"], "Signature Scent", "perfume bottle fragrance"),
  P("food-shot", "Food close-up", "ai-image-generator", "Photos", "photo", "4:5", "A fresh vegetable pizza straight from the oven, top view, warm restaurant light", ["food", "menu", "restaurant"], ["vegetable-pizza", "naan-bread"], "Fresh From The Oven", "pizza vegetables italian"),
  P("travel-poster", "Travel scene", "ai-image-generator", "Photos", "photo", "16:9", "Snowy mountains above a quiet green valley at sunrise, wide view", ["travel", "landscape", "mountains"], ["hunza-valley", "misty-mountain-ranges"], "Explore The North", "valley mountains river"),
  P("social-story", "Story background", "ai-image-generator", "For social media", "minimal", "9:16", "Soft pastel flowers and gentle gradients, plenty of empty space for text", ["story", "background", "social"], ["cosmos-flowers", "lavender-field"], "New Season", "pink flowers pastel"),
  P("blog-header", "Blog header", "ai-image-generator", "For social media", "minimal", "16:9", "A desk with a laptop and a latte in soft light, simple two-colour illustration", ["blog", "header", "work"], ["latte-white-desk", "ballpoint-pen-notebook"], "Plan A Calmer Week", "latte desk laptop workspace"),
  P("app-icon", "3D icon", "ai-image-generator", "For social media", "3d", "1:1", "A cute 3D globe icon with rounded shapes, studio light, plain background", ["icon", "3d", "app"], ["blue-marble-earth"], "Globe", "globe earth planet"),
  P("portrait-anime", "Anime avatar", "ai-image-generator", "People and characters", "anime", "1:1", "A cheerful latte with heart art as a cafe profile picture, anime style, bright colours", ["avatar", "profile", "anime", "cafe"], ["latte-heart", "espresso-cup-top-view"], "Morning Bean", "latte heart art"),
  P("kids-book", "Storybook scene", "ai-image-generator", "People and characters", "watercolour", "3:2", "A big tree on a hill at sunset with birds flying home, storybook illustration", ["kids", "story", "book"], ["sunset-tree-silhouette"], "The Sunset Tree", "sunset tree silhouette"),
  P("truck-peacock", "Truck art kingfisher", "ai-art-generator", "Folk and pattern art", "truck-art", "4:5", "A bright blue kingfisher on a branch, framed by painted flowers and bold borders", ["truck art", "bird", "folk"], ["kingfisher-bird"], "Bright Wings", "kingfisher bird"),
  P("truck-rickshaw", "Painted steam train", "ai-art-generator", "Folk and pattern art", "truck-art", "16:9", "A steam train crossing a stone bridge, covered in painted flowers, mirror dots and bold borders", ["train", "travel", "colour"], ["steam-train-bridge"], "Happy Journey", "train steam railway"),
  P("watercolour-city", "Watercolour city", "ai-art-generator", "Paintings", "watercolour", "3:2", "A grand old mosque with domes and minarets, in soft watercolour washes", ["city", "painting", "architecture"], ["badshahi-mosque-night"], "Old City", "mosque lahore"),
  P("watercolour-flowers", "Flower painting", "ai-art-generator", "Paintings", "watercolour", "4:5", "A loose bunch of pink and white cosmos flowers, watercolour on paper", ["flowers", "painting", "gift"], ["cosmos-flowers", "orange-gazania-flower"], "Spring Bloom", "cosmos pink flowers bouquet"),
  P("pencil-portrait", "Pencil sketch", "ai-art-generator", "Sketches", "pencil", "4:5", "A pair of elegant evening heels, detailed fashion pencil sketch", ["sketch", "fashion", "drawing"], ["black-evening-heels", "brown-horse-meadow"], "Evening Edit", "heels evening shoes"),
  P("pencil-building", "Building sketch", "ai-art-generator", "Sketches", "pencil", "3:2", "A modern office tower with rows of glass windows, architectural pencil drawing", ["architecture", "sketch", "office"], ["modern-office-building", "chain-bridge-night"], "Tower Study", "building modern architecture office"),
  P("minimal-poster", "Minimal poster", "ai-art-generator", "Modern art", "minimal", "4:5", "The sun rising over calm water, minimal poster with two colours", ["poster", "minimal", "wall art"], ["sunrise-over-sea"], "First Light", "sunrise sun sea"),
  P("clay-animals", "Clay animals", "ai-art-generator", "Modern art", "3d", "1:1", "A cute clay cat sitting in green grass, soft 3D clay look", ["3d", "cute", "kids"], ["tabby-white-cat"], "Clay Pals", "cat kitten"),
];
// Generated starters: our own recipes (style + shape + how the picture is framed) × subjects. id "<recipe>~<subject>".
// (Subject keys stay as they were so saved links keep working; the subjects follow the library photos.)
const SUBJECTS = [
  ["lake", "Misty mountains", "misty mountain ranges fading into blue at sunrise", ["misty-mountain-ranges", "snowy-mountain-slope"], "Into The Blue", "mist mountain ranges"],
  ["market", "Spice market", "green cardamom pods and spices piled high at the market", ["green-cardamom-pods"], "Spice Market", "spices cardamom spice"],
  ["tea", "Latte art", "a latte with a heart in the foam on a cafe table", ["latte-heart", "tea-plantation-leaves"], "Latte Love", "latte heart art"],
  ["bicycle", "Red bicycle", "a red folding bicycle parked on a quiet street", ["red-folding-bike", "open-country-road"], "City Ride", "bicycle bike red"],
  ["cat", "Coffee break", "a fresh cup of coffee on a small cafe table, top view", ["espresso-cup-top-view"], "Coffee Break", "latte coffee cafe cup"],
  ["lighthouse", "Beach resort", "sun loungers and umbrellas on a quiet resort beach", ["beach-loungers-umbrellas", "tropical-island-sailboats"], "Bay Days", "beach resort loungers umbrellas"],
  ["mangoes", "Brunch plate", "avocado toast with eggs and greens on a white plate, top view", ["avocado-toast-plate", "fresh-fruit-assortment"], "Brunch Club", "avocado toast brunch"],
  ["reader", "Modern workspace", "a bright coworking office with plants and long shared desks", ["coworking-office-interior", "latte-white-desk"], "Deep Work", "coworking office interior workplace"],
  ["gate", "Old city at night", "a grand old mosque lit up at night, red stone walls and white domes", ["badshahi-mosque-night"], "Old City Nights", "mosque lahore night"],
  ["balloons", "Balloon festival", "a colourful hot air balloon rising into a clear sky", ["hot-air-balloon", "white-clouds-blue-sky"], "Up And Away", "hot air balloon"],
  ["caravan", "Mountain peaks", "sharp mountain peaks above a river valley in the far north", ["passu-cones", "hunza-valley"], "Peak Season", "karakoram peaks passu"],
  ["corner", "Boutique rail", "colourful dresses hanging on a boutique rail", ["dresses-at-bazaar", "golden-bokeh-lights"], "New Arrivals", "dresses boutique clothes"],
];
const RECIPES = [
  ["studio", "Studio photo", "ai-image-generator", "Photos", "photo", "1:1", (s) => `${s}, clean background, soft studio light`],
  ["wide", "Wide scene", "ai-image-generator", "Photos", "photo", "16:9", (s) => `${s}, wide view, golden hour light`],
  ["story", "Story background", "ai-image-generator", "For social media", "minimal", "9:16", (s) => `${s}, simple shapes, lots of empty space for text`],
  ["icon", "3D scene", "ai-image-generator", "For social media", "3d", "1:1", (s) => `${s}, cute soft 3D shapes, studio light`],
  ["anime", "Anime scene", "ai-image-generator", "People and characters", "anime", "3:2", (s) => `${s}, anime illustration, bright colours`],
  ["poster", "Flat poster", "ai-image-generator", "For social media", "minimal", "4:5", (s) => `${s}, flat poster illustration, two or three colours`],
  ["truck", "Truck art", "ai-art-generator", "Folk and pattern art", "truck-art", "4:5", (s) => `${s}, framed by painted flowers and bold borders`],
  ["wash", "Watercolour", "ai-art-generator", "Paintings", "watercolour", "3:2", (s) => `${s}, loose watercolour washes on paper`],
  ["sketch", "Pencil sketch", "ai-art-generator", "Sketches", "pencil", "4:5", (s) => `${s}, detailed graphite pencil sketch`],
  ["mini", "Minimal art", "ai-art-generator", "Modern art", "minimal", "1:1", (s) => `${s}, minimal art print, calm colours`],
  ["clay", "Clay art", "ai-art-generator", "Modern art", "3d", "4:5", (s) => `${s}, handmade clay look, soft shadows`],
  ["manga", "Anime art", "ai-art-generator", "Paintings", "anime", "16:9", (s) => `${s}, anime background painting, dreamy sky`],
];
const GEN = [];
for (const [tool, off] of [["ai-image-generator", 0], ["ai-art-generator", 5]]) {
  const recs = RECIPES.filter((r) => r[2] === tool), seen = new Set();
  for (let k = 0; seen.size < 16 && k < 400; k++) {
    const r = recs[k % recs.length], sub = SUBJECTS[(k * 5 + off + Math.floor(k / recs.length)) % SUBJECTS.length], id = `${r[0]}~${sub[0]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    GEN.push(P(id, `${r[1]}: ${sub[1]}`, tool, r[3], r[4], r[5], r[6](sub[2].charAt(0).toUpperCase() + sub[2].slice(1)), [r[1].toLowerCase(), sub[1].toLowerCase(), r[4]], sub[3], sub[4], sub[5]));
  }
}
// Mixed order: hand-made and generated starters alternate within each tool.
const ALL = [];
for (const tool of ["ai-image-generator", "ai-art-generator"]) {
  const a = LIST.filter((x) => x.tool === tool), b = GEN.filter((x) => x.tool === tool);
  for (let i = 0; i < Math.max(a.length, b.length * 1); i++) { if (a[i]) ALL.push(a[i]); if (b[2 * i]) ALL.push(b[2 * i]); if (b[2 * i + 1]) ALL.push(b[2 * i + 1]); }
}

// ---------- the design of each template: [look (picture style), layout, palette]. Every pair is different.
const D = {
  "product-photo": ["photo", "productStage", "coral"], "studio~lake": ["vibrant", "promptHero", "ocean"], "wide~lighthouse": ["cinematic", "cinemaFrame", "midnight"],
  "food-shot": ["photo", "variations", "sand"], "story~caravan": ["flat", "phoneStory", "sunset"], "icon~bicycle": ["soft3d", "sticker", "mint"],
  "travel-poster": ["sunny", "poster", "forest"], "anime~gate": ["anime", "beforeAfter", "plum"], "poster~market": ["flat", "poster", "coral"],
  "social-story": ["duotone", "phoneStory", "berry"], "studio~reader": ["photo", "styleStrip", "slate"], "wide~lake": ["cinematic", "promptHero", "midnight"],
  "blog-header": ["duotone", "blogHeader", "electric"], "story~lighthouse": ["flat", "storyTrio", "ocean"], "icon~caravan": ["clay", "sticker", "sand"],
  "app-icon": ["clay", "appIcon", "electric"], "anime~bicycle": ["anime", "variations", "lime"], "poster~gate": ["flat", "gallery3", "ocean"],
  "portrait-anime": ["anime", "avatar", "rose"], "studio~tea": ["sunny", "polaroids", "forest"], "wide~reader": ["fadedfilm", "split", "sand"],
  "kids-book": ["watercolour", "storybook", "plum"], "story~lake": ["duotone", "storyTrio", "electric"], "icon~lighthouse": ["soft3d", "tilt3d", "ocean"],
  "truck-peacock": ["truck", "truckPanel", "midnight"], "truck~lighthouse": ["truck", "truckMirror", "coral"], "wash~caravan": ["watercolour", "paperSheet", "sand"],
  "truck-rickshaw": ["truck", "truckBand", "sunset"], "sketch~bicycle": ["pencil", "sketchbook", "cream"], "mini~gate": ["duotone", "framedPrint", "rose"],
  "watercolour-city": ["watercolour", "framedPrint", "cream"], "clay~market": ["clay", "clayFrame", "mint"], "manga~mangoes": ["anime", "cinemaFrame", "sunset"],
  "watercolour-flowers": ["watercolour", "roomWall", "berry"], "truck~lake": ["truck", "truckFrame", "gold"], "wash~lighthouse": ["watercolour", "beforeAfter", "ocean"],
  "pencil-portrait": ["pencil", "paperSheet", "slate"], "sketch~caravan": ["colourpencil", "sketchbook", "sand"], "mini~bicycle": ["flat", "split", "forest"],
  "pencil-building": ["pencil", "drafting", "ink"], "clay~gate": ["soft3d", "clayFrame", "berry"], "manga~market": ["anime", "styleStrip", "plum"],
  "minimal-poster": ["duotone", "poster", "midnight"], "truck~reader": ["truck", "truckDuo", "electric"], "wash~lake": ["watercolour", "variations", "ocean"],
  "clay-animals": ["clay", "avatar", "mint"], "sketch~lighthouse": ["pencil", "beforeAfter", "slate"], "mini~caravan": ["duotone", "circleCut", "sunset"],
};
const designOf = (x) => D[x.id] || ["photo", "promptHero", "ink"];

const COMP_NAME = { promptHero: "Prompt card", beforeAfter: "Before and after", variations: "Four ideas", framedPrint: "Framed print", poster: "Poster", phoneStory: "Phone story",
  storyTrio: "Three stories", sticker: "Sticker", appIcon: "App icon", avatar: "Profile card", styleStrip: "Style picker", cinemaFrame: "Film still", split: "Split card",
  blogHeader: "Blog header", polaroids: "Instant prints", storybook: "Storybook spread", tilt3d: "3D card", sketchbook: "Sketchbook", paperSheet: "Paper sheet",
  drafting: "Drawing sheet", clayFrame: "Clay frame", roomWall: "Wall art", circleCut: "Circle print", gallery3: "Print set", productStage: "Product stage",
  truckPanel: "Truck panel", truckBand: "Truck band", truckMirror: "Truck medallion", truckFrame: "Framed truck art", truckDuo: "Truck arches" };
const LOOK_NAME = { photo: "photo", vibrant: "vibrant", cinematic: "cinematic", sunny: "warm light", fadedfilm: "faded film", watercolour: "watercolour", pencil: "pencil",
  colourpencil: "colour pencil", clay: "clay", soft3d: "soft 3D", anime: "anime", flat: "flat colour", duotone: "duotone", truck: "truck art" };
export const TEMPLATES = ALL.map((x) => { const [lk, comp] = designOf(x); return { id: x.id, name: x.name, tool: x.tool, section: x.section, tags: x.tags, layout: `${lk}-${comp}`, layoutName: `${COMP_NAME[comp] || comp}, ${LOOK_NAME[lk] || lk}` }; });
export const TOTAL = TEMPLATES.length;
/** Distinct designs: every template has its own picture look + layout pair. */
export const LAYOUTS = new Set(TEMPLATES.map((t) => t.layout)).size;
export const presetById = (id) => { const x = ALL.find((p) => p.id === id); return x ? { id: x.id, name: x.name, tool: x.tool === "ai-art-generator" ? "art" : "image", style: x.style, aspect: x.aspect, prompt: x.prompt } : null; };

// ---------- drawing
const W = 320, H = 200;
const PBY = new Map(PHOTOS.map((p) => [p.id, p]));
/** Library photos that carry the most of the wanted tag words (ties all kept). */
export function photosWanting(want) {
  const words = String(want || "").toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2);
  let best = [], top = 0;
  if (words.length) for (const p of PHOTOS) {
    let s = 0; for (const w of words) if (p.tags?.includes(w) || p.id.split("-").includes(w)) s++;
    if (s > top) { top = s; best = [p]; } else if (s && s === top) best.push(p);
  }
  return best;
}
const photoOf = (x, i = 0) => {
  const best = photosWanting(x.want), have = best.length ? best : (x.ph || []).map((id) => PBY.get(id)).filter(Boolean);
  return have.length ? have[(hash(x.id) + i) % have.length] : pickPhoto(x.tags.join(" "), x.id + ":" + i);
};
const full = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? "#" + c.slice(1).split("").map((d) => d + d).join("") : c);
const mix = (a, b, t) => mix6(full(a), full(b), t);
const ASP = { "1:1": 1, "4:5": 0.8, "9:16": 0.5625, "16:9": 16 / 9, "3:2": 1.5 };
const LOOK_COLORS = { duotone: (p) => [p.dark, p.b === "#ffffff" ? p.a : p.b], flat: (p) => [p.dark, p.a, p.b, p.bg], neon: (p) => [p.b] };
const ink = (c) => (isDark(c) ? "#fff" : "#0f172a");
const sparkle = (x, y, s, fill) => pathEl(`M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z`, fill);
const one = (s, w, size, font = "sans") => fit(s, w, { size, min: size, maxLines: 1, font }).lines[0] || "";

function ctxOf(x, size) {
  const [lk, comp, pk] = designOf(x), pal = PAL[pk] || PAL.ink;
  const k = kit(x.id, size === "full" ? "full" : "");
  const o = { colors: LOOK_COLORS[lk]?.(pal), seed: (hash(x.id) % 9) + 1 };
  const fx = look(k, lk, o);
  const st = styleById(x.style)?.name || "Photo";
  return { k, x, lk, comp, pal, size, fx, ph: photoOf(x), ph2: photoOf(x, 1), st, styleLabel: lk === "colourpencil" ? "Colour pencil" : st, look: (name, oo = {}) => look(k, name, { ...o, ...oo }) };
}
/** Styled photo in a box (cover crop). */
const pic = (c, x, y, w, h, o = {}) => c.k.photo(o.photo || c.ph, x, y, w, h, { size: c.size, ex: o.fx ?? c.fx, rx: o.rx || 0, clip: o.clip || "", align: o.align || "xMidYMid" });
/** Glass prompt bar: sparkle, the prompt in one line, round go button. */
function promptBar(c, x, y, w, { dark = false, h = 24 } = {}) {
  const { k, pal } = c;
  const bg = dark ? "#111827" : "#ffffff", fg = dark ? "#f8fafc" : "#111827";
  let s = rect(x, y, w, h, bg, h / 2, ` fill-opacity="${dark ? 0.82 : 0.94}"` + k.shadow(3, 8, 0.25));
  s += circle(x + h / 2, y + h / 2, h * 0.36, pal.a) + sparkle(x + h / 2, y + h / 2, h * 0.2, "#fff");
  s += text(x + h + 2, y + h / 2 + 3, one(c.x.prompt, w - h * 2 - 8, 7.5), { size: 7.5, weight: 500, fill: fg });
  s += circle(x + w - h / 2, y + h / 2, h * 0.36, fg) + icon("arrow", x + w - h / 2 - h * 0.2, y + h / 2 - h * 0.2, h * 0.4, bg, 2.6);
  return s;
}
const chip = (c, x, y, label, o = {}) => c.k.pill(x, y, label, { size: o.size || 7, fill: o.fill || "#fff", color: o.color || "#111827", weight: 700, anchor: o.anchor || "start", stroke: o.stroke || "", upper: !!o.upper, ls: o.ls || 0 });
/** Left text column: eyebrow, big title, prompt lines, chips. Returns svg. */
function column(c, x, y, w, { fill, title = c.x.head, eyebrow, size = 26, lines = 3, chips = true, font = "sans" } = {}) {
  const fg = fill || c.pal.ink;
  let s = "";
  if (eyebrow !== "") s += text(x, y + 8, eyebrow || (c.x.tool === "ai-art-generator" ? "AI ART · " : "AI IMAGE · ") + c.styleLabel.toUpperCase(), { size: 7, weight: 800, fill: c.pal.a === fg ? c.pal.b : c.pal.a, ls: 1 });
  const hl = headline(x, y + 14, w, title, { size, min: 12, maxLines: 3, weight: 900, fill: fg, font, lh: 0.95 });
  s += hl.svg;
  let yy = y + 14 + hl.h + 6;
  const f = fit(c.x.prompt, w, { size: 7.4, min: 6.5, maxLines: lines });
  s += text(x, yy + 7, f.lines, { size: f.size, fill: fg, opacity: 0.72, weight: 500, lh: 1.32 });
  yy += f.lines.length * f.size * 1.32 + 7;
  if (chips) { const a = chip(c, x, yy, c.styleLabel, { fill: c.pal.a, color: ink(c.pal.a) }); s += a.svg + chip(c, x + a.w + 4, yy, c.x.aspect, { fill: "none", color: fg, stroke: fg }).svg; }
  return s;
}

// ---------- layouts (each draws the whole 320×200 card)
const L = {
  promptHero(c) {
    let s = pic(c, 0, 0, W, H) + c.k.scrim(0, H * 0.4, W, H * 0.6, "#000", 0, 0.62) + c.k.scrim(0, 0, W, 50, "#000", 0, 0.35, "down");
    s += chip(c, 12, 12, "✦ " + c.styleLabel, { fill: "#fff", color: c.pal.dark }).svg + chip(c, W - 12, 12, c.x.aspect, { fill: c.pal.a, color: ink(c.pal.a), anchor: "end" }).svg;
    s += headline(14, H - 92, W * 0.75, c.x.head, { size: 30, min: 16, maxLines: 2, weight: 900, fill: "#fff", lh: 0.92 }).svg;
    return s + promptBar(c, 12, H - 36, W - 24);
  },
  beforeAfter(c) {
    const mid = W * 0.5;
    let s = c.k.photo(c.ph, 0, 0, W, H, { size: c.size }) + `<g${c.k.clipRect(mid, 0, W - mid, H)}>${pic(c, 0, 0, W, H)}</g>`;
    s += line(mid, 0, mid, H, "#fff", 2.5) + circle(mid, H * 0.46, 13, "#fff", c.k.shadow(2, 6, 0.3)) + pathEl(`M${mid - 8} ${H * 0.46}l5 -4.5v9zM${mid + 8} ${H * 0.46}l-5 -4.5v9z`, c.pal.dark);
    s += chip(c, 10, 10, "Reference photo", { fill: "#000", color: "#fff" }).svg.replace('fill="#000"', 'fill="#000" fill-opacity=".55"') + chip(c, W - 10, 10, "✦ " + c.styleLabel, { fill: c.pal.a, color: ink(c.pal.a), anchor: "end" }).svg;
    return s + promptBar(c, 12, H - 34, W - 24, { dark: true });
  },
  variations(c) {
    const pw = W * 0.42, g = 5, cw = (W - pw - g * 3) / 2, ch = (H - g * 3) / 2;
    let s = rect(0, 0, W, H, c.pal.dark) + column(c, 14, 16, pw - 24, { fill: "#fff", size: 22, lines: 4 });
    const al = ["xMidYMid", "xMinYMin", "xMaxYMid", "xMidYMax"];
    for (let i = 0; i < 4; i++) {
      const x = pw + g + (i % 2) * (cw + g), y = g + Math.floor(i / 2) * (ch + g);
      s += pic(c, x, y, cw, ch, { rx: 8, align: al[i] });
      if (!i) s += rect(x, y, cw, ch, "none", 8, ` stroke="${c.pal.b}" stroke-width="2.5"`) + circle(x + cw - 11, y + 11, 7, c.pal.b) + icon("check", x + cw - 16, y + 6, 10, ink(c.pal.b), 3);
    }
    return s + text(14, H - 12, "4 picture ideas · pick one", { size: 7, fill: "#fff", opacity: 0.6, weight: 600 });
  },
  framedPrint(c) {
    const r = ASP[c.x.aspect] || 1, fh = 156, fw = Math.min(150, fh * r), fx = W - fw - 34, fy = (H - fh) / 2 - 4;
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 90)) + rect(0, H - 26, W, 26, mix(c.pal.soft, c.pal.ink, 0.12));
    s += rect(fx - 9, fy - 9, fw + 18, fh + 18, c.pal.dark, 2, c.k.shadow(8, 14, 0.35)) + rect(fx - 3, fy - 3, fw + 6, fh + 6, "#fbfaf6") + pic(c, fx + 6, fy + 6, fw - 12, fh - 12);
    s += column(c, 18, 26, fx - 40, { size: 24, font: "serif", lines: 3, eyebrow: "ART PRINT · " + c.x.aspect });
    return s;
  },
  poster(c) {
    const pw = 124, ph = 156, px = W - pw - 26, py = 22;
    let s = rect(0, 0, W, H, c.k.lin([c.pal.a, c.pal.dark], 120)) + c.k.blob(W * 0.15, H * 0.9, 70, "#fff", { ex: ' opacity=".08"' }) + rect(0, 0, W, H, c.k.dots("#fff", 10, 1, 0.18));
    s += `<g transform="rotate(3 ${px + pw / 2} ${py + ph / 2})">` + rect(px, py, pw, ph, c.pal.bg, 3, c.k.shadow(10, 16, 0.4)) + pic(c, px + 7, py + 7, pw - 14, ph * 0.66);
    const f = fit(c.x.head, pw - 16, { size: 17, min: 9, maxLines: 2, upper: true, font: "display" });
    s += text(px + 8, py + ph * 0.66 + 7 + f.size * 0.92, f.lines, { size: f.size, weight: 900, fill: c.pal.ink, upper: true, lh: 0.95, font: "display" });
    s += text(px + 8, py + ph - 8, c.x.tool === "ai-art-generator" ? "ART PRINT · LIMITED" : "WWW.EXAMPLE.COM", { size: 5.5, weight: 700, fill: c.pal.ink, opacity: 0.6, ls: 0.6 }) + `</g>`;
    s += column(c, 18, 24, px - 34, { fill: "#fff", size: 25, lines: 4 });
    return s;
  },
  phoneStory(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 160)) + c.k.blob(W * 0.78, H * 0.3, 80, c.pal.a, { ex: ' opacity=".22"' });
    const ph = c.k.phone(W - 124, 8, 98, 184);
    s += ph.svg + pic(c, ph.x, ph.y, ph.w, ph.h, { rx: ph.rx }) + c.k.scrim(ph.x, ph.y, ph.w, 40, "#000", 0, 0.45, "down");
    for (let i = 0; i < 3; i++) s += rect(ph.x + 6 + i * ((ph.w - 12) / 3), ph.y + 6, (ph.w - 12) / 3 - 3, 2, "#fff", 1, i ? ' opacity=".45"' : "");
    s += circle(ph.x + 13, ph.y + 20, 6, c.pal.a, ' stroke="#fff" stroke-width="1.4"') + text(ph.x + 23, ph.y + 23, "yourbrand", { size: 6.5, weight: 700, fill: "#fff" });
    const f = fit(c.x.head, ph.w - 16, { size: 16, min: 9, maxLines: 3, upper: true, font: "display" });
    s += text(ph.x + ph.w / 2, ph.y + ph.h * 0.52, f.lines, { size: f.size, weight: 900, fill: "#fff", anchor: "middle", upper: true, lh: 0.95, font: "display", stroke: "rgba(0,0,0,.25)", sw: 2 });
    s += rect(ph.x + 8, ph.y + ph.h - 22, ph.w - 16, 14, "none", 7, ' stroke="#fff" stroke-opacity=".8"') + text(ph.x + 15, ph.y + ph.h - 12.5, "Send message", { size: 6, fill: "#fff", weight: 500 });
    return s + column(c, 18, 26, W - 160, { size: 25, lines: 4, eyebrow: "STORY 9:16 · " + c.styleLabel.toUpperCase() });
  },
  storyTrio(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.dark, mix(c.pal.dark, c.pal.a, 0.45)], 135));
    s += text(16, 24, c.x.head, { size: 16, weight: 900, fill: "#fff" }) + text(W - 16, 24, "3 STORY IDEAS", { size: 7, weight: 800, fill: c.pal.b, anchor: "end", ls: 1 });
    const cw = 74, chh = 132, cy = 40, al = ["xMinYMid", "xMidYMid", "xMaxYMid"];
    [[-7, 52, 0.92], [7, W - 52 - cw * 0.92, 0.92], [0, (W - cw * 1.08) / 2, 1.08]].forEach(([rot, x, sc], i) => {
      const w = cw * sc, h = chh * sc, y = cy + (i === 2 ? -4 : 10);
      s += `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">` + rect(x - 3, y - 3, w + 6, h + 6, "#fff", 10, c.k.shadow(6, 12, 0.4)) + pic(c, x, y, w, h, { rx: 8, align: al[i] });
      if (i === 2) s += rect(x + 8, y + 8, w - 16, 2, "#fff", 1) + text(x + w / 2, y + h * 0.55, fit(c.x.head.toUpperCase(), w - 12, { size: 9, min: 5.5, maxLines: 1 }).lines[0], { size: fit(c.x.head.toUpperCase(), w - 12, { size: 9, min: 5.5, maxLines: 1 }).size, weight: 900, fill: "#fff", anchor: "middle", stroke: "rgba(0,0,0,.25)", sw: 2 });
      s += `</g>`;
    });
    return s + promptBar(c, 40, H - 26, W - 80, { h: 20 });
  },
  sticker(c) {
    let s = rect(0, 0, W, H, c.pal.soft) + rect(0, 0, W, H, c.k.dots(c.pal.a, 12, 1.2, 0.25));
    const cx = 92, cy = 100, r = 66;
    s += `<g transform="rotate(-6 ${cx} ${cy})">` + circle(cx, cy, r + 7, "#fff", c.k.shadow(8, 14, 0.3)) + pic(c, cx - r, cy - r, r * 2, r * 2, { clip: circle(cx, cy, r, "#000") }) + `</g>`;
    s += circle(cx + 70, cy + 52, 25, "#fff", c.k.shadow(4, 8, 0.25)) + pic(c, cx + 49, cy + 31, 42, 42, { clip: circle(cx + 70, cy + 52, 21, "#000"), align: "xMaxYMin" });
    s += sparkle(28, 30, 9, c.pal.a) + sparkle(170, 26, 6, c.pal.b) + sparkle(160, 170, 5, c.pal.a);
    return s + column(c, 186, 30, W - 200, { size: 22, lines: 4, eyebrow: "STICKER · " + c.styleLabel.toUpperCase() });
  },
  appIcon(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.a, c.pal.b], 135)) + rect(0, 0, W, H, c.k.rad([["#fff", 0.35], ["#fff", 0]], 0.3, 0.2, 0.7));
    const sz = 112, x = 30, y = 30;
    s += rect(x, y + 8, sz, sz, "#000", 30, ' opacity=".18"' + c.k.blur(8)) + pic(c, x, y, sz, sz, { rx: 30 }) + rect(x, y, sz, sz * 0.5, c.k.lin([["#fff", 0.45], ["#fff", 0]], 90), 30) + rect(x, y, sz, sz, "none", 30, ' stroke="#fff" stroke-opacity=".6" stroke-width="2"');
    [[160, 40], [196, 40], [232, 40], [160, 76], [196, 76]].forEach(([ix, iy], i) => { s += rect(ix, iy, 28, 28, "#fff", 8, ` opacity="${0.22 + (i % 2) * 0.1}"`); });
    s += text(x + sz / 2, y + sz + 22, c.x.head, { size: 11, weight: 800, fill: "#fff", anchor: "middle" });
    s += headline(160, 116, 146, c.x.name, { size: 20, min: 12, maxLines: 2, weight: 900, fill: "#fff" }).svg;
    return s + chip(c, 160, 162, "✦ " + c.styleLabel + " · " + c.x.aspect, { fill: "#fff", color: c.pal.dark }).svg;
  },
  avatar(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 90)) + c.k.blob(70, 100, 86, c.pal.a, { ex: ' opacity=".22"' });
    const cx = 78, cy = 100, r = 58;
    s += circle(cx, cy, r + 6, c.k.lin([c.pal.a, c.pal.b], 45)) + circle(cx, cy, r + 2, "#fff") + pic(c, cx - r, cy - r, r * 2, r * 2, { clip: circle(cx, cy, r, "#000") }) + circle(cx + r * 0.7, cy + r * 0.7, 9, "#22c55e", ' stroke="#fff" stroke-width="3"');
    const x0 = 158, y0 = 34;
    s += c.k.card(x0, y0, 146, 132, { rx: 14 }) + text(x0 + 14, y0 + 30, c.x.head, { size: 16, weight: 900, fill: "#0f172a" }) + text(x0 + 14, y0 + 44, "@" + c.x.head.toLowerCase().replace(/[^a-z]+/g, ""), { size: 7.5, fill: "#64748b", weight: 600 });
    [["128", "Posts"], ["2.4k", "Followers"], ["310", "Following"]].forEach(([n, l], i) => { s += text(x0 + 14 + i * 44, y0 + 68, n, { size: 11, weight: 900, fill: "#0f172a" }) + text(x0 + 14 + i * 44, y0 + 78, l, { size: 6, fill: "#64748b" }); });
    s += rect(x0 + 14, y0 + 92, 118, 20, c.pal.a, 10) + text(x0 + 73, y0 + 105, "Follow", { size: 8, weight: 800, fill: ink(c.pal.a), anchor: "middle" });
    return s + chip(c, 12, 12, "✦ " + c.styleLabel + " avatar", { fill: c.pal.dark, color: "#fff" }).svg;
  },
  styleStrip(c) {
    const mw = W * 0.7;
    let s = rect(0, 0, W, H, "#0f172a") + pic(c, 0, 0, mw, H) + c.k.scrim(0, H * 0.5, mw, H * 0.5, "#000", 0, 0.55);
    s += headline(12, H - 72, mw - 24, c.x.head, { size: 22, min: 12, maxLines: 1, weight: 900, fill: "#fff" }).svg + promptBar(c, 10, H - 34, mw - 20, { h: 22 });
    const opts = [[c.lk, c.styleLabel], ["watercolour", "Watercolour"], ["popart", "Pop art"], ["neon", "Neon"]];
    const sx = mw + 8, sw = W - mw - 16, sh = (H - 12 - 3 * 6) / 4;
    opts.forEach(([lk, lab], i) => {
      const y = 6 + i * (sh + 6);
      s += pic(c, sx, y, sw, sh - 11, { rx: 6, fx: i ? c.look(lk, { colors: lk === "neon" ? [c.pal.b] : undefined }) : c.fx });
      if (!i) s += rect(sx - 1.5, y - 1.5, sw + 3, sh - 8, "none", 7, ` stroke="${c.pal.b}" stroke-width="2"`);
      s += text(sx + 2, y + sh - 2, lab, { size: 6.5, weight: i ? 600 : 800, fill: i ? "#cbd5e1" : "#fff" });
    });
    return s;
  },
  cinemaFrame(c) {
    const bh = W / 2.39, by = (H - bh) / 2 - 6;
    let s = rect(0, 0, W, H, "#050507") + pic(c, 0, by, W, bh) + c.k.scrim(0, by + bh * 0.5, W, bh * 0.5, "#000", 0, 0.5);
    s += text(W / 2, by + bh - 12, one(`"${c.x.head}"`, W - 40, 11), { size: 11, weight: 700, fill: "#fde68a", anchor: "middle", italic: true });
    s += text(12, by - 8, "SCENE 01 · " + c.styleLabel.toUpperCase(), { size: 6.5, fill: "#fff", opacity: 0.7, weight: 700, ls: 1.2, font: "mono" }) + text(W - 12, by - 8, c.x.aspect + " · 24 FPS", { size: 6.5, fill: "#fff", opacity: 0.7, anchor: "end", font: "mono" });
    s += text(12, H - 12, one(c.x.prompt, W - 24, 7, "mono"), { size: 7, fill: "#cbd5e1", font: "mono" });
    return s + rect(0, 0, W, H, "none", 0, ` stroke="${c.pal.a}" stroke-width="0"`);
  },
  split(c) {
    const pw = W * 0.54;
    let s = rect(0, 0, W, H, c.pal.bg) + pic(c, 0, 0, pw, H) + rect(pw - 4, 0, 4, H, c.pal.a);
    s += c.k.blob(W - 10, 10, 50, c.pal.a, { ex: ' opacity=".14"' });
    return s + column(c, pw + 14, 22, W - pw - 26, { size: 22, lines: 4 });
  },
  blogHeader(c) {
    const b = c.k.browser(12, 10, W - 24, H - 20, { url: "blog.example.com" });
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 90)) + b.svg;
    const hy = b.top, hh = 96;
    s += pic(c, 12, hy, W - 24, hh) + c.k.scrim(12, hy, W - 24, hh, "#000", 0.05, 0.55, "right");
    s += text(26, hy + 22, "WORK · 4 MIN READ", { size: 6.5, weight: 800, fill: "#fff", ls: 1 }) + headline(26, hy + 30, 170, c.x.head, { size: 22, min: 12, maxLines: 2, weight: 900, fill: "#fff" }).svg;
    s += text(26, hy + hh + 18, "Five small habits that keep your desk and your week calm", { size: 8.5, weight: 800, fill: "#0f172a" });
    s += circle(31, hy + hh + 32, 5, c.pal.a) + text(40, hy + hh + 35, "By Sana Noor · 12 March", { size: 6.5, fill: "#64748b" });
    return s + chip(c, W - 26, hy + hh + 26, "✦ " + c.styleLabel, { fill: c.pal.a, color: "#fff", anchor: "end" }).svg;
  },
  polaroids(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, mix(c.pal.soft, c.pal.a, 0.2)], 90)) + rect(0, 0, W, H, c.k.dots(c.pal.ink, 9, 0.8, 0.12));
    [[-9, 26, 30, "xMinYMid", "Sunday, 4 pm"], [7, 132, 22, "xMaxYMid", c.x.head]].forEach(([rot, x, y, al, cap], i) => {
      s += `<g transform="rotate(${rot} ${x + 60} ${y + 72})">` + rect(x, y, 120, 146, "#fffdf8", 3, c.k.shadow(8, 12, 0.3)) + pic(c, x + 8, y + 8, 104, 104, { align: al });
      s += text(x + 60, y + 132, cap, { size: 11, fill: "#334155", anchor: "middle", font: "script", weight: 400 }) + `</g>`;
      if (i) s += rect(x + 44, y - 8, 34, 12, c.pal.b, 1, ' opacity=".75" transform="rotate(7 ' + (x + 60) + " " + y + ')"');
    });
    return s + chip(c, W - 12, H - 24, "✦ " + c.styleLabel + " · " + c.x.aspect, { fill: c.pal.dark, color: "#fff", anchor: "end" }).svg;
  },
  storybook(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.dark, mix(c.pal.dark, c.pal.a, 0.4)], 90));
    const bx = 18, by = 16, pw = 142, ph = 168;
    s += rect(bx - 4, by + 4, pw * 2 + 8, ph, "#000", 6, ' opacity=".3"' + c.k.blur(5)) + rect(bx, by, pw, ph, "#fbf7ef", 4) + rect(bx + pw, by, pw, ph, "#fbf7ef", 4);
    s += rect(bx + pw - 14, by, 28, ph, c.k.lin([["#000", 0], ["#000", 0.18], ["#000", 0]], 0));
    s += text(bx + 14, by + 40, "O", { size: 34, weight: 700, fill: c.pal.a, font: "serif" }) + text(bx + 42, by + 22, ["nce, on a quiet", "hill, a big old", "tree watched the", "sun go down."], { size: 9, fill: "#3b2f2a", font: "serif", lh: 1.35 });
    s += text(bx + 14, by + 92, ["Every evening the", "birds flew home to", "its branches, and the", "whole sky turned gold."], { size: 8, fill: "#3b2f2a", opacity: 0.85, font: "serif", lh: 1.4 });
    s += text(bx + pw / 2, by + ph - 10, "— 12 —", { size: 6.5, fill: "#8a7a6a", anchor: "middle", font: "serif" });
    s += pic(c, bx + pw + 10, by + 12, pw - 20, ph - 34, { clip: c.k.blob(bx + pw + pw / 2, by + 12 + (ph - 34) / 2, 64, "#000", { pts: 9, jitter: 0.18 }) });
    return s + text(bx + pw + pw / 2, by + ph - 10, c.x.head, { size: 8, fill: "#3b2f2a", anchor: "middle", font: "serif", italic: true });
  },
  tilt3d(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 90));
    s += circle(292, 176, 16, c.k.rad([[c.pal.b, 1], [mix(c.pal.b, "#000", 0.35), 1]], 0.35, 0.3, 0.75)) + circle(36, 168, 14, c.k.rad([[c.pal.a, 1], [mix(c.pal.a, "#000", 0.35), 1]], 0.35, 0.3, 0.75));
    s += `<g transform="matrix(1 -.12 .18 1 -14 30)">` + rect(30, 50, 140, 106, mix(c.pal.a, "#000", 0.35), 18, c.k.shadow(16, 18, 0.35)) + pic(c, 24, 42, 140, 106, { rx: 18 }) + rect(24, 42, 140, 46, c.k.lin([["#fff", 0.35], ["#fff", 0]], 90), 18) + `</g>`;
    return s + column(c, 196, 40, 112, { size: 19, lines: 4, eyebrow: "3D SCENE · " + c.x.aspect });
  },
  sketchbook(c) {
    let s = rect(0, 0, W, H, c.k.lin([mix(c.pal.soft, "#8b6a4f", 0.25), c.pal.soft], 90));
    s += `<g transform="rotate(-3 120 104)">` + rect(32, 18, 180, 170, "#fdfcf8", 4, c.k.shadow(8, 14, 0.3)) + pic(c, 46, 36, 152, 116, { clip: c.k.blob(122, 94, 70, "#000", { pts: 10, jitter: 0.16 }) });
    for (let i = 0; i < 9; i++) s += circle(46 + i * 19, 18, 4.5, "none", ' stroke="#475569" stroke-width="2"');
    s += text(46, 176, c.x.head, { size: 12, fill: "#334155", font: "script", weight: 400 }) + `</g>`;
    s += `<g transform="rotate(-28 250 150)">` + rect(200, 146, 96, 8, "#facc15", 1) + pathEl("M296 146l14 4-14 4z", "#e2c9a0") + pathEl("M306 148.8l4 1.2-4 1.2z", "#334155") + rect(196, 146, 6, 8, "#f472b6", 1) + `</g>`;
    return s + column(c, 226, 22, 84, { size: 14, lines: 3, chips: false, eyebrow: c.styleLabel.toUpperCase() }) + chip(c, 226, 104, c.x.aspect, { fill: c.pal.ink, color: "#fff" }).svg;
  },
  paperSheet(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.dark, mix(c.pal.dark, c.pal.a, 0.3)], 90));
    const x0 = 24, y0 = 14, w = 170, h = 172;
    let d = `M${x0} ${y0}`; for (let i = 1; i <= 14; i++) d += `L${x0 + (w / 14) * i} ${y0 + (i % 2 ? 2.5 : 0)}`; d += `L${x0 + w} ${y0 + h}`; for (let i = 13; i >= 0; i--) d += `L${x0 + (w / 14) * i} ${y0 + h - (i % 2 ? 3 : 0)}`; d += "Z";
    s += pathEl(d, "#fbf8f1", c.k.shadow(8, 12, 0.4)) + pic(c, x0 + 12, y0 + 14, w - 24, h - 40, { clip: c.k.blob(x0 + w / 2, y0 + 14 + (h - 40) / 2, 72, "#000", { pts: 11, jitter: 0.14 }) });
    s += text(x0 + w - 12, y0 + h - 12, c.x.head, { size: 10, fill: "#475569", anchor: "end", font: "script", weight: 400 });
    if (c.lk === "watercolour") ["#e11d48", "#f59e0b", "#0ea5e9", "#16a34a", "#7c3aed"].forEach((col, i) => { s += circle(W - 30 - (i % 2) * 18, 40 + i * 16, 7, col, ' opacity=".85"'); });
    return s + column(c, 206, 22, 100, { fill: "#fff", size: 16, lines: 4, chips: true });
  },
  drafting(c) {
    let s = rect(0, 0, W, H, "#1e3a5f") + rect(0, 0, W, H, c.k.pattern(14, 14, '<path d="M14 0H0V14" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width=".6"/>'));
    s += rect(18, 14, 284, 172, "#f8fafc", 2, c.k.shadow(6, 12, 0.35)) + pic(c, 28, 24, 190, 150);
    s += rect(226, 24, 66, 150, "none", 0, ' stroke="#334155" stroke-width="1"') + text(232, 40, "PROJECT", { size: 5.5, fill: "#64748b", weight: 700, ls: 0.6 }) + text(232, 52, one(c.x.head, 56, 8), { size: 8, fill: "#0f172a", weight: 800 });
    [["SCALE", "1:200"], ["SHEET", "01 / 04"], ["STYLE", "Pencil"], ["DRAWN", "AsaanDesk"]].forEach(([a, b], i) => { s += line(226, 62 + i * 26, 292, 62 + i * 26, "#334155", 0.6) + text(232, 72 + i * 26, a, { size: 5, fill: "#64748b", weight: 700, ls: 0.6 }) + text(232, 82 + i * 26, b, { size: 7.5, fill: "#0f172a", weight: 700 }); });
    return s + rect(18, 188, 200, 7, "#e2e8f0", 1, ' opacity=".9"') + Array.from({ length: 20 }, (_, i) => line(22 + i * 10, 188, 22 + i * 10, i % 5 ? 191 : 193, "#475569", 0.6)).join("");
  },
  clayFrame(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, mix(c.pal.soft, c.pal.a, 0.25)], 90));
    s += rect(20, 16, 168, 168, c.k.lin([mix(c.pal.a, "#fff", 0.25), mix(c.pal.a, "#000", 0.2)], 120), 34, c.k.shadow(10, 16, 0.3)) + pic(c, 34, 30, 140, 140, { rx: 24 }) + rect(34, 30, 140, 140, "none", 24, ' stroke="#000" stroke-opacity=".18" stroke-width="3"');
    [[300, 180, 12, c.pal.b], [186, 176, 10, c.pal.a], [14, 14, 8, c.pal.b]].forEach(([x, y, r, col]) => { s += circle(x, y, r, c.k.rad([[mix(col, "#fff", 0.45), 1], [col, 1], [mix(col, "#000", 0.3), 1]], 0.35, 0.3, 0.8)); });
    return s + column(c, 206, 30, 104, { size: 19, lines: 4, eyebrow: "CLAY ART · " + c.x.aspect });
  },
  roomWall(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, mix(c.pal.soft, c.pal.a, 0.18)], 90)) + rect(0, 158, W, 42, mix(c.pal.soft, "#5b4636", 0.35));
    const fw = 92, fh = 116, fx = 170, fy = 14;
    s += rect(fx - 6, fy - 6, fw + 12, fh + 12, "#f8fafc", 2, c.k.shadow(6, 12, 0.3)) + rect(fx - 6, fy - 6, fw + 12, fh + 12, "none", 2, ' stroke="#c9a46a" stroke-width="2"') + pic(c, fx, fy, fw, fh);
    s += rect(136, 136, 160, 40, c.pal.a, 14, c.k.shadow(6, 10, 0.3)) + rect(126, 124, 28, 50, mix(c.pal.a, "#000", 0.15), 12) + rect(280, 124, 28, 50, mix(c.pal.a, "#000", 0.15), 12) + rect(146, 176, 6, 10, "#3f2d1f") + rect(282, 176, 6, 10, "#3f2d1f");
    s += pathEl("M104 158c-4-24 2-44 10-58 4 16 2 36-10 58zM104 158c-14-14-20-30-18-44 10 10 16 26 18 44z", "#3f7d4f") + rect(94, 150, 20, 18, "#e8dccb", 3);
    return s + column(c, 14, 22, 92, { size: 17, lines: 3, chips: false, eyebrow: "WALL ART · " + c.x.aspect, title: c.x.head }) + chip(c, 14, 168, c.styleLabel, { fill: c.pal.ink, color: "#fff" }).svg;
  },
  circleCut(c) {
    let s = rect(0, 0, W, H, c.pal.bg) + circle(232, 98, 96, c.pal.a, ' opacity=".9"') + pic(c, 156, 22, 152, 152, { clip: circle(232, 98, 76, "#000") });
    s += circle(232, 98, 76, "none", ` stroke="${c.pal.bg}" stroke-width="4"`);
    return s + column(c, 18, 28, 130, { fill: c.pal.ink, size: 24, lines: 4, eyebrow: "MINIMAL ART · " + c.x.aspect });
  },
  gallery3(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 90)) + rect(0, 172, W, 28, mix(c.pal.soft, c.pal.ink, 0.1));
    const al = ["xMinYMid", "xMidYMid", "xMaxYMid"];
    [[30, 54, 74, 96], [123, 36, 74, 116], [216, 54, 74, 96]].forEach(([x, y, w, h], i) => { s += rect(x - 5, y - 5, w + 10, h + 10, c.pal.ink, 1, c.k.shadow(6, 10, 0.3)) + rect(x - 2, y - 2, w + 4, h + 4, "#fff") + pic(c, x + 2, y + 2, w - 4, h - 4, { align: al[i] }); });
    return s + text(W / 2, 22, c.x.head + " · set of 3", { size: 12, weight: 900, fill: c.pal.ink, anchor: "middle" }) + text(W / 2, 190, c.styleLabel + " prints · " + c.x.aspect, { size: 7, fill: c.pal.ink, opacity: 0.65, anchor: "middle", weight: 600 });
  },
  productStage(c) {
    let s = rect(0, 0, W, H, c.k.lin([c.pal.soft, c.pal.bg], 90));
    s += pathEl("M150 186V80a70 70 0 0 1 140 0v106z", c.k.lin([mix(c.pal.a, "#fff", 0.55), mix(c.pal.a, "#fff", 0.3)], 90));
    s += `<ellipse cx="220" cy="176" rx="64" ry="11" fill="${mix(c.pal.a, "#000", 0.15)}"/>` + rect(156, 162, 128, 14, mix(c.pal.a, "#fff", 0.15)) + `<ellipse cx="220" cy="162" rx="64" ry="11" fill="${mix(c.pal.a, "#fff", 0.35)}"/>`;
    s += circle(220, 112, 50, "#000", ' opacity=".2"' + c.k.blur(6)) + pic(c, 170, 58, 100, 100, { clip: circle(220, 108, 50, "#000") });
    s += c.k.pill(256, 40, "Rs 4,950", { size: 8, fill: c.pal.dark, color: "#fff" }).svg;
    return s + column(c, 18, 22, 124, { size: 24, lines: 4, eyebrow: "PRODUCT PHOTO · " + c.x.aspect });
  },
  truckPanel(c) {
    let s = rect(0, 0, W, H, "#0d1b3e") + rect(0, 0, W, H, truckPattern(c, "#ffd400", "#e11d48"));
    const x = 26, y = 12, w = 140, h = 176;
    s += rect(x, y, w, h, "#ffd400", 10, c.k.shadow(6, 12, 0.5)) + rect(x + 5, y + 5, w - 10, h - 10, chevrons(c, "#e11d48", "#16a34a"), 8);
    s += rect(x + 14, y + 14, w - 28, h - 46, "#fff", 4) + pic(c, x + 17, y + 17, w - 34, h - 52);
    s += flowers(c, [[x + 14, y + 14], [x + w - 14, y + 14]], 9);
    s += rect(x + 12, y + h - 28, w - 24, 18, "#0d1b3e", 9) + text(x + w / 2, y + h - 15.5, c.x.head.toUpperCase(), { size: 8.5, weight: 900, fill: "#ffd400", anchor: "middle", ls: 0.8 });
    return s + column(c, 184, 32, 124, { fill: "#fff", size: 22, lines: 4, eyebrow: "TRUCK ART · " + c.x.aspect });
  },
  truckBand(c) {
    let s = pic(c, 0, 26, W, H - 52) + rect(0, 0, W, 30, "#e11d48") + rect(0, H - 30, W, 30, "#16a34a");
    s += rect(0, 26, W, 6, chevrons(c, "#ffd400", "#2563eb")) + rect(0, H - 32, W, 6, chevrons(c, "#ffd400", "#2563eb"));
    for (let i = 0; i < 16; i++) s += circle(10 + i * 20, 13, 5, i % 2 ? "#ffd400" : "#fff") + circle(10 + i * 20, 13, 2, "#2563eb") + circle(10 + i * 20, H - 15, 5, i % 2 ? "#fff" : "#ffd400") + circle(10 + i * 20, H - 15, 2, "#e11d48");
    s += c.k.card(70, 120, 180, 34, { fill: "#fff7d6", rx: 17, sh: [4, 8, 0.4] }) + rect(73, 123, 174, 28, "none", 14, ' stroke="#e11d48" stroke-width="1.5" stroke-dasharray="4 3"');
    s += text(160, 142, c.x.head, { size: 15, weight: 900, fill: "#0d1b3e", anchor: "middle", font: "script" });
    return s + chip(c, 12, 40, "✦ Truck art · " + c.x.aspect, { fill: "#0d1b3e", color: "#ffd400" }).svg;
  },
  truckMirror(c) {
    let s = rect(0, 0, W, H, "#fef3c7") + rect(0, 0, W, H, truckPattern(c, "#e11d48", "#2563eb"));
    const cx = 100, cy = 100, r = 62;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s += `<ellipse cx="${(cx + Math.cos(a) * (r + 14)).toFixed(1)}" cy="${(cy + Math.sin(a) * (r + 14)).toFixed(1)}" rx="11" ry="6" transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(cx + Math.cos(a) * (r + 14)).toFixed(1)} ${(cy + Math.sin(a) * (r + 14)).toFixed(1)})" fill="${["#e11d48", "#16a34a", "#2563eb", "#f59e0b"][i % 4]}"/>`; }
    s += circle(cx, cy, r + 5, "#ffd400", c.k.shadow(4, 10, 0.35)) + pic(c, cx - r, cy - r, r * 2, r * 2, { clip: circle(cx, cy, r, "#000") });
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; s += circle(cx + Math.cos(a) * (r + 2.5), cy + Math.sin(a) * (r + 2.5), 1.8, "#fff"); }
    return s + c.k.card(186, 34, 122, 132, { fill: "#0d1b3e", rx: 12 }) + column(c, 198, 46, 100, { fill: "#fff", size: 18, lines: 4, eyebrow: "TRUCK ART" });
  },
  truckFrame(c) {
    let s = rect(0, 0, W, H, c.k.lin(["#2a2118", "#15100b"], 90)) + rect(0, 0, W, H, c.k.rad([["#ffd27a", 0.25], ["#000", 0]], 0.3, 0.1, 0.7));
    const x = 30, y = 18, w = 128, h = 160;
    s += rect(x - 10, y - 10, w + 20, h + 20, c.k.lin(["#f3d9a4", "#b8892f", "#f3d9a4"], 45), 4, c.k.shadow(10, 16, 0.6)) + rect(x - 4, y - 4, w + 8, h + 8, chevrons(c, "#e11d48", "#2563eb"), 2) + pic(c, x, y, w, h);
    s += flowers(c, [[x, y], [x + w, y], [x, y + h], [x + w, y + h]], 8);
    return s + column(c, 184, 34, 124, { fill: "#f8f1e3", size: 22, lines: 4, eyebrow: "TRUCK ART · FRAMED" });
  },
  truckDuo(c) {
    let s = rect(0, 0, W, H, c.k.lin(["#1e1b6e", "#0d1b3e"], 90)) + rect(0, 0, W, H, truckPattern(c, "#22d3ee", "#f472b6"));
    const arch = (x, y, w, h) => `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;
    [[22, "xMinYMid"], [116, "xMaxYMid"]].forEach(([x, al], i) => {
      const y = 18, w = 84, h = 150;
      s += pathEl(arch(x - 6, y - 6, w + 12, h + 12), i ? "#16a34a" : "#e11d48", c.k.shadow(6, 10, 0.5)) + pathEl(arch(x - 2, y - 2, w + 4, h + 4), "#ffd400");
      s += pic(c, x, y, w, h, { clip: `<path d="${arch(x, y, w, h)}"/>`, align: al });
      for (let j = 0; j < 7; j++) s += circle(x + 6 + j * 12, y + h + 14, 3.5, ["#ffd400", "#fff", "#f472b6"][j % 3]);
    });
    return s + column(c, 214, 30, 96, { fill: "#fff", size: 17, lines: 4, eyebrow: "TRUCK ART" });
  },
};
function chevrons(c, a, b) { return c.k.pattern(10, 10, `<rect width="10" height="10" fill="${a}"/><path d="M0 10L5 4L10 10M0 5L5 -1L10 5" fill="none" stroke="${b}" stroke-width="2.2"/>`); }
function truckPattern(c, a, b) { return c.k.pattern(36, 36, `<circle cx="18" cy="18" r="4" fill="${a}" opacity=".35"/><path d="M18 8c3 4 3 6 0 10-3-4-3-6 0-10zM18 28c3-4 3-6 0-10-3 4-3 6 0 10zM8 18c4-3 6-3 10 0-4 3-6 3-10 0zM28 18c-4-3-6-3-10 0 4 3 6 3 10 0z" fill="${b}" opacity=".3"/><circle cx="0" cy="0" r="2" fill="${a}" opacity=".4"/><circle cx="36" cy="36" r="2" fill="${a}" opacity=".4"/>`); }
function flowers(c, pts, r) { let s = ""; for (const [x, y] of pts) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s += circle(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, i % 2 ? "#e11d48" : "#f472b6"); } s += circle(x, y, r * 0.42, "#ffd400") + circle(x, y, r * 0.18, "#16a34a"); } return s; }

/** The template's design as SVG (320×200). size "thumb" = small photo files (galleries), "full" = full-size photos. */
export function design(id, size = "thumb") {
  const x = ALL.find((p) => p.id === id) || ALL[0];
  const c = ctxOf(x, size);
  const body = (L[c.comp] || L.promptHero)(c);
  return c.k.svg(W, H, body);
}
/** Gallery thumbnail: the example design with small photo files. */
export function thumb(id) { return design(id, "thumb"); }
