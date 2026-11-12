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
    st.cur = { ...st.pen, pts: [E.toPage(e.clientX, e.clientY)] };
    st.strokes.push(st.cur);
    redraw();
  });
  layer.addEventListener("pointermove", (e) => { if (!st?.cur) return; e.preventDefault(); st.cur.pts.push(E.toPage(e.clientX, e.clientY)); redraw(); });
  const up = () => { if (st) st.cur = null; };
  layer.addEventListener("pointerup", up);
  layer.addEventListener("pointercancel", up);
  document.body.classList.add("st-drawing");
}
function paint(ctx, strokes, toX, toY, k) {
  for (const s of strokes) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
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
  for (const s of strokes) for (const [x, y] of s.pts) { const r = s.size / 2 + 2; x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
  const w = Math.max(4, x1 - x0), hh = Math.max(4, y1 - y0), k = Math.min(2, 4096 / Math.max(w, hh));
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * k); c.height = Math.ceil(hh * k);
  paint(c.getContext("2d"), strokes, (x) => (x - x0) * k, (y) => (y - y0) * k, k);
  const l = imageLayer(c.toDataURL("image/png"), { x: x0, y: y0, w, h: hh, nw: c.width, nh: c.height, name: "Drawing" });
  E.addLayer(l);
  toast("Drawing added. You can move, resize or delete it like any picture.");
  return l.id;
}
