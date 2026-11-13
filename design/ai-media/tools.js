// AI media generators: tool definitions, options, validation and the requests sent to AsaanDesk AI
// (pure, no DOM; unit tested in tests/ai-media.test.mjs). Results only ever come from the AI service:
// nothing here makes up media.

const opt = (value, label, extra = {}) => ({ value, label, ...extra });
export const VOICE_STYLES = [opt("warm-female", "Warm (female)"), opt("calm-male", "Calm (male)"), opt("bright-female", "Bright (female)"),
  opt("deep-male", "Deep (male)"), opt("storyteller", "Storyteller"), opt("news", "News reader")];
export const VOICE_LANGS = [opt("en", "English"), opt("ur", "Urdu"), opt("hi", "Hindi"), opt("ar", "Arabic"), opt("pa", "Punjabi"),
  opt("es", "Spanish"), opt("fr", "French")];
export const VOICE_SPEEDS = [opt(0.8, "Slow"), opt(1, "Normal"), opt(1.15, "Quick"), opt(1.3, "Fast")];
export const OFFLINE_LINKS = [
  { href: "/design/video/", label: "Video editor", note: "cut, join, add text and music, export WebM or MP4" },
  { href: "/design/recorder/", label: "Screen & camera recorder", note: "record your screen, camera and voice" },
  { href: "/design/voice/", label: "Text to speech voiceover", note: "listen with browser voices, record your own voice" },
  { href: "/design/video/?mode=convert", label: "Convert to MP4", note: "turn any video into MP4" },
];

export const TOOLS = {
  video: {
    id: "video", tab: "Video", title: "AI video generator", path: "/ai/video", feature: "AI video", kind: "video",
    lead: "Describe a short scene and AsaanDesk AI makes it into a video clip.",
    field: "prompt", fieldLabel: "Describe your video", placeholder: "e.g. Slow drone shot over green tea hills at sunrise, soft mist, warm light",
    min: 8, max: 600,
    options: {
      style: { label: "Style", choices: [opt("cinematic", "Cinematic"), opt("realistic", "Realistic"), opt("animation", "3D animation"), opt("illustration", "Illustrated"), opt("product", "Product shot")] },
      aspect: { label: "Shape", choices: [opt("16:9", "16:9 YouTube"), opt("9:16", "9:16 Shorts / Reels"), opt("1:1", "1:1 Square")] },
      duration: { label: "Length", choices: [opt(4, "4 s"), opt(6, "6 s"), opt(8, "8 s"), opt(10, "10 s")], min: 4, max: 10 },
      sound: { label: "Sound", choices: [opt("on", "With sound"), opt("off", "No sound")] },
    },
    defaults: { style: "cinematic", aspect: "16:9", duration: 6, sound: "on" },
    helpers: ["slow motion", "drone shot", "close-up", "time-lapse", "golden hour light", "pastel tones", "soft morning mist", "handheld camera"],
    extras: [{ key: "reference", type: "image", label: "Reference picture (optional)", hint: "A photo or drawing that shows the look you want. It stays on your device; it would only be sent with your prompt once AsaanDesk AI is switched on." }],
    rules: [
      { title: "Prompt tips", text: "Say what is in the shot, how the camera moves and what the light is like. One scene per prompt works best. English prompts work best." },
      { title: "Safety", text: "Don't ask for real people's faces or voices without their permission, for violence, adult content or hate, or for logos and characters you don't own. Such prompts will be refused." },
      { title: "Today", text: "AsaanDesk AI is not switched on yet, so nothing is generated and nothing you type is sent anywhere." },
    ],
    soon: {
      title: "AI video generator is coming soon",
      what: "Type a short description and AsaanDesk AI will make an original 4 to 10 second video clip in the style and shape you pick (16:9, 9:16 or 1:1), ready to preview and download as MP4.",
      offline: "Working today, free and on your device: the video editor, the screen and camera recorder, the text to speech voiceover and Convert to MP4.",
    },
    examples: [
      { title: "Tea garden sunrise", prompt: "Slow drone shot rising over green tea hills at sunrise, soft mist in the valleys, warm golden light.", style: "cinematic", aspect: "16:9", duration: 8 },
      { title: "Product turntable", prompt: "A matte black water bottle turning slowly on a clean white table, soft studio light and gentle reflections.", style: "product", aspect: "1:1", duration: 6 },
      { title: "Night market food stall", prompt: "Close-up of fresh parathas on a hot tawa at a night market stall, steam rising, warm string lights behind.", style: "realistic", aspect: "9:16", duration: 6 },
      { title: "Paper-cut city", prompt: "Paper-cut style city skyline where tiny buses and rickshaws move along layered streets, pastel colours.", style: "animation", aspect: "16:9", duration: 10 },
      { title: "Rainy window loop", prompt: "Rain drops sliding down a window with blurred city lights behind, calm and cosy, seamless loop.", style: "realistic", aspect: "9:16", duration: 8 },
      { title: "Simple logo reveal", prompt: "Glowing lines draw a simple circle logo on a dark blue background, then everything fades to white.", style: "illustration", aspect: "16:9", duration: 4 },
    ],
  },
  music: {
    id: "music", tab: "Music", title: "AI music generator", path: "/ai/music", feature: "AI music", kind: "audio",
    lead: "Describe a mood and AsaanDesk AI composes an original track for your videos.",
    field: "prompt", fieldLabel: "Describe your music", placeholder: "e.g. Relaxed lo-fi beat with soft piano and vinyl crackle for studying",
    min: 8, max: 400,
    options: {
      genre: { label: "Genre", choices: [opt("lofi", "Lo-fi"), opt("pop", "Pop"), opt("cinematic", "Cinematic"), opt("acoustic", "Acoustic"), opt("electronic", "Electronic"), opt("ambient", "Ambient"), opt("hiphop", "Hip-hop"), opt("fusion", "Desi fusion")] },
      mood: { label: "Mood", choices: [opt("happy", "Happy"), opt("calm", "Calm"), opt("energetic", "Energetic"), opt("inspiring", "Inspiring"), opt("sad", "Sad"), opt("dramatic", "Dramatic")] },
      tempo: { label: "Tempo", choices: [opt("slow", "Slow", { bpm: 75 }), opt("medium", "Medium", { bpm: 100 }), opt("fast", "Fast", { bpm: 128 })] },
      duration: { label: "Length", choices: [opt(15, "15 s"), opt(30, "30 s"), opt(60, "1 min"), opt(90, "1.5 min"), opt(120, "2 min")], min: 10, max: 120 },
      vocals: { label: "Vocals", choices: [opt("instrumental", "Instrumental"), opt("vocals", "With vocals")] },
      use: { label: "Used as", choices: [opt("full", "Full track"), opt("background", "Background loop"), opt("intro", "Intro"), opt("outro", "Outro")] },
    },
    defaults: { genre: "lofi", mood: "calm", tempo: "medium", duration: 30, vocals: "instrumental", use: "full" },
    helpers: ["soft piano", "warm strings", "tabla", "acoustic guitar", "gentle drums", "synth pads", "loopable", "builds slowly"],
    extras: [{ key: "instruments", type: "text", label: "Instruments (optional)", placeholder: "e.g. piano, tabla, soft strings", max: 120 }],
    rules: [
      { title: "Prompt rules", text: "Describe the mood, the genre, the instruments and the tempo. Don't name songs, artists or bands: prompts that copy someone else's music will be refused." },
      { title: "Licence", text: "The licence for AI music will be shown here before AsaanDesk AI is switched on. Today nothing is generated, so there is nothing to license yet." },
      { title: "Today", text: "AsaanDesk AI is not switched on yet, so nothing is generated and nothing you type is sent anywhere." },
    ],
    soon: {
      title: "AI music generator is coming soon",
      what: "Describe a mood and AsaanDesk AI will compose an original, royalty-free track of 15 seconds to 2 minutes in the genre, mood and tempo you choose, with or without vocals, ready to download as MP3.",
      offline: "Working today: add your own music to videos in the video editor, record your voice with the voiceover tool, or record your screen and camera.",
    },
    examples: [
      { title: "Study lo-fi", prompt: "Relaxed lo-fi beat with soft piano, vinyl crackle and a gentle bass line for studying.", genre: "lofi", mood: "calm", tempo: "slow", duration: 60, vocals: "instrumental" },
      { title: "Product launch", prompt: "Upbeat electronic track with claps and a bright synth hook for a product launch video.", genre: "electronic", mood: "energetic", tempo: "fast", duration: 30, vocals: "instrumental" },
      { title: "Wedding montage", prompt: "Warm acoustic guitar and light strings, hopeful and emotional, building slowly to a soft finish.", genre: "acoustic", mood: "inspiring", tempo: "medium", duration: 60, vocals: "instrumental" },
      { title: "Channel intro", prompt: "Tabla groove with a modern bass and a flute melody, short and catchy, for a channel intro.", genre: "fusion", mood: "happy", tempo: "medium", duration: 15, vocals: "instrumental" },
      { title: "Trailer tension", prompt: "Dark cinematic drones with deep drums that build to one big hit at the end.", genre: "cinematic", mood: "dramatic", tempo: "slow", duration: 30, vocals: "instrumental" },
      { title: "Feel-good jingle", prompt: "Cheerful pop jingle with hand claps and a simple sing-along melody about a sunny morning.", genre: "pop", mood: "happy", tempo: "fast", duration: 15, vocals: "vocals" },
    ],
  },
  voice: {
    id: "voice", tab: "Voice", title: "AI voice generator", path: "/ai/voice", feature: "AI voice", kind: "audio",
    lead: "Paste your script and AsaanDesk AI reads it in a natural, studio-quality voice.",
    field: "text", fieldLabel: "Your script", placeholder: "Type or paste what the voice should say",
    min: 2, max: 3000,
    options: {
      voice: { label: "Voice", choices: VOICE_STYLES },
      language: { label: "Language", choices: VOICE_LANGS },
      speed: { label: "Speed", choices: VOICE_SPEEDS },
      tone: { label: "Tone", choices: [opt("neutral", "Neutral"), opt("friendly", "Friendly"), opt("calm", "Calm"), opt("serious", "Serious"), opt("excited", "Excited")] },
    },
    defaults: { voice: "warm-female", language: "en", speed: 1, tone: "neutral" },
    rules: [
      { title: "Your words", text: "Use your own script. Don't copy a real person's voice, and don't make a voice say things a real person didn't say." },
      { title: "Best results", text: "Use short sentences, add commas and full stops where the voice should pause, and spell out short forms that are hard to read." },
      { title: "Length", text: "Up to 3,000 characters per script. Split a longer text into parts." },
      { title: "Today", text: "AsaanDesk AI is not switched on yet, so nothing is generated and nothing you type is sent anywhere." },
    ],
    soon: {
      title: "AI voice generator is coming soon",
      what: "Paste your script and AsaanDesk AI will read it in a natural, studio-quality voice in English, Urdu, Hindi and more, at the speed you pick, ready to download as MP3.",
      offline: "Working today: listen to your script with your browser's voices and record your own voice in the text to speech voiceover tool, then use it in the video editor.",
    },
    examples: [
      { title: "Shop welcome", prompt: "Welcome to our store! Today every order over two thousand rupees ships free, all across the country.", voice: "warm-female", language: "en", speed: 1 },
      { title: "Shop announcement", prompt: "Good news! Our new summer collection is in the shop now, with free delivery on orders over three thousand rupees.", voice: "calm-male", language: "en", speed: 1 },
      { title: "Podcast intro", prompt: "You're listening to Small Steps, the show about building a business one honest day at a time.", voice: "storyteller", language: "en", speed: 1 },
      { title: "Tutorial narration", prompt: "In this video, I'll show you how to turn a phone photo into a clean product image in three easy steps.", voice: "bright-female", language: "en", speed: 1.15 },
      { title: "News style update", prompt: "Here is today's update: our office will stay open until eight in the evening, Monday to Saturday.", voice: "news", language: "en", speed: 1 },
    ],
  },
};
// Sound effects (Canva: generate sound effects for transitions, ambience, clicks): source, strength, length, place.
TOOLS.sfx = {
  id: "sfx", tab: "Sound effect", title: "AI sound effect generator", path: "/ai/sfx", feature: "AI sound effects", kind: "audio",
  lead: "Describe a sound and AsaanDesk AI makes a short sound effect for your video or slides.",
  field: "prompt", fieldLabel: "Describe the sound", placeholder: "e.g. Soft whoosh for a slide transition",
  min: 4, max: 300,
  options: {
    duration: { label: "Length", choices: [opt(1, "1 s"), opt(2, "2 s"), opt(5, "5 s"), opt(10, "10 s")], min: 1, max: 10 },
    intensity: { label: "Strength", choices: [opt("subtle", "Subtle"), opt("medium", "Medium"), opt("loud", "Loud")] },
    place: { label: "Where", choices: [opt("any", "Anywhere"), opt("indoors", "Indoors"), opt("street", "Street"), opt("nature", "Nature"), opt("stadium", "Stadium")] },
  },
  defaults: { duration: 2, intensity: "medium", place: "any" },
  helpers: ["short", "echo", "far away", "close to the microphone", "fades out", "loopable"],
  rules: [
    { title: "Prompt tips", text: "Say what makes the sound (a whoosh, a bell, footsteps, rain), how strong and how long it is, and where it happens." },
    { title: "Not allowed", text: "Don't ask for copies of famous sounds from films, games or brands. Such prompts will be refused." },
    { title: "Today", text: "AsaanDesk AI is not switched on yet, so nothing is generated and nothing you type is sent anywhere." },
  ],
  soon: {
    title: "AI sound effect generator is coming soon",
    what: "Describe a sound and AsaanDesk AI will make an original sound effect of 1 to 10 seconds, subtle or loud, ready to preview, download as MP3 or add to a video.",
    offline: "Working today: add your own sounds and music to videos in the video editor, or record real sounds with the screen and camera recorder.",
  },
  examples: [
    { title: "Slide whoosh", prompt: "Soft whoosh for a slide transition, quick and clean.", duration: 1, intensity: "subtle", place: "any" },
    { title: "Crowd cheer", prompt: "A crowd cheering and clapping after a goal, short burst.", duration: 5, intensity: "loud", place: "stadium" },
    { title: "Shop bell", prompt: "A small bell ringing as a shop door opens.", duration: 2, intensity: "medium", place: "indoors" },
    { title: "Rain on a window", prompt: "Steady rain tapping on a window with distant thunder.", duration: 10, intensity: "subtle", place: "indoors" },
    { title: "Footsteps", prompt: "Footsteps on a wooden floor, walking slowly.", duration: 5, intensity: "medium", place: "indoors" },
    { title: "Button click", prompt: "A soft click for an app button press.", duration: 1, intensity: "subtle", place: "any" },
  ],
};
export const TOOL_IDS = Object.keys(TOOLS);
export const toolFromQuery = (search) => {
  let t = new URLSearchParams(String(search || "")).get("tool");
  t = { "ai-video-generator": "video", "ai-music-generator": "music", "ai-voice-generator": "voice", "ai-sound-effects": "sfx", "sound-effects": "sfx" }[t] || t; // tool slugs work too
  return TOOL_IDS.includes(t) ? t : "video";
};
const choiceOf = (tool, key, value) => tool.options[key].choices.find((c) => String(c.value) === String(value));

// Prompts that copy someone else's work (Canva blocks named songs, artists, "in the style of", famous soundtracks).
const COPY_RE = [/\bin the style of\b/i, /\b(?:sounds?|sounding) (?:just |exactly )?like\b/i, /\bcover (?:of|version)\b/i, /\bremix of\b/i, /\b(?:song|track|album|soundtrack|theme(?: song)?) (?:by|from)\b/i, /\bby the band\b/i, /\b(?:famous|popular|hit) (?:song|tune|jingle|theme)\b/i];
/** Words in a prompt that would copy someone else's music or sounds: [] = fine. Music and sound effects refuse them. */
export function promptWarnings(toolId, text) {
  const s = String(text || "");
  if (!COPY_RE.some((re) => re.test(s))) return [];
  if (toolId === "music") return ["Don't name songs, artists or soundtracks. Describe the mood, the genre, the instruments and the tempo instead."];
  if (toolId === "sfx") return ["Don't ask for famous sounds from films, games or brands. Describe what makes the sound instead."];
  if (toolId === "video") return ["Describe the look you want in your own words instead of naming another artist or brand."];
  return [];
}
/** Voice script check (Canva's voiceover tips): long sentences, no closing punctuation, short forms in capitals. */
export function scriptTips(text) {
  const s = String(text || "").trim();
  if (!s) return [];
  const tips = [];
  const long = s.split(/(?<=[.!?؟۔])\s+/).filter((x) => x.split(/\s+/).filter(Boolean).length > 25).length;
  if (long) tips.push(`${long} sentence${long > 1 ? "s are" : " is"} longer than 25 words. Shorter sentences sound more natural.`);
  if (!/[.!?؟۔]["')\]]?$/.test(s)) tips.push("End with a full stop, so the voice knows where to finish.");
  const abbr = [...new Set((s.match(/\b[A-Z]{2,6}\b/g) || []).filter((w) => !["I", "OK", "TV"].includes(w)))];
  if (abbr.length) tips.push(`Spell out ${abbr.slice(0, 3).join(", ")} if the voice should say the full words.`);
  return tips;
}
/** Adds a helper phrase to the prompt once (", phrase"), kept within the tool's length limit. */
export function addPhrase(toolId, text, phrase) {
  const t = TOOLS[toolId], p = String(text || "").replace(/\s+$/g, ""), add = String(phrase || "").trim();
  if (!t || !add || p.toLowerCase().includes(add.toLowerCase())) return p;
  return (p ? `${p.replace(/[,.;\s]+$/, "")}, ${add}` : add[0].toUpperCase() + add.slice(1)).slice(0, t.max);
}

/** Design panel tabs for each tool: which of its own option pickers are its Styles and its Layouts (the same choices as the form). */
export const DESIGN_KEYS = {
  video: { styles: ["style"], layouts: ["aspect", "duration"] },
  music: { styles: ["genre", "mood"], layouts: ["use", "duration"] },
  voice: { styles: ["voice", "tone"], layouts: [] },
  sfx: { styles: ["place", "intensity"], layouts: ["duration"] },
};

/**
 * The prompt with left-rail kit text added (words: the kit texts' contents): the voice tool's script gets them on new
 * lines, the other prompts as sentences; kept to the tool's length. null = nothing to add.
 */
export function addKitText(toolId, text, words) {
  const t = TOOLS[toolId], add = (words || []).map((w) => String(w ?? "").trim()).filter(Boolean);
  if (!t || !add.length) return null;
  const voice = t.id === "voice", cur = String(text || "").replace(/\s+$/, "");
  const joined = add.map((w, i) => (voice || i === add.length - 1 || /[.!?]$/.test(w) ? w : w + ".")).join(voice ? "\n" : " ");
  const sep = !cur ? "" : voice ? "\n" : /[.!?]$/.test(cur) ? " " : ". ";
  return (cur + sep + joined).slice(0, t.max);
}

/** Problems with a form (empty list = OK). form: { prompt|text, ...options } */
export function validate(toolId, form = {}) {
  const tool = TOOLS[toolId];
  if (!tool) return ["Unknown tool."];
  const errs = [], text = String(form[tool.field] ?? "").trim();
  if (text.length < tool.min) errs.push(tool.field === "text" ? "Type the words the voice should say first." : "Describe what you want in a few more words.");
  if (text.length > tool.max) errs.push(`Please keep it under ${tool.max} characters (now ${text.length}).`);
  if (toolId === "music" || toolId === "sfx") errs.push(...promptWarnings(toolId, text));
  for (const key of Object.keys(tool.options)) {
    const v = form[key] ?? tool.defaults[key];
    if (!choiceOf(tool, key, v)) errs.push(`Pick a ${tool.options[key].label.toLowerCase()}.`);
    const { min, max } = tool.options[key];
    if (min != null && (Number(v) < min || Number(v) > max)) errs.push(`${tool.options[key].label} must be ${min} to ${max} seconds.`);
  }
  return errs;
}

/** form -> { path, feature, body } for onlineAi(path, body, feature). Throws a friendly Error when invalid. */
export function buildRequest(toolId, form = {}) {
  const errs = validate(toolId, form);
  if (errs.length) throw new Error(errs[0]);
  const tool = TOOLS[toolId], val = (k) => choiceOf(tool, k, form[k] ?? tool.defaults[k]).value;
  const text = String(form[tool.field]).trim();
  let body;
  if (toolId === "video") {
    body = { prompt: text, style: val("style"), aspect: val("aspect"), duration: val("duration") };
    if (val("sound") === "off") body.sound = false; // clips have sound unless asked not to
    if (form.reference?.dataUrl) body.reference = form.reference.dataUrl; // optional picture, only when chosen
  } else if (toolId === "music") {
    body = { prompt: text, genre: val("genre"), mood: val("mood"), tempo: val("tempo"), bpm: choiceOf(tool, "tempo", val("tempo")).bpm, duration: val("duration"), instrumental: val("vocals") === "instrumental" };
    if (val("use") !== "full") body.use = val("use"); // intro / outro / background loop
    const inst = String(form.instruments || "").trim().slice(0, 120);
    if (inst) body.instruments = inst; // optional field, only sent when filled in
  } else if (toolId === "sfx") {
    body = { prompt: text, duration: val("duration"), intensity: val("intensity"), place: val("place"), format: "mp3" };
  } else {
    body = { text, voice: val("voice"), language: val("language"), speed: val("speed"), format: "mp3" };
    if (val("tone") !== "neutral") body.tone = val("tone");
  }
  return { path: tool.path, feature: tool.feature, body };
}

/** Base64 (or a data: URL) -> Uint8Array. */
export function base64ToBytes(b64) {
  const s = String(b64 || "").replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!s || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(s)) throw new Error("bad base64");
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/**
 * The AI service's answer -> what to play. kind 'video' | 'audio'.
 * Accepts { url } (https:, data: or blob:) or base64 in { video | audio | data, mime }. Anything else throws:
 * the app then shows an honest error instead of a result.
 */
export function resultMedia(data, kind) {
  const field = kind === "video" ? "video" : "audio";
  const fallbackMime = kind === "video" ? "video/mp4" : "audio/mpeg";
  if (data && typeof data.url === "string" && data.url) {
    let u = null; try { u = new URL(data.url); } catch {}
    if (!u || !["https:", "data:", "blob:"].includes(u.protocol)) throw new Error("AsaanDesk AI sent a link this page can't open safely.");
    const m = /^data:([^;,]+)/.exec(data.url);
    return { url: data.url, mime: String(data.mime || (m && m[1]) || fallbackMime) };
  }
  const raw = data && (data[field] ?? data.data);
  if (typeof raw === "string" && raw) {
    const m = /^data:([^;,]+)/.exec(raw);
    let bytes;
    try { bytes = base64ToBytes(raw); } catch { throw new Error("AsaanDesk AI sent a file this page couldn't read."); }
    if (!bytes.length) throw new Error("AsaanDesk AI sent an empty file.");
    return { bytes, mime: String(data.mime || (m && m[1]) || fallbackMime) };
  }
  throw new Error(`AsaanDesk AI answered without ${kind === "video" ? "a video" : "any audio"}. Nothing was made, please try again.`);
}
export function extForMime(mime, kind = "audio") {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4")) return kind === "video" ? "mp4" : "m4a";
  if (m.includes("webm")) return "webm";
  if (m.includes("quicktime")) return "mov";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("gif")) return "gif";
  return kind === "video" ? "mp4" : "mp3";
}
/** "asaandesk-ai-music-relaxed-lo-fi-beat.mp3" */
export function fileNameFor(toolId, text, mime) {
  const kind = TOOLS[toolId]?.kind || "audio";
  const slug = String(text || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, " ")
    .trim().split(/\s+/).filter(Boolean).slice(0, 4).join("-").slice(0, 32).replace(/-+$/, "");
  return `asaandesk-ai-${toolId}${slug ? "-" + slug : ""}.${extForMime(mime, kind)}`;
}
