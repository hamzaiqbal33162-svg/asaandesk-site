// Board exports (pure; the PDF writer gets pdf-lib and /pdf-editor/vector.js drawPrims passed in).
import { rectsIntersect } from "./geometry.js";
import { objectPrims, objectBounds, primsToSvg, objectSvg, canRotate, centerOf, coverCrop } from "./render.js";
import { byIdOf } from "./model.js";

export const PDF_SCALE = 0.75; // 96 px = 72 pt
export const MARGIN = 40;

/** What an export covers: the whole board (with a margin) or one frame (exactly its area). */
export function exportScope(board, { frameId = null, margin = MARGIN } = {}) {
  const byId = byIdOf(board);
  if (frameId) {
    const f = board.objects.find((o) => o.id === frameId && o.type === "frame");
    if (!f) throw new Error("That frame is no longer on the board.");
    const rect = { x: f.x, y: f.y, w: f.w, h: f.h };
    return { rect, objects: board.objects.filter((o) => rectsIntersect(rect, objectBounds(o, byId))), byId, title: f.name || "Frame" };
  }
  const objects = board.objects.slice();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of objects) { const b = objectBounds(o, byId); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  const rect = x0 === Infinity ? { x: 0, y: 0, w: 800, h: 600 } : { x: Math.floor(x0 - margin), y: Math.floor(y0 - margin), w: Math.ceil(x1 - x0 + margin * 2), h: Math.ceil(y1 - y0 + margin * 2) };
  return { rect, objects, byId, title: board.name || "Board" };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Standalone SVG file of the board or a frame. */
export function boardToSvg(board, opts = {}) {
  const { rect: r, objects, byId, title } = exportScope(board, opts);
  const body = objects.map((o) => `<g data-type="${o.type}">${objectSvg(o, byId)}</g>`).join("\n");
  const clip = opts.frameId ? ` clip-path="url(#ad-frame)"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r.w}" height="${r.h}" viewBox="${r.x} ${r.y} ${r.w} ${r.h}">
<title>${esc(title)}</title>
${opts.frameId ? `<defs><clipPath id="ad-frame"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/></clipPath></defs>\n` : ""}<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#ffffff"/>
<g${clip}>
${body}
</g>
</svg>
`;
}

/** The SVG file with every same-origin library photo (/pdf-editor/photos/…, e.g. the people photos of a team board)
 *  embedded as a data: URL, so the downloaded file shows its photos when opened on its own. */
export async function inlineLibraryPhotos(svg, fetchFn = globalThis.fetch) {
  const urls = [...new Set([...String(svg).matchAll(/href="(\/pdf-editor\/photos\/[\w.-]+\.(?:jpe?g|png))"/gi)].map((m) => m[1]))];
  for (const u of urls) {
    try {
      const r = await fetchFn(u);
      if (!r.ok) continue;
      const b = new Uint8Array(await r.arrayBuffer());
      let s = "";
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      svg = svg.split(`href="${u}"`).join(`href="data:${/png$/i.test(u) ? "image/png" : "image/jpeg"};base64,${btoa(s)}"`);
    } catch { /* keep the link */ }
  }
  return svg;
}

/** Bytes and type of a data: URL. */
export function dataUrlBytes(src) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(src || ""));
  if (!m) return null;
  const mime = (m[1] || "").toLowerCase();
  if (m[2]) { const bin = atob(m[3]); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return { mime, bytes: out }; }
  return { mime, bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
}

/**
 * Vector PDF of the board or a frame: one page the size of the area (0.75 pt per board px, smaller if the
 * board is huge). Shapes are PDF paths and every word is real text (drawPrims -> fontmatch writeLines).
 * deps: { PDFLib, drawPrims }.
 */
export async function exportPdf(board, { PDFLib, drawPrims }, opts = {}) {
  const { rect: r, objects, byId, title } = exportScope(board, opts);
  const s = Math.min(PDF_SCALE, 14400 / Math.max(r.w, r.h));
  const out = await PDFLib.PDFDocument.create();
  out.setTitle(title);
  out.setCreator("AsaanDesk Whiteboard");
  out.setProducer("AsaanDesk");
  const W = r.w * s, H = r.h * s;
  const page = out.addPage([W, H]);
  const embedded = new Map(), images = new Map(), dropped = [];
  const origin0 = [-r.x * s, H + r.y * s];
  for (const o0 of objects) {
    // Rotated objects: draw them around their centre with drawPrims' rotation (PDF y goes up, so the angle flips).
    const rotated = !!(o0.rot && canRotate(o0));
    const [ccx, ccy] = rotated ? centerOf(o0) : [0, 0];
    const o = rotated ? { ...o0, x: o0.x - ccx, y: o0.y - ccy } : o0;
    const origin = rotated ? [origin0[0] + ccx * s, origin0[1] - ccy * s] : origin0;
    const rotationDeg = rotated ? -o0.rot : 0;
    const prims = objectPrims(o, byId);
    // Shapes drawn under a picture (the colour circle behind a round people photo) go first.
    const under = prims.filter((p) => p.under);
    if (under.length) await drawPrims(out, page, under, { origin, sx: s, embedded, rotationDeg });
    for (const p of prims) {
      if (p.img == null) continue;
      let img = images.get(p.img);
      if (img === undefined) {
        let d = dataUrlBytes(p.img);
        img = null;
        // Same-origin template photos (/pdf-editor/photos/…): read the file.
        if (!d && /^\/pdf-editor\/photos\/[\w.-]+\.(jpe?g|png)$/i.test(p.img) && typeof fetch === "function") {
          try { const r = await fetch(p.img); if (r.ok) d = { mime: /png$/i.test(p.img) ? "image/png" : "image/jpeg", bytes: new Uint8Array(await r.arrayBuffer()) }; } catch { d = null; }
        }
        try { if (d && /png/.test(d.mime)) img = await out.embedPng(d.bytes); else if (d && /jpe?g/.test(d.mime)) img = await out.embedJpg(d.bytes); } catch { img = null; }
        images.set(p.img, img);
      }
      if (img && rotated) {
        // pdf-lib turns an image around its bottom-left corner: place that corner where the rotation puts it.
        const t = (rotationDeg * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t), lx = p.x, ly = p.y + p.h;
        page.drawImage(img, { x: origin[0] + (cos * lx + sin * ly) * s, y: origin[1] + (sin * lx - cos * ly) * s, width: p.w * s, height: p.h * s, rotate: PDFLib.degrees(rotationDeg), opacity: p.op ?? 1 });
      } else if (img && (p.fit === "cover" || p.round) && img.width && img.height && PDFLib.clip) {
        // Fill the box and crop around the focus: draw the picture bigger, clipped to the box (an ellipse when round).
        const bx = origin[0] + p.x * s, by = origin[1] - (p.y + p.h) * s, bw = p.w * s, bh = p.h * s;
        const c = p.fit === "cover" ? coverCrop(p.w, p.h, img.width / img.height, p.fx, p.fy, p.zoom) : { x: 0, y: 0, w: 1, h: 1 };
        const dw = bw / c.w, dh = bh / c.h;
        page.pushOperators(PDFLib.pushGraphicsState(), ...clipPath(PDFLib, bx, by, bw, bh, p.round), PDFLib.clip(), PDFLib.endPath());
        page.drawImage(img, { x: bx - c.x * dw, y: by + bh + c.y * dh - dh, width: dw, height: dh, opacity: p.op ?? 1 });
        page.pushOperators(PDFLib.popGraphicsState());
      } else if (img) page.drawImage(img, { x: origin[0] + p.x * s, y: origin[1] - (p.y + p.h) * s, width: p.w * s, height: p.h * s, opacity: p.op ?? 1 });
    }
    // Emoji reaction marks have no letters in the open PDF fonts: the badge and its count are kept, the emoji is left out quietly.
    const shapes = prims.filter((p) => p.img == null && p.t == null && !p.under), texts = prims.filter((p) => p.t != null && !p.emoji);
    if (shapes.length) await drawPrims(out, page, shapes, { origin, sx: s, embedded, rotationDeg });
    // Text line by line: a letter the open fonts don't have (emoji, some scripts) only drops that letter.
    for (const t of texts) {
      try { await drawPrims(out, page, [t], { origin, sx: s, embedded, rotationDeg }); continue; } catch {}
      const safe = String(t.t).replace(UNSAFE, "").replace(/\s{2,}/g, " ");
      let done = false;
      if (safe.trim()) try { await drawPrims(out, page, [{ ...t, t: safe }], { origin, sx: s, embedded, rotationDeg }); done = true; } catch {}
      dropped.push(done ? t.t.replace(safe, "").trim() || t.t : t.t);
    }
  }
  if (dropped.length) opts.onWarning?.(`Some letters (like emoji) can't be written in a PDF with the open fonts and were left out.`, dropped);
  return out.save();
}
/** PDF path operators for a clip: the box, or the ellipse inside it (four Bézier arcs) when round and pdf-lib has curves. */
function clipPath(PDFLib, x, y, w, h, round) {
  if (!round || !PDFLib.moveTo || !PDFLib.appendBezierCurve) return [PDFLib.rectangle(x, y, w, h)];
  const k = 0.5522847498, cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2, B = PDFLib.appendBezierCurve;
  return [PDFLib.moveTo(cx + rx, cy), B(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry), B(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy),
    B(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry), B(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy), PDFLib.closePath ? PDFLib.closePath() : PDFLib.lineTo(cx + rx, cy)];
}
// Letters outside what the open fonts reliably cover: Latin, Greek, Cyrillic, common punctuation and the euro sign.
const UNSAFE = /[^\u0000-\u052f\u2010-\u2027\u2030-\u205e\u20ac]/gu;

/** File name from the board name. */
export function fileBase(name) { return (String(name || "board").trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60) || "board").toLowerCase(); }
