// AsaanDesk Docs: the clean document model and its conversions (no DOM needed, so tests and other apps can reuse it).
//
// Doc = { version: 1, title, font, size (pt), page: { size: 'A4'|'Letter', margin (mm), header, footer, pageNumbers },
//         blocks: [Block] }
// Block = { type: 'p'|'h1'|'h2'|'h3'|'quote'|'code'|'hr'|'pagebreak'|'li'|'table'|'image',
//           align?, lineHeight?, dir?: 'rtl', indent?,                  // text blocks
//           bg?, deco?, dc?, dc2?, pad?, minh?,                         // coloured block: background, own decoration (decos.js), padding, min height (px)
//           bgimg?, ov?,                                                // photo band: photo URL behind the block + overlay kind (PHOTO_OVERLAYS)
//           runs?: [Run],                                               // p, h1-h3, quote, li
//           list?: 'bullet'|'number'|'check', level?, checked?,         // li
//           text?,                                                      // code
//           rows?: [[{ runs }]], header?, accent?, tstyle?,             // table (header = first row is a heading row; accent colour; 'grid'|'lines')
//           src?, w?, h?, alt? }                                        // image (w, h in CSS px)
// Run = { text, b?, i?, u?, s?, code?, sup?, sub?, color?, bg?, font?, size? (pt), link? }
import { FONT_FAMILIES } from "../shared/brand.js";
import { DECOS, decoCss } from "./decos.js";

export const PAGE_SIZES = { A4: { label: "A4", w: 210, h: 297 }, Letter: { label: "Letter", w: 215.9, h: 279.4 }, Legal: { label: "Legal", w: 215.9, h: 355.6 }, A3: { label: "A3", w: 297, h: 420 }, Digital: { label: "Digital doc", w: 240, h: 320, digital: true }, Pageless: { label: "Pageless", w: 210, h: 297, pageless: true }, Slides: { label: "Presentation 16:9", w: 297, h: 167.06 } };
export const MARGINS = { narrow: 12.7, normal: 25.4, wide: 38.1 };
export const HEADING_PT = { h1: 22, h2: 17, h3: 14 };
export const RTL_LANGS = ["ur", "ar", "fa", "ps", "sd", "he", "yi"];
export const STYLE_KEYS = ["b", "i", "u", "s", "code", "sup", "sub", "color", "bg", "font", "size", "link", "sg"];
/** Suggestion mark on a run: "ins:<id>:<time>:<author>" (suggested text) or "del:<id>:<time>:<author>" (suggested deletion). */
export const SG_RE = /^(ins|del):[a-z0-9]{3,24}:\d{1,15}:[^:<>"&]{0,40}$/i;
const CMT_ID = /^c[a-z0-9]{6,24}$/;
const TEXT_BLOCKS = new Set(["p", "h1", "h2", "h3", "quote", "li"]);

export function newDoc(title = "Untitled document") {
  return { version: 1, title, font: "calibri", size: 11, page: { size: "A4", margin: MARGINS.normal, header: "", footer: "", pageNumbers: true }, blocks: [{ type: "p", runs: [] }] };
}

/** Fills in defaults and drops anything unknown, so saved or imported JSON is always safe to render. */
export function normalizeDoc(d) {
  const base = newDoc();
  if (!d || typeof d !== "object") return base;
  const doc = {
    version: 1,
    title: String(d.title || base.title).slice(0, 200),
    font: FONT_FAMILIES[d.font] ? d.font : base.font,
    size: clampNum(d.size, 6, 72) || base.size,
    page: { ...base.page, ...(d.page || {}) },
    blocks: [],
  };
  if (!PAGE_SIZES[doc.page.size]) doc.page.size = "A4";
  doc.page.margin = clampNum(doc.page.margin, 5, 60) || MARGINS.normal;
  doc.page.header = String(doc.page.header || "").slice(0, 300);
  doc.page.footer = String(doc.page.footer || "").slice(0, 300);
  doc.page.pageNumbers = doc.page.pageNumbers !== false;
  for (const b of Array.isArray(d.blocks) ? d.blocks : []) { const n = normalizeBlock(b); if (n) doc.blocks.push(n); }
  if (!doc.blocks.length) doc.blocks.push({ type: "p", runs: [] });
  // Comment threads (kept only when there are any). Older documents kept the comment text on the block: make it a thread.
  const threads = (Array.isArray(d.comments) ? d.comments : []).map(normalizeThread).filter(Boolean).slice(0, 500);
  for (const b of doc.blocks) {
    if (b.cmt && !CMT_ID.test(b.cmt)) { const t = normalizeThread({ id: "c" + legacyId(b.cmt), text: b.cmt, by: "You", at: 0 }); threads.push(t); b.cmt = t.id; }
    else if (b.cmt && !threads.some((t) => t.id === b.cmt)) delete b.cmt;
  }
  if (threads.length) doc.comments = threads;
  // Custom dropdowns made in this document (Canva: "+ Create dropdown"); the presets live in the app.
  const dds = (Array.isArray(d.dropdowns) ? d.dropdowns : []).map(normalizeDropdown).filter(Boolean).slice(0, 40);
  if (dds.length) doc.dropdowns = dds;
  return doc;
}

/** A dropdown: { id, name, options: [{ label, fg, bg }] } (1–20 options, labels unique, no "▾"). */
export function normalizeDropdown(g) {
  if (!g || typeof g !== "object" || !/^[a-z0-9-]{1,40}$/.test(String(g.id || ""))) return null;
  const seen = new Set();
  const options = (Array.isArray(g.options) ? g.options : []).map((o) => {
    const label = String(o?.label || "").replace(/▾/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!label || seen.has(label)) return null;
    seen.add(label);
    return { label, fg: normColor(o.fg) || "#334155", bg: normColor(o.bg) || "#e2e8f0" };
  }).filter(Boolean).slice(0, 20);
  if (!options.length) return null;
  return { id: String(g.id), name: String(g.name || "Dropdown").replace(/\s+/g, " ").trim().slice(0, 40) || "Dropdown", options };
}

const legacyId = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ("000000" + h.toString(36)).slice(-7); };
const str = (v, n) => String(v ?? "").slice(0, n);
function normalizeThread(t) {
  if (!t || typeof t !== "object" || !CMT_ID.test(String(t.id || ""))) return null;
  const text = str(t.text, 2000).trim();
  if (!text) return null;
  const out = { id: t.id, text, by: str(t.by || "You", 60), at: Math.max(0, +t.at || 0) };
  if (t.resolved) out.resolved = true;
  const m = (Array.isArray(t.mentions) ? t.mentions : []).map((x) => str(x, 60).trim()).filter(Boolean).slice(0, 20);
  if (m.length) out.mentions = [...new Set(m)];
  const r = (Array.isArray(t.replies) ? t.replies : []).map((x) => (x && str(x.text, 2000).trim() ? { text: str(x.text, 2000).trim(), by: str(x.by || "You", 60), at: Math.max(0, +x.at || 0) } : null)).filter(Boolean).slice(0, 100);
  if (r.length) out.replies = r;
  return out;
}

/** The document without pending suggestions (suggested text left out, suggested deletions kept): what downloads contain. */
export function withoutSuggestions(doc) {
  const fix = (runs) => cleanRuns((runs || []).filter((r) => !String(r.sg || "").startsWith("ins:")).map(({ sg, ...r }) => r));
  const d = JSON.parse(JSON.stringify(doc));
  for (const b of d.blocks || []) {
    if (b.runs) b.runs = fix(b.runs);
    if (b.type === "table") for (const row of b.rows) for (const c of row) c.runs = fix(c.runs);
  }
  return d;
}
/** Every pending suggestion in the document: [{ id, kind: "ins"|"del", by, at, text }]. */
export function listSuggestions(doc) {
  const map = new Map();
  const visit = (runs) => { for (const r of runs || []) if (r.sg) { const [kind, id, at, by] = r.sg.split(":"); const k = kind + ":" + id; const e = map.get(k) || { id, kind, by, at: +at, text: "" }; e.text += r.text; map.set(k, e); } };
  for (const b of doc.blocks || []) { visit(b.runs); if (b.type === "table") for (const row of b.rows) for (const c of row) visit(c.runs); }
  return [...map.values()];
}

function clampNum(v, lo, hi) { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; }

function normalizeBlock(b) {
  if (!b || typeof b !== "object") return null;
  const t = b.type;
  const props = blockProps(b);
  if (TEXT_BLOCKS.has(t)) {
    const out = { type: t, ...props, runs: cleanRuns(b.runs || (b.text ? [{ text: b.text }] : [])) };
    if (t === "li") {
      delete out.indent;
      out.list = ["bullet", "number", "check"].includes(b.list) ? b.list : "bullet";
      out.level = Math.max(0, Math.min(8, Math.round(+b.level || 0)));
      if (out.list === "check") out.checked = !!b.checked;
    }
    return out;
  }
  if (t === "code") return { type: "code", text: String(b.text ?? runsText(b.runs || [])) };
  if (t === "pagebreak") return { type: t };
  if (t === "hr") {
    // Divider style (like Canva's divider toolbar): solid (default), dashed, dotted, double or thick; any colour.
    const out = { type: "hr" };
    if (HR_STYLES.includes(b.hs)) out.hs = b.hs;
    const hc = normColor(b.hc); if (hc) out.hc = hc;
    if (props.ps) out.ps = props.ps;
    return out;
  }
  if (t === "table") {
    const rows = (Array.isArray(b.rows) ? b.rows : []).map((r) => (Array.isArray(r) ? r : []).map((c) => ({ runs: cleanRuns(c?.runs || (typeof c === "string" ? [{ text: c }] : [])) })));
    const width = Math.max(1, ...rows.map((r) => r.length));
    rows.forEach((r) => { while (r.length < width) r.push({ runs: [] }); });
    if (!rows.length) return null;
    const tb = { type: "table", header: b.header !== false, rows };
    const ac = normColor(b.accent); if (ac) tb.accent = ac;
    if (b.tstyle === "lines" || b.tstyle === "cols") tb.tstyle = b.tstyle;
    const cw = colWidths(b.cw, width); if (cw) tb.cw = cw;
    if (props.ps) tb.ps = props.ps;
    return tb;
  }
  if (t === "image") {
    const src = safeSrc(b.src);
    if (!src) return null;
    const out = { type: "image", src, alt: String(b.alt || "") };
    if (+b.w > 0) out.w = Math.round(+b.w);
    if (+b.h > 0) out.h = Math.round(+b.h);
    if (props.align) out.align = props.align;
    if (props.ps) out.ps = props.ps;
    if (b.full) out.full = true;
    return out;
  }
  return null;
}

/** Divider styles. */
export const HR_STYLES = ["dashed", "dotted", "double", "thick"];
/** Photo bands: overlay kinds (shade = dark from the left, split = solid colour panel fading into the photo, tint = even
 *  colour wash, soft = white fade for dark text) and the photo URLs allowed (same-origin path or https, no quotes). */
export const PHOTO_OVERLAYS = ["shade", "split", "tint", "soft"];
const BGIMG_RE = /^(\/(?!\/)|https:\/\/)[\w\-./%~?=&:+,]+$/;
const rgbaOf = (hex, a) => { const v = String(normColor(hex) || "#1b2133").slice(1); return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`; };
/** CSS gradient laid over a band photo (the band colour keeps the text readable). */
export function photoOverlayCss(ov, bg) {
  if (ov === "split") return `linear-gradient(90deg,${rgbaOf(bg, 1)} 0%,${rgbaOf(bg, 0.97)} 44%,${rgbaOf(bg, 0.35)} 72%,${rgbaOf(bg, 0)} 100%)`;
  if (ov === "tint") return `linear-gradient(${rgbaOf(bg, 0.66)},${rgbaOf(bg, 0.66)})`;
  if (ov === "soft") return `linear-gradient(90deg,rgba(255,255,255,.97) 0%,rgba(255,255,255,.9) 42%,rgba(255,255,255,.2) 75%,rgba(255,255,255,0) 100%)`;
  return `linear-gradient(100deg,${rgbaOf(bg, 0.94)} 0%,${rgbaOf(bg, 0.78)} 42%,${rgbaOf(bg, 0.2)} 100%)`;
}
/** Column widths in % (one per column, 5–95 each, summing to 100), or null. */
export function colWidths(v, n) {
  const a = (Array.isArray(v) ? v : String(v ?? "").split(",")).map((x) => Math.round(+x));
  if (a.length !== n || n < 2 || a.some((x) => !Number.isFinite(x) || x < 5 || x > 95)) return null;
  const sum = a.reduce((s, x) => s + x, 0);
  if (Math.abs(sum - 100) > 2) return null;
  return a;
}

function blockProps(b) {
  const p = {};
  if (["left", "center", "right", "justify"].includes(b.align) && b.align !== "left") p.align = b.align;
  const lh = clampNum(b.lineHeight, 0.8, 3);
  if (lh && b.lineHeight != null) p.lineHeight = Math.round(lh * 100) / 100;
  if (b.dir === "rtl") p.dir = "rtl";
  const ind = Math.round(+b.indent || 0);
  if (ind > 0) p.indent = Math.min(8, ind);
  const bg = normColor(b.bg); if (bg) p.bg = bg;
  if (b.deco && DECOS[b.deco]) { p.deco = b.deco; const c = normColor(b.dc), c2 = normColor(b.dc2); if (c) p.dc = c; if (c2) p.dc2 = c2; }
  const pad = clampNum(b.pad, 0, 80); if (pad && b.pad != null) p.pad = Math.round(pad);
  const mh = clampNum(b.minh, 0, 480); if (mh && b.minh != null) p.minh = Math.round(mh);
  const rad = clampNum(b.rad, 0, 40); if (rad && b.rad != null) p.rad = Math.round(rad);
  const bd = clampNum(b.bd, 0, 8); if (bd && b.bd != null) { p.bd = Math.round(bd); const bc = normColor(b.bc); if (bc) p.bc = bc; }
  // Photo band (Canva-style photo header): a same-origin or https photo behind the block, under an overlay in the band colour.
  if (typeof b.bgimg === "string" && BGIMG_RE.test(b.bgimg.trim())) { p.bgimg = b.bgimg.trim(); if (PHOTO_OVERLAYS.includes(b.ov)) p.ov = b.ov; }
  if (b.cmt != null && String(b.cmt).trim()) p.cmt = String(b.cmt).slice(0, 1000);
  // Paragraph / block spacing (pt before and after) and letter spacing (thousandths of an em), like Canva's
  // "Advanced settings" and "Spacing" sliders.
  const ps = clampNum(b.ps, 0, 72); if (ps && b.ps != null) p.ps = Math.round(ps);
  const lsp = clampNum(b.lsp, -200, 800); if (lsp && b.lsp != null) p.lsp = Math.round(lsp);
  return p;
}

/* ---------------- runs ---------------- */

export const sameStyle = (a, b) => STYLE_KEYS.every((k) => (a[k] || null) === (b[k] || null));
export function styleOf(r) { const s = {}; for (const k of STYLE_KEYS) if (r[k]) s[k] = r[k]; return s; }

/** Merges neighbours with the same style, drops empty runs and empty style keys. */
export function cleanRuns(runs) {
  const out = [];
  for (const r of runs || []) {
    if (!r || r.text == null || r.text === "") continue;
    const n = { text: String(r.text) };
    for (const k of STYLE_KEYS) {
      const v = r[k];
      if (!v) continue;
      if (k === "size") { const s = clampNum(v, 4, 120); if (s) n.size = Math.round(s * 2) / 2; continue; }
      if (k === "color" || k === "bg") { const c = normColor(v); if (c) n[k] = c; continue; }
      if (k === "font") { if (FONT_FAMILIES[v]) n.font = v; continue; }
      if (k === "link") { const l = safeLink(v); if (l) n.link = l; continue; }
      if (k === "sg") { if (SG_RE.test(String(v))) n.sg = String(v); continue; }
      n[k] = true;
    }
    const last = out[out.length - 1];
    if (last && sameStyle(last, n)) last.text += n.text;
    else out.push(n);
  }
  return out;
}

export const runsText = (runs) => (runs || []).map((r) => r.text).join("");

/** Plain text of one block (tables: cells joined with tabs, rows with new lines). */
export function blockText(b) {
  if (b.type === "code") return b.text || "";
  if (b.type === "table") return b.rows.map((r) => r.map((c) => runsText(c.runs)).join("\t")).join("\n");
  if (b.type === "image") return "";
  return runsText(b.runs);
}

/* ---------------- small helpers ---------------- */

const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", gray: "#808080", grey: "#808080", navy: "#000080", teal: "#008080", maroon: "#800000", silver: "#c0c0c0", lime: "#00ff00", aqua: "#00ffff", cyan: "#00ffff", fuchsia: "#ff00ff", magenta: "#ff00ff", olive: "#808000", darkblue: "#00008b", darkred: "#8b0000", darkgreen: "#006400" };
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
/** Any CSS colour we understand → "#rrggbb", or null (transparent / unknown). */
export function normColor(v) {
  if (!v) return null;
  let s = String(v).trim().toLowerCase().replace(/\s*!important$/, "");
  if (NAMED[s]) return NAMED[s];
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return "#" + m[1].split("").map((c) => c + c).join("");
  m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) return m[2] === "00" ? null : "#" + m[1];
  m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/);
  if (m) { if (m[4] != null && parseFloat(m[4]) === 0) return null; return "#" + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]); }
  return null;
}
export function safeLink(v) {
  const s = String(v || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(s) || /^#[\w-]*$/.test(s)) return s.slice(0, 2000);
  if (/^www\./i.test(s)) return "https://" + s.slice(0, 2000);
  return null;
}
export function safeSrc(v) {
  const s = String(v || "").trim();
  if (/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s.replace(/\s+/g, "");
  if (/^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) || /^blob:/i.test(s)) return s;
  return null;
}
export function parseStyle(str) {
  const out = {};
  for (const part of String(str || "").split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const k = part.slice(0, i).trim().toLowerCase();
    if (k) out[k] = part.slice(i + 1).trim();
  }
  return out;
}
const FONT_ALIASES = [
  [/^(ad sans|arial|helvetica|liberation sans|arimo|sans-serif|helvetica neue|verdana|tahoma|segoe ui|roboto|open sans|aptos)$/, "sans"],
  [/^(ad serif|times new roman|times|liberation serif|tinos|georgia|serif|garamond|book antiqua|palatino linotype)$/, "serif"],
  [/^(ad mono|courier new|courier|liberation mono|cousine|consolas|monospace|menlo|monaco|lucida console)$/, "mono"],
  [/^(ad calibri|calibri|carlito|calibri light)$/, "calibri"],
  [/^(ad cambria|cambria|caladea|cambria math)$/, "cambria"],
];
/** CSS font-family list → one of FONT_FAMILIES keys, or null. */
export function fontKeyFromCss(ff) {
  for (const name of String(ff || "").split(",")) {
    const n = name.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
    for (const [re, key] of FONT_ALIASES) if (re.test(n)) return key;
  }
  return null;
}
const SIZE_WORDS = { "xx-small": 7, "x-small": 7.5, small: 10, medium: 12, large: 13.5, "x-large": 18, "xx-large": 24, "xxx-large": 36 };
/** CSS font-size → points (null when relative or out of range). */
export function sizeToPt(v) {
  const s = String(v || "").trim().toLowerCase();
  if (SIZE_WORDS[s]) return SIZE_WORDS[s];
  const m = s.match(/^([\d.]+)\s*(pt|px)$/);
  if (!m) return null;
  const pt = m[2] === "px" ? +m[1] * 0.75 : +m[1];
  return pt >= 4 && pt <= 120 ? Math.round(pt * 2) / 2 : null;
}
/** margin-left from margin-left or the margin shorthand. */
function marginLeft(st) {
  if (st["margin-left"]) return st["margin-left"];
  const parts = String(st.margin || "").trim().split(/\s+/).filter(Boolean);
  return parts.length === 4 ? parts[3] : parts.length >= 2 ? parts[1] : "";
}
function lengthToPx(v) {
  const m = String(v || "").trim().toLowerCase().match(/^(-?[\d.]+)\s*(px|pt|in|cm|mm|em|rem)?$/);
  if (!m) return 0;
  const k = { px: 1, pt: 4 / 3, in: 96, cm: 37.8, mm: 3.78, em: 16, rem: 16 }[m[2] || "px"];
  return +m[1] * k;
}

/* ---------------- HTML (any DOM-like tree) → model ---------------- */

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "CAPTION", "HR", "FIGURE", "FIGCAPTION", "SECTION", "ARTICLE", "HEADER", "FOOTER", "MAIN", "ASIDE", "NAV", "ADDRESS", "DL", "DT", "DD", "CENTER", "BODY", "HTML", "FORM", "FIELDSET", "DETAILS", "SUMMARY", "LEGEND"]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT", "TEMPLATE", "IFRAME", "OBJECT", "EMBED", "SVG", "CANVAS", "VIDEO", "AUDIO", "BUTTON", "SELECT", "TEXTAREA", "O:P", "XML", "COLGROUP", "COL", "MATH", "W:SDT"]);
const tagOf = (n) => String(n.tagName || n.nodeName || "").toUpperCase();
const attrOf = (n, a) => (n.getAttribute ? n.getAttribute(a) : null);
const kidsOf = (n) => Array.from(n.childNodes || []);
const styleOfEl = (n) => parseStyle(attrOf(n, "style"));
const isMsoIgnore = (n) => /mso-list\s*:\s*ignore/i.test(attrOf(n, "style") || "");

function pageBreakOf(n) {
  if (n.nodeType !== 1) return null;
  const cls = attrOf(n, "class") || "";
  if (/(^|\s)pb(\s|$)/.test(cls) || attrOf(n, "data-pb") != null) return "only";
  const st = styleOfEl(n);
  const before = /always|page/.test((st["page-break-before"] || "") + (st["break-before"] || ""));
  const after = /always|page/.test((st["page-break-after"] || "") + (st["break-after"] || ""));
  if (tagOf(n) === "BR" && (before || after)) return "only";
  if ((before || after) && !String(n.textContent || "").trim() && !(n.getElementsByTagName && n.getElementsByTagName("img").length)) return "only";
  if (before) return "before";
  if (after) return "after";
  return null;
}
function isBlockEl(n) {
  if (n.nodeType !== 1) return false;
  const t = tagOf(n);
  if (BLOCK_TAGS.has(t)) return true;
  return t === "BR" && pageBreakOf(n) === "only";
}
function hasBlockChild(n) {
  return kidsOf(n).some((k) => k.nodeType === 1 && !SKIP_TAGS.has(tagOf(k)) && (isBlockEl(k) || hasBlockChild(k)));
}

const BAND_KEYS = ["bg", "deco", "dc", "dc2", "pad", "minh", "rad", "bd", "bc", "bgimg", "ov", "cmt"];
const SPACE_KEYS = ["ps", "lsp"];
function blockPropsOf(n, st) {
  const p = {};
  const al = String(st["text-align"] || attrOf(n, "align") || "").toLowerCase();
  const dirAttr = String(attrOf(n, "dir") || st.direction || "").toLowerCase();
  if (dirAttr === "rtl") p.dir = "rtl";
  else if (dirAttr === "ltr") p.dir = null;
  const rtl = (p.dir ?? null) === "rtl";
  if (al === "center" || al === "right" || al === "justify" || al === "left") p.align = al;
  else if (al === "start") p.align = rtl ? "right" : "left";
  else if (al === "end") p.align = rtl ? "left" : "right";
  const lh = String(st["line-height"] || "").trim();
  if (/^[\d.]+$/.test(lh)) p.lineHeight = +lh;
  else if (/^[\d.]+%$/.test(lh)) p.lineHeight = parseFloat(lh) / 100;
  const ind = attrOf(n, "data-indent");
  for (const k of [...BAND_KEYS, ...SPACE_KEYS]) { const v = attrOf(n, "data-" + k); if (v != null && v !== "") p[k] = v; }
  if (ind != null) p.indent = +ind || 0;
  else if (marginLeft(st) && tagOf(n) !== "LI" && tagOf(n) !== "BLOCKQUOTE") { const px = lengthToPx(marginLeft(st)); if (px >= 24) p.indent = Math.min(8, Math.round(px / 48)); }
  return p;
}

function inlineStyleOf(n, ist) {
  const s = { ...ist };
  const t = tagOf(n);
  if ((t === "INS" || t === "DEL") && SG_RE.test(attrOf(n, "data-sg") || "")) s.sg = attrOf(n, "data-sg");
  else if (t === "B" || t === "STRONG") s.b = true;
  else if (t === "I" || t === "EM" || t === "CITE" || t === "DFN" || t === "VAR") s.i = true;
  else if (t === "U" || t === "INS") s.u = true;
  else if (t === "S" || t === "STRIKE" || t === "DEL") s.s = true;
  else if (t === "CODE" || t === "KBD" || t === "SAMP" || t === "TT") s.code = true;
  else if (t === "SUP") s.sup = true;
  else if (t === "SUB") s.sub = true;
  else if (t === "MARK") s.bg = "#fff59d";
  else if (t === "A") { const l = safeLink(attrOf(n, "href")); if (l) s.link = l; }
  else if (t === "FONT") {
    const c = normColor(attrOf(n, "color")); if (c) s.color = c === "#000000" ? undefined : c;
    const f = fontKeyFromCss(attrOf(n, "face")); if (f) s.font = f;
    const sz = +attrOf(n, "size"); if (sz >= 1 && sz <= 7) s.size = [8, 10, 12, 13.5, 18, 24, 36][sz - 1];
  }
  const st = styleOfEl(n);
  const fw = String(st["font-weight"] || "").toLowerCase();
  if (fw) { if (fw === "bold" || fw === "bolder" || +fw >= 600) s.b = true; else if (fw === "normal" || fw === "lighter" || (+fw && +fw < 600)) s.b = false; }
  const fs = String(st["font-style"] || "").toLowerCase();
  if (fs === "italic" || fs === "oblique") s.i = true; else if (fs === "normal") s.i = false;
  const td = String(st["text-decoration"] || st["text-decoration-line"] || "").toLowerCase();
  if (td) { if (td.includes("underline")) s.u = true; else if (td === "none") s.u = false; if (td.includes("line-through")) s.s = true; }
  if (st.color) { const c = normColor(st.color); s.color = c && c !== "#000000" ? c : undefined; }
  const bgv = st["background-color"] || (st.background && normColor(st.background) ? st.background : "") || (st["mso-highlight"] ? st["mso-highlight"] : "");
  if (bgv) { const c = normColor(bgv); s.bg = c && c !== "#ffffff" ? c : undefined; }
  if (st["font-family"]) { const f = fontKeyFromCss(st["font-family"]); if (f) s.font = f; }
  if (st["font-size"]) { const pt = sizeToPt(st["font-size"]); if (pt) s.size = pt; }
  const va = String(st["vertical-align"] || "").toLowerCase();
  if (va === "super") s.sup = true; else if (va === "sub") s.sub = true;
  return s;
}

/** Text of a <pre> keeping line breaks. */
function preText(n) {
  let s = "";
  for (const k of kidsOf(n)) {
    if (k.nodeType === 3) s += k.nodeValue;
    else if (k.nodeType === 1) {
      const t = tagOf(k);
      if (t === "BR") s += "\n";
      else if (t === "DIV" || t === "P") s += (s && !s.endsWith("\n") ? "\n" : "") + preText(k);
      else if (!SKIP_TAGS.has(t)) s += preText(k);
    }
  }
  return s;
}

/** Walks inline content into blk.pieces (runs, images, page breaks). */
function inlineWalk(n, blk, ist) {
  if (n.nodeType === 3) { addText(blk, n.nodeValue, ist); return; }
  if (n.nodeType !== 1) return;
  const t = tagOf(n);
  if (SKIP_TAGS.has(t) || isMsoIgnore(n)) return;
  if (t === "BR") { if (pageBreakOf(n)) blk.pieces.push({ pagebreak: true }); else blk.pieces.push({ ...ist, text: "\n", br: true }); return; }
  if (t === "IMG") {
    const src = safeSrc(attrOf(n, "src"));
    if (src) {
      const st = styleOfEl(n);
      const w = Math.round(lengthToPx(st.width) || +attrOf(n, "width") || +attrOf(n, "data-w") || 0), h = Math.round(lengthToPx(st.height) || +attrOf(n, "height") || 0);
      const ps = +attrOf(n, "data-ps") || 0, full = attrOf(n, "data-full") === "1";
      blk.pieces.push({ image: { src, alt: attrOf(n, "alt") || "", ...(w > 0 ? { w } : {}), ...(h > 0 && st.height !== "auto" ? { h } : {}), ...(ps > 0 ? { ps } : {}), ...(full ? { full } : {}) } });
    }
    return;
  }
  if (t === "INPUT") { if (String(attrOf(n, "type")).toLowerCase() === "checkbox") { blk.list = "check"; blk.checked = attrOf(n, "checked") != null; } return; }
  if (BLOCK_TAGS.has(t) && blk.pieces.length && !blk.pieces[blk.pieces.length - 1].br) blk.pieces.push({ ...ist, text: "\n", br: true });
  const s = BLOCK_TAGS.has(t) ? ist : inlineStyleOf(n, ist);
  for (const k of kidsOf(n)) inlineWalk(k, blk, s);
}

function addText(blk, text, ist) {
  if (text == null || text === "") return;
  const t = blk.pre ? text : String(text).replace(/[\t\n\r\f ]+/g, " ");
  blk.pieces.push({ ...ist, text: t.replace(/ /g, " ").replace(/​/g, "") });
}

/** Turns collected pieces into blocks (splitting at images and page breaks). */
function pushBlock(blk, out, keepEmpty) {
  let runs = [];
  const { pieces, ...props } = blk;
  const emit = (force) => {
    // Collapse spaces across runs, trim the ends, drop one trailing line break.
    let prevSpace = true;
    for (const r of runs) {
      if (r.br) { prevSpace = true; continue; }
      if (prevSpace) r.text = r.text.replace(/^ +/, "");
      r.text = r.text.replace(/ {2,}/g, " ");
      if (r.text) prevSpace = r.text.endsWith(" ");
    }
    let poppedBr = false;
    for (let i = runs.length - 1; i >= 0; i--) {
      if (runs[i].br) { if (!poppedBr && i === runs.length - 1) { runs.pop(); poppedBr = true; continue; } break; }
      runs[i].text = runs[i].text.replace(/ +$/, "");
      if (runs[i].text) break;
    }
    runs.forEach((r) => { if (r.br) r.text = "\n"; });
    for (let i = 0; i < runs.length; i++) { // no spaces right after a line break
      if (runs[i].br && runs[i + 1] && !runs[i + 1].br) runs[i + 1].text = runs[i + 1].text.replace(/^ +/, "");
    }
    const clean = cleanRuns(runs.map(({ br, ...r }) => r));
    if (clean.length || force) out.push(makeBlock(props, clean));
    runs = [];
  };
  let emitted = false;
  for (const p of pieces) {
    if (p.image) { if (runs.length) emit(false); out.push({ type: "image", ...p.image, ...(props.align && props.align !== "left" ? { align: props.align } : {}) }); emitted = true; }
    else if (p.pagebreak) { emit(false); out.push({ type: "pagebreak" }); emitted = true; }
    else runs.push({ ...p });
  }
  emit(keepEmpty && !emitted);
}

function makeBlock(props, runs) {
  const b = { type: props.type || "p" };
  for (const k of ["align", "lineHeight", "dir", "indent", ...BAND_KEYS, ...SPACE_KEYS]) if (props[k] != null && props[k] !== "") b[k] = props[k];
  if (b.type === "li") { b.list = props.list || "bullet"; b.level = props.level || 0; if (b.list === "check") b.checked = !!props.checked; delete b.indent; }
  b.runs = runs;
  return b;
}

function walkBlocks(nodes, bp, ist, out) {
  let cur = null;
  const flush = () => { if (cur) { pushBlock(cur, out, false); cur = null; } };
  const ensure = () => (cur ||= { ...bp, type: bp.type || "p", pieces: [] });
  for (const n of nodes) {
    if (n.nodeType === 3) {
      if (!cur && !n.nodeValue.replace(/[\s​]+/g, "")) continue;
      addText(ensure(), n.nodeValue, ist);
      continue;
    }
    if (n.nodeType !== 1) continue;
    const t = tagOf(n);
    if (SKIP_TAGS.has(t) || isMsoIgnore(n)) continue;
    const pb = pageBreakOf(n);
    if (pb === "only") { flush(); out.push({ type: "pagebreak" }); continue; }
    if (!isBlockEl(n) && !hasBlockChild(n)) { inlineWalk(n, ensure(), ist); continue; }
    flush();
    if (!isBlockEl(n)) { walkBlocks(kidsOf(n), bp, inlineStyleOf(n, ist), out); continue; }
    if (pb === "before") out.push({ type: "pagebreak" });
    handleBlock(n, bp, ist, out);
    if (pb === "after") out.push({ type: "pagebreak" });
  }
  flush();
}

function textBlock(n, props, ist, out) {
  if (hasBlockChild(n)) { walkBlocks(kidsOf(n), props, ist, out); return; }
  const blk = { ...props, pieces: [] };
  for (const k of kidsOf(n)) inlineWalk(k, blk, ist);
  pushBlock(blk, out, true);
}

function handleBlock(n, bp, ist, out) {
  const t = tagOf(n), st = styleOfEl(n), cls = attrOf(n, "class") || "";
  const nbp = { ...bp, ...blockPropsOf(n, st) };
  if (nbp.dir === null) delete nbp.dir;
  const nist = inlineStyleOf(n, ist);
  if (/^H[1-6]$/.test(t)) { textBlock(n, { ...nbp, type: "h" + Math.min(3, +t[1]) }, { ...nist, b: undefined }, out); return; }
  if (t === "P" || t === "DIV" || t === "CENTER" || t === "ADDRESS" || t === "DT" || t === "DD" || t === "FIGCAPTION" || t === "SUMMARY" || t === "LEGEND" || t === "CAPTION") {
    const msoList = String(st["mso-list"] || "");
    if (/level\d+/i.test(msoList) && !/ignore/i.test(msoList)) { textBlock(n, { ...nbp, type: "li", list: wordListType(n), level: Math.min(8, +msoList.match(/level(\d+)/i)[1] - 1), indent: undefined }, nist, out); return; }
    let type = nbp.type || "p";
    if (/MsoTitle/.test(cls)) type = "h1"; else if (/MsoSubtitle/.test(cls)) type = "h2"; else if (/MsoQuote|MsoIntenseQuote/.test(cls)) type = "quote";
    if (t === "CENTER") nbp.align = "center";
    if (type === "li") type = "p";
    textBlock(n, { ...nbp, type }, nist, out);
    return;
  }
  if (t === "BLOCKQUOTE") {
    // Chrome's own "indent" wraps text in a borderless blockquote: that is an indent, not a quote.
    if (/border:\s*none/i.test(attrOf(n, "style") || "") && lengthToPx(marginLeft(st)) > 0) { walkBlocks(kidsOf(n), { ...nbp, indent: (bp.indent || 0) + 1 }, nist, out); return; }
    walkBlocks(kidsOf(n), { ...nbp, type: "quote" }, nist, out);
    return;
  }
  if (t === "PRE") { const text = preText(n).replace(/\n$/, ""); out.push({ type: "code", text }); return; }
  if (t === "UL" || t === "OL") { listWalk(n, (bp.type === "li" ? bp.level + 1 : 0), out, nbp, ist); return; }
  if (t === "LI") { listItem(n, 0, /\bcheck\b/.test(cls) ? "check" : "bullet", out, nbp, ist); return; }
  if (t === "TABLE") { tableWalk(n, out, ist); return; }
  if (t === "HR") { const hr = { type: "hr" }; const hs = attrOf(n, "data-hs"), hc = attrOf(n, "data-hc"), ps = attrOf(n, "data-ps"); if (hs) hr.hs = hs; if (hc) hr.hc = hc; if (ps) hr.ps = ps; out.push(hr); return; }
  walkBlocks(kidsOf(n), nbp, nist, out);
}

function wordListType(p) {
  // Word puts the marker ("1.", "a)", "·") in a span with mso-list:Ignore.
  let marker = "";
  const find = (n) => { for (const k of kidsOf(n)) { if (k.nodeType === 1) { if (isMsoIgnore(k)) { marker = (k.textContent || "").trim(); return true; } if (find(k)) return true; } } return false; };
  find(p);
  return /^[\da-zA-Z]{1,4}[.)]/.test(marker) ? "number" : "bullet";
}

function listWalk(listEl, level, out, bp, ist) {
  const ordered = tagOf(listEl) === "OL";
  const check = /\b(check|contains-task-list)\b/.test(attrOf(listEl, "class") || "") || attrOf(listEl, "data-type") === "taskList";
  for (const c of kidsOf(listEl)) {
    if (c.nodeType === 3) { if (c.nodeValue.trim()) out.push(makeBlock({ type: "li", list: ordered ? "number" : "bullet", level }, cleanRuns([{ text: c.nodeValue.trim() }]))); continue; }
    if (c.nodeType !== 1) continue;
    const t = tagOf(c);
    if (t === "UL" || t === "OL") { listWalk(c, Math.min(8, level + 1), out, bp, ist); continue; }
    if (t !== "LI") { walkBlocks([c], bp, ist, out); continue; }
    const st = styleOfEl(c), lt = String(st["list-style-type"] || "").toLowerCase();
    let list = check || attrOf(c, "data-checked") != null || /task-list-item/.test(attrOf(c, "class") || "") ? "check" : ordered ? "number" : "bullet";
    if (list !== "check" && lt) list = /decimal|alpha|roman|latin|numeric/.test(lt) ? "number" : /disc|circle|square|none/.test(lt) ? "bullet" : list;
    const aria = +attrOf(c, "aria-level");
    listItem(c, aria >= 1 ? Math.min(8, aria - 1) : level, list, out, bp, ist);
  }
}

function listItem(li, level, list, out, bp, ist) {
  const st = styleOfEl(li);
  const item = { ...bp, ...blockPropsOf(li, st), type: "li", list, level, pieces: [] };
  delete item.indent;
  if (item.dir === null) delete item.dir;
  if (list === "check") item.checked = String(attrOf(li, "data-checked")) === "true";
  const nist = inlineStyleOf(li, ist);
  let pushed = false;
  const push = () => { if (!pushed) { pushBlock(item, out, true); pushed = true; } };
  for (const k of kidsOf(li)) {
    if (k.nodeType === 1) {
      const t = tagOf(k);
      if (t === "UL" || t === "OL") { push(); listWalk(k, Math.min(8, level + 1), out, bp, ist); continue; }
      if (t === "TABLE" || t === "PRE" || t === "BLOCKQUOTE") { push(); handleBlock(k, bp, ist, out); continue; }
      if (pushed) { walkBlocks([k], bp, ist, out); continue; }
    } else if (pushed) { if (k.nodeType === 3 && k.nodeValue.trim()) walkBlocks([k], bp, ist, out); continue; }
    inlineWalk(k, item, nist);
  }
  push();
}

function tableWalk(table, out, ist) {
  const rows = [];
  let header = false;
  const visit = (n, inHead) => {
    for (const k of kidsOf(n)) {
      if (k.nodeType !== 1) continue;
      const t = tagOf(k);
      if (t === "THEAD") visit(k, true);
      else if (t === "TBODY" || t === "TFOOT") visit(k, false);
      else if (t === "TR") {
        const row = [];
        for (const c of kidsOf(k)) {
          if (c.nodeType !== 1 || !/^T[DH]$/.test(tagOf(c))) continue;
          if (!rows.length && (tagOf(c) === "TH" || inHead)) header = true;
          const blk = { type: "p", pieces: [] };
          const tmp = [];
          const cist = inlineStyleOf(c, ist);
          if (tagOf(c) === "TH") delete cist.b;
          for (const x of kidsOf(c)) inlineWalk(x, blk, cist);
          pushBlock(blk, tmp, true);
          const runs = [];
          tmp.filter((b) => b.runs).forEach((b, i) => { if (i) runs.push({ text: "\n" }); runs.push(...b.runs); });
          row.push({ runs: cleanRuns(runs) });
          const span = Math.min(20, +attrOf(c, "colspan") || 1);
          for (let s = 1; s < span; s++) row.push({ runs: [] });
        }
        if (row.length) rows.push(row);
      } else if (t !== "CAPTION" && t !== "COLGROUP") visit(k, inHead);
    }
  };
  visit(table, false);
  if (!rows.length) return;
  const width = Math.max(...rows.map((r) => r.length));
  rows.forEach((r) => { while (r.length < width) r.push({ runs: [] }); });
  const tb = { type: "table", header, rows };
  if (attrOf(table, "data-accent")) tb.accent = attrOf(table, "data-accent");
  const ts = attrOf(table, "data-tstyle");
  if (ts === "lines" || ts === "cols") tb.tstyle = ts;
  if (attrOf(table, "data-cw")) tb.cw = attrOf(table, "data-cw");
  if (attrOf(table, "data-ps")) tb.ps = attrOf(table, "data-ps");
  out.push(tb);
}

/**
 * The clean model of an HTML tree (an editor element, a parsed paste, an imported page). Works with the
 * browser DOM, DOMParser output or jsdom. Unknown markup (Word/Google classes, styles, comments) is dropped;
 * only the formatting the model knows survives.
 */
export function htmlToModel(root) {
  const out = [];
  walkBlocks(kidsOf(root), {}, {}, out);
  return out.map(normalizeBlock).filter(Boolean);
}

/* ---------------- model → HTML ---------------- */

export const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const escAttr = (s) => escHtml(s).replace(/"/g, "&quot;");
const textHtml = (t) => escHtml(t).replace(/ {2}/g, " &nbsp;").replace(/^ /, "&nbsp;").replace(/\n/g, "<br>");

export function runsToHtml(runs) {
  return (runs || []).map((r) => {
    let h = textHtml(r.text);
    const css = [];
    if (r.color) css.push(`color:${r.color}`);
    if (r.bg) css.push(`background-color:${r.bg}`);
    if (r.font && FONT_FAMILIES[r.font]) css.push(`font-family:${FONT_FAMILIES[r.font].css}`);
    if (r.size) css.push(`font-size:${r.size}pt`);
    if (css.length) h = `<span style="${escAttr(css.join(";"))}">${h}</span>`;
    if (r.sup) h = `<sup>${h}</sup>`;
    if (r.sub) h = `<sub>${h}</sub>`;
    if (r.code) h = `<code>${h}</code>`;
    if (r.s) h = `<s>${h}</s>`;
    if (r.u) h = `<u>${h}</u>`;
    if (r.i) h = `<i>${h}</i>`;
    if (r.b) h = `<b>${h}</b>`;
    if (r.link) h = `<a href="${escAttr(r.link)}">${h}</a>`;
    if (r.sg) { const tg = r.sg.startsWith("ins:") ? "ins" : "del"; h = `<${tg} class="sg" data-sg="${escAttr(r.sg)}" title="${escAttr("Suggested by " + r.sg.split(":")[3])}">${h}</${tg}>`; }
    return h;
  }).join("");
}

export function blockAttrs(b) {
  const css = [];
  if (b.align) css.push(`text-align:${b.align}`);
  if (b.lineHeight) css.push(`line-height:${b.lineHeight}`);
  if (b.indent) css.push(`margin-left:${b.indent * 36}pt`);
  let data = b.cmt ? ` data-cmt="${escAttr(b.cmt)}"` : "";
  if (b.ps) { css.push(`margin-top:${b.ps}pt;margin-bottom:${b.ps}pt`); data += ` data-ps="${b.ps}"`; }
  if (b.lsp) { css.push(`letter-spacing:${b.lsp / 1000}em`); data += ` data-lsp="${b.lsp}"`; }
  if (b.bg || b.deco || b.bd || b.bgimg) {
    const pad = b.pad ?? 14;
    if (b.bg) css.push(`background-color:${b.bg}`);
    css.push(`padding:${pad}px ${Math.max(pad, 18)}px`);
    if (b.minh) css.push(`min-height:${b.minh}px`);
    if (b.rad) css.push(`border-radius:${b.rad}px`);
    if (b.bd) css.push(`border:${b.bd}px solid ${b.bc || "#1b2133"}`);
    if (b.bgimg) { css.push(`background-image:${photoOverlayCss(b.ov, b.bg)},url("${b.bgimg}")`, "background-size:cover", "background-position:center"); if (b.ov === "split" || b.ov === "soft") css.push("padding-right:44%"); }
    else if (b.deco) { css.push(decoCss(b.deco, b.dc, b.dc2)); if (DECOS[b.deco].pos === "left") css.push(`padding-left:${Math.round(Math.max(110, (b.minh || 80) * 0.95))}px`); else css.push(`padding-right:${Math.round(Math.max(120, (b.minh || 60) * 1.3))}px`); }
    for (const k of BAND_KEYS) if (b[k] != null && k !== "cmt") data += ` data-${k}="${escAttr(b[k])}"`;
    data += ' class="band"';
  }
  return (css.length ? ` style="${escAttr(css.join(";"))}"` : "") + (b.indent ? ` data-indent="${b.indent}"` : "") + (b.dir === "rtl" ? ' dir="rtl"' : "") + data;
}
const inner = (b) => runsToHtml(b.runs) || "<br>";
/** A divider with its style and colour. */
export function hrHtml(b) {
  if (!b.hs && !b.hc && !b.ps) return "<hr>";
  const c = b.hc || "#c7cbe0";
  const line = { dashed: `2px dashed ${c}`, dotted: `3px dotted ${c}`, double: `4px double ${c}`, thick: `4px solid ${c}` }[b.hs] || `1px solid ${c}`;
  const css = `border:0;border-top:${line}` + (b.ps ? `;margin-top:${b.ps}pt;margin-bottom:${b.ps}pt` : "");
  return `<hr style="${css}"${b.hs ? ` data-hs="${b.hs}"` : ""}${b.hc ? ` data-hc="${b.hc}"` : ""}${b.ps ? ` data-ps="${b.ps}"` : ""}>`;
}

function listsHtml(items, exportMode) {
  let html = "";
  const stack = [];
  const open = (it) => { const tg = it.list === "number" ? "ol" : "ul"; html += `<${tg}${it.list === "check" ? ' class="check"' : ""}>`; stack.push({ tg, list: it.list }); };
  for (const it of items) {
    const L = Math.min(it.level || 0, stack.length);
    while (stack.length > L + 1) html += `</li></${stack.pop().tg}>`;
    if (stack.length === L + 1) {
      if (stack[L].list !== it.list) { html += `</li></${stack.pop().tg}>`; open(it); } else html += "</li>";
    }
    while (stack.length < L + 1) open(it);
    const box = it.list === "check" && exportMode ? `<input type="checkbox"${it.checked ? " checked" : ""} disabled> ` : "";
    html += `<li${blockAttrs(it)}${it.list === "check" ? ` data-checked="${!!it.checked}"` : ""}>${box}${inner(it)}`;
  }
  while (stack.length) html += `</li></${stack.pop().tg}>`;
  return html;
}

/** HTML body for blocks. editor: markup for the contenteditable page; otherwise clean export markup. */
export function modelToHtml(blocks, { editor = false } = {}) {
  let html = "";
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "li") { const run = []; while (i < blocks.length && blocks[i].type === "li") run.push(blocks[i++]); i--; html += listsHtml(run, !editor); continue; }
    if (b.type === "quote") { let q = ""; while (i < blocks.length && blocks[i].type === "quote") { q += `<p${blockAttrs(blocks[i])}>${inner(blocks[i])}</p>`; i++; } i--; html += `<blockquote>${q}</blockquote>`; continue; }
    if (b.type === "p" || /^h[1-3]$/.test(b.type)) { html += `<${b.type}${blockAttrs(b)}>${inner(b)}</${b.type}>`; continue; }
    if (b.type === "code") { html += `<pre><code>${escHtml(b.text) || "<br>"}</code></pre>`; continue; }
    if (b.type === "hr") { html += hrHtml(b); continue; }
    if (b.type === "pagebreak") { html += editor ? '<div class="pb" contenteditable="false" data-pb="1"></div>' : '<div class="page-break" style="break-after:page;page-break-after:always"></div>'; continue; }
    if (b.type === "table") {
      const cls = [editor ? "ad-table" : "", b.tstyle === "lines" ? "t-lines" : b.tstyle === "cols" ? "t-cols" : ""].filter(Boolean).join(" ");
      const hcss = b.accent ? ` style="background-color:${b.accent}"` : "";
      const cg = b.cw ? "<colgroup>" + b.cw.map((w) => `<col style="width:${w}%">`).join("") + "</colgroup>" : "";
      const tcss = b.ps ? ` style="margin-top:${b.ps}pt;margin-bottom:${b.ps}pt" data-ps="${b.ps}"` : "";
      html += `<table${cls ? ` class="${cls}"` : ""}${b.accent ? ` data-accent="${b.accent}"` : ""}${b.tstyle ? ` data-tstyle="${b.tstyle}"` : ""}${b.cw ? ` data-cw="${b.cw.join(",")}"` : ""}${tcss}>${cg}<tbody>` + b.rows.map((r, ri) => "<tr>" + r.map((c) => { const tg = b.header && ri === 0 ? "th" : "td"; return `<${tg}${tg === "th" ? hcss : ""}>${runsToHtml(c.runs) || "<br>"}</${tg}>`; }).join("") + "</tr>").join("") + "</tbody></table>";
      continue;
    }
    if (b.type === "image") {
      const st = b.w && !b.full ? ` style="width:${b.w}px"` : "";
      const pcss = [b.align ? `text-align:${b.align}` : "", b.ps ? `margin-top:${b.ps}pt;margin-bottom:${b.ps}pt` : ""].filter(Boolean).join(";");
      const ex = (b.ps ? ` data-ps="${b.ps}"` : "") + (b.full ? ' data-full="1"' : "");
      html += `<p class="imgp${b.full ? " img-full" : ""}"${pcss ? ` style="${pcss}"` : ""}><img src="${escAttr(b.src)}" alt="${escAttr(b.alt || "")}"${st}${ex}${b.full && b.w ? ` data-w="${b.w}"` : ""}></p>`;
    }
  }
  return html;
}

/** A standalone web page for the document. */
export function exportHtmlPage(doc, site = null) {
  if (site) return exportWebsite(doc, site);
  const fam = (FONT_FAMILIES[doc.font] || FONT_FAMILIES.sans).css.replace(/"AD [^"]+",\s*/g, "");
  const css = `body{font-family:${fam};font-size:${doc.size || 11}pt;line-height:1.5;color:#1b2133;max-width:800px;margin:40px auto;padding:0 20px}
h1{font-size:${HEADING_PT.h1}pt}h2{font-size:${HEADING_PT.h2}pt}h3{font-size:${HEADING_PT.h3}pt}
blockquote{margin:12px 0;padding:4px 16px;border-left:4px solid #b4b0f5;color:#475569;font-style:italic}
pre{background:#f1f5f9;padding:10px 12px;border-radius:6px;white-space:pre-wrap}code{font-family:"Courier New",monospace}
table{border-collapse:collapse;width:100%;margin:10px 0}td,th{border:1px solid #94a3b8;padding:5px 8px;text-align:left;vertical-align:top}th{background:#efedff}
ul.check{list-style:none;padding-left:1.2em}img{max-width:100%}.page-break{height:0}
.band{border-radius:6px;margin:10px 0}table.t-lines td,table.t-lines th{border:0;border-bottom:1px dotted #94a3b8}
table.t-cols{table-layout:fixed}table.t-cols td,table.t-cols th{border:0;background:none;padding:4px 10px}.img-full img{width:100%}
@media (max-width:600px){table.t-cols,table.t-cols tbody,table.t-cols tr,table.t-cols td{display:block;width:auto!important}}
@media print{.page-break{break-after:page}}`;
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escHtml(doc.title)}</title>\n<style>\n${css}\n</style>\n</head>\n<body>\n${modelToHtml(doc.blocks)}\n</body>\n</html>\n`;
}

/**
 * "Publish as a website" (Canva Docs: Share → Website): the doc as a ready-to-host index.html with a page title,
 * description and social preview tags. site: { title, description, scrollFade }.
 */
export function exportWebsite(doc, site = {}) {
  const page = exportHtmlPage(doc);
  const title = String(site.title || doc.title || "Document").slice(0, 120);
  const desc = String(site.description || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const meta = [`<meta name="description" content="${escAttr(desc)}">`, `<meta property="og:type" content="website">`, `<meta property="og:title" content="${escAttr(title)}">`,
    desc ? `<meta property="og:description" content="${escAttr(desc)}">` : "", `<meta name="twitter:card" content="summary">`, `<meta name="generator" content="AsaanDesk Docs">`].filter(Boolean).join("\n");
  // Scroll fade: coloured banners and pictures fade and rise in as they scroll into view (CSS only, where supported).
  const fade = site.scrollFade ? `\n<style>\n@supports (animation-timeline: view()) { @keyframes adrise { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: none } } .band, .imgp { animation: adrise linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; } }\n@media (prefers-reduced-motion: reduce) { .band, .imgp { animation: none !important } }\n</style>` : "";
  return page.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(title)}</title>\n${meta}`).replace("</head>", `${fade}\n</head>`).replace("<body>", '<body>\n<main>').replace("\n</body>", "\n</main>\n</body>");
}

/* ---------------- Markdown ---------------- */

const mdEsc = (t) => String(t).replace(/([\\`*_[\]<>|~])/g, "\\$1");
function runsToMd(runs) {
  return (runs || []).map((r) => {
    if (r.code) { const t = r.text.replace(/\n/g, " "); const ticks = t.includes("`") ? "``" : "`"; return `${ticks}${t}${ticks}`; }
    const m = r.text.match(/^( *)([\s\S]*?)( *)$/);
    let core = mdEsc(m[2]).replace(/\n/g, "\\\n");
    if (!core) return r.text.replace(/\n/g, "\\\n");
    if (r.s) core = `~~${core}~~`;
    if (r.i) core = `*${core}*`;
    if (r.b) core = `**${core}**`;
    if (r.link) core = `[${core}](${r.link.replace(/\)/g, "%29").replace(/ /g, "%20")})`;
    return m[1] + core + m[3];
  }).join("");
}

export function modelToMarkdown(doc) {
  const blocks = doc.blocks || doc;
  const parts = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "li") {
      const lines = [];
      const counters = [], kinds = [];
      while (i < blocks.length && blocks[i].type === "li") {
        const it = blocks[i];
        const L = it.level || 0;
        counters.length = L + 1;
        if (kinds[L] !== it.list) { counters[L] = 0; kinds[L] = it.list; }
        kinds.length = L + 1;
        counters[L] = (counters[L] || 0) + 1;
        const marker = it.list === "number" ? `${counters[L]}.` : it.list === "check" ? `- [${it.checked ? "x" : " "}]` : "-";
        lines.push(`${"    ".repeat(L)}${marker} ${runsToMd(it.runs)}`);
        i++;
      }
      parts.push(lines.join("\n"));
      continue;
    }
    if (b.type === "quote") {
      const q = [];
      while (i < blocks.length && blocks[i].type === "quote") { q.push(runsToMd(blocks[i].runs).split("\n").map((l) => "> " + l).join("\n")); i++; }
      parts.push(q.join("\n>\n"));
      continue;
    }
    i++;
    if (b.type === "p") { const t = runsToMd(b.runs); parts.push(t.replace(/^(#{1,6} |[-+*] |\d+[.)] |>)/, "\\$1")); }
    else if (/^h[1-3]$/.test(b.type)) parts.push("#".repeat(+b.type[1]) + " " + runsToMd(b.runs).replace(/\\\n/g, " "));
    else if (b.type === "code") { const fence = b.text.includes("```") ? "~~~" : "```"; parts.push(`${fence}\n${b.text}\n${fence}`); }
    else if (b.type === "hr") parts.push("---");
    else if (b.type === "pagebreak") parts.push("<!-- page break -->");
    else if (b.type === "image") parts.push(`![${mdEsc(b.alt || "")}](${b.src})`);
    else if (b.type === "table") {
      const cell = (c) => runsToMd(c.runs).replace(/\\\n/g, "<br>").replace(/\n/g, "<br>") || " ";
      const rows = b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`);
      rows.splice(1, 0, `| ${b.rows[0].map(() => "---").join(" | ")} |`);
      parts.push(rows.join("\n"));
    }
  }
  return parts.filter((p) => p !== undefined).join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Inline Markdown → runs (bold, italic, strike, code, links, images are returned as {image}). */
export function mdInline(s, st = {}, out = []) {
  let buf = "";
  const push = () => { if (buf) { out.push({ ...st, text: buf }); buf = ""; } };
  const closeAt = (from, delim) => {
    for (let j = from; j <= s.length - delim.length; j++) {
      if (s[j] === "\\") { j++; continue; }
      if (s[j] === "`") { const e = s.indexOf("`", j + 1); if (e > 0) { j = e; continue; } }
      if (s.startsWith(delim, j) && !/\s/.test(s[j - 1] || " ")) {
        if (delim.length === 1 && (delim === "*" || delim === "_") && s[j + 1] === delim) { const e = s.indexOf(delim + delim, j + 2); if (e > 0) { j = e + 1; continue; } }
        return j;
      }
    }
    return -1;
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      if (s[i + 1] === "\n") { buf += "\n"; i += 2; continue; }
      if (/[\\`*_{}[\]()#+\-.!|~<>]/.test(s[i + 1])) { buf += s[i + 1]; i += 2; continue; }
    }
    if (c === "`") {
      const m = s.slice(i).match(/^(`+)([\s\S]*?[^`])\1(?!`)/);
      if (m) { push(); out.push({ ...st, code: true, text: m[2].replace(/^ ([\s\S]*) $/, "$1") }); i += m[0].length; continue; }
    }
    if (c === "!" && s[i + 1] === "[") {
      const m = s.slice(i).match(/^!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/);
      if (m) { push(); out.push({ image: { src: m[2], alt: m[1] } }); i += m[0].length; continue; }
    }
    if (c === "[") {
      const m = s.slice(i).match(/^\[((?:\\.|[^\]])*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/);
      if (m) { push(); mdInline(m[1], { ...st, link: m[2].replace(/%29/g, ")").replace(/%20/g, " ") }, out); i += m[0].length; continue; }
    }
    if (c === "<") {
      const m = s.slice(i).match(/^<(https?:\/\/[^>\s]+)>/);
      if (m) { push(); out.push({ ...st, link: m[1], text: m[1] }); i += m[0].length; continue; }
      const br = s.slice(i).match(/^<br\s*\/?>/i);
      if (br) { buf += "\n"; i += br[0].length; continue; }
      const u = s.slice(i).match(/^<u>([\s\S]*?)<\/u>/i);
      if (u) { push(); mdInline(u[1], { ...st, u: true }, out); i += u[0].length; continue; }
    }
    if (c === "~" && s[i + 1] === "~") {
      const e = closeAt(i + 2, "~~");
      if (e > i + 2) { push(); mdInline(s.slice(i + 2, e), { ...st, s: true }, out); i = e + 2; continue; }
    }
    if (c === "*" || c === "_") {
      let n = 0; while (s[i + n] === c) n++;
      const leftOk = c === "*" || !/[A-Za-z0-9]/.test(s[i - 1] || "");
      if (leftOk && !/\s/.test(s[i + n] || " ")) {
        if (n >= 3) { const e = closeAt(i + 3, c.repeat(3)); if (e > i + 3) { push(); mdInline(s.slice(i + 3, e), { ...st, b: true, i: true }, out); i = e + 3; continue; } }
        if (n >= 2) { const e = closeAt(i + 2, c + c); if (e > i + 2) { push(); mdInline(s.slice(i + 2, e), { ...st, b: true }, out); i = e + 2; continue; } }
        const e = closeAt(i + 1, c);
        if (e > i + 1 && (c === "*" || !/[A-Za-z0-9]/.test(s[e + 1] || ""))) { push(); mdInline(s.slice(i + 1, e), { ...st, i: true }, out); i = e + 1; continue; }
      }
      buf += c.repeat(n); i += n; continue;
    }
    buf += c; i++;
  }
  push();
  return out;
}

function inlineBlocks(type, text, props = {}) {
  const pieces = mdInline(text);
  const out = [];
  let runs = [];
  const emit = (force) => { const r = cleanRuns(runs); if (r.length || force) out.push({ type, ...props, runs: r }); runs = []; };
  for (const p of pieces) { if (p.image) { if (runs.length) emit(false); const src = safeSrc(p.image.src); if (src) out.push({ type: "image", src, alt: p.image.alt }); } else runs.push(p); }
  if (runs.length || !out.length) emit(true);
  return out;
}

/** Markdown (CommonMark/GFM subset: headings, lists, task lists, quotes, code, tables, rules, images, links) → model. */
export function mdToModel(md, title) {
  const lines = String(md || "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const blocks = [];
  let para = [];
  const flushPara = () => {
    if (!para.length) return;
    const text = para.map((l, k) => {
      if (k === para.length - 1) return l.trim();
      if (/\\$/.test(l)) return l.trim().replace(/\\$/, "") + "\n";
      if (/ {2,}$/.test(l)) return l.trim() + "\n";
      return l.trim() + " ";
    }).join("").trim();
    blocks.push(...inlineBlocks("p", text));
    para = [];
  };
  let i = 0;
  const listIndents = [];
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flushPara();
      const nx = lines.slice(i + 1).find((l) => l.trim());
      if (!nx || !/^\s*([-*+]|\d{1,9}[.)])\s+/.test(nx)) listIndents.length = 0;
      i++;
      continue;
    }
    if (/^\s*<!--\s*page ?break\s*-->\s*$/i.test(line)) { flushPara(); blocks.push({ type: "pagebreak" }); i++; continue; }
    let m;
    if ((m = line.match(/^ {0,3}(```+|~~~+)\s*([\w-]*)\s*$/))) {
      flushPara();
      const fence = m[1], body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) body.push(lines[i++]);
      i++;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }
    if ((m = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) { flushPara(); blocks.push(...inlineBlocks("h" + Math.min(3, m[1].length), m[2])); i++; continue; }
    if (para.length && /^ {0,3}(=+|-+)\s*$/.test(line)) { const text = para.join(" ").trim(); para = []; blocks.push(...inlineBlocks(line.trim()[0] === "=" ? "h1" : "h2", text)); i++; continue; }
    if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flushPara(); blocks.push({ type: "hr" }); i++; continue; }
    if (/^ {0,3}>/.test(line)) {
      flushPara();
      const q = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) q.push(lines[i++].replace(/^ {0,3}> ?/, ""));
      const paras = q.join("\n").split(/\n\s*\n/);
      for (const p of paras) if (p.trim()) blocks.push(...inlineBlocks("quote", p.split("\n").map((l) => l.trim()).join(" ")));
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      flushPara();
      const split = (l) => { const t = l.trim().replace(/^\|/, "").replace(/\|$/, ""); const cells = []; let cur = ""; for (let k = 0; k < t.length; k++) { if (t[k] === "\\" && t[k + 1] === "|") { cur += "|"; k++; } else if (t[k] === "|") { cells.push(cur); cur = ""; } else cur += t[k]; } cells.push(cur); return cells.map((c) => c.trim()); };
      const rows = [split(line)];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(split(lines[i++]));
      const width = rows[0].length;
      blocks.push({ type: "table", header: true, rows: rows.map((r) => Array.from({ length: width }, (_, k) => ({ runs: cleanRuns(mdInline((r[k] || "").replace(/<br\s*\/?>/gi, "\n"))) }))) });
      continue;
    }
    if ((m = line.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/))) {
      flushPara();
      const indent = m[1].length;
      while (listIndents.length && listIndents[listIndents.length - 1] > indent) listIndents.pop();
      if (!listIndents.length || listIndents[listIndents.length - 1] < indent) listIndents.push(indent);
      const level = Math.min(8, listIndents.length - 1);
      let text = m[3], list = /\d/.test(m[2]) ? "number" : "bullet", checked;
      const task = text.match(/^\[([ xX])\]\s+(.*)$/);
      if (task) { list = "check"; checked = task[1] !== " "; text = task[2]; }
      i++;
      while (i < lines.length && lines[i].trim() && !/^\s*([-*+]|\d{1,9}[.)])\s+/.test(lines[i]) && /^\s{2,}/.test(lines[i])) text += " " + lines[i++].trim();
      blocks.push(...inlineBlocks("li", text, { list, level, ...(list === "check" ? { checked } : {}) }));
      continue;
    }
    if ((m = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/)) && !para.length) { const src = safeSrc(m[2]); if (src) blocks.push({ type: "image", src, alt: m[1] }); i++; continue; }
    para.push(line);
    i++;
  }
  flushPara();
  return normalizeDoc({ ...newDoc(title || firstHeading(blocks) || "Imported document"), blocks });
}

/** Plain text → model (one paragraph per line). */
export function textToModel(text, title) {
  const blocks = String(text || "").replace(/\r\n?/g, "\n").split("\n").filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim())).map((l) => ({ type: "p", runs: l.trim() ? [{ text: l.replace(/\t/g, "    ") }] : [] }));
  return normalizeDoc({ ...newDoc(title || "Imported text"), blocks });
}

function firstHeading(blocks) { const h = blocks.find((b) => /^h[1-3]$/.test(b.type)); return h ? runsText(h.runs).slice(0, 80) : ""; }

/* ---------------- plain text, counts, outline ---------------- */

export function modelToText(doc) {
  const blocks = doc.blocks || doc;
  const out = [];
  const counters = [], kinds = [];
  for (const b of blocks) {
    if (b.type !== "li") { counters.length = 0; kinds.length = 0; }
    if (b.type === "li") {
      const L = b.level || 0;
      counters.length = L + 1;
      if (kinds[L] !== b.list) { counters[L] = 0; kinds[L] = b.list; }
      kinds.length = L + 1;
      counters[L] = (counters[L] || 0) + 1;
      const marker = b.list === "number" ? `${counters[L]}.` : b.list === "check" ? (b.checked ? "[x]" : "[ ]") : "•";
      out.push(`${"  ".repeat(L)}${marker} ${runsText(b.runs)}`);
    } else if (b.type === "hr") out.push("----------------------------------------");
    else if (b.type === "pagebreak") out.push("\f");
    else if (b.type === "image") out.push(b.alt ? `[Image: ${b.alt}]` : "[Image]");
    else if (b.type === "quote") out.push("> " + runsText(b.runs));
    else out.push(blockText(b));
  }
  return out.join("\n").replace(/\n\f\n/g, "\n\f\n") + "\n";
}

export function docPlainText(doc) { return (doc.blocks || []).map(blockText).join("\n"); }

/** { words, chars, charsNoSpaces } for the whole document. */
export function countWords(doc) {
  const t = docPlainText(doc);
  const words = (t.match(/[^\s]+/g) || []).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const chars = [...t.replace(/\n/g, "")].length;
  return { words, chars, charsNoSpaces: [...t.replace(/\s/g, "")].length };
}

/** Headings for the outline panel: [{ level, text, index }]. */
export function outline(doc) {
  return (doc.blocks || []).map((b, index) => ({ b, index })).filter(({ b }) => /^h[1-3]$/.test(b.type) && runsText(b.runs).trim()).map(({ b, index }) => ({ level: +b.type[1], text: runsText(b.runs).trim(), index }));
}

/* ---------------- whole-document transforms ---------------- */

/** The style shared by every run (so a translated block keeps it), else {}. */
function commonStyle(runs) {
  if (!runs.length) return {};
  const s = styleOf(runs[0]);
  for (const r of runs.slice(1)) for (const k of Object.keys(s)) if (r[k] !== s[k]) delete s[k];
  delete s.link;
  return s;
}

/**
 * Runs fn(text) on every text block and table cell, keeping the structure (block types, lists, tables,
 * alignment). Code blocks are left alone. onProgress(done, total). Returns a new doc.
 */
export async function mapDocText(doc, fn, { rtl = null, onProgress } = {}) {
  const next = JSON.parse(JSON.stringify(doc));
  const jobs = [];
  for (const b of next.blocks) {
    if (b.runs && runsText(b.runs).trim()) jobs.push({ holder: b, block: b });
    if (b.type === "table") for (const r of b.rows) for (const c of r) if (runsText(c.runs).trim()) jobs.push({ holder: c, block: null });
  }
  let done = 0;
  for (const j of jobs) {
    const text = runsText(j.holder.runs);
    const res = String((await fn(text)) ?? text);
    j.holder.runs = cleanRuns([{ ...commonStyle(j.holder.runs), text: res }]);
    if (j.block && rtl !== null) { if (rtl) j.block.dir = "rtl"; else delete j.block.dir; }
    onProgress?.(++done, jobs.length);
  }
  return next;
}

export const isRtlLang = (code) => RTL_LANGS.includes(String(code || "").slice(0, 2).toLowerCase());
