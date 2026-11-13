// AsaanDesk's own document templates (text and layout written for AsaanDesk; names and numbers are examples).
// Inline text uses Markdown marks (**bold**, *italic*, [link](url)).
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { CHARTS, svgDataUrl } from "./decos.js";
import { parseId, templateMeta, MAGIC_WRITE, PALETTES, docLook } from "./gallery.js";
import { LAYOUT_BUILDERS } from "./layouts.js";
import { proSkin } from "./pro.js";

/** Round 5: every template opens in the same Canva-pattern look as its gallery card (photo header, bold type, cards). */
const skinned = (id, build) => () => { const d = build(); const k = docLook(id); return k ? proSkin(d, k) : d; };

const runs = (md) => cleanRuns(mdInline(md));
const h = (level, md, props = {}) => ({ type: "h" + level, runs: runs(md), ...props });
const p = (md = "", props = {}) => ({ type: "p", runs: runs(md), ...props });
const li = (md, list = "bullet", props = {}) => ({ type: "li", list, level: 0, runs: runs(md), ...props });
const ul = (items, list = "bullet") => items.map((x) => (Array.isArray(x) ? li(x[0], list, { level: 1 }) : li(x, list)));
const checks = (items) => items.map(([md, done]) => li(md, "check", { checked: !!done }));
const table = (rows, header = true) => ({ type: "table", header, rows: rows.map((r) => r.map((c) => ({ runs: runs(String(c)) }))) });
const hr = () => ({ type: "hr" });
const doc = (title, blocks, extra = {}) => normalizeDoc({ ...newDoc(title), ...extra, page: { ...newDoc().page, ...(extra.page || {}) }, blocks });

export const TEMPLATES = [
  {
    id: "cv", name: "CV / resume", desc: "One page, clear sections for jobs and skills.",
    build: () => doc("My CV", [
      h(1, "Ayesha Khan", { align: "center" }),
      p("Marketing Officer · Lahore, Pakistan", { align: "center" }),
      p("ayesha.khan@example.com · +92 300 0000000 · [linkedin.com/in/example](https://www.linkedin.com/)", { align: "center" }),
      hr(),
      h(2, "Profile"),
      p("Marketing officer with four years of experience planning campaigns for food and retail brands. I turn sales numbers into clear plans and work well with sales, design and shop teams."),
      h(2, "Experience"),
      h(3, "Marketing Officer, Bright Foods (Lahore)"),
      p("*March 2022 to now*"),
      ...ul(["Planned 12 seasonal campaigns; online orders grew by 35% in one year.", "Managed a yearly budget of PKR 6 million across print, radio and social media.", "Trained 20 shop staff on new product launches."]),
      h(3, "Sales Assistant, City Mart (Faisalabad)"),
      p("*June 2020 to February 2022*"),
      ...ul(["Kept weekly stock and sales reports for three branches.", "Helped set up the first loyalty card scheme."]),
      h(2, "Education"),
      p("**BBA (Marketing)**, University of the Punjab, 2020"),
      h(2, "Skills"),
      ...ul(["Campaign planning and budgets", "Spreadsheets and sales reports", "Social media content", "Team training"]),
      h(2, "Languages"),
      p("English (fluent), Urdu (native), Punjabi (spoken)"),
    ]),
  },
  {
    id: "cover-letter", name: "Cover letter", desc: "A short, friendly letter to send with your CV.",
    build: () => doc("Cover letter", [
      p("Ayesha Khan"), p("House 12, Street 4, Model Town, Lahore"), p("ayesha.khan@example.com · +92 300 0000000"), p(""),
      p("10 November 2026"), p(""),
      p("Hiring Manager"), p("Green Valley Foods"), p("Karachi"), p(""),
      p("Dear Hiring Manager,"),
      p("I would like to apply for the post of **Brand Manager** at Green Valley Foods. I have four years of marketing experience in the food business, and I enjoy building brands that people trust.", { align: "justify" }),
      p("At Bright Foods I planned seasonal campaigns, managed a yearly budget of PKR 6 million and worked closely with sales teams in three cities. Our online orders grew by 35% in one year.", { align: "justify" }),
      p("I would be glad to meet you and explain how I can help your team. Thank you for your time.", { align: "justify" }),
      p(""), p("Yours sincerely,"), p(""), p("**Ayesha Khan**"),
    ]),
  },
  {
    id: "business-letter", name: "Business letter", desc: "Letterhead, reference, subject line and signature.",
    build: () => doc("Business letter", [
      h(2, "Sunrise Traders (Pvt) Ltd", { align: "center" }),
      p("45 Main Boulevard, Gulberg, Lahore · +92 42 0000000 · info@example.com", { align: "center" }),
      hr(),
      p("Ref: ST/2026/118"), p("Date: 10 November 2026"), p(""),
      p("The Manager"), p("Al-Noor Packaging"), p("Industrial Area, Sialkot"), p(""),
      p("**Subject: Order for printed boxes**"),
      p("Dear Sir or Madam,"),
      p("Please accept our order for 5,000 printed boxes as per the quote you sent on 2 November 2026. The boxes should match the approved sample and be delivered to our Lahore warehouse by 30 November 2026.", { align: "justify" }),
      p("Payment will be made by bank transfer within 15 days of delivery. Please send the invoice to accounts@example.com.", { align: "justify" }),
      p("Thank you for your continued support."),
      p(""), p("Yours faithfully,"), p(""), p(""),
      p("**Imran Ali**"), p("Purchase Manager, Sunrise Traders"),
    ]),
  },
  {
    id: "report", name: "Report", desc: "Title, summary, findings table and next steps.",
    build: () => doc("Quarterly report", [
      h(1, "Quarterly Sales Report"),
      p("*July to September 2026 · Prepared by the Sales Team*"),
      h(2, "Summary"),
      p("Sales grew in all three regions this quarter. Online orders now make up a quarter of all sales. The main challenge was late deliveries in August because of rain.", { align: "justify" }),
      h(2, "Findings"),
      table([["Region", "Sales (PKR)", "Change"], ["Lahore", "4,200,000", "+12%"], ["Karachi", "5,100,000", "+8%"], ["Islamabad", "2,300,000", "+15%"]]),
      p("Key points:"),
      ...ul(["Islamabad grew fastest after the new shop opened.", "Repeat customers bought 20% more than last quarter.", "Delivery complaints doubled in August."], "number"),
      h(2, "Next steps"),
      ...checks([["Hire two more delivery riders in Karachi", false], ["Start a loyalty offer for repeat customers", false], ["Review the August delivery complaints", true]]),
      h(2, "Conclusion"),
      p("The quarter was strong. If deliveries improve, we expect sales to grow by another 10% next quarter."),
    ], { page: { header: "Quarterly Sales Report", footer: "Internal", pageNumbers: true } }),
  },
  {
    id: "meeting-notes", name: "Meeting notes", desc: "Who came, what was discussed, who does what.",
    build: () => doc("Meeting notes", [
      h(1, "Team meeting notes"),
      table([["Date", "Time", "Place"], ["10 November 2026", "10:00 am", "Meeting room 2"]]),
      p("**Present:** Sara, Bilal, Hina, Usman"),
      p("**Absent:** Kamran"),
      h(2, "Agenda"),
      ...ul(["Sales numbers for October", "New price list", "Holiday schedule"], "number"),
      h(2, "Discussion"),
      ...ul(["October sales were 6% above target.", "The new price list starts on 1 December.", ["Shops need the new price tags by 25 November."], "Office closes from 25 to 27 December."]),
      h(2, "Action items"),
      ...checks([["Bilal: print new price tags", false], ["Hina: share the holiday schedule", false], ["Sara: send the October report", true]]),
      h(2, "Next meeting"),
      p("17 November 2026 at 10:00 am"),
    ]),
  },
  {
    id: "invoice", name: "Invoice", desc: "Items, totals and payment details in PKR.",
    build: () => doc("Invoice", [
      h(1, "Invoice"),
      p("**Invoice no:** INV-2026-041 · **Date:** 10 November 2026 · **Due:** 25 November 2026"),
      p("**From:** Sunrise Traders, 45 Main Boulevard, Gulberg, Lahore"),
      p("**Bill to:** Hassan Electronics, Saddar, Rawalpindi"),
      table([["Item", "Qty", "Rate (PKR)", "Amount (PKR)"], ["Printed boxes", "500", "120", "60,000"], ["Packing tape", "40", "250", "10,000"], ["Delivery", "1", "3,500", "3,500"], ["", "", "**Total**", "**73,500**"]]),
      p("**Payment:** Bank transfer to Sunrise Traders, Account 0000-0000000-0, Example Bank."),
      p("Thank you for your business!", { align: "center" }),
    ]),
  },
  {
    id: "essay", name: "Essay", desc: "Title, introduction, body and conclusion, double spaced.",
    build: () => doc("Essay", [
      h(1, "The Value of Reading Every Day", { align: "center" }),
      p("Student name · Class 10 · 10 November 2026", { align: "center" }),
      h(2, "Introduction"),
      p("Reading is one of the simplest habits a person can build, yet it changes how we think, speak and learn. This essay explains why a few pages every day are worth the time.", { align: "justify", lineHeight: 2 }),
      h(2, "Reading builds knowledge"),
      p("Books and good articles let us learn from people we will never meet. A student who reads about history, science or other countries sees the world more widely than one who only studies for tests.", { align: "justify", lineHeight: 2 }),
      h(2, "Reading improves language"),
      p("Every page shows new words and new ways to join ideas. Over time, readers write more clearly and speak with more confidence, in English and in Urdu.", { align: "justify", lineHeight: 2 }),
      h(2, "Conclusion"),
      p("Reading every day does not need much time or money. Ten pages before sleep, week after week, slowly make us better students and better citizens.", { align: "justify", lineHeight: 2 }),
    ], { font: "serif", size: 12 }),
  },
  {
    id: "notice-bilingual", name: "Notice (English and Urdu)", desc: "A bilingual notice with a right-to-left Urdu part.",
    build: () => doc("Notice", [
      h(1, "Notice", { align: "center" }),
      p("**Office closed on Independence Day**", { align: "center" }),
      p("The office will remain closed on Friday, 14 August, for Independence Day. Work will start again on Monday at 9:00 am. For anything urgent, please call +92 300 0000000.", { align: "justify" }),
      hr(),
      h(1, "اطلاع", { align: "center", dir: "rtl" }),
      p("**یومِ آزادی پر دفتر بند رہے گا**", { align: "center", dir: "rtl" }),
      p("یومِ آزادی کے موقع پر دفتر جمعہ، 14 اگست کو بند رہے گا۔ کام پیر کے روز صبح 9 بجے دوبارہ شروع ہوگا۔ کسی ضروری کام کے لیے 0000000-0300 پر رابطہ کریں۔", { dir: "rtl", align: "right" }),
      hr(),
      p("Management / انتظامیہ", { align: "right", dir: "rtl" }),
      p("10 August 2026"),
    ]),
  },
];

/* ---------------- Designed templates (coloured header blocks, our own decorations, tables, checklists) ---------------- */
// Runs with one look: { color, size, font, b, i }.
const look = (md, st = {}) => runs(md).map((r) => ({ ...r, ...st }));
const lines2 = (...parts) => parts.flatMap((x, i) => (i ? [{ text: "\n" }, ...x] : x));
/** Big coloured header block (an h1 with background colour, padding, height and one of our decorations). */
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 150, ...band, runs: cleanRuns(lines2(...parts)) });
/** A coloured section heading. */
const bandH = (level, md, band, st = {}) => ({ type: "h" + level, pad: 10, ...band, runs: cleanRuns(look(md, st)) });
const H2 = (md, color, font) => ({ type: "h2", runs: cleanRuns(look(md, { color, ...(font ? { font } : {}) })) });
const tableX = (rows, extra = {}) => ({ ...table(rows), ...extra });
const img = (svgStr, w, align = "center") => ({ type: "image", src: svgDataUrl(svgStr), alt: "", w, align });

export const DESIGNED = [
  {
    id: "one-pager", name: "One pager", desc: "Big coloured header, overview, sign-off table and summary.",
    build: () => doc("One pager", [
      hero({ bg: "#24453a", deco: "petals", dc: "#a7e8c5", dc2: "#f3efe6", minh: 210 }, look("Northwind Studio", { color: "#f3efe6", size: 15, font: "serif" }), look("One Pager", { color: "#f3efe6", size: 46, font: "serif" })),
      bandH(2, "Overview", { bg: "#a7e8c5", deco: "diamonds", dc: "#24453a" }, { color: "#1d3a30", font: "serif" }),
      p("What is this project about? Why does it matter now, and who is it for? Answer these questions in two or three sentences so a busy reader gets the point at a glance."),
      tableX([["Approved", "Name", "Role"], ["✓", "Hina Saleem", "Project lead"], ["✓", "Omar Farooq", "Finance"], ["", "Zara Qureshi", "Design"]], { tstyle: "lines" }),
      bandH(2, "Summary", { bg: "#a7e8c5", deco: "arc", dc: "#24453a" }, { color: "#1d3a30", font: "serif" }),
      tableX([["Topic", "Notes"], ["Key information", "The three facts everyone must know before the next meeting."], ["Decisions", "What was agreed, and by whom."], ["Next steps", "Who does what, and by which date."], ["Support needed", "Budget, people or tools the team still needs."]], { tstyle: "lines" }),
      bandH(2, "Relevant resources", { bg: "#a7e8c5", deco: "steps", dc: "#24453a", dc2: "#3f6b5a" }, { color: "#1d3a30", font: "serif" }),
      ...ul(["Project brief (shared folder)", "Budget sheet, version 3", "Customer interview notes"]),
    ]),
  },
  {
    id: "strategic-plan", name: "Strategic plan", desc: "Overview, current state, PESTLE analysis, goals and timeline.",
    build: () => doc("Strategic plan", [
      hero({ bg: "#3d2a1e", deco: "circles", dc: "#c99a4b", dc2: "#7a5536", minh: 180 }, look("Strategic Plan", { color: "#f7e9cf", size: 40, font: "serif" }), look("2027 to 2029 · Riverstone Foods", { color: "#e9cf9f", size: 13 })),
      H2("Overview", "#7a5536", "serif"),
      p("This plan sets out where Riverstone Foods wants to be by the end of 2029 and the steps that will get us there. It was written with the board, shop managers and our two biggest suppliers."),
      bandH(2, "Current state", { bg: "#3d2a1e", deco: "dots", dc: "#c99a4b" }, { color: "#f7e9cf", font: "serif" }),
      p("We run 14 shops in three cities. Sales grew 9% last year, but costs grew faster, and online orders are still only 6% of sales."),
      h(3, "PESTLE analysis"),
      tableX([["Factor", "What we see", "Impact"], ["Political", "New food labelling rules from 2027", "Medium"], ["Economic", "Higher fuel and rent costs", "High"], ["Social", "More families shop online at night", "High"], ["Technological", "Cheaper delivery tracking tools", "Medium"], ["Legal", "Stricter staff safety checks", "Low"], ["Environmental", "Push to cut plastic packaging", "Medium"]], { accent: "#f1e3c8" }),
      H2("Goals", "#7a5536", "serif"),
      ...ul(["Grow online orders to 20% of sales.", "Open four new shops in fast-growing towns.", "Cut packaging waste by half."], "number"),
      H2("Timeline", "#7a5536", "serif"),
      tableX([["Year", "Focus", "Owner"], ["2027", "Online shop and delivery", "Digital team"], ["2028", "New shops", "Operations"], ["2029", "Packaging and suppliers", "Purchasing"]], { tstyle: "lines" }),
    ]),
  },
  {
    id: "sustainability-report", name: "Sustainability report", desc: "Report overview, key numbers, chart, commitments and company profile.",
    build: () => doc("Sustainability report", [
      hero({ bg: "#0f766e", deco: "leaves", dc: "#99f6e4", dc2: "#ccfbf1", minh: 170 }, look("SUSTAINABILITY", { color: "#ecfeff", size: 30 }), look("REPORT", { color: "#ecfeff", size: 30 }), look("2026 · Greenline Textiles", { color: "#ccfbf1", size: 12 })),
      H2("Report overview", "#0f766e"),
      p("This report shows how Greenline Textiles used energy, water and materials in 2026, what changed since 2025 and what we promise to do next. The numbers come from our own meters and supplier invoices."),
      H2("Key numbers", "#0f766e"),
      tableX([["Measure", "2025", "2026", "Change"], ["Electricity (MWh)", "4,800", "4,150", "-14%"], ["Water (million litres)", "62", "51", "-18%"], ["Recycled cotton", "12%", "21%", "+9 points"], ["Waste to landfill (tonnes)", "310", "240", "-23%"]], { accent: "#ccfbf1" }),
      img(CHARTS.bars.svg("#0f766e"), 420),
      H2("Our commitments", "#0f766e"),
      ...checks([["Solar panels on both factory roofs", true], ["Half of all cotton recycled or organic by 2028", false], ["Rain water used for dyeing", false]]),
      bandH(2, "Company profile", { bg: "#ccfbf1", deco: "sun", dc: "#0f766e", dc2: "#14b8a6" }, { color: "#0f766e" }),
      p("Greenline Textiles makes cotton fabric for clothing brands. We employ 620 people in Faisalabad and sell to 18 countries."),
    ]),
  },
  {
    id: "project-proposal", name: "Project proposal", desc: "Background, objectives checklist, timeline and budget tables, approval.",
    build: () => doc("Project proposal", [
      hero({ bg: "#4c1d95", deco: "waves", dc: "#c4b5fd", dc2: "#f0abfc", minh: 170 }, look("Project Proposal", { color: "#ffffff", size: 38 }), look("Community reading corners · For the City Library Board", { color: "#ddd6fe", size: 12 })),
      bandH(2, "1. Background", { bg: "#ede9fe", deco: "diamonds", dc: "#7c3aed" }, { color: "#4c1d95" }),
      p("Many children in our city have no library within walking distance. We propose small reading corners in six community centres, each with 300 books, two volunteers and a weekly story hour."),
      bandH(2, "2. Objectives", { bg: "#ede9fe", deco: "diamonds", dc: "#7c3aed" }, { color: "#4c1d95" }),
      ...checks([["Open six reading corners by June", false], ["Train 12 volunteers", false], ["Reach 1,500 children in the first year", false]]),
      bandH(2, "3. Timeline", { bg: "#ede9fe", deco: "diamonds", dc: "#7c3aed" }, { color: "#4c1d95" }),
      tableX([["Month", "Work", "Done by"], ["January", "Choose centres and sign agreements", "Project lead"], ["February to March", "Buy books and shelves", "Purchasing"], ["April", "Train volunteers", "Library staff"], ["May to June", "Open the corners", "Everyone"]], { accent: "#ede9fe" }),
      bandH(2, "4. Budget", { bg: "#ede9fe", deco: "diamonds", dc: "#7c3aed" }, { color: "#4c1d95" }),
      tableX([["Item", "Cost (PKR)"], ["Books (1,800)", "1,440,000"], ["Shelves and seating", "540,000"], ["Volunteer training", "120,000"], ["**Total**", "**2,100,000**"]], { accent: "#ede9fe" }),
      H2("5. Approval", "#4c1d95"),
      tableX([["Name", "Role", "Signature"], ["", "Board chair", ""], ["", "Head librarian", ""]], { tstyle: "lines" }),
    ]),
  },
  {
    id: "newsletter", name: "Newsletter", desc: "Bright header, news stories, calendar table and thank-yous.",
    build: () => doc("Newsletter", [
      hero({ bg: "#ff7a59", deco: "circles", dc: "#ffd166", dc2: "#fff1e6", minh: 170 }, look("The Monthly Bulletin", { color: "#ffffff", size: 36, font: "serif" }), look("Issue 14 · November 2026 · Hilltop School Parents' Circle", { color: "#fff1e6", size: 12 })),
      H2("In this issue", "#c2410c"),
      ...ul(["Our new science lab opens", "Dates for your calendar", "Thank you, volunteers"]),
      bandH(2, "Big news: the science lab is open", { bg: "#fff1e6", deco: "confetti", dc: "#ff7a59", dc2: "#2f80ff" }, { color: "#9a3412" }),
      p("After a year of fundraising, the new science lab opened on 3 November. It has 32 seats, safe gas taps and a weather station on the roof. Classes 6 to 8 will use it every week."),
      bandH(2, "Dates for your calendar", { bg: "#fff1e6", deco: "dots", dc: "#ff7a59" }, { color: "#9a3412" }),
      tableX([["Date", "Event", "Where"], ["14 November", "Parent-teacher meeting", "Main hall"], ["22 November", "Science fair", "New lab"], ["5 December", "Winter concert", "Sports ground"]], { accent: "#ffe4d6" }),
      H2("Thank you, volunteers", "#c2410c"),
      p("Forty parents painted, carried and cleaned to get the lab ready. Thank you for giving up your weekends."),
    ]),
  },
  {
    id: "annual-report", name: "Annual report", desc: "Director's note, highlights, chart, financial summary and plans.",
    build: () => doc("Annual report", [
      hero({ bg: "#1e3a8a", deco: "steps", dc: "#60a5fa", dc2: "#93c5fd", minh: 170 }, look("Annual Report 2026", { color: "#ffffff", size: 36 }), look("Sunrise Microfinance", { color: "#bfdbfe", size: 14 })),
      H2("A word from our director", "#1e3a8a"),
      { type: "quote", runs: runs("This year we lent to more women-led shops than ever before, and 97% of loans were paid back on time. Thank you to every borrower, partner and member of staff.") },
      bandH(2, "Highlights", { bg: "#dbeafe", deco: "dots", dc: "#1e3a8a" }, { color: "#1e3a8a" }),
      tableX([["Measure", "2025", "2026"], ["Active borrowers", "18,200", "23,900"], ["Loans given (PKR million)", "640", "910"], ["Paid back on time", "95%", "97%"]], { accent: "#dbeafe" }),
      img(CHARTS.line.svg("#1e3a8a"), 420),
      H2("Financial summary", "#1e3a8a"),
      tableX([["", "PKR million"], ["Income", "182"], ["Costs", "149"], ["Surplus", "33"]], { tstyle: "lines" }),
      H2("Looking ahead", "#1e3a8a"),
      ...ul(["Open branches in two more districts.", "Launch loans by mobile phone.", "Train 2,000 borrowers in bookkeeping."]),
    ]),
  },
  {
    id: "case-study", name: "Case study", desc: "Client, challenge, solution steps, results table and a quote.",
    build: () => doc("Case study", [
      hero({ bg: "#111827", deco: "petals", dc: "#34d399", dc2: "#6ee7b7", minh: 170 }, look("Case Study", { color: "#ffffff", size: 40 }), look("How Kite Couriers cut delivery time by 30%", { color: "#a7f3d0", size: 13 })),
      H2("The client", "#047857"),
      p("Kite Couriers delivers parcels for 400 online shops in Lahore with a team of 85 riders."),
      H2("The challenge", "#047857"),
      p("Riders planned their own routes on paper. Parcels often went out late and customers called the office many times a day to ask where they were."),
      H2("Our solution", "#047857"),
      ...ul(["Mapped every rider's daily stops in one shared sheet.", "Grouped parcels by area before 9 am.", "Sent customers a message with a time window."], "number"),
      bandH(2, "Results", { bg: "#d1fae5", deco: "steps", dc: "#047857", dc2: "#34d399" }, { color: "#065f46" }),
      tableX([["Measure", "Before", "After"], ["Average delivery time", "26 hours", "18 hours"], ["Calls to the office per day", "140", "45"], ["Parcels per rider per day", "38", "47"]], { accent: "#d1fae5" }),
      { type: "quote", runs: runs("“Our riders finish earlier and our phones are finally quiet.” Operations manager, Kite Couriers") },
    ]),
  },
  {
    id: "product-brief", name: "Product brief", desc: "Problem, users, goals checklist, feature table and launch plan.",
    build: () => doc("Product brief", [
      hero({ bg: "#5b4cf0", deco: "dots", dc: "#c7d2fe", minh: 160 }, look("Product Brief", { color: "#ffffff", size: 38 }), look("Pocket budget planner · Version 1", { color: "#e0e7ff", size: 13 })),
      H2("Problem", "#4338ca"),
      p("Young earners want to save but lose track of small daily spending. Bank apps show what already happened, not what is left for the week."),
      H2("Who it is for", "#4338ca"),
      ...ul(["Students with a part-time job", "First-job earners living on a monthly salary", "Families planning a big purchase"]),
      bandH(2, "Goals", { bg: "#e0e7ff", deco: "diamonds", dc: "#5b4cf0" }, { color: "#3730a3" }),
      ...checks([["Set a weekly limit in under one minute", false], ["Add a purchase in two taps", false], ["Works offline", false]]),
      bandH(2, "Features", { bg: "#e0e7ff", deco: "diamonds", dc: "#5b4cf0" }, { color: "#3730a3" }),
      tableX([["Feature", "Why", "Priority"], ["Weekly envelope", "Shows money left at a glance", "Must have"], ["Quick add", "Logging must be faster than forgetting", "Must have"], ["Savings goals", "Keeps people motivated", "Should have"], ["Shared budgets", "Families plan together", "Later"]], { accent: "#e0e7ff" }),
      H2("Launch plan", "#4338ca"),
      p("Private test with 200 users in January, public launch in March."),
    ]),
  },
  {
    id: "resume", name: "Resume", desc: "Header with an illustrated avatar, profile, experience table and skills.",
    build: () => doc("Resume", [
      hero({ bg: "#12355b", deco: "avatar", dc: "#2f80ff", dc2: "#9cc3ff", minh: 140, pad: 22 }, look("Sana Malik", { color: "#ffffff", size: 30 }), look("Product Designer · Karachi", { color: "#cfe3ff", size: 13 })),
      p("sana.malik@example.com · +92 300 0000000 · portfolio.example.com"),
      H2("Profile", "#12355b"),
      p("Product designer with six years of experience making banking and shopping apps simpler. I turn research into clear screens and work closely with engineers until the work ships."),
      H2("Experience", "#12355b"),
      tableX([["Years", "Role", "What I did"], ["2023 to now", "Senior Product Designer, Blue Pine Apps", "Led design of a payments app used by 400,000 people; cut sign-up time in half."], ["2020 to 2023", "Product Designer, Bazaar Box", "Designed the checkout and returns flows; ran 30 user interviews a year."], ["2019 to 2020", "Junior Designer, Pixel Yard", "Made marketing pages and icons for small businesses."]], { tstyle: "lines" }),
      H2("Education", "#12355b"),
      tableX([["Year", "Degree"], ["2019", "BS Interaction Design, Indus Valley School (example)"]], { tstyle: "lines" }),
      H2("Skills", "#12355b"),
      ...ul(["User research and testing", "Wireframes and prototypes", "Design systems", "Workshops with product teams"]),
    ]),
  },
  {
    id: "thank-you-letter", name: "Thank-you letter", desc: "A warm letter with a soft floral header.",
    build: () => doc("Thank-you letter", [
      hero({ bg: "#fdf2f8", deco: "flower", dc: "#f9a8d4", dc2: "#fbbf24", minh: 130 }, look("Thank You", { color: "#9d174d", size: 42, font: "serif", i: true })),
      p("Dear Mariam,"),
      p("Thank you so much for helping us move into our new home last weekend. You arrived early, carried boxes up three floors and still found time to make tea for everyone.", { align: "justify" }),
      p("The bookshelf you put together is now the favourite corner of the house. Every time we sit there, we think of your kindness.", { align: "justify" }),
      p("Please come for dinner soon, so we can thank you properly.", { align: "justify" }),
      p(""), p("With gratitude,"), p("**Bilal and family**"),
    ]),
  },
  {
    id: "team-meeting", name: "Meeting notes", desc: "Attendees, agenda, decisions and an action-item checklist.",
    build: () => doc("Meeting notes", [
      hero({ bg: "#fff7ed", deco: "confetti", dc: "#fb923c", dc2: "#2f80ff", minh: 110, pad: 20 }, look("Weekly team meeting", { color: "#9a3412", size: 30 }), look("Tuesday 10 November 2026 · Room 2 and online", { color: "#c2410c", size: 12 })),
      tableX([["Attendees", "Absent", "Note taker"], ["Hina, Omar, Zara, Ali", "Saad", "Zara"]], { tstyle: "lines" }),
      H2("Agenda", "#c2410c"),
      ...ul(["Last week's numbers", "Website launch date", "Hiring for the support team"], "number"),
      H2("Decisions", "#c2410c"),
      ...ul(["The website goes live on 1 December.", "We hire two support staff in January."]),
      bandH(2, "Action items", { bg: "#fff7ed", deco: "dots", dc: "#fb923c" }, { color: "#9a3412" }),
      ...checks([["Hina: final website text by Friday", false], ["Omar: job advert ready by 20 November", false], ["Zara: share these notes with the team", true]]),
    ]),
  },
  {
    id: "modern-cover-letter", name: "Modern cover letter", desc: "Dark name header, then a short, clear letter.",
    build: () => doc("Cover letter", [
      hero({ bg: "#0f172a", deco: "arc", dc: "#f59e0b", minh: 110, pad: 22 }, look("Daniyal Ahmed", { color: "#ffffff", size: 30 }), look("Data Analyst · daniyal.ahmed@example.com · +92 321 0000000", { color: "#fcd34d", size: 11 })),
      p("11 November 2026"), p(""),
      p("Hiring Team"), p("Cedar Health Labs"), p("Islamabad"), p(""),
      p("Dear Hiring Team,"),
      p("I am writing to apply for the **Data Analyst** role. For three years I have turned messy hospital data into simple weekly reports that doctors actually read.", { align: "justify" }),
      p("At my current job I built a dashboard that showed which clinics had the longest waiting times. Within six months, average waits fell from 48 to 31 minutes.", { align: "justify" }),
      p("I would love to bring the same care for clear numbers to Cedar Health Labs. Thank you for reading my letter.", { align: "justify" }),
      p(""), p("Kind regards,"), p("**Daniyal Ahmed**"),
    ]),
  },
  {
    id: "lesson-plan", name: "Lesson plan", desc: "Objectives checklist, materials, timed steps table and homework.",
    build: () => doc("Lesson plan", [
      hero({ bg: "#fef3c7", deco: "sun", dc: "#f59e0b", dc2: "#fb923c", minh: 130 }, look("Lesson Plan", { color: "#92400e", size: 36 }), look("Science · Grade 5 · The water cycle", { color: "#b45309", size: 13 })),
      tableX([["Teacher", "Date", "Length"], ["Ms. Rabia", "18 November 2026", "45 minutes"]], { tstyle: "lines" }),
      H2("Learning objectives", "#b45309"),
      ...checks([["Name the four stages of the water cycle", false], ["Explain why clouds form", false], ["Draw and label the cycle", false]]),
      H2("Materials", "#b45309"),
      ...ul(["A clear bowl, cling film, ice cubes and warm water", "Poster paper and colour pencils", "Worksheet 7"]),
      bandH(2, "Lesson steps", { bg: "#fde68a", deco: "steps", dc: "#b45309", dc2: "#f59e0b" }, { color: "#78350f" }),
      tableX([["Time", "Activity", "Notes"], ["5 min", "Question: where does rain come from?", "Write answers on the board"], ["15 min", "Bowl experiment in groups", "Watch drops form under the film"], ["15 min", "Draw the cycle", "Use the four stage names"], ["10 min", "Share and quick quiz", "Three questions"]], { accent: "#fef3c7" }),
      H2("Assessment", "#b45309"),
      p("Each child labels the cycle correctly and explains one stage in their own words."),
      H2("Homework", "#b45309"),
      p("Find one place at home where you can see water evaporate. Draw it."),
    ]),
  },
];

for (const t of [...DESIGNED, ...TEMPLATES]) t.build = skinned(t.id, t.build);
export const ALL_TEMPLATES = [...DESIGNED, ...TEMPLATES];
/** Any template: the hand-made ones above, or a generated "layout~palette~theme" id from gallery.js. */
export function templateById(id) {
  const t = ALL_TEMPLATES.find((x) => x.id === id);
  if (t) return t;
  const mw = MAGIC_WRITE.find((x) => x.id === id);
  if (mw) {
    const P = PALETTES.find((x) => x.id === mw.palette) || PALETTES[0];
    return { id, name: mw.name, desc: "", build: skinned(id, () => doc(mw.name, [
      { type: "h1", pad: 22, minh: 110, bg: P.light, deco: "confetti", dc: P.dark, dc2: P.mid, runs: cleanRuns([{ text: mw.name, color: P.ink, size: 30 }, { text: "\n" }, { text: "Magic Write starter", color: P.dark, size: 12 }]) },
      h(2, "What to write"),
      p(`Write ${mw.prompt} …`),
      p("Finish the line above with your topic, then open ✦ Magic Write and choose **Write it** (or select any text and use Rewrite, Shorten or Fix grammar)."),
      h(2, "Draft"),
      p("Your draft appears here. Edit it like any other text: headings, lists, colours and more."),
    ])) };
  }
  const g = parseId(id);
  if (!g || !LAYOUT_BUILDERS[g.layout]) return null;
  const meta = templateMeta(id);
  return { id, name: meta?.name || id, desc: "", build: skinned(id, () => LAYOUT_BUILDERS[g.layout](g.P, g.T)) };
}
