// AsaanDesk's own document templates (text and layout written for AsaanDesk; names and numbers are examples).
// Inline text uses Markdown marks (**bold**, *italic*, [link](url)).
import { mdInline, cleanRuns, normalizeDoc, newDoc } from "./model.js";

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
      p("Management / انتظامیہ", { align: "right" }),
      p("10 August 2026"),
    ]),
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || null;
