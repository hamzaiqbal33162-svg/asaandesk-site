// AI image and AI art generator: request building and checking (no DOM, tested in Node).
// The pictures themselves can only come from AsaanDesk AI (onlineAi('/ai/image', …)); nothing here makes one up.

export const TOOLS = {
  image: { title: "AI image generator", lead: "Describe a picture and AsaanDesk AI will make it.", defaultStyle: "photo" },
  art: { title: "AI art generator", lead: "Turn an idea into a painting, a sketch or truck-art style artwork.", defaultStyle: "watercolour" },
  graphic: { title: "AI graphics generator", lead: "Describe a sticker, icon or illustration and AsaanDesk AI draws it on a see-through background.", defaultStyle: "g-simple" },
};
// Our own style names. The hint is what the style adds to the prompt on the server. group = the style family
// (like Canva's photography / digital art / fine art choice).
export const STYLES = [
  { id: "photo", name: "Photo", group: "Photography", hint: "realistic photograph, natural light" },
  { id: "watercolour", name: "Watercolour", group: "Fine art", hint: "soft watercolour painting on paper" },
  { id: "truck-art", name: "Truck art", group: "Fine art", hint: "bright Pakistani truck art, bold patterns, flowers and borders" },
  { id: "minimal", name: "Minimal", group: "Digital art", hint: "minimal flat illustration, few colours, lots of space" },
  { id: "3d", name: "3D", group: "Digital art", hint: "soft 3D render, clay-like shapes, studio light" },
  { id: "anime", name: "Anime", group: "Digital art", hint: "anime illustration, clean lines, vivid colours" },
  { id: "pencil", name: "Pencil", group: "Fine art", hint: "graphite pencil sketch, shading on white paper" },
  { id: "cinematic", name: "Cinematic", group: "Photography", hint: "film still, dramatic light, shallow depth of field" },
  { id: "vector", name: "Vector", group: "Digital art", hint: "flat vector illustration, clean shapes, bold outlines" },
  { id: "pop-art", name: "Pop art", group: "Digital art", hint: "pop art, halftone dots, bold primary colours" },
  { id: "neon", name: "Neon", group: "Digital art", hint: "glowing neon lights on a dark background" },
  { id: "retro", name: "Retro", group: "Fine art", hint: "retro 1970s poster, warm colours, paper grain" },
  { id: "ink", name: "Ink", group: "Fine art", hint: "ink brush drawing, strong black strokes, soft washes" },
];
/** Graphics (stickers, icons, illustrations on a see-through background): simple, artistic or detailed. */
export const GRAPHIC_STYLES = [
  { id: "g-simple", name: "Simple", group: "Graphics", hint: "simple flat graphic, few colours, clean shapes, transparent background" },
  { id: "g-artistic", name: "Artistic", group: "Graphics", hint: "hand-drawn artistic graphic, textured strokes, transparent background" },
  { id: "g-detailed", name: "Detailed", group: "Graphics", hint: "detailed illustration with soft shading, transparent background" },
];
/** Style families per tool, in the order they are shown. */
export const GROUP_ORDER = { image: ["Photography", "Digital art", "Fine art"], art: ["Fine art", "Digital art", "Photography"], graphic: ["Graphics"] };
export const stylesFor = (tool) => (tool === "graphic" ? GRAPHIC_STYLES : STYLES);
/** How a reference picture guides the result (like Dream Lab's reference options). */
export const REF_MODES = [["look", "Its look and colours"], ["layout", "Its layout"], ["subject", "Its main subject"]];
/** Style order per tool (every style is available in both; the tool's own kinds come first). */
export const STYLE_ORDER = {
  image: ["photo", "cinematic", "3d", "anime", "vector", "pop-art", "minimal", "watercolour", "truck-art", "pencil", "neon", "retro", "ink"],
  art: ["watercolour", "truck-art", "pencil", "ink", "neon", "retro", "anime", "minimal", "3d", "pop-art", "vector", "photo", "cinematic"],
  graphic: ["g-simple", "g-artistic", "g-detailed"],
};
/** Example prompts per tool (our own words). */
export const EXAMPLES = {
  image: [
    ["Chai by the window", "A cup of chai on a wooden table by a rainy window"],
    ["Mountain sunrise", "Snowy mountains above a quiet valley at sunrise"],
    ["Rickshaw street", "A colourful rickshaw on a busy market street"],
    ["Product shot", "A handmade leather wallet on a marble table, soft studio light"],
    ["Cosy cafe", "A small cosy cafe at night with warm lights and plants"],
    ["Space kid", "A child in a cardboard space helmet looking at the stars"],
  ],
  art: [
    ["Truck art peacock", "A peacock with a bright tail, framed by painted flowers and bold borders"],
    ["Watercolour lanes", "Old city lanes with arches and balconies in soft watercolour"],
    ["Neon city", "A rainy city street at night with glowing neon signs"],
    ["Ink mountains", "Misty mountains and a lone boat in ink brush strokes"],
    ["Retro poster", "A retro travel poster of a desert road at sunset"],
    ["Pencil portrait", "An old man reading a newspaper, detailed pencil sketch"],
  ],
  graphic: [
    ["Coffee sticker", "A smiling coffee cup sticker with steam hearts"],
    ["Shop badge", "A round 'handmade' badge with a needle and thread"],
    ["Leaf icon", "A simple green leaf icon for an eco product"],
    ["Rocket", "A small rocket taking off with a puff of smoke"],
    ["Gift box", "A gift box with a big ribbon and confetti"],
    ["Mango", "A ripe mango with two leaves, cute and round"],
  ],
};
/** "Inspire me": a random example prompt for the tool. rnd = a number in [0, 1). */
export const inspire = (tool, rnd = Math.random()) => { const list = EXAMPLES[tool] || EXAMPLES.image; return list[Math.min(list.length - 1, Math.floor(rnd * list.length))]; };

/* Prompt helper: better prompts name the light, the framing and the colours (Canva's prompt tips). */
export const PROMPT_HELP = {
  Light: ["soft studio light", "golden hour sunlight", "natural daylight", "glowing neon light", "moody low light"],
  Framing: ["close-up", "wide-angle view", "top-down flat lay", "portrait framing", "centred on a plain background"],
  Colours: ["pastel colours", "vivid colours", "warm tones", "cool blue tones", "black and white"],
  Mood: ["calm and peaceful", "cheerful", "dramatic", "dreamy", "cosy"],
};
/** Adds a phrase to the prompt once (", phrase"), within the length limit. */
export function addToPrompt(prompt, phrase) {
  const p = String(prompt || "").replace(/\s+$/g, ""), add = String(phrase || "").trim();
  if (!add || p.toLowerCase().includes(add.toLowerCase())) return p;
  const out = p ? `${p.replace(/[,.;\s]+$/, "")}, ${add}` : add[0].toUpperCase() + add.slice(1);
  return out.slice(0, MAX_PROMPT);
}
const has = (p, words) => words.some((w) => p.includes(w));
/** Short tips for what the prompt still leaves out (empty when it already says enough). */
export function promptTips(prompt) {
  const p = String(prompt || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!p) return [];
  const tips = [];
  if (p.split(" ").length < 5) tips.push("Say more about the subject: who or what, doing what, where.");
  if (!has(p, ["light", "sun", "glow", "shadow", "night", "dawn", "dusk", "lamp", "bright", "dark"])) tips.push("Say what the light is like (for example soft studio light, golden hour).");
  if (!has(p, ["close", "wide", "top", "view", "portrait", "background", "frame", "angle", "flat lay", "shot", "centred", "centered"])) tips.push("Say how it is framed (close-up, wide view, top-down).");
  if (!has(p, ["colour", "color", "red", "blue", "green", "yellow", "pink", "purple", "orange", "black", "white", "gold", "pastel", "vivid", "warm", "cool", "tone"])) tips.push("Name colours or a colour mood (pastel, warm tones).");
  return tips;
}
/** Brand kit colours that can be sent with a request: up to 5 "#rrggbb". */
export const cleanColors = (list) => [...new Set((Array.isArray(list) ? list : []).map((c) => String(c || "").trim().toLowerCase()).filter((c) => /^#[0-9a-f]{6}$/.test(c)))].slice(0, 5);
export const MAX_REF_BYTES = 1500000;
/** A reference picture for the request: a JPEG/PNG/WebP data URL that is not too big, else "". */
export const cleanReference = (v) => (typeof v === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= MAX_REF_BYTES ? v : "");
// Sizes are multiples of 64 (what image models expect) close to each shape.
export const ASPECTS = [
  { id: "1:1", label: "Square", w: 1024, h: 1024 },
  { id: "4:5", label: "Portrait", w: 832, h: 1024 },
  { id: "9:16", label: "Story", w: 768, h: 1344 },
  { id: "16:9", label: "Wide", w: 1344, h: 768 },
  { id: "3:2", label: "Classic", w: 1216, h: 832 },
];
export const MAX_PROMPT = 1000;
export const MAX_COUNT = 4;

export const styleById = (id) => STYLES.find((s) => s.id === id) || GRAPHIC_STYLES.find((s) => s.id === id) || null;
export const aspectById = (id) => ASPECTS.find((a) => a.id === id) || null;

/**
 * Checks the form and returns the JSON body for POST /ai/image:
 * { prompt, negative, style, aspect, count, tool, width, height }. Throws a friendly Error when something is off.
 */
export function buildRequest({ prompt, negative = "", style, aspect = "1:1", count = 1, tool = "image", reference = "", refMode = "look", colors = [] } = {}) {
  const p = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!p) throw new Error("Describe the picture first.");
  if (p.length > MAX_PROMPT) throw new Error(`Please keep the description under ${MAX_PROMPT} letters.`);
  const tl = TOOLS[tool] ? tool : "image";
  const st = styleById(style || TOOLS[tl].defaultStyle);
  if (!st || !stylesFor(tl).includes(st)) throw new Error("Pick a style.");
  const a = aspectById(aspect);
  if (!a) throw new Error("Pick a shape.");
  const n = Math.round(Number(count));
  if (!(n >= 1 && n <= MAX_COUNT)) throw new Error(`You can make 1 to ${MAX_COUNT} pictures at a time.`);
  if (reference && !cleanReference(reference)) throw new Error("The reference picture must be a JPG, PNG or WebP under 1 MB.");
  const out = { prompt: p, negative: String(negative || "").replace(/\s+/g, " ").trim().slice(0, 400), style: st.id, aspect: a.id, count: n, tool: tl, width: a.w, height: a.h };
  if (reference) { out.reference = reference; out.refMode = REF_MODES.some(([k]) => k === refMode) ? refMode : "look"; }
  if (tl === "graphic") out.transparent = true;
  const cs = cleanColors(colors);
  if (cs.length) out.colors = cs; // "Use my brand colours"
  return out;
}

/**
 * Follow-up on a picture you made (like Dream Lab): "edit" = change it with words, "boost" = a sharper, bigger copy,
 * "similar" = more pictures like it. source = the picture (data: URL or https link). Throws a friendly Error.
 */
export function buildRefine({ kind = "edit", source = "", edit = "", prompt = "", style = "", aspect = "1:1" } = {}) {
  if (!["edit", "boost", "similar"].includes(kind)) throw new Error("Unknown change.");
  const src = String(source || "");
  if (!/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|https:\/\/\S+)$/.test(src)) throw new Error("That picture can't be sent.");
  const out = { kind, source: src, prompt: String(prompt || "").replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT), style: styleById(style)?.id || "", aspect: aspectById(aspect)?.id || "1:1" };
  if (kind === "edit") {
    const e = String(edit || "").replace(/\s+/g, " ").trim();
    if (!e) throw new Error("Say what to change, for example: make the cup blue.");
    if (e.length > 400) throw new Error("Please keep the change under 400 letters.");
    out.edit = e;
  }
  return out;
}

const SRC_OK = /^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|https:\/\/\S+)$/;
/** The picture sources in the Worker's answer ({ images: [src | {src|url}] }). Throws if there are none. */
export function parseResult(data, want = 1) {
  const list = Array.isArray(data?.images) ? data.images : data?.image ? [data.image] : [];
  const srcs = list.map((x) => (typeof x === "string" ? x : x?.src || x?.url || "")).filter((s) => SRC_OK.test(s));
  if (!srcs.length) throw new Error("AsaanDesk AI did not send any pictures back. Nothing was saved. Please try again.");
  return srcs.slice(0, Math.max(1, want));
}

/** A friendly file name from the prompt. */
export function fileNameFor(prompt, i = 0, ext = "png") {
  const base = String(prompt || "ai-image").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "ai-image";
  return `${base}${i ? "-" + (i + 1) : ""}.${ext}`;
}
