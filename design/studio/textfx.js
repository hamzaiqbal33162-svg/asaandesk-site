// Text effects like Canva's Effects panel (round 3): styles Shadow, Lift, Hollow, Splice, Echo, Glitch, Neon,
// Background and the Curve shape, plus gradient text colour. Pure module (no DOM): it turns a text style into
// "passes" (copies of the text drawn under the main text) and a main paint, and lays curved text out along an
// arc. The editor (SVG), PNG/JPG (canvas) and PDF renderers all draw from this, so they match.
import { textHeight, curveLayout, curveText, textWidth, textPad } from "./textlayout.js";
export { curveLayout, curveText };

export const EFFECT_STYLES = [["none", "None"], ["shadow", "Shadow"], ["lift", "Lift"], ["glow", "Glow"], ["echo", "Echo"], ["outline", "Outline"], ["background", "Background"], ["splice", "Splice"], ["hollow", "Hollow"], ["glitch", "Glitch"], ["neon", "Neon"], ["extrude", "3D"]];
export const GLITCH_PAIRS = [["#00e5ff", "#ff2bd6"], ["#2f80ff", "#ff3b3b"], ["#22c55e", "#a855f7"], ["#facc15", "#0ea5e9"]];
/** Controls (Canva's sliders) per style: [key, label, min, max]. */
export const EFFECT_CONTROLS = {
  shadow: [["offset", "Offset", 0, 100], ["direction", "Direction", -180, 180], ["blur", "Blur", 0, 100], ["transparency", "Transparency", 0, 100]],
  lift: [["intensity", "Intensity", 0, 100]],
  hollow: [["thickness", "Thickness", 0, 100]],
  splice: [["thickness", "Thickness", 0, 100], ["offset", "Offset", 0, 100], ["direction", "Direction", -180, 180]],
  echo: [["offset", "Offset", 0, 100], ["direction", "Direction", -180, 180]],
  glitch: [["offset", "Offset", 0, 100], ["direction", "Direction", -180, 180]],
  neon: [["intensity", "Intensity", 0, 100]],
  glow: [["size", "Size", 0, 100], ["transparency", "Transparency", 0, 100]],
  outline: [["thickness", "Thickness", 0, 100]],
  background: [["roundness", "Roundness", 0, 100], ["spread", "Spread", 0, 100], ["transparency", "Transparency", 0, 100]],
  extrude: [["depth", "Depth", 0, 100], ["direction", "Direction", -180, 180], ["shade", "Soft shadow", 0, 100]],
};
export function effectDefaults(type) {
  return ({
    shadow: { offset: 50, direction: -45, blur: 0, transparency: 60, color: "#000000" },
    lift: { intensity: 50 },
    hollow: { thickness: 50 },
    splice: { thickness: 50, offset: 50, direction: -45, color: "#ff7a59" },
    echo: { offset: 50, direction: -45, color: null },
    glitch: { offset: 30, direction: 0, colors: GLITCH_PAIRS[0] },
    neon: { intensity: 50 },
    glow: { size: 50, transparency: 20, color: "#facc15" },
    outline: { thickness: 30, color: "#1b2133" },
    background: { roundness: 25, spread: 30, transparency: 0, color: "#fde68a" },
    extrude: { depth: 40, direction: -45, shade: 40, color: null },
  })[type] || {};
}
/** Side colour of a 3D (extruded) text: a darker shade of a light text colour, a soft tint of a dark one. */
export function extrudeColor(color) {
  const c = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#1b2133";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.45 ? mix(c, "#000000", 0.55) : mix(c, "#ffffff", 0.62);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, +v || 0));
/** Unit vector for a Canva direction in degrees (0 = right, 90 = up, -45 = down-right). */
export const dirVec = (deg) => { const a = ((+deg || 0) * Math.PI) / 180; return [Math.cos(a), -Math.sin(a)]; };
/** Mixes two #rrggbb colours (k = 0 -> a, 1 -> b). */
export function mix(a, b, k) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(String(c || "#000000").slice(i, i + 2), 16) || 0);
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * clamp(k, 0, 1)).toString(16).padStart(2, "0")).join("");
}

/** The style picked in the Effects panel for a text style. */
export function effectStyle(t) {
  if (t.effect?.type) return t.effect.type;
  if (t.bg && t.bg.color && t.bg.color !== "none") return "background";
  if (t.shadow && (t.shadow.x || t.shadow.y || t.shadow.blur)) return "shadow";
  if (t.outline && t.outline.width > 0) return "outline";
  return "none";
}
/** Canva's Shadow sliders -> our shadow { x, y, blur, color, opacity }. */
export function shadowFrom(o, size) {
  const d = (clamp(o.offset, 0, 100) / 100) * size * 0.25, [vx, vy] = dirVec(o.direction ?? -45);
  return { x: vx * d, y: vy * d, blur: (clamp(o.blur, 0, 100) / 100) * size * 0.5, color: o.color || "#000000", opacity: 1 - clamp(o.transparency ?? 60, 0, 100) / 100, canva: { offset: o.offset, direction: o.direction, blur: o.blur, transparency: o.transparency } };
}
/** Canva's Background sliders -> our bg { color, pad, radius, opacity }. */
export function bgFrom(o) {
  return { color: o.color || "#fde68a", pad: 0.1 + (clamp(o.spread ?? 30, 0, 100) / 100) * 0.8, radius: (clamp(o.roundness ?? 25, 0, 100) / 100) * 1.2, opacity: 1 - clamp(o.transparency ?? 0, 0, 100) / 100, canva: { roundness: o.roundness, spread: o.spread, transparency: o.transparency } };
}

/**
 * How to paint a text: { passes: [{ dx, dy, fill, stroke, opacity, blur }], main: { fill, stroke, opacity } }.
 * fill is a colour or null (no fill); stroke is { color, width } or null. Passes are drawn first, in order.
 * The classic drop shadow (t.shadow) and outline (t.outline) are still drawn by the renderers as before.
 */
export function textPaint(t) {
  const size = +t.size || 16, color = t.color || "#000000";
  const e = t.effect || null;
  const main = { fill: color, stroke: t.outline && t.outline.width > 0 ? { color: t.outline.color || "#000000", width: t.outline.width * 2 } : null, opacity: 1 };
  const passes = [];
  if (!e?.type) return { passes, main };
  const k = (v, d) => clamp(v ?? d, 0, 100) / 100;
  const off = (o, d = 50) => { const dist = k(o.offset, d) * size * 0.2, [vx, vy] = dirVec(o.direction ?? -45); return [vx * dist, vy * dist]; };
  if (e.type === "lift") {
    const i = k(e.intensity, 50);
    passes.push({ dx: 0, dy: size * (0.02 + 0.06 * i), fill: "#000000", stroke: null, opacity: 0.12 + 0.4 * i, blur: size * (0.08 + 0.25 * i) });
  } else if (e.type === "hollow") {
    main.fill = null; main.stroke = { color, width: size * (0.01 + 0.07 * k(e.thickness, 50)) };
  } else if (e.type === "splice") {
    const [dx, dy] = off(e);
    passes.push({ dx, dy, fill: e.color || "#ff7a59", stroke: null, opacity: 1, blur: 0 });
    main.fill = null; main.stroke = { color, width: size * (0.01 + 0.07 * k(e.thickness, 50)) };
  } else if (e.type === "echo") {
    const [dx, dy] = off(e), c = e.color || color;
    passes.push({ dx: dx * 2, dy: dy * 2, fill: c, stroke: null, opacity: 0.25, blur: 0 }, { dx, dy, fill: c, stroke: null, opacity: 0.5, blur: 0 });
  } else if (e.type === "glitch") {
    const [c1, c2] = Array.isArray(e.colors) && e.colors.length === 2 ? e.colors : GLITCH_PAIRS[0];
    const dist = k(e.offset, 30) * size * 0.12, [vx, vy] = dirVec(e.direction ?? 0);
    passes.push({ dx: -vx * dist, dy: -vy * dist, fill: c1, stroke: null, opacity: 1, blur: 0 }, { dx: vx * dist, dy: vy * dist, fill: c2, stroke: null, opacity: 1, blur: 0 });
  } else if (e.type === "glow") {
    const s = k(e.size, 50), a = 1 - k(e.transparency, 20);
    passes.push({ dx: 0, dy: 0, fill: e.color || "#facc15", stroke: { color: e.color || "#facc15", width: size * 0.04 * s }, opacity: a, blur: size * (0.05 + 0.3 * s) });
  } else if (e.type === "extrude") {
    // 3D: solid steps of the side colour from the deepest to the letters (a block extrusion), under an optional
    // soft shadow at the far end. Depth 100 = 12% of the font size.
    const depth = k(e.depth, 40) * size * 0.12, [vx, vy] = dirVec(e.direction ?? -45), side = e.color || extrudeColor(color);
    const steps = Math.max(2, Math.min(6, Math.round(depth / Math.max(1, size * 0.012))));
    const sh = k(e.shade, 40);
    if (sh > 0 && depth > 0) passes.push({ dx: vx * depth * 1.25, dy: vy * depth * 1.25, fill: "#000000", stroke: null, opacity: 0.12 + 0.3 * sh, blur: size * (0.04 + 0.1 * sh) });
    for (let i = steps; i >= 1; i--) { const f = (i / steps) * depth; passes.push({ dx: vx * f, dy: vy * f, fill: i === steps ? mix(side, "#000000", 0.18) : side, stroke: null, opacity: 1, blur: 0 }); }
  } else if (e.type === "neon") {
    const i = k(e.intensity, 50);
    passes.push({ dx: 0, dy: 0, fill: color, stroke: null, opacity: 0.55 + 0.4 * i, blur: size * (0.1 + 0.35 * i) }, { dx: 0, dy: 0, fill: color, stroke: null, opacity: 0.8, blur: size * (0.03 + 0.08 * i) });
    main.fill = mix(color, "#ffffff", 0.35 + 0.45 * i);
  }
  return { passes, main };
}
/** How far effects reach outside the text box (px), for picture exports that must not cut glows off. */
export function paintReach(t) {
  const { passes, main } = textPaint(t);
  let r = main.stroke ? main.stroke.width : 0;
  for (const p of passes) r = Math.max(r, Math.hypot(p.dx, p.dy) + p.blur * 1.5 + (p.stroke?.width || 0));
  if (t.shadow) r = Math.max(r, Math.hypot(t.shadow.x || 0, t.shadow.y || 0) + (t.shadow.blur || 0) * 1.5);
  return Math.ceil(r);
}

/* ---------------- gradient text colour ---------------- */
/** t.gradient = { stops: [#hex…] (2–10), angle } or null. */
export const hasGradient = (g) => !!(g && Array.isArray(g.stops) && g.stops.length >= 2);
/** Canva: Shadow, Lift, Glow, Echo, Outline, Background and Curve keep the whole gradient; Neon, Hollow, Glitch, Splice show the first colour. */
export const gradientOk = (t) => hasGradient(t.gradient) && !["neon", "hollow", "glitch", "splice"].includes(t.effect?.type);
export const GRADIENT_PRESETS = [["Sunset", ["#ff7a59", "#f43f5e"], 90], ["Ocean", ["#2f80ff", "#14b8a6"], 90], ["Violet", ["#5b4cf0", "#ec4899"], 90], ["Gold", ["#f59e0b", "#fde68a"], 180], ["Forest", ["#16a34a", "#a3e635"], 90], ["Night", ["#1e1b4b", "#4338ca"], 135], ["Rainbow", ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"], 90], ["Steel", ["#334155", "#94a3b8"], 180]];

/* ---------------- curved text (layout in textlayout.js, so heights know about curves) ---------------- */
/** Offset that centres a curve layout in the layer box. */
export const curveOffset = (cl, w, h) => [(w - cl.w) / 2, (h - cl.h) / 2];
/** After a text change: curved text gets the arc's box (kept centred), other text the height its lines need. */
export function fitTextBox(l) {
  if (l.type !== "text") return l;
  const cl = curveLayout(l.text);
  if (cl) { const cx = l.x + l.w / 2, cy = l.y + l.h / 2; l.w = Math.max(4, cl.w); l.h = Math.max(4, cl.h); l.x = cx - l.w / 2; l.y = cy - l.h / 2; }
  else l.h = textHeight(l.text, l.w);
  return l;
}
/**
 * Curve -> None: the arc's box is only as wide as the arc, so the straight text would break inside its words.
 * Like Canva, the box grows (kept centred) to fit its longest line again, at most maxW wide; it never shrinks.
 */
export function uncurve(l, maxW = Infinity) {
  if (l.type !== "text") return l;
  const t = l.text;
  delete t.curve;
  const size = +t.size || 16, ls = +t.letterSpacing || 0;
  const lines = String(t.content ?? "").split("\n").map((s) => (t.upper ? s.toUpperCase() : s));
  const need = Math.min(maxW, Math.ceil(Math.max(0, ...lines.map((s) => textWidth(s, t.family, t.bold, t.italic, size) + ls * [...s].length)) + textPad(t) * 2 + 2));
  if (need > l.w) { const cx = l.x + l.w / 2; l.w = need; l.x = cx - need / 2; }
  return fitTextBox(l);
}

/* ---------------- lists ---------------- */
/** Bulleted -> numbered -> plain, like Canva's list button. Returns the new content. */
export function cycleList(content) {
  const lines = String(content).split("\n");
  const bullet = lines.every((s) => /^• /.test(s)), numbered = lines.every((s) => /^\d+\. /.test(s));
  const plain = lines.map((s) => s.replace(/^(• |\d+\. )/, ""));
  if (bullet) return plain.map((s, i) => `${i + 1}. ${s}`).join("\n");
  if (numbered) return plain.join("\n");
  return plain.map((s) => "• " + s).join("\n");
}
export const listKind = (content) => { const lines = String(content).split("\n"); return lines.every((s) => /^• /.test(s)) ? "bullet" : lines.every((s) => /^\d+\. /.test(s)) ? "number" : "none"; };
