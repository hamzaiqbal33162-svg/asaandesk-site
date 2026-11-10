// Studio panels: tool rail, side panels (templates, elements, text, uploads, brand, background, layers, magic
// tools) and the properties panel for the selection. On phones the rail is a bottom bar and panels are sheets.
import { S, on, emit, commit, curPage, pageSize, selLayers, single, toast, h } from "./state.js";
import * as E from "./editor.js";
import { textLayer, shapeLayer, elementLayer, frameLayer, chartLayer, tableLayer, imageLayer, DEFAULT_FILTERS, walk } from "./model.js";
import { textHeight, fitFontSize, CSS_FAMILY } from "./textlayout.js";
import { listTemplates, templateThumbSvg, TEMPLATE_GROUPS } from "./templates.js";
import { PRESETS, PRESET_GROUPS, sizeLabel, presetPx, isPrint } from "./presets.js";
import { pageSvg, primsMarkup, layerContent } from "./svg.js";
import { shapePrims, coverCrop, elementTokens } from "./shapes.js";
import { FONT_FAMILIES, loadBrand, saveBrand, ensureFont } from "../shared/brand.js";
import { aiText, aiStatus, AiUnavailable } from "../shared/ai.js";
import { applyBrand, applyColorToLayer } from "./brandkit.js";
import { ANIMATION_TYPES, autoAnimate, pageDuration } from "./animate.js";
import { COLLAGE_LAYOUTS, applyCollage, collageRects, fillFrames } from "./collage.js";
import { PRODUCTS, SHIRT_COLORS, renderMockup, productFor } from "./mockup.js";
import { vectorEnv } from "./exporter.js";

const ICON = {
  templates: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  elements: "M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19.1l1-5.8L3.5 9.2l5.9-.9z",
  text: "M5 5h14M12 5v14M9 19h6",
  uploads: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  brand: "M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2zM7.5 12a1 1 0 1 1 0-.01M10 7.5a1 1 0 1 1 0-.01M14.5 7.5a1 1 0 1 1 0-.01",
  background: "M3 5h18v14H3zM3 15l5-5 5 5 3-3 5 5",
  magic: "M5 19L17 7M14 4l1-2 1 2 2 1-2 1-1 2-1-2-2-1zM19 11l.7-1.3L21 9l-1.3-.7L19 7l-.7 1.3L17 9l1.3.7z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
};
const icon = (name, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[name]}"/></svg>`;
export const RAIL = [["templates", "Templates"], ["elements", "Elements"], ["text", "Text"], ["uploads", "Uploads"], ["brand", "Brand"], ["background", "Background"], ["magic", "Magic"], ["layers", "Layers"], ["edit", "Edit"]];
const TITLES = { templates: "Templates", elements: "Elements", text: "Text", uploads: "Uploads", brand: "Brand kit", background: "Background", magic: "Magic tools", layers: "Layers", resize: "Magic Resize", animate: "Magic Animate", translate: "Translate design", mockup: "Mockups", collage: "Photo collage", edit: "Edit" };

let rail, side, sideBody, sideTitle, props, propsBody;
const isPhone = () => window.matchMedia("(max-width: 760px)").matches;

export function initPanels() {
  rail = document.getElementById("rail");
  side = document.getElementById("side");
  sideBody = side.querySelector(".st-side-body");
  sideTitle = side.querySelector(".st-side-title");
  props = document.getElementById("props");
  propsBody = props.querySelector(".st-props-body");
  rail.innerHTML = "";
  for (const [id, label] of RAIL) rail.append(h("button.st-railbtn", { type: "button", "data-panel": id, "aria-label": label, title: label, html: icon(id) + `<span>${label}</span>`, on: { click: () => (id === "edit" ? toggleEdit() : S.panel === id && !isPhone() ? closePanel() : openPanel(id)) } }));
  side.querySelector(".st-side-close").addEventListener("click", closePanel);
  props.querySelector(".st-props-close")?.addEventListener("click", () => props.classList.remove("open"));
  on("selection", () => { renderProps(); if (S.panel === "layers") renderSide(); if (S.panel === "animate") renderSide(); });
  on("layers", () => { if (S.panel === "layers") renderSide(); });
  on("geometry", updateGeometryFields);
  on("uploads", () => { if (S.panel === "uploads") renderSide(); });
  on("pages", () => { renderProps(); if (["layers", "collage"].includes(S.panel)) renderSide(); });
  on("change", () => schedulePagebar());
  on("text", () => {});
  window.addEventListener("asaandesk-brand", () => { if (S.panel === "brand") renderSide(); });
  window.addEventListener("storage", (e) => { if (e.key === "asaandesk-brand-kit" && S.panel === "brand") renderSide(); });
}
export function openPanel(name, opts = {}) {
  S.panel = name;
  S.panelOpts = opts;
  side.hidden = false;
  document.body.classList.add("side-open");
  if (isPhone()) props.classList.remove("open");
  rail.querySelectorAll(".st-railbtn").forEach((b) => b.classList.toggle("on", b.dataset.panel === name || (b.dataset.panel === "magic" && ["resize", "animate", "translate", "mockup", "collage"].includes(name))));
  renderSide();
  emit("panel", name);
}
export function closePanel() {
  if (S.panel === "animate") E.stopPreview();
  S.panel = null;
  side.hidden = true;
  document.body.classList.remove("side-open");
  rail.querySelectorAll(".st-railbtn").forEach((b) => b.classList.remove("on"));
  emit("panel", null);
}
function toggleEdit() { if (isPhone()) { closePanel(); props.classList.toggle("open"); renderProps(); } }

/* ---------------- small controls ---------------- */
const sec = (title, ...kids) => h("section.st-sec", {}, title ? h("h3", { text: title }) : null, ...kids);
const row = (label, ...kids) => h("label.st-row", {}, h("span.st-lab", { text: label }), ...kids);
function slider(label, value, min, max, step, onInput, fmt = (v) => v) {
  const out = h("output", { text: fmt(value) });
  const inp = h("input", { type: "range", min, max, step, value, "aria-label": label });
  inp.addEventListener("input", () => { out.textContent = fmt(+inp.value); onInput(+inp.value); });
  return h("label.st-row.st-slider", {}, h("span.st-lab", { text: label }), inp, out);
}
function numInput(label, value, onChange, { step = 1, min = -1e6, max = 1e6, key } = {}) {
  const inp = h("input.ad-input.st-num", { type: "number", value: Math.round(value * 100) / 100, step, min, max, "aria-label": label, "data-key": key || label });
  inp.addEventListener("change", () => { const v = +inp.value; if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v))); });
  return h("label.st-field", {}, h("span", { text: label }), inp);
}
function colorInput(label, value, onChange, key) {
  const v = value && value !== "none" ? value : "#000000";
  const inp = h("input.st-color", { type: "color", value: v, "aria-label": label, title: label, "data-key": key || label });
  inp.addEventListener("input", () => onChange(inp.value));
  return inp;
}
function seg(options, value, onPick, label) {
  const g = h("div.st-seg", { role: "group", "aria-label": label });
  for (const [v, text, title] of options) g.append(h("button.btn", { type: "button", class: "btn" + (v === value ? " on" : ""), "aria-pressed": String(v === value), title: title || text, "data-v": String(v), html: text, on: { click: () => onPick(v) } }));
  return g;
}
const btn = (text, onClick, cls = "", attrs = {}) => h("button.btn" + (cls ? "." + cls.split(" ").join(".") : ""), { type: "button", html: text, on: { click: onClick }, ...attrs });
const upd = (fn, key) => E.updateSel(fn, key, { silent: true });
function fileButton(text, accept, multiple, onFiles, attrs = {}) {
  const inp = h("input", { type: "file", accept, multiple, hidden: true, ...attrs });
  inp.addEventListener("change", () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ""; });
  const b = btn(text, () => inp.click());
  return h("span.st-filebtn", {}, b, inp);
}

/* ---------------- side panel ---------------- */
export function renderSide() {
  if (!S.panel || !S.design) return;
  sideTitle.textContent = TITLES[S.panel] || "";
  const back = side.querySelector(".st-side-back");
  back.hidden = !["resize", "animate", "translate", "mockup", "collage"].includes(S.panel);
  back.onclick = () => openPanel("magic");
  sideBody.innerHTML = "";
  sideBody.scrollTop = 0;
  const f = { templates: templatesPanel, elements: elementsPanel, text: textPanel, uploads: uploadsPanel, brand: brandPanel, background: backgroundPanel, layers: layersPanel, magic: magicPanel, resize: resizePanel, animate: animatePanel, translate: translatePanel, mockup: mockupPanel, collage: collagePanel }[S.panel];
  if (f) f(sideBody);
}

function templatesPanel(root) {
  const grp = S.panelOpts?.group ?? (S.design.preset.group || "");
  const q = h("input.ad-input.st-search", { type: "search", placeholder: "Search templates", "aria-label": "Search templates", value: S.panelOpts?.query || "" });
  const chips = h("div.st-chips", { role: "group", "aria-label": "Template groups" });
  const grid = h("div.st-tgrid");
  let group = grp;
  const draw = () => {
    chips.innerHTML = "";
    for (const g of [{ id: "", label: "All" }, ...TEMPLATE_GROUPS]) chips.append(btn(g.label, () => { group = g.id; draw(); }, group === g.id ? "chip on" : "chip"));
    grid.innerHTML = "";
    const list = listTemplates({ query: q.value, group });
    if (!list.length) grid.append(h("p.st-empty", { text: "No templates match. Try another word, like sale, eid or card." }));
    for (const t of list) grid.append(templateCard(t, () => emit("open-template", t.id)));
  };
  q.addEventListener("input", draw);
  root.append(q, chips, grid);
  draw();
}
export function templateCard(t, onOpen) {
  const card = h("button.st-tcard", { type: "button", "data-template": t.id, title: t.title, "aria-label": "Open template " + t.title });
  const thumb = h("div.st-tthumb");
  thumb.innerHTML = templateThumbSvg(t, 200);
  card.append(thumb, h("span.st-tname", { text: t.title }), h("span.st-tmeta", { text: PRESETS.find((p) => p.id === t.presetId)?.label + (t.pages > 1 ? ` · ${t.pages} pages` : "") }));
  card.addEventListener("click", onOpen);
  return card;
}

let ELS = null;
const loadElements = () => (ELS ||= import("/pdf-editor/elements.js"));
function elementsPanel(root) {
  const q = h("input.ad-input.st-search", { type: "search", placeholder: "Search shapes, stickers, icons…", "aria-label": "Search elements" });
  const { w, h: H } = pageSize();
  const m = Math.min(w, H);
  const shapes = h("div.st-egrid");
  const SH = [["rect", "Square"], ["rounded", "Rounded square"], ["ellipse", "Circle"], ["triangle", "Triangle"], ["line", "Line"], ["arrow", "Arrow"], ["star", "Star"], ["polygon", "Hexagon"], ["heart", "Heart"]];
  for (const [k, label] of SH) {
    const kind = k === "rounded" ? "rect" : k;
    const s = { kind, fill: "#5b4cf0", stroke: kind === "line" || kind === "arrow" ? "#5b4cf0" : "none", strokeWidth: kind === "line" || kind === "arrow" ? 5 : 0, radius: k === "rounded" ? 10 : 0, sides: 6, points: 5 };
    const b = h("button.st-ebtn", { type: "button", title: label, "aria-label": "Add " + label, "data-shape": k, html: `<svg viewBox="0 0 48 48" width="40" height="40">${primsMarkup(shapePrims(s, 48, kind === "line" || kind === "arrow" ? 48 : 48))}</svg>` });
    b.addEventListener("click", () => {
      const size = m * 0.3;
      const l = shapeLayer(kind, { w: size, h: kind === "line" || kind === "arrow" ? Math.max(24, m * 0.04) : size, fill: S.lastColor || "#5b4cf0", radius: k === "rounded" ? size * 0.18 : 0, strokeWidth: kind === "line" || kind === "arrow" ? Math.max(4, m * 0.008) : 0, name: label });
      E.addLayer(l);
    });
    shapes.append(b);
  }
  const frames = h("div.st-egrid");
  for (const [shape, label] of [["rect", "Square frame"], ["rounded", "Rounded frame"], ["circle", "Circle frame"]]) {
    frames.append(h("button.st-ebtn", { type: "button", title: label, "aria-label": "Add " + label, "data-frame": shape, html: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="${shape === "circle" ? "M4 24a20 20 0 1 0 40 0a20 20 0 1 0 -40 0Z" : shape === "rounded" ? "M12 4h24a8 8 0 0 1 8 8v24a8 8 0 0 1 -8 8h-24a8 8 0 0 1 -8 -8v-24a8 8 0 0 1 8 -8Z" : "M4 4h40v40h-40Z"}" fill="#ecebfb" stroke="#8b80f5" stroke-width="2" stroke-dasharray="4 3"/></svg>`, on: { click: () => E.addLayer(frameLayer({ w: m * 0.4, h: m * 0.4, shape, name: label })) } }));
  }
  const charts = h("div.st-egrid");
  for (const [kind, label] of [["bar", "Bar chart"], ["line", "Line chart"], ["pie", "Pie chart"], ["donut", "Donut chart"]]) {
    charts.append(h("button.st-ebtn.st-wide", { type: "button", "data-chart": kind, text: label, on: { click: async () => { await ensureVector(); E.addLayer(chartLayer({ kind, title: "Sales", labels: ["Jan", "Feb", "Mar", "Apr"], series: [{ name: "Sales", values: [12, 19, 15, 24] }], showValues: true }, { w: m * 0.55, h: m * 0.38, name: label })); } } }));
  }
  charts.append(h("button.st-ebtn.st-wide", { type: "button", "data-table": "1", text: "Table", on: { click: async () => { const v = await ensureVector(); const t = v.tables.newTable(3, 3); const l = tableLayer(t, { w: m * 0.6, size: Math.max(12, m * 0.022) }); l.h = v.tableHeight(l.table, l.w); E.addLayer(l); } } }));
  const stickers = h("div.st-sgrid", { "aria-label": "Stickers" });
  const cats = h("div.st-chips");
  let cat = "all";
  const draw = async () => {
    const mod = await loadElements();
    if (!cats.childElementCount) for (const c of [{ id: "all", label: "All" }, ...mod.CATEGORIES]) cats.append(btn(c.label, () => { cat = c.id; cats.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x.dataset.cat === cat)); draw(); }, c.id === cat ? "chip on" : "chip", { "data-cat": c.id }));
    const list = mod.searchElements(q.value, cat);
    stickers.innerHTML = "";
    if (!list.length) stickers.append(h("p.st-empty", { text: "Nothing found. Try star, arrow, heart or eid." }));
    for (const el of list.slice(0, 240)) {
      const b = h("button.st-sbtn", { type: "button", title: el.name, "aria-label": "Add sticker " + el.name, "data-sticker": el.id, html: mod.elementSvg(el, {}, 44) });
      b.addEventListener("click", () => { const l = elementLayer(el, { w: Math.min(m * 0.32, (m * 0.32 * el.vb[0]) / Math.max(el.vb[0], el.vb[1])) }); E.addLayer(l); });
      stickers.append(b);
    }
  };
  q.addEventListener("input", () => { clearTimeout(q._t); q._t = setTimeout(draw, 120); });
  root.append(q, sec("Shapes", shapes), sec("Photo frames", frames), sec("Charts and tables", charts), sec("Stickers", cats, stickers));
  draw().catch(() => stickers.append(h("p.st-empty", { text: "Stickers could not load. Check your connection." })));
}
export async function ensureVector() {
  const v = await vectorEnv();
  S.env.chartPrims = v.chartPrims; S.env.tablePrims = v.tablePrims; S.env.tableHeight = v.tableHeight;
  return v;
}

function textPanel(root) {
  const { w, h: H } = pageSize(), m = Math.min(w, H);
  const add = (content, o) => {
    const l = textLayer(content, { w: Math.min(w * 0.8, Math.max(o.size * 6, w * 0.5)), ...o });
    l.h = textHeight(l.text, l.w);
    E.addLayer(l);
    E.startEdit(l.id, { selectAll: true });
  };
  const big = (label, o, cls) => h("button.st-textbtn" + (cls ? "." + cls : ""), { type: "button", text: label, style: { fontFamily: CSS_FAMILY[o.family || "sans"], fontWeight: o.bold ? 700 : 400, fontStyle: o.italic ? "italic" : "normal" }, on: { click: () => add(label, o) } });
  root.append(
    big("Add a heading", { size: Math.round(m * 0.075), bold: true, align: "center" }, "h1"),
    big("Add a subheading", { size: Math.round(m * 0.045), bold: true, align: "center" }, "h2"),
    big("Add a little body text", { size: Math.round(m * 0.03), align: "left" }, "h3"),
  );
  const styles = h("div.st-tstyles");
  const S2 = [
    ["SALE", { size: m * 0.12, bold: true, color: "#ff7a59", align: "center", letterSpacing: m * 0.006 }],
    ["Elegant title", { size: m * 0.07, family: "serif", italic: true, color: "#1b2133", align: "center" }],
    ["Outline", { size: m * 0.09, bold: true, color: "#ffffff", align: "center", outline: { width: m * 0.005, color: "#1b2133" } }],
    ["Glow", { size: m * 0.08, bold: true, color: "#ffffff", align: "center", shadow: { x: 0, y: 0, blur: m * 0.03, color: "#5b4cf0", opacity: 0.9 } }],
    ["Label", { size: m * 0.04, bold: true, color: "#ffffff", align: "center", bg: { color: "#5b4cf0", pad: 0.45, radius: 0.5 } }],
    ["Quote", { size: m * 0.05, family: "serif", italic: true, color: "#334155", align: "left", lineHeight: 1.35 }],
  ];
  for (const [label, o] of S2) {
    const sample = h("button.st-tstyle", { type: "button", "aria-label": "Add text style " + label });
    const fam = CSS_FAMILY[o.family || "sans"];
    sample.innerHTML = `<span style="font-family:${fam.replace(/"/g, "'")};font-weight:${o.bold ? 700 : 400};font-style:${o.italic ? "italic" : "normal"};color:${o.color === "#ffffff" ? "#1b2133" : o.color};${o.outline ? "-webkit-text-stroke:1px #1b2133;color:#fff;" : ""}${o.bg ? "background:" + o.bg.color + ";color:#fff;padding:2px 10px;border-radius:999px;" : ""}${o.shadow ? "text-shadow:0 0 8px " + o.shadow.color + ";color:#fff;" : ""}">${label}</span>`;
    sample.addEventListener("click", () => add(label, o));
    styles.append(sample);
  }
  const fonts = h("div.st-fontlist");
  for (const [id, f] of Object.entries(FONT_FAMILIES)) {
    ensureFont(id);
    fonts.append(h("button.st-fontbtn", { type: "button", style: { fontFamily: f.css }, text: f.label, title: "Use " + f.label, on: { click: () => { const ts = selLayers().filter((l) => l.type === "text"); if (!ts.length) { add("Your text here", { size: Math.round(m * 0.05), family: id }); return; } upd((l) => { if (l.type === "text") l.text.family = id; }, "font"); renderProps(); } } }));
  }
  root.append(sec("Text styles", styles), sec("Fonts", fonts));
}

function uploadsPanel(root) {
  const drop = h("div.st-dropzone", { text: "Drop photos here, or paste them (Ctrl+V)" });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("on"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("on"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("on"); E.addImageFiles([...e.dataTransfer.files]); });
  const up = fileButton("Upload photos", "image/*", true, (files) => E.addImageFiles(files), { id: "uploadInput", "aria-label": "Upload photos" });
  up.querySelector("button").classList.add("primary", "st-full");
  const grid = h("div.st-ugrid");
  const seen = new Set();
  const all = [...E.uploads];
  for (const pg of S.design.pages) for (const [l] of walk(pg.layers)) { if (l.type === "image" && !all.some((u) => u.src === l.image.src)) all.push({ src: l.image.src, nw: l.image.nw, nh: l.image.nh }); if (l.type === "frame" && l.frame.image && !all.some((u) => u.src === l.frame.image.src)) all.push(l.frame.image); }
  for (const u of all) {
    if (seen.has(u.src)) continue;
    seen.add(u.src);
    const b = h("button.st-ubtn", { type: "button", draggable: "true", "aria-label": "Add this photo", title: "Click to add, or drag onto a frame" });
    b.append(h("img", { src: E.urlOf(u.src), alt: "" }));
    b.addEventListener("click", () => {
      const sel = single();
      if (sel?.type === "frame") { sel.frame.image = { src: u.src, nw: u.nw, nh: u.nh, crop: coverCrop(u.nw, u.nh, sel.w, sel.h) }; E.renderLayer(sel); commit("photo"); return; }
      const { w, h: H } = pageSize(); const s = Math.min(1, (w * 0.6) / (u.nw || w), (H * 0.6) / (u.nh || H));
      E.addLayer(imageLayer(u.src, { w: (u.nw || w) * s, h: (u.nh || H) * s, nw: u.nw, nh: u.nh, name: "Photo" }));
    });
    b.addEventListener("dragstart", (e) => { e.dataTransfer.setData("application/x-studio-image", u.src); e.dataTransfer.setData("application/x-studio-photo", JSON.stringify({ src: u.src, nw: u.nw, nh: u.nh })); });
    grid.append(b);
  }
  root.append(up, drop, all.length ? sec("Your photos", grid) : h("div.st-emptystate", { html: `<svg width="72" height="56" viewBox="0 0 72 56" aria-hidden="true"><rect x="2" y="2" width="68" height="52" rx="10" fill="#efedff" stroke="#c9c3ff" stroke-width="2"/><path d="M10 46l16-18 12 12 8-8 16 14" fill="none" stroke="#8b80f5" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="18" r="6" fill="#ffb199"/></svg><p>Your photos stay on this device. Add some to start.</p>` }));
}

function brandPanel(root) {
  const b = loadBrand();
  const colors = h("div.st-swatches", { role: "group", "aria-label": "Brand colours" });
  b.colors.forEach((c, i) => {
    const sw = h("button.st-swatch", { type: "button", style: { background: c }, title: "Apply " + c, "aria-label": "Apply brand colour " + c, "data-color": c });
    sw.addEventListener("click", () => applyColor(c));
    const x = h("button.st-swx", { type: "button", "aria-label": "Remove " + c, text: "×", on: { click: () => { b.colors.splice(i, 1); saveBrand(b); } } });
    colors.append(h("span.st-swwrap", {}, sw, x));
  });
  const pick = h("input.st-color", { type: "color", value: "#5b4cf0", "aria-label": "New brand colour" });
  colors.append(h("span.st-swadd", {}, pick, btn("Add", () => { if (!b.colors.includes(pick.value)) { b.colors.push(pick.value); saveBrand(b); } }, "small")));
  const fontSel = (key) => {
    const s = h("select.ad-input", { "aria-label": key === "heading" ? "Heading font" : "Body font" });
    for (const [id, f] of Object.entries(FONT_FAMILIES)) s.append(h("option", { value: id, text: f.label, selected: b.fonts[key] === id }));
    s.addEventListener("change", () => { b.fonts[key] = s.value; saveBrand(b); });
    return s;
  };
  const useFont = (key) => btn(`<span style="font-family:${(FONT_FAMILIES[b.fonts[key]] || FONT_FAMILIES.sans).css.replace(/"/g, "'")}">Aa</span> Use`, () => {
    const ts = selLayers().filter((l) => l.type === "text");
    if (!ts.length) { toast("Select some text first."); return; }
    upd((l) => { if (l.type === "text") l.text.family = b.fonts[key]; }, "brand-font"); renderProps();
  }, "small");
  const logos = h("div.st-ugrid");
  for (const lg of b.logos || []) logos.append(h("button.st-ubtn", { type: "button", "aria-label": "Add logo " + (lg.name || ""), on: { click: async () => { const im = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = lg.src; }); const nw = im?.naturalWidth || 400, nh = im?.naturalHeight || 400; const m = Math.min(pageSize().w, pageSize().h) * 0.25; const s = m / Math.max(nw, nh); E.addLayer(imageLayer(lg.src, { w: nw * s, h: nh * s, nw, nh, name: lg.name || "Logo" })); } } }, h("img", { src: lg.src, alt: lg.name || "Logo" })));
  const addLogo = fileButton("Add a logo", "image/*", false, async ([f]) => { const p = await E.readImageFile(f); b.logos = [...(b.logos || []), { name: f.name.replace(/\.[^.]+$/, ""), src: p.src }]; if (!saveBrand(b)) toast("This logo is too big to keep. Try a smaller file."); });
  const apply = btn("Apply brand to whole design", () => {
    const r = applyBrand(S.design, loadBrand());
    E.renderAll(); commit("brand");
    const n = Object.keys(r.colors).length;
    toast(n || r.fonts ? `Brand applied: ${n} colour${n === 1 ? "" : "s"} and ${r.fonts} text font${r.fonts === 1 ? "" : "s"} changed.` : "Nothing to change: add brand colours first.");
  }, "primary st-full", { id: "applyBrandBtn" });
  root.append(
    h("p.st-hint", { text: `${b.name}: saved in this browser. Click a colour to use it on what you selected (or the page).` }),
    sec("Colours", colors),
    sec("Fonts", row("Headings", fontSel("heading"), useFont("heading")), row("Body text", fontSel("body"), useFont("body"))),
    sec("Logos", logos, addLogo),
    apply,
  );
}
export function applyColor(c) {
  const sel = selLayers();
  S.lastColor = c;
  if (!sel.length) { curPage().background = { color: c }; E.renderPage(); commit("bg"); renderProps(); return; }
  upd((l) => applyColorToLayer(l, c), "color");
  renderProps();
}

const BG_COLORS = ["#ffffff", "#f3f4fb", "#fff7ed", "#fef3c7", "#ecfdf5", "#e0f2fe", "#efedff", "#ffe4e6", "#1b2133", "#1e1b4b", "#5b4cf0", "#ff7a59", "#14b8a6", "#f43f5e", "#f59e0b", "#0ea5e9"];
const GRADS = [["#2f80ff", "#a64bf4", 135], ["#ff7a59", "#f43f5e", 160], ["#14b8a6", "#2f80ff", 120], ["#1e1b4b", "#4338ca", 160], ["#fde68a", "#f59e0b", 180], ["#ecfdf5", "#e0f2fe", 180], ["#fff7ed", "#ffe4e6", 135], ["#0f172a", "#334155", 180]];
function backgroundPanel(root) {
  const pg = curPage();
  const set = (bg) => { curPage().background = bg; E.renderPage(); commit("bg"); renderSide(); };
  const sw = h("div.st-swatches");
  for (const c of BG_COLORS) sw.append(h("button.st-swatch", { type: "button", style: { background: c }, "aria-label": "Background " + c, "data-bg": c, class: "st-swatch" + (pg.background?.color === c ? " on" : ""), on: { click: () => set({ color: c }) } }));
  sw.append(colorInput("Custom background colour", pg.background?.color || "#ffffff", (v) => { curPage().background = { color: v }; E.renderPage(); commit("bg-color"); }, "bgColor"));
  const merch = productFor(S.design.preset);
  if (merch || pg.background?.color === "none") sw.append(h("button.st-swatch.st-none", { type: "button", "aria-label": "No background (transparent)", title: "No background", on: { click: () => set({ color: "none" }) } }));
  const gr = h("div.st-gradients");
  for (const [a, b, ang] of GRADS) gr.append(h("button.st-grad", { type: "button", style: { background: `linear-gradient(${ang}deg, ${a}, ${b})` }, "aria-label": `Gradient ${a} to ${b}`, on: { click: () => set({ gradient: { angle: ang, stops: [a, b] } }) } }));
  const g = pg.background?.gradient;
  const gctl = g ? h("div", {}, row("From", colorInput("Gradient start", g.stops[0], (v) => { g.stops[0] = v; E.renderPage(); commit("grad"); })), row("To", colorInput("Gradient end", g.stops[1], (v) => { g.stops[1] = v; E.renderPage(); commit("grad"); })), slider("Angle", g.angle ?? 135, 0, 360, 5, (v) => { g.angle = v; E.renderPage(); commit("grad-angle"); }, (v) => v + "°")) : null;
  const photo = fileButton("Use a photo", "image/*", false, async ([f]) => { const p = await E.readImageFile(f); E.uploads.unshift(p); set({ image: p.src, fit: "cover", color: "#ffffff" }); });
  const img = pg.background?.image ? h("div.st-row", {}, seg([["cover", "Fill"], ["contain", "Fit"]], pg.background.fit || "cover", (v) => { pg.background.fit = v; E.renderPage(); commit("bg-fit"); renderSide(); }, "Photo fit"), btn("Remove photo", () => set({ color: "#ffffff" }))) : null;
  root.append(sec("Colour", sw), sec("Gradient", gr, gctl), sec("Photo", photo, img), h("p.st-hint", { text: "Tip: with nothing selected, clicking a brand colour also sets the page colour." }));
}

function layersPanel(root) {
  const pg = curPage();
  if (!pg.layers.length) { root.append(h("div.st-emptystate", { html: `<p>This page is empty. Add text, photos or elements and they will be listed here.</p>` })); return; }
  const list = h("ol.st-layers", { "aria-label": "Layers, top first" });
  const items = pg.layers.slice().reverse();
  for (const l of items) {
    const li = h("li.st-layerrow", { class: "st-layerrow" + (S.sel.includes(l.id) ? " on" : "") + (l.hidden ? " hidden" : ""), "data-id": l.id, tabIndex: 0, "aria-selected": String(S.sel.includes(l.id)) });
    const grip = h("span.st-grip", { "aria-hidden": "true", text: "⋮⋮", title: "Drag to reorder" });
    const thumb = h("span.st-lthumb");
    thumb.innerHTML = `<svg viewBox="0 0 ${l.w} ${l.h}" width="34" height="26" preserveAspectRatio="xMidYMid meet" overflow="hidden">${l.type === "text" ? `<rect width="${l.w}" height="${l.h}" fill="#f3f4fb"/><text x="${l.w / 2}" y="${l.h * 0.72}" font-size="${l.h * 0.7}" text-anchor="middle" fill="#1b2133" font-family="Arial">T</text>` : ""}</svg>`;
    if (l.type !== "text") { try { thumb.firstChild.innerHTML = layerContent(l, { ...S.env, idp: "ly" }); } catch {} }
    const name = h("span.st-lname", { text: l.name || l.type, title: "Double-click to rename" });
    name.addEventListener("dblclick", (e) => { e.stopPropagation(); const v = prompt("Layer name", l.name || ""); if (v != null) { l.name = v.slice(0, 40); commit("rename"); renderSide(); } });
    const eye = btn(l.hidden ? "Show" : "Hide", (e) => { e.stopPropagation(); E.toggleHidden(l.id); }, "small ghost", { "aria-label": (l.hidden ? "Show " : "Hide ") + (l.name || l.type) });
    const lock = btn(l.locked ? "Unlock" : "Lock", (e) => { e.stopPropagation(); E.select([l.id]); E.toggleLock(); }, "small ghost", { "aria-label": (l.locked ? "Unlock " : "Lock ") + (l.name || l.type) });
    li.append(grip, thumb, name, eye, lock);
    li.addEventListener("click", (e) => { if (l.hidden) return; E.select(e.shiftKey ? [...S.sel, l.id] : [l.id]); });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); E.select([l.id]); }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); const i = pg.layers.indexOf(l); E.moveLayerTo(l.id, i + (e.key === "ArrowUp" ? 1 : -1)); }
    });
    grip.addEventListener("pointerdown", (e) => startRowDrag(e, li, l, list));
    list.append(li);
  }
  root.append(h("p.st-hint", { text: "Top of the list is in front. Drag ⋮⋮ to change the order (or Alt + ↑/↓)." }), list);
}
function startRowDrag(e, li, l, list) {
  e.preventDefault();
  const rows = [...list.children];
  const y0 = e.clientY;
  li.classList.add("dragging");
  let target = rows.indexOf(li);
  const move = (ev) => {
    li.style.transform = `translateY(${ev.clientY - y0}px)`;
    target = rows.length - 1;
    for (const [i, r] of rows.entries()) { const b = r.getBoundingClientRect(); if (ev.clientY < b.top + b.height / 2) { target = i; break; } }
    rows.forEach((r, i) => r.classList.toggle("drop-before", i === target && r !== li));
  };
  const up = () => {
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    li.style.transform = ""; li.classList.remove("dragging");
    const n = curPage().layers.length, from = rows.indexOf(li);
    if (target !== from && target !== from + 1) {
      // rows are top-first: row index r -> layer index n - 1 - r
      const newTop = target > from ? target - 1 : target;
      E.moveLayerTo(l.id, n - 1 - newTop);
    } else renderSide();
  };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
}

function magicPanel(root) {
  const tools = [
    ["resize", "Magic Resize", "Copy this design to other sizes in one go."],
    ["animate", "Magic Animate", "Add entrance animations and save a video or GIF."],
    ["translate", "Translate", "Translate every text box and keep the layout."],
    ["write", "Magic Write", "Write, rewrite, shorten or fix the selected text."],
    ["mockup", "Mockups", "See your design on a T-shirt, hoodie or mug."],
    ["collage", "Photo collage", "Grids and mosaics for your photos."],
    ["present", "Present", "Show your pages full screen."],
  ];
  for (const [id, title, what] of tools) root.append(h("button.st-magic", { type: "button", "data-magic": id, html: `<strong>${title}</strong><span>${what}</span>`, on: { click: () => { if (id === "present") emit("present"); else if (id === "write") { const t = selLayers().find((l) => l.type === "text") || curPage().layers.find((l) => l.type === "text"); if (!t) { toast("Add or select a text box first."); return; } E.select([t.id]); if (isPhone()) { closePanel(); props.classList.add("open"); } renderProps(); props.querySelector("#mwPrompt")?.focus(); } else openPanel(id); } } }));
}

/* ---------- Magic Resize ---------- */
let resizeResults = [];
function resizePanel(root) {
  const chosen = new Set(S.resizeChoice || []);
  const box = h("div.st-resize-list");
  for (const g of PRESET_GROUPS) {
    const items = PRESETS.filter((p) => p.group === g.id && p.id !== S.design.preset.id);
    if (!items.length) continue;
    box.append(h("h4", { text: g.label }));
    for (const p of items) {
      const cb = h("input", { type: "checkbox", value: p.id, checked: chosen.has(p.id), "data-preset": p.id });
      cb.addEventListener("change", () => { cb.checked ? chosen.add(p.id) : chosen.delete(p.id); S.resizeChoice = [...chosen]; go.disabled = !chosen.size; go.innerHTML = chosen.size ? `Resize to ${chosen.size} size${chosen.size > 1 ? "s" : ""}` : "Choose sizes"; });
      box.append(h("label.st-check", {}, cb, h("span", { text: p.label }), h("small", { text: sizeLabel(p) })));
    }
  }
  const go = btn(chosen.size ? `Resize to ${chosen.size} size${chosen.size > 1 ? "s" : ""}` : "Choose sizes", async () => {
    go.disabled = true;
    try { resizeResults = await emitAsync("resize", [...chosen]); renderSide(); toast(`${resizeResults.length} new design${resizeResults.length > 1 ? "s" : ""} made. Your original is unchanged.`); }
    catch (e) { toast(e.message); }
    go.disabled = false;
  }, "primary st-full", { id: "resizeGo", disabled: !chosen.size });
  const results = h("div.st-results");
  for (const r of resizeResults) {
    const card = h("div.st-result", { "data-project": r.projectId });
    const th = h("div.st-rthumb"); th.innerHTML = pageSvg(r.design, 0, presetPx(r.design.preset), { width: 120, idp: "rz" + r.projectId, urlOf: E.urlOf });
    card.append(th, h("div", {}, h("strong", { text: r.design.preset.label }), h("small", { text: sizeLabel(r.design.preset) }), h("div.st-row", {}, btn("Open", () => emit("open-project", r.projectId), "small"), btn("PNG", () => emit("download-png", r.design), "small"))));
    results.append(card);
  }
  root.append(h("p.st-hint", { text: "Pick the sizes you need. Each copy opens as its own design; text stays readable and everything stays on the page." }), box, go, resizeResults.length ? sec("New designs", results) : null);
}
const emitAsync = (ev, arg) => new Promise((res, rej) => emit(ev, arg, res, rej));

/* ---------- Magic Animate ---------- */
function animatePanel(root) {
  const pg = curPage();
  const l = single();
  const status = h("p.st-status", { id: "animStatus", role: "status" });
  const progress = h("progress.st-progress", { max: 1, value: 0, hidden: true });
  const auto = btn("Auto animate", () => { const m = autoAnimate(curPage(), pageSize()); for (const x of curPage().layers) x.animation = m.get(x.id) || null; commit("animate"); renderSide(); preview(); }, "primary", { id: "autoAnimateBtn" });
  const none = btn("Remove all", () => { for (const x of curPage().layers) x.animation = null; commit("animate"); renderSide(); }, "", { id: "noAnimBtn" });
  const play = btn("▶ Preview", () => preview(), "", { id: "previewAnimBtn" });
  const preview = () => { if (!curPage().layers.some((x) => x.animation)) { toast("Add an animation first (try Auto animate)."); return; } E.playPreview(pageDuration(curPage()), () => {}); };
  const per = h("div");
  if (l) {
    const sel = h("select.ad-input", { "aria-label": "Animation", id: "animType" });
    sel.append(h("option", { value: "", text: "None" }));
    for (const a of ANIMATION_TYPES) sel.append(h("option", { value: a.id, text: a.label, selected: l.animation?.type === a.id }));
    sel.addEventListener("change", () => { l.animation = sel.value ? { type: sel.value, delay: l.animation?.delay ?? 0, duration: l.animation?.duration ?? 0.7 } : null; commit("anim"); renderSide(); });
    per.append(sec("Selected: " + (l.name || l.type), row("Animation", sel), l.animation ? slider("Delay", l.animation.delay, 0, 5, 0.05, (v) => { l.animation.delay = v; commit("anim-delay"); }, (v) => v.toFixed(2) + " s") : null, l.animation ? slider("Duration", l.animation.duration, 0.2, 3, 0.05, (v) => { l.animation.duration = v; commit("anim-dur"); }, (v) => v.toFixed(2) + " s") : null));
  } else per.append(h("p.st-hint", { text: "Select something on the page to choose its animation, or use Auto animate." }));
  const list = h("ul.st-animlist");
  for (const x of pg.layers.slice().reverse()) if (x.animation) list.append(h("li", { text: `${x.name || x.type}: ${ANIMATION_TYPES.find((a) => a.id === x.animation.type)?.label} (${x.animation.delay}s)` }));
  const run = async (kind) => {
    progress.hidden = false; progress.value = 0; status.textContent = kind === "webm" ? "Recording the video in real time…" : "Making the GIF…";
    try {
      const r = await emitAsync("animate-export", { format: kind, page: S.page, onProgress: (v) => { progress.value = v; } });
      status.textContent = kind === "webm" ? `Video saved (${(r.blob.size / 1024).toFixed(0)} KB, ${r.duration.toFixed(1)} s).` : `GIF saved (${(r.blob.size / 1024).toFixed(0)} KB, ${r.frames} frames).`;
    } catch (e) { status.textContent = e.message; }
    progress.hidden = true;
  };
  root.append(
    h("div.st-row", {}, auto, none, play),
    per,
    list.childElementCount ? sec(`On this page (${pageDuration(pg).toFixed(1)} s)`, list) : null,
    sec("Save", h("div.st-row", {}, btn("Save video (WebM)", () => run("webm"), "", { id: "saveWebmBtn" }), btn("Save GIF", () => run("gif"), "", { id: "saveGifBtn" })), progress, status),
  );
}

/* ---------- Translate ---------- */
export const LANGS = [["ur", "Urdu"], ["en", "English"], ["ar", "Arabic"], ["hi", "Hindi"], ["pa", "Punjabi"], ["bn", "Bengali"], ["fr", "French"], ["es", "Spanish"], ["de", "German"], ["tr", "Turkish"], ["zh", "Chinese"], ["ru", "Russian"]];
function translatePanel(root) {
  const lang = h("select.ad-input", { id: "trLang", "aria-label": "Translate to" });
  for (const [v, t] of LANGS) lang.append(h("option", { value: v, text: t }));
  lang.value = S.trLang || "ur";
  lang.addEventListener("change", () => { S.trLang = lang.value; });
  const scope = seg([["page", "This page"], ["all", "All pages"]], S.trScope || "page", (v) => { S.trScope = v; renderSide(); }, "Pages to translate");
  const status = h("p.st-status", { id: "trStatus", role: "status" });
  const go = btn("Translate all text", async () => {
    go.disabled = true; status.textContent = "Checking for AI…";
    try { const n = await translateDesign(lang.value, S.trScope === "all", (m) => { status.textContent = m; }); status.textContent = n ? `Translated ${n} text box${n > 1 ? "es" : ""}. Sizes were adjusted so text stays in its box.` : "There is no text to translate."; }
    catch (e) { status.textContent = e?.message || String(e); status.classList.add("warn"); }
    go.disabled = false;
  }, "primary st-full", { id: "trGo" });
  root.append(row("Language", lang), scope, go, status, h("p.st-hint", { text: "Uses the AI built into your browser when it has it (nothing is uploaded). Each box keeps its place; long translations get a smaller font so they still fit." }));
}
/** Translates text layers; changes nothing unless every box translated. Returns the number changed. */
export async function translateDesign(target, allPages = false, onStatus = () => {}) {
  const pages = allPages ? S.design.pages : [curPage()];
  const texts = [];
  for (const pg of pages) for (const [l] of walk(pg.layers)) if (l.type === "text" && l.text.content.trim()) texts.push(l);
  if (!texts.length) return 0;
  const out = [];
  for (const [i, l] of texts.entries()) {
    onStatus(`Translating ${i + 1} of ${texts.length}…`);
    out.push(await aiText("translate", l.text.content, { target })); // throws AiUnavailable when no AI: nothing changed
  }
  const rtl = ["ur", "ar"].includes(target);
  texts.forEach((l, i) => {
    const maxH = l.h;
    l.text.content = out[i] || l.text.content;
    if (rtl && l.text.align === "left") l.text.align = "right";
    l.text.size = fitFontSize(l.text, l.w, Math.max(maxH, l.text.size * l.text.lineHeight), Math.min(8, l.text.size));
    l.h = textHeight(l.text, l.w);
  });
  E.renderAll(); commit("translate");
  return texts.length;
}

/* ---------- Mockups ---------- */
function mockupPanel(root) {
  S.mock ||= { product: productFor(S.design.preset) || "tshirt", color: "#ffffff", view: "front" };
  const m = S.mock;
  const prod = seg(PRODUCTS.map((p) => [p.id, p.label]), m.product, (v) => { m.product = v; renderSide(); }, "Product");
  const colors = h("div.st-swatches", { role: "group", "aria-label": m.product === "mug" ? "Mug colour" : "Shirt colour" });
  for (const c of SHIRT_COLORS) colors.append(h("button.st-swatch", { type: "button", class: "st-swatch" + (m.color === c.id ? " on" : ""), style: { background: c.id }, title: c.label, "aria-label": c.label, "data-shirt": c.id, on: { click: () => { m.color = c.id; renderSide(); } } }));
  colors.append(colorInput("Custom colour", m.color, (v) => { m.color = v; clearTimeout(colors._t); colors._t = setTimeout(draw, 250); }, "shirtColor"));
  const view = m.product === "mug" ? seg([["left", "Left"], ["front", "Front"], ["right", "Right"]], m.view, (v) => { m.view = v; renderSide(); }, "Mug side") : null;
  const img = h("img.st-mockimg", { alt: "Mockup preview", id: "mockupImg" });
  const status = h("p.st-status", { role: "status", text: "Drawing the mockup…" });
  const dl = btn("Download mockup (PNG)", () => emit("mockup-download", { ...m }), "primary st-full", { id: "mockupDownload" });
  const draw = async () => {
    try {
      const c = await renderMockup(S.design, S.page, { ...m, size: 700, chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims });
      img.src = c.toDataURL("image/png"); status.textContent = "";
      img.dataset.ready = "1";
    } catch (e) { status.textContent = e.message; }
  };
  root.append(prod, sec(m.product === "mug" ? "Mug colour" : "Shirt colour", colors), view, img, status, dl);
  draw();
}

/* ---------- Collage ---------- */
function collagePanel(root) {
  const pg = curPage();
  const st = pg.collage || { layout: "four", gap: 16, radius: 0 };
  const { w, h: H } = pageSize();
  const lays = h("div.st-layouts");
  for (const L of COLLAGE_LAYOUTS) {
    const r = collageRects(L.id, 60, 60 * (H / w), 3);
    const b = h("button.st-layout", { type: "button", class: "st-layout" + (pg.collage?.layout === L.id ? " on" : ""), "aria-label": L.label, title: L.label, "data-layout": L.id, html: `<svg viewBox="0 0 60 ${60 * (H / w)}" width="60" height="${60 * (H / w)}">${r.map((c) => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${st.radius ? 3 : 0}" fill="#c9c3ff"/>`).join("")}</svg>` });
    b.addEventListener("click", () => { applyCollage(curPage(), L.id, w, H, { gap: st.gap, radius: st.radius }); E.renderAll(); commit("collage"); renderSide(); });
    lays.append(b);
  }
  const re = (k) => (v) => { const c = curPage().collage || { layout: "four", gap: 16, radius: 0 }; c[k] = v; applyCollage(curPage(), c.layout, w, H, { gap: c.gap, radius: c.radius }); E.renderAll(); commit("collage-" + k); };
  const add = fileButton("Add photos", "image/*", true, async (files) => {
    const pgc = curPage();
    if (!pgc.layers.some((l) => l.type === "frame")) { applyCollage(pgc, "four", w, H, { gap: st.gap, radius: st.radius }); E.renderAll(); }
    const empty = pgc.layers.filter((l) => l.type === "frame" && !l.frame.image).length;
    const photos = [];
    for (const f of files) { try { photos.push(await E.readImageFile(f)); } catch (e) { toast(e.message); } }
    E.uploads.unshift(...photos);
    const n = fillFrames(pgc, photos);
    E.renderAll(); commit("collage-photos");
    toast(n < photos.length ? `${n} photo${n === 1 ? "" : "s"} added. Pick a layout with more spaces for the rest.` : `${n} photo${n === 1 ? "" : "s"} added.${empty > n ? " Add more to fill the rest." : ""}`);
  }, { id: "collageInput", "aria-label": "Add photos to the collage" });
  add.querySelector("button").classList.add("primary", "st-full");
  root.append(add, sec("Layout", lays), slider("Spacing", st.gap, 0, 60, 1, re("gap"), (v) => v + " px"), slider("Corners", st.radius, 0, 80, 1, re("radius"), (v) => v + " px"), h("p.st-hint", { text: "Photos fill the spaces in order. Drag a photo onto another to swap them. Double-click a photo to move it inside its space." }));
}

/* ---------------- properties panel ---------------- */
export function renderProps() {
  if (!propsBody || !S.design) return;
  const active = document.activeElement;
  if (active && propsBody.contains(active) && active.matches("input[type=range], input[type=color], textarea, input[type=text]")) return; // don't rebuild under the user's hand
  propsBody.innerHTML = "";
  const sel = selLayers();
  props.querySelector(".st-props-title").textContent = !sel.length ? "Page" : sel.length > 1 ? `${sel.length} selected` : ({ text: "Text", image: "Photo", shape: "Shape", element: "Sticker", chart: "Chart", table: "Table", frame: "Photo frame", group: "Group" })[sel[0].type];
  if (!sel.length) return pageProps(propsBody);
  const l = sel.length === 1 ? sel[0] : null;
  if (S.cropping && l) {
    propsBody.append(sec("Crop", slider("Zoom", E.cropZoomOf(l), 1, 4, 0.01, (v) => E.setCropZoom(l, v), (v) => v.toFixed(2) + "×"), h("p.st-hint", { text: "Drag the photo inside its box to choose what shows." }), btn("Done", () => E.endCrop(), "primary st-full", { id: "cropDone" })));
    return;
  }
  if (l?.type === "text") textProps(propsBody, l);
  if (l?.type === "image") imageProps(propsBody, l);
  if (l?.type === "shape") shapeProps(propsBody, l);
  if (l?.type === "element") elementProps(propsBody, l);
  if (l?.type === "frame") frameProps(propsBody, l);
  if (l?.type === "chart") chartProps(propsBody, l);
  if (l?.type === "table") tableProps(propsBody, l);
  if (!l) {
    const texts = sel.filter((x) => x.type === "text");
    if (texts.length) propsBody.append(sec("Text", fontRow(texts[0])));
  }
  arrangeProps(propsBody, sel, l);
}
function pageProps(root) {
  const pg = curPage(), P = S.design.preset;
  root.append(
    sec("Page " + (S.page + 1) + " of " + S.design.pages.length, h("p.st-hint", { text: `${P.label} · ${sizeLabel(P)}${isPrint(P) ? ` · ${P.dpi} dpi` : ""}${P.bleed ? ` · bleed ${Math.round(P.bleed * (P.unit === "in" ? 25.4 : 1) * 10) / 10} mm` : ""}` })),
    sec("Background", h("div.st-row", {}, colorInput("Page colour", pg.background?.color || "#ffffff", (v) => { curPage().background = { color: v }; E.renderPage(); commit("bg-color"); }, "pageColor"), btn("More…", () => openPanel("background"), "small"))),
    sec("Guides", h("label.st-check", {}, h("input", { type: "checkbox", checked: S.showGuides !== false, on: { change: (e) => { S.showGuides = e.target.checked; E.renderAll(); } } }), h("span", { text: "Show bleed, fold and cut lines" }))),
    h("p.st-hint", { text: "Tip: click something on the page to edit it. Drag on empty space to select several things." }),
  );
}
function fontRow(l) {
  const fam = h("select.ad-input", { "aria-label": "Font", id: "fontFamily" });
  for (const [id, f] of Object.entries(FONT_FAMILIES)) fam.append(h("option", { value: id, text: f.label, selected: l.text.family === id }));
  fam.addEventListener("change", () => upd((x) => { if (x.type === "text") x.text.family = fam.value; }, "font"));
  const size = numInput("Size", l.text.size, (v) => upd((x) => { if (x.type === "text") x.text.size = v; }, "size"), { min: 4, max: 2000, step: 1, key: "fontSize" });
  const color = colorInput("Text colour", l.text.color, (v) => upd((x) => { if (x.type === "text") x.text.color = v; }, "tcolor"), "textColor");
  return h("div.st-grid2", {}, h("label.st-field.span2", {}, h("span", { text: "Font" }), fam), size, h("label.st-field", {}, h("span", { text: "Colour" }), color));
}
function textProps(root, l) {
  const t = l.text;
  const styleBtns = seg([["b", "<b>B</b>", "Bold"], ["i", "<i>I</i>", "Italic"], ["u", "<u>U</u>", "Underline"]], null, (v) => { upd((x) => { const k = { b: "bold", i: "italic", u: "underline" }[v]; x.text[k] = !x.text[k]; }, "style"); renderProps(); }, "Text style");
  styleBtns.querySelectorAll("button").forEach((b) => { const on = { b: t.bold, i: t.italic, u: t.underline }[b.dataset.v]; b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", String(!!on)); b.id = "tstyle-" + b.dataset.v; });
  const align = seg([["left", "⯇≡", "Align left"], ["center", "≡", "Centre"], ["right", "≡⯈", "Align right"], ["justify", "☰", "Justify"]], t.align, (v) => { upd((x) => { x.text.align = v; }, "align"); renderProps(); }, "Alignment");
  const fx = h("div");
  const toggle = (label, key, make) => {
    const cb = h("input", { type: "checkbox", checked: !!t[key], "data-fx": key });
    cb.addEventListener("change", () => { upd((x) => { if (cb.checked) x.text[key] = make(x); else delete x.text[key]; }, "fx-" + key); renderProps(); });
    return h("label.st-check", {}, cb, h("span", { text: label }));
  };
  fx.append(toggle("Shadow", "shadow", (x) => ({ x: x.text.size * 0.05, y: x.text.size * 0.08, blur: x.text.size * 0.15, color: "#000000", opacity: 0.4 })));
  if (t.shadow) fx.append(h("div.st-sub", {}, row("Colour", colorInput("Shadow colour", t.shadow.color, (v) => upd((x) => { x.text.shadow.color = v; }, "sh-c"))), slider("Blur", t.shadow.blur, 0, Math.max(40, t.size), 1, (v) => upd((x) => { x.text.shadow.blur = v; }, "sh-b")), slider("Offset", t.shadow.y, -t.size / 2, t.size / 2, 1, (v) => upd((x) => { x.text.shadow.y = v; x.text.shadow.x = v * 0.6; }, "sh-y")), slider("Strength", t.shadow.opacity ?? 0.5, 0, 1, 0.05, (v) => upd((x) => { x.text.shadow.opacity = v; }, "sh-o"))));
  fx.append(toggle("Outline", "outline", (x) => ({ width: Math.max(1, x.text.size * 0.04), color: "#1b2133" })));
  if (t.outline) fx.append(h("div.st-sub", {}, row("Colour", colorInput("Outline colour", t.outline.color, (v) => upd((x) => { x.text.outline.color = v; }, "ol-c"))), slider("Width", t.outline.width, 0.5, Math.max(10, t.size / 6), 0.5, (v) => upd((x) => { x.text.outline.width = v; }, "ol-w"))));
  fx.append(toggle("Background", "bg", () => ({ color: "#fde68a", pad: 0.3, radius: 0.25 })));
  if (t.bg) fx.append(h("div.st-sub", {}, row("Colour", colorInput("Background colour", t.bg.color, (v) => upd((x) => { x.text.bg.color = v; }, "bg-c"))), slider("Roundness", t.bg.radius ?? 0.25, 0, 1, 0.05, (v) => upd((x) => { x.text.bg.radius = v; }, "bg-r"))));
  root.append(
    sec("Text", fontRow(l), h("div.st-row", {}, styleBtns, align),
      slider("Line height", t.lineHeight, 0.8, 2.5, 0.05, (v) => upd((x) => { x.text.lineHeight = v; }, "lh"), (v) => v.toFixed(2)),
      slider("Letter spacing", t.letterSpacing, -t.size * 0.05, t.size * 0.5, 0.5, (v) => upd((x) => { x.text.letterSpacing = v; }, "ls"), (v) => v.toFixed(1)),
      btn(S.editing === l.id ? "Done typing" : "Edit text", () => (S.editing === l.id ? E.endEdit() : E.startEdit(l.id, { selectAll: true })), "small", { id: "editTextBtn" })),
    sec("Effects", fx),
    magicWrite(l),
  );
}
function magicWrite(l) {
  const box = h("section.st-sec.st-mw", { id: "magicWrite" }, h("h3", { text: "Magic Write" }));
  const prompt = h("textarea.ad-input", { id: "mwPrompt", rows: 2, placeholder: "What should it say? e.g. a short line for an Eid sale", "aria-label": "What to write" });
  const status = h("p.st-status", { id: "mwStatus", role: "status" });
  const run = async (task, style) => {
    const before = l.text.content;
    status.classList.remove("warn");
    status.textContent = "Working…";
    try {
      const input = task === "write" ? prompt.value.trim() : before;
      const res = await aiText(task, input, { style, context: task === "write" ? "Text for a design: short, clear, friendly." : "", onStatus: (m) => { status.textContent = m; } });
      if (!res) throw new Error("The AI gave an empty answer. Nothing was changed.");
      if (S.editing === l.id) E.endEdit();
      l.text.content = res; l.h = textHeight(l.text, l.w); l.name = res.split("\n")[0].slice(0, 24);
      E.renderLayer(l); commit("magic-write"); emit("layers");
      status.textContent = "Done. Press Ctrl+Z to undo.";
    } catch (e) {
      status.textContent = e instanceof AiUnavailable || e?.code === "AI_UNAVAILABLE" ? e.message : e?.message || "Something went wrong. Nothing was changed.";
      status.classList.add("warn");
    }
  };
  box.append(prompt, h("div.st-mwgrid", {}, btn("Write", () => run("write"), "", { "data-ai": "write" }), btn("More formal", () => run("rewrite", "formal"), "", { "data-ai": "rewrite", "data-style": "formal" }), btn("More casual", () => run("rewrite", "casual"), "", { "data-ai": "rewrite", "data-style": "casual" }), btn("Shorten", () => run("shorten"), "", { "data-ai": "shorten" }), btn("Fix grammar", () => run("grammar"), "", { "data-ai": "grammar" })), status);
  aiStatus().then((s) => { if (!s.anyText && !status.textContent) status.textContent = "Magic Write needs the AI built into your browser (or AsaanDesk AI, coming soon). Nothing is sent anywhere."; }).catch(() => {});
  return box;
}
function imageProps(root, l) {
  const im = l.image, f = im.filters;
  const fl = (k, label, min, max, step, fmt) => slider(label, f[k], min, max, step, (v) => upd((x) => { x.image.filters[k] = v; }, "f-" + k), fmt);
  const pct = (v) => Math.round(v * 100) + "%";
  const presets = h("div.st-row.st-wrap");
  for (const [name, val] of [["Original", {}], ["Mono", { grayscale: 1 }], ["Warm", { sepia: 0.35, saturate: 1.2 }], ["Vivid", { saturate: 1.6, contrast: 1.1 }], ["Fade", { contrast: 0.85, brightness: 1.1, saturate: 0.8 }], ["Cool", { hue: 190, saturate: 0.9 }]]) presets.append(btn(name, () => { upd((x) => { x.image.filters = { ...DEFAULT_FILTERS, ...val }; }, "filters"); renderProps(); }, "small", { "data-filter": name }));
  const replace = fileButton("Replace", "image/*", false, ([file]) => E.replaceImage(l, file), { "aria-label": "Replace photo" });
  root.append(
    sec("Photo", h("div.st-row.st-wrap", {}, replace, btn(S.cropping === l.id ? "Done" : "Crop", () => E.toggleCrop(l.id), "", { id: "cropBtn" }), btn("Flip ↔", () => upd((x) => { x.image.flipX = !x.image.flipX; }, "flip"), "", { id: "flipX" }), btn("Flip ↕", () => upd((x) => { x.image.flipY = !x.image.flipY; }, "flip"), "", { id: "flipY" })),
      slider("Corner radius", im.radius || 0, 0, Math.min(l.w, l.h) / 2, 1, (v) => upd((x) => { x.image.radius = v; }, "radius"), (v) => Math.round(v) + " px")),
    sec("Filters", presets,
      fl("brightness", "Brightness", 0, 2, 0.01, pct), fl("contrast", "Contrast", 0, 2, 0.01, pct), fl("saturate", "Saturation", 0, 3, 0.01, pct),
      fl("blur", "Blur", 0, 20, 0.5, (v) => v + " px"), fl("grayscale", "Grayscale", 0, 1, 0.01, pct), fl("sepia", "Sepia", 0, 1, 0.01, pct), fl("hue", "Hue", -180, 180, 1, (v) => v + "°")),
  );
}
function shapeProps(root, l) {
  const s = l.shape, line = s.kind === "line" || s.kind === "arrow";
  const kids = [];
  if (!line) kids.push(row("Fill", colorInput("Fill colour", s.fill, (v) => upd((x) => { x.shape.fill = v; }, "fill"), "shapeFill"), btn(s.fill === "none" ? "Add fill" : "No fill", () => { upd((x) => { x.shape.fill = x.shape.fill === "none" ? "#5b4cf0" : "none"; }, "fill"); renderProps(); }, "small")));
  kids.push(row(line ? "Colour" : "Border", colorInput("Border colour", s.stroke !== "none" ? s.stroke : "#1b2133", (v) => upd((x) => { x.shape.stroke = v; if (!x.shape.strokeWidth) x.shape.strokeWidth = 4; }, "stroke"), "shapeStroke")));
  kids.push(slider(line ? "Thickness" : "Border width", s.strokeWidth || 0, 0, Math.max(40, Math.min(l.w, l.h) / 3), 0.5, (v) => upd((x) => { x.shape.strokeWidth = v; if (v && x.shape.stroke === "none") x.shape.stroke = "#1b2133"; }, "sw")));
  if (s.kind === "rect") kids.push(slider("Corner radius", s.radius || 0, 0, Math.min(l.w, l.h) / 2, 1, (v) => upd((x) => { x.shape.radius = v; }, "radius")));
  if (s.kind === "polygon") kids.push(slider("Sides", s.sides || 6, 3, 12, 1, (v) => upd((x) => { x.shape.sides = v; }, "sides")));
  if (s.kind === "star") kids.push(slider("Points", s.points || 5, 3, 12, 1, (v) => upd((x) => { x.shape.points = v; }, "points")));
  root.append(sec("Shape", ...kids));
}
function elementProps(root, l) {
  const toks = elementTokens(l.element);
  const names = { c1: "Main colour", c2: "Second colour", c3: "Light colour" };
  root.append(sec("Sticker colours", ...(toks.length ? toks.map((k) => row(names[k] || k, colorInput(names[k] || k, l.element.colors[k] || "#5b4cf0", (v) => upd((x) => { x.element.colors = { ...x.element.colors, [k]: v }; }, "el-" + k), "el-" + k))) : [h("p.st-hint", { text: "This sticker keeps its own colours." })])));
}
function frameProps(root, l) {
  const f = l.frame;
  const add = fileButton(f.image ? "Replace photo" : "Add photo", "image/*", false, ([file]) => E.addImageFiles([file], { frameId: l.id }), { "aria-label": "Add photo to frame" });
  root.append(sec("Photo frame", seg([["rect", "Square"], ["rounded", "Rounded"], ["circle", "Circle"]], f.shape, (v) => { upd((x) => { x.frame.shape = v; }, "frame"); renderProps(); }, "Frame shape"),
    f.shape !== "circle" ? slider("Corners", f.radius || 0, 0, Math.min(l.w, l.h) / 2, 1, (v) => upd((x) => { x.frame.radius = v; }, "frame-r")) : null,
    h("div.st-row", {}, add, f.image ? btn("Crop", () => E.toggleCrop(l.id), "", { id: "cropBtn" }) : null, f.image ? btn("Remove", () => { upd((x) => { x.frame.image = null; }, "frame-img"); renderProps(); }, "small") : null),
    row("Border", colorInput("Border colour", f.border?.color || "#ffffff", (v) => upd((x) => { x.frame.border = { color: v, width: x.frame.border?.width || 6 }; }, "fb-c"))),
    slider("Border width", f.border?.width || 0, 0, 40, 1, (v) => upd((x) => { x.frame.border = { color: x.frame.border?.color || "#ffffff", width: v }; }, "fb-w"))));
}
function chartProps(root, l) {
  const sp = l.chart.spec;
  const kind = seg([["bar", "Bar"], ["line", "Line"], ["pie", "Pie"], ["donut", "Donut"]], sp.kind, (v) => { upd((x) => { x.chart.spec.kind = v; }, "chart"); renderProps(); }, "Chart type");
  const title = h("input.ad-input", { type: "text", value: sp.title || "", "aria-label": "Chart title" });
  title.addEventListener("input", () => upd((x) => { x.chart.spec.title = title.value; }, "chart-title"));
  const data = h("textarea.ad-input", { rows: 6, "aria-label": "Chart data", value: sp.labels.map((lb, i) => [lb, ...sp.series.map((s) => s.values[i])].join(", ")).join("\n") });
  const err = h("p.st-status");
  data.addEventListener("input", async () => { try { const v = await ensureVector(); const d = v.charts.parseChartData(data.value); err.textContent = ""; upd((x) => { x.chart.spec.labels = d.labels; x.chart.spec.series = d.series; }, "chart-data"); } catch (e) { err.textContent = e.message; } });
  const vals = h("label.st-check", {}, h("input", { type: "checkbox", checked: sp.showValues !== false, on: { change: (e) => upd((x) => { x.chart.spec.showValues = e.target.checked; }, "chart") } }), h("span", { text: "Show values" }));
  root.append(sec("Chart", kind, row("Title", title), h("label.st-field", {}, h("span", { text: "Data (one row per line: label, number)" }), data), err, vals));
}
function tableProps(root, l) {
  const t = l.table;
  const data = h("textarea.ad-input", { rows: 6, "aria-label": "Table cells", value: t.cells.map((r) => r.join(" | ")).join("\n") });
  data.addEventListener("input", async () => {
    const v = await ensureVector();
    const rows = data.value.split("\n").map((r) => r.split("|").map((c) => c.trim()));
    const cols = Math.max(1, ...rows.map((r) => r.length));
    upd((x) => { x.table.cells = rows.map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? "")); if (x.table.colW.length !== cols) { x.table.colW = Array.from({ length: cols }, () => 1 / cols); x.table.align = Array.from({ length: cols }, () => "left"); } x.h = v.tableHeight(x.table, x.w); }, "table");
  });
  root.append(sec("Table", h("label.st-field", {}, h("span", { text: "Cells (one row per line, columns split by |)" }), data),
    row("Header colour", colorInput("Header colour", t.headerFill || "#5b4cf0", (v) => upd((x) => { x.table.headerFill = v; }, "th"))),
    slider("Text size", t.size || 16, 8, 72, 1, async (v) => { const vv = await ensureVector(); upd((x) => { x.table.size = v; x.h = vv.tableHeight(x.table, x.w); }, "tsize"); })));
}
function arrangeProps(root, sel, l) {
  const geo = h("div.st-grid2", { id: "geoFields" });
  if (l) {
    const set = (k) => (v) => { upd((x) => { x[k] = v; if (k === "w" && x.type === "text") x.h = textHeight(x.text, x.w); }, "geo-" + k); };
    geo.append(numInput("X", l.x, set("x"), { key: "x" }), numInput("Y", l.y, set("y"), { key: "y" }), numInput("W", l.w, set("w"), { min: 1, key: "w" }), numInput("H", l.h, set("h"), { min: 1, key: "h" }), numInput("Rotate", l.rotation || 0, set("rotation"), { min: -360, max: 360, key: "rotation" }));
  }
  const op = slider("Opacity", (sel[0].opacity ?? 1) * 100, 0, 100, 1, (v) => upd((x) => { x.opacity = v / 100; }, "opacity"), (v) => Math.round(v) + "%");
  const order = h("div.st-row.st-wrap", {}, btn("Forward", () => E.arrange("forward"), "small", { id: "fwdBtn" }), btn("Backward", () => E.arrange("backward"), "small", { id: "bwdBtn" }), btn("To front", () => E.arrange("front"), "small"), btn("To back", () => E.arrange("back"), "small"));
  const align = h("div.st-alignbar", { role: "group", "aria-label": "Align" });
  for (const [m, t, title] of [["left", "⇤", "Align left"], ["center", "↔", "Align centre"], ["right", "⇥", "Align right"], ["top", "⤒", "Align top"], ["middle", "↕", "Align middle"], ["bottom", "⤓", "Align bottom"]]) align.append(btn(t, () => E.alignSel(m), "small icon", { title, "aria-label": title, "data-align": m }));
  if (sel.length > 2) { align.append(btn("⋯", () => E.distributeSel("x"), "small icon", { title: "Space evenly across", "aria-label": "Space evenly across", "data-distribute": "x" }), btn("⋮", () => E.distributeSel("y"), "small icon", { title: "Space evenly down", "aria-label": "Space evenly down", "data-distribute": "y" })); }
  const acts = h("div.st-row.st-wrap", {},
    sel.length > 1 ? btn("Group", () => E.groupSel(), "small", { id: "groupBtn" }) : null,
    l?.type === "group" ? btn("Ungroup", () => E.ungroupSel(), "small", { id: "ungroupBtn" }) : null,
    btn(sel.every((x) => x.locked) ? "Unlock" : "Lock", () => E.toggleLock(), "small", { id: "lockBtn" }),
    btn("Duplicate", () => E.duplicateSel(), "small", { id: "dupBtn" }),
    btn("Delete", () => E.deleteSel(), "small danger", { id: "delBtn" }));
  root.append(sec("Position", l ? geo : null, op, h("h4", { text: sel.length > 1 ? "Align to each other" : "Align to page" }), align, h("h4", { text: "Order" }), order), sec(null, acts));
}
function updateGeometryFields() {
  const l = single();
  const box = propsBody?.querySelector("#geoFields");
  if (!l || !box) return;
  for (const k of ["x", "y", "w", "h", "rotation"]) { const inp = box.querySelector(`[data-key="${k}"]`); if (inp && document.activeElement !== inp) inp.value = Math.round((l[k] || 0) * 100) / 100; }
}

/* ---------------- page bar ---------------- */
let pbTimer = 0;
export function schedulePagebar() { clearTimeout(pbTimer); pbTimer = setTimeout(renderPagebar, 350); }
export function renderPagebar() {
  const bar = document.getElementById("pagebar");
  if (!bar || !S.design) return;
  const list = bar.querySelector(".st-pthumbs");
  list.innerHTML = "";
  const size = presetPx(S.design.preset);
  S.design.pages.forEach((pg, i) => {
    const b = h("button.st-pthumb", { type: "button", class: "st-pthumb" + (i === S.page ? " on" : ""), "aria-label": `Page ${i + 1}`, "aria-current": i === S.page ? "page" : null, "data-page": i, draggable: "true" });
    const w = 64, hh = Math.max(24, Math.min(90, (w * size.h) / size.w));
    b.innerHTML = `<span class="st-pnum">${i + 1}</span>` + pageSvg(S.design, i, size, { width: Math.min(w, (hh * size.w) / size.h), idp: "pb" + i, urlOf: E.urlOf, chartPrims: S.env.chartPrims, tablePrims: S.env.tablePrims });
    b.addEventListener("click", () => E.goPage(i));
    b.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/x-page", String(i)));
    b.addEventListener("dragover", (e) => e.preventDefault());
    b.addEventListener("drop", (e) => { e.preventDefault(); const from = +e.dataTransfer.getData("text/x-page"); if (Number.isFinite(from)) E.movePage(from, i); });
    list.append(b);
  });
  bar.querySelector("[data-act=del]").disabled = S.design.pages.length < 2;
  bar.querySelector("[data-act=left]").disabled = S.page === 0;
  bar.querySelector("[data-act=right]").disabled = S.page >= S.design.pages.length - 1;
  bar.querySelector(".st-pinfo").textContent = `Page ${S.page + 1} / ${S.design.pages.length}`;
}
export { isPhone };
