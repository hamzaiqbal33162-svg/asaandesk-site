// AsaanDesk Studio "pro" templates (owner, 13 Nov: templates must be high-class, usable business designs in Canva's
// pattern; the simple ones are replaced). Pure module (no DOM). templates.js hands every single-page template here;
// its own words (headline, kicker, details, button, price…) are kept and laid out again with one of our photo-led
// compositions: full-bleed photo with a soft shade, split photo/text, diamond / arch / circle masked photos, gradient
// blobs with huge type, photo bands, glass cards, magazine blocks, bold type posters, photo grids and polaroids.
// Big bold headlines (tight leading, strong size contrast), small-caps labels, icon rows, pill buttons, price badges.
// Every photo is a real library photo (templates-photos.js) in a normal photo frame the user can Replace or crop.
// Templates with structure (menus, lists, countdowns, tables, carousels…) keep their own layout (photos filled).
import { textHeight, fitFontSize, textWidth } from "./textlayout.js";
import { photoPicker, stockImage } from "./templates-photos.js";
import { personHints, pickerFor } from "./templates-people.js";
import { walk } from "./model.js";
import { mix } from "./textfx.js";

export const r1 = (v) => Math.round(v * 10) / 10;
/** #rrggbb + alpha 0..1 -> #rrggbbaa (see-through gradient stops for photo shades). */
export const alpha = (hex, a) => hex.slice(0, 7) + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
export function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------------- styles: own colour + type systems (colours may differ from Canva's; the pattern matters) ---------------- */
// bg / ink / sub: page colour and its text; acc / acc2 accents (onAcc = text on acc); deep = dark tone for photo shades
// and dark panels; head / body: font families.
export const STYLES = {
  midnight: { bg: "#0b1020", ink: "#ffffff", sub: "#aab4cf", acc: "#4f7cff", acc2: "#a66bff", onAcc: "#ffffff", deep: "#070a16", head: "sans", body: "sans", dark: true },
  noir: { bg: "#121212", ink: "#ffffff", sub: "#b7b7b7", acc: "#c8f031", acc2: "#f5f5f5", onAcc: "#121212", deep: "#050505", head: "sans", body: "sans", dark: true },
  terracotta: { bg: "#f5ede3", ink: "#2b1d16", sub: "#6e5a4d", acc: "#cf5a2e", acc2: "#2f4a3a", onAcc: "#ffffff", deep: "#24170f", head: "serif", body: "sans" },
  forest: { bg: "#f1efe6", ink: "#15372a", sub: "#4f6b5e", acc: "#1f5c45", acc2: "#e2b857", onAcc: "#ffffff", deep: "#0f2a1f", head: "sans", body: "sans" },
  crimson: { bg: "#f6f0e8", ink: "#1c1c1e", sub: "#5a5a60", acc: "#d7263d", acc2: "#1c1c1e", onAcc: "#ffffff", deep: "#161618", head: "sans", body: "sans" },
  ocean: { bg: "#ffffff", ink: "#0b1b3f", sub: "#52617f", acc: "#1d5bff", acc2: "#14c2e8", onAcc: "#ffffff", deep: "#0a1a44", head: "sans", body: "sans" },
  navy: { bg: "#0f1b3d", ink: "#ffffff", sub: "#aeb9d8", acc: "#f2b544", acc2: "#4f7cff", onAcc: "#0f1b3d", deep: "#091229", head: "serif", body: "sans", dark: true },
  blush: { bg: "#fbefea", ink: "#3b1f26", sub: "#7d5c63", acc: "#d9705b", acc2: "#f2b8a8", onAcc: "#ffffff", deep: "#2e1820", head: "serif", body: "sans" },
  sunset: { bg: "#fff4ec", ink: "#2d1320", sub: "#75545f", acc: "#ff5a36", acc2: "#ff2e7e", onAcc: "#ffffff", deep: "#2a0f1c", head: "sans", body: "sans" },
  violet: { bg: "#f4f1ff", ink: "#1d1442", sub: "#5d5683", acc: "#6a3cff", acc2: "#ff5aa8", onAcc: "#ffffff", deep: "#170f38", head: "sans", body: "sans" },
  mono: { bg: "#ffffff", ink: "#0a0a0a", sub: "#5c5c5c", acc: "#0a0a0a", acc2: "#ff4b2b", onAcc: "#ffffff", deep: "#0a0a0a", head: "sans", body: "sans" },
  olive: { bg: "#ede6d8", ink: "#2c281d", sub: "#6a6352", acc: "#5f6f2a", acc2: "#c08a2b", onAcc: "#ffffff", deep: "#24200f", head: "cambria", body: "sans" },
  teal: { bg: "#e9f6f3", ink: "#0a3a35", sub: "#4a6e69", acc: "#0e9b88", acc2: "#ffb547", onAcc: "#ffffff", deep: "#08302b", head: "sans", body: "sans" },
  electric: { bg: "#f2f3ff", ink: "#10123a", sub: "#545785", acc: "#2b2bff", acc2: "#ffd23f", onAcc: "#ffffff", deep: "#0d0f33", head: "sans", body: "sans" },
  ember: { bg: "#1f2126", ink: "#ffffff", sub: "#a6abb5", acc: "#ff7a1a", acc2: "#ffd166", onAcc: "#ffffff", deep: "#121317", head: "sans", body: "sans", dark: true },
  mint: { bg: "#ddf7ea", ink: "#08332a", sub: "#3f6a5f", acc: "#ff5b72", acc2: "#0b7a5a", onAcc: "#ffffff", deep: "#08332a", head: "sans", body: "sans" },
};
const STYLE_TOPICS = [
  [/food|restaurant|menu|cafe|coffee|bakery|recipe|chai|cook|kitchen|pizza|burger|brunch|dessert|cake|karahi|khana/, ["terracotta", "ember", "sunset", "forest", "olive"]],
  [/sale|discount|offer|deal|black friday|flash|clearance|promo|riyayat|shop/, ["crimson", "noir", "electric", "sunset", "violet", "ember"]],
  [/tech|app|software|code|developer|webinar|launch|saas|digital|ai\b|startup|podcast/, ["midnight", "electric", "ocean", "noir", "violet"]],
  [/wedding|love|valentine|bride|engagement|nikah|shadi|anniversary/, ["blush", "terracotta", "olive", "navy"]],
  [/eid|ramadan|diwali|christmas|holiday|greeting|festival|mubarak|new year/, ["navy", "forest", "midnight", "crimson"]],
  [/birthday|kids|party|fun|balloon|baby|salgirah/, ["violet", "mint", "sunset", "electric"]],
  [/fitness|gym|sport|run|workout|yoga|football|cricket|marathon/, ["noir", "ember", "electric", "teal"]],
  [/beauty|salon|spa|fashion|boutique|makeup|style|skin|nail/, ["blush", "mono", "olive", "terracotta"]],
  [/nature|eco|garden|plant|green|earth|farm|climate|organic/, ["forest", "teal", "olive"]],
  [/school|education|class|lesson|course|workshop|teacher|student|tuition|study|science/, ["teal", "ocean", "violet", "mint", "electric"]],
  [/travel|trip|tour|holiday|beach|vacation|safar|hunza/, ["teal", "ocean", "sunset", "olive"]],
  [/music|concert|night|dj|band|live|qawwali|movie|film/, ["midnight", "violet", "noir", "electric"]],
  [/quote|motivation|inspiration|thought|kindness|soch/, ["mono", "olive", "blush", "midnight", "forest"]],
  [/business|corporate|company|hiring|job|career|finance|real estate|property|home|consult|agency|marketing|linkedin/, ["ocean", "navy", "mono", "midnight", "teal", "forest"]],
  [/medical|clinic|doctor|health|dental|care/, ["teal", "ocean", "mint"]],
];
/** Style for a template: chosen among the styles that suit its topic, the id as seed. */
export function styleFor(id, topic) {
  const t = String(topic || "").toLowerCase();
  const hit = STYLE_TOPICS.find(([re]) => re.test(t));
  const list = hit ? hit[1] : Object.keys(STYLES);
  return { key: list[hash(id) % list.length], ...STYLES[list[hash(id) % list.length]] };
}

/* ---------------- content: a template's own words, sorted into roles ---------------- */
const DECOR = /^(badge-|icon-crescent-star|deco-lantern|deco-hanging-stars|deco-balloons|deco-confetti|deco-hearts|deco-flower|deco-sprig|deco-crown|icon-chai|deco-sparkles|deco-stars|icon-mosque|icon-gift|deco-rainbow)/;
const inBox = (a, b, tol = 4) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const PRICE = /(rs\.?|pkr|\$|€|£)\s?\d|\d+\s?%/i;
const DATEBLOCK = /^(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i;
/**
 * Roles of a page's words: { head, kicker, sub, details[], cta, price, deco } or null when the page has structure that a
 * re-layout would lose (rows of prices, lists, countdown digits, tables, many text boxes).
 */
export function extract(pg) {
  const all = [...walk(pg.layers)].map(([l]) => l).filter((l) => !l.hidden);
  if (all.some((l) => ["table", "chart", "group", "image"].includes(l.type))) return null;
  // Several photos side by side (before / after, photo dumps, moodboards) are the design itself: keep it.
  if (all.filter((l) => l.type === "frame").length >= 2) return null;
  const texts = all.filter((l) => l.type === "text" && /[a-z0-9]/i.test(l.text.content) && !l.text.curve).map((l) => ({ l, s: String(l.text.content).trim(), size: l.text.size, y: l.y, x: l.x }));
  if (texts.length < 1 || texts.length > 9) return null;
  // Date blocks (14 / SAT / DEC), before / after labels, this-or-that: structure.
  if (texts.some((t) => DATEBLOCK.test(t.s)) || texts.filter((t) => /^(before|after|this|that|vs)$/i.test(t.s)).length >= 2) return null;
  // Repeated short items at one size (menus, lists, digits, names) = structure.
  const bySize = new Map();
  for (const t of texts) { const k = Math.round(t.size); (bySize.get(k) || bySize.set(k, []).get(k)).push(t); }
  const maxSize = Math.max(...texts.map((t) => t.size));
  for (const [k, g] of bySize) if (k < Math.round(maxSize) && g.length >= 3 && g.map((t) => t.s.length).sort((a, b) => a - b)[Math.floor(g.length / 2)] <= 18) return null;
  const used = new Set();
  const take = (t) => { used.add(t); return t.s; };
  // Button: text sitting on a pill / button shape, or with its own background.
  const pills = all.filter((l) => l.type === "shape" && (/button|pill/i.test(l.name || "") || (l.shape.kind === "rect" && +l.shape.radius >= Math.min(l.w, l.h) * 0.3 && l.w > l.h * 1.6)));
  const big = Math.max(...texts.map((t) => t.size));
  // (a highlighted headline line is not a button: buttons are small)
  const btn = texts.find((t) => t.s.length <= 40 && t.size < big * 0.55 && (t.l.text.bg?.color || pills.some((p) => inBox(t.l, p))));
  const cta = btn ? take(btn) : null;
  // Headline: the biggest text, plus any other short text nearly as big (stacked headline lines), in reading order.
  let rest0 = texts.filter((t) => !used.has(t));
  if (!rest0.length) return null;
  let top = rest0.slice().sort((a, b) => b.size - a.size)[0];
  // A price as the biggest text ("$24" over "Linen tote bag"): the product name leads, the price goes on a badge.
  let price0 = null;
  if (PRICE.test(top.s) && top.s.length <= 14) {
    const next = rest0.filter((t) => t !== top && t.s.length >= 4 && !PRICE.test(t.s)).sort((a, b) => b.size - a.size)[0];
    if (next && next.size >= top.size * 0.4) { price0 = take(top).replace(/\n/g, " "); rest0 = rest0.filter((t) => t !== top); top = next; }
  }
  // A lone number or tiny word as the headline (countdown digits, "01"): the design is about that number, keep it.
  if (top.s.replace(/\s/g, "").length <= 3) return null;
  const stack = rest0.filter((t) => t === top || (t.size >= top.size * 0.62 && t.s.length <= 22 && !PRICE.test(t.s))).sort((a, b) => a.y - b.y || a.x - b.x);
  if (stack.length > 3) return null;
  const head = stack.map(take).join("\n");
  const rest = texts.filter((t) => !used.has(t));
  const headY = Math.min(...stack.map((t) => t.y));
  const priceT = price0 ? null : rest.find((t) => PRICE.test(t.s) && t.s.length <= 22);
  const price = price0 || (priceT ? take(priceT).replace(/\n/g, " ") : null);
  const kickT = rest.filter((t) => !used.has(t) && t.s.length <= 34 && !t.s.includes("\n") && t.y < headY && t.size < top.size * 0.62).sort((a, b) => b.y - a.y)[0]
    || rest.find((t) => !used.has(t) && t.s.length <= 30 && t.s === t.s.toUpperCase() && /[A-Z]{3}/.test(t.s));
  const kicker = kickT ? take(kickT) : null;
  const left = texts.filter((t) => !used.has(t));
  const subT = left.filter((t) => t.s.length >= 12).sort((a, b) => b.size - a.size || b.s.length - a.s.length)[0];
  const sub = subT ? take(subT) : null;
  const details = texts.filter((t) => !used.has(t)).sort((a, b) => a.y - b.y || a.x - b.x).map((t) => t.s.replace(/\s*\n\s*/g, " · ")).filter((s) => s.length <= 90).slice(0, 3);
  const decoL = all.find((l) => l.type === "element" && /^badge-/.test(l.element.id)) || all.find((l) => l.type === "element" && DECOR.test(l.element.id));
  const deco = decoL ? { id: decoL.element.id, colors: { ...decoL.element.colors } } : null;
  return { head, kicker, sub, details, cta, price, deco, photos: all.filter((l) => l.type === "frame").length };
}

/* ---------------- the drawing kit ---------------- */
const ICONS = [
  [/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\d{1,2}\s?(am|pm)\b|\d{1,2}:\d{2}|\d{1,2}\s?[–-]\s?\d{1,2}\s?(am|pm)|\b20\d\d\b/i, "icon-calendar"],
  [/\+?\d[\d\s-]{7,}\d/, "icon-call"],
  [/@[a-z]|\bmail\b/i, "icon-mail"],
  [/www\.|https?:|\.(com|pk|org|net|io|co)\b|link in bio/i, "icon-globe"],
  [/street|road|\brd\b|hall|centre|center|market|block|town|avenue|lane|park|plaza|mall|floor|unit|phase|city|lahore|karachi|islamabad|,\s*[A-Z]/i, "icon-location"],
];
const iconFor = (s) => ICONS.find(([re]) => re.test(s))?.[1] || null;

/**
 * Kit for one design: K = templates.js helpers (T, R, C, S, E, F …), W × H page, b = bleed, st = style, pick = photo
 * picker. Every helper returns layers (plain objects) at absolute positions.
 */
export function kit(K, W, H, st, pick, b = 0) {
  const S = Math.min(W, H);
  const k = {
    K, W, H, S, st, b,
    text(s, x, y, w, o = {}) {
      const size = o.size || S * 0.04, ls = o.ls || 0;
      const l = K.T(s, x, y, w, { size, family: o.family || st.body, bold: !!o.bold, italic: !!o.italic, color: o.color || st.ink, align: o.align || "left", lh: o.lh || 1.25, ls: ls * size, name: o.name, shadow: o.shadow });
      // Capitals are real capitals in the text (what you see is what the text box holds).
      if (o.upper) l.text.content = String(l.text.content).toUpperCase();
      if (o.maxH || o.lines) {
        const maxH = Math.min(o.maxH ?? Infinity, o.lines ? size * (o.lh || 1.25) * o.lines + 1 : Infinity);
        // Fitted with no tightening (tight letters then only make it narrower) and in capitals when shown in
        // capitals, so no word ever breaks.
        if (ls < 0) l.text.letterSpacing = 0;
        const own = l.text.content; // (already in capitals when shown in capitals)
        if (o.upper) l.text.content = own.toUpperCase();
        const fs = fitFontSize(l.text, w, maxH, o.min || Math.max(7, size * 0.4));
        l.text.content = own;
        l.text.size = fs; l.text.letterSpacing = r1(ls * fs);
      }
      l.h = textHeight(l.text, w);
      return l;
    },
    /** A photo frame with a library photo (hint: words about the subject). */
    photo(x, y, w, h, o = {}) {
      const f = K.F(r1(x), r1(y), r1(w), r1(h), { shape: o.shape || "rect", radius: o.radius || 0, name: o.name || "Photo", border: o.border, rot: o.rot });
      f.frame.image = stockImage(pick(w, h, o.hint || ""), w, h, o.focus);
      return f;
    },
    /** Full-bleed photo (into the print bleed). */
    bleedPhoto(o = {}) { return k.photo(-b, -b, W + 2 * b, H + 2 * b, o); },
    /** See-through gradient over a photo: alphas from start to end along angle (180 = top to bottom). */
    shade(x, y, w, h, color, alphas, angle = 180, name = "Photo shade") {
      const r = K.R(r1(x), r1(y), r1(w), r1(h), color, { name });
      r.shape.gradient = { stops: alphas.map((a) => alpha(color, a)), angle };
      return r;
    },
    rect(x, y, w, h, fill, o = {}) { return K.R(r1(x), r1(y), r1(w), r1(h), fill, { radius: o.radius, name: o.name, op: o.op, stroke: o.stroke, sw: o.sw, rot: o.rot }); },
    circle(x, y, d, fill, o = {}) { return K.C(r1(x), r1(y), r1(d), r1(o.h || d), fill, { name: o.name, op: o.op, stroke: o.stroke, sw: o.sw }); },
    grad(l, stops, angle = 135) { l.shape.gradient = { stops, angle }; return l; },
    sticker(id, x, y, w, o = {}) { try { return K.E(id, r1(x), r1(y), r1(w), { h: o.h ? r1(o.h) : undefined, c1: o.c1, c2: o.c2, c3: o.c3, rot: o.rot, op: o.op, name: o.name }); } catch { return null; } },
    /** Small-caps label; o.bar draws a short line before it. Returns { layers, h, w }. */
    kicker(s, x, y, w, o = {}) {
      const size = o.size || Math.max(8, S * 0.026);
      const bar = o.bar ? size * 1.8 : 0;
      const t = k.text(s, x + (bar ? bar + size * 0.6 : 0), y, w - (bar ? bar + size * 0.6 : 0), { size, bold: true, upper: true, ls: 0.16, color: o.color || st.acc, align: o.align, lines: 1, name: "Label", family: st.body });
      const out = [t];
      if (bar) out.unshift(k.rect(x, y + t.h / 2 - Math.max(1.5, size * 0.09), bar, Math.max(3, size * 0.18), o.color || st.acc, { name: "Label line" }));
      return { layers: out, h: t.h, w: textWidth(s.toUpperCase(), st.body, true, false, t.text.size) + 0.16 * t.text.size * s.length + bar };
    },
    /** Pill button. align: where x sits ("left" = x is the left edge, "center", "right"). */
    pill(s, x, y, o = {}) {
      const size = o.size || Math.max(8, S * 0.03);
      const tw = textWidth(s, st.body, true, false, size) + size * 0.04 * s.length;
      const h = size * 2.3, w = Math.min(o.maxW || Infinity, tw + size * 2.6);
      const x0 = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
      const box = k.rect(x0, y, w, h, o.fill || st.acc, { radius: h / 2, name: "Button" });
      const t = k.text(s, x0 + size * 0.6, y, w - size * 1.2, { size, bold: true, color: o.color || st.onAcc, align: "center", lines: 1, name: "Button text", ls: 0.04 });
      t.y = r1(y + (h - t.h) / 2);
      return { layers: [box, t], h, w };
    },
    /** Rows of details with small icons (date, place, phone, web); centred text when align = center. */
    details(items, x, y, w, o = {}) {
      const size = o.size || Math.max(8, S * 0.028), color = o.color || st.sub, out = [];
      if (!items?.length) return { layers: [], h: 0 };
      if (o.align === "center" || o.plain) {
        const t = k.text(items.join("\n"), x, y, w, { size, color, align: o.align || "left", lh: 1.5, name: "Details", maxH: size * 1.5 * items.length * 1.6 });
        return { layers: [t], h: t.h };
      }
      let cy = y;
      const is = size * 1.15;
      for (const s of items) {
        const ic = iconFor(s);
        const t = k.text(s, x + is * 1.7, cy, w - is * 1.7, { size, color, lh: 1.3, name: "Detail", maxH: size * 1.3 * 2.05 });
        if (ic) { const e = k.sticker(ic, x, cy + (size * 1.3 - is) / 2, is, { c1: o.icon || st.acc }); if (e) out.push(e); }
        else out.push(k.circle(x + is * 0.3, cy + size * 0.65 - is * 0.2, is * 0.4, o.icon || st.acc, { name: "Dot" }));
        out.push(t);
        cy += t.h + size * 0.55;
      }
      return { layers: out, h: cy - y - size * 0.55 };
    },
    /** Round price / offer badge. */
    badge(s, x, y, d, o = {}) {
      const fill = o.fill || st.acc, color = o.color || st.onAcc;
      const out = [k.circle(x, y, d, fill, { name: "Price badge" })];
      if (o.ring) out.push(k.circle(x + d * 0.06, y + d * 0.06, d * 0.88, "none", { stroke: color, sw: Math.max(1, d * 0.012), name: "Badge ring" }));
      const t = k.text(s, x + d * 0.14, y, d * 0.72, { size: d * 0.24, bold: true, color, align: "center", lh: 1.02, maxH: d * 0.56, name: "Price", family: st.head === "serif" ? "sans" : st.head });
      t.y = r1(y + (d - t.h) / 2);
      out.push(t);
      return out;
    },
    /**
     * Stacks the text parts in a box. parts: [{ build(w, maxH?) -> { layers, h }, gap, flex }]; the flex part (the
     * headline) gets the height the others leave. anchor: top | center | bottom. Returns { layers, h, y }.
     * When everything cannot fit, parts with a `drop` rank leave first (highest first), so nothing spills out.
     */
    column(parts, box, anchor = "top") {
      let ps = parts.filter(Boolean), built, gaps, total;
      for (;;) {
        gaps = ps.slice(0, -1).reduce((s, p) => s + (p.gap || 0), 0);
        built = new Map();
        for (const p of ps) if (!p.flex) built.set(p, p.build(box.w));
        const fixed = [...built.values()].reduce((s, r) => s + r.h, 0);
        const flex = ps.find((p) => p.flex);
        if (flex) built.set(flex, flex.build(box.w, Math.max(box.h * 0.22, box.h - fixed - gaps)));
        total = ps.reduce((s, p) => s + built.get(p).h, 0) + gaps;
        const drop = ps.filter((p) => p.drop).sort((a, b) => b.drop - a.drop)[0];
        if (total <= box.h + 1 || !drop) break;
        ps = ps.filter((p) => p !== drop);
      }
      let y = anchor === "bottom" ? box.y + box.h - total : anchor === "center" ? box.y + (box.h - total) / 2 : box.y;
      const y0 = y, out = [];
      for (const p of ps) {
        const r = built.get(p);
        for (const l of r.layers) { l.y = r1(l.y + y); out.push(l); }
        y += r.h + (p.gap || 0);
      }
      return { layers: out, h: total, y: y0 };
    },
  };
  return k;
}

/* ---------------- text parts for column() ---------------- */
function parts(k, c, o = {}) {
  const { st, S } = k;
  const color = o.ink || st.ink, sub = o.sub || st.sub, acc = o.acc || st.acc, align = o.align || "left";
  // Long headlines get a smaller top size; size families (thumbnails, stories) a boost.
  const len = String(c.head || "").length;
  const hs = (o.headMax || S * 0.14) * (k.boost || 1) * (len > 70 ? 0.58 : len > 40 ? 0.74 : 1), out = [];
  const at = (w) => (align === "center" ? w / 2 : align === "right" ? w : 0);
  if (c.kicker && o.kicker !== false) out.push({ gap: S * 0.022, drop: 1, build: (w) => { const r = k.kicker(c.kicker, o.x, 0, w, { color: o.kickerColor || acc, align, bar: o.bar && align === "left" }); return r; } });
  out.push({ flex: true, gap: S * (c.sub ? 0.028 : 0.04), build: (w, maxH) => {
    const t = k.text(c.head, o.x, 0, w, { size: hs, maxH: Math.min(maxH, o.headH || Infinity), min: S * 0.045, bold: true, family: o.headFamily || st.head, color, align, lh: c.head.length > 26 ? 1.05 : 0.98, ls: hs > S * 0.09 ? -0.02 : 0, upper: o.upper && c.head.length <= 28, name: "Headline" });
    return { layers: [t], h: t.h };
  } });
  if (c.sub) out.push({ gap: S * 0.032, drop: 2, build: (w) => { const t = k.text(c.sub, o.x, 0, Math.min(w, o.subW || w), { size: o.subSize || S * 0.034, color: sub, align, lh: 1.38, maxH: (o.subSize || S * 0.034) * 1.38 * (o.subLines || 3), name: "Text" }); if (align !== "left") t.x = r1(o.x + (w - t.w) * (align === "center" ? 0.5 : 1)); return { layers: [t], h: t.h }; } });
  // One part per detail line, so a crowded page drops the last line first instead of spilling over.
  if (c.details?.length && o.details !== false) {
    const items = c.details.slice(0, o.maxDetails || 3), ds = o.detailSize || Math.max(8, S * 0.028);
    items.forEach((s, i) => out.push({ gap: i < items.length - 1 ? ds * 0.55 : S * 0.036, drop: 3 + (i + 1) / 10, build: (w) => k.details([s], o.x, 0, w, { align, color: o.detailColor || sub, icon: o.iconColor || acc, size: ds }) }));
  }
  if (c.cta && o.cta !== false) out.push({ gap: 0, build: (w) => k.pill(c.cta, o.x + at(w), 0, { align, fill: o.ctaFill || acc, color: o.ctaColor || st.onAcc, maxW: w }) });
  return out;
}

/* ---------------- compositions ---------------- */
// g = { k, c, W, H, S, m, b, st, mir, v, X(x, w) mirrored x, wide, tall, land }. Each returns { bg, layers }.
export const PATTERNS = {
  /** Full-bleed photo, deep shade rising from the bottom, huge headline bottom-left. */
  bleed(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [k.bleedPhoto({ hint: c.hint }), k.shade(-g.b, H * 0.18, W + 2 * g.b, H * 0.82 + g.b, st.deep, [0, 0.55, 0.92])];
    if (g.land) L.push(k.shade(-g.b, -g.b, W * 0.75, H + 2 * g.b, st.deep, g.mir ? [0, 0.55] : [0.6, 0], 90));
    const colW = g.land ? W * 0.58 : W - 2 * m;
    const col = k.column(parts(k, { ...c, kicker: null }, { x: g.X(m, colW), ink: "#ffffff", sub: "#e6e8ef", detailColor: "#e6e8ef", iconColor: st.acc === "#0a0a0a" ? "#ffffff" : st.acc, headMax: S * (g.land ? 0.17 : 0.15), upper: g.v % 2 === 1 }), { x: g.X(m, colW), y: H * 0.3, w: colW, h: H * 0.7 - m }, "bottom");
    L.push(...col.layers);
    if (c.kicker) { const kk = k.kicker(c.kicker, g.X(m, W * 0.6), m, W * 0.6, { color: "#ffffff", bar: !g.mir }); L.push(...kk.layers); }
    if (c.price) L.push(...k.badge(c.price, g.X(W - m - S * 0.24, S * 0.24), m * 0.9, S * 0.24, { ring: true }));
    else if (c.deco) { const d = k.sticker(c.deco.id, g.X(W - m - S * 0.16, S * 0.16), m * 0.8, S * 0.16, /^badge-/.test(c.deco.id) ? { c1: st.acc, c2: "#ffffff" } : { c1: "#ffffff", c2: st.acc, c3: st.acc2 }); if (d) L.push(d); }
    return { bg: st.deep, layers: L };
  },
  /** Photo on one side (or on top), text on a colour block; an accent block peeks from behind an inset photo. */
  split(g) {
    const { k, c, W, H, S, m, st } = g;
    const inset = g.v % 2 === 1, L = [];
    const dark = st.dark, ink = st.ink, bg = st.bg;
    let box;
    if (g.land || g.wide) {
      const pw = W * (g.wide ? 0.42 : 0.48);
      if (inset) {
        const px = g.X(W - pw - m * 0.6, pw), py = m * 0.6;
        L.push(k.rect(g.X(W - pw - m * 0.6 + S * 0.035, pw), py + S * 0.035, pw, H - m * 1.2, st.acc, { radius: S * 0.04, name: "Accent block" }));
        L.push(k.photo(px, py, pw, H - m * 1.2, { shape: "rounded", radius: S * 0.04, hint: c.hint }));
      } else L.push(k.photo(g.mir ? -g.b : W - pw, -g.b, pw + g.b, H + 2 * g.b, { hint: c.hint }));
      box = { x: g.X(m, W - pw - m * 2.2), y: m, w: W - pw - m * 2.2, h: H - 2 * m };
    } else {
      const ph = H * (g.tall ? 0.5 : 0.54);
      if (inset) {
        L.push(k.rect(m + S * 0.035, m + S * 0.035, W - 2 * m, ph - m, st.acc, { radius: S * 0.04, name: "Accent block" }));
        L.push(k.photo(m, m, W - 2 * m, ph - m, { shape: "rounded", radius: S * 0.04, hint: c.hint }));
      } else {
        L.push(k.photo(-g.b, -g.b, W + 2 * g.b, ph + g.b, { hint: c.hint }));
        L.push(k.rect(g.X(m, S * 0.18), ph - S * 0.012, S * 0.18, S * 0.024, st.acc, { name: "Accent line" }));
      }
      box = { x: m, y: ph + m * (inset ? 0.9 : 0.8), w: W - 2 * m, h: H - ph - m * (inset ? 1.9 : 1.8) };
    }
    const col = k.column(parts(k, c, { x: box.x, headMax: S * (g.land ? 0.13 : 0.12), bar: true, ink, sub: st.sub }), box, g.land || g.wide ? "center" : "top");
    L.push(...col.layers);
    if (c.price) L.push(...k.badge(c.price, g.land ? g.X(W * 0.52 - S * 0.12, S * 0.24) : g.X(W - m - S * 0.24, S * 0.24), g.land ? H - m - S * 0.26 : H * 0.54 - S * 0.17, S * 0.24, { fill: st.acc2 === "#ffffff" || st.acc2 === "#f5f5f5" ? st.acc : st.acc2, ring: true }));
    return { bg: dark ? bg : bg, layers: L };
  },
  /** Diamond-masked photos clustered on one side, an outline diamond, text on a light page. */
  diamond(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], light = st.dark ? STYLES.ocean : st;
    const ink = st.dark ? "#0b1b3f" : st.ink, sub = st.dark ? "#52617f" : st.sub;
    let cx, cy, d, box;
    const side = g.land || g.wide || W / H > 0.9;
    if (side) { const lw = g.land || g.wide; d = H * (lw ? 0.6 : 0.42); cx = g.X(W * (lw ? 0.75 : 0.73) - d / 2, d) + d / 2; cy = H * (lw ? 0.47 : 0.42); const bw = W * (lw ? 0.46 : 0.44) - m; box = { x: g.X(m, bw), y: m, w: bw, h: H - 2 * m }; }
    else { d = W * 0.54; cx = g.X(W * 0.62 - d / 2, d) + d / 2; cy = m * 0.6 + d * 0.62; box = { x: m, y: cy + d * 0.72, w: W - 2 * m, h: H - cy - d * 0.72 - m }; }
    const sgn = g.mir ? -1 : 1;
    L.push(K_poly(k, cx - d * 0.62, cy - d * 0.62, d * 1.24, "none", { stroke: st.acc, sw: Math.max(1.5, S * 0.005), name: "Diamond outline" }));
    L.push(K_poly(k, cx + sgn * d * 0.36 - d * 0.2, cy + d * 0.1, d * 0.4, st.acc, { name: "Diamond" }));
    L.push(k.photo(cx - d / 2, cy - d / 2, d, d, { shape: "diamond", hint: c.hint }));
    L.push(k.photo(cx - sgn * d * 0.52 - d * 0.19, cy - d * 0.42, d * 0.38, d * 0.38, { shape: "diamond", hint: c.hint2 ?? c.hint + " detail" }));
    const dots = k.sticker("deco-dots", g.X(W - m * 0.5 - S * 0.12, S * 0.12), m * 0.5, S * 0.12, { c1: st.acc, op: 0.5 });
    if (dots) L.push(dots);
    const col = k.column(parts(k, c, { x: box.x, ink, sub, headMax: S * 0.12, bar: true }), box, g.land || g.wide ? "center" : "top");
    L.push(...col.layers);
    return { bg: st.dark ? "#ffffff" : light.bg === "#ffffff" ? "#ffffff" : st.bg, layers: L };
  },
  /** Type-led: soft gradient blobs, a huge headline, a meta row with a hairline; a small rounded photo. */
  blob(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], bg = st.dark ? "#ffffff" : st.bg === "#ffffff" ? "#ffffff" : mix(st.bg, "#ffffff", 0.5);
    const ink = st.dark ? "#10123a" : st.ink, sub = st.dark ? "#545785" : st.sub;
    const lw = g.land || g.wide;
    L.push(k.grad(k.circle(g.X(W * 0.36, W * 0.9), -H * 0.44, W * 0.9, st.acc, { name: "Gradient blob", h: H * (lw ? 0.9 : 0.7) }), [alpha(st.acc2, 0.95), alpha(st.acc, 0.8), alpha(st.acc, 0)], g.mir ? 210 : 150));
    L.push(k.grad(k.circle(g.X(W * 0.64, W * 0.46), -H * 0.14, W * 0.46, st.acc2, { name: "Gradient blob", h: H * (lw ? 0.5 : 0.36) }), [alpha("#ffffff", 0.9), alpha(st.acc2, 0.55), alpha(st.acc2, 0)], 200));
    const brand = c.kicker;
    if (brand) { L.push(k.circle(m, m + S * 0.004, S * 0.026, st.acc, { name: "Logo dot" })); L.push(k.text(brand, m + S * 0.042, m - S * 0.002, W * 0.5, { size: S * 0.024, bold: true, color: ink, lines: 1, name: "Brand" })); }
    const meta = c.details.slice(0, 3);
    const metaY = H - m - S * 0.05, gap = S * 0.035;
    const headW = lw ? W * 0.58 : W - 2 * m;
    const hx = g.X(m, headW), head = k.text(c.head, hx, 0, headW, { size: S * (c.head.length > 30 ? 0.13 : 0.2), maxH: H * (lw ? 0.4 : 0.27), min: S * 0.06, bold: true, family: st.head, color: ink, lh: 0.96, ls: -0.03, name: "Headline" });
    head.y = r1(H * (lw ? 0.24 : 0.29)); L.push(head);
    // The photo takes the free corner under the headline (right column on wide pages), so nothing overlaps.
    const photoW = lw ? W * 0.27 : W * 0.4;
    const pTop = lw ? H * 0.2 : head.y + head.h + gap, pBot = metaY - gap * (meta.length ? 1.3 : 0.2);
    L.push(k.photo(g.X(W - m - photoW, photoW), pTop, photoW, Math.max(S * 0.18, pBot - pTop), { shape: "rounded", radius: S * 0.03, hint: c.hint }));
    const colW = lw ? headW - m * 0.5 : W - 2 * m - photoW - gap;
    let y = head.y + head.h + gap;
    if (c.sub) { const subT = k.text(c.sub, g.X(m, colW), y, colW, { size: S * 0.03, color: sub, lh: 1.38, maxH: Math.min(S * 0.03 * 1.38 * 4, pBot - y - S * 0.12), name: "Text" }); L.push(subT); y += subT.h + gap; }
    if (c.cta && y + S * 0.07 < pBot) { const p = k.pill(c.cta, g.mir ? W - m : m, y, { fill: ink, color: bg, maxW: colW, align: g.mir ? "right" : "left" }); L.push(...p.layers); }
    if (meta.length) {
      L.push(k.rect(m, metaY - S * 0.022, W - 2 * m, Math.max(1, S * 0.0025), ink, { op: 0.35, name: "Hairline" }));
      const cw = (W - 2 * m) / meta.length;
      meta.forEach((s, i) => L.push(k.text(s, m + i * cw, metaY, cw - S * 0.02, { size: S * 0.021, color: ink, bold: i === 0, lines: 2, name: "Meta" })));
    }
    if (c.price) L.push(...k.badge(c.price, g.X(W - m - S * 0.06, S * 0.2) - (g.mir ? -1 : 1) * S * 0.06, lw ? H * 0.1 : pTop - S * 0.1, S * 0.2, { fill: ink, color: bg }));
    return { bg, layers: L };
  },
  /** Huge headline on a light page, a photo band along the bottom, small meta lines in the top corners. */
  band(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], bandH = H * (g.land ? 0.42 : 0.4);
    const bg = st.dark ? "#f4f1ea" : st.bg, ink = st.dark ? "#16161a" : st.ink, acc = st.acc === "#0a0a0a" || st.dark ? (st.acc2.startsWith("#f") ? "#d7263d" : st.acc) : st.acc;
    L.push(k.photo(-g.b, H - bandH, W + 2 * g.b, bandH + g.b, { hint: c.hint }));
    if (c.kicker) L.push(k.text(c.kicker, m, m * 0.7, W * 0.42, { size: S * 0.021, bold: true, color: ink, upper: true, ls: 0.12, lines: 1, name: "Label" }));
    if (c.details[0]) L.push(k.text(c.details[0], W * 0.5, m * 0.7, W * 0.5 - m, { size: S * 0.021, color: ink, align: "right", lines: 1, name: "Meta" }));
    L.push(k.rect(m, m * 0.7 + S * 0.042, W - 2 * m, Math.max(1, S * 0.002), ink, { op: 0.3, name: "Hairline" }));
    const box = { x: m, y: m * 0.7 + S * 0.08, w: W - 2 * m, h: H - bandH - m * 0.7 - S * 0.08 - S * 0.05 };
    const col = k.column(parts(k, { ...c, kicker: null, details: c.details.slice(1), cta: null }, { x: m, align: "center", ink: acc, sub: st.dark ? "#4a4a52" : st.sub, headMax: S * 0.2, upper: true, headFamily: "sans", maxDetails: 2 }), box, "center");
    L.push(...col.layers);
    if (c.cta) { const p = k.pill(c.cta, W / 2, H - bandH - S * 0.045, { align: "center", fill: ink, color: "#ffffff" }); L.push(...p.layers); }
    if (c.price) L.push(...k.badge(c.price, g.X(W - m - S * 0.22, S * 0.22), H - bandH + S * 0.05, S * 0.22, { fill: acc, color: "#ffffff", ring: true }));
    return { bg, layers: L };
  },
  /** Dark page with a glowing gradient ring around a round photo; bold text on the other side. */
  glow(g) {
    const { k, W, H, S, m, st } = g;
    let c = g.c;
    const s = st.dark ? st : STYLES.navy, L = [];
    const acc = st.acc === "#0a0a0a" ? "#4f7cff" : st.acc, acc2 = st.acc2 === "#ffffff" || st.acc2 === "#f5f5f5" || st.acc2 === "#1c1c1e" ? mix(acc, "#ffffff", 0.45) : st.acc2;
    const side = g.land || g.wide || W / H > 0.9;
    const d = side ? H * (g.land || g.wide ? 1.04 : 0.86) : W * 0.86;
    const x = side ? g.X(W - d * (g.land || g.wide ? 0.82 : 0.62), d) : g.X(W - d * 0.78, d), y = side ? (H - d) / 2 : -d * 0.18;
    L.push(k.grad(k.circle(x - d * 0.08, y - d * 0.08, d * 1.16, acc, { name: "Glow" }), [alpha(acc, 0.35), alpha(acc2, 0.12), alpha(acc2, 0)], 160));
    L.push(k.grad(k.circle(x, y, d, acc, { name: "Ring" }), [acc, acc2], 135));
    L.push(k.circle(x + d * 0.05, y + d * 0.05, d * 0.9, s.bg, { name: "Ring inside" }));
    L.push(k.photo(x + d * 0.1, y + d * 0.1, d * 0.8, d * 0.8, { shape: "circle", hint: c.hint }));
    const box = side ? { x: g.X(m, W * (g.land || g.wide ? 0.5 : 0.48) - m), y: m, w: W * (g.land || g.wide ? 0.5 : 0.48) - m, h: H - 2 * m } : { x: m, y: y + d + m * 0.4, w: W - 2 * m, h: H - (y + d + m * 0.4) - m };
    if (c.kicker) {
      const kk = k.kicker(c.kicker, 0, 0, box.w, { color: "#ffffff" });
      const pw = Math.min(box.w, kk.w + S * 0.05), ph = kk.h + S * 0.026;
      c = { ...c, kicker: null };
      const chip = { gap: S * 0.03, build: () => { const r = k.rect(box.x, 0, pw, ph, "none", { stroke: "#ffffff", sw: Math.max(1, S * 0.003), radius: ph / 2, name: "Tag outline" }); kk.layers.forEach((l) => { l.x = r1(l.x + box.x + S * 0.025); l.y = r1(l.y + S * 0.013); }); return { layers: [r, ...kk.layers], h: ph }; } };
      const col = k.column([chip, ...parts(k, c, { x: box.x, ink: "#ffffff", sub: s.sub, headMax: S * 0.14, ctaFill: acc, ctaColor: st.dark ? st.onAcc : "#ffffff" })], box, "center");
      L.push(...col.layers);
    } else L.push(...k.column(parts(k, c, { x: box.x, ink: "#ffffff", sub: s.sub, headMax: S * 0.14, ctaFill: acc, ctaColor: st.dark ? st.onAcc : "#ffffff" }), box, "center").layers);
    return { bg: s.bg, layers: L };
  },
  /** Tall arch-masked photo with a coloured arch behind it; elegant text. */
  arch(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], bg = st.dark ? "#f5efe6" : st.bg, ink = st.dark ? "#2b1d16" : st.ink, sub = st.dark ? "#6e5a4d" : st.sub;
    let box;
    if (g.land || g.wide) {
      const ah = H - 2 * m * 0.8, aw = ah * 0.72, ax = g.X(W - m - aw, aw), ay = m * 0.8;
      L.push(archShape(k, ax + (g.mir ? -1 : 1) * S * 0.04, ay + S * 0.03, aw, ah, st.acc2));
      L.push(k.photo(ax, ay, aw, ah, { shape: "arch", hint: c.hint }));
      box = { x: g.X(m, W - aw - m * 3), y: m, w: W - aw - m * 3, h: H - 2 * m };
      L.push(...k.column(parts(k, c, { x: box.x, ink, sub, headMax: S * 0.15, bar: true }), box, "center").layers);
    } else {
      const aw = W * 0.6, ah = H * (g.tall ? 0.46 : 0.5), ax = (W - aw) / 2, ay = m;
      L.push(archShape(k, ax + S * 0.035, ay + S * 0.03, aw, ah, st.acc2));
      L.push(k.photo(ax, ay, aw, ah, { shape: "arch", hint: c.hint }));
      box = { x: m, y: ay + ah + m * 0.6, w: W - 2 * m, h: H - ay - ah - m * 1.6 };
      L.push(...k.column(parts(k, c, { x: box.x, ink, sub, align: "center", headMax: S * 0.13 }), box, "center").layers);
    }
    const sp = k.sticker("deco-sparkle", g.X(m * 0.7, S * 0.07), m * 0.7, S * 0.07, { c1: st.acc });
    if (sp) L.push(sp);
    return { bg, layers: L };
  },
  /** Full-bleed photo, light shade, a floating card with the text. */
  card(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [k.bleedPhoto({ hint: c.hint }), k.shade(-g.b, -g.b, W + 2 * g.b, H + 2 * g.b, st.deep, [0.12, 0.38], 180)];
    const cardBg = st.dark ? st.bg : "#ffffff", ink = st.dark ? "#ffffff" : st.ink;
    const cw = g.land || g.wide ? W * 0.5 : W - 2 * m * 1.2, pad = S * 0.06;
    const cx = g.land || g.wide ? g.X(m, cw) : (W - cw) / 2;
    const col = k.column(parts(k, c, { x: cx + pad, ink, sub: st.sub, align: g.land || g.wide ? "left" : "center", headMax: S * 0.11 }), { x: cx + pad, y: 0, w: cw - 2 * pad, h: H * (g.land ? 0.78 : 0.62) - 2 * pad }, "top");
    const ch = col.h + 2 * pad, cy = g.land || g.wide ? (H - ch) / 2 : H - m * 1.2 - ch;
    for (const l of col.layers) l.y = r1(l.y + cy + pad);
    L.push(k.rect(cx, cy, cw, ch, cardBg, { radius: S * 0.03, name: "Card" }), ...col.layers);
    if (c.price) L.push(...k.badge(c.price, g.X(W - m - S * 0.22, S * 0.22), m, S * 0.22, { ring: true }));
    return { bg: st.deep, layers: L };
  },
  /** Magazine: photo on the top two thirds, a colour block below with the headline. */
  magazine(g) {
    const { k, c, W, H, S, m, st } = g;
    const ph = H * (g.land ? 0.58 : 0.6), L = [];
    const block = st.dark ? st.acc : st.deep, ink = st.dark ? st.onAcc : "#ffffff";
    L.push(k.photo(-g.b, -g.b, W + 2 * g.b, ph + g.b, { hint: c.hint }));
    L.push(k.shade(-g.b, -g.b, W + 2 * g.b, ph * 0.4, "#000000", [0.45, 0], 180));
    if (c.kicker) L.push(...k.kicker(c.kicker, m, m * 0.8, W * 0.44, { color: "#ffffff" }).layers);
    if (c.details[0]) L.push(k.text(c.details[0], W * 0.52, m * 0.8, W * 0.48 - m, { size: S * 0.024, color: "#ffffff", align: "right", lines: 1, name: "Meta" }));
    L.push(k.rect(-g.b, ph, W + 2 * g.b, H - ph + g.b, block, { name: "Colour block" }));
    L.push(k.rect(m, ph - S * 0.012, S * 0.16, S * 0.024, st.acc === block ? st.acc2 : st.acc, { name: "Accent line" }));
    const box = { x: m, y: ph + m * 0.7, w: W - 2 * m, h: H - ph - m * 1.4 };
    if (g.land || g.wide) {
      const hw = W * 0.55;
      L.push(...k.column(parts(k, { ...c, kicker: null, sub: null, details: [], cta: null }, { x: m, ink, headMax: S * 0.1 }), { ...box, w: hw }, "center").layers);
      L.push(...k.column(parts(k, { ...c, head: "", kicker: null, details: c.details.slice(1) }, { x: m + hw + m * 0.6, ink, sub: mix(ink, block, 0.2), headMax: 1, ctaFill: "#ffffff", ctaColor: block }).slice(1), { x: m + hw + m * 0.6, y: box.y, w: W - hw - m * 2.6, h: box.h }, "center").layers);
    } else L.push(...k.column(parts(k, { ...c, kicker: null, details: c.details.slice(1) }, { x: m, ink, sub: mix(ink, block, 0.22), detailColor: mix(ink, block, 0.15), iconColor: "#ffffff", headMax: S * 0.12, ctaFill: "#ffffff", ctaColor: block, maxDetails: 2, subLines: 2 }), box, "center").layers);
    if (c.price) L.push(...k.badge(c.price, g.X(W - m - S * 0.22, S * 0.22), ph - S * 0.15, S * 0.22, { fill: st.acc === block ? st.acc2 : st.acc, ring: true }));
    return { bg: block, layers: L };
  },
  /** Bold type poster: gradient page, huge stacked words, a tilted photo card and a price burst. */
  poster(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], ink = "#ffffff";
    const c1 = st.dark ? st.bg : st.acc, c2 = st.dark ? mix(st.acc, st.bg, 0.55) : st.acc2 === "#ffffff" || st.acc2 === "#f5f5f5" || st.acc2 === "#1c1c1e" ? st.deep : st.acc2;
    const pw = g.land || g.wide ? W * 0.3 : W * 0.46, phh = pw * 1.12;
    const px = g.land || g.wide ? g.X(W - m - pw, pw) : g.X(W - m * 0.9 - pw, pw), py = g.land || g.wide ? (H - phh) / 2 : H - m - phh;
    L.push(k.rect(px - S * 0.016, py - S * 0.016, pw + S * 0.032, phh + S * 0.032, "#ffffff", { name: "Photo card", rot: g.mir ? -5 : 5 }));
    L.push(k.photo(px, py, pw, phh, { hint: c.hint, rot: g.mir ? -5 : 5 }));
    const sp = k.sticker("deco-sparkles", g.X(m * 0.6, S * 0.12), g.land ? H - m - S * 0.12 : m * 0.6, S * 0.12, { c1: "#ffffff", c2: st.acc2 === "#ffffff" ? "#ffd23f" : "#ffffff" });
    if (sp) L.push(sp);
    const box = g.land || g.wide ? { x: g.X(m, W * 0.6 - m), y: m, w: W * 0.6 - m, h: H - 2 * m } : { x: m, y: m * 1.3, w: W - 2 * m, h: py - m * 1.6 };
    L.push(...k.column(parts(k, { ...c, details: g.land ? c.details : c.details.slice(0, 1) }, { x: box.x, ink, sub: "#ffffff", kickerColor: "#ffffff", detailColor: "#ffffff", iconColor: "#ffffff", headMax: S * 0.2, upper: true, ctaFill: "#ffffff", ctaColor: c1, subLines: 2, bar: true }), box, g.land || g.wide ? "center" : "top").layers);
    if (c.price) {
      const d = S * 0.26, bx = g.land ? g.X(W - m - pw - d * 0.55, d) : g.X(m, d), by = g.land ? H - m - d : H - m - d * 1.05;
      const burst = k.K.S("star", r1(bx), r1(by), r1(d), r1(d), "#ffd23f", { points: 14, name: "Price burst" }); burst.shape.inner = 0.82;
      L.push(burst);
      const t = k.text(c.price, bx + d * 0.18, 0, d * 0.64, { size: d * 0.22, bold: true, color: "#1b1b1b", align: "center", maxH: d * 0.5, lh: 1, name: "Price" }); t.y = r1(by + (d - t.h) / 2); L.push(t);
    }
    return { bg: [c1, c2, g.mir ? 225 : 145], layers: L };
  },
  /** Three photos in a grid (one big, two small), text below or beside. */
  grid(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], gap = S * 0.018, r = S * 0.022;
    const bg = st.dark ? st.bg : st.bg, ink = st.ink;
    let box;
    if (g.land || g.wide) {
      const gw = W * 0.56, gx = g.X(W - m * 0.7 - gw, gw), gy = m * 0.7, gh = H - m * 1.4;
      const bw = gw * 0.56;
      L.push(k.photo(g.mir ? gx + gw - bw : gx, gy, bw, gh, { shape: "rounded", radius: r, hint: c.hint }));
      L.push(k.photo(g.mir ? gx : gx + bw + gap, gy, gw - bw - gap, (gh - gap) / 2, { shape: "rounded", radius: r, hint: c.hint2 ?? c.hint + " detail" }));
      L.push(k.photo(g.mir ? gx : gx + bw + gap, gy + (gh + gap) / 2, gw - bw - gap, (gh - gap) / 2, { shape: "rounded", radius: r, hint: c.hint3 ?? c.hint + " people" }));
      box = { x: g.X(m, W - gw - m * 2.4), y: m, w: W - gw - m * 2.4, h: H - 2 * m };
    } else {
      const gh = H * (g.tall ? 0.48 : 0.5), gy = m * 0.7, gw = W - m * 1.4, bw = gw * 0.6;
      L.push(k.photo(g.mir ? m * 0.7 + gw - bw : m * 0.7, gy, bw, gh, { shape: "rounded", radius: r, hint: c.hint }));
      L.push(k.photo(g.mir ? m * 0.7 : m * 0.7 + bw + gap, gy, gw - bw - gap, (gh - gap) / 2, { shape: "rounded", radius: r, hint: c.hint2 ?? c.hint + " detail" }));
      L.push(k.photo(g.mir ? m * 0.7 : m * 0.7 + bw + gap, gy + (gh + gap) / 2, gw - bw - gap, (gh - gap) / 2, { shape: "rounded", radius: r, hint: c.hint3 ?? c.hint + " people" }));
      box = { x: m, y: gy + gh + m * 0.75, w: W - 2 * m, h: H - gy - gh - m * 1.6 };
    }
    L.push(...k.column(parts(k, c, { x: box.x, ink, sub: st.sub, headMax: S * 0.12, bar: true, subLines: 2 }), box, g.land || g.wide ? "center" : "top").layers);
    if (c.price) L.push(...k.badge(c.price, g.land ? g.X(W - m * 0.7 - S * 0.24, S * 0.24) : g.X(W - m - S * 0.22, S * 0.22), g.land ? H - m - S * 0.26 : H * 0.5 - S * 0.12, S * 0.22, { ring: true }));
    return { bg, layers: L };
  },
  /** Two tilted polaroid photos with tape, warm page, italic serif headline. */
  polaroid(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], bg = st.dark ? "#f3ece1" : st.bg, ink = st.dark ? "#2b2118" : st.ink, sub = st.dark ? "#6d5f50" : st.sub;
    const pol = (x, y, w, rot, hint) => {
      const pad = w * 0.06, ph = w * 0.98;
      L.push(k.rect(x, y, w, ph + pad * 4.2, "#ffffff", { name: "Polaroid", rot }));
      L.push(k.photo(x + pad, y + pad, w - 2 * pad, ph - pad, { hint, rot }));
      L.push(k.rect(x + w * 0.36, y - w * 0.05, w * 0.28, w * 0.1, st.acc2 === "#ffffff" || st.acc2 === "#f5f5f5" ? "#f2d27a" : st.acc2, { name: "Tape", rot: rot * -1.5, op: 0.82 }));
    };
    let box;
    if (g.land || g.wide || W / H > 0.9) {
      const w = H * (g.land || g.wide ? 0.56 : 0.4);
      pol(g.X(W * 0.5, w), H * 0.12, w, g.mir ? 6 : -6, c.hint);
      pol(g.X(W * 0.5 + w * 0.62, w), H * 0.3, w, g.mir ? -5 : 5, c.hint2 ?? c.hint);
      box = { x: g.X(m, W * 0.46 - m), y: m, w: W * 0.46 - m, h: H - 2 * m };
    } else {
      const w = W * (g.tall ? 0.48 : 0.42);
      pol(g.X(m * 0.9, w), m * 1.1, w, g.mir ? 5 : -5, c.hint);
      pol(g.X(W - m * 0.9 - w, w), m * 1.1 + w * 0.3, w, g.mir ? -4 : 4, c.hint2 ?? c.hint + " detail");
      const top = m * 1.1 + w * 0.3 + w * 1.2 + m * 0.5;
      box = { x: m, y: top, w: W - 2 * m, h: H - top - m };
    }
    L.push(...k.column(parts(k, c, { x: box.x, ink, sub, align: box.w < W * 0.6 ? "left" : "center", headMax: S * 0.13, headFamily: "serif" }), box, "center").layers);
    for (const l of L) if (l.name === "Headline" && l.text.content !== l.text.content.toUpperCase()) l.text.italic = true;
    return { bg, layers: L };
  },
  /** A big round photo with a ring and a soft colour disc behind; centred text. */
  circle(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [], bg = st.bg, ink = st.ink;
    let box;
    if (g.land || g.wide) {
      const d = H * 0.7, x = g.X(W - m * 1.3 - d, d), y = (H - d) / 2;
      L.push(k.circle(x + d * 0.14 * (g.mir ? -1 : 1), y - d * 0.1, d * 1.05, st.dark ? mix(st.acc, st.bg, 0.6) : mix(st.acc2, st.bg, 0.55), { name: "Colour disc" }));
      L.push(k.circle(x - S * 0.022, y - S * 0.022, d + S * 0.044, "none", { stroke: st.acc, sw: Math.max(1.5, S * 0.005), name: "Ring" }));
      L.push(k.photo(x, y, d, d, { shape: "circle", hint: c.hint }));
      box = { x: g.X(m, W - d - m * 3.2), y: m, w: W - d - m * 3.2, h: H - 2 * m };
      L.push(...k.column(parts(k, c, { x: box.x, ink, sub: st.sub, headMax: S * 0.15, bar: true }), box, "center").layers);
    } else {
      const d = W * 0.56, x = (W - d) / 2, y = m * 1.1;
      L.push(k.circle(x + d * 0.22 * (g.mir ? -1 : 1), y - d * 0.06, d * 0.98, st.dark ? mix(st.acc, st.bg, 0.6) : mix(st.acc2, st.bg, 0.55), { name: "Colour disc" }));
      L.push(k.circle(x - S * 0.02, y - S * 0.02, d + S * 0.04, "none", { stroke: st.acc, sw: Math.max(1.5, S * 0.005), name: "Ring" }));
      L.push(k.photo(x, y, d, d, { shape: "circle", hint: c.hint }));
      box = { x: m, y: y + d + m * 0.55, w: W - 2 * m, h: H - y - d - m * 1.4 };
      L.push(...k.column(parts(k, c, { x: box.x, ink, sub: st.sub, align: "center", headMax: S * 0.12, maxDetails: 2, subLines: 2 }), box, "center").layers);
    }
    if (c.price) L.push(...k.badge(c.price, g.X(m * 0.8, S * 0.2), m * 0.8, S * 0.2, { ring: true }));
    else if (c.deco) { const d = k.sticker(c.deco.id, g.X(W - m * 0.8 - S * 0.14, S * 0.14), m * 0.8, S * 0.14, { c1: st.acc, c2: st.acc2, c3: "#ffffff" }); if (d) L.push(d); }
    return { bg, layers: L };
  },
  /** Mega type: a strong colour page, the headline in huge tight capitals across the width, meta lines with hairlines. */
  mega(g) {
    const { k, c, W, H, S, m, st } = g;
    const bg = st.dark ? st.bg : st.acc === "#0a0a0a" || st.acc === st.bg ? st.deep : st.acc;
    const light = lum(bg) > 0.6, ink = light ? "#141414" : "#ffffff", sub = light ? "#3a3a3a" : mix("#ffffff", bg, 0.25), L = [];
    const top = m * 0.8, line = Math.max(1, S * 0.0025);
    const meta = c.details.find((s) => s.length <= 34);
    if (c.kicker) L.push(k.text(c.kicker, m, top, W * 0.5 - m - S * 0.02, { size: S * 0.022, bold: true, upper: true, ls: 0.14, color: ink, lines: 1, name: "Label" }));
    if (meta) L.push(k.text(meta, W * 0.5, top, W * 0.5 - m, { size: S * 0.022, color: ink, align: "right", lines: 1, name: "Meta" }));
    L.push(k.rect(m, top + S * 0.045, W - 2 * m, line, ink, { op: 0.45, name: "Hairline" }));
    const lw = g.land || g.wide;
    const ph = lw ? H * 0.3 : H * 0.24, pw = lw ? W * 0.3 : W * 0.42, py = H - m - ph;
    const head = k.text(c.head, m, top + S * 0.09, W - 2 * m, { size: S * 0.3, maxH: py - (top + S * 0.09) - S * 0.05, min: S * 0.07, bold: true, family: "sans", upper: c.head.length <= 40, color: ink, lh: 0.9, ls: -0.04, name: "Headline" });
    L.push(head);
    L.push(k.photo(g.X(W - m - pw, pw), py, pw, ph, { shape: "rounded", radius: S * 0.02, hint: c.hint }));
    const colW = W - 2 * m - pw - S * 0.05, cx = g.X(m, colW);
    const col = k.column([
      c.sub ? { gap: S * 0.03, drop: 2, build: (w) => { const t = k.text(c.sub, cx, 0, w, { size: S * 0.03, color: sub, lh: 1.35, maxH: S * 0.03 * 1.35 * 3, name: "Text" }); return { layers: [t], h: t.h }; } } : null,
      c.cta ? { gap: 0, drop: 1, build: (w) => k.pill(c.cta, cx, 0, { fill: ink, color: bg, maxW: w }) } : null,
    ], { x: cx, y: py, w: colW, h: ph }, "bottom");
    L.push(...col.layers);
    if (c.price) L.push(...k.badge(c.price, g.X(W - m - pw - S * 0.1, S * 0.2), py - S * 0.1, S * 0.2, { fill: ink, color: bg }));
    return { bg, layers: L };
  },
  /** Full-bleed photo, darker shade, a white inner border and centred text (elegant). */
  border(g) {
    const { k, c, W, H, S, m, st } = g;
    const L = [k.bleedPhoto({ hint: c.hint }), k.shade(-g.b, -g.b, W + 2 * g.b, H + 2 * g.b, st.deep, [0.3, 0.6, 0.78], 180)];
    const inset = m * 0.55;
    L.push(k.rect(inset, inset, W - 2 * inset, H - 2 * inset, "none", { stroke: "#ffffff", sw: Math.max(1.2, S * 0.004), name: "Border" }));
    const box = { x: m * 1.2, y: m * 1.3, w: W - m * 2.4, h: H - m * 2.6 };
    const ps = parts(k, c, { x: box.x, ink: "#ffffff", sub: "#eceef3", detailColor: "#eceef3", kickerColor: "#ffffff", align: "center", headMax: S * 0.14, headFamily: g.v % 2 ? "serif" : st.head, ctaFill: "#ffffff", ctaColor: st.deep });
    // a short rule under the headline
    const hi = ps.findIndex((p) => p.flex);
    ps.splice(hi + 1, 0, { gap: S * 0.03, build: () => ({ layers: [k.rect(W / 2 - S * 0.06, 0, S * 0.12, Math.max(2, S * 0.006), st.acc === "#0a0a0a" ? "#ffffff" : st.acc, { name: "Rule" })], h: Math.max(2, S * 0.006) }) });
    ps[hi].gap = S * 0.03;
    L.push(...k.column(ps, box, "center").layers);
    return { bg: st.deep, layers: L };
  },
};
/** Lightness 0..1 of a #rrggbb colour. */
function lum(c) { const v = parseInt(String(c).slice(1, 7), 16); return Number.isFinite(v) ? (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255 : 0.5; }
function K_poly(k, x, y, d, fill, o = {}) { return k.K.S("polygon", r1(x), r1(y), r1(d), r1(d), fill, { sides: 4, stroke: o.stroke, sw: o.sw, name: o.name || "Diamond" }); }
function archShape(k, x, y, w, h, fill) { return k.sticker("shape-arch", x, y, w, { c1: fill, name: "Arch", h }); }
export const PATTERN_IDS = Object.keys(PATTERNS);

/** Which compositions suit a size family and the amount of text. */
function candidates(fam, c) {
  const long = (c.head || "").length > 46 || (c.sub || "").length > 140;
  const base = fam === "invite" ? ["arch", "border", "card", "circle", "split", "polaroid", "bleed", "magazine", "grid", "diamond"]
    : ["bleed", "split", "diamond", "blob", "band", "glow", "arch", "card", "magazine", "poster", "grid", "polaroid", "circle", "mega", "border"];
  return long ? base.filter((p) => !["band", "poster", "blob", "glow", "mega"].includes(p)) : base;
}
/** Size family of a preset id: social / print / invite (null = not redesigned here). */
export function familyOf(presetId) {
  const p = String(presetId);
  if (/^(instagram|facebook|youtube|linkedin|x-post|pinterest|whatsapp|tiktok|twitter|snapchat)/.test(p)) return "social";
  if (/^(flyer|poster)/.test(p)) return "print";
  if (/^invitation/.test(p)) return "invite";
  if (/^brochure/.test(p)) return "brochure";
  return null;
}

/**
 * Brochures: the outside spread (page 1: flap, back, cover) is laid out again with the brochure's own words; the
 * inside (page 2) keeps its columns. Cover = the right-hand panel. Three treatments: photo cover with a deep shade,
 * colour-block cover with a photo base, light cover with an arch photo.
 */
function redesignBrochure(meta, pages, W, H, K, n, preset, b) {
  if (pages.length < 2) return null;
  const folds = (preset.guides || []).filter((g) => g.type === "fold").map((g) => g.at * W).sort((x, y) => x - y);
  if (!folds.length || folds.length > 2) return null;
  const edges = [0, ...folds, W], panels = edges.slice(0, -1).map((x, i) => ({ x, w: edges[i + 1] - x, texts: [] }));
  const texts = [...walk(pages[0].layers)].map(([l]) => l).filter((l) => l.type === "text" && !l.hidden && /[a-z0-9]/i.test(l.text.content));
  for (const t of texts) { const cx = t.x + t.w / 2; (panels.find((p) => cx >= p.x && cx < p.x + p.w) || panels[panels.length - 1]).texts.push(t); }
  const roles = (p) => { const s = p.texts.slice().sort((a, c) => c.text.size - a.text.size); const head = s[0]?.text.content; const rest = p.texts.filter((t) => t !== s[0]).sort((a, c) => a.y - c.y).map((t) => t.text.content); return { head, rest }; };
  const cover = roles(panels[panels.length - 1]), back = panels.length > 1 ? roles(panels[panels.length - 2]) : { rest: [] }, flap = panels.length > 2 ? roles(panels[0]) : null;
  if (!cover.head) return null;
  const topic = `${meta.title} ${meta.tags.join(" ")}`;
  const st = styleFor(meta.id, topic), k = kit(K, W, H, st, photoPicker(topic, meta.id), b);
  const hint = meta.title.replace(/\b(brochure|tri-?fold|bi-?fold)\b/gi, " ").trim(), v = n % 3, L = [];
  const cp = panels[panels.length - 1], bp = panels.length > 1 ? panels[panels.length - 2] : null, fp = panels.length > 2 ? panels[0] : null;
  const S = Math.min(cp.w, H), pad = cp.w * 0.12;
  const coverText = (x, y, w, h, ink, sub, anchor, align = "left") => k.column([
    cover.rest[1] ? { gap: S * 0.03, drop: 1, build: (ww) => k.kicker(cover.rest[1].split("\n")[0], x, 0, ww, { color: ink === "#ffffff" ? "#ffffff" : st.acc, size: S * 0.04, align, bar: align === "left" }) } : null,
    { flex: true, gap: S * 0.035, build: (ww, maxH) => { const t = k.text(cover.head, x, 0, ww, { size: S * 0.16, maxH: Math.min(maxH, h * 0.6), min: S * 0.06, bold: true, family: st.head, color: ink, lh: 1, ls: -0.02, align, name: "Headline" }); return { layers: [t], h: t.h }; } },
    cover.rest[0] ? { gap: 0, drop: 2, build: (ww) => { const t = k.text(cover.rest[0], x, 0, ww, { size: S * 0.055, color: sub, lh: 1.35, maxH: S * 0.055 * 1.35 * 3, align, name: "Text" }); return { layers: [t], h: t.h }; } } : null,
  ], { x, y, w, h }, anchor);
  // Cover panel.
  if (v === 0) {
    L.push(k.photo(cp.x, -b, cp.w + b, H + 2 * b, { hint }), k.shade(cp.x, H * 0.3, cp.w + b, H * 0.7 + b, st.deep, [0, 0.6, 0.92]));
    L.push(...coverText(cp.x + pad, H * 0.4, cp.w - 2 * pad, H * 0.52, "#ffffff", "#eceef3", "bottom").layers);
  } else if (v === 1) {
    const top = H * 0.6;
    L.push(k.rect(cp.x, -b, cp.w + b, top + b, st.acc === "#0a0a0a" ? st.deep : st.acc, { name: "Cover block" }), k.photo(cp.x, top, cp.w + b, H - top + b, { hint }));
    L.push(...coverText(cp.x + pad, pad, cp.w - 2 * pad, top - pad * 1.6, st.onAcc === "#121212" ? "#121212" : "#ffffff", st.onAcc === "#121212" ? "#2a2a2a" : "#f3f4f8", "bottom").layers);
  } else {
    L.push(k.rect(cp.x, -b, cp.w + b, H + 2 * b, st.dark ? "#f5efe6" : st.bg, { name: "Cover panel" }));
    const aw = cp.w * 0.7, ah = H * 0.48;
    L.push(k.sticker("shape-arch", cp.x + (cp.w - aw) / 2 + S * 0.03, pad * 0.9 + S * 0.03, aw, { c1: st.acc2 === "#ffffff" ? st.acc : st.acc2, h: ah, name: "Arch" }));
    L.push(k.photo(cp.x + (cp.w - aw) / 2, pad * 0.9, aw, ah, { shape: "arch", hint }));
    L.push(...coverText(cp.x + pad, pad * 0.9 + ah + pad * 0.6, cp.w - 2 * pad, H - ah - pad * 2.6, st.dark ? "#2b1d16" : st.ink, st.dark ? "#6e5a4d" : st.sub, "center", "center").layers);
  }
  // Back panel: heading and contact lines with icons on a deep colour (or light on the colour-block treatment).
  if (bp) {
    const dark = v !== 1, x = bp.x + bp.w * 0.12, w = bp.w * 0.76, ink = dark ? "#ffffff" : st.dark ? "#2b1d16" : st.ink, sub = dark ? "#dfe3ea" : st.dark ? "#6e5a4d" : st.sub;
    L.unshift(k.rect(bp.x, -b, bp.w, H + 2 * b, dark ? st.deep : st.dark ? "#f5efe6" : st.bg, { name: "Back panel" }));
    const lines = back.rest.flatMap((s) => s.split("\n")).filter(Boolean).slice(0, 5);
    const ph = H * 0.3;
    L.push(k.photo(x, H - bp.w * 0.12 - ph, w, ph, { shape: "rounded", radius: S * 0.04, hint }));
    L.push(...k.column([
      back.head ? { flex: true, gap: S * 0.05, build: (ww, maxH) => { const t = k.text(back.head, x, 0, ww, { size: S * 0.09, maxH: Math.min(maxH, H * 0.2), min: S * 0.05, bold: true, family: st.head, color: ink, name: "Heading" }); return { layers: [t], h: t.h }; } } : null,
      ...lines.map((s, i) => ({ gap: S * 0.025, drop: 3 + i / 10, build: (ww) => k.details([s], x, 0, ww, { color: sub, icon: dark ? "#ffffff" : st.acc, size: S * 0.045 }) })),
    ], { x, y: bp.w * 0.12, w, h: H - ph - bp.w * 0.3 }, "top").layers);
  }
  // Flap panel: photo on top, heading and text under it.
  if (fp && flap?.head) {
    const x = fp.x + fp.w * 0.12, w = fp.w * 0.76, ph = H * 0.42, round = v === 2;
    L.unshift(k.rect(-b, -b, fp.w + b, H + 2 * b, st.dark ? "#f5efe6" : v === 1 ? mix(st.bg, "#ffffff", 0.4) : st.bg, { name: "Flap panel" }));
    if (round) { const d = Math.min(w, ph); L.push(k.photo(fp.x + (fp.w - d) / 2, fp.w * 0.12, d, d, { shape: "circle", hint })); }
    else L.push(k.photo(-b, -b, fp.w + b, ph + b, { hint }));
    const top = (round ? fp.w * 0.12 + Math.min(w, ph) : ph) + fp.w * 0.1;
    const body = flap.rest.join("\n");
    L.push(...k.column([
      { flex: true, gap: S * 0.04, build: (ww, maxH) => { const t = k.text(flap.head, x, 0, ww, { size: S * 0.085, maxH: Math.min(maxH, H * 0.18), min: S * 0.05, bold: true, family: st.head, color: st.dark ? "#2b1d16" : st.ink, name: "Heading" }); return { layers: [t], h: t.h }; } },
      body ? { gap: 0, drop: 2, build: (ww) => { const t = k.text(body, x, 0, ww, { size: S * 0.045, color: st.dark ? "#6e5a4d" : st.sub, lh: 1.45, maxH: H - top - fp.w * 0.1 - S * 0.2, min: 9, name: "Text" }); return { layers: [t], h: t.h }; } } : null,
    ], { x, y: top, w, h: H - top - fp.w * 0.1 }, "top").layers);
  }
  const out = K.page(st.dark ? "#f5efe6" : st.bg, L);
  if (pages[0].notes) out.notes = pages[0].notes;
  return { pages: [out, ...pages.slice(1)], look: `brochure.${["photo", "block", "arch"][v]}.${panels.length}`, pattern: "brochure-" + ["photo", "block", "arch"][v], style: st.key };
}

/**
 * Redesigns a single-page template. meta = { id, title, tags, presetId }, pages = its own pages (for the words),
 * K = templates.js helpers, n = its position among the templates of its family (spreads the compositions).
 * Returns { pages, look } or null (kept as designed).
 */
export function redesign(meta, pages, W, H, K, n, preset, b = 0) {
  const fam = familyOf(meta.presetId);
  if (fam === "brochure") return redesignBrochure(meta, pages, W, H, K, n, preset, b);
  if (!fam || pages.length !== 1) return null;
  const c = extract(pages[0]);
  if (!c || !c.head) return null;
  const topic = `${meta.title} ${meta.tags.join(" ")}`;
  c.hint = meta.title.replace(/\b(post|story|flyer|poster|invitation|thumbnail|cover|banner|pin|status|card|template)\b/gi, " ").trim();
  // Social posts, stories, covers and thumbnails: where Canva's templates show people, the photos show that kind of
  // person (templates-people.js; second / third photo: a person or the template's subject). The others show their
  // subject, also in a photo grid's third cell.
  // (posters and invitations register their own person spots: templates-faces.js PRO_PRINT_PEOPLE)
  const pp = personHints(meta.id);
  if (pp) {
    const base = c.hint;
    c.hint = pp.main || base;
    c.hint2 = "second" in pp ? pp.second || base + " detail" : c.hint;
    c.hint3 = "third" in pp ? pp.third || base + " scene" : c.hint;
  } else if (fam === "social") c.hint3 = c.hint + " scene";
  const list = candidates(fam, c);
  const pi = n % list.length, v = Math.floor(n / list.length);
  const pat = list[pi];
  const st = styleFor(meta.id, topic);
  const S = Math.min(W, H), a = W / H;
  const g = { c, W, H, S, b, st, v, mir: v % 2 === 1, land: a > 1.25 && a <= 2.2, wide: a > 2.2, tall: a < 0.62, m: r1(S * (fam === "invite" ? 0.08 : 0.07)) };
  g.X = (x, w) => (g.mir ? W - x - w : x);
  g.k = kit(K, W, H, st, pp ? pickerFor(topic, meta.id) : photoPicker(topic, meta.id), b);
  g.k.boost = fam === "social" && g.land ? 1.3 : g.tall ? 1.18 : 1;
  const out = PATTERNS[pat](g);
  const page = K.page(out.bg, out.layers);
  if (pages[0].notes) page.notes = pages[0].notes;
  return { pages: [page], look: `${fam}.${pat}.${g.mir ? "m" : ""}${g.land ? "l" : g.wide ? "w" : g.tall ? "t" : "s"}`, pattern: pat, style: st.key };
}
