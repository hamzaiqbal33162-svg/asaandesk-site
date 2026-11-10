// CSV / TSV reading and writing (RFC 4180 quoting), with delimiter detection for files saved by Excel in
// different regions (comma, semicolon, tab or pipe).

/** Splits delimited text into rows of strings. Handles quotes, "" inside quotes, CRLF and a UTF-8 BOM. */
export function parseCSV(text, delim = ",") {
  const s = String(text ?? "").replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", i = 0, quoted = false;
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === "") { quoted = true; i++; continue; }
    if (ch === delim) { row.push(field); field = ""; i++; continue; }
    if (ch === "\r" || ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += ch === "\r" && s[i + 1] === "\n" ? 2 : 1; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length || quoted) { row.push(field); rows.push(row); }
  return rows;
}

/** Best delimiter for the text: the one that splits the first lines into the same number (≥ 2) of fields. */
export function detectDelimiter(text) {
  const sample = String(text ?? "").replace(/^﻿/, "").slice(0, 65536).split(/\r?\n|\r/).slice(0, 50).join("\n");
  let best = ",", bestScore = -1;
  for (const d of [",", ";", "\t", "|"]) {
    const rows = parseCSV(sample, d).filter((r) => !(r.length === 1 && r[0] === ""));
    if (!rows.length) continue;
    const first = rows[0].length;
    if (first < 2) continue;
    const same = rows.filter((r) => r.length === first).length / rows.length;
    const score = same * 100 + Math.min(first, 40);
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

const needsQuotes = (v, d) => v.includes(d) || /["\r\n]/.test(v) || /^\s|\s$/.test(v);
/** Rows of values → CSV text (CRLF line ends, like Excel). */
export function toCSV(rows, delim = ",") {
  return rows.map((r) => r.map((v) => { const t = v === null || v === undefined ? "" : String(v); return needsQuotes(t, delim) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(delim)).join("\r\n") + "\r\n";
}
