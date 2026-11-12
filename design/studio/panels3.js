// Studio round-3 panels (Canva help-page parity): the Effects panel (Shadow, Lift, Glow, Echo, Outline,
// Background, Splice, Hollow, Glitch, Neon + Curve), gradient colours for text and shapes, automatic page
// numbers (Text > Dynamic text), page titles and the lock / copy-style / tidy-up actions.
import { S, emit, commit, curPage, pageSize, selLayers, single, toast, h } from "./state.js";
import * as E from "./editor.js";
import { layerContent } from "./svg.js";
import { EFFECT_STYLES, EFFECT_CONTROLS, GLITCH_PAIRS, GRADIENT_PRESETS, effectDefaults, effectStyle, shadowFrom, bgFrom, hasGradient, uncurve, extrudeColor } from "./textfx.js";
import { PAGE_NUM_FORMATS, PAGE_NUM_SHOW, PAGE_NUM_SPOTS, addPageNumbers, removePageNumbers, applyPageNumberStyle, isPageNumber, countPageNumbers, styleOf, pasteStyle, tidyUp, setLock, nextLock, canvasToSelection, normalizeLink } from "./pagetools.js";
import { exportLayers, download, fileBase } from "./exporter.js";
import { customPreset, presetPx } from "./presets.js";
import { pageSvg } from "./svg.js";
import { magicResize } from "./resize.js";
import { duplicatePage } from "./model.js";
import { aabb, unionBox } from "./geometry.js";
import * as TB from "./tableops.js";
import { vectorEnv } from "./exporter.js";
import { textWidth } from "./textlayout.js";

const sec = (title, ...kids) => h("section.st-sec", {}, title ? h("h3", { text: title }) : null, ...kids);
const btn = (text, onClick, cls = "", attrs = {}) => h("button.btn" + (cls ? "." + cls.split(" ").join(".") : ""), { type: "button", html: text, on: { click: onClick }, ...attrs });
function slider(label, value, min, max, step, onInput, id) {
  const out = h("output", { text: String(Math.round(value)) });
  const inp = h("input", { type: "range", min, max, step, value, "aria-label": label, id });
  inp.addEventListener("input", () => { out.textContent = String(Math.round(+inp.value)); onInput(+inp.value); });
  return h("label.st-row.st-slider", {}, h("span.st-lab", { text: label }), inp, out);
}
function colorRow(label, value, onInput, id) {
  const inp = h("input.st-color", { type: "color", value: /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000", "aria-label": label, title: label, id });
  inp.addEventListener("input", () => onInput(inp.value));
  return h("label.st-row", {}, h("span.st-lab", { text: label }), inp);
}
const upd = (fn, key) => E.updateSel(fn, key, { silent: true });

/* ---------------- Effects (text) ---------------- */
/** Sets a text style to one of Canva's effect styles with its default settings. */
export function setEffect(t, type) {
  delete t.effect; delete t.shadow; delete t.bg; delete t.outline;
  const d = effectDefaults(type);
  if (type === "shadow") t.shadow = shadowFrom(d, t.size);
  else if (type === "background") t.bg = bgFrom(d);
  else if (type === "outline") t.outline = { width: Math.max(0.5, t.size * 0.004 * d.thickness), color: d.color, canva: { thickness: d.thickness } };
  else if (type !== "none") t.effect = { type, ...d };
}
/** Current slider values of the picked style. */
function effectValues(t, type) {
  if (type === "shadow") return { ...effectDefaults("shadow"), ...(t.shadow?.canva || {}), color: t.shadow?.color || "#000000" };
  if (type === "background") return { ...effectDefaults("background"), ...(t.bg?.canva || {}), color: t.bg?.color || "#fde68a" };
  if (type === "outline") return { ...effectDefaults("outline"), ...(t.outline?.canva || {}), color: t.outline?.color || "#1b2133" };
  return { ...effectDefaults(type), ...(t.effect || {}) };
}
function setValue(t, type, key, v) {
  const o = { ...effectValues(t, type), [key]: v };
  if (type === "shadow") t.shadow = shadowFrom(o, t.size);
  else if (type === "background") t.bg = bgFrom(o);
  else if (type === "outline") t.outline = { width: Math.max(0.5, t.size * 0.004 * o.thickness), color: o.color, canva: { thickness: o.thickness } };
  else t.effect = { ...(t.effect || { type }), [key]: v };
}
function preview(type) {
  const t = { content: "Ag", family: "sans", size: 30, bold: true, italic: false, underline: false, color: "#1b2133", align: "center", lineHeight: 1.1, letterSpacing: 0 };
  setEffect(t, type);
  const l = { id: "fx" + type, type: "text", x: 0, y: 0, w: 64, h: 40, rotation: 0, opacity: 1, text: t };
  return `<svg width="64" height="40" viewBox="0 0 64 40" overflow="hidden" aria-hidden="true">${layerContent(l, { idp: "fxp" })}</svg>`;
}
/** The Effects section for a text layer (props panel). */
export function effectsSection(l, rerender) {
  const t = l.text, cur = effectStyle(t);
  const grid = h("div.st-fxgrid", { role: "group", "aria-label": "Effect style" });
  for (const [type, label] of EFFECT_STYLES) {
    grid.append(h("button.st-fxbtn", { type: "button", class: "st-fxbtn" + (type === cur ? " on" : ""), "data-effect": type, "aria-pressed": String(type === cur), title: label, html: preview(type) + `<span>${label}</span>`,
      on: { click: () => { upd((x) => { if (x.type === "text") setEffect(x.text, type); }, "effect"); rerender(); } } }));
  }
  const ctl = h("div.st-fxctl", { id: "fxControls" });
  if (cur !== "none") {
    const vals = effectValues(t, cur);
    for (const [key, label, min, max] of EFFECT_CONTROLS[cur] || []) ctl.append(slider(label, vals[key] ?? 0, min, max, 1, (v) => upd((x) => { if (x.type === "text") setValue(x.text, cur, key, v); }, "fx-" + key), "fx-" + key));
    if (["shadow", "background", "outline", "splice", "echo", "glow", "extrude"].includes(cur)) ctl.append(colorRow(cur === "extrude" ? "Side colour" : "Colour", vals.color || (cur === "extrude" ? extrudeColor(t.color) : t.color), (v) => upd((x) => { if (x.type === "text") setValue(x.text, cur, "color", v); }, "fx-color"), "fxColor"));
    if (cur === "glitch") {
      const pairs = h("div.st-row.st-wrap", { role: "group", "aria-label": "Glitch colours" });
      GLITCH_PAIRS.forEach((p, i) => pairs.append(h("button.st-fxpair", { type: "button", "data-pair": i, title: "Colours " + (i + 1), "aria-label": "Glitch colours " + (i + 1), style: { background: `linear-gradient(90deg, ${p[0]} 50%, ${p[1]} 50%)` }, on: { click: () => upd((x) => { if (x.type === "text") setValue(x.text, "glitch", "colors", p); }, "fx-colors") } })));
      ctl.append(h("div.st-row", {}, h("span.st-lab", { text: "Colours" }), pairs));
    }
    ctl.append(btn("Remove effect", () => { upd((x) => { if (x.type === "text") setEffect(x.text, "none"); }, "effect"); rerender(); }, "small", { id: "fxRemove" }));
  }
  // Shape: None / Curve.
  const curved = !!+t.curve;
  const shape = h("div.st-seg", { role: "group", "aria-label": "Text shape" },
    btn("None", () => { const pw = pageSize().w; upd((x) => { if (x.type === "text" && x.text.curve != null) uncurve(x, Math.max(x.w, pw)); }, "curve"); rerender(); }, curved ? "" : "on", { "data-shape": "none", "aria-pressed": String(!curved) }),
    btn("Curve", () => { upd((x) => { if (x.type === "text") x.text.curve = 50; }, "curve"); rerender(); }, curved ? "on" : "", { "data-shape": "curve", "aria-pressed": String(curved) }));
  const curve = curved ? slider("Curve", +t.curve, -100, 100, 1, (v) => upd((x) => { if (x.type === "text") { if (v) x.text.curve = v; else x.text.curve = 0.0001; } }, "curve-v"), "fxCurve") : null;
  return sec("Effects", h("h4", { text: "Style" }), grid, ctl, h("h4", { text: "Shape" }), shape, curve,
    curved ? h("p.st-hint", { text: "Curved text is one line. Drag the slider below 0 to curve it the other way." }) : null);
}

/* ---------------- gradient colour (text and shapes) ---------------- */
/** "Colour" section: solid or gradient (presets, up to 10 stops, angle). get/set read and write the gradient. */
export function gradientSection(title, l, get, set, rerender) {
  const g = get(l);
  const on = hasGradient(g);
  const box = h("div.st-gradbox", { id: "gradBox" });
  const presets = h("div.st-gradpresets", { role: "group", "aria-label": "Gradients" });
  for (const [name, stops, angle] of GRADIENT_PRESETS) presets.append(h("button.st-gradbtn", { type: "button", title: name, "aria-label": "Gradient " + name, "data-grad": name, style: { background: `linear-gradient(${angle}deg, ${stops.join(", ")})` }, on: { click: () => { upd((x) => set(x, { stops: [...stops], angle }), "grad"); rerender(); } } }));
  box.append(presets);
  if (on) {
    const stops = h("div.st-gradstops");
    g.stops.forEach((c, i) => {
      const inp = h("input.st-color", { type: "color", value: c, "aria-label": "Gradient colour " + (i + 1), "data-stop": i });
      inp.addEventListener("input", () => upd((x) => { const gg = get(x); if (gg) { gg.stops[i] = inp.value; set(x, gg); } }, "grad"));
      const del = g.stops.length > 2 ? h("button.st-stopdel", { type: "button", "aria-label": "Remove colour " + (i + 1), title: "Remove colour", text: "×", on: { click: () => { upd((x) => { const gg = get(x); gg.stops.splice(i, 1); set(x, gg); }, "grad"); rerender(); } } }) : null;
      stops.append(h("span.st-gradstop", {}, inp, del));
    });
    if (g.stops.length < 10) stops.append(h("button.btn.small", { type: "button", id: "gradAdd", text: "+ Colour", title: "Add a colour (up to 10)", on: { click: () => { upd((x) => { const gg = get(x); gg.stops.push(gg.stops[gg.stops.length - 1]); set(x, gg); }, "grad"); rerender(); } } }));
    box.append(stops, slider("Angle", g.angle ?? 90, 0, 360, 1, (v) => upd((x) => { const gg = get(x); if (gg) { gg.angle = v; set(x, gg); } }, "grad"), "gradAngle"),
      btn("Use a solid colour", () => { upd((x) => set(x, null), "grad"); rerender(); }, "small", { id: "gradOff" }));
  }
  return sec(title, box);
}
export const textGradient = { get: (x) => (x.type === "text" ? x.text.gradient || null : null), set: (x, g) => { if (x.type !== "text") return; if (g) x.text.gradient = { stops: [...g.stops], angle: g.angle ?? 90 }; else delete x.text.gradient; } };
export const shapeGradient = { get: (x) => (x.type === "shape" ? x.shape.gradient || null : null), set: (x, g) => { if (x.type !== "shape") return; if (g) { x.shape.gradient = { stops: [...g.stops], angle: g.angle ?? 90 }; if (x.shape.fill === "none") x.shape.fill = g.stops[0]; } else delete x.shape.gradient; } };

/* ---------------- automatic page numbers (Text panel > Dynamic text) ---------------- */
export function pageNumbersSection() {
  const P = pageSize();
  const has = countPageNumbers(S.design);
  const sel = (id, label, opts, value) => { const s = h("select.ad-input", { id, "aria-label": label }); for (const [v, t] of opts) s.append(h("option", { value: v, text: t, selected: v === value })); return h("label.st-field", {}, h("span", { text: label }), s); };
  const first = S.design.pages.flatMap((p) => p.layers).find(isPageNumber);
  const fmt = sel("pnFormat", "Format", PAGE_NUM_FORMATS, first?.text.dynamic.format || "number");
  const show = sel("pnShow", "Show numbers on", PAGE_NUM_SHOW, "all");
  const spot = sel("pnSpot", "Place", PAGE_NUM_SPOTS, "bottom-right");
  const status = h("p.st-status", { id: "pnStatus", role: "status" });
  const val = (el) => el.querySelector("select").value;
  const apply = () => {
    if (S.editing) E.endEdit();
    const chosen = selLayers().find(isPageNumber) || null;
    const style = chosen ? { family: chosen.text.family, size: chosen.text.size, color: chosen.text.color, bold: chosen.text.bold, italic: chosen.text.italic } : first ? { family: first.text.family, size: first.text.size, color: first.text.color, bold: first.text.bold, italic: first.text.italic } : null;
    const n = addPageNumbers(S.design, P.w, P.h, { format: val(fmt), show: val(show), spot: val(spot), current: S.page, style });
    S.sel = [];
    E.renderAll(); commit("page-numbers"); emit("selection"); emit("pages");
    status.textContent = `Page numbers on ${n} page${n === 1 ? "" : "s"}. They update when you add, move, hide or delete pages.`;
  };
  const styleAll = () => {
    const from = selLayers().find(isPageNumber) || first;
    if (!from) { status.textContent = "Add page numbers first."; return; }
    const n = applyPageNumberStyle(S.design, from);
    E.renderAll(); commit("page-numbers"); emit("pages");
    status.textContent = `Style copied to ${n} other page number${n === 1 ? "" : "s"}.`;
  };
  const remove = () => { const n = removePageNumbers(S.design); S.sel = []; E.renderAll(); commit("page-numbers"); emit("selection"); emit("pages"); status.textContent = n ? `Removed ${n} page number${n === 1 ? "" : "s"}.` : "There were no page numbers."; };
  return sec("Dynamic text", h("h4", { text: "Page numbers" }), fmt, show, spot,
    h("div.st-row.st-wrap", {}, btn(has ? "Apply properties to all pages" : "Add page numbers", has ? () => { const f = val(fmt); for (const p of S.design.pages) for (const l of p.layers) if (isPageNumber(l)) l.text.dynamic.format = f; if (S.design.pageNumbers) S.design.pageNumbers.format = f; styleAll(); } : apply, "primary small", { id: "pnApply" }),
      has ? btn("Number pages again", apply, "small", { id: "pnRedo", title: "Put page numbers on the chosen pages again, in the chosen place" }) : null,
      has ? btn("Remove all page numbers", remove, "small", { id: "pnRemove" }) : null),
    h("p.st-hint", { text: "Select one page number and change its font, size or colour, then press Apply properties to all pages." }), status);
}

/* ---------------- page title ---------------- */
export function pageTitleField() {
  const pg = curPage();
  const inp = h("input.ad-input", { type: "text", id: "pageTitle", maxlength: 60, value: pg.title || "", placeholder: "Add page title", "aria-label": "Page title" });
  inp.addEventListener("input", () => { const v = inp.value.trim(); if (v) curPage().title = v.slice(0, 60); else delete curPage().title; commit("page-title"); emit("page-title"); });
  return h("label.st-field", {}, h("span", { text: "Page title" }), inp);
}

/* ---------------- copy style (paint roller), tidy up, locks ---------------- */
let copied = null;
export const copiedStyle = () => copied;
/** Copy style: remember the selected layer's style; the next layer clicked takes it (Esc cancels). */
export function startCopyStyle() {
  const l = single();
  if (!l) { toast("Select one item to copy its style."); return false; }
  copied = styleOf(l);
  S.paintStyle = true;
  document.body.classList.add("st-painting");
  toast("Style copied. Click another item to paste it (Esc to stop).");
  return true;
}
export function stopCopyStyle() { S.paintStyle = false; document.body.classList.remove("st-painting"); }
/** Pastes the copied style on these layers (called by the canvas after a click while painting). */
export function pasteCopiedStyle(ids) {
  if (!copied) return 0;
  let n = 0;
  for (const id of ids) { const l = curPage().layers.find((x) => x.id === id); if (l && !l.locked && pasteStyle(l, copied)) { E.fitText(l); E.renderLayer(l); n++; } }
  stopCopyStyle();
  if (n) { commit("paste-style"); emit("selection"); toast("Style pasted."); }
  else toast("That item can't take this style.");
  return n;
}
/** Canva "Tidy up": a neat row, column or grid with equal gaps. */
export function tidySelection() {
  const sel = selLayers().filter((l) => !l.locked);
  if (sel.length < 2) { toast("Select two or more items to tidy up."); return; }
  const pos = tidyUp(sel.map((l) => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h })));
  for (const l of sel) if (pos[l.id]) { l.x = pos[l.id].x; l.y = pos[l.id].y; }
  E.renderAll(); commit("tidy"); emit("selection");
}
/** Lock menu: Lock (position, style and content) / Lock position only / Unlock. */
export function lockSelection(mode) {
  const sel = selLayers();
  if (!sel.length) return;
  for (const l of sel) setLock(l, mode || nextLock(sel[0]));
  E.renderAll(); commit("lock"); emit("selection");
  const m = sel[0].locked ? (sel[0].lockMode === "position" ? "Position locked: you can still change the text or photo." : "Locked.") : "Unlocked.";
  toast(m);
}

/* ---------------- right-click menu (Canva: element and page menus) ---------------- */
let menu = null;
export function closeMenu() { menu?.remove(); menu = null; document.removeEventListener("pointerdown", awayMenu, true); }
function awayMenu(e) { if (menu && !menu.contains(e.target)) closeMenu(); }
const kbd = (s) => `<kbd>${s}</kbd>`;
/** Opens the right-click menu at client x, y for the current selection (or the page when nothing is selected). */
export function contextMenu(x, y) {
  closeMenu();
  if (!S.design) return;
  const sel = selLayers(), l = single(), pg = curPage();
  const item = (id, label, act, { keys = "", disabled = false } = {}) => h("button.st-menuitem", { type: "button", role: "menuitem", "data-menu": id, disabled, html: `<span>${label}</span>${keys ? kbd(keys) : ""}`, on: { click: () => { closeMenu(); act(); } } });
  const hr = () => h("hr.st-menuhr");
  menu = h("div.st-menu", { role: "menu", "aria-label": sel.length ? "Item menu" : "Page menu", id: "ctxMenu" });
  if (sel.length) {
    const locked = sel.every((x) => x.locked);
    menu.append(item("copy", "Copy", () => E.copySel(), { keys: "Ctrl+C" }), item("paste", "Paste", () => E.pasteClip(), { keys: "Ctrl+V" }), item("duplicate", "Duplicate", () => E.duplicateSel(), { keys: "Ctrl+D" }), item("delete", "Delete", () => E.deleteSel(), { keys: "Del", disabled: locked }), hr(),
      item("copy-style", "Copy style", () => startCopyStyle(), { keys: "Ctrl+Alt+C", disabled: !l }), item("paste-style", "Paste style", () => pasteCopiedStyle(S.sel), { keys: "Ctrl+Alt+V", disabled: !copied }), hr(),
      item("lock", locked ? "Unlock" : "Lock", () => lockSelection(locked ? "none" : "full"), { keys: "Alt+Shift+L" }), item("lock-position", "Lock position only", () => lockSelection("position")), hr(),
      item("forward", "Bring forward", () => E.arrange("forward"), { keys: "]" }), item("front", "Bring to front", () => E.arrange("front"), { keys: "Ctrl+]" }), item("backward", "Send backward", () => E.arrange("backward"), { keys: "[" }), item("back", "Send to back", () => E.arrange("back"), { keys: "Ctrl+[" }), hr());
    if (sel.length > 1) menu.append(item("group", "Group", () => E.groupSel(), { keys: "Ctrl+G" }), item("tidy", "Tidy up", () => tidySelection()), item("align-center", "Align centres", () => E.alignSel("center")), item("align-middle", "Align middles", () => E.alignSel("middle")));
    else { if (l?.type === "group") menu.append(item("ungroup", "Ungroup", () => E.ungroupSel(), { keys: "Ctrl+Shift+G" })); menu.append(item("align-page", "Align to page centre", () => { E.alignSel("center"); E.alignSel("middle"); })); }
    menu.append(item("link", l?.link ? "Edit link" : "Link", () => linkDialog(x, y), { keys: "Ctrl+K", disabled: !l }), item("comment", "Comment", () => emit("comment", { id: (l || sel[0]).id, label: `Page ${S.page + 1}: ${(l || sel[0]).name || "item"}` })));
    if (l?.type === "image") menu.append(item("set-bg", "Set image as background", () => imageToBackground(l)));
    if (S.design.pages.length > 1) menu.append(item("move-to-page", "Move to page…", () => { const n = prompt(`Move to which page? (1 to ${S.design.pages.length})`, String(S.page === 0 ? 2 : S.page)); const i = Math.round(+n) - 1; if (n !== null && i >= 0 && i < S.design.pages.length && i !== S.page) E.moveSelToPage(i); }));
    menu.append(hr(), item("download-selection", "Download selection", () => downloadSelection()), item("resize-to-selection", "Resize page to selection", () => resizePageToSelection()));
  } else {
    menu.append(item("paste", "Paste", () => E.pasteClip(), { keys: "Ctrl+V" }), item("select-all", "Select all", () => E.selectAll(), { keys: "Ctrl+A" }), hr(),
      item("add-page", "Add page", () => E.addPage()), item("import-pages", "Add pages from another design", () => importPagesDialog()), item("dup-page", "Duplicate page", () => E.dupPage()), item("del-page", "Delete page", () => { if (S.design.pages.length > 1) E.deletePage(); else toast("A design needs at least one page."); }, { disabled: S.design.pages.length < 2 }), hr(),
      item("hide-page", pg.hidden ? "Show page" : "Hide page", () => { if (pg.hidden) delete curPage().hidden; else curPage().hidden = true; commit("hide-page"); emit("pages"); }),
      item("lock-page", pg.locked ? "Unlock page" : "Lock page", () => { if (pg.locked) delete curPage().locked; else curPage().locked = true; E.renderAll(); commit("lock-page"); emit("pages"); emit("selection"); toast(curPage().locked ? "Page locked: nothing on it can move or change." : "Page unlocked."); }),
      item("comment", "Comment on this page", () => emit("comment", { id: pg.id, label: `Page ${S.page + 1}${pg.title ? ": " + pg.title : ""}` })),
      item("page-title", pg.title ? "Rename page" : "Add page title", () => { const t = prompt("Page title", pg.title || ""); if (t === null) return; const v = t.trim().slice(0, 60); if (v) curPage().title = v; else delete curPage().title; commit("page-title"); emit("page-title"); }));
  }
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(6, Math.min(innerWidth - r.width - 6, x)) + "px";
  menu.style.top = Math.max(6, Math.min(innerHeight - r.height - 6, y)) + "px";
  menu.querySelector("button:not([disabled])")?.focus();
  menu.addEventListener("keydown", (e) => { const items = [...menu.querySelectorAll("button:not([disabled])")], i = items.indexOf(document.activeElement); if (e.key === "Escape") { e.preventDefault(); closeMenu(); } else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); } e.stopPropagation(); });
  setTimeout(() => document.addEventListener("pointerdown", awayMenu, true));
}

/* ---------------- link, download selection, image as background, page to selection ---------------- */
/** Canva "Link": a web address (or email / phone) on the selected item. Clickable when presenting and in PDF/SVG downloads. */
export function linkDialog(x = innerWidth / 2 - 160, y = innerHeight / 3) {
  const l = single();
  if (!l) { toast("Select one item to add a link."); return; }
  closeMenu();
  const inp = h("input.ad-input", { type: "url", id: "linkInput", value: l.link || "", placeholder: "https://example.com, email or phone", "aria-label": "Link" });
  const msg = h("p.st-status", { role: "status" });
  const save = () => { const v = normalizeLink(inp.value); if (inp.value.trim() && !v) { msg.textContent = "That is not a web address, email or phone number."; return; } E.updateSel((x) => { if (v) x.link = v; else delete x.link; }, "link"); closeMenu(); toast(v ? "Link added. It works when presenting and in PDF downloads." : "Link removed."); emit("selection"); };
  // novalidate: the browser's own URL check would block "example.com" (no https://) before our save() adds it.
  menu = h("form.st-menu.st-linkbox", { id: "linkBox", role: "dialog", "aria-label": "Link", novalidate: true, on: { submit: (e) => { e.preventDefault(); save(); } } }, h("label.st-field", {}, h("span", { text: "Link" }), inp), msg,
    h("div.st-row.st-end", {}, l.link ? btn("Remove link", () => { inp.value = ""; save(); }, "small", { id: "linkRemove" }) : null, h("button.btn.primary.small", { type: "submit", id: "linkSave", text: "Done" })));
  document.body.append(menu);
  menu.style.left = Math.max(6, Math.min(innerWidth - 340, x)) + "px"; menu.style.top = Math.max(6, Math.min(innerHeight - 160, y)) + "px";
  inp.focus(); inp.select();
  inp.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); closeMenu(); } e.stopPropagation(); });
  setTimeout(() => document.addEventListener("pointerdown", awayMenu, true));
}
/** Canva "Download selection": the selected items only, as a see-through PNG. */
export async function downloadSelection() {
  const sel = selLayers().filter((x) => !x.hidden);
  if (!sel.length) { toast("Select something to download."); return null; }
  try { const r = await exportLayers(S.design, sel, { scale: 2, type: "png" }); download(r.blob, fileBase(S.design) + "-selection.png"); toast("Selection saved as PNG."); return r; }
  catch (e) { toast(e.message || "Could not save the selection."); return null; }
}
/** Canva "Set image as background". */
export function imageToBackground(l) {
  if (!l || l.type !== "image") return;
  curPage().background = { color: "#ffffff", image: l.image.src };
  curPage().layers = curPage().layers.filter((x) => x.id !== l.id);
  S.sel = []; E.renderAll(); commit("bg-image"); emit("selection"); emit("pages");
  toast("The photo is now the page background.");
}
/** Canva "Resize canvas to selection": the page becomes the size of the selected items (they stay where they are on it). */
export function resizePageToSelection() {
  const sel = selLayers();
  if (!sel.length) return;
  const box = unionBox(sel.map(aabb)), r = canvasToSelection(box);
  let P;
  try { P = customPreset(r.w, r.h, "px"); } catch (e) { toast(e.message); return; }
  if (S.design.preset.unit !== "px") toast("Print sizes become a pixel size here.");
  S.design.preset = { ...P, group: S.design.preset.group || P.group, label: "Custom " + r.w + " × " + r.h + " px" };
  for (const p of S.design.pages) for (const x of p.layers) { x.x += r.dx; x.y += r.dy; }
  E.renderAll(); E.fit(); commit("resize-to-selection"); emit("pages"); emit("selection");
  toast(`Page is now ${r.w} × ${r.h} px. Press Ctrl+Z to undo.`);
}

/* ---------------- tables (Canva: rows, columns, borders, cell colours, column sizes) ---------------- */
/** Table tools for the props panel. After each change the table height is measured again. */
export function tableTools(l, rerender) {
  const t = l.table, nR = t.cells.length, nC = Math.max(1, ...t.cells.map((r) => r.length));
  // The picked row / column belongs to this table: another table starts at row 1, column 1.
  if (S.tableSel?.id !== l.id) S.tableSel = { id: l.id, r: 0, c: 0 };
  const st = S.tableSel;
  st.r = Math.min(st.r, nR - 1); st.c = Math.min(st.c, nC - 1);
  const change = async (fn, key = "tableop") => { const v = await vectorEnv(); S.env.chartPrims ||= v.chartPrims; S.env.tablePrims ||= v.tablePrims; S.env.tableHeight ||= v.tableHeight; try { E.updateSel((x) => { if (x.type === "table") { fn(x.table, v); x.h = v.tableHeight(x.table, x.w); } }, key, { silent: true }); } catch (e) { toast(e.message); } rerender(); };
  const pick = (label, n, val, onPick, id) => { const s = h("select.ad-input.st-tpick", { id, "aria-label": label }); for (let i = 0; i < n; i++) s.append(h("option", { value: i, text: String(i + 1), selected: i === val })); s.addEventListener("change", () => { onPick(+s.value); rerender(); }); return s; };
  const rowSel = pick("Row", nR, st.r, (v) => { st.r = v; }, "tRow"), colSel = pick("Column", nC, st.c, (v) => { st.c = v; }, "tCol");
  // change() first awaits the vector renderer, so every row / column number is read now (before st moves on).
  const rowOps = h("div.st-row.st-wrap", {}, h("span.st-lab", { text: "Row" }), rowSel,
    btn("+ Before", () => { const r = st.r; change((x) => TB.addRow(x, r)); }, "small", { "data-top": "row-before" }), btn("+ After", () => { const r = st.r; st.r = r + 1; change((x) => TB.addRow(x, r + 1)); }, "small", { "data-top": "row-after" }),
    btn("↑", () => { const r = st.r; st.r = Math.max(0, r - 1); change((x) => TB.moveRow(x, r, r - 1)); }, "small", { title: "Move row up", "aria-label": "Move row up", "data-top": "row-up" }), btn("↓", () => { const r = st.r; st.r = Math.min(nR - 1, r + 1); change((x) => TB.moveRow(x, r, r + 1)); }, "small", { title: "Move row down", "aria-label": "Move row down", "data-top": "row-down" }),
    btn("Delete", () => { const r = st.r; change((x) => TB.delRow(x, r)); }, "small", { "data-top": "row-del", disabled: nR < 2 }));
  const colOps = h("div.st-row.st-wrap", {}, h("span.st-lab", { text: "Column" }), colSel,
    btn("+ Before", () => { const c = st.c; change((x) => TB.addCol(x, c)); }, "small", { "data-top": "col-before" }), btn("+ After", () => { const c = st.c; st.c = c + 1; change((x) => TB.addCol(x, c + 1)); }, "small", { "data-top": "col-after" }),
    btn("←", () => { const c = st.c; st.c = Math.max(0, c - 1); change((x) => TB.moveCol(x, c, c - 1)); }, "small", { title: "Move column left", "aria-label": "Move column left", "data-top": "col-left" }), btn("→", () => { const c = st.c; st.c = Math.min(nC - 1, c + 1); change((x) => TB.moveCol(x, c, c + 1)); }, "small", { title: "Move column right", "aria-label": "Move column right", "data-top": "col-right" }),
    btn("Delete", () => { const c = st.c; change((x) => TB.delCol(x, c)); }, "small", { "data-top": "col-del", disabled: nC < 2 }));
  const align = h("div.st-seg", { role: "group", "aria-label": "Column alignment" }, ...[["left", "Left"], ["center", "Centre"], ["right", "Right"]].map(([v, txt]) => btn(txt, () => change((x) => { x.align = x.align || []; x.align[st.c] = v; }), (t.align?.[st.c] || "left") === v ? "on" : "", { "data-talign": v })));
  const fill = h("input.st-color", { type: "color", id: "tCellFill", value: t.fills?.[st.r + "," + st.c] || "#ffffff", "aria-label": "Cell colour" });
  fill.addEventListener("input", () => { const r = st.r, c = st.c, v = fill.value; change((x) => TB.setFill(x, r, c, v), "table-fill"); });
  const check = (label, on, fn, id) => h("label.st-check", {}, h("input", { type: "checkbox", id, checked: !!on, on: { change: (e) => change((x) => fn(x, e.target.checked)) } }), h("span", { text: label }));
  const bw = t.border?.width ?? 1;
  return sec("Table tools", h("p.st-hint", { text: "Pick a row and a column, then add, move or delete them, or colour that cell." }), rowOps, colOps,
    h("div.st-row", {}, h("span.st-lab", { text: "Align column" }), align),
    h("div.st-row", {}, h("span.st-lab", { text: "Cell colour" }), fill, btn("Clear", () => change((x) => TB.setFill(x, st.r, st.c, null)), "small", { id: "tCellClear" })),
    h("div.st-row.st-wrap", {}, btn("Size columns equally", () => change((x) => TB.sizeColumnsEqually(x)), "small", { id: "tEqual" }), btn("Size columns to content", () => change((x, v) => TB.sizeColumnsToContent(x, (s, b) => textWidth(s, "sans", b, false, x.size || 16))), "small", { id: "tContent" })),
    check("Header row", t.header, (x, v) => { x.header = v; }, "tHeader"), check("Striped rows", t.stripe, (x, v) => { x.stripe = v; }, "tStripe"),
    colorRow("Border colour", t.border?.color || "#94a3b8", (v) => change((x) => { x.border = { width: x.border?.width ?? 1, color: v }; }, "table-border"), "tBorderColor"),
    slider("Border weight", bw, 0, 12, 0.5, (v) => change((x) => { x.border = { color: x.border?.color || "#94a3b8", width: v }; }, "table-border"), "tBorderW"),
    colorRow("Header text", t.headerColor || "#ffffff", (v) => change((x) => { x.headerColor = v; }, "table-hc"), "tHeaderText"),
    colorRow("Text colour", t.color || "#1f2937", (v) => change((x) => { x.color = v; }, "table-tc"), "tTextColor"));
}

/* ---------------- charts (Canva: colours, labels, legend) ---------------- */
const CHART_PALETTE = ["#5b4cf0", "#ff7a59", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e", "#2f80ff", "#a64bf4", "#64748b", "#0ea5e9"];
/** Colours (one per series, or per slice / bar for one-series pies, donuts, funnels and bars), legend, text colour. */
export function chartTools(l, rerender) {
  const sp = l.chart.spec;
  const perItem = sp.series.length === 1 && ["pie", "donut", "funnel", "hbar"].includes(sp.kind);
  const names = perItem ? sp.labels : sp.series.map((s) => s.name);
  const cols = sp.colors?.length ? sp.colors : CHART_PALETTE;
  const set = (fn, key) => E.updateSel((x) => { if (x.type === "chart") fn(x.chart.spec); }, key, { silent: true });
  const sw = h("div.st-chartcolors");
  names.slice(0, 10).forEach((name, i) => sw.append(colorRow(name || `Colour ${i + 1}`, cols[i % cols.length], (v) => set((s) => { const c = (s.colors?.length ? s.colors : CHART_PALETTE).slice(); while (c.length <= i) c.push(CHART_PALETTE[c.length % 10]); c[i] = v; s.colors = c; }, "chart-color"), "chartColor" + i)));
  const check = (label, on, fn, id) => h("label.st-check", {}, h("input", { type: "checkbox", id, checked: !!on, on: { change: (e) => { set((s) => fn(s, e.target.checked), "chart-opt"); } } }), h("span", { text: label }));
  const center = sp.kind === "donut" ? (() => { const i = h("input.ad-input", { type: "text", id: "chartCenter", value: sp.centerText || "", placeholder: "e.g. 72%", "aria-label": "Text in the middle" }); i.addEventListener("input", () => set((s) => { if (i.value) s.centerText = i.value.slice(0, 20); else delete s.centerText; }, "chart-center")); return h("label.st-field", {}, h("span", { text: "Text in the middle" }), i); })() : null;
  return sec("Chart style", h("h4", { text: perItem ? "Colours of the parts" : "Colours of the series" }), sw,
    btn("Reset colours", () => { set((s) => { delete s.colors; }, "chart-color"); rerender(); }, "small", { id: "chartResetColors" }),
    sp.series.length > 1 ? check("Legend", sp.legend !== false, (s, v) => { s.legend = v; }, "chartLegend") : null,
    colorRow("Text colour", sp.textColor || "#1f2937", (v) => set((s) => { s.textColor = v; }, "chart-text"), "chartText"), center,
    ["progress", "progressbar"].includes(sp.kind) ? h("p.st-hint", { text: "Progress uses the first number as a percentage (or the first number out of the second, e.g. Done, 30 then Goal, 40)." }) : null);
}

/* ---------------- element timing (Canva: Show element timing) ---------------- */
/** When the item shows on its page (seconds from the page start) in Present, autoplay, videos and GIFs. */
export function timingSection(l, rerender) {
  const tm = l.timing || {};
  const set = (k) => (v) => { E.updateSel((x) => { const t = { ...(x.timing || {}) }; if (v == null) delete t[k]; else t[k] = v; if (t.end != null && t.start != null && t.end < t.start) t.end = t.start; if (t.start == null && t.end == null) delete x.timing; else x.timing = t; }, "timing", { silent: true }); rerender(); };
  const num = (id, label, val, onSet, ph) => { const i = h("input.ad-input.st-num", { type: "number", id, min: 0, max: 600, step: 0.1, value: val ?? "", placeholder: ph, "aria-label": label + " (seconds)" }); i.addEventListener("change", () => onSet(i.value === "" ? null : Math.max(0, Math.min(600, +i.value)))); return h("label.st-field", {}, h("span", { text: label + " (s)" }), i); };
  return sec("Element timing", h("p.st-hint", { text: "When this item is on screen in Present, autoplay, videos and GIFs. Leave empty to show it all the time." }),
    h("div.st-grid2", {}, num("timingStart", "Appears at", tm.start, set("start"), "0"), num("timingEnd", "Disappears at", tm.end, set("end"), "end")),
    tm.start != null || tm.end != null ? btn("Show all the time", () => { E.updateSel((x) => { delete x.timing; }, "timing", { silent: true }); rerender(); }, "small", { id: "timingClear" }) : null);
}

/* ---------------- crop aspect ratios (Canva: crop to a ratio) ---------------- */
export const CROP_RATIOS = [[1, "1:1"], [4 / 3, "4:3"], [3 / 4, "3:4"], [16 / 9, "16:9"], [9 / 16, "9:16"], [3 / 2, "3:2"], [2 / 3, "2:3"]];
/** Ratio buttons in crop mode: the photo box takes that shape (same area, same centre) and the crop follows. */
export function cropRatios(l) {
  const box = h("div.st-row.st-wrap", { role: "group", "aria-label": "Crop ratio" });
  for (const [r, label] of CROP_RATIOS) box.append(btn(label, () => { E.updateSel((x) => { const orig = JSON.parse(JSON.stringify(x)); const area = x.w * x.h, w = Math.sqrt(area * r), hh = w / r, cx = x.x + x.w / 2, cy = x.y + x.h / 2; Object.assign(x, { w, h: hh, x: cx - w / 2, y: cy - hh / 2 }); const src = x.type === "frame" ? x.frame.image : x.image; if (src) E.refitCrop(src, orig, x); }, "crop-ratio"); }, "small", { "data-ratio": label, title: "Crop to " + label }));
  return h("div.st-field", {}, h("span", { text: "Ratio" }), box);
}

/* ---------------- copy pages from another design (Canva: Projects > Designs > click a page) ---------------- */
/** Lists the other designs on this device; pick pages and they are added after the current page (resized to this size). */
export async function importPagesDialog() {
  closeMenu();
  if (!S.design) return;
  const { listProjects, getProject } = await import("../shared/store.js");
  const list = (await listProjects("studio").catch(() => [])).filter((p) => p.id !== S.projectId).slice(0, 30);
  menu = h("div.st-menu.st-importbox", { id: "importPages", role: "dialog", "aria-label": "Add pages from another design" });
  const head = h("div.st-row", {}, h("b", { text: "Add pages from another design" }), h("button.btn.small.ghost", { type: "button", text: "Close", "aria-label": "Close", on: { click: closeMenu } }));
  const body = h("div.st-importlist");
  menu.append(head, body);
  if (!list.length) body.append(h("p.st-hint", { text: "No other designs on this device yet." }));
  for (const p of list) body.append(h("button.st-importitem", { type: "button", "data-project": p.id, on: { click: () => pickPages(p.id) } }, p.thumb ? h("img", { src: p.thumb, alt: "" }) : h("span.st-noth", { text: "No preview" }), h("span", { text: p.name || "Design" })));
  async function pickPages(id) {
    const rec = await getProject(id);
    if (!rec?.data?.pages?.length) { toast("That design has no pages."); return; }
    body.innerHTML = "";
    const src = rec.data, size = presetPx(src.preset);
    const checks = src.pages.map((pg, i) => { const cb = h("input", { type: "checkbox", checked: true, value: String(i), "aria-label": `Page ${i + 1}` }); body.append(h("label.st-importpage", {}, cb, h("span", { html: pageSvg(src, i, size, { width: 120, idp: "imp" + i }) }), h("small", { text: pg.title || `Page ${i + 1}` }))); return cb; });
    const go = h("button.btn.primary.small", { type: "button", id: "importGo", text: "Add pages", on: { click: () => { const chosen = checks.filter((c) => c.checked).map((c) => +c.value); if (!chosen.length) { toast("Choose at least one page."); return; } addPagesFrom(src, chosen); closeMenu(); } } });
    menu.append(h("div.st-row.st-end", {}, go));
  }
  document.body.append(menu);
  menu.style.left = Math.max(6, innerWidth / 2 - 220) + "px"; menu.style.top = "72px";
  setTimeout(() => document.addEventListener("pointerdown", awayMenu, true));
}
/** Adds pages of another design after the current page. A different size is resized to this design (Magic Resize). */
export function addPagesFrom(src, indexes) {
  let from = src;
  const a = presetPx(src.preset), b = presetPx(S.design.preset);
  if (Math.abs(a.w - b.w) > 0.5 || Math.abs(a.h - b.h) > 0.5) from = magicResize(src, S.design.preset);
  const pages = indexes.map((i) => duplicatePage(from.pages[i])).filter(Boolean);
  S.design.pages.splice(S.page + 1, 0, ...pages);
  commit("import-pages");
  E.goPage(S.page + 1);
  toast(`${pages.length} page${pages.length === 1 ? "" : "s"} added.`);
  return pages.length;
}
