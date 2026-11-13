// AsaanDesk Studio templates: real photos in every photo frame (owner: no empty "Drop a photo" boxes in any
// thumbnail or opened template). Photos come only from the shared library (CC0 / public domain, credits in
// /pdf-editor/photos/CREDITS.md), picked by the template's subject with the template id + slot as seed, so a
// template always shows the same photos. Pure module (no DOM).
//   fillPhotos(design, topic, seed)  fills every empty frame (in place); the photo stays a normal frame photo
//                                     (Replace / crop / remove work as for the user's own photos)
//   photoPicker(topic, seed)          (w, h, hint) -> photo record, different photos inside one design
//   stockImage(photo, w, h)           frame.image for a library photo, cover-cropped to a w × h frame
//   thumbUrlOf(src)                   the small copy of a library photo (gallery thumbnails never load full size)
import { pickPhoto, pickPerson, wantsPeople, isPerson, focusCrop, photoUrl, PHOTOS, PEOPLE, PHOTO_BASE } from "../shared/photo-library.js";
import { coverCrop } from "./shapes.js";
import { walk } from "./model.js";

const THUMB = new Map([...PHOTOS, ...PEOPLE].map((p) => [PHOTO_BASE + p.file, PHOTO_BASE + p.thumb]));
/** URL of the thumbnail copy of a library photo (other sources unchanged). */
export const thumbUrlOf = (src) => THUMB.get(src) || src;
/** True for a photo that came from the library (uploading photos replaces these, like empty frames). */
export const isStock = (img) => !!img?.stock;

/** frame.image for a library photo, cover-cropped (with an optional focus 0..1 inside the spare area). People photos
 *  are cropped around the face unless a focus is given. */
export function stockImage(p, w, h, focus = null) {
  if (!focus && isPerson(p)) return { src: photoUrl(p, "full"), nw: p.w, nh: p.h, crop: focusCrop(p, w, h), stock: true, person: true };
  const crop = coverCrop(p.w, p.h, w, h);
  if (focus) {
    if (focus.x != null && crop.w < 1) crop.x = (1 - crop.w) * focus.x;
    if (focus.y != null && crop.h < 1) crop.y = (1 - crop.h) * focus.y;
  }
  return { src: photoUrl(p, "full"), nw: p.w, nh: p.h, crop, stock: true };
}

// Template words -> photo subjects: library themes (best first) and photo tags. First match wins.
const SUBJECTS = [
  ["eid", /\b(eid|ramadan|mosque|mubarak|iftar|chand)/, ["pakistan", "celebration"], ["mosque", "lantern", "eid", "lights"]],
  ["wedding", /wedding|bride|nikah|shadi|walima|engagement|anniversary|valentine|romance|bridal/, ["celebration", "flowers"], ["wedding", "rings", "bride", "roses", "bouquet"]],
  ["party", /birthday|party|celebrat|giveaway|milestone|thank|congrat|graduation|baby|shower|new year|christmas|diwali|festival|salgirah/, ["celebration", "flowers"], ["party", "balloons", "cake", "confetti", "celebration", "gift"]],
  ["food", /food|recipe|menu|\bcafe|\bbake|restaurant|karahi|pasta|chef|bakery|brunch|dessert|\bcake|pizza|burger|kitchen|\bcook|\bdish|meal|biryani|bbq|khana|dhaba|grill|snack|lunch|dinner/, ["food", "restaurant", "coffee"], ["food", "dish", "meal", "restaurant", "plate", "bread", "fruit"]],
  ["coffee", /coffee|\bchai\b|\btea\b|espresso|latte/, ["coffee", "food"], ["coffee", "cafe", "tea", "espresso", "cup"]],
  ["fitness", /fitness|\bgym|workout|\brun\b|running|yoga|\bsport|marathon|football|cricket|trainer|\bcore\b|athlet/, ["fitness", "sport"], ["gym", "fitness", "running", "yoga", "sport", "workout"]],
  ["beauty", /beauty|salon|\bspa\b|\bskin|serum|\bglow|makeup|\bnail|\bhair|cosmetic/, ["beauty", "fashion", "flowers"], ["beauty", "spa", "salon", "skincare", "cosmetics"]],
  ["fashion", /fashion|\bsale\b|\bshop\b|\bshopping|discount|\boffer\b|arrival|collection|boutique|clothes|\btote\b|apparel|black friday|\bflash\b|\bdeal\b|\bstore\b|riyayat/, ["fashion", "beauty", "textures"], ["fashion", "shopping", "clothes", "boutique", "store", "bags"]],
  ["home", /real estate|\bhome\b|\bhouse|property|listing|interior|apartment|\bmoved\b|furniture|\bdecor|cleaning/, ["interior", "architecture"], ["interior", "home", "living", "house", "room", "sofa"]],
  ["travel", /travel|\btrip\b|\btour\b|vacation|holiday|beach|hunza|lisbon|postcard|escape|island|hotel|flight|safar|adventure/, ["travel", "sea", "mountains", "pakistan"], ["travel", "beach", "mountain", "sea", "road"]],
  ["medical", /doctor|clinic|medical|hospital|dental|health|pharma|nurse|\bcare\b|blood/, ["medical"], ["doctor", "clinic", "medical", "hospital", "health"]],
  ["education", /school|lesson|\bclass\b|study|tuition|education|course|student|teacher|\bbook|library|science|\bkids\b|admission|lecture|exam/, ["education", "workspace"], ["books", "classroom", "school", "study", "chalkboard", "library"]],
  ["music", /music|concert|\bnight\b|\blive\b|\bdj\b|qawwali|\bband\b|\bgig\b|open mic|karaoke|dance/, ["celebration", "abstract", "city"], ["concert", "music", "night", "lights", "stage"]],
  ["pets", /\bpet\b|\bpets\b|\bdog\b|\bcat\b|adopt|animal|\bvet\b|puppy/, ["animals"], ["dog", "cat", "pet", "animal"]],
  ["nature", /garden|plant|\beco\b|nature|\bgreen\b|earth|climate|organic|\bfarm|clean.?up|volunteer|tree/, ["nature", "forest", "flowers"], ["nature", "forest", "garden", "plants", "leaves"]],
  ["tech", /podcast|episode|\btech\b|\bapp\b|software|\bcode|coding|\bpdf\b|digital|developer|webinar|online|\blaunch|release|\bai\b|\bdata\b|hackathon|gaming/, ["tech", "abstract", "workspace", "office"], ["laptop", "computer", "code", "tech", "phone"]],
  ["business", /hiring|\bjob|career|\bteam\b|recruit|linkedin|workshop|meetup|conference|summit|business|corporate|company|consult|agency|marketing|proposal|report|strategy|pitch|startup|finance|meeting|seminar|networking|office|\bceo\b|leadership/, ["meeting", "business", "office", "workspace"], ["office", "meeting", "laptop", "team", "desk", "workspace", "business"]],
  ["quote", /quote|motivation|kindness|monday|reminder|\bwords\b|thought|inspir|mindful|wellness/, ["sky", "abstract", "nature", "flowers"], ["sunrise", "sky", "flowers", "calm"]],
  ["city", /news|announcement|coming soon|opening|branch|\bcity\b|summer|season/, ["city", "architecture", "business", "sky"], ["city", "skyline", "building", "street"]],
];
const FALLBACK = ["city", "office", "nature", "sky", "architecture"];
const AVOID = { party: /^(wedding|rings|engagement|marriage|shaadi)$/, wedding: /^(birthday|kids|balloons|christmas)$/, eid: /^(christmas|wedding|rings)$/, food: /^(medical|pills)$/ };
function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const subjectOf = (text) => SUBJECTS.find(([, re]) => re.test(String(text || "").toLowerCase())) || null;
/** Subject words for a template text (also used by the gallery's filters and tests). */
export function photoTopic(text) { const s = subjectOf(text); return s ? `${s[0]} ${s[2].join(" ")}` : String(text || ""); }
/** Library photos for a subject, best theme first (a stable order). */
const POOL = new Map();
function poolFor(s) {
  const key = s ? s[0] : "_";
  if (POOL.has(key)) return POOL.get(key);
  const themes = s ? s[2] : FALLBACK, tags = s ? s[3] : [];
  // Desk close-ups and plain textures go last: they suit few templates as the main photo.
  const weak = (p) => (/^(binder-clip-desk|ballpoint-pen-notebook|silicon-wafer-chips|circuit-board|keyboard-keys-closeup|weathered-wood-planks|white-marble|blue-pills|syringe|thread-spools)$/.test(p.id) ? 20 : 0);
  // Photos about another occasion (rings on a birthday, balloons at a wedding) go last too.
  const avoid = s ? AVOID[s[0]] : null;
  const rank = (p) => {
    const ti = themes.indexOf(p.theme), hits = (p.tags || []).filter((t) => tags.includes(t)).length;
    if (ti < 0 && !hits) return 999;
    return (ti >= 0 ? ti * 10 : themes.length * 10) - Math.min(4, hits) * 2 + weak(p) * 10 + (avoid && (p.tags || []).some((t) => avoid.test(t)) ? 150 : 0);
  };
  const ranked = PHOTOS.map((p) => [rank(p), p]).filter(([r]) => r < 999).sort((a, b) => a[0] - b[0] || (a[1].id < b[1].id ? -1 : 1));
  // Photos about another occasion and desk close-ups only when the subject has too few others.
  const good = ranked.filter(([r]) => r < 100);
  const list = (good.length >= 6 ? good : ranked).map(([, p]) => p);
  POOL.set(key, list);
  return list;
}
/**
 * Picks photos for a design's frames: by the frame's own subject (a "Team photo", "Food photo") or else the template's,
 * different photos inside one design while the subject has enough, the right orientation when it can.
 */
export function photoPicker(topic, seed) {
  const used = new Set();
  const base = subjectOf(topic);
  const words = new Set(String(topic || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !/^(post|story|instagram|facebook|template|photo|photos|card|flyer|poster|print|design|with|your|from|this|that|social|thumbnail|banner|cover)$/.test(w)));
  let i = 0, nPeople = 0;
  return (w, h, hint = "") => {
    const k = i++;
    const ar = w / Math.max(1, h), want = ar > 1.2 ? "land" : ar < 0.83 ? "port" : null;
    // A person spot (team member, speaker, testimonial, model, doctor…): a people photo of that kind, different people
    // inside one design, women and men in turn when the hint does not say which.
    if (hint && wantsPeople(hint)) {
      const kind = `${hint} ${topic}`;
      // (the sex is ignored by pickPerson for group and couple photos)
      const sexOpen = !/\b(?:woman|women|girl|lady|bride|man|men|boy|guy|groom)\b/i.test(hint);
      const p = pickPerson(kind, `${seed}:${k}`, { exclude: [...used], landscape: want ? want === "land" : null, ...(sexOpen ? { sex: (hash(String(seed)) + nPeople) % 2 ? "m" : "f" } : {}) });
      nPeople++;
      used.add(p.id);
      return p;
    }
    const s = (hint && subjectOf(hint)) || base;
    let list = poolFor(s);
    if (list.length < 3) { const p = pickPhoto(`${topic} ${hint}`, `${seed}:${k}`, { exclude: [...used], landscape: want ? want === "land" : null }); used.add(p.id); return p; }
    // The best themes first: keep the pool to the first ~10 photos so a subject's main photos lead.
    list = list.slice(0, Math.max(6, Math.min(list.length, 12)));
    let free = list.filter((p) => !used.has(p.id));
    if (!free.length) free = list;
    if (want) { const o = free.filter((p) => (p.w >= p.h) === (want === "land")); if (o.length) free = o; }
    // Photos tagged with the template's own words (christmas, balloons, pizza...) first.
    const exact = free.filter((p) => p.tags?.some((t) => words.has(t)));
    if (exact.length) free = exact;
    const p = free[hash(`${seed}:${k}`) % free.length];
    used.add(p.id);
    return p;
  };
}

/** True when the library has photos of people (team slides use them; otherwise they show initials). */
export const hasPeople = () => PEOPLE.length > 0;

/** Fills every empty photo frame of a design with a library photo (in place). Returns the number filled. */
export function fillPhotos(design, topic, seed) {
  const pick = photoPicker(topic, seed);
  let n = 0;
  for (const pg of design.pages) for (const [l] of walk(pg.layers)) {
    if (l.type !== "frame" || l.frame.image) continue;
    l.frame.image = stockImage(pick(l.w, l.h, /photo|frame/i.test(l.name || "") ? l.name.replace(/photo|frame|\d+/gi, "") : ""), l.w, l.h);
    n++;
  }
  return n;
}
