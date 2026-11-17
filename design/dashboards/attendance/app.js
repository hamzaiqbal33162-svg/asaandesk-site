// Attendance and payroll: one-tap daily attendance, monthly sheet, employees, leaves, advances, salaries worked out
// from attendance (absent, half day, late rule, unpaid leave, advances), payslips and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, dayName, nowTime, num, sum, groupCount, groupSum, columnChart, barList } from "../shared/dash.js";

const CODES = [
  { value: "P", label: "Present", tone: "green" },
  { value: "Late", label: "Late", tone: "amber" },
  { value: "H", label: "Half day", tone: "purple" },
  { value: "L", label: "Leave", tone: "blue" },
  { value: "A", label: "Absent", tone: "red" },
];
const CTONE = Object.fromEntries(CODES.map((c) => [c.value, c.tone]));
const DEPTS = ["Admin", "Sales", "Production", "Accounts", "Store", "Security", "Delivery"];
const daysIn = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
const active = (app) => app.db.employees.filter((e) => e.status !== "Left");
const recOf = (app, emp, day) => app.db.attendance.find((a) => a.employee === emp && a.date === day);
const onLeave = (app, emp, day) => app.db.leaves.find((l) => l.employee === emp && l.status === "Approved" && l.from <= day && l.to >= day);
const codeOf = (app, emp, day) => recOf(app, emp, day)?.status || (onLeave(app, emp, day) ? "L" : "");

function mark(app, emp, day, status, time) {
  let r = recOf(app, emp, day);
  if (!r) {
    r = { id: Math.random().toString(36).slice(2), created: Date.now(), employee: emp, date: day };
    app.db.attendance.push(r);
  }
  r.status = status;
  if (["P", "Late", "H"].includes(status) && !r.in) r.in = time || (day === today() ? nowTime() : app.setting("start"));
  if (["A", "L"].includes(status)) r.in = "";
  if (status === "P" && r.in && r.in > app.setting("lateAfter")) r.status = "Late";
  return r;
}

function monthSummary(app, emp, month) {
  const n = daysIn(month);
  const off = app.setting("off");
  const out = { P: 0, Late: 0, H: 0, L: 0, A: 0, unpaid: 0, unmarked: 0 };
  for (let d = 1; d <= n; d++) {
    const day = `${month}-${String(d).padStart(2, "0")}`;
    if (day > today()) break;
    if (dayName(day) === off) continue;
    const c = codeOf(app, emp, day);
    if (c) out[c]++;
    else out.unmarked++;
    const lv = onLeave(app, emp, day);
    if (lv && lv.type === "Unpaid" && (c === "L" || !c)) out.unpaid++;
  }
  return out;
}

function workOut(app, e, month) {
  const s = monthSummary(app, e.id, month);
  const W = num(app.setting("workDays")) || 26;
  const daily = num(e.salary) / W;
  const lateDays = Math.floor(s.Late / (num(app.setting("lateRule")) || 3));
  const cutDays = s.A + s.unpaid + s.H * 0.5 + lateDays;
  const deduction = Math.round(cutDays * daily);
  const advance = sum(app.db.advances.filter((a) => a.employee === e.id && a.deduct === month), "amount");
  return { month, employee: e.id, basic: num(e.salary), allowance: num(e.allowance), present: s.P + s.Late, absent: s.A, half: s.H, late: s.Late, leave: s.L, unpaid: s.unpaid, cutDays, deduction, advance, overtime: 0, net: Math.max(0, num(e.salary) + num(e.allowance) - deduction - advance) };
}

const app = createApp({
  id: "attendance",
  title: "Attendance and payroll",
  brand: "Al-Barkat Industries",
  icon: "clock",
  accent: "#0e7490",
  settings: [
    { key: "business", label: "Company name", type: "text", default: "Al-Barkat Industries" },
    { key: "phone", label: "Phone", type: "phone", default: "042 37001122" },
    { key: "address", label: "Address", type: "text", default: "Sundar Industrial Estate, Lahore" },
    { key: "start", label: "Duty starts at", type: "time", default: "09:00" },
    { key: "lateAfter", label: "Late after", type: "time", default: "09:15" },
    { key: "lateRule", label: "Lates that count as one absent", type: "number", default: 3 },
    { key: "workDays", label: "Working days for daily rate", type: "number", default: 26 },
    { key: "off", label: "Weekly off", type: "select", options: ["Sun", "Fri", "Sat"], default: "Sun" },
  ],
  entities: {
    employees: {
      label: "Employees",
      one: "Employee",
      search: ["name", "code", "department", "designation", "phone", "cnic"],
      title: (r) => r.name,
      badge: (r, app) => app.pill(r.department || "—", "blue") + " " + (r.status === "Left" ? app.pill("Left", "gray") : app.pill(CODES.find((c) => c.value === codeOf(app, r.id, today()))?.label || "Not marked today", CTONE[codeOf(app, r.id, today())] || "gray")),
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "code", label: "Employee no.", type: "text", default: (app) => app.nextNo("employees", "E-") },
        { key: "department", label: "Department", type: "select", options: DEPTS },
        { key: "designation", label: "Designation", type: "text" },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "cnic", label: "CNIC", type: "text", placeholder: "35202-1234567-1" },
        { key: "joined", label: "Joined", type: "date", default: today },
        { key: "salary", label: "Basic salary (PKR / month)", type: "money", required: true },
        { key: "allowance", label: "Allowances (PKR / month)", type: "money", default: 0 },
        { key: "bank", label: "Bank account", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["Active", "Left"], default: "Active" },
      ],
      actions: [
        { label: "Give advance", icon: "money", run: (r, app) => (app.open("advances", "", true, { employee: r.id }), "keep") },
        { label: "Add leave", icon: "calendar", run: (r, app) => (app.open("leaves", "", true, { employee: r.id }), "keep") },
      ],
      related: (r, app) => {
        const m = monthSummary(app, r.id, thisMonth());
        const adv = app.db.advances.filter((a) => a.employee === r.id).sort((a, b) => b.date.localeCompare(a.date));
        return `<div class="dx-related"><h3>${esc(fmtMonth(thisMonth()))} so far</h3><dl class="dx-dl"><div><dt>Present</dt><dd>${m.P}</dd></div><div><dt>Late</dt><dd>${m.Late}</dd></div><div><dt>Half days</dt><dd>${m.H}</dd></div><div><dt>Leave</dt><dd>${m.L}</dd></div><div><dt>Absent</dt><dd>${m.A}</dd></div><div><dt>Not marked</dt><dd>${m.unmarked}</dd></div></dl></div><div class="dx-related"><h3>Advances</h3>${app.list(adv.slice(0, 6), (a) => `<li>${app.openLink("advances", a, `<span class="dx-when">${esc(fmtShort(a.date))}</span><span class="dx-li-main"><b>${esc(app.money(a.amount))}</b><small>deduct in ${esc(fmtMonth(a.deduct))}</small></span>`)}</li>`, "No advances.")}</div>`;
      },
    },
    attendance: {
      label: "Attendance",
      one: "Attendance",
      hidden: true,
      search: [(r, app) => app.label("employees", r.employee)],
      title: (r, app) => `${app.label("employees", r.employee)} · ${fmtShort(r.date)}`,
      fields: [
        { key: "employee", label: "Employee", type: "relation", entity: "employees", required: true },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "status", label: "Status", type: "select", options: CODES, required: true, default: "P" },
        { key: "in", label: "In", type: "time" },
        { key: "out", label: "Out", type: "time" },
      ],
    },
    leaves: {
      label: "Leaves",
      one: "Leave",
      search: [(r, app) => app.label("employees", r.employee), "type", "reason"],
      title: (r, app) => `${app.label("employees", r.employee)} · ${r.type} leave`,
      badge: (r, app) => app.pill(r.status, { Pending: "amber", Approved: "green", Rejected: "red" }[r.status]),
      fields: [
        { key: "employee", label: "Employee", type: "relation", entity: "employees", required: true },
        { key: "type", label: "Type", type: "select", options: ["Casual", "Sick", "Annual", "Unpaid"], default: "Casual" },
        { key: "from", label: "From", type: "date", required: true, default: today },
        { key: "to", label: "To", type: "date", required: true, default: today },
        { key: "reason", label: "Reason", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected"], default: "Pending" },
      ],
      beforeSave: (r) => {
        if (r.to < r.from) return "The end date is before the start date.";
      },
      actions: [
        { label: "Approve", icon: "check", primary: true, when: (r) => r.status === "Pending", run: (r) => (r.status = "Approved") },
        { label: "Reject", icon: "close", when: (r) => r.status === "Pending", run: (r) => (r.status = "Rejected") },
      ],
    },
    advances: {
      label: "Advances",
      one: "Advance",
      search: [(r, app) => app.label("employees", r.employee), "note"],
      title: (r, app) => `${app.label("employees", r.employee)} · ${app.money(r.amount)}`,
      fields: [
        { key: "employee", label: "Employee", type: "relation", entity: "employees", required: true },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "amount", label: "Amount (PKR)", type: "money", required: true },
        { key: "deduct", label: "Deduct from salary of", type: "select", options: () => Array.from({ length: 4 }, (_, i) => ({ value: addMonths(thisMonth(), i), label: fmtMonth(addMonths(thisMonth(), i)) })), default: thisMonth },
        { key: "note", label: "Note", type: "text" },
      ],
    },
    payroll: {
      label: "Payroll",
      one: "Salary",
      search: [(r, app) => app.label("employees", r.employee), "month"],
      title: (r, app) => `${app.label("employees", r.employee)} · ${fmtMonth(r.month)}`,
      badge: (r, app) => app.pill(r.paid ? "Paid" : "Not paid", r.paid ? "green" : "amber"),
      fields: [
        { key: "employee", label: "Employee", type: "relation", entity: "employees", required: true },
        { key: "month", label: "Month", type: "text", required: true, default: thisMonth },
        { key: "basic", label: "Basic", type: "money" },
        { key: "allowance", label: "Allowances", type: "money" },
        { key: "overtime", label: "Overtime / bonus", type: "money" },
        { key: "deduction", label: "Absence deduction", type: "money" },
        { key: "advance", label: "Advance deducted", type: "money" },
        { key: "net", label: "Net pay", type: "money", hideInView: false },
        { key: "paid", label: "Paid", type: "bool" },
        { key: "method", label: "Paid by", type: "select", options: ["Bank transfer", "Cash", "Cheque"] },
      ],
      beforeSave: (r) => {
        r.net = Math.max(0, num(r.basic) + num(r.allowance) + num(r.overtime) - num(r.deduction) - num(r.advance));
      },
      actions: [
        { label: "Mark paid", icon: "check", primary: true, when: (r) => !r.paid, run: (r) => ((r.paid = true), (r.paidOn = today()), (r.method ||= "Bank transfer")) },
        { label: "Print payslip", icon: "print", run: (r, app) => (printSlips([r], app), "keep") },
      ],
    },
  },
  onAction: (code, app) => {
    const [a, emp, status] = code.split(":");
    const s = app.ui.today;
    if (a === "att") {
      mark(app, emp, s.day, status);
      app.save();
      return app.refresh();
    }
    if (a === "allp") {
      let n = 0;
      for (const e of active(app)) if (!codeOf(app, e.id, s.day)) mark(app, e.id, s.day, "P", app.setting("start")), n++;
      app.save();
      app.refresh();
      return app.toast(`Marked ${n} as present.`);
    }
    if (a === "sheetprint") return printSheet(app, app.ui.sheet.month || thisMonth());
  },
  onChange: (ev, app) => {
    const t = ev.target;
    if (t.dataset.day) {
      app.ui.today.day = t.value || today();
      return app.refresh();
    }
    if (t.dataset.in) {
      const r = mark(app, t.dataset.in, app.ui.today.day, codeOf(app, t.dataset.in, app.ui.today.day) || "P", t.value);
      r.in = t.value;
      r.status = r.status === "P" || r.status === "Late" ? (t.value > app.setting("lateAfter") ? "Late" : "P") : r.status;
      app.save();
      return app.refresh();
    }
    if (t.dataset.out) {
      const r = recOf(app, t.dataset.out, app.ui.today.day);
      if (r) r.out = t.value;
      app.save();
      return;
    }
    if (t.dataset.sheet) {
      app.ui.sheet.month = t.value;
      return app.refresh();
    }
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [{ id: "t", label: "Mark today's attendance", primary: true, icon: "check", run: (app) => app.go("today") }],
      kpis: (db, app) => {
        const emps = active(app);
        const c = (k) => emps.filter((e) => codeOf(app, e.id, today()) === k).length;
        return [
          { label: "Present today", value: `${c("P") + c("Late") + c("H")} / ${emps.length}`, note: `${c("Late")} late · ${emps.length - c("P") - c("Late") - c("H") - c("A") - c("L")} not marked`, icon: "check", go: "today", tone: "good" },
          { label: "Absent today", value: c("A"), icon: "close", tone: c("A") ? "warn" : "", go: "today" },
          { label: "On leave", value: c("L"), note: `${db.leaves.filter((l) => l.status === "Pending").length} requests waiting`, icon: "calendar", go: "leaves" },
          { label: "Salaries this month", value: app.moneyShort(sum(emps, (e) => num(e.salary) + num(e.allowance))), note: "basic + allowances", icon: "money", go: "payroll" },
        ];
      },
      blocks: (db, app) => {
        const days = [];
        for (let i = 29; i >= 0; i--) {
          const d = addDays(today(), -i);
          if (dayName(d) !== app.setting("off")) days.push(d);
        }
        const emps = active(app);
        const rate = days.slice(-20).map((d) => ({ label: fmtShort(d), value: emps.length ? Math.round((emps.filter((e) => ["P", "Late", "H"].includes(codeOf(app, e.id, d))).length / emps.length) * 100) : 0 }));
        const away = emps.filter((e) => ["A", "L"].includes(codeOf(app, e.id, today())));
        const lates = groupCount(db.attendance.filter((a) => a.status === "Late" && monthOf(a.date) === thisMonth()), (a) => app.label("employees", a.employee));
        return [
          { title: "Attendance rate", note: "% present, working days", html: columnChart(rate, { fmt: (v) => v + "%" }), table: rate.map((d) => [d.label, d.value + "%"]) },
          { title: "Not in today", go: "today", html: app.list(away, (e) => `<li>${app.openLink("employees", e, `<span class="dx-li-main"><b>${esc(e.name)}</b><small>${esc(e.department || "")} · ${esc(e.designation || "")}</small></span>${app.pill(codeOf(app, e.id, today()) === "L" ? "Leave" : "Absent", codeOf(app, e.id, today()) === "L" ? "blue" : "red")}`)}</li>`, "Everyone is in.") },
          { title: "Most late this month", html: barList(lates) },
          { title: "Leave requests", go: "leaves", html: app.list(db.leaves.filter((l) => l.status === "Pending"), (l) => `<li>${app.openLink("leaves", l, `<span class="dx-when">${esc(fmtShort(l.from))}</span><span class="dx-li-main"><b>${esc(app.label("employees", l.employee))}</b><small>${esc(l.type)} · to ${esc(fmtShort(l.to))}${l.reason ? " · " + esc(l.reason) : ""}</small></span>`)}</li>`, "No requests waiting.") },
        ];
      },
    },
    {
      id: "today",
      label: "Daily attendance",
      icon: "check",
      type: "custom",
      render: (app, s) => {
        s.day ||= today();
        const emps = active(app).slice().sort((a, b) => (a.department || "").localeCompare(b.department || "") || a.name.localeCompare(b.name));
        const counts = CODES.map((c) => `${app.pill(`${c.label} ${emps.filter((e) => codeOf(app, e.id, s.day) === c.value).length}`, c.tone)}`).join(" ");
        const off = dayName(s.day) === app.setting("off");
        return `<div class="dx-tools"><label class="dx-inline">Date <input type="date" data-day="1" value="${esc(s.day)}" max="${today()}"></label><span>${counts}</span><span class="dx-grow"></span><button type="button" class="dx-btn primary" data-x="allp">${app.icon("check")}Mark the rest present</button></div>${off ? `<p class="dx-intro">${esc(dayName(s.day))} is the weekly off.</p>` : ""}<div class="dx-table-wrap"><table class="dx-table at-table"><thead><tr><th><button type="button">Employee</button></th><th><button type="button">Status</button></th><th><button type="button">In</button></th><th><button type="button">Out</button></th></tr></thead><tbody>${emps
          .map((e) => {
            const r = recOf(app, e.id, s.day);
            const code = codeOf(app, e.id, s.day);
            return `<tr><td><button type="button" class="dx-link" data-open="employees:${e.id}" style="text-decoration:none;color:inherit"><b>${esc(e.name)}</b></button><br><small style="color:var(--ink-3)">${esc(e.department || "")} · ${esc(e.code || "")}</small></td><td><div class="dx-seg at-seg">${CODES.map((c) => `<button type="button" data-x="att:${e.id}:${c.value}" class="${code === c.value ? "on " + c.tone : ""}" aria-pressed="${code === c.value}" title="${c.label}">${c.value === "Late" ? "Late" : c.value}</button>`).join("")}</div></td><td><input type="time" data-in="${e.id}" value="${esc(r?.in || "")}" aria-label="In time for ${esc(e.name)}"></td><td><input type="time" data-out="${e.id}" value="${esc(r?.out || "")}" aria-label="Out time for ${esc(e.name)}"></td></tr>`;
          })
          .join("")}</tbody></table></div><p class="dx-count">P present · Late after ${esc(app.time(app.setting("lateAfter")))} · H half day · L leave · A absent. Approved leave shows as L by itself.</p><style>.at-table td{white-space:normal}.at-table input{padding:6px 8px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--ink)}.at-seg button{min-width:38px;justify-content:center}.at-seg button.on.green{background:color-mix(in srgb,var(--green) 22%,var(--panel))}.at-seg button.on.amber{background:color-mix(in srgb,var(--amber) 24%,var(--panel))}.at-seg button.on.purple{background:color-mix(in srgb,var(--purple) 22%,var(--panel))}.at-seg button.on.blue{background:color-mix(in srgb,var(--blue) 22%,var(--panel))}.at-seg button.on.red{background:color-mix(in srgb,var(--red) 22%,var(--panel))}</style>`;
      },
    },
    {
      id: "sheet",
      label: "Monthly sheet",
      icon: "grid",
      type: "custom",
      render: (app, s) => {
        s.month ||= thisMonth();
        const n = daysIn(s.month);
        const days = Array.from({ length: n }, (_, i) => `${s.month}-${String(i + 1).padStart(2, "0")}`);
        const emps = active(app);
        return `<div class="dx-tools"><label class="dx-inline">Month <select data-sheet="1">${Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), -i)).map((m) => `<option value="${m}" ${m === s.month ? "selected" : ""}>${fmtMonth(m)}</option>`).join("")}</select></label><span class="dx-grow"></span><button type="button" class="dx-btn" data-x="sheetprint">${app.icon("print")}Print</button></div><div class="dx-table-wrap"><table class="dx-table ms-table"><thead><tr><th><button type="button">Employee</button></th>${days.map((d) => `<th class="${dayName(d) === app.setting("off") ? "off" : ""}"><button type="button" title="${esc(dayName(d))}">${Number(d.slice(8))}</button></th>`).join("")}${["P", "Late", "H", "L", "A"].map((c) => `<th class="r"><button type="button">${c}</button></th>`).join("")}</tr></thead><tbody>${emps
          .map((e) => {
            const sm = monthSummary(app, e.id, s.month);
            return `<tr data-open="employees:${e.id}"><td><b>${esc(e.name)}</b></td>${days.map((d) => {
              const c = codeOf(app, e.id, d);
              return `<td class="ms-c ${CTONE[c] || ""} ${dayName(d) === app.setting("off") ? "off" : ""}">${c === "Late" ? "Lt" : esc(c)}</td>`;
            }).join("")}${["P", "Late", "H", "L", "A"].map((c) => `<td class="r"><b>${sm[c]}</b></td>`).join("")}</tr>`;
          })
          .join("")}</tbody></table></div><style>.ms-table th,.ms-table td{padding:6px 5px;text-align:center}.ms-table th button{padding:6px 2px}.ms-table td:first-child{text-align:left;position:sticky;left:0;background:var(--panel)}.ms-c{font-size:12px;font-weight:700}.ms-c.green{color:var(--green)}.ms-c.amber{color:var(--amber)}.ms-c.purple{color:var(--purple)}.ms-c.blue{color:var(--blue)}.ms-c.red{color:var(--red);background:color-mix(in srgb,var(--red) 8%,transparent)}.ms-table .off{background:var(--panel-2)}</style>`;
      },
    },
    {
      id: "employees",
      label: "Employees",
      icon: "users",
      type: "table",
      entity: "employees",
      sort: "name",
      filters: [
        { key: "department", label: "Department", options: DEPTS },
        { key: "status", label: "Status", options: ["Active", "Left"] },
      ],
      total: (rows, app) => `Monthly salaries <b>${esc(app.money(sum(rows.filter((e) => e.status !== "Left"), (e) => num(e.salary) + num(e.allowance))))}</b>`,
      columns: [
        { key: "code", label: "No." },
        { key: "name", label: "Name", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "department", label: "Department" },
        { key: "designation", label: "Designation" },
        { key: "phone", label: "Mobile" },
        { key: "salary", label: "Basic", money: true, right: true },
        { key: "today", label: "Today", get: (r, app) => codeOf(app, r.id, today()), html: (r, app) => {
          const c = codeOf(app, r.id, today());
          return c ? app.pill(CODES.find((x) => x.value === c).label, CTONE[c]) : app.pill("Not marked", "gray");
        } },
      ],
    },
    {
      id: "leaves",
      label: "Leaves",
      icon: "calendar",
      type: "table",
      entity: "leaves",
      sort: "from",
      dir: -1,
      filters: [
        { key: "status", label: "Status", options: ["Pending", "Approved", "Rejected"] },
        { key: "type", label: "Type", options: ["Casual", "Sick", "Annual", "Unpaid"] },
      ],
      columns: [
        { key: "employee", label: "Employee" },
        { key: "type", label: "Type" },
        { key: "from", label: "From", date: true },
        { key: "to", label: "To", date: true },
        { key: "days", label: "Days", right: true, get: (r) => Math.max(1, Math.round((new Date(r.to) - new Date(r.from)) / 86400000) + 1) },
        { key: "status", label: "Status", html: (r, app) => app.pill(r.status, { Pending: "amber", Approved: "green", Rejected: "red" }[r.status]) },
      ],
      badge: (db) => db.leaves.filter((l) => l.status === "Pending").length,
    },
    {
      id: "advances",
      label: "Advances",
      icon: "money",
      type: "table",
      entity: "advances",
      sort: "date",
      dir: -1,
      columns: [
        { key: "date", label: "Date", date: true },
        { key: "employee", label: "Employee" },
        { key: "amount", label: "Amount", money: true, right: true },
        { key: "deduct", label: "Deduct in", get: (r) => fmtMonth(r.deduct), sortValue: (r) => r.deduct },
        { key: "note", label: "Note" },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, "amount")))}</b>`,
    },
    {
      id: "payroll",
      label: "Payroll",
      icon: "receipt",
      type: "table",
      entity: "payroll",
      add: false,
      importCsv: false,
      sort: "employee",
      intro: "Work out the month's salaries from attendance: absences, unpaid leave, half days and the late rule are cut at the daily rate (basic ÷ working days), and advances due that month are taken off. Paid salaries are not changed.",
      filters: [{ key: "month", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })) }],
      tools: [
        {
          id: "calc",
          label: "Work out salaries",
          icon: "chart",
          run: (app, s) => {
            const month = s.filters.month && s.filters.month !== "all" ? s.filters.month : thisMonth();
            let n = 0;
            for (const e of active(app)) {
              const old = app.db.payroll.find((p) => p.employee === e.id && p.month === month);
              if (old?.paid) continue;
              const calc = workOut(app, e, month);
              if (old) Object.assign(old, calc, { overtime: old.overtime, net: Math.max(0, calc.net + num(old.overtime)) });
              else app.db.payroll.push({ id: Math.random().toString(36).slice(2), created: Date.now(), ...calc, paid: false });
              n++;
            }
            s.filters.month = month;
            app.save();
            app.refresh();
            app.toast(`Worked out ${n} salaries for ${fmtMonth(month)}.`);
          },
        },
        {
          id: "slips",
          label: "Print payslips",
          icon: "print",
          run: (app, s) => {
            const month = s.filters.month && s.filters.month !== "all" ? s.filters.month : thisMonth();
            const rows = app.db.payroll.filter((p) => p.month === month);
            if (!rows.length) return app.toast("Work out the salaries first.");
            printSlips(rows, app);
          },
        },
      ],
      total: (rows, app) => `Net pay <b>${esc(app.money(sum(rows, "net")))}</b> · paid <b>${esc(app.money(sum(rows.filter((r) => r.paid), "net")))}</b>`,
      columns: [
        { key: "employee", label: "Employee" },
        { key: "month", label: "Month", get: (r) => fmtMonth(r.month), sortValue: (r) => r.month },
        { key: "basic", label: "Basic", money: true, right: true },
        { key: "cutDays", label: "Days cut", right: true },
        { key: "deduction", label: "Deduction", money: true, right: true },
        { key: "advance", label: "Advance", money: true, right: true },
        { key: "net", label: "Net pay", money: true, right: true },
        { key: "paid", label: "Status", html: (r, app) => app.pill(r.paid ? "Paid" : "Not paid", r.paid ? "green" : "amber") },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const cost = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.payroll.filter((p) => p.month === m), "net") }));
        const emps = active(app);
        const deptRate = DEPTS.map((d) => {
          const es = emps.filter((e) => e.department === d);
          let pres = 0,
            tot = 0;
          for (const e of es) {
            const s = monthSummary(app, e.id, thisMonth());
            pres += s.P + s.Late + s.H * 0.5;
            tot += s.P + s.Late + s.H + s.L + s.A;
          }
          return { label: d, value: tot ? Math.round((pres / tot) * 100) : 0 };
        }).filter((x) => emps.some((e) => e.department === x.label));
        return [
          { title: "Net payroll by month", html: columnChart(cost, { fmt: (v) => app.moneyShort(v) }), table: cost.map((d) => [d.label, app.money(d.value)]) },
          { title: "Attendance by department", note: "% this month", html: barList(deptRate, { fmt: (v) => v + "%" }) },
          { title: "Headcount by department", html: barList(groupCount(emps, (e) => e.department)) },
          { title: "Salary cost by department", html: barList(groupSum(emps, (e) => e.department, (e) => num(e.salary) + num(e.allowance)), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Absences this month", html: barList(groupCount(db.attendance.filter((a) => a.status === "A" && monthOf(a.date) === thisMonth()), (a) => app.label("employees", a.employee))) },
          { title: "Leave taken", note: "approved, this year", html: barList(groupCount(db.leaves.filter((l) => l.status === "Approved" && l.from.slice(0, 4) === today().slice(0, 4)), (l) => l.type)) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const roles = { Admin: ["Office manager", "Receptionist"], Sales: ["Sales officer", "Sales manager"], Production: ["Machine operator", "Supervisor", "Helper"], Accounts: ["Accountant"], Store: ["Store keeper"], Security: ["Guard"], Delivery: ["Driver", "Rider"] };
    const plan = ["Admin", "Admin", "Sales", "Sales", "Sales", "Production", "Production", "Production", "Production", "Production", "Production", "Accounts", "Accounts", "Store", "Security", "Security", "Delivery", "Delivery"];
    const employees = plan.map((d, i) => ({ id: "e" + i, name: h.person(d === "Admin" && i === 1 ? "f" : h.rand() < 0.2 ? "f" : "m"), code: "E-" + String(i + 1).padStart(4, "0"), department: d, designation: h.pick(roles[d]), phone: h.phone(), cnic: `35202-${h.int(1000000, 9999999)}-${h.int(1, 9)}`, joined: h.day(-h.int(90, 2000)), salary: { Production: 38000, Security: 37000, Delivery: 40000, Admin: 55000, Sales: 60000, Accounts: 75000, Store: 42000 }[d] + h.int(0, 8) * 2500, allowance: h.pick([0, 3000, 5000]), status: "Active" }));
    const attendance = [];
    for (let i = 60; i >= 0; i--) {
      const d = h.day(-i);
      if (dayName(d) === "Sun") continue;
      for (const e of employees) {
        if (i === 0 && h.rand() < 0.25) continue; // some not marked yet today
        const r = h.rand();
        const status = r < 0.82 ? "P" : r < 0.9 ? "Late" : r < 0.93 ? "H" : r < 0.97 ? "A" : "L";
        const inT = status === "Late" ? `09:${h.int(20, 55)}` : status === "P" ? `08:${h.int(40, 59)}` : status === "H" ? "09:00" : "";
        attendance.push({ employee: e.id, date: d, status, in: inT, out: status === "H" ? "13:00" : inT ? `17:${String(h.int(0, 40)).padStart(2, "0")}` : "" });
      }
    }
    const leaves = [
      { employee: "e3", type: "Sick", from: h.day(-12), to: h.day(-11), reason: "Fever", status: "Approved" },
      { employee: "e7", type: "Casual", from: h.day(2), to: h.day(3), reason: "Family wedding", status: "Pending" },
      { employee: "e12", type: "Annual", from: h.day(9), to: h.day(14), reason: "Umrah", status: "Pending" },
      { employee: "e15", type: "Unpaid", from: h.day(-25), to: h.day(-23), reason: "Village visit", status: "Approved" },
    ];
    const advances = [
      { employee: "e6", date: h.day(-9), amount: 10000, deduct: thisMonth(), note: "Medical" },
      { employee: "e16", date: h.day(-20), amount: 15000, deduct: thisMonth(), note: "Bike repair" },
      { employee: "e2", date: h.day(-40), amount: 20000, deduct: addMonths(thisMonth(), -1), note: "School fee" },
    ];
    return { employees, attendance, leaves, advances, payroll: [] };
  },
});

// Last month's payroll is worked out and paid in the sample, so Payroll is not empty on first look.
if (app.db._demo && !app.db.payroll.length) {
  const last = addMonths(thisMonth(), -1);
  for (const e of app.db.employees) app.db.payroll.push({ id: "pay" + e.id, created: Date.now(), ...workOut(app, e, last), paid: true, paidOn: `${thisMonth()}-01`, method: "Bank transfer" });
  app.save();
  app.refresh();
}

function printSlips(rows, app) {
  app.print(
    "Payslip",
    rows
      .map((r) => {
        const e = app.find("employees", r.employee) || {};
        return `<div style="page-break-inside:avoid;margin-bottom:22px;padding-bottom:16px;border-bottom:1px dashed #000"><div class="dx-doc-meta"><div><b>Employee:</b> ${esc(e.name || "")} (${esc(e.code || "")})</div><div><b>Month:</b> ${esc(fmtMonth(r.month))}</div><div><b>Department:</b> ${esc(e.department || "")} · ${esc(e.designation || "")}</div><div><b>CNIC:</b> ${esc(e.cnic || "")}</div><div><b>Present:</b> ${num(r.present)} · <b>Absent:</b> ${num(r.absent)} · <b>Half days:</b> ${num(r.half)} · <b>Late:</b> ${num(r.late)} · <b>Leave:</b> ${num(r.leave)}</div><div><b>Bank:</b> ${esc(e.bank || "—")}</div></div><table class="dx-doc-table"><tbody><tr><td>Basic salary</td><td class="r">${esc(app.money(r.basic))}</td></tr><tr><td>Allowances</td><td class="r">${esc(app.money(r.allowance))}</td></tr>${num(r.overtime) ? `<tr><td>Overtime / bonus</td><td class="r">${esc(app.money(r.overtime))}</td></tr>` : ""}<tr><td>Absence deduction (${num(r.cutDays)} days)</td><td class="r">− ${esc(app.money(r.deduction))}</td></tr><tr><td>Advance</td><td class="r">− ${esc(app.money(r.advance))}</td></tr></tbody></table><div class="dx-doc-sum"><div class="dx-doc-grand"><span>Net pay</span><b>${esc(app.money(r.net))}</b></div><div><span>Status</span><b>${r.paid ? "Paid " + esc(r.paidOn ? app.date(r.paidOn) : "") : "Not paid"}</b></div></div><div style="display:flex;justify-content:space-between;margin-top:30px"><span>Employee ____________</span><span>Accounts ____________</span></div></div>`;
      })
      .join(""),
  );
}
function printSheet(app, month) {
  const n = daysIn(month);
  const days = Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  app.print(`Attendance · ${fmtMonth(month)}`, `<table class="dx-doc-table" style="font-size:9.5px"><thead><tr><th>Employee</th>${days.map((d) => `<th>${Number(d.slice(8))}</th>`).join("")}<th>P</th><th>Lt</th><th>H</th><th>L</th><th>A</th></tr></thead><tbody>${active(app)
    .map((e) => {
      const s = monthSummary(app, e.id, month);
      return `<tr><td>${esc(e.name)}</td>${days.map((d) => `<td>${esc(codeOf(app, e.id, d) === "Late" ? "Lt" : codeOf(app, e.id, d))}</td>`).join("")}<td>${s.P}</td><td>${s.Late}</td><td>${s.H}</td><td>${s.L}</td><td>${s.A}</td></tr>`;
    })
    .join("")}</tbody></table>`);
}

export default app;
