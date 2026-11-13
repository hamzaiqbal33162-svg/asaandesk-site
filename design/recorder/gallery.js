// Recording layout templates for the online video recorder (pure module: no DOM). Used by the editor's Templates panel
// and by the intro page. Pictures follow Canva's pattern: a realistic shared screen (slides, dashboard, website, code…
// with real library photos), the camera bubble with a real presenter photo (shared people library) and its ring colour, a
// branded background, bold title.
// GENERATOR: hand-made recording LAYOUTS (what to record, camera bubble size and corner, sound, countdown)
// x own colour PALETTES (thumbnail colours and the camera bubble ring in the recording)
// x content THEMES (purpose with its own title and talking points shown while you record).
// Ids encode the combination: "<layout>~p<NN>~<theme>", e.g. "slides-talk~p07~lesson". A bare layout id
// ("slides-talk") still works (palette p01, the layout's first theme). Thumbnails are small SVG strings made on demand.

import { kit, rect, circle, pathEl, mix, esc, icon } from "../shared/tpl-kit.js";
import { photoPool, onBg } from "../video/scenes.js";
import { cast, faceBox } from "../video/people.js";

const GROUP = { both: "Screen and camera", camera: "Camera", screen: "Screen", audio: "Sound only" };

/** [id, name, setup, hint, only-these-themes?] */
const L = [
  ["screen-camera-bubble", "Screen + camera bubble", { mode: "both", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Share a screen or window. Your camera sits in a round bubble at the bottom left."],
  ["slides-talk", "Slides talk", { mode: "both", bubbleSize: "S", bubblePos: "br", mic: true, tabAudio: false, countdown: true }, "Share your slides window. A small camera bubble sits at the bottom right, away from your text."],
  ["tutorial-corner", "Tutorial with webcam corner", { mode: "both", bubbleSize: "S", bubblePos: "tr", mic: true, tabAudio: true, countdown: true }, "Show the steps on screen with your face in the top right corner. Tab sound is on for app sounds."],
  ["product-demo", "Product demo", { mode: "both", bubbleSize: "M", bubblePos: "br", mic: true, tabAudio: true, countdown: true }, "Walk through your product in a browser tab, with the tab's sound and a medium camera bubble."],
  ["reaction-video", "Reaction video", { mode: "both", bubbleSize: "L", bubblePos: "tr", mic: true, tabAudio: true, countdown: true }, "Play the clip in a tab with its sound. A large camera bubble shows your reaction.", ["movie-review", "game-review", "music-practice", "book-review", "travel-vlog"]],
  ["online-lesson", "Online lesson", { mode: "both", bubbleSize: "M", bubblePos: "tl", mic: true, tabAudio: false, countdown: true }, "Teach from your screen with a friendly camera bubble at the top left."],
  ["big-presenter", "Presenter with large camera", { mode: "both", bubbleSize: "L", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Your screen with a large camera bubble at the bottom left, so people see you clearly."],
  ["corner-cam-small", "Screen with tiny camera", { mode: "both", bubbleSize: "S", bubblePos: "bl", mic: true, tabAudio: false, countdown: false }, "Mostly screen, with a small camera bubble at the bottom left. No countdown."],
  ["camera-only", "Camera only", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "A talking-head video from your camera and microphone."],
  ["video-message", "Video message", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: false }, "A quick camera message with no countdown: press Record and talk."],
  ["interview-answer", "Interview answer", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Look at the camera and answer one question per take. The countdown gives you a breath first."],
  ["screen-only", "Screen only walkthrough", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: true, countdown: true }, "Record a screen, window or tab with your voice and the tab's sound."],
  ["bug-report", "Bug report", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: false }, "Show a problem on screen and explain it. No countdown, so you can start right away.", ["support-reply", "coding-walkthrough", "customer-onboarding", "team-update", "homework-help"]],
  ["gameplay-clip", "Gameplay clip", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: false, tabAudio: true, countdown: false }, "Record a game tab with its sound only (microphone off).", ["game-review", "music-practice", "movie-review"]],
  ["silent-screen", "Silent screen capture", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: false, tabAudio: false, countdown: true }, "Only the picture, no sound: add music or a voiceover later in the video editor."],
  ["podcast-audio", "Podcast or interview", { mode: "audio", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Sound only from your microphone. Save as WebM or WAV."],
  ["voice-note", "Voice note", { mode: "audio", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: false }, "A quick voice memo: press Record and speak."],
  ["webinar-audio", "Webinar sound", { mode: "audio", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: true, countdown: true }, "Your microphone plus a tab's sound, for a talk or call you take part in."],
  // round 2: 22 more layouts (40 in all), each with its own picture in the thumbnail (see ART)
  ["code-pair", "Code with face cam", { mode: "both", bubbleSize: "S", bubblePos: "tl", mic: true, tabAudio: false, countdown: true }, "Your code editor with a small camera bubble at the top left, out of the way of the code."],
  ["sheet-explainer", "Spreadsheet explainer", { mode: "both", bubbleSize: "S", bubblePos: "br", mic: true, tabAudio: false, countdown: true }, "Walk through numbers in a spreadsheet, with a small camera bubble at the bottom right."],
  ["chart-briefing", "Chart briefing", { mode: "both", bubbleSize: "M", bubblePos: "tr", mic: true, tabAudio: false, countdown: true }, "Explain a chart or report, with your camera at the top right."],
  ["website-review", "Website review", { mode: "both", bubbleSize: "M", bubblePos: "br", mic: true, tabAudio: true, countdown: true }, "Scroll through a website in a tab, with its sound and your camera at the bottom right."],
  ["design-feedback", "Design feedback", { mode: "both", bubbleSize: "L", bubblePos: "br", mic: true, tabAudio: false, countdown: true }, "Give feedback on a design, with a large camera bubble so people see your reactions."],
  ["route-explainer", "Route explainer", { mode: "both", bubbleSize: "S", bubblePos: "tr", mic: true, tabAudio: false, countdown: false }, "Show a map and explain the way, with a small camera at the top right."],
  ["chat-walkthrough", "Chat support walkthrough", { mode: "both", bubbleSize: "S", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Show a chat or help desk screen step by step, with a small camera bubble."],
  ["dashboard-tour", "Dashboard tour", { mode: "both", bubbleSize: "M", bubblePos: "tl", mic: true, tabAudio: true, countdown: true }, "Tour a dashboard or admin page, with your camera at the top left."],
  ["video-commentary", "Video commentary", { mode: "both", bubbleSize: "L", bubblePos: "tl", mic: true, tabAudio: true, countdown: true }, "Comment on a video playing in a tab, with its sound and a large camera bubble."],
  ["doc-review", "Document review", { mode: "both", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: false }, "Read through a document and point out what matters, with your camera at the bottom left."],
  ["whiteboard-talk", "Whiteboard explainer", { mode: "both", bubbleSize: "M", bubblePos: "tr", mic: true, tabAudio: false, countdown: true }, "Draw and explain on an online whiteboard, with your camera at the top right."],
  ["code-screencast", "Code screencast", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Only your code editor and your voice: a classic programming screencast."],
  ["slides-voiceover", "Slides with voice-over", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Your slides full screen with your voice, no camera."],
  ["website-walkthrough", "Website walkthrough", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: true, countdown: false }, "A browser tab with its sound and your voice, no camera."],
  ["sheet-walkthrough", "Spreadsheet walkthrough", { mode: "screen", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Numbers and formulas on screen, explained in your voice."],
  ["two-person-chat", "Two-person chat", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Two people side by side in front of one camera, sharing one microphone."],
  ["talk-with-notes", "Talk with notes", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "A talking-head video with your notes in the Teleprompter panel."],
  ["introduce-yourself", "Introduce yourself", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: false }, "A short hello with your name: great for a profile, a class or a new team."],
  ["room-tour", "Room tour", { mode: "camera", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Walk your camera around a room, shop or home and talk about it."],
  ["radio-show", "Radio show", { mode: "audio", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: true, countdown: true }, "Your voice plus music from a tab, like a little radio show."],
  ["two-mic-podcast", "Two-voice podcast", { mode: "audio", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Two people talking into one microphone: sound only."],
  ["audiobook-reading", "Audiobook reading", { mode: "audio", bubbleSize: "M", bubblePos: "bl", mic: true, tabAudio: false, countdown: true }, "Read a chapter aloud, calm and steady. Save as WAV for the best quality."],
];

/** [id, name, light background, accent, second accent, dark?] — our own colours. */
const P = [
  ["Violet", "#eef2ff", "#5b4cf0", "#14b8a6"], ["Sunset", "#fff7ed", "#f97316", "#5b4cf0"], ["Lagoon", "#ecfeff", "#0891b2", "#f59e0b"],
  ["Mint", "#f0fdf4", "#16a34a", "#2f80ff"], ["Berry", "#fdf2f8", "#db2777", "#8b5cf6"], ["Honey", "#fefce8", "#ca8a04", "#2f80ff"],
  ["Sky", "#eff6ff", "#2f80ff", "#14b8a6"], ["Lilac", "#f5f3ff", "#8b5cf6", "#f472b6"], ["Slate", "#f1f5f9", "#334155", "#14b8a6"],
  ["Coral", "#fef2f2", "#e11d48", "#334155"], ["Night", "#0f172a", "#22d3ee", "#a3e635", 1], ["Forest", "#f0fdfa", "#0d9488", "#5b4cf0"],
  ["Plum", "#1e1b4b", "#a78bfa", "#f472b6", 1], ["Sand", "#faf6ef", "#b45309", "#0f766e"],
];

/** [id, name, short title, talking points, modes it fits, tags] */
const T = [
  ["lesson", "Lesson", "Today's lesson", ["What we will learn today", "One worked example, step by step", "A short task to try on your own"], ["both", "screen", "camera", "audio"], ["teacher", "class", "school", "education"]],
  ["product-demo", "Product demo", "See it in action", ["The problem it solves", "Three features, shown live", "How to get started"], ["both", "screen", "camera"], ["product", "saas", "feature", "launch"]],
  ["sales-pitch", "Sales pitch", "A quick idea for you", ["Hi, and why I'm reaching out", "What we could improve together", "One clear next step"], ["both", "camera", "screen"], ["sales", "outreach", "pitch", "prospect"]],
  ["team-update", "Team update", "This week's update", ["What we finished", "What we're working on next", "Where we need help"], ["both", "screen", "camera", "audio"], ["team", "standup", "status", "work"]],
  ["support-reply", "Support reply", "Here's how to fix it", ["What went wrong", "The steps to fix it", "How to reach us again"], ["both", "screen", "camera"], ["support", "help desk", "customer", "how to"]],
  ["recipe", "Recipe", "Cook with me", ["Ingredients you need", "The method, one step at a time", "Serving tip"], ["camera", "audio"], ["cooking", "food", "kitchen", "recipe"]],
  ["fitness-class", "Fitness class", "Let's move", ["Warm-up", "Three exercises with counts", "Cool-down and stretch"], ["camera", "both"], ["fitness", "workout", "gym", "yoga"]],
  ["coding-walkthrough", "Coding walkthrough", "Code walkthrough", ["What this code does", "The key part, line by line", "How to run and test it"], ["both", "screen"], ["code", "developer", "programming", "review"]],
  ["homework-help", "Homework help", "Homework help", ["Read the question together", "Solve it step by step", "Check the answer"], ["both", "screen", "camera", "audio"], ["homework", "student", "maths", "tutor"]],
  ["real-estate-tour", "Real estate tour", "Take the tour", ["The neighbourhood", "Room by room", "Price and how to book a visit"], ["camera", "both"], ["property", "real estate", "home", "listing"]],
  ["travel-vlog", "Travel diary", "Where we went", ["Where we are today", "The best moment", "A tip for your trip"], ["camera", "audio", "both"], ["travel", "vlog", "trip", "diary"]],
  ["podcast-episode", "Podcast episode", "New episode", ["Intro and today's guest", "Three questions", "Wrap-up and where to listen"], ["audio", "camera"], ["podcast", "show", "talk", "episode"]],
  ["customer-onboarding", "Customer onboarding", "Welcome aboard", ["Set up your account", "Your first project", "Where to find help"], ["both", "screen", "camera"], ["onboarding", "welcome", "customer", "setup"]],
  ["book-review", "Book review", "Book of the month", ["What the book is about", "What I liked and didn't", "Who should read it"], ["camera", "audio", "both"], ["book", "reading", "review", "club"]],
  ["music-practice", "Music practice", "Practice session", ["Tune up and warm up", "The tricky part, slowly", "Full run-through"], ["camera", "audio", "screen", "both"], ["music", "practice", "song", "lesson"]],
  ["game-review", "Game review", "Let's play", ["What the game is", "Gameplay highlights", "Score out of ten"], ["screen", "both", "camera"], ["game", "gaming", "review", "play"]],
  ["movie-review", "Movie review", "Movie night verdict", ["No-spoiler summary", "Best and worst parts", "Final rating"], ["camera", "audio", "both", "screen"], ["movie", "film", "review", "cinema"]],
  ["job-application", "Job application", "Nice to meet you", ["Who I am", "What I'm good at, with one example", "Why this role"], ["camera"], ["job", "career", "interview", "cv"]],
  ["thank-you", "Thank-you note", "Thank you!", ["Who I'm thanking", "What it meant to me", "A warm goodbye"], ["camera", "audio"], ["thanks", "gratitude", "message", "greeting"]],
  ["daily-journal", "Daily journal", "Today in one minute", ["How today went", "One thing I learned", "Plan for tomorrow"], ["audio", "camera"], ["journal", "diary", "reflection", "memo"]],
];

export const COUNT = 160;
const pad = (n) => String(n).padStart(2, "0");
const layoutOf = (id) => L.find((x) => x[0] === id);
const themeOf = (id) => T.find((x) => x[0] === id);
const fits = (l) => (l[4] ? T.filter((t) => l[4].includes(t[0])) : T.filter((t) => t[4].includes(l[2].mode)));

function entry(l, pi, t) {
  const p = P[pi];
  return { id: `${l[0]}~p${pad(pi + 1)}~${t[0]}`, name: `${t[1]}: ${l[1]}`, tool: "online-video-recorder", section: GROUP[l[2].mode],
    layout: l[0], palette: `p${pad(pi + 1)}`, theme: t[0], tags: [l[1].toLowerCase(), t[1].toLowerCase(), p[0].toLowerCase(), l[2].mode, ...t[5]] };
}
/** Well-mixed order: each round walks every layout once, with a new theme and palette each time. */
function build() {
  const out = [], seen = new Set(), total = L.reduce((n, l) => n + fits(l).length * P.length, 0);
  for (let r = 0; out.length < Math.min(COUNT, total) && r < 400; r++) {
    L.forEach((l, li) => {
      if (out.length >= COUNT) return;
      const th = fits(l);
      const t = th[(r + li) % th.length], pi = (li * 5 + r * 3 + Math.floor(r / th.length)) % P.length;
      const e = entry(l, pi, t);
      if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
    });
  }
  return out;
}
export const TEMPLATES = build();
export const TOTAL = TEMPLATES.length;
export const LAYOUTS = L.length;
export const PALETTES = P.length;
export const THEMES = T.length;
/** All possible combinations (TEMPLATES lists the first COUNT of them). */
export const COMBINATIONS = L.reduce((n, l) => n + fits(l).length * P.length, 0);

/** { layout, palette, theme, pi } for any id: "<layout>~pNN~<theme>" or a bare layout id (older links). */
export function parse(id) {
  const [lid, pid, tid] = String(id || "").split("~");
  const l = layoutOf(lid);
  if (!l) return null;
  const pi = Math.max(0, Math.min(P.length - 1, (parseInt(String(pid || "p01").slice(1), 10) || 1) - 1));
  const th = fits(l), t = themeOf(tid) && th.some((x) => x[0] === tid) ? themeOf(tid) : themeOf(tid) || th[0];
  return { layout: l, palette: P[pi], theme: t, pi };
}

/** The recorder settings for a template id (or null): sources, bubble, sound, countdown + ring colour, title, talking points. */
export function setupOf(id) {
  const c = parse(id);
  if (!c) return null;
  const [, lname, setup, hint] = c.layout, [pname, , a] = c.palette, [, tname, title, points] = c.theme;
  return { ...setup, ring: a, palette: pname, name: `${tname}: ${lname}`, title, points: [...points], hint };
}

// ---------- Pictures: a finished recording frame in Canva's pattern (branded background, a realistic screen with real
// library photos, the camera bubble with a real presenter photo and its ring colour, bold title, REC chip). thumb = 320 x 200 card (small photos);
// preview = the same picture with full-size photos, shown on the recorder's stage when the template is opened.
const n1 = (v) => Math.round(v * 10) / 10;
const CORNER = { bl: [0.09, 0.82], br: [0.91, 0.82], tl: [0.09, 0.2], tr: [0.91, 0.2] };
const BUBBLE = { S: 20, M: 27, L: 36 };
// What each layout shows on its screen.
const ART = { "code-pair": "code", "code-screencast": "code", "sheet-explainer": "sheet", "sheet-walkthrough": "sheet", "chart-briefing": "chart", "website-review": "web",
  "website-walkthrough": "web", "design-feedback": "design", "route-explainer": "map", "chat-walkthrough": "chat", "dashboard-tour": "dashboard", "video-commentary": "video",
  "doc-review": "doc", "whiteboard-talk": "board", "slides-voiceover": "slides", "slides-talk": "slides", "online-lesson": "slides", "big-presenter": "slides",
  "screen-camera-bubble": "web", "tutorial-corner": "steps", "product-demo": "dashboard", "reaction-video": "video", "corner-cam-small": "web", "screen-only": "steps",
  "bug-report": "bug", "gameplay-clip": "game", "silent-screen": "design", "two-person-chat": "duo", "talk-with-notes": "notes", "introduce-yourself": "intro", "room-tour": "room",
  "radio-show": "radio", "two-mic-podcast": "duomic", "audiobook-reading": "book", "interview-answer": "question" };
// photo topics per theme (library theme names first, see video/scenes.js photoPool)
const TOPIC = { lesson: "education classroom", "product-demo": "tech workspace", "sales-pitch": "meeting office business", "team-update": "meeting workspace office", "support-reply": "workspace meeting office",
  recipe: "food restaurant kitchen", "fitness-class": "fitness sport", "coding-walkthrough": "tech workspace keyboard", "homework-help": "education books", "real-estate-tour": "interior architecture",
  "travel-vlog": "travel mountains", "podcast-episode": "abstract celebration lights", "customer-onboarding": "workspace meeting office", "book-review": "education books library",
  "music-practice": "celebration abstract lights", "game-review": "tech city night", "movie-review": "city night", "job-application": "meeting office", "thank-you": "celebration flowers", "daily-journal": "nature sky" };
const deep = (c, t = 0.55) => mix(c, "#0b1020", t);
// The presenter (a real people photo from the shared library, video/people.js kinds) per content theme; DUO = the two people of
// the two-person chat. Women and men in turn across the templates (cast() with the template id as seed).
const PRESENTER = { lesson: "teacher", "product-demo": "business", "sales-pitch": "business", "team-update": "business", "support-reply": "business", recipe: "chef",
  "fitness-class": "trainer", "coding-walkthrough": "developer", "homework-help": "teacher", "real-estate-tour": "realtor", "travel-vlog": "traveller", "podcast-episode": "host",
  "customer-onboarding": "business", "book-review": "reader", "music-practice": "musician", "game-review": "gamer", "movie-review": "creator", "job-application": "headshot",
  "thank-you": "customer", "daily-journal": "creator" };
const DUO = { "game-review": "gamers", lesson: "tutoring", "homework-help": "tutoring" };
/** A presenter in a round (or rounded) camera bubble: a real people photo cropped around the face (zoomed in a little), ring colour. */
function bubble(k, cx, cy, r, { who, ring, size, square = false, label = "" }) {
  const clip = square ? rect(cx - r, cy - r, r * 2, r * 2, "#000", r * 0.28) : circle(cx, cy, r, "#000"), z = r * 1.25;
  let s = circle(cx, cy + r * 0.06, r * 1.04, "#000000", ' opacity=".25"' + k.blur(r * 0.08)) + k.photo(who, cx - z, cy - z, z * 2, z * 2, { size, clip });
  s += square ? rect(cx - r, cy - r, r * 2, r * 2, "none", r * 0.28, ` stroke="${ring}" stroke-width="${n1(Math.max(2, r * 0.09))}"`) : circle(cx, cy, r, "none", ` stroke="${ring}" stroke-width="${n1(Math.max(2, r * 0.09))}"`);
  if (label) s += k.pill(cx, cy + r * 0.78, label, { size: Math.max(5.5, r * 0.16), fill: "#ffffff", color: "#111827", anchor: "middle" }).svg;
  return s;
}
/** A people photo filling a camera frame (x, y, w, h) with the face at (tx, ty): talking-head layouts. */
const framed = (k, p, x, y, w, h, size, tx = 0.5, ty = 0.42) => { const b = faceBox(p, x, y, w, h, tx, ty); return k.photo(p, b.x, b.y, b.w, b.h, { size, clip: rect(x, y, w, h, "#000") }); };
const T_ = (x, y, str, size, fill, o = "") => `<text x="${n1(x)}" y="${n1(y)}" font-family="${o.includes("mono") ? "'Courier New',monospace" : "Arial,Helvetica,sans-serif"}" font-size="${n1(size)}" font-weight="${o.includes("w4") ? 400 : 800}" fill="${fill}"${o.includes("mid") ? ' text-anchor="middle"' : o.includes("end") ? ' text-anchor="end"' : ""}>${esc(str)}</text>`;
const lines = (x, y, w, n, c, gap = 7, h = 3) => Array.from({ length: n }, (_, i) => rect(x, y + i * gap, w * (i % 3 === 2 ? 0.62 : i % 2 ? 0.86 : 1), h, c, h / 2)).join("");
/** The screen being shared (x, y, w, h), drawn as a real app window with photos and words of the theme. */
function screen(k, kind, x, y, w, h, o) {
  const { a, b, title, points, ph, size, dark } = o, bar = Math.max(9, h * 0.075), card = dark ? "#111827" : "#ffffff", ink = dark ? "#e5e7eb" : "#111827", soft = dark ? "#334155" : "#e5e7eb";
  let s = rect(x, y, w, h, card, 8, k.shadow(5, 14, 0.35)) + `<g${k.clipRect(x, y, w, h, 8)}>` + rect(x, y, w, bar, dark ? "#1f2937" : "#eef0f5") + [0, 1, 2].map((i) => circle(x + bar * (0.65 + i * 0.55), y + bar / 2, bar * 0.16, ["#f87171", "#fbbf24", "#34d399"][i])).join("");
  const X = x, Y = y + bar, W = w, H = h - bar, m = Math.min(W, H), p = (i) => ph[i % ph.length];
  if (kind === "web") {
    s += rect(x + w * 0.28, y + bar * 0.22, w * 0.44, bar * 0.56, card, bar * 0.28) + k.photo(p(0), X, Y, W, H * 0.62, { size }) + rect(X, Y, W, H * 0.62, k.lin([["#0b1020", 0.65], ["#0b1020", 0.05]], 0));
    s += T_(X + W * 0.05, Y + H * 0.12, "Home   About   Shop   Contact", m * 0.045, "#ffffff", "w4") + T_(X + W * 0.05, Y + H * 0.33, title, Math.min(m * 0.12, (W * 0.55) / Math.max(6, title.length * 0.6)), "#ffffff") + rect(X + W * 0.05, Y + H * 0.42, W * 0.18, H * 0.08, a, H * 0.04);
    [0, 1, 2].forEach((i) => { s += k.photo(p(i + 1), X + W * (0.05 + i * 0.31), Y + H * 0.68, W * 0.28, H * 0.26, { size, rx: 4 }); });
  } else if (kind === "slides" || kind === "steps") {
    s += rect(X, Y, W, H, dark ? "#0f172a" : "#f8fafc") + k.photo(p(0), X + W * 0.52, Y, W * 0.48, H, { size }) + rect(X + W * 0.52, Y, W * 0.012, H, a);
    s += T_(X + W * 0.05, Y + H * 0.16, kind === "steps" ? "HOW TO" : "TODAY", m * 0.06, a) + T_(X + W * 0.05, Y + H * 0.33, title, Math.min(m * 0.11, (W * 0.44) / Math.max(5, title.length * 0.58)), ink);
    points.forEach((pt, i) => { s += circle(X + W * 0.065, Y + H * (0.52 + i * 0.15), m * 0.03, kind === "steps" ? a : b) + (kind === "steps" ? T_(X + W * 0.065, Y + H * (0.52 + i * 0.15) + m * 0.022, String(i + 1), m * 0.04, "#ffffff", "mid") : "") + T_(X + W * 0.1, Y + H * (0.52 + i * 0.15) + m * 0.02, pt.length > 26 ? pt.slice(0, 25) + "…" : pt, m * 0.052, ink, "w4"); });
    if (kind === "steps") s += pathEl(`M${n1(X + W * 0.74)} ${n1(Y + H * 0.55)}l${n1(m * 0.09)} ${n1(m * 0.07)}l${n1(-m * 0.04)} ${n1(m * 0.005)}l${n1(m * 0.025)} ${n1(m * 0.05)}l${n1(-m * 0.02)} ${n1(m * 0.01)}l${n1(-m * 0.025)} ${n1(-m * 0.05)}l${n1(-m * 0.03)} ${n1(m * 0.025)}Z`, "#ffffff", ` stroke="#111827" stroke-width="1"`);
  } else if (kind === "code") {
    s += rect(X, Y, W, H, "#0f172a") + rect(X, Y, W * 0.2, H, "#111827");
    ["src", "app.js", "data.js", "test.js"].forEach((f, i) => { s += T_(X + W * 0.03, Y + H * (0.12 + i * 0.1), f, m * 0.045, i === 1 ? "#ffffff" : "#64748b", "w4"); });
    const code = [["const ", a, "total"], ["  = items.", b, "reduce"], ["  ((sum, x) => sum + x.price, 0);", "#94a3b8"], ["", "#94a3b8"], ["function ", a, "checkout"], ["  return save(order);", "#e5e7eb"], ["}", "#e5e7eb"]];
    code.forEach((c, i) => { s += T_(X + W * 0.23, Y + H * (0.13 + i * 0.11), String(i + 1), m * 0.045, "#475569", "w4mono") + `<text x="${n1(X + W * 0.28)}" y="${n1(Y + H * (0.13 + i * 0.11))}" font-family="'Courier New',monospace" font-size="${n1(m * 0.046)}" fill="#e5e7eb">${esc(c[0])}${c[2] ? `<tspan fill="${c[1]}">${esc(c[2])}</tspan>` : ""}</text>`; });
    s += rect(X + W * 0.22, Y + H * 0.36, W * 0.5, H * 0.1, a, 0, ' opacity=".18"');
    // live preview of the page the code builds
    s += rect(X + W * 0.73, Y, W * 0.27, H, "#ffffff") + k.photo(p(0), X + W * 0.75, Y + H * 0.06, W * 0.23, H * 0.5, { size, rx: 3 }) + T_(X + W * 0.75, Y + H * 0.68, "Checkout", m * 0.06, "#111827") + rect(X + W * 0.75, Y + H * 0.75, W * 0.14, H * 0.08, a, H * 0.04) + lines(X + W * 0.75, Y + H * 0.88, W * 0.2, 2, "#e5e7eb", H * 0.05, H * 0.025);
  } else if (kind === "sheet") {
    s += rect(X, Y, W, H, card) + rect(X, Y, W, H * 0.13, a);
    s += T_(X + W * 0.03, Y + H * 0.09, title, m * 0.06, "#ffffff");
    const cols = ["Item", "Jan", "Feb", "Mar"], rows = [["Sales", "1,240", "1,410", "1,690"], ["Costs", "820", "860", "910"], ["Profit", "420", "550", "780"], ["Growth", "8%", "12%", "17%"]];
    cols.forEach((c, j) => { s += T_(X + W * (0.04 + j * 0.24), Y + H * 0.24, c, m * 0.05, ink); });
    rows.forEach((r, i) => { s += rect(X, Y + H * (0.3 + i * 0.12), W, H * 0.12, i % 2 ? (dark ? "#1f2937" : "#f3f4f6") : card); r.forEach((c, j) => { s += T_(X + W * (j ? 0.04 + j * 0.24 : 0.1), Y + H * (0.39 + i * 0.12), c, m * 0.05, j === 3 ? a : ink, "w4"); }); s += k.photo(p(i), X + W * 0.035, Y + H * (0.31 + i * 0.12), H * 0.1, H * 0.1, { size, rx: 2 }); });
    s += rect(X + W * 0.75, Y + H * 0.3, W * 0.24, H * 0.48, "none", 0, ` stroke="${b}" stroke-width="2"`);
  } else if (kind === "chart" || kind === "dashboard") {
    s += rect(X, Y, W, H, dark ? "#0f172a" : "#f8fafc");
    if (kind === "dashboard") { s += rect(X, Y, W * 0.18, H, a) + [0, 1, 2, 3].map((i) => rect(X + W * 0.03, Y + H * (0.14 + i * 0.12), W * 0.12, H * 0.035, "#ffffff", 2, ' opacity=".8"')).join(""); }
    const x0 = X + (kind === "dashboard" ? W * 0.22 : W * 0.05), w0 = X + W - x0 - W * 0.04;
    [["Revenue", "Rs 4.2M", a], ["Orders", "1,284", b], ["Rating", "4.8", "#10b981"]].forEach(([l, v, c], i) => { s += rect(x0 + i * (w0 / 3), Y + H * 0.07, w0 / 3 - W * 0.02, H * 0.25, card, 5, ` stroke="${soft}"`) + T_(x0 + i * (w0 / 3) + W * 0.02, Y + H * 0.15, l, m * 0.04, dark ? "#94a3b8" : "#6b7280", "w4") + T_(x0 + i * (w0 / 3) + W * 0.02, Y + H * 0.27, v, m * 0.075, c); });
    [44, 62, 50, 78, 66, 92].forEach((v, i) => { s += rect(x0 + i * (w0 * 0.55) / 6 + W * 0.01, Y + H * 0.92 - (H * 0.5 * v) / 100, (w0 * 0.55) / 6 - W * 0.02, (H * 0.5 * v) / 100, i % 2 ? b : a, 2); });
    s += k.photo(p(0), x0 + w0 * 0.6, Y + H * 0.4, w0 * 0.4, H * 0.52, { size, rx: 5 }) + T_(x0 + w0 * 0.62, Y + H * 0.88, title, m * 0.045, "#ffffff");
  } else if (kind === "video" || kind === "game") {
    s += k.photo(p(0), X, Y, W, H, { size }) + k.scrim(X, Y + H * 0.55, W, H * 0.45, "#000000", 0, 0.7);
    if (kind === "game") s += rect(X + W * 0.04, Y + H * 0.06, W * 0.3, H * 0.05, "#000000", 3, ' opacity=".5"') + rect(X + W * 0.04, Y + H * 0.06, W * 0.22, H * 0.05, "#22c55e", 3) + T_(X + W * 0.96, Y + H * 0.13, "SCORE 2,480", m * 0.06, b, "end") + T_(X + W * 0.5, Y + H * 0.82, "LEVEL 5", m * 0.1, "#ffffff", "mid");
    else s += k.play(X + W / 2, Y + H * 0.45, m * 0.12, { fill: "#ffffff", color: a }) + rect(X + W * 0.05, Y + H * 0.88, W * 0.9, 3, "#ffffff", 1.5, ' opacity=".4"') + rect(X + W * 0.05, Y + H * 0.88, W * 0.5, 3, a, 1.5) + T_(X + W * 0.05, Y + H * 0.8, title, m * 0.07, "#ffffff");
  } else if (kind === "design") {
    s += rect(X, Y, W, H, dark ? "#1e293b" : "#e5e7eb") + rect(X, Y, W * 0.12, H, dark ? "#0f172a" : "#ffffff");
    [0, 1, 2, 3, 4].forEach((i) => { s += rect(X + W * 0.03, Y + H * (0.08 + i * 0.16), W * 0.06, W * 0.06, i === 1 ? a : soft, 3); });
    s += rect(X + W * 0.2, Y + H * 0.08, W * 0.62, H * 0.84, "#ffffff", 3, k.shadow(2, 6, 0.2)) + k.photo(p(0), X + W * 0.2, Y + H * 0.08, W * 0.62, H * 0.52, { size }) + T_(X + W * 0.24, Y + H * 0.73, title, m * 0.075, "#111827") + rect(X + W * 0.24, Y + H * 0.79, W * 0.2, H * 0.06, a, 3);
    s += rect(X + W * 0.2, Y + H * 0.08, W * 0.62, H * 0.52, "none", 0, ` stroke="${a}" stroke-width="1.6" stroke-dasharray="4 3"`) + rect(X + W * 0.86, Y + H * 0.08, W * 0.11, H * 0.84, dark ? "#0f172a" : "#ffffff");
  } else if (kind === "map") {
    s += rect(X, Y, W, H, dark ? "#14532d" : "#dcfce7") + pathEl(`M${n1(X)} ${n1(Y + H * 0.6)}C${n1(X + W * 0.3)} ${n1(Y + H * 0.4)} ${n1(X + W * 0.5)} ${n1(Y + H * 0.85)} ${n1(X + W)} ${n1(Y + H * 0.5)}`, "none", ` stroke="#ffffff" stroke-width="${n1(m * 0.06)}"`)
      + pathEl(`M${n1(X + W * 0.15)} ${n1(Y + H * 0.85)}C${n1(X + W * 0.35)} ${n1(Y + H * 0.6)} ${n1(X + W * 0.55)} ${n1(Y + H * 0.3)} ${n1(X + W * 0.78)} ${n1(Y + H * 0.22)}`, "none", ` stroke="${a}" stroke-width="${n1(m * 0.03)}" stroke-dasharray="6 4" stroke-linecap="round"`)
      + circle(X + W * 0.15, Y + H * 0.85, m * 0.04, b) + pathEl(`M${n1(X + W * 0.78)} ${n1(Y + H * 0.05)}a${n1(m * 0.08)} ${n1(m * 0.08)} 0 0 1 ${n1(m * 0.08)} ${n1(m * 0.08)}c0 ${n1(m * 0.06)}-${n1(m * 0.08)} ${n1(m * 0.14)}-${n1(m * 0.08)} ${n1(m * 0.14)}s-${n1(m * 0.08)}-${n1(m * 0.08)}-${n1(m * 0.08)}-${n1(m * 0.14)}a${n1(m * 0.08)} ${n1(m * 0.08)} 0 0 1 ${n1(m * 0.08)}-${n1(m * 0.08)}z`, "#ef4444")
      + k.photo(p(0), X + W * 0.04, Y + H * 0.06, W * 0.34, H * 0.36, { size, rx: 5 }) + T_(X + W * 0.06, Y + H * 0.36, title, m * 0.055, "#ffffff");
  } else if (kind === "chat") {
    s += rect(X, Y, W, H, dark ? "#0f172a" : "#f8fafc") + rect(X, Y, W * 0.3, H, dark ? "#111827" : "#ffffff");
    // the conversations list: each customer's round profile photo (people photos, o.chat)
    [0, 1, 2].forEach((i) => { s += k.photo(o.chat?.[i] || p(i), X + W * 0.03, Y + H * (0.08 + i * 0.22), m * 0.14, m * 0.14, { size, clip: circle(X + W * 0.03 + m * 0.07, Y + H * (0.08 + i * 0.22) + m * 0.07, m * 0.07, "#000") }) + rect(X + W * 0.03 + m * 0.18, Y + H * (0.12 + i * 0.22), W * 0.12, H * 0.035, soft, 2); });
    [["Hi! My order has not arrived.", 0], ["Sorry about that. Let me check.", 1], ["It ships today, here is the link.", 1]].forEach(([t, me], i) => { const bw = W * 0.5, bx = me ? X + W * 0.46 : X + W * 0.34; s += rect(bx, Y + H * (0.1 + i * 0.27), bw, H * 0.17, me ? a : dark ? "#1f2937" : "#e5e7eb", H * 0.07) + T_(bx + W * 0.025, Y + H * (0.21 + i * 0.27), t, Math.min(m * 0.05, bw / (t.length * 0.55)), me ? "#ffffff" : ink, "w4"); });
  } else if (kind === "doc") {
    s += rect(X, Y, W, H, dark ? "#1f2937" : "#e5e7eb") + rect(X + W * 0.18, Y + H * 0.05, W * 0.64, H * 1.2, "#ffffff", 2, k.shadow(2, 6, 0.2));
    s += T_(X + W * 0.23, Y + H * 0.18, title, m * 0.075, "#111827") + lines(X + W * 0.23, Y + H * 0.26, W * 0.54, 3, "#cbd5e1", H * 0.06, H * 0.025) + rect(X + W * 0.23, Y + H * 0.43, W * 0.54, H * 0.04, b, 0, ' opacity=".55"') + k.photo(p(0), X + W * 0.23, Y + H * 0.52, W * 0.54, H * 0.32, { size }) + lines(X + W * 0.23, Y + H * 0.88, W * 0.54, 2, "#cbd5e1", H * 0.06, H * 0.025);
  } else if (kind === "board") {
    s += rect(X, Y, W, H, "#ffffff") + rect(X, Y, W, H, k.dots("#94a3b8", m * 0.06, m * 0.006, 0.6));
    [["Ideas", "#fde68a", 0.06, 0.1], ["Goals", "#a7f3d0", 0.36, 0.2], ["Next", "#bfdbfe", 0.66, 0.08]].forEach(([t, c, fx, fy]) => { s += rect(X + W * fx, Y + H * fy, W * 0.26, H * 0.36, c, 3, k.shadow(2, 4, 0.15)) + T_(X + W * (fx + 0.03), Y + H * (fy + 0.12), t, m * 0.07, "#111827") + lines(X + W * (fx + 0.03), Y + H * (fy + 0.18), W * 0.2, 3, "#6b7280", H * 0.05, H * 0.02); });
    s += k.photo(p(0), X + W * 0.62, Y + H * 0.56, W * 0.32, H * 0.38, { size, rx: 4 }) + pathEl(`M${n1(X + W * 0.2)} ${n1(Y + H * 0.5)}C${n1(X + W * 0.3)} ${n1(Y + H * 0.8)} ${n1(X + W * 0.5)} ${n1(Y + H * 0.85)} ${n1(X + W * 0.6)} ${n1(Y + H * 0.7)}`, "none", ` stroke="${a}" stroke-width="2.5" stroke-linecap="round"`);
  } else if (kind === "bug") {
    s += rect(X, Y, W, H, dark ? "#0f172a" : "#f8fafc") + k.photo(p(0), X + W * 0.04, Y + H * 0.08, W * 0.4, H * 0.5, { size, rx: 4 }) + lines(X + W * 0.04, Y + H * 0.66, W * 0.4, 3, soft, H * 0.08, H * 0.035);
    s += rect(X + W * 0.5, Y + H * 0.2, W * 0.46, H * 0.5, card, 6, k.shadow(3, 8, 0.3) + ` stroke="#ef4444" stroke-width="1.5"`) + circle(X + W * 0.57, Y + H * 0.33, m * 0.05, "#ef4444") + T_(X + W * 0.57, Y + H * 0.355, "!", m * 0.07, "#ffffff", "mid") + T_(X + W * 0.62, Y + H * 0.35, "Payment failed", m * 0.06, ink) + T_(X + W * 0.53, Y + H * 0.5, "Error 402 · try again", m * 0.045, dark ? "#94a3b8" : "#6b7280", "w4") + rect(X + W * 0.53, Y + H * 0.56, W * 0.16, H * 0.09, a, H * 0.045);
  }
  return s + `</g>`;
}
function micArt(k, kind, x, y, w, h, o) {
  const { a, b, title, ph, size, cover } = o, m = Math.min(w, h);
  let s = rect(x, y, w, h, "#ffffff", 10, ' fill-opacity=".1" stroke="#ffffff" stroke-opacity=".35"');
  const cw = Math.min(h * 0.86, w * 0.42), cx = x + w * 0.05, cy = y + (h - cw) / 2;
  // the show's cover: the host(s) for podcasts, radio and webinars (o.cover, a people photo), the theme's photo otherwise
  s += rect(cx, cy, cw, cw, "#000000", 8, k.shadow(4, 10, 0.4)) + (cover ? `<g${k.clipRect(cx, cy, cw, cw, 8)}>${framed(k, cover, cx, cy, cw, cw, size, 0.5, 0.36)}</g>` : k.photo(ph[0], cx, cy, cw, cw, { size, rx: 8 })) + rect(cx, cy, cw, cw, k.lin([[a, 0.15], [deep(a, 0.4), 0.85]], 90), 8);
  s += T_(cx + cw * 0.08, cy + cw * 0.2, kind === "book" ? "AUDIOBOOK" : kind === "radio" ? "ON AIR" : "PODCAST", cw * 0.08, b) + T_(cx + cw * 0.08, cy + cw * 0.86, "EP. 12", cw * 0.11, "#ffffff");
  if (cover) s += circle(cx + cw * 0.84, cy + cw * 0.84, cw * 0.12, a) + icon(kind === "radio" ? "music" : "mic", cx + cw * 0.84 - cw * 0.08, cy + cw * 0.84 - cw * 0.08, cw * 0.16, "#ffffff", 2.4); // small badge, the faces stay clear
  else if (kind === "duomic") [0, 1].forEach((i) => { s += icon("mic", cx + cw * (0.22 + i * 0.32), cy + cw * 0.34, cw * 0.26, "#ffffff", 2.4); });
  else s += icon(kind === "book" ? "quote" : kind === "radio" ? "music" : "mic", cx + cw * 0.3, cy + cw * 0.3, cw * 0.4, "#ffffff", 2.4);
  const tx = cx + cw + w * 0.05, tw = x + w - tx - w * 0.04;
  s += T_(tx, y + h * 0.3, title, Math.min(h * 0.13, tw / Math.max(5, title.length * 0.6)), "#ffffff") + k.wave(tx, y + h * 0.44, tw, h * 0.26, "#ffffff", { bars: 34, played: 0.45, playedFill: b }) + rect(tx, y + h * 0.8, tw, 3, "#ffffff", 1.5, ' opacity=".3"') + rect(tx, y + h * 0.8, tw * 0.45, 3, b, 1.5) + T_(tx, y + h * 0.93, "12:48", m * 0.07, "#ffffff", "w4") + T_(tx + tw, y + h * 0.93, "28:10", m * 0.07, "#ffffff", "w4end");
  return s;
}
/** The picture of a template in a 320 x 200 box (size "thumb" or "full"): an SVG string. */
function art(id, size, salt) {
  const c = parse(id) || parse(TEMPLATES[0].id);
  const [lid, lname, st] = c.layout, [, , a, b, dk] = c.palette, [tid, , title, points] = c.theme;
  const k = kit(`${c.layout[0]}~${c.pi}~${tid}`, salt), ph = photoPool(TOPIC[tid] || "workspace office", 4, id), room = photoPool("interior workspace office home", 3, id + "r");
  const kind = ART[lid] || (st.mode === "camera" ? "talk" : st.mode === "audio" ? "mic" : "web"), base = dk ? deep(a, 0.78) : deep(a, 0.55);
  // the people in this picture: the presenter (camera bubble or frame; a woman when the name tag says "Sara"), the two people of a
  // two-person chat, the customers in a chat list, the hosts on a podcast / radio / webinar cover
  const host = PRESENTER[tid] || "business", COVER = { "podcast-audio": "me", "radio-show": "me", "webinar-audio": "me", "two-mic-podcast": "duo" }, spots = [];
  if (st.mode === "both" || (st.mode === "camera" && kind !== "duo") || COVER[lid] === "me") spots.push(["me", kind === "intro" ? host + ":f" : host]);
  if (kind === "duo" || COVER[lid] === "duo") spots.push(["duo", DUO[tid] || "podcast"]);
  if (kind === "chat") spots.push(["c0", "customer"], ["c1", "customer"], ["c2", "customer"]);
  const who = cast(spots, id);
  let s = rect(0, 0, 320, 200, k.lin([base, deep(b, 0.5)], 35)) + circle(300, 10, 90, a, ' opacity=".35"' + k.blur(18)) + circle(20, 200, 70, b, ' opacity=".28"' + k.blur(16)) + rect(250, 150, 60, 44, k.dots("#ffffff", 8, 0.9, 0.3));
  const rec = rect(258, 10, 52, 16, "#0b0d14", 8, ' fill-opacity=".55"') + circle(267, 18, 3.5, "#ef4444") + T_(274, 21.5, "REC 0:12", 7.5, "#ffffff");
  const tsize = Math.min(19, 220 / Math.max(6, title.length * 0.62));
  const head = T_(16, 26, title, tsize, "#ffffff") + T_(16, 37, lname.toUpperCase(), 6.5, mix(b, "#ffffff", 0.4));
  if (st.mode === "audio") return k.svg(320, 200, s + head + micArt(k, kind, 16, 50, 288, 136, { a, b, title: points[0], ph, size, cover: who[COVER[lid]] }) + rec);
  if (st.mode === "camera") {
    const fx = 16, fy = 46, fw = 288, fh = 142;
    // the camera frame: the presenter (or the two people) filling it, cropped around the face; left of the notes / question card
    s += rect(fx, fy, fw, fh, "#000000", 10, k.shadow(5, 14, 0.4)) + `<g${k.clipRect(fx, fy, fw, fh, 10)}>`;
    if (kind === "room") s += k.photo(room[2], fx, fy, fw, fh, { size, opacity: 1 });
    else s += framed(k, who[kind === "duo" ? "duo" : "me"], fx, fy, fw, fh, size, kind === "notes" || kind === "question" ? 0.28 : 0.5, 0.4);
    s += rect(fx, fy, fw, fh, k.lin([["#0b1020", 0.05], ["#0b1020", 0.5]], 90));
    if (kind === "notes") s += rect(fx + fw * 0.56, fy + fh * 0.12, fw * 0.4, fh * 0.76, "#0b1020", 8, ' fill-opacity=".72"') + T_(fx + fw * 0.6, fy + fh * 0.26, "TELEPROMPTER", 6.5, b) + points.map((pt, i) => T_(fx + fw * 0.6, fy + fh * (0.42 + i * 0.16), pt.length > 24 ? pt.slice(0, 23) + "…" : pt, 7.6, i ? "#cbd5e1" : "#ffffff", i ? "w4" : "")).join("");
    if (kind === "question") s += rect(fx + fw * 0.58, fy + fh * 0.18, fw * 0.36, fh * 0.42, "#ffffff", 8, k.shadow(3, 8, 0.3)) + T_(fx + fw * 0.76, fy + fh * 0.36, "Question 1", 8, a, "mid") + T_(fx + fw * 0.76, fy + fh * 0.5, "Tell us about you", 7.5, "#111827", "mid");
    if (kind === "room") s += bubble(k, fx + fw * 0.86, fy + fh * 0.72, 26, { who: who.me, ring: a, size });
    const name = kind === "intro" ? "Hi, I'm Sara · Designer" : points[0];
    s += rect(fx + 12, fy + fh - 34, Math.min(200, 14 + name.length * 4.9), 14, "#ffffff", 3) + T_(fx + 18, fy + fh - 24, name, 8, "#111827") + rect(fx + 12, fy + fh - 19, 80, 10, a, 2) + T_(fx + 16, fy + fh - 11.5, lname, 6.5, onBg(a)) + `</g>`;
    return k.svg(320, 200, s + head + rec);
  }
  const sx = 16, sy = 46, sw = 288, sh = 142;
  s += screen(k, kind, sx, sy, sw, sh, { a, b, title, points, ph, size, dark: !!dk, chat: [who.c0, who.c1, who.c2] });
  if (st.mode === "both") {
    const r = BUBBLE[st.bubbleSize] || BUBBLE.M, [fx, fy] = CORNER[st.bubblePos] || CORNER.bl, cx = sx + sw * fx + (fx < 0.5 ? r * 0.2 : -r * 0.2), cy = sy + sh * fy + (fy < 0.5 ? r * 0.25 : -r * 0.1);
    s += bubble(k, Math.max(r + 4, Math.min(316 - r, cx)), Math.max(r + 4, Math.min(196 - r, cy)), r, { who: who.me, ring: a, size });
  }
  return k.svg(320, 200, s + head + rec);
}
/** Self-contained SVG thumbnail (320 x 200) for a template id (small photo files). */
export function thumb(id) { return art(id, "thumb", "rt"); }
/** The template's picture with full-size photos, filling any box (the recorder shows it on its stage until the camera or screen starts). */
export function preview(id) { return art(id, "full", "rp").replace("preserveAspectRatio=\"xMidYMid meet\"", "preserveAspectRatio=\"xMidYMid slice\""); }
