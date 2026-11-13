// AsaanDesk Sheets: a template picture drawn from the REAL built sheet (pure module, no DOM). The formulas are worked
// out with the app's own engine, then the top-left part of the sheet (title banner, KPI cards, the table with its header,
// zebra rows, borders, pills and number formats) and its first chart are drawn as one small SVG. So a thumbnail always
// shows the finished template, with its real labels and numbers.
import { Workbook, parseCellName, parseRangeName, FormulaError } from "./formula.js";
import { displayText, chartData } from "./model.js";
import { photoOf, posOf } from "./sheet-kit.js";

const FONT = "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
const DEF_W = 110, DEF_H = 28, NOW = () => new Date(Date.UTC(2026, 10, 12, 9, 0, 0));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n1 = (v) => Math.round(v * 10) / 10;
const ALIGN = (v) => (v < 0.34 ? "Min" : v > 0.66 ? "Max" : "Mid");
/** An <image> that covers the box (x, y, w, h), clipped by clipId. pos ("48% 30%", the image cell's focus, CSS
 *  object-position semantics) keeps a face in view: exact for library photos (their size is known), the nearest
 *  xMin/xMid/xMax + YMin/YMid/YMax alignment for other pictures. */
function coverImage(href, src, pos, x, y, w, h, clipId) {
  const f = posOf(pos), p = f ? photoOf(src) : null;
  if (p && p.w && p.h && w > 0 && h > 0) {
    const s = Math.max(w / p.w, h / p.h), iw = p.w * s, ih = p.h * s;
    return `<image href="${esc(href)}" x="${n1(x + (w - iw) * f[0])}" y="${n1(y + (h - ih) * f[1])}" width="${n1(iw)}" height="${n1(ih)}" preserveAspectRatio="none" clip-path="url(#${clipId})"/>`;
  }
  return `<image href="${esc(href)}" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" preserveAspectRatio="${f ? `x${ALIGN(f[0])}Y${ALIGN(f[1])}` : "xMidYMid"} slice" clip-path="url(#${clipId})"/>`;
}
/** Rough text width (px) of a string in our sans font. */
export function textW(t, size = 13, bold = false) {
  let w = 0;
  for (const ch of String(t)) w += /[il.,:;'|!]/.test(ch) ? 0.28 : /[mwMW@%]/.test(ch) ? 0.86 : /[A-Z0-9#$€£]/.test(ch) ? 0.64 : ch === " " ? 0.28 : /[▀-◿]/.test(ch) ? 0.62 : 0.52;
  return w * size * (bold ? 1.07 : 1) * 1.08; // a little wider than Arial: other sans fonts (e.g. DejaVu) run wider
}
function fit(t, max, size, bold) {
  t = String(t);
  if (!/[A-Za-z]/.test(t)) max *= 1.08; // digits are narrow in every font: no safety margin for numbers
  if (textW(t, size, bold) <= max) return t;
  let lo = 0, hi = t.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (textW(t.slice(0, m) + "…", size, bold) <= max) lo = m; else hi = m - 1; }
  // never cut inside a word: back up to the last space (a cut word could read as another word), then "…"
  if (!/[A-Za-z]/.test(t)) return t.slice(0, lo); // numbers: just the part that fits
  const sp = t.lastIndexOf(" ", lo);
  if (sp > 0 && t[lo] !== " ") lo = sp;
  else if (sp <= 0 && t[lo] !== " " && lo < 5) return ""; // a short piece of one word could read as another word
  return lo > 0 ? t.slice(0, lo).replace(/[\s,.;:–-]+$/, "") + "…" : "";
}
const plain = (v) => (v instanceof FormulaError ? v.code : v);

function condTest(rule, v) {
  const x = plain(v), num = (t) => (t === "" || t == null ? NaN : Number(t));
  const a = num(rule.v1), b = num(rule.v2), isN = typeof x === "number";
  const txt = x == null ? "" : String(x).toLowerCase(), want = String(rule.v1 ?? "").toLowerCase();
  switch (rule.op) {
    case "gt": return isN && x > a; case "lt": return isN && x < a; case "ge": return isN && x >= a; case "le": return isN && x <= a;
    case "between": return isN && x >= Math.min(a, b) && x <= Math.max(a, b); case "notBetween": return isN && (x < Math.min(a, b) || x > Math.max(a, b));
    case "eq": return isN ? x === a : txt === want; case "ne": return isN ? x !== a : txt !== want;
    case "contains": case "textContains": return x != null && txt.includes(want); case "notContains": return x != null && !txt.includes(want);
    case "startsWith": return x != null && txt.startsWith(want); case "endsWith": return x != null && txt.endsWith(want);
    case "textIs": return txt === want; case "empty": return x == null || x === ""; case "notEmpty": return !(x == null || x === "");
    default: return false;
  }
}
const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "")); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const mix = (a, b, t) => { const x = hex(a), y = hex(b); if (!x || !y) return a; return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

/** Values and geometry of one sheet of a built template. */
export function sheetModel(book, index = 0) {
  const wb = Workbook.fromJSON({ sheets: book.sheets.map((s) => ({ name: s.name, cells: s.cells || {} })) }, { now: NOW, random: () => 0.5 });
  const src = book.sheets[index], s = wb.sheets[index];
  const get = (r, c) => wb.getValue(s, r, c);
  const st = new Map();
  for (const [ref, style] of Object.entries(src.styles || {})) { const p = parseCellName(ref); if (p) st.set(p.row * 1024 + p.col, style); }
  let maxR = 0, maxC = 0;
  for (const ref of [...Object.keys(src.cells || {}), ...Object.keys(src.styles || {})]) { const p = parseCellName(ref); if (p) { maxR = Math.max(maxR, p.row); maxC = Math.max(maxC, p.col); } }
  const colX = [0], rowY = [0];
  for (let c = 0; c <= Math.max(maxC + 8, 30); c++) colX.push(colX[c] + (+(src.colW || {})[c] || DEF_W));
  for (let r = 0; r <= Math.max(maxR + 12, 60); r++) rowY.push(rowY[r] + (+(src.rowH || {})[r] || DEF_H));
  return { src, wb, s, get, st, maxR, maxC, colX, rowY, styleAt: (r, c) => st.get(r * 1024 + c) };
}

/** Labels + series for a chart spec (same rules as the app). */
function chartSource(M, ch) {
  if (ch.data) return ch.data;
  let rows = [];
  if (ch.cols) {
    for (let r = ch.r1; r <= ch.r2; r++) rows.push(ch.cols.map((c, j) => { const v = M.get(r, c); return j === 0 && !ch.noLabels && v !== null && r > ch.r1 ? displayText(v, M.styleAt(r, c)) : v; }));
    if (ch.noLabels) rows = rows.map((r, i) => [i === 0 ? "" : String(i), ...r]);
  } else {
    const p = parseRangeName(ch.range || "");
    if (!p) return { labels: [], series: [] };
    for (let r = p.r1; r <= p.r2; r++) { const row = []; for (let c = p.c1; c <= p.c2; c++) { const v = M.get(r, c); row.push(c === p.c1 && p.c2 > p.c1 && v !== null && (r > p.r1 || typeof v === "number") ? displayText(v, M.styleAt(r, c)) : plain(v)); } rows.push(row); }
  }
  return chartData(rows.map((r) => r.map(plain)));
}
const DEF_PAL = ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#2f80ff", "#a64bf4"];
const shortNum = (v) => { const a = Math.abs(v); return a >= 1e9 ? +(v / 1e9).toFixed(1) + "B" : a >= 1e6 ? +(v / 1e6).toFixed(1) + "M" : a >= 1e3 ? +(v / 1e3).toFixed(1) + "K" : String(+(+v).toFixed(1)); };

/** A chart card (white, rounded, soft shadow) with the chart drawn in the template's own colours. */
export function chartCard(d, ch, x, y, w, h, uid, k = 1) {
  const pal = ch.colors?.length ? ch.colors : DEF_PAL, out = [];
  out.push(`<rect x="${n1(x + 1.5 * k)}" y="${n1(y + 2.5 * k)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(10 * k)}" fill="#0f172a" opacity=".08"/>`);
  out.push(`<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(10 * k)}" fill="#ffffff" stroke="#e6e8f0" stroke-width="${n1(k)}"/>`);
  const fs = 13 * k;
  let top = y + 12 * k;
  if (ch.title) { out.push(`<text x="${n1(x + 14 * k)}" y="${n1(y + 24 * k)}" font-family="${FONT}" font-size="${n1(fs)}" font-weight="700" fill="#1b2133">${esc(fit(ch.title, w - 28 * k, fs, true))}</text>`); top = y + 36 * k; }
  if (!d.labels.length || !d.series.length) return out.join("");
  const S2 = d.series.slice(0, 4), L = d.labels, n = L.length, kind = ch.kind || "bar";
  const legend = S2.length > 1 && kind !== "pie" && kind !== "donut";
  const left = x + 16 * k, right = x + w - 14 * k, bottom = y + h - (legend ? 40 : 24) * k;
  if (legend) S2.forEach((s, i) => { const lx = left + i * Math.min(130 * k, (right - left) / S2.length); out.push(`<rect x="${n1(lx)}" y="${n1(y + h - 17 * k)}" width="${n1(9 * k)}" height="${n1(9 * k)}" rx="${n1(2 * k)}" fill="${pal[i % pal.length]}"/><text x="${n1(lx + 13 * k)}" y="${n1(y + h - 9 * k)}" font-family="${FONT}" font-size="${n1(10.5 * k)}" fill="#475569">${esc(fit(s.name, 100 * k, 10.5 * k))}</text>`); });
  if (kind === "pie" || kind === "donut") {
    const vals = S2[0].values.map((v) => Math.max(0, +v || 0)), sum = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = x + w * 0.36, cy = (top + y + h - 10 * k) / 2, r = Math.min(w * 0.3, (y + h - top - 16 * k) / 2);
    let a = -Math.PI / 2;
    vals.forEach((v, i) => {
      const b = a + (v / sum) * Math.PI * 2, large = b - a > Math.PI ? 1 : 0;
      if (v > 0) out.push(`<path d="M${n1(cx)} ${n1(cy)}L${n1(cx + r * Math.cos(a))} ${n1(cy + r * Math.sin(a))}A${n1(r)} ${n1(r)} 0 ${large} 1 ${n1(cx + r * Math.cos(b))} ${n1(cy + r * Math.sin(b))}Z" fill="${pal[i % pal.length]}" stroke="#fff" stroke-width="${n1(1.5 * k)}"/>`);
      a = b;
    });
    if (kind === "donut") out.push(`<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r * 0.56)}" fill="#fff"/>`);
    const lx = x + w * 0.7, items = L.slice(0, 6);
    items.forEach((t, i) => { const ly = cy - (items.length * 15 * k) / 2 + i * 15 * k + 10 * k; out.push(`<rect x="${n1(lx - 12 * k)}" y="${n1(ly - 8 * k)}" width="${n1(8 * k)}" height="${n1(8 * k)}" rx="${n1(2 * k)}" fill="${pal[i % pal.length]}"/><text x="${n1(lx)}" y="${n1(ly)}" font-family="${FONT}" font-size="${n1(10 * k)}" fill="#475569">${esc(fit(t, x + w - lx - 6 * k, 10 * k))}</text>`); });
    return out.join("");
  }
  const all = S2.flatMap((s) => s.values.map((v) => +v || 0));
  const stacked = kind === "stacked";
  const tops = L.map((_, i) => (stacked ? S2.reduce((a, s) => a + Math.max(0, +s.values[i] || 0), 0) : Math.max(0, ...S2.map((s) => +s.values[i] || 0))));
  const max = Math.max(1e-9, ...tops, ...all) * 1.08, Y = (v) => bottom - ((bottom - top) * Math.max(0, v)) / max;
  for (let g = 0; g <= 3; g++) { const gy = Y((max * g) / 3); out.push(`<line x1="${n1(left)}" x2="${n1(right)}" y1="${n1(gy)}" y2="${n1(gy)}" stroke="#eef0f5" stroke-width="${n1(k)}"/>`); }
  const slot = (right - left) / Math.max(1, n), every = Math.ceil(n / Math.max(1, Math.floor((right - left) / (40 * k))));
  L.forEach((t, i) => { if (i % every === 0) out.push(`<text x="${n1(left + slot * (i + 0.5))}" y="${n1(bottom + 13 * k)}" text-anchor="middle" font-family="${FONT}" font-size="${n1(9.5 * k)}" fill="#64748b">${esc(fit(t, slot * every - 2 * k, 9.5 * k))}</text>`); });
  if (kind === "hbar") {
    const sl = (bottom - top) / Math.max(1, n), bh = Math.max(2, (sl * 0.66) / S2.length), lw = Math.min(90 * k, (right - left) * 0.36);
    out.length -= L.filter((_, i) => i % every === 0).length; // no column labels under horizontal bars
    const mx = Math.max(1e-9, ...all) * 1.05;
    L.forEach((t, i) => {
      const y0 = top + i * sl + sl * 0.17;
      out.push(`<text x="${n1(left + lw - 4 * k)}" y="${n1(y0 + (bh * S2.length) / 2 + 3.5 * k)}" text-anchor="end" font-family="${FONT}" font-size="${n1(9.5 * k)}" fill="#475569">${esc(fit(t, lw - 6 * k, 9.5 * k))}</text>`);
      S2.forEach((s, j) => out.push(`<rect x="${n1(left + lw)}" y="${n1(y0 + j * bh)}" width="${n1(((right - left - lw) * Math.max(0, +s.values[i] || 0)) / mx)}" height="${n1(bh - 0.8 * k)}" rx="${n1(2 * k)}" fill="${pal[j % pal.length]}"/>`));
    });
  } else if (kind === "line" || kind === "area" || kind === "scatter") {
    S2.forEach((s, j) => {
      const pts = s.values.map((v, i) => [n1(left + slot * (i + 0.5)), n1(Y(+v || 0))]);
      if (!pts.length) return;
      const col = pal[j % pal.length];
      if (kind === "scatter") { pts.forEach((p) => out.push(`<circle cx="${p[0]}" cy="${p[1]}" r="${n1(3.2 * k)}" fill="${col}" fill-opacity=".85"/>`)); return; }
      if (kind === "area" || S2.length === 1) out.push(`<path d="M${pts[0][0]} ${n1(bottom)}L${pts.map((p) => p.join(" ")).join("L")}L${pts[pts.length - 1][0]} ${n1(bottom)}Z" fill="${col}" fill-opacity="${kind === "area" ? 0.32 : 0.14}"/>`);
      out.push(`<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${col}" stroke-width="${n1(2.2 * k)}" stroke-linejoin="round" stroke-linecap="round"/>`);
      if (n <= 14) pts.forEach((p) => out.push(`<circle cx="${p[0]}" cy="${p[1]}" r="${n1(2.2 * k)}" fill="#fff" stroke="${col}" stroke-width="${n1(1.4 * k)}"/>`));
    });
  } else {
    L.forEach((_, i) => {
      if (stacked) { let acc = 0; S2.forEach((s, j) => { const v = Math.max(0, +s.values[i] || 0), y1 = Y(acc), y2 = Y(acc + v); out.push(`<rect x="${n1(left + slot * i + slot * 0.2)}" y="${n1(y2)}" width="${n1(slot * 0.6)}" height="${n1(Math.max(0, y1 - y2))}" fill="${pal[j % pal.length]}"/>`); acc += v; }); return; }
      const bw = (slot * 0.68) / S2.length;
      S2.forEach((s, j) => { const v = Math.max(0, +s.values[i] || 0), yy = Y(v); out.push(`<rect x="${n1(left + slot * i + slot * 0.16 + j * bw)}" y="${n1(yy)}" width="${n1(Math.max(1, bw - 1 * k))}" height="${n1(Math.max(0, bottom - yy))}" rx="${n1(Math.min(3 * k, bw / 3))}" fill="${pal[j % pal.length]}"/>`); });
    });
  }
  out.push(`<line x1="${n1(left)}" x2="${n1(right)}" y1="${n1(bottom)}" y2="${n1(bottom)}" stroke="#cbd5e1" stroke-width="${n1(k)}"/>`);
  return out.join("");
}

/**
 * SVG picture of one sheet of a built template. opts: { uid (unique id prefix), width, height, view (source px width
 * shown), photo(url) → href for in-cell images, badge (text shown bottom-right, e.g. "1 of 2") }.
 */
export function sheetSvg(book, opts = {}) {
  const W = opts.width || 320, H = opts.height || 200, uid = opts.uid || "s";
  const M = opts.model || sheetModel(book, opts.index || 0), { src, get, colX, rowY } = M;
  const view = opts.view || Math.max(640, Math.min(820, colX[M.maxC + 1] || 760)), k = W / view, VH = H / k;
  // Title banner: merged rows at the top from column A (the kit's title + subtitle). Drawn across the whole picture.
  const bannerRows = (src.merges || []).filter((g) => g.c1 === 0 && g.r1 <= 1 && g.r1 === g.r2 && M.styleAt(g.r1, 0)?.fill).map((g) => g.r1);
  const bLast = opts.banner === false || !bannerRows.includes(0) ? -1 : Math.max(...bannerRows);
  const lastC = colX.findIndex((x) => x >= view), lastR = rowY.findIndex((y) => y >= VH);
  const C2 = lastC < 0 ? colX.length - 2 : lastC, R2 = lastR < 0 ? rowY.length - 2 : lastR;
  const merges = (src.merges || []).filter((g) => g.r1 <= R2 && g.c1 <= C2);
  const covered = new Set(), mergeAt = new Map();
  for (const g of merges) { mergeAt.set(g.r1 * 1024 + g.c1, g); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) if (r !== g.r1 || c !== g.c1) covered.add(r * 1024 + c); }
  const dds = (src.dropdowns || []).map((d) => ({ ...d, box: parseRangeName(d.range) })).filter((d) => d.box);
  const cfs = (src.cf || []).map((x) => ({ ...x, box: parseRangeName(x.range) })).filter((x) => x.box);
  const scales = new Map();
  const cfStyle = (r, c, v) => {
    let out = null;
    for (const x of cfs) {
      const b = x.box; if (r < b.r1 || r > b.r2 || c < b.c1 || c > b.c2) continue;
      if (x.op === "scale") {
        if (typeof plain(v) !== "number") continue;
        let mm = scales.get(x);
        if (!mm) { let lo = Infinity, hi = -Infinity; for (let rr = b.r1; rr <= Math.min(b.r2, b.r1 + 400); rr++) for (let cc = b.c1; cc <= Math.min(b.c2, b.c1 + 60); cc++) { const y = plain(get(rr, cc)); if (typeof y === "number") { lo = Math.min(lo, y); hi = Math.max(hi, y); } } mm = { lo, hi }; scales.set(x, mm); }
        const t = mm.hi > mm.lo ? (v - mm.lo) / (mm.hi - mm.lo) : 1;
        out = { ...(out || {}), fill: mix(x.min || "#ffffff", x.max || "#57bb8a", t) };
        continue;
      }
      if (condTest(x, v)) out = { ...(out || {}), ...x.style };
    }
    return out;
  };
  const fills = [], grid = [], borders = [], texts = [], extras = [];
  const X = (x) => n1(x * k), Yp = (y) => n1(y * k);
  const rect = (r1, c1, r2, c2) => ({ x: colX[c1], y: rowY[r1], w: colX[c2 + 1] - colX[c1], h: rowY[r2 + 1] - rowY[r1] });
  const images = src.images || {};
  for (let r = bLast + 1; r <= R2; r++) {
    for (let c = 0; c <= C2; c++) {
      const key = r * 1024 + c;
      if (covered.has(key)) continue;
      const g = mergeAt.get(key), q = g ? rect(g.r1, g.c1, g.r2, g.c2) : rect(r, c, r, c);
      if (q.x >= view || q.y >= VH) continue;
      const v = get(r, c);
      let stl = M.styleAt(r, c) || null;
      const cf = cfStyle(r, c, v);
      if (cf) stl = { ...(stl || {}), ...cf };
      if (stl?.fill) fills.push(`<rect x="${X(q.x)}" y="${Yp(q.y)}" width="${n1(q.w * k + 0.3)}" height="${n1(q.h * k + 0.3)}" fill="${stl.fill}"/>`);
      if (!src.noGrid && !stl?.fill) grid.push(`M${X(q.x + q.w)} ${Yp(q.y)}v${n1(q.h * k)}M${X(q.x)} ${Yp(q.y + q.h)}h${n1(q.w * k)}`);
      if (stl?.bd) {
        const col = stl.bc || "#334155", sw = n1((stl.bs === "thick" ? 2.2 : 1) * k * 1.2), dash = stl.bs === "dashed" ? ` stroke-dasharray="${n1(4 * k)} ${n1(3 * k)}"` : stl.bs === "dotted" ? ` stroke-dasharray="${n1(1.2 * k)} ${n1(2 * k)}"` : "";
        let d = "";
        if (stl.bd.includes("t")) d += `M${X(q.x)} ${Yp(q.y)}h${n1(q.w * k)}`;
        if (stl.bd.includes("b")) d += `M${X(q.x)} ${Yp(q.y + q.h)}h${n1(q.w * k)}`;
        if (stl.bd.includes("l")) d += `M${X(q.x)} ${Yp(q.y)}v${n1(q.h * k)}`;
        if (stl.bd.includes("r")) d += `M${X(q.x + q.w)} ${Yp(q.y)}v${n1(q.h * k)}`;
        if (d) borders.push(`<path d="${d}" stroke="${col}" stroke-width="${sw}"${dash} fill="none"/>`);
      }
      const ref = String.fromCharCode(65 + c) + (r + 1);
      const img = c < 26 ? images[ref] : null;
      if (img) {
        const href = opts.photo ? opts.photo(img) : img;
        const pad = stl?.fit === "cover" ? 0 : 2;
        const cid = `${uid}-ic${r}-${c}`, ix = (q.x + pad) * k, iy = (q.y + pad) * k, iw = (q.w - pad * 2) * k, ih = (q.h - pad * 2) * k;
        extras.push(`<clipPath id="${cid}"><rect x="${X(q.x + pad)}" y="${Yp(q.y + pad)}" width="${n1(iw)}" height="${n1(ih)}" rx="${n1((stl?.rad || 0) * k)}"/></clipPath>` +
          (stl?.fit === "cover" ? coverImage(href, img, stl.pos, ix, iy, iw, ih, cid) : `<image href="${esc(href)}" x="${X(q.x + pad)}" y="${Yp(q.y + pad)}" width="${n1(iw)}" height="${n1(ih)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${cid})"/>`));
      }
      if (v === null || v === undefined || v === "") continue;
      let text = v instanceof FormulaError ? v.code : displayText(v, stl);
      if (stl?.list && text) text = "• " + text;
      if (!text) continue;
      const size = (stl?.size || 13), fs = size * k, bold = !!stl?.b;
      const align = stl?.align || (typeof v === "number" ? "right" : typeof v === "boolean" || v instanceof FormulaError ? "center" : "left");
      // overflow into empty, unfilled neighbours (like the grid)
      let w = q.w;
      if (!g && align === "left" && typeof v === "string") { let cc = c + 1; while (textW(text, size, bold) + 10 > w && cc <= C2 + 6 && (get(r, cc) === null) && !M.styleAt(r, cc)?.fill && !covered.has(r * 1024 + cc)) { w += colX[cc + 1] - colX[cc]; cc++; } }
      const dd = dds.find((d) => r >= d.box.r1 && r <= d.box.r2 && c >= d.box.c1 && c <= d.box.c2);
      const opt = dd && dd.options.find((o) => o.label === text);
      const lines = stl?.wrap ? wrapText(text, w - 10, size, bold).slice(0, Math.max(1, Math.floor((q.h - 4) / (size * 1.3)))) : [fit(text, w - 10, size, bold)];
      const color = stl?.color || "#1b2133", lh = size * 1.3;
      if (opt) {
        const tw = Math.min(w - 10, textW(lines[0], size * 0.92, true) + 18), px = align === "right" ? q.x + w - 5 - tw : align === "center" ? q.x + (w - tw) / 2 : q.x + 5, ph = Math.min(q.h - 6, size * 1.5);
        texts.push(`<rect x="${X(px)}" y="${Yp(q.y + (q.h - ph) / 2)}" width="${n1(tw * k)}" height="${n1(ph * k)}" rx="${n1((ph / 2) * k)}" fill="${opt.color}"/>`);
        texts.push(`<text x="${X(px + tw / 2)}" y="${Yp(q.y + q.h / 2 + size * 0.34)}" text-anchor="middle" font-family="${FONT}" font-size="${n1(fs * 0.92)}" font-weight="600" fill="#1b2133">${esc(fit(lines[0], tw - 10, size * 0.92, true))}</text>`);
        continue;
      }
      const tx = align === "right" ? q.x + w - 5 : align === "center" ? q.x + w / 2 : q.x + 5;
      const anchor = align === "right" ? ' text-anchor="end"' : align === "center" ? ' text-anchor="middle"' : "";
      const va = stl?.wrap ? "top" : stl?.valign || "bottom";
      const y0 = va === "top" ? q.y + 3 + size * 0.95 : va === "middle" ? q.y + q.h / 2 + size * 0.35 - ((lines.length - 1) * lh) / 2 : q.y + q.h - 4 - size * 0.22 - (lines.length - 1) * lh;
      const deco = `${bold ? ' font-weight="700"' : ""}${stl?.i ? ' font-style="italic"' : ""}${stl?.u || stl?.link ? ' text-decoration="underline"' : ""}`;
      const ff = stl?.font === "serif" || stl?.font === "cambria" ? "Georgia,'Times New Roman',serif" : FONT;
      lines.forEach((ln, i) => texts.push(`<text x="${X(tx)}" y="${Yp(y0 + i * lh)}"${anchor} font-family="${ff}" font-size="${n1(fs)}"${deco} fill="${stl?.link ? "#1d4ed8" : color}">${esc(ln)}</text>`));
    }
  }
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"${opts.label ? ` aria-label="${esc(opts.label)}"` : ""}>`, `<rect width="${W}" height="${H}" fill="#ffffff"/>`];
  out.push(...fills);
  if (grid.length) out.push(`<path d="${grid.join("")}" stroke="#edf0f6" stroke-width="${n1(Math.max(0.35, k))}" fill="none"/>`);
  out.push(...extras, ...borders, ...texts);
  const bh = bLast >= 0 ? rowY[bLast + 1] * k : 0;
  if (bLast >= 0) out.push(bannerSvg(M, bLast, W, bh, k, uid, opts.photo));
  // charts: the first one or two that sit inside the picture; else the first chart docked at the right edge, on a
  // white backdrop so it never covers table text.
  const charts = src.charts || [];
  const at = (ch) => { const p = parseCellName(ch.at || "A1") || { row: 0, col: 0 }; return { x: colX[p.col] + 6, y: rowY[p.row] + 6 }; };
  let shown = 0;
  for (const ch of charts) {
    const p = at(ch);
    if (p.x + (ch.w || 440) * 0.55 > view || p.y >= VH - 60) continue;
    out.push(chartCard(chartSource(M, ch), ch, p.x * k, p.y * k, (ch.w || 440) * k, (ch.h || 280) * k, uid + "c" + shown, k));
    if (++shown >= 2) break;
  }
  if (opts.card) {
    // Magic Formulas: a formula card at the right (white backdrop, so it never covers table text)
    const cx = W * 0.585, cw = W - cx - 8, top = bh + 8;
    out.push(`<rect x="${n1(cx - 8)}" y="${n1(bh)}" width="${n1(W - cx + 8)}" height="${n1(H - bh)}" fill="#ffffff"/>`);
    const v = M.get(opts.card.r, opts.card.c);
    out.push(formulaCardSvg(opts.card, v === null || v === undefined ? "" : v instanceof FormulaError ? v.code : displayText(v, M.styleAt(opts.card.r, opts.card.c)), cx, top, cw, H - top - 8));
  } else if (!shown && charts.length && opts.dock !== false) {
    const ch = charts[0], cw = W * 0.42, top = bh + 8, chh = Math.min(H - top - 8, cw * ((ch.h || 280) / (ch.w || 440)) * 1.05);
    out.push(`<rect x="${n1(W - cw - 16)}" y="${n1(bh)}" width="${n1(cw + 16)}" height="${n1(H - bh)}" fill="#ffffff"/>`);
    out.push(chartCard(chartSource(M, ch), ch, W - cw - 8, top, cw, chh, uid + "cd", Math.min(0.62, cw / (ch.w || 440) * 1.35)));
  }
  if (opts.badge) out.push(`<rect x="${W - 52}" y="${H - 24}" width="44" height="17" rx="8.5" fill="#1b2133" opacity=".78"/><text x="${W - 30}" y="${H - 12}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" fill="#fff">${esc(opts.badge)}</text>`);
  out.push("</svg>");
  return out.join("");
}
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
/** Formula split into lines of at most `max` characters, only at token boundaries (after "(" or ","), "…" when cut. */
function formulaLines(f, max, lines) {
  const toks = String(f).match(/"[^"]*"[,)]*|[^(),"]+[(),]*|[(),]+/g) || [String(f)];
  const out = [""];
  for (const tk of toks) {
    if ((out[out.length - 1] + tk).length <= max) { out[out.length - 1] += tk; continue; }
    if (out.length === lines) { const cur = out[out.length - 1]; out[out.length - 1] = (cur.length >= max ? cur.slice(0, max - 1) : cur) + "…"; return out; }
    out.push(tk.length > max ? tk.slice(0, max - 1) + "…" : tk);
  }
  return out;
}
/** A Canva-style feature tile in the starter's colours: label, the formula, an arrow and the worked-out result. */
export function formulaCardSvg(card, result, x, y, w, h) {
  const C = card.colors || { band: "#5b4cf0", head: "#ece9ff", ink: "#2a2373" }, out = [];
  const px = x + 9, iw = w - 18, fs = 8.4, lh = fs * 1.32, per = Math.max(8, Math.floor(iw / (fs * 0.63)));
  const SAFE = 1.12, tw = iw / SAFE; // room for fonts wider than our estimate
  const fl = formulaLines(card.formula, per, 3);
  let rs = 21;
  const rw = textW(result, rs, true) * SAFE * 1.04; // weight 800
  if (rw > iw) rs = Math.max(9, (rs * iw) / rw);
  const rFit = fit(result, tw / 1.04, rs, true), rEst = textW(rFit, rs, true) * 1.04;
  const ex = wrapText(card.explain || "", tw, 6.6, false), exl = ex.slice(0, 2).map((l) => fit(l, tw, 6.6, false));
  if (ex.length > 2) exl[1] = fit(ex.slice(1).join(" "), tw, 6.6, false);
  // content height → the card fits its content and sits in the middle of the free space
  const ch = Math.min(h, 17 + 12 + (fl.length - 1) * lh + 12 + 8 + rs * 0.95 + 13 + (exl.length - 1) * 8.6 + 9);
  const y0 = y + (h - ch) / 2;
  out.push(`<rect x="${n1(x + 1)}" y="${n1(y0 + 2)}" width="${n1(w)}" height="${n1(ch)}" rx="9" fill="#0f172a" opacity=".07"/>`);
  out.push(`<rect x="${n1(x)}" y="${n1(y0)}" width="${n1(w)}" height="${n1(ch)}" rx="9" fill="${C.head}"/>`);
  out.push(`<rect x="${n1(x)}" y="${n1(y0)}" width="${n1(w)}" height="4" rx="2" fill="${C.band}"/>`);
  let yy = y0 + 17;
  out.push(`<text x="${n1(px)}" y="${n1(yy)}" font-family="${FONT}" font-size="7" font-weight="800" letter-spacing=".9" fill="${C.ink}">FORMULA</text>`);
  yy += 12;
  out.push(`<rect x="${n1(px - 3)}" y="${n1(yy - fs - 1)}" width="${n1(iw + 6)}" height="${n1(fl.length * lh + 5)}" rx="4" fill="#ffffff"/>`);
  fl.forEach((ln, i) => out.push(`<text x="${n1(px)}" y="${n1(yy + i * lh)}" font-family="${MONO}" font-size="${fs}" font-weight="700" fill="#1b2133">${esc(ln)}</text>`));
  yy += (fl.length - 1) * lh + 12;
  out.push(`<path d="M${n1(px + 4)} ${n1(yy - 4)}v9m-3.5 -3.5l3.5 3.5l3.5 -3.5" stroke="${C.band}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  out.push(`<text x="${n1(px + 13)}" y="${n1(yy + 3.5)}" font-family="${FONT}" font-size="7" font-weight="700" fill="${C.ink}">${esc(fit(card.label, (iw - 14) / SAFE, 7, true))}</text>`);
  yy += 8 + rs * 0.95;
  out.push(`<text x="${n1(px)}" y="${n1(yy)}" font-family="${FONT}" font-size="${n1(rs)}" font-weight="800" fill="${C.band}"${rEst > iw * 0.72 ? ` textLength="${n1(Math.min(rEst, iw))}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(rFit)}</text>`);
  yy += 13;
  exl.forEach((ln, i) => out.push(`<text x="${n1(px)}" y="${n1(yy + i * 8.6)}" font-family="${FONT}" font-size="6.6" fill="#475569">${esc(ln)}</text>`));
  return out.join("");
}
/** The title banner across the whole picture: title, subtitle, accent rule and the photo tile docked at the right. */
function bannerSvg(M, bLast, W, bh, k, uid, photoFn) {
  const a1 = M.styleAt(0, 0) || {}, fill = a1.fill || "#4f46e5", out = [];
  out.push(`<rect width="${W}" height="${n1(bh)}" fill="${fill}"/>`);
  out.push(`<circle cx="${n1(W * 0.62)}" cy="${n1(bh * 1.05)}" r="${n1(bh * 0.9)}" fill="#ffffff" opacity=".07"/><circle cx="${n1(W * 0.5)}" cy="${n1(-bh * 0.3)}" r="${n1(bh * 0.55)}" fill="#ffffff" opacity=".06"/>`);
  let img = null, pos = null;
  for (const [ref, src] of Object.entries(M.src.images || {})) { const p = parseCellName(ref); if (p && p.row <= bLast) { img = src; pos = M.styleAt(p.row, p.col)?.pos || null; break; } }
  let pw = 0;
  if (img) {
    pw = Math.min(W * 0.34, bh * 2.1);
    const href = photoFn ? photoFn(img) : img;
    out.push(`<defs><linearGradient id="${uid}-bf" x1="0" x2="1"><stop offset="0" stop-color="${fill}"/><stop offset=".38" stop-color="${fill}" stop-opacity="0"/></linearGradient><clipPath id="${uid}-bc"><rect x="${n1(W - pw)}" y="0" width="${n1(pw)}" height="${n1(bh)}"/></clipPath></defs>`);
    out.push(coverImage(href, img, pos, W - pw, 0, pw, bh, `${uid}-bc`));
    out.push(`<rect x="${n1(W - pw - 1)}" y="0" width="${n1(pw + 1)}" height="${n1(bh)}" fill="url(#${uid}-bf)"/>`);
  }
  const t0 = M.get(0, 0), h0 = M.rowY[1] * k, max = W - pw - 22;
  let size = (a1.size || 26) * k * 1.12;
  const need = textW(t0 == null ? "" : String(t0), size, true);
  if (need > max) size = Math.max(size * 0.7, (size * max) / need); // long titles get a little smaller before they are cut
  const title = fit(t0 == null ? "" : String(t0), max, size, true);
  const serif = a1.font === "serif" || a1.font === "cambria";
  out.push(`<text x="12" y="${n1(h0 / 2 + size * 0.36)}" font-family="${serif ? "Georgia,'Times New Roman',serif" : FONT}" font-size="${n1(serif ? size * 1.08 : size)}" font-weight="${serif ? 700 : 800}" fill="${a1.color || "#ffffff"}">${esc(title)}</text>`);
  if (bLast >= 1) {
    const a2 = M.styleAt(1, 0) || {}, t1 = M.get(1, 0), s2 = Math.max(6.2, (a2.size || 12) * k * 1.12);
    if (t1 != null && t1 !== "") out.push(`<text x="12.5" y="${n1(h0 + s2 * 1.25)}" font-family="${FONT}" font-size="${n1(s2)}" fill="${a2.color || "#ffffff"}">${esc(fit(String(t1), max, s2, false))}</text>`);
  }
  const rule = M.styleAt(bLast, 0) || {};
  if (rule.bd?.includes("b")) out.push(`<rect x="0" y="${n1(bh - 2.2)}" width="${W}" height="2.2" fill="${rule.bc || "#000"}"/>`);
  return out.join("");
}
function wrapText(t, max, size, bold) {
  const out = [];
  for (const para of String(t).split("\n")) {
    let line = "";
    for (const w of para.split(" ")) { const tryL = line ? line + " " + w : w; if (textW(tryL, size, bold) <= max || !line) line = tryL; else { out.push(line); line = w; } }
    out.push(line);
  }
  return out;
}
