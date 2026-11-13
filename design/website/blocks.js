// Website builder: the site model, block definitions (with the fields shown in the Edit panel) and ONE pure
// renderer used for both the editor preview and the exported page, so what you see is what you export.
// No DOM here: Node tests import this file directly.
import { FONT_FAMILIES } from "../shared/brand.js";
import { art, iconSvg, ICON_NAMES, photoPos } from "./art.js";

/* ------------------------------------------------------------------ small helpers */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uidB = () => "b" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const clone = (v) => JSON.parse(JSON.stringify(v));
const isIndex = (k) => /^\d+$/.test(k);
export function getPath(obj, path) {
  if (!path) return obj;
  return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[isIndex(k) ? +k : k]), obj);
}
export function setPath(obj, path, value) {
  const keys = String(path).split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = isIndex(keys[i]) ? +keys[i] : keys[i];
    if (o[k] == null || typeof o[k] !== "object") o[k] = isIndex(keys[i + 1]) ? [] : {};
    o = o[k];
  }
  const last = keys[keys.length - 1];
  o[isIndex(last) ? +last : last] = value;
  return obj;
}
export const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "my-site";
export const waDigits = (s) => String(s || "").replace(/\D/g, "");
/** WhatsApp chat link (wa.me) with a prefilled message. Without a number WhatsApp asks who to send it to. */
export const waLink = (number, text = "") => `https://wa.me/${waDigits(number)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
/** Only safe link kinds: in-page anchors, web, email, phone, WhatsApp, relative files. Anything else becomes "#". */
export function safeHref(h) {
  const v = String(h ?? "").trim();
  if (!v) return "#";
  if (/^(#|mailto:|tel:|sms:|https?:\/\/)/i.test(v)) return v;
  if (/^page:[a-z0-9-]+(#[\w-]+)?$/i.test(v)) return v; // a page of this site (resolved by renderSite)
  if (/^(javascript|data|vbscript|file):/i.test(v)) return "#";
  if (/^www\./i.test(v)) return "https://" + v;
  if (/^\+?[\d\s-]{7,}$/.test(v)) return "tel:" + v.replace(/[\s-]/g, "");
  if (/^[\w.-]+\.(html?|pdf|jpe?g|png)$/i.test(v)) return v;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return "mailto:" + v;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(v)) return "https://" + v;
  return "#";
}
const isExternal = (h) => /^https?:\/\//i.test(h);

/* ------------------------------------------------------------------ colours */
const hex6 = (h) => { const s = String(h || "").trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(s)) return s; if (/^#[0-9a-f]{3}$/.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join(""); return null; };
const rgb = (h) => { const v = hex6(h) || "#000000"; return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); };
const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
export function luminance(h) {
  const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const onColor = (bg) => (contrast(bg, "#ffffff") >= contrast(bg, "#111318") ? "#ffffff" : "#111318");
const rgba = (h, a) => `rgba(${rgb(h).join(",")},${a})`;

/* ------------------------------------------------------------------ theme */
export const MODES = { light: { bg: "#ffffff", text: "#1b2133" }, dark: { bg: "#0f1222", text: "#e9ebf5" } };
export const DEFAULT_THEME = { primary: "#5b4cf0", accent: "#ff7a59", bg: "#ffffff", text: "#1b2133", headingFont: "sans", bodyFont: "sans", corners: "soft", mode: "light" };
export const CORNERS = { sharp: { r: "3px", rb: "3px", label: "Sharp" }, soft: { r: "14px", rb: "10px", label: "Soft" }, round: { r: "26px", rb: "999px", label: "Round" } };
/** CSS font stack for an exported site: the FONT_FAMILIES stack without the editor-only "AD …" web font. */
export const fontStack = (key) => (FONT_FAMILIES[key] || FONT_FAMILIES.sans).css.split(",").slice(1).join(",").trim();

export function themeVars(theme) {
  const t = { ...DEFAULT_THEME, ...theme };
  const dark = t.mode === "dark";
  const bg = hex6(t.bg) || MODES[t.mode]?.bg || "#ffffff", fg = hex6(t.text) || MODES[t.mode]?.text || "#1b2133";
  const p = hex6(t.primary) || DEFAULT_THEME.primary, a = hex6(t.accent) || DEFAULT_THEME.accent;
  const c = CORNERS[t.corners] || CORNERS.soft;
  const ft = dark ? mix(bg, "#000000", 0.35) : mix(fg, "#000000", 0.25);
  return {
    "--p": p, "--a": a, "--onp": onColor(p), "--ona": onColor(a), "--bg": bg, "--fg": fg, "--hd": dark ? mix(fg, "#ffffff", 0.5) : mix(fg, "#000000", 0.25),
    "--mu": mix(fg, bg, 0.32), "--sf": mix(bg, fg, dark ? 0.06 : 0.045), "--card": dark ? mix(bg, "#ffffff", 0.05) : mix(bg, "#ffffff", 0.7),
    "--ln": mix(bg, fg, 0.13), "--ln2": mix(bg, fg, 0.25), "--pt": mix(bg, p, dark ? 0.22 : 0.12), "--pl": dark ? mix(p, "#ffffff", 0.35) : p,
    "--hbg": rgba(bg, 0.9), "--ft": ft, "--ftfg": mix(onColor(ft), ft, 0.15), "--r": c.r, "--rb": c.rb,
    "--hf": fontStack(t.headingFont), "--bf": fontStack(t.bodyFont), "color-scheme": dark ? "dark" : "light",
  };
}

/* ------------------------------------------------------------------ block definitions */
// Field kinds for the Edit panel: text, area (multi-line), lines (one per line -> array), email, tel, link ({label, href}),
// image (data: URL), icon, select, bool, list (array of objects with `item` fields).
const L = (label, href) => ({ label, href });
export const BLOCK_TYPES = {
  header: {
    label: "Header & menu", desc: "Your name or logo, menu links and a button.", anchor: "",
    fields: [{ k: "brand", t: "text", label: "Name" }, { k: "logo", t: "image", label: "Logo (optional)", optional: true },
      { k: "links", t: "list", label: "Menu links", itemLabel: "Link", item: [{ k: "label", t: "text", label: "Text" }, { k: "href", t: "href", label: "Goes to" }], add: () => L("New link", "#contact") },
      { k: "cta", t: "link", label: "Button" },
      // Navigation menu (Canva parity): extra items after the pages, logo on/off + its link, menu text style.
      { k: "extra", t: "list", label: "Extra menu links (after the pages, on multi-page sites)", itemLabel: "Menu link", item: [{ k: "label", t: "text", label: "Text" }, { k: "href", t: "href", label: "Goes to" }], add: () => L("New link", "https://") },
      { k: "showLogo", t: "bool", label: "Show the logo and name in the menu" }, { k: "logoHref", t: "href", label: "Logo goes to (empty = home page)" },
      { k: "menuFont", t: "select", label: "Menu font", options: [["", "Same as the text"], ...Object.entries(FONT_FAMILIES).map(([k, f]) => [k, f.label.replace(/ \(.*\)$/, "")])] },
      { k: "menuSize", t: "select", label: "Menu text size", options: [["s", "Small"], ["m", "Medium"], ["l", "Large"]] },
      { k: "menuBold", t: "bool", label: "Bold menu text" }, { k: "menuItalic", t: "bool", label: "Italic menu text" },
      { k: "menuColor", t: "color", label: "Menu text colour" }],
    make: () => ({ brand: "My business", logo: "", links: [L("About", "#about"), L("Services", "#features"), L("Contact", "#contact")], cta: L("Contact us", "#contact"),
      extra: [], showLogo: true, logoHref: "", menuFont: "", menuSize: "m", menuBold: true, menuItalic: false, menuColor: "" }),
  },
  hero: {
    label: "Hero", desc: "Big headline at the top with buttons and a picture.", anchor: "home",
    fields: [{ k: "eyebrow", t: "text", label: "Small line above" }, { k: "title", t: "text", label: "Headline" }, { k: "text", t: "area", label: "Text" },
      { k: "primary", t: "link", label: "Main button" }, { k: "secondary", t: "link", label: "Second button" }, { k: "image", t: "image", label: "Picture", optional: true },
      { k: "layout", t: "select", label: "Layout", options: [["split", "Text and picture"], ["left", "Picture and text"], ["cover", "Picture behind the text"], ["card", "Text card on a picture"], ["banner", "Wide picture under the text"], ["minimal", "Big text only"], ["center", "Centred text only"]] }],
    make: () => ({ eyebrow: "Welcome", title: "A clear headline about what you do", text: "One or two short lines that tell visitors why you are the right choice.", primary: L("Get in touch", "#contact"), secondary: L("Learn more", "#about"), image: art("work"), layout: "split" }),
  },
  features: {
    label: "Features", desc: "Cards with an icon, a title and a short text.", anchor: "features",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "items", t: "list", label: "Cards", itemLabel: "Card", item: [{ k: "icon", t: "icon", label: "Icon" }, { k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }], add: () => ({ icon: "star", title: "New feature", text: "Say what makes this special." }) }],
    make: () => ({ title: "Why people choose us", intro: "", items: [{ icon: "shield", title: "Trusted", text: "Honest work and fair prices." }, { icon: "clock", title: "On time", text: "We keep our promises." }, { icon: "heart", title: "Friendly", text: "We listen and we care." }] }),
  },
  about: {
    label: "About", desc: "Your story with a picture.", anchor: "about",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }, { k: "image", t: "image", label: "Picture", optional: true }, { k: "button", t: "link", label: "Button" },
      { k: "side", t: "select", label: "Picture side", options: [["left", "Left"], ["right", "Right"], ["none", "No picture (text only)"]] }],
    make: () => ({ title: "About us", text: "Tell your story here: who you are, what you do and why you started.", image: art("shop"), button: L("", ""), side: "left" }),
  },
  gallery: {
    label: "Gallery", desc: "A grid of pictures with captions.", anchor: "gallery",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "images", t: "list", label: "Pictures", itemLabel: "Picture", item: [{ k: "src", t: "image", label: "Picture" }, { k: "caption", t: "text", label: "Caption" }], add: () => ({ src: art("abstract", "violet", Math.floor(Math.random() * 1000)), caption: "" }) }],
    make: () => ({ title: "Gallery", intro: "", images: [1, 2, 3, 4, 5, 6].map((i) => ({ src: art("abstract", "violet", i), caption: "" })) }),
  },
  pricing: {
    label: "Services & prices", desc: "Packages or services with prices and a button.", anchor: "pricing",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "plans", t: "list", label: "Packages", itemLabel: "Package", item: [{ k: "name", t: "text", label: "Name" }, { k: "price", t: "text", label: "Price" }, { k: "period", t: "text", label: "Per (e.g. /month)" },
        { k: "text", t: "area", label: "Short text" }, { k: "features", t: "lines", label: "What's included (one per line)" }, { k: "button", t: "link", label: "Button" }, { k: "featured", t: "bool", label: "Highlight this one" }],
      add: () => ({ name: "New package", price: "Rs 0", period: "", text: "", features: ["What is included"], button: L("Choose", "#contact"), featured: false }) }],
    make: () => ({ title: "Services and prices", intro: "Simple prices, no surprises.", plans: [
      { name: "Basic", price: "Rs 2,000", period: "", text: "For small jobs.", features: ["One visit", "Basic check"], button: L("Book", "#contact"), featured: false },
      { name: "Standard", price: "Rs 5,000", period: "", text: "Most popular.", features: ["Two visits", "Full check", "Free advice"], button: L("Book", "#contact"), featured: true },
      { name: "Premium", price: "Rs 9,000", period: "", text: "Everything included.", features: ["Unlimited visits", "Priority help"], button: L("Book", "#contact"), featured: false }] }),
  },
  products: {
    label: "Shop catalogue", desc: "Products with prices and an \"Order on WhatsApp\" button.", anchor: "shop",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" }, { k: "whatsapp", t: "tel", label: "WhatsApp number for orders" }, { k: "orderLabel", t: "text", label: "Order button text" },
      { k: "items", t: "list", label: "Products", itemLabel: "Product", item: [{ k: "image", t: "image", label: "Picture" }, { k: "name", t: "text", label: "Name" }, { k: "price", t: "text", label: "Price" }, { k: "text", t: "area", label: "Short text" }],
        add: () => ({ image: art("abstract", "forest", Math.floor(Math.random() * 1000)), name: "New product", price: "Rs 1,000", text: "" }) }],
    make: () => ({ title: "Shop", intro: "Order in one tap on WhatsApp.", whatsapp: "923000000000", orderLabel: "Order on WhatsApp", items: [
      { image: art("abstract", "forest", 3), name: "Product one", price: "Rs 1,500", text: "A short line about it." },
      { image: art("abstract", "forest", 4), name: "Product two", price: "Rs 2,200", text: "A short line about it." },
      { image: art("abstract", "forest", 5), name: "Product three", price: "Rs 900", text: "A short line about it." }] }),
  },
  testimonials: {
    label: "Testimonials", desc: "What your customers say.", anchor: "reviews",
    fields: [{ k: "title", t: "text", label: "Title" },
      { k: "items", t: "list", label: "Reviews", itemLabel: "Review", item: [{ k: "quote", t: "area", label: "Quote" }, { k: "name", t: "text", label: "Name" }, { k: "role", t: "text", label: "Role or city" }, { k: "photo", t: "image", label: "Photo (optional)", optional: true }], add: () => ({ quote: "Great service!", name: "Customer name", role: "City" }) }],
    make: () => ({ title: "What our customers say", items: [{ quote: "Quick, friendly and honest. Highly recommended.", name: "Hina A.", role: "Lahore" }, { quote: "They explained everything and the price was fair.", name: "Bilal K.", role: "Karachi" }] }),
  },
  faq: {
    label: "FAQ", desc: "Questions and answers that open on tap.", anchor: "faq",
    fields: [{ k: "title", t: "text", label: "Title" },
      { k: "items", t: "list", label: "Questions", itemLabel: "Question", item: [{ k: "q", t: "text", label: "Question" }, { k: "a", t: "area", label: "Answer" }], add: () => ({ q: "A new question?", a: "The answer." }) }],
    make: () => ({ title: "Questions and answers", items: [{ q: "How do I order?", a: "Send us a message on WhatsApp or use the form below." }, { q: "Where are you?", a: "See the map section for our address." }] }),
  },
  team: {
    label: "Team", desc: "People with a photo, name and role.", anchor: "team",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "intro", t: "area", label: "Intro" },
      { k: "members", t: "list", label: "People", itemLabel: "Person", item: [{ k: "photo", t: "image", label: "Photo" }, { k: "name", t: "text", label: "Name" }, { k: "role", t: "text", label: "Role" }], add: () => ({ photo: art("portrait", "violet", Math.floor(Math.random() * 8)), name: "Name", role: "Role" }) }],
    make: () => ({ title: "Meet the team", intro: "", members: [0, 1, 2].map((i) => ({ photo: art("portrait", "violet", i), name: ["Ali", "Sara", "Usman"][i], role: ["Founder", "Manager", "Expert"][i] })) }),
  },
  timeline: {
    label: "Timeline", desc: "Schedule, experience or steps in order.", anchor: "timeline",
    fields: [{ k: "title", t: "text", label: "Title" },
      { k: "items", t: "list", label: "Steps", itemLabel: "Step", item: [{ k: "when", t: "text", label: "When" }, { k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }], add: () => ({ when: "Time", title: "New step", text: "" }) }],
    make: () => ({ title: "How it works", items: [{ when: "Step 1", title: "Tell us what you need", text: "" }, { when: "Step 2", title: "We visit and fix it", text: "" }, { when: "Step 3", title: "Pay when you are happy", text: "" }] }),
  },
  contact: {
    label: "Contact", desc: "Contact details, a WhatsApp button and an email form.", anchor: "contact",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "text", t: "area", label: "Text" }, { k: "email", t: "email", label: "Email (the form sends here)" }, { k: "phone", t: "tel", label: "Phone" },
      { k: "whatsapp", t: "tel", label: "WhatsApp number" }, { k: "waText", t: "text", label: "WhatsApp first message" }, { k: "waLabel", t: "text", label: "WhatsApp button text" }, { k: "address", t: "area", label: "Address" },
      { k: "formTitle", t: "text", label: "Form title" }, { k: "send", t: "text", label: "Send button text" }],
    make: () => ({ title: "Get in touch", text: "Message us on WhatsApp or send an email. We reply the same day.", email: "hello@example.com", phone: "+92 300 0000000", whatsapp: "923000000000", waText: "Hello! I have a question.", waLabel: "Chat on WhatsApp", address: "Main Boulevard, Lahore", formTitle: "Send us a message", send: "Send message" }),
  },
  map: {
    label: "Map link", desc: "Your address with an \"Open in Maps\" button.", anchor: "location",
    fields: [{ k: "title", t: "text", label: "Title" }, { k: "address", t: "area", label: "Address" }, { k: "note", t: "area", label: "Opening hours or note" }, { k: "query", t: "text", label: "Map search (place or address)" },
      { k: "label", t: "text", label: "Button text" }, { k: "image", t: "image", label: "Picture", optional: true }],
    make: () => ({ title: "Find us", address: "Main Boulevard, Lahore", note: "Open every day, 10am to 9pm.", query: "Main Boulevard Lahore", label: "Open in Maps", image: art("map") }),
  },
  footer: {
    label: "Footer", desc: "Bottom line with links and copyright.", anchor: "",
    fields: [{ k: "text", t: "area", label: "Text" }, { k: "links", t: "list", label: "Links", itemLabel: "Link", item: [{ k: "label", t: "text", label: "Text" }, { k: "href", t: "href", label: "Goes to" }], add: () => L("New link", "#top") },
      { k: "copy", t: "text", label: "Copyright line" }],
    make: () => ({ text: "Thanks for visiting.", links: [L("Home", "#top"), L("Contact", "#contact")], copy: "© 2026 My business" }),
  },
};
BLOCK_TYPES.embed = {
  label: "Embed code", desc: "A widget from the Code generator, or your own HTML, in its own safe frame.", anchor: "widget",
  fields: [{ k: "title", t: "text", label: "Title (optional)" }, { k: "code", t: "area", label: "HTML code (runs in its own safe frame)" },
    { k: "height", t: "select", label: "Height", options: [["320", "Small (320 px)"], ["480", "Medium (480 px)"], ["640", "Large (640 px)"], ["840", "Extra large (840 px)"]] }],
  make: () => ({ title: "", code: '<p style="font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px">Paste HTML here, or use "Add to a website" in the Code generator.</p>', height: "480" }),
};
BLOCK_TYPES.video = {
  label: "Video", desc: "A YouTube or Vimeo video, or a link to an .mp4 file, that plays on the page.", anchor: "video",
  fields: [{ k: "title", t: "text", label: "Title (optional)" }, { k: "intro", t: "area", label: "Intro (optional)" },
    { k: "url", t: "text", label: "Video link (YouTube, Vimeo or .mp4 / .webm)" },
    { k: "ratio", t: "select", label: "Shape", options: [["16:9", "Wide 16:9"], ["9:16", "Tall 9:16 (Shorts / Reels)"], ["4:3", "Classic 4:3"], ["1:1", "Square 1:1"]] }],
  make: () => ({ title: "Watch the video", intro: "", url: "", ratio: "16:9" }),
};
export const BLOCK_ORDER = ["header", "hero", "features", "about", "gallery", "video", "pricing", "products", "testimonials", "faq", "team", "timeline", "contact", "map", "embed", "footer"];
/** Canva websites allow up to 20 sections on a page (header and footer count too). */
export const MAX_SECTIONS = 20;
export const canAddBlock = (site) => (site?.blocks?.length || 0) < MAX_SECTIONS;
/**
 * A video link -> what the page plays: { kind: "youtube" | "vimeo" | "file", src } (privacy-friendly YouTube host),
 * or null when the link is not a video this block can show.
 */
export function videoEmbed(url) {
  const u = String(url || "").trim();
  let m = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/i.exec(u);
  if (m) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${m[1]}` };
  m = /^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,12})/i.exec(u);
  if (m) return { kind: "vimeo", src: `https://player.vimeo.com/video/${m[1]}` };
  if (/^https:\/\/[^\s"'<>]+\.(mp4|webm|ogv|mov)(\?[^\s"'<>]*)?$/i.test(u)) return { kind: "file", src: u };
  return null;
}
/** Entrance animations for a block (Animate): CSS class suffixes; "" = none. */
export const ANIMS = [["", "None"], ["fade", "Fade"], ["rise", "Rise"], ["pan", "Pan"], ["pop", "Pop"], ["zoom", "Zoom out"]];
/** Embed block height (px) for a widget of a given height. */
export const embedHeight = (h) => String([320, 480, 640, 840].find((x) => x >= (+h || 0) + 24) || 840);
export const BG_CHOICES = [["", "Page colour"], ["alt", "Soft grey"], ["tint", "Light main colour"], ["primary", "Main colour"], ["dark", "Dark"]];
/**
 * A block's own text style (text added from the Text panel, font combinations): style.hf / style.bf heading and body
 * font keys (FONT_FAMILIES), style.fg text colour, style.align, style.upper (capital headings), style.ls heading letter
 * spacing (em). Empty = the site's theme. -> { css (inline on the section), cls (extra classes) }.
 */
export const TEXT_ALIGNS = [["", "Site default"], ["left", "Left"], ["center", "Centre"], ["right", "Right"]];
export function textStyle(st = {}) {
  let css = "", cls = "";
  if (FONT_FAMILIES[st.hf]) css += `--hf:${fontStack(st.hf)};`;
  if (FONT_FAMILIES[st.bf]) css += `--bf:${fontStack(st.bf)};font-family:${fontStack(st.bf)};`;
  const fg = hex6(st.fg);
  if (fg) css += `color:${fg};--hd:${fg};--mu:${fg};`;
  if (["left", "center", "right"].includes(st.align)) css += `text-align:${st.align};`;
  const ls = Number(st.ls);
  if (st.upper || (ls && Math.abs(ls) <= 1)) {
    cls += " tx";
    if (st.upper) css += "--htt:uppercase;";
    if (ls && Math.abs(ls) <= 1) css += `--hls:${Math.round(ls * 1000) / 1000}em;`;
  }
  return { css, cls };
}

export function newBlock(type, data = {}, style = {}) {
  const def = BLOCK_TYPES[type];
  if (!def) throw new Error("Unknown block type " + type);
  return { id: uidB(), type, data: { ...def.make(), ...clone(data) }, style: { bg: "", bgImage: "", ...style } };
}
function normBlocks(list) {
  const ids = new Set();
  return (Array.isArray(list) ? list : []).filter((b) => b && BLOCK_TYPES[b.type]).map((b) => {
    let id = typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : uidB();
    if (ids.has(id)) id = uidB();
    ids.add(id);
    return { id, type: b.type, anchor: typeof b.anchor === "string" ? b.anchor : undefined, data: { ...BLOCK_TYPES[b.type].make(), ...(b.data || {}) }, style: { bg: "", bgImage: "", ...(b.style || {}) } };
  });
}
/* ------------------------------------------------------------------ site settings (publish) */
export const SETTINGS_DEFAULTS = { favicon: "", ogImage: "", ogTitle: "", ogDesc: "", indexable: true, passHash: "", gaId: "", cookie: false, cookieText: "", cookiePos: "bottom", cookieTheme: "dark", cookieButton: true, domain: "", subpath: "", navPages: true, mobileResize: true };
/** "https://www.Example.com/" -> "www.example.com"; anything that is not a plain host name -> "". */
export function cleanDomain(v) {
  const m = /^(?:https?:\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/?$/i.exec(String(v || "").trim());
  return m ? m[1].toLowerCase() : "";
}
/** Site subpath (the folder after the domain): "/Shop/Summer 2026/" -> "shop/summer-2026"; nothing usable -> "". */
export function cleanSubpath(v) {
  const parts = String(v || "").split("/").map((p) => String(p).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).filter(Boolean);
  return parts.slice(0, 4).join("/").slice(0, 80);
}
/** The site's web address with a trailing slash ("https://example.com/shop/"), or "" without a domain. */
export const siteBase = (S) => (S?.domain ? `https://${S.domain}/${S.subpath ? S.subpath + "/" : ""}` : "");
export const validGaId = (v) => /^G-[A-Z0-9]{4,12}$/.test(String(v || "").trim().toUpperCase());
export function normSettings(x) {
  const o = x && typeof x === "object" ? x : {};
  const img = (v) => (typeof v === "string" && /^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/.test(v) ? v : "");
  const domain = cleanDomain(o.domain);
  return { favicon: img(o.favicon), ogImage: img(o.ogImage), ogTitle: String(o.ogTitle || "").slice(0, 120), ogDesc: String(o.ogDesc || "").slice(0, 300),
    indexable: o.indexable !== false, passHash: /^[0-9a-f]{64}$/.test(o.passHash || "") ? o.passHash : "",
    gaId: validGaId(o.gaId) ? String(o.gaId).trim().toUpperCase() : "", cookie: !!o.cookie, cookieText: String(o.cookieText || "").slice(0, 300),
    cookiePos: o.cookiePos === "top" ? "top" : "bottom", cookieTheme: o.cookieTheme === "light" ? "light" : "dark", cookieButton: o.cookieButton !== false,
    domain, subpath: domain ? cleanSubpath(o.subpath) : "", navPages: o.navPages !== false, mobileResize: o.mobileResize !== false };
}
/* ------------------------------------------------------------------ pages (multi-page sites) */
// A one-page site has only `blocks`. A multi-page site also has `pages` (page 0 = home, file index.html) and `page`
// (the page open in the editor); `blocks` is then the SAME array as pages[page].blocks, so all block code just works.
export const uidP = () => "p" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
export const MAX_PAGES = 45;
export function pageFile(site, i) { const p = site?.pages?.[i]; return !p || i === 0 ? "index.html" : `${p.slug}.html`; }
/** All pages, also for a one-page site (one "Home" page). */
export function pageList(site) { return site?.pages?.length ? site.pages : [{ id: "home", name: "Home", slug: "index", description: "", blocks: site?.blocks || [] }]; }
function uniqueSlug(site, name, skip = -1) {
  const used = new Set(["index", ...(site.pages || []).filter((_, i) => i !== skip).map((p) => p.slug)]);
  let base = slugify(name), s = base, k = 2;
  if (base === "my-site" || base === "index") base = s = "page";
  while (used.has(s)) s = `${base}-${k++}`;
  return s;
}
function ensurePages(site) {
  if (!site.pages?.length) { site.pages = [{ id: uidP(), name: "Home", slug: "index", description: "", blocks: site.blocks }]; site.page = 0; }
  return site.pages;
}
/** Opens page i in the editor (site.blocks becomes that page's blocks). */
export function switchPage(site, i) {
  if (!site.pages?.length) return false;
  i = Math.max(0, Math.min(site.pages.length - 1, i | 0));
  site.page = i; site.blocks = site.pages[i].blocks;
  return true;
}
/** New page with the home page's menu bar and footer, a page heading and (optionally) given blocks. Returns its index. */
export function addPage(site, name = "", blocks = null, at = null) {
  const pages = ensurePages(site);
  if (pages.length >= MAX_PAGES) throw new Error(`A site can have up to ${MAX_PAGES} pages.`);
  const title = String(name || `Page ${pages.length + 1}`).trim().slice(0, 60) || `Page ${pages.length + 1}`;
  const home = pages[0].blocks;
  const head = home.find((b) => b.type === "header"), foot = home.find((b) => b.type === "footer");
  const copy = (b) => b && { ...clone(b), id: uidB(), anchor: undefined };
  const body = Array.isArray(blocks) ? blocks : [newBlock("hero", { eyebrow: "", title, text: "Click any text to change it. Add sections from Elements.", image: "", layout: "minimal", primary: L("", ""), secondary: L("", "") })];
  const page = { id: uidP(), name: title, slug: uniqueSlug(site, title), description: "", blocks: [copy(head), ...body, copy(foot)].filter(Boolean) };
  const idx = at == null ? pages.length : Math.max(1, Math.min(pages.length, at));
  pages.splice(idx, 0, page);
  switchPage(site, idx);
  return idx;
}
export function renamePage(site, i, name) {
  const p = site.pages?.[i]; if (!p) return false;
  p.name = String(name || "").trim().slice(0, 60) || p.name;
  if (i > 0 && !p.customSlug) p.slug = uniqueSlug(site, p.name, i);
  return true;
}
/**
 * Custom URL path of a page ("About us!" -> "about-us"; kept unique; the home page has none). An empty path goes back to
 * the one made from the page name. Returns the slug, or "" when the page cannot have one.
 */
export function setPageSlug(site, i, path) {
  const p = site.pages?.[i]; if (!p || i === 0) return "";
  const raw = String(path || "").trim().replace(/\.html?$/i, "");
  p.customSlug = !!slugify(raw) && slugify(raw) !== "my-site";
  p.slug = uniqueSlug(site, p.customSlug ? raw : p.name, i);
  return p.slug;
}
/** Page settings: menu label (name), page title (browser tab / search), description, hidden from the menu. */
export function setPageMeta(site, i, { name, title, description, hide } = {}) {
  if (!site.pages?.length) ensurePages(site);
  const p = site.pages[i]; if (!p) return false;
  if (name != null) renamePage(site, i, name);
  if (title != null) p.title = String(title).replace(/\s+/g, " ").trim().slice(0, 120);
  if (description != null) p.description = String(description).slice(0, 300);
  if (hide != null) p.hide = i > 0 && !!hide; // the home page always stays in the menu
  return true;
}
export function removePage(site, i) {
  if (!site.pages || site.pages.length < 2 || i <= 0 || i >= site.pages.length) return false; // the home page stays
  const cur = site.page || 0;
  site.pages.splice(i, 1);
  switchPage(site, cur === i ? i - 1 : cur > i ? cur - 1 : cur);
  return true;
}
export function movePage(site, from, to) {
  const P = site.pages; if (!P || from <= 0 || to <= 0 || from >= P.length || to >= P.length || from === to) return false; // home stays first
  const cur = P[site.page || 0];
  P.splice(to, 0, P.splice(from, 1)[0]);
  site.page = P.indexOf(cur);
  return true;
}
export function duplicatePage(site, i) {
  const p = site.pages?.[i]; if (!p) return -1;
  const copy = clone(p.blocks).map((b) => ({ ...b, id: uidB() }));
  const idx = addPage(site, `${p.name} copy`, [], i + 1);
  site.pages[idx].blocks.splice(0, site.pages[idx].blocks.length, ...copy);
  site.pages[idx].description = p.description;
  switchPage(site, idx);
  return idx;
}

/** Makes any stored or imported JSON a valid site (unknown blocks dropped, missing fields filled in). */
export function normalizeSite(json) {
  const s = json && typeof json === "object" ? json : {};
  const out = { version: 1, name: String(s.name || "My website").slice(0, 120), description: String(s.description ?? "").slice(0, 300), lang: /^[a-z]{2}(-[A-Za-z]{2})?$/.test(s.lang || "") ? s.lang : "en", template: s.template || "", theme: { ...DEFAULT_THEME, ...(s.theme || {}) }, blocks: [] };
  if (Array.isArray(s.pages) && s.pages.length) {
    const cur = Math.max(0, Math.min(s.pages.length - 1, Math.min(MAX_PAGES - 1, s.page | 0)));
    const slugs = new Set(["index"]);
    out.pages = s.pages.slice(0, MAX_PAGES).map((p, i) => {
      const name = String(p?.name || (i ? `Page ${i + 1}` : "Home")).trim().slice(0, 60) || `Page ${i + 1}`;
      let slug = "index";
      if (i > 0) { const base = /^[a-z0-9-]{1,48}$/.test(p?.slug || "") && p.slug !== "index" ? p.slug : slugify(name) === "my-site" ? "page" : slugify(name); slug = base; let k = 2; while (slugs.has(slug)) slug = `${base}-${k++}`; slugs.add(slug); }
      // The open page's blocks live in `blocks` too; that copy wins (it is what the editor changed).
      const src = i === cur && Array.isArray(s.blocks) ? s.blocks : p?.blocks;
      const page = { id: typeof p?.id === "string" && /^[\w-]{1,40}$/.test(p.id) ? p.id : uidP(), name, slug, description: String(p?.description ?? "").slice(0, 300), blocks: normBlocks(src) };
      if (p?.title) page.title = String(p.title).replace(/\s+/g, " ").trim().slice(0, 120);
      if (i > 0 && p?.hide) page.hide = true;
      if (i > 0 && p?.customSlug) page.customSlug = true;
      return page;
    });
    out.page = cur;
    out.blocks = out.pages[cur].blocks;
  } else out.blocks = normBlocks(s.blocks);
  if (s.settings && typeof s.settings === "object") out.settings = normSettings(s.settings);
  return out;
}
/* site edits (pure, in place) */
export function moveBlock(site, from, to) {
  const n = site.blocks.length;
  if (from < 0 || from >= n) return false;
  to = Math.max(0, Math.min(n - 1, to));
  if (from === to) return false;
  const [b] = site.blocks.splice(from, 1);
  site.blocks.splice(to, 0, b);
  return true;
}
export function insertBlock(site, block, index = site.blocks.length) { site.blocks.splice(Math.max(0, Math.min(site.blocks.length, index)), 0, block); return block; }
export function removeBlock(site, id) { const i = site.blocks.findIndex((b) => b.id === id); if (i >= 0) site.blocks.splice(i, 1); return i; }
export function duplicateBlock(site, id) {
  const i = site.blocks.findIndex((b) => b.id === id);
  if (i < 0) return null;
  const copy = { ...clone(site.blocks[i]), id: uidB() };
  delete copy.anchor;
  site.blocks.splice(i + 1, 0, copy);
  return copy;
}
/** Where a new block goes: after the selected one, else before the footer, else at the end. */
export function insertIndex(site, selectedId) {
  const i = site.blocks.findIndex((b) => b.id === selectedId);
  if (i >= 0) return site.blocks[i].type === "footer" ? i : i + 1;
  const f = site.blocks.findIndex((b) => b.type === "footer");
  return f >= 0 ? f : site.blocks.length;
}
/** Section ids (anchors) for each block, unique on the page. */
export function anchors(site) {
  const used = new Set(["top", "main"]), out = {};
  for (const b of site.blocks) {
    let base = slugify(b.anchor || BLOCK_TYPES[b.type]?.anchor || "");
    if (!BLOCK_TYPES[b.type]?.anchor && !b.anchor) continue;
    if (!base || base === "my-site") base = b.type;
    let a = base, k = 2;
    while (used.has(a)) a = `${base}-${k++}`;
    used.add(a);
    out[b.id] = a;
  }
  return out;
}
export const blockTitle = (b) => {
  const d = b.data || {};
  const t = String(d.title || d.brand || d.text || "").replace(/\s+/g, " ").trim();
  return t.length > 34 ? t.slice(0, 33) + "…" : t;
};

/* ------------------------------------------------------------------ renderer */
const SCRIPT = `(function(){var d=document;function shut(m){m.setAttribute("aria-expanded","false");var n=d.getElementById(m.getAttribute("aria-controls"));if(n)n.classList.remove("open")}d.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;var b=t.closest(".menu-btn");if(b){var n=d.getElementById(b.getAttribute("aria-controls")),o=b.getAttribute("aria-expanded")!=="true";b.setAttribute("aria-expanded",String(o));if(n)n.classList.toggle("open",o);return}if(t.closest(".nav a")){var m=d.querySelector('.menu-btn[aria-expanded="true"]');if(m)shut(m)}});d.addEventListener("keydown",function(e){if(e.key==="Escape"){var m=d.querySelector('.menu-btn[aria-expanded="true"]');if(m){shut(m);m.focus()}}});d.addEventListener("toggle",function(e){var t=e.target;if(d.documentElement.hasAttribute("data-editing")||!t||t.tagName!=="DETAILS"||!t.open)return;var f=t.closest(".faq");if(f)f.querySelectorAll("details[open]").forEach(function(o){if(o!==t)o.open=false})},true)})();`;
export const SITE_SCRIPT = SCRIPT;
const ANIM_SCRIPT = `(function(){var a=[].slice.call(document.querySelectorAll(".anim"));function all(){a.forEach(function(x){x.classList.add("in")})}if(!("IntersectionObserver" in window)||(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches))return all();var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");o.unobserve(e.target)}})},{threshold:0.12,rootMargin:"0px 0px -6% 0px"});a.forEach(function(x){o.observe(x)})})();`;

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;scroll-padding-top:80px}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 var(--bf)}
img{max-width:100%;height:auto;display:block}a{color:var(--pl)}
h1,h2,h3{font-family:var(--hf);line-height:1.15;margin:0 0 .45em;color:var(--hd);overflow-wrap:break-word}
h1{font-size:clamp(2.1rem,5.2vw,3.6rem);letter-spacing:-.025em}h2{font-size:clamp(1.65rem,3.4vw,2.4rem);letter-spacing:-.015em}h3{font-size:1.18rem}
.tx h1,.tx h2,.tx h3{text-transform:var(--htt,none);letter-spacing:var(--hls,-.015em)}
p{margin:0 0 1em}.wrap{width:min(1140px,100% - 40px);margin-inline:auto}
:focus-visible{outline:3px solid var(--a);outline-offset:3px}
.skip{position:absolute;left:-9999px;top:10px;z-index:20;background:var(--p);color:var(--onp);padding:10px 16px;border-radius:var(--rb)}.skip:focus{left:10px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.blk{padding:clamp(56px,8vw,104px) 0;position:relative}
.sec-head{max-width:720px;margin:0 auto 40px;text-align:center}.lead{font-size:1.14rem;color:var(--mu)}
.eyebrow{display:inline-block;font-weight:700;font-size:.9rem;letter-spacing:.02em;color:var(--pl);background:var(--pt);padding:6px 14px;border-radius:999px;margin-bottom:18px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 24px;border-radius:var(--rb);background:var(--p);color:var(--onp);font:700 1rem/1.2 var(--bf);text-decoration:none;border:2px solid var(--p);cursor:pointer;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.16)}.btn.ghost{background:transparent;color:var(--pl);border-color:currentColor}.btn-sm{padding:9px 18px;font-size:.95rem}
.btn.wa{background:#1d9b52;border-color:#1d9b52;color:#fff}.btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}.center{text-align:center}.center .actions{justify-content:center}.center .lead{margin-inline:auto;max-width:640px}
.card{background:var(--card);border:1px solid var(--ln);border-radius:var(--r);padding:26px}
.grid{display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}
.site-head{position:sticky;top:0;z-index:10;background:var(--hbg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--ln)}
.nav-wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px}
.logo{display:inline-flex;align-items:center;gap:10px;font:800 1.3rem/1.1 var(--hf);color:var(--hd);text-decoration:none}.logo img{height:42px;width:auto}
.nav{display:flex;align-items:center;gap:26px}.nav ul{display:flex;gap:22px;list-style:none;margin:0;padding:0}.nav ul a{color:var(--mc,var(--fg));text-decoration:none;font-weight:var(--mw,600)}.nav ul a:hover{color:var(--pl)}
.menu-btn{display:none;align-items:center;gap:8px;border:1px solid var(--ln2);background:transparent;color:var(--fg);font:700 .95rem/1 var(--bf);padding:10px 14px;border-radius:var(--rb);cursor:pointer}
.menu-btn .bars,.menu-btn .bars::before,.menu-btn .bars::after{display:block;width:18px;height:2px;background:currentColor;border-radius:2px;position:relative}.menu-btn .bars::before,.menu-btn .bars::after{content:"";position:absolute;left:0}.menu-btn .bars::before{top:-6px}.menu-btn .bars::after{top:6px}
@media (max-width:780px){.menu-btn{display:inline-flex}.nav{display:none;position:absolute;left:0;right:0;top:100%;flex-direction:column;align-items:stretch;gap:12px;padding:12px 20px 22px;background:var(--bg);border-bottom:1px solid var(--ln);box-shadow:0 18px 30px rgba(0,0,0,.12)}.nav.open{display:flex}.nav ul{flex-direction:column;gap:0}.nav ul a{display:block;padding:12px 4px;border-bottom:1px solid var(--ln)}}
.hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}.hero-media img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r);box-shadow:0 30px 60px rgba(0,0,0,.14)}
.blk-hero .lead{font-size:1.22rem}.blk-hero h1{font-size:clamp(2.4rem,6.2vw,4.6rem);line-height:1.04;letter-spacing:-.035em}.hero-card h1{font-size:clamp(2.1rem,4.6vw,3.5rem)}.hero-c{max-width:820px}.blk-hero.has-img{padding:clamp(96px,14vw,180px) 0}
.split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}.split.rev .split-media{order:2}.split-media img{width:100%;border-radius:var(--r);aspect-ratio:4/3;object-fit:cover}
.text-block p:last-child{margin-bottom:0}
.feat .ic{width:52px;height:52px;border-radius:calc(var(--r)*.8);display:grid;place-items:center;background:var(--pt);color:var(--pl);margin-bottom:16px}.ic svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.feat p{color:var(--mu);margin:0}
.gal{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))}.gal figure{margin:0}.gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--r)}.gal figcaption{font-size:.92rem;color:var(--mu);margin-top:8px}
.plan{display:flex;flex-direction:column;position:relative}.plan.featured{border:2px solid var(--p);box-shadow:0 24px 50px rgba(0,0,0,.12)}.plan .badge{position:absolute;top:-13px;left:24px;background:var(--a);color:var(--ona);font-size:.8rem;font-weight:800;padding:4px 12px;border-radius:999px}
.price{font:800 2.1rem/1.1 var(--hf);color:var(--hd);margin:4px 0 8px}.price small{font-size:.95rem;color:var(--mu);font-weight:600}.plan p{color:var(--mu)}
.plan ul{list-style:none;padding:0;margin:6px 0 24px;flex:1}.plan li{padding:7px 0 7px 28px;position:relative;border-top:1px solid var(--ln)}.plan li::before{content:"";position:absolute;left:5px;top:15px;width:11px;height:6px;border:solid var(--pl);border-width:0 0 2.5px 2.5px;transform:rotate(-45deg)}
.prod{display:flex;flex-direction:column;padding:16px}.prod img{width:100%;aspect-ratio:5/4;object-fit:cover;border-radius:calc(var(--r)*.8);margin-bottom:14px}.prod .price{font-size:1.35rem}.prod p{color:var(--mu);flex:1}.prod .btn{margin-top:6px}
.quote{margin:0;display:flex;flex-direction:column}.quote blockquote{margin:0 0 16px;font-size:1.08rem;flex:1}.quote blockquote::before{content:"\\201C";display:block;font:800 3rem/1 var(--hf);color:var(--pl);height:.6em}.quote figcaption{color:var(--mu)}.quote figcaption.has-av{display:flex;align-items:center;gap:12px}.quote .av{width:48px;height:48px;border-radius:50%;object-fit:cover;flex:none}.quote.big figcaption.has-av{justify-content:center;text-align:left}.quote strong{display:block;color:var(--hd)}
.faq{max-width:820px;margin-inline:auto}.faq details{border:1px solid var(--ln);border-radius:var(--r);background:var(--card);margin-bottom:12px}
.faq summary{cursor:pointer;padding:18px 22px;font-weight:700;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:14px;color:var(--hd)}.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-size:1.6rem;line-height:1;color:var(--pl);transition:transform .2s}.faq details[open] summary::after{transform:rotate(45deg)}.faq .ans{padding:0 22px 20px;color:var(--mu)}.faq .ans p{margin:0}
.member{text-align:center}.member img{width:150px;height:150px;border-radius:50%;object-fit:cover;margin:0 auto 16px;border:4px solid var(--pt)}.member p{color:var(--mu);margin:0}
.tl{list-style:none;margin:0 auto;padding:0;max-width:760px;border-left:3px solid var(--pt)}.tl li{position:relative;padding:0 0 30px 30px}.tl li:last-child{padding-bottom:0}.tl li::before{content:"";position:absolute;left:-11px;top:5px;width:19px;height:19px;border-radius:50%;background:var(--p);border:4px solid var(--bg)}
.when{display:block;font-weight:800;color:var(--pl);font-size:.92rem;margin-bottom:2px}.tl p{color:var(--mu);margin:0}
.contact{align-items:start}.contact-list{list-style:none;padding:0;margin:20px 0 24px;display:grid;gap:12px}.contact-list li{display:flex;gap:12px;align-items:flex-start}.contact-list .ic{width:40px;height:40px;flex:none;margin:0}.contact-list .ic svg{width:20px;height:20px}
.form{display:grid;gap:14px}.form h3{margin:0}.form label{display:grid;gap:6px;font-weight:600;font-size:.95rem}.form input,.form textarea{font:inherit;padding:12px 14px;border:1px solid var(--ln2);border-radius:var(--rb);background:var(--bg);color:var(--fg);width:100%}.form textarea{border-radius:min(var(--rb),16px);resize:vertical}.form .note{font-size:.88rem;color:var(--mu);margin:0}
.mapcard{display:grid;grid-template-columns:1.2fr 1fr;padding:0;overflow:hidden}.mapcard img{width:100%;height:100%;min-height:260px;object-fit:cover}.mapcard .body{padding:32px}.mapcard p{color:var(--mu)}
.site-foot{padding:44px 0;background:var(--ft);color:var(--ftfg)}.foot{display:flex;flex-wrap:wrap;gap:18px 32px;justify-content:space-between;align-items:center}.foot p{margin:0}.foot ul{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;margin:0;padding:0}.foot a{color:inherit}.foot .copy{opacity:.8;font-size:.92rem;flex-basis:100%}
.bg-alt{background:var(--sf)}.bg-tint{background:var(--pt)}
.bg-primary{background:var(--p);--fg:var(--onp);--hd:var(--onp);--mu:var(--onp);--mu:color-mix(in srgb,var(--onp) 82%,transparent);--card:color-mix(in srgb,var(--onp) 10%,transparent);--ln:color-mix(in srgb,var(--onp) 25%,transparent);--pl:var(--onp);--pt:color-mix(in srgb,var(--onp) 18%,transparent);color:var(--fg)}
.bg-primary .btn{background:var(--onp);color:var(--p);border-color:var(--onp)}.bg-primary .btn.ghost{background:transparent;color:var(--onp)}
.bg-dark{background:var(--ft)}
.on-dark,.bg-dark{--fg:#eef0f7;--hd:#ffffff;--mu:#c9cdda;--card:rgba(255,255,255,.07);--ln:rgba(255,255,255,.16);--ln2:rgba(255,255,255,.3);--pt:rgba(255,255,255,.14);--pl:#ffffff;color:var(--fg)}
.on-light{--fg:#1b2133;--hd:#11131c;--mu:#535b70;--card:#ffffff;--ln:rgba(0,0,0,.1);--ln2:rgba(0,0,0,.2);color:var(--fg)}
.has-img{background-size:cover;background-position:center}
.hero-grid.rev .hero-media{order:-1}
.hero-banner{margin-top:44px}.hero-banner img{width:100%;aspect-ratio:21/9;object-fit:cover;border-radius:var(--r);box-shadow:0 30px 60px rgba(0,0,0,.14)}
.hero-min{border-left:6px solid var(--a);padding:8px 0 8px clamp(18px,3vw,36px)}.hero-min h1,.hero-min h2{font-size:clamp(2.6rem,7.4vw,5.4rem);max-width:15ch;letter-spacing:-.035em}.hero-min .lead{max-width:620px}
.hero-cardbg{padding:clamp(80px,12vw,160px) 0}.hero-card{background:var(--bg);color:var(--fg);max-width:600px;padding:clamp(26px,4vw,48px);border-radius:var(--r);box-shadow:0 30px 70px rgba(0,0,0,.25)}
.feat-list{display:grid;gap:4px;max-width:860px;margin-inline:auto}.feat-row{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:start;padding:22px 0;border-bottom:1px solid var(--ln)}.feat-row .ic{margin:0}.feat-row p{color:var(--mu);margin:0}
.feat-num{list-style:none;margin:0;padding:0;display:grid;gap:26px;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))}.feat-num .num{display:block;font:800 3rem/1 var(--hf);color:var(--a);margin-bottom:10px}.feat-num p{color:var(--mu);margin:0}
.gal.mosaic{grid-template-columns:repeat(4,1fr)}.gal.mosaic figure:first-child{grid-column:span 2;grid-row:span 2}.gal.mosaic figure:first-child img{aspect-ratio:auto;height:100%}
.quotes-big{display:grid;gap:34px;max-width:860px;margin-inline:auto}.quote.big{text-align:center;align-items:center}.quote.big blockquote{font:600 clamp(1.3rem,2.6vw,1.9rem)/1.4 var(--hf);color:var(--hd)}
.embed-frame{display:block;width:100%;border:0;border-radius:var(--r);background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.nav ul a[aria-current="page"]{color:var(--pl);text-decoration:underline;text-underline-offset:6px}
.cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:30;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;max-width:760px;margin-inline:auto;padding:16px 20px;background:var(--card);color:var(--fg);border:1px solid var(--ln);border-radius:var(--r);box-shadow:0 18px 40px rgba(0,0,0,.2)}.cookie p{margin:0;flex:1 1 280px}.cookie[hidden]{display:none}
.locked>*:not(.lock){display:none!important}.lock{min-height:100vh;display:grid;place-items:center;padding:24px}.lock[hidden]{display:none}.lock form{max-width:380px;width:100%;display:grid;gap:12px}.lock input{font:inherit;padding:12px 14px;border:1px solid var(--ln2);border-radius:var(--rb)}.lock .note{font-size:.9rem;color:var(--mu);margin:0}.lock .err{color:#c0262d;margin:0}
@media (max-width:860px){.hero-grid,.split,.mapcard{grid-template-columns:1fr}.split.rev .split-media{order:0}.hero-grid{gap:36px}.hero-grid.rev .hero-media{order:0}.gal.mosaic{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){body{font-size:16px}.wrap{width:calc(100% - 32px)}.card{padding:20px}.actions .btn{flex:1 1 auto}}
.vid-box{max-width:960px;margin:0 auto}.vid-box.tall{max-width:380px}.vid{display:block;width:100%;height:auto;border:0;border-radius:var(--r);background:#000;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.vid-ph{display:grid;place-items:center;width:100%;border-radius:var(--r);background:repeating-linear-gradient(135deg,var(--sf),var(--sf) 14px,var(--card) 14px,var(--card) 28px);border:2px dashed var(--ln2);color:var(--mu);font-weight:600;text-align:center;padding:16px}
.cookie[data-pos=top]{top:16px;bottom:auto}.cookie[data-tone=dark]{background:#15171f;color:#f2f3f7;border-color:#15171f}.cookie[data-tone=dark] .btn.ghost{color:#f2f3f7;border-color:rgba(255,255,255,.55)}.cookie[data-tone=light]{background:#ffffff;color:#15171f;border-color:#dcdfe8}.cookie[data-tone=light] .btn.ghost{color:#15171f;border-color:#9aa0b0}
.cookie-set{position:fixed;left:14px;bottom:14px;z-index:29;font:600 .8rem/1 var(--bf);padding:9px 13px;border-radius:999px;border:1px solid var(--ln2);background:var(--card);color:var(--fg);cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.15)}.cookie-set[hidden]{display:none}
.js body{overflow-x:clip}.js .anim{opacity:0;transition:opacity .8s ease,transform .8s cubic-bezier(.2,.7,.2,1)}.js .anim-rise{transform:translateY(36px)}.js .anim-pan{transform:translateX(-48px)}.js .anim-pop{transform:scale(.92)}.js .anim-zoom{transform:scale(1.06)}.js .anim.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}.js .anim{opacity:1;transform:none}}`;

const EDIT_CSS = `[data-edit]{outline:1.5px dashed transparent;outline-offset:3px;border-radius:4px;cursor:text;min-width:1ch;transition:outline-color .15s}
[data-edit]:hover{outline-color:rgba(91,76,240,.6)}[data-edit]:focus{outline:2px solid #5b4cf0;outline-offset:3px}
[data-edit]:empty::before{content:attr(data-ph);opacity:.45}
[data-img]{cursor:pointer;transition:outline-color .15s;outline:3px solid transparent;outline-offset:-3px}[data-img]:hover{outline-color:rgba(91,76,240,.75)}
[data-link]{cursor:pointer}[data-link]:hover{outline:2px dashed rgba(91,76,240,.8);outline-offset:3px}
[data-block]{transition:box-shadow .15s}[data-block]:hover{box-shadow:inset 0 0 0 1px rgba(91,76,240,.35)}[data-block].ed-sel{box-shadow:inset 0 0 0 3px #5b4cf0}
.ed-empty{display:grid;place-items:center;min-height:160px;border:2px dashed var(--ln2);border-radius:var(--r);color:var(--mu);font-weight:600;cursor:pointer}`;

/** The site CSS (theme variables + layout). */
export function siteCss(theme) {
  const vars = Object.entries(themeVars(theme)).map(([k, v]) => `${k}:${v}`).join(";");
  return `:root{${vars}}\n${BASE_CSS}`;
}

function faviconSvg(site) {
  const t = { ...DEFAULT_THEME, ...site.theme };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${hex6(t.primary) || "#5b4cf0"}"/><circle cx="32" cy="32" r="14" fill="none" stroke="${onColor(hex6(t.primary) || "#5b4cf0")}" stroke-width="6"/></svg>`;
}

/**
 * The whole page as an HTML string.
 * mode: 'export' (clean HTML) or 'edit' (adds data-edit / data-link / data-img hooks for the editor).
 * imageMode: 'inline' (data: URLs) or 'files' (images/… paths; `assets` Map(dataUrl -> path) is filled for the zip).
 */
export function renderSite(input, { mode = "export", imageMode = "inline", assets = null, page = null, preview = false } = {}) {
  const site = normalizeSite(page != null && input?.pages?.length ? { ...input, page, blocks: undefined } : input);
  const edit = mode === "edit";
  const live = !edit && !preview; // analytics, cookie banner and page lock only in real exports
  const files = imageMode === "files";
  const assetMap = assets || new Map();
  const extOf = (url) => ({ "image/svg+xml": "svg", "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[(/^data:([^;,]+)/.exec(url) || [])[1]] || "bin");
  const asset = (url, name) => {
    if (!url || !files || !/^data:/.test(url)) return url;
    if (!assetMap.has(url)) assetMap.set(url, name ? `images/${name}.${extOf(url)}` : `images/image-${assetMap.size + 1}.${extOf(url)}`);
    return assetMap.get(url);
  };
  const ids = anchors(site);
  const pages = site.pages || null, cur = site.page || 0, S = site.settings || normSettings(null);
  const pageAnchors = pages ? pages.map((p, j) => new Set(Object.values(j === cur ? ids : anchors({ blocks: p.blocks })))) : null;
  const fileOf = (j) => pageFile(site, j);
  // Links: "page:<slug>[#section]" goes to that page; "#section" that lives on another page goes to that page's file.
  const link = (h) => {
    const v = safeHref(h);
    const pm = /^page:([a-z0-9-]+)(#[\w-]+)?$/i.exec(v);
    if (pm) {
      const slug = pm[1].toLowerCase(), home = slug === "index" || slug === "home";
      const j = pages ? pages.findIndex((p, k) => (k === 0 ? home : p.slug === slug)) : home ? 0 : -1;
      if (j < 0) return "#";
      if (edit) return pm[2] || "#";
      return j === cur ? pm[2] || "#top" : fileOf(j) + (pm[2] || "");
    }
    if (pages && !edit && /^#[\w-]+$/.test(v) && v !== "#top" && v !== "#main" && !pageAnchors[cur].has(v.slice(1))) {
      const j = pageAnchors.findIndex((set) => set.has(v.slice(1)));
      if (j >= 0) return fileOf(j) + v;
    }
    return v;
  };
  const navPages = !!(pages && pages.length > 1 && S.navPages !== false);
  let usesAnim = false;
  const hasTitle = (b) => !!String(b.data.title || "").trim();
  const h1Id = (site.blocks.find((b) => b.type === "hero" && hasTitle(b)) || site.blocks.find((b) => !["header", "footer"].includes(b.type) && hasTitle(b)))?.id || null;

  const renderBlock = (b) => {
    const d = b.data, isH1 = b.id === h1Id;
    const T = (tag, path, { cls = "", multi = false, ph = "", attrs = "" } = {}) => {
      const v = String(getPath(d, path) ?? "");
      if (!edit && !v.trim()) return "";
      const inner = multi ? esc(v.trim()).replace(/\r?\n/g, "<br>") : esc(v.trim());
      const ea = edit ? ` data-edit="${esc(path)}" contenteditable="plaintext-only" spellcheck="true" data-ph="${esc(ph || "Type here")}"${multi ? ' data-multi="1"' : ""}` : "";
      return `<${tag}${cls ? ` class="${cls}"` : ""}${attrs}${ea}>${inner}</${tag}>`;
    };
    const A = (path, cls = "btn", { li = false } = {}) => {
      const l = getPath(d, path);
      if (!l || (!String(l.label || "").trim() && !edit)) return "";
      const href = link(l.href);
      const out = `<a${cls ? ` class="${cls}"` : ""} href="${esc(href)}"${isExternal(href) ? ' target="_blank" rel="noopener"' : ""}${edit ? ` data-link="${esc(path)}"` : ""}>${esc(String(l.label || "").trim() || (edit ? "Add button text" : ""))}</a>`;
      return li ? `<li>${out}</li>` : out;
    };
    const I = (path, alt, { cls = "", eager = false, ph = "Add a picture" } = {}) => {
      const src = getPath(d, path);
      if (!src) return edit ? `<div class="ed-empty" data-img="${esc(path)}" role="button" tabindex="0">${esc(ph)}</div>` : "";
      // library people photos keep the face in view in every crop (circles, 4:3, 21:9…)
      const pos = photoPos(src);
      return `<img src="${esc(asset(src))}" alt="${esc(String(alt || "").trim())}"${cls ? ` class="${cls}"` : ""}${pos ? ` style="object-position:${pos}"` : ""}${eager ? "" : ' loading="lazy"'} decoding="async"${edit ? ` data-img="${esc(path)}"` : ""}>`;
    };
    const items = (k) => (Array.isArray(d[k]) ? d[k] : []);
    const head = (center = true, introKey = "intro") => {
      const h = T(isH1 ? "h1" : "h2", "title", { ph: "Section title" }) + (introKey ? T("p", introKey, { cls: "lead", multi: true, ph: "Short intro (optional)" }) : "");
      return h ? `<div class="${center ? "sec-head" : "text-head"}">${h}</div>` : "";
    };
    // Section wrapper with the block's background.
    const st = b.style || {};
    let cls = "", css = "";
    const bg = st.bg || "";
    if (["alt", "tint", "primary", "dark"].includes(bg)) cls += ` bg-${bg}`;
    else if (hex6(bg)) { css += `background-color:${hex6(bg)};`; cls += luminance(hex6(bg)) < 0.4 ? " on-dark" : " on-light"; }
    const coverImg = b.type === "hero" && d.layout === "cover" && d.image ? d.image : "";
    const cardImg = b.type === "hero" && d.layout === "card" && d.image ? d.image : "";
    const bgImg = coverImg || st.bgImage;
    const bgPos = photoPos(cardImg || bgImg);
    if (cardImg) { css += `background-image:url("${asset(cardImg)}");`; cls += " has-img hero-cardbg"; }
    else if (bgImg) { css += `background-image:linear-gradient(rgba(12,14,28,.58),rgba(12,14,28,.58)),url("${asset(bgImg)}");`; cls += " has-img on-dark"; }
    if ((cardImg || bgImg) && bgPos) css += `background-position:${bgPos};`;
    const variant = String(st.variant || "");
    const anim = !edit && b.type !== "header" && ANIMS.some(([k]) => k && k === st.anim) ? st.anim : "";
    if (anim) { cls += ` anim anim-${anim}`; usesAnim = true; }
    const tx = textStyle(st);
    css += tx.css; cls += tx.cls;
    const attrs = (css ? ` style="${esc(css)}"` : "") + (edit ? ` data-block="${esc(b.id)}"` : "");
    const section = (inner) => `<section id="${ids[b.id]}" class="blk blk-${b.type}${cls}"${attrs}>${inner}</section>`;

    switch (b.type) {
      case "header": {
        const navId = `nav-${b.id}`;
        // Multi-page sites: the menu lists the pages (like a site navigation menu) plus the extra links; one-page sites:
        // the block's links. Pages can be hidden from the menu.
        const links = navPages
          ? pages.map((p, j) => (p.hide ? "" : `<li><a href="${edit ? "#" : esc(fileOf(j))}"${j === cur ? ' aria-current="page"' : ""}${edit ? ` data-page="${j}"` : ""}>${esc(p.name)}</a></li>`)).join("") +
            items("extra").map((_, i) => A(`extra.${i}`, "", { li: true })).join("")
          : items("links").map((_, i) => A(`links.${i}`, "", { li: true })).join("");
        const logo = d.logo ? I("logo", d.brand ? `${d.brand} logo` : "Logo", { eager: true }) : "";
        const home = !edit && pages && cur > 0 ? "index.html" : "#top";
        const logoHref = String(d.logoHref || "").trim() ? link(d.logoHref) : home;
        const logoA = d.showLogo === false ? "<span></span>" : `<a class="logo" href="${esc(edit ? "#top" : logoHref)}"${isExternal(logoHref) && !edit ? ' target="_blank" rel="noopener"' : ""}>${logo}${T("span", "brand", { ph: "Your name" }) || (logo ? "" : `<span>${esc(site.name)}</span>`)}</a>`;
        // Menu text style: font, size, bold / italic, colour (empty = the site's defaults).
        const ms = [FONT_FAMILIES[d.menuFont] ? `font-family:${fontStack(d.menuFont)}` : "", d.menuSize === "s" ? "font-size:.9rem" : d.menuSize === "l" ? "font-size:1.15rem" : "",
          d.menuBold === false ? "--mw:400" : "", d.menuItalic ? "font-style:italic" : "", hex6(d.menuColor) ? `--mc:${hex6(d.menuColor)}` : ""].filter(Boolean).join(";");
        return `<header class="site-head${cls}"${attrs}><div class="wrap nav-wrap">${logoA}` +
          `<button class="menu-btn" type="button" aria-expanded="false" aria-controls="${navId}"><span class="bars" aria-hidden="true"></span>Menu</button>` +
          `<nav id="${navId}" class="nav"${ms ? ` style="${esc(ms)}"` : ""} aria-label="Main menu">${links ? `<ul>${links}</ul>` : ""}${A("cta", "btn btn-sm")}</nav></div></header>`;
      }
      case "hero": {
        const lay = d.layout || "split";
        const btns = A("primary") + A("secondary", "btn ghost");
        const text = T("p", "eyebrow", { cls: "eyebrow", ph: "Small line above" }) + T(isH1 ? "h1" : "h2", "title", { ph: "Big headline" }) + T("p", "text", { cls: "lead", multi: true, ph: "A short line about you" }) + (btns ? `<div class="actions">${btns}</div>` : "");
        const pic = () => I("image", d.title, { eager: true });
        if ((lay === "split" || lay === "left") && (d.image || edit)) return section(`<div class="wrap hero-grid${lay === "left" ? " rev" : ""}"><div class="hero-text">${text}</div><div class="hero-media">${pic()}</div></div>`);
        if (lay === "banner") return section(`<div class="wrap hero-c center">${text}</div>${d.image || edit ? `<div class="wrap hero-banner">${pic()}</div>` : ""}`);
        if (lay === "minimal") return section(`<div class="wrap hero-min">${text}</div>`);
        if (lay === "card") return section(`<div class="wrap"><div class="hero-card">${text}${edit && !d.image ? pic() : ""}</div></div>`);
        return section(`<div class="wrap hero-c center">${text}</div>`);
      }
      case "features": {
        const its = items("items");
        if (variant === "list") return section(`<div class="wrap">${head()}<div class="feat-list">${its.map((it, i) => `<article class="feat-row"><div class="ic">${iconSvg(it.icon)}</div><div>${T("h3", `items.${i}.title`, { ph: "Title" })}${T("p", `items.${i}.text`, { multi: true, ph: "Text" })}</div></article>`).join("")}</div></div>`);
        if (variant === "numbers") return section(`<div class="wrap">${head()}<ol class="feat-num">${its.map((it, i) => `<li><span class="num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>${T("h3", `items.${i}.title`, { ph: "Title" })}${T("p", `items.${i}.text`, { multi: true, ph: "Text" })}</li>`).join("")}</ol></div>`);
        return section(`<div class="wrap">${head()}<div class="grid">${its.map((it, i) => `<article class="card feat"><div class="ic">${iconSvg(it.icon)}</div>${T("h3", `items.${i}.title`, { ph: "Title" })}${T("p", `items.${i}.text`, { multi: true, ph: "Text" })}</article>`).join("")}</div></div>`);
      }
      case "about": {
        const media = d.side !== "none" && (d.image || edit) ? `<div class="split-media">${I("image", d.title)}</div>` : "";
        const body = `<div class="text-block">${T(isH1 ? "h1" : "h2", "title", { ph: "Title" })}${T("p", "text", { multi: true, ph: "Your story" })}${d.button?.label || edit ? `<div class="actions">${A("button")}</div>` : ""}</div>`;
        return section(`<div class="wrap ${media ? `split${d.side === "right" ? " rev" : ""}` : "about-c"}">${media}${body}</div>`);
      }
      case "gallery":
        return section(`<div class="wrap">${head()}<div class="gal${variant === "mosaic" ? " mosaic" : ""}">${items("images").map((g, i) => `<figure>${I(`images.${i}.src`, g.caption || `${d.title || "Gallery"} picture ${i + 1}`)}${T("figcaption", `images.${i}.caption`, { ph: "Caption (optional)" })}</figure>`).join("")}</div></div>`);
      case "pricing":
        return section(`<div class="wrap">${head()}<div class="grid">${items("plans").map((p, i) => {
          const feats = (Array.isArray(p.features) ? p.features : []).map((f, j) => (String(f).trim() || edit ? `<li${edit ? ` data-edit="plans.${i}.features.${j}" contenteditable="plaintext-only" data-ph="Feature"` : ""}>${esc(String(f).trim())}</li>` : "")).join("");
          return `<article class="card plan${p.featured ? " featured" : ""}">${p.featured ? '<span class="badge">Popular</span>' : ""}${T("h3", `plans.${i}.name`, { ph: "Name" })}<p class="price">${T("span", `plans.${i}.price`, { ph: "Price" })}${T("small", `plans.${i}.period`, { ph: "" })}</p>${T("p", `plans.${i}.text`, { multi: true, ph: "Short text" })}${feats ? `<ul>${feats}</ul>` : ""}${A(`plans.${i}.button`, p.featured ? "btn" : "btn ghost")}</article>`;
        }).join("")}</div></div>`);
      case "products": {
        const label = String(d.orderLabel || "Order on WhatsApp").trim();
        return section(`<div class="wrap">${head()}<div class="grid">${items("items").map((p, i) => {
          const msg = `Hello! I would like to order: ${String(p.name || "").trim()}${p.price ? ` (${String(p.price).trim()})` : ""}.`;
          return `<article class="card prod">${I(`items.${i}.image`, p.name)}${T("h3", `items.${i}.name`, { ph: "Product name" })}<p class="price">${T("span", `items.${i}.price`, { ph: "Price" })}</p>${T("p", `items.${i}.text`, { multi: true, ph: "Short text" })}<a class="btn wa" href="${esc(waLink(d.whatsapp, msg))}" target="_blank" rel="noopener"${edit ? ' data-order="1"' : ""}>${iconSvg("chat")}<span>${esc(label)}</span></a></article>`;
        }).join("")}</div></div>`);
      }
      case "testimonials": {
        // Reviewer name + role, with a small round photo when the review has one.
        const who = (q, i) => { const n = T("strong", `items.${i}.name`, { ph: "Name" }) + T("span", `items.${i}.role`, { ph: "Role or city" }); return q.photo ? `<figcaption class="has-av">${I(`items.${i}.photo`, "", { cls: "av" })}<span>${n}</span></figcaption>` : `<figcaption>${n}</figcaption>`; };
        if (variant === "single") return section(`<div class="wrap">${head(true, "")}<div class="quotes-big">${items("items").map((q, i) => `<figure class="quote big"><blockquote>${T("p", `items.${i}.quote`, { multi: true, ph: "What they said" })}</blockquote>${who(q, i)}</figure>`).join("")}</div></div>`);
        return section(`<div class="wrap">${head(true, "")}<div class="grid">${items("items").map((q, i) => `<figure class="card quote"><blockquote>${T("p", `items.${i}.quote`, { multi: true, ph: "What they said" })}</blockquote>${who(q, i)}</figure>`).join("")}</div></div>`);
      }
      case "faq":
        return section(`<div class="wrap">${head(true, "")}<div class="faq">${items("items").map((q, i) => `<details${edit ? " open" : ""}><summary>${T("span", `items.${i}.q`, { ph: "Question" })}</summary><div class="ans">${T("p", `items.${i}.a`, { multi: true, ph: "Answer" })}</div></details>`).join("")}</div></div>`);
      case "team":
        return section(`<div class="wrap">${head()}<div class="grid">${items("members").map((m, i) => `<article class="card member">${I(`members.${i}.photo`, m.name ? `Photo of ${m.name}` : "Team member photo")}${T("h3", `members.${i}.name`, { ph: "Name" })}${T("p", `members.${i}.role`, { ph: "Role" })}</article>`).join("")}</div></div>`);
      case "timeline":
        return section(`<div class="wrap">${head(true, "")}<ol class="tl">${items("items").map((s, i) => `<li>${T("span", `items.${i}.when`, { cls: "when", ph: "When" })}${T("h3", `items.${i}.title`, { ph: "Title" })}${T("p", `items.${i}.text`, { multi: true, ph: "Details (optional)" })}</li>`).join("")}</ol></div>`);
      case "contact": {
        const email = String(d.email || "").trim(), phone = String(d.phone || "").trim(), wa = waDigits(d.whatsapp);
        const li = (icon, inner) => `<li><span class="ic">${iconSvg(icon)}</span><span>${inner}</span></li>`;
        const list = [
          email ? li("chat", `<a href="mailto:${esc(email)}">${esc(email)}</a>`) : "",
          phone ? li("phone", `<a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a>`) : "",
          String(d.address || "").trim() || edit ? li("pin", T("span", "address", { multi: true, ph: "Address" })) : "",
        ].join("");
        const waBtn = wa ? `<a class="btn wa" href="${esc(waLink(wa, String(d.waText || "").trim()))}" target="_blank" rel="noopener">${iconSvg("chat")}${T("span", "waLabel", { ph: "Chat on WhatsApp" }) || "<span>Chat on WhatsApp</span>"}</a>` : "";
        const fid = (k) => `${k}-${b.id}`;
        const form = `<form class="card form" action="mailto:${esc(email)}" method="post" enctype="text/plain">${T("h3", "formTitle", { ph: "Form title" })}` +
          `<label for="${fid("name")}">Your name</label><input id="${fid("name")}" name="name" type="text" autocomplete="name" required>` +
          `<label for="${fid("email")}">Your email</label><input id="${fid("email")}" name="email" type="email" autocomplete="email" required>` +
          `<label for="${fid("msg")}">Message</label><textarea id="${fid("msg")}" name="message" rows="4" required></textarea>` +
          `<button class="btn" type="submit">${esc(String(d.send || "Send message").trim() || "Send message")}</button><p class="note">This opens your email app with the message ready to send.</p></form>`;
        return section(`<div class="wrap split contact"><div class="text-block">${T(isH1 ? "h1" : "h2", "title", { ph: "Title" })}${T("p", "text", { cls: "lead", multi: true, ph: "Short text" })}${list ? `<ul class="contact-list">${list}</ul>` : ""}${waBtn}</div>${email ? form : ""}</div>`);
      }
      case "map": {
        const q = String(d.query || d.address || "").trim();
        const link = q ? `<a class="btn" href="${esc("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q))}" target="_blank" rel="noopener">${iconSvg("pin")}<span>${esc(String(d.label || "Open in Maps").trim() || "Open in Maps")}</span></a>` : "";
        return section(`<div class="wrap"><div class="card mapcard">${d.image || edit ? `<div>${I("image", `Map of ${d.address || "our location"}`)}</div>` : ""}<div class="body">${T(isH1 ? "h1" : "h2", "title", { ph: "Title" })}${T("p", "address", { multi: true, ph: "Address" })}${T("p", "note", { multi: true, ph: "Opening hours" })}${link}</div></div></div>`);
      }
      case "embed": {
        const hpx = [320, 480, 640, 840].includes(+d.height) ? +d.height : 480;
        const code = String(d.code || "");
        const docHtml = /<html[\s>]/i.test(code) ? code : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(d.title || "Widget")}</title></head><body>${code}</body></html>`;
        return section(`<div class="wrap">${head(true, "")}<iframe class="embed-frame" title="${esc(String(d.title || "").trim() || "Embedded widget")}" srcdoc="${esc(docHtml)}" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" loading="lazy" style="height:${hpx}px"></iframe></div>`);
      }
      case "video": {
        const v = videoEmbed(d.url), ratio = { "9:16": "9/16", "4:3": "4/3", "1:1": "1/1" }[d.ratio] || "16/9";
        const label = String(d.title || "").trim() || "Video";
        let player;
        if (edit) player = `<div class="vid-ph" style="aspect-ratio:${ratio}" data-video="1"><span>${v ? `${v.kind === "file" ? "Video file" : v.kind === "youtube" ? "YouTube video" : "Vimeo video"}: plays in Preview and on the published site` : "Paste a YouTube, Vimeo or .mp4 link in the Edit panel"}</span></div>`;
        else if (!v) player = "";
        else if (v.kind === "file") player = `<video class="vid" style="aspect-ratio:${ratio}" src="${esc(v.src)}" controls playsinline preload="metadata"></video>`;
        else player = `<iframe class="vid" style="aspect-ratio:${ratio}" src="${esc(v.src)}" title="${esc(label)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        return section(`<div class="wrap">${head()}${player ? `<div class="vid-box${d.ratio === "9:16" ? " tall" : ""}">${player}</div>` : ""}</div>`);
      }
      case "footer": {
        const links = items("links").map((_, i) => A(`links.${i}`, "", { li: true })).join("");
        return `<footer class="site-foot${cls}"${attrs}><div class="wrap foot">${T("p", "text", { multi: true, ph: "A short line" })}${links ? `<nav aria-label="Footer"><ul>${links}</ul></nav>` : ""}${T("p", "copy", { cls: "copy", ph: "© Your name" })}</div></footer>`;
      }
      default: return "";
    }
  };

  // Leading headers go before <main>, trailing footers after it, everything else inside the one <main>.
  const bl = site.blocks;
  let s = 0, e = bl.length;
  while (s < e && bl[s].type === "header") s++;
  while (e > s && bl[e - 1].type === "footer") e--;
  const before = bl.slice(0, s).map(renderBlock).join("\n");
  const mainHtml = (h1Id ? "" : `<h1 class="sr-only">${esc(site.name)}</h1>`) + bl.slice(s, e).map(renderBlock).join("\n");
  const after = bl.slice(e).map(renderBlock).join("\n");

  const t = { ...DEFAULT_THEME, ...site.theme };
  const pg = pages ? pages[cur] : null;
  const siteTitle = site.name.trim() || "My website";
  const title = (pg && pg.title) || (pg && cur > 0 ? `${pg.name} | ${siteTitle}` : siteTitle);
  const hero = bl.find((b) => b.type === "hero");
  const desc = ((pg && pg.description) || (cur === 0 ? site.description : "") || String(hero?.data?.text || "") || title).replace(/\s+/g, " ").trim().slice(0, 300);
  const logo = (pages ? pages[0].blocks : bl).find((b) => b.type === "header" && b.data.logo)?.data.logo;
  const icon = S.favicon || logo || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(faviconSvg(site));
  const baseUrl = siteBase(S);
  const url = baseUrl ? baseUrl + (cur > 0 ? fileOf(cur) : "") : "";
  // Social media link preview: its own title and text when set (Canva: "Social media link preview"), else the page's.
  const ogTitle = S.ogTitle.trim() || title, ogDesc = S.ogDesc.replace(/\s+/g, " ").trim() || desc;
  const head = [
    `<meta property="og:type" content="website">`, `<meta property="og:title" content="${esc(ogTitle)}">`, `<meta property="og:description" content="${esc(ogDesc)}">`,
    S.ogImage ? `<meta property="og:image" content="${esc(baseUrl && files ? baseUrl + asset(S.ogImage, "social") : asset(S.ogImage, "social"))}">\n<meta name="twitter:card" content="summary_large_image">` : "",
    url ? `<meta property="og:url" content="${esc(url)}">\n<link rel="canonical" href="${esc(url)}">` : "",
    S.indexable ? "" : `<meta name="robots" content="noindex, nofollow">`,
  ].filter(Boolean).join("\n");
  // Export-only extras (never in the editor preview): analytics, cookie banner, simple page lock.
  const ga = live && S.gaId ? S.gaId : "";
  const gaLoad = ga ? `function adGa(){if(window.adGaOn)return;window.adGaOn=1;var s=document.createElement("script");s.async=1;s.src="https://www.googletagmanager.com/gtag/js?id=${ga}";document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config","${ga}")}` : "function adGa(){}";
  const cookie = live && S.cookie;
  // Cookie banner (Canva parity): top or bottom, dark or light, the choice is kept 12 months on the visitor's device,
  // "Cookie settings" button to change it later (Decline then switches analytics off with Google's opt-out flag).
  const off = ga ? `window["ga-disable-${ga}"]=v!=="yes";` : "";
  const cookieJs = `var k="ad-cookies",c=null,Y=31536e6;try{var r=localStorage.getItem(k);if(r){var o=r.charAt(0)==="{"?JSON.parse(r):{v:r,t:Date.now()};if(o&&(o.v==="yes"||o.v==="no")&&Date.now()-o.t<Y)c=o.v}}catch(e){}` +
    `var b=document.querySelector(".cookie"),s=document.querySelector(".cookie-set");function show(){b.hidden=false;if(s)s.hidden=true}` +
    `function done(v){try{localStorage.setItem(k,JSON.stringify({v:v,t:Date.now()}))}catch(x){}b.hidden=true;if(s)s.hidden=false;${off}if(v==="yes")adGa()}` +
    `if(b){b.addEventListener("click",function(e){var v=e.target.getAttribute&&e.target.getAttribute("data-cookie");if(v)done(v)});if(s)s.addEventListener("click",show)}` +
    `if(c){var v=c;${off}if(s)s.hidden=false;if(c==="yes")adGa()}else if(b)show();`;
  const extras = !live ? "" : [
    cookie ? `<div class="cookie" data-pos="${S.cookiePos}" data-tone="${S.cookieTheme}" role="region" aria-label="Cookies" hidden><p>${esc(S.cookieText.trim() || "We use cookies to see how visitors use this site. You can say no.")}</p><span class="actions"><button class="btn btn-sm" type="button" data-cookie="yes">Accept</button><button class="btn btn-sm ghost" type="button" data-cookie="no">Decline</button></span></div>` +
      (S.cookieButton ? `\n<button class="cookie-set" type="button" hidden>Cookie settings</button>` : "") : "",
    (ga || cookie) ? `<script>(function(){${gaLoad}${cookie ? cookieJs : "adGa();"}})();</script>` : "",
    S.passHash ? `<script>(function(){var H="${S.passHash}",k="ad-unlock",d=document,b=d.body,L=d.getElementById("ad-lock");${SHA_SRC}function open(){b.classList.remove("locked");L.hidden=true}try{if(sessionStorage.getItem(k)===H)return open()}catch(e){}b.classList.add("locked");L.hidden=false;L.querySelector("form").addEventListener("submit",function(e){e.preventDefault();var v=L.querySelector("input").value;if(sha256Hex(v)===H){try{sessionStorage.setItem(k,H)}catch(x){}open()}else{L.querySelector(".err").hidden=false}})})();</script>` : "",
  ].filter(Boolean).join("\n");
  const lock = live && S.passHash ? `<div class="lock" id="ad-lock" hidden><form class="card"><h2>${esc(siteTitle)}</h2><label for="ad-pass">Password</label><input id="ad-pass" type="password" autocomplete="current-password" required><button class="btn" type="submit">Open the site</button><p class="err" hidden>That password is not right.</p><p class="note">This page is password protected.</p></form></div>\n` : "";
  // Animations: blocks start hidden only when this script runs (no script = everything visible); they play once when
  // they scroll into view, and not at all for visitors who ask for reduced motion.
  const animHead = usesAnim ? `\n<script>document.documentElement.classList.add("js")</script>` : "";
  const animJs = usesAnim ? `\n<script>${ANIM_SCRIPT}</script>` : "";
  // "Resize on mobile" off: phones show the desktop layout zoomed out instead of the stacked mobile layout.
  const viewport = S.mobileResize ? "width=device-width, initial-scale=1" : "width=1200";
  return `<!doctype html>
<html lang="${esc(site.lang)}"${edit ? " data-editing data-site" : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="${viewport}">${animHead}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${esc(hex6(t.primary) || DEFAULT_THEME.primary)}">
${head}
<meta name="generator" content="AsaanDesk Website builder">
<link rel="icon" href="${esc(asset(icon, logo && !S.favicon ? "" : "favicon"))}">
<style id="site-css">${siteCss(t)}</style>${edit ? `\n<style id="edit-css">${EDIT_CSS}</style>` : ""}
</head>
<body id="top"${live && S.passHash ? ' class="locked"' : ""}>
${lock}<a class="skip" href="#main">Skip to content</a>
${before}
<main id="main">
${mainHtml}
</main>
${after}
<script>${SCRIPT}</script>${animJs}${extras ? "\n" + extras : ""}
</body>
</html>
`;
}

/**
 * Final checks before publishing (Canva: the right address, page URLs without typos or duplicates, a unique title and
 * description on every page, a navigation that reaches every page) plus ours: broken links, sections per page, fonts,
 * size and analytics without a cookie banner. Returns [{ level: "error" | "warn" | "info" | "ok", text, page }].
 */
export function publishChecks(input) {
  const site = normalizeSite(clone(input || {})), S = site.settings || normSettings(null), pages = pageList(site), out = [];
  const add = (level, text, page = null) => out.push({ level, text, page });
  const siteTitle = site.name.trim();
  if (!siteTitle || siteTitle === "My website") add("warn", "Give the website its own title: it shows in browser tabs and search results.");
  const titles = new Map(), descs = new Map(), slugs = new Map();
  const pageAnchors = pages.map((p) => new Set(["top", "main", ...Object.values(anchors({ blocks: p.blocks }))]));
  const links = [];
  const walk = (v, j) => { if (Array.isArray(v)) v.forEach((x) => walk(x, j)); else if (v && typeof v === "object") { if (typeof v.href === "string" && String(v.label || "").trim()) links.push([j, String(v.label).trim(), v.href.trim()]); for (const x of Object.values(v)) walk(x, j); } };
  pages.forEach((p, j) => {
    const name = p.name || "Home";
    const t = (p.title || (j ? `${p.name} | ${siteTitle}` : siteTitle)).trim().toLowerCase();
    if (titles.has(t)) add("warn", `"${name}" has the same page title as "${titles.get(t)}". Give every page its own title.`, j); else titles.set(t, name);
    const d = String(p.description || (j === 0 ? site.description : "") || "").replace(/\s+/g, " ").trim();
    if (!d) add("warn", `"${name}" has no description for search results (150 to 160 characters is best).`, j);
    else {
      if (d.length > 160) add("warn", `The description of "${name}" is ${d.length} characters: search results cut it after about 160.`, j);
      if (descs.has(d.toLowerCase())) add("warn", `"${name}" has the same description as "${descs.get(d.toLowerCase())}".`, j); else descs.set(d.toLowerCase(), name);
    }
    if (j > 0) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug || "")) add("error", `The address of "${name}" (${p.slug || "empty"}) has characters that do not work in a web address.`, j);
      if (slugs.has(p.slug)) add("error", `"${name}" and "${slugs.get(p.slug)}" have the same address (${p.slug}.html).`, j); else slugs.set(p.slug, name);
    }
    if (p.blocks.length > MAX_SECTIONS) add("error", `"${name}" has ${p.blocks.length} sections. A page can have up to ${MAX_SECTIONS}: remove some or move them to a new page.`, j);
    const navOn = pages.length > 1 && S.navPages; // the menu then shows the pages, not the header's own links
    for (const b of p.blocks) {
      walk(b.type === "header" && navOn ? { ...b.data, links: [] } : b.type === "header" ? { ...b.data, extra: [] } : b.data, j);
      if (b.type === "video" && !videoEmbed(b.data.url)) add("warn", `The video section on "${name}" has no YouTube, Vimeo or .mp4 link yet.`, j);
      if (b.type === "embed" && !String(b.data.code || "").trim()) add("warn", `The embed section on "${name}" is empty.`, j);
    }
  });
  // Links: pages that do not exist, sections that are on no page.
  const slugSet = new Set(pages.map((p, j) => (j ? p.slug : "index")));
  const broken = new Set();
  for (const [j, label, href] of links) {
    const v = safeHref(href), pm = /^page:([a-z0-9-]+)(#[\w-]+)?$/i.exec(v);
    let bad = "";
    if (pm) { const sl = pm[1].toLowerCase() === "home" ? "index" : pm[1].toLowerCase(); if (!slugSet.has(sl)) bad = "goes to a page that does not exist"; }
    else if (/^#[\w-]+$/.test(v) && !pageAnchors.some((set) => set.has(v.slice(1)))) bad = `goes to a section (${v}) that is on no page`;
    else if (v === "#" && href && href !== "#") bad = "is not a link this site can open";
    const key = `${j}|${label}|${href}`;
    if (bad && !broken.has(key)) { broken.add(key); add("warn", `The button "${label}" on "${pages[j].name || "Home"}" ${bad}.`, j); }
  }
  // Navigation: every page reachable.
  if (pages.length > 1) {
    const hasHeader = pages[0].blocks.some((b) => b.type === "header");
    if (!S.navPages || !hasHeader) add("warn", hasHeader ? "The pages are not in the site menu: turn on the navigation menu, or make sure buttons link to every page." : "The home page has no menu bar: add a Header & menu section so visitors can reach the other pages.");
    pages.forEach((p, j) => {
      if (j === 0 || !p.hide) return;
      const linked = links.some(([, , href]) => new RegExp(`^page:${p.slug}(#|$)`, "i").test(safeHref(href)));
      if (!linked) add("warn", `"${p.name}" is hidden from the menu and no button links to it, so visitors can't find it.`, j);
    });
  }
  // Fonts (each font slows the site down) and size.
  const fonts = new Set([site.theme.headingFont, site.theme.bodyFont]);
  for (const p of pages) for (const b of p.blocks) if (b.type === "header" && FONT_FAMILIES[b.data.menuFont]) fonts.add(b.data.menuFont);
  if (fonts.size > 3) add("warn", `The site uses ${fonts.size} fonts. Up to three keeps it fast and tidy.`);
  const mb = JSON.stringify(site).length / 1048576;
  if (mb > 5) add("warn", `The site is about ${mb.toFixed(1)} MB. Big pictures make it slow on phones: use smaller pictures or fewer of them.`);
  // Address, analytics, password.
  if (!S.domain) add("info", "No website address yet. It is optional: with one, the download also has sitemap.xml and link previews use the full address.");
  if (S.gaId && !S.cookie) add("warn", "Google Analytics is on without a cookie banner. Many countries require visitors to agree first.");
  if (S.passHash && S.indexable) add("info", "The site has a password, so search engines can't read its pages.");
  if (!out.some((x) => x.level === "error" || x.level === "warn")) add("ok", "Everything looks ready to publish.");
  return out;
}

/** SHA-256 of a text as 64 hex characters (pure JS; also copied into the exported page lock). */
export function sha256Hex(text) {
  var str = unescape(encodeURIComponent(String(text))), rr = function (v, n) { return (v >>> n) | (v << (32 - n)); };
  var W = Math.pow(2, 32), h = [], k = [], comp = {}, pc = 0, i, j, words = [], bits = str.length * 8, out = "";
  for (var c = 2; pc < 64; c++) if (!comp[c]) { for (i = 0; i < 313; i += c) comp[i] = c; h[pc] = (Math.pow(c, 0.5) * W) | 0; k[pc++] = (Math.pow(c, 1 / 3) * W) | 0; }
  str += "\x80";
  while ((str.length % 64) - 56) str += "\x00";
  for (i = 0; i < str.length; i++) { j = str.charCodeAt(i); words[i >> 2] |= j << (((3 - i) % 4) * 8); }
  words[words.length] = (bits / W) | 0;
  words[words.length] = bits;
  for (j = 0; j < words.length;) {
    var w = words.slice(j, (j += 16)), old = h;
    h = h.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2], a = h[0], e = h[4];
      var t1 = h[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
      h = [(t1 + t2) | 0].concat(h);
      h[4] = (h[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) h[i] = (h[i] + old[i]) | 0;
  }
  for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var by = (h[i] >> (j * 8)) & 255; out += (by < 16 ? "0" : "") + by.toString(16); }
  return out;
}
const SHA_SRC = sha256Hex.toString();

export { ICON_NAMES };
