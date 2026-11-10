// Small UI helpers shared by the Videos & audio apps (video editor, recorder, voiceover, AI media).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let toastEl = null, toastTimer = 0;
/** Short message at the bottom of the screen (also announced to screen readers). */
export function toast(msg, ms = 2800) {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "ad-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite"); document.body.append(toastEl); }
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}
/** Saves a Blob as a file. */
export function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.rel = "noopener";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
/** 65.3 -> "1:05" (or "1:05.3" with tenths). */
export function fmtTime(s, tenths = false) {
  s = Math.max(0, Number(s) || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ss = tenths ? (Math.floor(sec * 10) / 10).toFixed(1).padStart(4, "0") : String(Math.floor(sec)).padStart(2, "0");
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + ":" + ss;
}
export const fmtBytes = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
export const baseName = (name) => String(name || "file").replace(/\.[^.]*$/, "") || "file";

/** A modal progress box with a Cancel button. Returns { signal, set(text, fraction?), close() }. */
export function progressBox(title, { cancellable = true } = {}) {
  const ctl = new AbortController();
  const d = document.createElement("dialog");
  d.className = "mx-progress";
  d.setAttribute("aria-label", title);
  d.innerHTML = `<div class="mx-progress-in"><h3></h3><p class="mx-progress-text" aria-live="polite"></p>
    <div class="mx-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div>
    <p class="mx-progress-pct"></p>${cancellable ? '<button class="btn" type="button">Cancel</button>' : ""}</div>`;
  d.querySelector("h3").textContent = title;
  const bar = d.querySelector(".mx-bar"), fill = bar.querySelector("i"), text = d.querySelector(".mx-progress-text"), pct = d.querySelector(".mx-progress-pct");
  d.querySelector("button")?.addEventListener("click", () => ctl.abort());
  d.addEventListener("cancel", (e) => { e.preventDefault(); if (cancellable) ctl.abort(); });
  document.body.append(d);
  try { d.showModal(); } catch { d.setAttribute("open", ""); }
  const started = performance.now();
  return {
    signal: ctl.signal,
    abort: () => ctl.abort(),
    set(t, f) {
      if (t != null) text.textContent = t;
      if (f == null || !Number.isFinite(f)) { bar.classList.add("busy"); bar.removeAttribute("aria-valuenow"); pct.textContent = ""; return; }
      const p = Math.max(0, Math.min(1, f));
      bar.classList.remove("busy"); fill.style.width = (p * 100).toFixed(1) + "%"; bar.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      const el = (performance.now() - started) / 1000, left = p > 0.03 ? el / p - el : 0;
      pct.textContent = Math.round(p * 100) + "%" + (left > 3 ? ` · about ${fmtTime(left)} left` : "");
    },
    close() { try { d.close(); } catch {} d.remove(); },
  };
}
export const isAbort = (e) => e?.name === "AbortError";

/** Friendly text for getUserMedia / getDisplayMedia / MediaRecorder errors. */
export function mediaErrorText(e, what = "camera or microphone") {
  const n = e?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError") return `Permission was denied. Allow ${what} access (look for the icon in the address bar) and try again.`;
  if (n === "NotFoundError" || n === "OverconstrainedError") return `No ${what} was found. Plug one in or check your settings.`;
  if (n === "NotReadableError" || n === "AbortError") return `Your ${what} is busy in another app or tab. Close it there and try again.`;
  return e?.message || `Couldn't start the ${what}.`;
}
