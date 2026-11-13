// Scene designs for the video templates (pure ES module, no DOM). A template scene is a full-frame picture (real library
// photo + gradients, shapes, frames: drawn here as SVG, rasterised once by builtins.sceneBlob into the scene's image clip,
// which then plays with a slow zoom or pan) plus ordinary text clips on top (made by the layout helpers below, measured
// with the editor's own font metrics so the gallery thumbnail and the opened video put every word in the same place).
// Units: a frame is F.W x F.H units with its shorter side = 1080 (the text clip size unit of the player).
import { kit, rect, circle, pathEl, line, mix, isDark, esc, rng } from "../shared/tpl-kit.js";
import { PHOTOS } from "../shared/photo-library.js";
import { CH, W as WIDTHS } from "./text-metrics.js";

/**
 * n different library photos for a template, deterministic per seed. topic = photo theme names first (best first, e.g.
 * "fitness sport"), then tag words ("gym yoga"): photos of the first themes and with tag hits rank first, and the template
 * picks among the best few, so every photo fits the topic (the library grows; the same words pick up new photos).
 */
// close-ups of small objects make odd video backgrounds: used only when nothing else fits the topic
const ODD = new Set(["binder-clip-desk", "ballpoint-pen-notebook", "silicon-wafer-chips", "circuit-board", "network-cables-switch", "keyboard-keys-closeup", "blue-pills", "syringe",
  "green-cardamom-pods", "tea-plantation-leaves", "white-wallpaper-texture", "weathered-wood-planks", "white-marble", "grey-marble-stone", "thread-spools", "laundry-on-rack", "black-briefcase"]);
export function photoPool(topic, n, seed) {
  const words = String(topic || "").toLowerCase().split(/\s+/).filter(Boolean);
  const scored = [];
  for (const p of PHOTOS) {
    let s = 0; const ti = words.indexOf(p.theme);
    if (ti >= 0) s += 100 - ti * 12;
    for (const w of words) if (p.tags?.includes(w)) s += 9;
    if (s > 0) scored.push([ODD.has(p.id) ? s - 70 : s, p]);
  }
  scored.sort((a, b) => b[0] - a[0] || (a[1].id < b[1].id ? -1 : 1));
  const good = scored.filter(([v]) => v > 40), list = good.length >= 3 ? good : scored; // odd close-ups only when little else fits
  let cand = list.slice(0, Math.max(Math.min(n, list.length), Math.min(list.length, n + 3))).map((x) => x[1]);
  if (!cand.length) cand = PHOTOS.slice(0, Math.max(1, n));
  const R = rng(String(seed) + "|" + topic), arr = cand.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return Array.from({ length: n }, (_, i) => arr[i % arr.length]);
}

// ---------- text measuring (same fonts as the player: Liberation Sans/Serif/Mono, Carlito, Caladea)
const CI = new Map([...CH].map((c, i) => [c, i]));
const fkey = (fam, bold, it) => {
  const b = { serif: "serif", calibri: "calibri", cambria: "cambria", mono: "mono" }[fam] || "sans";
  if (b === "sans" || b === "serif") return b + (bold && it ? "-bi" : bold ? "-b" : it ? "-i" : "");
  return b + (bold ? "-b" : "");
};
export function textWidth(s, size, fam = "sans", bold = true, it = false) {
  const t = WIDTHS[fkey(fam, bold, it)] || WIDTHS["sans-b"]; let w = 0;
  for (const ch of String(s)) { const i = CI.get(ch); w += i == null ? 640 : t[i]; }
  return (w * size) / 1000;
}
function wrap(str, size, maxW, fam, bold, it) {
  const out = []; let cur = "";
  for (const w of String(str).split(/\s+/).filter(Boolean)) { const t = cur ? cur + " " + w : w; if (!cur || textWidth(t, size, fam, bold, it) <= maxW) cur = t; else { out.push(cur); cur = w; } }
  if (cur) out.push(cur);
  return out;
}
/** Largest size (down to min) at which `str` wraps into at most maxLines lines of maxW (and maxH tall). */
export function fitText(str, { maxW, maxLines = 2, size = 120, min = 28, fam = "sans", bold = true, it = false, maxH = 0, pitch = 1.22 }) {
  for (let s = Math.round(size); ; s = Math.max(min, Math.floor(s * 0.94))) {
    const lines = wrap(str, s, maxW, fam, bold, it);
    const ok = lines.length <= maxLines && lines.every((l) => textWidth(l, s, fam, bold, it) <= maxW) && (!maxH || (lines.length - 1) * s * pitch + 0.8 * s <= maxH);
    if (ok || s <= min) return { lines, size: s };
  }
}
const r4 = (v) => Math.round(v * 10000) / 10000;
// words are fitted to 94% of their box: slack for a slightly wider fallback font in a browser without Arial metrics
const SLACK = 0.94;
const up = (s) => String(s).toUpperCase();
export const onBg = (c) => (isDark(c) ? "#ffffff" : "#111827");

/** One text clip at a place in units: left/cx/right + top/cy/bottom. Returns the clip (player fields) and its box. */
export function textClip(F, text, o) {
  const lines = String(text).split("\n"), fam = o.fam || "sans", bold = o.bold ?? true, it = !!o.italic, size = Math.round(o.size);
  const bw = Math.max(...lines.map((l) => textWidth(l, size, fam, bold, it))), bh = lines.length * size * 1.22, pad = o.bg ? size * 0.32 : 0;
  const cx = o.cx ?? (o.left != null ? o.left + pad + bw / 2 : o.right - pad - bw / 2);
  const cy = o.cy ?? (o.top != null ? o.top + pad + bh / 2 : o.bottom - pad - bh / 2);
  const c = { style: o.style || "subtitle", text: lines.join("\n"), x: r4(cx / F.W), y: r4(cy / F.H), size, bold, color: o.color || "#ffffff", bg: o.bg || "",
    family: fam, align: o.align || "center", animIn: o.anim || "fade", animOut: o.out || "fade" };
  if (it) c.italic = true;
  if (o.at) c.at = Math.round(o.at * 100) / 100;
  if (o.dur) c.animInDur = o.dur;
  return c;
}

// ---------- scene looks: draw(k, g) -> SVG body; box(ori, lo) -> where the words go (fractions) and their colours
// g = { x, y, w, h, P (palette), ph (photos), lo (look options), size ("thumb" | "full") }
const ori = (w, h) => (w > h * 1.2 ? "L" : h > w * 1.2 ? "P" : "S");
const n1 = (v) => Math.round(v * 10) / 10;
const pick = (o, v) => (typeof v === "object" && v && !Array.isArray(v) ? v[o] ?? v.S ?? v.L : v);
const B = (l, t, r, b, ink, align = "left", v = "bottom", more = {}) => ({ l, t, r, b, ink, align, v, ...more });
const photo = (k, g, i, x, y, w, h, o = {}) => k.photo(g.ph[i % g.ph.length], x, y, w, h, { size: g.size, ...o });
const poly = (pts, fill, ex = "") => pathEl("M" + pts.map((p) => p.map(n1).join(" ")).join("L") + "Z", fill, ex);
function stars(cx, cy, r, fill, n = 5, gap = 2.6) {
  let s = "";
  for (let j = 0; j < n; j++) { const x0 = cx + (j - (n - 1) / 2) * r * gap; let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? "L" : "M") + n1(x0 + Math.cos(a) * rr) + " " + n1(cy + Math.sin(a) * rr); } s += pathEl(d + "Z", fill); }
  return s;
}
function burst(cx, cy, r, fill, pts = 14, ex = "") { let d = ""; for (let i = 0; i < pts * 2; i++) { const a = (i * Math.PI) / pts, rr = i % 2 ? r * 0.78 : r; d += (i ? "L" : "M") + n1(cx + Math.cos(a) * rr) + " " + n1(cy + Math.sin(a) * rr); } return pathEl(d + "Z", fill, ex); }

export const LOOKS = {
  // full-bleed photo, dark gradient from the bottom: words bottom-left
  full: {
    draw: (k, g) => photo(k, g, 0, g.x, g.y, g.w, g.h) + k.scrim(g.x, g.y + g.h * 0.28, g.w, g.h * 0.72, g.P.dark, 0, 0.9) + k.scrim(g.x, g.y, g.w, g.h * 0.24, g.P.dark, 0, 0.4, "down")
      + (g.lo.bar ? rect(g.x + g.w * 0.07, g.y + g.h * 0.93, g.w * 0.12, Math.min(g.w, g.h) * 0.012, g.P.b) : ""),
    box: (o, lo) => lo.center ? B(0.09, 0.3, 0.91, 0.88, "#ffffff", "center") : pick(o, { L: B(0.07, 0.3, 0.72, 0.88, "#ffffff"), P: B(0.08, 0.38, 0.92, 0.88, "#ffffff"), S: B(0.08, 0.32, 0.9, 0.88, "#ffffff") }),
  },
  // photo with a dark veil and vignette: centred words
  dim: {
    draw: (k, g) => photo(k, g, 0, g.x, g.y, g.w, g.h) + rect(g.x, g.y, g.w, g.h, g.P.dark, 0, ' opacity=".42"') + rect(g.x, g.y, g.w, g.h, k.rad([[g.P.dark, 0], [g.P.dark, 0.75]], 0.5, 0.5, 0.75)),
    box: (o) => pick(o, { L: B(0.12, 0.14, 0.88, 0.86, "#ffffff", "center", "center"), P: B(0.08, 0.18, 0.92, 0.82, "#ffffff", "center", "center"), S: B(0.09, 0.14, 0.91, 0.86, "#ffffff", "center", "center") }),
  },
  // duotone: photo washed in the accent colour
  duo: {
    draw: (k, g) => photo(k, g, 0, g.x, g.y, g.w, g.h) + rect(g.x, g.y, g.w, g.h, g.P.a, 0, ' opacity=".72" style="mix-blend-mode:multiply"') + rect(g.x, g.y, g.w, g.h, k.lin([[g.P.dark, 0.1], [g.P.dark, 0.72]], 90)),
    box: (o) => pick(o, { L: B(0.1, 0.14, 0.9, 0.86, "#ffffff", "center", "center"), P: B(0.08, 0.16, 0.92, 0.84, "#ffffff", "center", "center"), S: B(0.08, 0.14, 0.92, 0.86, "#ffffff", "center", "center") }),
  },
  // photo on one side, solid panel with the words on the other
  split: {
    draw: (k, g) => {
      const { x, y, w, h, P, lo } = g, o = ori(w, h), m = Math.min(w, h), pc = lo.panel === "a" ? P.a : lo.panel === "light" ? P.light : P.dark, right = lo.side === "R";
      let s = rect(x, y, w, h, pc);
      if (o === "P") { s += photo(k, g, 0, x, y, w, h * 0.5) + rect(x, y + h * 0.5 - m * 0.006, w, m * 0.012, P.b); s += `<g${k.clipRect(x, y + h * 0.5, w, h * 0.5)}>` + k.blob(x + w * 0.95, y + h * 0.98, m * 0.3, lo.panel === "a" ? P.dark : P.a, { ex: ' opacity=".28"' }) + `</g>`; return s; }
      const px = right ? x + w * 0.5 : x, tx = right ? x : x + w * 0.5;
      s += photo(k, g, 0, px, y, w * 0.5, h) + rect((right ? px : px + w * 0.5) - m * 0.006, y, m * 0.012, h, P.b);
      s += `<g${k.clipRect(tx, y, w * 0.5, h)}>` + k.blob(right ? tx + w * 0.02 : tx + w * 0.48, y + h * 0.02, m * 0.32, lo.panel === "a" ? P.dark : P.a, { ex: ' opacity=".3"' }) + rect(right ? tx + w * 0.38 : tx + w * 0.06, y + h * 0.78, m * 0.24, m * 0.16, k.dots(isDark(pc) ? "#ffffff" : P.dark, m * 0.03, m * 0.005, 0.35)) + `</g>`;
      return s;
    },
    box: (o, lo, P) => {
      const pc = lo.panel === "a" ? P.a : lo.panel === "light" ? P.light : P.dark, ink = onBg(pc), right = lo.side === "R";
      return pick(o, { L: right ? B(0.06, 0.12, 0.45, 0.88, ink, "left", "center") : B(0.56, 0.12, 0.94, 0.88, ink, "left", "center"), P: B(0.08, 0.54, 0.92, 0.95, ink, "left", "center"), S: right ? B(0.06, 0.1, 0.45, 0.9, ink, "left", "center") : B(0.56, 0.1, 0.94, 0.9, ink, "left", "center") });
    },
  },
  // dark gradient page with a tilted polaroid photo
  frame: {
    draw: (k, g) => {
      const { x, y, w, h, P, lo } = g, o = ori(w, h), m = Math.min(w, h);
      const f = pick(o, { L: [0.52, 0.11, 0.42, 0.78], P: [0.12, 0.05, 0.76, 0.5], S: [0.5, 0.1, 0.42, 0.74] }), fx = x + w * f[0], fy = y + h * f[1], fw = w * f[2], fh = h * f[3], pad = m * 0.022;
      let s = rect(x, y, w, h, k.lin([P.dark, mix(P.dark, P.a, 0.5)], 35)) + k.blob(fx + fw * 0.5, fy + fh * 0.5, m * 0.42, P.a, { ex: ' opacity=".45"' }) + rect(x + w * 0.03, y + h * 0.04, m * 0.28, m * 0.2, k.dots("#ffffff", m * 0.03, m * 0.005, 0.3));
      s += `<g transform="rotate(${lo.tilt ?? -4} ${n1(fx + fw / 2)} ${n1(fy + fh / 2)})">` + rect(fx - pad, fy - pad, fw + pad * 2, fh + pad * 3.6, "#ffffff", m * 0.008, k.shadow(m * 0.02, m * 0.05, 0.4)) + photo(k, g, 0, fx, fy, fw, fh) + `</g>`;
      return s;
    },
    box: (o) => pick(o, { L: B(0.07, 0.12, 0.47, 0.88, "#ffffff", "left", "center"), P: B(0.08, 0.62, 0.92, 0.95, "#ffffff", "left", "center"), S: B(0.07, 0.1, 0.45, 0.9, "#ffffff", "left", "center") }),
  },
  // light page, big circle-cropped photo with a colour disc behind
  circle: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      const [cx, cy, r] = pick(o, { L: [x + w * 0.72, y + h * 0.5, h * 0.4], P: [x + w * 0.5, y + h * 0.29, w * 0.38], S: [x + w * 0.5, y + h * 0.33, w * 0.26] });
      return rect(x, y, w, h, P.light) + circle(cx + r * 0.16, cy - r * 0.1, r * 1.08, P.a) + rect(x + w * 0.03, y + h * 0.06, m * 0.24, m * 0.18, k.dots(P.a, m * 0.032, m * 0.006, 0.55))
        + photo(k, g, 0, cx - r, cy - r, r * 2, r * 2, { clip: circle(cx, cy, r, "#000") }) + circle(cx, cy, r, "none", ` stroke="#ffffff" stroke-width="${n1(m * 0.014)}"`) + circle(cx - r * 0.82, cy + r * 0.72, m * 0.04, P.b);
    },
    box: (o, lo, P) => pick(o, { L: B(0.07, 0.12, 0.48, 0.88, P.dark, "left", "center"), P: B(0.08, 0.6, 0.92, 0.95, P.dark, "center", "center"), S: B(0.08, 0.64, 0.92, 0.95, P.dark, "center", "center") }),
  },
  // photo with diagonal colour bands across the bottom
  band: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), y1 = y + h * (o === "L" ? 0.56 : 0.6), y2 = y + h * (o === "L" ? 0.66 : 0.68), sl = h * (o === "L" ? 0.16 : 0.08);
      return photo(k, g, 0, x, y, w, h) + poly([[x, y1], [x + w, y1 - sl], [x + w, y + h], [x, y + h]], P.a, k.shadow(-4, 12, 0.25)) + poly([[x, y2], [x + w, y2 - sl], [x + w, y + h], [x, y + h]], P.dark);
    },
    box: (o) => pick(o, { L: B(0.07, 0.7, 0.93, 0.93, "#ffffff", "left", "center"), P: B(0.08, 0.7, 0.92, 0.94, "#ffffff", "left", "center"), S: B(0.07, 0.7, 0.93, 0.94, "#ffffff", "left", "center") }),
  },
  // dimmed photo with a white card (quotes, reviews, messages)
  card: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), c = pick(o, { L: [0.14, 0.13, 0.72, 0.74], P: [0.08, 0.22, 0.84, 0.56], S: [0.09, 0.13, 0.82, 0.74] });
      const cx = x + w * c[0], cy = y + h * c[1], cw = w * c[2], chh = h * c[3];
      return photo(k, g, 0, x, y, w, h) + rect(x, y, w, h, P.dark, 0, ' opacity=".45"') + rect(cx, cy, cw, chh, "#ffffff", m * 0.03, k.shadow(m * 0.02, m * 0.06, 0.35)) + `<g${k.clipRect(cx, cy, cw, chh, m * 0.03)}>` + rect(cx, cy, cw, m * 0.018, P.a) + `</g>`;
    },
    box: (o, lo, P) => pick(o, { L: B(0.19, 0.18, 0.81, 0.82, P.dark, "center", "center"), P: B(0.13, 0.25, 0.87, 0.76, P.dark, "center", "center"), S: B(0.14, 0.17, 0.86, 0.83, P.dark, "center", "center") }),
  },
  // three-photo collage
  grid3: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), gp = m * 0.014;
      let s = rect(x, y, w, h, P.dark);
      if (o === "P") {
        s += photo(k, g, 0, x, y, w, h * 0.56 - gp / 2) + photo(k, g, 1, x, y + h * 0.56 + gp / 2, w / 2 - gp / 2, h * 0.22 - gp) + photo(k, g, 2, x + w / 2 + gp / 2, y + h * 0.56 + gp / 2, w / 2 - gp / 2, h * 0.22 - gp);
        return s + k.scrim(x, y + h * 0.3, w, h * 0.26, P.dark, 0, 0.55);
      }
      const bw = w * (o === "L" ? 0.6 : 0.62);
      s += photo(k, g, 0, x, y, bw - gp / 2, h) + photo(k, g, 1, x + bw + gp / 2, y, w - bw - gp / 2, h / 2 - gp / 2) + photo(k, g, 2, x + bw + gp / 2, y + h / 2 + gp / 2, w - bw - gp / 2, h / 2 - gp / 2);
      return s + k.scrim(x, y + h * 0.35, bw, h * 0.65, P.dark, 0, 0.85);
    },
    box: (o) => pick(o, { L: B(0.05, 0.42, 0.56, 0.92, "#ffffff"), P: B(0.08, 0.8, 0.92, 0.97, "#ffffff", "left", "center"), S: B(0.05, 0.42, 0.58, 0.92, "#ffffff") }),
  },
  // three photo prints fanned out on a soft page (slideshows)
  stack: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      const [cw, chh, cy0, sp] = pick(o, { L: [w * 0.25, h * 0.5, y + h * 0.42, w * 0.25], P: [w * 0.46, h * 0.3, y + h * 0.4, w * 0.24], S: [w * 0.34, h * 0.42, y + h * 0.42, w * 0.27] });
      let s = rect(x, y, w, h, k.lin([P.light, mix(P.light, P.a, 0.3)], 90)) + k.blob(x + w * 0.5, y + h * 0.66, m * 0.46, P.a, { ex: ' opacity=".16"' }) + rect(x + w * 0.04, y + h * 0.7, m * 0.26, m * 0.2, k.dots(P.a, m * 0.032, m * 0.006, 0.5));
      [[-8, -1, 1], [7, 1, 2], [0, 0, 0]].forEach(([rot, off, pi]) => {
        const cx = x + w / 2 + off * sp - cw / 2, cy = cy0 + (off ? h * 0.025 : -h * 0.01), pd = m * 0.016;
        s += `<g transform="rotate(${rot} ${n1(cx + cw / 2)} ${n1(cy + chh / 2)})">` + rect(cx - pd, cy - pd, cw + pd * 2, chh + pd * 4, "#ffffff", m * 0.008, k.shadow(m * 0.02, m * 0.05, 0.28)) + photo(k, g, pi, cx, cy, cw, chh) + `</g>`;
      });
      return s;
    },
    box: (o, lo, P) => pick(o, { L: B(0.08, 0.05, 0.92, 0.3, P.dark, "center", "center"), P: B(0.08, 0.05, 0.92, 0.3, P.dark, "center", "center"), S: B(0.08, 0.04, 0.92, 0.3, P.dark, "center", "center") }),
  },
  // dark neon: photo low in black with colour glows
  neon: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, m = Math.min(w, h);
      return rect(x, y, w, h, "#05060c") + photo(k, g, 0, x, y, w, h, { opacity: 0.42 }) + rect(x, y, w, h, k.rad([[P.a, 0.6], [P.a, 0]], 0.15, 0.1, 0.7)) + rect(x, y, w, h, k.rad([[P.b, 0.45], [P.b, 0]], 0.92, 0.95, 0.6))
        + line(x + w * 0.08, y + h * 0.9, x + w * 0.32, y + h * 0.9, P.b, m * 0.008, k.glow(P.b, m * 0.01));
    },
    box: (o) => pick(o, { L: B(0.1, 0.12, 0.9, 0.84, "#ffffff", "center", "center"), P: B(0.08, 0.14, 0.92, 0.84, "#ffffff", "center", "center"), S: B(0.08, 0.12, 0.92, 0.84, "#ffffff", "center", "center") }),
  },
  // soft page with the photo in a video-player window (tutorials, how-tos)
  window: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      const f = pick(o, { L: [0.41, 0.13, 0.54, 0.74], P: [0.06, 0.06, 0.88, 0.44], S: [0.08, 0.06, 0.84, 0.5] }), wx = x + w * f[0], wy = y + h * f[1], ww = w * f[2], wh = h * f[3];
      const bar = m * 0.05;
      let s = rect(x, y, w, h, P.light) + k.blob(wx + ww * 0.9, wy + wh * 0.1, m * 0.3, P.a, { ex: ' opacity=".28"' }) + k.blob(wx + ww * 0.05, wy + wh, m * 0.2, P.b, { ex: ' opacity=".35"' });
      s += rect(wx, wy, ww, wh, "#ffffff", m * 0.025, k.shadow(m * 0.025, m * 0.06, 0.25)) + `<g${k.clipRect(wx, wy, ww, wh, m * 0.025)}>` + rect(wx, wy, ww, bar, "#eef0f5") + [0, 1, 2].map((i) => circle(wx + bar * (0.6 + i * 0.5), wy + bar / 2, bar * 0.14, ["#f87171", "#fbbf24", "#34d399"][i])).join("")
        + photo(k, g, 0, wx, wy + bar, ww, wh - bar) + k.scrim(wx, wy + wh * 0.6, ww, wh * 0.4, "#000000", 0, 0.45) + rect(wx + ww * 0.05, wy + wh - m * 0.04, ww * 0.9, m * 0.008, "#ffffff", m * 0.004, ' opacity=".5"') + rect(wx + ww * 0.05, wy + wh - m * 0.04, ww * 0.38, m * 0.008, P.a, m * 0.004) + circle(wx + ww * 0.43, wy + wh - m * 0.036, m * 0.014, "#ffffff") + `</g>`;
      return s + k.play(wx + ww / 2, wy + (wh + bar) / 2, m * 0.055, { fill: "#ffffff", color: P.a });
    },
    box: (o, lo, P) => pick(o, { L: B(0.05, 0.12, 0.37, 0.88, P.dark, "left", "center"), P: B(0.08, 0.54, 0.92, 0.95, P.dark, "left", "center"), S: B(0.08, 0.6, 0.92, 0.95, P.dark, "left", "center") }),
  },
  // cream luxury: arch-shaped photo, thin rules (invitations, weddings)
  arch: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      const f = pick(o, { L: [0.6, 0.1, 0.32, 0.84], P: [0.2, 0.05, 0.6, 0.52], S: [0.56, 0.08, 0.36, 0.84] }), ax = x + w * f[0], ay = y + h * f[1], aw = w * f[2], ah = h * f[3];
      const d = `M${n1(ax)} ${n1(ay + ah)}V${n1(ay + aw / 2)}A${n1(aw / 2)} ${n1(aw / 2)} 0 0 1 ${n1(ax + aw)} ${n1(ay + aw / 2)}V${n1(ay + ah)}Z`;
      return rect(x, y, w, h, P.light) + rect(x + m * 0.035, y + m * 0.035, w - m * 0.07, h - m * 0.07, "none", 0, ` stroke="${P.a}" stroke-opacity=".45" stroke-width="${n1(m * 0.003)}"`)
        + pathEl(d, mix(P.light, P.a, 0.25), ` transform="translate(${n1(m * 0.025)} ${n1(m * 0.025)})"`) + photo(k, g, 0, ax, ay, aw, ah, { clip: `<path d="${d}"/>` }) + circle(ax, ay + aw * 0.55, m * 0.035, P.b);
    },
    box: (o, lo, P) => pick(o, { L: B(0.08, 0.14, 0.54, 0.86, P.dark, "left", "center"), P: B(0.08, 0.6, 0.92, 0.94, P.dark, "center", "center"), S: B(0.08, 0.12, 0.52, 0.88, P.dark, "left", "center") }),
  },
  // magazine cover: photo on top, light band with the words
  magazine: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, m = Math.min(w, h), ph = h * 0.6;
      return rect(x, y, w, h, P.light) + photo(k, g, 0, x, y, w, ph) + k.scrim(x, y, w, h * 0.2, P.dark, 0, 0.35, "down") + rect(x + w * 0.06, y + ph + m * 0.05, m * 0.12, m * 0.014, P.a);
    },
    box: (o, lo, P) => B(0.06, 0.66, 0.94, 0.95, P.dark, "left", "center"),
  },
  // sale: accent slab with stripes beside a slanted photo
  stripes: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      let s = rect(x, y, w, h, P.a) + rect(x, y, w, h, k.pattern(m * 0.06, m * 0.06, `<path d="M0 ${n1(m * 0.06)}L${n1(m * 0.06)} 0" stroke="#ffffff" stroke-width="${n1(m * 0.012)}" opacity=".14"/>`));
      if (o === "P") { const pts = [[x, y], [x + w, y], [x + w, y + h * 0.46], [x, y + h * 0.54]]; return s + poly(pts.map(([a, b]) => [a, b + m * 0.02]), P.dark) + `<g${k.clip(poly(pts, "#000"))}>${photo(k, g, 0, x, y, w, h * 0.54)}</g>`; }
      const x1 = x + w * (o === "L" ? 0.5 : 0.52), x2 = x + w * (o === "L" ? 0.42 : 0.44), pts = [[x1, y], [x + w, y], [x + w, y + h], [x2, y + h]];
      return s + poly(pts.map(([a, b]) => [a - m * 0.025, b]), P.dark) + `<g${k.clip(poly(pts, "#000"))}>${photo(k, g, 0, x2, y, w - (x2 - x), h)}</g>`;
    },
    box: (o, lo, P) => pick(o, { L: B(0.05, 0.1, 0.41, 0.9, onBg(P.a), "left", "center"), P: B(0.08, 0.57, 0.92, 0.95, onBg(P.a), "left", "center"), S: B(0.06, 0.1, 0.42, 0.9, onBg(P.a), "left", "center") }),
  },
  // film strip of photos
  film: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      const [sy, sh, nf] = pick(o, { L: [0.1, 0.56, 3], P: [0.06, 0.44, 2], S: [0.08, 0.5, 2] }), top = y + h * sy, H = h * sh, hole = m * 0.03;
      let s = rect(x, y, w, h, k.lin([P.dark, "#05060a"], 90)) + rect(x, top, w, H, "#0b0b10", 0, k.shadow(m * 0.01, m * 0.04, 0.5));
      for (let i = 0; i * hole * 1.9 < w; i++) s += rect(x + i * hole * 1.9 + hole * 0.4, top + hole * 0.35, hole, hole * 0.7, "#e9e9ee", hole * 0.18) + rect(x + i * hole * 1.9 + hole * 0.4, top + H - hole * 1.05, hole, hole * 0.7, "#e9e9ee", hole * 0.18);
      const fw = (w - m * 0.04 * (nf + 1)) / nf, fh = H - hole * 2.8;
      for (let i = 0; i < nf; i++) s += photo(k, g, i, x + m * 0.04 + i * (fw + m * 0.04), top + hole * 1.4, fw, fh, { rx: m * 0.008 });
      return s;
    },
    box: (o) => pick(o, { L: B(0.07, 0.68, 0.93, 0.95, "#ffffff", "left", "center"), P: B(0.08, 0.54, 0.92, 0.95, "#ffffff", "left", "center"), S: B(0.07, 0.6, 0.93, 0.95, "#ffffff", "left", "center") }),
  },
  // social story: photo, progress bars and profile picture on top, gradient below
  story: {
    draw: (k, g) => {
      const { x, y, w, h, P, lo } = g, m = Math.min(w, h), n = lo.n || 3, cur = lo.i || 0, gp = m * 0.012, bw = (w - m * 0.08 - gp * (n - 1)) / n;
      let s = photo(k, g, 0, x, y, w, h) + k.scrim(x, y, w, h * 0.2, "#000000", 0, 0.5, "down") + k.scrim(x, y + h * 0.4, w, h * 0.6, P.dark, 0, 0.88);
      for (let i = 0; i < n; i++) s += rect(x + m * 0.04 + i * (bw + gp), y + m * 0.03, bw, m * 0.008, "#ffffff", m * 0.004, i <= cur ? "" : ' opacity=".4"');
      const r = m * 0.04;
      return s + photo(k, g, 1, x + m * 0.04, y + m * 0.06, r * 2, r * 2, { clip: circle(x + m * 0.04 + r, y + m * 0.06 + r, r, "#000") }) + circle(x + m * 0.04 + r, y + m * 0.06 + r, r, "none", ` stroke="${P.b}" stroke-width="${n1(m * 0.006)}"`);
    },
    box: (o) => pick(o, { L: B(0.07, 0.34, 0.75, 0.9, "#ffffff"), P: B(0.08, 0.42, 0.92, 0.88, "#ffffff"), S: B(0.08, 0.36, 0.9, 0.9, "#ffffff") }),
  },
  // event ticket with a photo stub
  ticket: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), f = pick(o, { L: [0.07, 0.16, 0.86, 0.68], P: [0.08, 0.1, 0.84, 0.8], S: [0.07, 0.12, 0.86, 0.76] });
      const tx = x + w * f[0], ty = y + h * f[1], tw = w * f[2], th = h * f[3], r = m * 0.035, bg = k.lin([P.dark, mix(P.dark, P.a, 0.6)], 40);
      let s = rect(x, y, w, h, bg) + rect(x, y, w, h, k.dots("#ffffff", m * 0.04, m * 0.004, 0.18)) + rect(tx, ty, tw, th, "#ffffff", m * 0.025, k.shadow(m * 0.02, m * 0.05, 0.4));
      if (o === "P") { const sy = ty + th * 0.45; s += photo(k, g, 0, tx, ty, tw, th * 0.45, { clip: `<path d="M${n1(tx)} ${n1(sy)}V${n1(ty + m * 0.025)}Q${n1(tx)} ${n1(ty)} ${n1(tx + m * 0.025)} ${n1(ty)}H${n1(tx + tw - m * 0.025)}Q${n1(tx + tw)} ${n1(ty)} ${n1(tx + tw)} ${n1(ty + m * 0.025)}V${n1(sy)}Z"/>` }) + circle(tx, sy, r, P.dark) + circle(tx + tw, sy, r, P.dark) + line(tx + r * 1.4, sy, tx + tw - r * 1.4, sy, P.a, m * 0.004, ` stroke-dasharray="${n1(m * 0.016)} ${n1(m * 0.012)}"`); return s; }
      const sx = tx + tw * 0.38;
      s += photo(k, g, 0, tx, ty, tw * 0.38, th, { clip: `<path d="M${n1(sx)} ${n1(ty)}H${n1(tx + m * 0.025)}Q${n1(tx)} ${n1(ty)} ${n1(tx)} ${n1(ty + m * 0.025)}V${n1(ty + th - m * 0.025)}Q${n1(tx)} ${n1(ty + th)} ${n1(tx + m * 0.025)} ${n1(ty + th)}H${n1(sx)}Z"/>` });
      return s + circle(sx, ty, r, mix(P.dark, P.a, 0.3)) + circle(sx, ty + th, r, mix(P.dark, P.a, 0.3)) + line(sx, ty + r * 1.4, sx, ty + th - r * 1.4, P.a, m * 0.004, ` stroke-dasharray="${n1(m * 0.016)} ${n1(m * 0.012)}"`) + rect(tx + tw - m * 0.05, ty + th * 0.2, m * 0.012, th * 0.6, P.a, m * 0.006);
    },
    box: (o, lo, P) => pick(o, { L: B(0.51, 0.2, 0.88, 0.8, P.dark, "left", "center"), P: B(0.13, 0.57, 0.87, 0.88, P.dark, "left", "center"), S: B(0.48, 0.16, 0.89, 0.86, P.dark, "left", "center") }),
  },
  // YouTube-thumbnail style: bold colour with a slanted photo and a burst
  thumbcut: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      let s = rect(x, y, w, h, k.lin([P.a, mix(P.a, P.dark, 0.35)], 60)) + rect(x, y, w, h, k.dots("#ffffff", m * 0.045, m * 0.005, 0.2));
      if (o === "P") { const pts = [[x, y], [x + w, y], [x + w, y + h * 0.44], [x, y + h * 0.52]]; return s + burst(x + w * 0.86, y + h * 0.5, m * 0.16, P.b, 14, ` opacity=".95"`) + poly(pts.map(([a, b]) => [a, b + m * 0.02]), P.dark, ' opacity=".55"') + `<g${k.clip(poly(pts, "#000"))}>${photo(k, g, 0, x, y, w, h * 0.52)}</g>`; }
      const pts = [[x + w * 0.46, y], [x + w, y], [x + w, y + h], [x + w * 0.36, y + h]];
      return s + burst(x + w * 0.44, y + h * 0.16, m * 0.17, P.b, 14) + poly(pts.map(([a, b]) => [a - m * 0.03, b]), P.dark, ' opacity=".5"') + `<g${k.clip(poly(pts, "#000"))}>${photo(k, g, 0, x + w * 0.36, y, w * 0.64, h)}</g>`;
    },
    box: (o, lo, P) => pick(o, { L: B(0.05, 0.12, 0.47, 0.9, onBg(P.a), "left", "center"), P: B(0.07, 0.56, 0.93, 0.96, onBg(P.a), "left", "center"), S: B(0.05, 0.12, 0.47, 0.9, onBg(P.a), "left", "center") }),
  },
  // four photo tiles with a centred word box
  tiles: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, m = Math.min(w, h), gp = m * 0.014, tw = (w - gp * 3) / 2, th = (h - gp * 3) / 2;
      let s = rect(x, y, w, h, P.dark);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], q) => { s += photo(k, g, q, x + gp + i * (tw + gp), y + gp + j * (th + gp), tw, th, { rx: m * 0.018 }); });
      return s + rect(x, y, w, h, k.rad([[P.dark, 0.7], [P.dark, 0]], 0.5, 0.5, 0.42));
    },
    box: (o) => B(0.1, 0.2, 0.9, 0.8, "#ffffff", "center", "center"),
  },
  // two photos side by side (or stacked) with a slanted divider
  versus: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      if (o === "P") { const a = [[x, y], [x + w, y], [x + w, y + h * 0.46], [x, y + h * 0.54]], b = [[x, y + h * 0.54], [x + w, y + h * 0.46], [x + w, y + h], [x, y + h]];
        return `<g${k.clip(poly(a, "#000"))}>${photo(k, g, 0, x, y, w, h * 0.54)}${k.scrim(x, y, w, h * 0.54, P.dark, 0, 0.55)}</g><g${k.clip(poly(b, "#000"))}>${photo(k, g, 1, x, y + h * 0.46, w, h * 0.54)}${k.scrim(x, y + h * 0.46, w, h * 0.54, P.dark, 0, 0.6)}</g>` + line(x, y + h * 0.54, x + w, y + h * 0.46, "#ffffff", m * 0.014); }
      const a = [[x, y], [x + w * 0.54, y], [x + w * 0.46, y + h], [x, y + h]], b = [[x + w * 0.54, y], [x + w, y], [x + w, y + h], [x + w * 0.46, y + h]];
      return `<g${k.clip(poly(a, "#000"))}>${photo(k, g, 0, x, y, w * 0.54, h)}${k.scrim(x, y + h * 0.4, w * 0.54, h * 0.6, P.dark, 0, 0.75)}</g><g${k.clip(poly(b, "#000"))}>${photo(k, g, 1, x + w * 0.46, y, w * 0.54, h)}${k.scrim(x + w * 0.46, y + h * 0.4, w * 0.54, h * 0.6, P.dark, 0, 0.75)}</g>` + line(x + w * 0.54, y, x + w * 0.46, y + h, "#ffffff", m * 0.014);
    },
    box: (o) => B(0.06, 0.1, 0.94, 0.9, "#ffffff", "center", "center"),
  },
  // minimal editorial page: huge type, small photo, thin rules
  editorial: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), f = pick(o, { L: [0.64, 0.24, 0.29, 0.64], P: [0.46, 0.52, 0.46, 0.42], S: [0.6, 0.36, 0.33, 0.54] });
      return rect(x, y, w, h, P.light) + line(x + w * 0.06, y + h * 0.1, x + w * 0.94, y + h * 0.1, P.dark, m * 0.003, ' opacity=".35"') + line(x + w * 0.06, y + h * 0.93, x + w * 0.94, y + h * 0.93, P.dark, m * 0.003, ' opacity=".35"')
        + rect(x + w * f[0] + m * 0.03, y + h * f[1] + m * 0.03, w * f[2], h * f[3], P.a, 0, ' opacity=".9"') + photo(k, g, 0, x + w * f[0], y + h * f[1], w * f[2], h * f[3]) + circle(x + w * f[0], y + h * f[1], m * 0.045, P.b);
    },
    box: (o, lo, P) => pick(o, { L: B(0.06, 0.14, 0.6, 0.9, P.dark, "left", "center"), P: B(0.08, 0.13, 0.92, 0.48, P.dark, "left", "center"), S: B(0.06, 0.14, 0.56, 0.9, P.dark, "left", "center") }),
  },
  // photo under a frosted glass card
  glass: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), c = pick(o, { L: [0.17, 0.16, 0.66, 0.68], P: [0.07, 0.26, 0.86, 0.48], S: [0.1, 0.16, 0.8, 0.68] });
      return photo(k, g, 0, x, y, w, h) + rect(x, y, w, h, k.lin([[P.dark, 0.5], [P.a, 0.42]], 30)) + rect(x + w * c[0], y + h * c[1], w * c[2], h * c[3], "#ffffff", m * 0.04, ` fill-opacity=".14" stroke="#ffffff" stroke-opacity=".6" stroke-width="${n1(m * 0.004)}"` + k.shadow(m * 0.02, m * 0.06, 0.25));
    },
    box: (o) => pick(o, { L: B(0.22, 0.2, 0.78, 0.8, "#ffffff", "center", "center"), P: B(0.12, 0.29, 0.88, 0.71, "#ffffff", "center", "center"), S: B(0.15, 0.2, 0.85, 0.8, "#ffffff", "center", "center") }),
  },
  // dark stage: circle photo under a spotlight
  spot: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), [cx, cy, r] = pick(o, { L: [x + w * 0.29, y + h * 0.5, h * 0.33], P: [x + w * 0.5, y + h * 0.33, w * 0.32], S: [x + w * 0.5, y + h * 0.36, w * 0.24] });
      return rect(x, y, w, h, k.rad([[mix(P.dark, P.a, 0.45), 1], [P.dark, 1]], 0.5, 0.3, 0.8)) + poly([[cx - r * 0.3, y], [cx + r * 0.3, y], [cx + r * 1.5, cy + r * 1.3], [cx - r * 1.5, cy + r * 1.3]], P.b, ' opacity=".1"')
        + circle(cx, cy, r * 1.12, P.a, ` opacity=".35"` + k.blur(m * 0.02)) + photo(k, g, 0, cx - r, cy - r, r * 2, r * 2, { clip: circle(cx, cy, r, "#000") }) + circle(cx, cy, r, "none", ` stroke="${P.b}" stroke-width="${n1(m * 0.01)}"`);
    },
    box: (o) => pick(o, { L: B(0.54, 0.14, 0.94, 0.86, "#ffffff", "left", "center"), P: B(0.08, 0.62, 0.92, 0.95, "#ffffff", "center", "center"), S: B(0.08, 0.66, 0.92, 0.96, "#ffffff", "center", "center") }),
  },
  // celebration: dimmed photo with confetti
  confetti: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, m = Math.min(w, h), R = rng(String(g.seed) + "c"), cols = [P.a, P.b, "#ffffff", mix(P.a, P.b, 0.5)];
      let s = photo(k, g, 0, x, y, w, h) + rect(x, y, w, h, k.lin([[P.dark, 0.35], [P.dark, 0.7]], 90));
      for (let i = 0; i < 34; i++) { const cx = x + R() * w, cy = y + R() * h, z = m * (0.008 + R() * 0.012), c = cols[i % 4]; if (Math.abs(cx - x - w / 2) < w * 0.3 && Math.abs(cy - y - h / 2) < h * 0.22) continue; s += i % 3 ? rect(cx, cy, z * 2.4, z, c, 0, ` transform="rotate(${Math.round(R() * 180)} ${n1(cx)} ${n1(cy)})"`) : circle(cx, cy, z * 0.8, c); }
      return s;
    },
    box: (o) => pick(o, { L: B(0.14, 0.2, 0.86, 0.8, "#ffffff", "center", "center"), P: B(0.08, 0.24, 0.92, 0.76, "#ffffff", "center", "center"), S: B(0.1, 0.2, 0.9, 0.8, "#ffffff", "center", "center") }),
  },
  // dark page, photo fading in from one side: giant numbers
  bigstat: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h);
      if (o === "P") return rect(x, y, w, h, P.dark) + photo(k, g, 0, x, y, w, h * 0.52) + rect(x, y + h * 0.2, w, h * 0.33, k.lin([[P.dark, 0], [P.dark, 1]], 90)) + circle(x + w * 0.85, y + h * 0.62, m * 0.3, P.a, ' opacity=".22"' + k.blur(m * 0.08));
      return rect(x, y, w, h, P.dark) + photo(k, g, 0, x + w * 0.42, y, w * 0.58, h) + rect(x + w * 0.42, y, w * 0.34, h, k.lin([[P.dark, 1], [P.dark, 0]], 0)) + circle(x + w * 0.12, y + h * 0.2, m * 0.3, P.a, ' opacity=".25"' + k.blur(m * 0.08));
    },
    box: (o) => pick(o, { L: B(0.06, 0.12, 0.6, 0.88, "#ffffff", "left", "center"), P: B(0.08, 0.46, 0.92, 0.94, "#ffffff", "left", "center"), S: B(0.06, 0.12, 0.62, 0.88, "#ffffff", "left", "center") }),
  },
  // light page with a rounded photo card (lists, checklists, menus)
  checklist: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), f = pick(o, { L: [0.56, 0.1, 0.38, 0.8], P: [0.07, 0.05, 0.86, 0.38], S: [0.58, 0.1, 0.36, 0.8] });
      return rect(x, y, w, h, P.light) + k.blob(x + w * (f[0] + f[2]), y + h * f[1], m * 0.26, P.a, { ex: ' opacity=".3"' }) + rect(x + w * 0.02, y + h * 0.8, m * 0.22, m * 0.16, k.dots(P.a, m * 0.03, m * 0.006, 0.5))
        + photo(k, g, 0, x + w * f[0], y + h * f[1], w * f[2], h * f[3], { rx: m * 0.03 }) + rect(x + w * f[0], y + h * f[1], w * f[2], h * f[3], "none", m * 0.03, k.shadow(m * 0.02, m * 0.05, 0.25));
    },
    box: (o, lo, P) => pick(o, { L: B(0.06, 0.1, 0.52, 0.9, P.dark, "left", "center"), P: B(0.08, 0.46, 0.92, 0.96, P.dark, "left", "center"), S: B(0.06, 0.1, 0.55, 0.9, P.dark, "left", "center") }),
  },
  // bold gradient with soft circles and a small round photo
  gradient: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), [cx, cy, r] = pick(o, { L: [x + w * 0.86, y + h * 0.2, h * 0.13], P: [x + w * 0.8, y + h * 0.12, w * 0.13], S: [x + w * 0.84, y + h * 0.16, w * 0.12] });
      return rect(x, y, w, h, k.lin([P.dark, mix(P.dark, P.a, 0.75)], 30)) + circle(x + w * 0.12, y + h * 0.88, m * 0.42, "#ffffff", ' opacity=".07"') + circle(x + w * 0.95, y + h * 0.95, m * 0.26, P.b, ' opacity=".18"') + rect(x + w * 0.05, y + h * 0.07, m * 0.24, m * 0.16, k.dots("#ffffff", m * 0.03, m * 0.005, 0.3))
        + photo(k, g, 0, cx - r, cy - r, r * 2, r * 2, { clip: circle(cx, cy, r, "#000") }) + circle(cx, cy, r, "none", ` stroke="#ffffff" stroke-width="${n1(m * 0.01)}"`);
    },
    box: (o) => pick(o, { L: B(0.1, 0.16, 0.8, 0.86, "#ffffff", "center", "center"), P: B(0.08, 0.26, 0.92, 0.86, "#ffffff", "center", "center"), S: B(0.08, 0.26, 0.92, 0.88, "#ffffff", "center", "center") }),
  },
  // photo with a dark corner for a lower-third name tag
  lower: {
    draw: (k, g) => photo(k, g, 0, g.x, g.y, g.w, g.h) + k.scrim(g.x, g.y + g.h * 0.45, g.w, g.h * 0.55, "#000000", 0, 0.6) + rect(g.x, g.y, g.w * 0.6, g.h, k.lin([[g.P.dark, 0.45], [g.P.dark, 0]], 0)),
    box: (o) => pick(o, { L: B(0.06, 0.5, 0.7, 0.88, "#ffffff"), P: B(0.07, 0.56, 0.93, 0.88, "#ffffff"), S: B(0.07, 0.5, 0.9, 0.88, "#ffffff") }),
  },
  // poster: photo with a thin inset frame and words at the top
  poster: {
    draw: (k, g) => { const m = Math.min(g.w, g.h); return photo(k, g, 0, g.x, g.y, g.w, g.h) + k.scrim(g.x, g.y, g.w, g.h * 0.62, g.P.dark, 0, 0.85, "down") + rect(g.x + m * 0.035, g.y + m * 0.035, g.w - m * 0.07, g.h - m * 0.07, "none", 0, ` stroke="#ffffff" stroke-opacity=".7" stroke-width="${n1(m * 0.004)}"`); },
    box: (o) => pick(o, { L: B(0.07, 0.1, 0.75, 0.6, "#ffffff", "left", "top"), P: B(0.08, 0.07, 0.92, 0.5, "#ffffff", "left", "top"), S: B(0.08, 0.08, 0.92, 0.55, "#ffffff", "left", "top") }),
  },
  // soft mesh gradient page (type-led) with a small framed photo
  mesh: {
    draw: (k, g) => {
      const { x, y, w, h, P } = g, o = ori(w, h), m = Math.min(w, h), bl = k.blur(m * 0.09), f = pick(o, { L: [0.7, 0.16, 0.22, 0.4], P: [0.56, 0.06, 0.36, 0.24], S: [0.66, 0.08, 0.26, 0.32] });
      return `<g${k.clipRect(x, y, w, h)}>` + rect(x, y, w, h, "#f7f7fb") + `<g${bl}>` + circle(x + w * 0.8, y + h * 0.3, m * 0.45, P.a, ' opacity=".8"') + circle(x + w * 0.98, y + h * 0.85, m * 0.36, P.b, ' opacity=".85"') + circle(x + w * 0.4, y + h * 0.02, m * 0.3, mix(P.a, "#ffffff", 0.5)) + `</g></g>`
        + photo(k, g, 0, x + w * f[0], y + h * f[1], w * f[2], h * f[3], { rx: m * 0.02 }) + rect(x + w * f[0], y + h * f[1], w * f[2], h * f[3], "none", m * 0.02, ` stroke="#ffffff" stroke-width="${n1(m * 0.008)}"` + k.shadow(m * 0.02, m * 0.05, 0.25));
    },
    box: (o, lo, P) => pick(o, { L: B(0.07, 0.2, 0.68, 0.9, "#141826"), P: B(0.08, 0.36, 0.92, 0.92, "#141826"), S: B(0.07, 0.42, 0.92, 0.92, "#141826") }),
  },
};
export const LOOK_NAMES = Object.keys(LOOKS);
export const lookBox = (look, F, lo, P) => (LOOKS[look] || LOOKS.full).box(ori(F.W, F.H), lo || {}, P);
/** SVG body of a scene's picture in the box x, y, w, h. sc = { look, lo, pal, photos, seed }. */
export function sceneBody(k, sc, x, y, w, h, size = "thumb") {
  return (LOOKS[sc.look] || LOOKS.full).draw(k, { x, y, w, h, P: sc.pal, ph: sc.photos?.length ? sc.photos : [null], lo: sc.lo || {}, size, seed: sc.seed || "s" });
}

// ---------- word blocks placed in a look's box (all in units)
const soft = (ink) => (isDark(ink) ? mix(ink, "#ffffff", 0.22) : "#e9ecf5");
/**
 * Stacks items in the box: { k: "pill" | "head" | "text" | "gap", text, size, … }. Head lines become one clip per line
 * (tight leading, staggered entrance = kinetic type). Returns text clips.
 */
export function place(c, Bx, items, { align = Bx.align, v = Bx.v } = {}) {
  const { F } = c, bw = (Bx.r - Bx.l) * F.W * SLACK, bh = (Bx.b - Bx.t) * F.H;
  const meas = items.map((it) => {
    if (it.k === "gap") return { ...it, h: it.size || 0 };
    const fam = it.fam || "sans", bold = it.bold ?? true;
    if (it.k === "pill") { const f = fitText(it.text, { maxW: bw - it.size * 0.7, maxLines: 1, size: it.size, min: Math.min(it.size, 22), fam, bold }); return { ...it, lines: f.lines, size: f.size, h: f.size * 1.86 }; }
    if (it.k === "text") { const f = fitText(it.text, { maxW: it.maxW || bw, maxLines: it.lines || 2, size: it.size, min: it.min || Math.min(it.size, 26), fam, bold, it: it.italic }); return { ...it, lines: f.lines, size: f.size, h: it.bg ? f.lines.length * f.size * 1.22 + f.size * 0.64 : (f.lines.length - 1) * f.size * 1.22 + f.size * 0.8 }; }
    return it;
  });
  const fixed = meas.reduce((a, it) => a + (it.k === "head" ? 0 : it.h) + (it.gap || 0), 0);
  for (const it of meas) if (it.k === "head") {
    const fam = it.fam || "sans", pitch = it.pitch || (it.upper ? (fam === "serif" || fam === "cambria" ? 1.02 : 0.98) : 1.08), str = it.upper ? up(it.text) : it.text;
    const f = fitText(str, { maxW: it.maxW || bw, maxLines: it.lines || 3, size: it.max || 150, min: it.min || 56, fam, bold: it.bold ?? true, it: it.italic, maxH: Math.max(it.min || 56, bh - fixed), pitch });
    Object.assign(it, { lines: f.lines, size: f.size, pitch, h: (f.lines.length - 1) * f.size * pitch + f.size * 0.8 });
  }
  const total = meas.reduce((a, it) => a + it.h + (it.gap || 0), 0);
  let yy = v === "top" ? Bx.t * F.H : v === "center" ? ((Bx.t + Bx.b) / 2) * F.H - total / 2 : Bx.b * F.H - total;
  const X = align === "left" ? { left: Bx.l * F.W } : align === "right" ? { right: Bx.r * F.W } : { cx: ((Bx.l + Bx.r) / 2) * F.W };
  const out = []; let at = 0;
  for (const it of meas) {
    yy += it.gap || 0;
    if (it.k === "gap") { yy += it.h; continue; }
    const base = { ...X, fam: it.fam || "sans", bold: it.bold ?? true, italic: it.italic, color: it.color, anim: it.anim, out: it.out, align, dur: it.dur };
    if (it.k === "head") {
      it.lines.forEach((l, i) => { out.push(textClip(F, l, { ...base, style: "title", size: it.size, cy: yy + it.size * 0.4 + i * it.size * it.pitch, at: (it.at ?? at) + i * 0.14 })); });
      at = (it.at ?? at) + it.lines.length * 0.14 + 0.12;
    } else if (it.k === "pill") {
      out.push(textClip(F, it.lines.join(" "), { ...base, style: "caption", size: it.size, bg: it.bg, top: yy, at: it.at ?? at })); at = (it.at ?? at) + 0.2;
    } else {
      out.push(textClip(F, it.lines.join("\n"), { ...base, style: it.style || "subtitle", size: it.size, bg: it.bg, cy: yy + it.h / 2, at: it.at ?? at })); at = (it.at ?? at) + 0.22;
    }
    yy += it.h;
  }
  return out;
}

// ---------- compositions: content -> word blocks for a look's box. c = { F, P, fam, mo, upper, ori }
const accent = (c, Bx) => Bx.acc || (isDark(Bx.ink) ? c.P.a : c.P.b);
const pillBg = (c, Bx) => Bx.pill || (isDark(Bx.ink) ? c.P.a : c.P.b);
export const COMP = {
  /** eyebrow pill, kinetic headline, line under it, button */
  head(c, Bx, d) {
    const ink = Bx.ink, pb = d.pill || pillBg(c, Bx), it = [];
    if (d.eyebrow) it.push({ k: "pill", text: up(d.eyebrow), size: d.es || 34, bg: pb, color: onBg(pb), anim: c.mo.pill });
    it.push({ k: "head", text: d.title, max: d.max || (c.ori === "L" ? 168 : c.ori === "P" ? 170 : 148), min: d.min || 60, lines: d.lines || (c.ori === "P" ? 4 : 3), upper: d.upper ?? c.upper, fam: d.fam || c.fam, color: d.hc || ink, anim: c.mo.head, gap: d.eyebrow ? 26 : 0 });
    if (d.sub) it.push({ k: "text", text: d.sub, size: d.ss || 46, lines: 2, color: soft(ink), bold: false, anim: c.mo.sub, gap: 24 });
    if (d.cta) { const cb = d.ctaBg || (isDark(ink) ? "#ffffff" : c.P.dark); it.push({ k: "pill", text: d.cta, size: 40, bg: cb, color: onBg(cb), anim: c.mo.pill, gap: 34 }); }
    return place(c, Bx, it, d.place || {});
  },
  /** giant number or word with a label */
  big(c, Bx, d) {
    const ink = Bx.ink, it = [];
    if (d.eyebrow) { const pb = pillBg(c, Bx); it.push({ k: "pill", text: up(d.eyebrow), size: 34, bg: pb, color: onBg(pb), anim: c.mo.pill }); }
    it.push({ k: "head", text: d.big, max: d.max || (c.ori === "L" ? 300 : 260), min: 90, lines: d.lines || 1, upper: true, fam: d.fam || c.fam, color: d.bc || accent(c, Bx), anim: c.mo.big, gap: d.eyebrow ? 20 : 0 });
    if (d.label) it.push({ k: "head", text: d.label, max: d.lmax || 96, min: 48, lines: 2, upper: d.upper ?? c.upper, fam: d.fam || c.fam, color: ink, anim: c.mo.head, gap: 22 });
    if (d.sub) it.push({ k: "text", text: d.sub, size: 44, lines: 2, color: soft(ink), bold: false, anim: c.mo.sub, gap: 20 });
    return place(c, Bx, it, d.place || {});
  },
  /** big quote mark, quote, name */
  quote(c, Bx, d) {
    const ink = Bx.ink, it = [];
    if (d.stars) it.push({ k: "text", text: "★★★★★", size: 54, color: d.starC || c.P.b, anim: c.mo.pill });
    else it.push({ k: "text", text: "“", size: 200, fam: "serif", color: accent(c, Bx), anim: c.mo.pill, h0: true });
    it.push({ k: "head", text: d.quote, max: d.max || (c.ori === "L" ? 124 : c.ori === "P" ? 112 : 104), min: 44, lines: d.lines || 5, upper: false, fam: d.fam || (c.fam === "sans" || c.fam === "calibri" ? "serif" : c.fam), italic: true, color: ink, anim: c.mo.sub, pitch: 1.18, gap: d.stars ? 30 : -40 });
    if (d.person) it.push({ k: "text", text: d.person, size: 40, lines: 1, color: accent(c, Bx), anim: c.mo.pill, gap: 34 });
    return place(c, Bx, it, d.place || {});
  },
  /** title and a list of items (ticks or numbers) */
  list(c, Bx, d) {
    const ink = Bx.ink, it = [];
    if (d.eyebrow) { const pb = pillBg(c, Bx); it.push({ k: "pill", text: up(d.eyebrow), size: 32, bg: pb, color: onBg(pb), anim: c.mo.pill }); }
    if (d.title) it.push({ k: "head", text: d.title, max: d.max || (c.ori === "L" ? 120 : 110), min: 54, lines: 2, upper: d.upper ?? c.upper, fam: c.fam, color: ink, anim: c.mo.head, gap: d.eyebrow ? 22 : 0 });
    const ib = d.itemBg ?? (isDark(ink) ? "#ffffff" : c.P.dark);
    d.items.forEach((x, i) => it.push({ k: "text", text: (d.num ? `0${i + 1}  ` : "✔  ") + x, size: d.is || 48, lines: 1, bg: ib, color: onBg(ib), anim: c.mo.item, gap: i ? 22 : 40, at: 0.5 + i * 0.3 }));
    return place(c, Bx, it, d.place || {});
  },
  /** lower third: name box and role box (bottom left), optional tag at the top */
  lower(c, Bx, d) {
    const out = [];
    if (d.tag) out.push(textClip(c.F, up(d.tag), { left: Bx.l * c.F.W, top: 0.08 * c.F.H, size: 34, bg: d.tagBg || "#e11d48", color: "#ffffff", anim: "fade", style: "caption" }));
    const name = { k: "text", text: d.name, size: d.ns || 58, lines: 1, bg: "#ffffff", color: "#111827", anim: "slide-left", style: "lower" };
    const role = d.role ? { k: "text", text: d.role, size: 38, lines: 1, bg: c.P.a, color: onBg(c.P.a), anim: "slide-left", gap: 10, at: 0.3, style: "lower" } : null;
    const head = d.title ? [{ k: "head", text: d.title, max: d.max || (c.ori === "L" ? 120 : 104), min: 54, lines: d.lines || 2, upper: d.upper ?? c.upper, fam: c.fam, color: "#ffffff", anim: c.mo.head, gap: 0 }, { k: "gap", size: 40 }] : [];
    return out.concat(place(c, Bx, [...head, name, ...(role ? [role] : [])], { align: "left", v: "bottom" }));
  },
  /** offer with a price badge and a button */
  price(c, Bx, d) {
    const ink = Bx.ink, it = [], pb = d.priceBg || (isDark(ink) ? c.P.b : c.P.dark);
    if (d.eyebrow) { const e = isDark(ink) ? "#ffffff" : c.P.dark; it.push({ k: "pill", text: up(d.eyebrow), size: 32, bg: e, color: onBg(e), anim: c.mo.pill }); }
    it.push({ k: "head", text: d.title, max: d.max || (c.ori === "L" ? 150 : 132), min: 56, lines: d.lines || 3, upper: true, fam: c.fam, color: ink, anim: c.mo.head, gap: d.eyebrow ? 24 : 0 });
    if (d.price) it.push({ k: "pill", text: d.price, size: d.ps || 76, bg: pb, color: onBg(pb), anim: "pop", gap: 30, at: 0.7 });
    if (d.was) it.push({ k: "text", text: d.was, size: 38, lines: 1, color: soft(ink), bold: false, anim: "fade", gap: 14 });
    if (d.cta) { const cb = isDark(ink) ? "#ffffff" : c.P.a; it.push({ k: "pill", text: d.cta, size: 40, bg: cb, color: onBg(cb), anim: c.mo.pill, gap: 28 }); }
    return place(c, Bx, it, d.place || {});
  },
  /** tutorial step */
  step(c, Bx, d) {
    const ink = Bx.ink, pb = pillBg(c, Bx), it = [{ k: "pill", text: up(d.step), size: 38, bg: pb, color: onBg(pb), anim: c.mo.pill }];
    it.push({ k: "head", text: d.title, max: d.max || (c.ori === "L" ? 130 : 116), min: 56, lines: 3, upper: d.upper ?? c.upper, fam: c.fam, color: ink, anim: c.mo.head, gap: 26 });
    if (d.sub) it.push({ k: "text", text: d.sub, size: 42, lines: 2, color: soft(ink), bold: false, anim: c.mo.sub, gap: 22 });
    return place(c, Bx, it, d.place || {});
  },
  /** YouTube-thumbnail words: each line in its own colour box */
  words(c, Bx, d) {
    const { F } = c, bw = (Bx.r - Bx.l) * F.W * SLACK, lines = d.lines;
    let size = d.max || (c.ori === "L" ? 150 : 128);
    while (size > 60 && lines.some((l) => textWidth(up(l), size, c.fam === "serif" ? "sans" : c.fam) + size * 0.64 > bw)) size -= 6;
    const fam = c.fam === "serif" || c.fam === "cambria" ? "sans" : c.fam, cols = d.cols || ["#ffffff", c.P.b, c.P.dark];
    const it = lines.map((l, i) => ({ k: "text", text: up(l), size, lines: 1, bg: cols[i % cols.length], color: onBg(cols[i % cols.length]), fam, anim: i % 2 ? "slide-left" : c.mo.big === "fade" ? "pop" : c.mo.big, gap: i ? 14 : 0, at: i * 0.18, style: "title" }));
    if (d.sub) it.push({ k: "text", text: d.sub, size: 44, lines: 1, color: Bx.ink, anim: "fade", gap: 26, bold: true });
    return place(c, Bx, it, d.place || {});
  },
  /** two labels on the two halves and a VS badge */
  vs(c, Bx, d) {
    const { F } = c, P = F.H > F.W * 1.2, out = [];
    const L1 = P ? { cx: F.W / 2, cy: F.H * 0.27 } : { cx: F.W * 0.26, cy: F.H * 0.8 }, L2 = P ? { cx: F.W / 2, cy: F.H * 0.8 } : { cx: F.W * 0.74, cy: F.H * 0.8 };
    const sz = (s) => Math.min(P ? 104 : 92, Math.floor(((P ? 0.86 : 0.4) * F.W) / Math.max(1, textWidth(up(s), 1, c.fam === "serif" ? "sans" : c.fam))));
    out.push(textClip(F, up(d.a), { ...L1, size: sz(d.a), fam: c.fam === "serif" ? "sans" : c.fam, color: "#ffffff", anim: "slide-left", style: "title" }));
    out.push(textClip(F, up(d.b), { ...L2, size: sz(d.b), fam: c.fam === "serif" ? "sans" : c.fam, color: "#ffffff", anim: "slide-left", at: 0.3, style: "title" }));
    if (d.la) out.push(textClip(F, up(d.la), { cx: L1.cx, cy: L1.cy - (P ? 110 : 100), size: 34, bg: c.P.a, color: onBg(c.P.a), anim: "fade", style: "caption" }));
    if (d.lb) out.push(textClip(F, up(d.lb), { cx: L2.cx, cy: L2.cy - (P ? 110 : 100), size: 34, bg: c.P.b, color: onBg(c.P.b), anim: "fade", at: 0.3, style: "caption" }));
    if (d.mid) out.push(textClip(F, d.mid, { cx: F.W / 2, cy: F.H / 2, size: 72, bg: "#ffffff", color: "#111827", anim: "pop", at: 0.5, style: "title" }));
    return out;
  },
};

// ---------- thumbnails: draw text clips like the player does (centre x/y, 1.22 line height, rounded box)
const FAM_CSS = { sans: "Arial,'Liberation Sans',Helvetica,sans-serif", serif: "'Times New Roman','Liberation Serif',Times,serif", calibri: "Calibri,Carlito,Arial,sans-serif",
  cambria: "Cambria,Caladea,Georgia,serif", mono: "'Courier New','Liberation Mono',monospace" };
const hexA = (c) => { const m = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(c || ""); return m ? [`#${m[1]}`, Math.round((parseInt(m[2], 16) / 255) * 100) / 100] : [c, 1]; };
/** SVG for one text clip inside a frame at fx, fy (fw x fh px); s = px per unit. */
export function clipSvg(c, fx, fy, fw, fh, s) {
  const px = c.size * s, lines = String(c.text).split("\n"), lh = px * 1.22, bh = lines.length * lh, cx = fx + c.x * fw, cy = fy + c.y * fh;
  const bw = Math.max(...lines.map((l) => textWidth(l, c.size, c.family, c.bold, c.italic))) * s, pad = px * 0.32;
  let out = "";
  if (c.bg) { const [col, op] = hexA(c.bg); out += rect(cx - bw / 2 - pad, cy - bh / 2 - pad, bw + pad * 2, bh + pad * 2, col, px * 0.25, op < 1 ? ` fill-opacity="${op}"` : ""); }
  const anchor = lines.length > 1 && c.align === "left" ? "start" : lines.length > 1 && c.align === "right" ? "end" : "middle", ax = anchor === "start" ? cx - bw / 2 : anchor === "end" ? cx + bw / 2 : cx;
  const attrs = `font-family="${FAM_CSS[c.family] || FAM_CSS.sans}" font-size="${n1(px)}" font-weight="${c.bold ? 800 : 400}" fill="${c.color || "#fff"}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${c.italic ? ' font-style="italic"' : ""}`;
  out += `<text ${attrs}>` + lines.map((l, i) => `<tspan x="${n1(ax)}" y="${n1(cy - bh / 2 + lh * (i + 0.5) + px * 0.35)}">${esc(l)}</tspan>`).join("") + `</text>`;
  return out;
}
export { kit, ori, n1 };
