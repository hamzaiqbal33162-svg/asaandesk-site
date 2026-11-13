// AsaanDesk Studio: the person spots of the presentation decks, print designs (flyers, posters, brochures,
// invitations) and business cards (owner, 13 Nov: wherever Canva's templates show people, ours show a people photo
// of the same kind, crop and place; places, food and products stay as they are). Pure module (no DOM).
// Photos only from the shared library (../shared/photo-library.js), cropped around the face (templates-photos.js
// stockImage); the frames stay normal photo frames the user can Replace or crop.
//   castFor(seed)                     person picker for one design (seed = template id): (kind, w, h, o) -> people
//                                     photo record; never the same person twice in one design. o: { sex, group, shot }
//   face(cast, frame, kind, o)        puts a people photo of that kind into a photo frame (in place, returns it)
//   member(cast, frame, name, role, o) a team member's portrait: the first name says woman or man, the role the kind
//                                     (doctor, nurse, chef, teacher, student, athlete…; a business professional
//                                     otherwise, or o.base). o.sex overrides the name.
//   sexOf(name)                       "f" | "m" | null from a first name or title (Ms., Mr., Aunt…)
//   kindOfRole(role)                  kind words for a role text, or null
import { pickPerson, PEOPLE } from "../shared/photo-library.js";
import { stockImage } from "./templates-photos.js";
import { PERSON_HINTS } from "./templates-people.js";

// Single-page posters and invitations laid out again by templates-pro.js: who their photos show (spots "kind words |
// needs", see templates-people.js; second / third null = the template's own subject). Canva's posters show a person in
// about 4 of 10 (wanted / missing portraits, performers, models under big type), its invitations about 1 in 7 (the
// couple on a save-the-date, the birthday child).
export const PRO_PRINT_PEOPLE = {
  "wanted-reward-poster-pr2": { main: "fashion man leather street portrait | m one", second: null, third: null },
  "bass-drop-dj-poster-pr2": { main: "musician dj music man | m one musician", second: null, third: null },
  "comedy-night-poster-x4": { main: "speaker host man stage microphone | m one speaker", second: null, third: null },
  "jazz-night-poster-x4": { main: "musician guitar music singer | one musician", second: null, third: null },
  "concert-poster": { main: "musician guitar singer concert | one musician", second: null, third: null },
  "startup-weekend-poster": { main: "young presenter startup pitch team | group presenter", second: null, third: null },
  "summer-camp-poster-x4": { main: "kids friends teens youth young | group kids -teacher", second: null, third: null },
  "film-night-poster": { main: "fashion woman portrait style | f one fashion", second: null, third: null },
  "theatre-play-poster-pr2": { main: "fashion man portrait style | m one close", second: null, third: null },
  "art-exhibition-poster": { main: "fashion model woman portrait | f one fashion", second: null, third: null },
  "save-the-date-invitation": { main: "wedding couple love bride groom | two wedding", second: null, third: null },
  "engagement-invitation": { main: "couple love engagement young | two couple -wedding -senior", second: null, third: null },
  "kids-party-invitation": { main: "child kids girl smiling party | one child", second: null, third: null },
};
for (const [id, v] of Object.entries(PRO_PRINT_PEOPLE)) PERSON_HINTS.set(id, v);

// Photos of a single child: only for spots that ask for children (an adult customer or team member never shows a child).
const CHILDREN = PEOPLE.filter((p) => p.people?.n === 1 && p.tags.some((t) => /^(child|kids|baby)$/.test(t))).map((p) => p.id);
const WANTS_CHILD = /\b(child|children|kids?|baby|babies|boy|girl|family)\b/i;

function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// First names used in our templates (and common ones) -> woman / man. Unknown names alternate inside a design.
const WOMEN = new Set(("hana lucia lucía mia sofia aisha ayesha nadia grace maya ama lena priya elena zara lily rosa tasha helen aiko fatima anna mei sara ellie rina jade lin " +
  "ava amara eleanor isla nina sophie clara ingrid hannah elsa zoe noor emi layla nell bea june giulia ines ana lea yui jen lina hina sana maria emma lucy amelia olivia " +
  "chloe sarah fiona leila mariam ayla yasmin nora alice julia laura emily jessica rachel kate hira mahnoor iqra amna saba zainab aya ana lena noor nadia").split(" "));
const MEN = new Set(("omar daniel ravi tom leo sam jonah ken marcus ben joel david samuel jonas kwame kofi erik marco raj rahul julian callum oliver henry mateo yusuf " +
  "josh ollie james kai owen felix marc mo dev karim max tomas johannes johann peter luis ali bilal imran kamran mark ahmed noah kenji hamza adam michael john william " +
  "ryan alex lucas ethan liam jack harry usman asad faisal zain hassan bashir tariq will").split(" "));
/** "f" | "m" | null from a name ("Dr. Hana Brooks", "Mr. Osei", "LENA KOVAC", "Lily (Year 12)"). */
export function sexOf(name) {
  const words = String(name || "").toLowerCase().replace(/[^a-záéíóúñü\s.]/g, " ").split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (/^(ms|mrs|miss|madam|aunt|auntie|lady|sister|mother|mom|grandma)\.?$/.test(w)) return "f";
    if (/^(mr|sir|uncle|brother|father|dad|grandpa)\.?$/.test(w)) return "m";
    if (/^(dr|prof)\.?$/.test(w)) continue;
    if (WOMEN.has(w)) return "f";
    if (MEN.has(w)) return "m";
    return null;
  }
  return null;
}

// Kinds of person in the library's own tag words (photo-library.js pickPerson), so the right photos lead clearly.
export const KIND = {
  business: "business professional office portrait",
  senior: "senior business professional executive portrait",
  doctor: "doctor medical clinic hospital health portrait",
  nurse: "nurse medical clinic hospital health care",
  chef: "chef cook restaurant kitchen food",
  barista: "barista cafe coffee restaurant staff",
  child: "child kids girl smiling",
  student: "student young smiling portrait",
  teacher: "teacher tutor education school portrait",
  fitness: "fitness gym workout trainer sport",
  traveller: "travel traveler trip vacation holiday",
  young: "young smiling portrait casual",
  speaker: "speaker presenter conference host seminar",
  musician: "musician guitar music singer artist",
  customer: "customer happy smiling portrait",
  beauty: "beauty skincare spa salon woman",
  couple: "couple love wedding",
  team: "team colleagues business office meeting",
};
// Role words (and "Grade 6" / "Year 12" in a name) -> the kind of person. First match wins.
const ROLE_KINDS = [
  [/\b(physician|doctor|surgeon|dentist|dietitian|gp|paediatrician|pediatrician)\b/i, KIND.doctor],
  [/\bnurse/i, KIND.nurse],
  [/\b(chef|cook|pastry|sauces|baker)\b/i, KIND.chef],
  [/\bbarista\b/i, KIND.barista],
  [/\bgrade [1-8]\b|\bkids?\b|\bchild\b/i, KIND.child],
  [/\b(year \d+|student|pupil|narrator|sixteen|teen)\b/i, KIND.student],
  [/\b(professor|lecturer|supervisor|dean|principal|chair)\b/i, KIND.senior],
  [/\b(guide|kayak|hiking|explorer)\b/i, KIND.traveller],
  [/\b(teacher|tutor|librarian|teaching|mentor|facilitator|instructor)\b/i, KIND.teacher],
  [/\b(player|scorer|defender|athlete|captain|coach|improved|trainer|goalkeeper)\b/i, KIND.fitness],
  [/\b(swimming|games|crafts|nature walks|songs|camp)\b/i, KIND.young],
  [/\b(maid of honour|best man|father of the bride|bride|groom|guest)\b/i, KIND.business],
  [/\b(host|speaker|presenter|keynote|mc)\b/i, KIND.speaker],
  [/\b(musician|singer|singing|guitar|violin|cello|drums|ukulele|choir|band|dj)\b/i, KIND.musician],
];
/** Kind words for a role text ("Lead physician", "HEAD CHEF", "Class teacher"…) or null. */
export function kindOfRole(role) { const r = ROLE_KINDS.find(([re]) => re.test(String(role || ""))); return r ? r[1] : null; }
// The tags a photo needs to really be that kind, and the kind to use when none of that kind is left (a man teacher, a
// second woman in a café): [tags, fallback kind].
const NEED = new Map([
  [KIND.doctor, [["doctor", "nurse", "medical"], KIND.business]],
  [KIND.nurse, [["nurse", "doctor", "medical"], KIND.business]],
  [KIND.chef, [["chef", "cook", "barista"], KIND.young]],
  [KIND.barista, [["barista", "chef", "cafe"], KIND.young]],
  [KIND.teacher, [["teacher", "tutor"], KIND.business]],
  [KIND.traveller, [["travel", "traveler"], KIND.young]],
  [KIND.fitness, [["fitness", "yoga", "gym", "sport"], KIND.young]],
  [KIND.speaker, [["speaker", "presenter", "host"], KIND.business]],
  [KIND.musician, [["musician", "guitar", "singer"], KIND.young]],
  [KIND.beauty, [["beauty", "skincare", "salon", "spa"], KIND.young]],
  [KIND.child, [["child", "kids", "teen"], KIND.young]],
]);
// Graduation-gown photos only where the spot is about students or graduates (a teacher or a manager is not in a gown).
const GOWNS = PEOPLE.filter((p) => p.tags.includes("graduation")).map((p) => p.id);
const WANTS_GOWN = /\b(student|students|graduate|graduates|graduation|alumni|class of)\b/i;

/** Person picker for one design (seed = template id): different people inside one design, women and men in turn when
 *  neither the kind nor the caller says which. */
export function castFor(seed) {
  const used = [];
  let i = 0, alt = hash(seed) % 2;
  const cast = (kind, w, h, o = {}) => {
    const ar = w / Math.max(1, h);
    const once = (k) => pickPerson(k, `${seed}:${i}`, { exclude: [...used, ...(WANTS_CHILD.test(k) ? [] : CHILDREN), ...(WANTS_GOWN.test(k) ? [] : GOWNS)], landscape: ar > 1.2 ? true : ar < 0.83 ? false : null, sex: o.sex || null, shot: o.shot || null, group: o.group ?? null });
    let p = once(kind);
    // Not that kind of person (the library has none left for this sex): a close kind instead of a random face.
    const need = NEED.get(kind);
    if (need && !o.group && !p.tags.some((t) => need[0].includes(t))) p = once(need[1]);
    i++;
    used.push(p.id);
    return p;
  };
  /** The next sex in turn (for people the name does not tell). */
  cast.turn = () => (alt++ % 2 ? "m" : "f");
  return cast;
}
/** Puts a people photo of `kind` into photo frame f (in place; returns f). */
export function face(cast, f, kind, o = {}) {
  f.frame.image = stockImage(cast(kind, f.w, f.h, o), f.w, f.h);
  return f;
}
/** A team member's portrait in frame f: sex from the name (o.sex wins), kind from the role or a "Grade 6" / "Year 12"
 *  in the name (o.base otherwise, a business professional by default). */
export function member(cast, f, name, role, o = {}) {
  const group = !!o.group;
  const sex = group ? null : o.sex || sexOf(name) || cast.turn();
  const kind = o.kind || kindOfRole(`${role || ""} ${name || ""}`) || o.base || KIND.business;
  return face(cast, f, kind, { sex, group });
}
