// AsaanDesk Studio: floating context toolbar (the white pill above the canvas). Its buttons change with
// the selection: text (font, size −/+, colour, B I U, align, list, spacing, effects, animate, position),
// shapes (fill, border, transparency), photos (crop, filters, flip), stickers (colours), charts/tables, page.
import { S, on, emit, commit, curPage, single, selLayers, h } from "./state.js";
import * as E from "./editor.js";
import { FONT_FAMILIES } from "../shared/brand.js";
import { elementTokens } from "./shapes.js";
import { renderGarment } from "./garment.js";
import * as P3 from "./panels3.js";
import { TRANSITIONS, transitionSeconds } from "./present.js";
import { listKind, cycleList } from "./textfx.js";

let bar = null, pop = null, hooks = {};
const I = {
  comment: "M4 5h16v11H9l-5 4zM12 8v5M9.5 10.5h5", minus: "M5 12h14", plus: "M12 5v14M5 12h14",
  left: "M4 6h16M4 10h10M4 14h16M4 18h10", center: "M4 6h16M7 10h10M4 14h16M7 18h10", right: "M4 6h16M10 10h10M4 14h16M10 18h10", justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01", spacing: "M4 4v16M20 4v16M8 12h8M10 9l-2 3 2 3M14 9l2 3-2 3",
  crop: "M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14", flip: "M12 3v18M8 7l-4 5 4 5M16 7l4 5-4 5",
  copy: "M8 8h12v12H8zM4 16V4h12", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3", lock: "M6 11h12v9H6zM8 11V7a4 4 0 0 1 8 0v4", more: "M5 12h.01M12 12h.01M19 12h.01",
  transp: "M4 4h16v16H4zM4 4l16 16M12 4v16", border: "M4 4h16v16H4z", roller: "M5 4h12v5H5zM17 6.5h2v5h-7v3M11 14.5h2v6h-2z", tidy: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", position: "M4 7h10M4 12h16M4 17h7M18 5v4M16 7h4",
};
const svg = (n) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[n]}"/></svg>`;
const sep = () => h("span.st-cx-sep", { "aria-hidden": "true" });
const b = (id, html, title, onClick, extra = {}) => h("button.st-cx-btn", { type: "button", id, title, "aria-label": title, html, on: { click: onClick }, ...extra });
const upd = (fn, key) => E.updateSel(fn, key, { silent: true });

function colorBtn(id, value, title, onInput) {
  const v = value && value !== "none" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  const inp = h("input", { type: "color", value: v, "aria-label": title, id: id + "Input" });
  inp.addEventListener("input", () => { onInput(inp.value); sw.style.setProperty("--c", inp.value); });
  const sw = h("label.st-cx-color", { id, title, style: { "--c": v } }, h("span.st-cx-sw", { "aria-hidden": "true" }), inp);
  return sw;
}
function sliderRow(label, value, min, max, step, onInput, fmt = (v) => v, id) {
  const out = h("output", { text: fmt(value) });
  const inp = h("input", { type: "range", min, max, step, value, "aria-label": label, id });
  inp.addEventListener("input", () => { out.textContent = fmt(+inp.value); onInput(+inp.value); });
  return h("label.st-cx-row", {}, h("span", { text: label }), inp, out);
}
function openPop(anchor, ...kids) {
  closePop();
  pop = h("div.st-cx-pop", { role: "dialog", "aria-label": anchor.title || "Options" }, ...kids);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left)) + "px";
  pop.style.top = r.bottom + 8 + "px";
  setTimeout(() => document.addEventListener("pointerdown", outside, true), 0);
}
function outside(e) { if (pop && !pop.contains(e.target) && !e.target.closest?.(".st-cx-btn")) closePop(); }
export function closePop() { pop?.remove(); pop = null; document.removeEventListener("pointerdown", outside, true); }

function textTools(l) {
  const t = l.text;
  const font = h("select.st-cx-font", { id: "ctxFont", "aria-label": "Font", title: "Font" });
  for (const [id, f] of Object.entries(FONT_FAMILIES)) font.append(h("option", { value: id, text: f.label.replace(/ \(.*\)/, ""), selected: t.family === id }));
  font.addEventListener("change", () => { upd((x) => { if (x.type === "text") x.text.family = font.value; }, "font"); E.renderAll(); });
  const size = h("input.st-cx-size", { type: "number", id: "ctxSize", min: 4, max: 2000, value: Math.round(t.size), "aria-label": "Font size", title: "Font size" });
  const setSize = (v) => { v = Math.max(4, Math.min(2000, Math.round(v))); size.value = v; upd((x) => { if (x.type === "text") x.text.size = v; }, "size"); };
  size.addEventListener("change", () => setSize(+size.value || t.size));
  size.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); setSize(+size.value || t.size); } });
  const step = (d) => { const cur = +size.value || t.size; setSize(cur + d * Math.max(1, Math.round(cur * 0.08))); };
  const style = (k, label, html, id) => { const btn = b(id, html, label, () => { upd((x) => { if (x.type === "text") x.text[k] = !x.text[k]; }, "style"); btn.classList.toggle("on"); btn.setAttribute("aria-pressed", String(btn.classList.contains("on"))); }, { "aria-pressed": String(!!t[k]) }); btn.classList.toggle("on", !!t[k]); return btn; };
  const aligns = ["left", "center", "right", "justify"];
  const align = b("ctxAlign", svg(t.align || "left"), "Alignment", () => { const cur = single()?.text?.align || "left"; const nx = aligns[(aligns.indexOf(cur) + 1) % aligns.length]; upd((x) => { if (x.type === "text") x.text.align = nx; }, "align"); align.innerHTML = svg(nx); });
  const lk = listKind(t.content);
  const list = b("ctxList", svg("list"), lk === "number" ? "Numbered list (click: no list)" : lk === "bullet" ? "Bulleted list (click: numbered)" : "List", () => { upd((x) => { if (x.type === "text") x.text.content = cycleList(x.text.content); }, "list"); renderCtx(); }, { "aria-pressed": String(lk !== "none"), "data-list": lk });
  list.classList.toggle("on", lk !== "none");
  const spacing = b("ctxSpacing", svg("spacing"), "Spacing", () => openPop(spacing,
    sliderRow("Letter spacing", t.letterSpacing || 0, -t.size * 0.05, t.size * 0.5, 0.5, (v) => upd((x) => { if (x.type === "text") x.text.letterSpacing = v; }, "ls"), (v) => v.toFixed(1), "ctxLetter"),
    sliderRow("Line spacing", t.lineHeight || 1.2, 0.5, 2.5, 0.05, (v) => upd((x) => { if (x.type === "text") x.text.lineHeight = v; }, "lh"), (v) => v.toFixed(2), "ctxLine")));
  return [font, h("span.st-cx-sizegrp", {}, b("ctxSizeDown", svg("minus"), "Decrease font size", () => step(-1)), size, b("ctxSizeUp", svg("plus"), "Increase font size", () => step(1))),
    colorBtn("ctxColor", t.color, "Text colour", (v) => upd((x) => { if (x.type === "text") x.text.color = v; }, "tcolor")),
    style("bold", "Bold", "<b>B</b>", "ctxBold"), style("italic", "Italic", "<i>I</i>", "ctxItalic"), style("underline", "Underline", "<u>U</u>", "ctxUnderline"), style("strike", "Strikethrough", "<s>S</s>", "ctxStrike"), style("upper", "Uppercase", "aA", "ctxCase"),
    align, list, spacing, sep(), b("ctxEffects", "Effects", "Effects", () => hooks.props?.("effects"), { class: "st-cx-btn st-cx-txt" })];
}
function transparency(l) {
  const btn = b("ctxTransp", svg("transp"), "Transparency", () => openPop(btn, sliderRow("Transparency", Math.round((l.opacity ?? 1) * 100), 0, 100, 1, (v) => upd((x) => { x.opacity = v / 100; }, "opacity"), (v) => v + "%", "ctxOpacity")));
  return btn;
}
function shapeTools(l) {
  const s = l.shape, line = s.kind === "line" || s.kind === "arrow";
  const out = [];
  if (!line) out.push(colorBtn("ctxFill", s.fill, "Fill colour", (v) => upd((x) => { if (x.type === "shape") x.shape.fill = v; }, "fill")));
  const border = b("ctxBorder", svg("border"), line ? "Line style" : "Border", () => openPop(border,
    h("label.st-cx-row", {}, h("span", { text: "Colour" }), colorBtn("ctxStroke", s.stroke !== "none" ? s.stroke : "#1b2133", "Border colour", (v) => upd((x) => { if (x.type === "shape") { x.shape.stroke = v; if (!x.shape.strokeWidth) x.shape.strokeWidth = 4; } }, "stroke"))),
    sliderRow(line ? "Thickness" : "Border width", s.strokeWidth || 0, 0, Math.max(40, Math.min(l.w, l.h) / 3), 0.5, (v) => upd((x) => { if (x.type === "shape") { x.shape.strokeWidth = v; if (v && x.shape.stroke === "none") x.shape.stroke = "#1b2133"; } }, "sw"), (v) => v, "ctxStrokeW"),
    s.kind === "rect" ? sliderRow("Corner rounding", s.radius || 0, 0, Math.min(l.w, l.h) / 2, 1, (v) => upd((x) => { if (x.type === "shape") x.shape.radius = v; }, "radius"), (v) => Math.round(v), "ctxRadius") : null));
  out.push(border, transparency(l));
  return out;
}
/** Flip menu (Canva: Flip horizontal / Flip vertical) for photos and graphics. */
function flipBtn(kind) {
  const btn = b("ctxFlip", svg("flip"), "Flip", () => openPop(btn,
    h("button.st-cx-btn.st-cx-txt", { type: "button", id: "ctxFlipH", text: "Flip horizontal", on: { click: () => { upd((x) => { const o = x.type === "image" ? x.image : x.type === "element" ? x.element : null; if (o) o.flipX = !o.flipX; }, "flip"); closePop(); } } }),
    h("button.st-cx-btn.st-cx-txt", { type: "button", id: "ctxFlipV", text: "Flip vertical", on: { click: () => { upd((x) => { const o = x.type === "image" ? x.image : x.type === "element" ? x.element : null; if (o) o.flipY = !o.flipY; }, "flip"); closePop(); } } })));
  btn.dataset.kind = kind;
  return btn;
}
/** Lock menu (Canva): Lock / Lock position only / Unlock. */
function lockBtn(sel) {
  const l = sel[0], state = !l.locked ? "none" : l.lockMode === "position" ? "position" : "full";
  const label = state === "none" ? "Lock" : state === "position" ? "Position locked" : "Locked";
  const btn = b("ctxLock", svg("lock"), label, () => {
    const item = (mode, text, hint) => h("button.st-cx-btn.st-cx-txt.st-cx-menuitem", { type: "button", "data-lock": mode, class: "st-cx-btn st-cx-txt st-cx-menuitem" + (mode === state ? " on" : ""), html: `<b>${text}</b><small>${hint}</small>`, on: { click: () => { closePop(); P3.lockSelection(mode); } } });
    openPop(btn, item("full", "Lock", "Position, style and content"), item("position", "Lock position only", "The text or photo can still change"), item("none", "Unlock", "Move, resize and edit freely"), h("p.st-cx-hint", { text: "Alt+Shift+L switches between them." }));
  }, { class: "st-cx-btn" + (state !== "none" ? " on" : ""), "data-lockstate": state });
  return btn;
}
// Canva's photo toolbar: Edit (effects, filters, adjust), Replace, Crop, Flip, transparency.
function replaceBtn(onFile) {
  return b("ctxReplace", "Replace", "Replace with another photo", () => {
    const inp = h("input", { type: "file", accept: "image/*", hidden: true });
    inp.addEventListener("change", () => { const f = inp.files?.[0]; inp.remove(); if (f) onFile(f); });
    document.body.append(inp); inp.click();
  }, { class: "st-cx-btn st-cx-txt" });
}
function imageTools(l) {
  return [b("ctxFilters", "Edit", "Edit photo: effects, filters and adjust", () => hooks.props?.("filters"), { class: "st-cx-btn st-cx-txt" }),
    replaceBtn((f) => E.replaceImage(l, f)),
    b("cropBtnCx", svg("crop") + "<span>Crop</span>", "Crop", () => E.toggleCrop(l.id), { class: "st-cx-btn st-cx-txt" }),
    flipBtn("image"), transparency(l)];
}
function elementTools(l) {
  const toks = elementTokens(l.element);
  return [...toks.map((k, i) => colorBtn("ctxEl" + i, l.element.colors[k] || "#5b4cf0", "Colour " + (i + 1), (v) => upd((x) => { if (x.type === "element") x.element.colors = { ...x.element.colors, [k]: v }; }, "el-" + k))), flipBtn("element"), transparency(l)];
}
function pageTools() {
  const pg = curPage();
  return [colorBtn("ctxPageColor", pg.background?.color || "#ffffff", "Background colour", (v) => { curPage().background = { color: v }; E.renderPage(); commit("bg-color"); }),
    b("ctxBackground", "Background", "Background", () => hooks.panel?.("background"), { class: "st-cx-btn st-cx-txt" }),
    b("ctxPageAnimate", "Animate", "Animate", () => hooks.panel?.("animate"), { class: "st-cx-btn st-cx-txt" }),
    transitionBtn(), timingBtn(),
    b("ctxHidePage", pg.hidden ? "Show page" : "Hide page", pg.hidden ? "Show this page when presenting" : "Skip this page when presenting", () => { curPage().hidden = !curPage().hidden; commit("hide-page"); emit("pages"); }, { class: "st-cx-btn st-cx-txt" + (pg.hidden ? " on" : "") }),
    h("span.st-cx-info", { text: `Page ${S.page + 1} of ${S.design.pages.length}${pg.hidden ? " · hidden" : ""}` })];
}
const DIRS = [["left", "From the right"], ["right", "From the left"], ["up", "From below"], ["down", "From above"]];
/** Canva page transitions: style, duration (0.1 to 2.5 s), direction, Apply to all pages. */
function transitionBtn() {
  const btn = b("ctxTransition", "Transition", "Page transition", () => {
    const pg = curPage();
    const sel = h("select", { id: "ctxTransitionSel", "aria-label": "Transition" });
    for (const [v, l] of TRANSITIONS) sel.append(h("option", { value: v, text: l, selected: (pg.transition || "none") === v }));
    const dur = h("input", { type: "number", id: "ctxTransitionDur", min: 0.1, max: 2.5, step: 0.1, value: transitionSeconds(pg), "aria-label": "Transition duration in seconds" });
    const dir = h("select", { id: "ctxTransitionDir", "aria-label": "Direction" });
    for (const [v, l] of DIRS) dir.append(h("option", { value: v, text: l, selected: (pg.transitionDir || "left") === v }));
    const dirRow = h("label.st-cx-row", {}, h("span", { text: "Direction" }), dir);
    const sync = () => { dirRow.hidden = !["slide", "wipe", "stack"].includes(sel.value); };
    const save = (p) => { p.transition = sel.value; p.transitionDur = Math.max(0.1, Math.min(2.5, +dur.value || 0.45)); if (["slide", "wipe", "stack"].includes(sel.value)) p.transitionDir = dir.value; else delete p.transitionDir; };
    sel.addEventListener("change", () => { save(curPage()); sync(); commit("transition"); });
    dur.addEventListener("change", () => { save(curPage()); commit("transition"); });
    dir.addEventListener("change", () => { save(curPage()); commit("transition"); });
    const all = h("button.st-cx-btn.st-cx-txt", { type: "button", id: "ctxTransitionAll", text: "Apply to all pages", on: { click: () => { for (const p of S.design.pages) save(p); commit("transition"); closePop(); } } });
    sync();
    openPop(btn, h("label.st-cx-row", {}, h("span", { text: "Transition" }), sel), h("label.st-cx-row", {}, h("span", { text: "Duration (s)" }), dur), dirRow, all);
  }, { class: "st-cx-btn st-cx-txt" });
  return btn;
}
function timingBtn() {
  const btn = b("ctxTiming", "Timing", "Page timing (autoplay and video)", () => {
    const inp = h("input", { type: "number", id: "ctxDuration", min: 1, max: 60, step: 0.5, value: curPage().duration || 5, "aria-label": "Seconds on this page" });
    inp.addEventListener("change", () => { curPage().duration = Math.max(1, Math.min(60, +inp.value || 5)); commit("duration"); });
    const all = h("button.st-cx-btn.st-cx-txt", { type: "button", id: "ctxDurationAll", text: "Apply to all pages", on: { click: () => { const v = Math.max(1, Math.min(60, +inp.value || 5)); for (const p of S.design.pages) p.duration = v; commit("duration"); closePop(); } } });
    openPop(btn, h("label.st-cx-row", {}, h("span", { text: "Seconds" }), inp), all);
  }, { class: "st-cx-btn st-cx-txt" });
  return btn;
}

/** Rebuilds the pill for the current selection. */
export function renderCtx() {
  try { renderGarment(); } catch {} // T-shirt / hoodie card (colour + size guide)
  if (!bar || !S.design) return;
  closePop();
  const active = document.activeElement;
  if (active && bar.contains(active) && active.matches("input[type=number]")) return;
  bar.innerHTML = "";
  const sel = selLayers(), l = single();
  bar.dataset.kind = !sel.length ? "page" : l ? l.type : "multi";
  let items = [];
  if (!sel.length) items = pageTools();
  else if (l?.type === "text") items = textTools(l);
  else if (l?.type === "shape") items = shapeTools(l);
  else if (l?.type === "image") items = imageTools(l);
  else if (l?.type === "element") items = elementTools(l);
  else if (l?.type === "frame") items = [b("ctxFrame", l.frame.image ? "Crop" : "Add photo", l.frame.image ? "Crop" : "Add photo", () => (l.frame.image ? E.toggleCrop(l.id) : hooks.props?.("frame")), { class: "st-cx-btn st-cx-txt" }), transparency(l)];
  else if (l?.type === "chart" || l?.type === "table") items = [b("ctxData", "Edit data", "Edit data", () => hooks.props?.("data"), { class: "st-cx-btn st-cx-txt" }), transparency(l)];
  else if (sel.length > 1) items = [b("ctxGroup", "Group", "Group", () => E.groupSel(), { class: "st-cx-btn st-cx-txt" }), b("ctxTidy", svg("tidy") + "<span>Tidy up</span>", "Tidy up: equal gaps in a row, column or grid", () => P3.tidySelection(), { class: "st-cx-btn st-cx-txt" }), transparency(sel[0])];
  else if (l?.type === "group") items = [b("ctxUngroup", "Ungroup", "Ungroup", () => E.ungroupSel(), { class: "st-cx-btn st-cx-txt" }), transparency(l)];
  if (l?.type === "frame" && l.frame?.image) items.splice(1, 0, replaceBtn((f) => E.addImageFiles([f], { frameId: l.id })));
  bar.append(...items);
  if (sel.length) {
    bar.append(sep(), b("ctxAnimate", "Animate", "Animate", () => hooks.panel?.("animate"), { class: "st-cx-btn st-cx-txt" }),
      b("ctxPosition", svg("position") + "<span>Position</span>", "Position", () => hooks.props?.("position"), { class: "st-cx-btn st-cx-txt" }), sep(),
      b("ctxDup", svg("copy"), "Duplicate", () => E.duplicateSel()), lockBtn(sel), b("ctxCopyStyle", svg("roller"), "Copy style (Ctrl+Alt+C, then click another item)", () => { if (P3.startCopyStyle()) bar.querySelector("#ctxCopyStyle")?.classList.add("on"); }, { class: "st-cx-btn" + (S.paintStyle ? " on" : "") }), b("ctxDelete", svg("trash"), "Delete", () => E.deleteSel()));
  }
  // Canva: comment on the selected item (or the page) right from the toolbar.
  bar.append(b("ctxComment", svg("comment"), "Comment", () => { const it = l || sel[0]; emit("comment", it ? { id: it.id, label: `Page ${S.page + 1}: ${it.name || it.type}` } : { id: curPage().id, label: `Page ${S.page + 1}` }); }));
  bar.append(b("ctxMore", svg("more"), "More options", () => hooks.props?.("all")));
}
/** Creates the toolbar element. hooks: { props(section), panel(name) }. */
export function createCtxBar(opts = {}) {
  hooks = opts;
  bar = h("div.st-ctxbar", { id: "ctxbar", role: "toolbar", "aria-label": "Edit selection" });
  bar.addEventListener("pointerdown", (e) => e.stopPropagation());
  on("selection", renderCtx);
  on("pages", renderCtx);
  on("opened", renderCtx);
  return bar;
}
export const ctxEl = () => bar;
