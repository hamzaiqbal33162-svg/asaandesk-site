// Board -> presentation (Studio design) and board -> document (Docs model). Pure: no DOM; pictures are passed in.
// Each section (frame) becomes one slide / one heading; loose items get their own slide / heading at the end.
import { objectBounds, noteLayout, shapeLayout, textLayout } from "./render.js";
import { unionRect } from "./geometry.js";
import { byIdOf, frameChildren } from "./model.js";

const TEXTY = new Set(["note", "shape", "text"]);
const readingOrder = (a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x);

/** Sections of a board in reading order: [{ title, frame|null, items: [objects], rect }]. */
export function boardSections(board) {
  const byId = byIdOf(board);
  const frames = board.objects.filter((o) => o.type === "frame").sort(readingOrder);
  const used = new Set(), out = [];
  for (const f of frames) {
    const items = frameChildren(board, f).filter((o) => !used.has(o.id));
    items.forEach((o) => used.add(o.id));
    // Connectors whose two ends are inside the section go with it.
    const ids = new Set(items.map((o) => o.id));
    for (const c of board.objects) if (c.type === "connector" && ids.has(c.from?.id) && ids.has(c.to?.id)) { items.push(c); used.add(c.id); }
    out.push({ title: f.name || "Section", frame: f, items, rect: { x: f.x, y: f.y, w: f.w, h: f.h } });
  }
  const loose = board.objects.filter((o) => o.type !== "frame" && !used.has(o.id));
  if (loose.length) {
    const r = unionRect(loose.map((o) => objectBounds(o, byId)));
    out.push({ title: frames.length ? "More ideas" : board.name || "Whiteboard", frame: null, items: loose, rect: r });
  }
  return out;
}

const plain = (s) => String(s || "").replace(/\s*\n\s*/g, " ").trim();
const SHAPE_KIND = { rect: "rect", rounded: "rect", ellipse: "ellipse", triangle: "triangle", star: "star", diamond: "polygon" };
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : d);

/**
 * A 16:9 Studio presentation: one slide per section with its title, every sticky note, shape and text box as
 * editable layers, and the rest (arrows, drawings, stickers, pictures) as one picture behind them.
 * S = { textLayer, shapeLayer, imageLayer, newPage, getPreset, designPreset } from Studio's model/presets.
 * picture(section, scale) -> { src, w, h } | null : the non-text items of a section drawn on a transparent PNG.
 */
export async function boardToDeck(board, S, picture = async () => null) {
  const preset = S.getPreset("presentation-16x9"), W = 1920, H = 1080;
  const sections = boardSections(board);
  const pages = [];
  for (const sec of sections) {
    const page = S.newPage({ color: "#ffffff" });
    page.name = sec.title;
    const title = S.textLayer(sec.title, { x: 100, y: 56, w: 1720, size: 64, bold: true, color: "#1b2133", name: "Title" });
    title.h = 80;
    const box = { x: 100, y: 190, w: 1720, h: 830 };
    const r = sec.rect, k = Math.min(box.w / Math.max(r.w, 1), box.h / Math.max(r.h, 1), 2);
    const ox = box.x + (box.w - r.w * k) / 2 - r.x * k, oy = box.y + (box.h - r.h * k) / 2 - r.y * k;
    const X = (v) => Math.round(ox + v * k), Y = (v) => Math.round(oy + v * k), D = (v) => Math.round(v * k);
    const layers = [];
    if (sec.frame && hex(sec.frame.fill, "#ffffff") !== "#ffffff") layers.push(S.shapeLayer("rect", { x: X(r.x), y: Y(r.y), w: D(r.w), h: D(r.h), fill: hex(sec.frame.fill, "#ffffff"), radius: 12, name: "Section" }));
    const pic = await picture(sec, k);
    if (pic?.src) layers.push(S.imageLayer(pic.src, { x: X(r.x), y: Y(r.y), w: D(r.w), h: D(r.h), name: "Arrows and drawings", nw: pic.w, nh: pic.h }));
    for (const o of sec.items.filter((x) => TEXTY.has(x.type)).sort(readingOrder)) {
      const rot = o.rot || 0;
      if (o.type === "note" || o.type === "shape") {
        const kind = o.type === "note" ? "rect" : SHAPE_KIND[o.kind] || "rect";
        const fill = o.type === "note" ? hex(o.color, "#ffe27a") : o.fill === "none" ? "none" : hex(o.fill, "#e8e5fe");
        const stroke = o.type === "note" ? "none" : o.stroke === "none" ? "none" : hex(o.stroke, "#5b4cf0");
        const sh = S.shapeLayer(kind, { x: X(o.x), y: Y(o.y), w: D(o.w), h: D(o.h), fill, stroke, strokeWidth: stroke === "none" ? 0 : Math.max(1, D(o.sw ?? 2)), radius: o.type === "note" || o.kind === "rounded" ? D(10) : 0, sides: 4, name: o.type === "note" ? "Sticky note" : "Shape" });
        sh.rotation = rot;
        if (o.opacity != null && o.opacity < 1) sh.opacity = o.opacity;
        layers.push(sh);
        if (plain(o.text)) {
          const L = o.type === "note" ? noteLayout(o) : shapeLayout(o), size = Math.max(10, Math.round(L.size * k));
          const th = Math.round(L.lines.length * L.size * 1.25 * k);
          const t = S.textLayer(o.text, { x: X(L.box.x), y: Math.round(Y(L.box.y) + (D(L.box.h) - th) / 2), w: D(L.box.w), size, bold: !!o.bold, italic: !!o.italic, family: o.font || "sans", color: hex(o.textColor, "#1b2133"), align: o.align || "center", name: plain(o.text).slice(0, 24) });
          t.h = Math.max(th, size);
          t.rotation = rot;
          layers.push(t);
        }
      } else if (plain(o.text)) {
        const L = textLayout(o), size = Math.max(10, Math.round(L.size * k));
        const t = S.textLayer(o.text, { x: X(o.x), y: Y(o.y), w: D(o.w), size, bold: !!o.bold, italic: !!o.italic, family: o.font || "sans", color: hex(o.color, "#1b2133"), align: o.align || "left" });
        t.h = Math.round(L.h * k);
        t.rotation = rot;
        layers.push(t);
      }
    }
    page.layers = [...layers, title];
    pages.push(page);
  }
  if (!pages.length) { const p = S.newPage({ color: "#ffffff" }); p.layers = [S.textLayer(board.name || "Whiteboard", { x: 100, y: 440, w: 1720, size: 96, bold: true, align: "center" })]; pages.push(p); }
  return { version: 1, name: (board.name || "Whiteboard") + " (slides)", preset: S.designPreset(preset), pages, size: { w: W, h: H } };
}

const run = (text, extra) => ({ text: String(text), ...extra });
/** A Docs model: title, an optional picture of the board, then one heading per section with its texts as bullets. */
export function boardToDoc(board, picture = null) {
  const blocks = [{ type: "h1", runs: [run(board.name || "Whiteboard")] }];
  blocks.push({ type: "p", runs: [run("Notes from our whiteboard, section by section.", { color: "#5d6478" })] });
  if (picture?.src) blocks.push({ type: "image", src: picture.src, w: picture.w, h: picture.h, alt: "The whiteboard" });
  for (const sec of boardSections(board)) {
    const texts = sec.items.filter((o) => TEXTY.has(o.type) && plain(o.text)).sort(readingOrder);
    blocks.push({ type: "h2", runs: [run(sec.title)] });
    if (!texts.length) { blocks.push({ type: "p", runs: [run("(No text in this section)", { i: true, color: "#6a7389" })] }); continue; }
    for (const o of texts) {
      const r = [run(plain(o.text), o.bold || (o.type === "text" && (o.size || 0) >= 30) ? { b: true } : {})];
      if (o.reactions?.length) r.push(run("  " + o.reactions.join(" ")));
      if (o.author) r.push(run(`  (${o.author})`, { color: "#6a7389" }));
      blocks.push({ type: "li", list: "bullet", level: 0, runs: r });
    }
  }
  return { version: 1, title: board.name || "Whiteboard", font: "calibri", size: 11, page: { size: "A4", margin: 25.4, header: "", footer: "", pageNumbers: true }, blocks };
}
