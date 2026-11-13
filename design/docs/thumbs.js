// AsaanDesk Docs template thumbnails: a finished-looking mini page in Canva's Docs pattern (photo header with big bold
// title, kicker and accent bar; KPI cards, styled tables with a coloured header row and zebra rows, charts, checklists,
// two-column sections, letters, résumés) drawn as one self-contained 320 × 200 SVG string. Pure (no DOM), own artwork.
// spec = { P: palette {dark, light, mid, cream, ink, font?}, T: content theme, style, body, title, sub, kicker, photo
//          (thumb URL or ""), serif, barText, layout, table: "money" | "schedule" | "metrics" | "people" }
const W = 320;
// Bottom limit of the body being drawn (200 on a landscape card; each stacked section sets its own on a portrait page).
let BOT = 196;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const SANS = "Arial, Helvetica, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";
// Rough advance width per character (em) for wrapping without a DOM.
const em = (bold, serif) => (serif ? (bold ? 0.56 : 0.5) : bold ? 0.6 : 0.53);
/** Words → lines no wider than maxW at this size. */
export function wrapText(text, size, maxW, bold = false, serif = false) {
  const cw = size * em(bold, serif), out = [];
  let line = "";
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const t = line ? line + " " + w : w;
    if (t.length * cw > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
/** Largest size (maxS → minS) at which the text fits in maxLines; the last line is cut with … if it still does not. */
function fit(text, maxW, maxS, minS, maxLines, bold = true, serif = false) {
  for (let s = maxS; s >= minS; s -= 1) { const l = wrapText(text, s, maxW, bold, serif); if (l.length <= maxLines) return { size: s, lines: l }; }
  const l = wrapText(text, minS, maxW, bold, serif).slice(0, maxLines);
  const cw = minS * em(bold, serif), max = Math.floor(maxW / cw);
  if (l.length && l[l.length - 1].length > max - 1) l[l.length - 1] = l[l.length - 1].slice(0, max - 1);
  if (l.length) l[l.length - 1] = l[l.length - 1].replace(/[\s,.;:·-]+$/, "") + "…";
  return { size: minS, lines: l };
}
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).replace(/\s+$/, "") + "…" : String(s));
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${o.serif ? SERIF : SANS}" font-size="${o.size || 7}"${o.bold ? ' font-weight="700"' : ""}${o.italic ? ' font-style="italic"' : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.op ? ` opacity="${o.op}"` : ""} fill="${o.fill || "#1f2937"}">${esc(s)}</text>`;
/** A block of tiny body text (real words, wrapped). */
function para(x, y, w, text, o = {}) {
  const size = o.size || 5.6, lh = o.lh || size * 1.5;
  const lines = wrapText(text, size, w).slice(0, o.max || 4);
  return lines.map((l, i) => txt(x, y + i * lh, l, { size, fill: o.fill || "#5b6475" })).join("");
}
const title = (x, y, f, o) => f.lines.map((l, i) => txt(x, y + i * f.size * 1.08, l, { size: f.size, bold: !o.light, serif: o.serif, fill: o.fill, anchor: o.anchor, ls: o.serif ? 0 : -0.3 })).join("");
/** Kicker, title, subtitle and accent bar stacked top-down inside a header of height H (sizes shrink until it fits). */
function stack(sp, x, maxW, H, o = {}) {
  const serif = !!sp.serif, kick = sp.kicker ? clip(sp.kicker.toUpperCase(), o.kickMax || 34) : "";
  const top = o.top ?? 14, sub = sp.sub ? clip(sp.sub, o.subMax || 46) : "";
  for (let max = o.max || 26; max >= 12; max -= 1) {
    const f = fit(sp.title, maxW, max, Math.min(max, o.min || 14), 2, true, serif);
    let y = top + (kick ? 9 : 0);
    const b1 = y + f.size * 0.86, bl = b1 + (f.lines.length - 1) * f.size * 1.08;
    const sy = bl + (sub ? 13 : 0), barY = sy + 7;
    if (barY + 3 > H - 8 && max > 12) continue;
    const off = o.center ? Math.max(0, (H - 6 - (barY + 3)) / 2) : Math.max(0, Math.min(10, (H - 10 - (barY + 3)) / 2));
    let s = "";
    if (kick) s += txt(x, top + 6 + off, kick, { size: 6.3, bold: true, fill: o.kickFill, ls: 1.3, anchor: o.anchor });
    s += title(x, b1 + off, f, { serif, fill: o.fill, anchor: o.anchor });
    if (sub) s += txt(x, sy + off, sub, { size: 7.4, fill: o.subFill || o.fill, op: o.subOp, anchor: o.anchor });
    s += `<rect x="${o.anchor === "middle" ? x - 14 : x}" y="${barY + off}" width="28" height="3" rx="1.5" fill="${o.barFill}"/>`;
    return s;
  }
  return "";
}
const heading = (x, y, s, P, o = {}) => `<rect x="${x}" y="${y - 8.5}" width="${Math.round(String(s).length * (o.size || 8) * 0.6 + 16)}" height="12" rx="6" fill="${P.light}"/><circle cx="${x + 6}" cy="${y - 2.5}" r="2" fill="${P.mid}"/>` + txt(x + 11, y, s, { size: o.size || 7.6, bold: true, fill: P.dark, serif: o.serif });
const tick = (x, y, c) => `<path d="M${x + 1.6} ${y + 3.8} l1.7 1.8 l3.2 -3.6" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
const photoImg = (u, href, x, y, w, h, rx = 0) => !href ? "" : (rx ? `<clipPath id="${u}c${x}${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath><image href="${esc(href)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${u}c${x}${y})"/>` : `<image href="${esc(href)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`);
const lg = (id, stops, x2 = 1, y2 = 0) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;

/* ---------------- headers ---------------- */
// Each returns [svg, bodyTop]. All text sits on solid colour or a strong overlay so it stays readable.
function headerPhoto(sp, u, mode) {
  const { P } = sp, H = 116;
  let s = "";
  if (sp.photo) s += photoImg(u, sp.photo, 0, 0, W, H); else s += `<rect width="${W}" height="${H}" fill="${P.mid}"/>`;
  if (mode === "tint") {
    s += `<rect width="${W}" height="${H}" fill="${P.dark}" opacity=".66"/>`;
    return [s + stack(sp, 160, 250, H, { anchor: "middle", center: true, max: 25, fill: "#ffffff", kickFill: P.light, subOp: 0.9, barFill: P.light, kickMax: 40, subMax: 52 }), H];
  }
  if (mode === "split") s += `<defs>${lg(u + "sp", [[0, P.dark, 1], [1, P.dark, 0]])}</defs><rect width="168" height="${H}" fill="${P.dark}"/><rect x="167" width="70" height="${H}" fill="url(#${u}sp)"/>`;
  else s += `<defs>${lg(u + "sh", [[0, P.dark, 0.95], [0.5, P.dark, 0.8], [1, P.dark, 0.1]])}</defs><rect width="${W}" height="${H}" fill="url(#${u}sh)"/>`;
  const maxW = mode === "split" ? 142 : 196;
  return [s + stack(sp, 18, maxW, H, { max: 26, fill: "#ffffff", kickFill: P.light, subOp: 0.9, barFill: P.light, subMax: mode === "split" ? 30 : 40 }), H];
}
function headerSoft(sp, u) {
  const { P } = sp, H = 112;
  let s = `<rect width="${W}" height="${H}" fill="${P.light}" opacity=".55"/>`;
  if (sp.photo) s += photoImg(u, sp.photo, 150, 0, 170, H);
  s += `<defs>${lg(u + "sf", [[0, "#ffffff", 1], [1, "#ffffff", 0]])}</defs><rect x="150" width="60" height="${H}" fill="url(#${u}sf)"/><rect width="152" height="${H}" fill="#ffffff"/>`;
  s += `<rect width="${W}" height="4" fill="${P.mid}"/>`;
  return [s + stack(sp, 18, 138, H, { top: 16, max: 24, fill: P.ink, kickFill: P.mid, subFill: "#475569", barFill: P.mid, kickMax: 28, subMax: 30 }), H];
}
function headerBand(sp, u, decoSvg) {
  const { P } = sp, H = 92;
  let s = `<defs>${lg(u + "bd", [[0, P.dark, 1], [1, P.mid, 1]], 1, 1)}</defs><rect width="${W}" height="${H}" fill="url(#${u}bd)"/>`;
  s += `<circle cx="292" cy="10" r="44" fill="#ffffff" opacity=".07"/><circle cx="262" cy="96" r="34" fill="#ffffff" opacity=".06"/>`;
  const d = sp.deco && decoSvg ? decoSvg(sp.deco, P.light, P.cream) : "";
  if (d) s += `<svg x="218" y="12" width="88" height="${H - 24}" viewBox="${(d.match(/viewBox="([^"]+)"/) || [])[1] || "0 0 100 100"}" preserveAspectRatio="xMaxYMid meet">${d.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>`;
  return [s + stack(sp, 18, 190, H, { top: 12, max: 24, fill: "#ffffff", kickFill: P.light, subOp: 0.88, barFill: P.light, subMax: 40 }), H];
}
function headerAvatar(sp, u, decoSvg) {
  const { P } = sp, H = 88;
  let s = `<defs>${lg(u + "av", [[0, P.dark, 1], [1, P.mid, 1]], 1, 0)}</defs><rect width="${W}" height="${H}" fill="url(#${u}av)"/><circle cx="300" cy="16" r="40" fill="#ffffff" opacity=".07"/>`;
  s += `<circle cx="52" cy="44" r="31" fill="${P.light}"/><circle cx="52" cy="44" r="27" fill="${P.cream}"/>`;
  const d = decoSvg ? decoSvg("avatar", P.mid, P.light) : "";
  if (d) s += `<clipPath id="${u}ac"><circle cx="52" cy="44" r="27"/></clipPath><svg x="25" y="17" width="54" height="54" viewBox="${(d.match(/viewBox="([^"]+)"/) || [])[1] || "0 0 100 100"}" clip-path="url(#${u}ac)">${d.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>`;
  const f = fit(sp.title, 200, 22, 13, 1, true, !!sp.serif);
  s += title(98, 42, f, { fill: "#ffffff", serif: !!sp.serif });
  if (sp.sub) s += txt(98, 56, clip(sp.sub.toUpperCase(), 36), { size: 6.8, bold: true, fill: P.light, ls: 1.2 });
  const T = sp.T;
  if (T) s += txt(98, 72, clip(`${T.email}  ·  ${T.city}`, 50), { size: 5.8, fill: "#ffffff", op: 0.85 });
  return [s, H];
}
function headerBar(sp, u) {
  const { P } = sp, serif = !!sp.serif;
  let s = `<rect width="${W}" height="16" fill="${P.dark}"/>` + txt(18, 11, clip(sp.barText || "FOR IMMEDIATE RELEASE", 40), { size: 6, bold: true, fill: "#ffffff", ls: 1.3 });
  if (sp.T) s += txt(302, 11, clip(sp.T.city + " · 2026", 30), { size: 5.8, fill: P.light, anchor: "end" });
  const hasPhoto = !!sp.photo, maxW = hasPhoto ? 168 : 280;
  const f = fit(sp.title, maxW, 22, 13, 2, true, serif);
  let y = 26 + f.size * 0.86;
  s += title(18, y, f, { serif, fill: P.dark });
  y += (f.lines.length - 1) * f.size * 1.08;
  if (sp.sub) s += txt(18, y + 13, clip(sp.sub, hasPhoto ? 34 : 60), { size: 7.2, fill: "#64748b" });
  s += `<rect x="18" y="${y + 20}" width="${hasPhoto ? 168 : 284}" height="1.4" fill="${P.mid}"/>`;
  if (hasPhoto) s += `<rect x="196" y="24" width="108" height="76" rx="8" fill="${P.light}"/>` + photoImg(u, sp.photo, 196, 24, 108, 76, 8);
  return [s, Math.max(hasPhoto ? 104 : 72, y + 28)];
}
function headerPlain(sp, u) {
  const { P } = sp, serif = sp.serif !== false;
  let s = `<rect x="0" y="0" width="${W}" height="5" fill="${P.dark}"/>`;
  const f = fit(sp.title, 260, 24, 13, 2, true, serif);
  let y = 22 + f.size * 0.86;
  s += title(160, y, f, { serif, fill: P.dark, anchor: "middle" });
  y += (f.lines.length - 1) * f.size * 1.08;
  if (sp.sub) s += txt(160, y + 14, clip(sp.sub, 56), { size: 7.5, fill: "#64748b", anchor: "middle", italic: serif });
  s += `<rect x="110" y="${y + 22}" width="100" height="1" fill="${P.mid}"/><rect x="110" y="${y + 25}" width="100" height="1" fill="${P.mid}"/><circle cx="160" cy="${y + 23.5}" r="3" fill="${P.mid}"/>`;
  return [s, y + 34];
}

/* ---------------- bodies ---------------- */
const pct = (a, b) => { const n = (x) => parseFloat(String(x).replace(/[^\d.]/g, "")); const A = n(a), B = n(b); if (!A || !B) return ""; const d = Math.round(((B - A) / A) * 100); return (d > 0 ? "+" : "") + d + "%"; };
// Layout-specific sample rows, so a menu shows dishes and a shopping list shows groceries.
const ROWS = {
  menu: { head: ["Dish", "Serves", "Price (PKR)"], rows: [["Chicken karahi", "2", "1,450"], ["Daal makhni", "2", "850"], ["Garlic naan", "1", "180"], ["Mango lassi", "1", "350"]], num: 2 },
  "price-list": { head: ["Package", "Sessions", "Price (PKR)"], rows: [["Starter", "4", "6,000"], ["Standard", "8", "11,000"], ["Premium", "12", "15,500"], ["Add-on support", "1", "1,500"]], num: 2 },
  "product-catalog": { head: ["Product", "Size", "Price (PKR)"], rows: [["Gift box", "Large", "4,500"], ["Family pack", "Medium", "2,900"], ["Starter kit", "Small", "1,600"], ["Refill pack", "Small", "950"]], num: 2 },
  "shopping-list": { head: ["Item", "Qty", "Cost (PKR)"], rows: [["Basmati rice, 5 kg", "1", "1,650"], ["Cooking oil, 1 L", "2", "1,100"], ["Fresh vegetables", "1", "900"], ["Total", "", "3,650"]], num: 2, total: true },
  glossary: { head: ["Term", "Meaning", "Page"], rows: [["Budget", "Money planned for a period", "4"], ["Milestone", "A key point in a plan", "7"], ["Stakeholder", "Anyone the work affects", "9"], ["Scope", "What the work includes", "12"]], num: -1 },
  "meal-planner": { head: ["Day", "Breakfast", "Dinner"], rows: [["Monday", "Oats and fruit", "Chicken pulao"], ["Tuesday", "Eggs and toast", "Daal and rice"], ["Wednesday", "Yoghurt bowl", "Fish curry"], ["Thursday", "Paratha", "Vegetable soup"]], num: -1 },
  "meal-plan-nutrition": { head: ["Meal", "Food", "Calories"], rows: [["Breakfast", "Oats, banana, milk", "420"], ["Lunch", "Grilled chicken salad", "560"], ["Snack", "Nuts and an apple", "210"], ["Dinner", "Daal, rice, salad", "640"]], num: 2 },
  "habit-tracker": { head: ["Habit", "Mon", "Tue", "Wed"], rows: [["Walk 30 minutes", "✓", "✓", "–"], ["Read 20 pages", "✓", "–", "✓"], ["Drink 8 glasses", "✓", "✓", "✓"], ["Sleep by 11 pm", "–", "✓", "✓"]], num: -1 },
  "report-card": { head: ["Subject", "Term 1", "Term 2", "Grade"], rows: [["English", "78", "84", "A"], ["Maths", "71", "80", "A"], ["Science", "82", "88", "A+"], ["History", "69", "75", "B+"]], num: 3 },
  "wedding-program": { head: ["Time", "Moment", "With"], rows: [["16:00", "Guests arrive", "Ushers"], ["16:30", "The ceremony", "Both families"], ["18:00", "Dinner is served", "All guests"], ["20:00", "Cake and toasts", "Hosts"]], num: -1 },
  timetable: { head: ["Time", "Monday", "Tuesday"], rows: [["08:00", "Maths", "English"], ["09:00", "Science", "Maths"], ["10:30", "English", "Art"], ["11:30", "History", "Science"]], num: -1 },
};
const CHECKS = {
  recipe: ["2 cups plain flour", "1 cup honey, warmed", "3 eggs at room temperature", "1 tsp baking powder", "100 g soft butter"],
  "launch-checklist": null,
  "travel-itinerary": ["Passports and tickets", "Hotel booking printed", "Warm jackets for the hills", "Power bank and chargers", "First aid kit"],
};
function tableData(sp) {
  const T = sp.T;
  if (ROWS[sp.layout]) return ROWS[sp.layout];
  if (sp.table === "money") return { head: ["Item", "Qty", "Amount (PKR)"], rows: [...T.items.map(([a, v], i) => [a, String(i + 1), v]), ["Total", "", T.total]], num: 2, total: true };
  if (sp.table === "schedule") return { head: ["Time", "Session", "Lead"], rows: [["09:00", "Welcome and coffee", T.person], ["10:30", clip(T.project[0].toUpperCase() + T.project.slice(1), 26), T.person2], ["13:00", "Lunch and networking", "All"], ["14:30", clip(T.offer[0].toUpperCase() + T.offer.slice(1), 26), T.person3]], num: -1 };
  if (sp.table === "people") return { head: ["Name", "Role", "Contact"], rows: [[T.person, T.role, "ext. 101"], [T.person2, "Finance", "ext. 102"], [T.person3, "Operations", "ext. 103"], ["Team desk", T.city, "ext. 100"]], num: -1 };
  return { head: ["Measure", "2025", "2026", "Change"], rows: T.metrics.map(([m, a, b]) => [m, a, b, pct(a, b)]), num: 2 };
}
function bodyTable(sp, y0, label) {
  const { P } = sp, d = tableData(sp), x = 18, w = 284, n = d.head.length;
  const tx = d.num === -1, cw = n === 4 ? (tx ? [116, 56, 56, 56] : [128, 50, 50, 56]) : tx ? [84, 100, 100] : [150, 54, 80];
  const at = (i, c) => (tx ? [c + 6, null] : i ? [c + cw[i] - 6, "end"] : [c + 6, null]);
  let s = heading(x, y0 + 8, label, P, { serif: sp.serif });
  const ty = y0 + 15, rh = 12.5;
  s += `<rect x="${x}" y="${ty}" width="${w}" height="13" rx="3" fill="${P.dark}"/>`;
  let cx = x;
  d.head.forEach((h, i) => { const [hx, an] = at(i, cx); s += txt(hx, ty + 9, h, { size: 6, bold: true, fill: "#ffffff", anchor: an }); cx += cw[i]; });
  d.rows.slice(0, 4).forEach((r, ri) => {
    const ry = ty + 13 + ri * rh, last = d.total && ri === Math.min(3, d.rows.length - 1);
    if (ri % 2 === 1 || last) s += `<rect x="${x}" y="${ry}" width="${w}" height="${rh}" fill="${last ? P.light : P.light}" opacity="${last ? 0.9 : 0.4}"/>`;
    let c = x;
    r.forEach((v, i) => {
      const hot = i === d.num || last;
      const [vx, an] = at(i, c); s += txt(vx, ry + 8.4, clip(v, tx ? Math.floor(cw[i] / 3.4) : i ? 14 : 30), { size: 6, bold: hot, fill: hot ? P.dark : "#3f4756", anchor: an });
      c += cw[i];
    });
    s += `<rect x="${x}" y="${ry + rh - 0.5}" width="${w}" height=".5" fill="#e2e6ef"/>`;
  });
  return s;
}
function bodyKpi(sp, y0) {
  const { P, T } = sp;
  let s = heading(18, y0 + 8, sp.kpiLabel || "At a glance", P, { serif: sp.serif });
  const cw = 89, gap = 8.5, cy = y0 + 15;
  T.metrics.forEach(([m, a, b], i) => {
    const x = 18 + i * (cw + gap);
    s += `<rect x="${x}" y="${cy}" width="${cw}" height="44" rx="7" fill="${i === 0 ? P.dark : P.light}"${i === 0 ? "" : ' opacity=".9"'}/>`;
    const ink = i === 0 ? "#ffffff" : P.dark;
    s += txt(x + 8, cy + 21, clip(b, 9), { size: String(b).length > 5 ? 13.5 : 15, bold: true, fill: ink });
    const ch = pct(a, b);
    if (ch) { const bw = ch.length * 3.3 + 7; s += `<rect x="${x + cw - bw - 6}" y="${cy + 27.5}" width="${bw}" height="9" rx="4.5" fill="${i === 0 ? P.mid : "#ffffff"}"/>` + txt(x + cw - 6 - bw / 2, cy + 34, ch, { size: 5.2, bold: true, fill: i === 0 ? "#ffffff" : P.dark, anchor: "middle" }); }
    s += txt(x + 8, cy + 34, clip(m, ch ? 17 : 26), { size: 5.6, fill: i === 0 ? P.light : "#475569" });
  });
  const left = Math.floor((BOT - 1 - (cy + 58)) / 8.4) + 1;
  if (left > 0) s += para(18, cy + 58, 284, `${T.org} grew in every area this year. ${T.metrics[0][0]} moved from ${T.metrics[0][1]} to ${T.metrics[0][2]}, and the ${T.project} is on track for launch.`, { max: Math.min(2, left) });
  return s;
}
function bodyChart(sp, y0, label) {
  const { P, T } = sp;
  let s = heading(18, y0 + 8, label, P, { serif: sp.serif });
  s += para(18, y0 + 22, 140, `${T.org} serves ${T.audience} in ${T.city}. This year we focused on the ${T.project} and the ${T.offer}. ${T.metrics[1][0]} rose to ${T.metrics[1][2]}.`, { max: 5, lh: 8.4 });
  if (BOT - 4 - (y0 + 64) >= 18) s += `<rect x="18" y="${y0 + 64}" width="140" height="${Math.min(24, BOT - 4 - y0 - 64)}" rx="5" fill="${P.light}" opacity=".7"/>` + txt(25, y0 + 76, clip(`"${T.tagline}."`, 34), { size: 6.2, italic: true, bold: true, fill: P.dark, serif: true });
  const x = 170, y = y0 + 2, w = 132, h = Math.min(80, BOT - 4 - y0);
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#ffffff" stroke="#e3e7f0"/>` + txt(x + 8, y + 12, "Growth by quarter", { size: 6, bold: true, fill: P.dark });
  const vals = [38, 52, 47, 66, 78], base = y + h - 12, top = y + 22, bw = 16;
  [0, 0.5, 1].forEach((g) => { s += `<rect x="${x + 8}" y="${base - (base - top) * g}" width="${w - 16}" height=".5" fill="#e5e7eb"/>`; });
  vals.forEach((v, i) => {
    const bh = ((base - top) * v) / 80, bx = x + 14 + i * 23;
    s += `<rect x="${bx}" y="${base - bh}" width="${bw}" height="${bh}" rx="2.5" fill="${i === vals.length - 1 ? P.dark : P.mid}" opacity="${i === vals.length - 1 ? 1 : 0.45 + i * 0.1}"/>`;
    s += txt(bx + bw / 2, base + 8, i < 4 ? "Q" + (i + 1) : "Now", { size: 5, fill: "#64748b", anchor: "middle" });
  });
  return s;
}
function bodyChecks(sp, y0, label) {
  const { P, T } = sp;
  let s = heading(18, y0 + 8, label, P, { serif: sp.serif });
  const items = CHECKS[sp.layout] || [...T.goals, ...T.steps].slice(0, 5);
  items.forEach((it, i) => {
    const y = y0 + 17 + i * 13, done = i < 2;
    s += `<rect x="18" y="${y}" width="8" height="8" rx="2" fill="${done ? P.mid : "#ffffff"}" stroke="${done ? P.mid : "#a3acbf"}" stroke-width="1"/>` + (done ? tick(18, y, "#ffffff") : "");
    s += txt(32, y + 6.6, clip(it, 58), { size: 6.4, fill: done ? "#7b8494" : "#2b3343" });
    if (done) s += `<rect x="32" y="${y + 4.2}" width="${Math.min(150, clip(it, 58).length * 3.35)}" height=".6" fill="#9aa3b2"/>`;
  });
  s += `<rect x="214" y="${y0 + 14}" width="88" height="62" rx="7" fill="${P.light}"/>` + txt(222, y0 + 27, "PROGRESS", { size: 5.6, bold: true, fill: P.dark, ls: 1 }) + txt(222, y0 + 46, "40%", { size: 17, bold: true, fill: P.dark });
  s += `<rect x="222" y="${y0 + 54}" width="72" height="5" rx="2.5" fill="#ffffff"/><rect x="222" y="${y0 + 54}" width="29" height="5" rx="2.5" fill="${P.mid}"/>` + txt(222, y0 + 69, "2 of 5 done", { size: 5.4, fill: "#475569" });
  return s;
}
/** Paragraphs of tiny real text from the top of a column down to `bottom`; returns [svg, next y]. */
function flow(x, y, w, paras, bottom, o = {}) {
  const size = o.size || 5.6, lh = o.lh || 8.2;
  let s = "";
  for (const t of paras) {
    const room = Math.floor((bottom - y) / lh);
    if (room < 1) break;
    const lines = wrapText(t, size, w).slice(0, room);
    s += lines.map((l, i) => txt(x, y + i * lh, l, { size, fill: o.fill || "#5b6475" })).join("");
    y += lines.length * lh + (o.gap ?? 4);
  }
  return [s, y];
}
function bodyLetter(sp, y0) {
  const { P, T } = sp;
  let s = txt(18, y0 + 8, "12 November 2026", { size: 6, fill: "#64748b" }) + txt(302, y0 + 8, clip(T.org, 34), { size: 6, bold: true, fill: P.dark, anchor: "end" });
  s += txt(18, y0 + 22, `Dear ${T.person2.split(" ")[0]},`, { size: 7, bold: true, fill: "#1f2937" });
  const paras = [
    `Thank you for your support of ${T.org} this year. With your help we delivered the ${T.project} for ${T.audience} in ${T.city}, on time and within budget. I am writing to share what comes next and how you can stay involved.`,
    `Our next step is the ${T.offer}. We have planned it with our team and a group of ${T.audience}, and we expect it to open early next year. ${T.metrics[0][0]} has already moved from ${T.metrics[0][1]} to ${T.metrics[0][2]}.`,
    `We would be glad to meet and walk you through the plan, the budget and the dates. ${T.person} will call your office next week to agree a time that suits you.`,
    `Thank you again for your trust. ${T.tagline}.`,
  ];
  const [p, y] = flow(18, y0 + 33, 284, paras, BOT - 30);
  s += p;
  const sy = Math.min(BOT - 16, y + 8);
  s += txt(18, sy, "Kind regards,", { size: 6, fill: "#475569" }) + txt(18, sy + 13, T.person, { size: 10, italic: true, serif: true, fill: P.dark }) + txt(18, sy + 21, `${T.role}, ${T.short}`, { size: 5.6, fill: "#64748b" });
  // a full page: the letterhead's contact strip at the foot of the page
  if (BOT - (sy + 30) > 44) {
    const cy = BOT - 30;
    s += `<rect x="18" y="${cy}" width="284" height="28" rx="7" fill="${P.light}" opacity=".75"/>`;
    [["VISIT", `${T.short} office, ${T.city}`], ["EMAIL", T.email], ["CALL", "+92 42 3580 0000"]].forEach(([k, v], i) => {
      const x = 28 + i * 94;
      s += `<circle cx="${x + 3}" cy="${cy + 14}" r="3" fill="${P.mid}"/>` + txt(x + 10, cy + 11.5, k, { size: 5, bold: true, fill: P.dark, ls: 1 }) + txt(x + 10, cy + 20, clip(v, 24), { size: 5.2, fill: "#475569" });
    });
  }
  return s;
}
function bodyCertificate(sp, y0) {
  const { P, T } = sp;
  const h = BOT + 2 - y0, mid = y0 + Math.max(20, (h - 120) / 2);
  let s = `<rect x="14" y="${y0 - 4}" width="292" height="${h}" rx="6" fill="none" stroke="${P.mid}" stroke-width="1"/><rect x="18" y="${y0}" width="284" height="${h - 8}" rx="4" fill="none" stroke="${P.light}" stroke-width="2"/>`;
  s += txt(160, mid + 10, "PRESENTED TO", { size: 6, bold: true, fill: P.mid, anchor: "middle", ls: 2 });
  s += txt(160, mid + 32, T.person2, { size: 20, italic: true, serif: true, fill: P.dark, anchor: "middle" });
  s += `<rect x="90" y="${mid + 38}" width="140" height="1" fill="${P.mid}"/>`;
  s += para(60, mid + 50, 200, `For outstanding work on the ${T.project} at ${T.org}, ${T.city}, 2026.`, { max: 2, lh: 8 }).replace(/<text x="60"/g, '<text x="160" text-anchor="middle"');
  if (h > 150) {
    const sy = Math.min(BOT - 18, mid + 112);
    s += `<circle cx="160" cy="${sy - 22}" r="15" fill="${P.mid}"/><circle cx="160" cy="${sy - 22}" r="11" fill="none" stroke="#ffffff" stroke-width="1"/><path d="M160 ${sy - 30} l2.4 5 5.4 .6 -4 3.7 1.1 5.3 -4.9 -2.8 -4.9 2.8 1.1 -5.3 -4 -3.7 5.4 -.6z" fill="#ffffff"/>`;
    for (const [x, n, r] of [[78, T.person, T.role], [242, T.person3, "Director"]]) s += `<rect x="${x - 46}" y="${sy}" width="92" height=".8" fill="#94a3b8"/>` + txt(x, sy + 9, n, { size: 6, bold: true, fill: "#334155", anchor: "middle" }) + txt(x, sy + 16, r, { size: 5.2, fill: "#64748b", anchor: "middle" });
  }
  return s;
}
function bodyProse(sp, y0) {
  const { P, T } = sp;
  let s = txt(18, y0 + 24, "T", { size: 30, bold: true, serif: true, fill: P.dark });
  s += para(42, y0 + 9, 260, `he lamps along the old road in ${T.city} were lit every evening by the same quiet keeper.`, { max: 3, lh: 8.4, size: 6 });
  const [p] = flow(18, y0 + 9 + 3 * 8.4 + 2, 284, [
    `People passed without a word, until the night the lamps stayed dark and everyone noticed what they had been given all along. ${T.person.split(" ")[0]} would later say it was the best lesson of that year.`,
    `The next morning the children of the street came out with oil, cloth and a ladder. Nobody had asked them to. By evening every lamp was burning again, a little crooked, a little too bright.`,
    `The keeper watched from his window and smiled. He had waited forty years for someone to notice, and now that they had, he found that he did not mind at all.`,
    `From then on, the lamps were lit by whoever passed first, and the road was never dark again.`,
  ], BOT - 4, { size: 6, lh: 8.4, gap: 5 });
  return s + p;
}
function bodyNews(sp, y0) {
  const { P, T } = sp;
  let s = txt(18, y0 + 8, `${T.city.toUpperCase()}, 12 November 2026 —`, { size: 6.2, bold: true, fill: P.dark });
  s += para(18, y0 + 19, 284, `${T.org} today announced the ${T.project}, a new way to serve ${T.audience} in ${T.city}. The launch follows a year of planning with local partners and a pilot that reached more than 400 people.`, { max: 3, lh: 8 });
  const qy = y0 + 46;
  if (BOT - qy >= 22) s += `<rect x="18" y="${qy}" width="284" height="${Math.min(30, BOT - 2 - qy)}" rx="6" fill="${P.light}" opacity=".75"/><rect x="18" y="${qy}" width="3.5" height="${Math.min(30, BOT - 2 - qy)}" rx="1.5" fill="${P.mid}"/>` + txt(28, qy + 12, clip(`“${T.tagline}. This is a big step for our city.”`, 70), { size: 7, italic: true, bold: true, serif: true, fill: P.dark }) + txt(28, qy + 22, `${T.person}, ${T.role}`, { size: 5.6, fill: "#475569" });
  return s;
}
function bodySections(sp, y0) {
  const { P, T } = sp;
  let s = para(18, y0 + 6, 284, `${T.org} helps ${T.audience} in ${T.city}. ${T.tagline}. This document sets out the plan, the people and the numbers.`, { max: 2, lh: 8, size: 6, fill: "#3f4756" });
  const cy = y0 + 22, ch = Math.max(40, BOT - 6 - cy);
  [[T.project, `What we will deliver, who leads it and when. ${T.person} leads the work with a small team.`], [T.offer, `Why it matters for ${T.audience}, and how we will measure success each month.`]].forEach(([h, t], i) => {
    const x = 18 + i * 146;
    s += `<rect x="${x}" y="${cy}" width="138" height="${ch}" rx="7" fill="${i ? "#f6f7fb" : P.light}"${i ? "" : ' opacity=".75"'}/><rect x="${x}" y="${cy}" width="4" height="${ch}" rx="2" fill="${i ? P.mid : P.dark}"/>`;
    s += txt(x + 11, cy + 13, clip(h[0].toUpperCase() + h.slice(1), 30), { size: 7, bold: true, fill: P.dark, serif: sp.serif });
    s += para(x + 11, cy + 24, 120, t, { max: 3, lh: 7.8 });
  });
  return s;
}
function bodyTimeline(sp, y0, label) {
  const { P, T } = sp;
  let s = heading(18, y0 + 8, label, P, { serif: sp.serif });
  const ly = y0 + 34, steps = [["Q1 2027", "Plan and agree"], ["Q2 2027", clip(T.project, 18)], ["Q3 2027", "Launch"], ["Q4 2027", "Review"]];
  s += `<rect x="30" y="${ly - 1}" width="260" height="2" rx="1" fill="${P.light}"/><rect x="30" y="${ly - 1}" width="120" height="2" rx="1" fill="${P.mid}"/>`;
  steps.forEach(([q, t], i) => {
    const x = 40 + i * 80, done = i < 2;
    s += `<circle cx="${x}" cy="${ly}" r="6" fill="${done ? P.dark : "#ffffff"}" stroke="${P.dark}" stroke-width="1.4"/>` + (done ? tick(x - 4, ly - 4, "#ffffff") : "");
    s += txt(x, ly - 11, q, { size: 6, bold: true, fill: P.dark, anchor: "middle" }) + txt(x, ly + 15, t[0].toUpperCase() + t.slice(1), { size: 5.8, fill: "#475569", anchor: "middle" });
  });
  s += `<rect x="18" y="${ly + 24}" width="284" height="${Math.max(18, BOT - 6 - ly - 24)}" rx="7" fill="${P.light}" opacity=".6"/>` + para(26, ly + 35, 268, `Owner: ${T.person} (${T.role}). Budget agreed; next review with ${T.person2} in four weeks.`, { max: 2, fill: "#334155" });
  return s;
}
function bodyResume(sp, y0) {
  const { P, T } = sp;
  let s = `<rect x="0" y="${y0 - 10}" width="104" height="${BOT + 14 - y0}" fill="${P.light}" opacity=".7"/>`;
  // sidebar: skills, education, certificates, references (each only when it fits)
  const side = [
    ["SKILLS", null],
    ["EDUCATION", ["BBA, Lahore School", "2014 – 2018"]],
    ["CERTIFICATES", ["Project management, 2024", "First aid, 2023"]],
    ["REFERENCES", [T.person3, `${T.short}, ${T.city}`]],
  ];
  let ys = y0 + 6;
  for (const [h, lines] of side) {
    const need = lines ? 10 + lines.length * 9 : 66;
    if (ys + need > BOT) break;
    s += txt(14, ys, h, { size: 6.2, bold: true, fill: P.dark, ls: 1.2 });
    if (!lines) {
      ["Planning", "Teamwork", "Reporting", "Customer care"].forEach((k, i) => {
        const y = ys + 10 + i * 14;
        s += txt(14, y, k, { size: 5.8, fill: "#334155" }) + `<rect x="14" y="${y + 3}" width="76" height="3.4" rx="1.7" fill="#ffffff"/><rect x="14" y="${y + 3}" width="${76 - i * 11}" height="3.4" rx="1.7" fill="${P.mid}"/>`;
      });
    } else lines.forEach((l, i) => { s += txt(14, ys + 10 + i * 9, clip(l, 24), { size: 5.6, fill: i ? "#64748b" : "#334155" }); });
    ys += need + 10;
  }
  // main column: profile, then roles while they fit
  let y = y0 + 6;
  if (BOT - y0 > 160) {
    s += txt(118, y, "PROFILE", { size: 6.2, bold: true, fill: P.dark, ls: 1.2 });
    s += para(118, y + 11, 184, `${T.role} with eight years of experience helping ${T.audience} in ${T.city}. I plan clearly, report honestly and keep teams moving.`, { max: 3, lh: 7.6 });
    y += 42;
  }
  s += txt(118, y, "EXPERIENCE", { size: 6.2, bold: true, fill: P.dark, ls: 1.2 });
  const roles = [[`${T.role}, ${T.short}`, "2022 – now", T.project, 0], [`Team lead, ${T.city}`, "2019 – 2022", T.offer, 1], [`Coordinator, ${T.city}`, "2016 – 2019", T.event, 2], [`Assistant, ${T.city}`, "2014 – 2016", T.product, 0]];
  y += 13;
  for (const [r, d, what, mi] of roles) {
    if (y + 26 > BOT) break;
    s += `<circle cx="121" cy="${y - 2.5}" r="2.6" fill="${P.mid}"/>` + txt(128, y, clip(r, 36), { size: 6.6, bold: true, fill: "#1f2937" }) + txt(302, y, d, { size: 5.4, fill: "#64748b", anchor: "end" });
    s += para(128, y + 9, 172, `Led the ${what}; improved ${T.metrics[mi][0].toLowerCase()} from ${T.metrics[mi][1]} to ${T.metrics[mi][2]}.`, { max: 2, lh: 7.6 });
    y += 36;
  }
  return s;
}
/** Portrait page size of the template preview: A4 ratio (210 × 297), as Canva shows Docs templates (whole first page). */
export const PAGE_W = 320, PAGE_H = 452;
const BODY_FN = { kpi: (sp, y) => bodyKpi(sp, y), table: (sp, y, l) => bodyTable(sp, y, l), chart: (sp, y, l) => bodyChart(sp, y, l), checks: (sp, y, l) => bodyChecks(sp, y, l), letter: (sp, y) => bodyLetter(sp, y), news: (sp, y) => bodyNews(sp, y), prose: (sp, y) => bodyProse(sp, y), certificate: (sp, y) => bodyCertificate(sp, y), timeline: (sp, y, l) => bodyTimeline(sp, y, l), resume: (sp, y) => bodyResume(sp, y), sections: (sp, y) => bodySections(sp, y) };
// Full-page bodies use the whole page; the others are followed by two sections that suit them (a report: KPI cards,
// then a table, then a chart; a plan: timeline, table, checklist...), like a real first page.
const FULL = new Set(["letter", "prose", "certificate", "resume"]);
const NEXT = { kpi: ["table", "chart"], table: ["checks", "sections"], chart: ["table", "checks"], checks: ["table", "sections"], timeline: ["table", "checks"], sections: ["table", "checks"], news: ["sections", "table"] };
const HEIGHT = { kpi: 86, table: 84, chart: 88, checks: 88, timeline: 88, news: 84, sections: 96 };
const label2 = (sp, kind) => kind === "table" ? ({ money: "Costs", schedule: "Schedule", people: "Team" }[sp.table] || "Key numbers") : kind === "checks" ? "Next steps" : kind === "chart" ? "Highlights" : kind === "timeline" ? "Milestones" : "At a glance";

/** The finished-looking thumbnail for one template spec: the whole first page, portrait (A4 ratio).
 *  decoSvg = the docs decorations (passed in to keep this module pure). */
export function drawThumb(sp, id, decoSvg) {
  const u = "dt" + hash(id).toString(36);
  let head = "", top = 100;
  const style = sp.style;
  if (style === "shade" || style === "split" || style === "tint") [head, top] = headerPhoto(sp, u, style);
  else if (style === "soft") [head, top] = headerSoft(sp, u);
  else if (style === "avatar") [head, top] = headerAvatar(sp, u, decoSvg);
  else if (style === "bar") [head, top] = headerBar(sp, u);
  else if (style === "plain") [head, top] = headerPlain(sp, u);
  else [head, top] = headerBand(sp, u, decoSvg);
  const end = PAGE_H - 30, body = style === "avatar" ? "resume" : sp.body in BODY_FN ? sp.body : "sections";
  let b = "", y = top + 10;
  const list = FULL.has(body) ? [body] : [body, ...(NEXT[body] || ["table", "checks"])];
  list.forEach((kind, i) => {
    const last = i === list.length - 1;
    const h = last ? end - y : Math.min(HEIGHT[kind] || 90, end - y);
    if (h < 40) return;
    BOT = y + h;
    // a report already shows its numbers as KPI cards: the table below shows the budget instead
    const s2 = i && kind === "table" && body === "kpi" && sp.table === "metrics" ? { ...sp, table: "money" } : sp;
    b += BODY_FN[kind](s2, y, i === 0 ? sp.label || label2(sp, kind) : label2(s2, kind));
    y = BOT + 10;
  });
  BOT = 196;
  const T = sp.T;
  const foot = `<rect x="18" y="${PAGE_H - 22}" width="284" height=".6" fill="#e2e6ef"/>` + (T ? txt(18, PAGE_H - 11, clip(`${T.org} · ${T.email}`, 60), { size: 5.6, fill: "#8a93a5" }) : "") + txt(302, PAGE_H - 11, "1", { size: 5.6, fill: "#8a93a5", anchor: "end" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}"><rect width="${PAGE_W}" height="${PAGE_H}" fill="#ffffff"/>${head}<g>${b}</g>${foot}</svg>`;
}
