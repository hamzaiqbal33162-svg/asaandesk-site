// Brand, Uploads, Projects and Apps panels of the editor frame, in Canva's structure (LEFT-RAIL PANELS PARITY).
// editor-shell.js loads this module the first time one of them opens and passes S = its own helpers (h, icon, mk,
// popover, menuItem, toast, upTx, dragPayload, renderPanel, saveToProjects, …). Our own look; everything is kept on
// this device (localStorage + the shell's IndexedDB "uploads" store). Sections carry data-kit-sec for the e2e.
//   Brand:    two columns: search, Brand Kit picker ▾, menu (All assets +, Guidelines, Brand templates, Logos, Colours,
//             Fonts, Brand voice, Photos, Components, Graphics, Icons) | the chosen part; All assets = hero, every part,
//             Manage Brand Kit (rename, delete). Each part with add / edit. No paywall anywhere.
//   Uploads:  search · Upload files + "…" (folder, record yourself, link) · Record yourself · tabs Images / Videos /
//             Audio · empty state "Upload, store and organise" · drag files onto the panel · "…" per item.
//   Projects: Search your content · Your projects ▾ (+ Save) · tabs All / Designs / Folders / Images · recent designs,
//             Folders (Create folder, Starred, yours), Images with See all.
//   Apps:     Search apps · tabs Discover / Your apps · Tools for this design (S.ownTools) · Featured · Top picks · Use
//             in this design (Translate, QR code, Write with AI) · AI tools · Discover (categories).
//   S.own (the editor's own panel for that rail item, if any) is shown as a last section "More from this editor".
import { insertWithFallback } from "./insert.js";

const FOLDERS = "asaandesk-folders";        // [{id, name, created, projects: [projectId]}] shared by Uploads and Projects
const KITS = "asaandesk-brand-kits";         // the other brand kits; the active one is shared/brand.js's kit
const YOUR_APPS = "asaandesk-your-apps";     // apps opened from the Apps panel, newest first
const LIMIT = { image: 25e6, video: 200e6, audio: 50e6 };
const kindOf = (it) => (/^video\//.test(it.type) ? "video" : /^audio\//.test(it.type) ? "audio" : "image");
const urls = new Map();
const blobUrl = (it) => { if (!it.blob) return it.data || it.src || ""; if (!urls.has(it.id)) urls.set(it.id, URL.createObjectURL(it.blob)); return urls.get(it.id); };
const mmss = (s) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");
const kitCtx = (S) => ({ opts: S.opts, toast: S.toast, shell: S.shell });
const folders = (S) => S.LS.get(FOLDERS, []);
const setFolders = (S, f) => S.LS.set(FOLDERS, f);
async function allUploads(S) { let items = []; try { items = await S.upTx("readonly", (s) => s.getAll()); } catch {} return (items || []).sort((a, z) => (z.added || 0) - (a.added || 0)); }
const userUploads = (items) => items.filter((it) => !it.brand);

function sec(S, id, title, ...extra) {
  const { h } = S;
  return h("section", { class: "ads-ksec", "data-kit-sec": id, "aria-label": title }, h("div", { class: "ads-khead" }, h("h3", { class: "ads-h3", text: title }), ...extra));
}
const plusBtn = (S, label, onclick, extra = {}) => S.h("button", { type: "button", class: "ads-kadd", "aria-label": label, title: label, html: S.icon("plus"), onclick, ...extra });
const linkBtn = (S, text, onclick, extra = {}) => S.h("button", { type: "button", class: "ads-klink", text, onclick, ...extra });
function fileInput(S, accept, onFiles, extra = {}) {
  const inp = S.h("input", { type: "file", accept, multiple: true, class: "ads-file", tabindex: "-1", ...extra });
  inp.addEventListener("change", () => { const fs = [...(inp.files || [])]; inp.value = ""; if (fs.length) onFiles(fs); });
  return inp;
}
/** Shrinks a picture to at most max px on its long side (keeps small files small in localStorage); PNG keeps transparency. */
function shrink(dataUrl, max = 640) {
  return new Promise((res) => {
    if (typeof Image !== "function" || !/^data:image\/(png|jpe?g|webp)/.test(dataUrl)) return res(dataUrl);
    const img = new Image(); const t = setTimeout(() => res(dataUrl), 1500);
    img.onload = () => { clearTimeout(t); try { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); if (k >= 1) return res(dataUrl); const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL(/png/.test(dataUrl) ? "image/png" : "image/jpeg", 0.88)); } catch { res(dataUrl); } };
    img.onerror = () => { clearTimeout(t); res(dataUrl); }; img.src = dataUrl;
  });
}
/** A still and the length of a video file (for the Videos tab and as the fallback picture). */
function videoInfo(blob) {
  return new Promise((res) => {
    if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") return res({});
    let v; try { v = document.createElement("video"); } catch { return res({}); }
    const u = URL.createObjectURL(blob); const done = (x) => { clearTimeout(t); try { URL.revokeObjectURL(u); } catch {} res(x); };
    const t = setTimeout(() => done({}), 6000);
    v.muted = true; v.preload = "auto"; v.playsInline = true;
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 3); } catch { done({ duration: v.duration }); } };
    v.onseeked = () => { try { const k = Math.min(1, 360 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * k) || 320; c.height = Math.round(v.videoHeight * k) || 180; c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); done({ poster: c.toDataURL("image/jpeg", 0.8), duration: v.duration, aspect: v.videoWidth / v.videoHeight || 16 / 9 }); } catch { done({ duration: v.duration }); } };
    v.onerror = () => done({}); v.src = u;
  });
}
function audioInfo(blob) {
  return new Promise((res) => {
    let a; try { a = document.createElement("audio"); } catch { return res({}); }
    if (typeof URL?.createObjectURL !== "function") return res({});
    const u = URL.createObjectURL(blob); const t = setTimeout(() => { URL.revokeObjectURL(u); res({}); }, 5000);
    a.preload = "metadata"; a.onloadedmetadata = () => { clearTimeout(t); URL.revokeObjectURL(u); res({ duration: a.duration }); }; a.onerror = () => { clearTimeout(t); URL.revokeObjectURL(u); res({}); }; a.src = u;
  });
}
/** Saves files in the uploads store. extra = {folder, brand, kit}. Returns the saved records. */
export async function storeFiles(S, files, extra = {}) {
  const saved = [];
  for (const f of files) {
    const type = f.type || "", k = /^video\//.test(type) ? "video" : /^audio\//.test(type) ? "audio" : /^image\//.test(type) ? "image" : "";
    if (!k) { S.toast(`${f.name} is not a picture, video or sound`); continue; }
    if (f.size > LIMIT[k]) { S.toast(`${f.name} is larger than ${LIMIT[k] / 1e6} MB`); continue; }
    try {
      const rec = { id: S.rid(), name: f.name || `${k} file`, type, added: Date.now() + saved.length, ...extra };
      if (k === "image") rec.data = await S.readUrl(f);
      else { rec.blob = f; Object.assign(rec, k === "video" ? await videoInfo(f) : await audioInfo(f)); }
      await S.upTx("readwrite", (s) => s.put(rec)); saved.push(rec);
    } catch { S.toast("This browser could not keep the file."); }
  }
  return saved;
}
/** Adds an upload to the design: pictures through insert.image, videos/sounds through insert.video / insert.audio. */
export async function useUpload(S, it, pt) {
  const ins = S.opts.insert || {}, k = kindOf(it);
  try {
    if (k === "image") { await ins.image?.(it.data, it.name, pt); S.toast("Image added"); return true; }
    if (k === "video") {
      const r = await insertWithFallback(kitCtx(S), "video", { src: blobUrl(it), poster: it.poster, name: it.name, duration: it.duration, aspect: it.aspect }, pt, { panel: "uploads", category: "videos", item: it.id, name: it.name });
      S.toast(r.ok ? (r.via === "native" ? "Video added" : "Added a still of the video: this editor has no video layers") : "This editor cannot play videos. Open it in the Video editor."); return r.ok;
    }
    const r = await insertWithFallback(kitCtx(S), "audio", { track: blobUrl(it), name: it.name, duration: it.duration }, pt, { panel: "uploads", category: "audio", item: it.id, name: it.name });
    S.toast(r.ok ? "Sound added" : "This editor has no sound track. Use it in the Video editor."); return r.ok;
  } catch (e) { S.toast(e?.message || "Could not add it."); return false; }
}
/** Card for one upload: click adds it, drag drops it (pictures through the shell's upload drop; videos/sounds via the kit). */
function uploadCard(S, it, { onMore } = {}) {
  const { h, icon } = S, k = kindOf(it);
  const thumb = k === "image" ? h("img", { src: it.data, alt: "", loading: "lazy" }) : k === "video" ? (it.poster ? h("img", { src: it.poster, alt: "", loading: "lazy" }) : h("span", { class: "ads-uvicon", html: icon("video") })) : h("span", { class: "ads-uaicon", html: icon("music") });
  const use = h("button", { type: "button", class: `ads-tcard ads-ucard ads-u-${k}`, "aria-label": `Add ${it.name} to the design`, title: it.name, "data-upload": it.id, "data-search": it.name },
    h("span", { class: "ads-tthumb ads-contain" }, thumb, k !== "image" && it.duration ? h("span", { class: "ads-udur", text: mmss(it.duration) }) : ""), h("span", { class: "ads-tname", text: it.name }));
  use.addEventListener("click", () => useUpload(S, it));
  if (k === "image") S.dragPayload(use, { kind: "upload", id: it.id, name: it.name });
  else {
    use.setAttribute("data-ads-drag", JSON.stringify({ kit: k, lazy: true })); use.draggable = true;
    use.addEventListener("dragstart", () => use.setAttribute("data-ads-drag", JSON.stringify(k === "video"
      ? { kit: "video", spec: { src: blobUrl(it), poster: it.poster, name: it.name, duration: it.duration, aspect: it.aspect }, opts: { panel: "uploads", category: "videos", item: it.id, name: it.name } }
      : { kit: "audio", spec: { track: blobUrl(it), name: it.name, duration: it.duration }, opts: { panel: "uploads", category: "audio", item: it.id, name: it.name } })));
  }
  const more = h("button", { type: "button", class: "ads-upmore", "aria-label": `More options for ${it.name}`, title: "More options", "aria-haspopup": "menu", "aria-expanded": "false", html: icon("more") });
  more.addEventListener("click", (e) => { e.stopPropagation(); onMore?.(more, it); });
  return h("div", { class: "ads-upitem", "data-kind": k }, use, more);
}
/** "…" menu of an upload: move to a folder, rename, delete. */
function uploadMenu(S, anchor, it, redraw) {
  S.popover(anchor, (p) => {
    p.append(S.menuHead("Move to folder"));
    for (const f of folders(S)) p.append(S.menuItem(f.name, async () => { await S.upTx("readwrite", (s) => s.put({ ...it, folder: f.id })); S.toast(`Moved to ${f.name}`); redraw(); }, { iconName: "projects", checked: it.folder === f.id }));
    p.append(S.menuItem("New folder", async () => { const f = newFolder(S); await S.upTx("readwrite", (s) => s.put({ ...it, folder: f.id })); S.toast(`Moved to ${f.name}`); redraw(); }, { iconName: "plus" }));
    if (it.folder) p.append(S.menuItem("Take out of the folder", async () => { const { folder, ...rest } = it; await S.upTx("readwrite", (s) => s.put(rest)); redraw(); }, { iconName: "left" }));
    p.append(S.h("hr", { class: "ads-hr" }));
    p.append(S.menuItem("Rename", () => renameInline(S, anchor.closest(".ads-upitem"), it.name, async (name) => { await S.upTx("readwrite", (s) => s.put({ ...it, name })); redraw(); }), { iconName: "pencil" }));
    p.append(S.menuItem("Delete", async () => { await S.upTx("readwrite", (s) => s.delete(it.id)); if (urls.has(it.id)) { try { URL.revokeObjectURL(urls.get(it.id)); } catch {} urls.delete(it.id); } S.toast(`Deleted ${it.name}`); redraw(); }, { iconName: "trash" }));
  }, { label: `Options for ${it.name}`, name: "upload-more" });
}
function renameInline(S, host, value, onSave) {
  if (!host) return;
  const inp = S.h("input", { type: "text", class: "ads-in ads-rename", value, "aria-label": "New name", maxlength: "120" });
  const done = (ok) => { const v = inp.value.trim(); inp.remove(); if (ok && v && v !== value) onSave(v); };
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(true); if (e.key === "Escape") { e.stopPropagation(); done(false); } });
  inp.addEventListener("blur", () => done(true));
  host.append(inp); inp.focus(); inp.select();
}
function newFolder(S, name) {
  const all = folders(S); let n = all.length + 1; while (all.some((f) => f.name === `Folder ${n}`)) n++;
  const f = { id: S.rid(), name: name || `Folder ${n}`, created: Date.now(), projects: [] };
  setFolders(S, [...all, f]); return f;
}
function tabsRow(S, tabs, cur, onPick, label) {
  const { h } = S;
  return h("div", { class: "ads-ktabs", role: "tablist", "aria-label": label, "data-kit-sec": "tabs" }, tabs.map(([id, text]) => {
    const b = h("button", { type: "button", class: "ads-ktab" + (id === cur ? " on" : ""), role: "tab", "aria-selected": String(id === cur), "data-tab": id, "data-kit": "tab", text });
    b.addEventListener("click", () => onPick(id)); return b;
  }));
}
function searchRow(S, placeholder, onInput, extra = {}) {
  const q = S.h("input", { type: "search", class: "ads-search-in", placeholder, "aria-label": placeholder, "data-kit": "search", autocomplete: "off", ...extra });
  q.addEventListener("input", () => onInput(q.value.trim().toLowerCase().split(/\s+/).filter(Boolean)));
  return { row: S.h("label", { class: "ads-search ads-psearch", html: S.icon("search") }, q), q };
}
const matches = (words, text) => words.every((w) => String(text || "").toLowerCase().includes(w));
/** The editor's own panel for this rail item (S.own), folded away under "More from this editor" (Canva has one panel). */
function ownSection(S) {
  if (typeof S.own !== "function") return null;
  const box = S.h("div", { class: "ads-ownbox" });
  try { S.own(box); } catch (e) { console.error(e); }
  if (!box.childNodes.length) return null;
  return S.h("details", { class: "ads-ksec ads-kown", "data-kit-sec": "own" }, S.h("summary", { class: "ads-kownsum", text: "More from this editor" }), box);
}

/** What "Apply brand to the whole design" says. The editor's applyBrand gets the current kit and returns true / false (it
 *  already said what happened or why not), a string (its message), { colors, fonts } counts (Studio), or nothing. */
export function applyBrandMessage(r) {
  if (r === false || r === true) return "";
  if (typeof r === "string") return r;
  if (r && typeof r === "object" && r.colors && typeof r.colors === "object") {
    const n = Object.keys(r.colors).length, f = r.fonts || 0;
    return n || f ? `Brand applied: ${n} colour${n === 1 ? "" : "s"} and ${f} text font${f === 1 ? "" : "s"} changed.` : "Nothing to change: add brand colours first.";
  }
  return "Brand applied to the whole design.";
}

// =====================================================================================================================
// Brand
// Two columns like Canva's Brand panel: left = search, Brand Kit picker and the menu (All assets, Guidelines, Brand
// templates, Logos, Colours, Fonts, Brand voice, Photos, Components, Graphics, Icons); right = the chosen part. All
// assets = our own hero picture, every part stacked, and "Manage Brand Kit" (rename, delete, new). Fully usable: no
// paywall or trial anywhere. On phones the menu becomes a row of chips above the content.
const BRAND_MENU = [["all", "All assets"], ["guidelines", "Guidelines"], ["templates", "Brand templates"], null, ["logos", "Logos"], ["colors", "Colours"], ["fonts", "Fonts"], ["voice", "Brand voice"], ["photos", "Photos"], ["components", "Components"], ["graphics", "Graphics"], ["icons", "Icons"]];
function brandHero(kit) {
  const c = [...(kit.colors || []), "#5b4cf0", "#ff7a59", "#14b8a6"].slice(0, 3);
  return `<svg viewBox="0 0 320 150" role="img" aria-label="Your brand: colours, fonts and logo"><defs><linearGradient id="adsbh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0f7f4"/><stop offset="1" stop-color="#ece9ff"/></linearGradient></defs><rect width="320" height="150" rx="14" fill="url(#adsbh)"/><text x="26" y="98" font-family="Georgia, serif" font-size="76" font-weight="700" fill="${c[0]}">Aa</text><rect x="28" y="114" width="44" height="14" rx="3" fill="${c[0]}"/><rect x="74" y="114" width="44" height="14" rx="3" fill="${c[1]}"/><rect x="120" y="114" width="44" height="14" rx="3" fill="${c[2]}"/><circle cx="246" cy="74" r="50" fill="${c[1]}" opacity=".9"/><path d="m246 40 9.5 19.3 21.3 3.1-15.4 15 3.6 21.2-19-10-19 10 3.6-21.2-15.4-15 21.3-3.1z" fill="#fff"/></svg>`;
}
export function renderBrand(b, S) {
  const { h, icon, toast, opts } = S, ins = opts.insert || {};
  let kit = S.loadBrand();
  const kitId = kit.id || "default";
  const st = (b._brand ||= { edit: {}, view: "all", q: "" });
  const redraw = () => S.renderPanel("brand", b);
  const save = (patch) => { kit = { ...S.loadBrand(), ...patch }; S.saveBrand(kit); };
  const others = () => S.LS.get(KITS, []).filter((k) => k && k.name);
  const nav = h("nav", { class: "ads-bnav", "aria-label": "Brand kit parts" });
  const main = h("div", { class: "ads-bmain" });
  const root = h("div", { class: "ads-kbrand ads-kbrand2" }, nav, main);
  b.append(root);

  // ----- left: search, Brand Kit picker, menu
  const q = h("input", { type: "search", class: "ads-search-in", placeholder: "Search", "aria-label": "Search your brand kit", "data-kit": "search", autocomplete: "off" }); q.value = st.q;
  nav.append(h("label", { class: "ads-search ads-bsearch", html: icon("search") }, q));
  const dot = h("span", { class: "ads-kitdot", style: `--c:${kit.colors?.[0] || "#5b4cf0"}` }); if (kit.logos?.[0]?.src) dot.append(h("img", { src: kit.logos[0].src, alt: "" }));
  const pick = h("button", { type: "button", class: "ads-kitpick", "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "brand-kit-pick", "aria-label": `Brand kit: ${kit.name}` }, dot, h("b", { text: kit.name || "My brand" }), h("span", { html: icon("chev", "ads-chev") }));
  const switchTo = (k) => { const rest = others().filter((x) => x.id !== k.id); S.LS.set(KITS, [...rest, { ...S.loadBrand(), id: kitId }]); S.saveBrand({ ...k }); toast(`Brand kit: ${k.name}`); redraw(); };
  const createKit = () => { const n = others().length + 2; S.LS.set(KITS, [...others(), { ...S.loadBrand(), id: kitId }]); S.saveBrand({ id: S.rid(), name: `Brand kit ${n}`, colors: ["#1b2133", "#ffffff"], fonts: { heading: "sans", subheading: "sans", body: "sans" }, logos: [] }); st.view = "all"; toast("New brand kit made: add its logos, colours and fonts"); redraw(); };
  const renameKit = (host) => renameInline(S, host, kit.name, (name) => { save({ name }); redraw(); });
  const deleteKit = () => {
    const [next, ...rest] = others();
    if (next) { S.LS.set(KITS, rest); S.saveBrand(next); toast(`Deleted ${kit.name}`); }
    else { S.saveBrand({ id: S.rid(), name: "My brand", colors: ["#5b4cf0", "#ff7a59", "#14b8a6", "#1f2937", "#ffffff"], fonts: { heading: "sans", body: "sans" }, logos: [] }); toast(`${kit.name} was cleared (it was your only brand kit)`); }
    st.view = "all"; redraw();
  };
  pick.addEventListener("click", () => S.popover(pick, (p) => {
    p.append(S.menuHead("Brand kits"), S.menuItem(kit.name || "My brand", null, { checked: true, role: "menuitemradio" }));
    for (const k of others()) p.append(S.menuItem(k.name, () => switchTo(k), { role: "menuitemradio", checked: false }));
    p.append(h("hr", { class: "ads-hr" }), S.menuItem("Create a brand kit", createKit, { iconName: "plus" }), S.menuItem("Rename this brand kit", () => renameKit(pick.parentElement), { iconName: "pencil" }));
  }, { label: "Brand kits", name: "brand-kit" }));
  nav.append(h("div", { class: "ads-kpickrow", "data-kit-sec": "kit" }, pick));
  const allB = plusBtn(S, "Add to your brand kit", null, { "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "brand-add" });
  const menu = h("div", { class: "ads-bmenu", role: "list" });
  for (const m of BRAND_MENU) {
    if (!m) { menu.append(h("span", { class: "ads-bsep", role: "separator" })); continue; }
    const [id, label] = m;
    const it = h("button", { type: "button", class: "ads-bmi", role: "listitem", "data-view": id, "aria-current": st.view === id ? "true" : null, "data-search": label, text: label });
    it.addEventListener("click", () => { st.view = id; st.q = ""; q.value = ""; applyView(); main.scrollIntoView?.({ block: "nearest" }); });
    menu.append(id === "all" ? h("div", { class: "ads-bmrow" }, it, allB) : it);
  }
  nav.append(menu);

  // ----- asset inputs (shared by the "+" buttons and the All assets menu)
  const assetIn = (brand, accept = "image/*") => fileInput(S, accept, async (fs) => { const r = await storeFiles(S, fs, { brand, kit: kitId }); if (r.length) { toast(`${r.length} added to ${brand}`); redraw(); } }, { "aria-label": `Add ${brand}`, "data-ads": `brand-${brand}-input` });
  const logoIn = fileInput(S, "image/*", async (fs) => {
    const add = []; for (const f of fs) { if (!/^image\//.test(f.type)) continue; try { add.push({ name: f.name.replace(/\.[a-z0-9]+$/i, ""), src: await shrink(await S.readUrl(f), 640) }); } catch {} }
    if (add.length) { save({ logos: [...(S.loadBrand().logos || []), ...add].slice(-12) }); toast(add.length > 1 ? `${add.length} logos added` : "Logo added to your brand kit"); redraw(); }
  }, { "aria-label": "Add a logo", "data-ads": "brand-logo-input" });
  const inputs = { logos: logoIn, photos: assetIn("photos"), components: assetIn("components"), graphics: assetIn("graphics"), icons: assetIn("icons", "image/svg+xml,image/png,image/webp") };
  root.append(h("div", { hidden: true }, Object.values(inputs)));
  const go = (view, then) => { st.view = view; applyView(); then?.(); };
  allB.addEventListener("click", () => S.popover(allB, (p) => {
    p.append(S.menuItem("Logo", () => inputs.logos.click(), { iconName: "logo" }), S.menuItem("Colour", () => go("colors", () => main.querySelector(".ads-swadd input")?.click()), { iconName: "palette" }), S.menuItem("Font style", () => { st.edit.fonts = true; st.view = "fonts"; redraw(); }, { iconName: "text" }));
    for (const [k, l, i] of [["photos", "Photo", "image"], ["components", "Component", "elements"], ["graphics", "Graphic", "elements"], ["icons", "Icon", "logo"]]) p.append(S.menuItem(l, () => inputs[k].click(), { iconName: i }));
    if (opts.projects?.save) p.append(S.menuItem("This design as a brand template", () => saveTemplate(), { iconName: "templates" }));
    p.append(S.menuItem("Brand voice", () => go("voice", () => main.querySelector('[data-kit-sec="voice"] textarea')?.focus()), { iconName: "speak" }));
  }, { label: "Add to your brand kit", name: "brand-add" }));

  // ----- right: All assets hero
  const hero = h("section", { class: "ads-bhero", "data-kit-sec": "all", "aria-label": "All assets", html: brandHero(kit) },
    h("p", { text: "Your logos, colours and fonts in one place, ready to use in every design. Everything here is free and stays on this device." }),
    typeof opts.applyBrand === "function" ? h("button", { type: "button", class: "ads-btn primary ads-block", "data-ads": "brand-apply", html: icon("brand") + '<span class="ads-l">Apply brand to the whole design</span>', onclick: async () => { try { const m = applyBrandMessage(await opts.applyBrand(S.loadBrand())); if (m) toast(m); } catch (e) { toast(e?.message || "Could not apply the brand."); } } }) : "",
    h("div", { class: "ads-row" }, h("button", { type: "button", class: "ads-btn sm", html: icon("plus") + '<span class="ads-l">Add a logo</span>', onclick: () => inputs.logos.click() }), h("button", { type: "button", class: "ads-btn sm", html: icon("palette") + '<span class="ads-l">Brand colours</span>', onclick: () => go("colors") })));
  main.append(hero);

  // Guidelines
  const gSec = sec(S, "guidelines", "Guidelines", linkBtn(S, st.edit.guidelines ? "Done" : "Edit", () => { st.edit.guidelines = !st.edit.guidelines; redraw(); }, { "data-ads": "brand-guidelines-edit" }));
  if (st.edit.guidelines) { const ta = h("textarea", { class: "ads-ta", rows: 4, "aria-label": "Brand guidelines", placeholder: "How should your brand look? Logo spacing, colours to use, words to avoid…" }); ta.value = kit.guidelines || ""; ta.addEventListener("input", () => save({ guidelines: ta.value })); gSec.append(ta); }
  else gSec.append(h("p", { class: kit.guidelines ? "ads-kguide" : "ads-muted", text: kit.guidelines || "Add the rules your designs should follow: logo spacing, colours to use, words to avoid." }));
  main.append(gSec);

  // Brand templates
  const saveTemplate = async () => {
    try { const r = (await opts.projects.save()) || {}; await S.saveProject({ ...r, id: undefined, app: r.app || S.app, name: `${r.name || S.title() || "Design"} (brand template)`, brandTemplate: true, kit: kitId, data: r.data ?? null, thumb: r.thumb || "" }); toast("Saved as a brand template"); redraw(); }
    catch (e) { toast(e?.message || "Could not save the brand template."); }
  };
  const tSec = sec(S, "templates", "Brand templates", opts.projects?.save ? plusBtn(S, "Save this design as a brand template", saveTemplate, { "data-ads": "brand-template-add" }) : "");
  const tList = h("div", { class: "ads-kgrid ads-kgrid2" }, h("p", { class: "ads-muted", text: "Loading…" })); tSec.append(tList); main.append(tSec);
  S.listProjects().then((all) => {
    const items = all.filter((p) => p.brandTemplate && (p.kit || "default") === kitId);
    tList.replaceChildren();
    if (!items.length) tList.append(h("p", { class: "ads-muted", text: opts.projects?.save ? "Save a finished design here and start new ones from it." : "Brand templates are saved from the editors that keep projects." }));
    for (const r of items) {
      const th = h("span", { class: "ads-tthumb" }); if (typeof r.thumb === "string" && r.thumb.startsWith("<svg")) th.innerHTML = r.thumb; else if (r.thumb) th.append(h("img", { src: r.thumb, alt: "" })); else th.innerHTML = icon("templates");
      const same = r.app === S.app && opts.projects?.open;
      const card = same ? h("button", { type: "button", class: "ads-tcard", "data-brand-template": r.id, "data-search": r.name, "aria-label": `Start a design from ${r.name}` }, th, h("span", { class: "ads-tname", text: r.name }))
        : h("a", { class: "ads-tcard", href: appHome(S, r.app), target: "_blank", rel: "noopener", "data-brand-template": r.id, "data-search": r.name }, th, h("span", { class: "ads-tname", text: r.name }));
      if (same) card.addEventListener("click", async () => { try { await opts.projects.open({ ...r, id: undefined, name: r.name.replace(/ \(brand template\)$/, "") }); S.setProjectId(null); toast("New design from the brand template"); } catch (e) { toast(e?.message || "Could not open it."); } });
      tList.append(h("div", { class: "ads-upitem" }, card, S.btn("ads-x", `Delete ${r.name}`, "trash", "", async () => { await S.deleteProject(r.id); redraw(); })));
    }
  }).catch(() => tList.replaceChildren(h("p", { class: "ads-muted", text: "Brand templates need browser storage, which is turned off here." })));

  // Logos
  const lSec = sec(S, "logos", "Logos", plusBtn(S, "Add a logo", () => inputs.logos.click(), { "data-ads": "brand-logo-add" }));
  const lGrid = h("div", { class: "ads-kgrid" });
  (kit.logos || []).forEach((l, i) => {
    const nm = l.name || "Logo";
    const lb = h("button", { type: "button", class: "ads-tcard", "aria-label": `Add logo ${nm}`, "data-logo": i, "data-search": nm }, h("span", { class: "ads-tthumb ads-contain" }, h("img", { src: l.src, alt: "" })), h("span", { class: "ads-tname", text: nm }));
    lb.addEventListener("click", async () => { if (!ins.image) return toast("This editor cannot add pictures."); try { await ins.image(l.src, nm); toast("Logo added"); } catch (e) { toast(e?.message || "The logo could not be added."); } });
    if (ins.image) S.dragPayload(lb, { kind: "image", src: l.src, name: nm });
    lGrid.append(h("div", { class: "ads-upitem" }, lb, S.btn("ads-x", `Remove logo ${nm}`, "trash", "", () => { const k = S.loadBrand(); save({ logos: (k.logos || []).filter((_, j) => j !== i) }); redraw(); })));
  });
  if (!(kit.logos || []).length) lGrid.append(h("button", { type: "button", class: "ads-kempty", text: "Add your logo", onclick: () => inputs.logos.click() }));
  lSec.append(lGrid); main.append(lSec);

  // Colours (palettes)
  const cSec = sec(S, "colors", "Colours", linkBtn(S, st.edit.colors ? "Done" : "Edit", () => { st.edit.colors = !st.edit.colors; redraw(); }, { "data-ads": "brand-colors-edit" }));
  const palettes = [{ name: "Brand colours", colors: kit.colors || [], main: true }, ...(kit.palettes || [])];
  palettes.forEach((pal, pi) => {
    const setColors = (colors) => { if (pal.main) save({ colors }); else { const ps = [...(S.loadBrand().palettes || [])]; ps[pi - 1] = { ...ps[pi - 1], colors }; save({ palettes: ps }); } redraw(); };
    const sw = h("div", { class: "ads-swatches" });
    pal.colors.forEach((c, ci) => {
      const s = h("button", { type: "button", class: "ads-swatch", style: `--c:${c}`, "aria-label": ins.color ? `Use colour ${c}` : `Copy colour ${c}`, title: c, "data-color": c, onclick: async () => { if (st.edit.colors) { setColors(pal.colors.filter((_, j) => j !== ci)); return; } if (ins.color) { ins.color(c); toast(`Colour ${c} applied`); } else toast((await S.copyText(c)) ? `Copied ${c}` : c); } });
      if (st.edit.colors) { s.classList.add("ads-swdel"); s.setAttribute("aria-label", `Remove colour ${c}`); s.innerHTML = icon("close"); }
      if (ins.color && !st.edit.colors) S.dragPayload(s, { kind: "color", value: c });
      sw.append(s);
    });
    const pickIn = h("input", { type: "color", value: "#5b4cf0", "aria-label": `Add a colour to ${pal.name}`, class: "ads-colorin" });
    pickIn.addEventListener("change", () => { if (!pal.colors.includes(pickIn.value)) { setColors([...pal.colors, pickIn.value].slice(-16)); toast("Colour added to your brand kit"); } });
    sw.append(h("label", { class: "ads-swatch ads-swadd", title: "Add a colour", html: icon("plus") }, pickIn));
    const head = h("div", { class: "ads-kpal" }, h("small", { text: pal.name }));
    if (!pal.main && st.edit.colors) head.append(linkBtn(S, "Delete palette", () => { save({ palettes: (S.loadBrand().palettes || []).filter((_, j) => j !== pi - 1) }); redraw(); }));
    cSec.append(head, sw);
  });
  cSec.append(linkBtn(S, "+ Add a new palette", () => { const ps = S.loadBrand().palettes || []; save({ palettes: [...ps, { name: `Palette ${ps.length + 2}`, colors: [] }] }); st.edit.colors = true; st.view = "colors"; redraw(); }, { "data-ads": "brand-palette-add" }));
  main.append(cSec);

  // Fonts (heading, subheading, body)
  const fSec = sec(S, "fonts", "Fonts", linkBtn(S, st.edit.fonts ? "Done" : "Edit", () => { st.edit.fonts = !st.edit.fonts; redraw(); }, { "data-ads": "brand-fonts-edit" }));
  const fonts = { heading: kit.fonts?.heading || "sans", subheading: kit.fonts?.subheading || kit.fonts?.heading || "sans", body: kit.fonts?.body || "sans" };
  const SIZE = { heading: 0.075, subheading: 0.045, body: 0.03 };
  for (const role of ["heading", "subheading", "body"]) {
    const fam = fonts[role], f = S.FONT_FAMILIES[fam] || S.FONT_FAMILIES.sans, label = { heading: "Heading", subheading: "Subheading", body: "Body text" }[role];
    const addText = () => insertWithFallback(kitCtx(S), "text", { content: `Your ${role === "body" ? "body text" : role}`, role, rel: SIZE[role], family: fam, bold: role !== "body" }, undefined, { panel: "brand", category: "fonts", item: role, name: label, svg: () => fontSvg(f.css, label, role) });
    const fb = h("button", { type: "button", class: `ads-fontbtn ads-f-${role}`, style: `font-family:${f.css}`, "data-font": fam, "data-role": role, "data-search": `${label} ${f.label}`, title: ins.font ? `Use ${f.label} for the selected text` : `Add a ${label.toLowerCase()} in ${f.label}`, onclick: async () => { if (ins.font) { ins.font(fam, f.css); toast(`${f.label} applied`); } else { const r = await addText(); if (!r.ok) toast(r.error); } } }, h("b", { text: label }), h("small", { text: f.label }));
    const row = h("div", { class: "ads-frow" }, fb, plusBtn(S, `Add a ${label.toLowerCase()} text box in ${f.label}`, async () => { const r = await addText(); if (!r.ok) toast(r.error); }, { "data-ads": `brand-font-add-${role}` }));
    if (st.edit.fonts) {
      const sel = h("select", { class: "ads-in ads-fsel", "aria-label": `${label} font` }); for (const [k, v] of Object.entries(S.FONT_FAMILIES)) sel.append(h("option", { value: k, text: v.label })); sel.value = fam;
      sel.addEventListener("change", () => { save({ fonts: { ...S.loadBrand().fonts, [role]: sel.value } }); redraw(); }); row.append(sel);
    }
    fSec.append(row);
  }
  main.append(fSec);

  // Brand voice
  const vSec = sec(S, "voice", "Brand voice");
  const TONES = ["Friendly", "Professional", "Playful", "Bold", "Caring", "Simple"];
  const tones = new Set(kit.tones || []);
  vSec.append(h("div", { class: "ads-chiprow ads-kwrap", role: "group", "aria-label": "Tone" }, TONES.map((t) => h("button", { type: "button", class: "ads-fchip" + (tones.has(t) ? " on" : ""), "aria-pressed": String(tones.has(t)), text: t, onclick: () => { tones.has(t) ? tones.delete(t) : tones.add(t); save({ tones: [...tones], voice: S.loadBrand().voice || "" }); redraw(); } }))));
  const vta = h("textarea", { class: "ads-ta", rows: 3, "aria-label": "Brand voice", placeholder: "How does your brand talk? For example: warm, short sentences, no slang." }); vta.value = kit.voice || "";
  vta.addEventListener("input", () => save({ voice: vta.value }));
  vSec.append(vta, h("p", { class: "ads-muted ads-note", text: "Write with AI follows this when it writes for you." }));
  main.append(vSec);

  // Photos, Components, Graphics, Icons (kept in this browser's uploads store, per brand kit)
  const secs = [["photos", "Photos"], ["components", "Components"], ["graphics", "Graphics"], ["icons", "Icons"]];
  const grids = {};
  for (const [k, title] of secs) { const s = sec(S, k, title, plusBtn(S, `Add ${title.toLowerCase()}`, () => inputs[k].click(), { "data-ads": `brand-${k}-add` })); grids[k] = h("div", { class: "ads-kgrid" + (k === "icons" ? " ads-kgrid4" : "") }); s.append(grids[k]); main.append(s); }
  allUploads(S).then((items) => {
    for (const [k, title] of secs) {
      const mine = items.filter((it) => it.brand === k && (it.kit || "default") === kitId);
      grids[k].replaceChildren(...mine.map((it) => uploadCard(S, it, { onMore: (a) => S.popover(a, (p) => p.append(S.menuItem("Remove from the brand kit", async () => { await S.upTx("readwrite", (s) => s.delete(it.id)); redraw(); }, { iconName: "trash" })), { label: "Options", name: "brand-asset" }) })));
      if (!mine.length) grids[k].append(h("button", { type: "button", class: "ads-kempty", text: `Add brand ${title.toLowerCase()}`, onclick: () => inputs[k].click() }));
    }
    applyView();
  });

  // The editor's own brand tools (if the shell passes them) and Manage Brand Kit
  // (Brand: the editor's own brand panel is not repeated here; its one extra, Apply brand, is the opts.applyBrand button)
  const manage = h("section", { class: "ads-ksec ads-bmanage", "data-kit-sec": "manage", "aria-label": "Manage Brand Kit" }, h("h3", { class: "ads-h3", text: "Manage Brand Kit" }));
  const renB = h("button", { type: "button", class: "ads-btn", "data-ads": "brand-rename", html: icon("pencil") + '<span class="ads-l">Rename</span>' }); renB.addEventListener("click", () => renameKit(manage));
  const delB = h("button", { type: "button", class: "ads-btn", "data-ads": "brand-delete", html: icon("trash") + '<span class="ads-l">Delete</span>' });
  delB.addEventListener("click", () => { if (delB.dataset.sure !== "1") { delB.dataset.sure = "1"; delB.querySelector(".ads-l").textContent = "Click again to delete"; setTimeout(() => { delB.dataset.sure = ""; if (delB.isConnected) delB.querySelector(".ads-l").textContent = "Delete"; }, 3000); return; } deleteKit(); });
  manage.append(h("div", { class: "ads-row2" }, renB, delB), h("button", { type: "button", class: "ads-klink", text: "+ Create another brand kit", onclick: createKit }), h("a", { class: "ads-klink", href: "/product/brand", target: "_blank", rel: "noopener", text: "Open the brand kit page" }));
  main.append(manage);

  function applyView() {
    const words = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const it of menu.querySelectorAll(".ads-bmi")) { const on = it.dataset.view === st.view; it.classList.toggle("on", on); if (on) it.setAttribute("aria-current", "true"); else it.removeAttribute("aria-current"); }
    for (const s of main.querySelectorAll(":scope > [data-kit-sec]")) {
      const id = s.dataset.kitSec;
      let show = st.view === "all" ? true : id === st.view;
      if (words.length) { const items = [...s.querySelectorAll("[data-search]")]; for (const el of items) el.classList.toggle("ads-nomatch", !matches(words, el.dataset.search)); show = id !== "all" && id !== "manage" && (matches(words, s.getAttribute("aria-label")) || items.some((el) => !el.classList.contains("ads-nomatch"))); }
      else for (const el of s.querySelectorAll("[data-search].ads-nomatch")) el.classList.remove("ads-nomatch");
      s.hidden = !show;
    }
  }
  q.addEventListener("input", () => { st.q = q.value; if (q.value.trim()) st.view = "all"; applyView(); });
  applyView();
}
function fontSvg(css, label, role) {
  const s = role === "heading" ? 64 : role === "subheading" ? 40 : 28, w = Math.round(s * label.length * 0.62) + 20, hh = Math.round(s * 1.4);
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}"><text x="10" y="${Math.round(s * 1.05)}" font-family="${esc(css)}" font-size="${s}" font-weight="${role === "body" ? 400 : 700}" fill="#1b2133">${esc(`Your ${role === "body" ? "body text" : role}`)}</text></svg>`;
}

// =====================================================================================================================
// Uploads
// Canva's order: search, "Upload files" + "…" (upload a folder, record yourself, add from a link), "Record yourself",
// tabs Images / Videos / Audio, the files (or our own empty-state picture), drag files onto the panel. Folders live in
// Projects (each file's "…" can still move it into one).
const UPLOAD_ART = '<svg viewBox="0 0 220 130" aria-hidden="true"><defs><linearGradient id="adsua" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f80ff"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><rect x="30" y="34" width="70" height="56" rx="8" fill="#ffe2d6" transform="rotate(-8 65 62)"/><rect x="120" y="30" width="70" height="56" rx="8" fill="#e6e2ff" transform="rotate(7 155 58)"/><path d="M66 106h88a22 22 0 0 0 3-44 30 30 0 0 0-57-8 24 24 0 0 0-34 52z" fill="url(#adsua)"/><path d="M110 92V66m-11 11 11-11 11 11" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="54" r="7" fill="#ff7a59"/><path d="M134 72l10-12 12 14" fill="none" stroke="#5b4cf0" stroke-width="3" stroke-linejoin="round"/></svg>';
export function renderUploads(b, S) {
  const { h, icon, toast } = S;
  const st = (b._up ||= { tab: ["images", "videos", "audio"].includes(S.LS.get("ads-uploads-tab", "images")) ? S.LS.get("ads-uploads-tab", "images") : "images", words: [] });
  const root = h("div", { class: "ads-kuploads" });
  b.append(root);
  const draw = () => drawList();
  const add = async (files, extra = {}) => {
    const r = await storeFiles(S, files, extra);
    if (r.length) { toast(`${r.length} file${r.length > 1 ? "s" : ""} uploaded`); const k = kindOf(r[r.length - 1]); st.tab = k === "image" ? "images" : k === "video" ? "videos" : "audio"; drawTabs(); }
    draw();
  };
  const { row: sRow } = searchRow(S, "Search your uploads", (words) => { st.words = words; draw(); });
  root.append(sRow);

  // Upload files + more options, Record yourself
  const inp = fileInput(S, "image/*,video/*,audio/*", (fs) => add(fs), { "aria-label": "Choose files to upload", "data-ads": "upload-input" });
  const dirIn = fileInput(S, "", (fs) => { const name = (fs[0]?.webkitRelativePath || "").split("/")[0] || "Uploaded folder"; const f = newFolder(S, name); add(fs, { folder: f.id }); toast(`Folder "${f.name}" is in Projects › Folders`); }, { webkitdirectory: true, "aria-label": "Choose a folder to upload" });
  const upB = h("label", { class: "ads-btn primary ads-upbtn", html: icon("uploads") + '<span class="ads-l">Upload files</span>' }, inp);
  const moreB = h("button", { type: "button", class: "ads-btn ads-upmorebtn", "aria-label": "More upload options", title: "More upload options", "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "upload-more", html: icon("more") });
  const rec = h("div", { class: "ads-kpane", hidden: true, "data-kit-sec": "record" }), link = h("div", { class: "ads-kpane", hidden: true, "data-kit-sec": "link" });
  const record = () => { link.hidden = true; openRecorder(S, rec, (file) => add([file])); };
  moreB.addEventListener("click", () => S.popover(moreB, (p) => {
    p.append(S.menuItem("Upload files", () => inp.click(), { iconName: "uploads", hint: "Pictures, videos and sounds" }));
    p.append(S.menuItem("Upload a folder", () => dirIn.click(), { iconName: "projects", hint: "Its files go into a new folder" }));
    p.append(S.menuItem("Record yourself", record, { iconName: "record", hint: "Camera and microphone" }));
    p.append(S.menuItem("Add from a link", () => { rec.hidden = true; openLink(S, link, (file) => add([file])); }, { iconName: "link", hint: "A picture, video or sound on the web" }));
  }, { label: "More upload options", name: "upload-more" }));
  root.append(h("div", { class: "ads-uptop", "data-kit-sec": "upload" }, upB, moreB, h("span", { hidden: true }, dirIn)));
  root.append(h("button", { type: "button", class: "ads-btn ads-block ads-recbtn", "data-ads": "record-yourself", html: icon("record") + '<span class="ads-l">Record yourself</span>', onclick: record }), rec, link);

  // tabs + list
  const tabsHost = h("div");
  const drawTabs = () => tabsHost.replaceChildren(tabsRow(S, [["images", "Images"], ["videos", "Videos"], ["audio", "Audio"]], st.tab, (id) => { st.tab = id; S.LS.set("ads-uploads-tab", id); drawTabs(); draw(); }, "Uploads"));
  drawTabs(); root.append(tabsHost);
  const list = h("div", { class: "ads-kulist" }); root.append(list);
  { const os = ownSection(S); if (os) root.append(os); }

  // drop files onto the panel
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  b.addEventListener("dragover", (e) => { if (!hasFiles(e)) return; e.preventDefault(); b.classList.add("ads-upon"); });
  b.addEventListener("dragleave", (e) => { if (!b.contains(e.relatedTarget)) b.classList.remove("ads-upon"); });
  b.addEventListener("drop", (e) => { if (!hasFiles(e)) return; e.preventDefault(); b.classList.remove("ads-upon"); add([...(e.dataTransfer?.files || [])]); });

  async function drawList() {
    const all = userUploads(await allUploads(S));
    const items = all.filter((it) => matches(st.words, it.name));
    const k = st.tab === "videos" ? "video" : st.tab === "audio" ? "audio" : "image";
    const mine = items.filter((it) => kindOf(it) === k);
    const more = (a, it) => uploadMenu(S, a, it, draw);
    const s = h("section", { class: "ads-ksec", "data-kit-sec": st.tab, "aria-label": st.tab });
    const g = h("div", { class: k === "audio" ? "ads-kalist" : "ads-kgrid" }, mine.map((it) => uploadCard(S, it, { onMore: more })));
    if (k === "audio") for (const card of g.querySelectorAll(".ads-upitem")) { const it = mine.find((x) => x.id === card.querySelector("[data-upload]").dataset.upload); const pl = h("button", { type: "button", class: "ads-uplay", "aria-label": `Play ${it.name}`, html: icon("play") }); let a = null; pl.addEventListener("click", (e) => { e.stopPropagation(); if (a && !a.paused) { a.pause(); pl.innerHTML = icon("play"); return; } a ||= new Audio(blobUrl(it)); a.play().catch(() => {}); pl.innerHTML = icon("pause"); a.onended = () => { pl.innerHTML = icon("play"); }; }); card.prepend(pl); }
    s.append(g);
    if (!mine.length) {
      if (st.words.length) g.append(h("p", { class: "ads-muted", text: "Nothing matches. Try another word." }));
      else s.replaceChildren(h("div", { class: "ads-uempty", "data-ads": "uploads-empty", html: UPLOAD_ART }, h("b", { text: "Upload, store and organise" }), h("p", { text: { image: "Upload pictures from your device, or drag them here. They stay on this device, free.", video: "Upload a video, or use Record yourself. Videos stay on this device.", audio: "Upload music or a voice recording. Sounds stay on this device." }[k] })));
    }
    list.replaceChildren(s);
  }
  draw();
}
function openRecorder(S, box, onSave) {
  const { h, toast } = S;
  box.hidden = false; box.replaceChildren();
  const video = h("video", { class: "ads-recv", playsinline: true, muted: true, autoplay: true });
  const status = h("p", { class: "ads-muted", role: "status", "aria-live": "polite", text: "Asking for your camera and microphone…" });
  const recB = h("button", { type: "button", class: "ads-btn sm primary", text: "Start recording", disabled: true, "data-ads": "rec-start" });
  const saveB = h("button", { type: "button", class: "ads-btn sm primary", text: "Save to uploads", hidden: true });
  const closeB = h("button", { type: "button", class: "ads-btn sm", text: "Close" });
  box.append(h("b", { text: "Record yourself" }), video, status, h("div", { class: "ads-row" }, recB, saveB, closeB));
  let stream = null, mr = null, chunks = [], blob = null, t0 = 0, iv = 0;
  const stop = () => { clearInterval(iv); try { mr?.state === "recording" && mr.stop(); } catch {} for (const tr of stream?.getTracks?.() || []) tr.stop(); };
  closeB.addEventListener("click", () => { stop(); box.hidden = true; box.replaceChildren(); });
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia || typeof MediaRecorder !== "function") { status.textContent = "This browser cannot record here. Use the Video recorder app instead (Apps)."; return; }
  md.getUserMedia({ video: { width: 1280, height: 720 }, audio: true }).then((s) => { stream = s; video.srcObject = s; recB.disabled = false; status.textContent = "Ready. Recording stays on this device."; })
    .catch((e) => { status.textContent = `The camera did not open (${e?.name === "NotAllowedError" ? "permission refused" : e?.message || "not available"}). Nothing was recorded.`; });
  recB.addEventListener("click", () => {
    if (mr?.state === "recording") { mr.stop(); return; }
    chunks = []; blob = null; saveB.hidden = true;
    const type = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
    try { mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined); } catch (e) { status.textContent = "Recording did not start: " + (e?.message || "unknown"); return; }
    mr.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    mr.onstop = () => { clearInterval(iv); blob = new Blob(chunks, { type: mr.mimeType || "video/webm" }); recB.textContent = "Record again"; saveB.hidden = false; status.textContent = `Recorded ${Math.round((Date.now() - t0) / 1000)} s. Save it to your uploads, or record again.`; video.srcObject = null; video.muted = false; video.controls = true; video.src = URL.createObjectURL(blob); };
    mr.start(250); t0 = Date.now(); recB.textContent = "Stop"; video.controls = false; video.muted = true; video.srcObject = stream;
    iv = setInterval(() => { status.textContent = `Recording… ${Math.round((Date.now() - t0) / 1000)} s`; }, 500);
  });
  saveB.addEventListener("click", () => { if (!blob) return; const ext = /mp4/.test(blob.type) ? "mp4" : "webm"; const name = `Recording ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.${ext}`.replace(/[/:]/g, "-"); let file = blob; try { file = new File([blob], name, { type: blob.type }); } catch { file.name = name; } onSave(file); stop(); box.hidden = true; box.replaceChildren(); toast("Recording saved to your uploads"); });
}
function openLink(S, box, onSave) {
  const { h } = S;
  box.hidden = false; box.replaceChildren();
  const inp = h("input", { type: "url", class: "ads-in", placeholder: "https://… link to a picture, video or sound", "aria-label": "Link to a file", "data-ads": "upload-link" });
  const status = h("p", { class: "ads-muted", role: "status" });
  const go = h("button", { type: "button", class: "ads-btn sm primary", text: "Add" });
  box.append(h("b", { text: "Add from a link" }), inp, h("div", { class: "ads-row" }, go, h("button", { type: "button", class: "ads-btn sm", text: "Close", onclick: () => { box.hidden = true; box.replaceChildren(); } })), status);
  go.addEventListener("click", async () => {
    const u = inp.value.trim(); if (!/^https?:\/\//i.test(u)) { status.textContent = "Paste a link that starts with https://"; return; }
    go.disabled = true; status.textContent = "Getting the file…";
    try {
      const r = await fetch(u, { mode: "cors" }); if (!r.ok) throw new Error(`the site answered ${r.status}`);
      const blob = await r.blob(); const name = decodeURIComponent(new URL(u).pathname.split("/").pop() || "linked file").slice(0, 80) || "linked file";
      let file = blob; try { file = new File([blob], name, { type: blob.type }); } catch {}
      onSave(file); box.hidden = true; box.replaceChildren();
    } catch (e) { status.textContent = `That site does not let other pages download its files (${e?.message || "blocked"}). Save the file to your device and upload it.`; }
    finally { go.disabled = false; }
  });
  inp.focus();
}

// =====================================================================================================================
// Projects
// Canva's order: "Search your content", "Your projects ▾", tabs All / Designs / Folders / Images; All = recent designs
// (cards), Folders (Create folder, Starred, yours), Images (a row, See all), Videos. Other apps' designs open in their
// app in a new tab. Everything is on this device.
const STARRED = "asaandesk-starred";
const APP_OPEN = { studio: "/design/studio/?project=", video: "/design/video/?project=", website: "/design/website/?project=", photo: "/design/photo/?project=" };
const APP_HOME = { studio: "/design/studio/", sheets: "/design/sheets/", docs: "/design/docs/", whiteboard: "/design/whiteboard/", photo: "/design/photo/", video: "/design/video/", website: "/design/website/", draw: "/design/draw/", recorder: "/design/recorder/", voice: "/design/voice/", layers: "/design/layers/", code: "/design/code/", "ai-image": "/design/ai-image/", "ai-media": "/design/ai-media/" };
const APP_NAME = { studio: "Design", sheets: "Sheet", docs: "Doc", whiteboard: "Whiteboard", photo: "Photo", video: "Video", website: "Website", draw: "Drawing", recorder: "Recording", voice: "Voiceover", layers: "Magic Layers", code: "Code", "ai-image": "AI image", "ai-media": "AI media" };
function appHome(S, a) { return APP_HOME[a] || "/design/"; }
const starred = (S) => new Set(S.LS.get(STARRED, []));
const toggleStar = (S, id) => { const s = starred(S); s.has(id) ? s.delete(id) : s.add(id); S.LS.set(STARRED, [...s]); return s.has(id); };
export function renderProjects(b, S) {
  const { h, icon, toast, opts } = S;
  const st = (b._pj ||= { tab: "all", folder: null, words: [], scope: "all" });
  const root = h("div", { class: "ads-kprojects" });
  b.append(root);
  const { row, q } = searchRow(S, "Search your content", (words) => { st.words = words; drawBody(); });
  if (st.words.length) q.value = st.words.join(" ");
  root.append(row);
  const scopeLabel = { all: "Your projects", starred: "Starred", here: `${S.kind} designs` };
  const pick = h("button", { type: "button", class: "ads-kitpick ads-ppick", "aria-haspopup": "menu", "aria-expanded": "false", "data-ads": "projects-pick" }, h("span", { class: "ads-kitdot ads-pdot", text: "Y" }), h("b", { text: scopeLabel[st.scope] }), h("span", { html: icon("chev", "ads-chev") }));
  pick.addEventListener("click", () => S.popover(pick, (p) => {
    for (const [k, l] of Object.entries(scopeLabel)) p.append(S.menuItem(l, () => { st.scope = k; pick.querySelector("b").textContent = l; drawBody(); }, { role: "menuitemradio", checked: st.scope === k }));
    p.append(h("hr", { class: "ads-hr" }), S.menuItem("Shared with you", () => toast("Nothing is shared: AsaanDesk keeps your work on this device."), { iconName: "invite", hint: "Your work stays on this device" }));
  }, { label: "Projects", name: "projects-pick" }));
  const pickRow = h("div", { class: "ads-ppickrow", "data-kit-sec": "save" }, pick);
  if (opts.projects?.save) pickRow.append(S.mk("ads-btn sm primary", "Save to projects", "projects", "Save", () => S.saveToProjects().catch((e) => toast(e?.message || "Could not save.")), { "data-ads": "save-project", title: "Save this design to Projects" }));
  root.append(pickRow);
  const tabsHost = h("div"); root.append(tabsHost);
  const body = h("div", { class: "ads-kpbody" }); root.append(body);
  const drawTabs = () => tabsHost.replaceChildren(tabsRow(S, [["all", "All"], ["designs", "Designs"], ["folders", "Folders"], ["images", "Images"]], st.tab, (id) => { st.tab = id; st.folder = null; drawTabs(); drawBody(); }, "Projects"));
  drawTabs();
  { const os = ownSection(S); if (os) root.append(os); }
  let data = null;
  const load = async () => { const [projects, ups] = await Promise.all([S.listProjects().catch(() => null), allUploads(S)]); return { projects, ups: userUploads(ups) }; };
  const thumbOf = (r) => { const th = h("span", { class: "ads-pthumb" }); if (typeof r.thumb === "string" && r.thumb.startsWith("<svg")) th.innerHTML = r.thumb; else if (typeof r.thumb === "string" && r.thumb) th.append(h("img", { src: r.thumb, alt: "" })); else th.innerHTML = icon("projects"); return th; };
  const designCard = (r) => {
    const here = r.app === S.app, star = starred(S).has(r.id);
    const label = h("span", { class: "ads-pctext" }, h("b", { text: r.name || "Untitled" }), h("small", { text: `${here ? S.kind : APP_NAME[r.app] || "Design"} · ${S.when(r.updated)}` }));
    let open;
    if (here && opts.projects?.open) {
      open = h("button", { type: "button", class: "ads-prow ads-pcard" + (r.id === S.getProjectId() ? " on" : ""), "aria-label": `Open ${r.name || "project"}`, "data-project": r.id }, thumbOf(r), label);
      open.addEventListener("click", async () => { try { await opts.projects.open(r); S.setProjectId(r.id); toast(`Opened ${r.name || "project"}`); if (S.isMobile()) S.closePanel(); } catch (e) { toast(e?.message || "Could not open it."); } });
    } else open = h("a", { class: "ads-prow ads-pcard", href: APP_OPEN[r.app] ? APP_OPEN[r.app] + encodeURIComponent(r.id) : appHome(S, r.app), target: "_blank", rel: "noopener", "data-project-other": r.id, title: APP_OPEN[r.app] ? "Opens in a new tab" : "Opens the app in a new tab: pick it in Projects there" }, thumbOf(r), label);
    if (star) open.append(h("span", { class: "ads-pstar", "aria-label": "Starred", html: "★" }));
    const more = h("button", { type: "button", class: "ads-upmore", "aria-label": `More options for ${r.name || "project"}`, "aria-haspopup": "menu", "aria-expanded": "false", html: icon("more") });
    more.addEventListener("click", () => S.popover(more, (p) => {
      p.append(S.menuItem(star ? "Remove star" : "Star", () => { toast(toggleStar(S, r.id) ? "Starred" : "Star removed"); drawBody(); }, { iconName: "logo" }));
      p.append(S.menuHead("Move to folder"));
      for (const f of folders(S)) p.append(S.menuItem(f.name, () => { setFolders(S, folders(S).map((x) => ({ ...x, projects: (x.projects || []).filter((id) => id !== r.id).concat(x.id === f.id ? [r.id] : []) }))); toast(`Moved to ${f.name}`); drawBody(); }, { iconName: "projects", checked: (f.projects || []).includes(r.id) }));
      p.append(S.menuItem("New folder", () => { const f = newFolder(S); setFolders(S, folders(S).map((x) => (x.id === f.id ? { ...x, projects: [r.id] } : x))); toast(`Moved to ${f.name}`); drawBody(); }, { iconName: "plus" }));
      p.append(h("hr", { class: "ads-hr" }));
      p.append(S.menuItem("Delete", async () => { await S.deleteProject(r.id); if (S.getProjectId() === r.id) S.setProjectId(null); toast(`Deleted ${r.name || "project"}`); data = null; drawBody(); }, { iconName: "trash" }));
    }, { label: "Project options", name: "project-more" }));
    return h("div", { class: "ads-pitem ads-pcitem" }, open, more);
  };
  const upMenu = (a, it) => S.popover(a, (p) => {
    const star = starred(S).has(it.id);
    p.append(S.menuItem(star ? "Remove star" : "Star", () => { toast(toggleStar(S, it.id) ? "Starred" : "Star removed"); drawBody(); }, { iconName: "logo" }));
    p.append(S.menuItem("More options…", () => uploadMenu(S, a, it, () => { data = null; drawBody(); }), { iconName: "more" }));
  }, { label: `Options for ${it.name}`, name: "project-up" });
  const mediaGrid = (items, k) => h("div", { class: "ads-kgrid" }, items.map((it) => uploadCard(S, it, { onMore: upMenu })), !items.length ? h("p", { class: "ads-muted", text: k === "video" ? "No videos yet. Add them in Uploads." : "No pictures yet. Add them in Uploads." }) : "");
  const folderTile = (id, name, n, art, onclick) => h("button", { type: "button", class: "ads-folder", "data-folder": id, html: `<span class="ads-fic${id === "__starred" ? " ads-fstar" : id === "__new" ? " ads-fnew" : ""}">${art}</span>`, onclick }, h("span", {}, h("b", { text: name }), n == null ? "" : h("small", { text: `${n} item${n === 1 ? "" : "s"}` })));
  async function drawBody() {
    body.replaceChildren(h("p", { class: "ads-muted", text: "Loading…" }));
    data ||= await load();
    if (!data.projects) { body.replaceChildren(h("p", { class: "ads-muted", text: "Projects need browser storage, which is turned off here." })); return; }
    const W = st.words, stars = starred(S);
    const inScope = (id, app) => st.scope === "all" || (st.scope === "starred" ? stars.has(id) : app === S.app);
    const designs = data.projects.filter((r) => !r.brandTemplate && inScope(r.id, r.app) && matches(W, `${r.name} ${APP_NAME[r.app] || ""}`));
    const here = designs.filter((r) => r.app === S.app), elsewhere = designs.filter((r) => r.app !== S.app);
    const ups = data.ups.filter((it) => inScope(it.id, S.app) && matches(W, it.name)), imgs = ups.filter((it) => kindOf(it) === "image"), vids = ups.filter((it) => kindOf(it) === "video");
    const fs = folders(S).filter((f) => matches(W, f.name));
    body.replaceChildren();
    const newFolderTile = () => folderTile("__new", "Create folder", null, icon("plus"), () => { const f = newFolder(S); toast(`${f.name} created`); drawBody(); });
    const folderList = () => h("div", { class: "ads-flist" }, newFolderTile(),
      folderTile("__starred", "Starred", data.projects.filter((r) => stars.has(r.id)).length + data.ups.filter((it) => stars.has(it.id)).length, "★", () => { st.tab = "folders"; st.folder = "__starred"; drawTabs(); drawBody(); }),
      fs.map((f) => folderTile(f.id, f.name, (f.projects || []).length + data.ups.filter((it) => it.folder === f.id).length, icon("projects"), () => { st.tab = "folders"; st.folder = f.id; drawTabs(); drawBody(); })));
    const cards = (list) => h("div", { class: "ads-pgrid" }, list.map(designCard));
    if (st.tab === "all") {
      const rec = sec(S, "recent", "Recent designs"); rec.append(cards([...here, ...elsewhere].slice(0, 8)));
      if (!designs.length) rec.append(h("p", { class: "ads-muted", text: W.length ? "Nothing matches. Try another word." : "No saved designs yet. They stay on this device." }));
      body.append(rec);
      const fsec = sec(S, "folders", "Folders"); fsec.append(folderList()); body.append(fsec);
      const isec = sec(S, "images", "Images", linkBtn(S, "See all", () => { st.tab = "images"; drawTabs(); drawBody(); })); isec.append(mediaGrid(imgs.slice(0, 4), "image")); body.append(isec);
      if (vids.length) { const s = sec(S, "videos", "Videos"); s.append(mediaGrid(vids.slice(0, 4), "video")); body.append(s); }
    } else if (st.tab === "designs") {
      const s1 = sec(S, "designs", `${S.kind} designs`); s1.append(cards(here), !here.length ? h("p", { class: "ads-muted", text: "None yet." }) : ""); body.append(s1);
      const s2 = sec(S, "other-designs", "In other apps"); s2.append(cards(elsewhere), !elsewhere.length ? h("p", { class: "ads-muted", text: "None yet." }) : ""); body.append(s2);
    } else if (st.tab === "folders") {
      if (st.folder) {
        const isStar = st.folder === "__starred", f = isStar ? { id: "__starred", name: "Starred" } : folders(S).find((x) => x.id === st.folder);
        if (!f) { st.folder = null; return drawBody(); }
        const back = h("button", { type: "button", class: "ads-kback", "data-kit": "back", html: icon("left") + "<b></b>" }); back.querySelector("b").textContent = f.name; back.addEventListener("click", () => { st.folder = null; drawBody(); });
        const head = h("div", { class: "ads-khead" }, back);
        if (!isStar) {
          const fm = h("button", { type: "button", class: "ads-upmore ads-fmore", "aria-label": `Folder options for ${f.name}`, "aria-haspopup": "menu", "aria-expanded": "false", html: icon("more") });
          fm.addEventListener("click", () => S.popover(fm, (p) => {
            p.append(S.menuItem("Rename folder", () => renameInline(S, head, f.name, (name) => { setFolders(S, folders(S).map((x) => (x.id === f.id ? { ...x, name } : x))); drawBody(); }), { iconName: "pencil" }));
            p.append(S.menuItem("Delete folder (its files stay)", async () => { for (const it of data.ups.filter((x) => x.folder === f.id)) { const { folder, ...rest } = it; await S.upTx("readwrite", (s) => s.put(rest)); } setFolders(S, folders(S).filter((x) => x.id !== f.id)); st.folder = null; data = null; drawBody(); }, { iconName: "trash" }));
          }, { label: "Folder options", name: "folder-more" }));
          head.append(fm);
        }
        const s = h("section", { class: "ads-ksec", "data-kit-sec": "folder" }, head);
        const ds = data.projects.filter((r) => (isStar ? stars.has(r.id) : (f.projects || []).includes(r.id))), ms = data.ups.filter((it) => (isStar ? stars.has(it.id) : it.folder === f.id));
        s.append(cards(ds), ms.length ? mediaGrid(ms, "image") : "");
        if (!ds.length && !ms.length) s.append(h("p", { class: "ads-muted", text: isStar ? "Nothing starred yet. Use “…” on a design or a picture and choose Star." : "This folder is empty. Use “…” on a design or an upload to move it here." }));
        body.append(s);
      } else { const s = sec(S, "folders", "Folders"); s.append(folderList()); body.append(s); }
    } else { const s = sec(S, "images", "Images"); s.append(mediaGrid(imgs, "image")); body.append(s); }
  }
  drawBody();
}

// =====================================================================================================================
// Apps
// Canva's order: Search apps, tabs Discover / Your apps; Discover = Tools for this design (the editor's own tools),
// Featured, Top picks, AI tools (real ones open, AI-only ones honest "coming soon"), QR code, Discover (categories).
const EXTRA_APPS = [
  ["background-remover", "Background remover", "Cut out photos on your device", "/design/photo/?mode=bg", "image", "photo ai"],
  ["magic-layers", "Magic Layers", "Split a picture into layers", "/design/layers/", "pages", "ai photo"],
  ["image-enhancer", "Image enhancer", "Sharper, larger pictures", "/design/photo/?mode=enhance", "image", "photo"],
  ["collage", "Photo collages", "Several photos in one layout", "/design/studio/?mode=collage", "grid", "photo design"],
  ["mockups", "Mockups", "See a design on shirts and mugs", "/design/studio/?mode=mockup", "device", "design"],
  ["business-cards", "Business cards", "Print-ready cards", "/design/studio/?preset=business-card-us", "print", "design business"],
  ["invitations", "Invitations", "Weddings, birthdays and Eid", "/design/studio/?preset=invitation-5x7", "mail", "design"],
  ["magic-write", "Magic Write", "Write and rewrite text", "/design/docs/?mode=write", "pencil", "ai business"],
  ["translate", "Translate a design", "Same layout, another language", "/design/studio/?mode=translate", "translate", "ai business"],
  ["magic-resize", "Magic Resize", "One design in many sizes", "/design/studio/?mode=resize", "resize", "design ai"],
  ["insights", "Magic Insights", "Totals and trends from a sheet", "/design/sheets/?mode=insights", "insights", "business ai"],
  ["code", "Code generator", "Small web widgets", "/design/code/", "web", "ai design"],
];
const APP_CAT = { sheets: "business", docs: "business", whiteboard: "business", presentations: "business design", social: "design", print: "design", photo: "photo", video: "video", website: "design business", draw: "photo design", logos: "design", recorder: "video", voice: "video ai" };
const CATS = [["all", "All"], ["design", "Design"], ["photo", "Photo"], ["video", "Video and audio"], ["business", "Business"], ["ai", "AI"]];
export function renderApps(b, S) {
  const { h, icon, opts } = S;
  const st = (b._ap ||= { tab: "discover", cat: "all", words: [] });
  const root = h("div", { class: "ads-kapps" });
  b.append(root);
  const all = [...S.APPS.map(([id, name, sub, href, ic]) => [id, name, sub, href, ic, APP_CAT[id] || "design"]), ...EXTRA_APPS].filter(([id]) => id !== S.app);
  const remember = (id) => S.LS.set(YOUR_APPS, [id, ...S.LS.get(YOUR_APPS, []).filter((x) => x !== id)].slice(0, 12));
  const appLink = (a) => { const [id, name, sub, href, ic, cat] = a; const el = h("a", { class: "ads-app", href, target: "_blank", rel: "noopener", "data-app": id, "data-cat": cat, "data-search": `${name} ${sub}`, html: `<span class="ads-appic">${icon(ic)}</span>` }, h("span", {}, h("b", { text: name }), h("small", { text: sub }))); el.addEventListener("click", () => remember(id)); return el; };
  const { row } = searchRow(S, "Search apps", (words) => { st.words = words; apply(); }, { "data-ads": "panel-search" });
  root.append(row);
  const tabsHost = h("div"); root.append(tabsHost);
  const drawTabs = () => tabsHost.replaceChildren(tabsRow(S, [["discover", "Discover"], ["yours", "Your apps"]], st.tab, (id) => { st.tab = id; drawTabs(); show(); }, "Apps"));
  drawTabs();
  const disc = h("div", { class: "ads-kdisc" });

  // Tools for this design (the editor's own tools hub: resize, mockups, QR, layouts…)
  const searchable = []; // [el, text] of the sections that hide while searching
  if (typeof S.ownTools === "function") {
    const ts = sec(S, "own-tools", "Tools for this design"); const host = h("div", { class: "ads-kowntools" }); ts.append(host);
    try { S.ownTools(host); } catch (e) { console.error(e); }
    if (host.childNodes.length) { disc.append(ts); searchable.push([ts, ts.textContent]); }
  }
  // Translate: the shell's panel (off the rail now)
  const feat = h("section", { class: "ads-kfeat", "data-kit-sec": "featured", "aria-label": "Featured" },
    h("span", { class: "ads-kfchip", text: "Featured" }), h("b", { text: "Split any picture into layers" }), h("p", { text: "Magic Layers turns a flat picture or PDF page into text, subject and background you can edit." }),
    h("a", { class: "ads-btn primary sm", href: "/design/layers/", target: "_blank", rel: "noopener", text: "Try Magic Layers", onclick: () => remember("magic-layers") }));
  disc.append(feat);
  const PICKS = [["background-remover", "Remove a background", "On your device, in one click", "/design/photo/?mode=bg", "#14b8a6"], ["voice", "Make a voiceover", "Text to speech with browser voices", "/design/voice/", "#5b4cf0"], ["translate", "Translate a design", "The layout stays the same", "/design/studio/?mode=translate", "#ff7a59"], ["recorder", "Record your screen", "Screen and camera together", "/design/recorder/", "#2f80ff"]];
  const picks = sec(S, "top-picks", "Top picks for you");
  picks.append(h("div", { class: "ads-kpicks" }, PICKS.filter(([id]) => id !== S.app).map(([id, t, sub, href, c]) => h("a", { class: "ads-kpick", href, target: "_blank", rel: "noopener", style: `--c:${c}`, "data-search": `${t} ${sub}`, onclick: () => remember(id) }, h("b", { text: t }), h("small", { text: sub })))));
  disc.append(picks);

  // Quick tools that work in this design: Translate (the shell's panel), QR code (our encoder), Write with AI
  const quick = sec(S, "quick-tools", "Use in this design");
  const qList = h("div", { class: "ads-qtools" });
  const qt = (id, label, sub, ic, act, extra = {}) => h("button", { type: "button", class: "ads-app2 ads-qtool", "data-app-tool": id, "data-search": `${label} ${sub}`, html: `<span class="ads-appic">${ic}</span>`, onclick: act, ...extra }, h("span", {}, h("b", { text: label }), h("small", { text: sub })));
  if (opts.getText || opts.setText) qList.append(qt("translate", "Translate", "On this device, nothing is sent", icon("translate"), () => S.openPanel("translate")));
  const qrHost = h("div", { class: "ads-qrhost" });
  const qrB = qt("qr", "QR code", "A link people can scan", '<svg class="ads-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/></svg>', async () => {
    if (!qrHost.firstChild) { const T = await import("./tools.js"); qrHost.append(T.qrBox({ opts: S.opts, toast: S.toast, shell: S.shell }, "apps")); }
    const f = qrHost.firstChild; f.hidden = !f.hidden; qrB.setAttribute("aria-expanded", String(!f.hidden)); if (!f.hidden) f.querySelector("input")?.focus();
  }, { "aria-expanded": "false" });
  qList.append(qrB);
  qList.append(qt("write", "Write with AI", typeof opts.magicWrite === "function" ? "Write and rewrite here" : "In the Text panel", icon("pencil"), () => {
    if (typeof opts.magicWrite === "function") { try { opts.magicWrite(); } catch (e) { S.toast(e?.message || "Write with AI could not open."); } return; }
    S.openPanel("text"); let n = 0; const tryOpen = () => { const el = S.shell?.el?.querySelector('.ads-pbody[data-panel="text"] [data-kit="magic-write"]'); if (el) { if (el.getAttribute("aria-expanded") !== "true") el.click(); } else if (n++ < 40) setTimeout(tryOpen, 50); }; tryOpen();
  }));
  quick.append(qList, qrHost); disc.append(quick); searchable.push([quick, quick.textContent]);

  // AI tools (lists from panels/tools.js: real on-device tools open; AI-only ones are honest "coming soon")
  const aiSec = sec(S, "ai", "AI tools"); const aiList = h("div", { class: "ads-apps ads-aitools" }); aiSec.append(aiList); disc.append(aiSec);
  import("./tools.js").then((T) => {
    for (const [id, [label, ic, sub, href]] of Object.entries(T.AI_REAL)) { const a = h("a", { class: "ads-app2", href, target: "_blank", rel: "noopener", "data-app-tool": id, "data-search": `${label} ${sub} ai`, html: `<span class="ads-appic">${T.toolIcon(ic)}</span>` }, h("span", {}, h("b", { text: label }), h("small", { text: sub }))); a.addEventListener("click", () => remember(id)); aiList.append(a); }
    for (const [id, [label, ic, sub]] of Object.entries(T.AI_SOON)) aiList.append(h("button", { type: "button", class: "ads-app2 ads-soonapp", "data-app-tool": id, "data-search": `${label} ${sub} ai`, "aria-label": `${label}: coming soon`, html: `<span class="ads-appic">${T.toolIcon(ic)}</span>`, onclick: () => S.toast(`${label} needs AsaanDesk AI, which is coming soon. Nothing was sent anywhere.`, 3600) }, h("span", {}, h("b", { text: label }), h("small", { text: sub })), h("span", { class: "ads-soonbadge", text: "Coming soon" })));
    apply();
  }).catch((e) => console.error(e));

  const dsec = sec(S, "discover", "Discover");
  const chips = h("div", { class: "ads-chiprow", role: "group", "aria-label": "Categories" }, CATS.map(([id, label]) => h("button", { type: "button", class: "ads-fchip" + (st.cat === id ? " on" : ""), "aria-pressed": String(st.cat === id), "data-cat": id, text: label, onclick: (e) => { st.cat = id; for (const c of chips.children) { c.classList.toggle("on", c === e.currentTarget); c.setAttribute("aria-pressed", String(c === e.currentTarget)); } apply(); } })));
  const grid = h("div", { class: "ads-apps" }, all.map(appLink));
  const none = h("p", { class: "ads-muted", hidden: true, "data-ads": "panel-search-none", text: "No apps match. Try another word." });
  dsec.append(chips, grid, none);
  disc.append(dsec);
  { const os = ownSection(S); if (os) disc.append(os); }
  const yours = h("section", { class: "ads-ksec", "data-kit-sec": "yours", "aria-label": "Your apps" });
  const drawYours = () => { const ids = S.LS.get(YOUR_APPS, []); const mine = ids.map((id) => all.find((a) => a[0] === id)).filter(Boolean); yours.replaceChildren(h("div", { class: "ads-khead" }, h("h3", { class: "ads-h3", text: "Your apps" })), mine.length ? h("div", { class: "ads-apps ads-yours" }, mine.map((a) => { const el = appLink(a); el.classList.replace("ads-app", "ads-app2"); return el; })) : h("p", { class: "ads-muted", text: "Apps you open from here show up in this list." })); };
  root.append(disc, yours);
  function apply() {
    const W = st.words; let n = 0;
    for (const a of grid.children) { const ok = (st.cat === "all" || a.dataset.cat.split(" ").includes(st.cat)) && matches(W, a.dataset.search); a.hidden = !ok; if (ok) n++; }
    for (const el of aiList.children) { const ok = matches(W, el.dataset.search); el.hidden = !ok; if (ok && W.length) n++; }
    aiSec.hidden = !!W.length && ![...aiList.children].some((x) => !x.hidden);
    for (const el of qList.children) el.hidden = !matches(W, el.dataset.search);
    quick.hidden = !!W.length && ![...qList.children].some((x) => !x.hidden);
    for (const [el, text] of searchable) if (el !== quick) el.hidden = !!W.length && !matches(W, text);
    feat.hidden = !!W.length; picks.hidden = !!W.length;
    none.hidden = n > 0;
    if (W.length && st.tab !== "discover") { st.tab = "discover"; drawTabs(); show(); }
  }
  function show() { disc.hidden = st.tab !== "discover"; yours.hidden = st.tab !== "yours"; if (st.tab === "yours") drawYours(); }
  show(); apply();
}
