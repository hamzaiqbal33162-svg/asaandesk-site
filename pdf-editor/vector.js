// Vector drawing primitives shared by stickers, charts and tables. The same list draws the on-screen
// preview (SVG) and the PDF (pdf-lib paths + real text), so what you see is exactly what gets saved.
//
// Primitives use a local box: origin top-left, y down, any unit.
//   path: { d, fill, stroke, sw, cap, join, op }      fill/stroke: "#rrggbb" | "none"
//   text: { t, x, y, size, fill, bold, italic, font, anchor, ls }   x, y = baseline anchor; font: sans | serif | mono
import { writeLines } from "./fontmatch.js";

export const CSS_FAMILY = {
  sans: '"AD Sans", Arial, Helvetica, sans-serif',
  serif: '"AD Serif", "Times New Roman", Times, serif',
  mono: '"AD Mono", "Courier New", Courier, monospace',
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => +(+v).toFixed(3);

export const rectPath = (x, y, w, h, r = 0) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${num(x)} ${num(y)}H${num(x + w)}V${num(y + h)}H${num(x)}Z`;
  return `M${num(x + r)} ${num(y)}H${num(x + w - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w)} ${num(y + r)}V${num(y + h - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w - r)} ${num(y + h)}H${num(x + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x)} ${num(y + h - r)}V${num(y + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + r)} ${num(y)}Z`;
};
export const circlePath = (cx, cy, r) => `M${num(cx - r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 1 ${num(cx + r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 1 ${num(cx - r)} ${num(cy)}Z`;
export const linePath = (x1, y1, x2, y2) => `M${num(x1)} ${num(y1)}L${num(x2)} ${num(y2)}`;

/** SVG markup for a primitive list drawn in a w × h box (viewBox vw × vh, default the same). */
export function primsToSvg(prims, w, h, { vw = w, vh = h, className = "", preserve = "none" } = {}) {
  const body = prims.map((p) => {
    if (p.t !== undefined) {
      const fam = CSS_FAMILY[p.font] || CSS_FAMILY.sans;
      const anchor = p.anchor === "middle" || p.anchor === "center" ? "middle" : p.anchor === "end" || p.anchor === "right" ? "end" : "start";
      return `<text x="${num(p.x)}" y="${num(p.y)}" font-size="${num(p.size)}" font-family='${fam.replace(/'/g, "")}' font-weight="${p.bold ? 700 : 400}" font-style="${p.italic ? "italic" : "normal"}" text-anchor="${anchor}" fill="${p.fill || "#000000"}"${p.ls ? ` letter-spacing="${num(p.ls)}"` : ""}${p.op != null && p.op < 1 ? ` opacity="${p.op}"` : ""} style="font-kerning:none;white-space:pre">${esc(p.t)}</text>`;
    }
    const attrs = [`d="${p.d}"`, `fill="${p.fill && p.fill !== "none" ? p.fill : "none"}"`];
    if (p.stroke && p.stroke !== "none") attrs.push(`stroke="${p.stroke}"`, `stroke-width="${num(p.sw ?? 1)}"`, `stroke-linecap="${p.cap || "round"}"`, `stroke-linejoin="${p.join || "round"}"`);
    if (p.op != null && p.op < 1) attrs.push(`opacity="${p.op}"`);
    return `<path ${attrs.join(" ")}/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg"${className ? ` class="${className}"` : ""} width="${num(w)}" height="${num(h)}" viewBox="0 0 ${num(vw)} ${num(vh)}" preserveAspectRatio="${preserve}" overflow="visible">${body}</svg>`;
}

const rgbOf = (hex) => {
  const h = String(hex || "#000000").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0);
};
export { rgbOf };

/**
 * Draws primitives on pdf-lib page `p`. origin = PDF point of the local (0,0) (top-left), sx/sy = points
 * per local unit, rotationDeg = page rotation (so drawings stay upright), opacity multiplies every part.
 * Text is real, selectable text in the metric-compatible open fonts (same widths as the preview).
 */
export async function drawPrims(out, p, prims, { origin, sx, sy = sx, rotationDeg = 0, opacity = 1, embedded = new Map() }) {
  const { rgb, degrees, LineCapStyle, pushGraphicsState, popGraphicsState, setLineJoin } = window.PDFLib;
  const color = (hex) => { const [r, g, b] = rgbOf(hex); return rgb(r / 255, g / 255, b / 255); };
  const r = (rotationDeg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  // Local (x, y down) -> PDF user space, rotated with the page.
  const at = (x, y) => [origin[0] + cos * x * sx + sin * y * sy, origin[1] + sin * x * sx - cos * y * sy];
  const caps = { round: LineCapStyle.Round, butt: LineCapStyle.Butt, square: LineCapStyle.Projecting };
  const joins = { miter: 0, round: 1, bevel: 2 };
  for (const part of prims) {
    const op = (part.op ?? 1) * opacity;
    if (part.t !== undefined) {
      if (!String(part.t).trim()) continue;
      const size = part.size * sy;
      const [x, y] = at(part.x, part.y);
      const align = part.anchor === "middle" || part.anchor === "center" ? "center" : part.anchor === "end" || part.anchor === "right" ? "right" : "left";
      await writeLines(out, p, {
        lines: [{ text: String(part.t), x, y, boxW: align === "left" ? null : 0, align }],
        size, color: rgbOf(part.fill || "#000000"), rotationDeg, family: part.font || "sans", bold: !!part.bold, italic: !!part.italic,
        spacing: part.ls ? { charSpacing: part.ls * sx } : null, embedded, opacity: op,
      });
      continue;
    }
    const fill = part.fill && part.fill !== "none" ? part.fill : null;
    const stroke = part.stroke && part.stroke !== "none" ? part.stroke : null;
    if (!fill && !stroke) continue;
    p.pushOperators(pushGraphicsState(), setLineJoin(joins[part.join || "round"] ?? 1));
    // Non-uniform scale: pdf-lib's scale is uniform, so stretch the path numbers first when needed.
    const [ox, oy] = at(0, 0);
    const d = Math.abs(sx - sy) < 1e-6 ? part.d : scalePath(part.d, 1, sy / sx);
    p.drawSvgPath(d, {
      x: ox, y: oy, scale: sx, rotate: degrees(rotationDeg),
      ...(fill ? { color: color(fill), opacity: op } : {}),
      // pdf-lib sets the line width after scaling, so the width stays in local units.
      ...(stroke ? { borderColor: color(stroke), borderWidth: ((part.sw ?? 1) * Math.min(sx, sy)) / sx, borderOpacity: op, borderLineCap: caps[part.cap || "round"] } : { borderWidth: 0 }),
    });
    p.pushOperators(popGraphicsState());
  }
}

// Multiplies every y coordinate (and arc radii) of an SVG path by ky. Used only for stretched elements.
export function scalePath(d, kx, ky) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  let out = "", cmd = "", i = 0;
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) { cmd = tokens[i++]; out += cmd; if (cmd.toUpperCase() === "Z") continue; }
    const C = cmd.toUpperCase(), n = counts[C];
    if (!n) { i++; continue; }
    const args = tokens.slice(i, i + n).map(Number);
    i += n;
    let res;
    if (C === "H") res = [args[0] * kx];
    else if (C === "V") res = [args[0] * ky];
    else if (C === "A") res = [args[0] * kx, args[1] * ky, args[2], args[3], args[4], args[5] * kx, args[6] * ky];
    else res = args.map((v, j) => (j % 2 ? v * ky : v * kx));
    out += res.map(num).join(" ") + " ";
  }
  return out.trim();
}
