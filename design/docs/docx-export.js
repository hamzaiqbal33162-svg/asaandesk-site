// Doc model → Word (.docx) with the `docx` library (MIT), passed in as `D` so this file runs in the
// browser (lazy-loaded lib/docx/docx.umd.min.js) and in Node tests.
import { PAGE_SIZES, HEADING_PT, runsText } from "./model.js";

export const WORD_FONTS = { sans: "Arial", serif: "Times New Roman", mono: "Courier New", calibri: "Calibri", cambria: "Cambria" };
export const mmToTwip = (mm) => Math.round((mm * 1440) / 25.4);
const hex = (c) => String(c || "").replace("#", "").toUpperCase();

/** data: URL → { bytes, mime } (null for anything else). */
export function dataUrlBytes(src) {
  const m = String(src || "").match(/^data:([\w/+.-]+);base64,(.*)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: m[1].toLowerCase() };
}

/** Pixel size of a PNG, JPEG, GIF or BMP, read from its header. */
export function imageSize(b) {
  if (!b || b.length < 24) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0, type: "png" };
  if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | b[7] << 8, h: b[8] | b[9] << 8, type: "gif" };
  if (b[0] === 0x42 && b[1] === 0x4d) return { w: b[18] | b[19] << 8 | b[20] << 16, h: Math.abs((b[22] | b[23] << 8 | b[24] << 16 | b[25] << 24) >> 0), type: "bmp" };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1], len = b[i + 2] << 8 | b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: b[i + 7] << 8 | b[i + 8], h: b[i + 5] << 8 | b[i + 6], type: "jpg" };
      i += 2 + len;
    }
  }
  return null;
}

/**
 * Image bytes ready for Word: { bytes, type, w, h } or null. loadImage(src) (browser) can fetch or convert
 * other images (webp, svg, URLs) to PNG.
 */
export async function wordImage(block, loadImage) {
  let data = dataUrlBytes(block.src), size = data && imageSize(data.bytes);
  if (!size && loadImage) { const got = await loadImage(block.src).catch(() => null); if (got) { data = { bytes: got.bytes }; size = imageSize(got.bytes); } }
  if (!size) return null;
  return { bytes: data.bytes, type: size.type, w: size.w, h: size.h };
}

function runOpts(r, base, D, extra = {}) {
  const o = { text: r.text, ...extra };
  if (r.b || extra.bold) o.bold = true;
  if (r.i || extra.italics) o.italics = true;
  if (r.u || r.link) o.underline = {};
  if (r.s) o.strike = true;
  if (r.sup) o.superScript = true;
  if (r.sub) o.subScript = true;
  if (r.link) o.color = "0563C1";
  if (r.color) o.color = hex(r.color);
  if (r.bg) o.shading = { type: D.ShadingType.CLEAR, color: "auto", fill: hex(r.bg) };
  const font = r.code ? "mono" : r.font;
  if (font && WORD_FONTS[font]) o.font = WORD_FONTS[font];
  if (r.size) o.size = Math.round(r.size * 2);
  else if (base.size) o.size = Math.round(base.size * 2);
  if (base.rtl) o.rightToLeft = true;
  if (base.lsp) o.characterSpacing = Math.round((base.lsp / 1000) * (r.size || base.size || 11) * 20); // twips
  return o;
}

/** Word border style for a divider. */
export function hrBorder(b, D) {
  const color = hex(b.hc || "#c7cbe0");
  if (b.hs === "dashed") return { style: D.BorderStyle.DASHED, size: 12, color, space: 1 };
  if (b.hs === "dotted") return { style: D.BorderStyle.DOTTED, size: 18, color, space: 1 };
  if (b.hs === "double") return { style: D.BorderStyle.DOUBLE, size: 6, color, space: 1 };
  if (b.hs === "thick") return { style: D.BorderStyle.SINGLE, size: 24, color, space: 1 };
  return { style: D.BorderStyle.SINGLE, size: 6, color, space: 1 };
}

/** TextRuns (and hyperlinks) for runs; "\n" inside a run becomes a line break. */
function runsToWord(runs, D, base = {}, extra = {}) {
  const out = [];
  for (const r of runs || []) {
    const parts = String(r.text).split("\n");
    const children = parts.map((t, k) => new D.TextRun({ ...runOpts({ ...r, text: t }, base, D, extra), ...(k ? { break: 1 } : {}) }));
    if (r.link) out.push(new D.ExternalHyperlink({ link: r.link, children }));
    else out.push(...children);
  }
  return out;
}

const ALIGN = (D, a) => ({ center: D.AlignmentType.CENTER, right: D.AlignmentType.RIGHT, justify: D.AlignmentType.JUSTIFIED, left: D.AlignmentType.LEFT })[a] || undefined;

function paraOpts(b, D) {
  const o = {};
  const al = ALIGN(D, b.align || (b.dir === "rtl" ? "right" : ""));
  if (al) o.alignment = al;
  o.spacing = { after: 120, ...(b.lineHeight ? { line: Math.round(240 * b.lineHeight), lineRule: D.LineRuleType ? D.LineRuleType.AUTO : "auto" } : {}) };
  if (b.dir === "rtl") o.bidirectional = true;
  if (b.indent) o.indent = { left: 720 * b.indent };
  if (b.bg) {
    // Coloured block: shaded paragraph with a little room around the text (borders in the same colour pad it out).
    o.shading = { type: D.ShadingType.CLEAR, color: "auto", fill: hex(b.bg) };
    const edge = { style: D.BorderStyle.SINGLE, size: 6, color: hex(b.bg), space: Math.min(31, Math.round((b.pad ?? 14) * 0.75)) };
    o.border = { top: edge, bottom: edge, left: edge, right: edge };
    o.spacing = { ...o.spacing, before: 160, after: 200 };
  }
  if (b.ps) o.spacing = { ...o.spacing, before: b.ps * 20, after: b.ps * 20 };
  return o;
}

const BULLETS = ["•", "◦", "▪"];
function numberingConfig(D) {
  const lv = (fmt, text) => Array.from({ length: 9 }, (_, l) => ({
    level: l, format: fmt(l), text: text(l), alignment: D.AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
  }));
  return {
    config: [
      { reference: "ad-bullets", levels: lv(() => D.LevelFormat.BULLET, (l) => BULLETS[l % 3]) },
      { reference: "ad-numbers", levels: lv((l) => [D.LevelFormat.DECIMAL, D.LevelFormat.LOWER_LETTER, D.LevelFormat.LOWER_ROMAN][l % 3], (l) => `%${l + 1}.`) },
    ],
  };
}

/**
 * Builds the docx Document for `doc`. opts.loadImage(src) → { bytes } for images that are not PNG/JPEG/GIF/BMP
 * data URLs (the browser converts them with a canvas).
 */
export async function buildWordDocument(doc, D, { loadImage } = {}) {
  const page = doc.page || {};
  const ps = PAGE_SIZES[page.size] || PAGE_SIZES.A4;
  const margin = mmToTwip(page.margin || 25.4);
  const contentPx = ((ps.w - 2 * (page.margin || 25.4)) / 25.4) * 96;
  const base = { size: doc.size || 11 };
  const children = [];
  let listInstance = 0, prevList = false;
  const blocks = doc.blocks || [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const rtl = b.dir === "rtl";
    if (b.type !== "li") prevList = false;
    switch (b.type) {
      case "h1": case "h2": case "h3": {
        const lvl = { h1: D.HeadingLevel.HEADING_1, h2: D.HeadingLevel.HEADING_2, h3: D.HeadingLevel.HEADING_3 }[b.type];
        children.push(new D.Paragraph({ ...paraOpts(b, D), heading: lvl, children: runsToWord(b.runs, D, { size: HEADING_PT[b.type], rtl, lsp: b.lsp }, { bold: true }) }));
        break;
      }
      case "p":
        children.push(new D.Paragraph({ ...paraOpts(b, D), children: runsToWord(b.runs, D, { ...base, rtl, lsp: b.lsp }) }));
        break;
      case "quote":
        children.push(new D.Paragraph({ ...paraOpts(b, D), indent: { left: 400 }, border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: "B4B0F5", space: 10 } }, children: runsToWord(b.runs, D, { ...base, rtl, lsp: b.lsp }, { italics: true, color: "475569" }) }));
        break;
      case "li": {
        if (!prevList) listInstance++;
        prevList = true;
        const level = Math.min(8, b.level || 0);
        if (b.list === "check") {
          children.push(new D.Paragraph({ ...paraOpts(b, D), indent: { left: 720 * (level + 1), hanging: 360 }, children: [new D.TextRun({ text: (b.checked ? "☒" : "☐") + " ", font: "Segoe UI Symbol", size: base.size * 2 }), ...runsToWord(b.runs, D, { ...base, rtl, lsp: b.lsp })] }));
        } else {
          children.push(new D.Paragraph({ ...paraOpts(b, D), spacing: { after: 60 }, numbering: { reference: b.list === "number" ? "ad-numbers" : "ad-bullets", level, ...(b.list === "number" ? { instance: listInstance } : {}) }, children: runsToWord(b.runs, D, { ...base, rtl, lsp: b.lsp }) }));
        }
        break;
      }
      case "code": {
        const lines = String(b.text || "").split("\n");
        children.push(new D.Paragraph({ shading: { type: D.ShadingType.CLEAR, color: "auto", fill: "F1F5F9" }, spacing: { after: 120 }, children: lines.map((t, k) => new D.TextRun({ text: t, font: "Courier New", size: 19, ...(k ? { break: 1 } : {}) })) }));
        break;
      }
      case "hr":
        children.push(new D.Paragraph({ border: { bottom: hrBorder(b, D) }, spacing: { after: 160, ...(b.ps ? { before: b.ps * 20, after: 160 + b.ps * 20 } : {}) }, children: [] }));
        break;
      case "pagebreak":
        children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
        break;
      case "table": {
        const cols = Math.max(1, ...b.rows.map((r) => r.length));
        const contentTw = mmToTwip(ps.w) - 2 * margin;
        // Column widths (columns and sidebars keep their %), plain columns have no borders.
        const colWs = b.cw && b.cw.length === cols ? b.cw.map((p) => Math.floor((contentTw * p) / 100)) : Array(cols).fill(Math.floor(contentTw / cols));
        const border = b.tstyle === "cols" ? { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" } : { style: D.BorderStyle.SINGLE, size: 4, color: "94A3B8" };
        const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
        if (b.ps) children.push(new D.Paragraph({ spacing: { after: b.ps * 20 }, children: [] }));
        children.push(new D.Table({
          width: { size: contentTw, type: D.WidthType.DXA },
          columnWidths: colWs,
          borders,
          rows: b.rows.map((r, ri) => new D.TableRow({
            tableHeader: !!(b.header && ri === 0),
            children: r.map((c, ci) => new D.TableCell({
              width: { size: colWs[ci] || colWs[0], type: D.WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              ...(b.header && ri === 0 ? { shading: { type: D.ShadingType.CLEAR, color: "auto", fill: b.accent ? hex(b.accent) : "EFEDFF" } } : {}),
              children: [new D.Paragraph({ children: runsToWord(c.runs, D, base, b.header && ri === 0 ? { bold: true } : {}) })],
            })),
          })),
        }));
        children.push(new D.Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      }
      case "image": {
        const img = await wordImage(b, loadImage);
        if (!img) { children.push(new D.Paragraph({ children: [new D.TextRun({ text: b.alt ? `[Image: ${b.alt}]` : "[Image]", italics: true, color: "6A7389" })] })); break; }
        let w = b.w || img.w, h = b.h && b.w ? b.h : Math.round(w * (img.h / img.w));
        if (b.full) {
          // "Set as full page": the picture alone on its page, as large as the page's text area allows.
          const contentHpx = ((ps.h - 2 * (page.margin || 25.4)) / 25.4) * 96 - 24;
          const k = Math.min(contentPx / img.w, contentHpx / img.h);
          w = Math.round(img.w * k); h = Math.round(img.h * k);
          if (children.length) children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
        }
        if (w > contentPx) { h = Math.round(h * (contentPx / w)); w = Math.round(contentPx); }
        children.push(new D.Paragraph({
          alignment: b.full ? D.AlignmentType.CENTER : ALIGN(D, b.align),
          spacing: { after: 120, ...(b.ps ? { before: b.ps * 20, after: b.ps * 20 } : {}) },
          children: [new D.ImageRun({ type: img.type, data: img.bytes, transformation: { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }, altText: { title: b.alt || "Image", description: b.alt || "Image", name: b.alt || "Image" } })],
        }));
        if (b.full && i < blocks.length - 1 && blocks[i + 1].type !== "pagebreak") children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
        break;
      }
      default: break;
    }
  }
  if (!children.length) children.push(new D.Paragraph({ children: [] }));

  const small = { size: 18, color: "6A7389" };
  const headers = page.header ? { default: new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: page.header, ...small })] })] }) } : undefined;
  const footParts = [];
  if (page.footer) footParts.push(new D.TextRun({ text: page.footer + (page.pageNumbers ? "    " : ""), ...small }));
  if (page.pageNumbers) footParts.push(new D.TextRun({ children: ["Page ", D.PageNumber.CURRENT, " of ", D.PageNumber.TOTAL_PAGES], ...small }));
  const footers = footParts.length ? { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: footParts })] }) } : undefined;

  const bodyFont = WORD_FONTS[doc.font] || "Calibri";
  return new D.Document({
    creator: "AsaanDesk Docs",
    title: doc.title || "Document",
    description: "Made with AsaanDesk Docs",
    styles: {
      default: {
        document: { run: { font: bodyFont, size: Math.round((doc.size || 11) * 2) } },
        heading1: { run: { font: bodyFont, size: HEADING_PT.h1 * 2, bold: true, color: "1B2133" }, paragraph: { spacing: { before: 240, after: 120 } } },
        heading2: { run: { font: bodyFont, size: HEADING_PT.h2 * 2, bold: true, color: "1B2133" }, paragraph: { spacing: { before: 200, after: 100 } } },
        heading3: { run: { font: bodyFont, size: HEADING_PT.h3 * 2, bold: true, color: "1B2133" }, paragraph: { spacing: { before: 160, after: 80 } } },
      },
    },
    numbering: numberingConfig(D),
    sections: [{
      properties: { page: { size: { width: mmToTwip(ps.w), height: mmToTwip(ps.h) }, margin: { top: margin, bottom: margin, left: margin, right: margin, header: Math.round(margin / 2), footer: Math.round(margin / 2) } } },
      ...(headers ? { headers } : {}),
      ...(footers ? { footers } : {}),
      children,
    }],
  });
}

/** Word file bytes (Uint8Array). */
export async function modelToDocx(doc, D, opts = {}) {
  const document = await buildWordDocument(doc, D, opts);
  if (typeof D.Packer.toArrayBuffer === "function") return new Uint8Array(await D.Packer.toArrayBuffer(document));
  return new Uint8Array(await D.Packer.toBuffer(document));
}

export { runsText };
