// AsaanDesk Docs template gallery (pure module: used by the editor's Templates panel and the /tools/docs intro page).
// A GENERATOR: hand-designed base layouts (layouts.js) × own colour palettes × content themes (purpose / industry with
// matching own text). Ids encode the combination: "<layout>~p07~clinic". thumb(id) and the editor's apply(id) build from
// the id, so every one opens as a real, editable document. 13 hand-tuned originals and the 8 classic templates come first.
// Own names, colours, text and artwork only.
import { decoSvg } from "./decos.js";
import { drawThumb, PAGE_W, PAGE_H } from "./thumbs.js";
import { pickPhoto, pickPerson, photoUrl, isPerson, focusCrop } from "../shared/photo-library.js";

export const CANVA_COUNT = 3240; // Canva Docs templates (canva.com/docs/templates, 11 Nov 2026)
const LONG = "Long docs", MORE = "More templates for you";
export const SECTIONS = [LONG, MORE];

/* ---------------- palettes (own) ---------------- */
export const PALETTES = [
  { id: "p01", name: "Forest", dark: "#24453a", light: "#a7e8c5", mid: "#3f6b5a", cream: "#f3efe6", ink: "#1d3a30" },
  { id: "p02", name: "Harbour", dark: "#12355b", light: "#dbeafe", mid: "#2f80ff", cream: "#ffffff", ink: "#0b2545" },
  { id: "p03", font: "serif", name: "Plum", dark: "#4c1d95", light: "#ede9fe", mid: "#7c3aed", cream: "#ffffff", ink: "#3b0764" },
  { id: "p04", name: "Coral", dark: "#9a3412", light: "#ffe4d6", mid: "#ff7a59", cream: "#fff1e6", ink: "#7c2d12" },
  { id: "p05", name: "Lagoon", dark: "#0f766e", light: "#ccfbf1", mid: "#14b8a6", cream: "#ecfeff", ink: "#134e4a" },
  { id: "p06", font: "serif", name: "Espresso", dark: "#3d2a1e", light: "#f1e3c8", mid: "#c99a4b", cream: "#f7e9cf", ink: "#2b1d14" },
  { id: "p07", name: "Midnight", dark: "#111827", light: "#d1fae5", mid: "#34d399", cream: "#ffffff", ink: "#064e3b" },
  { id: "p08", name: "Royal", dark: "#1e3a8a", light: "#e0ecff", mid: "#60a5fa", cream: "#ffffff", ink: "#1e3a8a" },
  { id: "p09", font: "cambria", name: "Rose", dark: "#9d174d", light: "#fdf2f8", mid: "#f472b6", cream: "#fff1f7", ink: "#831843" },
  { id: "p10", name: "Sunbeam", dark: "#92400e", light: "#fef3c7", mid: "#f59e0b", cream: "#fffbeb", ink: "#78350f" },
  { id: "p11", font: "cambria", name: "Slate", dark: "#334155", light: "#e2e8f0", mid: "#64748b", cream: "#f8fafc", ink: "#1e293b" },
  { id: "p12", name: "Violet", dark: "#5b4cf0", light: "#e0e7ff", mid: "#8b5cf6", cream: "#ffffff", ink: "#3730a3" },
];

/* ---------------- content themes (own example text; all people and places are fictional examples) ---------------- */
const TH = [
  ["school", "School", "Hilltop Public School", "Hilltop", "Ayesha Siddiqui", "Head of Science", "Lahore", "parents and students", "after-school science club", "new science lab", "annual science fair", "student homework portal", [["Students enrolled", "820", "910"], ["Average test score", "68%", "74%"], ["Parent meeting turnout", "45%", "71%"]], "Learning that sticks", "Science · Grade 5", "museum"],
  ["clinic", "Clinic", "Cedar Family Clinic", "Cedar", "Hamid Raza", "Clinic Manager", "Islamabad", "patients and families", "same-day appointments", "online appointment booking", "free health camp", "patient reminder app", [["Average waiting time", "48 min", "31 min"], ["Patients per week", "640", "755"], ["Missed appointments", "14%", "6%"]], "Care close to home", "First aid basics", "pharmacy"],
  ["restaurant", "Restaurant", "Saffron Table", "Saffron", "Bilal Qureshi", "Head Chef", "Karachi", "diners and delivery customers", "family dinner menu", "weekend brunch service", "food festival night", "table booking page", [["Covers per night", "120", "165"], ["Delivery orders per week", "380", "540"], ["Average rating", "4.2", "4.6"]], "Good food, warm welcome", "Kitchen hygiene", "farm"],
  ["shop", "Shop", "Bright Mart", "Bright Mart", "Sana Javed", "Store Manager", "Faisalabad", "shoppers", "loyalty card", "second branch", "summer sale weekend", "online order app", [["Daily visitors", "950", "1,240"], ["Online orders", "6%", "15%"], ["Repeat customers", "32%", "45%"]], "Everything you need, close by", "Customer service basics", "supplier"],
  ["tech", "Tech startup", "Kitebyte Labs", "Kitebyte", "Usman Tariq", "Product Lead", "Lahore", "small business owners", "invoicing app", "mobile app launch", "product launch webinar", "Kitebyte Invoices", [["Active users", "2,300", "5,900"], ["Monthly revenue (PKR)", "1.2M", "2.9M"], ["Replies within 1 hour", "61%", "88%"]], "Simple tools for busy people", "Intro to coding", "co-working space"],
  ["ngo", "Nonprofit", "Green Steps Foundation", "Green Steps", "Mariam Akhtar", "Programme Director", "Peshawar", "volunteers and donors", "tree planting drive", "community reading corners", "charity walk", "volunteer sign-up portal", [["Trees planted", "4,000", "11,500"], ["Active volunteers", "120", "310"], ["Children reached", "900", "2,400"]], "Small steps, big change", "Caring for trees", "community centre"],
  ["travel", "Travel", "Skyline Tours", "Skyline", "Hassan Ali", "Tour Director", "Islamabad", "families and student groups", "northern areas tour", "family tour package", "travel expo", "trip booking app", [["Trips per season", "42", "61"], ["Customer rating", "4.3", "4.8"], ["Repeat travellers", "18%", "29%"]], "Trips people talk about", "Maps and directions", "guest house"],
  ["fitness", "Fitness", "PulseFit Studio", "PulseFit", "Zara Khan", "Head Coach", "Lahore", "members", "8-week strength course", "morning classes for women", "community fun run", "class booking app", [["Members", "310", "460"], ["Classes per week", "24", "38"], ["Member retention", "58%", "74%"]], "Stronger every week", "Healthy habits", "sports club"],
  ["realestate", "Real estate", "Northgate Homes", "Northgate", "Kamran Sheikh", "Sales Director", "Rawalpindi", "home buyers", "two-bedroom apartments", "Northgate Gardens phase 2", "open house weekend", "virtual property tours", [["Enquiries per month", "210", "340"], ["Homes sold", "38", "57"], ["Days to sell", "74", "49"]], "Homes made for living", "Saving for a home", "bank"],
  ["agency", "Agency", "Bluefin Creative", "Bluefin", "Hira Malik", "Account Director", "Karachi", "brand clients", "social media packages", "brand refresh service", "client workshop day", "content calendar tool", [["Active clients", "14", "22"], ["Campaigns delivered", "36", "58"], ["Client satisfaction", "82%", "93%"]], "Ideas that work", "Telling a good story", "print shop"],
  ["bakery", "Bakery", "Golden Crust Bakery", "Golden Crust", "Nadia Farooq", "Owner", "Multan", "families and cafes", "custom cakes", "home delivery service", "baking class weekend", "online cake orders", [["Cakes per week", "140", "230"], ["Cafe partners", "4", "11"], ["Online orders", "9%", "27%"]], "Baked fresh every morning", "Measuring and baking", "cafe"],
  ["construction", "Construction", "Stonebridge Builders", "Stonebridge", "Faisal Mehmood", "Project Manager", "Islamabad", "property owners", "home renovation service", "community centre build", "site safety day", "site progress tracker", [["Projects on time", "64%", "86%"], ["Safety incidents", "9", "2"], ["Client rating", "4.1", "4.7"]], "Built right, on time", "Site safety", "hardware store"],
];
const PEOPLE2 = ["Omar Farooq", "Hina Saleem", "Ali Raza", "Sadia Noor", "Imran Shah", "Rabia Aslam", "Tariq Mehmood", "Fatima Zahid", "Danish Iqbal", "Maham Tariq", "Saad Anwar", "Noor Fatima"];
const PEOPLE3 = ["Zainab Ali", "Junaid Khan", "Mehwish Ahmed", "Fahad Butt", "Amna Riaz", "Kashif Nawaz", "Iqra Hussain", "Waleed Akram", "Sobia Rashid", "Haris Jamil", "Lubna Saeed", "Shahid Latif"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const THEMES = TH.map(([key, label, org, short, person, role, city, audience, offer, project, event, product, metrics, tagline, lesson, partner], i) => {
  const base = 300 + i * 45;
  const items = [["Equipment and materials", (base * 1000).toLocaleString("en-US")], ["People and training", ((base - 140) * 1000).toLocaleString("en-US")], ["Launch and promotion", ((base - 210) * 1000).toLocaleString("en-US")]];
  const total = (items.reduce((a, [, v]) => a + +v.replace(/,/g, ""), 0)).toLocaleString("en-US");
  return {
    key, label, org, short, person, person2: PEOPLE2[i], person3: PEOPLE3[i], role, city, audience, offer, project, event, product, metrics, tagline, lesson, partner,
    email: `hello@${short.toLowerCase().replace(/[^a-z]/g, "")}.example.com`,
    goals: [`Launch the ${project} by June`, `Grow ${metrics[0][0].toLowerCase()} to ${metrics[0][2]}`, `Win more ${audience} with our ${offer}`],
    steps: [`Agree the plan with the team`, `Prepare the ${project}`, `Tell ${audience} about it`],
    items, total,
  };
});

/* ---------------- base layouts (built in layouts.js) ---------------- */
// [id, name, section, tags, header kind, decoration, thumb title(T), thumb subtitle(T), options]
const LY0 = [
  ["one-pager", "One Pager", LONG, ["one pager", "summary", "overview", "brief"], "dark", "petals", () => "One Pager", (T) => T.org, { serif: true }],
  ["strategic-plan", "Strategic Plan", LONG, ["strategy", "plan", "pestle", "goals"], "dark", "circles", () => "Strategic Plan", (T) => T.org, { serif: true }],
  ["sustainability-report", "Sustainability Report", LONG, ["report", "sustainability", "green", "esg"], "dark", "leaves", () => "SUSTAINABILITY REPORT", (T) => T.org, { small: true }],
  ["project-proposal", "Project Proposal", LONG, ["proposal", "project", "budget", "timeline"], "dark", "waves", () => "Project Proposal", (T) => cap(T.project)],
  ["newsletter", "Newsletter", LONG, ["newsletter", "news", "bulletin", "community"], "dark", "circles", () => "The Monthly Bulletin", (T) => T.org, { serif: true }],
  ["annual-report", "Annual Report", LONG, ["report", "annual", "finance", "charts"], "dark", "steps", () => "Annual Report 2026", (T) => T.org],
  ["case-study", "Case Study", LONG, ["case study", "customer", "results"], "dark", "petals", () => "Case Study", (T) => T.org],
  ["product-brief", "Product Brief", LONG, ["product", "brief", "features", "launch"], "dark", "dots", () => "Product Brief", (T) => T.product],
  ["resume", "Resume", MORE, ["resume", "cv", "job", "career"], "avatar", "avatar", (T) => T.person, (T) => T.role],
  ["thank-you-letter", "Thank You Letter", MORE, ["letter", "thank you", "gratitude"], "light", "flower", () => "Thank You", () => "", { serif: true, italic: true }],
  ["meeting-notes", "Meeting Notes", MORE, ["meeting", "notes", "agenda", "minutes"], "light", "confetti", () => "Weekly team meeting", (T) => T.org],
  ["cover-letter", "Cover Letter", MORE, ["cover letter", "letter", "job", "application"], "dark", "arc", (T) => T.person, (T) => T.role],
  ["lesson-plan", "Lesson Plan", MORE, ["lesson", "teacher", "school", "class"], "light", "sun", () => "Lesson Plan", (T) => T.lesson],
  ["business-plan", "Business Plan", LONG, ["business plan", "startup", "forecast", "market"], "dark", "steps", () => "Business Plan", (T) => T.org, { serif: true }],
  ["marketing-plan", "Marketing Plan", LONG, ["marketing", "plan", "channels", "campaign"], "dark", "waves", () => "Marketing Plan", (T) => cap(T.offer)],
  ["event-plan", "Event Plan", LONG, ["event", "plan", "run sheet", "checklist"], "dark", "confetti", () => "Event Plan", (T) => cap(T.event)],
  ["press-release", "Press Release", MORE, ["press release", "news", "media", "announcement"], "bar", "dots", (T) => `${T.short} launches`, (T) => T.project],
  ["status-report", "Project Status Report", LONG, ["status", "report", "project", "risks"], "dark", "dots", () => "Status Report", (T) => cap(T.project)],
  ["weekly-planner", "Weekly Planner", MORE, ["planner", "weekly", "to do", "schedule"], "light", "sun", () => "Weekly Planner", (T) => T.person],
  ["brainstorm", "Brainstorm", MORE, ["brainstorm", "ideas", "workshop"], "light", "circles", () => "Brainstorm", (T) => T.org],
  ["sop", "Standard Operating Procedure", LONG, ["sop", "procedure", "process", "checklist"], "dark", "steps", () => "Standard Procedure", (T) => cap(T.offer)],
  ["job-description", "Job Description", MORE, ["job", "hiring", "role", "careers"], "dark", "arc", (T) => T.role, (T) => T.org],
  ["recommendation-letter", "Recommendation Letter", MORE, ["letter", "recommendation", "reference"], "light", "leaves", () => "Recommendation", (T) => T.org, { serif: true }],
  ["travel-itinerary", "Travel Itinerary", LONG, ["travel", "itinerary", "trip", "packing"], "dark", "waves", () => "Travel Itinerary", (T) => T.org],
  ["research-report", "Research Report", LONG, ["research", "report", "survey", "results"], "dark", "dots", () => "Research Report", (T) => T.org, { serif: true }],
  ["onboarding-guide", "Onboarding Guide", LONG, ["onboarding", "guide", "welcome", "team"], "dark", "petals", () => "Welcome to the team", (T) => T.org],
  ["invoice", "Invoice", MORE, ["invoice", "bill", "payment"], "dark", "diamonds", () => "INVOICE", (T) => T.org],
  ["resume-sidebar", "Sidebar Resume", MORE, ["resume", "cv", "two column", "sidebar"], "lavatar", "avatar", (T) => T.person, (T) => T.role],
  ["resume-timeline", "Timeline Resume", MORE, ["resume", "cv", "timeline", "career"], "dark", "steps", (T) => T.person, (T) => T.role],
  ["resume-minimal", "Minimal CV", MORE, ["resume", "cv", "minimal", "simple"], "plain", "", (T) => T.person.toUpperCase(), (T) => T.role, { center: true }],
  ["pricing-proposal", "Pricing Proposal", LONG, ["proposal", "pricing", "packages", "quote"], "dark", "diamonds", () => "Proposal & Pricing", (T) => T.org],
  ["action-minutes", "Meeting Minutes", MORE, ["meeting", "minutes", "action items", "owners"], "bar", "dots", () => "Meeting minutes", (T) => T.org, { barText: "MEETING MINUTES" }],
  ["stats-case-study", "Results Case Study", LONG, ["case study", "results", "stats", "numbers"], "dark", "circles", () => "Results that speak", (T) => T.org],
  ["brochure", "Brochure Doc", LONG, ["brochure", "services", "about us", "flyer"], "dark", "petals", (T) => T.org, (T) => T.tagline, { serifIfFont: true }],
  ["launch-checklist", "Launch Checklist", MORE, ["checklist", "launch", "to do", "plan"], "light", "steps", () => "Launch Checklist", (T) => T.project],
  ["letterhead", "Letterhead Letter", MORE, ["letter", "letterhead", "business", "official"], "bar", "", () => "Dear …", (T) => T.org, { barText: "LETTERHEAD" }],
  ["award-letter", "Certificate Letter", MORE, ["certificate", "award", "appreciation", "thank you"], "light", "sun", () => "Certificate", (T) => T.person2],
  ["recipe", "Recipe Card", MORE, ["recipe", "food", "cooking", "ingredients"], "dark", "leaves", () => "Golden Honey Cake", (T) => T.org],
  ["menu", "Menu", MORE, ["menu", "restaurant", "food", "prices"], "plain", "", (T) => T.org, (T) => T.tagline, { center: true, serif: true }],
  ["faq", "FAQ", MORE, ["faq", "questions", "help", "support"], "dark", "circles", () => "FAQ", (T) => T.org],
  ["how-to-guide", "How-to Guide", LONG, ["guide", "how to", "steps", "manual"], "light", "steps", () => "How-to Guide", (T) => T.product],
  ["policy", "Policy", LONG, ["policy", "safety", "rules", "hr"], "dark", "arc", () => "Safety Policy", (T) => T.org],
  ["roadmap", "Roadmap", LONG, ["roadmap", "plan", "quarters", "strategy"], "dark", "waves", () => "2027 Roadmap", (T) => T.org],
  ["okrs", "Goals and Key Results", LONG, ["okr", "goals", "key results", "targets"], "light", "circles", () => "Goals & Key Results", (T) => T.org],
  ["syllabus", "Course Syllabus", LONG, ["syllabus", "course", "school", "teacher"], "dark", "sun", () => "Course Syllabus", (T) => T.lesson],
  ["title-page-report", "Report with Cover", LONG, ["report", "cover page", "findings"], "dark", "leaves", () => "REPORT", (T) => T.org, { small: true }],
  ["two-column-newsletter", "Two-column Newsletter", LONG, ["newsletter", "two column", "news"], "light", "confetti", (T) => `${T.short} News`, () => "Monthly"],
  ["price-list", "Price List", MORE, ["price list", "prices", "services", "rates"], "dark", "diamonds", () => "Price List 2027", (T) => T.org],
  ["timeline-grid", "Project Timeline", LONG, ["timeline", "gantt", "project", "schedule"], "dark", "steps", () => "Project Timeline", (T) => T.project],
  ["comparison", "Options Comparison", LONG, ["comparison", "decision", "options", "pros and cons"], "light", "diamonds", () => "Which option?", (T) => T.org],
  ["swot", "SWOT Analysis", LONG, ["swot", "analysis", "strategy", "strengths"], "dark", "circles", () => "SWOT Analysis", (T) => T.org],
  ["journal", "Daily Journal", MORE, ["journal", "diary", "gratitude", "daily"], "light", "sun", () => "Daily Journal", () => "Wednesday · 12 November"],
  ["contract", "Service Agreement", LONG, ["contract", "agreement", "terms", "legal"], "plain", "", () => "SERVICE AGREEMENT", (T) => T.org, { center: true }],
  ["receipt", "Receipt", MORE, ["receipt", "payment", "shop", "sale"], "light", "", (T) => T.org, () => "Receipt No. R-00872"],
  ["event-program", "Event Programme", MORE, ["event", "programme", "agenda", "schedule"], "dark", "confetti", (T) => cap(T.event), () => "Programme"],
  ["signup-sheet", "Sign-up Sheet", MORE, ["sign up", "volunteer", "form", "sheet"], "light", "confetti", () => "Volunteer Sign-up", (T) => cap(T.event)],
  ["book-report", "Book Report", MORE, ["book report", "school", "reading", "review"], "dark", "leaves", () => "Book Report", (T) => T.person3, { serif: true }],
  ["meal-planner", "Meal Planner", MORE, ["meal plan", "food", "weekly", "shopping list"], "light", "sun", () => "Weekly Meal Plan", (T) => T.person],
  ["magazine-article", "Magazine Article", LONG, ["article", "magazine", "feature", "blog"], "bar", "dots", (T) => `How ${T.short} is changing`, () => "Feature", { barText: "FEATURE", serif: true }],
  ["incident-report", "Incident Report", MORE, ["incident", "report", "safety", "form"], "bar", "dots", () => "Incident report", (T) => T.org, { barText: "INCIDENT REPORT" }],
  ["fact-sheet", "Fact Sheet", MORE, ["fact sheet", "about", "numbers", "company"], "light", "dots", (T) => `${T.short} at a glance`, () => "Fact sheet"],
  ["speech", "Speech", MORE, ["speech", "talk", "remarks", "script"], "plain", "", () => "Thank you for being here", (T) => T.person, { center: true, serif: true }],
  ["wedding-program", "Wedding Programme", MORE, ["wedding", "programme", "ceremony", "event"], "plain", "", () => "Hira & Danish", () => "20 December 2026", { center: true, serif: true }],
  ["report-card", "Report Card", MORE, ["report card", "school", "grades", "student"], "bar", "sun", () => "Report card", (T) => T.org, { barText: "REPORT CARD" }],
  ["creative-brief", "Creative Brief", LONG, ["creative brief", "campaign", "marketing", "agency"], "light", "confetti", () => "Creative Brief", (T) => T.org],
  ["prd", "Product Requirements", LONG, ["requirements", "prd", "user stories", "product"], "bar", "diamonds", () => "Product requirements", (T) => T.product, { barText: "PRODUCT REQUIREMENTS" }],
  ["retrospective", "Retrospective", MORE, ["retro", "retrospective", "team", "sprint"], "dark", "circles", () => "Sprint Retrospective", (T) => T.org],
  ["kanban", "Project Board", MORE, ["kanban", "board", "to do", "status"], "bar", "steps", () => "Project board", (T) => T.project, { barText: "PROJECT BOARD" }],
  ["interview-notes", "Interview Notes", MORE, ["interview", "hiring", "candidate", "notes"], "light", "arc", () => "Interview Notes", (T) => T.role],
  ["city-guide", "City Guide", LONG, ["guide", "travel", "city", "tips"], "dark", "waves", (T) => `A weekend in ${T.city}`, (T) => T.org],
  ["glossary", "Glossary", MORE, ["glossary", "terms", "words", "reference"], "light", "dots", () => "Glossary", (T) => T.org],
  ["white-paper", "White Paper", LONG, ["white paper", "research", "report", "insights"], "dark", "circles", () => "WHITE PAPER", (T) => T.org, { small: true }],
  ["statement-of-work", "Statement of Work", LONG, ["statement of work", "sow", "contract", "scope"], "bar", "diamonds", () => "Statement of work", (T) => T.org, { barText: "STATEMENT OF WORK" }],
  ["standup", "Daily Stand-up", MORE, ["stand-up", "standup", "daily", "team"], "bar", "sun", () => "Daily stand-up", (T) => T.org, { barText: "DAILY STAND-UP" }],
  ["budget-proposal", "Budget Proposal", LONG, ["budget", "proposal", "costs", "finance"], "dark", "steps", () => "Budget Proposal 2027", (T) => T.project],
  ["grant-proposal", "Grant Proposal", LONG, ["grant", "proposal", "funding", "nonprofit"], "light", "leaves", () => "GRANT PROPOSAL", (T) => T.org, { small: true }],
  ["questionnaire", "Questionnaire", MORE, ["questionnaire", "form", "intake", "client"], "light", "dots", () => "Client Questionnaire", (T) => T.org],
  ["team-directory", "Team Directory", MORE, ["directory", "team", "contacts", "staff"], "bar", "circles", () => "Team directory", (T) => T.org, { barText: "TEAM DIRECTORY" }],
  ["habit-tracker", "Habit Tracker", MORE, ["habit", "tracker", "weekly", "health"], "light", "sun", () => "Habit Tracker", (T) => T.person],
  ["about-me", "About Me", MORE, ["about me", "bio", "profile", "personal"], "avatar", "avatar", (T) => `Hi, I'm ${T.person.split(" ")[0]}`, (T) => T.role],
  ["postmortem", "Post-mortem", LONG, ["post-mortem", "incident", "review", "lessons"], "bar", "dots", () => "Post-mortem", (T) => T.org, { barText: "POST-MORTEM" }],
  ["competitor-analysis", "Competitor Analysis", LONG, ["competitors", "analysis", "market", "comparison"], "dark", "diamonds", () => "Competitor Analysis", (T) => T.offer],
  ["survey-results", "Survey Results", LONG, ["survey", "results", "feedback", "charts"], "light", "circles", () => "Survey Results", (T) => T.org],
  ["worksheet", "Worksheet", MORE, ["worksheet", "school", "exercise", "class"], "light", "sun", () => "Worksheet", (T) => T.lesson],
  ["event-flyer-doc", "Event Flyer", MORE, ["event", "flyer", "invite", "poster"], "dark", "confetti", (T) => T.event.replace(/^./, (c) => c.toUpperCase()), () => "You're invited"],
  ["board-minutes", "Board Minutes", MORE, ["board", "minutes", "governance", "meeting"], "plain", "", (T) => T.org, () => "Minutes of the board meeting", { center: true }],
  ["conference-agenda", "Conference Agenda", LONG, ["conference", "agenda", "schedule", "event"], "dark", "waves", (T) => `${T.short} Summit 2027`, () => "Agenda"],
  ["launch-plan", "Launch Plan", LONG, ["launch", "plan", "product", "checklist"], "light", "steps", () => "Launch Plan", (T) => T.product],
  ["timetable", "Class Timetable", MORE, ["timetable", "school", "schedule", "class"], "light", "sun", () => "Class timetable", (T) => T.org],
  ["shopping-list", "Shopping List", MORE, ["shopping", "list", "groceries", "home"], "light", "leaves", () => "Shopping List", () => "This week"],
  ["parent-letter", "Letter to Parents", MORE, ["letter", "school", "parents", "trip"], "light", "", (T) => T.org, () => "Dear parents and guardians"],
  ["performance-review", "Performance Review", LONG, ["review", "performance", "hr", "goals"], "bar", "diamonds", () => "Performance review", (T) => T.org, { barText: "PERFORMANCE REVIEW" }],
  ["project-charter", "Project Charter", LONG, ["charter", "project", "scope", "stakeholders"], "dark", "arc", () => "Project Charter", (T) => T.project],
  ["lab-report", "Lab Report", MORE, ["lab report", "science", "experiment", "school"], "bar", "circles", () => "How fast does ice melt?", () => "Lab report", { barText: "LAB REPORT" }],
  ["personal-budget", "Personal Budget", MORE, ["budget", "personal", "money", "savings"], "light", "dots", () => "Monthly Budget", (T) => T.person],
  ["short-story", "Short Story", MORE, ["story", "fiction", "writing", "creative"], "plain", "", () => "The Lantern Keeper", () => "A short story", { center: true, serif: true }],
  ["meeting-agenda", "Meeting Agenda", MORE, ["agenda", "meeting", "topics", "plan"], "dark", "dots", () => "Meeting Agenda", (T) => T.org],
  ["volunteer-handbook", "Volunteer Handbook", LONG, ["handbook", "volunteer", "guide", "nonprofit"], "dark", "flower", () => "Volunteer Handbook", (T) => T.org],
  ["property-listing", "Property Listing", MORE, ["property", "real estate", "listing", "for sale"], "bar", "dots", () => "Two-bedroom apartment", (T) => T.city, { barText: "FOR SALE" }],
  ["meal-plan-nutrition", "Nutrition Plan", MORE, ["nutrition", "diet", "meal plan", "health"], "light", "leaves", () => "7-Day Nutrition Plan", (T) => T.person3],
  ["workshop-handout", "Workshop Handout", MORE, ["workshop", "handout", "training", "notes"], "dark", "steps", () => "Workshop handout", (T) => T.org],
  ["product-catalog", "Product Catalogue", MORE, ["catalogue", "products", "prices", "shop"], "light", "confetti", (T) => `${T.short} Catalogue`, () => "Winter 2026"],
  ["donation-receipt", "Donation Receipt", MORE, ["donation", "receipt", "thank you", "nonprofit"], "dark", "flower", (T) => T.org, () => "Thank you for your gift"],
  ["shift-schedule", "Shift Schedule", MORE, ["shifts", "rota", "schedule", "staff"], "bar", "steps", () => "Shift schedule", (T) => T.org, { barText: "SHIFT SCHEDULE" }],
  ["pitch-one-sheet", "Pitch One-sheet", LONG, ["pitch", "investors", "startup", "one sheet"], "dark", "petals", (T) => T.org, (T) => T.tagline],
  ["release-notes", "Release Notes", MORE, ["release notes", "product", "changelog", "update"], "bar", "dots", (T) => T.product, () => "Version 2.4", { barText: "RELEASE NOTES" }],
  ["daily-planner", "Daily Planner", MORE, ["planner", "daily", "to do", "schedule"], "light", "sun", () => "Today", (T) => T.person],
  ["trip-budget", "Trip Budget", MORE, ["budget", "travel", "trip", "expenses"], "dark", "waves", () => "Trip Budget", () => "5 days · 4 people"],
];
// Round 5 (Canva's trending Docs kinds we did not have yet), each placed right after the layout named in [9].
const LY_NEW = [
  ["impact-report", "Impact Report", LONG, ["impact", "report", "results", "nonprofit"], "dark", "leaves", () => "Impact Report 2026", (T) => T.org, {}, "one-pager"],
  ["project-plan", "Project Plan", LONG, ["project plan", "plan", "timeline", "tasks"], "dark", "steps", () => "Project Plan", (T) => cap(T.project), {}, "strategic-plan"],
  ["brand-guidelines", "Brand Guidelines", LONG, ["brand", "guidelines", "logo", "colours", "style guide"], "dark", "circles", () => "Brand Guidelines", (T) => T.org, {}, "sustainability-report"],
  ["employee-handbook", "Employee Handbook", LONG, ["handbook", "employee", "hr", "policies"], "light", "petals", () => "Employee Handbook", (T) => T.org, {}, "project-proposal"],
  ["business-case", "Business Case", LONG, ["business case", "investment", "options", "return"], "dark", "diamonds", () => "Business Case", (T) => cap(T.product), {}, "newsletter"],
  ["social-media-plan", "Social Media Plan", LONG, ["social media", "plan", "content", "marketing"], "dark", "confetti", () => "Social Media Plan", (T) => `${T.short} · 2027`, {}, "annual-report"],
  ["project-scope", "Project Scope", LONG, ["scope", "project", "deliverables", "requirements"], "bar", "dots", () => "Project scope", (T) => cap(T.project), { barText: "PROJECT SCOPE" }, "case-study"],
  ["content-strategy", "Content Strategy", LONG, ["content", "strategy", "marketing", "editorial"], "light", "waves", () => "Content Strategy", (T) => T.org, {}, "product-brief"],
];
const LY = LY0.flatMap((l) => [l, ...LY_NEW.filter((n) => n[9] === l[0]).map((n) => n.slice(0, 9))]);
export const LAYOUT_IDS = LY.map((l) => l[0]);
export const LAYOUTS = LY.length;
const LMAP = Object.fromEntries(LY.map((l) => [l[0], l]));
// What the page under the header looks like on the thumbnail.
const BODY = { "property-listing": "chart", "meal-plan-nutrition": "table", "workshop-handout": "checks", "product-catalog": "table", "donation-receipt": "letter", "shift-schedule": "table", "pitch-one-sheet": "table", "release-notes": "checks", "daily-planner": "table", "trip-budget": "chart", "conference-agenda": "table", "launch-plan": "checks", timetable: "table", "shopping-list": "table", "parent-letter": "letter", "performance-review": "table", "project-charter": "table", "lab-report": "chart", "personal-budget": "table", "short-story": "letter", "meeting-agenda": "table", "volunteer-handbook": "checks", "budget-proposal": "chart", "grant-proposal": "table", questionnaire: "table", "team-directory": "table", "habit-tracker": "table", "about-me": "checks", postmortem: "table", "competitor-analysis": "table", "survey-results": "chart", worksheet: "letter", "event-flyer-doc": "table", "board-minutes": "letter", "magazine-article": "chart", "incident-report": "table", "fact-sheet": "table", speech: "letter", "wedding-program": "table", "report-card": "table", "creative-brief": "table", prd: "table", retrospective: "table", kanban: "table", "interview-notes": "sections", "city-guide": "checks", glossary: "table", "white-paper": "chart", "statement-of-work": "table", standup: "table", "timeline-grid": "table", comparison: "table", swot: "table", journal: "checks", contract: "letter", receipt: "table", "event-program": "table", "signup-sheet": "table", "book-report": "letter", "meal-planner": "table", "resume-sidebar": "table", "resume-minimal": "letter", "pricing-proposal": "table", "action-minutes": "table", "stats-case-study": "chart", brochure: "checks", "launch-checklist": "checks", letterhead: "letter", "award-letter": "letter", recipe: "checks", menu: "table", faq: "letter", "how-to-guide": "checks", policy: "sections", roadmap: "table", okrs: "table", syllabus: "table", "title-page-report": "chart", "two-column-newsletter": "sections", "price-list": "table", "thank-you-letter": "letter", "cover-letter": "letter", "recommendation-letter": "letter", "press-release": "letter", resume: "table", invoice: "table", "weekly-planner": "table", "annual-report": "chart", "sustainability-report": "chart", "business-plan": "chart", "marketing-plan": "chart", "research-report": "chart", "meeting-notes": "checks", "event-plan": "checks", "lesson-plan": "checks", "onboarding-guide": "checks", sop: "checks", "product-brief": "checks", brainstorm: "checks", "job-description": "checks" };
Object.assign(BODY, { "impact-report": "kpi", "project-plan": "timeline", "brand-guidelines": "sections", "employee-handbook": "checks", "business-case": "kpi", "social-media-plan": "kpi", "project-scope": "table", "content-strategy": "chart",
  // round 5: report-like layouts lead with KPI cards; plans with a timeline (as Canva's report / plan templates do)
  "annual-report": "kpi", "sustainability-report": "kpi", "stats-case-study": "kpi", "fact-sheet": "kpi", "status-report": "kpi", "case-study": "kpi", "survey-results": "kpi", "pitch-one-sheet": "kpi", "one-pager": "kpi", okrs: "kpi",
  "resume-minimal": "resume", "resume-timeline": "resume", "press-release": "news", "magazine-article": "news", "short-story": "prose", "book-report": "prose", "award-letter": "certificate", speech: "prose", worksheet: "checks", "board-minutes": "checks",
  roadmap: "timeline", "timeline-grid": "timeline", "launch-plan": "timeline", "project-charter": "timeline", "travel-itinerary": "timeline", "event-plan": "timeline", newsletter: "sections", "strategic-plan": "sections", "project-proposal": "timeline" });
const PMAP = Object.fromEntries(PALETTES.map((p) => [p.id, p]));
const TMAP = Object.fromEntries(THEMES.map((t) => [t.key, t]));

/* ---------------- round 5 look: Canva Docs pattern (photo header, big bold title, accent bars, cards) ---------------- */
// Photo topics per content theme (words the shared photo library understands), so each theme gets fitting photos.
export const THEME_PHOTO = { school: "school education class", clinic: "clinic medical care", restaurant: "restaurant food", shop: "shop store business", tech: "tech software office", ngo: "community nature green", travel: "travel trip", fitness: "fitness gym", realestate: "real estate interior home", agency: "creative design agency workspace", bakery: "bakery cafe food", construction: "construction architecture" };
// Header style per layout: shade (photo with dark fade), split (colour panel + photo), tint (photo washed in colour),
// soft (light page + photo), band (colour band + own decoration: letters, forms, receipts), avatar (résumé), bar, plain.
const BAND_ONLY = new Set(["thank-you-letter", "cover-letter", "recommendation-letter", "award-letter", "receipt", "invoice", "donation-receipt", "parent-letter", "signup-sheet", "questionnaire", "glossary", "worksheet", "timetable", "shopping-list", "habit-tracker", "journal", "daily-planner", "weekly-planner", "personal-budget", "book-report", "faq", "meeting-agenda", "retrospective", "interview-notes", "brainstorm", "okrs", "comparison", "swot", "meal-planner", "trip-budget", "resume-timeline"]);
const STYLE_OVERRIDE = { menu: "tint", "wedding-program": "tint", "short-story": "tint", speech: "soft", recipe: "split", "city-guide": "tint", brochure: "tint", "event-flyer-doc": "tint", "travel-itinerary": "split", "property-listing": "bar", "magazine-article": "bar", "press-release": "bar", "project-scope": "bar", "lab-report": "bar" };
const BAR_PHOTO = new Set(["property-listing", "magazine-article", "press-release", "project-scope", "release-notes", "lab-report", "team-directory"]);
const PHOTO_CYCLE = ["shade", "split", "tint"];
export function styleOf(layout) {
  const L = LMAP[layout];
  if (!L) return "band";
  if (STYLE_OVERRIDE[layout]) return STYLE_OVERRIDE[layout];
  const kind = L[4];
  if (kind === "avatar" || kind === "lavatar") return "avatar";
  if (kind === "plain") return "plain";
  if (kind === "bar") return "bar";
  if (BAND_ONLY.has(layout)) return "band";
  if (kind === "light") return "soft";
  return PHOTO_CYCLE[LY.findIndex((l) => l[0] === layout) % 3];
}
const TABLE_KIND = Object.fromEntries([
  ...["invoice", "receipt", "price-list", "budget-proposal", "pricing-proposal", "personal-budget", "trip-budget", "product-catalog", "menu", "donation-receipt", "grant-proposal", "statement-of-work", "shopping-list"].map((k) => [k, "money"]),
  ...["timetable", "shift-schedule", "weekly-planner", "meal-planner", "daily-planner", "conference-agenda", "event-program", "wedding-program", "syllabus", "meeting-agenda", "meal-plan-nutrition", "action-minutes", "standup", "event-flyer-doc"].map((k) => [k, "schedule"]),
  ...["team-directory", "signup-sheet", "resume-sidebar", "kanban", "interview-notes"].map((k) => [k, "people"]),
]);
const LABEL = { "wedding-program": "Order of the day", "conference-agenda": "Agenda", "event-program": "Programme", "meal-planner": "This week", "meal-plan-nutrition": "Daily plan", "habit-tracker": "This week", "report-card": "Results", timetable: "Timetable", glossary: "Terms", "shopping-list": "To buy", worksheet: "Exercises", "board-minutes": "Decisions", "event-flyer-doc": "Programme", invoice: "Invoice items", receipt: "Items paid", "price-list": "Our prices", menu: "Tonight's menu", "product-catalog": "Best sellers", "pricing-proposal": "Packages", "budget-proposal": "Budget", "personal-budget": "This month", "trip-budget": "Trip costs", "grant-proposal": "Funding asked", recipe: "Ingredients", "launch-checklist": "Launch checklist", "employee-handbook": "Your first week", "brand-guidelines": "Brand essentials", "content-strategy": "Content that works", "project-scope": "Deliverables", "status-report": "Project health", "event-plan": "Run of show", roadmap: "Roadmap", "project-plan": "Milestones", "timeline-grid": "Timeline", "travel-itinerary": "Day by day", "lesson-plan": "Lesson steps", sop: "Procedure", "meeting-notes": "Action items", "job-description": "What you will do", "onboarding-guide": "Your first week", "how-to-guide": "Steps", "marketing-plan": "Channel results", "business-plan": "Financial outlook", "research-report": "Key findings", "white-paper": "What we found", "lab-report": "Results", "property-listing": "Price history", "magazine-article": "By the numbers" };
const DEF_LABEL = { table: "Key numbers", chart: "Highlights", checks: "Next steps", timeline: "Milestones", kpi: "At a glance" };

/** "layout~p07~clinic" → { layout, P, T } (null when it is not a generated id). */
export function parseId(id) {
  const [l, p, t] = String(id || "").split("~");
  if (!LMAP[l] || !PMAP[p] || !TMAP[t]) return null;
  return { layout: l, L: LMAP[l], P: PMAP[p], T: TMAP[t] };
}
// Template categories (filter chips in the Templates panel), like the kinds on a template site.
const CAT = {
  Reports: ["impact-report", "lab-report", "survey-results", "competitor-analysis", "postmortem", "white-paper", "incident-report", "fact-sheet", "magazine-article", "annual-report", "sustainability-report", "status-report", "research-report", "title-page-report", "case-study", "stats-case-study", "report", "essay"],
  "Plans and proposals": ["project-plan", "business-case", "project-scope", "social-media-plan", "content-strategy", "pitch-one-sheet", "launch-plan", "project-charter", "budget-proposal", "grant-proposal", "creative-brief", "prd", "statement-of-work", "one-pager", "strategic-plan", "project-proposal", "pricing-proposal", "business-plan", "marketing-plan", "product-brief", "roadmap", "okrs", "timeline-grid", "comparison", "swot", "event-plan"],
  "Resumes and letters": ["parent-letter", "about-me", "resume", "resume-sidebar", "resume-timeline", "resume-minimal", "cover-letter", "thank-you-letter", "recommendation-letter", "letterhead", "award-letter", "cv", "modern-cover-letter", "business-letter"],
  Newsletters: ["release-notes", "property-listing", "newsletter", "two-column-newsletter", "press-release", "brochure", "notice-bilingual"],
  "Meetings and planners": ["daily-planner", "trip-budget", "meal-plan-nutrition", "shift-schedule", "conference-agenda", "meeting-agenda", "shopping-list", "personal-budget", "habit-tracker", "board-minutes", "event-flyer-doc", "retrospective", "kanban", "standup", "interview-notes", "wedding-program", "meeting-notes", "team-meeting", "action-minutes", "weekly-planner", "brainstorm", "journal", "meal-planner", "launch-checklist", "signup-sheet", "travel-itinerary", "event-program"],
  Education: ["timetable", "short-story", "worksheet", "report-card", "glossary", "lesson-plan", "syllabus", "book-report"],
  "Guides and policies": ["brand-guidelines", "employee-handbook", "workshop-handout", "volunteer-handbook", "performance-review", "city-guide", "speech", "sop", "how-to-guide", "policy", "faq", "onboarding-guide", "job-description", "contract"],
  "Business forms": ["product-catalog", "donation-receipt", "questionnaire", "team-directory", "invoice", "price-list", "receipt", "menu", "recipe"],
};
const CAT_OF = Object.fromEntries(Object.entries(CAT).flatMap(([c, ids]) => ids.map((id) => [id, c])));
export const FILTERS = [
  { key: "category", label: "Category", options: Object.keys(CAT).map((c) => ({ value: c, label: c })) },
  { key: "theme", label: "Theme", options: TH.map((t) => ({ value: t[0], label: t[1] })) },
];
const genMeta = (l, P, T) => {
  const L = LMAP[l];
  // One section for the generated list (the panel starts a new heading whenever the section changes).
  return { id: `${l}~${P.id}~${T.key}`, name: `${P.name} ${T.label} ${L[1]}`, tool: "docs", section: MORE, tags: [...L[3], T.label.toLowerCase(), T.key, P.name.toLowerCase(), L[1].toLowerCase(), L[2] === LONG ? "long doc" : "short doc"], layout: l, layoutName: L[1], category: CAT_OF[l] || "Plans and proposals", palette: P.id, theme: T.key, themeName: T.label };
};

/* ---------------- the 13 hand-tuned originals and the 8 classic templates (built in templates.js) ---------------- */
const ORIGINAL = [
  ["one-pager", "One pager", LONG, ["one pager", "summary", "overview"], { bg: "#24453a", fg: "#f3efe6", accent: "#a7e8c5", deco: "petals", dc: "#a7e8c5", dc2: "#f3efe6", serif: true, title: "One Pager", sub: "Northwind Studio" }],
  ["strategic-plan", "Strategic plan", LONG, ["strategy", "plan", "pestle"], { bg: "#3d2a1e", fg: "#f7e9cf", accent: "#c99a4b", deco: "circles", dc: "#c99a4b", dc2: "#7a5536", serif: true, title: "Strategic Plan", sub: "2027 - 2029" }],
  ["sustainability-report", "Sustainability report", LONG, ["report", "sustainability", "green"], { bg: "#0f766e", fg: "#ecfeff", accent: "#99f6e4", deco: "leaves", dc: "#99f6e4", dc2: "#ccfbf1", title: "SUSTAINABILITY REPORT", sub: "Greenline Textiles", small: true }],
  ["project-proposal", "Project proposal", LONG, ["proposal", "project", "budget"], { bg: "#4c1d95", fg: "#ffffff", accent: "#ede9fe", deco: "waves", dc: "#c4b5fd", dc2: "#f0abfc", title: "Project Proposal", sub: "Community reading corners" }],
  ["newsletter", "Newsletter", LONG, ["newsletter", "school", "news"], { bg: "#ff7a59", fg: "#ffffff", accent: "#fff1e6", deco: "circles", dc: "#ffd166", dc2: "#fff1e6", title: "The Monthly Bulletin", sub: "Issue 14 - November" }],
  ["annual-report", "Annual report", LONG, ["report", "annual", "finance"], { bg: "#1e3a8a", fg: "#ffffff", accent: "#dbeafe", deco: "steps", dc: "#60a5fa", dc2: "#93c5fd", title: "Annual Report 2026", sub: "Sunrise Microfinance" }],
  ["case-study", "Case study", LONG, ["case study", "customer", "results"], { bg: "#111827", fg: "#ffffff", accent: "#d1fae5", deco: "petals", dc: "#34d399", dc2: "#6ee7b7", title: "Case Study", sub: "Kite Couriers" }],
  ["product-brief", "Product brief", LONG, ["product", "brief", "features"], { bg: "#5b4cf0", fg: "#ffffff", accent: "#e0e7ff", deco: "dots", dc: "#c7d2fe", dc2: "#c7d2fe", title: "Product Brief", sub: "Pocket budget planner" }],
  ["resume", "Resume", MORE, ["resume", "cv", "job"], { bg: "#12355b", fg: "#ffffff", accent: "#12355b", deco: "avatar", dc: "#2f80ff", dc2: "#9cc3ff", title: "Sana Malik", sub: "Product Designer", left: true }],
  ["thank-you-letter", "Thank-you letter", MORE, ["letter", "thank you"], { bg: "#fdf2f8", fg: "#9d174d", accent: "#f9a8d4", deco: "flower", dc: "#f9a8d4", dc2: "#fbbf24", serif: true, italic: true, title: "Thank You", sub: "" }],
  ["team-meeting", "Meeting notes", MORE, ["meeting", "notes", "agenda"], { bg: "#fff7ed", fg: "#9a3412", accent: "#fb923c", deco: "confetti", dc: "#fb923c", dc2: "#2f80ff", title: "Weekly team meeting", sub: "Agenda and actions" }],
  ["modern-cover-letter", "Modern cover letter", MORE, ["cover letter", "letter", "job"], { bg: "#0f172a", fg: "#ffffff", accent: "#f59e0b", deco: "arc", dc: "#f59e0b", dc2: "#f59e0b", title: "Daniyal Ahmed", sub: "Data Analyst" }],
  ["lesson-plan", "Lesson plan", MORE, ["lesson", "teacher", "school"], { bg: "#fef3c7", fg: "#92400e", accent: "#fde68a", deco: "sun", dc: "#f59e0b", dc2: "#fb923c", serif: false, title: "Lesson Plan", sub: "Science - Grade 5" }],
  ["cv", "CV (classic)", MORE, ["cv", "resume", "job"], { bg: "#ffffff", fg: "#1b2133", accent: "#5b4cf0", title: "Ayesha Khan", sub: "Marketing Officer", plain: true }],
  ["cover-letter", "Cover letter", MORE, ["letter", "cover letter", "job"], { bg: "#ffffff", fg: "#1b2133", accent: "#94a3b8", title: "Cover letter", sub: "Dear Hiring Manager", plain: true }],
  ["business-letter", "Business letter", MORE, ["letter", "business", "official"], { bg: "#ffffff", fg: "#1b2133", accent: "#5b4cf0", title: "Sunrise Traders", sub: "Order for printed boxes", plain: true }],
  ["report", "Quarterly report", MORE, ["report", "sales", "quarterly"], { bg: "#ffffff", fg: "#1b2133", accent: "#2f80ff", title: "Quarterly Sales Report", sub: "July to September", plain: true }],
  ["meeting-notes", "Meeting notes (simple)", MORE, ["meeting", "notes", "minutes"], { bg: "#ffffff", fg: "#1b2133", accent: "#14b8a6", title: "Meeting notes", sub: "Agenda, decisions, actions", plain: true }],
  ["invoice", "Invoice (classic)", MORE, ["invoice", "bill", "payment"], { bg: "#ffffff", fg: "#1b2133", accent: "#ff7a59", title: "INVOICE", sub: "Bill to", plain: true }],
  ["essay", "Essay", MORE, ["essay", "school", "writing"], { bg: "#ffffff", fg: "#1b2133", accent: "#64748b", title: "Essay title", sub: "Introduction", plain: true }],
  ["notice-bilingual", "Bilingual notice", MORE, ["notice", "bilingual", "office"], { bg: "#ffffff", fg: "#1b2133", accent: "#8b5cf6", title: "Notice", sub: "Two languages", plain: true }],
];
const ORIG_LOOK = Object.fromEntries(ORIGINAL.map((o) => [o[0], o[4]]));

/* ---------------- the list: originals first, then a well-mixed walk over layout × palette × theme ---------------- */
function generated(n) {
  const out = [], nL = LY.length, nP = PALETTES.length, nT = THEMES.length;
  // k → layout k % nL; round r = k / nL picks palette and theme so that neighbours differ and no pair repeats
  // (gcd(nP + 1, nT) = 1 keeps every (palette, theme) pair of one layout distinct for r < nP * nT).
  for (let k = 0; out.length < n && k < nL * nP * nT; k++) {
    const l = k % nL, r = Math.floor(k / nL);
    const P = PALETTES[(r + 5 * l) % nP], T = THEMES[(Math.floor(r / nP) + r + 7 * l) % nT];
    out.push(genMeta(LY[l][0], P, T));
  }
  return out;
}
const ORIG_LAYOUT = { "team-meeting": "meeting-notes", "modern-cover-letter": "cover-letter", cv: "resume", "business-letter": "cover-letter", report: "annual-report", essay: "research-report", "notice-bilingual": "press-release" };
const originals = ORIGINAL.map(([id, name, section, tags]) => { const l = ORIG_LAYOUT[id] || id; return { id, name, tool: "docs", section, tags, layout: l, layoutName: LMAP[l]?.[1] || name, category: CAT_OF[id] || CAT_OF[l] || "Plans and proposals" }; });

/* ---------------- Magic Write starters (tool "magic-write": Canva has no template type for it; 24 own starters) ---------------- */
export const MAGIC_WRITE = [
  ["blog-post", "Blog post", "a 300-word blog post about"], ["product-description", "Product description", "a short product description for"],
  ["customer-email", "Customer email", "a friendly email to a customer about"], ["social-caption", "Social media caption", "three short social media captions about"],
  ["cover-letter", "Cover letter draft", "a cover letter for the job of"], ["meeting-summary", "Meeting summary", "a clear summary of a meeting about"],
  ["event-invitation", "Event invitation", "an invitation to"], ["thank-you-note", "Thank-you note", "a warm thank-you note for"],
  ["faq", "FAQ page", "five questions and answers about"], ["press-release", "Press release", "a press release announcing"],
  ["job-post", "Job post", "a job post for"], ["short-bio", "Short bio", "a three-sentence bio of"],
  ["speech", "Speech", "a two-minute speech about"], ["short-story", "Short story", "a short story for children about"],
  ["poem", "Poem", "a short poem about"], ["ad-copy", "Ad copy", "a short advert for"],
  ["menu-descriptions", "Menu descriptions", "tasty menu descriptions for"], ["apology-email", "Apology email", "a polite apology email about"],
  ["newsletter-intro", "Newsletter intro", "the opening paragraph of a newsletter about"], ["review-reply", "Review reply", "a kind reply to a customer review about"],
  ["lesson-summary", "Lesson summary", "a simple summary for students of"], ["essay-outline", "Essay outline", "an essay outline on"],
  ["business-pitch", "Business idea pitch", "a one-paragraph pitch for"], ["product-launch-post", "Launch announcement", "a launch announcement for"],
].map(([id, name, prompt], i) => ({ id: "mw-" + id, name, prompt, tool: "magic-write", section: "Magic Write starters", tags: ["magic write", "ai", "writing", name.toLowerCase()], palette: PALETTES[i % PALETTES.length].id }));

// First a full round of the generator (every layout once, so the first 40+ cards are all different layouts), then the
// hand-tuned originals and classic templates, then the rest of the mixed walk.
const GEN = generated(CANVA_COUNT - originals.length);
export const TEMPLATES = [...GEN.slice(0, LY.length), ...originals, ...GEN.slice(LY.length), ...MAGIC_WRITE];
/** Docs templates (Canva's Docs count); TOTALS has the count per tool (docs, magic-write). */
export const TOTAL = TEMPLATES.filter((t) => t.tool === "docs").length;
export const TOTALS = { docs: TOTAL, "magic-write": MAGIC_WRITE.length };
let byId = null;
export const templateMeta = (id) => { byId ||= new Map(TEMPLATES.map((t) => [t.id, t])); return byId.get(id) || (parseId(id) ? genMeta(parseId(id).layout, parseId(id).P, parseId(id).T) : null); };

/* ---------------- thumbnails: a finished mini page in Canva's Docs pattern (thumbs.js draws it) ---------------- */
// Hand-made templates: palette, content theme (photo + sample text) and header style of each.
const ORIG_SPEC = {
  "one-pager": ["p01", "agency", "shade"], "strategic-plan": ["p06", "construction", "split"], "sustainability-report": ["p05", "ngo", "tint"],
  "project-proposal": ["p03", "school", "shade"], newsletter: ["p04", "school", "split"], "annual-report": ["p08", "agency", "shade"],
  "case-study": ["p07", "shop", "split"], "product-brief": ["p12", "tech", "tint"], resume: ["p02", "tech", "avatar"],
  "thank-you-letter": ["p09", "bakery", "band"], "team-meeting": ["p04", "agency", "soft"], "modern-cover-letter": ["p11", "tech", "band"],
  "lesson-plan": ["p10", "school", "soft"], cv: ["p12", "shop", "avatar"], "cover-letter": ["p11", "restaurant", "band"],
  "business-letter": ["p02", "shop", "band"], report: ["p02", "shop", "shade"], "meeting-notes": ["p05", "shop", "soft"],
  invoice: ["p04", "shop", "band"], essay: ["p11", "school", "plain"], "notice-bilingual": ["p03", "school", "band"],
};
// Kicker line (small caps above the title) for personal documents, where the organisation name would read oddly.
const KICKER = { "wedding-program": "Together with their families", "short-story": "A short story", speech: "Remarks", "thank-you-letter": "With gratitude", recipe: "From our kitchen", menu: "Seasonal menu", journal: "Daily journal", "award-letter": "Certificate of appreciation", "habit-tracker": "Personal", "meal-planner": "Meal plan", "shopping-list": "This week", "about-me": "About me", "book-report": "Book report", "daily-planner": "Plan your day", "weekly-planner": "Plan your week", "personal-budget": "Personal finance", "trip-budget": "Trip planner", "city-guide": "City guide", "travel-itinerary": "Travel itinerary" };
const photoTopic = (T, L) => `${THEME_PHOTO[T.key] || T.label} ${L ? L[1] : ""}`.trim();

/* ---------------- people photos: where Canva's Docs show a person, ours show one too (shared people library) ---------------- */
// Each content theme's main person (TH: Ayesha, Hamid, Bilal…): woman or man, and what kind of person the theme shows.
const PERSON = { school: ["f", "teacher"], clinic: ["m", "doctor"], restaurant: ["m", "chef"], shop: ["f", "shop owner"], tech: ["m", "business"], ngo: ["f", "business"], travel: ["m", "business"], fitness: ["f", "fitness trainer"], realestate: ["m", "realtor"], agency: ["f", "business"], bakery: ["f", "barista shop owner"], construction: ["m", "business"] };
// People at work in each content theme (team / scene photos for newsletters, impact reports…).
const CREW = { school: "teacher students class", clinic: "doctor nurse medical", restaurant: "chef cooking kitchen", shop: "barista shop owner staff", tech: "team meeting startup office colleagues", ngo: "team hands together community volunteers", travel: "travel traveler trip", fitness: "fitness gym workout", realestate: "realtor showing home clients", agency: "team whiteboard presentation workshop colleagues", bakery: "barista cafe coffee staff", construction: "team meeting business office colleagues" };
const who = (T) => PERSON[T.key] || ["f", "business"];
const sexWord = (s) => (s === "f" ? "woman" : "man");
// Layouts whose header photo shows people (Canva: newsletters and brochures with staff and customers, impact reports,
// a customer on case studies, team and welcome docs, a speaker, a traveller on travel guides…). Planner-type docs
// (itineraries, agendas, programmes) keep places and things, as Canva's planners do.
const PEOPLE_HEAD = {
  newsletter: (T) => CREW[T.key], "two-column-newsletter": (T) => CREW[T.key], brochure: (T) => CREW[T.key], "impact-report": (T) => CREW[T.key],
  "press-release": (T) => `${sexWord(who(T)[0])} ${who(T)[1]} portrait`, "magazine-article": (T) => `${sexWord(who(T)[0])} business founder portrait`,
  "case-study": () => "smiling customer testimonial", "onboarding-guide": () => "team welcome handshake hiring colleagues",
  "employee-handbook": () => "team colleagues staff office", "team-directory": () => "team standing smiling staff colleagues",
  "volunteer-handbook": () => "team hands together community volunteers", "workshop-handout": () => "presenter workshop training",
  speech: (T) => `${sexWord(who(T)[0])} speaker microphone`, "city-guide": () => "traveler woman travel trip",
};
// Layouts whose second (story) photo inside the opened document shows people as well.
const PEOPLE_STORY = new Set(["newsletter", "two-column-newsletter", "brochure", "impact-report", "onboarding-guide", "employee-handbook", "volunteer-handbook", "about-me"]);
// Résumé-like layouts: the illustrated avatar is now a round profile photo of the right person (Canva résumé docs).
const PORTRAIT = new Set(["resume", "resume-sidebar", "about-me"]);
const ORIG_SEX = { resume: "f", cv: "f" }; // Sana Malik, Ayesha Khan
const portraitOf = (sex, role, seed) => pickPerson(`${sexWord(sex)} ${role} professional headshot portrait`, seed, { sex });
// Magic Write starters about people.
const MW_PEOPLE = { "mw-short-bio": (T) => `${sexWord(who(T)[0])} business portrait`, "mw-speech": (T) => `${sexWord(who(T)[0])} speaker microphone`, "mw-job-post": () => "team welcome handshake hiring colleagues", "mw-meeting-summary": () => "team meeting office colleagues", "mw-review-reply": () => "smiling customer testimonial" };
/** Header photo of a layout: a people photo where the layout shows people, else a place / thing photo. */
function headPhoto(layout, T, L, seed) {
  const kind = PEOPLE_HEAD[layout]?.(T);
  return kind ? pickPerson(kind, seed, { landscape: true }) : pickPhoto(photoTopic(T, L), seed);
}
/** Kind of people for the story photo of an opened document (null: a place / thing photo). */
const storyPeople = (layout, T) => (PEOPLE_STORY.has(layout) ? (PEOPLE_HEAD[layout]?.(T) || CREW[T.key] || "team colleagues") : null);
/** People layouts per tool (the counts and tests read these). */
export const PEOPLE_LAYOUTS = { head: Object.keys(PEOPLE_HEAD), portrait: [...PORTRAIT], story: [...PEOPLE_STORY], magicWrite: Object.keys(MW_PEOPLE) };
/** The look of any template id: { P, T, style, body, label, table, title, sub, kicker, serif, deco, barText, photo (record) }.
 *  templates.js uses the same look for the opened document, so the card and the document match. */
export function docLook(id) {
  const o = ORIG_LOOK[id];
  if (o) {
    const [pid, tk, style] = ORIG_SPEC[id] || ["p02", "shop", "band"];
    const P = PMAP[pid], T = TMAP[tk], l = ORIG_LAYOUT[id] || id, L = LMAP[l];
    let body = BODY[l] || "sections";
    if (body === "kpi") body = "chart";
    const photo = ["band", "avatar", "plain"].includes(style) ? null : headPhoto(l, T, L, id);
    const portrait = style === "avatar" ? portraitOf(ORIG_SEX[id] || who(T)[0], "business", id) : null;
    return { P, T, style, body, label: LABEL[l] || DEF_LABEL[body] || "Overview", table: TABLE_KIND[l] || "metrics", title: o.title, sub: o.sub, kicker: "", serif: !!o.serif, deco: o.deco || "diamonds", photo, portrait, people: storyPeople(l, T), layout: l, original: true, topic: photoTopic(T, L), id };
  }
  const mi = MAGIC_WRITE.findIndex((t) => t.id === id);
  if (mi >= 0) {
    const mw = MAGIC_WRITE[mi], P = PMAP[mw.palette], T = THEMES[mi % THEMES.length], style = ["tint", "soft", "split"][mi % 3];
    const kind = MW_PEOPLE[mw.id]?.(T);
    const photo = kind ? pickPerson(kind, id, { landscape: true }) : pickPhoto(`${mw.name} ${THEME_PHOTO[T.key]}`, id);
    return { P, T, style, body: mi % 2 ? "sections" : "letter", label: "Draft", table: "metrics", title: mw.name, sub: "AI writing starter", kicker: "Magic Write", serif: false, deco: "confetti", photo, portrait: null, people: null, layout: mw.id, topic: `${mw.name} ${THEME_PHOTO[T.key]}`, id };
  }
  const g = parseId(id);
  if (!g) return null;
  const { L, P, T, layout } = g, opt = L[8] || {}, style = styleOf(layout), body = BODY[layout] || "sections";
  const title = L[6](T), sub = L[7](T);
  const kicker = style === "avatar" ? "" : KICKER[layout] || (sub === T.org || String(title).includes(T.short) ? `${T.label} · ${T.city}` : T.org);
  const photo = style === "band" || style === "avatar" || style === "plain" || (style === "bar" && !BAR_PHOTO.has(layout)) ? null : headPhoto(layout, T, L, id);
  const portrait = style === "avatar" && PORTRAIT.has(layout) ? portraitOf(who(T)[0], who(T)[1], id) : null;
  return { P, T, style, body, label: LABEL[layout] || DEF_LABEL[body] || "Overview", table: TABLE_KIND[layout] || "metrics", title, sub, kicker, serif: !!(opt.serif || P.font === "serif"), deco: L[5] || "diamonds", barText: opt.barText, photo, portrait, people: storyPeople(layout, T), layout, topic: photoTopic(T, L), id };
}
/** Pixel viewBox [x, y, w, h, photo w, photo h] of a people photo cropped around the face for a w × h box (null for
 *  other photos: those are centre-cropped). */
const faceBox = (p) => (p && isPerson(p) ? (w, h) => { const c = focusCrop(p, w, h); return [c.x * p.w, c.y * p.h, c.w * p.w, c.h * p.h, p.w, p.h]; } : null);
const cache = new Map();
/** Aspect ratio of thumb(id): a portrait A4 page (Canva shows Docs templates as whole first pages). Template panels and
 *  intro cards size their picture box with it (CSS aspect-ratio value). */
export const THUMB_RATIO = `${PAGE_W} / ${PAGE_H}`;
/** Finished-looking SVG of a template's whole first page, 320 × 452 (photo thumbnails only, never the full-size photo). */
export function thumb(id) {
  if (cache.has(id)) return cache.get(id);
  const k = docLook(id);
  let svg;
  if (!k) svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}"><rect width="${PAGE_W}" height="${PAGE_H}" fill="#ffffff"/></svg>`;
  else svg = drawThumb({ ...k, photo: k.photo ? photoUrl(k.photo, "thumb") : "", photoBox: faceBox(k.photo), portrait: k.portrait ? photoUrl(k.portrait, "thumb") : "", portraitBox: faceBox(k.portrait) }, id, decoSvg);
  cache.set(id, svg);
  if (cache.size > 600) cache.delete(cache.keys().next().value);
  return svg;
}
