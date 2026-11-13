// Elements kit: shared SVG builders (pure functions, no DOM). Every picture here is our own geometry.
//   shapeSvg(spec, px)  frameSvg(spec, px)  gridSvg(spec, px)  chartSvg(spec, px)  tableSvg(spec, px)
//   svgDoc(w, h, body, {px, defs})  placeholderArt(x, y, w, h, id)  uniqIds(markup)  + path helpers
// Specs follow the insert interface in panels/index.js (sizes relative, colours "#rrggbb").
import { esc, svgToDataUrl } from "./insert.js";
export { esc, svgToDataUrl };

export const INK = "#262b3d";
export const FONT = "Arial, Helvetica, sans-serif";
export const PALETTE = ["#5b4cf0", "#14b8a6", "#ff7a59", "#f59e0b", "#2f80ff", "#ec4899", "#22c55e", "#8b5cf6"];
const RAD = Math.PI / 180;
export const n = (v) => { const r = Math.round(v * 100) / 100; return String(Object.is(r, -0) ? 0 : r); };
export const ptsPath = (pts, close = true) => "M" + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L") + (close ? "Z" : "");
export const regPoly = (sides, cx, cy, r, rot = -90) => Array.from({ length: sides }, (_, i) => { const a = (rot + (i * 360) / sides) * RAD; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
export const starPts = (k, cx, cy, R, r, rot = -90) => Array.from({ length: 2 * k }, (_, i) => { const a = (rot + (i * 180) / k) * RAD, q = i % 2 ? r : R; return [cx + q * Math.cos(a), cy + q * Math.sin(a)]; });
export function rrect(x, y, w, h, r = 0) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
  return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`;
}
export const ell = (cx, cy, rx, ry = rx) => `M${n(cx - rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 1 ${n(cx + rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 1 ${n(cx - rx)} ${n(cy)}Z`;
// Same circle drawn the other way round: a hole under the nonzero fill rule.
export const ellRev = (cx, cy, rx, ry = rx) => `M${n(cx - rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)}Z`;
export function heartD(x, y, w, h) {
  const X = (v) => n(x + v * w), Y = (v) => n(y + v * h);
  return `M${X(0.5)} ${Y(0.22)}C${X(0.38)} ${Y(-0.02)} ${X(0)} ${Y(0.02)} ${X(0)} ${Y(0.32)}C${X(0)} ${Y(0.56)} ${X(0.25)} ${Y(0.76)} ${X(0.5)} ${Y(1)}C${X(0.75)} ${Y(0.76)} ${X(1)} ${Y(0.56)} ${X(1)} ${Y(0.32)}C${X(1)} ${Y(0.02)} ${X(0.62)} ${Y(-0.02)} ${X(0.5)} ${Y(0.22)}Z`;
}
export function blobD(cx, cy, r, seed = 3, k = 7) {
  const pts = Array.from({ length: k }, (_, i) => { const a = (i * 360) / k * RAD, q = r * (0.82 + 0.18 * Math.sin(i * seed + seed)); return [cx + q * Math.cos(a), cy + q * Math.sin(a)]; });
  let d = "";
  for (let i = 0; i < k; i++) {
    const p0 = pts[(i - 1 + k) % k], p1 = pts[i], p2 = pts[(i + 1) % k], p3 = pts[(i + 2) % k];
    if (!i) d += `M${n(p1[0])} ${n(p1[1])}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + "Z";
}

let UID = 0;
export const uid = (p = "k") => `${p}${(++UID).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/** Fresh ids for every id="…" in the markup (and its url(#…) / href="#…" uses), so two inserted copies never clash. */
export function uniqIds(markup) {
  const ids = [...String(markup).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  if (!ids.length) return markup;
  const s = "-" + uid("u");
  let out = markup;
  for (const id of new Set(ids)) {
    const q = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`id="${q}"`, "g"), `id="${id}${s}"`).replace(new RegExp(`url\\(#${q}\\)`, "g"), `url(#${id}${s})`).replace(new RegExp(`href="#${q}"`, "g"), `href="#${id}${s}"`);
  }
  return out;
}

/** A complete SVG document of viewBox w × h, sized so its longer side is px. */
export function svgDoc(w, h, body, { px = 240, defs = "" } = {}) {
  const s = px / Math.max(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" width="${n(w * s)}" height="${n(h * s)}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
}
const dashOf = (dash, sw) => (dash === "dashed" ? ` stroke-dasharray="${n(sw * 3)} ${n(sw * 2)}"` : dash === "dotted" ? ` stroke-dasharray="0.01 ${n(sw * 2)}"` : typeof dash === "string" && /\d/.test(dash) ? ` stroke-dasharray="${esc(dash)}"` : "");

/** The empty-frame placeholder picture (our own: soft sky, sun, cloud, two hills) in the box x, y, w, h. */
export function placeholderArt(x, y, w, h, id = "ph") {
  const m = Math.min(w, h);
  const defs = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ff"/><stop offset="1" stop-color="#f1ecff"/></linearGradient>`;
  const X = (v) => n(x + v * w), Y = (v) => n(y + v * h);
  const cloud = (cx, cy, s) => `<path d="${ell(cx, cy, s * 1.1, s * 0.62)}${ell(cx - s * 0.9, cy + s * 0.18, s * 0.7, s * 0.45)}${ell(cx + s * 0.95, cy + s * 0.2, s * 0.75, s * 0.45)}" fill="#fff"/>`;
  const body = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="url(#${id}s)"/>` +
    `<circle cx="${X(0.76)}" cy="${Y(0.3)}" r="${n(m * 0.1)}" fill="#ffd36b"/>` + cloud(x + w * 0.34, y + h * 0.3, m * 0.09) +
    `<path d="M${X(0)} ${Y(0.7)}Q${X(0.3)} ${Y(0.5)} ${X(0.58)} ${Y(0.68)}T${X(1)} ${Y(0.62)}V${Y(1)}H${X(0)}Z" fill="#a7dcc9"/>` +
    `<path d="M${X(0)} ${Y(0.86)}Q${X(0.38)} ${Y(0.66)} ${X(0.72)} ${Y(0.82)}T${X(1)} ${Y(0.78)}V${Y(1)}H${X(0)}Z" fill="#4fb294"/>`;
  return { defs, body };
}

// ---------- shapes
/** Shape spec {kind, d, vb, fill, stroke, strokeWidth, dash} -> SVG. kind is informative (rect, ellipse, line…): the
 *  d path in vb is the geometry every editor can use. */
export function shapeSvg(spec, px = 240) {
  const [w, h] = spec.vb || [100, 100];
  const sw = spec.stroke && spec.stroke !== "none" ? +spec.strokeWidth || 3 : 0;
  const fill = spec.fill || "none";
  const a = `fill="${fill}"${sw ? ` stroke="${spec.stroke}" stroke-width="${n(sw)}" stroke-linecap="round" stroke-linejoin="round"${dashOf(spec.dash, sw)}` : ""}`;
  const pad = sw ? sw / 2 + 1 : 0;
  // Lines keep their stroke inside the view box (pad); filled shapes use the box as is.
  const vb = pad ? `${n(-pad)} ${n(-pad)} ${n(w + 2 * pad)} ${n(h + 2 * pad)}` : `0 0 ${n(w)} ${n(h)}`;
  const s = px / Math.max(w + 2 * pad, h + 2 * pad);
  const extra = spec.extra ? spec.extra.map((p) => `<path d="${p.d}" fill="${p.fill || "none"}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${n(p.sw || sw || 2)}" stroke-linecap="round" stroke-linejoin="round"` : ""}/>`).join("") : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${n((w + 2 * pad) * s)}" height="${n((h + 2 * pad) * s)}"><path d="${spec.d}" ${a}/>${extra}</svg>`;
}

// ---------- frames and grids
/** Frame spec {shape, d, vb, holes?: [[x, y, w, h, r]], screen?: [x, y, w, h] (0..1), under?, over?} -> SVG with the
 *  placeholder picture inside the fillable area(s). under/over: decoration drawn below / above (film, devices, paper). */
export function frameSvg(spec, px = 240) {
  const [w, h] = spec.vb || [100, 100];
  const id = uid("f");
  let defs = "", body = spec.under || "";
  const holes = spec.holes || (spec.screen ? [[spec.screen[0] * w, spec.screen[1] * h, spec.screen[2] * w, spec.screen[3] * h, spec.screen[4] || 0]] : null);
  if (holes) {
    holes.forEach(([x, y, hw, hh, r], i) => {
      const art = placeholderArt(x, y, hw, hh, `${id}a${i}`);
      defs += art.defs + `<clipPath id="${id}c${i}"><path d="${rrect(x, y, hw, hh, r || 0)}"/></clipPath>`;
      body += `<g clip-path="url(#${id}c${i})">${art.body}</g>`;
    });
  } else {
    const art = placeholderArt(0, 0, w, h, `${id}a`);
    defs += art.defs + `<clipPath id="${id}c"><path d="${spec.d}"/></clipPath>`;
    body += `<g clip-path="url(#${id}c)">${art.body}</g>`;
  }
  body += spec.over || "";
  return svgDoc(w, h, body, { px, defs });
}

/** Grid spec {cells: [[x, y, w, h]] in 0..1, gap (fraction of the width), aspect} -> SVG, a placeholder in each cell. */
export function gridSvg(spec, px = 240) {
  const a = spec.aspect || 1, W = a >= 1 ? 160 : 160 * a, H = a >= 1 ? 160 / a : 160, g = (spec.gap ?? 0.02) * W;
  const id = uid("g");
  let defs = "", body = `<rect width="${n(W)}" height="${n(H)}" fill="#fff"/>`;
  spec.cells.forEach(([x, y, w, h], i) => {
    const X = x * W + (x > 0 ? g / 2 : 0), Y = y * H + (y > 0 ? g / 2 : 0);
    const X2 = (x + w) * W - (x + w < 0.999 ? g / 2 : 0), Y2 = (y + h) * H - (y + h < 0.999 ? g / 2 : 0);
    const art = placeholderArt(X, Y, X2 - X, Y2 - Y, `${id}a${i}`);
    defs += art.defs + `<clipPath id="${id}c${i}"><rect x="${n(X)}" y="${n(Y)}" width="${n(X2 - X)}" height="${n(Y2 - Y)}"/></clipPath>`;
    body += `<g clip-path="url(#${id}c${i})">${art.body}</g>`;
  });
  return svgDoc(W, H, body, { px, defs });
}

// ---------- charts
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
const txt = (x, y, s, size, fill = "#4a5168", anchor = "middle", weight = "normal") => `<text x="${n(x)}" y="${n(y)}" font-family="${FONT}" font-size="${n(size)}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
/** Chart spec {kind: bar (horizontal) | column | line | area | pie | donut | progress | number, title, labels, series:
 *  [{name, values, color}], stacked, value, max, style, label, unit} -> SVG. */
export function chartSvg(spec, px = 240) {
  const W = 240, H = Math.round(240 / (spec.aspect || 1.5));
  const cols = (i) => spec.series?.[i]?.color || spec.colors?.[i] || PALETTE[i % PALETTE.length];
  const top = spec.title ? 24 : 10;
  let b = `<rect width="${W}" height="${H}" rx="8" fill="#fff"/>` + (spec.title ? txt(12, 17, spec.title, 11, INK, "start", "bold") : "");
  const series = spec.series || [], labels = spec.labels || [];
  const kind = spec.kind;
  if (kind === "column" || kind === "bar" || kind === "line" || kind === "area") {
    const stacked = !!spec.stacked && (kind === "column" || kind === "bar");
    const totals = labels.map((_, i) => series.reduce((s, se) => s + (+se.values[i] || 0), 0));
    const max = niceMax(stacked ? Math.max(...totals) : Math.max(...series.flatMap((s) => s.values.map(Number))));
    const legend = series.length > 1 ? 14 : 0;
    const x0 = kind === "bar" ? 44 : 30, x1 = W - 12, y0 = top + 4, y1 = H - 18 - legend;
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4, lab = v >= 1000 ? `${n(v / 1000)}k` : n(v);
      if (kind === "bar") { const x = x0 + ((x1 - x0) * k) / 4; b += `<path d="M${n(x)} ${y0}V${y1}" stroke="#e7e9f2" stroke-width="1"/>` + txt(x, y1 + 11, lab, 8); }
      else { const y = y1 - ((y1 - y0) * k) / 4; b += `<path d="M${x0} ${n(y)}H${x1}" stroke="#e7e9f2" stroke-width="1"/>` + txt(x0 - 4, y + 3, lab, 8, "#8a90a6", "end"); }
    }
    const nL = Math.max(1, labels.length), slot = ((kind === "bar" ? y1 - y0 : x1 - x0)) / nL;
    if (kind === "column" || kind === "bar") {
      const gw = slot * 0.7, bw = stacked ? gw : gw / Math.max(1, series.length);
      labels.forEach((l, i) => {
        let acc = 0;
        series.forEach((se, j) => {
          const v = +se.values[i] || 0, len = (v / max) * (kind === "bar" ? x1 - x0 : y1 - y0);
          if (kind === "column") { const x = x0 + i * slot + slot * 0.15 + (stacked ? 0 : j * bw), y = y1 - acc - len; b += `<rect x="${n(x)}" y="${n(y)}" width="${n(bw * 0.92)}" height="${n(Math.max(0, len))}" rx="1.5" fill="${cols(j)}"/>`; }
          else { const y = y0 + i * slot + slot * 0.15 + (stacked ? 0 : j * bw); b += `<rect x="${n(x0 + acc)}" y="${n(y)}" width="${n(Math.max(0, len))}" height="${n(bw * 0.92)}" rx="1.5" fill="${cols(j)}"/>`; }
          if (stacked) acc += len;
        });
        b += kind === "column" ? txt(x0 + i * slot + slot / 2, y1 + 11, l, 8) : txt(x0 - 4, y0 + i * slot + slot / 2 + 3, l, 8, "#4a5168", "end");
      });
    } else {
      series.forEach((se, j) => {
        const pts = se.values.map((v, i) => [x0 + (labels.length > 1 ? (i * (x1 - x0)) / (labels.length - 1) : (x1 - x0) / 2), y1 - ((+v || 0) / max) * (y1 - y0)]);
        if (kind === "area") b += `<path d="${ptsPath([[pts[0][0], y1], ...pts, [pts.at(-1)[0], y1]])}" fill="${cols(j)}" fill-opacity="${series.length > 1 ? 0.28 : 0.35}"/>`;
        b += `<path d="${ptsPath(pts, false)}" fill="none" stroke="${cols(j)}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
        if (kind === "line") b += pts.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="2.6" fill="#fff" stroke="${cols(j)}" stroke-width="1.6"/>`).join("");
      });
      labels.forEach((l, i) => { b += txt(x0 + (labels.length > 1 ? (i * (x1 - x0)) / (labels.length - 1) : (x1 - x0) / 2), y1 + 11, l, 8); });
    }
    if (legend) { let lx = x0; series.forEach((se, j) => { b += `<rect x="${n(lx)}" y="${H - 12}" width="8" height="8" rx="2" fill="${cols(j)}"/>` + txt(lx + 11, H - 5, se.name || `Series ${j + 1}`, 8, "#4a5168", "start"); lx += 16 + String(se.name || "Series 1").length * 4.6; }); }
  } else if (kind === "pie" || kind === "donut") {
    const vals = (series[0]?.values || []).map(Number), tot = vals.reduce((a, v) => a + v, 0) || 1;
    const cx = W * 0.36, cy = top + (H - top) / 2, R = Math.min(W * 0.3, (H - top) / 2 - 8), r = kind === "donut" ? R * 0.58 : 0;
    let a0 = -90;
    vals.forEach((v, i) => {
      const a1 = a0 + (v / tot) * 360, large = a1 - a0 > 180 ? 1 : 0;
      const p = (a, q) => [cx + q * Math.cos(a * RAD), cy + q * Math.sin(a * RAD)];
      const [ax, ay] = p(a0, R), [bx, by] = p(a1 - 0.001, R);
      let d = `M${n(ax)} ${n(ay)}A${n(R)} ${n(R)} 0 ${large} 1 ${n(bx)} ${n(by)}`;
      if (r) { const [cx2, cy2] = p(a1 - 0.001, r), [dx, dy] = p(a0, r); d += `L${n(cx2)} ${n(cy2)}A${n(r)} ${n(r)} 0 ${large} 0 ${n(dx)} ${n(dy)}Z`; } else d += `L${n(cx)} ${n(cy)}Z`;
      b += `<path d="${d}" fill="${spec.colors?.[i] || PALETTE[i % PALETTE.length]}" stroke="#fff" stroke-width="1.5"/>`;
      a0 = a1;
    });
    if (r) b += txt(cx, cy + 2, spec.center ?? `${Math.round((vals[0] / tot) * 100)}%`, 14, INK, "middle", "bold") + txt(cx, cy + 13, labels[0] || "", 7.5);
    labels.forEach((l, i) => { const y = top + 10 + i * 14; if (y > H - 6) return; b += `<rect x="${n(W * 0.7)}" y="${n(y - 7)}" width="8" height="8" rx="2" fill="${spec.colors?.[i] || PALETTE[i % PALETTE.length]}"/>` + txt(W * 0.7 + 12, y, `${l} ${Math.round((vals[i] / tot) * 100)}%`, 8, "#4a5168", "start"); });
  } else if (kind === "progress") {
    const v = Math.max(0, Math.min(100, +spec.value || 0)), col = spec.colors?.[0] || PALETTE[0];
    if (spec.style === "bar") {
      const y = top + (H - top) / 2 - 7;
      b += `<rect x="16" y="${n(y)}" width="${W - 32}" height="14" rx="7" fill="#eceaf8"/><rect x="16" y="${n(y)}" width="${n(((W - 32) * v) / 100)}" height="14" rx="7" fill="${col}"/>` + txt(W - 16, y - 7, `${v}%`, 12, INK, "end", "bold") + txt(16, y - 7, spec.label || "", 9, "#4a5168", "start");
    } else {
      const semi = spec.style === "semi", cx = W / 2, cy = semi ? H - 26 : top + (H - top) / 2, R = Math.min(W / 3, semi ? H - top - 34 : (H - top) / 2 - 10), sw = R * 0.22;
      const arc = (from, to) => { const p = (a) => [cx + R * Math.cos(a * RAD), cy + R * Math.sin(a * RAD)]; const [x0, y0] = p(from), [x1, y1] = p(to); return `M${n(x0)} ${n(y0)}A${n(R)} ${n(R)} 0 ${to - from > 180 ? 1 : 0} 1 ${n(x1)} ${n(y1)}`; };
      const start = semi ? 180 : -90, span = semi ? 180 : 359.99;
      b += `<path d="${arc(start, start + span)}" fill="none" stroke="#eceaf8" stroke-width="${n(sw)}" stroke-linecap="round"/>`;
      if (v > 0) b += `<path d="${arc(start, start + (span * v) / 100)}" fill="none" stroke="${col}" stroke-width="${n(sw)}" stroke-linecap="round"/>`;
      b += txt(cx, cy + (semi ? -4 : 6), `${v}%`, R * 0.5, INK, "middle", "bold") + (spec.label ? txt(cx, semi ? cy + 14 : cy + R * 0.5, spec.label, 8) : "");
    }
  } else if (kind === "number") {
    const col = spec.colors?.[0] || PALETTE[0];
    b += txt(W / 2, top + (H - top) / 2 + 8, spec.value ?? "1,250", Math.min(46, (W * 1.5) / String(spec.value ?? "1,250").length), col, "middle", "bold") + txt(W / 2, top + (H - top) / 2 + 30, spec.label || "", 11, "#4a5168");
    if (spec.delta) b += txt(W / 2, top + 16, spec.delta, 10, spec.delta.startsWith("-") ? "#e11d48" : "#16a34a", "middle", "bold");
  }
  return svgDoc(W, H, b, { px });
}

// ---------- tables (and sheet-looking tables)
/** Table spec {rows, cols, cells: string[][], header, style: {variant: lines|header|solid|minimal|sheet, color, head,
 *  stripe, border}} -> SVG. */
export function tableSvg(spec, px = 240) {
  const st = spec.style || {}, R = spec.rows, C = spec.cols, sheet = st.variant === "sheet";
  const cw = spec.colWidths || Array(C).fill(64), ch = 24, lead = sheet ? 22 : 0, headH = sheet ? 18 : 0;
  const W = lead + cw.reduce((a, v) => a + v, 0), H = headH + R * ch;
  const xs = [lead]; for (const w of cw) xs.push(xs.at(-1) + w);
  const col = st.color || "#5b4cf0", border = st.border || (st.variant === "solid" ? "#fff" : col), head = st.head || col, stripe = st.stripe;
  let b = `<rect width="${n(W)}" height="${n(H)}" fill="#fff"/>`;
  const cellFill = (r, c) => {
    if (st.variant === "solid") return r === 0 && spec.header !== false ? head : stripe ? (r % 2 ? stripe : st.stripe2 || "#fff") : st.body || "#f2f1fb";
    if (st.variant === "header" && r === 0 && spec.header !== false) return head;
    if (sheet && r === 0 && spec.header !== false) return st.head || "#eef2ff";
    if (stripe && r % 2 === 0 && r > 0) return stripe;
    return null;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const f = cellFill(r, c), x = xs[c], y = headH + r * ch, w = cw[c];
    if (st.variant === "solid") b += `<rect x="${n(x + 1.5)}" y="${n(y + 1.5)}" width="${n(w - 3)}" height="${ch - 3}" fill="${f}"/>`;
    else if (f) b += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${ch}" fill="${f}"/>`;
    const t = spec.cells?.[r]?.[c];
    if (t !== undefined && t !== "") {
      const onHead = r === 0 && spec.header !== false && (st.variant === "header" || st.variant === "solid");
      const num = /^[-+]?[$€£₨]?[\d,.]+%?$/.test(String(t));
      b += txt(num ? x + w - 6 : x + 6, y + 15.5, String(t).slice(0, Math.floor(w / 5.6)), 9.5, onHead ? "#fff" : INK, num ? "end" : "start", r === 0 && spec.header !== false ? "bold" : "normal");
    }
  }
  if (sheet) {
    b += `<rect width="${n(W)}" height="${headH}" fill="#f3f4f8"/><rect y="${headH}" width="${lead}" height="${n(H - headH)}" fill="#f3f4f8"/>`;
    for (let c = 0; c < C; c++) b += txt((xs[c] + xs[c + 1]) / 2, 12.5, String.fromCharCode(65 + c), 8.5, "#7a8199");
    for (let r = 0; r < R; r++) b += txt(lead / 2, headH + r * ch + 15.5, String(r + 1), 8.5, "#7a8199");
    let g = "";
    for (const x of [0, ...xs]) g += `M${n(x)} 0V${n(H)}`;
    for (let r = 0; r <= R; r++) g += `M0 ${n(headH + r * ch)}H${n(W)}`;
    b += `<path d="M0 0H${n(W)}${g}" stroke="#d7dbe6" stroke-width="1" fill="none"/>`;
  } else if (st.variant === "minimal") {
    let g = ""; for (let r = 1; r < R; r++) g += `M0 ${n(r * ch)}H${n(W)}`;
    b += `<path d="${g}" stroke="${border}" stroke-width="1.2" fill="none"/><path d="M0 ${ch}H${n(W)}" stroke="${border}" stroke-width="2.4"/>`;
  } else if (st.variant !== "solid") {
    let g = ""; for (const x of xs.slice(1, -1)) g += `M${n(x)} 0V${n(H)}`; for (let r = 1; r < R; r++) g += `M0 ${n(r * ch)}H${n(W)}`;
    b += `<path d="${g}" stroke="${border}" stroke-width="1.6" fill="none"/><rect x=".8" y=".8" width="${n(W - 1.6)}" height="${n(H - 1.6)}" fill="none" stroke="${border}" stroke-width="1.6"/>`;
  }
  return svgDoc(W, H, b, { px });
}
