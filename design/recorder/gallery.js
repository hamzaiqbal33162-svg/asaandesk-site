// Recording layout templates for the online video recorder (pure module: no DOM, no imports).
// Used by the editor's Templates panel and by the intro page.
// GENERATOR: hand-made recording LAYOUTS (what to record, camera bubble size and corner, sound, countdown)
// x own colour PALETTES (thumbnail colours and the camera bubble ring in the recording)
// x content THEMES (purpose with its own title and talking points shown while you record).
// Ids encode the combination: "<layout>~p<NN>~<theme>", e.g. "slides-talk~p07~lesson". A bare layout id
// ("slides-talk") still works (palette p01, the layout's first theme). Thumbnails are small SVG strings made on demand.

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

// ---------- Thumbnails (320 x 200, own drawings)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const CORNER = { bl: [44, 150], br: [276, 150], tl: [44, 52], tr: [276, 52] };
const SIZE = { S: 20, M: 27, L: 36 };
function person(cx, cy, r, fg, ring = "#fff") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fg}"/><circle cx="${cx}" cy="${cy - r * 0.22}" r="${r * 0.32}" fill="#fff" opacity=".95"/>`
    + `<path d="M${cx - r * 0.58} ${cy + r * 0.62}a${r * 0.58} ${r * 0.5} 0 0 1 ${r * 1.16} 0" fill="#fff" opacity=".95"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-width="3"/>`;
}
// What each round-2 layout shows in its thumbnail.
const ART = { "code-pair": "code", "code-screencast": "code", "sheet-explainer": "sheet", "sheet-walkthrough": "sheet", "chart-briefing": "chart", "website-review": "browser",
  "website-walkthrough": "browser", "design-feedback": "design", "route-explainer": "map", "chat-walkthrough": "chat", "dashboard-tour": "dashboard", "video-commentary": "video",
  "doc-review": "doc", "whiteboard-talk": "board", "slides-voiceover": "slides", "two-person-chat": "duo", "talk-with-notes": "notes", "introduce-yourself": "lower", "room-tour": "wide",
  "radio-show": "radio", "two-mic-podcast": "duomic", "audiobook-reading": "book" };
function screenArt(lid, title, a, b, dark) {
  const card = dark ? "#1e293b" : "#ffffff", line = dark ? "#334155" : "#e2e8f0", ink = dark ? "#e2e8f0" : "#1b2133";
  const head = `<text x="40" y="51" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  const kind = ART[lid];
  let inner;
  if (kind === "code") { inner = `<rect x="22" y="22" width="276" height="140" rx="12" fill="#0f172a"/>`; [[40, 120, a], [56, 90, b], [56, 150, "#94a3b8"], [72, 70, a], [56, 110, "#94a3b8"], [40, 60, b], [40, 130, "#94a3b8"]].forEach(([x, w, c], i) => { inner += `<rect x="${x + 30}" y="${44 + i * 15}" width="${w}" height="7" rx="3.5" fill="${c}" opacity=".9"/><text x="34" y="${51 + i * 15}" font-family="monospace" font-size="9" fill="#64748b">${i + 1}</text>`; }); return inner + `<rect x="140" y="168" width="40" height="8" rx="4" fill="#cbd5e1"/>`; }
  if (kind === "sheet") { inner = head; for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) inner += `<rect x="${40 + c * 60}" y="${62 + r * 16}" width="58" height="14" fill="${r === 0 ? a : c === 3 ? b : line}" opacity="${r === 0 ? 0.8 : c === 3 ? 0.35 : 1}"/>`; }
  else if (kind === "chart") { inner = head; [40, 64, 52, 88, 70, 100].forEach((v, i) => { inner += `<rect x="${48 + i * 36}" y="${150 - v}" width="24" height="${v}" rx="4" fill="${i % 2 ? b : a}" opacity=".85"/>`; }); inner += `<path d="M40 150h240" stroke="${line}" stroke-width="3"/>`; }
  else if (kind === "browser") inner = `<rect x="22" y="22" width="276" height="22" rx="10" fill="${line}"/><circle cx="36" cy="33" r="4" fill="#ef4444"/><circle cx="50" cy="33" r="4" fill="#f59e0b"/><circle cx="64" cy="33" r="4" fill="#22c55e"/><rect x="80" y="28" width="150" height="10" rx="5" fill="${card}"/><rect x="40" y="56" width="240" height="44" rx="8" fill="${a}" opacity=".85"/><text x="56" y="83" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#fff">${esc(title)}</text><rect x="40" y="108" width="74" height="40" rx="6" fill="${line}"/><rect x="123" y="108" width="74" height="40" rx="6" fill="${line}"/><rect x="206" y="108" width="74" height="40" rx="6" fill="${line}"/>`;
  else if (kind === "design") inner = `${head}<rect x="40" y="62" width="120" height="86" rx="8" fill="${a}" opacity=".85"/><circle cx="100" cy="100" r="22" fill="#fff" opacity=".9"/><rect x="172" y="62" width="108" height="40" rx="8" fill="${b}" opacity=".7"/><path d="M180 128l40-10 40 14" stroke="${a}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="252" cy="122" r="7" fill="#ef4444"/>`;
  else if (kind === "map") inner = `<rect x="22" y="22" width="276" height="140" rx="12" fill="${dark ? "#14532d" : "#dcfce7"}"/><path d="M22 110 C 90 80, 150 140, 298 90" stroke="#fff" stroke-width="10" fill="none"/><path d="M60 150 C 120 120, 170 70, 250 46" stroke="${a}" stroke-width="5" fill="none" stroke-dasharray="10 7" stroke-linecap="round"/><path d="M250 30a12 12 0 0 1 12 12c0 9-12 22-12 22s-12-13-12-22a12 12 0 0 1 12-12z" fill="#ef4444"/><circle cx="60" cy="150" r="7" fill="${b}"/><text x="40" y="44" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  else if (kind === "chat") inner = `${head}<rect x="40" y="62" width="150" height="24" rx="12" fill="${line}"/><rect x="130" y="92" width="150" height="24" rx="12" fill="${a}" opacity=".85"/><rect x="40" y="122" width="120" height="24" rx="12" fill="${line}"/><circle cx="270" cy="134" r="10" fill="${b}"/>`;
  else if (kind === "dashboard") inner = `<rect x="22" y="22" width="60" height="140" rx="10" fill="${a}" opacity=".85"/>${[0, 1, 2, 3].map((i) => `<rect x="32" y="${40 + i * 22}" width="40" height="8" rx="4" fill="#fff" opacity=".8"/>`).join("")}<rect x="94" y="34" width="90" height="50" rx="8" fill="${line}"/><rect x="194" y="34" width="90" height="50" rx="8" fill="${b}" opacity=".35"/><path d="M100 140 L130 110 L160 124 L196 96 L230 112 L280 92" stroke="${a}" stroke-width="4" fill="none"/><text x="100" y="62" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  else if (kind === "video") inner = `<rect x="34" y="34" width="252" height="118" rx="10" fill="#0f172a"/><circle cx="160" cy="92" r="24" fill="#fff" opacity=".9"/><path d="M152 80v24l20-12z" fill="${a}"/><rect x="46" y="138" width="228" height="5" rx="2.5" fill="#334155"/><rect x="46" y="138" width="120" height="5" rx="2.5" fill="${a}"/>`;
  else if (kind === "doc") { inner = `<rect x="70" y="30" width="180" height="128" rx="6" fill="${card}" stroke="${line}" stroke-width="2"/><text x="86" y="54" font-family="Georgia,serif" font-size="14" font-weight="700" fill="${ink}">${esc(title)}</text>`; for (let i = 0; i < 6; i++) inner += `<rect x="86" y="${66 + i * 13}" width="${i % 3 === 2 ? 100 : 148}" height="6" rx="3" fill="${i === 2 ? b : line}" opacity="${i === 2 ? 0.6 : 1}"/>`; return `<rect x="22" y="22" width="276" height="140" rx="12" fill="${line}" opacity=".5"/>${inner}`; }
  else if (kind === "board") inner = `${head}<rect x="40" y="62" width="60" height="50" rx="4" fill="#fde68a"/><rect x="108" y="74" width="60" height="50" rx="4" fill="#a7f3d0"/><rect x="176" y="62" width="60" height="50" rx="4" fill="#bfdbfe"/><path d="M100 88 C 104 120, 170 130, 206 112" stroke="${a}" stroke-width="3" fill="none"/><path d="M60 140 q 30 -16 60 0 t 60 0" stroke="${b}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  else if (kind === "slides") inner = `${head}<rect x="40" y="62" width="240" height="8" rx="4" fill="${line}"/><rect x="40" y="78" width="200" height="8" rx="4" fill="${line}"/><rect x="40" y="100" width="110" height="48" rx="6" fill="${a}" opacity=".8"/><rect x="160" y="100" width="120" height="48" rx="6" fill="${b}" opacity=".5"/>`;
  else if (lid === "slides-talk" || lid === "online-lesson" || lid === "big-presenter") inner = `${head}<rect x="40" y="66" width="200" height="8" rx="4" fill="${line}"/><rect x="40" y="82" width="180" height="8" rx="4" fill="${line}"/><rect x="40" y="98" width="110" height="8" rx="4" fill="${line}"/><rect x="196" y="98" width="74" height="52" rx="6" fill="${b}" opacity=".85"/><rect x="40" y="118" width="60" height="6" rx="3" fill="${a}"/>`;
  else if (lid === "gameplay-clip") inner = `<path d="M22 162 80 96l40 34 50-58 70 90z" fill="${a}" opacity=".7"/><circle cx="232" cy="64" r="14" fill="${b}"/><rect x="34" y="34" width="70" height="10" rx="5" fill="${b}"/><text x="196" y="44" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  else if (lid === "bug-report") inner = `${head}<rect x="40" y="66" width="150" height="70" rx="6" fill="${line}"/><rect x="200" y="66" width="80" height="30" rx="6" fill="${a}" opacity=".2" stroke="${a}" stroke-width="3"/><path d="M228 116l8 8 16-16" stroke="${a}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  else if (lid === "tutorial-corner" || lid === "screen-only" || lid === "silent-screen") inner = `${head}<rect x="40" y="64" width="64" height="76" rx="6" fill="${line}"/><rect x="114" y="64" width="166" height="10" rx="5" fill="${line}"/><rect x="114" y="82" width="130" height="10" rx="5" fill="${line}"/><path d="M200 112l18 14-8 1 5 10-5 2-5-10-6 5z" fill="${a}"/>`;
  else inner = `${head}<rect x="40" y="64" width="110" height="78" rx="8" fill="${a}" opacity=".18"/><rect x="160" y="64" width="120" height="10" rx="5" fill="${line}"/><rect x="160" y="82" width="100" height="10" rx="5" fill="${line}"/><rect x="160" y="104" width="70" height="22" rx="7" fill="${a}"/>`;
  return `<rect x="22" y="22" width="276" height="140" rx="12" fill="${card}" stroke="${line}" stroke-width="2"/>${inner}<rect x="140" y="168" width="40" height="8" rx="4" fill="${dark ? "#334155" : "#cbd5e1"}"/>`;
}
function micArt(title, a, b, dark, lid = "") {
  const kind = ART[lid], ink = dark ? "#e2e8f0" : "#1b2133";
  if (kind === "radio") return `<rect x="60" y="40" width="200" height="100" rx="18" fill="${a}"/><circle cx="110" cy="90" r="30" fill="${dark ? "#0f172a" : "#fff"}" opacity=".9"/><circle cx="110" cy="90" r="12" fill="${b}"/><rect x="160" y="62" width="80" height="10" rx="5" fill="#fff" opacity=".8"/><rect x="160" y="80" width="60" height="10" rx="5" fill="#fff" opacity=".6"/><path d="M220 40l20-22" stroke="${a}" stroke-width="5" stroke-linecap="round"/><text x="160" y="172" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  if (kind === "duomic") { const mic = (x, c) => `<rect x="${x - 16}" y="30" width="32" height="56" rx="16" fill="${c}"/><path d="M${x - 26} 66a26 26 0 0 0 52 0" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M${x} 92v12" stroke="${c}" stroke-width="5"/>`; return `${mic(110, a)}${mic(210, b)}<path d="M138 50h44M182 40l10 10-10 10" stroke="${ink}" stroke-width="3" fill="none" opacity=".4"/><text x="160" y="140" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${ink}">${esc(title)}</text>`; }
  if (kind === "book") return `<path d="M60 50h90q10 0 10 10v100q0-8-10-8H60z" fill="${a}"/><path d="M260 50h-90q-10 0-10 10v100q0-8 10-8h90z" fill="${b}" opacity=".85"/>${[0, 1, 2, 3].map((i) => `<rect x="72" y="${66 + i * 16}" width="66" height="6" rx="3" fill="#fff" opacity=".8"/><rect x="182" y="${66 + i * 16}" width="66" height="6" rx="3" fill="#fff" opacity=".8"/>`).join("")}<text x="160" y="186" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  let bars = "";
  for (let i = 0; i < 24; i++) { const h = 10 + Math.round(Math.abs(Math.sin(i * 1.7)) * 40); bars += `<rect x="${44 + i * 10}" y="${156 - h / 2}" width="6" height="${h}" rx="3" fill="${i % 3 ? a : b}" opacity=".75"/>`; }
  return `<rect x="140" y="20" width="40" height="66" rx="20" fill="${a}"/><path d="M127 64a33 33 0 0 0 66 0" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/><path d="M160 98v10" stroke="${a}" stroke-width="6" stroke-linecap="round"/>`
    + `<text x="160" y="126" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${dark ? "#e2e8f0" : "#1b2133"}">${esc(title)}</text>${bars}`;
}
function cameraArt(lid, title, a, b, dark) {
  const ink = dark ? "#e2e8f0" : "#1b2133", kind = ART[lid], bar = (y = 150) => `<rect x="60" y="${y}" width="200" height="22" rx="11" fill="${dark ? "#1e293b" : "#fff"}" opacity=".92"/><text x="160" y="${y + 16}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12.5" font-weight="700" fill="${ink}">${esc(title)}</text>`;
  if (kind === "duo") return `<rect x="22" y="22" width="276" height="156" rx="14" fill="${a}" opacity=".16"/>${person(112, 92, 42, a, b)}${person(208, 92, 42, b, a)}<circle cx="276" cy="40" r="7" fill="#ef4444"/>${bar()}`;
  if (kind === "notes") return `<rect x="22" y="22" width="276" height="156" rx="14" fill="${a}" opacity=".16"/>${person(110, 96, 50, a, b)}<rect x="182" y="40" width="104" height="96" rx="10" fill="${dark ? "#1e293b" : "#fff"}"/>${[0, 1, 2, 3].map((i) => `<rect x="194" y="${56 + i * 18}" width="${80 - (i % 2) * 22}" height="7" rx="3.5" fill="${i ? "#cbd5e1" : a}"/>`).join("")}<circle cx="276" cy="30" r="6" fill="#ef4444"/>${bar()}`;
  if (kind === "lower") return `<rect x="22" y="22" width="276" height="156" rx="14" fill="${a}" opacity=".16"/>${person(160, 88, 50, a, b)}<rect x="34" y="132" width="170" height="34" rx="8" fill="${b}"/><text x="46" y="154" font-family="system-ui,sans-serif" font-size="13" font-weight="800" fill="#fff">Hi, I'm …</text><circle cx="276" cy="40" r="7" fill="#ef4444"/>`;
  if (kind === "wide") return `<rect x="22" y="22" width="276" height="156" rx="14" fill="${a}" opacity=".12"/><path d="M22 130h276" stroke="${a}" stroke-width="3" opacity=".5"/><rect x="40" y="70" width="70" height="60" rx="4" fill="${b}" opacity=".35"/><rect x="200" y="56" width="80" height="74" rx="4" fill="${a}" opacity=".3"/><rect x="128" y="88" width="50" height="42" rx="4" fill="${b}" opacity=".5"/>${person(160, 60, 18, a, b)}<circle cx="276" cy="40" r="7" fill="#ef4444"/>${bar()}`;
  const card = lid === "interview-answer" ? `<rect x="196" y="40" width="96" height="44" rx="10" fill="${dark ? "#1e293b" : "#fff"}" stroke="${a}" stroke-width="2"/><text x="244" y="67" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="${a}">?</text>` : "";
  return `<rect x="22" y="22" width="276" height="156" rx="14" fill="${a}" opacity=".16"/>${person(lid === "interview-answer" ? 120 : 160, 96, 52, a, b)}<circle cx="276" cy="40" r="7" fill="#ef4444"/>${card}`
    + `<rect x="60" y="150" width="200" height="22" rx="11" fill="${dark ? "#1e293b" : "#fff"}" opacity=".92"/><text x="160" y="166" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12.5" font-weight="700" fill="${ink}">${esc(title)}</text>`;
}

/** Self-contained SVG thumbnail (320 x 200) for a template id. */
export function thumb(id) {
  const c = parse(id) || parse(TEMPLATES[0].id);
  const [lid, , s] = c.layout, [, bg, a, b, dark] = c.palette, title = c.theme[2];
  let art;
  if (s.mode === "audio") art = micArt(title, a, b, dark, lid);
  else if (s.mode === "camera") art = cameraArt(lid, title, a, b, dark);
  else {
    art = screenArt(lid, title, a, b, dark);
    if (s.mode === "both") { const [x, y] = CORNER[s.bubblePos] || CORNER.bl; art += person(x, y, SIZE[s.bubbleSize] || SIZE.M, b, a); }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${bg}"/>${art}</svg>`;
}
