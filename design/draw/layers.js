// AsaanDesk Draw: layer list helpers (pure; layers are plain objects, the app adds canvases to them).
// Order: index 0 is the bottom layer, the last one is drawn on top.
export function nextLayerName(list) {
  let n = 0;
  for (const l of list) { const m = /^Layer (\d+)$/.exec(l.name || ""); if (m) n = Math.max(n, +m[1]); }
  return `Layer ${Math.max(n, list.length) + 1}`;
}
export function insertAt(list, item, index = list.length) {
  const out = list.slice();
  out.splice(Math.max(0, Math.min(index, out.length)), 0, item);
  return out;
}
export function removeAt(list, index) { const out = list.slice(); out.splice(index, 1); return out; }
export function moveItem(list, from, to) {
  if (from < 0 || from >= list.length) return list.slice();
  to = Math.max(0, Math.min(to, list.length - 1));
  const out = list.slice();
  const [it] = out.splice(from, 1);
  out.splice(to, 0, it);
  return out;
}
export const clampOpacity = (v) => (Number.isFinite(+v) ? Math.max(0, Math.min(1, +v)) : 1);
/** The layer to select after deleting index i (the one below, or the new bottom). */
export const afterDelete = (len, i) => Math.max(0, Math.min(i - 1, len - 2));
