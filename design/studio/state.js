// Studio editor state shared by the stage, the panels and the app shell.
import { presetPx } from "./presets.js";
import { History, findLayer } from "./model.js";
import { renumberPages } from "./pagetools.js";

export const S = {
  design: null,      // the open Design JSON
  projectId: null,   // IndexedDB project id (autosave)
  page: 0,           // current page index
  sel: [],           // selected top-level layer ids (current page)
  zoom: 1, panX: 0, panY: 0,
  editing: null,     // id of the text layer being typed in
  cropping: null,    // id of the image layer in crop mode
  history: null,
  panel: null,       // open side panel
  playing: false,    // animation preview running
  env: { editor: true, idp: "ed", cssFilters: true }, // render environment (chartPrims, tablePrims, urlOf …)
};

const hooks = {};
export const on = (ev, fn) => { (hooks[ev] ||= []).push(fn); };
export const emit = (ev, ...a) => { for (const fn of hooks[ev] || []) { try { fn(...a); } catch (e) { console.error(e); } } };

export const curPage = () => S.design.pages[S.page];
export const pageSize = () => presetPx(S.design.preset);
export const layerById = (id) => (S.design ? findLayer(S.design, id)?.layer || null : null);
/** Selected top-level layers of the current page, in stacking order. */
export const selLayers = () => (S.design ? curPage().layers.filter((l) => S.sel.includes(l.id)) : []);
export const single = () => { const s = selLayers(); return s.length === 1 ? s[0] : null; };

// Changes that come in quick streams (typing, sliders, colour pickers, nudges) merge into one undo step;
// discrete actions (move, resize, add, delete …) always get their own step.
const MERGE = /^(type:|nudge$|name$|fx-|grad$|curve-v$|page-title$|table-|chart-color$|chart-text$|chart-center$|geo-|f-|lh$|ls$|opacity$|tcolor$|size$|fill$|stroke$|sw$|radius$|sides$|points$|el-|sh-|ol-|bg-c|bg-r|bg-color$|grad|anim-delay$|anim-dur$|collage-gap$|collage-radius$|fb-|frame-r$|tsize$|th$|chart-title$|chart-data$|table$|color$|notes$|list$)/
/** Records a change for undo/redo and autosave. */
export function commit(key = null) {
  if (!S.design) return;
  // Automatic page numbers follow every change of pages (add, delete, move, hide, duplicate).
  const renumbered = renumberPages(S.design);
  if (renumbered.length) emit("renumbered", renumbered);
  if (S.history.commit(S.design, key && MERGE.test(key) ? key : null)) emit("change", key);
  emit("history");
}
export function resetHistory() { S.history = new History(S.design); emit("history"); }

let toastTimer = null;
export function toast(msg, ms = 2600) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "ad-toast st-toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.append(el); }
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/** Small DOM helper: h('div.cls#id', { attrs, on: { click } }, ...children). */
export function h(tag, attrs = {}, ...kids) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag);
  const el = document.createElement(m[1] || "div");
  for (const part of (m[2] || "").match(/[.#][\w-]+/g) || []) part[0] === "." ? el.classList.add(part.slice(1)) : (el.id = part.slice(1));
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "text") el.textContent = v;
    else if (k === "value") el.value = v;
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
