// Magic Resize: a copy of a design at another size. Deterministic "fit" strategy (pure, unit-tested):
// - every layer keeps its shape and scales by s = min(W2/W, H2/H); its centre moves proportionally;
// - full-page backgrounds stretch to cover the new page, full-width / full-height bands stretch along their edge;
// - text keeps a readable size and may widen a little on wider pages; its height is re-measured;
// - everything else is kept inside a safe margin of the new page.
import { getPreset, presetPx, bleedPx, toPx, designPreset } from "./presets.js";
import { clone, newId, normalizeDesign } from "./model.js";
import { aabb, scaleLayer } from "./geometry.js";
import { textHeight, fitFontSize } from "./textlayout.js";

/** Smallest text size (px) kept after a resize. */
export function minReadable(preset) {
  const { w, h } = presetPx(preset);
  if (preset.unit !== "px") return toPx(7, "in") / 72; // 7 pt
  return Math.max(12, Math.round(Math.min(w, h) * 0.02));
}
/** Safe margin (px) inside the new page. */
export function safeMargin(preset) {
  const { w, h } = presetPx(preset);
  const m = Math.round(Math.min(w, h) * 0.04 * 100) / 100;
  return preset.unit === "px" ? m : Math.max(m, bleedPx(preset) + toPx(3, "mm"));
}

const isBackground = (b, W, H) => b.w >= W * 0.9 && b.h >= H * 0.9;
function recrop(img, ow, oh, nw, nh) {
  // Keep the visible centre, change the crop's aspect to the new box (cover).
  const c = img.crop || { x: 0, y: 0, w: 1, h: 1 };
  if (img.nw && img.nh) {
    const srcW = c.w * img.nw, srcH = c.h * img.nh; // visible source area in source px
    const target = nw / nh;
    let w = srcW, h = srcH;
    if (srcW / srcH > target) w = srcH * target; else h = srcW / target;
    const cx = (c.x + c.w / 2) * img.nw, cy = (c.y + c.h / 2) * img.nh;
    const x = Math.min(Math.max(0, cx - w / 2), img.nw - w), y = Math.min(Math.max(0, cy - h / 2), img.nh - h);
    img.crop = { x: x / img.nw, y: y / img.nh, w: w / img.nw, h: h / img.nh };
    return;
  }
  // Unknown pixel size: assume the current crop shows the source undistorted in the old box.
  const k = (ow / oh) / (nw / nh);
  if (k > 1) { const w = c.w / k; img.crop = { ...c, x: c.x + (c.w - w) / 2, w }; }
  else { const h = c.h * k; img.crop = { ...c, y: c.y + (c.h - h) / 2, h }; }
}

/** Resizes one page's layers from (W, H) to the target preset. Returns new layers. */
export function resizeLayers(layers, W, H, target) {
  const { w: W2, h: H2 } = presetPx(target);
  const sx = W2 / W, sy = H2 / H, s = Math.min(sx, sy);
  const m = safeMargin(target), minFont = minReadable(target);
  const safe = { x: m, y: m, w: W2 - 2 * m, h: H2 - 2 * m };
  return layers.map((src) => {
    const l = clone(src);
    const b = aabb(l);
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    // 1. Full-page backgrounds: cover the new page.
    // Edges that touch (or run past) the old page snap to the new page's edges.
    const span = (a0, len, full, k) => { const s0 = a0 <= 1 ? 0 : a0 * k, s1 = a0 + len >= full - 1 ? full * k : (a0 + len) * k; return [s0, Math.max(1, s1 - s0)]; };
    if (l.type !== "text" && isBackground(b, W, H) && !l.rotation) {
      const [nx, nw] = span(l.x, l.w, W, sx), [ny, nh] = span(l.y, l.h, H, sy);
      const nb = { x: nx, y: ny, w: nw, h: nh };
      if (l.type === "image") recrop(l.image, l.w, l.h, nb.w, nb.h);
      if (l.type === "frame" && l.frame.image) recrop(l.frame.image, l.w, l.h, nb.w, nb.h);
      if (l.type === "element" || l.type === "group" || l.type === "chart" || l.type === "table") {
        const k = Math.max(sx, sy);
        scaleLayer(l, k, k, 0, 0);
        l.x = W2 / 2 - l.w / 2 + (cx * sx - W2 / 2); l.y = H2 / 2 - l.h / 2 + (cy * sy - H2 / 2);
        return l;
      }
      Object.assign(l, nb);
      if (l.type === "shape" && l.shape.strokeWidth) l.shape.strokeWidth *= s;
      return l;
    }
    // 2. Bands along an edge (header bars, footers, side stripes).
    if (l.type === "shape" && !l.rotation && (b.w >= W * 0.9 || b.h >= H * 0.9) && ["rect", "line"].includes(l.shape.kind)) {
      if (b.w >= W * 0.9) {
        [l.x, l.w] = span(src.x, src.w, W, sx);
        l.h = Math.min(H2, Math.max(0, Math.min(src.y + src.h, H) - Math.max(src.y, 0)) * s);
        l.y = src.y <= 1 ? 0 : src.y + src.h >= H - 1 ? H2 - l.h : cy * sy - l.h / 2;
      } else {
        [l.y, l.h] = span(src.y, src.h, H, sy);
        l.w = Math.min(W2, Math.max(0, Math.min(src.x + src.w, W) - Math.max(src.x, 0)) * s);
        l.x = src.x <= 1 ? 0 : src.x + src.w >= W - 1 ? W2 - l.w : cx * sx - l.w / 2;
      }
      if (l.shape.strokeWidth) l.shape.strokeWidth *= s;
      if (l.shape.radius) l.shape.radius *= s;
      return l;
    }
    // 3. Everything else: uniform scale, proportional position.
    if (l.type === "text") {
      const t = l.text;
      const widen = Math.min(sx, s * 1.6); // wider pages: text boxes may grow a little wider (fewer lines)
      let size = Math.max(minFont, t.size * s);
      const kt = size / t.size;
      t.size = size;
      if (t.letterSpacing) t.letterSpacing *= kt;
      if (t.outline) t.outline.width *= kt;
      if (t.shadow) { t.shadow.x *= kt; t.shadow.y *= kt; t.shadow.blur *= kt; }
      l.w = Math.min(safe.w, Math.max(l.w * widen, t.size * 2));
      l.h = textHeight(t, l.w);
      if (l.h > safe.h) { t.size = fitFontSize(t, l.w, safe.h, Math.min(minFont, t.size)); l.h = textHeight(t, l.w); }
    } else {
      scaleLayer(l, s, s, 0, 0);
    }
    l.x = cx * sx - l.w / 2;
    l.y = cy * sy - l.h / 2;
    return keepInside(l, safe);
  });
}

/** Moves (and if needed shrinks) a layer so its rotated bounds sit inside `safe`. */
export function keepInside(l, safe) {
  let b = aabb(l);
  if (b.w > safe.w + 0.01 || b.h > safe.h + 0.01) {
    const k = Math.min(safe.w / b.w, safe.h / b.h);
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    if (l.type === "text") {
      l.w = Math.max(8, l.w * k);
      l.text.size = fitFontSize(l.text, l.w, safe.h * (l.rotation ? k : 1), 4);
      l.h = textHeight(l.text, l.w);
      let guard = 0;
      while (guard++ < 40) { const bb = aabb(l); if (bb.w <= safe.w + 0.01 && bb.h <= safe.h + 0.01) break; l.text.size *= 0.95; l.w *= 0.97; l.h = textHeight(l.text, l.w); }
    } else scaleLayer(l, k, k, 0, 0);
    l.x = cx - l.w / 2; l.y = cy - l.h / 2;
    b = aabb(l);
  }
  const dx = b.x < safe.x ? safe.x - b.x : b.x + b.w > safe.x + safe.w ? safe.x + safe.w - (b.x + b.w) : 0;
  const dy = b.y < safe.y ? safe.y - b.y : b.y + b.h > safe.y + safe.h ? safe.y + safe.h - (b.y + b.h) : 0;
  l.x += dx; l.y += dy;
  return l;
}

/** A resized copy of a design for a preset (object or id). Pages keep their order and backgrounds. */
export function magicResize(design, target) {
  const p = typeof target === "string" ? getPreset(target) : target;
  if (!p) throw new Error("Unknown size: " + target);
  const src = normalizeDesign(design);
  const { w: W, h: H } = presetPx(src.preset);
  const out = {
    version: 1,
    name: `${src.name.replace(/ \([^)]*\)$/, "")} (${p.label})`,
    preset: designPreset(p),
    pages: src.pages.map((pg) => ({ id: newId("p"), background: clone(pg.background), layers: resizeLayers(pg.layers, W, H, p).map((l) => ({ ...l, id: newId() })) })),
  };
  // Groups keep fresh child ids too.
  const re = (l) => { if (l.type === "group") l.children = l.children.map((c) => { const cc = { ...c, id: newId() }; re(cc); return cc; }); };
  out.pages.forEach((pg) => pg.layers.forEach(re));
  return out;
}

