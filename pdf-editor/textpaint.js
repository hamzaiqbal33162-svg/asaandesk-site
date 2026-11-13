// Paints edited text on a canvas exactly the way pdf.js paints the page's own text, so new letters have the same
// weight and darkness as the old letters next to them.
//
// Why: pdf.js (4.4) draws every glyph of an embedded font with the browser's TEXT rasteriser (ctx.fillText with the
// font program it loaded as a FontFace). Filled vector outlines (the SVG paths the editor used before) go through the
// PATH rasteriser instead: no text gamma/contrast boost, no hinting, no macOS font smoothing. The same glyph outline
// therefore came out lighter or heavier than the untouched text beside it, depending on the screen and system.
// Here every glyph goes through the same call pdf.js makes: same font face (pdf.js's own, or the look-alike font
// loaded the way pdf.js loads an embedded font), same font string and size clamp (16..100 px plus a scale), same
// advances, character/word spacing, horizontal scale, fill/stroke render mode, stroke width and join.

/** The font string pdf.js puts on the canvas for a font object (CanvasGraphics.setFont). */
export function jsFontFamily(jf) {
  return jf.systemFontInfo?.css || `"${jf.loadedName}", ${jf.fallbackName || "sans-serif"}`;
}
export const browserFontSize = (size) => (size < 16 ? 16 : size > 100 ? 100 : size);

/**
 * A pdf.js font object can be painted like pdf.js does when pdf.js itself draws it with fillText: a loaded font
 * face (not Type3, not vertical, not one pdf.js had to draw as outlines because the face failed to load) whose
 * code -> character map was kept (getDocument fontExtraProperties).
 */
export function jsFontUsable(jf) {
  return !!(jf && jf.loadedName && jf.toFontChar && !jf.isType3Font && !jf.vertical && !jf.isInvalidPDFjsFont && !jf.disableFontFace);
}

/**
 * Glyphs of `text` in the document's own font: the character pdf.js draws for each code (toFontChar, its re-mapped
 * code in the font it loaded), the PDF advance width (1/1000 em) and whether pdf.js draws it at all.
 * font: the editor's font entry (uniToCode, info.width, bytes); jf: the pdf.js font object.
 */
export function docGlyphs(font, jf, text) {
  const out = [];
  for (const ch of text) {
    const code = font.uniToCode.get(ch);
    if (code === undefined) return null;
    const fc = jf.toFontChar?.[code];
    const known = fc !== undefined && fc !== null;
    out.push({
      ch: String.fromCodePoint(known ? fc : code),
      width: font.info?.known ? font.info.width(code) : (jf.widths?.[code] ?? 500),
      space: font.bytes === 1 && code === 32,
      draw: !/\s/.test(ch) && (known || !!jf.missingFile),
    });
  }
  return out;
}

/** Glyphs of `text` in an open font program (fontkit): unicode characters with the font's own advance widths. */
export function openGlyphs(fk, text) {
  const upm = fk.unitsPerEm || 1000;
  return [...text].map((ch) => ({ ch, width: ((fk.glyphForCodePoint(ch.codePointAt(0))?.advanceWidth ?? upm / 2) / upm) * 1000, space: false, draw: !/\s/.test(ch) }));
}

/** Width of glyphs at `size` with spacing, before the horizontal scale (same units as size). */
export function glyphsAdvance(glyphs, size, charSpacing = 0, wordSpacing = 0) {
  return glyphs.reduce((w, g) => w + (g.width * size) / 1000 + charSpacing + (g.space ? wordSpacing : 0), 0);
}

const FILLS = new Set([0, 2, 4, 6]), STROKES = new Set([1, 2, 5, 6]);
const JOINS = ["miter", "round", "bevel"];
/**
 * pdf.js CanvasGraphics.showText for one run, in the canvas's current coordinates (y down, baseline at y):
 *   family/bold/italic: font face; size: font size; hScale/charSpacing/wordSpacing: as in the PDF (spacing in the
 *   same units as size, before the horizontal scale); render: PDF text render mode; stroke: [r,g,b]; lineWidth in the
 *   same units as size (0 = one device pixel, onePx); join: PDF line join 0/1/2; remeasure: pdf.js's width fix for
 *   substituted system fonts. Returns the advance (after the horizontal scale).
 */
export function paintGlyphs(ctx, { family, bold = "normal", italic = false, glyphs, x, y, size, hScale = 1, charSpacing = 0, wordSpacing = 0, color = [0, 0, 0], render = 0, stroke = null, lineWidth = 0, join = 0, alpha = 1, remeasure = false, onePx = 1 }) {
  const bfs = browserFontSize(size), fss = size / bfs;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(hScale, 1);
  if (fss !== 1) ctx.scale(fss, fss);
  ctx.font = `${italic ? "italic" : "normal"} ${bold} ${bfs}px ${family}`;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color.join(",")})`;
  const fills = FILLS.has(render), strokes = STROKES.has(render);
  if (strokes) {
    ctx.strokeStyle = `rgb(${(stroke || color).join(",")})`;
    ctx.lineWidth = (lineWidth > 0 ? lineWidth : onePx) / fss;
    ctx.lineJoin = JOINS[join] || "miter";
  }
  let px = 0;
  for (const g of glyphs) {
    let sx = px / fss, restore = false;
    if (remeasure && g.width > 0 && g.draw) {
      const measured = (ctx.measureText(g.ch).width * 1000) / bfs;
      if (g.width < measured) { restore = true; ctx.save(); ctx.scale(g.width / measured, 1); sx /= g.width / measured; }
      else if (g.width !== measured) sx += ((g.width - measured) / 2000) * bfs;
    }
    if (g.draw) {
      if (fills) ctx.fillText(g.ch, sx, 0);
      if (strokes) ctx.strokeText(g.ch, sx, 0);
    }
    if (restore) ctx.restore();
    px += (g.width * size) / 1000 + charSpacing + (g.space ? wordSpacing : 0);
  }
  ctx.restore();
  return px * hScale;
}

/**
 * Extra weight for look-alike letters ("smear"): the glyph outlines united with copies of themselves shifted by
 * +-smear/2 horizontally and vertically, filled ONCE (so every stem gets about `smear` thicker), and stroked once with
 * the original letters' own outline when they had one. One fill keeps the anti-aliased edge as it is; separate
 * copies stacked their soft edges (+31% ink measured). A hairline outline stroke (render mode 2) instead was widened
 * to a whole pixel by viewers that snap strokes (poppler/pdftoppm +16% vs pdf.js +2%). The saved PDF holds the same
 * path (fontmatch.js smearOps) with the text itself invisible on top (copy/search). Pen positions as
 * paintGlyphs/openGlyphs (size, horizontal scale, character spacing; y down, baseline at y).
 */
export const SMEAR = [[0, 0], [-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]];
const pathCache = new WeakMap();
function glyphPath2D(fk, ch) {
  let m = pathCache.get(fk);
  if (!m) pathCache.set(fk, (m = new Map()));
  if (!m.has(ch)) {
    let p = null;
    try { const d = fk.glyphForCodePoint(ch.codePointAt(0))?.path?.toSVG(); if (d && typeof Path2D === "function") p = new Path2D(d); } catch { p = null; }
    m.set(ch, p);
  }
  return m.get(ch);
}
const JOIN_NAMES = ["miter", "round", "bevel"];
export function paintUnion(ctx, { fk, text, x, y, size, hScale = 1, charSpacing = 0, color = [0, 0, 0], smear, alpha = 1, stroke = null, lineWidth = 0, join = 0 }) {
  const upm = fk.unitsPerEm || 1000, all = new Path2D();
  for (const [ux, uy] of SMEAR) {
    let pen = 0;
    for (const ch of text) {
      const adv = ((fk.glyphForCodePoint(ch.codePointAt(0))?.advanceWidth ?? upm / 2) / upm) * size;
      const p = /\s/.test(ch) ? null : glyphPath2D(fk, ch);
      if (p) all.addPath(p, new DOMMatrix([(size / upm) * hScale, 0, 0, -size / upm, x + pen * hScale + ux * smear, y + uy * smear]));
      pen += adv + charSpacing;
    }
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color.join(",")})`;
  ctx.fill(all);
  if (lineWidth > 0) {
    ctx.strokeStyle = `rgb(${(stroke || color).join(",")})`;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = JOIN_NAMES[join] || "miter";
    ctx.stroke(all);
  }
  ctx.restore();
}

/**
 * Ink of a picture (ImageData-like {width, height, data}): per pixel coverage c = how far it is from the paper
 * colour towards the ink colour (0..1). Returns the ink mass sum(c), the mean stroke width 2*sum(c)/sum(|grad c|)
 * (pixels; area / half the outline length) and the darkness sum(c^2)/sum(c) (1 = solid ink).
 */
export function inkMetrics(img, paper = [255, 255, 255], ink = [0, 0, 0]) {
  const { width: W, height: H, data: d } = img;
  const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  const lp = L(...paper), li = L(...ink), span = Math.abs(lp - li) > 8 ? lp - li : 255;
  const c = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) c[i] = Math.max(0, Math.min(1, (lp - L(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])) / span));
  let M = 0, M2 = 0, P = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, v = c[i];
    M += v; M2 += v * v;
    if (x + 1 < W && y + 1 < H) P += Math.hypot(c[i + 1] - v, c[i + W] - v);
  }
  return { mass: M, w: P ? (2 * M) / P : 0, dark: M ? M2 / M : 0 };
}

/**
 * Picks the weight of the look-alike font by measured pixels, not by font name.
 * target: inkMetrics of the original text as rendered; cands: [{ weight, m: inkMetrics of the look-alike drawn the
 * same way, same text, same size, same pixel grid }]. Returns the heaviest candidate that is not heavier than the
 * original (or the lightest one) and the extra stroke width (pixels of that picture) that makes up the difference.
 */
export function pickWeight(target, cands) {
  const ok = cands.filter((c) => c.m.mass > 0 && c.m.w > 0).sort((a, b) => a.weight - b.weight);
  if (!ok.length || !(target.w > 0)) return null;
  let pick = null;
  for (const c of ok) if (c.m.w <= target.w * 1.01) pick = c;
  if (!pick) return { weight: ok[0].weight, stroke: 0, m: ok[0].m };
  return { weight: pick.weight, stroke: Math.max(0, target.w - pick.m.w), m: pick.m };
}
