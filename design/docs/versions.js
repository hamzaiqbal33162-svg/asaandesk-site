// AsaanDesk Docs: version history kept in this browser (IndexedDB "asaandesk-docs-versions"): automatic versions while you
// work (at most one every 5 minutes, the last 30 kept per document) and named versions you save yourself (kept until deleted).
// Preview any version and restore it; restoring first saves the current text as a version, so nothing is lost.
import { modelToHtml, countWords, escHtml } from "./model.js";

const DB = "asaandesk-docs-versions";
let dbp = null;
function db() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("versions")) r.result.createObjectStore("versions", { keyPath: "id" }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction("versions", mode); const out = fn(t.objectStore("versions")); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };
const vid = () => "v" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const AUTO_EVERY = 5 * 60 * 1000;
const AUTO_KEEP = 30;

export async function listVersions(docId) { const all = (await tx("readonly", (s) => s.getAll())) || []; return all.filter((v) => v.docId === docId).sort((a, b) => b.at - a.at); }
export async function getVersion(id) { return tx("readonly", (s) => s.get(id)); }
export async function deleteVersion(id) { return tx("readwrite", (s) => s.delete(id)); }
export async function saveVersion(docId, doc, { name = "", auto = false } = {}) {
  const rec = { id: vid(), docId, name: String(name).slice(0, 80), auto, at: Date.now(), words: countWords(doc).words, title: doc.title, data: JSON.parse(JSON.stringify(doc)) };
  await tx("readwrite", (s) => s.put(rec));
  if (auto) { const old = (await listVersions(docId)).filter((v) => v.auto).slice(AUTO_KEEP); for (const v of old) await deleteVersion(v.id); }
  return rec;
}

export function initVersions(A) {
  let lastAuto = 0, lastHash = "", lastId = null;
  const hash = (doc) => { const s = JSON.stringify(doc.blocks) + doc.title; let h = 0; for (let i = 0; i < s.length; i += 7) h = (h * 33 + s.charCodeAt(i)) | 0; return s.length + ":" + h; };
  /** Called after every save: keeps an automatic version when the text changed and the last one is old enough. */
  async function autoVersion(force = false) {
    const id = A.state.id;
    if (!id) return null;
    if (id !== lastId) { lastId = id; lastAuto = 0; lastHash = ""; } // another document: its own timer
    const doc = A.state.doc, h = hash(doc);
    if (h === lastHash && !force) return null;
    const now = Date.now();
    if (!force && now - lastAuto < AUTO_EVERY) return null;
    if (!lastAuto && !force) { const [latest] = (await listVersions(id)).filter((v) => v.auto); if (latest && now - latest.at < AUTO_EVERY) { lastAuto = latest.at; return null; } }
    lastAuto = now; lastHash = h;
    try { const rec = await saveVersion(id, doc, { auto: true }); panelDraw?.(); return rec; } catch { return null; }
  }
  async function saveNamed(name) {
    await A.flushSave();
    const rec = await saveVersion(A.state.id, A.state.doc, { name: name || "Version " + new Date().toLocaleString() });
    if (lastId !== A.state.id) { lastId = A.state.id; lastAuto = 0; }
    lastHash = hash(A.state.doc);
    return rec;
  }
  async function restore(id) {
    const v = await getVersion(id);
    if (!v) { A.toast("That version was not found."); return false; }
    await A.flushSave();
    await saveVersion(A.state.id, A.state.doc, { name: "Before restoring “" + (v.name || "automatic version") + "”" });
    A.setDoc(v.data, { id: A.state.id });
    A.markDirty();
    await A.flushSave();
    A.toast("Version restored. The text before it is saved as a version too.");
    panelDraw?.();
    return true;
  }

  // Preview dialog.
  const dlg = document.createElement("dialog");
  dlg.id = "verDialog";
  dlg.className = "ver-dialog";
  dlg.innerHTML = `<div class="dlg"><div class="dlg-head"><h2 id="verTitle">Version</h2><button class="btn" type="button" data-ver-close aria-label="Close">✕</button></div>
    <p class="muted small" id="verMeta"></p><div class="ver-preview editor" id="verPreview"></div>
    <div class="ai-row"><button class="btn primary" type="button" id="verRestore">Restore this version</button><button class="btn" type="button" data-ver-close>Close</button></div></div>`;
  document.body.append(dlg);
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-ver-close]")) dlg.close(); });
  dlg.querySelector("#verRestore").addEventListener("click", async () => { const id = dlg.dataset.id; dlg.close(); await restore(id); });
  async function preview(id) {
    const v = await getVersion(id);
    if (!v) return;
    dlg.dataset.id = id;
    dlg.querySelector("#verTitle").textContent = v.name || "Automatic version";
    dlg.querySelector("#verMeta").textContent = `${new Date(v.at).toLocaleString()} · ${v.words} words · ${v.title || ""}`;
    dlg.querySelector("#verPreview").innerHTML = modelToHtml(v.data.blocks || []);
    dlg.showModal();
  }

  let panelDraw = null;
  function renderPanel(el) {
    const draw = async () => {
      el.classList.add("docs-panel", "ver-panel");
      const list = A.state.id ? await listVersions(A.state.id).catch(() => []) : [];
      el.innerHTML = `<p class="muted small">Versions are kept in this browser: an automatic one at most every 5 minutes while you edit, and named ones you save here.</p>
        <label class="field">Name this version <input id="verName" class="ad-input" maxlength="80" placeholder="e.g. Sent to the team"></label>
        <div class="ai-row"><button type="button" class="btn primary" id="verSave">Save version</button></div>
        <h3 class="dp-h">History (${list.length})</h3>
        <div class="ver-list" id="verList">${list.map((v) => `<div class="ver-item${v.auto ? " auto" : ""}" data-ver="${v.id}"><b>${escHtml(v.name || "Automatic version")}</b><span class="muted small">${new Date(v.at).toLocaleString()} · ${v.words} words</span><div class="ai-row"><button type="button" class="btn" data-ver-preview="${v.id}">Preview</button><button type="button" class="btn" data-ver-restore="${v.id}">Restore</button>${v.auto ? "" : `<button type="button" class="btn" data-ver-delete="${v.id}">Delete</button>`}</div></div>`).join("") || '<p class="muted small">No versions yet. They appear as you edit, or save one above.</p>'}</div>`;
    };
    el.onclick = async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.id === "verSave") { const n = el.querySelector("#verName").value.trim(); await saveNamed(n); A.toast("Version saved."); draw(); return; }
      if (b.dataset.verPreview) { preview(b.dataset.verPreview); return; }
      if (b.dataset.verRestore) { await restore(b.dataset.verRestore); draw(); return; }
      if (b.dataset.verDelete) { await deleteVersion(b.dataset.verDelete); draw(); }
    };
    draw();
    panelDraw = () => { if (el.isConnected) draw(); };
  }
  return { autoVersion, saveNamed, restore, preview, renderPanel, list: () => (A.state.id ? listVersions(A.state.id) : Promise.resolve([])) };
}
