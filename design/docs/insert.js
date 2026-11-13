// Docs insert adapter for the shared left-rail panel kit (../shared/panels/, LEFT-RAIL PANELS PARITY): kit items become
// Docs blocks — headings and paragraphs (font, colour, size, caps, letter spacing, coloured bands), real tables,
// dividers for plain lines, and picture blocks for graphics, shapes, charts, photos and drawings. Photo frames and grids
// are pictures that describe themselves (shared/insert-adapt.js), so a photo dropped on one (or clicked while it is
// selected) fills the frame / the grid cell under the pointer. A click adds after the block you are in (or the one in
// the middle of the view), a drop before or after the block under the pointer. Page numbers switch on the page footer
// numbers. D: the Docs UI's own helpers (see ui.js).

let U = null;
const util = () => (U ||= import("../shared/insert-adapt.js"));
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v.toLowerCase() : /^#[0-9a-f]{3}$/i.test(v || "") ? "#" + [...v.slice(1)].map((c) => c + c).join("").toLowerCase() : null);
const ROLE_REL = { heading: 0.075, subheading: 0.045, body: 0.03, caption: 0.022 };

export function makeDocsInsert(D) {
  const contentW = () => Math.max(200, D.editor.clientWidth || 600);
  const base = () => contentW() * 1.25; // the page's shorter side (its width) in screen px
  const live = () => { if (D.editor.contentEditable === "false") throw new Error("Switch to Editing to change the document."); };
  /** Where a new block goes: the drop point (before / after the block under it) or the block you are in. */
  function where(pt) {
    const blocks = [...D.editor.children];
    if (pt) {
      const y = pt.clientY ?? (D.viewer.getBoundingClientRect().top + pt.y);
      const b = D.blockAt(y);
      if (b) { const r = b.getBoundingClientRect(); return { block: b, before: y < r.top + r.height / 2 }; }
      const first = blocks[0], lastB = blocks.at(-1);
      if (first && y < first.getBoundingClientRect().top) return { block: first, before: true };
      return { block: lastB || null, before: false };
    }
    const cur = D.currentTop();
    const vr = D.viewer.getBoundingClientRect();
    if (cur) { const r = cur.getBoundingClientRect(); if (r.bottom >= vr.top && r.top <= vr.bottom) return { block: cur, before: false }; }
    const mid = D.blockAt(vr.top + vr.height / 2);
    return { block: mid || cur || blocks.at(-1) || null, before: false };
  }
  const add = (html, pt, o = {}) => { live(); return D.insertAt(html, { at: where(pt), ...o }); };
  const imgBlock = (src, w, alt) => `<p class="imgp" style="text-align:center"><img src="${D.escHtml(src)}" alt="${D.escHtml(alt || "")}" style="width:${Math.round(w)}px"></p>`;
  const svgBlock = (svg, w, alt) => imgBlock(D.svgDataUrl(svg), Math.min(contentW(), Math.max(24, w)), alt);

  function textBlock(spec) {
    const role = spec.role || "body";
    const type = role === "heading" ? "h1" : role === "subheading" ? "h2" : "p";
    const rel = +spec.rel > 0 ? +spec.rel : ROLE_REL[role] || ROLE_REL.body;
    const custom = Math.abs(rel - (ROLE_REL[role] || ROLE_REL.body)) > 0.004 || role === "caption";
    const run = { text: spec.uppercase ? String(spec.content ?? "").toUpperCase() : String(spec.content ?? "") };
    if (D.FONT_FAMILIES[spec.family] && spec.family !== "sans") { run.font = spec.family; D.ensureFont(spec.family, !!spec.bold, !!spec.italic); }
    if (hex(spec.color)) run.color = hex(spec.color);
    const bold = spec.bold ?? (spec.weight ? +spec.weight >= 600 : null);
    if (bold && type === "p") run.b = true;
    if (spec.italic) run.i = true;
    if (custom) run.size = Math.max(7, Math.min(72, Math.round(rel * 360 * 2) / 2));
    const b = { type, runs: [run] };
    if (["center", "right", "justify"].includes(spec.align)) b.align = spec.align;
    if (+spec.letterSpacing) b.lsp = Math.round(+spec.letterSpacing * 1000);
    if (+spec.lineHeight > 0 && +spec.lineHeight !== 1.2) b.lineHeight = +spec.lineHeight;
    if (hex(spec.background)) { b.bg = hex(spec.background); b.pad = 10; b.rad = 8; if (!run.color) run.color = "#ffffff"; }
    return b;
  }
  /** The frame / grid picture under the drop point (or the selected block's), or null. */
  async function frameTarget(pt) {
    const A = await util();
    let img = null;
    if (pt?.clientX != null) { const el = document.elementFromPoint?.(pt.clientX, pt.clientY); img = el?.closest?.("img") || el?.querySelector?.("img") || null; if (img && !D.editor.contains(img)) img = null; }
    else { const cur = D.currentTop(); img = cur?.matches?.("p.imgp") ? cur.querySelector("img") : null; }
    return img && A.frameMeta(img.getAttribute("src")) ? img : null;
  }
  async function photoInto(img, src, pt) {
    const A = await util();
    const data = await A.photoDataUrl(src);
    const { nw, nh } = await A.imageSize(data);
    const r = img.getBoundingClientRect();
    const at = pt?.clientX != null && r.width > 0 ? { u: (pt.clientX - r.left) / r.width, v: (pt.clientY - r.top) / r.height } : null;
    const kind = A.frameMeta(img.getAttribute("src")).kind;
    const svg = A.fillFramePicture(img.getAttribute("src"), data, nw, nh, at);
    D.A.change(() => { img.setAttribute("src", D.svgDataUrl(svg)); img.setAttribute("alt", kind === "frame" ? "Photo in a frame" : "Photo grid"); });
    D.select(D.topBlock(img));
    D.A.toast("Photo placed in the " + (kind === "frame" ? "frame." : "grid."));
  }

  const ins = {
    /** Photos and pictures as picture blocks; on a frame or grid picture the photo goes into it. */
    async image(src, name = "Image", pt) {
      live();
      const fr = await frameTarget(pt);
      if (fr) { await photoInto(fr, src, pt); return; }
      const A = await util();
      let s = String(src || "");
      if (/^data:image\/svg\+xml/.test(s) && !/;base64,/.test(s)) s = D.svgDataUrl(A.svgOfSrc(s));
      if (!/^data:image\//.test(s) && !/^(https?:\/\/|\/(?!\/)|blob:)/.test(s)) throw new Error("This picture cannot be added to a document.");
      let { nw } = /^data:image\/svg/.test(s) ? { nw: A.svgSize(A.svgOfSrc(s)).w } : await A.imageSize(s);
      if (!nw) ({ nw } = await A.imageSize(s));
      add(imgBlock(s, Math.min(contentW() * 0.75, nw || 480), name), pt);
    },
    /** Plain lines are document dividers (solid, dashed, dotted, thick); other shapes are drawn by the kit (picture). */
    async shape(spec = {}, pt) {
      const k = String(spec.kind || "").toLowerCase();
      if (k !== "line" || (spec.arrow && !["none", false].includes(spec.arrow))) return false;
      const hs = spec.dash === "dotted" || (Array.isArray(spec.dash) && spec.dash[0] <= 1.5) ? "dotted" : spec.dash ? "dashed" : spec.double ? "double" : +spec.strokeWidth >= 4 ? "thick" : null;
      const b = { type: "hr" }; if (hs) b.hs = hs;
      const c = hex(spec.stroke) || hex(spec.fill); if (c) b.hc = c;
      add(D.modelToHtml([b], { editor: true }), pt);
    },
    /** Graphics, stickers, icons, charts, shapes (kit drawings): a picture block sized from rel. */
    async svg(markup, opts = {}, pt) {
      const A = await util(), sz = A.svgSize(markup), aspect = +opts.aspect > 0 ? +opts.aspect : sz.w > 0 && sz.h > 0 ? sz.w / sz.h : 1;
      const box = A.relBox(opts.rel || 0.3, aspect, base());
      add(svgBlock(markup, box.w, opts.name || "Graphic"), pt);
    },
    /** A heading / subheading / paragraph block; a click selects its text so typing replaces it. */
    async text(spec = {}, pt) {
      if (typeof spec === "string") spec = { content: spec, role: "body" };
      add(D.modelToHtml([textBlock(spec)], { editor: true }), pt, { selectText: !pt });
    },
    /** Font combinations: one block per line, top to bottom. */
    async textGroup(specs = [], pt) {
      const list = (Array.isArray(specs) ? specs : [specs]).filter(Boolean);
      if (!list.length) return false;
      const sorted = list.map((s, i) => ({ s, i })).sort((a, b) => (+a.s.dy || 0) - (+b.s.dy || 0) || a.i - b.i).map((x) => x.s);
      add(D.modelToHtml(sorted.map(textBlock), { editor: true }), pt);
    },
    /** Tables: a real document table with the kit's cells (header row in the kit's colour; no borders when it has none). */
    async table(spec = {}, pt) {
      const A = await util(), t = A.tableModel(spec), st = t.style || {};
      const b = { type: "table", header: t.header, rows: t.cells.map((r) => r.map((text) => ({ runs: text ? [{ text }] : [] }))) };
      if (hex(st.head)) b.accent = hex(st.head);
      if (st.border === false || st.border === "none") b.tstyle = "cols";
      else if (st.border === "lines" || st.lines) b.tstyle = "lines";
      add(D.modelToHtml([b], { editor: true }), pt);
    },
    /** Photo frames: an empty frame picture; drop a photo on it (or click a photo while it is selected). */
    async frame(spec = {}, pt) {
      const A = await util(), f = A.framePicture(spec);
      add(svgBlock(f.svg, A.relBox(spec.rel || 0.4, f.aspect, base()).w, spec.name || "Photo frame"), pt);
    },
    /** Grids: a picture of photo spots across the page; each photo dropped on it fills the spot under the pointer. */
    async grid(spec = {}, pt) {
      const A = await util(), g = A.gridPicture(spec);
      add(svgBlock(g.svg, contentW(), spec.name || "Photo grid"), pt);
      D.A.toast(`Grid added: ${g.cells} photo spots. Drop photos on them.`);
    },
    /** Videos: our own animated loops play as moving pictures; other clips come in as their cover (kit fallback). */
    async video(spec = {}, pt) {
      const A = await util(), svg = A.svgOfSrc(spec.src);
      if (!svg) return false;
      const box = A.relBox(spec.rel || 0.5, +spec.aspect > 0 ? +spec.aspect : 16 / 9, base());
      add(svgBlock(svg, box.w, spec.name || "Video"), pt);
    },
    /** Page numbers: the page footer shows "Page n of N" (screen, print, PDF and Word). */
    async pageNumber() {
      live();
      D.setPageNumbers(true);
      D.A.toast("Page numbers are on: every page shows its number at the bottom (Page setup turns them off).");
    },
    /** A drawing from the kit's drawing layer: a picture block. */
    async drawing(markup, size = {}, pt) {
      const A = await util(), sz = A.svgSize(markup);
      add(svgBlock(markup, +size.w > 0 ? +size.w : sz.w || 300, "Drawing"), pt);
    },
  };
  return ins;
}
