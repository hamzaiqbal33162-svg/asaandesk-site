// Canvas renderer (browser): PNG/JPG export, animation frames (WebM/GIF), present mode, mockups and thumbnails.
// Uses the same text layout and vector primitives as the SVG renderer and the PDF export.
import { layoutText, cssFont, underlineMetrics, strikeMetrics, CSS_FAMILY, setFallbackMeasure } from "./textlayout.js";
import { textPaint, curveLayout, curveOffset, gradientOk, hasGradient } from "./textfx.js";
import { shapePrims, elementPrims, rectPath, framePath, gradientLine, cssFilter } from "./shapes.js";
import { revealRuns } from "./svg.js";
import { animState, pageDuration, withClicks } from "./animate.js";
import { presetPx } from "./presets.js";
import { ensureFont } from "../shared/brand.js";

/* ---------- letters the open fonts do not have (Urdu, Hindi …): measure with the browser ---------- */
let measureCtx = null;
setFallbackMeasure((ch, family, bold, italic) => {
  try {
    measureCtx ||= document.createElement("canvas").getContext("2d");
    measureCtx.font = cssFont({ family, bold, italic }, 100);
    return measureCtx.measureText(ch).width / 100;
  } catch { return 0.55; }
});

/* ---------- images and fonts ---------- */
const imgCache = new Map();
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => res(im);
      im.onerror = () => { imgCache.delete(src); res(null); };
      im.src = src;
    }));
  }
  return imgCache.get(src);
}
export function imageSources(design, pages = null) {
  const out = new Set();
  const walk = (ls) => { for (const l of ls) { if (l.type === "image") out.add(l.image.src); if (l.type === "frame" && l.frame.image?.src) out.add(l.frame.image.src); if (l.type === "group") walk(l.children); } };
  design.pages.forEach((p, i) => { if (pages && !pages.includes(i)) return; if (p.background?.image) out.add(p.background.image); walk(p.layers); });
  return [...out];
}
export async function loadImages(design, pages = null) {
  const map = new Map();
  await Promise.all(imageSources(design, pages).map(async (s) => map.set(s, await loadImage(s))));
  return map;
}
/** Loads every font face a design uses (so canvas text matches the screen and the PDF). */
export async function ensureFonts(design) {
  const want = new Set(["sans|0|0", "sans|1|0"]);
  const walk = (ls) => { for (const l of ls) { if (l.type === "text") want.add(`${l.text.family}|${+!!l.text.bold}|${+!!l.text.italic}`); if (l.type === "element") for (const p of l.element.parts) if (p.t != null) want.add(`${p.font || "sans"}|${+!!p.bold}|${+!!p.italic}`); if (l.type === "group") walk(l.children); } };
  for (const p of design.pages) walk(p.layers);
  await Promise.all([...want].map((k) => { const [f, b, i] = k.split("|"); return ensureFont(f, b === "1", i === "1"); }));
  try { await document.fonts.ready; } catch {}
}

/* ---------- drawing ---------- */
const hasLetterSpacing = typeof CanvasRenderingContext2D !== "undefined" && "letterSpacing" in CanvasRenderingContext2D.prototype;
const hasFilter = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;
const pathCache = new Map();
const P2D = (d) => { let p = pathCache.get(d); if (!p) { p = new Path2D(d); if (pathCache.size > 4000) pathCache.clear(); pathCache.set(d, p); } return p; };
const scaleOf = (ctx) => { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };

function fillTextSpaced(ctx, text, x, y, ls, stroke = false) {
  if (!ls || hasLetterSpacing) { stroke ? ctx.strokeText(text, x, y) : ctx.fillText(text, x, y); return; }
  for (const ch of text) { stroke ? ctx.strokeText(ch, x, y) : ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + ls; }
}

export function drawPrims(ctx, prims, sx = 1, sy = sx) {
  for (const p of prims) {
    ctx.save();
    if (p.op != null && p.op < 1) ctx.globalAlpha *= p.op;
    if (p.t !== undefined) {
      ctx.scale(sx, sy);
      ctx.font = cssFont({ family: p.font, bold: p.bold, italic: p.italic }, p.size);
      ctx.fillStyle = p.fill || "#000000";
      ctx.textAlign = p.anchor === "middle" || p.anchor === "center" ? "center" : p.anchor === "end" || p.anchor === "right" ? "right" : "left";
      ctx.textBaseline = "alphabetic";
      if (hasLetterSpacing) ctx.letterSpacing = (p.ls || 0) + "px";
      ctx.fillText(String(p.t), p.x, p.y);
    } else {
      ctx.scale(sx, sy);
      const path = P2D(p.d);
      if (p.fill && p.fill !== "none") { ctx.fillStyle = p.fill; ctx.fill(path); }
      if (p.stroke && p.stroke !== "none") { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.sw ?? 1; ctx.lineCap = p.cap || "round"; ctx.lineJoin = p.join || "round"; if (p.dash) ctx.setLineDash(p.dash); ctx.stroke(path); }
    }
    ctx.restore();
  }
}

function drawText(ctx, l, env) {
  const t = l.text, L = layoutText(t, l.w);
  const lines = revealRuns(L.lines, env.reveal);
  if (t.bg && t.bg.color && t.bg.color !== "none") {
    ctx.save(); if (t.bg.opacity != null) ctx.globalAlpha *= t.bg.opacity;
    ctx.fillStyle = t.bg.color; ctx.fill(P2D(rectPath(0, 0, l.w, l.h, (t.bg.radius ?? 0.25) * t.size))); ctx.restore();
  }
  ctx.save();
  ctx.font = cssFont(t);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  try { ctx.fontKerning = "none"; } catch {}
  if (hasLetterSpacing) ctx.letterSpacing = (t.letterSpacing || 0) + "px";
  const sh = t.shadow && (t.shadow.x || t.shadow.y || t.shadow.blur) ? t.shadow : null;
  const setShadow = (on) => {
    if (!on || !sh) { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; return; }
    const m = ctx.getTransform(), k = scaleOf(ctx);
    const a = Math.round((sh.opacity ?? 0.5) * 255).toString(16).padStart(2, "0");
    ctx.shadowColor = (sh.color || "#000000").slice(0, 7) + a;
    ctx.shadowOffsetX = m.a * (sh.x || 0) + m.c * (sh.y || 0);
    ctx.shadowOffsetY = m.b * (sh.x || 0) + m.d * (sh.y || 0);
    ctx.shadowBlur = (sh.blur || 0) * k;
  };
  // Curved text: each letter at its place on the arc; straight text: the laid-out runs.
  const cl = curveLayout(t);
  let glyphs = null;
  if (cl) {
    const [ox, oy] = curveOffset(cl, l.w, l.h);
    const shown = env.reveal == null || env.reveal >= 1 ? cl.glyphs.length : Math.floor(cl.glyphs.length * Math.max(0, env.reveal));
    glyphs = cl.glyphs.slice(0, shown).map((g) => ({ ...g, x: g.x + ox, y: g.y + oy }));
  }
  const each = (fn) => {
    if (glyphs) { for (const g of glyphs) if (g.ch.trim()) fn(g, null); return; }
    for (const ln of lines) for (const r of ln.runs) if (r.t) fn(r, ln);
  };
  const put = (r, ln, stroke) => {
    if (!ln) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate((r.rot * Math.PI) / 180); ctx.textAlign = "center"; stroke ? ctx.strokeText(r.ch, 0, 0) : ctx.fillText(r.ch, 0, 0); ctx.restore(); return; }
    fillTextSpaced(ctx, r.t, r.x, ln.baseline, t.letterSpacing, stroke);
  };
  const bars = (color) => {
    if (glyphs || !(t.underline || t.strike)) return;
    const um = underlineMetrics(t.size), sm = strikeMetrics(t.size);
    ctx.fillStyle = color;
    for (const ln of lines) {
      const shown = ln.runs.filter((r) => r.t);
      if (!shown.length || !ln.text.trim()) continue;
      const x0 = shown[0].x, x1 = shown.length === ln.runs.length ? ln.x + ln.width : shown[shown.length - 1].x + shown[shown.length - 1].w;
      if (t.underline) ctx.fillRect(x0, ln.baseline + um.offset - um.thickness / 2, x1 - x0, um.thickness);
      if (t.strike) ctx.fillRect(x0, ln.baseline - sm.offset - sm.thickness / 2, x1 - x0, sm.thickness);
    }
  };
  // One paint of all the letters: fill (colour, gradient or none) and an optional stroke.
  // main: the drop shadow (t.shadow) falls from the outline when there is one, else from the letters.
  const paintAll = (fill, stroke, main = false) => {
    if (main) setShadow(true);
    if (stroke) {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.lineJoin = "round"; ctx.miterLimit = 2;
      each((r, ln) => put(r, ln, true));
      if (main) setShadow(false);
    }
    if (fill) { ctx.fillStyle = fill; each((r, ln) => put(r, ln, false)); }
    bars(typeof fill === "string" ? fill : stroke?.color || t.color);
    if (main) setShadow(false);
  };
  const paint = textPaint(t);
  // Effect passes under the text (offset copies; blurred ones are drawn far away and brought back as a shadow,
  // which blurs in every browser).
  for (const p of paint.passes) {
    ctx.save();
    ctx.globalAlpha *= p.opacity;
    if (p.blur > 0) {
      const FAR = 10000, m = ctx.getTransform(), k = scaleOf(ctx);
      ctx.shadowColor = p.fill || p.stroke?.color || t.color; ctx.shadowBlur = p.blur * k;
      ctx.shadowOffsetX = m.a * (FAR + p.dx) + m.c * p.dy; ctx.shadowOffsetY = m.b * (FAR + p.dx) + m.d * p.dy;
      ctx.translate(-FAR, 0);
    } else ctx.translate(p.dx, p.dy);
    paintAll(p.fill, p.stroke);
    ctx.restore();
  }
  let fill = paint.main.fill;
  if (fill && gradientOk(t)) {
    const g = gradientLine(t.gradient.angle ?? 90, l.w, l.h), lg = ctx.createLinearGradient(g.x1, g.y1, g.x2, g.y2);
    t.gradient.stops.forEach((c, i, a) => lg.addColorStop(i / Math.max(1, a.length - 1), c));
    fill = lg;
  }
  paintAll(fill, paint.main.stroke, true);
  ctx.restore();
}

function drawCropped(ctx, img, crop, w, h) {
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
  ctx.drawImage(img, c.x * nw, c.y * nh, Math.max(1, c.w * nw), Math.max(1, c.h * nh), 0, 0, w, h);
}

function drawImageLayer(ctx, l, env) {
  const im = l.image, img = env.images?.get(im.src);
  ctx.save();
  ctx.clip(P2D(rectPath(0, 0, l.w, l.h, im.radius || 0)));
  if (im.flipX || im.flipY) { ctx.translate(im.flipX ? l.w : 0, im.flipY ? l.h : 0); ctx.scale(im.flipX ? -1 : 1, im.flipY ? -1 : 1); }
  if (img) {
    if (hasFilter) { const k = scaleOf(ctx); ctx.filter = cssFilter({ ...im.filters, blur: (im.filters?.blur || 0) * k }); }
    drawCropped(ctx, img, im.crop, l.w, l.h);
  } else { ctx.fillStyle = "#ecebfb"; ctx.fillRect(0, 0, l.w, l.h); }
  ctx.restore();
  // Border (Canva: border colour and weight on photos), inside the photo's edge.
  if (im.border && im.border.width > 0) { const p = P2D(rectPath(0, 0, l.w, l.h, im.radius || 0)); ctx.save(); ctx.clip(p); ctx.strokeStyle = im.border.color || "#ffffff"; ctx.lineWidth = im.border.width * 2; ctx.stroke(p); ctx.restore(); }
}

function drawFrame(ctx, l, env) {
  const f = l.frame;
  ctx.save();
  const path = P2D(framePath(f.shape, l.w, l.h, f.radius, f));
  ctx.clip(path);
  const img = f.image?.src ? env.images?.get(f.image.src) : null;
  if (img) drawCropped(ctx, img, f.image.crop, l.w, l.h);
  else { ctx.fillStyle = "#ecebfb"; ctx.fillRect(0, 0, l.w, l.h); }
  ctx.restore();
  if (f.border && f.border.width > 0) { ctx.save(); ctx.clip(path); ctx.strokeStyle = f.border.color; ctx.lineWidth = f.border.width * 2; ctx.stroke(path); ctx.restore(); }
}

export function drawLayer(ctx, l, env) {
  if (l.hidden) return;
  // Element timing (Canva "Show element timing"): only on screen between its start and end second.
  if (env.time != null && l.timing && (env.time < (+l.timing.start || 0) || (l.timing.end != null && env.time > +l.timing.end))) return;
  const st = env.time != null ? animState(l.animation, env.time, env.size, env.end) : null;
  if (st && st.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha *= (l.opacity ?? 1) * (st ? st.opacity : 1);
  ctx.translate(l.x + l.w / 2 + (st?.dx || 0), l.y + l.h / 2 + (st?.dy || 0));
  if (l.rotation) ctx.rotate((l.rotation * Math.PI) / 180);
  if (st && st.scale !== 1) ctx.scale(st.scale, st.scale);
  ctx.translate(-l.w / 2, -l.h / 2);
  if (st && st.clip < 1) { ctx.beginPath(); ctx.rect(-l.w, -l.h, l.w * (1 + st.clip), l.h * 3); ctx.clip(); }
  const sub = { ...env, reveal: st ? st.reveal : null };
  switch (l.type) {
    case "text": drawText(ctx, l, sub); break;
    case "shape": {
      let pr = shapePrims(l.shape, l.w, l.h);
      if (hasGradient(l.shape.gradient)) { const g = gradientLine(l.shape.gradient.angle ?? 90, l.w, l.h), lg = ctx.createLinearGradient(g.x1, g.y1, g.x2, g.y2); l.shape.gradient.stops.forEach((c, i, a) => lg.addColorStop(i / Math.max(1, a.length - 1), c)); pr = pr.map((p) => (p.fill && p.fill !== "none" ? { ...p, fill: lg } : p)); }
      drawPrims(ctx, pr); break;
    }
    case "element": {
      const e = l.element;
      if (e.flipX || e.flipY) { ctx.translate(e.flipX ? l.w : 0, e.flipY ? l.h : 0); ctx.scale(e.flipX ? -1 : 1, e.flipY ? -1 : 1); }
      drawPrims(ctx, elementPrims(e), l.w / e.vb[0], l.h / e.vb[1]); break;
    }
    case "chart": { const pr = env.chartPrims?.(l.chart.spec, l.w, l.h); if (pr) drawPrims(ctx, pr); break; }
    case "table": { const pr = env.tablePrims?.(l.table, l.w); if (pr) drawPrims(ctx, pr); break; }
    case "image": drawImageLayer(ctx, l, env); break;
    case "frame": drawFrame(ctx, l, env); break;
    case "group": for (const c of l.children) drawLayer(ctx, c, { ...env, time: null }); break;
    default: break;
  }
  ctx.restore();
}

export function drawBackground(ctx, bg, W, H, b, env) {
  const x = -b, y = -b, w = W + 2 * b, h = H + 2 * b;
  if (bg?.gradient) {
    const g = gradientLine(bg.gradient.angle ?? 135, w, h);
    const grad = ctx.createLinearGradient(x + g.x1, y + g.y1, x + g.x2, y + g.y2);
    const stops = bg.gradient.stops || ["#ffffff", "#000000"];
    stops.forEach((c, i) => grad.addColorStop(i / Math.max(1, stops.length - 1), c));
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    return;
  }
  if (bg?.color && bg.color !== "none") { ctx.fillStyle = bg.color; ctx.fillRect(x, y, w, h); }
  if (bg?.image) {
    const img = env.images?.get(bg.image);
    if (!img) return;
    const s = bg.fit === "contain" ? Math.min(w / img.naturalWidth, h / img.naturalHeight) : Math.max(w / img.naturalWidth, h / img.naturalHeight);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + (w - img.naturalWidth * s) / 2, y + (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    ctx.restore();
  }
}

/**
 * Draws page `index` of a design on ctx (already sized). opts: { scale, bleed (px of bleed to include),
 * images (Map), time (s, for animations), chartPrims, tablePrims, background: false to skip it }.
 */
export function drawPage(ctx, design, index, opts = {}) {
  // With a time (videos, GIFs, Present), "appear on click" items play in their build order (opts.reveal: the
  // times they were revealed in Present; none = one after another).
  const pg = opts.time != null ? withClicks(design.pages[index], opts.reveal || null) : design.pages[index];
  const { w: W, h: H } = presetPx(design.preset);
  const b = opts.bleed || 0, k = opts.scale || 1;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(b, b);
  if (opts.background !== false) drawBackground(ctx, pg.background, W, H, b, opts);
  const env = { ...opts, size: { w: W, h: H }, end: opts.time != null && pg.layers.some((l) => l.animation?.exit) ? pageDuration(pg) : null };
  for (const l of pg.layers) drawLayer(ctx, l, env);
  ctx.restore();
}

/** Renders a page into a new canvas. opts as drawPage plus { width } (fit to this many px wide). */
export async function renderPage(design, index, opts = {}) {
  const { w: W, h: H } = presetPx(design.preset);
  const b = opts.bleed || 0;
  const k = opts.width ? opts.width / (W + 2 * b) : opts.scale || 1;
  const cw = Math.max(1, Math.round((W + 2 * b) * k)), ch = Math.max(1, Math.round((H + 2 * b) * k));
  if (cw * ch > 268e6 || cw > 32000 || ch > 32000) throw new Error("This size is too big for the browser. Choose a smaller size or dpi.");
  const images = opts.images || (await loadImages(design, [index]));
  await ensureFonts(design);
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d");
  if (opts.fill) { ctx.fillStyle = opts.fill; ctx.fillRect(0, 0, cw, ch); }
  drawPage(ctx, design, index, { ...opts, scale: k, images });
  return c;
}
export const canvasBlob = (c, type = "image/png", q = 0.92) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("The image could not be made."))), type, q));
export { CSS_FAMILY };
