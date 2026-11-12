// AsaanDesk Docs: Suggesting mode. While it is on, typed text becomes a suggestion (<ins class="sg">) and deleted text is
// only marked (<del class="sg">) until someone accepts or rejects it. Each mark carries "kind:id:time:author" (model.js SG_RE).
// Structural edits (new paragraphs, formatting) are applied directly; the panel says so.
import { listSuggestions, escHtml } from "./model.js";

const $ = (s, el = document) => el.querySelector(s);
const newId = () => (Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)).replace(/[^a-z0-9]/g, "x");

export function initSuggest(A) {
  const { editor } = A;
  let on = false;
  const listeners = new Set();
  const me = () => String(A.userName() || "You").replace(/[:<>"&]/g, "").slice(0, 40) || "You";
  const mark = (kind, id) => `${kind}:${id}:${Date.now()}:${me()}`;
  const authorOf = (el) => (el?.dataset.sg || "").split(":")[3] || "";
  const closest = (node, sel) => { let n = node?.nodeType === 3 ? node.parentNode : node; while (n && n !== editor) { if (n.matches?.(sel)) return n; n = n.parentNode; } return null; };
  const caret = (node, off) => { const r = document.createRange(); r.setStart(node, off); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  const changed = () => { for (const f of listeners) try { f(); } catch {} };

  function insertText(text) {
    const s = getSelection();
    if (!s.rangeCount) return;
    const r = s.getRangeAt(0);
    let node = r.startContainer, off = r.startOffset;
    const mine = closest(node, "ins.sg");
    if (mine && authorOf(mine) === me() && node.nodeType === 3) { node.insertData(off, text); caret(node, off + text.length); return; }
    const del = closest(node, "del.sg");
    if (del) { r.setStartAfter(del); r.collapse(true); }
    // Right after my own suggestion: keep adding to it.
    node = r.startContainer; off = r.startOffset;
    const prev = node.nodeType === 3 ? (off === 0 ? node.previousSibling : null) : node.childNodes[off - 1];
    if (prev?.matches?.("ins.sg") && authorOf(prev) === me()) {
      let t = prev.lastChild;
      if (!t || t.nodeType !== 3) { t = document.createTextNode(""); prev.append(t); }
      t.appendData(text); caret(t, t.length); return;
    }
    const el = document.createElement("ins");
    el.className = "sg";
    el.dataset.sg = mark("ins", newId());
    el.title = "Suggested by " + me();
    el.textContent = text;
    r.insertNode(el);
    caret(el.firstChild, text.length);
  }

  function markDeleted(range, backward) {
    // Split partly covered text nodes (the live range follows), then mark every covered text node.
    if (range.endContainer.nodeType === 3 && range.endOffset > 0 && range.endOffset < range.endContainer.length) range.endContainer.splitText(range.endOffset);
    if (range.startContainer.nodeType === 3 && range.startOffset > 0 && range.startOffset < range.startContainer.length) range.startContainer.splitText(range.startOffset);
    const nodes = [];
    const tw = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      if (!t.nodeValue || !range.intersectsNode(t)) continue;
      if (t === range.startContainer && range.startOffset >= t.length) continue;
      if (t === range.endContainer && range.endOffset === 0) continue;
      nodes.push(t);
    }
    if (!nodes.length) return;
    // Join a deletion right next to the new one (Backspace, Backspace, …) so it stays one suggestion.
    const near = backward ? closest(nodes[nodes.length - 1].nextSibling || nodes[nodes.length - 1].parentNode.nextSibling, "del.sg") : closest(nodes[0].previousSibling || nodes[0].parentNode.previousSibling, "del.sg");
    const sg = near && authorOf(near) === me() ? near.dataset.sg : mark("del", newId());
    let first = null, last = null;
    for (const t of nodes) {
      if (closest(t, "del.sg")) { first ||= t; last = t; continue; }
      const ins = closest(t, "ins.sg");
      if (ins && authorOf(ins) === me()) { const p = t.parentNode; t.remove(); if (!ins.textContent) ins.remove(); else if (p && !p.childNodes.length && p !== ins) p.remove(); continue; }
      const d = document.createElement("del");
      d.className = "sg"; d.dataset.sg = sg; d.title = "Suggested by " + me();
      t.replaceWith(d); d.append(t);
      first ||= d; last = d;
    }
    const s = getSelection(), r = document.createRange();
    if (backward && first?.isConnected) r.setStartBefore(first); else if (last?.isConnected) r.setStartAfter(last); else return;
    r.collapse(true); s.removeAllRanges(); s.addRange(r);
  }

  function deleteOp(type) {
    const s = getSelection();
    if (!s.rangeCount) return;
    const backward = /Backward/.test(type);
    if (s.isCollapsed) {
      const before = s.getRangeAt(0).cloneRange();
      try { s.modify("extend", backward ? "backward" : "forward", /Word/.test(type) ? "word" : "character"); } catch { return; }
      const r = s.getRangeAt(0);
      // Never join two paragraphs while suggesting: only move the caret.
      if (A.topBlock(r.startContainer) !== A.topBlock(r.endContainer)) { s.collapse(backward ? r.startContainer : r.endContainer, backward ? r.startOffset : r.endOffset); return; }
      if (r.collapsed) { s.removeAllRanges(); s.addRange(before); return; }
    }
    markDeleted(s.getRangeAt(0).cloneRange(), backward);
  }

  editor.addEventListener("beforeinput", (e) => {
    if (!on || e.isComposing) return;
    const t = e.inputType;
    // Use the caret as it is right now: keys come faster than "selectionchange" (Home then Delete), and the edit
    // helper restores the last remembered selection.
    A.rememberSelection();
    if (t === "insertText" || t === "insertReplacementText" || t === "insertFromPaste" || t === "insertFromDrop") {
      const text = e.data ?? e.dataTransfer?.getData("text/plain") ?? "";
      if (!text) return;
      e.preventDefault();
      A.change(() => {
        const s = getSelection();
        if (s.rangeCount && !s.isCollapsed) { markDeleted(s.getRangeAt(0).cloneRange(), false); }
        insertText(text.replace(/\r?\n/g, " "));
      });
      changed();
      return;
    }
    if (/^delete/.test(t)) {
      e.preventDefault();
      A.change(() => deleteOp(t));
      changed();
    }
  });

  function resolve(key, accept) {
    const [kind, id] = key.split(":");
    A.change(() => {
      for (const el of [...editor.querySelectorAll(`${kind}.sg`)].filter((x) => x.dataset.sg.startsWith(kind + ":" + id + ":"))) {
        if ((kind === "ins") === accept) el.replaceWith(...el.childNodes); else el.remove();
      }
    });
    changed();
  }
  function resolveAll(accept) {
    A.change(() => { for (const el of editor.querySelectorAll("ins.sg, del.sg")) { if ((el.tagName === "INS") === accept) el.replaceWith(...el.childNodes); else el.remove(); } });
    changed();
  }
  const list = () => listSuggestions(A.syncModel());

  // Toolbar button.
  const btn = Object.assign(document.createElement("button"), { type: "button", className: "tb suggest", id: "suggestBtn", title: "Suggesting: your edits become suggestions others can accept or reject", innerHTML: "✎ <span>Suggesting</span>" });
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => { setOn(!on); A.toast(on ? "Suggesting is on: your edits become suggestions." : "Suggesting is off: edits change the document directly."); });
  $("#magicBtn")?.before(btn);
  function setOn(v) { on = !!v; document.body.classList.toggle("suggesting", on); btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on)); changed(); }

  function renderPanel(el) {
    const draw = () => {
      const items = list();
      el.innerHTML = "";
      el.classList.add("docs-panel", "sg-panel");
      const head = document.createElement("div");
      head.className = "sg-head";
      head.innerHTML = `<button type="button" class="ads-btn sg-toggle" data-sg-toggle>${on ? "Turn suggesting off" : "Turn suggesting on"}</button>
        <p class="muted small">${on ? "Suggesting is on: typed and deleted text is kept as a suggestion." : "Suggesting is off."} New paragraphs and formatting are applied directly.</p>
        <p class="sg-count" id="sgCount"><b>${items.length}</b> suggestion${items.length === 1 ? "" : "s"}</p>`;
      el.append(head);
      if (items.length) {
        const all = document.createElement("div");
        all.className = "ai-row";
        all.innerHTML = '<button type="button" class="btn primary" data-sg-all="accept">Accept all</button><button type="button" class="btn" data-sg-all="reject">Reject all</button>';
        el.append(all);
      }
      for (const s of items) {
        const card = document.createElement("div");
        card.className = "sg-card " + s.kind;
        card.dataset.sgItem = s.kind + ":" + s.id;
        card.innerHTML = `<p><b>${s.kind === "ins" ? "Add" : "Delete"}</b> “${escHtml(s.text.slice(0, 140))}${s.text.length > 140 ? "…" : ""}”</p>
          <p class="muted small">${escHtml(s.by)} · ${s.at ? new Date(s.at).toLocaleString() : ""}</p>
          <div class="ai-row"><button type="button" class="btn primary" data-sg-accept="${s.kind}:${s.id}">✓ Accept</button><button type="button" class="btn" data-sg-reject="${s.kind}:${s.id}">✕ Reject</button><button type="button" class="btn" data-sg-show="${s.kind}:${s.id}">Show</button></div>`;
        el.append(card);
      }
      if (!items.length) el.append(Object.assign(document.createElement("p"), { className: "muted small", textContent: "No suggestions yet. Turn suggesting on, then type or delete text in the page." }));
    };
    el.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.sgToggle != null) setOn(!on);
      else if (b.dataset.sgAll) resolveAll(b.dataset.sgAll === "accept");
      else if (b.dataset.sgAccept) resolve(b.dataset.sgAccept, true);
      else if (b.dataset.sgReject) resolve(b.dataset.sgReject, false);
      else if (b.dataset.sgShow) { const [k, id] = b.dataset.sgShow.split(":"); const m = [...editor.querySelectorAll(k + ".sg")].find((x) => x.dataset.sg.startsWith(k + ":" + id + ":")); if (m) { m.scrollIntoView({ block: "center", behavior: "smooth" }); m.classList.add("flash"); setTimeout(() => m.classList.remove("flash"), 1200); } return; }
      draw();
    };
    draw();
    panelDraw = () => { if (el.isConnected && !el.closest("[hidden]")) draw(); };
  }
  let panelDraw = null;
  listeners.add(() => panelDraw?.());

  return { get on() { return on; }, setOn, resolve, resolveAll, list, renderPanel, onChange: (f) => listeners.add(f) };
}
