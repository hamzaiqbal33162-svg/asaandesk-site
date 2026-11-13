// Shared photo library for templates in every design app: real photos (CC0 / public domain, Wikimedia Commons; credits
// in /pdf-editor/photos/CREDITS.md) instead of empty "Drop a photo" boxes. Deterministic: the same template always gets
// the same photo. API (keep stable):
//   pickPhoto(topic, seed, { exclude, landscape }) -> photo record { id, theme, tags, w, h, file, thumb, title }
//   photoUrl(photo, "full" | "thumb") -> same-origin URL
//   photosFor(topic, n, seed) -> n different photos for one design (a deck, a website…)
import { PHOTOS } from "./photo-data.js";

export const PHOTO_BASE = "/pdf-editor/photos/";
export { PHOTOS };

// Topic words (template names, categories, tools) -> photo themes/tags that suit them, best first. Whole words only
// (a word ending in * also matches longer forms: celebrat* = celebrate, celebration…), so "mountains" no longer
// matches "ai" and "team" no longer matches "tea".
const T = (words, themes) => [new RegExp("\\b(?:" + words.split(" ").map((w) => (w.endsWith("*") ? w.slice(0, -1) + "\\w*" : w.replace(/_/g, "\\s+") + "(?:s|es)?")).join("|") + ")\\b", "i"), themes];
const TOPICS = [
  T("pitch startup* business* corporate company report* proposal* strategy strategies plan* financ* invest* consult* agency agencies office meeting* work workplace career* resume* cv hr sales marketing brand* kpi quarter* budget*", ["office", "city", "tech", "workspace", "meeting", "business"]),
  T("tech technology software app saas ai data cloud code coding digital cyber web website it launch* product*", ["tech", "office", "city", "workspace"]),
  T("food* restaurant* menu* cafe coffee bakery bakeries kitchen* recipe* chef* pizza* burger* dessert* cake* tea drink* bar", ["food", "coffee", "restaurant"]),
  T("fitness gym* sport* yoga health* run running workout* wellness nutrition* diet*", ["fitness", "sport", "nature", "food"]),
  T("doctor* clinic* medic* hospital* dental dentist* pharma* care nurse*", ["medical", "office", "flowers"]),
  T("school* educat* class classes lesson* teacher* student* course* science math* history university universities college* kids learn* workshop* lecture*", ["education", "space", "nature"]),
  T("travel* tour* holiday* vacation* trip* hotel* beach* summer adventure* flight*", ["travel", "sea", "mountains", "nature"]),
  T("real_estate propert* home* house* interior* architect* apartment* construct* furniture", ["interior", "architecture", "city", "office"]),
  T("beauty salon* makeup spa skin* cosmetic* perfume* nail* lipstick*", ["beauty", "fashion", "flowers", "textures"]),
  T("fashion* style* clothing boutique* outfit*", ["fashion", "beauty", "flowers", "textures"]),
  T("wedding* invitation* party parties birthday* anniversar* baby babies shower* celebrat* event* gala* festival* concert* music*", ["celebration", "flowers", "sky", "textures"]),
  T("nature garden* eco green environment* farm* plant* flower* earth climate sustain*", ["nature", "flowers", "forest", "mountains"]),
  T("city cities urban night* skyline* architecture", ["city", "architecture"]),
  T("space astronom* planet* galax* star", ["space", "sky"]),
  T("pakistan* lahore karachi islamabad eid ramadan mosque*", ["pakistan", "city"]),
  T("animal* pet dog* cat vet zoo*", ["animals", "nature"]),
  T("art artist* artwork* craft* creative* design* photo* portfolio* studio* galler* paint*", ["textures", "abstract", "flowers", "city", "workspace"]),
  T("abstract gradient* background* pattern* texture* wallpaper* bokeh minimal* neon", ["abstract", "textures"]),
];
const FALLBACK = ["city", "office", "tech", "nature", "textures", "sky"];

function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Themes that suit a topic text (template name, category, tool id). */
export function themesFor(topic = "") {
  const t = String(topic || "");
  const out = [];
  for (const [re, themes] of TOPICS) if (re.test(t)) for (const th of themes) if (!out.includes(th)) out.push(th);
  return out.length ? out : FALLBACK;
}

/** Photos ranked for a topic: exact tag hits first, then theme order. */
function ranked(topic) {
  const words = String(topic || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
  const themes = themesFor(topic);
  const score = (p) => {
    let s = 0;
    const ti = themes.indexOf(p.theme); if (ti >= 0) s += 40 - ti * 5;
    for (const w of words) if (p.tags?.includes(w)) s += 12;
    for (const th of themes) if (p.tags?.includes(th)) s += 3;
    return s;
  };
  const list = PHOTOS.map((p) => [score(p), p]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, p]) => p);
  return list.length ? list : PHOTOS.slice();
}

/** One photo for a topic; `seed` (template id, page index…) picks among the good matches deterministically. */
export function pickPhoto(topic, seed = 0, { exclude = [], landscape = null } = {}) {
  let list = ranked(topic).filter((p) => !exclude.includes(p.id));
  if (landscape != null) { const l = list.filter((p) => (p.w >= p.h) === !!landscape); if (l.length) list = l; }
  if (!list.length) list = PHOTOS.slice();
  const top = list.slice(0, Math.max(4, Math.min(12, list.length)));
  return top[hash(String(seed) + "|" + topic) % top.length];
}

/** n different photos for one design. */
export function photosFor(topic, n, seed = 0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(pickPhoto(topic, `${seed}:${i}`, { exclude: out.map((p) => p.id) }));
  return out;
}

export function photoUrl(p, size = "full") { if (!p) return ""; return PHOTO_BASE + (size === "thumb" ? p.thumb : p.file); }
