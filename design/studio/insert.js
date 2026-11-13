// Studio insert adapter for the shared left-rail panel kit (../shared/panels/, LEFT-RAIL PANELS PARITY): every kit item
// becomes a native Studio layer — text boxes, shape layers, recolourable element (sticker) layers for vector graphics
// and custom shapes, chart and table layers, photo frames (Studio shapes or the kit's own outline), grids of frames,
// image layers for photos / pictures / animated stickers, page numbers and drawings. A click puts it in the middle of
// the page, a drop where it was dropped (pt.clientX / clientY). See ../shared/panels/index.js for the interface.
import { S, curPage, pageSize, selLayers, layerById, commit, emit, toast } from "./state.js";
import * as E from "./editor.js";
import { textLayer, imageLayer, shapeLayer, elementLayer, chartLayer, tableLayer, frameLayer, newId, FAMILIES } from "./model.js";
import { textHeight } from "./textlayout.js";
import { coverCrop } from "./shapes.js";
import { makeGroup } from "./geometry.js";
import { addPageNumbers, countPageNumbers } from "./pagetools.js";
import { startDraw, stopDraw, undoStroke, drawing } from "./draw.js";

let U = null;
const util = () => (U ||= import("../shared/insert-adapt.js"));
let ELS = null;
const elements = () => (ELS ||= import("/pdf-editor/elements.js"));

const need = () => { if (!S.design) throw new Error("Open a design first."); if (S.editing) E.endEdit(); };
const base = () => { const { w, h } = pageSize(); return Math.min(w, h); };
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v.toLowerCase() : /^#[0-9a-f]{3}$/i.test(v || "") ? "#" + [...v.slice(1)].map((c) => c + c).join("").toLowerCase() : d);
/** Page point of a kit drop point (null for a click). */
function pagePt(pt) {
  if (!pt) return null;
  let cx = pt.clientX, cy = pt.clientY;
  if (cx == null) { const r = window.adShell?.slots?.stage?.getBoundingClientRect?.(); if (!r) return null; cx = r.left + pt.x; cy = r.top + pt.y; }
  return E.toPage(cx, cy);
}
/** Adds a layer at the drop point or in the middle of the page (cascading copies). */
function place(l, pt, { select = true } = {}) {
  const p = pagePt(pt);
  if (p) return E.addLayer(l, { at: p, select });
  const { w, h } = pageSize();
  l.x = (w - l.w) / 2; l.y = (h - l.h) / 2;
  if (l.x === 0 && l.y === 0) l.x = 0.001;
  return E.addLayer(l, { select });
}
/** The layer under a drop point (top-most, not locked), or null. */
function layerAt(pt) {
  if (!pt) return null;
  let cx = pt.clientX, cy = pt.clientY;
  if (cx == null) return null;
  const el = document.elementFromPoint?.(cx, cy)?.closest?.(".st-layer");
  return el ? layerById(el.dataset.id) : null;
}
function fillFrame(f, src, nw, nh, selectId = f.id) {
  f.frame.image = { src, nw, nh, crop: coverCrop(nw || 1, nh || 1, f.w, f.h) };
  E.renderLayer(f); commit("photo"); E.select([selectId]); emit("layers");
  toast("Photo placed in the frame.");
}

function frameInGroup(g, p) {
  const kids = (g.children || []).filter((c) => c.type === "frame");
  if (!kids.length) return null;
  if (p && !g.rotation) { const k = kids.find((c) => p[0] >= g.x + c.x && p[0] <= g.x + c.x + c.w && p[1] >= g.y + c.y && p[1] <= g.y + c.y + c.h); if (k) return k; }
  return kids.find((c) => !c.frame.image) || kids[0];
}

/* ---------------- text ---------------- */
function textOpts(spec, m) {
  const size = Math.max(6, Math.round((+spec.rel > 0 ? +spec.rel : { heading: 0.075, subheading: 0.045, body: 0.03, caption: 0.022 }[spec.role] || 0.03) * m * 10) / 10);
  const bold = spec.bold ?? (spec.weight ? +spec.weight >= 600 : spec.role === "heading" || spec.role === "subheading");
  const o = {
    size, family: FAMILIES.includes(spec.family) ? spec.family : "sans", bold: !!bold, italic: !!spec.italic,
    color: hex(spec.color, "#1b2133"), align: ["left", "center", "right", "justify"].includes(spec.align) ? spec.align : spec.role === "heading" || spec.role === "subheading" ? "center" : "left",
    lineHeight: +spec.lineHeight > 0 ? +spec.lineHeight : 1.2, letterSpacing: Math.round((+spec.letterSpacing || 0) * size * 100) / 100,
  };
  if (spec.stroke && hex(spec.stroke)) o.outline = { width: Math.max(0.5, (+spec.strokeWidth || 0.04) * size), color: hex(spec.stroke) };
  if (spec.background && hex(spec.background)) o.bg = { color: hex(spec.background), pad: 0.45, radius: 0.3 };
  if (spec.name) o.name = String(spec.name).slice(0, 40);
  return o;
}
function makeText(spec, m) {
  const { w: W } = pageSize();
  const o = textOpts(spec, m);
  const content = String(spec.content ?? "Your text here");
  const longest = Math.max(1, ...content.split("\n").map((s) => s.length));
  const w = +spec.width > 0 ? Math.min(W, +spec.width * m) : Math.min(W * 0.9, Math.max(o.size * 4, Math.min(W * 0.8, longest * o.size * 0.62 + o.size)));
  const l = textLayer(content, { w, ...o });
  if (spec.uppercase) l.text.upper = true;
  l.h = textHeight(l.text, l.w);
  return l;
}

/* ---------------- vector parts -> element layer ---------------- */
function vectorLayer(conv, { name, kind, w, h }) {
  const el = { id: "kit-" + String(kind || "graphic").replace(/[^\w-]/g, "").slice(0, 24), name: name || "Graphic", vb: conv.vb, parts: conv.parts, defaults: conv.defaults };
  return elementLayer(el, { w, h, name: (name || "Graphic").slice(0, 40) });
}
const SHAPE_KIND = { rect: "rect", square: "rect", rectangle: "rect", rounded: "rect", "rounded-rect": "rect", roundrect: "rect", ellipse: "ellipse", circle: "ellipse", oval: "ellipse", triangle: "triangle", line: "line", arrow: "arrow", star: "star", polygon: "polygon", hexagon: "polygon", pentagon: "polygon", octagon: "polygon", heart: "heart" };
const SIDES = { hexagon: 6, pentagon: 5, octagon: 8 };
const dashName = (d) => (!d ? null : d === "dashed" || d === "dotted" ? d : Array.isArray(d) && d.length ? (d[0] <= 1.5 ? "dotted" : "dashed") : "dashed");

export function makeStudioInsert() {
  const ins = {
    /** Photos, uploads and pictures. A drop on a photo frame (or a click while one frame is selected) fills the frame. */
    async image(src, name = "Image", pt) {
      need();
      const A = await util();
      let nw = 0, nh = 0;
      if (/^data:image\/svg\+xml[^,]*,/.test(src) && !/;base64,/.test(src)) { try { const s = A.svgSize(decodeURIComponent(src.slice(src.indexOf(",") + 1))); nw = s.w; nh = s.h; } catch {} }
      if (!nw || !nh) ({ nw, nh } = await A.imageSize(src));
      const hit = layerAt(pt), sel = !pt && selLayers().length === 1 ? selLayers()[0] : null;
      const frame = hit?.type === "frame" ? hit : sel?.type === "frame" ? sel : null;
      if (frame && !frame.locked) { fillFrame(frame, src, nw, nh); return; }
      // a device / film frame (a group with photo frames): the window under the pointer, else the first empty one
      const grp = hit?.type === "group" ? hit : sel?.type === "group" ? sel : null;
      const win = grp && !grp.locked ? frameInGroup(grp, pagePt(pt)) : null;
      if (win) { fillFrame(win, src, nw, nh, grp.id); return; }
      const { w, h } = pageSize();
      nw ||= 400; nh ||= 300;
      const k = Math.min(1, (w * 0.6) / nw, (h * 0.6) / nh);
      place(imageLayer(src, { w: Math.max(8, nw * k), h: Math.max(8, nh * k), nw, nh, name: String(name || "Image").slice(0, 40) }), pt);
    },
    /** Shapes: Studio's own shape kinds natively; any other outline (callouts, flowchart, custom lines) as a
     *  recolourable element layer from the kit's path. */
    async shape(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const key = String(spec.kind || "").toLowerCase(), kind = SHAPE_KIND[key];
      const fill = spec.fill === "none" ? "none" : hex(spec.fill, S.lastColor || "#5b4cf0"), stroke = spec.stroke && spec.stroke !== "none" ? hex(spec.stroke, "#1b2133") : "none";
      const lineLike = kind === "line" || kind === "arrow";
      const fancyLine = lineLike && ((spec.arrow && !["end", "none", false].includes(spec.arrow)) || (kind === "arrow" && spec.dash) || (kind === "line" && spec.arrow === "end" && spec.dash));
      const vb = Array.isArray(spec.vb) ? (spec.vb.length === 4 ? spec.vb : [0, 0, spec.vb[0], spec.vb[1]]) : null;
      if ((!kind || fancyLine) && spec.d && vb) {
        const box = A.relBox(spec.rel, vb[2] / vb[3], m);
        const d = A.mapPath(spec.d, 1, 1, -vb[0], -vb[1]);
        if (!d) return false;
        const swv = +spec.strokeWidth > 0 ? +spec.strokeWidth : stroke !== "none" || fill === "none" ? Math.max(vb[2], vb[3]) * 0.03 : 0;
        const part = { d, fill: fill === "none" ? "none" : "$1", stroke: stroke !== "none" ? (fill === "none" ? "$1" : "$2") : fill === "none" ? "$1" : "none", sw: swv };
        if (spec.dash) part.dash = Array.isArray(spec.dash) ? spec.dash : spec.dash === "dotted" ? [0.01, swv * 2] : [swv * 3, swv * 2];
        const defaults = fill === "none" ? { c1: stroke !== "none" ? stroke : "#1b2133" } : { c1: fill, ...(stroke !== "none" ? { c2: stroke } : {}) };
        place(vectorLayer({ vb: [vb[2], vb[3]], parts: [part], defaults }, { name: spec.name || "Shape", kind: "shape-" + (key || "custom"), w: box.w, h: box.h }), pt);
        return;
      }
      if (!kind) return false;
      const box = A.relBox(spec.rel, lineLike ? Math.max(4, +spec.aspect || 6) : +spec.aspect || (vb ? vb[2] / vb[3] : 1), m);
      const lw = Math.max(4, Math.round(m * 0.008));
      const o = { w: box.w, h: lineLike ? Math.max(24, m * 0.04) : box.h, fill, stroke, strokeWidth: lineLike ? lw : stroke !== "none" ? Math.max(1, (+spec.strokeWidth || 0.01) * (+spec.strokeWidth > 1 ? 1 : m)) : 0, name: spec.name || undefined };
      if (key === "rounded" || key === "rounded-rect" || key === "roundrect") o.radius = Math.min(o.w, o.h) * 0.18;
      else if (+spec.radius > 0) o.radius = +spec.radius <= 0.5 ? +spec.radius * Math.min(o.w, o.h) : +spec.radius;
      if (kind === "polygon") o.sides = +spec.sides || SIDES[key] || 6;
      if (kind === "star") o.points = +spec.points || 5;
      const l = shapeLayer(kind, o);
      if (lineLike) l.shape.stroke = stroke !== "none" ? stroke : fill !== "none" ? fill : "#1b2133";
      const dn = dashName(spec.dash);
      if (dn && kind !== "arrow") l.shape.dash = dn;
      place(l, pt);
    },
    /** Graphics, stickers, icons, 3D, forms, animations: the library's own element when the kit names it, else the
     *  SVG's vector parts as an element layer (recolourable), else a picture (gradients, animation). */
    async svg(markup, opts = {}, pt) {
      need();
      const A = await util(), m = base();
      if (opts.elementId) {
        const M = await elements();
        const el = M.ELEMENTS.find((x) => x.id === opts.elementId);
        if (el) {
          const box = A.relBox(opts.rel, el.vb[0] / el.vb[1], m, 0.32);
          place(elementLayer(el, { w: box.w, h: box.h, name: opts.name || el.name }), pt);
          return;
        }
      }
      const sz = A.svgSize(markup), aspect = +opts.aspect > 0 ? +opts.aspect : sz.w > 0 && sz.h > 0 ? sz.w / sz.h : 1;
      const box = A.relBox(opts.rel, aspect, m, 0.32);
      const conv = A.svgToParts(markup);
      if (conv) { place(vectorLayer(conv, { name: opts.name, kind: opts.kind, w: box.w, h: box.h }), pt); return; }
      place(imageLayer(A.svgUrl(markup), { w: box.w, h: box.h, nw: Math.round(sz.w || box.w), nh: Math.round(sz.h || box.h), name: String(opts.name || "Graphic").slice(0, 40) }), pt);
    },
    /** One text box (Add a text box, default styles, brand fonts, captions, Magic Write results). Clicks start editing. */
    async text(spec = {}, pt) {
      need();
      if (typeof spec === "string") spec = { content: spec, role: "body" };
      const l = makeText(spec, base());
      place(l, pt);
      if (!pt) try { E.startEdit(l.id, { selectAll: true }); } catch {}
    },
    /** Font combinations: the text boxes keep their places around the combination's centre, are added together and
     *  selected together (each stays a text box you can type in; Group in the toolbar joins them). */
    async textGroup(specs = [], pt) {
      need();
      const list = (Array.isArray(specs) ? specs : [specs]).filter(Boolean);
      if (!list.length) return false;
      const m = base(), { w: W, h: H } = pageSize();
      const layers = list.map((s) => makeText(s, m));
      const hasOff = list.some((s) => s.dx != null || s.dy != null);
      if (hasOff) layers.forEach((l, i) => { l.x = (+list[i].dx || 0) * m - l.w / 2; l.y = (+list[i].dy || 0) * m - l.h / 2; });
      else { let y = 0; for (const l of layers) { l.x = -l.w / 2; l.y = y; y += l.h + l.text.size * 0.25; } }
      const x0 = Math.min(...layers.map((l) => l.x)), y0 = Math.min(...layers.map((l) => l.y)), x1 = Math.max(...layers.map((l) => l.x + l.w)), y1 = Math.max(...layers.map((l) => l.y + l.h));
      const p = pagePt(pt) || [W / 2, H / 2];
      let dx = p[0] - (x0 + x1) / 2, dy = p[1] - (y0 + y1) / 2;
      // cascade repeated adds so they don't hide each other
      const pg = curPage();
      while (pg.layers.some((o) => o.type === "text" && Math.abs(o.x - (layers[0].x + dx)) < 1 && Math.abs(o.y - (layers[0].y + dy)) < 1)) { dx += 20; dy += 20; }
      for (const l of layers) { l.x += dx; l.y += dy; pg.layers.push(l); }
      E.renderPage(); E.select(layers.map((l) => l.id)); commit("add"); emit("layers");
    },
    /** Charts: Studio chart layers (bar, column, line, area, pie, donut, progress); "number" is a big number with its label. */
    async chart(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const c = A.chartModel(spec);
      if (c.kind === "number") {
        // Big number: the figure, its label and the change (kit: value "1,250", label, delta "+12% this month")
        const v = spec.value != null ? String(spec.value) : `${c.series[0]?.values[0] ?? 0}${spec.unit || ""}`, ink = hex((spec.colors || [])[0], "#5b4cf0");
        const lines = [{ content: v, role: "heading", rel: 0.1, bold: true, color: ink, align: "center", dy: -0.045 }, { content: spec.label || c.title || c.series[0]?.name || "Total", role: "body", rel: 0.03, align: "center", color: "#475569", dy: 0.035 }];
        if (spec.delta) lines.push({ content: String(spec.delta), role: "caption", rel: 0.024, bold: true, align: "center", color: /^-/.test(String(spec.delta)) ? "#e11d48" : "#16a34a", dy: 0.08 });
        return ins.textGroup(lines, pt);
      }
      let kind = { column: "bar", bar: "hbar", hbar: "hbar", line: "line", area: "area", pie: "pie", donut: "donut", progress: "progress", progressbar: "progressbar", stacked: "stacked", funnel: "funnel" }[c.kind] || "bar";
      if (spec.stacked && (kind === "bar" || kind === "hbar")) kind = "stacked";
      let { labels, series } = c, title = c.title;
      if (kind === "progress") {
        // Progress ring / bar / gauge: one percentage (kit: value + label)
        const v = +spec.value >= 0 ? +spec.value : c.series[0]?.values[0] ?? 0;
        if (/bar/i.test(spec.name || "")) kind = "progressbar";
        labels = [spec.label || c.labels[0] || "Progress"]; series = [{ name: labels[0], values: [v, 100] }]; title = "";
      }
      const { ensureVector } = await import("./panels.js");
      await ensureVector();
      const box = A.relBox(spec.rel || 0.55, kind === "progress" || kind === "pie" || kind === "donut" ? 1.15 : kind === "progressbar" ? 4 : 1.45, m);
      place(chartLayer({ kind, title, labels, series, showValues: true }, { w: box.w, h: box.h, name: spec.name || "Chart" }), pt);
    },
    /** Tables: a Studio table layer with the kit's cells and style (header colour, stripes, borders). */
    async table(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const t = A.tableModel(spec);
      const { ensureVector } = await import("./panels.js");
      const v = await ensureVector();
      const tb = v.tables.newTable(t.rows, t.cols);
      tb.cells = t.cells; tb.header = t.header;
      const st = t.style || {};
      if (hex(st.head)) tb.headerFill = hex(st.head);
      if (st.headColor && hex(st.headColor)) tb.headerColor = hex(st.headColor);
      else if (hex(st.head)) { const n = parseInt(tb.headerFill.slice(1), 16), lum = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000; tb.headerColor = lum > 150 ? "#1b2133" : "#ffffff"; }
      if (st.stripe) tb.stripe = true;
      if (st.border === false || st.border === "none") tb.border = { color: "#ffffff", width: 0 };
      else if (hex(st.border)) tb.border = { color: hex(st.border), width: 1 };
      else if (st.border && typeof st.border === "object") tb.border = { color: hex(st.border.color, "#94a3b8"), width: +st.border.width >= 0 ? +st.border.width : 1 };
      const w = A.relBox(spec.rel || 0.6, 2, m).w * (t.cols > 4 ? 1.25 : 1);
      const l = tableLayer(tb, { w: Math.min(pageSize().w * 0.95, w), size: Math.max(10, Math.round(m * 0.022)), name: spec.name || "Table" });
      l.h = v.tableHeight(l.table, l.w);
      place(l, pt);
    },
    /** Photo frames: Studio frame layers (its ten shapes natively; any other outline from the kit's path); device
     *  frames come in as the device drawing with a frame on its screen, grouped. */
    async frame(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const shape = A.frameShapeOf(spec);
      const vb = Array.isArray(spec.vb) ? (spec.vb.length === 4 ? spec.vb : [0, 0, spec.vb[0], spec.vb[1]]) : null;
      const aspect = +spec.aspect > 0 ? +spec.aspect : vb ? vb[2] / vb[3] : 1;
      const box = A.relBox(spec.rel || 0.4, aspect, m);
      const screen = A.deviceScreen(spec);
      const pts = shape === "path" ? A.framePoints(spec) : null;
      const mk = (w, h) => { const l = frameLayer({ w, h, shape: pts ? "path" : shape === "path" ? "rect" : shape, name: String(spec.name || "Photo frame").slice(0, 40) }); if (pts) l.frame.pts = pts; return l; };
      if (screen && (spec.svg || spec.under != null) && vb) {
        // Device / film / instant photo: the body drawing, a photo frame in every window (rounded like the kit's
        // screen), the overlay (notch, shine) on top, as one group; photos dropped on it fill the window under them.
        const wrap = (m) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb[2]} ${vb[3]}">${m}</svg>`;
        const part = (svg, name) => { const c = A.svgToParts(svg); const l = c ? vectorLayer(c, { name, kind: "device", w: box.w, h: box.h }) : imageLayer(A.svgUrl(svg), { w: box.w, h: box.h, nw: Math.round(box.w), nh: Math.round(box.h), name }); l.x = 0; l.y = 0; return l; };
        const screens = Array.isArray(spec.screens) && spec.screens.length ? spec.screens : [screen];
        const k = box.w / vb[2], layers = [part(spec.under != null ? wrap(spec.under) : spec.svg, String(spec.name || "Device").slice(0, 40))];
        screens.forEach((s, i) => layers.push(frameLayer({ x: s[0] * box.w, y: s[1] * box.h, w: s[2] * box.w, h: s[3] * box.h, shape: "rect", radius: (+spec.screenRadius || 0) * k, name: screens.length > 1 ? `Photo ${i + 1}` : "Screen" })));
        if (spec.over) layers.push(part(wrap(spec.over), "Overlay"));
        place(makeGroup(layers, newId(), String(spec.name || "Device frame").slice(0, 40)), pt);
        return;
      }
      place(mk(box.w, box.h), pt);
    },
    /** Grids: the page filled with photo frames in the grid's layout (each cell takes a photo on drop), like Canva. */
    async grid(spec = {}) {
      need();
      const A = await util(), { w: W, h: H } = pageSize();
      const cells = A.gridRects(spec, { x: 0, y: 0, w: W, h: H });
      const pg = curPage(), ids = [];
      for (const c of cells) { const l = frameLayer({ ...c, shape: "rect", name: "Grid cell" }); pg.layers.push(l); ids.push(l.id); }
      E.renderPage(); E.select(ids); commit("grid"); emit("layers");
      toast(`Grid added: ${cells.length} photo spots. Drop photos on them.`);
    },
    /** Videos: Studio pages have no video layer; our own animated loops (SVG) come in as moving pictures, other clips as
     *  their cover picture (the kit's fallback). */
    async video(spec = {}, pt) {
      need();
      const src = String(spec.src || "");
      if (!/^data:image\/svg|\.svg(\?|$)/.test(src)) return false;
      const A = await util(), m = base();
      const box = A.relBox(spec.rel || 0.5, +spec.aspect > 0 ? +spec.aspect : 16 / 9, m);
      place(imageLayer(src, { w: box.w, h: box.h, nw: Math.round(box.w), nh: Math.round(box.h), name: String(spec.name || "Video").slice(0, 40) }), pt);
    },
    /** Page numbers on every page (bottom right), updated when pages move; options stay in Text › More text tools. */
    async pageNumber() {
      need();
      const { w, h } = pageSize();
      const had = countPageNumbers(S.design);
      const n = addPageNumbers(S.design, w, h, { format: S.design.pageNumbers?.format || "number", show: S.design.pageNumbers?.show || "all", spot: S.design.pageNumbers?.spot || "bottom-right", current: S.page });
      S.sel = []; E.renderAll(); commit("page-numbers"); emit("selection"); emit("pages");
      toast(had ? `Page numbers updated on ${n} page${n === 1 ? "" : "s"}.` : `Page numbers added to ${n} page${n === 1 ? "" : "s"}. They update when you add or move pages.`);
    },
    /** A drawing from the kit's drawing layer: its strokes as a vector element (recolourable), else a picture. */
    async drawing(markup, size = {}, pt) {
      need();
      const A = await util(), m = base(), sz = A.svgSize(markup);
      const w = +size.w > 0 ? +size.w : sz.w || m * 0.4, h = +size.h > 0 ? +size.h : sz.h || m * 0.4;
      const conv = A.svgToParts(markup);
      const l = conv ? vectorLayer(conv, { name: size.name || "Drawing", kind: "drawing", w, h }) : imageLayer(A.svgUrl(markup), { w, h, nw: Math.round(w), nh: Math.round(h), name: "Drawing" });
      place(l, pt);
    },
  };
  return ins;
}

/** Studio's own draw tool for the kit's Draw tools (Pen, Marker, Glow pen, Highlighter, Eraser). size: screen px. */
export const studioDraw = {
  start({ tool = "pen", color = "#5b4cf0", size = 6, alpha = 1 } = {}) {
    need();
    const z = S.zoom || 1, px = Math.max(1, (+size || 6) / z);
    startDraw({ tool, color: hex(color, "#5b4cf0"), size: px, alpha: tool === "highlighter" ? Math.min(+alpha || 0.4, 0.6) : +alpha || 1, glow: tool === "glow", erase: tool === "eraser" });
  },
  stop(keep = true) { return stopDraw(keep); },
  undo() { undoStroke(); },
  active: () => drawing(),
};

/** Magic Write: on the selected (or first) text box, else on a new one; opens the Magic Write box in the side panel. */
export function studioMagicWrite(UI) {
  if (!S.design) return;
  if (S.editing) E.endEdit();
  let t = selLayers().find((l) => l.type === "text") || curPage().layers.find((l) => l.type === "text" && !l.text?.dynamic);
  if (!t) { t = makeText({ content: "Your text here", role: "body", rel: 0.035 }, base()); place(t); }
  E.select([t.id]);
  UI.openProps();
  setTimeout(() => document.getElementById("mwPrompt")?.focus(), 60);
}
