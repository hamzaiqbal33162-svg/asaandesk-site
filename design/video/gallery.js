// Video templates (pure ES module, no DOM): used by the video editor's Templates panel and by the intro pages.
// Editor templates are real projects: colour scenes (image clips drawn from sceneSvg), text clips and an optional built-in
// music bed. Trimmer and MP4 converter "templates" are ready-made settings. All artwork, colours and text are our own.

/** Scene artwork as an SVG string (also drawn into the image clips of a template). scene = { bg: [c1, c2], art, accent }. */
export function sceneSvg(scene, w = 1920, h = 1080) {
  const [c1, c2] = scene.bg || ["#5b4cf0", "#8b5cf6"], a = scene.accent || "#ffffff", s = Math.min(w, h) / 100;
  const u = (n) => Math.round(n * s * 10) / 10;
  let art = "";
  switch (scene.art) {
    case "circles": art = `<circle cx="${w * 0.12}" cy="${h * 0.2}" r="${u(22)}" fill="${a}" opacity=".18"/><circle cx="${w * 0.88}" cy="${h * 0.82}" r="${u(30)}" fill="${a}" opacity=".14"/><circle cx="${w * 0.8}" cy="${h * 0.18}" r="${u(8)}" fill="none" stroke="${a}" stroke-width="${u(1.4)}" opacity=".5"/>`; break;
    case "stripes": for (let i = -2; i < 9; i++) art += `<rect x="${(i * w) / 7}" y="${-h * 0.2}" width="${w / 18}" height="${h * 1.4}" fill="${a}" opacity=".1" transform="rotate(20 ${w / 2} ${h / 2})"/>`; break;
    case "confetti": { const cols = [a, "#ffd166", "#06d6a0", "#ff6b9a", "#5ec8ff"]; for (let i = 0; i < 26; i++) { const x = ((i * 97) % 100) / 100 * w, y = ((i * 61) % 100) / 100 * h, r = (i * 37) % 360; art += i % 2 ? `<rect x="${x}" y="${y}" width="${u(2.4)}" height="${u(1.2)}" fill="${cols[i % 5]}" transform="rotate(${r} ${x} ${y})" opacity=".85"/>` : `<circle cx="${x}" cy="${y}" r="${u(1)}" fill="${cols[i % 5]}" opacity=".85"/>`; } break; }
    case "waves": art = `<path d="M0 ${h * 0.72} C ${w * 0.25} ${h * 0.6}, ${w * 0.5} ${h * 0.86}, ${w} ${h * 0.7} V ${h} H 0 Z" fill="${a}" opacity=".16"/><path d="M0 ${h * 0.84} C ${w * 0.3} ${h * 0.74}, ${w * 0.6} ${h * 0.96}, ${w} ${h * 0.82} V ${h} H 0 Z" fill="${a}" opacity=".2"/>`; break;
    case "grid": for (let i = 1; i < 12; i++) art += `<path d="M${(i * w) / 12} 0V${h}" stroke="${a}" stroke-width="${u(0.2)}" opacity=".15"/>`; for (let i = 1; i < 8; i++) art += `<path d="M0 ${(i * h) / 8}H${w}" stroke="${a}" stroke-width="${u(0.2)}" opacity=".15"/>`; break;
    case "burst": for (let i = 0; i < 16; i++) art += `<path d="M${w / 2} ${h / 2} L${w / 2 + Math.cos((i * Math.PI) / 8) * w} ${h / 2 + Math.sin((i * Math.PI) / 8) * w} L${w / 2 + Math.cos(((i + 0.45) * Math.PI) / 8) * w} ${h / 2 + Math.sin(((i + 0.45) * Math.PI) / 8) * w}Z" fill="${a}" opacity=".08"/>`; break;
    case "blobs": art = `<ellipse cx="${w * 0.18}" cy="${h * 0.78}" rx="${u(34)}" ry="${u(24)}" fill="${a}" opacity=".15"/><ellipse cx="${w * 0.86}" cy="${h * 0.16}" rx="${u(28)}" ry="${u(18)}" fill="${a}" opacity=".15"/>`; break;
    case "frame": art = `<rect x="${u(5)}" y="${u(5)}" width="${w - u(10)}" height="${h - u(10)}" rx="${u(3)}" fill="none" stroke="${a}" stroke-width="${u(0.8)}" opacity=".6"/>`; break;
    case "spot": art = `<circle cx="${w / 2}" cy="${h / 2}" r="${u(40)}" fill="${a}" opacity=".12"/><circle cx="${w / 2}" cy="${h / 2}" r="${u(26)}" fill="${a}" opacity=".12"/>`; break;
    // ---- round 2: more distinct scene designs
    case "split": art = `<path d="M${w * 0.62} 0H${w}V${h}H${w * 0.38}Z" fill="${a}" opacity=".18"/><path d="M${w * 0.62} 0L${w * 0.38} ${h}" stroke="${a}" stroke-width="${u(0.8)}" opacity=".7"/>`; break;
    case "dots": for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) art += `<circle cx="${((x + 0.5) * w) / 16}" cy="${((y + 0.5) * h) / 9}" r="${u(0.35 + ((x + y) % 5) * 0.18)}" fill="${a}" opacity=".22"/>`; break;
    case "rings": for (let i = 1; i < 7; i++) art += `<circle cx="${w * 0.82}" cy="${h * 0.25}" r="${u(i * 9)}" fill="none" stroke="${a}" stroke-width="${u(0.5)}" opacity="${0.42 - i * 0.05}"/>`; break;
    case "bars": { const cols = [a, "#ffd166", "#06d6a0", "#ff6b9a"]; cols.forEach((c, i) => { art += `<rect x="${u(4) + i * u(5)}" y="0" width="${u(3.2)}" height="${h}" fill="${c}" opacity=".55"/>`; }); break; }
    case "corner": art = `<path d="M0 0H${u(46)}L0 ${u(46)}Z" fill="${a}" opacity=".3"/><path d="M${w} ${h}H${w - u(46)}L${w} ${h - u(46)}Z" fill="${a}" opacity=".3"/><path d="M0 0H${u(30)}L0 ${u(30)}Z" fill="${a}" opacity=".35"/>`; break;
    case "ribbon": art = `<rect x="0" y="${h * 0.36}" width="${w}" height="${h * 0.28}" fill="${a}" opacity=".2"/><rect x="0" y="${h * 0.36}" width="${w}" height="${u(0.8)}" fill="${a}" opacity=".7"/><rect x="0" y="${h * 0.64 - u(0.8)}" width="${w}" height="${u(0.8)}" fill="${a}" opacity=".7"/>`; break;
    case "sun": { art = `<circle cx="${w / 2}" cy="${h * 0.86}" r="${u(26)}" fill="#ffd166" opacity=".85"/>`; for (let i = 0; i < 12; i++) { const an = Math.PI + (i * Math.PI) / 11; art += `<path d="M${w / 2 + Math.cos(an) * u(32)} ${h * 0.86 + Math.sin(an) * u(32)}L${w / 2 + Math.cos(an) * u(46)} ${h * 0.86 + Math.sin(an) * u(46)}" stroke="#ffd166" stroke-width="${u(1.2)}" stroke-linecap="round" opacity=".7"/>`; } break; }
    case "hills": art = `<path d="M0 ${h * 0.8} Q ${w * 0.25} ${h * 0.58} ${w * 0.5} ${h * 0.78} T ${w} ${h * 0.7} V ${h} H 0Z" fill="${a}" opacity=".22"/><path d="M0 ${h * 0.9} Q ${w * 0.3} ${h * 0.72} ${w * 0.62} ${h * 0.9} T ${w} ${h * 0.86} V ${h} H 0Z" fill="${a}" opacity=".3"/>`; break;
    case "bubbles": for (let i = 0; i < 14; i++) art += `<circle cx="${(((i * 53) % 100) / 100) * w}" cy="${(((i * 29 + 11) % 100) / 100) * h}" r="${u(2 + ((i * 7) % 9))}" fill="${a}" opacity="${0.08 + (i % 4) * 0.05}"/>`; break;
    case "zigzag": for (let r = 0; r < 3; r++) { let d = `M0 ${h * (0.15 + r * 0.35)}`; for (let i = 1; i <= 16; i++) d += ` L${(i * w) / 16} ${h * (0.15 + r * 0.35) + (i % 2 ? -u(3) : u(3))}`; art += `<path d="${d}" fill="none" stroke="${a}" stroke-width="${u(0.9)}" opacity=".35"/>`; } break;
    case "film": { art = `<rect width="${w}" height="${u(9)}" fill="#0b0d14" opacity=".7"/><rect y="${h - u(9)}" width="${w}" height="${u(9)}" fill="#0b0d14" opacity=".7"/>`; const n = Math.ceil(w / u(7)); for (let i = 0; i < n; i++) art += `<rect x="${i * u(7) + u(1.5)}" y="${u(2.5)}" width="${u(4)}" height="${u(4)}" rx="${u(0.8)}" fill="#fff" opacity=".8"/><rect x="${i * u(7) + u(1.5)}" y="${h - u(6.5)}" width="${u(4)}" height="${u(4)}" rx="${u(0.8)}" fill="#fff" opacity=".8"/>`; break; }
    case "card": art = `<rect x="${w * 0.12 + u(1)}" y="${h * 0.16 + u(1.4)}" width="${w * 0.76}" height="${h * 0.68}" rx="${u(4)}" fill="#000" opacity=".18"/><rect x="${w * 0.12}" y="${h * 0.16}" width="${w * 0.76}" height="${h * 0.68}" rx="${u(4)}" fill="#ffffff"/><rect x="${w * 0.12}" y="${h * 0.16}" width="${w * 0.76}" height="${u(2.4)}" fill="${c1}"/>`; break;
    case "panelleft": art = `<rect width="${w * 0.58}" height="${h}" fill="#0b0d14" opacity=".38"/><rect x="${w * 0.58}" width="${u(1)}" height="${h}" fill="${a}" opacity=".8"/>`; break;
    case "tiles": { const g = u(1.6); [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => { art += `<rect x="${g + (i * (w - g)) / 2}" y="${g + (j * (h - g)) / 2}" width="${(w - 3 * g) / 2}" height="${(h - 3 * g) / 2}" rx="${u(1.5)}" fill="${a}" opacity="${0.08 + k * 0.05}"/>`; }); break; }
    case "spotlight": art = `<path d="M${w * 0.5 - u(6)} 0 L${w * 0.5 + u(6)} 0 L${w * 0.82} ${h} L${w * 0.18} ${h}Z" fill="${a}" opacity=".14"/><ellipse cx="${w / 2}" cy="${h * 0.92}" rx="${w * 0.34}" ry="${u(6)}" fill="${a}" opacity=".2"/>`; break;
    case "streaks": for (let i = 0; i < 7; i++) art += `<path d="M${w * (-0.2 + i * 0.2)} ${h} L${w * (0.2 + i * 0.2)} 0" stroke="${a}" stroke-width="${u(0.6 + (i % 3) * 0.7)}" opacity="${0.12 + (i % 3) * 0.08}"/>`; break;
    case "stage": art = `<path d="M0 0 H${w * 0.16} Q ${w * 0.1} ${h * 0.5} ${w * 0.16} ${h} H0Z" fill="#7f1d1d" opacity=".75"/><path d="M${w} 0 H${w * 0.84} Q ${w * 0.9} ${h * 0.5} ${w * 0.84} ${h} H${w}Z" fill="#7f1d1d" opacity=".75"/><rect width="${w}" height="${u(6)}" fill="#7f1d1d" opacity=".85"/>`; break;
    case "badge": art = `<circle cx="${w / 2}" cy="${h * 0.46}" r="${u(30)}" fill="${a}" opacity=".16"/><circle cx="${w / 2}" cy="${h * 0.46}" r="${u(25)}" fill="none" stroke="${a}" stroke-width="${u(0.8)}" stroke-dasharray="${u(2)} ${u(1.4)}" opacity=".7"/>`; break;
    case "underline": art = `<rect x="${w * 0.3}" y="${h * 0.56}" width="${w * 0.4}" height="${u(1.6)}" rx="${u(0.8)}" fill="${a}" opacity=".85"/><circle cx="${w * 0.12}" cy="${h * 0.84}" r="${u(5)}" fill="${a}" opacity=".15"/>`; break;
    case "doubleframe": art = `<rect x="${u(4)}" y="${u(4)}" width="${w - u(8)}" height="${h - u(8)}" fill="none" stroke="${a}" stroke-width="${u(0.5)}" opacity=".75"/><rect x="${u(6)}" y="${u(6)}" width="${w - u(12)}" height="${h - u(12)}" fill="none" stroke="${a}" stroke-width="${u(0.25)}" opacity=".75"/>`; break;
    default: break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${art}</svg>`;
}

const S = (bg, art, accent) => ({ bg, art, accent });
const T = (style, text, extra) => ({ style, text, ...(extra || {}) });
// scenes: [{ ...scene, dur, texts: [T] }], music: built-in sound id from SOUNDS (or ""), preset: video size.
const ED = [
  // ---- Videos (social and everyday)
  { id: "reel-promo", name: "Reel promo", tool: "videos", section: "Social videos", tags: ["instagram", "reel", "promo"], preset: "shorts", music: "upbeat",
    scenes: [{ ...S(["#ff6b9a", "#8b5cf6"], "confetti"), dur: 3, texts: [T("title", "New drop"), T("subtitle", "Swipe up to see it")] }, { ...S(["#8b5cf6", "#2f80ff"], "stripes"), dur: 3, texts: [T("title", "Only this week"), T("caption", "Link in bio")] }] },
  { id: "birthday-wish", name: "Birthday wish", tool: "videos", section: "Celebrations", tags: ["birthday", "wish", "party"], preset: "square", music: "happy",
    scenes: [{ ...S(["#ffd166", "#ff7a59"], "confetti"), dur: 3, texts: [T("title", "Happy Birthday!")] }, { ...S(["#ff7a59", "#ff6b9a"], "circles"), dur: 3, texts: [T("subtitle", "Wishing you a wonderful year"), T("caption", "With love from all of us")] }] },
  { id: "product-promo", name: "Product promo", tool: "videos", section: "Business", tags: ["product", "sale", "ad"], preset: "square", music: "upbeat",
    scenes: [{ ...S(["#14b8a6", "#2f80ff"], "spot"), dur: 3, texts: [T("title", "Meet the new bottle"), T("subtitle", "Keeps drinks cold for 24 hours")] }, { ...S(["#1f2937", "#14b8a6"], "grid"), dur: 3, texts: [T("title", "20% off"), T("caption", "Order today, free delivery")] }] },
  { id: "photo-slideshow", name: "Photo slideshow", tool: "videos", section: "Memories", tags: ["slideshow", "photos", "memories"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#2b2d42", "#5b4cf0"], "frame"), dur: 3, texts: [T("title", "Our summer")] }, { ...S(["#5b4cf0", "#14b8a6"], "frame"), dur: 3, texts: [T("caption", "Add your photos from Uploads")] }, { ...S(["#14b8a6", "#ffd166"], "frame"), dur: 3, texts: [T("subtitle", "Best days together")] }] },
  { id: "tutorial-steps", name: "Tutorial in 3 steps", tool: "videos", section: "Teach and explain", tags: ["tutorial", "how to", "steps"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#2f80ff", "#5b4cf0"], "grid"), dur: 3, texts: [T("title", "How to plant a seed")] }, { ...S(["#ffffff", "#e8ecff"], "grid", "#5b4cf0"), dur: 3, texts: [T("lower", "Step 1 · Fill the pot"), T("subtitle", "Use loose soil", { color: "#1b2133" })] }, { ...S(["#ffffff", "#e8ecff"], "grid", "#5b4cf0"), dur: 3, texts: [T("lower", "Step 2 · Water a little"), T("subtitle", "Keep it damp, not wet", { color: "#1b2133" })] }] },
  { id: "announcement", name: "Announcement", tool: "videos", section: "Business", tags: ["news", "announcement", "update"], preset: "youtube", music: "upbeat",
    scenes: [{ ...S(["#1f2937", "#5b4cf0"], "burst"), dur: 3, texts: [T("title", "Big news"), T("subtitle", "We are opening a new shop")] }, { ...S(["#5b4cf0", "#ff7a59"], "circles"), dur: 3, texts: [T("title", "1 December"), T("caption", "Main Market, Block B")] }] },
  { id: "event-invite", name: "Event invitation", tool: "videos", section: "Celebrations", tags: ["invite", "event", "wedding"], preset: "portrait", music: "calm",
    scenes: [{ ...S(["#fdf2e9", "#f5c6a5"], "frame", "#b5651d"), dur: 3, texts: [T("title", "You are invited", { color: "#5a3412" })] }, { ...S(["#f5c6a5", "#e29578"], "blobs"), dur: 3, texts: [T("subtitle", "Saturday, 7 pm · Garden Hall"), T("caption", "Please reply by Friday")] }] },
  { id: "quote-of-the-day", name: "Quote of the day", tool: "videos", section: "Social videos", tags: ["quote", "motivation"], preset: "square", music: "calm",
    scenes: [{ ...S(["#0f172a", "#334155"], "spot"), dur: 4, texts: [T("subtitle", "Small steps every day add up to big results.", { size: 72 }), T("caption", "Quote of the day")] }] },
  { id: "recipe-steps", name: "Quick recipe", tool: "videos", section: "Teach and explain", tags: ["recipe", "food", "cooking"], preset: "shorts", music: "happy",
    scenes: [{ ...S(["#ff7a59", "#ffd166"], "circles"), dur: 3, texts: [T("title", "Mango shake"), T("subtitle", "Ready in 5 minutes")] }, { ...S(["#ffd166", "#06d6a0"], "waves"), dur: 3, texts: [T("lower", "2 mangoes · 1 cup milk"), T("caption", "Blend for 1 minute")] }] },
  { id: "thank-you-customers", name: "Thank you message", tool: "videos", section: "Business", tags: ["thanks", "customers"], preset: "square", music: "calm",
    scenes: [{ ...S(["#06d6a0", "#14b8a6"], "blobs"), dur: 3, texts: [T("title", "Thank you!")] }, { ...S(["#14b8a6", "#2f80ff"], "waves"), dur: 3, texts: [T("subtitle", "1,000 happy customers"), T("caption", "We are grateful for you")] }] },
  // ---- Video editor
  { id: "vlog-opener", name: "Vlog opener", tool: "video-editor", section: "Openers and endings", tags: ["vlog", "intro"], preset: "youtube", music: "upbeat",
    scenes: [{ ...S(["#ff6b9a", "#ffd166"], "burst"), dur: 3, texts: [T("title", "A day in my life"), T("subtitle", "Episode 12")] }] },
  { id: "travel-montage", name: "Travel montage", tool: "video-editor", section: "Stories", tags: ["travel", "trip"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#2f80ff", "#06d6a0"], "waves"), dur: 3, texts: [T("title", "Northern trip")] }, { ...S(["#06d6a0", "#ffd166"], "waves"), dur: 3, texts: [T("lower", "Day 1 · The lake")] }, { ...S(["#ffd166", "#ff7a59"], "waves"), dur: 3, texts: [T("lower", "Day 2 · The hills")] }] },
  { id: "team-update", name: "Team update", tool: "video-editor", section: "Work", tags: ["team", "update", "work"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#1f2937", "#2f80ff"], "grid"), dur: 3, texts: [T("title", "Monthly update")] }, { ...S(["#2f80ff", "#5b4cf0"], "grid"), dur: 3, texts: [T("subtitle", "Sales up 12% this month"), T("lower", "Sara · Sales lead")] }] },
  { id: "property-tour", name: "Property tour", tool: "video-editor", section: "Work", tags: ["real estate", "house", "tour"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#334155", "#14b8a6"], "frame"), dur: 3, texts: [T("title", "3-bed family home")] }, { ...S(["#14b8a6", "#e8ecff"], "frame"), dur: 3, texts: [T("caption", "Garden · Parking · Near school")] }] },
  { id: "fitness-tips", name: "Fitness tips", tool: "video-editor", section: "Stories", tags: ["fitness", "health", "tips"], preset: "shorts", music: "upbeat",
    scenes: [{ ...S(["#06d6a0", "#2f80ff"], "stripes"), dur: 3, texts: [T("title", "3 easy stretches")] }, { ...S(["#2f80ff", "#8b5cf6"], "stripes"), dur: 3, texts: [T("lower", "1 · Neck roll · 30 s")] }] },
  { id: "podcast-clip", name: "Podcast clip", tool: "video-editor", section: "Stories", tags: ["podcast", "audio", "clip"], preset: "square", music: "calm",
    scenes: [{ ...S(["#0f172a", "#8b5cf6"], "spot"), dur: 5, texts: [T("subtitle", "\"Start before you feel ready.\""), T("caption", "The Good Habits Podcast · Ep. 4")] }] },
  { id: "wedding-highlights", name: "Wedding highlights", tool: "video-editor", section: "Openers and endings", tags: ["wedding", "love"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#fdf2e9", "#f8c8dc"], "frame", "#b5651d"), dur: 3, texts: [T("title", "Ali & Hina", { color: "#5a3412" })] }, { ...S(["#f8c8dc", "#e29578"], "circles"), dur: 3, texts: [T("subtitle", "12 · 12 · 2026")] }] },
  { id: "school-project", name: "School project", tool: "video-editor", section: "Teach and explain", tags: ["school", "project", "class"], preset: "youtube", music: "",
    scenes: [{ ...S(["#ffd166", "#06d6a0"], "grid", "#1b2133"), dur: 3, texts: [T("title", "The water cycle", { color: "#1b2133" })] }, { ...S(["#5ec8ff", "#2f80ff"], "waves"), dur: 3, texts: [T("lower", "Evaporation · Clouds · Rain")] }] },
  // ---- YouTube
  { id: "yt-channel-intro", name: "YouTube channel intro", tool: "youtube-video-editor", section: "Intros and outros", tags: ["youtube", "intro", "channel"], preset: "youtube", music: "upbeat",
    scenes: [{ ...S(["#ff3b3b", "#8b5cf6"], "burst"), dur: 3, texts: [T("title", "Cook With Zara"), T("subtitle", "New recipes every Friday")] }] },
  { id: "yt-outro-subscribe", name: "Outro: subscribe", tool: "youtube-video-editor", section: "Intros and outros", tags: ["youtube", "outro", "subscribe"], preset: "youtube", music: "upbeat",
    scenes: [{ ...S(["#1f2937", "#ff3b3b"], "circles"), dur: 4, texts: [T("title", "Thanks for watching"), T("caption", "Subscribe for more")] }] },
  { id: "yt-tutorial", name: "Tutorial with chapters", tool: "youtube-video-editor", section: "Formats", tags: ["youtube", "tutorial", "chapters"], preset: "youtube", music: "calm", chapters: ["Intro", "Step 1", "Step 2"],
    scenes: [{ ...S(["#2f80ff", "#14b8a6"], "grid"), dur: 3, texts: [T("title", "Fix a slow laptop")] }, { ...S(["#e8ecff", "#ffffff"], "grid", "#2f80ff"), dur: 3, texts: [T("lower", "Step 1 · Clean startup apps")] }, { ...S(["#e8ecff", "#ffffff"], "grid", "#2f80ff"), dur: 3, texts: [T("lower", "Step 2 · Free up space")] }] },
  { id: "yt-review", name: "Product review", tool: "youtube-video-editor", section: "Formats", tags: ["youtube", "review"], preset: "youtube", music: "upbeat",
    scenes: [{ ...S(["#0f172a", "#14b8a6"], "spot"), dur: 3, texts: [T("title", "Honest review"), T("subtitle", "Budget headphones")] }, { ...S(["#14b8a6", "#06d6a0"], "stripes"), dur: 3, texts: [T("title", "8 / 10"), T("caption", "Great sound, weak case")] }] },
  { id: "yt-vlog", name: "Weekly vlog", tool: "youtube-video-editor", section: "Formats", tags: ["youtube", "vlog"], preset: "youtube", music: "happy",
    scenes: [{ ...S(["#ffd166", "#ff6b9a"], "blobs"), dur: 3, texts: [T("title", "Weekly vlog #8")] }, { ...S(["#ff6b9a", "#8b5cf6"], "blobs"), dur: 3, texts: [T("caption", "Moving day!")] }] },
  { id: "yt-shorts-hook", name: "Shorts hook", tool: "youtube-video-editor", section: "Shorts", tags: ["youtube", "shorts", "hook"], preset: "shorts", music: "upbeat",
    scenes: [{ ...S(["#ff3b3b", "#ffd166"], "burst"), dur: 2, texts: [T("title", "Wait for it…")] }, { ...S(["#8b5cf6", "#2f80ff"], "confetti"), dur: 3, texts: [T("title", "It worked!"), T("caption", "Follow for part 2")] }] },
  { id: "yt-news", name: "News update", tool: "youtube-video-editor", section: "Formats", tags: ["youtube", "news"], preset: "youtube", music: "calm",
    scenes: [{ ...S(["#0f172a", "#2f80ff"], "grid"), dur: 3, texts: [T("title", "This week in tech"), T("lower", "Episode 21 · 3 stories")] }] },
  { id: "yt-top5", name: "Top 5 countdown", tool: "youtube-video-editor", section: "Formats", tags: ["youtube", "list", "countdown"], preset: "youtube", music: "upbeat",
    scenes: [{ ...S(["#5b4cf0", "#ff6b9a"], "burst"), dur: 3, texts: [T("title", "Top 5 study apps")] }, { ...S(["#ff6b9a", "#ffd166"], "stripes"), dur: 3, texts: [T("title", "#5"), T("subtitle", "Flash cards")] }, { ...S(["#ffd166", "#06d6a0"], "stripes"), dur: 3, texts: [T("title", "#4"), T("subtitle", "Focus timer")] }] },
].map((t) => ({ layout: "made-" + t.id, layoutName: t.name, ...t })); // each hand-made one is its own design

// ---------- generator: own scene LAYOUTS × colour PALETTES × content THEMES (ids like "v.promo~p03~bakery") ----------
export const PALETTES = [
  { bg: ["#5b4cf0", "#8b5cf6"] }, { bg: ["#2f80ff", "#14b8a6"] }, { bg: ["#ff7a59", "#ff6b9a"] }, { bg: ["#ffd166", "#ff7a59"], ink: "#3b1d0a" },
  { bg: ["#0f172a", "#334155"] }, { bg: ["#06d6a0", "#5ec8ff"], ink: "#0b2a33" }, { bg: ["#ff3b3b", "#8b5cf6"] }, { bg: ["#1f2937", "#14b8a6"] },
  { bg: ["#fdf2e9", "#f5c6a5"], accent: "#b5651d", ink: "#5a3412" }, { bg: ["#e8ecff", "#ffffff"], accent: "#2f80ff", ink: "#1b2133" },
  { bg: ["#134e4a", "#0f766e"] }, { bg: ["#7c2d12", "#ea580c"] }, { bg: ["#4c1d95", "#db2777"] }, { bg: ["#064e3b", "#65a30d"] },
];
const th = (k, label, brand, title, sub, offer, cta, quote, person, steps, items, date, place, hook, reveal, before, after, stat) => ({ k, label, brand, title, sub, offer, cta, quote, person, steps, items, date, place, hook, reveal, before, after, stat });
export const THEMES = [
  th("bakery", "Bakery", "Sweet Crumb Bakery", "Fresh bread every morning", "Baked before sunrise", "Buy 2 cakes, get 1 free", "Order on our page", "The best croissant in town!", "Hira · Regular customer", ["Mix the dough", "Let it rise", "Bake 25 minutes"], ["Croissants", "Banana bread", "Chocolate cake"], "Every Sunday", "Garden Road", "Watch this dough grow", "Golden and crispy!", "Raw dough", "Fresh loaf", "500 loaves a day"),
  th("gym", "Gym", "Iron Pulse Gym", "Get stronger in 30 days", "Classes for every level", "First month 50% off", "Book a free trial", "I lost 8 kg and gained confidence.", "Usman · Member", ["Warm up 5 minutes", "Squats 3 × 12", "Stretch and breathe"], ["Strength", "Cardio", "Yoga"], "Mon to Sat, 6 am", "Block C, Main Street", "One move for strong legs", "Do it daily!", "Week 1", "Week 12", "1,200 members"),
  th("school", "School", "Bright Future School", "Admissions open", "Classes 1 to 10", "Free first-term books", "Visit our campus", "My child loves going to school.", "Mrs. Naz · Parent", ["Pick up the form", "Meet the teacher", "Join the class"], ["Science lab", "Library", "Sports day"], "Admissions till 30 March", "University Road", "Our science fair in 30 seconds", "The volcano erupted!", "First day", "Graduation", "98% pass rate"),
  th("clinic", "Clinic", "CarePlus Clinic", "Your health first", "Doctors on call day and night", "Free blood pressure check", "Book an appointment", "Kind doctors and no long waits.", "Mr. Rauf · Patient", ["Book online", "Meet your doctor", "Get your report"], ["Family care", "Lab tests", "Child health"], "Open every day", "Clinic Road, Sector 4", "3 signs you need more water", "Drink 8 glasses a day", "Long queues", "Online booking", "10,000 patients helped"),
  th("homes", "Real estate", "Skyline Homes", "Your new home awaits", "3-bed family houses", "Book now, pay in 3 years", "Call for a visit", "We found our dream home in a week.", "The Ahmed family", ["Choose a plan", "Visit the site", "Get the keys"], ["Garden", "Parking", "Near schools"], "Open house this Saturday", "Lake View Phase 2", "Inside a family house", "Look at this kitchen!", "Empty plot", "Finished home", "250 families moved in"),
  th("food", "Restaurant", "Spice Route Kitchen", "Taste the tradition", "Family recipes since 1998", "Lunch deal for 2", "Reserve a table", "The biryani was perfect!", "Ali · Food blogger", ["Marinate overnight", "Slow cook 2 hours", "Serve with raita"], ["Biryani", "Karahi", "Fresh naan"], "Open till midnight", "Food Street", "Our secret spice mix", "Smell that aroma!", "Raw spices", "Signature dish", "4.8 star rating"),
  th("travel", "Travel", "Wander Trails", "Northern adventure", "5 days in the mountains", "Group discount 15%", "Book your seat", "The best trip of my life.", "Sana · Traveller", ["Pack light", "Meet the group", "Start the trek"], ["Lakes", "Glaciers", "Campfires"], "Departs 15 June", "Hunza Valley", "Sunrise at 4,000 metres", "Worth every step!", "City life", "Mountain air", "60 trips this year"),
  th("tech", "Tech startup", "Nimbus Apps", "Work smarter", "One app for your whole team", "Free for 3 months", "Try it today", "We saved 10 hours a week.", "Fatima · Team lead", ["Create a workspace", "Invite your team", "Track progress"], ["Tasks", "Chat", "Reports"], "Launching 1 December", "Online", "This shortcut saves hours", "Done in one click!", "Messy spreadsheets", "One clear board", "50,000 users"),
  th("fashion", "Fashion", "Threadline Studio", "New winter collection", "Warm, soft, made locally", "Up to 40% off", "Shop the look", "Fits perfectly and feels great.", "Ayesha · Customer", ["Pick a colour", "Choose your size", "Free delivery"], ["Shawls", "Jackets", "Sweaters"], "This weekend only", "Mall Road store", "3 ways to wear one shawl", "Which one is yours?", "Plain outfit", "Styled look", "2,000 orders this month"),
  th("wedding", "Wedding", "Ali & Hina", "We are getting married", "Join us to celebrate", "Dinner and dance", "Please reply by 1 December", "Two hearts, one journey.", "With love, our families", ["Mehndi night", "Wedding day", "Reception"], ["Music", "Dinner", "Photos"], "12 December 2026", "Garden Marquee", "How we met", "She said yes!", "First meeting", "Wedding day", "300 guests"),
  th("birthday", "Birthday", "Zara turns 7", "Happy Birthday!", "Let's party", "Cake, games and gifts", "See you there", "Wishing you a wonderful year!", "Love, Mama and Baba", ["Balloons up", "Cake time", "Games and gifts"], ["Cake", "Balloons", "Games"], "Saturday, 4 pm", "Our home", "Guess the cake flavour", "Chocolate!", "Age 6", "Age 7", "7 candles"),
  th("charity", "Charity", "Helping Hands", "Feed a family this winter", "Every gift counts", "Rs 2,000 feeds a family for a week", "Donate today", "Your help reached our village.", "Volunteer team", ["Collect food", "Pack boxes", "Deliver to homes"], ["Food", "Blankets", "Books"], "All of December", "Community Centre", "One box, one family", "1,000 boxes delivered!", "Empty shelves", "Full boxes", "1,000 families fed"),
  th("cooking", "Cooking channel", "Cook With Zara", "15-minute dinners", "Easy recipes for busy days", "New recipe every Friday", "Subscribe for more", "My family loved it!", "Comment of the week", ["Chop the onions", "Fry the spices", "Simmer 10 minutes"], ["Daal", "Pasta", "Stir fry"], "New videos on Fridays", "From my kitchen", "The trick for fluffy rice", "Perfect every time!", "Plain rice", "Fluffy rice", "100 recipes"),
  th("gaming", "Gaming", "Pixel Arena", "Season 5 is live", "New maps and skins", "Double points this week", "Join the stream", "Best match of the season!", "Kami · Streamer", ["Pick your hero", "Join a squad", "Win the round"], ["New map", "New skins", "Ranked mode"], "Live tonight, 9 pm", "Online", "Watch this last-second win", "Victory!", "Bronze rank", "Gold rank", "Top 100 player"),
  th("salon", "Beauty salon", "Glow Beauty Salon", "Look your best", "Hair, skin and nails", "Bridal package 20% off", "Book your slot", "I felt like a star.", "Mehwish · Client", ["Cleanse", "Treat", "Style"], ["Haircut", "Facial", "Manicure"], "Open daily, 10 am", "Gulberg", "A 5-minute glow routine", "Ready to shine!", "Before", "After", "5,000 happy clients"),
  th("auto", "Car service", "QuickFix Auto", "Car service in 1 hour", "Oil, brakes and tyres", "Free car wash with service", "Book a service", "Fast, honest and fair.", "Bilal · Driver", ["Drop your car", "We check 30 points", "Drive away happy"], ["Oil change", "Brakes", "Tyres"], "Mon to Sat", "Ring Road", "Check your tyres in 10 seconds", "Now you know!", "Worn tyre", "New tyre", "20 years of service"),
  th("books", "Book club", "Chapter Club", "Book of the month", "Read with friends", "First meet is free", "Join the club", "I read 12 books this year!", "Noor · Member", ["Pick a book", "Read a chapter a day", "Talk it over"], ["Fiction", "History", "Poetry"], "Last Sunday of the month", "City Library", "A book in 30 seconds", "Read it this week!", "No time to read", "A chapter a day", "40 members"),
  th("cafe", "Coffee shop", "Bean There Cafe", "Your morning starts here", "Fresh roasted every day", "Second cup half price", "Visit us today", "Best latte in the city.", "Omar · Regular", ["Grind the beans", "Brew slowly", "Add a heart"], ["Latte", "Cold brew", "Cinnamon roll"], "Open 7 am", "Corner of 5th Street", "Latte art in 10 seconds", "A perfect heart!", "Beans", "Latte", "300 cups a day"),
  th("band", "Music band", "The Night Owls", "Live in concert", "One night only", "Early bird tickets", "Get your ticket", "What a night!", "Fan review", ["Sound check", "Doors open", "Show time"], ["New songs", "Old hits", "Encore"], "Friday, 8 pm", "Open Air Theatre", "First notes of the new song", "Out now!", "Rehearsal", "On stage", "10,000 streams"),
  th("photo", "Photography", "Frame & Light", "Capture your story", "Weddings, portraits and events", "Free album with every shoot", "Book a shoot", "Every photo was magic.", "Rabia · Bride", ["Plan the shoot", "Shoot the day", "Get your album"], ["Weddings", "Portraits", "Products"], "Booking for 2027", "Studio 9", "One light, three looks", "Which is your favourite?", "Raw shot", "Edited shot", "500 shoots"),
];
// Each layout: name, section, music, art per scene, scenes(theme) -> [[seconds, [[style, text, extra?], …]], …]
const LAYOUT_DEFS = {
  intro: ["Intro", "Intros", "upbeat", ["burst"], (t) => [[3, [["title", t.brand], ["subtitle", t.sub]]]]],
  outro: ["Outro", "Outros", "happy", ["circles"], (t) => [[4, [["title", "Thanks for watching"], ["caption", t.cta]]]]],
  promo: ["Promo", "Promos", "upbeat", ["spot", "stripes"], (t) => [[3, [["title", t.title], ["subtitle", t.sub]]], [3, [["title", t.offer, { size: 96 }], ["caption", t.cta]]]]],
  sale: ["Sale", "Sales and offers", "upbeat", ["stripes", "burst", "stripes"], (t) => [[2.5, [["title", "SALE", { size: 160 }]]], [3, [["title", t.offer, { size: 90 }], ["subtitle", t.items.join(" · ")]]], [2.5, [["title", t.cta], ["caption", t.date]]]]],
  invite: ["Invitation", "Invitations", "calm", ["frame", "blobs"], (t) => [[3, [["subtitle", "You are invited", { size: 56 }], ["title", t.title]]], [3.5, [["subtitle", `${t.date} · ${t.place}`], ["caption", t.cta]]]]],
  quote: ["Quote", "Quotes and reviews", "calm", ["spot"], (t) => [[5, [["subtitle", `“${t.quote}”`, { size: 72 }], ["caption", t.person]]]]],
  slideshow: ["Slideshow", "Slideshows", "calm", ["frame", "frame", "frame"], (t) => [[3, [["title", t.title]]], [3, [["caption", t.items[0]]]], [3, [["caption", t.items[1]]]]]],
  steps: ["Tutorial", "Tutorials", "calm", ["grid", "grid", "grid", "grid"], (t) => [[3, [["title", t.title], ["subtitle", "In 3 easy steps"]]], ...t.steps.map((x, i) => [3, [["lower", `Step ${i + 1} · ${x}`]]])]],
  countdown: ["Top 3", "Countdowns", "upbeat", ["burst", "stripes", "stripes", "confetti"], (t) => [[3, [["title", `Top 3: ${t.label}`]]], [2.5, [["title", "#3"], ["subtitle", t.items[2]]]], [2.5, [["title", "#2"], ["subtitle", t.items[1]]]], [3, [["title", "#1"], ["subtitle", t.items[0]]]]]],
  story: ["Story", "Stories", "calm", ["waves", "waves", "waves"], (t) => [[3, [["title", t.title]]], [3, [["subtitle", t.sub]]], [3, [["title", t.reveal], ["caption", t.brand]]]]],
  interview: ["Interview", "Interviews", "calm", ["spot", "blobs"], (t) => [[3, [["title", t.title], ["subtitle", "A short interview"]]], [4, [["subtitle", `“${t.quote}”`], ["lower", t.person]]]]],
  news: ["News update", "News and updates", "calm", ["grid", "grid"], (t) => [[3, [["title", t.title], ["lower", t.brand]]], [3, [["subtitle", t.date], ["caption", t.place]]]]],
  review: ["Review", "Quotes and reviews", "calm", ["spot", "blobs"], (t) => [[2.5, [["subtitle", "What people say"]]], [4, [["subtitle", `“${t.quote}”`], ["lower", t.person]]]]],
  recap: ["Highlights", "Event recaps", "upbeat", ["confetti", "confetti", "confetti"], (t) => [[2.5, [["title", "Highlights"], ["subtitle", t.brand]]], [3, [["title", t.stat, { size: 100 }]]], [3, [["subtitle", t.items.join(" · ")], ["caption", t.cta]]]]],
  tips: ["3 tips", "Tips", "calm", ["blobs", "blobs", "blobs", "blobs"], (t) => [[2.5, [["title", `3 tips from ${t.brand}`, { size: 90 }]]], ...t.steps.map((x, i) => [2.5, [["title", `${i + 1}`, { size: 140, y: 0.38 }], ["subtitle", x]]])]],
  beforeafter: ["Before and after", "Before and after", "happy", ["plain", "confetti"], (t) => [[3, [["caption", "Before"], ["title", t.before]]], [3, [["caption", "After"], ["title", t.after]]]]],
  hook: ["Hook", "Hooks for short videos", "upbeat", ["burst", "confetti"], (t) => [[2, [["title", t.hook, { size: 96 }]]], [3, [["title", t.reveal], ["caption", t.cta]]]]],
  announce: ["Announcement", "Announcements", "upbeat", ["burst", "circles"], (t) => [[3, [["subtitle", "Big news", { size: 56, bold: true }], ["title", t.title]]], [3, [["title", t.date, { size: 90 }], ["caption", t.place]]]]],
  menu: ["Menu", "Lists and menus", "happy", ["frame", "frame"], (t) => [[3, [["title", t.brand]]], [4, [["subtitle", t.items.join("  ·  ")], ["caption", t.offer]]]]],
  milestone: ["Milestone", "Milestones", "happy", ["confetti"], (t) => [[4, [["title", t.stat, { size: 110 }], ["subtitle", `Thank you · ${t.brand}`]]]]],
  // ---- round 2: 26 more distinct designs (own scene art + own text arrangement each)
  splitintro: ["Split intro", "Intros", "upbeat", ["split"], (t) => [[3, [["title", t.brand, { x: 0.36, y: 0.42, align: "left", size: 92 }], ["subtitle", t.sub, { x: 0.36, y: 0.58, align: "left", size: 50 }]]]]],
  ribbon: ["Title ribbon", "Intros", "upbeat", ["ribbon", "ribbon"], (t) => [[3, [["title", t.title, { size: 92 }]]], [2.5, [["subtitle", t.cta, { size: 60, bold: true }]]]]],
  filmreel: ["Film reel", "Stories", "calm", ["film", "film", "film"], (t) => [[3, [["title", t.title]]], [3, [["subtitle", t.items[0], { size: 70 }]]], [3, [["subtitle", t.items[1], { size: 70 }], ["caption", t.brand]]]]],
  sunrise: ["Sunrise", "Stories", "calm", ["sun", "hills"], (t) => [[3, [["title", t.title, { y: 0.3 }]]], [3, [["subtitle", t.sub, { y: 0.3 }], ["caption", t.date]]]]],
  card: ["Message card", "Invitations", "calm", ["card", "card"], (t) => [[3.5, [["title", t.title, { color: "#1b2133", size: 84 }], ["subtitle", t.sub, { color: "#4a4f66", size: 48 }]]], [3, [["subtitle", `${t.date} · ${t.place}`, { color: "#1b2133", size: 52 }], ["subtitle", t.cta, { color: "#5b4cf0", size: 44, y: 0.66 }]]]]],
  panel: ["Side panel", "Business", "calm", ["panelleft", "panelleft"], (t) => [[3, [["title", t.title, { x: 0.3, y: 0.44, align: "left", size: 70 }], ["subtitle", t.brand, { x: 0.3, y: 0.6, align: "left", size: 40 }]]], [3, [["subtitle", t.items.join(" · "), { x: 0.3, align: "left", size: 46 }], ["caption", t.cta, { x: 0.3 }]]]]],
  badge: ["Big number", "Milestones", "happy", ["badge"], (t) => [[4, [["title", t.stat, { size: 86 }], ["caption", t.brand]]]]],
  tiles: ["Photo tiles", "Slideshows", "calm", ["tiles", "tiles", "tiles"], (t) => [[3, [["title", t.title]]], [3, [["lower", t.items[0]]]], [3, [["lower", t.items[2]], ["caption", t.cta]]]]],
  spotlight: ["Spotlight", "Promos", "upbeat", ["spotlight", "spotlight"], (t) => [[3, [["subtitle", "Introducing", { y: 0.3, size: 46 }], ["title", t.title]]], [3, [["title", t.offer, { size: 82 }], ["caption", t.cta]]]]],
  streaks: ["Light streaks", "Promos", "upbeat", ["streaks", "burst"], (t) => [[2.5, [["title", t.hook, { size: 88 }]]], [3, [["title", t.brand], ["subtitle", t.sub]]]]],
  stage: ["On stage", "Event recaps", "upbeat", ["stage", "confetti"], (t) => [[3, [["subtitle", "Live on stage", { y: 0.3, size: 50 }], ["title", t.title]]], [3, [["title", t.date, { size: 84 }], ["caption", t.place]]]]],
  dotsquote: ["Dotted quote", "Quotes and reviews", "calm", ["dots"], (t) => [[5, [["subtitle", `“${t.quote}”`, { size: 66 }], ["lower", t.person, { y: 0.78 }]]]]],
  rings: ["Save the date", "Announcements", "upbeat", ["rings", "rings"], (t) => [[3, [["title", "Save the date", { size: 84 }], ["subtitle", t.brand]]], [3, [["title", t.date, { size: 86 }], ["subtitle", t.place]]]]],
  bars: ["Colour bars", "News and updates", "calm", ["bars", "bars"], (t) => [[3, [["title", t.title, { x: 0.58 }], ["lower", t.brand, { x: 0.58, y: 0.72 }]]], [3, [["subtitle", t.items.join(" · "), { x: 0.58 }]]]]],
  corners: ["Corner sale", "Sales and offers", "upbeat", ["corner", "corner"], (t) => [[2.5, [["title", t.offer, { size: 90 }]]], [3, [["subtitle", t.cta, { size: 62, bold: true }], ["caption", t.date]]]]],
  bubbles: ["Bubbles", "Celebrations", "happy", ["bubbles", "bubbles"], (t) => [[3, [["title", t.title]]], [3, [["subtitle", t.sub], ["caption", t.cta]]]]],
  zigzag: ["Zigzag hook", "Hooks for short videos", "upbeat", ["zigzag", "zigzag"], (t) => [[2, [["title", t.hook, { size: 86 }]]], [3, [["title", t.reveal], ["caption", t.brand]]]]],
  underline: ["Underlined steps", "Tutorials", "calm", ["underline", "underline", "underline"], (t) => [[3, [["title", t.title]]], [3, [["subtitle", `1. ${t.steps[0]}`, { size: 64 }]]], [3, [["subtitle", `2. ${t.steps[1]}`, { size: 64 }]]]]],
  doubleframe: ["Elegant frame", "Invitations", "calm", ["doubleframe", "doubleframe"], (t) => [[3.5, [["subtitle", "With joy we invite you", { size: 44, y: 0.34 }], ["title", t.title, { family: "serif" }]]], [3, [["subtitle", t.date, { family: "serif", size: 60 }], ["caption", t.place]]]]],
  checklist: ["Checklist", "Tips", "calm", ["grid", "grid"], (t) => [[3, [["title", `${t.label} checklist`]]], [4, [["lower", `✔ ${t.items[0]}`, { y: 0.34 }], ["lower", `✔ ${t.items[1]}`, { y: 0.5 }], ["lower", `✔ ${t.items[2]}`, { y: 0.66 }]]]]],
  versus: ["This or that", "Polls", "happy", ["split", "split"], (t) => [[2.5, [["title", "This or that?"]]], [3.5, [["subtitle", t.items[0], { x: 0.27, size: 60, bold: true }], ["subtitle", t.items[1], { x: 0.73, size: 60, bold: true }], ["caption", "Vote in the comments"]]]]],
  timeline: ["Our story", "Stories", "calm", ["dots", "dots", "dots"], (t) => [[3, [["title", "Our story"], ["subtitle", t.brand]]], [3, [["lower", `Then · ${t.before}`]]], [3, [["lower", `Now · ${t.after}`], ["caption", t.stat]]]]],
  faq: ["Question and answer", "Tips", "calm", ["ribbon", "card"], (t) => [[3, [["subtitle", "Quick question", { size: 44, y: 0.3 }], ["title", `${t.hook}?`, { size: 76 }]]], [3.5, [["subtitle", t.reveal, { color: "#1b2133", size: 60 }], ["subtitle", t.brand, { color: "#4a4f66", size: 40, y: 0.66 }]]]]],
  count321: ["Countdown 3-2-1", "Countdowns", "upbeat", ["badge", "badge", "badge", "burst"], (t) => [[1, [["title", "3", { size: 200 }]]], [1, [["title", "2", { size: 200 }]]], [1, [["title", "1", { size: 200 }]]], [3, [["title", t.reveal], ["subtitle", t.brand]]]]],
  thanks: ["Thank-you card", "Outros", "happy", ["card", "bubbles"], (t) => [[3, [["title", "Thank you", { color: "#1b2133" }], ["subtitle", t.brand, { color: "#4a4f66" }]]], [3, [["subtitle", t.cta], ["caption", t.place]]]]],
  features3: ["Three features", "Promos", "upbeat", ["tiles", "tiles", "tiles", "spotlight"], (t) => [[2.5, [["title", t.items[0]]]], [2.5, [["title", t.items[1]]]], [2.5, [["title", t.items[2]]]], [3, [["title", t.brand], ["caption", t.cta]]]]],
};
export const LAYOUTS = Object.keys(LAYOUT_DEFS).length;
const PALETTE_NAMES = ["Violet", "Ocean", "Sunset", "Honey", "Midnight", "Mint", "Berry", "Slate teal", "Paper", "Cloud", "Deep teal", "Ember", "Orchid", "Moss"];
const FONTS = [["sans", "Clean sans", "Arial, Helvetica, sans-serif"], ["serif", "Classic serif", "Georgia, 'Times New Roman', serif"], ["calibri", "Soft sans", "Calibri, Carlito, Arial, sans-serif"], ["cambria", "Book serif", "Cambria, Caladea, Georgia, serif"], ["mono", "Typewriter", "'Courier New', monospace"]];
const MOTIONS = [["pop", "Pop"], ["fade", "Fade"], ["slide-up", "Slide up"], ["slide-left", "Slide in"], ["typewriter", "Typewriter"]];
const ALL_L = Object.keys(LAYOUT_DEFS);
const SOCIAL = new Set(["promo", "sale", "invite", "quote", "slideshow", "story", "review", "recap", "hook", "beforeafter", "announce", "menu", "milestone", "tips",
  "ribbon", "card", "badge", "tiles", "spotlight", "streaks", "dotsquote", "rings", "corners", "bubbles", "zigzag", "checklist", "versus", "count321", "thanks", "features3"]);
const SHORT = new Set(["hook", "zigzag", "versus", "count321"]); // made for phones: 9:16 even in the YouTube list (Shorts)
// Every list uses every layout, in an order that puts its own kind first (layouts change fastest, so the first
// LAYOUTS templates of every list are all different designs).
const order = (first) => [...first, ...ALL_L.filter((k) => !first.includes(k))];
// Canva shows about 20,105 video templates and 20,000 YouTube ones; ours are generated in the same numbers (paged, never all at once).
const TOOLS = {
  v: { tool: "videos", total: 20105, layouts: order([...SOCIAL]), preset: (L, i) => (SHORT.has(L) ? "shorts" : ["square", "shorts", "portrait", "square", "shorts"][i % 5]) },
  e: { tool: "video-editor", total: 20105, layouts: ALL_L, preset: (L, i) => (SHORT.has(L) ? "shorts" : SOCIAL.has(L) ? ["youtube", "square", "shorts", "youtube"][i % 4] : "youtube") },
  y: { tool: "youtube-video-editor", total: 20000, layouts: order(["intro", "outro", "steps", "countdown", "news", "review", "tips", "hook", "interview", "recap", "beforeafter", "quote", "milestone", "splitintro", "underline", "count321", "faq", "filmreel"]), preset: (L) => (SHORT.has(L) ? "shorts" : "youtube") },
};
const PREFIX = { videos: "v", "video-editor": "e", "youtube-video-editor": "y" };
const pad2 = (n) => String(n).padStart(2, "0");
/** i-th generated template of a tool (mixed order: layouts change fastest, themes/palettes/fonts/motions shift with them). */
function genAt(prefix, i) {
  const T0 = TOOLS[prefix], nL = T0.layouts.length, nT = THEMES.length, nP = PALETTES.length, nF = FONTS.length, nM = MOTIONS.length;
  const r0 = i % nL, r1 = Math.floor(i / nL) % nT, r2 = Math.floor(i / (nL * nT)) % nP, r3 = Math.floor(i / (nL * nT * nP)) % nF, r4 = Math.floor(i / (nL * nT * nP * nF)) % nM;
  const L = T0.layouts[r0], t = (r1 + 7 * r0) % nT, pl = (r2 + 3 * r1 + 5 * r0) % nP, f = (r3 + r2 + r1) % nF, m = (r4 + r3 + 2 * r2 + r0) % nM;
  return `${prefix}.${L}~p${pad2(pl + 1)}~${THEMES[t].k}~f${f + 1}~m${m + 1}`;
}
const ID_RE = /^([vey])\.([a-z0-9]+)~p(\d\d)~([a-z]+)(?:~f(\d))?(?:~m(\d))?$/;
function parse(id) {
  const x = ID_RE.exec(id || ""); if (!x) return null;
  const T0 = TOOLS[x[1]], d = LAYOUT_DEFS[x[2]], pal = PALETTES[+x[3] - 1], t = THEMES.find((y) => y.k === x[4]), f = FONTS[(+x[5] || 1) - 1], m = MOTIONS[(+x[6] || 1) - 1];
  if (!T0 || !d || !pal || !t || !f || !m || !T0.layouts.includes(x[2])) return null;
  return { prefix: x[1], T0, L: x[2], d, pi: +x[3] - 1, pal, t, f, m };
}
/** Light card data for a template id: { id, name, tool, section, tags, theme, layout }. */
export function meta(id) {
  const hand = HAND.get(id); if (hand) return hand;
  const c = parse(id); if (!c) return null;
  return { id, name: `${c.t.label} ${c.d[0].toLowerCase()} · ${PALETTE_NAMES[c.pi]}`, tool: c.T0.tool, section: c.d[1], theme: c.t.k, themeName: c.t.label, layout: c.L, layoutName: c.d[0],
    tags: [c.L, c.d[0], c.t.k, c.t.label, PALETTE_NAMES[c.pi], c.f[1], c.m[1]] };
}
export const templateMeta = meta;
/** Full template (scenes, words, music, size, font, motion) built from a generated id, or null. */
function genSpec(id) {
  const c = parse(id); if (!c) return null;
  const { T0, L, d, pal, t, f, m } = c, idx = T0.layouts.indexOf(L);
  const preset = T0.preset(L, idx + c.pi);
  const music = t.k === "wedding" ? "calm" : t.k === "birthday" ? "happy" : d[2];
  const scenes = d[4](t).map(([dur, texts], i) => ({ bg: i % 2 ? [pal.bg[1], pal.bg[0]] : pal.bg, art: d[3][i] || d[3][0], accent: pal.accent, dur,
    texts: texts.map(([style, text, extra]) => ({ style, text, ...(style === "title" || style === "subtitle" ? { family: f[0], animIn: style === "title" ? m[0] : m[0] === "typewriter" ? "fade" : m[0] } : {}),
      ...(pal.ink && style !== "lower" && style !== "caption" ? { color: pal.ink } : {}), ...(extra || {}) })) }));
  return { ...meta(id), preset, music, font: f[0], scenes, ...(L === "steps" && c.prefix === "y" ? { chapters: ["Intro", ...t.steps] } : {}) };
}
const TRIM = [
  { id: "trim-first-15", name: "Reel length (first 15 s)", trim: { kind: "first", n: 15 }, tags: ["reel", "instagram"] },
  { id: "trim-first-30", name: "Status length (first 30 s)", trim: { kind: "first", n: 30 }, tags: ["status", "whatsapp"] },
  { id: "trim-first-60", name: "Shorts length (first 60 s)", trim: { kind: "first", n: 60 }, tags: ["shorts", "youtube"] },
  { id: "trim-drop-intro", name: "Remove the first 5 s", trim: { kind: "dropStart", n: 5 }, tags: ["intro", "start"] },
  { id: "trim-drop-ending", name: "Remove the last 10 s", trim: { kind: "dropEnd", n: 10 }, tags: ["end", "outro"] },
  { id: "trim-cut-middle", name: "Cut out the middle", trim: { kind: "cutMiddle" }, tags: ["middle", "cut"] },
  { id: "trim-teaser-10", name: "10 s teaser from the middle", trim: { kind: "middle", n: 10 }, tags: ["teaser", "preview"] },
  { id: "trim-loop-6", name: "6 s loop as WebM", trim: { kind: "first", n: 6, format: "webm" }, tags: ["loop", "gif", "webm"] },
].map((t) => ({ ...t, tool: "video-trimmer", section: "Popular cuts" }));
const CONV = [
  { id: "mp4-whatsapp", name: "WhatsApp share", conv: { quality: "small", height: 720 }, tags: ["whatsapp", "small"] },
  { id: "mp4-email", name: "Email attachment", conv: { quality: "small", height: 480 }, tags: ["email", "tiny"] },
  { id: "mp4-youtube", name: "YouTube upload", conv: { quality: "high", height: 1080 }, tags: ["youtube", "hd"] },
  { id: "mp4-instagram", name: "Instagram post", conv: { quality: "balanced", height: 1080 }, tags: ["instagram", "social"] },
  { id: "mp4-same", name: "Best quality, same size", conv: { quality: "high", height: 0 }, tags: ["archive", "best"] },
  { id: "mp4-website", name: "Website video", conv: { quality: "balanced", height: 720 }, tags: ["web", "site"] },
  { id: "mp4-old-phone", name: "Old phone friendly", conv: { quality: "balanced", height: 480 }, tags: ["phone", "small"] },
  { id: "mp4-slides", name: "Presentation clip", conv: { quality: "balanced", height: 1080 }, tags: ["slides", "presentation"] },
].map((t) => ({ ...t, tool: "convert-videos-to-mp4", section: "Popular settings" }));
// Trimmer: ready-made cuts (kind × length) × format; converter: purpose × quality × size.
const TRIM_SPECS = [
  ...[5, 6, 10, 15, 20, 30, 45, 60, 90, 120].map((n) => ["first", n, "Keep the start", `First ${n} s`]),
  ...[2, 3, 5, 10, 15].map((n) => ["dropStart", n, "Remove the start", `Remove the first ${n} s`]),
  ...[3, 5, 10, 15, 20].map((n) => ["dropEnd", n, "Remove the end", `Remove the last ${n} s`]),
  ...[5, 10, 15, 30].map((n) => ["middle", n, "Teasers from the middle", `${n} s from the middle`]),
  ["cutMiddle", 0, "Cut out a part", "Cut out the middle third"],
  ...[[5, 10], [10, 15], [15, 15], [30, 30], [60, 30]].map(([f, n]) => ["window", n, "Keep a part", `${n} s from ${f} s`, f]),
];
const TRIM_GEN = [];
for (const fmt of ["mp4", "webm"]) for (const [i, [kind, n, section, label, from]] of TRIM_SPECS.entries()) TRIM_GEN.push({ id: `trim.${kind}-${n}${from != null ? "-" + from : ""}~${fmt}`, name: `${label} (${fmt.toUpperCase()})`, tool: "video-trimmer", section, tags: [kind, fmt, String(n)], trim: { kind, n, from, format: fmt }, ord: i * 2 + (fmt === "webm") });
TRIM_GEN.sort((a, b) => a.ord - b.ord);
TRIM_GEN.length = 16; // 8 popular + 16 = 24 starters (Canva has no trimmer templates)
const PURPOSES = [["whatsapp", "WhatsApp"], ["email", "Email"], ["youtube", "YouTube"], ["instagram", "Instagram"], ["website", "Website"], ["slides", "Presentation"], ["phone", "Old phone"], ["archive", "Archive"], ["tv", "TV"], ["class", "Class upload"], ["support", "Support ticket"], ["tablet", "Tablet"]];
const QN = { high: "High quality", balanced: "Balanced", small: "Small file" };
const CONV_GEN = [];
{ const combos = []; for (const q of ["small", "balanced", "high"]) for (const h of [720, 480, 1080, 0]) combos.push([q, h]);
  const seen = new Set();
  for (let i = 0; CONV_GEN.length < 16 && i < 2000; i++) {
    const [k, label] = PURPOSES[i % PURPOSES.length], [q, h] = combos[(i * 5 + Math.floor(i / PURPOSES.length)) % combos.length], id = `mp4.${q}-${h}~${k}`;
    if (seen.has(id)) continue; seen.add(id);
    CONV_GEN.push({ id, name: `${label} · ${QN[q]} · ${h ? h + "p" : "same size"}`, tool: "convert-videos-to-mp4", section: `For ${label}`, tags: [k, label, q, String(h)], conv: { quality: q, height: h } });
  } }

const STARTERS = 40; // generated templates listed in TEMPLATES per tool (the rest come through page())
const genFirst = (prefix, n) => Array.from({ length: n }, (_, i) => meta(genAt(prefix, i)));
const HAND = new Map([...ED, ...TRIM, ...TRIM_GEN, ...CONV, ...CONV_GEN].map((t) => [t.id, t]));
/** Starter list (hand-made + the first generated ones per tool). The full lists come from page(). */
export const TEMPLATES = [...ED, ...genFirst("v", STARTERS), ...genFirst("e", STARTERS), ...genFirst("y", STARTERS), ...TRIM, ...TRIM_GEN, ...CONV, ...CONV_GEN];
const handFor = (tool) => [...HAND.values()].filter((t) => t.tool === tool);
export const TOTALS = Object.fromEntries([...Object.values(TOOLS).map((T0) => [T0.tool, T0.total]), ["video-trimmer", handFor("video-trimmer").length], ["convert-videos-to-mp4", handFor("convert-videos-to-mp4").length]]);
export const TOTAL = Object.values(TOTALS).reduce((a, b) => a + b, 0);
/** Filter chips for one tool's Templates panel (layouts of that tool + themes). Generated templates carry layout/theme. */
export function filtersFor(tool) {
  const T0 = TOOLS[PREFIX[tool]]; if (!T0) return [];
  return [{ key: "layout", label: "Layout", options: T0.layouts.map((k) => ({ value: k, label: LAYOUT_DEFS[k][0] })) },
    { key: "theme", label: "Theme", options: THEMES.map((t) => ({ value: t.k, label: t.label })) }];
}
/** Distinct base layouts (designs) behind one tool's list: generated layouts + the hand-made designs of that tool. */
export function layoutsFor(tool) {
  const pre = PREFIX[tool], hand = handFor(tool).filter((t) => t.scenes).length;
  return pre ? TOOLS[pre].layouts.length + hand : handFor(tool).length;
}
/** Gallery object for one tool (what the editor frame's Templates panel gets): its own TOTAL and chips. */
export const galleryFor = (tool) => ({ TEMPLATES: TEMPLATES.filter((t) => t.tool === tool), TOTAL: TOTALS[tool] || 0, FILTERS: filtersFor(tool), page, thumb, meta, templateMeta: meta });
/** Paged list for the editor's Templates panel: hand-made first, then generated; q matches every word in name/tags. */
export function page(tool, { q = "", offset = 0, limit = 40, filters = {} } = {}) {
  const tools = [].concat(tool || "video-editor"), words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  const fl = Object.entries(filters || {}).filter(([, v]) => v != null && v !== "");
  const lists = tools.map((tl) => { const pre = PREFIX[tl], hand = handFor(tl); return { hand, pre, n: hand.length + (pre ? TOOLS[pre].total - hand.length : 0) }; });
  const at = (li, i) => { const l = lists[li]; return i < l.hand.length ? l.hand[i] : meta(genAt(l.pre, i - l.hand.length)); };
  const hit = (x) => (!words.length || words.every((w) => [x.name, x.section, x.tool, ...(x.tags || [])].join(" ").toLowerCase().includes(w))) && fl.every(([k, v]) => x[k] === v);
  if (!words.length && !fl.length) {
    const total = lists.reduce((a, l) => a + l.n, 0), items = [];
    for (let k = offset; k < Math.min(total, offset + limit); k++) { let i = k, li = 0; while (i >= lists[li].n) { i -= lists[li].n; li++; } items.push(at(li, i)); }
    return { items, total };
  }
  const items = []; let total = 0;
  lists.forEach((l, li) => { for (let i = 0; i < l.n; i++) { const x = at(li, i); if (hit(x)) { if (total >= offset && items.length < limit) items.push(x); total++; } } });
  return { items, total };
}
export const byId = (id) => { const t = HAND.get(id); if (t) return t; return genSpec(id); };
const SIZES = { youtube: [1920, 1080], shorts: [1080, 1920], square: [1080, 1080], portrait: [1080, 1350] };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** 320x200 SVG card: the first scene in the video's shape with its words, or a timeline / file picture for the tools. */
export function thumb(id) {
  const t = byId(id);
  const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">';
  if (!t) return open + '<rect width="320" height="200" fill="#eef0f8"/></svg>';
  if (t.scenes) {
    const [W, H] = SIZES[t.preset] || SIZES.youtube, k = Math.min(296 / W, 176 / H), w = W * k, h = H * k, x = (320 - w) / 2, y = (200 - h) / 2;
    const sc = t.scenes[0], inner = sceneSvg(sc, Math.round(w), Math.round(h)).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/id="g"/, `id="g-${t.id}"`).replace(/url\(#g\)/, `url(#g-${t.id})`);
    const ORDER = { title: 0, subtitle: 1, lower: 2, caption: 3 };
    let below = 0, prevX = null;
    const words =[...(sc.texts || [])].sort((a, b) => (ORDER[a.style] ?? 4) - (ORDER[b.style] ?? 4)).slice(0, 2).map((x0, i) => {
      const c = x0.color || (x0.style === "lower" ? "#1b2133" : "#fff"), ff = { serif: "Georgia,serif", cambria: "Cambria,Georgia,serif", mono: "Courier New,monospace", calibri: "Calibri,Arial,sans-serif" }[x0.family] || "Arial,sans-serif";
      let fs = Math.max(8, Math.min(i ? 11 : 20, h * (i ? 0.075 : 0.13))), lines;
      const room = x0.x != null && x0.style !== "lower" ? 2 * Math.min(x0.x, 1 - x0.x) * w * 0.92 : w * 0.86; // a text placed off-centre has less room
      for (;;) { const max = Math.max(4, Math.floor(room / (fs * (x0.family === "mono" ? 0.62 : 0.6)))); lines = []; for (const wd of String(x0.text).split(/\s+/)) { const l = lines[lines.length - 1]; if (l != null && (l + " " + wd).length <= max) lines[lines.length - 1] = l + " " + wd; else lines.push(wd); } if ((lines.length <= (i ? 2 : 3) && Math.max(...lines.map((l) => l.length)) <= max) || fs <= 7) break; fs -= 1; }
      // place like the video does: x / y are the centre of the text block, align inside it
      const cx = (x0.x ?? 0.5) * w, side = i && Math.abs((x0.x ?? 0.5) - (prevX ?? 0.5)) > 0.2, half = ((lines.length - 1) * fs * 1.15) / 2;
      const ty = x0.y != null && (!i || side) ? x0.y * h - half : i ? Math.max(h * (x0.y ?? 0.7), below + fs * 1.3) : h * 0.46 - half;
      below = Math.max(below, ty + (lines.length - 1) * fs * 1.15); prevX = x0.x ?? 0.5;
      const bw = Math.min(w * 0.9, Math.max(...lines.map((l) => l.length)) * fs * 0.58);
      const anchor = x0.align === "left" ? "start" : x0.align === "right" ? "end" : "middle", ax = anchor === "start" ? cx - bw / 2 : anchor === "end" ? cx + bw / 2 : cx;
      const tsp = lines.map((l, k) => `<tspan x="${x0.style === "lower" ? w * 0.12 : ax}" dy="${k ? fs * 1.15 : 0}">${esc(l)}</tspan>`).join("");
      return x0.style === "lower" ? `<rect x="${w * 0.08}" y="${ty - fs}" width="${w * 0.84}" height="${fs * 1.15 * lines.length + fs * 0.5}" rx="3" fill="#ffffffe6"/><text y="${ty}" font-family="${ff}" font-size="${fs}" font-weight="700" fill="#1b2133">${tsp}</text>` : `<text y="${ty}" text-anchor="${anchor}" font-family="${ff}" font-size="${fs}" font-weight="${i ? 400 : 700}" fill="${c}">${tsp}</text>`;
    }).join("");
    const play = `<circle cx="${w - 16}" cy="${h - 16}" r="10" fill="#0008"/><path d="M${w - 19} ${h - 21}v10l8-5z" fill="#fff"/>`;
    return `${open}<rect width="320" height="200" fill="#eef0f8"/><g transform="translate(${x} ${y})"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}${words}${play}</svg></g>${t.scenes.length > 1 ? `<text x="312" y="194" text-anchor="end" font-family="Arial,sans-serif" font-size="11" fill="#5b6075">${t.scenes.length} scenes</text>` : ""}</svg>`;
  }
  if (t.trim) {
    const k = t.trim.kind, keep = k === "first" ? [0, 0.35] : k === "dropStart" ? [0.18, 1] : k === "dropEnd" ? [0, 0.8] : k === "middle" ? [0.38, 0.62] : [0.33, 0.66];
    const cut = k === "cutMiddle";
    let frames = ""; for (let i = 0; i < 8; i++) frames += `<rect x="${24 + i * 34.5}" y="96" width="32" height="44" rx="3" fill="hsl(${200 + i * 14} 70% ${58 + (i % 2) * 8}%)"/>`;
    const x0 = 24 + keep[0] * 274, x1 = 24 + keep[1] * 274;
    const sel = cut ? `<rect x="${x0}" y="90" width="${x1 - x0}" height="56" fill="#ff3b3b55" stroke="#ff3b3b" stroke-width="3" rx="4"/><path d="M${x0 + 6} 96l${x1 - x0 - 12} 44M${x1 - 6} 96l${-(x1 - x0 - 12)} 44" stroke="#ff3b3b" stroke-width="3"/>` : `<rect x="${x0}" y="90" width="${x1 - x0}" height="56" fill="none" stroke="#ffd166" stroke-width="4" rx="4"/>`;
    return `${open}<rect width="320" height="200" rx="0" fill="#1b2133"/><text x="24" y="50" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#fff">${esc(t.name.split(" (")[0])}</text><text x="24" y="72" font-family="Arial,sans-serif" font-size="12" fill="#b9c0d8">${esc((t.name.match(/\((.*)\)/) || [, t.trim.format === "webm" ? "WebM loop" : "Trim preset"])[1])}</text>${frames}<rect x="24" y="96" width="${Math.max(0, x0 - 24)}" height="44" fill="#1b2133aa"/><rect x="${x1}" y="96" width="${Math.max(0, 298 - x1)}" height="44" fill="#1b2133aa"/>${sel}<path d="M24 168h274" stroke="#3b4260" stroke-width="4" stroke-linecap="round"/><path d="M${x0} 168H${x1}" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/></svg>`;
  }
  const c = t.conv, hTxt = c.height ? c.height + "p" : "Same size", q = { high: "High quality", balanced: "Balanced", small: "Small file" }[c.quality];
  return `${open}<rect width="320" height="200" fill="#f3f1ff"/><rect x="28" y="44" width="96" height="112" rx="10" fill="#fff" stroke="#c9c3f7" stroke-width="2"/><text x="76" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#8a84b3">MOV</text><path d="M138 100h40m-12-12 12 12-12 12" fill="none" stroke="#5b4cf0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="194" y="44" width="96" height="112" rx="10" fill="#5b4cf0"/><text x="242" y="104" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#fff">MP4</text><text x="242" y="126" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#dcd8ff">${esc(hTxt)}</text><text x="160" y="186" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#4a4f66">${esc(t.name.includes(q) ? t.name : `${t.name} · ${q}`)}</text></svg>`;
}
