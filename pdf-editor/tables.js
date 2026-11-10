// Editable tables: layout (wrapped cell text, row heights) and vector primitives (see vector.js).
import { rectPath, linePath } from "./vector.js";

export function newTable(rows = 3, cols = 3) {
  return {
    cells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 ? `Heading ${c + 1}` : ""))),
    colW: Array.from({ length: cols }, () => 1 / cols),
    header: true,
    stripe: false,
    border: { color: "#94a3b8", width: 1 },
    headerFill: "#5b4cf0",
    headerColor: "#ffffff",
    color: "#1f2937",
    align: Array.from({ length: cols }, () => "left"),
  };
}

// Greedy word wrap of one cell's text into lines no wider than max.
export function wrapText(text, max, measure) {
  const out = [];
  for (const hard of String(text ?? "").split("\n")) {
    if (!hard || measure(hard) <= max) { out.push(hard); continue; }
    let cur = "";
    for (const word of hard.split(/(?<=\s)/)) {
      if (cur && measure((cur + word).trimEnd()) > max) { out.push(cur.trimEnd()); cur = ""; }
      if (!cur && measure(word.trimEnd()) > max) {
        // A single word longer than the cell: break it by letters.
        let piece = "";
        for (const ch of word) { if (piece && measure(piece + ch) > max) { out.push(piece); piece = ""; } piece += ch; }
        cur = piece;
      } else cur += word;
    }
    out.push(cur.trimEnd());
  }
  return out;
}

/**
 * Lays out table `t` at width w (px) and font size `size` (px). measure(text, bold) -> width in px.
 * Returns { rows: [{ y, h, cells: [{ x, w, lines }] }], height, colX }.
 */
export function layoutTable(t, w, size, measure) {
  const pad = Math.max(3, size * 0.45), lineH = size * 1.25;
  const fr = t.colW.reduce((a, b) => a + b, 0) || 1;
  const colX = [0];
  t.colW.forEach((f) => colX.push(colX[colX.length - 1] + (f / fr) * w));
  let y = 0;
  const rows = t.cells.map((row, r) => {
    const bold = t.header && r === 0;
    const cells = row.map((text, c) => {
      const cw = colX[c + 1] - colX[c];
      return { x: colX[c], w: cw, lines: wrapText(text, Math.max(4, cw - pad * 2), (s) => measure(s, bold)) };
    });
    const h = Math.max(1, ...cells.map((c) => c.lines.length)) * lineH + pad * 2;
    const out = { y, h, cells, bold };
    y += h;
    return out;
  });
  return { rows, height: y, colX, pad, lineH };
}

export function tablePrims(t, w, size, measure) {
  const L = layoutTable(t, w, size, measure);
  const prims = [];
  const bw = t.border?.width ?? 1, bc = t.border?.color || "#94a3b8";
  L.rows.forEach((row, r) => {
    if (t.header && r === 0) prims.push({ d: rectPath(0, row.y, w, row.h), fill: t.headerFill || "#5b4cf0" });
    else if (t.stripe && r % 2 === 0) prims.push({ d: rectPath(0, row.y, w, row.h), fill: "#f1f5f9" });
  });
  L.rows.forEach((row, r) => {
    const color = t.header && r === 0 ? t.headerColor || "#ffffff" : t.color || "#1f2937";
    row.cells.forEach((cell, c) => {
      const align = t.align?.[c] || "left";
      const x = align === "center" ? cell.x + cell.w / 2 : align === "right" ? cell.x + cell.w - L.pad : cell.x + L.pad;
      cell.lines.forEach((line, i) => {
        if (line) prims.push({ t: line, x, y: row.y + L.pad + L.lineH * i + size * 0.95, size, fill: color, bold: row.bold, anchor: align === "center" ? "middle" : align === "right" ? "end" : "start" });
      });
    });
  });
  if (bw > 0) {
    const half = bw / 2;
    for (let i = 1; i < L.rows.length; i++) prims.push({ d: linePath(0, L.rows[i].y, w, L.rows[i].y), stroke: bc, sw: bw, cap: "butt" });
    for (let c = 1; c < L.colX.length - 1; c++) prims.push({ d: linePath(L.colX[c], 0, L.colX[c], L.height), stroke: bc, sw: bw, cap: "butt" });
    prims.push({ d: rectPath(half, half, Math.max(1, w - bw), Math.max(1, L.height - bw)), stroke: bc, sw: bw, join: "miter", cap: "butt" });
  }
  return { prims, layout: L };
}
