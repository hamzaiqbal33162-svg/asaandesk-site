// Board exports (pure; the PDF writer gets pdf-lib and /pdf-editor/vector.js drawPrims passed in).
import { rectsIntersect } from "./geometry.js";
import { objectPrims, objectBounds, primsToSvg } from "./render.js";
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
  const body = objects.map((o) => `<g data-type="${o.type}">${primsToSvg(objectPrims(o, byId))}</g>`).join("\n");
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
  const origin = [-r.x * s, H + r.y * s];
  for (const o of objects) {
    const prims = objectPrims(o, byId);
    for (const p of prims) {
      if (p.img == null) continue;
      let img = images.get(p.img);
      if (img === undefined) {
        const d = dataUrlBytes(p.img);
        img = null;
        try { if (d && /png/.test(d.mime)) img = await out.embedPng(d.bytes); else if (d && /jpe?g/.test(d.mime)) img = await out.embedJpg(d.bytes); } catch { img = null; }
        images.set(p.img, img);
      }
      if (img) page.drawImage(img, { x: origin[0] + p.x * s, y: origin[1] - (p.y + p.h) * s, width: p.w * s, height: p.h * s, opacity: p.op ?? 1 });
    }
    const shapes = prims.filter((p) => p.img == null && p.t == null), texts = prims.filter((p) => p.t != null);
    if (shapes.length) await drawPrims(out, page, shapes, { origin, sx: s, embedded });
    // Text line by line: a letter the open fonts don't have (emoji, some scripts) only drops that letter.
    for (const t of texts) {
      try { await drawPrims(out, page, [t], { origin, sx: s, embedded }); continue; } catch {}
      const safe = String(t.t).replace(UNSAFE, "").replace(/\s{2,}/g, " ");
      let done = false;
      if (safe.trim()) try { await drawPrims(out, page, [{ ...t, t: safe }], { origin, sx: s, embedded }); done = true; } catch {}
      dropped.push(done ? t.t.replace(safe, "").trim() || t.t : t.t);
    }
  }
  if (dropped.length) opts.onWarning?.(`Some letters (like emoji) can't be written in a PDF with the open fonts and were left out.`, dropped);
  return out.save();
}
// Letters outside what the open fonts reliably cover: Latin, Greek, Cyrillic, common punctuation and the euro sign.
const UNSAFE = /[^\u0000-\u052f\u2010-\u2027\u2030-\u205e\u20ac]/gu;

/** File name from the board name. */
export function fileBase(name) { return (String(name || "board").trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60) || "board").toLowerCase(); }
