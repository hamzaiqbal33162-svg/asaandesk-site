// Magic Insights (offline): a profile of every column in a block of values — type, count, blanks, totals,
// average, median, smallest/largest, most common values, trend and unusual values (IQR rule) — plus chart
// suggestions. Pure functions, no DOM; the AI summary is a separate, optional step in the app.
import { looksLikeHeader } from "./model.js";
import { colName, generalText } from "./formula.js";

const blank = (v) => v === null || v === undefined || v === "";
/** Quantile with linear interpolation, the same as Excel's QUARTILE.INC / PERCENTILE.INC. */
export function quantile(sorted, p) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * p, lo = Math.floor(pos), frac = pos - lo;
  return lo + 1 < sorted.length ? sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
}
function trendOf(xs) {
  const n = xs.length;
  if (n < 3) return { trend: null, slope: 0 };
  const mx = (n - 1) / 2, my = xs.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  xs.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; });
  const slope = sxy / sxx, rel = (slope * (n - 1)) / (Math.abs(my) || 1);
  return { trend: rel > 0.05 ? "up" : rel < -0.05 ? "down" : "flat", slope };
}

/**
 * rows: 2-D values (numbers, text, booleans, null). Options: header (auto when omitted), dateCols (Set of column
 * indexes shown as dates), startCol (for column letters), textOf (display text for labels).
 */
export function profile(rows, { header, dateCols = new Set(), startCol = 0, textOf = generalText } = {}) {
  const h = rows.length, w = Math.max(0, ...rows.map((r) => r.length));
  const hasHeader = header ?? looksLikeHeader(rows);
  const body = hasHeader ? rows.slice(1) : rows;
  const columns = [];
  for (let c = 0; c < w; c++) {
    const values = body.map((r) => r[c]);
    const filled = values.filter((v) => !blank(v));
    const numbers = filled.filter((v) => typeof v === "number");
    const head = hasHeader ? rows[0][c] : null;
    const col = { index: c, letter: colName(startCol + c), name: !blank(head) ? String(head) : `Column ${colName(startCol + c)}`, count: filled.length, blanks: values.length - filled.length };
    col.type = !filled.length ? "empty" : numbers.length / filled.length >= 0.8 ? (dateCols.has(c) ? "date" : "number") : filled.every((v) => typeof v === "boolean") ? "yes/no" : "text";
    const counts = new Map();
    for (const v of filled) { const k = typeof v === "string" ? v.trim() : typeof v === "number" && col.type === "date" ? textOf(v) : textOf(v); counts.set(k, (counts.get(k) || 0) + 1); }
    col.distinct = counts.size;
    if (col.type === "number" || col.type === "date") {
      const sorted = [...numbers].sort((a, b) => a - b), n = sorted.length;
      col.numbers = n;
      col.sum = numbers.reduce((a, b) => a + b, 0);
      col.mean = col.sum / n;
      col.median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      col.min = sorted[0]; col.max = sorted[n - 1];
      col.stdev = n > 1 ? Math.sqrt(numbers.reduce((s, x) => s + (x - col.mean) ** 2, 0) / (n - 1)) : 0;
      const t = trendOf(numbers);
      col.trend = t.trend; col.slope = t.slope;
      col.change = n >= 2 && numbers[0] !== 0 ? (numbers[n - 1] - numbers[0]) / Math.abs(numbers[0]) : null;
      col.outliers = [];
      if (n >= 4) {
        const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75), iqr = q3 - q1;
        col.q1 = q1; col.q3 = q3; col.low = q1 - 1.5 * iqr; col.high = q3 + 1.5 * iqr;
        if (iqr > 0) values.forEach((v, i) => { if (typeof v === "number" && (v < col.low || v > col.high)) col.outliers.push({ row: i + (hasHeader ? 1 : 0), value: v }); });
      }
    }
    if (col.type === "text" || col.type === "yes/no" || col.distinct < col.count) {
      const first = new Map();
      filled.forEach((v, i) => { const k = typeof v === "string" ? v.trim() : textOf(v); if (!first.has(k)) first.set(k, i); });
      col.top = [...counts.entries()].sort((a, b) => b[1] - a[1] || first.get(a[0]) - first.get(b[0])).slice(0, 5).map(([value, count]) => ({ value, count }));
    } else col.top = [];
    columns.push(col);
  }
  return { header: hasHeader, rows: body.length, columns, suggestions: suggest(columns, body, textOf) };
}

function suggest(columns, body, textOf) {
  const out = [];
  const nums = columns.filter((c) => c.type === "number");
  if (!nums.length) return out;
  const label = columns.find((c) => c.type === "date") || columns.find((c) => c.type === "text" && c.count > 0);
  const vc = nums.slice(0, 3).map((c) => c.index), names = nums.slice(0, 3).map((c) => c.name).join(", ");
  if (label) {
    const unique = label.distinct === label.count;
    if (unique && body.length <= 40) out.push({ kind: "bar", labelCol: label.index, valueCols: vc, title: `${names} by ${label.name}`, why: "Compare the values side by side." });
    if (body.length >= 4 && (label.type === "date" || unique)) out.push({ kind: "line", labelCol: label.index, valueCols: vc, title: `${names} over ${label.name}`, why: "See how the numbers change from row to row." });
    if (unique && body.length <= 8 && nums[0].min >= 0) out.push({ kind: "donut", labelCol: label.index, valueCols: [nums[0].index], title: `Share of ${nums[0].name}`, why: "See each part of the total." });
    // Repeated labels (e.g. a Region column): total each group.
    const groupCol = columns.find((c) => c.type === "text" && c.distinct < c.count && c.distinct >= 2 && c.distinct <= 12);
    if (groupCol) {
      const v = nums[0], totals = new Map();
      for (const r of body) { const k = r[groupCol.index]; if (blank(k)) continue; const key = typeof k === "string" ? k.trim() : textOf(k); totals.set(key, (totals.get(key) || 0) + (typeof r[v.index] === "number" ? r[v.index] : 0)); }
      const labels = [...totals.keys()];
      out.push({ kind: labels.length <= 6 ? "pie" : "bar", group: { by: groupCol.index, value: v.index }, title: `Total ${v.name} by ${groupCol.name}`, why: `Adds up ${v.name} for each ${groupCol.name}.`, data: { labels, series: [{ name: v.name, values: labels.map((l) => totals.get(l)) }] } });
    }
  } else {
    out.push({ kind: nums.length > 1 ? "bar" : "line", labelCol: null, valueCols: vc, title: names, why: "Show the numbers in order." });
  }
  return out;
}

/** Short plain-English lines for a column (used in the panel and sent to the AI summary). */
export function describe(col, fmt = (v) => generalText(+(+v).toPrecision(6))) {
  const lines = [];
  if (col.type === "number" || col.type === "date") {
    if (col.trend === "up") lines.push(`Going up${col.change !== null ? ` (${Math.round(col.change * 100)}% from first to last)` : ""}.`);
    else if (col.trend === "down") lines.push(`Going down${col.change !== null ? ` (${Math.round(col.change * 100)}% from first to last)` : ""}.`);
    else if (col.trend === "flat") lines.push("Fairly steady.");
    if (col.outliers.length) lines.push(`${col.outliers.length} unusual value${col.outliers.length > 1 ? "s" : ""}: ${col.outliers.slice(0, 3).map((o) => fmt(o.value)).join(", ")}.`);
  }
  if (col.top?.length && col.type !== "number") lines.push(`Most common: ${col.top.slice(0, 3).map((t) => `${t.value} (${t.count})`).join(", ")}.`);
  if (col.blanks) lines.push(`${col.blanks} empty cell${col.blanks > 1 ? "s" : ""}.`);
  return lines;
}
