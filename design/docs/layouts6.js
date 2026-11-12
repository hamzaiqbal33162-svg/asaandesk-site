// AsaanDesk Docs: a sixth set of hand-designed base layouts (conference agenda, launch plan, class timetable, shopping list,
// letter to parents with reply slip, performance review, project charter, lab report, personal budget, short story,
// meeting agenda, volunteer handbook). Own text and artwork; P = palette, T = content theme.
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { CHARTS, LINES, svgDataUrl } from "./decos.js";

const runs = (md) => cleanRuns(mdInline(md));
const look = (md, st = {}) => runs(md).map((r) => ({ ...r, ...st }));
const lines2 = (...parts) => parts.flatMap((x, i) => (i ? [{ text: "\n" }, ...x] : x));
const p = (md = "", props = {}) => ({ type: "p", runs: runs(md), ...props });
const li = (md, list = "bullet", props = {}) => ({ type: "li", list, level: 0, runs: runs(md), ...props });
const ul = (items, list = "bullet") => items.map((x) => li(x, list));
const checks = (items) => items.map(([md, done]) => li(md, "check", { checked: !!done }));
const table = (rows, extra = {}) => ({ type: "table", header: true, rows: rows.map((r) => r.map((c) => (Array.isArray(c) ? { runs: cleanRuns(c) } : { runs: runs(String(c)) }))), ...extra });
const quote = (md) => ({ type: "quote", runs: runs(md) });
const hr = () => ({ type: "hr" });
const img = (svg, w) => ({ type: "image", src: svgDataUrl(svg), alt: "", w, align: "center" });
const doc = (title, blocks) => normalizeDoc({ ...newDoc(title), blocks });
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 130, ...band, runs: cleanRuns(lines2(...parts)) });
const F = (P) => (P.font ? { font: P.font } : {});
const H = (P, level, text, extra = {}) => ({ type: "h" + level, runs: cleanRuns(look(text, { color: P.dark, ...F(P) })), ...extra });
const band = (P, text, deco, dark = false, level = 2) => ({ type: "h" + level, pad: 10, bg: dark ? P.dark : P.light, deco, dc: dark ? P.light : P.dark, dc2: dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: dark ? P.cream : P.ink, ...F(P) })) });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const M = (T, i) => T.metrics[i];

export const LAYOUT_BUILDERS_6 = {
  "conference-agenda": (P, T) => doc("Conference agenda", [
    hero({ bg: P.dark, deco: "waves", dc: P.light, dc2: P.mid, minh: 140 }, look(`${T.short} Summit 2027`, { color: P.cream, size: 32, ...F(P) }), look(`One day · two rooms · ${T.city}`, { color: P.light, size: 12 })),
    table([["Time", "Room A · Main hall", "Room B · Workshop room"], ["09:00", "Welcome and keynote", "—"], ["10:30", `Panel: the future of ${T.offer}`, "Hands-on: planning tools"], ["12:00", "Lunch", "Lunch"], ["13:30", "Customer stories", "Hands-on: writing clear guides"], ["15:30", "Closing words", "—"]], { accent: P.light }),
    band(P, "Speakers", "dots"), ...ul([`${T.person}, ${T.role}`, `${T.person2}, guest speaker`, `${T.person3}, workshop lead`]),
    p("Wi-Fi and slides: ask at the welcome desk."),
  ]),
  "launch-plan": (P, T) => doc("Launch plan", [
    hero({ bg: P.light, deco: "steps", dc: P.dark, dc2: P.mid, minh: 120 }, look("Launch Plan", { color: P.ink, size: 32, ...F(P) }), look(cap(T.product), { color: P.dark, size: 12 })),
    band(P, "Before launch · weeks 1 to 4", "dots", true), ...checks([["Final testing with 20 users", false], ["Launch page ready", false], ["Team trained", false]]),
    band(P, "Launch week", "dots", true), ...checks([[`Announce to ${T.audience}`, false], ["Social posts every day", false], ["Answer every question within 2 hours", false]]),
    band(P, "After launch · weeks 6 to 10", "dots", true), ...checks([["Collect feedback", false], ["Fix the top 3 issues", false]]),
    table([["Measure", "Goal"], ["Sign-ups in month one", "1,000"], [M(T, 2)[0], M(T, 2)[2]]], { tstyle: "lines" }),
  ]),
  timetable: (P, T) => doc("Class timetable", [
    band(P, `Class timetable · ${T.org}`, "sun", false, 1),
    table([["Time", "Mon", "Tue", "Wed", "Thu", "Fri"], ["8:00", "Maths", "English", "Maths", "Science", "English"], ["9:00", "English", "Maths", "Art", "Maths", "Science"], ["10:00", "Break", "Break", "Break", "Break", "Break"], ["10:30", "Science", "History", "English", "Sports", "Maths"], ["11:30", "Languages", "Computers", "Science", "English", "Assembly"]], { accent: P.light }),
    H(P, 3, "Bring on these days"), ...ul(["Monday: library book", "Thursday: sports kit", "Friday: homework diary"]),
    p(`Class teacher: ${T.person} · ${T.email}`),
  ]),
  "shopping-list": (P, T) => doc("Shopping list", [
    hero({ bg: P.light, deco: "leaves", dc: P.dark, dc2: P.mid, minh: 100, pad: 20 }, look("Shopping List", { color: P.ink, size: 30, ...F(P) }), look("This week", { color: P.dark, size: 12 })),
    table([["Fruit and vegetables", "Dairy and bakery"], [[{ text: "▢ Bananas\n▢ Tomatoes\n▢ Spinach\n▢ Lemons" }], [{ text: "▢ Milk\n▢ Yogurt\n▢ Eggs\n▢ Bread" }]]], { accent: P.light }),
    table([["Pantry", "Home"], [[{ text: "▢ Rice\n▢ Lentils\n▢ Tea\n▢ Cooking oil" }], [{ text: "▢ Soap\n▢ Dish liquid\n▢ Tissues" }]]], { accent: P.light }),
    H(P, 3, "Budget"), p("PKR 9,000 · Keep receipts in the envelope."),
    H(P, 3, "Don't forget"), ...checks([["Reusable bags", false]]),
  ]),
  "parent-letter": (P, T) => doc("Letter to parents", [
    { type: "h2", align: "center", pad: 12, bg: P.light, runs: cleanRuns(lines2(look(T.org, { color: P.ink, ...F(P) }), look(`${T.city} · ${T.email}`, { color: P.dark, size: 10 }))) },
    p("12 November 2026", { align: "right" }),
    p("Dear parents and guardians,"),
    p(`Our class will visit the ${T.partner} on **Friday 28 November** as part of our lesson on ${T.lesson.toLowerCase()}. We leave at 9:00 and return by 13:00.`, { align: "justify" }),
    p("Please send a packed lunch, a water bottle and comfortable shoes. Return the slip below by Monday.", { align: "justify" }),
    p("Kind regards,"), p(`**${T.person}**`),
    img(LINES.dashed.svg("#94a3b8"), 600),
    H(P, 3, "Reply slip ✂"), table([["Child's name", "Class", "May join the trip? (yes / no)", "Parent's signature"], ["", "", "", ""]], { tstyle: "lines" }),
  ]),
  "performance-review": (P, T) => doc("Performance review", [
    band(P, "PERFORMANCE REVIEW", "diamonds", true, 1),
    table([["Employee", "Role", "Reviewer", "Period"], [T.person3, "Team member", T.person, "Jan to Dec 2026"]], { tstyle: "lines" }),
    H(P, 2, "Ratings"), table([["Area", "Rating", "Comment"], ["Quality of work", "★★★★☆", "Careful and thorough"], ["Teamwork", "★★★★★", "Always helps others"], ["Communication", "★★★☆☆", "Share updates earlier"]], { accent: P.light }),
    H(P, 2, "Goals for next year"), ...checks([[`Lead one part of the ${T.project}`, false], ["Present at a team meeting each quarter", false]]),
    quote(`“A reliable, kind colleague who makes the team better.” ${T.person}`),
    table([["Employee signature", "Reviewer signature", "Date"], ["", "", ""]], { tstyle: "lines" }),
  ]),
  "project-charter": (P, T) => doc("Project charter", [
    hero({ bg: P.dark, deco: "arc", dc: P.light, minh: 120 }, look("Project Charter", { color: P.cream, size: 32, ...F(P) }), look(cap(T.project), { color: P.light, size: 12 })),
    H(P, 2, "Purpose"), p(`Give ${T.audience} in ${T.city} a better way to get ${T.offer}.`),
    table([["In scope", "Out of scope"], [[{ text: `• ${cap(T.project)}\n• Staff training\n• Launch event` }], [{ text: "• New building\n• Paid advertising\n• Other cities" }]]], { accent: P.light }),
    H(P, 2, "Stakeholders"), table([["Who", "Role", "Needs"], [T.person, "Sponsor", "Monthly update"], [T.person2, "Project lead", "Weekly check-in"], [cap(T.audience), "Users", "Clear information"]], { tstyle: "lines" }),
    H(P, 2, "Risks"), ...ul(["Supplier delays", "Staff time during the busy season"]),
    table([["Approved by", "Date"], [T.person, ""]], { tstyle: "lines" }),
  ]),
  "lab-report": (P, T) => doc("Lab report", [
    band(P, "LAB REPORT · How fast does ice melt?", "circles", true, 1),
    table([["Student", "Class", "Date"], [T.person3, "Grade 8", "12 November 2026"]], { tstyle: "lines" }),
    H(P, 2, "Aim"), p("To find out how temperature changes how fast ice melts."),
    H(P, 2, "Hypothesis"), p("Ice melts faster in warmer water."),
    H(P, 2, "Method"), ...ul(["Fill three cups with 200 ml of water at 10, 25 and 40 °C.", "Drop one ice cube in each cup.", "Time how long each cube takes to melt."], "number"),
    H(P, 2, "Results"), table([["Water temperature", "Time to melt"], ["10 °C", "9 min 40 s"], ["25 °C", "5 min 10 s"], ["40 °C", "2 min 55 s"]], { accent: P.light }),
    img(CHARTS.line.svg(P.dark), 400),
    H(P, 2, "Conclusion"), p("The hypothesis was right: the warmer the water, the faster the ice melted."),
  ]),
  "personal-budget": (P, T) => doc("Personal budget", [
    hero({ bg: P.light, deco: "dots", dc: P.dark, minh: 110, pad: 20 }, look("Monthly Budget", { color: P.ink, size: 30, ...F(P) }), look(`November · ${T.person}`, { color: P.dark, size: 12 })),
    table([["Income", "PKR"], ["Salary", "120,000"], ["Side work", "15,000"], ["**Total**", "**135,000**"]], { accent: P.light }),
    table([["Spending", "Plan", "Actual"], ["Rent", "45,000", "45,000"], ["Food", "30,000", "33,500"], ["Transport", "12,000", "10,800"], ["Savings", "25,000", "25,000"], ["Fun", "8,000", "6,200"]], { tstyle: "lines" }),
    band(P, "Savings goal: PKR 300,000 by June", "steps"),
    p("Saved so far: **PKR 150,000** (50%)."),
    H(P, 3, "Next month"), ...checks([["Cook at home four nights a week", false], ["Cancel one unused subscription", false]]),
  ]),
  "short-story": (P, T) => doc("Short story", [
    { type: "h1", align: "center", runs: cleanRuns(look("The Lantern Keeper", { color: P.ink, size: 32, font: "serif" })) },
    p(`*A short story by ${T.person3}*`, { align: "center" }),
    img(LINES.diamonds.svg(P.mid), 420),
    H(P, 3, "One", { align: "center" }),
    p("Every evening, when the market closed, old Rahim climbed the hill to light the lantern above the town. Nobody had asked him to. He simply did.", { align: "justify", lineHeight: 1.7 }),
    p("One night the lantern would not light. Rahim sat beside it in the dark and waited, and one by one, the townspeople came up the hill with their own small lights.", { align: "justify", lineHeight: 1.7 }),
    H(P, 3, "Two", { align: "center" }),
    p("From then on, the hill was never dark again.", { align: "justify", lineHeight: 1.7 }),
  ]),
  "meeting-agenda": (P, T) => doc("Meeting agenda", [
    hero({ bg: P.dark, deco: "dots", dc: P.light, minh: 110, pad: 22 }, look("Meeting Agenda", { color: P.cream, size: 30, ...F(P) }), look(`${T.org} · Thursday 20 November, 10:00 · Room 2`, { color: P.light, size: 12 })),
    p("**Purpose:** agree the plan for the next quarter."),
    table([["#", "Topic", "Lead", "Time"], ["1", "Welcome and updates", T.person, "5 min"], ["2", `${cap(T.project)}: options`, T.person2, "20 min"], ["3", "Budget", T.person3, "15 min"], ["4", "Next steps and owners", T.person, "10 min"]], { accent: P.light }),
    H(P, 3, "Please read before the meeting"), ...ul(["Last quarter's report", "The options paper"]),
    p("Can't come? Send questions to the lead by Wednesday."),
  ]),
  "volunteer-handbook": (P, T) => doc("Volunteer handbook", [
    { type: "h1", pad: 30, minh: 200, bg: P.dark, deco: "flower", dc: P.light, dc2: P.mid, runs: cleanRuns(lines2(look("Volunteer Handbook", { color: P.cream, size: 32, ...F(P) }), look(`Thank you for joining ${T.org}`, { color: P.light, size: 13 }))) },
    H(P, 2, "Welcome"), p(`Volunteers make our work possible. This handbook explains what to expect and who to ask.`),
    band(P, "Your first day", "leaves"), ...checks([["Sign in at the front desk", false], ["Meet your team leader", false], ["Safety walk-through", false]]),
    band(P, "Our promises to you", "leaves"), ...ul(["Clear tasks and training", "Flexible hours", "A thank-you certificate after 20 hours"]),
    band(P, "Your promises to us", "leaves"), ...ul(["Be on time or tell us early", "Treat everyone with respect", "Keep personal details private"]),
    p(`Questions? ${T.person} · ${T.email}`),
  ]),
};
