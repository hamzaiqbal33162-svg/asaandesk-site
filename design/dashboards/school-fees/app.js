// School fee manager: students, fee structure, monthly vouchers (3-copy challan), payments and receipts,
// late fines, defaulters with WhatsApp reminders, and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, num, sum, groupSum, groupCount, columnChart, barList } from "../shared/dash.js";

const balance = (v) => Math.max(0, num(v.total) - num(v.paid));
const vstate = (v) => (num(v.total) > 0 && balance(v) <= 0 ? "Paid" : num(v.paid) > 0 ? "Partial" : v.due < today() ? "Overdue" : "Unpaid");
const VTONE = { Paid: "green", Partial: "amber", Unpaid: "blue", Overdue: "red" };
const monthOptions = () => Array.from({ length: 8 }, (_, i) => ({ value: addMonths(thisMonth(), 1 - i), label: fmtMonth(addMonths(thisMonth(), 1 - i)) }));
const studentDue = (app, s) => app.db.vouchers.filter((v) => v.student === s.id && balance(v) > 0);

function voucherFor(app, s, month, due) {
  const cls = app.find("classes", s.class) || {};
  const tuition = num(cls.tuition);
  const other = num(cls.other);
  const transport = num(s.transport);
  const concession = Math.round(((tuition + other) * num(s.concession)) / 100);
  return { no: app.nextNo("vouchers", "CH-"), student: s.id, month, tuition, other, transport, concession, fine: 0, total: tuition + other + transport - concession, paid: 0, due, issued: today() };
}

function pay(app, v, amount, method) {
  const amt = Math.min(num(amount), balance(v));
  if (amt <= 0) return null;
  v.paid = num(v.paid) + amt;
  const p = app.upsert("payments", { receipt: app.nextNo("payments", "RC-"), date: today(), voucher: v.id, student: v.student, amount: amt, method: method || "Cash" });
  return p;
}

const app = createApp({
  id: "school-fees",
  title: "School fee manager",
  brand: "Iqra Model School",
  icon: "school",
  accent: "#1d4ed8",
  settings: [
    { key: "business", label: "School name", type: "text", default: "Iqra Model School" },
    { key: "phone", label: "Phone", type: "phone", default: "041 2611223" },
    { key: "address", label: "Address", type: "text", default: "Canal Road, Faisalabad" },
    { key: "bank", label: "Bank", type: "text", default: "Meezan Bank, Canal Road branch" },
    { key: "account", label: "Account title and number", type: "text", default: "Iqra Model School · 0123-0100456789" },
    { key: "dueDay", label: "Fee due on day", type: "number", default: 10, hint: "Day of the month, e.g. 10" },
    { key: "fine", label: "Late fine (PKR)", type: "money", default: 300 },
    { key: "note", label: "Note on challan", type: "text", default: "Fee once paid is not refundable. Pay before the due date to avoid the late fine." },
  ],
  entities: {
    students: {
      label: "Students",
      one: "Student",
      search: ["name", "father", "roll", "phone"],
      title: (r) => r.name,
      badge: (r, app) => {
        const due = studentDue(app, r);
        return app.pill(app.label("classes", r.class) + (r.section ? "-" + r.section : ""), "blue") + " " + (due.length ? app.pill(`${app.money(sum(due, balance))} due`, due.some((v) => vstate(v) === "Overdue") ? "red" : "amber") : app.pill("No dues", "green"));
      },
      fields: [
        { key: "name", label: "Student name", type: "text", required: true },
        { key: "father", label: "Father / guardian", type: "text" },
        { key: "roll", label: "Roll / GR no.", type: "text", default: (app) => app.nextNo("students", "") },
        { key: "class", label: "Class", type: "relation", entity: "classes", required: true },
        { key: "section", label: "Section", type: "select", options: ["A", "B", "C", "D"] },
        { key: "phone", label: "Guardian mobile", type: "phone" },
        { key: "transport", label: "Transport fee (PKR / month)", type: "money", default: 0 },
        { key: "concession", label: "Concession (%)", type: "percent", default: 0, hint: "Sibling, staff child or merit discount on tuition." },
        { key: "admitted", label: "Admission date", type: "date", default: today },
        { key: "status", label: "Status", type: "select", options: ["Active", "Left"], default: "Active" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        {
          label: "Voucher for this month",
          icon: "doc",
          primary: true,
          when: (r, app) => r.status !== "Left" && !app.db.vouchers.some((v) => v.student === r.id && v.month === thisMonth()),
          run: (r, app) => {
            const due = `${thisMonth()}-${String(Math.min(28, num(app.setting("dueDay")) || 10)).padStart(2, "0")}`;
            app.db.vouchers.push({ id: Math.random().toString(36).slice(2), created: Date.now(), ...voucherFor(app, r, thisMonth(), due) });
            app.toast("Voucher made.");
          },
        },
        {
          label: "WhatsApp fee reminder",
          icon: "wa",
          when: (r, app) => r.phone && studentDue(app, r).length,
          run: (r, app) => {
            const due = studentDue(app, r);
            app.whatsapp(r.phone, `Assalam o Alaikum. ${app.setting("business")}: the fee of ${r.name} (${app.label("classes", r.class)}) for ${due.map((v) => fmtMonth(v.month)).join(", ")} is pending. Amount due: ${app.money(sum(due, balance))}. Kindly pay at ${app.setting("bank")}. Thank you.`);
            return "keep";
          },
        },
      ],
      related: (r, app) => {
        const vs = app.db.vouchers.filter((v) => v.student === r.id).sort((a, b) => b.month.localeCompare(a.month));
        return `<div class="dx-related"><h3>Fee vouchers</h3>${app.list(vs.slice(0, 12), (v) => `<li>${app.openLink("vouchers", v, `<span class="dx-when">${esc(fmtMonth(v.month))}</span><span class="dx-li-main"><b>${esc(app.money(v.total))}</b><small>${esc(v.no)} · paid ${esc(app.money(v.paid))}</small></span>${app.pill(vstate(v), VTONE[vstate(v)])}`)}</li>`, "No vouchers yet.")}</div>`;
      },
    },
    classes: {
      label: "Classes",
      one: "Class",
      search: ["name"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Class", type: "text", required: true, placeholder: "e.g. Class 5" },
        { key: "tuition", label: "Monthly tuition (PKR)", type: "money", required: true },
        { key: "other", label: "Other monthly charges (PKR)", type: "money", default: 0, hint: "Computer lab, library, etc." },
        { key: "teacher", label: "Class teacher", type: "text" },
      ],
    },
    vouchers: {
      label: "Fee vouchers",
      one: "Fee voucher",
      search: ["no", (r, app) => app.label("students", r.student), "month"],
      title: (r, app) => `${r.no} · ${app.label("students", r.student)}`,
      badge: (r, app) => app.pill(vstate(r), VTONE[vstate(r)]) + " " + app.pill(fmtMonth(r.month), "gray"),
      fields: [
        { key: "no", label: "Voucher no.", type: "text" },
        { key: "student", label: "Student", type: "relation", entity: "students", required: true },
        { key: "month", label: "Fee month", type: "select", options: monthOptions, default: thisMonth, required: true },
        { key: "tuition", label: "Tuition", type: "money" },
        { key: "other", label: "Other charges", type: "money" },
        { key: "transport", label: "Transport", type: "money" },
        { key: "concession", label: "Concession (PKR)", type: "money" },
        { key: "fine", label: "Late fine", type: "money" },
        { key: "due", label: "Due date", type: "date", required: true, default: () => `${thisMonth()}-10` },
        { key: "paid", label: "Paid so far", type: "money", default: 0 },
      ],
      beforeSave: (r, before, app) => {
        r.total = num(r.tuition) + num(r.other) + num(r.transport) + num(r.fine) - num(r.concession);
        if (!r.no) r.no = app.nextNo("vouchers", "CH-");
        if (!before) {
          const dup = app.db.vouchers.find((v) => v.student === r.student && v.month === r.month);
          if (dup) return `${app.label("students", r.student)} already has a voucher for ${fmtMonth(r.month)} (${dup.no}).`;
        }
      },
      actions: [
        {
          label: "Record payment",
          icon: "money",
          primary: true,
          when: (r) => balance(r) > 0,
          run: (r, app) => {
            const a = prompt(`Amount received for ${r.no} (balance ${app.money(balance(r))}):`, String(balance(r)));
            if (a === null) return "keep";
            const m = prompt("Paid by (Cash, Bank deposit, JazzCash, Easypaisa):", "Bank deposit");
            const p = pay(app, r, a, m || "Cash");
            if (!p) return app.toast("Enter an amount.");
            app.toast(`Received ${app.money(p.amount)}. Receipt ${p.receipt}.`);
            if (confirm("Print the receipt?")) printReceipt(p, app);
          },
        },
        { label: "Print challan (3 copies)", icon: "print", run: (r, app) => (printChallans([r], app), "keep") },
        {
          label: "Add late fine",
          icon: "bell",
          when: (r) => vstate(r) === "Overdue" && !num(r.fine),
          run: (r, app) => {
            r.fine = num(app.setting("fine"));
            r.total = num(r.total) + r.fine;
          },
        },
        {
          label: "WhatsApp reminder",
          icon: "wa",
          when: (r, app) => balance(r) > 0 && app.find("students", r.student)?.phone,
          run: (r, app) => {
            const s = app.find("students", r.student);
            app.whatsapp(s.phone, `Assalam o Alaikum. ${app.setting("business")}: ${s.name}'s fee for ${fmtMonth(r.month)} (${app.money(balance(r))}) is due on ${fmtShort(r.due)}. Voucher ${r.no}. Thank you.`);
            return "keep";
          },
        },
      ],
      related: (r, app) => {
        const ps = app.db.payments.filter((p) => p.voucher === r.id);
        return `<div class="dx-related"><h3>Payments</h3>${app.list(ps, (p) => `<li>${app.openLink("payments", p, `<span class="dx-when">${esc(fmtShort(p.date))}</span><span class="dx-li-main"><b>${esc(app.money(p.amount))}</b><small>${esc(p.receipt)} · ${esc(p.method)}</small></span>`)}</li>`, "No payments yet.")}</div>`;
      },
    },
    payments: {
      label: "Payments",
      one: "Payment",
      search: ["receipt", (r, app) => app.label("students", r.student)],
      title: (r, app) => `${r.receipt} · ${app.label("students", r.student)}`,
      fields: [
        { key: "receipt", label: "Receipt no.", type: "text" },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "voucher", label: "Voucher", type: "relation", entity: "vouchers", required: true, filter: (v) => balance(v) > 0 },
        { key: "amount", label: "Amount (PKR)", type: "money", required: true },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Bank deposit", "JazzCash", "Easypaisa", "Cheque"], default: "Cash" },
      ],
      beforeSave: (r, before, app) => {
        const v = app.find("vouchers", r.voucher);
        if (!v) return "Choose the voucher.";
        if (!before && num(r.amount) > balance(v)) return `That is more than the balance (${app.money(balance(v))}).`;
        r.student = v.student;
        if (!r.receipt) r.receipt = app.nextNo("payments", "RC-");
      },
      afterSave: (r, before, app) => {
        const v = app.find("vouchers", r.voucher);
        if (v) v.paid = num(v.paid) - num(before?.amount) + num(r.amount);
      },
      beforeDelete: (r, app) => {
        const v = app.find("vouchers", r.voucher);
        if (v) v.paid = Math.max(0, num(v.paid) - num(r.amount));
      },
      actions: [{ label: "Print receipt", icon: "print", primary: true, run: (r, app) => (printReceipt(r, app), "keep") }],
    },
  },
  onAction: (code, app) => {
    if (code === "gen") return generate(app);
    if (code === "printmonth") {
      const s = app.ui.generate;
      const vs = app.db.vouchers.filter((v) => v.month === s.month && (s.cls === "all" || app.find("students", v.student)?.class === s.cls));
      if (!vs.length) return app.toast("No vouchers for that month yet.");
      printChallans(vs, app);
    }
  },
  onChange: (ev, app) => {
    const t = ev.target;
    if (t.dataset.gen) {
      app.ui.generate[t.dataset.gen] = t.value;
      if (t.dataset.gen === "month") app.ui.generate.due = ""; // the due date follows the chosen month
      app.refresh();
    }
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "g", label: "Make this month's vouchers", primary: true, icon: "doc", run: (app) => app.go("generate") },
        { id: "s", label: "New student", new: "students", icon: "user" },
      ],
      kpis: (db, app) => {
        const m = db.payments.filter((p) => monthOf(p.date) === thisMonth());
        const thisM = db.vouchers.filter((v) => v.month === thisMonth());
        const defaulters = db.students.filter((s) => db.vouchers.some((v) => v.student === s.id && vstate(v) === "Overdue"));
        return [
          { label: "Collected this month", value: app.money(sum(m, "amount")), note: `${m.length} payments`, icon: "money", go: "payments" },
          { label: "This month's vouchers paid", value: thisM.length ? Math.round((thisM.filter((v) => vstate(v) === "Paid").length / thisM.length) * 100) + "%" : "—", note: `${thisM.filter((v) => vstate(v) === "Paid").length} of ${thisM.length}`, icon: "check", go: "vouchers" },
          { label: "Outstanding", value: app.money(sum(db.vouchers, balance)), note: "all unpaid vouchers", icon: "bell", tone: "warn" },
          { label: "Defaulters", value: defaulters.length, note: `of ${db.students.filter((s) => s.status !== "Left").length} students`, icon: "users", go: "defaulters" },
        ];
      },
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const coll = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.payments.filter((p) => monthOf(p.date) === m), "amount") }));
        const recent = db.payments.slice().sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
        const thisM = db.vouchers.filter((v) => v.month === thisMonth());
        return [
          { title: "Collection by month", html: columnChart(coll, { fmt: (v) => app.moneyShort(v) }), table: coll.map((d) => [d.label, app.money(d.value)]) },
          { title: "This month by status", html: barList(["Paid", "Partial", "Unpaid", "Overdue"].map((s) => ({ label: s, value: thisM.filter((v) => vstate(v) === s).length }))) },
          { title: "Outstanding by class", html: barList(groupSum(db.vouchers.filter((v) => balance(v) > 0), (v) => app.label("classes", app.find("students", v.student)?.class), balance), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Latest payments", go: "payments", html: app.list(recent.slice(0, 7), (p) => `<li>${app.openLink("payments", p, `<span class="dx-when">${esc(fmtShort(p.date))}</span><span class="dx-li-main"><b>${esc(app.label("students", p.student))}</b><small>${esc(p.receipt)} · ${esc(p.method)}</small></span><b>${esc(app.money(p.amount))}</b>`)}</li>`, "No payments yet.") },
        ];
      },
    },
    {
      id: "students",
      label: "Students",
      icon: "users",
      type: "table",
      entity: "students",
      sort: "roll",
      filters: [
        { key: "class", label: "Class", options: (app) => app.db.classes.map((c) => ({ value: c.id, label: c.name })) },
        { key: "section", label: "Section", options: ["A", "B", "C", "D"] },
        { key: "status", label: "Status", options: ["Active", "Left"] },
      ],
      columns: [
        { key: "roll", label: "Roll no.", sortValue: (r) => num(r.roll) },
        { key: "name", label: "Student", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "father", label: "Father" },
        { key: "class", label: "Class", get: (r, app) => app.label("classes", r.class) + (r.section ? "-" + r.section : "") },
        { key: "phone", label: "Mobile" },
        { key: "fee", label: "Monthly fee", right: true, get: (r, app) => {
          const c = app.find("classes", r.class) || {};
          return Math.round((num(c.tuition) + num(c.other)) * (1 - num(r.concession) / 100) + num(r.transport));
        }, html: (r, app) => {
          const c = app.find("classes", r.class) || {};
          return esc(app.money((num(c.tuition) + num(c.other)) * (1 - num(r.concession) / 100) + num(r.transport)));
        } },
        { key: "due", label: "Due", right: true, get: (r, app) => sum(studentDue(app, r), balance), html: (r, app) => {
          const d = sum(studentDue(app, r), balance);
          return d ? `<b style="color:var(--red)">${esc(app.money(d))}</b>` : "—";
        } },
      ],
    },
    {
      id: "generate",
      label: "Make vouchers",
      icon: "doc",
      type: "custom",
      render: (app, s) => {
        s.month ||= thisMonth();
        s.cls ||= "all";
        s.due ||= `${s.month}-${String(Math.min(28, num(app.setting("dueDay")) || 10)).padStart(2, "0")}`;
        const students = app.db.students.filter((x) => x.status !== "Left" && (s.cls === "all" || x.class === s.cls));
        const have = new Set(app.db.vouchers.filter((v) => v.month === s.month).map((v) => v.student));
        const missing = students.filter((x) => !have.has(x.id));
        const total = sum(missing, (x) => voucherFor({ ...app, nextNo: () => "" }, x, s.month, s.due).total);
        const made = app.db.vouchers.filter((v) => v.month === s.month && (s.cls === "all" || app.find("students", v.student)?.class === s.cls));
        return `<p class="dx-intro">Make one fee voucher per active student for a month, from the class fee, transport and concession. Students who already have a voucher for that month are skipped.</p><section class="dx-card"><div class="dx-form" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><label class="dx-f">Fee month<select data-gen="month">${monthOptions().map((o) => `<option value="${o.value}" ${o.value === s.month ? "selected" : ""}>${o.label}</option>`).join("")}</select></label><label class="dx-f">Class<select data-gen="cls"><option value="all">All classes</option>${app.db.classes.map((c) => `<option value="${c.id}" ${s.cls === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label class="dx-f">Due date<input type="date" data-gen="due" value="${esc(s.due)}"></label></div><p>${missing.length ? `<b>${missing.length}</b> vouchers to make, total <b>${esc(app.money(total))}</b>.` : "Every student already has a voucher for this month."} ${made.length ? `${made.length} already made.` : ""}</p><div class="dx-actions"><button type="button" class="dx-btn primary" data-x="gen" ${missing.length ? "" : "disabled"}>${app.icon("doc")}Make ${missing.length} vouchers</button><button type="button" class="dx-btn" data-x="printmonth" ${made.length ? "" : "disabled"}>${app.icon("print")}Print all challans for ${esc(fmtMonth(s.month))}</button></div></section><section class="dx-card" style="margin-top:14px"><div class="dx-card-h"><h2>Vouchers for ${esc(fmtMonth(s.month))}</h2><span>${made.length}</span></div>${app.list(made.slice(0, 60), (v) => `<li>${app.openLink("vouchers", v, `<span class="dx-when">${esc(v.no)}</span><span class="dx-li-main"><b>${esc(app.label("students", v.student))}</b><small>${esc(app.label("classes", app.find("students", v.student)?.class))} · due ${esc(fmtShort(v.due))}</small></span><b>${esc(app.money(v.total))}</b>${app.pill(vstate(v), VTONE[vstate(v)])}`)}</li>`, "None yet.")}</section>`;
      },
    },
    {
      id: "vouchers",
      label: "Fee vouchers",
      icon: "receipt",
      type: "table",
      entity: "vouchers",
      sort: "no",
      dir: -1,
      importCsv: false,
      filters: [
        { key: "month", label: "Month", options: monthOptions },
        { key: "state", label: "Status", options: ["Paid", "Partial", "Unpaid", "Overdue"], test: (r, v) => vstate(r) === v },
        { key: "cls", label: "Class", options: (app) => app.db.classes.map((c) => ({ value: c.id, label: c.name })), test: (r, v, app) => app.find("students", r.student)?.class === v },
      ],
      total: (rows, app) => `Billed <b>${esc(app.money(sum(rows, "total")))}</b> · received <b>${esc(app.money(sum(rows, "paid")))}</b> · balance <b>${esc(app.money(sum(rows, balance)))}</b>`,
      columns: [
        { key: "no", label: "Voucher", html: (r) => `<b>${esc(r.no)}</b>` },
        { key: "student", label: "Student" },
        { key: "month", label: "Month", get: (r) => fmtMonth(r.month), sortValue: (r) => r.month },
        { key: "due", label: "Due", date: true },
        { key: "total", label: "Amount", money: true, right: true },
        { key: "paid", label: "Paid", money: true, right: true },
        { key: "state", label: "Status", get: (r) => vstate(r), html: (r, app) => app.pill(vstate(r), VTONE[vstate(r)]) },
      ],
    },
    {
      id: "defaulters",
      label: "Defaulters",
      icon: "bell",
      type: "table",
      entity: "students",
      add: false,
      importCsv: false,
      intro: "Students with at least one overdue voucher. Open a student to send a WhatsApp reminder with the exact amount.",
      where: (r, app) => app.db.vouchers.some((v) => v.student === r.id && vstate(v) === "Overdue"),
      sort: "due",
      dir: -1,
      total: (rows, app) => `Total overdue <b>${esc(app.money(sum(rows, (s) => sum(studentDue(app, s), balance))))}</b>`,
      columns: [
        { key: "name", label: "Student", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "class", label: "Class", get: (r, app) => app.label("classes", r.class) + (r.section ? "-" + r.section : "") },
        { key: "phone", label: "Mobile" },
        { key: "months", label: "Months", right: true, get: (r, app) => studentDue(app, r).length },
        { key: "due", label: "Amount due", right: true, get: (r, app) => sum(studentDue(app, r), balance), html: (r, app) => `<b>${esc(app.money(sum(studentDue(app, r), balance)))}</b>` },
      ],
      badge: (db) => db.students.filter((s) => db.vouchers.some((v) => v.student === s.id && vstate(v) === "Overdue")).length,
    },
    {
      id: "payments",
      label: "Payments",
      icon: "money",
      type: "table",
      entity: "payments",
      sort: "date",
      dir: -1,
      importCsv: false,
      filters: [
        { key: "method", label: "Paid by", options: ["Cash", "Bank deposit", "JazzCash", "Easypaisa", "Cheque"] },
        { key: "m", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })), test: (r, v) => monthOf(r.date) === v },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, "amount")))}</b>`,
      columns: [
        { key: "receipt", label: "Receipt", html: (r) => `<b>${esc(r.receipt)}</b>` },
        { key: "date", label: "Date", date: true },
        { key: "student", label: "Student", get: (r, app) => app.label("students", r.student) },
        { key: "voucher", label: "Voucher", get: (r, app) => app.find("vouchers", r.voucher)?.no || "" },
        { key: "amount", label: "Amount", money: true, right: true },
        { key: "method", label: "Paid by" },
      ],
    },
    {
      id: "classes",
      label: "Fee structure",
      icon: "list",
      type: "table",
      entity: "classes",
      sort: "name",
      columns: [
        { key: "name", label: "Class", html: (r) => `<b>${esc(r.name)}</b>`, sortValue: (r) => r.name.replace(/\d+/, (d) => d.padStart(2, "0")) },
        { key: "tuition", label: "Tuition", money: true, right: true },
        { key: "other", label: "Other", money: true, right: true },
        { key: "students", label: "Students", right: true, get: (r, app) => app.db.students.filter((s) => s.class === r.id && s.status !== "Left").length },
        { key: "teacher", label: "Class teacher" },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const billed = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.vouchers.filter((v) => v.month === m), "total") }));
        const rate = months.map((m) => {
          const vs = db.vouchers.filter((v) => v.month === m);
          return { label: fmtMonth(m).slice(0, 3), value: vs.length ? Math.round((sum(vs, "paid") / Math.max(1, sum(vs, "total"))) * 100) : 0 };
        });
        return [
          { title: "Billed per month", html: columnChart(billed, { fmt: (v) => app.moneyShort(v) }), table: billed.map((d) => [d.label, app.money(d.value)]) },
          { title: "Share collected per month", note: "%", html: columnChart(rate, { fmt: (v) => v + "%" }), table: rate.map((d) => [d.label, d.value + "%"]) },
          { title: "Collection by class", note: "this month", html: barList(groupSum(db.payments.filter((p) => monthOf(p.date) === thisMonth()), (p) => app.label("classes", app.find("students", p.student)?.class), (p) => p.amount), { fmt: (v) => app.moneyShort(v) }) },
          { title: "How parents pay", html: barList(groupCount(db.payments, (p) => p.method)) },
          { title: "Concessions given", note: "this month", html: barList(groupSum(db.vouchers.filter((v) => v.month === thisMonth() && num(v.concession) > 0), (v) => app.label("classes", app.find("students", v.student)?.class), (v) => v.concession), { fmt: (v) => app.money(v) }) },
          { title: "Students per class", html: barList(groupCount(db.students.filter((s) => s.status !== "Left"), (s) => app.label("classes", s.class)), { max: 12 }) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const names = ["Nursery", "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
    const classes = names.map((name, i) => ({ id: "cl" + i, name, tuition: 2500 + i * 300, other: i >= 5 ? 300 : 0, teacher: (i % 2 ? "Miss " : "Sir ") + h.pick(["Amna", "Bushra", "Imran", "Kashif", "Sadia", "Nadia"]) }));
    const students = Array.from({ length: 96 }, (_, i) => ({ id: "s" + i, name: h.person(), father: h.person("m"), roll: String(1001 + i), class: classes[i % classes.length].id, section: h.pick(["A", "A", "B"]), phone: h.phone(), transport: h.rand() < 0.35 ? 2500 : 0, concession: h.rand() < 0.12 ? h.pick([10, 25, 50]) : 0, admitted: h.day(-h.int(60, 900)), status: i % 31 === 30 ? "Left" : "Active" }));
    const vouchers = [];
    const payments = [];
    let vn = 0,
      pn = 0;
    for (let k = 4; k >= 0; k--) {
      const month = addMonths(thisMonth(), -k);
      const due = `${month}-10`;
      for (const s of students) {
        if (s.status === "Left" && k < 2) continue;
        const cls = classes.find((c) => c.id === s.class);
        const conc = Math.round(((cls.tuition + cls.other) * s.concession) / 100);
        const total = cls.tuition + cls.other + s.transport - conc;
        const r = h.rand();
        const paid = k === 0 ? (r < 0.55 ? total : r < 0.62 ? Math.round(total / 2) : 0) : r < 0.9 ? total : r < 0.94 ? Math.round(total / 2) : 0;
        vn++;
        const v = { id: "v" + vn, no: "CH-" + String(vn).padStart(4, "0"), student: s.id, month, tuition: cls.tuition, other: cls.other, transport: s.transport, concession: conc, fine: 0, total, paid, due, issued: `${month}-01` };
        vouchers.push(v);
        if (paid) {
          pn++;
          const day = k === 0 ? addDays(`${month}-01`, h.int(0, Math.max(0, Math.min(14, Number(today().slice(8)) - 1)))) : addDays(`${month}-01`, h.int(2, 18));
          payments.push({ receipt: "RC-" + String(pn).padStart(4, "0"), date: day, voucher: v.id, student: s.id, amount: paid, method: h.pick(["Bank deposit", "Bank deposit", "Cash", "JazzCash", "Easypaisa"]) });
        }
      }
    }
    return { classes, students, vouchers, payments };
  },
});

function generate(app) {
  const s = app.ui.generate;
  const students = app.db.students.filter((x) => x.status !== "Left" && (s.cls === "all" || x.class === s.cls));
  const have = new Set(app.db.vouchers.filter((v) => v.month === s.month).map((v) => v.student));
  let n = 0;
  for (const st of students) {
    if (have.has(st.id)) continue;
    app.db.vouchers.push({ id: Math.random().toString(36).slice(2) + n, created: Date.now(), ...voucherFor(app, st, s.month, s.due) });
    n++;
  }
  app.save();
  app.refresh();
  app.toast(`Made ${n} vouchers for ${fmtMonth(s.month)}.`);
}

function challan(v, app, copy) {
  const s = app.find("students", v.student) || {};
  const earlier = app.db.vouchers.filter((x) => x.student === v.student && x.id !== v.id && x.month < v.month && balance(x) > 0);
  const row = (l, a) => (num(a) ? `<tr><td>${esc(l)}</td><td class="r">${esc(app.money(a))}</td></tr>` : "");
  return `<div class="dx-doc-copy"><h4>${esc(copy)} copy</h4><div><b>${esc(app.setting("business"))}</b></div><div style="font-size:11px">${esc(app.setting("bank"))}<br>${esc(app.setting("account"))}</div><div class="dx-doc-meta" style="grid-template-columns:1fr;font-size:11.5px"><div><b>Voucher:</b> ${esc(v.no)}</div><div><b>Student:</b> ${esc(s.name || "")} (${esc(s.roll || "")})</div><div><b>Father:</b> ${esc(s.father || "")}</div><div><b>Class:</b> ${esc(app.label("classes", s.class))}${s.section ? "-" + esc(s.section) : ""}</div><div><b>Month:</b> ${esc(fmtMonth(v.month))}</div><div><b>Due date:</b> ${esc(app.date(v.due))}</div></div><table class="dx-doc-table" style="font-size:11.5px"><tbody>${row("Tuition", v.tuition)}${row("Other charges", v.other)}${row("Transport", v.transport)}${num(v.concession) ? `<tr><td>Concession</td><td class="r">− ${esc(app.money(v.concession))}</td></tr>` : ""}${row("Late fine", v.fine)}<tr><td><b>Total</b></td><td class="r"><b>${esc(app.money(v.total))}</b></td></tr>${num(v.paid) ? `<tr><td>Paid</td><td class="r">${esc(app.money(v.paid))}</td></tr><tr><td><b>Balance</b></td><td class="r"><b>${esc(app.money(balance(v)))}</b></td></tr>` : ""}<tr><td>After due date</td><td class="r">${esc(app.money(num(v.total) + (num(v.fine) ? 0 : num(app.setting("fine")))))}</td></tr></tbody></table>${earlier.length ? `<div style="font-size:11px"><b>Also unpaid:</b> ${earlier.map((x) => `${esc(fmtMonth(x.month))} ${esc(app.money(balance(x)))}`).join(", ")}</div>` : ""}<div style="font-size:10.5px;margin-top:6px">${esc(app.setting("note"))}</div><div style="margin-top:22px;font-size:11px">Cashier / bank stamp ____________</div></div>`;
}
function printChallans(vs, app) {
  app.print("Fee challan", vs.map((v) => `<div class="dx-doc-copies" style="page-break-inside:avoid;margin-bottom:14px">${["Bank", "School", "Student"].map((c) => challan(v, app, c)).join("")}</div>`).join(""));
}
function printReceipt(p, app) {
  const v = app.find("vouchers", p.voucher) || {};
  const s = app.find("students", p.student) || {};
  app.print("Fee receipt", `<div class="dx-doc-meta"><div><b>Receipt:</b> ${esc(p.receipt)}</div><div><b>Date:</b> ${esc(app.date(p.date))}</div><div><b>Student:</b> ${esc(s.name || "")} (${esc(s.roll || "")})</div><div><b>Class:</b> ${esc(app.label("classes", s.class))}</div><div><b>Voucher:</b> ${esc(v.no || "")} · ${esc(v.month ? fmtMonth(v.month) : "")}</div><div><b>Paid by:</b> ${esc(p.method)}</div></div><div class="dx-doc-sum"><div class="dx-doc-grand"><span>Received</span><b>${esc(app.money(p.amount))}</b></div><div><span>Balance on this voucher</span><b>${esc(app.money(balance(v)))}</b></div></div><div style="margin-top:36px;text-align:right">Accounts office ______________</div>`);
}

export default app;
