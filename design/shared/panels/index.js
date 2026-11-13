// Canva-style left-rail panels shared by every AsaanDesk editor (LEFT-RAIL PANELS PARITY, Nov 13). The shell
// (editor-shell.js) calls renderKitPanel(id, box, ctx) for "elements", "text" and "tools"; Brand / Uploads / Projects /
// Apps are drawn by the shell itself with the same structure. Same structure in every editor, only colours differ.
//
// ctx = { shell, opts, own, ownMeta, toast, openPanel, closePanel }
//   own(box)     the editor's own panel content (opts.panels[id]) or null: shown as an extra section in the kit panel
//   opts.insert  the editor's insert adapter (all optional except image; may return promises; pt = drop point
//                {x, y} in stage px, undefined for a click = centre of the visible page). Sizes are relative ("rel":
//                a fraction of the page's shorter side) so every editor maps them to its own units.
//     image(src, name, pt)                          photos, uploads; also the universal fallback (SVG data URL)
//     shape(spec, pt)   spec {kind, d, vb, fill, stroke, strokeWidth, dash, radius, sides, points, arrow, name, rel, aspect}
//     svg(markup, {name, kind, rel, aspect}, pt)    graphics, stickers, animations, 3D, forms, icons (vector)
//     text(spec, pt)    spec {content, role: "heading"|"subheading"|"body"|"caption", rel, family, bold, italic, color,
//                       align, letterSpacing (em), lineHeight, uppercase}
//     textGroup([spec], pt)                         font combinations (several text boxes added and selected together)
//     chart(spec, pt)   spec {kind: "bar"|"column"|"line"|"area"|"pie"|"donut"|"progress"|"number", title, labels, series}
//     table(spec, pt)   spec {rows, cols, cells: string[][], header, style: {head, stripe, border}}
//     frame(spec, pt)   spec {shape, d, vb, device, name, rel, aspect}   (an empty photo frame the user fills)
//     grid(spec, pt)    spec {cells: [[x, y, w, h]] in 0..1, gap, name}
//     video(spec, pt)   spec {src, poster, name, duration, aspect}
//     audio(spec)       spec {track, name, duration}
//     pageNumber(), drawing(svgMarkup, {w, h}, pt)
//   Missing adapters fall back: shape/svg/chart/table/frame/grid/drawing -> svg -> image(SVG data URL); video -> image(poster).
import { insertWithFallback } from "./insert.js";
import { renderElements } from "./elements.js";
import { renderText } from "./text.js";
import { renderTools } from "./tools.js";

/** A kit item dropped on the stage (the shell routes drags whose data has a `kit` field here). data = {kit: kind,
 *  spec | markup | src, svg (fallback markup), opts: {panel, category, item, name, rel, aspect}}. Same insert path and
 *  fallbacks as a click (panels/insert.js), so drops also report the ads-kit-insert event. */
export const dropKit = (data, pt, ctx) => (data.ref && (data.opts?.panel || data.panel) === "elements")
  // Elements items made at insert time (video loops recorded as WebM, audio rendered as WAV): the click path.
  ? import("./elements.js").then((m) => m.dropElement(data, pt, ctx))
  : insertWithFallback(ctx, data.kit,
  data.kit === "svg" ? data.markup : data.kit === "image" ? { src: data.src } : data.spec, pt,
  { ...(data.opts || {}), panel: data.opts?.panel || data.panel, svg: data.svg ? () => data.svg : undefined });

export function renderKitPanel(id, box, ctx) {
  if (id === "elements") return renderElements(box, ctx);
  if (id === "text") return renderText(box, ctx);
  if (id === "tools") return renderTools(box, ctx);
  ctx.own?.(box);
}
