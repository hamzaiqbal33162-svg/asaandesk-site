// Table editing like Canva's table help pages (round 3): add / delete / move rows and columns, size columns
// equally or to their content, cell fill colours (t.fills = { "row,col": "#hex" }), and the cell-fill drawing
// added under the shared table renderer's text. Pure module.

const width = (t) => Math.max(1, ...t.cells.map((r) => r.length));
function cols(t) {
  const n = width(t);
  t.cells = t.cells.map((r) => Array.from({ length: n }, (_, i) => r[i] ?? ""));
  t.colW = Array.from({ length: n }, (_, i) => t.colW?.[i] ?? 1 / n);
  t.align = Array.from({ length: n }, (_, i) => t.align?.[i] || "left");
  return t;
}
// Cell fills follow rows and columns when they move.
function remapFills(t, fn) {
  if (!t.fills) return;
  const out = {};
  for (const [k, v] of Object.entries(t.fills)) { const [r, c] = k.split(",").map(Number); const m = fn(r, c); if (m) out[m[0] + "," + m[1]] = v; }
  t.fills = out;
}
export function addRow(t, at = t.cells.length) {
  cols(t);
  at = Math.max(0, Math.min(t.cells.length, at));
  t.cells.splice(at, 0, Array.from({ length: width(t) }, () => ""));
  remapFills(t, (r, c) => [r >= at ? r + 1 : r, c]);
  return t;
}
export function addCol(t, at = width(t)) {
  cols(t);
  const n = width(t);
  at = Math.max(0, Math.min(n, at));
  t.cells.forEach((r, i) => r.splice(at, 0, i === 0 && t.header ? `Heading ${n + 1}` : ""));
  const share = 1 / (n + 1), k = (1 - share) / (t.colW.reduce((a, b) => a + b, 0) || 1);
  t.colW = t.colW.map((w) => w * k); t.colW.splice(at, 0, share);
  t.align.splice(at, 0, "left");
  remapFills(t, (r, c) => [r, c >= at ? c + 1 : c]);
  return t;
}
export function delRow(t, at) {
  if (t.cells.length < 2) throw new Error("A table needs at least one row.");
  t.cells.splice(at, 1);
  remapFills(t, (r, c) => (r === at ? null : [r > at ? r - 1 : r, c]));
  return t;
}
export function delCol(t, at) {
  cols(t);
  if (width(t) < 2) throw new Error("A table needs at least one column.");
  t.cells.forEach((r) => r.splice(at, 1));
  const [gone] = t.colW.splice(at, 1);
  const k = 1 / (1 - gone || 1); t.colW = t.colW.map((w) => w * k);
  t.align.splice(at, 1);
  remapFills(t, (r, c) => (c === at ? null : [r, c > at ? c - 1 : c]));
  return t;
}
export function moveRow(t, from, to) {
  if (to < 0 || to >= t.cells.length || from === to) return t;
  const [row] = t.cells.splice(from, 1); t.cells.splice(to, 0, row);
  remapFills(t, (r, c) => [r === from ? to : from < to && r > from && r <= to ? r - 1 : from > to && r >= to && r < from ? r + 1 : r, c]);
  return t;
}
export function moveCol(t, from, to) {
  cols(t);
  if (to < 0 || to >= width(t) || from === to) return t;
  const mv = (a) => { const [x] = a.splice(from, 1); a.splice(to, 0, x); };
  t.cells.forEach(mv); mv(t.colW); mv(t.align);
  remapFills(t, (r, c) => [r, c === from ? to : from < to && c > from && c <= to ? c - 1 : from > to && c >= to && c < from ? c + 1 : c]);
  return t;
}
/** Canva "Size columns equally". */
export function sizeColumnsEqually(t) { cols(t); const n = width(t); t.colW = Array.from({ length: n }, () => 1 / n); return t; }
/** Canva "Size columns to content": widths follow the longest line in each column. measure(text, bold) -> px. */
export function sizeColumnsToContent(t, measure) {
  cols(t);
  const need = Array.from({ length: width(t) }, (_, c) => Math.max(12, ...t.cells.map((r, i) => Math.max(...String(r[c] ?? "").split("\n").map((s) => measure(s, !!t.header && i === 0))))));
  const sum = need.reduce((a, b) => a + b, 0);
  t.colW = need.map((v) => v / sum);
  return t;
}
/** Cell fill colour (null clears it). */
export function setFill(t, r, c, color) {
  t.fills ||= {};
  if (color) t.fills[r + "," + c] = color; else delete t.fills[r + "," + c];
  if (!Object.keys(t.fills).length) delete t.fills;
  return t;
}
/** Fill rectangles for the cells with a colour, from the shared layout ({ rows: [{ y, h }], colX }). */
export function fillPrims(t, layout) {
  if (!t.fills) return [];
  const out = [];
  for (const [k, color] of Object.entries(t.fills)) {
    const [r, c] = k.split(",").map(Number), row = layout.rows[r];
    if (!row || layout.colX[c + 1] == null) continue;
    const x = layout.colX[c], w = layout.colX[c + 1] - x;
    out.push({ d: `M${x} ${row.y}H${x + w}V${row.y + row.h}H${x}Z`, fill: color });
  }
  return out;
}
/** Shared table prims with our cell fills put under the borders and text. */
export function withFills(t, res) {
  const fills = fillPrims(t, res.layout);
  if (!fills.length) return res.prims;
  const firstText = res.prims.findIndex((p) => p.t !== undefined || p.stroke);
  const at = firstText < 0 ? res.prims.length : firstText;
  return [...res.prims.slice(0, at), ...fills, ...res.prims.slice(at)];
}
