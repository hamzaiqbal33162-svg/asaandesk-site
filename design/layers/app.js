// Magic Layers app: open a flat picture or a PDF, split it into editable layers (text, cut-out subject,
// pictures, cleaned background), check them in a layered preview and open the result in Studio.
import { putHandoff } from "../shared/store.js";
import { buildDesign, pictureLayers } from "./build.js";
import { pdfLayers } from "./pdflayers.js";
import * as BR from "./browser.js";

const $ = (s) => document.querySelector(s);
const MAX_SIDE = 3000, DESIGN_MAX = 2000;
const STEPS = {
  image: [["ocr", "Reading the text"], ["erase", "Removing the text from the background"], ["subject", "Cutting out the subject"], ["fill", "Filling in behind the subject"], ["build", "Building the layers"]],
  pdf: [["read", "Reading the PDF"], ["bg", "Pictures and background"], ["ocr", "Reading text in scanned pages"], ["erase", "Removing that text from the picture"], ["build", "Building the layers"]],
};
const state = {
  file: null, kind: null, name: "", pages: [], current: 0, off: new Set(), busy: false, error: null, notes: [], done: false,
  options: { text: true, removeText: true, subject: true, objects: true, fillBehind: true, images: true },
};

/* ---------- small UI helpers ---------- */
let toastTimer = 0;
function toast(msg, ms = 3200) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICON = {
  text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M12 5v14M9 19h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 17l4.5-5 3.5 3.5 2-2 3 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="15.5" cy="9" r="1.6" fill="currentColor"/></svg>',
  subject: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 15l5-4 4 3 3-2 5 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};
const kindOf = (l) => (l.type === "text" ? "text" : l.name === "Background" ? "bg" : /^(Subject|Object)/.test(l.name) ? "subject" : "image");

/* ---------- progress ---------- */
function showSteps(kind) {
  const list = $("#steps");
  list.innerHTML = STEPS[kind].map(([id, label]) => `<li data-step="${id}" class="wait"><span class="dot" aria-hidden="true"></span><span class="label">${esc(label)}</span><span class="detail"></span></li>`).join("");
  $("#progress").hidden = false;
  $("#bar").hidden = true;
}
function setStep(id, status, detail) {
  const li = document.querySelector(`#steps [data-step="${id}"]`);
  if (!li) return;
  li.className = status === "run" ? "run" : status === "done" ? "done" : status === "skip" ? "skip" : "wait";
  if (status === "run") li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  li.querySelector(".detail").textContent = detail || (status === "skip" ? "Skipped" : "");
  if (status !== "run") $("#bar").hidden = true;
}
function onProgress(p) {
  if (!p) return;
  const bar = $("#bar");
  if (p.message) $("#barText").textContent = p.message;
  const frac = p.total ? Math.max(0, Math.min(1, p.loaded / p.total)) : 0;
  bar.hidden = p.stage === "done";
  $("#barFill").style.width = Math.round(frac * 100) + "%";
  bar.setAttribute("aria-valuenow", String(Math.round(frac * 100)));
}

/* ---------- running the split ---------- */
async function imageDeps() {
  const IT = await BR.loadImageTools();
  // a part that cannot load (e.g. offline the first time) is skipped with a note instead of stopping everything
  const soft = (what, fn) => async (...a) => { try { return await fn(...a); } catch (e) { console.error(e); state.notes.push(`${what} (${(e && e.message) || e})`); return null; } };
  return {
    ocr: soft("The text reader could not start, so no text layers were made", (img) => BR.ocr(img, onProgress)),
    matchFont: soft("Font matching was skipped", BR.matchFont),
    inpaint: (img, mask) => IT.magicEraseData(img, mask, { onProgress }),
    removeBg: soft("The subject could not be cut out", (img) => IT.removeBackgroundData(img, { onProgress })),
    encode: (img, type) => BR.encode(img, type),
    makeCanvas: BR.makeCanvas,
    measure: BR.measureRun,
    step: setStep,
  };
}

async function run(file) {
  if (state.busy) { toast("Please wait, the last file is still being split."); return null; }
  if (!file) return null;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  const isImg = /^image\/(png|jpe?g|webp)$/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name || "");
  if (!isPdf && !isImg) { toast("Please choose a JPG, PNG, WebP picture or a PDF."); return null; }
  Object.assign(state, { file, kind: isPdf ? "pdf" : "image", name: (file.name || "Picture").replace(/\.[a-z0-9]+$/i, ""), pages: [], current: 0, off: new Set(), busy: true, error: null, notes: [], done: false });
  document.body.dataset.view = "work";
  $("#start").hidden = true; $("#work").hidden = false; $("#newBtn").hidden = false;
  $("#openStudio").disabled = true; $("#layersPanel").hidden = true; $("#errorBox").hidden = true;
  $("#stage").innerHTML = ""; $("#pageTabs").innerHTML = "";
  $("#fileName").textContent = file.name || "Pasted picture";
  showSteps(state.kind);
  try {
    const deps = await imageDeps();
    if (isPdf) {
      const pdfjs = await BR.loadPdfjs();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const r = await pdfLayers(bytes, { ...deps, pdfjs, loadPdfLib: BR.loadPdfLib }, { text: state.options.text, removeText: state.options.removeText, images: state.options.images });
      state.pages = r.pages; state.notes.push(...r.notes);
      setStep("build", "run");
    } else {
      const cv = await BR.fileToCanvas(file, MAX_SIDE);
      const scale = Math.min(1, DESIGN_MAX / Math.max(cv.width, cv.height));
      const r = await pictureLayers(BR.pixelsOf(cv), deps, { ...state.options, scale });
      state.pages = [{ w: r.w, h: r.h, layers: r.layers, kind: "picture" }];
      state.info = r.info;
    }
    await Promise.all(state.pages.flatMap((p) => p.layers.filter((l) => l.type === "text").map((l) => BR.ensureFont(l.text.family, l.text.bold, l.text.italic))));
    setStep("build", "done", `${state.pages.reduce((a, p) => a + p.layers.length, 0)} layers`);
    for (const li of document.querySelectorAll("#steps li.wait")) setStep(li.dataset.step, "skip", "Not needed");
    state.done = true;
    renderResult();
    if (state.notes.length) toast(state.notes.join(" "), 6500);
    return state.pages;
  } catch (e) {
    console.error(e);
    state.error = (e && e.message) || String(e);
    $("#errorText").textContent = friendly(state.error);
    $("#errorBox").hidden = false;
    $("#bar").hidden = true;
    return null;
  } finally {
    state.busy = false;
  }
}
const friendly = (m) => (/password|encrypt/i.test(m) ? "This PDF is locked with a password. Please open an unlocked copy." : /Invalid PDF|PDF header/i.test(m) ? "This PDF could not be read. It may be damaged." : m || "Something went wrong. Please try another file.");

/* ---------- result: layered preview + layer list ---------- */
function renderResult() {
  $("#layersPanel").hidden = false;
  $("#openStudio").disabled = false;
  const tabs = $("#pageTabs");
  tabs.innerHTML = state.pages.length > 1 ? state.pages.map((_, i) => `<button type="button" role="tab" aria-selected="${i === state.current}" data-page="${i}">Page ${i + 1}</button>`).join("") : "";
  tabs.hidden = state.pages.length < 2;
  renderPage();
}
function renderPage() {
  const page = state.pages[state.current];
  for (const b of document.querySelectorAll("#pageTabs button")) { const on = +b.dataset.page === state.current; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
  const stage = $("#stage");
  stage.innerHTML = "";
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.style.width = page.w + "px"; sheet.style.height = page.h + "px";
  for (const l of page.layers) {
    let el;
    if (l.type === "image") {
      el = document.createElement("img");
      el.src = l.image.src; el.alt = ""; el.draggable = false;
    } else {
      el = document.createElement("div");
      const t = l.text;
      el.textContent = t.content;
      Object.assign(el.style, { fontFamily: BR.FONT_FAMILIES[t.family]?.css || "sans-serif", fontSize: t.size + "px", fontWeight: t.bold ? "700" : "400", fontStyle: t.italic ? "italic" : "normal", lineHeight: String(t.lineHeight), color: t.color });
    }
    el.className = "ly ly-" + l.type;
    el.dataset.id = l.id;
    Object.assign(el.style, { left: l.x + "px", top: l.y + "px", width: l.w + "px", height: l.h + "px", transform: l.rotation ? `rotate(${l.rotation}deg)` : "" });
    el.hidden = state.off.has(l.id);
    sheet.append(el);
  }
  stage.append(sheet);
  fitStage();
  const list = $("#layerList");
  list.innerHTML = page.layers.slice().reverse().map((l) => {
    const k = kindOf(l);
    const detail = l.type === "text" ? `<span class="sw" style="background:${esc(l.text.color)}" aria-hidden="true"></span>${esc(BR.FONT_FAMILIES[l.text.family]?.label.split(" (")[0] || l.text.family)}${l.text.bold ? " bold" : ""} · ${Math.round(l.text.size)} px` : `${Math.round(l.w)} × ${Math.round(l.h)} px`;
    return `<li data-id="${esc(l.id)}" class="${state.off.has(l.id) ? "off" : ""}"><label class="row"><input type="checkbox" ${state.off.has(l.id) ? "" : "checked"} aria-label="Keep layer ${esc(l.name)}"><span class="ic ic-${k}">${ICON[k]}</span><span class="nm"><b>${esc(l.type === "text" ? l.text.content : l.name)}</b><small>${detail}</small></span></label></li>`;
  }).join("");
  const counts = { text: 0, picture: 0 };
  for (const l of page.layers) l.type === "text" ? counts.text++ : counts.picture++;
  $("#layerCount").textContent = `${page.layers.length} layers: ${counts.text} text, ${counts.picture} picture${counts.picture === 1 ? "" : "s"}`;
}
function fitStage() {
  const page = state.pages[state.current], wrap = $("#stage"), sheet = wrap.querySelector(".sheet");
  if (!page || !sheet) return;
  const avail = wrap.clientWidth || 600;
  const maxH = Math.max(240, window.innerHeight * (window.innerWidth < 700 ? 0.55 : 0.72));
  const k = Math.min(avail / page.w, maxH / page.h, 4);
  sheet.style.transform = `scale(${k})`;
  wrap.style.height = Math.ceil(page.h * k) + "px";
  wrap.querySelector(".sheet").style.left = Math.max(0, (avail - page.w * k) / 2) + "px";
}
function toggleLayer(id, on) {
  if (on) state.off.delete(id); else state.off.add(id);
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`);
  if (el) el.hidden = !on;
  const li = document.querySelector(`#layerList li[data-id="${CSS.escape(id)}"]`);
  if (li) { li.classList.toggle("off", !on); li.querySelector("input").checked = on; }
}

/* ---------- Studio hand-off ---------- */
function design() {
  return buildDesign({ name: state.name || "Magic Layers", pages: state.pages.map((p) => ({ w: p.w, h: p.h, layers: p.layers.filter((l) => !state.off.has(l.id)) })) });
}
async function openInStudio() {
  if (!state.done) return null;
  const btn = $("#openStudio");
  btn.disabled = true; btn.textContent = "Opening…";
  try {
    const id = await putHandoff({ type: "design", design: design() });
    state.handoffId = id;
    location.href = "/design/studio/?handoff=" + id;
    return id;
  } catch (e) {
    console.error(e);
    toast("Could not hand the design to Studio. Please try again.");
    btn.disabled = false; btn.textContent = "Open in Studio";
    return null;
  }
}

/* ---------- wiring ---------- */
function reset() {
  if (state.busy) return;
  Object.assign(state, { file: null, pages: [], done: false, off: new Set(), error: null });
  document.body.dataset.view = "start";
  $("#start").hidden = false; $("#work").hidden = true; $("#newBtn").hidden = true; $("#openStudio").disabled = true;
  $("#fileInput").value = "";
  $("#drop").focus();
}
function init() {
  const input = $("#fileInput");
  input.addEventListener("change", () => input.files[0] && run(input.files[0]));
  $("#drop").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  for (const ev of ["dragenter", "dragover"]) document.addEventListener(ev, (e) => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); document.body.classList.add("dragging"); } });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) document.body.classList.remove("dragging"); });
  document.addEventListener("drop", (e) => { e.preventDefault(); document.body.classList.remove("dragging"); const f = e.dataTransfer?.files?.[0]; if (f) run(f); });
  document.addEventListener("paste", (e) => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); run(f); } });
  for (const cb of document.querySelectorAll("#opts input[type=checkbox]")) {
    cb.checked = !!state.options[cb.name];
    cb.addEventListener("change", () => { state.options[cb.name] = cb.checked; syncOptions(); });
  }
  syncOptions();
  $("#layerList").addEventListener("change", (e) => { const li = e.target.closest("li"); if (li && e.target.type === "checkbox") toggleLayer(li.dataset.id, e.target.checked); });
  $("#layerList").addEventListener("pointerover", (e) => highlight(e.target.closest("li")?.dataset.id));
  $("#layerList").addEventListener("pointerleave", () => highlight(null));
  $("#layerList").addEventListener("focusin", (e) => highlight(e.target.closest("li")?.dataset.id));
  $("#pageTabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-page]"); if (b) { state.current = +b.dataset.page; renderPage(); } });
  $("#openStudio").addEventListener("click", openInStudio);
  $("#newBtn").addEventListener("click", reset);
  $("#retryBtn").addEventListener("click", reset);
  $("#allOn").addEventListener("click", () => { for (const l of state.pages[state.current]?.layers || []) toggleLayer(l.id, true); });
  window.addEventListener("resize", () => state.done && fitStage());
}
function syncOptions() {
  const o = state.options;
  for (const [name, dep] of [["removeText", "text"], ["fillBehind", "subject"], ["objects", "subject"]]) {
    const cb = document.querySelector(`#opts input[name=${name}]`);
    cb.disabled = !o[dep];
    cb.closest("label").classList.toggle("dim", !o[dep]);
  }
}
function highlight(id) {
  for (const el of document.querySelectorAll(".sheet .ly.hl")) el.classList.remove("hl");
  if (id) document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`)?.classList.add("hl");
}

init();
window.adApp = {
  state, run, toggleLayer, openInStudio, render: renderResult,
  buildDesign: design,
  setOption: (k, v) => { state.options[k] = !!v; const cb = document.querySelector(`#opts input[name=${k}]`); if (cb) cb.checked = !!v; syncOptions(); },
  layers: (page = 0) => state.pages[page]?.layers || [],
};
