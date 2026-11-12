// AsaanDesk design apps: the shared full-screen editor frame (top bar, left rail + side panel, canvas with a
// floating toolbar, bottom bar). Every design app mounts it with mountShell(opts); see CANVA-FLOW-PLAN.md for the API.
// Our own layout, colours and line icons. Everything is saved on this device (localStorage / IndexedDB).
import { loadBrand, saveBrand, FONT_FAMILIES } from "./brand.js";
import { listProjects, saveProject, deleteProject, getProject } from "./store.js";

const CSS_HREF = new URL("./editor-shell.css", import.meta.url).href;
const MOBILE = "(max-width: 759.98px)";

// ---------- Icons: our own simple 24px line drawings (stroke = currentColor).
const P = {
  home: '<path d="M4 11.2 12 4l8 7.2"/><path d="M6.2 9.6v9.9h4.3v-4.6h3v4.6h4.3V9.6"/>',
  chev: '<path d="m7 10 5 5 5-5"/>',
  left: '<path d="m14.5 6-6 6 6 6"/>',
  right: '<path d="m9.5 6 6 6-6 6"/>',
  pencil: '<path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z"/><path d="M14 6.8l3.2 3.2"/>',
  cloudOk: '<path d="M7.2 18.5h9.6a4 4 0 0 0 .5-8A5.4 5.4 0 0 0 6.9 9.4a4.6 4.6 0 0 0 .3 9.1z"/><path d="m9.4 13.9 2 2 3.6-3.7"/>',
  cloudUp: '<path d="M7.2 18.5h9.6a4 4 0 0 0 .5-8A5.4 5.4 0 0 0 6.9 9.4a4.6 4.6 0 0 0 .3 9.1z"/><path d="M12 16.5v-5M9.8 13.6 12 11.4l2.2 2.2"/>',
  cloudDot: '<path d="M7.2 18.5h9.6a4 4 0 0 0 .5-8A5.4 5.4 0 0 0 6.9 9.4a4.6 4.6 0 0 0 .3 9.1z"/><path d="M12 11.3v2.6M12 16.2v.1"/>',
  templates: '<rect x="4" y="4" width="16" height="16" rx="3.2"/><path d="M11 4v16M11 11.5h9"/>',
  elements: '<circle cx="7.6" cy="7.6" r="3.4"/><path d="M16.5 4.2 20 10.2h-7z"/><rect x="4.2" y="13.4" width="6.8" height="6.8" rx="1.6"/><path d="M16.5 13.4v6.8M13.1 16.8h6.8"/>',
  text: '<path d="M5.5 7V5h13v2M12 5v14M9.3 19h5.4"/>',
  brand: '<path d="M12 3.6a8.4 8.4 0 1 0 0 16.8c1.4 0 2-.9 1.6-2-.5-1.3.3-2.5 1.7-2.5h1.8a3.4 3.4 0 0 0 3.4-3.4c0-4.9-3.8-8.9-8.5-8.9z"/><circle cx="8" cy="11" r="1.1"/><circle cx="11" cy="7.6" r="1.1"/><circle cx="15.4" cy="8.6" r="1.1"/>',
  uploads: '<path d="M7.4 18H7a4.5 4.5 0 0 1-.5-9A5.5 5.5 0 0 1 17.4 9.5 4.2 4.2 0 0 1 17 18h-.4"/><path d="M12 12v8M9 15l3-3 3 3"/>',
  tools: '<path d="M4.5 19.5l1.1-4.1 9.9-9.9a2 2 0 0 1 2.9 0l.2.2a2 2 0 0 1 0 2.9l-9.9 9.9z"/><path d="M13.8 7.2l3 3"/><path d="M14 19.5h6"/>',
  projects: '<path d="M3.6 7.4c0-1.1.9-1.9 2-1.9h3.9l2 2h7c1.1 0 1.9.9 1.9 2v7.9c0 1.1-.8 2-1.9 2H5.6c-1.1 0-2-.9-2-2z"/><path d="M3.6 10.2h16.8"/>',
  apps: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8"/><path d="M16.7 13.4v6.6M13.4 16.7H20"/>',
  translate: '<path d="M4 6.2h9M8.5 4v2.2M11 6.2c-.6 3.6-3 6.4-6.5 8M6.8 9.4c1 1.9 2.5 3.4 4.6 4.4"/><path d="M12.8 20 16.4 12l3.6 8M14.1 17.2h4.6"/>',
  comment: '<path d="M20 11.3c0 3.9-3.6 7-8 7-1.1 0-2.2-.2-3.1-.6L4.5 19.4l1.3-3.7A6.6 6.6 0 0 1 4 11.3c0-3.9 3.6-7 8-7s8 3.1 8 7z"/>',
  insights: '<path d="M4 20h16M7.2 16.5v-5M12 16.5V6.5M16.8 16.5v-8"/>',
  share: '<path d="M12 14.5V4M8.3 7.6 12 3.9l3.7 3.7"/><path d="M8 10.5H6.5v9h11v-9H16"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" class="f"/><circle cx="12" cy="12" r="1.4" class="f"/><circle cx="18.5" cy="12" r="1.4" class="f"/>',
  notes: '<path d="M4 6.5h10M4 10.5h7M4 14.5h4.5"/><path d="M10.5 20l.8-3.3 7.1-7.1a1.7 1.7 0 0 1 2.4 2.4l-7.1 7.1z"/>',
  outline: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20"/><circle cx="4.8" cy="6.5" r=".9" class="f"/><circle cx="4.8" cy="12" r=".9" class="f"/><circle cx="4.8" cy="17.5" r=".9" class="f"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10.2v3.6l2.4 1.6M9.5 3.6h5M12 3.6v2.9"/>',
  pages: '<rect x="4" y="4.5" width="16" height="10.5" rx="1.6"/><path d="M4 19h16M8 15v4M16 15v4"/>',
  grid: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.5"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.5"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.5"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.5"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-6.3 6.3M4 20l6.3-6.3"/>',
  shrink: '<path d="M19.5 4.5 14 10M14 5.5V10h4.5M4.5 19.5 10 14M10 18.5V14H5.5"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.8-1.1 1.5v.6"/><circle cx="12" cy="16.8" r=".7" class="f"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.8 4.8"/>',
  play: '<path d="M8.5 5.6v12.8l9.8-6.4z"/>',
  pause: '<path d="M8.7 5.5v13M15.3 5.5v13"/>',
  reset: '<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3M4.6 4.3v3.9h3.9"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.6h5V7M6.6 7l1 12.4h8.8l1-12.4"/>',
  check: '<path d="m5 12.5 4.4 4.4L19 7.4"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.2c0-.9-.7-1.7-1.7-1.7H6.2c-.9 0-1.7.8-1.7 1.7v7.6c0 1 .8 1.7 1.7 1.7h2.3"/>',
  download: '<path d="M12 4v10.8M7.6 10.4 12 14.8l4.4-4.4M5 19.5h14"/>',
  link: '<path d="M10.2 13.8a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>',
  device: '<rect x="7" y="3" width="10" height="18" rx="2.6"/><path d="M11 17.8h2"/>',
  eye: '<path d="M2.6 12S6 5.6 12 5.6 21.4 12 21.4 12 18 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>',
  resize: '<path d="M4 9.5V4h5.5M20 14.5V20h-5.5M4 4l6.2 6.2M20 20l-6.2-6.2"/>',
  user: '<circle cx="12" cy="8.6" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><circle cx="9" cy="10" r="1.7"/><path d="m4 17.5 5-4.6 3.5 3 3-2.5 4.5 4"/>',
  sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.6h16M9.6 4v16"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
  board: '<path d="M5 4.5h14v10.2L14.7 19H5z"/><path d="M14.7 19v-4.3H19"/>',
  slides: '<rect x="3.5" y="5" width="17" height="11" rx="1.6"/><path d="M12 16v3.5M8.5 19.5h7"/>',
  social: '<path d="M12 19.3s-7.5-4.3-7.5-9.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.5 2.2c0 5.1-7.5 9.4-7.5 9.4z"/>',
  print: '<path d="M7 9V4h10v5M7 17H4.5V9h15v8H17"/><path d="M7 14h10v6H7z"/>',
  video: '<rect x="3.5" y="6" width="12" height="12" rx="2"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
  web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.3 3.4 5.2 3.4 8.5s-1.1 6.2-3.4 8.5c-2.3-2.3-3.4-5.2-3.4-8.5S9.7 5.8 12 3.5z"/>',
  logo: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.5-5-2.6-5 2.6.9-5.5-4-4 5.6-.8z"/>',
  record: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6" class="f"/>',
  speak: '<path d="M4.5 9.5h3.2L12 5.5v13l-4.3-4H4.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/>',
  palette: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/>',
  history: '<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3M4.6 4.3v3.9h3.9"/><path d="M12 8.2V12l2.6 1.6"/>',
  present: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="1.6"/><path d="m10.3 7.9 4 2.3-4 2.3z"/><path d="M12 16v3.5M8.5 19.5h7"/>',
  invite: '<circle cx="9.5" cy="8.6" r="3.4"/><path d="M3.5 19.5a6 6 0 0 1 12 0M18.5 8v6M15.5 11h6"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.8" cy="17.5" r="2.3"/><circle cx="16.8" cy="15.5" r="2.3"/>',
};
const icon = (n, cls = "") => `<svg class="ads-i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n] || ""}</svg>`;

// ---------- Small helpers
/** Creates an element: h("button", { class, text, html, onclick, "aria-label": … }, ...children). */
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const when = (t) => { try { return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; } };
const btn = (cls, label, iconName, text, onclick, extra = {}) => h("button", { type: "button", class: cls, "aria-label": label, title: label, html: (iconName ? icon(iconName) : "") + (text ? `<span class="ads-l"></span>` : ""), onclick, ...extra }, );
function setText(b, text) { const s = b.querySelector(".ads-l"); if (s) s.textContent = text; return b; }
const mk = (cls, label, iconName, text, onclick, extra) => setText(btn(cls, label, iconName, text, onclick, extra), text);

const PANEL_META = {
  templates: ["Templates", "templates"], elements: ["Elements", "elements"], text: ["Text", "text"], brand: ["Brand", "brand"],
  uploads: ["Uploads", "uploads"], tools: ["Tools", "tools"], draw: ["Draw", "tools"], projects: ["Projects", "projects"], apps: ["Apps", "apps"],
  translate: ["Translate", "translate"], charts: ["Charts", "insights"], photos: ["Photos", "image"], comments: ["Comments", "comment"],
  notes: ["Notes", "notes"], outline: ["Outline", "outline"], versions: ["Version history", "history"], layers: ["Layers", "pages"], styles: ["Styles", "palette"],
};
const DEFAULT_RAIL = ["templates", "elements", "text", "brand", "uploads", "tools", "projects", "apps", "translate"];
const OFF_RAIL = new Set(["comments", "notes", "outline", "versions"]);
const REFRESH = new Set(["projects", "outline", "comments", "brand", "versions", "notes"]);
const APPS = [
  ["sheets", "Sheets", "Spreadsheets with formulas and charts", "/design/sheets/?new=1", "sheet"],
  ["docs", "Docs", "Documents, reports and letters", "/design/docs/?new=1", "doc"],
  ["whiteboard", "Whiteboard", "Sticky notes, shapes and arrows", "/design/whiteboard/?new=1", "board"],
  ["presentations", "Presentations", "Slides you can present", "/design/studio/?preset=presentation-16x9", "slides"],
  ["social", "Social media", "Posts in the right size", "/design/studio/?group=social", "social"],
  ["print", "Print", "Cards, flyers and posters", "/design/studio/?group=print", "print"],
  ["photo", "Photo editor", "Crop, filters and text", "/design/photo/", "image"],
  ["video", "Video editor", "Trim and join clips", "/design/video/", "video"],
  ["website", "Websites", "One-page sites from blocks", "/design/website/", "web"],
  ["draw", "Draw", "Brushes and layers", "/design/draw/", "tools"],
  ["logos", "Logos", "Shapes, text and icons", "/design/studio/?mode=logo", "logo"],
  ["recorder", "Video recorder", "Screen and camera", "/design/recorder/", "record"],
  ["voice", "Text to speech", "Listen to your text", "/design/voice/", "speak"],
];
const LANGS = [["en", "English"], ["ar", "Arabic"], ["bn", "Bengali"], ["zh", "Chinese (Simplified)"], ["nl", "Dutch"], ["fr", "French"], ["de", "German"], ["hi", "Hindi"], ["id", "Indonesian"], ["it", "Italian"], ["ja", "Japanese"], ["ko", "Korean"], ["fa", "Persian"], ["pl", "Polish"], ["pt", "Portuguese"], ["ru", "Russian"], ["es", "Spanish"], ["sv", "Swedish"], ["th", "Thai"], ["tr", "Turkish"], ["uk", "Ukrainian"], ["ur", "Urdu"], ["vi", "Vietnamese"]];
const SHORTCUTS = [["?", "Show keyboard shortcuts"], ["Ctrl + Z", "Undo"], ["Ctrl + Y  /  Ctrl + Shift + Z", "Redo"], ["Ctrl + C / X / V", "Copy, cut, paste"], ["Ctrl + B / I / U", "Bold, italic, underline"], ["Delete", "Delete the selection"], ["Ctrl + A", "Select all"], ["Escape", "Close menus and panels"], ["Tab", "Move between controls"]];

// ---------- Uploads: kept in this browser (own IndexedDB database, separate from store.js).
let updb = null;
function upDb() {
  updb ||= new Promise((res, rej) => {
    const r = indexedDB.open("asaandesk-shell", 2);
    r.onupgradeneeded = () => { for (const n of ["uploads", "versions"]) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: "id" }); };
    r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); res(r.result); }; r.onerror = () => rej(r.error);
  });
  return updb;
}
async function dbTx(store, mode, fn) { const d = await upDb(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); }
const upTx = (mode, fn) => dbTx("uploads", mode, fn);
const readUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });

/** Mounts the editor frame around the app's stage. Returns the shell API (see CANVA-FLOW-PLAN.md). */
export function mountShell(opts = {}) {
  if (!document.querySelector(`link[href="${CSS_HREF}"]`) && ![...document.styleSheets].some((s) => s.href === CSS_HREF)) document.head.append(h("link", { rel: "stylesheet", href: CSS_HREF }));
  const app = opts.app || "design", kind = opts.kind || "Design";
  const appPanels = opts.panels || {};
  const bottom = opts.bottom || { notes: true, timer: true, fullscreen: true, help: true };
  let designId = opts.designId || "default", mode = "edit", active = null, last = null, pop = null, projectId = opts.projectId || null;
  const isMobile = () => matchMedia(MOBILE).matches;
  const started = Date.now();

  // ----- skeleton
  const root = h("div", { class: "ad-shell ads-collapsed", "data-app": app, "data-mode": "edit", "data-panel": "" });
  const top = h("header", { class: "ads-top", "aria-label": "Editor top bar" });
  const rail = h("nav", { class: "ads-rail", "aria-label": "Editor panels" });
  const panel = h("aside", { class: "ads-panel", "aria-label": "Side panel", id: `ads-panel-${app}` });
  const canvas = h("main", { class: "ads-canvas", "aria-label": `${kind} canvas` });
  const foot = h("footer", { class: "ads-bottom", "aria-label": "Editor bottom bar" });
  const toastEl = h("div", { class: "ads-toast", role: "status", "aria-live": "polite", hidden: true });
  root.append(top, rail, panel, canvas, foot, toastEl);

  const shell = {
    el: root, get mode() { return mode; }, get designId() { return designId; }, get projectId() { return projectId; },
    setSaved, setTitle, toast, openPanel, closePanel, pushRecent, setMode: (m) => applyMode(m), refresh, setDesignId, setProjectId: (id) => { projectId = id; vk = null; },
    panel: (id) => panelBody(id), slots: null,
    notes: (i) => LS.get(nkey(i), "") || "", makeCopy: () => makeCopy(), saveVersion: (label = "Saved by the app") => snapshot(label), download: (anchor) => downloadSheet(anchor || shareB),
  };

  // ----- toast
  let toastT = 0;
  function toast(msg, ms = 2600) { toastEl.textContent = String(msg || ""); toastEl.hidden = false; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => { toastEl.classList.remove("on"); toastEl.hidden = true; }, ms); }

  // ----- popovers (menus and small dialogs)
  function closePop(focusBack = true) {
    if (!pop) return;
    const { el: p, anchor } = pop; pop = null; p.remove();
    anchor?.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside, true);
    if (focusBack && anchor?.isConnected && anchor.offsetParent) anchor.focus({ preventScroll: true });
  }
  function outside(e) { if (pop && !pop.el.contains(e.target) && !pop.anchor?.contains(e.target)) closePop(false); }
  function popover(anchor, build, { role = "menu", label = "", name = "" } = {}) {
    if (pop && pop.anchor === anchor && pop.name === name) { closePop(); return null; }
    closePop(false);
    const p = h("div", { class: "ads-pop", role, "aria-label": label, tabindex: "-1", "data-pop": name });
    build(p);
    root.append(p);
    pop = { el: p, anchor, name };
    anchor?.setAttribute("aria-expanded", "true");
    place(p, anchor);
    const first = p.querySelector('[role^="menuitem"], button, input, select, textarea, a[href]');
    (first || p).focus({ preventScroll: true });
    setTimeout(() => pop?.el === p && document.addEventListener("pointerdown", outside, true));
    p.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = [...p.querySelectorAll('[role^="menuitem"]:not([disabled])')]; if (!items.length) return;
      e.preventDefault(); const i = items.indexOf(document.activeElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
    });
    return p;
  }
  function place(p, anchor) {
    const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: 80, bottom: 80 };
    const pw = p.offsetWidth, ph = p.offsetHeight;
    const up = r.top > innerHeight / 2 && r.bottom + ph + 8 > innerHeight;
    let left = r.right - pw > 8 && r.left + pw > innerWidth - 8 ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, innerWidth - pw - 8));
    const topPx = up ? Math.max(8, r.top - ph - 6) : Math.min(r.bottom + 6, innerHeight - ph - 8);
    p.style.left = left + "px"; p.style.top = Math.max(8, topPx) + "px";
  }
  const menuItem = (label, act, { iconName, checked, hint, role = "menuitem" } = {}) => {
    const b = h("button", { type: "button", class: "ads-mi", role, "aria-checked": checked == null ? null : String(!!checked), html: (iconName ? icon(iconName) : '<span class="ads-i"></span>') + '<span class="ads-mi-t"><b></b><small></small></span>' + (checked ? icon("check", "ads-mi-ok") : "") });
    b.querySelector("b").textContent = label; if (hint) b.querySelector("small").textContent = hint; else b.querySelector("small").remove();
    b.addEventListener("click", async () => { closePop(false); try { await act?.(); } catch (e) { toast(e?.message || "That did not work. Please try again."); } });
    return b;
  };
  const menuHead = (t) => h("div", { class: "ads-mh", role: "presentation", text: t });

  // ----- top bar
  const home = h("a", { class: "ads-tb ads-icon-only", href: opts.home || "/", "aria-label": "Home", title: "Home", html: icon("home") });
  const fileB = mk("ads-tb ads-desk", "File menu", null, "File", () => fileMenu(fileB), { "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "file" });
  const resizeB = opts.resize ? mk("ads-tb ads-desk", opts.resize.label || "Resize", null, opts.resize.label || "Resize", () => opts.resize.open?.(resizeB), { "data-ads": "resize" }) : null;
  const modeB = h("button", { type: "button", class: "ads-tb ads-desk ads-mode", "aria-label": "Editing mode", "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "mode", html: icon("pencil") + '<span class="ads-l">Editing</span>' + icon("chev", "ads-chev") });
  modeB.addEventListener("click", () => modeMenu(modeB));
  const save = h("span", { class: "ads-save", role: "status", "aria-live": "polite", "data-state": "saved", title: "Saved on this device", html: icon("cloudOk") + '<span class="ads-save-t">Saved on this device</span>' });
  const title = h("input", { class: "ads-title", type: "text", value: opts.title || "", placeholder: `Untitled design - ${kind}`, "aria-label": "Design title", spellcheck: "false", maxlength: "120" });
  let titleWas = title.value;
  title.addEventListener("focus", () => { titleWas = title.value; });
  title.addEventListener("keydown", (e) => { if (e.key === "Enter") title.blur(); if (e.key === "Escape") { title.value = titleWas; title.blur(); e.stopPropagation(); } });
  title.addEventListener("change", () => { const t = title.value.trim(); title.value = t; titleWas = t; opts.onTitle?.(t); });
  const avatar = h("button", { type: "button", class: "ads-avatar ads-desk", "aria-label": "Your account", title: "You", "aria-haspopup": "menu", "aria-expanded": "false", text: "Y", "data-ads": "avatar" });
  avatar.addEventListener("click", () => avatarMenu(avatar));
  const insightsB = btn("ads-tb ads-sq ads-desk", "Design insights", "insights", "", () => insightsPop(insightsB), { "data-ads": "insights", "aria-haspopup": "dialog", "aria-expanded": "false" });
  const commentsB = btn("ads-tb ads-sq ads-desk", "Comments", "comment", "", () => togglePanel("comments"), { "data-ads": "comments" });
  const cBadge = h("span", { class: "ads-badge", hidden: true }); commentsB.append(cBadge);
  const shareB = mk("ads-share", "Share", "share", "Share", () => sharePop(shareB), { "aria-haspopup": "dialog", "aria-expanded": "false", "data-ads": "share" });
  // opts.present = { label?, act(anchor) } adds a Present button next to Share (presentations, whiteboards).
  // opts.present.items = [{ label, hint?, icon?, act }] turns Present into a menu (full screen, presenter view, record…).
  const presentB = opts.present ? mk("ads-tb ads-desk ads-present", opts.present.label || "Present", "present", opts.present.label || "Present", () => {
    const items = opts.present.items || [];
    if (!items.length) { opts.present.act?.(presentB); return; }
    popover(presentB, (p) => { for (const it of items) p.append(menuItem(it.label, () => it.act?.(presentB), { iconName: it.icon || "present", hint: it.hint })); }, { label: "Present", name: "present" });
  }, { "data-ads": "present" }) : null;
  const inviteB = btn("ads-tb ads-sq ads-desk ads-invite", "Invite people", "invite", "", () => sharePop(shareB, true), { "data-ads": "invite" });
  const moreB = btn("ads-tb ads-sq ads-mob", "More options", "more", "", () => moreMenu(moreB), { "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "more" });
  top.append(home, fileB, resizeB || "", modeB, h("span", { class: "ads-sep ads-desk", "aria-hidden": "true" }), save, h("span", { class: "ads-grow" }), title, avatar, inviteB, insightsB, commentsB, presentB || "", shareB, moreB);

  // ----- rail + panel
  const known = (id) => !!appPanels[id] || ({ templates: !!opts.templates, brand: true, uploads: !!opts.insert?.image, projects: !!opts.projects, apps: true, translate: !!(opts.getText || opts.setText), comments: true, notes: true, outline: !!bottom.outline, versions: canVersions() }[id] ?? false);
  function canVersions() { return !!(opts.versions || opts.projects?.save); }
  const meta = (id) => { const a = appPanels[id]; const m = PANEL_META[id] || [id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, " "), "apps"]; return { label: (a && a.label) || m[0], icon: (a && a.icon) || m[1] }; };
  const railIds = (opts.rail ? [...opts.rail] : [...DEFAULT_RAIL, ...Object.keys(appPanels).filter((k) => !DEFAULT_RAIL.includes(k) && !OFF_RAIL.has(k))]).filter(known);
  const railBtns = new Map();
  for (const id of railIds) {
    const m = meta(id);
    const b = h("button", { type: "button", class: "ads-rb", "data-panel": id, "aria-label": m.label, "aria-pressed": "false", "aria-controls": panel.id, html: (P[m.icon] ? icon(m.icon) : `<span class="ads-i">${m.icon}</span>`) + '<span class="ads-rl"></span>' });
    b.querySelector(".ads-rl").textContent = m.label;
    b.addEventListener("click", () => togglePanel(id));
    railBtns.set(id, b); rail.append(b);
  }
  rail.addEventListener("keydown", (e) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }; if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
    const bs = [...railBtns.values()], i = bs.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); bs[e.key === "Home" ? 0 : e.key === "End" ? bs.length - 1 : (i + keys[e.key] + bs.length) % bs.length].focus();
  });
  const grip = h("div", { class: "ads-grip", "aria-hidden": "true" }, h("span"));
  const pTitle = h("h2", { class: "ads-ptitle" });
  const pClose = btn("ads-pclose", "Close panel", "close", "", () => closePanel());
  const scroll = h("div", { class: "ads-pscroll" });
  const handle = h("button", { type: "button", class: "ads-handle", "aria-label": "Hide panel", title: "Hide panel", "aria-controls": panel.id, "aria-expanded": "false", html: icon("left") });
  handle.addEventListener("click", () => (active ? closePanel() : openPanel(last || railIds[0] || "notes")));
  panel.append(grip, h("div", { class: "ads-phead" }, pTitle, pClose), scroll, handle);
  const bodies = new Map();
  function panelBody(id) {
    let b = bodies.get(id);
    if (!b) { b = h("div", { class: "ads-pbody", "data-panel": id, hidden: true }); scroll.append(b); bodies.set(id, b); renderPanel(id, b); }
    return b;
  }
  function renderPanel(id, b) {
    b.replaceChildren();
    try {
      const a = appPanels[id];
      if (a) {
        const fn = typeof a === "function" ? a : a.render;
        if (typeof a === "object" && a.search) { const host = h("div", { class: "ads-shost" }); b.append(searchBox(typeof a.search === "string" ? a.search : `Search ${meta(id).label.toLowerCase()}`, host, a.searchItems), host); fn?.(host, shell); }
        else fn?.(b, shell);
        for (const el of b.querySelectorAll("[data-ads-drag]")) el.draggable = true;
        return;
      }
      ({ templates: renderTemplates, brand: renderBrand, uploads: renderUploads, projects: renderProjects, apps: renderApps, translate: renderTranslate, comments: renderComments, notes: renderNotes, versions: renderVersions, outline: (el) => bottom.outline?.(el, shell) })[id]?.(b);
    } catch (e) { console.error(e); b.append(h("p", { class: "ads-muted", text: "This panel could not open. " + (e?.message || "") })); }
  }
  function openPanel(id) {
    if (!id || !known(id)) return;
    const fresh = !bodies.has(id);
    const b = panelBody(id);
    if (!fresh && (REFRESH.has(id) || appPanels[id]?.refresh)) renderPanel(id, b);
    for (const [k, x] of bodies) x.hidden = k !== id;
    active = last = id;
    pTitle.textContent = meta(id).label;
    root.classList.remove("ads-collapsed"); root.dataset.panel = id; root.classList.toggle("ads-plain-head", id === "templates");
    for (const [k, rb] of railBtns) { rb.classList.toggle("on", k === id); rb.setAttribute("aria-pressed", String(k === id)); }
    commentsB.classList.toggle("on", id === "comments");
    handle.setAttribute("aria-expanded", "true"); handle.setAttribute("aria-label", "Hide panel"); handle.title = "Hide panel";
    panel.style.removeProperty("--ads-drag");
    syncBottomButtons();
    b._shown?.();
    opts.onPanel?.(id);
  }
  function closePanel() {
    active = null; root.classList.add("ads-collapsed"); root.dataset.panel = "";
    for (const rb of railBtns.values()) { rb.classList.remove("on"); rb.setAttribute("aria-pressed", "false"); }
    commentsB.classList.remove("on");
    handle.setAttribute("aria-expanded", "false"); handle.setAttribute("aria-label", "Show panel"); handle.title = "Show panel";
    panel.style.removeProperty("--ads-drag");
    syncBottomButtons();
    opts.onPanel?.(null);
  }
  function togglePanel(id) { if (active === id) closePanel(); else openPanel(id); }

  // Bottom sheet drag (phones): drag the grip down to close it.
  let drag = null;
  grip.addEventListener("pointerdown", (e) => { if (!isMobile()) return; drag = { y: e.clientY, dy: 0 }; grip.setPointerCapture(e.pointerId); });
  grip.addEventListener("pointermove", (e) => { if (!drag) return; drag.dy = Math.max(0, e.clientY - drag.y); panel.style.setProperty("--ads-drag", drag.dy + "px"); });
  const endDrag = () => { if (!drag) return; const close = drag.dy > 80; drag = null; panel.style.removeProperty("--ads-drag"); if (close) closePanel(); };
  grip.addEventListener("pointerup", endDrag); grip.addEventListener("pointercancel", endDrag);

  // ----- drag from a panel onto the canvas (templates, uploads, brand colours and logos, app items with data-ads-drag)
  const DND = "application/x-asaandesk";
  function dragPayload(el, payload) {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => { e.dataTransfer.setData(DND, JSON.stringify(payload)); e.dataTransfer.setData("text/plain", payload.name || payload.value || payload.id || ""); e.dataTransfer.effectAllowed = "copy"; root.classList.add("ads-dragging"); });
    el.addEventListener("dragend", () => { root.classList.remove("ads-dragging"); stageSlot.classList.remove("ads-dropping"); });
  }
  // App panels: any element with data-ads-drag="<json or text>" can be dragged; the drop calls opts.onDrop(data, point).
  scroll.addEventListener("pointerdown", (e) => { const t = e.target.closest?.("[data-ads-drag]"); if (t && !t.draggable) t.draggable = true; });
  scroll.addEventListener("dragstart", (e) => {
    if ([...(e.dataTransfer?.types || [])].includes(DND)) return;
    const t = e.target.closest?.("[data-ads-drag]"); if (!t) return;
    let data = t.dataset.adsDrag; try { data = JSON.parse(data); } catch {}
    e.dataTransfer.setData(DND, JSON.stringify({ kind: "item", panel: active, data })); e.dataTransfer.setData("text/plain", t.getAttribute("aria-label") || ""); e.dataTransfer.effectAllowed = "copy"; root.classList.add("ads-dragging");
  });
  scroll.addEventListener("dragend", () => { root.classList.remove("ads-dragging"); stageSlot.classList.remove("ads-dropping"); });
  async function dropOnStage(p, pt) {
    const ins = opts.insert || {};
    if (p.kind === "template") { const r = await opts.templates?.apply?.(p.id); if (r !== false) pushRecent(p.id); return; }
    if (p.kind === "upload") { const it = await upTx("readonly", (st) => st.get(p.id)); if (it && ins.image) { await ins.image(it.data, it.name, pt); toast("Image added"); } return; }
    if (p.kind === "image" && ins.image) { await ins.image(p.src, p.name || "image", pt); toast("Image added"); return; }
    if (p.kind === "color" && ins.color) { await ins.color(p.value, pt); toast(`Colour ${p.value} applied`); return; }
    if (p.kind === "item") { if (opts.onDrop) await opts.onDrop(p.data, pt, p); else if (ins.item) await ins.item(p.data, pt); else toast("Click the item to add it."); }
  }
  shell.dragPayload = dragPayload;

  // ----- canvas: floating toolbar pill, optional formula bar, the app's stage, view-mode cover and chip
  const pill = h("div", { class: "ads-pill", role: "toolbar", "aria-label": `${kind} toolbar` });
  const formula = h("div", { class: "ads-formula" });
  const stageSlot = h("div", { class: "ads-stage" });
  const cover = h("div", { class: "ads-cover", hidden: true, "aria-hidden": "true" });
  const chip = h("button", { type: "button", class: "ads-chip", hidden: true, "data-ads": "chip", html: icon("eye") + '<span class="ads-l">Viewing</span>' });
  chip.addEventListener("click", () => applyMode("edit"));
  if (opts.toolbar) pill.append(opts.toolbar); else pill.hidden = true;
  if (opts.formulaBar) formula.append(opts.formulaBar); else formula.hidden = true;
  stageSlot.append(opts.stage || h("div"), cover);
  const ours = (e) => [...(e.dataTransfer?.types || [])].includes(DND);
  stageSlot.addEventListener("dragover", (e) => { if (!ours(e) || mode !== "edit") return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; stageSlot.classList.add("ads-dropping"); }, true);
  stageSlot.addEventListener("dragleave", (e) => { if (!stageSlot.contains(e.relatedTarget)) stageSlot.classList.remove("ads-dropping"); });
  stageSlot.addEventListener("drop", (e) => {
    if (!ours(e)) return;
    e.preventDefault(); e.stopPropagation(); stageSlot.classList.remove("ads-dropping"); root.classList.remove("ads-dragging");
    if (mode !== "edit") return;
    let p = null; try { p = JSON.parse(e.dataTransfer.getData(DND)); } catch {}
    const r = stageSlot.getBoundingClientRect();
    if (p) dropOnStage(p, { x: e.clientX - r.left, y: e.clientY - r.top, clientX: e.clientX, clientY: e.clientY }).catch((err) => toast(err?.message || "Could not add it."));
  }, true);
  canvas.append(pill, formula, stageSlot, chip);

  // ----- bottom bar
  const B = {};
  if (bottom.notes !== false) B.notes = mk("ads-bb", "Notes", "notes", "Notes", () => togglePanel("notes"), { "data-ads": "notes" });
  if (bottom.outline) B.outline = mk("ads-bb", "Outline", "outline", "Outline", () => togglePanel("outline"), { "data-ads": "outline" });
  if (bottom.timer !== false) B.timer = mk("ads-bb", "Timer", "timer", "Timer", () => timerPop(B.timer), { "data-ads": "timer", "aria-haspopup": "dialog", "aria-expanded": "false" });
  foot.append(...Object.values(B), h("span", { class: "ads-grow" }));
  const Z = bottom.zoom;
  let zr = null, zi = null, setZ = () => {};
  if (Z) {
    zr = h("input", { type: "range", class: "ads-zoom", min: Z.min ?? 10, max: Z.max ?? 400, step: Z.step ?? 1, value: Z.get?.() ?? 100, "aria-label": "Zoom", "data-ads": "zoom" });
    zi = h("input", { type: "text", class: "ads-zoomi", inputmode: "numeric", value: Math.round(Z.get?.() ?? 100) + "%", "aria-label": "Zoom percent", "data-ads": "zoom-pct" });
    setZ = (v) => { v = Math.max(+zr.min, Math.min(+zr.max, Math.round(+v || 100))); zr.value = v; zi.value = v + "%"; try { Z.set?.(v); } catch (e) { console.error(e); } };
    zr.addEventListener("input", () => setZ(zr.value));
    zi.addEventListener("change", () => setZ(parseFloat(zi.value)));
    zi.addEventListener("keydown", (e) => { if (e.key === "Enter") { setZ(parseFloat(zi.value)); zi.blur(); } });
    zi.addEventListener("focus", () => zi.select());
    const zm = btn("ads-bb ads-zchev", "Zoom presets", "chev", "", () => popover(zm, (p) => {
      if (Z.fit) p.append(menuItem("Fit to screen", () => { Z.fit(); refresh(); }, { iconName: "fit" }));
      for (const v of [25, 50, 75, 100, 125, 150, 200, 300, 400]) if (v >= +zr.min && v <= +zr.max) p.append(menuItem(`${v}%`, () => setZ(v), { checked: +zr.value === v, role: "menuitemradio" }));
    }, { label: "Zoom presets", name: "zoom" }), { "data-ads": "zoom-menu", "aria-haspopup": "menu", "aria-expanded": "false" });
    foot.append(h("span", { class: "ads-zoomwrap" }, zr, zi, zm));
  }
  const PG = bottom.pages;
  let pagesB = null, countB = null, gridB = null, stripB = null;
  if (PG) {
    pagesB = mk("ads-bb", "Pages", "pages", "Pages", () => pagesPop(pagesB), { "data-ads": "pages", "aria-haspopup": "menu", "aria-expanded": "false" });
    countB = h("button", { type: "button", class: "ads-bb ads-count", "aria-label": "Page 1 of 1", "data-ads": "page-count", text: "1 / 1" });
    countB.addEventListener("click", () => pagesPop(countB));
    gridB = btn("ads-bb", "Grid view", "grid", "", () => gridView(), { "data-ads": "grid" });
    stripB = btn("ads-bb", "Show the page strip", "slides", "", () => toggleStrip(), { "data-ads": "strip-toggle", "aria-pressed": "false" });
    foot.append(pagesB, countB, stripB, gridB);
  }
  let fsB = null, helpB = null;
  if (bottom.fullscreen !== false) { fsB = btn("ads-bb", "Full screen", "expand", "", () => toggleFullscreen(), { "data-ads": "fullscreen", "aria-pressed": "false" }); foot.append(fsB); }
  if (bottom.help !== false) { helpB = btn("ads-bb", "Help and keyboard shortcuts", "help", "", () => helpPop(helpB), { "data-ads": "help", "aria-haspopup": "dialog", "aria-expanded": "false" }); foot.append(helpB); }
  // Page strip above the bottom bar (the "Pages" view): one card per page, click to go there, drag to reorder.
  const strip = h("div", { class: "ads-strip", hidden: true, role: "group", "aria-label": "Pages", "data-ads": "strip" });
  let stripSig = "";
  // pages.name(i) (optional): section / slide names shown instead of "Page 3".
  const pageName = (i) => { try { const n = PG?.name?.(i); return n ? String(n) : ""; } catch { return ""; } };
  const pageLabel = (i) => { const n = pageName(i); return n ? `${i + 1}. ${n}` : `Page ${i + 1}`; };
  const pageThumb = (i, box) => { let th = null; try { th = PG.thumb?.(i); } catch {} if (th?.nodeType) box.append(th); else if (typeof th === "string" && th.startsWith("<svg")) box.innerHTML = th; else if (typeof th === "string" && th) box.append(h("img", { src: th, alt: "" })); else box.textContent = String(i + 1); };
  const PMIME = "application/x-asaandesk-page";
  function pageDnD(el, i) {
    if (!PG?.move) return;
    el.draggable = true;
    el.addEventListener("dragstart", (e) => { e.dataTransfer.setData(PMIME, String(i)); e.dataTransfer.effectAllowed = "move"; });
    el.addEventListener("dragover", (e) => { if ([...e.dataTransfer.types].includes(PMIME)) { e.preventDefault(); el.classList.add("ads-over"); } });
    el.addEventListener("dragleave", () => el.classList.remove("ads-over"));
    el.addEventListener("drop", (e) => { const from = +e.dataTransfer.getData(PMIME); el.classList.remove("ads-over"); if (Number.isFinite(from) && from !== i) { e.preventDefault(); PG.move(from, i); stripSig = ""; refresh(); if (grid) { closeGrid(); gridView(); } } });
  }
  function drawStrip() {
    if (!PG || strip.hidden) return;
    let n = 1, cur = 0; try { n = PG.count(); cur = PG.current(); } catch {}
    let names = ""; for (let i = 0; i < n && PG.name; i++) names += pageName(i) + "|";
    const sig = `${n}:${cur}:${names}`; if (sig === stripSig) return; stripSig = sig;
    strip.replaceChildren();
    for (let i = 0; i < n; i++) {
      const box = h("span", { class: "ads-sthumb" }); pageThumb(i, box);
      const nm = pageName(i);
      const c = h("button", { type: "button", class: "ads-scard" + (i === cur ? " on" : ""), "aria-label": nm ? `Page ${i + 1}: ${nm}` : `Page ${i + 1}`, title: nm || null, "aria-current": i === cur ? "page" : null, "data-page": i }, box, h("span", { class: "ads-snum", text: nm ? pageLabel(i) : String(i + 1) }));
      c.addEventListener("click", () => { PG.go?.(i); refresh(); });
      pageDnD(c, i);
      strip.append(c);
    }
    if (PG.add) strip.append(h("button", { type: "button", class: "ads-scard ads-sadd", "aria-label": "Add page", "data-ads": "strip-add", html: icon("plus"), onclick: () => { PG.add(); refresh(); } }));
  }
  function toggleStrip(on = strip.hidden) { strip.hidden = !on; stripB?.classList.toggle("on", on); stripB?.setAttribute("aria-pressed", String(on)); stripB?.setAttribute("aria-label", on ? "Hide the page strip" : "Show the page strip"); if (stripB) stripB.title = stripB.getAttribute("aria-label"); stripSig = ""; drawStrip(); }
  if (PG) canvas.append(strip);
  function syncBottomButtons() { B.notes?.classList.toggle("on", active === "notes"); B.outline?.classList.toggle("on", active === "outline"); }

  // ----- menus
  function fileMenu(anchor) {
    popover(anchor, (p) => {
      p.append(h("div", { class: "ads-pophead" }, h("b", { text: title.value || title.placeholder }), h("small", { text: `${kind} · saved on this device` })));
      const groups = new Map();
      for (const it of opts.file || []) { const g = it.group || ""; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(it); }
      for (const [g, items] of groups) {
        if (g) p.append(menuHead(g));
        for (const it of items) { const b = menuItem(it.label, it.act, { iconName: it.icon || (g === "Download" ? "download" : null), hint: it.hint }); if (it.disabled) b.disabled = true; p.append(b); }
      }
      p.append(h("hr", { class: "ads-hr" }));
      const has = (re) => (opts.file || []).some((it) => re.test(it.label || ""));
      if (known("uploads") && !has(/^upload/i)) p.append(menuItem("Upload files", () => openPanel("uploads"), { iconName: "uploads" }));
      if (opts.projects && !has(/make a copy/i)) p.append(menuItem("Make a copy", () => makeCopy(), { iconName: "copy", hint: "Saved in Projects, then opened" }));
      if (downloads().length) p.append(menuItem("Download…", () => setTimeout(() => downloadSheet(anchor)), { iconName: "download", hint: "Choose the file type and pages" }));
      if (canVersions() && !has(/version history/i)) p.append(menuItem("Version history", () => openPanel("versions"), { iconName: "history", hint: "Go back to an earlier version" }));
      if (opts.projects) p.append(menuItem("Save to projects", () => saveToProjects(), { iconName: "projects", hint: "Keep a copy on this device" }));
      p.append(menuItem("Notes", () => openPanel("notes"), { iconName: "notes" }));
      p.append(menuItem("Help and shortcuts", () => helpPop(helpB || anchor), { iconName: "help" }));
    }, { label: "File", name: "file" });
  }
  const MODES = { edit: ["Editing", "pencil", "Change anything"], comment: ["Commenting", "comment", "Add comments only"], view: ["Viewing", "eye", "Read only, no changes"] };
  function modeItems(p) { for (const [m, [label, ic, hint]] of Object.entries(MODES)) p.append(menuItem(label, () => applyMode(m), { iconName: ic, hint, checked: mode === m, role: "menuitemradio" })); }
  function modeMenu(anchor) { popover(anchor, (p) => modeItems(p), { label: "Editing mode", name: "mode" }); }
  function avatarMenu(anchor) {
    popover(anchor, (p) => {
      p.append(h("div", { class: "ads-pophead ads-me" }, h("span", { class: "ads-avatar sm", text: "Y", "aria-hidden": "true" }), h("span", {}, h("b", { text: "You" }), h("small", { text: "Your work is saved on this device only. Nothing is uploaded." }))));
      if (opts.projects) p.append(menuItem("Your projects", () => openPanel("projects"), { iconName: "projects" }));
      p.append(menuItem("Brand kit", () => openPanel("brand"), { iconName: "brand" }));
      p.append(menuItem(spot.hidden ? "Spotlight" : "End spotlight", () => spotlight(), { iconName: "eye", hint: "Dim everything except this page or selection" }));
      p.append(menuItem("Keyboard shortcuts", () => helpPop(helpB || anchor), { iconName: "help" }));
      p.append(menuItem(`Back to ${kind} home`, () => { location.href = opts.home || "/"; }, { iconName: "home" }));
    }, { label: "Account", name: "avatar" });
  }
  function moreMenu(anchor) {
    popover(anchor, (p) => {
      p.append(menuItem("File", () => setTimeout(() => fileMenu(moreB)), { iconName: "doc" }));
      if (opts.resize) p.append(menuItem(opts.resize.label || "Resize", () => opts.resize.open?.(moreB), { iconName: "resize" }));
      if (opts.present) for (const it of opts.present.items?.length ? opts.present.items : [{ label: opts.present.label || "Present", act: opts.present.act }]) p.append(menuItem(it.label, () => it.act?.(moreB), { iconName: it.icon || "present", hint: it.hint }));
      p.append(menuHead("Mode")); modeItems(p);
      p.append(h("hr", { class: "ads-hr" }));
      p.append(menuItem("Comments", () => openPanel("comments"), { iconName: "comment" }));
      p.append(menuItem("Design insights", () => setTimeout(() => insightsPop(moreB)), { iconName: "insights" }));
      p.append(menuItem(spot.hidden ? "Spotlight" : "End spotlight", () => spotlight(), { iconName: "eye" }));
    }, { label: "More options", name: "more" });
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {
      const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = t; root.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok;
    }
  }
  // Downloads: share.download, else File items in a "Download" group. act({ pages: "all" | "current", page }) is called.
  const downloads = () => (opts.share?.download?.length ? opts.share.download : (opts.file || []).filter((it) => /download/i.test(it.group || "")));
  const shareLink = () => { try { return opts.share?.link?.() || location.href; } catch { return location.href; } };
  function sharePop(anchor, invite = false) {
    popover(anchor, (p) => {
      p.classList.add("ads-wide");
      p.append(h("div", { class: "ads-pophead" }, h("b", { text: invite ? "Invite people" : "Share this design" }), h("small", { "data-ads": "share-note", text: invite ? "AsaanDesk has no accounts yet, so nobody can join this design live. Send a copy instead: download a file, or share the editor link." : "Your design is saved on this device. Download a file to send it, or share the editor link." })));
      const row = h("div", { class: "ads-row" });
      row.append(mk("ads-btn", "Copy link", "link", "Copy link", async () => { toast((await copyText(shareLink())) ? "Link copied" : "Could not copy. Select the address bar instead."); }, { "data-ads": "copy-link" }));
      if (navigator.share) row.append(mk("ads-btn", "Share from this device", "device", "Share…", async () => { try { await navigator.share({ title: title.value || title.placeholder, url: shareLink() }); } catch (e) { if (e?.name !== "AbortError") toast("Sharing did not work on this device."); } }, { "data-ads": "device-share" }));
      p.append(row);
      const tiles = h("div", { class: "ads-tiles", role: "group", "aria-label": "Share options" });
      const tile = (label, ic, onclick, extra = {}) => h("button", { type: "button", class: "ads-tile", "aria-label": label, html: icon(ic) + '<span class="ads-l"></span>', onclick, ...extra });
      const subject = () => encodeURIComponent(title.value || title.placeholder);
      if (downloads().length) tiles.append(setText(tile("Download", "download", () => setTimeout(() => downloadSheet(anchor)), { "data-ads": "share-download" }), "Download"));
      if (opts.present) tiles.append(setText(tile(opts.present.label || "Present", "present", () => { closePop(false); const first = opts.present.items?.[0]; if (first) first.act?.(anchor); else opts.present.act?.(anchor); }, { "data-ads": "share-present" }), opts.present.label || "Present"));
      tiles.append(setText(h("a", { class: "ads-tile", href: `mailto:?subject=${subject()}&body=${encodeURIComponent(shareLink())}`, "aria-label": "Send the link by email", "data-ads": "share-email", html: icon("mail") + '<span class="ads-l"></span>' }), "Email"));
      tiles.append(setText(h("a", { class: "ads-tile", href: `https://wa.me/?text=${encodeURIComponent((title.value || title.placeholder) + " " + shareLink())}`, target: "_blank", rel: "noopener", "aria-label": "Send the link on WhatsApp", "data-ads": "share-whatsapp", html: icon("comment") + '<span class="ads-l"></span>' }), "WhatsApp"));
      if (opts.share?.print) tiles.append(setText(tile("Print", "print", () => { closePop(false); opts.share.print(); }, { "data-ads": "share-print" }), "Print"));
      if (opts.share?.website) tiles.append(setText(tile(opts.share.website.label || "Website", "web", () => { closePop(false); opts.share.website.act?.(anchor); }, { "data-ads": "share-website" }), opts.share.website.label || "Website"));
      p.append(tiles);
      if (opts.share?.social) p.append(h("p", { class: "ads-muted ads-note", text: "Posting straight to Instagram, Facebook or TikTok needs an account connection AsaanDesk does not have. Download the file, then post it from the app." }));
      const dl = downloads();
      if (dl.length) { p.append(menuHead("Quick download")); for (const d of dl) p.append(menuItem(d.label, d.act, { iconName: d.icon || "download", hint: d.hint })); }
    }, { role: "dialog", label: "Share", name: "share" });
  }
  // Download options sheet (File > Download…, Share > Download): file type + pages, then the app's act().
  function downloadSheet(anchor) {
    const dl = downloads(); if (!dl.length) return;
    popover(anchor, (p) => {
      p.classList.add("ads-wide");
      p.append(h("div", { class: "ads-pophead" }, h("b", { text: "Download" }), h("small", { text: "Made on this device. Nothing is uploaded." })));
      const type = h("select", { class: "ads-in", "aria-label": "File type", "data-ads": "dl-type" });
      dl.forEach((d, i) => type.append(h("option", { value: String(i), text: d.label.replace(/^Download\s+/i, "") })));
      p.append(h("label", { class: "ads-field" }, h("span", { text: "File type" }), type));
      let pages = null;
      if (PG) {
        let n = 1, cur = 0; try { n = PG.count(); cur = PG.current(); } catch {}
        pages = h("select", { class: "ads-in", "aria-label": "Pages", "data-ads": "dl-pages" }, h("option", { value: "all", text: `All pages (${n})` }), h("option", { value: "current", text: `Current page (${cur + 1})` }));
        p.append(h("label", { class: "ads-field" }, h("span", { text: "Pages" }), pages));
      }
      // Document size (Canva Docs: "Choose the document size you want to download in"), for the types that use it.
      let size = null;
      if (opts.share?.sizes?.length) {
        size = h("select", { class: "ads-in", "aria-label": "Document size", "data-ads": "dl-size" });
        for (const s of opts.share.sizes) size.append(h("option", { value: s.value, text: s.label }));
        const sizeField = h("label", { class: "ads-field" }, h("span", { text: "Document size" }), size);
        p.append(sizeField);
        const sync = () => { const d = dl[+type.value] || dl[0]; sizeField.hidden = !d?.sized; };
        type.addEventListener("change", sync); sync();
      }
      p.append(mk("ads-btn primary ads-block", "Download", "download", "Download", async () => {
        const d = dl[+type.value] || dl[0]; let cur = 0; try { cur = PG?.current() ?? 0; } catch {}
        closePop(false);
        try { await d.act?.({ pages: pages?.value || "all", page: cur, ...(size && d.sized ? { size: size.value } : {}) }); } catch (e) { toast(e?.message || "The download did not work. Please try again."); }
      }, { "data-ads": "dl-go" }));
    }, { role: "dialog", label: "Download", name: "download" });
  }
  async function makeCopy() {
    const r = (await opts.projects.save?.()) || {};
    const name = `Copy of ${r.name || title.value || title.placeholder}`;
    const rec = await saveProject({ ...r, id: undefined, app: r.app || app, name, data: r.data ?? null, thumb: r.thumb || "" });
    try { await opts.projects.open?.(rec); } catch (e) { toast(e?.message || "The copy is in Projects."); return rec; }
    projectId = rec.id; vk = null; setTitle(name);
    toast("You are editing the copy. The original is in Projects.");
    return rec;
  }
  function insightsPop(anchor) {
    popover(anchor, (p) => {
      let text = ""; try { text = String(opts.getText?.() || ""); } catch {}
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const cs = LS.get(ckey(), []);
      const rows = [["Words", words.toLocaleString()], ["Characters", text.length.toLocaleString()], ["Open comments", String(cs.filter((c) => !c.resolved).length)], ["Notes", (LS.get(nkey(), "") || "").trim() ? "Yes" : "None yet"], ["Time in editor", mmss((Date.now() - started) / 1000)], ["Saved", save.dataset.state === "saved" ? "On this device" : save.querySelector(".ads-save-t").textContent]];
      if (PG) { try { rows.splice(2, 0, ["Pages", String(PG.count())]); } catch {} }
      p.append(h("div", { class: "ads-pophead" }, h("b", { text: "Design insights" }), h("small", { text: "Counted on this device." })));
      p.append(h("dl", { class: "ads-dl" }, rows.map(([k, v]) => [h("dt", { text: k }), h("dd", { text: v })])));
    }, { role: "dialog", label: "Design insights", name: "insights" });
  }
  function helpPop(anchor) {
    popover(anchor, (p) => {
      p.classList.add("ads-wide");
      p.append(h("div", { class: "ads-pophead" }, h("b", { text: "Keyboard shortcuts" }), h("small", { text: `Works in this ${kind.toLowerCase()} editor.` })));
      p.append(h("dl", { class: "ads-dl ads-keys" }, [...(opts.shortcuts || []), ...SHORTCUTS].map(([k, v]) => [h("dt", {}, h("kbd", { text: k })), h("dd", { text: v })])));
      p.append(h("p", { class: "ads-muted ads-note", text: "Tip: press ? to open this list." }));
      p.append(h("a", { class: "ads-btn ads-block", href: opts.home || "/", "data-ads": "help-home", html: icon("help") + `<span class="ads-l">How to use ${kind}</span>` }));
    }, { role: "dialog", label: "Help", name: "help" });
  }
  function pagesPop(anchor) {
    popover(anchor, (p) => {
      let n = 1, cur = 0; try { n = PG.count(); cur = PG.current(); } catch {}
      p.append(menuHead(`Pages (${n})`));
      for (let i = 0; i < n; i++) p.append(menuItem(pageLabel(i), () => { PG.go?.(i); refresh(); }, { iconName: "pages", checked: i === cur, role: "menuitemradio" }));
      if (PG.add) p.append(h("hr", { class: "ads-hr" }), menuItem("Add page", () => { PG.add(); refresh(); }, { iconName: "plus" }));
      p.append(menuItem(strip.hidden ? "Show page strip" : "Hide page strip", () => toggleStrip(), { iconName: "slides", hint: "Thumbnails above the bottom bar" }));
    }, { label: "Pages", name: "pages" });
  }
  let grid = null;
  function gridView() {
    if (grid) { closeGrid(); return; }
    let n = 1, cur = 0; try { n = PG.count(); cur = PG.current(); } catch {}
    grid = h("div", { class: "ads-gridview", role: "dialog", "aria-label": "All pages", "data-ads": "gridview" });
    const list = h("div", { class: "ads-glist" });
    const again = () => { closeGrid(); gridView(); refresh(); };
    for (let i = 0; i < n; i++) {
      const c = h("button", { type: "button", class: "ads-gcard" + (i === cur ? " on" : ""), "aria-label": `Go to ${pageLabel(i)}` });
      const box = h("span", { class: "ads-gthumb" }); pageThumb(i, box);
      c.append(box, h("span", { text: pageLabel(i) }));
      c.addEventListener("click", () => { PG.go?.(i); closeGrid(); refresh(); });
      pageDnD(c, i);
      const acts = h("span", { class: "ads-gact" });
      if (PG.duplicate) acts.append(btn("ads-x", `Duplicate page ${i + 1}`, "copy", "", () => { PG.duplicate(i); again(); }, { "data-ads": "page-duplicate" }));
      if (PG.remove && n > 1) acts.append(btn("ads-x", `Delete page ${i + 1}`, "trash", "", () => { PG.remove(i); again(); }, { "data-ads": "page-delete" }));
      list.append(h("div", { class: "ads-gitem" }, c, acts.children.length ? acts : ""));
    }
    if (PG.add) list.append(h("button", { type: "button", class: "ads-gcard ads-gadd", "aria-label": "Add page", html: icon("plus") + "<span>Add page</span>", onclick: () => { PG.add(); closeGrid(); refresh(); } }));
    grid.append(h("div", { class: "ads-ghead" }, h("b", { text: "All pages" }), h("small", { class: "ads-muted", text: PG.move ? "Drag a page to move it." : "" }), btn("ads-pclose", "Close grid view", "close", "", () => closeGrid())), list);
    canvas.append(grid); gridB?.classList.add("on");
    grid.querySelector(".ads-gcard")?.focus();
  }
  function closeGrid() { grid?.remove(); grid = null; gridB?.classList.remove("on"); }

  // ----- timer (Canva: bottom-bar Timer; keys 1–9 open it with that many minutes; Play, Reset, +1 min; music
  // Focus / Dramatic / Upbeat / Energetic / Lofi; sounds at the start, at 10 seconds left and at the end; volume)
  const timer = { total: 300, left: 300, running: false, t: 0, iv: 0, ten: false };
  function tick() {
    if (!timer.running) return;
    const now = Date.now(); timer.left = Math.max(0, timer.left - (now - timer.t) / 1000); timer.t = now;
    if (!timer.ten && timer.total > 15 && timer.left <= 10 && timer.left > 0) { timer.ten = true; sound("ten"); }
    if (timer.left <= 0) { timer.running = false; clearInterval(timer.iv); timer.left = timer.total; timer.ten = false; musicOff(); toast("Time is up"); sound("end"); }
    drawTimer();
  }
  function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.08 * volume(); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.35); setTimeout(() => a.close(), 600); } catch {} }
  function drawTimer() {
    const busy = timer.running || timer.left < timer.total;
    if (B.timer) { setText(B.timer, busy ? mmss(Math.ceil(timer.left)) : "Timer"); B.timer.classList.toggle("on", busy); B.timer.dataset.running = String(timer.running); }
    const p = pop?.name === "timer" ? pop.el : null;
    if (p) { p.querySelector(".ads-tbig").textContent = mmss(Math.ceil(timer.left)); const pb = p.querySelector('[data-ads="timer-play"]'); pb.innerHTML = icon(timer.running ? "pause" : "play") + `<span class="ads-l">${timer.running ? "Pause" : "Start"}</span>`; pb.setAttribute("aria-label", timer.running ? "Pause timer" : "Start timer"); }
  }
  const MUSIC = "ad-shell-timer-music", MUSIC_STYLE = "ad-shell-timer-music-style", VOL = "ad-shell-timer-volume";
  const musicStyle = () => { const s = LS.get(MUSIC_STYLE, null); return s === null ? (LS.get(MUSIC, false) ? "focus" : "") : s; };
  const volume = () => { const v = +LS.get(VOL, 0.6); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6; };
  let music = null, tm = null;
  const timerMod = () => (tm ||= import("./timer-music.js"));
  const wavUrls = new Map();
  async function wavUrl(kind, make) { if (!wavUrls.has(kind)) { const M = await timerMod(); wavUrls.set(kind, URL.createObjectURL(new Blob([M.wav(make(M))], { type: "audio/wav" }))); } return wavUrls.get(kind); }
  async function sound(kind) {
    try { const a = new Audio(await wavUrl("snd-" + kind, (M) => M.timerSound(kind))); a.volume = volume(); a.dataset.ads = "timer-sound"; await a.play(); } catch { if (kind === "end") beep(); }
  }
  async function musicOn() {
    const st = musicStyle();
    if (music || !st) return;
    music = { style: st, el: null };
    try {
      const url = await wavUrl("music-" + st, (M) => M.musicLoop(st));
      if (!music || music.style !== st || !timer.running) return;
      const el = new Audio(url); el.loop = true; el.volume = volume() * 0.7; music.el = el; root.dataset.music = st;
      await el.play();
    } catch { root.dataset.music = ""; }
  }
  function musicOff() { if (!music) return; try { music.el?.pause(); } catch {} music = null; root.dataset.music = ""; }
  function timerPlay() { if (timer.running) { tick(); timer.running = false; clearInterval(timer.iv); musicOff(); } else { if (timer.left === timer.total) sound("start"); timer.running = true; timer.t = Date.now(); clearInterval(timer.iv); timer.iv = setInterval(tick, 250); musicOn(); } drawTimer(); }
  function timerReset() { timer.running = false; clearInterval(timer.iv); timer.left = timer.total; timer.ten = false; musicOff(); drawTimer(); }
  function timerSet(sec) { timer.total = Math.max(5, Math.min(99 * 60, Math.round(sec))); timerReset(); }
  function timerAdd(sec) { timer.left = Math.min(99 * 60, timer.left + sec); if (!timer.running && timer.left > timer.total) timer.total = timer.left; if (timer.left > 10) timer.ten = false; drawTimer(); }
  function timerPop(anchor) {
    popover(anchor, (p) => {
      p.append(h("div", { class: "ads-pophead" }, h("b", { text: "Timer" }), h("small", { text: "Keep talks and workshops on time. Tip: press 1–9 to set that many minutes." })));
      p.append(h("div", { class: "ads-tbig", "aria-live": "off", "data-ads": "timer-left" }, mmss(Math.ceil(timer.left))));
      const pre = h("div", { class: "ads-row ads-presets", role: "group", "aria-label": "Timer length" });
      const mark = () => pre.querySelectorAll("[data-min]").forEach((b) => b.classList.toggle("on", timer.total === +b.dataset.min * 60));
      for (const m of [1, 2, 5, 10, 15]) pre.append(h("button", { type: "button", class: "ads-btn sm" + (timer.total === m * 60 ? " on" : ""), "aria-label": `${m} minute${m > 1 ? "s" : ""}`, "data-min": m, text: `${m} min`, onclick: () => { timerSet(m * 60); mark(); } }));
      const mins = h("input", { type: "number", class: "ads-in ads-num", min: "0", max: "99", value: String(Math.floor(timer.total / 60)), "aria-label": "Minutes", "data-ads": "timer-min" });
      const secs = h("input", { type: "number", class: "ads-in ads-num", min: "0", max: "59", value: String(timer.total % 60), "aria-label": "Seconds", "data-ads": "timer-sec" });
      const setCustom = () => { timerSet((+mins.value || 0) * 60 + (+secs.value || 0)); mark(); };
      mins.addEventListener("change", setCustom); secs.addEventListener("change", setCustom);
      p.append(pre, h("div", { class: "ads-row ads-tcustom" }, h("span", { text: "Set" }), mins, h("span", { text: "min" }), secs, h("span", { text: "sec" })), h("div", { class: "ads-row" },
        h("button", { type: "button", class: "ads-btn primary", "data-ads": "timer-play", onclick: timerPlay }),
        mk("ads-btn", "Reset timer", "reset", "Reset", timerReset, { "data-ads": "timer-reset" }),
        h("button", { type: "button", class: "ads-btn", "data-ads": "timer-plus1", "aria-label": "Add 1 minute", text: "+1 min", onclick: () => timerAdd(60) })));
      const sel = h("select", { class: "ads-in", "aria-label": "Timer music", "data-ads": "timer-music-style" }, h("option", { value: "", text: "No music" }));
      for (const [id, label] of [["focus", "Focus"], ["dramatic", "Dramatic"], ["upbeat", "Upbeat"], ["energetic", "Energetic"], ["lofi", "Lofi"], ["calm", "Calm"]]) sel.append(h("option", { value: id, text: label }));
      sel.value = musicStyle();
      const applyMusic = () => { LS.set(MUSIC_STYLE, sel.value); LS.set(MUSIC, !!sel.value); musicOff(); if (sel.value && timer.running) musicOn(); };
      sel.addEventListener("change", applyMusic);
      // The older on/off switch (kept for saved settings and checks) now means "Focus music".
      const mus = h("input", { type: "checkbox", "data-ads": "timer-music", hidden: true }); mus.checked = !!musicStyle();
      mus.addEventListener("change", () => { sel.value = mus.checked ? (sel.value || "focus") : ""; applyMusic(); });
      const vol = h("input", { type: "range", min: "0", max: "100", value: String(Math.round(volume() * 100)), "aria-label": "Sound and music volume", "data-ads": "timer-volume" });
      vol.addEventListener("input", () => { LS.set(VOL, +vol.value / 100); if (music?.el) music.el.volume = volume() * 0.7; });
      p.append(h("label", { class: "ads-field", html: icon("music") }, h("span", { text: "Music" }), sel, mus), h("label", { class: "ads-field" }, h("span", { text: "Volume" }), vol),
        h("p", { class: "ads-muted ads-note", text: "Sounds play at the start, at 10 seconds left and at the end. The music is made in your browser." }));
    }, { role: "dialog", label: "Timer", name: "timer" });
    drawTimer();
  }
  // Keys 1–9 open the timer with that many minutes (another number resets it), like Canva; not while typing.
  if (opts.timerKeys && B.timer) document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat || !/^[1-9]$/.test(e.key)) return;
    const t = e.target;
    if (t && (t.closest?.("input,textarea,select,[contenteditable=''],[contenteditable='true']") || t.isContentEditable)) return;
    if (document.querySelector(".ads-pop:not([data-pop='timer'])")) return;
    e.preventDefault();
    timerSet(+e.key * 60);
    if (pop?.name !== "timer") timerPop(B.timer); else { const mi = pop.el.querySelector('[data-ads="timer-min"]'), se = pop.el.querySelector('[data-ads="timer-sec"]'); if (mi) mi.value = e.key; if (se) se.value = "0"; pop.el.querySelectorAll("[data-min]").forEach((b) => b.classList.toggle("on", +b.dataset.min === +e.key)); }
    drawTimer();
  });

  // ----- Spotlight: dims everything except the current page or selection (opts.spotlight.rect() -> client rect;
  // default: the app's stage content). Local focus view only: there are no other viewers to bring along.
  const spot = h("div", { class: "ads-spot", hidden: true, "data-ads": "spotlight" }, h("div", { class: "ads-spot-hole" }),
    h("div", { class: "ads-spot-bar", role: "status" }, h("span", { html: icon("eye") }), h("span", { class: "ads-spot-t", text: "Spotlight: only this part is in focus. It is a focus view on this device; nobody else is watching." }),
      mk("ads-btn sm", "End spotlight", "close", "End spotlight", () => spotlight(false), { "data-ads": "spotlight-end" })));
  let spotIv = 0;
  function spotRect() {
    let r = null; try { r = opts.spotlight?.rect?.(); } catch {}
    if (!r) { const el = opts.stage?.firstElementChild || opts.stage || stageSlot; r = el.getBoundingClientRect(); const s = stageSlot.getBoundingClientRect(); r = { left: Math.max(r.left, s.left), top: Math.max(r.top, s.top), right: Math.min(r.right, s.right), bottom: Math.min(r.bottom, s.bottom) }; }
    const left = r.left ?? r.x, top = r.top ?? r.y, w = r.width ?? (r.right - left), hh = r.height ?? (r.bottom - top);
    return { left, top, width: Math.max(0, w), height: Math.max(0, hh) };
  }
  function placeSpot() { const r = spotRect(), hole = spot.firstElementChild; Object.assign(hole.style, { left: r.left - 6 + "px", top: r.top - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px" }); }
  function spotlight(on = spot.hidden) {
    spot.hidden = !on; root.dataset.spotlight = on ? "on" : "";
    clearInterval(spotIv);
    if (on) { placeSpot(); spotIv = setInterval(placeSpot, 250); toast("Spotlight on. Press Escape to end it."); }
    try { opts.spotlight?.onChange?.(on); } catch {}
    return on;
  }
  shell.spotlight = (on) => spotlight(on);

  // ----- fullscreen
  function toggleFullscreen() {
    const d = document;
    if (d.fullscreenElement) { d.exitFullscreen?.().catch(() => {}); return; }
    if (root.classList.contains("ads-full")) { root.classList.remove("ads-full"); syncFs(); return; }
    const req = d.documentElement.requestFullscreen;
    if (req) d.documentElement.requestFullscreen().catch(() => { root.classList.add("ads-full"); syncFs(); });
    else { root.classList.add("ads-full"); syncFs(); }
  }
  function syncFs() { const on = !!document.fullscreenElement || root.classList.contains("ads-full"); root.dataset.fullscreen = String(on); if (fsB) { fsB.innerHTML = icon(on ? "shrink" : "expand"); fsB.setAttribute("aria-pressed", String(on)); fsB.setAttribute("aria-label", on ? "Exit full screen" : "Full screen"); fsB.title = on ? "Exit full screen" : "Full screen"; } }
  document.addEventListener("fullscreenchange", syncFs);

  // ----- save status, title, mode
  const SAVE = { saved: ["cloudOk", "Saved on this device"], saving: ["cloudUp", "Saving…"], unsaved: ["cloudDot", "Unsaved changes"] };

  function setSaved(state) {
    // An automatic version at most every 10 minutes while the app keeps saving.
    if (state === "saved" && canVersions() && Date.now() - lastAuto > 600000) { lastAuto = Date.now(); snapshot("Auto-saved").catch(() => {}); }
    const [ic, t] = SAVE[state] || SAVE.saved; save.dataset.state = SAVE[state] ? state : "saved"; save.innerHTML = icon(ic) + '<span class="ads-save-t"></span>'; save.querySelector(".ads-save-t").textContent = t; save.title = t; save.setAttribute("aria-label", t); }
  function setTitle(t) { title.value = t == null ? "" : String(t); titleWas = title.value; }
  function applyMode(m) {
    if (!MODES[m]) return;
    mode = m; root.dataset.mode = m;
    modeB.querySelector(".ads-l").textContent = MODES[m][0];
    modeB.firstElementChild.outerHTML = icon(MODES[m][1]);
    cover.hidden = m === "edit" || (m === "comment" && !!opts.comment?.passThrough); chip.hidden = m === "edit";
    chip.querySelector(".ads-l").textContent = m === "view" ? "Viewing" : "Commenting";
    chip.setAttribute("aria-label", `${MODES[m][0]}: switch back to editing`); chip.title = "Switch back to editing";
    pill.inert = m !== "edit"; formula.inert = m !== "edit"; title.readOnly = m !== "edit";
    if (m !== "edit" && stageSlot.contains(document.activeElement)) document.activeElement.blur();
    try { opts.setMode?.(m); } catch (e) { console.error(e); }
    if (m === "comment") openPanel("comments");
    toast(m === "edit" ? "Editing on" : m === "comment" ? "Commenting: changes are paused, comments are on" : "Viewing: the design can't be changed");
  }
  // In Commenting/Viewing the cover stops clicks and drags on the stage; the wheel still scrolls what is under it.
  cover.addEventListener("pointerdown", async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (mode !== "comment") return;
    let a = null;
    if (opts.comment?.pick) {
      const under = (document.elementsFromPoint?.(e.clientX, e.clientY) || []).find((n) => n !== cover && stageSlot.contains(n)) || null;
      const r = stageSlot.getBoundingClientRect();
      try { a = await opts.comment.pick({ x: e.clientX - r.left, y: e.clientY - r.top, clientX: e.clientX, clientY: e.clientY }, under); } catch {}
    }
    commentOn(a);
  });
  // Start a comment, optionally on a block/element: anchor = { id, label } or a label string (shown with the comment).
  let anchor = null;
  function commentOn(a) {
    anchor = a ? (typeof a === "string" ? { label: a } : a) : null;
    openPanel("comments");
    setTimeout(() => panelBody("comments").querySelector('[data-ads="comment-text"]')?.focus());
  }
  shell.commentOn = (a) => commentOn(a);
  cover.addEventListener("wheel", (e) => {
    for (const n of document.elementsFromPoint?.(e.clientX, e.clientY) || []) {
      if (n === cover || !stageSlot.contains(n)) continue;
      for (let x = n; x && x !== stageSlot; x = x.parentElement) {
        const s = getComputedStyle(x);
        if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1)) { x.scrollBy(e.deltaX, e.deltaY); e.preventDefault(); return; }
      }
      return;
    }
  }, { passive: false });
  const NAV = /^(Arrow|Page|Home|End|Tab|Escape|F\d)/;
  const chromeTyping = (t) => t instanceof Element && !stageSlot.contains(t) && root.contains(t) && t.matches("input, textarea, select, [contenteditable]");
  const block = (e) => { if (mode === "edit" || chromeTyping(e.target)) return; if (e.type === "keydown" && (NAV.test(e.key) || ((e.ctrlKey || e.metaKey) && /^[cf]$/i.test(e.key)))) return; if (e.type === "keydown" && !(e.target === document.body || stageSlot.contains(e.target) || e.target === document.documentElement)) return; e.preventDefault(); e.stopImmediatePropagation(); };
  for (const t of ["keydown", "beforeinput", "paste", "cut", "drop"]) window.addEventListener(t, block, true);

  // "?" opens the shortcuts list (not while typing, and not inside the app's work area).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || !helpB || opts.helpKey === false) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || stageSlot.contains(a))) return;
    e.preventDefault(); helpPop(helpB);
  });
  // ----- Escape: closes popovers, grid view, then the panel (when focus is in the panel / rail, or on phones)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (pop) { closePop(true); e.stopPropagation(); return; }
    if (!spot.hidden) { spotlight(false); return; }
    if (grid) { closeGrid(); gridB?.focus(); return; }
    const a = document.activeElement;
    if (active && (panel.contains(a) || rail.contains(a) || foot.contains(a) || top.contains(a) || (isMobile() && !stageSlot.contains(a)))) { const back = railBtns.get(active) || B[active] || commentsB; closePanel(); back?.focus?.(); }
  });

  // ----- shared design keys (notes, comments) and recent templates
  // Notes are per page when the app has pages (page 1 keeps the design-level key, so older notes stay).
  const pageKey = (i) => { if (!PG) return null; try { const idx = i ?? PG.current(); return PG.id ? String(PG.id(idx)) : String(idx); } catch { return null; } };
  const nkey = (i) => { const base = `ad-shell-notes:${app}:${designId}`, k = pageKey(i); return k == null || k === "0" ? base : `${base}:p${k}`; };
  let notesPage = null;
  const ckey = () => `ad-shell-comments:${app}:${designId}`;
  const rkey = `ad-shell-recent:${app}`;
  function pushRecent(id) {
    if (!id) return;
    LS.set(rkey, [id, ...LS.get(rkey, []).filter((x) => x !== id)].slice(0, 8));
    bodies.get("templates")?._redraw?.();
  }
  function setDesignId(id) { designId = String(id || "default"); vk = null; for (const k of ["notes", "comments"]) { const b = bodies.get(k); if (b) renderPanel(k, b); } badge(); }
  function badge() { const n = LS.get(ckey(), []).filter((c) => !c.resolved).length; cBadge.hidden = !n; cBadge.textContent = String(n); commentsB.setAttribute("aria-label", n ? `Comments (${n} open)` : "Comments"); }

  // ----- Templates panel
  async function loadGallery() { let g = opts.templates?.gallery; if (typeof g === "function") g = g(); if (g && typeof g.then === "function") g = await g; return g || { TEMPLATES: [], thumb: () => "" }; }
  // Handles thousands of templates: search (name, tags, theme, layout, section), filter chips, thumbnails drawn only
  // when a card comes near the screen, and pages of 40 (infinite scroll + "Load more").
  function renderTemplates(b) {
    const T = opts.templates, PAGE = Math.max(8, T.pageSize || 40);
    const q = h("input", { type: "search", class: "ads-search-in", placeholder: T.placeholder || `Search ${kind} templates`, "aria-label": T.placeholder || "Search templates", "data-ads": "template-search" });
    const chips = h("div", { class: "ads-chips", role: "group", "aria-label": "Filter templates", hidden: true });
    const count = h("p", { class: "ads-tcount", role: "status", "aria-live": "polite", "data-ads": "template-count" });
    const list = h("div", { class: "ads-tlist" }, h("p", { class: "ads-muted", text: "Loading templates…" }));
    const more = h("button", { type: "button", class: "ads-btn ads-block ads-more", "data-ads": "template-more", hidden: true });
    const filterB = btn("ads-sbtn", "Show or hide filters", "fit", "", () => { chips.dataset.off = chips.dataset.off === "1" ? "" : "1"; chips.hidden = chips.dataset.off === "1" || !chips.children.length; filterB.setAttribute("aria-pressed", String(!chips.hidden)); }, { "data-ads": "template-filters", "aria-pressed": "true", hidden: true });
    const back = h("div", { class: "ads-secback", hidden: true }, mk("ads-link", "Back to all templates", "left", "All templates", () => { secOnly = null; draw(); }, { "data-ads": "see-all-back" }), h("b", { class: "ads-sectitle" }));
    b.append(h("label", { class: "ads-search", html: icon("search") }, q, filterB), chips, back, count, list, more);
    let gal = null, all = [], byId = new Map(), hay = new Map(), matches = [], shown = 0, lastSec = null, grid = null, searching = false;
    // Paged galleries (gallery.page(tool, { q, offset, limit, filters }) -> { items, total }) are asked page by page.
    let paged = false, pager = null, loading = false, gen = 0, total = 0, baseTotal = null, secOnly = null;
    const secCount = new Map();
    const seen = new Map();
    const filt = {};
    const tools = [].concat(T.tool || []);
    const thumbOf = (id) => { try { return String(gal.thumb?.(id) || ""); } catch { return ""; } };
    const fill = (el) => { if (el.dataset.done) return; el.dataset.done = "1"; const badge = el.querySelector(".ads-tbadge"); el.innerHTML = thumbOf(el.dataset.id); if (badge) el.append(badge); };
    const IO = typeof IntersectionObserver === "function";
    // Only real hits: a hidden or still-narrow panel must not draw thumbnails or load pages.
    const live = (e) => e.isIntersecting && !b.hidden && e.boundingClientRect.height > 0 && e.boundingClientRect.width >= 40 && !!e.rootBounds && e.rootBounds.height > 0 && e.rootBounds.width >= 200;
    const seeThumb = IO ? new IntersectionObserver((es) => { for (const e of es) if (live(e)) { seeThumb.unobserve(e.target); fill(e.target); } }, { root: scroll, rootMargin: "300px 0px" }) : null;
    const seeMore = IO ? new IntersectionObserver((es) => { if (es.some(live) && !more.hidden) page(); }, { root: scroll, rootMargin: "250px 0px" }) : null;
    const card = (x) => {
      const th = h("span", { class: "ads-tthumb", "data-id": x.id });
      if (seeThumb) seeThumb.observe(th); else fill(th);
      const np = Math.max(1, Math.floor(+x.pages || 0));
      const c = h("button", { type: "button", class: "ads-tcard", "data-template": x.id, title: x.name, "aria-label": `Use template: ${x.name}${np > 1 ? ` (${np} pages)` : ""}` }, th, h("span", { class: "ads-tname", text: x.name }));
      if (np > 1) {
        // Multi-page templates: "1 of N" badge; with gallery.thumbPage(id, i) the card flips through its pages on hover.
        const badge = h("span", { class: "ads-tbadge", "data-ads": "template-pages", "aria-hidden": "true", text: `1 of ${np}` });
        th.append(badge);
        if (typeof gal?.thumbPage === "function") {
          let k = 0, iv = 0;
          const show = (i) => { k = i; let svg = ""; try { svg = String(gal.thumbPage(x.id, i) || ""); } catch {} if (svg) { th.innerHTML = svg; th.append(badge); th.dataset.done = "1"; } badge.textContent = `${i + 1} of ${np}`; };
          c.addEventListener("mouseenter", () => { clearInterval(iv); iv = setInterval(() => show((k + 1) % np), 900); });
          c.addEventListener("mouseleave", () => { clearInterval(iv); if (k) show(0); });
        }
      }
      dragPayload(c, { kind: "template", id: x.id, name: x.name });
      c.addEventListener("click", async () => {
        if (c.classList.contains("busy")) return;
        c.classList.add("busy"); c.setAttribute("aria-busy", "true");
        try { const r = await T.apply?.(x.id); if (r !== false) pushRecent(x.id); } catch (e) { console.error(e); toast(e?.message || "That template could not open."); }
        finally { c.classList.remove("busy"); c.removeAttribute("aria-busy"); }
      });
      return c;
    };
    // First card "Create a blank <kind>" when the app gives templates.blank() (not counted as a template card).
    const blankCard = () => {
      const label = T.blankLabel || `Create a blank ${kind.toLowerCase()}`;
      return h("div", { class: "ads-blankrow" }, h("button", { type: "button", class: "ads-blankcard", "data-ads": "template-blank", "aria-label": label, html: `<span class="ads-blankthumb">${icon("plus")}</span>`, onclick: async () => { try { await T.blank(); } catch (e) { toast(e?.message || "Could not start a blank design."); } } }, h("span", { class: "ads-tname", text: label })));
    };
    const section = (name, key) => {
      grid = h("div", { class: "ads-tgrid" });
      const head = h("div", { class: "ads-sechead" }, h("h3", { class: "ads-h3", text: name }));
      // "See all" opens one section on its own (only when the gallery has several sections).
      if (!paged && !searching && !secOnly && !key && secCount.size >= 2 && (secCount.get(name) || 0) > 4) head.append(mk("ads-link", `See all ${name}`, null, "See all", () => { secOnly = name; draw(); scroll.scrollTop = 0; }, { "data-ads": "see-all", "data-section": name }));
      list.append(h("section", { class: "ads-tsec", "data-section": key || name }, head, grid)); return grid;
    };
    const pretty = (v) => String(v).replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
    function buildChips() {
      // gallery.FILTERS = [{ key, label, options: [{ value, label }] }] wins; else theme / layout fields; else sections.
      let groups = Array.isArray(gal.FILTERS) ? gal.FILTERS : [];
      if (!groups.length && !paged) for (const [key, label] of [["theme", "Theme"], ["layout", "Layout"], ["section", "Section"]]) {
        if (key === "section" && groups.length) break;
        const seen = new Map();
        for (const x of all) if (x[key] != null && !seen.has(x[key])) seen.set(x[key], x[key + "Name"] || pretty(x[key]));
        if (seen.size >= 2 && seen.size <= 80) groups.push({ key, label, options: [...seen].map(([value, l]) => ({ value, label: l })) });
      }
      chips.replaceChildren(); chips.hidden = !groups.length; filterB.hidden = !groups.length;
      groups.forEach((g, gi) => {
        const row = h("div", { class: "ads-chiprow", role: "group", "aria-label": `${g.label} filter`, "data-filter": g.key });
        if (gi === 0) row.append(h("button", { type: "button", class: "ads-fchip on", "data-value": "", "aria-pressed": "true", text: "All", onclick: () => { for (const k of Object.keys(filt)) delete filt[k]; syncChips(); draw(); } }));
        for (const o of g.options) row.append(h("button", { type: "button", class: "ads-fchip", "data-filter": g.key, "data-value": String(o.value), "aria-pressed": "false", text: o.label, onclick: () => { if (filt[g.key] === String(o.value)) delete filt[g.key]; else filt[g.key] = String(o.value); syncChips(); draw(); } }));
        chips.append(row);
      });
    }
    function syncChips() {
      const none = !Object.keys(filt).length;
      for (const c of chips.querySelectorAll(".ads-fchip")) { const on = c.dataset.value === "" ? none : filt[c.dataset.filter] === c.dataset.value; c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); }
    }
    function page() {
      if (loading) return;
      if (!paged) { addItems(matches.slice(shown, shown + PAGE), matches.length); return; }
      loading = true; const g = gen;
      const args = { q: q.value.trim(), offset: shown, limit: PAGE, filters: { ...filt } };
      Promise.resolve().then(() => pager(T.tool, args)).then((r) => {
        if (g !== gen) return; loading = false;
        addItems(Array.isArray(r?.items) ? r.items : [], Number(r?.total) || 0);
      }, (e) => { if (g !== gen) return; loading = false; console.error(e); toast("Templates could not load. Please try again."); more.hidden = false; more.textContent = "Try again"; });
    }
    function addItems(items, t) {
      total = t;
      for (const x of items) {
        if (!x || x.id == null) continue;
        seen.set(x.id, x);
        const sec = searching ? "Results" : x.section || "More templates for you";
        if (sec !== lastSec || !grid) { lastSec = sec; section(sec, searching ? "results" : null); }
        grid.append(card(x)); shown++;
      }
      if (paged) {
        if (!searching) baseTotal = t;
        count.textContent = searching ? (baseTotal != null ? `${t.toLocaleString()} of ${baseTotal.toLocaleString()} templates` : `${t.toLocaleString()} results`) : `${t.toLocaleString()} template${t === 1 ? "" : "s"}`;
      }
      if (!shown) list.append(h("p", { class: "ads-muted", text: total || all.length || baseTotal ? "No templates match. Try another word or filter." : "Templates for this tool are on the way." }));
      const left = total - shown;
      more.hidden = left <= 0 || !items.length; more.textContent = `Load more templates (${left.toLocaleString()} more)`;
      if (seeMore) { seeMore.unobserve(more); if (!more.hidden) seeMore.observe(more); }
    }
    function draw() {
      gen++; loading = false;
      seeThumb?.disconnect();
      list.replaceChildren(); shown = 0; lastSec = null; grid = null;
      const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const keys = Object.keys(filt);
      searching = !!(words.length || keys.length);
      if (searching) secOnly = null;
      back.hidden = !secOnly; back.querySelector(".ads-sectitle").textContent = secOnly || "";
      if (!paged) {
        matches = all.filter((x) => (!secOnly || (x.section || "More templates for you") === secOnly) && keys.every((k) => String(x[k]) === filt[k]) && words.every((w) => hay.get(x.id).includes(w)));
        const n = all.length.toLocaleString();
        count.textContent = secOnly ? `${matches.length.toLocaleString()} templates in this section` : searching ? `${matches.length.toLocaleString()} of ${n} templates` : `${n} template${all.length === 1 ? "" : "s"}`;
      } else if (!count.textContent) count.textContent = "Loading templates…";
      if (!searching && !secOnly && typeof T.blank === "function") list.append(blankCard());
      const r = secOnly ? null : recentSection(); if (r) list.append(r);
      page();
    }
    function recentSection() {
      if (searching || !gal) return null;
      const rec = LS.get(rkey, []).map((id) => (paged ? recentMeta(id) : byId.get(id))).filter(Boolean).slice(0, 4);
      if (!rec.length) return null;
      return h("section", { class: "ads-tsec", "data-section": "recent" }, h("div", { class: "ads-sechead" }, h("h3", { class: "ads-h3", text: "Recently used" })), h("div", { class: "ads-tgrid" }, rec.map(card)));
    }
    function recentMeta(id) {
      let m = seen.get(id);
      if (!m) for (const f of [gal.meta, gal.templateMeta]) { if (typeof f !== "function") continue; try { const r = f.call(gal, id); if (r && typeof r.then !== "function" && r.name) { m = { ...r, id }; break; } } catch {} }
      return m || { id, name: pretty(String(id).split("~")[0]) };
    }
    let qt = 0;
    q.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(draw, paged ? 200 : all.length > 400 ? 120 : 0); });
    more.addEventListener("click", () => page());
    // Re-arm the observers each time the panel is shown: hits ignored while it was hidden never fire again on their own.
    b._shown = () => {
      if (seeThumb) for (const th of b.querySelectorAll(".ads-tthumb:not([data-done])")) { seeThumb.unobserve(th); seeThumb.observe(th); }
      if (seeMore && !more.hidden) { seeMore.unobserve(more); seeMore.observe(more); }
    };
    // After a template is used, only "Recently used" changes (the list keeps its place).
    b._redraw = () => { if (!gal || searching) return; const old = list.querySelector('[data-section="recent"]'), r = recentSection(); if (old && r) old.replaceWith(r); else if (old) old.remove(); else if (r) list.prepend(r); };
    loadGallery().then((g) => {
      gal = g;
      // Paged: page(tool, { q, offset, limit, filters }); or Studio's totalFor / templatesFor / search(tool, q, offset, limit).
      if (typeof g.page === "function") pager = (tool, a) => g.page(tool, a);
      else if (typeof g.totalFor === "function" && typeof g.templatesFor === "function") pager = (tool, a) => (a.q && typeof g.search === "function" ? g.search(tool, a.q, a.offset, a.limit) : { total: g.totalFor(tool), items: g.templatesFor(tool, a.offset, a.limit) });
      paged = !!pager;
      if (paged) {
        let tt = null; try { tt = typeof g.totalFor === "function" ? g.totalFor(T.tool) : g.TOTALS?.[T.tool] ?? g.TOTAL; } catch {}
        baseTotal = typeof tt === "number" ? tt : null; buildChips(); draw(); return;
      }
      const raw = (g.TEMPLATES || []).filter((x) => x && x.id != null && (!tools.length || !x.tool || tools.includes(x.tool)));
      const order = new Map(); for (const x of raw) { const k = x.section || "More templates for you"; if (!order.has(k)) order.set(k, order.size); secCount.set(k, (secCount.get(k) || 0) + 1); }
      all = raw.map((x, i) => [x, i]).sort((A, B) => order.get(A[0].section || "More templates for you") - order.get(B[0].section || "More templates for you") || A[1] - B[1]).map((p) => p[0]);
      for (const x of all) { byId.set(x.id, x); hay.set(x.id, [x.name, x.section, x.tool, x.theme, x.themeName, x.layout, x.layoutName, x.palette, x.paletteName, ...(x.tags || [])].filter(Boolean).join(" ").toLowerCase()); }
      buildChips(); draw();
    }).catch((e) => { console.error(e); list.replaceChildren(h("p", { class: "ads-muted", text: "Templates could not load. Please reload the page." })); });
  }

  // ----- Brand panel (shared/brand.js kit)
  function renderBrand(b) {
    const kit = loadBrand(), ins = opts.insert || {};
    b.append(h("p", { class: "ads-muted", text: `${kit.name}: your colours, fonts and logos, saved on this device.` }));
    b.append(h("h3", { class: "ads-h3", text: "Colours" }));
    const sw = h("div", { class: "ads-swatches" });
    for (const c of kit.colors || []) { const s = h("button", { type: "button", class: "ads-swatch", style: `--c:${c}`, "aria-label": ins.color ? `Use colour ${c}` : `Copy colour ${c}`, title: c, "data-color": c, onclick: async () => { if (ins.color) { ins.color(c); toast(`Colour ${c} applied`); } else toast((await copyText(c)) ? `Copied ${c}` : c); } }); if (ins.color) dragPayload(s, { kind: "color", value: c }); sw.append(s); }
    const pick = h("input", { type: "color", value: "#5b4cf0", "aria-label": "Pick a new brand colour", class: "ads-colorin" });
    sw.append(h("label", { class: "ads-swatch ads-swadd", title: "Add a colour to your kit", html: icon("plus") }, pick));
    pick.addEventListener("change", () => { const k = loadBrand(); if (!k.colors.includes(pick.value)) { k.colors = [...k.colors, pick.value].slice(-12); saveBrand(k); renderPanel("brand", b); toast("Colour added to your brand kit"); } });
    b.append(sw);
    if (ins.font) {
      b.append(h("h3", { class: "ads-h3", text: "Fonts" }));
      for (const [role, fam] of Object.entries(kit.fonts || {})) {
        const f = FONT_FAMILIES[fam] || FONT_FAMILIES.sans;
        b.append(h("button", { type: "button", class: "ads-fontbtn", style: `font-family:${f.css}`, "data-font": fam, onclick: () => { ins.font(fam, f.css); toast(`${f.label} applied`); } }, h("b", { text: role === "heading" ? "Heading" : "Body text" }), h("small", { text: f.label })));
      }
    }
    if (ins.image) {
      b.append(h("h3", { class: "ads-h3", text: "Logos" }));
      const g = h("div", { class: "ads-tgrid" });
      for (const l of kit.logos || []) { const lb = h("button", { type: "button", class: "ads-tcard", "aria-label": `Add logo ${l.name || ""}`, onclick: () => { ins.image(l.src, l.name || "logo"); toast("Logo added"); } }, h("span", { class: "ads-tthumb ads-contain" }, h("img", { src: l.src, alt: "" })), h("span", { class: "ads-tname", text: l.name || "Logo" })); dragPayload(lb, { kind: "image", src: l.src, name: l.name || "logo" }); g.append(lb); }
      if (!(kit.logos || []).length) g.append(h("p", { class: "ads-muted", text: "No logos yet. Add them in the brand kit." }));
      b.append(g);
    }
    b.append(h("a", { class: "ads-btn ads-block", href: "/product/brand", target: "_blank", rel: "noopener", html: icon("brand") + '<span class="ads-l">Edit brand kit</span>' }));
  }

  // ----- Uploads panel
  function renderUploads(b) {
    const inp = h("input", { type: "file", accept: "image/*", multiple: true, class: "ads-file", "aria-label": "Choose images to upload", "data-ads": "upload-input" });
    const drop = h("label", { class: "ads-drop" }, inp, h("span", { html: icon("uploads") }), h("b", { text: "Upload files" }), h("small", { text: "Images stay on this device. Drop them here or tap to choose." }));
    const grid = h("div", { class: "ads-tgrid ads-uplist" });
    b.append(drop, h("h3", { class: "ads-h3", text: "Your uploads" }), grid);
    const draw = async () => {
      let items = []; try { items = await upTx("readonly", (s) => s.getAll()); } catch {}
      items = (items || []).sort((a, z) => z.added - a.added);
      grid.replaceChildren();
      if (!items.length) grid.append(h("p", { class: "ads-muted", text: "Nothing uploaded yet." }));
      for (const it of items) {
        const use = h("button", { type: "button", class: "ads-tcard", "aria-label": `Add ${it.name} to the design`, "data-upload": it.id }, h("span", { class: "ads-tthumb ads-contain" }, h("img", { src: it.data, alt: "" })), h("span", { class: "ads-tname", text: it.name }));
        use.addEventListener("click", () => { try { opts.insert.image(it.data, it.name); toast("Image added"); } catch (e) { toast(e?.message || "Could not add the image."); } });
        dragPayload(use, { kind: "upload", id: it.id, name: it.name });
        const del = btn("ads-x", `Delete ${it.name}`, "trash", "", async () => { await upTx("readwrite", (s) => s.delete(it.id)); draw(); });
        grid.append(h("div", { class: "ads-upitem" }, use, del));
      }
    };
    const add = async (files) => {
      let n = 0;
      for (const f of files) {
        if (!/^image\//.test(f.type)) { toast(`${f.name} is not an image`); continue; }
        if (f.size > 15e6) { toast(`${f.name} is larger than 15 MB`); continue; }
        try { const data = await readUrl(f); await upTx("readwrite", (s) => s.put({ id: rid(), name: f.name, type: f.type, data, added: Date.now() })); n++; } catch { toast("This browser could not keep the file."); }
      }
      if (n) toast(`${n} file${n > 1 ? "s" : ""} uploaded`);
      draw();
    };
    inp.addEventListener("change", () => { add([...inp.files]); inp.value = ""; });
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("on"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("on"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("on"); add([...(e.dataTransfer?.files || [])]); });
    draw();
  }

  // ----- Projects panel (shared/store.js)
  async function saveToProjects() {
    const r = (await opts.projects.save?.()) || {};
    const id = r.id || projectId || undefined;
    let prev = null; if (id) { try { prev = await getProject(id); } catch {} }
    const rec = await saveProject({ ...(prev || {}), ...r, id, app: r.app || prev?.app || app, name: r.name || title.value || title.placeholder, data: r.data ?? prev?.data ?? null, thumb: r.thumb || prev?.thumb || "" });
    projectId = rec.id; toast("Saved to Projects");
    if (active === "projects") renderPanel("projects", panelBody("projects"));
    return rec;
  }
  function renderProjects(b) {
    if (opts.projects.save) b.append(mk("ads-btn primary ads-block", "Save to projects", "projects", "Save to projects", () => saveToProjects().catch((e) => toast(e?.message || "Could not save.")), { "data-ads": "save-project" }));
    const list = h("div", { class: "ads-plist" }, h("p", { class: "ads-muted", text: "Loading…" }));
    b.append(h("h3", { class: "ads-h3", text: `Your ${kind.toLowerCase()} projects` }), list);
    listProjects(app).then((items) => {
      list.replaceChildren();
      if (!items.length) list.append(h("p", { class: "ads-muted", text: "No saved projects yet. They stay on this device." }));
      for (const r of items) {
        const th = h("span", { class: "ads-pthumb" });
        if (typeof r.thumb === "string" && r.thumb.startsWith("<svg")) th.innerHTML = r.thumb; else if (typeof r.thumb === "string" && r.thumb) th.append(h("img", { src: r.thumb, alt: "" })); else th.innerHTML = icon(meta("projects").icon);
        const open = h("button", { type: "button", class: "ads-prow" + (r.id === projectId ? " on" : ""), "aria-label": `Open ${r.name || "project"}`, "data-project": r.id }, th, h("span", {}, h("b", { text: r.name || "Untitled" }), h("small", { text: when(r.updated) })));
        open.addEventListener("click", async () => { try { await opts.projects.open?.(r); projectId = r.id; vk = null; toast(`Opened ${r.name || "project"}`); if (isMobile()) closePanel(); } catch (e) { toast(e?.message || "Could not open it."); } });
        const del = btn("ads-x", `Delete ${r.name || "project"}`, "trash", "", async () => {
          if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.classList.add("sure"); del.title = "Click again to delete"; setTimeout(() => { del.dataset.sure = ""; del.classList.remove("sure"); }, 3000); return; }
          await deleteProject(r.id); if (projectId === r.id) projectId = null; renderPanel("projects", b);
        });
        list.append(h("div", { class: "ads-pitem" }, open, del));
      }
    }).catch(() => list.replaceChildren(h("p", { class: "ads-muted", text: "Projects need browser storage, which is turned off here." })));
  }

  // ----- Version history (own IndexedDB store; snapshots come from projects.save(), restore goes through the
  // app's own project record so every app reloads it the way it already opens projects)
  let vk = null;
  const vkey = () => (vk ||= `${app}:${projectId || designId}`);
  let lastAuto = Date.now();
  async function snapshot(label) {
    const r = (opts.versions?.save ? await opts.versions.save() : await opts.projects?.save?.()) || {};
    if (r.id && !projectId) projectId = r.id;
    const v = { id: rid(), key: vkey(), app, at: Date.now(), label, name: r.name || title.value || title.placeholder, data: r.data ?? null, thumb: typeof r.thumb === "string" ? r.thumb : "" };
    await dbTx("versions", "readwrite", (st) => st.put(v));
    const all = (await dbTx("versions", "readonly", (st) => st.getAll()) || []).filter((x) => x.key === v.key).sort((a, z) => z.at - a.at);
    for (const old of all.slice(40)) await dbTx("versions", "readwrite", (st) => st.delete(old.id));
    return v;
  }
  async function restoreVersion(v) {
    await snapshot("Before restoring");
    if (opts.versions?.restore) { await opts.versions.restore(v); }
    else {
      const r = (await opts.projects?.save?.()) || {};
      const id = r.id || projectId || undefined;
      let prev = null; if (id) { try { prev = await getProject(id); } catch {} }
      const rec = await saveProject({ ...(prev || {}), ...r, id, app: r.app || prev?.app || app, name: v.name || r.name || title.value, data: v.data, thumb: v.thumb || prev?.thumb || "" });
      projectId = rec.id;
      await opts.projects?.open?.(rec);
    }
    toast(`Restored the version from ${when(v.at)}`);
  }
  function renderVersions(b) {
    b.append(h("p", { class: "ads-muted", text: "Versions are kept on this device: one when you save it here, one every 10 minutes while you work, and one before each restore." }));
    b.append(mk("ads-btn primary ads-block", "Save this version", "history", "Save this version", async () => { try { await snapshot("Saved by you"); toast("Version saved"); renderPanel("versions", b); } catch (e) { toast(e?.message || "Could not save the version."); } }, { "data-ads": "version-save" }));
    const list = h("div", { class: "ads-plist", "data-ads": "version-list" }, h("p", { class: "ads-muted", text: "Loading…" }));
    b.append(h("h3", { class: "ads-h3", text: "Earlier versions" }), list);
    dbTx("versions", "readonly", (st) => st.getAll()).then((all) => {
      const items = (all || []).filter((v) => v.key === vkey()).sort((a, z) => z.at - a.at);
      list.replaceChildren();
      if (!items.length) list.append(h("p", { class: "ads-muted", text: "No versions yet." }));
      for (const v of items) {
        const th = h("span", { class: "ads-pthumb" });
        if (v.thumb?.startsWith("<svg")) th.innerHTML = v.thumb; else if (v.thumb) th.append(h("img", { src: v.thumb, alt: "" })); else th.innerHTML = icon("history");
        const restore = mk("ads-btn sm", `Restore the version from ${when(v.at)}`, "reset", "Restore", async () => {
          if (restore.dataset.sure !== "1") { restore.dataset.sure = "1"; setText(restore, "Sure?"); setTimeout(() => { restore.dataset.sure = ""; setText(restore, "Restore"); }, 3000); return; }
          try { await restoreVersion(v); renderPanel("versions", b); } catch (e) { toast(e?.message || "Could not restore it."); }
        }, { "data-ads": "version-restore" });
        const del = btn("ads-x", `Delete the version from ${when(v.at)}`, "trash", "", async () => { await dbTx("versions", "readwrite", (st) => st.delete(v.id)); renderPanel("versions", b); });
        list.append(h("div", { class: "ads-pitem ads-version", "data-version": v.id }, th, h("span", { class: "ads-vtext" }, h("b", { text: when(v.at) }), h("small", { text: `${v.label} · ${v.name || ""}` })), restore, del));
      }
    }).catch(() => list.replaceChildren(h("p", { class: "ads-muted", text: "Versions need browser storage, which is turned off here." })));
  }

  // Filters what a panel shows as you type: [data-search] items if the panel has them, else its buttons and links.
  function searchBox(placeholder, host, sel) {
    const q = h("input", { type: "search", class: "ads-search-in", placeholder, "aria-label": placeholder, "data-ads": "panel-search" });
    const none = h("p", { class: "ads-muted", hidden: true, "data-ads": "panel-search-none", text: "Nothing matches. Try another word." });
    q.addEventListener("input", () => {
      const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const pick = sel || (host.querySelector("[data-search]") ? "[data-search]" : "[data-ads-drag], button, a[href]");
      let any = 0;
      for (const el of host.querySelectorAll(pick)) {
        const t = `${el.dataset.search || ""} ${el.getAttribute("aria-label") || ""} ${el.title || ""} ${el.textContent || ""}`.toLowerCase();
        const ok = words.every((w) => t.includes(w)); el.classList.toggle("ads-nomatch", !ok); if (ok) any++;
      }
      for (const sec of host.querySelectorAll("section, [data-ads-section]")) sec.classList.toggle("ads-nomatch", !!words.length && !sec.querySelector(`:is(${pick}):not(.ads-nomatch)`));
      host.classList.toggle("ads-searching", !!words.length);
      none.hidden = !words.length || any > 0;
      if (!none.isConnected) host.after(none);
    });
    return h("label", { class: "ads-search ads-psearch", html: icon("search") }, q);
  }

  // ----- Apps panel
  function renderApps(b) {
    b.append(h("p", { class: "ads-muted", text: "Open another AsaanDesk design app in a new tab. This design stays open here." }));
    const g = h("div", { class: "ads-apps" });
    b.append(searchBox("Search apps", g));
    for (const [id, name, sub, href, ic] of APPS) {
      if (id === app) continue;
      g.append(h("a", { class: "ads-app", href, target: "_blank", rel: "noopener", "data-app": id, html: `<span class="ads-appic">${icon(ic)}</span>` }, h("span", {}, h("b", { text: name }), h("small", { text: sub }))));
    }
    b.append(g);
  }

  // ----- Translate panel (Chrome on-device Translator API; nothing is sent anywhere)
  function renderTranslate(b) {
    const sel = (lab, val, auto) => { const s = h("select", { class: "ads-in", "aria-label": lab }); if (auto) s.append(h("option", { value: "auto", text: "Detect language" })); for (const [c, n] of LANGS) s.append(h("option", { value: c, text: n })); s.value = val; return s; };
    const from = sel("Translate from", "auto", true), to = sel("Translate to", "es");
    const src = h("textarea", { class: "ads-ta", rows: 5, "aria-label": "Text to translate", placeholder: "Text to translate" });
    const fill = () => { try { src.value = String(opts.getText?.() || ""); } catch { src.value = ""; } };
    fill();
    const status = h("p", { class: "ads-muted ads-status", role: "status", "aria-live": "polite", "data-ads": "translate-status" });
    const out = h("div", { class: "ads-out", hidden: true, "data-ads": "translate-out" });
    const replace = mk("ads-btn primary", "Replace text in the design", "check", "Replace in design", () => { try { opts.setText?.(out.textContent); toast("Text replaced"); } catch (e) { toast(e?.message || "Could not replace the text."); } });
    if (!opts.setText) replace.hidden = true;
    const copy = mk("ads-btn", "Copy translation", "copy", "Copy", async () => toast((await copyText(out.textContent)) ? "Copied" : "Could not copy"));
    const actions = h("div", { class: "ads-row", hidden: true }, replace, copy);
    const go = mk("ads-btn primary ads-block", "Translate", "translate", "Translate", async () => {
      const text = src.value.trim();
      if (!text) { status.textContent = "Select some text in the design or type it above."; return; }
      const T = globalThis.Translator;
      const within = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what)), ms))]);
      if (!T?.create) { status.textContent = "On-device translation is not available in this browser. It works in recent desktop Chrome (version 138 or newer). Nothing was sent anywhere."; return; }
      go.disabled = true; status.textContent = "Checking the translator on this device…";
      try {
        let source = from.value;
        if (source === "auto") { source = "en"; try { const D = globalThis.LanguageDetector; if (D?.create && ["available", "readily"].includes(await within(Promise.resolve(D.availability?.()), 3000, "slow"))) { const [top] = await (await D.create()).detect(text); if (top?.confidence > 0.5) source = top.detectedLanguage; } } catch {} }
        if (source === to.value) { out.textContent = text; out.hidden = false; actions.hidden = false; status.textContent = "The text is already in that language."; return; }
        let av;
        try { av = await within(Promise.resolve(T.availability?.({ sourceLanguage: source, targetLanguage: to.value })), 5000, "slow"); }
        catch { status.textContent = "On-device translation did not answer in this browser. It works in recent desktop Chrome (version 138 or newer). Nothing was sent anywhere."; return; }
        if (av === "unavailable" || av === "no") { status.textContent = "This language pair is not available on this device yet. Try another language."; return; }
        status.textContent = av === "available" || av === "readily" ? "Translating on this device…" : "Getting the language pack for this device (one time)…";
        const t = await within(T.create({ sourceLanguage: source, targetLanguage: to.value, monitor(m) { m.addEventListener?.("downloadprogress", (e) => { status.textContent = `Downloading language pack… ${Math.round((e.loaded || 0) * 100)}%`; }); } }), 120000, "The language pack download took too long");
        try { out.textContent = await within(t.translate(text), 30000, "Translation took too long"); } finally { t.destroy?.(); }
        out.hidden = false; actions.hidden = false; status.textContent = "Translated on this device.";
      } catch (e) { status.textContent = "Translation did not work here: " + (e?.message || "unknown problem") + ". Nothing was sent anywhere."; }
      finally { go.disabled = false; }
    }, { "data-ads": "translate-go" });
    b.append(h("div", { class: "ads-row2" }, from, to), src, mk("ads-link", "Use the selected text", "reset", "Use selected text", fill), go, status, out, actions);
    if (!globalThis.Translator) status.textContent = "Note: this browser has no on-device translator. Recent desktop Chrome has one built in.";
  }

  // ----- Comments panel (saved per app + design on this device): filter, replies, reactions, @mentions, page tag
  const PEOPLE = "ad-shell-people";
  const people = () => [...new Set([...(opts.people || []), ...LS.get(PEOPLE, []), "Everyone"])];
  const REACT = ["👍", "❤️", "🎉", "😂"];
  function richText(text) {
    const names = people().sort((a, z) => z.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`@(?:${[...names, "[\\w.-]+"].join("|")})`, "g");
    const p = h("p"); let at = 0;
    for (const m of String(text).matchAll(re)) { p.append(text.slice(at, m.index), h("span", { class: "ads-mention", text: m[0] })); at = m.index + m[0].length; }
    p.append(text.slice(at)); return p;
  }
  function mentionBox(ta) {
    const list = h("div", { class: "ads-mlist", role: "listbox", "aria-label": "People to mention", hidden: true, "data-ads": "mention-list" });
    const word = () => { const m = ta.value.slice(0, ta.selectionStart).match(/@([\w.-]*)$/); return m ? m[1] : null; };
    const show = () => {
      const w = word(); if (w == null) { list.hidden = true; return; }
      const hits = people().filter((n) => n.toLowerCase().startsWith(w.toLowerCase())).slice(0, 6);
      list.replaceChildren(...hits.map((n) => h("button", { type: "button", class: "ads-mi", role: "option", text: `@${n}`, onclick: () => { const pos = ta.selectionStart, start = ta.value.slice(0, pos).lastIndexOf("@"); ta.value = ta.value.slice(0, start) + `@${n} ` + ta.value.slice(pos); ta.focus(); ta.selectionStart = ta.selectionEnd = start + n.length + 2; list.hidden = true; } })));
      list.hidden = !hits.length;
    };
    ta.addEventListener("input", show); ta.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 200));
    return list;
  }
  const rememberMentions = (text) => { const found = [...String(text).matchAll(/@([A-Za-z][\w.-]{1,30})/g)].map((m) => m[1]).filter((n) => n !== "Everyone"); if (found.length) LS.set(PEOPLE, [...new Set([...LS.get(PEOPLE, []), ...found])].slice(-30)); };
  let cFilter = "all";
  function renderComments(b) {
    const ta = h("textarea", { class: "ads-ta", rows: 3, placeholder: "Add a comment… type @ to mention someone", "aria-label": "New comment", "data-ads": "comment-text" });
    const list = h("div", { class: "ads-clist" });
    const store = (all) => { LS.set(ckey(), all); draw(); badge(); };
    const curPage = () => { try { return PG ? PG.current() : null; } catch { return null; } };
    const add = () => { const text = ta.value.trim(); if (!text) { ta.focus(); return; } rememberMentions(text); store([{ id: rid(), text, at: Date.now(), resolved: false, page: curPage(), anchor: anchor || null, replies: [], reactions: {} }, ...LS.get(ckey(), [])]); ta.value = ""; anchor = null; onChip.hidden = true; toast("Comment added"); };
    const onChip = h("div", { class: "ads-canchor", hidden: !anchor, "data-ads": "comment-anchor" }, h("span", { text: anchor ? `On: ${anchor.label || "the selection"}` : "" }), btn("ads-x", "Comment on the whole design instead", "close", "", () => { anchor = null; onChip.hidden = true; }));
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add(); });
    const update = (id, fn) => store(LS.get(ckey(), []).map((x) => (x.id === id ? fn({ replies: [], reactions: {}, ...x }) : x)));
    const item = (c) => {
      const replies = c.replies || [], reactions = c.reactions || {};
      const meta = h("div", { class: "ads-cmeta" }, h("span", { class: "ads-avatar sm", text: "Y", "aria-hidden": "true" }), h("b", { text: "You" }));
      if (c.page != null && PG) meta.append(h("button", { type: "button", class: "ads-ptag", "aria-label": `Go to page ${c.page + 1}`, text: `Page ${c.page + 1}`, onclick: () => { PG.go?.(c.page); refresh(); } }));
      if (c.anchor) meta.append(h("button", { type: "button", class: "ads-ptag ads-atag", "aria-label": `Show ${c.anchor.label || "the commented part"}`, "data-ads": "comment-goto", text: c.anchor.label || "Selection", onclick: () => { try { opts.comment?.goto?.(c.anchor); } catch {} } }));
      meta.append(h("small", { text: when(c.at) }));
      const reacts = h("div", { class: "ads-reacts", role: "group", "aria-label": "Reactions" }, REACT.map((r) => h("button", { type: "button", class: "ads-react" + (reactions[r] ? " on" : ""), "aria-label": `React with ${r}`, "aria-pressed": String(!!reactions[r]), "data-ads": "comment-react", text: reactions[r] ? `${r} 1` : r, onclick: () => update(c.id, (x) => ({ ...x, reactions: { ...x.reactions, [r]: !x.reactions[r] } })) })));
      const rbox = h("div", { class: "ads-replybox", hidden: true });
      const rta = h("textarea", { class: "ads-ta", rows: 2, placeholder: "Reply…", "aria-label": "Reply", "data-ads": "reply-text" });
      rbox.append(rta, mentionBox(rta), mk("ads-btn sm primary", "Send reply", "comment", "Reply", () => { const t = rta.value.trim(); if (!t) return; rememberMentions(t); update(c.id, (x) => ({ ...x, replies: [...x.replies, { id: rid(), text: t, at: Date.now() }] })); }, { "data-ads": "reply-add" }));
      return h("div", { class: "ads-citem" + (c.resolved ? " done" : ""), "data-comment": c.id },
        meta, richText(c.text),
        replies.length ? h("div", { class: "ads-replies" }, replies.map((r) => h("div", { class: "ads-reply" }, h("div", { class: "ads-cmeta" }, h("b", { text: "You" }), h("small", { text: when(r.at) })), richText(r.text)))) : "",
        reacts,
        h("div", { class: "ads-row" },
          mk("ads-btn sm", "Reply to this comment", "comment", "Reply", () => { rbox.hidden = !rbox.hidden; if (!rbox.hidden) rta.focus(); }, { "data-ads": "comment-reply" }),
          mk("ads-btn sm", c.resolved ? "Reopen comment" : "Resolve comment", c.resolved ? "reset" : "check", c.resolved ? "Reopen" : "Resolve", () => update(c.id, (x) => ({ ...x, resolved: !x.resolved })), { "data-ads": c.resolved ? "comment-reopen" : "comment-resolve" }),
          mk("ads-btn sm", "Delete comment", "trash", "Delete", () => store(LS.get(ckey(), []).filter((x) => x.id !== c.id)), { "data-ads": "comment-delete" })),
        rbox);
    };
    const filters = [["all", "All"], ["open", "Open"], ["resolved", "Resolved"], ...(PG ? [["page", "This page"]] : [])];
    const chipsRow = h("div", { class: "ads-chiprow ads-cfilter", role: "group", "aria-label": "Show comments" }, filters.map(([v, l]) => h("button", { type: "button", class: "ads-fchip" + (cFilter === v ? " on" : ""), "aria-pressed": String(cFilter === v), "data-ads": "comment-filter", "data-value": v, text: l, onclick: () => { cFilter = v; renderPanel("comments", b); } })));
    const draw = () => {
      let all = LS.get(ckey(), []);
      if (cFilter === "page") { const p = curPage(); all = all.filter((c) => c.page === p); }
      const open = all.filter((c) => !c.resolved), done = all.filter((c) => c.resolved);
      list.replaceChildren();
      if (!all.length) list.append(h("p", { class: "ads-muted", text: cFilter === "all" ? "No comments yet. Comments are kept on this device with this design." : "No comments here." }));
      if (cFilter === "resolved") list.append(...done.map(item));
      else {
        list.append(...open.map(item));
        if (done.length && cFilter !== "open") list.append(h("details", { class: "ads-resolved" }, h("summary", { text: `Resolved (${done.length})` }), done.map(item)));
      }
    };
    b.append(onChip, ta, mentionBox(ta), h("p", { class: "ads-muted ads-note", text: "Mentions are saved with the comment. Nobody is notified: AsaanDesk has no accounts yet." }), mk("ads-btn primary", "Add comment", "comment", "Comment", add, { "data-ads": "comment-add" }), chipsRow, list);
    draw();
  }

  // ----- Notes panel (per design, this device)
  function renderNotes(b) {
    let cur = null; try { cur = PG ? PG.current() : null; } catch {}
    notesPage = cur;
    if (cur != null) b.append(h("p", { class: "ads-notes-page", "data-ads": "notes-page", text: `Notes for page ${cur + 1}` }));
    const ta = h("textarea", { class: "ads-ta ads-notes", rows: 12, placeholder: cur != null ? "Write notes for this page: talking points, to-dos, ideas…" : "Write notes for this design: talking points, to-dos, ideas…", "aria-label": cur != null ? `Notes for page ${cur + 1}` : "Notes for this design", "data-ads": "notes-text" });
    ta.value = LS.get(nkey(), "") || "";
    const st = h("p", { class: "ads-muted", role: "status", text: ta.value ? "Saved on this device" : "Notes are saved on this device as you type." });
    ta.addEventListener("input", () => { st.textContent = LS.set(nkey(), ta.value) ? "Saved on this device" : "Could not save: browser storage is full or off."; });
    b.append(ta, st);
  }

  // ----- refresh zoom / pages from the app (also polled while the tab is visible)
  function refresh() {
    if (Z && zr && document.activeElement !== zr && document.activeElement !== zi) { try { const v = Math.round(Z.get()); if (Number.isFinite(v)) { zr.value = v; zi.value = v + "%"; } } catch {} }
    if (PG && countB) { try { const n = PG.count(), c = PG.current(), nm = pageName(c); countB.textContent = `${c + 1} / ${n}`; countB.setAttribute("aria-label", `Page ${c + 1} of ${n}${nm ? `: ${nm}` : ""}`); countB.title = nm || ""; if (active === "notes" && notesPage !== c && document.activeElement?.dataset?.ads !== "notes-text") renderPanel("notes", panelBody("notes")); } catch {} }
    drawStrip();
  }
  const poll = setInterval(() => { if (!root.isConnected) { clearInterval(poll); return; } if (!document.hidden) refresh(); }, 700);

  // ----- mount
  root.append(spot);
  document.documentElement.classList.add("ad-shell-on");
  document.body.append(root);
  shell.slots = { top, rail, panel, canvas, bottom: foot, pill, formula, stage: stageSlot };
  setSaved("saved"); badge(); refresh(); syncFs();
  // ?panel=<id> in the address opens that panel (also on phones); else opts.initialPanel; else Templates on desktop.
  let urlPanel = null; try { urlPanel = new URLSearchParams(location.search).get("panel"); } catch {}
  const first = opts.initialPanel !== undefined ? opts.initialPanel : (railIds.includes("templates") ? "templates" : null);
  if (urlPanel && known(urlPanel)) openPanel(urlPanel);
  else if (first && !isMobile()) openPanel(first); else last = first || railIds[0] || null;
  matchMedia(MOBILE).addEventListener?.("change", (e) => { closePop(false); if (e.matches) closePanel(); });
  addEventListener("resize", () => { if (pop) place(pop.el, pop.anchor); });
  return shell;
}
