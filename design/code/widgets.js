// AsaanDesk code generator: widget templates. No DOM here, so Node tests can import it directly.
// Each widget has an option schema (rendered as a settings form by app.js) and render(opts), which
// returns clean, self-contained HTML: scoped CSS with variables, accessible markup and, only where it is
// needed, a small vanilla script. Nothing is loaded from other websites.
import { qrSvg } from "./qr.js";

/* ------------------------------------------------------------------ small helpers */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ind = (s, n) => String(s).split("\n").map((l) => (l.trim() ? " ".repeat(n) + l : "")).join("\n");
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
/** Links: web, mail, phone and in-page links pass; javascript:, data: and other schemes become "#". */
export function safeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "#";
  if (/^(https?:\/\/|mailto:|tel:|sms:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "#";
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/|$|\?)/i.test(s)) return "https://" + s;
  if (/^[#/?.]/.test(s)) return s;
  return "#";
}
export const isExternal = (u) => /^https?:\/\//i.test(u);
const hex6 = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join("");
  return null;
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
/** Mix colour a towards b by t (0..1). */
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** Readable text colour on top of `bg`. */
export const onColor = (bg) => (contrast(bg, "#ffffff") >= contrast(bg, "#111827") ? "#ffffff" : "#111827");
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 5); }
const lines = (s) => String(s ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const paras = (s) => String(s ?? "").trim().split(/\r?\n\s*\r?\n/).filter((p) => p.trim()).map((p) => `<p>${p.trim().split(/\r?\n/).map(esc).join("<br>")}</p>`).join("\n");
const digits = (s) => String(s ?? "").replace(/\D/g, "");
const initials = (name) => (String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("") || "?").toUpperCase();
const pad2 = (n) => String(n).padStart(2, "0");
export const localDateTime = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const isImageData = (v) => /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(String(v || ""));

export const FONT_CSS = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  sans: "Arial, Helvetica, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
  calibri: 'Calibri, Carlito, "Segoe UI", sans-serif',
  cambria: "Cambria, Caladea, Georgia, serif",
};
const FONT_CHOICES = [["system", "System (clean)"], ["sans", "Sans (Arial style)"], ["serif", "Serif (Georgia style)"], ["mono", "Mono (typewriter)"], ["calibri", "Calibri style"], ["cambria", "Cambria style"]];
const CORNERS = { square: 0, soft: 10, round: 18 };

/* ------------------------------------------------------------------ logic shared with the generated scripts */
// These functions are copied into the widget code as they are (Function.toString), so they are written in
// plain ES5 and tested here once.

/** Safe calculator: numbers, + - * / (also × ÷ −), brackets and % (per cent). Throws on bad input. */
export function calcEval(src) {
  var s = String(src).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
  var i = 0;
  function fail() { throw new Error("Bad expression"); }
  function post(v) { while (s.charAt(i) === "%") { i++; v = v / 100; } return v; }
  function factor() {
    var c = s.charAt(i);
    if (c === "-") { i++; return -factor(); }
    if (c === "+") { i++; return factor(); }
    if (c === "(") { i++; var inner = sum(); if (s.charAt(i) !== ")") fail(); i++; return post(inner); }
    var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (!m) fail();
    i += m[0].length;
    return post(parseFloat(m[0]));
  }
  function product() {
    var v = factor();
    while (s.charAt(i) === "*" || s.charAt(i) === "/") { var op = s.charAt(i++); var r = factor(); v = op === "*" ? v * r : v / r; }
    return v;
  }
  function sum() {
    var v = product();
    while (s.charAt(i) === "+" || s.charAt(i) === "-") { var op = s.charAt(i++); var r = product(); v = op === "+" ? v + r : v - r; }
    return v;
  }
  if (!s) fail();
  var v = sum();
  if (i !== s.length || !isFinite(v)) fail();
  return parseFloat(v.toPrecision(12));
}

/** Tip split: bill, tip in per cent, number of people → { tip, total, each } rounded to 2 decimals. */
export function tipCalc(bill, pct, people) {
  bill = Math.max(0, +bill || 0);
  pct = Math.max(0, +pct || 0);
  people = Math.max(1, Math.floor(+people || 1));
  var tip = Math.round(bill * pct) / 100;
  var total = Math.round((bill + tip) * 100) / 100;
  return { tip: tip, total: total, each: Math.round((total / people) * 100) / 100 };
}

/** Zakat estimate: 2.5% of (cash + gold/silver + business goods + money owed to you − debts due now), only at or above the nisab. */
export function zakatCalc(v) {
  function n(x) { return Math.max(0, +x || 0); }
  var assets = n(v.cash) + n(v.gold) + n(v.business) + n(v.owed);
  var net = Math.max(0, assets - n(v.debts));
  var nisab = n(v.nisab);
  var above = nisab > 0 && net >= nisab;
  return { assets: assets, net: net, nisab: nisab, above: above, due: above ? Math.round(net * 2.5) / 100 : 0 };
}

/** Is the business open? rows: [{ dow (0 = Sunday), open "HH:MM", close "HH:MM", closed }], overnight hours allowed. */
export function isOpenAt(rows, day, minutes) {
  function mins(t) { var p = String(t || "").split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.closed) continue;
    var o = mins(r.open), c = mins(r.close);
    if (o === c) { if (r.dow === day) return true; continue; }
    if (c > o) { if (r.dow === day && minutes >= o && minutes < c) return true; }
    else {
      if (r.dow === day && minutes >= o) return true;
      if ((r.dow + 1) % 7 === day && minutes < c) return true;
    }
  }
  return false;
}

/** Day of the week and minutes after midnight in a time zone (falls back to the visitor's clock). */
export function nowIn(tz, date) {
  var d = date || new Date();
  try {
    var parts = new Intl.DateTimeFormat("en-US", { timeZone: tz || undefined, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d);
    var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ""; };
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    if (day < 0) throw new Error("no day");
    return { day: day, minutes: (+get("hour") % 24) * 60 + +get("minute") };
  } catch (e) {
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }
}

/** mailto: link with a subject and a body made of "Label: value" lines. */
export function mailtoUrl(to, subject, fields) {
  var body = [];
  for (var i = 0; i < fields.length; i++) if (fields[i][1]) body.push(fields[i][0] + ":" + (String(fields[i][1]).indexOf("\n") >= 0 ? "\n" : " ") + fields[i][1]);
  return "mailto:" + encodeURIComponent(to).replace(/%40/g, "@") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body.join("\n\n"));
}

/** "18:30" → "6:30 pm" (12h) or "18:30" (24h). */
export function fmtTime(t, fmt) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ""));
  if (!m) return "";
  const h = +m[1];
  if (fmt === "24h") return `${pad2(h)}:${m[2]}`;
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "pm" : "am"}`;
}

/** Text a QR code holds for each kind. */
export function qrPayload(o) {
  const v = String(o.value ?? "").trim();
  const wifiEsc = (s) => String(s ?? "").replace(/([\\;,:"])/g, "\\$1");
  switch (o.kind) {
    case "wifi": {
      if (!String(o.ssid || "").trim()) return "";
      const t = o.security === "nopass" ? "nopass" : o.security === "WEP" ? "WEP" : "WPA";
      return `WIFI:T:${t};S:${wifiEsc(o.ssid)};${t === "nopass" ? "" : `P:${wifiEsc(o.password)};`};`;
    }
    case "whatsapp": { const d = digits(o.phone); if (!d) return ""; const msg = String(o.message || "").trim(); return `https://wa.me/${d}${msg ? "?text=" + encodeURIComponent(msg) : ""}`; }
    case "phone": { const d = digits(o.phone); return d ? `tel:+${d}` : ""; }
    case "email": return /\S+@\S+/.test(String(o.email || "")) ? `mailto:${String(o.email).trim()}` : "";
    case "link": if (!v) return ""; return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : "https://" + v;
    default: return v;
  }
}

/** Our own sample artwork for the slider (gradient scenes drawn from plain shapes). */
export function sampleSlide(n, c1 = "#5b4cf0", c2 = "#ff7a59", c3 = "#14b8a6") {
  const scenes = [
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1190" cy="290" r="150" fill="#ffffff" fill-opacity=".85"/><path d="M0 690 Q400 520 800 670 T1600 630 V900 H0Z" fill="#ffffff" fill-opacity=".22"/><path d="M0 780 Q520 630 1020 760 T1600 730 V900 H0Z" fill="#ffffff" fill-opacity=".38"/>`,
    `<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c3}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M0 ${260 + i * 130} C300 ${180 + i * 130} 500 ${360 + i * 130} 800 ${260 + i * 130} S1300 ${160 + i * 130} 1600 ${260 + i * 130}" fill="none" stroke="#ffffff" stroke-opacity="${(0.15 + i * 0.12).toFixed(2)}" stroke-width="28" stroke-linecap="round"/>`).join("")}`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${180 + i * 250}" cy="${450 + Math.round(Math.sin(i) * 160)}" r="${60 + (i % 3) * 40}" fill="#ffffff" fill-opacity="${(0.18 + (i % 3) * 0.14).toFixed(2)}"/>`).join("")}<rect x="160" y="700" width="1280" height="16" rx="8" fill="#ffffff" fill-opacity=".5"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${scenes[((n % 3) + 3) % 3]}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ------------------------------------------------------------------ shared options and CSS */
const STYLE = (over = {}) => [
  { key: "accent", label: "Main colour", type: "color", group: "Style", default: (b) => b.colors[0] },
  { key: "bg", label: "Background", type: "color", group: "Style", default: (b) => b.colors[4] || "#ffffff" },
  { key: "text", label: "Text colour", type: "color", group: "Style", default: (b) => b.colors[3] || "#1f2937" },
  { key: "font", label: "Font", type: "select", group: "Style", choices: FONT_CHOICES, default: (b) => (FONT_CSS[b.fonts?.body] ? b.fonts.body : "system") },
  { key: "corners", label: "Corners", type: "select", group: "Style", choices: [["square", "Square"], ["soft", "Soft"], ["round", "Round"]], default: "soft" },
].map((o) => ({ ...o, ...(over[o.key] || {}) })).filter((o) => !over[o.key]?.drop);

function palette(o) {
  const accent = o.accent, bg = o.bg, text = o.text;
  return { accent, bg, text, onAccent: onColor(accent), muted: mix(text, bg, 0.32), line: mix(text, bg, 0.86), soft: mix(accent, bg, 0.9), page: mix(bg, text, 0.04) };
}
function baseCss(p, o, body) {
  const c = palette(o);
  return `.${p} {
  --adw-accent: ${c.accent};
  --adw-on-accent: ${c.onAccent};
  --adw-bg: ${c.bg};
  --adw-text: ${c.text};
  --adw-muted: ${c.muted};
  --adw-line: ${c.line};
  --adw-soft: ${c.soft};
  --adw-radius: ${CORNERS[o.corners] ?? 10}px;
  box-sizing: border-box;
  color: var(--adw-text);
  font-family: ${FONT_CSS[o.font] || FONT_CSS.system};
  line-height: 1.5;
}
.${p} *,
.${p} *::before,
.${p} *::after {
  box-sizing: inherit;
}
.${p} :focus-visible {
  outline: 3px solid var(--adw-accent);
  outline-offset: 2px;
}
.${p} .adw-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.${p} .adw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: 2px solid var(--adw-accent);
  border-radius: var(--adw-radius);
  background: var(--adw-accent);
  color: var(--adw-on-accent);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease;
}
.${p} .adw-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .15);
}
.${p} .adw-btn.adw-ghost {
  background: transparent;
  color: var(--adw-text);
  border-color: var(--adw-line);
}
${body.trim()}
@media (prefers-reduced-motion: reduce) {
  .${p} *,
  .${p} *::before,
  .${p} *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}`;
}
const card = (p, max) => `.${p} {
  max-width: ${max}px;
  margin: 0 auto;
  padding: clamp(18px, 4vw, 32px);
  background: var(--adw-bg);
  border: 1px solid var(--adw-line);
  border-radius: calc(var(--adw-radius) * 1.6);
  box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
}
.${p} h2 {
  margin: 0 0 8px;
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  line-height: 1.25;
}
.${p} .adw-lead {
  margin: 0 0 20px;
  color: var(--adw-muted);
}`;

/* ------------------------------------------------------------------ the widgets */
const W = [];
const def = (w) => { W.push(w); return w; };

def({
  id: "countdown", name: "Countdown timer", blurb: "Count down to a sale, launch or event.", icon: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Our big sale ends in" },
    { key: "target", label: "Count down to (your local time)", type: "datetime", default: (b, now) => { const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(18, 0, 0, 0); return localDateTime(d); } },
    { key: "seconds", label: "Show seconds", type: "checkbox", default: true },
    { key: "done", label: "Text when time is up", type: "text", default: "Time is up. The sale is live now!" },
    { key: "note", label: "Small print (optional)", type: "text", default: "Prices go back to normal when the timer ends." },
    { key: "button", label: "Button text (optional)", type: "text", default: "Shop the sale" },
    { key: "link", label: "Button link", type: "url", default: "#shop", show: (o) => !!o.button },
    ...STYLE(),
  ],
  check(o, now = Date.now()) { const t = new Date(o.target).getTime(); return isNaN(t) ? ["Pick a date and time to count down to."] : t <= now ? ["This date is in the past, so the timer shows the “time is up” text."] : []; },
  render(o, u) {
    const p = "adw-countdown";
    const units = [["days", "Days"], ["hours", "Hours"], ["minutes", "Minutes"], ...(o.seconds ? [["seconds", "Seconds"]] : [])];
    const css = baseCss(p, o, `${card(p, 640)}
.${p} {
  text-align: center;
}
.${p} .adw-clock {
  display: grid;
  grid-template-columns: repeat(${units.length}, minmax(0, 1fr));
  gap: clamp(8px, 2vw, 14px);
  margin: 18px 0;
}
.${p} .adw-unit {
  padding: 14px 6px;
  border-radius: var(--adw-radius);
  background: var(--adw-soft);
}
.${p} .adw-num {
  display: block;
  font-size: clamp(1.8rem, 7vw, 2.8rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--adw-accent);
}
.${p} .adw-label {
  font-size: .8rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--adw-muted);
}
.${p} .adw-done {
  margin: 18px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--adw-accent);
}
.${p} .adw-note {
  margin: 0 0 16px;
  font-size: .9rem;
  color: var(--adw-muted);
}`);
    const html = `<section class="${p}" aria-labelledby="${u}-title">
  <h2 id="${u}-title">${esc(o.title)}</h2>
  <div class="adw-clock" role="timer" aria-live="off" data-target="${esc(o.target)}">
${units.map(([k, l]) => `    <div class="adw-unit"><span class="adw-num" data-unit="${k}">00</span><span class="adw-label">${l}</span></div>`).join("\n")}
  </div>
  <p class="adw-done" hidden>${esc(o.done)}</p>
${o.note ? `  <p class="adw-note">${esc(o.note)}</p>\n` : ""}${o.button ? `  <a class="adw-btn" href="${esc(safeUrl(o.link))}">${esc(o.button)}</a>\n` : ""}</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var clock = root.querySelector('.adw-clock');
  var done = root.querySelector('.adw-done');
  var end = new Date(clock.getAttribute('data-target')).getTime();
  var sizes = { days: 86400, hours: 3600, minutes: 60, seconds: 1 };
  var timer;
  function tick() {
    var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
    var rest = left;
    var words = [];
    Object.keys(sizes).forEach(function (unit) {
      var el = clock.querySelector('[data-unit="' + unit + '"]');
      if (!el) return;
      var v = Math.floor(rest / sizes[unit]);
      rest -= v * sizes[unit];
      el.textContent = unit === 'days' || v > 9 ? String(v) : '0' + v;
      words.push(v + ' ' + (v === 1 ? unit.slice(0, -1) : unit));
    });
    clock.setAttribute('aria-label', words.join(', ') + ' left');
    if (left === 0) {
      clock.hidden = true;
      done.hidden = false;
      clearInterval(timer);
    }
  }
  if (isNaN(end)) return;
  timer = setInterval(tick, 1000);
  tick();
})();`;
    return { title: o.title, css, html, js };
  },
});

def({
  id: "pricing", name: "Pricing table", blurb: "Plans side by side with a highlighted favourite.", icon: "M4 5h16v14H4zM9 5v14M15 5v14",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Simple, honest prices" },
    { key: "lead", label: "Text under the heading", type: "text", default: "Pick the plan that suits you. Change it any time." },
    { key: "currency", label: "Currency", type: "text", default: "Rs" },
    { key: "badge", label: "Badge on the highlighted plan", type: "text", default: "Most popular" },
    { key: "plans", label: "Plans", type: "items", itemName: "Plan", min: 1, max: 4, fields: [
      { key: "name", label: "Plan name", type: "text" },
      { key: "price", label: "Price", type: "text" },
      { key: "period", label: "Per (e.g. /month)", type: "text" },
      { key: "features", label: "Features (one per line)", type: "textarea" },
      { key: "button", label: "Button text", type: "text" },
      { key: "link", label: "Button link", type: "url" },
      { key: "best", label: "Highlight this plan", type: "checkbox" },
    ], default: [
      { name: "Starter", price: "Free", period: "", features: "1 user\nBasic support\nMonthly tips by email", button: "Start free", link: "#start", best: false },
      { name: "Standard", price: "1,500", period: "/month", features: "5 users\nPriority support\nMonthly report", button: "Choose Standard", link: "#standard", best: true },
      { name: "Business", price: "4,000", period: "/month", features: "Unlimited users\nPhone support\nHelp with setup", button: "Talk to us", link: "#contact", best: false },
    ] },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-pricing";
    const css = baseCss(p, o, `.${p} {
  max-width: 1040px;
  margin: 0 auto;
  text-align: center;
}
.${p} h2 {
  margin: 0 0 8px;
  font-size: clamp(1.5rem, 4vw, 2.1rem);
}
.${p} .adw-lead {
  margin: 0 auto 28px;
  max-width: 560px;
  color: var(--adw-muted);
}
.${p} .adw-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
  align-items: stretch;
}
.${p} .adw-plan {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 26px 22px;
  text-align: left;
  background: var(--adw-bg);
  border: 1px solid var(--adw-line);
  border-radius: calc(var(--adw-radius) * 1.6);
}
.${p} .adw-plan.adw-best {
  border: 2px solid var(--adw-accent);
  box-shadow: 0 16px 40px rgba(15, 23, 42, .12);
}
.${p} .adw-badge {
  position: absolute;
  top: -13px;
  left: 22px;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--adw-accent);
  color: var(--adw-on-accent);
  font-size: .78rem;
  font-weight: 700;
}
.${p} h3 {
  margin: 0;
  font-size: 1.15rem;
}
.${p} .adw-price {
  margin: 0;
  color: var(--adw-muted);
}
.${p} .adw-price strong {
  font-size: 2.2rem;
  line-height: 1.1;
  color: var(--adw-text);
}
.${p} .adw-features {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
}
.${p} .adw-features li {
  position: relative;
  padding: 5px 0 5px 26px;
}
.${p} .adw-features li::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 10px;
  width: 12px;
  height: 7px;
  border-left: 3px solid var(--adw-accent);
  border-bottom: 3px solid var(--adw-accent);
  transform: rotate(-45deg);
}
.${p} .adw-plan .adw-btn {
  width: 100%;
}`);
    const plans = o.plans.map((pl) => {
      const num = /\d/.test(pl.price);
      return `  <li class="adw-plan${pl.best ? " adw-best" : ""}">
${pl.best && o.badge ? `    <span class="adw-badge">${esc(o.badge)}</span>\n` : ""}    <h3>${esc(pl.name)}</h3>
    <p class="adw-price">${num && o.currency ? `${esc(o.currency)} ` : ""}<strong>${esc(pl.price)}</strong>${pl.period ? ` <span>${esc(pl.period)}</span>` : ""}</p>
    <ul class="adw-features">
${lines(pl.features).map((f) => `      <li>${esc(f)}</li>`).join("\n")}
    </ul>
${pl.button ? `    <a class="adw-btn${pl.best ? "" : " adw-ghost"}" href="${esc(safeUrl(pl.link))}">${esc(pl.button)}</a>\n` : ""}  </li>`;
    }).join("\n");
    const html = `<section class="${p}" aria-labelledby="${u}-title">
  <h2 id="${u}-title">${esc(o.title)}</h2>
${o.lead ? `  <p class="adw-lead">${esc(o.lead)}</p>\n` : ""}  <ul class="adw-plans">
${ind(plans, 2)}
  </ul>
</section>`;
    return { title: o.title, css, html, js: "" };
  },
});

def({
  id: "faq", name: "FAQ accordion", blurb: "Questions that open to show the answer.", icon: "M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 17.5v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Questions people ask" },
    { key: "items", label: "Questions", type: "items", itemName: "Question", min: 1, max: 20, fields: [
      { key: "q", label: "Question", type: "text" },
      { key: "a", label: "Answer", type: "textarea" },
    ], default: [
      { q: "How do I place an order?", a: "Send us a message on WhatsApp or use the contact form. We reply within a few hours." },
      { q: "Do you deliver?", a: "Yes, we deliver across the city. Delivery is free on orders above Rs 3,000." },
      { q: "Can I pay cash on delivery?", a: "Yes. You can also pay by bank transfer or a mobile wallet." },
      { q: "Can I return an item?", a: "Unused items can be returned within 7 days. Please keep your receipt." },
    ] },
    { key: "single", label: "Open one answer at a time", type: "checkbox", default: true },
    { key: "openFirst", label: "Open the first answer", type: "checkbox", default: false },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-faq";
    const css = baseCss(p, o, `${card(p, 720)}
.${p} .adw-list {
  margin-top: 16px;
  border-top: 1px solid var(--adw-line);
}
.${p} .adw-item {
  border-bottom: 1px solid var(--adw-line);
}
.${p} h3 {
  margin: 0;
  font-size: 1rem;
}
.${p} .adw-q {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 4px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.${p} .adw-q:hover {
  color: var(--adw-accent);
}
.${p} .adw-icon {
  position: relative;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--adw-soft);
}
.${p} .adw-icon::before,
.${p} .adw-icon::after {
  content: "";
  position: absolute;
  left: 6px;
  top: 10px;
  width: 10px;
  height: 2px;
  background: var(--adw-accent);
  transition: transform .2s ease;
}
.${p} .adw-icon::after {
  transform: rotate(90deg);
}
.${p} .adw-q[aria-expanded="true"] .adw-icon::after {
  transform: rotate(0deg);
}
.${p} .adw-a {
  padding: 0 4px 16px;
  color: var(--adw-muted);
}
.${p} .adw-a p {
  margin: 0 0 8px;
}`);
    const items = o.items.map((it, i) => `<div class="adw-item">
  <h3><button type="button" class="adw-q" id="${u}-q${i + 1}" aria-expanded="${o.openFirst && i === 0}" aria-controls="${u}-a${i + 1}">${esc(it.q)}<span class="adw-icon" aria-hidden="true"></span></button></h3>
  <div class="adw-a" id="${u}-a${i + 1}" role="region" aria-labelledby="${u}-q${i + 1}">
${ind(paras(it.a) || "<p></p>", 4)}
  </div>
</div>`).join("\n");
    const html = `<section class="${p}" aria-labelledby="${u}-title" data-single="${!!o.single}">
  <h2 id="${u}-title">${esc(o.title)}</h2>
  <div class="adw-list">
${ind(items, 4)}
  </div>
</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var single = root.getAttribute('data-single') === 'true';
  var buttons = Array.prototype.slice.call(root.querySelectorAll('.adw-q'));
  function show(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    root.querySelector('#' + btn.getAttribute('aria-controls')).hidden = !open;
  }
  buttons.forEach(function (btn) {
    show(btn, btn.getAttribute('aria-expanded') === 'true');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      if (open && single) buttons.forEach(function (other) { if (other !== btn) show(other, false); });
      show(btn, open);
    });
  });
})();`;
    return { title: o.title, css, html, js };
  },
});

def({
  id: "contact", name: "Contact form", blurb: "A form that opens the visitor's email app.", icon: "M3 6h18v12H3zM3 7l9 6 9-6",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Send us a message" },
    { key: "lead", label: "Text under the heading", type: "text", default: "We usually reply within one working day." },
    { key: "to", label: "Your email address", type: "text", default: "hello@example.com" },
    { key: "subject", label: "Email subject", type: "text", default: "New message from my website" },
    { key: "phone", label: "Ask for a phone number", type: "checkbox", default: true },
    { key: "button", label: "Button text", type: "text", default: "Send message" },
    ...STYLE(),
  ],
  check(o) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(o.to || "").trim()) ? [] : ["Add the email address that should receive the messages."]; },
  render(o, u) {
    const p = "adw-contact";
    const to = String(o.to || "").trim();
    const css = baseCss(p, o, `${card(p, 560)}
.${p} form {
  display: grid;
  gap: 14px;
}
.${p} label {
  display: grid;
  gap: 6px;
  font-weight: 600;
  font-size: .95rem;
}
.${p} input,
.${p} textarea {
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--adw-line);
  border-radius: var(--adw-radius);
  background: var(--adw-bg);
  color: var(--adw-text);
  font: inherit;
  font-weight: 400;
}
.${p} input:focus,
.${p} textarea:focus {
  border-color: var(--adw-accent);
}
.${p} .adw-status {
  margin: 0;
  min-height: 1.5em;
  font-size: .9rem;
  color: var(--adw-muted);
}`);
    const html = `<section class="${p}" aria-labelledby="${u}-title">
  <h2 id="${u}-title">${esc(o.title)}</h2>
${o.lead ? `  <p class="adw-lead">${esc(o.lead)}</p>\n` : ""}  <form action="mailto:${esc(to)}?subject=${esc(encodeURIComponent(o.subject))}" method="post" enctype="text/plain" data-to="${esc(to)}" data-subject="${esc(o.subject)}">
    <label>Your name
      <input name="name" type="text" autocomplete="name" required>
    </label>
    <label>Your email
      <input name="email" type="email" autocomplete="email" required>
    </label>
${o.phone ? `    <label>Phone (optional)
      <input name="phone" type="tel" autocomplete="tel">
    </label>
` : ""}    <label>Message
      <textarea name="message" rows="5" required></textarea>
    </label>
    <button class="adw-btn" type="submit">${esc(o.button)}</button>
    <p class="adw-status" role="status" aria-live="polite"></p>
  </form>
</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var form = root.querySelector('form');
  var status = root.querySelector('.adw-status');
  ${mailtoUrl.toString().replace(/\n/g, "\n  ")}
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var f = form.elements;
    var url = mailtoUrl(form.getAttribute('data-to'), form.getAttribute('data-subject'), [
      ['Name', f.name.value],
      ['Email', f.email.value],
      ['Phone', f.phone ? f.phone.value : ''],
      ['Message', f.message.value]
    ]);
    root.setAttribute('data-mailto', url);
    status.textContent = 'Your email app should open now. If it does not, write to ' + form.getAttribute('data-to') + '.';
    window.location.href = url;
  });
})();`;
    return { title: o.title, css, html, js };
  },
});

def({
  id: "whatsapp", name: "WhatsApp chat button", blurb: "A floating button that starts a WhatsApp chat.", icon: "M4 20l1.4-4A8 8 0 1 1 8 18.6L4 20z",
  options: [
    { key: "phone", label: "WhatsApp number with country code", type: "text", default: "", placeholder: "923001234567", help: "Digits only, starting with the country code (92 for Pakistan)." },
    { key: "message", label: "Message the chat starts with", type: "text", default: "Hi! I found you on your website." },
    { key: "label", label: "Button text", type: "text", default: "Chat with us" },
    { key: "greeting", label: "Greeting bubble (optional)", type: "text", default: "Hi there! How can we help?" },
    { key: "position", label: "Position", type: "select", choices: [["right", "Bottom right"], ["left", "Bottom left"], ["inline", "In the page"]], default: "right" },
    ...STYLE({ accent: { label: "Button colour", default: "#1fa855" } }),
  ],
  check(o) {
    const d = digits(o.phone);
    if (!d) return ["Add your WhatsApp number. Without it, the button lets the visitor pick a contact."];
    if (/^0/.test(d)) return ["Start the number with the country code (for example 92 instead of 0)."];
    if (d.length < 8 || d.length > 15) return ["This number looks too short or too long."];
    return [];
  },
  render(o, u) {
    const p = "adw-whatsapp";
    const href = `https://wa.me/${digits(o.phone)}${o.message ? "?text=" + encodeURIComponent(o.message) : ""}`;
    const fixed = o.position !== "inline";
    const css = baseCss(p, o, `.${p} {
  display: flex;
  flex-direction: column;
  align-items: ${o.position === "left" ? "flex-start" : "flex-end"};
  gap: 10px;
  max-width: 320px;
${fixed ? `  position: fixed;
  ${o.position === "left" ? "left" : "right"}: 20px;
  bottom: 20px;
  z-index: 1000;` : "  margin: 0 auto;"}
}
.${p} .adw-bubble {
  position: relative;
  margin: 0;
  padding: 12px 38px 12px 14px;
  border-radius: 16px;
  background: var(--adw-bg);
  color: var(--adw-text);
  box-shadow: 0 10px 30px rgba(15, 23, 42, .18);
  animation: adw-pop .35s ease both;
}
.${p} .adw-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--adw-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.${p} .adw-chat {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 12px 20px 12px 16px;
  border-radius: 999px;
  background: var(--adw-accent);
  color: var(--adw-on-accent);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 10px 26px rgba(15, 23, 42, .25);
  transition: transform .15s ease;
}
.${p} .adw-chat:hover {
  transform: translateY(-2px);
}
.${p} .adw-chat svg {
  width: 26px;
  height: 26px;
  flex: none;
}
@keyframes adw-pop {
  from { opacity: 0; transform: translateY(8px) scale(.96); }
  to { opacity: 1; transform: none; }
}
@media (max-width: 480px) {
  .${p} .adw-chat span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .${p} .adw-chat {
    padding: 13px;
  }
}`);
    const html = `<div class="${p}">
${o.greeting ? `  <p class="adw-bubble" id="${u}-hi">${esc(o.greeting)}<button type="button" class="adw-close" aria-label="Close message">&times;</button></p>\n` : ""}  <a class="adw-chat" href="${esc(href)}" target="_blank" rel="noopener"${o.greeting ? ` aria-describedby="${u}-hi"` : ""}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5zm0 2a7.5 7.5 0 1 1-3.9 13.9l-.4-.2-2.3.6.6-2.2-.3-.4A7.5 7.5 0 0 1 12 4.5zm-3 4a1 1 0 0 0-1 1c0 3.3 2.7 6 6 6a1 1 0 0 0 1-1v-1l-2-.8-.8.9a4 4 0 0 1-2.3-2.3l.9-.8-.8-2H9z"/></svg>
    <span>${esc(o.label)}</span>
  </a>
</div>`;
    const js = o.greeting ? `(function () {
  var root = document.currentScript.previousElementSibling;
  var bubble = root.querySelector('.adw-bubble');
  root.querySelector('.adw-close').addEventListener('click', function () {
    bubble.hidden = true;
    root.querySelector('.adw-chat').removeAttribute('aria-describedby');
  });
})();` : "";
    return { title: o.label || "WhatsApp chat", css, html, js, page: fixed ? "fixed" : "" };
  },
});

def({
  id: "slider", name: "Image slider", blurb: "Photos that slide, with arrows, dots and swipe.", icon: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M8 19.5h.01M12 19.5h.01M16 19.5h.01",
  options: [
    { key: "slides", label: "Slides", type: "items", itemName: "Slide", min: 1, max: 8, fields: [
      { key: "image", label: "Picture", type: "image" },
      { key: "caption", label: "Caption (optional)", type: "text" },
      { key: "alt", label: "Describe the picture (for screen readers)", type: "text" },
    ], default: [
      { image: "sample:0", caption: "Fresh every morning", alt: "Purple and orange sky over soft hills" },
      { image: "sample:1", caption: "Made by local hands", alt: "Flowing white lines on a teal background" },
      { image: "sample:2", caption: "Delivered to your door", alt: "Round shapes floating on an orange background" },
    ] },
    { key: "ratio", label: "Shape", type: "select", choices: [["16/9", "Wide (16:9)"], ["4/3", "Classic (4:3)"], ["1/1", "Square"], ["3/1", "Banner (3:1)"]], default: "16/9" },
    { key: "autoplay", label: "Play by itself", type: "checkbox", default: true },
    { key: "seconds", label: "Seconds per slide", type: "number", min: 2, max: 30, step: 1, default: 5, show: (o) => o.autoplay },
    { key: "dots", label: "Show dots", type: "checkbox", default: true },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-slider";
    const b = [o.accent, mix(o.accent, "#ff7a59", 0.75), mix(o.accent, "#14b8a6", 0.75)];
    const src = (v, i) => (isImageData(v) ? v : sampleSlide(/^sample:(\d)$/.exec(v || "")?.[1] ?? i, b[0], b[1], b[2]));
    const n = o.slides.length;
    const css = baseCss(p, o, `.${p} {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
}
.${p} .adw-viewport {
  overflow: hidden;
  border-radius: calc(var(--adw-radius) * 1.6);
  background: var(--adw-soft);
  touch-action: pan-y;
}
.${p} .adw-track {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
  transition: transform .45s ease;
}
.${p} .adw-slide {
  position: relative;
  flex: 0 0 100%;
  aspect-ratio: ${o.ratio};
}
.${p} .adw-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.${p} .adw-caption {
  position: absolute;
  left: 16px;
  bottom: 16px;
  margin: 0;
  padding: 6px 14px;
  border-radius: var(--adw-radius);
  background: rgba(15, 23, 42, .62);
  color: #ffffff;
  font-weight: 600;
}
.${p} .adw-arrow {
  position: absolute;
  top: 50%;
  width: 44px;
  height: 44px;
  margin-top: -22px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .92);
  color: #111827;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, .2);
}
.${p} .adw-prev {
  left: 12px;
}
.${p} .adw-next {
  right: 12px;
}
.${p} .adw-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}
.${p} .adw-dot {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.${p} .adw-dot::before {
  content: "";
  display: block;
  width: 10px;
  height: 10px;
  margin: auto;
  border-radius: 50%;
  background: var(--adw-line);
}
.${p} .adw-dot[aria-current="true"]::before {
  width: 24px;
  border-radius: 5px;
  background: var(--adw-accent);
}
.${p} .adw-pause {
  margin-left: 8px;
  padding: 4px 10px;
  border: 1px solid var(--adw-line);
  border-radius: 999px;
  background: var(--adw-bg);
  color: var(--adw-text);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}`);
    const slides = o.slides.map((s, i) => `<li class="adw-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}"${i ? ' aria-hidden="true"' : ""}>
  <img src="${esc(src(s.image, i))}" alt="${esc(s.alt || s.caption || "")}"${i ? ' loading="lazy"' : ""}>
${s.caption ? `  <p class="adw-caption">${esc(s.caption)}</p>\n` : ""}</li>`).join("\n");
    const html = `<section class="${p}" aria-roledescription="carousel" aria-label="Photo slider" data-index="0" data-autoplay="${o.autoplay && n > 1 ? Math.round(o.seconds * 1000) : 0}">
  <div class="adw-viewport">
    <ul class="adw-track">
${ind(slides, 6)}
    </ul>
  </div>
${n > 1 ? `  <button type="button" class="adw-arrow adw-prev" aria-label="Previous slide">&lsaquo;</button>
  <button type="button" class="adw-arrow adw-next" aria-label="Next slide">&rsaquo;</button>
` : ""}${n > 1 && (o.dots || o.autoplay) ? `  <div class="adw-bar">
${o.dots ? o.slides.map((s, i) => `    <button type="button" class="adw-dot" aria-label="Show slide ${i + 1}"${i ? "" : ' aria-current="true"'}></button>`).join("\n") + "\n" : ""}${o.autoplay ? `    <button type="button" class="adw-pause" aria-pressed="false">Pause</button>\n` : ""}  </div>
` : ""}</section>`;
    const js = n > 1 ? `(function () {
  var root = document.currentScript.previousElementSibling;
  var track = root.querySelector('.adw-track');
  var slides = root.querySelectorAll('.adw-slide');
  var dots = root.querySelectorAll('.adw-dot');
  var pause = root.querySelector('.adw-pause');
  var delay = +root.getAttribute('data-autoplay');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var index = 0;
  var timer = null;
  var stopped = false;
  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-100 * index) + '%)';
    root.setAttribute('data-index', String(index));
    for (var k = 0; k < slides.length; k++) {
      if (k === index) slides[k].removeAttribute('aria-hidden');
      else slides[k].setAttribute('aria-hidden', 'true');
      if (dots[k]) dots[k].setAttribute('aria-current', String(k === index));
    }
  }
  function play() {
    clearInterval(timer);
    timer = delay && !stopped && !still ? setInterval(function () { go(index + 1); }, delay) : null;
  }
  root.querySelector('.adw-prev').addEventListener('click', function () { go(index - 1); play(); });
  root.querySelector('.adw-next').addEventListener('click', function () { go(index + 1); play(); });
  Array.prototype.forEach.call(dots, function (dot, i) {
    dot.addEventListener('click', function () { go(i); play(); });
  });
  if (pause) {
    if (still) pause.hidden = true;
    pause.addEventListener('click', function () {
      stopped = !stopped;
      pause.setAttribute('aria-pressed', String(stopped));
      pause.textContent = stopped ? 'Play' : 'Pause';
      play();
    });
  }
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(index - 1); play(); }
    if (e.key === 'ArrowRight') { go(index + 1); play(); }
  });
  root.addEventListener('mouseenter', function () { clearInterval(timer); });
  root.addEventListener('mouseleave', play);
  root.addEventListener('focusin', function () { clearInterval(timer); });
  root.addEventListener('focusout', play);
  var startX = null;
  var viewport = root.querySelector('.adw-viewport');
  viewport.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  viewport.addEventListener('pointerup', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); play(); }
  });
  go(0);
  play();
})();` : "";
    return { title: "Image slider", css, html, js };
  },
});

def({
  id: "testimonials", name: "Testimonial cards", blurb: "Kind words from customers, with star ratings.", icon: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  options: [
    { key: "title", label: "Heading", type: "text", default: "What our customers say" },
    { key: "items", label: "Testimonials", type: "items", itemName: "Testimonial", min: 1, max: 9, fields: [
      { key: "quote", label: "What they said", type: "textarea" },
      { key: "name", label: "Name", type: "text" },
      { key: "role", label: "City or role", type: "text" },
      { key: "rating", label: "Stars (1 to 5)", type: "number", min: 1, max: 5, step: 1 },
    ], default: [
      { quote: "Fast delivery and the food was still warm. We order every Friday now.", name: "Sana R.", role: "Lahore", rating: 5 },
      { quote: "They fixed my phone screen in one hour. Fair price and friendly staff.", name: "Bilal A.", role: "Karachi", rating: 5 },
      { quote: "Clear prices and quick replies on WhatsApp. I recommend them to friends.", name: "Hina K.", role: "Islamabad", rating: 4 },
    ] },
    { key: "stars", label: "Show stars", type: "checkbox", default: true },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-testimonials";
    const css = baseCss(p, o, `.${p} {
  max-width: 1080px;
  margin: 0 auto;
}
.${p} h2 {
  margin: 0 0 22px;
  text-align: center;
  font-size: clamp(1.4rem, 4vw, 2rem);
}
.${p} .adw-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.${p} figure {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  margin: 0;
  padding: 22px;
  background: var(--adw-bg);
  border: 1px solid var(--adw-line);
  border-radius: calc(var(--adw-radius) * 1.6);
  box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
}
.${p} .adw-stars {
  margin: 0;
  color: #f5a524;
  letter-spacing: 2px;
}
.${p} .adw-stars .adw-off {
  color: var(--adw-line);
}
.${p} blockquote {
  flex: 1;
  margin: 0;
  font-size: 1.02rem;
}
.${p} blockquote p {
  margin: 0;
}
.${p} figcaption {
  display: flex;
  align-items: center;
  gap: 12px;
}
.${p} .adw-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--adw-accent);
  color: var(--adw-on-accent);
  font-weight: 700;
}
.${p} figcaption span {
  display: block;
  font-size: .88rem;
  color: var(--adw-muted);
}`);
    const cards = o.items.map((t) => {
      const r = Math.max(1, Math.min(5, Math.round(+t.rating || 5)));
      return `<li>
  <figure>
${o.stars ? `    <p class="adw-stars" role="img" aria-label="Rated ${r} out of 5">${"&#9733;".repeat(r)}${r < 5 ? `<span class="adw-off">${"&#9733;".repeat(5 - r)}</span>` : ""}</p>\n` : ""}    <blockquote>
      <p>${esc(t.quote)}</p>
    </blockquote>
    <figcaption>
      <span class="adw-avatar" aria-hidden="true">${esc(initials(t.name))}</span>
      <div><strong>${esc(t.name)}</strong>${t.role ? `<span>${esc(t.role)}</span>` : ""}</div>
    </figcaption>
  </figure>
</li>`;
    }).join("\n");
    const html = `<section class="${p}" aria-labelledby="${u}-title">
  <h2 id="${u}-title">${esc(o.title)}</h2>
  <ul class="adw-cards">
${ind(cards, 4)}
  </ul>
</section>`;
    return { title: o.title, css, html, js: "" };
  },
});

def({
  id: "qr", name: "QR code card", blurb: "A QR code for a link, WhatsApp, phone or Wi-Fi.", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  options: [
    { key: "kind", label: "What the code opens", type: "select", choices: [["link", "A website link"], ["text", "Plain text"], ["whatsapp", "A WhatsApp chat"], ["phone", "A phone call"], ["email", "An email"], ["wifi", "Wi-Fi login"]], default: "link" },
    { key: "value", label: "Link or text", type: "text", default: "https://example.com", show: (o) => o.kind === "link" || o.kind === "text" },
    { key: "phone", label: "Number with country code", type: "text", default: "", placeholder: "923001234567", show: (o) => o.kind === "whatsapp" || o.kind === "phone" },
    { key: "message", label: "First WhatsApp message (optional)", type: "text", default: "", show: (o) => o.kind === "whatsapp" },
    { key: "email", label: "Email address", type: "text", default: "", show: (o) => o.kind === "email" },
    { key: "ssid", label: "Wi-Fi name", type: "text", default: "", show: (o) => o.kind === "wifi" },
    { key: "password", label: "Wi-Fi password", type: "text", default: "", show: (o) => o.kind === "wifi" && o.security !== "nopass" },
    { key: "security", label: "Wi-Fi security", type: "select", choices: [["WPA", "WPA / WPA2 / WPA3"], ["WEP", "WEP (old)"], ["nopass", "No password"]], default: "WPA", show: (o) => o.kind === "wifi" },
    { key: "title", label: "Heading", type: "text", default: "Scan to visit us" },
    { key: "caption", label: "Small text", type: "text", default: "Point your phone camera at the code." },
    { key: "ecl", label: "Damage protection", type: "select", choices: [["L", "Low (smallest code)"], ["M", "Medium"], ["Q", "High"], ["H", "Highest"]], default: "M" },
    { key: "size", label: "Code size (pixels)", type: "number", min: 120, max: 480, step: 10, default: 220 },
    { key: "dark", label: "Code colour", type: "color", group: "Style", default: (b) => b.colors[3] || "#1f2937" },
    { key: "light", label: "Code background", type: "color", group: "Style", default: "#ffffff" },
    { key: "download", label: "Add a “Download QR” link", type: "checkbox", default: true },
    ...STYLE(),
  ],
  check(o) {
    const out = [];
    if (!qrPayload(o)) out.push("Add what the QR code should hold.");
    if (contrast(o.dark, o.light) < 4) out.push("The code and its background are too close in colour. Phones may not read it.");
    else if (lum(o.dark) > lum(o.light)) out.push("Light codes on dark backgrounds don't scan on some phones. Dark on light is safest.");
    return out;
  },
  render(o, u) {
    const p = "adw-qr";
    const data = qrPayload(o);
    let svg = "", error = "";
    if (!data) error = "Add a link or text to make the QR code.";
    else {
      try { svg = qrSvg(data, { ecl: o.ecl, dark: o.dark, light: o.light, px: o.size, title: `QR code: ${data}` }); } catch (e) { error = e.message; }
    }
    const css = baseCss(p, o, `${card(p, 380)}
.${p} {
  text-align: center;
}
.${p} .adw-code {
  display: inline-block;
  padding: 10px;
  border: 2px solid var(--adw-soft);
  border-radius: var(--adw-radius);
  background: ${o.light};
  line-height: 0;
}
.${p} .adw-code svg {
  max-width: 100%;
  height: auto;
}
.${p} figcaption {
  margin-top: 14px;
}
.${p} figcaption p {
  margin: 0 0 12px;
  color: var(--adw-muted);
}
.${p} .adw-error {
  padding: 30px 10px;
  color: var(--adw-muted);
}`);
    const dl = svg && o.download ? `      <a class="adw-btn adw-ghost" href="data:image/svg+xml;charset=utf-8,${esc(encodeURIComponent(svg))}" download="qr-code.svg">Download QR</a>\n` : "";
    const html = `<figure class="${p}" aria-labelledby="${u}-title">
  <div class="adw-code">
${svg ? `    ${svg}` : `    <p class="adw-error">${esc(error)}</p>`}
  </div>
  <figcaption>
    <h2 id="${u}-title">${esc(o.title)}</h2>
${o.caption ? `    <p>${esc(o.caption)}</p>\n` : ""}${dl}  </figcaption>
</figure>`;
    return { title: o.title || "QR code", css, html, js: "", data };
  },
});

const DAYS = [["Monday", 1], ["Tuesday", 2], ["Wednesday", 3], ["Thursday", 4], ["Friday", 5], ["Saturday", 6], ["Sunday", 0]];
def({
  id: "hours", name: "Business hours", blurb: "Opening times with a live “open now” badge.", icon: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 13h3M8 16h6",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Opening hours" },
    { key: "days", label: "Days", type: "items", itemName: "Day", fixed: true, fields: [
      { key: "day", label: "Day", type: "text", readonly: true },
      { key: "open", label: "Opens", type: "time" },
      { key: "close", label: "Closes", type: "time" },
      { key: "closed", label: "Closed all day", type: "checkbox" },
    ], default: DAYS.map(([day, dow]) => ({ day, dow, open: "09:00", close: dow === 6 ? "15:00" : "18:00", closed: dow === 0 })) },
    { key: "tz", label: "Your time zone", type: "text", default: (b, now, ctx) => ctx?.tz || "Asia/Karachi", help: "Used for the “open now” badge, so it is right for visitors in other countries too." },
    { key: "format", label: "Time format", type: "select", choices: [["12h", "12 hour (6:00 pm)"], ["24h", "24 hour (18:00)"]], default: "12h" },
    { key: "live", label: "Show “open now” and today", type: "checkbox", default: true },
    { key: "note", label: "Note (optional)", type: "text", default: "Hours may change on public holidays." },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-hours";
    const rows = o.days.map((d, i) => ({ dow: DAYS[i]?.[1] ?? d.dow, open: d.open, close: d.close, closed: !!d.closed }));
    const css = baseCss(p, o, `${card(p, 480)}
.${p} .adw-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.${p} h2 {
  margin: 0;
}
.${p} .adw-status {
  margin: 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--adw-soft);
  font-weight: 700;
  font-size: .9rem;
}
.${p} .adw-status:empty {
  display: none;
}
.${p} .adw-status.adw-open {
  background: #dcfce7;
  color: #166534;
}
.${p} .adw-status.adw-shut {
  background: #fee2e2;
  color: #991b1b;
}
.${p} table {
  width: 100%;
  border-collapse: collapse;
}
.${p} th,
.${p} td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--adw-line);
  text-align: left;
  font-variant-numeric: tabular-nums;
}
.${p} td {
  text-align: right;
}
.${p} th {
  font-weight: 600;
}
.${p} tr.adw-today th,
.${p} tr.adw-today td {
  color: var(--adw-accent);
  font-weight: 800;
}
.${p} .adw-closed {
  color: var(--adw-muted);
}
.${p} .adw-note {
  margin: 12px 0 0;
  font-size: .88rem;
  color: var(--adw-muted);
}`);
    const body = o.days.map((d, i) => {
      const same = d.open === d.close;
      const time = d.closed ? '<span class="adw-closed">Closed</span>' : same ? "Open 24 hours" : `${esc(fmtTime(d.open, o.format))} &ndash; ${esc(fmtTime(d.close, o.format))}`;
      return `<tr data-day="${rows[i].dow}">
  <th scope="row">${esc(d.day)}</th>
  <td>${time}</td>
</tr>`;
    }).join("\n");
    const html = `<section class="${p}" aria-labelledby="${u}-title" data-tz="${esc(o.tz)}">
  <div class="adw-head">
    <h2 id="${u}-title">${esc(o.title)}</h2>
    <p class="adw-status" role="status"></p>
  </div>
  <table>
    <caption class="adw-sr">${esc(o.title)}</caption>
    <tbody>
${ind(body, 6)}
    </tbody>
  </table>
${o.note ? `  <p class="adw-note">${esc(o.note)}</p>\n` : ""}</section>`;
    const js = o.live ? `(function () {
  var root = document.currentScript.previousElementSibling;
  var rows = ${json(rows)};
  ${isOpenAt.toString().replace(/\n/g, "\n  ")}
  ${nowIn.toString().replace(/\n/g, "\n  ")}
  function update() {
    var now = nowIn(root.getAttribute('data-tz'));
    var open = isOpenAt(rows, now.day, now.minutes);
    var status = root.querySelector('.adw-status');
    status.textContent = open ? 'Open now' : 'Closed now';
    status.className = 'adw-status ' + (open ? 'adw-open' : 'adw-shut');
    Array.prototype.forEach.call(root.querySelectorAll('tr[data-day]'), function (tr) {
      var today = +tr.getAttribute('data-day') === now.day;
      tr.classList.toggle('adw-today', today);
      if (today) tr.setAttribute('aria-current', 'date');
      else tr.removeAttribute('aria-current');
    });
  }
  update();
  setInterval(update, 60000);
})();` : "";
    return { title: o.title, css, html, js };
  },
});

def({
  id: "calculator", name: "Simple calculator", blurb: "A calculator with keyboard support.", icon: "M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01",
  options: [
    { key: "title", label: "Heading (optional)", type: "text", default: "Quick calculator" },
    ...STYLE({ corners: { default: "round" } }),
  ],
  render(o, u) {
    const p = "adw-calculator";
    const keys = [["C", "C", "Clear", "fn"], ["back", "&#9003;", "Delete", "fn"], ["%", "%", "Per cent", "fn"], ["/", "&divide;", "Divide", "op"],
      ["7", "7"], ["8", "8"], ["9", "9"], ["*", "&times;", "Times", "op"],
      ["4", "4"], ["5", "5"], ["6", "6"], ["-", "&minus;", "Minus", "op"],
      ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+", "Plus", "op"],
      ["0", "0", "", "zero"], [".", ".", "Point"], ["=", "=", "Equals", "eq"]];
    const css = baseCss(p, o, `${card(p, 340)}
.${p} h2 {
  font-size: 1.1rem;
}
.${p} .adw-display {
  display: block;
  margin: 10px 0 14px;
  padding: 12px 14px;
  border-radius: var(--adw-radius);
  background: var(--adw-soft);
  text-align: right;
  overflow-wrap: anywhere;
}
.${p} .adw-expr {
  display: block;
  min-height: 1.4em;
  color: var(--adw-muted);
  font-size: .95rem;
}
.${p} .adw-result {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.${p} .adw-keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.${p} .adw-keys button {
  min-height: 52px;
  border: 1px solid var(--adw-line);
  border-radius: var(--adw-radius);
  background: var(--adw-bg);
  color: var(--adw-text);
  font: inherit;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s ease, transform .12s ease;
}
.${p} .adw-keys button:hover {
  background: var(--adw-soft);
}
.${p} .adw-keys button:active {
  transform: scale(.96);
}
.${p} .adw-keys .adw-fn {
  color: var(--adw-muted);
}
.${p} .adw-keys .adw-op {
  color: var(--adw-accent);
  font-size: 1.4rem;
}
.${p} .adw-keys .adw-eq {
  background: var(--adw-accent);
  border-color: var(--adw-accent);
  color: var(--adw-on-accent);
}
.${p} .adw-keys .adw-zero {
  grid-column: span 2;
}`);
    const html = `<section class="${p}" aria-label="${esc(o.title || "Calculator")}">
${o.title ? `  <h2>${esc(o.title)}</h2>\n` : ""}  <div class="adw-display">
    <span class="adw-expr" aria-hidden="true"></span>
    <output class="adw-result" aria-live="polite">0</output>
  </div>
  <div class="adw-keys" role="group" aria-label="Calculator keys">
${keys.map(([k, t, label, cls]) => `    <button type="button" data-key="${esc(k)}"${cls ? ` class="adw-${cls}"` : ""}${label && label !== t ? ` aria-label="${label}"` : ""}>${t}</button>`).join("\n")}
  </div>
</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var exprEl = root.querySelector('.adw-expr');
  var resultEl = root.querySelector('.adw-result');
  var expr = '';
  var fresh = false;
  ${calcEval.toString().replace(/\n/g, "\n  ")}
  function pretty(s) {
    return s.replace(/\\*/g, '\\u00d7').replace(/\\//g, '\\u00f7').replace(/-/g, '\\u2212');
  }
  function show(result) {
    exprEl.textContent = pretty(expr);
    resultEl.textContent = result;
    root.setAttribute('data-result', result);
  }
  function live() {
    var r = '';
    try { r = String(calcEval(expr)); } catch (e) { r = ''; }
    show(r || (expr ? resultEl.textContent : '0'));
  }
  function press(k) {
    var ops = '+-*/';
    if (k === 'C') { expr = ''; fresh = false; return show('0'); }
    if (k === 'back') { expr = expr.slice(0, -1); fresh = false; return live(); }
    if (k === '=') {
      if (!expr) return;
      try {
        var v = calcEval(expr);
        show(String(v));
        exprEl.textContent = pretty(expr) + ' =';
        expr = String(v);
        fresh = true;
      } catch (e) {
        show('Error');
        expr = '';
      }
      return;
    }
    if (fresh && /[0-9.]/.test(k)) expr = '';
    fresh = false;
    var last = expr.slice(-1);
    if (ops.indexOf(k) >= 0) {
      if (!expr && k !== '-') return;
      if (ops.indexOf(last) >= 0) expr = expr.slice(0, -1);
    }
    if (k === '.') {
      var part = expr.split(/[-+*\\/]/).pop();
      if (part.indexOf('.') >= 0) return;
      if (!part) expr += '0';
    }
    expr += k;
    live();
  }
  root.querySelector('.adw-keys').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) press(b.getAttribute('data-key'));
  });
  root.addEventListener('keydown', function (e) {
    var map = { Enter: '=', '=': '=', Backspace: 'back', Escape: 'C', Delete: 'C', x: '*', X: '*' };
    var k = map[e.key] || e.key;
    if (e.key === 'Enter' && e.target.tagName === 'BUTTON') return;
    if (/^[0-9.%+\\-*\\/=]$/.test(k) || k === 'back' || k === 'C') {
      e.preventDefault();
      press(k);
    }
  });
})();`;
    return { title: o.title || "Calculator", css, html, js };
  },
});

def({
  id: "tipzakat", name: "Tip & zakat calculator", blurb: "Split a bill with a tip, or estimate zakat.", icon: "M12 3v18M16 7.5C16 5.6 14.2 5 12 5s-4 1-4 3c0 4.5 8 2.5 8 7 0 2-1.8 3-4 3s-4-.8-4-2.8",
  options: [
    { key: "mode", label: "Show", type: "select", choices: [["both", "Tip and zakat"], ["tip", "Tip only"], ["zakat", "Zakat only"]], default: "both" },
    { key: "currency", label: "Currency", type: "text", default: "Rs" },
    { key: "tips", label: "Tip choices in % (comma separated)", type: "text", default: "5, 10, 15", show: (o) => o.mode !== "zakat" },
    { key: "nisab", label: "Nisab value to start with (optional)", type: "number", min: 0, step: 1, default: 0, show: (o) => o.mode !== "tip", help: "Visitors can change it. Nisab changes with gold and silver prices, so check today's value." },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-tipzakat";
    const tips = [...new Set(String(o.tips || "").split(/[,\s]+/).map(Number).filter((n) => n >= 0 && n <= 100))].slice(0, 6);
    if (!tips.length) tips.push(10);
    const cur = esc(o.currency);
    const css = baseCss(p, o, `.${p} {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 18px;
  max-width: ${o.mode === "both" ? 900 : 460}px;
  margin: 0 auto;
}
.${p} .adw-card {
  padding: clamp(18px, 4vw, 26px);
  background: var(--adw-bg);
  border: 1px solid var(--adw-line);
  border-radius: calc(var(--adw-radius) * 1.6);
  box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
}
.${p} h2 {
  margin: 0 0 14px;
  font-size: 1.3rem;
}
.${p} label,
.${p} legend {
  display: block;
  margin: 10px 0 6px;
  font-weight: 600;
  font-size: .92rem;
}
.${p} fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}
.${p} input[type="number"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--adw-line);
  border-radius: var(--adw-radius);
  background: var(--adw-bg);
  color: var(--adw-text);
  font: inherit;
}
.${p} .adw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.${p} .adw-chips input {
  position: absolute;
  opacity: 0;
}
.${p} .adw-chips label {
  margin: 0;
  padding: 8px 14px;
  border: 1px solid var(--adw-line);
  border-radius: 999px;
  cursor: pointer;
}
.${p} .adw-chips input:checked + label {
  background: var(--adw-accent);
  border-color: var(--adw-accent);
  color: var(--adw-on-accent);
}
.${p} .adw-chips input:focus-visible + label {
  outline: 3px solid var(--adw-accent);
  outline-offset: 2px;
}
.${p} dl {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding: 14px;
  border-radius: var(--adw-radius);
  background: var(--adw-soft);
}
.${p} dl div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.${p} dt {
  color: var(--adw-muted);
}
.${p} dd {
  margin: 0;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.${p} .adw-msg,
.${p} .adw-small {
  margin: 10px 0 0;
  font-size: .86rem;
  color: var(--adw-muted);
}
.${p} .adw-msg {
  font-weight: 600;
  color: var(--adw-text);
}`);
    const num = (id, label, value = "", extra = "") => `<label for="${u}-${id}">${label}</label>\n<input id="${u}-${id}" type="number" inputmode="decimal" min="0" step="any" value="${value}"${extra}>`;
    const tipCard = `<section class="adw-card" data-calc="tip" aria-labelledby="${u}-tip-title">
  <h2 id="${u}-tip-title">Tip calculator</h2>
${ind(num("bill", `Bill amount (${cur})`, "", ' placeholder="0"'), 2)}
  <fieldset>
    <legend>Tip</legend>
    <div class="adw-chips">
${tips.map((t, i) => `      <input type="radio" name="${u}-pct" id="${u}-pct${i}" value="${t}"${i === Math.min(1, tips.length - 1) ? " checked" : ""}><label for="${u}-pct${i}">${t}%</label>`).join("\n")}
    </div>
  </fieldset>
${ind(num("people", "Number of people", "1", ""), 2).replace('step="any"', 'step="1"').replace('min="0"', 'min="1"').replace('inputmode="decimal"', 'inputmode="numeric"')}
  <dl aria-live="polite">
    <div><dt>Tip</dt><dd data-out="tip">${cur} 0</dd></div>
    <div><dt>Total</dt><dd data-out="total">${cur} 0</dd></div>
    <div><dt>Each person pays</dt><dd data-out="each">${cur} 0</dd></div>
  </dl>
</section>`;
    const zakatCard = `<section class="adw-card" data-calc="zakat" aria-labelledby="${u}-zakat-title">
  <h2 id="${u}-zakat-title">Zakat calculator</h2>
${ind(num("cash", `Cash at home and in the bank (${cur})`), 2)}
${ind(num("gold", `Value of gold and silver (${cur})`), 2)}
${ind(num("business", `Business goods for sale (${cur})`), 2)}
${ind(num("owed", `Money others owe you (${cur})`), 2)}
${ind(num("debts", `Debts and bills due now (${cur})`), 2)}
${ind(num("nisab", `Today's nisab value (${cur})`, o.nisab > 0 ? String(o.nisab) : ""), 2)}
  <p class="adw-small">Nisab is commonly the value of 612.36 g of silver or 87.48 g of gold. Check today's value locally.</p>
  <dl aria-live="polite">
    <div><dt>Zakatable wealth</dt><dd data-out="net">${cur} 0</dd></div>
    <div><dt>Zakat (2.5%)</dt><dd data-out="due">${cur} 0</dd></div>
  </dl>
  <p class="adw-msg" data-out="msg">Enter today's nisab value to see if zakat is due.</p>
  <p class="adw-small">This is a simple estimate, not a religious ruling. Ask a scholar about your own situation.</p>
</section>`;
    const html = `<div class="${p}" data-currency="${cur}">
${o.mode !== "zakat" ? ind(tipCard, 2) + "\n" : ""}${o.mode !== "tip" ? ind(zakatCard, 2) + "\n" : ""}</div>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var cur = root.getAttribute('data-currency');
  ${tipCalc.toString().replace(/\n/g, "\n  ")}
  ${zakatCalc.toString().replace(/\n/g, "\n  ")}
  function money(v) {
    return cur + ' ' + v.toLocaleString('en', { maximumFractionDigits: 2 });
  }
  function val(id) {
    var el = root.querySelector('#${u}-' + id);
    return el ? el.value : '';
  }
  function out(card, key, text) {
    var el = card.querySelector('[data-out="' + key + '"]');
    if (el) el.textContent = text;
  }
  function update() {
    var tipCard = root.querySelector('[data-calc="tip"]');
    if (tipCard) {
      var picked = tipCard.querySelector('input[type="radio"]:checked');
      var t = tipCalc(val('bill'), picked ? picked.value : 0, val('people'));
      out(tipCard, 'tip', money(t.tip));
      out(tipCard, 'total', money(t.total));
      out(tipCard, 'each', money(t.each));
    }
    var zakatCard = root.querySelector('[data-calc="zakat"]');
    if (zakatCard) {
      var z = zakatCalc({ cash: val('cash'), gold: val('gold'), business: val('business'), owed: val('owed'), debts: val('debts'), nisab: val('nisab') });
      out(zakatCard, 'net', money(z.net));
      out(zakatCard, 'due', money(z.due));
      out(zakatCard, 'msg', !z.nisab ? 'Enter today\\'s nisab value to see if zakat is due.' : z.above ? 'Your wealth is above the nisab. Zakat due: ' + money(z.due) + '.' : 'Your wealth is below the nisab, so no zakat is due on it.');
    }
  }
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  update();
})();`;
    return { title: o.mode === "zakat" ? "Zakat calculator" : o.mode === "tip" ? "Tip calculator" : "Tip and zakat calculator", css, html, js };
  },
});

def({
  id: "linkbio", name: "Link in bio page", blurb: "One page with all your links, for social profiles.", icon: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  options: [
    { key: "name", label: "Name", type: "text", default: "Ayesha's Kitchen" },
    { key: "bio", label: "Short bio", type: "textarea", default: "Home-made meals in Lahore.\nOrder a day before, delivered warm." },
    { key: "avatar", label: "Photo or logo (optional)", type: "image", default: "" },
    { key: "links", label: "Links", type: "items", itemName: "Link", min: 1, max: 12, fields: [
      { key: "label", label: "Button text", type: "text" },
      { key: "url", label: "Link", type: "url" },
    ], default: [
      { label: "See our menu", url: "https://example.com/menu" },
      { label: "Order on WhatsApp", url: "https://wa.me/?text=Hi!%20I%20would%20like%20to%20order" },
      { label: "Photos of our food", url: "https://example.com/photos" },
      { label: "Find us on the map", url: "https://www.openstreetmap.org/" },
    ] },
    { key: "buttons", label: "Button style", type: "select", choices: [["filled", "Filled"], ["outline", "Outline"], ["soft", "Soft"]], default: "filled" },
    { key: "backdrop", label: "Page background", type: "select", choices: [["gradient", "Colour fade"], ["soft", "Soft tint"], ["plain", "Plain"]], default: "gradient" },
    { key: "footer", label: "Footer text (optional)", type: "text", default: "Thank you for visiting!" },
    ...STYLE({ corners: { default: "round" } }),
  ],
  render(o, u) {
    const p = "adw-linkbio";
    const c = palette(o);
    const back = o.backdrop === "gradient" ? `linear-gradient(160deg, ${mix(o.accent, o.bg, 0.78)} 0%, ${o.bg} 55%, ${mix("#ff7a59", o.bg, 0.85)} 100%)` : o.backdrop === "soft" ? c.soft : o.bg;
    const btn = { filled: "background: var(--adw-accent);\n  color: var(--adw-on-accent);\n  border-color: var(--adw-accent);", outline: "background: transparent;\n  color: var(--adw-text);\n  border-color: var(--adw-accent);", soft: "background: var(--adw-bg);\n  color: var(--adw-text);\n  border-color: var(--adw-line);" }[o.buttons] || "";
    const css = baseCss(p, o, `.${p} {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 48px 18px 32px;
  background: ${back};
  text-align: center;
  border-radius: calc(var(--adw-radius) * 1.6);
}
.${p} .adw-inner {
  width: 100%;
  max-width: 460px;
}
.${p} .adw-avatar {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  margin: 0 auto 14px;
  border-radius: 50%;
  border: 4px solid var(--adw-bg);
  background: var(--adw-accent);
  color: var(--adw-on-accent);
  font-size: 2rem;
  font-weight: 800;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .15);
}
.${p} h1 {
  margin: 0 0 6px;
  font-size: 1.6rem;
}
.${p} .adw-bio {
  margin: 0 0 24px;
  color: var(--adw-muted);
}
.${p} ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.${p} .adw-link {
  display: block;
  padding: 15px 18px;
  border: 2px solid;
  border-radius: var(--adw-radius);
  ${btn}
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(15, 23, 42, .08);
  transition: transform .15s ease, box-shadow .15s ease;
}
.${p} .adw-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, .14);
}
.${p} footer {
  margin-top: 28px;
  font-size: .86rem;
  color: var(--adw-muted);
}`);
    const avatar = isImageData(o.avatar) ? `<img class="adw-avatar" src="${esc(o.avatar)}" alt="${esc(o.name)}" width="96" height="96">` : `<div class="adw-avatar" aria-hidden="true">${esc(initials(o.name))}</div>`;
    const html = `<main class="${p}">
  <div class="adw-inner">
    <header>
      ${avatar}
      <h1>${esc(o.name)}</h1>
${o.bio ? `      <p class="adw-bio">${lines(o.bio).map(esc).join("<br>")}</p>\n` : ""}    </header>
    <nav aria-label="Links">
      <ul>
${o.links.filter((l) => l.label).map((l) => { const href = safeUrl(l.url); return `        <li><a class="adw-link" href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a></li>`; }).join("\n")}
      </ul>
    </nav>
${o.footer ? `    <footer>${esc(o.footer)}</footer>\n` : ""}  </div>
</main>`;
    return { title: o.name, css, html, js: "", page: "full" };
  },
});

def({
  id: "quiz", name: "Quiz", blurb: "Multiple-choice questions with a score.", icon: "M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14M12 17.5v.5M4 4h16v16H4z",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Quick quiz" },
    { key: "lead", label: "Text under the heading", type: "text", default: "Pick one answer for each question, then check your score." },
    { key: "items", label: "Questions", type: "items", itemName: "Question", min: 1, max: 20, fields: [
      { key: "q", label: "Question", type: "text" },
      { key: "a1", label: "Answer 1", type: "text" },
      { key: "a2", label: "Answer 2", type: "text" },
      { key: "a3", label: "Answer 3 (optional)", type: "text" },
      { key: "a4", label: "Answer 4 (optional)", type: "text" },
      { key: "correct", label: "Right answer", type: "select", choices: [["1", "Answer 1"], ["2", "Answer 2"], ["3", "Answer 3"], ["4", "Answer 4"]] },
    ], default: [
      { q: "Which planet is closest to the Sun?", a1: "Venus", a2: "Mercury", a3: "Mars", a4: "Earth", correct: "2" },
      { q: "How many sides does a hexagon have?", a1: "Five", a2: "Seven", a3: "Six", a4: "Eight", correct: "3" },
      { q: "Which gas do plants take in from the air?", a1: "Carbon dioxide", a2: "Oxygen", a3: "Nitrogen", a4: "", correct: "1" },
    ] },
    { key: "button", label: "Button text", type: "text", default: "Check my answers" },
    { key: "result", label: "Score text ({score} and {total} are filled in)", type: "text", default: "You got {score} of {total} right." },
    ...STYLE(),
  ],
  check(o) { return o.items.some((it) => !String(it[`a${it.correct || 1}`] || "").trim()) ? ["A question's right answer is empty. Pick an answer that has text."] : []; },
  render(o, u) {
    const p = "adw-quiz";
    const css = baseCss(p, o, `${card(p, 720)}
.${p} fieldset {
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid var(--adw-line);
  border-radius: var(--adw-radius);
}
.${p} legend {
  padding: 0 6px;
  font-weight: 700;
}
.${p} label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 4px 0;
  border-radius: var(--adw-radius);
  cursor: pointer;
}
.${p} label:hover {
  background: var(--adw-soft);
}
.${p} input {
  width: 18px;
  height: 18px;
  accent-color: var(--adw-accent);
}
.${p} .adw-right {
  background: #dcfce7;
  color: #14532d;
}
.${p} .adw-wrong {
  background: #fee2e2;
  color: #7f1d1d;
}
.${p} .adw-result {
  margin: 14px 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--adw-accent);
}`);
    const qs = o.items.map((it, i) => {
      const answers = [1, 2, 3, 4].map((k) => [k, String(it[`a${k}`] || "").trim()]).filter(([, t]) => t);
      return `<fieldset class="adw-q" data-correct="${esc(it.correct || "1")}">
  <legend>${i + 1}. ${esc(it.q)}</legend>
${answers.map(([k, t]) => `  <label><input type="radio" name="${u}-q${i + 1}" value="${k}"> ${esc(t)}</label>`).join("\n")}
</fieldset>`;
    }).join("\n");
    const html = `<section class="${p}" aria-labelledby="${u}-title" data-result="${esc(o.result)}">
  <h2 id="${u}-title">${esc(o.title)}</h2>
${o.lead ? `  <p class="adw-lead">${esc(o.lead)}</p>\n` : ""}${ind(qs, 2)}
  <button type="button" class="adw-btn adw-check">${esc(o.button || "Check my answers")}</button>
  <p class="adw-result" role="status" aria-live="polite"></p>
</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var out = root.querySelector('.adw-result');
  root.querySelector('.adw-check').addEventListener('click', function () {
    var qs = root.querySelectorAll('.adw-q'), score = 0;
    Array.prototype.forEach.call(qs, function (q) {
      var right = q.getAttribute('data-correct');
      Array.prototype.forEach.call(q.querySelectorAll('label'), function (l) {
        var input = l.querySelector('input');
        l.classList.remove('adw-right', 'adw-wrong');
        if (input.value === right) l.classList.add('adw-right');
        else if (input.checked) l.classList.add('adw-wrong');
      });
      var picked = q.querySelector('input:checked');
      if (picked && picked.value === right) score++;
    });
    out.textContent = root.getAttribute('data-result').replace('{score}', score).replace('{total}', qs.length);
  });
})();`;
    return { title: o.title, css, html, js };
  },
});

def({
  id: "timer", name: "Timer and stopwatch", blurb: "A countdown timer or a stopwatch with start, pause and reset.", icon: "M12 8v5l3 2M9 2h6M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Focus timer" },
    { key: "mode", label: "Kind", type: "select", choices: [["timer", "Countdown timer"], ["stopwatch", "Stopwatch"]], default: "timer" },
    { key: "minutes", label: "Minutes (timer)", type: "number", min: 1, max: 180, default: 25, show: (o) => o.mode !== "stopwatch" },
    { key: "done", label: "Text when the time is up", type: "text", default: "Time is up. Take a short break!", show: (o) => o.mode !== "stopwatch" },
    { key: "sound", label: "Beep when the time is up", type: "checkbox", default: true, show: (o) => o.mode !== "stopwatch" },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-timer", stop = o.mode === "stopwatch", total = Math.round(o.minutes || 25) * 60;
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    const css = baseCss(p, o, `${card(p, 460)}
.${p} {
  text-align: center;
}
.${p} .adw-time {
  margin: 14px 0 18px;
  font-size: clamp(2.6rem, 12vw, 4.2rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--adw-accent);
}
.${p} .adw-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.${p} .adw-done {
  margin: 14px 0 0;
  font-weight: 700;
}`);
    const html = `<section class="${p}" aria-labelledby="${u}-title" data-mode="${stop ? "stopwatch" : "timer"}" data-total="${stop ? 0 : total}" data-sound="${!!o.sound}">
  <h2 id="${u}-title">${esc(o.title)}</h2>
  <p class="adw-time" role="timer" aria-live="off">${stop ? "00:00" : fmt(total)}</p>
  <div class="adw-row">
    <button type="button" class="adw-btn adw-go">Start</button>
    <button type="button" class="adw-btn adw-ghost adw-reset">Reset</button>
  </div>
${stop ? "" : `  <p class="adw-done" role="status" hidden>${esc(o.done)}</p>\n`}</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var stop = root.getAttribute('data-mode') === 'stopwatch';
  var total = Number(root.getAttribute('data-total')) || 0;
  var timeEl = root.querySelector('.adw-time'), go = root.querySelector('.adw-go'), done = root.querySelector('.adw-done');
  var ms = stop ? 0 : total * 1000, last = 0, iv = 0;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function show() {
    var s = stop ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
    timeEl.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  function beep() {
    if (root.getAttribute('data-sound') !== 'true') return;
    try { var a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.1; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.4); } catch (e) {}
  }
  function tick() {
    var now = Date.now(), d = now - last; last = now;
    ms = stop ? ms + d : Math.max(0, ms - d);
    show();
    if (!stop && ms === 0) { pause(); if (done) done.hidden = false; beep(); }
  }
  function pause() { clearInterval(iv); iv = 0; go.textContent = 'Start'; }
  go.addEventListener('click', function () {
    if (iv) { pause(); return; }
    if (!stop && ms === 0) ms = total * 1000;
    if (done) done.hidden = true;
    last = Date.now(); iv = setInterval(tick, 200); go.textContent = 'Pause';
  });
  root.querySelector('.adw-reset').addEventListener('click', function () { pause(); ms = stop ? 0 : total * 1000; if (done) done.hidden = true; show(); });
  show();
})();`;
    return { title: o.title, css, html, js };
  },
});

def({
  id: "flashcards", name: "Flashcards", blurb: "Cards that flip to show the answer, for learning.", icon: "M3 7h14v12H3zM7 3h14v12",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Learn the capitals" },
    { key: "items", label: "Cards", type: "items", itemName: "Card", min: 1, max: 40, fields: [
      { key: "front", label: "Front", type: "text" },
      { key: "back", label: "Back", type: "textarea" },
    ], default: [
      { front: "Capital of Japan", back: "Tokyo" },
      { front: "Capital of Canada", back: "Ottawa" },
      { front: "Capital of Kenya", back: "Nairobi" },
      { front: "Capital of Brazil", back: "Brasília" },
    ] },
    { key: "shuffle", label: "Shuffle the cards each time", type: "checkbox", default: false },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-flashcards";
    const css = baseCss(p, o, `${card(p, 560)}
.${p} {
  text-align: center;
}
.${p} .adw-deck {
  list-style: none;
  margin: 16px 0;
  padding: 0;
}
.${p} .adw-flip {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 190px;
  padding: 24px;
  border: 2px solid var(--adw-line);
  border-radius: calc(var(--adw-radius) * 1.4);
  background: var(--adw-soft);
  color: var(--adw-text);
  font: inherit;
  font-size: 1.35rem;
  font-weight: 700;
  cursor: pointer;
}
.${p} .adw-flip[aria-pressed="true"] {
  background: var(--adw-accent);
  color: var(--adw-on-accent);
  border-color: var(--adw-accent);
}
.${p} .adw-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.${p} .adw-count {
  min-width: 64px;
  color: var(--adw-muted);
  font-variant-numeric: tabular-nums;
}
.${p} .adw-hint {
  margin: 0;
  font-size: .9rem;
  color: var(--adw-muted);
}`);
    const cards = o.items.map((c, i) => `<li${i ? " hidden" : ""}><button type="button" class="adw-flip" aria-pressed="false"><span class="adw-front">${esc(c.front)}</span><span class="adw-back" hidden>${lines(c.back).map(esc).join("<br>")}</span></button></li>`).join("\n");
    const html = `<section class="${p}" aria-labelledby="${u}-title" data-shuffle="${!!o.shuffle}">
  <h2 id="${u}-title">${esc(o.title)}</h2>
  <p class="adw-hint">Tap a card to turn it over.</p>
  <ol class="adw-deck">
${ind(cards, 4)}
  </ol>
  <div class="adw-row">
    <button type="button" class="adw-btn adw-ghost adw-prev" aria-label="Previous card">Back</button>
    <span class="adw-count" aria-live="polite">1 / ${o.items.length}</span>
    <button type="button" class="adw-btn adw-next" aria-label="Next card">Next</button>
  </div>
</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var deck = root.querySelector('.adw-deck'), items = Array.prototype.slice.call(deck.children), count = root.querySelector('.adw-count'), i = 0;
  if (root.getAttribute('data-shuffle') === 'true') {
    for (var k = items.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), t = items[k]; items[k] = items[j]; items[j] = t; }
    items.forEach(function (li) { deck.appendChild(li); });
  }
  function flip(btn, on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.adw-front').hidden = on;
    btn.querySelector('.adw-back').hidden = !on;
  }
  function show(n) {
    i = (n + items.length) % items.length;
    items.forEach(function (li, k) { li.hidden = k !== i; flip(li.querySelector('.adw-flip'), false); });
    count.textContent = (i + 1) + ' / ' + items.length;
  }
  deck.addEventListener('click', function (e) { var b = e.target.closest('.adw-flip'); if (b) flip(b, b.getAttribute('aria-pressed') !== 'true'); });
  root.querySelector('.adw-prev').addEventListener('click', function () { show(i - 1); });
  root.querySelector('.adw-next').addEventListener('click', function () { show(i + 1); });
  show(0);
})();`;
    return { title: o.title, css, html, js };
  },
});

const UNIT_KINDS = {
  length: ["Length", [["m", "Metres", 1], ["km", "Kilometres", 1000], ["cm", "Centimetres", 0.01], ["mm", "Millimetres", 0.001], ["mi", "Miles", 1609.344], ["yd", "Yards", 0.9144], ["ft", "Feet", 0.3048], ["in", "Inches", 0.0254]]],
  weight: ["Weight", [["kg", "Kilograms", 1], ["g", "Grams", 0.001], ["lb", "Pounds", 0.45359237], ["oz", "Ounces", 0.028349523125], ["t", "Tonnes", 1000]]],
  volume: ["Volume", [["l", "Litres", 1], ["ml", "Millilitres", 0.001], ["gal", "US gallons", 3.785411784], ["cup", "US cups", 0.2365882365], ["m3", "Cubic metres", 1000]]],
  temperature: ["Temperature", [["c", "Celsius", 0], ["f", "Fahrenheit", 0], ["k", "Kelvin", 0]]],
};
/** Unit conversion used by the converter widget (also tested in Node). */
export function convertUnit(kind, value, from, to) {
  const v = Number(value);
  if (!Number.isFinite(v)) return NaN;
  if (kind === "temperature") {
    const c = from === "f" ? (v - 32) * 5 / 9 : from === "k" ? v - 273.15 : v;
    return to === "f" ? c * 9 / 5 + 32 : to === "k" ? c + 273.15 : c;
  }
  const list = UNIT_KINDS[kind]?.[1] || [], a = list.find((x) => x[0] === from), b = list.find((x) => x[0] === to);
  return a && b ? (v * a[2]) / b[2] : NaN;
}
def({
  id: "converter", name: "Unit converter", blurb: "Convert length, weight, volume and temperature.", icon: "M4 8h13l-3-3M20 16H7l3 3",
  options: [
    { key: "title", label: "Heading", type: "text", default: "Unit converter" },
    { key: "kind", label: "Start with", type: "select", choices: Object.entries(UNIT_KINDS).map(([k, v]) => [k, v[0]]), default: "length" },
    { key: "value", label: "Starting value", type: "number", min: -1000000, max: 1000000, default: 1 },
    ...STYLE(),
  ],
  render(o, u) {
    const p = "adw-converter";
    const css = baseCss(p, o, `${card(p, 520)}
.${p} .adw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.${p} label {
  display: grid;
  gap: 6px;
  font-weight: 600;
  font-size: .95rem;
}
.${p} .adw-wide {
  grid-column: 1 / -1;
}
.${p} input,
.${p} select {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--adw-line);
  border-radius: var(--adw-radius);
  background: var(--adw-bg);
  color: var(--adw-text);
  font: inherit;
}
.${p} .adw-out {
  margin: 16px 0 0;
  padding: 14px;
  border-radius: var(--adw-radius);
  background: var(--adw-soft);
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--adw-accent);
  text-align: center;
}`);
    const opts = (list) => list.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("");
    const html = `<section class="${p}" aria-labelledby="${u}-title" data-units="${esc(json(Object.fromEntries(Object.entries(UNIT_KINDS).map(([k, v]) => [k, v[1]]))))}">
  <h2 id="${u}-title">${esc(o.title)}</h2>
  <div class="adw-grid">
    <label class="adw-wide" for="${u}-kind">Measure<select id="${u}-kind">${opts(Object.entries(UNIT_KINDS).map(([k, v]) => [k, v[0]])).replace(`value="${o.kind}"`, `value="${o.kind}" selected`)}</select></label>
    <label class="adw-wide" for="${u}-val">Value<input id="${u}-val" type="number" step="any" value="${esc(String(o.value))}"></label>
    <label for="${u}-from">From<select id="${u}-from"></select></label>
    <label for="${u}-to">To<select id="${u}-to"></select></label>
  </div>
  <p class="adw-out" role="status" aria-live="polite"></p>
</section>`;
    const js = `(function () {
  var root = document.currentScript.previousElementSibling;
  var units = JSON.parse(root.getAttribute('data-units'));
  var kind = root.querySelector('select[id$="-kind"]'), val = root.querySelector('input'), from = root.querySelector('select[id$="-from"]'), to = root.querySelector('select[id$="-to"]'), out = root.querySelector('.adw-out');
  function fill() {
    var list = units[kind.value];
    from.innerHTML = to.innerHTML = '';
    list.forEach(function (u) { from.add(new Option(u[1], u[0])); to.add(new Option(u[1], u[0])); });
    to.selectedIndex = list.length > 1 ? 1 : 0;
  }
  function conv(v, a, b) {
    if (kind.value === 'temperature') {
      var c = a === 'f' ? (v - 32) * 5 / 9 : a === 'k' ? v - 273.15 : v;
      return b === 'f' ? c * 9 / 5 + 32 : b === 'k' ? c + 273.15 : c;
    }
    var list = units[kind.value], x, y;
    list.forEach(function (u) { if (u[0] === a) x = u[2]; if (u[0] === b) y = u[2]; });
    return v * x / y;
  }
  function run() {
    var v = parseFloat(val.value);
    if (!isFinite(v)) { out.textContent = 'Type a number.'; return; }
    var r = conv(v, from.value, to.value);
    out.textContent = v + ' ' + from.options[from.selectedIndex].text + ' = ' + (Math.round(r * 10000) / 10000) + ' ' + to.options[to.selectedIndex].text;
  }
  kind.addEventListener('change', function () { fill(); run(); });
  [val, from, to].forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); });
  fill(); run();
})();`;
    return { title: o.title, css, html, js };
  },
});

export const WIDGETS = W;
export const widgetById = (id) => W.find((w) => w.id === id);

/* ------------------------------------------------------------------ options: defaults, cleaning */
const FALLBACK_BRAND = { colors: ["#5b4cf0", "#ff7a59", "#14b8a6", "#1f2937", "#ffffff"], fonts: { body: "sans", heading: "sans" } };
const brandOf = (b) => ({ ...FALLBACK_BRAND, ...(b || {}), colors: [0, 1, 2, 3, 4].map((i) => hex6(b?.colors?.[i]) || FALLBACK_BRAND.colors[i]), fonts: { ...FALLBACK_BRAND.fonts, ...(b?.fonts || {}) } });
const val = (d, brand, now, ctx) => (typeof d === "function" ? d(brand, now, ctx) : structuredClone(d));

/** Default options of a widget for a brand kit. ctx: { tz } (visitor's time zone for business hours). */
export function defaultsFor(id, brand, now = Date.now(), ctx = {}) {
  const w = widgetById(id);
  if (!w) throw new Error("Unknown widget " + id);
  const b = brandOf(brand), o = {};
  for (const opt of w.options) o[opt.key] = val(opt.default ?? (opt.type === "checkbox" ? false : opt.type === "items" ? [] : ""), b, now, ctx);
  return o;
}

function cleanValue(opt, v, fallback) {
  switch (opt.type) {
    case "color": return hex6(v) || hex6(fallback) || "#000000";
    case "checkbox": return v === true || v === "true" || v === "on" || v === 1;
    case "number": { let n = Number(v); if (!Number.isFinite(n)) n = Number(fallback) || 0; if (opt.min != null) n = Math.max(opt.min, n); if (opt.max != null) n = Math.min(opt.max, n); return n; }
    case "select": return (opt.choices || []).some(([k]) => k === v) ? v : fallback;
    case "time": return /^\d{1,2}:\d{2}$/.test(String(v || "")) ? String(v).padStart(5, "0") : fallback || "09:00";
    case "datetime": return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(v || "")) ? String(v).slice(0, 16) : fallback;
    case "image": return isImageData(v) || /^sample:\d$/.test(String(v || "")) ? String(v) : "";
    case "textarea": return String(v ?? "").slice(0, 5000);
    default: return String(v ?? "").slice(0, 2000);
  }
}
/** Fills in missing options and cleans every value (colours, numbers, lists) so render() can trust them. */
export function normalize(id, opts, brand, now = Date.now(), ctx = {}) {
  const w = widgetById(id), d = defaultsFor(id, brand, now, ctx), o = {};
  for (const opt of w.options) {
    const v = opts?.[opt.key];
    if (opt.type === "items") {
      let list = Array.isArray(v) ? v : d[opt.key];
      if (opt.fixed) list = d[opt.key].map((def, i) => ({ ...def, ...(list[i] || {}), day: def.day, dow: def.dow }));
      list = list.slice(0, opt.max || 50);
      if (list.length < (opt.min || 0)) list = list.concat(d[opt.key].slice(list.length, opt.min));
      o[opt.key] = list.map((item, i) => {
        const out = {};
        for (const f of opt.fields) out[f.key] = cleanValue(f, item?.[f.key], f.type === "checkbox" ? false : f.type === "number" ? f.min ?? 0 : f.type === "time" ? "09:00" : "");
        if (opt.fixed) out.dow = d[opt.key][i].dow;
        return out;
      });
    } else o[opt.key] = v === undefined ? d[opt.key] : cleanValue(opt, v, d[opt.key]);
  }
  return o;
}

/** Problems worth telling the user about (shown above the settings). */
export function warnings(id, opts, now = Date.now()) { const w = widgetById(id); return w.check ? w.check(opts, now) : []; }

/**
 * The widget's code: { page (full HTML document), snippet (style + markup + script to paste into a site), title, file }.
 * opts must be normalized (see normalize()).
 */
export function renderWidget(id, opts) {
  const w = widgetById(id);
  if (!w) throw new Error("Unknown widget " + id);
  const u = "adw" + hash(id + JSON.stringify(opts));
  const r = w.render(opts, u);
  const c = palette(opts);
  const bodyCss = r.page === "full" ? `html,
body {
  height: 100%;
}
body {
  margin: 0;
  padding: 0;
  background: ${opts.bg};
}
.adw-linkbio {
  border-radius: 0;
}` : `body {
  margin: 0;
  padding: clamp(16px, 4vw, 40px) 16px${r.page === "fixed" ? " 120px" : ""};
  background: ${c.page};
}`;
  const snippet = `<style>
${ind(r.css, 2)}
</style>
${r.html}${r.js ? `\n<script>\n${ind(r.js, 2)}\n</script>` : ""}
`;
  const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(r.title || w.name)}</title>
  <style>
${ind(bodyCss + "\n" + r.css, 4)}
  </style>
</head>
<body>
${ind(r.html, 2)}
${r.js ? `  <script>\n${ind(r.js, 4)}\n  </script>\n` : ""}</body>
</html>
`;
  return { page, snippet, title: r.title || w.name, file: `${w.id}.html`, data: r.data };
}
