// Local storage for the design apps (IndexedDB, nothing leaves the device):
// - projects: autosaved work per app ({ id, app, name, updated, data, thumb })
// - handoff: one app opens a design in another (e.g. Magic Layers -> Studio): put() returns an id, take(id) reads it once.
const DB = "asaandesk-design", VERSION = 1;
let dbp = null;
function db() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, VERSION);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains("projects")) d.createObjectStore("projects", { keyPath: "id" }); if (!d.objectStoreNames.contains("handoff")) d.createObjectStore("handoff", { keyPath: "id" }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (store, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };
export const uid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "").slice(0, 16);
export async function saveProject(p) { const rec = { ...p, id: p.id || uid(), updated: Date.now() }; await tx("projects", "readwrite", (s) => s.put(rec)); return rec; }
export async function listProjects(app) { const all = await tx("projects", "readonly", (s) => s.getAll()); return (all || []).filter((p) => !app || p.app === app).sort((a, b) => b.updated - a.updated); }
export async function getProject(id) { return tx("projects", "readonly", (s) => s.get(id)); }
export async function deleteProject(id) { return tx("projects", "readwrite", (s) => s.delete(id)); }
export async function putHandoff(payload) { const id = uid(); await tx("handoff", "readwrite", (s) => s.put({ id, at: Date.now(), payload })); return id; }
export async function takeHandoff(id) { const rec = await tx("handoff", "readonly", (s) => s.get(id)); if (rec) await tx("handoff", "readwrite", (s) => s.delete(id)); return rec?.payload ?? null; }
