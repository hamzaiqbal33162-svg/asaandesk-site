// AsaanDesk Docs: a fourth set of hand-designed base layouts (magazine article, incident report, fact sheet, speech, wedding
// programme, report card, creative brief, product requirements, retrospective, project board, interview notes, city guide,
// glossary, white paper, statement of work, daily stand-up). Own text and artwork; P = palette, T = content theme.
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
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 140, ...band, runs: cleanRuns(lines2(...parts)) });
const F = (P) => (P.font ? { font: P.font } : {});
const H = (P, level, text, extra = {}) => ({ type: "h" + level, runs: cleanRuns(look(text, { color: P.dark, ...F(P) })), ...extra });
const band = (P, text, deco, dark = false, level = 2) => ({ type: "h" + level, pad: 10, bg: dark ? P.dark : P.light, deco, dc: dark ? P.light : P.dark, dc2: dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: dark ? P.cream : P.ink, ...F(P) })) });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const M = (T, i) => T.metrics[i];
const cell = (P, title, body) => [{ text: title, b: true, color: P.dark }, { text: "\n" + body }];
const big = (P, n, label) => [{ text: n, b: true, size: 26, color: P.dark }, { text: "\n" + label, color: "#475569" }];
// Own illustration: hills, sun and a path (a "photo" spot that is ours, not a stock photo).
const scene = (P) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 220"><rect width="480" height="220" rx="12" fill="${P.light}"/><circle cx="380" cy="64" r="30" fill="${P.mid}"/><path d="M0 170 Q90 90 180 150 T360 130 T480 150 V220 H0 Z" fill="${P.dark}" opacity=".85"/><path d="M0 190 Q120 140 240 180 T480 170 V220 H0 Z" fill="${P.mid}" opacity=".7"/><path d="M220 220 C230 190 260 180 250 160" fill="none" stroke="${P.cream}" stroke-width="6" stroke-linecap="round"/></svg>`;

export const LAYOUT_BUILDERS_4 = {
  "magazine-article": (P, T) => doc("Feature article", [
    band(P, "FEATURE · " + T.label.toUpperCase(), "dots", true, 3),
    { type: "h1", runs: cleanRuns(look(`How ${T.short} is changing ${T.offer}`, { color: P.ink, size: 30, font: "serif" })) },
    p(`*By ${T.person3} · Photos by our team · 6 minute read*`),
    p(`When ${T.person} took over at ${T.org}, ${M(T, 0)[0].toLowerCase()} was ${M(T, 0)[1]}. Two years later it is ${M(T, 0)[2]}, and people across ${T.city} want to know how.`, { lineHeight: 1.6 }),
    img(scene(P), 460),
    p(`The answer is not a big budget. It is a list of small habits: listening to ${T.audience}, writing things down and trying one change at a time.`, { align: "justify", lineHeight: 1.6 }),
    band(P, `“We stopped guessing and started asking.” ${T.person}`, "arc", false, 3),
    p(`Next on the list is the ${T.project}, planned for the spring. ${T.tagline}.`, { align: "justify", lineHeight: 1.6 }),
  ]),
  "incident-report": (P, T) => doc("Incident report", [
    band(P, "INCIDENT REPORT", "dots", true, 1),
    table([["Date and time", "Location", "Reported by", "Severity"], ["12 Nov 2026, 14:20", `${T.short}, ${T.city}`, T.person3, "Medium"]], { accent: P.light }),
    H(P, 2, "What happened"), p(`A customer slipped near the entrance after rain. They were helped at once and did not need hospital care.`, { align: "justify" }),
    H(P, 2, "Timeline"), table([["Time", "Event"], ["14:20", "Customer slips near the door"], ["14:22", "First aid given"], ["14:40", "Area dried and sign placed"], ["15:00", "Manager informed"]], { tstyle: "lines" }),
    H(P, 2, "Actions"), ...checks([["Add a non-slip mat at the door", true], ["Check the floor every hour when it rains", false], ["Retrain staff on first aid", false]]),
    table([["Reviewed by", "Date", "Signature"], [T.person, "13 Nov 2026", ""]], { tstyle: "lines" }),
  ]),
  "fact-sheet": (P, T) => doc(`${T.short} fact sheet`, [
    hero({ bg: P.light, deco: "dots", dc: P.dark, dc2: P.mid, minh: 110 }, look(`${T.org} at a glance`, { color: P.ink, size: 28, ...F(P) }), look("Fact sheet · 2026", { color: P.dark, size: 12 })),
    table([[big(P, M(T, 0)[2], M(T, 0)[0]), big(P, M(T, 1)[2], M(T, 1)[0])], [big(P, M(T, 2)[2], M(T, 2)[0]), big(P, "12 yrs", "serving " + T.city)]], { tstyle: "lines", header: false }),
    band(P, "Key facts", "steps"), ...ul([`Founded in 2014 in ${T.city}`, `Best known for ${T.offer}`, `Next: ${T.project}`, `Team of 40 people`]),
    band(P, "Contact", "steps"), p(`${T.person} · ${T.email} · +92 300 0000000`),
  ]),
  speech: (P, T) => doc("Speech", [
    { type: "h1", align: "center", runs: cleanRuns(look(`Thank you for ${T.event === "travel expo" ? "coming" : "being here"}`, { color: P.ink, size: 28, font: "serif" })) },
    p(`*Remarks by ${T.person}, ${T.role} · ${cap(T.event)}*`, { align: "center" }), hr(),
    p("Good evening, everyone.", { lineHeight: 1.8, ...{} }),
    p(`When we started ${T.org}, we had one goal: to make ${T.offer} simple for ${T.audience}. *[pause]*`, { lineHeight: 1.8 }),
    p(`Tonight I want to thank the people who made this year possible: our team, our partners and every one of you.`, { lineHeight: 1.8 }),
    p(`Next year brings the ${T.project}. We will build it the same way, by listening first. *[smile, look at the room]*`, { lineHeight: 1.8 }),
    p("Thank you.", { lineHeight: 1.8, align: "center" }),
  ]),
  "wedding-program": (P, T) => doc("Wedding programme", [
    { type: "h1", align: "center", runs: cleanRuns(look("Hira & Danish", { color: P.dark, size: 36, font: "serif", i: true })) },
    p("Saturday, 20 December 2026 · Four o'clock in the afternoon", { align: "center" }),
    p(`${T.city}`, { align: "center" }),
    img(LINES.diamonds.svg(P.mid), 420),
    H(P, 2, "Order of ceremony", { align: "center" }),
    table([["Time", ""], ["4:00", "Guests arrive"], ["4:30", "Welcome and opening words"], ["5:00", "Vows and rings"], ["5:30", "Dinner"], ["7:00", "Speeches and dessert"]], { tstyle: "lines" }),
    p("*Thank you for sharing this day with us. Your love means the world.*", { align: "center" }),
  ]),
  "report-card": (P, T) => doc("Report card", [
    band(P, `${T.org} · Report card`, "sun", true, 1),
    table([["Student", "Class", "Term", "Teacher"], [T.person3, "Grade 6 B", "Autumn 2026", T.person]], { tstyle: "lines" }),
    H(P, 2, "Results"),
    table([["Subject", "Term 1", "Term 2", "Grade", "Comment"], ["English", "78", "84", "A", "Reads with expression"], ["Maths", "71", "80", "A-", "Much better at fractions"], ["Science", "88", "90", "A+", "Great experiments"], ["Art", "92", "94", "A+", "Very creative"]], { accent: P.light }),
    table([["Attendance", "Late", "Behaviour"], ["96%", "2 days", "Excellent"]], { tstyle: "lines" }),
    quote(`“A kind and curious learner. Keep asking questions!” ${T.person}`),
    table([["Parent signature", "Date"], ["", ""]], { tstyle: "lines" }),
  ]),
  "creative-brief": (P, T) => doc("Creative brief", [
    hero({ bg: P.light, deco: "confetti", dc: P.dark, dc2: P.mid, minh: 110 }, look("Creative Brief", { color: P.ink, size: 32, ...F(P) }), look(`${cap(T.offer)} campaign · ${T.org}`, { color: P.dark, size: 12 })),
    table([["Brief", "Details"], ["Client", T.org], ["Objective", `Grow ${M(T, 1)[0].toLowerCase()} to ${M(T, 1)[2]}`], ["Audience", cap(T.audience)], ["Tone", "Warm, clear, a little playful"], ["Deliverables", "3 social posts, 1 poster, 1 short video"], ["Deadline", "15 December 2026"], ["Budget", "PKR 350,000"]], { accent: P.light }),
    H(P, 2, "Must include"), ...checks([["Logo on every piece", false], ["One clear call to action", false], [`The line: “${T.tagline}”`, false]]),
    H(P, 2, "Please avoid"), ...ul(["Stock photos of people", "Small, hard-to-read text"]),
  ]),
  prd: (P, T) => doc("Product requirements", [
    band(P, `Product requirements · ${T.product}`, "diamonds", true, 1),
    table([["Owner", "Status", "Target release"], [T.person, "In review", "March 2027"]], { tstyle: "lines" }),
    H(P, 2, "Problem"), p(`${cap(T.audience)} cannot see what is happening without calling us. That costs them time and costs us hours every day.`),
    H(P, 2, "User stories"),
    table([["As a…", "I want to…", "So that…", "Priority"], ["customer", "see my booking status", "I don't have to call", "Must"], ["staff member", "update a status in one tap", "customers stay informed", "Must"], ["manager", "see a weekly summary", "I can plan staff", "Should"]], { accent: P.light }),
    H(P, 2, "Acceptance criteria"), ...checks([["Status updates appear within 5 seconds", false], ["Works on a basic phone browser", false], ["Messages are in clear English", false]]),
    H(P, 2, "Out of scope"), ...ul(["Online payments", "A desktop app"]),
  ]),
  retrospective: (P, T) => doc("Retrospective", [
    hero({ bg: P.dark, deco: "circles", dc: P.mid, dc2: P.light, minh: 110 }, look("Sprint Retrospective", { color: P.cream, size: 30, ...F(P) }), look(`${T.org} · Sprint 14`, { color: P.light, size: 12 })),
    table([["Went well", "To improve", "Ideas"], ["Shipped on time\nGreat teamwork\nHappy customers", "Too many meetings\nLate design reviews", `Try a no-meeting Wednesday\nInvite ${T.audience} to a demo`]], { accent: P.light }),
    band(P, "Actions", "steps"),
    table([["Action", "Owner", "Due"], ["Cut the weekly meeting to 30 minutes", T.person, "Next sprint"], ["Design review on day 2", T.person2, "Next sprint"]], { tstyle: "lines" }),
    H(P, 2, "Team mood"), p("Average 4 out of 5 (up from 3.5 last sprint)."),
    p("Next retro: Friday 28 November, 15:00."),
  ]),
  kanban: (P, T) => doc("Project board", [
    band(P, `Project board · ${cap(T.project)}`, "steps", true, 1),
    p(`Updated every Monday by ${T.person}. Move a line to the next column when it changes.`),
    table([["To do", "Doing", "Done"], ["▢ Order materials\n▢ Write the guide\n▢ Book the venue", `▢ ${T.steps[1]}\n▢ Train the team`, "▣ Budget approved\n▣ Plan agreed"]], { accent: P.light }),
    H(P, 2, "Blocked"), ...ul(["Waiting for the supplier's price list"]),
    H(P, 2, "Notes"), p("Keep each card short: one task, one owner."),
  ]),
  "interview-notes": (P, T) => doc("Interview notes", [
    hero({ bg: P.light, deco: "arc", dc: P.dark, minh: 100, pad: 20 }, look("Interview Notes", { color: P.ink, size: 28, ...F(P) }), look(`${T.role} · ${T.org}`, { color: P.dark, size: 12 })),
    table([["Candidate", "Date", "Interviewers"], [T.person3, "12 November 2026", `${T.person}, ${T.person2}`]], { tstyle: "lines" }),
    H(P, 3, "1. Tell us about a time you solved a hard problem."), p("Gave a clear example from their last job, with numbers."),
    H(P, 3, `2. How would you improve our ${T.offer}?`), p("Two practical ideas; one we had not thought of."),
    table([["Skill", "Score (1 to 5)", "Notes"], ["Communication", "5", "Clear and calm"], ["Experience", "4", "Strong in our field"], ["Team fit", "4", "Asked good questions"]], { accent: P.light }),
    band(P, "Recommendation: invite to the final round", "diamonds"),
  ]),
  "city-guide": (P, T) => doc(`${T.city} guide`, [
    hero({ bg: P.dark, deco: "waves", dc: P.light, dc2: P.mid, minh: 150 }, look(`A weekend in ${T.city}`, { color: P.cream, size: 34, ...F(P) }), look(`A guide by ${T.org}`, { color: P.light, size: 12 })),
    band(P, "Where to stay", "leaves"), ...ul(["Garden Guest House: quiet, near the old market", "City Hotel: central, good breakfast"]),
    band(P, "Where to eat", "leaves"), ...ul(["Lantern Street food stalls (evenings)", "Rooftop tea house with a view"]),
    band(P, "What to see", "leaves"), ...ul(["The old fort at sunrise", "The weekly crafts market", "The botanical garden"]),
    H(P, 2, "Getting around"), table([["How", "Cost", "Tip"], ["Rickshaw", "PKR 200 to 400", "Agree the price first"], ["Ride app", "PKR 300 to 600", "Fastest at night"]], { tstyle: "lines" }),
    quote("Tip: carry small notes and a water bottle."),
  ]),
  glossary: (P, T) => doc("Glossary", [
    hero({ bg: P.light, deco: "dots", dc: P.dark, minh: 100, pad: 20 }, look("Glossary", { color: P.ink, size: 32, ...F(P) }), look(`Words we use at ${T.org}`, { color: P.dark, size: 12 })),
    band(P, "A", "dots", true, 3), table([["Term", "Meaning"], ["Agenda", "The list of topics for a meeting"], ["Audience", `The people we serve: ${T.audience}`]], { tstyle: "lines" }),
    band(P, "B", "dots", true, 3), table([["Term", "Meaning"], ["Budget", "The money planned for a piece of work"], ["Brief", "A short description of a job to do"]], { tstyle: "lines" }),
    band(P, "C", "dots", true, 3), table([["Term", "Meaning"], ["Checklist", "Steps to tick off one by one"], ["Customer", "Anyone who buys from or uses our service"]], { tstyle: "lines" }),
  ]),
  "white-paper": (P, T) => doc("White paper", [
    { type: "h1", pad: 34, minh: 240, bg: P.dark, deco: "circles", dc: P.mid, dc2: P.light, runs: cleanRuns(lines2(look("WHITE PAPER", { color: P.light, size: 12 }), look(`Better ${T.offer}: what works`, { color: P.cream, size: 32, ...F(P) }), look(`${T.org} · November 2026`, { color: P.light, size: 12 }))) },
    H(P, 2, "Summary"), quote(`Three simple changes improved ${M(T, 0)[0].toLowerCase()} by a third. This paper explains them and how to try them.`),
    H(P, 2, "1. Introduction"), p(`${cap(T.audience)} expect quick, clear service. Many teams want to improve but do not know where to start.`, { align: "justify" }),
    H(P, 2, "2. What we found"), img(CHARTS.bars.svg(P.dark), 420), p("*Figure 1. Results over five quarters.*", { align: "center" }),
    H(P, 2, "3. Recommendations"), ...ul(T.goals, "number"),
    H(P, 3, "References"), ...ul(["Our survey of 300 customers, 2026", "Team interviews, 2026"], "number"),
  ]),
  "statement-of-work": (P, T) => doc("Statement of work", [
    band(P, "STATEMENT OF WORK", "diamonds", true, 1),
    table([["Client", "Provider", "Start"], [T.person2, T.org, "1 December 2026"]], { tstyle: "lines" }),
    H(P, 2, "Scope"), p(`${T.org} will plan and deliver the ${T.project}, including training and four weeks of support.`, { align: "justify" }),
    H(P, 2, "Deliverables"), table([["Deliverable", "Format", "Due"], ["Project plan", "Document", "5 Dec"], [cap(T.project), "Working service", "31 Jan"], ["Training", "2 sessions", "7 Feb"]], { accent: P.light }),
    H(P, 2, "Payment schedule"), table([["Milestone", "Amount (PKR)"], ["On signing", "150,000"], ["On delivery", "250,000"], ["After support", "100,000"]], { tstyle: "lines" }),
    H(P, 2, "Assumptions"), ...ul(["The client gives feedback within 3 working days", "Changes to scope are agreed in writing"]),
    table([["Signed for the client", "Signed for the provider"], ["", ""]], { tstyle: "lines" }),
  ]),
  standup: (P, T) => doc("Daily stand-up", [
    band(P, "Daily stand-up · Wednesday 12 November", "sun", false, 1),
    p(`15 minutes, standing. Each person: yesterday, today, anything blocking. Notes by ${T.person3}.`),
    table([["Name", "Yesterday", "Today", "Blockers"], [T.person, "Finished the plan", T.steps[1], "None"], [T.person2, "Budget call", "Supplier quotes", "Waiting on prices"], [T.person3, "Customer emails", "Write the guide", "None"]], { accent: P.light }),
    band(P, "Blockers to solve today", "dots"), ...checks([["Chase the supplier for prices", false]]),
    p("Next stand-up: tomorrow, 9:30."),
  ]),
};
