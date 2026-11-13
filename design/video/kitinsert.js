// Left-rail kit inserts for the video family (shared/panels/index.js interface): where an item lands on the frame and how
// big it is, and the text clip a kit text spec becomes. Pure (no DOM), unit tested; editor.js / recorder.js do the I/O.
//   pos  = the drop point as a fraction of the frame (0..1, centre of the item); a click (no point) = the centre.
//   rel  = the item's longer side as a fraction of the frame's shorter side (the kit's sizes); aspect = width / height.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = (v) => Math.round(v * 1000) / 1000;

/** Default sizes (rel) per kit kind when the spec has none. */
export const DEFAULT_REL = { shape: 0.3, svg: 0.3, frame: 0.4, grid: 0.8, chart: 0.5, table: 0.6, video: 0.5, image: 0.4, drawing: 0.4 };
/** Text font size (fraction of the shorter side) per role when the spec has no rel. */
export const TEXT_REL = { heading: 0.075, subheading: 0.045, body: 0.03, caption: 0.022 };
export const TEXT_DEFAULTS = { heading: "Add a heading", subheading: "Add a subheading", body: "Add a little bit of body text", caption: "Add a caption" };

/** Drop point -> frame fraction. rect = the preview canvas' getBoundingClientRect(); pt = {clientX, clientY} or undefined. */
export function kitPos(pt, rect) {
  if (!pt || !rect || !(rect.width > 0) || !(rect.height > 0) || !Number.isFinite(pt.clientX) || !Number.isFinite(pt.clientY)) return { x: 0.5, y: 0.5 };
  return { x: r3(clamp((pt.clientX - rect.left) / rect.width, 0, 1)), y: r3(clamp((pt.clientY - rect.top) / rect.height, 0, 1)) };
}

/** Width / height of an SVG from its viewBox (or width / height attributes); 1 when unknown. */
export function svgAspect(markup) {
  const head = String(markup || "").match(/<svg\b[^>]*>/i)?.[0] || "";
  const vb = head.match(/viewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([\d.eE]+)[\s,]+([\d.eE]+)/i);
  if (vb && +vb[3] > 0 && +vb[4] > 0) return +vb[3] / +vb[4];
  const w = parseFloat(head.match(/\swidth\s*=\s*["']?([\d.]+)/i)?.[1]), h = parseFloat(head.match(/\sheight\s*=\s*["']?([\d.]+)/i)?.[1]);
  return w > 0 && h > 0 ? w / h : 1;
}

/** The SVG with explicit pixel width / height on its root (so it draws at that size as a picture). */
export function svgSized(markup, w, h) {
  const s = String(markup || "");
  return s.replace(/<svg\b([^>]*)>/i, (all, attrs) => {
    let a = attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    if (!/xmlns\s*=/.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
    return `<svg${a} width="${Math.round(w)}" height="${Math.round(h)}">`;
  });
}

/** Pixel size (at the frame's 1080p units) of an item: longer side = rel × shorter side of the frame. */
export function itemPx({ rel, aspect = 1, kind = "svg" } = {}, frame) {
  const S = Math.min(frame.w, frame.h), long = clamp(+rel > 0 ? +rel : DEFAULT_REL[kind] || 0.3, 0.02, 2) * S, a = aspect > 0 ? aspect : 1;
  return a >= 1 ? { w: long, h: long / a } : { w: long * a, h: long };
}

/** Overlay clip geometry {x, y, w} (centre and width as fractions of the frame), kept inside the frame. */
export function overlayBox(size, frame, pos = { x: 0.5, y: 0.5 }) {
  const w = clamp(size.w / frame.w, 0.02, 1), h = clamp(size.h / frame.h, 0.02, 1);
  const x = w >= 1 ? 0.5 : clamp(pos.x, w / 2, 1 - w / 2), y = h >= 1 ? 0.5 : clamp(pos.y, h / 2, 1 - h / 2);
  return { x: r3(x), y: r3(y), w: r3(w) };
}

/** A FONT_FAMILIES key for a kit family (a key, a label or a CSS family list); "sans" when nothing matches. */
export function familyKey(family, families) {
  const f = String(family || "").trim();
  if (!f) return "";
  if (families[f]) return f;
  const low = f.toLowerCase();
  for (const [k, v] of Object.entries(families)) if (v.label?.toLowerCase().startsWith(low) || v.css?.toLowerCase().includes(low.split(",")[0].replace(/["']/g, "").trim())) return k;
  if (/mono|courier|code/.test(low)) return families.mono ? "mono" : "sans";
  if (/serif|times|georgia|garamond|playfair|merriweather|lora/.test(low) && !/sans/.test(low)) return families.serif ? "serif" : "sans";
  return "sans";
}

/** The role of a kit text spec (heading / subheading / body / caption). */
export const roleOf = (spec) => (TEXT_REL[spec?.role] ? spec.role : "body");

/**
 * Text clip fields (video model TextClip: size = px at 1080 on the shorter side, x / y = centre 0..1) for a kit text
 * spec. dark = the frame under it is light (a blank white page), so the default colour is dark.
 */
export function textClipFields(spec = {}, { families = {}, dark = false } = {}) {
  const role = roleOf(spec), rel = +spec.rel > 0 ? +spec.rel : TEXT_REL[role];
  let text = String(spec.content ?? spec.text ?? "").trim() || TEXT_DEFAULTS[role];
  if (spec.uppercase) text = text.toUpperCase();
  const style = role === "heading" ? "title" : role === "caption" ? "caption" : "subtitle";
  const bold = spec.bold ?? (+spec.weight ? +spec.weight >= 600 : role === "heading");
  const out = { style, text, size: Math.round(clamp(rel, 0.008, 0.4) * 1080), bold: !!bold, italic: !!spec.italic,
    color: spec.color || (dark ? "#1b2133" : "#ffffff"), align: ["left", "center", "right"].includes(spec.align) ? spec.align : "center" };
  if (spec.background) out.bg = spec.background;
  else if (role === "caption" && !spec.color) { out.color = "#ffffff"; out.bg = "#000000a6"; } else out.bg = "";
  const fam = familyKey(spec.family, families); if (fam) out.family = fam;
  if (+spec.letterSpacing) out.spacing = +spec.letterSpacing;
  if (+spec.lineHeight) out.lineHeight = +spec.lineHeight;
  if (spec.stroke && +spec.strokeWidth > 0) { out.stroke = spec.stroke; out.strokeW = +spec.strokeWidth; }
  return out;
}

/** Approximate height of a text clip as a fraction of the frame height (lines × size × line height). */
export function textHeight(fields, frame) {
  const lines = String(fields.text || "").split("\n").length;
  return (lines * fields.size * (fields.lineHeight || 1.22)) / frame.h;
}

/**
 * Text clip fields for a group (font combinations), centred on pos: each box at its dx / dy (centre offset from the
 * group centre in rel units = fractions of the shorter side) when the specs have them, else stacked top to bottom with a
 * gap of ~0.3 line. The whole group is kept inside the frame.
 */
export function groupFields(specs, frame, pos = { x: 0.5, y: 0.5 }, opts = {}) {
  const src = specs || [], list = src.map((s) => textClipFields(s, opts));
  if (!list.length) return [];
  const hs = list.map((f) => textHeight(f, frame)), S = Math.min(frame.w, frame.h);
  let offs;
  if (src.some((s) => s && (Number.isFinite(s.dx) || Number.isFinite(s.dy)))) offs = src.map((s) => ({ x: ((+s.dx || 0) * S) / frame.w, y: ((+s.dy || 0) * S) / frame.h }));
  else {
    const gaps = list.slice(1).map((f) => (0.3 * f.size) / frame.h), total = hs.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    let y = -total / 2;
    offs = list.map((f, i) => { const cy = y + hs[i] / 2; y += hs[i] + (gaps[i] || 0); return { x: 0, y: cy }; });
  }
  const top = Math.min(...offs.map((o, i) => o.y - hs[i] / 2)), bottom = Math.max(...offs.map((o, i) => o.y + hs[i] / 2));
  const cy = clamp(pos.y, -top, 1 - bottom), cx = clamp(pos.x, 0.1, 0.9);
  return list.map((f, i) => ({ ...f, x: r3(clamp(cx + offs[i].x, 0, 1)), y: r3(clamp(cy + offs[i].y, 0, 1)) }));
}

/** Is this source a real video file (not an SVG / picture)? */
export function isVideoSrc(src, type = "") {
  const s = typeof src === "string" ? src : "";
  if (typeof Blob !== "undefined" && src instanceof Blob) return /^video\//.test(src.type || type);
  if (/^data:video\//i.test(s) || /^video\//.test(type)) return true;
  if (/^data:/i.test(s)) return false;
  return /\.(mp4|webm|mov|m4v|ogv|mkv)(\?|#|$)/i.test(s);
}
/** Is this source a picture (SVG or raster)? */
export const isImageSrc = (src) => typeof src === "string" && (/^data:image\//i.test(src) || /\.(svg|png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(src) || /^\s*<svg\b/i.test(src));

// ---------- Design panel (Layouts / Styles tabs) and "Apply this template style" ----------
/** A title on the video: big words (the Title style is 120 px at 1080, template titles more). */
export const isTitle = (c) => (c?.size || 0) >= 90;
/** Restyles text clips in place: titles take look.head, other words look.body ({family, color, bold}); a text with a box
 * (lower third, caption) takes look.box as its box colour (white words). Captions keep their own look but take the font. */
export function styleTexts(texts, look = {}) {
  for (const c of texts || []) {
    const src = isTitle(c) ? look.head : look.body;
    if (!src) continue;
    if (src.family) c.family = src.family;
    if (c.cap) continue;
    if (c.bg && look.box) { c.bg = look.box; c.color = "#ffffff"; }
    else if (src.color) c.color = src.color;
    if (typeof src.bold === "boolean") c.bold = src.bold;
  }
  return texts;
}
/** A gallery palette ({a, b, dark, light}) as a video look: dark background, light words, accent titles, boxes in the main colour. */
export const paletteLook = (pal) => ({ bg: pal.dark, head: { color: pal.b }, body: { color: pal.light }, box: `${pal.a}e6` });
/** Font sets for Design › Styles: heading + body FONT_FAMILIES keys. */
export const FONT_SETS = [
  { id: "clean", label: "Clean", head: "sans", body: "sans" }, { id: "classic", label: "Classic", head: "serif", body: "sans" },
  { id: "elegant", label: "Elegant", head: "cambria", body: "calibri" }, { id: "modern", label: "Modern", head: "calibri", body: "calibri" },
  { id: "editorial", label: "Editorial", head: "serif", body: "serif" }, { id: "tech", label: "Tech", head: "mono", body: "sans" },
];
/** Text layouts for Design › Layouts: where the words on screen go (biggest first, stacked ~0.3 line apart). */
export const TEXT_LAYOUTS = [
  { id: "middle", label: "Centred", x: 0.5, y: 0.5, align: "center" },
  { id: "top", label: "Title at the top", x: 0.5, top: 0.1, align: "center" },
  { id: "bottom", label: "Words at the bottom", x: 0.5, bottom: 0.9, align: "center" },
  { id: "left", label: "Left side", x: 0.32, y: 0.5, align: "left" },
  { id: "lower", label: "Lower third", x: 0.32, bottom: 0.88, align: "left" },
];
/** New {x, y, align} for each text (same order as given) for a layout id; the biggest text goes first (on top). */
export function layoutTexts(texts, frame, id) {
  const L = TEXT_LAYOUTS.find((l) => l.id === id) || TEXT_LAYOUTS[0];
  const order = (texts || []).map((c, i) => ({ c, i })).sort((p, q) => (q.c.size || 0) - (p.c.size || 0) || p.i - q.i);
  const hs = order.map(({ c }) => textHeight(c, frame)), gaps = order.slice(1).map(({ c }) => (0.3 * (c.size || 50)) / frame.h);
  const total = hs.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  let y = L.top != null ? L.top : L.bottom != null ? L.bottom - total : (L.y ?? 0.5) - total / 2;
  y = clamp(y, 0, Math.max(0, 1 - total));
  const out = new Array(order.length);
  order.forEach(({ i }, k) => { out[i] = { x: L.x, y: r3(clamp(y + hs[k] / 2, 0, 1)), align: L.align }; y += hs[k] + (gaps[k] || 0); });
  return out;
}
