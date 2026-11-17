// Gym: members with plans, expiry and renewals, check-in desk, payments with receipts, trainers, class timetable
// and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, dayDiff, nowTime, num, sum, groupCount, groupSum, columnChart, barList } from "../shared/dash.js";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const addM = (day, months) => {
  const d = new Date(day + "T12:00:00");
  d.setMonth(d.getMonth() + num(months));
  return d.toISOString().slice(0, 10);
};
const stateOf = (m) => (m.frozen ? "Frozen" : !m.expiry ? "No plan" : m.expiry < today() ? "Expired" : dayDiff(m.expiry, today()) <= 7 ? "Expiring" : "Active");
const MTONE = { Active: "green", Expiring: "amber", Expired: "red", Frozen: "blue", "No plan": "gray" };
const inToday = (app, m) => app.db.checkins.some((c) => c.member === m.id && c.date === today());

function renew(app, m) {
  const plan = app.find("plans", m.plan);
  if (!plan) return app.toast("Choose a plan for this member first."), "keep";
  const from = m.expiry && m.expiry >= today() ? m.expiry : today();
  const amount = prompt(`Renew ${m.name} on ${plan.name} (${plan.months} month${num(plan.months) === 1 ? "" : "s"}). Amount received (PKR):`, String(plan.price));
  if (amount === null) return "keep";
  m.expiry = addM(from, plan.months);
  m.frozen = false;
  const p = app.upsert("payments", { receipt: app.nextNo("payments", "G-"), date: today(), member: m.id, amount: num(amount), method: "Cash", for: "Membership", note: `${plan.name} until ${fmtShort(m.expiry)}` });
  app.save();
  app.toast(`Renewed until ${fmtShort(m.expiry)}.`);
  if (confirm("Print the receipt?")) printReceipt(p, app);
}
function checkIn(app, m) {
  if (inToday(app, m)) return app.toast(`${m.name} already checked in today.`);
  app.upsert("checkins", { member: m.id, date: today(), time: nowTime() });
  const st = stateOf(m);
  app.toast(st === "Expired" ? `${m.name} checked in. Membership EXPIRED on ${fmtShort(m.expiry)}.` : st === "Expiring" ? `${m.name} checked in. Expires ${fmtShort(m.expiry)}.` : `${m.name} checked in.`);
}

const app = createApp({
  id: "gym",
  title: "Gym dashboard",
  brand: "Iron House Fitness",
  icon: "dumbbell",
  accent: "#ea580c",
  settings: [
    { key: "business", label: "Gym name", type: "text", default: "Iron House Fitness" },
    { key: "phone", label: "Phone", type: "phone", default: "0315 9998887" },
    { key: "address", label: "Address", type: "text", default: "Jinnah Avenue, Islamabad" },
    { key: "admission", label: "Admission fee (PKR)", type: "money", default: 3000 },
    { key: "timings", label: "Timings", type: "text", default: "6 AM – 11 PM · Ladies 11 AM – 3 PM" },
  ],
  entities: {
    members: {
      label: "Members",
      one: "Member",
      search: ["name", "phone", "no", "cnic"],
      title: (r) => r.name,
      badge: (r, app) => app.pill(stateOf(r), MTONE[stateOf(r)]) + " " + (r.expiry ? app.pill("until " + fmtShort(r.expiry), "gray") : "") + (inToday(app, r) ? " " + app.pill("In today", "teal") : ""),
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "no", label: "Member no.", type: "text", default: (app) => app.nextNo("members", "M-") },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "gender", label: "Gender", type: "select", options: ["Male", "Female"] },
        { key: "plan", label: "Plan", type: "relation", entity: "plans" },
        { key: "joined", label: "Joined", type: "date", default: today },
        { key: "expiry", label: "Paid until", type: "date", hint: "Renew moves this forward by the plan's months." },
        { key: "trainer", label: "Personal trainer", type: "relation", entity: "trainers" },
        { key: "goal", label: "Goal", type: "select", options: ["Weight loss", "Muscle gain", "General fitness", "Strength", "Rehab"] },
        { key: "weight", label: "Weight (kg)", type: "number" },
        { key: "emergency", label: "Emergency contact", type: "phone" },
        { key: "cnic", label: "CNIC", type: "text" },
        { key: "frozen", label: "Membership frozen", type: "bool" },
        { key: "notes", label: "Notes", type: "textarea", placeholder: "Injuries, medical conditions" },
      ],
      afterSave: (r, before, app) => {
        if (!before && r.plan && !r.expiry && confirm(`Take the first payment for ${r.name} now (plan + admission)?`)) {
          const plan = app.find("plans", r.plan);
          r.expiry = addM(today(), plan?.months || 1);
          app.upsert("payments", { receipt: app.nextNo("payments", "G-"), date: today(), member: r.id, amount: num(plan?.price) + num(app.setting("admission")), method: "Cash", for: "Admission + membership", note: `${plan?.name || ""} until ${fmtShort(r.expiry)}` });
        }
      },
      actions: [
        { label: "Check in", icon: "check", primary: true, when: (r, app) => !inToday(app, r), run: (r, app) => checkIn(app, r) },
        { label: "Renew", icon: "money", primary: true, run: (r, app) => renew(app, r) },
        { label: "Freeze", icon: "clock", when: (r) => !r.frozen, run: (r) => (r.frozen = true) },
        { label: "Unfreeze", icon: "clock", when: (r) => r.frozen, run: (r) => (r.frozen = false) },
        {
          label: "WhatsApp renewal reminder",
          icon: "wa",
          when: (r) => r.phone && ["Expiring", "Expired"].includes(stateOf(r)),
          run: (r, app) => (app.whatsapp(r.phone, `Hi ${r.name}! Your ${app.label("plans", r.plan) || "membership"} at ${app.setting("business")} ${stateOf(r) === "Expired" ? "expired on" : "ends on"} ${fmtShort(r.expiry)}. Renew at the front desk or reply here. See you at the gym!`), "keep"),
        },
        { label: "Membership card", icon: "print", run: (r, app) => (printCard(r, app), "keep") },
      ],
      related: (r, app) => {
        const pays = app.db.payments.filter((p) => p.member === r.id).sort((a, b) => b.date.localeCompare(a.date));
        const ins = app.db.checkins.filter((c) => c.member === r.id && c.date >= addDays(today(), -30));
        return `<div class="dx-related"><h3>Visits in the last 30 days: ${ins.length}</h3></div><div class="dx-related"><h3>Payments · ${esc(app.money(sum(pays, "amount")))}</h3>${app.list(pays.slice(0, 8), (p) => `<li>${app.openLink("payments", p, `<span class="dx-when">${esc(fmtShort(p.date))}</span><span class="dx-li-main"><b>${esc(app.money(p.amount))}</b><small>${esc(p.for || "")} · ${esc(p.note || "")}</small></span>`)}</li>`, "No payments yet.")}</div>`;
      },
    },
    plans: {
      label: "Plans",
      one: "Plan",
      search: ["name"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Plan", type: "text", required: true },
        { key: "months", label: "Months", type: "number", required: true, default: 1 },
        { key: "price", label: "Price (PKR)", type: "money", required: true },
        { key: "includes", label: "Includes", type: "text", placeholder: "Gym, cardio, steam…" },
      ],
    },
    payments: {
      label: "Payments",
      one: "Payment",
      search: ["receipt", (r, app) => app.label("members", r.member), "for"],
      title: (r, app) => `${r.receipt} · ${app.label("members", r.member)}`,
      fields: [
        { key: "receipt", label: "Receipt no.", type: "text", default: (app) => app.nextNo("payments", "G-") },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "member", label: "Member", type: "relation", entity: "members", required: true },
        { key: "amount", label: "Amount (PKR)", type: "money", required: true },
        { key: "for", label: "For", type: "select", options: ["Membership", "Admission + membership", "Personal training", "Supplements", "Locker", "Other"], default: "Membership" },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Card", "JazzCash", "Easypaisa", "Bank transfer"], default: "Cash" },
        { key: "note", label: "Note", type: "text" },
      ],
      actions: [{ label: "Print receipt", icon: "print", primary: true, run: (r, app) => (printReceipt(r, app), "keep") }],
    },
    checkins: {
      label: "Check-ins",
      one: "Check-in",
      hidden: true,
      title: (r, app) => `${app.label("members", r.member)} · ${fmtShort(r.date)} ${app.time(r.time)}`,
      fields: [
        { key: "member", label: "Member", type: "relation", entity: "members", required: true },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "time", label: "Time", type: "time", default: nowTime },
      ],
    },
    trainers: {
      label: "Trainers",
      one: "Trainer",
      search: ["name", "phone", "specialty"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "specialty", label: "Specialty", type: "text", placeholder: "Strength, cardio, yoga…" },
        { key: "ptFee", label: "Personal training fee (PKR / month)", type: "money" },
        { key: "salary", label: "Salary (PKR)", type: "money" },
      ],
      related: (r, app) => {
        const ms = app.db.members.filter((m) => m.trainer === r.id);
        return `<div class="dx-related"><h3>PT clients (${ms.length})</h3>${app.list(ms, (m) => `<li>${app.openLink("members", m, `<span class="dx-li-main"><b>${esc(m.name)}</b><small>${esc(m.goal || "")}</small></span>${app.pill(stateOf(m), MTONE[stateOf(m)])}`)}</li>`, "No clients.")}</div>`;
      },
    },
    classes: {
      label: "Classes",
      one: "Class",
      search: ["name"],
      title: (r) => `${r.name} · ${r.day} ${r.time}`,
      fields: [
        { key: "name", label: "Class", type: "text", required: true, placeholder: "e.g. Zumba" },
        { key: "day", label: "Day", type: "select", options: WEEK, required: true },
        { key: "time", label: "Time", type: "time", required: true, default: "18:00" },
        { key: "minutes", label: "Minutes", type: "number", default: 45 },
        { key: "trainer", label: "Trainer", type: "relation", entity: "trainers" },
        { key: "capacity", label: "Places", type: "number", default: 20 },
        { key: "who", label: "For", type: "select", options: ["Everyone", "Ladies", "Gents"], default: "Everyone" },
      ],
    },
  },
  onAction: (code, app) => {
    const [a, id] = code.split(":");
    if (a === "cin") {
      const m = app.find("members", id);
      if (m) checkIn(app, m);
      app.save();
      return app.refresh();
    }
  },
  onChange: () => {},
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "ci", label: "Check-in desk", primary: true, icon: "check", run: (app) => app.go("desk") },
        { id: "m", label: "New member", new: "members", icon: "user" },
      ],
      kpis: (db, app) => {
        const active = db.members.filter((m) => ["Active", "Expiring"].includes(stateOf(m)));
        const exp = db.members.filter((m) => stateOf(m) === "Expiring");
        return [
          { label: "Active members", value: active.length, note: `${db.members.filter((m) => stateOf(m) === "Expired").length} expired`, icon: "users", go: "members", tone: "good" },
          { label: "Expiring in 7 days", value: exp.length, note: "remind them to renew", icon: "bell", tone: exp.length ? "warn" : "", go: "members" },
          { label: "Check-ins today", value: db.checkins.filter((c) => c.date === today()).length, icon: "check", go: "desk" },
          { label: "Collected this month", value: app.money(sum(db.payments.filter((p) => monthOf(p.date) === thisMonth()), "amount")), icon: "money", go: "payments" },
        ];
      },
      blocks: (db, app) => {
        const hours = Array.from({ length: 18 }, (_, i) => i + 6);
        const byHour = hours.map((h) => ({ label: `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`, value: db.checkins.filter((c) => c.date >= addDays(today(), -30) && Number(String(c.time).slice(0, 2)) === h).length }));
        const exp = db.members.filter((m) => ["Expiring", "Expired"].includes(stateOf(m)) && m.expiry >= addDays(today(), -14)).sort((a, b) => a.expiry.localeCompare(b.expiry));
        const ins = db.checkins.filter((c) => c.date === today()).sort((a, b) => b.time.localeCompare(a.time));
        return [
          { title: "Busy hours", note: "check-ins, last 30 days", html: columnChart(byHour, { labelEvery: 3 }), table: byHour.map((d) => [d.label, d.value]) },
          { title: "Renew soon", note: "expiring or just expired", go: "members", html: app.list(exp.slice(0, 8), (m) => `<li>${app.openLink("members", m, `<span class="dx-when">${esc(fmtShort(m.expiry))}</span><span class="dx-li-main"><b>${esc(m.name)}</b><small>${esc(app.label("plans", m.plan))} · ${esc(m.phone || "")}</small></span>${app.pill(stateOf(m), MTONE[stateOf(m)])}`)}</li>`, "Nobody due.") },
          { title: "In today", go: "desk", html: app.list(ins.slice(0, 10), (c) => `<li><span class="dx-row-btn" style="cursor:default"><span class="dx-when">${esc(app.time(c.time))}</span><span class="dx-li-main"><b>${esc(app.label("members", c.member))}</b></span></span></li>`, "No check-ins yet today.") },
          { title: "Members by plan", html: barList(groupCount(db.members.filter((m) => ["Active", "Expiring"].includes(stateOf(m))), (m) => app.label("plans", m.plan))) },
        ];
      },
    },
    {
      id: "desk",
      label: "Check-in desk",
      icon: "check",
      type: "custom",
      render: (app, s) => {
        const q = (s.q || "").toLowerCase();
        const hits = q.length >= 1 ? app.db.members.filter((m) => [m.name, m.phone, m.no].join(" ").toLowerCase().includes(q)).slice(0, 8) : [];
        const ins = app.db.checkins.filter((c) => c.date === today()).sort((a, b) => b.time.localeCompare(a.time));
        return `<section class="dx-card"><label class="dx-q" style="max-width:520px;font-size:17px">${app.icon("search")}<input type="search" data-q="desk" value="${esc(s.q || "")}" placeholder="Member name, phone or number" aria-label="Find a member" autofocus></label><div style="margin-top:12px">${
          q
            ? app.list(hits, (m) => `<li style="display:flex;align-items:center;gap:8px">${app.openLink("members", m, `<span class="dx-av">${esc(m.name.split(" ").map((x) => x[0]).join("").slice(0, 2))}</span><span class="dx-li-main"><b>${esc(m.name)}</b><small>${esc(m.no)} · ${esc(app.label("plans", m.plan) || "No plan")} · until ${esc(m.expiry ? fmtShort(m.expiry) : "—")}</small></span>${app.pill(stateOf(m), MTONE[stateOf(m)])}`)}${inToday(app, m) ? app.pill("In today", "teal") : `<button type="button" class="dx-btn primary" data-x="cin:${m.id}">${app.icon("check")}Check in</button>`}</li>`, "No member found. Add them with New member.")
            : '<p class="dx-intro">Type a few letters of the name or phone, then press Check in. Expired members are flagged.</p>'
        }</div></section><section class="dx-card" style="margin-top:14px"><div class="dx-card-h"><h2>Checked in today</h2><span>${ins.length}</span></div>${app.list(ins, (c) => {
          const m = app.find("members", c.member) || {};
          return `<li>${app.openLink("members", m, `<span class="dx-when">${esc(app.time(c.time))}</span><span class="dx-li-main"><b>${esc(m.name || "?")}</b><small>${esc(app.label("plans", m.plan))}</small></span>${app.pill(stateOf(m), MTONE[stateOf(m)])}`)}</li>`;
        }, "Nobody yet.")}</section>`;
      },
      mounted: (el) => {
        const i = el.querySelector('[data-q="desk"]');
        if (i && !i.value) i.focus();
      },
    },
    {
      id: "members",
      label: "Members",
      icon: "users",
      type: "table",
      entity: "members",
      sort: "expiry",
      filters: [
        { key: "state", label: "Status", options: ["Active", "Expiring", "Expired", "Frozen", "No plan"], test: (r, v) => stateOf(r) === v },
        { key: "plan", label: "Plan", options: (app) => app.db.plans.map((p) => ({ value: p.id, label: p.name })) },
        { key: "gender", label: "Gender", options: ["Male", "Female"] },
      ],
      columns: [
        { key: "no", label: "No." },
        { key: "name", label: "Member", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Mobile" },
        { key: "plan", label: "Plan" },
        { key: "expiry", label: "Paid until", date: true },
        { key: "state", label: "Status", get: (r) => stateOf(r), html: (r, app) => app.pill(stateOf(r), MTONE[stateOf(r)]) },
        { key: "visits", label: "Visits (30 d)", right: true, get: (r, app) => app.db.checkins.filter((c) => c.member === r.id && c.date >= addDays(today(), -30)).length },
      ],
      badge: (db) => db.members.filter((m) => stateOf(m) === "Expiring").length,
    },
    {
      id: "payments",
      label: "Payments",
      icon: "money",
      type: "table",
      entity: "payments",
      sort: "date",
      dir: -1,
      filters: [
        { key: "for", label: "For", options: ["Membership", "Admission + membership", "Personal training", "Supplements", "Locker", "Other"] },
        { key: "m", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })), test: (r, v) => monthOf(r.date) === v },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, "amount")))}</b>`,
      columns: [
        { key: "receipt", label: "Receipt", html: (r) => `<b>${esc(r.receipt)}</b>` },
        { key: "date", label: "Date", date: true },
        { key: "member", label: "Member" },
        { key: "for", label: "For" },
        { key: "amount", label: "Amount", money: true, right: true },
        { key: "method", label: "Paid by" },
      ],
    },
    {
      id: "plans",
      label: "Plans",
      icon: "star",
      type: "table",
      entity: "plans",
      sort: "months",
      columns: [
        { key: "name", label: "Plan", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "months", label: "Months", right: true },
        { key: "price", label: "Price", money: true, right: true },
        { key: "permonth", label: "Per month", right: true, get: (r) => Math.round(num(r.price) / Math.max(1, num(r.months))), html: (r, app) => esc(app.money(num(r.price) / Math.max(1, num(r.months)))) },
        { key: "members", label: "Active members", right: true, get: (r, app) => app.db.members.filter((m) => m.plan === r.id && ["Active", "Expiring"].includes(stateOf(m))).length },
        { key: "includes", label: "Includes" },
      ],
    },
    {
      id: "classes",
      label: "Class timetable",
      icon: "calendar",
      type: "custom",
      render: (app) => {
        const rows = app.db.classes.slice().sort((a, b) => a.time.localeCompare(b.time));
        return `<div class="dx-tools"><span class="dx-intro" style="margin:0">Weekly classes. Tap one to edit.</span><span class="dx-grow"></span><button type="button" class="dx-btn primary" data-x="new:classes">${app.icon("plus")}New class</button></div><div class="gy-week">${WEEK.map(
          (d) =>
            `<section class="dx-card"><div class="dx-card-h"><h2>${d}</h2></div>${rows
              .filter((c) => c.day === d)
              .map((c) => `<button type="button" class="gy-class" data-open="classes:${c.id}"><b>${esc(c.name)}</b><small>${esc(app.time(c.time))} · ${num(c.minutes)} min</small><small>${esc(app.label("trainers", c.trainer) || "")}${c.who !== "Everyone" ? " · " + esc(c.who) : ""}</small></button>`)
              .join("") || '<div class="dx-empty">No classes</div>'}</section>`,
        ).join("")}</div><style>.gy-week{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.gy-class{display:grid;gap:2px;width:100%;margin-bottom:8px;padding:9px 10px;border:0;border-left:3px solid var(--acc);border-radius:9px;background:var(--soft);text-align:left;cursor:pointer}.gy-class small{color:var(--ink-2)}</style>`;
      },
    },
    {
      id: "trainers",
      label: "Trainers",
      icon: "user",
      type: "table",
      entity: "trainers",
      sort: "name",
      columns: [
        { key: "name", label: "Trainer", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Mobile" },
        { key: "specialty", label: "Specialty" },
        { key: "clients", label: "PT clients", right: true, get: (r, app) => app.db.members.filter((m) => m.trainer === r.id).length },
        { key: "ptFee", label: "PT fee", money: true, right: true },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const rev = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.payments.filter((p) => monthOf(p.date) === m), "amount") }));
        const joined = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: db.members.filter((x) => monthOf(x.joined) === m).length }));
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({ label: d, value: db.checkins.filter((c) => c.date >= addDays(today(), -30) && new Date(c.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" }) === d).length }));
        const lapsed = db.members.filter((m) => stateOf(m) === "Expired" && m.expiry >= addDays(today(), -60));
        return [
          { title: "Money collected", html: columnChart(rev, { fmt: (v) => app.moneyShort(v) }), table: rev.map((d) => [d.label, app.money(d.value)]) },
          { title: "New members", html: columnChart(joined), table: joined.map((d) => [d.label, d.value]) },
          { title: "Busiest days", note: "30 days", html: barList(days.sort((a, b) => b.value - a.value), { max: 7 }) },
          { title: "Income by type", note: "6 months", html: barList(groupSum(db.payments.filter((p) => p.date >= addDays(today(), -183)), (p) => p.for, (p) => p.amount), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Lapsed in the last 60 days", note: "win them back", html: app.list(lapsed.slice(0, 8), (m) => `<li>${app.openLink("members", m, `<span class="dx-when">${esc(fmtShort(m.expiry))}</span><span class="dx-li-main"><b>${esc(m.name)}</b><small>${esc(m.phone || "")}</small></span>`)}</li>`, "Nobody lapsed.") },
          { title: "Members by goal", html: barList(groupCount(db.members, (m) => m.goal)) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const plans = [
      ["Monthly", 1, 4500, "Gym + cardio"],
      ["Quarterly", 3, 12000, "Gym + cardio"],
      ["Six months", 6, 22000, "Gym + cardio + steam"],
      ["Yearly", 12, 40000, "Everything + 2 PT sessions"],
      ["Ladies monthly", 1, 4000, "Ladies timing, classes"],
    ].map(([name, months, price, includes], i) => ({ id: "p" + i, name, months, price, includes }));
    const trainers = [
      ["Coach Waqas", "Strength"],
      ["Coach Faisal", "Weight loss, cardio"],
      ["Coach Sana", "Ladies fitness, yoga"],
    ].map(([name, specialty], i) => ({ id: "t" + i, name, specialty, phone: h.phone(), ptFee: 8000 + i * 1000, salary: 60000 }));
    const members = Array.from({ length: 64 }, (_, i) => {
      const g = h.rand() < 0.3 ? "Female" : "Male";
      const plan = g === "Female" && h.rand() < 0.5 ? plans[4] : h.pick(plans.slice(0, 4));
      const joined = h.day(-h.int(5, 400));
      const expiry = h.day(h.int(-50, 120));
      return { id: "m" + i, name: h.person(g === "Female" ? "f" : "m"), no: "M-" + String(i + 1).padStart(4, "0"), phone: h.phone(), gender: g, plan: plan.id, joined, expiry: i < 5 ? h.day(h.int(1, 6)) : expiry, trainer: h.rand() < 0.2 ? h.pick(trainers).id : "", goal: h.pick(["Weight loss", "Muscle gain", "General fitness", "Strength"]), weight: h.int(52, 105) };
    });
    const payments = [];
    let n = 0;
    for (const m of members) {
      const plan = plans.find((p) => p.id === m.plan);
      let d = m.joined;
      let first = true;
      while (d <= today() && d <= m.expiry) {
        n++;
        payments.push({ receipt: "G-" + String(n).padStart(4, "0"), date: d, member: m.id, amount: plan.price + (first ? 3000 : 0), method: h.pick(["Cash", "Cash", "JazzCash", "Card"]), for: first ? "Admission + membership" : "Membership", note: plan.name });
        first = false;
        d = addM(d, plan.months);
      }
    }
    const checkins = [];
    for (let k = 30; k >= 0; k--) {
      const day = h.day(-k);
      for (const m of members) {
        if (m.expiry < day || h.rand() > 0.45) continue;
        const hour = h.pick([6, 7, 7, 8, 11, 12, 17, 18, 18, 19, 19, 20, 21, 22]);
        const time = `${String(hour).padStart(2, "0")}:${String(h.int(0, 59)).padStart(2, "0")}`;
        if (k === 0 && time > nowTime()) continue;
        checkins.push({ member: m.id, date: day, time });
      }
    }
    const classes = [
      ["Zumba", "Mon", "18:00", 2, "Ladies"],
      ["HIIT", "Tue", "19:00", 1, "Everyone"],
      ["Yoga", "Wed", "11:30", 2, "Ladies"],
      ["CrossFit", "Thu", "20:00", 0, "Gents"],
      ["Spinning", "Fri", "18:30", 1, "Everyone"],
      ["Core blast", "Sat", "10:00", 0, "Everyone"],
      ["Zumba", "Sat", "12:00", 2, "Ladies"],
    ].map(([name, day, time, t, who]) => ({ name, day, time, minutes: 45, trainer: trainers[t].id, capacity: 20, who }));
    return { plans, trainers, members, payments, checkins, classes };
  },
});

function printReceipt(p, app) {
  const m = app.find("members", p.member) || {};
  app.print("Receipt", `<div class="dx-doc-meta"><div><b>Receipt:</b> ${esc(p.receipt)}</div><div><b>Date:</b> ${esc(app.date(p.date))}</div><div><b>Member:</b> ${esc(m.name || "")} (${esc(m.no || "")})</div><div><b>For:</b> ${esc(p.for || "")}${p.note ? " · " + esc(p.note) : ""}</div><div><b>Paid by:</b> ${esc(p.method || "")}</div><div><b>Valid until:</b> ${esc(m.expiry ? app.date(m.expiry) : "—")}</div></div><div class="dx-doc-sum"><div class="dx-doc-grand"><span>Received</span><b>${esc(app.money(p.amount))}</b></div></div><p style="text-align:center;margin-top:16px">${esc(app.setting("timings"))}</p>`);
}
function printCard(m, app) {
  app.print("Membership card", `<div style="width:86mm;padding:12px;border:2px solid #000;border-radius:10px"><div style="font-size:16px;font-weight:800">${esc(app.setting("business"))}</div><div style="font-size:20px;margin:10px 0 4px"><b>${esc(m.name)}</b></div><div>Member no. <b>${esc(m.no)}</b></div><div>${esc(app.label("plans", m.plan))} · valid until <b>${esc(m.expiry ? app.date(m.expiry) : "—")}</b></div><div style="margin-top:6px;font-size:11px">${esc(app.setting("timings"))} · ${esc(app.setting("phone"))}</div></div>`);
}

export default app;
