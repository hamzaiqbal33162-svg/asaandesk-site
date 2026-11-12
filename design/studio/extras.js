// AsaanDesk Studio extras: QR code and barcode elements, ZIP of pages, editable PowerPoint export,
// print proofing (safe area, bleed, small text, low-res photos) and the print sheet (many cards on one page).
import QR from "./vendor/qrcode-core.js";
import { presetPx, bleedPx, toPx } from "./presets.js";
import { aabb } from "./geometry.js";
import { walk, imageLayer, clone, newDesign, newId } from "./model.js";
import { textHeight } from "./textlayout.js";
import { loadImages, ensureFonts, drawLayer, drawBackground } from "./canvas.js";
import { loadScript, vectorEnv, needsVector, exportRaster } from "./exporter.js";

/* ---------------- QR code and barcode (vector elements, recolourable) ---------------- */
/** QR code element for text / URL / vCard. c1 = dark modules, c2 = background. */
export function qrElement(text, ecl = "M") {
  const q = QR.create(String(text || " "), { errorCorrectionLevel: ecl });
  const n = q.modules.size, data = q.modules.data, pad = 4, N = n + 2 * pad;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!data[y * n + x]) continue;
      let run = 1;
      while (x + run < n && data[y * n + x + run]) run++;
      d += `M${x + pad} ${y + pad}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return { id: "qr-code", name: "QR code", vb: [N, N], parts: [{ d: `M0 0H${N}V${N}H0Z`, fill: "$2" }, { d, fill: "$1" }], defaults: { c1: "#111827", c2: "#ffffff" }, qr: { text: String(text), version: q.version } };
}
/** vCard 3.0 text for a "digital business card" QR code. */
export function vcard({ name = "", org = "", title = "", phone = "", email = "", url = "" } = {}) {
  const e = (s) => String(s || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, " ");
  const parts = String(name).trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : "", first = parts.join(" ");
  return ["BEGIN:VCARD", "VERSION:3.0", `N:${e(last)};${e(first)};;;`, `FN:${e(name)}`, org && `ORG:${e(org)}`, title && `TITLE:${e(title)}`, phone && `TEL;TYPE=CELL:${e(phone)}`, email && `EMAIL:${e(email)}`, url && `URL:${e(url)}`, "END:VCARD"].filter(Boolean).join("\n");
}
// Code 39: n = narrow, w = wide; bar, space, bar … (9 elements, 3 wide).
const C39 = { "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn",
  N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
  "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn", $: "nwnwnwnnn", "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn" };
/** Code 39 barcode element (letters, digits, - . space $ / + %), with the text under the bars. */
export function barcodeElement(text) {
  const s = String(text || "").toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "").slice(0, 24) || "0000";
  const seq = "*" + s + "*";
  const narrow = 1, wide = 2.5, gap = 1, q = 10;
  let x = q, d = "";
  for (const ch of seq) {
    const pat = C39[ch];
    for (let i = 0; i < 9; i++) { const w = pat[i] === "w" ? wide : narrow; if (i % 2 === 0) d += `M${x} 4h${w}v40h-${w}z`; x += w; }
    x += gap;
  }
  const W = x + q - gap;
  return { id: "barcode", name: "Barcode", vb: [W, 58], parts: [{ d: `M0 0H${W}V58H0Z`, fill: "$2" }, { d, fill: "$1" }, { t: s, x: W / 2, y: 55, size: 9, fill: "$1", anchor: "middle", font: "mono" }], defaults: { c1: "#111827", c2: "#ffffff" }, barcode: { text: s } };
}

/* ---------------- ZIP (store, no compression) ---------------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
/** files: [{ name, data: Uint8Array | string }] -> Uint8Array (a .zip any system can open). */
export function zipFiles(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
/** Every page as PNG (or JPG) in one ZIP: name-1.png, name-2.png … */
export async function pagesZip(design, { type = "png", base = "design", dpi = null, scale = 1 } = {}) {
  const files = [];
  for (let i = 0; i < design.pages.length; i++) {
    const r = await exportRaster(design, i, { scale: dpi ? null : scale, dpi, type });
    files.push({ name: `${base}-${i + 1}.${type}`, data: new Uint8Array(await r.blob.arrayBuffer()) });
  }
  return new Blob([zipFiles(files)], { type: "application/zip" });
}

/* ---------------- PowerPoint (editable text and shapes; the rest as pictures) ---------------- */
const PPT_FONT = { sans: "Arial", serif: "Times New Roman", mono: "Courier New", calibri: "Calibri", cambria: "Cambria" };
const hex = (c) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.slice(1).toUpperCase() : null);
async function layerPng(l, env, k = 2) {
  const flat = { ...clone(l), x: 0, y: 0, rotation: 0 };
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(l.w * k)); c.height = Math.max(1, Math.round(l.h * k));
  const ctx = c.getContext("2d");
  ctx.scale(k, k);
  drawLayer(ctx, flat, env);
  return c.toDataURL("image/png");
}
/** Builds a .pptx (Blob). Text and simple shapes stay editable; speaker notes are kept. */
export async function exportPptx(design, { onStatus = () => {} } = {}) {
  if (!window.PptxGenJS) await loadScript(new URL("./vendor/pptxgen.bundle.js", import.meta.url).href);
  const env0 = needsVector(design) ? await vectorEnv() : {};
  const images = await loadImages(design);
  await ensureFonts(design);
  const env = { images, chartPrims: env0.chartPrims, tablePrims: env0.tablePrims, time: null };
  const { w: W, h: H } = presetPx(design.preset);
  const IN = (px) => px / 96;
  const pptx = new window.PptxGenJS();
  pptx.defineLayout({ name: "AD", width: IN(W), height: IN(H) });
  pptx.layout = "AD";
  pptx.title = design.name || "Presentation";
  pptx.company = "AsaanDesk";
  for (let i = 0; i < design.pages.length; i++) {
    onStatus(`Page ${i + 1} of ${design.pages.length}…`);
    const pg = design.pages[i], slide = pptx.addSlide();
    const bgc = hex(pg.background?.color);
    if (bgc) slide.background = { color: bgc };
    else if (pg.background?.gradient || pg.background?.image) {
      const c = document.createElement("canvas"); c.width = Math.round(W); c.height = Math.round(H);
      drawBackground(c.getContext("2d"), pg.background, W, H, 0, env);
      slide.background = { data: c.toDataURL("image/png") };
    }
    if (pg.hidden) slide.hidden = true;
    for (const l of pg.layers) {
      if (l.hidden) continue;
      const box = { x: IN(l.x), y: IN(l.y), w: IN(l.w), h: IN(l.h), rotate: l.rotation || 0 };
      const tr = l.opacity != null && l.opacity < 1 ? Math.round((1 - l.opacity) * 100) : 0;
      if (l.type === "text" && !l.text.outline && !l.text.shadow) {
        const t = l.text;
        slide.addText(t.content, { ...box, fontFace: PPT_FONT[t.family] || "Arial", fontSize: Math.max(1, t.size * 0.75), color: hex(t.color) || "1B2133", bold: !!t.bold, italic: !!t.italic, underline: t.underline ? { style: "sng" } : undefined, align: t.align === "justify" ? "justify" : t.align || "left", valign: "top", margin: 0, lineSpacingMultiple: t.lineHeight || 1.2, charSpacing: (t.letterSpacing || 0) * 0.75, fill: t.bg ? { color: hex(t.bg.color) || "FDE68A" } : undefined, transparency: tr || undefined, fit: "none", wrap: true });
        continue;
      }
      if (l.type === "shape" && ["rect", "ellipse", "triangle", "star", "heart"].includes(l.shape.kind) && !(l.shape.fill === "none" && !hex(l.shape.stroke))) {
        const s = l.shape;
        const type = s.kind === "rect" ? (s.radius ? "roundRect" : "rect") : s.kind === "ellipse" ? "ellipse" : s.kind === "triangle" ? "triangle" : s.kind === "star" ? "star5" : "heart";
        const opts = { ...box, fill: hex(s.fill) ? { color: hex(s.fill), transparency: tr } : { type: "none" }, line: hex(s.stroke) && s.strokeWidth ? { color: hex(s.stroke), width: s.strokeWidth * 0.75 } : { type: "none" } };
        if (type === "roundRect") opts.rectRadius = Math.min(0.5, s.radius / Math.min(l.w, l.h));
        slide.addShape(pptx.ShapeType[type] || type, opts);
        continue;
      }
      slide.addImage({ data: await layerPng(l, env), ...box, transparency: tr || undefined });
    }
    if (pg.notes) slide.addNotes(pg.notes);
  }
  onStatus("Saving the file…");
  return pptx.write({ outputType: "blob" });
}

/* ---------------- print proofing ---------------- */
/** Safe margin from the trim edge in px (0.125 in on print; 3 % of the short side on screen designs). */
export function safeMargin(P) { const { w, h } = presetPx(P); return P.unit === "px" ? Math.round(Math.min(w, h) * 0.03) : toPx(0.125, "in"); }
/**
 * Checks every page: text too close to the edge, small print text, coloured edges that stop at the trim
 * (no bleed), low-resolution photos and things that are off the page. Returns
 * [{ page, id, kind, msg, fix? }] where fix() changes the design in place.
 */
export function proofDesign(design) {
  const P = design.preset, { w: W, h: H } = presetPx(P), print = P.unit !== "px", b = bleedPx(P), m = safeMargin(P);
  const out = [];
  design.pages.forEach((pg, pi) => {
    for (const l of pg.layers) {
      if (l.hidden) continue;
      const bx = aabb(l), name = l.name || l.type;
      if (bx.x > W || bx.y > H || bx.x + bx.w < 0 || bx.y + bx.h < 0) { out.push({ page: pi, id: l.id, kind: "outside", msg: `"${name}" is off the page`, fix: () => { pg.layers = pg.layers.filter((x) => x.id !== l.id); } }); continue; }
      if (l.type === "text") {
        if (!l.rotation && (bx.x < m - 0.5 || bx.y < m - 0.5 || bx.x + bx.w > W - m + 0.5 || bx.y + bx.h > H - m + 0.5)) {
          out.push({ page: pi, id: l.id, kind: "edge", msg: `Text "${name}" is too close to the edge${print ? " and may be cut off" : ""}`, fix: () => {
            if (l.w > W - 2 * m) { l.w = W - 2 * m; l.h = textHeight(l.text, l.w); }
            l.x = Math.min(Math.max(l.x, m), W - m - l.w); l.y = Math.min(Math.max(l.y, m), H - m - l.h);
          } });
        }
        if (print && l.text.size * 0.75 < 6.5) out.push({ page: pi, id: l.id, kind: "small", msg: `Text "${name}" is ${(l.text.size * 0.75).toFixed(1)} pt, too small to read in print (use 7 pt or more)`, fix: () => { l.text.size = Math.ceil(7 / 0.75); l.h = textHeight(l.text, l.w); } });
      }
      if (print && b > 0 && ["shape", "image", "frame"].includes(l.type) && !l.rotation) {
        const touch = [bx.x <= 1 && bx.x > -b + 0.5, bx.y <= 1 && bx.y > -b + 0.5, bx.x + bx.w >= W - 1 && bx.x + bx.w < W + b - 0.5, bx.y + bx.h >= H - 1 && bx.y + bx.h < H + b - 0.5];
        if (touch.some(Boolean) && !(l.type === "shape" && l.shape.fill === "none")) out.push({ page: pi, id: l.id, kind: "bleed", msg: `"${name}" stops at the trim edge: extend it into the bleed so no white line shows after cutting`, fix: () => {
          if (touch[0]) { l.w += l.x + b; l.x = -b; }
          if (touch[1]) { l.h += l.y + b; l.y = -b; }
          if (touch[2]) l.w = W + b - l.x;
          if (touch[3]) l.h = H + b - l.y;
        } });
      }
      if (print) {
        for (const [x] of walk([l])) {
          const im = x.type === "image" ? x.image : x.type === "frame" ? x.frame.image : null;
          if (!im?.nw) continue;
          const dpi = Math.round(Math.min(im.nw * (im.crop?.w || 1) / (x.w / 96), im.nh * (im.crop?.h || 1) / (x.h / 96)));
          if (dpi < 150) out.push({ page: pi, id: x.id, kind: "lowres", msg: `Photo "${x.name || "photo"}" prints at about ${dpi} dpi (150+ looks sharp): use a bigger photo or make it smaller` });
        }
      }
    }
  });
  return out;
}

/* ---------------- print sheet: many cards, labels or stickers on one Letter / A4 page ---------------- */
/** A new design (Letter or A4) holding `count` copies of page `index` as pictures, with cut lines. */
export async function printSheet(design, index = 0, { paper = "letter", gap = 0.125 } = {}) {
  const sheet = newDesign(paper === "a4" ? "a4" : "letter", { name: (design.name || "Design") + " – print sheet" });
  const S = presetPx(sheet.preset), C = presetPx(design.preset), g = toPx(gap, "in"), mg = toPx(0.4, "in");
  const cols = Math.max(1, Math.floor((S.w - 2 * mg + g) / (C.w + g))), rows = Math.max(1, Math.floor((S.h - 2 * mg + g) / (C.h + g)));
  const r = await exportRaster(design, index, { dpi: 300, type: "png" });
  const src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
  const x0 = (S.w - (cols * C.w + (cols - 1) * g)) / 2, y0 = (S.h - (rows * C.h + (rows - 1) * g)) / 2;
  const layers = [];
  for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) layers.push(imageLayer(src, { x: x0 + cc * (C.w + g), y: y0 + rr * (C.h + g), w: C.w, h: C.h, nw: r.width, nh: r.height, name: `Copy ${rr * cols + cc + 1}` }));
  sheet.pages = [{ id: newId("p"), background: { color: "#ffffff" }, layers }];
  return { design: sheet, count: cols * rows, cols, rows };
}
