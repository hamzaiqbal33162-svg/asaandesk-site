// More chart types like Canva's chart list (round 3): horizontal bars, stacked columns, area, funnel, progress
// ring and progress bar. Same primitive format and look as the shared bar / line / pie / donut charts
// (/pdf-editor/charts.js), so the editor, PNG, SVG and PDF draw them the same way. Pure module.
export const EXTRA_KINDS = [["hbar", "Bars"], ["stacked", "Stacked"], ["area", "Area"], ["funnel", "Funnel"], ["progress", "Progress ring"], ["progressbar", "Progress bar"]];
const PALETTE = ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#2f80ff", "#a64bf4", "#64748b", "#0ea5e9"];
const n2 = (v) => Math.round(v * 100) / 100;
const rect = (x, y, w, h) => `M${n2(x)} ${n2(y)}H${n2(x + w)}V${n2(y + h)}H${n2(x)}Z`;
const line = (x1, y1, x2, y2) => `M${n2(x1)} ${n2(y1)}L${n2(x2)} ${n2(y2)}`;
export function fmtNum(v) {
  const a = Math.abs(v), short = (x, s) => (Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + s;
  if (a >= 1e9) return short(v / 1e9, "B");
  if (a >= 1e6) return short(v / 1e6, "M");
  if (a >= 1e4) return short(v / 1e3, "k");
  return (Math.round(v * 100) / 100).toLocaleString("en-US");
}
const textW = (t, size) => [...String(t)].reduce((w, ch) => w + (/[ il.,:;|!'1]/.test(ch) ? 0.3 : /[mwMW@]/.test(ch) ? 0.85 : /[A-Z0-9]/.test(ch) ? 0.64 : 0.54), 0) * size;
const fit = (t, size, max) => { t = String(t); while (t.length > 1 && textW(t, size) > max) t = t.slice(0, -2) + "…"; return t; };
function niceMax(v) { if (v <= 0) return 1; const mag = 10 ** Math.floor(Math.log10(v)), f = v / mag; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag; }
// Arc path (centre cx, cy; radii r1 outer, r0 inner; angles in radians from 12 o'clock, clockwise).
function ring(cx, cy, r1, r0, a0, a1) {
  const pt = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const big = a1 - a0 > Math.PI ? 1 : 0;
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
  const [x1, y1] = pt(r1, a0), [x2, y2] = pt(r1, a1), [x3, y3] = pt(r0, a1), [x4, y4] = pt(r0, a0);
  return `M${n2(x1)} ${n2(y1)}A${n2(r1)} ${n2(r1)} 0 ${big} 1 ${n2(x2)} ${n2(y2)}L${n2(x3)} ${n2(y3)}A${n2(r0)} ${n2(r0)} 0 ${big} 0 ${n2(x4)} ${n2(y4)}Z`;
}

/** Primitives for the extra kinds; returns null for kinds the shared renderer draws. */
export function extraChartPrims(spec, w, h) {
  if (!EXTRA_KINDS.some(([k]) => k === spec.kind)) return null;
  const P = [], ink = spec.textColor || "#1f2937", soft = "#6b7280", grid = "#e5e7eb";
  const colors = spec.colors?.length ? spec.colors : PALETTE;
  const series = spec.series || [], labels = spec.labels || [];
  const base = Math.max(9, Math.min(14, Math.min(w, h) / 22));
  const show = spec.showValues !== false;
  let top = 10;
  if (spec.title) { P.push({ t: fit(spec.title, base * 1.4, w - 20), x: w / 2, y: top + base * 1.25, size: base * 1.4, fill: ink, bold: true, anchor: "middle" }); top += base * 2.1; }
  const vals = series[0]?.values || [];
  if (spec.kind === "progress" || spec.kind === "progressbar") {
    // Progress: the first value as a percentage (of the second value when there is one, else of 100).
    const v = vals[0] ?? 0, of = vals[1] > 0 ? vals[1] : 100, pct = Math.max(0, Math.min(1, v / of));
    const label = Math.round(pct * 100) + "%";
    if (spec.kind === "progress") {
      const R = Math.max(10, Math.min(w, h - top) / 2 - 8), cx = w / 2, cy = top + (h - top) / 2, th = R * 0.22;
      P.push({ d: ring(cx, cy, R, R - th, 0, Math.PI * 2), fill: grid });
      if (pct > 0) P.push({ d: ring(cx, cy, R, R - th, 0, Math.PI * 2 * pct), fill: colors[0] });
      if (show) P.push({ t: label, x: cx, y: cy + R * 0.16, size: R * 0.45, fill: ink, bold: true, anchor: "middle" });
      if (labels[0]) P.push({ t: fit(labels[0], base, R * 1.4), x: cx, y: cy + R * 0.45, size: base, fill: soft, anchor: "middle" });
    } else {
      const bh = Math.max(6, Math.min(40, (h - top) * 0.35)), y = top + (h - top - bh) / 2 + (labels[0] ? base * 0.6 : 0), x0 = 8, bw = w - 16 - (show ? textW(label, base * 1.2) + 10 : 0);
      if (labels[0]) P.push({ t: fit(labels[0], base, w - 16), x: x0, y: y - base * 0.6, size: base, fill: soft, anchor: "start" });
      P.push({ d: rect(x0, y, bw, bh), fill: grid });
      if (pct > 0) P.push({ d: rect(x0, y, bw * pct, bh), fill: colors[0] });
      if (show) P.push({ t: label, x: x0 + bw + 8, y: y + bh / 2 + base * 0.42, size: base * 1.2, fill: ink, bold: true, anchor: "start" });
    }
    return P;
  }
  if (spec.kind === "funnel") {
    const n = Math.max(1, vals.length), max = Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
    const gap = 4, rowH = (h - top - 8 - gap * (n - 1)) / n;
    vals.forEach((v, i) => {
      const bw = Math.max(4, (Math.abs(v) / max) * (w - 16)), x = (w - bw) / 2, y = top + i * (rowH + gap);
      P.push({ d: rect(x, y, bw, rowH), fill: colors[i % colors.length] });
      const txt = fit(`${labels[i] ?? ""}${show ? "  " + fmtNum(v) : ""}`, Math.min(base, rowH * 0.6), w - 20);
      P.push({ t: txt, x: w / 2, y: y + rowH / 2 + Math.min(base, rowH * 0.6) * 0.35, size: Math.min(base, rowH * 0.6), fill: "#ffffff", bold: true, anchor: "middle" });
    });
    return P;
  }
  // Legend for several series.
  const legend = series.length > 1 && spec.legend !== false;
  let bottom = h - 8;
  if (legend) {
    let x = 10;
    series.forEach((s, i) => { P.push({ d: rect(x, bottom - base * 0.8, base * 0.8, base * 0.8), fill: colors[i % colors.length] }); P.push({ t: s.name, x: x + base * 1.1, y: bottom - base * 0.05, size: base * 0.9, fill: soft, anchor: "start" }); x += base * 1.6 + textW(s.name, base * 0.9) + 10; });
    bottom -= base * 1.6;
  }
  if (spec.kind === "hbar") {
    const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
    const labW = Math.min(w * 0.35, Math.max(...labels.map((l) => textW(l, base))) + 10), x0 = 8 + labW, plotW = w - x0 - (show ? textW(fmtNum(max), base) + 12 : 10);
    const n = Math.max(1, labels.length), band = (bottom - top) / n, k = series.length || 1, bh = (band * 0.7) / k;
    labels.forEach((lab, i) => {
      const y = top + i * band + band * 0.15;
      P.push({ t: fit(lab, base, labW - 8), x: x0 - 6, y: y + (bh * k) / 2 + base * 0.35, size: base, fill: soft, anchor: "end" });
      series.forEach((s, j) => {
        const v = Math.max(0, s.values[i] || 0), bw = (v / max) * plotW;
        P.push({ d: rect(x0, y + j * bh, Math.max(0.5, bw), bh * 0.92), fill: colors[(k > 1 ? j : i) % colors.length] });
        if (show) P.push({ t: fmtNum(s.values[i] || 0), x: x0 + bw + 4, y: y + j * bh + bh * 0.5 + base * 0.33, size: base * 0.9, fill: ink, anchor: "start" });
      });
    });
    P.push({ d: line(x0, top, x0, bottom), stroke: grid, sw: 1 });
    return P;
  }
  // Column-style plots (stacked columns, area).
  const totals = labels.map((_, i) => series.reduce((a, s) => a + Math.max(0, s.values[i] || 0), 0));
  const max = niceMax(spec.kind === "stacked" ? Math.max(0, ...totals) : Math.max(0, ...series.flatMap((s) => s.values)));
  const axisW = textW(fmtNum(max), base) + 10, x0 = 8 + axisW, plotW = w - x0 - 10, y1 = bottom - base * 1.6, plotH = Math.max(10, y1 - top - 4);
  for (let g = 0; g <= 4; g++) { const y = y1 - (plotH * g) / 4; P.push({ d: line(x0, y, x0 + plotW, y), stroke: grid, sw: 1 }); P.push({ t: fmtNum((max * g) / 4), x: x0 - 6, y: y + base * 0.35, size: base * 0.85, fill: soft, anchor: "end" }); }
  const n = Math.max(1, labels.length), band = plotW / n;
  labels.forEach((lab, i) => P.push({ t: fit(lab, base * 0.9, band - 4), x: x0 + band * (i + 0.5), y: y1 + base * 1.2, size: base * 0.9, fill: soft, anchor: "middle" }));
  if (spec.kind === "stacked") {
    labels.forEach((_, i) => {
      let acc = 0;
      series.forEach((s, j) => { const v = Math.max(0, s.values[i] || 0), hh = (v / max) * plotH; P.push({ d: rect(x0 + band * (i + 0.18), y1 - acc - hh, band * 0.64, hh), fill: colors[j % colors.length] }); acc += hh; });
      if (show) P.push({ t: fmtNum(totals[i]), x: x0 + band * (i + 0.5), y: y1 - acc - 4, size: base * 0.9, fill: ink, anchor: "middle", bold: true });
    });
  } else {
    // Area: filled shape under each series' line (later series on top, see-through).
    series.forEach((s, j) => {
      const pts = labels.map((_, i) => [x0 + band * (i + 0.5), y1 - (Math.max(0, s.values[i] || 0) / max) * plotH]);
      if (!pts.length) return;
      const d = `M${n2(pts[0][0])} ${n2(y1)}` + pts.map(([x, y]) => `L${n2(x)} ${n2(y)}`).join("") + `L${n2(pts[pts.length - 1][0])} ${n2(y1)}Z`;
      P.push({ d, fill: colors[j % colors.length], op: 0.35 });
      P.push({ d: "M" + pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join("L"), stroke: colors[j % colors.length], sw: Math.max(1.5, base * 0.18), fill: "none" });
      if (show) pts.forEach(([x, y], i) => P.push({ t: fmtNum(s.values[i] || 0), x, y: y - 6, size: base * 0.85, fill: ink, anchor: "middle" }));
    });
  }
  return P;
}
/** The shared chart renderer plus our extra kinds. */
export const chartPrimsWith = (charts) => (spec, w, h) => extraChartPrims(spec, w, h) || charts.chartPrims(spec, w, h);
