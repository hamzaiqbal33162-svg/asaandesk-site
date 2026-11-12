// Teleprompter for the recorder: your script scrolls over the live preview while you record, at your speed. It is
// on your screen only (a page overlay), never in the recording. Saved on this device.
const KEY = "asaandesk-recorder-prompter";
const ACTIVE = new Set(["setup", "starting", "countdown", "recording", "paused"]);

/** Adds the overlay to `stage`; getPhase() is the recorder's phase. Returns the prompter API. */
export function createPrompter(stage, getPhase) {
  let st = { text: "", speed: 4, size: 24, on: false };
  try { st = { ...st, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
  const box = document.createElement("div");
  box.className = "rec-prompter"; box.id = "prompter"; box.hidden = true; box.setAttribute("aria-label", "Teleprompter");
  const inner = document.createElement("div"); inner.className = "rec-prompter-in";
  box.append(inner); stage.append(box);
  let y = 0, last = 0, preview = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const paint = () => { inner.textContent = st.text; inner.style.fontSize = st.size + "px"; inner.style.transform = `translateY(${-Math.round(y)}px)`; };
  const visible = () => !!(st.on && st.text.trim() && (preview || ACTIVE.has(getPhase())));
  const loop = (t) => {
    requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0; last = t;
    const show = visible(); if (box.hidden === show) box.hidden = !show;
    if (!show) { if (!ACTIVE.has(getPhase())) y = 0; return; }
    const ph = getPhase();
    if (ph === "setup" && !preview) y = 0;
    else if (ph === "recording" || preview) y = Math.min(y + st.speed * 9 * dt, Math.max(0, inner.scrollHeight - box.clientHeight * 0.4));
    inner.style.transform = `translateY(${-Math.round(y)}px)`;
  };
  paint(); requestAnimationFrame(loop);
  return {
    get state() { return { ...st }; }, get offset() { return y; }, get visible() { return !box.hidden; }, el: box,
    set(patch) { st = { ...st, ...patch }; save(); paint(); },
    preview(on) { preview = !!on; y = 0; paint(); },
    restart() { y = 0; paint(); },
  };
}

/** The Teleprompter side panel. */
export function renderPrompterPanel(el, p) {
  const s = p.state;
  el.innerHTML = `<p class="mx-hint">Your script scrolls over the preview while you record. Only you see it: it is not in the video.</p>
    <label class="rec-pcheck"><input type="checkbox" id="prOn" ${s.on ? "checked" : ""}> Show the teleprompter</label>
    <textarea class="ad-input rec-pscript" id="prText" rows="7" placeholder="Type or paste what you want to say.">${String(s.text).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</textarea>
    <label class="mx-field"><span>Scroll speed</span><input type="range" id="prSpeed" min="1" max="10" step="1" value="${s.speed}" aria-label="Scroll speed"></label>
    <label class="mx-field"><span>Text size</span><input type="range" id="prSize" min="16" max="40" step="2" value="${s.size}" aria-label="Text size"></label>
    <div class="mx-row"><button type="button" class="btn sm" id="prTry">Try the scroll</button><button type="button" class="btn sm" id="prTop">Back to the top</button></div>`;
  const q = (id) => el.querySelector(id);
  q("#prOn").onchange = (e) => p.set({ on: e.target.checked });
  q("#prText").oninput = (e) => p.set({ text: e.target.value, on: e.target.value.trim() ? true : s.on });
  q("#prText").onchange = () => { q("#prOn").checked = p.state.on; };
  q("#prSpeed").oninput = (e) => p.set({ speed: Number(e.target.value) });
  q("#prSize").oninput = (e) => p.set({ size: Number(e.target.value) });
  let trying = false;
  q("#prTry").onclick = (e) => { trying = !trying; p.preview(trying); e.target.textContent = trying ? "Stop the scroll" : "Try the scroll"; };
  q("#prTop").onclick = () => p.restart();
}
