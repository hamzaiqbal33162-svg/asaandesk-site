// Website template gallery (editor Templates panel + the /tools/websites intro page). Pure ES module: no DOM.
// 13 hand-made sites first, then a GENERATOR: our own base LAYOUTS × colour PALETTES × content THEMES (own business
// copy, real library photos). Generated ids encode the combination: "<layout>~<palette>~<theme>" (e.g.
// "classic~p03~clinic"); makeSite(id) and thumb(id) build from the id, so every template opens and is editable.
// Thumbnails are drawn FROM the site itself (menu bar, hero, the next sections, same photos in their small files), so
// the card looks like the homepage that opens. Names are made up; emails use example.com and phone numbers are
// placeholders. TOTAL matches the number of website templates Canva lists.
import { newBlock, normalizeSite, DEFAULT_THEME, BLOCK_TYPES, addPage, switchPage, themeVars } from "./blocks.js";
import { art, photoPicker, thumbOf, isLibraryPhoto, ICONS as WICONS } from "./art.js";
import { makeTemplate } from "./templates.js";
import { kit, text, fit, textW, rect, circle, line, mix, isDark, hash } from "../shared/tpl-kit.js";

const L = (label, href) => ({ label, href });
const W = "923000000000";
const site = (name, description, theme, blocks, template) => normalizeSite({ version: 1, name, description, template, theme: { ...DEFAULT_THEME, ...theme }, blocks });
const A = (anim, extra = {}) => ({ anim, ...extra });

/* ------------------------------------------------------------------ hand-made extras (beside templates.js) */
const EXTRA = {
  "link-in-bio": () => {
    const ph = photoPicker("link-in-bio");
    return site("Zara Bakes · links", "All of Zara Bakes in one place: order cakes, see the menu and follow along.",
      { primary: "#db2777", accent: "#f59e0b", headingFont: "serif", bodyFont: "sans", corners: "round" }, [
        newBlock("hero", { eyebrow: "Home bakery · Lahore", title: "Zara Bakes", text: "Custom cakes, brownies and cookies baked fresh to order.", primary: L("Order on WhatsApp", "https://wa.me/923000000000?text=Hi%20Zara%20Bakes"), secondary: L("See the menu", "#pricing"), image: "", layout: "center" }, { bgImage: ph("cake bakery dessert chocolate birthday", "hero"), anim: "zoom" }),
        newBlock("gallery", { title: "Fresh this week", intro: "", images: ph.many("cake bakery dessert chocolates sweets birthday", 4, "g").map((src, i) => ({ src, caption: ["Chocolate fudge", "Red velvet", "Brownie box", "Cupcakes"][i] })) }, A("zoom", { bg: "tint" })),
        newBlock("features", { title: "Quick links", intro: "", items: [
          { icon: "cart", title: "Order a cake", text: "Two days notice for custom cakes." },
          { icon: "camera", title: "Photo gallery", text: "See cakes we made this month." },
          { icon: "chat", title: "Ask a question", text: "We reply on WhatsApp within the hour." }] }, A("rise")),
        newBlock("pricing", { title: "Menu", intro: "Prices for a 1 kg cake.", plans: [
          { name: "Chocolate fudge", price: "Rs 2,800", period: "", text: "Our best seller.", features: ["Rich ganache", "Fresh cream"], button: L("Order", "https://wa.me/923000000000?text=Chocolate%20fudge"), featured: true },
          { name: "Red velvet", price: "Rs 3,200", period: "", text: "With cream cheese icing.", features: ["Soft sponge", "Cream cheese"], button: L("Order", "https://wa.me/923000000000?text=Red%20velvet"), featured: false }] }, A("pop", { bg: "alt" })),
        newBlock("footer", { text: "Zara Bakes · baked with love", links: [L("Menu", "#pricing")], copy: "© 2026 Zara Bakes" }),
      ], "link-in-bio");
  },
  "landing-page": () => {
    const ph = photoPicker("landing-page");
    return site("Tally app", "Tally keeps your shop's sales and credit in one simple phone app.",
      { primary: "#0f766e", accent: "#f97316", headingFont: "sans", bodyFont: "sans", corners: "soft" }, [
        newBlock("header", { brand: "Tally", links: [L("Features", "#features"), L("Prices", "#pricing"), L("FAQ", "#faq")], cta: L("Try it free", "#contact") }),
        newBlock("hero", { eyebrow: "New · for small shops", title: "Know your daily sales in one tap", text: "Tally records sales, credit and stock on your phone. No training needed, works without internet.", primary: L("Try it free", "#contact"), secondary: L("See features", "#features"), image: ph("smartphone app mobile workspace", "hero"), layout: "split" }, { bg: "primary", anim: "fade" }),
        newBlock("features", { title: "Everything a shop needs", intro: "", items: [
          { icon: "bolt", title: "Fast entry", text: "Add a sale in three taps." },
          { icon: "shield", title: "Safe backups", text: "Your records are copied every night." },
          { icon: "chat", title: "Credit reminders", text: "Send polite reminders to customers." },
          { icon: "check", title: "Daily summary", text: "See today's total at closing time." }] }, A("rise", { bg: "alt" })),
        newBlock("about", { title: "Made for the shop counter", text: "Big buttons, clear numbers and a daily summary you can read at a glance.\nTally works offline and syncs when you are back online.", image: ph("workspace coworking smartphone", "about"), button: L("Try it free", "#contact"), side: "right" }, A("pan")),
        newBlock("pricing", { title: "Simple prices", intro: "Start free, upgrade when you grow.", plans: [
          { name: "Free", price: "Rs 0", period: "/ month", text: "For one shop.", features: ["Sales and credit", "One phone"], button: L("Start free", "#contact"), featured: false },
          { name: "Pro", price: "Rs 900", period: "/ month", text: "For busy shops.", features: ["Stock tracking", "Three phones", "Reports"], button: L("Go Pro", "#contact"), featured: true }] }, A("pop", { bg: "tint" })),
        newBlock("testimonials", { title: "Shopkeepers love Tally", items: [
          { quote: "I close the shop ten minutes earlier because the totals are ready.", name: "Rashid A.", role: "General store, Multan", photo: ph("workspace coworking office", "q0") },
          { quote: "Credit reminders brought back money I had forgotten about.", name: "Sobia K.", role: "Pharmacy, Lahore", photo: ph("workspace coworking office", "q1") },
          { quote: "My son set it up in five minutes.", name: "Ghulam R.", role: "Hardware shop, Sialkot", photo: ph("workspace coworking office", "q2") }] }, A("rise")),
        newBlock("faq", { title: "Questions", items: [{ q: "Does it work offline?", a: "Yes. It saves on the phone and syncs later." }, { q: "Can I cancel any time?", a: "Yes, with one tap in the settings." }] }, A("rise", { bg: "alt" })),
        newBlock("contact", { title: "Get the app", text: "Leave your number and we will send the download link.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: "", waText: "", waLabel: "", address: "", formTitle: "Send me the link", send: "Send" }, A("rise")),
        newBlock("footer", { text: "Tally · simple shop records", links: [L("Features", "#features"), L("FAQ", "#faq")], copy: "© 2026 Tally" }),
      ], "landing-page");
  },
  wedding: () => {
    const ph = photoPicker("wedding");
    return site("Sana and Omar", "Join us to celebrate the wedding of Sana and Omar in Islamabad.",
      { primary: "#9d174d", accent: "#d4a017", headingFont: "serif", bodyFont: "serif", corners: "round" }, [
        newBlock("header", { brand: "Sana & Omar", links: [L("Our story", "#about"), L("Events", "#timeline"), L("Venue", "#location"), L("RSVP", "#contact")], cta: L("RSVP", "#contact") }),
        newBlock("hero", { eyebrow: "Saturday 20 February 2027 · Islamabad", title: "Sana and Omar are getting married", text: "We would love you to be with us for the mehndi, the nikah and the walima.", primary: L("RSVP now", "#contact"), secondary: L("See the events", "#timeline"), image: ph("wedding rings flowers marriage engagement", "hero"), layout: "card" }, { anim: "fade" }),
        newBlock("about", { title: "Our story", text: "We met at university in 2019 over a broken library printer.\nSix years later, we are starting our life together.", image: ph("flowers garden wedding", "about"), button: L("", ""), side: "right" }, A("pan", { bg: "tint" })),
        newBlock("timeline", { title: "Wedding events", items: [
          { when: "Thursday 7pm", title: "Mehndi", text: "Music, dancing and dinner at the family home." },
          { when: "Saturday 4pm", title: "Nikah", text: "On the mosque lawn, followed by tea." },
          { when: "Sunday 8pm", title: "Walima", text: "Dinner at the Lake View marquee." }] }, A("rise")),
        newBlock("gallery", { title: "Moments", intro: "", images: ph.many("wedding flowers rings banquet garden", 4, "g").map((src, i) => ({ src, caption: ["Engagement", "Family dinner", "Flowers", "The rings"][i] })) }, A("zoom", { bg: "alt", variant: "mosaic" })),
        newBlock("map", { title: "Venue", address: "Lake View marquee, Park Road, Islamabad", note: "Parking at Gate 1.", query: "Lake View Park Islamabad", label: "Open in Maps", image: art("map", "rose") }, A("rise")),
        newBlock("contact", { title: "RSVP", text: "Please let us know by 1 February 2027.", email: "rsvp@example.com", phone: "", whatsapp: "923000000000", waText: "Hello! We will attend the wedding.", waLabel: "RSVP on WhatsApp", address: "", formTitle: "Send your RSVP", send: "Send RSVP" }, A("rise", { bg: "tint" })),
        newBlock("footer", { text: "With love, Sana and Omar", links: [], copy: "© 2027 Sana & Omar" }),
      ], "wedding");
  },
  fitness: () => {
    const ph = photoPicker("fitness");
    return site("Peak Fitness Studio", "Small group training, yoga and personal coaching in Karachi.",
      { primary: "#ea580c", accent: "#0ea5e9", headingFont: "sans", bodyFont: "sans", corners: "sharp", mode: "dark", bg: "#0f1222", text: "#e9ebf5" }, [
        newBlock("header", { brand: "Peak Fitness", links: [L("Classes", "#timeline"), L("Plans", "#pricing"), L("Coaches", "#team")], cta: L("Free trial", "#contact") }, { bg: "dark" }),
        newBlock("hero", { eyebrow: "Clifton, Karachi", title: "Get stronger in 12 weeks", text: "Small groups, real coaches and a plan made for you.", primary: L("Book a free class", "#contact"), secondary: L("See plans", "#pricing"), image: "", layout: "minimal" }, { bgImage: ph("fitness gym weights workout", "hero"), anim: "zoom" }),
        newBlock("features", { title: "Results you can count", intro: "", items: [
          { icon: "users", title: "1,200+", text: "Members trained since 2019" },
          { icon: "award", title: "12 weeks", text: "From first class to real strength" },
          { icon: "star", title: "4.9 / 5", text: "Average class rating" }] }, A("pop", { bg: "primary" })),
        newBlock("timeline", { title: "Weekly classes", items: [{ when: "Mon · Wed · Fri", title: "Strength", text: "7am and 7pm" }, { when: "Tue · Thu", title: "Yoga", text: "8am" }, { when: "Saturday", title: "Bootcamp", text: "9am" }] }, A("rise")),
        newBlock("pricing", { title: "Plans", intro: "", plans: [
          { name: "Monthly", price: "Rs 8,000", period: "/ month", text: "", features: ["All classes"], button: L("Join", "#contact"), featured: false },
          { name: "Quarterly", price: "Rs 21,000", period: "/ 3 months", text: "Best value.", features: ["All classes", "Diet plan"], button: L("Join", "#contact"), featured: true }] }, A("pop", { bg: "alt" })),
        newBlock("team", { title: "Coaches", intro: "", members: ph.many("fitness sport gym", 3, "t").map((photo, i) => ({ photo, name: ["Coach Faraz", "Coach Mehwish", "Coach Danish"][i], role: ["Strength", "Yoga", "Bootcamp"][i] })) }, A("rise")),
        newBlock("contact", { title: "Book a free class", text: "Your first class is on us.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: "923000000000", waText: "Hi! I want a free class.", waLabel: "Book on WhatsApp", address: "Clifton Block 5, Karachi", formTitle: "Book a trial", send: "Book" }, A("rise", { bg: "alt" })),
        newBlock("footer", { text: "Peak Fitness Studio", links: [L("Plans", "#pricing")], copy: "© 2026 Peak Fitness" }),
      ], "fitness");
  },
  charity: () => {
    const ph = photoPicker("charity");
    return site("Clean Water Circle", "A volunteer group that installs water filters in village schools.",
      { primary: "#0369a1", accent: "#16a34a", headingFont: "serif", bodyFont: "sans", corners: "soft" }, [
        newBlock("header", { brand: "Clean Water Circle", links: [L("Our work", "#features"), L("Stories", "#reviews"), L("Help", "#contact")], cta: L("Donate", "#contact") }),
        newBlock("hero", { eyebrow: "Since 2020 · 64 schools", title: "Clean water for every school child", text: "One filter gives 300 children safe drinking water for five years.", primary: L("Give a filter", "#contact"), secondary: L("See our work", "#features"), image: ph("nature valley water lake", "hero"), layout: "split" }, { anim: "fade" }),
        newBlock("features", { title: "What your gift does", intro: "", items: [{ icon: "heart", title: "Rs 5,000", text: "Repairs one school tap." }, { icon: "shield", title: "Rs 25,000", text: "Buys one water filter." }, { icon: "star", title: "Rs 60,000", text: "Filter plus five years of care." }] }, A("pop", { bg: "dark" })),
        newBlock("about", { title: "Why we started", text: "In 2020 we met a head teacher whose pupils missed school every week because of dirty water.\nToday 64 schools have clean water, and parents help us look after every filter.", image: ph("education school books classroom", "about"), button: L("Volunteer with us", "#contact"), side: "left" }, A("pan")),
        newBlock("testimonials", { title: "Stories", items: [{ quote: "Fewer children miss school because of stomach illness now.", name: "Head teacher", role: "Village school", photo: ph("education school classroom", "av0") }, { quote: "Our pupils drink from the filter every break. Thank you!", name: "Science teacher", role: "Girls school", photo: ph("education school classroom", "av1") }] }, A("rise", { bg: "alt" })),
        newBlock("contact", { title: "Help us", text: "Volunteer or donate. Every rupee goes to filters.", email: "give@example.com", phone: "", whatsapp: "923000000000", waText: "I want to help.", waLabel: "Talk to us", address: "", formTitle: "Send a message", send: "Send" }, A("rise", { bg: "tint" })),
        newBlock("footer", { text: "Clean Water Circle · a volunteer group", links: [], copy: "© 2026 Clean Water Circle" }),
      ], "charity");
  },
  "coming-soon": () => {
    const ph = photoPicker("coming-soon");
    return site("Noor Studio · coming soon", "Noor Studio opens soon: handmade ceramics and pottery classes.",
      { primary: "#7c3aed", accent: "#f472b6", headingFont: "cambria", bodyFont: "sans", corners: "round" }, [
        newBlock("hero", { eyebrow: "Opening March 2027", title: "Something lovely is coming soon", text: "Noor Studio: handmade ceramics and weekend pottery classes. Leave your email and be the first to know.", primary: L("Tell me first", "#contact"), secondary: L("", ""), image: "", layout: "minimal" }, { bgImage: ph("textures craft calm minimal", "hero"), anim: "fade" }),
        newBlock("gallery", { title: "A first look", intro: "", images: ph.many("textures craft marble stone wood", 4, "g").map((src, i) => ({ src, caption: ["Glazed bowls", "The studio", "Clay", "Kiln day"][i] })) }, A("zoom")),
        newBlock("contact", { title: "Get the news first", text: "One email when we open. No spam.", email: "hello@example.com", phone: "", whatsapp: "", waText: "", waLabel: "", address: "", formTitle: "Your email", send: "Notify me" }, A("rise", { bg: "tint" })),
        newBlock("footer", { text: "Noor Studio", links: [], copy: "© 2026 Noor Studio" }),
      ], "coming-soon");
  },
};
// Hand-made: [id, name, section, tags]
const HAND = [
  ["business", "Small business", "Business", ["services", "repairs", "salon", "clinic", "company"]],
  ["restaurant", "Restaurant", "Food and drink", ["food", "cafe", "menu", "booking"]],
  ["shop", "Online store", "Shops", ["shop", "store", "products", "whatsapp", "ecommerce"]],
  ["landing-page", "Landing page", "Business", ["app", "product", "launch", "startup", "marketing"]],
  ["fitness", "Gym and fitness", "Health and fitness", ["gym", "yoga", "coach", "sport", "classes"]],
  ["portfolio", "Portfolio", "Portfolio and resume", ["designer", "photographer", "freelancer", "work", "creative"]],
  ["cv", "Resume website", "Portfolio and resume", ["cv", "resume", "job", "career", "personal"]],
  ["link-in-bio", "Link in bio", "Portfolio and resume", ["links", "social", "instagram", "bio", "creator"]],
  ["event", "Event", "Events and weddings", ["conference", "workshop", "festival", "tickets", "schedule"]],
  ["wedding", "Wedding", "Events and weddings", ["wedding", "rsvp", "nikah", "invitation", "marriage"]],
  ["academy", "School and courses", "Education", ["tuition", "academy", "school", "course", "teacher"]],
  ["charity", "Charity", "Charity and community", ["nonprofit", "ngo", "donate", "volunteer", "cause"]],
  ["coming-soon", "Coming soon", "Business", ["launch", "soon", "waitlist", "opening"]],
];

/* ------------------------------------------------------------------ generator: palettes × layouts × themes */
// [id, name, main, accent, light, dark, page colour for dark mode]
const PALETTES = [
  ["p01", "Ocean", "#2563eb", "#f59e0b", "#e3edff", "#111827"], ["p02", "Spice", "#c2410c", "#eab308", "#fff1e0", "#3b2314"],
  ["p03", "Rose", "#e11d48", "#7c3aed", "#ffe4ea", "#2a1530"], ["p04", "Lagoon", "#0f9488", "#f59e0b", "#dcf7f3", "#123b3a"],
  ["p05", "Forest", "#15803d", "#eab308", "#e3f6e8", "#132a1c"], ["p06", "Violet", "#5b4cf0", "#ff7a59", "#ecebff", "#1f2440"],
  ["p07", "Slate", "#334155", "#0ea5e9", "#e6edf5", "#0f172a"], ["p08", "Berry", "#9d174d", "#d4a017", "#fce7f3", "#3b0d24"],
  ["p09", "Sky", "#0369a1", "#16a34a", "#e0f2fe", "#0c2a3d"], ["p10", "Lilac", "#7c3aed", "#f472b6", "#ede9fe", "#2e1065"],
  ["p11", "Honey", "#b45309", "#0f766e", "#fef3c7", "#3a2a0a"], ["p12", "Candy", "#db2777", "#0ea5e9", "#fce7f3", "#3b0d24"],
  ["p13", "Night", "#f97316", "#38bdf8", "#1b2036", "#0f1222", "#0f1222"], ["p14", "Ink", "#111827", "#f59e0b", "#f3f4f6", "#111827"],
  ["p15", "Mint", "#059669", "#6366f1", "#d1fae5", "#064e3b"], ["p16", "Midnight", "#a78bfa", "#facc15", "#1e1b4b", "#0b0a1f", "#0b0a1f"],
  ["p17", "Noir gold", "#1c1917", "#c8963e", "#f5efe4", "#1c1917"], ["p18", "Sage", "#3f6f52", "#e0a43a", "#e6efe8", "#1b3326"],
  ["p19", "Navy", "#1e3a8a", "#f97316", "#e0e7ff", "#0b1437"], ["p20", "Coral", "#e8532f", "#1e293b", "#ffe8df", "#2b1712"],
  ["p21", "Emerald night", "#10b981", "#facc15", "#10241d", "#07130f", "#0b1712"], ["p22", "Plum", "#7e22ce", "#f59e0b", "#f3e8ff", "#2a0f3d"],
  ["p23", "Deep teal", "#0e7490", "#f43f5e", "#cffafe", "#082f3a"], ["p24", "Wine", "#e11d48", "#fbbf24", "#2a1220", "#14060d", "#160a11"],
];
const FONT_PAIRS = [["sans", "sans"], ["serif", "sans"], ["cambria", "calibri"], ["calibri", "calibri"], ["serif", "serif"]];
// Base layouts: [id, name, menu bar ("light" | "dark" | "primary" | "" = none), hero layout, hero background
// ("" | alt | tint | primary | dark | photo), sections after the hero ("type[:variant][@background]"; "stats" = a band of
// numbers; "@accent" = a colour block in the palette's accent colour), corners, font pair, [hero animation, section animation], extra pages ([page name, sections])].
const LAYOUTS = [
  ["classic", "Classic", "light", "split", "", ["about", "features@alt", "testimonials", "contact", "footer"], "soft", 0, ["fade", "rise"]],
  ["cover", "Bold cover", "light", "cover", "", ["about", "gallery@alt", "testimonials", "map", "footer"], "round", 1, ["zoom", "rise"]],
  ["centered", "Centred", "light", "center", "primary", ["about", "gallery@alt", "features:numbers", "faq@alt", "contact", "footer"], "soft", 3, ["fade", "pop"]],
  ["services", "Services", "light", "split", "tint", ["features", "timeline@alt", "pricing", "testimonials@accent", "faq", "contact", "footer"], "soft", 0, ["rise", "rise"]],
  ["showcase", "Showcase", "dark", "split", "dark", ["gallery", "about@alt", "testimonials", "contact", "footer"], "sharp", 2, ["fade", "zoom"]],
  ["story", "Story", "light", "banner", "", ["about@alt", "timeline", "team@tint", "contact", "footer"], "round", 4, ["rise", "pan"]],
  ["pricing", "Price list", "light", "left", "alt", ["pricing", "about@alt", "testimonials", "faq@alt", "contact", "footer"], "soft", 0, ["fade", "pop"]],
  ["catalogue", "Catalogue", "light", "split", "alt", ["products", "features@tint", "testimonials", "contact", "footer"], "round", 3, ["rise", "pop"]],
  ["team", "Meet the team", "light", "cover", "", ["team", "stats@accent", "testimonials", "contact", "footer"], "soft", 1, ["zoom", "rise"]],
  ["visit", "Visit us", "primary", "cover", "", ["about", "pricing@alt", "gallery", "map", "contact@tint", "footer"], "round", 2, ["fade", "rise"]],
  ["minimal", "Minimal", "", "minimal", "photo", ["about", "gallery:mosaic@alt", "contact", "footer"], "sharp", 4, ["fade", "fade"]],
  ["launch", "Launch", "light", "split", "primary", ["features", "about@alt", "pricing", "testimonials@accent", "faq", "contact", "footer"], "round", 3, ["rise", "pop"]],
  ["journey", "Timeline", "light", "left", "", ["timeline", "about@alt", "gallery", "contact", "footer"], "soft", 1, ["fade", "rise"]],
  ["gallery", "Gallery first", "light", "center", "dark", ["gallery:mosaic", "about@alt", "contact", "footer"], "sharp", 2, ["fade", "zoom"]],
  ["onepage", "One page", "light", "split", "alt", ["stats@dark", "about", "features@alt", "gallery", "pricing@tint", "testimonials", "faq@alt", "map", "contact", "footer"], "soft", 0, ["rise", "rise"]],
  ["links", "Link page", "", "center", "photo", ["features", "gallery@alt", "footer"], "round", 3, ["zoom", "rise"]],
  ["reviews", "Reviews first", "light", "cover", "", ["testimonials@accent", "features", "pricing@tint", "contact", "footer"], "soft", 0, ["fade", "rise"]],
  ["contact", "Contact first", "light", "left", "tint", ["contact", "about@alt", "gallery", "map", "footer"], "sharp", 2, ["rise", "rise"]],
  ["magazine", "Magazine", "light", "minimal", "", ["gallery@alt", "features:list", "testimonials:single", "contact", "footer"], "sharp", 4, ["fade", "rise"]],
  ["banner", "Wide banner", "dark", "banner", "alt", ["about", "features:numbers@tint", "testimonials", "pricing@alt", "contact", "footer"], "soft", 1, ["rise", "rise"]],
  ["photocard", "Photo card", "light", "card", "", ["features", "team@accent", "faq", "contact", "footer"], "round", 2, ["fade", "pop"]],
  ["leftpic", "Picture left", "dark", "left", "dark", ["about", "products@alt", "testimonials:single", "contact", "footer"], "soft", 3, ["fade", "pan"]],
  ["mosaic", "Mosaic", "light", "center", "tint", ["gallery:mosaic", "about@alt", "contact", "footer"], "sharp", 1, ["rise", "zoom"]],
  ["steps", "Steps", "light", "split", "", ["features:numbers@alt", "about", "timeline@alt", "testimonials", "faq@alt", "contact", "footer"], "round", 0, ["rise", "rise"]],
  ["bigquote", "Big quote", "light", "cover", "", ["testimonials:single@tint", "features:list", "pricing@alt", "contact", "footer"], "soft", 4, ["zoom", "fade"]],
  ["editorial", "Editorial", "light", "minimal", "", ["about@alt", "gallery", "team@tint", "contact", "footer"], "sharp", 1, ["fade", "pan"]],
  ["studio", "Studio", "dark", "card", "", ["gallery:mosaic@dark", "testimonials", "contact", "footer"], "soft", 2, ["fade", "zoom"]],
  ["brochure", "Brochure", "primary", "banner", "tint", ["features:list", "about@alt", "gallery", "map", "contact", "footer"], "round", 3, ["rise", "rise"]],
  ["pitch", "Pitch", "light", "left", "", ["features:numbers", "pricing@alt", "testimonials:single", "faq", "contact", "footer"], "soft", 0, ["rise", "pop"]],
  ["multi", "Three pages", "light", "split", "", ["features@alt", "testimonials", "contact", "footer"], "soft", 0, ["fade", "rise"], [["About", ["about", "team"]], ["Services", ["pricing", "faq"]]]],
  ["multifolio", "Portfolio pages", "light", "card", "", ["gallery:mosaic", "testimonials:single@alt", "footer"], "round", 2, ["zoom", "zoom"], [["Work", ["gallery", "about"]], ["Contact", ["contact", "map"]]]],
  ["multishop", "Shop pages", "light", "banner", "primary", ["products", "features:list@alt", "footer"], "soft", 3, ["rise", "pop"], [["About", ["about", "timeline"]], ["Help", ["faq", "contact"]]]],
  // Round 5 (photo-led Canva pattern): new compositions
  ["darkcover", "Dark cover", "dark", "cover", "", ["features@dark", "gallery", "testimonials@accent", "contact", "footer"], "sharp", 0, ["zoom", "rise"]],
  ["colorblock", "Colour block", "primary", "split", "primary", ["gallery", "about@alt", "contact", "footer"], "sharp", 3, ["fade", "zoom"]],
  ["bold", "Bold type", "", "minimal", "primary", ["gallery:mosaic", "about@alt", "contact", "footer"], "sharp", 0, ["rise", "zoom"]],
  ["stats", "Big numbers", "light", "cover", "", ["stats@primary", "about", "testimonials@alt", "contact", "footer"], "round", 0, ["zoom", "pop"]],
  ["shopfront", "Shop front", "light", "center", "alt", ["products", "testimonials@tint", "faq", "contact", "footer"], "round", 3, ["fade", "pop"]],
  ["luxe", "Luxe", "dark", "minimal", "dark", ["about", "gallery:mosaic@alt", "contact", "footer"], "sharp", 4, ["fade", "fade"]],
  ["agency", "Agency", "dark", "left", "primary", ["features:numbers", "gallery:mosaic@accent", "testimonials", "contact", "footer"], "sharp", 0, ["rise", "rise"]],
  ["menu", "Menu card", "light", "card", "", ["pricing@accent", "gallery", "map", "contact", "footer"], "round", 1, ["fade", "pop"]],
  ["booking", "Booking", "light", "split", "alt", ["timeline", "about@alt", "pricing@tint", "testimonials", "faq@alt", "contact", "footer"], "soft", 2, ["rise", "rise"]],
  ["spotlight", "Spotlight", "dark", "banner", "dark", ["team", "about@alt", "contact", "footer"], "soft", 0, ["zoom", "rise"]],
  ["trust", "Trust", "light", "split", "", ["testimonials@accent", "features", "contact", "footer"], "round", 1, ["fade", "rise"]],
  ["feature", "Feature list", "light", "cover", "", ["features:list", "gallery@alt", "contact", "footer"], "soft", 3, ["fade", "pan"]],
  ["tour", "Tour", "light", "left", "alt", ["gallery", "about@tint", "pricing", "contact", "footer"], "round", 0, ["fade", "zoom"]],
  ["pro", "Professional", "primary", "left", "", ["about@alt", "features", "testimonials@tint", "contact", "footer"], "soft", 4, ["rise", "pan"]],
  ["vivid", "Vivid", "light", "center", "primary", ["gallery", "features@accent", "contact", "footer"], "round", 0, ["pop", "zoom"]],
  ["calm", "Calm", "light", "minimal", "tint", ["team", "about@alt", "contact", "footer"], "round", 1, ["fade", "fade"]],
  ["photowall", "Photo wall", "", "card", "", ["gallery", "about@alt", "contact", "footer"], "sharp", 2, ["fade", "zoom"]],
  ["local", "Local", "primary", "card", "", ["about", "gallery@alt", "map", "contact", "footer"], "soft", 1, ["fade", "rise"]],
  ["duo", "Duo", "light", "split", "dark", ["products@alt", "features", "contact", "footer"], "soft", 0, ["fade", "pop"]],
  ["night", "Night", "dark", "center", "photo", ["stats@dark", "gallery", "contact", "footer"], "sharp", 3, ["zoom", "rise"]],
];
// Content themes (own text). h = 3 hero [headline, line]; ab = about [title, text]; f = feature cards [icon, title,
// text]; st = numbers [value, label]; p = packages [name, price, per, text, features]; pr = products [name, price,
// text]; q = reviews [quote, name, place]; a = FAQ [q, a]; s = steps [when, title, text]; t = team [name, role];
// g = gallery captions; ct = contact [title, text]; T = section titles; ph = photo topics [hero, about, gallery,
// team, products] (words the photo library ranks by).
const THEMES = [
  { id: "repairs", label: "Home repairs", section: "Business", tags: ["services", "plumber", "electrician", "ac"], brand: "FixRight", eye: "Same-day visits", cta: "Book a visit",
    h: [["Home repairs done right, the same day", "AC service, plumbing and electrical work by trained technicians with fixed prices."], ["Your home, fixed by people you trust", "Verified technicians, clear prices and a 30-day warranty on every job."], ["Fast repairs for busy families", "Book a slot on WhatsApp and we arrive on time, tools in hand."]],
    ab: ["Two brothers, twenty technicians", "Started by two brothers in 2018, FixRight now has 20 technicians and thousands of happy homes."], f: [["shield", "Verified team", "Every technician is trained and carries an ID card."], ["clock", "On time", "We arrive in your time slot."], ["check", "Fixed prices", "You see the price before we start."], ["award", "30-day warranty", "Same problem again? We fix it free."]],
    st: [["4,800+", "Homes fixed"], ["30 days", "Warranty on every job"], ["4.9 / 5", "Customer rating"]],
    p: [["AC service", "Rs 2,500", "/ unit", "Deep clean and gas check.", ["Indoor and outdoor wash", "Cooling test"]], ["Home check-up", "Rs 6,000", "/ visit", "Most popular.", ["Wiring check", "Leak check", "Small fixes"]], ["Plumbing visit", "Rs 1,500", "/ visit", "Leaks and taps.", ["Diagnosis", "Tap repair"]]],
    pr: [["Tool kit", "Rs 3,500", "Everything for small fixes."], ["Filter pack", "Rs 900", "AC filters, set of two."], ["Smart plug", "Rs 1,800", "Switch it from your phone."]],
    q: [["Cooling again within an hour. Fair price.", "Hina A.", "Lahore"], ["They found a leak others missed.", "Bilal K.", "Karachi"], ["Booked at 9, fixed by noon.", "Saima R.", "Multan"]], a: [["Which areas do you cover?", "All parts of the city, seven days a week."], ["How do I pay?", "Cash or bank transfer after the work is done."], ["Do you bring parts?", "Yes, at market price with a receipt."]],
    s: [["Step 1", "Book a slot", "On WhatsApp or the form."], ["Step 2", "We visit", "A technician arrives on time."], ["Step 3", "Pay when happy", "Only after the job is done."]], t: [["Usman", "Head technician"], ["Faisal", "AC expert"], ["Nadia", "Customer care"]], g: ["AC service", "Kitchen tap", "New wiring", "Water heater", "Ceiling fan", "Bathroom"],
    ct: ["Book a visit", "Message us on WhatsApp or send the form. We confirm your slot within minutes."], T: { p: "Services and prices" }, ph: ["interior home house sofa living", "interior home house", "interior home house sofa living", "interior home", "interior home house"] },
  { id: "restaurant", label: "Restaurant", section: "Food and drink", tags: ["food", "menu", "dinner", "booking"], brand: "Ember Grill", eye: "Open daily · 12pm to midnight", cta: "Book a table",
    h: [["Charcoal grills and warm family dinners", "Slow-cooked food, fresh bread from the oven and a table waiting for you."], ["Fire, smoke and food worth the wait", "Every dish cooked to order over real charcoal."], ["Dinner the whole family will love", "Big platters, warm bread and room for everyone."]],
    ab: ["A family kitchen since 2009", "Ember Grill began as a small family kitchen. We still grind our spices every morning and cook every dish to order."], f: [["leaf", "Fresh every day", "Meat and vegetables bought each morning."], ["heart", "Family recipes", "Dishes passed down for three generations."], ["truck", "Home delivery", "Hot food within 5 km."], ["star", "Party hall", "Room for 60 guests upstairs."]],
    st: [["15 years", "Of charcoal cooking"], ["60", "Seats in the party hall"], ["4.8 / 5", "Guest rating"]],
    p: [["Dinner for two", "Rs 3,200", "", "A quiet night out.", ["Grill platter", "Bread and salad", "2 drinks"]], ["Family feast", "Rs 7,900", "", "Feeds 4 to 5.", ["Mixed grill", "Rice platter", "Dessert"]], ["Lunch deal", "Rs 1,200", "", "Weekdays 12 to 4.", ["Main dish", "Bread", "Drink"]]],
    pr: [["Spice box", "Rs 1,500", "Our house grill spices."], ["Gift card", "Rs 5,000", "Dinner for someone special."], ["Ember mug", "Rs 900", "For the tea after dinner."]],
    q: [["The best grill we have had in years.", "Ahmed and Sana", "Family dinner"], ["Warm staff and great value deals.", "Mariam T.", "Food blogger"], ["Our office lunch spot every Friday.", "Kamran J.", "Regular guest"]], a: [["Do you take bookings?", "Yes, send the date, time and number of guests."], ["Is everything halal?", "Yes, all our meat is halal."], ["Is there parking?", "Free parking in front."]],
    s: [["12pm", "Lunch opens", "Weekday lunch deals."], ["7pm", "Grill starts", "Fresh from the coals."], ["Midnight", "Last orders", "Dessert and tea."]], t: [["Chef Rauf", "Head chef"], ["Amna", "Pastry"], ["Bilal", "Front of house"]], g: ["Mixed grill", "Fresh bread", "Rice platter", "Dessert", "Mint sauce", "Tea"],
    ct: ["Book a table", "Tell us the date, time and number of guests. We confirm within minutes."], T: { p: "Menu deals", g: "From our kitchen" }, ph: ["restaurant dining dinner banquet", "restaurant kitchen chef cooking", "food dish meal plate restaurant", "restaurant kitchen chef dining", "spices spice cardamom naan bread food"] },
  { id: "cafe", label: "Cafe and bakery", section: "Food and drink", tags: ["coffee", "bakery", "cakes", "tea"], brand: "Morning Crumb", eye: "Fresh bakes from 8am", cta: "Order a cake",
    h: [["Good coffee and fresh bakes every morning", "Croissants, cakes and slow coffee in a quiet corner of the city."], ["Your new favourite coffee corner", "Small-batch coffee, warm pastries and big tables to work at."], ["Baked before sunrise, gone by noon", "Real butter, real flour and coffee roasted every week."]],
    ab: ["Baked in small batches", "We bake everything in our own kitchen before sunrise, in small batches, with real butter."], f: [["cup", "Slow coffee", "Beans roasted in small batches."], ["heart", "Baked today", "Nothing frozen, ever."], ["leaf", "Quiet corner", "Free Wi-Fi and big tables."], ["cart", "Cakes to order", "Birthday cakes in two days."]],
    st: [["300+", "Croissants a day"], ["12", "Coffees on the menu"], ["2 days", "For a custom cake"]],
    p: [["Coffee and croissant", "Rs 850", "", "Morning deal.", ["Any coffee", "Butter croissant"]], ["Birthday cake", "Rs 3,500", "/ kg", "Made to order.", ["Your message", "Candles", "Box"]], ["Tea for two", "Rs 1,400", "", "Afternoon treat.", ["Pot of tea", "Two cakes"]]],
    pr: [["Coffee beans", "Rs 1,900", "House blend, 250 g."], ["Cookie box", "Rs 1,200", "Twelve cookies, mixed."], ["Cafe mug", "Rs 950", "Glazed stoneware."], ["Banana bread", "Rs 800", "Whole loaf, baked today."]],
    q: [["Best croissant in town, still warm.", "Zainab H.", "Regular"], ["The birthday cake was beautiful.", "Omar F.", "Customer"], ["My favourite place to work.", "Sara M.", "Writer"]], a: [["Do you deliver?", "Yes, cakes and boxes within the city."], ["Any sugar-free options?", "Yes, ask for the daily list."], ["Can I book a table?", "Weekends only, on WhatsApp."]],
    s: [["5am", "Baking starts", "Bread and pastry."], ["8am", "Doors open", "Coffee is ready."], ["6pm", "Last cakes", "Half price after six."]], t: [["Mehak", "Baker"], ["Hamza", "Barista"], ["Rida", "Cakes"]], g: ["Croissants", "Latte", "Cheesecake", "Bread", "Cookies", "Tea"],
    ct: ["Order a cake", "Tell us the date, the size and your message. We bake it fresh."], T: { p: "Morning menu", pr: "Take home" }, ph: ["coffee cafe latte espresso", "cafe coffee latte", "coffee cafe breakfast brunch dessert", "coffee cafe", "coffee beans cup"] },
  { id: "clinic", label: "Clinic", section: "Health and fitness", tags: ["doctor", "health", "dental", "medical"], brand: "CarePoint Clinic", eye: "Family doctors · open 7 days", cta: "Book an appointment",
    h: [["Caring doctors for the whole family", "General check-ups, children's health and dental care with short waiting times."], ["Health care that listens first", "Experienced doctors, clean rooms and appointments that start on time."], ["See a doctor today, not next week", "Same-day appointments for adults and children, seven days a week."]],
    ab: ["A small clinic with time for you", "CarePoint is a small family clinic with experienced doctors who take time to listen."], f: [["heart", "Family care", "Doctors for all ages."], ["clock", "Short waits", "Most patients seen in 15 minutes."], ["shield", "Clean and safe", "Strict hygiene in every room."], ["phone", "Online booking", "Pick a time on WhatsApp."]],
    st: [["15 min", "Average waiting time"], ["7 days", "Open every week"], ["20,000+", "Patients seen"]],
    p: [["General check-up", "Rs 2,000", "", "With a doctor.", ["Blood pressure", "Advice"]], ["Child health", "Rs 2,500", "", "For under 12s.", ["Growth check", "Vaccines plan"]], ["Dental clean", "Rs 4,000", "", "With polish.", ["Scale and polish", "X-ray if needed"]]],
    pr: [["First aid kit", "Rs 2,200", "For home and car."], ["Vitamins", "Rs 1,100", "One month, daily."], ["Health book", "Rs 600", "Keep every report together."]],
    q: [["The doctor explained everything calmly.", "Farah N.", "Patient"], ["Short wait and friendly staff.", "Tariq S.", "Patient"], ["Great with my children.", "Nida A.", "Mother of two"]], a: [["Do I need an appointment?", "Walk-ins are welcome, bookings are faster."], ["Do you take insurance?", "Yes, most panels are accepted."], ["Is there a lady doctor?", "Yes, every day."]],
    s: [["Step 1", "Book a time", "On WhatsApp or by phone."], ["Step 2", "See the doctor", "Bring old reports."], ["Step 3", "Follow up", "We call after a week."]], t: [["Dr. Amina", "Family doctor"], ["Dr. Kashif", "Children"], ["Dr. Saba", "Dentist"]], g: ["Reception", "Check-up room", "Dental chair", "Kids corner", "Pharmacy", "Lab"],
    ct: ["Book an appointment", "Pick a time on WhatsApp or call the front desk."], T: { p: "Consultations", t: "Our doctors" }, ph: ["medical clinic hospital doctor", "medical hospital clinic health", "medical clinic health healthcare", "medical doctor clinic", "medical pills medicine pharmacy"] },
  { id: "academy", label: "Academy", section: "Education", tags: ["school", "tuition", "courses", "teacher"], brand: "Bright Minds Academy", eye: "Admissions open", cta: "Book a free class",
    h: [["Better grades with small classes", "Maths, science and English tuition in groups of 12 with weekly tests."], ["Clear teaching, confident students", "Specialist teachers, weekly tests and a monthly report for parents."], ["Get ready for exams with a plan", "Past papers, mock exams and help with every weak topic."]],
    ab: ["Teachers who notice every student", "Our teachers have taught for over ten years. Parents get a report every month."], f: [["book", "Small classes", "12 students at most."], ["check", "Weekly tests", "Progress you can see."], ["chat", "Parent reports", "Monthly meetings."], ["award", "Top results", "9 in 10 improve a grade."]],
    st: [["12", "Students per class"], ["9 in 10", "Improve a grade"], ["10+ years", "Teaching experience"]],
    p: [["One subject", "Rs 4,000", "/ month", "Three classes a week.", ["Notes", "Weekly test"]], ["Three subjects", "Rs 10,000", "/ month", "Best value.", ["Notes", "Tests", "Parent report"]], ["Exam crash course", "Rs 8,000", "", "Six weeks.", ["Past papers", "Mock exams"]]],
    pr: [["Notes pack", "Rs 1,500", "Every topic, one folder."], ["Past papers", "Rs 900", "Ten years, solved."], ["Academy bag", "Rs 1,800", "Strong and waterproof."]],
    q: [["My son went from C to A in maths.", "Mrs. Rehman", "Parent"], ["Teachers really care.", "Ali H.", "Student"], ["Clear notes and fair fees.", "Mr. Qureshi", "Parent"]], a: [["Which classes?", "Grades 6 to 12."], ["Online classes?", "Yes, on weekends."], ["Free trial?", "Yes, one free class."]],
    s: [["Week 1", "Placement test", "We find the right group."], ["Weekly", "Classes and tests", "Three days a week."], ["Monthly", "Parent meeting", "Report and plan."]], t: [["Sir Imran", "Maths"], ["Miss Hira", "English"], ["Sir Waqas", "Science"]], g: ["Classroom", "Library", "Science lab", "Prize day", "Study hall", "Sports"],
    ct: ["Book a free class", "Tell us the grade and subjects. We call back the same day."], T: { p: "Monthly fees", t: "Our teachers" }, ph: ["education classroom study school", "education library books study", "education classroom school study university", "education study books", "education books library"] },
  { id: "boutique", label: "Boutique", section: "Shops", tags: ["fashion", "clothes", "shop", "handmade"], brand: "Thread and Bloom", eye: "New collection", cta: "Shop now",
    h: [["Handmade clothes with a modern touch", "Small batches, soft fabrics and hand embroidery. Order on WhatsApp."], ["The summer collection is here", "Light cottons and soft colours, stitched by hand."], ["Made slowly, worn for years", "Every piece checked by hand before it reaches you."]],
    ab: ["Stitched by local artisans", "Every piece is stitched by local artisans and checked by hand before it reaches you."], f: [["heart", "Handmade", "Made by local artisans."], ["truck", "Free delivery", "On orders over Rs 5,000."], ["check", "Easy exchange", "Within 7 days."], ["star", "Gift wrap", "Free on request."]],
    st: [["40", "Artisans we work with"], ["7 days", "Easy exchange"], ["3,000+", "Happy customers"]],
    p: [["Ready to wear", "Rs 4,500", "", "Standard sizes.", ["S to XL", "Ships in 2 days"]], ["Made to measure", "Rs 7,500", "", "Your size.", ["Custom fit", "Ships in 7 days"]], ["Bridal", "Rs 45,000", "", "By appointment.", ["Design meeting", "Two fittings"]]],
    pr: [["Silk scarf", "Rs 2,400", "Hand block-printed."], ["Cotton shirt", "Rs 3,200", "Soft and breathable."], ["Tote bag", "Rs 1,600", "With hand embroidery."], ["Summer kurta", "Rs 3,900", "Light lawn cotton."]],
    q: [["The embroidery is beautiful.", "Hira K.", "Customer"], ["Fast delivery and lovely packing.", "Sana M.", "Customer"], ["Fits perfectly.", "Aleena R.", "Customer"]], a: [["How do I order?", "Tap Order and send us a message."], ["Cash on delivery?", "Yes, everywhere."], ["Do you ship abroad?", "Yes, ask for rates."]],
    s: [["Day 1", "Order", "Send your size."], ["Day 2", "Stitching", "Checked by hand."], ["Day 4", "Delivery", "Pay on delivery."]], t: [["Saima", "Designer"], ["Rukhsana", "Embroidery"], ["Adeel", "Orders"]], g: ["Summer lawn", "Silk scarf", "Kurta", "Shawl", "Bridal", "Kids"],
    ct: ["Ask about an order", "Sizes, colours or a custom piece: message us and we reply within the hour."], T: { pr: "New arrivals", p: "Ways to order" }, ph: ["fashion dresses clothes boutique", "fashion textiles clothes", "fashion boutique clothes dresses shoes", "fashion boutique", "fashion shoes clothes dresses"] },
  { id: "designer", label: "Designer portfolio", section: "Portfolio and resume", tags: ["portfolio", "designer", "freelancer", "creative"], brand: "Maya Studio", eye: "Graphic designer", cta: "Start a project",
    h: [["I design brands people remember", "Logos, packaging and social posts for small businesses that want to stand out."], ["Bold design for brave small brands", "Identity, packaging and websites that look as good as your product."], ["Good design is good business", "Clear logos, smart packaging and posts your team can reuse."]],
    ab: ["Hello, I'm Maya", "I have worked with 60 small brands in eight years. I keep things simple, bold and useful."], f: [["star", "Brand identity", "Logo, colours and fonts."], ["camera", "Social posts", "Templates your team can reuse."], ["cart", "Packaging", "Boxes and labels that sell."], ["code", "Websites", "Simple one-page sites."]],
    st: [["60+", "Brands designed"], ["8 years", "Of client work"], ["2 weeks", "Average logo project"]],
    p: [["Logo", "Rs 25,000", "", "Two rounds.", ["3 ideas", "Final files"]], ["Brand kit", "Rs 60,000", "", "Most popular.", ["Logo", "Colours and fonts", "Templates"]], ["Monthly posts", "Rs 30,000", "/ month", "12 posts.", ["Designs", "Captions help"]]],
    pr: [["Poster print", "Rs 2,500", "A3, museum paper."], ["Sticker pack", "Rs 600", "Ten designs."], ["Sketchbook", "Rs 1,200", "Dotted pages."]],
    q: [["Maya understood our brand at once.", "Owner", "Tea shop"], ["Fast, clear and creative.", "Founder", "Skincare brand"], ["Our sales went up after the new packaging.", "Manager", "Snack company"]], a: [["How long does a logo take?", "About two weeks."], ["Do you work remotely?", "Yes, with clients everywhere."], ["What do I get?", "All files in print and web sizes."]],
    s: [["Week 1", "Brief and ideas", "We talk and I sketch."], ["Week 2", "Design", "Two rounds of changes."], ["Week 3", "Hand over", "All files, ready to use."]], t: [["Maya", "Designer"], ["Zoya", "Illustrator"], ["Ali", "Web"]], g: ["Tea brand", "Bakery box", "Poster", "App icon", "Menu", "Label"],
    ct: ["Start a project", "Tell me about your brand and your deadline. I reply within one working day."], T: { g: "Selected work", f: "What I do" }, ph: ["workspace creative design", "workspace laptop coworking", "abstract creative design pattern", "workspace coworking", "pencils notebook pen"] },
  { id: "photographer", label: "Photographer", section: "Portfolio and resume", tags: ["photography", "photos", "portfolio", "events"], brand: "Lens and Light", eye: "Weddings · portraits · products", cta: "Check my dates",
    h: [["Photos you will keep for a lifetime", "Natural, honest photography for weddings, families and small brands."], ["Real moments, beautifully kept", "Relaxed shoots, hand-edited galleries and prints that last."], ["Your story, told in pictures", "Weddings, portraits and products, shot with care."]],
    ab: ["Quiet moments and real smiles", "I love quiet moments and real smiles. Every gallery is edited by hand."], f: [["camera", "Weddings", "Full-day coverage."], ["heart", "Families", "Relaxed outdoor shoots."], ["cart", "Products", "Clean shots that sell."], ["clock", "Fast delivery", "Previews in 48 hours."]],
    st: [["250+", "Weddings photographed"], ["48 h", "Preview delivery"], ["100%", "Edited by hand"]],
    p: [["Portrait session", "Rs 15,000", "", "One hour.", ["30 edited photos", "Online gallery"]], ["Wedding day", "Rs 120,000", "", "Full day.", ["600 photos", "Album", "Second shooter"]], ["Product shoot", "Rs 20,000", "", "Up to 20 items.", ["White background", "Lifestyle shots"]]],
    pr: [["Photo print", "Rs 1,500", "A4, matte paper."], ["Album", "Rs 12,000", "40 pages, linen cover."], ["Frame", "Rs 3,000", "Oak, with glass."]],
    q: [["Every photo made us smile.", "Ayesha and Hamid", "Wedding"], ["Our menu photos look amazing.", "Owner", "Cafe"], ["So easy with the kids.", "Rabia", "Family shoot"]], a: [["Do you travel?", "Yes, anywhere in the country."], ["When do we get photos?", "Previews in 48 hours, all in 3 weeks."], ["Can we print them?", "Yes, full-size files."]],
    s: [["Before", "Plan together", "Places and times."], ["The day", "The shoot", "Relaxed and natural."], ["After", "Your gallery", "Edited by hand."]], t: [["Danish", "Photographer"], ["Iqra", "Second shooter"], ["Fahad", "Editor"]], g: ["Wedding", "Portrait", "Family", "Product", "Street", "Landscape"],
    ct: ["Check my dates", "Send your date and city. I reply with availability and a quote."], T: { g: "Recent work", p: "Sessions", f: "What I photograph" }, ph: ["landscape mountains valley lake", "landscape hills mountains", "landscape mountains sea city flowers lake", "landscape nature", "landscape mountains"] },
  { id: "conference", label: "Conference", section: "Events and weddings", tags: ["event", "conference", "tickets", "speakers"], brand: "Build Summit", eye: "14 March 2027 · Expo Hall", cta: "Get a ticket",
    h: [["One day of ideas for people who build", "Talks, workshops and a market of local makers. Come to learn and meet."], ["Build Summit 2027", "Twenty talks, eight workshops and the people you want to meet."], ["Learn from people who ship", "Practical talks by founders, designers and engineers."]],
    ab: ["Practical talks, real people", "Build Summit brings together founders, makers and students for a day of practical talks."], f: [["chat", "20 talks", "Short and practical."], ["bolt", "8 workshops", "Hands-on sessions."], ["star", "Maker market", "40 local stalls."], ["heart", "Meet people", "Lunch and evening meet-up."]],
    st: [["1,500", "People attending"], ["20", "Speakers"], ["8", "Hands-on workshops"]],
    p: [["Student", "Rs 1,500", "", "With student card.", ["All talks", "Lunch"]], ["Standard", "Rs 4,000", "", "Most popular.", ["All talks", "Workshops", "Lunch"]], ["Team of 5", "Rs 16,000", "", "Save 20%.", ["5 passes", "Reserved table"]]],
    pr: [["Summit tee", "Rs 1,800", "Soft cotton."], ["Tote bag", "Rs 1,200", "Canvas, with logo."], ["Notebook", "Rs 700", "For your ideas."]],
    q: [["The best event I went to last year.", "Hassan", "Founder"], ["Practical talks, great people.", "Mahnoor", "Designer"], ["Our team learned so much.", "Kashif", "Team lead"]], a: [["Is lunch included?", "Yes, for all ticket types."], ["Can I get a refund?", "Up to 7 days before."], ["Is there parking?", "Yes, at Gate 2."]],
    s: [["9:00", "Doors open", "Tea and badges."], ["10:00", "Talks", "Main hall."], ["14:00", "Workshops", "Rooms 1 to 4."]], t: [["Sana Javed", "Speaker"], ["Omar Khan", "Speaker"], ["Lina Shah", "Host"]], g: ["Main hall", "Workshop", "Market", "Panel", "Lunch", "Meet-up"],
    ct: ["Questions or group tickets?", "Schools and companies get 15% off for 10 or more tickets."], T: { p: "Tickets", s: "Schedule", t: "Speakers", f: "What to expect" }, ph: ["conference seminar auditorium meeting", "meeting conference boardroom", "conference meeting seminar event", "meeting conference boardroom seminar", "conference seminar"] },
  { id: "realestate", label: "Real estate", section: "Business", tags: ["property", "homes", "agent", "rent"], brand: "Keystone Homes", eye: "Homes to buy and rent", cta: "Book a viewing",
    h: [["Find a home that fits your family", "Checked listings, honest advice and help with every paper."], ["Homes you can trust, prices you can understand", "We visit every listing ourselves before you do."], ["Buy, rent or sell with less stress", "One agent, clear fees and help from first viewing to keys."]],
    ab: ["Twelve years of happy moves", "Keystone has helped families buy and rent homes for 12 years. We check every listing ourselves."], f: [["shield", "Checked listings", "We visit every home."], ["pin", "Good areas", "Near schools and markets."], ["check", "Clear papers", "We help with documents."], ["phone", "Quick viewings", "Same-week visits."]],
    st: [["900+", "Families moved"], ["12 years", "In the city"], ["1%", "Simple fee"]],
    p: [["Rent help", "1 month", "", "Our fee.", ["Viewings", "Agreement"]], ["Buy help", "1%", "", "Of the price.", ["Viewings", "Papers", "Transfer"]], ["Sell with us", "1%", "", "When sold.", ["Photos", "Listing", "Viewings"]]],
    pr: [["3-bed family house", "Rs 4.2 crore", "DHA Phase 6, near a park."], ["2-bed apartment", "Rs 1.8 crore", "Gulberg, lift and parking."], ["Studio to rent", "Rs 65,000 / month", "Furnished, all bills."]],
    q: [["Found our home in two weeks.", "The Siddiquis", "Buyers"], ["Honest and patient agent.", "Rameez", "Tenant"], ["Sold quickly at a fair price.", "Mrs. Aslam", "Seller"]], a: [["Do you charge for viewings?", "No, viewings are free."], ["Which areas?", "Most of the city."], ["Can you help with loans?", "We can connect you to banks."]],
    s: [["Step 1", "Tell us your needs", "Budget and area."], ["Step 2", "View homes", "We arrange visits."], ["Step 3", "Move in", "We handle the papers."]], t: [["Adnan", "Agent"], ["Fatima", "Agent"], ["Zubair", "Legal help"]], g: ["Family house", "Apartment", "Garden", "Kitchen", "Living room", "Street"],
    ct: ["Book a viewing", "Tell us your budget and area. We send matching homes the same day."], T: { pr: "Featured homes", p: "Our fees" }, ph: ["house property apartments real estate", "interior home sofa living", "interior house home property apartments", "interior home house", "house property apartments real estate"] },
  { id: "travel", label: "Travel agency", section: "Travel", tags: ["travel", "tours", "trips", "holiday"], brand: "Northbound Tours", eye: "Small group trips", cta: "Plan my trip",
    h: [["Trips to the mountains, planned for you", "Hotels, transport and guides in one simple price. Leave every Friday."], ["Lakes, valleys and clear skies", "Small group tours to the north with guides who know every road."], ["Your next holiday starts here", "Weekend breaks and long tours, planned down to the last cup of tea."]],
    ab: ["Safe trips since 2015", "Northbound has run safe, friendly tours to the northern valleys since 2015."], f: [["truck", "Comfortable travel", "Clean coasters with drivers."], ["shield", "Safe trips", "Trained guides and first aid."], ["star", "Good hotels", "Checked rooms with heating."], ["heart", "Family friendly", "Kids under 5 travel free."]],
    st: [["5,000+", "Travellers"], ["11 years", "On northern roads"], ["4.9 / 5", "Trip rating"]],
    p: [["Weekend trip", "Rs 28,000", "/ person", "3 days.", ["Hotel", "Transport", "Breakfast"]], ["Valley tour", "Rs 55,000", "/ person", "6 days.", ["Hotels", "Guide", "All meals"]], ["Honeymoon", "Rs 140,000", "/ couple", "5 days.", ["Private car", "Lake view room"]]],
    pr: [["Hunza week", "Rs 62,000", "7 days, small group."], ["Swat weekend", "Rs 26,000", "3 days, family friendly."], ["Skardu lakes", "Rs 74,000", "8 days, with flights."]],
    q: [["Everything was taken care of.", "Fahad and Maria", "Honeymoon"], ["Our kids loved it.", "Mr. Tariq", "Family trip"], ["Great guide, great food.", "Sobia", "Valley tour"]], a: [["What should I pack?", "We send a packing list."], ["Can I pay in parts?", "Yes, 50% to book."], ["Are trips safe?", "Yes, we check routes daily."]],
    s: [["Day 1", "Leave the city", "Morning pick-up."], ["Day 2", "Lakes and valleys", "Easy walks."], ["Day 3", "Back home", "Evening drop-off."]], t: [["Waleed", "Lead guide"], ["Mahira", "Trip planner"], ["Jawad", "Driver"]], g: ["Lake", "Mountains", "Hotel", "Campfire", "Valley", "Waterfall"],
    ct: ["Plan my trip", "Tell us your dates and group size. We send a plan and price within a day."], T: { pr: "Popular trips", p: "Tour prices" }, ph: ["beach resort holiday trip journey", "road journey trip", "mountains valley lake beach hunza resort", "holiday trip journey", "mountains valley hunza resort beach"] },
  { id: "startup", label: "Tech startup", section: "Business", tags: ["app", "software", "saas", "startup"], brand: "Ledgerly", eye: "New · for small teams", cta: "Start free",
    h: [["Invoices and payments in one simple app", "Send invoices, get paid faster and see your cash at a glance."], ["Get paid twice as fast", "Smart reminders and one-tap payment links for every invoice."], ["Money admin, finally simple", "Invoices, reminders and reports your whole team understands."]],
    ab: ["Built by people who ran shops", "Ledgerly is built by a small team that ran shops and knows the pain of chasing payments."], f: [["bolt", "Fast invoices", "Send one in a minute."], ["chat", "Reminders", "Polite automatic follow-ups."], ["shield", "Secure", "Encrypted and backed up."], ["check", "Reports", "Cash flow on one screen."]],
    st: [["12,000", "Invoices sent a month"], ["2x", "Faster payments"], ["99.9%", "Uptime"]],
    p: [["Free", "Rs 0", "/ month", "Up to 10 invoices.", ["1 user", "Email support"]], ["Team", "Rs 2,500", "/ month", "Most popular.", ["5 users", "Reminders", "Reports"]], ["Business", "Rs 6,000", "/ month", "Growing teams.", ["Unlimited users", "Priority help"]]],
    pr: [["Team plan", "Rs 2,500", "Per month, 5 users."], ["Setup call", "Rs 5,000", "We import your data."], ["Card reader", "Rs 9,500", "Take card payments."]],
    q: [["We get paid twice as fast now.", "Owner", "Print shop"], ["Simple enough for my whole team.", "Manager", "Agency"], ["The reports save me hours.", "Accountant", "Retail"]], a: [["Is there a free plan?", "Yes, free forever for small use."], ["Can I cancel?", "Any time, no fees."], ["Is my data safe?", "Yes, encrypted and backed up daily."]],
    s: [["Minute 1", "Sign up", "No card needed."], ["Minute 5", "Send an invoice", "From your phone."], ["Day 2", "Get paid", "Reminders do the rest."]], t: [["Hamza", "Founder"], ["Areeba", "Product"], ["Saad", "Engineering"]], g: ["Dashboard", "Invoice", "Reports", "Mobile app", "Reminders", "Team"],
    ct: ["Start free", "Create an account in a minute, or ask us for a demo."], T: { p: "Plans", f: "Everything in one place" }, ph: ["coworking workspace startup workplace", "coworking workplace startup workspace", "coworking workspace smartphone app", "coworking workplace workspace", "smartphone app workspace"] },
  { id: "salon", label: "Beauty salon", section: "Health and fitness", tags: ["salon", "beauty", "spa", "hair"], brand: "Glow Room", eye: "Hair · skin · nails", cta: "Book a slot",
    h: [["Relax, refresh and glow", "Hair, skin and nail care by friendly experts in a calm space."], ["Your calm hour of the week", "Facials, hair and nails with gentle, natural products."], ["Look good, feel even better", "Book a slot, sip some tea and leave glowing."]],
    ab: ["A small holiday every visit", "Glow Room is a calm, clean salon where every visit feels like a small holiday."], f: [["star", "Hair styling", "Cuts, colour and care."], ["heart", "Facials", "For every skin type."], ["leaf", "Natural products", "Gentle on skin."], ["clock", "No long waits", "Book a time slot."]],
    st: [["8,000+", "Happy clients"], ["12", "Beauty experts"], ["4.9 / 5", "Client rating"]],
    p: [["Haircut", "Rs 2,500", "", "With wash and style.", ["Consultation", "Blow dry"]], ["Glow facial", "Rs 4,500", "", "Most popular.", ["Cleanse", "Mask", "Massage"]], ["Bridal package", "Rs 35,000", "", "Full day.", ["Hair", "Makeup", "Nails"]]],
    pr: [["Face oil", "Rs 2,200", "Rose and almond, 30 ml."], ["Scented candle", "Rs 1,500", "Jasmine, 40 hours."], ["Gift card", "Rs 5,000", "For any treatment."]],
    q: [["My skin has never looked better.", "Areeba", "Client"], ["Calm, clean and friendly.", "Nimra", "Client"], ["Perfect bridal look.", "Hafsa", "Bride"]], a: [["Do I need to book?", "Booking is best, walk-ins if free."], ["Which products?", "Gentle, natural brands."], ["Bridal trials?", "Yes, one trial included."]],
    s: [["Step 1", "Book", "Pick a time on WhatsApp."], ["Step 2", "Relax", "Tea while you wait."], ["Step 3", "Glow", "Leave refreshed."]], t: [["Sadia", "Hair"], ["Mahnoor", "Skin"], ["Kiran", "Nails"]], g: ["Hair", "Facial", "Nails", "Makeup", "Spa room", "Products"],
    ct: ["Book a slot", "Choose a treatment and a time. We confirm on WhatsApp."], T: { p: "Treatments", t: "Our experts" }, ph: ["beauty salon makeup cosmetics", "beauty spa skincare perfume", "beauty makeup salon cosmetics", "beauty salon", "beauty perfume skincare cosmetics"] },
  { id: "consultant", label: "Consultant", section: "Business", tags: ["law", "finance", "tax", "advice"], brand: "Clearpath Advisors", eye: "Tax · accounts · company setup", cta: "Book a free call",
    h: [["Clear advice for your business money", "Tax returns, bookkeeping and company registration, explained in plain words."], ["Numbers you can finally trust", "Monthly accounts, on-time filing and advice without jargon."], ["Grow your business, we handle the paperwork", "Fixed fees for tax, accounts and company setup."]],
    ab: ["Chartered accountants since 2012", "We are a small team of chartered accountants helping founders and families since 2012."], f: [["check", "Tax returns", "Filed on time."], ["book", "Bookkeeping", "Monthly accounts."], ["shield", "Company setup", "Registration and papers."], ["chat", "Plain advice", "No jargon."]],
    st: [["400+", "Businesses advised"], ["14 years", "Of practice"], ["100%", "Returns filed on time"]],
    p: [["Personal tax", "Rs 8,000", "/ year", "Salaried people.", ["Return filing", "Advice call"]], ["Small business", "Rs 15,000", "/ month", "Most popular.", ["Bookkeeping", "Tax filing", "Reports"]], ["Company setup", "Rs 45,000", "", "One time.", ["Registration", "Bank account help"]]],
    pr: [["Tax guide", "Free", "For salaried people."], ["Planner", "Rs 1,200", "Monthly money planner."], ["Health check", "Rs 9,000", "A review of your accounts."]],
    q: [["They made tax simple for us.", "Founder", "Food startup"], ["Always on time.", "Owner", "Pharmacy"], ["Clear and patient advice.", "Doctor", "Private practice"]], a: [["Do you work online?", "Yes, fully online if you like."], ["What do I need?", "We send a simple checklist."], ["Fixed fees?", "Yes, agreed before we start."]],
    s: [["Step 1", "Free call", "We understand your needs."], ["Step 2", "Fixed quote", "No surprises."], ["Step 3", "We handle it", "You stay informed."]], t: [["Rizwan", "Partner"], ["Mehreen", "Tax"], ["Taimur", "Accounts"]], g: ["Office", "Meeting", "Reports", "Team", "Workshop", "Clients"],
    ct: ["Book a free call", "Tell us what you need. We reply with a fixed quote."], T: { p: "Fixed fees" }, ph: ["meeting business boardroom corporate", "meeting boardroom conference", "business corporate skyline finance", "meeting business", "pen notebook writing"] },
  { id: "musician", label: "Musician", section: "Portfolio and resume", tags: ["music", "band", "singer", "shows"], brand: "The Monsoon Band", eye: "Live music · new album out", cta: "Book the band",
    h: [["Songs for rainy evenings", "Live shows, new songs and bookings for weddings and events."], ["The new album is out now", "Ten new songs, recorded live in one room."], ["Live music that fills the room", "Acoustic sets, full band nights and wedding shows."]],
    ab: ["Four friends, one sound", "Four friends who started playing in a university hall and never stopped."], f: [["star", "Live shows", "Clubs, cafes and festivals."], ["heart", "Weddings", "Mehndi and reception sets."], ["bolt", "New album", "Out on all music apps."], ["chat", "Workshops", "Guitar and singing classes."]],
    st: [["300+", "Live shows"], ["2", "Albums"], ["1M+", "Streams"]],
    p: [["Acoustic set", "Rs 60,000", "", "1 hour, 2 players.", ["Sound check", "Own speakers"]], ["Full band", "Rs 150,000", "", "2 hours.", ["4 players", "Lights"]], ["Wedding night", "Rs 220,000", "", "3 hours.", ["Full band", "Requests"]]],
    pr: [["Band tee", "Rs 1,800", "Black cotton."], ["Vinyl record", "Rs 6,500", "The new album."], ["Tote bag", "Rs 1,000", "Canvas, printed."]],
    q: [["They made our mehndi magical.", "Hania", "Bride"], ["Amazing live energy.", "Organizer", "Music festival"], ["Booked them twice already.", "Owner", "Cafe"]], a: [["Do you travel?", "Yes, across the country."], ["Can we request songs?", "Yes, send us a list."], ["Do you bring sound?", "Yes, for up to 300 guests."]],
    s: [["Friday", "Cafe night", "Acoustic set."], ["Saturday", "Festival", "Main stage."], ["Sunday", "Workshop", "Guitar basics."]], t: [["Saad", "Vocals"], ["Mariam", "Keys"], ["Junaid", "Drums"]], g: ["Live", "Studio", "Festival", "Rehearsal", "Album", "Crowd"],
    ct: ["Book the band", "Send the date, city and kind of event. We reply with a quote."], T: { s: "Upcoming shows", p: "Bookings", pr: "Merch", f: "What we play" }, ph: ["concert music stage lights bokeh", "concert lights music stage bokeh", "concert lights music bokeh fireworks", "concert music lights bokeh", "concert music lights bokeh fireworks"] },
  { id: "gym", label: "Gym and fitness", section: "Health and fitness", tags: ["gym", "fitness", "workout", "training"], brand: "Iron Peak Gym", eye: "Open 6am to 11pm", cta: "Start a free week",
    h: [["Stronger every single week", "Modern machines, real coaches and classes that keep you coming back."], ["Train hard, feel amazing", "Strength, cardio and group classes under one roof."], ["Your first week is on us", "Try every class and machine free for seven days."]],
    ab: ["A gym that feels like a team", "Iron Peak opened in 2017 with one simple idea: every member gets a plan and a coach who checks in."], f: [["bolt", "Strength floor", "Racks, dumbbells and machines."], ["users", "Group classes", "30 classes every week."], ["award", "Personal coaching", "A plan made for you."], ["clock", "Long hours", "6am to 11pm, every day."]],
    st: [["2,000+", "Members"], ["30", "Classes a week"], ["17 hours", "Open every day"]],
    p: [["Monthly", "Rs 7,000", "/ month", "All machines.", ["Gym floor", "Lockers"]], ["Gold", "Rs 18,000", "/ 3 months", "Most popular.", ["Gym floor", "All classes", "Diet plan"]], ["Coaching", "Rs 25,000", "/ month", "One to one.", ["12 sessions", "Weekly check-in"]]],
    pr: [["Protein shaker", "Rs 900", "Leak-proof, 700 ml."], ["Gym towel", "Rs 1,200", "Quick dry."], ["Resistance bands", "Rs 2,400", "Set of five."]],
    q: [["Lost 8 kg and gained my confidence.", "Usman T.", "Member since 2023"], ["The coaches actually care.", "Ayesha K.", "Member"], ["Clean, busy and full of energy.", "Bilal R.", "Member"]], a: [["Is there a free trial?", "Yes, one free week."], ["Are there ladies' timings?", "Yes, every morning 10 to 1."], ["Can I freeze my plan?", "Yes, up to 30 days a year."]],
    s: [["Week 1", "Free trial", "Try every class."], ["Week 2", "Your plan", "A coach builds it with you."], ["Week 12", "Check-in", "See how far you came."]], t: [["Coach Danial", "Strength"], ["Coach Sara", "Classes"], ["Coach Imad", "Nutrition"]], g: ["Strength floor", "Cardio", "Spin class", "Free weights", "Studio", "Lockers"],
    ct: ["Start a free week", "Leave your number and we book your first session."], T: { p: "Memberships", t: "Our coaches" }, ph: ["gym fitness dumbbells workout weights", "fitness sport gym exercise", "fitness sport gym exercise", "fitness sport gym", "gym fitness weights"] },
  { id: "wedding", label: "Wedding", section: "Events and weddings", tags: ["wedding", "rsvp", "invitation", "marriage"], brand: "Hira & Daniyal", eye: "12 December 2027 · Lahore", cta: "RSVP", serif: true,
    h: [["Hira and Daniyal are getting married", "Join us for three days of music, family and celebration."], ["Save the date: 12 December", "We would love you to be part of our big day."], ["Two families, one celebration", "Dinner, music and lots of love in Lahore."]],
    ab: ["How it all began", "We met at a friend's dinner in 2021 and talked until the restaurant closed. The rest is history."], f: [["calendar", "Three events", "Mehndi, wedding and reception."], ["pin", "One venue", "All events at Garden Hall."], ["gift", "No gifts please", "Your prayers are enough."], ["heart", "Dress code", "Bright colours welcome."]],
    st: [["3", "Days of celebration"], ["450", "Guests invited"], ["1", "Big family"]],
    p: [["Mehndi", "10 Dec", "", "7pm onwards.", ["Music", "Dinner"]], ["Wedding", "12 Dec", "", "6pm onwards.", ["Ceremony", "Dinner"]], ["Reception", "13 Dec", "", "8pm onwards.", ["Dinner", "Dessert bar"]]],
    pr: [["Gift registry", "Online", "A few things for our home."], ["Photo album", "Shared", "Add your photos."], ["Wedding song", "Playlist", "Our favourite songs."]],
    q: [["So happy for you both!", "Aunt Rubina", "Family"], ["Counting the days to the mehndi.", "Zoya", "Best friend"], ["We will be there with bells on.", "The Malik family", "Guests"]], a: [["Is there parking?", "Yes, at Garden Hall."], ["Can I bring my children?", "Yes, children are welcome."], ["When should I reply?", "By 15 November please."]],
    s: [["10 Dec", "Mehndi", "Music and dinner."], ["12 Dec", "Wedding", "Ceremony and dinner."], ["13 Dec", "Reception", "Dinner and dessert."]], t: [["Hira", "Bride"], ["Daniyal", "Groom"], ["Ammi and Abbu", "Hosts"]], g: ["Engagement", "Family", "Flowers", "The rings", "Garden Hall", "Dinner"],
    ct: ["RSVP", "Let us know by 15 November how many of you will come."], T: { p: "Wedding events", s: "The plan", g: "Moments", f: "Good to know", st: "Our big day in numbers" }, ph: ["wedding rings flowers marriage engagement", "flowers garden wedding", "wedding flowers rings banquet garden", "wedding flowers", "wedding gift flowers"] },
  { id: "charity", label: "Charity", section: "Charity and community", tags: ["nonprofit", "ngo", "donate", "volunteer"], brand: "Bright Futures Trust", eye: "Registered charity · since 2014", cta: "Donate now",
    h: [["Every child deserves a school", "We build classrooms, train teachers and pay fees for children who would miss out."], ["Small gifts, big futures", "Rs 3,000 keeps a child in school for a whole month."], ["Education changes everything", "Join 4,000 donors helping children learn."]],
    ab: ["Started with one classroom", "In 2014 we rebuilt one classroom in a small village. Today we support 38 schools and 6,000 children."], f: [["heart", "100% to projects", "Admin is paid by our founders."], ["shield", "Audited every year", "Reports open to everyone."], ["users", "Local teams", "Run by the communities we serve."], ["book", "Real results", "Attendance up by 40%."]],
    st: [["6,000", "Children in school"], ["38", "Schools supported"], ["100%", "Of gifts to projects"]],
    p: [["Monthly friend", "Rs 3,000", "/ month", "One child, one month.", ["Thank-you letter", "Yearly report"]], ["Classroom", "Rs 50,000", "", "Most needed.", ["Desks and books", "Your name on the wall"]], ["Teacher", "Rs 25,000", "/ month", "Pay a teacher.", ["Training", "Monthly update"]]],
    pr: [["School kit", "Rs 2,500", "Bag, books and shoes."], ["Desk", "Rs 8,000", "For two children."], ["Library box", "Rs 12,000", "Fifty story books."]],
    q: [["My daughter is the first in our family to read.", "Shazia B.", "Parent"], ["Clear reports, real impact.", "Tariq M.", "Monthly donor"], ["The team listens to the village.", "Head teacher", "Partner school"]], a: [["Where does my money go?", "Straight to schools and teachers."], ["Can I visit a school?", "Yes, we arrange visits twice a year."], ["Is my gift tax deductible?", "Yes, we send a receipt."]],
    s: [["Step 1", "You give", "Once or every month."], ["Step 2", "We build", "Classrooms and teachers."], ["Step 3", "Children learn", "We send you the results."]], t: [["Nadia Ali", "Founder"], ["Hassan Raza", "Programmes"], ["Maria Khan", "Volunteers"]], g: ["New classroom", "Library day", "Teacher training", "Sports day", "Graduation", "Village school"],
    ct: ["Give or volunteer", "Donate in a minute, or tell us how you would like to help."], T: { p: "Ways to give", st: "Our impact", f: "Why give with us" }, ph: ["education classroom school students", "education books library study", "education school classroom study", "education school", "education books"] },
  { id: "agency", label: "Marketing agency", section: "Business", tags: ["agency", "marketing", "branding", "digital"], brand: "Northstar Creative", eye: "Brand · web · social", cta: "Start a project",
    h: [["We build brands that people talk about", "Strategy, design and campaigns for companies ready to grow."], ["Ideas that move the numbers", "Websites, ads and content that turn attention into sales."], ["Make your brand impossible to ignore", "A small senior team that works like part of yours."]],
    ab: ["A small team of senior people", "Northstar is twelve designers, writers and strategists. No juniors learning on your budget."], f: [["spark", "Brand strategy", "Know who you are for."], ["palette", "Design", "Logos, packaging, websites."], ["camera", "Content", "Photo, video and social."], ["award", "Campaigns", "Ads that pay for themselves."]],
    st: [["120+", "Brands launched"], ["3.4x", "Average return on ads"], ["12", "Senior people"]],
    p: [["Starter", "Rs 150,000", "", "Brand basics.", ["Logo", "Colours", "Guidelines"]], ["Growth", "Rs 300,000", "/ month", "Most popular.", ["Social media", "Ads", "Monthly report"]], ["Launch", "Rs 900,000", "", "Full launch.", ["Brand", "Website", "Campaign"]]],
    pr: [["Brand workshop", "Rs 80,000", "One day with your team."], ["Website audit", "Rs 40,000", "Fixes that lift sales."], ["Content day", "Rs 120,000", "Photos and videos."]],
    q: [["Our sales doubled after the relaunch.", "CEO", "Food brand"], ["Fast, honest and very creative.", "Founder", "Fashion label"], ["They feel like our own team.", "Marketing head", "Bank"]], a: [["How long does a brand take?", "Four to six weeks."], ["Do you work with startups?", "Yes, we have a startup package."], ["Can we see past work?", "Yes, ask for our case studies."]],
    s: [["01", "Discover", "We learn your business."], ["02", "Design", "Ideas, then one direction."], ["03", "Launch", "We go live and measure."]], t: [["Sara Malik", "Creative director"], ["Ahmed Noor", "Strategy"], ["Lina Javed", "Design lead"]], g: ["Rebrand", "Packaging", "Campaign", "Website", "Social", "Event"],
    ct: ["Start a project", "Tell us about your goals. We reply with ideas and a quote within two days."], T: { g: "Recent work", f: "What we do", s: "How we work" }, ph: ["coworking creative workspace meeting design", "meeting conference boardroom", "abstract creative design pattern", "coworking workplace workspace meeting", "creative design workspace"] },
  { id: "school", label: "School", section: "Education", tags: ["school", "kids", "admissions", "primary"], brand: "Little Oaks School", eye: "Admissions open · ages 3 to 11", cta: "Book a school tour",
    h: [["Where curious children grow", "A warm primary school with small classes, a big library and lots of outdoor play."], ["Learning that feels like play", "Phonics, maths and science through hands-on projects."], ["A school that knows your child", "Twenty children per class and a teacher who cares."]],
    ab: ["Small school, big hearts", "Little Oaks opened in 2012. Every child is known by name, and every parent has a teacher's number."], f: [["book", "Big library", "3,000 books to borrow."], ["leaf", "Outdoor play", "Garden and sports field."], ["users", "Small classes", "20 children at most."], ["heart", "Caring staff", "Trained in child care."]],
    st: [["20", "Children per class"], ["3,000", "Library books"], ["98%", "Parents recommend us"]],
    p: [["Playgroup", "Rs 15,000", "/ month", "Ages 3 to 4.", ["Half day", "Snacks"]], ["Primary", "Rs 22,000", "/ month", "Grades 1 to 5.", ["Full day", "Clubs", "Lunch"]], ["After school", "Rs 6,000", "/ month", "Until 5pm.", ["Homework help", "Sports"]]],
    pr: [["Uniform set", "Rs 4,500", "Two shirts and trousers."], ["Book bundle", "Rs 6,000", "All books for the year."], ["School bag", "Rs 2,200", "Light and strong."]],
    q: [["My son runs to school every morning.", "Mrs. Kamal", "Parent"], ["Teachers who really know the children.", "Mr. Saeed", "Parent"], ["Lovely library and garden.", "Mrs. Javed", "Parent"]], a: [["When do admissions open?", "Every year in March."], ["Is there transport?", "Yes, school vans on six routes."], ["Do you have a nurse?", "Yes, all day."]],
    s: [["Step 1", "School tour", "Meet the teachers."], ["Step 2", "Play visit", "Your child spends a morning."], ["Step 3", "Admission", "Forms and fees."]], t: [["Mrs. Farah", "Head teacher"], ["Mr. Bilal", "Science"], ["Miss Anum", "Early years"]], g: ["Library", "Garden", "Art room", "Sports day", "Science fair", "Classroom"],
    ct: ["Book a school tour", "Come and see us. Tours run every weekday at 10am."], T: { p: "Fees", t: "Our teachers", s: "Admissions", f: "Why families choose us" }, ph: ["education school classroom", "education classroom school", "education school kids pencils classroom", "education school", "education school books"] },
  { id: "homeshop", label: "Home decor shop", section: "Shops", tags: ["shop", "decor", "home", "interior"], brand: "Nest and Clay", eye: "Free delivery over Rs 5,000", cta: "Shop the collection",
    h: [["Beautiful things for a calm home", "Handmade ceramics, soft linens and plants that make a house feel like home."], ["New in: the autumn collection", "Warm colours, natural textures and pieces made by hand."], ["Make every corner feel good", "Lamps, vases and cushions, delivered to your door."]],
    ab: ["Made by hand, chosen with care", "Every piece in our shop is made by a small studio we know by name."], f: [["truck", "Fast delivery", "2 to 4 days, cash on delivery."], ["heart", "Handmade", "By small studios."], ["gift", "Gift wrapping", "Free on every order."], ["check", "Easy returns", "Within 14 days."]],
    st: [["25", "Small studios"], ["14 days", "Easy returns"], ["9,000+", "Orders delivered"]],
    p: [["Starter set", "Rs 6,500", "", "For a small room.", ["Vase", "Cushion", "Candle"]], ["Living room", "Rs 18,000", "", "Most popular.", ["Lamp", "Throw", "Two vases"]], ["Gift box", "Rs 4,500", "", "Wrapped and ready.", ["Mug", "Candle", "Card"]]],
    pr: [["Clay vase", "Rs 3,200", "Hand-thrown, matte glaze."], ["Linen cushion", "Rs 2,800", "Washed linen, 45 cm."], ["Table lamp", "Rs 9,500", "Oak base, cotton shade."], ["Glazed mug", "Rs 1,100", "Holds 350 ml."]],
    q: [["Everything arrived perfectly packed.", "Amna S.", "Islamabad"], ["The vase is even prettier in person.", "Zara T.", "Karachi"], ["My living room feels new.", "Hamid A.", "Lahore"]], a: [["How long is delivery?", "2 to 4 working days."], ["Can I pay on delivery?", "Yes, anywhere in the country."], ["Can I return an item?", "Yes, within 14 days."]],
    s: [["Today", "Order", "Online or on WhatsApp."], ["Tomorrow", "Packed", "Wrapped with care."], ["Day 3", "Delivered", "Pay at the door."]], t: [["Rabia", "Founder"], ["Omer", "Buyer"], ["Sana", "Customer care"]], g: ["Living room", "Ceramics", "Linens", "Lighting", "Plants", "Gift boxes"],
    ct: ["Need help choosing?", "Send us a photo of your room and we suggest pieces that fit."], T: { pr: "Shop the collection", p: "Room sets" }, ph: ["interior home decor sofa living", "interior home decor", "interior home living decor sofa", "interior home", "interior decor home house"] },
  { id: "events", label: "Event planner", section: "Events and weddings", tags: ["events", "planner", "parties", "corporate"], brand: "Golden Hour Events", eye: "Weddings · parties · corporate", cta: "Plan my event",
    h: [["Events your guests will talk about", "Weddings, birthdays and company dinners planned from first idea to last dance."], ["You enjoy the day, we handle the rest", "Venues, decor, food and music, all in one plan."], ["Beautiful events, zero stress", "One planner, one budget and a team that never misses a detail."]],
    ab: ["Ten years of happy hosts", "Golden Hour has planned more than 600 events. We still treat every one like our own family's."], f: [["calendar", "Full planning", "From idea to clean-up."], ["palette", "Decor", "Flowers, lights and stages."], ["cup", "Catering", "Menus for every taste."], ["star", "Entertainment", "Music, hosts and games."]],
    st: [["600+", "Events planned"], ["10 years", "Of experience"], ["4.9 / 5", "Host rating"]],
    p: [["Birthday", "Rs 120,000", "", "Up to 80 guests.", ["Venue", "Decor", "Cake"]], ["Wedding", "Rs 900,000", "", "Most booked.", ["Three events", "Decor", "Catering"]], ["Corporate", "Rs 350,000", "", "Dinners and launches.", ["Venue", "Stage", "Sound"]]],
    pr: [["Decor package", "Rs 90,000", "Flowers and lights."], ["Photo booth", "Rs 35,000", "With props and prints."], ["Dessert bar", "Rs 60,000", "For 100 guests."]],
    q: [["Our wedding was perfect, start to finish.", "Mehwish and Ali", "Wedding"], ["The launch night looked amazing.", "Marketing head", "Tech company"], ["They thought of everything.", "Mrs. Haroon", "50th birthday"]], a: [["How early should we book?", "Three to six months for weddings."], ["Do you work outside the city?", "Yes, anywhere in the country."], ["Can we use our own caterer?", "Yes, we coordinate with them."]],
    s: [["Week 1", "Meet and dream", "Your ideas and budget."], ["Month 1", "Plan", "Venue, decor and menu."], ["The day", "Celebrate", "We run everything."]], t: [["Alina Shah", "Lead planner"], ["Kamran Ali", "Decor"], ["Hiba Noor", "Guest care"]], g: ["Wedding stage", "Table setting", "Birthday", "Launch night", "Garden party", "Dessert bar"],
    ct: ["Plan my event", "Tell us the date, guest count and budget. We reply with ideas the same week."], T: { p: "Packages", g: "Recent events" }, ph: ["event banquet festival wedding fireworks", "banquet event dining", "event festival fireworks balloons wedding banquet", "event banquet wedding fireworks dining", "gift decoration balloons celebration"] },
  { id: "hotel", label: "Hotel and resort", section: "Travel", tags: ["hotel", "resort", "rooms", "holiday"], brand: "Lakeview Retreat", eye: "Swat valley · 42 rooms", cta: "Book your stay", serif: true,
    h: [["Wake up to the mountains", "Quiet rooms with lake views, local food and fresh air every morning."], ["Your quiet escape in the valley", "Forty-two rooms, one lake and no traffic."], ["Slow mornings, starry nights", "A family-run resort with views from every window."]],
    ab: ["Family-run since 1998", "Three generations of our family have welcomed guests to the valley. Every room looks over the lake."], f: [["star", "Lake view rooms", "Every room has a view."], ["cup", "Local breakfast", "Fresh, included daily."], ["leaf", "Guided walks", "Forest trails nearby."], ["heart", "Family suites", "Room for everyone."]],
    st: [["42", "Rooms and suites"], ["4.8 / 5", "Guest rating"], ["25 years", "Of welcoming guests"]],
    p: [["Deluxe room", "Rs 18,000", "/ night", "For two.", ["Lake view", "Breakfast"]], ["Family suite", "Rs 32,000", "/ night", "Most booked.", ["Two rooms", "Breakfast", "Balcony"]], ["Honeymoon", "Rs 95,000", "/ 3 nights", "For couples.", ["Suite", "Dinner", "Boat ride"]]],
    pr: [["Boat ride", "Rs 4,000", "One hour on the lake."], ["Valley tour", "Rs 12,000", "Full day with a guide."], ["Bonfire night", "Rs 6,000", "With dinner."]],
    q: [["The view from our room was unreal.", "Faisal and Hina", "Guests"], ["Kind staff and amazing food.", "Mrs. Durrani", "Family stay"], ["Perfect for a quiet weekend.", "Omar S.", "Guest"]], a: [["What time is check-in?", "From 2pm, check-out by 12pm."], ["Is breakfast included?", "Yes, every morning."], ["Can you arrange transport?", "Yes, from the airport or city."]],
    s: [["Day 1", "Arrive", "Tea on the terrace."], ["Day 2", "Explore", "Lake and forest walks."], ["Day 3", "Relax", "Spa and bonfire."]], t: [["Mr. Yousaf", "Owner"], ["Saba", "Guest relations"], ["Chef Karim", "Kitchen"]], g: ["Lake", "Deluxe room", "Terrace", "Breakfast", "Forest walk", "Bonfire"],
    ct: ["Book your stay", "Send your dates and number of guests. We confirm within the hour."], T: { p: "Rooms", pr: "Experiences", f: "Why guests come back" }, ph: ["hotel resort holiday suite", "interior hotel suite living sofa", "hotel resort lake mountains valley", "hotel suite resort holiday", "mountains valley hunza resort"] },
  { id: "interior", label: "Interior design", section: "Business", tags: ["interior", "design", "renovation", "home"], brand: "Form and Fold Interiors", eye: "Homes · offices · cafes", cta: "Book a consultation",
    h: [["Spaces that feel like you", "Interior design and renovation for homes, offices and cafes."], ["Beautiful rooms, built on time", "From the first sketch to the last cushion, one team."], ["Design that works as good as it looks", "Clever layouts, natural materials and honest budgets."]],
    ab: ["Design and build, one team", "We are designers and builders under one roof, so what you see in the drawing is what you get."], f: [["palette", "Design", "Plans, 3D views and samples."], ["shield", "Build", "Our own trusted crews."], ["clock", "On time", "Weekly progress photos."], ["check", "Fixed budget", "Agreed before we start."]],
    st: [["180+", "Spaces designed"], ["8 weeks", "Average project"], ["0", "Surprise costs"]],
    p: [["Consultation", "Rs 15,000", "", "Two hours on site.", ["Ideas", "Rough budget"]], ["Room design", "Rs 120,000", "", "Most popular.", ["Plans", "3D views", "Shopping list"]], ["Design and build", "Custom", "", "Whole homes.", ["Design", "Build", "Styling"]]],
    pr: [["Sample box", "Rs 3,000", "Fabrics and finishes."], ["Lighting plan", "Rs 25,000", "For one floor."], ["Styling day", "Rs 40,000", "Finishing touches."]],
    q: [["Our flat looks twice the size now.", "Saad and Mina", "Apartment"], ["On time and on budget.", "Owner", "Cafe"], ["They listened to every idea.", "Dr. Asif", "Clinic"]], a: [["Do you work outside the city?", "Yes, for larger projects."], ["Can we use our own builder?", "Yes, we can design only."], ["How do payments work?", "In stages, as work is done."]],
    s: [["Step 1", "Visit", "We see the space."], ["Step 2", "Design", "Plans and 3D views."], ["Step 3", "Build", "Our crew makes it real."]], t: [["Fatima Riaz", "Lead designer"], ["Hamid Shah", "Site manager"], ["Noor Ali", "Stylist"]], g: ["Living room", "Kitchen", "Office", "Cafe", "Bedroom", "Bathroom"],
    ct: ["Book a consultation", "Send a few photos of your space and we suggest a plan."], T: { g: "Projects", p: "Services" }, ph: ["interior living sofa home decor", "interior design living sofa", "interior home living decor sofa house", "interior design", "decor interior home"] },
  { id: "law", label: "Law firm", section: "Business", tags: ["law", "lawyer", "legal", "advice"], brand: "Ahmed & Co. Advocates", eye: "Family · property · business law", cta: "Book a consultation", serif: true,
    h: [["Clear legal advice you can act on", "Family, property and business matters, handled with care and in plain words."], ["Experienced lawyers on your side", "Thirty years in the courts, one goal: the best result for you."], ["Legal help without the confusion", "Fixed fees, honest answers and updates every week."]],
    ab: ["Thirty years in practice", "Ahmed & Co. was founded in 1995. Our partners have handled more than 3,000 cases in family, property and business law."], f: [["shield", "Property law", "Sales, rent and disputes."], ["users", "Family law", "Handled with care."], ["book", "Business law", "Contracts and companies."], ["chat", "Plain advice", "No legal jargon."]],
    st: [["3,000+", "Cases handled"], ["30 years", "In practice"], ["6", "Senior advocates"]],
    p: [["Consultation", "Rs 10,000", "", "One hour.", ["Your options", "Next steps"]], ["Document review", "Rs 25,000", "", "Most requested.", ["Contract check", "Written notes"]], ["Case", "Custom", "", "Full support.", ["Court work", "Weekly updates"]]],
    pr: [["Will drafting", "Rs 30,000", "Simple, clear, valid."], ["Rent agreement", "Rs 12,000", "Checked and stamped."], ["Company setup", "Rs 60,000", "Papers and registration."]],
    q: [["They explained every step to us.", "Mr. Rashid", "Property case"], ["Calm, honest and very sharp.", "Founder", "Tech company"], ["Handled a hard time with kindness.", "Client", "Family matter"]], a: [["Is the first meeting free?", "The first 15-minute call is free."], ["Do you handle cases in other cities?", "Yes, through partner firms."], ["How are fees set?", "Fixed fees where possible."]],
    s: [["Step 1", "Free call", "Tell us what happened."], ["Step 2", "Consultation", "Your options in writing."], ["Step 3", "We act", "Regular updates."]], t: [["Barrister Ahmed", "Senior partner"], ["Ms. Rizvi", "Family law"], ["Mr. Hussain", "Property law"]], g: ["Our office", "Library", "Meeting room", "Court", "Team", "Signing"],
    ct: ["Book a consultation", "Tell us briefly about your matter. Everything you share is confidential."], T: { f: "Areas of practice", p: "Fees", t: "Our advocates" }, ph: ["library books boardroom", "meeting boardroom conference library", "office city business library", "business corporate meeting boardroom", "pen notebook writing"] },
  { id: "yoga", label: "Yoga studio", section: "Health and fitness", tags: ["yoga", "wellness", "meditation", "classes"], brand: "Still Water Yoga", eye: "Classes for every level", cta: "Try a class", serif: true,
    h: [["Breathe, move and feel at home", "Gentle yoga and meditation classes in a calm, light-filled studio."], ["Find your calm, one class at a time", "Small classes for beginners and seasoned students."], ["Slow down. You deserve it.", "Morning flow, evening stretch and weekend retreats."]],
    ab: ["A calm room in a busy city", "Still Water started in 2016 as a Sunday class in a park. Now we have a studio, eight teachers and a lot of tea."], f: [["leaf", "All levels", "Beginners welcome."], ["clock", "20 classes a week", "Morning and evening."], ["heart", "Small groups", "12 people at most."], ["star", "Retreats", "Weekends in the hills."]],
    st: [["20", "Classes a week"], ["12", "People per class"], ["8", "Teachers"]],
    p: [["Drop-in", "Rs 1,500", "", "One class.", ["Mat included"]], ["Monthly", "Rs 9,000", "/ month", "Most popular.", ["All classes", "Mat and towel"]], ["Retreat", "Rs 38,000", "", "Two nights.", ["Room", "Meals", "Six classes"]]],
    pr: [["Yoga mat", "Rs 4,500", "Natural rubber."], ["Herbal tea", "Rs 900", "Calm blend, 50 g."], ["Candle", "Rs 1,400", "Lavender, 35 hours."]],
    q: [["My back pain is finally gone.", "Saima K.", "Student"], ["The calmest hour of my week.", "Jawad R.", "Student"], ["Perfect for beginners like me.", "Hina F.", "New student"]], a: [["I have never done yoga. Can I come?", "Yes, start with our beginner class."], ["What should I bring?", "Comfortable clothes. We have mats."], ["Are there ladies-only classes?", "Yes, every weekday morning."]],
    s: [["7am", "Morning flow", "Wake up gently."], ["6pm", "Evening stretch", "Let the day go."], ["Sunday", "Meditation", "Quiet and still."]], t: [["Maham", "Founder"], ["Raza", "Teacher"], ["Anum", "Meditation"]], g: ["Studio", "Morning class", "Retreat", "Tea corner", "Garden", "Meditation"],
    ct: ["Try a class", "Your first class is half price. Pick a time and we save you a mat."], T: { s: "Class times", p: "Prices", t: "Teachers", f: "Why students love it" }, ph: ["yoga wellness calm nature", "yoga studio wellness calm", "yoga wellness nature calm flowers", "yoga wellness calm nature flowers", "wellness calm nature flowers"] },
];
const BY = (list) => Object.fromEntries(list.map((x) => [x[0], x]));
const PAL = BY(PALETTES), LAY = BY(LAYOUTS), THM = Object.fromEntries(THEMES.map((t) => [t.id, t]));
const MORE = { features: "What we offer", about: "Our story", gallery: "See the gallery", pricing: "See prices", products: "Shop now", testimonials: "Read reviews", faq: "Questions", team: "Meet the team", timeline: "How it works", map: "Find us" };
const NAV = { features: "Services", about: "About", gallery: "Gallery", pricing: "Prices", products: "Shop", testimonials: "Reviews", faq: "FAQ", team: "Team", timeline: "How it works", contact: "Contact", map: "Visit" };

// "type:variant@bg" -> { type, variant, bg }; "stats" is a band of numbers (a Features block).
const specOf = (s) => { const [tv, bg = ""] = String(s).split("@"); const [type, variant = ""] = tv.split(":"); return { type, variant, bg, stats: type === "stats" }; };
const typeOf = (s) => { const t = specOf(s).type; return t === "stats" ? "features" : t; };
const variantOf = (id, t) => { const g = /^([a-z]+)~(p\d\d)~([a-z]+)$/.exec(id); return t.h[hash(g ? g[1] + g[3] : id) % t.h.length]; };

// `upTo`: build only the first sections (thumbnails); photos are picked in section order, so they match the full site.
function buildGenerated(lid, pid, tid, upTo = Infinity) {
  const l = LAY[lid], p = PAL[pid], t = THM[tid], id = `${lid}~${pid}~${tid}`;
  const [, , nav, hero, hbg, specs, corners, fp, [ha, sa], extra] = l;
  const blocks = specs.map(typeOf), menu = [...new Set(blocks.filter((b) => NAV[b]))];
  const dark = !!p[6];
  const [hf0, bf] = FONT_PAIRS[fp];
  const hf = t.serif ? (hf0 === "cambria" ? "cambria" : "serif") : hf0;
  const theme = { primary: p[2], accent: p[3], headingFont: hf, bodyFont: bf, corners, ...(dark ? { mode: "dark", bg: p[6], text: "#e9ebf5" } : {}) };
  const href = (type) => "#" + (BLOCK_TYPES[type]?.anchor || type);
  const second = blocks.find((b) => NAV[b] && b !== "contact" && b !== "features") || blocks.find((b) => NAV[b] && b !== "contact");
  const allTypes = [...blocks, ...(Array.isArray(extra) ? extra.flatMap(([, list]) => list.map(typeOf)) : [])];
  const cta = allTypes.includes("contact") ? "#contact" : allTypes.includes("map") ? href("map") : second ? href(second) : "#top";
  const [title, lead] = variantOf(id, t);
  const T = t.T || {};
  // Photos: picked once per site in a fixed order, so the thumbnail and the opened site always show the same ones.
  const ph = photoPicker(id);
  const [tH, tA, tG, tT, tP] = t.ph;
  const heroImg = ph(tH, "hero");
  const picOf = { about: () => ph(tA, "about"), gallery: () => ph.many(tG, 6, "g"), products: () => ph.many(tP, t.pr.length, "p"), team: () => ph.many(tT, t.t.length, "t"), avatars: () => ph.many(tT, t.q.length, "q") };
  const cache = {}; const pics = (k) => (cache[k] ||= picOf[k]());
  const make = (spec, i) => {
    const { type, variant, bg, stats } = specOf(spec);
    const style = { ...(bg ? { bg: bg === "accent" ? p[3] : bg } : {}), ...(variant ? { variant } : {}), ...(type !== "footer" && sa ? { anim: type === "gallery" && sa === "rise" ? "zoom" : sa } : {}) };
    let data, ty = type;
    switch (type) {
      case "stats": ty = "features"; data = { title: T.st || `${t.brand} in numbers`, intro: "", items: t.st.map(([num, label], k) => ({ icon: ["users", "award", "star"][k % 3], title: num, text: label })) }; break;
      case "features": data = { title: T.f || `Why choose ${t.brand}`, intro: "", items: t.f.map(([icon, title, text]) => ({ icon, title, text })) }; break;
      case "about": data = { title: t.ab[0], text: t.ab[1], image: pics("about"), button: L("", ""), side: i % 2 ? "right" : "left" }; break;
      case "gallery": data = { title: T.g || "Gallery", intro: "", images: t.g.map((caption, k) => ({ src: pics("gallery")[k], caption })) }; break;
      case "pricing": data = { title: T.p || "Prices", intro: "Clear prices, no surprises.", plans: t.p.map(([name, price, period, text, features], k) => ({ name, price, period, text, features, button: L(t.cta, cta), featured: k === 1 })) }; break;
      case "products": data = { title: T.pr || "Shop", intro: "Order in one tap on WhatsApp.", whatsapp: W, orderLabel: "Order on WhatsApp", items: t.pr.map(([name, price, text], k) => ({ image: pics("products")[k], name, price, text })) }; break;
      case "testimonials": data = { title: T.q || "What people say", items: t.q.map(([quote, name, role], k) => ({ quote, name, role, photo: pics("avatars")[k] })) }; break;
      case "faq": data = { title: "Questions and answers", items: t.a.map(([q, a]) => ({ q, a })) }; break;
      case "team": data = { title: T.t || "Meet the team", intro: "", members: t.t.map(([name, role], k) => ({ photo: pics("team")[k], name, role })) }; break;
      case "timeline": data = { title: T.s || "How it works", items: t.s.map(([when, title, text]) => ({ when, title, text })) }; break;
      case "contact": data = { title: t.ct[0], text: t.ct[1], email: "hello@example.com", phone: "+92 300 0000000", whatsapp: W, waText: `Hello ${t.brand}!`, waLabel: "Chat on WhatsApp", address: "Main Boulevard, Lahore", formTitle: "Send a message", send: "Send" }; break;
      case "map": data = { title: "Visit us", address: "Main Boulevard, Lahore", note: "Open every day, 10am to 8pm.", query: "Main Boulevard Lahore", label: "Open in Maps", image: art("map", { a: p[2], b: p[3], c: p[4], d: p[5], bg: p[4] }) }; break;
      case "footer": data = { text: `${t.brand} · ${t.label.toLowerCase()}`, links: menu.slice(0, 3).map((b) => L(NAV[b], href(b))), copy: `© 2026 ${t.brand}` }; break;
      default: return null;
    }
    return newBlock(ty, data, style);
  };
  const out = [];
  if (nav) out.push(newBlock("header", { brand: t.brand, links: menu.filter((b) => b !== "contact").slice(0, 4).map((b) => L(NAV[b], href(b))), cta: L(t.cta, cta) }, nav === "dark" || nav === "primary" ? { bg: nav } : {}));
  const photoBg = hbg === "photo", pictured = ["split", "left", "card", "banner", "cover"].includes(hero);
  out.push(newBlock("hero", { eyebrow: t.eye, title, text: lead, primary: L(t.cta, cta), secondary: second ? L(MORE[second], href(second)) : L("", ""), image: pictured ? heroImg : "", layout: hero },
    { ...(hbg && !photoBg ? { bg: hbg } : {}), ...(photoBg ? { bgImage: heroImg } : {}), anim: ha }));
  specs.slice(0, upTo).forEach((spec, i) => { const b = make(spec, i); if (b) out.push(b); });
  const s = site(t.brand, `${title}. ${lead}`, theme, out, id);
  if (Array.isArray(extra) && extra.length && upTo === Infinity) {
    // Extra pages: menu bar + footer copied from home (addPage), a page heading, then the page's sections.
    extra.forEach(([name, list], n) => {
      const head = newBlock("hero", { eyebrow: t.brand, title: name, text: n === 0 ? t.ab[1] : lead, image: "", layout: "minimal", primary: L("", ""), secondary: L("", "") }, { bg: "tint", anim: "fade" });
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
    const l = LAYOUTS[k % nL], t = THEMES[(k * 7 + Math.floor(k / nL)) % nT], p = PALETTES[(k * 5 + Math.floor(k / nL) * 3 + Math.floor(k / (nL * nT))) % nP];
    const id = `${l[0]}~${p[0]}~${t.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const pages = Array.isArray(l[9]) ? l[9].length + 1 : 1;
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
/** Distinct base layouts: the generator layouts + the 13 hand-made sites. */
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
  if (g) return variantOf(id, THM[g.t])[0];
  const s = makeSite(id); return s.blocks.find((b) => b.type === "hero")?.data.title || "";
}

/* ------------------------------------------------------------------ thumbnails: the homepage, drawn from the site */
// A 320×200 picture of the top of the opened homepage (a 1280 px wide desktop at about a quarter of its size, with
// headings drawn a little larger so they read on a small card): menu bar, hero, then the next sections, in the
// site's own colours, fonts, corners and photos (small "thumb" files). Pure string work, a few KB per card.
const TW = 320, TH = 200, MX = 16, CW = TW - MX * 2;
const famOf = (f) => (f === "serif" || f === "cambria" ? "serif" : "sans");
const hexOk = (c) => /^#[0-9a-f]{6}$/i.test(String(c || ""));
function ctxOf(s, k) {
  const t = { ...DEFAULT_THEME, ...s.theme }, V = themeVars(t);
  const c = t.corners === "sharp" ? [1, 1] : t.corners === "round" ? [6.5, 99] : [3.5, 2.5];
  return { k, V, hf: famOf(t.headingFont), bf: famOf(t.bodyFont), r: c[0], rb: c[1] };
}
const DARK = (V, fill) => ({ fill, hd: "#ffffff", fg: "#eef0f7", mu: "#c9cdda", card: mix(fill, "#ffffff", 0.07), ln: mix(fill, "#ffffff", 0.18), pt: mix(fill, "#ffffff", 0.14), pl: "#ffffff", btn: V["--p"], btnInk: V["--onp"], dark: true });
/** Colours of a section (its background token or colour), like the site CSS does it. */
function surface(ctx, st = {}) {
  const V = ctx.V, bg = st.bg || "";
  const base = { fill: V["--bg"], hd: V["--hd"], fg: V["--fg"], mu: V["--mu"], card: V["--card"], ln: V["--ln"], pt: V["--pt"], pl: V["--pl"], btn: V["--p"], btnInk: V["--onp"], dark: isDark(V["--bg"]) };
  if (st.bgImage) return { ...DARK(V, "#151726"), photo: st.bgImage };
  if (bg === "primary") { const on = V["--onp"], p = V["--p"]; return { fill: p, hd: on, fg: on, mu: mix(on, p, 0.2), card: mix(p, on, 0.1), ln: mix(p, on, 0.25), pt: mix(p, on, 0.18), pl: on, btn: on, btnInk: p, dark: on === "#ffffff" }; }
  if (bg === "dark") return DARK(V, V["--ft"]);
  if (bg === "alt") return { ...base, fill: V["--sf"] };
  if (bg === "tint") return { ...base, fill: V["--pt"] };
  if (hexOk(bg)) return isDark(bg) ? DARK(V, bg) : { ...base, fill: bg };
  return base;
}
const clipT = (str, n) => { const s = String(str || "").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
/** A photo (small file) filling a box, cropped like CSS object-fit: cover. Non-library pictures get a soft tone. */
function pic(ctx, url, x, y, w, h, { rx = 0, round = false, ex = "" } = {}) {
  const k = ctx.k, u = isLibraryPhoto(url) ? thumbOf(url) : "";
  const cp = round ? k.clip(circle(x + w / 2, y + h / 2, w / 2, "#000")) : rx ? k.clipRect(x, y, w, h, rx) : "";
  const base = rect(x, y, w, h, u ? "#c9ced8" : k.lin([ctx.V["--pt"], ctx.V["--a"]], 45));
  return `<g${cp}${ex}>${base}${u ? `<image href="${u}" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" preserveAspectRatio="xMidYMid slice"/>` : ""}</g>`;
}
const n1 = (v) => String(Math.round(v * 10) / 10);
function wicon(name, x, y, sz, color) {
  const d = WICONS[name] || WICONS.star;
  return `<path d="${d}" transform="translate(${n1(x)} ${n1(y)}) scale(${n1((sz / 24) * 100) / 100})" fill="none" stroke="${color}" stroke-width="${n1(2.2 * 24 / sz / 4)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const bw = (label, size) => textW(label, size, "sans") * 0.93 + size * 2.4;
/** A button: solid (main colour), ghost (outline) or WhatsApp green. */
function btn(ctx, s, x, y, label, { ghost = false, wa = false, size = 4.4, h = 9.5 } = {}) {
  const w = bw(label, size), rx = Math.min(ctx.rb, h / 2);
  const fill = wa ? "#1d9b52" : ghost ? "none" : s.btn, ink = wa ? "#ffffff" : ghost ? s.pl : s.btnInk;
  return { w, svg: rect(x, y, w, h, fill, rx, ghost ? ` stroke="${s.pl}" stroke-width=".6"` : "") + text(x + w / 2, y + h / 2 + size * 0.36, label, { size, weight: 700, fill: ink, anchor: "middle" }) };
}
/** The hero's buttons in a row (start / middle aligned). */
function btnRow(ctx, s, d, x, y, align = "start", size = 4.6) {
  const list = [d.primary?.label && [d.primary.label, false], d.secondary?.label && [d.secondary.label, true]].filter(Boolean).map(([l, g]) => [clipT(l, 22), g]);
  if (!list.length) return { svg: "", h: 0 };
  const gap = 4, ws = list.map(([l]) => bw(l, size)), total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  let xx = align === "middle" ? x - total / 2 : x, svg = "";
  list.forEach(([l, g], i) => { svg += btn(ctx, s, xx, y, l, { ghost: g, size, h: size * 2.2 }).svg; xx += ws[i] + gap; });
  return { svg, h: size * 2.2 };
}
const eyebrowPill = (ctx, s, x, y, label, anchor = "start", onPhoto = false) => {
  const size = 4.2, w = bw(clipT(label, 40), size), x0 = anchor === "middle" ? x - w / 2 : x;
  return { h: 8.6, svg: rect(x0, y, w, 8.6, onPhoto ? "#ffffff" : s.pt, 4.3, onPhoto ? ' fill-opacity=".18"' : "") + text(x0 + w / 2, y + 5.9, clipT(label, 40), { size, weight: 700, fill: onPhoto ? "#ffffff" : s.pl, anchor: "middle" }) };
};
/** Hero text block (eyebrow, headline, line, buttons) measured first, drawn at (x, y). */
function heroText(ctx, s, d, x, maxW, { size = 19, maxLines = 3, align = "start", onPhoto = false, leadLines = 2 } = {}) {
  const f = fit(d.title || "", maxW, { size, min: Math.round(size * 0.55), maxLines, font: ctx.hf });
  const lead = d.text ? fit(String(d.text).split("\n")[0], Math.min(maxW, 230), { size: 5, min: 4.6, maxLines: leadLines }) : null;
  const ey = d.eyebrow ? 12 : 0, hh = f.size * 0.86 + (f.lines.length - 1) * f.size * 1.02, lh = lead ? lead.lines.length * lead.size * 1.4 + 4 : 0;
  const bh = d.primary?.label || d.secondary?.label ? 10.5 : 0;
  const h = ey + hh + 5 + lh + bh;
  return { h, draw: (y) => {
    let svg = "", yy = y;
    if (ey) { svg += eyebrowPill(ctx, s, x, yy, d.eyebrow, align, onPhoto).svg; yy += ey; }
    svg += text(x, yy + f.size * 0.86, f.lines, { size: f.size, lh: 1.02, weight: 800, fill: onPhoto ? "#ffffff" : s.hd, font: ctx.hf, anchor: align, ls: -f.size * 0.02 });
    yy += hh + 5;
    if (lead) { svg += text(x, yy + lead.size, lead.lines, { size: lead.size, lh: 1.4, weight: 400, fill: onPhoto ? "#e8eaf2" : s.mu, anchor: align }); yy += lh; }
    if (bh) svg += btnRow(ctx, s, d, x, yy, align).svg;
    return svg;
  } };
}
function photoBg(ctx, url, y, h) {
  return pic(ctx, url, 0, y, TW, h) + rect(0, y, TW, h, "#0c0e1c", 0, ' fill-opacity=".5"') + rect(0, y + h * 0.45, TW, h * 0.55, ctx.k.lin([["#0c0e1c", 0], ["#0c0e1c", 0.35]], 90));
}
function drawHero(ctx, b, y) {
  const d = b.data, st = b.style || {}, lay = d.layout || "split", k = ctx.k;
  const s = surface(ctx, st);
  const bgRect = (h) => (s.photo ? photoBg(ctx, s.photo, y, h) : rect(0, y, TW, h, s.fill));
  if ((lay === "split" || lay === "left") && d.image) {
    const H = 118, pw = 134, ph = 100, rev = lay === "left";
    const tx = rev ? MX + pw + 14 : MX, t = heroText(ctx, s, d, tx, CW - pw - 16, { size: 19, onPhoto: !!s.photo });
    const px = rev ? MX : TW - MX - pw, py = y + (H - ph) / 2;
    return { h: H, svg: bgRect(H) + rect(px + 2, py + 5, pw - 4, ph - 2, "#000000", ctx.r, ` fill-opacity=".14"${k.blur(4)}`) + pic(ctx, d.image, px, py, pw, ph, { rx: ctx.r }) + t.draw(y + (H - t.h) / 2) };
  }
  if (lay === "cover" && d.image) {
    const H = 128, t = heroText(ctx, DARK(ctx.V, "#151726"), d, TW / 2, 250, { size: 22, maxLines: 2, align: "middle", onPhoto: true });
    return { h: H, svg: photoBg(ctx, d.image, y, H) + t.draw(y + (H - t.h) / 2 + 2) };
  }
  if (lay === "card" && d.image) {
    const H = 128, cw = 156, pad = 10, t = heroText(ctx, surface(ctx, {}), d, MX + 6 + pad, cw - pad * 2, { size: 15, maxLines: 3 });
    const ch = t.h + pad * 2, cy = y + (H - ch) / 2;
    return { h: H, svg: pic(ctx, d.image, 0, y, TW, H) + rect(MX + 6, cy, cw, ch, ctx.V["--bg"], ctx.r, k.shadow(4, 10, 0.3)) + t.draw(cy + pad) };
  }
  if (lay === "banner") {
    const t = heroText(ctx, s, d, TW / 2, 250, { size: 18, maxLines: 2, align: "middle", onPhoto: !!s.photo, leadLines: 1 });
    const top = 12, ih = d.image ? CW * 9 / 21 : 0, H = top + t.h + (d.image ? 10 + ih : 12);
    return { h: H, svg: bgRect(H) + t.draw(y + top) + (d.image ? rect(MX + 3, y + top + t.h + 14, CW - 6, ih, "#000000", ctx.r, ` fill-opacity=".14"${k.blur(4)}`) + pic(ctx, d.image, MX, y + top + t.h + 10, CW, ih, { rx: ctx.r }) : "") };
  }
  if (lay === "minimal") {
    const t = heroText(ctx, s, d, MX + 11, 214, { size: 27, maxLines: 3, onPhoto: !!s.photo }), H = Math.max(104, t.h + 30);
    return { h: H, svg: bgRect(H) + rect(MX, y + (H - t.h) / 2 - 2, 2.2, t.h + 4, ctx.V["--a"]) + t.draw(y + (H - t.h) / 2) };
  }
  // centred text (also split/left/cover/card without a picture)
  const t = heroText(ctx, s, d, TW / 2, 240, { size: 21, maxLines: 2, align: "middle", onPhoto: !!s.photo }), H = Math.max(s.photo ? 120 : 96, t.h + 30);
  return { h: H, svg: bgRect(H) + t.draw(y + (H - t.h) / 2) };
}
function navBar(ctx, b, y) {
  const d = b.data, s = surface(ctx, b.style), H = 18;
  let svg = rect(0, y, TW, H, s.fill) + rect(0, y + H - 0.4, TW, 0.4, s.ln);
  if (d.showLogo !== false) svg += text(MX, y + 11.8, clipT(d.brand || "", 26), { size: 7, weight: 800, fill: s.hd, font: ctx.hf, ls: -0.1 });
  let x = TW - MX;
  if (d.cta?.label) { const c = btn(ctx, s, x - bw(clipT(d.cta.label, 20), 4.2), y + 4.5, clipT(d.cta.label, 20), { size: 4.2, h: 9 }); svg += c.svg; x -= c.w + 9; }
  const links = (d.links || []).map((l) => clipT(l.label, 14)).filter(Boolean).slice(0, 4).reverse();
  const brandEnd = MX + textW(clipT(d.brand || "", 26), 7, ctx.hf) + 10;
  for (const l of links) { const w = textW(l, 4.6, "sans") * 0.95; if (x - w < brandEnd) break; svg += text(x - w, y + 11, l, { size: 4.6, weight: 600, fill: s.fg }); x -= w + 8; }
  return { h: H, svg };
}
const secHead = (ctx, s, d, y, center = true) => {
  if (!String(d.title || "").trim()) return { h: 0, svg: "" };
  const f = fit(d.title, center ? 230 : 130, { size: 10, min: 7, maxLines: center ? 1 : 2, font: ctx.hf });
  let svg = text(center ? TW / 2 : MX, y + f.size * 0.86, f.lines, { size: f.size, weight: 800, fill: s.hd, font: ctx.hf, anchor: center ? "middle" : "start", ls: -0.15 });
  let h = f.size * 0.86 + (f.lines.length - 1) * f.size * 1.05 + 7;
  const intro = String(d.intro || "").trim();
  if (center && intro) { svg += text(TW / 2, y + h + 3, clipT(intro, 70), { size: 4.6, fill: s.mu, anchor: "middle" }); h += 8; }
  return { h, svg };
};
const lines = (str, w, size, max) => fit(String(str || "").replace(/\n/g, " "), w, { size, min: size, maxLines: max }).lines;
const cols = (n, max, gap = 5) => { const c = Math.max(1, Math.min(n, max)); return { c, w: (CW - gap * (c - 1)) / c, gap }; };
/** The sections after the hero: their content at desktop layout, a quarter size. */
function drawSection(ctx, b, y) {
  const d = b.data || {}, st = b.style || {}, s = surface(ctx, st), v = st.variant || "", k = ctx.k, P = 11;
  let svg = "", yy = y + P;
  const head = (center = true) => { const r = secHead(ctx, s, d, yy, center); svg += r.svg; yy += r.h; };
  const items = (key) => (Array.isArray(d[key]) ? d[key] : []);
  const card = (x, yy0, w, h, ex = "") => rect(x, yy0, w, h, s.card, ctx.r, ` stroke="${s.ln}" stroke-width=".5"${ex}`);
  switch (b.type) {
    case "features": {
      head();
      const its = items("items").slice(0, 4), stats = its.length && its.every((it) => /^[\d.,+%x/ ]/i.test(String(it.title || "")));
      if (v === "list") {
        its.slice(0, 3).forEach((it, i) => { const ry = yy + i * 17, x0 = 58; svg += rect(x0, ry, 11, 11, s.pt, ctx.r * 0.8) + wicon(it.icon, x0 + 2, ry + 2, 7, s.pl) + text(x0 + 16, ry + 5, clipT(it.title, 40), { size: 5.4, weight: 700, fill: s.hd }) + text(x0 + 16, ry + 11, clipT(it.text, 60), { size: 4.4, fill: s.mu }) + rect(x0, ry + 15, 204, 0.4, s.ln); });
        yy += 52; break;
      }
      const g = cols(its.length, 4, 6);
      its.forEach((it, i) => {
        const x = MX + i * (g.w + g.gap);
        if (v === "numbers") { svg += text(x, yy + 12, String(i + 1).padStart(2, "0"), { size: 14, weight: 800, fill: ctx.V["--a"], font: ctx.hf }) + text(x, yy + 21, lines(it.title, g.w, 5.4, 1), { size: 5.4, weight: 700, fill: s.hd }) + text(x, yy + 28, lines(it.text, g.w - 4, 4.4, 2), { size: 4.4, lh: 1.35, fill: s.mu }); return; }
        if (stats) { svg += card(x, yy, g.w, 44) + wicon(it.icon, x + g.w / 2 - 4, yy + 5, 8, s.pl) + text(x + g.w / 2, yy + 27, clipT(it.title, 12), { size: 12, weight: 800, fill: s.hd, font: ctx.hf, anchor: "middle" }) + text(x + g.w / 2, yy + 36, lines(it.text, g.w - 8, 4.4, 1), { size: 4.4, fill: s.mu, anchor: "middle" }); return; }
        svg += card(x, yy, g.w, 50) + rect(x + 6, yy + 6, 12, 12, s.pt, ctx.r * 0.8) + wicon(it.icon, x + 8, yy + 8, 8, s.pl) + text(x + 6, yy + 27, lines(it.title, g.w - 12, 5.4, 1), { size: 5.4, weight: 700, fill: s.hd }) + text(x + 6, yy + 34, lines(it.text, g.w - 12, 4.3, 3), { size: 4.3, lh: 1.4, fill: s.mu });
      });
      yy += stats ? 44 : v === "numbers" ? 40 : 50; break;
    }
    case "about": {
      const right = d.side === "right", mw = 134, mh = 100, has = !!d.image;
      const mx = right ? TW - MX - mw : MX, tx = has ? (right ? MX : MX + mw + 14) : 60, tw = has ? CW - mw - 14 : 200;
      const f = fit(d.title || "", tw, { size: 11, min: 7, maxLines: 2, font: ctx.hf });
      const body = lines(d.text, tw, 4.6, 5), th = f.size * 0.9 + (f.lines.length - 1) * f.size * 1.05 + 6 + body.length * 6.6 + (d.button?.label ? 14 : 0);
      const ty = yy + (has ? (mh - th) / 2 : 0);
      if (has) svg += pic(ctx, d.image, mx, yy, mw, mh, { rx: ctx.r });
      svg += text(tx, ty + f.size * 0.86, f.lines, { size: f.size, lh: 1.05, weight: 800, fill: s.hd, font: ctx.hf, ls: -0.15 });
      svg += text(tx, ty + f.size * 0.9 + (f.lines.length - 1) * f.size * 1.05 + 10, body, { size: 4.6, lh: 1.43, fill: s.mu });
      if (d.button?.label) svg += btn(ctx, s, tx, ty + th - 10, clipT(d.button.label, 22)).svg;
      yy += has ? mh : th; break;
    }
    case "gallery": {
      head();
      const ims = items("images"), gap = 4, cw = (CW - gap * 3) / 4;
      if (v === "mosaic") {
        ims.slice(0, 5).forEach((g, i) => { const big = i === 0, col = big ? 0 : 2 + ((i - 1) % 2), row = big ? 0 : Math.floor((i - 1) / 2); svg += pic(ctx, g.src, MX + col * (cw + gap), yy + row * (cw + gap), big ? cw * 2 + gap : cw, big ? cw * 2 + gap : cw, { rx: ctx.r }); });
        yy += cw * 2 + gap; break;
      }
      ims.slice(0, 8).forEach((g, i) => { const col = i % 4, row = Math.floor(i / 4), gy = yy + row * (cw + 12); svg += pic(ctx, g.src, MX + col * (cw + gap), gy, cw, cw, { rx: ctx.r }) + (g.caption ? text(MX + col * (cw + gap), gy + cw + 6.5, clipT(g.caption, 24), { size: 4.4, fill: s.mu }) : ""); });
      yy += Math.ceil(Math.min(8, ims.length) / 4) * (cw + 12); break;
    }
    case "pricing": {
      head();
      const ps = items("plans").slice(0, 3), g = cols(ps.length, 3, 7), ch = 84;
      ps.forEach((p, i) => {
        const x = MX + i * (g.w + g.gap), f = !!p.featured;
        svg += f ? rect(x, yy, g.w, ch, s.card, ctx.r, ` stroke="${ctx.V["--p"]}" stroke-width="1.1"${k.shadow(4, 10, 0.16)}`) : card(x, yy, g.w, ch);
        if (f) { const bwid = bw("Popular", 3.8); svg += rect(x + 6, yy - 4, bwid, 8, ctx.V["--a"], 4) + text(x + 6 + bwid / 2, yy + 1.4, "Popular", { size: 3.8, weight: 800, fill: ctx.V["--ona"], anchor: "middle" }); }
        svg += text(x + 7, yy + 14, clipT(p.name, 26), { size: 5.6, weight: 700, fill: s.hd });
        const pr = clipT(p.price, 14), prs = Math.min(12, (g.w - 14) / Math.max(4, pr.length * 0.62));
        svg += text(x + 7, yy + 28, pr, { size: prs, weight: 800, fill: s.hd, font: ctx.hf }) + (p.period ? text(x + 9 + textW(pr, prs, ctx.hf) * 0.92, yy + 28, clipT(p.period, 12), { size: 4, fill: s.mu }) : "");
        (Array.isArray(p.features) ? p.features : []).slice(0, 3).forEach((ft, j) => { const ly = yy + 38 + j * 9; svg += rect(x + 7, ly - 3.6, g.w - 14, 0.4, s.ln) + `<path d="M${n1(x + 8)} ${n1(ly + 1)}l1.4 1.4 2.8-2.8" fill="none" stroke="${s.pl}" stroke-width=".8"/>` + text(x + 15, ly + 2.6, clipT(ft, 28), { size: 4.3, fill: s.fg }); });
        if (p.button?.label) svg += btn(ctx, f ? s : s, x + 7, yy + ch - 15, clipT(p.button.label, 18), { ghost: !f, size: 4.2, h: 9 }).svg;
      });
      yy += ch; break;
    }
    case "products": {
      head();
      const its = items("items").slice(0, 4), g = cols(its.length, 4, 6), ih = (g.w - 8) * 0.8, ch = ih + 40;
      its.forEach((p, i) => {
        const x = MX + i * (g.w + g.gap);
        svg += card(x, yy, g.w, ch) + pic(ctx, p.image, x + 4, yy + 4, g.w - 8, ih, { rx: ctx.r * 0.8 });
        svg += text(x + 5, yy + ih + 12, clipT(p.name, 26), { size: 5.2, weight: 700, fill: s.hd }) + text(x + 5, yy + ih + 21, clipT(p.price, 18), { size: 6.4, weight: 800, fill: s.hd, font: ctx.hf });
        svg += btn(ctx, s, x + 5, yy + ih + 26, "Order on WhatsApp", { wa: true, size: 3.8, h: 8.5 }).svg;
      });
      yy += ch; break;
    }
    case "testimonials": {
      head();
      const qs = items("items").slice(0, 3);
      if (v === "single") {
        const q = qs[0] || {}, f = fit(`“${q.quote || ""}”`, 220, { size: 9, min: 6, maxLines: 3, font: ctx.hf });
        svg += text(TW / 2, yy + f.size, f.lines, { size: f.size, lh: 1.3, weight: 600, fill: s.hd, font: ctx.hf, anchor: "middle" });
        yy += f.size * (1 + (f.lines.length - 1) * 1.3) + 6;
        if (q.photo) svg += pic(ctx, q.photo, TW / 2 - 6, yy, 12, 12, { round: true });
        yy += q.photo ? 14 : 0;
        svg += text(TW / 2, yy + 5, clipT(`${q.name || ""}${q.role ? " · " + q.role : ""}`, 50), { size: 4.8, weight: 700, fill: s.hd, anchor: "middle" });
        yy += 10; break;
      }
      const g = cols(qs.length, 3, 7), ch = 56;
      qs.forEach((q, i) => {
        const x = MX + i * (g.w + g.gap);
        svg += card(x, yy, g.w, ch) + text(x + 7, yy + 15, "“", { size: 14, weight: 800, fill: s.pl, font: ctx.hf }) + text(x + 7, yy + 21, lines(q.quote, g.w - 14, 4.6, 3), { size: 4.6, lh: 1.4, fill: s.fg });
        const ax = q.photo ? x + 19 : x + 7;
        if (q.photo) svg += pic(ctx, q.photo, x + 7, yy + ch - 15, 10, 10, { round: true });
        svg += text(ax, yy + ch - 10, clipT(q.name, 20), { size: 4.6, weight: 700, fill: s.hd }) + text(ax, yy + ch - 5, clipT(q.role, 24), { size: 3.9, fill: s.mu });
      });
      yy += ch; break;
    }
    case "team": {
      head();
      const ms = items("members").slice(0, 4), g = cols(ms.length, 4, 6), ch = 60;
      ms.forEach((m, i) => {
        const x = MX + i * (g.w + g.gap), cx = x + g.w / 2;
        svg += card(x, yy, g.w, ch) + circle(cx, yy + 22, 17.5, s.pt) + (m.photo ? pic(ctx, m.photo, cx - 15.5, yy + 6.5, 31, 31, { round: true }) : "");
        svg += text(cx, yy + 46, clipT(m.name, 22), { size: 5.4, weight: 700, fill: s.hd, anchor: "middle" }) + text(cx, yy + 53, clipT(m.role, 26), { size: 4.4, fill: s.mu, anchor: "middle" });
      });
      yy += ch; break;
    }
    case "timeline": {
      head();
      const its = items("items").slice(0, 4), x0 = 68;
      svg += rect(x0 - 0.6, yy, 1.2, its.length * 20, s.pt);
      its.forEach((it, i) => { const iy = yy + i * 20; svg += circle(x0, iy + 3, 2.6, ctx.V["--p"], ` stroke="${s.fill}" stroke-width="1"`) + text(x0 + 8, iy + 4, clipT(it.when, 24), { size: 4.4, weight: 800, fill: s.pl }) + text(x0 + 8, iy + 11, clipT(it.title, 46), { size: 5.6, weight: 700, fill: s.hd }) + (it.text ? text(x0 + 8, iy + 17, clipT(it.text, 60), { size: 4.3, fill: s.mu }) : ""); });
      yy += its.length * 20; break;
    }
    case "faq": {
      head();
      items("items").slice(0, 4).forEach((q, i) => { const fy = yy + i * 15, x0 = 58; svg += card(x0, fy, 204, 12) + text(x0 + 6, fy + 7.8, clipT(q.q, 52), { size: 5, weight: 700, fill: s.hd }) + text(x0 + 197, fy + 8.6, "+", { size: 8, weight: 700, fill: s.pl, anchor: "middle" }); });
      yy += Math.min(4, items("items").length) * 15; break;
    }
    case "contact": {
      const lw = 138, f = fit(d.title || "", lw, { size: 11, min: 7, maxLines: 2, font: ctx.hf });
      svg += text(MX, yy + f.size * 0.86, f.lines, { size: f.size, lh: 1.05, weight: 800, fill: s.hd, font: ctx.hf, ls: -0.15 });
      let ly = yy + f.size * 0.9 + (f.lines.length - 1) * f.size * 1.05 + 8;
      const lead = lines(d.text, lw, 4.6, 3); svg += text(MX, ly, lead, { size: 4.6, lh: 1.4, fill: s.mu }); ly += lead.length * 6.4 + 3;
      [["chat", d.email], ["phone", d.phone], ["pin", d.address]].filter(([, v2]) => String(v2 || "").trim()).forEach(([ic, v2]) => { svg += rect(MX, ly, 10, 10, s.pt, ctx.r * 0.7) + wicon(ic, MX + 2, ly + 2, 6, s.pl) + text(MX + 14, ly + 6.6, clipT(v2, 34), { size: 4.4, fill: s.fg }); ly += 13; });
      if (String(d.whatsapp || "").trim()) svg += btn(ctx, s, MX, ly + 2, clipT(d.waLabel || "Chat on WhatsApp", 24), { wa: true, size: 4.2, h: 9 }).svg;
      const fx = MX + lw + 14, fw = CW - lw - 14;
      if (String(d.email || "").trim()) {
        svg += card(fx, yy, fw, 96) + text(fx + 7, yy + 12, clipT(d.formTitle || "Send a message", 30), { size: 5.8, weight: 700, fill: s.hd });
        ["Your name", "Your email", "Message"].forEach((lb, i) => { const fy = yy + 18 + i * 19; svg += text(fx + 7, fy + 4, lb, { size: 4.2, weight: 600, fill: s.fg }) + rect(fx + 7, fy + 6, fw - 14, i === 2 ? 10 : 8, ctx.V["--bg"], Math.min(ctx.rb, 3), ` stroke="${s.ln}" stroke-width=".5"`); });
      }
      yy += 96; break;
    }
    case "map": {
      const cw = CW, mw = cw * 0.55;
      svg += card(MX, yy, cw, 74) + `<g${k.clipRect(MX, yy, cw, 74, ctx.r)}>${d.image ? (isLibraryPhoto(d.image) ? pic(ctx, d.image, MX, yy, mw, 74) : mapArt(ctx, MX, yy, mw, 74)) : ""}</g>`;
      const bx = MX + (d.image ? mw : 0) + 10;
      svg += text(bx, yy + 18, clipT(d.title, 26), { size: 9, weight: 800, fill: s.hd, font: ctx.hf }) + text(bx, yy + 28, lines(d.address, cw - mw - 20, 4.6, 2), { size: 4.6, lh: 1.4, fill: s.mu }) + text(bx, yy + 42, clipT(d.note, 40), { size: 4.2, fill: s.mu });
      if (d.label) svg += btn(ctx, s, bx, yy + 52, clipT(d.label, 20), { size: 4.2, h: 9 }).svg;
      yy += 74; break;
    }
    case "footer": {
      const fg = ctx.V["--ftfg"];
      svg += text(MX, yy + 6, clipT(d.text, 60), { size: 4.8, fill: fg }) + text(MX, yy + 14, clipT(d.copy, 50), { size: 4.2, fill: fg, opacity: 0.8 });
      yy += 16; return { h: yy - y + P, svg: rect(0, y, TW, yy - y + P, ctx.V["--ft"]) + svg };
    }
    default: {
      head();
      const r = 12; svg += rect(MX + 40, yy, CW - 80, 40, s.card, ctx.r, ` stroke="${s.ln}" stroke-width=".5"`) + k.play(TW / 2, yy + 20, r * 0.6, { fill: s.btn, color: s.btnInk });
      yy += 40;
    }
  }
  const H = yy - y + P;
  const bg = s.photo ? photoBg(ctx, s.photo, y, H) : rect(0, y, TW, H, s.fill);
  return { h: H, svg: bg + svg };
}
function mapArt(ctx, x, y, w, h) {
  const V = ctx.V;
  return rect(x, y, w, h, "#e8f0e6") + `<path d="M${n1(x)} ${n1(y + h * 0.62)}C${n1(x + w * 0.3)} ${n1(y + h * 0.5)} ${n1(x + w * 0.6)} ${n1(y + h * 0.8)} ${n1(x + w)} ${n1(y + h * 0.6)}" stroke="#bfdcf5" stroke-width="7" fill="none"/>`
    + line(x, y + h * 0.25, x + w, y + h * 0.38, "#ffffff", 3) + line(x + w * 0.32, y, x + w * 0.4, y + h, "#ffffff", 3) + line(x + w * 0.7, y, x + w * 0.66, y + h, "#ffffff", 3)
    + circle(x + w * 0.52, y + h * 0.42, 5, V["--p"]) + circle(x + w * 0.52, y + h * 0.42, 2, "#ffffff");
}
/** Thumbnail of a site (the home page): menu bar, hero and the next sections; a page-count badge for multi-page sites. */
export function thumbSite(s, { pages = 0, salt = "" } = {}) {
  const k = kit(s.template || s.name || "site", salt), ctx = ctxOf(s, k);
  const home = s.pages?.length ? s.pages[0].blocks : s.blocks;
  let y = 0, body = "";
  for (const b of home) {
    if (y >= TH - 4) break;
    const r = b.type === "header" ? navBar(ctx, b, y) : b.type === "hero" ? drawHero(ctx, b, y) : drawSection(ctx, b, y);
    body += r.svg; y += r.h;
  }
  const n = pages || s.pages?.length || 1;
  if (n > 1) { const lab = `${n} pages`, w = bw(lab, 5); body += rect(TW - MX - w, TH - 16, w, 11, "#141826", 5.5, ' fill-opacity=".86"') + text(TW - MX - w / 2, TH - 8.6, lab, { size: 5, weight: 700, fill: "#ffffff", anchor: "middle" }); }
  return k.svg(TW, TH, body, { bg: ctx.V["--bg"] });
}
/** Our own drawn thumbnail: the homepage the template opens, with its real photos (small files). */
export function thumb(id) {
  const t = hasTemplate(id) ? id : HAND[0][0], g = parse(t);
  if (g) { const extra = LAY[g.l][9]; return thumbSite(buildGenerated(g.l, g.p, g.t, 2), { pages: Array.isArray(extra) ? extra.length + 1 : 0 }); }
  return thumbSite(makeSite(t));
}
