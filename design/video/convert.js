// Convert to MP4 (?mode=convert): any video the browser or ffmpeg can read -> MP4 (H.264 + AAC), same engine as the site.
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, baseName, progressBox, isAbort } from "./ui.js";
import { probeVideo } from "./mediakit.js";
import { convertArgs, inputName, QUALITY } from "./ffcmd.js";
import { runFFmpeg, ffmpegState } from "./ffmpeg.js";

const LIMIT_MB = 200;
const C = { file: null, info: null, quality: "balanced", height: 0, last: null };
let E = {};

export function startConvert(root, bar) {
  document.title = "Convert videos to MP4 | AsaanDesk";
  bar.querySelector(".mx-title").textContent = "Convert to MP4";
  root.innerHTML = `<div class="mx-main">
  <section class="mx-hero"><h1>Convert videos to MP4</h1><p>MOV, WebM, MKV, AVI and more to MP4 (H.264 + AAC) that plays on every phone, TV and website. Your video never leaves your device.</p></section>
  <label class="mx-drop" id="cvDrop" for="cvFile"><span class="big">Choose a video</span><p>or drop it here · up to ${LIMIT_MB} MB</p></label>
  <input type="file" id="cvFile" accept="video/*,.mkv,.mov,.avi,.flv,.wmv,.3gp,.ts,.m2ts,.mts,.mpg,.mpeg,.ogv,.m4v" hidden>
  <div class="mx-msg err" id="cvErr" role="alert" hidden></div>
  <div class="tm-grid" id="cvWork" hidden>
    <div class="ad-panel" id="cvFileCard"></div>
    <aside class="tm-side ad-panel" aria-label="MP4 options">
      <div><b class="mx-field">Quality</b><div class="mx-seg" role="group" aria-label="Quality">${Object.entries(QUALITY).map(([k, q]) => `<button data-q="${k}" aria-pressed="${k === C.quality}">${esc(q.label)}</button>`).join("")}</div></div>
      <div><b class="mx-field">Size</b><div class="mx-seg" role="group" aria-label="Size">
        <button data-h="0" aria-pressed="true">Keep size</button><button data-h="1080" aria-pressed="false">1080p</button><button data-h="720" aria-pressed="false">720p</button><button data-h="480" aria-pressed="false">480p</button></div>
        <p class="mx-hint">Smaller sizes make smaller files. Videos are never made bigger.</p></div>
      <button class="btn primary big" id="cvGo">Convert to MP4</button>
      <p class="mx-hint" id="cvNote"></p>
      <button class="btn" id="cvOther">Choose another video</button>
    </aside>
  </div>
  <section class="mx-result ad-panel" id="cvResult" hidden aria-live="polite"></section>
</div>`;
  for (const id of ["cvDrop", "cvFile", "cvErr", "cvWork", "cvFileCard", "cvGo", "cvNote", "cvOther", "cvResult"]) E[id] = document.getElementById(id);
  E.cvFile.addEventListener("change", () => { const f = E.cvFile.files[0]; E.cvFile.value = ""; load(f); });
  E.cvDrop.addEventListener("dragover", (e) => { e.preventDefault(); E.cvDrop.classList.add("over"); });
  E.cvDrop.addEventListener("dragleave", () => E.cvDrop.classList.remove("over"));
  E.cvDrop.addEventListener("drop", (e) => { e.preventDefault(); E.cvDrop.classList.remove("over"); load(e.dataTransfer.files[0]); });
  $$("[data-q]").forEach((b) => b.addEventListener("click", () => setQuality(b.dataset.q)));
  $$("[data-h]").forEach((b) => b.addEventListener("click", () => setHeight(Number(b.dataset.h))));
  E.cvGo.onclick = run;
  E.cvOther.onclick = () => E.cvFile.click();
  note();
  window.adApp = api;
}
function err(m) { E.cvErr.hidden = !m; E.cvErr.textContent = m || ""; }
function note() { E.cvNote.textContent = ffmpegState.loaded ? "The MP4 engine is ready." : "The first time, the MP4 engine (about 31 MB) downloads from unpkg.com. After that your browser keeps it."; }
function setQuality(q) { C.quality = QUALITY[q] ? q : "balanced"; $$("[data-q]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.q === C.quality))); }
function setHeight(h) { C.height = [0, 1080, 720, 480].includes(h) ? h : 0; $$("[data-h]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.h) === C.height))); }

async function load(file) {
  err(""); E.cvResult.hidden = true;
  if (!file) return;
  if (file.size > LIMIT_MB * 1048576) return err(`Please choose a video up to ${LIMIT_MB} MB.`);
  C.file = file; C.info = null;
  let preview = "";
  try {
    C.info = await probeVideo(file);
    preview = `<video controls playsinline preload="metadata" src="${URL.createObjectURL(file)}" style="width:100%;max-height:46vh;border-radius:12px;background:#000"></video>`;
  } catch { preview = '<p class="mx-msg">Your browser can\'t preview this file, but the converter can usually still read it.</p>'; }
  const i = C.info;
  E.cvFileCard.innerHTML = `${preview}<p class="vx-clipname" style="margin-top:8px">${esc(file.name)}</p>
    <p class="mx-meta">${fmtBytes(file.size)}${i ? ` · ${i.width}×${i.height} · ${fmtTime(i.duration, true)}` : ""}</p>`;
  E.cvWork.hidden = false; E.cvDrop.hidden = true;
  for (const b of $$("[data-h]")) { const h = Number(b.dataset.h); b.disabled = !!(h && i && Math.min(i.width, i.height) <= h); }
  if ($(`[data-h="${C.height}"]`)?.disabled) setHeight(0);
}

async function run() {
  if (!C.file) return null;
  const input = inputName(C.file.name, "mp4");
  const box = progressBox("Converting to MP4");
  try {
    const data = await runFFmpeg({
      files: [{ name: input, data: C.file }],
      args: convertArgs({ input, output: "output.mp4", quality: C.quality, height: C.height, srcW: C.info?.width || 0, srcH: C.info?.height || 0 }),
      output: "output.mp4", duration: C.info?.duration || 0, signal: box.signal,
      onProgress: (f) => box.set(null, f), onStatus: (t, f) => box.set(t, f),
    });
    box.close(); note();
    const blob = new Blob([data], { type: "video/mp4" });
    C.last = { blob, name: baseName(C.file.name) + ".mp4", type: "mp4" };
    show(C.last);
    return C.last;
  } catch (e) {
    box.close();
    if (isAbort(e)) { toast("Cancelled."); return null; }
    err(e.message || "Converting failed.");
    C.last = { error: e.message || "Converting failed", code: e.code };
    return C.last;
  }
}
function show(r) {
  const url = URL.createObjectURL(r.blob), before = C.file.size, pctSmaller = Math.round((1 - r.blob.size / before) * 100);
  E.cvResult.hidden = false;
  E.cvResult.innerHTML = `<h3 style="margin:0">Your MP4 is ready</h3><video controls playsinline src="${url}"></video>
    <p class="mx-meta">${fmtBytes(before)} → ${fmtBytes(r.blob.size)}${pctSmaller > 0 ? ` (${pctSmaller}% smaller)` : ""}</p>
    <div class="mx-row"><button class="btn primary" id="cvDl">Download MP4</button><a class="btn" href="?mode=trim">Trim a video</a><a class="btn" href="./">Open the video editor</a></div>`;
  $("#cvDl").onclick = () => downloadBlob(r.blob, r.name);
  E.cvResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
const api = { mode: "convert", state: C, load, setQuality, setHeight, export: run, get last() { return C.last; } };
