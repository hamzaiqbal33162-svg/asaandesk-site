// Clinic dashboard: queue board, appointments, patients, visits with prescriptions, fees and reports.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, dayName, nowTime, num, sum, groupCount, columnChart, lineChart, barList } from "../shared/dash.js";

const STATUS = [
  { value: "Booked", label: "Booked", tone: "blue" },
  { value: "Waiting", label: "Waiting room", tone: "amber" },
  { value: "With doctor", label: "With doctor", tone: "purple" },
  { value: "Done", label: "Done", tone: "green" },
  { value: "No-show", label: "No-show", tone: "red" },
];
const TONE = Object.fromEntries(STATUS.map((s) => [s.value, s.tone]));
const TYPES = ["Check-up", "Follow-up", "Consultation", "Lab review", "Procedure", "Vaccination"];
const minutesSince = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  const [nh, nm] = nowTime().split(":").map(Number);
  return Math.max(0, nh * 60 + nm - (h * 60 + m));
};

const app = createApp({
  id: "clinic",
  title: "Clinic dashboard",
  brand: "Shifa Family Clinic",
  icon: "steth",
  accent: "#0f8a6c",
  settings: [
    { key: "business", label: "Clinic name", type: "text", default: "Shifa Family Clinic" },
    { key: "doctor", label: "Doctor", type: "text", default: "Dr. Sana Malik, MBBS, FCPS" },
    { key: "phone", label: "Clinic phone", type: "phone", default: "0300 1234567" },
    { key: "address", label: "Address", type: "text", default: "12 Mall Road, Lahore" },
    { key: "fee", label: "Consultation fee (PKR)", type: "money", default: 1500 },
    { key: "slot", label: "Minutes per appointment", type: "number", default: 20 },
    { key: "timings", label: "Clinic timings", type: "text", default: "Mon–Sat, 5 PM – 10 PM" },
  ],
  entities: {
    patients: {
      label: "Patients",
      one: "Patient",
      search: ["name", "phone", "mr", "city"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Full name", type: "text", required: true },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "mr", label: "MR no.", type: "text", default: (app) => app.nextNo("patients", "MR-") },
        { key: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Other"] },
        { key: "age", label: "Age (years)", type: "number" },
        { key: "blood", label: "Blood group", type: "select", options: ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"] },
        { key: "city", label: "City / area", type: "text" },
        { key: "allergies", label: "Allergies", type: "text", placeholder: "e.g. Penicillin" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        { label: "Book appointment", icon: "calendar", primary: true, run: (r, app) => (app.closeDrawer(), app.open("appointments", "", true, { patient: r.id }), "keep") },
        { label: "New visit note", icon: "doc", run: (r, app) => (app.open("visits", "", true, { patient: r.id }), "keep") },
        { label: "WhatsApp", icon: "wa", when: (r) => r.phone, run: (r, app) => (app.whatsapp(r.phone, `Assalam o Alaikum ${r.name}, this is ${app.setting("business")}.`), "keep") },
      ],
      related: (r, app) => {
        const visits = app.db.visits.filter((v) => v.patient === r.id).sort((a, b) => b.date.localeCompare(a.date));
        const appts = app.db.appointments.filter((a) => a.patient === r.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        return `<div class="dx-related"><h3>Visits (${visits.length})</h3>${app.list(visits.slice(0, 8), (v) => `<li>${app.openLink("visits", v, `<span class="dx-when">${esc(fmtShort(v.date))}</span><span class="dx-li-main"><b>${esc(v.diagnosis || "Visit")}</b><small>${esc(v.complaint || "")}</small></span>`)}</li>`, "No visits yet.")}</div><div class="dx-related"><h3>Appointments (${appts.length})</h3>${app.list(appts.slice(0, 8), (a) => `<li>${app.openLink("appointments", a, `<span class="dx-when">${esc(fmtShort(a.date))}<small>${esc(app.time(a.time))}</small></span><span class="dx-li-main">${esc(a.type)}</span>${app.pill(a.status, TONE[a.status])}`)}</li>`, "No appointments yet.")}</div>`;
      },
    },
    appointments: {
      label: "Appointments",
      one: "Appointment",
      search: [(r, app) => app.label("patients", r.patient), "type", "status"],
      title: (r, app) => `${app.label("patients", r.patient) || "Patient"} · ${fmtShort(r.date)} ${app.time(r.time)}`,
      badge: (r, app) => app.pill(r.status, TONE[r.status]),
      fields: [
        { key: "patient", label: "Patient", type: "relation", entity: "patients", required: true, hint: "Add new patients on the Patients page first." },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "time", label: "Time", type: "time", required: true, default: "17:00" },
        { key: "type", label: "Type", type: "select", options: TYPES, default: "Consultation" },
        { key: "status", label: "Status", type: "select", options: STATUS, default: "Booked" },
        { key: "fee", label: "Fee (PKR)", type: "money", default: (app) => app.setting("fee") },
        { key: "paid", label: "Payment", type: "select", options: ["Unpaid", "Paid", "Free"], default: "Unpaid" },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Card", "JazzCash", "Easypaisa", "Bank transfer"] },
        { key: "token", label: "Token no.", type: "number" },
        { key: "arrived", label: "Arrived at", type: "time", hideInView: false },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      beforeSave: (r, before, app) => {
        const clash = app.db.appointments.find((x) => x.id !== r.id && x.date === r.date && x.time === r.time && !["No-show"].includes(x.status));
        if (clash && !confirm(`${app.label("patients", clash.patient)} is already booked at ${app.time(r.time)}. Book anyway?`)) return "Not saved.";
      },
      actions: [
        { label: "Check in", icon: "check", primary: true, when: (r) => r.status === "Booked", run: (r, app) => checkIn(r, app) },
        { label: "Call in", icon: "steth", primary: true, when: (r) => r.status === "Waiting", run: (r) => (r.status = "With doctor") },
        { label: "Finish and write notes", icon: "doc", primary: true, when: (r) => r.status === "With doctor", run: (r, app) => ((r.status = "Done"), app.save(), app.open("visits", "", true, { patient: r.patient, appointment: r.id, fee: r.fee }), "keep") },
        { label: "Mark paid", icon: "money", when: (r) => r.paid === "Unpaid" && num(r.fee) > 0, run: (r) => ((r.paid = "Paid"), (r.method ||= "Cash")) },
        { label: "No-show", icon: "close", when: (r) => ["Booked", "Waiting"].includes(r.status), run: (r) => (r.status = "No-show") },
        {
          label: "WhatsApp reminder",
          icon: "wa",
          when: (r, app) => app.find("patients", r.patient)?.phone,
          run: (r, app) => {
            const p = app.find("patients", r.patient);
            app.whatsapp(p.phone, `Assalam o Alaikum ${p.name}, a reminder of your appointment at ${app.setting("business")} on ${dayName(r.date)} ${fmtShort(r.date)} at ${app.time(r.time)}. Please reply to confirm. ${app.setting("address")}`);
            return "keep";
          },
        },
        { label: "Print token", icon: "print", run: (r, app) => (printToken(r, app), "keep") },
      ],
    },
    visits: {
      label: "Visits",
      one: "Visit",
      search: [(r, app) => app.label("patients", r.patient), "diagnosis", "complaint", "medicines"],
      title: (r, app) => `${app.label("patients", r.patient) || "Patient"} · ${fmtShort(r.date)}`,
      fields: [
        { key: "patient", label: "Patient", type: "relation", entity: "patients", required: true },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "bp", label: "BP", type: "text", placeholder: "120/80" },
        { key: "temp", label: "Temperature (°F)", type: "text", placeholder: "98.6" },
        { key: "weight", label: "Weight (kg)", type: "number" },
        { key: "pulse", label: "Pulse", type: "number" },
        { key: "complaint", label: "Complaint", type: "textarea" },
        { key: "diagnosis", label: "Diagnosis", type: "text" },
        { key: "medicines", label: "Medicines (one per line: name — dose — days)", type: "textarea", placeholder: "Tab. Panadol 500mg — 1 + 1 + 1 — 3 days" },
        { key: "tests", label: "Tests", type: "text", placeholder: "CBC, LFT" },
        { key: "advice", label: "Advice", type: "textarea" },
        { key: "followUp", label: "Follow-up on", type: "date" },
        { key: "fee", label: "Fee (PKR)", type: "money" },
      ],
      afterSave: (r, before, app) => {
        if (r.followUp && !before?.followUp && confirm(`Book a follow-up appointment on ${fmtShort(r.followUp)}?`)) app.upsert("appointments", { patient: r.patient, date: r.followUp, time: "17:00", type: "Follow-up", status: "Booked", fee: app.setting("fee"), paid: "Unpaid" });
      },
      actions: [
        { label: "Print prescription", icon: "print", primary: true, run: (r, app) => (printRx(r, app), "keep") },
        {
          label: "Send on WhatsApp",
          icon: "wa",
          when: (r, app) => app.find("patients", r.patient)?.phone,
          run: (r, app) => {
            const p = app.find("patients", r.patient);
            app.whatsapp(p.phone, `${app.setting("business")} — prescription for ${p.name} (${fmtShort(r.date)})\n${r.diagnosis ? "Diagnosis: " + r.diagnosis + "\n" : ""}${r.medicines || ""}${r.advice ? "\nAdvice: " + r.advice : ""}${r.followUp ? "\nFollow-up: " + fmtShort(r.followUp) : ""}`);
            return "keep";
          },
        },
      ],
    },
  },
  pages: [
    {
      id: "overview",
      label: "Overview",
      icon: "home",
      type: "overview",
      actions: [
        { id: "new", label: "New appointment", new: "appointments", primary: true },
        { id: "patient", label: "New patient", new: "patients", icon: "user" },
      ],
      kpis: (db, app) => {
        const t = db.appointments.filter((a) => a.date === today());
        const closed30 = db.appointments.filter((a) => a.date >= addDays(today(), -30) && a.date < today() && ["Done", "No-show"].includes(a.status));
        const ns = closed30.filter((a) => a.status === "No-show").length;
        return [
          { label: "Appointments today", value: t.length, note: `${t.filter((a) => a.status === "Done").length} seen`, icon: "calendar", go: "queue" },
          { label: "In the waiting room", value: t.filter((a) => a.status === "Waiting").length, note: (() => {
            const w = t.filter((a) => a.status === "Waiting").map((a) => minutesSince(a.arrived));
            return w.length ? `longest wait ${Math.max(...w)} min` : "nobody waiting";
          })(), icon: "clock", go: "queue" },
          { label: "Fees collected today", value: app.money(sum(t.filter((a) => a.paid === "Paid"), "fee")), note: `${app.money(sum(t.filter((a) => a.paid === "Unpaid" && a.status === "Done"), "fee"))} unpaid`, icon: "money", go: "fees" },
          { label: "No-show rate (30 days)", value: closed30.length ? Math.round((ns / closed30.length) * 100) + "%" : "—", note: `${ns} of ${closed30.length} visits`, icon: "bell", tone: closed30.length && ns / closed30.length > 0.15 ? "warn" : "" },
        ];
      },
      blocks: (db, app) => {
        const t = db.appointments.filter((a) => a.date === today()).sort((a, b) => a.time.localeCompare(b.time));
        const order = { "With doctor": 0, Waiting: 1, Booked: 2, Done: 3, "No-show": 4 };
        const queue = t.slice().sort((a, b) => order[a.status] - order[b.status] || a.time.localeCompare(b.time));
        const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
        const perDay = days.map((d) => ({ label: fmtShort(d), value: db.appointments.filter((a) => a.date === d && a.status === "Done").length }));
        const upcoming = db.appointments.filter((a) => a.date > today() && a.date <= addDays(today(), 7)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        return [
          {
            title: "Today's queue",
            note: `${t.length} appointments`,
            go: "queue",
            html: app.list(queue, (a) => {
              const p = app.find("patients", a.patient);
              return `<li>${app.openLink("appointments", a, `<span class="dx-when">${esc(app.time(a.time))}<small>Token ${a.token || "—"}</small></span><span class="dx-li-main"><b>${esc(p?.name || "?")}</b><small>${esc(a.type)}${a.status === "Waiting" ? ` · waiting ${minutesSince(a.arrived)} min` : ""}</small></span>${app.pill(a.status === "Waiting" ? "Waiting" : a.status, TONE[a.status])}`)}</li>`;
            }, "No appointments today."),
          },
          { title: "Patients seen per day", note: "last 14 days", html: columnChart(perDay), table: perDay.map((d) => [d.label, d.value]) },
          {
            title: "Coming up",
            note: "next 7 days",
            go: "appointments",
            html: app.list(upcoming.slice(0, 8), (a) => `<li>${app.openLink("appointments", a, `<span class="dx-when">${esc(dayName(a.date))} ${esc(fmtShort(a.date))}<small>${esc(app.time(a.time))}</small></span><span class="dx-li-main"><b>${esc(app.label("patients", a.patient))}</b><small>${esc(a.type)}</small></span>`)}</li>`, "Nothing booked yet."),
          },
          { title: "Common diagnoses", note: "last 90 days", html: barList(groupCount(db.visits.filter((v) => v.date >= addDays(today(), -90)), (v) => v.diagnosis)) },
        ];
      },
    },
    {
      id: "queue",
      label: "Today's queue",
      icon: "board",
      type: "board",
      entity: "appointments",
      field: "status",
      intro: "Drag patients across as they arrive and are seen. Tap a card for its details, payment and WhatsApp.",
      columns: STATUS.map((s) => ({ value: s.value, label: s.label, tone: s.tone })),
      where: (r) => r.date === today(),
      order: (a, b) => a.time.localeCompare(b.time),
      total: (list, app) => (list.length ? app.money(sum(list, "fee")) : ""),
      card: (r, app) => {
        const p = app.find("patients", r.patient);
        return `<b>${esc(p?.name || "?")}</b><small>${esc(app.time(r.time))} · ${esc(r.type)}${r.token ? " · token " + r.token : ""}</small>${r.status === "Waiting" ? `<small>Waiting ${minutesSince(r.arrived)} min</small>` : ""}${r.paid === "Paid" ? app.pill("Paid", "green") : ""}`;
      },
      onMove: (r, before, value, app) => {
        if (value === "Waiting") checkIn(r, app);
      },
      badge: (db) => db.appointments.filter((a) => a.date === today() && a.status === "Waiting").length,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: "calendar",
      type: "calendar",
      entity: "appointments",
      dateKey: "date",
      timeKey: "time",
      hours: [9, 23],
      duration: (r, app) => num(app.setting("slot")) || 20,
      tone: (r) => TONE[r.status],
      event: (r, app) => `<b>${esc(app.label("patients", r.patient))}</b><small>${esc(app.time(r.time))} · ${esc(r.type)}</small>`,
    },
    {
      id: "patients",
      label: "Patients",
      icon: "users",
      type: "table",
      entity: "patients",
      sort: "name",
      filters: [{ key: "gender", label: "Gender", options: ["Female", "Male", "Other"] }],
      columns: [
        { key: "mr", label: "MR no." },
        { key: "name", label: "Name", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "phone", label: "Mobile" },
        { key: "agegender", label: "Age · gender", get: (r) => [r.age ? r.age + " y" : "", r.gender].filter(Boolean).join(" · ") },
        { key: "last", label: "Last visit", get: (r, app) => app.db.visits.filter((v) => v.patient === r.id).map((v) => v.date).sort().pop() || "", html: (r, app) => esc(app.date(app.db.visits.filter((v) => v.patient === r.id).map((v) => v.date).sort().pop() || "")) },
        { key: "visits", label: "Visits", right: true, get: (r, app) => app.db.visits.filter((v) => v.patient === r.id).length },
      ],
    },
    {
      id: "visits",
      label: "Visits & prescriptions",
      icon: "doc",
      type: "table",
      entity: "visits",
      sort: "date",
      dir: -1,
      columns: [
        { key: "date", label: "Date", date: true },
        { key: "patient", label: "Patient" },
        { key: "diagnosis", label: "Diagnosis" },
        { key: "followUp", label: "Follow-up", date: true },
        { key: "fee", label: "Fee", money: true, right: true },
      ],
    },
    {
      id: "fees",
      label: "Fees",
      icon: "money",
      type: "table",
      entity: "appointments",
      add: false,
      importCsv: false,
      sort: "date",
      dir: -1,
      where: (r) => num(r.fee) > 0 && r.status !== "No-show",
      filters: [
        { key: "paid", label: "Payment", options: ["Unpaid", "Paid", "Free"] },
        { key: "month", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })), test: (r, v) => monthOf(r.date) === v },
      ],
      total: (rows, app) => `Collected <b>${esc(app.money(sum(rows.filter((r) => r.paid === "Paid"), "fee")))}</b> · unpaid <b>${esc(app.money(sum(rows.filter((r) => r.paid === "Unpaid" && r.date <= today()), "fee")))}</b>`,
      tools: [{ id: "daycash", label: "Print today's cash", icon: "print", run: (app) => printDay(app) }],
      columns: [
        { key: "date", label: "Date", date: true },
        { key: "patient", label: "Patient" },
        { key: "type", label: "Type" },
        { key: "fee", label: "Fee", money: true, right: true },
        { key: "paid", label: "Payment", html: (r, app) => app.pill(r.paid, r.paid === "Paid" ? "green" : r.paid === "Free" ? "gray" : "amber") },
        { key: "method", label: "Paid by" },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      kpis: (db, app) => {
        const m = thisMonth();
        const done = db.appointments.filter((a) => monthOf(a.date) === m && a.status === "Done");
        const newP = db.patients.filter((p) => monthOf(new Date(p.created).toISOString()) === m && !p.demoOld);
        return [
          { label: "Patients seen this month", value: done.length, icon: "users" },
          { label: "Fee income this month", value: app.money(sum(done.filter((a) => a.paid === "Paid"), "fee")), icon: "money" },
          { label: "New patients this month", value: newP.length, icon: "user" },
          { label: "Average per day", value: (done.length / Math.max(1, new Date().getDate())).toFixed(1), note: "patients seen", icon: "chart" },
        ];
      },
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const income = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.appointments.filter((a) => monthOf(a.date) === m && a.paid === "Paid"), "fee") }));
        const seen = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: db.appointments.filter((a) => monthOf(a.date) === m && a.status === "Done").length }));
        const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({ label: d, value: db.appointments.filter((a) => a.status === "Done" && dayName(a.date) === d).length }));
        const closed = months.map((m) => {
          const c = db.appointments.filter((a) => monthOf(a.date) === m && ["Done", "No-show"].includes(a.status));
          return { label: fmtMonth(m).slice(0, 3), value: c.length ? Math.round((c.filter((a) => a.status === "No-show").length / c.length) * 100) : 0 };
        });
        return [
          { title: "Fee income", note: "last 6 months", html: lineChart(income, { fmt: (v) => app.money(v) }), table: income.map((d) => [d.label, app.money(d.value)]) },
          { title: "Patients seen", note: "last 6 months", html: columnChart(seen), table: seen.map((d) => [d.label, d.value]) },
          { title: "Appointment types", html: barList(groupCount(db.appointments.filter((a) => a.status === "Done"), (a) => a.type)) },
          { title: "Busiest weekdays", html: barList(wd.slice().sort((a, b) => b.value - a.value), { max: 7 }) },
          { title: "No-show rate by month", note: "%", html: columnChart(closed, { fmt: (v) => v + "%" }), table: closed.map((d) => [d.label, d.value + "%"]) },
          { title: "Patients by gender", html: barList(groupCount(db.patients, (p) => p.gender)) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const diag = ["Viral fever", "Hypertension", "Type 2 diabetes", "Gastritis", "Upper respiratory infection", "Migraine", "Allergic rhinitis", "Back pain", "Anaemia", "Urinary tract infection"];
    const meds = { "Viral fever": "Tab. Paracetamol 500mg — 1 + 1 + 1 — 3 days\nORS — after each loose stool", Hypertension: "Tab. Amlodipine 5mg — 1 at night — 30 days", "Type 2 diabetes": "Tab. Metformin 500mg — 1 + 0 + 1 — 30 days", Gastritis: "Cap. Omeprazole 20mg — before breakfast — 14 days" };
    const patients = Array.from({ length: 42 }, (_, i) => {
      const g = h.rand() < 0.55 ? "f" : "m";
      return { id: "p" + i, name: h.person(g), phone: h.phone(), mr: "MR-" + String(i + 1).padStart(4, "0"), gender: g === "f" ? "Female" : "Male", age: h.int(4, 78), blood: h.pick(["A+", "B+", "O+", "AB+", "O−"]), city: h.pick(["Gulberg", "Model Town", "DHA", "Johar Town", "Iqbal Town", "Shadman"]), demoOld: i < 34 };
    });
    const appointments = [];
    const visits = [];
    const times = ["17:00", "17:20", "17:40", "18:00", "18:20", "18:40", "19:00", "19:20", "19:40", "20:00", "20:20", "20:40", "21:00"];
    for (let d = -50; d <= 7; d++) {
      const day = h.day(d);
      if (dayName(day) === "Sun") continue;
      const n = d === 0 ? 11 : h.int(4, 9);
      const slots = times.slice().sort(() => h.rand() - 0.5).slice(0, n).sort();
      slots.forEach((time, k) => {
        const p = h.pick(patients);
        let status = "Booked";
        if (d < 0) status = h.rand() < 0.1 ? "No-show" : "Done";
        if (d === 0) status = k < 5 ? "Done" : k === 5 ? "With doctor" : k < 8 ? "Waiting" : "Booked";
        const type = h.pick(["Consultation", "Consultation", "Follow-up", "Check-up", "Lab review", "Vaccination"]);
        const fee = type === "Vaccination" ? 800 : type === "Follow-up" ? 1000 : 1500;
        const id = `a${d}_${k}`;
        appointments.push({ id, patient: p.id, date: day, time, type, status, fee, paid: status === "Done" || (d === 0 && status !== "Booked") ? (h.rand() < 0.9 ? "Paid" : "Unpaid") : "Unpaid", method: h.pick(["Cash", "Cash", "Cash", "JazzCash", "Card"]), token: k + 1, arrived: status === "Waiting" ? (() => {
          const [hh, mm] = nowTime().split(":").map(Number);
          const t = hh * 60 + mm - h.int(6, 35);
          return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(((t % 60) + 60) % 60).padStart(2, "0")}`;
        })() : "" });
        if (status === "Done") {
          const dg = h.pick(diag);
          visits.push({ patient: p.id, appointment: id, date: day, diagnosis: dg, complaint: { "Viral fever": "Fever and body ache for 2 days", Hypertension: "Headache, BP check", Gastritis: "Burning in the stomach after meals" }[dg] || "Routine visit", bp: `${h.int(110, 150)}/${h.int(70, 95)}`, temp: (97.8 + h.rand() * 3).toFixed(1), weight: h.int(18, 92), medicines: meds[dg] || "Tab. Paracetamol 500mg — when needed", advice: "Plenty of water, rest.", fee });
        }
      });
    }
    return { patients, appointments, visits };
  },
});

function checkIn(r, app) {
  r.status = "Waiting";
  r.arrived = nowTime();
  if (!r.token) r.token = app.db.appointments.filter((a) => a.date === r.date && a.token).reduce((m, a) => Math.max(m, num(a.token)), 0) + 1;
}

function printToken(r, app) {
  const p = app.find("patients", r.patient);
  app.print("Token", `<div style="text-align:center;padding:20px 0"><div style="font-size:14px">${esc(app.setting("doctor"))}</div><div style="font-size:64px;font-weight:800;margin:10px 0">${esc(r.token || "—")}</div><div style="font-size:16px"><b>${esc(p?.name || "")}</b></div><div>${esc(fmtShort(r.date))} · ${esc(app.time(r.time))} · ${esc(r.type)}</div><div style="margin-top:8px">Fee: ${esc(app.money(r.fee))} (${esc(r.paid)})</div></div>`);
}

function printRx(r, app) {
  const p = app.find("patients", r.patient) || {};
  const meds = String(r.medicines || "")
    .split("\n")
    .filter(Boolean)
    .map((l, i) => `<tr><td>${i + 1}</td><td>${l.split("—").map((x) => esc(x.trim())).join("</td><td>")}</td></tr>`)
    .join("");
  app.print(
    "Prescription",
    `<div class="dx-doc-meta"><div><b>Patient:</b> ${esc(p.name || "")}</div><div><b>MR no.:</b> ${esc(p.mr || "")}</div><div><b>Age / gender:</b> ${esc([p.age ? p.age + " y" : "", p.gender].filter(Boolean).join(" / "))}</div><div><b>Date:</b> ${esc(app.date(r.date))}</div><div><b>BP:</b> ${esc(r.bp || "—")} · <b>Temp:</b> ${esc(r.temp || "—")} · <b>Weight:</b> ${esc(r.weight || "—")} kg</div><div><b>Allergies:</b> ${esc(p.allergies || "None noted")}</div></div>${r.complaint ? `<p><b>Complaint:</b> ${esc(r.complaint)}</p>` : ""}${r.diagnosis ? `<p><b>Diagnosis:</b> ${esc(r.diagnosis)}</p>` : ""}<h3 style="font-size:22px;margin:14px 0 4px">℞</h3><table class="dx-doc-table"><thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Days</th></tr></thead><tbody>${meds || '<tr><td colspan="4">—</td></tr>'}</tbody></table>${r.tests ? `<p><b>Tests:</b> ${esc(r.tests)}</p>` : ""}${r.advice ? `<p><b>Advice:</b> ${esc(r.advice)}</p>` : ""}${r.followUp ? `<p><b>Follow-up:</b> ${esc(app.date(r.followUp))}</p>` : ""}<div style="margin-top:40px;text-align:right">______________________<br>${esc(app.setting("doctor"))}</div>`,
  );
}

function printDay(app) {
  const rows = app.db.appointments.filter((a) => a.date === today() && a.paid === "Paid").sort((a, b) => a.time.localeCompare(b.time));
  const by = {};
  for (const r of rows) by[r.method || "Cash"] = (by[r.method || "Cash"] || 0) + num(r.fee);
  app.print(
    "Daily cash · " + app.date(today()),
    `<table class="dx-doc-table"><thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>Paid by</th><th class="r">Fee</th></tr></thead><tbody>${rows
      .map((r) => `<tr><td>${esc(app.time(r.time))}</td><td>${esc(app.label("patients", r.patient))}</td><td>${esc(r.type)}</td><td>${esc(r.method || "Cash")}</td><td class="r">${esc(app.money(r.fee))}</td></tr>`)
      .join("") || '<tr><td colspan="5">No payments today.</td></tr>'}</tbody></table><div class="dx-doc-sum">${Object.entries(by)
      .map(([m, v]) => `<div><span>${esc(m)}</span><b>${esc(app.money(v))}</b></div>`)
      .join("")}<div class="dx-doc-grand"><span>Total</span><b>${esc(app.money(sum(rows, "fee")))}</b></div></div>`,
  );
}

export default app;
