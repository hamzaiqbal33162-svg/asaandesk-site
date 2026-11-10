// Photo collage layouts: frames for 2, 3, 4, 6 and 9 photos and mosaics, with spacing and corner sliders.
// Pure module (unit-tested).
import { frameLayer } from "./model.js";
import { coverCrop } from "./shapes.js";

// Cells in a 0..1 grid: [x0, y0, x1, y1].
const cols = (n) => Array.from({ length: n }, (_, i) => [i / n, 0, (i + 1) / n, 1]);
const grid = (c, r) => Array.from({ length: c * r }, (_, i) => [(i % c) / c, Math.floor(i / c) / r, ((i % c) + 1) / c, (Math.floor(i / c) + 1) / r]);
export const COLLAGE_LAYOUTS = [
  { id: "two", label: "2 photos", count: 2, cells: () => cols(2) },
  { id: "two-stack", label: "2 photos (stacked)", count: 2, cells: () => [[0, 0, 1, 0.5], [0, 0.5, 1, 1]] },
  { id: "three", label: "3 photos", count: 3, cells: () => [[0, 0, 0.6, 1], [0.6, 0, 1, 0.5], [0.6, 0.5, 1, 1]] },
  { id: "three-row", label: "3 in a row", count: 3, cells: () => cols(3) },
  { id: "four", label: "4 photos", count: 4, cells: () => grid(2, 2) },
  { id: "six", label: "6 photos", count: 6, cells: (W, H) => (W >= H ? grid(3, 2) : grid(2, 3)) },
  { id: "nine", label: "9 photos", count: 9, cells: () => grid(3, 3) },
  { id: "mosaic", label: "Mosaic", count: 5, cells: () => [[0, 0, 0.62, 0.62], [0.62, 0, 1, 0.31], [0.62, 0.31, 1, 0.62], [0, 0.62, 0.38, 1], [0.38, 0.62, 1, 1]] },
  { id: "mosaic-7", label: "Mosaic (7)", count: 7, cells: () => [[0, 0, 0.5, 0.5], [0.5, 0, 0.75, 0.25], [0.75, 0, 1, 0.25], [0.5, 0.25, 1, 0.5], [0, 0.5, 0.34, 1], [0.34, 0.5, 0.67, 1], [0.67, 0.5, 1, 1]] },
];
export const getCollageLayout = (id) => COLLAGE_LAYOUTS.find((l) => l.id === id) || null;

/** Frame rectangles (px) for a layout on a W × H page: outer padding and gaps = gap. */
export function collageRects(id, W, H, gap = 12) {
  const lay = getCollageLayout(id);
  if (!lay) throw new Error("Unknown collage layout " + id);
  const g = Math.max(0, Math.min(gap, Math.min(W, H) / 8));
  const aw = W - g, ah = H - g;
  return lay.cells(W, H).map(([x0, y0, x1, y1]) => ({ x: g + x0 * aw, y: g + y0 * ah, w: (x1 - x0) * aw - g, h: (y1 - y0) * ah - g }));
}

/** Frame layers for a layout. Existing photos (in order) are kept in the new frames. */
export function collageFrames(id, W, H, { gap = 12, radius = 0, photos = [] } = {}) {
  return collageRects(id, W, H, gap).map((r, i) => {
    const l = frameLayer({ ...r, shape: radius > 0 ? "rounded" : "rect", radius, name: `Photo ${i + 1}` });
    l.collage = true;
    const ph = photos[i];
    if (ph) l.frame.image = { src: ph.src, nw: ph.nw, nh: ph.nh, crop: coverCrop(ph.nw, ph.nh, r.w, r.h) };
    return l;
  });
}

/** Re-applies a layout (or new spacing / corners) to a page, keeping its photos in order. */
export function applyCollage(page, id, W, H, opts = {}) {
  const frames = page.layers.filter((l) => l.type === "frame" && l.collage);
  const photos = frames.map((f) => f.frame.image).filter(Boolean);
  const others = page.layers.filter((l) => !(l.type === "frame" && l.collage));
  const fresh = collageFrames(id, W, H, { ...opts, photos });
  page.layers = [...fresh, ...others]; // photos at the bottom, any text or stickers stay on top
  page.collage = { layout: id, gap: opts.gap ?? 12, radius: opts.radius ?? 0 };
  return page;
}

/** Puts photos into the empty frames of a page, in order. Returns how many were placed. */
export function fillFrames(page, photos) {
  let k = 0;
  for (const f of page.layers) {
    if (k >= photos.length) break;
    if (f.type !== "frame" || f.frame.image) continue;
    const ph = photos[k++];
    f.frame.image = { src: ph.src, nw: ph.nw, nh: ph.nh, crop: coverCrop(ph.nw, ph.nh, f.w, f.h) };
  }
  return k;
}

/** Swaps the photos of two frames (crops re-fitted to each frame). */
export function swapFrames(a, b) {
  const ia = a.frame.image, ib = b.frame.image;
  a.frame.image = ib ? { ...ib, crop: coverCrop(ib.nw, ib.nh, a.w, a.h) } : null;
  b.frame.image = ia ? { ...ia, crop: coverCrop(ia.nw, ia.nh, b.w, b.h) } : null;
}
