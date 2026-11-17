// Invoices and billing: invoices with GST and discount, payments (part payments too), quotations that turn into
// invoices, clients with balances, expenses, aging and profit reports. Print or share on WhatsApp.
import { createApp, esc, today, addDays, thisMonth, addMonths, monthOf, fmtShort, fmtMonth, dayDiff, num, sum, groupSum, columnChart, lineChart, barList } from "../shared/dash.js";

const sub = (d, app) => app.linesTotal(d.lines);
const totalOf = (d, app) => {
  const s = sub(d, app);
  const disc = Math.min(s, num(d.discount));
  return s - disc + Math.round(((s - disc) * num(d.tax)) / 100);
};
const paidOf = (inv, app) => sum(app.db.payments.filter((p) => p.invoice === inv.id), "amount");
const dueOf = (inv, app) => Math.max(0, totalOf(inv, app) - paidOf(inv, app));
const stateOf = (inv, app) => (inv.status === "Draft" ? "Draft" : inv.status === "Cancelled" ? "Cancelled" : dueOf(inv, app) <= 0 ? "Paid" : paidOf(inv, app) > 0 ? (inv.due < today() ? "Overdue" : "Part paid") : inv.due < today() ? "Overdue" : "Sent");
const TONE = { Draft: "gray", Sent: "blue", "Part paid": "amber", Paid: "green", Overdue: "red", Cancelled: "gray" };
const EXP = ["Rent", "Salaries", "Electricity & gas", "Internet & phone", "Supplies", "Transport & fuel", "Marketing", "Bank charges", "Repairs", "Other"];

function docHtml(app, d, kind) {
  const c = app.find("clients", d.client) || {};
  const s = sub(d, app);
  const disc = Math.min(s, num(d.discount));
  const tax = Math.round(((s - disc) * num(d.tax)) / 100);
  const paid = kind === "Invoice" ? paidOf(d, app) : 0;
  return `<div class="dx-doc-meta"><div><b>Bill to:</b> ${esc(c.name || "")}<br>${esc(c.address || "")}${c.ntn ? `<br>NTN: ${esc(c.ntn)}` : ""}</div><div><b>${kind} no.:</b> ${esc(d.no)}<br><b>Date:</b> ${esc(app.date(d.date))}<br>${kind === "Invoice" ? `<b>Due:</b> ${esc(app.date(d.due))}` : `<b>Valid until:</b> ${esc(app.date(d.valid))}`}</div></div><table class="dx-doc-table"><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${(d.lines || [])
    .map((l) => `<tr><td>${esc(l.name)}</td><td class="r">${l.qty}</td><td class="r">${esc(app.money(l.price))}</td><td class="r">${esc(app.money(num(l.qty) * num(l.price)))}</td></tr>`)
    .join("")}</tbody></table><div class="dx-doc-sum"><div><span>Subtotal</span><b>${esc(app.money(s))}</b></div>${disc ? `<div><span>Discount</span><b>− ${esc(app.money(disc))}</b></div>` : ""}${num(d.tax) ? `<div><span>Sales tax ${num(d.tax)}%</span><b>${esc(app.money(tax))}</b></div>` : ""}<div class="dx-doc-grand"><span>Total</span><b>${esc(app.money(s - disc + tax))}</b></div>${paid ? `<div><span>Paid</span><b>${esc(app.money(paid))}</b></div><div><span>Balance due</span><b>${esc(app.money(s - disc + tax - paid))}</b></div>` : ""}</div>${d.notes ? `<p>${esc(d.notes)}</p>` : ""}<p style="margin-top:18px;font-size:11.5px"><b>Payment:</b> ${esc(app.setting("bank") || "")}<br>${esc(app.setting("terms") || "")}${app.setting("ntn") ? `<br>Our NTN: ${esc(app.setting("ntn"))}` : ""}</p>`;
}

const app = createApp({
  id: "invoices",
  title: "Invoices and billing",
  brand: "Pixel Studio",
  icon: "receipt",
  accent: "#047857",
  settings: [
    { key: "business", label: "Business name", type: "text", default: "Pixel Studio" },
    { key: "phone", label: "Phone", type: "phone", default: "0301 2223334" },
    { key: "address", label: "Address", type: "text", default: "Office 4, Shahrah-e-Faisal, Karachi" },
    { key: "ntn", label: "NTN / STRN", type: "text" },
    { key: "bank", label: "Bank details on invoices", type: "text", default: "Bank Alfalah · Pixel Studio · PK00 ALFH 0000 0012 3456 7890" },
    { key: "terms", label: "Terms", type: "text", default: "Payment within 15 days. Thank you for your business." },
    { key: "tax", label: "Default sales tax (%)", type: "percent", default: 0 },
    { key: "days", label: "Default days to pay", type: "number", default: 15 },
  ],
  entities: {
    invoices: {
      label: "Invoices",
      one: "Invoice",
      search: ["no", (r, app) => app.label("clients", r.client), "notes"],
      title: (r, app) => `${r.no} · ${app.label("clients", r.client)}`,
      badge: (r, app) => app.pill(stateOf(r, app), TONE[stateOf(r, app)]) + " " + app.pill(app.money(totalOf(r, app)), "gray"),
      fields: [
        { key: "no", label: "Invoice no.", type: "text", default: (app) => app.nextNo("invoices", "INV-") },
        { key: "client", label: "Client", type: "relation", entity: "clients", required: true },
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "due", label: "Due date", type: "date", required: true, default: (app) => addDays(today(), num(app.setting("days")) || 15) },
        { key: "lines", label: "Items", type: "lines", itemLabel: "Description" },
        { key: "discount", label: "Discount (PKR)", type: "money" },
        { key: "tax", label: "Sales tax (%)", type: "percent", default: (app) => app.setting("tax") },
        { key: "status", label: "Status", type: "select", options: ["Draft", "Sent", "Cancelled"], default: "Sent", hint: "Paid, part paid and overdue are worked out from payments." },
        { key: "notes", label: "Notes on invoice", type: "textarea" },
      ],
      beforeSave: (r) => {
        if (!(r.lines || []).length) return "Add at least one item.";
      },
      actions: [
        {
          label: "Record payment",
          icon: "money",
          primary: true,
          when: (r, app) => stateOf(r, app) !== "Draft" && dueOf(r, app) > 0,
          run: (r, app) => {
            const a = num(prompt(`Amount received (balance ${app.money(dueOf(r, app))}):`, String(dueOf(r, app))));
            if (!a) return "keep";
            app.upsert("payments", { date: today(), invoice: r.id, amount: Math.min(a, dueOf(r, app)), method: prompt("Paid by (Bank transfer, Cash, Cheque, JazzCash):", "Bank transfer") || "Bank transfer" });
            app.toast(dueOf(r, app) ? `Received. ${app.money(dueOf(r, app))} still due.` : "Paid in full.");
          },
        },
        { label: "Mark sent", icon: "check", when: (r) => r.status === "Draft", run: (r) => (r.status = "Sent") },
        { label: "Print / PDF", icon: "print", run: (r, app) => (app.print("Invoice", docHtml(app, r, "Invoice")), "keep") },
        {
          label: "Send on WhatsApp",
          icon: "wa",
          when: (r, app) => app.find("clients", r.client)?.phone,
          run: (r, app) => {
            const c = app.find("clients", r.client);
            app.whatsapp(c.phone, `Dear ${c.contact || c.name}, invoice ${r.no} from ${app.setting("business")}: ${app.money(totalOf(r, app))}${paidOf(r, app) ? `, balance ${app.money(dueOf(r, app))}` : ""}, due ${fmtShort(r.due)}.\n${(r.lines || []).map((l) => `• ${l.name} × ${l.qty}`).join("\n")}\n${app.setting("bank")}`);
            return "keep";
          },
        },
        { label: "Duplicate", icon: "plus", run: (r, app) => (app.open("invoices", "", true, { client: r.client, lines: (r.lines || []).map((l) => ({ ...l })), tax: r.tax, discount: r.discount }), "keep") },
      ],
      related: (r, app) => {
        const ps = app.db.payments.filter((p) => p.invoice === r.id);
        return `<div class="dx-related"><h3>Payments · ${esc(app.money(paidOf(r, app)))} of ${esc(app.money(totalOf(r, app)))}</h3>${app.list(ps, (p) => `<li>${app.openLink("payments", p, `<span class="dx-when">${esc(fmtShort(p.date))}</span><span class="dx-li-main"><b>${esc(app.money(p.amount))}</b><small>${esc(p.method || "")}</small></span>`)}</li>`, "No payments yet.")}</div>`;
      },
    },
    quotes: {
      label: "Quotations",
      one: "Quotation",
      search: ["no", (r, app) => app.label("clients", r.client)],
      title: (r, app) => `${r.no} · ${app.label("clients", r.client)}`,
      badge: (r, app) => app.pill(r.status, { Draft: "gray", Sent: "blue", Accepted: "green", Declined: "red", Invoiced: "purple" }[r.status]),
      fields: [
        { key: "no", label: "Quotation no.", type: "text", default: (app) => app.nextNo("quotes", "QT-") },
        { key: "client", label: "Client", type: "relation", entity: "clients", required: true },
        { key: "date", label: "Date", type: "date", default: today },
        { key: "valid", label: "Valid until", type: "date", default: () => addDays(today(), 15) },
        { key: "lines", label: "Items", type: "lines", itemLabel: "Description" },
        { key: "discount", label: "Discount (PKR)", type: "money" },
        { key: "tax", label: "Sales tax (%)", type: "percent", default: (app) => app.setting("tax") },
        { key: "status", label: "Status", type: "select", options: ["Draft", "Sent", "Accepted", "Declined", "Invoiced"], default: "Sent" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      actions: [
        {
          label: "Turn into invoice",
          icon: "receipt",
          primary: true,
          when: (r) => r.status !== "Invoiced",
          run: (r, app) => {
            const inv = app.upsert("invoices", { no: app.nextNo("invoices", "INV-"), client: r.client, date: today(), due: addDays(today(), num(app.setting("days")) || 15), lines: (r.lines || []).map((l) => ({ ...l })), discount: r.discount, tax: r.tax, status: "Sent", notes: r.notes, fromQuote: r.no });
            r.status = "Invoiced";
            app.save();
            app.open("invoices", inv.id);
            return "keep";
          },
        },
        { label: "Print / PDF", icon: "print", run: (r, app) => (app.print("Quotation", docHtml(app, r, "Quotation")), "keep") },
      ],
    },
    payments: {
      label: "Payments",
      one: "Payment",
      search: [(r, app) => app.find("invoices", r.invoice)?.no || "", "method", "ref"],
      title: (r, app) => `${app.money(r.amount)} · ${app.find("invoices", r.invoice)?.no || ""}`,
      fields: [
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "invoice", label: "Invoice", type: "relation", entity: "invoices", required: true },
        { key: "amount", label: "Amount (PKR)", type: "money", required: true },
        { key: "method", label: "Paid by", type: "select", options: ["Bank transfer", "Cash", "Cheque", "JazzCash", "Easypaisa", "Card"], default: "Bank transfer" },
        { key: "ref", label: "Reference", type: "text", placeholder: "Cheque or transaction no." },
      ],
    },
    clients: {
      label: "Clients",
      one: "Client",
      search: ["name", "contact", "phone", "email", "city"],
      title: (r) => r.name,
      fields: [
        { key: "name", label: "Client / company", type: "text", required: true },
        { key: "contact", label: "Contact person", type: "text" },
        { key: "phone", label: "Mobile", type: "phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "address", label: "Address", type: "text" },
        { key: "city", label: "City", type: "text" },
        { key: "ntn", label: "NTN", type: "text" },
      ],
      actions: [
        { label: "New invoice", icon: "plus", primary: true, run: (r, app) => (app.open("invoices", "", true, { client: r.id }), "keep") },
        { label: "Statement", icon: "print", run: (r, app) => (printStatement(r, app), "keep") },
      ],
      related: (r, app) => {
        const inv = app.db.invoices.filter((i) => i.client === r.id && i.status !== "Cancelled").sort((a, b) => b.date.localeCompare(a.date));
        return `<div class="dx-related"><h3>Invoices · balance ${esc(app.money(sum(inv, (i) => (i.status === "Draft" ? 0 : dueOf(i, app)))))}</h3>${app.list(inv.slice(0, 10), (i) => `<li>${app.openLink("invoices", i, `<span class="dx-when">${esc(fmtShort(i.date))}</span><span class="dx-li-main"><b>${esc(i.no)}</b><small>${esc(app.money(totalOf(i, app)))}</small></span>${app.pill(stateOf(i, app), TONE[stateOf(i, app)])}`)}</li>`, "No invoices yet.")}</div>`;
      },
    },
    expenses: {
      label: "Expenses",
      one: "Expense",
      search: ["vendor", "category", "note"],
      title: (r) => `${r.category} · ${r.vendor || ""}`,
      fields: [
        { key: "date", label: "Date", type: "date", required: true, default: today },
        { key: "category", label: "Category", type: "select", options: EXP, required: true },
        { key: "amount", label: "Amount (PKR)", type: "money", required: true },
        { key: "vendor", label: "Paid to", type: "text" },
        { key: "method", label: "Paid by", type: "select", options: ["Cash", "Bank transfer", "Card", "JazzCash"] },
        { key: "note", label: "Note", type: "text" },
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
        { id: "i", label: "New invoice", new: "invoices", primary: true },
        { id: "q", label: "New quotation", new: "quotes", icon: "doc" },
        { id: "e", label: "Add expense", new: "expenses", icon: "money" },
      ],
      kpis: (db, app) => {
        const live = db.invoices.filter((i) => !["Draft", "Cancelled"].includes(i.status));
        const overdue = live.filter((i) => stateOf(i, app) === "Overdue");
        const inM = sum(db.payments.filter((p) => monthOf(p.date) === thisMonth()), "amount");
        const exM = sum(db.expenses.filter((e) => monthOf(e.date) === thisMonth()), "amount");
        return [
          { label: "Waiting to be paid", value: app.money(sum(live, (i) => dueOf(i, app))), note: `${live.filter((i) => dueOf(i, app) > 0).length} invoices`, icon: "receipt", go: "invoices" },
          { label: "Overdue", value: app.money(sum(overdue, (i) => dueOf(i, app))), note: `${overdue.length} invoices`, icon: "bell", tone: overdue.length ? "warn" : "", go: "invoices" },
          { label: "Received this month", value: app.money(inM), icon: "money", tone: "good", go: "payments" },
          { label: "Profit this month", value: app.money(inM - exM), note: `expenses ${app.money(exM)}`, icon: "chart" },
        ];
      },
      blocks: (db, app) => {
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const income = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.payments.filter((p) => monthOf(p.date) === m), "amount") }));
        const profit = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: Math.max(0, sum(db.payments.filter((p) => monthOf(p.date) === m), "amount") - sum(db.expenses.filter((e) => monthOf(e.date) === m), "amount")) }));
        const unpaid = db.invoices.filter((i) => !["Draft", "Cancelled"].includes(i.status) && dueOf(i, app) > 0).sort((a, b) => a.due.localeCompare(b.due));
        return [
          { title: "Money received", note: "last 6 months", html: lineChart(income, { fmt: (v) => app.money(v) }), table: income.map((d) => [d.label, app.money(d.value)]) },
          { title: "Profit", note: "received − expenses", html: columnChart(profit, { fmt: (v) => app.moneyShort(v) }), table: profit.map((d) => [d.label, app.money(d.value)]) },
          { title: "To collect", go: "invoices", html: app.list(unpaid.slice(0, 8), (i) => `<li>${app.openLink("invoices", i, `<span class="dx-when">${esc(fmtShort(i.due))}<small>due</small></span><span class="dx-li-main"><b>${esc(app.label("clients", i.client))}</b><small>${esc(i.no)}</small></span><b>${esc(app.money(dueOf(i, app)))}</b>${app.pill(stateOf(i, app), TONE[stateOf(i, app)])}`)}</li>`, "Nothing to collect.") },
          { title: "Top clients", note: "billed, 6 months", html: barList(groupSum(db.invoices.filter((i) => i.status !== "Cancelled" && i.date >= addDays(today(), -183)), (i) => app.label("clients", i.client), (i) => totalOf(i, app)), { fmt: (v) => app.moneyShort(v) }) },
        ];
      },
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: "receipt",
      type: "table",
      entity: "invoices",
      sort: "no",
      dir: -1,
      importCsv: false,
      filters: [
        { key: "state", label: "Status", options: ["Draft", "Sent", "Part paid", "Paid", "Overdue", "Cancelled"], test: (r, v, app) => stateOf(r, app) === v },
        { key: "client", label: "Client", options: (app) => app.db.clients.map((c) => ({ value: c.id, label: c.name })) },
      ],
      total: (rows, app) => `Billed <b>${esc(app.money(sum(rows.filter((i) => i.status !== "Cancelled"), (i) => totalOf(i, app))))}</b> · balance <b>${esc(app.money(sum(rows.filter((i) => !["Draft", "Cancelled"].includes(i.status)), (i) => dueOf(i, app))))}</b>`,
      columns: [
        { key: "no", label: "Invoice", html: (r) => `<b>${esc(r.no)}</b>` },
        { key: "client", label: "Client" },
        { key: "date", label: "Date", date: true },
        { key: "due", label: "Due", date: true },
        { key: "total", label: "Total", right: true, get: (r, app) => totalOf(r, app), html: (r, app) => esc(app.money(totalOf(r, app))) },
        { key: "balance", label: "Balance", right: true, get: (r, app) => dueOf(r, app), html: (r, app) => esc(app.money(dueOf(r, app))) },
        { key: "state", label: "Status", get: (r, app) => stateOf(r, app), html: (r, app) => app.pill(stateOf(r, app), TONE[stateOf(r, app)]) },
      ],
      badge: (db) => 0,
    },
    {
      id: "quotes",
      label: "Quotations",
      icon: "doc",
      type: "table",
      entity: "quotes",
      sort: "no",
      dir: -1,
      importCsv: false,
      filters: [{ key: "status", label: "Status", options: ["Draft", "Sent", "Accepted", "Declined", "Invoiced"] }],
      columns: [
        { key: "no", label: "Quotation", html: (r) => `<b>${esc(r.no)}</b>` },
        { key: "client", label: "Client" },
        { key: "date", label: "Date", date: true },
        { key: "valid", label: "Valid until", date: true },
        { key: "total", label: "Total", right: true, get: (r, app) => totalOf(r, app), html: (r, app) => esc(app.money(totalOf(r, app))) },
        { key: "status", label: "Status", html: (r, app) => app.pill(r.status, { Draft: "gray", Sent: "blue", Accepted: "green", Declined: "red", Invoiced: "purple" }[r.status]) },
      ],
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
        { key: "method", label: "Paid by", options: ["Bank transfer", "Cash", "Cheque", "JazzCash", "Easypaisa", "Card"] },
        { key: "m", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })), test: (r, v) => monthOf(r.date) === v },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, "amount")))}</b>`,
      columns: [
        { key: "date", label: "Date", date: true },
        { key: "invoice", label: "Invoice", get: (r, app) => app.find("invoices", r.invoice)?.no || "" },
        { key: "client", label: "Client", get: (r, app) => app.label("clients", app.find("invoices", r.invoice)?.client) },
        { key: "amount", label: "Amount", money: true, right: true },
        { key: "method", label: "Paid by" },
        { key: "ref", label: "Reference" },
      ],
    },
    {
      id: "clients",
      label: "Clients",
      icon: "users",
      type: "table",
      entity: "clients",
      sort: "name",
      columns: [
        { key: "name", label: "Client", html: (r) => `<b>${esc(r.name)}</b>` },
        { key: "contact", label: "Contact" },
        { key: "phone", label: "Mobile" },
        { key: "city", label: "City" },
        { key: "billed", label: "Billed", right: true, get: (r, app) => sum(app.db.invoices.filter((i) => i.client === r.id && i.status !== "Cancelled"), (i) => totalOf(i, app)), html: (r, app) => esc(app.moneyShort(sum(app.db.invoices.filter((i) => i.client === r.id && i.status !== "Cancelled"), (i) => totalOf(i, app)))) },
        { key: "balance", label: "Balance", right: true, get: (r, app) => sum(app.db.invoices.filter((i) => i.client === r.id && !["Draft", "Cancelled"].includes(i.status)), (i) => dueOf(i, app)), html: (r, app) => esc(app.money(sum(app.db.invoices.filter((i) => i.client === r.id && !["Draft", "Cancelled"].includes(i.status)), (i) => dueOf(i, app)))) },
      ],
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: "cart",
      type: "table",
      entity: "expenses",
      sort: "date",
      dir: -1,
      filters: [
        { key: "category", label: "Category", options: EXP },
        { key: "m", label: "Month", options: () => Array.from({ length: 6 }, (_, i) => ({ value: addMonths(thisMonth(), -i), label: fmtMonth(addMonths(thisMonth(), -i)) })), test: (r, v) => monthOf(r.date) === v },
      ],
      total: (rows, app) => `Total <b>${esc(app.money(sum(rows, "amount")))}</b>`,
      columns: [
        { key: "date", label: "Date", date: true },
        { key: "category", label: "Category" },
        { key: "vendor", label: "Paid to" },
        { key: "amount", label: "Amount", money: true, right: true },
        { key: "method", label: "Paid by" },
        { key: "note", label: "Note" },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: "chart",
      type: "overview",
      blocks: (db, app) => {
        const live = db.invoices.filter((i) => !["Draft", "Cancelled"].includes(i.status) && dueOf(i, app) > 0);
        const bucket = (i) => {
          const late = dayDiff(today(), i.due);
          return late <= 0 ? "Not due yet" : late <= 30 ? "1–30 days late" : late <= 60 ? "31–60 days late" : late <= 90 ? "61–90 days late" : "Over 90 days";
        };
        const order = ["Not due yet", "1–30 days late", "31–60 days late", "61–90 days late", "Over 90 days"];
        const aging = order.map((b) => ({ label: b, value: sum(live.filter((i) => bucket(i) === b), (i) => dueOf(i, app)) }));
        const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth(), i - 5));
        const ex = months.map((m) => ({ label: fmtMonth(m).slice(0, 3), value: sum(db.expenses.filter((e) => monthOf(e.date) === m), "amount") }));
        const paidInv = db.invoices.filter((i) => stateOf(i, app) === "Paid");
        const daysToPay = paidInv.map((i) => {
          const last = db.payments.filter((p) => p.invoice === i.id).map((p) => p.date).sort().pop();
          return last ? dayDiff(last, i.date) : null;
        }).filter((x) => x !== null);
        return [
          { title: "Aging of unpaid invoices", html: barList(aging, { fmt: (v) => app.money(v), max: 5 }), table: aging.map((d) => [d.label, app.money(d.value)]) },
          { title: "Expenses by month", html: columnChart(ex, { fmt: (v) => app.moneyShort(v) }), table: ex.map((d) => [d.label, app.money(d.value)]) },
          { title: "Expenses by category", note: "this year", html: barList(groupSum(db.expenses.filter((e) => e.date.slice(0, 4) === today().slice(0, 4)), (e) => e.category, (e) => e.amount), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Who owes most", html: barList(groupSum(live, (i) => app.label("clients", i.client), (i) => dueOf(i, app)), { fmt: (v) => app.moneyShort(v) }) },
          { title: "Average days to get paid", html: `<div class="dx-kpi" style="box-shadow:none;border:0;padding:0"><b>${daysToPay.length ? Math.round(daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length) : "—"} days</b><small>from invoice date to the last payment, ${daysToPay.length} paid invoices</small></div>` },
          { title: "Quotations won", html: barList(["Accepted", "Invoiced", "Declined", "Sent", "Draft"].map((s) => ({ label: s, value: db.quotes.filter((q) => q.status === s).length }))) },
        ];
      },
    },
    { id: "settings", label: "Settings", icon: "settings", type: "settings" },
  ],
  demo: (h) => {
    const names = ["Habib Steel", "Bahria Builders", "Gourmet Bakers", "Zameen Realtors", "Shifa Hospital", "Khaadi Outlet", "Daraz Seller Hub", "Nestle Distributor", "Al-Karam Textiles", "The City School", "K-Electric Vendor", "Careem Fleet"];
    const clients = names.map((name, i) => ({ id: "c" + i, name, contact: h.person(), phone: h.phone(), email: `accounts@${name.toLowerCase().replace(/[^a-z]/g, "")}.pk`, city: h.pick(["Karachi", "Lahore", "Islamabad"]), address: h.pick(["Clifton", "Gulberg", "Blue Area", "SITE", "DHA Phase 6"]) }));
    const work = [
      ["Logo design", 25000],
      ["Website design (5 pages)", 120000],
      ["Monthly social media", 45000],
      ["Product photography", 18000],
      ["Brochure design", 15000],
      ["Video ad (30 s)", 60000],
      ["SEO (monthly)", 35000],
      ["Hosting (1 year)", 12000],
    ];
    const invoices = [];
    const payments = [];
    for (let i = 0; i < 46; i++) {
      const d = -h.int(0, 175);
      const lines = Array.from({ length: h.int(1, 3) }, () => {
        const [name, price] = h.pick(work);
        return { name, qty: h.pick([1, 1, 1, 2, 3]), price };
      });
      const inv = { id: "i" + i, no: "INV-" + String(i + 1).padStart(4, "0"), client: h.pick(clients).id, date: h.day(d), due: h.day(d + 15), lines, discount: h.rand() < 0.2 ? 5000 : 0, tax: h.rand() < 0.3 ? 16 : 0, status: i > 43 ? "Draft" : "Sent" };
      invoices.push(inv);
      const s = lines.reduce((a, l) => a + l.qty * l.price, 0) - inv.discount;
      const total = s + Math.round((s * inv.tax) / 100);
      const r = h.rand();
      if (inv.status === "Sent" && d < -5) {
        if (r < 0.7) payments.push({ date: h.day(Math.min(0, d + h.int(3, 40))), invoice: inv.id, amount: total, method: h.pick(["Bank transfer", "Bank transfer", "Cheque", "Cash"]) });
        else if (r < 0.82) payments.push({ date: h.day(Math.min(0, d + h.int(3, 20))), invoice: inv.id, amount: Math.round(total / 2), method: "Bank transfer" });
      }
    }
    const quotes = Array.from({ length: 12 }, (_, i) => {
      const [name, price] = h.pick(work);
      return { no: "QT-" + String(i + 1).padStart(4, "0"), client: h.pick(clients).id, date: h.day(-h.int(0, 60)), valid: h.day(h.int(-30, 15)), lines: [{ name, qty: 1, price }], tax: 0, status: h.pick(["Sent", "Accepted", "Declined", "Invoiced", "Draft"]) };
    });
    const expenses = [];
    for (let m = 5; m >= 0; m--) {
      const base = addMonths(thisMonth(), -m) + "-";
      expenses.push({ date: base + "01", category: "Rent", amount: 85000, vendor: "Landlord", method: "Bank transfer" });
      expenses.push({ date: base + "01", category: "Salaries", amount: 240000, vendor: "Staff", method: "Bank transfer" });
      expenses.push({ date: base + "08", category: "Electricity & gas", amount: h.int(18, 45) * 1000, vendor: "K-Electric", method: "Bank transfer" });
      expenses.push({ date: base + "10", category: "Internet & phone", amount: 9500, vendor: "PTCL", method: "Card" });
      for (let k = 0; k < 4; k++) expenses.push({ date: base + String(h.int(2, 27)).padStart(2, "0"), category: h.pick(["Supplies", "Transport & fuel", "Marketing", "Repairs", "Other"]), amount: h.int(2, 30) * 1000, vendor: h.pick(["Hall Road", "PSO", "Facebook ads", "Stationery shop", "Careem"]), method: h.pick(["Cash", "Card"]) });
    }
    return { clients, invoices, payments, quotes, expenses: expenses.filter((e) => e.date <= today()) };
  },
});

function printStatement(c, app) {
  const inv = app.db.invoices.filter((i) => i.client === c.id && !["Draft", "Cancelled"].includes(i.status)).sort((a, b) => a.date.localeCompare(b.date));
  app.print(`Statement · ${c.name}`, `<p>Statement of account for <b>${esc(c.name)}</b> as of ${esc(app.date(today()))}.</p><table class="dx-doc-table"><thead><tr><th>Date</th><th>Invoice</th><th>Due</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Balance</th></tr></thead><tbody>${inv
    .map((i) => `<tr><td>${esc(app.date(i.date))}</td><td>${esc(i.no)}</td><td>${esc(app.date(i.due))}</td><td class="r">${esc(app.money(totalOf(i, app)))}</td><td class="r">${esc(app.money(paidOf(i, app)))}</td><td class="r">${esc(app.money(dueOf(i, app)))}</td></tr>`)
    .join("")}</tbody></table><div class="dx-doc-sum"><div class="dx-doc-grand"><span>Balance due</span><b>${esc(app.money(sum(inv, (i) => dueOf(i, app))))}</b></div></div>`);
}

export default app;
