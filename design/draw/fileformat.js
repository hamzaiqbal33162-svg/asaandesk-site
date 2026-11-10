// AsaanDesk Draw: the layered drawing file (.asaandesk-draw.json) and canvas size presets. Pure, no DOM.
// { type: "asaandesk-draw", version: 1, name, width, height, background: "#rrggbb", active: index,
//   layers: [{ name, opacity: 0..1, hidden, src: "data:image/png;base64,..." }] }   (layers bottom first)
export const FILE_TYPE = "asaandesk-draw";
export const FILE_EXT = ".asaandesk-draw.json";
export const MIN_SIDE = 16, MAX_SIDE = 4096, MAX_LAYERS = 50;
export const PRESETS = [
  { id: "square", label: "Square", note: "Posts", w: 1080, h: 1080 },
  { id: "story", label: "Story", note: "Phone screen", w: 1080, h: 1920 },
  { id: "a4", label: "A4", note: "150 dpi, print", w: 1240, h: 1754 },
  { id: "hd", label: "Wide HD", note: "Slides, video", w: 1920, h: 1080 },
  { id: "custom", label: "Custom", note: "Any size", w: 1200, h: 800 },
];
const side = (v, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(MIN_SIDE, Math.min(MAX_SIDE, n)) : d; };
export const clampSize = (w, h) => [side(w, 1080), side(h, 1080)];
const hex = (v, d = "#ffffff") => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v).toLowerCase() : d);
const name = (v, d) => (String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80) || d);

export function serializeDrawing({ name: n, width, height, background, active = 0, layers }) {
  return {
    type: FILE_TYPE, version: 1, app: "AsaanDesk Draw", name: name(n, "My drawing"), width, height, background: hex(background),
    active: Math.max(0, Math.min(active, layers.length - 1)),
    layers: layers.map((l, i) => ({ name: name(l.name, `Layer ${i + 1}`), opacity: +(+l.opacity).toFixed(3), hidden: !!l.hidden, src: l.src || null })),
  };
}

/** Checks and normalises a drawing file (object or JSON text). Throws an Error with a friendly message. */
export function parseDrawing(input) {
  let o = input;
  if (typeof o === "string") { try { o = JSON.parse(o); } catch { throw new Error("This file is not a drawing file (it is not valid JSON)."); } }
  if (!o || typeof o !== "object" || o.type !== FILE_TYPE) throw new Error("This is not an AsaanDesk drawing file.");
  if (+o.version > 1) throw new Error("This drawing was made with a newer version of AsaanDesk Draw.");
  if (!Array.isArray(o.layers) || !o.layers.length) throw new Error("This drawing file has no layers.");
  if (o.layers.length > MAX_LAYERS) throw new Error(`A drawing can have at most ${MAX_LAYERS} layers.`);
  const [width, height] = clampSize(o.width, o.height);
  const layers = o.layers.map((l, i) => {
    const src = l?.src ?? null;
    if (src !== null && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]*$/.test(String(src))) throw new Error(`Layer ${i + 1} has a picture this app can't read.`);
    const op = Number.isFinite(+l?.opacity) ? Math.max(0, Math.min(1, +l.opacity)) : 1;
    return { name: name(l?.name, `Layer ${i + 1}`), opacity: op, hidden: !!l?.hidden, src };
  });
  const active = Number.isInteger(o.active) ? Math.max(0, Math.min(o.active, layers.length - 1)) : layers.length - 1;
  return { name: name(o.name, "My drawing"), width, height, background: hex(o.background), active, layers };
}

/** A safe file name from the drawing name. */
export function slugName(n) {
  return String(n || "drawing").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "drawing";
}
