// Reuses a font that is already inside the PDF, so replacement text is written in
// exactly the same typeface as the text it replaces. Characters are mapped back to
// the font's own codes through its ToUnicode table.
import { fontInfo } from "./textremove.js";

const { PDFName, PDFDict, PDFRawStream, PDFHexString, decodePDFRawStream,
  pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextMatrix,
  setFillingRgbColor, showText, setCharacterSpacing, setWordSpacing, setCharacterSqueeze,
  setTextRenderingMode, setStrokingRgbColor, setLineWidth, setGraphicsState, setLineJoin,
  moveTo, lineTo, appendBezierCurve, closePath, fill, fillAndStroke } = window.PDFLib;

const stripSubset = (n) => (n || "").replace(/^[A-Z]{6}\+/, "");
const streamBytes = (s) => (s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents());
const hexNum = (h) => parseInt(h, 16);

function utf16(hex) {
  let s = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(hexNum(hex.slice(i, i + 4)));
  if (hex.length === 2) s = String.fromCharCode(hexNum(hex));
  return s;
}

// code -> unicode string from a ToUnicode CMap.
function parseToUnicode(text) {
  const map = new Map();
  const body = (re) => [...text.matchAll(re)].map((m) => m[1]).join("\n");
  const chars = body(/beginbfchar([\s\S]*?)endbfchar/g);
  for (const m of chars.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) map.set(hexNum(m[1]), utf16(m[2]));
  const ranges = body(/beginbfrange([\s\S]*?)endbfrange/g);
  for (const m of ranges.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<([0-9A-Fa-f]*)>|\[([^\]]*)\])/g)) {
    const lo = hexNum(m[1]), hi = hexNum(m[2]);
    if (hi - lo > 65535) continue;
    if (m[4] !== undefined) {
      const dst = m[4];
      const last = hexNum(dst.slice(-4) || dst);
      const prefix = dst.length > 4 ? utf16(dst.slice(0, -4)) : "";
      for (let c = lo; c <= hi; c++) map.set(c, prefix + String.fromCharCode(last + (c - lo)));
    } else {
      const list = [...m[5].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => x[1]);
      list.forEach((d, i) => map.set(lo + i, utf16(d)));
    }
  }
  return map;
}

/**
 * Finds `baseFont` on a pdf-lib page and returns what is needed to write new text with it,
 * or null when the font can't be reused.
 */
// resources: the Resources dict the text was drawn with (page, form XObject or form-field appearance).
export function loadPdfFont(libPage, baseFont, resources = null) {
  const dict = (resources || libPage.node.Resources())?.lookup(PDFName.of("Font"));
  if (!(dict instanceof PDFDict)) return null;
  // The exact subset first (ABCDEF+Name): a page can hold several subsets of one font, each with its own letters.
  const entries = [...dict.entries()].map(([key, ref]) => [key, ref, libPage.doc.context.lookup(ref)]).filter(([, , f]) => f instanceof PDFDict);
  const bfOf = (f) => f.lookup(PDFName.of("BaseFont"))?.toString().slice(1);
  entries.sort((a, b) => (bfOf(b[2]) === baseFont) - (bfOf(a[2]) === baseFont));
  for (const [key, ref, f] of entries) {
    const bf = bfOf(f);
    if (stripSubset(bf) !== stripSubset(baseFont)) continue;

    const info = fontInfo(f);
    const type0 = f.lookup(PDFName.of("Subtype"))?.toString() === "/Type0";
    const toUni = f.lookup(PDFName.of("ToUnicode"));
    const uniToCode = new Map();
    if (toUni) {
      for (const [code, uni] of parseToUnicode(new TextDecoder("latin1").decode(streamBytes(toUni)))) {
        if (uni.length === 1 && !uniToCode.has(uni)) uniToCode.set(uni, code);
      }
    } else if (!type0) {
      // Simple font without ToUnicode: plain Latin codes.
      for (let c = 32; c < 127; c++) if (!info.known || info.width(c) > 0) uniToCode.set(String.fromCharCode(c), c);
    }
    if (!uniToCode.size) return null;
    // Characters that look the same: subsets often label their space U+00A0 and their hyphen U+2010, while
    // the keyboard types U+0020 and U+002D. Without this, any typed space or hyphen sent the whole line to
    // a look-alike font.
    for (const [want, alts] of [[" ", ["\u00a0"]], ["\u00a0", [" "]], ["-", ["\u2010", "\u2011"]], ["\u2010", ["-", "\u2011"]]]) {
      if (uniToCode.has(want)) continue;
      const alt = alts.find((a) => uniToCode.has(a));
      if (alt) uniToCode.set(want, uniToCode.get(alt));
    }

    // Glyph outlines for an exact on-screen preview (TrueType fonts only).
    const holder = f.lookup(PDFName.of("DescendantFonts"))?.lookup(0) || f;
    const fd = holder.lookup(PDFName.of("FontDescriptor"));
    let fk = null, gidOf = null;
    const ff2 = fd?.lookup(PDFName.of("FontFile2"));
    if (ff2 && window.fontkit) {
      try {
        fk = window.fontkit.create(streamBytes(ff2));
        if (type0) {
          const map = holder.lookup(PDFName.of("CIDToGIDMap"));
          const table = map instanceof PDFRawStream ? streamBytes(map) : null;
          gidOf = (code) => (table ? (table[code * 2] << 8) | table[code * 2 + 1] : code);
        } else {
          gidOf = (code, ch) => fk.glyphForCodePoint(ch.codePointAt(0))?.id ?? 0;
        }
      } catch { fk = null; }
    }

    // A subset font keeps outlines only for the letters the document used; a letter listed in ToUnicode
    // but without an outline in the font program would print as nothing, so it doesn't count as present.
    const drawable = new Map();
    const hasGlyph = (ch) => {
      if (!fk || !gidOf || /\s/.test(ch)) return true;
      if (!drawable.has(ch)) {
        let ok = false;
        try { const g = fk.getGlyph(gidOf(uniToCode.get(ch), ch)); ok = !!g && g.id > 0 && g.path.commands.length > 0; } catch {}
        drawable.set(ch, ok);
      }
      return drawable.get(ch);
    };
    return {
      resName: key.toString().slice(1),
      ref,
      bytes: type0 ? 2 : 1,
      info,
      uniToCode,
      fk,
      gidOf,
      // jsHas(code): set by the editor from pdf.js's font object when the font program can't be read here (CFF/Type1
      // subsets): a code pdf.js has no glyph for prints nothing, so it doesn't count as present either.
      jsHas: null,
      canWrite(text) {
        for (const ch of text) {
          if (!uniToCode.has(ch) || !hasGlyph(ch)) return false;
          if (!fk && this.jsHas && !/\s/.test(ch) && !this.jsHas(uniToCode.get(ch))) return false;
        }
        return true;
      },
      codes(text) { return [...text].map((ch) => uniToCode.get(ch)); },
    };
  }
  return null;
}

// SVG markup drawing `text` with the font's real glyph outlines, or null.
// spacing (in the same units as size): charSpacing, wordSpacing, hScale.
export function previewSvg(font, text, size, color, spacing = null, stroke = null) {
  if (!font.fk || !font.gidOf) return null;
  const upm = font.fk.unitsPerEm || 1000;
  const k = size / upm;
  const sp = spacing || {}, hs = sp.hScale || 1;
  let x = 0;
  const paths = [];
  for (const ch of text) {
    const code = font.uniToCode.get(ch);
    let gid;
    try { gid = font.gidOf(code, ch); } catch { return null; }
    let glyph = null, d = null;
    try { glyph = font.fk.getGlyph(gid); d = glyph?.path?.toSVG(); } catch { glyph = null; d = null; }
    if (d) paths.push(`<path transform="translate(${(x * hs).toFixed(2)} 0) scale(${k * hs} ${-k})"${stroke ? ' vector-effect="non-scaling-stroke"' : ""} d="${d}"/>`);
    let adv = upm / 2;
    try { adv = glyph?.advanceWidth ?? upm / 2; } catch {}
    const w = font.info.known ? font.info.width(code) : adv * (1000 / upm);
    x += (w / 1000) * size + (sp.charSpacing || 0) + (ch === " " ? sp.wordSpacing || 0 : 0);
  }
  const width = x * hs;
  const h = size * 1.3;
  const base = size * 0.85;
  return {
    width,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width) + 2}" height="${h}" viewBox="0 ${-base} ${Math.ceil(width) + 2} ${h}" style="overflow:visible" fill="${stroke?.hollow ? "none" : `rgb(${color.join(",")})`}"${stroke ? ` stroke="rgb(${stroke.color.join(",")})" stroke-width="${stroke.width}" stroke-linejoin="round" overflow="visible"` : ""}>${paths.join("")}</svg>`,
  };
}

// Writes `text` on a pdf-lib page using the PDF's own font resource.
export function drawWithPdfFont(page, font, text, opts) {
  const hex = font.codes(text).map((c) => c.toString(16).padStart(font.bytes * 2, "0")).join("");
  pushText(page, font.resName, hex, opts);
}

// Low-level text writer: font resource + hex glyph codes, with the original spacing and scale.
// render: 0 fill, 1 outline only, 2 fill + outline (stroke = { color, width }); opacity 0..1; join: line join of the
// outline (0 miter, 1 round, 2 bevel; the original letters' own join when their outline is copied).
export function pushText(page, resName, hex, { x, y, size, color, rotationDeg = 0, spacing, render = 0, stroke = null, opacity = 1, join = 1 }) {
  const r = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  const sp = spacing || {};
  const ops = [pushGraphicsState()];
  if (opacity < 1) {
    const gs = page.maybeEmbedGraphicsState?.({ opacity, borderOpacity: opacity });
    if (gs) ops.push(setGraphicsState(gs));
  }
  ops.push(beginText(), setFontAndSize(resName, size), setFillingRgbColor(color[0] / 255, color[1] / 255, color[2] / 255));
  if (render === 3) ops.push(setTextRenderingMode(3)); // invisible (the visible letters are an outline path)
  else if (render && stroke) ops.push(setTextRenderingMode(render), setStrokingRgbColor(stroke.color[0] / 255, stroke.color[1] / 255, stroke.color[2] / 255), setLineWidth(stroke.width), setLineJoin([0, 1, 2].includes(join) ? join : 1));
  if (sp.charSpacing) ops.push(setCharacterSpacing(sp.charSpacing));
  if (sp.wordSpacing) ops.push(setWordSpacing(sp.wordSpacing));
  if (sp.hScale && Math.abs(sp.hScale - 1) > 0.005) ops.push(setCharacterSqueeze(sp.hScale * 100));
  ops.push(setTextMatrix(cos, sin, -sin, cos, x, y), showText(PDFHexString.of(hex)), endText(), popGraphicsState());
  page.pushOperators(...ops);
}

/**
 * Extra weight as one outline path (see textpaint.js paintUnion, same geometry): operators that draw the glyph
 * outlines of `text` (fontkit font fk) united with copies shifted by +-smear/2 in x and y, in user space, filled once
 * (nonzero = the union) and, with `stroke` ({ color, width }, the original letters' own outline), stroked once.
 * Pen positions as pushText writes them: size, horizontal scale, character spacing, rotation; baseline start (x, y).
 */
const SMEAR_OFFSETS = [[0, 0], [-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]];
export function smearOps(fk, text, { x, y, size, hScale = 1, charSpacing = 0, rotationDeg = 0, color, smear, stroke = null, join = 0 }) {
  const upm = fk.unitsPerEm || 1000, k = size / upm, r = (rotationDeg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const ops = [pushGraphicsState(), setFillingRgbColor(color[0] / 255, color[1] / 255, color[2] / 255)];
  if (stroke) ops.push(setStrokingRgbColor(stroke.color[0] / 255, stroke.color[1] / 255, stroke.color[2] / 255), setLineWidth(stroke.width), setLineJoin([0, 1, 2].includes(join) ? join : 0));
  let any = false;
  for (const [ux, uy] of SMEAR_OFFSETS) {
    const dx = ux * smear, dy = uy * smear;
    let pen = 0;
    for (const ch of text) {
      let g = null;
      try { g = fk.glyphForCodePoint(ch.codePointAt(0)); } catch { g = null; }
      const P = (gx, gy) => { const tx = (pen + gx * k) * hScale, ty = gy * k; return [x + cos * tx - sin * ty + dx, y + sin * tx + cos * ty + dy]; };
      let cmds = [];
      try { cmds = /\s/.test(ch) ? [] : g?.path?.commands || []; } catch { cmds = []; }
      let cur = [0, 0];
      for (const { command, args } of cmds) {
        if (command === "moveTo") { cur = [args[0], args[1]]; ops.push(moveTo(...P(...cur))); any = true; }
        else if (command === "lineTo") { cur = [args[0], args[1]]; ops.push(lineTo(...P(...cur))); }
        else if (command === "quadraticCurveTo") {
          const [qx, qy, ex, ey] = args;
          const c1 = [cur[0] + (2 / 3) * (qx - cur[0]), cur[1] + (2 / 3) * (qy - cur[1])], c2 = [ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey)];
          ops.push(appendBezierCurve(...P(...c1), ...P(...c2), ...P(ex, ey))); cur = [ex, ey];
        } else if (command === "bezierCurveTo") { ops.push(appendBezierCurve(...P(args[0], args[1]), ...P(args[2], args[3]), ...P(args[4], args[5]))); cur = [args[4], args[5]]; }
        else if (command === "closePath") ops.push(closePath());
      }
      pen += ((g?.advanceWidth ?? upm / 2) / upm) * size + charSpacing;
    }
  }
  if (any) ops.push(stroke ? fillAndStroke() : fill());
  ops.push(popGraphicsState());
  return ops;
}

/* ---------- closest font when the document's own font can't be used ---------- */

/**
 * Metric-compatible open fonts have the same letter WIDTHS as the fonts they stand in for, but not the same
 * letter HEIGHTS: Liberation Sans capitals are about 4% shorter than Arial's while its small letters are about
 * 2% taller. When the document's font program is embedded (even as a subset), its real letters are measured
 * against the open font's same letters, separately for capitals and figures, letters with ascenders (b d f h k
 * l t) and x-height letters, and each letter of the open font is then drawn that much taller (font size x k)
 * and narrower (horizontal scale / k): every advance width stays the original's, and cap height, ascenders
 * and x-height all match. heightMatchByClass returns { all, cap, asc, x } (1 = no change).
 */
const MEASURE = { cap: /^[A-Z0-9]$/, asc: /^[bdfhkl]$/, x: /^[acemnorsuvwxz]$/ };
export function heightClass(ch) {
  if (/[A-Z0-9]/.test(ch)) return "cap";
  if (/[bdfhklt]/.test(ch)) return "asc";
  if (/[a-z]/.test(ch)) return "x";
  return null;
}
export function heightMatchByClass(pdfFont, openFont) {
  const lists = { all: [], cap: [], asc: [], x: [] };
  if (pdfFont?.fk && pdfFont.gidOf && openFont) {
    for (const [ch, code] of pdfFont.uniToCode) {
      if (!/^[A-Za-z0-9]$/.test(ch)) continue;
      // Glyph data is read lazily: a broken subset (seen: pdf-lib subsets of fonts with odd glyph lengths) throws
      // here, and that letter just doesn't count.
      let a = 0, b = 0;
      try {
        const g = pdfFont.fk.getGlyph(pdfFont.gidOf(code, ch));
        const o = openFont.glyphForCodePoint(ch.codePointAt(0));
        if (!g?.path?.commands?.length || !o?.id) continue;
        a = g.bbox.maxY / (pdfFont.fk.unitsPerEm || 1000); b = o.bbox.maxY / (openFont.unitsPerEm || 1000);
      } catch { continue; }
      if (!(a > 0.3 && b > 0.3)) continue;
      lists.all.push(a / b);
      for (const c of ["cap", "asc", "x"]) if (MEASURE[c].test(ch)) lists[c].push(a / b);
    }
  }
  const med = (l) => {
    if (!l.length) return null;
    const k = [...l].sort((x, y) => x - y)[l.length >> 1];
    // Under half a percent is noise; beyond +-20% the "same family" guess was wrong, so don't distort.
    return Math.abs(k - 1) < 0.005 || k < 0.8 || k > 1.2 ? 1 : +k.toFixed(4);
  };
  const all = med(lists.all) ?? 1;
  return { all, cap: med(lists.cap) ?? all, asc: med(lists.asc) ?? all, x: med(lists.x) ?? all };
}
// One factor for the whole font (median over all shared letters).
export function heightMatch(pdfFont, openFont) { return heightMatchByClass(pdfFont, openFont).all; }

/**
 * Letter weight: the thickness of vertical stems, measured on the outlines of the letters both fonts have (at 30%
 * of each letter's height, where l, i, n, m, h, u, H, E … have only their stems). Returns how much thicker (in em)
 * the document's letters are than the open font's as it is drawn (horizontal scale hs): the open font is then
 * drawn with a stroke of that width in the text colour, so new letters are as heavy as the old ones.
 */
const STEM_CHARS = "lIi1nmhuHEFLTdbpqrk";
function flatten(path, steps = 10) {
  const polys = [];
  let cur = null, x = 0, y = 0;
  for (const { command, args } of path.commands) {
    if (command === "moveTo") { cur = [[args[0], args[1]]]; polys.push(cur); [x, y] = args; }
    else if (command === "lineTo") { cur?.push([args[0], args[1]]); [x, y] = args; }
    else if (command === "quadraticCurveTo" || command === "bezierCurveTo") {
      const pts = command === "quadraticCurveTo" ? [[x, y], [args[0], args[1]], [args[2], args[3]]] : [[x, y], [args[0], args[1]], [args[2], args[3]], [args[4], args[5]]];
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        let q = pts;
        while (q.length > 1) q = q.slice(1).map((p, j) => [q[j][0] + (p[0] - q[j][0]) * t, q[j][1] + (p[1] - q[j][1]) * t]);
        cur?.push(q[0]);
      }
      [x, y] = pts[pts.length - 1];
    }
  }
  return polys;
}
function stemOf(glyph) {
  const cmds = glyph?.path?.commands;
  if (!cmds?.length) return null;
  const b = glyph.bbox, yy = b.minY + (b.maxY - b.minY) * 0.3, xs = [];
  for (const poly of flatten(glyph.path)) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) xs.push(x1 + ((yy - y1) * (x2 - x1)) / (y2 - y1));
    }
  }
  xs.sort((a, c) => a - c);
  let best = null;
  for (let i = 0; i + 1 < xs.length; i += 2) { const w = xs[i + 1] - xs[i]; if (w > 0 && (best === null || w < best)) best = w; }
  return best;
}
export function weightMatch(pdfFont, openFont, hs = 1) {
  if (!pdfFont?.fk || !pdfFont.gidOf || !openFont) return 0;
  const d = [];
  for (const ch of STEM_CHARS) {
    const code = pdfFont.uniToCode.get(ch);
    if (code === undefined) continue;
    let a = null, b = null;
    try {
      const g = pdfFont.fk.getGlyph(pdfFont.gidOf(code, ch));
      const o = openFont.glyphForCodePoint(ch.codePointAt(0));
      a = stemOf(g); b = o?.id ? stemOf(o) : null;
    } catch { continue; } // broken glyph data in a subset: skip the letter
    if (a && b) d.push(a / (pdfFont.fk.unitsPerEm || 1000) - (b / (openFont.unitsPerEm || 1000)) * hs);
  }
  if (!d.length) return 0;
  const m = [...d].sort((x, y) => x - y)[d.length >> 1];
  // Under 0.002 em (a fraction of a pixel at text sizes) is noise; never more than a bold step (0.06 em).
  return m < 0.002 ? 0 : +Math.min(m, 0.06).toFixed(4);
}

// Splits text into runs drawn with one height factor each; spaces and punctuation join the run they are in.
export function heightRuns(text, ks) {
  const runs = [];
  for (const ch of text) {
    const cls = heightClass(ch), last = runs[runs.length - 1];
    const k = cls ? ks[cls] : last ? last.k : ks.all;
    if (last && last.k === k) last.text += ch;
    else runs.push({ text: ch, k });
  }
  return runs;
}

// Spacing to write the open font with when it is drawn k times taller and 1/k as wide (see heightMatch).
export function scaledSpacing(spacing, k) {
  if (k === 1) return spacing;
  const sp = spacing || {};
  return { charSpacing: (sp.charSpacing || 0) * k, wordSpacing: (sp.wordSpacing || 0) * k, hScale: (sp.hScale || 1) / k };
}

/**
 * SVG of `text` in an open font program (fontkit), exactly as writeLines puts it in the PDF: the same glyphs,
 * advance widths, letter spacing, horizontal scale and per-letter height factors (no kerning, no ligatures,
 * and no word spacing, which PDF viewers don't apply to two-byte fonts).
 */
export function openPreviewSvg(fk, text, size, color, spacing, ks, stroke = null) {
  const upm = fk.unitsPerEm || 1000, sp = spacing || {}, hs = sp.hScale || 1;
  let x = 0;
  const paths = [];
  for (const run of heightRuns(text, ks)) {
    for (const ch of run.text) {
      const g = fk.glyphForCodePoint(ch.codePointAt(0));
      const d = g?.path?.toSVG();
      if (d) paths.push(`<path transform="translate(${(x * hs).toFixed(2)} 0) scale(${(size / upm) * hs} ${(-size / upm) * run.k})"${stroke ? ' vector-effect="non-scaling-stroke"' : ""} d="${d}"/>`);
      x += ((g?.advanceWidth ?? upm / 2) / upm) * size + (sp.charSpacing || 0);
    }
  }
  // Same box as previewSvg (baseline 0.85 em below the top); taller letters may draw above it.
  const width = x * hs, base = size * 0.85, h = size * 1.3;
  return {
    width,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width) + 2}" height="${h}" viewBox="0 ${-base} ${Math.ceil(width) + 2} ${h}" style="overflow:visible" fill="${stroke?.hollow ? "none" : `rgb(${color.join(",")})`}"${stroke ? ` stroke="rgb(${stroke.color.join(",")})" stroke-width="${stroke.width}" stroke-linejoin="round"` : ""}>${paths.join("")}</svg>`,
  };
}

// Open fonts with the same letter widths as the common document fonts (metric-compatible),
// so replacement text takes the same space as the original. Licences are in fonts/.
export const METRIC_FAMILIES = {
  sans: { label: "Sans (Arial / Helvetica)", file: "LiberationSans", css: '"AD Sans"' },
  serif: { label: "Serif (Times New Roman)", file: "LiberationSerif", css: '"AD Serif"' },
  mono: { label: "Mono (Courier New)", file: "LiberationMono", css: '"AD Mono"' },
  calibri: { label: "Calibri style (Carlito)", file: "Carlito", css: '"AD Calibri"' },
  cambria: { label: "Cambria style (Caladea)", file: "Caladea", css: '"AD Cambria"' },
  // Roboto is open (Apache-2.0): text in Roboto gets the real Roboto, in its own weight (Light/Regular/Medium/Bold).
  roboto: { label: "Roboto", file: "Roboto", css: '"AD Roboto"', weights: [300, 400, 500, 700] },
};
const WEIGHT_NAME = { 300: "Light", 400: "Regular", 500: "Medium", 700: "Bold" };

// weight: 100-900 when known; the nearest weight the family has (a tie goes to the heavier one).
export function metricFile(family, bold, italic, weight = null) {
  const f = METRIC_FAMILIES[family] || METRIC_FAMILIES.sans;
  const ws = f.weights || [400, 700], want = weight ?? (bold ? 700 : 400);
  const w = ws.reduce((b, x) => (Math.abs(x - want) < Math.abs(b - want) || (Math.abs(x - want) === Math.abs(b - want) && x > b) ? x : b), ws[0]);
  const name = WEIGHT_NAME[w];
  const style = italic ? (w === 400 ? "Italic" : name + "Italic") : name;
  return `${f.file}-${style}.ttf`;
}

/**
 * Family, weight and slant of a PDF font, from its name and FontDescriptor
 * (Flags: 1 fixed pitch, 2 serif, 64 italic, 262144 force bold; FontWeight; ItalicAngle).
 */
export function fontTraits(baseFont, descriptor = null) {
  const name = stripSubset(baseFont).replace(/[\s_]/g, "");
  const num = (k) => { const v = descriptor?.lookup?.(PDFName.of(k)); return v && typeof v.asNumber === "function" ? v.asNumber() : null; };
  const flags = num("Flags") ?? 0, weight = num("FontWeight"), angle = num("ItalicAngle");
  // Weight 100-900: from the name (Roboto-Medium, Arial-BoldMT, …), else the descriptor, else the force-bold flag.
  const style = name.replace(/^[^-,]*[-,]?/, "") || name;
  const named = [[/thin|hairline/i, 100], [/(extra|ultra)light/i, 200], [/light/i, 300], [/medium/i, 500], [/(semi|demi)bold|demi/i, 600], [/(extra|ultra)bold/i, 800], [/black|heavy/i, 900], [/bold|w[6-9]$/i, 700]].find(([re]) => re.test(style))?.[1];
  const wt = named ?? (weight && weight >= 100 && weight <= 900 ? weight : flags & 262144 ? 700 : 400);
  const bold = wt >= 600;
  const italic = /italic|oblique|slanted/i.test(name) || !!(flags & 64) || (angle !== null && Math.abs(angle) > 0.5);
  let family = "sans";
  if (/roboto/i.test(name) && !/mono|slab|condensed/i.test(name)) family = "roboto";
  else if (/calibri|carlito/i.test(name)) family = "calibri";
  else if (/cambria|caladea/i.test(name)) family = "cambria";
  else if (/courier|mono|consol|cousine|menlo|typewriter/i.test(name) || flags & 1) family = "mono";
  else if (/sans|arial|helvetica|arimo|verdana|tahoma|segoe|roboto|open ?sans|calibri|lato|swiss/i.test(name)) family = "sans";
  else if (/times|tinos|roman|serif|georgia|garamond|book|minion|palatino|century|baskerville|cambria/i.test(name) || flags & 2) family = "serif";
  return { family, bold, italic, weight: wt, exact: /arial|helvetica|arimo|liberation|times|tinos|courier|cousine|calibri|carlito|cambria|caladea|roboto/i.test(name) };
}

// The FontDescriptor of a font on a pdf-lib page (Type0 fonts keep it on the descendant).
export function fontDescriptor(libPage, baseFont, resources = null) {
  const dict = (resources || libPage.node.Resources())?.lookup(PDFName.of("Font"));
  if (!(dict instanceof PDFDict)) return null;
  const all = [...dict.entries()].map(([, ref]) => libPage.doc.context.lookup(ref)).filter((f) => f instanceof PDFDict);
  const bfOf = (f) => f.lookup(PDFName.of("BaseFont"))?.toString().slice(1);
  all.sort((a, b) => (bfOf(b) === baseFont) - (bfOf(a) === baseFont));
  for (const f of all) {
    if (stripSubset(bfOf(f)) !== stripSubset(baseFont)) continue;
    const holder = f.lookup(PDFName.of("DescendantFonts"))?.lookup(0) || f;
    return holder.lookup(PDFName.of("FontDescriptor")) || null;
  }
  return null;
}

/**
 * A copy of a TrueType font whose glyph records all have an even length (zero-padded), or the same bytes
 * when they already do. The PDF library's subsetter copies glyph records as they are into a short-format
 * index, which can only point at even offsets: with Carlito (whose records have odd lengths) every glyph
 * after the first odd one came out broken, so look-alike text was saved with letters missing.
 */
export function evenGlyphs(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.length < 12) return u8;
  const numTables = dv.getUint16(4);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    tables.push({ tag: String.fromCharCode(...u8.subarray(o, o + 4)), offset: dv.getUint32(o + 8), length: dv.getUint32(o + 12) });
  }
  const t = Object.fromEntries(tables.map((x) => [x.tag, x]));
  if (!t.head || !t.loca || !t.glyf || !t.maxp) return u8;
  const long = dv.getInt16(t.head.offset + 50) === 1;
  const n = dv.getUint16(t.maxp.offset + 4);
  const at = (i) => (long ? dv.getUint32(t.loca.offset + i * 4) : dv.getUint16(t.loca.offset + i * 2) * 2);
  let odd = false;
  for (let i = 0; i < n && !odd; i++) odd = (at(i + 1) - at(i)) % 2 === 1;
  if (!odd) return u8;
  // New glyf (each record padded to even length) and a long-format loca pointing into it.
  const offs = [0];
  for (let i = 0; i < n; i++) { const len = at(i + 1) - at(i); offs.push(offs[i] + len + (len % 2)); }
  const glyf = new Uint8Array(offs[n]);
  for (let i = 0; i < n; i++) glyf.set(u8.subarray(t.glyf.offset + at(i), t.glyf.offset + at(i + 1)), offs[i]);
  const loca = new Uint8Array((n + 1) * 4);
  const ldv = new DataView(loca.buffer);
  offs.forEach((v, i) => ldv.setUint32(i * 4, v));
  const data = tables.map((x) => (x.tag === "glyf" ? glyf : x.tag === "loca" ? loca : u8.slice(x.offset, x.offset + x.length)));
  const headI = tables.findIndex((x) => x.tag === "head");
  const head = data[headI];
  const hdv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  hdv.setInt16(50, 1); // indexToLocFormat: long
  hdv.setUint32(8, 0); // checkSumAdjustment (recomputed below)
  // Write the font: same table order, 4-byte aligned, fresh checksums.
  const pad4 = (x) => (x + 3) & ~3;
  let size = 12 + numTables * 16;
  const place = data.map((d) => { const o = size; size += pad4(d.length); return o; });
  const out = new Uint8Array(size);
  const odv = new DataView(out.buffer);
  out.set(u8.subarray(0, 12));
  const sum = (o, len) => { let s = 0; for (let i = 0; i < pad4(len); i += 4) s = (s + odv.getUint32(o + i)) >>> 0; return s; };
  tables.forEach((x, i) => {
    out.set(data[i], place[i]);
    const o = 12 + i * 16;
    out.set(u8.subarray(o, o + 4), o);
    odv.setUint32(o + 4, sum(place[i], data[i].length));
    odv.setUint32(o + 8, place[i]);
    odv.setUint32(o + 12, data[i].length);
  });
  odv.setUint32(place[headI] + 8, (0xb1b0afba - sum(0, size)) >>> 0);
  return out;
}

// Loads font files (fetch in the browser; tests can replace it).
let fontLoader = async (file) => {
  const res = await fetch(new URL("fonts/" + file, import.meta.url));
  if (!res.ok) throw new Error("Font " + file + " could not be loaded.");
  return new Uint8Array(await res.arrayBuffer());
};
export function setFontLoader(fn) { fontLoader = fn; }
const fontBytes = new Map();
export function loadFontFile(file) {
  if (!fontBytes.has(file)) fontBytes.set(file, fontLoader(file).catch((e) => { fontBytes.delete(file); throw e; }));
  return fontBytes.get(file);
}

/**
 * Chooses how text is written on page `p` of pdf-lib document `out`:
 * 1. the document's own font when it has every character of `text` (exact look);
 * 2. otherwise the metric-compatible open font of the same family, weight and slant;
 * 3. otherwise (font file unavailable) the closest standard PDF font.
 * Returns { used, widthOf(text) (unspaced, in points), draw(text, x, y, opts) }.
 */
// heightFrom: the document's font to match letter heights against when the open font is used (defaults to pdfFont).
// emboldenEm: extra stroke (em) for the open font, measured on the rendered page (see textpaint.js pickWeight); when
// null it is estimated from the two fonts' outlines (weightMatch).
// outlinePath: draw the look-alike as its united outline (with the text invisible on top) even without a make-up,
// when that measured closer to the original (see the editor's measureFit).
export async function pickWriter(out, p, { size, pdfFont = null, heightFrom = null, family = "sans", bold = false, italic = false, weight = null, embedded = new Map(), emboldenEm = null, outlinePath = false }, text) {
  if (pdfFont && pdfFont.canWrite(text)) {
    return {
      used: "document",
      widthOf: (t) => [...t].reduce((w, ch) => w + (pdfFont.info.known ? pdfFont.info.width(pdfFont.uniToCode.get(ch)) / 1000 * size : size * 0.5), 0),
      draw: (t, x, y, o) => drawWithPdfFont(p, pdfFont, t, { ...o, x, y, size }),
    };
  }
  const file = metricFile(family, bold, italic, weight);
  let font = embedded.get(file);
  if (font === undefined) {
    try {
      if (window.fontkit && !out._fontkitRegistered) { out.registerFontkit(window.fontkit); out._fontkitRegistered = true; }
      const bytes = evenGlyphs(await loadFontFile(file));
      // Named the standard way for a subset ("ABCDEF+PostScriptName"), so PDF tools list it as one.
      let ps = file.replace(/\.ttf$/, "");
      try { ps = window.fontkit.create(bytes).postscriptName || ps; } catch {}
      const tag = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
      // No ligatures or other substitutions: one letter = one glyph, as on screen (openPreviewSvg).
      font = await out.embedFont(bytes, { subset: true, customName: `${tag}+${ps}`, features: { liga: false, clig: false, calt: false, dlig: false, rlig: false } });
    } catch (e) { console.warn("Open font unavailable, using a standard font", e); font = null; }
    embedded.set(file, font);
  }
  if (font) {
    const cps = [...text].filter((ch) => !/\s/.test(ch)).map((ch) => ch.codePointAt(0));
    const fk = font.embedder?.font;
    if (fk && cps.some((cp) => !fk.hasGlyphForCodePoint(cp))) throw new Error(`"${text}" has letters this font can't write (Latin, Greek and Cyrillic letters, numbers and common symbols work).`);
    const key = p.node.newFontDictionary(font.name, font.ref);
    // Each run of letters k times taller and 1/k as wide (see heightMatchByClass); runs follow each other at
    // the open font's own advance widths (no kerning), so a line is exactly as wide as without the height match.
    const upm = fk?.unitsPerEm || 1000, ks = heightMatchByClass(heightFrom || pdfFont, fk);
    const adv = (ch) => ((fk?.glyphForCodePoint(ch.codePointAt(0))?.advanceWidth ?? upm / 2) / upm) * size;
    // As heavy as the document's letters: the missing stem thickness is added as a stroke in the text colour.
    const embolden = (emboldenEm != null ? emboldenEm : weightMatch(heightFrom || pdfFont, fk, 1 / ks.all)) * size;
    return {
      used: file.replace(/\.ttf$/, ""),
      embolden,
      widthOf: (t) => [...t].reduce((w, ch) => w + adv(ch), 0),
      draw: (t, x, y, o) => {
        const r = ((o.rotationDeg || 0) * Math.PI) / 180, d = [Math.cos(r), Math.sin(r)], sp = o.spacing || {};
        // Weight make-up (see textpaint.js paintUnion): the visible letters become one outline path united with
        // copies shifted by +-embolden/2 (filled once; stroked once with the original's own outline width when it
        // had one), and the text itself is written invisibly on top so it can still be copied and searched.
        // See-through letters and outline-only letters keep the make-up as extra outline width.
        const united = (embolden > 0 || outlinePath) && fk && !((o.opacity ?? 1) < 1) && (!o.render || (o.render === 2 && o.stroke));
        const smear = united ? Math.max(0, embolden) : 0;
        const heavy = embolden > 0 && !united ? (o.render === 2 && o.stroke ? { render: 2, stroke: { ...o.stroke, width: o.stroke.width + embolden } } : !o.render ? { render: 2, stroke: { color: o.color, width: embolden }, join: 1 } : {}) : {};
        let off = 0;
        for (const run of heightRuns(t, ks)) {
          const rx = x + d[0] * off, ry = y + d[1] * off, rsp = scaledSpacing(o.spacing, run.k) || {};
          if (united) p.pushOperators(...smearOps(fk, run.text, { x: rx, y: ry, size: size * run.k, hScale: rsp.hScale || 1, charSpacing: rsp.charSpacing || 0, rotationDeg: o.rotationDeg || 0, color: o.color, smear, stroke: o.render === 2 ? o.stroke : null, join: o.join ?? 0 }));
          pushText(p, key, font.encodeText(run.text).asString(), { ...o, ...heavy, ...(united ? { render: 3, stroke: null } : {}), x: rx, y: ry, size: size * run.k, spacing: rsp });
          for (const ch of run.text) off += (adv(ch) + (sp.charSpacing || 0)) * (sp.hScale || 1);
        }
      },
    };
  }
  const { StandardFonts } = window.PDFLib;
  const name = family === "serif" || family === "cambria" ? (bold && italic ? "TimesRomanBoldItalic" : bold ? "TimesRomanBold" : italic ? "TimesRomanItalic" : "TimesRoman")
    : (family === "mono" ? "Courier" : "Helvetica") + (bold && italic ? "BoldOblique" : bold ? "Bold" : italic ? "Oblique" : "");
  const std = embedded.get(name) || (await out.embedFont(StandardFonts[name]));
  embedded.set(name, std);
  try { std.encodeText(text); } catch { throw new Error(`"${text}" has letters that can't be written (English letters, numbers and common symbols work).`); }
  const key = p.node.newFontDictionary(std.name, std.ref);
  return { used: name, widthOf: (t) => std.widthOfTextAtSize(t, size), draw: (t, x, y, o) => pushText(p, key, std.encodeText(t).asString(), { ...o, x, y, size }) };
}

// Width of a line with the PDF's character/word spacing and horizontal scale.
export function spacedWidth(widthOf, text, spacing) {
  const sp = spacing || {};
  const n = [...text].length, spaces = (text.match(/ /g) || []).length;
  return (widthOf(text) + (sp.charSpacing || 0) * n + (sp.wordSpacing || 0) * spaces) * (sp.hScale || 1);
}

/**
 * Where the pieces of one line go: aligned inside a box of width boxW (left, center, right), or spread
 * word by word to fill it (justify, works with every font). x, y = left end of the box's baseline.
 * Returns [{ t, x, y, w }] plus the line's start offset and width along the text direction.
 */
export function layoutLine(text, widthOf, { x, y, dir = [1, 0], boxW = null, align = "left", justify = false, spacing = null }) {
  const width = spacedWidth(widthOf, text, spacing);
  const at = (off) => [x + dir[0] * off, y + dir[1] * off];
  if (justify && boxW) {
    const words = text.trim().split(/ +/);
    if (words.length > 1) {
      const ws = words.map((w) => spacedWidth(widthOf, w, spacing));
      const gap = (boxW - ws.reduce((a, b) => a + b, 0)) / (words.length - 1);
      if (gap > 0) {
        let off = 0;
        const segs = words.map((t, i) => { const [px, py] = at(off); const seg = { t, x: px, y: py, w: ws[i] }; off += ws[i] + gap; return seg; });
        return { segs, start: 0, width: boxW };
      }
    }
  }
  const start = boxW == null ? 0 : align === "center" ? (boxW - width) / 2 : align === "right" ? boxW - width : 0;
  const [px, py] = at(start);
  return { segs: [{ t: text, x: px, y: py, w: width }], start, width };
}

/**
 * Writes lines of text on page `p` of pdf-lib document `out` with the best available font (see pickWriter).
 * lines: [{ text, x, y, boxW?, align?, justify? }] in user space. Optional effects: render (0 fill,
 * 1 outline only, 2 fill + outline) with stroke { color, width }, and opacity. If `extents` is an array,
 * each written line's { start, width } is pushed to it. Returns the name of the font used.
 */
export async function writeLines(out, p, { lines, size, color, rotationDeg = 0, pdfFont = null, heightFrom = null, family = "sans", bold = false, italic = false, weight = null, underline = false, spacing = null, embedded = new Map(), render = 0, stroke = null, opacity = 1, extents = null }) {
  const r = (rotationDeg * Math.PI) / 180, dir = [Math.cos(r), Math.sin(r)];
  const all = lines.map((l) => l.text).join("");
  const w = await pickWriter(out, p, { size, pdfFont, heightFrom, family, bold, italic, weight, embedded }, all);
  const { rgb } = window.PDFLib;
  for (const l of lines) {
    if (!l.text) continue;
    const lay = layoutLine(l.text, w.widthOf, { x: l.x, y: l.y, dir, boxW: l.boxW ?? null, align: l.align || "left", justify: !!l.justify, spacing });
    extents?.push({ start: lay.start, width: lay.width });
    for (const seg of lay.segs) w.draw(seg.t, seg.x, seg.y, { color, rotationDeg, spacing, render, stroke, opacity });
    if (underline && l.text.trim()) {
      const off = size * 0.12, x0 = l.x + dir[0] * lay.start, y0 = l.y + dir[1] * lay.start;
      const ox = x0 + dir[1] * off, oy = y0 - dir[0] * off;
      p.drawLine({ start: { x: ox, y: oy }, end: { x: ox + dir[0] * lay.width, y: oy + dir[1] * lay.width }, thickness: Math.max(0.5, size * 0.06), color: rgb(color[0] / 255, color[1] / 255, color[2] / 255), opacity });
    }
  }
  return w.used;
}
