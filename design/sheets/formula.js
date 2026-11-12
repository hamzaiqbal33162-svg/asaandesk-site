// AsaanDesk Sheets formula engine: tokenizer, parser, evaluator, about 110 functions and a Workbook with a
// dependency graph, dynamic-array spills and circular-reference detection. Plain JavaScript with no DOM, so
// the same file runs in the browser, in Node tests and anywhere else on the site.
//
// Values: number | string | boolean | null (blank cell) | FormulaError | Arr (2-D array, from ranges and
// array functions). Dates are Excel serial numbers (1900 date system, serial 1 = 1 Jan 1900).

export const ERR = Object.freeze({ DIV0: "#DIV/0!", REF: "#REF!", NAME: "#NAME?", VALUE: "#VALUE!", NA: "#N/A", NUM: "#NUM!", NULL: "#NULL!", CIRC: "#CIRC!", SPILL: "#SPILL!", CALC: "#CALC!", ERROR: "#ERROR!" });
export const ERROR_CODES = Object.values(ERR);

export class FormulaError {
  constructor(code, detail = "") { this.code = code; this.detail = detail; }
  toString() { return this.code; }
}
const ERRS = Object.fromEntries(ERROR_CODES.map((c) => [c, new FormulaError(c)]));
export const err = (code, detail) => (detail ? new FormulaError(code, detail) : ERRS[code] || new FormulaError(code));
export const isError = (v) => v instanceof FormulaError;

/** A 2-D block of values. `ref` = { sheet, r1, c1, r2, c2 } when it came from cells. */
export class Arr {
  constructor(rows, ref = null) { this.rows = rows; this.ref = ref; }
  get h() { return this.rows.length; }
  get w() { return this.rows[0] ? this.rows[0].length : 0; }
  *values() { for (const row of this.rows) for (const v of row) yield v; }
  flat() { return this.rows.flat(); }
  map(fn) { return new Arr(this.rows.map((row, r) => row.map((v, c) => fn(v, r, c)))); }
}
const unwrap = (v) => (v instanceof Arr && v.h === 1 && v.w === 1 ? v.rows[0][0] : v);
const transpose = (rows) => (rows[0] || []).map((_, c) => rows.map((r) => r[c]));

/* ---------------- cell names ---------------- */

export const MAX_COLS = 16384, MAX_ROWS = 1048576;
export function colName(c) { let s = ""; c += 1; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; }
export function colIndex(name) { let n = 0; for (const ch of String(name).toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
export const cellName = (r, c, absR = false, absC = false) => (absC ? "$" : "") + colName(c) + (absR ? "$" : "") + (r + 1);
/** "B3" or "$B$3" → { row, col, absRow, absCol } (0-based), else null. */
export function parseCellName(s) {
  const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(String(s).trim());
  if (!m || +m[4] < 1) return null;
  const col = colIndex(m[2]);
  return col < MAX_COLS ? { row: +m[4] - 1, col, absRow: !!m[3], absCol: !!m[1] } : null;
}
/** "A1:C5" (or "A1") → { r1, c1, r2, c2 } normalised (0-based), with an optional sheet ("Sheet2!A1:B2"). */
export function parseRangeName(s) {
  let text = String(s || "").trim(), sheet = null;
  const bang = text.lastIndexOf("!");
  if (bang > 0) { sheet = text.slice(0, bang).replace(/^'(.*)'$/, "$1").replace(/''/g, "'"); text = text.slice(bang + 1); }
  const [a, b = a] = text.split(":");
  const p = parseCellName(a), q = parseCellName(b);
  if (!p || !q) return null;
  return { sheet, r1: Math.min(p.row, q.row), c1: Math.min(p.col, q.col), r2: Math.max(p.row, q.row), c2: Math.max(p.col, q.col) };
}
export const rangeName = (r1, c1, r2, c2) => (r1 === r2 && c1 === c2 ? cellName(r1, c1) : cellName(r1, c1) + ":" + cellName(r2, c2));
/** Sheet name as it must be written in a formula (quoted when needed). */
export function quoteSheet(name) {
  return /^[A-Za-z_][\w.]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name) && !/^(TRUE|FALSE)$/i.test(name) ? name : "'" + String(name).replace(/'/g, "''") + "'";
}

/* ---------------- numbers, text and dates ---------------- */

const DAY_MS = 864e5, EPOCH = Date.UTC(1899, 11, 30);
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Excel serial for a calendar date (month and day may overflow, like DATE()). */
export function dateToSerial(y, m, d) {
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  dt.setUTCHours(0, 0, 0, 0);
  const days = Math.round((dt.getTime() - EPOCH) / DAY_MS);
  return days < 61 ? days - 1 : days; // Excel counts a 29 Feb 1900 that never existed
}
/** Serial → { y, m, d, H, M, S, dow } (dow 0 = Sunday, Excel's own weekday rule). */
export function serialToParts(serial) {
  const s = Math.floor(serial);
  let y, m, d;
  if (s === 60) { y = 1900; m = 2; d = 29; }
  else { const dt = new Date(EPOCH + (s < 60 ? s + 1 : s) * DAY_MS); y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate(); }
  let secs = Math.round((serial - s) * 86400);
  if (secs >= 86400) secs = 86399;
  return { y, m, d, H: Math.floor(secs / 3600), M: Math.floor((secs % 3600) / 60), S: secs % 60, dow: (((s - 1) % 7) + 7) % 7 };
}
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export function serialFromDate(date) { return dateToSerial(date.getFullYear(), date.getMonth() + 1, date.getDate()) + (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400; }

const MON3 = MONTHS.map((m) => m.slice(0, 3).toLowerCase());
const monthOf = (t) => { const i = MON3.indexOf(String(t).slice(0, 3).toLowerCase()); return i >= 0 && (t.length === 3 || MONTHS[i].toLowerCase().startsWith(t.toLowerCase().replace(/\.$/, ""))) ? i + 1 : 0; };
const fullYear = (y) => (y.length <= 2 ? (+y < 30 ? 2000 + +y : 1900 + +y) : +y);
function validDate(y, m, d) { return y >= 1900 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m) ? dateToSerial(y, m, d) : null; }
/** Date / time text → serial, or null. Day-first for d/m/y (as used in Pakistan); ISO yyyy-mm-dd always works. */
export function parseDateText(text) {
  const t = String(text).trim();
  let m, time = 0, date = null;
  const tm = /(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(t);
  let rest = t;
  if (tm) {
    let h = +tm[1];
    if (tm[4]) { if (h < 1 || h > 12) return null; h = (h % 12) + (/pm/i.test(tm[4]) ? 12 : 0); }
    if (h > 23 || +tm[2] > 59 || +(tm[3] || 0) > 59) return null;
    time = (h * 3600 + +tm[2] * 60 + +(tm[3] || 0)) / 86400;
    rest = t.slice(0, tm.index).trim();
    if (!rest) return time;
  }
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:T)?$/.exec(rest))) date = validDate(+m[1], +m[2], +m[3]);
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(rest))) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    date = validDate(fullYear(m[3]), mo, d);
  } else if ((m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9}\.?)[\s,-]+(\d{2}|\d{4})$/.exec(rest))) date = monthOf(m[2]) ? validDate(fullYear(m[3]), monthOf(m[2]), +m[1]) : null;
  else if ((m = /^([A-Za-z]{3,9}\.?)[\s-]+(\d{1,2})(?:st|nd|rd|th)?,?[\s-]+(\d{2}|\d{4})$/.exec(rest))) date = monthOf(m[1]) ? validDate(fullYear(m[3]), monthOf(m[1]), +m[2]) : null;
  return date === null ? null : date + time;
}

const NUM_RE = /^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
/** Number-looking text ("1,234.5", "12%", "Rs 500", "$5", "(7)", dates) → { value, kind } or null. */
export function readNumber(text) {
  let t = String(text).trim();
  if (!t) return null;
  let neg = false, pct = false, cur = null;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1).trim(); }
  if (t.endsWith("%")) { pct = true; t = t.slice(0, -1).trim(); }
  let sign = "";
  if (/^[-+]/.test(t)) { sign = t[0]; t = t.slice(1).trim(); }
  const cm = /^(rs\.?|pkr|usd|\$)\s*/i.exec(t);
  if (cm) { cur = /\$|usd/i.test(cm[1]) ? "usd" : "pkr"; t = t.slice(cm[0].length); if (!sign && /^[-+]/.test(t)) { sign = t[0]; t = t.slice(1); } }
  if (t && NUM_RE.test(t) && /\d/.test(t)) {
    let v = parseFloat(t.replace(/,/g, ""));
    if (sign === "-") v = -v;
    if (neg) v = -v;
    if (pct) v /= 100;
    return { value: v, kind: pct ? "percent" : cur || (t.includes(",") ? (t.includes(".") ? "number" : "thousands") : null) };
  }
  if (!neg && !pct && !cur && !sign) {
    const d = parseDateText(t);
    if (d !== null) return { value: d, kind: d < 1 && /:/.test(t) && !/\d{4}|[A-Za-z]{3}/.test(t.replace(/am|pm/i, "")) ? "time" : "date" };
  }
  return null;
}
export const textToNumber = (s) => { const r = readNumber(s); return r ? r.value : null; };

/** What a typed cell entry means: { value, fmt? } (fmt = suggested number format). Formulas are not handled here. */
export function parseLiteral(input) {
  if (input === null || input === undefined) return { value: null };
  if (typeof input === "number" || typeof input === "boolean") return { value: input };
  const s = String(input);
  if (s.startsWith("'")) return { value: s.slice(1) };
  const t = s.trim();
  const up = t.toUpperCase();
  if (up === "TRUE" || up === "FALSE") return { value: up === "TRUE" };
  if (ERROR_CODES.includes(up)) return { value: err(up) };
  const n = readNumber(t);
  if (n) return n.kind ? { value: n.value, fmt: n.kind } : { value: n.value };
  return { value: s };
}

const r15 = (x) => (x === 0 || !Number.isFinite(x) ? x : +x.toPrecision(15));
/** Number as text the way Excel joins it (& and TEXTJOIN): up to 15 significant digits. */
export function numToText(n) {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  if (n === 0) return "0";
  let s = n.toPrecision(15);
  if (s.includes("e")) {
    let [mant, ex] = s.split("e");
    if (mant.includes(".")) mant = mant.replace(/\.?0+$/, "");
    return mant + "E" + (+ex < 0 ? "-" : "+") + String(Math.abs(+ex)).padStart(2, "0");
  }
  if (s.includes(".")) s = s.replace(/\.?0+$/, "");
  return s;
}
export function toStr(v) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return numToText(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof FormulaError) throw v;
  return "";
}
export function toNum(v) {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof FormulaError) return v;
  if (typeof v === "string") { const n = textToNumber(v); return n === null ? err(ERR.VALUE) : n; }
  return err(ERR.VALUE);
}
const typeRank = (v) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : 3);
/** Excel comparison: numbers < text < TRUE/FALSE, text ignores case, blank acts as 0 / "" / FALSE. */
export function compare(a, b) {
  if (a === null || a === undefined) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null || b === undefined) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  const ta = typeRank(a), tb = typeRank(b);
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (ta === 0) { const x = r15(a), y = r15(b); return x < y ? -1 : x > y ? 1 : 0; }
  if (ta === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  return a === b ? 0 : a ? 1 : -1;
}

/* ---------------- number formats (cells and TEXT) ---------------- */

/** "General" display: up to 10 significant digits, E notation for very big or small numbers. */
export function generalText(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof FormulaError) return v.code;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v !== "number") return String(v);
  if (!Number.isFinite(v)) return ERR.NUM;
  if (v === 0) return "0";
  const a = Math.abs(v);
  const sci = (x) => { let [m, e] = x.toExponential(5).split("e"); m = m.replace(/\.?0+$/, ""); return m + "E" + (+e < 0 ? "-" : "+") + String(Math.abs(+e)).padStart(2, "0"); };
  if (a >= 1e11 || a < 1e-9) return sci(v);
  const s = String(+v.toPrecision(10));
  return s.includes("e") ? sci(v) : s;
}

function splitSections(code) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') q = !q;
    if (ch === "\\" && !q) { cur += ch + (code[i + 1] ?? ""); i++; continue; }
    if (ch === ";" && !q) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function fmtTokens(sec) {
  const toks = [];
  const lit = (v) => { const l = toks[toks.length - 1]; if (l && l.t === "lit") l.v += v; else toks.push({ t: "lit", v }); };
  for (let i = 0; i < sec.length; i++) {
    const ch = sec[i], rest = sec.slice(i);
    if (ch === '"') { const j = sec.indexOf('"', i + 1); lit(sec.slice(i + 1, j < 0 ? undefined : j)); i = j < 0 ? sec.length : j; continue; }
    if (ch === "\\") { lit(sec[i + 1] ?? ""); i++; continue; }
    if (ch === "_") { lit(" "); i++; continue; }
    if (ch === "*") { i++; continue; }
    if (ch === "[") { const j = sec.indexOf("]", i); const inner = sec.slice(i + 1, j); if (/^(h+|m+|s+)$/i.test(inner)) toks.push({ t: "date", v: inner.toLowerCase(), elapsed: true }); i = j < 0 ? sec.length : j; continue; }
    let m;
    if ((m = /^(am\/pm|a\/p)/i.exec(rest))) { toks.push({ t: "ampm", v: m[1] }); i += m[1].length - 1; continue; }
    if ((m = /^(y+|m+|d+|h+|s+)/i.exec(rest))) { toks.push({ t: "date", v: m[1].toLowerCase() }); i += m[1].length - 1; continue; }
    if ((m = /^[eE][+-]/.exec(rest)) && toks.some((t) => t.t === "num")) { toks.push({ t: "exp", v: m[0][1] }); i += 1; continue; }
    if ("0#?".includes(ch)) { toks.push({ t: "num", v: ch }); continue; }
    if (ch === "." && (/[0#?]/.test(sec[i + 1] || "") || toks.some((t) => t.t === "num"))) { toks.push({ t: "dot" }); continue; }
    if (ch === "," && toks.some((t) => t.t === "num")) { toks.push({ t: "comma" }); continue; }
    if (ch === "%") { toks.push({ t: "pct" }); lit("%"); continue; }
    if (ch === "@") { toks.push({ t: "text" }); continue; }
    lit(ch);
  }
  return toks;
}
function roundTo(x, d) {
  const f = 10 ** Math.abs(d);
  const s = Math.sign(x), a = Math.abs(x);
  if (d >= 0) return (s * Math.round(+(a * f).toPrecision(15))) / f;
  return s * Math.round(+(a / f).toPrecision(15)) * f;
}
function formatDate(toks, v) {
  const p = serialToParts(v);
  const ampm = toks.some((t) => t.t === "ampm");
  const out = [];
  toks.forEach((t, i) => {
    if (t.t === "lit") return out.push(t.v);
    if (t.t === "ampm") return out.push(t.v.length > 3 ? (p.H < 12 ? "AM" : "PM") : (p.H < 12 ? "A" : "P"));
    if (t.t !== "date") return;
    const k = t.v[0], n = t.v.length;
    if (k === "y") return out.push(n <= 2 ? String(p.y % 100).padStart(2, "0") : String(p.y));
    if (k === "d") return out.push(n === 1 ? String(p.d) : n === 2 ? String(p.d).padStart(2, "0") : n === 3 ? WEEKDAYS[p.dow].slice(0, 3) : WEEKDAYS[p.dow]);
    if (k === "h") { const h = t.elapsed ? Math.floor(v * 24) : ampm ? p.H % 12 || 12 : p.H; return out.push(n >= 2 ? String(h).padStart(2, "0") : String(h)); }
    if (k === "s") return out.push(n >= 2 ? String(p.S).padStart(2, "0") : String(p.S));
    if (k === "m") {
      const prev = toks.slice(0, i).reverse().find((x) => x.t === "date"), next = toks.slice(i + 1).find((x) => x.t === "date");
      const minute = n <= 2 && ((prev && prev.v[0] === "h") || (next && next.v[0] === "s"));
      if (minute) return out.push(n === 2 ? String(p.M).padStart(2, "0") : String(p.M));
      return out.push(n === 1 ? String(p.m) : n === 2 ? String(p.m).padStart(2, "0") : n === 3 ? MONTHS[p.m - 1].slice(0, 3) : n === 5 ? MONTHS[p.m - 1][0] : MONTHS[p.m - 1]);
    }
  });
  return out.join("");
}
function formatNum(toks, v, signed) {
  const numIdx = toks.map((t, i) => (["num", "dot", "comma", "exp"].includes(t.t) ? i : -1)).filter((i) => i >= 0);
  if (!numIdx.length) return toks.map((t) => (t.t === "lit" ? t.v : "")).join("") ;
  const first = numIdx[0], last = numIdx[numIdx.length - 1];
  const part = toks.slice(first, last + 1);
  const pctN = toks.filter((t) => t.t === "pct").length;
  let x = Math.abs(v) * 100 ** pctN;
  const dotAt = part.findIndex((t) => t.t === "dot"), expAt = part.findIndex((t) => t.t === "exp");
  const intEnd = dotAt >= 0 ? dotAt : expAt >= 0 ? expAt : part.length;
  const intPh = part.slice(0, intEnd).filter((t) => t.t === "num");
  const fracPh = dotAt >= 0 ? part.slice(dotAt + 1, expAt >= 0 ? expAt : part.length).filter((t) => t.t === "num") : [];
  // Trailing commas after the integer digits divide by 1000 each; commas between digits group thousands.
  let scale = 0, j = intEnd - 1;
  while (j >= 0 && part[j].t === "comma") { scale++; j--; }
  const group = part.slice(0, j + 1).some((t) => t.t === "comma");
  x /= 1000 ** scale;
  let expTxt = "";
  if (expAt >= 0) {
    const expPh = part.slice(expAt + 1).filter((t) => t.t === "num").length || 1;
    let e = x === 0 ? 0 : Math.floor(Math.log10(x)) - (Math.max(1, intPh.length) - 1);
    let mant = x / 10 ** e;
    if (+roundTo(mant, fracPh.length) >= 10 ** Math.max(1, intPh.length)) { e++; mant = x / 10 ** e; }
    x = mant;
    expTxt = "E" + (e < 0 ? "-" : part[expAt].v === "+" ? "+" : "") + String(Math.abs(e)).padStart(expPh, "0");
  }
  const fixed = roundTo(x, fracPh.length).toFixed(fracPh.length);
  let [ip, fp = ""] = fixed.split(".");
  const minInt = intPh.filter((t) => t.v === "0").length;
  if (ip === "0" && minInt === 0) ip = "";
  ip = ip.padStart(minInt, "0");
  if (group) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const minFrac = fracPh.reduce((n, t, i) => (t.v !== "#" ? i + 1 : n), 0);
  while (fp.length > minFrac && fp.endsWith("0")) fp = fp.slice(0, -1);
  let num = ip + (dotAt >= 0 ? "." + fp : "") + expTxt;
  const isZero = !/[1-9]/.test(num);
  let out = "";
  toks.forEach((t, i) => { if (i === first) out += num; else if (t.t === "lit") out += t.v; });
  return signed && v < 0 && !isZero ? "-" + out : out;
}
/** Formats a value with an Excel number-format code ("#,##0.00", "0%", "dd mmm yyyy", '"Rs "#,##0'…). */
export function formatValue(v, code) {
  if (v instanceof FormulaError) return v.code;
  if (v === null || v === undefined) return "";
  if (!code || /^general$/i.test(code)) return generalText(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  const secs = splitSections(code);
  if (typeof v === "string") {
    const sec = secs[3] ?? secs.find((s) => fmtTokens(s).some((t) => t.t === "text"));
    if (!sec) return v;
    return fmtTokens(sec).map((t) => (t.t === "lit" ? t.v : t.t === "text" ? v : "")).join("");
  }
  if (!Number.isFinite(v)) return ERR.NUM;
  let sec = secs[0], signed = true;
  if (v < 0 && secs.length > 1 && secs[1] !== "") { sec = secs[1]; signed = false; }
  else if (v === 0 && secs.length > 2 && secs[2] !== "") sec = secs[2];
  if (/^general$/i.test(sec.trim())) return (signed ? "" : "") + generalText(signed ? v : Math.abs(v));
  const toks = fmtTokens(sec);
  if (toks.some((t) => t.t === "date" || t.t === "ampm")) return v < 0 ? "#".repeat(8) : formatDate(toks, v);
  return formatNum(toks, v, signed);
}

/* ---------------- tokenizer ---------------- */

const SHEET_P = "(?:('(?:[^']|'')+'|[A-Za-z_\\u00C0-\\uFFFF][\\w.\\u00C0-\\uFFFF]*)!)?";
const CELL_P = "(\\$?)([A-Za-z]{1,3})(\\$?)([1-9]\\d{0,6})";
const RE_RANGE = new RegExp("^" + SHEET_P + CELL_P + ":" + CELL_P + "(?![\\w.(!])");
const RE_CELL = new RegExp("^" + SHEET_P + CELL_P + "(?![\\w.(!:])");
const RE_COLS = new RegExp("^" + SHEET_P + "(\\$?)([A-Za-z]{1,3}):(\\$?)([A-Za-z]{1,3})(?![\\w.(!])");
const RE_ROWS = new RegExp("^" + SHEET_P + "(\\$?)([1-9]\\d{0,6}):(\\$?)([1-9]\\d{0,6})(?![\\w.(!])");
const RE_NAME = /^[A-Za-z_À-￿][\w.À-￿]*/;
const RE_NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/;
const ERR_SORTED = [...ERROR_CODES].sort((a, b) => b.length - a.length);
const sheetOf = (raw) => (raw ? (raw.startsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : raw) : null);

export function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  const syntax = (msg) => { throw err(ERR.ERROR, msg); };
  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const rest = src.slice(i);
    const s = i;
    if (ch === '"') {
      let j = i + 1, v = "";
      for (;;) {
        if (j >= n) syntax("A quote mark is not closed.");
        if (src[j] === '"') { if (src[j + 1] === '"') { v += '"'; j += 2; continue; } break; }
        v += src[j++];
      }
      toks.push({ t: "str", v, s, e: j + 1 }); i = j + 1; continue;
    }
    if (ch === "#") {
      const code = ERR_SORTED.find((c) => rest.toUpperCase().startsWith(c));
      if (!code) syntax("Unknown error value.");
      toks.push({ t: "err", v: code, s, e: i + code.length }); i += code.length; continue;
    }
    let m;
    if (ch === "'" || /[A-Za-z_$À-￿]/.test(ch)) {
      if ((m = RE_RANGE.exec(rest))) {
        const c1 = colIndex(m[3]), c2 = colIndex(m[7]);
        if (c1 < MAX_COLS && c2 < MAX_COLS) {
          toks.push({ t: "range", sheet: sheetOf(m[1]), sheetRaw: m[1] || "", r1: +m[5] - 1, c1, r2: +m[9] - 1, c2, ar1: !!m[4], ac1: !!m[2], ar2: !!m[8], ac2: !!m[6], s, e: i + m[0].length });
          i += m[0].length; continue;
        }
      }
      if ((m = RE_CELL.exec(rest))) {
        const col = colIndex(m[3]);
        if (col < MAX_COLS) { toks.push({ t: "ref", sheet: sheetOf(m[1]), sheetRaw: m[1] || "", row: +m[5] - 1, col, ar: !!m[4], ac: !!m[2], s, e: i + m[0].length }); i += m[0].length; continue; }
      }
      if ((m = RE_COLS.exec(rest))) {
        const c1 = colIndex(m[3]), c2 = colIndex(m[5]);
        if (c1 < MAX_COLS && c2 < MAX_COLS) { toks.push({ t: "range", whole: "cols", sheet: sheetOf(m[1]), sheetRaw: m[1] || "", r1: 0, r2: MAX_ROWS - 1, c1, c2, ac1: !!m[2], ac2: !!m[4], ar1: false, ar2: false, s, e: i + m[0].length }); i += m[0].length; continue; }
      }
      if ((m = RE_ROWS.exec(rest)) && m[1]) {
        toks.push({ t: "range", whole: "rows", sheet: sheetOf(m[1]), sheetRaw: m[1], c1: 0, c2: MAX_COLS - 1, r1: +m[3] - 1, r2: +m[5] - 1, ar1: !!m[2], ar2: !!m[4], ac1: false, ac2: false, s, e: i + m[0].length });
        i += m[0].length; continue;
      }
      if (ch === "'" || ch === "$") syntax("This reference is not complete.");
      m = RE_NAME.exec(rest);
      toks.push({ t: "name", v: m[0], s, e: i + m[0].length }); i += m[0].length; continue;
    }
    if (/[0-9.]/.test(ch)) {
      if ((m = RE_ROWS.exec(rest))) {
        toks.push({ t: "range", whole: "rows", sheet: null, sheetRaw: "", c1: 0, c2: MAX_COLS - 1, r1: +m[3] - 1, r2: +m[5] - 1, ar1: !!m[2], ar2: !!m[4], ac1: false, ac2: false, s, e: i + m[0].length });
        i += m[0].length; continue;
      }
      if ((m = RE_NUMBER.exec(rest))) { toks.push({ t: "num", v: parseFloat(m[0]), s, e: i + m[0].length }); i += m[0].length; continue; }
      syntax("A number is not written correctly.");
    }
    const two = src.slice(i, i + 2);
    if (two === "<>" || two === "<=" || two === ">=") { toks.push({ t: "op", v: two, s, e: i + 2 }); i += 2; continue; }
    if ("+-*/^&=<>%".includes(ch)) { toks.push({ t: "op", v: ch, s, e: i + 1 }); i++; continue; }
    if ("(),;{}".includes(ch)) { toks.push({ t: ch, s, e: i + 1 }); i++; continue; }
    syntax(`"${ch}" is not allowed here.`);
  }
  return toks;
}

/* ---------------- parser ---------------- */

/** Parses formula text (with or without the leading "=") into a tree. Throws FormulaError #ERROR! on bad syntax. */
export function parse(src) {
  let text = String(src);
  if (text.startsWith("=")) text = text.slice(1);
  const toks = tokenize(text);
  let i = 0;
  const peek = () => toks[i];
  const fail = (msg) => { throw err(ERR.ERROR, msg); };
  const isOp = (t, ...ops) => t && t.t === "op" && ops.includes(t.v);
  const expect = (type, msg) => { if (!peek() || peek().t !== type) fail(msg); return toks[i++]; };
  const bin = (next, ops) => () => { let l = next(); while (isOp(peek(), ...ops)) { const op = toks[i++].v; l = { type: "bin", op, l, r: next() }; } return l; };
  const primary = () => {
    const t = toks[i++];
    if (!t) fail("The formula ends too early.");
    if (t.t === "num") return { type: "num", v: t.v };
    if (t.t === "str") return { type: "str", v: t.v };
    if (t.t === "err") return { type: "err", v: t.v };
    if (t.t === "ref") return { type: "ref", sheet: t.sheet, row: t.row, col: t.col, ar: t.ar, ac: t.ac };
    if (t.t === "range") return { type: "range", sheet: t.sheet, r1: Math.min(t.r1, t.r2), c1: Math.min(t.c1, t.c2), r2: Math.max(t.r1, t.r2), c2: Math.max(t.c1, t.c2), whole: t.whole || null };
    if (t.t === "(") { const e = expr(); expect(")", "A bracket ( is not closed."); return { type: "paren", a: e }; }
    if (t.t === "{") {
      const rows = [[]];
      for (;;) {
        let neg = false;
        if (isOp(peek(), "-")) { i++; neg = true; }
        const v = toks[i++];
        if (!v) fail("An array { } is not closed.");
        if (v.t === "num") rows[rows.length - 1].push(neg ? -v.v : v.v);
        else if (!neg && v.t === "str") rows[rows.length - 1].push(v.v);
        else if (!neg && v.t === "err") rows[rows.length - 1].push(err(v.v));
        else if (!neg && v.t === "name" && /^(TRUE|FALSE)$/i.test(v.v)) rows[rows.length - 1].push(/^TRUE$/i.test(v.v));
        else fail("Arrays { } can only hold numbers, text and TRUE/FALSE.");
        const sep = toks[i++];
        if (sep && sep.t === "}") break;
        if (sep && sep.t === ",") continue;
        if (sep && sep.t === ";") { rows.push([]); continue; }
        fail("An array { } is not closed.");
      }
      if (rows.some((r) => r.length !== rows[0].length)) fail("Every row of an array needs the same number of values.");
      return { type: "array", rows };
    }
    if (t.t === "name") {
      if (peek() && peek().t === "(") {
        i++;
        const args = [];
        if (peek() && peek().t === ")") { i++; return { type: "func", name: normName(t.v), args }; }
        for (;;) {
          if (peek() && (peek().t === "," || peek().t === ";" || peek().t === ")")) args.push({ type: "empty" });
          else args.push(expr());
          const sep = toks[i++];
          if (!sep) fail(`${t.v.toUpperCase()}( is not closed with ).`);
          if (sep.t === ")") break;
          if (sep.t !== "," && sep.t !== ";") fail("Put a comma between the parts of a function.");
        }
        return { type: "func", name: normName(t.v), args };
      }
      if (/^TRUE$/i.test(t.v)) return { type: "bool", v: true };
      if (/^FALSE$/i.test(t.v)) return { type: "bool", v: false };
      return { type: "name", v: t.v };
    }
    fail(t.t === "op" ? `"${t.v}" is in the wrong place.` : "Something is in the wrong place.");
  };
  const postfix = () => { let a = primary(); while (isOp(peek(), "%")) { i++; a = { type: "pct", a }; } return a; };
  const prefix = () => (isOp(peek(), "-", "+") ? { type: "un", op: toks[i++].v, a: prefix() } : postfix());
  const power = bin(prefix, ["^"]);
  const mult = bin(power, ["*", "/"]);
  const add = bin(mult, ["+", "-"]);
  const concat = bin(add, ["&"]);
  const expr = bin(concat, ["=", "<>", "<", ">", "<=", ">="]);
  if (!toks.length) fail("The formula is empty.");
  const tree = expr();
  if (i < toks.length) fail(toks[i].t === ")" ? "There is an extra )." : "Something is in the wrong place.");
  return tree;
}
const ALIAS = { "STDEV.S": "STDEV", "VAR.S": "VAR", "MODE.SNGL": "MODE", "STDEV.P": "STDEVP", "VAR.P": "VARP", "CEILING.MATH": "CEILING", "FLOOR.MATH": "FLOOR", "RANK.EQ": "RANK" };
function normName(n) { const u = String(n).toUpperCase().replace(/^_XLFN\./, "").replace(/^_XLWS\./, ""); return ALIAS[u] || u; }

/** Every node of a tree, depth first. */
export function walk(node, fn) {
  if (!node) return;
  fn(node);
  if (node.args) node.args.forEach((a) => walk(a, fn));
  if (node.a) walk(node.a, fn);
  if (node.l) walk(node.l, fn);
  if (node.r) walk(node.r, fn);
}

/* ---------------- evaluator ---------------- */

/**
 * Evaluates a tree. ctx: { cell(sheet|null, row, col) → value, range(node) → Arr | FormulaError,
 * now() → Date, random() → 0..1, row, col (the formula's own cell, optional) }.
 */
export function evaluate(node, ctx) {
  switch (node.type) {
    case "num": case "str": case "bool": return node.v;
    case "err": return err(node.v);
    case "empty": return undefined;
    case "paren": return evaluate(node.a, ctx);
    case "name": return err(ERR.NAME, `"${node.v}" is not a known name or function.`);
    case "ref": { const v = ctx.cell(node.sheet, node.row, node.col); return v instanceof FormulaError && v.code === ERR.REF ? v : new Arr([[v]], { sheet: node.sheet, r1: node.row, c1: node.col, r2: node.row, c2: node.col }); }
    case "range": return ctx.range(node);
    case "array": return new Arr(node.rows.map((r) => r.slice()));
    case "un": return lift1(evaluate(node.a, ctx), (v) => { if (v instanceof FormulaError) return v; const n = toNum(v); return n instanceof FormulaError ? n : node.op === "-" ? -n : n; });
    case "pct": return lift1(evaluate(node.a, ctx), (v) => { if (v instanceof FormulaError) return v; const n = toNum(v); return n instanceof FormulaError ? n : n / 100; });
    case "bin": return binary(node.op, evaluate(node.l, ctx), evaluate(node.r, ctx));
    case "func": return callFunction(node, ctx);
    default: return err(ERR.ERROR);
  }
}
function lift1(v, f) { v = unwrap(v); return v instanceof Arr ? v.map(f) : f(v); }
function lift2(a, b, f) {
  a = unwrap(a); b = unwrap(b);
  if (!(a instanceof Arr) && !(b instanceof Arr)) return f(a, b);
  const A = a instanceof Arr ? a : null, B = b instanceof Arr ? b : null;
  const h = Math.max(A ? A.h : 1, B ? B.h : 1), w = Math.max(A ? A.w : 1, B ? B.w : 1);
  const pick = (X, x, r, c) => { if (!X) return x; const rr = X.h === 1 ? 0 : r, cc = X.w === 1 ? 0 : c; return rr < X.h && cc < X.w ? X.rows[rr][cc] : err(ERR.NA); };
  const rows = [];
  for (let r = 0; r < h; r++) { const row = []; for (let c = 0; c < w; c++) row.push(f(pick(A, a, r, c), pick(B, b, r, c))); rows.push(row); }
  return new Arr(rows);
}
function binary(op, a, b) {
  if (op === "&") return lift2(a, b, (x, y) => (x instanceof FormulaError ? x : y instanceof FormulaError ? y : toStr(x) + toStr(y)));
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) return lift2(a, b, (x, y) => {
    if (x instanceof FormulaError) return x;
    if (y instanceof FormulaError) return y;
    const c = compare(x, y);
    return op === "=" ? c === 0 : op === "<>" ? c !== 0 : op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0;
  });
  return lift2(a, b, (x, y) => arith(op, x, y));
}
function arith(op, a, b) {
  if (a instanceof FormulaError) return a;
  const x = toNum(a);
  if (x instanceof FormulaError) return x;
  if (b instanceof FormulaError) return b;
  const y = toNum(b);
  if (y instanceof FormulaError) return y;
  let r;
  if (op === "+") r = x + y;
  else if (op === "-") r = x - y;
  else if (op === "*") r = x * y;
  else if (op === "/") { if (y === 0) return err(ERR.DIV0); r = x / y; }
  else return power(x, y);
  return Number.isFinite(r) ? r : err(ERR.NUM);
}
function power(x, y) {
  if (x === 0 && y < 0) return err(ERR.DIV0);
  if (x === 0 && y === 0) return err(ERR.NUM);
  const r = Math.pow(x, y);
  return Number.isFinite(r) ? r : err(ERR.NUM);
}

/* ---------------- functions ---------------- */

const FN = Object.create(null);
/** kinds: one letter per argument (the last repeats): s = single value (spreads over arrays), a = range/array, v = as given, c = criteria. */
function def(name, min, max, kinds, fn, opts = {}) { FN[name] = { name, min, max, kinds, fn, ...opts }; }
export const FUNCTION_NAMES = () => Object.keys(FN).sort();
export const hasFunction = (name) => !!FN[normName(name)];

const kindAt = (spec, i) => (typeof spec.kinds === "function" ? spec.kinds(i) : spec.kinds[Math.min(i, spec.kinds.length - 1)]);
function callFunction(node, ctx) {
  const spec = FN[node.name];
  if (!spec) return err(ERR.NAME, `${node.name} is not a function Sheets knows.`);
  const n = node.args.length;
  if (n < spec.min || n > spec.max) return err(ERR.ERROR, `${node.name} needs ${spec.min === spec.max ? spec.min : `${spec.min} to ${spec.max}`} values.`);
  try {
    if (spec.lazy) return spec.fn(node.args.map((a) => () => evaluate(a, ctx)), ctx);
    return applyFn(spec, node.args.map((a) => evaluate(a, ctx)), ctx);
  } catch (e) {
    if (e instanceof FormulaError) return e;
    throw e;
  }
}
function applyFn(spec, args, ctx) {
  let H = 0, W = 0;
  const lifted = [];
  const vals = args.map((a, i) => {
    const k = kindAt(spec, i);
    if (k === "s") {
      if (a instanceof Arr) { if (a.h === 1 && a.w === 1) return a.rows[0][0]; lifted.push(i); H = Math.max(H, a.h); W = Math.max(W, a.w); }
      return a;
    }
    if (k === "c") return a instanceof Arr ? a.rows[0]?.[0] ?? null : a;
    if (k === "a") return a === undefined || a instanceof Arr || a instanceof FormulaError ? a : new Arr([[a]]);
    return a;
  });
  const call = (vs) => {
    if (!spec.noErr) for (let i = 0; i < vs.length; i++) { const k = kindAt(spec, i); if ((k === "s" || k === "a") && vs[i] instanceof FormulaError) return vs[i]; }
    try { return spec.fn(vs, ctx); } catch (e) { if (e instanceof FormulaError) return e; throw e; }
  };
  if (!lifted.length) return call(vals);
  const rows = [];
  for (let r = 0; r < H; r++) {
    const row = [];
    for (let c = 0; c < W; c++) {
      const vs = vals.slice();
      for (const i of lifted) { const A = vals[i], rr = A.h === 1 ? 0 : r, cc = A.w === 1 ? 0 : c; vs[i] = rr < A.h && cc < A.w ? A.rows[rr][cc] : err(ERR.NA); }
      const out = unwrap(call(vs));
      row.push(out instanceof Arr ? out.rows[0][0] : out);
    }
    rows.push(row);
  }
  return new Arr(rows);
}

// Argument helpers: they throw a FormulaError, which the caller turns into the cell's result.
const thr = (code) => { throw err(code); };
function N(v, def) {
  if (v === undefined) return def === undefined ? thr(ERR.VALUE) : def;
  v = unwrap(v);
  if (v instanceof Arr) thr(ERR.VALUE);
  const n = toNum(v);
  if (n instanceof FormulaError) throw n;
  return n;
}
const I = (v, def) => Math.trunc(N(v, def));
function S(v, def) { if (v === undefined) return def === undefined ? "" : def; v = unwrap(v); if (v instanceof FormulaError) throw v; if (v instanceof Arr) thr(ERR.VALUE); return toStr(v); }
function B(v, def) {
  if (v === undefined) return def === undefined ? thr(ERR.VALUE) : def;
  v = unwrap(v);
  if (v instanceof FormulaError) throw v;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (v === null) return false;
  if (typeof v === "string") { const u = v.trim().toUpperCase(); if (u === "TRUE") return true; if (u === "FALSE") return false; }
  return thr(ERR.VALUE);
}
/** Numbers for SUM-style functions: ranges give their numbers only; typed values are converted (text that is not a number = #VALUE!). */
function nums(args) {
  const out = [];
  for (const a of args) {
    if (a === undefined) continue;
    if (a instanceof Arr) { for (const v of a.values()) { if (typeof v === "number") out.push(v); else if (v instanceof FormulaError) throw v; } }
    else if (a instanceof FormulaError) throw a;
    else if (typeof a === "number") out.push(a);
    else if (typeof a === "boolean") out.push(+a);
    else if (typeof a === "string") { const n = textToNumber(a); if (n === null) thr(ERR.VALUE); out.push(n); }
  }
  return out;
}
const sum = (xs) => { let s = 0; for (const x of xs) s += x; return s; };
const mean = (xs) => (xs.length ? sum(xs) / xs.length : thr(ERR.DIV0));
function median(xs) { if (!xs.length) thr(ERR.NUM); const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function variance(xs, sample = true) { const n = xs.length; if (n < (sample ? 2 : 1)) thr(ERR.DIV0); const m = sum(xs) / n; let s = 0; for (const x of xs) s += (x - m) ** 2; return s / (sample ? n - 1 : n); }
function bools(args) {
  const out = [];
  for (const a of args) {
    if (a === undefined) continue;
    if (a instanceof Arr) { for (const v of a.values()) { if (typeof v === "boolean") out.push(v); else if (typeof v === "number") out.push(v !== 0); else if (v instanceof FormulaError) throw v; } }
    else if (a !== null) out.push(B(a));
  }
  if (!out.length) thr(ERR.VALUE);
  return out;
}
function wildRe(pattern, anchored = true) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "~" && (pattern[i + 1] === "*" || pattern[i + 1] === "?" || pattern[i + 1] === "~")) { re += "\\" + pattern[++i]; continue; }
    re += ch === "*" ? "[\\s\\S]*" : ch === "?" ? "[\\s\\S]" : ch.replace(/[.+^${}()|[\]\\/-]/g, "\\$&");
  }
  return new RegExp(anchored ? "^" + re + "$" : re, "i");
}
/** A test for criteria like 5, ">10", "<>Paid", "A*", "" (blank). */
export function criteria(c) {
  c = unwrap(c);
  if (c instanceof FormulaError) return (v) => v instanceof FormulaError && v.code === c.code;
  if (c === null || c === undefined) return (v) => v === null || v === "";
  if (typeof c === "number") return (v) => (typeof v === "number" && r15(v) === r15(c)) || (typeof v === "string" && textToNumber(v) === c);
  if (typeof c === "boolean") return (v) => v === c;
  let s = String(c), op = "=";
  const m = /^(<=|>=|<>|<|>|=)/.exec(s);
  if (m) { op = m[1]; s = s.slice(op.length); }
  if (s === "") {
    if (op === "=") return (v) => v === null || v === "";
    if (op === "<>") return (v) => v !== null && v !== "";
    return () => false;
  }
  const n = textToNumber(s);
  if (n !== null) {
    const test = (v) => { if (typeof v !== "number") return null; const x = r15(v), y = r15(n); return op === "=" ? x === y : op === "<>" ? x !== y : op === "<" ? x < y : op === ">" ? x > y : op === "<=" ? x <= y : x >= y; };
    if (op === "<>") return (v) => test(v) !== false;
    return (v) => test(v) === true;
  }
  const up = s.toUpperCase();
  if (up === "TRUE" || up === "FALSE") { const b = up === "TRUE"; return op === "=" ? (v) => v === b : op === "<>" ? (v) => v !== b : () => false; }
  if (op === "=" || op === "<>") { const re = wildRe(s); const hit = (v) => typeof v === "string" && re.test(v); return op === "=" ? hit : (v) => !hit(v); }
  return (v) => { if (typeof v !== "string") return false; const k = compare(v, s); return op === "<" ? k < 0 : op === ">" ? k > 0 : op === "<=" ? k <= 0 : k >= 0; };
}
// A range of the same size as `like`, starting at `a`'s top-left cell (Excel's rule for SUMIF's sum_range).
function sameShape(a, like, ctx) {
  if (a.h === like.h && a.w === like.w) return a;
  if (a.ref && ctx.range) { const r = ctx.range({ type: "range", sheet: a.ref.sheet, r1: a.ref.r1, c1: a.ref.c1, r2: a.ref.r1 + like.h - 1, c2: a.ref.c1 + like.w - 1 }); if (r instanceof Arr) return r; }
  return a;
}
function ifsMatches(args, first) {
  // args: [range1, crit1, range2, crit2, ...] → array of matching flat indexes in a range shaped like `first`.
  if (args.length % 2) thr(ERR.ERROR);
  const preds = [];
  for (let i = 0; i < args.length; i += 2) {
    const r = args[i];
    if (!(r instanceof Arr)) thr(ERR.VALUE);
    if (r.h !== first.h || r.w !== first.w) thr(ERR.VALUE);
    preds.push([r, criteria(args[i + 1])]);
  }
  const hits = [];
  for (let r = 0; r < first.h; r++) for (let c = 0; c < first.w; c++) if (preds.every(([R, p]) => p(R.rows[r][c]))) hits.push([r, c]);
  return hits;
}
const numsAt = (arr, hits) => { const out = []; for (const [r, c] of hits) { const v = arr.rows[r][c]; if (typeof v === "number") out.push(v); else if (v instanceof FormulaError) throw v; } return out; };
const vec = (a) => { if (a.h !== 1 && a.w !== 1) thr(ERR.NA); return a.flat(); };
function findExact(list, v, wildcards) {
  v = unwrap(v);
  if (v === null || v === undefined) return -1;
  if (typeof v === "string" && wildcards && /[*?~]/.test(v)) { const re = wildRe(v); return list.findIndex((x) => typeof x === "string" && re.test(x)); }
  return list.findIndex((x) => x !== null && typeRank(x) === typeRank(v) && compare(x, v) === 0);
}
function findSorted(list, v, mode) {
  let best = -1;
  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    if (x === null || typeRank(x) !== typeRank(v)) continue;
    const c = compare(x, v);
    if (mode === 1) { if (c <= 0) best = i; else break; } else { if (c >= 0) best = i; else break; }
  }
  return best;
}
function datePartsArg(v) { const n = N(v); if (n < 0) thr(ERR.NUM); return serialToParts(n); }
const todaySerial = (ctx) => { const d = ctx.now ? ctx.now() : new Date(); return dateToSerial(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const sortRank = (v) => (v === null || v === undefined ? 4 : typeRank(v));
const sortCmp = (a, b) => { const ra = sortRank(a), rb = sortRank(b); if (ra !== rb) return ra - rb; if (ra >= 3) return 0; return compare(a, b); };
const keyOf = (v) => (v === null || v === undefined ? "n:0" : typeof v === "number" ? "n:" + r15(v) : typeof v === "string" ? "s:" + v.toLowerCase() : typeof v === "boolean" ? "b:" + v : "e:" + v.code);
const textLen = (s) => (s.length > 32767 ? thr(ERR.VALUE) : s);

// Maths
def("SUM", 1, 255, "v", (a) => sum(nums(a)));
def("AVERAGE", 1, 255, "v", (a) => mean(nums(a)));
def("MIN", 1, 255, "v", (a) => { const x = nums(a); return x.length ? Math.min(...x) : 0; });
def("MAX", 1, 255, "v", (a) => { const x = nums(a); return x.length ? Math.max(...x) : 0; });
def("COUNT", 1, 255, "v", (a) => { let n = 0; for (const x of a) { if (x instanceof Arr) { for (const v of x.values()) if (typeof v === "number") n++; } else if (typeof x === "number" || typeof x === "boolean" || (typeof x === "string" && textToNumber(x) !== null)) n++; } return n; }, { noErr: true });
def("COUNTA", 1, 255, "v", (a) => { let n = 0; for (const x of a) { if (x instanceof Arr) { for (const v of x.values()) if (v !== null && v !== undefined) n++; } else if (x !== undefined) n++; } return n; }, { noErr: true });
def("COUNTBLANK", 1, 1, "a", ([a]) => { let n = 0; for (const v of a.values()) if (v === null || v === "") n++; return n; });
def("PRODUCT", 1, 255, "v", (a) => { const x = nums(a); return x.length ? x.reduce((p, v) => p * v, 1) : 0; });
def("ROUND", 1, 2, "s", ([n, d]) => roundTo(N(n), I(d, 0)));
function dirRound(x, d, f) {
  const s = Math.sign(x), a = Math.abs(x);
  if (d >= 0) { const m = 10 ** d; return (s * f(+(a * m).toPrecision(15))) / m; }
  const m = 10 ** -d;
  return s * f(+(a / m).toPrecision(15)) * m;
}
def("ROUNDUP", 1, 2, "s", ([n, d]) => dirRound(N(n), I(d, 0), Math.ceil));
def("ROUNDDOWN", 1, 2, "s", ([n, d]) => dirRound(N(n), I(d, 0), Math.floor));
def("TRUNC", 1, 2, "s", ([n, d]) => dirRound(N(n), I(d, 0), Math.floor));
def("INT", 1, 1, "s", ([n]) => Math.floor(N(n)));
def("ABS", 1, 1, "s", ([n]) => Math.abs(N(n)));
def("SIGN", 1, 1, "s", ([n]) => Math.sign(N(n)));
def("SQRT", 1, 1, "s", ([n]) => { const x = N(n); return x < 0 ? thr(ERR.NUM) : Math.sqrt(x); });
def("POWER", 2, 2, "s", ([b, e]) => { const r = power(N(b), N(e)); if (r instanceof FormulaError) throw r; return r; });
def("EXP", 1, 1, "s", ([n]) => Math.exp(N(n)));
def("LN", 1, 1, "s", ([n]) => { const x = N(n); return x <= 0 ? thr(ERR.NUM) : Math.log(x); });
def("LOG10", 1, 1, "s", ([n]) => { const x = N(n); return x <= 0 ? thr(ERR.NUM) : Math.log10(x); });
def("LOG", 1, 2, "s", ([n, b]) => { const x = N(n), y = N(b, 10); return x <= 0 || y <= 0 ? thr(ERR.NUM) : y === 1 ? thr(ERR.DIV0) : Math.log(x) / Math.log(y); });
def("MOD", 2, 2, "s", ([n, d]) => { const x = N(n), y = N(d); if (y === 0) thr(ERR.DIV0); return r15(x - y * Math.floor(x / y)); });
def("CEILING", 1, 2, "s", ([n, s]) => { const x = N(n), y = N(s, 1); if (y === 0) return 0; if (x > 0 && y < 0) thr(ERR.NUM); return r15(Math.ceil(r15(x / y)) * y); });
def("FLOOR", 1, 2, "s", ([n, s]) => { const x = N(n), y = N(s, 1); if (y === 0) thr(ERR.DIV0); if (x > 0 && y < 0) thr(ERR.NUM); return r15(Math.floor(r15(x / y)) * y); });
def("PI", 0, 0, "s", () => Math.PI);
def("RAND", 0, 0, "s", (_, ctx) => (ctx.random ? ctx.random() : Math.random()), { volatile: true });
def("RANDBETWEEN", 2, 2, "s", ([a, b], ctx) => { const lo = Math.ceil(N(a)), hi = Math.floor(N(b)); if (lo > hi) thr(ERR.NUM); return lo + Math.floor((ctx.random ? ctx.random() : Math.random()) * (hi - lo + 1)); }, { volatile: true });
def("SUMPRODUCT", 1, 255, "a", (arrs) => {
  const h = arrs[0].h, w = arrs[0].w;
  if (arrs.some((a) => a.h !== h || a.w !== w)) thr(ERR.VALUE);
  let s = 0;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    let p = 1;
    for (const a of arrs) { const v = a.rows[r][c]; if (v instanceof FormulaError) throw v; p *= typeof v === "number" ? v : 0; }
    s += p;
  }
  return s;
});
def("SUMSQ", 1, 255, "v", (a) => sum(nums(a).map((x) => x * x)));

// Logic
def("IF", 2, 3, "v", ([c, t, f]) => {
  const val = (th) => { const v = th(); return v === undefined ? 0 : v; };
  const cond = unwrap(c());
  if (cond instanceof Arr) {
    const tv = unwrap(val(t)), fv = f ? unwrap(val(f)) : false;
    const at = (X, r, cc) => (X instanceof Arr ? X.rows[X.h === 1 ? 0 : r]?.[X.w === 1 ? 0 : cc] ?? err(ERR.NA) : X);
    return cond.map((v, r, cc) => { if (v instanceof FormulaError) return v; let b; try { b = B(v); } catch (e) { return e; } return b ? at(tv, r, cc) : at(fv, r, cc); });
  }
  if (cond === undefined) return f ? val(f) : false;
  return B(cond) ? val(t) : f ? val(f) : false;
}, { lazy: true });
def("IFS", 2, 254, "v", (th) => {
  if (th.length % 2) thr(ERR.NA);
  for (let i = 0; i < th.length; i += 2) if (B(th[i]())) { const v = th[i + 1](); return v === undefined ? 0 : v; }
  return thr(ERR.NA);
}, { lazy: true });
def("IFERROR", 2, 2, "v", ([v, alt]) => {
  const a = alt === undefined ? 0 : unwrap(alt);
  v = unwrap(v);
  if (v instanceof Arr) return v.map((x) => (x instanceof FormulaError ? (a instanceof Arr ? a.rows[0][0] : a) : x));
  return v instanceof FormulaError ? a : v === undefined ? 0 : v;
}, { noErr: true });
def("IFNA", 2, 2, "v", ([v, alt]) => { v = unwrap(v); return v instanceof FormulaError && v.code === ERR.NA ? unwrap(alt) : v; }, { noErr: true });
def("AND", 1, 255, "v", (a) => bools(a).every(Boolean));
def("OR", 1, 255, "v", (a) => bools(a).some(Boolean));
def("XOR", 1, 255, "v", (a) => bools(a).filter(Boolean).length % 2 === 1);
def("NOT", 1, 1, "s", ([v]) => !B(v));
def("TRUE", 0, 0, "s", () => true);
def("FALSE", 0, 0, "s", () => false);
def("NA", 0, 0, "s", () => thr(ERR.NA));

// Conditional totals
def("SUMIF", 2, 3, "aca", ([range, c, sr], ctx) => { const p = criteria(c), t = sr ? sameShape(sr, range, ctx) : range; let s = 0; range.rows.forEach((row, r) => row.forEach((v, k) => { if (p(v)) { const x = t.rows[r]?.[k]; if (typeof x === "number") s += x; else if (x instanceof FormulaError) throw x; } })); return s; });
def("COUNTIF", 2, 2, "ac", ([range, c]) => { const p = criteria(c); let n = 0; for (const v of range.values()) if (p(v)) n++; return n; });
def("AVERAGEIF", 2, 3, "aca", ([range, c, ar], ctx) => { const p = criteria(c), t = ar ? sameShape(ar, range, ctx) : range; const xs = []; range.rows.forEach((row, r) => row.forEach((v, k) => { if (p(v)) { const x = t.rows[r]?.[k]; if (typeof x === "number") xs.push(x); else if (x instanceof FormulaError) throw x; } })); return mean(xs); });
const ifsKinds = (i) => (i % 2 === 0 ? "a" : "c");
const aggKinds = (i) => (i === 0 || i % 2 === 1 ? "a" : "c");
def("COUNTIFS", 2, 254, ifsKinds, (a) => ifsMatches(a, a[0]).length);
def("SUMIFS", 3, 255, aggKinds, ([t, ...rest]) => sum(numsAt(t, ifsMatches(rest, t))));
def("AVERAGEIFS", 3, 255, aggKinds, ([t, ...rest]) => mean(numsAt(t, ifsMatches(rest, t))));
def("MAXIFS", 3, 255, aggKinds, ([t, ...rest]) => { const x = numsAt(t, ifsMatches(rest, t)); return x.length ? Math.max(...x) : 0; });
def("MINIFS", 3, 255, aggKinds, ([t, ...rest]) => { const x = numsAt(t, ifsMatches(rest, t)); return x.length ? Math.min(...x) : 0; });

// Lookup
def("VLOOKUP", 3, 4, "sass", ([v, t, col, approx]) => {
  const c = I(col);
  if (c < 1) thr(ERR.VALUE);
  if (c > t.w) thr(ERR.REF);
  const keys = t.rows.map((r) => r[0]);
  const i = approx === undefined || B(approx) ? findSorted(keys, v, 1) : findExact(keys, v, true);
  return i < 0 ? thr(ERR.NA) : t.rows[i][c - 1];
});
def("HLOOKUP", 3, 4, "sass", ([v, t, row, approx]) => {
  const r = I(row);
  if (r < 1) thr(ERR.VALUE);
  if (r > t.h) thr(ERR.REF);
  const i = approx === undefined || B(approx) ? findSorted(t.rows[0], v, 1) : findExact(t.rows[0], v, true);
  return i < 0 ? thr(ERR.NA) : t.rows[r - 1][i];
});
def("MATCH", 2, 3, "sas", ([v, a, type]) => {
  const list = vec(a), t = I(type, 1);
  const i = t === 0 ? findExact(list, v, true) : findSorted(list, v, t > 0 ? 1 : -1);
  return i < 0 ? thr(ERR.NA) : i + 1;
});
def("INDEX", 2, 3, "ass", ([a, rowN, colN]) => {
  let r = I(rowN, 0), c = colN === undefined ? undefined : I(colN, 0);
  if (c === undefined) { if (a.h === 1) { c = r; r = 1; } else c = a.w === 1 ? 1 : 0; }
  if (r < 0 || c < 0) thr(ERR.VALUE);
  if (r > a.h || c > a.w) thr(ERR.REF);
  if (r === 0 && c === 0) return a;
  if (r === 0) return new Arr(a.rows.map((row) => [row[c - 1]]));
  if (c === 0) return new Arr([a.rows[r - 1].slice()]);
  return a.rows[r - 1][c - 1];
});
def("XLOOKUP", 3, 6, "saavss", ([v, la, ra, nf, mm, sm]) => {
  const list = vec(la), mode = I(mm, 0), search = I(sm, 1);
  const vertical = la.w === 1 && la.h > 1 ? true : la.h === 1 && la.w > 1 ? false : ra.h === list.length;
  if (vertical ? ra.h !== list.length : ra.w !== list.length) thr(ERR.VALUE);
  const order = list.map((_, i) => i);
  if (search < 0) order.reverse();
  let hit = -1;
  if (mode === 2 || mode === 0) {
    const re = mode === 2 && typeof v === "string" ? wildRe(v) : null;
    hit = order.find((i) => (re ? typeof list[i] === "string" && re.test(list[i]) : list[i] !== null && v !== null && typeRank(list[i]) === typeRank(v) && compare(list[i], v) === 0)) ?? -1;
  } else {
    let best = -1;
    for (const i of order) {
      const x = list[i];
      if (x === null || typeRank(x) !== typeRank(v)) continue;
      const c = compare(x, v);
      if (c === 0) { best = i; break; }
      if (mode < 0 ? c < 0 && (best < 0 || compare(x, list[best]) > 0) : c > 0 && (best < 0 || compare(x, list[best]) < 0)) best = i;
    }
    hit = best;
  }
  if (hit < 0) { if (nf === undefined) thr(ERR.NA); return unwrap(nf); }
  if (vertical) return ra.w === 1 ? ra.rows[hit][0] : new Arr([ra.rows[hit].slice()]);
  return ra.h === 1 ? ra.rows[0][hit] : new Arr(ra.rows.map((row) => [row[hit]]));
}, { noErr: false });
def("CHOOSE", 2, 255, "v", (th) => { const i = Math.trunc(N(th[0]())); if (i < 1 || i >= th.length) thr(ERR.VALUE); const v = th[i](); return v === undefined ? 0 : v; }, { lazy: true });
def("ROWS", 1, 1, "a", ([a]) => a.h);
def("COLUMNS", 1, 1, "a", ([a]) => a.w);
def("ROW", 0, 1, "v", ([a], ctx) => (a === undefined ? (ctx.row ?? 0) + 1 : a instanceof Arr && a.ref ? a.ref.r1 + 1 : thr(ERR.VALUE)), { noErr: true });
def("COLUMN", 0, 1, "v", ([a], ctx) => (a === undefined ? (ctx.col ?? 0) + 1 : a instanceof Arr && a.ref ? a.ref.c1 + 1 : thr(ERR.VALUE)), { noErr: true });

// Text
def("LEN", 1, 1, "s", ([t]) => S(t).length);
def("LEFT", 1, 2, "s", ([t, n]) => { const k = I(n, 1); if (k < 0) thr(ERR.VALUE); return S(t).slice(0, k); });
def("RIGHT", 1, 2, "s", ([t, n]) => { const s = S(t), k = I(n, 1); if (k < 0) thr(ERR.VALUE); return s.slice(Math.max(0, s.length - k)); });
def("MID", 3, 3, "s", ([t, st, n]) => { const a = I(st), k = I(n); if (a < 1 || k < 0) thr(ERR.VALUE); return S(t).substr(a - 1, k); });
def("UPPER", 1, 1, "s", ([t]) => S(t).toUpperCase());
def("LOWER", 1, 1, "s", ([t]) => S(t).toLowerCase());
def("PROPER", 1, 1, "s", ([t]) => S(t).toLowerCase().replace(/\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1)));
def("TRIM", 1, 1, "s", ([t]) => S(t).replace(/ {2,}/g, " ").replace(/^ +| +$/g, ""));
def("CONCAT", 1, 255, "v", (a) => { let s = ""; for (const x of a) { if (x instanceof Arr) { for (const v of x.values()) s += toStr(v); } else if (x !== undefined) s += toStr(x); } return textLen(s); });
def("CONCATENATE", 1, 255, "s", (a) => textLen(a.map((x) => S(x)).join("")));
def("TEXTJOIN", 3, 255, (i) => (i < 2 ? "s" : "v"), ([d, ig, ...items]) => {
  const delim = S(d), skip = B(ig), parts = [];
  for (const x of items) { const vals = x instanceof Arr ? x.flat() : [x]; for (const v of vals) { if (v instanceof FormulaError) throw v; const s = v === undefined ? "" : toStr(v); if (skip && s === "") continue; parts.push(s); } }
  return textLen(parts.join(delim));
});
def("SUBSTITUTE", 3, 4, "s", ([t, o, nw, inst]) => {
  const s = S(t), old = S(o), rep = S(nw);
  if (!old) return s;
  if (inst === undefined) return s.split(old).join(rep);
  const k = I(inst);
  if (k < 1) thr(ERR.VALUE);
  let at = -1;
  for (let i = 0; i < k; i++) { at = s.indexOf(old, at + 1); if (at < 0) return s; }
  return s.slice(0, at) + rep + s.slice(at + old.length);
});
def("REPLACE", 4, 4, "s", ([t, st, n, nw]) => { const s = S(t), a = I(st), k = I(n); if (a < 1 || k < 0) thr(ERR.VALUE); return s.slice(0, a - 1) + S(nw) + s.slice(a - 1 + k); });
def("FIND", 2, 3, "s", ([f, w, st]) => { const s = S(w), a = I(st, 1); if (a < 1 || a > s.length + 1) thr(ERR.VALUE); const i = s.indexOf(S(f), a - 1); return i < 0 ? thr(ERR.VALUE) : i + 1; });
def("SEARCH", 2, 3, "s", ([f, w, st]) => {
  const s = S(w), a = I(st, 1), q = S(f);
  if (a < 1 || a > s.length + 1) thr(ERR.VALUE);
  if (!q) return a;
  const m = wildRe(q, false).exec(s.slice(a - 1));
  return m ? m.index + a : thr(ERR.VALUE);
});
def("TEXT", 2, 2, "s", ([v, f]) => { let x = unwrap(v); if (typeof x === "string") { const n = textToNumber(x); if (n !== null) x = n; } return formatValue(x === undefined ? null : x, S(f)); });
def("VALUE", 1, 1, "s", ([v]) => { if (typeof v === "number") return v; if (v === null) return 0; if (typeof v === "string") { const n = textToNumber(v); return n === null ? thr(ERR.VALUE) : n; } return thr(ERR.VALUE); });
def("REPT", 2, 2, "s", ([t, n]) => { const k = I(n); if (k < 0) thr(ERR.VALUE); return textLen(S(t).repeat(k)); });
def("EXACT", 2, 2, "s", ([a, b]) => S(a) === S(b));

// Dates
def("TODAY", 0, 0, "s", (_, ctx) => todaySerial(ctx), { volatile: true });
def("NOW", 0, 0, "s", (_, ctx) => serialFromDate(ctx.now ? ctx.now() : new Date()), { volatile: true });
def("DATE", 3, 3, "s", ([y, m, d]) => { let yy = I(y); if (yy < 0 || yy > 9999) thr(ERR.NUM); if (yy < 1900) yy += 1900; const s = dateToSerial(yy, I(m), I(d)); return s < 0 ? thr(ERR.NUM) : s; });
def("YEAR", 1, 1, "s", ([v]) => datePartsArg(v).y);
def("MONTH", 1, 1, "s", ([v]) => datePartsArg(v).m);
def("DAY", 1, 1, "s", ([v]) => datePartsArg(v).d);
def("HOUR", 1, 1, "s", ([v]) => datePartsArg(v).H);
def("MINUTE", 1, 1, "s", ([v]) => datePartsArg(v).M);
def("SECOND", 1, 1, "s", ([v]) => datePartsArg(v).S);
def("WEEKDAY", 1, 2, "s", ([v, t]) => {
  const d = datePartsArg(v).dow, type = I(t, 1);
  if (type === 1 || type === 17) return d + 1;
  if (type === 2 || type === 11) return ((d + 6) % 7) + 1;
  if (type === 3) return (d + 6) % 7;
  if (type >= 12 && type <= 16) return ((d - (type - 10) + 7) % 7) + 1;
  return thr(ERR.NUM);
});
def("EDATE", 2, 2, "s", ([v, n]) => { const p = datePartsArg(v), k = I(n); const y = p.y + Math.floor((p.m - 1 + k) / 12), m = ((((p.m - 1 + k) % 12) + 12) % 12) + 1; return dateToSerial(y, m, Math.min(p.d, daysInMonth(y, m))); });
def("EOMONTH", 2, 2, "s", ([v, n]) => { const p = datePartsArg(v); return dateToSerial(p.y, p.m + I(n) + 1, 0); });
def("DAYS", 2, 2, "s", ([e, s]) => Math.floor(N(e)) - Math.floor(N(s)));
def("DATEDIF", 3, 3, "s", ([s, e, u]) => {
  const a = Math.floor(N(s)), b = Math.floor(N(e)), unit = S(u).toUpperCase();
  if (a > b) thr(ERR.NUM);
  const p = serialToParts(a), q = serialToParts(b);
  const months = (q.y - p.y) * 12 + (q.m - p.m) - (q.d < p.d ? 1 : 0);
  switch (unit) {
    case "D": return b - a;
    case "M": return months;
    case "Y": return Math.floor(months / 12);
    case "YM": return months % 12;
    case "MD": return q.d >= p.d ? q.d - p.d : b - dateToSerial(q.y, q.m - 1, p.d);
    case "YD": { let t = dateToSerial(q.y, p.m, p.d); if (t > b) t = dateToSerial(q.y - 1, p.m, p.d); return b - t; }
    default: return thr(ERR.NUM);
  }
});
def("NETWORKDAYS", 2, 3, "ssa", ([s, e, hol]) => {
  let a = Math.floor(N(s)), b = Math.floor(N(e)), sign = 1;
  if (a > b) { [a, b] = [b, a]; sign = -1; }
  if (b - a > 400000) thr(ERR.NUM);
  const hs = new Set();
  if (hol) for (const v of hol.values()) { if (typeof v === "number") hs.add(Math.floor(v)); else if (v instanceof FormulaError) throw v; }
  let n = 0;
  for (let d = a; d <= b; d++) { const w = (((d - 1) % 7) + 7) % 7; if (w !== 0 && w !== 6 && !hs.has(d)) n++; }
  return sign * n;
});

// Arrays (results spill into the cells below / to the right)
def("UNIQUE", 1, 3, "ass", ([a, byCol, once]) => {
  const bc = B(byCol, false), ex = B(once, false);
  const lines = bc ? transpose(a.rows) : a.rows;
  const k = (l) => l.map(keyOf).join("\u0001");
  const counts = new Map();
  for (const l of lines) counts.set(k(l), (counts.get(k(l)) || 0) + 1);
  const seen = new Set(), out = [];
  for (const l of lines) { const key = k(l); if (seen.has(key)) continue; seen.add(key); if (ex && counts.get(key) !== 1) continue; out.push(l.slice()); }
  if (!out.length) thr(ERR.CALC);
  return new Arr(bc ? transpose(out) : out);
});
def("SORT", 1, 4, "asss", ([a, idx, ord, byCol]) => {
  const i = I(idx, 1), o = N(ord, 1), bc = B(byCol, false);
  if (o !== 1 && o !== -1) thr(ERR.VALUE);
  const lines = bc ? transpose(a.rows) : a.rows.map((r) => r.slice());
  if (i < 1 || i > (lines[0] || []).length) thr(ERR.VALUE);
  const sorted = lines.map((l, k) => [l, k]).sort((x, y) => {
    const ra = sortRank(x[0][i - 1]), rb = sortRank(y[0][i - 1]);
    if (ra === 4 || rb === 4) return ra - rb || x[1] - y[1];
    return sortCmp(x[0][i - 1], y[0][i - 1]) * o || x[1] - y[1];
  }).map((x) => x[0]);
  return new Arr(bc ? transpose(sorted) : sorted);
});
def("FILTER", 2, 3, "aav", ([a, inc, ifEmpty]) => {
  const truthy = (v) => { if (v instanceof FormulaError) throw v; if (typeof v === "string") thr(ERR.VALUE); return !!v; };
  let out;
  if (inc.w === 1 && inc.h === a.h) out = a.rows.filter((_, r) => truthy(inc.rows[r][0])).map((r) => r.slice());
  else if (inc.h === 1 && inc.w === a.w) { const keep = inc.rows[0].map(truthy); out = a.rows.map((r) => r.filter((_, c) => keep[c])); if (!out[0].length) out = []; }
  else thr(ERR.VALUE);
  if (!out.length) { if (ifEmpty === undefined) thr(ERR.CALC); return unwrap(ifEmpty); }
  return new Arr(out);
});
def("SEQUENCE", 1, 4, "s", ([rows, cols, start, step]) => {
  const h = I(rows), w = I(cols, 1), s0 = N(start, 1), st = N(step, 1);
  if (h < 1 || w < 1) thr(ERR.CALC);
  if (h * w > 1e6) thr(ERR.NUM);
  return new Arr(Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => s0 + st * (r * w + c))));
});
def("TRANSPOSE", 1, 1, "a", ([a]) => new Arr(transpose(a.rows)));

// Statistics
def("MEDIAN", 1, 255, "v", (a) => median(nums(a)));
def("MODE", 1, 255, "v", (a) => {
  const xs = nums(a), counts = new Map();
  let best = null, bc = 1;
  for (const x of xs) { const c = (counts.get(x) || 0) + 1; counts.set(x, c); }
  for (const x of xs) { const c = counts.get(x); if (c > bc) { bc = c; best = x; } }
  return best === null ? thr(ERR.NA) : best;
});
def("STDEV", 1, 255, "v", (a) => Math.sqrt(variance(nums(a))));
def("VAR", 1, 255, "v", (a) => variance(nums(a)));
def("STDEVP", 1, 255, "v", (a) => Math.sqrt(variance(nums(a), false)));
def("VARP", 1, 255, "v", (a) => variance(nums(a), false));
def("LARGE", 2, 2, "as", ([a, k]) => { const xs = nums([a]).sort((x, y) => y - x), i = Math.ceil(N(k)); return i < 1 || i > xs.length ? thr(ERR.NUM) : xs[i - 1]; });
def("SMALL", 2, 2, "as", ([a, k]) => { const xs = nums([a]).sort((x, y) => x - y), i = Math.ceil(N(k)); return i < 1 || i > xs.length ? thr(ERR.NUM) : xs[i - 1]; });
def("RANK", 2, 3, "sas", ([v, a, ord]) => {
  const x = N(v), xs = nums([a]), asc = N(ord, 0) !== 0;
  if (!xs.some((y) => r15(y) === r15(x))) thr(ERR.NA);
  return 1 + xs.filter((y) => (asc ? y < x : y > x)).length;
});

// Information
def("ISBLANK", 1, 1, "s", ([v]) => v === null || v === undefined, { noErr: true });
def("ISNUMBER", 1, 1, "s", ([v]) => typeof v === "number", { noErr: true });
def("ISTEXT", 1, 1, "s", ([v]) => typeof v === "string", { noErr: true });
def("ISLOGICAL", 1, 1, "s", ([v]) => typeof v === "boolean", { noErr: true });
def("ISERROR", 1, 1, "s", ([v]) => v instanceof FormulaError, { noErr: true });
def("ISNA", 1, 1, "s", ([v]) => v instanceof FormulaError && v.code === ERR.NA, { noErr: true });
def("ISEVEN", 1, 1, "s", ([v]) => Math.trunc(N(v)) % 2 === 0);
def("ISODD", 1, 1, "s", ([v]) => Math.abs(Math.trunc(N(v)) % 2) === 1);

/* financial (Excel sign rules: money paid out is negative) */
const fin = (r, n, pv, fv, type) => ({ r, n, pv, fv, t: type ? 1 : 0 });
function pmtOf({ r, n, pv, fv, t }) { if (n === 0) thr(ERR.NUM); if (r === 0) return -(pv + fv) / n; const f = (1 + r) ** n; return -(r * (pv * f + fv)) / ((1 + r * t) * (f - 1)); }
function fvOf({ r, n, pv, t }, pmt) { if (r === 0) return -(pv + pmt * n); const f = (1 + r) ** n; return -(pv * f + pmt * (1 + r * t) * (f - 1) / r); }
function pvOf({ r, n, fv, t }, pmt) { if (r === 0) return -(fv + pmt * n); const f = (1 + r) ** n; return -(fv + pmt * (1 + r * t) * (f - 1) / r) / f; }
const finite = (x) => (Number.isFinite(x) ? x : thr(ERR.NUM));
def("PMT", 3, 5, "s", ([r, n, pv, fv, t]) => finite(pmtOf(fin(N(r), N(n), N(pv), N(fv, 0), N(t, 0)))));
def("FV", 3, 5, "s", ([r, n, pmt, pv, t]) => finite(fvOf(fin(N(r), N(n), N(pv, 0), 0, N(t, 0)), N(pmt))));
def("PV", 3, 5, "s", ([r, n, pmt, fv, t]) => finite(pvOf(fin(N(r), N(n), 0, N(fv, 0), N(t, 0)), N(pmt))));
def("NPER", 3, 5, "s", ([r, pmt, pv, fv, t]) => {
  const R = N(r), P = N(pmt), V = N(pv), F = N(fv, 0), T = N(t, 0) ? 1 : 0;
  if (R === 0) { if (P === 0) thr(ERR.NUM); return finite(-(V + F) / P); }
  const a = P * (1 + R * T) - F * R, b = V * R + P * (1 + R * T);
  if (a / b <= 0) thr(ERR.NUM);
  return finite(Math.log(a / b) / Math.log(1 + R));
});
def("RATE", 3, 6, "s", ([n, pmt, pv, fv, t, guess]) => {
  const Nn = N(n), P = N(pmt), V = N(pv), F = N(fv, 0), T = N(t, 0) ? 1 : 0;
  let r = N(guess, 0.1);
  for (let i = 0; i < 100; i++) {
    const g = (x) => (x === 0 ? V + P * Nn + F : V * (1 + x) ** Nn + P * (1 + x * T) * ((1 + x) ** Nn - 1) / x + F);
    const y = g(r), d = (g(r + 1e-7) - y) / 1e-7;
    if (!Number.isFinite(d) || d === 0) break;
    const next = r - y / d;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }
  return thr(ERR.NUM);
});
def("IPMT", 4, 6, "s", ([r, per, n, pv, fv, t]) => {
  const R = N(r), k = N(per), Nn = N(n), V = N(pv), F = N(fv, 0), T = N(t, 0) ? 1 : 0;
  if (k < 1 || k > Nn) thr(ERR.NUM);
  const p = pmtOf(fin(R, Nn, V, F, T));
  if (T && k === 1) return 0;
  const bal = fvOf(fin(R, k - 1, V, 0, T), p);
  return finite((T ? bal / (1 + R) : bal) * R);
});
def("PPMT", 4, 6, "s", ([r, per, n, pv, fv, t]) => {
  const R = N(r), k = N(per), Nn = N(n), V = N(pv), F = N(fv, 0), T = N(t, 0) ? 1 : 0;
  if (k < 1 || k > Nn) thr(ERR.NUM);
  const p = pmtOf(fin(R, Nn, V, F, T));
  const bal = fvOf(fin(R, k - 1, V, 0, T), p);
  const ip = T && k === 1 ? 0 : (T ? bal / (1 + R) : bal) * R;
  return finite(p - ip);
});
def("NPV", 2, 255, "s" + "a".repeat(254), ([r, ...vals]) => { const R = N(r); if (R === -1) thr(ERR.DIV0); return nums(vals).reduce((s, v, i) => s + v / (1 + R) ** (i + 1), 0); });
def("IRR", 1, 2, "as", ([vals, guess]) => {
  const xs = nums([vals]);
  if (!xs.some((x) => x > 0) || !xs.some((x) => x < 0)) thr(ERR.NUM);
  let r = N(guess, 0.1);
  for (let i = 0; i < 100; i++) {
    let f = 0, d = 0;
    xs.forEach((x, k) => { f += x / (1 + r) ** k; d -= (k * x) / (1 + r) ** (k + 1); });
    if (d === 0) break;
    const next = r - f / d;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }
  return thr(ERR.NUM);
});
def("SLN", 3, 3, "s", ([cost, salvage, life]) => { const L = N(life); if (L === 0) thr(ERR.DIV0); return (N(cost) - N(salvage)) / L; });
def("EFFECT", 2, 2, "s", ([nom, n]) => { const R = N(nom), K = Math.trunc(N(n)); if (R <= 0 || K < 1) thr(ERR.NUM); return (1 + R / K) ** K - 1; });

/* engineering */
const baseTo = (n, base, places) => {
  let x = Math.trunc(N(n));
  const lim = { 2: 512, 8: 536870912, 16: 549755813888 }[base];
  if (x < -lim || x >= lim) thr(ERR.NUM);
  let s = x < 0 ? (lim * 2 + x).toString(base) : x.toString(base);
  if (places !== undefined) { const p = Math.trunc(N(places)); if (s.length > p || p < 0) thr(ERR.NUM); s = s.padStart(p, "0"); }
  return s.toUpperCase();
};
const baseFrom = (t, base) => {
  const s = S(t).trim(), re = { 2: /^[01]{1,10}$/, 8: /^[0-7]{1,10}$/, 16: /^[0-9a-f]{1,10}$/i }[base];
  if (!re.test(s)) thr(ERR.NUM);
  const v = parseInt(s, base), lim = { 2: 512, 8: 536870912, 16: 549755813888 }[base];
  return s.length === 10 && v >= lim ? v - lim * 2 : v;
};
def("DEC2BIN", 1, 2, "s", ([n, p]) => baseTo(n, 2, p));
def("DEC2OCT", 1, 2, "s", ([n, p]) => baseTo(n, 8, p));
def("DEC2HEX", 1, 2, "s", ([n, p]) => baseTo(n, 16, p));
def("BIN2DEC", 1, 1, "s", ([t]) => baseFrom(t, 2));
def("OCT2DEC", 1, 1, "s", ([t]) => baseFrom(t, 8));
def("HEX2DEC", 1, 1, "s", ([t]) => baseFrom(t, 16));
const UNITS = {
  m: ["len", 1], km: ["len", 1000], cm: ["len", 0.01], mm: ["len", 0.001], mi: ["len", 1609.344], yd: ["len", 0.9144], ft: ["len", 0.3048], in: ["len", 0.0254],
  kg: ["mass", 1], g: ["mass", 0.001], mg: ["mass", 1e-6], lbm: ["mass", 0.45359237], ozm: ["mass", 0.028349523125], t: ["mass", 1000],
  l: ["vol", 1], L: ["vol", 1], ml: ["vol", 0.001], mL: ["vol", 0.001], gal: ["vol", 3.785411784], cup: ["vol", 0.2365882365],
  sec: ["time", 1], s: ["time", 1], mn: ["time", 60], min: ["time", 60], hr: ["time", 3600], day: ["time", 86400], d: ["time", 86400], wk: ["time", 604800],
  m2: ["area", 1], km2: ["area", 1e6], ha: ["area", 1e4], ft2: ["area", 0.09290304], acre: ["area", 4046.8564224],
  "km/h": ["speed", 1 / 3.6], "m/s": ["speed", 1], mph: ["speed", 0.44704],
};
def("CONVERT", 3, 3, "s", ([n, from, to]) => {
  const x = N(n), f = S(from), t = S(to), T = ["C", "F", "K"];
  if (T.includes(f) && T.includes(t)) { const c = f === "C" ? x : f === "F" ? (x - 32) * 5 / 9 : x - 273.15; return t === "C" ? c : t === "F" ? c * 9 / 5 + 32 : c + 273.15; }
  const a = UNITS[f], b = UNITS[t];
  if (!a || !b || a[0] !== b[0]) thr(ERR.NA);
  return r15((x * a[1]) / b[1]);
});

/** Final value for a cell: a single value, plus the array to spill when the result is bigger than one cell. */
export function finalize(v) {
  if (v instanceof Arr) {
    if (v.h === 1 && v.w === 1) return { value: fix(v.rows[0][0]), spill: null };
    if (!v.h || !v.w) return { value: err(ERR.CALC), spill: null };
    return { value: fix(v.rows[0][0]), spill: v };
  }
  return { value: fix(v), spill: null };
}
const fix = (v) => (v === null || v === undefined ? 0 : typeof v === "number" && !Number.isFinite(v) ? err(ERR.NUM) : v);

/** Evaluates one formula against a getter: get(sheet|null, row, col) → value. Handy outside a Workbook. */
export function evaluateFormula(text, get, { now, random, maxRow = 999, maxCol = 25 } = {}) {
  let tree;
  try { tree = parse(text); } catch (e) { return e instanceof FormulaError ? e : err(ERR.ERROR); }
  const ctx = {
    cell: (s, r, c) => get(s, r, c) ?? null,
    range: (n) => { const r2 = Math.min(n.r2, maxRow), c2 = Math.min(n.c2, maxCol); const rows = []; for (let r = n.r1; r <= r2; r++) { const row = []; for (let c = n.c1; c <= c2; c++) row.push(get(n.sheet, r, c) ?? null); rows.push(row); } return new Arr(rows, { sheet: n.sheet, r1: n.r1, c1: n.c1, r2, c2 }); },
    now, random,
  };
  return finalize(evaluate(tree, ctx)).value;
}

/* ---------------- reference rewriting (fill, copy, insert/delete rows and columns) ---------------- */

function cellText(row, col, ar, ac) { return (ac ? "$" : "") + colName(col) + (ar ? "$" : "") + (row + 1); }
function tokText(t) {
  const p = t.sheetRaw ? t.sheetRaw + "!" : "";
  if (t.t === "ref") return p + cellText(t.row, t.col, t.ar, t.ac);
  if (t.whole === "cols") return p + (t.ac1 ? "$" : "") + colName(t.c1) + ":" + (t.ac2 ? "$" : "") + colName(t.c2);
  if (t.whole === "rows") return p + (t.ar1 ? "$" : "") + (t.r1 + 1) + ":" + (t.ar2 ? "$" : "") + (t.r2 + 1);
  return p + cellText(t.r1, t.c1, t.ar1, t.ac1) + ":" + cellText(t.r2, t.c2, t.ar2, t.ac2);
}
/** Rewrites every cell reference in formula text: fn(token) returns new text, or undefined to keep it. */
export function mapRefs(text, fn) {
  let toks;
  try { toks = tokenize(String(text)); } catch { return text; }
  let out = "", last = 0;
  for (const t of toks) {
    if (t.t !== "ref" && t.t !== "range") continue;
    const rep = fn(t);
    if (rep === undefined || rep === null) continue;
    out += text.slice(last, t.s) + rep;
    last = t.e;
  }
  return out + text.slice(last);
}
/** Formula moved by (dr, dc) cells, the way copy/paste and fill handle move it: relative parts move, $ parts stay. */
export function shiftFormula(text, dr, dc) {
  if (!dr && !dc) return text;
  return mapRefs(text, (t) => {
    const u = { ...t };
    if (t.t === "ref") {
      if (!t.ar) u.row += dr;
      if (!t.ac) u.col += dc;
      return u.row < 0 || u.col < 0 || u.row >= MAX_ROWS || u.col >= MAX_COLS ? "#REF!" : tokText(u);
    }
    if (t.whole !== "cols") { if (!t.ar1) u.r1 += dr; if (!t.ar2) u.r2 += dr; }
    if (t.whole !== "rows") { if (!t.ac1) u.c1 += dc; if (!t.ac2) u.c2 += dc; }
    return Math.min(u.r1, u.r2, u.c1, u.c2) < 0 || Math.max(u.r1, u.r2) >= MAX_ROWS || Math.max(u.c1, u.c2) >= MAX_COLS ? "#REF!" : tokText(u);
  });
}
/** New position of index x after inserting (count > 0) or deleting (count < 0) at `at`; null if deleted. */
export function moveIndex(x, at, count) {
  if (count > 0) return x >= at ? x + count : x;
  const n = -count;
  if (x >= at && x < at + n) return null;
  return x >= at + n ? x - n : x;
}
/** New [lo, hi] of a span after inserting/deleting; null when the whole span was deleted. */
export function moveSpan(lo, hi, at, count) {
  if (count > 0) return [lo >= at ? lo + count : lo, hi >= at ? hi + count : hi];
  const n = -count, end = at + n - 1;
  if (lo >= at && hi <= end) return null;
  return [lo < at ? lo : lo <= end ? at : lo - n, hi < at ? hi : hi <= end ? at - 1 : hi - n];
}
/** Updates references after rows/columns were inserted or deleted in sheet `target`. */
export function adjustFormula(text, { formulaSheet, target, axis, at, count }) {
  const same = (s) => String(s ?? formulaSheet).toLowerCase() === String(target).toLowerCase();
  return mapRefs(text, (t) => {
    if (!same(t.sheet)) return undefined;
    if (t.t === "ref") {
      const x = moveIndex(axis === "row" ? t.row : t.col, at, count);
      if (x === null) return "#REF!";
      return tokText({ ...t, [axis === "row" ? "row" : "col"]: x });
    }
    if ((axis === "row" && t.whole === "cols") || (axis === "col" && t.whole === "rows")) return undefined;
    const [a, b] = axis === "row" ? [t.r1, t.r2] : [t.c1, t.c2];
    const span = moveSpan(Math.min(a, b), Math.max(a, b), at, count);
    if (!span) return "#REF!";
    return tokText({ ...t, ...(axis === "row" ? { r1: span[0], r2: span[1] } : { c1: span[0], c2: span[1] }) });
  });
}
export function renameSheetRefs(text, oldName, newName) {
  return mapRefs(text, (t) => (t.sheet && t.sheet.toLowerCase() === oldName.toLowerCase() ? tokText({ ...t, sheetRaw: quoteSheet(newName) }) : undefined));
}
export function dropSheetRefs(text, name) {
  return mapRefs(text, (t) => (t.sheet && t.sheet.toLowerCase() === name.toLowerCase() ? "#REF!" : undefined));
}
/** All references in a formula as { sheet, r1, c1, r2, c2 } (0-based). */
export function formulaRefs(text) {
  const out = [];
  mapRefs(text, (t) => { out.push(t.t === "ref" ? { sheet: t.sheet, r1: t.row, c1: t.col, r2: t.row, c2: t.col } : { sheet: t.sheet, r1: Math.min(t.r1, t.r2), c1: Math.min(t.c1, t.c2), r2: Math.max(t.r1, t.r2), c2: Math.max(t.c1, t.c2), whole: t.whole }); });
  return out;
}

/* ---------------- workbook: cells, dependency graph, recalculation ---------------- */

const KM = MAX_COLS, SIDM = 2 ** 35;
const keyOfCell = (r, c) => r * KM + c;
const isFormulaInput = (input) => typeof input === "string" && input.length > 1 && input[0] === "=";
const sameVal = (a, b) => a === b || (a instanceof FormulaError && b instanceof FormulaError && a.code === b.code);

/**
 * Workbook: sheets of cells; set inputs with setCells and read values with getValue. Formulas recalculate
 * through a dependency graph (only what depends on a change), arrays spill, and loops give #CIRC!.
 */
export class Workbook {
  constructor({ now, random } = {}) {
    this.sheets = [];
    this.nextId = 1;
    this.now = now || (() => new Date());
    this.random = random || Math.random;
    this.dependents = new Map(); // global cell key -> Set of formula cell keys reading it directly
    this.rangeDeps = new Map(); // sheet id -> Set of { r1, c1, r2, c2, dep }
    this.volatile = new Set();
    this.byId = new Map();
    this._pending = null;
  }
  static fromJSON(json, opts) {
    const wb = new Workbook(opts);
    for (const s of json.sheets || []) {
      const sh = wb.addSheet(s.name, { rows: s.rows, cols: s.cols, rebuild: false });
      for (const [ref, input] of Object.entries(s.cells || {})) { const p = parseCellName(ref); if (p) wb._put(sh, p.row, p.col, input); }
    }
    if (!wb.sheets.length) wb.addSheet("Sheet1", { rebuild: false });
    wb.rebuild();
    return wb;
  }
  toJSON() {
    return { sheets: this.sheets.map((s) => ({ name: s.name, rows: s.rows, cols: s.cols, cells: Object.fromEntries([...s.cells.values()].sort((a, b) => a.r - b.r || a.c - b.c).map((c) => [cellName(c.r, c.c), c.input])) })) };
  }

  /* sheets */
  sheet(ref) {
    if (ref && typeof ref === "object") return ref;
    if (typeof ref === "number") return this.sheets[ref] || null;
    const n = String(ref ?? "").toLowerCase();
    return this.sheets.find((s) => s.name.toLowerCase() === n) || null;
  }
  validName(name, except = null) {
    const n = String(name || "").trim();
    if (!n) return "Give the sheet a name.";
    if (n.length > 31) return "Use up to 31 letters for a sheet name.";
    if (/[[\]:*?/\\]/.test(n) || /^'|'$/.test(n)) return "A sheet name can't use [ ] : * ? / \\ or start/end with '.";
    const other = this.sheet(n);
    if (other && other !== except) return "There is already a sheet with this name.";
    return null;
  }
  uniqueName(base = "Sheet") {
    if (!this.sheet(base) && !this.validName(base)) return base;
    const stem = base.replace(/\s*\(?\d+\)?$/, "") || "Sheet";
    for (let i = 2; ; i++) { const n = /^sheet$/i.test(stem) ? stem + i : `${stem} ${i}`; if (!this.sheet(n)) return n; }
  }
  addSheet(name, { rows = 1000, cols = 26, index = this.sheets.length, rebuild = true } = {}) {
    const n = name && !this.validName(name) ? name.trim() : this.uniqueName(name && !this.sheet(name) ? "Sheet" : name || `Sheet${this.sheets.length + 1}`);
    const s = { id: this.nextId++, name: n, rows: Math.max(1, rows | 0), cols: Math.max(1, Math.min(KM, cols | 0)), cells: new Map(), spill: new Map(), anchors: new Set() };
    this.sheets.splice(index, 0, s);
    this.byId.set(s.id, s);
    this.rangeDeps.set(s.id, new Set());
    if (rebuild) this.rebuild();
    return s;
  }
  renameSheet(ref, name) {
    const s = this.sheet(ref), problem = this.validName(name, s);
    if (problem) throw new Error(problem);
    const old = s.name;
    s.name = name.trim();
    this._rewrite((text) => renameSheetRefs(text, old, s.name));
    this.rebuild();
  }
  removeSheet(ref) {
    const s = this.sheet(ref);
    if (!s || this.sheets.length < 2) throw new Error("A workbook needs at least one sheet.");
    this.sheets.splice(this.sheets.indexOf(s), 1);
    this.byId.delete(s.id);
    this.rangeDeps.delete(s.id);
    this._rewrite((text) => dropSheetRefs(text, s.name));
    this.rebuild();
  }
  moveSheet(ref, to) { const s = this.sheet(ref); this.sheets.splice(this.sheets.indexOf(s), 1); this.sheets.splice(to, 0, s); }

  /* reading */
  getCell(ref, r, c) { return this.sheet(ref)?.cells.get(keyOfCell(r, c)) || null; }
  getInput(ref, r, c) { const cell = this.getCell(ref, r, c); return cell ? String(cell.input) : ""; }
  getValue(ref, r, c) {
    const s = this.sheet(ref);
    if (!s) return null;
    const k = keyOfCell(r, c), cell = s.cells.get(k);
    if (cell) return cell.value;
    const sp = s.spill.get(k);
    return sp ? sp.value : null;
  }
  /** Spill info for a cell: { anchor: [r, c] } when the value comes from another cell's array. */
  spillOf(ref, r, c) { const sp = this.sheet(ref)?.spill.get(keyOfCell(r, c)); return sp ? { anchor: [Math.floor(sp.anchor / KM), sp.anchor % KM] } : null; }
  usedRange(ref) {
    const s = this.sheet(ref);
    let rows = 0, cols = 0;
    for (const c of s.cells.values()) { if (c.r >= rows) rows = c.r + 1; if (c.c >= cols) cols = c.c + 1; }
    for (const k of s.spill.keys()) { const r = Math.floor(k / KM), c = k % KM; if (r >= rows) rows = r + 1; if (c >= cols) cols = c + 1; }
    return { rows, cols };
  }
  /** Evaluates formula text as if it were in sheet `ref` (nothing is stored). */
  evaluate(text, ref = 0, at = { row: 0, col: 0 }) {
    const s = this.sheet(ref);
    let tree;
    try { tree = parse(text); } catch (e) { return e instanceof FormulaError ? e : err(ERR.ERROR); }
    return finalize(evaluate(tree, this._ctx(s, at.row, at.col))).value;
  }

  /* writing */
  setCell(ref, r, c, input) { this.setCells([{ sheet: ref, r, c, input }]); }
  /** list: [{ sheet, r, c, input }] (input "" or null clears the cell). Recalculates what depends on them. */
  setCells(list) {
    const seeds = new Set();
    for (const { sheet, r, c, input } of list) {
      const s = this.sheet(sheet);
      if (!s || r < 0 || c < 0) continue;
      if (r >= s.rows) s.rows = r + 1;
      if (c >= s.cols) s.cols = Math.min(KM, c + 1);
      const k = keyOfCell(r, c);
      const old = s.cells.get(k);
      if (old) this._drop(s, old, seeds);
      if (input !== null && input !== undefined && input !== "") this._put(s, r, c, input, true);
      seeds.add(s.id * SIDM + k);
      for (const ak of s.anchors) {
        const a = s.cells.get(ak);
        if (a && a.want && a !== old && r >= a.r && r < a.r + a.want.h && c >= a.c && c < a.c + a.want.w) seeds.add(s.id * SIDM + ak);
      }
    }
    this._recalc(seeds);
  }
  _put(s, r, c, input, register = false) {
    const cell = { r, c, input: typeof input === "string" ? input : String(input), value: null };
    if (isFormulaInput(input)) {
      cell.src = input;
      try { cell.ast = parse(input); } catch (e) { cell.ast = null; cell.perr = e instanceof FormulaError ? e : err(ERR.ERROR); }
    } else cell.value = parseLiteral(input).value;
    s.cells.set(keyOfCell(r, c), cell);
    if (register && cell.src) this._register(s, cell);
    return cell;
  }
  _drop(s, cell, seeds) {
    const k = keyOfCell(cell.r, cell.c);
    if (cell.src) this._unregister(s, cell);
    if (cell.spillKeys) this._clearSpill(s, cell, seeds);
    s.anchors.delete(k);
    s.cells.delete(k);
  }
  _register(s, cell) {
    const g = s.id * SIDM + keyOfCell(cell.r, cell.c);
    cell.regs = [];
    cell.volatile = false;
    walk(cell.ast, (n) => {
      if (n.type === "func" && FN[n.name]?.volatile) cell.volatile = true;
      if (n.type !== "ref" && n.type !== "range") return;
      const ts = n.sheet ? this.sheet(n.sheet) : s;
      if (!ts) return;
      if (n.type === "ref") {
        const tg = ts.id * SIDM + keyOfCell(n.row, n.col);
        let set = this.dependents.get(tg);
        if (!set) this.dependents.set(tg, (set = new Set()));
        set.add(g);
        cell.regs.push(["c", tg]);
      } else {
        const d = { r1: n.r1, c1: n.c1, r2: n.r2, c2: n.c2, dep: g };
        this.rangeDeps.get(ts.id).add(d);
        cell.regs.push(["r", ts.id, d]);
      }
    });
    if (cell.volatile) this.volatile.add(g);
  }
  _unregister(s, cell) {
    const g = s.id * SIDM + keyOfCell(cell.r, cell.c);
    for (const reg of cell.regs || []) {
      if (reg[0] === "c") { const set = this.dependents.get(reg[1]); if (set) { set.delete(g); if (!set.size) this.dependents.delete(reg[1]); } }
      else this.rangeDeps.get(reg[1])?.delete(reg[2]);
    }
    cell.regs = [];
    this.volatile.delete(g);
  }
  _dependentsOf(g) {
    const out = [];
    const set = this.dependents.get(g);
    if (set) for (const y of set) out.push(y);
    const sid = Math.floor(g / SIDM), k = g % SIDM, r = Math.floor(k / KM), c = k % KM;
    const rd = this.rangeDeps.get(sid);
    if (rd) for (const d of rd) if (r >= d.r1 && r <= d.r2 && c >= d.c1 && c <= d.c2) out.push(d.dep);
    return out;
  }
  /** Re-reads every formula (after names or structure changed) and recalculates everything. */
  rebuild() {
    this.dependents.clear();
    this.volatile.clear();
    for (const s of this.sheets) {
      this.rangeDeps.set(s.id, new Set());
      s.spill.clear();
      s.anchors.clear();
      for (const cell of s.cells.values()) {
        cell.spillKeys = null; cell.want = null;
        if (cell.src) {
          try { cell.ast = parse(cell.src); cell.perr = null; } catch (e) { cell.ast = null; cell.perr = e instanceof FormulaError ? e : err(ERR.ERROR); }
          this._register(s, cell);
        }
      }
    }
    this.recalcAll();
  }
  recalcAll() {
    const seeds = new Set();
    for (const s of this.sheets) for (const cell of s.cells.values()) if (cell.src) seeds.add(s.id * SIDM + keyOfCell(cell.r, cell.c));
    this._recalc(seeds);
  }
  _plan(seeds) {
    const indeg = new Map(), edges = new Map(), seen = new Set(seeds), stack = [...seeds];
    while (stack.length) {
      const x = stack.pop();
      const outs = this._dependentsOf(x);
      if (outs.length) edges.set(x, outs);
      for (const y of outs) { indeg.set(y, (indeg.get(y) || 0) + 1); if (!seen.has(y)) { seen.add(y); stack.push(y); } }
    }
    const order = [], queue = [];
    for (const x of seen) if (!indeg.get(x)) queue.push(x);
    while (queue.length) {
      const x = queue.pop();
      order.push(x);
      for (const y of edges.get(x) || []) { const d = indeg.get(y) - 1; indeg.set(y, d); if (!d) queue.push(y); }
    }
    const pending = new Set();
    for (const x of seen) if (indeg.get(x) > 0) pending.add(x);
    return { order, pending };
  }
  _recalc(seeds) {
    for (const v of this.volatile) seeds.add(v);
    let round = 0;
    while (seeds.size && round++ < 30) {
      const { order, pending } = this._plan(seeds);
      const changed = new Set();
      this._pending = pending;
      this._busy = new Set();
      this._changed = changed;
      for (const g of order) this._compute(g);
      for (const g of [...pending]) if (pending.has(g)) this._compute(g);
      this._pending = null;
      seeds = changed;
    }
  }
  _compute(g) {
    const s = this.byId.get(Math.floor(g / SIDM));
    if (!s) return;
    const k = g % SIDM, cell = s.cells.get(k);
    this._pending?.delete(g);
    if (!cell || !cell.src) return;
    this._busy.add(g);
    let v;
    if (!cell.ast) v = cell.perr || err(ERR.ERROR);
    else {
      try { v = evaluate(cell.ast, this._ctx(s, cell.r, cell.c)); }
      catch (e) { v = e instanceof FormulaError ? e : e instanceof RangeError ? err(ERR.CIRC) : err(ERR.VALUE); }
    }
    this._busy.delete(g);
    this._apply(s, cell, v);
  }
  _read(s, r, c) {
    const k = keyOfCell(r, c), cell = s.cells.get(k);
    if (cell) {
      if (cell.src && this._pending) {
        const g = s.id * SIDM + k;
        if (this._busy.has(g)) return err(ERR.CIRC);
        if (this._pending.has(g)) this._compute(g);
      }
      return cell.value;
    }
    const sp = s.spill.get(k);
    return sp ? sp.value : null;
  }
  _ctx(s, row, col) {
    return {
      sheet: s.name, row, col,
      now: this.now, random: this.random,
      cell: (name, r, c) => { const ts = name ? this.sheet(name) : s; if (!ts || r >= MAX_ROWS || c >= MAX_COLS) return err(ERR.REF); return this._read(ts, r, c); },
      range: (n) => {
        const ts = n.sheet ? this.sheet(n.sheet) : s;
        if (!ts) return err(ERR.REF);
        let { r1, c1, r2, c2 } = n;
        if (n.whole) { const u = this.usedRange(ts); if (n.whole === "cols") r2 = Math.min(r2, Math.max(0, u.rows - 1)); else c2 = Math.min(c2, Math.max(0, u.cols - 1)); }
        if ((r2 - r1 + 1) * (c2 - c1 + 1) > 2e6) return err(ERR.NUM, "That range is too big.");
        const rows = [];
        for (let r = r1; r <= r2; r++) { const row = new Array(c2 - c1 + 1); for (let c = c1; c <= c2; c++) row[c - c1] = this._read(ts, r, c); rows.push(row); }
        return new Arr(rows, { sheet: n.sheet, r1, c1, r2, c2 });
      },
    };
  }
  _apply(s, cell, raw) {
    const { value, spill } = finalize(raw);
    const k = keyOfCell(cell.r, cell.c);
    if (!spill) {
      if (cell.spillKeys) this._clearSpill(s, cell, this._changed);
      cell.want = null;
      s.anchors.delete(k);
      cell.value = value;
      return;
    }
    cell.want = { h: spill.h, w: spill.w };
    s.anchors.add(k);
    let blocked = cell.r + spill.h > MAX_ROWS || cell.c + spill.w > MAX_COLS;
    for (let i = 0; i < spill.h && !blocked; i++) for (let j = 0; j < spill.w; j++) {
      if (!i && !j) continue;
      const kk = keyOfCell(cell.r + i, cell.c + j), sp = s.spill.get(kk);
      if (s.cells.has(kk) || (sp && sp.anchor !== k)) { blocked = true; break; }
    }
    if (blocked) { if (cell.spillKeys) this._clearSpill(s, cell, this._changed); cell.value = err(ERR.SPILL, "The answer needs empty cells below/right of this one."); return; }
    const keys = new Set();
    for (let i = 0; i < spill.h; i++) for (let j = 0; j < spill.w; j++) {
      if (!i && !j) continue;
      const kk = keyOfCell(cell.r + i, cell.c + j);
      keys.add(kk);
      const val = fix(spill.rows[i][j]), prev = s.spill.get(kk);
      if (!prev || !sameVal(prev.value, val)) this._changed?.add(s.id * SIDM + kk);
      s.spill.set(kk, { anchor: k, value: val });
    }
    for (const kk of cell.spillKeys || []) if (!keys.has(kk)) { s.spill.delete(kk); this._changed?.add(s.id * SIDM + kk); }
    cell.spillKeys = keys;
    if (cell.r + spill.h > s.rows) s.rows = cell.r + spill.h;
    if (cell.c + spill.w > s.cols) s.cols = cell.c + spill.w;
    cell.value = value;
  }
  _clearSpill(s, cell, changed) {
    for (const kk of cell.spillKeys || []) { s.spill.delete(kk); changed?.add(s.id * SIDM + kk); }
    cell.spillKeys = null;
  }
  _rewrite(fn) {
    for (const sh of this.sheets) for (const cell of sh.cells.values()) if (cell.src) { const t = fn(cell.src, sh); if (t !== cell.src) { cell.src = t; cell.input = t; } }
  }

  /* rows and columns */
  insertRows(ref, at, n = 1) { this._structure(this.sheet(ref), "row", at, n); }
  deleteRows(ref, at, n = 1) { this._structure(this.sheet(ref), "row", at, -n); }
  insertCols(ref, at, n = 1) { this._structure(this.sheet(ref), "col", at, n); }
  deleteCols(ref, at, n = 1) { this._structure(this.sheet(ref), "col", at, -n); }
  _structure(s, axis, at, count) {
    const moved = new Map();
    for (const cell of s.cells.values()) {
      const x = moveIndex(axis === "row" ? cell.r : cell.c, at, count);
      if (x === null) continue;
      if (axis === "row") cell.r = x; else cell.c = x;
      moved.set(keyOfCell(cell.r, cell.c), cell);
    }
    s.cells = moved;
    if (axis === "row") s.rows = Math.max(1, s.rows + count); else s.cols = Math.max(1, Math.min(KM, s.cols + count));
    this._rewrite((text, sh) => adjustFormula(text, { formulaSheet: sh.name, target: s.name, axis, at, count }));
    this.rebuild();
  }
}
