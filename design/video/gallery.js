// Video templates (pure ES module, no DOM): used by the video editor's Templates panel and by the intro pages.
// Editor templates are real projects in Canva's video-template pattern: every scene is a full-frame picture built around
// a real library photo (full-bleed with gradients, split panels, polaroids, tickets, collages… see scenes.js) that plays
// with a slow zoom or pan, plus big bold text clips that animate in (kinetic headlines, lower thirds, price badges), scene
// transitions and an optional built-in music bed. Trimmer and MP4 converter "templates" are ready-made settings shown as
// finished video frames. All artwork, colours and text are our own; photos come from the shared CC0 library.
import { kit, rect, circle, pathEl, mix, isDark, esc, hash } from "../shared/tpl-kit.js";
import { lookBox, sceneBody, COMP, clipSvg, onBg, textWidth, photoPool } from "./scenes.js";
import { cast, person } from "./people.js";
import { isPerson } from "../shared/photo-library.js";

// ---------- old colour scenes (Elements > Colour scenes; also older saved specs): gradient + simple art
function artSvg(scene, w, h) {
  const [c1, c2] = scene.bg || ["#5b4cf0", "#8b5cf6"], a = scene.accent || "#ffffff", s = Math.min(w, h) / 100;
  const u = (n) => Math.round(n * s * 10) / 10;
  let art = "";
  switch (scene.art) {
    case "circles": art = `<circle cx="${w * 0.12}" cy="${h * 0.2}" r="${u(22)}" fill="${a}" opacity=".18"/><circle cx="${w * 0.88}" cy="${h * 0.82}" r="${u(30)}" fill="${a}" opacity=".14"/><circle cx="${w * 0.8}" cy="${h * 0.18}" r="${u(8)}" fill="none" stroke="${a}" stroke-width="${u(1.4)}" opacity=".5"/>`; break;
    case "confetti": { const cols = [a, "#ffd166", "#06d6a0", "#ff6b9a", "#5ec8ff"]; for (let i = 0; i < 26; i++) { const x = ((i * 97) % 100) / 100 * w, y = ((i * 61) % 100) / 100 * h, r = (i * 37) % 360; art += i % 2 ? `<rect x="${x}" y="${y}" width="${u(2.4)}" height="${u(1.2)}" fill="${cols[i % 5]}" transform="rotate(${r} ${x} ${y})" opacity=".85"/>` : `<circle cx="${x}" cy="${y}" r="${u(1)}" fill="${cols[i % 5]}" opacity=".85"/>`; } break; }
    case "waves": art = `<path d="M0 ${h * 0.72} C ${w * 0.25} ${h * 0.6}, ${w * 0.5} ${h * 0.86}, ${w} ${h * 0.7} V ${h} H 0 Z" fill="${a}" opacity=".16"/><path d="M0 ${h * 0.84} C ${w * 0.3} ${h * 0.74}, ${w * 0.6} ${h * 0.96}, ${w} ${h * 0.82} V ${h} H 0 Z" fill="${a}" opacity=".2"/>`; break;
    case "grid": for (let i = 1; i < 12; i++) art += `<path d="M${(i * w) / 12} 0V${h}" stroke="${a}" stroke-width="${u(0.2)}" opacity=".15"/>`; for (let i = 1; i < 8; i++) art += `<path d="M0 ${(i * h) / 8}H${w}" stroke="${a}" stroke-width="${u(0.2)}" opacity=".15"/>`; break;
    case "burst": for (let i = 0; i < 16; i++) art += `<path d="M${w / 2} ${h / 2} L${w / 2 + Math.cos((i * Math.PI) / 8) * w} ${h / 2 + Math.sin((i * Math.PI) / 8) * w} L${w / 2 + Math.cos(((i + 0.45) * Math.PI) / 8) * w} ${h / 2 + Math.sin(((i + 0.45) * Math.PI) / 8) * w}Z" fill="${a}" opacity=".08"/>`; break;
    case "blobs": art = `<ellipse cx="${w * 0.18}" cy="${h * 0.78}" rx="${u(34)}" ry="${u(24)}" fill="${a}" opacity=".15"/><ellipse cx="${w * 0.86}" cy="${h * 0.16}" rx="${u(28)}" ry="${u(18)}" fill="${a}" opacity=".15"/>`; break;
    case "frame": art = `<rect x="${u(5)}" y="${u(5)}" width="${w - u(10)}" height="${h - u(10)}" rx="${u(3)}" fill="none" stroke="${a}" stroke-width="${u(0.8)}" opacity=".6"/>`; break;
    case "spot": art = `<circle cx="${w / 2}" cy="${h / 2}" r="${u(40)}" fill="${a}" opacity=".12"/><circle cx="${w / 2}" cy="${h / 2}" r="${u(26)}" fill="${a}" opacity=".12"/>`; break;
    default: break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${art}</svg>`;
}

/**
 * Scene picture as an SVG string, w x h. Template scenes ({ look, lo, pal, photos, seed }) draw a real photo design
 * (size "full" = full-size photo files, for the editor; "thumb" = small files); older colour scenes ({ bg, art }) a gradient.
 */
export function sceneSvg(scene, w = 1920, h = 1080, { size = "full" } = {}) {
  if (!scene?.look) return artSvg(scene || {}, w, h);
  const k = kit(scene.seed || "scene", "full" + w);
  return k.svg(w, h, sceneBody(k, scene, 0, 0, w, h, size), { width: w, height: h });
}

// ---------- palettes (ids p01..p14 keep their names), themes (ids keep their keys)
export const PALETTES = [
  { name: "Violet", a: "#7c5cff", b: "#ffd166", dark: "#160f33", light: "#f4f1ff" },
  { name: "Ocean", a: "#0284c7", b: "#fbbf24", dark: "#04253a", light: "#eaf7fd" },
  { name: "Sunset", a: "#f04a24", b: "#ffc53d", dark: "#2b0d17", light: "#fff3ed" },
  { name: "Honey", a: "#f5b301", b: "#ff6b3d", dark: "#1f1606", light: "#fff8e3" },
  { name: "Midnight", a: "#4f46e5", b: "#22d3ee", dark: "#070b1d", light: "#eef0ff" },
  { name: "Mint", a: "#059669", b: "#d9f99d", dark: "#052a20", light: "#eafbf3" },
  { name: "Berry", a: "#db2777", b: "#ffd1e3", dark: "#2b0719", light: "#fff0f6" },
  { name: "Slate teal", a: "#0d9488", b: "#fb923c", dark: "#0d1d22", light: "#edf7f6" },
  { name: "Paper", a: "#a85a1a", b: "#e9b872", dark: "#2c1d10", light: "#faf4ea" },
  { name: "Cloud", a: "#2563eb", b: "#f43f5e", dark: "#0b1530", light: "#f1f5ff" },
  { name: "Deep teal", a: "#0f766e", b: "#fcd34d", dark: "#032b27", light: "#e8f6f3" },
  { name: "Ember", a: "#ea580c", b: "#fde047", dark: "#1d0b03", light: "#fff4ec" },
  { name: "Orchid", a: "#a21caf", b: "#f9a8d4", dark: "#1f0628", light: "#fbf0ff" },
  { name: "Moss", a: "#4d7c0f", b: "#fef08a", dark: "#11210a", light: "#f3f9e8" },
];
const th = (k, label, brand, title, sub, offer, cta, quote, person, steps, items, date, place, hook, reveal, before, after, stat, x) =>
  ({ k, label, brand, title, sub, offer, cta, quote, person, steps, items, date, place, hook, reveal, before, after, stat, ...x });
// x = { topic (photo words), price, was, num + numLabel (big number), handle, people kinds (video/people.js): who (the theme's person:
// trainer, chef, couple…), rev (the quoted customer), grp (its group), host (the YouTube host, default who), stage (on stage),
// pc (a theme about people: its intros, slideshows and invitations show people) }
export const THEMES = [
  th("bakery", "Bakery", "Sweet Crumb Bakery", "Fresh bread every morning", "Baked before sunrise", "Buy 2 cakes, get 1 free", "Order on our page", "The best croissant in town!", "Hira · Regular customer", ["Mix the dough", "Let it rise", "Bake 25 minutes"], ["Croissants", "Banana bread", "Chocolate cake"], "Every Sunday", "Garden Road", "Watch this dough grow", "Golden and crispy!", "Raw dough", "Fresh loaf", "500 loaves a day", { topic: "food coffee restaurant bread cake pastry", price: "Rs 450", was: "Was Rs 650", num: "500", numLabel: "Loaves a day", handle: "@sweetcrumb", who: "chef", rev: "customer:f", grp: "friends", host: "cook" }),
  th("gym", "Gym", "Iron Pulse Gym", "Get stronger in 30 days", "Classes for every level", "First month 50% off", "Book a free trial", "I lost 8 kg and gained confidence.", "Usman · Member", ["Warm up 5 minutes", "Squats 3 × 12", "Stretch and breathe"], ["Strength", "Cardio", "Yoga"], "Mon to Sat, 6 am", "Block C, Main Street", "One move for strong legs", "Do it daily!", "Week 1", "Week 12", "1,200 members", { topic: "fitness sport gym yoga", price: "Rs 2,500", was: "Was Rs 5,000", num: "1,200", numLabel: "Members strong", handle: "@ironpulse", who: "trainer", rev: "trainer:m", grp: "trainer", stage: "trainer", pc: 1 }),
  th("school", "School", "Bright Future School", "Admissions open", "Classes 1 to 10", "Free first-term books", "Visit our campus", "My child loves going to school.", "Mrs. Naz · Parent", ["Pick up the form", "Meet the teacher", "Join the class"], ["Science lab", "Library", "Sports day"], "Admissions till 30 March", "University Road", "Our science fair in 30 seconds", "The volcano erupted!", "First day", "Graduation", "98% pass rate", { topic: "education school classroom books", price: "Free books", was: "For the first term", num: "98%", numLabel: "Pass rate", handle: "@brightfuture", who: "teacher", rev: "customer:f", grp: "students", stage: "students" }),
  th("clinic", "Clinic", "CarePlus Clinic", "Your health first", "Doctors on call day and night", "Free blood pressure check", "Book an appointment", "Kind doctors and no long waits.", "Mr. Rauf · Patient", ["Book online", "Meet your doctor", "Get your report"], ["Family care", "Lab tests", "Child health"], "Open every day", "Clinic Road, Sector 4", "3 signs you need more water", "Drink 8 glasses a day", "Long queues", "Online booking", "10,000 patients helped", { topic: "medical interior flowers doctor hospital", price: "Free check", was: "This week only", num: "10K", numLabel: "Patients helped", handle: "@careplus", who: "doctor", rev: "senior:m", grp: "doctor" }),
  th("homes", "Real estate", "Skyline Homes", "Your new home awaits", "3-bed family houses", "Book now, pay in 3 years", "Call for a visit", "We found our dream home in a week.", "The Ahmed family", ["Choose a plan", "Visit the site", "Get the keys"], ["Garden", "Parking", "Near schools"], "Open house this Saturday", "Lake View Phase 2", "Inside a family house", "Look at this kitchen!", "Empty plot", "Finished home", "250 families moved in", { topic: "interior architecture house home living", price: "Rs 85,000/month", was: "Easy 3-year plan", num: "250", numLabel: "Families moved in", handle: "@skylinehomes", who: "realtor", rev: "family", grp: "family" }),
  th("food", "Restaurant", "Spice Route Kitchen", "Taste the tradition", "Family recipes since 1998", "Lunch deal for 2", "Reserve a table", "The biryani was perfect!", "Ali · Food blogger", ["Marinate overnight", "Slow cook 2 hours", "Serve with raita"], ["Biryani", "Karahi", "Fresh naan"], "Open till midnight", "Food Street", "Our secret spice mix", "Smell that aroma!", "Raw spices", "Signature dish", "4.8 star rating", { topic: "restaurant food dinner", price: "Rs 1,499", was: "Was Rs 1,999", num: "4.8", numLabel: "Star rating", handle: "@spiceroute", who: "chef", rev: "customer:m", grp: "friends" }),
  th("travel", "Travel", "Wander Trails", "Northern adventure", "5 days in the mountains", "Group discount 15%", "Book your seat", "The best trip of my life.", "Sana · Traveller", ["Pack light", "Meet the group", "Start the trek"], ["Lakes", "Glaciers", "Campfires"], "Departs 15 June", "Hunza Valley", "Sunrise at 4,000 metres", "Worth every step!", "City life", "Mountain air", "60 trips this year", { topic: "travel mountains nature valley lake", price: "Rs 45,000", was: "Was Rs 53,000", num: "60", numLabel: "Trips this year", handle: "@wandertrails", who: "traveller", rev: "traveller:f", grp: "friends", pc: 1 }),
  th("tech", "Tech startup", "Nimbus Apps", "Work smarter", "One app for your whole team", "Free for 3 months", "Try it today", "We saved 10 hours a week.", "Fatima · Team lead", ["Create a workspace", "Invite your team", "Track progress"], ["Tasks", "Chat", "Reports"], "Launching 1 December", "Online", "This shortcut saves hours", "Done in one click!", "Messy spreadsheets", "One clear board", "50,000 users", { topic: "workspace meeting office tech laptop", price: "Rs 999/month", was: "Free for 3 months", num: "50K", numLabel: "Happy users", handle: "@nimbusapps", who: "business", rev: "business:f", grp: "team", host: "developer" }),
  th("fashion", "Fashion", "Threadline Studio", "New winter collection", "Warm, soft, made locally", "Up to 40% off", "Shop the look", "Fits perfectly and feels great.", "Ayesha · Customer", ["Pick a colour", "Choose your size", "Free delivery"], ["Shawls", "Jackets", "Sweaters"], "This weekend only", "Mall Road store", "3 ways to wear one shawl", "Which one is yours?", "Plain outfit", "Styled look", "2,000 orders this month", { topic: "fashion beauty clothing", price: "Rs 2,990", was: "Was Rs 4,990", num: "2,000", numLabel: "Orders this month", handle: "@threadline", who: "fashion", rev: "customer:f", grp: "fashion", stage: "fashion", pc: 1 }),
  th("wedding", "Wedding", "Ali & Hina", "We are getting married", "Join us to celebrate", "Dinner and dance", "Please reply by 1 December", "Two hearts, one journey.", "With love, our families", ["Mehndi night", "Wedding day", "Reception"], ["Music", "Dinner", "Photos"], "12 December 2026", "Garden Marquee", "How we met", "She said yes!", "First meeting", "Wedding day", "300 guests", { topic: "celebration flowers wedding rings", price: "12.12.26", was: "Garden Marquee", num: "300", numLabel: "Guests invited", handle: "#AliWedsHina", who: "couple", rev: "lovers", grp: "couple", stage: "couple", pc: 1 }),
  th("birthday", "Birthday", "Zara turns 7", "Happy Birthday!", "Let's party", "Cake, games and gifts", "See you there", "Wishing you a wonderful year!", "Love, Mama and Baba", ["Balloons up", "Cake time", "Games and gifts"], ["Cake", "Balloons", "Games"], "Saturday, 4 pm", "Our home", "Guess the cake flavour", "Chocolate!", "Age 6", "Age 7", "7 candles", { topic: "celebration party balloons cake", price: "Sat 4 pm", was: "At our home", num: "7", numLabel: "Candles to blow", handle: "#ZaraTurns7", who: "child", rev: "family", grp: "family", stage: "child", pc: 1 }),
  th("charity", "Charity", "Helping Hands", "Feed a family this winter", "Every gift counts", "Rs 2,000 feeds a family for a week", "Donate today", "Your help reached our village.", "Volunteer team", ["Collect food", "Pack boxes", "Deliver to homes"], ["Food", "Blankets", "Books"], "All of December", "Community Centre", "One box, one family", "1,000 boxes delivered!", "Empty shelves", "Full boxes", "1,000 families fed", { topic: "nature food community", price: "Rs 2,000", was: "Feeds a family for a week", num: "1,000", numLabel: "Families fed", handle: "@helpinghands", who: "volunteers", rev: "volunteers", grp: "volunteers", host: "customer" }),
  th("cooking", "Cooking channel", "Cook With Zara", "15-minute dinners", "Easy recipes for busy days", "New recipe every Friday", "Subscribe for more", "My family loved it!", "Comment of the week", ["Chop the onions", "Fry the spices", "Simmer 10 minutes"], ["Daal", "Pasta", "Stir fry"], "New videos on Fridays", "From my kitchen", "The trick for fluffy rice", "Perfect every time!", "Plain rice", "Fluffy rice", "100 recipes", { topic: "food restaurant kitchen", price: "15 min", was: "Easy dinners", num: "100", numLabel: "Recipes so far", handle: "@cookwithzara", who: "chef", rev: "customer", grp: "friends", host: "cook:f", pc: 1 }),
  th("gaming", "Gaming", "Pixel Arena", "Season 5 is live", "New maps and skins", "Double points this week", "Join the stream", "Best match of the season!", "Kami · Streamer", ["Pick your hero", "Join a squad", "Win the round"], ["New map", "New skins", "Ranked mode"], "Live tonight, 9 pm", "Online", "Watch this last-second win", "Victory!", "Bronze rank", "Gold rank", "Top 100 player", { topic: "city tech abstract night lights", price: "2x points", was: "This week only", num: "#100", numLabel: "Top player", handle: "@pixelarena", who: "gamer", rev: "gamer", grp: "friends", stage: "gamer", pc: 1 }),
  th("salon", "Beauty salon", "Glow Beauty Salon", "Look your best", "Hair, skin and nails", "Bridal package 20% off", "Book your slot", "I felt like a star.", "Mehwish · Client", ["Cleanse", "Treat", "Style"], ["Haircut", "Facial", "Manicure"], "Open daily, 10 am", "Gulberg", "A 5-minute glow routine", "Ready to shine!", "Before", "After", "5,000 happy clients", { topic: "beauty fashion makeup salon", price: "Rs 8,000", was: "Was Rs 10,000", num: "5,000", numLabel: "Happy clients", handle: "@glowsalon", who: "beauty", rev: "beauty", grp: "salon", stage: "beauty", pc: 1 }),
  th("auto", "Car service", "QuickFix Auto", "Car service in 1 hour", "Oil, brakes and tyres", "Free car wash with service", "Book a service", "Fast, honest and fair.", "Bilal · Driver", ["Drop your car", "We check 30 points", "Drive away happy"], ["Oil change", "Brakes", "Tyres"], "Mon to Sat", "Ring Road", "Check your tyres in 10 seconds", "Now you know!", "Worn tyre", "New tyre", "20 years of service", { topic: "travel city road car", price: "Rs 3,500", was: "Was Rs 4,500", num: "20", numLabel: "Years of service", handle: "@quickfixauto", who: "customer:m", rev: "customer:m", grp: "friends" }),
  th("books", "Book club", "Chapter Club", "Book of the month", "Read with friends", "First meet is free", "Join the club", "I read 12 books this year!", "Noor · Member", ["Pick a book", "Read a chapter a day", "Talk it over"], ["Fiction", "History", "Poetry"], "Last Sunday of the month", "City Library", "A book in 30 seconds", "Read it this week!", "No time to read", "A chapter a day", "40 members", { topic: "education books library reading", price: "Free", was: "First meet", num: "40", numLabel: "Members reading", handle: "@chapterclub", who: "reader", rev: "customer:f", grp: "students" }),
  th("cafe", "Coffee shop", "Bean There Cafe", "Your morning starts here", "Fresh roasted every day", "Second cup half price", "Visit us today", "Best latte in the city.", "Omar · Regular", ["Grind the beans", "Brew slowly", "Add a heart"], ["Latte", "Cold brew", "Cinnamon roll"], "Open 7 am", "Corner of 5th Street", "Latte art in 10 seconds", "A perfect heart!", "Beans", "Latte", "300 cups a day", { topic: "coffee food cafe latte", price: "Rs 350", was: "Was Rs 700", num: "300", numLabel: "Cups a day", handle: "@beanthere", who: "barista", rev: "customer:m", grp: "friends" }),
  th("band", "Music band", "The Night Owls", "Live in concert", "One night only", "Early bird tickets", "Get your ticket", "What a night!", "Fan review", ["Sound check", "Doors open", "Show time"], ["New songs", "Old hits", "Encore"], "Friday, 8 pm", "Open Air Theatre", "First notes of the new song", "Out now!", "Rehearsal", "On stage", "10,000 streams", { topic: "abstract city celebration lights concert night", price: "Rs 1,500", was: "Early bird", num: "10K", numLabel: "Streams", handle: "@thenightowls", who: "musician", rev: "crowd", grp: "crowd", stage: "musician", pc: 1 }),
  th("photo", "Photography", "Frame & Light", "Capture your story", "Weddings, portraits and events", "Free album with every shoot", "Book a shoot", "Every photo was magic.", "Rabia · Bride", ["Plan the shoot", "Shoot the day", "Get your album"], ["Weddings", "Portraits", "Products"], "Booking for 2027", "Studio 9", "One light, three looks", "Which is your favourite?", "Raw shot", "Edited shot", "500 shoots", { topic: "abstract architecture flowers studio camera", price: "Rs 25,000", was: "Album included", num: "500", numLabel: "Shoots done", handle: "@frameandlight", who: "couple", rev: "couple", grp: "lovers", host: "photographer", pc: 1 }),
];

// ---------- scene builder: a look + a composition of words; c = template context
const UNITS = { youtube: [1920, 1080], shorts: [1080, 1920], square: [1080, 1080], portrait: [1080, 1350] };
const FULL_BLEED = new Set(["full", "dim", "duo", "story", "lower", "poster", "confetti", "band", "neon", "glass"]);
/** One scene: look (+ options) with words from a composition. o = { ph (first photo), dur, kb, tr } */
function S(c, look, lo, comp, d, o = {}) {
  const Bx = lookBox(look, c.F, lo, c.P);
  return { look, lo: lo || {}, ph: o.ph, dur: o.dur ?? 3, kb: o.kb, tr: o.tr, texts: COMP[comp](c, Bx, d) };
}
const first = (s) => String(s).split(" · ")[0];
const hookLines = (s) => { const w = String(s).replace(/[?!.]$/, "").split(/\s+/); if (w.length <= 2) return [w.join(" ")]; const n = w.length <= 4 ? 2 : 3, per = Math.ceil(w.length / n); return Array.from({ length: n }, (_, i) => w.slice(i * per, (i + 1) * per).join(" ")).filter(Boolean); };
const steps3 = (c, t, look, lo) => t.steps.map((x, i) => S(c, look, typeof lo === "function" ? lo(i) : lo, "step", { step: `Step ${i + 1}`, title: x, sub: `${i + 1} of ${t.steps.length}` }));

// Each layout: [name, section, music, transition, scenes(c, t)]. 58 designs; ids keep the older layout keys.
const LAYOUT_DEFS = {
  intro: ["Bold intro", "Intros", "upbeat", "zoom", (c, t) => [S(c, "full", { center: 1 }, "head", { title: t.brand, sub: t.sub, lines: 1, upper: false, max: 190 }, { dur: 3.5 })]],
  outro: ["Subscribe outro", "Outros", "happy", "crossfade", (c, t) => [S(c, "dim", { avatar: 1 }, "head", { eyebrow: t.brand, title: "Thanks for watching", sub: t.handle, cta: t.cta }, { dur: 4 })]],
  promo: ["Product promo", "Promos", "upbeat", "slide", (c, t) => [S(c, "full", {}, "head", { eyebrow: t.label, title: t.title, sub: t.sub }), S(c, "split", { side: "R", panel: "a" }, "price", { eyebrow: "This week only", title: t.offer, price: t.price, cta: t.cta })]],
  sale: ["Flash sale", "Sales and offers", "upbeat", "push", (c, t) => [S(c, "stripes", {}, "big", { eyebrow: t.brand, big: "Sale", label: t.offer }, { dur: 2.5 }), S(c, "grid3", {}, "head", { eyebrow: "Shop now", title: t.items.join(", "), sub: t.date }), S(c, "band", {}, "head", { title: t.cta, sub: t.handle, lines: 2 }, { dur: 2.5 })]],
  invite: ["Invitation", "Invitations", "calm", "crossfade", (c, t) => [S(c, "arch", {}, "head", { eyebrow: "You are invited", title: t.title, sub: t.sub, upper: false }, { dur: 3.5 }), S(c, "ticket", {}, "head", { eyebrow: t.date, title: t.place, cta: t.cta, upper: false, max: 110 }, { dur: 3.5 })]],
  quote: ["Quote card", "Quotes and reviews", "calm", "crossfade", (c, t) => [S(c, "card", { avatar: 1 }, "quote", { quote: t.quote, person: t.person }, { dur: 5 })]],
  slideshow: ["Photo slideshow", "Slideshows", "calm", "slide", (c, t) => [S(c, "stack", {}, "head", { title: t.title, sub: t.brand, lines: 2 }), ...t.items.map((x, i) => S(c, "frame", { tilt: [-4, 3, -2][i] }, "head", { eyebrow: `0${i + 1}`, title: x, sub: i === 2 ? t.cta : "" }))]],
  steps: ["Tutorial steps", "Tutorials", "calm", "push", (c, t) => [S(c, "window", {}, "head", { eyebrow: t.label, title: t.title, sub: "In 3 easy steps" }), ...steps3(c, t, "split", (i) => ({ side: i % 2 ? "R" : "L", panel: "light" }))]],
  countdown: ["Top 3 countdown", "Countdowns", "upbeat", "zoom", (c, t) => [S(c, "neon", {}, "head", { eyebrow: t.brand, title: `Top 3 ${t.label.toLowerCase()} picks` }), ...[2, 1, 0].map((i) => S(c, "bigstat", {}, "big", { big: `#${i + 1}`, label: t.items[i] }, { dur: 2.5 }))]],
  story: ["Story reel", "Stories", "calm", "slide", (c, t) => [S(c, "story", { n: 3, i: 0 }, "head", { title: t.title }), S(c, "story", { n: 3, i: 1 }, "head", { title: t.sub }), S(c, "story", { n: 3, i: 2 }, "head", { title: t.reveal, sub: t.brand, cta: t.handle })]],
  interview: ["Interview", "Interviews", "calm", "crossfade", (c, t) => [S(c, "lower", {}, "lower", { tag: "Interview", title: t.title, name: first(t.person), role: t.brand }, { dur: 3.5 }), S(c, "card", {}, "quote", { quote: t.quote, person: t.person }, { dur: 4 })]],
  news: ["News update", "News and updates", "calm", "wipe", (c, t) => [S(c, "lower", {}, "lower", { tag: "Update", title: t.title, name: t.brand, role: t.place }), S(c, "split", { side: "R" }, "head", { eyebrow: "When and where", title: t.date, sub: t.place })]],
  review: ["Customer review", "Quotes and reviews", "calm", "crossfade", (c, t) => [S(c, "circle", {}, "head", { eyebrow: "What people say", title: t.brand, lines: 3 }), S(c, "card", {}, "quote", { stars: 1, quote: t.quote, person: t.person }, { dur: 4 })]],
  recap: ["Event highlights", "Event recaps", "upbeat", "push", (c, t) => [S(c, "grid3", {}, "head", { eyebrow: "Highlights", title: t.brand }), S(c, "bigstat", {}, "big", { big: t.num, label: t.numLabel }), S(c, "tiles", {}, "head", { eyebrow: t.brand, title: t.cta, sub: t.items.join(" · ") })]],
  tips: ["3 tips", "Tips", "calm", "slide", (c, t) => [S(c, "gradient", {}, "head", { eyebrow: t.brand, title: "3 quick tips", max: 190 }, { dur: 2.5 }), ...t.steps.map((x, i) => S(c, "bigstat", {}, "big", { big: `0${i + 1}`, label: x }, { dur: 2.5 }))]],
  beforeafter: ["Before and after", "Before and after", "happy", "wipe", (c, t) => [S(c, "versus", {}, "vs", { a: t.before, b: t.after, la: "Before", lb: "After" }, { kb: "none" }), S(c, "full", {}, "head", { eyebrow: "After", title: t.reveal, sub: t.brand })]],
  hook: ["Hook", "Hooks for short videos", "upbeat", "zoom", (c, t) => [S(c, "neon", {}, "head", { title: t.hook, max: 200 }, { dur: 2.5 }), S(c, "confetti", {}, "head", { title: t.reveal, cta: t.cta })]],
  announce: ["Big announcement", "Announcements", "upbeat", "zoom", (c, t) => [S(c, "duo", {}, "head", { eyebrow: "Big news", title: t.title }), S(c, "ticket", {}, "head", { eyebrow: "Save the date", title: t.date, sub: t.place, max: 120 })]],
  menu: ["Menu", "Lists and menus", "happy", "slide", (c, t) => [S(c, "magazine", {}, "head", { eyebrow: t.label, title: t.brand, lines: 2 }), S(c, "checklist", {}, "list", { title: "On the menu", items: t.items, num: 1 }, { dur: 4 })]],
  milestone: ["Milestone", "Milestones", "happy", "crossfade", (c, t) => [S(c, "confetti", {}, "big", { big: t.num, label: t.numLabel, sub: `Thank you · ${t.brand}` }, { dur: 4 })]],
  splitintro: ["Split intro", "Intros", "upbeat", "slide", (c, t) => [S(c, "split", {}, "head", { eyebrow: t.label, title: t.brand, sub: t.sub }, { dur: 3.5 })]],
  ribbon: ["Title ribbon", "Intros", "upbeat", "push", (c, t) => [S(c, "band", {}, "head", { title: t.title, lines: 2 }), S(c, "band", {}, "head", { eyebrow: t.brand, title: t.cta, lines: 2 }, { dur: 2.5 })]],
  filmreel: ["Film reel", "Stories", "calm", "slide", (c, t) => [S(c, "film", {}, "head", { eyebrow: t.brand, title: t.title, lines: 2 }), S(c, "full", {}, "head", { title: t.items[0] }), S(c, "full", {}, "head", { title: t.items[1], sub: t.brand })]],
  sunrise: ["Golden hour", "Stories", "calm", "crossfade", (c, t) => [S(c, "poster", {}, "head", { eyebrow: t.date, title: t.title, upper: false }), S(c, "duo", {}, "head", { title: t.sub, sub: t.brand, upper: false })]],
  card: ["Message card", "Invitations", "calm", "crossfade", (c, t) => [S(c, "card", {}, "head", { title: t.title, sub: t.sub, max: 120 }, { dur: 3.5 }), S(c, "card", {}, "head", { eyebrow: t.date, title: t.place, cta: t.cta, max: 110 })]],
  panel: ["Side panel", "Business", "calm", "push", (c, t) => [S(c, "split", { side: "R" }, "head", { eyebrow: t.brand, title: t.title, cta: t.cta }), S(c, "split", { panel: "a" }, "list", { title: t.label, items: t.items }, { dur: 3.5 })]],
  badge: ["Big number", "Milestones", "happy", "crossfade", (c, t) => [S(c, "spot", {}, "big", { big: t.num, label: t.numLabel, sub: t.brand }, { dur: 4 })]],
  tiles: ["Photo tiles", "Slideshows", "calm", "zoom", (c, t) => [S(c, "tiles", {}, "head", { title: t.title, sub: t.brand }), S(c, "frame", { tilt: 3 }, "head", { eyebrow: "01", title: t.items[0] }), S(c, "frame", { tilt: -3 }, "head", { eyebrow: "02", title: t.items[2], cta: t.cta })]],
  spotlight: ["Spotlight", "Promos", "upbeat", "zoom", (c, t) => [S(c, "spot", {}, "head", { eyebrow: "Introducing", title: t.title }), S(c, "stripes", {}, "price", { title: t.offer, price: t.price, cta: t.cta })]],
  streaks: ["Light streaks", "Promos", "upbeat", "zoom", (c, t) => [S(c, "neon", {}, "head", { title: t.hook, eyebrow: t.brand }, { dur: 2.5 }), S(c, "full", { center: 1 }, "head", { title: t.sub, cta: t.cta })]],
  stage: ["On stage", "Event recaps", "upbeat", "crossfade", (c, t) => [S(c, "dim", {}, "head", { eyebrow: "Live on stage", title: t.title }), S(c, "ticket", {}, "head", { eyebrow: "Tickets", title: t.date, sub: t.place, cta: t.cta, max: 110 })]],
  dotsquote: ["Editorial quote", "Quotes and reviews", "calm", "crossfade", (c, t) => [S(c, "editorial", {}, "quote", { quote: t.quote, person: t.person }, { dur: 5 })]],
  rings: ["Save the date", "Announcements", "upbeat", "crossfade", (c, t) => [S(c, "arch", {}, "head", { eyebrow: "Save the date", title: t.brand, sub: t.date, upper: false }), S(c, "dim", {}, "head", { title: t.date, sub: t.place, upper: false })]],
  bars: ["News bars", "News and updates", "calm", "wipe", (c, t) => [S(c, "band", {}, "head", { eyebrow: "News", title: t.title, lines: 2 }), S(c, "checklist", {}, "list", { title: "In this update", items: t.items }, { dur: 3.5 })]],
  corners: ["Corner sale", "Sales and offers", "upbeat", "push", (c, t) => [S(c, "thumbcut", {}, "price", { eyebrow: "Sale", title: t.offer, price: t.price, was: t.was }), S(c, "band", {}, "head", { title: t.cta, sub: t.date, lines: 2 }, { dur: 2.5 })]],
  bubbles: ["Celebration", "Celebrations", "happy", "zoom", (c, t) => [S(c, "confetti", {}, "head", { title: t.title }), S(c, "glass", {}, "head", { title: t.sub, cta: t.cta, max: 110 })]],
  zigzag: ["Question hook", "Hooks for short videos", "upbeat", "push", (c, t) => [S(c, "thumbcut", {}, "words", { lines: hookLines(t.hook) }, { dur: 2.5 }), S(c, "dim", {}, "head", { title: t.reveal, sub: t.brand })]],
  underline: ["Numbered steps", "Tutorials", "calm", "slide", (c, t) => [S(c, "mesh", {}, "head", { eyebrow: t.label, title: t.title, max: 180 }), ...steps3(c, t, "checklist", {}).slice(0, 2)]],
  doubleframe: ["Elegant frame", "Invitations", "calm", "crossfade", (c, t) => [S(c, "arch", {}, "head", { eyebrow: "With joy we invite you", title: t.title, upper: false }, { dur: 3.5 }), S(c, "poster", {}, "head", { title: t.date, sub: t.place, upper: false })]],
  checklist: ["Checklist", "Tips", "calm", "slide", (c, t) => [S(c, "checklist", {}, "list", { eyebrow: t.brand, title: `${t.label} checklist`, items: t.items }, { dur: 4 }), S(c, "full", {}, "head", { title: t.cta, sub: t.handle })]],
  versus: ["This or that", "Polls", "happy", "zoom", (c, t) => [S(c, "versus", {}, "vs", { a: t.items[0], b: t.items[1], mid: "VS" }, { kb: "none", dur: 3.5 }), S(c, "gradient", {}, "head", { title: "Vote in the comments", sub: t.brand })]],
  timeline: ["Our story", "Stories", "calm", "slide", (c, t) => [S(c, "magazine", {}, "head", { eyebrow: "Our story", title: t.brand, lines: 2 }), S(c, "split", {}, "head", { eyebrow: "Then", title: t.before }), S(c, "split", { side: "R", panel: "a" }, "head", { eyebrow: "Now", title: t.after, sub: t.stat })]],
  faq: ["Question and answer", "Tips", "calm", "crossfade", (c, t) => [S(c, "gradient", {}, "head", { eyebrow: "Quick question", title: `${t.hook}?` }), S(c, "card", {}, "head", { title: t.reveal, sub: t.brand, max: 120 })]],
  count321: ["Countdown 3-2-1", "Countdowns", "upbeat", "zoom", (c, t) => [...["3", "2", "1"].map((d, i) => S(c, "dim", {}, "big", { big: d, max: 520, bc: "#ffffff" }, { dur: 1, ph: i })), S(c, "confetti", {}, "head", { title: t.reveal, sub: t.brand })]],
  thanks: ["Thank-you card", "Outros", "happy", "crossfade", (c, t) => [S(c, "card", {}, "head", { title: "Thank you", sub: t.brand, max: 170 }), S(c, "full", {}, "head", { title: t.cta, sub: t.place })]],
  features3: ["Three features", "Promos", "upbeat", "push", (c, t) => [...t.items.map((x, i) => S(c, "split", { side: i % 2 ? "R" : "L", panel: i === 1 ? "a" : "dark" }, "head", { eyebrow: `0${i + 1}`, title: x }, { dur: 2.5 })), S(c, "dim", {}, "head", { title: t.brand, cta: t.cta })]],
  lowerthird: ["Lower third", "Interviews", "calm", "crossfade", (c, t) => [S(c, "lower", {}, "lower", { name: first(t.person), role: t.brand, title: t.title }, { dur: 3.5 }), S(c, "full", {}, "head", { title: t.sub, sub: t.handle })]],
  pricetag: ["Price tag", "Sales and offers", "upbeat", "slide", (c, t) => [S(c, "circle", {}, "price", { eyebrow: t.label, title: t.offer, price: t.price, was: t.was, lines: 3, max: 110 }), S(c, "band", {}, "head", { title: t.cta, sub: t.place, lines: 2 }, { dur: 2.5 })]],
  ytthumb: ["Thumbnail title", "YouTube titles", "upbeat", "zoom", (c, t) => [S(c, "thumbcut", {}, "words", { lines: hookLines(t.hook), sub: t.brand }), S(c, "full", {}, "head", { title: t.reveal, sub: t.handle })]],
  ytoutro: ["End screen", "Outros", "happy", "crossfade", (c, t) => [S(c, "tiles", { avatar: 1 }, "head", { eyebrow: "Watch next", title: "Thanks for watching", cta: "Subscribe", max: 130 }, { dur: 5 })]],
  testimonial: ["Testimonial", "Quotes and reviews", "calm", "crossfade", (c, t) => [S(c, "glass", { avatar: 1 }, "quote", { stars: 1, quote: t.quote, person: t.person }, { dur: 4.5 }), S(c, "split", { panel: "a" }, "head", { title: t.cta, sub: t.brand })]],
  eventcountdown: ["Event countdown", "Countdowns", "upbeat", "zoom", (c, t) => [S(c, "poster", {}, "big", { eyebrow: t.title, big: "3 days", label: "To go" }), S(c, "ticket", {}, "head", { eyebrow: "Save your seat", title: t.date, sub: t.place, cta: t.cta, max: 110 })]],
  kinetic: ["Kinetic words", "Hooks for short videos", "upbeat", "push", (c, t) => [S(c, "dim", {}, "head", { title: t.hook, max: 230 }, { dur: 2.5 }), S(c, "duo", {}, "head", { title: t.reveal, max: 230 }, { dur: 2.5 }), S(c, "full", {}, "head", { title: t.brand, cta: t.cta })]],
  stepcards: ["Step cards", "Tutorials", "calm", "slide", (c, t) => [S(c, "mesh", {}, "head", { eyebrow: "How to", title: t.title, max: 180 }), ...steps3(c, t, "card", {})]],
  magcover: ["Magazine cover", "Stories", "calm", "crossfade", (c, t) => [S(c, "magazine", {}, "head", { eyebrow: t.label, title: t.title, sub: t.sub, lines: 2 }), S(c, "editorial", {}, "quote", { quote: t.quote, person: t.person }, { dur: 4 })]],
  polaroid: ["Polaroid memories", "Slideshows", "calm", "slide", (c, t) => [S(c, "glass", {}, "head", { title: t.title, sub: t.brand }), S(c, "frame", { tilt: 4 }, "head", { title: t.items[0], sub: t.date }), S(c, "frame", { tilt: -3 }, "head", { title: t.items[1], sub: t.place })]],
  glassintro: ["Glass intro", "Intros", "upbeat", "zoom", (c, t) => [S(c, "glass", {}, "head", { eyebrow: t.label, title: t.brand, sub: t.sub }, { dur: 3.5 })]],
  statement: ["Bold statement", "Business", "upbeat", "wipe", (c, t) => [S(c, "mesh", {}, "head", { title: t.title, sub: t.brand, max: 210 }), S(c, "editorial", {}, "head", { eyebrow: t.label, title: t.offer, cta: t.cta })]],
};
export const LAYOUTS = Object.keys(LAYOUT_DEFS).length;
// People spots per layout, in Canva's video pattern: [scene, photo slot, role, when]. Roles: "rev" the quoted customer or
// interviewee, "who" / "who2" the theme's people (trainer, chef, couple, models…), "host" the channel's creator, "grp" the
// theme's group (class, family, crowd, team), "stage" the performer or speaker. when: "all" every tool, "pc" themes about
// people (fashion, weddings, gyms…), "y" the YouTube editor (creator-led: the host on intros, tutorials and title cards).
// The first rule for a slot wins. Every other photo stays the theme's place, food or product.
const PEOPLE = {
  intro: [[0, 0, "host", "y"], [0, 0, "who", "pc"]], outro: [[0, 4, "host", "all"]], promo: [[0, 0, "who", "pc"]], invite: [[0, 0, "who", "pc"]],
  quote: [[0, 4, "rev", "all"]], slideshow: [[0, 0, "who", "pc"], [1, 0, "who2", "pc"]], steps: [[0, 0, "host", "y"]], countdown: [[0, 0, "host", "y"]],
  story: [[0, 1, "host", "all"], [1, 1, "host", "all"], [2, 1, "host", "all"], [0, 0, "who", "pc"]], // the profile picture on every frame
  interview: [[0, 0, "rev", "all"]], news: [[0, 0, "host", "y"]], review: [[0, 0, "rev", "all"]], recap: [[0, 0, "grp", "pc"]],
  tips: [[0, 0, "host", "y"], [0, 0, "who", "pc"]], hook: [[0, 0, "host", "y"]], milestone: [[0, 0, "host", "y"]], splitintro: [[0, 0, "host", "y"], [0, 0, "who", "pc"]],
  filmreel: [[0, 0, "who", "pc"]], badge: [[0, 0, "host", "y"]], spotlight: [[0, 0, "who", "pc"]], stage: [[0, 0, "stage", "all"]], dotsquote: [[0, 0, "rev", "all"]],
  rings: [[0, 0, "who", "pc"]], bars: [[0, 0, "host", "y"]], corners: [[0, 0, "host", "y"]], bubbles: [[0, 0, "grp", "pc"]], zigzag: [[0, 0, "host", "y"]],
  underline: [[0, 0, "host", "y"]], doubleframe: [[0, 0, "who", "pc"]], checklist: [[0, 0, "host", "y"]], timeline: [[0, 0, "host", "y"], [0, 0, "who", "pc"]],
  faq: [[0, 0, "host", "y"]], lowerthird: [[0, 0, "rev", "all"]], ytthumb: [[0, 0, "host", "all"]], ytoutro: [[0, 4, "host", "all"]], // 4: the round avatar (outro, quote, testimonial, ytoutro)
  testimonial: [[0, 4, "rev", "all"]], kinetic: [[0, 0, "host", "y"]], stepcards: [[0, 0, "host", "y"]], magcover: [[0, 0, "who", "all"], [1, 0, "rev", "all"]],
  polaroid: [[1, 0, "who", "pc"]], glassintro: [[0, 0, "host", "y"], [0, 0, "who", "pc"]], statement: [[0, 0, "host", "y"]],
};
/** People spots of a generated template: [scene, slot, key, kind]. */
function peopleSpots(L, t, prefix) {
  const out = [], taken = new Set();
  for (const [si, slot, role, when] of PEOPLE[L] || []) {
    if ((when === "y" && prefix !== "y") || (when === "pc" && !t.pc) || taken.has(si + ":" + slot)) continue;
    taken.add(si + ":" + slot);
    const r = role.replace(/\d$/, ""), kind = r === "host" ? t.host || t.who : r === "stage" ? t.stage || "speaker" : t[r];
    if (kind) out.push([si, slot, role, kind]);
  }
  return out;
}
const FONTS = [["sans", "Clean sans"], ["serif", "Classic serif"], ["calibri", "Soft sans"], ["cambria", "Book serif"], ["mono", "Typewriter"]];
// Text animation sets (the template's "motion"): headline lines, small lines, labels, list items, giant numbers
const MOTIONS = [["pop", "Pop", { head: "pop", sub: "fade", pill: "pop", item: "slide-left", big: "stomp" }], ["fade", "Fade", { head: "fade", sub: "fade", pill: "fade", item: "fade", big: "fade" }],
  ["slide-up", "Slide up", { head: "baseline", sub: "slide-up", pill: "slide-up", item: "slide-up", big: "baseline" }], ["slide-left", "Slide in", { head: "slide-left", sub: "slide-left", pill: "wipe", item: "slide-left", big: "slide-left" }],
  ["typewriter", "Typewriter", { head: "typewriter", sub: "fade", pill: "fade", item: "typewriter", big: "pop" }]];
const ALL_L = Object.keys(LAYOUT_DEFS);
const SOCIAL = new Set(["promo", "sale", "invite", "quote", "slideshow", "story", "review", "recap", "hook", "beforeafter", "announce", "menu", "milestone", "tips",
  "ribbon", "card", "badge", "tiles", "spotlight", "streaks", "dotsquote", "rings", "corners", "bubbles", "zigzag", "checklist", "versus", "count321", "thanks", "features3",
  "pricetag", "testimonial", "eventcountdown", "kinetic", "polaroid", "magcover"]);
const SHORT = new Set(["hook", "zigzag", "versus", "count321", "story", "kinetic"]); // made for phones: 9:16 even in the YouTube list (Shorts)
const order = (head) => [...head, ...ALL_L.filter((k) => !head.includes(k))];
// Canva shows about 20,105 video templates and 20,000 YouTube ones; ours are generated in the same numbers (paged, never all at once).
const TOOLS = {
  v: { tool: "videos", total: 20105, layouts: order([...SOCIAL]), preset: (L, i) => (SHORT.has(L) ? "shorts" : ["square", "shorts", "portrait", "square", "shorts"][i % 5]) },
  e: { tool: "video-editor", total: 20105, layouts: ALL_L, preset: (L, i) => (SHORT.has(L) ? "shorts" : SOCIAL.has(L) ? ["youtube", "square", "shorts", "youtube"][i % 4] : "youtube") },
  y: { tool: "youtube-video-editor", total: 20000, layouts: order(["intro", "ytthumb", "outro", "steps", "countdown", "news", "lowerthird", "review", "tips", "hook", "interview", "ytoutro", "recap", "beforeafter", "quote", "milestone", "splitintro", "stepcards", "underline", "count321", "faq", "filmreel", "glassintro", "statement"]), preset: (L) => (SHORT.has(L) ? "shorts" : "youtube") },
};
const PREFIX = { videos: "v", "video-editor": "e", "youtube-video-editor": "y" };
const pad2 = (n) => String(n).padStart(2, "0");
/** i-th generated template of a tool (mixed order: layouts change fastest, themes/palettes/fonts/motions shift with them). */
function genAt(prefix, i) {
  const T0 = TOOLS[prefix], nL = T0.layouts.length, nT = THEMES.length, nP = PALETTES.length, nF = FONTS.length, nM = MOTIONS.length;
  const r0 = i % nL, r1 = Math.floor(i / nL) % nT, r2 = Math.floor(i / (nL * nT)) % nP, r3 = Math.floor(i / (nL * nT * nP)) % nF, r4 = Math.floor(i / (nL * nT * nP * nF)) % nM;
  const L = T0.layouts[r0], t = (r1 + 7 * r0) % nT, pl = (r2 + 3 * r1 + 5 * r0) % nP, f = (r3 + r2 + r1) % nF, m = (r4 + r3 + 2 * r2 + r0) % nM;
  return `${prefix}.${L}~p${pad2(pl + 1)}~${THEMES[t].k}~f${f + 1}~m${m + 1}`;
}
const ID_RE = /^([vey])\.([a-z0-9]+)~p(\d\d)~([a-z]+)(?:~f(\d))?(?:~m(\d))?$/;
function parse(id) {
  const x = ID_RE.exec(id || ""); if (!x) return null;
  const T0 = TOOLS[x[1]], d = LAYOUT_DEFS[x[2]], pal = PALETTES[+x[3] - 1], t = THEMES.find((y) => y.k === x[4]), f = FONTS[(+x[5] || 1) - 1], m = MOTIONS[(+x[6] || 1) - 1];
  if (!T0 || !d || !pal || !t || !f || !m || !T0.layouts.includes(x[2])) return null;
  return { prefix: x[1], T0, L: x[2], d, pi: +x[3] - 1, pal, t, f, m };
}
// scene counts per layout (the same for every theme): for the "1 of N" card badge and hover preview
const SCENE_N = {};
/** Light card data for a template id: { id, name, tool, section, tags, theme, layout, pages }. */
export function meta(id) {
  const hand = HAND.get(id); if (hand) return strip(hand);
  const c = parse(id); if (!c) return null;
  return { id, name: `${c.t.label} ${c.d[0].toLowerCase()} · ${c.pal.name}`, tool: c.T0.tool, section: c.d[1], theme: c.t.k, themeName: c.t.label, layout: c.L, layoutName: c.d[0], pages: SCENE_N[c.L] || 1,
    tags: [c.L, c.d[0], c.t.k, c.t.label, c.pal.name, c.f[1], c.m[1]] };
}
export const templateMeta = meta;
/** Template context: frame units, palette, fonts and motion for the scene builders. */
function ctx(preset, pal, fam, mo) {
  const [W, H] = UNITS[preset] || UNITS.youtube, o = W > H * 1.2 ? "L" : H > W * 1.2 ? "P" : "S";
  return { F: { W, H }, P: pal, fam, mo, upper: fam !== "serif" && fam !== "cambria", ori: o };
}
/** Photos, Ken Burns motion and transitions for built scenes; seed = template id. spots = [[scene, slot, key, kind]]: the
 *  people photos (video/people.js) put into those photo slots; the scene's zoom or pan moves them like any photo. */
function finish(id, scenes, pal, topic, tr, spots = [], preset = "") {
  const pool = photoPool(topic, 6, id), who = cast(spots.map(([, , key, kind]) => [key, kind]), id, { shape: preset === "youtube" ? "L" : preset === "shorts" || preset === "portrait" ? "P" : null });
  let k = 0;
  return scenes.map((s, i) => {
    const start = s.ph ?? k; k = start + (["grid3", "stack", "tiles", "film", "versus"].includes(s.look) ? 3 : 1);
    const photos = Array.from({ length: 4 }, (_, j) => pool[(start + j) % pool.length]);
    for (const [si, slot, key] of spots) if (si === i && who[key]) photos[slot] = who[key];
    const kb = s.kb || (i === 0 ? "in" : FULL_BLEED.has(s.look) ? ["in", "left", "out", "right"][i % 4] : ["in", "out"][i % 2]);
    const out = { look: s.look, lo: s.lo, pal, photos, seed: `${id}#${i}`, dur: s.dur, kb, texts: s.texts };
    if (i > 0) out.tr = { type: tr, dur: s.dur <= 1.2 ? 0.3 : 0.5, ...(tr === "slide" || tr === "push" || tr === "wipe" ? { dir: ["left", "up", "left", "right"][i % 4] } : {}) };
    return out;
  });
}
/** Full template (scenes with photos and words, music, size, font, motion) built from a generated id, or null. */
function genSpec(id) {
  const c = parse(id); if (!c) return null;
  const { T0, L, d, pal, t, f, m } = c, idx = T0.layouts.indexOf(L);
  const preset = T0.preset(L, idx + c.pi);
  const music = t.k === "wedding" ? "calm" : t.k === "birthday" ? "happy" : d[2];
  const scenes = finish(id, d[4](ctx(preset, pal, f[0], m[2]), t), pal, t.topic, d[3], peopleSpots(L, t, c.prefix), preset);
  return { ...meta(id), preset, music, font: f[0], scenes, ...(L === "steps" && c.prefix === "y" ? { chapters: ["Intro", ...t.steps] } : {}) };
}
for (const L of ALL_L) SCENE_N[L] = LAYOUT_DEFS[L][4](ctx("youtube", PALETTES[0], "sans", MOTIONS[0][2]), THEMES[0]).length;

// ---------- hand-made templates (ids, names and scene/word counts kept: links and tests use them)
const HM = (id, name, tool, section, tags, preset, music, topic, pi, fam, mi, tr, build) => ({ id, name, tool, section, tags, preset, music, topic, pi, fam, mi, tr, build });
const ED_DEFS = [
  // ---- Videos (social and everyday)
  HM("reel-promo", "Reel promo", "videos", "Social videos", ["instagram", "reel", "promo"], "shorts", "upbeat", "fashion beauty", 6, "sans", 0, "push", (c) => [S(c, "story", { n: 2, i: 0 }, "head", { eyebrow: "Just landed", title: "New drop", sub: "Swipe up to see it", max: 220 }), S(c, "stripes", {}, "price", { eyebrow: "Only this week", title: "The winter edit", price: "30% off", cta: "Link in bio" })]),
  HM("birthday-wish", "Birthday wish", "videos", "Celebrations", ["birthday", "wish", "party"], "square", "happy", "celebration party balloons", 3, "sans", 0, "zoom", (c) => [S(c, "confetti", {}, "head", { title: "Happy Birthday!", max: 190 }), S(c, "card", {}, "head", { title: "Wishing you a wonderful year", sub: "With love from all of us", upper: false, max: 110 })]),
  HM("product-promo", "Product promo", "videos", "Business", ["product", "sale", "ad"], "square", "upbeat", "coffee food drink", 1, "sans", 0, "slide", (c) => [S(c, "circle", {}, "head", { eyebrow: "New", title: "Meet the new bottle", sub: "Keeps drinks cold for 24 hours" }), S(c, "stripes", {}, "price", { title: "20% off", price: "Rs 1,999", cta: "Order today, free delivery" })]),
  HM("photo-slideshow", "Photo slideshow", "videos", "Memories", ["slideshow", "photos", "memories"], "youtube", "calm", "sea travel beach summer", 0, "serif", 1, "slide", (c) => [S(c, "stack", {}, "head", { title: "Our summer", sub: "Best days together", upper: false }), S(c, "frame", { tilt: -4 }, "head", { eyebrow: "June", title: "By the sea", upper: false }), S(c, "frame", { tilt: 3 }, "head", { eyebrow: "July", title: "Up in the hills", upper: false, sub: "Swap in your own photos" })]),
  HM("tutorial-steps", "Tutorial in 3 steps", "videos", "Teach and explain", ["tutorial", "how to", "steps"], "youtube", "calm", "nature flowers garden", 5, "sans", 2, "push", (c) => [S(c, "window", {}, "head", { eyebrow: "Garden basics", title: "How to plant a seed", sub: "In 3 easy steps" }), S(c, "split", { panel: "light" }, "step", { step: "Step 1", title: "Fill the pot", sub: "Use loose soil" }), S(c, "split", { side: "R", panel: "light" }, "step", { step: "Step 2", title: "Water a little", sub: "Keep it damp, not wet" })]),
  HM("announcement", "Announcement", "videos", "Business", ["news", "announcement", "update"], "youtube", "upbeat", "city business shop", 4, "sans", 0, "zoom", (c) => [S(c, "neon", {}, "head", { eyebrow: "Big news", title: "We are opening a new shop" }), S(c, "ticket", {}, "head", { eyebrow: "Opening day", title: "1 December", sub: "Main Market, Block B" })]),
  HM("event-invite", "Event invitation", "videos", "Celebrations", ["invite", "event", "wedding"], "portrait", "calm", "celebration flowers wedding rings", 8, "serif", 1, "crossfade", (c) => [S(c, "arch", {}, "head", { eyebrow: "Together with our families", title: "You are invited", upper: false }, { dur: 3.5 }), S(c, "ticket", {}, "head", { eyebrow: "Saturday, 7 pm", title: "Garden Hall", sub: "Please reply by Friday", upper: false })]),
  HM("quote-of-the-day", "Quote of the day", "videos", "Social videos", ["quote", "motivation"], "square", "calm", "mountains nature sky", 4, "serif", 1, "crossfade", (c) => [S(c, "glass", {}, "quote", { quote: "Small steps every day add up to big results.", person: "Quote of the day" }, { dur: 4.5 })]),
  HM("recipe-steps", "Quick recipe", "videos", "Teach and explain", ["recipe", "food", "cooking"], "shorts", "happy", "food fruit", 3, "sans", 0, "slide", (c) => [S(c, "full", {}, "head", { eyebrow: "Quick recipe", title: "Mango shake", sub: "Ready in 5 minutes", max: 200 }), S(c, "checklist", {}, "list", { title: "You need", items: ["2 mangoes", "1 cup milk", "Ice and honey"] }, { dur: 4 })]),
  HM("thank-you-customers", "Thank you message", "videos", "Business", ["thanks", "customers"], "square", "calm", "celebration flowers", 5, "sans", 2, "crossfade", (c) => [S(c, "confetti", {}, "head", { title: "Thank you!", max: 200 }), S(c, "bigstat", {}, "big", { big: "1,000", label: "Happy customers", sub: "We are grateful for you" })]),
  // ---- Video editor
  HM("vlog-opener", "Vlog opener", "video-editor", "Openers and endings", ["vlog", "intro"], "youtube", "upbeat", "coffee city travel", 2, "sans", 0, "zoom", (c) => [S(c, "full", { bar: 1 }, "head", { eyebrow: "Episode 12", title: "A day in my life", max: 190 }, { dur: 3.5 })]),
  HM("travel-montage", "Travel montage", "video-editor", "Stories", ["travel", "trip"], "youtube", "calm", "mountains travel nature lake", 1, "sans", 3, "slide", (c) => [S(c, "full", { center: 1 }, "head", { title: "Northern trip", lines: 1, max: 200 }), S(c, "lower", {}, "lower", { name: "Day 1 · The lake" }), S(c, "lower", {}, "lower", { name: "Day 2 · The hills" })]),
  HM("team-update", "Team update", "video-editor", "Work", ["team", "update", "work"], "youtube", "calm", "meeting office business", 9, "sans", 2, "push", (c) => [S(c, "poster", {}, "head", { title: "Monthly update", lines: 1, max: 190 }), S(c, "lower", {}, "lower", { title: "Sales up 12% this month", name: "Sara · Sales lead", lines: 1, upper: false })]),
  HM("property-tour", "Property tour", "video-editor", "Work", ["real estate", "house", "tour"], "youtube", "calm", "interior architecture house", 10, "sans", 3, "slide", (c) => [S(c, "full", {}, "head", { eyebrow: "For sale", title: "3-bed family home", sub: "Lake View Phase 2" }), S(c, "checklist", {}, "list", { title: "Why you will love it", items: ["Garden", "Parking", "Near school"] }, { dur: 4 })]),
  HM("fitness-tips", "Fitness tips", "video-editor", "Stories", ["fitness", "health", "tips"], "shorts", "upbeat", "fitness sport gym", 11, "sans", 0, "push", (c) => [S(c, "duo", {}, "head", { title: "3 easy stretches", max: 210 }), S(c, "bigstat", {}, "big", { big: "01", label: "Neck roll", sub: "30 seconds" })]),
  HM("podcast-clip", "Podcast clip", "video-editor", "Stories", ["podcast", "audio", "clip"], "square", "calm", "abstract lights bokeh", 12, "serif", 1, "crossfade", (c) => [S(c, "spot", {}, "quote", { quote: "Start before you feel ready.", person: "The Good Habits Podcast · Ep. 4" }, { dur: 5 })]),
  HM("wedding-highlights", "Wedding highlights", "video-editor", "Openers and endings", ["wedding", "love"], "youtube", "calm", "celebration flowers wedding", 8, "serif", 1, "crossfade", (c) => [S(c, "arch", {}, "head", { eyebrow: "The wedding of", title: "Ali & Hina", upper: false, max: 170 }), S(c, "dim", {}, "head", { title: "12 · 12 · 2026", sub: "Garden Marquee", upper: false })]),
  HM("school-project", "School project", "video-editor", "Teach and explain", ["school", "project", "class"], "youtube", "", "sea sky clouds", 1, "sans", 2, "push", (c) => [S(c, "magazine", {}, "head", { eyebrow: "Science project", title: "The water cycle", lines: 1 }), S(c, "checklist", {}, "list", { title: "Three stages", items: ["Evaporation", "Clouds", "Rain"], num: 1 }, { dur: 4 })]),
  // ---- YouTube
  HM("yt-channel-intro", "YouTube channel intro", "youtube-video-editor", "Intros and outros", ["youtube", "intro", "channel"], "youtube", "upbeat", "food restaurant kitchen", 2, "sans", 0, "zoom", (c) => [S(c, "thumbcut", {}, "words", { lines: ["Cook", "With Zara"], sub: "New recipes every Friday" }, { dur: 3.5 })]),
  HM("yt-outro-subscribe", "Outro: subscribe", "youtube-video-editor", "Intros and outros", ["youtube", "outro", "subscribe"], "youtube", "upbeat", "city night lights", 9, "sans", 0, "crossfade", (c) => [S(c, "tiles", { avatar: 1 }, "head", { eyebrow: "See you next week", title: "Thanks for watching", cta: "Subscribe for more" }, { dur: 4 })]),
  { ...HM("yt-tutorial", "Tutorial with chapters", "youtube-video-editor", "Formats", ["youtube", "tutorial", "chapters"], "youtube", "calm", "workspace office meeting tech laptop", 4, "sans", 2, "push", (c) => [S(c, "window", {}, "head", { eyebrow: "Tech tips", title: "Fix a slow laptop", sub: "Two quick fixes" }), S(c, "split", { panel: "light" }, "step", { step: "Step 1", title: "Clean startup apps" }), S(c, "split", { side: "R", panel: "light" }, "step", { step: "Step 2", title: "Free up space" })]), chapters: ["Intro", "Step 1", "Step 2"] },
  HM("yt-review", "Product review", "youtube-video-editor", "Formats", ["youtube", "review"], "youtube", "upbeat", "workspace abstract tech", 7, "sans", 0, "zoom", (c) => [S(c, "thumbcut", {}, "words", { lines: ["Honest", "review"], sub: "Budget headphones" }), S(c, "bigstat", {}, "big", { big: "8/10", label: "Great sound", sub: "Weak case" })]),
  HM("yt-vlog", "Weekly vlog", "youtube-video-editor", "Formats", ["youtube", "vlog"], "youtube", "happy", "interior city home", 6, "sans", 3, "slide", (c) => [S(c, "full", {}, "head", { eyebrow: "Weekly vlog", title: "Moving day!", sub: "Episode 8" }), S(c, "lower", {}, "lower", { name: "New home tour", role: "Part 1" })]),
  HM("yt-shorts-hook", "Shorts hook", "youtube-video-editor", "Shorts", ["youtube", "shorts", "hook"], "shorts", "upbeat", "celebration lights", 2, "sans", 0, "zoom", (c) => [S(c, "neon", {}, "head", { title: "Wait for it…", max: 230 }, { dur: 2 }), S(c, "confetti", {}, "head", { title: "It worked!", sub: "Follow for part 2", max: 230 })]),
  HM("yt-news", "News update", "youtube-video-editor", "Formats", ["youtube", "news"], "youtube", "calm", "tech office city", 9, "sans", 2, "wipe", (c) => [S(c, "lower", {}, "lower", { tag: "This week", title: "This week in tech", name: "Episode 21", role: "3 stories" }, { dur: 3.5 })]),
  HM("yt-top5", "Top 5 countdown", "youtube-video-editor", "Formats", ["youtube", "list", "countdown"], "youtube", "upbeat", "education books library", 12, "sans", 0, "zoom", (c) => [S(c, "neon", {}, "head", { eyebrow: "Countdown", title: "Top 5 study apps" }), S(c, "bigstat", {}, "big", { big: "#5", label: "Flash cards" }, { dur: 2.5 }), S(c, "bigstat", {}, "big", { big: "#4", label: "Focus timer" }, { dur: 2.5 })]),
];
// People in the hand-made templates: id -> [[scene, photo slot, key, kind]] (kinds of video/people.js; 4 = the end screen's avatar).
const HAND_PEOPLE = {
  "reel-promo": [[0, 0, "model", "fashion:f"], [0, 1, "me", "creator"]], "birthday-wish": [[0, 0, "kid", "child"]],
  "photo-slideshow": [[0, 0, "us", "family"]], "event-invite": [[0, 0, "couple", "couple"]], "thank-you-customers": [[1, 0, "fans", "friends"]],
  "vlog-opener": [[0, 0, "me", "creator:f"]], "travel-montage": [[0, 0, "me", "traveller"]], "team-update": [[0, 0, "team", "team"], [1, 0, "sara", "business:f"]],
  "fitness-tips": [[0, 0, "coach", "trainer"]], "podcast-clip": [[0, 0, "host", "host"]], "wedding-highlights": [[0, 0, "couple", "couple"]],
  "yt-channel-intro": [[0, 0, "zara", "cook:f"]], "yt-outro-subscribe": [[0, 4, "me", "creator"]], "yt-tutorial": [[0, 0, "me", "developer"]],
  "yt-review": [[0, 0, "me", "creator"]], "yt-vlog": [[0, 0, "me", "creator"]], "yt-shorts-hook": [[0, 0, "me", "creator"]], "yt-news": [[0, 0, "me", "speaker"]],
  "yt-top5": [[0, 0, "me", "reader"]],
};
const ED = ED_DEFS.map((h) => ({ layout: "made-" + h.id, layoutName: h.name, id: h.id, name: h.name, tool: h.tool, section: h.section, tags: h.tags, preset: h.preset, music: h.music, ...(h.chapters ? { chapters: h.chapters } : {}), _h: h }));
function handSpec(t) {
  const h = t._h, pal = PALETTES[h.pi], built = h.build(ctx(h.preset, pal, h.fam, MOTIONS[h.mi][2]));
  const { _h, ...rest } = t;
  return { ...rest, pages: built.length, font: h.fam, scenes: finish(t.id, built, pal, h.topic, h.tr, HAND_PEOPLE[t.id], h.preset) };
}
const HAND_SPEC = new Map();

// ---------- trimmer and MP4 converter: ready-made settings
const TRIM = [
  { id: "trim-first-15", name: "Reel length (first 15 s)", trim: { kind: "first", n: 15 }, tags: ["reel", "instagram"] },
  { id: "trim-first-30", name: "Status length (first 30 s)", trim: { kind: "first", n: 30 }, tags: ["status", "whatsapp"] },
  { id: "trim-first-60", name: "Shorts length (first 60 s)", trim: { kind: "first", n: 60 }, tags: ["shorts", "youtube"] },
  { id: "trim-drop-intro", name: "Remove the first 5 s", trim: { kind: "dropStart", n: 5 }, tags: ["intro", "start"] },
  { id: "trim-drop-ending", name: "Remove the last 10 s", trim: { kind: "dropEnd", n: 10 }, tags: ["end", "outro"] },
  { id: "trim-cut-middle", name: "Cut out the middle", trim: { kind: "cutMiddle" }, tags: ["middle", "cut"] },
  { id: "trim-teaser-10", name: "10 s teaser from the middle", trim: { kind: "middle", n: 10 }, tags: ["teaser", "preview"] },
  { id: "trim-loop-6", name: "6 s loop as WebM", trim: { kind: "first", n: 6, format: "webm" }, tags: ["loop", "gif", "webm"] },
].map((t) => ({ ...t, tool: "video-trimmer", section: "Popular cuts" }));
const CONV = [
  { id: "mp4-whatsapp", name: "WhatsApp share", conv: { quality: "small", height: 720 }, tags: ["whatsapp", "small"] },
  { id: "mp4-email", name: "Email attachment", conv: { quality: "small", height: 480 }, tags: ["email", "tiny"] },
  { id: "mp4-youtube", name: "YouTube upload", conv: { quality: "high", height: 1080 }, tags: ["youtube", "hd"] },
  { id: "mp4-instagram", name: "Instagram post", conv: { quality: "balanced", height: 1080 }, tags: ["instagram", "social"] },
  { id: "mp4-same", name: "Best quality, same size", conv: { quality: "high", height: 0 }, tags: ["archive", "best"] },
  { id: "mp4-website", name: "Website video", conv: { quality: "balanced", height: 720 }, tags: ["web", "site"] },
  { id: "mp4-old-phone", name: "Old phone friendly", conv: { quality: "balanced", height: 480 }, tags: ["phone", "small"] },
  { id: "mp4-slides", name: "Presentation clip", conv: { quality: "balanced", height: 1080 }, tags: ["slides", "presentation"] },
].map((t) => ({ ...t, tool: "convert-videos-to-mp4", section: "Popular settings" }));
// Trimmer: ready-made cuts (kind × length) × format; converter: purpose × quality × size.
const TRIM_SPECS = [
  ...[5, 6, 10, 15, 20, 30, 45, 60, 90, 120].map((n) => ["first", n, "Keep the start", `First ${n} s`]),
  ...[2, 3, 5, 10, 15].map((n) => ["dropStart", n, "Remove the start", `Remove the first ${n} s`]),
  ...[3, 5, 10, 15, 20].map((n) => ["dropEnd", n, "Remove the end", `Remove the last ${n} s`]),
  ...[5, 10, 15, 30].map((n) => ["middle", n, "Teasers from the middle", `${n} s from the middle`]),
  ["cutMiddle", 0, "Cut out a part", "Cut out the middle third"],
  ...[[5, 10], [10, 15], [15, 15], [30, 30], [60, 30]].map(([f, n]) => ["window", n, "Keep a part", `${n} s from ${f} s`, f]),
];
const TRIM_GEN = [];
for (const fmt of ["mp4", "webm"]) for (const [i, [kind, n, section, label, from]] of TRIM_SPECS.entries()) TRIM_GEN.push({ id: `trim.${kind}-${n}${from != null ? "-" + from : ""}~${fmt}`, name: `${label} (${fmt.toUpperCase()})`, tool: "video-trimmer", section, tags: [kind, fmt, String(n)], trim: { kind, n, from, format: fmt }, ord: i * 2 + (fmt === "webm") });
TRIM_GEN.sort((a, b) => a.ord - b.ord);
TRIM_GEN.length = 16; // 8 popular + 16 = 24 starters (Canva has no trimmer templates)
const PURPOSES = [["whatsapp", "WhatsApp"], ["email", "Email"], ["youtube", "YouTube"], ["instagram", "Instagram"], ["website", "Website"], ["slides", "Presentation"], ["phone", "Old phone"], ["archive", "Archive"], ["tv", "TV"], ["class", "Class upload"], ["support", "Support ticket"], ["tablet", "Tablet"]];
const QN = { high: "High quality", balanced: "Balanced", small: "Small file" };
const CONV_GEN = [];
{ const combos = []; for (const q of ["small", "balanced", "high"]) for (const h of [720, 480, 1080, 0]) combos.push([q, h]);
  const seen = new Set();
  for (let i = 0; CONV_GEN.length < 16 && i < 2000; i++) {
    const [k, label] = PURPOSES[i % PURPOSES.length], [q, h] = combos[(i * 5 + Math.floor(i / PURPOSES.length)) % combos.length], id = `mp4.${q}-${h}~${k}`;
    if (seen.has(id)) continue; seen.add(id);
    CONV_GEN.push({ id, name: `${label} · ${QN[q]} · ${h ? h + "p" : "same size"}`, tool: "convert-videos-to-mp4", section: `For ${label}`, tags: [k, label, q, String(h)], conv: { quality: q, height: h } });
  } }

const STARTERS = 40; // generated templates listed in TEMPLATES per tool (the rest come through page())
const genFirst = (prefix, n) => Array.from({ length: n }, (_, i) => meta(genAt(prefix, i)));
const HAND = new Map([...ED, ...TRIM, ...TRIM_GEN, ...CONV, ...CONV_GEN].map((t) => [t.id, t]));
for (const t of ED) t.pages = handSpecOf(t.id).scenes.length;
const strip = (t) => { if (!t?._h) return t; const { _h, ...r } = t; return r; };
/** Starter list (hand-made + the first generated ones per tool). The full lists come from page(). */
export const TEMPLATES = [...ED.map(strip), ...genFirst("v", STARTERS), ...genFirst("e", STARTERS), ...genFirst("y", STARTERS), ...TRIM, ...TRIM_GEN, ...CONV, ...CONV_GEN];
const handFor = (tool) => [...HAND.values()].filter((t) => t.tool === tool);
export const TOTALS = Object.fromEntries([...Object.values(TOOLS).map((T0) => [T0.tool, T0.total]), ["video-trimmer", handFor("video-trimmer").length], ["convert-videos-to-mp4", handFor("convert-videos-to-mp4").length]]);
export const TOTAL = Object.values(TOTALS).reduce((a, b) => a + b, 0);
/** Filter chips for one tool's Templates panel (layouts of that tool + themes). Generated templates carry layout/theme. */
export function filtersFor(tool) {
  const T0 = TOOLS[PREFIX[tool]]; if (!T0) return [];
  return [{ key: "layout", label: "Layout", options: T0.layouts.map((k) => ({ value: k, label: LAYOUT_DEFS[k][0] })) },
    { key: "theme", label: "Theme", options: THEMES.map((t) => ({ value: t.k, label: t.label })) }];
}
/** Distinct base layouts (designs) behind one tool's list: generated layouts + the hand-made designs of that tool. */
export function layoutsFor(tool) {
  const pre = PREFIX[tool], hand = handFor(tool).filter((t) => t._h).length;
  return pre ? TOOLS[pre].layouts.length + hand : handFor(tool).length;
}
/** Gallery object for one tool (what the editor frame's Templates panel gets): its own TOTAL and chips. */
export const galleryFor = (tool) => ({ TEMPLATES: TEMPLATES.filter((t) => t.tool === tool), TOTAL: TOTALS[tool] || 0, FILTERS: filtersFor(tool), page, thumb, thumbPage, meta, templateMeta: meta, styleOf });
const FONT_NAMES = { sans: "Sans", serif: "Serif", mono: "Mono", calibri: "Calibri style", cambria: "Cambria style" };
/** A video template's style for "Apply this template style": its palette colours and its fonts (heading, body). */
export function styleOf(id) {
  const t = byId(id); if (!t?.scenes) return null;
  const pal = t.scenes.find((s) => s.pal)?.pal, texts = t.scenes.flatMap((s) => s.texts || []);
  const head = texts.find((x) => x.style === "title") || texts[0], body = texts.find((x) => x !== head && x.style !== "title") || head;
  const fonts = [head?.family || t.font, body?.family || t.font].filter(Boolean).map((f) => FONT_NAMES[f] || f); // [heading, body]
  return { name: pal?.name || t.name, colors: pal ? [pal.dark, pal.a, pal.b, pal.light] : [head?.color, body?.color].filter(Boolean), fonts };
}
/** Paged list for the editor's Templates panel: hand-made first, then generated; q matches every word in name/tags. */
export function page(tool, { q = "", offset = 0, limit = 40, filters = {} } = {}) {
  const tools = [].concat(tool || "video-editor"), words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  const fl = Object.entries(filters || {}).filter(([, v]) => v != null && v !== "");
  const lists = tools.map((tl) => { const pre = PREFIX[tl], hand = handFor(tl).map(strip); return { hand, pre, n: hand.length + (pre ? TOOLS[pre].total - hand.length : 0) }; });
  const at = (li, i) => { const l = lists[li]; return i < l.hand.length ? l.hand[i] : meta(genAt(l.pre, i - l.hand.length)); };
  const hit = (x) => (!words.length || words.every((w) => [x.name, x.section, x.tool, ...(x.tags || [])].join(" ").toLowerCase().includes(w))) && fl.every(([k, v]) => x[k] === v);
  if (!words.length && !fl.length) {
    const total = lists.reduce((a, l) => a + l.n, 0), items = [];
    for (let k = offset; k < Math.min(total, offset + limit); k++) { let i = k, li = 0; while (i >= lists[li].n) { i -= lists[li].n; li++; } items.push(at(li, i)); }
    return { items, total };
  }
  const items = []; let total = 0;
  lists.forEach((l, li) => { for (let i = 0; i < l.n; i++) { const x = at(li, i); if (hit(x)) { if (total >= offset && items.length < limit) items.push(x); total++; } } });
  return { items, total };
}
function handSpecOf(id) { let s = HAND_SPEC.get(id); if (!s) { const t = HAND.get(id); if (!t?._h) return null; s = handSpec(t); HAND_SPEC.set(id, s); } return s; }
export const byId = (id) => { const t = HAND.get(id); if (t) return t._h ? handSpecOf(id) : t; return genSpec(id); };

// ---------- thumbnails (320 x 200): the first scene as a finished frame, words placed exactly like the player draws them
const SIZES = { youtube: [1920, 1080], shorts: [1080, 1920], square: [1080, 1080], portrait: [1080, 1350] };
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const lengthOf = (t) => t.scenes.reduce((a, s, i) => a + (s.dur || 3) - (i && s.tr && s.tr.type !== "black" && s.tr.type !== "none" ? s.tr.dur || 0.5 : 0), 0);
function chip(x, y, label) {
  const w = 22 + label.length * 6.1;
  return rect(x, y, w, 17, "#0b0d14", 8.5, ' fill-opacity=".62"') + pathEl(`M${x + 7} ${y + 4.5}L${x + 13.5} ${y + 8.5}L${x + 7} ${y + 12.5}Z`, "#ffffff") + `<text x="${x + 17}" y="${y + 12.4}" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#ffffff">${esc(label)}</text>`;
}
function frameSvg(k, t, sc, fx, fy, fw, fh, { words = true } = {}) {
  const [W] = UNITS[t.preset] || UNITS.youtube, s = fw / W;
  let out = sceneBody(k, sc, fx, fy, fw, fh, "thumb");
  if (words) for (const c of sc.texts || []) out += clipSvg(c, fx, fy, fw, fh, s);
  return out;
}
function videoThumb(t, i0 = 0) {
  const n = t.scenes.length, i = ((i0 % n) + n) % n, sc = t.scenes[i], P = sc.pal, [PW, PH] = SIZES[t.preset] || SIZES.youtube, k = kit(t.id, "t" + i);
  let body;
  if (PW / PH > 1.5) {
    // 16:9: the whole frame, with a player bar under it (play, length, one tick per scene)
    body = frameSvg(k, t, sc, 0, 0, 320, 180) + rect(0, 180, 320, 20, "#0b0d14") + pathEl("M9 185L16 190L9 195Z", "#ffffff")
      + `<text x="22" y="194" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#ffffff">${esc(fmtDur(lengthOf(t)))}</text>`;
    const x0 = 52, x1 = n > 1 ? 262 : 306, segW = (x1 - x0) / n;
    for (let j = 0; j < n; j++) body += rect(x0 + j * segW + (j ? 1.5 : 0), 188.5, segW - (j ? 1.5 : 0), 3, j < i ? P.b : j === i ? P.a : "#ffffff", 1.5, j > i ? ' opacity=".28"' : "");
    return k.svg(320, 200, body);
  } else {
    const fh = 184, fw = (fh * PW) / PH, fx = (320 - fw) / 2, fy = 8, sh = fh * 0.82, sw = fw * 0.82;
    // the card's faded backdrop is the scene's place photo (a person shows once, in the frame)
    body = rect(0, 0, 320, 200, P.dark) + k.photo(sc.photos.find((p) => !isPerson(p)) || sc.photos[0], 0, 0, 320, 200, { opacity: 0.38 }) + rect(0, 0, 320, 200, k.lin([[P.dark, 0.55], [P.a, 0.45]], 30));
    if (n > 1) [[(i + 1) % n, fx - sw * 0.72], [(i + (n > 2 ? 2 : 1)) % n, fx + fw - sw * 0.28]].forEach(([j, x]) => {
      const s2 = t.scenes[j], y = fy + (fh - sh) / 2;
      body += rect(x, y, sw, sh, "#000000", 8, k.shadow(3, 8, 0.35)) + `<g${k.clipRect(x, y, sw, sh, 8)}>${sceneBody(k, s2, x, y, sw, sh, "thumb")}${rect(x, y, sw, sh, P.dark, 0, ' opacity=".45"')}</g>`;
    });
    body += rect(fx, fy, fw, fh, "#000000", 10, k.shadow(4, 12, 0.45)) + `<g${k.clipRect(fx, fy, fw, fh, 10)}>${frameSvg(k, t, sc, fx, fy, fw, fh)}</g>`;
  }
  body += chip(8, 175, fmtDur(lengthOf(t))); // left of the frame (the panel adds its own "1 of N" scenes badge)
  return k.svg(320, 200, body);
}
// trimmer cuts and converter settings: a finished video frame with a real photo and the setting on it
const TOOL_PAL = [PALETTES[4], PALETTES[2], PALETTES[9], PALETTES[7], PALETTES[12], PALETTES[1], PALETTES[11], PALETTES[5]];
const TRIM_TOPIC = { reel: "fashion city", status: "celebration flowers", shorts: "city night", intro: "mountains travel", end: "sky sea", middle: "sea travel beach", teaser: "celebration lights", loop: "nature sea" };
// clips that are about people show a person (kinds of video/people.js): reels, status clips, Shorts, vlog intros, concert
// teasers; the generated "keep the start" cuts of those lengths (15 s reel, 30 s status, 60 s Shorts) too
const TRIM_PEOPLE = { reel: "fashion:f", status: "friends", shorts: "creator", intro: "creator", teaser: "crowd" }, TRIM_LEN_PEOPLE = { 15: "fashion:f", 30: "friends", 60: "creator" };
function trimThumb(t) {
  const k = kit(t.id, "tr"), h = hash(t.id), P = TOOL_PAL[h % TOOL_PAL.length], tg = (t.tags || []).find((x) => TRIM_TOPIC[x]);
  const who = tg ? TRIM_PEOPLE[tg] : t.trim.kind === "first" ? TRIM_LEN_PEOPLE[t.trim.n] : null;
  const p = (who && person(who, t.id)) || photoPool(tg ? TRIM_TOPIC[tg] : ["travel road", "city night", "nature valley", "food coffee", "sea travel beach", "mountains nature"][h % 6], 1, t.id)[0];
  const kd = t.trim.kind, keep = kd === "first" ? [0, 0.32] : kd === "dropStart" ? [0.16, 1] : kd === "dropEnd" ? [0, 0.82] : kd === "middle" ? [0.38, 0.62] : kd === "window" ? [0.2, 0.55] : [0.33, 0.66], cut = kd === "cutMiddle";
  let s = rect(0, 0, 320, 200, P.dark) + k.photo(p, 0, 0, 320, 132) + k.scrim(0, 40, 320, 92, P.dark, 0, 0.92) + k.scrim(0, 0, 320, 40, "#000000", 0, 0.45, "down");
  const big = t.trim.n ? (kd === "dropStart" || kd === "dropEnd" ? `−${t.trim.n} s` : `${t.trim.n} s`) : "Cut";
  s += `<text x="16" y="96" font-family="Arial,sans-serif" font-size="38" font-weight="900" fill="#ffffff">${esc(big)}</text>`;
  const label = t.name.replace(/\s*\((MP4|WEBM)\)$/i, "").replace(/\s*\(.*\)$/, "");
  s += `<text x="16" y="118" font-family="Arial,sans-serif" font-size="12.5" font-weight="700" fill="#ffffff" opacity=".92">${esc(label.length > 40 ? label.slice(0, 39) + "…" : label)}</text>`;
  const fmt = (t.trim.format || (/(webm)/i.test(t.name) ? "webm" : "mp4")).toUpperCase();
  s += k.pill(304, 12, fmt, { size: 9.5, fill: P.b, color: onBg(P.b), anchor: "end" }).svg + `<circle cx="20" cy="20" r="4.5" fill="#ef4444"/><text x="29" y="24" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#ffffff">${esc(fmtDur(kd === "first" ? t.trim.n || 15 : 92))}</text>`;
  // film strip with handles
  const x0 = 16, sw = 288, fy = 142, fh = 40, nF = 8, fwid = sw / nF;
  s += rect(x0 - 2, fy - 2, sw + 4, fh + 4, "#000000", 6, ' opacity=".5"');
  for (let i = 0; i < nF; i++) s += k.photo(p, x0 + i * fwid + 0.6, fy, fwid - 1.2, fh, isPerson(p) ? {} : { align: ["xMinYMid", "xMidYMid", "xMaxYMid"][i % 3] }); // people: cropped around the face
  const a = x0 + keep[0] * sw, b = x0 + keep[1] * sw;
  if (cut) s += rect(a, fy, b - a, fh, "#0b0d14", 0, ' opacity=".72"') + pathEl(`M${a + 8} ${fy + 8}L${b - 8} ${fy + fh - 8}M${b - 8} ${fy + 8}L${a + 8} ${fy + fh - 8}`, "none", ' stroke="#ef4444" stroke-width="3" stroke-linecap="round"') + rect(a, fy - 3, b - a, fh + 6, "none", 4, ' stroke="#ef4444" stroke-width="2.5"');
  else s += rect(x0, fy, Math.max(0, a - x0), fh, "#0b0d14", 0, ' opacity=".72"') + rect(b, fy, Math.max(0, x0 + sw - b), fh, "#0b0d14", 0, ' opacity=".72"') + rect(a, fy - 3, b - a, fh + 6, "none", 5, ` stroke="${P.b}" stroke-width="3"`) + rect(a - 4, fy - 3, 7, fh + 6, P.b, 3) + rect(b - 3, fy - 3, 7, fh + 6, P.b, 3);
  s += rect(x0, 190, sw, 3, "#ffffff", 1.5, ' opacity=".2"') + rect(a, 190, b - a, 3, cut ? "#ef4444" : P.b, 1.5);
  return k.svg(320, 200, s);
}
const CONV_TOPIC = { whatsapp: "celebration party", email: "workspace meeting office", youtube: "city night", instagram: "fashion food", website: "tech workspace", slides: "meeting office", phone: "travel road", archive: "mountains nature", tv: "sea nature", class: "education school", support: "tech workspace", tablet: "interior home" };
const CONV_PEOPLE = { whatsapp: "family", youtube: "creator", slides: "speaker", class: "students", support: "support" }; // videos of people
function convThumb(t) {
  const k = kit(t.id, "cv"), h = hash(t.id), P = TOOL_PAL[(h >>> 3) % TOOL_PAL.length], key = t.tags?.[0] || "website", c = t.conv;
  const p = (CONV_PEOPLE[key] && person(CONV_PEOPLE[key], t.id)) || photoPool(CONV_TOPIC[key] || "city", 1, t.id)[0], res = c.height ? `${c.height}p` : "Original", q = QN[c.quality];
  let s = rect(0, 0, 320, 200, k.lin([P.dark, mix(P.dark, P.a, 0.55)], 30)) + rect(0, 0, 320, 200, k.dots("#ffffff", 12, 1, 0.12));
  // the video frame (16:9) with player bar
  s += rect(14, 16, 180, 101, "#000000", 10, k.shadow(5, 12, 0.45)) + k.photo(p, 14, 16, 180, 101, { rx: 10 }) + `<g${k.clipRect(14, 16, 180, 101, 10)}>` + k.scrim(14, 70, 180, 47, "#000000", 0, 0.7) + rect(24, 106, 160, 3, "#ffffff", 1.5, ' opacity=".4"') + rect(24, 106, 96, 3, P.b, 1.5) + `</g>` + k.play(104, 62, 12, { fill: "#ffffff", color: P.a });
  s += k.pill(22, 24, "MOV", { size: 9, fill: "#0b0d14", color: "#ffffff" }).svg;
  // the MP4 file card
  s += `<g transform="rotate(5 262 66)">` + rect(222, 20, 82, 96, "#ffffff", 10, k.shadow(5, 12, 0.4)) + rect(222, 20, 82, 30, P.a, 0, "") + `</g>`;
  s += `<g transform="rotate(5 262 66)"><text x="263" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="900" fill="${onBg(P.a)}">MP4</text><text x="263" y="78" text-anchor="middle" font-family="Arial,sans-serif" font-size="${res.length > 5 ? 15 : 22}" font-weight="900" fill="#111827">${esc(res)}</text><text x="263" y="96" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#6b7280">H.264 · AAC</text></g>`;
  s += pathEl("M198 66h14m-5-5 5 5-5 5", "none", ` stroke="${P.b}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`);
  const label = t.name.split(" · ")[0];
  s += `<text x="16" y="152" font-family="Arial,sans-serif" font-size="${label.length > 19 ? 19 : 24}" font-weight="900" fill="#ffffff">${esc(label.length > 28 ? label.slice(0, 27) + "…" : label)}</text>`;
  s += k.pill(16, 164, q, { size: 9.5, fill: P.b, color: onBg(P.b) }).svg + k.pill(30 + q.length * 5.6 + 14, 164, c.height ? `${c.height}p` : "Same size", { size: 9.5, fill: "#ffffff", color: "#111827" }).svg;
  return k.svg(320, 200, s);
}
/** 320x200 SVG card: the first scene as a finished video frame (photo, words, length), or a tool setting as a video frame. */
export function thumb(id) {
  const t = byId(id);
  if (!t) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#eef0f8"/></svg>';
  if (t.scenes) return videoThumb(t, 0);
  if (t.trim) return trimThumb(t);
  return convThumb(t);
}
/** Card picture of scene i (the Templates panel flips through the scenes on hover). */
export function thumbPage(id, i = 0) { const t = byId(id); return t?.scenes ? videoThumb(t, i) : thumb(id); }
export { textWidth };
