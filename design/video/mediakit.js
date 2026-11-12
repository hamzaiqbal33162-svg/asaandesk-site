// Browser media helpers shared by the video editor, trimmer and recorder. Nothing here touches the DOM at import
// time, so the pure parts (keptSegments, pickType, evenSize) are unit tested in Node.
import { fixWebmDuration, webmEnd } from "./webm.js";

/** Parts of a video to keep. mode 'keep' = start..end, 'cut' = everything except start..end. */
export function keptSegments(duration, start, end, mode = "keep") {
  const d = Math.max(0, Number(duration) || 0);
  const s = Math.max(0, Math.min(d, Number(start) || 0)), e = Math.max(s, Math.min(d, Number(end) || 0));
  const segs = mode === "cut" ? [[0, s], [e, d]] : [[s, e]];
  return segs.filter(([a, b]) => b - a >= 0.05);
}
/** Output size with the shorter side at most `maxShort`, both even. */
export function evenSize(w, h, maxShort = 1080) {
  const k = Math.min(1, maxShort / Math.max(1, Math.min(w, h)));
  return { w: Math.max(2, Math.round((w * k) / 2) * 2), h: Math.max(2, Math.round((h * k) / 2) * 2) };
}
/** First MediaRecorder type this browser supports from a preference list. */
export function pickType(list, isSupported = (t) => globalThis.MediaRecorder?.isTypeSupported?.(t)) {
  for (const t of list) { try { if (isSupported(t)) return t; } catch {} }
  return "";
}
export const WEBM_VIDEO_TYPES = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];
export const WEBM_AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
export const bitrateFor = (w, h, fps = 30) => Math.round(Math.max(2e6, Math.min(10e6, w * h * fps * 0.1)));

export const once = (target, ok, bad = "error", ms = 0) => new Promise((res, rej) => {
  let t = 0;
  const done = (f, v) => { target.removeEventListener(ok, onOk); if (bad) target.removeEventListener(bad, onBad); clearTimeout(t); f(v); };
  const onOk = (e) => done(res, e), onBad = (e) => done(rej, e?.error || new Error(bad));
  target.addEventListener(ok, onOk); if (bad) target.addEventListener(bad, onBad);
  if (ms) t = setTimeout(() => done(rej, new Error("timeout")), ms);
});
const abortError = () => new DOMException("Cancelled", "AbortError");

export const RECORDER_NOT_STARTED = "The browser's video recorder didn't start. Close other tabs that use a lot of memory or the camera, then try again.";
export const NOTHING_RECORDED = "Nothing was recorded. Please try again.";
/**
 * Starts a MediaRecorder and watches it. Returns { started, error, done() }: check w.error in the drawing loop,
 * call w.done() at the end.
 * Never wait for the "start" event before drawing: Chrome fires it only after it has written data, and a canvas
 * stream only gives frames while the canvas is drawn, so "start, wait, then draw" waits forever. Start, then draw
 * at once. w.error is set on a recorder error, or when "start" hasn't come after `ms` while the tab was visible.
 */
export function startRecorder(rec, { timeslice = 1000, ms = 10000 } = {}) {
  const w = { started: false, error: null, done: () => {} };
  let timer = 0;
  const arm = () => { timer = setTimeout(() => { if (w.started) return; if (globalThis.document?.hidden) return arm(); w.error ||= new Error(RECORDER_NOT_STARTED); }, ms); };
  const onStart = () => { w.started = true; clearTimeout(timer); };
  const onError = (e) => { const why = e?.error?.message; w.error ||= new Error(`The browser's video recorder stopped with an error${why ? ` (${why})` : ""}. Please try again.`); };
  rec.addEventListener("start", onStart);
  rec.addEventListener("error", onError);
  w.done = () => { clearTimeout(timer); rec.removeEventListener("start", onStart); rec.removeEventListener("error", onError); };
  try { rec.start(timeslice); } catch (e) { w.done(); throw e; }
  arm();
  return w;
}

/**
 * Stops a recorder without losing its end. Chrome's stop() throws away the frames still being encoded or still
 * waiting on a busy page (crbug.com/719023), so a slow or busy computer lost the last second or two of a recording.
 * pause() lets nothing new in while the frames already inside still come out, so: pause, ask for the data written
 * so far until nothing new arrives for `settleMs` (at most `maxMs`), then stop. Resolves after the "stop" event.
 */
export async function finishRecording(rec, { settleMs = 700, maxMs = 8000, poll = 100 } = {}) {
  if (!rec || rec.state === "inactive") return;
  const stopped = once(rec, "stop", "error", 10000 + maxMs);
  if (rec.state === "recording") { try { rec.pause(); } catch {} }
  let bytes = 0;
  const onData = (e) => { bytes += e.data?.size || 0; };
  rec.addEventListener("dataavailable", onData);
  try {
    const t0 = performance.now();
    let seen = -1, quietSince = t0;
    while (rec.state === "paused" && performance.now() - t0 < maxMs) {
      const got = once(rec, "dataavailable", "error", 1000).catch(() => null);
      try { rec.requestData(); } catch { break; }
      await got;
      const now = performance.now();
      if (bytes !== seen) { seen = bytes; quietSince = now; }
      else if (now - quietSince >= settleMs) break;
      await new Promise((r) => setTimeout(r, poll));
    }
  } finally { rec.removeEventListener("dataavailable", onData); }
  if (rec.state !== "inactive") rec.stop();
  await stopped;
}

/**
 * Ends a canvas-video WebM recording only when the file really holds the picture up to `until` (seconds of file time):
 * keeps the recorder running, calls redraw() for the first redrawMs (the canvas stream only sends frames when it is
 * drawn), asks for the data written so far and reads the last video block with webmEnd(), at most capMs. Only the
 * picture counts. Note: Chrome's muxer holds video blocks back until the sound track catches up, so the recording's
 * sound must keep flowing to the end (exportWebM keeps a silent source playing). Then finishRecording (pause, drain,
 * stop). Returns webmEnd() of the finished file, or null when it is not WebM (Safari records MP4).
 */
export async function finishPicture(rec, chunks, { until = 0, redraw = null, redrawMs = 150, capMs = 3000, poll = 100, read = webmEnd } = {}) {
  if (!rec || rec.state === "inactive") return null;
  const webm = /webm/i.test(rec.mimeType || "");
  const bytes = async () => new Uint8Array(await new Blob(chunks).arrayBuffer());
  if (webm && rec.state === "recording") {
    const t0 = performance.now();
    while (rec.state === "recording" && performance.now() - t0 < capMs) {
      // redraw the last frame only at first (so the stream surely sends it), not the whole wait: every redraw is one
      // more frame of the still picture in the file
      if (performance.now() - t0 < redrawMs) { try { redraw?.(); } catch {} }
      const got = once(rec, "dataavailable", "error", 1000).catch(() => null);
      try { rec.requestData(); } catch { break; }
      await got;
      const end = read(await bytes());
      if (!end || (end.video != null && end.video >= until)) break;
      await new Promise((r) => setTimeout(r, poll));
    }
  }
  await finishRecording(rec);
  return webm ? read(await bytes()) : null;
}

/** Hidden holder so media elements keep decoding in every browser. */
export function mediaHolder() {
  let h = document.getElementById("mx-media-holder");
  if (!h) { h = document.createElement("div"); h.id = "mx-media-holder"; h.setAttribute("aria-hidden", "true"); h.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1"; document.body.append(h); }
  return h;
}
/** Seeks a media element and waits until the frame is ready (with a timeout). */
export async function seekTo(el, t, ms = 4000) {
  t = Math.max(0, t);
  if (el.readyState < 2 && el.getAttribute("src")) await once(el, "loadeddata", "error", ms).catch(() => {});
  if (Math.abs(el.currentTime - t) < 0.001 && el.readyState >= 2) return;
  const p = once(el, "seeked", "error", ms).catch(() => {});
  el.currentTime = t;
  await p;
}
/** Loads a video Blob into a <video>: { el, url, duration, width, height }. Fixes "Infinity" durations of recorded WebM. */
export async function probeVideo(blob, { keep = false } = {}) {
  const url = URL.createObjectURL(blob), el = document.createElement("video");
  el.muted = true; el.playsInline = true; el.preload = "auto"; el.src = url;
  mediaHolder().append(el);
  try {
    await once(el, "loadedmetadata", "error", 20000);
    if (!Number.isFinite(el.duration) || el.duration <= 0) {
      const p = once(el, "durationchange", null, 8000).catch(() => {});
      el.currentTime = 1e7; await p; await seekTo(el, 0);
    }
    if (el.readyState < 2) await once(el, "loadeddata", "error", 8000).catch(() => {});
    const info = { el, url, duration: Number.isFinite(el.duration) ? el.duration : 0, width: el.videoWidth, height: el.videoHeight };
    if (!keep) { el.remove(); el.removeAttribute("src"); el.load(); URL.revokeObjectURL(url); info.el = null; }
    return info;
  } catch (e) {
    el.remove(); URL.revokeObjectURL(url);
    const err = new Error("This browser can't play this video file. Convert it to MP4 first (Convert to MP4 tool), then try again.");
    err.code = "UNPLAYABLE"; err.cause = e;
    throw err;
  }
}
/** Draws a video frame "contain"-fitted onto a canvas context. */
export function drawContain(ctx, src, W, H, bg = "#000") {
  const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (!sw || !sh) return;
  const k = Math.min(W / sw, H / sh), w = sw * k, h = sh * k;
  ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
}

/**
 * Exact trim to WebM without any download: plays each kept part into a canvas and records it with MediaRecorder,
 * pausing the recorder while the video jumps between parts. Takes as long as the kept parts play.
 * Pauses by itself while the tab is hidden (browsers stop drawing in hidden tabs).
 * Returns { blob, duration, width, height }.
 */
export async function exportTrimmedWebM({ blob, segments, maxShort = 1080, fps = 30, signal, onProgress, onStatus, mute = false }) {
  if (!globalThis.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error("This browser can't record video. Try Chrome, Edge or Firefox.");
  if (!segments?.length) throw new Error("Nothing is left to export.");
  // The AudioContext is made before the first await, so it still counts as started by the user's click (Safari).
  const ac = new AudioContext();
  const resumed = ac.resume().catch(() => {});
  let info;
  try { info = await probeVideo(blob, { keep: true }); } catch (e) { ac.close().catch(() => {}); throw e; }
  const v = info.el; v.muted = false; v.volume = 1;
  const { w: W, h: H } = evenSize(info.width || 640, info.height || 360, maxShort);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  // Opaque canvas: otherwise Chrome records an alpha plane too (I420A), twice the encoding work for nothing.
  const ctx = canvas.getContext("2d", { alpha: false });
  let rec = null, tracks = [];
  const cleanup = () => {
    if (rec && rec.state !== "inactive") { try { rec.stop(); } catch {} }
    for (const t of tracks) { try { t.stop(); } catch {} }
    try { v.pause(); } catch {} v.remove(); v.removeAttribute("src"); v.load(); URL.revokeObjectURL(info.url); ac.close().catch(() => {});
  };
  try {
    await resumed;
    // Chrome's recorder writes nothing until the sound track gives data, so a stopped AudioContext would hang it.
    if (ac.state !== "running") throw new Error("The browser blocked sound for this page. Press the button again.");
    const dest = ac.createMediaStreamDestination();
    // mute: the sound track stays (silent) so the recorder keeps writing, but nothing of the video's sound is in it
    try { const g = ac.createGain(); g.gain.value = mute ? 0 : 1; ac.createMediaElementSource(v).connect(g); g.connect(dest); } catch {}
    tracks = [...canvas.captureStream(fps).getVideoTracks(), ...dest.stream.getAudioTracks()];
    const mimeType = pickType(WEBM_VIDEO_TYPES);
    rec = new MediaRecorder(new MediaStream(tracks), { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: bitrateFor(W, H, fps), audioBitsPerSecond: 128000 });
    const chunks = []; rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const total = segments.reduce((s, [a, b]) => s + (b - a), 0);
    let done = 0, hiddenPaused = false, watch = null;
    const draw = () => drawContain(ctx, v, W, H);
    const onVis = () => {
      if (rec.state === "inactive") return;
      if (document.hidden && !v.paused) { hiddenPaused = true; v.pause(); if (rec.state === "recording") rec.pause(); onStatus?.("Paused: keep this tab open to finish the export."); }
      else if (!document.hidden && hiddenPaused) { hiddenPaused = false; if (rec.state === "paused") rec.resume(); v.play().catch(() => {}); onStatus?.("Exporting…"); }
    };
    document.addEventListener("visibilitychange", onVis);
    try {
      for (const [a, b] of segments) {
        if (signal?.aborted) throw abortError();
        await seekTo(v, a); draw();
        // Start (or resume) the recorder, then play and draw straight away (see startRecorder: no waiting for "start").
        if (!watch) watch = startRecorder(rec); else if (rec.state === "paused") rec.resume();
        await v.play();
        await new Promise((res, rej) => {
          let token = 0;
          // Each wait is a frame callback plus a timer; when this part ends, token++ turns the one still pending
          // into a no-op (otherwise it would pause the next part's playback).
          const end = (f, x) => { token++; v.pause(); f(x); };
          const tick = () => {
            if (signal?.aborted) return end(rej, abortError());
            if (watch.error) return end(rej, watch.error);
            draw();
            onProgress?.(Math.min(0.99, (done + Math.max(0, v.currentTime - a)) / total));
            if (v.currentTime >= b - 0.5 / fps || v.ended) return end(res);
            // Next video frame, with a timer as a safety net (no frame callback comes after the last frame).
            const id = ++token, run = () => { if (id === token) tick(); };
            if (v.requestVideoFrameCallback && !v.paused) v.requestVideoFrameCallback(run);
            setTimeout(run, v.requestVideoFrameCallback ? 120 : 1000 / fps);
          };
          tick();
        });
        draw();
        await new Promise((r) => setTimeout(r, 1000 / fps));
        if (rec.state === "recording") rec.pause();
        done += b - a;
      }
      await finishRecording(rec); // drains the encoder first, so the end of the last part is kept
      if (watch?.error) throw watch.error;
    } finally { watch?.done(); document.removeEventListener("visibilitychange", onVis); }
    if (!chunks.length) throw new Error(NOTHING_RECORDED);
    const raw = new Uint8Array(await new Blob(chunks).arrayBuffer());
    // Safari records MP4 instead of WebM: keep the real container in the type.
    const actual = (rec.mimeType || mimeType || "video/webm").split(";")[0];
    const isWebm = actual.includes("webm");
    const out = new Blob([isWebm ? fixWebmDuration(raw, total * 1000) : raw], { type: isWebm ? "video/webm" : actual });
    onProgress?.(1);
    return { blob: out, duration: total, width: W, height: H };
  } finally { cleanup(); }
}
