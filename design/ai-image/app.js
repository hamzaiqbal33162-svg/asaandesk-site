// AI image generator and AI art generator (/design/ai-image/?tool=image|art).
// Pictures come only from AsaanDesk AI through onlineAi('/ai/image', …) when it is switched on (aiReady()).
// Until then the page shows an honest "coming soon" panel and points to the tools that already work.
import { TOOLS, STYLES, ASPECTS, MAX_PROMPT, MAX_COUNT, buildRequest, parseResult, fileNameFor, aspectById } from "./gen.js";
import { aiReady } from "../shared/config.js";
import { onlineAi, comingSoon } from "../shared/ai.js";
import { saveProject, listProjects, deleteProject, putHandoff } from "../shared/store.js";

const $ = (s, el = document) => el.querySelector(s);
const params = new URLSearchParams(location.search);
const state = { tool: TOOLS[params.get("tool")] ? params.get("tool") : "image", prompt: "", negative: "", style: null, aspect: "1:1", count: 1, busy: false, lastRequest: null, lastError: null };
state.style = TOOLS[state.tool].defaultStyle;
const urls = new Map(); // project id -> object URL for its picture

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
let toastTimer = null;
function toast(msg, ms = 3500) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); }

/* ---------- form ---------- */
function renderTool() {
  const t = TOOLS[state.tool];
  document.title = `${t.title} · AsaanDesk Design`;
  $("#appName").textContent = t.title;
  $("#title").textContent = t.title;
  $("#lead").textContent = t.lead;
  for (const b of document.querySelectorAll("#toolTabs button")) { const on = b.dataset.tool === state.tool; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); }
  $("#prompt").placeholder = state.tool === "art" ? "For example: a peacock made of mirror work, on a deep blue wall" : "For example: a cup of chai on a wooden table by a rainy window";
}
function renderStyles() {
  const box = $("#styles");
  box.innerHTML = "";
  const order = state.tool === "art" ? ["watercolour", "truck-art", "pencil", "anime", "minimal", "3d", "photo"] : STYLES.map((s) => s.id);
  for (const id of order) {
    const s = STYLES.find((x) => x.id === id);
    box.append(h("button", { class: "style" + (state.style === s.id ? " on" : ""), "data-style": s.id, "aria-pressed": String(state.style === s.id), title: s.hint,
      onclick: () => { state.style = s.id; renderStyles(); } }, h("span", { class: "swatch s-" + s.id, "aria-hidden": "true" }), h("span", {}, s.name)));
  }
}
function renderAspects() {
  const box = $("#aspects");
  box.innerHTML = "";
  for (const a of ASPECTS) {
    const r = a.w / a.h, w = r >= 1 ? 22 : Math.round(22 * r), hh = r >= 1 ? Math.round(22 / r) : 22;
    box.append(h("button", { class: "aspect" + (state.aspect === a.id ? " on" : ""), "data-aspect": a.id, "aria-pressed": String(state.aspect === a.id), "aria-label": `${a.label} ${a.id}`,
      onclick: () => { state.aspect = a.id; renderAspects(); } }, h("i", { style: `width:${w}px;height:${hh}px`, "aria-hidden": "true" }), h("span", {}, a.label), h("small", {}, a.id)));
  }
}
function renderCount() {
  const box = $("#count");
  box.innerHTML = "";
  for (let n = 1; n <= MAX_COUNT; n++) box.append(h("button", { class: state.count === n ? "on" : "", "data-count": n, "aria-pressed": String(state.count === n), onclick: () => { state.count = n; renderCount(); renderReady(); } }, String(n)));
}
function renderReady() {
  const ready = aiReady();
  const soon = $("#soon");
  soon.hidden = ready;
  if (!ready) {
    comingSoon(soon, { title: `${TOOLS[state.tool].title} is coming soon`,
      what: "AsaanDesk AI will turn your words into pictures here. It is not switched on yet, so nothing you type is sent anywhere and no pictures are made up.",
      offline: "Make something now with the tools that already work:" });
    soon.querySelector(".ad-soon").append(h("div", { class: "soon-links" },
      h("a", { class: "btn", href: "/design/studio/" }, "Studio templates"),
      h("a", { class: "btn", href: "/design/draw/" }, "Draw"),
      h("a", { class: "btn", href: "/design/photo/" }, "Photo editor"),
      h("a", { class: "btn", href: "/design/photo/?mode=bg" }, "Background remover")));
  }
  const go = $("#generate");
  go.disabled = !ready || state.busy;
  go.textContent = state.busy ? "Making…" : ready ? `Generate ${state.count > 1 ? state.count + " pictures" : ""}`.trim() : "Generate (coming soon)";
}

/* ---------- generating ---------- */
async function generate() {
  if (state.busy) return;
  state.lastError = null;
  let body;
  try { body = buildRequest({ prompt: $("#prompt").value, negative: $("#negative").value, style: state.style, aspect: state.aspect, count: state.count, tool: state.tool }); }
  catch (e) { toast(e.message); $("#prompt").focus(); return; }
  if (!aiReady()) { renderReady(); $("#soon").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  state.busy = true;
  state.lastRequest = body;
  renderReady();
  const pending = h("div", { class: "pending", role: "status", "aria-live": "polite" },
    ...Array.from({ length: body.count }, () => h("div", { class: "ph", style: `aspect-ratio:${aspectById(body.aspect).w}/${aspectById(body.aspect).h}` }, h("div", { class: "spinner" }))),
    h("p", {}, "AsaanDesk AI is making your picture…"));
  $("#results").prepend(pending);
  try {
    const data = await onlineAi("/ai/image", body, TOOLS[state.tool].title);
    const srcs = parseResult(data, body.count);
    for (const [i, src] of srcs.entries()) await keep(src, body, i);
    toast(srcs.length > 1 ? `${srcs.length} pictures made and saved below.` : "Picture made and saved below.");
  } catch (e) {
    console.error(e);
    state.lastError = e.message;
    toast(e.message || "AsaanDesk AI could not make the picture. Please try again.", 5000);
  } finally {
    pending.remove();
    state.busy = false;
    renderReady();
    await renderGallery();
  }
}
async function keep(src, body, i) {
  let blob = null;
  try { blob = await (await fetch(src)).blob(); } catch { /* keep the address only */ }
  const thumb = blob ? await thumbOf(blob) : null;
  return saveProject({ app: "ai-image", name: body.prompt.slice(0, 80), data: { ...body, index: i, blob, src: blob ? null : src, created: Date.now() }, thumb });
}
async function thumbOf(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } catch { return null; }
}

/* ---------- gallery ---------- */
const srcOf = (p) => { if (p.data.blob) { if (!urls.has(p.id)) urls.set(p.id, URL.createObjectURL(p.data.blob)); return urls.get(p.id); } return p.data.src || p.thumb; };
async function blobOf(p) { return p.data.blob || (await (await fetch(p.data.src)).blob()); }
function download(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
async function sizeOf(blob) { try { const b = await createImageBitmap(blob); const r = { w: b.width, h: b.height }; b.close?.(); return r; } catch { return null; } }
async function toStudio(p) {
  try {
    const blob = await blobOf(p);
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    const sz = (await sizeOf(blob)) || { w: p.data.width, h: p.data.height };
    const design = { version: 1, name: p.name || "AI picture", preset: { id: "custom", label: "Custom size", w: sz.w, h: sz.h, unit: "px", dpi: 96, bleed: 0 },
      pages: [{ id: "p" + p.id, background: { color: "#ffffff" }, layers: [{ id: "l" + p.id, type: "image", name: "AI picture", x: 0, y: 0, w: sz.w, h: sz.h, rotation: 0, opacity: 1, locked: false, hidden: false, animation: null,
        image: { src: dataUrl, crop: { x: 0, y: 0, w: 1, h: 1 }, filters: { brightness: 1, contrast: 1, saturate: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0 }, radius: 0, flipX: false, flipY: false, nw: sz.w, nh: sz.h } }] }] };
    const id = await putHandoff({ type: "design", design });
    location.href = "/design/studio/?handoff=" + id;
  } catch (e) { toast(e.message || "Could not open Studio."); }
}
async function toPhoto(p) {
  try {
    const blob = await blobOf(p);
    const id = await putHandoff({ type: "image", blob, name: fileNameFor(p.name, p.data.index, (blob.type.split("/")[1] || "png").replace("jpeg", "jpg")) });
    location.href = "/design/photo/?handoff=" + id;
  } catch (e) { toast(e.message || "Could not open the photo editor."); }
}
async function renderGallery() {
  const box = $("#gallery");
  const list = await listProjects("ai-image").catch(() => []);
  box.innerHTML = "";
  $("#galleryHead").hidden = !list.length;
  for (const p of list) {
    const style = STYLES.find((s) => s.id === p.data.style);
    box.append(h("figure", { class: "card", "data-id": p.id },
      h("img", { src: srcOf(p), alt: p.name, loading: "lazy" }),
      h("figcaption", {}, h("span", { class: "cap" }, p.name), h("span", { class: "meta" }, [style?.name, p.data.aspect].filter(Boolean).join(" · "))),
      h("div", { class: "actions" },
        h("button", { class: "btn", onclick: async () => { try { const b = await blobOf(p); download(b, fileNameFor(p.name, p.data.index, (b.type.split("/")[1] || "png").replace("jpeg", "jpg"))); } catch (e) { toast("Could not download this picture."); } } }, "Download"),
        h("button", { class: "btn", onclick: () => toPhoto(p) }, "Edit photo"),
        h("button", { class: "btn", onclick: () => toStudio(p) }, "Use in a design"),
        h("button", { class: "btn del", "aria-label": "Delete this picture", onclick: async () => { await deleteProject(p.id); URL.revokeObjectURL(urls.get(p.id) || ""); urls.delete(p.id); renderGallery(); } }, "Delete"))));
  }
}

/* ---------- boot ---------- */
function bind() {
  for (const b of document.querySelectorAll("#toolTabs button")) b.addEventListener("click", () => {
    state.tool = b.dataset.tool;
    state.style = TOOLS[state.tool].defaultStyle;
    history.replaceState(null, "", "?tool=" + state.tool);
    renderTool(); renderStyles(); renderReady();
  });
  const p = $("#prompt");
  p.maxLength = MAX_PROMPT;
  p.addEventListener("input", () => { $("#promptCount").textContent = `${p.value.length}/${MAX_PROMPT}`; });
  p.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generate(); } });
  $("#generate").addEventListener("click", generate);
  for (const ex of document.querySelectorAll("[data-example]")) ex.addEventListener("click", () => { p.value = ex.dataset.example; p.dispatchEvent(new Event("input")); p.focus(); });
}
window.adApp = {
  get state() { return { tool: state.tool, style: state.style, aspect: state.aspect, count: state.count, busy: state.busy, aiReady: aiReady(), lastRequest: state.lastRequest, lastError: state.lastError }; },
  generate,
  gallery: () => listProjects("ai-image"),
  buildRequest,
  ready: null,
};
window.adApp.ready = (async () => {
  bind();
  renderTool(); renderStyles(); renderAspects(); renderCount(); renderReady();
  await renderGallery();
})();
