// AsaanDesk Business dashboards: one small engine that every dashboard app configures.
// Everything runs in the browser and is saved in localStorage on this device. Nothing is uploaded.
// An app calls createApp(config); see ../clinic/app.js for a full example.

/* ---------- helpers ---------- */

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd();
export const addDays = (day, n) => {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const monthOf = (day) => String(day || "").slice(0, 7);
export const thisMonth = () => today().slice(0, 7);
export const addMonths = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const dayDiff = (a, b) => Math.round((new Date(a + "T12:00:00") - new Date(b + "T12:00:00")) / 86400000);
export const weekStart = (day) => {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const fmtDate = (day) => {
  if (!day) return "";
  const [y, m, d] = String(day).slice(0, 10).split("-").map(Number);
  return y ? `${d} ${MONTHS[m - 1]} ${y}` : String(day);
};
export const fmtShort = (day) => {
  if (!day) return "";
  const [, m, d] = String(day).slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
export const fmtMonth = (month) => {
  const [y, m] = String(month).split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
export const dayName = (day) => DAYS[new Date(day + "T12:00:00").getDay()];
export const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m || 0)} ${h < 12 ? "AM" : "PM"}`;
};
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const sum = (rows, fn) => rows.reduce((s, r) => s + num(typeof fn === "function" ? fn(r) : r[fn]), 0);
export const groupCount = (rows, fn) => {
  const m = new Map();
  for (const r of rows) {
    const k = fn(r);
    if (k !== undefined && k !== null && k !== "") m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
export const groupSum = (rows, keyFn, valFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k !== undefined && k !== null && k !== "") m.set(k, (m.get(k) || 0) + num(valFn(r)));
  }
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
// Pakistani mobile numbers: 03xx… becomes 923xx… for wa.me links.
export const waNumber = (phone) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = "92" + d.slice(1);
  if (d.length === 10 && d.startsWith("3")) d = "92" + d;
  return d.length >= 10 ? d : "";
};
let uidN = 0;
export const uid = () => Date.now().toString(36) + (uidN++).toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- icons (simple strokes, our own) ---------- */

const ICONS = {
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  board: '<rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="16.5" y="4" width="4" height="7" rx="1.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2 .8 3.1 2.6 3.5 5.4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4-6.5 8-6.5s7 2.3 8 6.5"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  cart: '<path d="M3 4h2l2.4 11h11l2-8H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M10 7.7l4.6 6.6"/>',
  steth: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
  chef: '<path d="M7 14h10v6H7z"/><path d="M7 14a4 4 0 1 1 2-7.5A4 4 0 0 1 16.5 7 4 4 0 1 1 17 14"/>',
  table: '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M6 13v6M18 13v6M8 5h8"/>',
  scissors: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5L20 18M8 15.5L20 6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/>',
  school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  building: '<path d="M4 21V5l8-2v18M12 8h8v13"/><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  dumbbell: '<path d="M2 12h20"/><rect x="4" y="8" width="3" height="8" rx="1"/><rect x="17" y="8" width="3" height="8" rx="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  wa: '<path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/><path d="M9.2 8.6c.3-.6.9-.6 1.1-.1l.6 1.4c.1.3 0 .6-.2.8l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.8-.2l1.4.6c.5.2.5.8-.1 1.1-.9.6-2.1.6-3.4-.1a7 7 0 0 1-2.6-2.6c-.7-1.3-.7-2.5-.1-3.4z"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
};
export const icon = (name, cls = "") => `<svg class="dx-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.list}</svg>`;

/* ---------- charts (SVG, one hue; values in ink; every mark has a tooltip) ---------- */

const niceMax = (max) => {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= max) return m * mag;
  return 10 * mag;
};
const shortNum = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + "K" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + "K" : String(Math.round(v)));

/** Column chart. data: [{label, value, tip?}] */
export function columnChart(data, { fmt = shortNum, height = 200, labelEvery = 0 } = {}) {
  if (!data.length) return '<div class="dx-empty">No data yet.</div>';
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const w = 100 / data.length;
  const every = labelEvery || Math.ceil(data.length / 8);
  const peak = data.reduce((b, d, i) => (d.value > data[b].value ? i : b), 0);
  const ticks = [0, max / 2, max];
  return `<div class="dx-chart" style="height:${height}px">${ticks.map((t) => `<div class="dx-gl" style="bottom:${(t / max) * 100}%"><span>${esc(shortNum(t))}</span></div>`).join("")}<div class="dx-cols">${data
    .map((d, i) => {
      const tip = d.tip || `${d.label}: ${fmt(d.value)}`;
      const show = i === peak || i === data.length - 1;
      return `<div class="dx-colw" style="width:${w}%" tabindex="0" role="img" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><div class="dx-bar" style="height:${(d.value / max) * 100}%">${show && d.value ? `<span class="dx-val">${esc(fmt(d.value))}</span>` : ""}</div><span class="dx-x">${(data.length - 1 - i) % every === 0 ? esc(d.label) : ""}</span></div>`;
    })
    .join("")}</div></div>`;
}

/** Horizontal bars for a ranking: [{label, value}] */
export function barList(data, { fmt = (v) => String(v), max = 8 } = {}) {
  const rows = data.slice(0, max);
  if (!rows.length) return '<div class="dx-empty">No data yet.</div>';
  const top = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="dx-blist">${rows
    .map((r) => `<div class="dx-brow" data-tip="${esc(r.label + ": " + fmt(r.value))}" tabindex="0" role="img" aria-label="${esc(r.label + ": " + fmt(r.value))}"><span class="dx-blabel">${esc(r.label)}</span><span class="dx-btrack"><span style="width:${Math.max(2, (r.value / top) * 100)}%"></span></span><span class="dx-bval">${esc(fmt(r.value))}</span></div>`)
    .join("")}</div>`;
}

/** A line for a trend: [{label, value}] */
export function lineChart(data, { fmt = shortNum, height = 180 } = {}) {
  if (data.length < 2) return columnChart(data, { fmt, height });
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const W = 600,
    H = 200;
  const x = (i) => (i / (data.length - 1)) * (W - 20) + 10;
  const y = (v) => H - 10 - (v / max) * (H - 30);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const every = Math.ceil(data.length / 7);
  return `<div class="dx-line" style="height:${height}px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(max / 2)}" y2="${y(max / 2)}" class="dx-lgl"/><line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" class="dx-lgl"/><polyline points="${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}" class="dx-area"/><polyline points="${pts}" class="dx-stroke"/></svg><div class="dx-ldots">${data
    .map((d, i) => `<span class="dx-ldot" style="left:${(x(i) / W) * 100}%;top:${(y(d.value) / H) * 100}%" tabindex="0" role="img" aria-label="${esc(d.label + ": " + fmt(d.value))}" data-tip="${esc(d.label + ": " + fmt(d.value))}"></span>`)
    .join("")}</div><div class="dx-lx">${data.map((d, i) => `<span style="left:${(x(i) / W) * 100}%">${(data.length - 1 - i) % every === 0 ? esc(d.label) : ""}</span>`).join("")}</div><span class="dx-lmax">${esc(shortNum(max))}</span></div>`;
}

/* ---------- the app ---------- */

export function createApp(cfg) {
  const KEY = "asaandesk.dash.v1." + cfg.id;
  const root = document.getElementById("app");
  const cur = cfg.currency || "PKR";
  let db = null;
  let route = { page: cfg.pages[0].id, id: "" };
  const ui = {}; // per-page view state: search, filters, sort, week, view mode
  const app = {
    cfg,
    get db() {
      return db;
    },
    esc,
    icon,
    money: (v) => `${cur} ${Math.round(num(v)).toLocaleString("en-US")}`,
    moneyShort: (v) => `${cur} ${shortNum(num(v))}`,
    date: fmtDate,
    time: fmtTime,
    today,
    setting: (k) => db.settings[k] ?? (cfg.settings || []).find((s) => s.key === k)?.default,
  };

  /* ----- storage ----- */
  function blank() {
    const out = { settings: Object.fromEntries((cfg.settings || []).map((s) => [s.key, s.default ?? ""])), _seq: {} };
    for (const k of Object.keys(cfg.entities)) out[k] = [];
    return out;
  }
  function demo() {
    const out = blank();
    const data = cfg.demo ? cfg.demo(demoHelpers()) : {};
    for (const [k, rows] of Object.entries(data)) out[k] = rows.map((r) => ({ id: r.id || uid(), created: Date.now(), ...r }));
    for (const k of Object.keys(cfg.entities)) out._seq[k] = out[k].length;
    out._demo = true;
    return out;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = blank();
        db = { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings || {}) } };
        for (const k of Object.keys(cfg.entities)) if (!Array.isArray(db[k])) db[k] = [];
        return;
      }
    } catch {
      /* a broken save falls back to demo data */
    }
    db = demo();
    save();
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      toast("Could not save: this browser's storage is full or blocked.");
    }
  }
  app.save = save;
  app.nextNo = (entity, prefix = "") => {
    db._seq[entity] = (db._seq[entity] || db[entity].length) + 1;
    return prefix + String(db._seq[entity]).padStart(4, "0");
  };
  app.find = (entity, id) => db[entity].find((r) => r.id === id);
  app.label = (entity, id) => {
    const r = app.find(entity, id);
    return r ? titleOf(entity, r) : "";
  };
  app.upsert = (entity, row) => {
    const i = db[entity].findIndex((r) => r.id === row.id);
    if (i >= 0) db[entity][i] = row;
    else db[entity].push({ id: uid(), created: Date.now(), ...row });
    save();
    return i >= 0 ? row : db[entity][db[entity].length - 1];
  };
  app.remove = (entity, id) => {
    db[entity] = db[entity].filter((r) => r.id !== id);
    save();
  };

  /* ----- toast, tooltips, dialogs ----- */
  let toastTimer;
  function toast(text) {
    let t = document.querySelector(".dx-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "dx-toast";
      t.setAttribute("role", "status");
      document.body.append(t);
    }
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 3200);
  }
  app.toast = toast;
  const tip = document.createElement("div");
  tip.className = "dx-tip";
  tip.hidden = true;
  document.body.append(tip);
  const showTip = (ev) => {
    const el = ev.target.closest?.("[data-tip]");
    if (!el) return void (tip.hidden = true);
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const x = Math.min(innerWidth - tip.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2));
    const y = r.top - tip.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - tip.offsetHeight - 8;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  };
  document.addEventListener("mouseover", showTip);
  document.addEventListener("focusin", showTip);
  document.addEventListener("scroll", () => (tip.hidden = true), true);

  /* ----- WhatsApp and print ----- */
  app.whatsapp = (phone, text) => {
    const n = waNumber(phone);
    if (!n) return toast("Add a mobile number first (03xx xxxxxxx).");
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  app.print = (title, html) => {
    let box = document.getElementById("dxPrint");
    if (!box) {
      box = document.createElement("div");
      box.id = "dxPrint";
      document.body.append(box);
    }
    const s = db.settings;
    box.innerHTML = `<div class="dx-doc"><header class="dx-doc-head"><div><b>${esc(s.business || cfg.brand)}</b><div>${esc([s.address, s.phone].filter(Boolean).join(" · "))}</div></div><div class="dx-doc-title">${esc(title)}</div></header>${html}<footer class="dx-doc-foot">Made with AsaanDesk · asaandesk.com</footer></div>`;
    document.body.classList.add("dx-printing");
    const done = () => {
      document.body.classList.remove("dx-printing");
      removeEventListener("afterprint", done);
    };
    addEventListener("afterprint", done);
    setTimeout(() => {
      window.print();
      setTimeout(done, 500);
    }, 50);
  };
  app.download = (name, text, type = "text/plain") => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 800);
  };

  /* ----- entities, fields and values ----- */
  const ent = (k) => cfg.entities[k];
  function titleOf(entity, r) {
    const e = ent(entity);
    return e.title ? e.title(r, app) : r.name || r.title || r.no || r.id;
  }
  function fieldsOf(entity, r) {
    const f = ent(entity).fields;
    return typeof f === "function" ? f(r, app) : f;
  }
  function optionsOf(field, r) {
    const o = typeof field.options === "function" ? field.options(r, app) : field.options || [];
    return o.map((x) => (typeof x === "string" ? { value: x, label: x } : x));
  }
  function display(field, value, r) {
    if (value === undefined || value === null || value === "") return "";
    switch (field.type) {
      case "money":
        return app.money(value);
      case "date":
        return fmtDate(value);
      case "time":
        return fmtTime(value);
      case "bool":
        return value ? "Yes" : "No";
      case "relation":
        return app.label(field.entity, value) || "—";
      case "percent":
        return num(value) + "%";
      case "select": {
        const o = optionsOf(field, r).find((x) => x.value === value);
        return o ? o.label : value;
      }
      case "lines":
        return `${(value || []).length} item${(value || []).length === 1 ? "" : "s"}`;
      default:
        return String(value);
    }
  }
  app.display = (entity, key, r) => {
    const f = fieldsOf(entity, r).find((x) => x.key === key);
    return f ? display(f, r[key], r) : String(r[key] ?? "");
  };
  const TONES = { green: 1, amber: 1, red: 1, blue: 1, gray: 1, purple: 1, teal: 1 };
  app.pill = (text, tone = "gray") => `<span class="dx-pill ${TONES[tone] ? tone : "gray"}">${esc(text)}</span>`;
  app.linesTotal = (lines = []) => sum(lines, (l) => num(l.qty) * num(l.price));

  /* ----- layout ----- */
  function shell() {
    document.documentElement.style.setProperty("--acc", cfg.accent || "#5b4cf0");
    const theme = (() => {
      try {
        return localStorage.getItem("asaandesk.dash.theme") || "";
      } catch {
        return "";
      }
    })();
    if (theme) document.documentElement.dataset.theme = theme;
    root.innerHTML = `<div class="dx-shell"><aside class="dx-side" id="dxSide"><a class="dx-brand" href="/business" target="_top"><span class="dx-mark" aria-hidden="true">${icon(cfg.icon || "grid")}</span><span><b id="dxBiz"></b><small>${esc(cfg.title)}</small></span></a><nav class="dx-nav" id="dxNav" aria-label="Pages"></nav><div class="dx-side-foot"><span>${icon("check")} Saved on this device</span><a href="/business" target="_top">All dashboards</a></div></aside><div class="dx-main"><header class="dx-top"><button type="button" class="dx-ib dx-menu" id="dxMenu" aria-label="Menu">${icon("menu")}</button><h1 id="dxTitle"></h1><label class="dx-search">${icon("search")}<input id="dxSearch" type="search" placeholder="Search everything" aria-label="Search everything" autocomplete="off"><div class="dx-results" id="dxResults" hidden></div></label><button type="button" class="dx-ib" id="dxTheme" aria-label="Light or dark">${icon("moon")}</button><button type="button" class="dx-ib" id="dxData" aria-label="Data and backup">${icon("database")}</button></header><div class="dx-demo" id="dxDemo" hidden>You are looking at sample data. <button type="button" class="dx-link" data-x="empty">Start with an empty dashboard</button> or keep exploring.</div><main class="dx-page" id="dxPage" tabindex="-1"></main></div></div><div class="dx-drawer-wrap" id="dxDrawerWrap" hidden><div class="dx-scrim" data-x="close"></div><section class="dx-drawer" id="dxDrawer" role="dialog" aria-modal="true" aria-labelledby="dxDrawerTitle"></section></div>`;
    document.getElementById("dxMenu").onclick = () => document.getElementById("dxSide").classList.toggle("open");
    document.getElementById("dxTheme").onclick = () => {
      const dark = document.documentElement.dataset.theme !== "dark" && !(document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      try {
        localStorage.setItem("asaandesk.dash.theme", dark ? "dark" : "light");
      } catch {
        /* the choice only lasts this visit */
      }
    };
    document.getElementById("dxData").onclick = dataMenu;
    const search = document.getElementById("dxSearch"),
      results = document.getElementById("dxResults");
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      if (q.length < 2) return void (results.hidden = true);
      const hits = [];
      for (const [k, e] of Object.entries(cfg.entities)) {
        if (e.hidden) continue;
        for (const r of db[k]) {
          const hay = (e.search || ["name"]).map((f) => (typeof f === "function" ? f(r, app) : r[f])).join(" ").toLowerCase();
          if (hay.includes(q)) hits.push({ k, r });
          if (hits.length > 30) break;
        }
      }
      results.innerHTML = hits.length
        ? hits.slice(0, 12).map((h) => `<button type="button" data-open="${h.k}:${h.r.id}"><b>${esc(titleOf(h.k, h.r))}</b><small>${esc(ent(h.k).one || h.k)}</small></button>`).join("")
        : '<div class="dx-empty">Nothing found.</div>';
      results.hidden = false;
    };
    search.onkeydown = (ev) => {
      if (ev.key === "Escape") {
        search.value = "";
        results.hidden = true;
      }
    };
    document.addEventListener("click", (ev) => {
      if (!ev.target.closest(".dx-search")) results.hidden = true;
    });
    root.addEventListener("click", onClick); // the drawer is inside root too
    root.addEventListener("change", onChange);
    root.addEventListener("input", onInput);
    document.getElementById("dxDrawerWrap").addEventListener("input", onDrawerInput);
    document.getElementById("dxDrawerWrap").addEventListener("change", onDrawerInput);
    addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !document.getElementById("dxDrawerWrap").hidden) closeDrawer();
    });
  }
  function nav() {
    document.getElementById("dxBiz").textContent = db.settings.business || cfg.brand;
    document.getElementById("dxNav").innerHTML = cfg.pages
      .map((p) => {
        const badge = p.badge ? p.badge(db, app) : 0;
        return `<a href="#/${p.id}" class="${p.id === route.page ? "on" : ""}" ${p.id === route.page ? 'aria-current="page"' : ""}>${icon(p.icon)}<span>${esc(p.label)}</span>${badge ? `<em>${badge}</em>` : ""}</a>`;
      })
      .join("");
    document.getElementById("dxDemo").hidden = !db._demo;
  }

  /* ----- router ----- */
  function parse() {
    const [, page = "", id = ""] = location.hash.split("/");
    route = { page: cfg.pages.some((p) => p.id === page) ? page : cfg.pages[0].id, id: decodeURIComponent(id) };
  }
  app.go = (page) => {
    location.hash = "#/" + page;
  };
  addEventListener("hashchange", () => {
    parse();
    render();
    document.getElementById("dxSide").classList.remove("open");
  });

  function render(keepScroll = false) {
    const page = cfg.pages.find((p) => p.id === route.page);
    nav();
    document.getElementById("dxTitle").textContent = page.label;
    document.title = `${page.label} · ${cfg.title} | AsaanDesk`;
    const el = document.getElementById("dxPage");
    const y = keepScroll ? el.scrollTop : 0;
    const s = (ui[page.id] ||= { q: "", filters: {}, sort: page.sort || "", dir: page.dir || 1, week: weekStart(today()), view: page.views?.[0] || "", day: today() });
    let html = "";
    try {
      if (page.type === "overview") html = overviewPage(page);
      else if (page.type === "table") html = tablePage(page, s);
      else if (page.type === "board") html = boardPage(page, s);
      else if (page.type === "calendar") html = calendarPage(page, s);
      else if (page.type === "pos") html = posPage(page, s);
      else if (page.type === "settings") html = settingsPage(page);
      else if (page.type === "custom") html = page.render(app, s);
    } catch (err) {
      console.error(err);
      html = `<div class="dx-card dx-empty">This page could not be shown: ${esc(err.message)}</div>`;
    }
    el.innerHTML = html;
    el.dataset.page = page.id;
    if (page.mounted) page.mounted(el, app, s);
    if (page.type === "board") wireBoard(el, page);
    el.scrollTop = y;
  }
  app.refresh = () => render(true);

  /* ----- overview ----- */
  function overviewPage(page) {
    const k = page.kpis ? page.kpis(db, app) : [];
    const blocks = page.blocks ? page.blocks(db, app) : [];
    return `${page.actions ? `<div class="dx-actions">${page.actions.map((a) => `<button type="button" class="dx-btn ${a.primary ? "primary" : ""}" data-x="${a.new ? "new:" + a.new : "act:" + page.id + ":" + a.id}">${icon(a.icon || "plus")}${esc(a.label)}</button>`).join("")}</div>` : ""}${
      k.length
        ? `<div class="dx-kpis">${k
            .map((x) => `<${x.go ? `a href="#/${x.go}"` : "div"} class="dx-kpi ${x.tone || ""}"><span class="dx-kpi-l">${x.icon ? icon(x.icon) : ""}${esc(x.label)}</span><b>${esc(x.value)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ""}</${x.go ? "a" : "div"}>`)
            .join("")}</div>`
        : ""
    }<div class="dx-grid">${blocks.map((b) => `<section class="dx-card ${b.wide ? "wide" : ""}"><div class="dx-card-h"><h2>${esc(b.title)}</h2>${b.note ? `<span>${esc(b.note)}</span>` : ""}${b.go ? `<a href="#/${b.go}">Open ${icon("right")}</a>` : ""}</div>${b.html}${b.table ? tableView(b.table) : ""}</section>`).join("")}</div>`;
  }
  // Small helper for "show these numbers as a table" under a chart.
  function tableView(rows) {
    return `<details class="dx-tv"><summary>Show as a table</summary><table><tbody>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table></details>`;
  }
  app.list = (rows, fn, empty = "Nothing here yet.") => (rows.length ? `<ul class="dx-list">${rows.map(fn).join("")}</ul>` : `<div class="dx-empty">${esc(empty)}</div>`);
  app.openLink = (entity, r, inner) => `<button type="button" class="dx-row-btn" data-open="${entity}:${r.id}">${inner}</button>`;

  /* ----- table ----- */
  function rowsFor(page, s) {
    let rows = db[page.entity].slice();
    if (page.where) rows = rows.filter((r) => page.where(r, app));
    for (const f of page.filters || []) {
      const v = s.filters[f.key];
      if (v && v !== "all") rows = rows.filter((r) => (f.test ? f.test(r, v, app) : String(r[f.key]) === v));
    }
    if (s.q) {
      const q = s.q.toLowerCase();
      const e = ent(page.entity);
      rows = rows.filter((r) => (e.search || ["name"]).map((f) => (typeof f === "function" ? f(r, app) : r[f])).join(" ").toLowerCase().includes(q));
    }
    const col = (page.columns || []).find((c) => c.key === s.sort);
    if (col) {
      const get = (r) => (col.sortValue ? col.sortValue(r, app) : col.get ? col.get(r, app) : r[col.key]);
      rows.sort((a, b) => {
        const x = get(a),
          y = get(b);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "en", { numeric: true })) * s.dir;
      });
    } else if (page.order) rows.sort((a, b) => page.order(a, b, app));
    return rows;
  }
  function cell(page, c, r) {
    if (c.html) return c.html(r, app);
    const v = c.get ? c.get(r, app) : r[c.key];
    if (c.money) return esc(app.money(v));
    if (c.date) return esc(fmtDate(v));
    const f = fieldsOf(page.entity, r).find((x) => x.key === c.key);
    return esc(f && !c.get ? display(f, v, r) : v ?? "");
  }
  function tablePage(page, s) {
    const rows = rowsFor(page, s);
    const e = ent(page.entity);
    const views = page.cards && page.views ? page.views : null;
    const total = page.total ? page.total(rows, app) : "";
    return `${page.intro ? `<p class="dx-intro">${esc(page.intro)}</p>` : ""}<div class="dx-tools"><label class="dx-q">${icon("search")}<input type="search" data-q="${page.id}" value="${esc(s.q)}" placeholder="Search ${esc(e.label.toLowerCase())}" aria-label="Search ${esc(e.label)}"></label>${(page.filters || [])
      .map((f) => `<select data-filter="${page.id}:${f.key}" aria-label="${esc(f.label)}"><option value="all">${esc(f.label)}: all</option>${(typeof f.options === "function" ? f.options(app) : f.options).map((o) => {
        const v = typeof o === "string" ? o : o.value,
          l = typeof o === "string" ? o : o.label;
        return `<option value="${esc(v)}" ${s.filters[f.key] === v ? "selected" : ""}>${esc(l)}</option>`;
      }).join("")}</select>`)
      .join("")}${views ? `<div class="dx-seg">${views.map((v) => `<button type="button" data-x="view:${page.id}:${v}" class="${s.view === v ? "on" : ""}">${icon(v === "cards" ? "grid" : "list")}${v === "cards" ? "Cards" : "Table"}</button>`).join("")}</div>` : ""}<span class="dx-grow"></span>${(page.tools || []).map((t) => `<button type="button" class="dx-btn" data-x="act:${page.id}:${t.id}">${icon(t.icon || "plus")}${esc(t.label)}</button>`).join("")}<button type="button" class="dx-btn" data-x="csv:${page.id}">${icon("download")}CSV</button>${page.importCsv !== false ? `<label class="dx-btn">${icon("upload")}Import<input type="file" accept=".csv,text/csv" data-import="${page.id}" hidden></label>` : ""}${page.add !== false ? `<button type="button" class="dx-btn primary" data-x="new:${page.entity}">${icon("plus")}New ${esc((e.one || "record").toLowerCase())}</button>` : ""}</div>${total ? `<div class="dx-total">${total}</div>` : ""}${
      views && s.view === "cards"
        ? `<div class="dx-cards">${rows.map((r) => `<button type="button" class="dx-tile" data-open="${page.entity}:${r.id}">${page.cards(r, app)}</button>`).join("") || '<div class="dx-empty">Nothing matches.</div>'}</div>`
        : `<div class="dx-table-wrap"><table class="dx-table"><thead><tr>${page.columns
            .map((c) => `<th${c.right ? ' class="r"' : ""}><button type="button" data-x="sort:${page.id}:${c.key}" aria-label="Sort by ${esc(c.label)}">${esc(c.label)}${s.sort === c.key ? (s.dir > 0 ? " ▲" : " ▼") : ""}</button></th>`)
            .join("")}</tr></thead><tbody>${rows
            .slice(0, s.limit || 200)
            .map((r) => `<tr data-open="${page.entity}:${r.id}" tabindex="0">${page.columns.map((c) => `<td${c.right ? ' class="r"' : ""}>${cell(page, c, r)}</td>`).join("")}</tr>`)
            .join("") || `<tr><td colspan="${page.columns.length}" class="dx-empty">Nothing matches. ${page.add !== false ? `<button type="button" class="dx-link" data-x="new:${page.entity}">Add the first one</button>` : ""}</td></tr>`}</tbody></table></div>${rows.length > (s.limit || 200) ? `<button type="button" class="dx-btn" data-x="more:${page.id}">Show more</button>` : ""}`
    }<p class="dx-count">${rows.length} of ${db[page.entity].length} ${esc(e.label.toLowerCase())}</p>`;
  }
  function csvOf(page) {
    const rows = rowsFor(page, ui[page.id]);
    const cols = page.columns;
    const cellText = (c, r) => {
      const v = c.csv ? c.csv(r, app) : c.get ? c.get(r, app) : r[c.key];
      const f = fieldsOf(page.entity, r).find((x) => x.key === c.key);
      let t = String(f && !c.get && f.type === "relation" ? app.label(f.entity, v) : v ?? "");
      if (/^[=+\-@]/.test(t)) t = "'" + t;
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    return "﻿" + [cols.map((c) => c.label).join(","), ...rows.map((r) => cols.map((c) => cellText(c, r)).join(","))].join("\r\n") + "\r\n";
  }
  function parseCsv(text) {
    const rows = [];
    let row = [],
      field = "",
      q = false;
    text = text.replace(/^﻿/, "");
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
        else if (ch === '"') q = false;
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") row.push(field), (field = "");
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some((x) => x !== "")) rows.push(row);
        (row = []), (field = "");
      } else field += ch;
    }
    row.push(field);
    if (row.some((x) => x !== "")) rows.push(row);
    return rows;
  }
  function importCsv(page, text) {
    const [head, ...rows] = parseCsv(text);
    if (!head) return toast("That file is empty.");
    const fields = fieldsOf(page.entity, {});
    const map = head.map((h) => fields.find((f) => f.label.toLowerCase() === h.trim().toLowerCase() || f.key.toLowerCase() === h.trim().toLowerCase()));
    if (!map.some(Boolean)) return toast("No column names match. Use the same headings as Export CSV.");
    let n = 0;
    for (const r of rows.slice(0, 5000)) {
      const rec = {};
      map.forEach((f, i) => {
        if (!f || r[i] === undefined) return;
        let v = r[i].trim().replace(/^'(?=[=+\-@])/, "");
        if (["number", "money", "percent"].includes(f.type)) v = num(v);
        if (f.type === "relation") v = db[f.entity].find((x) => titleOf(f.entity, x).toLowerCase() === v.toLowerCase())?.id || "";
        if (f.type === "bool") v = /^(yes|true|1)$/i.test(v);
        rec[f.key] = v;
      });
      if (Object.keys(rec).length) {
        db[page.entity].push({ id: uid(), created: Date.now(), ...defaults(page.entity), ...rec });
        n++;
      }
    }
    save();
    render();
    toast(`Imported ${n} row${n === 1 ? "" : "s"}.`);
  }

  /* ----- board (drag and drop) ----- */
  function boardPage(page, s) {
    let rows = db[page.entity].slice();
    if (page.where) rows = rows.filter((r) => page.where(r, app, s));
    const cols = typeof page.columns === "function" ? page.columns(app) : page.columns;
    return `${page.intro ? `<p class="dx-intro">${esc(page.intro)}</p>` : ""}${page.toolbar ? `<div class="dx-tools">${page.toolbar(app, s)}</div>` : ""}<div class="dx-board">${cols
      .map((c) => {
        const list = rows.filter((r) => (r[page.field] || cols[0].value) === c.value);
        if (page.order) list.sort((a, b) => page.order(a, b, app));
        const foot = page.total ? page.total(list, app) : "";
        return `<section class="dx-lane ${c.tone || ""}" data-lane="${esc(c.value)}" aria-label="${esc(c.label)}"><header><span class="dx-dot"></span><h2>${esc(c.label)}</h2><em>${list.length}</em></header>${foot ? `<div class="dx-lane-total">${esc(foot)}</div>` : ""}<div class="dx-lane-body">${list
          .map((r) => {
            const i = cols.findIndex((x) => x.value === c.value);
            return `<article class="dx-kard" data-id="${r.id}"><button type="button" class="dx-kard-open" data-open="${page.entity}:${r.id}">${page.card(r, app)}</button><div class="dx-kard-move">${i > 0 ? `<button type="button" data-x="move:${page.id}:${r.id}:${esc(cols[i - 1].value)}" aria-label="Move to ${esc(cols[i - 1].label)}">${icon("left")}</button>` : ""}${i < cols.length - 1 ? `<button type="button" data-x="move:${page.id}:${r.id}:${esc(cols[i + 1].value)}" aria-label="Move to ${esc(cols[i + 1].label)}">${icon("right")}</button>` : ""}</div></article>`;
          })
          .join("")}${page.add !== false && c === cols[0] ? `<button type="button" class="dx-lane-add" data-x="new:${page.entity}:${page.field}=${esc(c.value)}">${icon("plus")}Add</button>` : ""}</div></section>`;
      })
      .join("")}</div>`;
  }
  function moveCard(page, id, value) {
    const r = app.find(page.entity, id);
    if (!r || r[page.field] === value) return;
    const before = r[page.field];
    r[page.field] = value;
    if (page.onMove) page.onMove(r, before, value, app);
    save();
    render(true);
    const col = (typeof page.columns === "function" ? page.columns(app) : page.columns).find((c) => c.value === value);
    toast(`${titleOf(page.entity, r)} → ${col?.label || value}`);
  }
  // Drag and drop with pointer events (mouse and pen): a ghost card follows the pointer, the lane under it lights up,
  // the board scrolls near its edges, and dropping moves the card. Touch uses the arrow buttons on each card, so
  // scrolling a board with a finger keeps working.
  let boardAbort = null,
    justDragged = false;
  function wireBoard(el, page) {
    boardAbort?.abort();
    boardAbort = new AbortController();
    const signal = boardAbort.signal;
    const board = el.querySelector(".dx-board");
    if (!board) return;
    let drag = null;
    const laneAt = (x, y) => document.elementFromPoint(x, y)?.closest?.(".dx-lane") || null;
    board.addEventListener(
      "pointerdown",
      (ev) => {
        const k = ev.target.closest(".dx-kard");
        if (!k || ev.button !== 0 || ev.pointerType === "touch" || ev.target.closest(".dx-kard-move")) return;
        drag = { id: k.dataset.id, k, x: ev.clientX, y: ev.clientY, started: false };
      },
      { signal },
    );
    addEventListener(
      "pointermove",
      (ev) => {
        if (!drag) return;
        if (!drag.started) {
          if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 6) return;
          const r = drag.k.getBoundingClientRect();
          drag.dx = drag.x - r.left;
          drag.dy = drag.y - r.top;
          drag.ghost = drag.k.cloneNode(true);
          drag.ghost.className = "dx-kard dx-ghost";
          drag.ghost.style.width = r.width + "px";
          document.body.append(drag.ghost);
          drag.k.classList.add("drag");
          document.body.classList.add("dx-dragging");
          drag.started = true;
        }
        drag.ghost.style.left = ev.clientX - drag.dx + "px";
        drag.ghost.style.top = ev.clientY - drag.dy + "px";
        const lane = laneAt(ev.clientX, ev.clientY);
        el.querySelectorAll(".dx-lane").forEach((l) => l.classList.toggle("over", l === lane));
        const br = board.getBoundingClientRect();
        if (ev.clientX > br.right - 48) board.scrollLeft += 14;
        else if (ev.clientX < br.left + 48) board.scrollLeft -= 14;
      },
      { signal },
    );
    const end = (ev) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.started) return;
      d.ghost.remove();
      d.k.classList.remove("drag");
      document.body.classList.remove("dx-dragging");
      el.querySelectorAll(".dx-lane").forEach((l) => l.classList.remove("over"));
      justDragged = true;
      setTimeout(() => (justDragged = false), 0);
      const lane = ev.type === "pointerup" ? laneAt(ev.clientX, ev.clientY) : null;
      if (lane) moveCard(page, d.id, lane.dataset.lane);
    };
    addEventListener("pointerup", end, { signal });
    addEventListener("pointercancel", end, { signal });
  }

  /* ----- week calendar ----- */
  function calendarPage(page, s) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(s.week, i));
    const [h0, h1] = page.hours || [9, 21];
    const H = 52;
    const rows = db[page.entity].filter((r) => days.includes(r[page.dateKey]));
    const minutes = (t) => {
      const [h, m] = String(t || "00:00").split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const list = s.view === "list";
    const head = `<div class="dx-tools"><div class="dx-seg"><button type="button" data-x="week:${page.id}:-7">${icon("left")}</button><button type="button" data-x="week:${page.id}:0">This week</button><button type="button" data-x="week:${page.id}:7">${icon("right")}</button></div><b class="dx-range">${fmtShort(days[0])} – ${fmtDate(days[6])}</b><span class="dx-grow"></span><div class="dx-seg"><button type="button" data-x="view:${page.id}:week" class="${!list ? "on" : ""}">${icon("calendar")}Week</button><button type="button" data-x="view:${page.id}:list" class="${list ? "on" : ""}">${icon("list")}List</button></div><button type="button" class="dx-btn primary" data-x="new:${page.entity}">${icon("plus")}New ${esc((ent(page.entity).one || "").toLowerCase())}</button></div>`;
    if (list) {
      const sorted = rows.slice().sort((a, b) => (a[page.dateKey] + a[page.timeKey]).localeCompare(b[page.dateKey] + b[page.timeKey]));
      return head + `<div class="dx-card">${app.list(sorted, (r) => `<li>${app.openLink(page.entity, r, `<span class="dx-when">${esc(dayName(r[page.dateKey]))} ${esc(fmtShort(r[page.dateKey]))}<small>${esc(fmtTime(r[page.timeKey]))}</small></span><span class="dx-li-main">${page.event(r, app)}</span>`)}</li>`, "Nothing booked this week.")}</div>`;
    }
    return (
      head +
      `<div class="dx-cal-wrap"><div class="dx-cal" style="--rows:${h1 - h0};--h:${H}px"><div class="dx-cal-hours"><div class="dx-cal-dh"></div>${Array.from({ length: h1 - h0 }, (_, i) => `<span style="top:${i * H}px">${fmtTime(pad(h0 + i) + ":00")}</span>`).join("")}</div>${days
        .map((d) => {
          const evs = rows.filter((r) => r[page.dateKey] === d);
          return `<div class="dx-cal-day ${d === today() ? "today" : ""}"><div class="dx-cal-dh">${esc(dayName(d))} <b>${esc(d.slice(8))}</b></div><div class="dx-cal-body" style="height:${(h1 - h0) * H}px">${Array.from({ length: h1 - h0 }, (_, i) => `<button type="button" class="dx-slot" style="top:${i * H}px;height:${H}px" data-x="new:${page.entity}:${page.dateKey}=${d}&${page.timeKey}=${pad(h0 + i)}:00" aria-label="New at ${fmtTime(pad(h0 + i) + ":00")} on ${fmtShort(d)}"></button>`).join("")}${evs
            .map((r) => {
              const top = ((minutes(r[page.timeKey]) - h0 * 60) / 60) * H;
              const len = Math.max(26, ((page.duration ? page.duration(r, app) : 30) / 60) * H - 3);
              return `<button type="button" class="dx-ev ${page.tone ? page.tone(r, app) : ""}" style="top:${Math.max(0, top)}px;height:${len}px" data-open="${page.entity}:${r.id}">${page.event(r, app)}</button>`;
            })
            .join("")}${d === today() ? (() => {
            const m = minutes(nowTime()) - h0 * 60;
            return m > 0 && m < (h1 - h0) * 60 ? `<div class="dx-now" style="top:${(m / 60) * H}px"></div>` : "";
          })() : ""}</div></div>`;
        })
        .join("")}</div></div>`
    );
  }

  /* ----- POS register ----- */
  function posPage(page, s) {
    s.ticket ||= [];
    s.cat ||= "All";
    s.disc ||= 0;
    const items = db[page.catalog].filter((r) => (page.available ? page.available(r, app) : true));
    const cats = ["All", ...new Set(items.map((r) => r[page.catKey]).filter(Boolean))];
    const shown = items.filter((r) => s.cat === "All" || r[page.catKey] === s.cat).filter((r) => !s.pq || String(r.name).toLowerCase().includes(s.pq.toLowerCase()));
    const sub = sum(s.ticket, (l) => l.qty * l.price);
    const disc = Math.min(sub, num(s.disc));
    const taxRate = num(app.setting(page.taxKey || "tax"));
    const tax = Math.round(((sub - disc) * taxRate) / 100);
    const tipAmt = num(s.tip || 0);
    const total = sub - disc + tax + tipAmt;
    return `<div class="dx-pos"><section class="dx-pos-menu"><div class="dx-tools"><label class="dx-q">${icon("search")}<input type="search" data-pq="${page.id}" value="${esc(s.pq || "")}" placeholder="Find an item" aria-label="Find an item"></label></div><div class="dx-chips">${cats.map((c) => `<button type="button" data-x="cat:${page.id}:${esc(c)}" class="${s.cat === c ? "on" : ""}">${esc(c)}</button>`).join("")}</div><div class="dx-pos-grid">${shown
      .map((r) => `<button type="button" class="dx-pos-item" data-x="tadd:${page.id}:${r.id}"><b>${esc(r.name)}</b><span>${esc(app.money(r[page.priceKey]))}</span>${page.itemNote ? `<small>${esc(page.itemNote(r, app))}</small>` : ""}</button>`)
      .join("") || '<div class="dx-empty">No items. Add them first.</div>'}</div></section><section class="dx-pos-ticket dx-card"><div class="dx-card-h"><h2>${esc(page.ticketTitle || "Ticket")}</h2>${s.ticket.length ? `<button type="button" class="dx-link" data-x="tclear:${page.id}">Clear</button>` : ""}</div>${page.ticketFields ? page.ticketFields(app, s) : ""}<ul class="dx-tlines">${s.ticket
      .map((l, i) => `<li><span>${esc(l.name)}<small>${esc(app.money(l.price))}</small></span><span class="dx-qty"><button type="button" data-x="tqty:${page.id}:${i}:-1" aria-label="One less">−</button><b>${l.qty}</b><button type="button" data-x="tqty:${page.id}:${i}:1" aria-label="One more">+</button></span><b>${esc(app.money(l.qty * l.price))}</b></li>`)
      .join("") || '<li class="dx-empty">Tap items to add them.</li>'}</ul><div class="dx-tsum"><label>Discount (${esc(cur)})<input type="number" min="0" step="1" data-tdisc="${page.id}" value="${s.disc || ""}"></label>${page.tip ? `<label>Tip (${esc(cur)})<input type="number" min="0" step="1" data-ttip="${page.id}" value="${s.tip || ""}"></label>` : ""}<div><span>Subtotal</span><b>${esc(app.money(sub))}</b></div>${disc ? `<div><span>Discount</span><b>− ${esc(app.money(disc))}</b></div>` : ""}${taxRate ? `<div><span>${esc(page.taxLabel || "Tax")} ${taxRate}%</span><b>${esc(app.money(tax))}</b></div>` : ""}${tipAmt ? `<div><span>Tip</span><b>${esc(app.money(tipAmt))}</b></div>` : ""}<div class="dx-tgrand"><span>Total</span><b>${esc(app.money(total))}</b></div></div><div class="dx-pay">${(page.pay || ["Cash", "Card", "JazzCash / Easypaisa"])
      .map((m) => `<button type="button" class="dx-btn ${m === "Cash" ? "primary" : ""}" data-x="tpay:${page.id}:${esc(m)}" ${s.ticket.length ? "" : "disabled"}>${esc(m)}</button>`)
      .join("")}</div>${page.park ? `<button type="button" class="dx-btn" data-x="tpark:${page.id}" ${s.ticket.length ? "" : "disabled"}>${esc(page.park)}</button>` : ""}</section></div>`;
  }
  function posPay(page, s, method) {
    const sub = sum(s.ticket, (l) => l.qty * l.price);
    const disc = Math.min(sub, num(s.disc));
    const taxRate = num(app.setting(page.taxKey || "tax"));
    const tax = Math.round(((sub - disc) * taxRate) / 100);
    const tipAmt = num(s.tip || 0);
    let received = null;
    const total = sub - disc + tax + tipAmt;
    if (method === "Cash") {
      const ans = prompt(`Total ${app.money(total)}. Cash received (${cur}):`, String(total));
      if (ans === null) return;
      received = num(ans);
      if (received < total) return toast("Cash received is less than the total.");
    }
    const sale = page.complete(app, s, { lines: s.ticket.map((l) => ({ ...l })), sub, disc, tax, tip: tipAmt, total, method, received, change: received === null ? 0 : received - total, taxRate });
    if (sale === false) return; // the app said what is missing; keep the ticket
    s.ticket = [];
    s.disc = 0;
    s.tip = 0;
    save();
    render(true);
    if (sale && page.receipt) {
      toast(received !== null && received > total ? `Paid. Give back ${app.money(received - total)}.` : "Paid.");
      if (confirm("Print the receipt?")) app.print(page.receiptTitle || "Receipt", page.receipt(sale, app));
    }
  }
  app.receiptLines = (sale) =>
    `<table class="dx-doc-table"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>${sale.lines
      .map((l) => `<tr><td>${esc(l.name)}</td><td class="r">${l.qty}</td><td class="r">${esc(app.money(l.price))}</td><td class="r">${esc(app.money(l.qty * l.price))}</td></tr>`)
      .join("")}</tbody></table><div class="dx-doc-sum"><div><span>Subtotal</span><b>${esc(app.money(sale.sub))}</b></div>${sale.disc ? `<div><span>Discount</span><b>− ${esc(app.money(sale.disc))}</b></div>` : ""}${sale.tax ? `<div><span>Tax ${sale.taxRate}%</span><b>${esc(app.money(sale.tax))}</b></div>` : ""}${sale.tip ? `<div><span>Tip</span><b>${esc(app.money(sale.tip))}</b></div>` : ""}<div class="dx-doc-grand"><span>Total</span><b>${esc(app.money(sale.total))}</b></div><div><span>Paid by</span><b>${esc(sale.method)}${sale.received !== null && sale.received !== undefined ? ` · received ${esc(app.money(sale.received))}, change ${esc(app.money(sale.change))}` : ""}</b></div></div>`;

  /* ----- settings and data ----- */
  function settingsPage(page) {
    const s = cfg.settings || [];
    return `<div class="dx-grid"><section class="dx-card"><div class="dx-card-h"><h2>Business details</h2></div><form class="dx-form" data-settings="1">${s.map((f) => fieldHtml(f, db.settings[f.key], db.settings)).join("")}<div class="dx-form-foot"><button type="submit" class="dx-btn primary">${icon("check")}Save settings</button></div></form></section><section class="dx-card"><div class="dx-card-h"><h2>Your data</h2></div><p class="dx-intro">Everything is saved in this browser on this device. Nothing is uploaded. Download a backup now and then, and to move to another computer import it there.</p><div class="dx-actions"><button type="button" class="dx-btn" data-x="backup">${icon("download")}Download backup (JSON)</button><label class="dx-btn">${icon("upload")}Restore backup<input type="file" accept=".json,application/json" data-restore="1" hidden></label></div><div class="dx-actions"><button type="button" class="dx-btn" data-x="demo">Load sample data</button><button type="button" class="dx-btn danger" data-x="empty">Delete all data</button></div>${page.extra ? page.extra(app) : ""}</section></div>`;
  }
  function dataMenu() {
    openDrawer(`<div class="dx-dh"><h2 id="dxDrawerTitle">Data and backup</h2><button type="button" class="dx-ib" data-x="close" aria-label="Close">${icon("close")}</button></div><div class="dx-db"><p class="dx-intro">Your ${esc(cfg.title.toLowerCase())} is saved in this browser. Nothing is uploaded.</p><div class="dx-actions col"><button type="button" class="dx-btn" data-x="backup">${icon("download")}Download backup (JSON)</button><label class="dx-btn">${icon("upload")}Restore a backup<input type="file" accept=".json,application/json" data-restore="1" hidden></label><button type="button" class="dx-btn" data-x="demo">Load sample data</button><button type="button" class="dx-btn danger" data-x="empty">Delete all data and start empty</button></div></div>`);
  }

  /* ----- record drawer and forms ----- */
  function defaults(entity) {
    const out = {};
    for (const f of fieldsOf(entity, {})) {
      if (f.default === undefined) continue;
      out[f.key] = typeof f.default === "function" ? f.default(app) : f.default;
    }
    return out;
  }
  function fieldHtml(f, v, r) {
    const id = "f_" + f.key;
    const req = f.required ? "required" : "";
    const val = v ?? "";
    const label = `<span>${esc(f.label)}${f.required ? " *" : ""}</span>`;
    const hint = f.hint ? `<small>${esc(f.hint)}</small>` : "";
    if (f.show && !f.show(r || {}, app)) return "";
    switch (f.type) {
      case "textarea":
        return `<label class="dx-f wide" for="${id}">${label}<textarea id="${id}" name="${f.key}" rows="3" ${req}>${esc(val)}</textarea>${hint}</label>`;
      case "select":
        return `<label class="dx-f" for="${id}">${label}<select id="${id}" name="${f.key}" ${req}>${f.required ? "" : '<option value=""></option>'}${optionsOf(f, r)
          .map((o) => `<option value="${esc(o.value)}" ${String(val) === String(o.value) ? "selected" : ""}>${esc(o.label)}</option>`)
          .join("")}</select>${hint}</label>`;
      case "relation":
        return `<label class="dx-f" for="${id}">${label}<select id="${id}" name="${f.key}" ${req}><option value=""></option>${db[f.entity]
          .filter((x) => !f.filter || f.filter(x, app))
          .slice()
          .sort((a, b) => titleOf(f.entity, a).localeCompare(titleOf(f.entity, b)))
          .map((x) => `<option value="${x.id}" ${val === x.id ? "selected" : ""}>${esc(titleOf(f.entity, x))}</option>`)
          .join("")}</select>${hint}</label>`;
      case "bool":
        return `<label class="dx-f dx-check" for="${id}"><input type="checkbox" id="${id}" name="${f.key}" ${val ? "checked" : ""}> ${esc(f.label)}</label>`;
      case "lines": {
        const lines = Array.isArray(val) && val.length ? val : [{ name: "", qty: 1, price: 0 }];
        const catalog = f.catalog ? db[f.catalog] : [];
        return `<div class="dx-f wide"><span>${esc(f.label)}</span><table class="dx-lines" data-lines="${f.key}"><thead><tr><th>${esc(f.itemLabel || "Item")}</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th><th></th></tr></thead><tbody>${lines
          .map(
            (l) =>
              `<tr><td><input name="l_name" value="${esc(l.name)}" list="${id}_list" aria-label="Item" required></td><td><input name="l_qty" type="number" min="0" step="any" value="${esc(l.qty)}" aria-label="Quantity"></td><td><input name="l_price" type="number" min="0" step="any" value="${esc(l.price)}" aria-label="Price"></td><td class="r" data-amt>${esc(app.money(num(l.qty) * num(l.price)))}</td><td><button type="button" class="dx-ib" data-x="lrem" aria-label="Remove line">${icon("trash")}</button></td></tr>`,
          )
          .join("")}</tbody></table>${catalog.length ? `<datalist id="${id}_list">${catalog.map((c) => `<option value="${esc(c.name)}">${esc(app.money(c[f.priceKey || "price"]))}</option>`).join("")}</datalist>` : ""}<div class="dx-lines-foot"><button type="button" class="dx-btn" data-x="ladd:${f.key}">${icon("plus")}Add a line</button><b data-lines-total="${f.key}">${esc(app.money(app.linesTotal(lines)))}</b></div></div>`;
      }
      default: {
        const type = { number: "number", money: "number", percent: "number", date: "date", time: "time", phone: "tel", email: "email" }[f.type] || "text";
        return `<label class="dx-f" for="${id}">${label}<input id="${id}" name="${f.key}" type="${type}" value="${esc(val)}" ${type === "number" ? `step="${f.step || "any"}" min="${f.min ?? 0}"` : ""} ${f.type === "phone" ? 'placeholder="03xx xxxxxxx" inputmode="tel"' : ""} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} ${req}>${hint}</label>`;
      }
    }
  }
  function readForm(form, fields) {
    const out = {};
    for (const f of fields) {
      if (f.type === "lines") {
        out[f.key] = [...form.querySelectorAll(`[data-lines="${f.key}"] tbody tr`)]
          .map((tr) => ({ name: tr.querySelector('[name="l_name"]').value.trim(), qty: num(tr.querySelector('[name="l_qty"]').value), price: num(tr.querySelector('[name="l_price"]').value) }))
          .filter((l) => l.name);
        continue;
      }
      const el = form.elements[f.key];
      if (!el) continue;
      if (f.type === "bool") out[f.key] = el.checked;
      else if (["number", "money", "percent"].includes(f.type)) out[f.key] = el.value === "" ? "" : num(el.value);
      else out[f.key] = el.value.trim();
    }
    return out;
  }
  function openDrawer(html) {
    const wrap = document.getElementById("dxDrawerWrap");
    document.getElementById("dxDrawer").innerHTML = html;
    wrap.hidden = false;
    setTimeout(() => document.getElementById("dxDrawer").querySelector("input:not([type=hidden]),select,textarea,button")?.focus(), 30);
  }
  function closeDrawer() {
    document.getElementById("dxDrawerWrap").hidden = true;
  }
  app.closeDrawer = closeDrawer;
  app.openDrawer = openDrawer;
  let drawer = null; // {entity, id, edit}
  function openRecord(entity, id, edit = false, preset = {}) {
    const e = ent(entity);
    const r = id ? app.find(entity, id) : { ...defaults(entity), ...preset };
    if (!r) return toast("That record no longer exists.");
    drawer = { entity, id, edit: edit || !id };
    if (!drawer.edit) {
      const fields = fieldsOf(entity, r).filter((f) => !f.hideInView);
      const acts = (e.actions || []).filter((a) => !a.when || a.when(r, app));
      openDrawer(`<div class="dx-dh"><div><small>${esc(e.one || "")}</small><h2 id="dxDrawerTitle">${esc(titleOf(entity, r))}</h2>${e.badge ? e.badge(r, app) : ""}</div><button type="button" class="dx-ib" data-x="close" aria-label="Close">${icon("close")}</button></div><div class="dx-db">${
        acts.length ? `<div class="dx-actions">${acts.map((a, i) => `<button type="button" class="dx-btn ${a.primary ? "primary" : ""}" data-x="ract:${i}">${icon(a.icon || "check")}${esc(a.label)}</button>`).join("")}</div>` : ""
      }<dl class="dx-dl">${fields
        .map((f) => {
          const v = r[f.key];
          if (v === undefined || v === "" || v === null || (Array.isArray(v) && !v.length)) return "";
          if (f.type === "lines") return `<div class="wide"><dt>${esc(f.label)}</dt><dd>${app.receiptLines({ lines: v, sub: app.linesTotal(v), total: app.linesTotal(v), method: "" }).replace(/<div><span>Paid by.*?<\/div>/, "")}</dd></div>`;
          return `<div class="${f.type === "textarea" ? "wide" : ""}"><dt>${esc(f.label)}</dt><dd>${esc(display(f, v, r))}</dd></div>`;
        })
        .join("")}</dl>${e.related ? e.related(r, app) : ""}</div><div class="dx-df"><button type="button" class="dx-btn danger" data-x="del">${icon("trash")}Delete</button><span class="dx-grow"></span><button type="button" class="dx-btn primary" data-x="edit">${icon("edit")}Edit</button></div>`);
      return;
    }
    const fields = fieldsOf(entity, r);
    openDrawer(`<form class="dx-form-drawer" data-entity="${entity}"><div class="dx-dh"><div><small>${esc(e.one || "")}</small><h2 id="dxDrawerTitle">${id ? "Edit " + esc(titleOf(entity, r)) : "New " + esc((e.one || "record").toLowerCase())}</h2></div><button type="button" class="dx-ib" data-x="close" aria-label="Close">${icon("close")}</button></div><div class="dx-db"><div class="dx-form">${fields.map((f) => fieldHtml(f, r[f.key], r)).join("")}</div></div><div class="dx-df">${id ? `<button type="button" class="dx-btn" data-x="dview">Cancel</button>` : `<button type="button" class="dx-btn" data-x="close">Cancel</button>`}<span class="dx-grow"></span><button type="submit" class="dx-btn primary">${icon("check")}Save</button></div></form>`);
    const form = document.querySelector(".dx-form-drawer");
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const data = readForm(form, fields);
      const before = id ? { ...app.find(entity, id) } : null;
      let row = id ? { ...before, ...data } : { ...r, ...data };
      if (e.beforeSave) {
        const msg = e.beforeSave(row, before, app);
        if (typeof msg === "string") return toast(msg);
      }
      row = app.upsert(entity, row);
      if (e.afterSave) e.afterSave(row, before, app);
      save();
      drawer = { entity, id: row.id, edit: false };
      render(true);
      openRecord(entity, row.id);
      toast(`${titleOf(entity, row)} saved.`);
    };
  }
  app.open = openRecord;

  /* ----- events ----- */
  function onClick(ev) {
    if (justDragged) return;
    const opener = ev.target.closest("[data-open]");
    const x = ev.target.closest("[data-x]");
    if (x && (!opener || opener.contains(x))) return act(x.dataset.x, x, ev);
    if (opener) {
      const [entity, id] = opener.dataset.open.split(":");
      document.getElementById("dxResults").hidden = true;
      return openRecord(entity, id);
    }
  }
  function act(code, el, ev) {
    const [a, p, b, c] = code.split(":");
    const page = cfg.pages.find((x) => x.id === p);
    const s = page ? ui[page.id] : null;
    switch (a) {
      case "close":
        return closeDrawer();
      case "new": {
        const preset = {};
        if (b) for (const kv of code.split(":").slice(2).join(":").split("&")) {
          const [k, v] = kv.split("=");
          preset[k] = v;
        }
        return openRecord(p, "", true, preset);
      }
      case "edit":
        return openRecord(drawer.entity, drawer.id, true);
      case "dview":
        return openRecord(drawer.entity, drawer.id);
      case "del": {
        const r = app.find(drawer.entity, drawer.id);
        if (!r || !confirm(`Delete ${titleOf(drawer.entity, r)}? This cannot be undone.`)) return;
        const e = ent(drawer.entity);
        if (e.beforeDelete) e.beforeDelete(r, app);
        app.remove(drawer.entity, drawer.id);
        closeDrawer();
        render(true);
        return toast("Deleted.");
      }
      case "ract": {
        const r = app.find(drawer.entity, drawer.id);
        const acts = (ent(drawer.entity).actions || []).filter((x) => !x.when || x.when(r, app));
        const res = acts[Number(p)]?.run(r, app);
        save();
        render(true);
        if (res !== "keep" && app.find(drawer.entity, drawer.id) && !document.getElementById("dxDrawerWrap").hidden) openRecord(drawer.entity, drawer.id);
        return;
      }
      case "sort":
        if (s.sort === b) s.dir = -s.dir;
        else (s.sort = b), (s.dir = 1);
        return render(true);
      case "view":
        s.view = b;
        return render(true);
      case "more":
        s.limit = (s.limit || 200) + 200;
        return render(true);
      case "csv":
        app.download(`${cfg.id}-${page.id}-${today()}.csv`, csvOf(page), "text/csv;charset=utf-8");
        return toast("CSV downloaded. It opens in Excel.");
      case "act": {
        const all = [...(page.actions || []), ...(page.tools || [])];
        return all.find((t) => t.id === b)?.run(app, s, el);
      }
      case "move":
        return moveCard(page, b, code.split(":").slice(3).join(":"));
      case "week":
        s.week = Number(b) === 0 ? weekStart(today()) : addDays(s.week, Number(b));
        return render(true);
      case "cat":
        s.cat = code.split(":").slice(2).join(":");
        return render(true);
      case "tadd": {
        const item = app.find(page.catalog, b);
        const line = s.ticket.find((l) => l.ref === item.id);
        if (line) line.qty++;
        else s.ticket.push({ ref: item.id, name: item.name, price: num(item[page.priceKey]), qty: 1 });
        return render(true);
      }
      case "tqty": {
        const line = s.ticket[Number(b)];
        line.qty += Number(c);
        if (line.qty <= 0) s.ticket.splice(Number(b), 1);
        return render(true);
      }
      case "tclear":
        s.ticket = [];
        return render(true);
      case "tpay":
        return posPay(page, s, code.split(":").slice(2).join(":"));
      case "tpark":
        return page.onPark(app, s);
      case "ladd": {
        const tb = document.querySelector(`[data-lines="${p}"] tbody`);
        const tr = tb.rows[0].cloneNode(true);
        tr.querySelectorAll("input").forEach((i) => (i.value = i.name === "l_qty" ? "1" : ""));
        tb.append(tr);
        tr.querySelector("input").focus();
        return recalcLines();
      }
      case "lrem": {
        const tr = el.closest("tr");
        if (tr.parentElement.rows.length > 1) tr.remove();
        else tr.querySelectorAll("input").forEach((i) => (i.value = i.name === "l_qty" ? "1" : ""));
        return recalcLines();
      }
      case "backup":
        app.download(`${cfg.id}-backup-${today()}.json`, JSON.stringify({ app: "AsaanDesk " + cfg.title, saved: new Date().toISOString(), data: db }, null, 1), "application/json");
        return toast("Backup downloaded. Keep it private: it holds your customers' details.");
      case "demo":
        if (!confirm("Replace everything with sample data?")) return;
        db = demo();
        save();
        closeDrawer();
        render();
        return toast("Sample data loaded.");
      case "empty":
        if (!confirm("Delete all data in this dashboard and start empty? Download a backup first if you may need it.")) return;
        {
          const settings = db._demo ? blank().settings : db.settings;
          db = blank();
          db.settings = settings;
        }
        save();
        closeDrawer();
        render();
        return toast("Started empty. Your business details were kept.");
      default:
        if (cfg.onAction) return cfg.onAction(code, app, el, ev);
    }
  }
  function recalcLines() {
    document.querySelectorAll("[data-lines]").forEach((t) => {
      let total = 0;
      t.querySelectorAll("tbody tr").forEach((tr) => {
        const amt = num(tr.querySelector('[name="l_qty"]').value) * num(tr.querySelector('[name="l_price"]').value);
        total += amt;
        tr.querySelector("[data-amt]").textContent = app.money(amt);
      });
      const out = document.querySelector(`[data-lines-total="${t.dataset.lines}"]`);
      if (out) out.textContent = app.money(total);
    });
  }
  function onDrawerInput(ev) {
    const t = ev.target;
    if (t.name === "l_name" && ev.type === "change") {
      // Picking a catalog item fills its price.
      const form = t.closest("form");
      const f = fieldsOf(form?.dataset.entity, {}).find((x) => x.type === "lines" && x.catalog);
      const item = f && db[f.catalog].find((c) => c.name === t.value);
      if (item) t.closest("tr").querySelector('[name="l_price"]').value = num(item[f.priceKey || "price"]);
    }
    if (/^l_/.test(t.name)) recalcLines();
  }
  function onChange(ev) {
    const t = ev.target;
    if (t.dataset.filter) {
      const [p, k] = t.dataset.filter.split(":");
      ui[p].filters[k] = t.value;
      return render(true);
    }
    if (t.dataset.import) {
      const file = t.files[0];
      if (file) file.text().then((text) => importCsv(cfg.pages.find((x) => x.id === t.dataset.import), text));
      return;
    }
    if (t.dataset.restore) return restore(t);
    if (t.dataset.tdisc) {
      ui[t.dataset.tdisc].disc = num(t.value);
      return render(true);
    }
    if (t.dataset.ttip) {
      ui[t.dataset.ttip].tip = num(t.value);
      return render(true);
    }
    if (cfg.onChange) cfg.onChange(ev, app, ui);
  }
  let qTimer;
  function onInput(ev) {
    const t = ev.target;
    if (t.dataset.q || t.dataset.pq) {
      clearTimeout(qTimer);
      const id = t.dataset.q || t.dataset.pq;
      qTimer = setTimeout(() => {
        if (t.dataset.q) ui[id].q = t.value;
        else ui[id].pq = t.value;
        const at = t.selectionStart;
        render(true);
        const again = document.querySelector(`[data-${t.dataset.q ? "q" : "pq"}="${id}"]`);
        again?.focus();
        again?.setSelectionRange(at, at);
      }, 200);
    }
  }
  root.addEventListener("submit", (ev) => {
    if (!ev.target.dataset.settings) return;
    ev.preventDefault();
    Object.assign(db.settings, readForm(ev.target, cfg.settings || []));
    db._demo = false;
    save();
    render(true);
    toast("Settings saved.");
  });
  function restore(input) {
    const file = input.files[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = JSON.parse(text).data;
        if (!data || typeof data !== "object" || !Object.keys(cfg.entities).every((k) => Array.isArray(data[k] || []))) throw Error("bad");
        if (!confirm("Replace everything here with this backup?")) return;
        db = { ...blank(), ...data };
        save();
        closeDrawer();
        render();
        toast("Backup restored.");
      } catch {
        toast("That file is not a backup from this dashboard.");
      }
    });
  }

  /* ----- start ----- */
  load();
  shell();
  parse();
  render();
  app.render = render;
  app.ui = ui;
  window.__dash = app; // for the tests and the console
  return app;
}

/* ---------- sample data helpers ---------- */

const FIRST_M = ["Ali", "Ahmed", "Usman", "Bilal", "Hamza", "Hassan", "Imran", "Faisal", "Kashif", "Zeeshan", "Omar", "Saad", "Asad", "Tariq", "Waqas", "Junaid", "Adeel", "Fahad", "Shoaib", "Naveed"];
const FIRST_F = ["Ayesha", "Fatima", "Sana", "Hira", "Maryam", "Zainab", "Amna", "Sadia", "Nida", "Rabia", "Mahnoor", "Iqra", "Saima", "Bushra", "Kiran", "Alina", "Mehwish", "Areeba", "Hafsa", "Noor"];
const LAST = ["Khan", "Ahmed", "Malik", "Butt", "Chaudhry", "Sheikh", "Qureshi", "Siddiqui", "Raza", "Hussain", "Iqbal", "Mirza", "Abbasi", "Javed", "Aslam", "Akhtar", "Rana", "Shah", "Baig", "Farooq"];
function demoHelpers() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const person = (sex = rand() < 0.5 ? "m" : "f") => `${pick(sex === "m" ? FIRST_M : FIRST_F)} ${pick(LAST)}`;
  const phone = () => `03${int(0, 4)}${int(0, 9)} ${int(1000000, 9999999)}`;
  const day = (offset) => addDays(today(), offset);
  const time = (h0 = 9, h1 = 20, step = 30) => {
    const m = int(h0 * 60, h1 * 60) ;
    const r = Math.round(m / step) * step;
    return `${pad(Math.floor(r / 60))}:${pad(r % 60)}`;
  };
  return { rand, pick, int, person, phone, day, time, uid, today, addDays, thisMonth, addMonths };
}
