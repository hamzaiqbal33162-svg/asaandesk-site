// AsaanDesk Draw: undo/redo. Pixel changes keep only the 128 px tiles a stroke touched (before + after),
// layer changes keep a light snapshot of the layer list. A memory cap drops the oldest steps first.
export const TILE = 128;

/** Adds the keys of every tile that rect [x0, y0, x1, y1) touches to `set`. */
export function rectTileKeys(rect, w, h, set = new Set(), size = TILE) {
  if (!rect) return set;
  const cols = Math.ceil(w / size);
  const tx0 = Math.max(0, Math.floor(rect[0] / size)), ty0 = Math.max(0, Math.floor(rect[1] / size));
  const tx1 = Math.min(cols - 1, Math.floor((rect[2] - 1) / size)), ty1 = Math.min(Math.ceil(h / size) - 1, Math.floor((rect[3] - 1) / size));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) set.add(ty * cols + tx);
  return set;
}
/** [x, y, w, h] of a tile key. */
export function tileRect(key, w, h, size = TILE) {
  const cols = Math.ceil(w / size), tx = key % cols, ty = Math.floor(key / cols);
  const x = tx * size, y = ty * size;
  return [x, y, Math.min(size, w - x), Math.min(size, h - y)];
}
/** Copies a region of an ImageData-like buffer. */
export function copyRegion(buf, x, y, w, h) {
  const out = new Uint8ClampedArray(w * h * 4), S = buf.data, W = buf.width;
  for (let r = 0; r < h; r++) out.set(S.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
  return out;
}
/** Writes a region back into a buffer. */
export function pasteRegion(buf, x, y, w, h, data) {
  const D = buf.data, W = buf.width;
  for (let r = 0; r < h; r++) D.set(data.subarray(r * w * 4, (r + 1) * w * 4), ((y + r) * W + x) * 4);
}
/** Tiles { x, y, w, h, before, after } for the keys, taking before from `beforeBuf` and after from `afterBuf`. */
export function makeTiles(keys, beforeBuf, afterBuf) {
  const tiles = [];
  for (const k of keys) {
    const [x, y, w, h] = tileRect(k, beforeBuf.width, beforeBuf.height);
    tiles.push({ x, y, w, h, before: copyRegion(beforeBuf, x, y, w, h), after: copyRegion(afterBuf, x, y, w, h) });
  }
  return tiles;
}
/** Applies the before or after side of pixel tiles to a buffer (used by tests; the app writes tiles to canvases). */
export function applyTiles(buf, tiles, side) { for (const t of tiles) pasteRegion(buf, t.x, t.y, t.w, t.h, t[side]); }

export function entryBytes(e) {
  if (e.bytes != null) return e.bytes;
  if (e.tiles) return e.tiles.reduce((n, t) => n + (t.before?.length || 0) + (t.after?.length || 0), 64);
  if (e.entries) return e.entries.reduce((n, x) => n + entryBytes(x), 64);
  return (e.extraBytes || 0) + 64;
}

export class History {
  constructor({ limitBytes = 160 * 1024 * 1024, limitSteps = 100 } = {}) {
    this.limitBytes = limitBytes; this.limitSteps = limitSteps;
    this.past = []; this.future = []; this.bytes = 0;
  }
  push(entry) {
    entry.bytes = entryBytes(entry);
    for (const e of this.future) this.bytes -= e.bytes;
    this.future = [];
    this.past.push(entry);
    this.bytes += entry.bytes;
    while (this.past.length > 1 && (this.bytes > this.limitBytes || this.past.length > this.limitSteps)) this.bytes -= this.past.shift().bytes;
    return entry;
  }
  undo() { const e = this.past.pop(); if (e) this.future.push(e); return e || null; }
  redo() { const e = this.future.pop(); if (e) this.past.push(e); return e || null; }
  clear() { this.past = []; this.future = []; this.bytes = 0; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
