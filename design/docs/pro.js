// AsaanDesk Docs, round 5: the Canva Docs pattern for every template when it opens — a photo header (real photo from the
// shared library behind a bold title, as a photo band) or a colour band, a kicker line, KPI cards for reports, tables
// with a coloured header row, callout blocks, a story photo for newsletters / guides / brochures, and a footer.
// gallery.js docLook(id) gives the same look the thumbnail is drawn from, so the card and the document match.
import { normalizeDoc, cleanRuns } from "./model.js";
import { photoUrl, photosFor, pickPerson, isPerson, objectPosition } from "../shared/photo-library.js";

/** Face focus "x,y,width/height" of a people photo for a round portrait band (model.js pfo). */
const pfoOf = (p) => `${p.fx ?? 0.5},${p.fy ?? 0.3},${(p.w / p.h).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`;

const PHOTO = new Set(["shade", "split", "tint", "soft"]);
// Layouts that read like stories get a second, wide photo inside the document.
const STORY = new Set(["newsletter", "two-column-newsletter", "magazine-article", "city-guide", "travel-itinerary", "property-listing", "event-plan", "case-study", "recipe", "menu", "press-release", "product-catalog", "conference-agenda", "event-flyer-doc", "wedding-program", "impact-report", "brand-guidelines", "social-media-plan", "content-strategy", "annual-report", "sustainability-report", "stats-case-study", "onboarding-guide", "employee-handbook", "business-plan", "marketing-plan", "pitch-one-sheet", "volunteer-handbook", "fact-sheet", "about-me", "project-proposal", "one-pager", "project-plan", "business-case"]);
const isBand = (b) => b && /^(h[1-3]|p)$/.test(b.type) && (b.bg || b.bgimg);
const textOf = (b) => (b.runs || []).map((r) => r.text).join("");
const pct = (a, b) => { const n = (x) => parseFloat(String(x).replace(/[^\d.]/g, "")); const A = n(a), B = n(b); if (!A || !B) return ""; const d = Math.round(((B - A) / A) * 100); return (d > 0 ? "+" : "") + d + "%"; };

/** Title runs big and bold, the other lines in the band's second colour; an optional kicker line on top. */
function heroRuns(runs, { titleColor, otherColor, kicker, kickerColor }) {
  const sizes = runs.filter((r) => r.text.trim()).map((r) => r.size || 0);
  const big = Math.max(0, ...sizes);
  const titleLen = runs.filter((r) => (r.size || 0) === big).map((r) => r.text).join("").trim().length;
  const tSize = titleLen <= 14 ? 46 : titleLen <= 22 ? 40 : titleLen <= 32 ? 34 : 30;
  const out = runs.map((r) => {
    if (r.text === "\n") return r;
    if ((r.size || 0) === big && big) return { ...r, size: Math.max(big, tSize), b: true, color: titleColor };
    return { ...r, color: otherColor, size: Math.min(r.size || 13, 15) };
  });
  if (kicker && !out.map((r) => r.text).join("").toLowerCase().includes(kicker.toLowerCase())) out.unshift({ text: kicker.toUpperCase(), b: true, size: 10, color: kickerColor }, { text: "\n" });
  return cleanRuns(out);
}

/** Applies the round-5 look k (from gallery.js docLook) to a built document. */
export function proSkin(doc, k) {
  if (!doc || !k || !k.P) return doc;
  const { P, T } = k, d = JSON.parse(JSON.stringify(doc)), B = d.blocks;
  const dark = k.style !== "soft";
  // 1. Header: the first block becomes a photo band (or a bolder colour band).
  let hi = B.findIndex((b, i) => i < 3 && /^h1$/.test(b.type));
  if (hi < 0 && isBand(B[0])) hi = 0;
  if (hi >= 0) {
    const h = B[hi];
    const photo = PHOTO.has(k.style) && k.photo ? photoUrl(k.photo, "full") : "";
    if (photo) {
      // People photos stay visible: docked at full height beside the title (or a lighter wash under a centred title),
      // with the face kept in view.
      const ov = isPerson(k.photo) ? (k.style === "tint" ? "tintl" : "dock") : k.style;
      Object.assign(h, { bg: dark ? P.dark : P.light, bgimg: photo, ov, pad: 34, minh: Math.max(h.minh || 0, 240) });
      if (isPerson(k.photo)) h.bgpos = objectPosition(k.photo);
      delete h.deco; delete h.dc; delete h.dc2;
      h.runs = heroRuns(h.runs, { titleColor: dark ? "#ffffff" : P.ink, otherColor: dark ? P.light : P.dark, kicker: k.kicker, kickerColor: dark ? P.light : P.mid });
    } else if (k.style === "band" || k.style === "avatar" || (!h.bg && k.style !== "plain" && k.style !== "bar")) {
      Object.assign(h, { bg: h.bg && h.bg !== "#ffffff" ? h.bg : P.dark, pad: Math.max(h.pad || 0, 28), minh: Math.max(h.minh || 0, 170) });
      if (!h.deco) { if (k.style === "avatar") Object.assign(h, { deco: "avatar", dc: P.mid, dc2: P.light }); else Object.assign(h, { deco: k.deco || "diamonds", dc: P.light, dc2: P.cream }); }
      // Résumé / about-me: a round profile photo (a real person, cropped around the face) where the avatar was.
      if (k.style === "avatar" && k.portrait) { delete h.deco; delete h.dc; delete h.dc2; Object.assign(h, { pimg: photoUrl(k.portrait, "full"), pfo: pfoOf(k.portrait) }); }
      const light = /^#f|^#e/i.test(h.bg);
      h.runs = heroRuns(h.runs, { titleColor: light ? P.ink : "#ffffff", otherColor: light ? P.dark : P.light, kicker: k.style === "avatar" ? "" : k.kicker, kickerColor: light ? P.mid : P.light });
    } else {
      h.runs = cleanRuns(h.runs.map((r) => (r.text === "\n" ? r : { ...r, b: true, color: r.color || P.dark })));
    }
  }
  // 2. Body: bold coloured headings, tables with a coloured header row, callouts.
  for (const b of B) {
    if (b === B[hi]) continue;
    if (/^h[23]$/.test(b.type)) {
      b.runs = cleanRuns(b.runs.map((r) => (r.text === "\n" ? r : { ...r, b: true, color: r.color || P.dark })));
      // Canva-style section pill: plain h2 headings sit on a soft rounded band in the palette colour.
      if (b.type === "h2" && !b.bg && !b.bgimg) Object.assign(b, { bg: P.light, rad: 10, pad: 8 });
    }
    else if (b.type === "table" && b.header && b.rows.length > 1) {
      if (b.tstyle === "cols") continue;
      if (b.accent || !b.tstyle) { b.accent = P.dark; b.rows[0] = b.rows[0].map((c) => ({ runs: cleanRuns(c.runs.map((r) => ({ ...r, b: true, color: "#ffffff" }))) })); }
      else b.rows[0] = b.rows[0].map((c) => ({ runs: cleanRuns(c.runs.map((r) => ({ ...r, b: true, color: P.dark }))) }));
    } else if (b.type === "quote" && !b.bg) Object.assign(b, { bg: P.light, rad: 12, pad: 16 });
  }
  // 3. Story layouts: a second, wide photo at the end of the first section (before the second heading).
  // A bar header has no photo band: when its card shows a person (press release, feature, team directory), that same
  // person photo is the document's story photo, so the card and the document match.
  const barPerson = k.style === "bar" && isPerson(k.photo);
  if ((STORY.has(k.layout) || barPerson) && k.topic && B.length >= 6) {
    // people layouts (newsletters, team and welcome docs, impact reports…) show people in the story photo too
    const p2 = barPerson ? k.photo : k.people ? pickPerson(k.people, `${k.id || k.layout}:story`, { exclude: k.photo ? [k.photo.id] : [], landscape: true }) : photosFor(k.topic, 2, k.id || k.layout)[1];
    const heads = B.map((b, i) => (i > hi + 1 && /^h[23]$/.test(b.type) && B[i - 1].type !== "image" ? i : -1)).filter((i) => i >= 0);
    if (p2 && heads.length) B.splice(heads[0], 0, { type: "image", src: photoUrl(p2, "full"), alt: p2.title || "Photo", w: 600, align: "center" });
  }
  // 4. Reports: KPI cards (big numbers on tinted cards) right after the opening paragraph.
  if (k.body === "kpi" && T && !k.original) {
    const kpi = [
      { type: "h2", bg: P.light, rad: 10, pad: 8, runs: [{ text: "At a glance", b: true, color: P.dark }] },
      { type: "table", header: true, accent: P.light, tstyle: "lines", cw: [33, 34, 33], rows: [
        T.metrics.map(([, , v]) => ({ runs: [{ text: String(v), b: true, size: 26, color: P.dark }] })),
        T.metrics.map(([m, a, v]) => ({ runs: [{ text: m, b: true, size: 9, color: "#334155" }, { text: `  ${pct(a, v) || ""} (was ${a})`, size: 9, color: "#64748b" }] })),
      ] },
    ];
    const at = Math.max(hi + 1, B.findIndex((b, i) => i > hi && b.type === "p" && textOf(b).trim()) + 1 || hi + 1);
    B.splice(Math.min(at, hi + 3), 0, ...kpi);
  }
  // 5. Footer with the organisation, page numbers on.
  d.page = { ...d.page, pageNumbers: true, footer: d.page?.footer || (T ? `${T.org} · ${T.email}` : "") };
  return normalizeDoc(d);
}
