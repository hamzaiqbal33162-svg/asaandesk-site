// Present mode: full-screen slides (canvas, so entrance animations play), arrow keys, swipe, click.
// Options: presenter view (current + next slide, notes, timer), autoplay (each page's duration), present and record
// (WebM of the slides with the microphone), slide transitions (page.transition), hidden pages skipped,
// draw on the slide (pen, marker, highlighter, eraser; not saved), fun keys (B blur, C confetti, O bubbles,
// Q quiet, U curtain, X clear), 1–9 / 0 timer, G go to page, ? shortcut list.
import { drawPage, loadImages, ensureFonts } from "./canvas.js";
import { pageDuration, clickSteps, withClicks } from "./animate.js";
import { presetPx } from "./presets.js";
/** The link of the top item under the pointer on the current slide, if any. */
function linkAt(e, canvas) {
  const pg = state?.design.pages[state.i];
  if (!pg?.layers.some((l) => l.link)) return null;
  const r = canvas.getBoundingClientRect(), { w: W, h: H } = presetPx(state.design.preset);
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  for (const l of [...pg.layers].reverse()) {
    if (!l.link || l.hidden) continue;
    const a = (-(l.rotation || 0) * Math.PI) / 180, cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    const lx = Math.cos(a) * (x - cx) - Math.sin(a) * (y - cy) + l.w / 2, ly = Math.sin(a) * (x - cx) + Math.cos(a) * (y - cy) + l.h / 2;
    if (lx >= 0 && ly >= 0 && lx <= l.w && ly <= l.h) return l.link;
  }
  return null;
}

let root = null, state = null;
export const TRANSITIONS = [["none", "None"], ["fade", "Dissolve"], ["slide", "Slide"], ["wipe", "Line wipe"], ["circle", "Circle wipe"], ["stack", "Stack"], ["zoom", "Zoom"], ["rise", "Rise"]];
const SHORTCUTS = [["→ / Space / click", "Next page"], ["← / Backspace", "Previous page"], ["Home / End", "First / last page"], ["G", "Go to a page"], ["P", "Pen on / off (draw on the slide)"], ["E", "Clear the drawing"], ["1 – 9, 0", "Start a 1–9 or 10 minute timer"], ["B", "Blur the slide"], ["C", "Confetti"], ["O", "Bubbles"], ["Q", "Quiet please"], ["D", "Drumroll"], ["M", "Mic drop"], ["U", "Curtain"], ["X", "Clear effects"], ["A", "Autoplay on / off"], ["?", "This list"], ["Esc", "Exit"]];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Visible pages (hidden ones are skipped while presenting; if all are hidden, all show). */
function order(design) { const v = design.pages.map((p, i) => (p.hidden ? -1 : i)).filter((i) => i >= 0); return v.length ? v : design.pages.map((_, i) => i); }

export async function present(design, start = 0, env = {}, opts = {}) {
  close();
  const images = await loadImages(design);
  await ensureFonts(design);
  root = document.createElement("div");
  root.className = "st-present" + (opts.presenter ? " presenter" : "");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", opts.presenter ? "Presenter view" : "Presentation");
  root.tabIndex = -1;
  const bar = `<div class="st-present-bar"><button class="pbtn" data-a="prev" aria-label="Previous slide">‹</button><button class="pcount" data-a="goto" aria-live="polite" title="Go to a page"></button><button class="pbtn" data-a="next" aria-label="Next slide">›</button>`
    + `<button class="pbtn" data-a="pen" aria-label="Draw on the slide" title="Draw on the slide (P)">✎</button><button class="pbtn" data-a="auto" aria-label="Autoplay" title="Autoplay (A)">⏵</button><button class="pbtn" data-a="keys" aria-label="Shortcuts" title="Shortcuts (?)">?</button><button class="pbtn" data-a="close" aria-label="Exit presentation">✕</button></div>`;
  root.innerHTML = `<div class="st-pstage"><canvas class="st-pmain" aria-hidden="true"></canvas><canvas class="st-pink" aria-hidden="true"></canvas><div class="st-pfx" aria-hidden="true"></div></div>${bar}`
    + (opts.presenter ? `<aside class="st-pside" aria-label="Presenter tools"><div class="st-pclock"><b class="st-pelapsed" aria-label="Time presenting">0:00</b><button class="pbtn" data-a="reset" aria-label="Reset timer">↺</button></div><h3>Next</h3><canvas class="st-pnext" aria-label="Next slide"></canvas><h3>Notes</h3><div class="st-pnotes-view" role="note"></div></aside>` : "");
  document.body.append(root);
  const canvas = root.querySelector(".st-pmain"), ink = root.querySelector(".st-pink");
  state = { design, order: order(design), i: start, images, env, canvas, ink, t0: performance.now(), raf: 0, x0: null, opts, pen: null, strokes: [], started: Date.now(), timer: null, auto: !!opts.autoplay, autoT: 0, reveal: [] };
  if (!state.order.includes(state.i)) state.i = state.order[0];
  const onKey = (e) => {
    if (e.target.closest?.(".st-pgoto")) return;
    const k = e.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); step(1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); step(-1); }
    else if (k === "Home") go(state.order[0]);
    else if (k === "End") go(state.order[state.order.length - 1]);
    else if (k === "Escape") { if (root.querySelector(".st-pkeys")) toggleKeys(false); else close(); }
    else if (/^[0-9]$/.test(k)) startTimer(k === "0" ? 10 : +k);
    else if (/^[a-z?]$/i.test(k) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); fun(k.toLowerCase()); }
  };
  state.onKey = onKey;
  document.addEventListener("keydown", onKey, true);
  root.addEventListener("click", (e) => {
    if (state?.swiped) return;
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "prev") step(-1);
    else if (a === "next") step(1);
    else if (a === "close") close();
    else if (a === "goto") askPage();
    else if (a === "pen") setPen(state.pen ? null : "pen");
    else if (a === "auto") setAuto(!state.auto);
    else if (a === "keys") toggleKeys();
    else if (a === "reset") state.started = Date.now();
    else if (a?.startsWith("tool-")) setPen(a.slice(5));
    else if (!a && e.target === ink && !state.pen) { const url = linkAt(e, canvas); if (url) { window.open(url, "_blank", "noopener"); return; } step(e.clientX > canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? 1 : -1); }
  });
  // Links on the slide (Canva: links work when presenting): pointer cursor over them.
  ink.addEventListener("pointermove", (e) => { if (!state || state.pen) return; ink.style.cursor = linkAt(e, canvas) ? "pointer" : ""; });
  ink.addEventListener("pointerdown", (e) => {
    state.x0 = e.clientX; state.y0 = e.clientY;
    if (!state.pen) return;
    e.preventDefault(); ink.setPointerCapture(e.pointerId);
    const p = toInk(e);
    if (state.pen === "eraser") { erase(p); state.erasing = true; return; }
    state.cur = { tool: state.pen, pts: [p] }; state.strokes.push(state.cur); paintInk();
  });
  ink.addEventListener("pointermove", (e) => { if (!state?.pen) return; const p = toInk(e); if (state.erasing) erase(p); else if (state.cur) { state.cur.pts.push(p); paintInk(); } });
  ink.addEventListener("pointerup", (e) => {
    if (state?.pen) { state.cur = null; state.erasing = false; return; }
    if (state?.x0 == null) return;
    const dx = e.clientX - state.x0, dy = e.clientY - state.y0;
    state.x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { e.stopPropagation(); step(dx < 0 ? 1 : -1); state.swiped = true; setTimeout(() => { if (state) state.swiped = false; }, 50); }
  });
  state.onResize = () => draw(true);
  window.addEventListener("resize", state.onResize);
  state.clockIv = setInterval(() => { if (!state) return; const el = root.querySelector(".st-pelapsed"); if (el) el.textContent = mmss((Date.now() - state.started) / 1000); tickTimer(); }, 500);
  if (!opts.presenter) try { root.requestFullscreen?.().catch(() => {}); } catch {}
  root.focus();
  go(state.i, true);
  if (opts.record) await startRecording();
  if (state?.auto) setAuto(true);
  return root;
}

/* ---------------- drawing the slides ---------------- */
function fitTo(box, W, H) { const k = Math.min(box.w / W, box.h / H); return { k, w: W * k, h: H * k }; }
function paintPage(cv, i, boxW, boxH, time = null) {
  const { design } = state;
  const { w: W, h: H } = presetPx(design.preset);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const f = fitTo({ w: boxW, h: boxH }, W, H);
  const cw = Math.round(f.w * dpr), ch = Math.round(f.h * dpr);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  cv.style.width = f.w + "px"; cv.style.height = f.h + "px";
  const ctx = cv.getContext("2d");
  if (!ctx) return f;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  // The current slide shows its "appear on click" items revealed so far; the next-slide preview shows them all.
  drawPage(ctx, design, i, { scale: f.k * dpr, images: state.images, time, reveal: i === state.i ? state.reveal : null, chartPrims: state.env.chartPrims, tablePrims: state.env.tablePrims });
  return f;
}
function stageBox() {
  const side = state.opts.presenter ? Math.min(420, innerWidth * 0.32) : 0;
  return { w: innerWidth - side - (side ? 48 : 0), h: innerHeight - (side ? 120 : 0) };
}
function draw(keepTime = false) {
  if (!state) return;
  const { design, canvas, ink } = state;
  if (!keepTime) state.t0 = performance.now();
  cancelAnimationFrame(state.raf);
  const pg = design.pages[state.i];
  const animated = pg.layers.some((l) => l.animation || l.timing);
  const dur = animated ? pageDuration(withClicks(pg, state.reveal), 0.2) : 0;
  const box = stageBox();
  const frame = () => {
    if (!state) return;
    const t = (performance.now() - state.t0) / 1000;
    const f = paintPage(canvas, state.i, box.w, box.h, animated ? Math.min(t, dur) : null);
    if (ink.width !== canvas.width || ink.height !== canvas.height) { ink.width = canvas.width; ink.height = canvas.height; }
    ink.style.width = f.w + "px"; ink.style.height = f.h + "px";
    paintInk();
    if (animated && t < dur) state.raf = requestAnimationFrame(frame);
  };
  frame();
  if (state.opts.presenter) {
    const pos = state.order.indexOf(state.i), next = state.order[pos + 1];
    const nc = root.querySelector(".st-pnext");
    if (next != null) { nc.hidden = false; paintPage(nc, next, Math.min(380, innerWidth * 0.3), 240); } else nc.hidden = true;
    root.querySelector(".st-pnotes-view").textContent = pg.notes || "No notes for this page.";
  }
}
/**
 * Keyframes (outgoing, incoming) for a page transition. Canva: transitions have a direction and a duration
 * (0.1 to 2.5 s). dir: "left" | "right" | "up" | "down" (where the new page comes in from the other side).
 */
export function transitionFrames(kind, dir = "left") {
  const ax = dir === "up" || dir === "down" ? "Y" : "X", sg = dir === "right" || dir === "down" ? -1 : 1;
  const out = `translate${ax}(${-100 * sg}%)`, inn = `translate${ax}(${100 * sg}%)`, zero = `translate${ax}(0)`;
  const wipeFrom = { left: "inset(0 0 0 100%)", right: "inset(0 100% 0 0)", up: "inset(100% 0 0 0)", down: "inset(0 0 100% 0)" }[dir] || "inset(0 0 0 100%)";
  return {
    fade: [[{ opacity: 1 }, { opacity: 0 }], [{ opacity: 0 }, { opacity: 1 }]],
    slide: [[{ transform: zero }, { transform: out }], [{ transform: inn }, { transform: zero }]],
    zoom: [[{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.15)" }], [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }]],
    wipe: [[{ opacity: 1 }, { opacity: 1 }], [{ clipPath: wipeFrom }, { clipPath: "inset(0 0 0 0)" }]],
    rise: [[{ opacity: 1 }, { opacity: 0 }], [{ transform: "translateY(12%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }]],
    circle: [[{ opacity: 1 }, { opacity: 1 }], [{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }]],
    stack: [[{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.92)", opacity: 0.6 }], [{ transform: inn }, { transform: zero }]],
  }[kind] || null;
}
/** Seconds a page's transition takes (Canva: 0.1 to 2.5 s). */
export const transitionSeconds = (pg) => Math.max(0.1, Math.min(2.5, +pg?.transitionDur || 0.45));
function transition(kind, pg) {
  const stage = root.querySelector(".st-pstage"), canvas = state.canvas;
  if (!kind || kind === "none" || !canvas.width || typeof canvas.animate !== "function") return;
  const frames = transitionFrames(kind, pg?.transitionDir);
  if (!frames) return;
  // Freeze the outgoing slide in a copy, then animate the copy out and the new slide in.
  const old = document.createElement("canvas");
  old.className = "st-pold"; old.width = canvas.width; old.height = canvas.height; old.style.width = canvas.style.width; old.style.height = canvas.style.height;
  old.getContext("2d")?.drawImage(canvas, 0, 0);
  stage.append(old);
  // The incoming page is drawn above the old copy for wipes, circles and stacks.
  if (["wipe", "circle", "stack"].includes(kind)) { old.style.zIndex = "0"; canvas.style.position = canvas.style.position || "relative"; canvas.style.zIndex = "1"; }
  const ms = transitionSeconds(pg) * 1000, ease = "cubic-bezier(.2,.8,.2,1)";
  root.dataset.transition = kind;
  old.animate(frames[0], { duration: ms, easing: ease, fill: "forwards" }).finished.then(() => old.remove(), () => old.remove());
  canvas.animate(frames[1], { duration: ms, easing: ease });
}
export function go(i, first = false, back = false) {
  if (!state) return;
  const n = state.design.pages.length;
  i = Math.max(0, Math.min(n - 1, i));
  if (i === state.i && !first) return;
  const from = state.i;
  if (!first) transition(state.design.pages[i].transition || "none", state.design.pages[i]);
  state.i = i; state.strokes = []; paintInk();
  state.reveal = back ? Array(clickSteps(state.design.pages[i])).fill(0) : []; // coming back: all click items shown
  const pos = state.order.indexOf(i);
  root.querySelector(".pcount").textContent = `${(pos < 0 ? i : pos) + 1} / ${state.order.length}`;
  root.dataset.slide = String(i + 1);
  draw();
  if (state.auto) scheduleAuto();
  state.onGo?.(i, from);
}
function step(d) {
  // Appear on click: next shows the next build item on this slide first; back hides the last one shown.
  const builds = clickSteps(state.design.pages[state.i]);
  if (d > 0 && state.reveal.length < builds) { state.reveal.push(Math.round(((performance.now() - state.t0) / 1000) * 100) / 100); root.dataset.build = String(state.reveal.length); draw(true); if (state.auto) scheduleAuto(); return; }
  if (d < 0 && state.reveal.length > 0) { state.reveal.pop(); root.dataset.build = String(state.reveal.length); draw(true); return; }
  const pos = state.order.indexOf(state.i);
  const next = state.order[Math.max(0, Math.min(state.order.length - 1, (pos < 0 ? 0 : pos) + d))];
  if (next !== state.i) go(next, false, d < 0);
}
function askPage() {
  if (root.querySelector(".st-pgoto")) return;
  const f = document.createElement("form");
  f.className = "st-pgoto";
  f.innerHTML = `<label>Go to page <input type="number" min="1" max="${state.order.length}" value="${state.order.indexOf(state.i) + 1}" aria-label="Page number"></label><button class="pbtn" type="submit">Go</button>`;
  root.append(f);
  const inp = f.querySelector("input");
  inp.focus(); inp.select();
  f.addEventListener("submit", (e) => { e.preventDefault(); const n = Math.round(+inp.value); f.remove(); if (n >= 1 && n <= state.order.length) go(state.order[n - 1]); root.focus(); });
  inp.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); f.remove(); root.focus(); } });
}

/* ---------------- autoplay ---------------- */
function scheduleAuto() {
  clearTimeout(state.autoT);
  const pg = state.design.pages[state.i];
  const left = state.reveal.length < clickSteps(pg); // click items still to show: one every 1.5 s
  const secs = left ? 1.5 : Math.max(1, +pg.duration || 5, pg.layers.some((l) => l.animation) ? pageDuration(withClicks(pg, state.reveal), 0.6) - (state.reveal.length ? (performance.now() - state.t0) / 1000 : 0) : 0);
  state.autoT = setTimeout(() => {
    if (!state?.auto) return;
    if (left) { step(1); return; }
    const pos = state.order.indexOf(state.i);
    if (pos >= state.order.length - 1) { if (state.recorder) { close(); return; } go(state.order[0]); } else go(state.order[pos + 1]);
  }, secs * 1000);
}
function setAuto(on) {
  state.auto = on;
  root.dataset.autoplay = on ? "1" : "";
  root.querySelector('[data-a="auto"]')?.classList.toggle("on", on);
  clearTimeout(state.autoT);
  if (on) scheduleAuto();
}

/* ---------------- draw on the slide (not saved) ---------------- */
function setPen(tool) {
  state.pen = tool;
  root.dataset.pen = tool || "";
  root.querySelector('[data-a="pen"]')?.classList.toggle("on", !!tool);
  let tools = root.querySelector(".st-ptools");
  if (!tool) { tools?.remove(); return; }
  if (!tools) {
    tools = document.createElement("div");
    tools.className = "st-ptools";
    tools.innerHTML = [["pen", "Pen"], ["marker", "Marker"], ["highlighter", "Highlighter"], ["eraser", "Eraser"]].map(([t, l]) => `<button class="pbtn" data-a="tool-${t}" aria-label="${l}" title="${l}">${l}</button>`).join("");
    root.append(tools);
  }
  tools.querySelectorAll("[data-a]").forEach((b) => b.classList.toggle("on", b.dataset.a === "tool-" + tool));
}
function toInk(e) { const r = state.ink.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
function paintInk() {
  if (!state) return;
  const c = state.ink, ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, c.width, c.height);
  const st = { pen: ["#e11d48", 0.005, 1], marker: ["#2563eb", 0.012, 1], highlighter: ["#facc15", 0.03, 0.35] };
  for (const s of state.strokes) {
    const [color, wk, alpha] = st[s.tool] || st.pen;
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, wk * c.width); ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    s.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x * c.width, y * c.height) : ctx.moveTo(x * c.width, y * c.height)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function erase([x, y]) { state.strokes = state.strokes.filter((s) => !s.pts.some(([a, b]) => Math.hypot(a - x, b - y) < 0.03)); paintInk(); }

/* ---------------- fun keys, timer, shortcut list ---------------- */
// Our own drawings for the D (drumroll) and M (mic drop) keys.
const DRUM = `<svg width="120" height="110" viewBox="0 0 120 110" aria-hidden="true"><ellipse cx="60" cy="40" rx="46" ry="14" fill="#fde68a" stroke="#92400e" stroke-width="4"/><path d="M14 40v40c0 8 20 15 46 15s46-7 46-15V40" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/><path d="M14 52l92 30M106 52L14 82" stroke="#fde68a" stroke-width="3"/><path class="stick s1" d="M30 6l26 30" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><path class="stick s2" d="M92 6L66 36" stroke="#78350f" stroke-width="6" stroke-linecap="round"/></svg>`;
const MIC = `<svg width="70" height="140" viewBox="0 0 70 140" aria-hidden="true"><rect x="17" y="4" width="36" height="52" rx="18" fill="#94a3b8" stroke="#334155" stroke-width="4"/><path d="M23 18h24M23 30h24M23 42h24" stroke="#334155" stroke-width="3"/><path d="M27 60h16l-3 74H30z" fill="#1f2937"/></svg>`;
// Short sounds made in the browser (no audio files): a drumroll that ends in a crash, and a mic thud.
function funSound(kind) {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(), t0 = a.currentTime;
    const noise = (start, dur, vol, hp = 600) => { const n = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol; s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start(t0 + start); };
    if (kind === "drum") { for (let i = 0; i < 44; i++) noise(i * 0.055, 0.06, 0.12 + i * 0.004, 300); noise(2.5, 0.9, 0.5, 2500); }
    else { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(140, t0 + 0.9); o.frequency.exponentialRampToValueAtTime(40, t0 + 1.3); g.gain.setValueAtTime(0.0001, t0); g.gain.setValueAtTime(0.6, t0 + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5); o.connect(g).connect(a.destination); o.start(t0 + 0.9); o.stop(t0 + 1.6); noise(0.9, 0.3, 0.3, 200); }
    setTimeout(() => a.close().catch(() => {}), 4000);
  } catch {}
}
function fun(k) {
  const fx = root.querySelector(".st-pfx");
  const burst = (cls, n, make) => { const box = document.createElement("div"); box.className = "st-fx " + cls; for (let i = 0; i < n; i++) box.append(make(i)); fx.append(box); setTimeout(() => box.remove(), 4200); };
  if (k === "b") root.classList.toggle("fx-blur");
  else if (k === "c") burst("fx-confetti", 90, (i) => { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = ["#f43f5e", "#f59e0b", "#14b8a6", "#5b4cf0", "#22c55e", "#0ea5e9"][i % 6]; s.style.animationDelay = Math.random() * 0.8 + "s"; s.style.transform = `rotate(${Math.random() * 360}deg)`; return s; });
  else if (k === "o") burst("fx-bubbles", 36, () => { const s = document.createElement("i"); const d = 20 + Math.random() * 70; Object.assign(s.style, { left: Math.random() * 100 + "%", width: d + "px", height: d + "px", animationDelay: Math.random() * 1.2 + "s" }); return s; });
  else if (k === "q") { root.classList.toggle("fx-quiet"); fx.querySelector(".fx-shh")?.remove(); if (root.classList.contains("fx-quiet")) { const s = document.createElement("div"); s.className = "fx-shh"; s.textContent = "Quiet please"; fx.append(s); } }
  else if (k === "u") root.classList.toggle("fx-curtain");
  else if (k === "d") { const box = document.createElement("div"); box.className = "st-fx fx-drum"; box.innerHTML = DRUM + "<b>Drumroll…</b>"; fx.append(box); funSound("drum"); setTimeout(() => box.remove(), 3400); }
  else if (k === "m") { const box = document.createElement("div"); box.className = "st-fx fx-mic"; box.innerHTML = MIC + "<b>Mic drop</b>"; fx.append(box); funSound("mic"); setTimeout(() => box.remove(), 3400); }
  else if (k === "x") { root.classList.remove("fx-blur", "fx-quiet", "fx-curtain"); fx.innerHTML = ""; }
  else if (k === "p") setPen(state.pen ? null : "pen");
  else if (k === "e") { state.strokes = []; paintInk(); }
  else if (k === "g") askPage();
  else if (k === "a") setAuto(!state.auto);
  else if (k === "?") toggleKeys();
  else return;
  root.dataset.fx = k;
}
function toggleKeys(force) {
  const cur = root.querySelector(".st-pkeys");
  if (cur && force !== true) { cur.remove(); return; }
  if (cur || force === false) return;
  const box = document.createElement("div");
  box.className = "st-pkeys"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Presenting shortcuts");
  box.innerHTML = `<h3>Presenting shortcuts</h3><dl>${SHORTCUTS.map(([a, b]) => `<dt><kbd>${esc(a)}</kbd></dt><dd>${esc(b)}</dd>`).join("")}</dl><button class="pbtn" data-a="keys">Close</button>`;
  root.append(box);
}
function startTimer(min) { state.timer = { end: Date.now() + min * 60000, min }; tickTimer(); }
function tickTimer() {
  if (!state) return;
  let el = root.querySelector(".st-ptimer-big");
  if (!state.timer) { el?.remove(); return; }
  if (!el) { el = document.createElement("div"); el.className = "st-ptimer-big"; el.setAttribute("role", "timer"); root.append(el); }
  const left = Math.max(0, (state.timer.end - Date.now()) / 1000);
  el.textContent = left > 0 ? mmss(Math.ceil(left)) : "Time is up";
  if (left <= 0 && !state.timer.done) { state.timer.done = true; setTimeout(() => { if (state?.timer?.done) { state.timer = null; tickTimer(); } }, 4000); }
}

/* ---------------- present and record ---------------- */
async function startRecording() {
  if (typeof MediaRecorder !== "function" || !state.canvas.captureStream) { state.recordError = "This browser can't record here."; return; }
  const video = state.canvas.captureStream(30);
  let mic = null, cam = null;
  if (!state.opts.noMic) try { mic = await Promise.race([navigator.mediaDevices?.getUserMedia?.({ audio: true }), new Promise((r) => setTimeout(() => r(null), 4000))]); } catch { mic = null; }
  if (!state.opts.noMic) try { cam = await Promise.race([navigator.mediaDevices?.getUserMedia?.({ video: { width: 320, height: 240 } }), new Promise((r) => setTimeout(() => r(null), 4000))]); } catch { cam = null; }
  if (!state) { mic?.getTracks().forEach((t) => t.stop()); cam?.getTracks().forEach((t) => t.stop()); return; }
  if (cam) {
    // Camera bubble: shown on screen and painted into the slide picture, so it is part of the video.
    const v = document.createElement("video");
    v.className = "st-pcam"; v.muted = true; v.playsInline = true; v.srcObject = cam; v.play().catch(() => {});
    root.querySelector(".st-pstage").append(v);
    state.cam = { stream: cam, video: v };
  }
  const stream = new MediaStream([...video.getVideoTracks(), ...(mic ? mic.getAudioTracks() : [])]);
  const type = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4e6 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  state.recorder = { rec, chunks, mic, stream, withMic: !!mic };
  rec.start(500);
  root.dataset.recording = "1";
  const dot = document.createElement("div");
  dot.className = "st-precdot"; dot.textContent = `Recording${mic ? " · microphone" : " (no microphone)"}${state.cam ? " · camera" : ""}`;
  root.append(dot);
  // Keep frames flowing while a slide is still, so the video has the right length.
  state.recKeep = setInterval(() => { if (state) { draw(true); paintCam(); } }, state.cam ? 66 : 1000);
}
function paintCam() {
  const v = state?.cam?.video, c = state?.canvas;
  if (!v || !v.videoWidth || !c) return;
  const ctx = c.getContext("2d"), d = Math.round(Math.min(c.width, c.height) * 0.22), x = c.width - d - 24, y = c.height - d - 24;
  ctx.save(); ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.clip();
  const s = Math.max(d / v.videoWidth, d / v.videoHeight);
  ctx.drawImage(v, x + (d - v.videoWidth * s) / 2, y + (d - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s);
  ctx.restore();
  ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function stopRecording(r, onFile) {
  return new Promise((res) => {
    r.rec.onstop = () => { r.mic?.getTracks().forEach((t) => t.stop()); const blob = new Blob(r.chunks, { type: "video/webm" }); onFile?.(blob, r.withMic); res(blob); };
    try { r.rec.requestData(); } catch {}
    r.rec.stop();
  });
}

export function close() {
  if (!state) return;
  cancelAnimationFrame(state.raf);
  clearTimeout(state.autoT);
  clearInterval(state.clockIv);
  clearInterval(state.recKeep);
  document.removeEventListener("keydown", state.onKey, true);
  window.removeEventListener("resize", state.onResize);
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  const r = state.recorder, onFile = state.opts.onRecording;
  if (r) stopRecording(r, onFile);
  state.cam?.stream.getTracks().forEach((t) => t.stop());
  root?.remove();
  root = null;
  const done = state.onClose;
  state = null;
  done?.();
}
export const presenting = () => (state ? { slide: state.i, total: state.design.pages.length, build: state.reveal.length, builds: clickSteps(state.design.pages[state.i]), order: [...state.order], autoplay: state.auto, presenter: !!state.opts.presenter, recording: !!state.recorder, pen: state.pen, strokes: state.strokes.length, timer: !!state.timer } : null);
export function onPresentClose(fn) { if (state) state.onClose = fn; }
export function onPresentGo(fn) { if (state) state.onGo = fn; }
