// Shared photo library for templates in every design app: real photos instead of empty "Drop a photo" boxes.
// Two sets (files and credits in /pdf-editor/photos/, CREDITS.md):
//   PHOTOS  places, things, food, offices… (CC0 / public domain, Wikimedia Commons). No identifiable people.
//   PEOPLE  people photos (Pexels License): business men and women, headshots, teams, customers, doctors, chefs, students,
//           models, couples, families… Each has people {n, sex: "f" | "m" | "mixed", shot: "head" | "half" | "full" |
//           "group" | "scene"} and the face position fx/fy (0..1) so crops keep the face in view.
// Deterministic: the same template always gets the same photo. API (keep stable):
//   pickPhoto(topic, seed, { exclude, landscape, people }) -> photo record { id, theme, tags, w, h, file, thumb, title }
//   photosFor(topic, n, seed) -> n different photos for one design (a deck, a website…)
//   pickPerson(kind, seed, { exclude, landscape, sex, shot, group }) -> a people photo for a person spot ("business woman
//           headshot", "team meeting", "chef", "testimonial customer"…)
//   peopleFor(kind, n, seed, opts) -> n different people photos (a team page, three reviews…)
//   photoUrl(photo, "full" | "thumb") -> same-origin URL
//   focusOf(photo) -> {x, y} 0..1 (the face for people photos, the centre otherwise)
//   focusCrop(photo, w, h) -> fractional cover crop {x, y, w, h} of the photo for a w × h box, centred on the focus
//   coverBox(photo, w, h) -> {x, y, w, h}: where to draw the whole photo (px, relative to the box) to cover it with the focus in view
import { PHOTOS, PEOPLE } from "./photo-data.js";

export const PHOTO_BASE = "/pdf-editor/photos/";
export { PHOTOS, PEOPLE };
/** Every library photo (places and people). */
export const ALL_PHOTOS = [...PHOTOS, ...PEOPLE];
const BY_ID = new Map(ALL_PHOTOS.map((p) => [p.id, p]));
/** A library photo by id. */
export const photoById = (id) => BY_ID.get(id) || null;
/** True for a people photo. */
export const isPerson = (p) => !!p?.people;

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

/** One photo for a topic; `seed` (template id, page index…) picks among the good matches deterministically.
 *  Places and things only, unless { people: true } (then it is pickPerson). */
export function pickPhoto(topic, seed = 0, { exclude = [], landscape = null, people = false } = {}) {
  if (people) return pickPerson(topic, seed, { exclude, landscape });
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

// ---- People ------------------------------------------------------------------------------------------------------
/** Words that mean a spot shows a person (template names, frame names, slot hints). */
export const PEOPLE_WORDS = /\b(?:people|person|persons|portraits?|headshots?|selfie|team|teams|staff|colleagues?|employees?|founders?|ceo|cfo|coo|speakers?|presenters?|hosts?|customers?|clients?|testimonials?|reviewers?|profiles?|man|men|woman|women|girl|boy|lady|guy|couple|bride|groom|family|families|kids?|child|children|students?|graduates?|teachers?|tutors?|doctors?|nurses?|dentists?|chefs?|barista|trainers?|coach|athletes?|models?|influencers?|creators?|youtubers?|gamers?|podcasters?|musicians?|singers?|dj|artists?|photographers?|agents?|realtors?|workers?|engineers?|volunteers?|members?|authors?|leaders?|managers?|candidates?|crowd|audience|friends)\b/i;
/** True when a text (template name, frame name, slot hint) asks for a person. */
export const wantsPeople = (text) => PEOPLE_WORDS.test(String(text || ""));

const SEX_F = /\b(?:woman|women|female|girl|lady|ladies|she|her|bride|mother|mom|businesswoman|actress|waitress)\b/i;
const SEX_M = /\b(?:man|men|male|boy|guy|he|his|groom|father|dad|businessman|gentleman)\b/i;
const HEAD = /\b(?:headshots?|profiles?|avatars?|testimonials?|reviews?|reviewers?|customers?|clients?|resume|cv|id|badge|members?|speakers?|authors?|hosts?|faces?|selfie)\b/i;
const GROUP = /\b(?:team|teams|group|colleagues|staff|crowd|audience|friends|meeting|students|class|family|families|people|employees|workshop|conference)\b/i;
// One person even when the text also says "team" ("team member portrait", "team people portrait" on a member card).
const SINGLE = /\b(?:portraits?|headshots?|members?|profiles?|avatars?|faces?|selfie|testimonials?|reviewers?|customers?|clients?|speakers?|hosts?|authors?|founders?|ceo)\b/i;
const COUPLE = /\b(?:couple|bride|groom|wedding|engagement|anniversary|valentine)\b/i;
// Roles -> extra tag words that match the right photos.
const ROLE = [
  [/\b(?:business\w*|corporate|ceo|cfo|founder|executive|manager|consultant|office|finance|lawyer|attorney|sales|hr|recruit\w*|hiring|linkedin|resume|cv|professional)\b/i, ["business", "professional", "office"]],
  [/\b(?:doctor|clinic|medical|hospital|nurse|dentist|dental|health|pharma\w*)\b/i, ["doctor", "medical", "nurse"]],
  [/\b(?:chef|cook|kitchen|restaurant|food|menu|bakery|barista|cafe|coffee)\b/i, ["chef", "barista", "food", "restaurant", "coffee"]],
  [/\b(?:student|students|school|graduate|graduation|class|university|college|study|teacher|tutor|course|lesson|education|kids?)\b/i, ["student", "teacher", "education", "graduate", "school"]],
  [/\b(?:fitness|gym|workout|trainer|coach|yoga|sport\w*|athlete|run|running)\b/i, ["fitness", "gym", "yoga", "sport", "trainer"]],
  [/\b(?:beauty|skin\w*|makeup|salon|spa|cosmetic\w*|hair\w*|nail\w*)\b/i, ["beauty", "skincare", "salon", "spa"]],
  [/\b(?:fashion|style|outfit|boutique|clothing|model|collection|sale|shop\w*)\b/i, ["fashion", "style", "model", "outfit"]],
  [/\b(?:wedding|bride|groom|couple|engagement|anniversary|valentine|love)\b/i, ["couple", "wedding", "love"]],
  [/\b(?:family|baby|kids?|child|children|mother|father|parents?)\b/i, ["family", "child", "kids"]],
  [/\b(?:travel\w*|trip|tour|vacation|holiday|adventure|beach|hotel)\b/i, ["travel", "traveler", "adventure"]],
  [/\b(?:music|concert|dj|band|singer|musician|festival|party|event|night)\b/i, ["music", "concert", "musician", "crowd"]],
  [/\b(?:podcast\w*|youtube\w*|creator|influencer|vlog\w*|stream\w*|gaming|gamer|video)\b/i, ["creator", "podcast", "gamer", "camera", "influencer"]],
  [/\b(?:real estate|realtor|agent|property|home|house)\b/i, ["realtor", "agent", "real", "estate"]],
  [/\b(?:construction|builder|engineer|worker|repair|plumb\w*|electric\w*)\b/i, ["construction", "worker", "engineer"]],
  [/\b(?:support|call|service|help ?desk|customer service)\b/i, ["support", "headset", "service"]],
  [/\b(?:speaker|conference|presentation|presenter|seminar|webinar|keynote|summit|workshop)\b/i, ["speaker", "presentation", "conference", "presenter"]],
  [/\b(?:team|colleagues|meeting|staff|employees|office)\b/i, ["team", "meeting", "colleagues"]],
  [/\b(?:eid|ramadan|pakistan\w*|desi|south asian|kurta|festive|mehndi)\b/i, ["south", "asian", "pakistani", "festive"]],
  [/\b(?:senior|elderly|grand\w*|retire\w*)\b/i, ["senior", "elderly"]],
];

function peopleRanked(kind, { sex = null, shot = null, group = null } = {}) {
  const text = String(kind || "");
  const words = text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
  const roleTags = new Set();
  for (const [re, tags] of ROLE) if (re.test(text)) for (const t of tags) roleTags.add(t);
  const wantSex = sex || (SEX_F.test(text) && !SEX_M.test(text) ? "f" : SEX_M.test(text) && !SEX_F.test(text) ? "m" : null);
  const wantCouple = COUPLE.test(text);
  const wantGroup = group ?? (!wantCouple && !SINGLE.test(text) && GROUP.test(text));
  const wantHead = shot ? null : HEAD.test(text);
  const score = (p) => {
    let s = 0;
    for (const w of words) if (p.tags?.includes(w)) s += 8;
    for (const t of roleTags) if (p.tags?.includes(t)) s += 6;
    const n = p.people?.n || 1;
    if (wantCouple) s += n === 2 ? 30 : -20;
    else if (wantGroup) s += n >= 2 ? 30 : -25;
    else s += n === 1 ? 10 : -30;
    if (shot) s += p.people?.shot === shot ? 25 : -10;
    else if (wantHead) s += /^(head|half)$/.test(p.people?.shot) ? 12 : -6;
    if (wantSex && !wantGroup && !wantCouple) s += p.people?.sex === wantSex ? 20 : -40;
    return s;
  };
  return PEOPLE.map((p) => [score(p), p]).sort((a, b) => b[0] - a[0] || (a[1].id < b[1].id ? -1 : 1));
}
// How far below the best match a photo may score and still be picked (one missing role word): a chef spot gets chefs
// and baristas, never a random face just because the list had fewer than 8 chefs.
const NEAR = 18;

/** A people photo for a person spot; `kind` says who ("business woman headshot", "team meeting", "chef", "couple"…). */
export function pickPerson(kind, seed = 0, { exclude = [], landscape = null, sex = null, shot = null, group = null } = {}) {
  if (!PEOPLE.length) return pickPhoto(kind, seed, { exclude, landscape });
  let list = peopleRanked(kind, { sex, shot, group }).filter(([, p]) => !exclude.includes(p.id));
  if (!list.length) list = PEOPLE.map((p) => [0, p]);
  // The right kind of person first (faces are cropped for any frame shape), then the frame's orientation among those.
  let top = list.filter(([s]) => s >= list[0][0] - NEAR).slice(0, 8);
  if (landscape != null) { const l = top.filter(([, p]) => (p.w >= p.h) === !!landscape); if (l.length >= 2) top = l; }
  return top[hash(String(seed) + "|" + kind) % top.length][1];
}

/** n different people photos for one design (team members, reviews…). Alternates women and men unless `sex` is set. */
export function peopleFor(kind, n, seed = 0, opts = {}) {
  const out = [];
  const mixed = !opts.sex && !SEX_F.test(kind) && !SEX_M.test(kind) && (SINGLE.test(kind) || !GROUP.test(kind)) && !COUPLE.test(kind) && opts.group !== true;
  for (let i = 0; i < n; i++) {
    const o = { ...opts, exclude: [...(opts.exclude || []), ...out.map((p) => p.id)] };
    if (mixed) o.sex = (hash(String(seed)) + i) % 2 ? "m" : "f";
    out.push(pickPerson(kind, `${seed}:${i}`, o));
  }
  return out;
}

// ---- Drawing helpers -----------------------------------------------------------------------------------------------
/** Focus point 0..1: the face for people photos, the centre for the rest. */
export const focusOf = (p) => ({ x: p?.fx ?? 0.5, y: p?.fy ?? 0.5 });
const clamp01 = (v, max) => Math.max(0, Math.min(max, v));
/** Fractional cover crop {x, y, w, h} (parts of the photo) for a w × h box, centred on the photo's focus point. */
export function focusCrop(p, w, h) {
  const nw = p?.w || 1, nh = p?.h || 1;
  const src = nw / nh, box = w / Math.max(1e-6, h);
  const f = focusOf(p);
  // Faces sit a little above the box centre in a portrait crop (head room like a real headshot).
  const fy = isPerson(p) ? f.y + 0.06 : f.y;
  if (src > box) { const cw = box / src; return { x: clamp01(f.x - cw / 2, 1 - cw), y: 0, w: cw, h: 1 }; }
  const ch = src / box; return { x: 0, y: clamp01(fy - ch / 2, 1 - ch), w: 1, h: ch };
}
/** Where to draw the whole photo (relative to a w × h box at 0,0) so it covers the box with the focus in view. */
export function coverBox(p, w, h) {
  const c = focusCrop(p, w, h);
  const W = w / c.w, H = h / c.h;
  return { x: -c.x * W, y: -c.y * H, w: W, h: H };
}
/** CSS object-position for an <img> / background with object-fit: cover. */
export function objectPosition(p) { const f = focusOf(p); return `${Math.round(f.x * 100)}% ${Math.round(Math.min(1, f.y + (isPerson(p) ? 0.06 : 0)) * 100)}%`; }

export function photoUrl(p, size = "full") { if (!p) return ""; return PHOTO_BASE + (size === "thumb" ? p.thumb : p.file); }
