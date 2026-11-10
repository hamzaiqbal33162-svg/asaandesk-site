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
export function animState(anim, t, page = { w: 1000, h: 1000 }) {
  const out = { opacity: 1, dx: 0, dy: 0, scale: 1, clip: 1, reveal: 1 };
  if (!anim || !anim.type) return out;
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
  let end = 0;
  for (const l of page.layers) if (l.animation && !l.hidden) end = Math.max(end, (l.animation.delay || 0) + (l.animation.duration || 0));
  return Math.round((end + hold) * 100) / 100;
}

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
