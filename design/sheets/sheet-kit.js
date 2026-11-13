// AsaanDesk Sheets: one design kit for every template (pure module, no DOM). It gives every sheet the same
// professional pattern: a merged title banner (big bold title, subtitle line, accent rule and, where it fits, a real
// photo tile from the shared library), KPI summary cards, a solid header row, zebra rows with hairlines, a ruled total
// row and charts in the template's own colours. Colours come from a theme th = { band, band2, head, ink, zebra, photo }.

import { PHOTOS, themesFor, pickPhoto, photoUrl } from "../shared/photo-library.js";

/** Small (thumbnail) version of a library photo URL, for template pictures. */
export function photoThumb(url) { const f = String(url).split("/").pop(); const p = PHOTOS.find((x) => x.file === f); return p ? photoUrl(p, "thumb") : url; }
/** Banner photo for a topic (shared library): only photos of the topic's leading themes, picked by the seed. */
export function topicPhoto(topic, seed, size = "full") {
  const list = [];
  for (const th of themesFor(topic)) { for (const p of PHOTOS) if (p.theme === th && (p.w || 2) >= (p.h || 1)) list.push(p); if (list.length >= 3) break; }
  if (!list.length) return photoUrl(pickPhoto(topic, seed, { landscape: true }), size);
  let h = 2166136261; for (const ch of String(seed) + "|" + topic) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return photoUrl(list[(h >>> 0) % list.length], size);
}
const colL = (c) => { let s = ""; for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
export const ref = (r, c) => colL(c) + (r + 1);
const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "")); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
/** a → b by t (0..1), as #rrggbb. */
export const mix = (a, b, t) => { const x = hex(a), y = hex(b); if (!x || !y) return a; return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lum = (c) => { const x = hex(c); return x ? (0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]) / 255 : 0; };
/** Text colour that reads on a fill. */
export const onFill = (fill, ink = "#1b2133") => (lum(fill) > 0.62 ? ink : "#ffffff");
export const HAIR = "#e6e9f2";
/** Chart colours of a theme. */
export const chartColors = (th) => [th.band, th.band2 || mix(th.band, "#ffffff", 0.45), th.ink, mix(th.band, "#f59e0b", 0.55), mix(th.band, "#14b8a6", 0.6), mix(th.band2 || th.band, "#f43f5e", 0.5), mix(th.ink, "#94a3b8", 0.5), mix(th.band, "#ffffff", 0.7)];

export function sheetKit(name, existing = null) {
  const s = existing || { name, cells: {}, styles: {}, colW: {}, rowH: {}, charts: [] };
  const t = {
    s, th: null,
    put(r, c, v, st) { if (v !== null && v !== undefined && v !== "") s.cells[ref(r, c)] = String(v); if (st) t.style(r, c, st); return t; },
    row(r, values, st) { values.forEach((v, c) => t.put(r, c, v, st)); return t; },
    /** Style merge; borders add up (a hairline never replaces a coloured rule already there). */
    style(r, c, st) {
      const k = ref(r, c), old = s.styles[k] || {};
      const nx = { ...old, ...st };
      if (st.bd && old.bd && st.bd !== old.bd) {
        if (st.soft) { nx.bd = [...new Set((old.bd + st.bd).split(""))].join(""); nx.bc = old.bc; if (old.bs) nx.bs = old.bs; else delete nx.bs; }
        else nx.bd = [...new Set((old.bd + st.bd).split(""))].join("");
      }
      delete nx.soft;
      s.styles[k] = nx;
      return t;
    },
    range(r1, c1, r2, c2, st) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) t.style(r, c, st); return t; },
    widths(list) { list.forEach((w, c) => { if (w) s.colW[c] = w; }); return t; },
    height(r, px) { s.rowH[r] = px; return t; },
    merge(r1, c1, r2, c2) { if (r2 > r1 || c2 > c1) (s.merges ||= []).push({ r1, c1, r2, c2 }); return t; },
    image(r, c, src, st) { if (src) { (s.images ||= {})[ref(r, c)] = src; t.style(r, c, { fit: "cover", ...(st || {}) }); } return t; },
    /** Title banner on rows 0 (title) and 1 (subtitle) across columns 0..c2, with a photo tile at the right when th.photo. */
    title(text, c2, th, note) {
      t.th = th;
      const last = note ? 1 : 0, pc = th.photo && c2 >= 4 ? (c2 >= 7 ? 2 : 1) : 0, tc2 = c2 - pc;
      t.range(0, 0, last, c2, { fill: th.band, color: "#ffffff" });
      t.put(0, 0, text, { b: true, size: 30, valign: "middle", ...(th.font ? { font: th.font } : {}) }).height(0, 70).merge(0, 0, 0, tc2);
      if (note) t.put(1, 0, note, { size: 12, color: mix(th.band, "#ffffff", 0.82), valign: "top" }).height(1, 30).merge(1, 0, 1, tc2);
      t.range(last, 0, last, c2, { bd: "b", bc: th.band2 || th.ink, bs: "thick" });
      if (pc) t.image(0, tc2 + 1, th.photo, { fill: th.band }).merge(0, tc2 + 1, last, c2);
      return t;
    },
    /** Solid header row. */
    head(r, values, th) {
      const fill = th.hd || th.band;
      return t.row(r, values, { b: true, fill, color: onFill(fill), valign: "middle", bd: "b", bc: th.ink }).height(r, 32);
    },
    /** Alternate row tint plus a hairline under every row. */
    zebra(r1, r2, c2, th) {
      for (let r = r1; r <= r2; r++) { if ((r - r1) % 2) t.range(r, 0, r, c2, { fill: th.zebra }); t.range(r, 0, r, c2, { bd: "b", bc: HAIR, soft: true }); }
      return t;
    },
    /** Total row: tinted, bold, a thick rule on top. */
    total(r, values, th) { return t.row(r, values, { b: true, fill: th.head, color: th.ink, bd: "t", bc: th.band, bs: "thick", valign: "middle" }).height(r, 32); },
    /** KPI cards: label row r, big value row r+1; each card is two columns wide: [[label, formula, fmt], …]. */
    kpis(r, pairs, th) {
      pairs.forEach(([label, f, fmt], i) => {
        const c = i * 2;
        t.range(r, c, r + 1, c + 1, { fill: th.head });
        t.put(r, c, label, { b: true, size: 11, color: th.ink, valign: "bottom", bd: "l", bc: th.band, bs: "thick" }).merge(r, c, r, c + 1);
        t.put(r + 1, c, f, { b: true, size: 24, color: th.band, valign: "middle", align: "left", bd: "l", bc: th.band, bs: "thick", ...(fmt ? { fmt } : {}) }).merge(r + 1, c, r + 1, c + 1);
      });
      return t.height(r, 26).height(r + 1, 42);
    },
    /** One card made of a label cell over a value cell (any place): [r, c, label, formula, fmt]. */
    card(r, c, label, f, fmt, th, span = 1) {
      const tt = th || t.th;
      t.range(r, c, r + 1, c + span - 1, { fill: tt.head });
      t.put(r, c, label, { b: true, size: 11, color: tt.ink, valign: "bottom", bd: "l", bc: tt.band, bs: "thick" });
      t.put(r + 1, c, f, { b: true, size: 22, color: tt.band, valign: "middle", align: "left", bd: "l", bc: tt.band, bs: "thick", ...(fmt ? { fmt } : {}) });
      if (span > 1) t.merge(r, c, r, c + span - 1).merge(r + 1, c, r + 1, c + span - 1);
      return t;
    },
    /** Restyles a row of label, value, label, value… cells (from column c1, n pairs) as inline KPI cards. */
    pairCards(r, c1, n, th) {
      const tt = th || t.th;
      for (let i = 0; i < n; i++) {
        const c = c1 + i * 2, k2 = ref(r, c + 1), old = s.styles[k2] || {};
        t.style(r, c, { b: true, size: 11, color: tt.ink, fill: tt.head, valign: "middle", bd: "l", bc: tt.band, bs: "thick" });
        s.styles[k2] = { ...old, b: true, size: 17, fill: tt.head, valign: "middle", align: "left", color: old.color && old.color !== tt.ink ? old.color : tt.band };
      }
      return t.height(r, 44);
    },
    /** Restyles a label row rl over a value row rl+1 (columns c1..c2) as KPI cards, one column each. */
    cardRows(rl, c1, c2, th) {
      const tt = th || t.th;
      for (let c = c1; c <= c2; c++) {
        const kl = ref(rl, c), kv = ref(rl + 1, c), ov = s.styles[kv] || {};
        s.styles[kl] = { ...(s.styles[kl] || {}), b: true, size: 11, color: tt.ink, fill: tt.head, valign: "bottom", bd: "l", bc: tt.band, bs: "thick" };
        s.styles[kv] = { ...ov, b: true, size: Math.min(22, ov.size || 22), color: ov.color && ov.color !== tt.ink ? ov.color : tt.band, fill: tt.head, valign: "middle", align: "left", bd: "l", bc: tt.band, bs: "thick" };
      }
      return t.height(rl, 26).height(rl + 1, 44);
    },
    box(r1, c1, r2, c2, color) { return t.range(r1, c1, r2, c2, { bd: "trbl", bc: color }); },
    /** Section label (small caps-like heading in the theme colour with a rule under it). */
    section(r, c1, c2, text, th) { const tt = th || t.th; t.put(r, c1, text, { b: true, size: 14, color: tt.ink }); return t.range(r, c1, r, c2, { bd: "b", bc: tt.band, bs: "thick" }).height(r, 34); },
    chart(ch) { s.charts.push({ w: 440, h: 280, ...(t.th ? { colors: chartColors(t.th) } : {}), ...ch }); return t; },
    /** Dropdown pills on a range: [[label, colour], …]. */
    dd(range, opts) { (s.dropdowns ||= []).push({ range, options: opts.map(([label, color]) => ({ label, color })) }); return t; },
    /** Conditional formatting rule on a range. */
    cf(range, op, v1, style, v2 = "") { (s.cf ||= []).push({ id: "r" + ((s.cf?.length || 0) + 1), range, op, v1: String(v1), v2: String(v2), style }); return t; },
    /** Colour scale on a range (low → high). */
    scale(range, min, max) { (s.cf ||= []).push({ id: "r" + ((s.cf?.length || 0) + 1), range, op: "scale", min, max, v1: "", v2: "", style: {} }); return t; },
    link(r, c, url, text) { t.put(r, c, text, { link: url }); return t; },
  };
  return t;
}
const parseRef = (a1) => { const m = /^([A-Z]+)(\d+)$/.exec(a1); if (!m) return null; let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return { r: +m[2] - 1, c: c - 1 }; };
const shiftRange = (rg, n) => String(rg).replace(/([A-Z]+)(\d+)/g, (_, c, r) => c + (+r + n));
/** Moves everything on a built sheet n rows down (formulas, styles, heights, charts, merges, rules, pictures). */
export function shiftDown(s, n, adjustFormula) {
  const mv = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => { const p = parseRef(k); return [p ? ref(p.r + n, p.c) : k, v]; }));
  s.cells = Object.fromEntries(Object.entries(s.cells).map(([k, v]) => { const p = parseRef(k); const val = typeof v === "string" && v[0] === "=" ? adjustFormula(v, { formulaSheet: s.name, target: s.name, axis: "row", at: 0, count: n }) : v; return [ref(p.r + n, p.c), val]; }));
  s.styles = mv(s.styles);
  if (s.images) s.images = mv(s.images);
  s.rowH = Object.fromEntries(Object.entries(s.rowH || {}).map(([r, h]) => [+r + n, h]));
  for (const ch of s.charts || []) { if (ch.range) ch.range = shiftRange(ch.range, n); if (ch.r1 != null) { ch.r1 += n; ch.r2 += n; } if (ch.at) ch.at = shiftRange(ch.at, n); }
  for (const g of s.merges || []) { g.r1 += n; g.r2 += n; }
  for (const d of s.dropdowns || []) d.range = shiftRange(d.range, n);
  for (const x of s.cf || []) x.range = shiftRange(x.range, n);
  return s;
}
/** A theme from one brand colour. */
export const themeOf = (band, photo = null) => ({ band, band2: mix(band, "#ffffff", 0.42), head: mix(band, "#ffffff", 0.86), ink: mix(band, "#0b1020", 0.55), zebra: mix(band, "#ffffff", 0.95), photo });
/** In-cell progress bar formula for a 0..1 value in cell a1 (10 blocks). */
export const bar10 = (a1) => `=REPT("█",ROUND(MAX(0,MIN(1,${a1}))*10,0))&REPT("░",10-ROUND(MAX(0,MIN(1,${a1}))*10,0))`;
