// Magic Animate exports: WebM video (canvas render loop + captureStream + MediaRecorder) and animated GIF
// (our own encoder in gif.js). Both draw every frame with the same renderer as PNG export.
import { drawPage, loadImages, ensureFonts } from "./canvas.js";
import { pageDuration, frameTimes } from "./animate.js";
import { presetPx } from "./presets.js";
import { encodeGif, buildPalette } from "./gif.js";
import { addWebmDuration } from "./webm.js";
import { slideTimeline, timelineLength, pageAtTime } from "./pagetools.js";

const sizeFor = (design, maxSide) => { const { w, h } = presetPx(design.preset); const k = Math.min(1, maxSide / Math.max(w, h)); return { k, cw: Math.round(w * k / 2) * 2, ch: Math.round(h * k / 2) * 2 }; };
/**
 * One frame of a slideshow at time t, with the page transitions (Canva: transitions also play in videos and GIFs):
 * during the first part of a page the previous page goes out the way its transition says.
 */
function paintSlides(ctx, design, tl, t, { k, cw, ch, images, env }) {
  const at = pageAtTime(tl, t), pos = tl.findIndex((e) => e.index === at.index && t >= e.start - 1e-9 && t < e.start + e.dur + 1e-9);
  const pg = design.pages[at.index], kind = pg.transition || "none";
  const td = Math.max(0.1, Math.min(2.5, +pg.transitionDur || 0.45));
  const draw = (index, time) => drawPage(ctx, design, index, { scale: k, images, time, chartPrims: env.chartPrims, tablePrims: env.tablePrims });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
  if (pos <= 0 || kind === "none" || at.local >= td) { draw(at.index, at.local); return; }
  const prev = tl[pos - 1], q = at.local / td, e = 1 - (1 - q) ** 3; // ease out
  const dir = pg.transitionDir || "left", vert = dir === "up" || dir === "down", sg = dir === "right" || dir === "down" ? -1 : 1;
  const off = (f) => (vert ? [0, f * ch * sg] : [f * cw * sg, 0]);
  ctx.save();
  if (kind === "slide") { const [ox, oy] = off(-e); ctx.translate(ox, oy); } else if (kind === "stack") { ctx.globalAlpha = 1 - 0.4 * e; } else if (["fade", "zoom", "rise"].includes(kind)) ctx.globalAlpha = 1 - e;
  draw(prev.index, prev.dur);
  ctx.restore();
  ctx.save();
  if (kind === "slide" || kind === "stack") { const [ox, oy] = off(1 - e); ctx.setTransform(1, 0, 0, 1, ox, oy); }
  else if (kind === "fade") ctx.globalAlpha = e;
  else if (kind === "zoom") { ctx.globalAlpha = e; const s = 0.85 + 0.15 * e; ctx.setTransform(s, 0, 0, s, (cw * (1 - s)) / 2, (ch * (1 - s)) / 2); }
  else if (kind === "rise") { ctx.globalAlpha = e; ctx.setTransform(1, 0, 0, 1, 0, ch * 0.12 * (1 - e)); }
  else if (kind === "wipe") { ctx.beginPath(); if (vert) { const hh = ch * e; ctx.rect(0, sg > 0 ? ch - hh : 0, cw, hh); } else { const ww = cw * e; ctx.rect(sg > 0 ? cw - ww : 0, 0, ww, ch); } ctx.clip(); }
  else if (kind === "circle") { ctx.beginPath(); ctx.arc(cw / 2, ch / 2, Math.hypot(cw, ch) * 0.5 * e, 0, Math.PI * 2); ctx.clip(); }
  draw(at.index, at.local);
  ctx.restore();
}
export function webmSupported() { return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function"; }
function pickMime(mp4 = false) {
  if (mp4) { for (const m of ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"]) if (MediaRecorder.isTypeSupported?.(m)) return m; return null; }
  for (const m of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return "video/webm";
}
/** True when this browser can record MP4 directly (recent Chrome / Edge / Safari). */
export const mp4Supported = () => typeof MediaRecorder === "function" && !!pickMime(true);

/**
 * Records page `index` as a WebM video in real time. opts: { fps, maxSide, onProgress(0..1), env }.
 * Returns { blob, duration (s), width, height }.
 */
export async function recordWebm(design, index, { fps = 30, maxSide = 1080, onProgress, env = {}, mp4 = false, pages = null } = {}) {
  if (!webmSupported()) throw new Error("This browser can't record video. Try Chrome, Edge or Firefox, or save a GIF instead.");
  if (mp4 && !pickMime(true)) throw new Error("This browser can't make MP4 files. Save the video as WebM (it plays in most apps) or as a GIF.");
  // One page (its animations), or a slideshow of several pages (each for its Timing, like Canva's MP4 / GIF of a deck).
  const list = pages && pages.length > 1 ? pages : [index];
  const tl = list.length > 1 ? slideTimeline(design, list, (p) => pageDuration(p)) : [{ index, start: 0, dur: pageDuration(design.pages[index]) }];
  const duration = timelineLength(tl);
  const images = await loadImages(design, list);
  await ensureFonts(design);
  const { k, cw, ch } = sizeFor(design, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  // Kept in the page (invisible) so every browser keeps painting it while recording.
  Object.assign(canvas.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0.01", pointerEvents: "none", zIndex: "-1" });
  document.body.append(canvas);
  // Opaque: Chrome records a canvas without alpha on its fast path; with alpha it drops most frames.
  const ctx = canvas.getContext("2d", { alpha: false });
  const paint = (t) => paintSlides(ctx, design, tl, t, { k, cw, ch, images, env });
  paint(0);
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: pickMime(mp4), videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      paint(Math.min(t, duration));
      // Some browsers only send a frame when asked.
      stream.getVideoTracks()[0]?.requestFrame?.();
      onProgress?.(Math.min(1, t / duration));
      if (t < duration + 0.15) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  await finishRecording(rec);
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  canvas.remove();
  if (mp4) return { blob: new Blob(chunks, { type: "video/mp4" }), duration, width: cw, height: ch, mp4: true };
  const raw = new Blob(chunks, { type: "video/webm" });
  // MediaRecorder leaves the duration out; put it in so players show the right length.
  const fixed = addWebmDuration(new Uint8Array(await raw.arrayBuffer()), (duration + 0.15) * 1000);
  return { blob: new Blob([fixed], { type: "video/webm" }), duration, width: cw, height: ch };
}

/**
 * Stops a MediaRecorder without losing the end: Chrome's stop() throws away frames still being encoded, so pause,
 * keep asking for the data written so far until nothing new comes (0.7 s, at most 8 s), then stop.
 */
async function finishRecording(rec, { settleMs = 700, maxMs = 8000 } = {}) {
  if (!rec || rec.state === "inactive") return;
  if (rec.state === "recording") { try { rec.pause(); } catch {} }
  let bytes = 0, seen = -1;
  const onData = (e) => { bytes += e.data?.size || 0; };
  rec.addEventListener("dataavailable", onData);
  try {
    const t0 = performance.now();
    let quietSince = t0;
    while (rec.state === "paused" && performance.now() - t0 < maxMs) {
      const got = new Promise((res) => { const f = () => { rec.removeEventListener("dataavailable", f); res(); }; rec.addEventListener("dataavailable", f); setTimeout(f, 1000); });
      try { rec.requestData(); } catch { break; }
      await got;
      const now = performance.now();
      if (bytes !== seen) { seen = bytes; quietSince = now; } else if (now - quietSince >= settleMs) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  } finally { rec.removeEventListener("dataavailable", onData); }
  if (rec.state !== "inactive") rec.stop();
}

/** Renders page `index` as an animated GIF. opts: { fps, maxSide, onProgress, env }. Returns { blob, frames, width, height }. */
export async function renderGif(design, index, { fps = 12, maxSide = 480, onProgress, env = {}, pages = null } = {}) {
  const list = pages && pages.length > 1 ? pages : [index];
  const tl = list.length > 1 ? slideTimeline(design, list, (p) => pageDuration(p)) : [{ index, start: 0, dur: pageDuration(design.pages[index]) }];
  const duration = timelineLength(tl);
  const images = await loadImages(design, list);
  await ensureFonts(design);
  const { k, cw, ch } = sizeFor(design, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (list.length > 1) fps = Math.max(1, Math.min(fps, 240 / Math.max(1, duration))); // long slideshows: fewer frames, same timing
  const times = frameTimes(duration, fps);
  const frames = [];
  for (const [i, t] of times.entries()) {
    paintSlides(ctx, design, tl, t, { k, cw, ch, images, env });
    frames.push({ data: ctx.getImageData(0, 0, cw, ch).data, delay: 1000 / fps });
    onProgress?.((i + 1) / times.length * 0.5);
    if (i % 4 === 3) await new Promise((r) => setTimeout(r));
  }
  // Hold the last frame a little longer.
  frames[frames.length - 1].delay = 1200;
  const palette = buildPalette(frames.filter((_, i) => i % 3 === 0 || i === frames.length - 1).map((f) => f.data));
  onProgress?.(0.7);
  await new Promise((r) => setTimeout(r));
  const bytes = encodeGif(frames, cw, ch, { palette });
  onProgress?.(1);
  return { blob: new Blob([bytes], { type: "image/gif" }), frames: frames.length, width: cw, height: ch };
}
