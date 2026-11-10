// Reuses a font that is already inside the PDF, so replacement text is written in
// exactly the same typeface as the text it replaces. Characters are mapped back to
// the font's own codes through its ToUnicode table.
import { fontInfo } from "./textremove.js";

const { PDFName, PDFDict, PDFArray, PDFRawStream, PDFHexString, decodePDFRawStream,
  pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextMatrix,
  setFillingRgbColor, showText, setCharacterSpacing, setWordSpacing, setCharacterSqueeze } = window.PDFLib;

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
  for (const [key, ref] of dict.entries()) {
    const f = libPage.doc.context.lookup(ref);
    if (!(f instanceof PDFDict)) continue;
    const bf = f.lookup(PDFName.of("BaseFont"))?.toString().slice(1);
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

    return {
      resName: key.toString().slice(1),
      ref,
      bytes: type0 ? 2 : 1,
      info,
      uniToCode,
      fk,
      gidOf,
      canWrite(text) {
        for (const ch of text) if (!uniToCode.has(ch)) return false;
        return true;
      },
      codes(text) { return [...text].map((ch) => uniToCode.get(ch)); },
    };
  }
  return null;
}

// SVG markup drawing `text` with the font's real glyph outlines, or null.
// spacing (in the same units as size): charSpacing, wordSpacing, hScale.
export function previewSvg(font, text, size, color, spacing = null) {
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
    const glyph = font.fk.getGlyph(gid);
    const d = glyph?.path?.toSVG();
    if (d) paths.push(`<path transform="translate(${(x * hs).toFixed(2)} 0) scale(${k * hs} ${-k})" d="${d}"/>`);
    const w = font.info.known ? font.info.width(code) : (glyph?.advanceWidth ?? upm / 2) * (1000 / upm);
    x += (w / 1000) * size + (sp.charSpacing || 0) + (ch === " " ? sp.wordSpacing || 0 : 0);
  }
  const width = x * hs;
  const h = size * 1.3;
  const base = size * 0.85;
  return {
    width,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width) + 2}" height="${h}" viewBox="0 ${-base} ${Math.ceil(width) + 2} ${h}" fill="rgb(${color.join(",")})">${paths.join("")}</svg>`,
  };
}

// Writes `text` on a pdf-lib page using the PDF's own font resource.
export function drawWithPdfFont(page, font, text, opts) {
  const hex = font.codes(text).map((c) => c.toString(16).padStart(font.bytes * 2, "0")).join("");
  pushText(page, font.resName, hex, opts);
}

// Low-level text writer: font resource + hex glyph codes, with the original spacing and scale.
export function pushText(page, resName, hex, { x, y, size, color, rotationDeg = 0, spacing }) {
  const r = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  const sp = spacing || {};
  const ops = [pushGraphicsState(), beginText(), setFontAndSize(resName, size),
    setFillingRgbColor(color[0] / 255, color[1] / 255, color[2] / 255)];
  if (sp.charSpacing) ops.push(setCharacterSpacing(sp.charSpacing));
  if (sp.wordSpacing) ops.push(setWordSpacing(sp.wordSpacing));
  if (sp.hScale && Math.abs(sp.hScale - 1) > 0.005) ops.push(setCharacterSqueeze(sp.hScale * 100));
  ops.push(setTextMatrix(cos, sin, -sin, cos, x, y), showText(PDFHexString.of(hex)), endText(), popGraphicsState());
  page.pushOperators(...ops);
}

/* ---------- closest font when the document's own font can't be used ---------- */

// Open fonts with the same letter widths as the common document fonts (metric-compatible),
// so replacement text takes the same space as the original. Licences are in fonts/.
export const METRIC_FAMILIES = {
  sans: { label: "Sans (Arial / Helvetica)", file: "LiberationSans", css: '"AD Sans"' },
  serif: { label: "Serif (Times New Roman)", file: "LiberationSerif", css: '"AD Serif"' },
  mono: { label: "Mono (Courier New)", file: "LiberationMono", css: '"AD Mono"' },
  calibri: { label: "Calibri style (Carlito)", file: "Carlito", css: '"AD Calibri"' },
  cambria: { label: "Cambria style (Caladea)", file: "Caladea", css: '"AD Cambria"' },
};

export function metricFile(family, bold, italic) {
  const f = METRIC_FAMILIES[family] || METRIC_FAMILIES.sans;
  const style = bold && italic ? "BoldItalic" : bold ? "Bold" : italic ? "Italic" : "Regular";
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
  const bold = /bold|black|heavy|semibold|demi|w[6-9]$/i.test(name) || !!(flags & 262144) || (weight ?? 0) >= 600;
  const italic = /italic|oblique|slanted/i.test(name) || !!(flags & 64) || (angle !== null && Math.abs(angle) > 0.5);
  let family = "sans";
  if (/calibri|carlito/i.test(name)) family = "calibri";
  else if (/cambria|caladea/i.test(name)) family = "cambria";
  else if (/courier|mono|consol|cousine|menlo|typewriter/i.test(name) || flags & 1) family = "mono";
  else if (/sans|arial|helvetica|arimo|verdana|tahoma|segoe|roboto|open ?sans|calibri|lato|swiss/i.test(name)) family = "sans";
  else if (/times|tinos|roman|serif|georgia|garamond|book|minion|palatino|century|baskerville|cambria/i.test(name) || flags & 2) family = "serif";
  return { family, bold, italic, exact: /arial|helvetica|arimo|liberation|times|tinos|courier|cousine|calibri|carlito|cambria|caladea/i.test(name) };
}

// The FontDescriptor of a font on a pdf-lib page (Type0 fonts keep it on the descendant).
export function fontDescriptor(libPage, baseFont, resources = null) {
  const dict = (resources || libPage.node.Resources())?.lookup(PDFName.of("Font"));
  if (!(dict instanceof PDFDict)) return null;
  for (const [, ref] of dict.entries()) {
    const f = libPage.doc.context.lookup(ref);
    if (!(f instanceof PDFDict)) continue;
    if (stripSubset(f.lookup(PDFName.of("BaseFont"))?.toString().slice(1)) !== stripSubset(baseFont)) continue;
    const holder = f.lookup(PDFName.of("DescendantFonts"))?.lookup(0) || f;
    return holder.lookup(PDFName.of("FontDescriptor")) || null;
  }
  return null;
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
 * Writes lines of replacement text on page `p` of pdf-lib document `out`:
 * 1. with the document's own font when it has every character (exact look);
 * 2. otherwise with the metric-compatible open font of the same family, weight and slant;
 * 3. otherwise (font file unavailable) with the closest standard PDF font.
 * lines: [{ text, x, y }] in user space. Returns the name of the font used.
 */
export async function writeLines(out, p, { lines, size, color, rotationDeg = 0, pdfFont = null, family = "sans", bold = false, italic = false, underline = false, spacing = null, embedded = new Map() }) {
  const r = (rotationDeg * Math.PI) / 180, dir = [Math.cos(r), Math.sin(r)];
  const all = lines.map((l) => l.text).join("");
  let used, widthOf;
  if (pdfFont && pdfFont.canWrite(all)) {
    for (const l of lines) if (l.text) drawWithPdfFont(p, pdfFont, l.text, { x: l.x, y: l.y, size, color, rotationDeg, spacing });
    used = "document";
    widthOf = (t) => [...t].reduce((w, ch) => w + (pdfFont.info.known ? pdfFont.info.width(pdfFont.uniToCode.get(ch)) / 1000 * size : size * 0.5), 0);
  } else {
    const file = metricFile(family, bold, italic);
    let font = embedded.get(file);
    if (!font) {
      try {
        if (window.fontkit && !out._fontkitRegistered) { out.registerFontkit(window.fontkit); out._fontkitRegistered = true; }
        font = await out.embedFont(await loadFontFile(file), { subset: true });
        embedded.set(file, font);
      } catch (e) { console.warn("Open font unavailable, using a standard font", e); font = null; }
    }
    if (font) {
      const cps = [...all].filter((ch) => !/\s/.test(ch)).map((ch) => ch.codePointAt(0));
      const fk = font.embedder?.font;
      if (fk && cps.some((cp) => !fk.hasGlyphForCodePoint(cp))) throw new Error(`"${all}" has letters this font can't write (Latin, Greek and Cyrillic letters, numbers and common symbols work).`);
      const key = p.node.newFontDictionary(font.name, font.ref);
      for (const l of lines) if (l.text) pushText(p, key, font.encodeText(l.text).asString(), { x: l.x, y: l.y, size, color, rotationDeg, spacing });
      used = file.replace(/\.ttf$/, "");
      widthOf = (t) => font.widthOfTextAtSize(t, size);
    } else {
      const { StandardFonts, rgb, degrees } = window.PDFLib;
      const name = family === "serif" || family === "cambria" ? (bold && italic ? "TimesRomanBoldItalic" : bold ? "TimesRomanBold" : italic ? "TimesRomanItalic" : "TimesRoman")
        : (family === "mono" ? "Courier" : "Helvetica") + (bold && italic ? "BoldOblique" : bold ? "Bold" : italic ? "Oblique" : "");
      const std = embedded.get(name) || (await out.embedFont(StandardFonts[name]));
      embedded.set(name, std);
      for (const l of lines) {
        if (!l.text) continue;
        try { std.encodeText(l.text); } catch { throw new Error(`"${l.text}" has letters that can't be written (English letters, numbers and common symbols work).`); }
        p.drawText(l.text, { x: l.x, y: l.y, size, font: std, color: rgb(color[0] / 255, color[1] / 255, color[2] / 255), rotate: degrees(rotationDeg) });
      }
      used = name;
      widthOf = (t) => std.widthOfTextAtSize(t, size);
    }
  }
  if (underline) {
    const { rgb } = window.PDFLib;
    for (const l of lines) {
      if (!l.text.trim()) continue;
      const sp = spacing || {};
      const w = (widthOf(l.text) + (sp.charSpacing || 0) * [...l.text].length) * (sp.hScale || 1);
      const off = size * 0.12, ox = l.x + dir[1] * off, oy = l.y - dir[0] * off;
      p.drawLine({ start: { x: ox, y: oy }, end: { x: ox + dir[0] * w, y: oy + dir[1] * w }, thickness: Math.max(0.5, size * 0.06), color: rgb(color[0] / 255, color[1] / 255, color[2] / 255) });
    }
  }
  return used;
}
