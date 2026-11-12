// "Apply brand to whole design": swaps the design's main colours for the brand colours and sets heading /
// body fonts. Pure module (unit-tested). Neutral colours (white, black, greys) are kept so text stays readable.
import { walk } from "./model.js";

const hex6 = (c) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
/** True for white, black and greys (low saturation, or very light / very dark). */
export function isNeutral(c) {
  const h = hex6(c);
  if (!h) return true;
  const [r, g, b] = rgb(h), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return s < 0.15 || l > 0.95 || l < 0.08;
}

/** Every colour slot in a design: [{ get(), set(v), weight }]. */
export function colorSlots(design) {
  const slots = [];
  const add = (obj, key, weight) => { if (hex6(obj?.[key])) slots.push({ get: () => obj[key], set: (v) => { obj[key] = v; }, weight }); };
  for (const pg of design.pages) {
    add(pg.background, "color", 4);
    if (pg.background?.gradient) pg.background.gradient.stops.forEach((_, i) => add(pg.background.gradient.stops, i, 3));
    for (const [l] of walk(pg.layers)) {
      const area = Math.max(1, Math.sqrt(l.w * l.h) / 100);
      if (l.type === "text") { add(l.text, "color", 1 + l.text.size / 60); if (l.text.bg) add(l.text.bg, "color", 1); if (l.text.outline) add(l.text.outline, "color", 0.5); if (l.text.effect) add(l.text.effect, "color", 0.5); }
      if (l.type === "shape") { add(l.shape, "fill", area); add(l.shape, "stroke", area / 2); if (Array.isArray(l.shape.gradient?.stops)) l.shape.gradient.stops.forEach((_, i) => add(l.shape.gradient.stops, i, area / 2)); }
      if (l.type === "element") for (const k of ["c1", "c2"]) add(l.element.colors, k, area);
      if (l.type === "frame" && l.frame.border) add(l.frame.border, "color", 0.5);
    }
  }
  return slots;
}

/** Main (non-neutral) colours of a design, most used first. */
export function mainColors(design) {
  const score = new Map();
  for (const s of colorSlots(design)) { const c = s.get().toLowerCase(); if (!isNeutral(c)) score.set(c, (score.get(c) || 0) + s.weight); }
  return [...score.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map((e) => e[0]);
}

/**
 * Applies a brand kit to a design (changes it in place). Returns { colors: { old: new }, fonts: n }.
 * Main colours map in order of use onto the brand's non-neutral colours (repeating if needed);
 * the biggest text on each page gets the heading font, other text the body font.
 */
export function applyBrand(design, brand) {
  const palette = (brand.colors || []).map(hex6).filter(Boolean);
  const brandMain = palette.filter((c) => !isNeutral(c));
  const target = brandMain.length ? brandMain : palette;
  const map = {};
  if (target.length) mainColors(design).forEach((c, i) => { map[c] = target[i % target.length]; });
  for (const s of colorSlots(design)) { const c = s.get().toLowerCase(); if (map[c]) s.set(map[c]); }
  let fonts = 0;
  const heading = brand.fonts?.heading, body = brand.fonts?.body;
  for (const pg of design.pages) {
    const texts = [...walk(pg.layers)].map(([l]) => l).filter((l) => l.type === "text");
    if (!texts.length) continue;
    const big = Math.max(...texts.map((t) => t.text.size));
    for (const t of texts) {
      const f = t.text.size >= big * 0.6 ? heading : body;
      if (f && t.text.family !== f) { t.text.family = f; fonts++; }
    }
  }
  return { colors: map, fonts };
}

/** Applies one colour to a layer the natural way (text colour, shape fill, sticker main colour …). */
export function applyColorToLayer(l, color) {
  if (l.type === "text") l.text.color = color;
  else if (l.type === "shape") { if (l.shape.fill === "none" || l.shape.kind === "line" || l.shape.kind === "arrow") l.shape.stroke = color; else { l.shape.fill = color; delete l.shape.gradient; } }
  else if (l.type === "element") l.element.colors = { ...l.element.colors, c1: color };
  else if (l.type === "frame") l.frame.border = { color, width: l.frame.border?.width || 6 };
  else if (l.type === "chart") l.chart.spec.colors = [color, ...(l.chart.spec.colors || []).slice(1)];
  else if (l.type === "table") l.table.headerFill = color;
  else if (l.type === "group") l.children.forEach((c) => applyColorToLayer(c, color));
  else return false;
  return true;
}
