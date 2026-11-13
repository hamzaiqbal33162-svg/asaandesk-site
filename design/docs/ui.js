// AsaanDesk Docs: the Canva-like frame around the page. Mounts the shared editor shell (top bar, rail, panels,
// bottom bar) when it is available, and adds the doc behaviour: block drag handles, the block action pill,
// block fill / border / corners / layout / decoration, Elements, Text and Tools panels, Magic Switch.
import { DECOS, DECO_IDS, decoSvg, svgDataUrl, SHAPES, LINES, STICKERS, CHARTS, EMOJI } from "./decos.js";
import * as gallery from "./gallery.js";
import { modelToHtml, blockAttrs, escHtml, PAGE_SIZES, textToModel, hrHtml, exportHtmlPage, withoutSuggestions } from "./model.js";
import { FONT_FAMILIES, ensureFont } from "../shared/brand.js";
import { listProjects } from "../shared/store.js";
import { initSuggest } from "./suggest.js";
import { initComments } from "./comments.js";
import { initVersions } from "./versions.js";
import { makeDocsInsert } from "./insert.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const BAND = ["bg", "deco", "dc", "dc2", "pad", "minh", "rad", "bd", "bc", "pimg", "pfo"]; // pimg/pfo: a résumé's round portrait stays when the fill changes
const TEXT_SWATCHES = ["#1b2133", "#ffffff", "#5b4cf0", "#2f80ff", "#14b8a6", "#16a34a", "#f59e0b", "#ff7a59", "#dc2626", "#db2777", "#7a5536", "#64748b"];
const FILL_SWATCHES = ["", "#24453a", "#a7e8c5", "#12355b", "#dbeafe", "#4c1d95", "#ede9fe", "#0f766e", "#ccfbf1", "#fff7ed", "#fef3c7", "#fdf2f8", "#ff7a59", "#111827", "#f1f5f9", "#5b4cf0"];
const HILITE_SWATCHES = ["#fff59d", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa", "#e9d5ff"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

export function initUi(A) {
  const { editor, viewer, paper } = A;
  let shell = null, selBlock = null, hoverBlock = null, copiedStyle = null, drag = null;

  /* ---------------- blocks ---------------- */
  const topBlock = (node) => { let n = node?.nodeType === 3 ? node.parentNode : node; while (n && n.parentNode !== editor) { if (n === editor || !n.parentNode) return null; n = n.parentNode; } return n && n.parentNode === editor ? n : null; };
  const blocks = () => [...editor.children];
  // Heading text with its line breaks as spaces ("Northwind Studio One Pager", not "Northwind StudioOne Pager").
  const headText = (h) => String(h.innerText || h.textContent || "").replace(/\s+/g, " ").trim();
  const relRect = (el) => { const r = el.getBoundingClientRect(), v = viewer.getBoundingClientRect(); return { top: r.top - v.top + viewer.scrollTop, left: r.left - v.left + viewer.scrollLeft, width: r.width, height: r.height, bottom: r.bottom - v.top + viewer.scrollTop, right: r.right - v.left + viewer.scrollLeft }; };
  const selBox = Object.assign(document.createElement("div"), { className: "sel-box", hidden: true });
  selBox.setAttribute("aria-hidden", "true");
  viewer.append(selBox);
  const handle = $("#blockHandle"), pill = $("#blockPill"), menu = $("#blockMenu"), dropLine = $("#dropLine"), cpop = $("#commentPop");
  const addBtn = Object.assign(document.createElement("button"), { type: "button", className: "blk-add", id: "blockAdd", hidden: true, textContent: "+", title: "Add a block below (or type / on an empty line)" });
  addBtn.setAttribute("aria-label", "Add a block");
  viewer.append(addBtn);
  const slash = Object.assign(document.createElement("div"), { className: "blk-menu ad-panel slash-menu", id: "slashMenu", hidden: true });
  slash.setAttribute("role", "menu");
  slash.setAttribute("aria-label", "Insert");
  viewer.append(slash);

  function placeOverlays() {
    const b = hoverBlock && hoverBlock.isConnected ? hoverBlock : selBlock && selBlock.isConnected ? selBlock : null;
    if (b && !drag) {
      const r = relRect(b), pr = relRect(paper);
      handle.hidden = false;
      handle.style.top = Math.round(r.top + Math.min(r.height, 40) / 2 - 16) + "px";
      handle.style.left = Math.round(Math.max(2, Math.min(r.left, pr.left + 70) - 32)) + "px";
      handle.classList.toggle("on", b === selBlock);
      addBtn.hidden = false;
      addBtn.style.top = handle.style.top;
      addBtn.style.left = Math.max(2, parseFloat(handle.style.left) - 30) + "px";
      addBtn.dataset.for = String(blocks().indexOf(b));
    } else if (!drag) { handle.hidden = true; addBtn.hidden = true; }
    if (selBlock && selBlock.isConnected) {
      const r = relRect(selBlock);
      selBox.hidden = false;
      Object.assign(selBox.style, { top: r.top - 3 + "px", left: r.left - 3 + "px", width: r.width + 6 + "px", height: r.height + 6 + "px" });
      pill.hidden = false;
      pill.style.top = Math.round(r.bottom - 6) + "px";
      pill.style.left = Math.round(Math.max(r.left, r.right - pill.offsetWidth - 8)) + "px";
    } else { selBox.hidden = true; pill.hidden = true; menu.hidden = true; }
  }
  function select(b) {
    if (b !== selBlock) { menu.hidden = true; cpop.hidden = true; }
    selBlock = b && b.isConnected ? b : null;
    placeOverlays();
  }
  document.addEventListener("selectionchange", () => {
    const s = getSelection();
    if (!s.rangeCount || !editor.contains(s.anchorNode)) return;
    select(topBlock(s.anchorNode));
    refreshExtras();
  });
  viewer.addEventListener("scroll", placeOverlays, { passive: true });
  addEventListener("resize", placeOverlays);
  new ResizeObserver(() => placeOverlays()).observe(editor);
  viewer.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || drag) return;
    if (e.target.closest("#blockHandle,#blockAdd,#blockPill,#blockMenu,#commentPop,#slashMenu")) return;
    const b = blockAt(e.clientY);
    if (b !== hoverBlock) { hoverBlock = b; placeOverlays(); }
  });
  viewer.addEventListener("pointerleave", () => { hoverBlock = null; placeOverlays(); });
  function blockAt(y) {
    const list = blocks();
    for (const b of list) { const r = b.getBoundingClientRect(); if (y >= r.top - 6 && y <= r.bottom + 6) return b; }
    return null;
  }

  // Drag handle: drag to reorder, click to select.
  handle.addEventListener("pointerdown", (e) => {
    const b = hoverBlock && hoverBlock.isConnected ? hoverBlock : selBlock;
    if (!b) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    drag = { block: b, x: e.clientX, y: e.clientY, moved: false, target: null, after: false };
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    drag.moved = true;
    handle.style.top = (e.clientY - viewer.getBoundingClientRect().top + viewer.scrollTop - 16) + "px";
    const list = blocks().filter((b) => b !== drag.block);
    let target = null, after = false;
    for (const b of list) { const r = b.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { target = b; after = false; break; } target = b; after = true; }
    drag.target = target; drag.after = after;
    if (target) { const r = relRect(target); dropLine.hidden = false; Object.assign(dropLine.style, { top: (after ? r.bottom + 2 : r.top - 3) + "px", left: r.left + "px", width: r.width + "px" }); }
    // Scroll near the edges while dragging.
    const vr = viewer.getBoundingClientRect();
    if (e.clientY < vr.top + 40) viewer.scrollTop -= 14; else if (e.clientY > vr.bottom - 40) viewer.scrollTop += 14;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    dropLine.hidden = true;
    if (!d.moved) { selectWhole(d.block); return; }
    if (d.target && d.target !== d.block) moveBlock(d.block, d.target, d.after);
    placeOverlays();
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", () => { drag = null; dropLine.hidden = true; placeOverlays(); });
  handle.addEventListener("keydown", (e) => {
    const b = selBlock || hoverBlock;
    if (!b) return;
    if (e.key === "ArrowUp" && b.previousElementSibling) { e.preventDefault(); moveBlock(b, b.previousElementSibling, false); }
    if (e.key === "ArrowDown" && b.nextElementSibling) { e.preventDefault(); moveBlock(b, b.nextElementSibling, true); }
  });

  function caretInto(b, atStart = true) {
    const t = b.matches("table") ? b.querySelector("td,th") : b.matches("ul,ol,blockquote") ? b.querySelector("li,p") || b : b;
    if (b.matches(".pb,hr") || b.querySelector?.("img") && !b.textContent.trim()) { select(b); return; }
    A.placeCaret(t, atStart);
  }
  function selectWhole(b) { caretInto(b, true); select(b); }
  function moveBlock(b, target, after) {
    A.change(() => { if (after) target.after(b); else target.before(b); });
    selectWhole(b);
    A.toast("Block moved.");
  }

  // Block action pill.
  for (const el of [pill, menu]) el.addEventListener("mousedown", (e) => e.preventDefault());
  function blockAction(act) {
    const b = selBlock;
    if (!b || !b.isConnected) { A.toast("Click a block first."); return; }
    if (act === "more") { menu.hidden = !menu.hidden; if (!menu.hidden) { const r = relRect(pill); Object.assign(menu.style, { top: r.bottom + 6 + "px", left: Math.max(4, r.right - 200) + "px" }); $('[data-blk="pasteStyle"]', menu).disabled = !copiedStyle; for (const el of $$("[data-only]", menu)) el.hidden = el.dataset.only === "img" ? !b.querySelector?.("img") : !b.matches(el.dataset.only); const fp = $('[data-blk="fullPage"]', menu); if (fp) fp.textContent = b.querySelector?.("img[data-full]") ? "Undo full page" : "Set as full page"; } return; }
    if (/^(hr|hc):/.test(act)) { // divider style / colour (menu stays open to try another)
      const hr = b.matches("hr") ? b : null;
      if (!hr) return;
      const [k, v] = act.split(/:(.*)/);
      A.change(() => { const cur = { hs: hr.dataset.hs || null, hc: hr.dataset.hc || null, ps: +hr.dataset.ps || null }; if (k === "hr") cur.hs = v === "solid" ? null : v; else cur.hc = v; const tmp = document.createElement("div"); tmp.innerHTML = hrHtml(cur); const nx = tmp.firstChild; hr.replaceWith(nx); selBlock = nx; });
      // A divider has no text caret: drop the restored caret (its selectionchange would select the block above) and
      // keep the new divider selected with the menu open, so the next style or colour applies to it too.
      getSelection().removeAllRanges();
      if (selBlock && !selBlock.isConnected) selBlock = null;
      placeOverlays();
      return;
    }
    menu.hidden = true;
    if (act === "fullPage") {
      const img = b.querySelector?.("img");
      if (!img) { A.toast("Select a picture first."); return; }
      const on = img.dataset.full !== "1";
      A.change(() => { if (on) { img.dataset.full = "1"; if (img.style.width) img.dataset.w = parseInt(img.style.width, 10) || ""; img.style.width = ""; } else { delete img.dataset.full; if (img.dataset.w) img.style.width = img.dataset.w + "px"; delete img.dataset.w; } b.classList.toggle("img-full", on); });
      A.toast(on ? "Picture set as a full page: it fills its own page in the PDF." : "Picture is back to its normal size.");
      placeOverlays();
      return;
    }
    if (act === "comment") { openComment(b); return; }
    if (act === "duplicate") { let c; A.change(() => { c = b.cloneNode(true); delete c.dataset.cmt; b.after(c); }); selectWhole(c); A.toast("Block duplicated."); return; }
    if (act === "delete") {
      const next = b.nextElementSibling || b.previousElementSibling;
      A.change(() => { b.remove(); if (!editor.children.length) editor.append(Object.assign(document.createElement("p"), { innerHTML: "<br>" })); });
      select(null);
      const n = next && next.isConnected ? next : editor.firstElementChild;
      if (n) caretInto(n, true);
      A.toast("Block deleted.");
      return;
    }
    if (act === "up" && b.previousElementSibling) { moveBlock(b, b.previousElementSibling, false); return; }
    if (act === "down" && b.nextElementSibling) { moveBlock(b, b.nextElementSibling, true); return; }
    if (act === "copyStyle") { copiedStyle = styleOf(b); A.toast("Style copied. Select another block, then ⋯ → Paste style."); return; }
    if (act === "pasteStyle" && copiedStyle) { pasteStyle(b, copiedStyle); A.toast("Style pasted."); return; }
    if (act === "addBelow") { const p = Object.assign(document.createElement("p"), { innerHTML: "<br>" }); A.change(() => b.after(p)); A.placeCaret(p, true); select(p); return; }
    if (act === "clearFill") { setBand([b], Object.fromEntries(BAND.map((k) => [k, null]))); return; }
  }
  pill.addEventListener("click", (e) => { const t = e.target.closest("[data-blk]"); if (t) blockAction(t.dataset.blk); });
  menu.addEventListener("click", (e) => { const t = e.target.closest("[data-blk]"); if (t) blockAction(t.dataset.blk); });

  function openComment(b) {
    cpop.hidden = false;
    const r = relRect(pill);
    Object.assign(cpop.style, { top: r.bottom + 8 + "px", left: Math.max(4, r.left - 80) + "px" });
    const t = comments.threadOf(b);
    $("#commentText").value = "";
    $("#commentText").placeholder = t ? `Reply to: ${t.text.slice(0, 60)}` : "Add a comment. Type @ to mention someone.";
    $("#commentDelete").hidden = !t;
    $("#commentText").focus();
    cpop.dataset.for = String(blocks().indexOf(b));
  }
  const commentTarget = () => blocks()[+cpop.dataset.for] || selBlock;
  $("#commentSave").addEventListener("click", () => {
    const b = commentTarget(), t = $("#commentText").value.trim();
    cpop.hidden = true;
    if (!b || !t) return;
    const had = comments.threadOf(b);
    comments.add(b, t);
    A.toast(had ? "Reply added." : "Comment added.");
  });
  $("#commentDelete").addEventListener("click", () => { const b = commentTarget(); cpop.hidden = true; const t = comments.threadOf(b); if (t) { comments.remove(t.id); A.toast("Comment deleted."); } });
  $("#commentCancel").addEventListener("click", () => { cpop.hidden = true; });

  /* ---------------- block look (fill, decoration, border, corners, padding) ---------------- */
  function bandOf(el) { const o = {}; for (const k of BAND) if (el.dataset[k] != null && el.dataset[k] !== "") o[k] = /^(pad|minh|rad|bd)$/.test(k) ? +el.dataset[k] : el.dataset[k]; return o; }
  function writeBand(el, props) {
    const keep = { align: el.style.textAlign || undefined, lineHeight: el.style.lineHeight ? +el.style.lineHeight : undefined, indent: +el.dataset.indent || undefined, dir: el.getAttribute("dir") === "rtl" ? "rtl" : undefined, ps: +el.dataset.ps || undefined, lsp: +el.dataset.lsp || undefined };
    const b = { ...keep, ...props };
    for (const k of Object.keys(b)) if (b[k] == null || b[k] === "" || b[k] === 0 && k !== "pad") delete b[k];
    const tmp = document.createElement("div");
    tmp.innerHTML = `<p${blockAttrs(b)}></p>`;
    const src = tmp.firstChild;
    for (const k of BAND) el.removeAttribute("data-" + k);
    el.removeAttribute("style");
    el.classList.remove("band");
    if (!el.classList.length) el.removeAttribute("class");
    for (const a of src.attributes) { if (a.name === "class") el.classList.add(...a.value.split(" ")); else if (a.name !== "data-cmt") el.setAttribute(a.name, a.value); }
  }
  function lookTargets() {
    const list = A.selectedBlocks("p,h1,h2,h3").filter((b) => !b.closest("td,th,li,blockquote") && b.parentNode === editor);
    if (list.length) return list;
    return selBlock && selBlock.matches("p,h1,h2,h3") ? [selBlock] : [];
  }
  function setBand(targets, patch) {
    if (!targets.length) { A.toast("Click in a heading or paragraph first."); return; }
    A.change(() => { for (const el of targets) { const cur = bandOf(el); const nx = { ...cur, ...patch }; if (patch.deco && !cur.bg && !patch.bg) nx.bg = "#efedff"; if (patch.bd && !nx.bc) nx.bc = $("#borderColor").value; writeBand(el, nx); } });
    placeOverlays();
  }
  function styleOf(b) {
    const t = b.querySelector("span,b,i,u,s") || b;
    const cs = getComputedStyle(t);
    const { pimg, pfo, ...band } = bandOf(b); // a portrait photo is content, not style
    return { tag: b.tagName, band, color: cs.color, font: cs.fontFamily, size: cs.fontSize, align: b.style.textAlign };
  }
  function pasteStyle(b, st) {
    A.change(() => {
      const own = bandOf(b);
      writeBand(b, { ...st.band, ...(own.pimg ? { pimg: own.pimg, pfo: own.pfo } : {}) });
      if (st.align) b.style.textAlign = st.align;
      const span = document.createElement("span");
      span.style.color = st.color; span.style.fontFamily = st.font; span.style.fontSize = (parseFloat(st.size) * 0.75).toFixed(1) + "pt";
      for (const s of $$("span", b)) { s.style.color = ""; s.style.fontFamily = ""; s.style.fontSize = ""; }
      span.append(...b.childNodes);
      b.append(span);
    });
  }

  // Popovers on the toolbar.
  const pops = $$(".tpop");
  function closePops() { for (const p of pops) p.hidden = true; $$(".pop-btn").forEach((b) => b.setAttribute("aria-expanded", "false")); }
  function openPop(btn, pop) {
    const open = pop.hidden;
    closePops();
    if (!open) return;
    A.rememberSelection();
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect();
    pop.style.top = Math.min(innerHeight - 40, r.bottom + 8) + "px";
    pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left)) + "px";
    if (pop.id === "layoutPop" || pop.id === "cornerPop") { const t = lookTargets()[0]; if (t) { $("#cornerRange").value = String(+t.dataset.rad || 0); $("#cornerOut").value = String(+t.dataset.rad || 0); } }
  }
  for (const b of $$(".pop-btn")) b.addEventListener("click", (e) => { e.stopPropagation(); openPop(b, $("#" + b.dataset.pop)); });
  for (const p of pops) {
    p.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
    p.addEventListener("click", (e) => e.stopPropagation());
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".tpop,.pop-btn")) closePops(); if (!e.target.closest("#blockPill,#blockMenu")) menu.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePops(); menu.hidden = true; cpop.hidden = true; $("#magicSwitchPop") && ($("#magicSwitchPop").hidden = true); } });

  // Colour popover.
  const sw = (box, list, fn) => { for (const c of list) { const b = Object.assign(document.createElement("button"), { type: "button", className: "swatch" + (c ? "" : " none"), title: c || "No fill" }); b.setAttribute("aria-label", c || "No fill"); b.dataset.color = c; if (c) b.style.background = c; b.addEventListener("click", () => fn(c)); box.append(b); } };
  const fire = (id, v) => { const el = $("#" + id); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
  sw($('[data-swatch="text"]'), TEXT_SWATCHES, (c) => { fire("textColor", c); closePops(); });
  sw($('[data-swatch="hilite"]'), HILITE_SWATCHES, (c) => { fire("hiliteColor", c); closePops(); });
  sw($('[data-swatch="fill"]'), FILL_SWATCHES, (c) => { setBand(lookTargets(), { bg: c || null, ...(c ? {} : { deco: null }) }); closePops(); });
  $("#fillColor").addEventListener("pointerdown", A.rememberSelection);
  $("#fillColor").addEventListener("change", (e) => setBand(lookTargets(), { bg: e.target.value }));
  $("#borderPop").addEventListener("click", (e) => { const b = e.target.closest("[data-bd]"); if (b) { setBand(lookTargets(), { bd: +b.dataset.bd || null }); closePops(); } });
  $("#borderColor").addEventListener("change", (e) => { const t = lookTargets(); if (t.some((x) => x.dataset.bd)) setBand(t, { bc: e.target.value }); });
  $("#cornerPop").addEventListener("click", (e) => { const b = e.target.closest("[data-rad]"); if (b) { setBand(lookTargets(), { rad: +b.dataset.rad || null }); $("#cornerOut").value = b.dataset.rad; } });
  $("#cornerRange").addEventListener("input", (e) => { $("#cornerOut").value = e.target.value; });
  $("#cornerRange").addEventListener("change", (e) => setBand(lookTargets(), { rad: +e.target.value || null }));
  $("#layoutPop").addEventListener("click", (e) => {
    const p = e.target.closest("[data-pad]"), m = e.target.closest("[data-minh]"), d = e.target.closest("[data-deco]");
    if (p) setBand(lookTargets(), { pad: +p.dataset.pad, ...(lookTargets()[0]?.dataset.bg ? {} : { bg: "#f1f5f9" }) });
    if (m) setBand(lookTargets(), { minh: +m.dataset.minh || null });
    if (d) { const t = lookTargets(); const dark = isDark(t[0]?.dataset.bg); setBand(t, d.dataset.deco ? { deco: d.dataset.deco, dc: dark ? "#a7e8c5" : "#5b4cf0", dc2: dark ? "#f3efe6" : "#14b8a6" } : { deco: null }); }
  });
  const isDark = (hex) => { const m = /^#([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return false; const n = parseInt(m[1], 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 130; };
  const dg = $("#decoGrid");
  for (const id of ["", ...DECO_IDS]) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "deco-btn", title: id ? DECOS[id].label : "No decoration" });
    b.dataset.deco = id;
    b.setAttribute("aria-label", id ? DECOS[id].label : "No decoration");
    b.innerHTML = id ? `<img alt="" src="${svgDataUrl(decoSvg(id, "#5b4cf0", "#14b8a6"))}">` : "∅";
    dg.append(b);
  }
  $("#spacingPop").addEventListener("click", (e) => { const b = e.target.closest("[data-ls]"); if (b) { fire("lineSpacing", b.dataset.ls); closePops(); } });
  // Paragraph / block spacing and letter spacing (Canva: text "Advanced settings" and the block "Spacing" sliders).
  function spaceTargets() {
    const list = A.selectedBlocks("p,h1,h2,h3,li,blockquote").filter((b) => !b.closest("td,th"));
    if (selBlock && selBlock.isConnected && !list.includes(selBlock) && (selBlock.matches("hr,table") || selBlock.querySelector?.("img") || !list.length)) list.push(selBlock);
    return list;
  }
  function setSpace(kind, v) {
    const targets = spaceTargets();
    if (!targets.length) { A.toast("Click in a block first."); return; }
    v = Math.round(+v) || 0;
    A.change(() => {
      for (const t of targets) {
        if (kind === "ps") {
          const img = t.matches("p.imgp") ? t.querySelector("img") : null;
          const holder = img || t; // a picture keeps its spacing on the <img>, the paragraph shows it
          if (v) holder.dataset.ps = v; else delete holder.dataset.ps;
          t.style.marginTop = v ? v + "pt" : ""; t.style.marginBottom = v ? v + "pt" : "";
        } else if (!t.matches("hr,table") && !t.querySelector?.("img")) {
          if (v) t.dataset.lsp = v; else delete t.dataset.lsp;
          t.style.letterSpacing = v ? v / 1000 + "em" : "";
        }
      }
    });
    placeOverlays();
  }
  const syncPair = (a, b, kind) => {
    $(a).addEventListener("input", (e) => { $(b).value = e.target.value; });
    $(a).addEventListener("change", (e) => setSpace(kind, e.target.value));
    $(b).addEventListener("change", (e) => { const v = Math.max(+e.target.min, Math.min(+e.target.max, +e.target.value || 0)); e.target.value = v; $(a).value = v; setSpace(kind, v); });
  };
  syncPair("#paraSpacing", "#paraSpacingNum", "ps");
  syncPair("#letterSpacing", "#letterSpacingNum", "lsp");
  $("#spacingBtn").addEventListener("click", () => {
    const t = spaceTargets()[0];
    const holder = t?.matches?.("p.imgp") ? t.querySelector("img") : t;
    const ps = +holder?.dataset?.ps || 0, lsp = +t?.dataset?.lsp || 0;
    $("#paraSpacing").value = $("#paraSpacingNum").value = ps;
    $("#letterSpacing").value = $("#letterSpacingNum").value = lsp;
    $("#paraSpacingLabel").textContent = t && (t.matches("hr,table") || t.querySelector?.("img")) ? "Block spacing" : "Paragraph spacing";
  });

  // Size − / +, alignment cycle.
  const stepSize = (d) => {
    A.rememberSelection();
    let r = A.savedRange();
    if (r && r.collapsed && selBlock && selBlock.textContent.trim() && !selBlock.matches("table,ul,ol,.pb,hr")) {
      // Only a caret: − / + work on the whole block (like a text box).
      const all = document.createRange(); all.selectNodeContents(selBlock);
      const s = getSelection(); s.removeAllRanges(); s.addRange(all); A.rememberSelection(); r = A.savedRange();
    }
    let el = r ? (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer) : null;
    if (el && el.nodeType === 1 && r && !r.collapsed && r.startContainer.nodeType !== 3) { const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n = tw.nextNode(); while (n && !n.nodeValue.trim()) n = tw.nextNode(); if (n) el = n.parentElement; }
    const cur = el && editor.contains(el) ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75 * 2) / 2 : +$("#fontSize").value || 11;
    const nx = d > 0 ? SIZES.find((s) => s > cur) || 72 : [...SIZES].reverse().find((s) => s < cur) || 8;
    fire("fontSize", String(nx));
  };
  for (const [id, d] of [["sizeDown", -1], ["sizeUp", 1]]) { $("#" + id).addEventListener("mousedown", (e) => e.preventDefault()); $("#" + id).addEventListener("click", () => stepSize(d)); }
  const ALIGNS = ["left", "center", "right", "justify"], ALIGN_CMD = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" };
  const ALIGN_ICON = { left: "M3 5h14M3 9h9M3 13h14M3 17h9", center: "M3 5h14M5.5 9h9M3 13h14M5.5 17h9", right: "M3 5h14M8 9h9M3 13h14M8 17h9", justify: "M3 5h14M3 9h14M3 13h14M3 17h9" };
  $("#alignBtn").addEventListener("mousedown", (e) => e.preventDefault());
  $("#alignBtn").addEventListener("click", () => { const cur = $("#alignBtn").dataset.align || "left"; const nx = ALIGNS[(ALIGNS.indexOf(cur) + 1) % 4]; A.CMDS[ALIGN_CMD[nx]](); setAlignIcon(nx); });
  function setAlignIcon(a) { const b = $("#alignBtn"); b.dataset.align = a; b.querySelector("path").setAttribute("d", ALIGN_ICON[a] || ALIGN_ICON.left); b.title = `Alignment: ${a} (click to change)`; }
  function refreshExtras() {
    const s = getSelection();
    const n = s.rangeCount && editor.contains(s.anchorNode) ? s.anchorNode : null;
    const el = n ? (n.nodeType === 3 ? n.parentElement : n) : null;
    if (!el) return;
    const cs = getComputedStyle(el);
    const al = cs.textAlign === "start" ? "left" : cs.textAlign === "end" ? "right" : cs.textAlign;
    if (ALIGNS.includes(al)) setAlignIcon(al);
    $("#colorDot").style.background = cs.color;
  }

  /* ---------------- inserting things after the current block ---------------- */
  function currentTop() { return selBlock && selBlock.isConnected ? selBlock : topBlock(A.savedRange()?.startContainer) || editor.lastElementChild; }
  // at: { block, before } puts the new blocks before / after that block (items dropped from the panels), else after
  // the block you are in.
  function insertAfter(html, { selectText = false, at = null } = {}) {
    let nodes = [];
    A.change(() => {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      nodes = [...tmp.children];
      const ref = at ? (at.block && at.block.isConnected ? at.block : null) : currentTop();
      const empty = ref && ref.matches("p") && !ref.textContent.trim() && !ref.querySelector("img");
      if (ref && empty) ref.replaceWith(...nodes); else if (ref && at?.before) ref.before(...nodes); else if (ref) ref.after(...nodes); else editor.append(...nodes);
    });
    const last = nodes[nodes.length - 1];
    if (last) {
      if (selectText && last.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(last.matches("ul,ol,blockquote") ? last.querySelector("li,p") : last); const s = getSelection(); s.removeAllRanges(); s.addRange(r); A.rememberSelection(); }
      else caretInto(last, false);
      select(last);
      last.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    if (innerWidth < 760) shell?.closePanel?.();
    return nodes;
  }
  const imgHtml = (svg, w, alt) => `<p class="imgp" style="text-align:center"><img src="${svgDataUrl(svg)}" alt="${escHtml(alt)}" style="width:${w}px"></p>`;
  // Insert adapter for the shared left-rail panels (Elements, Text, Tools): Docs blocks for every kit item (insert.js).
  const kitInsert = makeDocsInsert({
    A, editor, viewer, blockAt, currentTop, topBlock, select, escHtml, svgDataUrl, modelToHtml, FONT_FAMILIES, ensureFont,
    insertAt: (html, o) => { const n = insertAfter(html, o); return n; },
    setPageNumbers: (on) => A.setPageNumbers?.(on),
  });

  /* ---------------- panels ---------------- */
  const sec = (el, title) => { const h = document.createElement("h3"); h.className = "dp-h"; h.textContent = title; el.append(h); const g = document.createElement("div"); g.className = "dp-grid"; el.append(g); return g; };
  const tile = (g, { label, html, data, onClick, wide }) => { const b = Object.assign(document.createElement("button"), { type: "button", className: "dp-tile" + (wide ? " wide" : "") }); b.innerHTML = html; b.title = label; b.setAttribute("aria-label", label); for (const [k, v] of Object.entries(data || {})) b.dataset[k] = v; b.addEventListener("mousedown", (e) => e.preventDefault()); b.addEventListener("click", onClick); g.append(b); return b; };
  const pic = (svg) => `<img alt="" src="${svgDataUrl(svg)}">`;

  function renderElements(el) {
    el.innerHTML = "";
    el.classList.add("docs-panel");
    const colorRow = document.createElement("label");
    colorRow.className = "dp-color";
    colorRow.innerHTML = 'Shape colour <input type="color" value="#5b4cf0" aria-label="Shape colour">';
    el.append(colorRow);
    const shapeColor = () => colorRow.querySelector("input").value;
    let g = sec(el, "Shapes");
    for (const [id, s] of Object.entries(SHAPES)) tile(g, { label: s.label, html: pic(s.svg("#5b4cf0")), data: { el: "shape:" + id }, onClick: () => insertAfter(imgHtml(s.svg(shapeColor()), s.w, s.label)) });
    g = sec(el, "Lines and dividers");
    const lineSec = g;
    tile(g, { label: "Simple divider", html: "<span class='dp-line'></span>", data: { el: "line:hr" }, onClick: () => insertAfter("<hr>") });
    for (const [id, s] of Object.entries(LINES)) tile(g, { label: s.label, html: pic(s.svg("#5b4cf0")), data: { el: "line:" + id }, onClick: () => insertAfter(imgHtml(s.svg(shapeColor()), s.w, s.label)) });
    g = sec(el, "Tables");
    for (const [r, c, label, extra] of [[2, 2, "Table 2 × 2", {}], [3, 3, "Table 3 × 3", {}], [4, 3, "Table 4 × 3", {}], [3, 2, "Lined table", { tstyle: "lines" }], [3, 3, "Coloured header table", { accent: "#a7e8c5" }]]) {
      const rows = Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => ({ runs: i === 0 ? [{ text: "Heading " + (j + 1) }] : [] })));
      tile(g, { label, html: `<span class="dp-table" style="--c:${c};--r:${r}${extra.accent ? ";--a:" + extra.accent : ""}">${"<i></i>".repeat(r * c)}</span><small>${label}</small>`, data: { el: `table:${r}x${c}${extra.tstyle ? "-lines" : extra.accent ? "-accent" : ""}` }, onClick: () => insertAfter(modelToHtml([{ type: "table", header: true, rows, ...extra }], { editor: true })) });
    }
    for (const [hs, label] of [["dashed", "Dashed divider"], ["dotted", "Dotted divider"], ["double", "Double divider"], ["thick", "Thick divider"]]) {
      const lineCss = { dashed: "2px dashed", dotted: "3px dotted", double: "4px double", thick: "4px solid" }[hs];
      tile(lineSec, { label, html: `<span class='dp-line' style='border-top:${lineCss} #5b4cf0;background:none;height:0'></span>`, data: { el: "line:hr-" + hs }, onClick: () => insertAfter(hrStyled(hs)) });
    }
    g = sec(el, "Highlight blocks");
    for (const k of Object.keys(HIGHLIGHTS)) { const [t, bg, bc] = HIGHLIGHTS[k]; tile(g, { label: "Highlight block: " + t, wide: true, html: `<span class="dp-band" style="background:${bg};color:${bc};border:2px solid ${bc};border-radius:10px"><b>${t}</b></span>`, data: { el: "highlight:" + k }, onClick: () => insertAfter(highlightHtml(k), { selectText: true }) }); }
    g = sec(el, "Columns");
    for (const [k, label] of [["cols2", "2 columns"], ["cols3", "3 columns"], ["cols4", "4 columns"], ["sideL", "Left sidebar"], ["sideR", "Right sidebar"], ["sides3", "3 columns with sidebars"]]) {
      tile(g, { label, html: `<span class="dp-cols">${COLS[k].map((w) => `<i style="flex:${w}"></i>`).join("")}</span><small>${label}</small>`, data: { el: "cols:" + k }, onClick: () => insertAfter(colsHtml(k)) });
    }
    g = sec(el, "Dropdowns");
    for (const d of allDd()) tile(g, { label: "Dropdown: " + d.name, wide: true, html: `<span class="dp-txt"><b style="color:${d.options[0].fg};background:${d.options[0].bg};padding:1px 6px;border-radius:4px">${escHtml(d.options[0].label)} ▾</b> <small>${escHtml(d.name)}</small></span>`, data: { el: "dd:" + d.id }, onClick: () => { const b = currentTop(); if (b) { A.placeCaret(b, false); A.change(() => A.exec("insertHTML", chipHtml(optArr(d.options[0])) + "&nbsp;")); } } });
    tile(g, { label: "Create a dropdown", wide: true, html: "<span class='dp-txt'>+ Create dropdown</span>", data: { el: "dd:create" }, onClick: () => openDropdownEditor(null, currentTop()) });
    g = sec(el, "Dates");
    for (const [n, label] of [[0, "Today"], [1, "Tomorrow"], [-1, "Yesterday"]]) tile(g, { label: label + "'s date", html: `<span class='dp-txt'><b style="color:#5b4cf0">${escHtml(dayFrom(n))}</b><br><small>${label}</small></span>`, data: { el: "date:" + n }, onClick: () => insertAfter(dateHtml(dayFrom(n)), { selectText: true }) });
    g = sec(el, "Checklists and lists");
    tile(g, { label: "Checklist", html: "<span class='dp-txt'>☐ To do<br>☑ Done</span>", data: { el: "list:check" }, onClick: () => insertAfter(modelToHtml([{ type: "li", list: "check", level: 0, runs: [{ text: "First task" }] }, { type: "li", list: "check", level: 0, runs: [{ text: "Second task" }] }, { type: "li", list: "check", level: 0, checked: true, runs: [{ text: "Done task" }] }], { editor: true }), { selectText: true }) });
    tile(g, { label: "Bullet list", html: "<span class='dp-txt'>• One<br>• Two</span>", data: { el: "list:bullet" }, onClick: () => insertAfter("<ul><li>First point</li><li>Second point</li></ul>", { selectText: true }) });
    tile(g, { label: "Numbered list", html: "<span class='dp-txt'>1. One<br>2. Two</span>", data: { el: "list:number" }, onClick: () => insertAfter("<ol><li>First step</li><li>Second step</li></ol>", { selectText: true }) });
    g = sec(el, "Coloured blocks");
    for (const [id, bg, fg, deco, dc, dc2] of [["green", "#24453a", "#f3efe6", "petals", "#a7e8c5", "#f3efe6"], ["mint", "#a7e8c5", "#1d3a30", "diamonds", "#24453a", "#24453a"], ["navy", "#12355b", "#ffffff", "waves", "#9cc3ff", "#2f80ff"], ["violet", "#ede9fe", "#4c1d95", "dots", "#7c3aed", "#7c3aed"], ["sun", "#fef3c7", "#92400e", "sun", "#f59e0b", "#fb923c"], ["coral", "#ff7a59", "#ffffff", "circles", "#ffd166", "#fff1e6"]]) {
      const b = { type: "h2", bg, deco, dc, dc2, pad: 12, runs: [{ text: "Section title", color: fg }] };
      tile(g, { label: "Coloured heading block", wide: true, html: `<span class="dp-band" style="background:${bg};color:${fg}">Section title<img alt="" src="${svgDataUrl(decoSvg(deco, dc, dc2))}"></span>`, data: { el: "band:" + id }, onClick: () => insertAfter(modelToHtml([b], { editor: true }), { selectText: true }) });
    }
    g = sec(el, "Charts");
    for (const [id, s] of Object.entries(CHARTS)) tile(g, { label: s.label, html: pic(s.svg("#5b4cf0")), data: { el: "chart:" + id }, onClick: () => insertAfter(imgHtml(s.svg(shapeColor()), s.w, s.label)) });
    g = sec(el, "Stickers");
    for (const [id, s] of Object.entries(STICKERS)) tile(g, { label: s.label, html: pic(s.svg()), data: { el: "sticker:" + id }, onClick: () => insertAfter(imgHtml(s.svg(), s.w, s.label)) });
    const emb = sec(el, "Your designs (embed)");
    emb.id = "embedSection";
    emb.classList.add("one");
    fillDesigns(emb);
    g = sec(el, "Emoji");
    g.classList.add("emoji");
    for (const e of EMOJI) tile(g, { label: "Emoji " + e, html: `<span class="dp-emoji">${e}</span>`, data: { el: "emoji" }, onClick: () => { A.restoreSelection(); A.change(() => A.exec("insertText", e)); } });
    // In the editor frame the shared kit's Elements panel has the shapes, lines, tables, charts and stickers (they insert
    // as Docs blocks): this part keeps the document's own blocks (Canva Docs has them too).
    if (shell) {
      colorRow.remove();
      for (const hd of [...el.querySelectorAll("h3.dp-h")]) if (["Shapes", "Lines and dividers", "Tables", "Charts", "Stickers"].includes(hd.textContent)) { hd.nextElementSibling?.remove(); hd.remove(); }
    }
  }

  const PAIRS = [["serif-sans", "Serif headings + Sans body", "serif", "sans"], ["sans-serif", "Sans headings + Serif body", "sans", "serif"], ["cambria-calibri", "Cambria + Calibri", "cambria", "calibri"], ["calibri-cambria", "Calibri + Cambria", "calibri", "cambria"], ["mono-sans", "Mono headings + Sans body", "mono", "sans"], ["serif-serif", "Classic serif", "serif", "serif"]];
  function applyPair(head, body) {
    ensureFont(head); ensureFont(body); ensureFont(head, true);
    A.change(() => {
      for (const h of $$("h1,h2,h3", editor)) {
        for (const s of $$("[style]", h)) s.style.fontFamily = "";
        const span = document.createElement("span");
        span.style.fontFamily = FONT_FAMILIES[head].css;
        span.append(...h.childNodes);
        h.append(span);
      }
    });
    A.setDocFont(body);
    A.toast("Font pair applied.");
  }
  function renderText(el) {
    el.innerHTML = "";
    el.classList.add("docs-panel");
    const g = sec(el, "Text styles");
    g.classList.add("one");
    const add = (data, label, html, cls) => tile(g, { label, html: `<span class="${cls}">${html}</span>`, data: { text: data }, wide: true, onClick: () => insertAfter(html2[data], { selectText: true }) });
    const html2 = {
      h1: "<h1>Add a heading</h1>", h2: "<h2>Add a subheading</h2>", h3: "<h3>Add a small heading</h3>", p: "<p>Add a little bit of body text</p>",
      quote: "<blockquote><p>Add a quote that stands out</p></blockquote>", bullet: "<ul><li>Add a list item</li></ul>", number: "<ol><li>Add a step</li></ol>",
      band: modelToHtml([{ type: "h2", bg: "#a7e8c5", deco: "diamonds", dc: "#24453a", pad: 12, runs: [{ text: "Add a coloured heading", color: "#1d3a30" }] }], { editor: true }),
    };
    add("h1", "Heading", "Add a heading", "t-h1"); add("h2", "Subheading", "Add a subheading", "t-h2"); add("h3", "Small heading", "Add a small heading", "t-h3");
    add("p", "Body text", "Add a little bit of body text", "t-p"); add("quote", "Quote", "“Add a quote”", "t-q"); add("bullet", "Bulleted list", "• Add a list item", "t-p");
    add("number", "Numbered list", "1. Add a step", "t-p"); add("band", "Coloured heading", "Add a coloured heading", "t-band");
    // In the editor frame the kit's Text panel has the heading, subheading and body text styles.
    if (shell) for (const b of [...g.querySelectorAll('[data-text="h1"],[data-text="h2"],[data-text="p"]')]) b.remove();
    // Font pairs are in Design › Styles in the editor frame (Canva); here only without the frame.
    if (!shell) fontPairs(el);
  }
  function fontPairs(el) {
    const g2 = sec(el, "Font pairs");
    g2.classList.add("one");
    for (const [id, label, h, b] of PAIRS) tile(g2, { label, wide: true, data: { pair: id }, html: `<span class="t-pair"><b style="font-family:${FONT_FAMILIES[h].css.replace(/"/g, "'")}">${escHtml(label.split(" + ")[0])}</b><span style="font-family:${FONT_FAMILIES[b].css.replace(/"/g, "'")}">Body text in ${escHtml(FONT_FAMILIES[b].label.replace(/ \(.*\)/, ""))}</span></span>`, onClick: () => applyPair(h, b) });
  }
  // Design › Styles (Canva): colour palettes for the headings and font pairs for the whole document.
  const HEAD_PALETTES = [["forest", "Forest", "#24453a", "#3f6b5a"], ["harbour", "Harbour", "#12355b", "#2f80ff"], ["plum", "Plum", "#4c1d95", "#7c3aed"], ["coral", "Coral", "#9a3412", "#ff7a59"], ["lagoon", "Lagoon", "#0f766e", "#14b8a6"], ["espresso", "Espresso", "#3d2a1e", "#c99a4b"], ["royal", "Royal", "#1e3a8a", "#60a5fa"], ["rose", "Rose", "#9d174d", "#f472b6"], ["sunbeam", "Sunbeam", "#92400e", "#f59e0b"], ["slate", "Slate", "#334155", "#64748b"], ["ink", "Classic ink", "#1b2133", "#475569"], ["violet", "Violet", "#5b4cf0", "#8b80f5"]];
  function applyHeadColors(dark, mid) {
    const heads = $$("h1,h2,h3", editor).filter((x) => !x.closest(".band") && !x.matches(".band"));
    if (!heads.length) { A.toast("Add a heading first: the palette colours your headings."); return; }
    A.change(() => {
      for (const hd of heads) {
        for (const s of $$("[style]", hd)) s.style.color = "";
        const span = document.createElement("span");
        span.style.color = hd.tagName === "H3" ? mid : dark;
        span.append(...hd.childNodes);
        hd.append(span);
      }
    });
    A.toast("Palette applied to the headings.");
  }
  function renderStyles(el) {
    el.innerHTML = "";
    el.classList.add("docs-panel");
    const g = sec(el, "Colour palettes");
    for (const [id, label, dark, mid] of HEAD_PALETTES) tile(g, { label: "Palette " + label, data: { palette: id }, html: `<span class="dp-pal"><i style="background:${dark}"></i><i style="background:${mid}"></i></span><small>${escHtml(label)}</small>`, onClick: () => applyHeadColors(dark, mid) });
    fontPairs(el);
  }
  function counts() { const m = A.syncModel(); const txt = (editor.innerText || "").trim(); const words = txt ? txt.split(/\s+/).length : 0; return { words, chars: txt.replace(/\s/g, "").length, heads: $$("h1,h2,h3", editor).filter((h) => h.textContent.trim()).length, mins: Math.max(1, Math.round(words / 220)), blocks: m.blocks.length }; }
  function renderTools(el) {
    el.innerHTML = "";
    el.classList.add("docs-panel");
    const c = counts();
    const box = document.createElement("div");
    box.className = "dp-count";
    box.id = "toolsCount";
    box.innerHTML = `<div><b>${c.words.toLocaleString()}</b><span>words</span></div><div><b>${c.chars.toLocaleString()}</b><span>characters</span></div><div><b>${c.heads}</b><span>headings</span></div><div><b>${c.mins} min</b><span>reading time</span></div>`;
    el.append(box);
    const g = sec(el, "Tools");
    g.classList.add("one");
    const t = (id, label, fn) => tile(g, { label, wide: true, data: { tool: id }, html: `<span class="dp-tool">${label}</span>`, onClick: fn });
    t("count", "Word count", () => { renderTools(el); A.toast(`${counts().words} words.`); });
    t("find", "Find and replace", () => A.openPanel("find"));
    t("toc", "Insert table of contents", insertToc);
    t("pagebreak", "Insert page break", () => insertAfter('<div class="pb" contenteditable="false" data-pb="1"></div><p><br></p>'));
    t("outline", "Outline", () => A.openPanel("outline"));
    t("page", "Page setup", () => A.openPanel("page"));
    t("magic", "Magic Write", () => A.openPanel("magic"));
    t("present", "Download as presentation PDF", presentationPdf);
    t("deck", "Convert to presentation slides (Studio)", () => openDeck());
    t("versions", "Version history", () => shell?.openPanel?.("versions"));
    t("suggestions", "Suggestions (review, accept, reject)", () => shell?.openPanel?.("suggestions"));
    t("comments", "Comments and @mentions", () => shell?.openPanel?.("comments"));
  }
  function insertToc() {
    const heads = $$("h1,h2,h3", editor).filter((h) => h.textContent.trim());
    if (!heads.length) { A.toast("Add some headings first; the contents list is built from them."); return; }
    const items = heads.map((h) => ({ type: "li", list: "number", level: h.tagName === "H1" ? 0 : h.tagName === "H2" ? (heads.some((x) => x.tagName === "H1") ? 1 : 0) : 1, runs: [{ text: headText(h).slice(0, 120) }] }));
    const html = modelToHtml([{ type: "h2", runs: [{ text: "Contents" }] }, ...items], { editor: true });
    let first = editor.firstElementChild;
    A.change(() => { const tmp = document.createElement("div"); tmp.innerHTML = html; const nodes = [...tmp.children]; if (first && first.matches(".band,h1")) first.after(...nodes); else editor.prepend(...nodes); first = nodes[0]; });
    select(first);
    first.scrollIntoView({ block: "nearest" });
    A.toast("Table of contents added.");
  }
  /* ---------------- "/" and "+" insert menu ---------------- */
  const fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const today = () => fmtDate(new Date());
  const dayFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmtDate(d); };
  // A date stands out like Canva's date chip: bold, in the accent colour (any text colour can be picked after).
  const dateHtml = (s) => `<p><b><span style="color:#5b4cf0">${escHtml(s)}</span></b></p>`;
  // Highlight blocks (Canva: Elements → Highlight blocks): a tinted box with a bold title line.
  const HIGHLIGHTS = { note: ["Note", "#f1f5f9", "#64748b"], info: ["Info", "#e0f2fe", "#0284c7"], tip: ["Tip", "#ecfdf5", "#059669"], warning: ["Warning", "#fff7ed", "#ea580c"], important: ["Important", "#fef2f2", "#dc2626"] };
  const highlightHtml = (k) => { const [t, bg, bc] = HIGHLIGHTS[k]; return modelToHtml([{ type: "p", bg, bd: 2, bc, rad: 10, pad: 14, runs: [{ text: t, b: true, color: bc }, { text: "\nWrite the " + t.toLowerCase() + " here." }] }], { editor: true }); };
  // Columns without borders (Canva: Columns, 2/3/4 columns, left/right sidebar, 3 columns with sidebars).
  const COLS = { cols2: [50, 50], cols3: [33, 34, 33], cols4: [25, 25, 25, 25], sideL: [30, 70], sideR: [70, 30], sides3: [22, 56, 22] };
  const colsHtml = (k) => modelToHtml([{ type: "table", header: false, tstyle: "cols", cw: COLS[k], rows: [COLS[k].map((w, i) => ({ runs: [{ text: COLS[k].length === 2 && w < 50 ? "Sidebar" : COLS[k].length === 3 && w < 30 ? "Sidebar" : "Column " + (i + 1) }] }))] }], { editor: true });
  const hrStyled = (hs) => modelToHtml([{ type: "hr", hs }], { editor: true });
  // Heading styles by Canva's names (H1–H5) and the matching look here.
  const SLASH = [
    ["h1", "Heading 1 · Title", () => "<h1>Heading</h1>"], ["h2", "Heading 2 · Subtitle", () => "<h2>Subheading</h2>"], ["h3", "Heading 3 · Heading", () => "<h3>Small heading</h3>"],
    ["h4", "Heading 4 · Subheading", () => modelToHtml([{ type: "p", runs: [{ text: "Subheading", b: true, size: 13 }] }], { editor: true })],
    ["h5", "Heading 5 · Section header", () => modelToHtml([{ type: "p", lsp: 120, runs: [{ text: "SECTION HEADER", b: true, size: 10, color: "#5b4cf0" }] }], { editor: true })],
    ["p", "Body text", () => "<p>Text</p>"], ["bullet", "Bulleted list", () => "<ul><li>List item</li></ul>"], ["number", "Numbered list", () => "<ol><li>First step</li></ol>"],
    ["check", "Checklist", () => modelToHtml([{ type: "li", list: "check", level: 0, runs: [{ text: "To do" }] }], { editor: true })],
    ["table", "Table", () => modelToHtml([{ type: "table", header: true, rows: [0, 1, 2].map((i) => [0, 1, 2].map((j) => ({ runs: i ? [] : [{ text: "Heading " + (j + 1) }] }))) }], { editor: true })],
    ["columns", "Two columns", () => modelToHtml([{ type: "table", header: false, tstyle: "lines", rows: [[{ runs: [{ text: "Left column" }] }, { runs: [{ text: "Right column" }] }]] }], { editor: true })],
    ["chart", "Chart", () => imgHtml(CHARTS.bars.svg("#5b4cf0"), 420, "Bar chart")], ["image", "Image", null], ["divider", "Divider", () => "<hr>"],
    ["date", "Date", () => `<p>${escHtml(today())}</p>`], ["quote", "Quote", () => "<blockquote><p>Quote</p></blockquote>"],
    ["banner", "Banner / cover", () => modelToHtml([{ type: "h1", bg: "#24453a", deco: "petals", dc: "#a7e8c5", dc2: "#f3efe6", pad: 26, minh: 160, runs: [{ text: "Banner title", color: "#f3efe6", size: 34 }] }], { editor: true })],
    ["pagebreak", "Page break", () => '<div class="pb" contenteditable="false" data-pb="1"></div><p><br></p>'], ["toc", "Table of contents", null],
    ["status", "Status dropdown", null], ["mention", "Mention a person", null], ["embed", "Embed a design", null], ["magic", "Magic Write", null],
    ["tableSize", "Table: choose rows and columns", null],
    ["cols3", "3 columns", () => colsHtml("cols3")], ["cols4", "4 columns", () => colsHtml("cols4")], ["cols2", "2 columns (no lines)", () => colsHtml("cols2")],
    ["sideL", "Columns: left sidebar", () => colsHtml("sideL")], ["sideR", "Columns: right sidebar", () => colsHtml("sideR")], ["sides3", "Columns: 3 with sidebars", () => colsHtml("sides3")],
    ["today", "Today's date", () => dateHtml(today())], ["tomorrow", "Tomorrow's date", () => dateHtml(dayFrom(1))], ["yesterday", "Yesterday's date", () => dateHtml(dayFrom(-1))], ["pickDate", "Date: select date…", null],
    ["hlNote", "Highlight block: Note", () => highlightHtml("note")], ["hlInfo", "Highlight block: Info", () => highlightHtml("info")], ["hlTip", "Highlight block: Tip", () => highlightHtml("tip")],
    ["hlWarning", "Highlight block: Warning", () => highlightHtml("warning")], ["hlImportant", "Highlight block: Important", () => highlightHtml("important")],
    ["ddRating", "Dropdown: Rating", null], ["ddEffort", "Dropdown: Effort", null], ["ddTiming", "Dropdown: Timing", null], ["ddApproval", "Dropdown: Approval", null], ["ddPriority", "Dropdown: Priority", null], ["ddCreate", "Dropdown: + Create dropdown", null],
    ["hrDashed", "Divider: dashed", () => hrStyled("dashed")], ["hrDotted", "Divider: dotted", () => hrStyled("dotted")], ["hrDouble", "Divider: double", () => hrStyled("double")], ["hrThick", "Divider: thick", () => hrStyled("thick")],
  ];
  let slashFor = null, slashMode = "after", slashIdx = 0;
  function slashItems(filter = "") { const f = filter.toLowerCase(); return SLASH.filter(([id, label]) => !f || label.toLowerCase().includes(f) || id.toLowerCase().startsWith(f)); }
  function drawSlash(filter = "") {
    slash.replaceChildren();
    const items = slashItems(filter);
    items.forEach(([id, label], i) => { const b = Object.assign(document.createElement("button"), { type: "button", textContent: label, className: i === slashIdx ? "on" : "" }); b.dataset.slash = id; b.setAttribute("role", "menuitem"); slash.append(b); });
    if (!items.length) slash.append(Object.assign(document.createElement("p"), { className: "muted small", textContent: "Nothing matches." }));
  }
  function openSlash(b, mode) {
    slashFor = b; slashMode = mode; slashIdx = 0;
    drawSlash("");
    slash.hidden = false;
    const r = relRect(b);
    Object.assign(slash.style, { top: r.bottom + 4 + "px", left: Math.max(4, r.left) + "px" });
  }
  const closeSlash = () => { slash.hidden = true; slashFor = null; };
  function chooseSlash(id) {
    const b = slashFor, mode = slashMode;
    closeSlash();
    if (!b || !b.isConnected) return;
    if (mode === "replace") A.change(() => { b.innerHTML = "<br>"; });
    select(b);
    if (id === "image") { A.placeCaret(b, false); A.CMDS.image(); return; }
    if (id === "toc") { insertToc(); return; }
    if (id === "status") { A.placeCaret(b, false); A.change(() => A.exec("insertHTML", chipHtml(CHIPS[0]) + "&nbsp;")); return; }
    if (/^dd[A-Z]/.test(id) && id !== "ddCreate") { const g = PRESET_DD.find((x) => x.id === id.slice(2).toLowerCase()); if (g) { A.placeCaret(b, false); A.change(() => A.exec("insertHTML", chipHtml(optArr(g.options[0])) + "&nbsp;")); } return; }
    if (id === "ddCreate") { openDropdownEditor(null, b); return; }
    if (id === "tableSize") { openMiniForm(b, "table"); return; }
    if (id === "pickDate") { openMiniForm(b, "date"); return; }
    if (id === "mention") { openPeoplePicker(b); return; }
    if (id === "magic") { A.placeCaret(b, false); A.openPanel("magic"); return; }
    if (id === "embed") { shell?.openPanel?.("elements"); const g = document.querySelector("#embedSection"); if (g) fillDesigns(g); setTimeout(() => document.querySelector("#embedSection")?.scrollIntoView({ block: "start" }), 120); return; }
    const item = SLASH.find((x) => x[0] === id);
    if (item?.[2]) insertAfter(item[2](), { selectText: !["chart", "divider", "pagebreak", "table", "columns"].includes(id) });
  }
  slash.addEventListener("mousedown", (e) => { if (!e.target.closest(".mini-form")) e.preventDefault(); }); // the small forms need focus
  slash.addEventListener("click", (e) => { const t = e.target.closest("[data-slash]"); if (t) chooseSlash(t.dataset.slash); });
  addBtn.addEventListener("mousedown", (e) => e.preventDefault());
  addBtn.addEventListener("click", () => { const b = blocks()[+addBtn.dataset.for] || hoverBlock || selBlock; if (!b) return; if (!slash.hidden && slashFor === b) { closeSlash(); return; } openSlash(b, "after"); });
  const slashCheck = () => {
    const s = getSelection();
    const b = s.rangeCount ? topBlock(s.anchorNode) : null;
    const t = b && b.matches("p") ? b.textContent : "";
    if (t.startsWith("/") && t.length <= 24 && !t.includes(" /")) { if (slash.hidden || slashFor !== b) openSlash(b, "replace"); slashIdx = 0; drawSlash(t.slice(1)); }
    else if (!slash.hidden && slashMode === "replace") closeSlash();
  };
  editor.addEventListener("input", slashCheck);
  editor.addEventListener("keyup", (e) => { if (e.key === "/" || (!slash.hidden && e.key.length === 1)) slashCheck(); });
  editor.addEventListener("keydown", (e) => {
    if (slash.hidden) return;
    const items = [...slash.querySelectorAll("[data-slash]")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); slashIdx = (slashIdx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length); items.forEach((x, i) => x.classList.toggle("on", i === slashIdx)); }
    else if (e.key === "Enter" && items.length) { e.preventDefault(); e.stopPropagation(); chooseSlash(items[slashIdx]?.dataset.slash || items[0].dataset.slash); }
    else if (e.key === "Escape") { e.preventDefault(); closeSlash(); }
  }, true);
  document.addEventListener("click", (e) => { if (!e.target.closest("#slashMenu,#blockAdd")) closeSlash(); });

  async function openDeck() {
    try {
      const { openAsDeck } = await import("./deck.js");
      await A.flushSave();
      await openAsDeck(A.syncModel());
      A.toast("Your slides opened in Studio (a new tab).");
    } catch (e) { console.warn(e); A.toast("The slides could not be made: " + (e?.message || "please try again.")); }
  }
  // Share → Website (Canva Docs: publish the doc as a website). AsaanDesk does not host sites, so this makes the
  // ready-to-host page (index.html) to upload to any web host or your own domain. Nothing is uploaded from here.
  function openPublish() {
    let dlg = $("#publishDlg");
    if (!dlg) {
      dlg = Object.assign(document.createElement("dialog"), { id: "publishDlg", className: "ad-panel publish-dlg" });
      dlg.setAttribute("aria-labelledby", "publishTitle");
      dlg.innerHTML = `<form method="dialog" class="publish-form"><h2 id="publishTitle">Publish as a website</h2>
        <p class="muted small">Your doc becomes one web page (index.html) with everything inside it. Upload it to any web host or your own domain, and it is live. AsaanDesk does not host websites, and nothing is uploaded from here.</p>
        <label class="field">Page title (shown in search results and browser tabs) <input class="ad-input" name="ptitle" maxlength="120" required></label>
        <label class="field">Description (shown in search results and link previews) <textarea class="ad-input" name="desc" rows="3" maxlength="300"></textarea></label>
        <label class="chk"><input type="checkbox" name="fade" checked> Fade banners and pictures in as people scroll</label>
        <div class="ai-row"><button class="btn primary" value="go" type="submit">Download website (index.html)</button><button class="btn" value="cancel" type="submit">Cancel</button></div></form>`;
      document.body.append(dlg);
      dlg.addEventListener("close", () => {
        if (dlg.returnValue !== "go") return;
        const f = dlg.querySelector("form");
        const doc = withoutSuggestions(JSON.parse(JSON.stringify(A.syncModel())));
        const html = exportHtmlPage(doc, { title: f.ptitle.value.trim() || doc.title, description: f.desc.value, scrollFade: f.fade.checked });
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })), download: "index.html" });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        A.toast("Website downloaded (index.html). Upload it to your web host to publish it.", 6000);
      });
    }
    const f = dlg.querySelector("form");
    const d = A.syncModel();
    f.ptitle.value = d.title || "Untitled document";
    if (!f.desc.value) f.desc.value = (d.blocks.find((b) => b.type === "p" && b.runs?.length)?.runs || []).map((r) => r.text).join("").slice(0, 200);
    dlg.returnValue = "";
    dlg.showModal();
  }
  async function presentationPdf() {
    const d = JSON.parse(JSON.stringify(A.syncModel()));
    const out = [];
    d.blocks.forEach((b, i) => { if (i && (b.type === "h1" || b.type === "h2") && out.length && out[out.length - 1].type !== "pagebreak") out.push({ type: "pagebreak" }); out.push(b); });
    d.blocks = out;
    d.page = { ...d.page, size: "Slides", margin: 15, header: "", pageNumbers: true };
    await A.downloadPdfOf(d, " (presentation)");
  }

  function setPageSize(size) { $("#pageSize").value = size; $("#pageSize").dispatchEvent(new Event("change", { bubbles: true })); A.toast(`Page size: ${PAGE_SIZES[size].label}.`); }
  // Magic Switch popover (top bar).
  const ms = document.createElement("div");
  ms.className = "tpop ad-panel ms-pop";
  ms.id = "magicSwitchPop";
  ms.hidden = true;
  ms.innerHTML = `<p class="pop-h">Magic Switch</p><p class="muted small">Change the page or turn this doc into something else.</p>
    <div class="pop-list"><button type="button" data-ms="A4">A4 page</button><button type="button" data-ms="Letter">US Letter page</button><button type="button" data-ms="Legal">US Legal page</button><button type="button" data-ms="A3">A3 page</button><button type="button" data-ms="Digital">Digital doc (wide, no page edges)</button><button type="button" data-ms="Pageless">Pageless (one continuous page)</button>
    <button type="button" data-ms="deck">Presentation slides (opens in Studio, editable)</button><button type="button" data-ms="present">Presentation-style PDF (one section per slide)</button><button type="button" data-ms="docx">Word document (.docx)</button><button type="button" data-ms="pdf">PDF document</button></div>`;
  document.body.append(ms);
  ms.addEventListener("click", (e) => {
    e.stopPropagation();
    const b = e.target.closest("[data-ms]"); if (!b) return;
    ms.hidden = true;
    const v = b.dataset.ms;
    if (PAGE_SIZES[v]) setPageSize(v); else if (v === "deck") openDeck(); else if (v === "present") presentationPdf(); else A.doExport(v);
  });
  function openMagicSwitch(anchor) {
    const open = ms.hidden;
    closePops();
    if (!open) return;
    ms.hidden = false;
    const r = (anchor || document.body).getBoundingClientRect();
    ms.style.top = Math.min(innerHeight - 60, r.bottom + 8) + "px";
    ms.style.left = Math.max(8, Math.min(innerWidth - ms.offsetWidth - 8, r.left)) + "px";
  }
  document.addEventListener("click", (e) => { if (!e.target.closest("#magicSwitchPop") && !e.target.closest('[data-ads="resize"], [data-ads="more"]')) ms.hidden = true; }, true);

  function renderOutline(el) {
    el.innerHTML = "";
    el.classList.add("docs-outline");
    const heads = $$("h1,h2,h3", editor).filter((h) => h.textContent.trim());
    if (!heads.length) { el.innerHTML = '<p class="muted small">No headings yet. Use H1, H2 or H3 in the toolbar.</p>'; return; }
    for (const h of heads) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "ol-item l" + h.tagName[1], textContent: headText(h) });
      b.dataset.outline = h.tagName.toLowerCase();
      b.addEventListener("click", () => { h.scrollIntoView({ block: "start", behavior: "smooth" }); A.placeCaret(h, true); select(h); });
      el.append(b);
    }
  }

  // Pages (for the bottom bar): estimated from the page height.
  const pagePx = () => (PAGE_SIZES[A.state.doc.page.size] || PAGE_SIZES.A4).h * 96 / 25.4 * A.state.zoom;
  const pageCount = () => Math.max(1, Math.ceil(paper.getBoundingClientRect().height / pagePx() - 0.02));
  const pageCur = () => Math.min(pageCount() - 1, Math.max(0, Math.floor((viewer.scrollTop + 10) / pagePx())));

  /* ---------------- text for Translate ---------------- */
  let textMode = "doc";
  function getText() {
    const s = getSelection();
    if (s.rangeCount && editor.contains(s.anchorNode) && !s.isCollapsed && s.toString().trim()) { textMode = "sel"; A.rememberSelection(); return s.toString(); }
    if (selBlock && selBlock.textContent.trim()) { textMode = "block"; return selBlock.innerText; }
    textMode = "doc";
    return editor.innerText;
  }
  function setText(str) {
    if (textMode === "sel") { A.restoreSelection(); A.change(() => A.exec("insertText", str)); }
    else if (textMode === "block" && selBlock) { const b = selBlock; A.change(() => { const t = b.matches("table,ul,ol") ? null : b; if (t) t.textContent = str; }); }
    else A.setDoc(textToModel(str, A.state.doc.title));
  }

  /* ---------------- the shell ---------------- */
  async function mount() {
    let mod = null;
    try { mod = await import("../shared/editor-shell.js"); } catch { mod = null; }
    if (!mod?.mountShell) { document.body.classList.add("no-shell"); return null; }
    const stage = $("#docStage");
    try {
      shell = mod.mountShell({
        app: "docs", kind: "Doc",
        title: A.state.doc.title || "Untitled document",
        onTitle: (t) => A.setTitle(t),
        home: "/tools/docs",
        stage,
        toolbar: $("#toolbar"),
        formulaBar: null,
        resize: { label: "Magic Switch", open: (anchor) => openMagicSwitch(anchor) },
        file: [
          { label: "New document", act: () => A.newDocument() },
          { label: "Open recent…", act: () => A.openPanel("recent") },
          { label: "Import a file (.docx, .md, .html, .txt)…", act: () => $("#importInput").click() },
          { label: "Templates", act: () => shell.openPanel("templates") },
          { label: "Save now", act: () => A.flushSave().then(() => A.toast("Saved on this device.")) },
          { label: "Page setup", act: () => A.openPanel("page") },
          { label: "Find and replace", act: () => A.openPanel("find") },
          { label: "Version history", act: () => shell.openPanel("versions") },
          { label: "Convert to presentation (Studio)", act: () => openDeck() },
          { label: "Suggesting mode (on / off)", act: () => { suggest.setOn(!suggest.on); A.toast(suggest.on ? "Suggesting is on." : "Suggesting is off."); } },
          { label: "Review suggestions", act: () => shell.openPanel("suggestions") },
          { label: "Comments", act: () => shell.openPanel("comments") },
          { label: "Word (.docx)", group: "Download", act: () => A.doExport("docx") },
          { label: "PDF (.pdf)", group: "Download", act: () => A.doExport("pdf") },
          { label: "Presentation-style PDF", group: "Download", act: presentationPdf },
          { label: "Web page (.html)", group: "Download", act: () => A.doExport("html") },
          { label: "Markdown (.md)", group: "Download", act: () => A.doExport("md") },
          { label: "Plain text (.txt)", group: "Download", act: () => A.doExport("txt") },
          { label: "AsaanDesk file (.json)", group: "Download", act: () => A.doExport("json") },
          { label: "Print", act: () => A.doExport("print") },
        ],
        share: { sizes: [{ value: "", label: "Same as the document" }, { value: "A4", label: "A4 (21 × 29.7 cm)" }, { value: "Letter", label: "Letter (8.5 × 11 in)" }, { value: "Legal", label: "Legal (8.5 × 14 in)" }, { value: "A3", label: "A3 (29.7 × 42 cm)" }],
          website: { label: "Website", act: () => openPublish() },
          download: [{ label: "PDF", sized: true, act: (o) => A.doExport("pdf", o) }, { label: "Word (.docx)", sized: true, act: (o) => A.doExport("docx", o) }, { label: "Web page (.html)", act: () => A.doExport("html") }, { label: "Markdown (.md)", act: () => A.doExport("md") }, { label: "Plain text (.txt)", act: () => A.doExport("txt") }], link: () => location.href },
        templates: { gallery, tool: "docs", apply: async (id) => { const ok = await A.openTemplate(id); if (ok) { const t = gallery.templateMeta(id); A.toast(`“${t?.name || id}” is ready. Change any text.`); } return !!ok; }, placeholder: "Search Doc templates" },
        panels: {
          elements: { render: (el) => renderElements(el), kitLabel: "Document blocks" }, text: (el) => renderText(el), tools: (el) => renderTools(el),
          comments: { label: "Comments", icon: "comment", render: (el) => comments.renderPanel(el), refresh: true },
          suggestions: { label: "Suggestions", icon: "✎", render: (el) => suggest.renderPanel(el), refresh: true },
          versions: { label: "Version history", icon: "🕘", render: (el) => versions.renderPanel(el), refresh: true },
        },
        rail: ["templates", "elements", "text", "brand", "uploads", "tools", "projects", "apps", "translate"],
        insert: {
          ...kitInsert,
          text: (spec, pt) => { if (typeof spec !== "string") return kitInsert.text(spec, pt); const style = pt; const tag = /^h[1-3]$/.test(style || "") ? style : style === "heading" ? "h2" : "p"; insertAfter(`<${tag}>${escHtml(spec)}</${tag}>`, { selectText: true }); },
          color: (hex) => { A.restoreSelection(); fire("textColor", hex); },
          font: (family) => { if (FONT_FAMILIES[family]) { A.restoreSelection(); fire("fontFamily", family); } },
        },
        magicWrite: () => A.openPanel("magic"),
        // Design panel tab next to Templates: Styles (heading colour palettes and font pairs).
        design: { styles: (el) => renderStyles(el) },
        // Brand panel › Apply brand to the whole document: the brand's heading / body fonts and its main colour on headings.
        applyBrand: (kit) => {
          const k = kit || {}, cols = (k.colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c) && !/^#(?:f{6}|0{6})$/i.test(c));
          const did = [];
          if (k.fonts && FONT_FAMILIES[k.fonts.heading || "sans"] && FONT_FAMILIES[k.fonts.body || "sans"]) { applyPair(k.fonts.heading || "sans", k.fonts.body || "sans"); did.push("brand fonts"); }
          if (cols.length && $$("h1,h2,h3", editor).length) { applyHeadColors(cols[0], cols[1] || cols[0]); did.push("heading colours"); }
          return did.length ? `Brand applied: ${did.join(" and ")}.` : "Nothing to change: add brand colours or fonts first.";
        },
        getText, setText,
        projects: { save: async () => { await A.flushSave(); const d = A.syncModel(); return { id: A.state.id, name: d.title, data: JSON.parse(JSON.stringify(d)), thumb: "" }; }, open: async (rec) => { if (rec?.data) A.setDoc(rec.data, { id: rec.id }); } },
        bottom: {
          notes: true, timer: true, fullscreen: true, help: true,
          outline: (el) => renderOutline(el),
          zoom: { get: () => Math.round(A.state.zoom * 100), set: (pct) => (A.pickZoom || A.setZoom)(pct / 100), min: 25, max: 300 },
          pages: { count: pageCount, current: pageCur, go: (i) => viewer.scrollTo({ top: i * pagePx(), behavior: "smooth" }), add: () => { A.change(() => { editor.append(Object.assign(document.createElement("div"), { className: "pb", contentEditable: "false" }), Object.assign(document.createElement("p"), { innerHTML: "<br>" })); editor.lastElementChild.previousElementSibling.dataset.pb = "1"; }); viewer.scrollTo({ top: viewer.scrollHeight, behavior: "smooth" }); } },
        },
        setMode: (mode) => { editor.contentEditable = mode === "edit" ? "true" : "false"; document.body.dataset.mode = mode; A.toast(mode === "edit" ? "Editing." : mode === "comment" ? "Commenting: click a block to comment on it." : "Viewing only."); },
        // Commenting mode: the frame covers the page; a click asks which block was hit, the comment goes on that block.
        comment: {
          pick: (pt, under) => {
            const b = (under && editor.contains(under) ? topBlock(under) : null) || blockAt(pt.clientY);
            if (!b) return null;
            select(b);
            const label = (b.innerText || b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) || "Block";
            return { id: "blk" + blocks().indexOf(b), label };
          },
          goto: (a) => { const b = blocks()[+String(a?.id || "").replace(/^blk/, "")]; if (b) { b.scrollIntoView({ block: "center", behavior: "smooth" }); select(b); } },
        },
      });
    } catch (e) { console.warn("Editor frame could not start", e); document.body.classList.add("no-shell"); return null; }
    document.body.classList.add("shelled");
    A.onSave((t) => shell?.setSaved?.(/^Saved/.test(t) ? "saved" : /^Saving/.test(t) ? "saving" : "unsaved"));
    A.onRender(() => comments.redraw());
    A.onRender(() => shell?.setTitle?.(A.state.doc.title));
    shell?.setTitle?.(A.state.doc.title);
    // Word count in the bottom bar (Canva Docs shows it with the zoom); click for characters and reading time.
    const wc = document.getElementById("wordCount");
    if (wc && shell?.slots?.bottom) {
      const wb = document.createElement("button");
      wb.type = "button"; wb.className = "ads-bb ads-words"; wb.dataset.ads = "words"; wb.title = "Word count";
      const sync = () => { wb.textContent = wc.textContent || "0 words"; wb.setAttribute("aria-label", `Word count: ${wb.textContent}`); };
      wb.addEventListener("click", () => { const c = (document.getElementById("charCount")?.textContent || "").trim(); const n = parseInt((wc.textContent || "0").replace(/[^\d]/g, ""), 10) || 0; shell.toast(`${wc.textContent}, ${c}, about ${Math.max(1, Math.round(n / 200))} min to read`); });
      sync(); new MutationObserver(sync).observe(wc, { childList: true, characterData: true, subtree: true });
      const grow = shell.slots.bottom.querySelector(".ads-grow");
      shell.slots.bottom.insertBefore(wb, grow || null);
    }
    window.adApp.shell = shell;
    window.adApp.insert = kitInsert;
    Object.assign(window.adApp, { suggest, comments, versions });
    return shell;
  }

  // Fallback (no shell): the same panels inside the app's own side panel.
  function fallbackPanels() {
    for (const [id, title, fn] of [["elements", "Elements", renderElements], ["text", "Text", renderText], ["tools", "Tools", renderTools], ["templates", "Templates", renderTemplatesFallback]]) {
      const s = document.createElement("section");
      s.className = "panel-sec"; s.dataset.panel = id; s.hidden = true; s.id = "panel" + id[0].toUpperCase() + id.slice(1);
      s.innerHTML = `<h2>${title}</h2><div class="pbody"></div>`;
      $("#side").append(s);
      A.onPanel(id, () => fn($(".pbody", s)));
    }
  }
  function renderTemplatesFallback(el) {
    el.innerHTML = "";
    for (const sname of gallery.SECTIONS) {
      const g = sec(el, sname);
      for (const t of gallery.TEMPLATES.filter((x) => x.section === sname)) tile(g, { label: t.name, html: `<img alt="" src="${svgDataUrl(gallery.thumb(t.id))}"><small>${escHtml(t.name)}</small>`, data: { template: t.id }, onClick: () => A.openTemplate(t.id) });
    }
  }

  /* ---------------- round 2: suggesting, comments + mentions, version history, status chips, mentions, embeds ---------------- */
  const api = { ...A, topBlock, getSelBlock: () => selBlock, selectBlock: (b) => { selectWhole(b); }, userName: () => comments?.me?.() || "You" };
  const comments = initComments(api);
  const suggest = initSuggest(api);
  const versions = initVersions(api);
  comments.attachMentions($("#commentText"));
  A.onSave((t) => { if (/^Saved/.test(t)) versions.autoVersion(); });

  // Dropdown chips (Canva: "/" → Dropdown): a coloured "Label ▾" in the text; click it to pick another option.
  // Presets: Status, Rating, Effort, Timing, Approval, Priority; "+ Create dropdown" makes custom ones (kept in the doc).
  const DD_COLORS = [["#334155", "#e2e8f0"], ["#92400e", "#fef3c7"], ["#065f46", "#d1fae5"], ["#991b1b", "#fee2e2"], ["#3730a3", "#e0e7ff"], ["#075985", "#e0f2fe"], ["#9d174d", "#fce7f3"], ["#6b21a8", "#f3e8ff"]];
  const opt = (label, c) => ({ label, fg: DD_COLORS[c][0], bg: DD_COLORS[c][1] });
  const PRESET_DD = [
    { id: "status", name: "Status", options: [opt("Not started", 0), opt("In progress", 1), opt("Done", 2), opt("Blocked", 3), opt("Needs review", 4)] },
    { id: "rating", name: "Rating", options: [opt("Poor", 3), opt("Fair", 1), opt("Good", 5), opt("Very good", 4), opt("Excellent", 2)] },
    { id: "effort", name: "Effort", options: [opt("Small effort", 2), opt("Medium effort", 1), opt("Large effort", 3)] },
    { id: "timing", name: "Timing", options: [opt("This week", 3), opt("Next week", 1), opt("This month", 5), opt("Later", 0)] },
    { id: "approval", name: "Approval", options: [opt("Pending approval", 1), opt("Approved", 2), opt("Changes requested", 7), opt("Rejected", 3)] },
    { id: "priority", name: "Priority", options: [opt("Low priority", 0), opt("Medium priority", 5), opt("High priority", 1), opt("Urgent", 3)] },
  ];
  const optArr = (o) => [o.label, o.fg, o.bg];
  const CHIPS = PRESET_DD[0].options.map(optArr);
  const customDd = () => (Array.isArray(A.state.doc.dropdowns) ? A.state.doc.dropdowns : []);
  const allDd = () => [...customDd(), ...PRESET_DD];
  const chipLabel = (s) => { const t = String(s?.textContent || ""); return t.endsWith(" ▾") ? t.slice(0, -2) : null; };
  const groupOf = (label) => (label == null ? null : allDd().find((g) => g.options.some((o) => o.label === label)) || null);
  const chipHtml = ([label, fg, bg]) => `<b><span style="color:${fg};background-color:${bg}">${escHtml(label)} ▾</span></b>`;
  const chipMenu = Object.assign(document.createElement("div"), { className: "blk-menu ad-panel", id: "chipMenu", hidden: true });
  chipMenu.setAttribute("role", "menu");
  viewer.append(chipMenu);
  let chipFor = null, chipGroup = null;
  function drawChipMenu(g) {
    chipMenu.innerHTML = `<p class="pop-h">${escHtml(g.name)}</p>` + g.options.map((o) => `<button type="button" role="menuitem" data-chip="${escHtml(o.label)}"><span class="chip-dot" style="background:${o.bg};color:${o.fg}">●</span> ${escHtml(o.label)}</button>`).join("")
      + '<button type="button" role="menuitem" data-chip-edit class="chip-edit">Edit options…</button>';
  }
  editor.addEventListener("click", (e) => {
    const s = e.target.closest?.("span");
    const g = s && editor.contains(s) ? groupOf(chipLabel(s)) : null;
    if (!g) { chipMenu.hidden = true; return; }
    chipFor = s; chipGroup = g;
    drawChipMenu(g);
    const r = relRect(s);
    Object.assign(chipMenu.style, { top: r.bottom + 4 + "px", left: r.left + "px" });
    chipMenu.hidden = false;
  });
  chipMenu.addEventListener("mousedown", (e) => e.preventDefault());
  chipMenu.addEventListener("click", (e) => {
    if (e.target.closest("[data-chip-edit]")) { chipMenu.hidden = true; openDropdownEditor(chipGroup, null); return; }
    const b = e.target.closest("[data-chip]");
    if (!b || !chipFor?.isConnected || !chipGroup) return;
    const c = chipGroup.options.find((x) => x.label === b.dataset.chip);
    if (!c) return;
    const s = chipFor;
    A.change(() => { s.textContent = c.label + " ▾"; s.style.color = c.fg; s.style.backgroundColor = c.bg; });
    chipMenu.hidden = true;
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#chipMenu") && !e.target.closest?.("#editor span")) chipMenu.hidden = true; });

  // Dropdown editor: name, options (rename, colour, reorder, delete, "+ Add new option"). Editing a preset makes a
  // custom copy in this document (presets stay as they are); chips with a renamed option follow the new name.
  const ddEd = Object.assign(document.createElement("div"), { className: "ad-panel dd-editor", id: "ddEditor", hidden: true });
  ddEd.setAttribute("role", "dialog");
  ddEd.setAttribute("aria-label", "Edit dropdown");
  viewer.append(ddEd);
  let ddDraft = null, ddInsertAt = null;
  function openDropdownEditor(g, insertAt) {
    ddInsertAt = insertAt;
    const custom = g && customDd().some((x) => x.id === g.id);
    ddDraft = g ? { id: custom ? g.id : "c-" + g.id + "-" + Date.now().toString(36), from: g.id, name: g.name, options: g.options.map((o) => ({ ...o, was: o.label })) }
      : { id: "c-" + Date.now().toString(36), name: "Dropdown", options: [opt("Option 1", 0), opt("Option 2", 2), opt("Option 3", 4)] };
    drawDdEditor();
    ddEd.hidden = false;
    const ref = insertAt && insertAt.isConnected ? relRect(insertAt) : chipFor?.isConnected ? relRect(chipFor) : { bottom: viewer.scrollTop + 80, left: 40 };
    Object.assign(ddEd.style, { top: ref.bottom + 6 + "px", left: Math.max(8, Math.min(ref.left, viewer.clientWidth - 330)) + "px" });
    ddEd.querySelector("input")?.focus();
  }
  function drawDdEditor() {
    const d = ddDraft;
    ddEd.innerHTML = `<label class="field">Dropdown name <input class="ad-input" data-dd-name maxlength="40" value="${escHtml(d.name)}"></label>`
      + `<ol class="dd-opts">${d.options.map((o, i) => `<li data-i="${i}"><select class="ad-input dd-col" aria-label="Colour of ${escHtml(o.label)}">${DD_COLORS.map((c, k) => `<option value="${k}"${c[1] === o.bg ? " selected" : ""} style="background:${c[1]};color:${c[0]}">${["Grey", "Amber", "Green", "Red", "Indigo", "Blue", "Pink", "Purple"][k]}</option>`).join("")}</select>`
      + `<input class="ad-input dd-label" maxlength="40" aria-label="Option ${i + 1}" value="${escHtml(o.label)}"><button type="button" class="tb" data-dd-up title="Move up" aria-label="Move up"${i ? "" : " disabled"}>↑</button><button type="button" class="tb" data-dd-down title="Move down" aria-label="Move down"${i < d.options.length - 1 ? "" : " disabled"}>↓</button><button type="button" class="tb" data-dd-del title="Delete option" aria-label="Delete option"${d.options.length > 1 ? "" : " disabled"}>✕</button></li>`).join("")}</ol>`
      + `<button type="button" class="btn" data-dd-add${d.options.length >= 20 ? " disabled" : ""}>+ Add new option</button>`
      + `<p class="muted small">Custom dropdowns are saved in this document.</p><div class="ai-row"><button type="button" class="btn primary" data-dd-save>${ddInsertAt ? "Insert" : "Save"}</button><button type="button" class="btn" data-dd-cancel>Cancel</button></div>`;
  }
  const readDd = () => {
    ddDraft.name = ddEd.querySelector("[data-dd-name]").value;
    ddEd.querySelectorAll(".dd-opts li").forEach((li) => { const o = ddDraft.options[+li.dataset.i]; o.label = li.querySelector(".dd-label").value.replace(/▾/g, "").trim(); const c = DD_COLORS[+li.querySelector(".dd-col").value] || DD_COLORS[0]; o.fg = c[0]; o.bg = c[1]; });
  };
  ddEd.addEventListener("click", (e) => {
    const li = e.target.closest(".dd-opts li"), i = li ? +li.dataset.i : -1, o = ddDraft?.options;
    if (!o) return;
    if (e.target.closest("[data-dd-up]") && i > 0) { readDd(); [o[i - 1], o[i]] = [o[i], o[i - 1]]; drawDdEditor(); return; }
    if (e.target.closest("[data-dd-down]") && i < o.length - 1) { readDd(); [o[i + 1], o[i]] = [o[i], o[i + 1]]; drawDdEditor(); return; }
    if (e.target.closest("[data-dd-del]") && o.length > 1) { readDd(); o.splice(i, 1); drawDdEditor(); return; }
    if (e.target.closest("[data-dd-add]") && o.length < 20) { readDd(); o.push(opt("Option " + (o.length + 1), o.length % DD_COLORS.length)); drawDdEditor(); ddEd.querySelector(".dd-opts li:last-child .dd-label")?.select(); return; }
    if (e.target.closest("[data-dd-cancel]")) { ddEd.hidden = true; ddDraft = null; return; }
    if (e.target.closest("[data-dd-save]")) saveDropdown();
  });
  function saveDropdown() {
    readDd();
    const d = ddDraft;
    const labels = d.options.map((x) => x.label);
    if (labels.some((l) => !l)) { A.toast("Give every option a name."); return; }
    if (new Set(labels).size !== labels.length) { A.toast("Two options have the same name. Please make them different."); return; }
    const group = { id: d.id, name: d.name.trim() || "Dropdown", options: d.options.map(({ label, fg, bg }) => ({ label, fg, bg })) };
    const list = customDd().filter((x) => x.id !== group.id);
    A.state.doc.dropdowns = [group, ...list].slice(0, 40);
    // Chips in the text follow renamed / recoloured options.
    const renames = new Map(d.options.filter((x) => x.was).map((x) => [x.was, x]));
    A.change(() => {
      for (const s of editor.querySelectorAll("span")) {
        const l = chipLabel(s);
        if (l == null || !renames.has(l)) continue;
        const x = renames.get(l);
        s.textContent = x.label + " ▾"; s.style.color = x.fg; s.style.backgroundColor = x.bg;
      }
      if (ddInsertAt && ddInsertAt.isConnected) { A.placeCaret(ddInsertAt, false); A.exec("insertHTML", chipHtml(optArr(group.options[0])) + "&nbsp;"); }
    });
    A.markDirty?.();
    ddEd.hidden = true; ddDraft = null;
    A.toast(ddInsertAt ? "Dropdown added. Click it to pick an option." : "Dropdown saved.");
  }

  // Small forms in the insert menu: a table of any size (Canva: "/table" with rows and columns), a date from a calendar.
  function openMiniForm(b, kind) {
    slashFor = b; slashMode = "after";
    slash.replaceChildren();
    slash.innerHTML = kind === "table"
      ? '<form class="mini-form" data-mini="table"><label>Rows <input class="ad-input" type="number" name="rows" min="1" max="30" value="3"></label><label>Columns <input class="ad-input" type="number" name="cols" min="1" max="10" value="3"></label><label class="chk"><input type="checkbox" name="head" checked> Header row</label><button class="btn primary" type="submit">Insert table</button></form>'
      : `<form class="mini-form" data-mini="date"><label>Date <input class="ad-input" type="date" name="day" value="${new Date().toISOString().slice(0, 10)}"></label><button class="btn primary" type="submit">Insert date</button></form>`;
    slash.hidden = false;
    const r = relRect(b);
    Object.assign(slash.style, { top: r.bottom + 4 + "px", left: Math.max(4, r.left) + "px" });
    slash.querySelector("input")?.focus();
  }
  slash.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-mini]");
    if (!f) return;
    e.preventDefault();
    const b = slashFor;
    slash.hidden = true; slashFor = null;
    if (!b?.isConnected) return;
    select(b);
    if (f.dataset.mini === "table") {
      const rows = Math.max(1, Math.min(30, Math.round(+f.rows.value) || 3)), cols = Math.max(1, Math.min(10, Math.round(+f.cols.value) || 3)), head = f.head.checked;
      insertAfter(modelToHtml([{ type: "table", header: head, rows: Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => ({ runs: head && !i ? [{ text: "Heading " + (j + 1) }] : [] }))) }], { editor: true }));
      A.toast(`Table added: ${rows} × ${cols}.`);
    } else {
      const v = f.day.value;
      const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00") : new Date();
      insertAfter(dateHtml(fmtDate(d)), { selectText: true });
    }
  });

  // Mention a person in the text (people kept on this device, see the Comments panel).
  function openPeoplePicker(b) {
    const list = comments.people();
    slashFor = b; slashMode = "after";
    slash.replaceChildren();
    if (!list.length) {
      slash.innerHTML = '<p class="muted small">No people yet. Add names in Comments → “People on this device”. They stay in this browser; nobody is notified.</p><button type="button" data-open-people>Open Comments</button>';
    } else slash.innerHTML = list.map((p) => `<button type="button" data-person="${escHtml(p.name)}">@${escHtml(p.name)}</button>`).join("");
    slash.hidden = false;
    const r = relRect(b);
    Object.assign(slash.style, { top: r.bottom + 4 + "px", left: Math.max(4, r.left) + "px" });
  }
  slash.addEventListener("click", (e) => {
    const p = e.target.closest("[data-person]"), o = e.target.closest("[data-open-people]");
    if (o) { slash.hidden = true; shell?.openPanel?.("comments"); return; }
    if (!p) return;
    const b = slashFor;
    slash.hidden = true;
    if (!b?.isConnected) return;
    A.placeCaret(b, false);
    A.change(() => A.exec("insertHTML", `<span style="color:#4338ca;background-color:#e0e7ff">@${escHtml(p.dataset.person)}</span>&nbsp;`));
  });

  // Embed a design from Projects (any AsaanDesk design app on this device): a picture of it and a link that opens it.
  const APP_LABEL = { studio: "Studio", sheets: "Sheets", whiteboard: "Whiteboard", docs: "Docs", photo: "Photo editor", video: "Video", website: "Website", draw: "Draw", code: "Code" };
  const OPEN_PARAM = { studio: "project", whiteboard: "board" };
  const cardSvg = (name, app) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270"><rect width="480" height="270" rx="16" fill="#f1f5f9"/><rect x="24" y="24" width="432" height="150" rx="10" fill="#e0e7ff"/><path d="M60 150 l70 -60 l50 40 l40 -30 l70 50" fill="none" stroke="#5b4cf0" stroke-width="8" stroke-linejoin="round"/><circle cx="380" cy="70" r="22" fill="#8b5cf6"/><text x="24" y="214" font-family="Arial" font-size="26" font-weight="700" fill="#1b2133">${escHtml(name.slice(0, 30))}</text><text x="24" y="246" font-family="Arial" font-size="18" fill="#64748b">${escHtml(APP_LABEL[app] || app)} design</text></svg>`;
  async function fillDesigns(g) {
    g.innerHTML = '<p class="muted small">Looking for your designs…</p>';
    let list = [];
    try { list = (await listProjects()).filter((p) => !(p.app === "docs" && p.id === A.state.id)).slice(0, 30); } catch { list = []; }
    g.innerHTML = "";
    if (!list.length) { g.innerHTML = '<p class="muted small">No saved designs on this device yet. Make one in Studio, Sheets, Whiteboard or another app, then embed it here.</p>'; return; }
    for (const p of list) tile(g, { label: `Embed ${p.name || "design"}`, wide: true, data: { embed: p.id }, html: `<span class="dp-embed"><b>${escHtml(p.name || "Untitled")}</b><small>${escHtml(APP_LABEL[p.app] || p.app)} · ${new Date(p.updated).toLocaleDateString()}</small></span>`, onClick: () => embedDesign(p) });
  }
  function embedDesign(p) {
    const img = /^data:image\/(png|jpe?g|webp|gif|svg\+xml)/i.test(p.thumb || "") ? p.thumb : svgDataUrl(cardSvg(p.name || "Untitled", p.app));
    const url = `${location.origin}/design/${encodeURIComponent(p.app)}/?${OPEN_PARAM[p.app] || "id"}=${encodeURIComponent(p.id)}`;
    insertAfter(`<p class="imgp" style="text-align:center"><img src="${escHtml(img)}" alt="${escHtml(p.name || "Design")}" style="width:420px"></p><p style="text-align:center">🔗 <a href="${escHtml(url)}">Open “${escHtml(p.name || "Untitled")}” in ${escHtml(APP_LABEL[p.app] || p.app)}</a></p>`);
    A.toast("Design embedded.");
  }

  fallbackPanels();
  const mounted = mount();
  return { insert: kitInsert, renderStyles, suggest, comments, versions, mounted, select, openSlash, chooseSlash, renderElements, renderText, renderTools, renderOutline, openMagicSwitch, presentationPdf, getSelBlock: () => selBlock, blockAction, placeOverlays };
}
