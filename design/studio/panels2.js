// AsaanDesk Studio: more side panels (ROUND 2): Styles (palettes + font pairs), Layouts (slide layouts),
// Magic deck (slides from an outline), Rulers and guides, Print (proofing, print options, print-ready PDF,
// print sheet), QR code and barcode, Caption and hashtags (social posts).
import { S, emit, commit, curPage, pageSize, selLayers, toast, h } from "./state.js";
import * as E from "./editor.js";
import { textLayer, shapeLayer, frameLayer, elementLayer, newPage, clone } from "./model.js";
import { textHeight } from "./textlayout.js";
import { mainColors } from "./brandkit.js";
import { palette, PALETTE_COUNT, FONTS, recolor, refont } from "./gallery.js";
import { qrElement, barcodeElement, vcard, proofDesign, safeMargin, printSheet, zipFiles } from "./extras.js";
import { exportPdf, exportRaster, download, fileBase } from "./exporter.js";
import { isPrint, presetPx, toPx } from "./presets.js";
import { aiText, AiUnavailable } from "../shared/ai.js";

const sec = (title, ...kids) => h("section.st-sec", {}, title ? h("h3", { text: title }) : null, ...kids);
const btn = (text, onClick, cls = "", attrs = {}) => h("button.btn" + (cls ? "." + cls.split(" ").join(".") : ""), { type: "button", html: text, on: { click: onClick }, ...attrs });
const done = (key) => { E.renderAll(); commit(key); emit("pages"); emit("layers"); };

/* ---------------- Styles: own palettes and font pairs for the whole design ---------------- */
const STYLE_PALETTES = [1, 13, 26, 39, 49, 62, 75, 86, 97, 110, 121, 134, 146, 158, 171, 182, 193, 206, 218, 229, 6, 18, 33, 57].filter((q) => q < PALETTE_COUNT);
export function stylesPanel(root) {
  const pals = h("div.st-palettes", { role: "group", "aria-label": "Colour palettes" });
  for (const q of STYLE_PALETTES) {
    const p = palette(q);
    const sw = p.hues.map((hh, i) => `<i style="background:hsl(${hh} ${i ? 60 : 70}% ${[42, 55, 72][i]}%)"></i>`).join("");
    pals.append(h("button.st-palette", { type: "button", "data-palette": q, title: p.name, "aria-label": "Use palette " + p.name, html: sw + `<span>${p.name}</span>`, on: { click: () => { recolor(S.design, p); done("style-palette"); toast(`Palette "${p.name}" applied. Press Ctrl+Z to undo.`); } } }));
  }
  const fonts = h("div.st-fontpairs");
  const LABEL = { modern: "Modern (Calibri + Cambria)", classic: "Classic (serif headings)", elegant: "Elegant (all serif)", clean: "Clean (all sans)", editorial: "Editorial (Cambria + Calibri)" };
  for (const f of FONTS.slice(1)) fonts.append(btn(LABEL[f.name] || f.name, () => { refont(S.design, f); done("style-font"); toast("Fonts changed. Press Ctrl+Z to undo."); }, "st-fontpair", { "data-fontpair": f.id }));
  root.append(h("p.st-hint", { text: "Restyle the whole design in one click: every page takes the new colours or fonts, and the layout stays the same." }),
    sec("Colour palettes", pals, btn("Shuffle colours", () => { const q = 1 + Math.floor(Math.random() * (PALETTE_COUNT - 1)); recolor(S.design, palette(q)); done("style-palette"); toast(`Palette "${palette(q).name}" applied.`); }, "small", { id: "styleShuffle" })),
    sec("Font pairs", fonts));
}

/* ---------------- Layouts: one-click slide layouts ---------------- */
function look() {
  const pg = curPage(), cols = mainColors({ pages: [pg] });
  const texts = pg.layers.filter((l) => l.type === "text");
  const ink = texts[0]?.text.color || (pg.background?.color && /^#[0-3]/.test(pg.background.color) ? "#ffffff" : "#1b2133");
  return { accent: cols.find((c) => c !== ink) || "#5b4cf0", ink, muted: ink === "#ffffff" ? "#cbd5e1" : "#5b6478", soft: ink === "#ffffff" ? "rgba(255,255,255,.12)" : "#efedff", head: texts[0]?.text.family || "sans", body: texts[1]?.text.family || texts[0]?.text.family || "sans" };
}
function T(content, x, y, w, o) { const l = textLayer(content, { x, y, w, ...o }); l.h = textHeight(l.text, l.w); return l; }
const LAYOUTS = [
  ["title", "Title", (W, H, k, s) => [T("Presentation title", W * 0.1, H * 0.34, W * 0.8, { size: 96 * k, bold: true, family: s.head, color: s.ink, align: "center" }), T("A short subtitle that sets the scene", W * 0.15, H * 0.55, W * 0.7, { size: 36 * k, family: s.body, color: s.muted, align: "center" }), shapeLayer("rect", { x: W / 2 - 60 * k, y: H * 0.5, w: 120 * k, h: 8 * k, fill: s.accent, name: "Accent line" })]],
  ["title-text", "Title and text", (W, H, k, s) => [T("Slide heading", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, family: s.head, color: s.ink }), T("Write your main point here. Keep it short: one idea per slide works best, with a few supporting lines.", W * 0.07, H * 0.3, W * 0.7, { size: 34 * k, family: s.body, color: s.muted, lineHeight: 1.45 })]],
  ["two-cols", "Two columns", (W, H, k, s) => [T("Compare two ideas", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, family: s.head, color: s.ink }), shapeLayer("rect", { x: W * 0.07, y: H * 0.3, w: W * 0.4, h: 8 * k, fill: s.accent }), shapeLayer("rect", { x: W * 0.53, y: H * 0.3, w: W * 0.4, h: 8 * k, fill: s.accent }), T("First column\nPoints for the first side of the story.", W * 0.07, H * 0.35, W * 0.4, { size: 32 * k, family: s.body, color: s.muted, lineHeight: 1.4 }), T("Second column\nPoints for the other side.", W * 0.53, H * 0.35, W * 0.4, { size: 32 * k, family: s.body, color: s.muted, lineHeight: 1.4 })]],
  ["section", "Section header", (W, H, k, s) => [shapeLayer("rect", { x: 0, y: 0, w: W * 0.36, h: H, fill: s.accent, name: "Section band" }), T("01", W * 0.06, H * 0.36, W * 0.26, { size: 160 * k, bold: true, family: s.head, color: "#ffffff" }), T("Section title", W * 0.42, H * 0.4, W * 0.5, { size: 80 * k, bold: true, family: s.head, color: s.ink })]],
  ["quote", "Quote", (W, H, k, s) => [T("“", W * 0.08, H * 0.12, W * 0.2, { size: 260 * k, bold: true, family: "serif", color: s.accent, lineHeight: 1 }), T("A short quote that people will remember.", W * 0.14, H * 0.36, W * 0.72, { size: 64 * k, italic: true, family: "serif", color: s.ink, lineHeight: 1.25 }), T("— Name, role", W * 0.14, H * 0.72, W * 0.6, { size: 30 * k, bold: true, family: s.body, color: s.muted })]],
  ["big-number", "Big number", (W, H, k, s) => [T("87%", W * 0.08, H * 0.2, W * 0.5, { size: 240 * k, bold: true, family: s.head, color: s.accent, lineHeight: 1 }), T("of customers come back within a month", W * 0.08, H * 0.6, W * 0.5, { size: 40 * k, family: s.body, color: s.ink }), T("Source: your own data", W * 0.08, H * 0.82, W * 0.5, { size: 22 * k, family: s.body, color: s.muted })]],
  ["image-text", "Image and text", (W, H, k, s) => [frameLayer({ x: 0, y: 0, w: W * 0.46, h: H, shape: "rect", name: "Photo" }), T("Picture this", W * 0.52, H * 0.22, W * 0.4, { size: 72 * k, bold: true, family: s.head, color: s.ink }), T("Drop a photo into the frame and tell its story in two or three lines.", W * 0.52, H * 0.42, W * 0.4, { size: 32 * k, family: s.body, color: s.muted, lineHeight: 1.45 })]],
  ["timeline", "Timeline", (W, H, k, s) => [T("Timeline", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, family: s.head, color: s.ink }), shapeLayer("rect", { x: W * 0.07, y: H * 0.5, w: W * 0.86, h: 6 * k, fill: s.accent, name: "Line" }), ...["Q1", "Q2", "Q3", "Q4"].flatMap((q, i) => [shapeLayer("ellipse", { x: W * (0.1 + i * 0.22), y: H * 0.5 - 22 * k, w: 50 * k, h: 50 * k, fill: s.accent, name: "Milestone" }), T(q, W * (0.06 + i * 0.22), H * 0.58, W * 0.18, { size: 36 * k, bold: true, family: s.head, color: s.ink }), T("Milestone", W * (0.06 + i * 0.22), H * 0.66, W * 0.18, { size: 26 * k, family: s.body, color: s.muted })])]],
  ["team", "Team", (W, H, k, s) => [T("Meet the team", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, family: s.head, color: s.ink, align: "center" }), ...[0, 1, 2].flatMap((i) => [frameLayer({ x: W * (0.17 + i * 0.25), y: H * 0.3, w: W * 0.16, h: W * 0.16, shape: "circle", name: "Photo" }), T(["Name One", "Name Two", "Name Three"][i], W * (0.13 + i * 0.25), H * 0.3 + W * 0.17, W * 0.24, { size: 32 * k, bold: true, family: s.head, color: s.ink, align: "center" }), T("Role", W * (0.13 + i * 0.25), H * 0.3 + W * 0.2, W * 0.24, { size: 24 * k, family: s.body, color: s.muted, align: "center" })])]],
  ["agenda", "Agenda", (W, H, k, s) => [T("Agenda", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, family: s.head, color: s.ink }), ...["Welcome", "Where we are", "What comes next", "Questions"].flatMap((t, i) => [shapeLayer("ellipse", { x: W * 0.07, y: H * (0.3 + i * 0.15), w: 64 * k, h: 64 * k, fill: s.accent, name: "Number dot" }), T(String(i + 1), W * 0.07, H * (0.3 + i * 0.15) + 14 * k, 64 * k, { size: 28 * k, bold: true, family: s.body, color: "#ffffff", align: "center" }), T(t, W * 0.07 + 90 * k, H * (0.3 + i * 0.15) + 8 * k, W * 0.7, { size: 36 * k, family: s.body, color: s.ink })])]],
  ["chart", "Chart", (W, H, k, s) => [T("Results", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, family: s.head, color: s.ink }), shapeLayer("rect", { x: W * 0.07, y: H * 0.82, w: W * 0.5, h: 3 * k, fill: s.muted, name: "Axis" }), ...[0.35, 0.55, 0.45, 0.75].flatMap((v, i) => [shapeLayer("rect", { x: W * (0.1 + i * 0.12), y: H * (0.82 - v * 0.5), w: W * 0.07, h: H * v * 0.5, fill: i === 3 ? s.accent : s.muted, radius: 8 * k, name: "Bar" }), T(["Q1", "Q2", "Q3", "Q4"][i], W * (0.09 + i * 0.12), H * 0.84, W * 0.09, { size: 24 * k, family: s.body, color: s.muted, align: "center" })]), T("Q4 was our best quarter: say why in one line.", W * 0.62, H * 0.4, W * 0.31, { size: 32 * k, family: s.body, color: s.ink, lineHeight: 1.4 })]],
  ["thanks", "Thank you", (W, H, k, s) => [T("Thank you", W * 0.1, H * 0.3, W * 0.8, { size: 120 * k, bold: true, family: s.head, color: s.ink, align: "center" }), T("Questions? hello@example.com", W * 0.15, H * 0.56, W * 0.7, { size: 36 * k, family: s.body, color: s.muted, align: "center" })]],
];
export function layoutLayers(id, W, H, s = look()) { const L = LAYOUTS.find((x) => x[0] === id); const k = Math.min(W / 1920, H / 1080); return L ? L[2](W, H, k, s) : []; }
function applyLayout(id) {
  const { w: W, h: H } = pageSize(), s = look();
  const layers = layoutLayers(id, W, H, s);
  if (curPage().layers.length) {
    const pg = newPage(clone(curPage().background));
    pg.layers = layers;
    S.design.pages.splice(S.page + 1, 0, pg);
    S.page += 1;
  } else curPage().layers.push(...layers);
  S.sel = [];
  done("layout");
  toast(curPage().layers.length === layers.length ? "Layout added. Click any text to change it." : "Layout added on a new page.");
}
export function layoutsPanel(root) {
  const grid = h("div.st-layouts");
  const { w: W, h: H } = pageSize();
  for (const [id, label] of LAYOUTS) {
    const ls = layoutLayers(id, W, H, { accent: "#5b4cf0", ink: "#1b2133", muted: "#94a3b8", soft: "#efedff", head: "sans", body: "sans" });
    const pv = ls.map((l) => { const x = (l.x / W) * 100, y = (l.y / H) * 100, w = (l.w / W) * 100, hh = (l.h / H) * 100; const fill = l.type === "shape" ? l.shape.fill : l.type === "frame" ? "#dfe3ee" : l.text.size > 50 * Math.min(W / 1920, H / 1080) ? "#1b2133" : "#94a3b8"; return `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(1.5, l.type === "text" ? Math.min(hh, 6) : hh)}" rx="${l.type === "frame" && l.frame.shape === "circle" ? Math.min(w, hh) / 2 : 0.8}" fill="${fill}"/>`; }).join("");
    grid.append(h("button.st-layout", { type: "button", "data-layout": id, title: label, "aria-label": "Add layout " + label, html: `<svg viewBox="0 0 100 ${(100 * H) / W}" width="100%">${pv}</svg><span>${label}</span>`, on: { click: () => applyLayout(id) } }));
  }
  root.append(h("p.st-hint", { text: "Pick a layout: an empty page takes it, otherwise it's added as a new page after this one. Colours and fonts follow your page." }), grid);
}

/* ---------------- Magic deck: slides from an outline (AI writes the outline when available) ---------------- */
export function outlineToPages(text, W, H, bg = { color: "#ffffff" }) {
  const lines = String(text || "").split(/\n/).map((x) => x.replace(/\s+$/, "")).filter((x) => x.trim());
  if (!lines.length) return [];
  const title = lines[0].replace(/^#+\s*/, "").trim();
  const sections = [];
  for (const raw of lines.slice(1)) {
    const bullet = /^\s*([-*•]|\d+[.)])\s+/.test(raw) || /^\s{2,}/.test(raw);
    const t = raw.replace(/^\s*([-*•]|\d+[.)])\s+/, "").replace(/^#+\s*/, "").trim();
    if (!bullet || !sections.length) sections.push({ head: t, points: [] }); else sections[sections.length - 1].points.push(t);
  }
  const s = { accent: "#5b4cf0", ink: bg.color && /^#[0-3]/.test(bg.color) ? "#ffffff" : "#1b2133", muted: "#5b6478", soft: "#efedff", head: "sans", body: "sans" };
  const k = Math.min(W / 1920, H / 1080), out = [];
  const pageOf = (layers, notes = "") => { const p = newPage(clone(bg)); p.layers = layers; p.notes = notes; return p; };
  const tl = layoutLayers("title", W, H, s); tl[0].text.content = title; tl[0].h = textHeight(tl[0].text, tl[0].w); tl[1].text.content = sections.length ? `${sections.length} parts · ${sections.map((x) => x.head).slice(0, 3).join(", ")}` : "";
  out.push(pageOf(tl, `Introduce: ${title}.`));
  if (sections.length > 1) {
    const ag = [T("Agenda", W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, color: s.ink })];
    sections.slice(0, 6).forEach((x, i) => ag.push(T(`${i + 1}.  ${x.head}`, W * 0.09, H * (0.28 + i * 0.1), W * 0.8, { size: 36 * k, color: s.ink })));
    out.push(pageOf(ag, "Walk through the agenda."));
  }
  for (const x of sections) {
    const body = x.points.length ? x.points.map((p) => "• " + p).join("\n") : "Add your points here.";
    out.push(pageOf([T(x.head, W * 0.07, H * 0.1, W * 0.86, { size: 64 * k, bold: true, color: s.ink }), shapeLayer("rect", { x: W * 0.07, y: H * 0.24, w: 120 * k, h: 8 * k, fill: s.accent, name: "Accent line" }), T(body, W * 0.07, H * 0.3, W * 0.8, { size: 34 * k, color: s.muted, lineHeight: 1.5 })], x.points.join(". ")));
  }
  out.push(pageOf(layoutLayers("thanks", W, H, s), "Thank people and take questions."));
  return out;
}
export function deckgenPanel(root) {
  const topic = h("input.ad-input", { type: "text", id: "deckTopic", placeholder: "Topic, e.g. Our new delivery service", "aria-label": "Topic" });
  const ta = h("textarea.ad-input", { id: "deckOutline", rows: 10, "aria-label": "Outline", placeholder: "Title on the first line\nSection heading\n- point\n- point\nNext section\n- point" });
  const status = h("p.st-status", { role: "status", id: "deckStatus" });
  const ai = btn("Write the outline with AI", async () => {
    status.textContent = "Writing…"; status.classList.remove("warn");
    try {
      const r = await aiText("write", `Outline for a short presentation about: ${topic.value || "my topic"}. First line: the title. Then 4 section headings, each followed by 2 or 3 lines starting with "- ". Plain text only.`, { context: "Presentation outline", onStatus: (m) => { status.textContent = m; } });
      ta.value = String(r || "").trim(); status.textContent = "Outline ready. Edit it, then make the slides.";
    } catch (e) { status.textContent = e instanceof AiUnavailable || e?.code === "AI_UNAVAILABLE" ? e.message : e?.message || "The AI could not write an outline. Write it yourself in the box."; status.classList.add("warn"); }
  }, "small", { id: "deckAi" });
  const make = btn("Make slides", () => {
    const text = ta.value.trim() || (topic.value.trim() ? `${topic.value.trim()}\nWhy it matters\n- The problem\n- Who it helps\nHow it works\n- Step one\n- Step two\nNext steps\n- What we need\n- When` : "");
    if (!text) { status.textContent = "Write a topic or an outline first."; status.classList.add("warn"); return; }
    const { w: W, h: H } = pageSize();
    const pages = outlineToPages(text, W, H, clone(curPage().background || { color: "#ffffff" }));
    const empty = S.design.pages.length === 1 && !curPage().layers.length;
    if (empty) S.design.pages.splice(0, 1, ...pages); else S.design.pages.splice(S.page + 1, 0, ...pages);
    S.page = empty ? 0 : S.page + 1; S.sel = [];
    done("deckgen");
    status.textContent = `${pages.length} slides made. Restyle them with Styles or Templates.`; status.classList.remove("warn");
  }, "primary st-full", { id: "deckMake" });
  root.append(h("p.st-hint", { text: "Type a topic and an outline (or let the browser's built-in AI write one), then make the slides: title, agenda, one slide per section and a thank-you slide, with speaker notes." }), topic, ai, ta, make, status);
}

/* ---------------- Rulers and guides ---------------- */
export function guidesPanel(root) {
  const v = (S.design.view ||= { rulers: false, margins: false, danger: false, lines: [] });
  const check = (label, key, on, set) => { const cb = h("input", { type: "checkbox", checked: on, "data-guide": key }); cb.addEventListener("change", () => { set(cb.checked); E.renderAll(); commit("view"); }); return h("label.st-check", {}, cb, h("span", { text: label })); };
  const { w: W, h: H } = pageSize();
  const add = (lines) => { v.lines = [...(v.lines || []), ...lines]; E.renderAll(); commit("guides"); renderCount(); };
  const count = h("p.st-hint", { id: "guideCount" });
  const renderCount = () => { count.textContent = `${(v.lines || []).length} guide${(v.lines || []).length === 1 ? "" : "s"} on the page.`; };
  const cols = (n) => Array.from({ length: n - 1 }, (_, i) => ({ axis: "x", at: (W * (i + 1)) / n }));
  root.append(
    sec("Show", check("Rulers", "rulers", !!v.rulers, (x) => { v.rulers = x; }), check("Margins (safe area)", "margins", !!v.margins, (x) => { v.margins = x; }), check("Print bleed, folds and cut lines", "bleed", S.showGuides !== false, (x) => { S.showGuides = x; }), check("Danger zone (may be cut off)", "danger", !!v.danger, (x) => { v.danger = x; })),
    sec("Add guides", h("div.st-row.st-wrap", {}, btn("12 columns", () => add(cols(12)), "small", { "data-addguide": "12" }), btn("3 columns", () => add(cols(3)), "small", { "data-addguide": "3" }), btn("3 × 3 grid", () => add([...cols(3), ...Array.from({ length: 2 }, (_, i) => ({ axis: "y", at: (H * (i + 1)) / 3 }))]), "small", { "data-addguide": "3x3" }), btn("Vertical guide", () => add([{ axis: "x", at: W / 2 }]), "small", { "data-addguide": "v" }), btn("Horizontal guide", () => add([{ axis: "y", at: H / 2 }]), "small", { "data-addguide": "h" })),
      h("label.st-field", {}, h("span", { text: "Guide at (px from the left)" }), (() => { const inp = h("input.ad-input", { type: "number", min: 0, max: Math.round(W), id: "guideAt", "aria-label": "Custom vertical guide position" }); inp.addEventListener("change", () => { if (+inp.value >= 0) add([{ axis: "x", at: +inp.value }]); }); return inp; })()),
      count, btn("Clear guides", () => { if (v.lockGuides) { toast("Guides are locked. Untick Lock guides first."); return; } v.lines = []; E.renderAll(); commit("guides"); renderCount(); }, "small", { id: "guideClear", disabled: !!v.lockGuides }),
      check("Lock guides (they can't be moved or cleared)", "lock", !!v.lockGuides, (x) => { v.lockGuides = x; E.renderAll(); const c = root.querySelector("#guideClear"); if (c) c.disabled = x; })), // redraw now: locked guides lose their drag handles
    h("p.st-hint", { text: "Drag a guide to move it; drag it off the page to remove it. Guides help you line things up and don't show in downloads." }));
  renderCount();
}

/* ---------------- Print: proofing, options, print-ready PDF and print sheet ---------------- */
export function printPanel(root, { reopen } = {}) {
  const P = S.design.preset, pr = (S.design.print ||= { paper: "matte", finish: "matte", corners: "square", sides: "both", quantity: 100 });
  const issues = proofDesign(S.design);
  const list = h("div.st-proof", { id: "proofList" });
  if (!issues.length) list.append(h("p.st-ok", { id: "proofOk", text: "No problems found. Your design is ready to print." }));
  for (const is of issues) {
    const row = h("div.st-proofrow", { "data-kind": is.kind }, h("span", { text: `Page ${is.page + 1}: ${is.msg}` }));
    if (is.fix) row.append(btn("Fix", () => { is.fix(); done("proof-fix"); reopen?.(); }, "small", { "data-fix": is.kind }));
    list.append(row);
  }
  const fixable = issues.filter((x) => x.fix);
  // Fixes can uncover new ones (bigger text reaching the edge), so run the check a few times.
  const fixAll = fixable.length ? btn(`Fix all (${fixable.length})`, () => { for (let k = 0; k < 4; k++) { const xs = proofDesign(S.design).filter((x) => x.fix); if (!xs.length) break; for (const x of xs) x.fix(); } done("proof-fix"); reopen?.(); toast("Fixed. Check the pages once more before printing."); }, "primary small", { id: "proofFixAll" }) : null;
  const sel = (label, key, opts, after) => { const s = h("select.ad-input", { "aria-label": label, "data-print": key }); for (const [v, t] of opts) s.append(h("option", { value: v, text: t, selected: pr[key] === v })); s.addEventListener("change", () => { pr[key] = s.value; commit("print"); after?.(); }); return h("label.st-field", {}, h("span", { text: label }), s); };
  const qty = h("input.ad-input", { type: "number", min: 1, max: 100000, value: pr.quantity, "aria-label": "Quantity", "data-print": "quantity" });
  qty.addEventListener("change", () => { pr.quantity = Math.max(1, Math.round(+qty.value || 1)); commit("print"); });
  const status = h("p.st-status", { role: "status", id: "printStatus" });
  const pdf = btn("Download print-ready PDF", async () => {
    status.textContent = "Making the PDF…";
    try {
      const pages = pr.sides === "front" ? [0] : S.design.pages.map((_, i) => i);
      const bytes = await exportPdf(S.design, { pages, bleed: !!P.bleed, marks: isPrint(P), dpi: P.dpi });
      download(new Blob([bytes], { type: "application/pdf" }), fileBase(S.design) + "-print.pdf");
      status.textContent = "Done: PDF with bleed and crop marks. Take it to any print shop or print at home.";
    } catch (e) { status.textContent = e.message || String(e); }
  }, "primary st-full", { id: "printPdf" });
  const sheet = (paper) => btn(`Print sheet (${paper === "a4" ? "A4" : "Letter"})`, async () => {
    status.textContent = "Placing copies on the sheet…";
    try {
      const r = await printSheet(S.design, S.page, { paper });
      const bytes = await exportPdf(r.design, { dpi: 300 });
      download(new Blob([bytes], { type: "application/pdf" }), `${fileBase(S.design)}-sheet-${paper}.pdf`);
      status.textContent = `Done: ${r.count} copies (${r.cols} × ${r.rows}) on one ${paper === "a4" ? "A4" : "Letter"} page, ready for home printing.`;
    } catch (e) { status.textContent = e.message || String(e); }
  }, "small", { "data-sheet": paper });
  const { w, h: hh } = presetPx(P);
  root.append(
    sec("Print check", h("p.st-hint", { text: `Checks text near the edge (safe area ${Math.round(safeMargin(P) / 96 * 25.4 * 10) / 10} mm), small text, edges that need bleed and low-resolution photos.` }), list, fixAll),
    sec("Print options", sel("Paper", "paper", [["matte", "Standard matte"], ["premium", "Premium matte (heavier)"], ["gloss", "Gloss (shine preview on the page)"], ["uncoated", "Uncoated recycled"]], () => E.renderAll()), sel("Print effect", "effect", [["none", "None"], ["foil", "Gold foil on text (preview)"], ["raised", "Raised gloss on text (preview)"]], () => E.renderAll()), sel("Corners", "corners", [["square", "Square"], ["rounded", "Rounded (preview on the page)"]], () => E.renderAll()), sel("Sides", "sides", [["both", "Both sides (all pages)"], ["front", "Front only"]]), h("label.st-field", {}, h("span", { text: "Quantity (for your print shop)" }), qty),
      h("p.st-hint", { text: `${P.label}: ${Math.round((w / 96) * 254) / 10} × ${Math.round((hh / 96) * 254) / 10} cm${P.bleed ? ", with bleed" : ""}. AsaanDesk doesn't print or ship: download the PDF and take it to any print shop.` })),
    sec("Download", pdf, h("div.st-row.st-wrap", {}, sheet("letter"), sheet("a4")), status));
}

/* ---------------- QR code and barcode ---------------- */
export function qrPanel(root) {
  const m = Math.min(pageSize().w, pageSize().h);
  const url = h("input.ad-input", { type: "text", id: "qrText", value: "https://asaandesk.com", "aria-label": "Link or text for the QR code" });
  const f = (label, key) => h("input.ad-input", { type: "text", "data-vcard": key, placeholder: label, "aria-label": label });
  const vc = [f("Full name", "name"), f("Company", "org"), f("Job title", "title"), f("Phone", "phone"), f("Email", "email"), f("Website", "url")];
  const addEl = (el, w) => { const sel = selLayers()[0]; if (sel?.type === "element" && sel.element.id === el.id) { E.updateSel((l) => { l.element.vb = el.vb; l.element.parts = el.parts; l.element.qr = el.qr; l.element.barcode = el.barcode; l.h = l.w * el.vb[1] / el.vb[0]; }, "qr"); toast("Updated."); return; } E.addLayer(elementLayer(el, { w, name: el.name })); };
  const add = btn("Add QR code", () => addEl(qrElement(url.value), m * 0.3), "primary", { id: "qrAdd" });
  const addVc = btn("Add contact QR code", () => { const o = {}; for (const i of vc) o[i.dataset.vcard] = i.value; if (!o.name && !o.phone && !o.email) { toast("Type at least a name, phone or email."); return; } addEl(qrElement(vcard(o)), m * 0.3); }, "", { id: "qrVcard" });
  const code = h("input.ad-input", { type: "text", id: "barcodeText", value: "AD-2026-001", "aria-label": "Barcode text" });
  const bar = btn("Add barcode", () => addEl(barcodeElement(code.value), m * 0.5), "", { id: "barcodeAdd" });
  root.append(h("p.st-hint", { text: "QR codes and barcodes are drawn as sharp vector shapes. Select one and press Add again to update it; change its colours from the toolbar." }),
    sec("Link or text", url, add), sec("Contact card (vCard)", h("div.st-grid2", {}, ...vc), addVc), sec("Barcode (Code 39)", code, bar));
}

/* ---------------- Caption and hashtags (social posts) ---------------- */
export function captionPanel(root) {
  const ta = h("textarea.ad-input", { id: "captionText", rows: 7, "aria-label": "Caption", placeholder: "Write your caption… #hashtags work too", value: S.design.caption || "" });
  const count = h("p.st-hint", { id: "hashCount" });
  const upd = () => { const tags = (ta.value.match(/#[\p{L}\p{N}_]+/gu) || []).length; count.textContent = `${ta.value.length} / 2200 characters · ${tags} / 30 hashtags${tags > 30 ? " (Instagram allows 30)" : ""}`; count.classList.toggle("warn", tags > 30 || ta.value.length > 2200); };
  ta.addEventListener("input", () => { S.design.caption = ta.value; commit("caption"); upd(); });
  const status = h("p.st-status", { role: "status", id: "captionStatus" });
  const copy = btn("Copy caption", async () => { try { await navigator.clipboard.writeText(ta.value); status.textContent = "Caption copied."; } catch { ta.select(); status.textContent = "Select the text and copy it (Ctrl+C)."; } }, "small", { id: "captionCopy" });
  const share = btn("Share…", async () => {
    try {
      const n = S.design.pages.length, files = [];
      for (let i = 0; i < Math.min(n, 10); i++) { const r = await exportRaster(S.design, i, { scale: 1, type: "png" }); files.push(new File([r.blob], `${fileBase(S.design)}-${i + 1}.png`, { type: "image/png" })); }
      if (navigator.canShare?.({ files })) { await navigator.share({ files, text: ta.value }); status.textContent = "Shared."; return; }
      if (files.length > 1) download(new Blob([zipFiles(await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) }))))], { type: "application/zip" }), fileBase(S.design) + "-carousel.zip");
      else download(files[0], files[0].name);
      try { await navigator.clipboard.writeText(ta.value); } catch {}
      status.textContent = "This browser can't share files, so the post was downloaded and the caption copied. Post it from the Instagram app.";
    } catch (e) { if (e?.name !== "AbortError") status.textContent = e?.message || "Sharing did not work."; }
  }, "primary small", { id: "captionShare" });
  root.append(h("p.st-hint", { text: "Posting straight to Instagram needs a connected Instagram account, which AsaanDesk doesn't have. Share opens your device's share sheet (pick Instagram there), or download and post from the app." }), ta, count, h("div.st-row", {}, copy, share), status);
  upd();
}
