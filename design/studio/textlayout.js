// Text layout shared by every renderer (editor, canvas/PNG, SVG, PDF, thumbnails): word wrap with the real
// advance widths of the open fonts, line positions, alignment, justify, underline and background boxes.
// Pure module: no DOM needed (characters outside the width tables use an optional measurer, see setFallbackMeasure).
import { fontMetrics } from "./fontmetrics.js";

export const CSS_FAMILY = {
  sans: '"AD Sans", Arial, Helvetica, sans-serif',
  serif: '"AD Serif", "Times New Roman", Times, serif',
  mono: '"AD Mono", "Courier New", Courier, monospace',
  calibri: '"AD Calibri", Calibri, Carlito, sans-serif',
  cambria: '"AD Cambria", Cambria, Caladea, serif',
};

let fallback = null;
/** fn(char, family, bold, italic) -> width in em, for letters the open fonts do not have (e.g. Urdu). */
export function setFallbackMeasure(fn) { fallback = fn; widthCache.clear(); }
const widthCache = new Map();

/** Width in px of `str` (no letter spacing). */
export function textWidth(str, family = "sans", bold = false, italic = false, size = 16) {
  const m = fontMetrics(family, bold, italic);
  let units = 0, em = 0;
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    const w = m.widths.get(c === 9 ? 32 : c === 0xa0 ? 0xa0 : c);
    if (w) units += w;
    else {
      const k = family + bold + italic + ch;
      let v = widthCache.get(k);
      if (v === undefined) { v = (fallback && fallback(ch, family, bold, italic)) || 0.55; widthCache.set(k, v); }
      em += v;
    }
  }
  return (units / m.upm + em) * size;
}

/** Inner padding of a text box (room for the background effect). */
export const textPad = (t) => (t.bg && t.bg.color && t.bg.color !== "none" ? Math.round(t.size * (t.bg.pad ?? 0.3)) : 0);

/** Greedy word wrap. Returns [{ text, width, end }] where end = last line of a paragraph. */
export function wrapText(content, maxW, measure) {
  const out = [];
  for (const para of String(content ?? "").replace(/\r/g, "").split("\n")) {
    if (!para) { out.push({ text: "", width: 0, end: true }); continue; }
    const words = para.match(/\S+\s*|\s+/g) || [para];
    let cur = "";
    const push = (s) => { const t = s.replace(/\s+$/, ""); out.push({ text: t, width: measure(t), end: false }); };
    for (const word of words) {
      const trial = (cur + word).replace(/\s+$/, "");
      if (cur && measure(trial) > maxW + 0.01) { push(cur); cur = ""; }
      if (!cur && measure(word.replace(/\s+$/, "")) > maxW + 0.01) {
        // A single word longer than the box: break it by letters.
        let piece = "";
        for (const ch of word.replace(/\s+$/, "")) { if (piece && measure(piece + ch) > maxW + 0.01) { push(piece); piece = ""; } piece += ch; }
        cur = piece + (word.match(/\s+$/)?.[0] || "");
      } else cur += word;
    }
    push(cur);
    out[out.length - 1].end = true;
  }
  return out;
}

/**
 * Lays out a text layer's text in a box `w` px wide.
 * Returns { lines: [{ text, width, x, baseline, top, runs: [{ t, x, w }] }], lineH, height, pad, asc, desc }.
 * x positions are from the box's left edge; baseline/top from the box's top edge.
 */
export function layoutText(t, w) {
  const size = +t.size || 16, ls = +t.letterSpacing || 0;
  const pad = textPad(t);
  const inner = Math.max(1, w - pad * 2);
  const m = fontMetrics(t.family, t.bold, t.italic);
  const measure = (s) => textWidth(s, t.family, t.bold, t.italic, size) + ls * [...s].length;
  const raw = wrapText(t.content, inner, measure);
  const lineH = size * (+t.lineHeight || 1.2);
  const baseOff = (lineH - (m.asc + m.desc) * size) / 2 + m.asc * size;
  const lines = raw.map((l, i) => {
    const top = pad + i * lineH, baseline = top + baseOff;
    let x = pad;
    if (t.align === "center") x = pad + (inner - l.width) / 2;
    else if (t.align === "right") x = pad + inner - l.width;
    let runs = [{ t: l.text, x, w: l.width }];
    if (t.align === "justify" && !l.end && l.text.trim().includes(" ")) {
      const words = l.text.trim().split(/ +/), ws = words.map(measure);
      const gap = (inner - ws.reduce((a, b) => a + b, 0)) / (words.length - 1);
      if (gap > 0) { let off = pad; runs = words.map((wd, j) => { const r = { t: wd, x: off, w: ws[j] }; off += ws[j] + gap; return r; }); x = pad; }
    }
    const width = runs.length > 1 ? inner : l.width;
    return { text: l.text, width, x, top, baseline, runs, end: l.end };
  });
  return { lines, lineH, height: Math.max(lineH, lines.length * lineH) + pad * 2, pad, asc: m.asc, desc: m.desc, inner };
}

/** Height a text layer needs at its width (auto-fit: width fixed, height grows). */
export const textHeight = (t, w) => layoutText(t, w).height;

/**
 * Largest font size <= t.size (down to min) that keeps the text inside maxH at width w
 * (and keeps every single word on one line when possible). Used by Translate and Magic Resize.
 */
export function fitFontSize(t, w, maxH, min = 6) {
  let size = t.size;
  const fits = (s) => {
    const tt = { ...t, size: s };
    const L = layoutText(tt, w);
    if (L.height > maxH + 0.5) return false;
    // A word broken across lines looks wrong: prefer a smaller size.
    const words = String(t.content).split(/\s+/).filter(Boolean);
    const ls = +t.letterSpacing || 0;
    return words.every((wd) => textWidth(wd, t.family, t.bold, t.italic, s) + ls * wd.length <= L.inner + 0.01) || s <= min;
  };
  if (fits(size)) return size;
  let lo = min, hi = size;
  for (let i = 0; i < 24 && hi - lo > 0.1; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  return Math.max(min, Math.floor(lo * 10) / 10);
}

/** CSS font shorthand for canvas. */
export const cssFont = (t, size = t.size) => `${t.italic ? "italic " : ""}${t.bold ? "700" : "400"} ${size}px ${CSS_FAMILY[t.family] || CSS_FAMILY.sans}`;

/** Underline geometry for a line (offset below baseline and thickness, in px). */
export const underlineMetrics = (size) => ({ offset: size * 0.12, thickness: Math.max(1, size * 0.06) });
