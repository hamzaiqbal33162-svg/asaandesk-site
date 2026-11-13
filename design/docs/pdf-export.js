// Doc model → PDF with pdf-lib and /pdf-editor/fontmatch.js (real, selectable text in the open fonts, own
// word-wrap for mixed styles, multi-page, lists, quotes, code, tables, images, header/footer with page numbers).
// Everything is passed in, so this file runs in the browser and in Node tests:
//   PDFLib, writeLines, pickWriter (from fontmatch.js), rasterize? (browser canvas, for scripts the fonts
//   lack, e.g. Urdu), loadImage? (browser: converts non PNG/JPEG images).
import { PAGE_SIZES, HEADING_PT, runsText } from "./model.js";
import { dataUrlBytes, imageSize } from "./docx-export.js";
import { DECOS, decoSvg, svgDataUrl } from "./decos.js";

const PT_PER_MM = 72 / 25.4;
const rgbOf = (hex) => { const h = String(hex || "#000000").replace("#", ""); const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0"); return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0); };
const roman = (n) => { const m = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]]; let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
const letter = (n) => { let s = ""; while (n > 0) { n--; s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };
const BULLETS = ["•", "–", "•"];
const INK = "#1b2133";

export async function modelToPdf(doc, { PDFLib, writeLines, pickWriter, rasterize = null, loadImage = null } = {}) {
  const { PDFDocument, rgb, PDFName, PDFString } = PDFLib;
  const out = await PDFDocument.create();
  out.setTitle(doc.title || "Document");
  out.setCreator("AsaanDesk Docs");
  out.setProducer("AsaanDesk Docs (pdf-lib)");
  const embedded = new Map();
  const ps = PAGE_SIZES[doc.page?.size] || PAGE_SIZES.A4;
  // Pageless: one long page (PDF's largest page height), cut to the text at the end; page breaks become a little space.
  const pageless = !!ps.pageless;
  const W = ps.w * PT_PER_MM, H = pageless ? 14400 : ps.h * PT_PER_MM, M = (doc.page?.margin || 25.4) * PT_PER_MM;
  const CW = W - 2 * M;
  const baseSize = doc.size || 11, docFont = doc.font || "calibri";
  // A scratch page for measuring (fonts are embedded per document); removed at the end.
  const measurePage = out.addPage([W, H]);
  const writers = new Map(), charOk = new Map();
  const styleKey = (s) => `${s.family}|${s.bold ? 1 : 0}|${s.italic ? 1 : 0}|${s.size}`;
  async function writer(s) {
    const k = styleKey(s);
    if (!writers.has(k)) writers.set(k, await pickWriter(out, measurePage, { size: s.size, family: s.family, bold: !!s.bold, italic: !!s.italic, embedded }, "a"));
    return writers.get(k);
  }
  async function supports(s, ch) {
    if (/\s/.test(ch)) return true;
    const k = `${s.family}|${s.bold ? 1 : 0}|${s.italic ? 1 : 0}|${ch}`;
    if (!charOk.has(k)) {
      let ok = true;
      try { await pickWriter(out, measurePage, { size: 10, family: s.family, bold: !!s.bold, italic: !!s.italic, embedded }, ch); } catch { ok = false; }
      charOk.set(k, ok);
    }
    return charOk.get(k);
  }
  const width = async (s, t) => (await writer(s)).widthOf(t);

  let page = null, y = 0;
  const pages = [];
  const newPage = () => { page = out.addPage([W, H]); pages.push(page); y = M; };
  const bottom = () => H - M;
  const ensure = (h) => { if (y + h > bottom() + 0.01 && y > M + 0.5) newPage(); };
  newPage();

  const addLink = (url, x1, y1, x2, y2) => {
    try {
      const annot = out.context.register(out.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x1, y1, x2, y2], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }));
      let annots = page.node.lookup(PDFName.of("Annots"));
      if (!annots) { annots = out.context.obj([]); page.node.set(PDFName.of("Annots"), annots); }
      annots.push(annot);
    } catch { /* links are a nice extra; the text is still there */ }
  };

  /** Run style for a token. */
  const tokStyle = (r, blk) => {
    const size0 = r.size || blk.size;
    const size = r.sup || r.sub ? Math.round(size0 * 0.7 * 10) / 10 : size0;
    return { family: r.code ? "mono" : (r.font || blk.family), bold: !!(r.b || blk.bold), italic: !!(r.i || blk.italic), size, color: r.link && !r.color ? "#0563c1" : (r.color || blk.color || INK), bg: r.bg || (r.code ? "#f1f5f9" : null), u: !!(r.u || r.link), s: !!r.s, link: r.link || null, sup: !!r.sup, sub: !!r.sub, base: size0, ls: blk.lsp ? (blk.lsp * size) / 1000 : 0 };
  };
  const chars = (t) => [...t].length;

  /** Splits runs into measured tokens; unsupported characters → "?" (or flags the block for rasterising). */
  async function tokens(runs, blk) {
    const toks = [];
    let foreign = false;
    for (const r of runs || []) {
      const s = tokStyle(r, blk);
      for (const piece of String(r.text).match(/\n| +|[^ \n]+/g) || []) {
        if (piece === "\n") { toks.push({ nl: true, s }); continue; }
        let text = "";
        for (const ch of piece) {
          if (await supports(s, ch)) text += ch;
          else { if (/\p{L}/u.test(ch)) foreign = true; text += "?"; }
        }
        toks.push({ text, s, space: /^ +$/.test(text), w: (await width(s, text)) + s.ls * chars(text) });
      }
    }
    return { toks, foreign };
  }

  /** Greedy word wrap into lines no wider than maxW. */
  async function wrap(toks, maxW, fallbackSize) {
    const lines = [];
    let cur = { toks: [], w: 0 };
    const finish = (hard) => {
      while (cur.toks.length && cur.toks[cur.toks.length - 1].space) cur.w -= cur.toks.pop().w;
      cur.hard = hard;
      cur.size = Math.max(fallbackSize, ...cur.toks.map((t) => t.s.base));
      lines.push(cur);
      cur = { toks: [], w: 0 };
    };
    for (const t of toks) {
      if (t.nl) { finish(true); continue; }
      if (t.space) { if (cur.toks.length) { cur.toks.push(t); cur.w += t.w; } continue; }
      if (cur.toks.length && cur.w + t.w > maxW + 0.01) finish(false);
      if (t.w > maxW) {
        // A word longer than the line: break it by letters.
        let piece = "";
        for (const ch of t.text) {
          const w2 = await width(t.s, piece + ch);
          if (piece && cur.w + w2 > maxW) { const pw = await width(t.s, piece); cur.toks.push({ ...t, text: piece, w: pw }); cur.w += pw; finish(false); piece = ""; }
          piece += ch;
        }
        if (piece) { const pw = await width(t.s, piece); cur.toks.push({ ...t, text: piece, w: pw }); cur.w += pw; }
        continue;
      }
      cur.toks.push(t);
      cur.w += t.w;
    }
    finish(true);
    return lines;
  }

  /** Draws one wrapped line at x (left of the line box), baseline yb (top-down). */
  async function drawLine(line, x, yb, boxW, align, justify) {
    const free = boxW - line.w;
    let start = x;
    if (align === "center") start = x + free / 2;
    else if (align === "right") start = x + free;
    const spaces = line.toks.filter((t) => t.space).length;
    const stretch = justify && !line.hard && spaces && free > 0 ? free / spaces : 0;
    // Merge neighbouring tokens of the same style into one piece of text (one text object per style run).
    const segs = [];
    let cx = start;
    for (const t of line.toks) {
      const w = t.w + (t.space ? stretch : 0);
      const last = segs[segs.length - 1];
      if (!stretch && last && styleKey(last.s) === styleKey(t.s) && last.s.color === t.s.color && last.s.u === t.s.u && last.s.s === t.s.s && last.s.bg === t.s.bg && last.s.link === t.s.link && last.s.sup === t.s.sup && last.s.sub === t.s.sub) { last.text += t.text; last.w += w; }
      else segs.push({ text: t.text, s: t.s, x: cx, w, space: t.space });
      cx += w;
    }
    for (const sg of segs) {
      if (sg.space && !sg.s.bg && !sg.s.u && !sg.s.s) continue;
      const s = sg.s;
      const py = H - yb + (s.sup ? s.base * 0.35 : s.sub ? -s.base * 0.12 : 0);
      if (s.bg) { const c = rgbOf(s.bg); page.drawRectangle({ x: sg.x, y: py - s.size * 0.25, width: sg.w, height: s.size * 1.15, color: rgb(c[0] / 255, c[1] / 255, c[2] / 255) }); }
      if (!sg.text.trim()) continue;
      let lines = [{ text: sg.text.replace(/ +$/, ""), x: sg.x, y: py }];
      if (s.ls) { // letter spacing: one piece per character
        lines = [];
        let cx = sg.x;
        for (const ch of sg.text.replace(/ +$/, "")) { if (ch !== " ") lines.push({ text: ch, x: cx, y: py }); cx += (await width(s, ch)) + s.ls; }
      }
      await writeLines(out, page, { lines, size: s.size, color: rgbOf(s.color), family: s.family, bold: s.bold, italic: s.italic, underline: s.u, embedded });
      if (s.s) { const c = rgbOf(s.color); page.drawLine({ start: { x: sg.x, y: py + s.size * 0.3 }, end: { x: sg.x + sg.w, y: py + s.size * 0.3 }, thickness: Math.max(0.5, s.size * 0.06), color: rgb(c[0] / 255, c[1] / 255, c[2] / 255) }); }
      if (s.link) addLink(s.link, sg.x, py - s.size * 0.25, sg.x + sg.w, py + s.size * 0.9);
    }
  }

  /** Lays out and draws runs as a paragraph; returns nothing, moves y. */
  async function paragraph(runs, blk) {
    const { toks, foreign } = await tokens(runs, blk);
    const lh = blk.lineHeight || 1.35;
    if (foreign && rasterize) {
      const img = await rasterize(runsText(runs), { size: blk.size, bold: blk.bold, italic: blk.italic, family: blk.family, color: blk.color || INK, align: blk.align, dir: blk.dir, widthPt: blk.width, lineHeight: lh });
      if (img) { await placeImageBytes(img.bytes, "png", img.widthPt, img.heightPt, blk.x, blk.width, blk.align || (blk.dir === "rtl" ? "right" : "left")); return; }
    }
    if (blk.band) { await bandParagraph(toks, blk, lh); return; }
    const lines = await wrap(toks, blk.width, blk.size);
    const align = blk.align === "justify" ? "left" : blk.align || (blk.dir === "rtl" ? "right" : "left");
    let first = true;
    for (const line of lines) {
      const lineH = line.size * lh;
      ensure(lineH);
      const yb = y + (lineH - line.size) / 2 + line.size * 0.8;
      if (first && blk.marker) await blk.marker(yb, line.size);
      first = false;
      await drawLine(line, blk.x, yb, blk.width, align, blk.align === "justify");
      y += lineH;
    }
  }

  /** A coloured block: background rectangle (+ our decoration picture), text inside with padding. */
  async function bandParagraph(toks, blk, lh) {
    const b = blk.band, pad = (b.pad ?? 14) * 0.75, deco = !b.bgimg && b.deco && DECOS[b.deco];
    const decoLeft = deco && deco.pos === "left";
    const minH = (b.minh || 0) * 0.75;
    const padL = decoLeft ? Math.max(82, minH * 0.95) : Math.max(pad, 13.5), padR = b.bgimg && (b.ov === "split" || b.ov === "soft") ? blk.width * 0.44 : deco && !decoLeft ? Math.max(90, minH * 1.3) : Math.max(pad, 13.5);
    const innerW = Math.max(40, blk.width - padL - padR);
    const lines = await wrap(toks, innerW, blk.size);
    const textH = lines.reduce((a, l) => a + l.size * lh, 0);
    const h = Math.min(H - 2 * M, Math.max(minH, textH + 2 * pad));
    y += 4;
    ensure(h);
    const top = y;
    if (b.bg) { const c = rgbOf(b.bg); page.drawRectangle({ x: blk.x, y: H - top - h, width: blk.width, height: h, color: rgb(c[0] / 255, c[1] / 255, c[2] / 255) }); }
    if (b.bgimg && loadImage && PDFLib.pushGraphicsState && PDFLib.clip) {
      // Photo band: the photo covers the block (cropped by a clip), then the overlay in the band colour keeps text readable.
      try {
        const got = await loadImage(b.bgimg);
        const img = await out.embedPng(got.bytes);
        const by = H - top - h, k = Math.max(blk.width / img.width, h / img.height), iw = img.width * k, ih = img.height * k;
        page.pushOperators(PDFLib.pushGraphicsState(), PDFLib.rectangle(blk.x, by, blk.width, h), PDFLib.clip(), PDFLib.endPath());
        page.drawImage(img, { x: blk.x + (blk.width - iw) / 2, y: by + (h - ih) / 2, width: iw, height: ih });
        page.pushOperators(PDFLib.popGraphicsState());
        const c = b.ov === "soft" ? [255, 255, 255] : rgbOf(b.bg || "#1b2133"), col = rgb(c[0] / 255, c[1] / 255, c[2] / 255);
        if (b.ov === "tint") page.drawRectangle({ x: blk.x, y: by, width: blk.width, height: h, color: col, opacity: 0.66 });
        else { const steps = 12; for (let i = 0; i < steps; i++) { const f = i / steps, a = b.ov === "split" || b.ov === "soft" ? (f < 0.44 ? 0.97 : Math.max(0, 0.97 - (f - 0.44) * 1.8)) : 0.94 - f * 0.74; page.drawRectangle({ x: blk.x + f * blk.width, y: by, width: blk.width / steps + 0.5, height: h, color: col, opacity: a }); } }
      } catch { /* the band colour stays when the photo cannot be read */ }
    }
    if (deco && loadImage && !b.bgimg) {
      try {
        const got = await loadImage(svgDataUrl(decoSvg(b.deco, b.dc, b.dc2)));
        const img = await out.embedPng(got.bytes);
        const ih = h * 0.86, iw = Math.min(decoLeft ? padL - 8 : padR - 8, ih * (img.width / img.height));
        const ihh = iw / (img.width / img.height);
        page.drawImage(img, { x: decoLeft ? blk.x + 10 : blk.x + blk.width - iw - 8, y: H - top - h / 2 - ihh / 2, width: iw, height: ihh });
      } catch { /* decoration is optional */ }
    }
    let yy = top + Math.max(pad, (h - textH) / 2);
    const align = blk.align === "justify" ? "left" : blk.align || (blk.dir === "rtl" ? "right" : "left");
    for (const line of lines) {
      const lineH = line.size * lh;
      await drawLine(line, blk.x + padL, yy + (lineH - line.size) / 2 + line.size * 0.8, innerW, align, blk.align === "justify");
      yy += lineH;
    }
    y = top + h + 4;
  }

  async function placeImageBytes(bytes, type, wPt, hPt, x, boxW, align) {
    const img = type === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    let w = wPt, h = hPt;
    if (w > boxW) { h *= boxW / w; w = boxW; }
    const maxH = H - 2 * M;
    if (h > maxH) { w *= maxH / h; h = maxH; }
    ensure(h);
    const ix = align === "center" ? x + (boxW - w) / 2 : align === "right" ? x + boxW - w : x;
    page.drawImage(img, { x: ix, y: H - y - h, width: w, height: h });
    y += h;
  }

  /** Canva's "Set as full page": the picture alone on its page, edge to edge (cropped to fill); pageless: full width. */
  let coverNext = null;
  async function fullPageImage(bytes, size) {
    const img = size.type === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    if (pageless) {
      const h = W * (size.h / size.w);
      if (y > M + 1) y += 6;
      page.drawImage(img, { x: 0, y: H - y - h, width: W, height: h });
      y += h + 6;
      return;
    }
    if (y > M + 1) newPage();
    const pageH = H;
    const k = Math.max(W / size.w, pageH / size.h), w = size.w * k, h = size.h * k;
    const { pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = PDFLib;
    if (pushGraphicsState && rectangle && clip) page.pushOperators(pushGraphicsState(), rectangle(0, 0, W, pageH), clip(), endPath());
    page.drawImage(img, { x: (W - w) / 2, y: (pageH - h) / 2, width: w, height: h });
    if (popGraphicsState && rectangle && clip) page.pushOperators(popGraphicsState());
    page.fullCover = true;
    newPage();
    coverNext = page;
  }

  const textBlk = (b, extra = {}) => ({ band: b.bg || b.deco ? b : null, size: baseSize, family: docFont, bold: false, italic: false, color: INK, align: b.align, dir: b.dir, lineHeight: b.lineHeight, lsp: b.lsp || 0, x: M + (b.indent || 0) * 36, width: CW - (b.indent || 0) * 36, ...extra });

  const blocks = doc.blocks || [];
  const counters = [], kinds = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== "li") { counters.length = 0; kinds.length = 0; }
    // Paragraph / block spacing: space before (not at the top of a page) and after.
    const ps = +b.ps || 0;
    if (ps && y > M + 1) y += ps;
    switch (b.type) {
      case "h1": case "h2": case "h3": {
        const size = HEADING_PT[b.type];
        const before = { h1: 14, h2: 12, h3: 9 }[b.type];
        if (y > M + 1) y += before;
        ensure(size * 1.3 + baseSize * 2.6); // keep a heading with the next lines
        await paragraph(b.runs, textBlk(b, { size, bold: true, lineHeight: b.lineHeight || 1.25 }));
        y += 5;
        break;
      }
      case "p": {
        if (!b.runs.length) { y += baseSize * (b.lineHeight || 1.35); break; }
        await paragraph(b.runs, textBlk(b));
        y += baseSize * 0.55;
        break;
      }
      case "quote": {
        const top = y, startPage = page;
        await paragraph(b.runs, textBlk(b, { italic: true, color: "#475569", x: M + 16 + (b.indent || 0) * 36, width: CW - 16 - (b.indent || 0) * 36 }));
        const bar = rgb(0xb4 / 255, 0xb0 / 255, 0xf5 / 255);
        if (page === startPage) page.drawRectangle({ x: M + 2, y: H - y, width: 3, height: y - top, color: bar });
        y += baseSize * 0.55;
        break;
      }
      case "li": {
        const L = Math.min(8, b.level || 0);
        counters.length = L + 1;
        if (kinds[L] !== b.list) { counters[L] = 0; kinds[L] = b.list; }
        kinds.length = L + 1;
        counters[L] = (counters[L] || 0) + 1;
        const n = counters[L];
        const indent = 20 * (L + 1);
        const blk = textBlk(b, { x: M + indent, width: CW - indent });
        const ink = rgbOf(INK);
        blk.marker = async (yb, size) => {
          if (b.list === "check") {
            const s = size * 0.78, bx = M + indent - 15, by = H - yb - size * 0.05;
            page.drawRectangle({ x: bx, y: by, width: s, height: s, borderColor: rgb(0.36, 0.3, 0.94), borderWidth: 0.9, color: b.checked ? rgb(0.36, 0.3, 0.94) : undefined });
            if (b.checked) page.drawSvgPath(`M ${s * 0.2} ${s * 0.52} L ${s * 0.42} ${s * 0.76} L ${s * 0.8} ${s * 0.24}`, { x: bx, y: by + s, borderColor: rgb(1, 1, 1), borderWidth: Math.max(1, s * 0.14) });
            return;
          }
          const mark = b.list === "number" ? [String(n), letter(n), roman(n)][L % 3] + "." : BULLETS[L % 3];
          const s = { family: docFont, bold: false, italic: false, size };
          const mw = await width(s, mark);
          await writeLines(out, page, { lines: [{ text: mark, x: M + indent - 6 - mw, y: H - yb }], size, color: ink, family: docFont, embedded });
        };
        await paragraph(b.runs.length ? b.runs : [{ text: " " }], blk);
        y += 2.5;
        if (blocks[i + 1]?.type !== "li") y += baseSize * 0.45;
        break;
      }
      case "code": {
        const s = { family: "mono", bold: false, italic: false, size: Math.max(7, baseSize - 1.5), base: Math.max(7, baseSize - 1.5), color: "#1f2937" };
        const pad = 6, lineH = s.size * 1.35;
        const lines = [];
        for (const raw of String(b.text || "").split("\n")) {
          const { toks } = await tokens([{ text: raw || " ", code: false, font: "mono" }], { ...textBlk(b), family: "mono", size: s.size, color: "#1f2937" });
          for (const l of await wrap(toks, CW - 2 * pad, s.size)) lines.push(l);
        }
        let k = 0;
        y += 2;
        while (k < lines.length) {
          ensure(lineH + 2 * pad);
          const room = Math.max(1, Math.floor((bottom() - y - 2 * pad) / lineH));
          const part = lines.slice(k, k + room);
          const h = part.length * lineH + 2 * pad;
          page.drawRectangle({ x: M, y: H - y - h, width: CW, height: h, color: rgb(0xf1 / 255, 0xf5 / 255, 0xf9 / 255) });
          let yy = y + pad;
          for (const l of part) { await drawLine(l, M + pad, yy + (lineH - s.size) / 2 + s.size * 0.8, CW - 2 * pad, "left", false); yy += lineH; }
          y += h;
          k += part.length;
        }
        y += baseSize * 0.6;
        break;
      }
      case "hr": {
        ensure(14);
        const c = rgbOf(b.hc || "#c7cbe0"), col = rgb(c[0] / 255, c[1] / 255, c[2] / 255), yy = H - y - 7;
        const line = (dy, thickness, dashArray) => page.drawLine({ start: { x: M, y: yy + dy }, end: { x: M + CW, y: yy + dy }, thickness, color: col, ...(dashArray ? { dashArray } : {}) });
        if (b.hs === "dashed") line(0, 1.5, [6, 4]);
        else if (b.hs === "dotted") line(0, 2.2, [0.1, 4.2]);
        else if (b.hs === "double") { line(1.6, 0.9); line(-1.6, 0.9); }
        else if (b.hs === "thick") line(0, 3);
        else line(0, 1);
        y += 14;
        break;
      }
      case "pagebreak":
        if (pageless) y += baseSize * 2; else if (!(coverNext === page && y <= M + 0.5)) newPage();
        break;
      case "table": {
        const cols = Math.max(1, ...b.rows.map((r) => r.length));
        // Column widths (Canva-style columns and sidebars keep their %), else equal columns.
        const widths = b.cw && b.cw.length === cols ? b.cw.map((p) => (CW * p) / 100) : Array(cols).fill(CW / cols);
        const colX = widths.map((_, i) => M + widths.slice(0, i).reduce((s, w) => s + w, 0));
        const noLines = b.tstyle === "cols", pad = noLines ? 7 : 4.5;
        const border = rgb(0x94 / 255, 0xa3 / 255, 0xb8 / 255);
        const lh = 1.3;
        y += 2;
        for (let ri = 0; ri < b.rows.length; ri++) {
          const head = b.header && ri === 0;
          const cells = [];
          for (let ci = 0; ci < b.rows[ri].length; ci++) {
            const c = b.rows[ri][ci];
            const { toks } = await tokens(c.runs.length ? c.runs : [{ text: " " }], { size: baseSize, family: docFont, bold: head, italic: false, color: INK });
            cells.push(await wrap(toks, widths[ci] - 2 * pad, baseSize));
          }
          const rowH = Math.max(...cells.map((ls) => ls.reduce((a, l) => a + l.size * lh, 0))) + 2 * pad;
          ensure(rowH);
          const top = y;
          if (head) { const ac = b.accent ? rgbOf(b.accent).map((v) => v / 255) : [0xef / 255, 0xed / 255, 0xff / 255]; page.drawRectangle({ x: M, y: H - top - rowH, width: CW, height: rowH, color: rgb(ac[0], ac[1], ac[2]) }); }
          for (let ci = 0; ci < cells.length; ci++) {
            let yy = top + pad;
            for (const l of cells[ci]) { const lineH = l.size * lh; await drawLine(l, colX[ci] + pad, yy + (lineH - l.size) / 2 + l.size * 0.8, widths[ci] - 2 * pad, "left", false); yy += lineH; }
          }
          // Grid lines: top, bottom, and every column edge (none for plain columns).
          if (!noLines) {
            page.drawLine({ start: { x: M, y: H - top }, end: { x: M + CW, y: H - top }, thickness: 0.75, color: border });
            page.drawLine({ start: { x: M, y: H - top - rowH }, end: { x: M + CW, y: H - top - rowH }, thickness: 0.75, color: border });
            for (let ci = 0; ci <= cols; ci++) { const x = ci < cols ? colX[ci] : M + CW; page.drawLine({ start: { x, y: H - top }, end: { x, y: H - top - rowH }, thickness: 0.75, color: border }); }
          }
          y = top + rowH;
        }
        y += baseSize * 0.8;
        break;
      }
      case "image": {
        let data = dataUrlBytes(b.src), size = data && imageSize(data.bytes);
        if ((!size || (size.type !== "png" && size.type !== "jpg")) && loadImage) {
          const got = await loadImage(b.src).catch(() => null);
          if (got) { data = { bytes: got.bytes }; size = imageSize(got.bytes); }
        }
        if (!size || (size.type !== "png" && size.type !== "jpg")) { await paragraph([{ text: b.alt ? `[Image: ${b.alt}]` : "[Image]", i: true, color: "#6a7389" }], textBlk(b)); break; }
        if (b.full) { await fullPageImage(data.bytes, size); break; }
        const wPx = b.w || size.w, hPx = b.h && b.w ? b.h : wPx * (size.h / size.w);
        await placeImageBytes(data.bytes, size.type, wPx * 0.75, hPx * 0.75, M, CW, b.align || "left");
        y += baseSize * 0.6;
        break;
      }
      default: break;
    }
    if (ps) y += ps;
  }
  // A full-page cover as the last block leaves a fresh empty page behind it: drop that page.
  if (!pageless && coverNext && page === coverNext && y <= M + 0.5 && pages.length > 1) {
    out.removePage(out.getPageCount() - 1);
    pages.pop();
    page = pages[pages.length - 1];
  }

  if (pageless) {
    // Cut every (normally the only) page to its text, with the bottom margin; no header, footer or page numbers.
    for (const pg of pages) { const used = Math.min(H, (pg === page ? y : H - M) + M); pg.setMediaBox(0, H - used, W, used); pg.setCropBox?.(0, H - used, W, used); }
    out.removePage(0);
    return out.save();
  }
  // Header, footer and page numbers on every page.
  const p0 = doc.page || {};
  const total = pages.length;
  const grey = rgbOf("#6a7389");
  const small = 9;
  const safe = async (text) => { let t = ""; for (const ch of text) t += (await supports({ family: docFont }, ch)) ? ch : "?"; return t; };
  for (let k = 0; k < total; k++) {
    page = pages[k];
    if (page.fullCover) continue;
    if (p0.header) {
      const text = await safe(p0.header);
      await writeLines(out, page, { lines: [{ text, x: M, y: H - M / 2 + 2, boxW: CW, align: "center" }], size: small, color: grey, family: docFont, embedded });
    }
    const foot = [p0.footer || "", p0.pageNumbers !== false ? `Page ${k + 1} of ${total}` : ""].filter(Boolean).join("    ");
    if (foot) {
      const text = await safe(foot);
      await writeLines(out, page, { lines: [{ text, x: M, y: M / 2 - 4, boxW: CW, align: "center" }], size: small, color: grey, family: docFont, embedded });
    }
  }
  out.removePage(0);
  return out.save();
}
