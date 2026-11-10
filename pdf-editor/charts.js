// Charts from typed data (bar, line, pie, donut) as vector primitives (see vector.js).
import { rectPath, circlePath, linePath } from "./vector.js";

export const PALETTE = ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#2f80ff", "#a64bf4", "#64748b", "#0ea5e9"];
export const KINDS = ["bar", "line", "pie", "donut"];

const parseNum = (s) => {
  const t = String(s ?? "").trim().replace(/^(rs\.?|pkr|usd|\$|€|£)\s*/i, "").replace(/\s*(%|pkr|rs)$/i, "").replace(/\s+/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  return parseFloat(t);
};

/**
 * Parses typed data. One row per line: "Label, value" (or tab / semicolon / colon separated).
 * More columns = more series; a first row with names becomes the series names.
 * Returns { labels, series: [{ name, values }] } or throws an Error with a plain explanation.
 */
export function parseChartData(text) {
  const rows = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!rows.length) throw new Error("Type some data first, one row per line, like: January, 120");
  const sep = rows.some((r) => r.includes("\t")) ? "\t" : rows.some((r) => r.includes(";")) ? ";" : rows.some((r) => r.includes(",")) ? "," : ":";
  let cells = rows.map((r) => r.split(sep).map((c) => c.trim()));
  // A single column of numbers: label them 1, 2, 3...
  if (cells.every((c) => c.length === 1)) cells = cells.map((c, i) => [String(i + 1), c[0]]);
  let names = null;
  if (cells[0].slice(1).some((c) => parseNum(c) === null)) names = cells.shift().slice(1);
  const width = Math.max(...cells.map((c) => c.length));
  if (width < 2) throw new Error('Each row needs a label and a number, like "January, 120".');
  const labels = [], series = Array.from({ length: width - 1 }, (_, i) => ({ name: names?.[i] || (width > 2 ? `Series ${i + 1}` : "Value"), values: [] }));
  for (const c of cells) {
    const vals = c.slice(1).map(parseNum);
    if (vals.every((v) => v === null)) throw new Error(`"${c.join(sep === "\t" ? " " : sep + " ")}" has no number. Use: Label, number`);
    labels.push(c[0] || "");
    series.forEach((s, i) => s.values.push(vals[i] ?? 0));
  }
  if (labels.length > 60) throw new Error("Use up to 60 rows for one chart.");
  return { labels, series };
}

function niceStep(range, target = 5) {
  const raw = range / target, mag = 10 ** Math.floor(Math.log10(raw || 1)), f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}
export function fmt(v) {
  const a = Math.abs(v);
  const short = (n, s) => (Math.round(n * 10) / 10).toString().replace(/\.0$/, "") + s;
  if (a >= 1e9) return short(v / 1e9, "B");
  if (a >= 1e6) return short(v / 1e6, "M");
  if (a >= 1e4) return short(v / 1e3, "k");
  return (Math.round(v * 100) / 100).toLocaleString("en-US");
}
// Rough text width for layout (Liberation Sans average advance).
const textW = (t, size) => [...String(t)].reduce((w, ch) => w + (/[ il.,:;|!'1]/.test(ch) ? 0.3 : /[mwMW@]/.test(ch) ? 0.85 : /[A-Z0-9]/.test(ch) ? 0.64 : 0.54), 0) * size;
const ellipsize = (t, size, max) => { t = String(t); while (t.length > 1 && textW(t, size) > max) t = t.slice(0, -2) + "…"; return t; };

/**
 * Chart primitives for spec { kind, title, labels, series, colors, showValues, legend } in a w × h box.
 */
export function chartPrims(spec, w, h) {
  const prims = [];
  const ink = spec.textColor || "#1f2937", soft = "#6b7280", grid = "#e5e7eb";
  const colors = spec.colors?.length ? spec.colors : PALETTE;
  const series = spec.series || [], labels = spec.labels || [];
  const base = Math.max(9, Math.min(14, Math.min(w, h) / 22));
  let top = 10;
  if (spec.title) { prims.push({ t: ellipsize(spec.title, base * 1.4, w - 20), x: w / 2, y: top + base * 1.25, size: base * 1.4, fill: ink, bold: true, anchor: "middle" }); top += base * 2.1; }
  const pie = spec.kind === "pie" || spec.kind === "donut";
  const legendItems = pie ? labels.map((l, i) => ({ name: l, color: colors[i % colors.length] })) : series.length > 1 || spec.legend ? series.map((s, i) => ({ name: s.name, color: colors[i % colors.length] })) : [];

  // Legend along the bottom, wrapping into rows.
  let bottom = h - 8;
  if (legendItems.length) {
    const ls = base * 0.95, rowsOut = [];
    let row = [], x = 0;
    for (const it of legendItems) {
      const iw = ls * 1.4 + textW(it.name, ls) + ls * 1.2;
      if (row.length && x + iw > w - 16) { rowsOut.push({ row, x }); row = []; x = 0; }
      row.push({ ...it, iw }); x += iw;
    }
    if (row.length) rowsOut.push({ row, x });
    const shown = rowsOut.slice(0, 3);
    shown.reverse().forEach((r, ri) => {
      const y = bottom - ri * ls * 1.6;
      let x0 = (w - r.x) / 2;
      for (const it of r.row) {
        prims.push({ d: rectPath(x0, y - ls * 0.85, ls * 0.9, ls * 0.9, ls * 0.2), fill: it.color });
        prims.push({ t: ellipsize(it.name, ls, w * 0.5), x: x0 + ls * 1.3, y, size: ls, fill: ink });
        x0 += it.iw;
      }
    });
    bottom -= shown.length * ls * 1.6 + 4;
  }

  if (pie) {
    const vals = (series[0]?.values || []).map((v) => Math.max(0, v));
    const total = vals.reduce((a, b) => a + b, 0);
    const R = Math.max(10, Math.min(w - 24, bottom - top - 8) / 2), cx = w / 2, cy = (top + bottom) / 2;
    const r0 = spec.kind === "donut" ? R * 0.58 : 0;
    if (!total) { prims.push({ d: circlePath(cx, cy, R), fill: grid }); return prims; }
    let a = -Math.PI / 2;
    const pt = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const n = (v) => +v.toFixed(2);
    vals.forEach((v, i) => {
      if (!v) return;
      const sweep = (v / total) * Math.PI * 2, a1 = a + sweep, color = colors[i % colors.length];
      if (sweep >= Math.PI * 2 - 1e-6) {
        // One slice: a full ring/disc.
        prims.push({ d: r0 ? circlePath(cx, cy, R) + " " + reverseCircle(cx, cy, r0) : circlePath(cx, cy, R), fill: color });
      } else {
        const large = sweep > Math.PI ? 1 : 0;
        const [x0, y0] = pt(R, a), [x1, y1] = pt(R, a1);
        let d;
        if (r0) {
          const [ix1, iy1] = pt(r0, a1), [ix0, iy0] = pt(r0, a);
          d = `M${n(x0)} ${n(y0)}A${n(R)} ${n(R)} 0 ${large} 1 ${n(x1)} ${n(y1)}L${n(ix1)} ${n(iy1)}A${n(r0)} ${n(r0)} 0 ${large} 0 ${n(ix0)} ${n(iy0)}Z`;
        } else d = `M${n(cx)} ${n(cy)}L${n(x0)} ${n(y0)}A${n(R)} ${n(R)} 0 ${large} 1 ${n(x1)} ${n(y1)}Z`;
        prims.push({ d, fill: color, stroke: "#ffffff", sw: Math.max(1, R / 90), join: "round" });
      }
      const share = v / total;
      if (share >= 0.05 && spec.showValues !== false) {
        const mid = a + sweep / 2, [lx, ly] = pt(r0 ? (R + r0) / 2 : R * 0.64, mid), ls = Math.max(8, Math.min(base * 1.05, R / 6));
        prims.push({ t: `${Math.round(share * 100)}%`, x: lx, y: ly + ls * 0.35, size: ls, fill: "#ffffff", bold: true, anchor: "middle" });
      }
      a = a1;
    });
    if (r0 && spec.centerText !== false) prims.push({ t: fmt(total), x: cx, y: cy + base * 0.5, size: base * 1.4, fill: ink, bold: true, anchor: "middle" });
    return prims;
  }

  // Axes charts: bar and line.
  const all = series.flatMap((s) => s.values);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (lo === hi) hi = lo + 1;
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  const ts = base * 0.85;
  const left = 10 + Math.max(...ticks.map((t) => textW(fmt(t), ts))) + 6, right = w - 10;
  const labelRows = labels.length * textW("Mmmm", ts) > right - left ? 2 : 1;
  const plotBottom = bottom - ts * (1.5 * labelRows) - 4, plotTop = top + ts * 0.6;
  const Y = (v) => plotBottom - ((v - lo) / (hi - lo)) * (plotBottom - plotTop);
  for (const t of ticks) {
    prims.push({ d: linePath(left, Y(t), right, Y(t)), stroke: t === 0 ? "#9ca3af" : grid, sw: t === 0 ? 1.2 : 1, cap: "butt" });
    prims.push({ t: fmt(t), x: left - 6, y: Y(t) + ts * 0.35, size: ts, fill: soft, anchor: "end" });
  }
  const n = Math.max(1, labels.length), band = (right - left) / n;
  labels.forEach((l, i) => {
    const x = left + band * (i + 0.5), twoRows = labelRows === 2 && i % 2;
    prims.push({ t: ellipsize(l, ts, labelRows === 2 ? band * 1.9 : band - 4), x, y: plotBottom + ts * (twoRows ? 2.7 : 1.3), size: ts, fill: soft, anchor: "middle" });
  });
  const vs = Math.max(7, ts * 0.9);
  if (spec.kind === "line") {
    series.forEach((s, si) => {
      const color = colors[si % colors.length];
      const pts = s.values.map((v, i) => [left + band * (i + 0.5), Y(v)]);
      if (pts.length > 1) prims.push({ d: pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(""), stroke: color, sw: Math.max(2, base / 5), join: "round", cap: "round" });
      pts.forEach(([x, y], i) => {
        prims.push({ d: circlePath(x, y, Math.max(2.5, base / 4)), fill: "#ffffff", stroke: color, sw: Math.max(1.5, base / 7) });
        if (spec.showValues) prims.push({ t: fmt(s.values[i]), x, y: y - vs * 0.8, size: vs, fill: ink, anchor: "middle" });
      });
    });
  } else {
    const groups = series.length, gap = band * 0.22, bw = (band - gap) / groups;
    series.forEach((s, si) => {
      const color = colors[si % colors.length];
      s.values.forEach((v, i) => {
        const x = left + band * i + gap / 2 + bw * si, y0 = Y(0), y1 = Y(v);
        const hgt = Math.abs(y1 - y0);
        if (hgt > 0.2) prims.push({ d: rectPath(x + 0.5, Math.min(y0, y1), Math.max(1, bw - 1), hgt, Math.min(4, bw / 4, hgt / 2)), fill: color });
        if (spec.showValues) prims.push({ t: fmt(v), x: x + bw / 2, y: v >= 0 ? y1 - vs * 0.4 : y1 + vs * 1.1, size: vs, fill: ink, anchor: "middle" });
      });
    });
  }
  return prims;
}

// A circle drawn the other way round (counter-clockwise), which cuts a hole under the nonzero fill rule.
function reverseCircle(cx, cy, r) {
  const n = (v) => +v.toFixed(3);
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
}
