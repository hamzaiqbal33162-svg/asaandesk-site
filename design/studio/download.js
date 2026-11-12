// Download options like Canva's Download panel (round 3): PNG "Compress" (an 8-bit palette PNG, our own
// encoder), "Limit size" in KB for JPG / PNG / WebP, quality levels, saved download settings, and the file-type
// list. Pure helpers (the deflate step is passed in: the browser's CompressionStream or Node's zlib in tests).
import { buildPalette, makeMapper } from "./gif.js";

export const QUALITY = {
  jpg: [["high", "High"], ["medium", "Medium"], ["low", "Low"], ["limit", "Limit size"]],
  png: [["high", "High"], ["compress", "Compress (smaller file)"], ["limit", "Limit size"]],
  webp: [["high", "High (lossless)"], ["medium", "Medium"], ["low", "Low"], ["limit", "Limit size"]],
};
/** Encoder quality (0..1) for a quality level. */
export const qualityValue = (type, level) => (type === "webp" && level === "high" ? 1 : ({ high: 0.92, medium: 0.8, low: 0.6 })[level] ?? 0.92);

/* ---------------- PNG-8 (Compress) ---------------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(u8, c = 0xffffffff) { for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return c; }
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, (crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff) >>> 0);
  return out;
}
/**
 * A palette PNG (up to 256 colours) from RGBA pixels: much smaller files for flat designs. Pixels that are
 * mostly transparent become fully transparent (index 0). deflate(Uint8Array) -> Promise<Uint8Array> (zlib).
 */
export async function encodePng8(rgba, w, h, deflate, { colors = 256 } = {}) {
  let clear = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 128) { clear = true; break; }
  const solid = clear ? (() => { const a = []; for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] >= 128) a.push(rgba[i], rgba[i + 1], rgba[i + 2], 255); return new Uint8Array(a); })() : rgba;
  const pal = buildPalette([solid.length ? solid : new Uint8Array([255, 255, 255, 255])], clear ? colors - 1 : colors);
  const map = makeMapper(pal)(rgba);
  const off = clear ? 1 : 0;
  const raw = new Uint8Array((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; // filter: none
    for (let x = 0; x < w; x++) { const i = y * w + x; raw[y * (w + 1) + 1 + x] = clear && rgba[i * 4 + 3] < 128 ? 0 : map[i] + off; }
  }
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = new Uint8Array((pal.length + off) * 3);
  pal.forEach((c, i) => plte.set(c, (i + off) * 3));
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", plte)];
  if (clear) { const trns = new Uint8Array(pal.length + 1).fill(255); trns[0] = 0; parts.push(chunk("tRNS", trns)); }
  parts.push(chunk("IDAT", await deflate(raw)), chunk("IEND", new Uint8Array(0)));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const a of parts) { out.set(a, p); p += a.length; }
  return out;
}
/** zlib deflate in the browser. */
export async function deflateBrowser(bytes) {
  if (typeof CompressionStream !== "function") throw new Error("This browser can't compress PNG files. Use High quality or JPG.");
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/* ---------------- Limit size ---------------- */
/**
 * Finds the best file under `kb` kilobytes. make(quality 0..1, scale 0..1) -> Promise<Blob>. Tries the quality
 * first (highest that fits), then smaller sizes. Returns { blob, quality, scale, fits }.
 */
export async function fitUnderKB(make, kb, { lossy = true } = {}) {
  const limit = Math.max(1, +kb || 0) * 1024;
  let best = null;
  for (const scale of [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2]) {
    if (!lossy) {
      const b = await make(1, scale);
      if (!best || b.size < best.blob.size) best = { blob: b, quality: 1, scale };
      if (b.size <= limit) return { blob: b, quality: 1, scale, fits: true };
      continue;
    }
    let lo = 0.05, hi = 0.95, found = null;
    const top = await make(hi, scale);
    if (top.size <= limit) return { blob: top, quality: hi, scale, fits: true };
    for (let i = 0; i < 6; i++) {
      const q = (lo + hi) / 2, b = await make(q, scale);
      if (!best || b.size < best.blob.size) best = { blob: b, quality: q, scale };
      if (b.size <= limit) { found = { blob: b, quality: q, scale, fits: true }; lo = q; } else hi = q;
    }
    if (found) return found;
  }
  return { ...best, fits: false };
}

/* ---------------- saved download settings (Canva: "Save download settings") ---------------- */
const KEY = (group) => "ad-studio-download:" + (group || "any");
export function loadDownloadSettings(group, store = globalThis.localStorage) {
  try { const v = JSON.parse(store?.getItem(KEY(group)) || "null"); return v && typeof v === "object" ? v : null; } catch { return null; }
}
export function saveDownloadSettings(group, settings, store = globalThis.localStorage) {
  try { if (settings) store?.setItem(KEY(group), JSON.stringify(settings)); else store?.removeItem(KEY(group)); return true; } catch { return false; }
}
