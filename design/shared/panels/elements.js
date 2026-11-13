// Elements panel (shared left-rail kit, every editor), in the structure of Canva's Elements panel; only colours differ:
//   search "Describe your ideal element" (+ own image, mic when the browser has speech input, clear), Generate ▾ (AI:
//   honest "coming soon", never fake results) and Search; Browse categories (icon tiles); Recently used and Starred;
//   rows per category with See all; category pages (← back, the same search, sub-sections with See all, full grids);
//   search results with tabs (All + every category with hits) and filter chips; a "…" menu on every item (Star, See
//   more like this, View category, Download, Add); Audio rows with a play preview.
// Inserting (click or drag) goes through the editor's opts.insert adapter with the shared fallbacks (panels/insert.js)
// and reports the window "ads-kit-insert" event. Assets: panels/assets-*.js (our own) + /pdf-editor/elements.js + the
// CC0 PHOTOS set. Test hooks: data-kit-cat (tiles), data-kit-sec (sections), data-kit-item (insertable items),
// data-kit="search" | "back" | "see-all" | "tab" | "generate" | "more" | "play".
// Exports for other parts: shapeSvg, chartSvg, tableSvg, frameSvg, gridSvg, svgToDataUrl, insertWithFallback,
// insertItem(ctx, item, pt), dropElement(data, pt, ctx) (the shell's kit drops with data.ref), audioCardSvg(item).
import { insertWithFallback, reportInsert, kitDrag, ensureCss } from "./insert.js";
import { shapeSvg, chartSvg, tableSvg, frameSvg, gridSvg, svgToDataUrl, uniqIds, esc } from "./assets-svg.js";
import { CATEGORIES, COLLECTIONS, catById, loadCat, itemById, search, collectionSections } from "./assets-catalog.js";
export { shapeSvg, chartSvg, tableSvg, frameSvg, gridSvg, svgToDataUrl, insertWithFallback };

const CSS = new URL("./kit.css", import.meta.url).href;
const PANEL = "elements";
const LS_RECENT = "ads-kit-elements-recent", LS_STAR = "ads-kit-elements-starred";
const HOME_ROWS = ["shapes", "graphics", "stickers", "photos", "videos", "audio", "charts", "tables", "frames", "grids", "mockups", "3d", "forms", "animations", "sheets", "icons", "ai", "collections"];
const LAYOUT = { shapes: "g4", graphics: "g3", photos: "photos", videos: "g2v", "3d": "g3", forms: "g2", animations: "g3", audio: "list", sheets: "g2", tables: "g3", charts: "g2", frames: "g3", grids: "g3", mockups: "g2", stickers: "g3", icons: "g4" };
const GENERATE = [["image", "Image"], ["graphic", "Graphic"], ["3d", "3D element"], ["video", "Video clip"], ["audio", "Music or sound"]];
const FILTERS = [["animated", "Animated", (it) => !!it.animated], ["still", "Still", (it) => !it.animated && it.kind !== "audio"], ["horizontal", "Horizontal", (it) => it.aspect > 1.15], ["vertical", "Vertical", (it) => it.aspect > 0 && it.aspect < 0.87], ["square", "Square", (it) => it.aspect >= 0.87 && it.aspect <= 1.15]];
const GENERIC = new Set("frame photo shape chart graph data form input field ui mockup product scene 3d render animated animation sticker gif motion video loop background table grid cells rows columns sheet spreadsheet picture image audio music track song sound effect sfx icon symbol the and a of with".split(" "));

// ---------- tiny DOM + icons
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}
const I = {
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.8 4.8"/>', plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  back: '<path d="M19 12H5.5M11 6l-6 6 6 6"/>', chev: '<path d="m7 10 5 5 5-5"/>', more: '<circle cx="5.5" cy="12" r="1.5" class="f"/><circle cx="12" cy="12" r="1.5" class="f"/><circle cx="18.5" cy="12" r="1.5" class="f"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21"/>', spark: '<path d="M12 3.5c.8 4.2 2.3 5.7 6.5 6.5-4.2.8-5.7 2.3-6.5 6.5-.8-4.2-2.3-5.7-6.5-6.5 4.2-.8 5.7-2.3 6.5-6.5z"/><path d="M18.5 15.5c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>', starOn: '<path class="f" d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  grid: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.5"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.5"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.5"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.5"/>',
  filter: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>', right: '<path d="m9.5 6 6 6-6 6"/>', left: '<path d="m14.5 6-6 6 6 6"/>', check: '<path d="m5 12.5 4.4 4.4L19 7.4"/>',
  download: '<path d="M12 4v10.8M7.6 10.4 12 14.8l4.4-4.4M5 19.5h14"/>', play: '<path class="f" d="M8.5 5.6v12.8l9.8-6.4z"/>', stop: '<rect class="f" x="7" y="7" width="10" height="10" rx="1.5"/>',
};
const icon = (k, cls = "kit-i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
const LS = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const slug = (s) => String(s || "element").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "element";

export function recentIds() { return LS.get(LS_RECENT, []).filter((x) => typeof x === "string"); }
export function starredIds() { return LS.get(LS_STAR, []).filter((x) => typeof x === "string"); }
function pushRecent(id) { LS.set(LS_RECENT, [id, ...recentIds().filter((x) => x !== id)].slice(0, 24)); }
function toggleStar(id) { const s = starredIds(), on = !s.includes(id); LS.set(LS_STAR, on ? [id, ...s].slice(0, 60) : s.filter((x) => x !== id)); return on; }

// ---------- inserting
/** The audio card (fallback for designs that cannot hold sound): name, length and a waveform, clearly a label. */
export function audioCardSvg(it) {
  const tr = it.track || {}, bars = Array.from({ length: 30 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + it.name.length)));
  const wave = bars.map((b, i) => `<rect x="${236 + i * 6}" y="${50 - b * 22}" width="3.4" height="${b * 44}" rx="1.7" fill="#8b7cf7"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 100" width="430" height="100"><rect x="1" y="1" width="428" height="98" rx="18" fill="#f6f5ff" stroke="#ddd8fb" stroke-width="1.5"/><circle cx="50" cy="50" r="28" fill="#5b4cf0"/><path d="M42 36V64L65 50Z" fill="#fff"/><text x="92" y="45" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="bold" fill="#1b2133">${esc(it.name)}</text><text x="92" y="69" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#657089">${esc(tr.kind === "sfx" ? "Sound effect" : "Music")} · ${fmtDur(tr.dur || it.duration || 0)}</text>${wave}</svg>`;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("Took too long.")), ms))]);
const without = (ctx, key) => ({ ...ctx, opts: { ...(ctx?.opts || {}), insert: { ...(ctx?.opts?.insert || {}), [key]: undefined } } });

async function insertVideo(ctx, it, pt, meta) {
  const M = await import("./assets-motion.js");
  const m = it.motion, ins = ctx?.opts?.insert || {};
  const svgSrc = svgToDataUrl(M.animatedSvg(m));
  const base = { name: it.name, duration: m.dur, aspect: m.w / m.h, rel: it.rel, poster: svgToDataUrl(M.frameSvg(m, undefined, 640)), loop: true };
  const metaV = { ...meta, svg: () => uniqIds(M.animatedSvg(m)), svgKind: "video", animated: true };
  if (typeof ins.video === "function") {
    // Editors that take moving pictures get the animated SVG; editors that need a video file (insert.video.files = true,
    // or a timeline with audio) get a real WebM of the loop, recorded on a canvas in real time.
    const wantsFile = ins.video.files === true || (ins.video.files !== false && typeof ins.audio === "function");
    if (!wantsFile) {
      try { if ((await ins.video({ ...base, src: svgSrc, mime: "image/svg+xml", animated: true }, pt)) !== false) { reportInsert({ panel: PANEL, category: it.cat, item: it.id, kind: "video", via: "native", ok: true, how: "video-svg" }); return { ok: true, via: "native", how: "video-svg" }; } }
      catch (e) { console.warn("kit video", e); }
    }
    if (M.canRecord()) {
      let src = null;
      ctx.toast?.(`Making the “${it.name}” clip (${m.dur} s)…`, (m.dur + 3) * 1000);
      try { src = await withTimeout(M.recordWebm(m), (m.dur + 10) * 1000); } catch (e) { console.warn("kit video recording", e); }
      if (src) return insertWithFallback(ctx, "video", { ...base, src, mime: "video/webm" }, pt, metaV);
    }
  }
  return insertWithFallback(without(ctx, "video"), "video", { ...base, src: svgSrc, mime: "image/svg+xml", animated: true }, pt, metaV);
}
async function insertAudio(ctx, it, pt, meta) {
  const tr = it.track, ins = ctx?.opts?.insert || {};
  const base = { name: it.name, duration: tr.dur, loop: !!tr.loop, kind: tr.kind === "sfx" ? "sound effect" : "music", category: tr.sec };
  const metaA = { ...meta, svg: () => audioCardSvg(it), svgKind: "audio-card", rel: 0.55, aspect: 4.3 };
  if (typeof ins.audio === "function") {
    let url = null;
    try { const A = await import("./assets-audio.js"); url = await withTimeout(A.trackDataUrl(tr), 15000); } catch (e) { console.warn("kit audio", e); }
    if (url) return insertWithFallback(ctx, "audio", { ...base, track: url, src: url, mime: "audio/wav" }, pt, metaA);
  }
  const r = await insertWithFallback(without(ctx, "audio"), "audio", base, pt, metaA);
  if (r.ok) ctx.toast?.("Added as an audio card: this design can't play sound. Use … › Download track to save the sound.", 5200);
  return r;
}
/** Inserts one Elements item (click, drag, menu) through the editor's adapter with the shared fallbacks. */
export async function insertItem(ctx, it, pt) {
  const meta = { panel: PANEL, category: it.cat, item: it.id, name: it.name, rel: it.rel, aspect: it.aspect };
  const base = { name: it.name, rel: it.rel, aspect: it.aspect };
  let r;
  const svgLike = (kind, spec, draw) => insertWithFallback(ctx, kind, spec, pt, { ...meta, svg: () => draw(spec) });
  switch (it.kind) {
    case "image": r = await insertWithFallback(ctx, "image", { src: it.src, name: it.name }, pt, meta); break;
    case "shape": r = await svgLike("shape", { ...it.spec, ...base }, (s) => shapeSvg(s, 480)); break;
    case "chart": r = await svgLike("chart", { ...structuredClone(it.spec), ...base }, (s) => chartSvg(s, 720)); break;
    case "table": r = await svgLike("table", { ...structuredClone(it.spec), ...base }, (s) => tableSvg(s, 720)); break;
    case "frame": r = await svgLike("frame", { ...structuredClone(it.spec), ...base }, (s) => frameSvg(s, 600)); break;
    case "grid": r = await svgLike("grid", { ...structuredClone(it.spec), name: it.spec.name || it.name, rel: 1 }, (s) => gridSvg(s, 900)); break;
    case "svg": r = await insertWithFallback(ctx, "svg", { markup: uniqIds(it.markup()), kind: it.svgKind, rel: it.rel, aspect: it.aspect, elementId: it.elementId, animated: !!it.animated, name: it.name }, pt, { ...meta, svgKind: it.svgKind, elementId: it.elementId, animated: !!it.animated }); break;
    case "video": r = await insertVideo(ctx, it, pt, meta); break;
    case "audio": r = await insertAudio(ctx, it, pt, meta); break;
    default: r = { ok: false, error: "Unknown element." };
  }
  if (r?.ok) pushRecent(it.id);
  return r;
}
/** The shell's kit drop for Elements items (data-ads-drag {kit, ref, opts}, routed by panels/index.js dropKit). */
export async function dropElement(data, pt, ctx) {
  const it = await itemById(data.ref);
  if (!it) { const r = { ok: false, error: "That element is not available." }; reportInsert({ panel: PANEL, item: data.ref, kind: data.kit, ok: false, via: "none", error: r.error }); ctx?.toast?.(r.error); return r; }
  const r = await insertItem(ctx, it, pt);
  if (!r?.ok) ctx?.toast?.(r?.error || "Could not add it.");
  return r;
}
function svgFor(it) {
  if (it.kind === "shape") return shapeSvg(it.spec, 800);
  if (it.kind === "chart") return chartSvg(it.spec, 900);
  if (it.kind === "table") return tableSvg(it.spec, 900);
  if (it.kind === "frame") return frameSvg(it.spec, 800);
  if (it.kind === "grid") return gridSvg(it.spec, 900);
  return it.markup?.() || it.thumb?.() || "";
}

// ---------- the panel
export function renderElements(box, ctx) {
  ensureCss(CSS);
  const root = h("div", { class: "kit-el", "data-kit-panel": PANEL });
  box.append(root);
  const st = { view: { v: "home" }, stack: [], q: "", filters: new Set(), items: new Map(), ownEl: null, menu: null, gen: null, seq: 0 };
  const scroller = () => box.closest(".ads-pscroll") || box;
  const toast = (m, ms) => ctx?.toast?.(m, ms);

  function show(view, push = true) {
    closeMenu();
    if (push) st.stack.push({ view: st.view, top: scroller().scrollTop });
    st.view = view; st.seq++;
    render();
    scroller().scrollTop = view.top || 0;
  }
  function back() {
    const prev = st.stack.pop();
    if (!prev) return show({ v: "home" }, false);
    st.q = prev.view.v === "search" ? prev.view.q : "";
    show({ ...prev.view, top: prev.top }, false);
  }
  const home = () => { st.stack = []; st.q = ""; show({ v: "home" }, false); };

  function render() {
    root.replaceChildren(); root.dataset.kitView = st.view.v;
    const v = st.view;
    if (v.v !== "home") root.append(h("div", { class: "kit-back" }, h("button", { type: "button", class: "kit-backbtn", "data-kit": "back", "aria-label": "Back", title: "Back", html: icon("back"), onclick: back }), h("h3", { class: "kit-title", text: title(v) })));
    root.append(searchBlock());
    if (v.v === "home") renderHome();
    else if (v.v === "cat") renderCat(v.cat);
    else if (v.v === "sec") renderSec(v);
    else if (v.v === "search") renderSearch(v);
    else if (v.v === "col") renderCollection(v);
  }
  function title(v) {
    if (v.v === "cat") return catById(v.cat)?.label || "Elements";
    if (v.v === "sec") return v.label;
    if (v.v === "col") return v.col.name;
    if (v.v === "search") return "Search results";
    return "Elements";
  }

  // ----- search block: "Search elements" with the filter icon inside (filters in a popover), like Canva's editor;
  // Generate ▾ and Search under it on the home and results pages.
  function searchBlock() {
    const q = h("input", { type: "search", class: "kit-q", "data-kit": "search", placeholder: "Search elements", "aria-label": "Search elements", enterkeyhint: "search", autocomplete: "off" });
    q.value = st.q;
    const clear = h("button", { type: "button", class: "kit-ibtn", "aria-label": "Clear search", title: "Clear", html: icon("close"), hidden: !st.q, onclick: () => { q.value = ""; st.q = ""; clear.hidden = true; if (st.view.v === "search") home(); else q.focus(); } });
    q.addEventListener("input", () => { clear.hidden = !q.value; });
    q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(q.value); } else if (e.key === "Escape" && q.value) { e.stopPropagation(); q.value = ""; clear.hidden = true; } });
    const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    const mic = SR ? h("button", { type: "button", class: "kit-ibtn", "aria-label": "Search by voice", title: "Search by voice", html: icon("mic"), onclick: () => voice(SR, q, mic) }) : null;
    const nf = st.filters.size;
    const filt = h("button", { type: "button", class: "kit-ibtn kit-filt" + (nf ? " on" : ""), "data-kit": "filter", "aria-label": nf ? `Filters (${nf} on)` : "Filters", title: "Filters", "aria-haspopup": "dialog", "aria-expanded": "false", html: icon("filter") + (nf ? `<span class="kit-badge">${nf}</span>` : ""), onclick: () => filterPop(filt, q) });
    const box1 = h("div", { class: "kit-sbox", role: "search" }, h("span", { class: "kit-mag", html: icon("search") }), q, clear, mic, filt);
    const wrap = h("div", { class: "kit-top" }, box1);
    if (st.view.v === "home" || st.view.v === "search") {
      const genMain = h("button", { type: "button", class: "kit-genbtn", "data-kit": "generate", html: icon("spark") + "<span>Generate</span>", onclick: () => generate(null, q.value) });
      const genMenu = h("button", { type: "button", class: "kit-gensplit", "data-kit": "generate-menu", "aria-label": "Generate options", "aria-haspopup": "menu", "aria-expanded": "false", html: icon("chev"), onclick: () => genOptions(genMenu, q) });
      const go = h("button", { type: "button", class: "kit-go", "data-kit": "go", text: "Search", onclick: () => runSearch(q.value) });
      wrap.append(h("div", { class: "kit-acts" }, h("div", { class: "kit-gen" }, genMain, genMenu), go));
    }
    if (st.gen) wrap.append(soonCard(st.gen));
    return wrap;
  }
  // Filters popover (Canva keeps filters behind the icon in the search box): type and orientation.
  function filterPop(anchor, q) {
    menu(anchor, "Filters", (m) => {
      m.append(h("div", { class: "kit-mhead" }, h("strong", { text: "Filters" }), h("span", { class: "kit-msub", text: "Narrow down search results." })));
      for (const [group, ids] of [["Type", ["animated", "still"]], ["Orientation", ["horizontal", "vertical", "square"]]]) {
        m.append(h("div", { class: "kit-mgroup", text: group }));
        for (const id of ids) {
          const label = FILTERS.find((f) => f[0] === id)[1], on = st.filters.has(id);
          m.append(h("button", { type: "button", class: "kit-mi kit-mcheck", role: "menuitemcheckbox", "aria-checked": String(on), "data-kit-filter": id, onclick: () => { if (st.filters.has(id)) st.filters.delete(id); else st.filters.add(id); closeMenu(); if (st.view.v === "search") { st.seq++; render(); } else if (q.value.trim()) runSearch(q.value); else { render(); toast("Filters apply to search. Type what you're looking for."); } } }, h("span", { html: icon(on ? "check" : "filter") }), h("span", { class: "kit-mil", text: label })));
        }
      }
      if (st.filters.size) m.append(h("button", { type: "button", class: "kit-mi", "data-kit": "filter-clear", onclick: () => { st.filters.clear(); closeMenu(); st.seq++; render(); } }, h("span", { html: icon("close") }), h("span", { class: "kit-mil", text: "Clear filters" })));
    }, "dialog");
  }
  function voice(SR, q, btn) {
    try {
      const r = new SR(); r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
      btn.classList.add("on"); toast("Listening… say what you're looking for.");
      r.onresult = (e) => { const t = e.results?.[0]?.[0]?.transcript || ""; q.value = t; runSearch(t); };
      r.onerror = () => toast("Voice search didn't catch that. Type instead.");
      r.onend = () => btn.classList.remove("on");
      r.start();
    } catch { toast("Voice search isn't available in this browser."); }
  }
  function soonCard(kind) {
    const label = GENERATE.find((g) => g[0] === kind)?.[1];
    return h("div", { class: "kit-soon", role: "note", "data-kit": "generate-soon" },
      h("strong", { html: icon("spark") + `<span>${esc(label ? `Generate: ${label}` : "Generate with AI")} is coming soon</span>` }),
      h("span", { text: "AsaanDesk has no AI generator yet, and we never show made-up results. Search finds matching elements from our own library instead." }),
      h("button", { type: "button", class: "kit-ibtn kit-soonx", "aria-label": "Close", html: icon("close"), onclick: () => { st.gen = null; render(); } }));
  }
  function generate(kind, q) {
    st.gen = kind || "any";
    if (String(q || "").trim()) runSearch(q); else { render(); root.querySelector("[data-kit=search]")?.focus(); }
  }
  function genOptions(anchor, q) {
    menu(anchor, "Generate options", (m) => {
      m.append(h("div", { class: "kit-mhead" }, h("strong", { text: "Generate" }), h("span", { class: "kit-msub", text: "AI generation is coming soon." })));
      for (const [k, label] of GENERATE) m.append(mi(label, "spark", () => generate(k, q.value), "Coming soon"));
    });
  }
  function runSearch(text) {
    const q = String(text || "").trim();
    if (!q) { root.querySelector("[data-kit=search]")?.focus(); return; }
    st.q = q;
    if (st.view.v === "search") { st.view = { v: "search", q, tab: st.view.tab === "all" ? "all" : st.view.tab }; st.seq++; render(); }
    else show({ v: "search", q, tab: st.view.v === "cat" ? st.view.cat : "all" });
  }

  // ----- home: Browse categories, Recently used, Starred, rows with See all, the editor's own panel
  function renderHome() {
    const tiles = h("div", { class: "kit-tiles" });
    for (const c of CATEGORIES) tiles.append(h("button", { type: "button", class: "kit-tile", "data-kit-cat": c.id, "aria-label": c.label, onclick: () => show({ v: "cat", cat: c.id }) }, h("img", { src: svgToDataUrl(c.tile), alt: "", width: 64, height: 64, draggable: "false" }), h("span", { text: c.label })));
    const own = ownSection();
    if (own && ctx?.ownMeta?.kitTop) root.append(own);
    root.append(h("section", { class: "kit-sec", "data-kit-sec": "browse" }, h("h3", { class: "kit-h3", text: "Browse categories" }), tiles));
    const rec = recentIds(), star = starredIds();
    if (rec.length) root.append(idRow("recent", "Recently used", rec));
    if (star.length) root.append(idRow("starred", "Starred", star));
    for (const id of HOME_ROWS) root.append(catRow(id));
    if (own && !ctx?.ownMeta?.kitTop) root.append(own);
  }
  function ownSection() {
    if (typeof ctx?.own !== "function") return null;
    if (!st.ownEl) { st.ownEl = h("div", { class: "kit-ownbody" }); try { ctx.own(st.ownEl); } catch (e) { console.error(e); } }
    if (!st.ownEl.childNodes.length) return null;
    return h("section", { class: "kit-sec kit-own", "data-kit-sec": "own" }, h("h3", { class: "kit-h3", text: ctx?.ownMeta?.kitLabel || "More for this design" }), st.ownEl);
  }
  function rowShell(id, label, onSeeAll) {
    const body = h("div", { class: "kit-rowbody" });
    const sec = h("section", { class: "kit-row", "data-kit-sec": id }, h("div", { class: "kit-rhead" }, h("h3", { text: label }), onSeeAll ? h("button", { type: "button", class: "kit-seeall", "data-kit": "see-all", "aria-label": `See all: ${label}`, text: "See all", onclick: onSeeAll }) : null), body);
    return { sec, body };
  }
  function idRow(id, label, ids) {
    const { sec, body } = rowShell(id, label, () => show({ v: "sec", label, ids }));
    const seq = st.seq;
    Promise.all(ids.slice(0, 14).map((x) => itemById(x).catch(() => null))).then((items) => { if (seq !== st.seq) return; const ok = items.filter(Boolean); if (!ok.length) sec.remove(); else body.append(strip(ok)); });
    return sec;
  }
  function catRow(id) {
    const c = catById(id);
    const { sec, body } = rowShell(id, c.label, () => show({ v: "cat", cat: id }));
    if (c.soon) { body.append(aiCard()); return sec; }
    if (c.collections) { body.append(colStrip()); return sec; }
    const seq = st.seq;
    body.append(h("div", { class: "kit-loading", "aria-hidden": "true" }));
    loadCat(id).then((secs) => { if (seq !== st.seq) return; body.replaceChildren(strip(interleave(secs, 14))); })
      .catch((e) => { body.replaceChildren(h("p", { class: "kit-muted", text: "Could not load these elements. " + (e?.message || "") })); });
    return sec;
  }
  const interleave = (secs, n) => { const out = [], ls = secs.map((s) => s.items); for (let i = 0; out.length < n && ls.some((l) => i < l.length); i++) for (const l of ls) if (i < l.length && out.length < n) out.push(l[i]); return out; };
  function aiCard() {
    return h("div", { class: "kit-soon kit-ai", role: "note" }, h("strong", { html: icon("spark") + "<span>AI-generated elements are coming soon</span>" }),
      h("span", { text: "Describe an image, graphic, 3D element, clip or sound and AI will make it. AsaanDesk has no AI generator yet, and we never show made-up results. Until then, search our library above." }));
  }
  function colStrip() {
    const s = h("div", { class: "kit-strip kit-cols" });
    for (const col of COLLECTIONS) {
      const pics = h("span", { class: "kit-colpics", "aria-hidden": "true" });
      const b = h("button", { type: "button", class: "kit-colcard", "data-kit-col": col.id, "aria-label": `Collection: ${col.name}`, onclick: () => show({ v: "col", col }) }, pics, h("span", { class: "kit-colname", text: col.name }));
      s.append(b);
      collectionSections(col).then((secs) => { for (const it of secs.flatMap((x) => x.items).filter((x) => x.kind !== "audio").slice(0, 4)) pics.append(h("img", { src: it.thumbUrl || svgToDataUrl(it.thumb()), alt: "", draggable: "false", loading: "lazy" })); }).catch(() => {});
    }
    return rowScroller(s);
  }

  // ----- category, section and collection pages: every sub-category is ONE row with See all (the full grid)
  function renderCat(id) {
    const c = catById(id);
    if (c.note) root.append(h("p", { class: "kit-note", text: c.note }));
    if (c.soon) { root.append(h("section", { class: "kit-sec", "data-kit-sec": "ai" }, aiCard())); return; }
    const body = h("div", { class: "kit-catbody" }, h("div", { class: "kit-loading", "aria-hidden": "true" }));
    root.append(body);
    const seq = st.seq;
    if (c.collections) {
      body.replaceChildren();
      for (const col of COLLECTIONS) {
        const { sec, body: b } = rowShell(`col-${col.id}`, col.name, () => show({ v: "col", col }));
        b.append(h("div", { class: "kit-loading", "aria-hidden": "true" })); body.append(sec);
        collectionSections(col).then((secs) => { if (seq === st.seq) b.replaceChildren(strip(interleave(secs, 14))); }).catch(() => b.replaceChildren());
      }
      return;
    }
    loadCat(id).then((secs) => {
      if (seq !== st.seq) return;
      body.replaceChildren();
      for (const s of secs) {
        const { sec, body: b } = rowShell(s.id, s.label, () => show({ v: "sec", cat: id, sec: s.id, label: s.label }));
        b.append(strip(s.items.slice(0, 16), s.id === "lines"));
        body.append(sec);
      }
    }).catch((e) => body.replaceChildren(h("p", { class: "kit-muted", text: "Could not load these elements. " + (e?.message || "") })));
  }
  function renderSec(v) {
    const body = h("section", { class: "kit-sec", "data-kit-sec": v.sec || "list" }, h("div", { class: "kit-loading", "aria-hidden": "true" }));
    root.append(body);
    const seq = st.seq;
    const p = v.ids ? Promise.all(v.ids.map((x) => itemById(x).catch(() => null))).then((l) => l.filter(Boolean))
      : v.items ? Promise.resolve(v.items) : loadCat(v.cat).then((secs) => secs.find((s) => s.id === v.sec)?.items || []);
    p.then((items) => { if (seq !== st.seq) return; body.replaceChildren(items.length ? mixed(items, v.cat, v.sec === "lines") : h("p", { class: "kit-muted", text: "Nothing here yet." })); });
  }
  function renderCollection(v) {
    root.append(h("p", { class: "kit-note", text: "A collection groups elements that go together, from every category." }));
    const body = h("div", { class: "kit-catbody" }, h("div", { class: "kit-loading", "aria-hidden": "true" }));
    root.append(body);
    const seq = st.seq;
    collectionSections(v.col).then((secs) => {
      if (seq !== st.seq) return;
      body.replaceChildren();
      for (const s of secs) { const { sec, body: b } = rowShell(s.id, s.label, () => show({ v: "sec", cat: s.items[0]?.cat, label: `${v.col.name}: ${s.label}`, items: s.items })); b.append(strip(s.items.slice(0, 14))); body.append(sec); }
    });
  }

  // ----- search results: tabs + filter chips + results
  function renderSearch(v) {
    const body = h("div", { class: "kit-sbody" }, h("div", { class: "kit-loading", "aria-hidden": "true" }));
    root.append(body);
    const seq = st.seq;
    search(v.q).then((groups) => {
      if (seq !== st.seq) return;
      body.replaceChildren();
      const pass = (it) => [...st.filters].every((f) => FILTERS.find((x) => x[0] === f)[2](it));
      const gs = groups.map((g) => ({ ...g, items: g.items.filter(pass) })).filter((g) => g.items.length);
      if (v.tab !== "all" && !gs.some((g) => g.cat === v.tab)) v.tab = "all";
      const tabs = h("div", { class: "kit-tabs", role: "tablist", "aria-label": "Result types" });
      for (const [id, label] of [["all", "All"], ...gs.map((g) => [g.cat, g.label])]) {
        tabs.append(h("button", { type: "button", class: "kit-tab", role: "tab", "data-kit": "tab", "data-kit-tab": id, "aria-selected": String(v.tab === id), text: label, onclick: () => { v.tab = id; st.seq++; render(); } }));
      }
      body.append(tabs);
      if (st.filters.size) body.append(h("p", { class: "kit-note kit-fnote" }, `Filters on: ${[...st.filters].map((f) => FILTERS.find((x) => x[0] === f)[1]).join(", ")}. `, h("button", { type: "button", class: "kit-link", text: "Clear filters", onclick: () => { st.filters.clear(); st.seq++; render(); } })));
      const res = h("section", { class: "kit-sec", "data-kit-sec": "results" }, h("h3", { class: "kit-h3", text: "Search results" }));
      body.append(res);
      if (!gs.length) {
        res.append(h("p", { class: "kit-muted", text: groups.length ? "Nothing matches with these filters. Turn a filter off." : `No elements match “${v.q}”. Try another word, for example:` }),
          h("div", { class: "kit-chips" }, ["star", "arrow", "heart", "frame", "chart", "phone", "party", "nature"].map((w) => h("button", { type: "button", class: "kit-chipf", text: w, onclick: () => runSearch(w) }))));
        return;
      }
      if (v.tab === "all") {
        for (const g of gs) {
          const { sec, body: b } = rowShell(`results-${g.cat}`, `${g.label} (${g.items.length})`, () => { v.tab = g.cat; st.seq++; render(); });
          b.append(strip(g.items.slice(0, 14)));
          res.append(sec);
        }
      } else res.append(mixed(gs.find((g) => g.cat === v.tab).items, v.tab));
    }).catch((e) => body.replaceChildren(h("p", { class: "kit-muted", text: "Search failed. " + (e?.message || "") })));
  }

  // ----- item views
  function mixed(items, cat, lines) {
    const au = items.filter((x) => x.kind === "audio"), vis = items.filter((x) => x.kind !== "audio");
    if (!vis.length) return list(au);
    const g = cat && vis.every((x) => x.cat === cat) ? grid(vis, cat, lines) : grid(vis, "graphics");
    return au.length ? h("div", { class: "kit-mixed" }, g, list(au)) : g;
  }
  function grid(items, cat, lines) {
    const lay = lines || (cat === "shapes" && items.every((x) => x.line)) ? "gl" : LAYOUT[cat] || "g3";
    if (lay === "list") return list(items);
    const g = h("div", { class: `kit-grid kit-${lay}` });
    for (const it of items) g.append(cell(it, "grid"));
    return g;
  }
  // One horizontally scrolling row with round arrow buttons at its ends (Canva's rows); See all shows the full grid.
  function strip(items, lines) {
    const s = h("div", { class: "kit-strip" + (lines ? " kit-lines" : "") });
    for (const it of items) s.append(cell(it, "strip"));
    return rowScroller(s);
  }
  function rowScroller(s) {
    const prev = h("button", { type: "button", class: "kit-arrow kit-arrow-l", "data-kit": "row-prev", "aria-label": "Scroll back", tabindex: "-1", html: icon("left"), hidden: true });
    const next = h("button", { type: "button", class: "kit-arrow kit-arrow-r", "data-kit": "row-next", "aria-label": "Scroll for more", tabindex: "-1", html: icon("right"), hidden: true });
    const upd = () => { const max = s.scrollWidth - s.clientWidth; prev.hidden = !(s.scrollLeft > 2); next.hidden = !(max > 2 && s.scrollLeft < max - 2); };
    const go = (dir) => { const d = Math.max(120, s.clientWidth * 0.8) * dir; if (s.scrollBy) s.scrollBy({ left: d, behavior: reduced() ? "auto" : "smooth" }); else s.scrollLeft += d; setTimeout(upd, 400); };
    prev.addEventListener("click", (e) => { e.stopPropagation(); go(-1); });
    next.addEventListener("click", (e) => { e.stopPropagation(); go(1); });
    s.addEventListener("scroll", upd, { passive: true });
    globalThis.requestAnimationFrame?.(upd); setTimeout(upd, 250);
    try { new ResizeObserver(upd).observe(s); } catch {}
    return h("div", { class: "kit-rowwrap" }, s, prev, next);
  }
  function list(items) { const l = h("div", { class: "kit-list" }); for (const it of items) l.append(audioRow(it)); return l; }

  function register(it) { st.items.set(it.id, it); }
  function thumbSrc(it) {
    if (it.thumbUrl) return it.thumbUrl;
    if (it.animThumb && it.kind !== "video" && !reduced()) return (it._anim ||= svgToDataUrl(it.animThumb()));
    return (it._still ||= svgToDataUrl(it.thumb()));
  }
  function cell(it, mode) {
    if (it.kind === "audio" && mode !== "strip") return audioRow(it);
    register(it);
    if (it.kind === "audio") { // a track card in rows: cover with a play button, name, length (Canva's audio rows)
      const tr = it.track || {}, sfx = tr.kind === "sfx";
      const bars = Array.from({ length: 14 }, (_, i) => { const a = 5 + 17 * Math.abs(Math.sin(i * 1.3 + it.name.length)); return `<rect x="${8 + i * 6}" y="${(36 - a).toFixed(1)}" width="3.2" height="${(a * 2).toFixed(1)}" rx="1.6" fill="#fff" fill-opacity=".85" stroke="none"/>`; }).join("");
      const b = h("button", { type: "button", class: "kit-item kit-k-audio", "data-kit-item": it.id, "aria-label": `Add ${it.name} (${fmtDur(tr.dur || 0)})`, title: `Add ${it.name}` },
        h("span", { class: "kit-acover", style: `--c1:${sfx ? "#2dd4bf" : "#8b7cf7"};--c2:${sfx ? "#0e7490" : "#5b4cf0"}`, html: `<svg viewBox="0 0 100 84" aria-hidden="true">${bars}</svg>` }),
        h("span", { class: "kit-acname", text: it.name }), h("span", { class: "kit-acdur", text: `${sfx ? "Sound effect" : "Music"} · ${fmtDur(tr.dur || 0)}` }));
      kitDrag(b, { kit: "audio", ref: it.id, opts: { panel: PANEL, category: it.cat, item: it.id, name: it.name } });
      return h("div", { class: "kit-cell kit-acard" }, b, playBtn(it, "kit-play kit-play-sm"), h("button", { type: "button", class: "kit-more", "data-kit": "more", "aria-label": `More options for ${it.name}`, "aria-haspopup": "menu", "aria-expanded": "false", html: icon("more") }));
    }
    const label = it.kind === "video" ? `${it.name}, animated loop, ${it.duration} seconds` : it.name;
    const img = h("img", { src: thumbSrc(it), alt: "", draggable: "false", loading: "lazy", decoding: "async" });
    const b = h("button", { type: "button", class: `kit-item kit-k-${it.cat}`, "data-kit-item": it.id, "aria-label": `Add ${label}`, title: it.name }, img);
    if (it.kind === "video") {
      b.append(h("span", { class: "kit-dur", text: `${it.duration.toFixed(1)}s`, "aria-hidden": "true" }));
      if (!reduced()) { b.addEventListener("pointerenter", () => { img.src = it._anim ||= svgToDataUrl(it.animThumb()); }); b.addEventListener("pointerleave", () => { img.src = thumbSrc(it); }); }
    }
    kitDrag(b, { kit: it.kind, ref: it.id, opts: { panel: PANEL, category: it.cat, item: it.id, name: it.name } });
    const more = h("button", { type: "button", class: "kit-more", "data-kit": "more", "aria-label": `More options for ${it.name}`, "aria-haspopup": "menu", "aria-expanded": "false", title: "More", html: icon("more") });
    const a = it.aspect > 0 ? it.aspect : 1;
    const c = h("div", { class: "kit-cell" + (starredIds().includes(it.id) ? " kit-starred" : ""), style: `--a:${a.toFixed(3)}` }, b, more);
    if (mode === "strip") c.style.setProperty("--w", `${Math.round(clamp((it.line ? 40 : 72) * a, 56, it.line ? 92 : 150))}px`);
    return c;
  }
  function playBtn(it, cls = "kit-play") {
    const tr = it.track || {};
    const play = h("button", { type: "button", class: cls, "data-kit": "play", "aria-label": `Play preview: ${it.name}`, "aria-pressed": "false", title: "Preview", html: icon("play"), style: `--c1:${tr.kind === "sfx" ? "#2dd4bf" : "#8b7cf7"};--c2:${tr.kind === "sfx" ? "#0e7490" : "#5b4cf0"}` });
    play.addEventListener("click", (e) => { e.stopPropagation(); preview(it, play); });
    return play;
  }
  function audioRow(it) {
    register(it);
    const tr = it.track || {};
    const play = playBtn(it);
    const b = h("button", { type: "button", class: "kit-item kit-aitem", "data-kit-item": it.id, "aria-label": `Add ${it.name} (${fmtDur(tr.dur || 0)})`, title: `Add ${it.name}` }, h("span", { class: "kit-aname", text: it.name }), h("span", { class: "kit-asub", text: `${tr.mood || ""} · ${fmtDur(tr.dur || 0)}` }));
    kitDrag(b, { kit: "audio", ref: it.id, opts: { panel: PANEL, category: it.cat, item: it.id, name: it.name } });
    const more = h("button", { type: "button", class: "kit-more", "data-kit": "more", "aria-label": `More options for ${it.name}`, "aria-haspopup": "menu", "aria-expanded": "false", title: "More", html: icon("more") });
    return h("div", { class: "kit-cell kit-audio" }, play, b, more);
  }
  async function preview(it, btn) {
    const A = await import("./assets-audio.js");
    if (btn.getAttribute("aria-pressed") === "true") { A.stopPreview(); return; }
    for (const o of root.querySelectorAll('.kit-play[aria-pressed="true"]')) { o.setAttribute("aria-pressed", "false"); o.innerHTML = icon("play"); }
    btn.classList.add("kit-wait");
    try {
      await A.previewTrack(it.track, () => { btn.setAttribute("aria-pressed", "false"); btn.innerHTML = icon("play"); btn.setAttribute("aria-label", `Play preview: ${it.name}`); });
      btn.setAttribute("aria-pressed", "true"); btn.innerHTML = icon("stop"); btn.setAttribute("aria-label", `Stop preview: ${it.name}`);
    } catch (e) { toast(e?.message || "This browser can't play the preview."); }
    finally { btn.classList.remove("kit-wait"); }
  }

  // ----- clicks: insert (delegated), "…" menus
  root.addEventListener("click", (e) => {
    const more = e.target.closest?.("[data-kit=more]");
    if (more && root.contains(more)) { e.preventDefault(); const b = more.parentElement.querySelector("[data-kit-item]"); const it = b && st.items.get(b.dataset.kitItem); if (it) itemMenu(more, it); return; }
    const t = e.target.closest?.("[data-kit-item]");
    if (t && root.contains(t)) { e.preventDefault(); const it = st.items.get(t.dataset.kitItem); if (it) add(it, t); }
  });
  async function add(it, el, pt) {
    el?.closest(".kit-cell")?.classList.add("kit-busy");
    try { const r = await insertItem(ctx, it, pt); if (!r?.ok) toast(r?.error || "Could not add it."); }
    catch (e) { toast(e?.message || "Could not add it."); }
    finally { el?.closest(".kit-cell")?.classList.remove("kit-busy"); }
  }
  function mi(label, ic, act, hint) {
    return h("button", { type: "button", class: "kit-mi", role: "menuitem", onclick: () => { closeMenu(); act(); } }, h("span", { html: icon(ic) }), h("span", { class: "kit-mil", text: label }), hint ? h("span", { class: "kit-mhint", text: hint }) : null);
  }
  function itemMenu(anchor, it) {
    menu(anchor, `${it.name} options`, (m) => {
      const starred = starredIds().includes(it.id);
      m.append(h("div", { class: "kit-mhead" }, h("strong", { text: it.name }), h("span", { class: "kit-msub", text: it.credit || "AsaanDesk original · free to use" })));
      const words = [...new Set(String(it.tags).split(/\s+/))].filter((w) => w.length > 2 && !GENERIC.has(w) && w !== it.cat).slice(0, 6);
      if (words.length) m.append(h("div", { class: "kit-mtags" }, words.map((w) => h("button", { type: "button", class: "kit-tag", text: w, onclick: () => { closeMenu(); runSearch(w); } }))));
      m.append(mi(starred ? "Remove star" : "Star", starred ? "starOn" : "star", () => { const on = toggleStar(it.id); anchor.closest(".kit-cell")?.classList.toggle("kit-starred", on); toast(on ? `Starred: ${it.name}. Find it under Starred.` : "Star removed."); }));
      m.append(mi("See more like this", "search", () => runSearch(words[0] || it.name.split(" ")[0])));
      m.append(mi(`View ${catById(it.cat)?.label || "category"}`, "grid", () => show({ v: "cat", cat: it.cat })));
      m.append(mi(it.kind === "audio" ? "Download track" : "Download", "download", () => download(it)));
      m.append(mi("Add to design", "plus", () => add(it, anchor)));
    });
  }
  async function download(it) {
    try {
      let url, ext = "svg";
      if (it.kind === "image") { url = it.src; ext = (/\.(\w+)$/.exec(it.src)?.[1] || "jpg"); }
      else if (it.kind === "audio") { const A = await import("./assets-audio.js"); toast("Making the track…"); url = await A.trackDataUrl(it.track); ext = "wav"; }
      else url = svgToDataUrl(svgFor(it));
      const a = h("a", { href: url, download: `${slug(it.name)}.${ext}` }); document.body.append(a); a.click(); a.remove();
    } catch (e) { toast(e?.message || "Could not download it."); }
  }
  function menu(anchor, label, build, role = "menu") {
    if (st.menu?.anchor === anchor) { closeMenu(); return; }
    closeMenu();
    const m = h("div", { class: "kit-menu", role, "aria-label": label, tabindex: "-1", "data-kit": "menu" });
    build(m);
    (ctx?.shell?.el || document.body).append(m);
    anchor.setAttribute("aria-expanded", "true");
    const r = anchor.getBoundingClientRect(), W = m.offsetWidth || 250, H = m.offsetHeight || 300;
    const vw = globalThis.innerWidth || 1024, vh = globalThis.innerHeight || 768;
    let x = r.right + 8; if (x + W > vw - 8) x = Math.max(8, r.left - W - 8);
    let y = clamp(r.top, 8, Math.max(8, vh - H - 8));
    m.style.left = `${Math.round(x)}px`; m.style.top = `${Math.round(y)}px`;
    const out = (e) => { if (!m.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closeMenu(); };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); closeMenu(); anchor.focus(); } else if (e.key === "ArrowDown" || e.key === "ArrowUp") { const its = [...m.querySelectorAll("button")], i = its.indexOf(document.activeElement); e.preventDefault(); its[(i + (e.key === "ArrowDown" ? 1 : -1) + its.length) % its.length]?.focus(); } };
    st.menu = { el: m, anchor, out, key };
    setTimeout(() => { if (st.menu?.el === m) document.addEventListener("pointerdown", out, true); });
    m.addEventListener("keydown", key);
    (m.querySelector(".kit-mi") || m).focus({ preventScroll: true });
  }
  function closeMenu() {
    const c = st.menu; if (!c) return; st.menu = null;
    document.removeEventListener("pointerdown", c.out, true);
    c.anchor?.setAttribute("aria-expanded", "false"); c.el.remove();
  }
  scroller().addEventListener("scroll", () => { if (st.menu) closeMenu(); }, { passive: true, capture: true });

  render();
  // panel API for tests and the shell (search from outside, current view)
  box._kitElements = { show, back, home, runSearch, get view() { return st.view; }, insertItem: (it, pt) => insertItem(ctx, it, pt) };
  return box._kitElements;
}
