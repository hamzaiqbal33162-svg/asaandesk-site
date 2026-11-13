// AsaanDesk Studio: presentation decks in Canva's pattern (owner, 13 Nov: every presentation template is a proper,
// professional deck). Pure module, no DOM. templates.js calls the default export with its helpers.
// Every deck has the same ten-slide structure, consistent in one style: title, agenda, problem, solution,
// market / numbers, product, team, plans / pricing, roadmap, thank you / contact; speaker notes on each slide.
// Covers use the photo-led compositions of templates-pro.js (split photo, full-bleed photo, gradient blob with huge
// type, diamond photos, glowing ring, photo band); inner slides use big bold headings, real library photos,
// rounded cards, icon tiles, big numbers and a timeline. Our own copy, colours and shapes.
import { kit, PATTERNS, STYLES, alpha, r1 } from "./templates-pro.js";
import { photoPicker, hasPeople } from "./templates-photos.js";
import { castFor, member, face } from "./templates-faces.js";
import { mix } from "./textfx.js";
import { textWidth } from "./textlayout.js";

/* ---------------- deck styles (the old theme keys stay, so saved ids keep working) ---------------- */
// cover: the style's signature cover; deco: the touch on inner slides; card: card fill on inner slides.
const DS = {
  indigo: { name: "Blue blob", ...STYLES.ocean, cover: "blob", deco: "blob" },
  night: { name: "Midnight", ...STYLES.midnight, cover: "glow", deco: "glow" },
  coral: { name: "Terracotta", ...STYLES.terracotta, cover: "split", deco: "arch" },
  ocean: { name: "Corporate", ...STYLES.ocean, acc: "#123a8c", acc2: "#2f80ff", ink: "#0e2149", cover: "diamond", deco: "diamond" },
  paper: { name: "Minimal", bg: "#eeebe3", ink: "#26241f", sub: "#6b675c", acc: "#26241f", acc2: "#8a9a5b", onAcc: "#ffffff", deep: "#1e1c18", head: "serif", body: "sans", cover: "band", deco: "minimal" },
  mint: { name: "Mint", ...STYLES.teal, cover: "split", deco: "blob" },
  plum: { name: "Plum", bg: "#1d0f3a", ink: "#ffffff", sub: "#c9b8f0", acc: "#ff6ec7", acc2: "#8b5cff", onAcc: "#1d0f3a", deep: "#12082a", head: "sans", body: "sans", dark: true, cover: "glow", deco: "glow" },
  sun: { name: "Sunny", bg: "#fff8e6", ink: "#1f1a0e", sub: "#6a5f45", acc: "#f5b301", acc2: "#e4572e", onAcc: "#1f1a0e", deep: "#1f1a0e", head: "sans", body: "sans", cover: "band", deco: "bold" },
  forest: { name: "Forest", bg: "#f2f0e8", ink: "#13362a", sub: "#4d6a5e", acc: "#174d3a", acc2: "#d9b45a", onAcc: "#ffffff", deep: "#0f2c22", head: "sans", body: "sans", cover: "split", deco: "split" },
  slate: { name: "Slate", bg: "#f6f7f9", ink: "#141a24", sub: "#596273", acc: "#1d4ed8", acc2: "#10b981", onAcc: "#ffffff", deep: "#101826", head: "sans", body: "sans", cover: "bleed", deco: "band" },
  rose: { name: "Crimson", ...STYLES.crimson, cover: "band", deco: "bold" },
  mono: { name: "Mono", bg: "#0d0d0d", ink: "#ffffff", sub: "#b4b4b4", acc: "#ffffff", acc2: "#ff4b2b", onAcc: "#0d0d0d", deep: "#000000", head: "sans", body: "sans", dark: true, cover: "bleed", deco: "bold" },
  sand: { name: "Sand", ...STYLES.olive, cover: "blob", deco: "minimal" },
  lagoon: { name: "Lagoon", ...STYLES.teal, acc: "#0b7a6e", acc2: "#ff8a5b", cover: "diamond", deco: "band" },
};
const COVERS = ["split", "bleed", "blob", "diamond", "glow", "band"];
// Dark styles keep a dark cover (the deck stays in one style): light-page compositions swap for dark ones.
const DARK_SWAP = { blob: "border", diamond: "card", band: "mega" };
// Light styles keep a light cover: the dark glowing ring becomes a round photo on a soft colour disc.
const LIGHT_SWAP = { glow: "circle" };
/** Gallery names of the six layout variants (cover composition and inner arrangement). */
export const VARIANT_NAMES = ["signature", "photo", "bold", "geometric", "spotlight", "editorial"];

/* ---------------- deck content (our own copy) ---------------- */
const CONTENT = {};
const deckData = [
  ["startup-pitch", "Startup pitch deck", "night", "pitch startup investor funding business seed", {
    kicker: "Seed round 2026", name: "PayLite", sub: "Simple payments for small shops, right from a phone.", by: "Sara Khan & Ali Raza, founders", date: "March 2026", brand: "PayLite",
    agenda: ["The problem", "Our solution", "Market and traction", "Business model", "Team and the ask"],
    problem: { title: "The problem", lead: "Small shops still run on cash, and cash costs them sales every day.", items: [["Lost sales", "4 in 10 customers walk away when a shop cannot take cards."], ["Costly hardware", "Card machines cost $300 and lock shops into long contracts."], ["No records", "Cash leaves no trail, so shops cannot get loans or plan stock."]] },
    solution: { title: "One app. Every payment.", text: "PayLite turns any phone into a payment terminal: cards, wallets and QR codes in seconds, with no extra hardware.", bullets: ["Set up in five minutes", "1.5% per payment, no monthly fee", "Daily payouts to any bank"] },
    chart: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], values: [180, 260, 410, 620, 880, 1200] },
    stats: { title: "Traction", note: "Six months after launch, with no paid marketing.", items: [["1,200", "shops live"], ["18%", "growth every month"], ["$2.4M", "paid through PayLite"]] },
    product: { title: "Built for the counter", items: [["Tap to pay", "Cards and wallets on any NFC phone."], ["QR codes", "Print once, get paid every day."], ["Sales reports", "See what sells, by hour and by day."], ["Stock alerts", "Know before a best-seller runs out."]] },
    team: { title: "The team", people: [["Sara Khan", "CEO, ex-fintech lead"], ["Ali Raza", "CTO, payments engineer"], ["Hina Malik", "Head of sales"], ["Omar Siddiqui", "Design lead"]] },
    plans: { title: "Business model", items: [["Starter", "$0", "per month", ["1.5% per payment", "Daily payouts", "Email support"]], ["Pro", "$19", "per month", ["1.2% per payment", "Stock and staff", "Phone support"]], ["Chain", "$79", "per month", ["1.0% per payment", "Many branches", "Account manager"]]] },
    roadmap: { title: "Roadmap", items: [["Q2 2026", "Three more cities"], ["Q3 2026", "Small business loans in the app"], ["Q4 2026", "10,000 shops live"], ["2027", "Two new countries"]] },
    closing: { title: "Join us", text: "We are raising $1.5M to reach 10,000 shops by next year.", contact: ["hello@paylite.example", "+1 555 0142 300", "www.paylite.example"] },
    notes: ["Open with the shopkeeper story: a lost sale at 9 pm.", "Walk through the five parts in one breath.", "Make the pain concrete: one shop, one day.", "Show the app on a phone if you can.", "Point at the growth: steady, organic, every month.", "Pick the one feature this audience cares about most.", "One line per person: why they are the right fit.", "Explain how revenue grows with every shop.", "Tie each step to the money you are raising.", "Ask for the meeting and share the data room."] }],
  ["business-plan", "Business plan", "slate", "business plan strategy company finance grocery", {
    kicker: "Business plan 2026", name: "Green Basket Grocers", sub: "Fresh local produce delivered within two hours.", by: "Prepared by the founding team", date: "January 2026", brand: "Green Basket",
    agenda: ["Company overview", "Market analysis", "Operations", "Financial plan", "Next steps"],
    problem: { title: "The gap in the market", lead: "Busy families want fresh food, but supermarkets are far and slow to deliver.", items: [["Slow delivery", "Next-day slots mean food arrives when nobody is home."], ["Tired produce", "Fruit spends days in warehouses before it reaches a kitchen."], ["Farmers lose out", "Local growers get less than a third of the shelf price."]] },
    solution: { title: "Farm to door in two hours", text: "We buy from 40 local farms every morning and deliver by bike within two hours of your order.", bullets: ["Picked this morning", "Two-hour delivery windows", "Fair prices for farmers"] },
    chart: { labels: ["M2", "M4", "M6", "M8", "M10", "M12"], values: [120, 260, 410, 600, 820, 1000] },
    stats: { title: "Market size", note: "City of 3.2 million people, grocery spend per year.", items: [["$1.8B", "fresh food market"], ["24%", "already order online"], ["11%", "yearly growth online"]] },
    product: { title: "What we sell", items: [["Fruit and veg", "Seasonal boxes or pick your own."], ["Dairy and eggs", "From three family farms nearby."], ["Bakery", "Bread baked at 5 am, delivered by 9."], ["Pantry", "Rice, lentils, oils and spices."]] },
    team: { title: "Founding team", people: [["Ayesha Malik", "CEO, retail operations"], ["Bilal Ahmed", "COO, logistics"], ["Sana Raza", "Head of sourcing"], ["Daniel Reyes", "Finance"]] },
    plans: { title: "How we earn", items: [["Pay as you go", "$4", "delivery", ["No subscription", "Two-hour slots", "Cancel any time"]], ["Basket Plus", "$9", "per month", ["Free delivery", "Members' prices", "Priority slots"]], ["Office", "$49", "per month", ["Weekly fruit boxes", "Invoice billing", "Account manager"]]] },
    roadmap: { title: "Next 12 months", items: [["Month 1", "Open the first hub"], ["Month 4", "1,000 weekly orders"], ["Month 8", "Second hub, north side"], ["Month 12", "Break even"]] },
    closing: { title: "Thank you", text: "Questions, ideas and introductions to growers are always welcome.", contact: ["team@greenbasket.example", "+1 555 0108 220", "www.greenbasket.example"] },
    notes: ["Introduce the company in one sentence.", "Agenda: five parts, about 20 minutes.", "Describe a real customer's evening.", "Our promise: fresh, fast and fair.", "Explain where the numbers come from.", "Show a sample box.", "Introduce the team and their background.", "Walk through the three ways we earn.", "Milestones and what each one needs.", "Thank the audience and invite questions."] }],
  ["marketing-plan", "Marketing plan", "coral", "marketing plan campaign social media growth brand", {
    kicker: "Q1 marketing plan", name: "Spring Campaign", sub: "Grow online orders by 40% with social media and email.", by: "Marketing team", date: "Q1 2026", brand: "Bloom & Co.",
    agenda: ["Goals", "Audience", "Channels", "Budget", "Timeline"],
    problem: { title: "Where we are", lead: "Orders grew last year, but most new customers bought only once.", items: [["Low repeat", "Only 18% of customers ordered a second time."], ["Quiet socials", "We post twice a week with little reach."], ["No email plan", "12,000 subscribers hear from us once a month."]] },
    solution: { title: "The spring plan", text: "A six-week campaign that turns first orders into habits: a strong offer, regular content and a welcome email series.", bullets: ["Spring bundle at 20% off", "Three posts and two reels a week", "Five-email welcome series"] },
    chart: { labels: ["W1", "W2", "W3", "W4", "W5", "W6"], values: [310, 340, 380, 430, 470, 520] },
    stats: { title: "Our goals", note: "Targets for the end of March, compared with last quarter.", items: [["+40%", "online orders"], ["30%", "repeat customers"], ["2×", "social reach"]] },
    product: { title: "Channels", items: [["Instagram", "Reels, stories and a weekly giveaway."], ["Email", "Welcome series and a monthly letter."], ["Partners", "Three local creators with discount codes."], ["In store", "Flyers and QR codes at the till."]] },
    team: { title: "Who does what", people: [["Zara Ahmed", "Campaign lead"], ["Leo Martins", "Social media"], ["Priya Shah", "Email and CRM"], ["Noah Bennett", "Design"]] },
    plans: { title: "Budget", items: [["Content", "$4,500", "six weeks", ["Photo and video shoot", "Reels editing", "Templates"]], ["Paid social", "$6,000", "six weeks", ["Instagram ads", "Retargeting", "A/B tests"]], ["Partners", "$2,500", "six weeks", ["Three creators", "Discount codes", "Event day"]]] },
    roadmap: { title: "Timeline", items: [["Week 1", "Shoot and plan"], ["Week 2", "Launch the bundle"], ["Week 4", "Creator takeovers"], ["Week 6", "Review and report"]] },
    closing: { title: "Let's grow", text: "Feedback on the plan by Friday, please.", contact: ["marketing@bloom.example", "+1 555 0177 410", "www.bloom.example"] },
    notes: ["Set the goal before anything else.", "Five parts, ten minutes.", "Be honest about what did not work.", "The plan in one slide.", "Targets we will report every week.", "Why these channels, in this order.", "Owners for every task.", "How the budget is split.", "Key dates for the team.", "Ask for feedback and sign-off."] }],
  ["science-lesson", "Science lesson", "sun", "lesson education class school teacher science water cycle", {
    labels: { agenda: "Learning goals", problem: "Big questions", solution: "Big idea", stats: "Facts", product: "Vocabulary", team: "Roles", plans: "Challenges", roadmap: "Lesson plan" }, kicker: "Grade 6 · Science", name: "The Water Cycle", sub: "How water moves between the sky, the land and the sea.", by: "Ms. Ayesha · Room 12", date: "Lesson 3", brand: "Science · Grade 6",
    agenda: ["What is the water cycle?", "Evaporation", "Condensation", "Precipitation", "Quiz and experiment"],
    problem: { title: "Three big questions", lead: "By the end of today you can answer all three.", items: [["Where does rain come from?", "Clouds are made of tiny drops of water."], ["Why do puddles dry?", "The sun warms the water and it rises as vapour."], ["Is water ever new?", "The same water has been moving for millions of years."]] },
    solution: { title: "The big idea", text: "Water keeps moving in a loop: the sun lifts it into the air, it cools into clouds and it falls back as rain or snow.", bullets: ["The sun gives the energy", "Cold air turns vapour into drops", "Rivers carry water back to the sea"] },
    stats: { title: "Water in numbers", note: "All the water on Earth, and where it is right now.", items: [["97%", "is salt water in the oceans"], ["2%", "is frozen in ice and snow"], ["9 days", "a drop stays in the air"]] },
    product: { title: "Key words", items: [["Evaporation", "Liquid water turns into a gas."], ["Condensation", "Vapour cools into water drops."], ["Precipitation", "Water falls as rain, snow or hail."], ["Collection", "Water gathers in rivers and seas."]] },
    team: { title: "Group roles", kind: "student young portrait smiling", people: [["Leader", "keeps the group on task"], ["Recorder", "writes what you see"], ["Timekeeper", "watches the clock"], ["Reporter", "shares with the class"]] },
    plans: { title: "Choose your challenge", items: [["Explorer", "Level 1", "10 minutes", ["Label the diagram", "Match the key words", "Draw one cloud"]], ["Scientist", "Level 2", "15 minutes", ["Explain each step", "Add arrows", "Give an example"]], ["Expert", "Level 3", "20 minutes", ["Design an experiment", "Predict the result", "Present it"]]] },
    roadmap: { title: "Today's lesson", items: [["10 min", "Warm-up questions"], ["15 min", "The cycle step by step"], ["15 min", "Group challenge"], ["5 min", "Quiz time"]] },
    closing: { title: "Quiz time!", text: "What makes water rise into the sky? Write your answer, then share it.", contact: ["Homework: page 42", "Bring a clear jar on Friday", "Science club · Wed 3 pm"] },
    notes: ["Ask: who got wet on the way to school?", "Read the five steps aloud together.", "Let pairs guess the answers first.", "Draw the loop on the board as you talk.", "Ask which number surprises them.", "Students copy the key words.", "Hand out the role cards.", "Students pick a level.", "Keep time with the class timer.", "Collect answers on sticky notes."] }],
  ["company-profile", "Company profile", "ocean", "company profile corporate about us services clients logistics", {
    photoHint: "Corporate office logistics", agendaWho: "team colleagues meeting office staff",
    kicker: "Company profile", name: "Bluewave Logistics", sub: "Moving goods safely across the country since 2012.", by: "www.bluewave.example", date: "2026", brand: "Bluewave",
    agenda: ["Who we are", "What we do", "Our network", "Clients", "Contact"],
    problem: { title: "What our clients face", lead: "Getting goods across the country on time is harder than it looks.", items: [["Delays", "One late truck can stop a whole production line."], ["Damage", "Fragile goods break when they change hands."], ["No visibility", "Most firms cannot say where a parcel is right now."]] },
    solution: { title: "Our promise", text: "One partner from pickup to delivery, with live tracking and people who answer the phone.", bullets: ["98.6% on-time delivery", "Live GPS tracking on every truck", "Insured door to door"] },
    chart: { labels: ["2021", "2022", "2023", "2024", "2025"], values: [84, 112, 140, 171, 205], unit: "k" },
    stats: { title: "Bluewave in numbers", note: "Figures for the 2025 financial year.", items: [["420", "trucks on the road"], ["36", "cities served daily"], ["98.6%", "on-time delivery"]] },
    product: { title: "Services", items: [["Freight", "Full and part truck loads."], ["Warehousing", "Six hubs with 24/7 security."], ["Last mile", "Same-day delivery in 12 cities."], ["Cold chain", "Food and medicine at 2–8 °C."]] },
    team: { title: "Leadership", people: [["Imran Sheikh", "Chief executive"], ["Maria Lopez", "Operations"], ["Kamran Ali", "Fleet and safety"], ["Emma Clarke", "Customer success"]] },
    plans: { title: "Ways to work with us", items: [["Spot", "On demand", "per load", ["Quote in 1 hour", "Any route", "Live tracking"]], ["Contract", "Fixed rate", "per month", ["Reserved trucks", "Monthly reports", "Account manager"]], ["Enterprise", "Custom", "per year", ["Dedicated fleet", "Warehousing", "API integration"]]] },
    roadmap: { title: "Our journey", items: [["2012", "Founded with 3 trucks"], ["2016", "First cold-chain fleet"], ["2021", "Six warehouses"], ["2026", "Electric trucks in 5 cities"]] },
    closing: { title: "Let's move together", text: "Tell us where your goods need to go.", contact: ["sales@bluewave.example", "+1 555 0190 600", "www.bluewave.example"] },
    notes: ["Who we are in one line.", "The five parts of this profile.", "Show you understand their world.", "Our promise and how we keep it.", "Numbers that build trust.", "Services they can buy today.", "Faces behind the company.", "How contracts work.", "Fourteen years in one line.", "Close with a clear next step."] }],
  ["project-status", "Project status report", "indigo", "project status report update progress timeline risks team website", {
    kicker: "Weekly update · Week 14", name: "Website Redesign", sub: "Status, progress, risks and next steps.", by: "Project lead: Omar Siddiqui", date: "14 April", brand: "Website Redesign",
    agenda: ["Summary", "Progress", "Risks", "Budget", "Next steps"],
    problem: { title: "Risks this week", lead: "Three things could move the launch date if we do nothing.", items: [["Content late", "12 product pages still need copy from marketing."], ["Payment review", "The bank's security review takes up to 10 days."], ["Holiday cover", "Two developers are away in week 16."]] },
    solution: { title: "What we are doing", text: "Each risk has an owner and a fix that is already in motion.", bullets: ["Copy sprint with marketing on Thursday", "Security review booked for Monday", "Contractor cover agreed for week 16"] },
    chart: { labels: ["W10", "W11", "W12", "W13", "W14"], values: [8, 12, 15, 19, 23] },
    stats: { title: "Progress", note: "Work done against the plan for this phase.", items: [["72%", "of tasks complete"], ["31", "pages built"], ["4", "weeks to launch"]] },
    product: { title: "Shipped this week", items: [["New home page", "Faster, clearer and live on staging."], ["Checkout", "Three steps instead of five."], ["Search", "Instant results as you type."], ["Accessibility", "All pages pass the colour check."]] },
    team: { title: "The project team", people: [["Omar Siddiqui", "Project lead"], ["Lena Fischer", "Design"], ["Ravi Patel", "Front end"], ["Grace Kim", "Content"]] },
    plans: { title: "Budget", items: [["Planned", "$84,000", "total", ["Design and build", "Testing", "Launch support"]], ["Spent", "$58,900", "to date", ["70% of budget", "On track", "No overruns"]], ["Forecast", "$82,500", "at launch", ["$1,500 under", "Contingency kept", "Signed off"]]] },
    roadmap: { title: "Next steps", items: [["Week 15", "Content complete"], ["Week 16", "User testing"], ["Week 17", "Fixes and sign-off"], ["Week 18", "Launch"]] },
    closing: { title: "Questions?", text: "The full tracker is shared in the project folder.", contact: ["omar@company.example", "Weekly call · Mon 10 am", "Tracker: /projects/web"] },
    notes: ["Lead with the headline: on track.", "Agenda in one line.", "Name each risk and its owner.", "Show the fix, not just the problem.", "Progress against plan.", "Demo one item if there is time.", "Thank the team by name.", "Budget is on track.", "Dates the team should remember.", "Open the floor."] }],
  ["portfolio", "Design portfolio", "paper", "portfolio design work case study creative designer", {
    coverWho: "woman headshot portrait professional creative",
    labels: { problem: "Process", solution: "Case study", product: "Services", team: "Clients", plans: "Packages", roadmap: "Process" }, kicker: "Portfolio 2026", name: "Selected Work", sub: "Brand identity, packaging and web design.", by: "Zara Ahmed · Designer", date: "2026", brand: "Zara Ahmed",
    agenda: ["About me", "Brand identity", "Packaging", "Web design", "Contact"],
    problem: { title: "How I work", lead: "Good design starts with listening, not with a logo.", items: [["Listen", "Workshops with the team and their customers."], ["Shape", "Sketches, moodboards and three clear directions."], ["Refine", "One idea, polished down to the last detail."]] },
    solution: { title: "Case study: Saffron Kitchen", text: "A warm, modern identity for a family restaurant opening its second branch.", bullets: ["New logo and colour system", "Menus, signage and packaging", "Bookings up 35% in three months"] },
    chart: { labels: ["2022", "2023", "2024", "2025", "2026"], values: [6, 8, 9, 11, 14] },
    stats: { title: "In numbers", note: "Eight years of independent practice.", items: [["60+", "brands designed"], ["14", "awards and features"], ["9 / 10", "clients come back"]] },
    product: { title: "Services", items: [["Brand identity", "Logos, colours, type and voice."], ["Packaging", "From concept to print-ready files."], ["Web design", "Sites that are clear and fast."], ["Art direction", "Photo shoots and campaigns."]] },
    team: { title: "Clients and partners", kind: "happy customer client portrait smiling", people: [["Saffron Kitchen", "Restaurant brand"], ["Northwind", "Logistics identity"], ["Loop Bottles", "Packaging"], ["Fieldnote", "Website"]] },
    plans: { title: "Packages", items: [["Starter", "$1,800", "project", ["Logo and colours", "Business cards", "Two rounds"]], ["Brand", "$4,500", "project", ["Full identity", "Guidelines", "Social kit"]], ["Launch", "$9,000", "project", ["Identity and web", "Packaging", "Art direction"]]] },
    roadmap: { title: "A typical project", items: [["Week 1", "Discovery workshop"], ["Week 2", "Three directions"], ["Week 4", "Refined identity"], ["Week 6", "Files and guidelines"]] },
    closing: { title: "Let's work together", text: "Taking new projects from June.", contact: ["hello@zaraahmed.example", "+1 555 0123 987", "www.zaraahmed.example"] },
    notes: ["A one-line introduction.", "What you will see.", "Explain the process.", "Tell the project story.", "Proof in numbers.", "What clients can hire you for.", "Name-drop with permission.", "Pricing gives a clear starting point.", "Set expectations on time.", "Leave contact details on screen."] }],
  ["product-launch", "Product launch", "plum", "product launch new feature release marketing event watch", {
    kicker: "Launch event", name: "Meet Nova Watch", sub: "A smart watch with a 14-day battery and health tracking.", by: "Product team", date: "15 October", brand: "Nova",
    agenda: ["Why Nova", "Design", "Health features", "Price and plans", "Availability"],
    problem: { title: "Smart watches let you down", lead: "We asked 2,000 people what they dislike about their watch.", items: [["Daily charging", "Most watches die before the weekend."], ["Too many alerts", "Notifications that never stop buzzing."], ["Hard to read", "Small screens that vanish in the sun."]] },
    solution: { title: "Nova lasts two weeks", text: "A low-power screen and a new chip give Nova 14 days of battery with health tracking on all the time.", bullets: ["14-day battery", "Bright always-on screen", "Calm mode for fewer alerts"] },
    chart: { labels: ["Watch A", "Watch B", "Nova"], values: [2, 5, 14], unit: " days" },
    stats: { title: "By the numbers", note: "Tested by 500 people for three months.", items: [["14 days", "battery life"], ["38 g", "lightest in class"], ["50 m", "water resistant"]] },
    product: { title: "Health, all day", items: [["Heart rate", "Every second, day and night."], ["Sleep score", "Simple advice each morning."], ["Steps and runs", "GPS built in, no phone needed."], ["Stress check", "A one-minute breathing coach."]] },
    team: { title: "Made by", people: [["Elena Rossi", "Product lead"], ["Kenji Watanabe", "Hardware"], ["Amara Lewis", "Health science"], ["Tom Becker", "Design"]] },
    plans: { title: "Price and plans", items: [["Nova", "$199", "one time", ["Aluminium case", "Sport strap", "1-year warranty"]], ["Nova Pro", "$299", "one time", ["Titanium case", "Two straps", "2-year warranty"]], ["Nova+ app", "$4", "per month", ["Coaching plans", "Family sharing", "Cancel any time"]]] },
    roadmap: { title: "Availability", items: [["15 Oct", "Pre-orders open"], ["1 Nov", "In stores"], ["Dec", "New strap colours"], ["2027", "Nova Kids"]] },
    closing: { title: "Nova is here", text: "Pre-order today and get a second strap free.", contact: ["nova.example/preorder", "press@nova.example", "@novawatch"] },
    notes: ["Hold up the watch before you speak.", "Five things we will cover.", "Lean on the survey quotes.", "The one-sentence pitch.", "Numbers people will repeat.", "Demo the sleep score.", "Credit the team.", "Clear prices, no small print.", "Dates for the press.", "Call to pre-order."] }],
  ["thesis-defence", "Thesis defence", "mono", "thesis defence research university academic study solar energy", {
    labels: { problem: "Research problem", solution: "Design", stats: "Results", product: "Method", team: "Thanks", plans: "Options", roadmap: "Future work" }, kicker: "MSc thesis defence", name: "Solar Power for Rural Schools", sub: "A low-cost design for reliable classroom electricity.", by: "Hamza Ali · Energy Engineering", date: "June 2026", brand: "Thesis defence",
    agenda: ["Background", "Research question", "Method", "Results", "Conclusions"],
    problem: { title: "The research problem", lead: "One in three rural schools has power for less than four hours a day.", items: [["Unreliable grid", "Daily outages during school hours."], ["Costly diesel", "Generators cost more than teachers' salaries."], ["Lost learning", "No lights, fans or computers after noon."]] },
    solution: { title: "Proposed system", text: "A 3 kW solar kit with a small battery, sized for lights, fans and ten laptops, built from parts sold locally.", bullets: ["Sized from real school loads", "Built and fixed by local technicians", "Pays for itself in 3.4 years"] },
    chart: { labels: ["Diesel", "Grid", "Solar kit"], values: [4, 5, 11], unit: " h" },
    stats: { title: "Key results", note: "Measured in four pilot schools over two terms.", items: [["96%", "school hours powered"], ["$2,900", "cost per school"], ["3.4 yrs", "payback period"]] },
    product: { title: "Method", items: [["Load survey", "Four schools, 12 weeks of data."], ["Simulation", "Hourly model of sun and demand."], ["Pilot build", "Two kits installed and logged."], ["Interviews", "Teachers, pupils and technicians."]] },
    team: { title: "Acknowledgements", people: [["Dr. Sana Iqbal", "Supervisor"], ["Prof. Mark Allen", "Co-supervisor"], ["Pilot schools", "Four head teachers"], ["Field team", "Two technicians"]] },
    plans: { title: "Three design options", items: [["Basic", "1.5 kW", "lights only", ["Lowest cost", "No battery", "Daytime only"]], ["Proposed", "3 kW", "lights + IT", ["5 kWh battery", "Fans and laptops", "Best value"]], ["Full", "6 kW", "whole school", ["10 kWh battery", "Evening classes", "Highest cost"]]] },
    roadmap: { title: "Future work", items: [["Phase 1", "Scale to 20 schools"], ["Phase 2", "Remote monitoring"], ["Phase 3", "Pay-as-you-go model"], ["Phase 4", "National guideline"]] },
    closing: { title: "Thank you", text: "I welcome your questions.", contact: ["hamza.ali@university.example", "Department of Energy Engineering", "Full thesis in the library"] },
    notes: ["Thank the committee.", "Structure of the talk.", "State the problem with one number.", "Describe the design clearly.", "Lead with the main result.", "Explain the method briefly.", "Thank supervisors and schools.", "Why the middle option wins.", "What comes next.", "Invite questions."] }],
  ["quarterly-review", "Quarterly business review", "mint", "quarterly review sales report results kpi business", {
    kicker: "Q3 2026", name: "Quarterly Business Review", sub: "Results, highlights and plans for next quarter.", by: "Sales and Operations", date: "October 2026", brand: "Q3 review",
    agenda: ["Highlights", "Results", "Challenges", "Customers", "Plan for Q4"],
    problem: { title: "Challenges", lead: "A strong quarter, with three things to fix before Q4.", items: [["Slow onboarding", "New customers wait 9 days to go live."], ["Churn in SMB", "Small accounts left at twice the usual rate."], ["Hiring gaps", "Two sales roles open for over 60 days."]] },
    solution: { title: "Highlights", text: "Revenue beat the target for the third quarter in a row, led by our new enterprise plan.", bullets: ["Revenue 12% above target", "Three enterprise wins", "NPS up to 62"] },
    chart: { labels: ["Jul", "Aug", "Sep"], values: [1.4, 1.6, 1.8], unit: "M", prefix: "$" },
    stats: { title: "Results", note: "July to September, against the plan.", items: [["$4.8M", "revenue"], ["+12%", "above target"], ["62", "customer NPS"]] },
    product: { title: "Customer wins", items: [["Northwind", "Enterprise plan, 3 years."], ["Harbor Market", "Rolled out to 40 stores."], ["Loop", "Upgraded to Pro."], ["Fieldnote", "Expanded to the US team."]] },
    team: { title: "Regional leads", people: [["Ayesha Noor", "North"], ["Daniel Reyes", "South"], ["Mei Chen", "East"], ["James Okafor", "West"]] },
    plans: { title: "Revenue by plan", items: [["Starter", "$0.6M", "Q3", ["1,400 accounts", "-4% vs Q2", "Self-serve"]], ["Pro", "$2.1M", "Q3", ["620 accounts", "+9% vs Q2", "Best seller"]], ["Enterprise", "$2.1M", "Q3", ["38 accounts", "+31% vs Q2", "Fastest growth"]]] },
    roadmap: { title: "Plan for Q4", items: [["October", "Onboarding in 3 days"], ["November", "SMB save team"], ["December", "Fill open roles"], ["Q4 close", "$5.4M target"]] },
    closing: { title: "Thank you", text: "Detailed numbers are in the shared report.", contact: ["ops@company.example", "Report: /reviews/q3", "Next review: January"] },
    notes: ["Open with the headline number.", "Agenda.", "Be direct about what went wrong.", "Celebrate the wins.", "Walk through the results.", "Name customers we can share.", "Thank each region.", "Where revenue comes from.", "Owners and dates for Q4.", "Close and take questions."] }],
  ["workshop", "Workshop training", "forest", "workshop training session team learning skills time management", {
    labels: { problem: "The problem", solution: "The idea", stats: "Results", product: "Tools", team: "Groups", plans: "Your plan", roadmap: "Schedule" }, kicker: "Half-day workshop", name: "Time Management That Works", sub: "Simple habits to plan your week and beat busy days.", by: "Facilitator: Nadia Hussain", date: "Saturday, 9 am", brand: "Time workshop",
    agenda: ["Where time goes", "Plan the week", "Focus blocks", "Saying no", "Your action plan"],
    problem: { title: "Why weeks get away", lead: "Most of us are busy all day and still feel behind.", items: [["Hidden time", "Meetings and messages eat 40% of the day."], ["No plan", "Without a weekly plan, urgent beats important."], ["Constant switching", "Every interruption costs 20 minutes of focus."]] },
    solution: { title: "The weekly reset", text: "Thirty minutes every Friday to choose three priorities and protect time for them.", bullets: ["Pick three priorities", "Book focus blocks first", "Batch email twice a day"] },
    chart: { labels: ["Week 1", "Week 2", "Week 3", "Week 4"], values: [1, 2, 4, 5], unit: " h" },
    stats: { title: "What changes", note: "Survey of 300 people four weeks after this workshop.", items: [["5 hrs", "saved each week"], ["78%", "feel more in control"], ["3", "priorities, not 30"]] },
    product: { title: "Four tools", items: [["Time audit", "Track one normal day in 30-minute blocks."], ["Weekly reset", "A 30-minute Friday planning habit."], ["Focus blocks", "90 minutes, phone away, door closed."], ["The kind no", "Polite ways to protect your time."]] },
    team: { title: "Today's groups", kind: "team colleagues group workshop", group: true, people: [["Team Sun", "tables 1–3"], ["Team Sea", "tables 4–6"], ["Team Sky", "tables 7–9"], ["Team Leaf", "tables 10–12"]] },
    plans: { title: "Pick your plan", items: [["Light", "1 habit", "this week", ["Weekly reset", "One focus block", "Check in Friday"]], ["Steady", "2 habits", "this month", ["Weekly reset", "Daily focus block", "Email twice a day"]], ["Full", "4 habits", "this quarter", ["All four tools", "Buddy check-ins", "Monthly review"]]] },
    roadmap: { title: "Today's plan", items: [["9:00", "Where time goes"], ["10:00", "Plan the week"], ["11:15", "Focus and saying no"], ["12:15", "Action plans"]] },
    closing: { title: "Thank you", text: "Slides and worksheets are in your inbox.", contact: ["nadia@trainers.example", "+1 555 0166 230", "Follow-up call in 4 weeks"] },
    notes: ["Welcome and a quick show of hands.", "Walk through the morning.", "Ask: what ate your time yesterday?", "Introduce the weekly reset.", "Share the survey results.", "Hand out the worksheets.", "Form groups.", "Everyone picks a plan.", "Keep to time.", "Thank everyone and share materials."] }],
  ["brand-guidelines", "Brand guidelines", "rose", "brand guidelines style guide logo colours fonts identity", {
    labels: { problem: "Why", solution: "Story", stats: "At a glance", product: "Elements", team: "Contacts", plans: "Logo", roadmap: "Rollout" }, kicker: "Brand book", name: "Bloom Brand Guidelines", sub: "How to use our logo, colours, fonts and voice.", by: "Brand team · Version 2.0", date: "2026", brand: "Bloom",
    agenda: ["Our story", "Logo", "Colour", "Typography", "Voice and photos"],
    problem: { title: "Why guidelines", lead: "A brand is a promise, and every touchpoint keeps it or breaks it.", items: [["Consistency", "The same look builds trust everywhere."], ["Speed", "Teams make good work faster with clear rules."], ["Quality", "Fewer mistakes in print and online."]] },
    solution: { title: "Our story", text: "Bloom started as a flower stall in 2014. Today we deliver fresh flowers in six cities, and we still wrap every bunch by hand.", bullets: ["Fresh, honest, generous", "Made by hand", "Always on time"] },
    stats: { title: "Brand at a glance", note: "The building blocks every design uses.", items: [["1", "logo, two versions"], ["5", "brand colours"], ["2", "typefaces"]] },
    product: { title: "Core elements", items: [["Logo", "Keep clear space of one petal around it."], ["Colour", "Bloom red leads; cream and ink support."], ["Type", "Bold sans for headlines, serif for stories."], ["Photos", "Natural light, real hands, real flowers."]] },
    team: { title: "Brand contacts", people: [["Lucy Moore", "Brand lead"], ["Ahmed Raza", "Design"], ["Sofia Ortiz", "Copy and voice"], ["Ken Ito", "Photography"]] },
    plans: { title: "Logo versions", items: [["Primary", "Full", "colour", ["On cream or white", "Minimum 30 mm", "Most uses"]], ["Reverse", "White", "on red or ink", ["Dark photos", "Social posts", "Packaging"]], ["Icon", "Petal", "small spaces", ["App icon", "Favicons", "Stickers"]]] },
    roadmap: { title: "Rolling it out", items: [["May", "New packaging"], ["June", "Website and app"], ["July", "Stores and vans"], ["August", "Partner kit"]] },
    closing: { title: "Questions?", text: "Download the logo files and templates from the brand portal.", contact: ["brand@bloom.example", "Portal: brand.bloom.example", "Version 2.0 · 2026"] },
    notes: ["Why this matters.", "What is inside the book.", "Explain the three reasons.", "Tell the founding story.", "The building blocks.", "Walk through each element.", "Who to ask for help.", "When to use each logo.", "Rollout dates.", "Where to find the files."] }],
  // Two more decks for the hand-made Presentations templates (templates.js: pitch-deck, lesson-slides).
  ["bright-ideas", "Startup pitch deck", "indigo", "pitch startup investor funding business", {
    kicker: "Investor presentation 2026", name: "Bright Ideas Co.", sub: "Simple business software for small shops, in their own language.", by: "Your name · Founder", date: "2026", brand: "Bright Ideas Co.",
    agenda: ["The problem", "Our solution", "Our numbers", "The market", "The ask"],
    problem: { title: "The problem", lead: "Small shops lose hours every week to paperwork.", items: [["Paperwork", "Invoices and stock kept in notebooks."], ["Costly tools", "Good software is expensive and hard to use."], ["Language", "Most apps ignore local languages."]] },
    solution: { title: "Our solution", text: "One simple app for invoices, stock and payments, made for phones and easy for everyone.", bullets: ["Works in a few taps", "Made for phones", "English and local languages"] },
    stats: { title: "Our numbers", note: "Twelve months after launch.", items: [["12k", "happy users"], ["98%", "would recommend us"], ["4.8", "average rating"]] },
    stats2: { title: "The market", note: "Small-business software in the region.", items: [["$4.2B", "market size"], ["1.8M", "shops still on paper"], ["12%", "growth each year"]] },
    product: { title: "Inside the app", items: [["Invoices", "Send a bill on WhatsApp."], ["Stock", "Know what to reorder."], ["Payments", "Cards, wallets and cash."], ["Reports", "Profit at a glance."]] },
    team: { title: "The team", people: [["Ayesha Malik", "CEO"], ["Bilal Ahmed", "CTO"], ["Sana Raza", "Sales"], ["Omar Khan", "Support"]] },
    plans: { title: "Business model", items: [["Free", "Rs 0", "per month", ["One shop", "Invoices and stock", "Community help"]], ["Pro", "Rs 999", "per month", ["Up to 5 users", "Reports and backups", "Chat support"]], ["Business", "Rs 2,999", "per month", ["Many branches", "Staff roles", "Phone support"]]] },
    roadmap: { title: "Roadmap", items: [["Q1", "Launch in Lahore"], ["Q2", "1,000 paying shops"], ["Q3", "Karachi and Islamabad"], ["Q4", "Payments built in"]] },
    closing: { title: "Thank you", text: "Let's build the tools small shops deserve.", contact: ["hello@brightideas.pk", "0300 1234567", "www.brightideas.pk"] },
    notes: ["Introduce the company.", "", "The problem in one story.", "The solution, simply.", "Numbers that matter.", "How big this can get.", "How we make money.", "Where we go next.", "The people.", "Thank and ask."] }],
  ["water-cycle", "Science lesson slides", "sun", "lesson education class school science water cycle", {
    kicker: "Science class · Class 5", name: "The Water Cycle", sub: "Lesson 3: how water travels from the sea to the sky and back.", by: "Class 5 · Lesson 3", date: "Science", brand: "The Water Cycle",
    agenda: ["Name the three steps of the water cycle", "Explain where rain comes from", "Draw the cycle with arrows"],
    agendaTitle: "Today we will…", labels: { agenda: "Learning goals", problem: "Big ideas", roadmap: "Step by step", product: "Vocabulary", solution: "Experiment" },
    problem: { title: "Three big steps", lead: "The water cycle has three main steps.", items: [["Evaporation", "Sun heats water and it rises."], ["Condensation", "Vapour cools into clouds."], ["Precipitation", "Water falls as rain."]] },
    solution: { title: "Try it at home", text: "Put a bowl of warm water in the sun, cover it with cling film and put a cold cup on top. Wait 30 minutes.", bullets: ["Look for drops under the film", "Write down what you see", "Draw it in your notebook"] },
    product: { title: "Key words", items: [["Evaporate", "to turn from liquid into gas"], ["Condense", "to turn from gas into liquid"], ["Vapour", "water as an invisible gas"], ["Precipitation", "rain, snow or hail"]] },
    roadmap: { title: "The cycle", items: [["Step 1", "Sun heats the sea"], ["Step 2", "Clouds form"], ["Step 3", "Rain falls"], ["Step 4", "Rivers return water"]] },
    closing: { title: "Quiz time!", text: "What makes water rise into the sky?", contact: ["Write your answer", "Share with a partner", "Homework: page 42"] },
    notes: ["Introduce the topic.", "Read the goals together.", "Three steps on the board.", "Walk around the loop.", "Copy the key words.", "Explain the home experiment.", "Quiz to finish."] }],
];
for (const [key, title, theme, tags, c] of deckData) CONTENT[key] = { title, tags, theme, c };

/* ---------------- slide builders ---------------- */
// g: { K, k (kit), st, W, H, S, mx, my, v, mir, d (content), n (slide number), pick }
const ICON = ["icon-check-circle", "icon-idea", "icon-users", "icon-star", "icon-settings", "icon-heart", "icon-globe", "icon-calendar", "icon-mobile", "icon-document", "icon-money", "icon-leaf"];
function heading(g, label, title, o = {}) {
  const { k, st, W, H, mx, my } = g;
  const ink = o.ink || st.ink, out = [];
  const lab = k.kicker(label, o.x ?? mx, o.y ?? my, o.w || W * 0.6, { color: o.acc || accentOn(st), bar: true, size: H * 0.022 });
  out.push(...lab.layers);
  const t = k.text(title, o.x ?? mx, (o.y ?? my) + lab.h + H * 0.022, o.w || W * 0.62, { size: o.size || H * 0.085, maxH: o.maxH || H * 0.26, min: H * 0.045, bold: true, family: st.head, color: ink, lh: 1.02, ls: -0.02, name: "Heading" });
  out.push(t);
  return { layers: out, bottom: t.y + t.h };
}
/** Small section label of a slide (a deck can name its sections, e.g. a lesson's "Key words"). */
const lab = (g, key, def) => g.d.labels?.[key] || def;
const accentOn = (st) => (st.acc === st.bg || (st.dark && st.acc === "#ffffff") ? st.acc2 : st.acc);
/** Brand name and page number along the bottom, between x0 and x1. */
function footer(g, x0 = g.mx, x1 = g.W - g.mx) {
  const { k, st, H, d, n } = g;
  const w = x1 - x0;
  return [k.text(d.brand || d.name, x0, H - H * 0.07, w * 0.6, { size: H * 0.018, color: st.sub, lines: 1, name: "Footer" }), k.text(String(n).padStart(2, "0"), x1 - w * 0.2, H - H * 0.07, w * 0.2, { size: H * 0.018, bold: true, color: st.sub, align: "right", lines: 1, name: "Page number" })];
}
/** The style's quiet touch on inner slides (behind the content). */
function deco(g) {
  const { k, st, W, H, S } = g;
  switch (st.deco) {
    case "blob": return [k.grad(k.circle(W * 0.72, -H * 0.5, W * 0.5, st.acc, { h: H * 0.9, name: "Gradient blob" }), [alpha(st.acc2, 0.55), alpha(st.acc, 0.3), alpha(st.acc, 0)], 160)];
    case "glow": return [k.grad(k.circle(W * 0.7, H * 0.55, W * 0.55, st.acc, { h: W * 0.55, name: "Glow" }), [alpha(st.acc2, 0), alpha(st.acc, 0.22), alpha(st.acc2, 0.38)], 140)];
    case "diamond": return [k.K.S("polygon", r1(W * 0.86), r1(-H * 0.12), r1(H * 0.34), r1(H * 0.34), "none", { sides: 4, stroke: st.acc2, sw: Math.max(2, S * 0.004), name: "Diamond outline" })];
    case "band": return [k.rect(0, 0, W, H * 0.014, st.acc, { name: "Top band" }), k.rect(W * 0.7, 0, W * 0.3, H * 0.014, st.acc2, { name: "Top band end" })];
    case "minimal": return [k.rect(g.mx, H - H * 0.095, W - 2 * g.mx, Math.max(1, H * 0.0015), st.ink, { op: 0.3, name: "Footer rule" })];
    case "bold": return [k.rect(0, 0, W * 0.012, H, accentOn(st), { name: "Side bar" })];
    case "arch": return [k.sticker("shape-arch", W * 0.9, H * 0.62, W * 0.12, { c1: mix(st.acc, st.bg, 0.75), name: "Arch", h: H * 0.5 })].filter(Boolean);
    default: return [k.circle(W * 0.93, H * 0.08, H * 0.05, st.acc2, { name: "Accent dot" })];
  }
}
/** A small bar chart from our own shapes and text (sharp and editable everywhere): the last bar in the accent. */
function barChart(g, ch, x, y, w, h) {
  const { k, st, H } = g, vals = ch.values.slice(0, 6), labels = ch.labels.slice(0, vals.length), n = vals.length, out = [];
  const max = Math.max(...vals) || 1, slot = w / n, bw = slot * 0.58, labH = H * 0.045, valH = H * 0.045, plotH = h - labH - valH;
  out.push(k.rect(x, y + valH + plotH, w, Math.max(1, H * 0.002), st.ink, { op: 0.3, name: "Axis" }));
  vals.forEach((v, i) => {
    const bh = Math.max(H * 0.01, (v / max) * plotH), bx = x + i * slot + (slot - bw) / 2, by = y + valH + plotH - bh, last = i === n - 1;
    out.push(k.rect(bx, by, bw, bh, last ? accentOn(st) : mix(accentOn(st), st.bg, 0.6), { radius: Math.min(bw * 0.18, H * 0.012), name: "Bar " + labels[i] }));
    out.push(k.text(`${ch.prefix || ""}${v.toLocaleString("en")}${ch.unit || ""}`, bx - slot * 0.2, by - valH, bw + slot * 0.4, { size: H * 0.022, bold: true, color: st.ink, align: "center", lines: 1, name: "Value" }));
    out.push(k.text(labels[i], x + i * slot, y + valH + plotH + H * 0.012, slot, { size: H * 0.02, color: st.sub, align: "center", lines: 1, name: "Label" }));
  });
  return out;
}
const cardFill = (st) => (st.dark ? mix(st.bg, "#ffffff", 0.07) : mix(st.bg, st.ink, 0.04) === st.bg ? "#ffffff" : st.bg === "#ffffff" ? "#f3f5fa" : mix(st.bg, "#ffffff", 0.55));

const SLIDES = {
  cover(g) {
    const { d, st, W, H } = g;
    const pat0 = COVERS[(COVERS.indexOf(st.cover) + g.v) % COVERS.length];
    // Bold styles show the gradient-blob variant as mega type (huge tight capitals on the style colour).
    const pat = st.dark ? DARK_SWAP[pat0] || pat0 : LIGHT_SWAP[pat0] || (pat0 === "blob" && st.deco === "bold" ? "mega" : pat0);
    const S = Math.min(W, H);
    // A deck about a person (a portfolio) shows that person on the cover, like Canva's portfolio covers; a second
    // photo (diamond pair) shows the deck's subject.
    const pg = { k: g.k, c: { head: d.name, kicker: d.kicker, sub: d.sub, details: [d.by, d.date].filter(Boolean), cta: null, price: null, deco: null, hint: d.coverWho || d.hint, ...(d.coverWho ? { hint2: d.hint } : {}) }, W, H, S, b: 0, st, v: g.v, mir: g.v % 2 === 1, land: true, wide: false, tall: false, m: r1(H * 0.09) };
    pg.X = (x, w) => (pg.mir ? W - x - w : x);
    g.k.boost = 1.15;
    const out = PATTERNS[pat](pg);
    g.k.boost = 1;
    return { bg: out.bg, layers: out.layers, cover: pat };
  },
  agenda(g) {
    const { k, st, W, H, mx, my, d } = g;
    const L = [...deco(g)], items = d.agenda.slice(0, 5);
    if (g.v % 3 === 2 && items.length >= 3) {
      // Tiles: the heading over a photo band, then one numbered card per part.
      const hd = heading(g, lab(g, "agenda", "Agenda"), d.agendaTitle || "Today's agenda", { w: W * 0.6, size: H * 0.125 });
      L.push(...hd.layers);
      const top = Math.max(hd.bottom + H * 0.07, H * 0.36), gap = W * 0.016, n = items.length, cw = (W - 2 * mx - gap * (n - 1)) / n, ch = H - top - H * 0.13;
      items.forEach((s, i) => {
        const x = mx + i * (cw + gap), hot = i === 0;
        L.push(k.rect(x, top, cw, ch, hot ? accentOn(st) : cardFill(st), { radius: H * 0.03, name: "Agenda card" }));
        L.push(k.text(String(i + 1).padStart(2, "0"), x + cw * 0.12, top + ch * 0.1, cw * 0.76, { size: H * 0.08, bold: true, family: st.head, color: hot ? st.onAcc : accentOn(st), lines: 1, name: "Number" }));
        L.push(k.rect(x + cw * 0.12, top + ch * 0.5, cw * 0.2, Math.max(2, H * 0.004), hot ? st.onAcc : accentOn(st), { name: "Card line" }));
        L.push(k.text(s, x + cw * 0.12, top + ch * 0.56, cw * 0.76, { size: H * 0.03, bold: true, color: hot ? st.onAcc : st.ink, lh: 1.2, maxH: ch * 0.38, name: "Agenda item" }));
      });
      return { bg: st.bg, layers: [...L, ...footer(g)] };
    }
    const left = g.mir ? W * 0.5 : mx, colW = W * 0.4;
    const hd = heading(g, lab(g, "agenda", "Agenda"), d.agendaTitle || "Today's agenda", { x: left, w: colW, size: H * 0.125 });
    L.push(...hd.layers);
    const ph = { x: left, y: hd.bottom + H * 0.06, w: colW * 0.82, h: H - hd.bottom - H * 0.06 - H * 0.12 };
    if (ph.h > H * 0.2) {
      const f = k.photo(ph.x, ph.y, ph.w, ph.h, { shape: "rounded", radius: H * 0.025, hint: d.hint });
      // "Who we are" (company profile): the team at work, like Canva's about-us slides.
      L.push(d.agendaWho ? face(g.cast, f, d.agendaWho, { group: true }) : f);
    }
    const rx = g.mir ? mx : W * 0.5, rw = W * 0.5 - mx, rowH = Math.min(H * 0.15, (H * 0.72) / items.length), y0 = H * 0.5 - (rowH * items.length) / 2;
    items.forEach((s, i) => {
      const y = y0 + i * rowH;
      L.push(k.text(String(i + 1).padStart(2, "0"), rx, y + rowH * 0.22, W * 0.08, { size: H * 0.05, bold: true, color: accentOn(st), family: st.head, lines: 1, name: "Number" }));
      L.push(k.text(s, rx + W * 0.08, y + rowH * 0.26, rw - W * 0.08, { size: H * 0.036, color: st.ink, lines: 2, name: "Agenda item", lh: 1.15 }));
      if (i < items.length - 1) L.push(k.rect(rx, y + rowH - 1, rw, Math.max(1, H * 0.0018), st.ink, { op: 0.18, name: "Divider" }));
    });
    return { bg: st.bg, layers: [...L, ...footer(g)] };
  },
  problem(g) {
    const { k, st, W, H, mx, my, d } = g;
    const p = d.problem, L = [...deco(g)];
    const hd = heading(g, lab(g, "problem", "The challenge"), p.title, { w: W * 0.55, size: H * 0.125 });
    L.push(...hd.layers);
    if (p.lead) L.push(k.text(p.lead, W * 0.62, my + H * 0.04, W * 0.38 - mx, { size: H * 0.03, color: st.sub, lh: 1.4, maxH: H * 0.18, name: "Lead" }));
    // Canva pattern: one big rounded container split in three columns (outlined on dark, soft fill on light).
    const top = Math.max(hd.bottom + H * 0.08, H * 0.4), bh = H - top - H * 0.13, bw = W - 2 * mx;
    const outlined = st.dark || g.v % 2 === 1;
    L.push(k.rect(mx, top, bw, bh, outlined ? "none" : cardFill(st), { radius: H * 0.05, stroke: outlined ? mix(st.ink, st.bg, 0.55) : undefined, sw: outlined ? Math.max(1.5, H * 0.002) : undefined, name: "Panel" }));
    const cw = bw / 3, pad = W * 0.025;
    p.items.slice(0, 3).forEach(([t, s], i) => {
      const x = mx + i * cw;
      if (i) L.push(k.rect(x, top + bh * 0.12, Math.max(1, H * 0.002), bh * 0.76, st.ink, { op: 0.2, name: "Column line" }));
      L.push(k.circle(x + pad, top + bh * 0.16, H * 0.034, i === 1 ? st.acc2 : accentOn(st), { name: "Dot" }));
      L.push(k.text(t, x + pad + H * 0.05, top + bh * 0.16 - H * 0.004, cw - pad * 2 - H * 0.05, { size: H * 0.036, bold: true, upper: true, color: st.ink, lines: 2, lh: 1.1, name: "Point title" }));
      L.push(k.text(s, x + pad, top + bh * 0.42, cw - pad * 2, { size: H * 0.031, color: st.sub, lh: 1.45, maxH: bh * 0.48, name: "Point text" }));
    });
    return { bg: st.bg, layers: [...L, ...footer(g)] };
  },
  solution(g) {
    const { k, st, W, H, mx, my, d } = g;
    const s = d.solution, L = [];
    const pw = W * 0.46, px = g.mir ? 0 : W - pw;
    L.push(k.photo(px, 0, pw, H, { hint: d.hint }));
    if (g.v % 3 === 2) L.push(k.rect(g.mir ? pw - W * 0.012 : px, 0, W * 0.012, H, accentOn(st), { name: "Accent edge" }));
    const x = g.mir ? pw + mx : mx, w = W - pw - 2 * mx;
    const hd = heading(g, lab(g, "solution", "The solution"), s.title, { x, w, size: H * 0.09, y: H * 0.14 });
    L.push(...hd.layers);
    const t = k.text(s.text, x, hd.bottom + H * 0.04, w, { size: H * 0.03, color: st.sub, lh: 1.45, maxH: H * 0.2, name: "Text" });
    L.push(t);
    let y = t.y + t.h + H * 0.05;
    for (const b of s.bullets.slice(0, 3)) {
      const e = k.sticker("icon-check-circle", x, y, H * 0.042, { c1: accentOn(st) });
      if (e) L.push(e);
      const bt = k.text(b, x + H * 0.065, y + H * 0.002, w - H * 0.065, { size: H * 0.032, bold: true, color: st.ink, lines: 2, lh: 1.15, name: "Point" });
      L.push(bt);
      y += Math.max(bt.h, H * 0.042) + H * 0.035;
    }
    return { bg: st.bg, layers: [...L, ...footer(g, x, x + w)] };
  },
  stats(g, key = "stats") {
    const { k, st, W, H, mx, my, d } = g;
    const s = d[key], L = [...deco(g)];
    if (g.v % 2 === 0) {
      // Big numbers on cards in a row, the heading above.
      const hd = heading(g, key === "stats2" ? "Market" : lab(g, "stats", "In numbers"), s.title, { w: W * 0.6, size: H * 0.125 });
      L.push(...hd.layers);
      if (s.note) L.push(k.text(s.note, W * 0.69, my + H * 0.05, W * 0.31 - mx, { size: H * 0.026, color: st.sub, lh: 1.4, maxH: H * 0.14, name: "Note" }));
      const top = Math.max(hd.bottom + H * 0.08, H * 0.42), gap = W * 0.022, cw = (W - 2 * mx - 2 * gap) / 3, ch = H - top - H * 0.14;
      s.items.slice(0, 3).forEach(([num, label], i) => {
        const x = mx + i * (cw + gap), hot = i === 1;
        L.push(k.rect(x, top, cw, ch, hot ? accentOn(st) : cardFill(st), { radius: H * 0.035, name: "Stat card" }));
        L.push(k.text(num, x + W * 0.025, top + ch * 0.14, cw - W * 0.05, { size: H * 0.13, bold: true, family: st.head, color: hot ? st.onAcc : accentOn(st), lines: 1, ls: -0.02, name: "Number" }));
        L.push(k.text(label, x + W * 0.025, top + ch * 0.62, cw - W * 0.05, { size: H * 0.03, color: hot ? mix(st.onAcc, accentOn(st), 0.2) : st.sub, lh: 1.3, maxH: ch * 0.32, name: "Stat label" }));
      });
    } else {
      // Heading and a photo on one side, the numbers stacked with hairlines on the other.
      const lx = g.mir ? W * 0.55 : mx, lw = W * 0.38;
      const hd = heading(g, key === "stats2" ? "Market" : lab(g, "stats", "In numbers"), s.title, { x: lx, w: lw, size: H * 0.125 });
      L.push(...hd.layers);
      let nb = hd.bottom;
      if (s.note) { const nt = k.text(s.note, lx, hd.bottom + H * 0.03, lw, { size: H * 0.027, color: st.sub, lh: 1.4, maxH: H * 0.14, name: "Note" }); L.push(nt); nb = nt.y + nt.h; }
      const ct = Math.max(H * 0.5, nb + H * 0.05);
      if (d.chart && key === "stats" && H * 0.87 - ct > H * 0.22) L.push(...barChart(g, d.chart, lx, ct, lw * 0.92, H * 0.87 - ct));
      else { const py = Math.max(H * 0.55, nb + H * 0.04); L.push(k.photo(lx, py, lw * 0.9, Math.max(H * 0.15, H * 0.85 - py), { shape: "rounded", radius: H * 0.025, hint: d.hint })); }
      const rx = g.mir ? mx : W * 0.5, rw = W * 0.5 - mx, rowH = H * 0.24, y0 = H * 0.13;
      s.items.slice(0, 3).forEach(([num, label], i) => {
        const y = y0 + i * rowH;
        L.push(k.text(num, rx, y, rw * 0.55, { size: H * 0.12, bold: true, family: st.head, color: i === 1 ? st.acc2 === st.bg ? st.ink : st.acc2 : accentOn(st), lines: 1, ls: -0.02, name: "Number" }));
        L.push(k.text(label, rx + rw * 0.58, y + H * 0.05, rw * 0.42, { size: H * 0.03, color: st.sub, lh: 1.3, lines: 2, name: "Stat label" }));
        if (i < 2) L.push(k.rect(rx, y + rowH - H * 0.04, rw, Math.max(1, H * 0.002), st.ink, { op: 0.18, name: "Divider" }));
      });
    }
    return { bg: st.bg, layers: [...L, ...footer(g)] };
  },
  product(g) {
    const { k, st, W, H, mx, my, d } = g;
    const p = d.product, L = [...deco(g)];
    const pw = W * 0.36, px = g.mir ? W - mx - pw : mx;
    const round = g.v % 3 === 1;
    if (round) { const dd = Math.min(pw, H * 0.62); L.push(k.circle(px - H * 0.02, H * 0.19 - H * 0.02, dd + H * 0.04, "none", { stroke: accentOn(st), sw: Math.max(2, H * 0.003), name: "Ring" })); L.push(k.photo(px, H * 0.19, dd, dd, { shape: "circle", hint: d.hint })); }
    else { L.push(k.rect(px + H * 0.03, my + H * 0.03, pw, H - 2 * my - H * 0.05, st.acc2 === st.bg ? accentOn(st) : st.acc2, { radius: H * 0.03, name: "Accent block" })); L.push(k.photo(px, my, pw, H - 2 * my - H * 0.05, { shape: "rounded", radius: H * 0.03, hint: d.hint })); }
    const x = g.mir ? mx : px + pw + W * 0.06, w = W - pw - mx * 2 - W * 0.06;
    const hd = heading(g, lab(g, "product", "Features"), p.title, { x, w, size: H * 0.085 });
    L.push(...hd.layers);
    const top = hd.bottom + H * 0.07, cw = (w - W * 0.03) / 2, ch = (H - top - H * 0.13) / 2;
    p.items.slice(0, 4).forEach(([t, s], i) => {
      const cx = x + (i % 2) * (cw + W * 0.03), cy = top + Math.floor(i / 2) * ch;
      const ts = H * 0.07;
      L.push(k.rect(cx, cy, ts, ts, i % 3 === 1 ? st.acc2 === st.bg ? st.ink : st.acc2 : accentOn(st), { radius: ts * 0.28, name: "Icon tile" }));
      const e = k.sticker(ICON[(i + g.v) % ICON.length], cx + ts * 0.22, cy + ts * 0.22, ts * 0.56, { c1: "#ffffff" });
      if (e) L.push(e);
      L.push(k.text(t, cx + ts + W * 0.015, cy + ts * 0.08, cw - ts - W * 0.015, { size: H * 0.032, bold: true, color: st.ink, lines: 1, name: "Feature" }));
      L.push(k.text(s, cx + ts + W * 0.015, cy + ts * 0.08 + H * 0.05, cw - ts - W * 0.015, { size: H * 0.025, color: st.sub, lh: 1.4, maxH: ch - H * 0.1, name: "Feature text" }));
    });
    return { bg: st.bg, layers: [...L, ...footer(g)] };
  },
  team(g) {
    const { k, st, W, H, mx, my, d } = g;
    const t = d.team, L = [...deco(g)], people = t.people.slice(0, 4);
    const hd = heading(g, lab(g, "team", "Team"), t.title, { w: W * 0.7, size: H * 0.125 });
    L.push(...hd.layers);
    const gap = W * 0.03, cw = (W - 2 * mx - gap * (people.length - 1)) / people.length;
    const top = Math.max(hd.bottom + H * 0.08, H * 0.36);
    const square = g.v % 2 === 1;
    const faces = hasPeople();
    people.forEach(([n, r], i) => {
      const x = mx + i * (cw + gap);
      const dd = Math.min(cw, H * 0.36);
      if (!faces) {
        // No photos of people in the library yet: a clean initials avatar (a photo frame is one click away).
        const ax = x + (cw - dd) / 2, c1 = i % 2 ? (st.acc2 === st.bg ? accentOn(st) : st.acc2) : accentOn(st);
        L.push(k.circle(ax - H * 0.012, top - H * 0.012, dd + H * 0.024, "none", { stroke: c1, sw: Math.max(2, H * 0.003), name: "Ring" }));
        L.push(k.grad(k.circle(ax, top, dd, c1, { name: "Avatar" }), [mix(c1, "#ffffff", 0.25), c1, mix(c1, "#000000", 0.25)], 160));
        const ini = n.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("") || n.slice(0, 2).toUpperCase();
        const t = k.text(ini, ax, 0, dd, { size: dd * 0.34, bold: true, family: st.head, color: "#ffffff", align: "center", lines: 1, name: "Initials" });
        t.y = r1(top + (dd - t.h) / 2); L.push(t);
      } else if (square) L.push(member(g.cast, k.photo(x, top, cw, dd, { shape: "rounded", radius: H * 0.025, hint: "team people portrait" }), n, r, { base: t.kind, group: t.group }));
      else {
        L.push(k.circle(x + (cw - dd) / 2 + dd * 0.08, top + dd * 0.08, dd, i % 2 ? st.acc2 === st.bg ? accentOn(st) : st.acc2 : accentOn(st), { name: "Colour disc", op: 0.9 }));
        // The member's own portrait: woman or man by the name, the kind by the role (doctor, teacher…) or the deck.
        L.push(member(g.cast, k.photo(x + (cw - dd) / 2, top, dd, dd, { shape: "circle", hint: "team people portrait" }), n, r, { base: t.kind, group: t.group }));
      }
      const al = square && faces ? "left" : "center";
      L.push(k.text(n, x, top + dd + H * 0.04, cw, { size: H * 0.034, bold: true, color: st.ink, align: al, lines: 1, name: "Name" }));
      L.push(k.text(r, x, top + dd + H * 0.095, cw, { size: H * 0.025, color: st.sub, align: al, lines: 2, name: "Role" }));
    });
    return { bg: st.bg, layers: [...L, ...footer(g)] };
  },
  plans(g) {
    const { k, st, W, H, mx, my, d } = g;
    const p = d.plans, L = [...deco(g)];
    const hd = heading(g, lab(g, "plans", "Plans"), p.title, { w: W * 0.6, size: H * 0.125 });
    L.push(...hd.layers);
    const top = Math.max(hd.bottom + H * 0.07, H * 0.34), gap = W * 0.022, cw = (W - 2 * mx - 2 * gap) / 3, ch = H - top - H * 0.12;
    p.items.slice(0, 3).forEach(([name, price, unit, feats], i) => {
      const x = mx + i * (cw + gap), hot = i === 1, ink = hot ? st.onAcc : st.ink, sub = hot ? mix(st.onAcc, accentOn(st), 0.25) : st.sub;
      const y = hot ? top - H * 0.03 : top, h = hot ? ch + H * 0.03 : ch;
      L.push(k.rect(x, y, cw, h, hot ? accentOn(st) : cardFill(st), { radius: H * 0.03, name: hot ? "Featured plan" : "Plan card" }));
      const pad = W * 0.02;
      if (hot) { const pl = k.pill("Most popular", x + cw / 2, y - H * 0.022, { size: H * 0.018, fill: st.ink, color: st.bg, align: "center" }); L.push(...pl.layers); }
      L.push(k.text(name, x + pad, y + pad, cw * 0.55, { size: H * 0.03, bold: true, color: ink, upper: true, ls: 0.06, lines: 1, name: "Plan" }));
      const pt = k.text(price, x + pad, y + h * 0.17, cw - 2 * pad, { size: H * 0.09, bold: true, family: st.head, color: ink, lines: 1, ls: -0.02, name: "Price" }); L.push(pt);
      L.push(k.text(unit, x + pad, pt.y + pt.h, cw - 2 * pad, { size: H * 0.024, color: sub, lines: 1, name: "Price unit" }));
      L.push(k.rect(x + pad, y + h * 0.48, cw - 2 * pad, Math.max(1, H * 0.0018), ink, { op: 0.25, name: "Divider" }));
      feats.slice(0, 3).forEach((f, j) => {
        const fy = y + h * 0.54 + j * H * 0.06;
        const e = k.sticker("icon-check", x + pad, fy + H * 0.004, H * 0.026, { c1: hot ? st.onAcc : accentOn(st) });
        if (e) L.push(e);
        L.push(k.text(f, x + pad + H * 0.04, fy, cw - 2 * pad - H * 0.04, { size: H * 0.025, color: ink, lines: 1, name: "Plan feature" }));
      });
    });
    return { bg: st.bg, layers: [...L, ...footer(g)] };
  },
  roadmap(g) {
    const { k, st, W, H, mx, my, d } = g;
    const r = d.roadmap, L = [...deco(g)], items = r.items.slice(0, 4);
    const withPhoto = g.v % 2 === 0;
    if (withPhoto) L.push(k.photo(0, H * 0.62, W, H * 0.38, { hint: d.hint }), k.shade(0, H * 0.62, W, H * 0.38, st.bg, [1, 0.25], 180));
    else L.push(k.photo(W * 0.68, my, W * 0.32 - g.mx, H * 0.3, { shape: "rounded", radius: H * 0.025, hint: d.hint }));
    const hd = heading(g, lab(g, "roadmap", "Roadmap"), r.title, { w: W * 0.6, size: H * 0.125 });
    L.push(...hd.layers);
    const ly = withPhoto ? H * 0.47 : H * 0.6, x0 = mx, x1 = W - mx, step = (x1 - x0) / items.length;
    L.push(k.rect(x0, ly, x1 - x0, Math.max(3, H * 0.005), mix(st.ink, st.bg, 0.65), { radius: H * 0.003, name: "Timeline" }));
    L.push(k.rect(x0, ly, (x1 - x0) * 0.62, Math.max(3, H * 0.005), accentOn(st), { radius: H * 0.003, name: "Progress" }));
    items.forEach(([when, what], i) => {
      const x = x0 + i * step;
      L.push(k.circle(x, ly - H * 0.022 + H * 0.0025, H * 0.044, i < 3 ? accentOn(st) : st.bg, { stroke: accentOn(st), sw: Math.max(2, H * 0.004), name: "Milestone" }));
      L.push(k.text(when, x, ly - H * 0.11, step - W * 0.02, { size: H * 0.034, bold: true, color: accentOn(st), lines: 1, name: "When" }));
      L.push(k.text(what, x, ly + H * 0.05, step - W * 0.025, { size: H * 0.03, color: st.ink, bold: true, lh: 1.25, lines: 2, name: "Milestone text" }));
    });
    return { bg: st.bg, layers: [...L, ...(withPhoto ? [] : footer(g))] };
  },
  closing(g) {
    const { k, st, W, H, mx, d } = g;
    const c = d.closing, L = [];
    if (g.v % 2 === 0) {
      L.push(k.photo(0, 0, W, H, { hint: d.hint }), k.shade(0, 0, W, H, st.deep, g.mir ? [0.25, 0.9] : [0.9, 0.25], 90));
      const col = k.column([
        { gap: H * 0.03, build: (w) => k.kicker(d.brand || d.name, mx, 0, w, { color: "#ffffff", bar: true, size: H * 0.022 }) },
        { flex: true, gap: H * 0.035, build: (w, maxH) => { const t = k.text(c.title, mx, 0, w, { size: H * 0.17, maxH: Math.min(maxH, H * 0.36), min: H * 0.06, bold: true, family: st.head, color: "#ffffff", lh: 0.98, ls: -0.03, name: "Closing title" }); return { layers: [t], h: t.h }; } },
        { gap: H * 0.06, build: (w) => { const t = k.text(c.text, mx, 0, w * 0.9, { size: H * 0.032, color: "#eceef3", lh: 1.4, maxH: H * 0.14, name: "Closing text" }); return { layers: [t], h: t.h }; } },
        { build: (w) => k.details(c.contact, mx, 0, w, { color: "#ffffff", icon: "#ffffff", size: H * 0.027 }) },
      ], { x: g.mir ? W * 0.45 : mx, y: H * 0.12, w: W * 0.5, h: H * 0.76 }, "center");
      if (g.mir) for (const l of col.layers) l.x = r1(l.x + W * 0.45 - mx);
      L.push(...col.layers);
      return { bg: st.deep, layers: L };
    }
    L.push(...deco(g));
    const pw = W * 0.4, px = g.mir ? mx : W - mx - pw;
    L.push(k.photo(px, H * 0.12, pw, H * 0.76, { shape: g.v % 3 === 1 ? "arch" : "rounded", radius: H * 0.03, hint: d.hint }));
    const x = g.mir ? px + pw + W * 0.06 : mx, w = W - pw - 2 * mx - W * 0.06;
    const col = k.column([
      { gap: H * 0.03, build: (w2) => k.kicker(d.brand || d.name, x, 0, w2, { color: accentOn(st), bar: true, size: H * 0.022 }) },
      { flex: true, gap: H * 0.035, build: (w2, maxH) => { const t = k.text(c.title, x, 0, w2, { size: H * 0.16, maxH: Math.min(maxH, H * 0.34), min: H * 0.06, bold: true, family: st.head, color: st.ink, lh: 0.98, ls: -0.03, name: "Closing title" }); return { layers: [t], h: t.h }; } },
      { gap: H * 0.06, build: (w2) => { const t = k.text(c.text, x, 0, w2, { size: H * 0.032, color: st.sub, lh: 1.4, maxH: H * 0.14, name: "Closing text" }); return { layers: [t], h: t.h }; } },
      { build: (w2) => k.details(c.contact, x, 0, w2, { color: st.ink, icon: accentOn(st), size: H * 0.027 }) },
    ], { x, y: H * 0.12, w, h: H * 0.76 }, "center");
    L.push(...col.layers);
    return { bg: st.bg, layers: L };
  },
};
const ORDER = ["cover", "agenda", "problem", "solution", "stats", "product", "team", "plans", "roadmap", "closing"];
// Hand-made decks with their own slide order (templates.js): the 9-slide pitch and the 7-slide lesson.
const SPECIAL = {
  pitch: { key: "bright-ideas", order: ["cover", "problem", "solution", "stats", "stats2", "plans", "roadmap", "team", "closing"], v: 2 },
  lesson: { key: "water-cycle", order: ["cover", "agenda", "problem", "roadmap", "product", "solution", "closing"], v: 0 },
};

export default function addDecks(K) {
  const { tpl, page } = K;
  /** The pages of a deck: content key × style key × variant, at W × H, slide order optional. */
  function build(key, styleKey, v, W = 1920, H = 1080, order = ORDER) {
    const x = CONTENT[key], st0 = DS[styleKey];
    if (!x || !st0) return null;
    const st = { key: styleKey, ...st0 };
    const d = { ...x.c, hint: x.c.photoHint || x.title.replace(/\b(deck|slides|presentation)\b/gi, "").trim() };
    const pick = photoPicker(`${x.title} ${x.tags}`, `deck.${key}.${styleKey}.v${v}`);
    const k = kit(K, W, H, st, pick, 0);
    // People in this deck (team portraits): a picker of its own, so the other photos stay the deck's subject photos.
    const cast = castFor(`deck.${key}.${styleKey}.v${v}:people`);
    const pages = [];
    order.forEach((name, i) => {
      if (name !== "cover" && !d[name]) return; // a deck without that part skips the slide
      const g ={ K, k, st, W, H, S: Math.min(W, H), mx: r1(W * 0.06), my: r1(H * 0.1), v, mir: v % 2 === 1, d, n: pages.length + 1, cast };
      const out = name === "stats2" ? SLIDES.stats(g, "stats2") : SLIDES[name](g);
      const pg = page(out.bg, out.layers);
      pg.notes = d.notes?.[i] ?? "";
      pages.push(pg);
    });
    return pages;
  }
  for (const [key, x] of Object.entries(CONTENT)) {
    if (Object.values(SPECIAL).some((s) => s.key === key)) continue;
    tpl("deck-" + key, x.title, "presentation-16x9", "presentation slides deck " + x.tags, (W, H) => build(key, x.theme, 0, W, H));
  }
  return {
    contents: Object.keys(CONTENT).filter((key) => !Object.values(SPECIAL).some((s) => s.key === key)),
    themes: Object.keys(DS),
    variants: VARIANT_NAMES.length,
    variantNames: VARIANT_NAMES,
    styleOf: (key) => (DS[key] ? "pro-" + key : undefined),
    content: (key) => CONTENT[key] || null,
    themeName: (key) => DS[key]?.name || key,
    pages: (contentKey, themeKey, v) => build(contentKey, themeKey, v),
    /** The hand-made decks of templates.js ("pitch", "lesson") at their own size. */
    special: (name, W, H) => { const s = SPECIAL[name]; return build(s.key, CONTENT[s.key].theme, s.v, W, H, s.order); },
  };
}
