// Shared insert helper for the left-rail kit (Elements, Text, Tools). ONE place for:
//  - insertWithFallback(ctx, kind, spec, pt, meta): calls the editor's adapter opts.insert[kind]; when it is missing (or
//    returns false / throws) it falls back along the chain in panels/index.js:
//      shape/svg-like (shape, chart, table, frame, grid, drawing, text, textGroup, pageNumber) -> insert.svg -> insert.image
//      (SVG data URL); text -> textGroup <-> text one by one; pageNumber -> text; video -> image(poster).
//    meta = { panel, category, item, svg: () => "<svg…>" (markup for the svg/image fallback), name, rel, aspect }
//    Resolves to { ok, via: "native" | "fallback", how, error }.
//  - reportInsert(detail): after every click/drag insert dispatches window "ads-kit-insert" { panel, category, item, kind,
//    via, ok, error } and keeps the last 50 in window.__adsKitInserts (the lead's e2e reads them).
//  - kitDrag(el, data) + dropKitData(data, pt, ctx): drag from a kit panel onto the stage. The item carries
//    data-ads-drag='{"kit":…, "spec":…, "svg":…, "opts":{…}}'; the shell routes it to dropKit in panels/index.js, which
//    inserts it like a click (dropKitData = insertWithFallback with the item's fallback markup).
//  - svgToDataUrl(markup), esc(text), ensureCss(href).
// Text spec extras used by the Text panel (all optional; adapters may ignore them, the SVG fallback draws them):
//   dx, dy (textGroup: the box centre's offset from the group centre, rel units), width (box width, rel units),
//   weight (300..900), stroke + strokeWidth (outline colour + width in em), background (box fill colour).
// Used by panels/text.js and panels/tools.js (panels-text-tools) and meant for panels/elements.js too (panels-elements).

const SVG_LIKE = new Set(["shape", "svg", "chart", "table", "frame", "grid", "drawing", "text", "textGroup", "pageNumber"]);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function svgToDataUrl(svg) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(String(svg || "")); }

export function reportInsert(detail) {
  const d = { panel: "", category: "", item: "", kind: "", via: "native", ok: true, error: "", at: Date.now(), ...detail };
  if (d.error && typeof d.error !== "string") d.error = d.error.message || String(d.error);
  try {
    const w = globalThis.window || globalThis;
    const list = (w.__adsKitInserts ||= []);
    list.push(d); if (list.length > 50) list.splice(0, list.length - 50);
    w.dispatchEvent?.(new (w.CustomEvent || CustomEvent)("ads-kit-insert", { detail: d }));
  } catch {}
  return d;
}

// One adapter call: undefined / anything but false counts as done; false = "not handled here" (try the next one).
async function call(fn, ...args) { const r = await fn(...args); return r !== false; }

// kind "svg": spec is the markup string or {markup, kind, rel, aspect, elementId}. svg(markup, opts, pt) opts carry the
// /pdf-editor/elements.js id (elementId) so editors add their native recolourable element (adapters convention).
const markupOf = (spec) => (typeof spec === "string" ? spec : spec?.markup || "");
const svgOpts = (kind, spec, meta, name) => {
  const o = { name, kind: meta.svgKind || (kind === "svg" ? spec?.kind : kind) || "graphic", rel: meta.rel ?? spec?.rel, aspect: meta.aspect ?? spec?.aspect };
  const id = meta.elementId ?? spec?.elementId; if (id) o.elementId = id;
  if (meta.animated ?? spec?.animated) o.animated = true;
  return o;
};

function pageNo(ctx) { try { const pg = ctx.opts?.bottom?.pages; return pg?.current ? pg.current() + 1 : 1; } catch { return 1; } }

/** Inserts through the editor's adapter with the documented fallbacks, then reports it. Never throws. */
export async function insertWithFallback(ctx, kind, spec, pt, meta = {}) {
  const ins = ctx?.opts?.insert || {};
  const name = meta.name || spec?.name || kind;
  const steps = [];
  if (typeof ins[kind] === "function") {
    if (kind === "pageNumber") steps.push(["native", "pageNumber", () => ins.pageNumber(pt)]);
    else if (kind === "drawing") steps.push(["native", "drawing", () => ins.drawing(spec.svg ?? spec, { w: spec.w, h: spec.h, name }, pt)]);
    else if (kind === "image") steps.push(["native", "image", () => ins.image(spec.src ?? spec, name, pt)]);
    else if (kind === "svg") steps.push(["native", "svg", () => ins.svg(markupOf(spec), svgOpts(kind, spec, meta, name), pt)]);
    else steps.push(["native", kind, () => ins[kind](spec, pt)]);
  }
  if (kind === "textGroup" && typeof ins.text === "function") steps.push(["fallback", "text", async () => { let ok = true; for (const s of spec) ok = (await call(ins.text, s, pt)) && ok; return ok; }]);
  if (kind === "text" && typeof ins.textGroup === "function") steps.push(["fallback", "textGroup", () => ins.textGroup([spec], pt)]);
  if (kind === "pageNumber" && typeof ins.text === "function") steps.push(["fallback", "text", () => ins.text({ content: String(pageNo(ctx)), role: "caption", rel: 0.05, align: "center", name: "Page number", ...(spec || {}) }, pt)]);
  // meta.svg() is the vector stand-in for any kind (charts, tables, frames, grids, text, also animated video loops and
  // audio cards from Elements); computed once.
  if (kind !== "svg" && kind !== "image" && typeof meta.svg === "function") {
    let mk = null; const svg = () => (mk ??= meta.svg());
    if (typeof ins.svg === "function") steps.push(["fallback", "svg", () => ins.svg(svg(), svgOpts(kind, spec, meta, name), pt)]);
    if (typeof ins.image === "function") steps.push(["fallback", "image", () => ins.image(svgToDataUrl(svg()), name, pt)]);
  }
  if (kind === "video" && typeof ins.image === "function" && spec?.poster) steps.push(["fallback", "image", () => ins.image(spec.poster, name, pt)]);
  if (kind === "svg" && typeof ins.image === "function") steps.push(["fallback", "image", () => ins.image(svgToDataUrl(markupOf(spec)), name, pt)]);
  let error = "";
  for (const [via, how, run] of steps) {
    try { if (await call(run)) { reportInsert({ panel: meta.panel, category: meta.category, item: meta.item, kind, via, ok: true, how }); return { ok: true, via, how }; } }
    catch (e) { error = e?.message || String(e); console.warn("kit insert", kind, how, e); }
  }
  error ||= steps.length ? "The editor did not add it." : "This editor cannot add that here.";
  reportInsert({ panel: meta.panel, category: meta.category, item: meta.item, kind, via: steps.length > 1 ? "fallback" : "native", ok: false, error });
  return { ok: false, via: "none", error };
}

// ---------- drag from a kit panel onto the stage
/** Makes el a draggable kit item. The shell routes drags whose data-ads-drag JSON has a `kit` field to dropKit(data,
 *  pt, ctx) in panels/index.js (lead, cfd0dac). data = {kit, spec | markup | src, svg (fallback markup), opts: {panel,
 *  category, item, name, rel, aspect}}; dropKit inserts it with insertWithFallback (same path as a click). */
export function kitDrag(el, data) {
  el.setAttribute("data-ads-drag", JSON.stringify(data));
  el.draggable = true;
  return el;
}

/** Drop handler shape for panels/index.js: dropKit(data, pt, ctx) -> insertWithFallback with the item's own fallback. */
export function dropKitData(data, pt, ctx) {
  const spec = data.kit === "svg" ? data.markup : data.kit === "image" ? { src: data.src } : data.spec;
  return insertWithFallback(ctx, data.kit, spec, pt, { ...(data.opts || {}), svg: data.svg ? () => data.svg : undefined });
}

/** Adds a stylesheet once (the kit panels load their own CSS when they first open; nothing on intro pages). */
export function ensureCss(href) {
  const d = globalThis.document; if (!d) return;
  const noQ = (u) => String(u || "").split(/[?#]/)[0];
  if ([...d.querySelectorAll('link[rel="stylesheet"]')].some((l) => noQ(l.href) === noQ(href))) return;
  const l = d.createElement("link"); l.rel = "stylesheet"; l.href = href; d.head.append(l);
}
