// Convert to MP4 (?mode=convert): any video the browser or ffmpeg can read -> MP4 (H.264 + AAC), same engine as the site.
import { $, $$, esc, toast, downloadBlob, fmtTime, fmtBytes, baseName, progressBox, isAbort } from "./ui.js";
import { probeVideo } from "./mediakit.js";
import { convertArgs, remuxArgs, isPlainMp4, inputName, QUALITY } from "./ffcmd.js";
import { runFFmpeg, ffmpegState } from "./ffmpeg.js";
import { mountToolFrame, oneVideoInsert, videoThumb } from "./toolframe.js";
import { takeHandedFile } from "./trim.js";
import { byId } from "./gallery.js";

const LIMIT_MB = 200;
const C = { file: null, info: null, quality: "balanced", height: 0, last: null, shell: null, preset: null };
let E = {};

export function startConvert(root, bar, params) {
  document.title = "Convert videos to MP4 | AsaanDesk";
  bar.querySelector(".mx-title").textContent = "Convert to MP4";
  root.innerHTML = `<div class="mx-main">
  <section class="mx-hero"><h1>Convert videos to MP4</h1><p>MOV, WebM, MKV, AVI, MPEG, animated GIF and more to MP4 (H.264 + AAC) that plays on every phone, TV and website. Your video never leaves your device.</p></section>
  <label class="mx-drop" id="cvDrop" for="cvFile"><span class="big">Choose a video</span><p>or drop it here · up to ${LIMIT_MB} MB</p></label>
  <input type="file" id="cvFile" accept="video/*,image/gif,.gif,.mkv,.mov,.avi,.flv,.wmv,.3gp,.ts,.m2ts,.mts,.mpg,.mpeg,.ogv,.m4v" hidden>
  <div class="mx-msg err" id="cvErr" role="alert" hidden></div>
  <div class="tm-grid" id="cvWork" hidden>
    <div class="ad-panel" id="cvFileCard"></div>
    <aside class="tm-side ad-panel" aria-label="MP4 options">
      <div><b class="mx-field">Quality</b><div class="mx-seg" role="group" aria-label="Quality">${Object.entries(QUALITY).map(([k, q]) => `<button data-q="${k}" aria-pressed="${k === C.quality}">${esc(q.label)}</button>`).join("")}</div></div>
      <div><b class="mx-field">Size</b><div class="mx-seg" role="group" aria-label="Size">
        <button data-h="0" aria-pressed="true">Keep size</button><button data-h="1080" aria-pressed="false">1080p</button><button data-h="720" aria-pressed="false">720p</button><button data-h="480" aria-pressed="false">480p</button></div>
        <p class="mx-hint">Smaller sizes make smaller files. Videos are never made bigger.</p></div>
      <label class="cv-fast"><input type="checkbox" id="cvFast" checked> <span><b>Copy without re-encoding when possible</b><small>If the video is already H.264, it is only repackaged as MP4: much faster and no quality loss. Otherwise it is converted.</small></span></label>
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
  frameUp(root, params);
  takeHandedFile(params, load); // ?handoff=<id> from the intro drop zone
}
// ---------- editor frame: pill toolbar, ready-made settings (templates), Tools panel ----------
async function frameUp(root, params) {
  const pill = document.createElement("div");
  pill.className = "vx-pill"; pill.setAttribute("role", "group"); pill.setAttribute("aria-label", "Convert");
  pill.innerHTML = `<label class="btn sm" for="cvFile" id="cpChoose">Choose video</label><span class="vx-psep" aria-hidden="true"></span>
    <label class="vx-pf"><span>Quality</span><select id="cpQ" aria-label="Quality">${Object.entries(QUALITY).map(([k, q]) => `<option value="${k}">${esc(q.label)}</option>`).join("")}</select></label>
    <label class="vx-pf"><span>Size</span><select id="cpH" aria-label="Size"><option value="0">Keep size</option><option value="1080">1080p</option><option value="720">720p</option><option value="480">480p</option></select></label>
    <span class="vx-psep" aria-hidden="true"></span><button class="btn primary sm" id="cpGo">Convert to MP4</button>
    <button class="btn sm" id="cpEdit" title="Keep editing the converted video">Edit in video editor</button>`;
  pill.querySelector("#cpEdit").onclick = () => openInEditor();
  pill.querySelector("#cpQ").onchange = (e) => setQuality(e.target.value);
  pill.querySelector("#cpH").onchange = (e) => setHeight(Number(e.target.value));
  pill.querySelector("#cpGo").onclick = () => (C.file ? run() : toast("Choose a video first."));
  C.shell = await mountToolFrame({
    app: "video-convert", kind: "MP4 conversion", title: "Video to MP4", home: "/tools/convert-videos-to-mp4", tool: "convert-videos-to-mp4", stage: root, pill,
    file: [
      { label: "Choose a video…", act: () => E.cvFile.click() },
      { label: "Convert to MP4", group: "Download", act: () => (C.file ? run() : toast("Choose a video first.")) },
      { label: "Download the MP4 again", group: "Download", act: () => (C.last?.blob ? downloadBlob(C.last.blob, C.last.name) : toast("Convert a video first.")) },
      ...Object.entries(QUALITY).map(([k, q]) => ({ label: q.label, group: "Quality", act: () => setQuality(k) })),
      { label: "Edit the MP4 in the video editor", group: "More video tools", act: () => openInEditor() },
      { label: "Open the video editor", group: "More video tools", act: () => { location.href = "./"; } },
      { label: "Video trimmer", group: "More video tools", act: () => { location.href = "?mode=trim"; } },
    ],
    share: { download: [{ label: "MP4 video", act: () => (C.last?.blob ? downloadBlob(C.last.blob, C.last.name) : C.file ? run() : toast("Choose a video first.")) }], link: () => location.href.split("?")[0] + "?mode=convert" },
    apply: applyPreset, placeholder: "Search ready-made settings",
    // the converter's own controls lead the kit's Tools panel (its main UI); the rail is Canva's (toolframe.js)
    insert: api.insert,
    // Projects: the chosen video with its MP4 settings (kept on this device)
    projects: {
      save: async () => {
        if (!C.file) throw new Error("Choose a video first, then save it to Projects.");
        return { name: C.file.name.replace(/\.[^.]+$/, ""), data: { blob: C.file, name: C.file.name, type: C.file.type, quality: C.quality, height: C.height }, thumb: videoThumb(E.cvFileCard?.querySelector("video")) };
      },
      open: async (rec) => {
        const d = rec?.data;
        if (!d?.blob) throw new Error("This project has no video in it.");
        await load(new File([d.blob], d.name || "Video", { type: d.type || d.blob.type }));
        setQuality(d.quality); setHeight(d.height);
      },
    },
    panels: { tools: { title: "Convert to MP4", primary: true, refresh: true, render: (el) => {
      const p = document.createElement("p"); p.className = "mx-hint";
      p.textContent = C.file ? `${C.file.name} · ${fmtBytes(C.file.size)}. ${QUALITY[C.quality].label}, ${C.height ? C.height + "p" : "same size"}.` : "Choose a video. MOV, WebM, MKV, AVI and more become MP4 (H.264 + AAC).";
      const b = document.createElement("button"); b.type = "button"; b.className = "btn sm"; b.textContent = "Choose video"; b.onclick = () => E.cvFile.click();
      const n = document.createElement("p"); n.className = "mx-hint"; n.textContent = ffmpegState.loaded ? "The MP4 engine is ready." : "The first time, the MP4 engine (about 31 MB) downloads from unpkg.com.";
      el.append(p, b, n);
    } } },
  });
  syncPill();
  const tpl = params?.get("template");
  if (tpl) applyPreset(tpl);
}
/** Hands the converted MP4 (or a video this browser can already play) to the video editor. */
async function openInEditor() {
  const blob = C.last?.blob || (C.file && C.info ? C.file : null);
  if (!blob) { toast(C.file ? "Convert it first: this browser can't play the original." : "Choose a video first."); return null; }
  const { putHandoff } = await import("../shared/store.js");
  const id = await putHandoff({ type: "video-media", blob, name: C.last?.name || C.file.name });
  location.href = "./?handoff=" + encodeURIComponent(id);
  return id;
}
function syncPill() {
  const q = document.getElementById("cpQ"), h = document.getElementById("cpH");
  if (q) q.value = C.quality; if (h) h.value = String(C.height);
}
/** Applies ready-made settings (gallery.js template id). */
function applyPreset(id) {
  const t = byId(id);
  if (!t?.conv) { toast("That template isn't an MP4 setting."); return null; }
  C.preset = t; setQuality(t.conv.quality); setHeight(t.conv.height);
  if (C.info && t.conv.height && $(`[data-h="${t.conv.height}"]`)?.disabled) toast(`${t.name}: your video is already ${Math.min(C.info.width, C.info.height)}p or smaller, so it keeps its size.`);
  else toast(`${t.name}: ${QUALITY[C.quality].label}, ${C.height ? C.height + "p" : "same size"}.`);
  C.shell?.setTitle(t.name);
  return t;
}
function err(m) { E.cvErr.hidden = !m; E.cvErr.textContent = m || ""; }
function note() { E.cvNote.textContent = ffmpegState.loaded ? "The MP4 engine is ready." : "The first time, the MP4 engine (about 31 MB) downloads from unpkg.com. After that your browser keeps it."; }
function setQuality(q) { C.quality = QUALITY[q] ? q : "balanced"; $$("[data-q]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.q === C.quality))); syncPill(); }
function setHeight(h) { C.height = [0, 1080, 720, 480].includes(h) ? h : 0; if (C.info && C.height && Math.min(C.info.width, C.info.height) <= C.height) C.height = 0; $$("[data-h]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.h) === C.height))); syncPill(); }

async function load(file) {
  err(""); E.cvResult.hidden = true;
  if (!file) return;
  if (file.size > LIMIT_MB * 1048576) return err(`Please choose a video up to ${LIMIT_MB} MB.`);
  C.file = file; C.info = null;
  let preview = "", info = null;
  // An animated GIF never plays in a <video>: show it as a picture at once instead of waiting for the video probe to fail.
  const gif = /\.gif$/i.test(file.name) || file.type === "image/gif";
  try {
    if (gif) throw new Error("gif");
    info = await probeVideo(file);
    preview = `<video controls playsinline preload="metadata" src="${URL.createObjectURL(file)}" style="width:100%;max-height:46vh;border-radius:12px;background:#000"></video>`;
  } catch {
    preview = gif
      ? `<img alt="Your GIF" src="${URL.createObjectURL(file)}" style="max-width:100%;max-height:46vh;border-radius:12px;background:#000"><p class="mx-hint">An animated GIF becomes an MP4 video (no sound), usually much smaller.</p>`
      : '<p class="mx-msg">Your browser can\'t preview this file, but the converter can usually still read it.</p>';
  }
  if (C.file !== file) return; // another file was picked while this one was being read: keep that one's info
  const i = (C.info = info);
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
  const fast = !!document.getElementById("cvFast")?.checked && !C.height; // a new size always needs re-encoding
  try {
    let data = null, how = "converted";
    if (fast) {
      // Stream copy first: kept only when the result is plain H.264 MP4, else it is converted below.
      try {
        const copy = await runFFmpeg({ files: [{ name: input, data: C.file }], args: remuxArgs({ input, output: "output.mp4" }), output: "output.mp4",
          duration: C.info?.duration || 0, signal: box.signal, onProgress: (f) => box.set(null, f), onStatus: (t, f) => box.set(t === "Encoding MP4…" ? "Copying into MP4 (no re-encoding)…" : t, f) });
        if (isPlainMp4(copy)) { data = copy; how = "copied"; }
      } catch (e) { if (isAbort(e)) throw e; }
    }
    if (!data) data = await runFFmpeg({
      files: [{ name: input, data: C.file }],
      args: convertArgs({ input, output: "output.mp4", quality: C.quality, height: C.height, srcW: C.info?.width || 0, srcH: C.info?.height || 0 }),
      output: "output.mp4", duration: C.info?.duration || 0, signal: box.signal,
      onProgress: (f) => box.set(null, f), onStatus: (t, f) => box.set(t, f),
    });
    box.close(); note();
    const blob = new Blob([data], { type: "video/mp4" });
    C.last = { blob, name: baseName(C.file.name) + ".mp4", type: "mp4", how };
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
    <p class="mx-meta">${fmtBytes(before)} → ${fmtBytes(r.blob.size)}${pctSmaller > 0 ? ` (${pctSmaller}% smaller)` : ""} · <span id="cvHow">${r.how === "copied" ? "copied without re-encoding (same quality)" : "converted to H.264 + AAC"}</span></p>
    <div class="mx-row"><button class="btn primary" id="cvDl">Download MP4</button><a class="btn" href="?mode=trim">Trim a video</a><a class="btn" href="./">Open the video editor</a></div>`;
  $("#cvDl").onclick = () => downloadBlob(r.blob, r.name);
  E.cvResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
const api = { mode: "convert", state: C, load, setQuality,
  // a video or an animated GIF from Uploads opens as the video to convert; other pictures and graphics explain where they go
  insert: oneVideoInsert((f) => load(f), { accept: (f) => f.type === "image/gif" || /\.gif$/i.test(f.name), hint: "The converter turns one video (or GIF) into an MP4. Add pictures, text and graphics in the video editor: File > More video tools." }), setHeight, export: run, applyTemplate: (id) => applyPreset(id), get shell() { return C.shell; }, openInEditor: () => openInEditor(), get last() { return C.last; } };
