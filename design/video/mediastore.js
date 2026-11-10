// Media files of video projects, kept in this browser (IndexedDB "asaandesk-video-media"); nothing is uploaded.
// The project JSON itself is saved with ../shared/store.js (saveProject / listProjects); this keeps the big
// blobs apart so autosave stays fast. Records: { id (media id), project, name, type, blob, added }.
const DB = "asaandesk-video-media", STORE = "media";
let dbp = null;
function db() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: "id" }); s.createIndex("project", "project"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function run(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode), out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("Storage is full"));
  });
}
export const putMedia = (rec) => run("readwrite", (s) => s.put({ added: Date.now(), ...rec }));
export const getMedia = (id) => run("readonly", (s) => s.get(id));
export async function deleteMediaOf(project, keep = []) {
  const d = await db();
  const ids = await req(d.transaction(STORE).objectStore(STORE).index("project").getAllKeys(project));
  const gone = ids.filter((id) => !keep.includes(id));
  if (gone.length) await run("readwrite", (s) => { for (const id of gone) s.delete(id); });
  return gone.length;
}
/** Approximate free space, so the editor can warn before a big import fails. */
export async function storageLeft() {
  try { const e = await navigator.storage?.estimate?.(); return e ? e.quota - e.usage : Infinity; } catch { return Infinity; }
}
