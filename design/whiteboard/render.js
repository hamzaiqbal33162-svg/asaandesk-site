// Board objects -> drawing primitives (pure). One primitive list drives the screen (SVG), the SVG file,
// the PNG (canvas) and the PDF (/pdf-editor/vector.js drawPrims, real text). Primitive shapes:
//   path:  { d, fill, stroke, sw, op, cap, join, blend }
//   text:  { t, x, y (baseline), size, fill, bold, italic, font: 'sans', anchor: 'start'|'middle'|'end' }
//   image: { img: src, x, y, w, h, op }
import { shapePath, roundRectPath, routeConnector, roundedPolylinePath, arrowHeadPath, pointAlong, strokePath, transformPath, pointsBounds, unionRect } from "./geometry.js";

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
export function textBlock(lines, size, box, { align = "center", valign = "middle", fill = "#1b2133", bold = false, italic = false } = {}) {
  const lh = size * LINE, total = lines.length * lh;
  const top = valign === "top" ? box.y : valign === "bottom" ? box.y + box.h - total : box.y + (box.h - total) / 2;
  const x = align === "left" ? box.x : align === "right" ? box.x + box.w : box.x + box.w / 2;
  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  return lines.map((t, i) => ({ t, x, y: top + lh * i + lh / 2 + size * 0.35, size, fill, bold, italic, font: "sans", anchor })).filter((p) => p.t.trim());
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
  const box = { x: o.x + NOTE_PAD, y: o.y + NOTE_PAD, w: Math.max(4, o.w - NOTE_PAD * 2), h: Math.max(4, o.h - NOTE_PAD * 2) };
  return { box, ...fitText(o.text || "", box.w, box.h, { max: o.size || 28, min: 8 }) };
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
      text(textBlock(L.lines, L.size, L.box, { fill: o.textColor || "#1b2133", align: o.align || "center" }));
      break;
    }
    case "shape": {
      prims.push({ d: shapePath(o.kind, o.x, o.y, o.w, o.h), fill: o.fill || "none", stroke: o.stroke || "none", sw: o.sw ?? 2 });
      const L = shapeLayout(o);
      text(textBlock(L.lines, L.size, L.box, { fill: o.textColor || "#1b2133", bold: !!o.bold }));
      break;
    }
    case "text": {
      const L = textLayout(o);
      text(textBlock(L.lines, L.size, { x: o.x, y: o.y, w: o.w, h: L.h }, { align: o.align || "left", valign: "top", fill: o.color || "#1b2133", bold: !!o.bold }));
      break;
    }
    case "frame": {
      prims.push({ d: roundRectPath(o.x, o.y, o.w, o.h, 4), fill: o.fill || "#ffffff", stroke: "#cfd4e4", sw: 1.5 });
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
          prims.push({ d: transformPath(part.d, sx, sy, o.x, o.y), fill, stroke, sw: (part.sw ?? 1) * Math.min(sx, sy), cap: part.cap, join: part.join, ...(part.op != null && part.op < 1 ? { op: part.op } : {}) });
        }
      }
      break;
    }
    case "image":
      prims.push({ img: o.src, x: o.x, y: o.y, w: o.w, h: o.h });
      break;
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
  if (o.type === "stroke") { const m = (o.width || 3) / 2; return { x: o.x - m, y: o.y - m, w: o.w + m * 2, h: o.h + m * 2 }; }
  if (o.type === "note") return { x: o.x, y: o.y, w: o.w + 2, h: o.h + 4 };
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}
export function boardBounds(objects, byId) { return unionRect(objects.map((o) => objectBounds(o, byId))); }

/* ---------------------------------------------------------------- SVG */
export const SANS_CSS = "'AD Sans', Arial, Helvetica, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => Math.round(v * 100) / 100;
/** SVG elements (no wrapper) for a primitive list. */
export function primsToSvg(prims) {
  return prims.map((p) => {
    if (p.img != null) return `<image href="${esc(p.img)}" x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}" preserveAspectRatio="none"${p.op != null && p.op < 1 ? ` opacity="${p.op}"` : ""}/>`;
    if (p.t != null) {
      const anchor = p.anchor === "middle" ? "middle" : p.anchor === "end" ? "end" : "start";
      return `<text x="${num(p.x)}" y="${num(p.y)}" font-size="${num(p.size)}" font-family="${SANS_CSS}" font-weight="${p.bold ? 700 : 400}"${p.italic ? ' font-style="italic"' : ""} text-anchor="${anchor}" fill="${p.fill || "#000000"}"${p.op != null && p.op < 1 ? ` opacity="${p.op}"` : ""} style="white-space:pre">${esc(p.t)}</text>`;
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
      if (im) ctx.drawImage(im, p.x, p.y, p.w, p.h);
    } else if (p.t != null) {
      ctx.font = `${p.italic ? "italic " : ""}${p.bold ? 700 : 400} ${p.size}px ${SANS_CSS.replace(/'/g, '"')}`;
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
