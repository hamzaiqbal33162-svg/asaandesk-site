// Whiteboard insert adapter for the shared left-rail panel kit (../shared/panels/, LEFT-RAIL PANELS PARITY): kit items
// become native board objects — shapes (rectangle, rounded, ellipse, diamond, triangle, star), lines and arrows as
// connectors, recolourable stickers for graphics and other outlines, text boxes (a coloured label when the text has a
// background), tables of cells, photo frames you drop photos on, grids of frames, pictures and drawings. Charts are drawn
// by the kit and come in as a vector sticker (the board has no chart object). A click puts the item in the middle of the
// view, a drop where it was dropped. deps: the board app's own functions (see app.js mountFrame).
import { makeText, makeShape, makeTable, makeConnector, makeImage, makeSticker, hitTest, normalizeObject } from "./model.js";

let U = null;
const util = () => (U ||= import("../shared/insert-adapt.js"));
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v.toLowerCase() : /^#[0-9a-f]{3}$/i.test(v || "") ? "#" + [...v.slice(1)].map((c) => c + c).join("").toLowerCase() : d);
const KIND = { rect: "rect", square: "rect", rectangle: "rect", rounded: "rounded", "rounded-rect": "rounded", roundrect: "rounded", ellipse: "ellipse", circle: "ellipse", oval: "ellipse", diamond: "diamond", rhombus: "diamond", triangle: "triangle", star: "star" };
const FAMILIES = ["sans", "serif", "mono", "calibri", "cambria"];
const ROLE_REL = { heading: 0.075, subheading: 0.045, body: 0.03, caption: 0.022 };

export function makeWhiteboardInsert(D) {
  const need = () => { if (D.state.mode !== "edit") throw new Error("Switch to Editing to change the board."); D.finishEdit(); };
  /** The view's shorter side in board units: kit sizes are fractions of it (clamped so items stay readable). */
  const base = () => { const v = D.viewSize(); return Math.max(300, Math.min(4000, Math.min(v.w, v.h) / (D.state.cam.z || 1))); };
  const at = (pt) => { if (!pt) return null; if (pt.clientX != null) return D.toWorld(pt.clientX, pt.clientY); const v = D.viewSize(); return D.toWorld(v.left + pt.x, v.top + pt.y); };
  const place = (list, pt, o = {}) => D.placeAtCenter(list, { ...o, at: at(pt) });
  const fontReady = (o) => { if (o.font && o.font !== "sans") D.fontReady?.(o.font, !!o.bold, !!o.italic); };
  async function srcForBoard(src) {
    // The board keeps pictures as data URLs (or the site's own template photos), so saved boards open anywhere.
    if (/^data:image\//.test(src) || /^\/pdf-editor\/photos\/[\w.-]+\.(jpe?g|png|webp)$/i.test(src)) return src;
    const A = await util();
    return A.photoDataUrl(src);
  }
  function textObj(spec, m) {
    const size = Math.max(8, Math.round((+spec.rel > 0 ? +spec.rel : ROLE_REL[spec.role] || ROLE_REL.body) * m));
    const bold = spec.bold ?? (spec.weight ? +spec.weight >= 600 : spec.role === "heading" || spec.role === "subheading");
    let text = String(spec.content ?? "Your text here");
    if (spec.uppercase) text = text.toUpperCase();
    const longest = Math.max(1, ...text.split("\n").map((s) => s.length));
    const w = +spec.width > 0 ? +spec.width * m : Math.max(size * 4, Math.min(m * 0.9, longest * size * 0.6 + size));
    const align = ["left", "center", "right"].includes(spec.align) ? spec.align : spec.role === "heading" || spec.role === "subheading" ? "center" : "left";
    const font = FAMILIES.includes(spec.family) ? spec.family : "sans";
    if (spec.background && hex(spec.background)) {
      // A text with a background (captions, labels) is a rounded label shape with its text inside, like the board's titles.
      const lines = text.split("\n").length;
      const o = makeShape({ w: Math.max(w, size * 3), h: Math.round(size * (1.4 * lines + 0.9)), kind: "rounded", fill: hex(spec.background), stroke: hex(spec.background), text, size, bold: !!bold });
      o.textColor = hex(spec.color, "#ffffff"); o.font = font; o.italic = !!spec.italic; o.align = align;
      return o;
    }
    const o = makeText({ w, text, size, color: hex(spec.color, "#1b2133"), bold: !!bold, align });
    if (font !== "sans") o.font = font;
    if (spec.italic) o.italic = true;
    return normalizeObject(o);
  }
  function stickerFrom(conv, { name, kind, w, h }) {
    return makeSticker({ w: Math.round(w), h: Math.round(h), element: { id: "kit-" + String(kind || "graphic").replace(/[^\w-]/g, "").slice(0, 24), name: name || "Graphic", vb: conv.vb, parts: conv.parts, colors: { ...conv.defaults } } });
  }
  async function frameObj(spec, w, h) {
    const A = await util();
    if ((spec.screen || spec.screens) && (spec.svg || spec.under != null)) {
      // device / film / instant photo: a picture of the body with photo spots in its windows (filled one by one)
      const f = A.framePicture(spec);
      const o = makeImage({ w: Math.round(w), h: Math.round(h), src: A.svgUrl(f.svg), name: String(spec.name || "Photo frame").slice(0, 40) });
      o.frame = { shape: "device" }; o.placeholder = true;
      return o;
    }
    const o = makeImage({ w: Math.round(w), h: Math.round(h), src: A.svgUrl(A.framePlaceholderSvg(spec, w, h)), name: String(spec.name || "Photo frame").slice(0, 40) });
    o.frame = { shape: String(spec.shape || "rect"), ...(spec.d && spec.vb ? { d: String(spec.d), vb: [...spec.vb] } : {}) };
    o.placeholder = true;
    return o;
  }
  /** A photo into a frame: square / rounded frames show it natively (cropped to cover), circles as a round picture,
   *  other outlines as the photo clipped to the outline. */
  async function fillFrame(o, src, p = null) {
    const A = await util();
    const data = await srcForBoard(src);
    const { nw, nh } = await A.imageSize(data);
    const shape = A.frameShapeOf(o.frame || {});
    if (A.frameMeta(o.src)?.kind === "grid") {
      const at = p ? { u: (p.x - o.x) / (o.w || 1), v: (p.y - o.y) / (o.h || 1) } : null;
      const svg = A.fillFramePicture(o.src, data, nw, nh, at);
      D.change(() => { o.src = A.svgUrl(svg); o.placeholder = false; });
      D.setSel([o.id]); D.toast("Photo placed in the frame.");
      return;
    }
    D.change(() => {
      o.placeholder = false; o.nw = nw || undefined; o.nh = nh || undefined;
      if (shape === "rect" || shape === "circle") { o.src = data; o.fit = "cover"; o.round = shape === "circle"; }
      else { o.src = A.svgUrl(A.framedPhotoSvg(o.frame, o.w, o.h, data, nw, nh)); o.fit = undefined; o.round = false; }
    });
    D.setSel([o.id]);
    D.toast("Photo placed in the frame.");
  }
  const sizeOf = (A, src) => (/^data:image\/svg\+xml[^,]*,/.test(src) && !/;base64,/.test(src) ? (() => { try { const s = A.svgSize(decodeURIComponent(src.slice(src.indexOf(",") + 1))); return { nw: s.w, nh: s.h }; } catch { return { nw: 0, nh: 0 }; } })() : { nw: 0, nh: 0 });

  const ins = {
    /** Photos, uploads, pictures. Dropped on (or clicked with) an empty photo frame: the photo fills the frame. */
    async image(src, name = "Image", pt) {
      need();
      const A = await util();
      const p = at(pt);
      const hit = p ? hitTest(D.board(), p.x, p.y) : null;
      const selOne = !p && D.state.sel.size === 1 ? D.find([...D.state.sel][0]) : null;
      const fr = [hit, selOne].find((o) => o?.type === "image" && o.frame && !o.locked);
      if (fr) { await fillFrame(fr, src, p); return; }
      const data = await srcForBoard(src);
      let { nw, nh } = sizeOf(A, data);
      if (!nw || !nh) ({ nw, nh } = await A.imageSize(data));
      nw ||= 300; nh ||= 200;
      const k = Math.min(1, (base() * 0.6) / Math.max(nw, nh));
      const o = makeImage({ w: Math.round(nw * k), h: Math.round(nh * k), src: data, name: String(name || "Image").slice(0, 40) });
      if (nw && nh) { o.nw = nw; o.nh = nh; }
      place([o], pt);
    },
    /** Shapes: the board's own kinds natively; lines and arrows as connectors (ends you can attach); other outlines
     *  (callouts, flowchart symbols, polygons) as recolourable stickers. */
    async shape(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const key = String(spec.kind || "").toLowerCase();
      const fill = spec.fill === "none" ? "none" : hex(spec.fill, "#e8e5fe"), stroke = spec.stroke === "none" ? "none" : hex(spec.stroke, fill === "none" ? "#1b2133" : "#5b4cf0");
      if (key === "line" || key === "arrow") {
        const L = A.relBox(spec.rel || 0.35, Math.max(4, +spec.aspect || 6), m).w;
        const arrow = spec.arrow === "both" ? "both" : spec.arrow === "start" ? "start" : key === "arrow" || spec.arrow === "end" ? "end" : "none";
        const c = makeConnector({ from: { x: 0, y: 0 }, to: { x: Math.round(L), y: 0 }, kind: spec.elbow ? "elbow" : "straight", arrow: arrow === "start" ? "end" : arrow, stroke: hex(spec.stroke, spec.fill && spec.fill !== "none" ? hex(spec.fill, "#334155") : "#334155"), sw: Math.max(2, Math.round(+spec.strokeWidth > 1 ? +spec.strokeWidth : 3)) });
        if (arrow === "start") { const t = c.from; c.from = c.to; c.to = t; }
        if (spec.dash) c.dash = true;
        place([c], pt);
        return;
      }
      const kind = KIND[key];
      const vb = Array.isArray(spec.vb) ? (spec.vb.length === 4 ? spec.vb : [0, 0, spec.vb[0], spec.vb[1]]) : null;
      if (!kind && spec.d && vb) {
        const box = A.relBox(spec.rel || 0.3, vb[2] / vb[3], m);
        const d = A.mapPath(spec.d, 1, 1, -vb[0], -vb[1]);
        if (!d) return false;
        const sw = +spec.strokeWidth > 0 ? +spec.strokeWidth : stroke !== "none" || fill === "none" ? Math.max(vb[2], vb[3]) * 0.03 : 0;
        const part = { d, fill: fill === "none" ? "none" : "$1", stroke: stroke !== "none" ? (fill === "none" ? "$1" : "$2") : "none", sw };
        if (spec.dash) part.dash = Array.isArray(spec.dash) ? spec.dash : spec.dash === "dotted" ? [0.01, sw * 2] : [sw * 3, sw * 2];
        const colors = fill === "none" ? { c1: stroke !== "none" ? stroke : "#1b2133" } : { c1: fill, ...(stroke !== "none" ? { c2: stroke } : {}) };
        place([stickerFrom({ vb: [vb[2], vb[3]], parts: [part], defaults: colors }, { name: spec.name || "Shape", kind: "shape-" + (key || "custom"), w: box.w, h: box.h })], pt);
        return;
      }
      if (!kind) return false;
      const box = A.relBox(spec.rel || 0.22, +spec.aspect > 0 ? +spec.aspect : vb ? vb[2] / vb[3] : kind === "rect" || kind === "rounded" || kind === "ellipse" ? 1.5 : 1.07, m);
      const o = makeShape({ w: Math.round(box.w), h: Math.round(box.h), kind: kind === "rect" && +spec.radius > 0 ? "rounded" : kind, fill, stroke, sw: stroke === "none" ? 0 : Math.max(1, Math.round(+spec.strokeWidth > 1 ? +spec.strokeWidth : 2)) });
      if (spec.dash) o.dash = true;
      place([o], pt);
    },
    /** Graphics, stickers, icons, 3D, forms, animations: the library sticker by id, else the SVG's vector parts as a
     *  recolourable sticker, else a picture (gradients, animation). */
    async svg(markup, opts = {}, pt) {
      need();
      const A = await util(), m = base();
      if (opts.elementId) {
        const M = await D.loadElements();
        const el = M.ELEMENTS.find((x) => x.id === opts.elementId);
        if (el) {
          const box = A.relBox(opts.rel || 0.2, el.vb[0] / el.vb[1], m);
          place([makeSticker({ w: Math.round(box.w), h: Math.round(box.h), element: { id: el.id, name: el.name, vb: el.vb, parts: el.parts, colors: { ...el.defaults } } })], pt);
          return;
        }
      }
      const sz = A.svgSize(markup), aspect = +opts.aspect > 0 ? +opts.aspect : sz.w > 0 && sz.h > 0 ? sz.w / sz.h : 1;
      const box = A.relBox(opts.rel || 0.22, aspect, m);
      const conv = A.svgToParts(markup);
      if (conv) { place([stickerFrom(conv, { name: opts.name, kind: opts.kind, w: box.w, h: box.h })], pt); return; }
      const o = makeImage({ w: Math.round(box.w), h: Math.round(box.h), src: A.svgUrl(markup), name: String(opts.name || "Graphic").slice(0, 40) });
      place([o], pt);
    },
    /** One text box; a click starts typing in it. */
    async text(spec = {}, pt) {
      need();
      if (typeof spec === "string") spec = { content: spec, role: "body" };
      const o = textObj(spec, base());
      fontReady(o);
      place([o], pt, { edit: !pt && !spec.content });
    },
    /** Font combinations: the boxes keep their places around the combination's centre and are selected together. */
    async textGroup(specs = [], pt) {
      need();
      const list = (Array.isArray(specs) ? specs : [specs]).filter(Boolean);
      if (!list.length) return false;
      const m = base();
      const objs = list.map((s) => textObj(s, m));
      const off = list.some((s) => s.dx != null || s.dy != null);
      if (off) objs.forEach((o, i) => { o.x = Math.round((+list[i].dx || 0) * m - o.w / 2); o.y = Math.round((+list[i].dy || 0) * m - o.h / 2); });
      else { let y = 0; for (const o of objs) { o.x = Math.round(-o.w / 2); o.y = y; y += o.h + 8; } }
      objs.forEach(fontReady);
      place(objs, pt);
    },
    /** Tables: the board's table (a grid of cells you type in), with the kit's text, header colour and stripes. */
    async table(spec = {}, pt) {
      need();
      const A = await util(), t = A.tableModel(spec), st = t.style || {};
      const m = base(), cw = Math.round(Math.max(90, Math.min(220, (m * 0.7) / t.cols))), ch = Math.round(Math.max(40, cw * 0.36));
      const cells = makeTable({ cols: t.cols, rows: t.rows, cw, ch, head: t.header ? hex(st.head, "#e8e5fe") : null, stroke: hex(typeof st.border === "object" ? st.border?.color : st.border, "#9aa1b5"), cells: t.cells });
      if (st.stripe) for (const c of cells) if (c.cell[0] > 0 && c.cell[0] % 2 === 0) c.fill = typeof st.stripe === "string" && hex(st.stripe) ? hex(st.stripe) : "#f4f5fa";
      if (!t.header) for (const c of cells) c.bold = false;
      place(cells, pt);
    },
    /** Photo frames: an empty frame in the kit's outline; drop a photo on it (or click a photo while it is selected). */
    async frame(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const vb = Array.isArray(spec.vb) ? (spec.vb.length === 4 ? spec.vb : [0, 0, spec.vb[0], spec.vb[1]]) : null;
      const box = A.relBox(spec.rel || 0.3, +spec.aspect > 0 ? +spec.aspect : vb ? vb[2] / vb[3] : 1, m);
      place([await frameObj(spec, box.w, box.h)], pt);
    },
    /** Grids: photo frames in the grid's layout, in a box the size of most of the view. */
    async grid(spec = {}, pt) {
      need();
      const A = await util(), m = base();
      const box = { x: 0, y: 0, w: Math.round(m * 0.9), h: Math.round(m * 0.6) };
      const rects = A.gridRects(spec, box);
      const objs = [];
      for (const r of rects) { const o = await frameObj({ shape: "rect", name: "Grid cell" }, r.w, r.h); o.x = Math.round(r.x); o.y = Math.round(r.y); objs.push(o); }
      place(objs, pt);
      D.toast(`Grid added: ${objs.length} photo spots. Drop photos on them.`);
    },
    /** Videos: our own animated loops (SVG) come in as moving pictures; other clips as their cover (kit fallback). */
    async video(spec = {}, pt) {
      need();
      const src = String(spec.src || "");
      if (!/^data:image\/svg\+xml/.test(src)) return false;
      const A = await util(), box = A.relBox(spec.rel || 0.4, +spec.aspect > 0 ? +spec.aspect : 16 / 9, base());
      place([makeImage({ w: Math.round(box.w), h: Math.round(box.h), src, name: String(spec.name || "Video").slice(0, 40) })], pt);
    },
    /** A whiteboard is one big page: there are no page numbers to add. */
    async pageNumber() { throw new Error("A whiteboard is one big page, so it has no page numbers. Sections keep their names instead."); },
    /** A drawing (kit drawing layer): its strokes as a vector sticker, else a picture. */
    async drawing(markup, size = {}, pt) {
      need();
      const A = await util(), sz = A.svgSize(markup), m = base();
      const w = +size.w > 0 ? +size.w / (D.state.cam.z || 1) : sz.w || m * 0.4, h = +size.h > 0 ? +size.h / (D.state.cam.z || 1) : sz.h || m * 0.4;
      const conv = A.svgToParts(markup);
      place([conv ? stickerFrom(conv, { name: "Drawing", kind: "drawing", w, h }) : makeImage({ w: Math.round(w), h: Math.round(h), src: A.svgUrl(markup), name: "Drawing" })], pt);
    },
  };
  return ins;
}

/** The board's own pen for the kit's Draw tools: Pen, Marker, Glow pen (a soft halo), Highlighter, Eraser. size: screen px. */
export function makeWhiteboardDraw(D) {
  return {
    start({ tool = "pen", color, size, alpha } = {}) {
      if (D.state.mode !== "edit") throw new Error("Switch to Editing to draw on the board.");
      const z = D.state.cam.z || 1, w = (v, d) => Math.max(1, Math.min(120, Math.round(((+v || d) / z) * 10) / 10));
      if (tool === "eraser") { D.setTool("eraser"); return; }
      if (tool === "highlighter") { D.state.ink.highlighter = { color: hex(color, D.state.ink.highlighter.color), width: w(size, 18) }; D.setTool("highlighter"); return; }
      D.state.ink.pen = { color: hex(color, D.state.ink.pen.color), width: w(size, tool === "marker" ? 8 : 3) };
      D.state.penStyle = tool === "glow" ? "glow" : tool === "marker" ? "marker" : "pen";
      D.state.penAlpha = +alpha > 0 && +alpha < 1 ? +alpha : 1;
      D.setTool("pen");
    },
    stop() { if (["pen", "highlighter", "eraser"].includes(D.state.tool)) D.setTool("select"); },
    undo() { D.undo(); },
    active: () => ["pen", "highlighter", "eraser"].includes(D.state.tool),
  };
}
