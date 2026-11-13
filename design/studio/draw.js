// AsaanDesk Studio: Draw tool (pen and highlighter). Strokes are drawn over the canvas and, on Done,
// become one transparent PNG picture layer placed exactly where they were drawn.
import { S, on, toast, h } from "./state.js";
import * as E from "./editor.js";
import { imageLayer } from "./model.js";

let st = null;
on("zoom", () => redraw());
export const drawing = () => !!st;

/** Starts drawing over the page. opts: { color, size (page px), alpha } */
export function startDraw(opts = {}) {
  if (st) { Object.assign(st.pen, opts); return; }
  if (S.editing) E.endEdit();
  E.select([]);
  const vp = E.getViewport();
  const layer = h("div.st-drawlayer", { "aria-label": "Drawing area: drag to draw" });
  const cv = h("canvas");
  layer.append(cv);
  vp.append(layer);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { const r = vp.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; redraw(); };
  st = { layer, cv, strokes: [], cur: null, pen: { color: "#5b4cf0", size: 8, alpha: 1, ...opts }, dpr, size };
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(size) : null;
  ro?.observe(vp); st.ro = ro;
  size();
  layer.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    layer.setPointerCapture(e.pointerId);
    // Eraser (the panels' Draw tools): strokes under the pointer go away.
    if (st.pen.erase) { st.erasing = true; eraseAt(E.toPage(e.clientX, e.clientY)); return; }
    st.cur = { ...st.pen, pts: [E.toPage(e.clientX, e.clientY)] };
    delete st.cur.erase;
    st.strokes.push(st.cur);
    redraw();
  });
  layer.addEventListener("pointermove", (e) => { if (st?.erasing) { e.preventDefault(); eraseAt(E.toPage(e.clientX, e.clientY)); return; } if (!st?.cur) return; e.preventDefault(); st.cur.pts.push(E.toPage(e.clientX, e.clientY)); redraw(); });
  const up = () => { if (st) { st.cur = null; st.erasing = false; } };
  layer.addEventListener("pointerup", up);
  layer.addEventListener("pointercancel", up);
  document.body.classList.add("st-drawing");
}
function eraseAt([x, y]) {
  const r = Math.max(6, (st.pen.size || 8) * 1.5);
  const before = st.strokes.length;
  const segDist = ([ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0; return Math.hypot(ax + t * dx - x, ay + t * dy - y); };
  const near = (s) => (s.pts.length === 1 ? Math.hypot(s.pts[0][0] - x, s.pts[0][1] - y) : Math.min(...s.pts.slice(1).map((p, i) => segDist(s.pts[i], p)))) <= r + s.size / 2;
  st.strokes = st.strokes.filter((s) => !near(s));
  if (st.strokes.length !== before) redraw();
}
const glowOf = (s) => (s.glow ? s.size * 1.6 : 0);
function paint(ctx, strokes, toX, toY, k) {
  for (const s of strokes) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
    // Glow pen: a soft halo of the same colour around the line.
    if (s.glow) { ctx.shadowColor = s.color; ctx.shadowBlur = glowOf(s) * k; }
    ctx.lineWidth = s.size * k; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(toX(x), toY(y)) : ctx.moveTo(toX(x), toY(y))));
    if (s.pts.length === 1) { ctx.arc(toX(s.pts[0][0]), toY(s.pts[0][1]), (s.size * k) / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.stroke();
    ctx.restore();
  }
}
function redraw() {
  if (!st) return;
  const ctx = st.cv.getContext("2d"), d = st.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, st.cv.width, st.cv.height);
  paint(ctx, st.strokes, (x) => (S.panX + x * S.zoom) * d, (y) => (S.panY + y * S.zoom) * d, S.zoom * d);
}
/** Undo the last stroke. */
export function undoStroke() { if (st) { st.strokes.pop(); redraw(); } }
/** Stops drawing; keep = true turns the strokes into a picture layer. Returns the layer id or null. */
export function stopDraw(keep = true) {
  if (!st) return null;
  const { strokes } = st;
  st.ro?.disconnect();
  st.layer.remove();
  st = null;
  document.body.classList.remove("st-drawing");
  if (!keep || !strokes.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s.pts) { const r = s.size / 2 + 2 + glowOf(s); x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
  const w = Math.max(4, x1 - x0), hh = Math.max(4, y1 - y0), k = Math.min(2, 4096 / Math.max(w, hh));
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * k); c.height = Math.ceil(hh * k);
  paint(c.getContext("2d"), strokes, (x) => (x - x0) * k, (y) => (y - y0) * k, k);
  const l = imageLayer(c.toDataURL("image/png"), { x: x0, y: y0, w, h: hh, nw: c.width, nh: c.height, name: "Drawing" });
  E.addLayer(l);
  toast("Drawing added. You can move, resize or delete it like any picture.");
  return l.id;
}
