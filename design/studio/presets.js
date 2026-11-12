// AsaanDesk Studio design sizes (presets). Pure module: no DOM access, safe to import anywhere
// (the site's tool pages, the Templates Marketplace, Node tests).
//
// Preset = { id, label, group, w, h, unit: 'px' | 'mm' | 'in', dpi, bleed /* preset unit */, pages?, guides?, tags? }
// guides: [{ type: 'fold', axis: 'x' | 'y', at: 0..1 }, { type: 'cut', shape: 'circle' | 'rounded', inset /* preset unit */ },
//          { type: 'safe', inset /* preset unit */ }]
// Page geometry in a design is CSS pixels at 96 dpi, so 1 in = 96 px and 1 mm = 96 / 25.4 px.

export const PX_PER_IN = 96;
export const MM_PER_IN = 25.4;
const MM3_IN = +(3 / MM_PER_IN).toFixed(4); // 3 mm bleed for presets measured in inches

export const PRESET_GROUPS = [
  { id: "social", label: "Social media", hint: "Posts, stories, covers and thumbnails" },
  { id: "presentation", label: "Presentations", hint: "Slides for talks and classes" },
  { id: "print", label: "Print", hint: "Cards, invitations, flyers, posters, labels and stickers" },
  { id: "merch", label: "Merch", hint: "T-shirts, hoodies and mugs" },
  { id: "logo", label: "Logos", hint: "Square logo canvas" },
  { id: "collage", label: "Photo collages", hint: "Grids and mosaics for your photos" },
  { id: "document", label: "Documents", hint: "A4, A5, A3 and Letter, print ready" },
];

const P = (id, label, group, w, h, unit, extra = {}) => ({
  id, label, group, w, h, unit,
  dpi: unit === "px" ? 96 : 300,
  bleed: 0,
  ...extra,
});
const print = { bleed: 3 }; // mm presets
const printIn = { bleed: MM3_IN }; // inch presets (3 mm)

export const PRESETS = [
  // Social media (pixels)
  P("instagram-post", "Instagram post", "social", 1080, 1080, "px", { tags: "instagram square post" }),
  P("instagram-portrait", "Instagram portrait post", "social", 1080, 1350, "px", { tags: "instagram portrait post 4:5 carousel" }),
  P("instagram-story", "Instagram story", "social", 1080, 1920, "px", { tags: "instagram story reel vertical" }),
  P("facebook-post", "Facebook post", "social", 1200, 630, "px", { tags: "facebook post link share" }),
  P("facebook-cover", "Facebook cover", "social", 1640, 624, "px", { tags: "facebook cover banner page" }),
  P("youtube-thumbnail", "YouTube thumbnail", "social", 1280, 720, "px", { tags: "youtube video thumbnail" }),
  P("youtube-banner", "YouTube channel art", "social", 2560, 1440, "px", { tags: "youtube channel art banner", guides: [{ type: "safe", inset: 0, w: 1546, h: 423 }] }),
  P("linkedin-post", "LinkedIn post", "social", 1200, 627, "px", { tags: "linkedin post business" }),
  P("x-post", "X post", "social", 1600, 900, "px", { tags: "x twitter post" }),
  P("whatsapp-status", "WhatsApp status", "social", 1080, 1920, "px", { tags: "whatsapp status story vertical" }),
  P("tiktok-post", "TikTok photo post", "social", 1080, 1920, "px", { tags: "tiktok photo post vertical" }),
  P("pinterest-pin", "Pinterest pin", "social", 1000, 1500, "px", { tags: "pinterest pin tall" }),
  // Presentations
  P("presentation-16x9", "Presentation 16:9", "presentation", 1920, 1080, "px", { tags: "slides deck widescreen" }),
  P("presentation-4x3", "Presentation 4:3", "presentation", 1024, 768, "px", { tags: "slides deck classic" }),
  // Logo
  P("logo", "Logo", "logo", 1000, 1000, "px", { tags: "logo brand mark" }),
  // Documents (print ready, 3 mm bleed)
  P("a4", "A4 document", "document", 210, 297, "mm", { ...print, tags: "a4 page document" }),
  P("a5", "A5 document", "document", 148, 210, "mm", { ...print, tags: "a5 page document" }),
  P("a3", "A3 document", "document", 297, 420, "mm", { ...print, tags: "a3 page document" }),
  P("letter", "US Letter document", "document", 8.5, 11, "in", { ...printIn, tags: "letter page document" }),
  // Print
  P("business-card-us", "Business card (3.5 × 2 in)", "print", 3.5, 2, "in", { ...printIn, pages: 2, tags: "business card visiting card" }),
  P("business-card-eu", "Business card (85 × 55 mm)", "print", 85, 55, "mm", { ...print, pages: 2, tags: "business card visiting card" }),
  P("business-card-jp", "Business card Japan (91 × 55 mm)", "print", 91, 55, "mm", { ...print, pages: 2, tags: "business card japan" }),
  P("business-card-au", "Business card AU / IN (90 × 55 mm)", "print", 90, 55, "mm", { ...print, pages: 2, tags: "business card australia india" }),
  P("business-card-cn", "Business card China (90 × 54 mm)", "print", 90, 54, "mm", { ...print, pages: 2, tags: "business card china" }),
  P("business-card-vertical", "Business card portrait (2 × 3.5 in)", "print", 2, 3.5, "in", { ...printIn, pages: 2, tags: "business card vertical portrait" }),
  P("business-card-square", "Business card square (2.5 × 2.5 in)", "print", 2.5, 2.5, "in", { ...printIn, pages: 2, tags: "business card square" }),
  P("invitation-5x7", "Invitation (5 × 7 in)", "print", 5, 7, "in", { ...printIn, pages: 2, tags: "invitation card dawat wedding birthday" }),
  P("invitation-7x5", "Invitation landscape (7 × 5 in)", "print", 7, 5, "in", { ...printIn, pages: 2, tags: "invitation card landscape" }),
  P("flyer-a5", "Flyer A5", "print", 148, 210, "mm", { ...print, tags: "flyer leaflet a5" }),
  P("flyer-a4", "Flyer A4", "print", 210, 297, "mm", { ...print, tags: "flyer leaflet a4" }),
  P("flyer-letter", "Flyer Letter", "print", 8.5, 11, "in", { ...printIn, tags: "flyer leaflet letter" }),
  P("flyer-a4-landscape", "Flyer A4 landscape", "print", 297, 210, "mm", { ...print, tags: "flyer leaflet a4 landscape" }),
  P("brochure-bifold-letter", "Bi-fold brochure Letter", "print", 11, 8.5, "in", { ...printIn, pages: 2, tags: "brochure bifold half fold", guides: [{ type: "fold", axis: "x", at: 1 / 2 }] }),
  P("brochure-gatefold-letter", "Gate-fold brochure Letter", "print", 11, 8.5, "in", { ...printIn, pages: 2, tags: "brochure gate fold", guides: [{ type: "fold", axis: "x", at: 1 / 4 }, { type: "fold", axis: "x", at: 3 / 4 }] }),
  P("brochure-trifold-legal", "Tri-fold brochure Legal", "print", 14, 8.5, "in", { ...printIn, pages: 2, tags: "brochure trifold legal", guides: [{ type: "fold", axis: "x", at: 1 / 3 }, { type: "fold", axis: "x", at: 2 / 3 }] }),
  P("brochure-accordion-tabloid", "Accordion brochure Tabloid", "print", 17, 11, "in", { ...printIn, pages: 2, tags: "brochure accordion z fold tabloid", guides: [{ type: "fold", axis: "x", at: 1 / 4 }, { type: "fold", axis: "x", at: 1 / 2 }, { type: "fold", axis: "x", at: 3 / 4 }] }),
  P("brochure-4panel-25x11", "4-panel brochure (25.5 × 11 in)", "print", 25.5, 11, "in", { ...printIn, pages: 2, tags: "brochure 4 panel four panel roll fold 11x25.5 25.5x11", guides: [{ type: "fold", axis: "x", at: 1 / 4 }, { type: "fold", axis: "x", at: 1 / 2 }, { type: "fold", axis: "x", at: 3 / 4 }] }),
  P("postcard", "Postcard (6 × 4 in)", "print", 6, 4, "in", { ...printIn, pages: 2, tags: "postcard post card mail 4x6 6x4" }),
  P("brochure-trifold-a4", "Tri-fold brochure A4", "print", 297, 210, "mm", { ...print, pages: 2, tags: "brochure trifold pamphlet", guides: [{ type: "fold", axis: "x", at: 1 / 3 }, { type: "fold", axis: "x", at: 2 / 3 }] }),
  P("brochure-trifold-letter", "Tri-fold brochure Letter", "print", 11, 8.5, "in", { ...printIn, pages: 2, tags: "brochure trifold pamphlet", guides: [{ type: "fold", axis: "x", at: 1 / 3 }, { type: "fold", axis: "x", at: 2 / 3 }] }),
  P("poster-18x24", "Poster (18 × 24 in)", "print", 18, 24, "in", { ...printIn, tags: "poster wall print" }),
  P("poster-a2", "Poster A2", "print", 420, 594, "mm", { ...print, tags: "poster a2" }),
  P("poster-a3", "Poster A3", "print", 297, 420, "mm", { ...print, tags: "poster a3" }),
  P("poster-a1", "Poster A1", "print", 594, 841, "mm", { ...print, tags: "poster a1 large" }),
  P("poster-24x18", "Poster landscape (24 × 18 in)", "print", 24, 18, "in", { ...printIn, tags: "poster landscape wide" }),
  P("label-shipping-4x6", "Shipping label (4 × 6 in)", "print", 4, 6, "in", { ...printIn, tags: "label shipping parcel courier" }),
  P("label-product-2x1", "Product label (2 × 1 in)", "print", 2, 1, "in", { ...printIn, tags: "label product jar bottle" }),
  P("label-round-2in", "Round label (2 in)", "print", 2, 2, "in", { ...printIn, tags: "label round circle", guides: [{ type: "cut", shape: "circle", inset: 0 }] }),
  P("sticker-square-3in", "Square sticker (3 × 3 in)", "print", 3, 3, "in", { ...printIn, tags: "sticker square", guides: [{ type: "cut", shape: "rounded", inset: 0, radius: 0.25 }] }),
  P("sticker-round-3in", "Round sticker (3 in)", "print", 3, 3, "in", { ...printIn, tags: "sticker round circle", guides: [{ type: "cut", shape: "circle", inset: 0 }] }),
  P("sticker-oval-3x2", "Oval sticker (3 × 2 in)", "print", 3, 2, "in", { ...printIn, tags: "sticker oval", guides: [{ type: "cut", shape: "circle", inset: 0 }] }),
  P("sticker-rect-3x2", "Rectangle sticker (3 × 2 in)", "print", 3, 2, "in", { ...printIn, tags: "sticker rectangle", guides: [{ type: "cut", shape: "rounded", inset: 0, radius: 0.2 }] }),
  // Merch (print areas)
  P("tshirt", "T-shirt print (12 × 16 in)", "merch", 12, 16, "in", { pages: 2, tags: "t-shirt tshirt shirt print", mockup: "tshirt" }),
  P("hoodie", "Hoodie print (12 × 14 in)", "merch", 12, 14, "in", { pages: 2, tags: "hoodie sweatshirt print", mockup: "hoodie" }),
  P("mug", "Mug wrap (8.5 × 3.5 in)", "merch", 8.5, 3.5, "in", { tags: "mug cup wrap", mockup: "mug", guides: [{ type: "safe", inset: 0, w: 768, h: 307 }] }),
  // Collages
  P("collage-square", "Photo collage (square)", "collage", 1080, 1080, "px", { tags: "collage photos grid square" }),
  P("collage-landscape", "Photo collage (landscape)", "collage", 1200, 800, "px", { tags: "collage photos grid landscape" }),
];

const BY_ID = new Map(PRESETS.map((p) => [p.id, p]));
export const getPreset = (id) => BY_ID.get(id) || null;
export const listPresets = (group) => PRESETS.filter((p) => !group || p.group === group);

/** Value in `unit` -> CSS px at 96 dpi. */
export function toPx(v, unit) {
  if (unit === "in") return v * PX_PER_IN;
  if (unit === "mm") return (v / MM_PER_IN) * PX_PER_IN;
  return v;
}
/** CSS px -> value in `unit`. */
export function fromPx(px, unit) {
  if (unit === "in") return px / PX_PER_IN;
  if (unit === "mm") return (px / PX_PER_IN) * MM_PER_IN;
  return px;
}
/** Points (1/72 in) per CSS px. */
export const PT_PER_PX = 72 / PX_PER_IN;

/** Trim size of a preset in CSS px. */
export function presetPx(p) { return { w: toPx(p.w, p.unit), h: toPx(p.h, p.unit) }; }
/** Bleed of a preset in CSS px (0 when none). */
export function bleedPx(p) { return toPx(p?.bleed || 0, p?.unit || "px"); }

/**
 * Output pixel size for a raster export.
 * opts.scale (1 = screen size) or opts.dpi (print resolution); opts.bleed adds the bleed area.
 */
export function exportPixels(p, { scale = null, dpi = null, bleed = false } = {}) {
  const { w, h } = presetPx(p);
  const b = bleed ? bleedPx(p) : 0;
  const k = dpi ? dpi / PX_PER_IN : scale || 1;
  return { w: Math.round((w + 2 * b) * k), h: Math.round((h + 2 * b) * k), scale: k, bleedPx: b };
}
/** PDF page size in points (trim, plus bleed when asked, plus the crop-mark margin when asked). */
export const CROP_MARK = { offsetMm: 3, lengthMm: 5 };
export function pdfPageSize(p, { bleed = false, marks = false } = {}) {
  const { w, h } = presetPx(p);
  const b = bleed ? bleedPx(p) : 0;
  const m = marks ? marginPx(p, bleed) : 0;
  const outer = b + m;
  return { w: (w + 2 * outer) * PT_PER_PX, h: (h + 2 * outer) * PT_PER_PX, bleedPt: b * PT_PER_PX, marginPt: m * PT_PER_PX, trimW: w * PT_PER_PX, trimH: h * PT_PER_PX };
}
/** Extra space outside the bleed for crop marks (CSS px). Marks start at max(bleed, 3 mm) from the trim and are 5 mm long. */
export function marginPx(p, withBleed = true) {
  const b = withBleed ? bleedPx(p) : 0;
  const off = Math.max(toPx(CROP_MARK.offsetMm, "mm"), b);
  return off + toPx(CROP_MARK.lengthMm, "mm") - b;
}

/** "1080 × 1080 px", "210 × 297 mm", "3.5 × 2 in". */
export function sizeLabel(p) {
  const n = (v) => (Math.round(v * 100) / 100).toString();
  return `${n(p.w)} × ${n(p.h)} ${p.unit}`;
}
export const isPrint = (p) => !!p && p.unit !== "px";

/** A custom size (validated). */
export function customPreset(w, h, unit = "px") {
  w = +w; h = +h;
  if (!["px", "mm", "in"].includes(unit)) throw new Error("Use px, mm or in.");
  const px = { w: toPx(w, unit), h: toPx(h, unit) };
  // Canva's limits: 40 to 8,000 px a side (0.42 to 83.3 in, 10.6 to 2,116 mm).
  if (!(px.w >= 39.5 && px.h >= 39.5)) throw new Error(`The size is too small: each side needs at least 40 px${unit === "px" ? "" : unit === "in" ? " (0.42 in)" : " (10.6 mm)"}.`);
  if (px.w > 8000.5 || px.h > 8000.5) throw new Error(`The size is too big: each side can be up to 8,000 px${unit === "px" ? "" : unit === "in" ? " (83.3 in)" : " (2,116 mm)"}.`);
  return { id: "custom", label: "Custom size", group: unit === "px" ? "social" : "print", w, h, unit, dpi: unit === "px" ? 96 : 300, bleed: unit === "px" ? 0 : unit === "mm" ? 3 : MM3_IN };
}

/** Plain copy of the preset fields that go into a design (Design.preset). */
export function designPreset(p) {
  const out = { id: p.id, label: p.label, w: p.w, h: p.h, unit: p.unit, dpi: p.dpi, bleed: p.bleed || 0 };
  if (p.guides) out.guides = p.guides.map((g) => ({ ...g }));
  if (p.group) out.group = p.group;
  return out;
}

/** Problems with a preset (empty list = valid). */
export function presetProblems(p) {
  const bad = [];
  if (!p || typeof p !== "object") return ["not an object"];
  if (!/^[a-z0-9-]+$/.test(p.id || "")) bad.push("id");
  if (!p.label) bad.push("label");
  if (!PRESET_GROUPS.some((g) => g.id === p.group)) bad.push("group");
  if (!(p.w > 0 && p.h > 0)) bad.push("size");
  if (!["px", "mm", "in"].includes(p.unit)) bad.push("unit");
  if (!(p.dpi >= 72 && p.dpi <= 1200)) bad.push("dpi");
  if (!(p.bleed >= 0) || (p.unit === "px" && p.bleed)) bad.push("bleed");
  for (const g of p.guides || []) if (!["fold", "cut", "safe"].includes(g.type) || (g.type === "fold" && !(g.at > 0 && g.at < 1))) bad.push("guide");
  return bad;
}
