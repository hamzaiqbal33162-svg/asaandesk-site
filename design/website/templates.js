// Website templates: our own sample content and generated illustrations (names, numbers and addresses are made up;
// phone numbers are placeholders and emails use example.com). Pure: Node tests import this file.
import { newBlock, normalizeSite, DEFAULT_THEME } from "./blocks.js";
import { art, productArt } from "./art.js";

const L = (label, href) => ({ label, href });
const WA = "923000000000";
const site = (name, description, theme, blocks, template) => normalizeSite({ version: 1, name, description, template, theme: { ...DEFAULT_THEME, ...theme }, blocks });

const T = {
  business: {
    label: "Small business", desc: "Home services, repairs, salons, clinics: services, prices, reviews and contact.", palette: "ink", art: () => art("work", "ink"),
    make: () => site("BrightFix Home Services", "Same-day AC service, plumbing and electrical repairs in Lahore with fixed prices and a 30-day warranty.",
      { primary: "#2563eb", accent: "#f59e0b", headingFont: "sans", bodyFont: "sans", corners: "soft" }, [
        newBlock("header", { brand: "BrightFix", links: [L("Services", "#features"), L("Prices", "#pricing"), L("Reviews", "#reviews"), L("FAQ", "#faq"), L("Contact", "#contact")], cta: L("Book a visit", "#contact") }),
        newBlock("hero", { eyebrow: "Lahore · Same-day visits", title: "Home repairs done right, the same day", text: "Trained technicians for AC service, plumbing and electrical work. Fixed prices, no surprises, and a 30-day warranty on every job.", primary: L("Book a visit", "#contact"), secondary: L("See prices", "#pricing"), image: art("work", "ink"), layout: "split" }),
        newBlock("features", { title: "Why families choose BrightFix", intro: "Small team, big care. We treat your home like our own.", items: [
          { icon: "shield", title: "Trained and verified", text: "Every technician is trained, verified and carries an ID card." },
          { icon: "clock", title: "On time, every time", text: "Pick a time slot and we arrive within it, or the visit is free." },
          { icon: "check", title: "Fixed prices", text: "You see the price before we start. No hidden charges." },
          { icon: "award", title: "30-day warranty", text: "If the same problem comes back, we fix it again for free." }] }, { bg: "alt" }),
        newBlock("pricing", { title: "Services and prices", intro: "Prices include the visit. Parts are charged at market rate with a receipt.", plans: [
          { name: "AC service", price: "Rs 2,500", period: "/ unit", text: "Deep clean and gas check.", features: ["Indoor and outdoor unit wash", "Gas pressure check", "Cooling test"], button: L("Book AC service", "#contact"), featured: false },
          { name: "Home check-up", price: "Rs 6,000", period: "/ visit", text: "Our most popular package.", features: ["Wiring and switch check", "Leak check in kitchen and baths", "Small fixes included", "Written report"], button: L("Book check-up", "#contact"), featured: true },
          { name: "Plumbing visit", price: "Rs 1,500", period: "/ visit", text: "Leaks, taps and blockages.", features: ["Diagnosis on the spot", "Tap and mixer repair", "Drain unblocking"], button: L("Book plumber", "#contact"), featured: false }] }),
        newBlock("testimonials", { title: "What our customers say", items: [
          { quote: "The AC was cooling again within an hour. Polite team and a fair price.", name: "Hina A.", role: "DHA, Lahore" },
          { quote: "They found a leak two other plumbers missed. Very professional.", name: "Bilal K.", role: "Johar Town" },
          { quote: "Booked on WhatsApp at 9, fixed by noon. Highly recommended.", name: "Saima R.", role: "Model Town" }] }, { bg: "tint" }),
        newBlock("faq", { title: "Questions and answers", items: [
          { q: "Which areas do you cover?", a: "All of Lahore, including DHA, Gulberg, Johar Town, Model Town and Bahria Town." },
          { q: "How do I pay?", a: "Pay in cash or by bank transfer after the work is done and you are happy." },
          { q: "Do you bring the parts?", a: "Yes. We carry common parts and charge market price with a receipt." },
          { q: "Can I book for the weekend?", a: "Yes, we work seven days a week from 9am to 8pm." }] }),
        newBlock("contact", { title: "Book a visit", text: "Message us on WhatsApp for the fastest reply, or send the form and we will call you back.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: WA, waText: "Hello BrightFix! I would like to book a visit.", waLabel: "Book on WhatsApp", address: "Office 4, Main Boulevard, Gulberg, Lahore", formTitle: "Request a call back", send: "Send request" }, { bg: "alt" }),
        newBlock("map", { title: "Visit our office", address: "Office 4, Main Boulevard, Gulberg, Lahore", note: "Open every day, 9am to 8pm.", query: "Main Boulevard Gulberg Lahore", label: "Open in Maps", image: art("map", "ink") }),
        newBlock("footer", { text: "BrightFix Home Services · Honest repairs since 2019.", links: [L("Services", "#features"), L("Prices", "#pricing"), L("Contact", "#contact")], copy: "© 2026 BrightFix Home Services" }),
      ], "business"),
  },
  restaurant: {
    label: "Restaurant", desc: "Cafés and restaurants: menu deals, gallery, reviews, location and table booking.", palette: "saffron", art: () => art("food", "saffron"),
    make: () => site("Spice Garden Kitchen", "Fresh desi food cooked slow over charcoal. Family deals, dine-in and table booking on WhatsApp.",
      { primary: "#c2410c", accent: "#eab308", headingFont: "serif", bodyFont: "sans", corners: "round" }, [
        newBlock("header", { brand: "Spice Garden", links: [L("Menu", "#pricing"), L("Our story", "#about"), L("Gallery", "#gallery"), L("Reviews", "#reviews"), L("Visit", "#location")], cta: L("Book a table", "#contact") }),
        newBlock("hero", { eyebrow: "Open daily · 12pm to midnight", title: "Fresh desi food, cooked slow", text: "Charcoal karahi, handmade naan and our grandmother's recipes, served warm in the heart of the city.", primary: L("Book a table", "#contact"), secondary: L("See the menu", "#pricing"), image: art("food", "saffron"), layout: "cover" }),
        newBlock("about", { title: "Our story", text: "Spice Garden started as a small family kitchen in 2012. Today we still grind our own spices every morning and cook every karahi to order.\nNo shortcuts, no frozen food: just honest flavour.", image: art("food", "saffron"), button: L("Book a table", "#contact"), side: "left" }),
        newBlock("pricing", { title: "Family deals", intro: "Every deal comes with fresh naan, raita and salad.", plans: [
          { name: "Dinner for two", price: "Rs 3,200", period: "", text: "Perfect for a quiet night out.", features: ["Half chicken karahi", "2 naan and raita", "2 soft drinks"], button: L("Order on WhatsApp", "https://wa.me/" + WA + "?text=Dinner%20for%20two%20please"), featured: false },
          { name: "Family feast", price: "Rs 7,900", period: "", text: "Feeds 4 to 5 people.", features: ["Full mutton karahi", "Chicken tikka (6 pieces)", "Biryani (family size)", "Kheer for everyone"], button: L("Order on WhatsApp", "https://wa.me/" + WA + "?text=Family%20feast%20please"), featured: true },
          { name: "BBQ platter", price: "Rs 4,500", period: "", text: "Straight from the coals.", features: ["Seekh kebab and tikka", "Malai boti", "Grilled vegetables"], button: L("Order on WhatsApp", "https://wa.me/" + WA + "?text=BBQ%20platter%20please"), featured: false }] }, { bg: "alt" }),
        newBlock("gallery", { title: "From our kitchen", intro: "", images: [11, 12, 13, 14, 15, 16].map((i, k) => ({ src: art("abstract", "saffron", i), caption: ["Charcoal karahi", "Fresh naan", "Seekh kebab", "Family biryani", "Kheer", "Mint raita"][k] })) }),
        newBlock("testimonials", { title: "Guests love us", items: [
          { quote: "The best karahi we have had in years. The naan was still puffing when it arrived!", name: "Ahmed and Sana", role: "Family dinner" },
          { quote: "Warm staff, quick service and great value family deals.", name: "Mariam T.", role: "Food blogger" }] }, { bg: "tint" }),
        newBlock("faq", { title: "Good to know", items: [
          { q: "Do you take table bookings?", a: "Yes. Send us a WhatsApp message with the date, time and number of guests." },
          { q: "Is everything halal?", a: "Yes, all our meat is halal and bought fresh every morning." },
          { q: "Do you deliver?", a: "We deliver within 5 km. Order on WhatsApp and pay cash on delivery." },
          { q: "Is there parking?", a: "Free parking is available right in front of the restaurant." }] }),
        newBlock("map", { title: "Come and visit", address: "12 Food Street, Gulshan-e-Iqbal, Karachi", note: "Open daily from 12pm to midnight. Family hall upstairs.", query: "Food Street Gulshan-e-Iqbal Karachi", label: "Get directions", image: art("map", "saffron") }, { bg: "alt" }),
        newBlock("contact", { title: "Book a table", text: "Tell us the date, time and number of guests. We confirm within minutes.", email: "bookings@example.com", phone: "+92 300 0000000", whatsapp: WA, waText: "Hello! I would like to book a table for ___ people on ___ at ___.", waLabel: "Book on WhatsApp", address: "12 Food Street, Gulshan-e-Iqbal, Karachi", formTitle: "Booking request", send: "Send booking" }),
        newBlock("footer", { text: "Spice Garden Kitchen · Made with love and real spices.", links: [L("Menu", "#pricing"), L("Visit", "#location"), L("Book", "#contact")], copy: "© 2026 Spice Garden Kitchen" }, { bg: "dark" }),
      ], "restaurant"),
  },
  portfolio: {
    label: "Portfolio", desc: "Designers, photographers and freelancers: work gallery, services and contact.", palette: "rose", art: () => art("portrait", "rose", 1),
    make: () => site("Sana Malik · Designer", "Brand identities, social media designs and packaging for small businesses.",
      { primary: "#e11d48", accent: "#7c3aed", headingFont: "sans", bodyFont: "sans", corners: "round" }, [
        newBlock("header", { brand: "Sana Malik", links: [L("Work", "#gallery"), L("Services", "#features"), L("About", "#about"), L("Contact", "#contact")], cta: L("Hire me", "#contact") }),
        newBlock("hero", { eyebrow: "Graphic designer · Islamabad", title: "I design brands people remember", text: "Logos, social media posts and packaging for small businesses that want to look as good as they are.", primary: L("See my work", "#gallery"), secondary: L("Get a quote", "#contact"), image: art("portrait", "rose", 1), layout: "split" }),
        newBlock("gallery", { title: "Selected work", intro: "A few projects from the last two years.", images: [21, 22, 23, 24, 25, 26].map((i, k) => ({ src: art("abstract", "rose", i), caption: ["Café brand identity", "Clothing label", "Social media set", "Book cover", "Event poster", "Tea packaging"][k] })) }, { bg: "alt" }),
        newBlock("features", { title: "What I can do for you", intro: "", items: [
          { icon: "palette", title: "Brand identity", text: "Logo, colours and fonts that fit your story." },
          { icon: "camera", title: "Social media designs", text: "Ready-to-post templates for Instagram and Facebook." },
          { icon: "gift", title: "Packaging and labels", text: "Boxes, tags and labels that stand out on the shelf." }] }),
        newBlock("about", { title: "Hello, I'm Sana", text: "I have spent 7 years helping shops, cafés and start-ups find their look. I keep the process simple: one call, three ideas, and changes until you love it.", image: art("work", "rose"), button: L("Download my CV", "#contact"), side: "right" }),
        newBlock("testimonials", { title: "Kind words", items: [
          { quote: "Sana understood our café in one meeting. Customers now take photos of our cups!", name: "Omar F.", role: "Owner, Brew Corner" },
          { quote: "Fast, creative and very easy to work with.", name: "Rabia N.", role: "Founder, Lawn Label" }] }, { bg: "tint" }),
        newBlock("contact", { title: "Let's work together", text: "Tell me about your project and your deadline. I reply within one working day.", email: "sana@example.com", phone: "", whatsapp: WA, waText: "Hi Sana! I have a design project.", waLabel: "Message on WhatsApp", address: "Islamabad, Pakistan", formTitle: "Project details", send: "Send" }),
        newBlock("footer", { text: "Sana Malik · Graphic designer", links: [L("Work", "#gallery"), L("Contact", "#contact")], copy: "© 2026 Sana Malik" }),
      ], "portfolio"),
  },
  event: {
    label: "Event", desc: "Conferences, weddings, workshops: date, schedule, speakers, tickets and venue.", palette: "violet", art: () => art("event", "violet"),
    make: () => site("Makers Fest 2027", "A one-day festival for makers, founders and students: talks, workshops and a maker market.",
      { primary: "#6d28d9", accent: "#f97316", headingFont: "sans", bodyFont: "sans", corners: "soft" }, [
        newBlock("header", { brand: "Makers Fest", links: [L("Schedule", "#schedule"), L("Speakers", "#speakers"), L("Tickets", "#tickets"), L("FAQ", "#faq"), L("Venue", "#location")], cta: L("Get tickets", "#tickets") }),
        newBlock("hero", { eyebrow: "Saturday 13 March 2027 · Expo Centre", title: "Makers Fest 2027", text: "One day of talks, hands-on workshops and a market full of local makers. Come to learn, build and meet your people.", primary: L("Get tickets", "#tickets"), secondary: L("See the schedule", "#schedule"), image: art("event", "violet", 9), layout: "cover" }),
        Object.assign(newBlock("timeline", { title: "Schedule", items: [
          { when: "9:00", title: "Doors open and breakfast", text: "Pick up your badge and meet other makers." },
          { when: "10:00", title: "Opening talk: Start small, ship often", text: "Main hall." },
          { when: "11:30", title: "Workshops", text: "Electronics, woodwork, design and coding: pick one." },
          { when: "14:00", title: "Maker market", text: "60 local makers selling and showing their work." },
          { when: "17:00", title: "Awards and closing", text: "Best stall, best project and best team." }] }), { anchor: "schedule" }),
        Object.assign(newBlock("team", { title: "Speakers", intro: "People who build things and love to share how.", members: [
          { photo: art("portrait", "violet", 0), name: "Dr Kamran I.", role: "Robotics teacher" },
          { photo: art("portrait", "violet", 1), name: "Zara H.", role: "Product designer" },
          { photo: art("portrait", "violet", 2), name: "Faisal M.", role: "Hardware founder" },
          { photo: art("portrait", "violet", 3), name: "Nida S.", role: "Craft business owner" }] }, { bg: "alt" }), { anchor: "speakers" }),
        Object.assign(newBlock("pricing", { title: "Tickets", intro: "Tickets include lunch, tea and all workshops.", plans: [
          { name: "Student", price: "Rs 1,000", period: "", text: "Bring your student card.", features: ["All talks", "One workshop", "Lunch and tea"], button: L("Book student ticket", "#contact"), featured: false },
          { name: "Standard", price: "Rs 2,500", period: "", text: "Most people pick this.", features: ["All talks", "Two workshops", "Lunch and tea", "Festival T-shirt"], button: L("Book standard ticket", "#contact"), featured: true },
          { name: "Maker stall", price: "Rs 8,000", period: "", text: "Sell at the maker market.", features: ["Table and two chairs", "Two passes", "Listed on our page"], button: L("Book a stall", "#contact"), featured: false }] }), { anchor: "tickets" }),
        newBlock("faq", { title: "FAQ", items: [
          { q: "Is there parking?", a: "Yes, free parking at Gate 2 of the Expo Centre." },
          { q: "Can I bring my children?", a: "Children under 12 come free with a ticket holder." },
          { q: "How do I pay?", a: "Message us on WhatsApp and pay by bank transfer or at the gate." },
          { q: "Will talks be recorded?", a: "Yes, recordings are shared with all ticket holders after the event." }] }, { bg: "alt" }),
        newBlock("map", { title: "Venue", address: "Hall 3, Expo Centre, Karachi", note: "Gate 2 opens at 8:30am.", query: "Expo Centre Karachi", label: "Open in Maps", image: art("map", "violet") }),
        newBlock("contact", { title: "Questions or group bookings?", text: "Schools and companies get 15% off for 10 or more tickets.", email: "tickets@example.com", phone: "+92 300 0000000", whatsapp: WA, waText: "Hello! I would like to book tickets for Makers Fest.", waLabel: "Book on WhatsApp", address: "", formTitle: "Send us a message", send: "Send" }, { bg: "tint" }),
        newBlock("footer", { text: "Makers Fest · Made by makers, for makers.", links: [L("Schedule", "#schedule"), L("Tickets", "#tickets"), L("Venue", "#location")], copy: "© 2026 Makers Fest" }, { bg: "dark" }),
      ], "event"),
  },
  academy: {
    label: "Tuition / academy", desc: "Tuition centres, schools and courses: subjects, teachers, fees and admissions.", palette: "teal", art: () => art("study", "teal"),
    make: () => site("Bright Minds Academy", "Small-group tuition for Matric, FSc and O/A Levels with experienced teachers and weekly tests.",
      { primary: "#0f766e", accent: "#f59e0b", headingFont: "cambria", bodyFont: "calibri", corners: "soft" }, [
        newBlock("header", { brand: "Bright Minds Academy", links: [L("Subjects", "#features"), L("Teachers", "#team"), L("Fees", "#pricing"), L("FAQ", "#faq"), L("Admissions", "#contact")], cta: L("Free trial class", "#contact") }),
        newBlock("hero", { eyebrow: "Admissions open for 2026–27", title: "Better grades with small classes and caring teachers", text: "Matric, FSc and O/A Level tuition in groups of 12. Weekly tests, monthly parent reports and a free trial class.", primary: L("Book a free trial", "#contact"), secondary: L("See fees", "#pricing"), image: art("study", "teal"), layout: "split" }),
        newBlock("features", { title: "Subjects we teach", intro: "Every subject is taught by a specialist teacher.", items: [
          { icon: "spark", title: "Mathematics", text: "Concepts first, then lots of practice." },
          { icon: "bolt", title: "Physics", text: "Clear explanations with real-life examples." },
          { icon: "leaf", title: "Chemistry and Biology", text: "Diagrams, past papers and lab basics." },
          { icon: "chat", title: "English", text: "Grammar, essays and speaking confidence." },
          { icon: "code", title: "Computer Science", text: "Programming practice on real computers." },
          { icon: "book", title: "Exam preparation", text: "Past papers and timed mock exams." }] }, { bg: "alt" }),
        newBlock("about", { title: "Why parents trust us", text: "We keep classes small so every student is noticed. Teachers track progress every week and parents get a short report every month.\nOver 90% of our students improved their grade in the first term.", image: art("study", "teal"), button: L("Visit the academy", "#location"), side: "right" }),
        newBlock("team", { title: "Our teachers", intro: "", members: [
          { photo: art("portrait", "teal", 2), name: "Mr Adeel R.", role: "Mathematics, 12 years" },
          { photo: art("portrait", "teal", 1), name: "Ms Farah J.", role: "Chemistry and Biology" },
          { photo: art("portrait", "teal", 0), name: "Mr Hamid Q.", role: "Physics" },
          { photo: art("portrait", "teal", 3), name: "Ms Amna Z.", role: "English" }] }),
        newBlock("pricing", { title: "Monthly fees", intro: "No admission fee this month. Sibling discount 10%.", plans: [
          { name: "Matric", price: "Rs 6,000", period: "/ month", text: "Classes 9 and 10.", features: ["3 subjects", "5 days a week", "Weekly tests"], button: L("Apply now", "#contact"), featured: false },
          { name: "FSc", price: "Rs 9,000", period: "/ month", text: "Pre-medical and pre-engineering.", features: ["4 subjects", "6 days a week", "Weekly tests", "Mock exams"], button: L("Apply now", "#contact"), featured: true },
          { name: "O / A Levels", price: "Rs 12,000", period: "/ month", text: "Cambridge syllabus.", features: ["Per subject", "Past paper practice", "One-to-one help"], button: L("Apply now", "#contact"), featured: false }] }, { bg: "tint" }),
        newBlock("testimonials", { title: "Parents and students say", items: [
          { quote: "My son's maths went from a C to an A in one term. The teachers really care.", name: "Mrs Shazia", role: "Parent" },
          { quote: "The weekly tests kept me on track. I got into my first-choice university.", name: "Hamza A.", role: "FSc student" }] }),
        newBlock("faq", { title: "Questions parents ask", items: [
          { q: "Is there a free trial?", a: "Yes, every student can attend one class free before joining." },
          { q: "What are the timings?", a: "Classes run from 3pm to 8pm, Monday to Saturday." },
          { q: "Do you have separate classes for girls?", a: "Yes, we have separate sections for girls and boys." },
          { q: "How do I get progress reports?", a: "Parents get a short report on WhatsApp every month." }] }, { bg: "alt" }),
        newBlock("contact", { title: "Admissions", text: "Book a free trial class or ask us anything about fees and timings.", email: "admissions@example.com", phone: "+92 300 0000000", whatsapp: WA, waText: "Hello! I would like a free trial class for my child.", waLabel: "Ask on WhatsApp", address: "2nd floor, Plaza 7, Satellite Town, Rawalpindi", formTitle: "Admission enquiry", send: "Send enquiry" }),
        newBlock("map", { title: "Find the academy", address: "2nd floor, Plaza 7, Satellite Town, Rawalpindi", note: "Monday to Saturday, 3pm to 8pm.", query: "Satellite Town Rawalpindi", label: "Open in Maps", image: art("map", "teal") }),
        newBlock("footer", { text: "Bright Minds Academy · Learning made clear.", links: [L("Fees", "#pricing"), L("Admissions", "#contact")], copy: "© 2026 Bright Minds Academy" }),
      ], "academy"),
  },
  shop: {
    label: "Online shop", desc: "Sell on WhatsApp: product catalogue with prices and a one-tap order button.", palette: "forest", art: () => productArt("scarf", "forest"),
    make: () => site("Loom and Clay", "Handmade scarves, candles and home décor from local artisans. Order on WhatsApp, cash on delivery across Pakistan.",
      { primary: "#15803d", accent: "#ca8a04", headingFont: "serif", bodyFont: "sans", corners: "round" }, [
        newBlock("header", { brand: "Loom and Clay", links: [L("Shop", "#shop"), L("Why us", "#features"), L("Reviews", "#reviews"), L("FAQ", "#faq"), L("Contact", "#contact")], cta: L("Order on WhatsApp", "https://wa.me/" + WA) }),
        newBlock("hero", { eyebrow: "Handmade in Pakistan", title: "Beautiful handmade things for your home", text: "Every piece is made by local artisans. Order in one tap on WhatsApp and pay cash on delivery.", primary: L("Shop now", "#shop"), secondary: L("How ordering works", "#faq"), image: productArt("scarf", "forest"), layout: "split" }),
        newBlock("products", { title: "Shop the collection", intro: "Tap \"Order on WhatsApp\" and we confirm your order in minutes.", whatsapp: WA, orderLabel: "Order on WhatsApp", items: [
          { image: productArt("scarf", "forest"), name: "Block-print scarf", price: "Rs 2,400", text: "Soft cotton, hand block-printed." },
          { image: productArt("candle", "forest"), name: "Jasmine candle", price: "Rs 1,200", text: "Soy wax, 30 hours of burn time." },
          { image: productArt("mug", "forest"), name: "Glazed clay mug", price: "Rs 950", text: "Hand-thrown and kiln-fired." },
          { image: productArt("bag", "forest"), name: "Embroidered tote", price: "Rs 1,800", text: "Strong canvas with hand embroidery." },
          { image: productArt("plant", "forest"), name: "Terracotta planter", price: "Rs 1,500", text: "Comes with a small money plant." },
          { image: productArt("bottle", "forest"), name: "Rose attar", price: "Rs 1,100", text: "Alcohol-free, 12 ml." },
          { image: productArt("book", "forest"), name: "Handmade journal", price: "Rs 850", text: "Recycled paper, 120 pages." },
          { image: productArt("shirt", "forest"), name: "Kids' kurta", price: "Rs 2,100", text: "Pure cotton, ages 2 to 8." }] }),
        newBlock("features", { title: "Why shop with us", intro: "", items: [
          { icon: "truck", title: "Cash on delivery", text: "Delivery across Pakistan in 3 to 5 days." },
          { icon: "heart", title: "Truly handmade", text: "Fair pay for every artisan we work with." },
          { icon: "shield", title: "Easy exchange", text: "Not happy? Exchange within 7 days." }] }, { bg: "alt" }),
        newBlock("testimonials", { title: "Happy customers", items: [
          { quote: "The scarf is even prettier in person. Packed with so much care!", name: "Areeba S.", role: "Faisalabad" },
          { quote: "Ordered on WhatsApp, arrived in 3 days. Will order again.", name: "Usman G.", role: "Multan" }] }),
        newBlock("faq", { title: "How ordering works", items: [
          { q: "How do I order?", a: "Tap \"Order on WhatsApp\" under any product. We confirm the price, delivery charges and your address." },
          { q: "How do I pay?", a: "Cash on delivery, or bank transfer and JazzCash before dispatch." },
          { q: "How long does delivery take?", a: "3 to 5 working days to most cities in Pakistan." },
          { q: "Can I exchange an item?", a: "Yes, within 7 days if it is unused and in its packaging." }] }, { bg: "tint" }),
        newBlock("contact", { title: "Talk to us", text: "Custom orders and gifts are welcome. Send us a message!", email: "orders@example.com", phone: "+92 300 0000000", whatsapp: WA, waText: "Hello Loom and Clay! I have a question.", waLabel: "Chat on WhatsApp", address: "Lahore, Pakistan (online store)", formTitle: "Custom order request", send: "Send" }),
        newBlock("footer", { text: "Loom and Clay · Handmade with love.", links: [L("Shop", "#shop"), L("FAQ", "#faq"), L("Contact", "#contact")], copy: "© 2026 Loom and Clay" }, { bg: "dark" }),
      ], "shop"),
  },
  cv: {
    label: "Personal CV", desc: "Your online CV: about, experience, skills and contact.", palette: "slate", art: () => art("portrait", "slate", 3),
    make: () => site("Ayesha Raza · Data analyst", "Data analyst with 5 years of experience in SQL, Python and Power BI dashboards.",
      { primary: "#334155", accent: "#0ea5e9", headingFont: "serif", bodyFont: "sans", corners: "sharp" }, [
        newBlock("header", { brand: "Ayesha Raza", links: [L("About", "#about"), L("Experience", "#experience"), L("Skills", "#skills"), L("Contact", "#contact")], cta: L("Email me", "mailto:ayesha@example.com") }),
        newBlock("hero", { eyebrow: "Data analyst · Lahore", title: "Hi, I'm Ayesha. I turn data into clear decisions.", text: "5 years of building dashboards, cleaning messy data and explaining numbers in plain words.", primary: L("Contact me", "#contact"), secondary: L("See experience", "#experience"), image: art("portrait", "slate", 3), layout: "split" }),
        newBlock("about", { title: "About me", text: "I studied Statistics at university and have worked with retail, banking and health teams since 2021.\nI enjoy turning a messy spreadsheet into one simple chart that everyone understands.", image: "", button: L("", ""), side: "left" }, { bg: "alt" }),
        Object.assign(newBlock("timeline", { title: "Experience and education", items: [
          { when: "2024 – now", title: "Senior data analyst, a retail chain", text: "Built the weekly sales dashboard used by 40 store managers." },
          { when: "2021 – 2024", title: "Data analyst, a microfinance bank", text: "Automated monthly reports and cut prep time from 3 days to 3 hours." },
          { when: "2017 – 2021", title: "BS Statistics", text: "Graduated with distinction." }] }), { anchor: "experience" }),
        Object.assign(newBlock("features", { title: "Skills", intro: "", items: [
          { icon: "code", title: "SQL and Python", text: "Queries, cleaning and automation with pandas." },
          { icon: "spark", title: "Dashboards", text: "Power BI and Excel dashboards people actually use." },
          { icon: "check", title: "Statistics", text: "A/B tests, forecasting and clear summaries." },
          { icon: "chat", title: "Communication", text: "Explaining numbers simply to any team." }] }, { bg: "tint" }), { anchor: "skills" }),
        newBlock("testimonials", { title: "Recommendations", items: [
          { quote: "Ayesha's dashboard changed how our managers plan stock every week.", name: "Head of Operations", role: "Retail chain" }] }),
        newBlock("contact", { title: "Let's talk", text: "Open to full-time and freelance data work.", email: "ayesha@example.com", phone: "+92 300 0000000", whatsapp: "", waText: "", waLabel: "", address: "Lahore, Pakistan", formTitle: "Send me a message", send: "Send" }, { bg: "alt" }),
        newBlock("footer", { text: "Ayesha Raza · Data analyst", links: [L("Experience", "#experience"), L("Contact", "#contact")], copy: "© 2026 Ayesha Raza" }),
      ], "cv"),
  },
};

export const TEMPLATES = Object.entries(T).map(([id, t]) => ({ id, label: t.label, desc: t.desc, palette: t.palette }));
export const templateArt = (id) => (T[id] || T.business).art();
/** A fresh site from a template (new block ids every time). */
export function makeTemplate(id) { return (T[id] || T.business).make(); }
/** A nearly empty site: header, hero and footer. */
export function blankSite() {
  return normalizeSite({ name: "My website", description: "", theme: { ...DEFAULT_THEME }, template: "blank", blocks: [
    newBlock("header", { brand: "My website", links: [], cta: L("", "") }),
    newBlock("hero", { eyebrow: "", title: "Your headline here", text: "Click any text to change it. Add blocks from the Blocks panel.", image: "", layout: "center", primary: L("", ""), secondary: L("", "") }),
    newBlock("footer", { text: "", links: [], copy: "© 2026 My website" }),
  ] });
}
