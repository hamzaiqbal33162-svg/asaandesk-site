// Reuses a font that is already inside the PDF, so replacement text is written in
// exactly the same typeface as the text it replaces. Characters are mapped back to
// the font's own codes through its ToUnicode table.
import { fontInfo } from "./textremove.js";

const { PDFName, PDFDict, PDFArray, PDFRawStream, PDFHexString, decodePDFRawStream,
  pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextMatrix,
  setFillingRgbColor, showText } = window.PDFLib;

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
export function loadPdfFont(libPage, baseFont) {
  const dict = libPage.node.Resources()?.lookup(PDFName.of("Font"));
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
export function previewSvg(font, text, size, color) {
  if (!font.fk || !font.gidOf) return null;
  const upm = font.fk.unitsPerEm || 1000;
  const k = size / upm;
  let x = 0;
  const paths = [];
  for (const ch of text) {
    const code = font.uniToCode.get(ch);
    let gid;
    try { gid = font.gidOf(code, ch); } catch { return null; }
    const glyph = font.fk.getGlyph(gid);
    const d = glyph?.path?.toSVG();
    if (d) paths.push(`<path transform="translate(${x.toFixed(2)} 0) scale(${k} ${-k})" d="${d}"/>`);
    const w = font.info.known ? font.info.width(code) : (glyph?.advanceWidth ?? upm / 2) * (1000 / upm);
    x += (w / 1000) * size;
  }
  const h = size * 1.3;
  const base = size * 0.85;
  return {
    width: x,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(x) + 2}" height="${h}" viewBox="0 ${-base} ${Math.ceil(x) + 2} ${h}" fill="rgb(${color.join(",")})">${paths.join("")}</svg>`,
  };
}

// Writes `text` on a pdf-lib page using the PDF's own font resource.
export function drawWithPdfFont(page, font, text, { x, y, size, color, rotationDeg }) {
  const hex = font.codes(text).map((c) => c.toString(16).padStart(font.bytes * 2, "0")).join("");
  const r = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  page.pushOperators(
    pushGraphicsState(),
    beginText(),
    setFontAndSize(font.resName, size),
    setFillingRgbColor(color[0] / 255, color[1] / 255, color[2] / 255),
    setTextMatrix(cos, sin, -sin, cos, x, y),
    showText(PDFHexString.of(hex)),
    endText(),
    popGraphicsState(),
  );
}
