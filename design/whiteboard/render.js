// Board objects -> drawing primitives (pure). One primitive list drives the screen (SVG), the SVG file,
// the PNG (canvas) and the PDF (/pdf-editor/vector.js drawPrims, real text). Primitive shapes:
//   path:  { d, fill, stroke, sw, op, cap, join, blend }
//   text:  { t, x, y (baseline), size, fill, bold, italic, font: 'sans', anchor: 'start'|'middle'|'end' }
//   image: { img: src, x, y, w, h, op, fit: 'cover', fx, fy (focus 0..1), zoom, nw, nh (natural size), round }
//          fit "cover" fills the box and crops around the focus (a face); round clips it to a circle (people avatars).
import { shapePath, roundRectPath, routeConnector, roundedPolylinePath, arrowHeadPath, pointAlong, strokePath, transformPath, pointsBounds, unionRect, ellipsePath } from "./geometry.js";

/* ---------------------------------------------------------------- photo crops */
const fin = (v, d, lo, hi) => { const n = +v; return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
/**
 * Part of a picture (fractions 0..1 of its width and height) shown in a w × h box with fit "cover": the box is filled,
 * the focus point (fx, fy) is kept as near the middle as the edges allow, zoom > 1 crops tighter. ar = picture w / h.
 */
export function coverCrop(w, h, ar, fx = 0.5, fy = 0.5, zoom = 1) {
  const box = w / Math.max(1e-6, h), z = fin(zoom, 1, 1, 8);
  let cw = 1, ch = 1;
  if (ar > box) cw = box / ar; else ch = ar / box;
  cw /= z; ch /= z;
  const cx = fin(fx, 0.5, 0, 1), cy = fin(fy, 0.5, 0, 1);
  return { x: Math.max(0, Math.min(1 - cw, cx - cw / 2)), y: Math.max(0, Math.min(1 - ch, cy - ch / 2)), w: cw, h: ch };
}

/* ---------------------------------------------------------------- text metrics */
// Advance widths (1/1000 em) of ASCII 32..126 for Helvetica / Arial / Liberation Sans (metric-compatible),
// so wrapping is the same on screen, in the SVG, PNG and in the PDF (which embeds Liberation Sans).
const W_REG = "278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584".split(",").map(Number);
const W_BOLD = "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584".split(",").map(Number);
export function charWidth(ch, bold = false) {
  const c = ch.codePointAt(0);
  if (c >= 32 && c < 127) return (bold ? W_BOLD : W_REG)[c - 32];
  if (c >= 0x2e80) return 1000; // CJK and wide symbols
  return bold ? 611 : 556;
}
export function textWidth(text, size, bold = false) {
  let w = 0;
  for (const ch of String(text)) w += charWidth(ch, bold);
  return (w * size) / 1000;
}
/** Word-wraps text into lines no wider than maxW (explicit newlines kept, long words broken). */
export function wrapText(text, maxW, size, bold = false) {
  const out = [];
  for (const para of String(text ?? "").split("\n")) {
    const words = para.split(/ +/);
    let line = "";
    for (let word of words) {
      const tryLine = line ? line + " " + word : word;
      if (textWidth(tryLine, size, bold) <= maxW || !line && textWidth(word, size, bold) <= maxW) { line = tryLine; continue; }
      if (line) { out.push(line); line = ""; }
      while (textWidth(word, size, bold) > maxW && [...word].length > 1) {
        const chars = [...word];
        let k = 1;
        while (k < chars.length && textWidth(chars.slice(0, k + 1).join(""), size, bold) <= maxW) k++;
        out.push(chars.slice(0, k).join(""));
        word = chars.slice(k).join("");
      }
      line = word;
    }
    out.push(line);
  }
  return out;
}
export const LINE = 1.25;
/** Largest font size (max .. min) whose wrapped lines fit a w × h box. */
export function fitText(text, w, h, { max = 32, min = 9, bold = false } = {}) {
  for (let size = max; size >= min; size -= size > 16 ? 2 : 1) {
    const lines = wrapText(text, w, size, bold);
    if (lines.length * size * LINE <= h && lines.every((l) => textWidth(l, size, bold) <= w + 0.01)) return { size, lines };
  }
  return { size: min, lines: wrapText(text, w, min, bold) };
}
/** Text prims for lines centred vertically in a box (anchor by align). */
export function textBlock(lines, size, box, { align = "center", valign = "middle", fill = "#1b2133", bold = false, italic = false, font = "sans" } = {}) {
  const lh = size * LINE, total = lines.length * lh;
  const top = valign === "top" ? box.y : valign === "bottom" ? box.y + box.h - total : box.y + (box.h - total) / 2;
  const x = align === "left" ? box.x : align === "right" ? box.x + box.w : box.x + box.w / 2;
  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  return lines.map((t, i) => ({ t, x, y: top + lh * i + lh / 2 + size * 0.35, size, fill, bold, italic, font: font || "sans", anchor })).filter((p) => p.t.trim());
}

/* ---------------------------------------------------------------- per-object layout */
export const NOTE_PAD = 14;
/** Inner text box of a shape kind (fraction of the box that stays inside the outline). */
export function shapeTextBox(o) {
  const pad = 8;
  const k = { ellipse: [0.72, 0.72, 0.5], diamond: [0.56, 0.56, 0.5], star: [0.4, 0.36, 0.56], triangle: [0.56, 0.42, 0.7] }[o.kind];
  if (!k) return { x: o.x + pad, y: o.y + pad, w: Math.max(4, o.w - pad * 2), h: Math.max(4, o.h - pad * 2) };
  const w = o.w * k[0], h = o.h * k[1];
  return { x: o.x + (o.w - w) / 2, y: o.y + o.h * k[2] - h / 2, w, h };
}
export function noteLayout(o) {
  const ah = o.author ? 14 : 0; // room for the author's name at the bottom
  const box = { x: o.x + NOTE_PAD, y: o.y + NOTE_PAD, w: Math.max(4, o.w - NOTE_PAD * 2), h: Math.max(4, o.h - NOTE_PAD * 2 - ah) };
  return { box, ...fitText(o.text || "", box.w, box.h, { max: o.size || 28, min: 8, bold: !!o.bold }) };
}
/** Emoji reaction badges on a sticky note (emoji + count), from the bottom-right corner leftwards. */
export function reactionBadges(o) {
  const list = Array.isArray(o.reactions) ? o.reactions : [];
  const out = [];
  let x = o.x + o.w - 6;
  for (const e of list.slice(0, 8)) { const w = 46; x -= w; out.push({ e, x, y: o.y + o.h - 13, w, h: 26 }); x -= 5; }
  return out;
}
export function shapeLayout(o) {
  const box = shapeTextBox(o);
  return { box, ...fitText(o.text || "", box.w, box.h, { max: o.size || 18, min: 8, bold: !!o.bold }) };
}
export function textLayout(o) {
  const size = o.size || 24;
  const lines = wrapText(o.text || "", Math.max(10, o.w), size, !!o.bold);
  return { size, lines, h: Math.max(size * LINE, lines.length * size * LINE) };
}
const elementColor = (v, el) => {
  if (v == null || v === "" || v === "none") return "none";
  if (typeof v === "string" && v[0] === "$") return el.colors?.["c" + v.slice(1)] || "#5b4cf0";
  return v;
};

/**
 * Primitives of one object. byId resolves connector ends. opts.hideText skips text (while it is being edited).
 */
export function objectPrims(o, byId, opts = {}) {
  const prims = [];
  const text = (list) => { if (!opts.hideText) prims.push(...list); };
  switch (o.type) {
    case "note": {
      prims.push({ d: roundRectPath(o.x + 1.5, o.y + 4, o.w, o.h, 6), fill: "#1b2133", op: 0.08 });
      prims.push({ d: roundRectPath(o.x, o.y, o.w, o.h, 6), fill: o.color || "#ffe27a" });
      const L = noteLayout(o);
      text(textBlock(L.lines, L.size, L.box, { fill: o.textColor || "#1b2133", align: o.align || "center", bold: !!o.bold, italic: !!o.italic, font: o.font }));
      if (o.author) prims.push({ t: String(o.author).slice(0, 40), x: o.x + 10, y: o.y + o.h - 9, size: 11, fill: "#5d6478", bold: true, font: "sans", anchor: "start", op: 0.85 });
      for (const b of reactionBadges(o)) {
        prims.push({ d: roundRectPath(b.x, b.y, b.w, b.h, 13), fill: "#ffffff", stroke: "#d5d9e6", sw: 1 });
        prims.push({ t: b.e, x: b.x + 7, y: b.y + 18, size: 14, fill: "#1b2133", font: "sans", anchor: "start", emoji: true });
        prims.push({ t: "1", x: b.x + 34, y: b.y + 17.5, size: 12, fill: "#5d6478", bold: true, font: "sans", anchor: "middle" });
      }
      break;
    }
    case "shape": {
      prims.push({ d: shapePath(o.kind, o.x, o.y, o.w, o.h), fill: o.fill || "none", stroke: o.stroke || "none", sw: o.sw ?? 2, ...(o.opacity != null && o.opacity < 1 ? { op: o.opacity } : {}), ...(o.dash ? { dash: [8, 6] } : {}) });
      const L = shapeLayout(o);
      text(textBlock(L.lines, L.size, L.box, { fill: o.textColor || "#1b2133", bold: !!o.bold, italic: !!o.italic, font: o.font, align: o.align || "center" }));
      break;
    }
    case "text": {
      const L = textLayout(o);
      text(textBlock(L.lines, L.size, { x: o.x, y: o.y, w: o.w, h: L.h }, { align: o.align || "left", valign: "top", fill: o.color || "#1b2133", bold: !!o.bold, italic: !!o.italic, font: o.font }));
      break;
    }
    case "frame": {
      prims.push({ d: roundRectPath(o.x, o.y, o.w, o.h, 4), fill: o.fill || "#ffffff", stroke: o.stroke || "#cfd4e4", sw: 1.5 });
      text([{ t: o.name || "Frame", x: o.x + 2, y: o.y - 9, size: 14, fill: "#6a7389", bold: true, font: "sans", anchor: "start" }]);
      break;
    }
    case "connector": {
      const { points } = routeConnector(o, byId);
      if (points.length < 2) break;
      const color = o.stroke || "#334155", sw = o.sw ?? 2;
      prims.push({ d: o.kind === "elbow" ? roundedPolylinePath(points, 10) : roundedPolylinePath(points, 0), fill: "none", stroke: color, sw, ...(o.dash ? { dash: [6, 6] } : {}) });
      const n = points.length, size = 9 + sw * 2;
      if (o.arrow === "end" || o.arrow === "both" || o.arrow == null) prims.push({ d: arrowHeadPath(points[n - 1], points[n - 2], size), fill: color, stroke: color, sw: 1, join: "round" });
      if (o.arrow === "both") prims.push({ d: arrowHeadPath(points[0], points[1], size), fill: color, stroke: color, sw: 1, join: "round" });
      if (o.text && !opts.hideText) {
        const { p } = pointAlong(points, 0.5), size2 = 14, w = Math.max(...String(o.text).split("\n").map((l) => textWidth(l, size2))) + 12;
        const lines = String(o.text).split("\n"), h = lines.length * size2 * LINE + 6;
        prims.push({ d: roundRectPath(p[0] - w / 2, p[1] - h / 2, w, h, 6), fill: "#ffffff" });
        prims.push(...textBlock(lines, size2, { x: p[0] - w / 2, y: p[1] - h / 2, w, h }, { fill: color }));
      }
      break;
    }
    case "stroke": {
      const pts = o.points.map(([x, y]) => [o.x + x, o.y + y]);
      const hl = o.tool === "highlighter";
      // Glow pen: two soft wide strokes of the same colour under the line.
      if (o.glow) for (const [k, op] of [[4.2, 0.16], [2.4, 0.28]]) prims.push({ d: strokePath(pts), fill: "none", stroke: o.color || "#1b2133", sw: (o.width || 3) * k, op, cap: "round", join: "round" });
      prims.push({ d: strokePath(pts), fill: "none", stroke: o.color || "#1b2133", sw: o.width || 3, op: o.opacity ?? (hl ? 0.38 : 1), cap: "round", join: "round", ...(hl ? { blend: "multiply" } : {}) });
      break;
    }
    case "sticker": {
      const el = o.element || {}, [vw, vh] = el.vb || [100, 100], sx = o.w / vw, sy = o.h / vh;
      for (const part of el.parts || []) {
        if (part.t != null) {
          if (opts.hideText) continue;
          prims.push({ t: part.t, x: o.x + part.x * sx, y: o.y + part.y * sy, size: part.size * sy, fill: elementColor(part.fill ?? "#000000", el), bold: !!part.bold, italic: !!part.italic, font: part.font || "sans", anchor: part.anchor || "start", op: part.op });
        } else {
          const fill = elementColor(part.fill, el), stroke = elementColor(part.stroke, el);
          if (fill === "none" && stroke === "none") continue;
          prims.push({ d: transformPath(part.d, sx, sy, o.x, o.y), fill, stroke, sw: (part.sw ?? 1) * Math.min(sx, sy), cap: part.cap, join: part.join, ...(part.op != null && part.op < 1 ? { op: part.op } : {}), ...(Array.isArray(part.dash) && part.dash.length ? { dash: part.dash.map((v) => v * Math.min(sx, sy)) } : {}) });
        }
      }
      break;
    }
    case "image": {
      // fit "cover": the picture fills its box and is cropped around its focus (template photos: the face); default:
      // stretched to the box. round: a circle (people avatars) on its fill colour, with a ring (stroke, sw) on top.
      const cover = o.fit === "cover", round = !!o.round, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      if (round && o.fill && o.fill !== "none") prims.push({ d: ellipsePath(cx, cy, o.w / 2, o.h / 2), fill: o.fill, under: true });
      const p = { img: o.src, x: o.x, y: o.y, w: o.w, h: o.h };
      if (cover) {
        p.fit = "cover";
        if (o.fx != null || o.fy != null) { p.fx = fin(o.fx, 0.5, 0, 1); p.fy = fin(o.fy, 0.5, 0, 1); }
        if (+o.zoom > 1) p.zoom = fin(o.zoom, 1, 1, 8);
        if (+o.nw > 0 && +o.nh > 0) { p.nw = +o.nw; p.nh = +o.nh; }
      }
      if (round) p.round = true;
      prims.push(p);
      if (round && o.stroke && o.stroke !== "none" && +o.sw > 0) prims.push({ d: ellipsePath(cx, cy, o.w / 2, o.h / 2), fill: "none", stroke: o.stroke, sw: +o.sw });
      break;
    }
  }
  return prims;
}

/** Bounds of what an object draws (connectors from their route, frames include their name label). */
export function objectBounds(o, byId) {
  if (o.type === "connector") {
    const { points } = routeConnector(o, byId);
    const b = pointsBounds(points), m = 12;
    return { x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 };
  }
  if (o.type === "frame") return { x: o.x, y: o.y - 26, w: o.w, h: o.h + 26 };
  if (o.type === "stroke") { const m = ((o.width || 3) * (o.glow ? 4.2 : 1)) / 2; return { x: o.x - m, y: o.y - m, w: o.w + m * 2, h: o.h + m * 2 }; }
  if (o.rot) return rotatedBox(o);
  if (o.type === "note") return { x: o.x, y: o.y, w: o.w + 2, h: o.h + (Array.isArray(o.reactions) && o.reactions.length ? 16 : 4) };
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}
/** Rotation (degrees, clockwise) around the object's centre: only boxes (not frames, connectors). */
export const canRotate = (o) => !!o && !["frame", "connector"].includes(o.type);
export const centerOf = (o) => [o.x + o.w / 2, o.y + o.h / 2];
export function rotatePoint(x, y, cx, cy, deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), dx = x - cx, dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}
/** Axis-aligned box around a rotated object. */
export function rotatedBox(o) {
  const [cx, cy] = centerOf(o);
  const pts = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(([x, y]) => rotatePoint(x, y, cx, cy, o.rot || 0));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
/** SVG transform attribute value for a rotated object ("" when not rotated). */
export function rotTransform(o) {
  if (!o.rot || !canRotate(o)) return "";
  const [cx, cy] = centerOf(o);
  return `rotate(${Math.round(o.rot * 100) / 100} ${Math.round(cx * 100) / 100} ${Math.round(cy * 100) / 100})`;
}
/** SVG of one object (rotation included). */
export function objectSvg(o, byId, opts) {
  const body = primsToSvg(objectPrims(o, byId, opts)), t = rotTransform(o);
  return t ? `<g transform="${t}">${body}</g>` : body;
}
export function boardBounds(objects, byId) { return unionRect(objects.map((o) => objectBounds(o, byId))); }

/* ---------------------------------------------------------------- SVG */
export const SANS_CSS = "'AD Sans', Arial, Helvetica, sans-serif";
export const FONT_CSS = {
  sans: SANS_CSS, serif: "'AD Serif', 'Times New Roman', serif", mono: "'AD Mono', 'Courier New', monospace",
  calibri: "'AD Calibri', Calibri, Carlito, sans-serif", cambria: "'AD Cambria', Cambria, Caladea, serif",
};
export const fontCss = (f) => FONT_CSS[f] || SANS_CSS;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => Math.round(v * 100) / 100;
const AL = (v) => (v < 0.4 ? "Min" : v > 0.6 ? "Max" : "Mid");
/**
 * One picture. Cover crops with a known natural size (nw, nh) are exact: a nested <svg> whose viewBox is the part of the
 * picture to show (its viewport clips it to the box), focus and zoom included. Round pictures are clipped to an ellipse
 * with CSS clip-path on the picture itself (no ids, so many thumbnails can share a page). Without a natural size the
 * picture is aligned towards its focus (xMin/xMid/xMax, YMin/YMid/YMax).
 */
function imageSvg(p) {
  const op = p.op != null && p.op < 1 ? ` opacity="${p.op}"` : "";
  const clip = (s) => ` style="clip-path:${s};-webkit-clip-path:${s}"`;
  if (p.fit === "cover" && p.nw > 0 && p.nh > 0 && p.w > 0 && p.h > 0) {
    const f = coverCrop(p.w, p.h, p.nw / p.nh, p.fx, p.fy, p.zoom), v = { x: f.x * p.nw, y: f.y * p.nh, w: f.w * p.nw, h: f.h * p.nh };
    const round = p.round ? clip(`ellipse(${num(v.w / 2)}px ${num(v.h / 2)}px at ${num(v.x + v.w / 2)}px ${num(v.y + v.h / 2)}px)`) : "";
    return `<svg x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}" viewBox="${num(v.x)} ${num(v.y)} ${num(v.w)} ${num(v.h)}" preserveAspectRatio="none" overflow="hidden"${op}><image href="${esc(p.img)}" width="${num(p.nw)}" height="${num(p.nh)}" preserveAspectRatio="none"${round}/></svg>`;
  }
  const par = p.fit === "cover" ? `x${AL(p.fx ?? 0.5)}Y${AL(p.fy ?? 0.5)} slice` : "none";
  return `<image href="${esc(p.img)}" x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}" preserveAspectRatio="${par}"${op}${p.round ? clip("ellipse(50% 50%)") : ""}/>`;
}
/** SVG elements (no wrapper) for a primitive list. */
export function primsToSvg(prims) {
  return prims.map((p) => {
    if (p.img != null) return imageSvg(p);
    if (p.t != null) {
      const anchor = p.anchor === "middle" ? "middle" : p.anchor === "end" ? "end" : "start";
      return `<text x="${num(p.x)}" y="${num(p.y)}" font-size="${num(p.size)}" font-family="${fontCss(p.font)}" font-weight="${p.bold ? 700 : 400}"${p.italic ? ' font-style="italic"' : ""} text-anchor="${anchor}" fill="${p.fill || "#000000"}"${p.op != null && p.op < 1 ? ` opacity="${p.op}"` : ""} style="white-space:pre">${esc(p.t)}</text>`;
    }
    const a = [`d="${p.d}"`, `fill="${p.fill && p.fill !== "none" ? p.fill : "none"}"`];
    if (p.stroke && p.stroke !== "none") a.push(`stroke="${p.stroke}"`, `stroke-width="${num(p.sw ?? 1)}"`, `stroke-linecap="${p.cap || "round"}"`, `stroke-linejoin="${p.join || "round"}"`);
    if (p.dash) a.push(`stroke-dasharray="${p.dash.join(" ")}"`);
    if (p.op != null && p.op < 1) a.push(`opacity="${p.op}"`);
    if (p.blend) a.push(`style="mix-blend-mode:${p.blend}"`);
    return `<path ${a.join(" ")}/>`;
  }).join("");
}

/** Draws primitives on a canvas 2D context (PNG export). images: Map src -> drawable. */
export function drawPrimsCanvas(ctx, prims, { images = new Map(), Path2D: P2 = globalThis.Path2D } = {}) {
  for (const p of prims) {
    ctx.save();
    ctx.globalAlpha = p.op ?? 1;
    if (p.blend) ctx.globalCompositeOperation = p.blend;
    if (p.img != null) {
      const im = images.get(p.img);
      const iw = im?.naturalWidth || im?.width, ih = im?.naturalHeight || im?.height;
      if (im && p.round && p.w > 0 && p.h > 0) {
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); else ctx.arc(p.x + p.w / 2, p.y + p.h / 2, Math.min(p.w, p.h) / 2, 0, Math.PI * 2);
        ctx.clip();
      }
      if (im && p.fit === "cover" && iw && ih && p.w > 0 && p.h > 0) {
        // the part of the picture around its focus (centre when it has none), zoomed when asked
        const c = coverCrop(p.w, p.h, iw / ih, p.fx, p.fy, p.zoom);
        ctx.drawImage(im, c.x * iw, c.y * ih, c.w * iw, c.h * ih, p.x, p.y, p.w, p.h);
      } else if (im) ctx.drawImage(im, p.x, p.y, p.w, p.h);
    } else if (p.t != null) {
      ctx.font = `${p.italic ? "italic " : ""}${p.bold ? 700 : 400} ${p.size}px ${fontCss(p.font).replace(/'/g, '"')}`;
      ctx.textAlign = p.anchor === "middle" ? "center" : p.anchor === "end" ? "right" : "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = p.fill || "#000000";
      ctx.fillText(p.t, p.x, p.y);
    } else {
      const path = new P2(p.d);
      if (p.fill && p.fill !== "none") { ctx.fillStyle = p.fill; ctx.fill(path); }
      if (p.stroke && p.stroke !== "none") {
        ctx.strokeStyle = p.stroke; ctx.lineWidth = p.sw ?? 1; ctx.lineCap = p.cap || "round"; ctx.lineJoin = p.join || "round";
        if (p.dash) ctx.setLineDash(p.dash);
        ctx.stroke(path);
      }
    }
    ctx.restore();
  }
}
