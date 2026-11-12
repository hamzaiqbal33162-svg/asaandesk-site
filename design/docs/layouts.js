// AsaanDesk Docs: hand-designed base layouts for the template generator (gallery.js names the combinations
// layout~palette~theme). Each layout builds a real, editable document from an own colour palette P and a content
// theme T (purpose / industry with its own example text). All names, numbers and text are our own examples.
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";
import { CHARTS, svgDataUrl } from "./decos.js";
import { LAYOUT_BUILDERS_2 } from "./layouts2.js";
import { LAYOUT_BUILDERS_3 } from "./layouts3.js";
import { LAYOUT_BUILDERS_4 } from "./layouts4.js";
import { LAYOUT_BUILDERS_5 } from "./layouts5.js";
import { LAYOUT_BUILDERS_6 } from "./layouts6.js";
import { LAYOUT_BUILDERS_7 } from "./layouts7.js";

const runs = (md) => cleanRuns(mdInline(md));
const look = (md, st = {}) => runs(md).map((r) => ({ ...r, ...st }));
const lines2 = (...parts) => parts.flatMap((x, i) => (i ? [{ text: "\n" }, ...x] : x));
const h = (level, md, props = {}) => ({ type: "h" + level, runs: runs(md), ...props });
const p = (md = "", props = {}) => ({ type: "p", runs: runs(md), ...props });
const li = (md, list = "bullet", props = {}) => ({ type: "li", list, level: 0, runs: runs(md), ...props });
const ul = (items, list = "bullet") => items.map((x) => li(x, list));
const checks = (items) => items.map(([md, done]) => li(md, "check", { checked: !!done }));
const table = (rows, extra = {}) => ({ type: "table", header: true, rows: rows.map((r) => r.map((c) => ({ runs: runs(String(c)) }))), ...extra });
const quote = (md) => ({ type: "quote", runs: runs(md) });
const img = (svgStr, w) => ({ type: "image", src: svgDataUrl(svgStr), alt: "", w, align: "center" });
const doc = (title, blocks, extra = {}) => normalizeDoc({ ...newDoc(title), ...extra, blocks });
const hero = (band, ...parts) => ({ type: "h1", pad: 26, minh: 150, ...band, runs: cleanRuns(lines2(...parts)) });

// Colour helpers for a palette P = { dark, light, mid, cream, ink, font? } (font = the palette's heading font pairing).
const darkHero = (P, deco, title, sub, o = {}) => hero({ bg: P.dark, deco, dc: P.light, dc2: P.cream, minh: o.minh || 170 }, look(title, { color: P.cream, size: o.size || 38, ...(o.font || P.font ? { font: o.font || P.font } : {}), ...(o.i ? { i: true } : {}) }), ...(sub ? [look(sub, { color: P.light, size: 13 })] : []));
const lightHero = (P, deco, title, sub, o = {}) => hero({ bg: P.light, deco, dc: P.dark, dc2: P.mid, minh: o.minh || 130 }, look(title, { color: P.ink, size: o.size || 36, ...(o.font || P.font ? { font: o.font || P.font } : {}), ...(o.i ? { i: true } : {}) }), ...(sub ? [look(sub, { color: P.dark, size: 13 })] : []));
const band = (P, text, deco = "diamonds", o = {}) => ({ type: "h" + (o.level || 2), pad: 10, bg: o.dark ? P.dark : P.light, deco, dc: o.dark ? P.light : P.dark, dc2: o.dark ? P.cream : P.mid, runs: cleanRuns(look(text, { color: o.dark ? P.cream : P.ink, ...(o.font || P.font ? { font: o.font || P.font } : {}) })) });
const H2 = (P, text, font) => ({ type: "h2", runs: cleanRuns(look(text, { color: P.dark, ...(font || P.font ? { font: font || P.font } : {}) })) });
const H3 = (P, text) => ({ type: "h3", runs: cleanRuns(look(text, { color: P.dark })) });
const acc = (P) => ({ accent: P.light });
const lined = { tstyle: "lines" };
const M = (T, i) => T.metrics[i];

export const LAYOUT_BUILDERS = {
  ...LAYOUT_BUILDERS_2,
  ...LAYOUT_BUILDERS_3,
  ...LAYOUT_BUILDERS_4,
  ...LAYOUT_BUILDERS_5,
  ...LAYOUT_BUILDERS_6,
  ...LAYOUT_BUILDERS_7,
  "one-pager": (P, T) => doc(`${T.short} one pager`, [
    hero({ bg: P.dark, deco: "petals", dc: P.light, dc2: P.cream, minh: 210 }, look(T.org, { color: P.cream, size: 15, font: "serif" }), look("One Pager", { color: P.cream, size: 46, font: "serif" })),
    band(P, "Overview", "diamonds", { font: "serif" }),
    p(`What is the **${T.project}** about? Why does it matter now, and who is it for? In short: it helps ${T.audience} and it supports our goal to ${T.goals[0].toLowerCase()}.`),
    table([["Approved", "Name", "Role"], ["✓", T.person, T.role], ["✓", T.person2, "Finance"], ["", T.person3, "Operations"]], lined),
    band(P, "Summary", "arc", { font: "serif" }),
    table([["Topic", "Notes"], ["Key information", `The ${T.project} starts next quarter.`], ["Decisions", `Budget agreed; ${T.person} leads the work.`], ["Next steps", T.steps[0]], ["Support needed", "Two extra people for the first month."]], lined),
    band(P, "Relevant resources", "steps", { font: "serif" }),
    ...ul([`${T.short} project brief`, "Budget sheet, version 2", `Feedback from ${T.audience}`]),
  ]),
  "strategic-plan": (P, T) => doc(`${T.short} strategic plan`, [
    darkHero(P, "circles", "Strategic Plan", `2027 to 2029 · ${T.org}`, { font: "serif", size: 40, minh: 180 }),
    H2(P, "Overview", "serif"),
    p(`This plan sets out where ${T.org} wants to be by the end of 2029 and the steps that will get us there. It was written with our team and a group of ${T.audience}.`),
    band(P, "Current state", "dots", { dark: true, font: "serif" }),
    p(`Today we serve ${T.audience} in ${T.city}. ${M(T, 0)[0]} is ${M(T, 0)[1]}; we want to reach ${M(T, 0)[2]}.`),
    H3(P, "PESTLE analysis"),
    table([["Factor", "What we see", "Impact"], ["Political", "New local rules for our sector", "Medium"], ["Economic", "Higher rent and energy costs", "High"], ["Social", `${T.audience[0].toUpperCase() + T.audience.slice(1)} expect faster service`, "High"], ["Technological", "Cheaper online tools", "Medium"], ["Legal", "Stricter safety checks", "Low"], ["Environmental", "Push to cut waste", "Medium"]], acc(P)),
    H2(P, "Goals", "serif"),
    ...ul(T.goals, "number"),
    H2(P, "Timeline", "serif"),
    table([["Year", "Focus", "Owner"], ["2027", T.project, T.person], ["2028", T.offer, T.person2], ["2029", T.product, T.person3]], lined),
  ]),
  "sustainability-report": (P, T) => doc(`${T.short} sustainability report`, [
    hero({ bg: P.dark, deco: "leaves", dc: P.light, dc2: P.cream, minh: 170 }, look("SUSTAINABILITY", { color: P.cream, size: 30 }), look("REPORT", { color: P.cream, size: 30 }), look(`2026 · ${T.org}`, { color: P.light, size: 12 })),
    H2(P, "Report overview"),
    p(`This report shows how ${T.org} used energy, water and materials in 2026, what changed since 2025 and what we promise to do next.`),
    H2(P, "Key numbers"),
    table([["Measure", "2025", "2026", "Change"], ["Electricity (MWh)", "480", "415", "-14%"], ["Water (thousand litres)", "620", "510", "-18%"], ["Waste recycled", "22%", "41%", "+19 points"]], acc(P)),
    img(CHARTS.bars.svg(P.dark), 420),
    H2(P, "Our commitments"),
    ...checks([["Solar panels on our main building", true], ["Half of all packaging recycled by 2028", false], [`A green guide for ${T.audience}`, false]]),
    band(P, "Company profile", "sun"),
    p(`${T.org} is based in ${T.city}. ${T.tagline}.`),
  ]),
  "project-proposal": (P, T) => doc(`${T.short} project proposal`, [
    darkHero(P, "waves", "Project Proposal", `${T.project[0].toUpperCase() + T.project.slice(1)} · ${T.org}`),
    band(P, "1. Background", "diamonds"),
    p(`${T.org} wants to start a **${T.project}** for ${T.audience} in ${T.city}. This proposal explains why, what it costs and how we will deliver it.`),
    band(P, "2. Objectives", "diamonds"),
    ...checks(T.goals.map((g) => [g, false])),
    band(P, "3. Timeline", "diamonds"),
    table([["Month", "Work", "Done by"], ["January", T.steps[0], T.person], ["February to March", T.steps[1], T.person2], ["April", T.steps[2], T.person3]], acc(P)),
    band(P, "4. Budget", "diamonds"),
    table([["Item", "Cost (PKR)"], ...T.items, ["**Total**", `**${T.total}**`]], acc(P)),
    H2(P, "5. Approval"),
    table([["Name", "Role", "Signature"], ["", "Director", ""], ["", "Finance", ""]], lined),
  ]),
  newsletter: (P, T) => doc(`${T.short} newsletter`, [
    darkHero(P, "circles", "The Monthly Bulletin", `Issue 14 · November 2026 · ${T.org}`, { font: "serif", size: 36 }),
    H2(P, "In this issue"),
    ...ul([`Big news: our ${T.project}`, "Dates for your calendar", "Thank you, volunteers and friends"]),
    band(P, `Big news: our ${T.project}`, "confetti"),
    p(`After months of planning, our ${T.project} is ready. ${T.audience[0].toUpperCase() + T.audience.slice(1)} can see it from 1 December.`),
    band(P, "Dates for your calendar", "dots"),
    table([["Date", "Event", "Where"], ["14 November", "Team open day", T.short], ["22 November", T.event[0].toUpperCase() + T.event.slice(1), T.city], ["5 December", "Year-end get-together", T.short]], acc(P)),
    H2(P, "Thank you"),
    p(`Many people gave their time to make this happen. Thank you, from everyone at ${T.org}.`),
  ]),
  "annual-report": (P, T) => doc(`${T.short} annual report`, [
    darkHero(P, "steps", "Annual Report 2026", T.org),
    H2(P, "A word from our director"),
    quote(`This year we grew, we listened to ${T.audience} and we kept our promises. Thank you to everyone who made it possible.`),
    band(P, "Highlights", "dots"),
    table([["Measure", "2025", "2026"], ...T.metrics], acc(P)),
    img(CHARTS.line.svg(P.dark), 420),
    H2(P, "Financial summary"),
    table([["", "PKR million"], ["Income", "182"], ["Costs", "149"], ["Surplus", "33"]], lined),
    H2(P, "Looking ahead"),
    ...ul(T.goals),
  ]),
  "case-study": (P, T) => doc(`${T.short} case study`, [
    darkHero(P, "petals", "Case Study", `How ${T.org} improved ${M(T, 0)[0].toLowerCase()}`, { size: 40 }),
    H2(P, "The client"), p(`${T.org} serves ${T.audience} in ${T.city}.`),
    H2(P, "The challenge"), p(`${M(T, 0)[0]} was stuck at ${M(T, 0)[1]} and the team spent too much time on paperwork.`),
    H2(P, "Our solution"), ...ul(T.steps, "number"),
    band(P, "Results", "steps"),
    table([["Measure", "Before", "After"], ...T.metrics], acc(P)),
    quote(`“The change was simple, and everyone noticed it.” ${T.person}, ${T.role}`),
  ]),
  "product-brief": (P, T) => doc(`${T.product} brief`, [
    darkHero(P, "dots", "Product Brief", `${T.product} · Version 1`),
    H2(P, "Problem"), p(`${T.audience[0].toUpperCase() + T.audience.slice(1)} lose time because everything is done by phone and on paper.`),
    H2(P, "Who it is for"), ...ul([T.audience[0].toUpperCase() + T.audience.slice(1), `The ${T.short} team`, "Partners and suppliers"]),
    band(P, "Goals", "diamonds"),
    ...checks([["Set up in under five minutes", false], ["Works on any phone", false], ["Works offline", false]]),
    band(P, "Features", "diamonds"),
    table([["Feature", "Why", "Priority"], ["Simple sign-up", "Fewer people give up", "Must have"], ["Reminders", "Fewer missed dates", "Must have"], ["Reports", "The team sees what works", "Should have"]], acc(P)),
    H2(P, "Launch plan"), p("Private test with 50 users in January, public launch in March."),
  ]),
  resume: (P, T) => doc(`${T.person} resume`, [
    hero({ bg: P.dark, deco: "avatar", dc: P.mid, dc2: P.light, minh: 140, pad: 22 }, look(T.person, { color: P.cream, size: 30 }), look(`${T.role} · ${T.city}`, { color: P.light, size: 13 })),
    p(`${T.email} · +92 300 0000000 · ${T.city}`),
    H2(P, "Profile"), p(`${T.role} with eight years of experience at places like ${T.org}. I plan carefully, explain things clearly and look after ${T.audience}.`),
    H2(P, "Experience"),
    table([["Years", "Role", "What I did"], ["2022 to now", `${T.role}, ${T.org}`, `Led the ${T.project}; ${M(T, 0)[0].toLowerCase()} went from ${M(T, 0)[1]} to ${M(T, 0)[2]}.`], ["2018 to 2022", `Assistant ${T.role.toLowerCase()}`, `Ran the ${T.offer} and trained new staff.`]], lined),
    H2(P, "Education"), table([["Year", "Degree"], ["2018", "Bachelor's degree (example university)"]], lined),
    H2(P, "Skills"), ...ul(["Planning and budgets", "Team leadership", "Clear writing", "Customer care"]),
  ]),
  "thank-you-letter": (P, T) => doc("Thank-you letter", [
    lightHero(P, "flower", "Thank You", "", { font: "serif", size: 42, i: true }),
    p(`Dear ${T.person2.split(" ")[0]},`),
    p(`Thank you so much for your help with our ${T.event}. You arrived early, stayed late and made everyone feel welcome.`, { align: "justify" }),
    p(`Because of you, ${T.audience} had a day they will remember. We could not have done it without you.`, { align: "justify" }),
    p(""), p("With gratitude,"), p(`**${T.person}**`), p(T.org),
  ]),
  "meeting-notes": (P, T) => doc(`${T.short} meeting notes`, [
    lightHero(P, "confetti", "Weekly team meeting", `Tuesday 10 November 2026 · ${T.org}`, { size: 30, minh: 110 }),
    table([["Attendees", "Absent", "Note taker"], [`${T.person}, ${T.person2}, ${T.person3}`, "None", T.person3]], lined),
    H2(P, "Agenda"), ...ul(["Last week's numbers", `${T.project[0].toUpperCase() + T.project.slice(1)}: progress`, `Plans for the ${T.event}`], "number"),
    H2(P, "Decisions"), ...ul([`The ${T.project} goes ahead in January.`, `${T.person2} owns the budget.`]),
    band(P, "Action items", "dots"),
    ...checks([[`${T.person}: ${T.steps[0].toLowerCase()}`, false], [`${T.person2}: ${T.steps[1].toLowerCase()}`, false], [`${T.person3}: share these notes`, true]]),
  ]),
  "cover-letter": (P, T) => doc("Cover letter", [
    hero({ bg: P.dark, deco: "arc", dc: P.mid, minh: 110, pad: 22 }, look(T.person, { color: P.cream, size: 30 }), look(`${T.role} · ${T.email} · +92 321 0000000`, { color: P.light, size: 11 })),
    p("11 November 2026"), p(""), p("Hiring Team"), p(T.org), p(T.city), p(""),
    p("Dear Hiring Team,"),
    p(`I am writing to apply for the **${T.role}** role at ${T.org}. For six years I have worked with ${T.audience} and I enjoy making things run smoothly.`, { align: "justify" }),
    p(`In my last job I helped move ${M(T, 0)[0].toLowerCase()} from ${M(T, 0)[1]} to ${M(T, 0)[2]}. I would love to bring the same care to your team.`, { align: "justify" }),
    p(""), p("Kind regards,"), p(`**${T.person}**`),
  ]),
  "lesson-plan": (P, T) => doc("Lesson plan", [
    lightHero(P, "sun", "Lesson Plan", `${T.lesson} · ${T.org}`),
    table([["Teacher", "Date", "Length"], [T.person, "18 November 2026", "45 minutes"]], lined),
    H2(P, "Learning objectives"), ...checks([[`Explain what ${T.lesson.toLowerCase()} means`, false], ["Use three new words correctly", false], ["Work in a small group", false]]),
    H2(P, "Materials"), ...ul(["Worksheet and pencils", "Whiteboard and markers", "A short video or picture cards"]),
    band(P, "Lesson steps", "steps"),
    table([["Time", "Activity", "Notes"], ["5 min", "Warm-up question", "Write answers on the board"], ["20 min", "Group activity", "Groups of four"], ["15 min", "Share and quick quiz", "Three questions"]], acc(P)),
    H2(P, "Assessment"), p("Each learner explains one idea in their own words."),
  ]),
  "business-plan": (P, T) => doc(`${T.short} business plan`, [
    darkHero(P, "steps", "Business Plan", `${T.org} · ${T.city}`, { font: "serif", size: 40 }),
    H2(P, "Executive summary", "serif"),
    p(`${T.org} offers ${T.offer} to ${T.audience}. Over the next two years we will grow by adding the ${T.project}. ${T.tagline}.`),
    band(P, "Market", "circles"),
    p(`There are thousands of ${T.audience} in ${T.city}, and most still find it hard to get good, fair service.`),
    band(P, "Products and services", "circles"),
    table([["Offer", "For", "Price (PKR)"], [T.offer[0].toUpperCase() + T.offer.slice(1), T.audience, "From 2,500"], [T.project[0].toUpperCase() + T.project.slice(1), T.audience, "From 4,000"]], acc(P)),
    band(P, "Financial forecast", "circles"),
    table([["Year", "Income (PKR)", "Costs (PKR)", "Profit (PKR)"], ["2027", "9.6M", "8.1M", "1.5M"], ["2028", "13.2M", "10.4M", "2.8M"]], acc(P)),
    img(CHARTS.bars.svg(P.dark), 420),
    H2(P, "Milestones", "serif"), ...checks(T.goals.map((g) => [g, false])),
  ]),
  "marketing-plan": (P, T) => doc(`${T.short} marketing plan`, [
    darkHero(P, "waves", "Marketing Plan", `${T.offer[0].toUpperCase() + T.offer.slice(1)} · ${T.org}`),
    H2(P, "Goals"), ...ul([`Reach 5,000 new ${T.audience}`, `Grow ${M(T, 1)[0].toLowerCase()} to ${M(T, 1)[2]}`, "Keep the cost per new customer below PKR 400"], "number"),
    H2(P, "Who we want to reach"), p(`${T.audience[0].toUpperCase() + T.audience.slice(1)} in ${T.city} who want ${T.offer} without the hassle.`),
    band(P, "Channels", "dots"),
    table([["Channel", "What we post", "How often"], ["Social media", "Short videos and tips", "4 times a week"], ["Email", "News and offers", "Twice a month"], ["Local partners", "Posters and flyers", "Monthly"]], acc(P)),
    band(P, "Budget split", "dots"),
    img(CHARTS.pie.svg(P.dark), 420),
    H2(P, "Content calendar"),
    table([["Week", "Theme"], ["1", "Meet the team"], ["2", T.offer[0].toUpperCase() + T.offer.slice(1)], ["3", "Customer stories"], ["4", T.event[0].toUpperCase() + T.event.slice(1)]], lined),
  ]),
  "event-plan": (P, T) => doc(`${T.event} plan`, [
    darkHero(P, "confetti", "Event Plan", `${T.event[0].toUpperCase() + T.event.slice(1)} · ${T.org}`),
    table([["What", "When", "Where"], [T.event[0].toUpperCase() + T.event.slice(1), "Saturday 6 December, 10 am to 4 pm", `${T.short}, ${T.city}`]], acc(P)),
    band(P, "Run sheet", "confetti"),
    table([["Time", "Item", "Lead"], ["9:00", "Set up and sound check", T.person2], ["10:00", "Welcome", T.person], ["12:30", "Lunch break", T.person3], ["3:30", "Thank-yous and close", T.person]], lined),
    band(P, "Checklist", "confetti"),
    ...checks([["Book the space", true], ["Order food and water", false], [`Invite ${T.audience}`, false], ["Print signs", false]]),
    H2(P, "Contacts"), table([["Name", "Role", "Phone"], [T.person, "Event lead", "0300 0000000"], [T.person2, "Logistics", "0301 0000000"]], lined),
  ]),
  "press-release": (P, T) => doc(`${T.short} press release`, [
    band(P, "FOR IMMEDIATE RELEASE", "dots", { dark: true, level: 3 }),
    h(1, `${T.org} launches ${T.project}`),
    p(`*${T.city}, 11 November 2026*`),
    p(`${T.org} today announced its ${T.project}, built for ${T.audience}. ${T.tagline}.`, { align: "justify" }),
    quote(`“This is a big step for us and for ${T.audience}.” ${T.person}, ${T.role}`),
    H2(P, `About ${T.org}`), p(`${T.org} is based in ${T.city} and offers ${T.offer}.`),
    H2(P, "Media contact"), p(`${T.person2} · ${T.email} · +92 300 0000000`),
    p("###", { align: "center" }),
  ]),
  "status-report": (P, T) => doc(`${T.short} status report`, [
    darkHero(P, "dots", "Project Status Report", `${T.project[0].toUpperCase() + T.project.slice(1)} · Week 12`),
    H2(P, "Summary"), p(`The ${T.project} is on track. Two of three milestones are done, and spending is within budget.`),
    band(P, "Status", "steps"),
    table([["Area", "Status", "Note"], ["Scope", "On track", "No changes"], ["Schedule", "On track", "Milestone 3 due 30 Nov"], ["Budget", "Watch", "Materials cost 6% more"]], acc(P)),
    H2(P, "Milestones"), ...checks(T.steps.map((s, i) => [s, i < 2])),
    H2(P, "Risks"), table([["Risk", "Plan"], ["Late delivery from a supplier", "Order two weeks early"], ["Staff leave in December", "Share the work plan now"]], lined),
  ]),
  "weekly-planner": (P, T) => doc("Weekly planner", [
    lightHero(P, "sun", "Weekly Planner", `Week of 17 November · ${T.person}`, { size: 34 }),
    band(P, "Top priorities", "dots"),
    ...checks([[T.steps[0], false], [T.steps[1], false], [`Prepare for the ${T.event}`, false]]),
    H2(P, "This week"),
    table([["Day", "Plan"], ["Monday", "Team catch-up"], ["Tuesday", T.offer[0].toUpperCase() + T.offer.slice(1)], ["Wednesday", "Admin and emails"], ["Thursday", `${T.project[0].toUpperCase() + T.project.slice(1)} work`], ["Friday", "Review the week"], ["Weekend", "Rest"]], acc(P)),
    H2(P, "Notes"), p("Write anything you want to remember here."),
  ]),
  brainstorm: (P, T) => doc("Brainstorm", [
    lightHero(P, "circles", "Brainstorm", `${T.org} · Ideas session`, { size: 36 }),
    band(P, `How might we grow ${M(T, 0)[0].toLowerCase()}?`, "diamonds"),
    H2(P, "Ideas"), ...ul([`A referral reward for ${T.audience}`, `Show the ${T.offer} online`, `Partner with a local ${T.partner}`, `A monthly ${T.event}`]),
    H2(P, "Rate the ideas"),
    table([["Idea", "Impact", "Effort"], ["Referral reward", "High", "Low"], ["Online showcase", "Medium", "Medium"], ["Local partner", "High", "Medium"]], acc(P)),
    H2(P, "Next steps"), ...checks([["Pick the top two ideas", false], ["Test one idea for a month", false]]),
  ]),
  sop: (P, T) => doc("Standard operating procedure", [
    darkHero(P, "steps", "Standard Operating Procedure", `${T.offer[0].toUpperCase() + T.offer.slice(1)} · ${T.org}`, { size: 30 }),
    table([["Document", "Version", "Owner"], ["SOP-04", "1.2", T.person]], lined),
    H2(P, "Purpose"), p(`To make sure every team member delivers our ${T.offer} the same, safe way.`),
    H2(P, "Scope"), p(`All staff at ${T.org} in ${T.city}.`),
    band(P, "Procedure", "steps"),
    ...ul([`Greet the customer and check the booking`, "Explain what will happen and how long it takes", `Deliver the ${T.offer}`, "Record the result in the log", "Ask for feedback"], "number"),
    H2(P, "Daily checklist"), ...checks([["Area clean and safe", false], ["Supplies refilled", false], ["Log book signed", false]]),
  ]),
  "job-description": (P, T) => doc(`${T.role} job description`, [
    darkHero(P, "arc", T.role, `${T.org} · ${T.city} · Full time`, { size: 34 }),
    H2(P, "About us"), p(`${T.org} offers ${T.offer} to ${T.audience}. ${T.tagline}.`),
    band(P, "What you will do", "diamonds"),
    ...ul([`Lead the ${T.offer} day to day`, `Help launch the ${T.project}`, "Train and support new team members"]),
    band(P, "What you need", "diamonds"),
    ...checks([["Three or more years of similar work", false], ["Clear spoken and written English", false], ["Calm under pressure", false]]),
    H2(P, "What we offer"), table([["Benefit", "Details"], ["Salary", "Competitive, reviewed yearly"], ["Leave", "24 days a year"], ["Learning", "Paid courses"]], lined),
    H2(P, "How to apply"), p(`Send your CV to ${T.email} by 30 November.`),
  ]),
  "recommendation-letter": (P, T) => doc("Letter of recommendation", [
    lightHero(P, "leaves", "Letter of Recommendation", T.org, { font: "serif", size: 30 }),
    p("11 November 2026"), p(""), p("To whom it may concern,"),
    p(`It is a pleasure to recommend **${T.person2}**, who worked with me at ${T.org} for four years.`, { align: "justify" }),
    p(`${T.person2.split(" ")[0]} helped deliver our ${T.project} on time and was always kind and patient with ${T.audience}.`, { align: "justify" }),
    p("I recommend them without hesitation."),
    p(""), p("Yours sincerely,"), p(`**${T.person}**`), p(`${T.role}, ${T.org}`),
  ]),
  "travel-itinerary": (P, T) => doc("Travel itinerary", [
    darkHero(P, "waves", "Travel Itinerary", `${T.org} team trip · 3 days`),
    table([["Travellers", "Dates", "Contact"], [`${T.person}, ${T.person2}`, "4 to 6 December", T.email]], acc(P)),
    band(P, "Day 1 · Arrive", "dots"), ...ul(["Morning flight, check in by 2 pm", "Walk around the old town", "Dinner together"]),
    band(P, "Day 2 · Explore", "dots"), ...ul(["Guided tour", `Visit a local ${T.partner}`, "Free evening"]),
    band(P, "Day 3 · Return", "dots"), ...ul(["Breakfast and check out", "Afternoon flight home"]),
    H2(P, "Packing list"), ...checks([["ID cards and tickets", false], ["Warm jacket", false], ["Phone charger", false]]),
  ]),
  "research-report": (P, T) => doc(`${T.short} research report`, [
    darkHero(P, "dots", "Research Report", `What ${T.audience} want · ${T.org}`, { font: "serif", size: 36 }),
    H2(P, "Abstract", "serif"), quote(`We asked 300 ${T.audience} in ${T.city} what they value most. Speed, clear prices and friendly staff came first.`),
    H2(P, "Introduction", "serif"), p(`${T.org} wants to understand its ${T.audience} better before starting the ${T.project}.`),
    H2(P, "Method", "serif"), p("A short survey, ten interviews and two weeks of observation."),
    band(P, "Results", "circles"),
    table([["What matters most", "Share of answers"], ["Speed", "41%"], ["Clear prices", "33%"], ["Friendly staff", "26%"]], acc(P)),
    img(CHARTS.pie.svg(P.dark), 420),
    H2(P, "Conclusion", "serif"), p(`Faster service and clear prices should lead the ${T.project}.`),
  ]),
  "onboarding-guide": (P, T) => doc(`${T.short} onboarding guide`, [
    darkHero(P, "petals", "Welcome to the team", `Onboarding guide · ${T.org}`, { size: 34 }),
    p(`We are happy you are here. This guide helps you settle in at ${T.org} during your first week.`),
    band(P, "Your first week", "steps"),
    ...checks([["Meet your buddy", false], ["Get your login and keys", false], [`Shadow the ${T.offer}`, false], ["Lunch with the team", false]]),
    band(P, "People to know", "steps"),
    table([["Name", "Role", "Ask them about"], [T.person, T.role, "Your goals"], [T.person2, "Office lead", "Rooms and tools"], [T.person3, "Team member", "Day-to-day work"]], acc(P)),
    H2(P, "Questions"), H3(P, "When do I get paid?"), p("On the last working day of each month."),
  ]),
  invoice: (P, T) => doc(`${T.short} invoice`, [
    hero({ bg: P.dark, deco: "diamonds", dc: P.light, minh: 100, pad: 20 }, look("INVOICE", { color: P.cream, size: 30 }), look(`${T.org} · ${T.city}`, { color: P.light, size: 12 })),
    table([["Invoice no.", "Date", "Due"], ["INV-2026-118", "11 November 2026", "25 November 2026"]], lined),
    H2(P, "Bill to"), p(T.person2), p(`${T.city}`),
    table([["Item", "Qty", "Price (PKR)", "Amount (PKR)"], [T.offer[0].toUpperCase() + T.offer.slice(1), "1", "25,000", "25,000"], ["Extra support hours", "4", "2,500", "10,000"], ["**Total**", "", "", "**35,000**"]], acc(P)),
    H2(P, "Payment details"), p("Bank transfer to: Example Bank, account 0000 0000 0000."),
    p(`Thank you for choosing ${T.org}.`),
  ]),
};
