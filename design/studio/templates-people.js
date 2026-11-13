// AsaanDesk Studio: people in the social posts, stories, covers, banners, thumbnails, photo collages and mugs (owner,
// 13 Nov: wherever Canva's templates show people, ours show a people photo of the same kind, crop and place; food,
// places, products and greetings stay as they are). Pure module (no DOM). Photos only from the shared library
// (../shared/photo-library.js), cropped around the face (templates-photos.js stockImage).
//
// A person spot is "kind words | needs": the kind words rank the library's people photos (pickPerson), the needs are
// what the photo must have: tags ("chef", "senior", "couple"…), "-tag" (must not have it), "f" / "m" (woman / man),
// "one" (one person), "two" (a pair), "group" (three or more). Different people inside one design; women and men in turn when the spot does not
// say which.
//   PRO_PEOPLE    single-page social templates laid out again by templates-pro.js: who their photos show.
//                 id -> { main, second, third }: spots for the composition's main photo and its second / third photo
//                 (diamond pair, polaroid pair, photo grid). null = a photo of the template's own subject (product,
//                 dish, place); a missing key = another person like the main one.
//   FRAME_PEOPLE  hand-made layouts (team posts, photo dumps, carousels, collages, photo mugs): spots for the person
//                 frames, given to the biggest frames first (equal frames: every other one, so people and places mix
//                 like a real album); a list as long as the frames = every frame in layer order (null = keep).
//   personHints(id)                PRO_PEOPLE entry or null (other template files may add theirs to PERSON_HINTS)
//   pickerFor(topic, seed)         (w, h, hint) -> photo: person spots as above, other hints as photoPicker
//   castPeople(design, id, topic)  fills FRAME_PEOPLE spots with people photos before the subject photos (in place)
import { photoPicker, stockImage } from "./templates-photos.js";
import { pickPerson, wantsPeople, isPerson, photoById as photoOf } from "../shared/photo-library.js";
import { walk } from "./model.js";

// Spots used in many templates.
const FASHION_W = "fashion model woman portrait | fashion f", FASHION_M = "fashion model man portrait | fashion m";
const CASUAL_W = "woman portrait smiling casual | f one casual close", CASUAL_M = "man portrait smiling casual | m one casual close";
const CUSTOMER = "happy customer portrait smiling | one customer close";
const FRIENDS = "friends group young people | friends -gamer -team -concert";
const PARTY = "friends party group fun | friends -team";
// A woman's portrait for quotes and lifestyle posts (not a doctor, chef, graduate… in a quote post).
const LIFESTYLE_W = "woman portrait lifestyle | f one portrait -doctor -nurse -medical -chef -business -graduate -teacher -senior -child -festive";
const PARENT_M = "father man portrait smiling | m one close smiling -graduate -teen -senior -doctor -chef";
const PARENT_F = "mother woman portrait smiling | f one close smiling -child -graduate -senior -doctor -nurse -teacher";
const COUPLE = "couple love portrait | couple love", WEDDING = "wedding couple bride groom | wedding couple";
const FAMILY = "family parents kids | family", CHILD = "child girl kids smiling | child one";
const TRAVELER = "traveler woman travel | traveler one", BABY = "family baby mother father | baby";
const TEAM_W = "business woman team member portrait | business f one close", TEAM_M = "business man team member portrait | business m one close";

export const PRO_PEOPLE = {
  // Instagram posts / stories / WhatsApp status: fashion and lifestyle models, hosts, customers, creators.
  "sale-post": { main: FASHION_W },
  "quote-post": { main: LIFESTYLE_W },
  "new-arrival-post": { main: FASHION_W, second: FASHION_M },
  "eid-post": { main: "woman festive eid south asian portrait | festive f" },
  "announcement-story": { main: "business woman portrait smiling | business f one" },
  "coming-soon-story": { main: FASHION_W },
  "whatsapp-offer-status": { main: "fashion woman shopping style | fashion" },
  "podcast-episode-post-x2": { main: "podcasters group microphone podcast | podcast" },
  "giveaway-post-x2": { main: "woman influencer phone smiling | phone f", second: null },
  "testimonial-post-x2": { main: CUSTOMER },
  "quote-card-ig-x3": { main: LIFESTYLE_W },
  "flash-sale-ig-x3": { main: FASHION_W, second: null, third: FASHION_M },
  "announcement-ig-x3": { main: "team colleagues smiling staff | team", second: null },
  "testimonial-ig-x3": { main: CUSTOMER, second: CUSTOMER },
  "giveaway-ig-x3": { main: "woman influencer phone smiling | phone f" },
  "holiday-greeting-ig-x3": { main: "family parents kids festive | family" },
  "season-sale-split-ig4": { main: FASHION_W, second: null },
  "birthday-photo-circle-ig4": { main: "woman smiling portrait birthday | f one casual" },
  "highlight-quote-ig4": { main: "woman laptop work lifestyle | laptop f" },
  "fashion-magazine-cover-ig4": { main: FASHION_W },
  "valentines-love-letter-ig5": { main: COUPLE, second: null, third: null },
  "kindness-day-statement-ig5": { main: "volunteers community hands together | volunteers", second: FRIENDS },
  "podcast-guest-episode-ig5": { main: "podcast guest man headshot portrait | m headshot" },
  "glass-cards-sale-3d": { main: FASHION_W },
  "isometric-tech-launch-3d": { main: "woman phone app mobile | phone f" },
  "glossy-orbs-quote-3d": { main: LIFESTYLE_W },
  "layered-paper-event-3d": { main: "speaker woman microphone event host | speaker f" },
  "pop-launch-motion": { main: "team colleagues startup celebrating | team" },
  "typewriter-quote-motion": { main: LIFESTYLE_W },
  "flash-sale-motion": { main: FASHION_W },
  // Facebook / LinkedIn / X: events, hiring, business.
  "workshop-facebook": { main: "workshop presenter speaker training | presenter" },
  "business-facebook-cover": { main: "business team colleagues office | team business" },
  "hiring-linkedin": { main: "business man portrait smiling employee | business m one" },
  "hiring-linkedin-x2": { main: "business woman portrait smiling employee | business f one" },
  "webinar-x-post-x2": { main: "speaker woman microphone webinar host | speaker f" },
  // YouTube thumbnails and channel art: the creator's face.
  "howto-youtube": { main: "creator youtuber woman recording course online | creator f", second: null, third: null },
  "vlog-youtube": { main: TRAVELER, second: null },
  "recipe-youtube-x2": { main: "chef man cooking | chef" },
  "cooking-channel-art": { main: "chef man smiling portrait | chef" },
};
/** Other template files may register person hints for their own pro templates here (same shape as PRO_PEOPLE). */
export const PERSON_HINTS = new Map(Object.entries(PRO_PEOPLE));
/** Who a pro composition's photos show ({ main, second, third }) or null (the template's subject). */
export const personHints = (id) => PERSON_HINTS.get(id) || null;

export const FRAME_PEOPLE = {
  // ---- Social: team, followers, coaches, hosts, models, musicians.
  "meet-team-ig-x3": ["business woman founder portrait | business f one close", TEAM_M, TEAM_W, TEAM_M],
  "hiring-ig-x3": ["business woman portrait smiling employee | business f one close"],
  "carousel-cover-ig-x3": [LIFESTYLE_W],
  "tips-cover-story-x2": [CASUAL_W],
  "10k-followers-thank-you-ig5": [CASUAL_W, CASUAL_M, CASUAL_W, CASUAL_M, CASUAL_W].map((s) => s.replace("portrait", "follower portrait")),
  "30-day-core-challenge-ig5": ["fitness trainer coach gym | fitness trainer"],
  "salon-glow-season-ig5": ["beauty skincare model woman | beauty f"],
  "pricing-webinar-signup-ig5": ["webinar host speaker portrait | speaker close"],
  "live-music-night-ig4": ["musician man guitar singer concert | musician"],
  "polaroid-photo-dump-ig4": [FRIENDS, CASUAL_W, CASUAL_M],
  "neutral-moodboard-ig4": [FASHION_W, FASHION_W],
  "film-strip-reel-ig4": [FRIENDS, COUPLE],
  "golden-hour-arches-ig4": [FASHION_W, CASUAL_W],
  // The cover (page 1, the gallery card) shows the photographer; the example pages keep their example photos.
  "photo-tips-carousel-ig4": ["photographer camera creator | photographer", null, null, null],
  "trip-recap-carousel-ig4": [TRAVELER, "backpackers friends travel | travel friends", "traveler woman portrait hat | traveler"],
  "scrapbook-photo-dump-ig4": [FRIENDS, CASUAL_W],
  "week-in-pictures-ig4": [CASUAL_W, FRIENDS],
  "linen-drop-carousel-ig4": [FASHION_W, FASHION_W, FASHION_M, FASHION_W, null],
  "wedding-moments-collage-ig4": [WEDDING, WEDDING],
  "behind-scenes-ig-x3": ["team colleagues work | team"],
  "stacked-photos-travel-3d": [TRAVELER],
  // ---- Photo collages: family, friends, couples, travellers, graduates (scenery and food cells stay).
  "four-photo-grid": [FRIENDS, CASUAL_W],
  "trip-trio-collage": [TRAVELER, "backpackers friends travel | travel friends"],
  "mosaic-collage": [FAMILY, CHILD, "senior couple grandparents | senior couple"],
  "nine-photo-grid": [FRIENDS, CASUAL_W, COUPLE, CASUAL_M, FASHION_W],
  "birthday-photo-collage": [CHILD, PARTY, FAMILY],
  "wedding-album-collage": [WEDDING, WEDDING, WEDDING],
  "travel-moodboard-collage": [TRAVELER, TRAVELER],
  "family-grid-collage-x2": [FAMILY, FAMILY, FAMILY, "senior couple grandparents | senior couple"],
  "year-recap-collage-x2": [FRIENDS, COUPLE, FAMILY, CASUAL_W, "graduate student | graduate"],
  "baby-milestones-collage-x2": [BABY, CHILD, FAMILY],
  "event-highlights-collage-x2": ["speaker conference stage | speaker", "conference audience crowd | audience", "team colleagues smiling | team", "speaker woman microphone | speaker f"],
  "friends-strip-collage-x2": [FRIENDS, FRIENDS],
  "polaroid-wall-collage-x7": [FRIENDS, COUPLE, CASUAL_W],
  "film-strip-collage-x7": [FRIENDS, COUPLE],
  "heart-centre-collage-x7": [COUPLE, COUPLE],
  "magazine-cover-collage-x7": [FASHION_W, FASHION_M],
  "seven-mosaic-collage-x7": [FRIENDS, CASUAL_W, COUPLE, FAMILY],
  "stacked-duo-collage-x7": [COUPLE],
  "circle-cluster-collage-x7": [CASUAL_W, CASUAL_M, CHILD],
  "nine-border-collage-x7": [FRIENDS, CASUAL_W, COUPLE, FAMILY, CASUAL_M],
  "scrapbook-collage-x7": [FRIENDS, COUPLE],
  "couple-split-heart-lc2": [COUPLE, COUPLE],
  "shop-the-look-mosaic-lc2": [FASHION_W, FASHION_M],
  "vision-board-captions-lc2": ["woman laptop work | laptop f", "yoga woman fitness | yoga"],
  "kraft-scrapbook-tape-lc2": [FRIENDS, COUPLE],
  "heart-of-circles-lc2": [COUPLE, COUPLE, CASUAL_W, CASUAL_M, FRIENDS, FAMILY, COUPLE, CHILD],
  "graduation-photo-wreath-lc2": ["graduate woman diploma graduation | graduate f", "graduate man graduation | graduate m", "students campus friends | students", "graduate reading diploma | graduate", FAMILY, "students friends study | students"],
  "photo-book-spread-lc2": [FAMILY, COUPLE],
  // A pile: the top polaroid (last layer) is the one you see.
  "polaroid-stack-pile-lc2": [null, CASUAL_W, null, FRIENDS],
  // Grandpa, Grandma, Dad, Mum, Aunt, Uncle, then the children (Zara, Me, Omar, Lina, Sami).
  "family-tree-photos-lc2": ["grandfather senior man portrait | senior m one close -business", "grandmother senior woman portrait | senior f one close -nurse -business", PARENT_M, PARENT_F, PARENT_F.replace("mother", "aunt"), PARENT_M.replace("father", "uncle"), "young woman portrait smiling | f one young -child", "young man portrait smiling | m one young -teen", "teen boy portrait | m one teen", CHILD, "young man portrait casual | m one young -teen -business"],
  "year-review-months-lc2": [FRIENDS, COUPLE, FAMILY, CASUAL_W, TRAVELER, "graduate student | graduate"],
  "photo-booth-strips-lc2": [FRIENDS, CASUAL_W, CASUAL_M, COUPLE, CASUAL_W, CASUAL_M, COUPLE, FRIENDS, CASUAL_W, CASUAL_M, CHILD, "teen boy portrait | m teen"],
  "holiday-title-collage-wb": [FAMILY, FRIENDS],
  "polaroid-wall-collage-wb": [FRIENDS, COUPLE, CASUAL_W],
  "circle-photos-collage-wb": [CASUAL_W, CASUAL_M, CHILD],
  "mosaic-memories-collage-wb": [FRIENDS, COUPLE, FAMILY],
  "nine-square-grid-collage-wb": [FRIENDS, CASUAL_W, COUPLE, FAMILY, CASUAL_M],
  "wedding-frame-collage-wb": [WEDDING, WEDDING, WEDDING],
  "six-photo-baby-album-collage-wb": [BABY, CHILD, FAMILY],
  "big-feature-with-corners-collage-wb": [COUPLE, FRIENDS],
  // ---- Photo mugs: couples, friends and family (the pet mug keeps its pet).
  "couple-photos-mug-me2": [COUPLE, COUPLE],
  "three-photo-strip-mug-me2": [FRIENDS, FAMILY],
  "filmstrip-photo-mug-me2": [FRIENDS, COUPLE, CASUAL_W],
};

function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const SEX_WORD = /\b(?:woman|women|girl|lady|bride|mother|grandmother|aunt|man|men|boy|guy|groom|father|grandfather|uncle)\b/i;
/** True when a hint is a person spot ("kind words | needs" or words that name a person). */
export const isPersonSpot = (hint) => !!hint && (String(hint).includes("|") || wantsPeople(hint));
/** Does a people photo meet a spot ("kind words | needs")? (tests) */
export const meetsSpot = (p, spot) => !!p?.people && meets(p, String(spot).split("|")[1]?.trim().split(/\s+/).filter(Boolean) || []);
/** Does a people photo meet a spot's needs? */
function meets(p, need) {
  const pe = p.people || {};
  return need.every((t) => (t[0] === "-" ? !(p.tags || []).includes(t.slice(1)) : t === "close" ? /^(head|half)$/.test(pe.shot) : t === "f" || t === "m" ? pe.sex === t : t === "one" ? pe.n === 1 : t === "two" ? pe.n === 2 : t === "group" ? pe.n >= 3 : (p.tags || []).includes(t)));
}
/**
 * Picks people photos for one design: (w, h, spot) -> photo. Spots are "kind words | needs" (see the top). The kind
 * words with the template's topic rank the photos; the first photo (in the library's order for that seed) that meets
 * the needs wins, so a "chef" spot always shows a chef.
 */
export function personPicker(topic, seed) {
  const used = new Set();
  let n = 0;
  return (w, h, spot) => {
    const [words, needs = ""] = String(spot).split("|");
    const need = needs.trim().split(/\s+/).filter(Boolean);
    const ar = w / Math.max(1, h), landscape = ar > 1.2 ? true : ar < 0.83 ? false : null;
    const fixed = need.includes("f") ? "f" : need.includes("m") ? "m" : null;
    // Women and men in turn when the spot does not say (couples and groups ignore it).
    const sex = fixed || (SEX_WORD.test(words) ? null : (hash(seed) + n) % 2 ? "m" : "f");
    const kind = `${words.trim()} ${topic}`;
    // Walk down the ranking (pickPerson picks among the best photos not yet seen) and keep the first few that meet
    // the needs; the seed picks one of them, so templates with the same spot show different people.
    const walkFor = (taken) => {
      const seen = [], good = [];
      for (let s = 0; s < 160 && good.length < 4; s++) {
        const c = pickPerson(kind, `${seed}:${n}`, { exclude: [...taken, ...seen], landscape, ...(sex ? { sex } : {}) });
        if (!c || !isPerson(c) || seen.includes(c.id) || taken.includes(c.id)) break;
        seen.push(c.id);
        if (meets(c, need)) good.push(c);
      }
      return { good, first: seen.length ? photoOf(seen[0]) : null };
    };
    // Every matching photo already used in this design: the right kind again rather than another kind.
    let w1 = walkFor([...used]);
    if (!w1.good.length) { const w2 = walkFor([]); if (w2.good.length) w1 = w2; }
    const p = w1.good.length ? w1.good[hash(`${seed}:${n}:${spot}`) % w1.good.length] : w1.first || pickPerson(kind, `${seed}:${n}`, { landscape });
    n++;
    used.add(p.id);
    return p;
  };
}
/** Picker for a pro composition: person spots get people photos (personPicker), other hints photoPicker's photos. */
export function pickerFor(topic, seed) {
  const things = photoPicker(topic, seed), people = personPicker(topic, `${seed}:people`);
  return (w, h, hint = "") => (isPersonSpot(hint) ? people(w, h, hint) : things(w, h, hint));
}

/** Frames that take people, in the order the spots are given: biggest first, equal ones every other one. */
function spotsFor(frames, n) {
  if (n >= frames.length) return frames.slice();
  const order = (i) => (i % 2 ? frames.length + i : i);
  return frames.map((f, i) => [f, i])
    .sort((a, b) => Math.round((b[0].w * b[0].h) / 400) - Math.round((a[0].w * a[0].h) / 400) || order(a[1]) - order(b[1]))
    .slice(0, n).map(([f]) => f);
}
/**
 * Fills the person spots of a hand-made layout (FRAME_PEOPLE) with people photos, in place, before the template's
 * other frames get their subject photos. Frames that already show a photo are kept. Returns the number filled.
 */
export function castPeople(design, id, topic) {
  const spots = FRAME_PEOPLE[id];
  if (!spots?.length) return 0;
  const frames = [];
  for (const pg of design.pages) for (const [l] of walk(pg.layers)) if (l.type === "frame" && !l.frame.image) frames.push(l);
  if (!frames.length) return 0;
  const pick = personPicker(topic, `${id}:people`);
  let n = 0;
  spotsFor(frames, spots.length).forEach((l, i) => {
    if (!spots[i]) return;
    l.frame.image = stockImage(pick(l.w, l.h, spots[i]), l.w, l.h);
    n++;
  });
  return n;
}
