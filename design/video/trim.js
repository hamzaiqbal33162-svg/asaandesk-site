// Video trimmer (?mode=trim): one clip, start/end handles with frame preview, keep or cut out the middle.
// WebM is made in the browser (no download); MP4 uses the same ffmpeg engine and commands as the editor.
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, baseName, progressBox, isAbort } from "./ui.js";
import { probeVideo, seekTo, once, keptSegments, exportTrimmedWebM } from "./mediakit.js";
import { trimArgs, trimCopyArgs, cutMiddleArgs, trimMuteArgs, inputName } from "./ffcmd.js";
import { runFFmpeg } from "./ffmpeg.js";
import { mountToolFrame, trimRange } from "./toolframe.js";
import { byId } from "./gallery.js";

const FPS = 30, MIN = 0.1, LIMIT_MB = 200;
const T = { file: null, info: null, url: "", start: 0, end: 0, mode: "keep", format: "mp4", audio: "keep", last: null, previewing: false, pending: null, shell: null };
let E = {};

export function startTrim(root, bar, params) {
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
      <div class="tm-exact" role="group" aria-label="Exact times">
        <label class="mx-meta" for="tmStartTc">Start at</label><input class="ad-input" id="tmStartTc" inputmode="decimal" spellcheck="false" placeholder="0:00.00" aria-label="Start time, minutes:seconds">
        <button class="btn sm" id="tmSPrev" aria-label="Start one frame earlier" title="One frame earlier">−1 frame</button><button class="btn sm" id="tmSNext" aria-label="Start one frame later" title="One frame later">+1 frame</button>
        <label class="mx-meta" for="tmEndTc">End at</label><input class="ad-input" id="tmEndTc" inputmode="decimal" spellcheck="false" placeholder="0:00.00" aria-label="End time, minutes:seconds">
        <button class="btn sm" id="tmEPrev" aria-label="End one frame earlier" title="One frame earlier">−1 frame</button><button class="btn sm" id="tmENext" aria-label="End one frame later" title="One frame later">+1 frame</button>
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
      <div><b class="mx-field">Sound</b><div class="mx-seg" role="group" aria-label="Sound">
        <button data-audio="keep" aria-pressed="true">Keep the sound</button><button data-audio="mute" aria-pressed="false">Mute</button></div></div>
      <div><b class="mx-field">Save as</b><div class="mx-seg" role="group" aria-label="Save as">
        <button data-format="mp4" aria-pressed="true">MP4</button><button data-format="webm" aria-pressed="false">WebM</button><button data-format="original" aria-pressed="false">Original, no re-encode</button></div>
        <p class="mx-hint" id="tmFmtHint"></p></div>
      <button class="btn primary big" id="tmGo">Trim video</button>
      <p class="mx-hint">Need text, music or more clips? <a href="./">Open the video editor</a>.</p>
    </aside>
  </div>
  <section class="mx-result ad-panel" id="tmResult" hidden aria-live="polite"></section>
</div>`;
  for (const id of ["tmDrop", "tmFile", "tmErr", "tmWork", "tmVideo", "tmRange", "tmStrip", "tmSel", "tmPh", "tmH0", "tmH1", "tmStart", "tmEnd", "tmLen", "tmPlay", "tmSetS", "tmSetE", "tmNow", "tmF0", "tmF1", "tmF0c", "tmF1c", "tmFmtHint", "tmGo", "tmResult", "tmStartTc", "tmEndTc"]) E[id] = document.getElementById(id);
  bind();
  window.adApp = api;
  frameUp(root, params);
  takeHandedFile(params, load);
}
/** ?handoff=<id>: a video handed over by another page (the intro drop zone, store.js putHandoff({ type, blob, name })). */
export async function takeHandedFile(params, open) {
  const hid = params?.get("handoff"); if (!hid) return null;
  const url = new URL(location.href); url.searchParams.delete("handoff"); history.replaceState(null, "", url);
  const { takeHandoff } = await import("../shared/store.js");
  const p = await takeHandoff(hid).catch(() => null);
  if (!p?.blob) { toast("That link has expired. Choose the video again."); return null; }
  const f = p.blob instanceof File ? p.blob : new File([p.blob], p.name || "video.mp4", { type: p.blob.type || "video/mp4" });
  await open(f);
  return f;
}
// ---------- editor frame: pill toolbar, ready-made cuts (templates), Tools panel ----------
async function frameUp(root, params) {
  const pill = document.createElement("div");
  pill.className = "vx-pill"; pill.setAttribute("role", "group"); pill.setAttribute("aria-label", "Trim");
  pill.innerHTML = `<label class="btn sm" for="tmFile" id="tpChoose">Choose video</label><span class="vx-psep" aria-hidden="true"></span>
    <button class="btn sm" id="tpStart" title="The result starts at the current frame">Start here</button><button class="btn sm" id="tpEnd" title="The result ends at the current frame">End here</button>
    <button class="btn sm" id="tpPlay">Play result</button><span class="vx-psep" aria-hidden="true"></span>
    <button class="btn sm" id="tpMode" aria-pressed="false" title="Keep the selection or cut it out">Cut out the middle</button>
    <button class="btn primary sm" id="tpGo">Trim video</button>
    <button class="btn sm" id="tpEdit" title="Keep editing: text, music, more clips">Edit in video editor</button>`;
  const needFile = (fn) => () => (T.file ? fn() : toast("Choose a video first."));
  pill.querySelector("#tpStart").onclick = needFile(() => E.tmSetS.click());
  pill.querySelector("#tpEnd").onclick = needFile(() => E.tmSetE.click());
  pill.querySelector("#tpPlay").onclick = needFile(() => E.tmPlay.click());
  pill.querySelector("#tpMode").onclick = () => setMode(T.mode === "cut" ? "keep" : "cut");
  pill.querySelector("#tpGo").onclick = needFile(() => E.tmGo.click());
  pill.querySelector("#tpEdit").onclick = needFile(() => openInEditor());
  const presetBtn = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn sm"; b.textContent = label; b.onclick = fn; return b; };
  T.shell = await mountToolFrame({
    app: "video-trim", kind: "Video trim", title: "Trimmed video", home: "/tools/video-trimmer", tool: "video-trimmer", stage: root, pill,
    file: [
      { label: "Choose a video…", act: () => E.tmFile.click() },
      { label: "Save the trimmed video", group: "Download", act: needFile(() => run()) },
      { label: "Download again", group: "Download", act: () => (T.last?.blob ? downloadBlob(T.last.blob, T.last.name) : toast("Trim a video first.")) },
      { label: "Keep the selection", group: "Edit", act: () => setMode("keep") }, { label: "Cut out the selection", group: "Edit", act: () => setMode("cut") },
      { label: "Keep the sound", group: "Edit", act: () => setAudio("keep") }, { label: "Mute the sound", group: "Edit", act: () => setAudio("mute") },
      { label: "Save as MP4", group: "Edit", act: () => setFormat("mp4") }, { label: "Save as WebM", group: "Edit", act: () => setFormat("webm") },
      { label: "Edit this clip in the video editor", group: "More video tools", act: needFile(() => openInEditor()) },
      { label: "Open the video editor", group: "More video tools", act: () => { location.href = "./"; } },
      { label: "Convert to MP4", group: "More video tools", act: () => { location.href = "?mode=convert"; } },
    ],
    share: { download: [{ label: "Trimmed video", act: () => (T.last?.blob ? downloadBlob(T.last.blob, T.last.name) : T.file ? run() : toast("Choose a video first.")) }], link: () => location.href.split("?")[0] + "?mode=trim" },
    apply: applyPreset, placeholder: "Search ready-made cuts",
    panels: { tools: { label: "Tools", icon: "tools", refresh: true, render: (el) => {
      const p = (t) => { const x = document.createElement("p"); x.className = "mx-hint"; x.textContent = t; return x; };
      el.append(p(T.file ? `${T.file.name} · ${fmtTime(dur(), true)}. Selection ${fmtTime(T.start, true)} to ${fmtTime(T.end, true)}.` : "Choose a video, then set the start and end."));
      const row = document.createElement("div"); row.className = "mx-row";
      row.append(presetBtn("Choose video", () => E.tmFile.click()), presetBtn("Keep the selection", () => setMode("keep")), presetBtn("Cut out the selection", () => setMode("cut")), presetBtn("MP4", () => setFormat("mp4")), presetBtn("WebM", () => setFormat("webm")),
        presetBtn("Keep the sound", () => setAudio("keep")), presetBtn("Mute the sound", () => setAudio("mute")));
      el.append(row, p("Keys on a handle: arrows move one frame, Shift + arrows one second, Page Up / Down five seconds."));
    } } },
    rail: ["templates", "tools", "apps"],
    shortcuts: [["← / →", "Move a handle one frame"], ["Shift + ← / →", "Move a handle one second"], ["Page Up / Down", "Move a handle five seconds"]],
  });
  syncPill();
  const tpl = params?.get("template");
  if (tpl) await applyPreset(tpl);
}
/** Hands the clip to the video editor (as Canva's trimmer continues in the editor): the kept part, or the saved cut. */
async function openInEditor() {
  if (!T.file) { toast("Choose a video first."); return null; }
  let payload;
  if (T.mode === "keep") payload = { type: "video-media", blob: T.file, name: T.file.name, trim: { start: T.start, end: T.end } };
  else if (T.last?.blob) payload = { type: "video-media", blob: T.last.blob, name: T.last.name };
  else { toast("Save the cut first (Cut out and save), then open it in the editor."); return null; }
  const { putHandoff } = await import("../shared/store.js");
  const id = await putHandoff(payload);
  location.href = "./?handoff=" + encodeURIComponent(id);
  return id;
}
function syncPill() {
  const m = document.getElementById("tpMode"), g = document.getElementById("tpGo");
  if (m) { m.setAttribute("aria-pressed", String(T.mode === "cut")); m.textContent = T.mode === "cut" ? "Keep the selection" : "Cut out the selection"; }
  if (g) g.textContent = T.mode === "cut" ? "Cut out and save" : "Trim video";
}
/** Applies a ready-made cut (gallery.js template id): now if a video is open, else when one opens. */
async function applyPreset(id) {
  const t = byId(id);
  if (!t?.trim) { toast("That template isn't a trim setting."); return null; }
  if (t.trim.format) setFormat(t.trim.format);
  if (!T.file) { T.pending = t; err(""); toast(`${t.name}: choose a video and this cut is set for you.`, 4000); T.shell?.setTitle(t.name); return t; }
  const r = trimRange(t.trim, dur());
  await api.setRange(r.start, r.end); setMode(r.mode);
  T.shell?.setTitle(t.name);
  toast(`${t.name}: ${fmtTime(T.start, true)} to ${fmtTime(T.end, true)}${r.mode === "cut" ? " is cut out" : ""}.`);
  return t;
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
    if (T.pending) { const t = T.pending; T.pending = null; await applyPreset(t.id); }
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
  if (E.tmStartTc && document.activeElement !== E.tmStartTc) E.tmStartTc.value = tc(T.start);
  if (E.tmEndTc && document.activeElement !== E.tmEndTc) E.tmEndTc.value = tc(T.end);
  const keep = keptSegments(d, T.start, T.end, T.mode).reduce((s, [a, b]) => s + b - a, 0);
  E.tmLen.textContent = `Result: ${fmtTime(keep, true)} of ${fmtTime(d, true)}`;
  E.tmGo.disabled = keep < MIN;
  E.tmFmtHint.textContent = T.format === "mp4" ? "Plays everywhere. The first time, a 31 MB engine downloads (then it's cached)."
    : T.format === "original" ? (T.mode === "cut" ? "Cutting out a middle part needs re-encoding: choose MP4 or WebM." : "Same format and quality, very fast (no re-encoding). The cut starts at the nearest keyframe, so it can begin a little earlier.")
    : `Made right here, no download. Takes as long as the result plays (${fmtTime(keep)}).`;
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
function setMode(m) { T.mode = m === "cut" ? "cut" : "keep"; $$("[data-mode]", E.tmWork).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === T.mode))); E.tmGo.textContent = T.mode === "cut" ? "Cut out and save" : "Trim video"; update(); syncPill(); }
function setAudio(a) { T.audio = a === "mute" ? "mute" : "keep"; $$("[data-audio]", E.tmWork).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.audio === T.audio))); E.tmVideo.muted = T.audio === "mute"; }
function setFormat(f) { T.format = f === "webm" || f === "original" ? f : "mp4"; $$("[data-format]", E.tmWork).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.format === T.format))); update(); }
/** 0:01.25 style time (minutes:seconds with hundredths). */
function tc(t) { const s = Math.max(0, t), m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, "0")}`; }
/** "1:02.5", "0:01:02.50" or "62.5" -> seconds (or null). */
export function parseTc(v) {
  const p = String(v || "").trim().replace(",", ".").split(":");
  if (!p[0] || p.length > 3 || p.some((x) => !/^\d+(\.\d+)?$/.test(x))) return null;
  return p.reduce((a, x) => a * 60 + Number(x), 0);
}

function bind() {
  E.tmFile.addEventListener("change", () => { const f = E.tmFile.files[0]; E.tmFile.value = ""; load(f); });
  E.tmDrop.addEventListener("dragover", (e) => { e.preventDefault(); E.tmDrop.classList.add("over"); });
  E.tmDrop.addEventListener("dragleave", () => E.tmDrop.classList.remove("over"));
  E.tmDrop.addEventListener("drop", (e) => { e.preventDefault(); E.tmDrop.classList.remove("over"); load(e.dataTransfer.files[0]); });
  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $$("[data-format]").forEach((b) => b.addEventListener("click", () => setFormat(b.dataset.format)));
  $$("[data-audio]").forEach((b) => b.addEventListener("click", () => setAudio(b.dataset.audio)));
  E.tmStart.addEventListener("change", () => setHandle(0, Number(E.tmStart.value) || 0));
  E.tmEnd.addEventListener("change", () => setHandle(1, Number(E.tmEnd.value) || 0));
  // exact times as minutes:seconds, and one-frame steps
  const exact = (inp, which) => inp?.addEventListener("change", () => { const t = parseTc(inp.value); if (t == null) { toast("Type a time like 0:12.50 or 12.5"); update(); return; } setHandle(which, t); });
  exact(E.tmStartTc, 0); exact(E.tmEndTc, 1);
  for (const [id, which, d] of [["tmSPrev", 0, -1], ["tmSNext", 0, 1], ["tmEPrev", 1, -1], ["tmENext", 1, 1]]) {
    const b = document.getElementById(id); if (b) b.onclick = () => setHandle(which, (which ? T.end : T.start) + d / FPS);
  }
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
  if (T.format === "original" && T.mode === "cut") { toast("Cutting out a middle part needs re-encoding: choose MP4 or WebM."); return null; }
  const box = progressBox(T.format === "mp4" ? "Saving MP4" : T.format === "original" ? "Saving without re-encoding" : "Saving WebM");
  const opts = { signal: box.signal, onProgress: (f) => box.set(null, f), onStatus: (t) => box.set(t) };
  try {
    let blob;
    if (T.format === "original") {
      // stream copy in the original container: no quality loss, cut at the nearest keyframe
      const input = inputName(T.file.name), ext = input.split(".").pop(), output = "output." + ext;
      const data = await runFFmpeg({ files: [{ name: input, data: T.file }], args: trimCopyArgs({ input, output, start: T.start, end: T.end, mute: T.audio === "mute" }), output, duration: outLen, ...opts });
      blob = new Blob([data], { type: T.file.type || (ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/" + ext) });
      blob.ext = ext;
    } else if (T.format === "webm") {
      box.set("Playing the kept part into a new file…", 0);
      blob = (await exportTrimmedWebM({ blob: T.file, segments: segs, mute: T.audio === "mute", ...opts })).blob;
    } else {
      const input = inputName(T.file.name);
      const mute = T.audio === "mute";
      const args = (hasAudio) => T.mode === "keep" ? (mute ? trimMuteArgs : trimArgs)({ input, start: T.start, end: T.end, srcW: T.info.width, srcH: T.info.height })
        : cutMiddleArgs({ input, start: T.start, end: T.end, duration: d, hasAudio });
      const go = (hasAudio) => runFFmpeg({ files: [{ name: input, data: T.file }], args: args(hasAudio), output: "output.mp4", duration: outLen, ...opts });
      let data;
      try { data = await go(!mute); } catch (e) { if (mute || T.mode !== "cut" || !/matches no streams/i.test(e.message)) throw e; data = await go(false); }
      blob = new Blob([data], { type: "video/mp4" });
    }
    box.close();
    const ext = blob.ext || (blob.type.includes("mp4") ? "mp4" : "webm");
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
  mode: "trim", state: T, load, setMode, setFormat, setAudio, applyTemplate: (id) => applyPreset(id), get shell() { return T.shell; }, openInEditor: () => openInEditor(),
  setRange: async (s, e) => { await setHandle(1, e, false); await setHandle(0, s, false); update(); },
  export: run,
  get last() { return T.last; },
};
void esc;
