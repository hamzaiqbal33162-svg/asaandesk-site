// People photos for the video-family templates (video, recorder, text to speech, AI media). A person spot names a KIND (who
// it shows: "chef", "trainer", "couple", "customer:f"…); the photo comes from the shared library's PEOPLE (Pexels License)
// by the kind's tags, deterministic per seed. cast() fills the person spots of one design: never the same person twice,
// women and men in turn when the kind has both. Crops: k.photo crops people photos around the face by itself.
import { PEOPLE, pickPerson, isPerson } from "../shared/photo-library.js";

// tags: any of them marks a photo of this kind. n: "1" one person, "2" a pair, "g" a group (3+), "2g" a pair or a group.
// plus: extra photo ids. alt: the kind to use when this one has no photo left (or none of the wanted sex).
const K = (tags, o = {}) => ({ tags, ...o });
export const KINDS = {
  creator: K(["creator", "youtuber", "vlog", "influencer"], { n: "1" }),
  host: K(["podcast", "host", "microphone", "creator", "youtuber"], { n: "1", alt: "creator" }),
  podcast: K(["podcast"], { n: "2", alt: "host" }),
  speaker: K(["speaker", "presenter"], { n: "1", alt: "host" }),
  presenting: K(["presenter", "presentation", "speaker"], { n: "g", alt: "speaker" }),
  chef: K(["chef"], { n: "1", alt: "cook" }),
  cook: K(["chef", "barista"], { n: "1", alt: "customer" }),
  barista: K(["barista"], { n: "1", alt: "cook" }),
  trainer: K(["fitness", "yoga"], { n: "1", alt: "customer" }),
  teacher: K(["teacher", "tutor"], { n: "1", plus: ["man-headshot-glasses", "woman-headshot-glasses"], alt: "headshot" }),
  students: K(["students", "graduate"], { not: ["travel"], alt: "reader" }),
  reader: K(["study", "notes", "student"], { n: "1", alt: "customer" }),
  doctor: K(["doctor", "nurse"], { n: "1", alt: "headshot" }),
  realtor: K(["realtor"], { n: "1", alt: "business" }),
  traveller: K(["traveler"], { alt: "customer" }),
  business: K(["business"], { n: "1", not: ["realtor", "student"], alt: "headshot" }),
  team: K(["team", "colleagues"], { n: "g", alt: "volunteers" }),
  fashion: K(["fashion"], { n: "1", alt: "customer" }),
  couple: K(["wedding", "bride"], { n: "2", alt: "lovers" }),
  lovers: K(["couple"], { n: "2", alt: "couple" }),
  child: K(["child"], { n: "1", alt: "family" }),
  family: K(["family"], { n: "g", alt: "friends" }),
  volunteers: K(["teamwork", "community", "friends"], { n: "g", not: ["concert", "students"], alt: "team" }),
  friends: K(["friends"], { n: "g", not: ["concert"], alt: "volunteers" }),
  gamer: K(["gamer"], { alt: "creator" }),
  beauty: K(["skincare"], { n: "1", alt: "fashion" }),
  salon: K(["salon", "stylist"], { alt: "beauty" }),
  musician: K(["musician"], { n: "1", alt: "creator" }),
  crowd: K(["concert"], { n: "g", alt: "friends" }),
  photographer: K(["photographer"], { n: "1", alt: "creator" }),
  support: K(["support"], { alt: "business" }),
  customer: K(["customer", "smiling", "happy", "casual"], { n: "1", not: ["business", "doctor", "nurse", "chef", "barista", "fashion", "child", "senior", "teacher"], alt: "headshot" }),
  senior: K(["senior", "elderly"], { n: "1", not: ["nurse", "doctor"], alt: "customer" }),
  headshot: K(["headshot"], { n: "1", alt: "business" }),
  phone: K(["phone"], { n: "1", alt: "customer" }),
  developer: K(["laptop"], { n: "1", plus: ["man-headshot-glasses", "man-arms-crossed-office", "young-businessman"], alt: "business" }),
  pair: K(["podcast", "students", "tutor", "support", "gamer", "backpack"], { n: "2", alt: "podcast" }),
  gamers: K(["gamer"], { n: "2", alt: "pair" }),
  tutoring: K(["tutor", "students"], { n: "2", alt: "pair" }),
};

function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const fitsN = (p, n) => { const c = p.people?.n || 1; return !n || (n === "1" ? c === 1 : n === "2" ? c === 2 : n === "g" ? c >= 3 : n === "2g" ? c >= 2 : true); };
// face points that are off in the library data (reported to the lead): kept out of person spots until fixed
const AVOID = new Set(["person-backpackers-map", "person-woman-showing-phone"]);
const LIST = new Map();
/** People photos of a kind (library order). kind = "chef" or "chef:f" / "chef:m" (only women / men). */
export function peopleOf(kind) {
  const [name] = String(kind || "").split(":");
  if (LIST.has(name)) return LIST.get(name);
  const d = KINDS[name];
  const out = d ? PEOPLE.filter((p) => !AVOID.has(p.id) && (p.tags?.some((t) => d.tags.includes(t)) || d.plus?.includes(p.id.replace(/^person-/, ""))) && fitsN(p, d.n) && !(d.not && p.tags?.some((t) => d.not.includes(t)))) : [];
  LIST.set(name, out);
  return out;
}
/**
 * One people photo for a person spot. kind: a KINDS name with an optional ":f" / ":m"; seed: the design id + spot.
 * o = { exclude: ids already in the design, prefer: "f" | "m" (soft: the other sex of the last person), shape: "L" | "P" (soft) }.
 */
export function person(kind, seed, { exclude = [], prefer = null, shape = null } = {}, depth = 0) {
  const [name, sx] = String(kind || "").split(":");
  const d = KINDS[name];
  let list = peopleOf(name).filter((p) => !exclude.includes(p.id));
  if (sx) list = list.filter((p) => p.people.sex === sx || p.people.sex === "mixed");
  if (!list.length) {
    if (d?.alt && depth < 3) return person(d.alt + (sx ? ":" + sx : ""), seed, { exclude, prefer, shape }, depth + 1);
    const p = pickPerson(`${name} ${sx === "f" ? "woman" : sx === "m" ? "man" : ""}`.trim(), seed, { exclude });
    return isPerson(p) ? p : null;
  }
  if (prefer && !sx) { const l = list.filter((p) => p.people.sex === prefer); if (l.length) list = l; }
  if (shape) { const l = list.filter((p) => (shape === "L") === (p.w >= p.h)); if (l.length) list = l; }
  return list[hash(String(seed) + "|" + kind) % list.length];
}
/**
 * Where to draw the whole people photo p so it covers the box x, y, w, h with the face at (tx, ty) of the box (0..1), as far
 * as the photo allows: zoom up to 1.4x, never past the photo's edges (the face always stays in the box). Draw it with
 * k.photo(p, b.x, b.y, b.w, b.h, { clip: <the box> }) (a box of the photo's own shape is drawn uncropped).
 */
export function faceBox(p, x, y, w, h, tx = 0.5, ty = 0.4) {
  const fx = p.fx ?? 0.5, fy = p.fy ?? 0.5, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  let r = null;
  for (const z of [1, 1.12, 1.25, 1.4]) {
    const s = Math.max(w / p.w, h / p.h) * z, dw = p.w * s, dh = p.h * s;
    const dx = cl(x + tx * w - fx * dw, x + w - dw, x), dy = cl(y + ty * h - fy * dh, y + h - dh, y);
    r = { x: dx, y: dy, w: dw, h: dh };
    if (Math.abs(dy + fy * dh - y - ty * h) < h * 0.06 && Math.abs(dx + fx * dw - x - tx * w) < w * 0.08) break;
  }
  return r;
}
/**
 * The people of one design: spots = [[key, kind], …] (the same key twice = the same person, e.g. a story's profile picture
 * on every frame). Returns { key: photo }. Different keys never get the same person; one-person kinds alternate women and men.
 */
export function cast(spots, seed, { shape = null } = {}) {
  const out = {}, used = [];
  let last = hash(seed) % 2 ? "m" : "f";
  for (const [key, kind, o = {}] of spots) {
    if (out[key] || !kind) continue;
    const p = person(kind, `${seed}|${key}`, { exclude: used, prefer: last === "f" ? "m" : "f", shape: o.shape ?? shape });
    if (!p) continue;
    out[key] = p; used.push(p.id);
    if (p.people?.n === 1 && p.people.sex !== "mixed") last = p.people.sex;
  }
  return out;
}
