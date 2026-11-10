// Spreadsheet helpers with no DOM: number formats, fill series, sorting, clipboard TSV and chart data.
import { formatValue, parseLiteral, shiftFormula, dateToSerial, serialToParts, MONTHS, WEEKDAYS, generalText, textToNumber, FormulaError } from "./formula.js";
import { parseCSV } from "./csv.js";

/** Number formats offered in the toolbar (id → label and Excel format code). */
export const FORMATS = {
  general: { label: "General", code: "General" },
  number: { label: "Number  1,234.56", code: "#,##0.00" },
  fixed2: { label: "2 decimals  1234.56", code: "0.00" },
  thousands: { label: "Thousands  1,234", code: "#,##0" },
  pkr: { label: "Rupees  Rs 1,234.00", code: '"Rs "#,##0.00' },
  usd: { label: "Dollars  $1,234.00", code: '"$"#,##0.00' },
  percent: { label: "Percent  12.34%", code: "0.00%" },
  date: { label: "Date  15 Jan 2024", code: "dd mmm yyyy" },
  time: { label: "Time  2:30 PM", code: "h:mm AM/PM" },
};
export const fmtCode = (fmt) => (!fmt ? "General" : FORMATS[fmt] ? FORMATS[fmt].code : fmt);
export const isDateCode = (code) => /[dy]/i.test(String(code).replace(/"[^"]*"|\\./g, "")) || /^[^"]*h+[^"]*:/.test(code);
/** What a cell shows: the value through its number format (General when none). */
export function displayText(value, style) { return formatValue(value, fmtCode(style?.fmt)); }

const isoDate = (serial) => { const p = serialToParts(serial); return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; };
const clean = (n) => String(+(+n).toPrecision(12));
function nameList(t) {
  const lower = t.toLowerCase();
  for (const list of [MONTHS, WEEKDAYS]) {
    const full = list.findIndex((x) => x.toLowerCase() === lower);
    if (full >= 0) return { list, i: full, short: false };
    const short = list.findIndex((x) => x.slice(0, 3).toLowerCase() === lower);
    if (short >= 0) return { list, i: short, short: true };
  }
  return null;
}
function caseLike(sample, word) { return sample === sample.toUpperCase() ? word.toUpperCase() : sample === sample.toLowerCase() ? word.toLowerCase() : word; }
function classify(input) {
  const s = String(input ?? "");
  if (s.length > 1 && s[0] === "=") return { k: "formula", s };
  const lit = parseLiteral(s);
  if (typeof lit.value === "number") return lit.fmt === "date" ? { k: "date", v: Math.floor(lit.value) } : { k: "num", v: lit.value };
  const t = s.trim(), named = nameList(t);
  if (named) return { k: "name", ...named, sample: t };
  const m = /^(.*?)(\d+)(\D*)$/.exec(s);
  if (m && s.trim()) return { k: "textnum", pre: m[1], n: +m[2], width: m[2].length, post: m[3] };
  return { k: "text", s };
}

/**
 * Values for the fill handle. seq = source inputs in sheet order (top→bottom or left→right); n = how many new
 * cells; { dr, dc } = direction (+1 down/right, -1 up/left). Returns the new inputs, nearest cell first.
 */
export function fillSeries(seq, n, { dr = 0, dc = 0 } = {}) {
  const sign = Math.sign(dr || dc) || 1;
  const src = sign < 0 ? [...seq].reverse() : [...seq];
  const len = src.length, kinds = src.map(classify);
  const all = (k) => kinds.every((x) => x.k === k);
  const out = [];
  if (all("num") && len >= 2) {
    const xs = kinds.map((_, i) => i), ys = kinds.map((x) => x.v);
    const mx = (len - 1) / 2, my = ys.reduce((a, b) => a + b, 0) / len;
    let sxy = 0, sxx = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    const slope = sxy / sxx, b = my - slope * mx;
    for (let i = 0; i < n; i++) out.push(clean(b + slope * (len + i)));
    return out;
  }
  if (all("date")) {
    const last = kinds[len - 1].v;
    if (len === 1) { for (let i = 1; i <= n; i++) out.push(isoDate(last + i)); return out; }
    const parts = kinds.map((x) => serialToParts(x.v));
    const monthStep = (parts[1].y - parts[0].y) * 12 + parts[1].m - parts[0].m;
    const endOfMonth = (p) => p.d === new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
    const byMonth = monthStep !== 0 && parts.every((p, i) => !i || ((p.y - parts[i - 1].y) * 12 + p.m - parts[i - 1].m === monthStep && (p.d === parts[0].d || (endOfMonth(p) && endOfMonth(parts[i - 1])))));
    if (byMonth) {
      const p = parts[len - 1], eom = parts.every(endOfMonth);
      for (let i = 1; i <= n; i++) {
        const mi = p.m - 1 + monthStep * i, y = p.y + Math.floor(mi / 12), m = ((mi % 12) + 12) % 12 + 1;
        const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
        out.push(isoDate(dateToSerial(y, m, eom ? dim : Math.min(parts[0].d, dim))));
      }
      return out;
    }
    const step = (last - kinds[0].v) / (len - 1);
    for (let i = 1; i <= n; i++) out.push(isoDate(Math.round(last + step * i)));
    return out;
  }
  if (all("name") && kinds.every((x) => x.list === kinds[0].list)) {
    const L = kinds[0].list.length, step = len > 1 ? (((kinds[1].i - kinds[0].i) % L) + L) % L || 1 : 1;
    const k = kinds[len - 1];
    for (let i = 1; i <= n; i++) { const w = k.list[(((k.i + step * i) % L) + L) % L]; out.push(caseLike(k.sample, k.short ? w.slice(0, 3) : w)); }
    return out;
  }
  if (all("textnum") && kinds.every((x) => x.pre === kinds[0].pre && x.post === kinds[0].post)) {
    const k = kinds[len - 1], step = len > 1 ? (k.n - kinds[0].n) / (len - 1) : 1;
    for (let i = 1; i <= n; i++) { const v = Math.max(0, Math.round(k.n + step * i)); out.push(k.pre + String(v).padStart(k.width, "0") + k.post); }
    return out;
  }
  for (let i = 0; i < n; i++) {
    const j = i % len, item = src[j];
    const dist = sign * (len + i - j);
    out.push(kinds[j].k === "formula" ? shiftFormula(item, dr ? dist : 0, dc ? dist : 0) : String(item ?? ""));
  }
  return out;
}

const blank = (v) => v === null || v === undefined || v === "";
const rank = (v) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : 3);
/** Excel-style sort order: numbers, then text (A–Z, ignoring case), then TRUE/FALSE, then errors; blanks always last. */
export function sortCompare(a, b) {
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return a - b;
  if (ra === 1) return a.localeCompare(b, "en", { sensitivity: "base" });
  if (ra === 2) return a === b ? 0 : a ? 1 : -1;
  return 0;
}
/** Stable sort of items by key (index or function). */
export function sortRows(items, key, asc = true) {
  const get = typeof key === "function" ? key : (it) => it[key];
  return items.map((it, i) => [it, i]).sort((x, y) => {
    const a = get(x[0]), b = get(y[0]), ba = blank(a), bb = blank(b);
    if (ba || bb) return ba === bb ? x[1] - y[1] : ba ? 1 : -1;
    const c = sortCompare(a, b);
    return (asc ? c : -c) || x[1] - y[1];
  }).map((p) => p[0]);
}
/** True when the first row looks like column names (text over columns that hold numbers). */
export function looksLikeHeader(rows) {
  if (!rows || rows.length < 2) return false;
  const first = rows[0];
  if (!first.length || first.some((v) => typeof v !== "string" || !v.trim())) return false;
  return first.some((_, c) => { const rest = rows.slice(1).map((r) => r[c]).filter((v) => !blank(v)); return rest.length > 0 && rest.every((v) => typeof v === "number" || typeof v === "boolean"); });
}

/** Rows → tab-separated text, the way spreadsheets put cells on the clipboard. */
export function toTSV(rows) {
  return rows.map((r) => r.map((v) => { const t = v === null || v === undefined ? "" : String(v); return /[\t\n\r"]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join("\t")).join("\n");
}
export function parseTSV(text) {
  const rows = parseCSV(String(text ?? "").replace(/\r?\n$/, ""), "\t");
  return rows.length ? rows : [[""]];
}

/** Chart labels and series from a block of values (first row = names when it is text, first column = labels). */
export function chartData(rows, textOf = generalText) {
  const h = rows.length, w = Math.max(0, ...rows.map((r) => r.length));
  if (!h || !w) return { labels: [], series: [] };
  const num = (v) => (typeof v === "number" ? v : typeof v === "string" ? textToNumber(v) : null);
  const valueCols = w === 1 ? [0] : Array.from({ length: w - 1 }, (_, i) => i + 1);
  const header = h > 1 && valueCols.some((c) => { const v = rows[0][c]; return !blank(v) && num(v) === null; }) && rows.slice(1).some((r) => valueCols.some((c) => num(r[c]) !== null));
  const body = header ? rows.slice(1) : rows;
  const labels = w === 1 ? body.map((_, i) => String(i + 1)) : body.map((r) => (blank(r[0]) ? "" : textOf(r[0])));
  let series = valueCols.map((c, k) => ({ name: header && !blank(rows[0][c]) ? textOf(rows[0][c]) : valueCols.length > 1 ? `Series ${k + 1}` : "Value", values: body.map((r) => num(r[c]) ?? 0), any: body.some((r) => num(r[c]) !== null) }));
  if (series.some((s) => s.any)) series = series.filter((s) => s.any);
  return { labels, series: series.map(({ name, values }) => ({ name, values })) };
}

/** Plain value for exporting (errors as their code). */
export const plainValue = (v) => (v instanceof FormulaError ? v.code : v);
