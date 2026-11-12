// AsaanDesk Docs: a fifth set of hand-designed base layouts (budget proposal, grant proposal, questionnaire, team directory,
// habit tracker, about-me page, post-mortem, competitor comparison, survey results, worksheet, event flyer, board minutes).
// Own text and artwork; P = palette, T = content theme.
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { CHARTS, svgDataUrl, decoSvg } from "./decos.js";

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
const img = (svg, w, align = "center") => ({ type: "image", src: svgDataUrl(svg), alt: "", w, align });
const doc = (title, blocks) => normalizeDoc({ ...newDoc(title), blocks });
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 140, ...band, runs: cleanRuns(lines2(...parts)) });
const F = (P) => (P.font ? { font: P.font } : {});
const H = (P, level, text, extra = {}) => ({ type: "h" + level, runs: cleanRuns(look(text, { color: P.dark, ...F(P) })), ...extra });
const band = (P, text, deco, dark = false, level = 2) => ({ type: "h" + level, pad: 10, bg: dark ? P.dark : P.light, deco, dc: dark ? P.light : P.dark, dc2: dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: dark ? P.cream : P.ink, ...F(P) })) });
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const M = (T, i) => T.metrics[i];
const cell = (P, title, body) => [{ text: title, b: true, color: P.dark }, { text: "\n" + body }];

export const LAYOUT_BUILDERS_5 = {
  "budget-proposal": (P, T) => doc("Budget proposal", [
    hero({ bg: P.dark, deco: "steps", dc: P.light, dc2: P.mid }, look("Budget Proposal 2027", { color: P.cream, size: 32, ...F(P) }), look(`${cap(T.project)} · ${T.org}`, { color: P.light, size: 12 })),
    H(P, 2, "Summary"), p(`We ask for **PKR ${T.total}** to deliver the ${T.project} for ${T.audience} in ${T.city}.`),
    table([["Item", "Cost (PKR)", "Why"], [T.items[0][0], T.items[0][1], "Needed from day one"], [T.items[1][0], T.items[1][1], "So the team can run it well"], [T.items[2][0], T.items[2][1], `So ${T.audience} hear about it`], ["**Total**", `**${T.total}**`, ""]], { accent: P.light }),
    img(CHARTS.pie.svg(P.dark), 400),
    band(P, "Expected return", "steps"), p(`${M(T, 0)[0]} from ${M(T, 0)[1]} to ${M(T, 0)[2]} within a year.`),
    table([["Prepared by", "Approved by"], [T.person, ""]], { tstyle: "lines" }),
  ]),
  "grant-proposal": (P, T) => doc("Grant proposal", [
    { type: "h1", pad: 30, minh: 200, bg: P.light, deco: "leaves", dc: P.dark, dc2: P.mid, runs: cleanRuns(lines2(look("GRANT PROPOSAL", { color: P.dark, size: 12 }), look(cap(T.project), { color: P.ink, size: 30, ...F(P) }), look(`Submitted by ${T.org} · ${T.city}`, { color: P.dark, size: 12 }))) },
    H(P, 2, "1. The need"), p(`Many ${T.audience} in ${T.city} still lack ${T.offer} close to home. Our waiting list has 240 names.`, { align: "justify" }),
    H(P, 2, "2. What we will do"), table([["Objective", "Measure", "By"], [T.goals[0], "Done or not", "June 2027"], [T.goals[1], M(T, 0)[0], "December 2027"]], { accent: P.light }),
    H(P, 2, "3. Budget"), table([["Item", "PKR"], ...T.items, ["**Total**", `**${T.total}**`]], { tstyle: "lines" }),
    H(P, 2, "4. How we will report"), ...ul(["A short update every three months", "Photos and stories (with permission)", "A final report with numbers"]),
    p(`Contact: ${T.person}, ${T.role} · ${T.email}`),
  ]),
  questionnaire: (P, T) => doc("Client questionnaire", [
    hero({ bg: P.light, deco: "dots", dc: P.dark, minh: 110, pad: 20 }, look("Client Questionnaire", { color: P.ink, size: 30, ...F(P) }), look(`Help us plan your ${T.offer}`, { color: P.dark, size: 12 })),
    p("Please fill in the answers. It takes about five minutes."),
    table([["Question", "Your answer"], ["Your name", ""], ["Phone or email", ""], ["What do you need help with?", ""], ["When would you like to start?", ""], ["Your budget (PKR)", ""]], { accent: P.light }),
    H(P, 3, "How did you hear about us?"), ...checks([["Friend or family", false], ["Social media", false], ["Walked past", false], ["Other", false]]),
    p(`Send it back to ${T.email}. Thank you!`),
  ]),
  "team-directory": (P, T) => doc("Team directory", [
    band(P, `${T.org} · Team directory`, "circles", true, 1),
    p("Who does what, and how to reach them. Updated monthly."),
    table([["Name", "Role", "Email", "Ext."], [T.person, T.role, T.email, "101"], [T.person2, "Finance", "finance@example.com", "102"], [T.person3, "Operations", "ops@example.com", "103"], ["Front desk", "Bookings", "desk@example.com", "100"]], { accent: P.light }),
    H(P, 2, "Opening hours"), table([["Days", "Hours"], ["Monday to Friday", "9:00 to 18:00"], ["Saturday", "10:00 to 14:00"]], { tstyle: "lines" }),
    H(P, 2, "In an emergency"), p("Call the front desk first, then the manager on duty."),
  ]),
  "habit-tracker": (P, T) => doc("Habit tracker", [
    hero({ bg: P.light, deco: "sun", dc: P.mid, dc2: P.dark, minh: 110, pad: 20 }, look("Habit Tracker", { color: P.ink, size: 30, ...F(P) }), look(`November · ${T.person}`, { color: P.dark, size: 12 })),
    table([["Habit", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], ["Walk 20 minutes", "✓", "✓", "", "✓", "", "", ""], ["Drink 8 glasses of water", "✓", "", "✓", "", "", "", ""], ["Read 10 pages", "✓", "✓", "✓", "", "", "", ""], ["Sleep by 11 pm", "", "✓", "", "", "", "", ""]], { accent: P.light }),
    H(P, 2, "This week I will"), ...checks([["Walk every day", false], ["Prepare lunch the night before", false]]),
    quote("Small steps every day."),
  ]),
  "about-me": (P, T) => doc("About me", [
    hero({ bg: P.dark, deco: "avatar", dc: P.mid, dc2: P.light, minh: 150, pad: 24 }, look(`Hi, I'm ${T.person.split(" ")[0]}`, { color: P.cream, size: 32, ...F(P) }), look(`${T.role} · ${T.city}`, { color: P.light, size: 13 })),
    p(`I work at ${T.org}, where I look after ${T.offer}. Outside work I like long walks, good tea and learning new things.`, { lineHeight: 1.6 }),
    band(P, "A few facts", "confetti"), ...ul(["I have visited 12 cities in one year", "I can cook a mean biryani", "I am learning to play the guitar"]),
    band(P, "What I can help with", "confetti"), ...ul([`Planning ${T.offer}`, "Writing clear guides", "Training new team members"]),
    p(`Say hello: ${T.email}`),
  ]),
  postmortem: (P, T) => doc("Post-mortem", [
    band(P, "POST-MORTEM", "dots", true, 1),
    table([["What", "When", "Impact", "Owner"], ["Online bookings down", "3 Nov, 2 hours", "About 60 customers affected", T.person]], { accent: P.light }),
    H(P, 2, "Summary"), p("The booking page stopped working after an update. We rolled back within two hours and called every affected customer."),
    H(P, 2, "Why it happened (five whys)"), ...ul(["The page failed to load.", "A new setting was missing.", "The setting was not in the checklist.", "The checklist was out of date.", "Nobody owned the checklist."], "number"),
    H(P, 2, "Actions"), table([["Action", "Owner", "Due"], ["Update the release checklist", T.person2, "10 Nov"], ["Test bookings after every update", T.person3, "Ongoing"]], { tstyle: "lines" }),
    quote("Blameless: we fix the process, not the person."),
  ]),
  "competitor-analysis": (P, T) => doc("Competitor analysis", [
    hero({ bg: P.dark, deco: "diamonds", dc: P.light, minh: 120 }, look("Competitor Analysis", { color: P.cream, size: 30, ...F(P) }), look(`${cap(T.offer)} · ${T.city}`, { color: P.light, size: 12 })),
    table([["", T.short, "Competitor A", "Competitor B"], ["Price", "Medium", "Low", "High"], ["Speed", "✓", "—", "✓"], ["Online booking", "✓", "✓", "—"], ["Friendly service", "✓", "—", "✓"], ["Open on weekends", "—", "✓", "✓"]], { accent: P.light }),
    band(P, "Where we win", "steps"), ...ul(["Friendly, fast service", "Easy online booking"]),
    band(P, "Where we can improve", "steps"), ...ul(["Weekend hours", "Clearer prices"]),
  ]),
  "survey-results": (P, T) => doc("Survey results", [
    hero({ bg: P.light, deco: "circles", dc: P.dark, dc2: P.mid, minh: 120 }, look("Survey Results", { color: P.ink, size: 32, ...F(P) }), look(`${T.org} · 300 replies · October 2026`, { color: P.dark, size: 12 })),
    table([["Would recommend us", "Happy with speed", "Happy with price"], [[{ text: "87%", b: true, size: 24, color: P.dark }], [{ text: "74%", b: true, size: 24, color: P.dark }], [{ text: "61%", b: true, size: 24, color: P.dark }]]], { tstyle: "lines" }),
    img(CHARTS.bars.svg(P.dark), 420),
    H(P, 2, "What people said"), quote("“Fast and friendly, I'll be back.”"), quote("“Prices could be clearer on the website.”"),
    H(P, 2, "What we will do"), ...ul(["Put a simple price list online", "Keep the same team on weekends"], "number"),
  ]),
  worksheet: (P, T) => doc("Worksheet", [
    band(P, `Worksheet · ${T.lesson}`, "sun", false, 1),
    table([["Name", "Class", "Date"], ["", "", ""]], { tstyle: "lines" }),
    H(P, 3, "Word bank"), table([["evaporate", "condense", "collect", "rain"]], { accent: P.light, header: false }),
    H(P, 3, "1. Fill in the blanks"), p("Water ________ when the sun heats it. Clouds form when vapour ________."),
    H(P, 3, "2. Draw and label"), p("Draw the four stages of the water cycle in the box below."), hr(), hr(),
    H(P, 3, "3. Think about it"), p("Where do you see water evaporate at home?"), hr(),
  ]),
  "event-flyer-doc": (P, T) => doc(`${T.event} flyer`, [
    { type: "h1", align: "center", pad: 28, minh: 160, bg: P.dark, deco: "confetti", dc: P.light, dc2: P.mid, runs: cleanRuns(lines2(look("YOU'RE INVITED", { color: P.light, size: 13 }), look(cap(T.event), { color: P.cream, size: 34, ...F(P) }))) },
    table([["When", "Where", "Cost"], [[{ text: "Sat 6 Dec", b: true, size: 18, color: P.dark }, { text: "\n10 am to 4 pm" }], [{ text: T.short, b: true, size: 18, color: P.dark }, { text: "\n" + T.city }], [{ text: "Free", b: true, size: 18, color: P.dark }, { text: "\nAll welcome" }]]], { accent: P.light }),
    img(decoSvg("flower", P.mid, P.dark).replace(' preserveAspectRatio="xMaxYMid meet"', ""), 120),
    H(P, 2, "What to expect", { align: "center" }), ...ul(["Talks and demos", "Food stalls", "Activities for children"]),
    p(`RSVP: ${T.email}`, { align: "center" }),
  ]),
  "board-minutes": (P, T) => doc("Board meeting minutes", [
    { type: "h1", align: "center", runs: cleanRuns(look(`${T.org}`, { color: P.dark, size: 22, ...F(P) })) },
    p("**Minutes of the board meeting** · 12 November 2026 · 18:00", { align: "center" }), hr(),
    table([["Present", "Apologies", "In attendance"], [`${T.person} (chair), ${T.person2}`, T.person3, "Secretary"]], { tstyle: "lines" }),
    H(P, 3, "1. Minutes of the last meeting"), p("Agreed as a true record."),
    H(P, 3, "2. Finance report"), p("Income is 8% above plan. The board noted the report."),
    H(P, 3, `3. ${cap(T.project)}`), p("**Resolved:** to approve the budget and start in January."),
    H(P, 3, "4. Date of next meeting"), p("10 December 2026, 18:00."),
    table([["Chair's signature", "Date"], ["", ""]], { tstyle: "lines" }),
  ]),
};
