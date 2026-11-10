// Online video recorder: screen, camera, screen + camera bubble, or sound only. Everything stays in the browser;
// MP4 uses the same lazy ffmpeg engine as the site's converter tools (downloaded only when asked for).
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, progressBox, isAbort, mediaErrorText } from "../video/ui.js";
import { pickType, WEBM_VIDEO_TYPES, WEBM_AUDIO_TYPES, bitrateFor, once, probeVideo, seekTo, keptSegments, exportTrimmedWebM, mediaHolder, finishRecording } from "../video/mediakit.js";
import { fixWebmDuration } from "../video/webm.js";
import * as L from "./rec-logic.js";

const md = navigator.mediaDevices;
const caps = {
  secure: window.isSecureContext !== false, mediaDevices: !!md, getUserMedia: !!md?.getUserMedia,
  getDisplayMedia: !!md?.getDisplayMedia, mediaRecorder: typeof MediaRecorder === "function",
};
const sup = L.support(caps, navigator.userAgent, navigator.maxTouchPoints || 0);
const params = new URLSearchParams(location.search);
const TITLE = document.title;
const asked = params.get("mode");

const state = {
  mode: L.MODES[asked] && !(L.MODES[asked].display && sup.screen) ? asked : sup.screen ? "camera" : "screen",
  mic: true, tabAudio: true, audioTab: false, countdown: true, bubbleSize: "M", camId: "", micId: "",
  compositor: params.get("compositor") === "canvas" ? "canvas" : "auto", compositorUsed: "",
  phase: "setup", clock: L.clockNew(), bubble: null, W: 0, H: 0, mimeType: "",
  result: null, trim: { start: 0, end: 0 }, lastExport: null, lastMp4: null, lastWav: null, error: "",
};
let ses = null; // the live recording: { streams, stops, chunks, rec, plan, isAudio, timer }
let ac = null; // one AudioContext for mixing, the level meter and decoding
let cancelCountdown = null;

const isLive = () => ["starting", "countdown", "recording", "paused", "processing"].includes(state.phase);
const wantTab = () => (state.mode === "audio" ? state.audioTab : L.MODES[state.mode].display ? state.tabAudio : false);
function setMsg(text) { const m = $("#setupMsg"); m.textContent = text || ""; m.hidden = !text; if (text) state.error = text; }
function note(text, kind = "") { const box = $("#resultMsg"); box.innerHTML = text ? `<p class="mx-msg ${kind}"></p>` : ""; if (text) box.firstChild.textContent = text; }

/* ---------------- Setup screen ---------------- */
function renderSetup() {
  const live = isLive(), m = L.MODES[state.mode];
  for (const b of $$(".rec-mode")) {
    const k = b.dataset.mode, on = k === state.mode;
    b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1;
    b.setAttribute("aria-disabled", String(live || !!(L.MODES[k].display && sup.screen)));
  }
  const info = [sup.fatal, sup.screen].filter(Boolean).join(" ");
  $("#supportMsg").textContent = info; $("#supportMsg").hidden = !info;
  $("#optMic").checked = state.mic; $("#optMic").disabled = live;
  $("#micSelect").hidden = !state.mic; $("#micSelect").disabled = live;
  const showTab = caps.getDisplayMedia && state.mode !== "camera";
  $("#tabRow").hidden = !showTab; $("#optTab").checked = wantTab(); $("#optTab").disabled = live;
  $("#tabLabel").textContent = state.mode === "audio" ? "Also record a tab's sound (you'll choose a tab to share)" : "Tab or system sound";
  $("#tabNote").textContent = !showTab ? "" : sup.tabAudio || (wantTab() ? "When you choose what to share, tick “Share audio” (Chrome and Edge)." : "");
  $("#camRow").hidden = !m.camera; $("#camSelect").disabled = live;
  $("#bubbleRow").hidden = !(m.display && m.camera);
  for (const b of $$("#bubbleRow [data-size]")) b.setAttribute("aria-pressed", String(b.dataset.size === state.bubbleSize));
  $("#optCountdown").checked = state.countdown; $("#optCountdown").disabled = live;
  const sb = $("#startBtn");
  sb.disabled = state.phase !== "setup" || !!sup.fatal;
  sb.textContent = state.phase === "starting" ? "Waiting for permission…" : state.phase === "countdown" ? "Get ready…" : state.phase === "processing" ? "Saving your recording…" : isLive() ? "Recording…" : "Start recording";
  $("#stageHint").textContent = state.mode === "both" ? "Tip: drag the round camera bubble on the preview (or focus the preview and use the arrow keys) to move it."
    : state.mode === "screen" ? "Tip: you can switch to any other tab or app while recording. Come back here to stop."
      : state.mode === "audio" ? "Tip: speak normally, about a hand's width from the microphone." : "Tip: look at the camera, not at the screen.";
}
function render() {
  const ph = state.phase, rec = ph === "recording" || ph === "paused";
  $("#setup").hidden = ph === "done";
  $("#result").hidden = ph !== "done";
  document.body.classList.toggle("recording", rec);
  $("#controls").hidden = !rec;
  $("#controls").classList.toggle("paused", ph === "paused");
  const pb = $("#pauseBtn");
  pb.textContent = ph === "paused" ? "Resume" : "Pause"; pb.setAttribute("aria-label", ph === "paused" ? "Resume recording" : "Pause recording");
  $("#recBadge").hidden = !rec; $("#recBadge").classList.toggle("paused", ph === "paused");
  $("#badgeText").textContent = ph === "paused" ? "PAUSED" : "REC";
  const hasPicture = !!ses?.video, live = isLive() && ses;
  $("#placeholder").hidden = !!(live && (hasPicture || ses?.isAudio));
  $("#stageAudio").hidden = !(live && ses?.isAudio);
  $("#live").hidden = !(live && hasPicture);
  const drag = !!(live && state.mode === "both");
  $("#stage").classList.toggle("drag", drag);
  const lv = $("#live");
  if (drag) { lv.tabIndex = 0; lv.setAttribute("aria-label", "Live preview. Camera bubble: drag it, or use the arrow keys to move it."); }
  else { lv.removeAttribute("tabindex"); lv.setAttribute("aria-label", "Live preview"); }
  if (!rec) document.title = TITLE;
  renderSetup();
  if (ph === "done") renderResult();
}

/* ---------------- Recording ---------------- */
function errorText(e) {
  if (e?.what === "screen") {
    if (e.name === "NotAllowedError") return "Screen sharing was cancelled or blocked. Press Start again and choose a screen, window or tab to share.";
    if (e.name === "NotSupportedError" || e.name === "TypeError") return sup.screen || "This browser can't record the screen. Try Chrome, Edge or Firefox on a computer.";
    return mediaErrorText(e, "screen");
  }
  if (e?.what) return mediaErrorText(e, e.what);
  return e?.message || "Couldn't start recording. Please try again.";
}

async function start(opts = {}) {
  if (state.phase !== "setup") return false;
  Object.assign(state, opts);
  setMsg(""); state.error = "";
  const tab = wantTab();
  let problem;
  try { problem = L.modeProblem(state.mode, sup, { mic: state.mic, tabAudio: tab }); } catch (e) { problem = e.message; }
  if (problem) { setMsg(problem); return false; }
  const p = L.plan(state.mode, { mic: state.mic, tabAudio: tab });
  state.phase = "starting"; render();
  try { ac ||= new AudioContext(); ac.resume().catch(() => {}); } catch { ac = null; }
  const s = { streams: [], stops: [], chunks: [], plan: p, isAudio: !p.video };
  ses = s;
  try {
    if (p.display) {
      try {
        const ds = await md.getDisplayMedia({ video: { frameRate: { ideal: 30 } }, audio: p.displayAudio, ...(p.displayAudio ? { systemAudio: "include" } : {}) });
        s.streams.push(ds); s.display = ds;
      } catch (e) { e.what = "screen"; throw e; }
    }
    if (p.camera || p.mic) {
      try {
        const us = await md.getUserMedia({
          video: p.camera ? { width: { ideal: 1280 }, height: { ideal: 720 }, ...(state.camId ? { deviceId: { exact: state.camId } } : {}) } : false,
          audio: p.mic ? { echoCancellation: true, noiseSuppression: true, ...(state.micId ? { deviceId: { exact: state.micId } } : {}) } : false,
        });
        s.streams.push(us); s.user = us;
      } catch (e) { e.what = p.camera && p.mic ? "camera and microphone" : p.camera ? "camera" : "microphone"; throw e; }
    }
    fillDevices();
    await buildRecorder(s);
  } catch (e) {
    teardown(s); if (ses === s) ses = null;
    state.phase = "setup"; render(); setMsg(errorText(e));
    return false;
  }
  if (ses !== s) return false;
  render();
  if (state.countdown) {
    state.phase = "countdown"; render();
    const go = await countdown();
    if (!go || ses !== s) { teardown(s); if (ses === s) ses = null; state.phase = "setup"; render(); return false; }
  }
  return beginRecording(s);
}

async function buildRecorder(s) {
  const dv = s.display?.getVideoTracks()[0] || null, da = s.display?.getAudioTracks()[0] || null;
  const cv = s.user?.getVideoTracks()[0] || null, ma = s.user?.getAudioTracks()[0] || null;
  if (s.plan.displayAudio && !da) toast("No tab sound was shared. Next time tick “Share audio” in the sharing window.", 5000);
  // Sound: one source as it is; mic + tab sound mixed with WebAudio.
  const audioIn = [da, ma].filter(Boolean);
  let audio = audioIn[0] || null;
  if (ac && audioIn.length) {
    const nodes = audioIn.map((t) => ac.createMediaStreamSource(new MediaStream([t])));
    if (audioIn.length > 1) {
      const dest = ac.createMediaStreamDestination();
      nodes.forEach((n) => n.connect(dest));
      audio = dest.stream.getAudioTracks()[0];
      s.stops.push(() => { try { dest.stream.getTracks().forEach((t) => t.stop()); } catch {} });
    }
    s.stops.push(startMeter(nodes));
    s.stops.push(() => nodes.forEach((n) => { try { n.disconnect(); } catch {} }));
  }
  // Picture
  let video = null;
  if (s.plan.composite) video = await startCompositor(s, dv, cv);
  else if (s.plan.video) { video = dv || cv; const st = video?.getSettings?.() || {}; state.W = st.width || 0; state.H = st.height || 0; }
  s.video = video; s.audio = audio;
  const live = $("#live");
  if (video) { live.srcObject = new MediaStream([video]); live.play().catch(() => {}); }
  for (const t of [dv, cv]) if (t) t.addEventListener("ended", () => {
    if (ses !== s) return;
    if (state.phase === "countdown") cancelCountdown?.();
    else if (state.phase === "recording" || state.phase === "paused") { toast(t === dv ? "Screen sharing ended, so the recording stopped." : "The camera stopped, so the recording stopped."); stop(); }
  });
  const tracks = [video, audio].filter(Boolean);
  if (!tracks.length) throw new Error("There is nothing to record. Turn on the microphone or choose a picture source.");
  const mimeType = pickType(s.isAudio ? WEBM_AUDIO_TYPES : [...WEBM_VIDEO_TYPES, "video/mp4"]);
  s.rec = new MediaRecorder(new MediaStream(tracks), {
    ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 128000,
    ...(video ? { videoBitsPerSecond: bitrateFor(state.W || 1280, state.H || 720) } : {}),
  });
  state.mimeType = s.rec.mimeType || mimeType;
  s.rec.ondataavailable = (e) => { if (e.data?.size) s.chunks.push(e.data); };
}

function startMeter(nodes) {
  const an = ac.createAnalyser(); an.fftSize = 1024;
  nodes.forEach((n) => n.connect(an));
  const buf = new Float32Array(an.fftSize), meter = $("#meter"), bar = meter.querySelector("i");
  meter.hidden = false;
  let raf = 0, n = 0;
  const loop = () => {
    an.getFloatTimeDomainData(buf);
    const lv = L.level(buf);
    bar.style.width = (lv * 100).toFixed(0) + "%";
    if (++n % 15 === 0) meter.setAttribute("aria-valuenow", String(Math.round(lv * 100)));
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => { cancelAnimationFrame(raf); meter.hidden = true; bar.style.width = "0"; };
}

/* Screen + camera: the bubble is drawn on top of the screen picture. */
const dims = (src) => (!src ? [0, 0] : [src.videoWidth || src.displayWidth || src.width || 0, src.videoHeight || src.displayHeight || src.height || 0]);
function drawFrame(ctx, screen, cam, W, H) {
  ctx.fillStyle = "#0d1020"; ctx.fillRect(0, 0, W, H);
  const [sw, sh] = dims(screen);
  if (sw && sh) { const r = L.containRect(W, H, sw, sh); ctx.drawImage(screen, r.x, r.y, r.w, r.h); }
  const b = state.bubble, [cw, ch] = dims(cam);
  if (b && cw && ch) {
    const c = L.coverCrop(cw, ch), r = b.d / 2, lw = Math.max(3, Math.round(b.d * 0.022));
    ctx.save(); ctx.beginPath(); ctx.arc(b.x + r, b.y + r, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(cam, c.sx, c.sy, c.s, c.s, b.x, b.y, b.d, b.d);
    ctx.restore();
    ctx.beginPath(); ctx.arc(b.x + r, b.y + r, r - lw / 2, 0, Math.PI * 2);
    ctx.lineWidth = lw; ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.stroke();
  }
}
async function trackVideo(track) {
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([track]);
  mediaHolder().append(v);
  v.play().catch(() => {});
  if (!v.videoWidth) await once(v, "loadedmetadata", null, 4000).catch(() => {});
  return v;
}
const dropVideo = (v) => { if (!v) return; try { v.pause(); } catch {} v.srcObject = null; v.remove(); };

async function startCompositor(s, dv, cv) {
  const st = dv.getSettings?.() || {};
  const frames = state.compositor !== "canvas" && typeof window.MediaStreamTrackGenerator === "function" && typeof window.MediaStreamTrackProcessor === "function" && typeof OffscreenCanvas === "function" && typeof VideoFrame === "function";
  let sw = st.width, sh = st.height, sv = null;
  if (!frames || !(sw && sh)) { sv = await trackVideo(dv); sw ||= sv.videoWidth; sh ||= sv.videoHeight; }
  const { w: W, h: H } = L.compositeSize(sw, sh);
  state.W = W; state.H = H; state.bubble = L.defaultBubble(W, H, state.bubbleSize);
  if (frames) {
    try { const t = startFrameCompositor(s, dv, cv, W, H); dropVideo(sv); return t; } catch { /* fall back to the canvas */ }
  }
  return startCanvasCompositor(s, sv || (await trackVideo(dv)), cv, W, H);
}
/**
 * Chrome / Edge: builds frames from the screen and camera frames themselves (MediaStreamTrackProcessor ->
 * OffscreenCanvas -> MediaStreamTrackGenerator), so it keeps working while this tab is hidden.
 */
function startFrameCompositor(s, dv, cv, W, H) {
  const gen = new window.MediaStreamTrackGenerator({ kind: "video" });
  const writer = gen.writable.getWriter();
  // Opaque canvases (here and in the canvas compositor): with alpha, Chrome records an alpha plane too (I420A).
  const oc = new OffscreenCanvas(W, H), ctx = oc.getContext("2d", { alpha: false }), t0 = performance.now();
  let scr = null, cam = null, stopped = false, last = 0, inflight = 0;
  const emit = () => {
    if (stopped || s.hold || inflight > 1) return;
    const now = performance.now();
    if (now - last < 28) return;
    last = now;
    drawFrame(ctx, scr, cam, W, H);
    let vf;
    try { vf = new VideoFrame(oc, { timestamp: Math.round((now - t0) * 1000) }); } catch { return; }
    inflight++;
    writer.write(vf).catch(() => {}).finally(() => { inflight--; try { vf.close(); } catch {} });
  };
  const pump = async (track, keep) => {
    const reader = new window.MediaStreamTrackProcessor({ track }).readable.getReader();
    s.stops.push(() => reader.cancel().catch(() => {}));
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done || stopped) { value?.close(); break; }
        keep(value); emit();
      }
    } catch {}
  };
  pump(dv, (f) => { scr?.close(); scr = f; });
  if (cv) pump(cv, (f) => { cam?.close(); cam = f; });
  s.stops.push(() => { stopped = true; try { scr?.close(); cam?.close(); } catch {} scr = cam = null; writer.close().catch(() => {}); try { gen.stop(); } catch {} });
  state.compositorUsed = "frames";
  return gen;
}
/** Other browsers: a canvas redrawn by a Worker timer (Workers keep their timers running in hidden tabs). */
async function startCanvasCompositor(s, sv, cv, W, H) {
  const cvEl = cv ? await trackVideo(cv) : null;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  const draw = () => { if (!s.hold) drawFrame(ctx, sv, cvEl, W, H); };
  draw();
  const out = canvas.captureStream(30).getVideoTracks()[0];
  const stopTick = ticker(30, draw);
  s.stops.push(() => { stopTick(); try { out.stop(); } catch {} dropVideo(sv); dropVideo(cvEl); });
  state.compositorUsed = "canvas";
  return out;
}
function ticker(fps, fn) {
  let w = null, iv = 0, url = "";
  const fallback = () => { if (!iv) iv = setInterval(fn, 1000 / fps); };
  try {
    url = URL.createObjectURL(new Blob(["let t=0;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}"], { type: "text/javascript" }));
    w = new Worker(url);
    w.onmessage = () => fn();
    w.onerror = () => { try { w.terminate(); } catch {} w = null; fallback(); };
    w.postMessage(Math.round(1000 / fps));
  } catch { fallback(); }
  return () => { if (w) { try { w.postMessage(0); w.terminate(); } catch {} } clearInterval(iv); if (url) URL.revokeObjectURL(url); };
}

function countdown() {
  return new Promise((resolve) => {
    const box = $("#countdown"), num = $("#countNum"), steps = L.countdownSteps(3);
    let i = 0, tm = 0;
    const onKey = (e) => { if (e.key === "Escape") finish(false); };
    const finish = (go) => { clearTimeout(tm); box.hidden = true; document.removeEventListener("keydown", onKey); cancelCountdown = null; resolve(go); };
    const show = () => {
      if (i >= steps.length) return finish(true);
      num.textContent = String(steps[i++]);
      num.style.animation = "none"; void num.offsetWidth; num.style.animation = "";
      tm = setTimeout(show, 1000);
    };
    box.hidden = false; document.addEventListener("keydown", onKey);
    cancelCountdown = () => finish(false);
    show();
  });
}

async function beginRecording(s) {
  try {
    const started = once(s.rec, "start", "error", 5000);
    s.rec.start(1000);
    await started;
  } catch (e) {
    teardown(s); if (ses === s) ses = null;
    state.phase = "setup"; render(); setMsg("Couldn't start the recorder: " + (e?.message || e));
    return false;
  }
  state.clock = L.clockStart(L.clockNew(), performance.now());
  state.phase = "recording"; render();
  s.timer = setInterval(updateTimer, 250); updateTimer();
  if (matchMedia("(max-width: 820px)").matches) $("#stage").scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
function updateTimer() {
  const txt = fmtTime(L.clockElapsed(state.clock, performance.now()) / 1000);
  $("#timer").textContent = txt; $("#badgeTime").textContent = txt;
  document.title = (state.phase === "paused" ? "Paused " : "● ") + txt + " · Recording | AsaanDesk";
}
function pause() {
  if (state.phase !== "recording" || !ses) return false;
  try { ses.rec.pause(); } catch { return false; }
  state.clock = L.clockPause(state.clock, performance.now()); state.phase = "paused"; render(); updateTimer();
  return true;
}
function resume() {
  if (state.phase !== "paused" || !ses) return false;
  try { ses.rec.resume(); } catch { return false; }
  state.clock = L.clockResume(state.clock, performance.now()); state.phase = "recording"; render(); updateTimer();
  return true;
}
async function stop() {
  const s = ses;
  if (!s || !(state.phase === "recording" || state.phase === "paused")) return null;
  state.clock = L.clockStop(state.clock, performance.now());
  const ms = L.clockElapsed(state.clock, performance.now());
  state.phase = "processing"; render();
  clearInterval(s.timer);
  // Video: stop drawing (s.hold) so a busy page catches up, and let the encoder finish before stopping; Chrome's
  // stop() drops what is still being encoded, which cut the end off recordings on slower computers.
  s.hold = true;
  if (s.video) await finishRecording(s.rec).catch(() => {});
  else { const stopped = once(s.rec, "stop", "error", 15000).catch(() => {}); try { s.rec.stop(); } catch {} await stopped; }
  teardown(s); ses = null;
  const type = L.baseType(s.rec.mimeType || state.mimeType || (s.isAudio ? "audio/webm" : "video/webm"));
  if (!s.chunks.length) { state.phase = "setup"; render(); setMsg("Nothing was recorded. Please try again."); return null; }
  let blob = new Blob(s.chunks, { type });
  if (/webm/.test(type)) blob = new Blob([fixWebmDuration(new Uint8Array(await blob.arrayBuffer()), ms)], { type });
  await showResult({ blob, type, isAudio: s.isAudio, ms, mode: state.mode });
  return blob;
}
function teardown(s) {
  if (!s) return;
  clearInterval(s.timer);
  for (const f of s.stops.splice(0).reverse()) { try { f(); } catch {} }
  for (const st of s.streams) for (const t of st.getTracks()) { try { t.stop(); } catch {} }
  const live = $("#live"); live.srcObject = null;
}

/* Camera bubble: drag on the preview or arrow keys. */
let drag = null;
function bubbleAt(e) { return L.previewToCanvas(e.clientX, e.clientY, $("#live").getBoundingClientRect(), state.W, state.H); }
function initBubble() {
  const lv = $("#live");
  lv.addEventListener("pointerdown", (e) => {
    if (state.mode !== "both" || !state.bubble || !isLive()) return;
    const p = bubbleAt(e);
    if (!L.inBubble(state.bubble, p.x, p.y)) return;
    e.preventDefault(); lv.setPointerCapture?.(e.pointerId);
    drag = { id: e.pointerId, ox: p.x - state.bubble.x, oy: p.y - state.bubble.y };
  });
  lv.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = bubbleAt(e);
    state.bubble = L.clampBubble({ x: p.x - drag.ox, y: p.y - drag.oy, d: state.bubble.d }, state.W, state.H);
  });
  const end = () => { drag = null; };
  lv.addEventListener("pointerup", end); lv.addEventListener("pointercancel", end);
  lv.addEventListener("keydown", (e) => {
    if (state.mode !== "both" || !state.bubble) return;
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k) return;
    e.preventDefault();
    const step = Math.round(state.W * (e.shiftKey ? 0.08 : 0.02));
    state.bubble = L.moveBubble(state.bubble, k[0] * step, k[1] * step, state.W, state.H);
  });
}

async function fillDevices() {
  if (!md?.enumerateDevices) return;
  let list = [];
  try { list = await md.enumerateDevices(); } catch { return; }
  const fill = (sel, kind, label, cur) => {
    const items = list.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== "default");
    sel.innerHTML = `<option value="">Default ${label}</option>` + items.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `${label[0].toUpperCase() + label.slice(1)} ${i + 1}`)}</option>`).join("");
    sel.value = cur && items.some((d) => d.deviceId === cur) ? cur : "";
  };
  fill($("#camSelect"), "videoinput", "camera", state.camId);
  fill($("#micSelect"), "audioinput", "microphone", state.micId);
}

/* ---------------- After recording ---------------- */
async function decodeAudio(blob) {
  try { ac ||= new AudioContext(); return await ac.decodeAudioData(await blob.arrayBuffer()); } catch { return null; }
}
async function showResult({ blob, type, isAudio, ms, mode }) {
  const ext = L.extForType(type, isAudio);
  const r = { blob, type, isAudio, ext, mode, duration: ms / 1000, width: state.W, height: state.H, name: L.recordingName(mode, new Date(), ext), url: URL.createObjectURL(blob), buffer: null };
  if (isAudio) {
    r.buffer = await decodeAudio(blob);
    if (r.buffer?.duration > 0) r.duration = r.buffer.duration;
  } else {
    try { const info = await probeVideo(blob); if (info.duration > 0) r.duration = info.duration; r.width = info.width || r.width; r.height = info.height || r.height; } catch {}
  }
  if (state.result?.url) URL.revokeObjectURL(state.result.url);
  state.result = r; state.trim = { start: 0, end: r.duration };
  state.lastExport = state.lastMp4 = state.lastWav = null;
  const media = isAudio ? $("#outAudio") : $("#out");
  media.src = r.url;
  state.phase = "done"; note(""); render();
  window.scrollTo({ top: 0 });
  buildStrip(r);
}
function renderResult() {
  const r = state.result;
  if (!r) return;
  $("#out").hidden = r.isAudio; $("#outAudio").hidden = !r.isAudio;
  $("#resultMeta").textContent = [fmtTime(r.duration, true), fmtBytes(r.blob.size), r.width && r.height && !r.isAudio ? `${r.width}×${r.height}` : "", r.ext.toUpperCase()].filter(Boolean).join(" · ");
  $("#dlWebm").textContent = `Download ${r.ext === "webm" ? "WebM" : r.ext.toUpperCase()}`;
  $("#dlMp4").hidden = r.isAudio; $("#dlWav").hidden = !r.isAudio;
  $("#actionsHint").textContent = r.isAudio ? "WebM keeps the file small; WAV works in every audio app. A trimmed WebM plays through once to save."
    : "WebM saves instantly (a trimmed part plays through once to save). MP4 downloads a free video engine (about 31 MB) the first time.";
  renderTrim();
}
const media = () => (state.result?.isAudio ? $("#outAudio") : $("#out"));
function renderTrim() {
  const r = state.result;
  if (!r) return;
  const d = r.duration || 0.001, t = state.trim, pct = (v) => (Math.max(0, Math.min(1, v / d)) * 100).toFixed(3) + "%";
  const sel = $("#sel"); sel.style.left = pct(t.start); sel.style.width = (((t.end - t.start) / d) * 100).toFixed(3) + "%";
  for (const h of $$("#range .h")) {
    const v = t[h.dataset.h];
    h.style.left = pct(v);
    h.setAttribute("aria-valuemax", d.toFixed(1)); h.setAttribute("aria-valuenow", v.toFixed(1)); h.setAttribute("aria-valuetext", fmtTime(v, true));
  }
  $("#tStart").textContent = fmtTime(t.start, true); $("#tEnd").textContent = fmtTime(t.end, true); $("#tLen").textContent = fmtTime(t.end - t.start, true);
  $("#ph").style.left = pct(media().currentTime || 0);
}
let seekPending = null;
function previewAt(t) {
  const first = seekPending == null;
  seekPending = t;
  if (first) requestAnimationFrame(() => { const m = media(); if (seekPending != null && Number.isFinite(seekPending)) m.currentTime = seekPending; seekPending = null; renderTrim(); });
}
function setHandle(which, v) {
  const r = state.result; if (!r) return;
  state.trim = L.moveHandle(state.trim, which, v, r.duration);
  renderTrim(); previewAt(Math.min(state.trim[which], Math.max(0, r.duration - 0.03)));
}
function initTrim() {
  const range = $("#range");
  let dragging = null;
  for (const h of $$("#range .h")) {
    const which = h.dataset.h;
    h.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); h.setPointerCapture?.(e.pointerId); h.focus(); dragging = which; media().pause(); });
    h.addEventListener("pointermove", (e) => { if (dragging !== which || !state.result) return; const b = range.getBoundingClientRect(); setHandle(which, L.xToTime(e.clientX - b.left, b.width, state.result.duration)); });
    const end = () => { dragging = null; };
    h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
    h.addEventListener("keydown", (e) => {
      const r = state.result; if (!r) return;
      const step = e.shiftKey ? 1 : 0.1;
      let v = state.trim[which];
      switch (e.key) {
        case "ArrowLeft": case "ArrowDown": v -= step; break;
        case "ArrowRight": case "ArrowUp": v += step; break;
        case "PageDown": v -= r.duration / 10; break;
        case "PageUp": v += r.duration / 10; break;
        case "Home": v = 0; break;
        case "End": v = r.duration; break;
        default: return;
      }
      e.preventDefault(); setHandle(which, v);
    });
  }
  range.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".h") || !state.result) return;
    const b = range.getBoundingClientRect();
    previewAt(L.xToTime(e.clientX - b.left, b.width, state.result.duration));
  });
  // Playing the preview plays the kept part only.
  for (const m of [$("#out"), $("#outAudio")]) {
    let raf = 0;
    const watch = () => {
      cancelAnimationFrame(raf);
      const t = state.trim;
      if (!m.paused && m.currentTime >= t.end - 0.02) { m.pause(); m.currentTime = t.end; }
      renderTrim();
      if (!m.paused) raf = requestAnimationFrame(watch);
    };
    m.addEventListener("play", () => {
      const t = state.trim;
      if (m.currentTime < t.start - 0.05 || m.currentTime >= t.end - 0.05) m.currentTime = t.start;
      watch();
    });
    m.addEventListener("seeked", renderTrim);
  }
  $("#trimReset").addEventListener("click", () => { if (state.result) { state.trim = { start: 0, end: state.result.duration }; renderTrim(); } });
}
async function buildStrip(r) {
  const strip = $("#strip");
  strip.innerHTML = "";
  const width = $("#range").getBoundingClientRect().width || 600;
  if (r.isAudio) {
    if (!r.buffer) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement("canvas");
    c.width = Math.round(width * dpr); c.height = Math.round(54 * dpr);
    const g = c.getContext("2d"), data = r.buffer.getChannelData(0), per = Math.max(1, Math.floor(data.length / c.width)), mid = c.height / 2;
    g.fillStyle = "#b8b0ff";
    for (let x = 0; x < c.width; x++) {
      let lo = 0, hi = 0;
      for (let i = x * per, e = Math.min(data.length, i + per); i < e; i++) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      g.fillRect(x, mid - Math.max(0.5, hi * mid * 0.95), 1, Math.max(1, (hi - lo) * mid * 0.95));
    }
    strip.append(c);
    return;
  }
  let info;
  try { info = await probeVideo(r.blob, { keep: true }); } catch { return; }
  const el = info.el, ar = info.width && info.height ? info.width / info.height : 16 / 9;
  const n = Math.max(4, Math.min(10, Math.round(width / (54 * ar)))), h = 54, w = Math.max(16, Math.round(h * ar));
  try {
    for (const t of L.stripTimes(r.duration, n)) {
      if (state.result !== r) break;
      await seekTo(el, Math.min(t, Math.max(0, r.duration - 0.05)));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(el, 0, 0, w, h);
      strip.append(c);
    }
  } finally { el.remove(); el.removeAttribute("src"); el.load(); URL.revokeObjectURL(info.url); }
}

/* ---------------- Saving ---------------- */
async function trimAudioWebM(r, t, pb) {
  if (!r.buffer) throw new Error("This browser couldn't read the recorded sound to trim it. Download it untrimmed, or try WAV.");
  const ctx = new AudioContext();
  try {
    await ctx.resume().catch(() => {});
    const dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource();
    src.buffer = r.buffer; src.connect(dest);
    const type = pickType(WEBM_AUDIO_TYPES);
    const rec = new MediaRecorder(dest.stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 128000 });
    const chunks = []; rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const started = once(rec, "start", "error", 5000); rec.start(1000); await started;
    const dur = t.end - t.start, t0 = ctx.currentTime;
    src.start(t0, t.start, dur);
    await new Promise((res, rej) => {
      const iv = setInterval(() => {
        if (pb.signal.aborted) { clearInterval(iv); try { src.stop(); } catch {} return rej(new DOMException("Cancelled", "AbortError")); }
        pb.set("Playing the kept part once to save it…", Math.min(0.99, (ctx.currentTime - t0) / dur));
      }, 150);
      src.onended = () => { clearInterval(iv); res(); };
    });
    const stopped = once(rec, "stop", "error", 10000); rec.stop(); await stopped;
    const bt = L.baseType(rec.mimeType || type || "audio/webm");
    const raw = new Uint8Array(await new Blob(chunks).arrayBuffer());
    return new Blob([/webm/.test(bt) ? fixWebmDuration(raw, dur * 1000) : raw], { type: bt });
  } finally { ctx.close().catch(() => {}); }
}
/** A new save replaces the message of the last one (an old error must not stay on screen). */
function clearNote() { note(""); state.error = ""; }
async function exportWebM() {
  const r = state.result;
  if (!r) return null;
  clearNote();
  const t = state.trim;
  if (!L.isTrimmed(t, r.duration)) {
    downloadBlob(r.blob, r.name); state.lastExport = r.blob;
    note(`Saved ${r.name} (${fmtBytes(r.blob.size)}).`, "ok");
    return r.blob;
  }
  const pb = progressBox(r.isAudio ? "Saving the trimmed sound" : "Saving the trimmed video");
  pb.set("Getting ready…");
  try {
    const blob = r.isAudio ? await trimAudioWebM(r, t, pb)
      : (await exportTrimmedWebM({ blob: r.blob, segments: keptSegments(r.duration, t.start, t.end, "keep"), signal: pb.signal,
        onProgress: (f) => pb.set("Playing the kept part once to save it…", f), onStatus: (s) => pb.set(s) })).blob;
    const name = L.recordingName(r.mode, new Date(), "webm", "-trimmed");
    state.lastExport = blob; downloadBlob(blob, name);
    note(`Saved ${name} (${fmtBytes(blob.size)}).`, "ok");
    return blob;
  } catch (e) {
    if (isAbort(e)) { toast("Cancelled."); return null; }
    state.error = e?.message || String(e); note(state.error, "err"); return null;
  } finally { pb.close(); }
}
async function exportMp4() {
  const r = state.result;
  if (!r || r.isAudio) return null;
  clearNote();
  const t = state.trim;
  const pb = progressBox("Making an MP4");
  pb.set("Getting the video engine ready…");
  try {
    const [{ runFFmpeg }, { trimArgs, inputName }] = await Promise.all([import("../video/ffmpeg.js"), import("../video/ffcmd.js")]);
    const input = inputName(r.name, r.ext);
    const data = await runFFmpeg({
      files: [{ name: input, data: r.blob }], output: "output.mp4", duration: t.end - t.start, signal: pb.signal,
      args: trimArgs({ input, output: "output.mp4", start: t.start, end: t.end, srcW: r.width, srcH: r.height }),
      onProgress: (f) => pb.set(null, f), onStatus: (s, f) => pb.set(s, f),
    });
    const mp4 = new Blob([data], { type: "video/mp4" });
    const name = L.recordingName(r.mode, new Date(), "mp4", L.isTrimmed(t, r.duration) ? "-trimmed" : "");
    state.lastMp4 = mp4; downloadBlob(mp4, name);
    note(`MP4 saved: ${name} (${fmtBytes(mp4.size)}).`, "ok");
    return mp4;
  } catch (e) {
    if (isAbort(e)) { toast("Cancelled."); return null; }
    state.error = e?.message || String(e); note(state.error, "err"); return null;
  } finally { pb.close(); }
}
async function exportWav() {
  const r = state.result;
  if (!r?.isAudio) return null;
  clearNote();
  if (!r.buffer) { note("This browser couldn't read the recorded sound to make a WAV file. Download the WebM instead.", "err"); return null; }
  const { encodeWav } = await import("../video/wav.js");
  const [a, b] = L.sampleRange(r.buffer.sampleRate, r.buffer.length, state.trim.start, state.trim.end);
  const chans = Array.from({ length: Math.min(2, r.buffer.numberOfChannels) }, (_, i) => r.buffer.getChannelData(i).subarray(a, b));
  const blob = new Blob([encodeWav(chans, r.buffer.sampleRate)], { type: "audio/wav" });
  const name = L.recordingName(r.mode, new Date(), "wav", L.isTrimmed(state.trim, r.duration) ? "-trimmed" : "");
  state.lastWav = blob; downloadBlob(blob, name);
  note(`Saved ${name} (${fmtBytes(blob.size)}).`, "ok");
  return blob;
}
async function openInEditor() {
  const r = state.result;
  if (!r) return null;
  try {
    const { putHandoff } = await import("../shared/store.js");
    const trim = { start: state.trim.start, end: state.trim.end };
    const id = await putHandoff(r.isAudio ? { type: "audio-media", blob: r.blob, name: r.name, trim } : { type: "video-media", blob: r.blob, name: r.name, trim });
    location.href = new URL("../video/?handoff=" + encodeURIComponent(id), location.href).href;
    return id;
  } catch (e) { note("Couldn't open the video editor: " + (e?.message || e), "err"); return null; }
}
function reset() {
  if (isLive()) return;
  for (const m of [$("#out"), $("#outAudio")]) { m.pause(); m.removeAttribute("src"); m.load(); }
  if (state.result?.url) URL.revokeObjectURL(state.result.url);
  state.result = null; state.phase = "setup"; note(""); setMsg(""); render();
  $("#startBtn").focus();
}

/* ---------------- Wiring ---------------- */
function selectMode(m, focus = false) {
  if (isLive() || !L.MODES[m]) return;
  if (L.MODES[m].display && sup.screen) { setMsg(sup.screen); return; }
  state.mode = m; setMsg(""); render();
  if (focus) $(`.rec-mode[data-mode="${m}"]`)?.focus();
}
function init() {
  for (const b of $$(".rec-mode")) b.addEventListener("click", () => selectMode(b.dataset.mode));
  $(".rec-modes").addEventListener("keydown", (e) => {
    const order = Object.keys(L.MODES), dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    let i = order.indexOf(state.mode);
    for (let k = 0; k < order.length; k++) { i = (i + dir + order.length) % order.length; if (!(L.MODES[order[i]].display && sup.screen)) break; }
    selectMode(order[i], true);
  });
  $("#optMic").addEventListener("change", (e) => { state.mic = e.target.checked; render(); });
  $("#optTab").addEventListener("change", (e) => { if (state.mode === "audio") state.audioTab = e.target.checked; else state.tabAudio = e.target.checked; render(); });
  $("#optCountdown").addEventListener("change", (e) => { state.countdown = e.target.checked; });
  $("#camSelect").addEventListener("change", (e) => { state.camId = e.target.value; });
  $("#micSelect").addEventListener("change", (e) => { state.micId = e.target.value; });
  for (const b of $$("#bubbleRow [data-size]")) b.addEventListener("click", () => {
    state.bubbleSize = b.dataset.size;
    if (state.bubble) state.bubble = L.resizeBubble(state.bubble, state.bubbleSize, state.W, state.H);
    renderSetup();
  });
  $("#startBtn").addEventListener("click", () => start());
  $("#pauseBtn").addEventListener("click", () => (state.phase === "paused" ? resume() : pause()));
  $("#stopBtn").addEventListener("click", () => stop());
  $("#countCancel").addEventListener("click", () => cancelCountdown?.());
  $("#dlWebm").addEventListener("click", () => exportWebM());
  $("#dlMp4").addEventListener("click", () => exportMp4());
  $("#dlWav").addEventListener("click", () => exportWav());
  $("#toEditor").addEventListener("click", () => openInEditor());
  $("#again").addEventListener("click", reset);
  window.addEventListener("beforeunload", (e) => { if (state.phase === "recording" || state.phase === "paused") { e.preventDefault(); e.returnValue = ""; } });
  initBubble(); initTrim();
  if (caps.mediaDevices) fillDevices();
  render();
}

window.adApp = {
  state, sup, caps, start, stop, pause, resume, exportWebM, exportMp4, exportWav, openInEditor, reset,
  get lastRecording() { return state.result?.blob || null; },
  get lastExport() { return state.lastExport; },
  get lastMp4() { return state.lastMp4; },
  get lastWav() { return state.lastWav; },
  setTrim(start, end) { if (!state.result) return null; state.trim = L.clampTrim({ start, end }, state.result.duration); renderTrim(); return state.trim; },
  setBubble(x, y) { if (!state.bubble) return null; state.bubble = L.clampBubble({ ...state.bubble, x, y }, state.W, state.H); return state.bubble; },
};
init();
