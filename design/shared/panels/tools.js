// Draw panel (shared kit, every editor; the shell's "Draw" rail item), Canva's structure: the pens (Pen, Marker, Glow pen,
// Highlighter, Eraser) with Colour, Size and Transparency, and Canva's floating tool palette over the page while it is
// open (Select, Pen, Shapes, Line, Sticky note, Text, Signature, Table). When the editor has its own drawing tool
// (opts.draw = {start({tool, color, size, alpha}), stop(keep), undo(), active()}) the panel drives it; otherwise a
// shared drawing layer over the stage collects the strokes and adds them as one drawing when you pause (or press Done)
// through opts.insert.drawing, falling back to insert.svg / insert.image. The AI tools list and the QR code form are
// exported for the Apps panel (panels/shell-panels.js).
import { loadBrand } from "../brand.js";
import { insertWithFallback, esc, ensureCss } from "./insert.js";
import { h, section, run, textItem, TEXT_BOX } from "./text.js";

const PANEL = "draw";
const CSS = new URL("./text-tools.css", import.meta.url).href;
const r2 = (n) => Math.round(n * 100) / 100;

// ---------- drawing tools: id, label, default weight, base opacity, default transparency (%)
export const DRAW_TOOLS = [
  { id: "pen", label: "Pen", size: 4, base: 1, trans: 0 },
  { id: "marker", label: "Marker", size: 12, base: 0.92, trans: 0 },
  { id: "glow", label: "Glow pen", size: 6, base: 1, trans: 0 },
  { id: "highlighter", label: "Highlighter", size: 24, base: 0.45, trans: 0 },
  { id: "eraser", label: "Eraser", size: 22, base: 1, trans: 0 },
];
const TOOL = Object.fromEntries(DRAW_TOOLS.map((t) => [t.id, t]));
const DEFAULT_COLORS = ["#1b2133", "#ffffff", "#e11d48", "#f59e0b", "#16a34a", "#0ea5e9", "#5b4cf0", "#be185d"];
const SKEY = "ads-kit-draw";
function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch {}
  const out = {};
  for (const t of DRAW_TOOLS) out[t.id] = { color: t.id === "highlighter" ? "#f59e0b" : t.id === "glow" ? "#0ea5e9" : "#1b2133", size: t.size, trans: t.trans, ...(s[t.id] || {}) };
  return out;
}
const saveSettings = (s) => { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {} };
/** Settings -> what opts.draw.start() and the layer use: {tool, color, size, alpha}. */
export const drawParams = (tool, s) => ({ tool, color: s.color, size: Math.max(1, +s.size || 1), alpha: r2(Math.max(0.05, 1 - (+s.trans || 0) / 100)) });

// ---------- strokes -> SVG
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const f1 = (n) => Math.round(n * 10) / 10;
/** Smooth path through the points (quadratic curves through the midpoints); a single point is a dot. */
export function strokePath(pts, dx = 0, dy = 0) {
  const p = pts.map(([x, y]) => [f1(x + dx), f1(y + dy)]);
  if (!p.length) return "";
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]}l0.1 0`;
  if (p.length === 2) return `M${p[0][0]} ${p[0][1]}L${p[1][0]} ${p[1][1]}`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) { const m = mid(p[i], p[i + 1]); d += `Q${p[i][0]} ${p[i][1]} ${f1(m[0])} ${f1(m[1])}`; }
  const l = p[p.length - 1]; return d + `L${l[0]} ${l[1]}`;
}
/** One stroke as SVG elements ({tool, color, size, alpha, pts}); fid = a unique id for the glow filter. */
export function strokeSvg(s, dx = 0, dy = 0, fid = "kglow") {
  const d = strokePath(s.pts, dx, dy), t = TOOL[s.tool] || TOOL.pen, a = r2(s.alpha * t.base);
  if (s.tool === "glow") return `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r2(s.size * 0.7)}"/></filter>`
    + `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${r2(s.size * 2.4)}" stroke-linecap="round" stroke-linejoin="round" opacity="${r2(a * 0.75)}" filter="url(#${fid})"/>`
    + `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${r2(s.size * 1.2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${a}"/>`
    + `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${r2(s.size * 0.45)}" stroke-linecap="round" stroke-linejoin="round" opacity="${r2(Math.min(1, a + 0.1))}"/>`;
  if (s.tool === "highlighter") return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.size}" stroke-linecap="butt" stroke-linejoin="round" opacity="${a}" style="mix-blend-mode:multiply"/>`;
  return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.size}" stroke-linecap="round" stroke-linejoin="round" opacity="${a}"/>`;
}
const reach = (s) => (s.tool === "glow" ? s.size * 2.6 : s.size / 2 + 1);
/** All strokes as one standalone SVG drawing cropped to its bounds: {svg, x, y, w, h} in stage px. */
export function drawingSvg(strokes, uid = Date.now().toString(36)) {
  const live = strokes.filter((s) => s.pts.length);
  if (!live.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of live) { const r = reach(s); for (const [x, y] of s.pts) { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); } }
  const w = Math.max(2, Math.ceil(x1 - x0)), hh = Math.max(2, Math.ceil(y1 - y0));
  const body = live.map((s, i) => strokeSvg(s, -x0, -y0, `kglow-${uid}-${i}`)).join("");
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}">${body}</svg>`, x: x0, y: y0, w, h: hh };
}
/** Distance from point p to the segment a-b. */
function segDist(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy;
  let t = l2 ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
/** Strokes the eraser at p (radius r) touches. */
export function hitStrokes(strokes, p, r) {
  return strokes.filter((s) => { const rr = r + s.size / 2; if (s.pts.length === 1) return Math.hypot(p[0] - s.pts[0][0], p[1] - s.pts[0][1]) <= rr; for (let i = 1; i < s.pts.length; i++) if (segDist(p, s.pts[i - 1], s.pts[i]) <= rr) return true; return false; });
}

// ---------- the shared drawing layer over the stage
export const IDLE_MS = 2500;
export class DrawLayer {
  constructor(ctx, { onState } = {}) { this.ctx = ctx; this.onState = onState; this.strokes = []; this.cur = null; this.params = null; this.timer = 0; this.el = null; this.busy = Promise.resolve(); this.idle = IDLE_MS; }
  get active() { return !!this.el?.isConnected; }
  stage() { return this.ctx.shell?.slots?.stage || null; }
  start(params) {
    this.params = params;
    const st = this.stage(); if (!st) return false;
    if (!this.el) this.build();
    if (!this.el.isConnected) st.append(this.el, this.bar);
    this.el.dataset.tool = params.tool; this.label.textContent = `Drawing: ${TOOL[params.tool]?.label || params.tool}`;
    this.onState?.(); return true;
  }
  build() {
    this.el = h("div", { class: "kt-draw-layer", "data-kit": "draw-layer", role: "application", "aria-label": "Drawing area: draw with the mouse, a pen or a finger" });
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); this.el.append(this.svg);
    this.label = h("span", { class: "kt-dlabel" });
    const undo = h("button", { type: "button", class: "ads-btn sm", text: "Undo", "data-kit": "draw-undo", onclick: () => this.undo() });
    const done = h("button", { type: "button", class: "ads-btn sm primary", text: "Done", "data-kit": "draw-done", onclick: () => this.stop(true) });
    this.bar = h("div", { class: "kt-draw-bar", role: "toolbar", "aria-label": "Drawing" }, this.label, undo, done);
    const pt = (e) => { const r = this.el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.el.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || !this.params) return;
      e.preventDefault(); clearTimeout(this.timer);
      try { this.el.setPointerCapture(e.pointerId); } catch {}
      const p = pt(e);
      if (this.params.tool === "eraser") { this.cur = { eraser: true }; this.erase(p); return; }
      this.cur = { tool: this.params.tool, color: this.params.color, size: this.params.size, alpha: this.params.alpha, pts: [p] };
      this.strokes.push(this.cur); this.draw();
    });
    this.el.addEventListener("pointermove", (e) => {
      if (!this.cur) return;
      const evs = e.getCoalescedEvents?.() || [e];
      for (const ev of evs.length ? evs : [e]) { const p = pt(ev); if (this.cur.eraser) this.erase(p); else { const l = this.cur.pts[this.cur.pts.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) >= 1.5) this.cur.pts.push(p); } }
      this.draw();
    });
    const end = () => { if (!this.cur) return; this.cur = null; this.draw(); this.schedule(); };
    this.el.addEventListener("pointerup", end); this.el.addEventListener("pointercancel", end);
    // let the wheel scroll / zoom the page under the layer
    this.el.addEventListener("wheel", () => { this.el.style.pointerEvents = "none"; clearTimeout(this.wt); this.wt = setTimeout(() => { if (this.el) this.el.style.pointerEvents = ""; }, 350); }, { passive: true });
  }
  erase(p) { const hit = hitStrokes(this.strokes, p, (this.params?.size || 20) / 2); if (hit.length) { this.strokes = this.strokes.filter((s) => !hit.includes(s)); this.draw(); } }
  draw() { if (this.svg) this.svg.innerHTML = this.strokes.map((s, i) => strokeSvg(s, 0, 0, `kglow-live-${i}`)).join(""); this.onState?.(); }
  schedule() { clearTimeout(this.timer); if (this.strokes.length) this.timer = setTimeout(() => this.commit(), this.idle); }
  undo() { clearTimeout(this.timer); this.strokes.pop(); this.draw(); this.schedule(); }
  /** Adds the pending strokes to the design as one drawing. */
  commit() {
    clearTimeout(this.timer);
    const strokes = this.strokes.filter((s) => s.pts?.length); this.strokes = []; this.draw();
    if (!strokes.length) return this.busy;
    const d = drawingSvg(strokes); const st = this.stage(); const r = st?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
    const pt = { x: d.x + d.w / 2, y: d.y + d.h / 2, clientX: r.left + d.x + d.w / 2, clientY: r.top + d.y + d.h / 2 };
    const short = Math.min(r.width || 1000, r.height || 1000) || 1000;
    const tool = strokes[strokes.length - 1].tool;
    this.busy = this.busy.then(() => insertWithFallback(this.ctx, "drawing", { svg: d.svg, w: d.w, h: d.h, name: "Drawing" }, pt, { panel: PANEL, category: "draw", item: tool, name: "Drawing", svg: () => d.svg, rel: r2(Math.max(d.w, d.h) / short), aspect: r2(d.w / d.h) }))
      .then((res) => { if (!res.ok) this.ctx.toast?.(res.error || "The drawing could not be added."); return res; });
    return this.busy;
  }
  stop(keep = true) { if (keep) this.commit(); else { clearTimeout(this.timer); this.strokes = []; this.draw(); } this.el?.remove(); this.bar?.remove(); this.params = null; this.onState?.(); return this.busy; }
}

// ---------- icons (our own line drawings) and tool art
const TI = {
  pen: '<path d="M7 27 9 20 22 7l3 3-13 13z" fill="#5b4cf0"/><path d="M7 27l2-7 3 3z" fill="#1b2133"/>',
  marker: '<path d="M10 25 20 9l4 3-9 16z" fill="#ff7a59"/><rect x="8" y="24" width="7" height="4" rx="1" fill="#1b2133"/>',
  glow: '<circle cx="17" cy="17" r="10" fill="#0ea5e9" opacity=".25"/><path d="M9 25 21 9l3 3-11 15z" fill="#0ea5e9"/><path d="M11 23 21 11" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  highlighter: '<path d="M11 24 21 8l5 3-9 16z" fill="#f59e0b"/><path d="M6 29h14" stroke="#f59e0b" stroke-width="4" opacity=".5"/>',
  eraser: '<path d="M8 22 18 10l8 7-9 10h-6z" fill="#fda4af"/><path d="M8 22l5 5" stroke="#1b2133" stroke-width="1.6"/><path d="M15 27h12" stroke="#1b2133" stroke-width="1.6" stroke-linecap="round"/>',
};
const toolArt = (id) => `<svg viewBox="0 0 34 34" aria-hidden="true">${TI[id]}</svg>`;
const IC = {
  text: '<path d="M5.5 7V5h13v2M12 5v14M9.3 19h5.4"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
  circle: '<circle cx="12" cy="12" r="7.5"/>',
  triangle: '<path d="M12 4.5 20 19H4z"/>',
  line: '<path d="M4 12h16"/>',
  arrow: '<path d="M4 12h15M14 7l5 5-5 5"/>',
  sticky: '<path d="M5 4.5h14v10.2L14.7 19H5z"/><path d="M14.7 19v-4.3H19"/>',
  table: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.6h16M9.6 4v16"/>',
  chart: '<path d="M4 20h16M7.2 16.5v-5M12 16.5V6.5M16.8 16.5v-8"/>',
  qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>',
  frames: '<rect x="4" y="4" width="16" height="16" rx="8"/><path d="m7 16 3-3 2 2 3-3 2 2"/>',
  resize: '<path d="M4 9.5V4h5.5M20 14.5V20h-5.5M4 4l6.2 6.2M20 20l-6.2-6.2"/>',
  translate: '<path d="M4 6.2h9M8.5 4v2.2M11 6.2c-.6 3.6-3 6.4-6.5 8M6.8 9.4c1 1.9 2.5 3.4 4.6 4.4"/><path d="M12.8 20 16.4 12l3.6 8M14.1 17.2h4.6"/>',
  comment: '<path d="M20 11.3c0 3.9-3.6 7-8 7-1.1 0-2.2-.2-3.1-.6L4.5 19.4l1.3-3.7A6.6 6.6 0 0 1 4 11.3c0-3.9 3.6-7 8-7s8 3.1 8 7z"/>',
  notes: '<path d="M4 6.5h10M4 10.5h7M4 14.5h4.5"/><path d="M10.5 20l.8-3.3 7.1-7.1a1.7 1.7 0 0 1 2.4 2.4l-7.1 7.1z"/>',
  history: '<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3M4.6 4.3v3.9h3.9"/><path d="M12 8.2V12l2.6 1.6"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10.2v3.6l2.4 1.6M9.5 3.6h5M12 3.6v2.9"/>',
  present: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="1.6"/><path d="m10.3 7.9 4 2.3-4 2.3z"/><path d="M12 16v3.5M8.5 19.5h7"/>',
  download: '<path d="M12 4v10.8M7.6 10.4 12 14.8l4.4-4.4M5 19.5h14"/>',
  write: '<path d="m4.5 19.5 10-10M13 8l3 3"/><path d="M17.5 3.5v3M16 5h3M20 9.5v2M19 10.5h2"/>',
  cutout: '<circle cx="12" cy="9" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/><path d="M3.5 3.5h3M17.5 3.5h3M3.5 3.5v3M20.5 3.5v3" />',
  layers: '<path d="m12 4 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/>',
  enhance: '<path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/><circle cx="12" cy="12" r="4"/>',
  animate: '<path d="M5 12h3M5 8h6M5 16h6"/><circle cx="16" cy="12" r="4"/>',
  code: '<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 5l-3 14"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><circle cx="9" cy="10" r="1.7"/><path d="m4 17.5 5-4.6 3.5 3 3-2.5 4.5 4"/>',
  erase: '<path d="M8 19h11M5.5 15.5l8-8 5 5-6.5 6.5H9z"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-6.3 6.3M4 20l6.3-6.3"/>',
  wand: '<path d="m4.5 19.5 10-10M13 8l3 3"/><path d="M19 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
  speak: '<path d="M4.5 9.5h3.2L12 5.5v13l-4.3-4H4.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/>',
};
export const toolIcon = (n) => `<svg class="ads-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IC[n] || ""}</svg>`;

// ---------- quick-add items: spec + our own SVG fallback
const svgWrap = (vb, w, hgt, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${hgt}">${body}</svg>`;
export const QUICK = {
  square: { label: "Square", icon: "square", kit: "shape", spec: { kind: "rect", d: "M0 0H100V100H0Z", vb: "0 0 100 100", fill: "#5b4cf0", name: "Square", rel: 0.3, aspect: 1 }, svg: () => svgWrap("0 0 100 100", 300, 300, '<path d="M0 0H100V100H0Z" fill="#5b4cf0"/>') },
  circle: { label: "Circle", icon: "circle", kit: "shape", spec: { kind: "ellipse", d: "M50 0A50 50 0 1 1 49.99 0Z", vb: "0 0 100 100", fill: "#14b8a6", name: "Circle", rel: 0.3, aspect: 1 }, svg: () => svgWrap("0 0 100 100", 300, 300, '<circle cx="50" cy="50" r="50" fill="#14b8a6"/>') },
  triangle: { label: "Triangle", icon: "triangle", kit: "shape", spec: { kind: "polygon", sides: 3, d: "M50 0L100 100H0Z", vb: "0 0 100 100", fill: "#ff7a59", name: "Triangle", rel: 0.3, aspect: 1 }, svg: () => svgWrap("0 0 100 100", 300, 300, '<path d="M50 0L100 100H0Z" fill="#ff7a59"/>') },
  line: { label: "Line", icon: "line", kit: "shape", spec: { kind: "line", d: "M0 5H100", vb: "0 0 100 10", fill: "none", stroke: "#1b2133", strokeWidth: 3, name: "Line", rel: 0.45, aspect: 10 }, svg: () => svgWrap("0 0 100 10", 450, 45, '<path d="M0 5H100" stroke="#1b2133" stroke-width="3"/>') },
  arrow: { label: "Arrow", icon: "arrow", kit: "shape", spec: { kind: "arrow", d: "M0 6H94", vb: "0 0 100 12", fill: "none", stroke: "#1b2133", strokeWidth: 3, arrow: "end", name: "Arrow", rel: 0.45, aspect: 100 / 12 }, svg: () => svgWrap("0 0 100 12", 450, 54, '<path d="M0 6H92" stroke="#1b2133" stroke-width="3"/><path d="M88 1 99 6 88 11z" fill="#1b2133"/>') },
  sticky: { label: "Sticky note", icon: "sticky", kit: "shape", spec: { kind: "sticky", d: "M0 0H100V100H0Z", vb: "0 0 100 100", fill: "#ffe68a", radius: 3, text: "Your note", name: "Sticky note", rel: 0.25, aspect: 1 }, svg: () => svgWrap("0 0 100 100", 300, 300, '<rect width="100" height="100" rx="3" fill="#ffe68a"/><path d="M0 92h100v8H0z" fill="#000" opacity=".05"/><text x="10" y="24" font-family="Arial, sans-serif" font-size="11" fill="#3d3a2a">Your note</text>') },
  table: { label: "Table", icon: "table", kit: "table", spec: { rows: 3, cols: 3, cells: [["Item", "Qty", "Price"], ["Tea", "2", "Rs 200"], ["Cake", "1", "Rs 450"]], header: true, style: { head: "#5b4cf0", stripe: "#f4f3ff", border: "#d9dcea" }, name: "Table", rel: 0.5, aspect: 1.6 }, svg: () => tableSvg() },
  chart: { label: "Chart", icon: "chart", kit: "chart", spec: { kind: "column", title: "Sales", labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "2026", values: [12, 19, 15, 24] }], name: "Chart", rel: 0.5, aspect: 1.4 }, svg: () => chartSvg() },
};
function tableSvg() {
  const c = QUICK.table.spec.cells; let b = "";
  c.forEach((row, r) => row.forEach((v, k) => { const x = k * 100, y = r * 40; b += `<rect x="${x}" y="${y}" width="100" height="40" fill="${r === 0 ? "#5b4cf0" : r % 2 ? "#ffffff" : "#f4f3ff"}" stroke="#d9dcea"/><text x="${x + 10}" y="${y + 25}" font-family="Arial, sans-serif" font-size="14" font-weight="${r === 0 ? 700 : 400}" fill="${r === 0 ? "#ffffff" : "#1b2133"}">${esc(v)}</text>`; }));
  return svgWrap("0 0 300 120", 480, 192, b);
}
function chartSvg() {
  const s = QUICK.chart.spec, v = s.series[0].values, max = Math.max(...v); let b = `<text x="10" y="18" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#1b2133">${esc(s.title)}</text><path d="M30 150H270" stroke="#d9dcea"/>`;
  v.forEach((n, i) => { const hh = (n / max) * 110, x = 45 + i * 58; b += `<rect x="${x}" y="${150 - hh}" width="36" height="${hh}" rx="3" fill="${["#5b4cf0", "#2f80ff", "#14b8a6", "#ff7a59"][i % 4]}"/><text x="${x + 18}" y="166" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#657089">${esc(s.labels[i])}</text>`; });
  return svgWrap("0 0 300 172", 420, 241, b);
}
export function quickItem(id, category = "palette") { const q = QUICK[id]; return { kit: q.kit, spec: q.spec, svg: q.svg(), opts: { panel: PANEL, category, item: id, name: q.label, rel: q.spec.rel, aspect: q.spec.aspect } }; }

// ---------- tool list (real tools work or open our real apps; AI-only ones are honest "coming soon")
export const AI_SOON = {
  "ai-image": ["AI image", "image", "Describe a picture and get it"],
  "erase-objects": ["Erase objects", "erase", "Brush over something to remove it"],
  "expand-image": ["Expand image", "expand", "Grow a photo past its edges"],
  "edit-by-typing": ["Edit by typing", "wand", "Change a photo by describing it"],
};
export const AI_REAL = {
  "background-remover": ["Background remover", "cutout", "Runs on your device", "/design/photo/?mode=bg"],
  "magic-layers": ["Magic Layers", "layers", "Split an image into layers", "/design/layers/"],
  "image-enhancer": ["Image enhancer", "enhance", "Sharper, larger photos", "/design/photo/?mode=enhance"],
  "magic-animate": ["Magic Animate", "animate", "Animate a design, save a video", "/design/studio/?mode=animate"],
  "text-to-speech": ["Text to speech", "speak", "Hear your text read aloud", "/design/voice/"],
  "code": ["Code", "code", "Small web widgets", "/design/code/"],
};

export function renderTools(box, ctx) {
  ensureCss(CSS);
  const opts = ctx.opts || {}, shell = ctx.shell || {};
  const myId = box?.dataset?.panel || "draw";
  const root = h("div", { class: "kt-root kt-tools kt-draw" });
  box.append(root);

  // An editor whose own tools are its main UI keeps them first (normally they have their own "Tools" rail item).
  if (ctx.own && ctx.ownMeta?.primary) {
    const own = section("own", ctx.ownMeta?.title || ctx.ownMeta?.label || `${opts.kind || "Editor"} tools`);
    const host = h("div", { class: "kt-own" }); own.append(host);
    try { ctx.own(host); } catch (e) { console.error(e); }
    if (host.childNodes.length) root.append(own);
  }

  // ----- Draw
  const settings = loadSettings();
  let tool = null;
  const native = opts.draw && typeof opts.draw.start === "function" ? opts.draw : null;
  const layer = native ? null : new DrawLayer(ctx, { onState: () => sync() });
  const drawSec = section("draw", "Draw");
  const toolRow = h("div", { class: "kt-drawtools", role: "group", "aria-label": "Pens" });
  const toolBtns = DRAW_TOOLS.map((t) => {
    const b = h("button", { type: "button", class: "kt-dtool", "data-kit-tool": t.id, "aria-pressed": "false", title: t.label, html: toolArt(t.id) }, h("span", { text: t.label }));
    b.addEventListener("click", () => pick(tool === t.id ? null : t.id));
    toolRow.append(b); return b;
  });
  const colors = [...new Set([...(loadBrand().colors || []), ...DEFAULT_COLORS].map((c) => String(c).toLowerCase()))].slice(0, 12);
  const colorRow = h("div", { class: "kt-colors", role: "group", "aria-label": "Colour" });
  const colorBtns = colors.map((c) => { const b = h("button", { type: "button", class: "kt-color", style: `--c:${c}`, "data-color": c, "aria-label": `Colour ${c}`, "aria-pressed": "false", title: c, onclick: () => set({ color: c }) }); colorRow.append(b); return b; });
  const pickIn = h("input", { type: "color", value: "#5b4cf0", "aria-label": "Pick any colour" });
  pickIn.addEventListener("input", () => set({ color: pickIn.value }));
  colorRow.append(h("label", { class: "kt-color kt-pick", title: "Pick any colour" }, pickIn));
  const weight = h("input", { type: "range", min: 1, max: 60, step: 1, "aria-label": "Size", "data-kit": "draw-weight" });
  const trans = h("input", { type: "range", min: 0, max: 95, step: 5, "aria-label": "Transparency", "data-kit": "draw-transparency" });
  const wOut = h("output"), tOut = h("output");
  weight.addEventListener("input", () => set({ size: +weight.value })); trans.addEventListener("input", () => set({ trans: +trans.value }));
  const sets = h("div", { class: "kt-dset" },
    h("div", { class: "kt-dlabel2", text: "Colour" }), colorRow,
    h("label", { class: "kt-drow" }, h("span", { text: "Size" }), weight, wOut),
    h("label", { class: "kt-drow" }, h("span", { text: "Transparency" }), trans, tOut));
  const note = h("p", { class: "kt-dnote", role: "status", "aria-live": "polite" });
  const doneB = h("button", { type: "button", class: "ads-btn sm primary", text: "Done", "data-kit": "draw-done-panel", onclick: () => pick(null) });
  const undoB = h("button", { type: "button", class: "ads-btn sm", text: "Undo", onclick: () => (native ? native.undo?.() : layer.undo()) });
  const actions = h("div", { class: "kt-dactions" }, undoB, doneB);
  drawSec.append(toolRow, sets, note, actions);
  root.append(drawSec);

  function cur() { return settings[tool || "pen"]; }
  function sync() {
    const s = cur(), t = tool || "pen";
    for (const b of toolBtns) b.setAttribute("aria-pressed", String(b.dataset.kitTool === tool));
    for (const b of colorBtns) b.setAttribute("aria-pressed", String(b.dataset.color === String(s.color).toLowerCase()));
    weight.value = s.size; wOut.textContent = String(s.size); trans.value = s.trans; tOut.textContent = `${s.trans}%`;
    colorRow.hidden = t === "eraser"; sets.querySelector(".kt-dlabel2").hidden = t === "eraser"; trans.closest(".kt-drow").hidden = t === "eraser";
    actions.hidden = !tool;
    const palOn = !tool ? "select" : sig ? "signature" : tool === "pen" ? "pen" : "";
    for (const b of palette?.querySelectorAll("[data-pal]") || []) b.classList.toggle("on", b.dataset.pal === palOn);
    const pending = layer?.strokes.length || 0;
    note.textContent = !tool ? "Pick a pen, then draw on the page with the mouse, a pen or a finger."
      : native ? `Drawing with the ${TOOL[tool].label.toLowerCase()}. Press Done when you are finished.`
      : tool === "eraser" ? "The eraser removes strokes you have not finished yet. To remove a finished drawing, select it and press Delete."
      : pending ? "Pause or press Done: your strokes become one drawing you can move and resize." : `Draw on the page with the ${TOOL[tool].label.toLowerCase()}.`;
  }
  function apply() {
    if (!tool) return;
    const p = drawParams(tool, cur());
    if (native) { try { native.start(p); } catch (e) { ctx.toast?.(e?.message || "Drawing could not start."); } }
    else if (!layer.start(p)) ctx.toast?.("Drawing is not available in this editor.");
  }
  function set(patch) { Object.assign(settings[tool || "pen"], patch); saveSettings(settings); sync(); apply(); }
  let sig = false;
  function pick(id) {
    tool = id; if (id !== "pen") sig = false;
    if (!id) { if (native) { try { native.stop?.(true); } catch {} } else layer.stop(true); }
    else apply();
    sync();
  }

  // ----- Canva's floating tool palette over the page while Draw is open
  let palette = null;
  const palItem = (id, label, art, act) => h("button", { type: "button", class: "kt-palb", "data-pal": id, "aria-label": label, title: label, html: art, onclick: act });
  const quick = (id) => run(ctx, null, quickItem(id));
  function showPalette() {
    const st = shell.slots?.stage; if (!st) return;
    if (!palette) {
      palette = h("div", { class: "kt-palette", role: "toolbar", "aria-orientation": "vertical", "aria-label": "Drawing tools", "data-kit": "palette" },
        h("button", { type: "button", class: "kt-palx", "aria-label": "Close the tools", title: "Close", html: PAL.close, onclick: () => { pick(null); ctx.closePanel?.(); } }),
        h("div", { class: "kt-palcol" },
          palItem("select", "Select", PAL.select, () => pick(null)),
          palItem("pen", "Pen", PAL.pen, () => { sig = false; pick("pen"); }),
          palItem("shapes", "Square", PAL.shapes, () => quick("square")),
          palItem("line", "Line", PAL.line, () => quick("line")),
          palItem("sticky", "Sticky note", PAL.sticky, () => quick("sticky")),
          palItem("text", "Text box", PAL.text, () => run(ctx, null, textItem(TEXT_BOX, { panel: PANEL, category: "palette", item: "text", name: "Text box" }))),
          palItem("signature", "Signature: draw it with a fine pen", PAL.signature, () => { Object.assign(settings.pen, { color: "#1b2133", size: 3, trans: 0 }); saveSettings(settings); sig = true; pick("pen"); }),
          palItem("table", "Table", PAL.table, () => quick("table"))));
    }
    if (!palette.isConnected) st.append(palette);
    sync();
  }
  const hidePalette = () => palette?.remove();
  // Opening the panel shows the palette; leaving the panel (or the editing mode) finishes the drawing and hides it.
  box._shown = () => showPalette();
  if (shell.el?.dataset?.panel === myId || !shell.el) showPalette();
  if (shell.el && typeof MutationObserver === "function") new MutationObserver(() => {
    const away = shell.el.dataset.panel !== myId || (shell.el.dataset.mode && shell.el.dataset.mode !== "edit");
    if (away) { if (tool) pick(null); hidePalette(); } else showPalette();
  }).observe(shell.el, { attributes: true, attributeFilter: ["data-panel", "data-mode"] });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tool && shell.el?.isConnected !== false) pick(null); });
  sync();
  root._draw = { pick, layer, settings: () => settings, get tool() { return tool; }, palette: () => palette };
  return root;
}
const PAL = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  select: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l12 6.5-5.4 1.4L10.5 18z" fill="none" stroke="#5b4cf0" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19l1.4-4.6L16 4.8l2.8 2.8-9.6 9.6z" fill="#e11d48"/><path d="M5 19l1.4-4.6 3.2 3.2z" fill="#1b2133"/></svg>',
  shapes: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="5" fill="#1b2133"/><rect x="10" y="10" width="9" height="9" rx="1.5" fill="#657089"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5" stroke="#2f80ff" stroke-width="2.2" stroke-linecap="round"/></svg>',
  sticky: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v9.5L14.5 19H5z" fill="#f5b70a"/><path d="M14.5 19v-4.5H19" fill="#d99a00"/></svg>',
  text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7V5h12v2M12 5v14M9.5 19h5" fill="none" stroke="#7c3aed" stroke-width="2.2" stroke-linecap="round"/></svg>',
  signature: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c2-6 4-9 5-8s-2 8 0 8 3-5 4-5 0 4 2 4 2-2 5-2" fill="none" stroke="#1b2133" stroke-width="1.6" stroke-linecap="round"/><path d="M4 20h16" stroke="#1b2133" stroke-width="1.2"/></svg>',
  table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="#1e3a8a" stroke-width="1.6"/><path d="M4 9.5h16M4 14h16M9.5 5v14M14.5 5v14" stroke="#1e3a8a" stroke-width="1.3"/></svg>',
};

// ---------- QR code form (our own encoder: /design/code/qr.js)
export function qrBox(ctx, panel = PANEL) {
  ensureCss(CSS);
  const inp = h("input", { type: "url", class: "ads-in", value: "https://asaandesk.com", "aria-label": "Link or text for the QR code", "data-kit": "qr-text" });
  const col = h("input", { type: "color", value: "#1b2133", "aria-label": "QR code colour", class: "kt-qrcol" });
  const prev = h("div", { class: "kt-qrprev", "aria-hidden": "true" });
  const status = h("p", { class: "ads-muted", role: "status" });
  const add = h("button", { type: "button", class: "ads-btn sm primary", text: "Add QR code", "data-kit-item": "qr" });
  const box = h("div", { class: "kt-form", hidden: true, "data-kit-sec": "qr" }, inp, h("div", { class: "ads-row" }, h("label", { class: "kt-drow", style: "grid-template-columns:auto auto" }, h("span", { text: "Colour" }), col), add), prev, status);
  let qr = null;
  const make = async () => { qr ||= await import("../../code/qr.js"); const text = inp.value.trim(); if (!text) throw new Error("Type a link or some text first."); return qr.qrSvg(text, { margin: 2, dark: col.value, px: 512, title: "QR code" }); };
  const preview = async () => { try { prev.innerHTML = await make(); status.textContent = ""; } catch (e) { prev.innerHTML = ""; status.textContent = e?.message || "That text is too long for a QR code."; } };
  inp.addEventListener("input", () => { clearTimeout(box._t); box._t = setTimeout(preview, 250); }); col.addEventListener("input", preview);
  add.addEventListener("click", async () => {
    let markup; try { markup = await make(); } catch (e) { status.textContent = e?.message || "That text is too long for a QR code."; return; }
    add.classList.add("busy");
    const r = await insertWithFallback(ctx, "svg", { markup, kind: "qr", rel: 0.25, aspect: 1, name: "QR code" }, undefined, { panel, category: "apps", item: "qr", name: "QR code", rel: 0.25, aspect: 1, svgKind: "qr" });
    add.classList.remove("busy");
    status.textContent = r.ok ? "QR code added. Test it with your phone camera." : r.error || "Could not add it.";
  });
  const obs = typeof MutationObserver === "function" ? new MutationObserver(() => { if (!box.hidden && !prev.innerHTML) preview(); }) : null; obs?.observe(box, { attributes: true, attributeFilter: ["hidden"] });
  return box;
}
