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
    },
    defaults: { style: "cinematic", aspect: "16:9", duration: 6 },
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
    },
    defaults: { genre: "lofi", mood: "calm", tempo: "medium", duration: 30, vocals: "instrumental" },
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
    },
    defaults: { voice: "warm-female", language: "en", speed: 1 },
    soon: {
      title: "AI voice generator is coming soon",
      what: "Paste your script and AsaanDesk AI will read it in a natural, studio-quality voice in English, Urdu, Hindi and more, at the speed you pick, ready to download as MP3.",
      offline: "Working today: listen to your script with your browser's voices and record your own voice in the text to speech voiceover tool, then use it in the video editor.",
    },
    examples: [
      { title: "Shop welcome", prompt: "Welcome to our store! Today every order over two thousand rupees ships free, all across the country.", voice: "warm-female", language: "en", speed: 1 },
      { title: "Urdu welcome", prompt: "خوش آمدید! ہماری نئی ویب سائٹ پر آپ کا استقبال ہے۔", voice: "calm-male", language: "ur", speed: 1 },
      { title: "Podcast intro", prompt: "You're listening to Small Steps, the show about building a business one honest day at a time.", voice: "storyteller", language: "en", speed: 1 },
      { title: "Tutorial narration", prompt: "In this video, I'll show you how to turn a phone photo into a clean product image in three easy steps.", voice: "bright-female", language: "en", speed: 1.15 },
      { title: "News style update", prompt: "Here is today's update: our office will stay open until eight in the evening, Monday to Saturday.", voice: "news", language: "en", speed: 1 },
    ],
  },
};
export const TOOL_IDS = Object.keys(TOOLS);
export const toolFromQuery = (search) => {
  const t = new URLSearchParams(String(search || "")).get("tool");
  return TOOL_IDS.includes(t) ? t : "video";
};
const choiceOf = (tool, key, value) => tool.options[key].choices.find((c) => String(c.value) === String(value));

/** Problems with a form (empty list = OK). form: { prompt|text, ...options } */
export function validate(toolId, form = {}) {
  const tool = TOOLS[toolId];
  if (!tool) return ["Unknown tool."];
  const errs = [], text = String(form[tool.field] ?? "").trim();
  if (text.length < tool.min) errs.push(tool.field === "text" ? "Type the words the voice should say first." : "Describe what you want in a few more words.");
  if (text.length > tool.max) errs.push(`Please keep it under ${tool.max} characters (now ${text.length}).`);
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
  if (toolId === "video") body = { prompt: text, style: val("style"), aspect: val("aspect"), duration: val("duration") };
  else if (toolId === "music") body = { prompt: text, genre: val("genre"), mood: val("mood"), tempo: val("tempo"), bpm: choiceOf(tool, "tempo", val("tempo")).bpm, duration: val("duration"), instrumental: val("vocals") === "instrumental" };
  else body = { text, voice: val("voice"), language: val("language"), speed: val("speed"), format: "mp3" };
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
