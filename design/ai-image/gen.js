// AI image and AI art generator: request building and checking (no DOM, tested in Node).
// The pictures themselves can only come from AsaanDesk AI (onlineAi('/ai/image', …)); nothing here makes one up.

export const TOOLS = {
  image: { title: "AI image generator", lead: "Describe a picture and AsaanDesk AI will make it.", defaultStyle: "photo" },
  art: { title: "AI art generator", lead: "Turn an idea into a painting, a sketch or truck-art style artwork.", defaultStyle: "watercolour" },
};
// Our own style names. The hint is what the style adds to the prompt on the server.
export const STYLES = [
  { id: "photo", name: "Photo", hint: "realistic photograph, natural light" },
  { id: "watercolour", name: "Watercolour", hint: "soft watercolour painting on paper" },
  { id: "truck-art", name: "Truck art", hint: "bright Pakistani truck art, bold patterns, flowers and borders" },
  { id: "minimal", name: "Minimal", hint: "minimal flat illustration, few colours, lots of space" },
  { id: "3d", name: "3D", hint: "soft 3D render, clay-like shapes, studio light" },
  { id: "anime", name: "Anime", hint: "anime illustration, clean lines, vivid colours" },
  { id: "pencil", name: "Pencil", hint: "graphite pencil sketch, shading on white paper" },
];
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

export const styleById = (id) => STYLES.find((s) => s.id === id) || null;
export const aspectById = (id) => ASPECTS.find((a) => a.id === id) || null;

/**
 * Checks the form and returns the JSON body for POST /ai/image:
 * { prompt, negative, style, aspect, count, tool, width, height }. Throws a friendly Error when something is off.
 */
export function buildRequest({ prompt, negative = "", style, aspect = "1:1", count = 1, tool = "image" } = {}) {
  const p = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!p) throw new Error("Describe the picture first.");
  if (p.length > MAX_PROMPT) throw new Error(`Please keep the description under ${MAX_PROMPT} letters.`);
  const st = styleById(style || TOOLS[tool]?.defaultStyle);
  if (!st) throw new Error("Pick a style.");
  const a = aspectById(aspect);
  if (!a) throw new Error("Pick a shape.");
  const n = Math.round(Number(count));
  if (!(n >= 1 && n <= MAX_COUNT)) throw new Error(`You can make 1 to ${MAX_COUNT} pictures at a time.`);
  return { prompt: p, negative: String(negative || "").replace(/\s+/g, " ").trim().slice(0, 400), style: st.id, aspect: a.id, count: n, tool: TOOLS[tool] ? tool : "image", width: a.w, height: a.h };
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
