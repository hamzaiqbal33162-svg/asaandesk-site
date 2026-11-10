// Video trimmer (?mode=trim): one clip, start/end handles with frame preview, keep or cut out the middle.
// WebM is made in the browser (no download); MP4 uses the same ffmpeg engine and commands as the editor.
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, baseName, progressBox, isAbort } from "./ui.js";
import { probeVideo, seekTo, once, keptSegments, exportTrimmedWebM } from "./mediakit.js";
import { trimArgs, cutMiddleArgs, inputName } from "./ffcmd.js";
import { runFFmpeg } from "./ffmpeg.js";

const FPS = 30, MIN = 0.1, LIMIT_MB = 200;
const T = { file: null, info: null, url: "", start: 0, end: 0, mode: "keep", format: "mp4", last: null, previewing: false };
let E = {};

export function startTrim(root, bar) {
  document.title = "Video trimmer | AsaanDesk";
  bar.querySelector(".mx-title").textContent = "Video trimmer";
  root.innerHTML = `<div class="mx-main">
  <section class="mx-hero"><h1>Video trimmer</h1><p>Cut the start and end of a video, or cut a part out of the middle. Your video stays on your device.</p></section>
  <label class="mx-drop" id="tmDrop" for="tmFile"><span class="big">Choose a video</span><p>or drop it here · MP4, WebM, MOV</p></label>
  <input type="file" id="tmFile" accept="video/*,.mkv,.mov,.m4v" hidden>
  <div class="mx-msg err" id="tmErr" role="alert" hidden></div>
  <div class="tm-grid" id="tmWork" hidden>
    <div>
      <div class="tm-player"><video id="tmVideo" playsinline preload="auto" aria-label="Video preview"></video></div>
      <div class="mx-range" id="tmRange" style="margin-top:10px">
        <div class="strip" id="tmStrip" aria-hidden="true"></div><div class="sel" id="tmSel"></div><div class="ph" id="tmPh"></div>
        <button class="h" id="tmH0" data-h="start" role="slider" aria-label="Start of the selection" aria-valuemin="0"></button>
        <button class="h" id="tmH1" data-h="end" role="slider" aria-label="End of the selection" aria-valuemin="0"></button>
      </div>
      <div class="tm-times">
        <label class="mx-field"><span>Start (seconds)</span><input class="ad-input" id="tmStart" type="number" step="0.01" min="0"></label>
        <label class="mx-field"><span>End (seconds)</span><input class="ad-input" id="tmEnd" type="number" step="0.01" min="0"></label>
        <p class="mx-meta" id="tmLen" aria-live="polite"></p>
      </div>
      <div class="mx-row" style="margin-top:10px">
        <button class="btn" id="tmPlay">Play result</button>
        <button class="btn" id="tmSetS">Start at this frame</button>
        <button class="btn" id="tmSetE">End at this frame</button>
        <span class="mx-meta mx-time" id="tmNow"></span>
      </div>
    </div>
    <aside class="tm-side ad-panel" aria-label="Trim options">
      <div class="tm-frames"><figure><canvas id="tmF0" width="320" height="180"></canvas><figcaption id="tmF0c">Start</figcaption></figure>
        <figure><canvas id="tmF1" width="320" height="180"></canvas><figcaption id="tmF1c">End</figcaption></figure></div>
      <div><b class="mx-field">What to keep</b><div class="mx-seg" role="group" aria-label="What to keep">
        <button data-mode="keep" aria-pressed="true">Keep the selection</button><button data-mode="cut" aria-pressed="false">Cut out the selection</button></div></div>
      <div><b class="mx-field">Save as</b><div class="mx-seg" role="group" aria-label="Save as">
        <button data-format="mp4" aria-pressed="true">MP4</button><button data-format="webm" aria-pressed="false">WebM</button></div>
        <p class="mx-hint" id="tmFmtHint"></p></div>
      <button class="btn primary big" id="tmGo">Trim video</button>
      <p class="mx-hint">Need text, music or more clips? <a href="./">Open the video editor</a>.</p>
    </aside>
  </div>
  <section class="mx-result ad-panel" id="tmResult" hidden aria-live="polite"></section>
</div>`;
  for (const id of ["tmDrop", "tmFile", "tmErr", "tmWork", "tmVideo", "tmRange", "tmStrip", "tmSel", "tmPh", "tmH0", "tmH1", "tmStart", "tmEnd", "tmLen", "tmPlay", "tmSetS", "tmSetE", "tmNow", "tmF0", "tmF1", "tmF0c", "tmF1c", "tmFmtHint", "tmGo", "tmResult"]) E[id] = document.getElementById(id);
  bind();
  window.adApp = api;
}

const dur = () => T.info?.duration || 0;
function err(msg) { E.tmErr.hidden = !msg; E.tmErr.textContent = msg || ""; }

async function load(file) {
  err(""); E.tmResult.hidden = true;
  if (!file) return;
  if (file.size > LIMIT_MB * 1048576) return err(`Please choose a video up to ${LIMIT_MB} MB.`);
  try {
    const info = await probeVideo(file);
    if (!(info.duration > 0)) throw Object.assign(new Error("This browser can't read the length of this video. Convert it to MP4 first."), { code: "UNPLAYABLE" });
    if (T.url) URL.revokeObjectURL(T.url);
    T.file = file; T.info = info; T.url = URL.createObjectURL(file);
    T.start = 0; T.end = info.duration;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    setFormat(ext === "webm" ? "webm" : "mp4");
    E.tmVideo.src = T.url;
    E.tmWork.hidden = false; E.tmDrop.hidden = true;
    [E.tmH0, E.tmH1].forEach((h) => h.setAttribute("aria-valuemax", info.duration.toFixed(2)));
    update(); strip();
    await once(E.tmVideo, "loadeddata", "error", 15000).catch(() => {});
    frame(0);
    await seekTo(E.tmVideo, Math.max(0, T.end - 1 / FPS), 3000); frame(1);
    await seekTo(E.tmVideo, 0, 3000);
  } catch (e) {
    err(e.code === "UNPLAYABLE" ? `${e.message}` : e.message || "This video couldn't be opened.");
    if (e.code === "UNPLAYABLE") E.tmErr.insertAdjacentHTML("beforeend", ' <a href="?mode=convert">Open Convert to MP4</a>');
  }
}
async function strip() {
  E.tmStrip.innerHTML = "";
  const n = Math.max(4, Math.min(10, Math.floor(E.tmRange.clientWidth / 70) || 8));
  const v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.src = T.url;
  const cvs = Array.from({ length: n }, () => { const c = document.createElement("canvas"); c.width = 96; c.height = 54; E.tmStrip.append(c); return c; });
  try {
    await new Promise((r, j) => { v.onloadeddata = r; v.onerror = j; });
    for (let i = 0; i < n; i++) {
      await seekTo(v, (dur() * (i + 0.5)) / n, 3000);
      const x = cvs[i].getContext("2d"), k = Math.max(96 / v.videoWidth, 54 / v.videoHeight);
      x.drawImage(v, (96 - v.videoWidth * k) / 2, (54 - v.videoHeight * k) / 2, v.videoWidth * k, v.videoHeight * k);
    }
  } catch {} finally { v.removeAttribute("src"); v.load(); }
}
function frame(which) {
  const c = which ? E.tmF1 : E.tmF0, v = E.tmVideo, x = c.getContext("2d");
  if (!v.videoWidth) return;
  const k = Math.min(c.width / v.videoWidth, c.height / v.videoHeight);
  x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(v, (c.width - v.videoWidth * k) / 2, (c.height - v.videoHeight * k) / 2, v.videoWidth * k, v.videoHeight * k);
  (which ? E.tmF1c : E.tmF0c).textContent = `${which ? "End" : "Start"} · ${fmtTime(which ? T.end : T.start, true)}`;
}
const pct = (t) => (dur() ? (t / dur()) * 100 : 0) + "%";
function update() {
  const d = dur();
  E.tmH0.style.left = pct(T.start); E.tmH1.style.left = pct(T.end);
  E.tmSel.style.left = pct(T.start); E.tmSel.style.width = d ? ((T.end - T.start) / d) * 100 + "%" : "0";
  E.tmRange.classList.toggle("cut", T.mode === "cut");
  E.tmH0.setAttribute("aria-valuenow", T.start.toFixed(2)); E.tmH0.setAttribute("aria-valuetext", fmtTime(T.start, true));
  E.tmH1.setAttribute("aria-valuenow", T.end.toFixed(2)); E.tmH1.setAttribute("aria-valuetext", fmtTime(T.end, true));
  if (document.activeElement !== E.tmStart) E.tmStart.value = T.start.toFixed(2);
  if (document.activeElement !== E.tmEnd) E.tmEnd.value = T.end.toFixed(2);
  const keep = keptSegments(d, T.start, T.end, T.mode).reduce((s, [a, b]) => s + b - a, 0);
  E.tmLen.textContent = `Result: ${fmtTime(keep, true)} of ${fmtTime(d, true)}`;
  E.tmGo.disabled = keep < MIN;
  E.tmFmtHint.textContent = T.format === "mp4" ? "Plays everywhere. The first time, a 31 MB engine downloads (then it's cached)." : `Made right here, no download. Takes as long as the result plays (${fmtTime(keep)}).`;
}
/** Moves a handle (0 = start, 1 = end) and shows that frame. */
async function setHandle(which, t, show = true) {
  const d = dur();
  if (which) T.end = Math.max(T.start + MIN, Math.min(d, t)); else T.start = Math.max(0, Math.min(T.end - MIN, t));
  update();
  if (!show) return;
  E.tmVideo.pause(); T.previewing = false;
  const at = which ? Math.max(0, T.end - 1 / FPS) : T.start;
  await seekTo(E.tmVideo, at, 3000);
  frame(which);
}
function setMode(m) { T.mode = m === "cut" ? "cut" : "keep"; $$("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === T.mode))); E.tmGo.textContent = T.mode === "cut" ? "Cut out and save" : "Trim video"; update(); }
function setFormat(f) { T.format = f === "webm" ? "webm" : "mp4"; $$("[data-format]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.format === T.format))); update(); }

function bind() {
  E.tmFile.addEventListener("change", () => { const f = E.tmFile.files[0]; E.tmFile.value = ""; load(f); });
  E.tmDrop.addEventListener("dragover", (e) => { e.preventDefault(); E.tmDrop.classList.add("over"); });
  E.tmDrop.addEventListener("dragleave", () => E.tmDrop.classList.remove("over"));
  E.tmDrop.addEventListener("drop", (e) => { e.preventDefault(); E.tmDrop.classList.remove("over"); load(e.dataTransfer.files[0]); });
  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $$("[data-format]").forEach((b) => b.addEventListener("click", () => setFormat(b.dataset.format)));
  E.tmStart.addEventListener("change", () => setHandle(0, Number(E.tmStart.value) || 0));
  E.tmEnd.addEventListener("change", () => setHandle(1, Number(E.tmEnd.value) || 0));
  E.tmSetS.onclick = () => setHandle(0, E.tmVideo.currentTime);
  E.tmSetE.onclick = () => setHandle(1, E.tmVideo.currentTime + 1 / FPS);
  E.tmPlay.onclick = playResult;
  E.tmGo.onclick = run;
  const v = E.tmVideo;
  const tick = () => {
    E.tmPh.style.left = pct(v.currentTime); E.tmNow.textContent = fmtTime(v.currentTime, true);
    if (T.previewing && !v.paused) {
      if (T.mode === "keep" && v.currentTime >= T.end) { v.pause(); T.previewing = false; }
      else if (T.mode === "cut" && v.currentTime >= T.start && v.currentTime < T.end - 0.05) v.currentTime = T.end;
    }
    if (!v.paused) requestAnimationFrame(tick);
  };
  v.addEventListener("play", () => { E.tmPlay.textContent = "Pause"; requestAnimationFrame(tick); });
  v.addEventListener("pause", () => { E.tmPlay.textContent = "Play result"; tick(); });
  v.addEventListener("seeked", tick);
  v.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
  // handles: pointer + keyboard
  for (const [h, which] of [[E.tmH0, 0], [E.tmH1, 1]]) {
    h.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId); h.focus();
      const r = E.tmRange.getBoundingClientRect();
      const move = (ev) => setHandle(which, ((ev.clientX - r.left) / r.width) * dur());
      const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); };
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up);
    });
    h.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 1 : 1 / FPS, cur = which ? T.end : T.start;
      const to = { ArrowLeft: cur - step, ArrowDown: cur - step, ArrowRight: cur + step, ArrowUp: cur + step, PageDown: cur - 5, PageUp: cur + 5, Home: 0, End: dur() }[e.key];
      if (to == null) return;
      e.preventDefault(); setHandle(which, to);
    });
  }
  E.tmRange.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".h")) return;
    const r = E.tmRange.getBoundingClientRect();
    v.pause(); T.previewing = false;
    v.currentTime = Math.max(0, Math.min(dur(), ((e.clientX - r.left) / r.width) * dur()));
  });
}
function playResult() {
  const v = E.tmVideo;
  if (!v.paused) { v.pause(); T.previewing = false; return; }
  T.previewing = true;
  v.currentTime = T.mode === "keep" ? T.start : T.start > 0.05 ? 0 : T.end;
  v.play().catch(() => {});
}

async function run() {
  const d = dur(), segs = keptSegments(d, T.start, T.end, T.mode);
  const outLen = segs.reduce((s, [a, b]) => s + b - a, 0);
  if (!segs.length || outLen < MIN) { toast("Nothing would be left. Move the handles."); return null; }
  E.tmVideo.pause();
  const box = progressBox(T.format === "mp4" ? "Saving MP4" : "Saving WebM");
  const opts = { signal: box.signal, onProgress: (f) => box.set(null, f), onStatus: (t) => box.set(t) };
  try {
    let blob;
    if (T.format === "webm") {
      box.set("Playing the kept part into a new file…", 0);
      blob = (await exportTrimmedWebM({ blob: T.file, segments: segs, ...opts })).blob;
    } else {
      const input = inputName(T.file.name);
      const args = (hasAudio) => T.mode === "keep" ? trimArgs({ input, start: T.start, end: T.end, srcW: T.info.width, srcH: T.info.height })
        : cutMiddleArgs({ input, start: T.start, end: T.end, duration: d, hasAudio });
      const go = (hasAudio) => runFFmpeg({ files: [{ name: input, data: T.file }], args: args(hasAudio), output: "output.mp4", duration: outLen, ...opts });
      let data;
      try { data = await go(true); } catch (e) { if (T.mode !== "cut" || !/matches no streams/i.test(e.message)) throw e; data = await go(false); }
      blob = new Blob([data], { type: "video/mp4" });
    }
    box.close();
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    T.last = { blob, name: `${baseName(T.file.name)}-trimmed.${ext}`, duration: outLen, type: ext };
    showResult(T.last);
    return T.last;
  } catch (e) {
    box.close();
    if (isAbort(e)) { toast("Cancelled."); return null; }
    err(e.message || "Trimming failed.");
    T.last = { error: e.message || "Trimming failed", code: e.code };
    return T.last;
  }
}
function showResult(r) {
  const url = URL.createObjectURL(r.blob);
  E.tmResult.hidden = false;
  E.tmResult.innerHTML = `<h3 style="margin:0">Your trimmed video</h3><video controls playsinline src="${url}"></video>
    <p class="mx-meta">${r.type.toUpperCase()} · ${fmtTime(r.duration, true)} · ${fmtBytes(r.blob.size)}</p>
    <div class="mx-row"><button class="btn primary" id="tmDl">Download ${r.type.toUpperCase()}</button><a class="btn" href="./">Open the video editor</a></div>`;
  $("#tmDl").onclick = () => downloadBlob(r.blob, r.name);
  E.tmResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

const api = {
  mode: "trim", state: T, load, setMode, setFormat,
  setRange: async (s, e) => { await setHandle(1, e, false); await setHandle(0, s, false); update(); },
  export: run,
  get last() { return T.last; },
};
void esc;
