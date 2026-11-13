// Online video recorder: screen, camera, screen + camera bubble, or sound only. Everything stays in the browser;
// MP4 uses the same lazy ffmpeg engine as the site's converter tools (downloaded only when asked for).
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, progressBox, isAbort, mediaErrorText } from "../video/ui.js";
import { pickType, WEBM_VIDEO_TYPES, WEBM_AUDIO_TYPES, bitrateFor, once, probeVideo, seekTo, keptSegments, exportTrimmedWebM, mediaHolder, finishRecording } from "../video/mediakit.js";
import { fixWebmDuration, webmEnd } from "../video/webm.js";
import * as L from "./rec-logic.js";
import { createPrompter, renderPrompterPanel } from "./prompter.js";

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
  mic: true, tabAudio: true, audioTab: false, countdown: true, bubbleSize: "M", bubblePos: "bl", bubbleShape: "circle", template: "", ring: "", camId: "", micId: "",
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
  syncFrame();
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
  if (testSes) { testSes.finish(); await testSes.done; }
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
    const c = L.coverCrop(cw, ch), lw = Math.max(3, Math.round(b.d * 0.022));
    ctx.save(); bubblePath(ctx, b, 0); ctx.clip();
    ctx.drawImage(cam, c.sx, c.sy, c.s, c.s, b.x, b.y, b.d, b.d);
    ctx.restore();
    bubblePath(ctx, b, lw / 2);
    ctx.lineWidth = lw; ctx.strokeStyle = state.ring || "rgba(255,255,255,.95)"; ctx.stroke();
  }
}
/** The camera bubble's outline in its shape (circle, rounded square or square), `inset` px inside the box. */
function bubblePath(ctx, b, inset) {
  const x = b.x + inset, y = b.y + inset, d = b.d - inset * 2, shape = state.bubbleShape;
  ctx.beginPath();
  if (shape === "square") ctx.rect(x, y, d, d);
  else if (shape === "rounded") {
    const r = d * 0.22;
    ctx.moveTo(x + r, y); ctx.lineTo(x + d - r, y); ctx.quadraticCurveTo(x + d, y, x + d, y + r); ctx.lineTo(x + d, y + d - r);
    ctx.quadraticCurveTo(x + d, y + d, x + d - r, y + d); ctx.lineTo(x + r, y + d); ctx.quadraticCurveTo(x, y + d, x, y + d - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  } else ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.closePath();
}
async function trackVideo(track) {
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([track]);
  mediaHolder().append(v);
  v.play().catch(() => {});
  if (!v.videoWidth) await once(v, "loadedmetadata", null, 4000).catch(() => {});
  return v;
}
/** The camera bubble in one corner (bl, br, tl, tr) with the same margin as the default one. */
function cornerBubble(W, H, size, pos = "bl") {
  const b = L.defaultBubble(W, H, size), m = Math.round(Math.min(W, H) * 0.04);
  const x = pos === "br" || pos === "tr" ? W - b.d - m : b.x, y = pos === "tl" || pos === "tr" ? m : b.y;
  return L.clampBubble({ x, y, d: b.d }, W, H);
}
const dropVideo = (v) => { if (!v) return; try { v.pause(); } catch {} v.srcObject = null; v.remove(); };

async function startCompositor(s, dv, cv) {
  const st = dv.getSettings?.() || {};
  const frames = state.compositor !== "canvas" && typeof window.MediaStreamTrackGenerator === "function" && typeof window.MediaStreamTrackProcessor === "function" && typeof OffscreenCanvas === "function" && typeof VideoFrame === "function";
  let sw = st.width, sh = st.height, sv = null;
  if (!frames || !(sw && sh)) { sv = await trackVideo(dv); sw ||= sv.videoWidth; sh ||= sv.videoHeight; }
  const { w: W, h: H } = L.compositeSize(sw, sh);
  state.W = W; state.H = H; state.bubble = cornerBubble(W, H, state.bubbleSize, state.bubblePos);
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
  $("#timer").textContent = txt; $("#badgeTime").textContent = txt; const pt = $("#pillTime"); if (pt) pt.textContent = txt;
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
  let ms = L.clockElapsed(state.clock, performance.now());
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
  if (/webm/.test(type)) {
    const raw = new Uint8Array(await blob.arrayBuffer());
    // The header gets the clock time, or the picture's real end when the encoder wrote frames past it (busy computer,
    // camera frames arriving late): read from the file's own blocks, plus one frame.
    let end = null; try { end = webmEnd(raw); } catch { end = null; }
    if (end && end.video != null) ms = Math.max(ms, Math.round(end.video * 1000 + 1000 / 30));
    blob = new Blob([fixWebmDuration(raw, ms)], { type });
  }
  shell?.setProjectId?.(null);
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

/** Delete while recording (Canva's Delete during a take): stops and throws the recording away, back to the settings. */
function discard({ ask = true } = {}) {
  const s = ses;
  if (!s || !(state.phase === "recording" || state.phase === "paused")) return false;
  if (ask && !confirm("Delete this recording? It is thrown away and you can start again.")) return false;
  clearInterval(s.timer);
  s.hold = true;
  try { s.rec.ondataavailable = null; if (s.rec.state !== "inactive") s.rec.stop(); } catch {}
  teardown(s); ses = null;
  state.clock = L.clockNew(); state.phase = "setup"; render();
  toast("Recording deleted.");
  return true;
}

/* Camera and microphone test: runs only on this device, nothing is recorded or kept. */
let testSes = null;
async function testDevices({ seconds = 6 } = {}) {
  if (testSes) { testSes.finish(); return testSes.done; }
  if (isLive() || state.phase !== "setup") { toast("Stop the recording first."); return null; }
  if (!md?.getUserMedia) { toast("This browser can't use a camera or microphone on this page."); return null; }
  const box = $("#testBox"), btn = $("#testBtn"), live = $("#live");
  box.hidden = false; box.textContent = "Asking for your camera and microphone…";
  const streams = [], res = { camera: null, mic: null };
  const get = async (c) => { try { const s = await md.getUserMedia(c); streams.push(s); return s; } catch (e) { return e; } };
  const cam = await get({ video: state.camId ? { deviceId: { exact: state.camId } } : true });
  const mic = await get({ audio: state.micId ? { deviceId: { exact: state.micId } } : true });
  let finish, stopMeter = null, src = null, poll = 0, peak = 0;
  const done = new Promise((r) => { finish = r; });
  testSes = { finish: () => finish(), done: null };
  btn.textContent = "Stop the test";
  if (cam instanceof MediaStream) {
    const tr = cam.getVideoTracks()[0];
    live.srcObject = cam; live.hidden = false; $("#placeholder").hidden = true; live.play().catch(() => {});
    if (!live.videoWidth) await once(live, "loadedmetadata", null, 4000).catch(() => {});
    const st = tr?.getSettings?.() || {};
    res.camera = { ok: true, w: live.videoWidth || st.width || 0, h: live.videoHeight || st.height || 0, label: tr?.label || "" };
  } else res.camera = { ok: false, error: mediaErrorText(cam, "camera") };
  if (mic instanceof MediaStream) {
    try {
      ac ||= new AudioContext(); await ac.resume().catch(() => {});
      src = ac.createMediaStreamSource(mic);
      const an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize);
      stopMeter = startMeter([src]);
      poll = setInterval(() => { an.getFloatTimeDomainData(buf); peak = Math.max(peak, L.level(buf)); }, 50);
      res.mic = { ok: true, peak: 0, label: mic.getAudioTracks()[0]?.label || "" };
    } catch (e) { res.mic = { ok: false, error: "The microphone opened, but its sound can't be read here: " + (e?.message || e) }; }
  } else res.mic = { ok: false, error: mediaErrorText(mic, "microphone") };
  box.textContent = res.mic?.ok ? `Testing… say something (${seconds} seconds).` : "Testing…";
  const timer = setTimeout(() => finish(), seconds * 1000);
  testSes.done = done.then(() => {
    clearTimeout(timer); clearInterval(poll);
    if (res.mic?.ok) res.mic.peak = Math.round(peak * 1000) / 1000;
    stopMeter?.(); try { src?.disconnect(); } catch {}
    for (const s of streams) for (const t of s.getTracks()) { try { t.stop(); } catch {} }
    if (!isLive()) { live.srcObject = null; }
    testSes = null; btn.textContent = "Test camera and microphone";
    const verdict = L.deviceVerdict(res);
    box.innerHTML = `<ul>${verdict.map((v) => `<li class="${v.ok ? "ok" : "bad"}"><b>${v.ok ? "OK" : "Check"}:</b> ${esc(v.text)}</li>`).join("")}</ul><p class="mx-hint">The test runs only on this device. Nothing is recorded or kept.</p>`;
    state.lastTest = { ...res, verdict };
    render();
    if (state.mode !== "screen" && res.camera?.ok === false && res.mic?.ok) toast("The microphone works but the camera doesn't: you can still record Audio only or Screen.", 6000);
    return state.lastTest;
  });
  return testSes.done;
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
/** Delete this take and record again at once with the same settings. */
async function retake({ ask = true } = {}) {
  if (!state.result || isLive()) return false;
  if (ask && !confirm("Delete this recording and record again with the same settings?")) return false;
  reset(); toast("Recording deleted. Recording again…");
  await start();
  return true;
}
/** Delete the recording and go back to the settings. */
function deleteRecording({ ask = true } = {}) {
  if (!state.result || isLive()) return false;
  if (ask && !confirm("Delete this recording? It can't be brought back unless you saved it to Projects.")) return false;
  reset(); toast("Recording deleted.");
  return true;
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
    renderSetup(); syncFrame();
  });
  $("#startBtn").addEventListener("click", () => start());
  $("#pauseBtn").addEventListener("click", () => (state.phase === "paused" ? resume() : pause()));
  $("#stopBtn").addEventListener("click", () => stop());
  $("#discardBtn").addEventListener("click", () => discard());
  $("#testBtn").addEventListener("click", () => testDevices());
  $("#countCancel").addEventListener("click", () => cancelCountdown?.());
  $("#dlWebm").addEventListener("click", () => exportWebM());
  $("#dlMp4").addEventListener("click", () => exportMp4());
  $("#dlWav").addEventListener("click", () => exportWav());
  $("#toEditor").addEventListener("click", () => openInEditor());
  $("#again").addEventListener("click", reset);
  $("#retake").addEventListener("click", () => retake());
  $("#deleteRec").addEventListener("click", () => deleteRecording());
  window.addEventListener("beforeunload", (e) => { if (state.phase === "recording" || state.phase === "paused") { e.preventDefault(); e.returnValue = ""; } });
  initBubble(); initTrim();
  if (caps.mediaDevices) fillDevices();
  render();
}

/* ---------------- Editor frame (shared full-screen shell) ---------------- */
let shell = null, gallery = null, pill = null, toolsEl = null, uploadsEl = null, prompter = null;
const PI = {
  screen: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
  camera: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.2"/><path d="m15.5 11 5.5-3v8l-5.5-3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  rec: '<circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  again: '<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3M4.6 4.3v3.9h3.9"/>',
};
const pi = (n) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PI[n]}</svg>`;
const hasScreen = (m = state.mode) => !!L.MODES[m]?.display;
const hasCamera = (m = state.mode) => !!L.MODES[m]?.camera;
const modeFor = (screenOn, cameraOn) => (screenOn && cameraOn ? "both" : screenOn ? "screen" : cameraOn ? "camera" : "audio");

function buildPill() {
  const el = document.createElement("div");
  el.className = "rec-pill"; el.id = "recPill";
  el.innerHTML = `<button type="button" class="rec-pbtn" id="pillScreen" aria-pressed="false" title="Record the screen">${pi("screen")}<span>Screen</span></button>
    <button type="button" class="rec-pbtn" id="pillCamera" aria-pressed="false" title="Record the camera">${pi("camera")}<span>Camera</span></button>
    <button type="button" class="rec-pbtn" id="pillMic" aria-pressed="false" title="Record the microphone">${pi("mic")}<span>Mic</span></button>
    <span class="rec-psep" aria-hidden="true"></span>
    <span class="rec-ptime mx-time" id="pillTime" hidden>0:00</span>
    <button type="button" class="rec-pbtn" id="pillPause" hidden>${pi("pause")}<span>Pause</span></button>
    <button type="button" class="rec-pbtn rec-precord" id="pillRecord">${pi("rec")}<span>Record</span></button>`;
  el.querySelector("#pillScreen").addEventListener("click", () => toggleSource("screen"));
  el.querySelector("#pillCamera").addEventListener("click", () => toggleSource("camera"));
  el.querySelector("#pillMic").addEventListener("click", () => { if (isLive()) return; state.mic = !state.mic; render(); toast(state.mic ? "Microphone on" : "Microphone off"); });
  el.querySelector("#pillPause").addEventListener("click", () => (state.phase === "paused" ? resume() : pause()));
  el.querySelector("#pillRecord").addEventListener("click", () => {
    if (state.phase === "recording" || state.phase === "paused") stop();
    else if (state.phase === "done") reset();
    else if (state.phase === "setup") start();
    else if (state.phase === "countdown") cancelCountdown?.();
  });
  return el;
}
function toggleSource(which) {
  if (isLive()) return;
  const s = hasScreen(), c = hasCamera();
  const next = modeFor(which === "screen" ? !s : s, which === "camera" ? !c : c);
  if (L.MODES[next].display && sup.screen) { toast(sup.screen, 5000); setMsg(sup.screen); return; }
  if (next === "audio" && !state.mic) state.mic = true;
  if (state.phase === "done") reset();
  selectMode(next);
  toast(`Recording: ${L.MODES[next].label}`);
}
function syncFrame() {
  if (!pill) return;
  const live = isLive(), ph = state.phase, rec = ph === "recording" || ph === "paused";
  const set = (id, on, dis) => { const b = pill.querySelector(id); b.setAttribute("aria-pressed", String(on)); b.disabled = dis; };
  set("#pillScreen", hasScreen(), live); set("#pillCamera", hasCamera(), live); set("#pillMic", state.mic, live);
  const rb = pill.querySelector("#pillRecord");
  const [ic, label, aria] = rec ? ["stop", "Stop", "Stop recording"] : ph === "done" ? ["again", "New recording", "Start a new recording"]
    : ph === "countdown" ? ["stop", "Cancel", "Cancel the countdown"] : ph === "starting" ? ["rec", "Waiting…", "Waiting for permission"]
      : ph === "processing" ? ["rec", "Saving…", "Saving your recording"] : ["rec", "Record", "Start recording"];
  rb.innerHTML = pi(ic) + `<span>${label}</span>`; rb.setAttribute("aria-label", aria); rb.title = aria;
  rb.disabled = ph === "starting" || ph === "processing" || (ph === "setup" && !!sup.fatal);
  rb.classList.toggle("on", rec);
  const pb = pill.querySelector("#pillPause");
  pb.hidden = !rec; pb.innerHTML = pi(ph === "paused" ? "rec" : "pause") + `<span>${ph === "paused" ? "Resume" : "Pause"}</span>`;
  pb.setAttribute("aria-label", ph === "paused" ? "Resume recording" : "Pause recording");
  const tm = pill.querySelector("#pillTime"); tm.hidden = !rec; tm.textContent = $("#timer").textContent;
  if (shell) shell.setSaved(rec || ph === "processing" ? "saving" : "saved");
  if (toolsEl?.isConnected && !toolsEl.closest("[hidden]")) {
    const f = document.activeElement?.id;
    drawTools(toolsEl);
    if (f && toolsEl.querySelector("#" + f)) toolsEl.querySelector("#" + f).focus({ preventScroll: true });
  }
}

/** Applies a recording layout template (sources, camera bubble, sound, countdown). */
function applyTemplate(id) {
  const setup = gallery?.setupOf?.(id);
  if (!setup) { toast("That template isn't available."); return false; }
  if (isLive()) { toast("Stop the recording first, then pick a layout."); return false; }
  if (state.phase === "done") reset();
  let mode = setup.mode;
  if (L.MODES[mode].display && sup.screen) { mode = "camera"; toast(sup.screen, 5000); }
  Object.assign(state, { mode, bubbleSize: setup.bubbleSize, bubblePos: setup.bubblePos, mic: setup.mic, countdown: setup.countdown, template: id, ring: setup.ring || "" });
  if (mode === "audio") state.audioTab = !!setup.tabAudio; else state.tabAudio = !!setup.tabAudio;
  setMsg(""); render();
  const hint = $("#tplNote");
  if (hint) {
    hint.hidden = false; hint.style.setProperty("--ring", setup.ring || "#fff");
    hint.querySelector("b").textContent = setup.name;
    hint.querySelector("span").textContent = setup.hint || "";
    const ol = hint.querySelector("ol"); ol.replaceChildren(...(setup.points || []).map((x) => { const li = document.createElement("li"); li.textContent = x; return li; }));
    hint.querySelector("small").textContent = setup.ring && L.MODES[mode].display && L.MODES[mode].camera ? `Camera bubble ring: ${setup.palette}` : "";
  }
  if (setup.title) shell?.setTitle?.(setup.title);
  showTemplateArt(id);
  toast(`Template: ${setup.name}`);
  return true;
}
/** The template's picture (shared screen, camera bubble, title) on the stage until the camera or screen starts. */
function showTemplateArt(id) {
  const ph = $("#placeholder"); if (!ph || typeof gallery?.preview !== "function") return;
  let art = ph.querySelector(".rec-tpl-art");
  if (!art) { art = document.createElement("div"); art.className = "rec-tpl-art"; art.setAttribute("aria-hidden", "true"); ph.prepend(art); }
  try { art.innerHTML = gallery.preview(id); ph.classList.add("has-art"); } catch { art.remove(); ph.classList.remove("has-art"); }
}

function seg(label, items, cur, onPick, attr) {
  const wrap = document.createElement("div");
  wrap.className = "mx-seg rec-tseg"; wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", label);
  for (const [v, t] of items) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = t; b.setAttribute("aria-pressed", String(v === cur)); b.dataset[attr] = v; b.disabled = isLive() && attr !== "tsize" && attr !== "tpos" && attr !== "tshape";
    b.addEventListener("click", () => onPick(v));
    wrap.append(b);
  }
  return wrap;
}
function drawTools(el) {
  const live = isLive(), m = L.MODES[state.mode];
  el.replaceChildren();
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  el.append(h("p", "rec-tmuted", live ? "Recording now: the settings below are locked until you stop." : "Choose what to record and how. Your choices are used when you press Record."));
  el.append(h("h3", "rec-th", "What to record"));
  el.append(seg("What to record", Object.entries(L.MODES).map(([k, v]) => [k, v.label]), state.mode, (v) => selectMode(v), "tmode"));
  // Microphone
  el.append(h("h3", "rec-th", "Microphone"));
  const mic = h("label", "rec-check"); const mi = document.createElement("input"); mi.type = "checkbox"; mi.id = "tMic"; mi.checked = state.mic; mi.disabled = live;
  mi.addEventListener("change", () => { state.mic = mi.checked; render(); }); mic.append(mi, " Record my microphone"); el.append(mic);
  const ms = $("#micSelect").cloneNode(true); ms.id = "tMicSel"; ms.value = state.micId; ms.disabled = live || !state.mic; ms.setAttribute("aria-label", "Microphone to use");
  ms.addEventListener("change", () => { state.micId = ms.value; $("#micSelect").value = ms.value; }); el.append(ms);
  // Camera
  if (m.camera) {
    el.append(h("h3", "rec-th", "Camera"));
    const cs = $("#camSelect").cloneNode(true); cs.id = "tCamSel"; cs.value = state.camId; cs.disabled = live; cs.setAttribute("aria-label", "Camera to use");
    cs.addEventListener("change", () => { state.camId = cs.value; $("#camSelect").value = cs.value; }); el.append(cs);
  }
  if (m.display && m.camera) {
    el.append(h("h3", "rec-th", "Camera bubble"));
    el.append(seg("Bubble size", [["S", "Small"], ["M", "Medium"], ["L", "Large"]], state.bubbleSize, (v) => { state.bubbleSize = v; if (state.bubble) state.bubble = L.resizeBubble(state.bubble, v, state.W, state.H); render(); }, "tsize"));
    el.append(seg("Bubble corner", [["tl", "Top left"], ["tr", "Top right"], ["bl", "Bottom left"], ["br", "Bottom right"]], state.bubblePos, (v) => { state.bubblePos = v; if (state.bubble) state.bubble = cornerBubble(state.W, state.H, state.bubbleSize, v); render(); }, "tpos"));
    el.append(seg("Bubble shape", [["circle", "Circle"], ["rounded", "Rounded"], ["square", "Square"]], state.bubbleShape, (v) => { state.bubbleShape = v; render(); }, "tshape"));
  }
  // Screen and tab sound
  if (caps.getDisplayMedia && state.mode !== "camera") {
    el.append(h("h3", "rec-th", m.display ? "Screen" : "Tab sound"));
    const tl = h("label", "rec-check"); const ti = document.createElement("input"); ti.type = "checkbox"; ti.id = "tTab"; ti.checked = wantTab(); ti.disabled = live;
    ti.addEventListener("change", () => { if (state.mode === "audio") state.audioTab = ti.checked; else state.tabAudio = ti.checked; render(); });
    tl.append(ti, state.mode === "audio" ? " Also record a tab's sound" : " Record tab or system sound"); el.append(tl);
    if (m.display) el.append(h("p", "rec-tmuted", "When you press Record, the browser asks which screen, window or tab to share."));
  }
  if (sup.screen) el.append(h("p", "rec-tmuted", sup.screen));
  el.append(h("h3", "rec-th", "Before recording"));
  const cl = h("label", "rec-check"); const ci = document.createElement("input"); ci.type = "checkbox"; ci.id = "tCountdown"; ci.checked = state.countdown; ci.disabled = live;
  ci.addEventListener("change", () => { state.countdown = ci.checked; render(); }); cl.append(ci, " 3-second countdown"); el.append(cl);
  const find = h("button", "btn block rec-tfind", "Find my camera and microphone"); find.type = "button"; find.id = "tFind"; find.disabled = live || !md?.getUserMedia;
  find.addEventListener("click", findDevices); el.append(find);
  const test = h("button", "btn block rec-tfind", "Test camera and microphone"); test.type = "button"; test.id = "tTest"; test.disabled = live || !md?.getUserMedia;
  test.addEventListener("click", () => { testDevices(); if (matchMedia("(max-width: 759.98px)").matches) shell?.closePanel(); }); el.append(test);
  el.append(h("p", "rec-tmuted", "This asks for permission once, so the lists above show the names of your devices. Nothing is recorded."));
}
async function findDevices() {
  try {
    const st = await md.getUserMedia({ audio: true, video: true }).catch(() => md.getUserMedia({ audio: true }));
    st.getTracks().forEach((t) => t.stop());
    await fillDevices();
    const list = await md.enumerateDevices();
    const cams = list.filter((d) => d.kind === "videoinput").length, mics = list.filter((d) => d.kind === "audioinput").length;
    toast(`Found ${cams} camera${cams === 1 ? "" : "s"} and ${mics} microphone${mics === 1 ? "" : "s"}.`);
    if (toolsEl) drawTools(toolsEl);
  } catch (e) { toast(mediaErrorText(e, "camera and microphone"), 6000); }
}

/** Opens a video or sound file from this device in the result screen (trim, save, convert, send to the editor). */
async function openFile(file) {
  if (!file) return false;
  if (isLive()) { toast("Stop the recording first."); return false; }
  const isAudio = /^audio\//.test(file.type) || /\.(mp3|wav|m4a|ogg|flac|opus)$/i.test(file.name);
  if (!isAudio && !/^video\//.test(file.type) && !/\.(webm|mp4|mov|mkv|m4v)$/i.test(file.name)) { toast(`${file.name}: please choose a video or sound file.`); return false; }
  const type = file.type || (isAudio ? "audio/webm" : "video/webm");
  shell?.setProjectId?.(null);
  await showResult({ blob: file, type, isAudio, ms: 0, mode: isAudio ? "audio" : "camera" });
  state.result.name = file.name;
  uploads.unshift({ name: file.name, blob: file, type, isAudio }); uploads.splice(6);
  if (uploadsEl) drawUploads(uploadsEl);
  render();
  toast(`Opened ${file.name}`);
  return true;
}
const uploads = [];
function drawUploads(el) {
  el.replaceChildren();
  const lab = document.createElement("label"); lab.className = "rec-drop";
  lab.innerHTML = `<input type="file" id="recUpload" accept="video/*,audio/*,.webm,.mp4,.mov,.mkv,.mp3,.wav,.m4a,.ogg" hidden><b>Upload a video or sound</b><small>Trim it, save it as WebM, MP4 or WAV, or send it to the video editor. It stays on this device.</small>`;
  const inp = lab.querySelector("input");
  inp.addEventListener("change", async () => { const f = inp.files[0]; inp.value = ""; if (await openFile(f) && matchMedia("(max-width: 759.98px)").matches) shell?.closePanel(); });
  lab.addEventListener("dragover", (e) => { e.preventDefault(); lab.classList.add("on"); });
  lab.addEventListener("dragleave", () => lab.classList.remove("on"));
  lab.addEventListener("drop", (e) => { e.preventDefault(); lab.classList.remove("on"); openFile(e.dataTransfer?.files?.[0]); });
  el.append(lab);
  const hd = document.createElement("h3"); hd.className = "rec-th"; hd.textContent = "Opened in this session"; el.append(hd);
  if (!uploads.length) { const p = document.createElement("p"); p.className = "rec-tmuted"; p.textContent = "Nothing opened yet. Your recordings can be kept under Projects."; el.append(p); }
  for (const u of uploads) {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn block rec-uprow";
    b.textContent = `${u.isAudio ? "Sound" : "Video"}: ${u.name}`;
    b.addEventListener("click", () => openFile(new File([u.blob], u.name, { type: u.type })));
    el.append(b);
  }
}

function frameThumb() {
  const v = $("#out"), r = state.result;
  if (!r || r.isAudio || !v.videoWidth) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#f3f1ff"/><rect x="70" y="18" width="20" height="34" rx="10" fill="#5b4cf0"/><path d="M62 44a18 18 0 0 0 36 0M80 62v8" fill="none" stroke="#5b4cf0" stroke-width="4" stroke-linecap="round"/></svg>`;
  try { const c = document.createElement("canvas"); c.width = 240; c.height = Math.round(240 * v.videoHeight / v.videoWidth); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.7); } catch { return ""; }
}
const needResult = () => { if (!state.result) { toast("Record something first (or upload a file)."); return false; } return true; };

async function mountFrame() {
  let mod;
  try { [mod, gallery] = await Promise.all([import("../shared/editor-shell.js"), import("./gallery.js")]); } catch (e) { console.warn("The editor frame could not load", e); return null; }
  pill = buildPill();
  if (!prompter && $("#stage")) prompter = createPrompter($("#stage"), () => state.phase);
  const note = document.createElement("p");
  note.className = "mx-msg rec-tplnote"; note.id = "tplNote"; note.hidden = true; note.innerHTML = '<b></b> <span></span><em class="rec-tplpts">Talking points</em><ol></ol><small></small>';
  $("#setup .rec-options")?.prepend(note);
  try {
    shell = mod.mountShell({
      app: "recorder", kind: "Recording", title: "Untitled recording", home: "/tools/online-video-recorder",
      stage: $("main.mx-main"), toolbar: pill, formulaBar: null, resize: null,
      file: [
        { label: "New recording", act: () => { if (isLive()) toast("Stop the recording first."); else { reset(); toast("Ready for a new recording"); } } },
        { label: "Upload a video or sound…", act: () => shell.openPanel("uploads") },
        { label: "Recording settings", act: () => shell.openPanel("tools") },
        { label: "Download WebM", group: "Download", act: () => needResult() && exportWebM() },
        { label: "Download MP4", group: "Download", act: () => needResult() && (state.result.isAudio ? toast("This is a sound recording. Download WebM or WAV.") : exportMp4()) },
        { label: "Download WAV (sound only)", group: "Download", act: () => needResult() && (state.result.isAudio ? exportWav() : toast("WAV is for sound recordings. Download WebM or MP4.")) },
        { label: "Open in video editor", group: "Edit", act: () => needResult() && openInEditor() },
        { label: "Reset the trim", group: "Edit", act: () => { if (needResult()) $("#trimReset").click(); } },
        { label: "Retake (record again)", group: "Edit", act: () => { if (needResult()) retake(); } },
        { label: "Delete this recording", group: "Edit", act: () => { if (needResult()) deleteRecording(); } },
      ],
      share: {
        download: [
          { label: "WebM video or sound", act: () => needResult() && exportWebM() },
          { label: "MP4 video", act: () => needResult() && (state.result.isAudio ? toast("This is a sound recording. Download WebM or WAV.") : exportMp4()) },
          { label: "WAV sound", act: () => needResult() && (state.result.isAudio ? exportWav() : toast("WAV is for sound recordings.")) },
        ],
        link: () => location.origin + location.pathname,
      },
      templates: { gallery, tool: "online-video-recorder", apply: async (id) => { applyTemplate(id); if (matchMedia("(max-width: 759.98px)").matches) shell?.closePanel(); }, placeholder: "Search recording layouts" },
      panels: {
        tools: { label: "Tools", icon: "tools", render: (el) => { toolsEl = el; drawTools(el); }, refresh: true },
        uploads: { label: "Uploads", icon: "uploads", render: (el) => { uploadsEl = el; drawUploads(el); }, refresh: true },
        prompter: { label: "Teleprompter", icon: "notes", render: (el) => renderPrompterPanel(el, prompter) },
      },
      rail: ["templates", "tools", "prompter", "uploads", "projects", "apps"],
      projects: {
        save: async () => {
          const r = state.result;
          if (!r) throw new Error("Record something first, then save it to Projects.");
          return { name: r.name, data: { blob: r.blob, type: r.type, isAudio: r.isAudio, ext: r.ext, mode: r.mode, duration: r.duration, width: r.width, height: r.height, name: r.name, trim: { ...state.trim } }, thumb: frameThumb() };
        },
        open: async (rec) => {
          const d = rec?.data;
          if (!d?.blob) throw new Error("This project has no recording in it.");
          if (isLive()) throw new Error("Stop the recording first.");
          await showResult({ blob: d.blob, type: d.type, isAudio: d.isAudio, ms: (d.duration || 0) * 1000, mode: d.mode });
          state.result.name = d.name || state.result.name;
          if (d.trim) { state.trim = L.clampTrim(d.trim, state.result.duration); renderTrim(); }
        },
      },
      bottom: { notes: true, outline: null, timer: true, zoom: null, pages: null, fullscreen: true, help: true },
      shortcuts: [["Space (on the player)", "Play or pause the recording"], ["Arrow keys (camera bubble)", "Move the bubble while recording"], ["Escape", "Cancel the countdown"]],
      setMode: (m) => { if (m !== "edit" && (state.phase === "recording" || state.phase === "paused")) toast("Still recording. Switch back to Editing to stop."); },
    });
  } catch (e) { console.error("The editor frame could not start", e); shell = null; return null; }
  document.body.classList.add("has-shell");
  const tpl = params.get("template");
  if (tpl) applyTemplate(tpl);
  else if (params.get("new") === "1") { state.template = ""; }
  syncFrame();
  return shell;
}

window.adApp = {
  state, sup, caps, start, stop, pause, resume, exportWebM, exportMp4, exportWav, openInEditor, reset,
  applyTemplate, openFile, get shell() { return shell; }, get prompter() { return prompter; }, retake, deleteRecording, discard, testDevices,
  get lastRecording() { return state.result?.blob || null; },
  get lastExport() { return state.lastExport; },
  get lastMp4() { return state.lastMp4; },
  get lastWav() { return state.lastWav; },
  setTrim(start, end) { if (!state.result) return null; state.trim = L.clampTrim({ start, end }, state.result.duration); renderTrim(); return state.trim; },
  setBubble(x, y) { if (!state.bubble) return null; state.bubble = L.clampBubble({ ...state.bubble, x, y }, state.W, state.H); return state.bubble; },
};
init();
mountFrame();
