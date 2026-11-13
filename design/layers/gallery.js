// Magic Layers sample designs (pure module: no DOM). Used by the editor's Templates panel and the intro page.
// A GENERATOR: hand-made base LAYOUTS × own colour PALETTES × content THEMES (purpose + matching text). The id encodes the
// combination (`poster~p07~clinic`), so thumb(id) and design(id) build any of them on demand.
// Every sample is a real layered design made the way a flat poster splits into layers: a background (most of them a real
// photo from the shared library with a colour wash), picture layers (real photos clipped to shapes, badges, stickers) and
// real text layers, so the layer list, Replace picture, the text panel, the exports and "Open in Studio" all work on it.
// Thumbnails show the finished design next to its layers pulled apart in 3D (background, pictures, text).
import { imageLayer, newId, LINE_HEIGHT, baselineOffset } from "./build.js";
import { PHOTOS, photoUrl } from "../shared/photo-library.js";

const TOOL = "magic-layers";
const COUNT = 64; // Canva has no Magic Layers template type: one of each base layout, then more themes/colours (the generator can make many more)
const FONT = { sans: "Arial, Helvetica, sans-serif", serif: "Georgia, 'Times New Roman', serif", mono: "'Courier New', monospace" };
const svgDoc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- colour palettes: bg/bg2 = background, ink = text on it, acc/acc2 = accents, band + onBand = a strip and its text */
const PALETTES = [
  ["p01", "Sunny", "#fff4c7", "#ffc58a", "#1d2a5c", "#e2582f", "#3fa34d", "#1d2a5c", "#ffffff"],
  ["p02", "Espresso", "#3b2418", "#5a3a28", "#f6efe6", "#ffd29a", "#c8894b", "#c8894b", "#3b2418"],
  ["p03", "Lavender", "#ece8ff", "#ffe3ea", "#26215c", "#5b4cf0", "#ff8fab", "#5b4cf0", "#ffffff"],
  ["p04", "Lagoon", "#0f766e", "#14b8a6", "#ffffff", "#fde68a", "#5eead4", "#fef3c7", "#0f766e"],
  ["p05", "Royal", "#1e3a8a", "#2f80ff", "#ffffff", "#facc15", "#60a5fa", "#facc15", "#1e3a8a"],
  ["p06", "Garden", "#f3f7ee", "#dcebd0", "#274e13", "#6aa84f", "#b45f06", "#274e13", "#ffffff"],
  ["p07", "Blush", "#fff0f5", "#ffd6e5", "#3b1f2b", "#be185d", "#60a5fa", "#be185d", "#ffffff"],
  ["p08", "Ivory gold", "#fbf6ee", "#f1e4cc", "#3b2f2f", "#b8893f", "#d48a92", "#3b2f2f", "#fbf6ee"],
  ["p09", "Midnight", "#111827", "#1f2937", "#f9fafb", "#22d3ee", "#a78bfa", "#22d3ee", "#111827"],
  ["p10", "Coral", "#fff1ec", "#ffd0c2", "#2d1b16", "#ff6b4a", "#2a9d8f", "#2a9d8f", "#ffffff"],
  ["p11", "Forest", "#14532d", "#166534", "#f0fdf4", "#bef264", "#fbbf24", "#bef264", "#14532d"],
  ["p12", "Clean", "#ffffff", "#e2e8f0", "#0f172a", "#0ea5e9", "#f97316", "#0f172a", "#ffffff"],
  ["p13", "Plum", "#3b0764", "#6b21a8", "#faf5ff", "#f0abfc", "#fde047", "#f0abfc", "#3b0764"],
  ["p14", "Sand", "#fef3c7", "#fde68a", "#451a03", "#b45309", "#0f766e", "#451a03", "#fef3c7"],
].map(([id, name, bg, bg2, ink, acc, acc2, band, onBand]) => ({ id, name, bg, bg2, ink, acc, acc2, band, onBand }));

/* ---------- content themes (own text; short enough for every layout, long lines are sized to fit) */
const THEMES = [
  { id: "school", label: "School", icon: "book", brand: "Bright Minds School", head: "ADMISSIONS OPEN", word: "ENROL", tag: "Classes for ages 4 to 16", offer: "First week free", pct: "FREE TRIAL", event: "Open day", date: "Saturday 14 June, 10 am", day: "14", month: "JUNE", place: "45 Garden Road", contact: "+92 300 1112233", web: "brightminds.example", handle: "@brightminds", person: "Sana Malik", role: "Principal", job: "Science teacher", product: "Smart study kit", workshop: "Study skills for parents", quote: ["Every child can shine", "with the right start."], listTitle: "Fees per month", list: [["Nursery", "9,000"], ["Primary", "12,000"], ["Middle", "15,000"], ["Transport", "3,000"]], items: ["Science and computer labs", "Sports, art and music", "Small classes"], hours: "Office open 8 am to 2 pm" },
  { id: "shop", label: "Shop", icon: "bag", brand: "Corner Market", head: "FRESH FRUIT", word: "SALE", tag: "Up to 40% off this weekend", offer: "Buy 2, get 1 free", pct: "40% OFF", event: "Weekend sale", date: "Sat and Sun, 8 am to 2 pm", day: "21", month: "JUNE", place: "Green Street Market", contact: "+92 321 4445566", web: "cornermarket.example", handle: "@cornermarket", person: "Hamid Iqbal", role: "Store manager", job: "Store assistant", product: "Fresh box delivery", workshop: "Smart grocery shopping", quote: ["Fresh every morning,", "fair prices every day."], listTitle: "Today's prices", list: [["Mangoes, 1 kg", "350"], ["Apples, 1 kg", "420"], ["Bananas, dozen", "180"], ["Grapes, 1 kg", "500"]], items: ["Fresh stock every morning", "Free home delivery", "Easy card payments"], hours: "Open daily 8 am to 10 pm" },
  { id: "clinic", label: "Clinic", icon: "cross", brand: "CarePoint Clinic", head: "FREE HEALTH CAMP", word: "CARE", tag: "Check-ups for the whole family", offer: "Free blood pressure check", pct: "FREE CHECK", event: "Health camp", date: "Sunday 22 June, 9 am", day: "22", month: "JUNE", place: "Block C, Model Town", contact: "+92 333 7778899", web: "carepoint.example", handle: "@carepointclinic", person: "Dr. Ali Raza", role: "Family physician", job: "Staff nurse", product: "Home care visits", workshop: "Healthy heart basics", quote: ["Small habits today,", "a healthy heart tomorrow."], listTitle: "Services", list: [["General check-up", "1,500"], ["Blood tests", "2,000"], ["Child care visit", "1,800"], ["Home visit", "3,500"]], items: ["Qualified doctors", "Lab tests on site", "Open on Sundays"], hours: "Open 9 am to 9 pm, all week" },
  { id: "restaurant", label: "Restaurant", icon: "plate", brand: "Spice Route Kitchen", head: "FOOD FESTIVAL", word: "FEAST", tag: "Dishes from twelve cities", offer: "Family deal for four", pct: "25% OFF", event: "Food festival", date: "Friday 20 June, 7 pm", day: "20", month: "JUNE", place: "Food Street, Old Town", contact: "+92 300 2223344", web: "spiceroute.example", handle: "@spiceroutekitchen", person: "Bilal Ahmed", role: "Head chef", job: "Line cook", product: "Weekend dinner box", workshop: "Home cooking class", quote: ["Good food brings", "good people together."], listTitle: "Menu", list: [["Chicken karahi", "1,450"], ["Daal and rice", "650"], ["Grilled fish", "1,800"], ["Mango lassi", "300"]], items: ["Fresh spices daily", "Family seating", "Free parking"], hours: "Open daily 12 pm to 12 am" },
  { id: "wedding", label: "Wedding", icon: "rings", brand: "Hina and Omar", head: "WE ARE GETTING MARRIED", word: "LOVE", tag: "Join us to celebrate", offer: "Dinner and music", pct: "SAVE THE DATE", event: "Our wedding", date: "Saturday 12 December, 7 pm", day: "12", month: "DEC", place: "Rose Garden Hall", contact: "Reply to +92 300 5556677", web: "hinaandomar.example", handle: "@hinaandomar", person: "Hina and Omar", role: "Wedding planners", job: "Event helper", product: "Wedding album", workshop: "Wedding planning day", quote: ["Two hearts,", "one beautiful story."], listTitle: "Programme", list: [["Welcome", "7:00"], ["Nikah", "7:30"], ["Dinner", "8:30"], ["Music", "9:30"]], items: ["Dinner for all guests", "Live music", "Photo corner"], hours: "Please arrive by 7 pm" },
  { id: "fitness", label: "Fitness", icon: "dumbbell", brand: "Peak Fitness Club", head: "SUNRISE TRAINING", word: "TRAIN", tag: "Get stronger in 30 days", offer: "First class free", pct: "30% OFF", event: "Fitness bootcamp", date: "Every Tuesday, 6:30 am", day: "03", month: "JULY", place: "City Park, Gate 2", contact: "+92 345 1231234", web: "peakfitness.example", handle: "@peakfitness", person: "Ayesha Khan", role: "Head coach", job: "Personal trainer", product: "Home workout plan", workshop: "Strength for beginners", quote: ["Small steps every day", "add up to big changes."], listTitle: "Memberships", list: [["Monthly", "6,000"], ["Three months", "16,000"], ["Yearly", "55,000"], ["Day pass", "800"]], items: ["Coaches on every shift", "Women-only hours", "Free fitness check"], hours: "Open 6 am to 11 pm" },
  { id: "tech", label: "Tech", icon: "laptop", brand: "ByteWorks Studio", head: "LAUNCH NIGHT", word: "LAUNCH", tag: "Apps that grow your business", offer: "Free first consultation", pct: "NEW", event: "Launch night", date: "Thursday 10 July, 6 pm", day: "10", month: "JULY", place: "Tech Park, Hall B", contact: "+92 311 9990001", web: "byteworks.example", handle: "@byteworks", person: "Usman Tariq", role: "Product lead", job: "Web developer", product: "ByteWorks Shop App", workshop: "Build your first website", quote: ["Ship small,", "learn fast, keep going."], listTitle: "Plans", list: [["Website", "45,000"], ["Online shop", "90,000"], ["Mobile app", "250,000"], ["Support", "8,000"]], items: ["Fast, modern websites", "Online payments", "Support you can call"], hours: "Mon to Fri, 10 am to 7 pm" },
  { id: "travel", label: "Travel", icon: "plane", brand: "Skyline Tours", head: "SUMMER TRIPS", word: "EXPLORE", tag: "Mountains, lakes and more", offer: "Early bird price", pct: "20% OFF", event: "Travel expo", date: "Saturday 5 July, 11 am", day: "05", month: "JULY", place: "Expo Centre, Hall 3", contact: "+92 322 6667788", web: "skylinetours.example", handle: "@skylinetours", person: "Zara Hussain", role: "Travel planner", job: "Tour guide", product: "Northern lakes tour", workshop: "Travel on a budget", quote: ["Collect moments,", "not things."], listTitle: "Tours", list: [["Lakes, 3 days", "35,000"], ["Valley, 5 days", "55,000"], ["Desert, 2 days", "22,000"], ["City walk", "3,000"]], items: ["Hotels and transport", "Friendly guides", "Small groups"], hours: "Bookings 10 am to 8 pm" },
  { id: "ngo", label: "Charity", icon: "tree", brand: "Green Hands Trust", head: "PLANT A TREE", word: "GIVE", tag: "Join our city clean-up", offer: "Every gift plants a tree", pct: "JOIN US", event: "Charity walk", date: "Sunday 29 June, 8 am", day: "29", month: "JUNE", place: "Lake View Park", contact: "+92 300 3334455", web: "greenhands.example", handle: "@greenhandstrust", person: "Fatima Noor", role: "Volunteer lead", job: "Volunteer coordinator", product: "Tree gift card", workshop: "Volunteering 101", quote: ["Together we can", "grow a greener city."], listTitle: "Ways to help", list: [["Plant a tree", "500"], ["School kit", "1,500"], ["Clean water", "2,500"], ["Monthly gift", "1,000"]], items: ["1,000 trees planted", "Clean-ups every month", "Open to all ages"], hours: "Volunteer desk 9 am to 5 pm" },
  { id: "realestate", label: "Real estate", icon: "house", brand: "Keystone Homes", head: "HOME FOR SALE", word: "HOMES", tag: "3 bedrooms near the park", offer: "Open house this Sunday", pct: "NEW LISTING", event: "Open house", date: "Sunday 15 June, 11 am", day: "15", month: "JUNE", place: "Street 7, Lake City", contact: "+92 300 8889900", web: "keystonehomes.example", handle: "@keystonehomes", person: "Ahmed Saleem", role: "Property adviser", job: "Sales agent", product: "Lake City villas", workshop: "Buying your first home", quote: ["Home is where", "your story begins."], listTitle: "Listings", list: [["2-bed flat", "12 million"], ["3-bed house", "28 million"], ["Shop, 400 sq ft", "9 million"], ["Plot, 10 marla", "15 million"]], items: ["3 bedrooms, 3 baths", "Garden and parking", "Near schools"], hours: "Viewings 10 am to 6 pm" },
  { id: "beauty", label: "Beauty", icon: "flower", brand: "Bloom Beauty Bar", head: "GLOW UP WEEK", word: "GLOW", tag: "Skin, hair and nails", offer: "Free hand massage", pct: "35% OFF", event: "Beauty workshop", date: "Wednesday 18 June, 4 pm", day: "18", month: "JUNE", place: "Mall Road, Shop 12", contact: "+92 301 2345678", web: "bloombeauty.example", handle: "@bloombeautybar", person: "Mariam Shah", role: "Skin specialist", job: "Hair stylist", product: "Glow care kit", workshop: "Everyday skin care", quote: ["Take time for", "the things that make you glow."], listTitle: "Price list", list: [["Facial", "3,500"], ["Haircut", "1,500"], ["Manicure", "1,200"], ["Bridal look", "25,000"]], items: ["Gentle products", "Trained stylists", "Women-only salon"], hours: "Open 11 am to 9 pm" },
  { id: "cafe", label: "Cafe", icon: "cup", brand: "Morning Brew Cafe", head: "MORNING BREW", word: "BREW", tag: "Coffee, tea and fresh bakes", offer: "Buy one latte, get one free", pct: "2 FOR 1", event: "Coffee tasting", date: "Every day before 10 am", day: "08", month: "JULY", place: "12 Park Road", contact: "+92 300 7654321", web: "morningbrew.example", handle: "@morningbrewcafe", person: "Kamran Javed", role: "Head barista", job: "Barista", product: "Cold brew bottles", workshop: "Latte art for beginners", quote: ["But first,", "a good cup of coffee."], listTitle: "Menu", list: [["Masala chai", "250"], ["Latte", "450"], ["Iced coffee", "450"], ["Club sandwich", "750"]], items: ["Fresh beans every week", "Free Wi-Fi", "Cosy seats"], hours: "Open 7 am to 9 pm" },
];

/* ---------- theme pictures (own simple artwork in a 400 × 400 box; a = accent, b = second accent, c = ink) */
const ICONS = {
  book: (a, b, c) => `<path d="M40 110c60-30 110-25 160 5v230c-50-30-100-35-160-5z" fill="${a}"/><path d="M360 110c-60-30-110-25-160 5v230c50-30 100-35 160-5z" fill="${b}"/><path d="M200 115v230" stroke="${c}" stroke-width="8"/><path d="M290 40l60 60-130 130-70 10 10-70z" fill="${c}" opacity=".85"/><path d="M160 240l10-70 50 50z" fill="#ffd29a"/>`,
  bag: (a, b, c) => `<path d="M60 140h280l-24 230H84z" fill="${a}"/><path d="M140 140v-30a60 60 0 0 1 120 0v30" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round"/><circle cx="140" cy="180" r="11" fill="${c}"/><circle cx="260" cy="180" r="11" fill="${c}"/><circle cx="200" cy="275" r="55" fill="${b}"/><path d="M200 225c10-25 35-35 50-30-5 22-25 35-50 30z" fill="${c}" opacity=".7"/>`,
  cross: (a, b, c) => `<path d="M200 350C120 290 50 235 50 160c0-50 40-90 88-90 28 0 50 13 62 35 12-22 34-35 62-35 48 0 88 40 88 90 0 75-70 130-150 190z" fill="${a}"/><path d="M180 130h40v45h45v40h-45v45h-40v-45h-45v-40h45z" fill="#ffffff"/><circle cx="330" cy="330" r="40" fill="${b}"/><path d="M315 330h30M330 315v30" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`,
  plate: (a, b, c) => `<circle cx="200" cy="210" r="150" fill="#ffffff" stroke="${c}" stroke-width="6" opacity=".95"/><circle cx="200" cy="210" r="105" fill="${a}"/><circle cx="170" cy="190" r="30" fill="${b}"/><circle cx="235" cy="235" r="24" fill="#ffd29a"/><path d="M30 80v90M18 80v45a12 12 0 0 0 24 0V80M370 80c-25 20-25 70 0 90v120" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  rings: (a, b, c) => `<circle cx="150" cy="230" r="95" fill="none" stroke="${a}" stroke-width="26"/><circle cx="250" cy="230" r="95" fill="none" stroke="${b}" stroke-width="26"/><path d="M230 120l20-40 20 40-20 20z" fill="${c}" opacity=".8"/><path d="M200 70c-10-20-40-15-40 8 0 20 40 40 40 40s40-20 40-40c0-23-30-28-40-8z" fill="${a}"/>`,
  dumbbell: (a, b, c) => `<rect x="110" y="185" width="180" height="30" rx="12" fill="${c}"/><rect x="60" y="120" width="50" height="160" rx="14" fill="${a}"/><rect x="290" y="120" width="50" height="160" rx="14" fill="${a}"/><rect x="25" y="150" width="35" height="100" rx="12" fill="${b}"/><rect x="340" y="150" width="35" height="100" rx="12" fill="${b}"/>`,
  laptop: (a, b, c) => `<rect x="70" y="80" width="260" height="180" rx="16" fill="${c}"/><rect x="88" y="98" width="224" height="144" rx="8" fill="${a}"/><path d="M40 280h320l-20 40H60z" fill="${b}"/><path d="M160 140l-30 30 30 30M240 140l30 30-30 30M215 130l-30 80" stroke="#ffffff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  plane: (a, b, c) => `<circle cx="200" cy="210" r="150" fill="${b}" opacity=".55"/><path d="M60 230l110-30 70-110c10-15 35-5 30 12l-30 95 100 30c15 5 15 25 0 30l-100 20 20 70-30 10-40-60-110 20c-15 3-20-15-8-25z" fill="${a}"/><circle cx="110" cy="110" r="22" fill="#ffffff" opacity=".8"/><circle cx="300" cy="320" r="16" fill="#ffffff" opacity=".8"/>`,
  tree: (a, b, c) => `<rect x="185" y="230" width="30" height="130" rx="8" fill="${c}"/><circle cx="200" cy="160" r="110" fill="${a}"/><circle cx="130" cy="210" r="60" fill="${a}"/><circle cx="270" cy="210" r="60" fill="${a}"/><path d="M200 175c-10-20-40-15-40 8 0 20 40 40 40 40s40-20 40-40c0-23-30-28-40-8z" fill="${b}"/><path d="M80 360h240" stroke="${c}" stroke-width="10" stroke-linecap="round"/>`,
  house: (a, b, c) => `<path d="M60 200L200 80l140 120" fill="none" stroke="${c}" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/><path d="M95 185h210v175H95z" fill="${a}"/><rect x="175" y="260" width="50" height="100" rx="6" fill="${c}"/><rect x="120" y="215" width="40" height="40" rx="4" fill="#ffffff"/><rect x="240" y="215" width="40" height="40" rx="4" fill="#ffffff"/><rect x="270" y="100" width="28" height="60" fill="${b}"/>`,
  flower: (a, b, c) => `<g fill="${a}"><ellipse cx="200" cy="120" rx="45" ry="75"/><ellipse cx="200" cy="280" rx="45" ry="75"/><ellipse cx="120" cy="200" rx="75" ry="45"/><ellipse cx="280" cy="200" rx="75" ry="45"/></g><circle cx="200" cy="200" r="48" fill="${b}"/><circle cx="200" cy="200" r="20" fill="${c}" opacity=".5"/><path d="M330 300c20 20 20 50 0 70-20-20-20-50 0-70z" fill="${b}"/>`,
  cup: (a, b, c) => `<path d="M80 150h220l-25 200H105z" fill="#ffffff"/><path d="M300 190h28a42 42 0 0 1 0 84h-34" fill="none" stroke="#ffffff" stroke-width="22"/><rect x="88" y="210" width="204" height="55" fill="${b}"/><ellipse cx="190" cy="360" rx="150" ry="16" fill="${c}" opacity=".35"/><g fill="none" stroke="${a}" stroke-width="12" stroke-linecap="round"><path d="M150 120c-20-25 20-40 0-70"/><path d="M195 120c-20-25 20-40 0-70"/><path d="M240 120c-20-25 20-40 0-70"/></g>`,
};

/* ---------- helpers for layouts */
// text: c content, x, y = top of the line box, s size, col colour; o: f family, b bold, i italic, al align, w box width
const tx = (c, x, y, s, col, o = {}) => ({ c, x, y, s, col, f: o.f || "sans", b: !!o.b, i: !!o.i, al: o.al || "left", w: o.w });
/** Rough text width in ems (a little generous, so sized text never runs off the design). */
function ems(c, bold, family) {
  if (family === "mono") return c.length * 0.62;
  let w = 0;
  for (const ch of c) w += ch === " " ? 0.28 : /[MWmw%@]/.test(ch) ? 0.9 : /[A-Z0-9]/.test(ch) ? (bold ? 0.74 : 0.68) : /[iljtfr.,:;'!|·•]/.test(ch) ? 0.32 : /[a-z]/.test(ch) ? (bold ? 0.6 : 0.54) : 0.4;
  return w * (family === "serif" ? 1.14 : 1.06); // fonts differ a little between browsers and systems
}
const textWidth = (t) => t.w || Math.ceil(ems(t.c, t.b, t.f) * t.s) + 8;
/** Text sized down (never up) so its estimated width fits in maxW. */
function fit(c, x, y, s, col, maxW, o = {}) { const t = tx(c, x, y, s, col, o); const e = ems(c, t.b, t.f); if (e * s + 8 > maxW) t.s = Math.max(10, Math.floor((maxW - 8) / e)); return t; }
const centre = (c, W, y, s, col, o = {}, m = 60) => { const t = fit(c, 0, y, s, col, W - m * 2, { ...o, al: "center" }); t.w = W; return t; };
const pic = (n, x, y, w, h, body) => ({ n, x, y, w, h, body });
const iconPic = (n, x, y, size, th, P, cols) => { const [a, b, c] = cols || [P.acc, P.acc2, P.ink]; return pic(n, x, y, size, size, `<svg width="${size}" height="${size}" viewBox="0 0 400 400">${ICONS[th.icon](a, b, c)}</svg>`); };
const grad = (W, H, a, b, dir = "v") => `<defs><linearGradient id="{P}g" x1="0" y1="0" x2="${dir === "h" ? 1 : dir === "d" ? 1 : 0}" y2="${dir === "h" ? 0 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#{P}g)"/>`;
const listLine = (name, price, n = 26) => { const dots = Math.max(3, n - name.length - price.length); return `${name} ${".".repeat(dots)} ${price}`; };

// helpers that need the palette
function luminance(hex) { const s = hex.replace("#", ""); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrastOn(hex) { return luminance(hex) > 0.55 ? "#1f2937" : "#ffffff"; }
function darkish(P) { for (const c of [P.acc, P.acc2, P.band, P.ink]) if (luminance(c) < 0.45) return c; return "#1f2937"; }
function centreIn(c, x, y, w, s, col, o = {}) { const t = fit(c, x, y, s, col, w - 16, { ...o, al: "center" }); t.x = x; t.w = w; return t; }

const star5 = (cx, cy, r, fillc) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`); } return `<path d="M${p.join("L")}z" fill="${fillc}"/>`; };
const person = (w, h, skin, shirt, hair) => `<circle cx="${w / 2}" cy="${h * 0.38}" r="${w * 0.2}" fill="${skin}"/><path d="M${w * 0.3} ${h * 0.3}c0-${h * 0.16} ${w * 0.4}-${h * 0.16} ${w * 0.4} 0c-${w * 0.08}-${h * 0.07}-${w * 0.32}-${h * 0.07}-${w * 0.4} 0z" fill="${hair}"/><path d="M${w * 0.12} ${h}c0-${h * 0.3} ${w * 0.18}-${h * 0.42} ${w * 0.38}-${h * 0.42}s${w * 0.38} ${h * 0.12} ${w * 0.38} ${h * 0.42}z" fill="${shirt}"/>`;
const burst = (cx, cy, r, n, fillc) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n, rr = i % 2 ? r * 0.86 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`); } return `<path d="M${p.join("L")}z" fill="${fillc}"/>`; };
const bars = (w, h, col) => { let x = 0, s = ""; const ws = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3]; for (let i = 0; x < w - 4; i++) { const bw = ws[i % ws.length] * 3; if (i % 2 === 0) s += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="${col}"/>`; x += bw; } return s; };

/* ---------- real photos (shared library, CC0 / public domain): a few per design, same id -> same photos ---------- */
const PHOTO_WORDS = {
  school: "education classroom school lecture library",
  shop: "food fruit blueberries fresh healthy",
  clinic: "medical clinic doctor hospital health",
  restaurant: "restaurant food dining dinner kitchen",
  wedding: "wedding rings flowers celebration lily",
  fitness: "fitness gym yoga sport",
  tech: "tech laptop smartphone server workspace",
  travel: "travel holiday beach mountains valley",
  ngo: "nature forest valley trees green",
  realestate: "interior architecture apartments property house",
  beauty: "beauty makeup salon cosmetics lipstick",
  cafe: "coffee cafe latte espresso",
};
function choose(words, seed, exclude = []) {
  const ws = String(words).split(/\s+/).filter(Boolean);
  let best = 0; const scored = [];
  for (const p of PHOTOS) {
    if (exclude.includes(p.id)) continue;
    let s = 0;
    ws.forEach((w, i) => { const k = 1 - i * 0.06; if (p.theme === w) s += 3 * k; if (p.tags?.includes(w)) s += 2 * k; });
    if (s > 0) { scored.push([s, p]); if (s > best) best = s; }
  }
  scored.sort((a, b) => b[0] - a[0] || (a[1].id < b[1].id ? -1 : 1));
  const good = scored.filter(([s]) => s >= best * 0.6).map(([, p]) => p);
  // more photos of one design: the next best matches before anything off-topic
  const list = good.length ? good : scored.length ? scored.map(([, p]) => p) : PHOTOS.filter((p) => !exclude.includes(p.id));
  return list.length ? list[hashStr(String(seed)) % list.length] : null;
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function photosOf(id, theme, n = 4) { const out = []; for (let i = 0; i < n; i++) out.push(choose(PHOTO_WORDS[theme] || "city", `${id}:${i}`, out.map((p) => p?.id))); return out; }
// the photo in a picture: a token the thumbnail ("thumb" file) and the opened design ("full" file) fill in
const IMG = (slot, x, y, w, h, ex = "") => `<image href="{IMG${slot}}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${ex}/>`;
/** Gradient wash over a photo (stops: [[offset, colour, opacity], …]), vertical or horizontal. */
const wash = (W, H, stops, id = "w", dir = "v", x = 0, y = 0) => `<defs><linearGradient id="{P}${id}" x1="0" y1="0" x2="${dir === "h" ? 1 : 0}" y2="${dir === "h" ? 0 : 1}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient></defs><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#{P}${id})"/>`;
const clipShape = (shape, w, h, r = 28) => shape === "circle" ? `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}"/>` : shape === "arch" ? `<path d="M0 ${h}V${w / 2}A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2}V${h}Z"/>`
  : shape === "blob" ? `<path d="M${w * 0.5} 0C${w * 0.86} 0 ${w} ${h * 0.2} ${w} ${h * 0.48}S${w * 0.82} ${h} ${w * 0.48} ${h}S0 ${h * 0.84} 0 ${h * 0.52}S${w * 0.16} 0 ${w * 0.5} 0Z"/>` : `<rect width="${w}" height="${h}" rx="${shape === "round" ? r : 0}"/>`;
/** A picture layer holding a real photo clipped to a shape (rect / round / circle / arch / blob), with an optional ring. */
function photoPic(n, slot, x, y, w, h, shape = "round", { ring = "", rw = 12, r = 28 } = {}) {
  const inset = ring ? rw : 0, iw = w - inset * 2, ih = h - inset * 2;
  const ringEl = ring ? (shape === "circle" ? `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}" fill="${ring}"/>` : `<g transform="translate(0 0)"><rect width="${w}" height="${h}" rx="${shape === "round" ? r + inset : 0}" fill="${ring}"/></g>`) : "";
  return pic(n, x, y, w, h, `<defs><clipPath id="{P}k">${clipShape(shape, iw, ih, r)}</clipPath></defs>${ringEl}<g transform="translate(${inset} ${inset})"><g clip-path="url(#{P}k)">${IMG(slot, 0, 0, iw, ih)}</g></g>`);
}
const W_ = "#ffffff";
/** The first accent colour that reads well on a background (else the ink). */
const accentOn = (P, bg = P.bg) => [P.acc, P.acc2, P.ink].find((c) => Math.abs(luminance(c) - luminance(bg)) > 0.38) || P.ink;

/* ---------- base layouts (W × H, background, pictures, text); photo-led, like the poster and post templates people use ---------- */
const LAYOUT_DEFS = [
  { id: "poster", label: "poster", section: "Posters and flyers", tags: ["poster", "print", "A4"], build: (P, T) => ({ w: 900, h: 1200,
    bg: IMG(0, 0, 0, 900, 1200) + wash(900, 1200, [[0, "#000000", 0.35], [0.35, "#000000", 0.05], [0.62, P.band, 0.6], [1, P.band, 0.98]]) + `<rect x="60" y="930" width="140" height="10" fill="${P.acc}"/>`,
    pics: [pic("Badge", 650, 60, 200, 200, `<circle cx="100" cy="100" r="98" fill="${P.acc}"/><circle cx="100" cy="100" r="82" fill="none" stroke="${contrastOn(P.acc)}" stroke-width="3" stroke-dasharray="6 8" opacity=".7"/>`)],
    texts: [centreIn(T.pct, 650, 132, 200, 40, contrastOn(P.acc), { b: true }), fit(T.head, 60, 600, 62, W_, 780, { b: true }), fit(T.word, 60, 680, 190, W_, 780, { b: true }), fit(T.tag, 60, 965, 44, W_, 780), fit(`${T.place}  ·  ${T.date}`, 60, 1060, 34, W_, 780, { b: true })] }) },
  { id: "flyer", label: "flyer", section: "Posters and flyers", tags: ["flyer", "offer", "print"], build: (P, T) => ({ w: 900, h: 1200,
    bg: `<rect width="900" height="1200" fill="${P.bg}"/><circle cx="450" cy="560" r="330" fill="${P.bg2}"/><path d="M0 1090h900v110H0z" fill="${P.band}"/><g fill="${P.acc2}" opacity=".5"><circle cx="90" cy="160" r="14"/><circle cx="820" cy="300" r="10"/><circle cx="130" cy="900" r="12"/><circle cx="770" cy="980" r="16"/></g>`,
    pics: [photoPic("Photo", 0, 190, 280, 520, 520, "circle", { ring: P.acc, rw: 14 }), pic("Price", 600, 640, 210, 210, `<circle cx="105" cy="105" r="100" fill="${P.acc2}"/>`)],
    texts: [centre(T.brand, 900, 70, 92, P.ink, { f: "serif", b: true }), centreIn(T.pct, 600, 722, 210, 34, contrastOn(P.acc2), { b: true }), centre(T.offer, 900, 870, 52, P.ink, { b: true }), centre(T.date, 900, 950, 36, P.ink), centre(`${T.place}  ·  ${T.hours}`, 900, 1122, 30, P.onBand, { b: true })] }) },
  { id: "quote", label: "quote post", section: "Social media", tags: ["quote", "instagram", "post", "square"], build: (P, T) => ({ w: 1080, h: 1080,
    bg: IMG(0, 0, 0, 1080, 1080) + wash(1080, 1080, [[0, "#000000", 0.25], [1, "#000000", 0.7]]) + `<rect x="80" y="80" width="920" height="920" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/>`,
    pics: [pic("Quote marks", 130, 170, 220, 170, `<path d="M10 160V90C10 40 40 10 90 0v40c-25 8-35 25-35 50h35v70zM130 160V90c0-50 30-80 80-90v40c-25 8-35 25-35 50h35v70z" fill="${P.acc}"/>`)],
    texts: [fit(T.quote[0], 130, 390, 74, W_, 820, { f: "serif", b: true }), fit(T.quote[1], 130, 490, 74, W_, 820, { f: "serif", i: true }), fit(T.brand, 130, 680, 46, W_, 820, { b: true }), fit(T.handle, 130, 900, 34, W_, 820)] }) },
  { id: "social", label: "social post", section: "Social media", tags: ["instagram", "post", "square", "class"], build: (P, T) => ({ w: 1080, h: 1080,
    bg: `<rect width="1080" height="1080" fill="${P.bg}"/><circle cx="880" cy="200" r="230" fill="${P.acc2}" opacity=".35"/><rect y="900" width="1080" height="180" fill="${P.band}"/>`,
    pics: [photoPic("Photo", 0, 560, 210, 440, 640, "arch"), pic("Sun", 860, 110, 160, 160, `<circle cx="80" cy="80" r="56" fill="${P.acc}"/><g stroke="${P.acc}" stroke-width="9" stroke-linecap="round"><path d="M80 4v14M80 142v14M4 80h14M142 80h14M26 26l10 10M124 124l10 10M26 134l10-10M124 36l10-10"/></g>`)],
    texts: [fit(T.head, 80, 230, 66, P.ink, 440, { b: true }), fit(T.tag, 80, 330, 34, P.ink, 440), fit(T.offer, 80, 520, 40, accentOn(P), 440, { b: true }), centre(T.date, 1080, 925, 50, P.onBand, { b: true }), centre(T.place, 1080, 995, 36, P.onBand)] }) },
  { id: "cover", label: "cover", section: "Social media", tags: ["podcast", "cover", "square", "channel"], build: (P, T) => ({ w: 1000, h: 1000,
    bg: IMG(0, 0, 0, 1000, 1000) + wash(1000, 1000, [[0, P.band, 0.95], [0.6, P.band, 0.55], [1, P.band, 0.1]], "w", "h"),
    pics: [pic("Play button", 70, 640, 190, 190, `<circle cx="95" cy="95" r="92" fill="${P.acc}"/><path d="M75 55v80l65-40z" fill="${contrastOn(P.acc)}"/>`)],
    texts: [fit(T.brand.toUpperCase(), 70, 90, 46, P.onBand, 700, { b: true }), fit(T.word, 70, 170, 150, P.onBand, 620, { b: true }), fit(T.tag, 70, 370, 40, P.onBand, 620), fit("NEW EPISODE EVERY FRIDAY", 290, 705, 30, P.onBand, 600, { b: true }), fit(T.handle, 290, 760, 30, P.onBand, 600)] }) },
  { id: "card", label: "business card", section: "Cards and invitations", tags: ["business card", "contact", "card"], build: (P, T) => ({ w: 1050, h: 600,
    bg: `<rect width="1050" height="600" fill="#ffffff"/>` + IMG(0, 0, 0, 380, 600) + wash(380, 600, [[0, P.band === "#ffffff" ? P.acc : P.band, 0.2], [1, P.band === "#ffffff" ? P.acc : P.band, 0.75]]) + `<path d="M380 0h60L380 600z" fill="${P.acc}"/><rect x="480" y="300" width="80" height="6" fill="${P.acc}"/>`,
    pics: [pic("Logo", 105, 215, 170, 170, `<rect x="10" y="10" width="150" height="150" rx="34" fill="#ffffff"/><svg x="25" y="25" width="120" height="120" viewBox="0 0 400 400">${ICONS[T.icon](P.acc, P.acc2, "#1f2937")}</svg>`)],
    texts: [fit(T.person, 480, 150, 62, "#1f2937", 520, { b: true }), fit(T.role, 480, 230, 34, P.acc === "#ffffff" ? "#1f2937" : darkish(P), 520), fit(T.contact, 480, 340, 30, "#1f2937", 520), fit(`hello@${T.web}`, 480, 390, 30, "#1f2937", 520), fit(T.web, 480, 440, 30, "#1f2937", 520)] }) },
  { id: "invite", label: "invitation", section: "Cards and invitations", tags: ["invitation", "event", "party"], build: (P, T) => ({ w: 900, h: 1260,
    bg: `<rect width="900" height="1260" fill="${P.bg}"/><g opacity=".9"><rect x="80" y="120" width="18" height="40" rx="4" fill="${P.acc}" transform="rotate(25 89 140)"/><rect x="760" y="210" width="18" height="40" rx="4" fill="${P.acc2}" transform="rotate(-30 769 230)"/><rect x="120" y="1000" width="18" height="40" rx="4" fill="${P.acc2}" transform="rotate(40 129 1020)"/><rect x="720" y="1080" width="18" height="40" rx="4" fill="${P.acc}" transform="rotate(-15 729 1100)"/><circle cx="200" cy="300" r="10" fill="${P.acc}"/><circle cx="690" cy="900" r="12" fill="${P.acc2}"/><circle cx="820" cy="560" r="9" fill="${P.acc}"/></g><rect x="40" y="40" width="820" height="1180" rx="40" fill="none" stroke="${P.acc}" stroke-width="6" stroke-dasharray="18 14" opacity=".6"/>`,
    pics: [photoPic("Photo", 0, 250, 110, 400, 470, "arch", { ring: P.acc2, rw: 10 })],
    texts: [centre("You're invited!", 900, 630, 88, accentOn(P), { b: true }), centre(T.event, 900, 760, 64, P.ink, { f: "serif", i: true }), centre(T.date, 900, 890, 44, P.ink, { b: true }), centre(T.place, 900, 955, 40, P.ink), centre(T.contact, 900, 1080, 34, P.ink)] }) },
  { id: "savedate", label: "save the date card", section: "Cards and invitations", tags: ["save the date", "elegant", "invitation"], build: (P, T) => ({ w: 900, h: 1260,
    bg: `<rect width="900" height="1260" fill="${P.bg}"/><rect x="50" y="50" width="800" height="1160" fill="none" stroke="${P.acc}" stroke-width="4"/><rect x="66" y="66" width="768" height="1128" fill="none" stroke="${P.acc}" stroke-width="1.5"/>`,
    pics: [photoPic("Photo", 0, 290, 110, 320, 420, "arch")],
    texts: [centre("Save the date", 900, 570, 92, accentOn(P), { f: "serif", i: true }), centre(T.brand, 900, 710, 70, P.ink, { f: "serif", b: true }), centre(T.date, 900, 840, 44, P.ink), centre(T.place, 900, 920, 42, P.ink, { f: "serif" }), centre("More details to follow", 900, 1080, 32, P.ink)] }) },
  { id: "banner", label: "web banner", section: "Banners, menus and slides", tags: ["banner", "web", "header", "wide"], build: (P, T) => ({ w: 1500, h: 500,
    bg: `<rect width="1500" height="500" fill="${P.bg}"/>` + IMG(0, 650, 0, 850, 500) + wash(850, 500, [[0, P.bg, 1], [0.45, P.bg, 0.4], [1, P.bg, 0]], "w", "h", 650, 0) + `<path d="M0 450c300-50 500 30 760 0v50H0z" fill="${P.acc}" opacity=".3"/>`,
    pics: [pic("Badge", 1260, 40, 200, 200, `<circle cx="100" cy="100" r="96" fill="${P.acc}"/>`)],
    texts: [centreIn(T.pct, 1260, 115, 200, 34, contrastOn(P.acc), { b: true }), fit(T.head, 80, 80, 104, P.ink, 760, { b: true }), fit(T.offer, 80, 225, 48, accentOn(P), 760, { b: true }), fit(`${T.tag}  ·  ${T.web}`, 80, 325, 34, P.ink, 760)] }) },
  { id: "menu", label: "menu", section: "Banners, menus and slides", tags: ["menu", "price list", "print"], build: (P, T) => ({ w: 900, h: 1270,
    bg: `<rect width="900" height="1270" fill="${P.bg}"/><rect x="40" y="40" width="820" height="1190" rx="24" fill="#ffffff" opacity=".95" stroke="${P.acc}" stroke-width="4"/><path d="M120 560h660M120 1060h660" stroke="${P.acc}" stroke-width="3" stroke-dasharray="8 10"/>`,
    pics: [photoPic("Photo", 0, 60, 60, 780, 300, "round", { r: 18 })],
    texts: [fit(T.brand, 120, 390, 64, "#1f2937", 660, { f: "serif", b: true }), fit(T.listTitle, 120, 480, 46, P.acc === "#ffffff" ? "#1f2937" : darkish(P), 660, { f: "serif", i: true }),
      ...T.list.map(([nm, pr], i) => fit(listLine(nm, pr), 120, 610 + i * 105, 38, "#1f2937", 660, { f: "mono" })), fit(T.hours, 120, 1110, 34, "#1f2937", 660)] }) },
  { id: "event", label: "event poster", section: "Posters and flyers", tags: ["event", "poster", "date"], build: (P, T) => ({ w: 900, h: 1200,
    bg: `<rect width="900" height="1200" fill="${P.bg}"/><rect width="900" height="300" fill="${P.band}"/><rect x="60" y="210" width="230" height="250" rx="22" fill="${P.acc}"/><circle cx="780" cy="1100" r="200" fill="${P.acc2}" opacity=".3"/>`,
    pics: [photoPic("Photo", 0, 470, 720, 380, 420, "round", { r: 30 })],
    texts: [fit(T.brand.toUpperCase(), 60, 70, 46, P.onBand, 780, { b: true }), centreIn(T.day, 60, 230, 230, 120, contrastOn(P.acc), { b: true }), centreIn(T.month, 60, 370, 230, 50, contrastOn(P.acc), { b: true }),
      fit(T.event, 330, 330, 72, P.ink, 520, { b: true }), fit(T.tag, 60, 520, 44, P.ink, 780), fit(T.date, 60, 620, 40, P.ink, 780, { b: true }), fit(T.place, 60, 690, 40, P.ink, 380), fit(T.web, 60, 900, 34, P.ink, 380)] }) },
  { id: "listing", label: "feature flyer", section: "Posters and flyers", tags: ["flyer", "listing", "features", "real estate"], build: (P, T) => ({ w: 900, h: 1200,
    bg: `<rect width="900" height="1200" fill="#ffffff"/><rect y="1060" width="900" height="140" fill="${P.band === "#ffffff" ? P.acc : P.band}"/>`,
    pics: [photoPic("Photo", 0, 40, 40, 820, 560, "round", { r: 26 }), pic("Ribbon", 40, 560, 420, 100, `<path d="M0 0h400l-30 50 30 50H0z" fill="${P.acc}"/>`), pic("Ticks", 70, 760, 60, 260, `<g fill="none" stroke="${P.acc2}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M10 30l15 15 30-30"/><path d="M10 120l15 15 30-30"/><path d="M10 210l15 15 30-30"/></g>`)],
    texts: [fit(T.word, 70, 580, 56, contrastOn(P.acc), 330, { b: true }), fit(T.head, 60, 680, 54, "#1f2937", 780, { b: true }), ...T.items.map((s, i) => fit(s, 150, 765 + i * 90, 40, "#1f2937", 690)),
      centre(`${T.contact}  ·  ${T.web}`, 900, 1110, 34, P.band === "#ffffff" ? contrastOn(P.acc) : P.onBand, { b: true })] }) },
  { id: "hiring", label: "job ad", section: "Posters and flyers", tags: ["hiring", "job", "careers", "post"], build: (P, T) => ({ w: 1080, h: 1350,
    bg: `<rect width="1080" height="1350" fill="${P.bg}"/><rect x="0" y="0" width="1080" height="560" fill="${P.bg2}"/><circle cx="880" cy="420" r="210" fill="${P.acc}"/><rect x="80" y="1180" width="920" height="100" rx="50" fill="${P.band}"/>`,
    pics: [photoPic("Photo", 0, 690, 250, 370, 370, "circle", { ring: "#ffffff", rw: 12 })],
    texts: [fit("WE'RE HIRING", 80, 90, 104, P.ink, 580, { b: true }), fit(T.job, 80, 240, 60, accentOn(P, P.bg2), 580, { b: true }), fit(T.brand, 80, 340, 42, P.ink, 580), fit("What you get", 80, 650, 48, P.ink, 900, { b: true }),
      ...T.items.map((s, i) => fit("•  " + s, 80, 740 + i * 80, 42, P.ink, 900)), fit(T.place, 80, 1010, 40, P.ink, 900), centre(`Apply: ${T.contact}`, 1080, 1206, 40, P.onBand, { b: true }, 100)] }) },
  { id: "board", label: "menu board", section: "Banners, menus and slides", tags: ["menu board", "screen", "landscape", "price list"], build: (P, T) => ({ w: 1600, h: 900,
    bg: `<rect width="1600" height="900" fill="${P.bg}"/>` + IMG(0, 0, 0, 600, 900) + wash(600, 900, [[0, "#000000", 0.55], [0.5, "#000000", 0.1], [1, "#000000", 0.65]]) + `<path d="M680 230h840" stroke="${P.acc}" stroke-width="4"/>`,
    pics: [pic("Badge", 1340, 650, 220, 220, `<circle cx="110" cy="110" r="106" fill="${P.acc}"/>`)],
    texts: [fit(T.brand, 60, 80, 56, W_, 500, { f: "serif", b: true }), fit(T.hours, 60, 790, 30, W_, 500), fit(T.listTitle.toUpperCase(), 680, 120, 72, P.ink, 840, { b: true }),
      ...T.list.map(([nm, pr], i) => fit(listLine(nm, pr, 30), 680, 290 + i * 100, 46, P.ink, 640, { f: "mono" })), centreIn(T.pct, 1340, 740, 220, 34, contrastOn(P.acc), { b: true })] }) },
  { id: "launch", label: "product launch", section: "Social media", tags: ["launch", "product", "new", "post"], build: (P, T) => ({ w: 1080, h: 1080,
    bg: `<defs><radialGradient id="{P}r" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="${P.bg2}"/><stop offset="1" stop-color="${P.bg}"/></radialGradient></defs><rect width="1080" height="1080" fill="url(#{P}r)"/><ellipse cx="540" cy="760" rx="300" ry="50" fill="${P.ink}" opacity=".15"/><rect x="80" y="80" width="170" height="70" rx="35" fill="${P.acc}"/>`,
    pics: [photoPic("Product photo", 0, 320, 250, 440, 440, "circle", { ring: "#ffffff", rw: 14 }), pic("Sparkles", 760, 220, 200, 200, `<g fill="${P.acc}"><path d="M60 0l12 48 48 12-48 12-12 48-12-48L0 60l48-12z"/><path d="M160 110l7 26 26 7-26 7-7 26-7-26-26-7 26-7z"/></g>`)],
    texts: [centreIn("NEW", 80, 92, 170, 40, contrastOn(P.acc), { b: true }), centre(T.product, 1080, 820, 76, P.ink, { b: true }), centre(T.tag, 1080, 925, 40, P.ink), fit(T.brand, 290, 95, 40, P.ink, 700, { b: true })] }) },
  { id: "workshop", label: "workshop slide", section: "Banners, menus and slides", tags: ["workshop", "event", "slide", "16:9"], build: (P, T) => ({ w: 1200, h: 675,
    bg: `<rect width="1200" height="675" fill="#ffffff"/><rect width="460" height="675" fill="${P.bg}"/><rect x="500" y="90" width="230" height="56" rx="28" fill="${P.acc}"/>`,
    pics: [photoPic("Photo", 0, 40, 60, 380, 555, "round", { r: 24 })],
    texts: [centreIn("FREE WORKSHOP", 500, 101, 230, 26, contrastOn(P.acc), { b: true }), fit(T.workshop, 500, 180, 60, "#1f2937", 650, { b: true }), fit(T.date, 500, 330, 36, "#1f2937", 650), fit(T.place, 500, 390, 36, "#1f2937", 650),
      fit(`Register: ${T.web}`, 500, 520, 32, darkish(P), 650, { b: true }), fit(T.brand, 500, 590, 28, "#4b5563", 650)] }) },
  { id: "tag", label: "sale tag", section: "Posters and flyers", tags: ["tag", "sale", "price", "label"], build: (P, T) => ({ w: 800, h: 1000,
    bg: IMG(0, 0, 0, 800, 1000) + wash(800, 1000, [[0, "#000000", 0.2], [1, "#000000", 0.55]]),
    pics: [pic("Tag", 130, 130, 540, 760, `<path d="M190 0h160l130 130v590a40 40 0 0 1-40 40H100a40 40 0 0 1-40-40V130z" fill="${P.acc}"/><circle cx="270" cy="110" r="28" fill="#ffffff"/><rect x="100" y="560" width="340" height="6" fill="${contrastOn(P.acc)}" opacity=".5"/>`)],
    texts: [centreIn(T.word, 190, 310, 420, 54, contrastOn(P.acc), { b: true }), centreIn(T.pct, 190, 410, 420, 96, contrastOn(P.acc), { b: true }), centreIn(T.offer, 190, 580, 420, 34, contrastOn(P.acc)), centreIn(T.brand, 190, 740, 420, 30, contrastOn(P.acc), { b: true }), centre(T.date, 800, 930, 30, W_, { b: true })] }) },
  ...MORE_LAYOUTS(),
];
function MORE_LAYOUTS() {
  return [
    { id: "certificate", label: "certificate", section: "Cards and invitations", tags: ["certificate", "award", "appreciation", "landscape"], build: (P, T) => ({ w: 1400, h: 1000,
      bg: `<rect width="1400" height="1000" fill="#fffdf7"/>` + IMG(0, 0, 0, 1400, 140, ` opacity=".9"`) + wash(1400, 140, [[0, P.acc === "#ffffff" ? P.ink : P.acc, 0.55], [1, P.acc === "#ffffff" ? P.ink : P.acc, 0.85]], "w", "h") + `<rect x="34" y="34" width="1332" height="932" fill="none" stroke="${P.acc}" stroke-width="14"/><rect x="62" y="62" width="1276" height="876" fill="none" stroke="${P.acc}" stroke-width="2"/><path d="M200 790h360M840 790h360" stroke="#1f2937" stroke-width="2"/>`,
      pics: [pic("Seal", 610, 640, 180, 260, `<path d="M55 150l-25 105 60-30 60 30-25-105z" fill="${P.acc2}"/>${burst(90, 90, 88, 18, P.acc)}<circle cx="90" cy="90" r="58" fill="none" stroke="#ffffff" stroke-width="5"/>${star5(90, 90, 30, "#ffffff")}`)],
      texts: [centre("CERTIFICATE", 1400, 170, 96, "#1f2937", { f: "serif", b: true }, 160), centre("OF APPRECIATION", 1400, 290, 38, P.acc === "#ffffff" ? "#1f2937" : darkish(P), { b: true }, 160), centre("This certificate is proudly presented to", 1400, 370, 32, "#4b5563", {}, 160),
        centre(T.person, 1400, 430, 88, darkish(P), { f: "serif", i: true, b: true }, 200), centre(`For outstanding work with ${T.brand}`, 1400, 570, 32, "#1f2937", {}, 160),
        centreIn(T.date, 200, 740, 360, 28, "#1f2937"), centreIn("Date", 200, 805, 360, 26, "#6b7280"), centreIn(T.role, 840, 740, 360, 28, "#1f2937"), centreIn("Signature", 840, 805, 360, 26, "#6b7280")] }) },
    { id: "ticket", label: "event ticket", section: "Tickets, signs and covers", tags: ["ticket", "event", "admit one", "pass"], build: (P, T) => ({ w: 1400, h: 560,
      bg: IMG(0, 0, 0, 1040, 560) + wash(1040, 560, [[0, "#000000", 0.75], [0.7, "#000000", 0.35], [1, "#000000", 0.15]], "w", "h") + `<rect x="1040" width="360" height="560" fill="${P.acc}"/><path d="M1040 30V530" stroke="${contrastOn(P.acc)}" stroke-width="4" stroke-dasharray="14 12" opacity=".7"/><circle cx="1040" cy="0" r="34" fill="#ffffff"/><circle cx="1040" cy="560" r="34" fill="#ffffff"/>`,
      pics: [pic("Barcode", 1100, 400, 240, 100, bars(240, 100, contrastOn(P.acc)))],
      texts: [fit(T.brand.toUpperCase(), 60, 60, 34, W_, 600, { b: true }), fit(T.event, 60, 120, 84, W_, 620, { b: true }), fit(T.tag, 60, 230, 34, W_, 620), fit(T.date, 60, 340, 40, W_, 620, { b: true }), fit(T.place, 60, 410, 36, W_, 620),
        centreIn("ADMIT ONE", 1040, 70, 360, 44, contrastOn(P.acc), { b: true }), centreIn(`${T.day} ${T.month}`, 1040, 170, 360, 78, contrastOn(P.acc), { b: true }), centreIn("Ticket no. 0042", 1040, 300, 360, 30, contrastOn(P.acc))] }) },
    { id: "coupon", label: "coupon", section: "Tickets, signs and covers", tags: ["coupon", "voucher", "discount", "code"], build: (P, T) => ({ w: 1200, h: 600,
      bg: `<rect width="1200" height="600" fill="${P.bg}"/><rect x="20" y="20" width="1160" height="560" rx="26" fill="none" stroke="${P.acc}" stroke-width="6" stroke-dasharray="20 14"/><rect x="40" y="40" width="380" height="520" rx="18" fill="${P.acc}"/><rect x="470" y="355" width="380" height="70" rx="12" fill="#ffffff" stroke="${P.ink}" stroke-width="2"/>`,
      pics: [photoPic("Photo", 0, 890, 60, 270, 480, "round", { r: 18 })],
      texts: [centreIn("COUPON", 40, 110, 380, 40, contrastOn(P.acc), { b: true }), centreIn(T.pct, 40, 210, 380, 92, contrastOn(P.acc), { b: true }), centreIn(T.brand, 40, 440, 380, 30, contrastOn(P.acc), { b: true }),
        fit(T.offer, 470, 100, 54, P.ink, 400, { b: true }), fit(T.tag, 470, 200, 32, P.ink, 400), fit("Use code", 470, 300, 28, P.ink, 380), centreIn(`${T.word}10`, 470, 365, 380, 44, "#1f2937", { f: "mono", b: true }), fit(`Valid until ${T.date}`, 470, 470, 26, P.ink, 400)] }) },
    { id: "gifttag", label: "gift tag", section: "Cards and invitations", tags: ["gift tag", "gift", "present", "label"], build: (P, T) => ({ w: 700, h: 1000,
      bg: IMG(0, 0, 0, 700, 1000) + wash(700, 1000, [[0, P.ink, 0.25], [1, P.ink, 0.6]]),
      pics: [pic("Tag", 90, 160, 520, 780, `<path d="M90 0h340l90 90v650a40 40 0 0 1-40 40H40a40 40 0 0 1-40-40V90z" fill="#ffffff" stroke="${P.acc}" stroke-width="8"/><circle cx="260" cy="70" r="22" fill="none" stroke="${P.acc}" stroke-width="8"/>`),
        pic("Bow", 200, 20, 300, 230, `<path d="M150 150C80 40 10 60 30 120s90 40 120 30zM150 150C220 40 290 60 270 120s-90 40-120 30z" fill="${P.acc}"/><path d="M150 150l-60 80M150 150l60 80" stroke="${P.acc}" stroke-width="16" stroke-linecap="round"/><circle cx="150" cy="150" r="22" fill="${P.acc2}"/>`)],
      texts: [centreIn("For you", 90, 420, 520, 96, P.acc === "#ffffff" ? "#1f2937" : darkish(P), { f: "serif", i: true, b: true }), centreIn(T.quote[0], 90, 570, 520, 34, "#1f2937", { f: "serif" }), centreIn(T.quote[1], 90, 620, 520, 34, "#1f2937", { f: "serif" }), centreIn(`With love, ${T.brand}`, 90, 760, 520, 30, "#1f2937", { b: true })] }) },
    { id: "ytthumb", label: "video thumbnail", section: "Social media", tags: ["youtube", "thumbnail", "video", "16:9"], build: (P, T) => ({ w: 1280, h: 720,
      bg: IMG(0, 0, 0, 1280, 720) + wash(1280, 720, [[0, P.band, 0.98], [0.55, P.band, 0.75], [1, P.band, 0.05]], "w", "h") + `<rect x="60" y="500" width="600" height="84" rx="16" fill="${P.acc}"/>`,
      pics: [photoPic("Photo", 1, 790, 120, 420, 420, "circle", { ring: "#ffffff", rw: 14 }), pic("Arrow", 600, 330, 180, 140, `<path d="M10 70h110V20l55 50-55 50V100H10z" fill="${P.acc2}" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/>`)],
      texts: [fit(T.head, 60, 90, 100, P.onBand, 560, { b: true }), fit(`${T.word}!`, 60, 220, 160, P.onBand, 560, { b: true }), fit(T.tag, 84, 518, 40, contrastOn(P.acc), 560, { b: true })] }) },
    { id: "linkedin", label: "profile banner", section: "Banners, menus and slides", tags: ["linkedin", "profile", "banner", "header"], build: (P, T) => ({ w: 1584, h: 396,
      bg: IMG(0, 0, 0, 1584, 396) + wash(1584, 396, [[0, P.bg, 1], [0.55, P.bg, 0.92], [1, P.bg, 0.15]], "w", "h"),
      pics: [photoPic("Photo", 1, 1270, 48, 300, 300, "circle", { ring: P.acc, rw: 10 })],
      texts: [fit(T.brand, 120, 80, 64, P.ink, 900, { b: true }), fit(T.tag, 120, 170, 34, P.ink, 900), fit(`${T.web}  ·  ${T.handle}`, 120, 280, 28, P.ink, 900)] }) },
    { id: "steps", label: "how-to steps post", section: "Social media", tags: ["how to", "steps", "tips", "infographic"], build: (P, T) => ({ w: 1080, h: 1350,
      bg: `<rect width="1080" height="1350" fill="${P.bg}"/>` + IMG(0, 0, 0, 1080, 290) + wash(1080, 290, [[0, "#000000", 0.35], [1, "#000000", 0.7]]) + `<path d="M160 400V980" stroke="${P.acc}" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round"/><rect x="0" y="1230" width="1080" height="120" fill="${P.band}"/>`,
      pics: [0, 1, 2].map((i) => pic(`Step ${i + 1}`, 80, 330 + i * 290, 160, 160, `<circle cx="80" cy="80" r="76" fill="${i === 1 ? P.acc2 : P.acc}"/><circle cx="80" cy="80" r="60" fill="none" stroke="#ffffff" stroke-width="4" opacity=".7"/>`)),
      texts: [fit(T.workshop, 80, 70, 64, W_, 920, { b: true }), fit(`3 easy steps from ${T.brand}`, 80, 170, 34, W_, 920),
        ...[0, 1, 2].map((i) => centreIn(String(i + 1), 80, 362 + i * 290, 160, 80, contrastOn(i === 1 ? P.acc2 : P.acc), { b: true })),
        ...T.items.map((s, i) => fit(s, 290, 370 + i * 290, 50, P.ink, 740, { b: true })), ...[T.tag, T.hours, T.place].map((s, i) => fit(s, 290, 440 + i * 290, 32, P.ink, 740)),
        centre(T.handle, 1080, 1262, 40, P.onBand, { b: true })] }) },
    { id: "pricetag", label: "price card", section: "Tickets, signs and covers", tags: ["price", "offer", "product", "shop sign"], build: (P, T) => ({ w: 900, h: 900,
      bg: `<rect width="900" height="900" fill="${P.bg2}"/><rect x="40" y="40" width="820" height="820" rx="40" fill="${P.bg}"/>`,
      pics: [photoPic("Product photo", 0, 70, 180, 470, 470, "circle"), pic("Price burst", 470, 330, 360, 360, burst(180, 180, 178, 22, P.acc) + `<circle cx="180" cy="180" r="134" fill="none" stroke="${contrastOn(P.acc)}" stroke-width="4" stroke-dasharray="6 10" opacity=".7"/>`)],
      texts: [centre(T.product, 900, 80, 60, P.ink, { b: true }, 80), centreIn("ONLY", 470, 410, 360, 34, contrastOn(P.acc), { b: true }), centreIn(T.list[0][1], 470, 460, 360, 96, contrastOn(P.acc), { b: true }), centreIn(T.list[0][0], 470, 580, 360, 28, contrastOn(P.acc)), centre(T.brand, 900, 740, 34, P.ink, { b: true }, 80)] }) },
    { id: "openhouse", label: "open house flyer", section: "Posters and flyers", tags: ["open house", "property", "visit", "flyer"], build: (P, T) => ({ w: 900, h: 1200,
      bg: `<rect width="900" height="1200" fill="${P.bg}"/><rect y="1060" width="900" height="140" fill="${P.band}"/><path d="M450 900V1010" stroke="${P.ink}" stroke-width="2" opacity=".3"/>`,
      pics: [pic("Photo", 60, 60, 780, 620, `<defs><clipPath id="{P}c"><path d="M0 30a30 30 0 0 1 30-30h720a30 30 0 0 1 30 30v480L0 620z"/></clipPath></defs><g clip-path="url(#{P}c)">${IMG(0, 0, 0, 780, 620)}</g>`),
        pic("Badge", 600, 520, 220, 220, `<circle cx="110" cy="110" r="104" fill="${P.acc}"/><circle cx="110" cy="110" r="88" fill="none" stroke="${contrastOn(P.acc)}" stroke-width="3" opacity=".6"/>`)],
      texts: [centreIn("OPEN", 600, 585, 220, 46, contrastOn(P.acc), { b: true }), centreIn("TODAY", 600, 640, 220, 34, contrastOn(P.acc), { b: true }), fit(T.event.toUpperCase(), 60, 720, 80, P.ink, 520, { b: true }),
        fit("When", 60, 830, 28, P.ink, 360, { b: true }), fit(T.date, 60, 880, 34, P.ink, 370), fit("Where", 480, 830, 28, P.ink, 360, { b: true }), fit(T.place, 480, 880, 34, P.ink, 360), centre(`${T.contact}  ·  ${T.web}`, 900, 1112, 32, P.onBand, { b: true })] }) },
    { id: "schedule", label: "weekly schedule", section: "Banners, menus and slides", tags: ["schedule", "timetable", "week", "classes"], build: (P, T) => {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"], times = ["9 am", "12 pm", "4 pm"], X0 = 170, CW = 236, Y0 = 250, RH = 190;
      const cells = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if ((r + c) % 4 !== 3) cells.push([r, c, T.list[(r * 5 + c) % 4][0]]);
      return { w: 1400, h: 900,
        bg: `<rect width="1400" height="900" fill="${P.bg}"/>` + IMG(0, 0, 0, 1400, 150) + wash(1400, 150, [[0, "#000000", 0.7], [1, "#000000", 0.2]], "w", "h") + days.map((_, c) => `<rect x="${X0 + c * CW + 6}" y="170" width="${CW - 12}" height="60" rx="12" fill="${P.acc}"/>`).join("") +
          cells.map(([r, c]) => `<rect x="${X0 + c * CW + 6}" y="${Y0 + r * RH}" width="${CW - 12}" height="${RH - 16}" rx="16" fill="${(r + c) % 2 ? (luminance(P.bg2) > 0.6 ? P.bg2 : "#e8ecf4") : "#ffffff"}"/>`).join(""),
        pics: [photoPic("Photo", 1, 1230, 12, 126, 126, "circle", { ring: "#ffffff", rw: 6 })],
        texts: [fit("Weekly schedule", 60, 30, 56, W_, 900, { b: true }), fit(T.brand, 60, 98, 30, W_, 900), ...days.map((d, c) => centreIn(d, X0 + c * CW + 6, 182, CW - 12, 32, contrastOn(P.acc), { b: true })),
          ...times.map((t, r) => fit(t, 40, Y0 + r * RH + 66, 30, P.ink, 120, { b: true })), ...cells.map(([r, c, s]) => centreIn(s, X0 + c * CW + 6, Y0 + r * RH + 62, CW - 12, 26, "#1f2937", { b: true }))] };
    } },
    { id: "thankyou", label: "thank-you card", section: "Cards and invitations", tags: ["thank you", "card", "note", "gratitude"], build: (P, T) => ({ w: 1050, h: 750,
      bg: `<rect width="1050" height="750" fill="${P.bg}"/><circle cx="990" cy="680" r="200" fill="${P.acc}" opacity=".18"/><path d="M640 470h200" stroke="${P.acc}" stroke-width="4"/>`,
      pics: [photoPic("Photo", 0, 0, 0, 420, 750, "rect"), pic("Hearts", 900, 50, 120, 110, `<path d="M45 110C20 90 0 70 0 45 0 25 15 10 33 10c10 0 18 5 22 13 4-8 12-13 22-13 18 0 33 15 33 35 0 25-20 45-65 65z" fill="${P.acc}"/>`)],
      texts: [centreIn("Thank you", 420, 170, 630, 120, accentOn(P), { f: "serif", i: true, b: true }), centreIn("for being part of our story", 420, 360, 630, 36, P.ink, { f: "serif" }), centreIn(T.brand, 420, 500, 630, 40, P.ink, { b: true }), centreIn(T.handle, 420, 570, 630, 30, P.ink)] }) },
    { id: "testimonial", label: "review post", section: "Social media", tags: ["testimonial", "review", "customer", "stars"], build: (P, T) => ({ w: 1080, h: 1080,
      bg: IMG(0, 0, 0, 1080, 1080) + wash(1080, 1080, [[0, P.ink, 0.45], [1, P.ink, 0.7]]) + `<rect x="90" y="150" width="900" height="700" rx="40" fill="#ffffff"/>`,
      pics: [pic("Stars", 330, 210, 420, 80, [0, 1, 2, 3, 4].map((i) => star5(40 + i * 85, 40, 36, "#f5b301")).join("")), photoPic("Photo", 1, 160, 640, 150, 150, "circle", { ring: P.acc, rw: 6 })],
      texts: [centre("WHAT OUR CUSTOMERS SAY", 1080, 70, 44, W_, { b: true }), centreIn(`“${T.quote[0]}`, 90, 360, 900, 52, "#1f2937", { f: "serif", i: true }), centreIn(`${T.quote[1]}”`, 90, 440, 900, 52, "#1f2937", { f: "serif", i: true }),
        fit(T.person, 340, 670, 44, "#1f2937", 600, { b: true }), fit(`${T.role}, ${T.brand}`, 340, 735, 30, "#4b5563", 600), centre(T.web, 1080, 940, 36, W_, { b: true })] }) },
    { id: "countdown", label: "countdown post", section: "Social media", tags: ["countdown", "days to go", "event", "story"], build: (P, T) => ({ w: 1080, h: 1350,
      bg: IMG(0, 0, 0, 1080, 1350) + wash(1080, 1350, [[0, "#000000", 0.55], [0.5, "#000000", 0.35], [1, "#000000", 0.85]]),
      pics: [pic("Ring", 290, 120, 500, 500, `<circle cx="250" cy="250" r="220" fill="none" stroke="#ffffff" stroke-width="34" opacity=".35"/><path d="M250 30a220 220 0 1 1-190 110" fill="none" stroke="${P.acc}" stroke-width="34" stroke-linecap="round"/>`)],
      texts: [centre("3", 1080, 200, 300, W_, { b: true }), centre("DAYS TO GO", 1080, 690, 92, W_, { b: true }), centre(T.event, 1080, 830, 64, W_, { f: "serif", i: true }), centre(T.date, 1080, 950, 42, W_, { b: true }), centre(T.place, 1080, 1030, 38, W_)] }) },
    { id: "webinar", label: "webinar banner", section: "Banners, menus and slides", tags: ["webinar", "online", "talk", "speaker"], build: (P, T) => ({ w: 1600, h: 900,
      bg: `<rect width="1600" height="900" fill="${P.bg}"/><circle cx="1220" cy="450" r="330" fill="${P.bg2}"/><rect x="80" y="90" width="310" height="66" rx="33" fill="${P.acc}"/><circle cx="118" cy="123" r="10" fill="${contrastOn(P.acc)}"/>`,
      pics: [photoPic("Speaker photo", 0, 960, 190, 520, 520, "circle", { ring: P.acc, rw: 10 })],
      texts: [fit("LIVE WEBINAR", 140, 104, 34, contrastOn(P.acc), 240, { b: true }), fit(T.workshop, 80, 220, 76, P.ink, 820, { b: true }), fit(T.date, 80, 370, 40, P.ink, 820), fit("Speaker", 80, 500, 30, P.ink, 400, { b: true }),
        fit(T.person, 80, 550, 50, P.ink, 820, { b: true }), fit(`${T.role}, ${T.brand}`, 80, 625, 34, P.ink, 820), fit(`Free seats: ${T.web}`, 80, 760, 34, P.ink, 820, { b: true })] }) },
    { id: "bookcover", label: "book cover", section: "Tickets, signs and covers", tags: ["book", "cover", "ebook", "guide"], build: (P, T) => ({ w: 1000, h: 1500,
      bg: IMG(0, 0, 0, 1000, 1500) + wash(1000, 1500, [[0, P.band, 0.92], [0.45, P.band, 0.3], [1, P.band, 0.95]]) + `<rect width="46" height="1500" fill="#000000" opacity=".2"/><rect x="46" width="6" height="1500" fill="#ffffff" opacity=".25"/><path d="M140 1180h720" stroke="${P.onBand}" stroke-width="3" opacity=".6"/>`,
      pics: [pic("Badge", 720, 560, 200, 200, `<circle cx="100" cy="100" r="96" fill="${P.acc}"/>`)],
      texts: [centre(T.brand.toUpperCase(), 1000, 120, 34, P.onBand, { b: true }, 120), centre(T.quote[0], 1000, 230, 74, P.onBand, { f: "serif", b: true }, 110), centre(T.quote[1], 1000, 330, 52, P.onBand, { f: "serif", i: true }, 110), centreIn("NEW", 720, 635, 200, 40, contrastOn(P.acc), { b: true }),
        centre("A short guide", 1000, 1220, 44, P.onBand, { b: true }, 120), centre(T.person, 1000, 1300, 40, P.onBand, {}, 120)] }) },
    { id: "album", label: "album cover", section: "Social media", tags: ["album", "music", "cover", "square"], build: (P, T) => ({ w: 1000, h: 1000,
      bg: IMG(0, 0, 0, 1000, 1000) + wash(1000, 1000, [[0, "#000000", 0.55], [0.5, "#000000", 0.1], [1, "#000000", 0.75]]),
      pics: [pic("Record", 560, 520, 400, 400, `<circle cx="200" cy="200" r="198" fill="#141414"/>${[180, 150, 120].map((r) => `<circle cx="200" cy="200" r="${r}" fill="none" stroke="#2c2c2c" stroke-width="3"/>`).join("")}<circle cx="200" cy="200" r="70" fill="${P.acc}"/><circle cx="200" cy="200" r="10" fill="#141414"/>`)],
      texts: [fit(T.brand.toUpperCase(), 60, 60, 48, W_, 880, { b: true }), fit(T.word, 60, 760, 120, W_, 520, { b: true }), fit("SIDE A", 60, 900, 30, W_, 160, { b: true })] }) },
    { id: "hours", label: "opening hours sign", section: "Tickets, signs and covers", tags: ["opening hours", "sign", "store", "open"], build: (P, T) => ({ w: 900, h: 1200,
      bg: `<rect width="900" height="1200" fill="${P.bg}"/><rect x="60" y="60" width="780" height="1080" rx="40" fill="none" stroke="${P.acc}" stroke-width="8"/><rect x="120" y="620" width="660" height="2" fill="${P.ink}" opacity=".3"/><rect x="120" y="770" width="660" height="2" fill="${P.ink}" opacity=".3"/>`,
      pics: [photoPic("Photo", 0, 120, 110, 660, 260, "round", { r: 24 }), pic("Clock", 690, 960, 110, 110, `<circle cx="55" cy="55" r="50" fill="${P.acc}"/><path d="M55 22v35l22 14" stroke="${contrastOn(P.acc)}" stroke-width="8" fill="none" stroke-linecap="round"/>`)],
      texts: [centre("WE'RE OPEN", 900, 400, 86, P.ink, { b: true }, 100), fit("Monday to Friday", 120, 520, 38, P.ink, 400, { b: true }), fit("9 am – 6 pm", 540, 520, 38, P.ink, 240), fit("Saturday", 120, 670, 38, P.ink, 400, { b: true }), fit("10 am – 4 pm", 540, 670, 38, P.ink, 240),
        fit("Sunday", 120, 820, 38, P.ink, 400, { b: true }), fit("Closed", 540, 820, 38, P.ink, 240), fit(T.brand, 120, 960, 40, P.ink, 540, { b: true }), fit(T.contact, 120, 1030, 30, P.ink, 540)] }) },
    { id: "wifi", label: "Wi-Fi sign", section: "Tickets, signs and covers", tags: ["wifi", "password", "sign", "cafe"], build: (P, T) => ({ w: 800, h: 1000,
      bg: IMG(0, 0, 0, 800, 1000) + wash(800, 1000, [[0, "#000000", 0.5], [1, "#000000", 0.7]]) + `<rect x="80" y="560" width="640" height="300" rx="30" fill="#ffffff" opacity=".96"/>`,
      pics: [pic("Wi-Fi", 250, 80, 300, 240, `<g fill="none" stroke="${P.acc === "#ffffff" ? P.acc2 : P.acc}" stroke-width="30" stroke-linecap="round"><path d="M20 90a185 185 0 0 1 260 0"/><path d="M70 145a110 110 0 0 1 160 0"/></g><circle cx="150" cy="205" r="26" fill="${P.acc === "#ffffff" ? P.acc2 : P.acc}"/>`)],
      texts: [centre("Free Wi-Fi", 800, 360, 100, W_, { b: true }), centre(T.brand, 800, 480, 36, W_), fit("Network", 120, 590, 30, "#4b5563", 560, { b: true }), fit(T.brand.replace(/\s+/g, "-"), 120, 630, 40, "#1f2937", 560, { f: "mono", b: true }),
        fit("Password", 120, 720, 30, "#4b5563", 560, { b: true }), fit(`${T.word.toLowerCase()}2026`, 120, 760, 40, "#1f2937", 560, { f: "mono", b: true }), centre("Ask our team if you need help", 800, 910, 30, W_)] }) },
    { id: "festival", label: "festival poster", section: "Posters and flyers", tags: ["festival", "music", "fair", "poster"], build: (P, T) => ({ w: 900, h: 1200,
      bg: IMG(0, 0, 0, 900, 1200) + wash(900, 1200, [[0, P.band, 0.85], [0.4, P.band, 0.2], [1, P.band, 0.95]]) + `<g opacity=".95"><path d="M0 760L900 600v120L0 880z" fill="${P.acc}"/></g>`,
      pics: [pic("Sticker", 620, 330, 240, 240, `${burst(120, 120, 118, 16, P.acc2)}<circle cx="120" cy="120" r="80" fill="${P.acc}"/>`)],
      texts: [fit(T.word, 60, 90, 170, P.onBand, 760, { b: true }), fit(T.event.toUpperCase(), 60, 300, 56, P.onBand, 520, { b: true }), fit(T.tag, 60, 390, 36, P.onBand, 520), centreIn("FREE", 620, 425, 240, 46, contrastOn(P.acc), { b: true }),
        ...T.items.map((s, i) => fit(`•  ${s}`, 60, 950 + i * 56, 34, P.onBand, 780)), fit(T.date, 60, 1120, 34, P.onBand, 780, { b: true })] }) },
    { id: "notice", label: "notice", section: "Posters and flyers", tags: ["notice", "announcement", "board", "update"], build: (P, T) => ({ w: 900, h: 1200,
      bg: `<rect width="900" height="1200" fill="#f6f1e7"/><rect x="50" y="50" width="800" height="1100" fill="#ffffff" stroke="#e5ddcc" stroke-width="3"/>` + IMG(0, 50, 50, 800, 200) + wash(800, 200, [[0, P.band === "#ffffff" ? P.acc : P.band, 0.6], [1, P.band === "#ffffff" ? P.acc : P.band, 0.9]], "w", "v", 50, 50),
      pics: [pic("Pins", 60, 20, 780, 80, `<circle cx="40" cy="40" r="22" fill="${P.acc2}"/><circle cx="34" cy="34" r="7" fill="#ffffff" opacity=".6"/><circle cx="740" cy="40" r="22" fill="${P.acc2}"/><circle cx="734" cy="34" r="7" fill="#ffffff" opacity=".6"/>`)],
      texts: [centreIn("NOTICE", 50, 90, 800, 110, P.band === "#ffffff" ? contrastOn(P.acc) : P.onBand, { b: true }), fit(T.head, 110, 300, 52, "#1f2937", 680, { b: true }), fit(`${T.event}: ${T.date}`, 110, 390, 34, "#1f2937", 680), fit(`Place: ${T.place}`, 110, 450, 34, "#1f2937", 680),
        ...T.items.map((s, i) => fit(`•  ${s}`, 110, 590 + i * 70, 32, "#374151", 680)), fit(`Questions? Call ${T.contact}`, 110, 830, 32, "#374151", 680), fit(T.person, 110, 1020, 34, "#1f2937", 500, { b: true }), fit(`${T.role}, ${T.brand}`, 110, 1070, 28, "#4b5563", 500)] }) },
    { id: "fundraiser", label: "fundraiser post", section: "Social media", tags: ["fundraiser", "donate", "goal", "charity"], build: (P, T) => ({ w: 1080, h: 1080,
      bg: IMG(0, 0, 0, 1080, 1080) + wash(1080, 1080, [[0, "#000000", 0.7], [0.6, "#000000", 0.45], [1, "#000000", 0.75]]) + `<rect x="90" y="880" width="420" height="96" rx="48" fill="${P.acc}"/>`,
      pics: [pic("Progress", 90, 560, 900, 200, `<rect x="0" y="60" width="900" height="70" rx="35" fill="#ffffff" opacity=".3"/><rect x="0" y="60" width="585" height="70" rx="35" fill="${P.acc}"/><circle cx="585" cy="95" r="46" fill="#ffffff"/>`)],
      texts: [fit("HELP US REACH OUR GOAL", 90, 100, 46, W_, 880, { b: true }), fit(T.offer, 90, 190, 76, W_, 900, { b: true }), fit(T.brand, 90, 320, 40, W_, 900), fit("65% raised", 90, 470, 58, W_, 500, { b: true }), fit("Goal: 1,000 gifts", 600, 485, 34, W_, 390),
        centreIn("Give today", 90, 902, 420, 44, contrastOn(P.acc), { b: true }), fit(T.web, 90, 790, 34, W_, 600)] }) },
    { id: "pricelist", label: "price list", section: "Banners, menus and slides", tags: ["price list", "rates", "services", "cards"], build: (P, T) => ({ w: 1080, h: 1350,
      bg: `<rect width="1080" height="1350" fill="${P.bg}"/>` + IMG(0, 0, 0, 1080, 330) + wash(1080, 330, [[0, "#000000", 0.75], [1, "#000000", 0.25]], "w", "h") + [0, 1, 2, 3].map((i) => `<rect x="80" y="${400 + i * 200}" width="920" height="160" rx="28" fill="#ffffff"/><rect x="80" y="${400 + i * 200}" width="16" height="160" rx="8" fill="${P.acc}"/>`).join(""),
      pics: [pic("Badge", 820, 70, 200, 200, `<circle cx="100" cy="100" r="96" fill="${P.acc}"/>`)],
      texts: [fit(T.listTitle.toUpperCase(), 80, 80, 84, W_, 680, { b: true }), fit(T.brand, 80, 200, 40, W_, 680), centreIn(T.pct, 820, 145, 200, 32, contrastOn(P.acc), { b: true }),
        ...T.list.map(([nm], i) => fit(nm, 130, 450 + i * 200, 46, "#1f2937", 560, { b: true })), ...T.list.map(([, pr], i) => fit(pr, 720, 450 + i * 200, 46, darkish(P), 260, { b: true })), centre(T.hours, 1080, 1230, 34, P.ink)] }) },
    { id: "story", label: "story", section: "Social media", tags: ["story", "vertical", "9:16", "reel"], build: (P, T) => ({ w: 1080, h: 1920,
      bg: IMG(0, 0, 0, 1080, 1920) + wash(1080, 1920, [[0, P.band, 0.6], [0.3, P.band, 0.05], [0.6, P.band, 0.4], [1, P.band, 0.97]]) + `<rect x="340" y="1700" width="400" height="110" rx="55" fill="${P.acc}"/>`,
      pics: [pic("Arrow up", 490, 1590, 100, 80, `<path d="M50 5l40 40H65v30H35V45H10z" fill="${P.acc}"/>`)],
      texts: [centre(T.brand.toUpperCase(), 1080, 160, 44, P.onBand, { b: true }), centre(T.head, 1080, 1180, 100, P.onBand, { b: true }), centre(T.tag, 1080, 1320, 48, P.onBand), centre(T.offer, 1080, 1420, 56, P.onBand, { b: true }), centreIn("Swipe up", 340, 1730, 400, 44, contrastOn(P.acc), { b: true })] }) },
    { id: "grid", label: "photo grid post", section: "Social media", tags: ["grid", "collage", "square", "post"], build: (P, T) => ({ w: 1080, h: 1080,
      bg: `<rect width="1080" height="1080" fill="${P.bg}"/><rect x="0" y="900" width="1080" height="180" fill="${P.band}"/>`,
      pics: [[40, 40], [550, 40], [40, 470], [550, 470]].map(([x, y], i) => photoPic(`Photo ${i + 1}`, i, x, y, 490, 400, "round", { r: 22 })).concat([pic("Label", 380, 400, 320, 140, `<rect width="320" height="140" rx="70" fill="#ffffff"/>`)]),
      texts: [centreIn(T.word, 380, 425, 320, 64, "#1f2937", { b: true }), centre(`${T.brand}  ·  ${T.handle}`, 1080, 960, 44, P.onBand, { b: true })] }) },
    { id: "letterhead", label: "letterhead", section: "Cards and invitations", tags: ["letterhead", "letter", "A4", "stationery"], build: (P, T) => ({ w: 1240, h: 1754,
      bg: `<rect width="1240" height="1754" fill="#ffffff"/>` + IMG(0, 0, 0, 1240, 220) + wash(1240, 220, [[0, P.band === "#ffffff" ? P.acc : P.band, 0.95], [1, P.band === "#ffffff" ? P.acc : P.band, 0.7]], "w", "h") + `<path d="M0 220h1240" stroke="${P.acc2}" stroke-width="10"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="120" y="${420 + i * 70}" width="${i % 4 === 3 ? 600 : 1000}" height="8" rx="4" fill="#e5e7eb"/>`).join("") + `<rect y="1620" width="1240" height="134" fill="${P.bg2}"/>`,
      pics: [pic("Logo", 1040, 40, 140, 140, `<rect width="140" height="140" rx="32" fill="#ffffff"/><svg x="15" y="15" width="110" height="110" viewBox="0 0 400 400">${ICONS[T.icon](P.acc, P.acc2, "#1f2937")}</svg>`)],
      texts: [fit(T.brand, 120, 60, 64, P.band === "#ffffff" ? contrastOn(P.acc) : P.onBand, 860, { b: true }), fit(T.tag, 120, 145, 32, P.band === "#ffffff" ? contrastOn(P.acc) : P.onBand, 860), fit(T.date.replace(/,.*$/, ""), 120, 300, 32, "#1f2937", 700),
        fit(`${T.place}  ·  ${T.contact}  ·  ${T.web}`, 120, 1665, 30, contrastOn(P.bg2), 1000)] }) },
  ];
}

export const LAYOUTS = LAYOUT_DEFS.length;
const L = new Map(LAYOUT_DEFS.map((d) => [d.id, d])), PAL = new Map(PALETTES.map((p) => [p.id, p])), TH = new Map(THEMES.map((t) => [t.id, t]));
const nameOf = (l, p, t) => `${t.label} ${l.label} · ${p.name}`;
function parse(id) {
  const [l, p, t] = String(id || "").split("~");
  return L.has(l) && PAL.has(p) && TH.has(t) ? { l: L.get(l), p: PAL.get(p), t: TH.get(t) } : null;
}
// The first hand-made samples keep working as ?template= ids (links, demos and tests use them).
export const ALIASES = {
  "fruit-sale-poster": "poster~p01~shop", "coffee-flyer": "flyer~p02~cafe", "quote-card": "quote~p03~fitness", "yoga-post": "social~p04~fitness",
  "podcast-cover": "cover~p05~tech", "business-card": "card~p04~beauty", "birthday-invite": "invite~p07~school", "save-the-date": "savedate~p08~wedding",
  "sale-banner": "banner~p05~shop", "cafe-menu": "menu~p06~cafe",
};
export const resolveId = (id) => (ALIASES[id] || id);

// Well-mixed order: round-robin over the layouts; each layout walks the themes and shifts the palette every round.
function combos(count) {
  const out = [], seen = new Set(), used = LAYOUT_DEFS.map(() => 0), nT = THEMES.length, nP = PALETTES.length, max = LAYOUT_DEFS.length * nT * nP;
  for (let k = 0; out.length < count && k < max * 2; k++) {
    const li = k % LAYOUT_DEFS.length, c = used[li]++;
    const t = THEMES[(c + li) % nT], p = PALETTES[(c * 5 + li * 3 + Math.floor(c / nT)) % nP];
    const id = `${LAYOUT_DEFS[li].id}~${p.id}~${t.id}`;
    if (seen.has(id)) continue;
    seen.add(id); out.push({ l: LAYOUT_DEFS[li], p, t, id });
  }
  return out;
}
// The editor's Templates panel starts a new section header whenever the section changes, so keep each section together.
const bySection = (list) => { const order = [...new Set(list.map((x) => x.section))]; return order.flatMap((sec) => list.filter((x) => x.section === sec)); };
const entry = ({ l, p, t, id }, section = l.section) => ({
  id, name: nameOf(l, p, t), tool: TOOL, app: "layers", section, layout: l.id, layoutName: l.label.charAt(0).toUpperCase() + l.label.slice(1), theme: t.id, themeName: t.label, palette: p.id,
  tags: [...l.tags, t.label.toLowerCase(), t.id, p.name.toLowerCase(), l.label],
});
// One card of every base layout first (grouped by section, so the first LAYOUTS cards are all different designs), then
// more themes and colours of them under "More sample designs".
const ALL = combos(Math.max(COUNT, LAYOUT_DEFS.length));
export const TEMPLATES = [...bySection(ALL.slice(0, LAYOUT_DEFS.length).map((c) => entry(c))), ...ALL.slice(LAYOUT_DEFS.length).map((c) => entry(c, "More sample designs"))];
export const TOTAL = TEMPLATES.length;
export const templateById = (id) => { const c = parse(resolveId(id)); return c ? { id: resolveId(id), name: nameOf(c.l, c.p, c.t) } : null; };

const cacheSpec = new Map();
function spec(id) {
  const rid = resolveId(id);
  if (cacheSpec.has(rid)) return cacheSpec.get(rid);
  const c = parse(rid);
  if (!c) return null;
  const s = { id: rid, name: nameOf(c.l, c.p, c.t), layout: c.l.id, photos: photosOf(rid, c.t.id), ...c.l.build(c.p, c.t) };
  if (cacheSpec.size > 200) cacheSpec.clear();
  cacheSpec.set(rid, s);
  return s;
}
const safeId = (id) => id.replace(/[^a-z0-9-]/gi, "-");
/** Unique ids ({P}) and the real photos ({IMGn}: the small file for thumbnails, the full one for the opened design). */
const uniq = (body, p, photos = [], size = "full") => body.replace(/\{P\}/g, p).replace(/\{IMG(\d)\}/g, (_, i) => photoUrl(photos[+i] || photos[0], size));
/** The SVG (as text) of one picture layer of a sample. */
export const partSvg = (d, part, i, size = "full") => svgDoc(part.w, part.h, uniq(part.body, `${safeId(d.id)}-${i}-`, d.photos, size));

/**
 * The sample as a page { w, h, layers } (layers bottom first, Studio's Design JSON layer shape). Pictures come as
 * SVG data URLs (real photos are referenced from the shared library); the app inlines the photos and turns every picture
 * into PNG before showing it (so Studio and the exports can use them as they are).
 */
export function design(id) {
  const d = spec(id);
  if (!d) return null;
  const svgUrl = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const layers = [imageLayer({ src: svgUrl(svgDoc(d.w, d.h, uniq(d.bg, `${safeId(d.id)}-bg-`, d.photos))), x: 0, y: 0, w: d.w, h: d.h, name: "Background" })];
  d.pics.forEach((p, i) => layers.push(imageLayer({ src: svgUrl(partSvg(d, p, i)), x: p.x, y: p.y, w: p.w, h: p.h, name: p.n })));
  for (const t of d.texts) {
    const lines = t.c.split("\n").length;
    layers.push({
      id: newId(), type: "text", name: t.c.slice(0, 24), x: t.x, y: t.y, w: textWidth(t), h: Math.round(t.s * LINE_HEIGHT * lines * 100) / 100,
      rotation: 0, opacity: 1, locked: false, hidden: false, animation: null,
      text: { content: t.c, family: t.f, size: t.s, bold: t.b, italic: t.i, underline: false, color: t.col, align: t.al, lineHeight: LINE_HEIGHT, letterSpacing: 0 },
    });
  }
  return { w: d.w, h: d.h, kind: "template", id: d.id, name: d.name, layers };
}

/* ---------- thumbnails: the flat design and its layers pulled apart (background, pictures, text), Magic Layers style ---------- */
const nn = (v) => String(Math.round(v * 10) / 10);
function textSvg(t) {
  const base = t.y + baselineOffset(t.s, t.f);
  const x = t.al === "center" ? t.x + textWidth(t) / 2 : t.x;
  return `<text x="${x}" y="${base.toFixed(1)}" font-family="${esc(FONT[t.f] || FONT.sans)}" font-size="${t.s}"${t.b ? ' font-weight="700"' : ""}${t.i ? ' font-style="italic"' : ""} fill="${t.col}"${t.al === "center" ? ' text-anchor="middle"' : ""} xml:space="preserve">${esc(t.c)}</text>`;
}
/** One flat plane of a layer group, turned into 3D (skewed and squeezed), with a soft outline. */
function plane(gid, d, x, y, s, { solid = false, label = "", lx = 0 } = {}) {
  const w = d.w * s, h = d.h * s;
  return `<g transform="translate(${nn(x)} ${nn(y)}) skewY(-14) scale(0.86 1)">` + (solid ? `<rect width="${nn(w)}" height="${nn(h)}" fill="#ffffff" filter="url(#${gid}sh)"/>` : `<rect width="${nn(w)}" height="${nn(h)}" fill="#ffffff" fill-opacity=".28" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="4 3"/>`)
    + `<g transform="scale(${(s).toFixed(5)})"><use href="#${gid}${label}"/></g></g>`;
}
const chip = (x, y, label, color) => { const w = label.length * 5.6 + 22; return `<g transform="translate(${nn(x)} ${nn(y)})"><rect width="${nn(w)}" height="17" rx="8.5" fill="#ffffff" filter="url(#chipsh)"/><circle cx="9" cy="8.5" r="3.5" fill="${color}"/><text x="16" y="12" font-family="Arial,Helvetica,sans-serif" font-size="9" font-weight="700" fill="#1b2133">${esc(label)}</text></g>`; };
const cache = new Map();
/** 320 × 200 preview: the finished design (real photos) beside its layers pulled apart, built on demand. */
export function thumb(id) {
  const rid = resolveId(id);
  if (cache.has(rid)) return cache.get(rid);
  const d = spec(rid);
  if (!d) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="#f4f5fa"/></svg>';
  const p = `th-${safeId(rid)}-`, gid = p.replace(/[^a-z0-9-]/gi, "");
  const bg = `<svg width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}">${uniq(d.bg, p + "bg-", d.photos, "thumb")}</svg>`;
  const pics = d.pics.map((q, i) => `<svg x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" viewBox="0 0 ${q.w} ${q.h}">${uniq(q.body, p + i + "-", d.photos, "thumb")}</svg>`).join("");
  const txt = d.texts.map(textSvg).join("");
  const defs = `<defs><filter id="${gid}sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1b2133" flood-opacity=".3"/></filter><filter id="chipsh" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#1b2133" flood-opacity=".25"/></filter>`
    + `<g id="${gid}B">${bg}</g><g id="${gid}P">${pics}</g><g id="${gid}T">${txt}</g><g id="${gid}A"><use href="#${gid}B"/><use href="#${gid}P"/><use href="#${gid}T"/></g></defs>`;
  const wide = d.w / d.h > 1.25, v = LAYOUT_DEFS.findIndex((l) => l.id === d.layout) % 2;
  let body = `<rect width="320" height="200" fill="url(#${gid}bgg)"/>`;
  const bgg = `<linearGradient id="${gid}bgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef0fb"/><stop offset="1" stop-color="#e2e6f5"/></linearGradient>`;
  if (!wide) {
    // flat design on the left, its three layers fanned out in 3D on the right
    const fh = 172, fs = fh / d.h, fw = d.w * fs, fx = v ? 14 : 320 - 14 - fw, fy = 14;
    body += `<g transform="translate(${nn(fx)} ${nn(fy)})"><rect width="${nn(fw)}" height="${nn(fh)}" fill="#ffffff" filter="url(#${gid}sh)"/><g transform="scale(${fs.toFixed(5)})"><use href="#${gid}A"/></g></g>`;
    const ps = Math.min(108 / d.h, 86 / d.w), ax = v ? fx + fw + 22 : 12, right = v ? 308 : fx - 12, room = right - ax - d.w * ps * 0.86;
    const step = Math.max(12, Math.min(30, room / 2));
    body += plane(gid, d, ax + step * 2, 62, ps, { solid: true, label: "B" }) + plane(gid, d, ax + step, 80, ps, { label: "P" }) + plane(gid, d, ax, 98, ps, { label: "T" });
    const cx = (w) => Math.max(ax, Math.min(right - w, ax + step * 2));
    body += chip(cx(78), 14, "Background", "#22c55e") + chip(Math.max(ax, Math.min(right - 56, ax + step)), 34, "Photos", "#f59e0b") + chip(ax, 178, "Text", "#6366f1");
  } else {
    // wide designs: flat design on top, the layers pulled apart below it
    const fw = 196, fs = fw / d.w, fh = d.h * fs, fx = 14, fy = 12;
    body += `<g transform="translate(${fx} ${fy})"><rect width="${fw}" height="${nn(fh)}" fill="#ffffff" filter="url(#${gid}sh)"/><g transform="scale(${fs.toFixed(5)})"><use href="#${gid}A"/></g></g>`;
    const ps = Math.min(92 / d.w, (200 - fh - 40) / d.h / 1.05), y0 = fy + fh + 26 + d.w * ps * 0.86 * 0.25;
    body += plane(gid, d, 130, y0 - 14, ps, { solid: true, label: "B" }) + plane(gid, d, 72, y0 - 7, ps, { label: "P" }) + plane(gid, d, 14, y0, ps, { label: "T" });
    body += chip(226, 22, "Background", "#22c55e") + chip(226, 46, "Photos", "#f59e0b") + chip(226, 70, "Text", "#6366f1") + `<text x="226" y="104" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#5b6275">${d.pics.length + 1 + d.texts.length} layers</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${esc(d.name)} sample">${defs.replace("</defs>", bgg + "</defs>")}${body}</svg>`;
  if (cache.size > 400) cache.clear();
  cache.set(rid, svg);
  return svg;
}
/** The flat design with its real full-size photos as one SVG (previews and checks). */
export function designSvg(id, width = 900) {
  const d = spec(id);
  if (!d) return "";
  const p = `ds-${safeId(d.id)}-`;
  const pics = d.pics.map((q, i) => `<svg x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" viewBox="0 0 ${q.w} ${q.h}">${uniq(q.body, p + i + "-", d.photos)}</svg>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round((width * d.h) / d.w)}" viewBox="0 0 ${d.w} ${d.h}">${uniq(d.bg, p + "bg-", d.photos)}${pics}${d.texts.map(textSvg).join("")}</svg>`;
}
