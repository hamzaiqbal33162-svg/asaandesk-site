// The design canvas: renders the current page as DOM (one inline SVG per layer), and handles selection,
// moving, resizing, rotating with snapping guides, inline text editing, photo crop, clipboard, zoom and pan.
import { S, on, emit, commit, curPage, pageSize, layerById, selLayers, single, toast, h } from "./state.js";
import { layerContent, backgroundMarkup, esc } from "./svg.js";
import { cssFilter, coverCrop } from "./shapes.js";
import { textHeight, CSS_FAMILY, textPad } from "./textlayout.js";
import { fitTextBox } from "./textfx.js";
import { aabb, unionBox, intersects, snapTargets, snapBox, snapValue, snapAngle, resizeBox, scaleLayer, makeGroup, ungroup, alignLayers, distributeLayers, rotate, HANDLES, refitGroup, fitView, viewAfterResize } from "./geometry.js";
import { bleedPx, toPx } from "./presets.js";
import { withNewIds, newId, imageLayer, newPage, duplicatePage, clone } from "./model.js";
import { swapFrames } from "./collage.js";
import { ensureFont } from "../shared/brand.js";
import { animState, pageDuration as animEnd, withClicks } from "./animate.js";

let viewport, world, pageEl, guidesEl, overlay, bgEl;
const els = new Map(); // layer id -> { el, sig }
// Locks (Canva): a locked page fixes everything on it; "Lock position only" still lets the text or photo change.
const pageLocked = () => !!(S.design && curPage()?.locked);
export const fixed = (l) => !!l?.locked || pageLocked();
export const canType = (l) => !pageLocked() && (!l.locked || l.lockMode === "position");
/** Curved text gets the arc box, other text the height its lines need. */
export const fitText = (l) => fitTextBox(l);

/* ---------------- image display URLs (blob: links, so big photos are not copied into the DOM) ---------------- */
const blobUrls = new Map();
export function urlOf(src) {
  if (!src || !src.startsWith("data:") || src.length < 4096) return src;
  let u = blobUrls.get(src);
  if (!u) {
    try {
      const i = src.indexOf(","), mime = src.slice(5, src.indexOf(";")) || "image/png";
      const bin = atob(src.slice(i + 1)), arr = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
      u = URL.createObjectURL(new Blob([arr], { type: mime }));
    } catch { u = src; }
    blobUrls.set(src, u);
  }
  return u;
}
S.env.urlOf = urlOf;

/* ---------------- coordinates ---------------- */
export const toScreen = (x, y) => [S.panX + x * S.zoom, S.panY + y * S.zoom];
export function toPage(clientX, clientY) { const r = viewport.getBoundingClientRect(); return [(clientX - r.left - S.panX) / S.zoom, (clientY - r.top - S.panY) / S.zoom]; }
export function clientBox(l) { const r = viewport.getBoundingClientRect(); const b = aabb(l); return { x: r.left + S.panX + b.x * S.zoom, y: r.top + S.panY + b.y * S.zoom, w: b.w * S.zoom, h: b.h * S.zoom }; }

/* ---------------- setup ---------------- */
export function initStage(root) {
  viewport = root.querySelector("#viewport");
  world = h("div.st-world");
  pageEl = h("div.st-page", { role: "img", "aria-label": "Design page" });
  bgEl = h("div.st-bg");
  guidesEl = h("div.st-guides");
  pageEl.append(bgEl);
  world.append(pageEl, guidesEl);
  overlay = h("div.st-overlay");
  viewport.append(world, overlay);
  viewport.addEventListener("pointerdown", onDown);
  guidesEl.addEventListener("pointerdown", onGuideDown);
  viewport.addEventListener("pointermove", onHover);
  viewport.addEventListener("dblclick", onDbl);
  // Right-click menu (Canva: copy, paste, lock, layers, link, download selection …).
  viewport.addEventListener("contextmenu", (e) => { if (!S.design || typing()) return; e.preventDefault(); const l = topLayerAt(e.target); if (l && !S.sel.includes(l.id)) select([l.id]); else if (!l) select([]); emit("context-menu", e.clientX, e.clientY); });
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("dragover", (e) => { e.preventDefault(); viewport.classList.add("drop"); });
  viewport.addEventListener("dragleave", () => viewport.classList.remove("drop"));
  viewport.addEventListener("drop", onDrop);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  // The canvas area changes size not only with the window: opening or closing a side panel and the page bar
  // filling in do it too. Without this the page kept its old place and its right part (with the resize
  // handles) ended up under the properties panel.
  window.addEventListener("resize", syncViewport);
  if (typeof ResizeObserver === "function") new ResizeObserver(() => syncViewport()).observe(viewport);
  on("panel", syncViewport);
  document.addEventListener("keydown", onKey);
  document.addEventListener("paste", onPaste);
  document.addEventListener("copy", onCopy);
  document.addEventListener("cut", (e) => { if (!typing() && S.sel.length) { onCopy(e); deleteSel(); } });
  on("render", () => {});
  on("renumbered", (ids) => { if (!S.design) return; for (const l of curPage().layers) if (ids.includes(l.id)) { const rec = els.get(l.id); if (rec) { rec.sig = null; layerEl(l); } } renderOverlay(); });
}

/* ---------------- rendering ---------------- */
const sigOf = (l) => JSON.stringify(l, (k, v) => (k === "x" || k === "y" || k === "rotation" || k === "opacity" || k === "name" || k === "locked" || k === "animation" ? undefined : typeof v === "string" && v.length > 300 ? v.length + v.slice(-40) : v));
function layerEl(l) {
  let rec = els.get(l.id);
  if (!rec) { rec = { el: h("div.st-layer", { "data-id": l.id }), sig: null }; els.set(l.id, rec); }
  const el = rec.el;
  el.dataset.type = l.type;
  el.classList.toggle("locked", !!l.locked);
  el.hidden = !!l.hidden;
  place(el, l);
  const sig = sigOf(l);
  if (sig !== rec.sig && !(S.editing === l.id && el.querySelector(".st-edit"))) {
    rec.sig = sig;
    if (l.type === "text") ensureFont(l.text.family, l.text.bold, l.text.italic);
    el.innerHTML = `<svg class="st-svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}" overflow="visible" aria-hidden="true">${layerContent(l, S.env)}</svg>`;
    el.style.filter = l.type === "image" ? cssFilter(l.image.filters) : "";
  }
  if (l.type === "text") el.setAttribute("aria-label", "Text: " + l.text.content.slice(0, 60));
  else el.setAttribute("aria-label", l.name || l.type);
  return el;
}
function place(el, l) {
  el.style.left = l.x + "px"; el.style.top = l.y + "px"; el.style.width = l.w + "px"; el.style.height = l.h + "px";
  el.style.transform = l.rotation ? `rotate(${l.rotation}deg)` : "";
  el.style.opacity = l.opacity < 1 ? l.opacity : "";
  const svg = el.firstElementChild;
  if (svg && svg.tagName === "svg" && (+svg.getAttribute("width") !== l.w || +svg.getAttribute("height") !== l.h)) els.get(l.id).sig = null;
}

export function renderPage() {
  if (!S.design) return;
  const pg = curPage(), { w, h: H } = pageSize();
  pageEl.style.width = w + "px"; pageEl.style.height = H + "px";
  pageEl.classList.toggle("transparent", pg.background?.color === "none" && !pg.background.gradient && !pg.background.image);
  const bgKey = JSON.stringify(pg.background, (k, v) => (typeof v === "string" && v.length > 300 ? v.length + v.slice(-30) : v)) + w + "x" + H;
  if (bgEl.dataset.key !== bgKey) { bgEl.dataset.key = bgKey; bgEl.innerHTML = `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">${backgroundMarkup(pg.background, w, H, { idp: "edbg", urlOf })}</svg>`; }
  const keep = new Set();
  let prev = bgEl;
  for (const l of pg.layers) {
    const el = layerEl(l);
    keep.add(l.id);
    if (prev.nextSibling !== el) prev.after(el);
    prev = el;
  }
  for (const [id, rec] of els) if (!keep.has(id)) { rec.el.remove(); els.delete(id); }
  renderGuides();
}
function renderGuides() {
  const P = S.design.preset, { w, h: H } = pageSize(), b = bleedPx(P);
  let m = "";
  if (S.showGuides !== false) {
    if (b > 0) m += `<rect x="${-b}" y="${-b}" width="${w + 2 * b}" height="${H + 2 * b}" fill="none" stroke="#f43f5e" stroke-width="${1 / S.zoom}" stroke-dasharray="${4 / S.zoom} ${3 / S.zoom}"/>`;
    for (const g of P.guides || []) {
      if (g.type === "fold") m += g.axis === "x" ? `<line x1="${w * g.at}" y1="0" x2="${w * g.at}" y2="${H}" stroke="#14b8a6" stroke-width="${1.2 / S.zoom}" stroke-dasharray="${6 / S.zoom} ${4 / S.zoom}"/>` : `<line x1="0" y1="${H * g.at}" x2="${w}" y2="${H * g.at}" stroke="#14b8a6" stroke-width="${1.2 / S.zoom}" stroke-dasharray="${6 / S.zoom} ${4 / S.zoom}"/>`;
      if (g.type === "cut") { const r = toPx(g.radius || 0, P.unit); m += g.shape === "circle" ? `<ellipse cx="${w / 2}" cy="${H / 2}" rx="${w / 2}" ry="${H / 2}" fill="none" stroke="#f59e0b" stroke-width="${1.5 / S.zoom}" stroke-dasharray="${5 / S.zoom} ${3 / S.zoom}"/>` : `<rect x="0" y="0" width="${w}" height="${H}" rx="${r}" fill="none" stroke="#f59e0b" stroke-width="${1.5 / S.zoom}" stroke-dasharray="${5 / S.zoom} ${3 / S.zoom}"/>`; }
      if (g.type === "safe" && g.w) m += `<rect x="${(w - g.w) / 2}" y="${(H - g.h) / 2}" width="${g.w}" height="${g.h}" fill="none" stroke="#2f80ff" stroke-width="${1 / S.zoom}" stroke-dasharray="${6 / S.zoom} ${4 / S.zoom}"/>`;
    }
  }
  // Rulers and guides (File › Rulers and guides): margins, danger zone, rulers and the person's own guide lines.
  const v = S.design.view;
  if (v) {
    const sm = P.unit === "px" ? Math.round(Math.min(w, H) * 0.03) : toPx(0.125, "in"), z = S.zoom;
    if (v.danger) m += `<path data-guide="danger" d="M0 0H${w}V${H}H0Z M${sm} ${sm}V${H - sm}H${w - sm}V${sm}Z" fill="#f43f5e" fill-opacity=".14" fill-rule="evenodd"/>`;
    if (v.margins) m += `<rect data-guide="margins" x="${sm}" y="${sm}" width="${w - 2 * sm}" height="${H - 2 * sm}" fill="none" stroke="#a64bf4" stroke-width="${1 / z}" stroke-dasharray="${3 / z} ${3 / z}"/>`;
    for (const g of v.lines || []) m += g.axis === "x" ? `<line data-guide="line" x1="${g.at}" y1="${-20 / z}" x2="${g.at}" y2="${H + 20 / z}" stroke="#ec4899" stroke-width="${1 / z}"/>` : `<line data-guide="line" x1="${-20 / z}" y1="${g.at}" x2="${w + 20 / z}" y2="${g.at}" stroke="#ec4899" stroke-width="${1 / z}"/>`;
    // Unlocked guides can be dragged (a wide invisible line catches the pointer); locked ones can't.
    if (!v.lockGuides) (v.lines || []).forEach((g, i) => { m += g.axis === "x" ? `<line data-guide-hit="${i}" x1="${g.at}" y1="${-20 / z}" x2="${g.at}" y2="${H + 20 / z}" stroke="transparent" stroke-width="${10 / z}" style="pointer-events:stroke;cursor:ew-resize"/>` : `<line data-guide-hit="${i}" x1="${-20 / z}" y1="${g.at}" x2="${w + 20 / z}" y2="${g.at}" stroke="transparent" stroke-width="${10 / z}" style="pointer-events:stroke;cursor:ns-resize"/>`; });
    if (v.rulers) {
      const unit = P.unit === "in" ? 96 : P.unit === "mm" ? 96 / 2.54 : 100, lab = P.unit === "in" ? "in" : P.unit === "mm" ? "cm" : "px";
      const t = 18 / z, fs = 10 / z;
      m += `<g data-guide="rulers" font-family="system-ui, sans-serif" font-size="${fs}" fill="#657089"><rect x="0" y="${-t - 2 / z}" width="${w}" height="${t}" fill="#ffffff" fill-opacity=".92" stroke="#d9dcea" stroke-width="${0.5 / z}"/><rect x="${-t - 2 / z}" y="0" width="${t}" height="${H}" fill="#ffffff" fill-opacity=".92" stroke="#d9dcea" stroke-width="${0.5 / z}"/>`;
      const step = unit / (unit * z < 40 ? 1 : unit * z < 80 ? 2 : 4);
      for (let x = 0, i = 0; x <= w + 0.1; x += step, i++) { const major = Math.abs(x / unit - Math.round(x / unit)) < 1e-6; m += `<line x1="${x}" y1="${-2 / z - (major ? t : t / 2)}" x2="${x}" y2="${-2 / z}" stroke="#94a3b8" stroke-width="${0.6 / z}"/>` + (major && x > 0 ? `<text x="${x + 2 / z}" y="${-t + fs - 1 / z}">${Math.round(x / unit)}${x === unit ? " " + lab : ""}</text>` : ""); }
      for (let y = 0; y <= H + 0.1; y += step) { const major = Math.abs(y / unit - Math.round(y / unit)) < 1e-6; m += `<line x1="${-2 / z - (major ? t : t / 2)}" y1="${y}" x2="${-2 / z}" y2="${y}" stroke="#94a3b8" stroke-width="${0.6 / z}"/>` + (major && y > 0 ? `<text x="${-t + 1 / z}" y="${y - 2 / z}">${Math.round(y / unit)}</text>` : ""); }
      m += `</g>`;
    }
  }
  // Motion paths (Animate panel): a dashed line from each moving item's centre.
  if (S.panel === "animate") for (const l of curPage().layers) {
    const pts = l.animation?.path?.pts;
    if (!(pts?.length >= 2) || l.hidden) continue;
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2, z = S.zoom, last = pts[pts.length - 1];
    m += `<polyline data-guide="path" points="${pts.map(([x, y]) => `${cx + x},${cy + y}`).join(" ")}" fill="none" stroke="#7c3aed" stroke-width="${2 / z}" stroke-dasharray="${6 / z} ${4 / z}"/><circle cx="${cx + last[0]}" cy="${cy + last[1]}" r="${5 / z}" fill="#7c3aed"/>`;
  }
  pageEl.classList.toggle("rounded-corners", S.design.print?.corners === "rounded");
  pageEl.classList.toggle("finish-gloss", S.design.print?.paper === "gloss");
  pageEl.classList.toggle("fx-foil", S.design.print?.effect === "foil");
  pageEl.classList.toggle("fx-raised", S.design.print?.effect === "raised");
  guidesEl.innerHTML = m ? `<svg width="${w}" height="${H}" overflow="visible">${m}</svg>` : "";
}
function onGuideDown(e) {
  const i = e.target?.dataset?.guideHit, v = S.design?.view;
  if (i == null || !v || v.lockGuides) return;
  e.stopPropagation(); e.preventDefault();
  const g = v.lines[+i];
  if (!g) return;
  const move = (ev) => { const [x, y] = toPage(ev.clientX, ev.clientY); g.at = Math.round(g.axis === "x" ? x : y); renderGuides(); };
  const up = () => {
    window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true);
    const { w, h: H } = pageSize(), max = g.axis === "x" ? w : H;
    if (g.at < -12 || g.at > max + 12) { v.lines.splice(+i, 1); toast("Guide removed."); }
    renderGuides(); commit("guide-move");
  };
  window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", up, true);
}
export function renderAll() {
  if (!S.design) return;
  S.sel = S.sel.filter((id) => curPage().layers.some((l) => l.id === id));
  renderPage();
  applyView();
  emit("render");
  emit("selection");
}
/** Re-renders one layer (after a property change). */
export function renderLayer(l) { const rec = els.get(l.id); if (rec) { rec.sig = null; layerEl(l); } else renderPage(); renderOverlay(); }

/* ---------------- view (zoom / pan) ---------------- */
function applyView() {
  world.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
  viewport.style.setProperty("--z", S.zoom);
  renderGuides();
  renderOverlay();
  emit("zoom", S.zoom);
}
let vpSize = null, vpPending = false; // canvas area size the view was last laid out for
export function fit() {
  if (!S.design || !viewport) return;
  const r = viewport.getBoundingClientRect(), { w, h: H } = pageSize();
  if (r.width < 1 || r.height < 1) return; // editor hidden
  Object.assign(S, fitView(r.width, r.height, w, H, bleedPx(S.design.preset)), { fit: true });
  vpSize = { w: r.width, h: r.height };
  applyView();
}
/** Keeps the page in view when the canvas area changes size (see viewAfterResize). */
export function syncViewport() {
  if (!S.design || !viewport) return;
  const r = viewport.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;
  if (vpSize && Math.abs(vpSize.w - r.width) < 0.5 && Math.abs(vpSize.h - r.height) < 0.5) return;
  if (drag) { vpPending = true; return; } // never move the page under a pointer that is dragging; catch up on release
  const v = viewAfterResize({ zoom: S.zoom, panX: S.panX, panY: S.panY, fit: S.fit }, vpSize, { w: r.width, h: r.height }, pageSize(), bleedPx(S.design.preset));
  S.zoom = v.zoom; S.panX = v.panX; S.panY = v.panY; S.fit = v.fit;
  vpSize = { w: r.width, h: r.height };
  applyView();
}
export function setZoom(z, cx = null, cy = null) {
  const r = viewport.getBoundingClientRect();
  if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
  z = Math.max(0.02, Math.min(8, z));
  const px = (cx - S.panX) / S.zoom, py = (cy - S.panY) / S.zoom;
  S.zoom = z; S.panX = cx - px * z; S.panY = cy - py * z; S.fit = false;
  applyView();
}
function onWheel(e) {
  if (!S.design) return;
  e.preventDefault();
  const r = viewport.getBoundingClientRect();
  if (e.ctrlKey || e.metaKey) setZoom(S.zoom * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
  else { S.panX -= e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX; S.panY -= e.shiftKey && !e.deltaX ? 0 : e.deltaY; S.fit = false; applyView(); }
}

/* ---------------- selection overlay ---------------- */
let guides = [], band = null, label = null, hoverId = null, ghost = null;
export function renderOverlay() {
  if (!overlay || !S.design) return;
  const z = S.zoom, parts = [];
  const box = (l, cls) => { const [cx, cy] = toScreen(l.x + l.w / 2, l.y + l.h / 2); return `<div class="${cls}" style="left:${cx - (l.w * z) / 2}px;top:${cy - (l.h * z) / 2}px;width:${l.w * z}px;height:${l.h * z}px;transform:rotate(${l.rotation || 0}deg)">`; };
  if (hoverId && !S.sel.includes(hoverId)) { const l = curPage().layers.find((x) => x.id === hoverId); if (l && !l.hidden) parts.push(box(l, "st-hover") + "</div>"); }
  const sel = selLayers().filter((l) => !l.hidden);
  if (S.cropping) {
    const l = layerById(S.cropping);
    if (l) parts.push(box(l, "st-selbox st-cropbox") + "</div>");
  } else if (sel.length === 1 && !S.playing) {
    const l = sel[0];
    const hs = fixed(l) ? [] : l.type === "text" ? ["nw", "ne", "se", "sw", "e", "w"] : Object.keys(HANDLES);
    // A locked item or any item on a locked page: no resize or rotate handles, only the lock badge.
    parts.push(box(l, "st-selbox" + (fixed(l) ? " locked" : "") + (S.editing === l.id ? " editing" : "")) + hs.map((k) => `<span class="st-handle h-${k}" data-handle="${k}" role="button" aria-label="Resize ${k}"></span>`).join("") + (fixed(l) ? `<span class="st-lockbadge" title="${l.locked ? "Locked" : "Page locked"}">🔒</span>` : `<span class="st-rot" data-handle="rot" role="button" aria-label="Rotate"></span>`) + "</div>");
  } else if (sel.length > 1 && !S.playing) {
    for (const l of sel) parts.push(box(l, "st-hover st-multi") + "</div>");
    const u = unionBox(sel.map(aabb));
    const still = sel.every(fixed);
    parts.push(box({ ...u, rotation: 0 }, "st-selbox st-groupbox" + (still ? " locked" : "")) + (still ? "" : ["nw", "ne", "se", "sw"].map((k) => `<span class="st-handle h-${k}" data-handle="${k}"></span>`).join("") + `<span class="st-rot" data-handle="rot" role="button" aria-label="Rotate"></span>`) + "</div>");
  }
  for (const g of guides) {
    if (g.axis === "x") { const [x, y1] = toScreen(g.v, g.from), [, y2] = toScreen(g.v, g.to); parts.push(`<div class="st-guide v ${g.kind}" style="left:${x}px;top:${y1}px;height:${y2 - y1}px"></div>`); }
    else { const [x1, y] = toScreen(g.from, g.v), [x2] = toScreen(g.to, g.v); parts.push(`<div class="st-guide hz ${g.kind}" style="left:${x1}px;top:${y}px;width:${x2 - x1}px"></div>`); }
  }
  if (band) { const [x1, y1] = toScreen(band.x, band.y); parts.push(`<div class="st-band" style="left:${x1}px;top:${y1}px;width:${band.w * z}px;height:${band.h * z}px"></div>`); }
  if (label) parts.push(`<div class="st-label" style="left:${label.x}px;top:${label.y}px">${esc(label.text)}</div>`);
  if (ghost) parts.push(`<div class="st-ghost" style="left:${ghost.x}px;top:${ghost.y}px;background-image:url('${ghost.src}')"></div>`);
  overlay.innerHTML = parts.join("");
}

/* ---------------- selection ---------------- */
export function select(ids, { add = false } = {}) {
  ids = (Array.isArray(ids) ? ids : ids ? [ids] : []).filter(Boolean);
  if (S.editing && !ids.includes(S.editing)) endEdit();
  if (S.cropping && !ids.includes(S.cropping)) endCrop();
  S.sel = add ? [...new Set([...S.sel, ...ids])] : ids;
  renderOverlay();
  emit("selection");
}

/* ---------------- pointer interactions ---------------- */
let drag = null;
const pointers = new Map();
const typing = () => { const a = document.activeElement; return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
const topLayerAt = (target) => { const el = target.closest?.(".st-layer"); return el ? curPage().layers.find((l) => l.id === el.dataset.id) : null; };
const kindKeepsRatio = (l) => ["image", "element", "group", "frame"].includes(l.type);

function onDown(e) {
  if (!S.design || S.playing) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { startPinch(); return; }
  if (e.button === 1 || (e.button === 0 && spaceDown)) { startPan(e); e.preventDefault(); return; }
  if (e.button !== 0) return;
  const p = toPage(e.clientX, e.clientY);
  const handle = e.target.closest?.("[data-handle]")?.dataset.handle;
  if (handle) { e.preventDefault(); handle === "rot" ? startRotate(e, p) : startResize(e, p, handle); return; }
  if (e.target.closest?.(".st-edit")) return; // typing / placing the caret
  const l = topLayerAt(e.target);
  if (S.paintStyle) { e.preventDefault(); emit("paste-style", l ? l.id : null); return; }
  if (S.cropping) {
    const c = layerById(S.cropping);
    if (l && l.id === S.cropping) { startCropPan(e, p, c); return; }
    endCrop();
  }
  if (S.editing && (!l || l.id !== S.editing)) endEdit();
  if (!l) {
    if (e.pointerType === "touch") { startPan(e); return; }
    if (!e.shiftKey) select([]);
    drag = { kind: "band", start: p, base: e.shiftKey ? [...S.sel] : [], id: e.pointerId };
    return;
  }
  e.preventDefault();
  viewport.focus({ preventScroll: true });
  const wasSelected = S.sel.length === 1 && S.sel[0] === l.id;
  if (e.shiftKey) { select(S.sel.includes(l.id) ? S.sel.filter((x) => x !== l.id) : [...S.sel, l.id]); if (!S.sel.includes(l.id)) return; }
  else if (!S.sel.includes(l.id)) select([l.id]);
  if (l.type === "frame" && l.collage && l.frame.image && S.sel.length === 1) { drag = { kind: "swap", id: e.pointerId, from: l, start: p, moved: false, cx: e.clientX, cy: e.clientY }; return; }
  const moving = selLayers().filter((x) => !fixed(x));
  drag = { kind: "move", id: e.pointerId, start: p, cx: e.clientX, cy: e.clientY, clicked: l, shift: e.shiftKey, moved: false, wasSelected,
    items: moving.map((x) => ({ l: x, x: x.x, y: x.y })), box: moving.length ? unionBox(moving.map(aabb)) : null,
    targets: snapTargets(pageSize(), curPage().layers.filter((x) => !S.sel.includes(x.id) && !x.hidden)) };
}
function startPan(e) { drag = { kind: "pan", id: e.pointerId, cx: e.clientX, cy: e.clientY, px: S.panX, py: S.panY }; viewport.classList.add("panning"); }
function startPinch() {
  const [a, b] = [...pointers.values()];
  const r = viewport.getBoundingClientRect();
  drag = { kind: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: S.zoom, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, px: S.panX, py: S.panY };
}
function startResize(e, p, handle) {
  const sel = selLayers().filter((l) => !fixed(l));
  if (!sel.length) return;
  if (sel.length === 1) {
    const l = sel[0];
    drag = { kind: "resize", id: e.pointerId, handle, l, orig: clone(l), targets: snapTargets(pageSize(), curPage().layers.filter((x) => x.id !== l.id && !x.hidden)) };
  } else {
    const u = unionBox(sel.map(aabb));
    drag = { kind: "mresize", id: e.pointerId, handle, box: { ...u, rotation: 0 }, items: sel.map((l) => ({ l, orig: clone(l) })) };
  }
}
function startRotate(e, p) {
  const sel = selLayers().filter((l) => !fixed(l));
  if (!sel.length) return;
  const u = sel.length === 1 ? { x: sel[0].x, y: sel[0].y, w: sel[0].w, h: sel[0].h } : unionBox(sel.map(aabb));
  const c = [u.x + u.w / 2, u.y + u.h / 2];
  drag = { kind: "rotate", id: e.pointerId, c, a0: Math.atan2(p[1] - c[1], p[0] - c[0]), items: sel.map((l) => ({ l, r: l.rotation || 0, cx: l.x + l.w / 2, cy: l.y + l.h / 2 })) };
}
function startCropPan(e, p, l) {
  e.preventDefault();
  const src = l.type === "frame" ? l.frame.image : l.image;
  drag = { kind: "crop", id: e.pointerId, start: p, l, crop: { ...src.crop } };
}

function onMove(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) return;
  if (drag.kind === "pinch") {
    if (pointers.size < 2) return;
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const r = viewport.getBoundingClientRect();
    const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
    const z = Math.max(0.02, Math.min(8, drag.z0 * (d / drag.d0)));
    const px = (drag.mx - drag.px) / drag.z0, py = (drag.my - drag.py) / drag.z0;
    S.zoom = z; S.panX = mx - px * z; S.panY = my - py * z; S.fit = false;
    applyView();
    return;
  }
  if (e.pointerId !== drag.id) return;
  const p = toPage(e.clientX, e.clientY);
  const z = S.zoom, thr = 6 / z;
  if (drag.kind === "pan") { S.panX = drag.px + e.clientX - drag.cx; S.panY = drag.py + e.clientY - drag.cy; S.fit = false; applyView(); return; }
  if (drag.kind === "band") {
    const x = Math.min(p[0], drag.start[0]), y = Math.min(p[1], drag.start[1]);
    band = { x, y, w: Math.abs(p[0] - drag.start[0]), h: Math.abs(p[1] - drag.start[1]) };
    if (band.w * z > 3 || band.h * z > 3) {
      const hit = curPage().layers.filter((l) => !l.hidden && intersects(aabb(l), band)).map((l) => l.id);
      S.sel = [...new Set([...drag.base, ...hit])];
      emit("selection");
    }
    renderOverlay();
    return;
  }
  if (drag.kind === "swap") {
    if (Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > 4) drag.moved = true;
    const r = viewport.getBoundingClientRect();
    ghost = drag.moved ? { x: e.clientX - r.left - 30, y: e.clientY - r.top - 30, src: urlOf(drag.from.frame.image.src) } : null;
    renderOverlay();
    return;
  }
  if (drag.kind === "move") {
    if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < 3) return;
    drag.moved = true;
    if (!drag.items.length) return;
    let dx = p[0] - drag.start[0], dy = p[1] - drag.start[1];
    guides = [];
    if (!e.altKey && drag.box) {
      const s = snapBox({ ...drag.box, x: drag.box.x + dx, y: drag.box.y + dy }, drag.targets, thr, pageSize());
      dx += s.dx; dy += s.dy; guides = s.guides;
    }
    for (const it of drag.items) { it.l.x = it.x + dx; it.l.y = it.y + dy; const rec = els.get(it.l.id); if (rec) place(rec.el, it.l); }
    const r = viewport.getBoundingClientRect();
    label = { x: e.clientX - r.left + 14, y: e.clientY - r.top + 14, text: `${Math.round(drag.box.x + dx)}, ${Math.round(drag.box.y + dy)}` };
    renderOverlay();
    emit("geometry");
    return;
  }
  if (drag.kind === "resize") {
    const { l, orig, handle } = drag;
    const corner = handle.length === 2;
    let keep = l.type === "text" ? corner : corner && kindKeepsRatio(l) ? !e.shiftKey : e.shiftKey;
    let pp = p;
    guides = [];
    // Snap the moving edges of unrotated boxes.
    if (!orig.rotation && !e.altKey && !keep) {
      const [hx, hy] = HANDLES[handle];
      let x = p[0], y = p[1];
      if (hx) { const s = snapValue(x, drag.targets.xs, thr); if (s) { x = s.v; guides.push({ axis: "x", v: s.v, from: Math.min(orig.y, 0), to: Math.max(orig.y + orig.h, pageSize().h), kind: "page" }); } }
      if (hy) { const s = snapValue(y, drag.targets.ys, thr); if (s) { y = s.v; guides.push({ axis: "y", v: s.v, from: Math.min(orig.x, 0), to: Math.max(orig.x + orig.w, pageSize().w), kind: "page" }); } }
      pp = [x, y];
    }
    const nb = resizeBox(orig, handle, pp, { keepRatio: keep, min: 6 });
    applyResize(l, orig, nb, handle);
    const rec = els.get(l.id);
    if (rec) layerEl(l);
    const r = viewport.getBoundingClientRect();
    label = { x: e.clientX - r.left + 14, y: e.clientY - r.top + 14, text: `${Math.round(l.w)} × ${Math.round(l.h)}` };
    renderOverlay();
    emit("geometry");
    return;
  }
  if (drag.kind === "mresize") {
    const nb = resizeBox(drag.box, drag.handle, p, { keepRatio: true, min: 6 });
    const k = nb.w / drag.box.w;
    for (const it of drag.items) {
      const o = clone(it.orig);
      scaleLayer(o, k, k, drag.box.x, drag.box.y);
      o.x += nb.x - drag.box.x; o.y += nb.y - drag.box.y;
      Object.assign(it.l, o);
      layerEl(it.l);
    }
    renderOverlay();
    emit("geometry");
    return;
  }
  if (drag.kind === "rotate") {
    const a = Math.atan2(p[1] - drag.c[1], p[0] - drag.c[0]);
    let delta = ((a - drag.a0) * 180) / Math.PI;
    if (drag.items.length === 1) {
      const it = drag.items[0];
      it.l.rotation = snapAngle(it.r + delta, e.shiftKey);
      delta = it.l.rotation - it.r;
    } else {
      if (e.shiftKey) delta = Math.round(delta / 15) * 15;
      for (const it of drag.items) {
        const [ncx, ncy] = rotate(it.cx, it.cy, drag.c[0], drag.c[1], delta);
        it.l.x = ncx - it.l.w / 2; it.l.y = ncy - it.l.h / 2; it.l.rotation = Math.round((((it.r + delta) % 360) + 360) % 360 * 10) / 10;
      }
    }
    for (const it of drag.items) { const rec = els.get(it.l.id); if (rec) place(rec.el, it.l); }
    const r = viewport.getBoundingClientRect();
    label = { x: e.clientX - r.left + 14, y: e.clientY - r.top + 14, text: `${Math.round(drag.items[0].l.rotation)}°` };
    renderOverlay();
    emit("geometry");
    return;
  }
  if (drag.kind === "crop") {
    const l = drag.l, src = l.type === "frame" ? l.frame.image : l.image, c = drag.crop;
    const dx = (p[0] - drag.start[0]), dy = (p[1] - drag.start[1]);
    const [ldx, ldy] = rotate(dx, dy, 0, 0, -(l.rotation || 0));
    src.crop = { ...c, x: Math.max(0, Math.min(1 - c.w, c.x - (ldx / l.w) * c.w)), y: Math.max(0, Math.min(1 - c.h, c.y - (ldy / l.h) * c.h)) };
    renderLayer(l);
    emit("geometry");
  }
}

/** Applies a new box from a handle drag to a layer (text keeps auto height, photos keep their crop undistorted). */
export function applyResize(l, orig, nb, handle) {
  if (l.type === "text") {
    const corner = handle.length === 2;
    if (corner) {
      const k = nb.w / orig.w;
      l.text.size = Math.max(1, orig.text.size * k);
      if (orig.text.letterSpacing) l.text.letterSpacing = orig.text.letterSpacing * k;
      if (orig.text.outline) l.text.outline = { ...orig.text.outline, width: orig.text.outline.width * k };
      if (orig.text.shadow) l.text.shadow = { ...orig.text.shadow, x: orig.text.shadow.x * k, y: orig.text.shadow.y * k, blur: orig.text.shadow.blur * k };
    }
    const w = Math.max(l.text.size * 0.6, nb.w);
    const hh = textHeight(l.text, w);
    // Keep the edge opposite the handle in place; height grows downwards.
    const [hx] = HANDLES[handle];
    const r = orig.rotation || 0, ocx = orig.x + orig.w / 2, ocy = orig.y + orig.h / 2;
    const lx = hx > 0 ? -orig.w / 2 + w / 2 : hx < 0 ? orig.w / 2 - w / 2 : 0;
    const ly = HANDLES[handle][1] < 0 ? orig.h / 2 - hh / 2 : -orig.h / 2 + hh / 2;
    const [cx, cy] = rotate(ocx + lx, ocy + ly, ocx, ocy, r);
    Object.assign(l, { w, h: hh, x: cx - w / 2, y: cy - hh / 2 });
    return;
  }
  Object.assign(l, nb);
  if (l.type === "group") {
    const kx = nb.w / orig.w, ky = nb.h / orig.h;
    l.children = orig.children.map((c) => scaleLayer(clone(c), kx, ky, 0, 0));
  }
  if (l.type === "image") refitCrop(l.image, orig, l);
  if (l.type === "frame" && l.frame.image) refitCrop(l.frame.image, orig, l);
  if (l.type === "table" && S.env.tableHeight) l.h = S.env.tableHeight(l.table, l.w);
}
/** After a box changes shape, adjust the crop so the photo is not stretched: it keeps its scale and the box
 * shows more or less of it (zooming in only when the photo runs out). Same shape = same crop. */
export function refitCrop(img, orig, l) {
  if (!img.nw || !img.nh) return;
  const c = (orig.type === "frame" ? orig.frame.image?.crop : orig.image?.crop) || img.crop || { x: 0, y: 0, w: 1, h: 1 };
  if (Math.abs(l.w / l.h - orig.w / orig.h) < 1e-3) { img.crop = { ...c }; return; }
  const s = Math.min((c.w * img.nw) / orig.w, img.nw / l.w, img.nh / l.h); // photo px per box px
  const w = (l.w * s) / img.nw, hh = (l.h * s) / img.nh, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  img.crop = { x: Math.max(0, Math.min(1 - w, cx - w / 2)), y: Math.max(0, Math.min(1 - hh, cy - hh / 2)), w, h: hh };
}

function onUp(e) {
  pointers.delete(e.pointerId);
  if (!drag) return;
  if (drag.kind === "pinch") { if (pointers.size < 2) { drag = null; if (vpPending) { vpPending = false; syncViewport(); } } return; }
  if (e.pointerId !== drag.id) return;
  const d = drag;
  drag = null; guides = []; label = null; band = null;
  viewport.classList.remove("panning");
  if (vpPending) { vpPending = false; syncViewport(); }
  if (d.kind === "move") {
    // Dropped on a page thumbnail (Canva: drag items to another page): they move to that page, same place.
    const th = d.moved && document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest?.(".st-pthumb[data-page], .ads-scard[data-page]")).find(Boolean) : null;
    if (th && +th.dataset.page !== S.page && d.items.length) { for (const it of d.items) { it.l.x = it.x; it.l.y = it.y; } moveSelToPage(+th.dataset.page); return; }
    if (d.moved && d.items.length) commit("move");
    else if (!d.moved && !d.shift && S.sel.length > 1) select([d.clicked.id]);
    else if (!d.moved && d.clicked?.type === "text" && S.sel.length === 1 && d.wasSelected) startEdit(d.clicked.id);
  } else if (d.kind === "swap") {
    ghost = null;
    if (d.moved) {
      const target = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest?.(".st-layer")).find(Boolean);
      const t = target && curPage().layers.find((l) => l.id === target.dataset.id);
      if (t && t.type === "frame" && t.id !== d.from.id) { swapFrames(d.from, t); renderLayer(d.from); renderLayer(t); commit("swap"); toast("Photos swapped"); }
    }
  } else if (["resize", "mresize", "rotate", "crop"].includes(d.kind)) { commit(d.kind); }
  renderOverlay();
  emit("selection");
}
function onHover(e) {
  if (drag || !S.design || e.pointerType === "touch") return;
  const l = topLayerAt(e.target);
  const id = l ? l.id : null;
  if (id !== hoverId) { hoverId = id; renderOverlay(); }
}
function onDbl(e) {
  const l = topLayerAt(e.target);
  if (!l || (l.type === "text" ? !canType(l) : fixed(l))) return;
  if (l.type === "text") startEdit(l.id);
  else if (l.type === "image" || (l.type === "frame" && l.frame.image)) toggleCrop(l.id);
}

/* ---------------- text editing ---------------- */
export function startEdit(id, { selectAll = false } = {}) {
  const l = layerById(id);
  if (!l || l.type !== "text" || !canType(l)) return;
  if (l.text.dynamic) { toast("Page numbers update by themselves. Change their format in Text > Page numbers."); return; }
  if (S.editing === id) return;
  if (S.editing) endEdit();
  S.editing = id;
  if (!S.sel.includes(id) || S.sel.length > 1) S.sel = [id];
  const rec = els.get(id);
  if (!rec) return;
  const t = l.text, pad = textPad(t);
  const ed = h("div.st-edit", { contenteditable: "plaintext-only", spellcheck: "true", role: "textbox", "aria-label": "Edit text", "aria-multiline": "true" });
  if (ed.contentEditable !== "plaintext-only") ed.contentEditable = "true";
  Object.assign(ed.style, {
    fontFamily: CSS_FAMILY[t.family] || CSS_FAMILY.sans, fontSize: t.size + "px", fontWeight: t.bold ? "700" : "400", fontStyle: t.italic ? "italic" : "normal",
    color: t.color, textAlign: t.align === "justify" ? "justify" : t.align, lineHeight: t.size * (t.lineHeight || 1.2) + "px",
    letterSpacing: (t.letterSpacing || 0) + "px", padding: pad + "px", textDecoration: [t.underline && "underline", t.strike && "line-through"].filter(Boolean).join(" ") || "none", textTransform: t.upper ? "uppercase" : "none",
    caretColor: t.color === "#ffffff" ? "#5b4cf0" : t.color,
  });
  ed.textContent = t.content;
  rec.el.classList.add("editing");
  rec.el.append(ed);
  ed.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(ed);
  if (!selectAll) range.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(range);
  ed.addEventListener("input", () => {
    let txt = (ed.innerText ?? ed.textContent).replace(/ /g, " ");
    if (ed.lastChild?.nodeName === "BR" && txt.endsWith("\n")) txt = txt.slice(0, -1);
    l.text.content = txt;
    const nh = textHeight(l.text, l.w);
    if (Math.abs(nh - l.h) > 0.01) { l.h = nh; place(rec.el, l); }
    renderOverlay();
    commit("type:" + id);
    emit("text", l);
  });
  ed.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); endEdit(); select([id]); }
    e.stopPropagation();
  });
  ed.addEventListener("paste", (e) => {
    e.stopPropagation();
    if (ed.contentEditable === "true") { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }
  });
  ed.addEventListener("blur", () => setTimeout(() => { if (S.editing === id && document.activeElement !== ed) endEdit(); }, 0));
  renderOverlay();
  emit("selection");
}
export function endEdit() {
  const id = S.editing;
  if (!id) return;
  S.editing = null;
  const rec = els.get(id);
  rec?.el.querySelector(".st-edit")?.remove();
  rec?.el.classList.remove("editing");
  const l = layerById(id);
  if (l && !l.text.content.trim()) { removeLayers([id]); commit("delete"); toast("Empty text removed"); }
  else if (l) { fitTextBox(l); l.name = l.text.content.split("\n")[0].slice(0, 24) || "Text"; renderLayer(l); commit("type:" + id); }
  renderOverlay();
  emit("selection");
  emit("layers");
}

/* ---------------- crop mode ---------------- */
export function toggleCrop(id) { if (S.cropping === id) endCrop(); else startCrop(id); }
export function startCrop(id) {
  const l = layerById(id);
  if (!l || fixed(l)) return;
  if (S.editing) endEdit();
  S.cropping = id; S.sel = [id];
  els.get(id)?.el.classList.add("cropping");
  renderLayer(l);
  emit("selection");
  toast("Drag the photo to choose what shows. Use the zoom slider to crop closer. Press Done when ready.", 3500);
}
export function endCrop() {
  const id = S.cropping;
  if (!id) return;
  S.cropping = null;
  els.get(id)?.el.classList.remove("cropping");
  renderOverlay();
  commit("crop");
  emit("selection");
}
/** Crop zoom 1 = the photo covers the box; 3 = three times closer. */
export function setCropZoom(l, zoom) {
  const src = l.type === "frame" ? l.frame.image : l.image;
  const base = coverCrop(src.nw || 1, src.nh || 1, l.w, l.h);
  const c = src.crop, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const w = base.w / zoom, hh = base.h / zoom;
  src.crop = { x: Math.max(0, Math.min(1 - w, cx - w / 2)), y: Math.max(0, Math.min(1 - hh, cy - hh / 2)), w, h: hh };
  renderLayer(l);
}
export function cropZoomOf(l) { const src = l.type === "frame" ? l.frame.image : l.image; const base = coverCrop(src.nw || 1, src.nh || 1, l.w, l.h); return Math.max(1, base.w / src.crop.w); }

/* ---------------- layer operations ---------------- */
export function addLayer(l, { select: sel = true, at = null, parentPage = null } = {}) {
  const pg = parentPage || curPage();
  const { w, h: H } = pageSize();
  if (at) { l.x = at[0] - l.w / 2; l.y = at[1] - l.h / 2; }
  else if (l.x === 0 && l.y === 0) { l.x = (w - l.w) / 2; l.y = (H - l.h) / 2; }
  // Cascade copies so they don't hide each other.
  while (pg.layers.some((o) => Math.abs(o.x - l.x) < 1 && Math.abs(o.y - l.y) < 1 && o.type === l.type)) { l.x += 20; l.y += 20; }
  pg.layers.push(l);
  renderPage();
  if (sel) select([l.id]);
  commit("add");
  emit("layers");
  return l;
}
function removeLayers(ids) {
  for (const pg of S.design.pages) pg.layers = pg.layers.filter((l) => !ids.includes(l.id));
  S.sel = S.sel.filter((id) => !ids.includes(id));
  renderPage();
  renderOverlay();
}
export function deleteSel() {
  const ids = selLayers().filter((l) => !fixed(l)).map((l) => l.id);
  if (!ids.length) { if (S.sel.length) toast("Unlock it first to delete it."); return; }
  if (S.editing) { S.editing = null; }
  removeLayers(ids);
  commit("delete");
  emit("selection"); emit("layers");
}
export function duplicateSel() {
  const src = selLayers();
  if (!src.length) return;
  const pg = curPage();
  const copies = src.map((l) => { const c = withNewIds(l); c.x += 24; c.y += 24; c.locked = false; return c; });
  const top = Math.max(...src.map((l) => pg.layers.indexOf(l)));
  pg.layers.splice(top + 1, 0, ...copies);
  renderPage();
  select(copies.map((c) => c.id));
  commit("duplicate"); emit("layers");
}
export function groupSel() {
  const sel = selLayers();
  if (sel.length < 2) { toast("Select two or more things to group them."); return; }
  const pg = curPage();
  const idx = Math.max(...sel.map((l) => pg.layers.indexOf(l)));
  const g = makeGroup(sel.map(clone), newId(), "Group");
  pg.layers.splice(idx + 1, 0, g);
  pg.layers = pg.layers.filter((l) => !S.sel.includes(l.id));
  renderPage();
  select([g.id]);
  commit("group"); emit("layers");
}
export function ungroupSel() {
  const g = single();
  if (!g || g.type !== "group") { toast("Select a group to ungroup it."); return; }
  const pg = curPage();
  const kids = ungroup(g);
  pg.layers.splice(pg.layers.indexOf(g), 1, ...kids);
  renderPage();
  select(kids.map((k) => k.id));
  commit("ungroup"); emit("layers");
}
/** z-order: 'forward' | 'backward' | 'front' | 'back'. */
export function arrange(dir) {
  const pg = curPage(), sel = selLayers();
  if (!sel.length) return;
  let list = pg.layers.slice();
  if (dir === "front") list = [...list.filter((l) => !S.sel.includes(l.id)), ...sel];
  else if (dir === "back") list = [...sel, ...list.filter((l) => !S.sel.includes(l.id))];
  else if (dir === "forward") { for (let i = list.length - 2; i >= 0; i--) if (S.sel.includes(list[i].id) && !S.sel.includes(list[i + 1].id)) [list[i], list[i + 1]] = [list[i + 1], list[i]]; }
  else if (dir === "backward") { for (let i = 1; i < list.length; i++) if (S.sel.includes(list[i].id) && !S.sel.includes(list[i - 1].id)) [list[i], list[i - 1]] = [list[i - 1], list[i]]; }
  pg.layers = list;
  renderPage(); renderOverlay();
  commit("arrange"); emit("layers");
}
export function moveLayerTo(id, index) {
  const pg = curPage(), from = pg.layers.findIndex((l) => l.id === id);
  if (from < 0) return;
  const [l] = pg.layers.splice(from, 1);
  pg.layers.splice(Math.max(0, Math.min(pg.layers.length, index)), 0, l);
  renderPage(); renderOverlay();
  commit("arrange"); emit("layers");
}
export function alignSel(mode) {
  const sel = selLayers().filter((l) => !fixed(l));
  if (!sel.length) return;
  const pos = alignLayers(sel, mode, pageSize());
  for (const l of sel) Object.assign(l, pos[l.id]);
  renderPage(); renderOverlay(); commit("align"); emit("geometry");
}
export function distributeSel(axis) {
  const sel = selLayers().filter((l) => !fixed(l));
  if (sel.length < 3) { toast("Select three or more things to space them evenly."); return; }
  const pos = distributeLayers(sel, axis);
  for (const l of sel) Object.assign(l, pos[l.id]);
  renderPage(); renderOverlay(); commit("distribute"); emit("geometry");
}
export function toggleLock() {
  const sel = selLayers();
  if (!sel.length) return;
  const to = !sel.every((l) => l.locked);
  sel.forEach((l) => { l.locked = to; });
  renderPage(); renderOverlay(); commit("lock"); emit("selection"); emit("layers");
  toast(to ? "Locked: it can't be moved or deleted until you unlock it." : "Unlocked");
}
export function toggleHidden(id) {
  const l = curPage().layers.find((x) => x.id === id);
  if (!l) return;
  l.hidden = !l.hidden;
  if (l.hidden) S.sel = S.sel.filter((x) => x !== id);
  renderPage(); renderOverlay(); commit("hide"); emit("layers"); emit("selection");
}
export function nudge(dx, dy) {
  const sel = selLayers().filter((l) => !fixed(l));
  if (!sel.length) return;
  for (const l of sel) { l.x += dx; l.y += dy; const rec = els.get(l.id); if (rec) place(rec.el, l); }
  renderOverlay(); commit("nudge"); emit("geometry");
}
export function selectAll() { select(curPage().layers.filter((l) => !l.hidden).map((l) => l.id)); }
/** Updates the selected layers with fn(layer) and records one undo step (merging with `key`). */
export function updateSel(fn, key = null, { silent = false } = {}) {
  const sel = selLayers();
  for (const l of sel) { fn(l); if (l.type === "text") fitTextBox(l); if (l.type === "group") refitGroup(l); renderLayer(l); }
  if (S.editing) { const ed = els.get(S.editing)?.el.querySelector(".st-edit"); if (ed) { const t = layerById(S.editing).text; Object.assign(ed.style, { fontFamily: CSS_FAMILY[t.family], fontSize: t.size + "px", fontWeight: t.bold ? "700" : "400", fontStyle: t.italic ? "italic" : "normal", color: t.color, textAlign: t.align, lineHeight: t.size * t.lineHeight + "px", letterSpacing: t.letterSpacing + "px", textDecoration: t.underline ? "underline" : "none", padding: textPad(t) + "px" }); } }
  renderOverlay();
  commit(key);
  if (!silent) emit("selection");
}

/* ---------------- pages ---------------- */
export function goPage(i) {
  if (!S.design || i < 0 || i >= S.design.pages.length) return;
  if (S.editing) endEdit();
  if (S.cropping) endCrop();
  S.page = i; S.sel = [];
  renderAll();
  emit("pages");
}
export function addPage() { if (S.editing) endEdit(); const bg = clone(curPage().background); S.design.pages.splice(S.page + 1, 0, newPage(bg.image ? { color: "#ffffff" } : bg)); commit("page"); goPage(S.page + 1); }
export function dupPage() { if (S.editing) endEdit(); S.design.pages.splice(S.page + 1, 0, duplicatePage(curPage())); commit("page"); goPage(S.page + 1); }
/** Duplicates several pages (each copy right after the last picked page, in order). */
export function dupPages(list) { if (S.editing) endEdit(); const copies = list.map((i) => duplicatePage(S.design.pages[i])); const at = Math.max(...list) + 1; S.design.pages.splice(at, 0, ...copies); commit("page"); goPage(at); toast(`${copies.length} pages duplicated.`); }
/** Deletes several pages (at least one stays). */
export function deletePages(list) { if (S.editing) endEdit(); const set = new Set(list); if (set.size >= S.design.pages.length) { toast("A design needs at least one page."); return; } S.design.pages = S.design.pages.filter((_, i) => !set.has(i)); commit("page"); goPage(Math.min(S.page, S.design.pages.length - 1)); toast(`${set.size} pages deleted.`); }
/** Moves the selected items to page i (same place on the page) and shows that page. */
export function moveSelToPage(i) {
  if (!S.design || i < 0 || i >= S.design.pages.length || i === S.page) return 0;
  if (S.editing) endEdit();
  const moving = selLayers().filter((l) => !fixed(l));
  if (!moving.length) return 0;
  const ids = moving.map((l) => l.id);
  curPage().layers = curPage().layers.filter((l) => !ids.includes(l.id));
  S.design.pages[i].layers.push(...moving);
  commit("move-to-page");
  goPage(i); select(ids);
  toast(`Moved to page ${i + 1}.`);
  return moving.length;
}
export function deletePage() {
  if (S.design.pages.length < 2) { toast("A design needs at least one page."); return; }
  S.design.pages.splice(S.page, 1); commit("page"); goPage(Math.min(S.page, S.design.pages.length - 1));
}
export function movePage(from, to) {
  const ps = S.design.pages;
  if (to < 0 || to >= ps.length || from === to) return;
  const [p] = ps.splice(from, 1); ps.splice(to, 0, p);
  commit("page"); goPage(to);
}

/* ---------------- clipboard ---------------- */
let clip = null, pasteHandled = 0;
const CLIP_MARK = "asaandesk-studio-layers:";
function onCopy(e) {
  if (typing() || !S.sel.length) return;
  clip = selLayers().map(clone);
  try { e?.clipboardData?.setData("text/plain", CLIP_MARK + JSON.stringify(clip)); e?.preventDefault(); } catch {}
}
export function copySel() { if (S.sel.length) { clip = selLayers().map(clone); try { navigator.clipboard?.writeText(CLIP_MARK + JSON.stringify(clip)).catch(() => {}); } catch {} toast(`Copied ${clip.length} item${clip.length > 1 ? "s" : ""}`); } }
export function pasteClip(list = clip) {
  if (!list?.length) return false;
  const pg = curPage();
  const copies = list.map((l) => { const c = withNewIds(l); c.x += 24; c.y += 24; c.locked = false; return c; });
  pg.layers.push(...copies);
  clip = copies.map(clone);
  renderPage(); select(copies.map((c) => c.id)); commit("paste"); emit("layers");
  return true;
}
async function onPaste(e) {
  if (!S.design || typing()) return;
  pasteHandled = Date.now();
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
  if (files.length) { e.preventDefault(); await addImageFiles(files); return; }
  const text = e.clipboardData?.getData("text/plain") || "";
  if (text.startsWith(CLIP_MARK)) { e.preventDefault(); try { pasteClip(JSON.parse(text.slice(CLIP_MARK.length))); } catch { pasteClip(); } return; }
  if (clip) { e.preventDefault(); pasteClip(); return; }
  if (text.trim()) { e.preventDefault(); emit("paste-text", text.trim()); }
}

/* ---------------- keyboard ---------------- */
let spaceDown = false;
function onKey(e) {
  if (!S.design || document.querySelector("#editorView")?.hidden) return;
  if (S.playing && e.key === "Escape") { emit("stop-preview"); return; }
  if (document.querySelector("dialog[open]") || document.querySelector(".st-present:not([hidden])")) return;
  if (typing()) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (k === " ") { spaceDown = true; viewport.classList.add("can-pan"); window.addEventListener("keyup", (ev) => { if (ev.key === " ") { spaceDown = false; viewport.classList.remove("can-pan"); } }, { once: true }); e.preventDefault(); return; }
  if (mod && (k === "z" || k === "Z")) { e.preventDefault(); emit(e.shiftKey ? "redo" : "undo"); return; }
  if (mod && (k === "y" || k === "Y")) { e.preventDefault(); emit("redo"); return; }
  if (mod && (k === "=" || k === "+")) { e.preventDefault(); setZoom(S.zoom * 1.2); return; }
  if (mod && k === "-") { e.preventDefault(); setZoom(S.zoom / 1.2); return; }
  if (mod && k === "0") { e.preventDefault(); fit(); return; }
  if (mod && (k === "a" || k === "A")) { e.preventDefault(); selectAll(); return; }
  if (mod && e.altKey && (k === "g" || k === "G" || e.code === "KeyG")) { e.preventDefault(); emit("goto-page"); return; }
  if (mod && e.altKey && (k === "c" || k === "C" || e.code === "KeyC")) { e.preventDefault(); emit("copy-style"); return; }
  if (mod && e.altKey && (k === "v" || k === "V" || e.code === "KeyV")) { e.preventDefault(); emit("paste-style-sel"); return; }
  if (e.altKey && e.shiftKey && !mod && (k === "l" || k === "L" || e.code === "KeyL")) { e.preventDefault(); emit("lock-cycle"); return; }
  if (mod && (k === "k" || k === "K")) { e.preventDefault(); emit("link"); return; }
  if (mod && (k === "c" || k === "C")) { copySel(); return; }
  if (mod && (k === "x" || k === "X")) { copySel(); deleteSel(); return; }
  if (mod && (k === "v" || k === "V")) { const t = Date.now(); setTimeout(() => { if (pasteHandled < t) pasteClip(); }, 60); return; }
  if (mod && (k === "d" || k === "D")) { e.preventDefault(); duplicateSel(); return; }
  if (mod && (k === "g" || k === "G")) { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); return; }
  if (mod && k === "]") { e.preventDefault(); arrange("front"); return; }
  if (mod && k === "[") { e.preventDefault(); arrange("back"); return; }
  if (k === "]") { arrange("forward"); return; }
  if (k === "[") { arrange("backward"); return; }
  if (k === "Delete" || k === "Backspace") { if (S.sel.length) { e.preventDefault(); deleteSel(); } return; }
  if (k === "Escape") { if (S.paintStyle) emit("paste-style", null); else if (S.cropping) endCrop(); else select([]); return; }
  if (k === "Enter") { const l = single(); if (l?.type === "text") { e.preventDefault(); startEdit(l.id, { selectAll: true }); } else if (l && (l.type === "image" || l.type === "frame")) toggleCrop(l.id); return; }
  const step = e.shiftKey ? 10 : 1;
  const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (arrows[k] && S.sel.length) { e.preventDefault(); nudge(...arrows[k]); return; }
  if (arrows[k] && !S.sel.length && (k === "ArrowLeft" || k === "ArrowRight") && !mod) { goPage(S.page + (k === "ArrowRight" ? 1 : -1)); }
}

/* ---------------- photos ---------------- */
/** Reads an image file into { src (data URL, large photos scaled to 4000 px), nw, nh }. */
export async function readImageFile(file) {
  const src = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("The file could not be read.")); r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(`"${file.name}" is not a photo this browser can open.`)); im.src = src; });
  let nw = img.naturalWidth, nh = img.naturalHeight, out = src;
  const max = 4000;
  if (nw > max || nh > max || (!/^data:image\/(png|jpe?g)/.test(src)) || src.length > 12e6) {
    const k = Math.min(1, max / Math.max(nw, nh));
    const c = document.createElement("canvas"); c.width = Math.round(nw * k); c.height = Math.round(nh * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const alpha = /png|gif|webp|svg/.test(file.type);
    out = c.toDataURL(alpha ? "image/png" : "image/jpeg", 0.92);
    nw = c.width; nh = c.height;
  }
  return { src: out, nw, nh, name: file.name };
}
export const uploads = []; // photos added in this session (Uploads panel)
/** Adds photos: into a frame (frameId), into empty collage frames, or as new image layers. */
export async function addImageFiles(files, { at = null, frameId = null } = {}) {
  const list = [...files].filter((f) => f && (f.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name || "")));
  if (!list.length) { toast("Choose a photo (PNG, JPG, WebP or GIF)."); return []; }
  const photos = [];
  for (const f of list) { try { photos.push(await readImageFile(f)); } catch (e) { toast(e.message); } }
  for (const p of photos) if (!uploads.some((u) => u.src === p.src)) uploads.unshift(p);
  emit("uploads");
  const out = [];
  const pg = curPage();
  // Empty frames take the uploaded photos; in the Collage panel also frames still showing a template's sample photo.
  const frames = frameId ? [layerById(frameId)] : pg.layers.filter((l) => l.type === "frame" && (!l.frame.image || (S.panel === "collage" && l.frame.image.stock)) && !l.hidden);
  let k = 0;
  if (frameId || (frames.length && (S.panel === "collage" || pg.layers.every((l) => l.type === "frame" || l.type === "text" || l.type === "element" || l.type === "shape")))) {
    for (const f of frames) {
      if (k >= photos.length) break;
      const p = photos[k++];
      f.frame.image = { src: p.src, nw: p.nw, nh: p.nh, crop: coverCrop(p.nw, p.nh, f.w, f.h) };
      renderLayer(f); out.push(f);
    }
  }
  const { w, h: H } = pageSize();
  for (; k < photos.length; k++) {
    const p = photos[k];
    const s = Math.min(1, (w * 0.6) / p.nw, (H * 0.6) / p.nh);
    const l = imageLayer(p.src, { w: p.nw * s, h: p.nh * s, nw: p.nw, nh: p.nh, name: p.name?.replace(/\.[^.]+$/, "").slice(0, 24) || "Photo" });
    if (at) { l.x = at[0] - l.w / 2 + k * 20; l.y = at[1] - l.h / 2 + k * 20; } else { l.x = (w - l.w) / 2 + k * 20; l.y = (H - l.h) / 2 + k * 20; }
    pg.layers.push(l); out.push(l);
  }
  renderPage();
  if (out.length) select(out.map((l) => l.id));
  commit("photos"); emit("layers");
  return out;
}
async function onDrop(e) {
  e.preventDefault();
  viewport.classList.remove("drop");
  if (!S.design) return;
  const files = [...(e.dataTransfer?.files || [])];
  const p = toPage(e.clientX, e.clientY);
  const target = topLayerAt(document.elementFromPoint(e.clientX, e.clientY) || e.target);
  const studioSrc = e.dataTransfer?.getData("application/x-studio-image");
  if (studioSrc) {
    const ph = uploads.find((u) => u.src === studioSrc) || JSON.parse(e.dataTransfer.getData("application/x-studio-photo") || "null");
    if (ph) {
      if (target?.type === "frame") { target.frame.image = { src: ph.src, nw: ph.nw, nh: ph.nh, crop: coverCrop(ph.nw, ph.nh, target.w, target.h) }; renderLayer(target); commit("photo"); select([target.id]); return; }
      const s = Math.min(1, (pageSize().w * 0.6) / ph.nw, (pageSize().h * 0.6) / ph.nh);
      addLayer(imageLayer(ph.src, { w: ph.nw * s, h: ph.nh * s, nw: ph.nw, nh: ph.nh, name: "Photo" }), { at: p });
    }
    return;
  }
  if (!files.length) return;
  if (target?.type === "frame") await addImageFiles(files.slice(0, 1), { frameId: target.id });
  else if (target?.type === "image" && files.length === 1 && e.altKey) await replaceImage(target, files[0]);
  else await addImageFiles(files, { at: p });
}
export async function replaceImage(l, file) {
  const p = await readImageFile(file);
  if (l.type === "frame") l.frame.image = { src: p.src, nw: p.nw, nh: p.nh, crop: coverCrop(p.nw, p.nh, l.w, l.h) };
  else { l.image.src = p.src; l.image.nw = p.nw; l.image.nh = p.nh; l.image.crop = coverCrop(p.nw, p.nh, l.w, l.h); }
  if (!uploads.some((u) => u.src === p.src)) uploads.unshift(p);
  renderLayer(l); commit("replace"); emit("uploads"); emit("selection");
}

/* ---------------- animation preview on the canvas ---------------- */
let raf = 0;
export function playPreview(duration, onEnd) {
  stopPreview();
  S.playing = true;
  select([]);
  const t0 = performance.now();
  const page = pageSize();
  const step = () => {
    const t = (performance.now() - t0) / 1000;
    const timed = withClicks(curPage()), end = animEnd(timed);
    for (const l of timed.layers) {
      const rec = els.get(l.id);
      if (!rec) continue;
      const st = animState(l.animation, t, page, end);
      if (l.timing && (t < (+l.timing.start || 0) || (l.timing.end != null && t > +l.timing.end))) st.opacity = 0;
      rec.el.style.opacity = String((l.opacity ?? 1) * st.opacity);
      rec.el.style.transform = `translate(${st.dx}px, ${st.dy}px)${l.rotation ? ` rotate(${l.rotation}deg)` : ""}${st.scale !== 1 ? ` scale(${st.scale})` : ""}`;
      rec.el.style.clipPath = st.clip < 1 ? `inset(-50% ${(1 - st.clip) * 100}% -50% -50%)` : "";
      if (l.type === "text" && l.animation?.type === "typewriter") {
        const svg = rec.el.querySelector("svg");
        if (svg) svg.innerHTML = layerContent(l, { ...S.env, reveal: { [l.id]: st.reveal } });
        rec.sig = null;
      }
    }
    if (t < duration && S.playing) raf = requestAnimationFrame(step);
    else { stopPreview(); onEnd?.(); }
  };
  raf = requestAnimationFrame(step);
}
export function stopPreview() {
  cancelAnimationFrame(raf);
  if (!S.playing) return;
  S.playing = false;
  for (const l of curPage().layers) { const rec = els.get(l.id); if (rec) { rec.el.style.clipPath = ""; rec.sig = null; layerEl(l); } }
  renderOverlay();
  emit("preview-end");
}
on("stop-preview", stopPreview);

export { viewport as viewportEl };
export const getViewport = () => viewport;
