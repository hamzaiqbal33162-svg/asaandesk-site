// Minimal Excel (.xlsx) writer and reader. Zip work is done by fflate (passed in, so this file has no DOM
// and no global state): writeXlsx(book, { zipSync, strToU8 }) and readXlsx(bytes, { unzipSync, strFromU8 }).
// book = { sheets: [{ name, cells: [{ r, c, v, f?, style? }], colW?: { col: px }, rowH?: { row: px } }] }
// style = { b, i, color, fill, align, wrap, fmt }  (fmt = a FORMATS id from model.js or an Excel format code)
import { cellName, colIndex, FormulaError, tokenize, shiftFormula, parseDateText } from "./formula.js";
import { FORMATS, fmtCode } from "./model.js";

const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const EXCEL_ERRORS = ["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#SPILL!", "#CALC!"];

// Functions newer than Excel 2010 are stored with a prefix, or Excel shows #NAME?.
const FUTURE = { XLOOKUP: "_xlfn.XLOOKUP", IFS: "_xlfn.IFS", XOR: "_xlfn.XOR", CONCAT: "_xlfn.CONCAT", TEXTJOIN: "_xlfn.TEXTJOIN", MAXIFS: "_xlfn.MAXIFS", MINIFS: "_xlfn.MINIFS", UNIQUE: "_xlfn.UNIQUE", SORT: "_xlfn._xlws.SORT", FILTER: "_xlfn._xlws.FILTER", SEQUENCE: "_xlfn.SEQUENCE", DAYS: "_xlfn.DAYS", IFNA: "_xlfn.IFNA", "STDEV.S": "_xlfn.STDEV.S", "VAR.S": "_xlfn.VAR.S" };
function toFileFormula(f) {
  let toks;
  try { toks = tokenize(f); } catch { return f; }
  let out = "", last = 0;
  toks.forEach((t, i) => {
    if (t.t !== "name" || toks[i + 1]?.t !== "(") return;
    const pre = FUTURE[t.v.toUpperCase()];
    if (!pre) return;
    out += f.slice(last, t.s) + pre;
    last = t.e;
  });
  return out + f.slice(last);
}
const fromFileFormula = (f) => String(f).replace(/_xlfn\.(_xlws\.)?/gi, "").replace(/_xlws\./gi, "");

const BUILTIN_IDS = { General: 0, "0": 1, "0.00": 2, "#,##0": 3, "#,##0.00": 4, "0%": 9, "0.00%": 10, "0.00E+00": 11, "h:mm AM/PM": 18, "h:mm:ss AM/PM": 19, "h:mm": 20, "h:mm:ss": 21, "@": 49 };
const BUILTIN_CODES = { 0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 11: "0.00E+00", 12: "# ?/?", 13: "# ??/??", 14: "dd mmm yyyy", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy", 18: "h:mm AM/PM", 19: "h:mm:ss AM/PM", 20: "h:mm", 21: "h:mm:ss", 22: "dd mmm yyyy h:mm", 37: "#,##0 ;(#,##0)", 38: "#,##0 ;(#,##0)", 39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;(#,##0.00)", 45: "mm:ss", 46: "[h]:mm:ss", 47: "mm:ss.0", 48: "##0.0E+0", 49: "@" };
const CODE_TO_FMT = Object.fromEntries(Object.entries(FORMATS).map(([id, f]) => [f.code, id]));
const argb = (hex) => "FF" + String(hex || "#000000").replace("#", "").toUpperCase().padStart(6, "0").slice(0, 6);
const pxToWidth = (px) => Math.max(0, Math.round(((px - 5) / 7) * 100) / 100);

/** Builds the .xlsx file (Uint8Array). Cells with a formula keep their last value as the cached result. */
export function writeXlsx(book, { zipSync, strToU8 }) {
  const strings = [], stringIdx = new Map();
  const sst = (s) => { if (!stringIdx.has(s)) { stringIdx.set(s, strings.length); strings.push(s); } return stringIdx.get(s); };
  // Styles: fonts, fills, number formats and cell formats (xf) are de-duplicated.
  const fonts = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const numFmts = [], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const fontIdx = new Map(), fillIdx = new Map(), fmtIdx = new Map(), xfIdx = new Map();
  const styleId = (st) => {
    if (!st) return 0;
    const fontKey = `${st.b ? 1 : 0}${st.i ? 1 : 0}${st.color || ""}`;
    let fontId = 0;
    if (fontKey !== "00") {
      if (!fontIdx.has(fontKey)) { fontIdx.set(fontKey, fonts.length); fonts.push(`<font>${st.b ? "<b/>" : ""}${st.i ? "<i/>" : ""}<sz val="11"/>${st.color ? `<color rgb="${argb(st.color)}"/>` : ""}<name val="Calibri"/><family val="2"/></font>`); }
      fontId = fontIdx.get(fontKey);
    }
    let fillId = 0;
    if (st.fill) {
      if (!fillIdx.has(st.fill)) { fillIdx.set(st.fill, fills.length); fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${argb(st.fill)}"/><bgColor indexed="64"/></patternFill></fill>`); }
      fillId = fillIdx.get(st.fill);
    }
    let numFmtId = 0;
    if (st.fmt && st.fmt !== "general") {
      const code = fmtCode(st.fmt);
      if (code in BUILTIN_IDS) numFmtId = BUILTIN_IDS[code];
      else { if (!fmtIdx.has(code)) { fmtIdx.set(code, 164 + numFmts.length); numFmts.push(`<numFmt numFmtId="${164 + numFmts.length}" formatCode="${esc(code)}"/>`); } numFmtId = fmtIdx.get(code); }
    }
    const align = st.align || st.wrap ? `<alignment${st.align ? ` horizontal="${st.align}"` : ""}${st.wrap ? ' wrapText="1"' : ""}${st.wrap ? ' vertical="top"' : ""}/>` : "";
    const xf = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ""}${fontId ? ' applyFont="1"' : ""}${fillId ? ' applyFill="1"' : ""}${align ? ' applyAlignment="1">' + align + "</xf>" : "/>"}`;
    if (xf === xfs[0]) return 0;
    if (!xfIdx.has(xf)) { xfIdx.set(xf, xfs.length); xfs.push(xf); }
    return xfIdx.get(xf);
  };

  const sheetXml = book.sheets.map((sh, si) => {
    const rows = new Map();
    let maxR = 0, maxC = 0;
    for (const cell of sh.cells || []) {
      if (!rows.has(cell.r)) rows.set(cell.r, []);
      rows.get(cell.r).push(cell);
      maxR = Math.max(maxR, cell.r); maxC = Math.max(maxC, cell.c);
    }
    const body = [...rows.keys()].sort((a, b) => a - b).map((r) => {
      const ht = sh.rowH?.[r];
      const cells = rows.get(r).sort((a, b) => a.c - b.c).map((cell) => {
        const ref = cellName(cell.r, cell.c), s = styleId(cell.style), sAttr = s ? ` s="${s}"` : "";
        const v = cell.v;
        const f = cell.f ? `<f${cell.array ? ` t="array" ref="${cell.array}"` : ""}>${esc(toFileFormula(String(cell.f).replace(/^=/, "")))}</f>` : "";
        if (cell.f) {
          if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${sAttr}>${f}<v>${v}</v></c>`;
          if (typeof v === "boolean") return `<c r="${ref}"${sAttr} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
          if (typeof v === "string") return `<c r="${ref}"${sAttr} t="str">${f}<v>${esc(v)}</v></c>`;
          if (v instanceof FormulaError && EXCEL_ERRORS.includes(v.code)) return `<c r="${ref}"${sAttr} t="e">${f}<v>${v.code}</v></c>`;
          return `<c r="${ref}"${sAttr}>${f}</c>`;
        }
        if (v === null || v === undefined || v === "") return s ? `<c r="${ref}"${sAttr}/>` : "";
        if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}"${sAttr}><v>${v}</v></c>` : "";
        if (typeof v === "boolean") return `<c r="${ref}"${sAttr} t="b"><v>${v ? 1 : 0}</v></c>`;
        if (v instanceof FormulaError) return EXCEL_ERRORS.includes(v.code) ? `<c r="${ref}"${sAttr} t="e"><v>${v.code}</v></c>` : `<c r="${ref}"${sAttr} t="s"><v>${sst(v.code)}</v></c>`;
        return `<c r="${ref}"${sAttr} t="s"><v>${sst(String(v))}</v></c>`;
      }).join("");
      return `<row r="${r + 1}"${ht ? ` ht="${Math.round(ht * 0.75 * 100) / 100}" customHeight="1"` : ""}>${cells}</row>`;
    }).join("");
    const colEntries = Object.entries(sh.colW || {}).map(([c, px]) => [+c, px]).sort((a, b) => a[0] - b[0]);
    const cols = colEntries.length ? `<cols>${colEntries.map(([c, px]) => `<col min="${c + 1}" max="${c + 1}" width="${pxToWidth(px)}" customWidth="1"/>`).join("")}</cols>` : "";
    return `${XML_HEAD}<worksheet xmlns="${NS}" xmlns:r="${RNS}"><dimension ref="A1:${cellName(maxR, maxC)}"/><sheetViews><sheetView workbookViewId="0"${si === 0 ? ' tabSelected="1"' : ""}/></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body}</sheetData></worksheet>`;
  });

  const n = book.sheets.length;
  const files = {
    "[Content_Types].xml": `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${book.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    "_rels/.rels": `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RNS}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${RNS}/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    "docProps/core.xml": `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(book.title || "Sheet")}</dc:title><dc:creator>AsaanDesk Sheets</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created></cp:coreProperties>`,
    "docProps/app.xml": `${XML_HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>AsaanDesk Sheets</Application></Properties>`,
    "xl/workbook.xml": `${XML_HEAD}<workbook xmlns="${NS}" xmlns:r="${RNS}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${book.sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${book.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${RNS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${n + 1}" Type="${RNS}/styles" Target="styles.xml"/><Relationship Id="rId${n + 2}" Type="${RNS}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
  };
  sheetXml.forEach((x, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = x; });
  files["xl/sharedStrings.xml"] = `${XML_HEAD}<sst xmlns="${NS}" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t${/^\s|\s$/.test(s) ? ' xml:space="preserve"' : ""}>${esc(s)}</t></si>`).join("")}</sst>`;
  files["xl/styles.xml"] = `${XML_HEAD}<styleSheet xmlns="${NS}">${numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.join("")}</numFmts>` : ""}<fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const zipped = {};
  for (const [p, x] of Object.entries(files)) zipped[p] = strToU8(x);
  return zipSync(zipped, { level: 6 });
}

/* ---------- reading ---------- */

const ENT = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
/** Tiny XML parser: { name (without prefix), attrs, children, text }. Enough for the parts of an xlsx file. */
export function parseXml(text) {
  const root = { name: "#root", attrs: {}, children: [], text: "" };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      const attrs = {};
      for (const a of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1].replace(/^.*:/, "")] = decode(a[2] ?? a[3]);
      const el = { name: m[3].replace(/^.*:/, ""), attrs, children: [], text: "" };
      top.children.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6] !== undefined) top.text += decode(m[6]);
  }
  return root;
}
const kids = (el, name) => (el ? el.children.filter((c) => c.name === name) : []);
const kid = (el, name) => (el ? el.children.find((c) => c.name === name) : null);
function textOf(el) { if (!el) return ""; if (el.name === "t") return el.text; return el.children.filter((c) => c.name !== "rPh" && c.name !== "phoneticPr").map(textOf).join(""); }
const hex = (c) => (c?.attrs.rgb ? "#" + c.attrs.rgb.slice(-6).toLowerCase() : null);

/** Reads an .xlsx file → { sheets: [{ name, cells: [{ r, c, v, f?, style? }], colW, rowH }], date1904 }. */
export function readXlsx(bytes, { unzipSync, strFromU8 }) {
  const files = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const get = (p) => { const k = Object.keys(files).find((x) => x.toLowerCase() === p.toLowerCase()); return k ? strFromU8(files[k]) : null; };
  const wbXml = get("xl/workbook.xml");
  if (!wbXml) throw new Error("This file is not an Excel workbook (.xlsx).");
  const wb = parseXml(wbXml).children.find((c) => c.name === "workbook");
  const date1904 = /^(1|true)$/i.test(kid(wb, "workbookPr")?.attrs.date1904 || "");
  const rels = {};
  const relXml = get("xl/_rels/workbook.xml.rels");
  if (relXml) for (const r of kids(parseXml(relXml).children[0], "Relationship")) rels[r.attrs.Id] = r.attrs.Target;
  const strings = [];
  const sstXml = get("xl/sharedStrings.xml");
  if (sstXml) for (const si of kids(parseXml(sstXml).children[0], "si")) strings.push(textOf(si));
  // Styles → our style objects, one per cellXfs entry.
  const styles = [];
  const stXml = get("xl/styles.xml");
  if (stXml) {
    const ss = parseXml(stXml).children[0];
    const codes = { ...BUILTIN_CODES };
    for (const f of kids(kid(ss, "numFmts"), "numFmt")) codes[f.attrs.numFmtId] = f.attrs.formatCode;
    const fontList = kids(kid(ss, "fonts"), "font").map((f) => ({ b: !!kid(f, "b") && kid(f, "b").attrs.val !== "0", i: !!kid(f, "i") && kid(f, "i").attrs.val !== "0", color: hex(kid(f, "color")) }));
    const fillList = kids(kid(ss, "fills"), "fill").map((f) => { const p = kid(f, "patternFill"); return p?.attrs.patternType === "solid" ? hex(kid(p, "fgColor")) : null; });
    for (const xf of kids(kid(ss, "cellXfs"), "xf")) {
      const st = {};
      const id = +(xf.attrs.numFmtId || 0);
      if (id) {
        const code = codes[id] ?? "General";
        st.fmt = id >= 14 && id <= 17 || id === 22 ? "date" : CODE_TO_FMT[code] || (code === "General" ? undefined : code);
        if (!st.fmt) delete st.fmt;
      }
      const font = fontList[+(xf.attrs.fontId || 0)];
      if (font?.b) st.b = true;
      if (font?.i) st.i = true;
      if (font?.color && font.color !== "#000000") st.color = font.color;
      const fill = fillList[+(xf.attrs.fillId || 0)];
      if (fill && fill !== "#ffffff") st.fill = fill;
      const al = kid(xf, "alignment");
      if (al?.attrs.horizontal && ["left", "center", "right"].includes(al.attrs.horizontal)) st.align = al.attrs.horizontal;
      if (al && /^(1|true)$/.test(al.attrs.wrapText || "")) st.wrap = true;
      styles.push(Object.keys(st).length ? st : null);
    }
  }
  const isDateStyle = (st) => st && (st.fmt === "date" || st.fmt === "time" || (typeof st.fmt === "string" && !FORMATS[st.fmt] && /[dy]|h+.*:/i.test(st.fmt.replace(/"[^"]*"/g, ""))));

  const sheets = [];
  for (const sh of kids(kid(wb, "sheets"), "sheet")) {
    let target = rels[sh.attrs.id] || "";
    if (!target) continue;
    target = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    const xml = get(target);
    if (!xml) continue;
    const ws = parseXml(xml).children.find((c) => c.name === "worksheet");
    const out = { name: sh.attrs.name, cells: [], colW: {}, rowH: {} };
    for (const col of kids(kid(ws, "cols"), "col")) {
      if (!col.attrs.width) continue;
      const px = Math.round(+col.attrs.width * 7 + 5);
      for (let c = +col.attrs.min - 1; c <= Math.min(+col.attrs.max - 1, 200); c++) out.colW[c] = px;
    }
    const shared = new Map(), arrays = [];
    const inArray = (r, c) => arrays.some((a) => r >= a.r1 && r <= a.r2 && c >= a.c1 && c <= a.c2 && !(r === a.r1 && c === a.c1));
    let rIdx = -1;
    for (const row of kids(kid(ws, "sheetData"), "row")) {
      rIdx = row.attrs.r ? +row.attrs.r - 1 : rIdx + 1;
      if (row.attrs.ht && /^(1|true)$/.test(row.attrs.customHeight || "")) out.rowH[rIdx] = Math.round((+row.attrs.ht * 4) / 3);
      let cIdx = -1;
      for (const c of kids(row, "c")) {
        const m = /^([A-Z]+)(\d+)$/i.exec(c.attrs.r || "");
        cIdx = m ? colIndex(m[1]) : cIdx + 1;
        const r = m ? +m[2] - 1 : rIdx;
        const st = c.attrs.s !== undefined ? styles[+c.attrs.s] || null : null;
        const vEl = kid(c, "v"), fEl = kid(c, "f"), t = c.attrs.t || "n";
        let v = null;
        if (t === "s") v = vEl ? strings[+vEl.text] ?? "" : null;
        else if (t === "str") v = vEl ? vEl.text : "";
        else if (t === "inlineStr") v = textOf(kid(c, "is"));
        else if (t === "b") v = vEl ? vEl.text === "1" || vEl.text === "true" : null;
        else if (t === "e") v = vEl ? new FormulaError(vEl.text) : null;
        else if (t === "d") v = vEl ? parseDateText(vEl.text.slice(0, 10)) : null;
        else if (vEl && vEl.text !== "") { v = +vEl.text; if (date1904 && isDateStyle(st)) v += 1462; }
        let f = null;
        if (fEl) {
          if (fEl.attrs.t === "shared" && fEl.attrs.si !== undefined) {
            if (fEl.text.trim()) { f = fromFileFormula(fEl.text); shared.set(fEl.attrs.si, { f, r, c: cIdx }); }
            else { const base = shared.get(fEl.attrs.si); if (base) f = shiftFormula(base.f, r - base.r, cIdx - base.c); }
          } else if (fEl.text.trim()) f = fromFileFormula(fEl.text);
          if (fEl.attrs.t === "array" && fEl.attrs.ref) { const m2 = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i.exec(fEl.attrs.ref); if (m2) arrays.push({ r1: +m2[2] - 1, c1: colIndex(m2[1]), r2: +(m2[4] || m2[2]) - 1, c2: colIndex(m2[3] || m2[1]) }); }
        }
        // Cells inside an array formula's area hold its answers; they are filled again by the formula.
        if (!f && arrays.length && inArray(r, cIdx)) continue;
        if (v === null && !f && !st) continue;
        const cell = { r, c: cIdx, v };
        if (f) cell.f = f;
        if (st) cell.style = st;
        out.cells.push(cell);
      }
    }
    sheets.push(out);
  }
  if (!sheets.length) throw new Error("No sheets were found in this Excel file.");
  return { sheets, date1904 };
}
