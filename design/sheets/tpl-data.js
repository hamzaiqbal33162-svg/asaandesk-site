// Data for the generated Sheets templates (pure module, no DOM, no imports): our own colour palettes, content
// themes (purposes / industries with their own sample text) and the list of base layouts. A generated template id
// is "<layout>~p<NN>~<theme>", e.g. "budget-tracker~p07~clinic"; gallery.js draws it, layouts.js builds it.

/** Palettes: band (title), band2 (accent), head (header row tint), ink (header text), zebra (alternate rows). */
export const PALETTES = [
  ["p01", "Indigo", "#4f46e5", "#7c3aed", "#e0e7ff", "#312e81", "#f5f7ff"],
  ["p02", "Rose", "#e11d48", "#fb7185", "#ffe4e6", "#881337", "#fff1f2"],
  ["p03", "Amber", "#d97706", "#f59e0b", "#fef3c7", "#78350f", "#fffbeb"],
  ["p04", "Teal", "#0f766e", "#14b8a6", "#ccfbf1", "#134e4a", "#f0fdfa"],
  ["p05", "Sky", "#0284c7", "#38bdf8", "#e0f2fe", "#0c4a6e", "#f0f9ff"],
  ["p06", "Leaf", "#15803d", "#4ade80", "#dcfce7", "#14532d", "#f0fdf4"],
  ["p07", "Orange", "#ea580c", "#fb923c", "#ffedd5", "#7c2d12", "#fff7ed"],
  ["p08", "Orchid", "#c026d3", "#e879f9", "#fae8ff", "#701a75", "#fdf4ff"],
  ["p09", "Navy", "#1e3a8a", "#2563eb", "#dbeafe", "#1e3a8a", "#eff6ff"],
  ["p10", "Violet", "#7c3aed", "#a78bfa", "#ede9fe", "#4c1d95", "#faf5ff"],
  ["p11", "Slate", "#334155", "#64748b", "#e2e8f0", "#0f172a", "#f8fafc"],
  ["p12", "Pink", "#db2777", "#f472b6", "#fce7f3", "#831843", "#fdf2f8"],
  ["p13", "Emerald gold", "#047857", "#ca8a04", "#d1fae5", "#064e3b", "#f0fdf9"],
  ["p14", "Coral plum", "#be123c", "#7c3aed", "#ffe4e6", "#4c0519", "#fff5f7"],
].map(([id, name, band, band2, head, ink, zebra]) => ({ id, name, band, band2, head, ink, zebra }));

export const PEOPLE = ["Ayesha Khan", "Bilal Ahmed", "Fatima Noor", "Hamza Ali", "Sana Tariq", "Usman Raza", "Zainab Iqbal", "Omar Farooq", "Hira Shah", "Imran Butt", "Maryam Javed", "Saad Qureshi", "Nida Hassan", "Ali Raza", "Komal Aziz", "Faisal Mehmood", "Rabia Saleem", "Danish Akram", "Amna Yousaf", "Kashif Nawaz", "Sadia Rehman", "Tariq Mirza", "Iqra Sultan", "Zeeshan Haider"];
export const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Hyderabad"];

/** Content themes. items: [name, cost, price]; costs: spending categories; money: a typical monthly amount (Rs). */
export const THEMES = [
  { id: "home", label: "Home", biz: "The Malik family", money: 18000, people: 0,
    items: [["Rice 10kg", 3200, 3500], ["Cooking oil 5L", 2600, 2900], ["Tea 950g", 1650, 1800], ["Washing powder", 900, 1000], ["Milk carton", 280, 300], ["Bread", 150, 170], ["Eggs, dozen", 360, 400], ["Fruit basket", 900, 1000]],
    costs: ["Rent", "Groceries", "Electricity", "Gas and water", "School fees", "Transport", "Mobile and internet", "Eating out"],
    tasks: ["Pay utility bills", "Book car service", "Buy school uniforms", "Plan weekend trip", "Renew home insurance", "Fix kitchen tap", "Clean the store room", "Order groceries"],
    clients: ["Ali Traders", "Green Grocers", "City Electric", "Star Pharmacy", "Quick Mart", "Home Fix Services"] },
  { id: "shop", label: "Shop", biz: "Corner Mart", money: 60000, people: 3,
    items: [["Basmati rice 5kg", 1650, 1950], ["Cooking oil 1L", 520, 600], ["Sugar 1kg", 140, 165], ["Tea pack 450g", 780, 900], ["Biscuits family pack", 210, 260], ["Soft drink 1.5L", 150, 190], ["Dish soap 500ml", 230, 280], ["Toothpaste", 180, 230]],
    costs: ["Shop rent", "Staff salaries", "Electricity", "Stock purchases", "Transport", "Packaging", "Repairs", "Mobile and internet"],
    tasks: ["Count stock", "Order new stock", "Update price tags", "Clean the shelves", "Pay suppliers", "Run weekend offer", "Fix the freezer", "Train new helper"],
    clients: ["Rehman Traders", "Sitara Wholesale", "Fresh Farms", "Al Noor Supplies", "Bright Packaging", "City Distributors"] },
  { id: "school", label: "School", biz: "Bright Future School", money: 90000, people: 6,
    items: [["Notebook A4", 120, 150], ["Ball pens, box", 320, 380], ["Whiteboard markers", 450, 520], ["Chalk box", 150, 180], ["Printer paper ream", 1350, 1500], ["Science kit", 2800, 3200], ["Football", 1900, 2200], ["First aid kit", 1500, 1750]],
    costs: ["Teacher salaries", "Building rent", "Electricity", "Books and supplies", "Transport", "Sports day", "Cleaning", "Internet"],
    tasks: ["Prepare term exams", "Parent-teacher meeting", "Science fair", "Update timetable", "Sports day", "Library stock check", "Fee reminders", "Print result cards"],
    clients: ["Grade 6 parents", "Grade 7 parents", "Book Corner", "Uniform House", "Smart Print", "Safe Ride Vans"],
    criteria: ["Maths", "English", "Science", "Computer"] },
  { id: "clinic", label: "Clinic", biz: "Care Point Clinic", money: 80000, people: 9,
    items: [["Gloves, box of 100", 950, 1100], ["Face masks, box", 450, 550], ["Syringes 5ml, pack", 600, 700], ["Bandage rolls", 300, 360], ["Thermometer", 850, 1000], ["Hand sanitiser 500ml", 420, 500], ["Cotton wool 500g", 380, 450], ["Blood pressure cuff", 4200, 4800]],
    costs: ["Doctor fees", "Nurse salaries", "Rent", "Medical supplies", "Electricity", "Lab tests", "Cleaning", "Software"],
    tasks: ["Restock medicines", "Book lab visit", "Update patient records", "Clean equipment", "First aid training", "Renew licence", "Fix waiting room AC", "Order new forms"],
    clients: ["Health Plus Insurance", "City Lab", "MediSupply Co.", "Care Pharma", "Sunrise Labs", "Clean Pro Services"] },
  { id: "restaurant", label: "Restaurant", biz: "Spice Garden Kitchen", money: 120000, people: 12,
    items: [["Chicken karahi", 900, 1600], ["Beef biryani", 450, 750], ["Daal tadka", 220, 450], ["Garlic naan", 40, 90], ["Mint lemonade", 80, 250], ["Grilled fish", 1100, 1900], ["Chocolate cake slice", 180, 450], ["Mixed salad", 120, 300]],
    costs: ["Kitchen staff", "Rent", "Ingredients", "Gas and electricity", "Delivery riders", "Marketing", "Cleaning", "Repairs"],
    tasks: ["Plan new menu", "Order fresh vegetables", "Deep clean kitchen", "Train waiters", "Fix the tandoor", "Update delivery app", "Weekend buffet", "Stock count"],
    clients: ["Fresh Farms", "Meat Masters", "Spice Bazaar", "Cool Drinks Co.", "Pack It Right", "FastBite Delivery"],
    criteria: ["Taste", "Service", "Cleanliness", "Speed"] },
  { id: "wedding", label: "Wedding", biz: "Sara and Ahmed's wedding", money: 150000, people: 15,
    items: [["Venue hire", 350000, 380000], ["Catering, per guest", 2200, 2500], ["Bridal dress", 180000, 200000], ["Photography", 120000, 130000], ["Decor and flowers", 90000, 100000], ["Invitation cards", 25000, 28000], ["Mehndi night", 70000, 80000], ["Car hire", 30000, 35000]],
    costs: ["Venue", "Catering", "Clothes", "Jewellery", "Photography", "Decor", "Music", "Transport"],
    tasks: ["Book the venue", "Send invitations", "Choose the menu", "Final dress fitting", "Book photographer", "Plan seating", "Order flowers", "Confirm transport"],
    clients: ["Royal Banquet Hall", "Tasty Caterers", "Lens Story Studio", "Bloom Decor", "Rhythm Sound", "Classic Cars"] },
  { id: "realestate", label: "Real estate", biz: "Skyline Properties", money: 250000, people: 18,
    items: [["Flat 2 bed, Block A", 8500000, 9200000], ["Shop, Main Road", 6200000, 7000000], ["House 5 marla", 14500000, 16000000], ["Plot 10 marla", 9800000, 11000000], ["Office floor", 22000000, 24500000], ["Flat 3 bed, Block C", 12800000, 13900000], ["Studio flat", 4800000, 5300000], ["Warehouse", 31000000, 34000000]],
    costs: ["Agent salaries", "Office rent", "Online ads", "Site visits", "Legal fees", "Electricity", "Printing", "Software"],
    tasks: ["List new properties", "Photo shoot for listings", "Call back buyers", "Site visit with client", "Prepare sale deed", "Update website", "Collect rents", "Monthly market report"],
    clients: ["Usman Raza", "Noor Family", "Green Homes Ltd.", "Ayesha Siddiqui", "Prime Builders", "Hassan Traders"] },
  { id: "gym", label: "Fitness", biz: "Power Up Gym", money: 70000, people: 20,
    items: [["Protein shake", 350, 600], ["Gym towel", 400, 700], ["Water bottle", 250, 450], ["Resistance band", 900, 1500], ["Yoga mat", 1800, 2800], ["Skipping rope", 450, 800], ["Gym gloves", 1100, 1800], ["Energy bar", 120, 220]],
    costs: ["Trainer salaries", "Rent", "Electricity", "Equipment repair", "Cleaning", "Marketing", "Music licence", "Water"],
    tasks: ["Service treadmills", "New class timetable", "Member body checks", "Social media posts", "Buy new weights", "Clean locker rooms", "Trainer meeting", "Summer challenge"],
    clients: ["Fit Supply Co.", "Iron Works", "Clean Pro", "Aqua Water", "Beat Music", "Sports Hub"],
    criteria: ["Strength", "Stamina", "Flexibility", "Attendance"] },
  { id: "startup", label: "Tech startup", biz: "Nimbus Apps", money: 300000, people: 4,
    items: [["Basic plan, monthly", 300, 1500], ["Pro plan, monthly", 700, 4000], ["Team plan, monthly", 1800, 9500], ["Setup service", 4000, 15000], ["Custom report", 2500, 8000], ["Training session", 3000, 10000], ["Extra storage", 200, 900], ["Priority support", 1200, 5000]],
    costs: ["Developer salaries", "Cloud servers", "Office rent", "Software tools", "Marketing", "Internet", "Legal and accounts", "Travel"],
    tasks: ["Ship version 2.0", "Fix login bug", "Write user guide", "Launch on app store", "Customer interviews", "Set up analytics", "Hire a designer", "Pitch to investors"],
    clients: ["Blue Ocean Retail", "Metro Logistics", "Peak Schools", "Green Leaf Foods", "Swift Couriers", "Union Clinics"],
    criteria: ["Code quality", "Speed", "Teamwork", "Ideas"] },
  { id: "ngo", label: "Charity", biz: "Helping Hands Foundation", money: 100000, people: 8,
    items: [["Food pack", 2500, 2750], ["School kit", 1800, 2000], ["Winter blanket", 1500, 1650], ["Water filter", 4500, 4950], ["Medicine kit", 3000, 3300], ["Sewing machine", 22000, 24000], ["Solar lamp", 3500, 3850], ["Hygiene kit", 900, 1000]],
    costs: ["Food packs", "School supplies", "Medical camps", "Staff", "Transport", "Office rent", "Awareness events", "Admin"],
    tasks: ["Food drive in March", "Medical camp", "Donor thank-you letters", "Volunteer training", "Annual report", "School kit delivery", "Fundraising dinner", "Update donor list"],
    clients: ["Kind Heart Trust", "City Rotary Club", "Green Bank", "Ali and Sons", "Hope Fund", "Community Welfare Club"] },
  { id: "travel", label: "Travel", biz: "Blue Horizon Tours", money: 200000, people: 14,
    items: [["Hunza 5-day tour", 38000, 52000], ["Swat family trip", 25000, 36000], ["Skardu flight package", 62000, 80000], ["Murree weekend", 14000, 21000], ["Lahore city tour", 6000, 9500], ["Dubai 4 nights", 145000, 175000], ["Naran camping", 18000, 27000], ["Karachi beach day", 5000, 8500]],
    costs: ["Transport hire", "Hotel bookings", "Guide fees", "Staff salaries", "Office rent", "Online ads", "Insurance", "Fuel"],
    tasks: ["Book hotels for June", "Confirm bus hire", "Print tour guides", "Visa paperwork", "Post trip photos", "Collect deposits", "Plan winter tours", "Guide training"],
    clients: ["Khan family", "Bright Future School", "Metro Bank staff club", "Ayesha and friends", "Peak Engineering", "Rahman group"] },
  { id: "salon", label: "Salon", biz: "Glow Beauty Salon", money: 65000, people: 10,
    items: [["Haircut", 300, 1200], ["Hair colour", 1500, 4500], ["Facial", 900, 3000], ["Manicure", 400, 1500], ["Pedicure", 500, 1800], ["Bridal makeup", 8000, 25000], ["Mehndi design", 500, 2000], ["Hair treatment", 1800, 5000]],
    costs: ["Staff salaries", "Rent", "Products", "Electricity", "Laundry", "Marketing", "Equipment", "Water"],
    tasks: ["Order new products", "Wedding season offers", "Clean styling chairs", "Train new stylist", "Update price board", "Book photo shoot", "Fix hair dryer", "Print loyalty cards"],
    clients: ["Beauty Supply Hub", "Glam Products", "Fresh Linen", "City Ads", "Style Tools Co.", "Bright Lights"] },
];

/** Base layouts: id, name, tags and the look of the little picture (columns, chart kind, KPI tiles, blank grid). */
export const LAYOUT_META = [
  ["budget-tracker", "Budget tracker", 7, "bar2", 0, ["budget", "monthly", "finance"]],
  ["monthly-budget", "Monthly budget", 6, "pie", 3, ["budget", "expenses", "home"]],
  ["price-list", "Price list", 6, null, 0, ["price", "products", "margin"]],
  ["inventory-tracker", "Inventory tracker", 7, "bar", 3, ["inventory", "stock"]],
  ["balance-sheet", "Balance sheet", 6, "bar2", 3, ["accounts", "assets", "finance"]],
  ["kpi-dashboard", "Financial KPI dashboard", 6, "line", 4, ["kpi", "dashboard", "revenue"]],
  ["price-calculator", "Price calculator", 8, "bar2", 0, ["price", "cost", "markup"]],
  ["income-statement", "Income statement", 6, "bar2", 0, ["profit", "loss", "accounts"]],
  ["blank-table", "Simple list", 8, null, 0, ["blank", "table", "simple", "list"], true],
  ["marketing-budget", "Marketing budget tracker", 7, "bar2", 0, ["marketing", "campaign"]],
  ["sales-tracker", "Sales tracker", 6, "bar", 0, ["sales", "revenue"]],
  ["invoice-tracker", "Invoice tracker", 7, null, 3, ["invoices", "billing", "clients"]],
  ["attendance", "Attendance sheet", 10, null, 0, ["attendance", "team", "class"]],
  ["scorecard", "Scorecard", 7, "bar", 0, ["scores", "marks", "performance"]],
  ["project-tracker", "Project tracker", 7, null, 3, ["project", "tasks", "progress"]],
  ["expense-report", "Expense report", 5, "pie", 0, ["expenses", "report"]],
  ["cash-flow", "Cash flow", 5, "line", 0, ["cash", "finance", "monthly"]],
  ["payroll", "Payroll", 7, null, 3, ["salary", "staff", "payroll"]],
  ["order-tracker", "Order tracker", 7, null, 3, ["orders", "sales", "delivery"]],
  ["event-budget", "Event budget", 6, "pie", 0, ["event", "budget", "planning"]],
  ["savings-goals", "Savings goals", 6, "bar", 0, ["savings", "goals"]],
  ["loan-calculator", "Loan calculator", 5, "line", 3, ["loan", "instalment", "calculator"]],
  ["weekly-schedule", "Weekly schedule", 7, null, 0, ["schedule", "timetable", "planner"]],
  ["customer-list", "Customer list", 6, null, 3, ["customers", "contacts", "crm"]],
  ["commission", "Sales commission", 6, "bar", 0, ["sales", "commission", "team"]],
  ["habit-tracker", "Habit tracker", 9, null, 0, ["habits", "goals", "personal"]],
  ["quotation", "Quotation", 5, null, 3, ["quote", "estimate", "invoice"]],
  ["break-even", "Break-even analysis", 4, "line", 3, ["break-even", "profit", "calculator"]],
  ["asset-register", "Asset register", 7, null, 0, ["assets", "depreciation", "equipment"]],
  ["comparison", "Comparison table", 6, "bar", 0, ["compare", "decision", "decision matrix", "suppliers"]],
  ["sales-dashboard", "Sales dashboard", 6, "bar", 4, ["dashboard", "sales", "kpi"], false, "dashboard"],
  ["monthly-calendar", "Monthly calendar", 7, null, 0, ["calendar", "planner", "month"], false, "calendar"],
  ["gantt-timeline", "Project timeline", 8, null, 0, ["gantt", "timeline", "project"], false, "gantt"],
  ["gradebook", "Grade book", 8, "bar", 0, ["school", "marks", "weights"]],
  ["invoice", "Invoice", 5, null, 0, ["invoice", "bill", "payment"], false, "doc"],
  ["meal-planner", "Weekly meal planner", 5, null, 0, ["meals", "planner", "shopping"], false, "planner"],
  ["content-calendar", "Content calendar", 7, "bar", 0, ["social media", "posts", "planner"], false, "pills"],
  ["kanban-board", "Task board", 4, null, 0, ["kanban", "tasks", "board"], false, "kanban"],
  ["team-directory", "Team directory", 7, null, 3, ["team", "contacts", "staff"]],
  ["cash-count", "Daily cash count", 3, null, 0, ["cash", "register", "shop"], false, "split"],
  ["sales-pipeline", "Sales pipeline", 7, "bar", 0, ["deals", "sales", "crm"], false, "pills"],
  ["shift-roster", "Shift roster", 8, null, 0, ["shifts", "staff", "rota"], false, "roster"],
  ["travel-itinerary", "Travel itinerary", 6, null, 0, ["travel", "trip", "plan"], false, "planner"],
  ["rent-tracker", "Rent tracker", 10, null, 0, ["rent", "tenants", "property"], false, "roster"],
  ["fundraiser", "Fundraising tracker", 4, "pie", 0, ["donations", "goal", "charity"], false, "thermo"],
  ["recipe-cost", "Recipe cost calculator", 5, null, 0, ["recipe", "food cost", "price"], false, "doc"],
  ["timesheet", "Weekly timesheet", 7, null, 0, ["hours", "time", "pay"], false, "doc"],
  ["checklist", "To-do checklist", 5, null, 0, ["to-do", "checklist", "tasks"], false, "checklist"],
  ["report-card", "Report card", 7, null, 0, ["school", "report", "student"], false, "doc"],
  ["investment-tracker", "Investment tracker", 8, "pie", 3, ["investments", "savings", "portfolio"]],
  ["goals-tracker", "Goals and key results", 6, null, 0, ["goals", "okr", "progress"], false, "checklist"],
  ["mileage-log", "Mileage log", 8, "line", 0, ["car", "fuel", "travel"]],
  ["bill-splitter", "Bill splitter", 3, null, 0, ["split", "friends", "expenses"], false, "split"],
  ["daily-planner", "Daily planner", 2, null, 0, ["day", "planner", "schedule"], false, "planner"],
  ["loyalty-card", "Loyalty stamp card", 11, null, 0, ["loyalty", "customers", "rewards"], false, "roster"],
  ["price-comparison", "Price comparison", 6, "bar2", 0, ["compare", "prices", "suppliers"]],
  ["debt-payoff", "Debt payoff plan", 7, "bar", 0, ["debt", "loans", "money"]],
  ["guest-list", "Guest list", 6, "pie", 3, ["guests", "rsvp", "event"], false, "pills"],
  ["class-timetable", "Class timetable", 6, null, 0, ["timetable", "school", "periods"], false, "calendar"],
  ["kpi-scorecard", "Quarterly KPI scorecard", 7, null, 0, ["kpi", "quarterly", "trend"], false, "pills"],
  ["candidate-tracker", "Candidate tracker", 7, "bar", 0, ["hiring", "candidates", "recruitment"], false, "pills"],
  ["purchase-order", "Purchase order", 5, null, 0, ["purchase", "order", "supplier"], false, "doc"],
  ["pay-stub", "Pay slip", 5, null, 0, ["salary", "payslip", "pay stub"], false, "split"],
  ["shoot-schedule", "Shoot schedule", 6, null, 0, ["shoot", "call sheet", "schedule"], false, "planner"],
  ["campaign-tracker", "Campaign tracker", 9, "bar", 0, ["campaign", "marketing", "leads"], false, "pills"],
  ["assignment-tracker", "Assignment tracker", 6, null, 0, ["school", "homework", "assignments"], false, "pills"],
  ["bug-tracker", "Issue tracker", 7, "bar", 0, ["issues", "bugs", "support"], false, "pills"],
  ["reading-log", "Reading log", 8, null, 0, ["books", "reading", "log"]],
  ["workout-log", "Workout log", 6, "bar", 0, ["gym", "exercise", "fitness"]],
  ["seating-chart", "Seating chart", 8, null, 0, ["seating", "tables", "event"], false, "kanban"],
  ["swot-analysis", "SWOT analysis", 2, null, 0, ["swot", "strategy", "planning"], false, "quad"],
  ["risk-register", "Risk register", 7, null, 0, ["risk", "planning", "safety"], false, "heat"],
  ["subscription-tracker", "Subscription tracker", 8, "pie", 3, ["subscriptions", "bills", "renewals"]],
  ["vendor-list", "Vendor list", 7, null, 0, ["vendors", "suppliers", "contacts"]],
  ["maintenance-log", "Maintenance log", 7, null, 0, ["maintenance", "service", "equipment"], false, "pills"],
  ["petty-cash", "Petty cash book", 6, null, 0, ["cash", "expenses", "office"]],
  ["meeting-actions", "Meeting notes and actions", 4, null, 0, ["meeting", "minutes", "actions"], false, "doc"],
  ["volunteer-signup", "Volunteer sign-up", 6, null, 0, ["volunteers", "sign-up", "event"], false, "roster"],
  ["warranty-tracker", "Warranty tracker", 7, null, 0, ["warranty", "receipts", "home"], false, "pills"],
  ["sales-heatmap", "Weekly sales heat map", 9, null, 0, ["sales", "heat map", "week"], false, "heat"],
  ["packing-list", "Packing list", 3, null, 0, ["travel", "packing", "checklist"], false, "checklist"],
  ["lesson-plan", "Lesson plan", 4, null, 0, ["school", "lesson", "teacher"], false, "doc"],
  ["decision-matrix", "Decision matrix", 8, "bar", 0, ["decision matrix", "compare", "choose", "weighted"], false, "heat"],
  ["nutrition-tracker", "Daily nutrition tracker", 6, "pie", 0, ["food", "calories", "health"]],
  ["loan-comparison", "Loan comparison", 4, null, 0, ["loan", "compare", "bank"], false, "split"],
  ["currency-matrix", "Currency table", 7, null, 0, ["currency", "exchange", "rates"], false, "heat"],
  ["sales-forecast", "Sales forecast", 4, "line", 0, ["forecast", "sales", "growth"]],
  ["survey-results", "Survey results", 8, "bar2", 0, ["survey", "feedback", "customers"]],
  ["leave-tracker", "Leave tracker", 6, null, 0, ["leave", "holidays", "staff"], false, "checklist"],
  ["project-cost", "Project cost by phase", 5, "bar2", 0, ["project", "budget", "costs"]],
  ["times-table", "Times table", 12, null, 0, ["maths", "school", "kids"], false, "heat"],
  ["unit-converter", "Unit converter", 6, null, 0, ["units", "convert", "measure"], false, "split"],
  ["pricing-tiers", "Pricing plans", 4, null, 0, ["pricing", "plans", "packages"], false, "quad"],
].map(([id, name, cols, chart, kpis, tags, blank, shape]) => ({ id, name, cols, chart, kpis, tags, blank: !!blank, shape: shape || null }));

/** Layouts that come with a second sheet ("1 of 2" in the template picture). */
export const MULTI_PAGE_LAYOUTS = new Set(["gantt-timeline", "invoice", "sales-dashboard"]);
export const COUNT = 362; // Canva shows 362 Sheets templates (canva.com/sheets/templates, 11 Nov 2026); we offer the same number, all our own.
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const PALETTE_BY_ID = byId(PALETTES), THEME_BY_ID = byId(THEMES), LAYOUT_BY_ID = byId(LAYOUT_META);

/** "<layout>~p<NN>~<theme>" → { layout, palette, theme } or null. */
export function parseId(id) {
  const m = /^([a-z0-9-]+)~(p\d\d)~([a-z0-9-]+)$/.exec(String(id || ""));
  if (!m) return null;
  const layout = LAYOUT_BY_ID[m[1]], palette = PALETTE_BY_ID[m[2]], theme = THEME_BY_ID[m[3]];
  return layout && palette && theme ? { layout, palette, theme } : null;
}
const lcFirst = (t) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
/** Display name of a generated template, e.g. "Clinic budget tracker" or "Simple list, teal". */
export function templateName(p) { return p.layout.blank ? `${p.layout.name}, ${p.palette.name.toLowerCase()}` : `${p.theme.label} ${lcFirst(p.layout.name)}`; }
/** Small repeatable random numbers (same id → same numbers). */
export function rng(seed) { let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }

/** The generated list in a well-mixed order: each round walks every layout once with a new theme and palette. */
export function generatedIds(count) {
  const L = LAYOUT_META.length, T = THEMES.length, P = PALETTES.length, out = [], seen = new Set();
  for (let k = 0; out.length < count && k < L * T * P; k++) {
    const l = k % L, round = Math.floor(k / L);
    const t = (round * 5 + l * 7) % T, p = (round * 3 + l * 5 + Math.floor(round / P)) % P;
    const id = `${LAYOUT_META[l].id}~${PALETTES[p].id}~${THEMES[t].id}`;
    if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}
