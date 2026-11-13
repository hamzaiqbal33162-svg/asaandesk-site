// Magic Layers app: open a flat picture or a PDF, split it into editable layers (text, cut-out subject,
// pictures, cleaned background), check them in a layered preview and open the result in Studio.
import { putHandoff, getProject, takeHandoff } from "../shared/store.js";
import { buildDesign, pictureLayers, imageLayer, newId, baselineOffset, LINE_HEIGHT } from "./build.js";
import { pdfLayers } from "./pdflayers.js";
import * as BR from "./browser.js";
import { History, clonePages, cloneLayer, resizeBox, moveBox, nudgeOf, recolorPixels, coverCrop, hexToRgb,
  NO_FILTERS, LAYER_LOOKS, lookFilters, filterCss, TEXT_SHADOW, textShadowCss, layerTransform, hasEffects } from "./edit.js";
import { loadBrand } from "../shared/brand.js";

const $ = (s) => document.querySelector(s);
const MAX_SIDE = 3000, DESIGN_MAX = 2000;
const STEPS = {
  image: [["ocr", "Reading the text"], ["erase", "Removing the text from the background"], ["subject", "Cutting out the subject"], ["fill", "Filling in behind the subject"], ["build", "Building the layers"]],
  pdf: [["read", "Reading the PDF"], ["bg", "Pictures and background"], ["ocr", "Reading text in scanned pages"], ["erase", "Removing that text from the picture"], ["build", "Building the layers"]],
};
const state = {
  file: null, kind: null, name: "", pages: [], current: 0, off: new Set(), busy: false, error: null, notes: [], done: false, sel: null, zoom: null, scale: 1, template: null,
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
const REPL_ICON = {
  replace: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h12l-3-3M20 16H8l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
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
  Object.assign(state, { file, kind: isPdf ? "pdf" : "image", name: (file.name || "Picture").replace(/\.[a-z0-9]+$/i, ""), pages: [], current: 0, off: new Set(), busy: true, error: null, notes: [], done: false, sel: null, template: null });
  document.body.dataset.view = "work"; document.body.dataset.done = "";
  shell?.setTitle?.(state.name);
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
    hist.clear(); // a freshly split file starts its own undo history
    renderResult();
    if (shell && !phone() && openPanelId !== "layers") shell.openPanel("layers");
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
  document.body.dataset.done = "1";
  for (const b of document.querySelectorAll("[data-needs-design]")) b.disabled = false;
  if ($("#layersEmpty")) $("#layersEmpty").hidden = true;
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
      if (t.align && t.align !== "left") el.style.textAlign = t.align;
    }
    el.className = "ly ly-" + l.type + (l.locked ? " locked" : "");
    el.dataset.id = l.id;
    styleLayerEl(el, l);
    el.hidden = state.off.has(l.id);
    if (l.id === state.sel) el.classList.add("picked");
    sheet.append(el);
  }
  // selection box with four corner handles (drag a corner to resize; drag the layer itself to move it)
  const sel = document.createElement("div");
  sel.className = "ly-sel"; sel.hidden = true; sel.setAttribute("aria-hidden", "true");
  sel.innerHTML = ["nw", "ne", "sw", "se"].map((h) => `<span class="ly-handle" data-h="${h}"></span>`).join("");
  sheet.append(sel);
  stage.append(sheet);
  fitStage();
  const list = $("#layerList");
  list.innerHTML = page.layers.slice().reverse().map((l) => {
    const k = kindOf(l);
    const detail = l.type === "text" ? `<span class="sw" style="background:${esc(l.text.color)}" aria-hidden="true"></span>${esc(BR.FONT_FAMILIES[l.text.family]?.label.split(" (")[0] || l.text.family)}${l.text.bold ? " bold" : ""} · ${Math.round(l.text.size)} px` : `${Math.round(l.w)} × ${Math.round(l.h)} px`;
    const extra = `${(l.opacity ?? 1) < 1 ? ` · ${Math.round((l.opacity ?? 1) * 100)}%` : ""}${l.locked ? ' · <span class="lk">Locked</span>' : ""}`;
    const nm = l.type === "text" ? l.text.content : l.name;
    return `<li data-id="${esc(l.id)}" class="${(state.off.has(l.id) ? "off" : "") + (l.id === state.sel ? " picked" : "") + (l.locked ? " locked" : "")}"><label class="row"><input type="checkbox" ${state.off.has(l.id) ? "" : "checked"} aria-label="Keep layer ${esc(l.name)}"><span class="ic ic-${k}">${ICON[k]}</span><span class="nm"><b>${esc(nm)}</b><small>${detail}${extra}</small></span></label><button type="button" class="repl" data-act="${l.type === "text" ? "edit" : "replace"}" aria-label="${l.type === "text" ? "Edit the text of" : "Replace the picture of"} layer ${esc(nm.slice(0, 40))}" title="${l.type === "text" ? "Edit text" : "Replace picture"}">${l.type === "text" ? REPL_ICON.edit : REPL_ICON.replace}</button><button type="button" class="pick" aria-pressed="${l.id === state.sel}" aria-label="Select layer ${esc(nm.slice(0, 40))}" title="Select this layer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l13 7-6 1.5L9 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button></li>`;
  }).join("");
  const counts = { text: 0, picture: 0 };
  for (const l of page.layers) l.type === "text" ? counts.text++ : counts.picture++;
  $("#layerCount").textContent = `${page.layers.length} layers: ${counts.text} text, ${counts.picture} picture${counts.picture === 1 ? "" : "s"}`;
  syncSelUi();
  refreshTextPanel();
}
/** Position, size, turn and transparency of a layer's element in the preview (also used while dragging). */
function styleLayerEl(el, l) {
  Object.assign(el.style, { left: l.x + "px", top: l.y + "px", width: l.w + "px", height: l.h + "px", transform: layerTransform(l), opacity: String(l.opacity ?? 1) });
  if (l.type === "text") { el.style.fontSize = l.text.size + "px"; el.style.textAlign = l.text.align && l.text.align !== "left" ? l.text.align : ""; el.style.textShadow = textShadowCss(l.text.shadow); }
  else if (l.type === "image") { const f = filterCss(l.image.filters); el.style.filter = f === "none" ? "" : f; }
}
/** The selection box follows the selected layer (hidden when nothing visible is selected). */
function placeSel() {
  const box = document.querySelector(".sheet .ly-sel");
  if (!box) return;
  const l = selLayer();
  box.hidden = !l || state.off.has(l.id);
  if (box.hidden) return;
  Object.assign(box.style, { left: l.x + "px", top: l.y + "px", width: l.w + "px", height: l.h + "px", transform: l.rotation ? `rotate(${l.rotation}deg)` : "" });
  box.classList.toggle("locked", !!l.locked);
}
function fitStage() {
  const page = state.pages[state.current], wrap = $("#stage"), sheet = wrap.querySelector(".sheet");
  if (!page || !sheet) return;
  wrap.style.minWidth = "";
  const avail = wrap.clientWidth || 600;
  const host = wrap.closest("main");
  const maxH = shell && host ? Math.max(160, host.clientHeight - (phone() ? 70 : 96)) : Math.max(240, window.innerHeight * (window.innerWidth < 700 ? 0.55 : 0.72));
  const fit = Math.min(avail / page.w, maxH / page.h, 4);
  const k = state.zoom ? state.zoom : fit;
  state.scale = k; state.fit = fit;
  sheet.style.transform = `scale(${k})`;
  sheet.style.setProperty("--inv", String(1 / k)); // handles and outlines keep their screen size at any zoom
  wrap.style.height = Math.ceil(page.h * k) + "px";
  if (page.w * k > avail) wrap.style.minWidth = Math.ceil(page.w * k) + "px";
  sheet.style.left = Math.max(0, (avail - page.w * k) / 2) + "px";
}
function setZoom(pct) {
  // Kept even before a picture is open (the bottom-bar zoom always answers); used as soon as one is shown.
  state.zoom = pct == null ? null : Math.max(0.05, Math.min(4, pct / 100));
  if (!state.pages[state.current]) return;
  fitStage();
}
function toggleLayer(id, on, { rec = true } = {}) {
  if (on === !state.off.has(id)) return;
  if (rec) record();
  if (on) state.off.delete(id); else state.off.add(id);
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`);
  if (el) el.hidden = !on;
  const li = document.querySelector(`#layerList li[data-id="${CSS.escape(id)}"]`);
  if (li) { li.classList.toggle("off", !on); li.querySelector("input").checked = on; }
  syncSelUi();
}

/* ---------- Studio hand-off ---------- */
function design() {
  const plain = (l) => { if (l.recolorOf == null && l.recolorHex == null) return l; const c = { ...l }; delete c.recolorOf; delete c.recolorHex; return c; };
  return buildDesign({ name: state.name || "Magic Layers", pages: state.pages.map((p) => ({ w: p.w, h: p.h, layers: p.layers.filter((l) => !state.off.has(l.id)).map(plain) })) });
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
  hist.clear();
  resetView();
  syncUndoUi();
}
function resetView() {
  Object.assign(state, { file: null, pages: [], done: false, off: new Set(), error: null, sel: null, zoom: null, template: null });
  document.body.dataset.view = "start"; document.body.dataset.done = "";
  $("#layersPanel").hidden = true;
  if ($("#layersEmpty")) $("#layersEmpty").hidden = false;
  for (const b of document.querySelectorAll("[data-needs-design]")) b.disabled = true;
  refreshTextPanel();
  $("#start").hidden = false; $("#work").hidden = true; $("#newBtn").hidden = true; $("#openStudio").disabled = true;
  $("#fileInput").value = "";
  $("#drop").focus();
  syncSelUi();
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
  $("#allOn").addEventListener("click", () => { const ls = state.pages[state.current]?.layers || []; if (ls.some((l) => state.off.has(l.id))) record(); for (const l of ls) toggleLayer(l.id, true, { rec: false }); });
  window.addEventListener("resize", () => state.done && fitStage());
  $("#layerList").addEventListener("click", (e) => {
    const b = e.target.closest("button.pick"); if (b) select(b.closest("li").dataset.id);
    const r = e.target.closest("button.repl"); if (r) { select(r.closest("li").dataset.id); startReplace(state.sel); }
  });
  const stage = $("#stage");
  stage.addEventListener("pointerdown", onStageDown);
  stage.addEventListener("pointermove", onStageMove);
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) stage.addEventListener(ev, onStageUp);
  $("#lyOpen")?.addEventListener("click", () => $("#fileInput").click());
  $("#lyUndo")?.addEventListener("click", () => undo());
  $("#lyRedo")?.addEventListener("click", () => redo());
  $("#lyUp")?.addEventListener("click", () => moveLayer(state.sel, 1));
  $("#lyDown")?.addEventListener("click", () => moveLayer(state.sel, -1));
  $("#lyHide")?.addEventListener("click", () => { if (state.sel) toggleLayer(state.sel, state.off.has(state.sel)); else toast("Select a layer first: click it in the picture or in the layer list."); });
  $("#lyDup")?.addEventListener("click", () => duplicateLayer(state.sel));
  $("#lyLock")?.addEventListener("click", () => lockLayer(state.sel));
  $("#lyDel")?.addEventListener("click", () => deleteLayer(state.sel));
  $("#lyRecolor")?.addEventListener("click", () => toggleColorPop());
  $("#lyEffects")?.addEventListener("click", () => toggleFxPop());
  document.addEventListener("pointerdown", (e) => { const pop = $("#lyFxPop"); if (pop && !pop.hidden && !e.target.closest("#lyFxPop, #lyEffects")) closeFxPop(); });
  $("#lyReplace")?.addEventListener("click", () => startReplace(state.sel));
  $("#lyReplaceInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0], id = replaceTarget || state.sel;
    e.target.value = "";
    if (!f || !id) return;
    try { await replaceLayerImage(id, await fileToDataUrl(f), f.name); } catch (err) { console.error(err); toast(err.message || "That picture could not be used."); }
  });
  document.addEventListener("pointerdown", (e) => { const pop = $("#lyColorPop"); if (pop && !pop.hidden && !e.target.closest("#lyColorPop, #lyRecolor")) closeColorPop(); });
  $("#lyDownload")?.addEventListener("click", () => download("png"));
  $("#lyFit")?.addEventListener("click", () => setZoom(null));
  const op = $("#lyOpacity");
  op?.addEventListener("input", () => { if (!needSel()) return; setOpacity(state.sel, +op.value / 100, { session: true }); });
  op?.addEventListener("change", () => { session = null; });
  document.addEventListener("keydown", onKey);
}
const TYPING = "input:not([type=range]):not([type=checkbox]):not([type=button]), textarea, select, [contenteditable]";
function onKey(e) {
  const typing = !!e.target.closest?.(TYPING), mod = e.ctrlKey || e.metaKey, k = (e.key || "").toLowerCase();
  if (state.mode && state.mode !== "edit") return;
  if (mod && !e.altKey && (k === "z" || k === "y") && !typing) {
    if (!state.done) return;
    e.preventDefault();
    if (k === "y" || e.shiftKey) redo(); else undo();
    return;
  }
  if (typing || !state.sel) return;
  if (mod && k === "d") { e.preventDefault(); duplicateLayer(state.sel); return; }
  const n = nudgeOf(e.key, e.shiftKey);
  if (n && !mod) { e.preventDefault(); nudge(state.sel, n[0], n[1]); return; }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteLayer(state.sel); }
  else if (e.key === "Escape") { if ($("#lyColorPop") && !$("#lyColorPop").hidden) closeColorPop(); else select(null); }
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

/* ---------- editor frame helpers: selection, layer order, samples, text, export, projects ---------- */
let shell = null, openPanelId = null, textPanelEl = null, galleryP = null;
const phone = () => typeof matchMedia === "function" && matchMedia("(max-width: 759.98px)").matches;
const cur = () => state.pages[state.current] || null;
const gallery = () => (galleryP ||= import("./gallery.js").catch((e) => { galleryP = null; throw e; }));
const slug = (s) => String(s || "design").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "design";

function select(id) {
  state.sel = id && cur()?.layers.some((l) => l.id === id) ? id : null;
  if (replaceTarget && replaceTarget !== state.sel) replaceTarget = null;
  if (state.sel !== popFor) closeColorPop();
  syncSelUi();
}
const layerById = (id) => (id ? cur()?.layers.find((l) => l.id === id) || null : null);
const selLayer = () => layerById(state.sel);
function syncSelUi() {
  for (const el of document.querySelectorAll(".sheet .ly")) el.classList.toggle("picked", el.dataset.id === state.sel);
  for (const li of document.querySelectorAll("#layerList li")) { const on = li.dataset.id === state.sel; li.classList.toggle("picked", on); li.querySelector(".pick")?.setAttribute("aria-pressed", String(on)); }
  for (const box of document.querySelectorAll(".ly-tedit")) box.classList.toggle("picked", box.dataset.id === state.sel);
  const l = selLayer();
  const hb = $("#lyHide");
  if (hb) hb.textContent = state.sel && state.off.has(state.sel) ? "Show" : "Hide";
  const lk = $("#lyLock");
  if (lk) { lk.textContent = l?.locked ? "Unlock" : "Lock"; lk.setAttribute("aria-pressed", String(!!l?.locked)); }
  const op = $("#lyOpacity");
  if (op) { op.value = String(Math.round((l?.opacity ?? 1) * 100)); op.disabled = !l; const out = $("#lyOpacityOut"); if (out) out.textContent = l ? op.value + "%" : ""; }
  placeSel();
}
const needSel = () => { if (state.sel) return true; toast("Select a layer first: click it in the picture or use the arrow next to it in the layer list."); return false; };
const LOCKED_MSG = "This layer is locked. Unlock it first (Lock button in the toolbar).";
function moveLayer(id, dir) {
  if (!id) return needSel();
  const page = cur(), i = page ? page.layers.findIndex((l) => l.id === id) : -1, j = i + dir;
  if (i < 0) return false;
  if (j < 0 || j >= page.layers.length) { toast(dir > 0 ? "This layer is already on top." : "This layer is already at the bottom."); return false; }
  record();
  [page.layers[i], page.layers[j]] = [page.layers[j], page.layers[i]];
  renderPage();
  return true;
}
function deleteLayer(id) {
  if (!id) return needSel();
  const page = cur(), i = page ? page.layers.findIndex((l) => l.id === id) : -1;
  if (i < 0) return false;
  if (page.layers[i].locked) { toast(LOCKED_MSG); return false; }
  record();
  page.layers.splice(i, 1);
  state.off.delete(id); state.sel = null;
  renderPage();
  toast("Layer deleted. Press Undo to bring it back.");
  return true;
}
function duplicateLayer(id) {
  if (!id) return needSel();
  const page = cur(), i = page ? page.layers.findIndex((l) => l.id === id) : -1;
  if (i < 0) return null;
  record();
  const src = page.layers[i], c = cloneLayer(src), d = Math.max(10, Math.round(Math.min(page.w, page.h) * 0.02));
  Object.assign(c, { id: newId(), name: (src.name || "Layer").slice(0, 30) + " copy", x: Math.min(page.w - 10, src.x + d), y: Math.min(page.h - 10, src.y + d), locked: false });
  page.layers.splice(i + 1, 0, c);
  state.off.delete(c.id); state.sel = c.id;
  renderPage();
  return c;
}
function lockLayer(id, on) {
  if (!id) return needSel();
  const l = layerById(id);
  if (!l) return false;
  const want = on == null ? !l.locked : !!on;
  if (want === !!l.locked) return true;
  record();
  l.locked = want;
  renderPage();
  toast(want ? "Layer locked: it can't be moved, resized or deleted." : "Layer unlocked.");
  return true;
}
function setOpacity(id, v, { session: live = false } = {}) {
  const l = layerById(id);
  if (!l) return false;
  const key = "opacity:" + id;
  if (!live || session !== key) { record(); session = live ? key : null; }
  l.opacity = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`);
  if (el) el.style.opacity = String(l.opacity);
  const out = $("#lyOpacityOut"); if (out) out.textContent = Math.round(l.opacity * 100) + "%";
  if (!live) renderPage();
  return true;
}
/** Move a layer by (dx, dy) design px (one undo step per burst of arrow keys). */
let lastNudge = 0;
function nudge(id, dx, dy) {
  const l = layerById(id);
  if (!l) return false;
  if (l.locked) { toast(LOCKED_MSG); return false; }
  if (Date.now() - lastNudge > 700) record();
  lastNudge = Date.now();
  Object.assign(l, moveBox(l, dx, dy));
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`);
  if (el) styleLayerEl(el, l);
  placeSel();
  return true;
}
/** Set a layer's box (and for text the font size, which follows the width). */
function applyBox(l, b, base) {
  if (l.type === "text" && base) l.text.size = Math.max(4, Math.round(base.size * (b.w / base.w) * 100) / 100);
  Object.assign(l, b);
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(l.id)}"]`);
  if (el) styleLayerEl(el, l);
  placeSel();
}
function moveBy(id, dx, dy) { const l = layerById(id); if (!l || l.locked) return false; record(); applyBox(l, moveBox(l, dx, dy)); renderPage(); return true; }
function resizeLayer(id, handle, dx, dy, { free = false } = {}) {
  const l = layerById(id);
  if (!l || l.locked) return false;
  record();
  const base = { w: l.w, size: l.text?.size };
  applyBox(l, resizeBox(l, handle, dx, dy, { keep: l.type === "text" || !free }), base);
  renderPage();
  return true;
}

/* dragging layers and corner handles on the preview */
let drag = null;
function onStageDown(e) {
  if (state.mode && state.mode !== "edit") return;
  if (e.button != null && e.button > 0) return;
  const handle = e.target.closest?.(".ly-handle");
  if (handle) {
    const l = selLayer();
    if (!l) return;
    e.preventDefault();
    if (l.locked) { toast(LOCKED_MSG); return; }
    drag = { kind: "resize", h: handle.dataset.h, id: l.id, x0: e.clientX, y0: e.clientY, box: { x: l.x, y: l.y, w: l.w, h: l.h }, size: l.text?.size, moved: false, pid: e.pointerId };
    try { $("#stage").setPointerCapture(e.pointerId); } catch {}
    return;
  }
  const el = e.target.closest?.(".ly"), id = el ? el.dataset.id : null, was = state.sel === id;
  select(id);
  if (!id) return;
  const l = layerById(id);
  if (!l || (e.pointerType === "touch" && !was)) return; // on touch screens the first tap selects, the next drag moves
  if (l.locked) return;
  e.preventDefault();
  drag = { kind: "move", id, x0: e.clientX, y0: e.clientY, box: { x: l.x, y: l.y, w: l.w, h: l.h }, moved: false, pid: e.pointerId };
  try { $("#stage").setPointerCapture(e.pointerId); } catch {}
}
function onStageMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const l = layerById(drag.id);
  if (!l) { drag = null; return; }
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 3) return;
    drag.moved = true;
    record();
    document.body.classList.add("ly-dragging");
  }
  const k = state.scale || 1, dx = (e.clientX - drag.x0) / k, dy = (e.clientY - drag.y0) / k;
  if (drag.kind === "move") applyBox(l, moveBox(drag.box, dx, dy));
  else applyBox(l, resizeBox(drag.box, drag.h, dx, dy, { keep: l.type === "text" || !e.shiftKey }), { w: drag.box.w, size: drag.size });
}
function onStageUp(e) {
  if (!drag || (e.pointerId != null && e.pointerId !== drag.pid)) return;
  const moved = drag.moved;
  drag = null;
  document.body.classList.remove("ly-dragging");
  if (moved) renderPage(); // the layer list shows the new size; the text panel the new font size
}

/* undo / redo (whole-design snapshots; pictures are shared strings) */
const hist = new History(80);
let session = null; // one undo step for a run of the same live edit (typing, colour picking, opacity sliding)
function snapshot() { return { pages: clonePages(state.pages), off: [...state.off], current: state.current, sel: state.sel, name: state.name, template: state.template, kind: state.kind, done: state.done }; }
function record() { hist.record(snapshot()); syncUndoUi(); }
function restore(s) {
  session = null;
  if (!s.done) { resetView(); shell?.setTitle?.(""); syncUndoUi(); return; }
  Object.assign(state, { pages: clonePages(s.pages), off: new Set(s.off), current: Math.min(s.current, s.pages.length - 1), name: s.name, template: s.template, kind: s.kind, done: true, file: null, error: null, busy: false });
  state.sel = s.sel && cur()?.layers.some((l) => l.id === s.sel) ? s.sel : null;
  document.body.dataset.view = "work";
  $("#start").hidden = true; $("#work").hidden = false; $("#newBtn").hidden = false; $("#errorBox").hidden = true;
  $("#fileName").textContent = state.name;
  shell?.setTitle?.(state.name);
  renderResult();
  syncUndoUi();
}
function undo() {
  if (state.busy) return false;
  if (!hist.canUndo) { toast("Nothing to undo."); return false; }
  restore(hist.undo(snapshot()));
  return true;
}
function redo() {
  if (state.busy) return false;
  if (!hist.canRedo) { toast("Nothing to redo."); return false; }
  restore(hist.redo(snapshot()));
  return true;
}
function syncUndoUi() {
  const u = $("#lyUndo"), r = $("#lyRedo");
  if (u) u.disabled = !hist.canUndo;
  if (r) r.disabled = !hist.canRedo;
}

/* blank design, added text and pictures */
function blankPage(w = 1080, h = 1080) {
  const c = BR.makeCanvas(w, h), x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
  return { w, h, kind: "blank", layers: [imageLayer({ src: c.toDataURL("image/png"), x: 0, y: 0, w, h, name: "Background" })] };
}
function showDesign(pages, { name = "Untitled design", kind = "template", template = null } = {}) {
  Object.assign(state, { file: null, kind, name, pages, current: 0, off: new Set(), busy: false, error: null, notes: [], done: true, sel: null, zoom: null, template });
  document.body.dataset.view = "work";
  $("#start").hidden = true; $("#work").hidden = false; $("#newBtn").hidden = false;
  $("#errorBox").hidden = true; $("#bar").hidden = true; $("#steps").innerHTML = "";
  $("#fileName").textContent = name;
  shell?.setTitle?.(name);
  renderResult();
  // the open fonts load in the background; text re-flows by itself when they arrive
  Promise.all(pages.flatMap((p) => p.layers.filter((l) => l.type === "text").map((l) => BR.ensureFont(l.text.family, l.text.bold, l.text.italic)))).catch(() => {});
}
function ensureDesign() {
  if (state.done && cur()) return true;
  if (state.busy) { toast("Please wait, the last file is still being split."); return false; }
  record();
  showDesign([blankPage()], { name: "Untitled design", kind: "blank" });
  return true;
}
const TEXT_STYLES = { heading: { s: 72, b: true, c: "Add a heading" }, subheading: { s: 44, b: true, c: "Add a subheading" }, body: { s: 28, b: false, c: "Add a little bit of body text" } };
function addText(kind = "body", content) {
  if (!ensureDesign()) return null;
  const page = cur(), st = TEXT_STYLES[kind] || TEXT_STYLES.body, text = String(content || st.c).slice(0, 2000);
  const size = Math.max(10, Math.round(st.s * Math.min(page.w, page.h) / 1080));
  const lines = text.split("\n");
  const w = Math.min(page.w * 0.9, Math.ceil(Math.max(...lines.map((l) => l.length)) * size * (st.b ? 0.62 : 0.56)) + 8);
  const n = page.layers.filter((l) => l.type === "text").length;
  const l = {
    id: newId(), type: "text", name: text.trim().slice(0, 24) || "Text", x: Math.round((page.w - w) / 2), y: Math.round(Math.min(page.h - size * 1.3, page.h * 0.3 + (n % 6) * size * 1.3)),
    w, h: Math.round(size * LINE_HEIGHT * lines.length * 100) / 100, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null,
    text: { content: text, family: "sans", size, bold: st.b, italic: false, underline: false, color: "#1f2937", align: "left", lineHeight: LINE_HEIGHT, letterSpacing: 0 },
  };
  record();
  page.layers.push(l);
  state.sel = l.id;
  renderPage();
  BR.ensureFont("sans", st.b, false).catch(() => {});
  return l;
}
async function loadImg(src) { const img = new Image(); img.decoding = "async"; img.src = src; await img.decode(); return img; }
async function addImage(src, name = "Picture") {
  if (!ensureDesign()) return null;
  const page = cur(), img = await loadImg(src);
  const k = Math.min(1, (page.w * 0.6) / (img.naturalWidth || 300), (page.h * 0.6) / (img.naturalHeight || 300));
  const w = Math.round((img.naturalWidth || 300) * k), h = Math.round((img.naturalHeight || 300) * k);
  const l = imageLayer({ src, x: Math.round((page.w - w) / 2), y: Math.round((page.h - h) / 2), w, h, name: String(name || "Picture").replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "Picture" });
  record();
  page.layers.push(l);
  state.sel = l.id;
  renderPage();
  return l;
}
async function insertImage(src, name) {
  if (state.done && replaceTarget && layerById(replaceTarget)?.type === "image") {
    try { await replaceLayerImage(replaceTarget, src, name); } catch (e) { console.error(e); toast(e.message || "This picture could not be used."); }
    return;
  }
  if (!state.done && !state.busy) {
    // no design yet: split the picture into layers (the main job of this tool)
    try {
      const blob = await (await fetch(src)).blob();
      if (/^image\/(png|jpe?g|webp)$/.test(blob.type)) { run(new File([blob], name || "Picture.png", { type: blob.type })); return; }
    } catch (e) { console.warn(e); }
  }
  try { await addImage(src, name); } catch (e) { console.error(e); toast("This picture could not be added."); }
}
function setSelColor(hex) {
  const l = cur()?.layers.find((x) => x.id === state.sel);
  if (!l || l.type !== "text") { toast("Select a text layer first."); return; }
  record(); l.text.color = hex; renderPage();
}
function setSelFont(family) {
  const l = cur()?.layers.find((x) => x.id === state.sel);
  if (!l || l.type !== "text") { toast("Select a text layer first."); return; }
  record(); l.text.family = BR.FONT_FAMILIES[family] ? family : "sans"; renderPage();
  BR.ensureFont(l.text.family, l.text.bold, l.text.italic).catch(() => {});
}

/* ---------- recolour and replace (Canva's Magic Layers lets you recolour and swap elements) ---------- */
const OWN_SWATCHES = ["#1f2937", "#ffffff", "#e63946", "#f4a261", "#ffd166", "#2a9d8f", "#3a86ff", "#8338ec"];
let replaceTarget = null, popFor = null;
const fileToDataUrl = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("That file could not be read.")); r.readAsDataURL(f); });
/** Picture layer → its pixels recoloured (new PNG); text layer → text colour. One undo step. */
async function recolorLayer(id, hex) {
  const l = layerById(id);
  if (!l) return needSel();
  if (!hexToRgb(hex)) { toast("Pick a colour first."); return false; }
  if (l.locked) { toast(LOCKED_MSG); return false; }
  if (l.type === "text") { updateText(l, { color: hex }); session = null; renderPage(); return true; }
  const base = l.recolorOf || l.image.src, img = await loadImg(base);
  const w = img.naturalWidth || img.width || Math.round(l.w), h = img.naturalHeight || img.height || Math.round(l.h);
  const k = Math.min(1, 2400 / Math.max(w, h)), c = BR.makeCanvas(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))), x = c.getContext("2d");
  if (!x) throw new Error("This browser cannot recolour pictures.");
  x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height);
  recolorPixels(d.data, hex);
  x.putImageData(d, 0, 0);
  const src = c.toDataURL("image/png");
  record();
  const L = layerById(id);
  L.recolorOf = base; L.recolorHex = hex; L.image = { ...L.image, src };
  renderPage();
  return true;
}
function resetLayerColor(id) {
  const l = layerById(id);
  if (!l) return needSel();
  if (l.type !== "image" || !l.recolorOf) { toast(l.type === "text" ? "Pick a colour for the text instead." : "This layer has its own colours already."); return false; }
  record();
  l.image = { ...l.image, src: l.recolorOf };
  delete l.recolorOf; delete l.recolorHex;
  renderPage();
  return true;
}
/** The picture of a layer swapped for another one, cover-fitted into the same box (place, size, turn and opacity stay). */
async function replaceLayerImage(id, src, name) {
  const l = layerById(id);
  if (!l || l.type !== "image") { toast("Select a picture layer to replace."); return false; }
  if (l.locked) { toast(LOCKED_MSG); return false; }
  const img = await loadImg(src);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error("That picture could not be read.");
  const q = Math.max(1, Math.min(2, iw / l.w, ih / l.h)), cw = Math.max(1, Math.round(l.w * q)), ch = Math.max(1, Math.round(l.h * q));
  const r = coverCrop(iw, ih, cw, ch), c = BR.makeCanvas(cw, ch), x = c.getContext("2d");
  if (!x) throw new Error("This browser cannot place pictures.");
  x.imageSmoothingQuality = "high";
  x.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, cw, ch);
  const out = c.toDataURL("image/png");
  record();
  const L = layerById(id);
  L.image = { ...L.image, src: out, crop: { x: 0, y: 0, w: 1, h: 1 } };
  delete L.recolorOf; delete L.recolorHex;
  if (name) L.name = String(name).replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || L.name;
  replaceTarget = null;
  renderPage();
  toast("Picture replaced. Undo brings the old one back.");
  return true;
}
/** Replace: a picture opens the file picker (or take one from Uploads); a text opens its editor. */
function startReplace(id) {
  const l = layerById(id);
  if (!l) return needSel();
  if (l.type === "text") {
    if (shell) shell.openPanel("text");
    const ta = document.querySelector(`.ly-tedit[data-id="${CSS.escape(l.id)}"] textarea`);
    if (ta) { ta.focus(); ta.select?.(); }
    return true;
  }
  if (l.locked) { toast(LOCKED_MSG); return false; }
  replaceTarget = l.id;
  toast("Pick the new picture (from this device, or from Uploads).");
  $("#lyReplaceInput")?.click();
  return true;
}
function colorPop() {
  let pop = $("#lyColorPop");
  if (pop) return pop;
  pop = document.createElement("div");
  pop.id = "lyColorPop"; pop.className = "ly-pop"; pop.hidden = true;
  pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Colour of the selected layer");
  document.body.append(pop);
  return pop;
}
function fillColorPop() {
  const pop = colorPop(), l = selLayer();
  const brand = (loadBrand().colors || []).filter((c) => hexToRgb(c));
  const sw = (c) => `<button type="button" class="ly-sw" data-color="${esc(c)}" style="--c:${esc(c)}" aria-label="Colour ${esc(c)}" title="${esc(c)}"></button>`;
  const now = l?.type === "text" ? l.text.color : l?.recolorHex || "#3a86ff";
  pop.innerHTML = `<b>${l?.type === "text" ? "Text colour" : "Recolour the picture"}</b>` +
    (brand.length ? `<small>Brand colours</small><div class="ly-sws">${brand.map(sw).join("")}</div>` : "") +
    `<small>Colours</small><div class="ly-sws">${OWN_SWATCHES.map(sw).join("")}</div>` +
    `<label class="ly-cin"><span>Any colour</span><input type="color" id="lyColorIn" value="${esc(/^#[0-9a-f]{6}$/i.test(now) ? now : "#3a86ff")}"></label>` +
    (l?.type === "image" ? `<button type="button" class="btn small" id="lyColorReset"${l.recolorOf ? "" : " disabled"}>Reset colour</button>` : "");
  pop.onclick = async (e) => {
    const b = e.target.closest(".ly-sw"), id = state.sel;
    if (b && id) { try { await recolorLayer(id, b.dataset.color); fillColorPop(); } catch (err) { console.error(err); toast(err.message || "That colour could not be used."); } }
    if (e.target.closest("#lyColorReset") && id) { resetLayerColor(id); fillColorPop(); }
  };
  const ci = pop.querySelector("#lyColorIn");
  ci.addEventListener("change", async () => { if (state.sel) { try { await recolorLayer(state.sel, ci.value); fillColorPop(); } catch (err) { toast(err.message || "That colour could not be used."); } } });
}
function toggleColorPop(open) {
  const pop = colorPop(), btn = $("#lyRecolor");
  if (open === false || (open == null && !pop.hidden)) { closeColorPop(); return; }
  if (!needSel()) return;
  if (selLayer()?.locked) { toast(LOCKED_MSG); return; }
  fillColorPop();
  pop.hidden = false;
  popFor = state.sel;
  btn?.setAttribute("aria-expanded", "true");
  const r = btn?.getBoundingClientRect?.();
  if (r) { pop.style.left = Math.max(8, Math.min(window.innerWidth - 268, r.left)) + "px"; pop.style.top = Math.round(r.bottom + 6) + "px"; }
  pop.querySelector(".ly-sw")?.focus?.();
}
function closeColorPop() { popFor = null; const pop = document.getElementById("lyColorPop"); if (pop) pop.hidden = true; document.getElementById("lyRecolor")?.setAttribute("aria-expanded", "false"); }

/* ---------- effects on the selected layer: looks, light, blur and flips for a picture; a shadow for text ---------- */
let fxSession = null;
/** Changes one layer's effects. live = part of a slider drag (one undo step for the whole drag). */
function setLayerEffects(id, patch, { live = false } = {}) {
  const l = layerById(id);
  if (!l) return needSel();
  if (l.locked) { toast(LOCKED_MSG); return false; }
  const key = "fx:" + id + ":" + Object.keys(patch).join(",");
  if (!live || fxSession !== key) { record(); fxSession = live ? key : null; }
  if (l.type === "image") {
    const { flipX, flipY, look, ...f } = patch;
    l.image = { ...l.image, filters: look ? lookFilters(look) : { ...NO_FILTERS, ...l.image.filters, ...f } };
    if (flipX != null) l.image.flipX = !!flipX;
    if (flipY != null) l.image.flipY = !!flipY;
  } else if (l.type === "text") {
    const sh = patch.shadow === null ? null : { ...TEXT_SHADOW, ...(l.text.shadow || {}), ...(patch.shadow || {}) };
    l.text = { ...l.text };
    if (sh) l.text.shadow = sh; else delete l.text.shadow;
  }
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`);
  if (el) styleLayerEl(el, l);
  if (!live) renderPage();
  return true;
}
const resetEffects = (id) => { const l = layerById(id); if (!l) return needSel(); return setLayerEffects(id, l.type === "image" ? { look: "none", flipX: false, flipY: false } : { shadow: null }); };
function fxPop() {
  let pop = $("#lyFxPop");
  if (pop) return pop;
  pop = document.createElement("div");
  pop.id = "lyFxPop"; pop.className = "ly-pop ly-fx"; pop.hidden = true;
  pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Effects of the selected layer");
  document.body.append(pop);
  return pop;
}
const FX_SLIDERS = [["brightness", "Brightness", 0.3, 1.7, 0.01], ["contrast", "Contrast", 0.3, 1.7, 0.01], ["saturate", "Saturation", 0, 2, 0.01], ["hue", "Hue", -180, 180, 1], ["grayscale", "Black and white", 0, 1, 0.01], ["sepia", "Sepia", 0, 1, 0.01], ["blur", "Blur", 0, 20, 0.5]];
function fillFxPop() {
  const pop = fxPop(), l = selLayer();
  if (!l) return;
  const range = (id, label, min, max, step, v) => `<label class="ly-fxr"><span>${label}</span><input type="range" data-fx="${id}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${label}"></label>`;
  if (l.type === "image") {
    const f = { ...NO_FILTERS, ...l.image.filters };
    pop.innerHTML = `<b>Picture effects</b><div class="ly-looks">${LAYER_LOOKS.map((k) => `<button type="button" class="chip" data-look="${k.id}">${esc(k.name)}</button>`).join("")}</div>` +
      FX_SLIDERS.map(([id, label, min, max, step]) => range(id, label, min, max, step, f[id])).join("") +
      `<div class="ly-fxb"><button type="button" class="btn small" data-flip="x" aria-pressed="${!!l.image.flipX}">Flip left-right</button><button type="button" class="btn small" data-flip="y" aria-pressed="${!!l.image.flipY}">Flip upside down</button><button type="button" class="btn small" id="lyFxReset"${hasEffects(l) ? "" : " disabled"}>Reset</button></div>`;
  } else {
    const sh = l.text.shadow;
    pop.innerHTML = `<b>Text effects</b><label class="ly-fxc"><input type="checkbox" id="lyShadowOn"${sh ? " checked" : ""}> Shadow</label>` +
      (sh ? range("sblur", "Blur", 0, 40, 1, sh.blur ?? 8) + range("sdist", "Distance", 0, 40, 1, Math.round(Math.hypot(sh.x || 0, sh.y || 0))) + range("sop", "Strength", 0, 1, 0.05, sh.opacity ?? 0.45) +
        `<label class="ly-cin"><span>Shadow colour</span><input type="color" id="lyShadowColor" value="${esc(/^#[0-9a-f]{6}$/i.test(sh.color || "") ? sh.color : "#000000")}"></label>` : "");
  }
  pop.onclick = (e) => {
    const id = state.sel;
    if (!id) return;
    const lk = e.target.closest("[data-look]"), fl = e.target.closest("[data-flip]");
    if (lk) { setLayerEffects(id, { look: lk.dataset.look }); fillFxPop(); }
    else if (fl) { const L = layerById(id); setLayerEffects(id, fl.dataset.flip === "x" ? { flipX: !L.image.flipX } : { flipY: !L.image.flipY }); fillFxPop(); }
    else if (e.target.closest("#lyFxReset")) { resetEffects(id); fillFxPop(); }
  };
  pop.oninput = (e) => {
    const r = e.target.closest("[data-fx]"), id = state.sel;
    if (!r || !id) return;
    const v = +r.value, k = r.dataset.fx, L = layerById(id);
    if (k === "sblur") setLayerEffects(id, { shadow: { blur: v } }, { live: true });
    else if (k === "sop") setLayerEffects(id, { shadow: { opacity: v } }, { live: true });
    else if (k === "sdist") { const a = Math.atan2(L.text.shadow?.y ?? 4, L.text.shadow?.x ?? 3); setLayerEffects(id, { shadow: { x: Math.round(Math.cos(a) * v * 10) / 10, y: Math.round(Math.sin(a) * v * 10) / 10 } }, { live: true }); }
    else setLayerEffects(id, { [k]: v }, { live: true });
  };
  pop.onchange = (e) => {
    const id = state.sel;
    if (!id) return;
    if (e.target.id === "lyShadowOn") { setLayerEffects(id, { shadow: e.target.checked ? {} : null }); fillFxPop(); return; }
    if (e.target.id === "lyShadowColor") { setLayerEffects(id, { shadow: { color: e.target.value } }); return; }
    fxSession = null; renderPage();
  };
}
function toggleFxPop(open) {
  const pop = fxPop(), btn = $("#lyEffects");
  if (open === false || (open == null && !pop.hidden)) { closeFxPop(); return; }
  if (!needSel()) return;
  if (selLayer()?.locked) { toast(LOCKED_MSG); return; }
  closeColorPop();
  fillFxPop();
  pop.hidden = false;
  btn?.setAttribute("aria-expanded", "true");
  const r = btn?.getBoundingClientRect?.();
  if (r) { pop.style.left = Math.max(8, Math.min(window.innerWidth - 288, r.left)) + "px"; pop.style.top = Math.round(r.bottom + 6) + "px"; }
}
function closeFxPop() { const pop = document.getElementById("lyFxPop"); if (pop) pop.hidden = true; document.getElementById("lyEffects")?.setAttribute("aria-expanded", "false"); }

/* samples (gallery.js): the pictures are drawn to PNG so Studio and the exports can use them as they are */
async function rasterize(src, w, h) {
  const img = await loadImg(src), c = BR.makeCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}
/** A sample picture that shows real library photos (/pdf-editor/photos/…): the photos go inside the SVG as data, since a
 * picture drawn from an SVG cannot load other files. */
const photoData = new Map();
async function inlinePhotos(src) {
  let svg = decodeURIComponent(src.slice(src.indexOf(",") + 1));
  const urls = [...new Set([...svg.matchAll(/href="(\/pdf-editor\/photos\/[^"]+)"/g)].map((m) => m[1]))];
  if (!urls.length) return src;
  for (const u of urls) {
    if (!photoData.has(u)) photoData.set(u, fetch(u).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); }).then((b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); })));
    try { const data = await photoData.get(u); svg = svg.split(`"${u}"`).join(`"${data}"`); } catch (e) { photoData.delete(u); throw e; }
  }
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
async function openTemplate(id) {
  if (state.busy) { toast("Please wait, the last file is still being split."); return false; }
  const G = await gallery();
  const page = G.design(id);
  if (!page) { toast("That sample was not found. Pick another one or open your own picture."); return false; }
  if (typeof Image === "function") await Promise.all(page.layers.map(async (l) => { if (l.type === "image" && /^data:image\/svg/.test(l.image.src)) { try { l.image.src = await rasterize(await inlinePhotos(l.image.src), l.w, l.h); } catch (e) { console.warn("sample picture kept as SVG", e); } } }));
  record(); // Undo goes back to what was open before (or the start screen)
  showDesign([page], { name: page.name || G.TEMPLATES.find((t) => t.id === id)?.name || "Sample design", kind: "template", template: page.id || id });
  return true;
}

/* text panel */
function renderTextPanel(el) { textPanelEl = el; refreshTextPanel(); }
function refreshTextPanel() {
  const el = textPanelEl;
  if (!el) return;
  el.replaceChildren();
  const mk = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else if (k === "class") n.className = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); } n.append(...kids.filter(Boolean)); return n; };
  const wrap = mk("div", { class: "ly-tpanel" });
  wrap.append(mk("h3", { class: "ads-h3", text: "Add text" }), mk("div", { class: "ly-addt" },
    mk("button", { type: "button", id: "addHeading", class: "h", onclick: () => addText("heading") }, "Add a heading"),
    mk("button", { type: "button", id: "addSubheading", class: "sh", onclick: () => addText("subheading") }, "Add a subheading"),
    mk("button", { type: "button", id: "addBody", class: "bd", onclick: () => addText("body") }, "Add a little bit of body text")));
  const page = cur(), texts = page ? page.layers.filter((l) => l.type === "text").reverse() : [];
  wrap.append(mk("h3", { class: "ads-h3", text: page ? `Text in this design (${texts.length})` : "Text in this design" }));
  if (!texts.length) wrap.append(mk("p", { class: "ads-muted", text: page ? "No text layers yet. Add one above." : "Open a sample, a picture or a PDF, or add text to start a blank design." }));
  for (const l of texts) {
    const ta = mk("textarea", { rows: String(Math.min(4, l.text.content.split("\n").length)), "aria-label": `Text of layer ${l.text.content.slice(0, 30)}`, "data-id": l.id });
    ta.value = l.text.content;
    ta.addEventListener("input", () => updateText(l, { content: ta.value }, "text:" + l.id));
    ta.addEventListener("focus", () => select(l.id));
    ta.addEventListener("blur", () => { session = null; });
    const size = mk("input", { type: "number", min: "6", max: "400", step: "1", "aria-label": "Font size", title: "Font size" });
    size.value = String(Math.round(l.text.size));
    size.addEventListener("change", () => updateText(l, { size: Math.max(6, Math.min(400, +size.value || l.text.size)) }));
    const color = mk("input", { type: "color", "aria-label": "Text colour", title: "Text colour" });
    color.value = /^#[0-9a-f]{6}$/i.test(l.text.color) ? l.text.color : "#000000";
    color.addEventListener("input", () => updateText(l, { color: color.value }, "color:" + l.id));
    color.addEventListener("change", () => { session = null; });
    const bold = mk("button", { type: "button", class: "btn small" + (l.text.bold ? " on" : ""), "aria-pressed": String(!!l.text.bold), title: "Bold", "aria-label": "Bold" }, "B");
    bold.addEventListener("click", () => { updateText(l, { bold: !l.text.bold }); bold.classList.toggle("on", l.text.bold); bold.setAttribute("aria-pressed", String(l.text.bold)); });
    const fam = mk("select", { "aria-label": "Font", title: "Font" });
    for (const [k, f] of Object.entries(BR.FONT_FAMILIES)) { const o = mk("option", { value: k }, f.label.split(" (")[0]); if (k === l.text.family) o.selected = true; fam.append(o); }
    fam.addEventListener("change", () => { updateText(l, { family: fam.value }); BR.ensureFont(fam.value, l.text.bold, l.text.italic).catch(() => {}); });
    // alignment inside the text box (left / centre / right)
    const al = mk("span", { class: "ly-align", role: "group", "aria-label": "Text alignment" });
    for (const [a, label] of [["left", "Left"], ["center", "Centre"], ["right", "Right"]]) {
      const on = (l.text.align || "left") === a;
      const b = mk("button", { type: "button", class: "btn small" + (on ? " on" : ""), "data-align": a, "aria-pressed": String(on), title: `Align ${label.toLowerCase()}`, "aria-label": `Align ${label.toLowerCase()}`, html: ALIGN_ICON[a] });
      b.addEventListener("click", () => { updateText(l, { align: a }); for (const x of al.children) { const o = x.dataset.align === a; x.classList.toggle("on", o); x.setAttribute("aria-pressed", String(o)); } });
      al.append(b);
    }
    wrap.append(mk("div", { class: "ly-tedit" + (l.id === state.sel ? " picked" : ""), "data-id": l.id }, ta, mk("div", { class: "ly-trow" }, fam, size, color, bold, al)));
  }
  el.append(wrap);
}
const ALIGN_ICON = {
  left: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 6h16M4 10h10M4 14h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  center: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 6h16M7 10h10M4 14h16M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 6h16M10 10h10M4 14h16M10 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
/** Change a text layer. key = live-edit session (typing, colour picking): one undo step per session; none = one step. */
function updateText(l, patch, key = null) {
  if (!key || session !== key) { record(); session = key; }
  Object.assign(l.text, patch);
  if (patch.content != null) { l.name = l.text.content.trim().slice(0, 24) || "Text"; l.h = Math.round(l.text.size * (l.text.lineHeight || LINE_HEIGHT) * l.text.content.split("\n").length * 100) / 100; }
  if (patch.size != null) l.h = Math.round(l.text.size * (l.text.lineHeight || LINE_HEIGHT) * l.text.content.split("\n").length * 100) / 100;
  const el = document.querySelector(`.sheet [data-id="${CSS.escape(l.id)}"]`);
  if (el) {
    el.textContent = l.text.content;
    Object.assign(el.style, { fontFamily: BR.FONT_FAMILIES[l.text.family]?.css || "sans-serif", fontSize: l.text.size + "px", fontWeight: l.text.bold ? "700" : "400", color: l.text.color, height: l.h + "px", textAlign: l.text.align && l.text.align !== "left" ? l.text.align : "" });
    placeSel();
  }
  const b = document.querySelector(`#layerList li[data-id="${CSS.escape(l.id)}"] .nm b`);
  if (b) b.textContent = l.text.content;
}

/* export: PNG / JPG from a canvas, SVG with the pictures inside */
async function renderCanvas(index = state.current, { scale = 1, background = null } = {}) {
  const page = state.pages[index];
  if (!page) throw new Error("There is nothing to download yet. Open a picture, a PDF or a sample first.");
  const c = BR.makeCanvas(Math.max(1, Math.round(page.w * scale)), Math.max(1, Math.round(page.h * scale))), x = c.getContext("2d");
  if (background) { x.fillStyle = background; x.fillRect(0, 0, c.width, c.height); }
  x.scale(scale, scale);
  for (const l of page.layers) {
    if (state.off.has(l.id) || l.hidden) continue;
    x.save();
    x.globalAlpha = l.opacity ?? 1;
    if (l.rotation) { const cx = l.x + l.w / 2, cy = l.y + l.h / 2; x.translate(cx, cy); x.rotate((l.rotation * Math.PI) / 180); x.translate(-cx, -cy); }
    if (l.type === "image") {
      const im = l.image, f = filterCss(im.filters);
      if (f !== "none" && "filter" in x) x.filter = f.replace(/blur\(([\d.]+)px\)/, (_, b) => `blur(${+b * scale}px)`);
      if (im.flipX || im.flipY) { x.translate(l.x + (im.flipX ? l.w : 0), l.y + (im.flipY ? l.h : 0)); x.scale(im.flipX ? -1 : 1, im.flipY ? -1 : 1); x.translate(-l.x, -l.y); }
      try { x.drawImage(await loadImg(im.src), l.x, l.y, l.w, l.h); } catch (e) { console.warn("picture layer skipped", e); }
    } else if (l.type === "text") {
      const t = l.text, lh = t.size * (t.lineHeight || LINE_HEIGHT);
      await BR.ensureFont(t.family, t.bold, t.italic).catch(() => {});
      x.font = `${t.italic ? "italic " : ""}${t.bold ? 700 : 400} ${t.size}px ${BR.FONT_FAMILIES[t.family]?.css || "sans-serif"}`;
      if (textShadowCss(t.shadow)) {
        const sh = t.shadow, c = hexToRgb(sh.color) || [0, 0, 0];
        x.shadowColor = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${sh.opacity ?? 0.5})`; x.shadowOffsetX = (sh.x || 0) * scale; x.shadowOffsetY = (sh.y || 0) * scale; x.shadowBlur = (sh.blur || 0) * scale;
      }
      x.fillStyle = t.color; x.textBaseline = "alphabetic";
      x.textAlign = t.align === "center" ? "center" : t.align === "right" ? "right" : "left";
      const tx = t.align === "center" ? l.x + l.w / 2 : t.align === "right" ? l.x + l.w : l.x;
      const off = baselineOffset(t.size, t.family, t.lineHeight || LINE_HEIGHT);
      t.content.split("\n").forEach((line, i) => x.fillText(line, tx, l.y + off + i * lh));
    }
    x.restore();
  }
  return c;
}
function svgOf(index = state.current) {
  const page = state.pages[index];
  if (!page) throw new Error("There is nothing to download yet. Open a picture, a PDF or a sample first.");
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.w}" height="${page.h}" viewBox="0 0 ${page.w} ${page.h}">`];
  for (const l of page.layers) {
    if (state.off.has(l.id) || l.hidden) continue;
    const op = (l.opacity ?? 1) < 1 ? ` opacity="${l.opacity}"` : "";
    const fx = l.type === "image" ? l.image : {}, flip = fx.flipX || fx.flipY ? ` translate(${l.x + (fx.flipX ? l.w : 0)} ${l.y + (fx.flipY ? l.h : 0)}) scale(${fx.flipX ? -1 : 1} ${fx.flipY ? -1 : 1}) translate(${-l.x} ${-l.y})` : "";
    const tr = l.rotation || flip ? ` transform="${l.rotation ? `rotate(${l.rotation} ${l.x + l.w / 2} ${l.y + l.h / 2})` : ""}${flip}"` : "";
    const css = l.type === "image" ? filterCss(fx.filters) : "none", ts = l.type === "text" ? textShadowCss(l.text.shadow) : "";
    const style = css !== "none" ? ` style="filter:${css}"` : ts ? ` style="filter:drop-shadow(${ts})"` : "";
    if (l.type === "image") out.push(`<image x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" preserveAspectRatio="none" href="${esc(l.image.src)}" xlink:href="${esc(l.image.src)}"${tr}${op}${style}/>`);
    else if (l.type === "text") {
      const t = l.text, lh = t.size * (t.lineHeight || LINE_HEIGHT), off = baselineOffset(t.size, t.family, t.lineHeight || LINE_HEIGHT);
      const tx = t.align === "center" ? l.x + l.w / 2 : t.align === "right" ? l.x + l.w : l.x, anchor = t.align === "center" ? "middle" : t.align === "right" ? "end" : "start";
      const spans = t.content.split("\n").map((line, i) => `<tspan x="${tx}" y="${(l.y + off + i * lh).toFixed(2)}">${esc(line)}</tspan>`).join("");
      out.push(`<text font-family="${esc(BR.FONT_FAMILIES[t.family]?.css || "sans-serif")}" font-size="${t.size}" font-weight="${t.bold ? 700 : 400}"${t.italic ? ' font-style="italic"' : ""} fill="${esc(t.color)}" text-anchor="${anchor}" xml:space="preserve"${tr}${op}${style}>${spans}</text>`);
    }
  }
  out.push("</svg>");
  return out.join("");
}
function saveBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
async function download(fmt = "png") {
  if (!state.done || !cur()) { toast("There is nothing to download yet. Open a picture, a PDF or a sample first."); return null; }
  const base = slug(state.name) + (state.pages.length > 1 ? `-page-${state.current + 1}` : "");
  try {
    let blob;
    if (fmt === "svg") blob = new Blob([svgOf()], { type: "image/svg+xml" });
    else {
      const c = await renderCanvas(state.current, { background: fmt === "jpg" ? "#ffffff" : null });
      blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("The picture could not be made."))), fmt === "jpg" ? "image/jpeg" : "image/png", 0.92));
    }
    const name = `${base}.${fmt}`;
    saveBlob(blob, name);
    toast(`Downloaded ${name}`);
    return { name, size: blob.size, type: blob.type };
  } catch (e) {
    console.error(e);
    toast(e.message || "The download could not be made.");
    return null;
  }
}

/* projects (shared/store.js, through the editor frame) */
async function projectThumb() {
  const page = cur(); if (!page) return "";
  try { return (await renderCanvas(state.current, { scale: 240 / Math.max(page.w, page.h), background: "#ffffff" })).toDataURL("image/jpeg", 0.8); } catch { return ""; }
}
async function saveProjectData() {
  if (!state.done || !cur()) throw new Error("Open a picture, a PDF or a sample first, then save it.");
  return { name: state.name || "Magic Layers", data: { v: 1, name: state.name, pages: state.pages, off: [...state.off], template: state.template }, thumb: await projectThumb() };
}
async function openProjectRec(rec) {
  const p = rec?.data ? rec : await getProject(rec?.id);
  if (!p?.data?.pages?.length) throw new Error("This saved design is empty.");
  record();
  showDesign(p.data.pages, { name: p.name || p.data.name || "Magic Layers", kind: "project", template: p.data.template || null });
  state.off = new Set(p.data.off || []);
  renderPage();
}

/* the Canva-like editor frame (shared/editor-shell.js); without it the page keeps its own header */
async function mountFrame() {
  if (/jsdom/i.test(navigator.userAgent || "")) return null;
  let mod;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("The editor frame could not load", e); return null; }
  if (typeof mod?.mountShell !== "function") return null;
  const bar = $("#lyBar"), head = document.querySelector("header.ad-bar");
  const newBtn = $("#newBtn"), studio = $("#openStudio");
  bar.prepend(newBtn); $("#lyOpen").after(studio); bar.hidden = false;
  const empty = document.createElement("p");
  empty.id = "layersEmpty"; empty.className = "ads-muted";
  empty.textContent = "Open a picture, a PDF or a sample design to see its layers here.";
  empty.hidden = state.done;
  try {
    shell = mod.mountShell({
      app: "layers", kind: "Magic layers", title: state.name || "Untitled design", home: "/tools/magic-layers",
      onTitle: (t) => { state.name = String(t || "").trim().slice(0, 120) || "Magic Layers"; $("#fileName").textContent = state.name; },
      stage: $("main"), toolbar: bar, formulaBar: null, resize: null,
      file: [
        { label: "New design", act: () => { reset(); shell?.setTitle?.(""); } },
        { label: "Open a picture or PDF…", act: () => $("#fileInput").click() },
        { label: "Blank design", act: () => { if (!state.done) ensureDesign(); else toast("A design is already open. Use New design first."); } },
        { label: "Open in Studio", act: () => (state.done ? openInStudio() : toast("Open a picture, a PDF or a sample first.")) },
        { label: "Download PNG", group: "Download", act: () => download("png") },
        { label: "Download JPG", group: "Download", act: () => download("jpg") },
        { label: "Download SVG", group: "Download", act: () => download("svg") },
        { label: "Undo", group: "Edit", act: () => undo() },
        { label: "Redo", group: "Edit", act: () => redo() },
        { label: "Duplicate layer", group: "Edit", act: () => duplicateLayer(state.sel) },
        { label: "Lock or unlock layer", group: "Edit", act: () => lockLayer(state.sel) },
        { label: "Delete layer", group: "Edit", act: () => deleteLayer(state.sel) },
        { label: "Show all layers", group: "Layers", act: () => $("#allOn").click() },
        { label: "Fit to screen", group: "View", act: () => setZoom(null) },
      ],
      share: { download: [{ label: "PNG", act: () => download("png") }, { label: "JPG", act: () => download("jpg") }, { label: "SVG", act: () => download("svg") }], link: () => (state.template ? `${location.origin}${location.pathname}?template=${state.template}` : location.href) },
      templates: { gallery: () => gallery(), tool: "magic-layers", apply: async (id) => { await openTemplate(id); }, placeholder: "Search sample designs" },
      panels: {
        layers: { label: "Layers", icon: "pages", render: (el) => { el.append(empty, $("#layersPanel")); } },
        text: { label: "Text", icon: "text", render: (el) => renderTextPanel(el) },
      },
      rail: ["templates", "layers", "text", "uploads", "projects", "apps"],
      onPanel: (id) => { openPanelId = id; if (id === "text") refreshTextPanel(); },
      insert: {
        image: (src, name) => insertImage(src, name),
        text: (str, style) => addText(style === "heading" || style === "h1" ? "heading" : style === "subheading" || style === "h2" ? "subheading" : "body", str),
        color: (hex) => setSelColor(hex),
        font: (family) => setSelFont(family),
      },
      projects: { save: saveProjectData, open: openProjectRec },
      bottom: {
        notes: true, outline: null, timer: true, fullscreen: true, help: true,
        pages: { count: () => Math.max(1, state.pages.length), current: () => state.current, go: (i) => { if (state.pages[i]) { state.current = i; state.sel = null; renderResult(); } } },
        zoom: { get: () => Math.round((state.pages[state.current] ? state.scale || 1 : state.zoom || 1) * 100), set: (pct) => setZoom(pct), min: 5, max: 400 },
      },
      setMode: (m) => { state.mode = m; if (m !== "edit") select(null); },
      shortcuts: [["Drag", "Move a layer; drag a corner to resize (Shift: free resize for pictures)"], ["Arrow keys", "Nudge the selected layer 1 px (Shift: 10 px)"], ["Ctrl + D", "Duplicate the selected layer"], ["Delete", "Delete the selected layer"], ["Escape", "Clear the selection"]],
    });
    shell.panel?.("layers"); // move the layer list into its panel now (it stays there)
    document.body.classList.add("has-shell");
    window.addEventListener("resize", () => state.done && fitStage());
    return shell;
  } catch (e) {
    console.error("The editor frame could not start", e);
    shell = null;
    head?.insertBefore(newBtn, studio && head.contains(studio) ? studio : null);
    head?.append(studio);
    bar.hidden = true;
    return null;
  }
}

async function boot() {
  await mountFrame();
  // the photo editor's "Grab text" hands its photo over: split it straight away (its text becomes editable text layers)
  const hid = new URLSearchParams(location.search).get("handoff");
  if (hid) {
    const p = await takeHandoff(hid).catch(() => null);
    history.replaceState(null, "", location.pathname);
    if (p?.type === "image" && p.blob) { window.adApp.ready = true; document.body.classList.add("ready"); await run(new File([p.blob], p.name || "photo.png", { type: p.blob.type || "image/png" })); return; }
    toast("That picture is no longer waiting here. Open it again, or choose a file.");
  }
  const tpl = new URLSearchParams(location.search).get("template");
  if (tpl) { try { await openTemplate(tpl); } catch (e) { console.error(e); toast("That sample could not open."); } }
  window.adApp.ready = true;
  document.body.classList.add("ready");
}

init();
window.adApp = {
  state, run, toggleLayer, openInStudio, render: renderResult,
  buildDesign: design,
  setOption: (k, v) => { state.options[k] = !!v; const cb = document.querySelector(`#opts input[name=${k}]`); if (cb) cb.checked = !!v; syncOptions(); },
  layers: (page = 0) => state.pages[page]?.layers || [],
  openTemplate, addText, addImage, select, moveLayer, deleteLayer, download, setZoom, svgOf,
  undo, redo, duplicateLayer, lockLayer, setOpacity, moveBy, resizeLayer, nudge, textPanel: (el) => renderTextPanel(el),
  recolorLayer, resetLayerColor, replaceLayerImage, startReplace, openColorPop: () => toggleColorPop(true),
  setLayerEffects, resetEffects, openEffects: () => toggleFxPop(true),
  get history() { return { past: hist.past.length, future: hist.future.length }; },
  layerRect: (id) => { const el = document.querySelector(`.sheet [data-id="${CSS.escape(id)}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
  renderPng: async (opts) => (await renderCanvas(state.current, opts || {})).toDataURL("image/png"),
  get shell() { return shell; },
  get zoom() { return Math.round((state.scale || 1) * 100); },
};
boot();
