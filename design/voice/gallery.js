// Text to speech voiceover: voice script templates (pure module, no DOM), built by a generator:
// hand-written script LAYOUTS (structures) x own colour PALETTES (thumbnails) x content THEMES (purposes / industries).
// Ids encode the combination ("radio-ad~p03~fitness"); byId(id) and thumb(id) rebuild any of them from the id.
// Used by the editor's Templates panel and by the intro page. All scripts and artwork are our own.

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
const pid = (i) => "p" + String(i + 1).padStart(2, "0");
const LBY = Object.fromEntries(LAYOUT_LIST.map((x) => [x.key, x])), TBY = Object.fromEntries(THEMES.map((x) => [x.key, x]));
/** Older short ids keep working. */
const ALIAS = { "radio-ad": "radio-ad~p02~cafe", "calm-breathing": "calm~p09~fitness", "store-announcement": "announcement~p01~shop", "podcast-intro": "podcast-intro~p05~tech", "bedtime-story": "story~p06~school", "birthday-wish": "birthday~p10~shop" };

function make(layout, theme, p) {
  const id = `${layout.key}~${pid(p)}~${theme.key}`;
  return { id, name: `${layout.name}: ${theme.label}`, tool: "text-to-speech", section: layout.section, layout: layout.key, layoutName: layout.name, theme: theme.key, themeName: theme.label, palette: pid(p),
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
export const LAYOUTS = L;

const ICONS = {
  mega: '<path d="M226 58v44l-30-10h-10v-24h10z" fill="#fff"/><path d="M234 66q8 14 0 28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>',
  rocket: '<path d="M214 46q18 14 12 44h-24q-6-30 12-44z" fill="#fff"/><circle cx="214" cy="68" r="5" fill="COL"/><path d="M202 90l-8 12h12M226 90l8 12h-12" fill="#fff"/>',
  quote: '<path d="M192 62h18v18q0 14-14 18v-8q6-2 6-10h-10zM220 62h18v18q0 14-14 18v-8q6-2 6-10h-10z" fill="#fff"/>',
  play: '<circle cx="214" cy="80" r="26" fill="#fff" opacity=".95"/><path d="M206 66v28l22-14z" fill="COL"/>',
  phone: '<rect x="196" y="50" width="34" height="60" rx="8" fill="#fff"/><rect x="202" y="58" width="22" height="38" rx="3" fill="COL"/>',
  faq: '<rect x="188" y="52" width="40" height="30" rx="8" fill="#fff"/><rect x="206" y="72" width="40" height="30" rx="8" fill="#fff" opacity=".7"/><text x="202" y="73" font-family="Arial" font-size="20" font-weight="700" fill="COL">?</text>',
  shield: '<path d="M214 48l24 8v18q0 22-24 32-24-10-24-32V56z" fill="#fff"/><path d="M204 76l7 7 14-14" stroke="COL" stroke-width="4" fill="none"/>',
  people: '<circle cx="202" cy="64" r="9" fill="#fff"/><circle cx="228" cy="64" r="9" fill="#fff"/><path d="M186 100q16-26 32 0zM212 100q16-26 32 0z" fill="#fff"/>',
  bell: '<path d="M196 98q6-6 6-22a13 13 0 0 1 26 0q0 16 6 22z" fill="#fff"/><circle cx="215" cy="104" r="5" fill="#fff"/>',
  mic: '<rect x="203" y="48" width="22" height="40" rx="11" fill="#fff"/><path d="M194 80q20 26 40 0M214 93v16M202 110h24" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>',
  moon: '<path d="M226 52a30 30 0 1 0 14 44 24 24 0 1 1-14-44z" fill="#fde68a"/><circle cx="190" cy="60" r="3" fill="#fff"/><circle cx="246" cy="58" r="2" fill="#fff"/>',
  pin: '<path d="M214 46a20 20 0 0 1 20 20c0 16-20 38-20 38s-20-22-20-38a20 20 0 0 1 20-20z" fill="#fff"/><circle cx="214" cy="66" r="7" fill="COL"/>',
  book: '<path d="M190 58h22q4 0 4 4v46q0-4-4-4h-22zM242 58h-22q-4 0-4 4v46q0-4 4-4h22z" fill="#fff"/>',
  steps: '<rect x="188" y="88" width="16" height="16" rx="3" fill="#fff"/><rect x="208" y="72" width="16" height="32" rx="3" fill="#fff"/><rect x="228" y="56" width="16" height="48" rx="3" fill="#fff"/>',
  news: '<rect x="188" y="54" width="54" height="52" rx="6" fill="#fff"/><path d="M196 66h38M196 76h38M196 86h24M196 96h30" stroke="COL" stroke-width="4" stroke-linecap="round"/>',
  heart: '<path d="M214 104s-26-15-26-33a14 14 0 0 1 26-7 14 14 0 0 1 26 7c0 18-26 33-26 33z" fill="#fff"/>',
  star: '<path d="M214 46l9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3z" fill="#fff"/>',
  cake: '<rect x="192" y="78" width="46" height="30" rx="5" fill="#fff"/><path d="M192 88q6 6 12 0t11 0 12 0 11 0" stroke="COL" stroke-width="3" fill="none"/><path d="M215 64v12" stroke="#fff" stroke-width="4"/><ellipse cx="215" cy="60" rx="4" ry="6" fill="#fde047"/>',
  leaf: '<path d="M192 104q0-50 50-52-2 50-50 52z" fill="#fff"/><path d="M196 100q16-18 36-36" stroke="COL" stroke-width="3" fill="none"/>',
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fit = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Thumbnail: own artwork (gradient card, layout name, theme, first words of the script and a sound wave). */
export function thumb(id) {
  const t = byId(id) || TEMPLATES[0];
  const [a, b] = t.colors, gid = "g-" + t.id.replace(/[^a-z0-9]/gi, "");
  const seed = t.layout.length * 3 + t.theme.length;
  const bars = Array.from({ length: 26 }, (_, i) => { const hgt = 6 + Math.round(Math.abs(Math.sin(i * 1.7 + seed) * 22) + (i % 3) * 3); return `<rect x="${28 + i * 10}" y="${170 - hgt / 2}" width="5" height="${hgt}" rx="2.5" fill="#fff" opacity=".85"/>`; }).join("");
  const words = t.script.replace(/\s+/g, " ").split(" ").slice(0, 7).join(" ");
  const ic = (ICONS[t.icon] || "").replace(/COL/g, a);
  const L0 = LBY[t.layout], T0 = TBY[t.theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + `<rect width="320" height="200" rx="14" fill="url(#${gid})"/><circle cx="286" cy="26" r="46" fill="#fff" opacity=".08"/>`
    + `<text x="24" y="50" font-family="system-ui,Segoe UI,Arial" font-size="21" font-weight="800" fill="#fff">${esc(fit(L0.name, 20))}</text>`
    + `<text x="24" y="74" font-family="system-ui,Segoe UI,Arial" font-size="13" font-weight="700" fill="#fff" opacity=".9">${esc(fit(T0.org, 26))}</text>`
    + `<text x="24" y="96" font-family="system-ui,Segoe UI,Arial" font-size="11.5" fill="#fff" opacity=".8">${esc(fit(words, 34))}</text>`
    + `<g transform="translate(58 12)">${ic}</g>` + bars + `</svg>`;
}
/** The script structures and themes, for other pure modules (the AI voice generator's prompt ideas). */
export { LAYOUT_LIST as SCRIPT_LAYOUTS, THEMES as SCRIPT_THEMES };
