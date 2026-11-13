// Text to speech voiceover: voice script templates (pure module, no DOM), built by a generator:
// hand-written script LAYOUTS (structures) x own colour PALETTES (thumbnails) x content THEMES (purposes / industries).
// Ids encode the combination ("radio-ad~p03~fitness"); byId(id) and thumb(id) rebuild any of them from the id.
// Used by the editor's Templates panel and by the intro page. All scripts and artwork are our own; photos come from the
// shared library (CC0 / public domain). Each structure has three card designs (studio card, captions, script page).
import { kit, fit as fitT, text, headline, rect, circle, pathEl, line, icon, isDark, mix as mix6, textW, pickPhoto, hash } from "../shared/tpl-kit.js";
import { PHOTOS } from "../shared/photo-library.js";

/** Content themes: who the script is for, with matching words. */
const THEMES = [
  { key: "shop", label: "Shop", org: "Corner Store", aud: "shoppers", offer: "twenty percent off all shoes", product: "the new everyday backpack", place: "store", event: "the Weekend Mega Sale", when: "this Saturday and Sunday", cta: "Come in today or order online", topic: "choosing the right backpack", hours: "nine to nine, every day", person: "Omar" },
  { key: "clinic", label: "Clinic", org: "Green Leaf Clinic", aud: "patients", offer: "free blood pressure checks", product: "online appointment booking", place: "clinic", event: "Health Check Day", when: "next Tuesday from nine to five", cta: "Book your visit on our website", topic: "simple habits for a healthy heart", hours: "nine to six, Monday to Saturday", person: "Dr. Amina" },
  { key: "school", label: "School", org: "Bright Path School", aud: "parents and students", offer: "a free trial week for new students", product: "the new science lab", place: "school", event: "the Annual Science Fair", when: "this Friday at ten in the morning", cta: "Visit our website to sign up", topic: "how plants make their food", hours: "eight to two, Monday to Friday", person: "Ms. Lina" },
  { key: "restaurant", label: "Restaurant", org: "Olive and Thyme", aud: "food lovers", offer: "a free dessert with every family meal", product: "our new lunch menu", place: "restaurant", event: "Live Music Night", when: "every Thursday at eight", cta: "Reserve your table tonight", topic: "how we bake our bread every morning", hours: "noon to eleven", person: "Chef Marco" },
  { key: "fitness", label: "Fitness", org: "PeakFit Gym", aud: "members", offer: "your first month for half price", product: "the new morning workout class", place: "gym", event: "Fitness Challenge Week", when: "starting next Monday", cta: "Sign up at the front desk", topic: "warming up the right way", hours: "six in the morning to ten at night", person: "Coach Nina" },
  { key: "realestate", label: "Real estate", org: "Keystone Homes", aud: "home buyers", offer: "no agent fees this month", product: "three-bedroom homes near the park", place: "show home", event: "our Open House", when: "Saturday from ten to four", cta: "Call us to book a viewing", topic: "five questions to ask before you buy", hours: "nine to six", person: "Daniel" },
  { key: "tech", label: "Tech startup", org: "Nimbus Apps", aud: "early users", offer: "three months of Pro for free", product: "the Nimbus task planner", place: "app", event: "Product Launch Live", when: "on Wednesday at five", cta: "Download the app today", topic: "staying focused at work", hours: "around the clock, online", person: "Jamie from Nimbus" },
  { key: "charity", label: "Charity", org: "Helping Hands Trust", aud: "volunteers and supporters", offer: "every donation matched this week", product: "the clean water project", place: "community centre", event: "the Charity Fun Run", when: "on Sunday at seven in the morning", cta: "Donate or volunteer on our website", topic: "how one well changes a village", hours: "nine to five", person: "Grace" },
  { key: "travel", label: "Travel", org: "Blue Horizon Travel", aud: "travellers", offer: "early-bird prices on summer trips", product: "the seven-day mountain tour", place: "travel desk", event: "the Travel Expo", when: "this weekend at the city hall", cta: "Book your seat on our website", topic: "packing light for long trips", hours: "ten to eight", person: "Leila" },
  { key: "cafe", label: "Cafe", org: "Morning Bean Cafe", aud: "coffee lovers", offer: "buy one, get one free on Mondays", product: "our new caramel cold brew", place: "cafe", event: "a Latte Art Class", when: "on Saturday afternoon", cta: "Stop by on your way to work", topic: "brewing better coffee at home", hours: "seven to seven", person: "Mia" },
  { key: "wedding", label: "Wedding", org: "Ever After Weddings", aud: "couples", offer: "a free planning session", product: "our garden venue package", place: "venue", event: "the Wedding Open House", when: "on Sunday from eleven", cta: "Book a visit with our planners", topic: "planning a stress-free wedding day", hours: "ten to seven", person: "Sophie" },
  { key: "salon", label: "Beauty salon", org: "Glow Studio", aud: "guests", offer: "ten percent off your first visit", product: "the new hair spa treatment", place: "studio", event: "Bridal Beauty Day", when: "next Sunday", cta: "Book online in one minute", topic: "caring for your hair in summer", hours: "ten to eight, Tuesday to Sunday", person: "Zoe" },
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Script structures (hand-written). build(t) -> script; blank lines are pauses. */
const LAYOUT_LIST = [
  { key: "announcement", name: "Announcement", section: "Ads and announcements", rate: 1.05, pitch: 1, icon: "mega", build: (t) => `Attention, ${t.aud}!\n\n${t.org} has great news: ${t.offer}, during ${t.event}, ${t.when}.\n\n${t.cta}. Thank you!` },
  { key: "radio-ad", name: "Radio ad", section: "Ads and announcements", rate: 1.1, pitch: 1.1, icon: "mega", build: (t) => `Looking for ${t.product}?\n\n${t.org} has it, and right now you get ${t.offer}.\n\n${t.cta}. ${t.org}, open ${t.hours}.` },
  { key: "launch", name: "Launch countdown", section: "Ads and announcements", rate: 1.1, pitch: 1.05, icon: "rocket", build: (t) => `Three. Two. One.\n\n${t.org} proudly presents ${t.product}!\n\nTo celebrate, ${t.aud} get ${t.offer}. ${t.cta}.` },
  { key: "testimonial", name: "Customer story", section: "Ads and announcements", rate: 1, pitch: 1, icon: "quote", build: (t) => `"I tried ${t.product} last month, and I was surprised how easy it was."\n\nThat's what ${t.aud} tell us at ${t.org}.\n\n${t.cta}, and see for yourself.` },
  { key: "phone-welcome", name: "Phone welcome", section: "Business messages", rate: 0.95, pitch: 1, icon: "phone", build: (t) => `Thank you for calling ${t.org}.\n\nWe are open ${t.hours}.\n\nTo ask about ${t.product}, please stay on the line, and the next free person will help you.` },
  { key: "faq", name: "Questions and answers", section: "Business messages", rate: 1, pitch: 1, icon: "faq", build: (t) => `You asked, we answer.\n\nWhen are you open? ${t.org} is open ${t.hours}.\n\nIs there a deal right now? Yes: ${t.offer}.\n\nMore questions? ${t.cta}.` },
  { key: "safety", name: "Safety notice", section: "Business messages", rate: 0.95, pitch: 0.95, icon: "shield", build: (t) => `Your attention, please.\n\nFor everyone's safety at our ${t.place}, please keep the walkways clear and follow the signs to the exits.\n\nIf you need help, ask any member of the ${t.org} team. Thank you.` },
  { key: "hiring", name: "We're hiring", section: "Business messages", rate: 1.05, pitch: 1.05, icon: "people", build: (t) => `${t.org} is growing, and we're hiring!\n\nIf you love working with ${t.aud}, we would like to meet you.\n\nVisit our website to apply this week.` },
  { key: "event-reminder", name: "Event reminder", section: "Business messages", rate: 1, pitch: 1, icon: "bell", build: (t) => `A quick reminder for all ${t.aud}.\n\n${cap(t.event)} starts ${t.when}, at our ${t.place}.\n\nBring a friend, and don't be late! ${t.cta}.` },
  { key: "podcast-intro", name: "Podcast intro", section: "Shows and stories", rate: 1, pitch: 0.95, icon: "mic", build: (t) => `Welcome to the ${t.org} podcast, the show for ${t.aud}.\n\nI'm ${t.person}, and today we talk about ${t.topic}.\n\nGrab a cup of tea, and let's begin.` },
  { key: "story", name: "Short story", section: "Shows and stories", rate: 0.9, pitch: 1.05, icon: "moon", build: (t) => `Once upon a time, at a little ${t.place} called ${t.org}, ${t.person} had a big idea.\n\nWhat if every visitor left with a smile?\n\nAnd so, one small kindness at a time, that is exactly what happened.` },
  { key: "tour", name: "Guided tour", section: "Shows and stories", rate: 0.95, pitch: 1, icon: "pin", build: (t) => `Welcome to ${t.org}! I'm ${t.person}, and I'll show you around.\n\nOn your left is our main ${t.place}. Straight ahead, you can ask about ${t.product}.\n\nTake your time, and enjoy your visit.` },
  { key: "video-outro", name: "Video outro", section: "Shows and stories", rate: 1.05, pitch: 1, icon: "play", build: (t) => `Thanks for watching!\n\nIf you liked this video about ${t.topic}, share it with a friend.\n\n${t.cta}, and see you next time.` },
  { key: "lesson", name: "Lesson intro", section: "Learning and news", rate: 0.95, pitch: 1, icon: "book", build: (t) => `Hello, and welcome to today's lesson from ${t.org}.\n\nWe are learning about ${t.topic}.\n\nBy the end, you will know the key ideas and one simple way to use them every day.` },
  { key: "product-demo", name: "Product walkthrough", section: "Learning and news", rate: 1, pitch: 1, icon: "steps", build: (t) => `Meet ${t.product}, from ${t.org}.\n\nStep one: tell us what you need.\n\nStep two: pick the option that fits you.\n\nStep three: enjoy the result. ${t.cta}.` },
  { key: "news", name: "News brief", section: "Learning and news", rate: 1.05, pitch: 0.95, icon: "news", build: (t) => `Here is your ${t.org} update.\n\n${cap(t.event)} is coming up ${t.when}.\n\nAlso, ${t.aud} can now enjoy ${t.offer}. That's all for now.` },
  { key: "thank-you", name: "Thank-you message", section: "Greetings and wishes", rate: 0.95, pitch: 1.05, icon: "heart", build: (t) => `To all our ${t.aud}: thank you.\n\nThis year, you made ${t.org} a warmer, happier place.\n\nWe can't wait to see you again soon.` },
  { key: "holiday", name: "Holiday greeting", section: "Greetings and wishes", rate: 0.95, pitch: 1.05, icon: "star", build: (t) => `Happy holidays from everyone at ${t.org}!\n\nThank you for a wonderful year with our ${t.aud}.\n\nWe wish you rest, joy and time with the people you love.` },
  { key: "birthday", name: "Birthday shout-out", section: "Greetings and wishes", rate: 1.05, pitch: 1.15, icon: "cake", build: (t) => `Happy birthday, ${t.person}!\n\nFrom all of us at ${t.org}, thank you for everything you do.\n\nHave a wonderful day and the best year yet!` },
  { key: "calm", name: "Calm minute", section: "Greetings and wishes", rate: 0.75, pitch: 0.9, icon: "leaf", build: (t) => `Let's take a calm minute together, from all of us at ${t.org}.\n\nBreathe in slowly through your nose.\n\nHold it gently.\n\nAnd breathe out, letting your shoulders drop. You're doing great.` },
  // round 2: 20 more script structures (40 in all), so the first 40 templates are 40 different scripts
  { key: "voicemail", name: "Voicemail greeting", section: "Business messages", rate: 0.95, pitch: 1, icon: "phone", build: (t) => `Hi, you've reached ${t.org}. We can't take your call right now.\n\nPlease leave your name, your number and a short message, and we will call you back today.\n\nWe are open ${t.hours}.` },
  { key: "phone-menu", name: "Phone menu", section: "Business messages", rate: 0.95, pitch: 1, icon: "phone", build: (t) => `Welcome to ${t.org}.\n\nFor ${t.product}, press one.\n\nFor our opening hours, press two. We are open ${t.hours}.\n\nTo speak to ${t.person}, press zero.` },
  { key: "closing", name: "Closing time", section: "Business messages", rate: 0.95, pitch: 1, icon: "bell", build: (t) => `Dear ${t.aud}, ${t.org} closes in fifteen minutes.\n\nPlease bring any last questions to our team.\n\nThank you for visiting. We are open again ${t.hours}.` },
  { key: "apology", name: "Apology message", section: "Business messages", rate: 0.95, pitch: 0.95, icon: "heart", build: (t) => `To our ${t.aud}: we are sorry.\n\nThis week some of you waited longer than usual at our ${t.place}. That is not how ${t.org} wants to treat you.\n\nAs a thank-you for your patience, enjoy ${t.offer}.` },
  { key: "flash-sale", name: "Flash sale", section: "Ads and announcements", rate: 1.15, pitch: 1.1, icon: "mega", build: (t) => `Flash sale! Flash sale!\n\nFor the next few hours only, ${t.org} has ${t.offer}.\n\nDon't wait. ${t.cta}!` },
  { key: "jingle", name: "Jingle", section: "Ads and announcements", rate: 1.1, pitch: 1.2, icon: "star", build: (t) => `${t.org}, ${t.org}!\n\nThe place for ${t.aud}, the place to be.\n\n${t.org}, open ${t.hours}!` },
  { key: "trailer", name: "Trailer voice", section: "Ads and announcements", rate: 0.95, pitch: 0.85, icon: "play", build: (t) => `In a busy world, one ${t.place} dares to be different.\n\nThis season, ${t.org} presents ${t.event}.\n\n${cap(t.when)}. Don't miss it.` },
  { key: "explainer", name: "Explainer", section: "Learning and news", rate: 1, pitch: 1, icon: "steps", build: (t) => `Have you ever wondered about ${t.topic}?\n\nHere is the short answer, in three parts: what it is, why it matters, and what you can do today.\n\nLet's start with the first part.` },
  { key: "tip", name: "Tip of the day", section: "Learning and news", rate: 1, pitch: 1.05, icon: "bell", build: (t) => `Here is your tip of the day from ${t.org}.\n\nWhen it comes to ${t.topic}, start small and keep going every day.\n\nSee you tomorrow with another tip.` },
  { key: "quiz", name: "Quick quiz", section: "Learning and news", rate: 1, pitch: 1.05, icon: "faq", build: (t) => `Quiz time!\n\nToday's question from ${t.org}: how much do you know about ${t.topic}?\n\nThink about it for five seconds.\n\nThe answer is in our next video. ${t.cta}.` },
  { key: "interview", name: "Interview intro", section: "Shows and stories", rate: 1, pitch: 1, icon: "mic", build: (t) => `Today on the ${t.org} show, I'm talking with ${t.person}.\n\nWe cover ${t.topic}, and the questions ${t.aud} ask us most.\n\nLet's get started.` },
  { key: "audiobook", name: "Audiobook opening", section: "Shows and stories", rate: 0.9, pitch: 1, icon: "book", build: (t) => `Chapter one.\n\nThe ${t.place} was quiet in the early morning, and ${t.person} was the first to arrive.\n\nNobody knew yet that this ordinary day would change everything.` },
  { key: "audio-guide", name: "Audio guide stop", section: "Shows and stories", rate: 0.9, pitch: 1, icon: "pin", build: (t) => `Stop number four on your audio guide.\n\nYou are standing in the heart of our ${t.place}, where ${t.org} began.\n\nWhen you are ready, walk on to stop number five.` },
  { key: "recipe", name: "Recipe narration", section: "Shows and stories", rate: 1, pitch: 1.05, icon: "cake", build: (t) => `Today at ${t.org}, we are making something simple and delicious.\n\nFirst, get everything ready on the table.\n\nThen mix, taste, and enjoy it together.` },
  { key: "commentary", name: "Match commentary", section: "Shows and stories", rate: 1.2, pitch: 1.1, icon: "mega", build: (t) => `And they're off! What a start here at ${t.event}!\n\n${t.person} takes the lead, and the crowd is on its feet!\n\nWhat a moment for ${t.org}!` },
  { key: "welcome-member", name: "Welcome new member", section: "Greetings and wishes", rate: 1, pitch: 1.05, icon: "people", build: (t) => `Welcome to the ${t.org} family!\n\nWe're so happy you joined our ${t.aud}.\n\nYour first step is easy: ${t.cta.charAt(0).toLowerCase() + t.cta.slice(1)}. We can't wait to see you.` },
  { key: "congrats", name: "Congratulations", section: "Greetings and wishes", rate: 1.05, pitch: 1.15, icon: "star", build: (t) => `Congratulations, ${t.person}!\n\nEveryone at ${t.org} is proud of you.\n\nThis is a big day. Enjoy every moment of it!` },
  { key: "workout", name: "Workout coach", section: "Coaching and calm", rate: 1.1, pitch: 1.05, icon: "steps", build: (t) => `Let's move! Stand up tall.\n\nTen slow squats. Down, and up.\n\nNow shake out your arms. Great work! ${t.org} is proud of you.` },
  { key: "sleep", name: "Sleep wind-down", section: "Coaching and calm", rate: 0.7, pitch: 0.9, icon: "moon", build: (t) => `It's time to rest.\n\nLet the day go, one breath at a time.\n\nRelax your face, your shoulders and your hands.\n\nGood night, from all of us at ${t.org}.` },
  { key: "motivation", name: "Morning motivation", section: "Coaching and calm", rate: 1, pitch: 1.05, icon: "leaf", build: (t) => `Good morning!\n\nToday is a fresh start. You are ready, and you can do this.\n\nTake one small step toward your goal, and the rest will follow. Have a great day, from ${t.org}.` },
];
const PALETTES = [
  ["#14b8a6", "#2f80ff"], ["#f97316", "#ef4444"], ["#5b4cf0", "#8b5cf6"], ["#0ea5e9", "#22c55e"], ["#111827", "#5b4cf0"], ["#312e81", "#7c3aed"],
  ["#16a34a", "#14b8a6"], ["#1e3a8a", "#2f80ff"], ["#0f766e", "#5eead4"], ["#ec4899", "#f59e0b"], ["#dc2626", "#7c3aed"], ["#78350f", "#d97706"],
];
const COUNT = 120;
const L = LAYOUT_LIST.length, TH = THEMES.length, PN = PALETTES.length;
const CARD = ["studio", "captions", "page"];
const pid = (i) => "p" + String(i + 1).padStart(2, "0");
const LBY = Object.fromEntries(LAYOUT_LIST.map((x) => [x.key, x])), TBY = Object.fromEntries(THEMES.map((x) => [x.key, x]));
/** Older short ids keep working. */
const ALIAS = { "radio-ad": "radio-ad~p02~cafe", "calm-breathing": "calm~p09~fitness", "store-announcement": "announcement~p01~shop", "podcast-intro": "podcast-intro~p05~tech", "bedtime-story": "story~p06~school", "birthday-wish": "birthday~p10~shop" };

function make(layout, theme, p) {
  const id = `${layout.key}~${pid(p)}~${theme.key}`;
  return { id, name: `${layout.name}: ${theme.label}`, tool: "text-to-speech", section: layout.section, layout: `${layout.key}-${CARD[p % 3]}`, structure: layout.key, layoutName: layout.name, theme: theme.key, themeName: theme.label, palette: pid(p),
    tags: [layout.name.toLowerCase(), theme.label.toLowerCase(), theme.org.toLowerCase(), layout.section.toLowerCase()],
    colors: PALETTES[p], script: layout.build(theme), rate: layout.rate, pitch: layout.pitch, icon: layout.icon };
}
/** Builds any template from its id ("layout~pNN~theme"); null when the id doesn't name one. */
export function byId(id) {
  const s = ALIAS[id] || String(id || "");
  const [lk, pk, tk] = s.split("~");
  const layout = LBY[lk], theme = TBY[tk], p = /^p\d\d$/.test(pk || "") ? Number(pk.slice(1)) - 1 : -1;
  if (!layout || !theme || !(p >= 0 && p < PN)) return null;
  const t = make(layout, theme, p);
  return ALIAS[id] ? { ...t, id } : t;
}
// Well-mixed order: each layout in turn, its theme moving one step every round, palettes rotating.
export const TEMPLATES = [];
for (let k = 0; TEMPLATES.length < Math.min(COUNT, L * TH); k++) {
  const li = k % L, m = Math.floor(k / L);
  TEMPLATES.push(make(LAYOUT_LIST[li], THEMES[(m + li) % TH], (k * 7 + m) % PN));
}
export const TOTAL = TEMPLATES.length;
/** Distinct designs: 40 script structures × 3 card layouts (studio card, captions on a photo, script page). */
export const LAYOUTS = L * 3;

// ---------- artwork: voiceover cards in Canva's pattern (real library photo of the business, brand, the script in big type,
// waveform + play, speed / voice chips). Our own drawings; photos from the shared library (thumb files in galleries).
/** Photo topic words per content theme (shared with the AI video / music / voice ideas). */
export const THEME_TOPIC = {
  shop: "shop fashion clothing store boutique dresses shopping", clinic: "clinic medical doctor hospital stethoscope", school: "school education classroom students lecture",
  restaurant: "restaurant food dinner kitchen dish", fitness: "fitness gym yoga sport dumbbells", realestate: "interior home house living room hotel",
  tech: "tech startup laptop office server coworking", charity: "charity community nature landscape outdoors hills", travel: "travel trip holiday beach resort",
  cafe: "cafe coffee espresso latte", wedding: "wedding celebration party flowers rings fireworks", salon: "beauty salon spa makeup perfume",
};
/** Library photos ranked for a theme (+ extra words): tag / theme / id hits; one is picked by seed among the best six,
 * so new library photos with matching tags are used automatically. */
const RANKED = new Map();
export function themePhoto(theme, seed, extra = "") {
  const key = theme + "|" + extra;
  if (!RANKED.has(key)) RANKED.set(key, rankPhotos(theme, extra));
  const top = RANKED.get(key);
  return top.length ? top[hash(String(seed)) % top.length] : pickPhoto(((THEME_TOPIC[theme] || theme) + " " + extra).trim(), String(seed));
}
function rankPhotos(theme, extra) {
  const words = ((THEME_TOPIC[theme] || theme) + " " + extra).toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const ex = new Set(String(extra).toLowerCase().split(/\s+/));
  const scored = PHOTOS.map((p) => { let s = 0; for (const w of words) if (p.tags?.includes(w) || p.theme === w || p.id.split("-").includes(w)) s += ex.has(w) ? 1.5 : 1; return [s, p]; })
    .filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || (a[1].id < b[1].id ? -1 : 1));
  if (!scored.length) return [];
  return scored.filter(([s]) => s >= scored[0][0] * 0.5).slice(0, 6).map(([, p]) => p);
}
/** Per script structure: card label and the small motif drawn on it. */
const MOTIF = {
  announcement: ["ANNOUNCEMENT", "sale"], "radio-ad": ["RADIO AD · 30 S", "sale"], launch: ["LAUNCH DAY", "count"], testimonial: ["CUSTOMER STORY", "quote"],
  "phone-welcome": ["PHONE GREETING", "keypad"], faq: ["QUESTIONS & ANSWERS", "qa"], safety: ["SAFETY NOTICE", "alert"], hiring: ["WE'RE HIRING", "people"],
  "event-reminder": ["EVENT REMINDER", "bell"], "podcast-intro": ["PODCAST · EP 12", "live"], story: ["SHORT STORY", "chapter"], tour: ["GUIDED TOUR", "stop"],
  "video-outro": ["VIDEO OUTRO", "play"], lesson: ["LESSON 3", "steps"], "product-demo": ["WALKTHROUGH", "steps"], news: ["NEWS BRIEF", "live"],
  "thank-you": ["THANK YOU", "heart"], holiday: ["SEASON'S GREETINGS", "star"], birthday: ["HAPPY BIRTHDAY", "star"], calm: ["CALM MINUTE", "breath"],
  voicemail: ["VOICEMAIL", "keypad"], "phone-menu": ["PHONE MENU", "keypad"], closing: ["CLOSING SOON", "alert"], apology: ["A NOTE FROM US", "heart"],
  "flash-sale": ["FLASH SALE", "sale"], jingle: ["JINGLE · 15 S", "star"], trailer: ["TRAILER", "film"], explainer: ["EXPLAINER", "steps"],
  tip: ["TIP OF THE DAY", "bell"], quiz: ["QUICK QUIZ", "qa"], interview: ["INTERVIEW", "live"], audiobook: ["AUDIOBOOK", "chapter"],
  "audio-guide": ["AUDIO GUIDE · STOP 4", "stop"], recipe: ["RECIPE", "steps"], commentary: ["LIVE COMMENTARY", "live"], "welcome-member": ["WELCOME", "heart"],
  congrats: ["CONGRATULATIONS", "star"], workout: ["WORKOUT", "steps"], sleep: ["SLEEP STORY", "breath"], motivation: ["GOOD MORNING", "sun"],
};
const W = 320, H = 200;
const full6 = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? "#" + c.slice(1).split("").map((d) => d + d).join("") : c);
const mix = (a, b, t) => mix6(full6(a), full6(b), t);
const ink = (c) => (isDark(c) ? "#fff" : "#0f172a");
/** The opening line(s) of a script for big type. */
export function excerpt(script, n = 78) {
  const paras = String(script || "").split(/\n\s*\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  let s = (paras[0] || "").replace(/^["“]+|["”]+$/g, "");
  if (s.length < 26 && paras[1]) s += " " + paras[1];
  if (s.length <= n) return s;
  const cut = s.slice(0, n), sp = cut.lastIndexOf(" ");
  return (sp > 30 ? cut.slice(0, sp) : cut).replace(/[,;:.!?]$/, "") + "…";
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const secondsOf = (script, rate = 1) => Math.max(6, Math.round(String(script).split(/\s+/).length / (2.5 * (rate || 1))));
/** Small motif per structure kind, centred at (cx, cy), size s. */
function motif(k, kind, cx, cy, s, col, bg = "#fff") {
  const r = s / 2;
  switch (kind) {
    case "sale": { let d = ""; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r; d += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1); } return pathEl(d + "Z", col) + text(cx, cy + r * 0.3, "%", { size: r * 0.9, weight: 900, fill: bg, anchor: "middle" }); }
    case "count": return [3, 2, 1].map((n, i) => circle(cx - r * 0.7 + i * r * 0.7, cy, r * 0.42, i === 2 ? col : bg, i === 2 ? "" : ` stroke="${col}" stroke-width="${(r * 0.08).toFixed(1)}"`) + text(cx - r * 0.7 + i * r * 0.7, cy + r * 0.17, String(n), { size: r * 0.48, weight: 900, fill: i === 2 ? bg : col, anchor: "middle" })).join("");
    case "quote": return text(cx, cy + r * 0.85, "“", { size: s * 1.25, weight: 900, fill: col, anchor: "middle", font: "serif" });
    case "keypad": { let o = ""; for (let i = 0; i < 9; i++) { const x = cx - r * 0.66 + (i % 3) * r * 0.66, y = cy - r * 0.66 + Math.floor(i / 3) * r * 0.66; o += rect(x - r * 0.26, y - r * 0.26, r * 0.52, r * 0.52, i === 0 ? col : bg, r * 0.14, i === 0 ? "" : ` stroke="${col}" stroke-width="1"`) + text(x, y + r * 0.13, String(i + 1), { size: r * 0.34, weight: 800, fill: i === 0 ? bg : col, anchor: "middle" }); } return o; }
    case "qa": return rect(cx - r, cy - r * 0.9, r * 1.3, r * 0.95, col, r * 0.25) + text(cx - r * 0.35, cy - r * 0.2, "Q", { size: r * 0.6, weight: 900, fill: bg, anchor: "middle" }) + rect(cx - r * 0.2, cy, r * 1.25, r * 0.9, bg, r * 0.25, ` stroke="${col}" stroke-width="1.5"`) + text(cx + r * 0.42, cy + r * 0.66, "A", { size: r * 0.6, weight: 900, fill: col, anchor: "middle" });
    case "alert": return pathEl(`M${cx} ${cy - r}L${cx + r} ${cy + r * 0.8}H${cx - r}Z`, col, ` stroke="${col}" stroke-width="${(r * 0.2).toFixed(1)}" stroke-linejoin="round"`) + text(cx, cy + r * 0.62, "!", { size: r * 1.1, weight: 900, fill: bg, anchor: "middle" });
    case "people": return circle(cx - r * 0.42, cy - r * 0.28, r * 0.3, col) + circle(cx + r * 0.42, cy - r * 0.28, r * 0.3, col) + pathEl(`M${cx - r * 0.95} ${cy + r * 0.75}a${r * 0.53} ${r * 0.5} 0 0 1 ${r * 1.06} 0zM${cx - 0.11 * r} ${cy + r * 0.75}a${r * 0.53} ${r * 0.5} 0 0 1 ${r * 1.06} 0z`, col);
    case "bell": return icon("bell", cx - r, cy - r, s, col, 2.4, "none") || pathEl(`M${cx - r * 0.7} ${cy + r * 0.5}q${r * 0.25} -${r * 0.2} ${r * 0.25} -${r * 0.8}a${r * 0.45} ${r * 0.45} 0 0 1 ${r * 0.9} 0q0 ${r * 0.6} ${r * 0.25} ${r * 0.8}z`, col) + circle(cx, cy + r * 0.75, r * 0.18, col);
    case "live": return rect(cx - r, cy - r * 0.38, s, r * 0.76, "#ef4444", r * 0.38) + circle(cx - r * 0.62, cy, r * 0.14, "#fff") + text(cx + r * 0.16, cy + r * 0.2, "LIVE", { size: r * 0.52, weight: 900, fill: "#fff", anchor: "middle", ls: 0.5 });
    case "chapter": return pathEl(`M${cx} ${cy - r * 0.55}q-${r * 0.5} -${r * 0.3} -${r} -${r * 0.2}v${r * 1.3}q${r * 0.5} -${r * 0.1} ${r} ${r * 0.2}zM${cx} ${cy - r * 0.55}q${r * 0.5} -${r * 0.3} ${r} -${r * 0.2}v${r * 1.3}q-${r * 0.5} -${r * 0.1} -${r} ${r * 0.2}z`, col);
    case "stop": return pathEl(`M${cx} ${cy + r}s-${r * 0.75} -${r * 0.8} -${r * 0.75} -${r * 1.2}a${r * 0.75} ${r * 0.75} 0 0 1 ${r * 1.5} 0c0 ${r * 0.4} -${r * 0.75} ${r * 1.2} -${r * 0.75} ${r * 1.2}z`, col) + text(cx, cy - r * 0.02, "4", { size: r * 0.62, weight: 900, fill: bg, anchor: "middle" });
    case "play": return circle(cx, cy, r, col) + pathEl(`M${cx - r * 0.3} ${cy - r * 0.42}L${cx + r * 0.48} ${cy}L${cx - r * 0.3} ${cy + r * 0.42}Z`, bg);
    case "heart": return pathEl(`M${cx} ${cy + r * 0.85}s-${r} -${r * 0.6} -${r} -${r * 1.25}a${r * 0.52} ${r * 0.52} 0 0 1 ${r} -${r * 0.28}a${r * 0.52} ${r * 0.52} 0 0 1 ${r} ${r * 0.28}c0 ${r * 0.65} -${r} ${r * 1.25} -${r} ${r * 1.25}z`, col);
    case "star": { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r; d += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1); } return pathEl(d + "Z", col); }
    case "breath": return [1, 0.7, 0.4].map((f, i) => circle(cx, cy, r * f, "none", ` stroke="${col}" stroke-width="${(1.6 - i * 0.3).toFixed(1)}" opacity="${0.4 + i * 0.3}"`)).join("") + circle(cx, cy, r * 0.16, col);
    case "steps": return [1, 2, 3].map((n, i) => rect(cx - r + i * r * 0.7, cy + r * 0.5 - (i + 1) * r * 0.45, r * 0.56, (i + 1) * r * 0.45, i === 2 ? col : mix(col, bg, 0.45), r * 0.1) + text(cx - r + i * r * 0.7 + r * 0.28, cy + r * 0.38, String(n), { size: r * 0.34, weight: 900, fill: bg, anchor: "middle" })).join("");
    case "sun": return Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return line(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, cx + Math.cos(a) * r, cy + Math.sin(a) * r, col, r * 0.14); }).join("") + circle(cx, cy, r * 0.44, col);
    case "film": return rect(cx - r, cy - r * 0.6, s, r * 1.2, col, r * 0.12) + Array.from({ length: 5 }, (_, i) => rect(cx - r * 0.86 + i * r * 0.4, cy - r * 0.5, r * 0.2, r * 0.16, bg) + rect(cx - r * 0.86 + i * r * 0.4, cy + r * 0.34, r * 0.2, r * 0.16, bg)).join("") + pathEl(`M${cx - r * 0.2} ${cy - r * 0.24}L${cx + r * 0.3} ${cy}L${cx - r * 0.2} ${cy + r * 0.24}Z`, bg);
    default: return circle(cx, cy, r, col);
  }
}
/** Caption line with one highlighted word (reading view). */
function captionLines(k, x, y, lines, size, hiCol, lh = 1.08, fill = "#fff", hiInk = "#0f172a") {
  let s = "";
  lines.forEach((ln, i) => {
    const yy = y + i * size * lh;
    if (i === 0) { const ws = ln.split(" "), w1 = textW(ws[0], size) * 0.95;
      s += rect(x - size * 0.16, yy - size * 0.86, w1 + size * 0.32, size * 1.08, hiCol, size * 0.18); }
    s += text(x, yy, ln, { size, weight: 900, fill, lh });
  });
  return s;
}
/** One voiceover card. o = { id, key, name, theme (object), script, colors: [a, b], rate, pitch, voice, language, speed, ai };
 * v: 0 studio card, 1 captions on a photo, 2 script page (text to speech); 3 voice persona, 4 radio spot, 5 podcast cover (AI voice). */
export function voiceArt(o, v = 0, size = "thumb") {
  const k = kit(o.id, size === "full" ? "full" : "v" + v);
  const [a, b] = o.colors, ph = themePhoto(o.theme.key, o.id), [label, kind] = MOTIF[o.key] || [o.name.toUpperCase(), "play"];
  const org = o.theme.org, secs = secondsOf(o.script, o.rate || o.speed), ex = excerpt(o.script, v === 0 || v === 3 ? 58 : 78);
  const pic = (x, y, w, h, opt = {}) => k.photo(ph, x, y, w, h, { size, ...opt });
  const chipC = (x, y, lab, fill, color, anchor = "start", stroke = "") => k.pill(x, y, lab, { size: 6.4, fill, color, weight: 700, anchor, stroke });
  const speedL = o.ai ? `${o.speed || 1}×` : `Speed ${(o.rate || 1).toFixed(1)}×`;
  const voiceL = o.voiceLabel || (o.ai ? "AI voice" : "Device voice");
  let s = "";
  if (v === 0) {
    s += rect(0, 0, W, H, "#fff") + pic(0, 0, 132, H) + k.scrim(0, H * 0.45, 132, H * 0.55, mix(a, "#000000", 0.6), 0, 0.75);
    s += circle(26, 26, 15, "#fff", k.shadow(2, 6, 0.25)) + motif(k, kind, 26, 26, 16, a);
    s += text(12, H - 14, org, { size: 8.5, weight: 800, fill: "#fff" });
    s += rect(132, 0, W - 132, H, k.lin([mix(a, "#ffffff", 0.93), "#ffffff"], 90)) + rect(132, 0, 4, H, a);
    s += text(148, 26, label, { size: 6.8, weight: 800, fill: a, ls: 1 });
    s += headline(148, 34, W - 162, ex, { size: 21, min: 11, maxLines: 4, maxH: 100, weight: 900, fill: "#0f172a", lh: 1.02 }).svg;
    s += circle(160, 160, 12, a, k.shadow(3, 6, 0.3)) + pathEl("M156.5 154.5L166 160L156.5 165.5Z", "#fff");
    s += k.wave(178, 150, 96, 20, mix(a, "#ffffff", 0.6), { bars: 30, played: 0.4, playedFill: a }) + text(W - 12, 164, mmss(secs), { size: 7, fill: "#64748b", anchor: "end", weight: 700 });
    const c1 = chipC(148, 178, speedL, "#0f172a", "#fff"); s += c1.svg + chipC(152 + c1.w, 178, voiceL, "none", "#0f172a", "start", "#cbd5e1").svg;
  } else if (v === 1) {
    s += pic(0, 0, W, H) + k.scrim(0, 0, W, H, mix(a, "#000000", 0.75), 0.25, 0.85) + k.scrim(0, 0, W, 50, "#000", 0, 0.4, "down");
    s += circle(22, 22, 9, a) + motif(k, kind, 22, 22, 10, "#fff", a) + text(36, 25.5, org, { size: 8.5, weight: 800, fill: "#fff" }) + chipC(W - 12, 13, label, b, ink(b), "end").svg;
    const f = fitT(ex, W - 40, { size: 22, min: 11, maxLines: 3 });
    s += captionLines(k, 16, 66 + f.size * 0.4, f.lines, f.size, a, 1.12, "#fff");
    s += rect(12, H - 40, W - 24, 28, "#ffffff", 14, ' fill-opacity=".16" stroke="#fff" stroke-opacity=".4"') + circle(27, H - 26, 9, "#fff") + pathEl(`M24.5 ${H - 30.5}L31.5 ${H - 26}L24.5 ${H - 21.5}Z`, a);
    s += k.wave(42, H - 34, 200, 16, "#ffffff", { bars: 46, op: 0.9, played: 0.35, playedFill: b }) + text(W - 22, H - 23, `${mmss(Math.round(secs * 0.35))} / ${mmss(secs)}`, { size: 7, fill: "#fff", anchor: "end", weight: 700 });
  } else if (v === 2) {
    s += rect(0, 0, W, H, k.lin([a, b], 135)) + k.blob(W - 40, 30, 70, "#fff", { ex: ' opacity=".12"' }) + rect(0, 0, W, H, k.dots("#fff", 12, 1, 0.16));
    s += `<g transform="rotate(-2 104 100)">` + rect(18, 16, 176, 168, "#fff", 10, k.shadow(8, 16, 0.3));
    s += circle(32, 32, 5, a) + text(42, 35, "SCRIPT · " + label, { size: 6.4, weight: 800, fill: "#64748b", ls: 0.8 }) + text(30, 54, o.name, { size: 12, weight: 900, fill: "#0f172a" });
    const lines = fitT(String(o.script).replace(/\s+/g, " "), 150, { size: 7.6, min: 7.6, maxLines: 9 }).lines.slice(0, 9);
    lines.forEach((ln, i) => { if (i < 2) s += rect(28, 62 + i * 12, Math.min(152, ln.length * 7.6 * 0.56 + 6), 10.5, "#fde68a", 2); s += text(30, 70 + i * 12, ln, { size: 7.6, fill: "#1e293b", weight: i < 2 ? 700 : 500 }); });
    s += text(30, 176, `~${mmss(secs)} · ${String(o.script).split(/\s+/).length} words`, { size: 6.4, fill: "#94a3b8", weight: 700 }) + `</g>`;
    s += circle(256, 76, 50, "#fff", k.shadow(6, 12, 0.3)) + pic(210, 30, 92, 92, { clip: circle(256, 76, 46, "#000") }) + k.play(290, 112, 13, { fill: "#fff", color: a });
    s += text(256, 146, org, { size: 9.5, weight: 900, fill: ink(a), anchor: "middle" }) + k.wave(206, 154, 100, 18, ink(a) === "#fff" ? "#ffffff" : "#0f172a", { bars: 28, op: 0.85 });
    s += chipC(256, 178, speedL + " · " + voiceL, "#ffffff", "#0f172a", "middle").svg;
  } else if (v === 3) {
    s += rect(0, 0, W, H, k.lin([mix(a, "#000000", 0.55), "#0b0b14"], 135)) + rect(0, 0, W, H, k.rad([[b, 0.45], [b, 0]], 0.15, 0.2, 0.6));
    s += circle(76, 88, 60, k.lin([a, b], 45)) + circle(76, 88, 56, "#0b0b14") + pic(22, 34, 108, 108, { clip: circle(76, 88, 53, "#000") });
    s += circle(116, 124, 13, a, ' stroke="#0b0b14" stroke-width="3"') + icon("mic", 108, 116, 16, "#fff", 2.2);
    s += chipC(76, 162, voiceL, "#ffffff", "#0b0b14", "middle").svg + text(76, 188, (o.languageLabel || "English") + " · " + speedL, { size: 7, fill: "#cbd5e1", anchor: "middle", weight: 600 });
    s += text(156, 30, label, { size: 6.8, weight: 800, fill: b, ls: 1 });
    s += headline(156, 38, W - 168, `“${ex}”`, { size: 19, min: 10, maxLines: 4, maxH: 104, weight: 900, fill: "#fff", lh: 1.04 }).svg;
    s += k.play(166, 166, 11, { fill: "#fff", color: a }) + k.wave(184, 156, 104, 20, "#475569", { bars: 30, played: 0.55, playedFill: b }) + text(W - 12, 188, org + " · " + mmss(secs), { size: 6.6, fill: "#94a3b8", anchor: "end", weight: 700 });
  } else if (v === 4) {
    s += pic(0, 0, W, 112) + k.scrim(0, 0, W, 112, "#000", 0.1, 0.55) + rect(0, 112, W, H - 112, mix(a, "#000000", 0.7));
    s += text(14, 24, org, { size: 10, weight: 900, fill: "#fff" }) + chipC(W - 12, 13, label, a, ink(a), "end").svg;
    s += rect(14, 86, 58, 16, "#ef4444", 8) + circle(24, 94, 3, "#fff") + text(48, 97, "ON AIR", { size: 6.6, weight: 900, fill: "#fff", anchor: "middle", ls: 0.6 });
    s += motif(k, kind, W - 34, 84, 28, "#fff", a);
    s += headline(14, 120, W - 96, `“${ex}”`, { size: 14, min: 9, maxLines: 2, maxH: 40, weight: 900, fill: "#fff", lh: 1.05 }).svg;
    s += text(W - 14, 146, mmss(secs), { size: 22, weight: 900, fill: b, anchor: "end" }) + text(W - 14, 156, "SPOT LENGTH", { size: 5.5, weight: 800, fill: "#fff", opacity: 0.6, anchor: "end", ls: 0.6 });
    s += k.wave(14, 166, W - 28, 22, "#ffffff", { bars: 70, op: 0.85, played: 0.3, playedFill: b });
  } else {
    s += rect(0, 0, W, H, k.lin([mix(a, "#ffffff", 0.82), "#ffffff"], 90));
    s += rect(14, 14, 172, 172, "#000", 14, ' opacity=".2"' + k.blur(6)) + pic(14, 12, 172, 172, { rx: 14 }) + k.scrim(14, 12, 172, 172, mix(a, "#000000", 0.5), 0.05, 0.92);
    s += rect(14, 12, 172, 172, "none", 14, ` stroke="${a}" stroke-width="0"`) + motif(k, kind, 40, 40, 22, "#fff", a);
    s += headline(26, 118, 148, o.name, { size: 22, min: 12, maxLines: 2, weight: 900, fill: "#fff", lh: 0.95 }).svg + text(26, 172, org.toUpperCase(), { size: 6.8, weight: 800, fill: "#fff", ls: 1, opacity: 0.85 });
    s += text(198, 30, "NOW PLAYING", { size: 6.4, weight: 800, fill: a, ls: 1 });
    s += headline(198, 36, 112, ex, { size: 11, min: 8, maxLines: 4, maxH: 62, weight: 800, fill: "#0f172a", lh: 1.12 }).svg;
    s += text(198, 116, voiceL + " · " + speedL, { size: 6.8, fill: "#64748b", weight: 600 });
    s += k.wave(198, 124, 110, 18, mix(a, "#ffffff", 0.55), { bars: 28, played: 0.45, playedFill: a });
    s += rect(198, 150, 110, 3, "#e2e8f0", 1.5) + rect(198, 150, 46, 3, a, 1.5) + circle(244, 151.5, 4, a) + text(198, 164, "0:12", { size: 6, fill: "#94a3b8" }) + text(308, 164, mmss(secs), { size: 6, fill: "#94a3b8", anchor: "end" });
    s += pathEl("M218 176l-7 5 7 5zM212 176h-2v10h2z", "#0f172a") + circle(253, 181, 11, a, k.shadow(3, 6, 0.3)) + pathEl("M249.5 175.5L258.5 181L249.5 186.5Z", "#fff") + pathEl("M288 176l7 5-7 5zM294 176h2v10h-2z", "#0f172a");
  }
  return k.svg(W, H, s);
}
const VARIANT = (t) => (Number(String(t.palette || "p01").slice(1)) - 1) % 3; // palette p01 -> 0, p02 -> 1, p03 -> 2 …
const normOf = (t) => ({ id: t.id, key: t.structure || String(t.layout).replace(/-(studio|captions|page)$/, ""), name: t.layoutName, theme: TBY[t.theme], script: t.script, colors: t.colors, rate: t.rate, pitch: t.pitch });
/** The template's design as SVG (320×200); size "full" uses full-size photos (the opened template's preview). */
export function design(id, size = "thumb") { const t = byId(id) || TEMPLATES[0]; return voiceArt(normOf(t), VARIANT(t), size); }
/** Thumbnail: the voiceover card with small photo files. */
export function thumb(id) { return design(id, "thumb"); }
/** The script structures and themes, for other pure modules (the AI voice generator's prompt ideas). */
export { LAYOUT_LIST as SCRIPT_LAYOUTS, THEMES as SCRIPT_THEMES };
