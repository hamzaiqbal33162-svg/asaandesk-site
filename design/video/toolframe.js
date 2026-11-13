// Editor frame for the one-job video tools (?mode=trim, ?mode=convert): the shared shell around the tool's page,
// a small pill toolbar, ready-made settings as templates, File / Share menus. The tool keeps all its own ids.
import * as G from "./gallery.js";

/** opts: { app, kind, title, home, tool, stage, pill, file, share, apply, panels, rail, insert, projects } -> shell or null. */
export async function mountToolFrame(opts) {
  let mod;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("Editor frame not available", e); return null; }
  try {
    const shell = mod.mountShell({
      app: opts.app, kind: opts.kind, title: opts.title, home: opts.home, stage: opts.stage, toolbar: opts.pill, formulaBar: null, resize: null,
      file: opts.file, share: opts.share,
      templates: { gallery: G.galleryFor(opts.tool), tool: opts.tool, apply: opts.apply, placeholder: opts.placeholder || "Search ready-made settings" },
      panels: opts.panels || {},
      // Canva's rail; the tool's own controls are first inside Tools (opts.panels.tools.primary)
      rail: opts.rail || ["templates", "elements", "text", "brand", "uploads", "tools", "projects", "apps"],
      insert: opts.insert, projects: opts.projects || null,
      bottom: { notes: true, outline: null, timer: true, fullscreen: true, help: true, zoom: null, pages: null },
      shortcuts: opts.shortcuts || [],
    });
    document.documentElement.classList.add("vx-framed", "vx-toolframed");
    return shell;
  } catch (e) { console.error("The editor frame could not start", e); return null; }
}
/**
 * Left-rail kit inserts for the one-video tools (trimmer, converter): a real video (an upload or a video file) opens as
 * the tool's video; pictures (and every graphic, which the kit falls back to as a picture) can't go into a trim or a
 * conversion, so they explain where to add them. accept(blob) = extra files this tool opens (the converter: GIFs).
 */
export function oneVideoInsert(load, { hint, accept = () => false } = {}) {
  const fileOf = async (src, name, fallbackType) => {
    const b = src instanceof Blob ? src : await (await fetch(String(src))).blob();
    const type = b.type || fallbackType, ext = (type.split("/")[1] || "mp4").replace("quicktime", "mov").replace("x-matroska", "mkv");
    const base = String(name || "Video").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "Video";
    return new File([b], /\.[a-z0-9]{2,4}$/i.test(base) ? base : `${base}.${ext}`, { type });
  };
  const isVideo = (src, type = "") => (src instanceof Blob ? /^video\//.test(src.type) : /^data:video\//i.test(String(src)) || /^video\//.test(type) || /\.(mp4|webm|mov|m4v|ogv|mkv|avi)(\?|#|$)/i.test(String(src)) || /^blob:/.test(String(src)));
  const ins = {
    video: async (spec = {}) => {
      const src = spec.src || spec.url || spec.blob;
      if (!src || !isVideo(src, spec.type)) return false; // an animated graphic, not a video file: the kit falls back (poster picture)
      const f = await fileOf(src, spec.name, "video/mp4");
      if (!/^video\//.test(f.type) && !accept(f)) return false;
      await load(f);
      return true;
    },
    // throws at once (not a rejected promise) when the type is plain, so a caller without await still sees the message
    image: (src, name) => {
      const no = () => new Error(hint || "This tool works on one video. Add pictures, text and graphics in the video editor (File > More video tools).");
      const known = src instanceof Blob ? src.type : /^data:([^;,]+)/i.exec(String(src || ""))?.[1] || "";
      const fake = { type: known, name: String(name || "") };
      if (known && !/^video\//.test(known) && !accept(fake)) throw no();
      if (!src) throw no();
      return (async () => {
        const f = await fileOf(src, name, "image/png").catch(() => null);
        if (f && (/^video\//.test(f.type) || accept(f))) { await load(f); return true; }
        throw no();
      })();
    },
  };
  ins.video.files = true; // the kit hands real WebM files (its animated loops recorded): they open as the tool's video
  return ins;
}
/** A small JPEG of a <video>'s current frame for a Projects card ("" when it can't be drawn). */
export function videoThumb(v, w = 240) {
  try {
    if (!v?.videoWidth) return "";
    const c = document.createElement("canvas"); c.width = w; c.height = Math.round((w * v.videoHeight) / v.videoWidth);
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } catch { return ""; }
}
/** Start / end seconds for a trimmer preset on a video of length d. */
export function trimRange(spec, d) {
  const n = Math.max(0.1, Number(spec.n) || 0);
  switch (spec.kind) {
    case "first": return { start: 0, end: Math.min(n, d), mode: "keep" };
    case "dropStart": return { start: Math.min(n, Math.max(0, d - 0.5)), end: d, mode: "keep" };
    case "dropEnd": return { start: 0, end: Math.max(0.5, d - n), mode: "keep" };
    case "middle": { const len = Math.min(n, d), s = Math.max(0, (d - len) / 2); return { start: s, end: s + len, mode: "keep" }; }
    case "cutMiddle": return { start: d / 3, end: (2 * d) / 3, mode: "cut" };
    default: return { start: 0, end: d, mode: "keep" };
  }
}
