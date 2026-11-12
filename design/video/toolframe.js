// Editor frame for the one-job video tools (?mode=trim, ?mode=convert): the shared shell around the tool's page,
// a small pill toolbar, ready-made settings as templates, File / Share menus. The tool keeps all its own ids.
import * as G from "./gallery.js";

/** opts: { app, kind, title, home, tool, stage, pill, file, share, apply, panels, rail, insert } -> shell or null. */
export async function mountToolFrame(opts) {
  let mod;
  try { mod = await import("../shared/editor-shell.js"); } catch (e) { console.warn("Editor frame not available", e); return null; }
  try {
    const shell = mod.mountShell({
      app: opts.app, kind: opts.kind, title: opts.title, home: opts.home, stage: opts.stage, toolbar: opts.pill, formulaBar: null, resize: null,
      file: opts.file, share: opts.share,
      templates: { gallery: G.galleryFor(opts.tool), tool: opts.tool, apply: opts.apply, placeholder: opts.placeholder || "Search ready-made settings" },
      panels: opts.panels || {},
      rail: opts.rail || ["templates", "tools", "apps"],
      insert: opts.insert,
      bottom: { notes: true, outline: null, timer: true, fullscreen: true, help: true, zoom: null, pages: null },
      shortcuts: opts.shortcuts || [],
    });
    document.documentElement.classList.add("vx-framed", "vx-toolframed");
    return shell;
  } catch (e) { console.error("The editor frame could not start", e); return null; }
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
