// Magic Animate: entrance animations per layer (pure maths shared by the on-canvas preview, the WebM video
// and the GIF). Layer.animation = { type, delay, duration } in seconds.
import { aabb } from "./geometry.js";

export const ANIMATION_TYPES = [
  { id: "fade", label: "Fade" },
  { id: "rise", label: "Rise" },
  { id: "pop", label: "Pop" },
  { id: "slide-left", label: "Slide left" },
  { id: "slide-right", label: "Slide right" },
  { id: "typewriter", label: "Typewriter" },
  { id: "wipe", label: "Wipe" },
];
const easeOut = (p) => 1 - (1 - p) ** 3;
const easeBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * State of a layer at time t (s): { opacity, dx, dy, scale, clip (visible width 0..1), reveal (text 0..1) }.
 * page = { w, h } for slide distances. No animation -> fully visible.
 */
export function animState(anim, t, page = { w: 1000, h: 1000 }, end = null) {
  const out = enterExit(anim, t, page, end);
  // Motion path (anim.path = { pts: [[dx, dy], …] offsets from the layer's place, delay, duration }): the layer
  // travels along the drawn line and stays at its end.
  const path = anim?.path;
  if (path?.pts?.length >= 2) {
    const q = clamp01((t - (path.delay ?? anim.delay ?? 0)) / Math.max(0.05, path.duration || 1.2));
    const [px, py] = pointAlong(path.pts, q < 1 ? easeInOut(q) : 1);
    out.dx += px; out.dy += py;
  }
  return out;
}
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
/** Point at fraction q (0..1) of a polyline's length. */
export function pointAlong(pts, q) {
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  if (!total) return pts[0];
  let want = q * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, want / seg[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; }
    want -= seg[i];
  }
  return pts[pts.length - 1];
}
/** Ready-made motion paths (offsets in page px for a page of size w × h). */
export const PATH_PRESETS = [["right", "Line to the right"], ["left", "Line to the left"], ["up", "Rise up"], ["down", "Drop down"], ["arc", "Arc"], ["zigzag", "Zigzag"], ["loop", "Loop"]];
export function presetPath(kind, page) {
  const s = Math.min(page.w, page.h) * 0.3;
  switch (kind) {
    case "left": return [[0, 0], [-s, 0]];
    case "up": return [[0, 0], [0, -s]];
    case "down": return [[0, 0], [0, s]];
    case "arc": return Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12); return [Math.round(s * (1 - Math.cos(a))), Math.round(-s * 0.6 * Math.sin(a))]; });
    case "zigzag": return [[0, 0], [s * 0.33, -s * 0.25], [s * 0.66, s * 0.25], [s, 0]].map(([x, y]) => [Math.round(x), Math.round(y)]);
    case "loop": return Array.from({ length: 17 }, (_, i) => { const a = 2 * Math.PI * (i / 16); return [Math.round(s * 0.35 * Math.sin(a)), Math.round(-s * 0.35 * (1 - Math.cos(a)))]; });
    default: return [[0, 0], [s, 0]];
  }
}
/** Simplifies a drawn line (page px offsets) to at most ~40 points, dropping points closer than `min` px. */
export function simplifyPath(pts, min = 6) {
  const out = [pts[0]];
  for (const p of pts.slice(1)) { const l = out[out.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= min) out.push(p); }
  if (out.length < 2 && pts.length > 1) out.push(pts[pts.length - 1]);
  const step = Math.ceil(out.length / 40);
  return out.filter((_, i) => i % step === 0 || i === out.length - 1).map(([x, y]) => [Math.round(x), Math.round(y)]);
}

/**
 * Appear on click (anim.click = 1, 2, …: the build order in Present). Returns a copy of the page where click
 * items revealed so far get their delay moved to the time they were revealed (reveal[n-1] seconds), and later
 * ones are hidden. reveal = null times the clicks one after another (for videos, GIFs and the preview).
 */
export function clickSteps(page) { let n = 0; for (const l of page.layers) if (!l.hidden && l.animation?.click) n = Math.max(n, l.animation.click); return n; }
export function autoReveal(page, gap = 0.9) {
  const n = clickSteps(page);
  if (!n) return [];
  let t = 0;
  for (const l of page.layers) if (l.animation && !l.animation.click && !l.hidden) t = Math.max(t, ownEnd(l.animation));
  const out = [];
  for (let k = 1; k <= n; k++) {
    t += k === 1 ? 0.4 : gap;
    out.push(Math.round(t * 100) / 100);
    for (const l of page.layers) if (l.animation?.click === k && !l.hidden) t = Math.max(t, out[k - 1] + ownEnd(l.animation));
  }
  return out;
}
function ownEnd(a) { let e = a.type ? (a.delay || 0) + (a.duration || 0) : a.delay || 0; if (a.path?.pts?.length >= 2) e = Math.max(e, (a.path.delay ?? a.delay ?? 0) + (a.path.duration || 1.2)); return e; }
export function withClicks(page, reveal = null) {
  if (!clickSteps(page)) return page;
  const r = reveal || autoReveal(page);
  return { ...page, layers: page.layers.map((l) => {
    const n = l.animation?.click;
    if (!n) return l;
    if (n > r.length) return { ...l, hidden: true };
    const a = { ...l.animation, delay: r[n - 1] + (l.animation.delay || 0) };
    delete a.click;
    if (!a.type) { a.type = "fade"; a.duration = 0.3; } // hidden until its click, then it shows
    if (a.path) a.path = { ...a.path, delay: r[n - 1] + (a.path.delay ?? l.animation.delay ?? 0) };
    return { ...l, animation: a };
  }) };
}

function enterExit(anim, t, page, end) {
  const out = { opacity: 1, dx: 0, dy: 0, scale: 1, clip: 1, reveal: 1 };
  if (!anim || (!anim.type && !anim.exit)) return out;
  // Exit (anim.exit = { type, duration }): plays at the end of the page, finishing at `end`.
  if (anim.exit?.type && end != null) {
    const xd = Math.max(0.01, anim.exit.duration || 0.5), q = clamp01((t - (end - xd)) / xd);
    if (q > 0) {
      const e = easeOut(q);
      switch (anim.exit.type) {
        case "fade": out.opacity = 1 - e; break;
        case "rise": out.opacity = 1 - e; out.dy = -e * Math.min(page.h * 0.08, 120); break;
        case "pop": out.opacity = 1 - e; out.scale = 1 - 0.45 * e; break;
        case "slide-left": out.opacity = 1 - e; out.dx = -e * page.w * 0.22; break;
        case "slide-right": out.opacity = 1 - e; out.dx = e * page.w * 0.22; break;
        case "typewriter": out.reveal = 1 - q; break;
        case "wipe": out.clip = 1 - e; break;
        default: break;
      }
      return out;
    }
  }
  if (!anim.type) return out;
  const p = clamp01((t - (anim.delay || 0)) / Math.max(0.01, anim.duration || 0.6));
  const e = easeOut(p);
  switch (anim.type) {
    case "fade": out.opacity = e; break;
    case "rise": out.opacity = clamp01(p * 1.6); out.dy = (1 - e) * Math.min(page.h * 0.08, 120); break;
    case "pop": out.opacity = clamp01(p * 2.2); out.scale = 0.55 + 0.45 * (p >= 1 ? 1 : easeBack(p)); break;
    case "slide-left": out.opacity = clamp01(p * 1.8); out.dx = (1 - e) * page.w * 0.22; break;
    case "slide-right": out.opacity = clamp01(p * 1.8); out.dx = -(1 - e) * page.w * 0.22; break;
    case "typewriter": out.reveal = p; out.opacity = p > 0 ? 1 : 0; break;
    case "wipe": out.clip = e; out.opacity = p > 0 ? 1 : 0; break;
    default: break;
  }
  return out;
}

/** Length of a page's animation (s): last entrance end plus a short hold. */
export function pageDuration(page, hold = 1.2) {
  page = withClicks(page);
  let end = 0, exit = 0;
  for (const l of page.layers) if (l.timing && !l.hidden) end = Math.max(end, +l.timing.end || 0, +l.timing.start || 0);
  for (const l of page.layers) if (l.animation && !l.hidden) { end = Math.max(end, (l.animation.delay || 0) + (l.animation.duration || 0), ownEnd(l.animation)); if (l.animation.exit?.type) exit = Math.max(exit, l.animation.exit.duration || 0.5); }
  return Math.round((end + hold + exit) * 100) / 100;
}
/** Speeds for entrance / exit animations (seconds). */
export const SPEEDS = [["slow", "Slow", 1.2], ["medium", "Medium", 0.7], ["fast", "Fast", 0.4]];

/**
 * Assigns tasteful entrance animations to every layer of a page (deterministic):
 * backgrounds fade first, then things appear in reading order (top to bottom, left to right) with a small stagger:
 * the main heading pops (short) or rises, other text rises or types, photos wipe or fade, stickers and shapes pop,
 * things near the left / right edge slide in from that side.
 */
export function autoAnimate(page, size, { stagger = 0.18, duration = 0.7 } = {}) {
  const W = size.w, H = size.h;
  const items = page.layers.filter((l) => !l.hidden).map((l) => ({ l, b: aabb(l) }));
  const bgs = items.filter(({ b, l }) => l.type !== "text" && b.w >= W * 0.8 && b.h >= H * 0.8);
  const rest = items.filter((it) => !bgs.includes(it)).sort((a, b) => (Math.abs(a.b.y - b.b.y) > 8 ? a.b.y - b.b.y : a.b.x - b.b.x));
  const texts = rest.filter((it) => it.l.type === "text");
  const heading = texts.slice().sort((a, b) => b.l.text.size - a.l.text.size)[0]?.l;
  const out = new Map();
  for (const { l } of bgs) out.set(l.id, { type: "fade", delay: 0, duration: 0.5 });
  let t = bgs.length ? 0.25 : 0.1, textIndex = 0;
  for (const { l, b } of rest) {
    let type;
    const cx = b.x + b.w / 2;
    if (l.type === "text") {
      const len = l.text.content.length;
      if (l === heading) type = len <= 22 ? "pop" : "rise";
      else type = len <= 28 && textIndex % 2 === 1 ? "typewriter" : "rise";
      textIndex++;
    } else if (l.type === "image" || l.type === "frame") type = b.w > b.h * 1.3 ? "wipe" : "fade";
    else if (cx < W * 0.2) type = "slide-right";
    else if (cx > W * 0.8) type = "slide-left";
    else type = "pop";
    const dur = type === "typewriter" ? Math.min(2, Math.max(0.6, l.text.content.length * 0.045)) : duration;
    out.set(l.id, { type, delay: Math.round(t * 100) / 100, duration: Math.round(dur * 100) / 100 });
    t += stagger;
  }
  return out;
}

/** Frame times (s) for an export at `fps` covering the page duration. */
export function frameTimes(duration, fps) {
  const n = Math.max(1, Math.round(duration * fps));
  return Array.from({ length: n }, (_, i) => Math.round((i / fps) * 10000) / 10000);
}
