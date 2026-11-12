// Website template gallery (editor Templates panel + the /tools/websites intro page). Pure ES module: no DOM.
// 13 hand-made sites first, then a GENERATOR: our own base LAYOUTS × colour PALETTES × content THEMES (own text,
// own drawn artwork). Generated ids encode the combination: "<layout>~<palette>~<theme>" (e.g. "classic~p03~clinic");
// makeSite(id) and thumb(id) build from the id, so every template opens and is editable. Names are made up;
// emails use example.com and phone numbers are placeholders. TOTAL matches the number of website templates Canva lists.
import { newBlock, normalizeSite, DEFAULT_THEME, BLOCK_TYPES, addPage, switchPage } from "./blocks.js";
import { art, productArt } from "./art.js";
import { makeTemplate } from "./templates.js";

const L = (label, href) => ({ label, href });
const site = (name, description, theme, blocks, template) => normalizeSite({ version: 1, name, description, template, theme: { ...DEFAULT_THEME, ...theme }, blocks });

/* ------------------------------------------------------------------ hand-made extras (beside templates.js) */
const EXTRA = {
  "link-in-bio": () => site("Zara Bakes · links", "All of Zara Bakes in one place: order cakes, see the menu and follow along.",
    { primary: "#db2777", accent: "#f59e0b", headingFont: "calibri", bodyFont: "sans", corners: "round" }, [
      newBlock("hero", { eyebrow: "Home bakery · Lahore", title: "Zara Bakes", text: "Custom cakes, brownies and cookies baked fresh to order.", primary: L("Order on WhatsApp", "https://wa.me/923000000000?text=Hi%20Zara%20Bakes"), secondary: L("See the menu", "#pricing"), image: "", layout: "center" }, { bg: "tint" }),
      newBlock("features", { title: "Quick links", intro: "", items: [
        { icon: "cart", title: "Order a cake", text: "Two days notice for custom cakes." },
        { icon: "camera", title: "Photo gallery", text: "See cakes we made this month." },
        { icon: "chat", title: "Ask a question", text: "We reply on WhatsApp within the hour." }] }),
      newBlock("pricing", { title: "Menu", intro: "Prices for a 1 kg cake.", plans: [
        { name: "Chocolate fudge", price: "Rs 2,800", period: "", text: "Our best seller.", features: ["Rich ganache", "Fresh cream"], button: L("Order", "https://wa.me/923000000000?text=Chocolate%20fudge"), featured: true },
        { name: "Red velvet", price: "Rs 3,200", period: "", text: "With cream cheese icing.", features: ["Soft sponge", "Cream cheese"], button: L("Order", "https://wa.me/923000000000?text=Red%20velvet"), featured: false }] }, { bg: "alt" }),
      newBlock("footer", { text: "Zara Bakes · baked with love", links: [L("Menu", "#pricing")], copy: "© 2026 Zara Bakes" }),
    ], "link-in-bio"),
  "landing-page": () => site("Tally app", "Tally keeps your shop's sales and credit in one simple phone app.",
    { primary: "#0f766e", accent: "#f97316", headingFont: "sans", bodyFont: "sans", corners: "soft" }, [
      newBlock("header", { brand: "Tally", links: [L("Features", "#features"), L("Prices", "#pricing"), L("FAQ", "#faq")], cta: L("Try it free", "#contact") }),
      newBlock("hero", { eyebrow: "New · for small shops", title: "Know your daily sales in one tap", text: "Tally records sales, credit and stock on your phone. No training needed, works without internet.", primary: L("Try it free", "#contact"), secondary: L("See features", "#features"), image: art("shop", "teal", 2), layout: "split" }),
      newBlock("features", { title: "Everything a shop needs", intro: "", items: [
        { icon: "bolt", title: "Fast entry", text: "Add a sale in three taps." },
        { icon: "shield", title: "Safe backups", text: "Your records are copied every night." },
        { icon: "chat", title: "Credit reminders", text: "Send polite reminders to customers." },
        { icon: "check", title: "Daily summary", text: "See today's total at closing time." }] }, { bg: "alt" }),
      newBlock("pricing", { title: "Simple prices", intro: "Start free, upgrade when you grow.", plans: [
        { name: "Free", price: "Rs 0", period: "/ month", text: "For one shop.", features: ["Sales and credit", "One phone"], button: L("Start free", "#contact"), featured: false },
        { name: "Pro", price: "Rs 900", period: "/ month", text: "For busy shops.", features: ["Stock tracking", "Three phones", "Reports"], button: L("Go Pro", "#contact"), featured: true }] }),
      newBlock("faq", { title: "Questions", items: [{ q: "Does it work offline?", a: "Yes. It saves on the phone and syncs later." }, { q: "Can I cancel any time?", a: "Yes, with one tap in the settings." }] }, { bg: "alt" }),
      newBlock("contact", { title: "Get the app", text: "Leave your number and we will send the download link.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: "", waText: "", waLabel: "", address: "", formTitle: "Send me the link", send: "Send" }),
      newBlock("footer", { text: "Tally · simple shop records", links: [L("Features", "#features"), L("FAQ", "#faq")], copy: "© 2026 Tally" }),
    ], "landing-page"),
  wedding: () => site("Sana and Omar", "Join us to celebrate the wedding of Sana and Omar in Islamabad.",
    { primary: "#9d174d", accent: "#d4a017", headingFont: "serif", bodyFont: "serif", corners: "round" }, [
      newBlock("header", { brand: "Sana & Omar", links: [L("Our story", "#about"), L("Events", "#timeline"), L("Venue", "#location"), L("RSVP", "#contact")], cta: L("RSVP", "#contact") }),
      newBlock("hero", { eyebrow: "Saturday 20 February 2027 · Islamabad", title: "Sana and Omar are getting married", text: "We would love you to be with us for the mehndi, the nikah and the walima.", primary: L("RSVP now", "#contact"), secondary: L("See the events", "#timeline"), image: art("event", "rose", 4), layout: "cover" }),
      newBlock("about", { title: "Our story", text: "We met at university in 2019 over a broken library printer.\nSix years later, we are starting our life together.", image: art("portrait", "rose", 5), button: L("", ""), side: "right" }, { bg: "tint" }),
      newBlock("timeline", { title: "Wedding events", items: [
        { when: "Thursday 7pm", title: "Mehndi", text: "Music, dholki and dinner at the family home." },
        { when: "Saturday 4pm", title: "Nikah", text: "Faisal Mosque lawn, followed by tea." },
        { when: "Sunday 8pm", title: "Walima", text: "Dinner at the Lake View marquee." }] }),
      newBlock("map", { title: "Venue", address: "Lake View marquee, Park Road, Islamabad", note: "Parking at Gate 1.", query: "Lake View Park Islamabad", label: "Open in Maps", image: art("map", "rose") }, { bg: "alt" }),
      newBlock("contact", { title: "RSVP", text: "Please let us know by 1 February 2027.", email: "rsvp@example.com", phone: "", whatsapp: "923000000000", waText: "Salam! We will attend the wedding.", waLabel: "RSVP on WhatsApp", address: "", formTitle: "Send your RSVP", send: "Send RSVP" }),
      newBlock("footer", { text: "With love, Sana and Omar", links: [], copy: "© 2027 Sana & Omar" }),
    ], "wedding"),
  fitness: () => site("Peak Fitness Studio", "Small group training, yoga and personal coaching in Karachi.",
    { primary: "#ea580c", accent: "#0ea5e9", headingFont: "sans", bodyFont: "sans", corners: "sharp", mode: "dark", bg: "#0f1222", text: "#e9ebf5" }, [
      newBlock("header", { brand: "Peak Fitness", links: [L("Classes", "#timeline"), L("Plans", "#pricing"), L("Coaches", "#team")], cta: L("Free trial", "#contact") }),
      newBlock("hero", { eyebrow: "Clifton, Karachi", title: "Get stronger in 12 weeks", text: "Small groups, real coaches and a plan made for you.", primary: L("Book a free class", "#contact"), secondary: L("See plans", "#pricing"), image: art("work", "saffron", 6), layout: "split" }),
      newBlock("timeline", { title: "Weekly classes", items: [{ when: "Mon · Wed · Fri", title: "Strength", text: "7am and 7pm" }, { when: "Tue · Thu", title: "Yoga", text: "8am" }, { when: "Saturday", title: "Bootcamp", text: "9am" }] }),
      newBlock("pricing", { title: "Plans", intro: "", plans: [
        { name: "Monthly", price: "Rs 8,000", period: "/ month", text: "", features: ["All classes"], button: L("Join", "#contact"), featured: false },
        { name: "Quarterly", price: "Rs 21,000", period: "/ 3 months", text: "Best value.", features: ["All classes", "Diet plan"], button: L("Join", "#contact"), featured: true }] }, { bg: "alt" }),
      newBlock("team", { title: "Coaches", intro: "", members: [0, 1, 2].map((i) => ({ photo: art("portrait", "saffron", i + 4), name: ["Coach Faraz", "Coach Mehwish", "Coach Danish"][i], role: ["Strength", "Yoga", "Bootcamp"][i] })) }),
      newBlock("contact", { title: "Book a free class", text: "Your first class is on us.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: "923000000000", waText: "Hi! I want a free class.", waLabel: "Book on WhatsApp", address: "Clifton Block 5, Karachi", formTitle: "Book a trial", send: "Book" }),
      newBlock("footer", { text: "Peak Fitness Studio", links: [L("Plans", "#pricing")], copy: "© 2026 Peak Fitness" }),
    ], "fitness"),
  charity: () => site("Clean Water Circle", "A volunteer group that installs water filters in village schools.",
    { primary: "#0369a1", accent: "#16a34a", headingFont: "serif", bodyFont: "sans", corners: "soft" }, [
      newBlock("header", { brand: "Clean Water Circle", links: [L("Our work", "#features"), L("Stories", "#reviews"), L("Help", "#contact")], cta: L("Donate", "#contact") }),
      newBlock("hero", { eyebrow: "Since 2020 · 64 schools", title: "Clean water for every school child", text: "One filter gives 300 children safe drinking water for five years.", primary: L("Give a filter", "#contact"), secondary: L("See our work", "#features"), image: art("study", "teal", 7), layout: "split" }),
      newBlock("features", { title: "What your gift does", intro: "", items: [{ icon: "heart", title: "Rs 5,000", text: "Repairs one school tap." }, { icon: "shield", title: "Rs 25,000", text: "Buys one water filter." }, { icon: "star", title: "Rs 60,000", text: "Filter plus five years of care." }] }, { bg: "alt" }),
      newBlock("testimonials", { title: "Stories", items: [{ quote: "Fewer children miss school because of stomach illness now.", name: "Head teacher", role: "Village school" }] }),
      newBlock("contact", { title: "Help us", text: "Volunteer or donate. Every rupee goes to filters.", email: "give@example.com", phone: "", whatsapp: "923000000000", waText: "I want to help.", waLabel: "Talk to us", address: "", formTitle: "Send a message", send: "Send" }, { bg: "tint" }),
      newBlock("footer", { text: "Clean Water Circle · a volunteer group", links: [], copy: "© 2026 Clean Water Circle" }),
    ], "charity"),
  "coming-soon": () => site("Noor Studio · coming soon", "Noor Studio opens soon: handmade ceramics and pottery classes.",
    { primary: "#7c3aed", accent: "#f472b6", headingFont: "cambria", bodyFont: "sans", corners: "round" }, [
      newBlock("hero", { eyebrow: "Opening March 2027", title: "Something lovely is coming soon", text: "Noor Studio: handmade ceramics and weekend pottery classes. Leave your email and be the first to know.", primary: L("Tell me first", "#contact"), secondary: L("", ""), image: art("abstract", "violet", 9), layout: "cover" }),
      newBlock("contact", { title: "Get the news first", text: "One email when we open. No spam.", email: "hello@example.com", phone: "", whatsapp: "", waText: "", waLabel: "", address: "", formTitle: "Your email", send: "Notify me" }),
      newBlock("footer", { text: "Noor Studio", links: [], copy: "© 2026 Noor Studio" }),
    ], "coming-soon"),
};
// Hand-made: [id, name, section, tags, [main, accent, light, dark, page], hero layout, thumbnail headline]
const HAND = [
  ["business", "Small business", "Business", ["services", "repairs", "salon", "clinic", "company"], ["#2563eb", "#f59e0b", "#e3edff", "#111827", "#ffffff"], "split", "Home repairs done right"],
  ["restaurant", "Restaurant", "Food and drink", ["food", "cafe", "menu", "booking"], ["#c2410c", "#eab308", "#fff1e0", "#3b2314", "#fff8ef"], "cover", "Fresh desi food"],
  ["shop", "Online store", "Shops", ["shop", "store", "products", "whatsapp", "ecommerce"], ["#15803d", "#eab308", "#e3f6e8", "#132a1c", "#ffffff"], "split", "Handmade things"],
  ["landing-page", "Landing page", "Business", ["app", "product", "launch", "startup", "marketing"], ["#0f766e", "#f97316", "#dcf7f3", "#123b3a", "#ffffff"], "split", "Know your daily sales"],
  ["fitness", "Gym and fitness", "Health and fitness", ["gym", "yoga", "coach", "sport", "classes"], ["#ea580c", "#0ea5e9", "#1f2440", "#0f1222", "#0f1222"], "split", "Get stronger"],
  ["portfolio", "Portfolio", "Portfolio and resume", ["designer", "photographer", "freelancer", "work", "creative"], ["#e11d48", "#7c3aed", "#ffe4ea", "#2a1530", "#ffffff"], "split", "Brands people remember"],
  ["cv", "Resume website", "Portfolio and resume", ["cv", "resume", "job", "career", "personal"], ["#334155", "#0ea5e9", "#e6edf5", "#0f172a", "#ffffff"], "split", "Hi, I'm Ayesha"],
  ["link-in-bio", "Link in bio", "Portfolio and resume", ["links", "social", "instagram", "bio", "creator"], ["#db2777", "#f59e0b", "#fce7f3", "#3b0d24", "#ffffff"], "bio", "Zara Bakes"],
  ["event", "Event", "Events and weddings", ["conference", "workshop", "festival", "tickets", "schedule"], ["#5b4cf0", "#ff7a59", "#ecebff", "#1f2440", "#ffffff"], "cover", "Makers Fest 2027"],
  ["wedding", "Wedding", "Events and weddings", ["wedding", "rsvp", "nikah", "invitation", "marriage"], ["#9d174d", "#d4a017", "#fce7f3", "#3b0d24", "#fffaf5"], "cover", "Sana and Omar"],
  ["academy", "School and courses", "Education", ["tuition", "academy", "school", "course", "teacher"], ["#0f9488", "#f59e0b", "#dcf7f3", "#123b3a", "#ffffff"], "split", "Better grades"],
  ["charity", "Charity", "Charity and community", ["nonprofit", "ngo", "donate", "volunteer", "cause"], ["#0369a1", "#16a34a", "#e0f2fe", "#0c2a3d", "#ffffff"], "split", "Clean water for all"],
  ["coming-soon", "Coming soon", "Business", ["launch", "soon", "waitlist", "opening"], ["#7c3aed", "#f472b6", "#ede9fe", "#2e1065", "#ffffff"], "cover", "Coming soon"],
];

/* ------------------------------------------------------------------ generator: palettes × layouts × themes */
// [id, name, main, accent, light, dark, dark mode?]
const PALETTES = [
  ["p01", "Ocean", "#2563eb", "#f59e0b", "#e3edff", "#111827"], ["p02", "Spice", "#c2410c", "#eab308", "#fff1e0", "#3b2314"],
  ["p03", "Rose", "#e11d48", "#7c3aed", "#ffe4ea", "#2a1530"], ["p04", "Lagoon", "#0f9488", "#f59e0b", "#dcf7f3", "#123b3a"],
  ["p05", "Forest", "#15803d", "#eab308", "#e3f6e8", "#132a1c"], ["p06", "Violet", "#5b4cf0", "#ff7a59", "#ecebff", "#1f2440"],
  ["p07", "Slate", "#334155", "#0ea5e9", "#e6edf5", "#0f172a"], ["p08", "Berry", "#9d174d", "#d4a017", "#fce7f3", "#3b0d24"],
  ["p09", "Sky", "#0369a1", "#16a34a", "#e0f2fe", "#0c2a3d"], ["p10", "Lilac", "#7c3aed", "#f472b6", "#ede9fe", "#2e1065"],
  ["p11", "Honey", "#b45309", "#0f766e", "#fef3c7", "#3a2a0a"], ["p12", "Candy", "#db2777", "#0ea5e9", "#fce7f3", "#3b0d24"],
  ["p13", "Night", "#f97316", "#38bdf8", "#1b2036", "#0f1222", true], ["p14", "Ink", "#111827", "#f59e0b", "#f3f4f6", "#111827"],
  ["p15", "Mint", "#059669", "#6366f1", "#d1fae5", "#064e3b"], ["p16", "Midnight", "#a78bfa", "#facc15", "#1e1b4b", "#0b0a1f", true],
];
const FONT_PAIRS = [["sans", "sans"], ["serif", "sans"], ["cambria", "calibri"], ["calibri", "calibri"], ["serif", "serif"]];
// Base layouts: [id, name, hero style, menu bar?, blocks after the hero, tinted block indexes, corners, font pair]
const LAYOUTS = [
  ["classic", "Classic", "split", true, ["features", "about", "testimonials", "contact", "footer"], [0, 3], "soft", 0],
  ["cover", "Bold cover", "cover", true, ["about", "gallery", "testimonials", "map", "footer"], [0, 3], "round", 1],
  ["centered", "Centred", "center", true, ["features", "timeline", "faq", "contact", "footer"], [1, 3], "soft", 3],
  ["services", "Services", "split", true, ["features", "timeline", "pricing", "testimonials", "faq", "contact", "footer"], [0, 2, 5], "soft", 0],
  ["showcase", "Showcase", "split", true, ["gallery", "about", "testimonials", "contact", "footer"], [1, 3], "sharp", 2],
  ["story", "Story", "center", true, ["about", "timeline", "team", "contact", "footer"], [0, 2], "round", 4],
  ["pricing", "Price list", "split", true, ["pricing", "features", "faq", "contact", "footer"], [0, 2], "soft", 0],
  ["catalogue", "Catalogue", "split", true, ["products", "features", "testimonials", "contact", "footer"], [1, 3], "round", 3],
  ["team", "Meet the team", "cover", true, ["team", "features", "testimonials", "contact", "footer"], [0, 2], "soft", 1],
  ["visit", "Visit us", "cover", true, ["about", "pricing", "map", "contact", "footer"], [1, 3], "round", 2],
  ["minimal", "Minimal", "center", false, ["about", "contact", "footer"], [], "sharp", 4],
  ["launch", "Launch", "split", true, ["features", "pricing", "faq", "contact", "footer"], [0, 2], "round", 3],
  ["journey", "Timeline", "split", true, ["timeline", "about", "gallery", "contact", "footer"], [0, 2], "soft", 1],
  ["gallery", "Gallery first", "center", true, ["gallery", "about", "contact", "footer"], [0, 2], "sharp", 2],
  ["onepage", "One page", "split", true, ["about", "features", "gallery", "pricing", "testimonials", "faq", "map", "contact", "footer"], [1, 3, 5, 7], "soft", 0],
  ["links", "Link page", "center", false, ["features", "gallery", "footer"], [0], "round", 3],
  ["reviews", "Reviews first", "cover", true, ["testimonials", "features", "pricing", "contact", "footer"], [0, 2], "soft", 0],
  ["contact", "Contact first", "split", true, ["contact", "about", "map", "footer"], [0], "sharp", 2],
  // Round 2: layouts built on the new section designs ("type:variant") and hero styles, plus multi-page sites
  // ([page name, blocks] after the font pair; each extra page gets the menu bar, a page heading and the footer).
  ["magazine", "Magazine", "minimal", true, ["features:list", "gallery:mosaic", "testimonials:single", "contact", "footer"], [1], "sharp", 4],
  ["banner", "Wide banner", "banner", true, ["about", "features:numbers", "pricing", "contact", "footer"], [1, 3], "soft", 1],
  ["photocard", "Photo card", "card", true, ["features", "team", "faq", "contact", "footer"], [0, 2], "round", 2],
  ["leftpic", "Picture left", "left", true, ["about", "products", "testimonials:single", "contact", "footer"], [1, 3], "soft", 3],
  ["mosaic", "Mosaic", "center", true, ["gallery:mosaic", "about", "contact", "footer"], [1], "sharp", 1],
  ["steps", "Steps", "split", true, ["features:numbers", "timeline", "faq", "contact", "footer"], [0, 2], "round", 0],
  ["bigquote", "Big quote", "cover", true, ["testimonials:single", "features:list", "pricing", "contact", "footer"], [0, 2], "soft", 4],
  ["editorial", "Editorial", "minimal", true, ["about", "gallery", "team", "contact", "footer"], [0, 2], "sharp", 1],
  ["studio", "Studio", "card", true, ["gallery:mosaic", "testimonials", "contact", "footer"], [0, 2], "soft", 2],
  ["brochure", "Brochure", "banner", true, ["features:list", "about", "map", "contact", "footer"], [0, 2], "round", 3],
  ["pitch", "Pitch", "left", true, ["features:numbers", "pricing", "testimonials:single", "faq", "contact", "footer"], [0, 2, 4], "soft", 0],
  ["multi", "Three pages", "split", true, ["features", "testimonials", "contact", "footer"], [0, 2], "soft", 0, [["About", ["about", "team"]], ["Services", ["pricing", "faq"]]]],
  ["multifolio", "Portfolio pages", "card", true, ["gallery:mosaic", "testimonials:single", "footer"], [0], "round", 2, [["Work", ["gallery", "about"]], ["Contact", ["contact", "map"]]]],
  ["multishop", "Shop pages", "banner", true, ["products", "features:list", "footer"], [1], "soft", 3, [["About", ["about", "timeline"]], ["Help", ["faq", "contact"]]]],
];
const W = "923000000000";
// Content themes (own text). f = feature cards [icon, title, text]; p = packages [name, price, per, text, features];
// q = reviews [quote, name, place]; a = FAQ [q, a]; s = steps [when, title, text]; t = team [name, role];
// g = gallery captions; pr = products [name, price, kind]; art = illustration kind.
const THEMES = [
  { id: "repairs", label: "Home repairs", section: "Business", tags: ["services", "plumber", "electrician", "ac"], art: "work", brand: "FixRight", eye: "Same-day visits", title: "Home repairs done right, the same day", text: "AC service, plumbing and electrical work by trained technicians with fixed prices.", cta: "Book a visit",
    about: "Started by two brothers in 2018, FixRight now has 20 technicians and thousands of happy homes.", f: [["shield", "Verified team", "Every technician is trained and carries an ID card."], ["clock", "On time", "We arrive in your time slot."], ["check", "Fixed prices", "You see the price before we start."], ["award", "30-day warranty", "Same problem again? We fix it free."]],
    p: [["AC service", "Rs 2,500", "/ unit", "Deep clean and gas check.", ["Indoor and outdoor wash", "Cooling test"]], ["Home check-up", "Rs 6,000", "/ visit", "Most popular.", ["Wiring check", "Leak check", "Small fixes"]], ["Plumbing visit", "Rs 1,500", "/ visit", "Leaks and taps.", ["Diagnosis", "Tap repair"]]],
    q: [["Cooling again within an hour. Fair price.", "Hina A.", "Lahore"], ["They found a leak others missed.", "Bilal K.", "Karachi"], ["Booked at 9, fixed by noon.", "Saima R.", "Multan"]], a: [["Which areas do you cover?", "All parts of the city, seven days a week."], ["How do I pay?", "Cash or bank transfer after the work is done."], ["Do you bring parts?", "Yes, at market price with a receipt."]],
    s: [["Step 1", "Book a slot", "On WhatsApp or the form."], ["Step 2", "We visit", "A technician arrives on time."], ["Step 3", "Pay when happy", "Only after the job is done."]], t: [["Usman", "Head technician"], ["Faisal", "AC expert"], ["Nadia", "Customer care"]], g: ["AC service", "Kitchen tap", "New wiring", "Water heater", "Ceiling fan", "Bathroom"], pr: [["Tool kit", "Rs 3,500", "bag"], ["Filter pack", "Rs 900", "bottle"], ["Smart plug", "Rs 1,800", "mug"]] },
  { id: "restaurant", label: "Restaurant", section: "Food and drink", tags: ["food", "menu", "dinner", "booking"], art: "food", brand: "Ember Grill", eye: "Open daily · 12pm to midnight", title: "Charcoal grills and warm family dinners", text: "Slow-cooked food, fresh bread from the oven and a table waiting for you.", cta: "Book a table",
    about: "Ember Grill began as a small family kitchen. We still grind our spices every morning and cook every dish to order.", f: [["leaf", "Fresh every day", "Meat and vegetables bought each morning."], ["heart", "Family recipes", "Dishes passed down for three generations."], ["truck", "Home delivery", "Hot food within 5 km."], ["star", "Party hall", "Room for 60 guests upstairs."]],
    p: [["Dinner for two", "Rs 3,200", "", "A quiet night out.", ["Grill platter", "Bread and salad", "2 drinks"]], ["Family feast", "Rs 7,900", "", "Feeds 4 to 5.", ["Mixed grill", "Rice platter", "Dessert"]], ["Lunch deal", "Rs 1,200", "", "Weekdays 12 to 4.", ["Main dish", "Bread", "Drink"]]],
    q: [["The best grill we have had in years.", "Ahmed and Sana", "Family dinner"], ["Warm staff and great value deals.", "Mariam T.", "Food blogger"], ["Our office lunch spot every Friday.", "Kamran J.", "Regular guest"]], a: [["Do you take bookings?", "Yes, send the date, time and number of guests."], ["Is everything halal?", "Yes, all our meat is halal."], ["Is there parking?", "Free parking in front."]],
    s: [["12pm", "Lunch opens", "Weekday lunch deals."], ["7pm", "Grill starts", "Fresh from the coals."], ["Midnight", "Last orders", "Dessert and tea."]], t: [["Chef Rauf", "Head chef"], ["Amna", "Pastry"], ["Bilal", "Front of house"]], g: ["Mixed grill", "Fresh bread", "Rice platter", "Dessert", "Mint sauce", "Tea"], pr: [["Spice box", "Rs 1,500", "bottle"], ["Gift card", "Rs 5,000", "book"], ["Ember mug", "Rs 900", "mug"]] },
  { id: "cafe", label: "Cafe and bakery", section: "Food and drink", tags: ["coffee", "bakery", "cakes", "tea"], art: "food", brand: "Morning Crumb", eye: "Fresh bakes from 8am", title: "Good coffee and fresh bakes every morning", text: "Croissants, cakes and slow coffee in a quiet corner of the city.", cta: "Order a cake",
    about: "We bake everything in our own kitchen before sunrise, in small batches, with real butter.", f: [["cup", "Slow coffee", "Beans roasted in small batches."], ["heart", "Baked today", "Nothing frozen, ever."], ["leaf", "Quiet corner", "Free Wi-Fi and big tables."], ["cart", "Cakes to order", "Birthday cakes in two days."]],
    p: [["Coffee and croissant", "Rs 850", "", "Morning deal.", ["Any coffee", "Butter croissant"]], ["Birthday cake", "Rs 3,500", "/ kg", "Made to order.", ["Your message", "Candles", "Box"]], ["Tea for two", "Rs 1,400", "", "Afternoon treat.", ["Pot of tea", "Two cakes"]]],
    q: [["Best croissant in town, still warm.", "Zainab H.", "Regular"], ["The birthday cake was beautiful.", "Omar F.", "Customer"], ["My favourite place to work.", "Sara M.", "Writer"]], a: [["Do you deliver?", "Yes, cakes and boxes within the city."], ["Any sugar-free options?", "Yes, ask for the daily list."], ["Can I book a table?", "Weekends only, on WhatsApp."]],
    s: [["5am", "Baking starts", "Bread and pastry."], ["8am", "Doors open", "Coffee is ready."], ["6pm", "Last cakes", "Half price after six."]], t: [["Mehak", "Baker"], ["Hamza", "Barista"], ["Rida", "Cakes"]], g: ["Croissants", "Latte", "Cheesecake", "Bread", "Cookies", "Tea"], pr: [["Coffee beans", "Rs 1,900", "bag"], ["Cookie box", "Rs 1,200", "book"], ["Cafe mug", "Rs 950", "mug"]] },
  { id: "clinic", label: "Clinic", section: "Health and fitness", tags: ["doctor", "health", "dental", "medical"], art: "work", brand: "CarePoint Clinic", eye: "Family doctors · open 7 days", title: "Caring doctors for the whole family", text: "General check-ups, children's health and dental care with short waiting times.", cta: "Book an appointment",
    about: "CarePoint is a small family clinic with experienced doctors who take time to listen.", f: [["heart", "Family care", "Doctors for all ages."], ["clock", "Short waits", "Most patients seen in 15 minutes."], ["shield", "Clean and safe", "Strict hygiene in every room."], ["phone", "Online booking", "Pick a time on WhatsApp."]],
    p: [["General check-up", "Rs 2,000", "", "With a doctor.", ["Blood pressure", "Advice"]], ["Child health", "Rs 2,500", "", "For under 12s.", ["Growth check", "Vaccines plan"]], ["Dental clean", "Rs 4,000", "", "With polish.", ["Scale and polish", "X-ray if needed"]]],
    q: [["The doctor explained everything calmly.", "Farah N.", "Patient"], ["Short wait and friendly staff.", "Tariq S.", "Patient"], ["Great with my children.", "Nida A.", "Mother of two"]], a: [["Do I need an appointment?", "Walk-ins are welcome, bookings are faster."], ["Do you take insurance?", "Yes, most panels are accepted."], ["Is there a lady doctor?", "Yes, every day."]],
    s: [["Step 1", "Book a time", "On WhatsApp or by phone."], ["Step 2", "See the doctor", "Bring old reports."], ["Step 3", "Follow up", "We call after a week."]], t: [["Dr. Amina", "Family doctor"], ["Dr. Kashif", "Children"], ["Dr. Saba", "Dentist"]], g: ["Reception", "Check-up room", "Dental chair", "Kids corner", "Pharmacy", "Lab"], pr: [["First aid kit", "Rs 2,200", "bag"], ["Vitamins", "Rs 1,100", "bottle"], ["Health book", "Rs 600", "book"]] },
  { id: "academy", label: "Academy", section: "Education", tags: ["school", "tuition", "courses", "teacher"], art: "study", brand: "Bright Minds Academy", eye: "Admissions open", title: "Better grades with small classes", text: "Maths, science and English tuition in groups of 12 with weekly tests.", cta: "Book a free class",
    about: "Our teachers have taught for over ten years. Parents get a report every month.", f: [["book", "Small classes", "12 students at most."], ["check", "Weekly tests", "Progress you can see."], ["chat", "Parent reports", "Monthly meetings."], ["award", "Top results", "9 in 10 improve a grade."]],
    p: [["One subject", "Rs 4,000", "/ month", "Three classes a week.", ["Notes", "Weekly test"]], ["Three subjects", "Rs 10,000", "/ month", "Best value.", ["Notes", "Tests", "Parent report"]], ["Exam crash course", "Rs 8,000", "", "Six weeks.", ["Past papers", "Mock exams"]]],
    q: [["My son went from C to A in maths.", "Mrs. Rehman", "Parent"], ["Teachers really care.", "Ali H.", "Student"], ["Clear notes and fair fees.", "Mr. Qureshi", "Parent"]], a: [["Which classes?", "Grades 6 to 12."], ["Online classes?", "Yes, on weekends."], ["Free trial?", "Yes, one free class."]],
    s: [["Week 1", "Placement test", "We find the right group."], ["Weekly", "Classes and tests", "Three days a week."], ["Monthly", "Parent meeting", "Report and plan."]], t: [["Sir Imran", "Maths"], ["Miss Hira", "English"], ["Sir Waqas", "Science"]], g: ["Classroom", "Library", "Science lab", "Prize day", "Study hall", "Sports"], pr: [["Notes pack", "Rs 1,500", "book"], ["Past papers", "Rs 900", "book"], ["Academy bag", "Rs 1,800", "bag"]] },
  { id: "boutique", label: "Boutique", section: "Shops", tags: ["fashion", "clothes", "shop", "handmade"], art: "shop", brand: "Thread and Bloom", eye: "New collection", title: "Handmade clothes with a modern touch", text: "Small batches, soft fabrics and hand embroidery. Order on WhatsApp.", cta: "Shop now",
    about: "Every piece is stitched by local artisans and checked by hand before it reaches you.", f: [["heart", "Handmade", "Made by local artisans."], ["truck", "Free delivery", "On orders over Rs 5,000."], ["check", "Easy exchange", "Within 7 days."], ["star", "Gift wrap", "Free on request."]],
    p: [["Ready to wear", "Rs 4,500", "", "Standard sizes.", ["S to XL", "Ships in 2 days"]], ["Made to measure", "Rs 7,500", "", "Your size.", ["Custom fit", "Ships in 7 days"]], ["Bridal", "Rs 45,000", "", "By appointment.", ["Design meeting", "Two fittings"]]],
    q: [["The embroidery is beautiful.", "Hira K.", "Customer"], ["Fast delivery and lovely packing.", "Sana M.", "Customer"], ["Fits perfectly.", "Aleena R.", "Customer"]], a: [["How do I order?", "Tap Order and send us a message."], ["Cash on delivery?", "Yes, everywhere."], ["Do you ship abroad?", "Yes, ask for rates."]],
    s: [["Day 1", "Order", "Send your size."], ["Day 2", "Stitching", "Checked by hand."], ["Day 4", "Delivery", "Pay on delivery."]], t: [["Saima", "Designer"], ["Rukhsana", "Embroidery"], ["Adeel", "Orders"]], g: ["Summer lawn", "Silk scarf", "Kurta", "Shawl", "Bridal", "Kids"], pr: [["Silk scarf", "Rs 2,400", "scarf"], ["Cotton shirt", "Rs 3,200", "shirt"], ["Tote bag", "Rs 1,600", "bag"]] },
  { id: "designer", label: "Designer portfolio", section: "Portfolio and resume", tags: ["portfolio", "designer", "freelancer", "creative"], art: "portrait", brand: "Maya Studio", eye: "Graphic designer", title: "I design brands people remember", text: "Logos, packaging and social posts for small businesses that want to stand out.", cta: "Start a project",
    about: "I have worked with 60 small brands in eight years. I keep things simple, bold and useful.", f: [["star", "Brand identity", "Logo, colours and fonts."], ["camera", "Social posts", "Templates your team can reuse."], ["cart", "Packaging", "Boxes and labels that sell."], ["code", "Websites", "Simple one-page sites."]],
    p: [["Logo", "Rs 25,000", "", "Two rounds.", ["3 ideas", "Final files"]], ["Brand kit", "Rs 60,000", "", "Most popular.", ["Logo", "Colours and fonts", "Templates"]], ["Monthly posts", "Rs 30,000", "/ month", "12 posts.", ["Designs", "Captions help"]]],
    q: [["Maya understood our brand at once.", "Owner", "Tea shop"], ["Fast, clear and creative.", "Founder", "Skincare brand"], ["Our sales went up after the new packaging.", "Manager", "Snack company"]], a: [["How long does a logo take?", "About two weeks."], ["Do you work remotely?", "Yes, with clients everywhere."], ["What do I get?", "All files in print and web sizes."]],
    s: [["Week 1", "Brief and ideas", "We talk and I sketch."], ["Week 2", "Design", "Two rounds of changes."], ["Week 3", "Hand over", "All files, ready to use."]], t: [["Maya", "Designer"], ["Zoya", "Illustrator"], ["Ali", "Web"]], g: ["Tea brand", "Bakery box", "Poster", "App icon", "Menu", "Label"], pr: [["Poster print", "Rs 2,500", "book"], ["Sticker pack", "Rs 600", "candle"], ["Mug design", "Rs 1,200", "mug"]] },
  { id: "photographer", label: "Photographer", section: "Portfolio and resume", tags: ["photography", "photos", "portfolio", "events"], art: "portrait", brand: "Lens and Light", eye: "Weddings · portraits · products", title: "Photos you will keep for a lifetime", text: "Natural, honest photography for weddings, families and small brands.", cta: "Check my dates",
    about: "I love quiet moments and real smiles. Every gallery is edited by hand.", f: [["camera", "Weddings", "Full-day coverage."], ["heart", "Families", "Relaxed outdoor shoots."], ["cart", "Products", "Clean shots that sell."], ["clock", "Fast delivery", "Previews in 48 hours."]],
    p: [["Portrait session", "Rs 15,000", "", "One hour.", ["30 edited photos", "Online gallery"]], ["Wedding day", "Rs 120,000", "", "Full day.", ["600 photos", "Album", "Second shooter"]], ["Product shoot", "Rs 20,000", "", "Up to 20 items.", ["White background", "Lifestyle shots"]]],
    q: [["Every photo made us cry happy tears.", "Ayesha and Hamid", "Wedding"], ["Our menu photos look amazing.", "Owner", "Cafe"], ["So easy with the kids.", "Rabia", "Family shoot"]], a: [["Do you travel?", "Yes, anywhere in the country."], ["When do we get photos?", "Previews in 48 hours, all in 3 weeks."], ["Can we print them?", "Yes, full-size files."]],
    s: [["Before", "Plan together", "Places and times."], ["The day", "The shoot", "Relaxed and natural."], ["After", "Your gallery", "Edited by hand."]], t: [["Danish", "Photographer"], ["Iqra", "Second shooter"], ["Fahad", "Editor"]], g: ["Wedding", "Portrait", "Family", "Product", "Street", "Landscape"], pr: [["Photo print", "Rs 1,500", "book"], ["Album", "Rs 12,000", "book"], ["Frame", "Rs 3,000", "candle"]] },
  { id: "conference", label: "Conference", section: "Events and weddings", tags: ["event", "conference", "tickets", "speakers"], art: "event", brand: "Build Summit", eye: "14 March 2027 · Expo Hall", title: "One day of ideas for people who build", text: "Talks, workshops and a market of local makers. Come to learn and meet.", cta: "Get a ticket",
    about: "Build Summit brings together founders, makers and students for a day of practical talks.", f: [["chat", "20 talks", "Short and practical."], ["bolt", "8 workshops", "Hands-on sessions."], ["star", "Maker market", "40 local stalls."], ["heart", "Meet people", "Lunch and evening meet-up."]],
    p: [["Student", "Rs 1,500", "", "With student card.", ["All talks", "Lunch"]], ["Standard", "Rs 4,000", "", "Most popular.", ["All talks", "Workshops", "Lunch"]], ["Team of 5", "Rs 16,000", "", "Save 20%.", ["5 passes", "Reserved table"]]],
    q: [["The best event I went to last year.", "Hassan", "Founder"], ["Practical talks, great people.", "Mahnoor", "Designer"], ["Our team learned so much.", "Kashif", "Team lead"]], a: [["Is lunch included?", "Yes, for all ticket types."], ["Can I get a refund?", "Up to 7 days before."], ["Is there parking?", "Yes, at Gate 2."]],
    s: [["9:00", "Doors open", "Tea and badges."], ["10:00", "Talks", "Main hall."], ["14:00", "Workshops", "Rooms 1 to 4."]], t: [["Sana Javed", "Speaker"], ["Omar Khan", "Speaker"], ["Lina Shah", "Host"]], g: ["Main hall", "Workshop", "Market", "Panel", "Lunch", "Meet-up"], pr: [["Summit tee", "Rs 1,800", "shirt"], ["Tote bag", "Rs 1,200", "bag"], ["Notebook", "Rs 700", "book"]] },
  { id: "realestate", label: "Real estate", section: "Business", tags: ["property", "homes", "agent", "rent"], art: "map", brand: "Keystone Homes", eye: "Homes to buy and rent", title: "Find a home that fits your family", text: "Checked listings, honest advice and help with every paper.", cta: "Book a viewing",
    about: "Keystone has helped families buy and rent homes for 12 years. We check every listing ourselves.", f: [["shield", "Checked listings", "We visit every home."], ["pin", "Good areas", "Near schools and markets."], ["check", "Clear papers", "We help with documents."], ["phone", "Quick viewings", "Same-week visits."]],
    p: [["Rent help", "1 month", "", "Our fee.", ["Viewings", "Agreement"]], ["Buy help", "1%", "", "Of the price.", ["Viewings", "Papers", "Transfer"]], ["Sell with us", "1%", "", "When sold.", ["Photos", "Listing", "Viewings"]]],
    q: [["Found our home in two weeks.", "The Siddiquis", "Buyers"], ["Honest and patient agent.", "Rameez", "Tenant"], ["Sold quickly at a fair price.", "Mrs. Aslam", "Seller"]], a: [["Do you charge for viewings?", "No, viewings are free."], ["Which areas?", "Most of the city."], ["Can you help with loans?", "We can connect you to banks."]],
    s: [["Step 1", "Tell us your needs", "Budget and area."], ["Step 2", "View homes", "We arrange visits."], ["Step 3", "Move in", "We handle the papers."]], t: [["Adnan", "Agent"], ["Fatima", "Agent"], ["Zubair", "Legal help"]], g: ["Family house", "Apartment", "Garden", "Kitchen", "Living room", "Street"], pr: [["Home guide", "Free", "book"], ["Moving box set", "Rs 2,500", "bag"], ["Key ring", "Rs 300", "candle"]] },
  { id: "travel", label: "Travel agency", section: "Travel", tags: ["travel", "tours", "trips", "holiday"], art: "map", brand: "Northbound Tours", eye: "Small group trips", title: "Trips to the mountains, planned for you", text: "Hotels, transport and guides in one simple price. Leave every Friday.", cta: "Plan my trip",
    about: "Northbound has run safe, friendly tours to the northern valleys since 2015.", f: [["truck", "Comfortable travel", "Clean coasters with drivers."], ["shield", "Safe trips", "Trained guides and first aid."], ["star", "Good hotels", "Checked rooms with heating."], ["heart", "Family friendly", "Kids under 5 travel free."]],
    p: [["Weekend trip", "Rs 28,000", "/ person", "3 days.", ["Hotel", "Transport", "Breakfast"]], ["Valley tour", "Rs 55,000", "/ person", "6 days.", ["Hotels", "Guide", "All meals"]], ["Honeymoon", "Rs 140,000", "/ couple", "5 days.", ["Private car", "Lake view room"]]],
    q: [["Everything was taken care of.", "Fahad and Maria", "Honeymoon"], ["Our kids loved it.", "Mr. Tariq", "Family trip"], ["Great guide, great food.", "Sobia", "Valley tour"]], a: [["What should I pack?", "We send a packing list."], ["Can I pay in parts?", "Yes, 50% to book."], ["Are trips safe?", "Yes, we check routes daily."]],
    s: [["Day 1", "Leave the city", "Morning pick-up."], ["Day 2", "Lakes and valleys", "Easy walks."], ["Day 3", "Back home", "Evening drop-off."]], t: [["Waleed", "Lead guide"], ["Mahira", "Trip planner"], ["Jawad", "Driver"]], g: ["Lake", "Mountains", "Hotel", "Campfire", "Valley", "Waterfall"], pr: [["Travel bag", "Rs 3,500", "bag"], ["Water bottle", "Rs 900", "bottle"], ["Trip guide", "Rs 500", "book"]] },
  { id: "startup", label: "Tech startup", section: "Business", tags: ["app", "software", "saas", "startup"], art: "work", brand: "Ledgerly", eye: "New · for small teams", title: "Invoices and payments in one simple app", text: "Send invoices, get paid faster and see your cash at a glance.", cta: "Start free",
    about: "Ledgerly is built by a small team that ran shops and knows the pain of chasing payments.", f: [["bolt", "Fast invoices", "Send one in a minute."], ["chat", "Reminders", "Polite automatic follow-ups."], ["shield", "Secure", "Encrypted and backed up."], ["check", "Reports", "Cash flow on one screen."]],
    p: [["Free", "Rs 0", "/ month", "Up to 10 invoices.", ["1 user", "Email support"]], ["Team", "Rs 2,500", "/ month", "Most popular.", ["5 users", "Reminders", "Reports"]], ["Business", "Rs 6,000", "/ month", "Growing teams.", ["Unlimited users", "Priority help"]]],
    q: [["We get paid twice as fast now.", "Owner", "Print shop"], ["Simple enough for my whole team.", "Manager", "Agency"], ["The reports save me hours.", "Accountant", "Retail"]], a: [["Is there a free plan?", "Yes, free forever for small use."], ["Can I cancel?", "Any time, no fees."], ["Is my data safe?", "Yes, encrypted and backed up daily."]],
    s: [["Minute 1", "Sign up", "No card needed."], ["Minute 5", "Send an invoice", "From your phone."], ["Day 2", "Get paid", "Reminders do the rest."]], t: [["Hamza", "Founder"], ["Areeba", "Product"], ["Saad", "Engineering"]], g: ["Dashboard", "Invoice", "Reports", "Mobile app", "Reminders", "Team"], pr: [["Team plan", "Rs 2,500", "book"], ["Hoodie", "Rs 3,500", "shirt"], ["Mug", "Rs 900", "mug"]] },
  { id: "salon", label: "Beauty salon", section: "Health and fitness", tags: ["salon", "beauty", "spa", "hair"], art: "portrait", brand: "Glow Room", eye: "Hair · skin · nails", title: "Relax, refresh and glow", text: "Hair, skin and nail care by friendly experts in a calm space.", cta: "Book a slot",
    about: "Glow Room is a calm, clean salon where every visit feels like a small holiday.", f: [["star", "Hair styling", "Cuts, colour and care."], ["heart", "Facials", "For every skin type."], ["leaf", "Natural products", "Gentle on skin."], ["clock", "No long waits", "Book a time slot."]],
    p: [["Haircut", "Rs 2,500", "", "With wash and style.", ["Consultation", "Blow dry"]], ["Glow facial", "Rs 4,500", "", "Most popular.", ["Cleanse", "Mask", "Massage"]], ["Bridal package", "Rs 35,000", "", "Full day.", ["Hair", "Makeup", "Nails"]]],
    q: [["My skin has never looked better.", "Areeba", "Client"], ["Calm, clean and friendly.", "Nimra", "Client"], ["Perfect bridal look.", "Hafsa", "Bride"]], a: [["Do I need to book?", "Booking is best, walk-ins if free."], ["Which products?", "Gentle, natural brands."], ["Bridal trials?", "Yes, one trial included."]],
    s: [["Step 1", "Book", "Pick a time on WhatsApp."], ["Step 2", "Relax", "Tea while you wait."], ["Step 3", "Glow", "Leave refreshed."]], t: [["Sadia", "Hair"], ["Mahnoor", "Skin"], ["Kiran", "Nails"]], g: ["Hair", "Facial", "Nails", "Makeup", "Spa room", "Products"], pr: [["Face oil", "Rs 2,200", "bottle"], ["Candle", "Rs 1,500", "candle"], ["Gift card", "Rs 5,000", "book"]] },
  { id: "consultant", label: "Consultant", section: "Business", tags: ["law", "finance", "tax", "advice"], art: "work", brand: "Clearpath Advisors", eye: "Tax · accounts · company setup", title: "Clear advice for your business money", text: "Tax returns, bookkeeping and company registration, explained in plain words.", cta: "Book a free call",
    about: "We are a small team of chartered accountants helping founders and families since 2012.", f: [["check", "Tax returns", "Filed on time."], ["book", "Bookkeeping", "Monthly accounts."], ["shield", "Company setup", "Registration and papers."], ["chat", "Plain advice", "No jargon."]],
    p: [["Personal tax", "Rs 8,000", "/ year", "Salaried people.", ["Return filing", "Advice call"]], ["Small business", "Rs 15,000", "/ month", "Most popular.", ["Bookkeeping", "Tax filing", "Reports"]], ["Company setup", "Rs 45,000", "", "One time.", ["Registration", "Bank account help"]]],
    q: [["They made tax simple for us.", "Founder", "Food startup"], ["Always on time.", "Owner", "Pharmacy"], ["Clear and patient advice.", "Doctor", "Private practice"]], a: [["Do you work online?", "Yes, fully online if you like."], ["What do I need?", "We send a simple checklist."], ["Fixed fees?", "Yes, agreed before we start."]],
    s: [["Step 1", "Free call", "We understand your needs."], ["Step 2", "Fixed quote", "No surprises."], ["Step 3", "We handle it", "You stay informed."]], t: [["Rizwan", "Partner"], ["Mehreen", "Tax"], ["Taimur", "Accounts"]], g: ["Office", "Meeting", "Reports", "Team", "Workshop", "Clients"], pr: [["Tax guide", "Free", "book"], ["Planner", "Rs 1,200", "book"], ["Office mug", "Rs 800", "mug"]] },
  { id: "musician", label: "Musician", section: "Portfolio and resume", tags: ["music", "band", "singer", "shows"], art: "event", brand: "The Monsoon Band", eye: "Live music · new album out", title: "Songs for rainy evenings", text: "Live shows, new songs and bookings for weddings and events.", cta: "Book the band",
    about: "Four friends who started playing in a university hall and never stopped.", f: [["star", "Live shows", "Clubs, cafes and festivals."], ["heart", "Weddings", "Mehndi and reception sets."], ["bolt", "New album", "Out on all music apps."], ["chat", "Workshops", "Guitar and singing classes."]],
    p: [["Acoustic set", "Rs 60,000", "", "1 hour, 2 players.", ["Sound check", "Own speakers"]], ["Full band", "Rs 150,000", "", "2 hours.", ["4 players", "Lights"]], ["Wedding night", "Rs 220,000", "", "3 hours.", ["Full band", "Requests"]]],
    q: [["They made our mehndi magical.", "Hania", "Bride"], ["Amazing live energy.", "Organizer", "Music festival"], ["Booked them twice already.", "Owner", "Cafe"]], a: [["Do you travel?", "Yes, across the country."], ["Can we request songs?", "Yes, send us a list."], ["Do you bring sound?", "Yes, for up to 300 guests."]],
    s: [["Friday", "Cafe night", "Acoustic set."], ["Saturday", "Festival", "Main stage."], ["Sunday", "Workshop", "Guitar basics."]], t: [["Saad", "Vocals"], ["Mariam", "Keys"], ["Junaid", "Drums"]], g: ["Live", "Studio", "Festival", "Rehearsal", "Album", "Crowd"], pr: [["Band tee", "Rs 1,800", "shirt"], ["Album CD", "Rs 1,200", "book"], ["Tote bag", "Rs 1,000", "bag"]] },
];
const BY = (list) => Object.fromEntries(list.map((x) => [x[0], x]));
const PAL = BY(PALETTES), LAY = BY(LAYOUTS), THM = Object.fromEntries(THEMES.map((t) => [t.id, t]));
const NAV = { features: "Services", about: "About", gallery: "Gallery", pricing: "Prices", products: "Shop", testimonials: "Reviews", faq: "FAQ", team: "Team", timeline: "How it works", contact: "Contact", map: "Visit" };
const artPal = (p) => ({ a: p[2], b: p[3], c: p[4], d: p[5], bg: p[6] ? "#151a30" : p[4] });
const seedOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const typeOf = (spec) => String(spec).split(":")[0];
function buildGenerated(lid, pid, tid) {
  const l = LAY[lid], p = PAL[pid], t = THM[tid];
  const [, , hero, header, specs, tinted, corners, fp, extra] = l;
  const blocks = specs.map(typeOf);
  const ap = artPal(p), seed = seedOf(lid + pid + tid) % 997, dark = !!p[6];
  const [hf, bf] = FONT_PAIRS[fp];
  const theme = { primary: p[2], accent: p[3], headingFont: hf, bodyFont: bf, corners, ...(dark ? { mode: "dark", bg: "#0f1222", text: "#e9ebf5" } : {}) };
  const href = (type) => "#" + (BLOCK_TYPES[type]?.anchor || type);
  const second = blocks.find((b) => NAV[b] && b !== "contact");
  const allTypes = [...blocks, ...(Array.isArray(extra) ? extra.flatMap(([, list]) => list.map(typeOf)) : [])];
  const cta = allTypes.includes("contact") ? "#contact" : allTypes.includes("map") ? href("map") : second ? href(second) : "#top";
  const noPic = hero === "center" || hero === "minimal";
  const make = (spec, i) => {
    const [type, variant] = String(spec).split(":");
    const style = { ...(tinted.includes(i) ? { bg: i % 2 ? "tint" : "alt" } : {}), ...(variant ? { variant } : {}) };
    let data;
    switch (type) {
      case "features": data = { title: `Why choose ${t.brand}`, intro: "", items: t.f.map(([icon, title, text]) => ({ icon, title, text })) }; break;
      case "about": data = { title: `About ${t.brand}`, text: t.about, image: art(t.art, ap, seed + 3), button: L("", ""), side: i % 2 ? "right" : "left" }; break;
      case "gallery": data = { title: "Gallery", intro: "", images: t.g.map((caption, k) => ({ src: art("abstract", ap, seed + 11 + k), caption })) }; break;
      case "pricing": data = { title: "Prices", intro: "Clear prices, no surprises.", plans: t.p.map(([name, price, period, text, features], k) => ({ name, price, period, text, features, button: L(t.cta, cta), featured: k === 1 })) }; break;
      case "products": data = { title: "Shop", intro: "Order in one tap on WhatsApp.", whatsapp: W, orderLabel: "Order on WhatsApp", items: t.pr.map(([name, price, kind]) => ({ image: productArt(kind, ap), name, price, text: "" })) }; break;
      case "testimonials": data = { title: "What people say", items: t.q.map(([quote, name, role]) => ({ quote, name, role })) }; break;
      case "faq": data = { title: "Questions and answers", items: t.a.map(([q, a]) => ({ q, a })) }; break;
      case "team": data = { title: "Meet the team", intro: "", members: t.t.map(([name, role], k) => ({ photo: art("portrait", ap, seed + k), name, role })) }; break;
      case "timeline": data = { title: "How it works", items: t.s.map(([when, title, text]) => ({ when, title, text })) }; break;
      case "contact": data = { title: "Get in touch", text: "Message us on WhatsApp or send the form. We reply the same day.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: W, waText: `Hello ${t.brand}!`, waLabel: "Chat on WhatsApp", address: "Main Boulevard, Lahore", formTitle: "Send a message", send: "Send" }; break;
      case "map": data = { title: "Visit us", address: "Main Boulevard, Lahore", note: "Open every day, 10am to 8pm.", query: "Main Boulevard Lahore", label: "Open in Maps", image: art("map", ap, seed) }; break;
      case "footer": data = { text: `${t.brand} · ${t.label.toLowerCase()}`, links: blocks.filter((b) => NAV[b]).slice(0, 3).map((b) => L(NAV[b], href(b))), copy: `© 2026 ${t.brand}` }; break;
      default: return null;
    }
    return newBlock(type, data, style);
  };
  const out = [];
  if (header) out.push(newBlock("header", { brand: t.brand, links: blocks.filter((b) => NAV[b] && b !== "contact").slice(0, 4).map((b) => L(NAV[b], href(b))), cta: L(t.cta, cta) }));
  out.push(newBlock("hero", { eyebrow: t.eye, title: t.title, text: t.text, primary: L(t.cta, cta), secondary: second ? L(`See ${NAV[second].toLowerCase()}`, href(second)) : L("", ""), image: noPic ? "" : art(t.art, ap, seed), layout: hero }, hero === "center" ? { bg: "tint" } : {}));
  specs.forEach((spec, i) => { const b = make(spec, i); if (b) out.push(b); });
  const s = site(t.brand, `${t.title}. ${t.text}`, theme, out, `${lid}~${pid}~${tid}`);
  if (Array.isArray(extra) && extra.length) {
    // Extra pages: menu bar + footer copied from home (addPage), a page heading, then the page's sections.
    extra.forEach(([name, list], n) => {
      const head = newBlock("hero", { eyebrow: t.brand, title: name, text: n === 0 ? t.about : t.text, image: "", layout: "minimal", primary: L("", ""), secondary: L("", "") }, { bg: "tint" });
      addPage(s, name, [head, ...list.map((spec, i) => make(spec, i + 1)).filter(Boolean)]);
    });
    switchPage(s, 0);
  }
  return s;
}

// Canva lists 2,365 website templates; we list the same number: 13 hand-made + generated combinations in a
// well-mixed order (layout, theme and palette all change from one card to the next). Only ids and names are made
// here; sites and thumbnails are built when a card is shown or used.
const TARGET = 2365;
const GEN = [];
{
  const seen = new Set(), nL = LAYOUTS.length, nT = THEMES.length, nP = PALETTES.length, want = TARGET - HAND.length;
  for (let k = 0; GEN.length < want && k < nL * nT * nP * 4; k++) {
    const l = LAYOUTS[k % nL], t = THEMES[(k * 4 + Math.floor(k / nL)) % nT], p = PALETTES[(k * 7 + Math.floor(k / (nL * nT)) * 3 + Math.floor(k / nT)) % nP];
    const id = `${l[0]}~${p[0]}~${t.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const pages = Array.isArray(l[8]) ? l[8].length + 1 : 1;
    GEN.push({ id, name: `${t.label} · ${l[1]}`, section: t.section, tags: [...t.tags, l[1].toLowerCase(), p[1].toLowerCase(), t.label.toLowerCase(), t.section.toLowerCase(), ...(pages > 1 ? ["multi-page", "multipage", "pages"] : [])], layout: l[0], theme: t.id, palette: p[0], pages });
  }
}
const parse = (id) => { const m = /^([a-z]+)~(p\d\d)~([a-z]+)$/.exec(String(id || "")); return m && LAY[m[1]] && PAL[m[2]] && THM[m[3]] ? { l: m[1], p: m[2], t: m[3] } : null; };

// The editor's Templates panel groups cards by `section` in first-seen order, so the hand-made sites share one
// "Featured" section (they lead the list) and the generated ones share one section that keeps the mixed order.
// The business type stays searchable (tags) and filterable (theme chips); `category` keeps it for other pages.
export const TEMPLATES = [
  ...HAND.map(([id, name, section, tags]) => ({ id, name, tool: "websites", section: "Featured", category: section, tags: [...tags, section.toLowerCase()] })),
  ...GEN.map(({ id, name, section, tags, layout, theme, palette, pages }) => ({ id, name, tool: "websites", section: "More templates for you", category: section, tags, layout, layoutName: LAY[layout][1], theme, themeName: THM[theme].label, palette, ...(pages > 1 ? { pages } : {}) })),
];
/** The base layout of a template id (hand-made sites are their own layout). */
export function layoutOf(id) { const g = parse(id); return g ? g.l : HAND.some((h) => h[0] === id) ? `hand:${id}` : ""; }
export const TOTAL = TEMPLATES.length;
/** Distinct base layouts: 18 generator layouts + 13 hand-made sites. */
export const LAYOUTS_LIST = LAYOUTS.map(([id, name]) => ({ id, name }));
const LAYOUT_COUNT = LAYOUTS.length + HAND.length;
export { LAYOUT_COUNT as LAYOUTS };
export const THEMES_LIST = THEMES.map((t) => ({ id: t.id, name: t.label }));
export const PALETTES_LIST = PALETTES.map(([id, name, a, b]) => ({ id, name, colors: [a, b] }));
const HAND_IDS = new Set(HAND.map((x) => x[0]));
/** True for gallery ids, including any valid layout~palette~theme combination. */
export const hasTemplate = (id) => HAND_IDS.has(id) || !!parse(id);
/** A fresh site (new block ids each time) for a gallery template id. */
export function makeSite(id) {
  if (EXTRA[id]) return EXTRA[id]();
  const g = parse(id);
  if (g) return buildGenerated(g.l, g.p, g.t);
  return makeTemplate(id);
}
/** The hero headline a template starts with (the e2e checks it in the preview). */
export function heroTitle(id) {
  const g = parse(id);
  if (g) return THM[g.t].title;
  const s = makeSite(id); return s.blocks.find((b) => b.type === "hero")?.data.title || "";
}

/* ------------------------------------------------------------------ thumbnails (cheap SVG strings) */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
function section(type, y, a, b, ink, card, line) {
  const h = 200 - y - 8;
  if (h < 14) return "";
  const r = (x, yy, w, hh, f, rx = 3, ex = "") => `<rect x="${x}" y="${yy}" width="${w}" height="${hh}" rx="${rx}" fill="${f}"${ex}/>`;
  switch (type) {
    case "gallery:mosaic": return r(22, y + 4, 136, Math.min(48, h - 4), a, 4, ' opacity=".85"') + [0, 1, 2, 3].map((i) => r(164 + (i % 2) * 64, y + 4 + Math.floor(i / 2) * 25, 60, Math.min(21, (h - 8) / 2), i % 3 ? b : a, 4, ' opacity=".7"')).join("");
    case "features:list": return [0, 1, 2].map((i) => `<circle cx="${56}" cy="${y + 10 + i * 15}" r="5" fill="${i === 1 ? b : a}"/>` + r(70, y + 7 + i * 15, 150 - i * 20, 5, ink, 2.5, ' opacity=".45"') + r(40, y + 16 + i * 15, 240, 1, line, 0)).join("");
    case "features:numbers": return [0, 1, 2].map((i) => `<text x="${30 + i * 96}" y="${y + 24}" font-family="Arial" font-size="20" font-weight="800" fill="${b}">0${i + 1}</text>` + r(30 + i * 96, y + 32, 64, 5, ink, 2.5, ' opacity=".45"')).join("");
    case "testimonials:single": return `<text x="160" y="${y + 22}" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="${a}">“</text>` + r(70, y + 26, 180, 6, ink, 3, ' opacity=".55"') + r(100, y + 37, 120, 4, ink, 2, ' opacity=".35"');
    case "gallery": return [0, 1, 2, 3].map((i) => r(22 + i * 70, y + 6, 64, Math.min(44, h - 6), i % 2 ? b : a, 4, ' opacity=".8"')).join("");
    case "pricing": return [0, 1, 2].map((i) => r(40 + i * 82, y + (i === 1 ? 2 : 8), 74, Math.min(i === 1 ? 50 : 44, h - 4), i === 1 ? a : card, 6, i === 1 ? "" : ` stroke="${line}"`) + r(52 + i * 82, y + 16, 40, 5, i === 1 ? "#fff" : ink, 2.5, ' opacity=".6"')).join("");
    case "products": return [0, 1, 2].map((i) => r(30 + i * 90, y + 6, 80, Math.min(46, h - 6), card, 6, ` stroke="${line}"`) + r(40 + i * 90, y + 12, 60, 18, i === 1 ? b : a, 4, ' opacity=".75"') + r(40 + i * 90, y + 36, 34, 5, ink, 2.5, ' opacity=".5"')).join("");
    case "testimonials": return [0, 1].map((i) => r(30 + i * 134, y + 6, 126, Math.min(40, h - 6), card, 10, ` stroke="${line}"`) + `<text x="${40 + i * 134}" y="${y + 24}" font-family="Arial" font-size="10" fill="${b}">★★★★★</text>` + r(40 + i * 134, y + 30, 90, 4, ink, 2, ' opacity=".35"')).join("");
    case "timeline": return `<path d="M30 ${y + 22}H290" stroke="${line}" stroke-width="2"/>` + [0, 1, 2].map((i) => `<circle cx="${60 + i * 100}" cy="${y + 22}" r="7" fill="${i ? b : a}"/>` + r(40 + i * 100, y + 34, 44, 4, ink, 2, ' opacity=".4"')).join("");
    case "team": return [0, 1, 2].map((i) => `<circle cx="${80 + i * 80}" cy="${y + 22}" r="15" fill="${i === 1 ? b : a}" opacity=".85"/>` + r(66 + i * 80, y + 42, 28, 4, ink, 2, ' opacity=".45"')).join("");
    case "faq": return [0, 1, 2].map((i) => r(40, y + 4 + i * 15, 240, 11, card, 3, ` stroke="${line}"`) + r(48, y + 8 + i * 15, 110, 3, ink, 1.5, ' opacity=".5"')).join("");
    case "contact": return r(40, y + 4, 110, Math.min(46, h - 4), card, 6, ` stroke="${line}"`) + r(48, y + 12, 94, 6, line, 3) + r(48, y + 24, 94, 6, line, 3) + r(48, y + 36, 40, 8, a, 4) + r(170, y + 10, 100, 5, ink, 2.5, ' opacity=".5"') + r(170, y + 22, 70, 5, ink, 2.5, ' opacity=".35"') + r(170, y + 34, 60, 10, "#22c55e", 5);
    case "map": return r(30, y + 4, 260, Math.min(44, h - 4), card, 6, ` stroke="${line}"`) + `<path d="M40 ${y + 30}l60-14 60 12 60-16 60 10" stroke="${line}" stroke-width="3" fill="none"/><circle cx="160" cy="${y + 22}" r="7" fill="${a}"/>`;
    case "about": return r(30, y + 4, 100, Math.min(46, h - 4), a, 6, ' opacity=".7"') + r(146, y + 10, 120, 6, ink, 3, ' opacity=".7"') + r(146, y + 22, 140, 4, ink, 2, ' opacity=".35"') + r(146, y + 30, 120, 4, ink, 2, ' opacity=".35"');
    default: if (type.includes(":")) return section(type.split(":")[0], y, a, b, ink, card, line);
      return [0, 1, 2].map((i) => r(22 + i * 96, y + 4, 84, Math.min(42, h - 4), card, 6, ` stroke="${line}"`) + `<circle cx="${36 + i * 96}" cy="${y + 18}" r="6" fill="${i === 1 ? b : a}"/>` + r(30 + i * 96, y + 30, 60, 4, ink, 2, ' opacity=".35"')).join("");
  }
}
function drawThumb({ a, b, c, d, pg, layout, head, header = true, next = ["features"], pages = 1 }) {
  const dark = pg === "#0f1222";
  const ink = dark ? "#e9ebf5" : d, soft = dark ? "#1b2036" : c, card = dark ? "#1b2036" : "#fff", line = dark ? "#2a2f4a" : "#e5e7eb";
  const top = header ? 44 : 24;
  let hero = "", y;
  const title = esc(clip(head, 30));
  if (layout === "cover") {
    y = top + 86;
    hero = `<rect x="12" y="${top}" width="296" height="86" fill="${a}"/><circle cx="270" cy="${top + 16}" r="34" fill="${b}" opacity=".35"/><circle cx="40" cy="${top + 84}" r="30" fill="#fff" opacity=".12"/>`
      + `<text x="160" y="${top + 40}" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="700" fill="#fff">${title}</text>`
      + `<rect x="110" y="${top + 50}" width="100" height="5" rx="2.5" fill="#fff" opacity=".7"/><rect x="128" y="${top + 62}" width="64" height="14" rx="7" fill="${b}"/>`;
  } else if (layout === "bio") {
    y = 200;
    hero = `<rect x="12" y="${top}" width="296" height="${190 - top}" fill="${c}"/><circle cx="160" cy="${top + 24}" r="16" fill="${a}"/><text x="160" y="${top + 56}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="${d}">${title}</text>`
      + [0, 1, 2].map((i) => `<rect x="96" y="${top + 66 + i * 24}" width="128" height="17" rx="8.5" fill="${i ? "#fff" : a}" stroke="${a}" stroke-width="1.2"/>`).join("");
  } else if (layout === "minimal") {
    y = top + 74;
    hero = `<rect x="22" y="${top + 10}" width="5" height="56" fill="${b}"/><text x="36" y="${top + 34}" font-family="Arial,sans-serif" font-size="19" font-weight="800" fill="${ink}">${esc(clip(head, 20))}</text>`
      + `<rect x="36" y="${top + 44}" width="150" height="5" rx="2.5" fill="${ink}" opacity=".35"/><rect x="36" y="${top + 54}" width="54" height="12" rx="6" fill="${a}"/>`;
  } else if (layout === "banner") {
    y = top + 96;
    hero = `<text x="160" y="${top + 20}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="800" fill="${ink}">${title}</text><rect x="110" y="${top + 27}" width="100" height="4" rx="2" fill="${ink}" opacity=".35"/>`
      + `<rect x="24" y="${top + 38}" width="272" height="54" rx="8" fill="${a}"/><circle cx="70" cy="${top + 58}" r="11" fill="${b}"/><path d="M24 ${top + 92}l70-30 50 20 60-26 92 36z" fill="#fff" opacity=".45"/>`;
  } else if (layout === "card") {
    y = top + 90;
    hero = `<rect x="12" y="${top}" width="296" height="90" fill="${a}"/><circle cx="250" cy="${top + 30}" r="30" fill="${b}" opacity=".5"/><path d="M12 ${top + 90}l90-40 70 26 80-36 56 50z" fill="#fff" opacity=".25"/>`
      + `<rect x="28" y="${top + 14}" width="150" height="62" rx="8" fill="${card}"/><text x="38" y="${top + 36}" font-family="Arial,sans-serif" font-size="11" font-weight="800" fill="${ink}">${esc(clip(head, 22))}</text><rect x="38" y="${top + 44}" width="110" height="4" rx="2" fill="${ink}" opacity=".35"/><rect x="38" y="${top + 56}" width="46" height="11" rx="5.5" fill="${a}"/>`;
  } else if (layout === "center") {
    y = top + 70;
    hero = `<rect x="12" y="${top}" width="296" height="70" fill="${soft}"/><text x="160" y="${top + 30}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="800" fill="${ink}">${title}</text>`
      + `<rect x="100" y="${top + 38}" width="120" height="5" rx="2.5" fill="${ink}" opacity=".35"/><rect x="132" y="${top + 50}" width="56" height="13" rx="6.5" fill="${a}"/>`;
  } else {
    y = top + 86;
    const L2 = layout === "left", tx = L2 ? 154 : 24, ix = L2 ? 24 : 184;
    hero = `<rect x="12" y="${top}" width="296" height="86" fill="${soft}"/><text x="${tx}" y="${top + 28}" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${ink}">${esc(clip(head, 24))}</text>`
      + `<rect x="${tx}" y="${top + 38}" width="120" height="5" rx="2.5" fill="${ink}" opacity=".35"/><rect x="${tx}" y="${top + 48}" width="96" height="5" rx="2.5" fill="${ink}" opacity=".35"/><rect x="${tx}" y="${top + 60}" width="52" height="14" rx="7" fill="${a}"/><rect x="${tx + 58}" y="${top + 60}" width="44" height="14" rx="7" fill="none" stroke="${a}" stroke-width="1.4"/>`
      + `<rect x="${ix}" y="${top + 8}" width="112" height="70" rx="8" fill="${a}"/><circle cx="${ix + 30}" cy="${top + 32}" r="10" fill="${b}"/><path d="M${ix + 6} ${top + 72}l30-24 22 16 18-12 30 20z" fill="#fff" opacity=".55"/>`;
  }
  const badge = pages > 1 ? `<rect x="238" y="166" width="66" height="22" rx="11" fill="#1b2133" opacity=".85"/><text x="271" y="181" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#fff">${pages} pages</text>` : "";
  const nav = !header ? "" : `<rect x="12" y="24" width="296" height="20" fill="${dark ? "#151a30" : "#fff"}"/><circle cx="24" cy="34" r="5" fill="${a}"/><rect x="34" y="31" width="40" height="6" rx="3" fill="${ink}" opacity=".7"/>`
    + [0, 1, 2].map((i) => `<rect x="${178 + i * 30}" y="32" width="22" height="4" rx="2" fill="${ink}" opacity=".4"/>`).join("") + `<rect x="270" y="29" width="32" height="10" rx="5" fill="${a}"/>`;
  const rest = layout === "bio" ? "" : section(next[0] || "features", y, a, b, ink, card, line);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${dark ? "#2a2f4a" : c}"/><rect x="6" y="6" width="308" height="190" rx="10" fill="${pg}" stroke="#d6d9e3"/>`
    + `<rect x="6" y="6" width="308" height="18" rx="10" fill="#eef0f5"/><rect x="6" y="16" width="308" height="8" fill="#eef0f5"/><circle cx="18" cy="15" r="3" fill="#f87171"/><circle cx="28" cy="15" r="3" fill="#fbbf24"/><circle cx="38" cy="15" r="3" fill="#34d399"/><rect x="60" y="11" width="150" height="8" rx="4" fill="#fff"/>`
    + nav + hero + rest + badge + `</svg>`;
}
/** Our own drawn thumbnail: a small browser window with the site's menu, hero and next section. */
export function thumb(id) {
  const g = parse(id);
  if (g) {
    const l = LAY[g.l], p = PAL[g.p], t = THM[g.t];
    return drawThumb({ a: p[2], b: p[3], c: p[4], d: p[5], pg: p[6] ? "#0f1222" : "#ffffff", layout: l[2], head: t.title, header: l[3], next: l[4], pages: Array.isArray(l[8]) ? l[8].length + 1 : 1 });
  }
  const h = HAND.find((x) => x[0] === id) || HAND[0];
  const [a, b, c, d, pg] = h[4];
  return drawThumb({ a, b, c, d, pg, layout: h[5], head: h[6], header: h[5] !== "bio", next: ["features"] });
}
