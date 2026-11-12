// AsaanDesk Docs: comment threads on blocks, replies, resolve / reopen, filters and @mentions.
// Threads are saved inside the document (doc.comments, block data-cmt = thread id). People for @mentions are a list the user
// keeps on this device; mentions are stored with the comment, nobody is emailed or notified (the panel says so).
import { escHtml } from "./model.js";

const PEOPLE_KEY = "asaandesk-docs-people", ME_KEY = "asaandesk-docs-me";
const ls = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const newId = () => "c" + (Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)).replace(/[^a-z0-9]/g, "x");
const cleanName = (s) => String(s || "").replace(/[@<>"&:]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

export function initComments(A) {
  const { editor } = A;
  const people = () => ls.get(PEOPLE_KEY, []).filter((p) => p && p.name);
  const setPeople = (list) => ls.set(PEOPLE_KEY, list.slice(0, 200));
  const me = () => cleanName(ls.get(ME_KEY, "")) || "You";
  const threads = () => (A.state.doc.comments ||= []);
  const listeners = new Set();
  const changed = () => { A.markDirty(); for (const f of listeners) try { f(); } catch {} };
  const mentionsIn = (text) => people().map((p) => p.name).filter((n) => text.includes("@" + n));
  const blockOf = (id) => editor.querySelector(`[data-cmt="${CSS.escape(id)}"]`);

  /** Adds a comment to a block (a reply when the block already has a thread). Returns the thread. */
  function add(block, text) {
    text = String(text || "").trim().slice(0, 2000);
    if (!block || !text) return null;
    const existing = block.dataset.cmt && threads().find((t) => t.id === block.dataset.cmt);
    if (existing) { (existing.replies ||= []).push({ text, by: me(), at: Date.now() }); const m = mentionsIn(text); if (m.length) existing.mentions = [...new Set([...(existing.mentions || []), ...m])]; delete existing.resolved; changed(); return existing; }
    const t = { id: newId(), text, by: me(), at: Date.now() };
    const m = mentionsIn(text);
    if (m.length) t.mentions = m;
    threads().push(t);
    A.change(() => { block.dataset.cmt = t.id; });
    changed();
    return t;
  }
  function reply(id, text) { const t = threads().find((x) => x.id === id); text = String(text || "").trim(); if (!t || !text) return; (t.replies ||= []).push({ text: text.slice(0, 2000), by: me(), at: Date.now() }); const m = mentionsIn(text); if (m.length) t.mentions = [...new Set([...(t.mentions || []), ...m])]; changed(); }
  function setResolved(id, v) { const t = threads().find((x) => x.id === id); if (!t) return; if (v) t.resolved = true; else delete t.resolved; changed(); }
  function remove(id) {
    A.state.doc.comments = threads().filter((x) => x.id !== id);
    const b = blockOf(id);
    if (b) A.change(() => { delete b.dataset.cmt; });
    changed();
  }

  /** @mention suggestions for a textarea: typing "@na" lists matching people; picking one writes "@Name ". */
  function attachMentions(ta) {
    const box = document.createElement("div");
    box.className = "mention-list";
    box.hidden = true;
    ta.after(box);
    const query = () => { const m = ta.value.slice(0, ta.selectionStart).match(/@([^\s@]{0,30}(?: [^\s@]{0,30})?)$/); return m ? m[1] : null; };
    const show = () => {
      const q = query();
      if (q == null) { box.hidden = true; return; }
      const list = people().filter((p) => p.name.toLowerCase().startsWith(q.toLowerCase()) || p.name.toLowerCase().includes(" " + q.toLowerCase()));
      box.innerHTML = list.length ? list.slice(0, 8).map((p) => `<button type="button" data-mention="${escHtml(p.name)}">@${escHtml(p.name)}</button>`).join("") : '<p class="muted small">No match. Add people under “People on this device”.</p>';
      box.hidden = false;
    };
    ta.addEventListener("input", show);
    ta.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mention]");
      if (!b) return;
      const pos = ta.selectionStart, before = ta.value.slice(0, pos).replace(/@([^\s@]{0,30}(?: [^\s@]{0,30})?)$/, "@" + b.dataset.mention + " ");
      ta.value = before + ta.value.slice(pos);
      ta.setSelectionRange(before.length, before.length);
      box.hidden = true;
      ta.focus();
    });
    return box;
  }

  const fmt = (text) => {
    let h = escHtml(text);
    for (const p of people()) h = h.split("@" + escHtml(p.name)).join(`<span class="mention">@${escHtml(p.name)}</span>`);
    return h.replace(/\n/g, "<br>");
  };
  const when = (at) => (at ? new Date(at).toLocaleString() : "");

  let panelDraw = null;
  function renderPanel(el) {
    let filter = "open";
    const draw = () => {
      el.innerHTML = "";
      el.classList.add("docs-panel", "cmt-panel");
      const sel = A.getSelBlock();
      const all = threads().filter((t) => blockOf(t.id));
      const open = all.filter((t) => !t.resolved).length;
      const top = document.createElement("div");
      top.className = "cmt-new";
      const onText = sel ? (sel.innerText || sel.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) : "";
      top.innerHTML = `${sel ? `<p class="cmt-on" id="cmtOn">On: “${escHtml(onText || "this block")}”</p>` : ""}<label class="field">Comment on the selected block
          <textarea id="cmtNew" data-ads="comment-text" class="ad-input" rows="3" placeholder="${sel ? "Write a comment. Type @ to mention someone." : "Click a block in the page first."}" ${sel ? "" : "disabled"}></textarea></label>
        <div class="ai-row"><button type="button" class="btn primary" id="cmtAdd" ${sel ? "" : "disabled"}>Comment</button></div>`;
      el.append(top);
      attachMentions(top.querySelector("#cmtNew"));
      const bar = document.createElement("div");
      bar.className = "cmt-filter";
      const opts = [["open", `Open (${open})`], ["resolved", `Resolved (${all.length - open})`], ["all", `All (${all.length})`], ...people().map((p) => ["@" + p.name, "Mentions @" + p.name])];
      bar.innerHTML = `<label class="field">Show <select id="cmtFilter" class="ad-input">${opts.map(([v, l]) => `<option value="${escHtml(v)}"${v === filter ? " selected" : ""}>${escHtml(l)}</option>`).join("")}</select></label>`;
      el.append(bar);
      el.append(Object.assign(document.createElement("p"), { className: "muted small cmt-note", textContent: "Comments and @mentions stay with this document on this device. Nobody is emailed or notified." }));
      const shown = all.filter((t) => filter === "all" ? true : filter === "open" ? !t.resolved : filter === "resolved" ? !!t.resolved : (t.mentions || []).includes(filter.slice(1)));
      const list = document.createElement("div");
      list.className = "cmt-list";
      list.id = "cmtList";
      for (const t of shown) {
        const b = blockOf(t.id);
        const card = document.createElement("div");
        card.className = "cmt-card" + (t.resolved ? " resolved" : "");
        card.dataset.thread = t.id;
        card.innerHTML = `<button type="button" class="cmt-quote" data-cmt-go="${t.id}">${escHtml((b?.innerText || b?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || "(block)")}</button>
          <div class="cmt-msg"><b>${escHtml(t.by)}</b> <span class="muted small">${when(t.at)}</span><div>${fmt(t.text)}</div></div>
          ${(t.replies || []).map((r) => `<div class="cmt-msg reply"><b>${escHtml(r.by)}</b> <span class="muted small">${when(r.at)}</span><div>${fmt(r.text)}</div></div>`).join("")}
          <textarea class="ad-input cmt-reply" rows="2" placeholder="Reply…" data-reply-for="${t.id}"></textarea>
          <div class="ai-row"><button type="button" class="btn" data-cmt-reply="${t.id}">Reply</button><button type="button" class="btn" data-cmt-resolve="${t.id}">${t.resolved ? "Reopen" : "Resolve"}</button><button type="button" class="btn" data-cmt-delete="${t.id}">Delete</button></div>`;
        list.append(card);
        attachMentions(card.querySelector(".cmt-reply"));
      }
      if (!shown.length) list.innerHTML = `<p class="muted small">${all.length ? "No comments match this filter." : "No comments yet. Select a block, then comment here or with the comment button under the block."}</p>`;
      el.append(list);
      const ppl = document.createElement("details");
      ppl.className = "cmt-people";
      ppl.open = !people().length;
      ppl.innerHTML = `<summary>People on this device (${people().length})</summary>
        <p class="muted small">Names you can @mention. They are kept in this browser and saved with your comments. Nobody is emailed or notified.</p>
        <label class="field">Your name <input id="cmtMe" class="ad-input" value="${escHtml(me() === "You" ? "" : me())}" placeholder="You" maxlength="40"></label>
        <div class="ppl-list">${people().map((p) => `<span class="ppl">${escHtml(p.name)} <button type="button" data-ppl-del="${escHtml(p.name)}" aria-label="Remove ${escHtml(p.name)}">✕</button></span>`).join("")}</div>
        <div class="ai-row"><input id="pplName" class="ad-input" placeholder="Add a name" maxlength="40"><button type="button" class="btn" id="pplAdd">Add</button></div>`;
      el.append(ppl);
    };
    el.onchange = (e) => {
      if (e.target.id === "cmtFilter") { filter = e.target.value; draw(); }
      if (e.target.id === "cmtMe") { ls.set(ME_KEY, cleanName(e.target.value)); }
    };
    el.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.id === "cmtAdd") { const ta = el.querySelector("#cmtNew"); if (add(A.getSelBlock(), ta.value)) { filter = "open"; A.toast("Comment added."); } draw(); return; }
      if (b.id === "pplAdd") { const n = cleanName(el.querySelector("#pplName").value); if (n && !people().some((p) => p.name === n)) setPeople([...people(), { name: n }]); draw(); return; }
      if (b.dataset.pplDel) { setPeople(people().filter((p) => p.name !== b.dataset.pplDel)); draw(); return; }
      if (b.dataset.cmtReply) { const ta = el.querySelector(`[data-reply-for="${b.dataset.cmtReply}"]`); reply(b.dataset.cmtReply, ta?.value); draw(); return; }
      if (b.dataset.cmtResolve) { const t = threads().find((x) => x.id === b.dataset.cmtResolve); setResolved(b.dataset.cmtResolve, !t?.resolved); draw(); return; }
      if (b.dataset.cmtDelete) { remove(b.dataset.cmtDelete); draw(); return; }
      if (b.dataset.cmtGo) { const blk = blockOf(b.dataset.cmtGo); if (blk) { blk.scrollIntoView({ block: "center", behavior: "smooth" }); A.selectBlock(blk); } }
    };
    draw();
    panelDraw = () => { if (el.isConnected && !el.closest("[hidden]")) draw(); };
  }
  listeners.add(() => panelDraw?.());

  return { add, reply, setResolved, remove, people, setPeople, me, threads, attachMentions, renderPanel, redraw: () => panelDraw?.(), threadOf: (block) => block?.dataset.cmt && threads().find((t) => t.id === block.dataset.cmt) };
}
