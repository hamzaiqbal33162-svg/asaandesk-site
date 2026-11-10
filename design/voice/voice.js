// Text to speech voiceover: browser voices (Web Speech API) with sentence and word highlighting, honest export
// options (script file, captions for the video editor, your own voice recorded with the microphone) and
// AI voices only when AsaanDesk AI is switched on.
import { $, esc, toast, downloadBlob, fmtTime, fmtBytes, mediaErrorText } from "../video/ui.js";
import { audioBufferToWav } from "../video/wav.js";
import { pickType, WEBM_AUDIO_TYPES } from "../video/mediakit.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { putHandoff } from "../shared/store.js";
import { VOICE_STYLES, VOICE_LANGS, VOICE_SPEEDS, resultMedia, extForMime as aiExt } from "../ai-media/tools.js";
import * as VT from "./voice-text.js";

const synth = globalThis.speechSynthesis || null;
const Utter = globalThis.SpeechSynthesisUtterance || null;
const SETTINGS = "asaandesk-voice-settings", DRAFT = "asaandesk-voice-script";
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

const scriptEl = $("#script"), reader = $("#reader"), voiceSel = $("#voiceSel");
const playBtn = $("#playBtn"), pauseBtn = $("#pauseBtn"), stopBtn = $("#stopBtn");
const saved = store.get(SETTINGS) || {};
const state = {
  status: "idle", text: "", chunks: [], idx: -1, word: null, run: 0, gap: null, gapTimer: 0, utter: null,
  boundaries: 0, chunkBoundaries: 0, silentChunks: 0, voices: [], groups: [], voiceKey: saved.voice || "",
  rate: clamp(saved.rate, 0.5, 2, 1), pitch: clamp(saved.pitch, 0, 2, 1), volume: clamp(saved.volume, 0, 1, 1),
};
function clamp(v, lo, hi, d) { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; }

// ---------- voices ----------
function currentVoice() { return state.voices.find((v) => VT.voiceKey(v) === state.voiceKey) || null; }
function loadVoices() {
  const list = synth ? synth.getVoices() || [] : [];
  if (!list.length && state.voices.length) return;
  state.voices = list;
  state.groups = VT.groupVoices(list);
  voiceSel.innerHTML = "";
  if (!list.length) { voiceSel.append(new Option("Browser default voice", "")); voiceSel.disabled = !synth; return; }
  voiceSel.disabled = false;
  for (const g of state.groups) {
    const og = document.createElement("optgroup"); og.label = g.label;
    for (const v of g.voices) og.append(new Option(`${v.name} (${VT.normLang(v.lang)})${v.localService === false ? " · online" : ""}`, VT.voiceKey(v)));
    voiceSel.append(og);
  }
  const pick = VT.pickDefaultVoice(list, state.voiceKey);
  state.voiceKey = VT.voiceKey(pick);
  voiceSel.value = state.voiceKey;
  $("#voiceMsg").hidden = true;
}
function voiceMsg(text, err = false) { const m = $("#voiceMsg"); m.textContent = text; m.classList.toggle("err", err); m.hidden = !text; }
function initVoices() {
  if (!synth || !Utter) {
    voiceMsg("This browser can't read text aloud. Try Chrome, Edge or Safari. You can still record your own voice below.", true);
    playBtn.disabled = true; voiceSel.append(new Option("No voices in this browser", "")); voiceSel.disabled = true;
    return;
  }
  if (synth.addEventListener) synth.addEventListener("voiceschanged", loadVoices); else synth.onvoiceschanged = loadVoices;
  loadVoices();
  // Some browsers (Safari) never fire voiceschanged: look again a few times.
  for (const ms of [250, 1000, 2500]) setTimeout(() => { if (!state.voices.length) loadVoices(); }, ms);
  setTimeout(() => { if (!state.voices.length) voiceMsg("No voices were found on this device yet. Play will use the browser's default voice if it has one."); }, 3200);
}
voiceSel.addEventListener("change", () => {
  state.voiceKey = voiceSel.value; saveSettings();
  if (state.status === "playing") play(state.idx);
});

// ---------- settings ----------
function saveSettings() { store.set(SETTINGS, { voice: state.voiceKey, rate: state.rate, pitch: state.pitch, volume: state.volume }); }
function showSettings() {
  $("#rate").value = state.rate; $("#pitch").value = state.pitch; $("#volume").value = state.volume;
  $("#rateOut").textContent = state.rate.toFixed(1) + "×"; $("#pitchOut").textContent = state.pitch.toFixed(1); $("#volumeOut").textContent = Math.round(state.volume * 100) + "%";
  updateStats();
}
for (const k of ["rate", "pitch", "volume"]) $("#" + k).addEventListener("input", (e) => { state[k] = Number(e.target.value); showSettings(); saveSettings(); });
$("#resetBtn").addEventListener("click", () => { state.rate = 1; state.pitch = 1; state.volume = 1; showSettings(); saveSettings(); toast("Settings reset."); });

function updateStats() {
  const t = scriptEl.value, w = VT.wordCount(t);
  $("#stats").textContent = w ? `${w} word${w === 1 ? "" : "s"} · about ${fmtTime(VT.estimateSeconds(t, { rate: state.rate }))}` : "Empty";
}
scriptEl.addEventListener("input", () => { updateStats(); store.set(DRAFT, scriptEl.value); });

// ---------- reading ----------
function setStatus(s) {
  state.status = s;
  const busy = s !== "idle";
  playBtn.disabled = !synth || !Utter;
  playBtn.textContent = s === "playing" ? "↺ Restart" : "▶ Play";
  pauseBtn.disabled = !busy;
  pauseBtn.textContent = s === "paused" ? "▶ Resume" : "❚❚ Pause";
  pauseBtn.setAttribute("aria-pressed", String(s === "paused"));
  stopBtn.disabled = !busy;
  $("#playState").textContent = s === "playing" ? `Reading sentence ${state.idx + 1} of ${state.chunks.length}` : s === "paused" ? "Paused" : "";
  scriptEl.hidden = busy; reader.hidden = !busy;
  document.body.dataset.voice = s;
}
function renderReader() {
  const t = state.text; let html = "", pos = 0;
  state.chunks.forEach((c, i) => { html += esc(t.slice(pos, c.start)) + `<span class="s" data-i="${i}">${esc(c.text)}</span>`; pos = c.end; });
  reader.innerHTML = html + esc(t.slice(pos));
  state.lit = null;
}
function highlight() {
  if (state.lit && state.lit.dataset.i !== String(state.idx)) { state.lit.classList.remove("on"); state.lit.textContent = state.chunks[Number(state.lit.dataset.i)]?.text ?? state.lit.textContent; state.lit = null; }
  const span = reader.querySelector(`.s[data-i="${state.idx}"]`);
  if (!span) return;
  const c = state.chunks[state.idx], w = state.word;
  span.classList.add("on");
  if (w && w.start >= c.start && w.end <= c.end) {
    const a = w.start - c.start, b = w.end - c.start;
    span.innerHTML = esc(c.text.slice(0, a)) + `<mark class="w">${esc(c.text.slice(a, b))}</mark>` + esc(c.text.slice(b));
  } else span.textContent = c.text;
  if (state.lit !== span) { state.lit = span; span.scrollIntoView?.({ block: "nearest" }); }
  if (state.status === "playing") $("#playState").textContent = `Reading sentence ${state.idx + 1} of ${state.chunks.length}`;
}
function play(from = 0) {
  if (!synth || !Utter) return;
  const text = scriptEl.value, chunks = VT.splitScript(text);
  if (!chunks.length) { toast("Type something to read first."); scriptEl.focus(); return; }
  haltSpeech();
  state.text = text; state.chunks = chunks; state.word = null; state.boundaries = 0; state.silentChunks = 0;
  $("#wordNote").hidden = true;
  renderReader();
  setStatus("playing");
  speakChunk(Math.max(0, Math.min(chunks.length - 1, from | 0)), state.run);
}
function speakChunk(i, run) {
  if (run !== state.run) return;
  const c = state.chunks[i];
  if (!c) return finish(run);
  state.idx = i; state.word = null; state.chunkBoundaries = 0;
  highlight();
  const u = new Utter(c.text), v = currentVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = state.rate; u.pitch = state.pitch; u.volume = state.volume;
  u.onboundary = (e) => {
    if (run !== state.run || (e.name && e.name !== "word")) return;
    const r = VT.boundaryRange(c, e.charIndex, e.charLength);
    if (r) { state.word = r; state.boundaries++; state.chunkBoundaries++; highlight(); }
  };
  u.onend = () => {
    if (run !== state.run) return;
    if (!state.chunkBoundaries && VT.wordCount(c.text) > 1 && ++state.silentChunks >= 1 && !state.boundaries) $("#wordNote").hidden = false;
    state.word = null; highlight();
    if (c.pauseAfterMs > 0 && i + 1 < state.chunks.length) startGap(c.pauseAfterMs, i + 1, run);
    else speakChunk(i + 1, run);
  };
  u.onerror = (e) => {
    if (run !== state.run || e.error === "interrupted" || e.error === "canceled") return;
    finish(run);
    voiceMsg(`The voice stopped (${e.error || "unknown error"}). Try another voice.`, true);
  };
  state.utter = u; // keep a reference: some browsers drop events of collected utterances
  synth.speak(u);
}
function startGap(ms, next, run) {
  state.gap = { next, run, left: ms, at: performance.now() };
  state.gapTimer = setTimeout(() => { state.gap = null; speakChunk(next, run); }, ms);
}
function haltSpeech() {
  state.run++;
  clearTimeout(state.gapTimer); state.gap = null;
  try { synth?.cancel(); } catch {}
}
function finish(run) {
  if (run !== state.run) return;
  haltSpeech();
  state.idx = -1; state.word = null;
  setStatus("idle");
  toast("Finished reading.");
}
function pause() {
  if (state.status !== "playing") return;
  if (state.gap) { clearTimeout(state.gapTimer); state.gap.left -= performance.now() - state.gap.at; } else synth.pause();
  setStatus("paused");
}
function resume() {
  if (state.status !== "paused") return;
  setStatus("playing");
  if (state.gap) { const g = state.gap; g.at = performance.now(); state.gapTimer = setTimeout(() => { state.gap = null; speakChunk(g.next, g.run); }, Math.max(0, g.left)); }
  else synth.resume();
  highlight();
}
function stop() {
  if (state.status === "idle") return;
  haltSpeech();
  state.idx = -1; state.word = null;
  setStatus("idle");
  scriptEl.focus();
}
playBtn.addEventListener("click", () => play(0));
pauseBtn.addEventListener("click", () => (state.status === "paused" ? resume() : pause()));
stopBtn.addEventListener("click", stop);
reader.addEventListener("click", (e) => { const s = e.target.closest?.(".s"); if (s) play(Number(s.dataset.i)); });
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); state.status === "idle" ? play(0) : state.status === "paused" ? resume() : pause(); }
  else if (e.key === "Escape" && state.status !== "idle") { e.preventDefault(); stop(); }
});
addEventListener("pagehide", () => { try { synth?.cancel(); } catch {} });

// ---------- export: script and captions ----------
const captionLines = () => VT.captionTimes(scriptEl.value, { rate: state.rate });
$("#dlScript").addEventListener("click", () => {
  const t = scriptEl.value;
  if (!t.trim()) return toast("Type a script first.");
  downloadBlob(new Blob([t.endsWith("\n") ? t : t + "\n"], { type: "text/plain;charset=utf-8" }), VT.scriptFileName(t));
  toast("Script downloaded.");
});
$("#toCaptions").addEventListener("click", async (e) => {
  const b = e.currentTarget, lines = captionLines();
  if (!lines.length) return toast("Type a script first.");
  b.disabled = true;
  try {
    const id = await putHandoff({ type: "captions", lines, source: "voice" });
    location.href = "/design/video/?handoff=" + encodeURIComponent(id);
  } catch { b.disabled = false; toast("Couldn't open the video editor. Is browser storage turned off?"); }
});

// ---------- record with microphone ----------
const rec = { status: "idle", mr: null, stream: null, chunks: [], blob: null, mime: "", acc: 0, startedAt: 0, timer: 0, ac: null, raf: 0, wav: null, url: "", seconds: 0 };
const recPanel = $("#recPanel"), prompter = $("#prompter");
function recUi() {
  recPanel.classList.toggle("recording", rec.status === "recording");
  recPanel.classList.toggle("paused", rec.status === "paused");
  const live = rec.status === "recording" || rec.status === "paused";
  $("#recStart").disabled = live || rec.status === "starting";
  $("#recStart").textContent = rec.blob ? "● Record again" : "● Start recording";
  $("#recPause").disabled = !live;
  $("#recPause").textContent = rec.status === "paused" ? "▶ Resume" : "❚❚ Pause";
  $("#recStop").disabled = !live;
}
function recError(text) { const m = $("#recMsg"); m.textContent = text; m.hidden = !text; }
const recElapsed = () => rec.acc + (rec.status === "recording" ? performance.now() - rec.startedAt : 0);
$("#recOpen").addEventListener("click", () => {
  recPanel.hidden = false;
  prompter.textContent = scriptEl.value.trim() || "Type your script above, then read it here while you record.";
  recPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  $("#recStart").focus({ preventScroll: true });
});
function meterStart(stream) {
  try {
    rec.ac = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const an = rec.ac.createAnalyser(); an.fftSize = 1024;
    rec.ac.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize), bar = $("#level"), meter = bar.parentElement;
    const est = Math.max(5, VT.estimateSeconds(prompter.textContent));
    const loop = () => {
      an.getFloatTimeDomainData(buf);
      let s = 0; for (const x of buf) s += x * x;
      const lvl = Math.min(100, Math.round(Math.sqrt(s / buf.length) * 400));
      bar.style.width = lvl + "%"; meter.setAttribute("aria-valuenow", String(lvl));
      if ($("#autoScroll").checked && rec.status === "recording") prompter.scrollTop = Math.min(1, recElapsed() / 1000 / est) * (prompter.scrollHeight - prompter.clientHeight);
      rec.raf = requestAnimationFrame(loop);
    };
    loop();
  } catch { /* the level meter is optional */ }
}
function meterStop() { cancelAnimationFrame(rec.raf); rec.ac?.close().catch(() => {}); rec.ac = null; $("#level").style.width = "0"; }
async function recStart() {
  recError("");
  if (!navigator.mediaDevices?.getUserMedia) return recError(globalThis.isSecureContext === false ? "The microphone only works on a secure (https) page." : "This browser can't use a microphone. Try Chrome, Edge, Firefox or Safari.");
  if (!globalThis.MediaRecorder) return recError("This browser can't record audio. Try Chrome, Edge, Firefox or Safari.");
  rec.status = "starting"; recUi();
  try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { rec.status = rec.blob ? "done" : "idle"; recUi(); return recError(mediaErrorText(e, "microphone")); }
  rec.mime = pickType(WEBM_AUDIO_TYPES);
  try { rec.mr = new MediaRecorder(rec.stream, rec.mime ? { mimeType: rec.mime, audioBitsPerSecond: 128000 } : undefined); }
  catch (e) { rec.stream.getTracks().forEach((t) => t.stop()); rec.status = "idle"; recUi(); return recError("This browser can't record audio here: " + (e.message || e)); }
  rec.chunks = []; rec.wav = null; $("#recResult").hidden = true;
  rec.mr.ondataavailable = (e) => { if (e.data?.size) rec.chunks.push(e.data); };
  rec.mr.onstop = recFinished;
  rec.mr.onerror = (e) => recError("Recording stopped: " + (e.error?.message || "unknown error"));
  rec.stream.getAudioTracks()[0]?.addEventListener("ended", () => { if (rec.status === "recording" || rec.status === "paused") recStop(); });
  prompter.textContent = scriptEl.value.trim() || prompter.textContent; prompter.scrollTop = 0;
  meterStart(rec.stream);
  rec.mr.start(250);
  rec.status = "recording"; rec.acc = 0; rec.startedAt = performance.now();
  clearInterval(rec.timer); rec.timer = setInterval(() => { $("#recTime").textContent = fmtTime(recElapsed() / 1000); }, 200);
  $("#recTime").textContent = "0:00";
  recUi();
}
function recPauseToggle() {
  if (rec.status === "recording") { rec.mr.pause(); rec.acc += performance.now() - rec.startedAt; rec.status = "paused"; }
  else if (rec.status === "paused") { rec.mr.resume(); rec.startedAt = performance.now(); rec.status = "recording"; }
  recUi();
}
function recStop() {
  if (rec.status !== "recording" && rec.status !== "paused") return;
  rec.acc = recElapsed(); rec.status = "stopping"; recUi();
  try { rec.mr.stop(); } catch { recFinished(); }
}
function recFinished() {
  clearInterval(rec.timer); meterStop();
  rec.stream?.getTracks().forEach((t) => t.stop());
  const type = rec.mr?.mimeType || rec.mime || "audio/webm";
  rec.blob = new Blob(rec.chunks, { type });
  rec.seconds = rec.acc / 1000;
  rec.status = rec.blob.size ? "done" : "idle";
  if (rec.url) URL.revokeObjectURL(rec.url);
  if (!rec.blob.size) { rec.blob = null; recUi(); return recError("Nothing was recorded. Check that your microphone works and try again."); }
  rec.url = URL.createObjectURL(rec.blob);
  $("#recAudio").src = rec.url;
  const ext = VT.extForMime(type);
  $("#dlRaw").textContent = `Download ${ext === "m4a" ? "M4A" : ext.toUpperCase()}`;
  $("#recMeta").textContent = `${fmtTime(rec.seconds)} · ${fmtBytes(rec.blob.size)}`;
  $("#recResult").hidden = false;
  $("#recTime").textContent = fmtTime(rec.seconds);
  recUi();
  toast("Recording ready. Download it or use it in the video editor.");
}
async function wavBlob() {
  if (rec.wav) return rec.wav;
  if (!rec.blob) throw new Error("Record something first.");
  const ac = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
  try {
    const buf = await ac.decodeAudioData(await rec.blob.arrayBuffer());
    rec.wav = new Blob([audioBufferToWav(buf)], { type: "audio/wav" });
    rec.wavSeconds = buf.duration;
    return rec.wav;
  } finally { ac.close().catch(() => {}); }
}
$("#recStart").addEventListener("click", recStart);
$("#recPause").addEventListener("click", recPauseToggle);
$("#recStop").addEventListener("click", recStop);
$("#dlWav").addEventListener("click", async (e) => {
  const b = e.currentTarget; b.disabled = true; recError("");
  try { downloadBlob(await wavBlob(), VT.recordingName(new Date(), "wav")); }
  catch { recError("Couldn't turn this recording into WAV in this browser. Download the original file instead."); }
  finally { b.disabled = false; }
});
$("#dlRaw").addEventListener("click", () => { if (rec.blob) downloadBlob(rec.blob, VT.recordingName(new Date(), VT.extForMime(rec.blob.type))); });
$("#recToEditor").addEventListener("click", async (e) => {
  const b = e.currentTarget;
  if (!rec.blob) return;
  b.disabled = true;
  try {
    const id = await putHandoff({ type: "audio-media", blob: rec.blob, name: VT.recordingName(new Date(), VT.extForMime(rec.blob.type)) });
    location.href = "/design/video/?handoff=" + encodeURIComponent(id);
  } catch { b.disabled = false; toast("Couldn't open the video editor. Is browser storage turned off?"); }
});

// ---------- AI voices (only when AsaanDesk AI is on) ----------
const ai = { busy: false, result: null, lastBody: null };
function renderAi() {
  const el = $("#aiBody");
  if (!aiReady()) {
    comingSoon(el, {
      title: "AI voices are coming soon",
      what: "Studio-quality AI voices will read your script in natural English, Urdu, Hindi and more, and you will be able to download the result as an MP3 file.",
      offline: "Today you can listen with your browser's voices above, record your own voice with the microphone, or add the script as captions in the video editor.",
    });
    return;
  }
  const opts = (list, sel) => list.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(sel) ? " selected" : ""}>${esc(o.label)}</option>`).join("");
  const guess = VT.langCode(currentVoice()?.lang);
  el.innerHTML = `<form class="ai-form" id="aiForm">
      <label class="mx-field"><span>Voice style</span><select id="aiVoice" class="ad-input">${opts(VOICE_STYLES, "warm-female")}</select></label>
      <label class="mx-field"><span>Language</span><select id="aiLang" class="ad-input">${opts(VOICE_LANGS, VOICE_LANGS.some((l) => l.value === guess) ? guess : "en")}</select></label>
      <label class="mx-field"><span>Speed</span><select id="aiSpeed" class="ad-input">${opts(VOICE_SPEEDS, 1)}</select></label>
      <button class="btn primary" type="submit" id="aiGo">Make AI voiceover</button>
    </form>
    <p class="mx-hint">Uses the script above (up to 3000 characters). It is sent to AsaanDesk AI only when you press the button.</p>
    <div class="ai-out" id="aiOut" aria-live="polite"></div>`;
  $("#aiForm").addEventListener("submit", (e) => { e.preventDefault(); makeAiVoice(); });
}
async function makeAiVoice() {
  const out = $("#aiOut"), text = scriptEl.value.trim();
  if (!text) { out.innerHTML = '<p class="mx-msg err">Type a script first.</p>'; return; }
  if (text.length > 3000) { out.innerHTML = `<p class="mx-msg err">Please keep the script under 3000 characters for AI voices (now ${text.length}).</p>`; return; }
  const body = { text, voice: $("#aiVoice").value, language: $("#aiLang").value, speed: Number($("#aiSpeed").value), format: "mp3" };
  ai.busy = true; ai.lastBody = body; $("#aiGo").disabled = true; $("#aiGo").textContent = "Making your AI voiceover…";
  out.innerHTML = '<div class="mx-bar busy" aria-label="Working"><i></i></div>';
  try {
    const data = await onlineAi("/voice/tts", body, "AI voices");
    const media = resultMedia(data, "audio");
    if (ai.result?.blobUrl) URL.revokeObjectURL(ai.result.blobUrl);
    const blobUrl = media.bytes ? URL.createObjectURL(new Blob([media.bytes], { type: media.mime })) : "";
    ai.result = { src: blobUrl || media.url, blobUrl, mime: media.mime };
    const name = VT.scriptFileName(text).replace(/\.txt$/, "-ai." + aiExt(media.mime, "audio"));
    out.innerHTML = `<div class="mx-result"><audio controls preload="metadata"></audio><div class="mx-row"><button class="btn primary" type="button" id="aiDl">Download ${esc(aiExt(media.mime, "audio").toUpperCase())}</button><span class="mx-meta">Made by AsaanDesk AI</span></div></div>`;
    out.querySelector("audio").src = ai.result.src;
    $("#aiDl").addEventListener("click", async () => {
      try { downloadBlob(await (await fetch(ai.result.src)).blob(), name); } catch { window.open(ai.result.src, "_blank", "noopener"); }
    });
  } catch (e) {
    ai.result = null;
    out.innerHTML = '<p class="mx-msg err" role="alert"></p>';
    out.firstChild.textContent = /failed to fetch|network/i.test(e.message) ? "Couldn't reach AsaanDesk AI. Check your connection and try again." : e.message;
  } finally {
    ai.busy = false; $("#aiGo").disabled = false; $("#aiGo").textContent = "Make AI voiceover";
  }
}

// ---------- start ----------
const draft = store.get(DRAFT);
if (typeof draft === "string" && draft.trim()) scriptEl.value = draft;
showSettings();
initVoices();
setStatus("idle");
recUi();
renderAi();
window.adApp = {
  state, rec, ai,
  splitScript: (t) => VT.splitScript(t ?? scriptEl.value),
  captionLines, play, pause, resume, stop, wavBlob, renderAi,
  groups: () => state.groups.map((g) => ({ lang: g.lang, label: g.label, voices: g.voices.map((v) => v.name) })),
  voiceText: VT,
};
