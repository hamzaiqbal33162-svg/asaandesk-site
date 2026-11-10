// Present mode: full-screen slides (canvas, so entrance animations play), arrow keys, swipe, click.
import { drawPage, loadImages, ensureFonts } from "./canvas.js";
import { pageDuration } from "./animate.js";
import { presetPx } from "./presets.js";

let root = null, state = null;

export async function present(design, start = 0, env = {}) {
  close();
  const images = await loadImages(design);
  await ensureFonts(design);
  root = document.createElement("div");
  root.className = "st-present";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Presentation");
  root.tabIndex = -1;
  root.innerHTML = `<canvas aria-hidden="true"></canvas><div class="st-present-bar"><button class="pbtn" data-a="prev" aria-label="Previous slide">‹</button><span class="pcount" aria-live="polite"></span><button class="pbtn" data-a="next" aria-label="Next slide">›</button><button class="pbtn" data-a="close" aria-label="Exit presentation">✕</button></div>`;
  document.body.append(root);
  const canvas = root.querySelector("canvas");
  state = { design, i: start, images, env, canvas, t0: performance.now(), raf: 0, x0: null };
  const onKey = (e) => {
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); go(state.i + 1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); go(state.i - 1); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(design.pages.length - 1);
    else if (e.key === "Escape") close();
  };
  state.onKey = onKey;
  document.addEventListener("keydown", onKey, true);
  root.addEventListener("click", (e) => {
    if (state?.swiped) return;
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "prev") go(state.i - 1);
    else if (a === "next") go(state.i + 1);
    else if (a === "close") close();
    else if (!a && e.target === canvas) go(state.i + (e.clientX > innerWidth / 2 ? 1 : -1));
  });
  root.addEventListener("pointerdown", (e) => { state.x0 = e.clientX; state.y0 = e.clientY; });
  root.addEventListener("pointerup", (e) => {
    if (state?.x0 == null) return;
    const dx = e.clientX - state.x0, dy = e.clientY - state.y0;
    state.x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { e.stopPropagation(); go(state.i + (dx < 0 ? 1 : -1)); state.swiped = true; setTimeout(() => { if (state) state.swiped = false; }, 50); }
  });
  state.onResize = () => draw(true);
  window.addEventListener("resize", state.onResize);
  try { root.requestFullscreen?.().catch(() => {}); } catch {}
  root.focus();
  go(start, true);
  return root;
}

function draw(keepTime = false) {
  if (!state) return;
  const { design, canvas } = state;
  const { w: W, h: H } = presetPx(design.preset);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const vw = window.innerWidth, vh = window.innerHeight;
  const k = Math.min(vw / W, vh / H);
  const cw = Math.round(W * k * dpr), ch = Math.round(H * k * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; canvas.style.width = W * k + "px"; canvas.style.height = H * k + "px"; }
  if (!keepTime) state.t0 = performance.now();
  cancelAnimationFrame(state.raf);
  const pg = design.pages[state.i];
  const animated = pg.layers.some((l) => l.animation);
  const dur = animated ? pageDuration(pg, 0.2) : 0;
  const frame = () => {
    if (!state) return;
    const t = (performance.now() - state.t0) / 1000;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    drawPage(ctx, design, state.i, { scale: k * dpr, images: state.images, time: animated ? Math.min(t, dur) : null, chartPrims: state.env.chartPrims, tablePrims: state.env.tablePrims });
    if (animated && t < dur) state.raf = requestAnimationFrame(frame);
  };
  frame();
}
export function go(i, first = false) {
  if (!state) return;
  const n = state.design.pages.length;
  i = Math.max(0, Math.min(n - 1, i));
  if (i === state.i && !first) return;
  state.i = i;
  root.querySelector(".pcount").textContent = `${i + 1} / ${n}`;
  root.dataset.slide = String(i + 1);
  draw();
}
export function close() {
  if (!state) return;
  cancelAnimationFrame(state.raf);
  document.removeEventListener("keydown", state.onKey, true);
  window.removeEventListener("resize", state.onResize);
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  root?.remove();
  root = null;
  const done = state.onClose;
  state = null;
  done?.();
}
export const presenting = () => (state ? { slide: state.i, total: state.design.pages.length } : null);
export function onPresentClose(fn) { if (state) state.onClose = fn; }
