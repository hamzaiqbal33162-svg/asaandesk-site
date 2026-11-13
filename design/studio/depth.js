// AsaanDesk Studio template polish (round 4, owner item 3: "templates as attractive as Canva's: animated,
// 3D-style, polished"). Pure module (no DOM), used by gallery.js when a template is built:
//   polish(design, { key, extrude, animate }) adds, in place:
//   - layered soft shadows (three faint black copies, each further down and a little bigger) under cards,
//     buttons, shapes and photos;
//   - gradient fills with a light top and a darker bottom on solid shapes, and a glossy highlight on round ones
//     (pills, circles) when no light text sits on them;
//   - a 3D (extruded) headline when `extrude` is set (about a third of the layouts, chosen in gallery.js);
//   - a tilted "photo stack" card behind a photo on some layouts;
//   - default entrance animations (staggered fade / rise / pop / slide / wipe, done in about 1.5 s) when
//     `animate` is set and the page has none yet. Shadows and highlights move with their card.
// Nothing is placed outside the page, and no shadow is added where it would run under text beside a card.
import { presetPx } from "./presets.js";
import { mix, extrudeColor } from "./textfx.js";
import { aabb } from "./geometry.js";

const hex6 = (c) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null);
export function luminance(c) {
  const h = hex6(c);
  if (!h) return 0.5;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
/** Small stable hash of a string (FNV-1a), for choosing which layouts get which touches. */
export function hashKey(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
let seq = 0;
const nid = (base) => `${base}-d${(seq++).toString(36)}`;
const r1 = (v) => Math.round(v * 10) / 10;
const inside = (b, W, H, m = 0) => b.x >= m && b.y >= m && b.x + b.w <= W - m && b.y + b.h <= H - m;
const meets = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const within = (a, b, tol = 2) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;

/** The outline a shadow copies: { kind, radius } (rect / ellipse / polygon …) or null when the layer gets none. */
function outlineOf(l) {
  if (l.type === "shape") {
    const s = l.shape;
    if (s.kind === "line" || s.kind === "arrow" || !hex6(s.fill)) return null;
    // See-through gradients (photo shades, soft blobs, glows) cast no shadow.
    if (s.gradient?.stops?.some((c) => /^#[0-9a-f]{8}$/i.test(c))) return null;
    return { kind: s.kind, radius: +s.radius || 0, sides: s.sides, points: s.points, inner: s.inner };
  }
  if (l.type === "frame") {
    const k = l.frame.shape || "rect";
    if (k === "circle") return { kind: "ellipse", radius: 0 };
    if (k === "rect" || k === "rounded") return { kind: "rect", radius: +l.frame.radius || (k === "rounded" ? Math.min(l.w, l.h) * 0.08 : 0) };
    return null;
  }
  return null;
}
const shapeLayer = (id, x, y, w, h, o, fill, op, rot, name) => ({
  id, type: "shape", name, x: r1(x), y: r1(y), w: r1(w), h: r1(h), rotation: rot || 0, opacity: op, locked: false, hidden: false, animation: null,
  shape: { kind: o.kind, fill, stroke: "none", strokeWidth: 0, radius: r1(o.radius || 0), sides: o.sides || 6, points: o.points || 5, ...(o.inner ? { inner: o.inner } : {}) },
});

/**
 * Soft layered shadow for layer l: three copies, from tight and darker to wide and faint.
 * Returns the shadow layers (bottom first) or null when they would leave the page or touch text beside the card.
 */
function softShadow(l, o, W, H, texts) {
  const S = Math.min(W, H), m = Math.min(l.w, l.h);
  const off = Math.max(S * 0.005, Math.min(S * 0.02, m * 0.035));
  const steps = [[1, 2.1, 1.1, 0.045], [0.7, 1.3, 0.6, 0.065], [0.35, 0.6, 0.2, 0.1]];
  const box = aabb(l);
  const reach = { x: box.x - off * 1.2, y: box.y - off * 0.6, w: box.w + off * 3.4, h: box.h + off * 4.4 };
  if (!inside(reach, W, H, 1)) return null;
  for (const t of texts) { const tb = aabb(t); if (meets(tb, reach) && !within(tb, box)) return null; }
  return steps.map(([dx, dy, grow, op]) => {
    const g = off * grow;
    return shapeLayer(nid(l.id + "-sh"), l.x + off * dx - g, l.y + off * dy - g, l.w + 2 * g, l.h + 2 * g, { ...o, radius: o.radius ? o.radius + g : 0 }, "#000000", op, l.rotation, "Shadow");
  });
}

/** Gradient fill with a light top and a darker bottom (solid fills only; near-white cards keep a faint one). */
function gradientFill(s, lightText = false) {
  const f = hex6(s.fill);
  if (!f || s.gradient) return false;
  const L = luminance(f);
  // Under light text the top stays close to the fill and the bottom gets darker, so contrast only improves.
  s.gradient = L > 0.93 ? { stops: [f, mix(f, "#000000", 0.05)], angle: 180 } : lightText ? { stops: [mix(f, "#ffffff", 0.06), f, mix(f, "#000000", 0.2)], angle: 170 } : { stops: [mix(f, "#ffffff", 0.18), f, mix(f, "#000000", 0.14)], angle: 165 };
  return true;
}

/** The text that reads as the page's headline: the biggest one, if it is big enough. */
function headline(page, S) {
  const texts = page.layers.filter((l) => l.type === "text" && !l.hidden && !l.text.dynamic);
  const big = texts.slice().sort((a, b) => b.text.size - a.text.size)[0];
  return big && big.text.size >= S * 0.07 ? big : null;
}
/** Main non-neutral colour of a page (for the side of a dark 3D headline). */
function accentOf(page) {
  const score = new Map();
  const add = (c, w) => { const h = hex6(c); if (!h) return; const L = luminance(h), [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); if (Math.max(r, g, b) - Math.min(r, g, b) < 40 || L < 0.08 || L > 0.95) return; score.set(h, (score.get(h) || 0) + w); };
  for (const l of page.layers) {
    if (l.type === "shape") add(l.shape.fill, Math.sqrt(l.w * l.h));
    if (l.type === "element") add(l.element.colors?.c1, Math.sqrt(l.w * l.h) / 2);
    if (l.type === "text") add(l.text.color, l.text.size);
  }
  for (const c of page.background?.gradient?.stops || [page.background?.color]) add(c, 400);
  return [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
/** Canva-like 3D headline: an extruded side under the letters. Returns true when applied. */
function extrudeHeadline(page, W, H) {
  const S = Math.min(W, H), t = headline(page, S);
  if (!t) return false;
  const x = t.text;
  if (x.effect || x.shadow || x.gradient || x.curve || x.bg || x.outline || String(x.content).length > 48 || (t.rotation && Math.abs(t.rotation) > 3)) return false;
  const depth = 45, d = (depth / 100) * x.size * 0.12 * 1.25 + x.size * 0.06;
  if (t.x < 0 || t.y < 0 || t.x + t.w + d > W - 2 || t.y + t.h + d > H - 2) return false;
  const light = luminance(x.color) > 0.45, accent = accentOf(page);
  // Light letters: a deep shade of the page's main colour; dark letters: a soft tint of it (or of the text colour).
  const side = light ? (accent ? mix(accent, "#000000", 0.5) : extrudeColor(x.color)) : accent && luminance(accent) > 0.25 ? mix(accent, "#ffffff", 0.3) : extrudeColor(x.color);
  x.effect = { type: "extrude", depth, direction: -45, shade: 35, color: side };
  return true;
}

/**
 * Adds the depth touches to one page. links (Map) gets layer id -> card id for every added shadow / highlight,
 * so animations can move them with their card.
 */
function deepenPage(page, W, H, links, { stack = false } = {}) {
  const S = Math.min(W, H), texts = page.layers.filter((l) => l.type === "text" && !l.hidden);
  const out = [];
  let shadows = 0, stacked = false;
  const cards = new Set(page.layers.filter((l) => {
    if (l.hidden || l.locked || (l.opacity ?? 1) < 0.85 || (l.rotation && Math.abs(l.rotation) > 25) || String(l.id).startsWith("orb-")) return false;
    const o = outlineOf(l);
    if (!o) return false;
    const m = Math.min(l.w, l.h), b = aabb(l);
    if (m < S * 0.05 || l.w * l.h > W * H * 0.55) return false;
    return inside(b, W, H, 2); // bands and corner blocks touching the edge stay flat
  }).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 8));
  for (const l of page.layers) {
    if (!cards.has(l)) { out.push(l); continue; }
    const o = outlineOf(l), b = aabb(l);
    // Photo stack: a white card turned a little behind the first big upright photo.
    if (stack && !stacked && l.type === "frame" && !l.rotation && Math.min(l.w, l.h) >= S * 0.22) {
      const pad = S * 0.018, card = shapeLayer(nid(l.id + "-st"), l.x - pad, l.y - pad, l.w + 2 * pad, l.h + 2 * pad, { kind: o.kind, radius: o.radius ? o.radius + pad : 0 }, "#ffffff", 1, 4, "Photo stack card");
      const cb = aabb(card);
      if (inside(cb, W, H, 2) && !texts.some((t) => meets(aabb(t), cb) && !within(aabb(t), b))) {
        const sh = softShadow(card, { kind: card.shape.kind, radius: card.shape.radius }, W, H, texts) || [];
        for (const s of sh) { links.set(s.id, l.id); out.push(s); }
        links.set(card.id, l.id); out.push(card); stacked = true;
        out.push(l);
        continue;
      }
    }
    // A hand-made shadow right under it already: keep that one.
    const prev = out[out.length - 1];
    const own = prev && prev.type === "shape" && /shadow/i.test(prev.name || "") && meets(aabb(prev), b);
    const sh = own ? null : softShadow(l, o, W, H, texts);
    if (sh) { for (const s of sh) { links.set(s.id, l.id); out.push(s); } shadows++; }
    out.push(l);
    if (l.type === "shape") {
      const s = l.shape;
      const lightText = texts.some((t) => meets(aabb(t), b) && luminance(t.text.color) > 0.6);
      gradientFill(s, lightText);
      // Gloss on round shapes (pills, circles): a soft white highlight over the top part.
      const round = s.kind === "ellipse" || (s.kind === "rect" && (+s.radius || 0) >= Math.min(l.w, l.h) * 0.4);
      if (round && !lightText && !l.rotation && Math.min(l.w, l.h) >= S * 0.06 && !/^(Colour disc|Ring inside|Logo dot)$/.test(l.name || "")) {
        const hw = l.w * 0.8, hh = l.h * 0.42;
        const hl = shapeLayer(nid(l.id + "-hl"), l.x + l.w * 0.1, l.y + l.h * 0.07, hw, hh, { kind: s.kind === "ellipse" ? "ellipse" : "rect", radius: s.kind === "ellipse" ? 0 : hh / 2 }, "#ffffff", 0.22, 0, "Highlight");
        links.set(hl.id, l.id); out.push(hl);
      }
    }
  }
  page.layers = out;
  return shadows;
}

/**
 * A plain page: no stickers, photos, charts or tables and at most one small solid block (flat colour + plain text).
 * These get the strongest upgrade first.
 */
export function isPlain(page, W, H) {
  const ls = page.layers.filter((l) => !l.hidden);
  if (ls.some((l) => ["element", "frame", "image", "chart", "table", "group"].includes(l.type))) return false;
  const blocks = ls.filter((l) => l.type === "shape" && l.w * l.h > W * H * 0.02);
  return blocks.length <= 1 && ls.some((l) => l.type === "text");
}
/** Plain pages: a soft light-to-dark background and one or two glossy orbs in free corners. */
function upgradePlain(page, W, H, links, orbs = true) {
  const bg = page.background || {}, S = Math.min(W, H);
  const c = hex6(bg.color);
  if (c && !bg.image && !bg.gradient) {
    const L = luminance(c);
    page.background = { color: c, gradient: { angle: 160, stops: L > 0.94 ? [c, mix(c, "#000000", 0.05)] : [mix(c, "#ffffff", 0.14), c, mix(c, "#000000", 0.12)] } };
  }
  const accent = accentOf(page) || (c && luminance(c) < 0.5 ? "#8b5cf6" : "#5b4cf0");
  // Everything but filled full-page backgrounds counts (a page border line or frame keeps the corners free).
  const fullBg = (l) => l.w >= W * 0.9 && l.h >= H * 0.9 && l.type === "shape" && hex6(l.shape.fill) && !(l.shape.strokeWidth > 0);
  const busy = page.layers.filter((l) => !l.hidden && !fullBg(l)).map(aabb);
  const added = [];
  for (const [fx, fy, k] of orbs ? [[1, 0, 0.26], [0, 1, 0.2]] : []) {
    const d = S * k, m = S * 0.04, x = fx ? W - m - d : m, y = fy ? H - m - d * 1.12 : m;
    const ring = { x: x - d * 0.06, y: y - d * 0.06, w: d * 1.12, h: d * 1.24 };
    if (busy.some((b) => meets(b, ring)) || added.some((b) => meets(b, ring))) continue;
    const id = nid("orb"), base = mix(accent, "#ffffff", 0.25);
    const orb = shapeLayer(id, x, y, d, d, { kind: "ellipse" }, base, 1, 0, "Glossy ball");
    orb.shape.gradient = { stops: [mix(base, "#ffffff", 0.45), base, mix(accent, "#000000", 0.25)], angle: 150 };
    const floor = shapeLayer(nid("orb-sh"), x + d * 0.1, y + d * 1.02, d * 0.8, d * 0.12, { kind: "ellipse" }, "#000000", 0.12, 0, "Shadow");
    const hl = shapeLayer(nid("orb-hl"), x + d * 0.18, y + d * 0.1, d * 0.42, d * 0.28, { kind: "ellipse" }, "#ffffff", 0.35, 0, "Highlight");
    links.set(floor.id, id); links.set(hl.id, id);
    // Behind everything but full-page backgrounds.
    const at = page.layers.findIndex((l) => !fullBg(l));
    page.layers.splice(at < 0 ? page.layers.length : at, 0, floor, orb, hl);
    added.push(ring);
  }
  return true;
}

/** Default entrance animations for a page with none: done within about 1.5 s, reading order, small stagger. */
export function animatePage(page, W, H, links = new Map()) {
  if (page.layers.some((l) => l.animation)) return false;
  const items = page.layers.filter((l) => !l.hidden && !links.has(l.id)).map((l) => ({ l, b: aabb(l) }));
  if (!items.length) return false;
  const bgs = items.filter(({ l, b }) => l.type !== "text" && b.w >= W * 0.8 && b.h >= H * 0.8);
  const rest = items.filter((it) => !bgs.includes(it)).sort((a, b) => (Math.abs(a.b.y - b.b.y) > 8 ? a.b.y - b.b.y : a.b.x - b.b.x));
  const head = rest.filter((it) => it.l.type === "text").sort((a, b) => b.l.text.size - a.l.text.size)[0]?.l;
  const anim = new Map();
  for (const { l } of bgs) anim.set(l.id, { type: "fade", delay: 0, duration: 0.5 });
  const stagger = Math.min(0.14, 0.85 / Math.max(1, rest.length - 1));
  let t = bgs.length ? 0.15 : 0.05;
  for (const { l, b } of rest) {
    const cx = b.x + b.w / 2, big = b.w * b.h > W * H * 0.25;
    let type;
    if (l.type === "text") type = l === head ? (String(l.text.content).length <= 24 ? "pop" : "rise") : "rise";
    else if (l.type === "image" || l.type === "frame") type = b.w > b.h * 1.3 ? "wipe" : "fade";
    else if (big) type = "fade";
    else if (cx < W * 0.18) type = "slide-right";
    else if (cx > W * 0.82) type = "slide-left";
    else type = "pop";
    anim.set(l.id, { type, delay: Math.round(t * 100) / 100, duration: 0.5 });
    t += stagger;
  }
  for (const l of page.layers) {
    const a = anim.get(links.get(l.id) || l.id);
    l.animation = a ? { ...a } : l.hidden ? null : { type: "fade", delay: 0, duration: 0.4 };
  }
  return true;
}

/**
 * Polishes a design in place. key: the layout key (stable per layout); extrude: 3D headline on the first page;
 * stack: photo-stack card on the first page; animate: default entrance animations.
 * Returns { shadows, extruded, animated }.
 */
export function polish(design, { depth = true, extrude = false, stack = false, animate = false, plain = false, orbs = true } = {}) {
  const { w: W, h: H } = presetPx(design.preset);
  let shadows = 0, extruded = false, animated = false, upgraded = 0;
  design.pages.forEach((pg, i) => {
    const links = new Map();
    // Plain pages (flat colour + plain text) on screen designs: 3D headline, soft background, glossy orbs.
    const flat = depth && plain && isPlain(pg, W, H);
    if (i === 0 && (extrude || flat)) extruded = extrudeHeadline(pg, W, H);
    if (flat && upgradePlain(pg, W, H, links, orbs && i === 0)) upgraded++;
    if (depth) shadows += deepenPage(pg, W, H, links, { stack: stack && i === 0 });
    if (animate && animatePage(pg, W, H, links)) animated = true;
  });
  return { shadows, extruded, animated, upgraded };
}
