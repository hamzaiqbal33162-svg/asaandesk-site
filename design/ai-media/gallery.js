// AI video, music and voice generators: prompt idea templates (pure module, no DOM), built by a generator per tool:
// hand-written prompt STRUCTURES x content THEMES (purposes / industries) x own colour PALETTES (thumbnails), with the
// style / shape / length options varied per idea. Ids encode the combination ("vid-drone~p03~travel"); byId(id) and
// thumb(id) rebuild any of them from the id. A template only fills the prompt and the options; it never makes a result
// (results only ever come from AsaanDesk AI when it is switched on). All prompts and artwork are our own; thumbnails use
// real library photos (CC0 / public domain) and show a design example for the idea, never an AI result.
import { SCRIPT_LAYOUTS, SCRIPT_THEMES, voiceArt, themePhoto } from "../voice/gallery.js";
import { kit, fit, text, headline, rect, circle, pathEl, line, icon, isDark, mix as mix6, rng } from "../shared/tpl-kit.js";
import { look, pixelGrid } from "../ai-image/looks.js";
import { VOICE_STYLES } from "./tools.js";
import { cast } from "../video/people.js";
import { isPerson } from "../shared/photo-library.js";

export const SLUG = { video: "ai-video-generator", music: "ai-music-generator", voice: "ai-voice-generator" };
export const TOOL_OF_SLUG = { "ai-video-generator": "video", "ai-music-generator": "music", "ai-voice-generator": "voice" };
const COUNT = 120; // per tool

/** Visual themes for video and music ideas (same purposes as the voice scripts). */
const THEMES = [
  { key: "shop", label: "Shop", org: "Corner Store", subject: "a canvas backpack in sunny yellow", place: "a bright clothing store with wooden shelves", people: "shoppers browsing colourful racks", detail: "stitched leather tags and brass zips", action: "a shopping bag swinging past a shop window", work: "folding soft cotton shirts", before: "an empty shop window", after: "a colourful sale display", headline: "Weekend Sale", colour: "warm orange", use: "a weekend sale video for a clothing shop" },
  { key: "clinic", label: "Clinic", org: "Green Leaf Clinic", subject: "a white blood pressure monitor", place: "a calm, modern clinic reception with plants", people: "a friendly nurse greeting a patient", detail: "a stethoscope resting on a clipboard", action: "water pouring into a clear glass", work: "writing notes on a tablet", before: "a plain waiting room", after: "a bright room with plants and soft chairs", headline: "Your Health First", colour: "soft green", use: "a calm clinic waiting room screen" },
  { key: "school", label: "School", org: "Bright Path School", subject: "a small globe on a desk", place: "a sunny classroom with paper planets on the ceiling", people: "students building a model volcano", detail: "coloured pencils in a jar", action: "a paper plane gliding across a classroom", work: "drawing a diagram on a whiteboard", before: "a bare classroom wall", after: "a wall full of student art", headline: "Science Fair", colour: "sky blue", use: "a school science fair video" },
  { key: "restaurant", label: "Restaurant", org: "Olive and Thyme", subject: "a bowl of fresh pasta with basil", place: "a cosy restaurant with candle-lit tables", people: "chefs plating dishes in an open kitchen", detail: "olive oil drizzling over warm bread", action: "a chef tossing vegetables in a hot pan", work: "rolling fresh pasta dough", before: "raw ingredients on a board", after: "a finished plate ready to serve", headline: "New Dinner Menu", colour: "deep red", use: "a restaurant dinner menu reel" },
  { key: "fitness", label: "Fitness", org: "PeakFit Gym", subject: "a pair of bright running shoes", place: "a modern gym with large windows", people: "a group class doing jumping jacks", detail: "chalk dust on a barbell grip", action: "a runner sprinting along a track", work: "tying running shoe laces", before: "a quiet empty gym", after: "a full, energetic class", headline: "Train Strong", colour: "electric lime", use: "a gym workout reel" },
  { key: "realestate", label: "Real estate", org: "Keystone Homes", subject: "a small model house with a red roof", place: "a bright modern living room with tall windows", people: "a couple opening the front door of a new home", detail: "a key turning in a front door", action: "curtains opening to a garden view", work: "placing cushions on a new sofa", before: "an empty room", after: "a furnished, welcoming living room", headline: "Open House", colour: "calm navy", use: "a home tour video" },
  { key: "tech", label: "Tech startup", org: "Nimbus Apps", subject: "a phone showing a clean task app", place: "a bright startup office with plants", people: "a small team sketching ideas on glass", detail: "glowing circuit lines on a dark board", action: "app icons popping onto a phone screen", work: "typing on a laptop keyboard", before: "a messy desk of sticky notes", after: "one tidy app screen", headline: "Meet Nimbus", colour: "violet", use: "an app launch video" },
  { key: "charity", label: "Charity", org: "Helping Hands Trust", subject: "a hand-painted donation box", place: "a village water well at sunrise", people: "volunteers handing out water bottles", detail: "water splashing into a clay cup", action: "children running toward a new water tap", work: "packing food boxes", before: "a dry, dusty path", after: "a green garden around a new well", headline: "Every Drop Counts", colour: "teal", use: "a charity fun run film" },
  { key: "travel", label: "Travel", org: "Blue Horizon Travel", subject: "a vintage suitcase covered in stickers", place: "green mountain valleys with a winding road", people: "hikers reaching a mountain top", detail: "a compass resting on an old map", action: "a train passing over a stone bridge", work: "packing a small travel bag", before: "a grey city street", after: "a bright mountain lake", headline: "Pack Light, Go Far", colour: "ocean blue", use: "a mountain travel vlog" },
  { key: "cafe", label: "Cafe", org: "Morning Bean Cafe", subject: "a glass of caramel cold brew with ice", place: "a cosy cafe with morning light", people: "a barista drawing latte art", detail: "coffee beans falling into a grinder", action: "milk swirling into dark coffee", work: "pouring a slow drip coffee", before: "a plain white cup", after: "a cup with a heart in latte art", headline: "Good Morning", colour: "coffee brown", use: "a cosy cafe morning reel" },
  { key: "wedding", label: "Wedding", org: "Ever After Weddings", subject: "a pair of gold rings on silk", place: "a garden wedding venue with string lights", people: "guests throwing petals as a couple walks by", detail: "white flowers on a long table", action: "a veil lifting in a soft breeze", work: "arranging a bouquet of roses", before: "an empty garden lawn", after: "a garden set for a wedding dinner", headline: "Ever After", colour: "blush pink", use: "a wedding highlights film" },
  { key: "salon", label: "Beauty salon", org: "Glow Studio", subject: "a glass bottle of hair serum", place: "a bright beauty studio with round mirrors", people: "a stylist finishing a fresh haircut", detail: "a soft brush sweeping shimmer powder", action: "shiny hair swinging in slow motion", work: "braiding long hair", before: "tired, frizzy hair", after: "smooth, glossy hair", headline: "Glow Up", colour: "rose gold", use: "a beauty salon makeover video" },
];

// ----- AI video: prompt structures. styles: the Style options the idea fits; sh: preferred shapes.
const VIDEO = [
  { key: "turntable", name: "Product turntable", section: "Products and brands", styles: ["product", "realistic"], durs: [6, 8], p: (t) => `${cap(t.subject)} turning slowly on a clean pedestal, soft studio light and gentle reflections.` },
  { key: "logo", name: "Logo line reveal", section: "Products and brands", styles: ["illustration", "animation"], durs: [4, 6], p: (t) => `Glowing lines draw a simple round logo for ${t.org} on a ${t.colour} background, then everything fades to white.` },
  { key: "title", name: "Bold title intro", section: "Products and brands", styles: ["illustration", "cinematic"], durs: [4, 6], p: (t) => `Bold title text "${t.headline}" slides in over ${t.place}, modern, clean and confident.` },
  { key: "beforeafter", name: "Before and after", section: "Products and brands", styles: ["realistic", "product"], durs: [6, 8], p: (t) => `Before and after: ${t.before} turns into ${t.after}, with a smooth wipe transition.` },
  { key: "drone", name: "Drone establishing shot", section: "Scenes and places", styles: ["cinematic", "realistic"], durs: [8, 10], p: (t) => `Slow drone shot rising over ${t.place}, golden morning light, wide and calm.` },
  { key: "walk", name: "Walk-through", section: "Scenes and places", styles: ["realistic", "cinematic"], durs: [8, 10], p: (t) => `Smooth walking shot through ${t.place}, ${t.people}, warm and welcoming.` },
  { key: "timelapse", name: "Day to night time-lapse", section: "Scenes and places", styles: ["cinematic", "realistic"], durs: [8, 10], p: (t) => `Time-lapse of ${t.place} from morning to night, lights switching on one by one.` },
  { key: "night", name: "Night city mood", section: "Scenes and places", styles: ["cinematic"], durs: [6, 8], p: (t) => `Night scene outside ${t.org}, neon reflections on wet streets, slow camera push-in, cinematic.` },
  { key: "festive", name: "Festive season", section: "Scenes and places", styles: ["cinematic", "illustration"], durs: [6, 8], p: (t) => `${cap(t.place)} decorated for the holidays, warm string lights and gentle snow falling outside.` },
  { key: "macro", name: "Macro detail", section: "Close-ups and motion", styles: ["realistic", "product"], durs: [4, 6], p: (t) => `Macro close-up of ${t.detail}, shallow focus and a soft blurred background.` },
  { key: "slowmo", name: "Slow motion moment", section: "Close-ups and motion", styles: ["cinematic", "realistic"], durs: [4, 6], p: (t) => `Slow-motion shot of ${t.action}, crisp detail and dramatic side light.` },
  { key: "hands", name: "Hands at work", section: "Close-ups and motion", styles: ["realistic", "cinematic"], durs: [6, 8], p: (t) => `Close-up of hands ${t.work}, natural window light and a calm pace.` },
  { key: "interview", name: "Customer interview", section: "Close-ups and motion", styles: ["realistic"], durs: [8, 10], p: (t) => `A smiling customer talks to the camera inside ${t.place}, soft natural light, interview framing.` },
  { key: "papercut", name: "Paper-cut world", section: "Fun and animated", styles: ["animation", "illustration"], durs: [8, 10], p: (t) => `Paper-cut style animation of ${t.place}, layered shapes and tiny figures moving, pastel colours.` },
  { key: "mascot", name: "Cartoon mascot hello", section: "Fun and animated", styles: ["animation"], durs: [4, 6], p: (t) => `A friendly cartoon mascot for ${t.org} waves hello in front of ${t.place}, bouncy and cheerful.` },
  { key: "loop", name: "Looping background", section: "Fun and animated", styles: ["illustration", "animation"], durs: [8, 10], p: (t) => `Seamless looping background of soft ${t.colour} gradients and slowly floating shapes for ${t.org} videos.` },
  // round 2: 24 more prompt structures (40 in all)
  { key: "unbox", name: "Unboxing", section: "Products and brands", styles: ["product", "realistic"], durs: [6, 8], p: (t) => `Hands open a ${t.colour} gift box and lift out ${t.subject}, top-down view, soft daylight.` },
  { key: "flatlay", name: "Flat lay arrangement", section: "Products and brands", styles: ["product", "illustration"], durs: [4, 6], p: (t) => `Top-down flat lay: ${t.subject} and small props slide into a neat arrangement on a ${t.colour} surface.` },
  { key: "split", name: "Split-screen compare", section: "Products and brands", styles: ["realistic", "product"], durs: [6, 8], p: (t) => `Split screen: on the left ${t.before}, on the right ${t.after}, both moving gently.` },
  { key: "pricetag", name: "Offer reveal", section: "Products and brands", styles: ["illustration", "animation"], durs: [4, 6], p: (t) => `A paper price tag flips over to reveal "${t.headline}", confetti bursts on a ${t.colour} background.` },
  { key: "dolly", name: "Slow dolly in", section: "Scenes and places", styles: ["cinematic", "realistic"], durs: [6, 8], p: (t) => `Slow dolly shot moving into ${t.place}, soft focus, warm and quiet.` },
  { key: "rain", name: "Rainy window", section: "Scenes and places", styles: ["cinematic"], durs: [8, 10], p: (t) => `Rain running down a window, with ${t.place} glowing softly behind it, calm and cosy.` },
  { key: "sunrise", name: "Sunrise opening", section: "Scenes and places", styles: ["cinematic", "realistic"], durs: [8, 10], p: (t) => `First light of sunrise falling across ${t.place}, birds passing, a peaceful start to the day.` },
  { key: "aerial-map", name: "Map flyover", section: "Scenes and places", styles: ["illustration", "animation"], durs: [6, 8], p: (t) => `An illustrated map zooms in on ${t.org}, a small pin drops and the label "${t.headline}" appears.` },
  { key: "crowd", name: "Happy crowd", section: "Scenes and places", styles: ["realistic", "cinematic"], durs: [6, 8], p: (t) => `${cap(t.people)}, smiling and laughing, handheld camera, lively and natural.` },
  { key: "pour", name: "Pour shot", section: "Close-ups and motion", styles: ["product", "realistic"], durs: [4, 6], p: (t) => `Slow pour shot beside ${t.subject}, droplets catching the light against a ${t.colour} background.` },
  { key: "spin360", name: "360 orbit", section: "Close-ups and motion", styles: ["product", "cinematic"], durs: [6, 8], p: (t) => `The camera orbits all the way around ${t.subject}, smooth and steady, dark studio with one rim light.` },
  { key: "stopmotion", name: "Stop motion", section: "Close-ups and motion", styles: ["animation"], durs: [6, 8], p: (t) => `Playful stop-motion: ${t.subject} hops across a table in small jumps, handmade feel.` },
  { key: "focuspull", name: "Focus pull", section: "Close-ups and motion", styles: ["cinematic", "realistic"], durs: [4, 6], p: (t) => `Focus pulls from ${t.detail} in the front to ${t.people} in the back, gentle and cinematic.` },
  { key: "pov", name: "First-person view", section: "Close-ups and motion", styles: ["realistic"], durs: [8, 10], p: (t) => `First-person view walking into ${t.place}, hands reaching for ${t.subject}.` },
  { key: "kinetic", name: "Kinetic text", section: "Fun and animated", styles: ["animation", "illustration"], durs: [4, 6], p: (t) => `Kinetic typography: the words "${t.headline}" bounce, stretch and settle on a ${t.colour} background.` },
  { key: "doodle", name: "Doodle explainer", section: "Fun and animated", styles: ["illustration", "animation"], durs: [8, 10], p: (t) => `Hand-drawn doodles appear one by one to explain ${t.use}, white background, black lines with ${t.colour} accents.` },
  { key: "clay", name: "Clay animation", section: "Fun and animated", styles: ["animation"], durs: [6, 8], p: (t) => `Soft clay-style animation of ${t.place}, round shapes and tiny clay people waving.` },
  { key: "pixel", name: "Pixel art scene", section: "Fun and animated", styles: ["animation", "illustration"], durs: [6, 8], p: (t) => `Retro pixel-art scene of ${t.place}, small looping animations and a ${t.colour} sky.` },
  { key: "confetti", name: "Celebration burst", section: "Fun and animated", styles: ["animation", "illustration"], durs: [4, 6], p: (t) => `Confetti and streamers burst across the screen, then "${t.headline}" pops up in the middle.` },
  { key: "countdown", name: "Countdown 3-2-1", section: "Fun and animated", styles: ["animation", "illustration"], durs: [4, 6], p: (t) => `Big numbers 3, 2, 1 count down on a ${t.colour} background, then the ${t.org} name appears.` },
  { key: "seasons", name: "Four seasons", section: "Scenes and places", styles: ["cinematic", "illustration"], durs: [8, 10], p: (t) => `${cap(t.place)} through spring, summer, autumn and winter in one smooth shot.` },
  { key: "underwater", name: "Underwater dream", section: "Fun and animated", styles: ["cinematic", "animation"], durs: [6, 8], p: (t) => `Dreamy underwater scene with light rays and bubbles, ${t.subject} floating gently in the middle.` },
  { key: "outro-card", name: "End card", section: "Products and brands", styles: ["illustration", "animation"], durs: [4, 6], p: (t) => `Clean end card for ${t.org}: logo space in the middle, "${t.headline}" below, ${t.colour} gradient, soft motion.` },
  { key: "teamwork", name: "Team at work", section: "Close-ups and motion", styles: ["realistic", "cinematic"], durs: [8, 10], p: (t) => `${cap(t.people)} working together, quick cuts between faces and hands, upbeat and natural.` },
];
// ----- AI music: prompt structures with matching options.
const MUSIC = [
  { key: "lofi", name: "Lo-fi beat", section: "Background music", o: { genre: "lofi", mood: "calm", tempo: "slow", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Relaxed lo-fi beat with soft piano, vinyl crackle and a gentle bass line for ${t.use}.` },
  { key: "ambient", name: "Ambient calm", section: "Background music", o: { genre: "ambient", mood: "calm", tempo: "slow", vocals: "instrumental" }, durs: [90, 120], p: (t) => `Slow ambient pads with a soft drone and far-away chimes, very calm, for ${t.use}.` },
  { key: "piano", name: "Soft piano", section: "Background music", o: { genre: "acoustic", mood: "sad", tempo: "slow", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Soft solo piano, gentle and a little wistful, for ${t.use}.` },
  { key: "hiphop", name: "Chill hip-hop", section: "Background music", o: { genre: "hiphop", mood: "calm", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Laid-back hip-hop beat with mellow keys and a deep bass for ${t.use}.` },
  { key: "newsbed", name: "Steady news bed", section: "Background music", o: { genre: "electronic", mood: "calm", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Clean, steady background bed with light ticking percussion and soft synth chords for ${t.use}.` },
  { key: "promo", name: "Upbeat promo", section: "Ads and intros", o: { genre: "electronic", mood: "energetic", tempo: "fast", vocals: "instrumental" }, durs: [15, 30], p: (t) => `Upbeat electronic track with claps and a bright synth hook for ${t.use}.` },
  { key: "jingle", name: "Sing-along jingle", section: "Ads and intros", o: { genre: "pop", mood: "happy", tempo: "fast", vocals: "vocals" }, durs: [15, 30], p: (t) => `Cheerful pop jingle with hand claps and a simple sing-along melody about ${t.org}.` },
  { key: "sting", name: "Short intro sting", section: "Ads and intros", o: { genre: "fusion", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [15], p: (t) => `Short, catchy hand-drum groove with a flute melody and a clear ending, for ${t.use}.` },
  { key: "tropical", name: "Sunny tropical pop", section: "Ads and intros", o: { genre: "pop", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Sunny tropical pop with marimba, soft percussion and whistles for ${t.use}.` },
  { key: "synthwave", name: "Retro synthwave", section: "Ads and intros", o: { genre: "electronic", mood: "energetic", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Retro synthwave with warm analog bass and shiny arpeggios for ${t.use}.` },
  { key: "acoustic", name: "Warm acoustic", section: "Moments and stories", o: { genre: "acoustic", mood: "inspiring", tempo: "medium", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Warm acoustic guitar and light strings, hopeful and gentle, building slowly for ${t.use}.` },
  { key: "folk", name: "Light folk tune", section: "Moments and stories", o: { genre: "acoustic", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Light folk tune with fiddle, acoustic guitar and foot taps for ${t.use}.` },
  { key: "corporate", name: "Inspiring corporate", section: "Moments and stories", o: { genre: "cinematic", mood: "inspiring", tempo: "medium", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Light, inspiring piano and strings with a steady pulse for ${t.use}.` },
  { key: "epic", name: "Epic orchestral rise", section: "Moments and stories", o: { genre: "cinematic", mood: "inspiring", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Big orchestral rise with choir pads and wide drums, ending on a bright chord, for ${t.use}.` },
  { key: "trailer", name: "Trailer tension", section: "Moments and stories", o: { genre: "cinematic", mood: "dramatic", tempo: "slow", vocals: "instrumental" }, durs: [30], p: (t) => `Dark cinematic drones with deep drums that build to one big hit, for ${t.use}.` },
  { key: "workout", name: "Workout energy", section: "Moments and stories", o: { genre: "electronic", mood: "energetic", tempo: "fast", vocals: "instrumental" }, durs: [60, 120], p: (t) => `Driving electronic beat with a punchy kick and rising synths to keep ${t.use} moving.` },
  // round 2: 24 more music structures (40 in all)
  { key: "jazz", name: "Cafe jazz", section: "Background music", o: { genre: "acoustic", mood: "calm", tempo: "medium", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Light cafe jazz with brushed drums, upright bass and soft piano for ${t.use}.` },
  { key: "bossa", name: "Bossa nova", section: "Background music", o: { genre: "acoustic", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Gentle bossa nova with nylon guitar and shaker, warm and easy, for ${t.use}.` },
  { key: "strings", name: "Quiet strings", section: "Background music", o: { genre: "cinematic", mood: "calm", tempo: "slow", vocals: "instrumental" }, durs: [60, 120], p: (t) => `Quiet string quartet, slow and tender, never louder than a whisper, for ${t.use}.` },
  { key: "focus", name: "Focus loop", section: "Background music", o: { genre: "electronic", mood: "calm", tempo: "medium", vocals: "instrumental" }, durs: [90, 120], p: (t) => `Minimal focus music with soft plucks and a steady pulse, no surprises, for ${t.use}.` },
  { key: "nature", name: "Nature and pads", section: "Background music", o: { genre: "ambient", mood: "calm", tempo: "slow", vocals: "instrumental" }, durs: [90, 120], p: (t) => `Birdsong and a light stream under warm synth pads, peaceful, for ${t.use}.` },
  { key: "funk", name: "Funky groove", section: "Ads and intros", o: { genre: "pop", mood: "energetic", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Funky groove with slap bass, wah guitar and a horn stab for ${t.use}.` },
  { key: "rock", name: "Indie rock drive", section: "Ads and intros", o: { genre: "pop", mood: "energetic", tempo: "fast", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Driving indie rock with bright guitars and big drums for ${t.use}.` },
  { key: "ukulele", name: "Happy ukulele", section: "Ads and intros", o: { genre: "acoustic", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [15, 30], p: (t) => `Happy ukulele and glockenspiel with hand claps for ${t.use}.` },
  { key: "logo-sting", name: "Logo sting", section: "Ads and intros", o: { genre: "cinematic", mood: "inspiring", tempo: "medium", vocals: "instrumental" }, durs: [15], p: (t) => `Three-second logo sting: a shimmer, one warm chord and a soft whoosh for ${t.org}.` },
  { key: "dance", name: "Dance floor", section: "Ads and intros", o: { genre: "electronic", mood: "energetic", tempo: "fast", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Four-on-the-floor dance track with a big drop and bright chords for ${t.use}.` },
  { key: "kids", name: "Kids' playtime", section: "Moments and stories", o: { genre: "pop", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Playful tune with xylophone, kazoo and bouncy bass, fun for children, for ${t.use}.` },
  { key: "wedding-walk", name: "Wedding walk", section: "Moments and stories", o: { genre: "cinematic", mood: "inspiring", tempo: "slow", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Elegant piano and strings for a slow walk down the aisle, for ${t.use}.` },
  { key: "mystery", name: "Mystery", section: "Moments and stories", o: { genre: "cinematic", mood: "dramatic", tempo: "slow", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Mysterious pizzicato strings and soft bells, curious and light, for ${t.use}.` },
  { key: "adventure", name: "Adventure theme", section: "Moments and stories", o: { genre: "cinematic", mood: "inspiring", tempo: "fast", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Bold adventure theme with brass, strings and galloping drums for ${t.use}.` },
  { key: "sadpiano", name: "Reflective moment", section: "Moments and stories", o: { genre: "acoustic", mood: "sad", tempo: "slow", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Reflective piano and cello, slow and honest, for ${t.use}.` },
  { key: "eastern", name: "Desi fusion", section: "Moments and stories", o: { genre: "fusion", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Tabla and sitar over a modern beat, warm and festive, for ${t.use}.` },
  { key: "festive-bells", name: "Festive bells", section: "Moments and stories", o: { genre: "pop", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Jingling bells, warm brass and a cosy beat for ${t.use}.` },
  { key: "chillwave", name: "Chillwave sunset", section: "Background music", o: { genre: "electronic", mood: "calm", tempo: "medium", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Chillwave with hazy synths and a soft beat, like a summer sunset, for ${t.use}.` },
  { key: "gospel", name: "Uplifting choir", section: "Moments and stories", o: { genre: "pop", mood: "inspiring", tempo: "medium", vocals: "vocals" }, durs: [30, 60], p: (t) => `Uplifting choir hums and claps over warm organ chords for ${t.use}.` },
  { key: "country", name: "Country road", section: "Moments and stories", o: { genre: "acoustic", mood: "happy", tempo: "medium", vocals: "instrumental" }, durs: [30, 60], p: (t) => `Country road tune with banjo, acoustic guitar and a light shuffle for ${t.use}.` },
  { key: "techno", name: "Deep techno", section: "Ads and intros", o: { genre: "electronic", mood: "energetic", tempo: "fast", vocals: "instrumental" }, durs: [60, 120], p: (t) => `Deep techno with a rolling bassline and crisp hi-hats for ${t.use}.` },
  { key: "reggae", name: "Easy reggae", section: "Background music", o: { genre: "fusion", mood: "happy", tempo: "slow", vocals: "instrumental" }, durs: [60, 90], p: (t) => `Easy reggae skank with a warm bassline and organ bubbles for ${t.use}.` },
  { key: "suspense", name: "Countdown suspense", section: "Ads and intros", o: { genre: "cinematic", mood: "dramatic", tempo: "medium", vocals: "instrumental" }, durs: [15, 30], p: (t) => `Ticking clock and rising strings that end on a reveal hit for ${t.use}.` },
  { key: "lullaby", name: "Lullaby", section: "Background music", o: { genre: "acoustic", mood: "calm", tempo: "slow", vocals: "instrumental" }, durs: [60, 120], p: (t) => `Soft music-box lullaby with gentle pads, very calm, for ${t.use}.` },
];
// ----- AI voice: the text to speech script structures, with a matching AI voice style.
const VOICE_STYLE = { "announcement": "warm-female", "radio-ad": "bright-female", "launch": "deep-male", "testimonial": "warm-female", "phone-welcome": "calm-male", "faq": "bright-female", "safety": "calm-male", "hiring": "bright-female", "event-reminder": "warm-female", "podcast-intro": "storyteller", "story": "storyteller", "tour": "warm-female", "video-outro": "bright-female", "lesson": "calm-male", "product-demo": "bright-female", "news": "news", "thank-you": "warm-female", "holiday": "storyteller", "birthday": "bright-female", "calm": "calm-male",
  "voicemail": "calm-male", "phone-menu": "calm-male", "closing": "warm-female", "apology": "warm-female", "flash-sale": "bright-female", "jingle": "bright-female", "trailer": "deep-male",
  "explainer": "calm-male", "tip": "bright-female", "quiz": "bright-female", "interview": "news", "audiobook": "storyteller", "audio-guide": "warm-female", "recipe": "warm-female",
  "commentary": "news", "welcome-member": "warm-female", "congrats": "bright-female", "workout": "deep-male", "sleep": "calm-male", "motivation": "bright-female" };
const speedOf = (r) => (r <= 0.85 ? 0.8 : r >= 1.1 ? 1.15 : 1);

const PALETTES = [
  ["#f59e0b", "#ef4444"], ["#0ea5e9", "#14b8a6"], ["#334155", "#6366f1"], ["#1e1b4b", "#4338ca"], ["#111827", "#6b7280"], ["#78350f", "#d97706"],
  ["#1d4ed8", "#06b6d4"], ["#f472b6", "#a78bfa"], ["#7c3aed", "#ec4899"], ["#0f766e", "#5eead4"], ["#16a34a", "#84cc16"], ["#be185d", "#fda4af"],
];
const PN = PALETTES.length, ASPECTS = ["16:9", "9:16", "1:1"];
/** Card layout per palette (p % 3): with the prompt structure it gives every idea of a tool its own design. */
const CARD = { vid: ["wide", "square", "reel"], mus: ["player", "vinyl", "poster"], voi: ["persona", "spot", "podcast"] };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pid = (i) => "p" + String(i + 1).padStart(2, "0");
const TBY = Object.fromEntries(THEMES.map((x) => [x.key, x])), VTBY = Object.fromEntries(SCRIPT_THEMES.map((x) => [x.key, x]));
const SBY = { vid: Object.fromEntries(VIDEO.map((x) => [x.key, x])), mus: Object.fromEntries(MUSIC.map((x) => [x.key, x])), voi: Object.fromEntries(SCRIPT_LAYOUTS.map((x) => [x.key, x])) };
const KIND = { vid: "video", mus: "music", voi: "voice" };

function make(pre, s, t, p, m) {
  const id = `${pre}-${s.key}~${pid(p)}~${t.key}`, kind = KIND[pre];
  let prompt, options;
  if (pre === "vid") { prompt = s.p(t); options = { style: s.styles[m % s.styles.length], aspect: ASPECTS[(p + m) % 3], duration: s.durs[m % s.durs.length] }; }
  else if (pre === "mus") { prompt = s.p(t); options = { ...s.o, duration: s.durs[m % s.durs.length] }; }
  else { prompt = s.build(t); options = { voice: VOICE_STYLE[s.key] || "warm-female", language: "en", speed: speedOf(s.rate) }; }
  return { id, name: `${s.name}: ${t.label}`, tool: SLUG[kind], kind, section: s.section, structure: s.key, theme: t.key, palette: pid(p),
    themeName: t.label, layout: `${pre}-${s.key}-${CARD[pre][p % 3]}`, layoutName: s.name,
    tags: [kind, s.name.toLowerCase(), t.label.toLowerCase(), s.section.toLowerCase()], prompt, options, colors: PALETTES[p] };
}
/** Builds any idea from its id ("vid-drone~p03~travel"); null when the id doesn't name one. */
export function byId(id) {
  const [sk, pk, tk] = String(id || "").split("~");
  const pre = (sk || "").slice(0, 3), s = SBY[pre]?.[(sk || "").slice(4)], t = (pre === "voi" ? VTBY : TBY)[tk];
  const p = /^p\d\d$/.test(pk || "") ? Number(pk.slice(1)) - 1 : -1;
  if (!s || !t || !(p >= 0 && p < PN)) return null;
  return make(pre, s, t, p, p % 3);
}
function series(pre, list, themes) {
  const out = [], L = list.length, T = themes.length;
  for (let k = 0; out.length < Math.min(COUNT, L * T); k++) {
    const li = k % L, m = Math.floor(k / L), p = (k * 7 + m) % PN;
    out.push(make(pre, list[li], themes[(m + li) % T], p, p % 3));
  }
  return out;
}
// Well-mixed order inside each tool: each structure in turn, its theme moving one step every round, palettes rotating.
export const TEMPLATES = [...series("vid", VIDEO, THEMES), ...series("mus", MUSIC, THEMES), ...series("voi", SCRIPT_LAYOUTS, SCRIPT_THEMES)];
export const TOTAL = TEMPLATES.length;
/** Theme filter chips (the same twelve themes for every tool). */
export const THEME_OPTIONS = THEMES.map((t) => ({ value: t.key, label: t.label }));
export const LAYOUTS = (VIDEO.length + MUSIC.length + SCRIPT_LAYOUTS.length) * 3;
/** Per tool slug: { total, layouts }. */
export const COUNTS = { [SLUG.video]: { total: TEMPLATES.filter((x) => x.kind === "video").length, layouts: VIDEO.length * 3 }, [SLUG.music]: { total: TEMPLATES.filter((x) => x.kind === "music").length, layouts: MUSIC.length * 3 }, [SLUG.voice]: { total: TEMPLATES.filter((x) => x.kind === "voice").length, layouts: SCRIPT_LAYOUTS.length * 3 } };

const sparkle = (x, y, s, fill) => pathEl(`M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z`, fill);
/** Per tool slug: number of distinct designs (prompt structure × card layout). */
export const layoutsFor = (slug) => COUNTS[slug]?.layouts ?? 0;

// ---------- artwork: finished example designs in Canva's pattern, from real library photos (CC0 / public domain).
// Video ideas = a video frame in the idea's shape (16:9 editor frame with a scene strip, 9:16 reel on a phone, 1:1 post),
// with a structure-specific overlay (drone HUD, before/after wipe, countdown, map pin, lower third…), play button and the
// prompt. Music ideas = album / track cards (now playing, vinyl sleeve, poster). Voice ideas = voiceover cards. They are
// design examples made from stock photos and our own drawings, never media made by AsaanDesk AI.
const W = 320, H = 200;
const full6 = (c) => (/^#[0-9a-f]{3}$/i.test(c) ? "#" + c.slice(1).split("").map((d) => d + d).join("") : c);
const mix = (a, b, t) => mix6(full6(a), full6(b), t);
const ink = (c) => (isDark(c) ? "#fff" : "#0f172a");
const one = (s, w, size, font = "sans") => fit(s, w, { size, min: size, maxLines: 1, font }).lines[0] || "";
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const STYLE_NAME = { cinematic: "Cinematic", realistic: "Realistic", animation: "3D animation", illustration: "Illustrated", product: "Product shot" };
const STYLE_LOOK = { cinematic: "cinematic", realistic: "photo", product: "vibrant", animation: "soft3d", illustration: "anime" };
const KEY_LOOK = { clay: "clay", pixel: "pixel", papercut: "flat", doodle: "pencil", night: "night", rain: "cool", underwater: "cool", festive: "sunny", sunrise: "sunny", stopmotion: "fadedfilm", loop: "blurwash", logo: "blurwash", kinetic: "duotone", countdown: "duotone", "outro-card": "blurwash", mascot: "anime", "aerial-map": "fadedfilm" };
const KEY_WORDS = { drone: "aerial landscape", night: "city night lights", sunrise: "sunrise sky", underwater: "sea water beach", rain: "city night", seasons: "autumn nature", "aerial-map": "travel road", festive: "celebration lights", timelapse: "city skyline", loop: "abstract bokeh", logo: "abstract", kinetic: "abstract", confetti: "celebration confetti", countdown: "celebration", "outro-card": "abstract", crowd: "people", teamwork: "meeting team office" };
// People (shared library, video/people.js kinds), like Canva's video and music templates: the ideas whose prompt shows
// people get a people photo of the theme's kind (a customer talking to the camera, a happy crowd, a team at work, hands of
// the stylist/chef/barista at work, slow-motion moments of people), and the music styles that are played or danced by
// people (acoustic, folk, country, rock, dance, gospel, hip-hop, workout, wedding walk, kids) show the performers, the
// couple, a child… on their cover. Places, products and abstract ideas keep their photos.
const BY_THEME = { shop: "friends", clinic: "doctor", school: "students", restaurant: "chef", fitness: "trainer", realestate: "lovers", tech: "team", charity: "volunteers", travel: "traveller", cafe: "barista", wedding: "couple", salon: "salon" };
const PEOPLE_IDEA = {
  interview: () => "customer", crowd: (th) => BY_THEME[th], teamwork: (th) => (th === "realestate" ? "team" : BY_THEME[th]),
  hands: (th) => ({ clinic: "doctor", school: "teacher", restaurant: "chef", tech: "developer", charity: "volunteers", cafe: "barista", salon: "salon", travel: "traveller", fitness: "trainer" })[th],
  slowmo: (th) => ({ wedding: "couple", fitness: "trainer", salon: "beauty", restaurant: "chef", charity: "child" })[th],
  // music styles
  acoustic: () => "musician", folk: () => "musician", country: () => "musician", rock: () => "musician", hiphop: () => "musician", ukulele: () => "musician",
  dance: () => "crowd", gospel: () => "crowd", workout: () => "trainer", "wedding-walk": () => "couple", kids: () => "child",
};
const mediaPhoto = (t) => {
  const kind = t.kind !== "voice" && PEOPLE_IDEA[t.structure]?.(t.theme);
  return (kind && cast([["p", kind]], t.id).p) || themePhoto(t.theme, t.id, KEY_WORDS[t.structure] || "");
};
// people photos are cropped around the face (the kit does it when no fixed alignment is given); a team triptych keeps thirds
const alignFor = (ph, t, a) => (isPerson(ph) && t.structure !== "teamwork" ? null : a);

// ----- video: overlays per prompt structure, drawn in the frame box b = { x, y, w, h }
function frameStart(k, t, b, fx, size, ph) {
  const pic = (x, y, w, h, o = {}) => k.photo(ph, x, y, w, h, { size, ex: o.fx ?? fx, align: alignFor(ph, t, o.align || "xMidYMid") });
  const half = (x0, w0, f, al) => `<g${k.clipRect(x0, b.y, w0, b.h)}>${pic(b.x, b.y, b.w, b.h, { fx: f, align: al })}</g>`;
  switch (t.structure) {
    case "beforeafter": return pic(b.x, b.y, b.w, b.h) + half(b.x, b.w / 2, look(k, "mono"));
    case "split": return half(b.x, b.w / 2, look(k, "fadedfilm"), "xMinYMid") + half(b.x + b.w / 2, b.w / 2, look(k, "vibrant"), "xMaxYMid");
    case "teamwork": return [0, 1, 2].map((i) => half(b.x + (b.w / 3) * i, b.w / 3, fx, ["xMinYMid", "xMidYMid", "xMaxYMid"][i])).join("");
    case "focuspull": return pic(b.x, b.y, b.w, b.h, { fx: look(k, "bokeh") }) + `<g${k.clip(circle(b.x + b.w * 0.62, b.y + b.h * 0.48, Math.min(b.w, b.h) * 0.3, "#000"))}>${pic(b.x, b.y, b.w, b.h)}</g>`;
    default: return pic(b.x, b.y, b.w, b.h);
  }
}
function overlay(k, t, b, c1, c2) {
  const { x, y, w, h } = b, m = Math.min(w, h), cx = x + w / 2, cy = y + h / 2, s = Math.min(1.15, m / 110), T = THEME[t.theme] || THEMES[0];
  const lbl = (tx, ty, str, o = {}) => text(tx, ty, str, { size: o.size || 6.5 * s + 1.5, weight: o.weight || 800, fill: o.fill || "#fff", anchor: o.anchor || "start", font: o.font || "sans", ls: o.ls ?? 0.6 });
  const bracket = (bx, by, bw, bh, len, col = "#fff") => [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].map(([px, py, dx, dy]) => pathEl(`M${px} ${py + dy * len}V${py}H${px + dx * len}`, "none", ` stroke="${col}" stroke-width="${(1.6 * s + 0.4).toFixed(1)}" stroke-linecap="round"`)).join("");
  const head = (str, sz, col = "#fff") => { const f = fit(str, w * 0.82, { size: sz * s, min: 7, maxLines: 2, font: "display", upper: true }); return text(cx, cy - (f.lines.length - 1) * f.size * 0.5 + f.size * 0.34, f.lines, { size: f.size, weight: 900, fill: col, anchor: "middle", font: "display", upper: true, lh: 1, stroke: "rgba(0,0,0,.25)", sw: 1.5 }); };
  switch (t.structure) {
    case "turntable": return `<ellipse cx="${cx}" cy="${y + h * 0.8}" rx="${w * 0.3}" ry="${h * 0.07}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="${1.6 * s}"/>` + pathEl(`M${cx - w * 0.36} ${y + h * 0.66}q-${w * 0.04} ${h * 0.12} ${w * 0.06} ${h * 0.2}`, "none", ` stroke="${c2}" stroke-width="${2 * s}" stroke-linecap="round"`) + lbl(x + w - 10, y + h * 0.2, "360°", { anchor: "end", size: 11 * s });
    case "logo": return circle(cx, cy - h * 0.05, m * 0.2, "none", ` stroke="#fff" stroke-width="${3 * s}"` + k.glow(c2, 3)) + text(cx, cy - h * 0.05 + m * 0.07, T.org.split(" ").map((p) => p[0]).join("").slice(0, 2), { size: m * 0.18, weight: 900, fill: "#fff", anchor: "middle" }) + lbl(cx, cy + m * 0.3, one(T.org.toUpperCase(), w * 0.8, 6.5 * s + 1.5), { anchor: "middle", ls: 1 });
    case "title": case "kinetic": { if (t.structure === "title") return head(T.headline, 26) + rect(cx - w * 0.1, cy + m * 0.22, w * 0.2, 2.5 * s, c2, 1);
      const ws = T.headline.split(" "); return ws.map((wd, i) => `<g transform="rotate(-6 ${cx} ${cy})">` + text(cx, cy - (ws.length - 1) * 12.5 * s + i * 25 * s + 8 * s, wd.toUpperCase(), { size: 21 * s, weight: 900, fill: i % 2 ? c2 : "#fff", anchor: "middle", font: "display" }) + `</g>`).join(""); }
    case "beforeafter": case "split": return line(cx, y, cx, y + h, "#fff", 2) + circle(cx, cy, 9 * s, "#fff", k.shadow(2, 5, 0.3)) + pathEl(`M${cx - 5 * s} ${cy}l${3.5 * s} -${3 * s}v${6 * s}zM${cx + 5 * s} ${cy}l-${3.5 * s} -${3 * s}v${6 * s}z`, "#111") + k.pill(x + 8, y + h - 22 * s, "BEFORE", { size: 5.5 * s + 1, fill: "#000", color: "#fff" }).svg + k.pill(x + w - 8, y + h - 22 * s, "AFTER", { size: 5.5 * s + 1, fill: c2, color: ink(c2), anchor: "end" }).svg;
    case "drone": return bracket(x + w * 0.08, y + h * 0.12, w * 0.84, h * 0.76, 12 * s) + circle(cx, cy, 5 * s, "none", ' stroke="#fff" stroke-width="1.2"') + line(cx - 10 * s, cy, cx + 10 * s, cy, "#fff", 1) + lbl(x + w * 0.1, y + h * 0.1 - 2, "ALT 120 M · 4K", { font: "mono" }) + rect(x + w * 0.86, y + h * 0.06, 14 * s, 6 * s, "none", 1, ' stroke="#fff" stroke-width="1"') + rect(x + w * 0.86 + 1.5, y + h * 0.06 + 1.5, 9 * s, 6 * s - 3, "#4ade80");
    case "walk": case "pov": return [1, 2].map((i) => line(x + (w / 3) * i, y, x + (w / 3) * i, y + h, "#fff", 0.6, ' opacity=".45"') + line(x, y + (h / 3) * i, x + w, y + (h / 3) * i, "#fff", 0.6, ' opacity=".45"')).join("") + circle(x + 14 * s, y + 14 * s, 3.5 * s, "#ef4444") + lbl(x + 21 * s, y + 16.5 * s, t.structure === "pov" ? "POV · REC" : "REC 00:08", { font: "mono" });
    case "timelapse": return pathEl(`M${x + w * 0.55} ${y}H${x + w}V${y + h}H${x + w * 0.35}Z`, "#0b1240", ' opacity=".55"') + circle(x + w * 0.16, y + h * 0.2, 9 * s, "#fde047") + pathEl(`M${x + w * 0.86} ${y + h * 0.12}a${9 * s} ${9 * s} 0 1 0 ${6 * s} ${15 * s} ${7 * s} ${7 * s} 0 1 1 -${6 * s} -${15 * s}z`, "#e0e7ff") + k.pill(cx, y + h - 24 * s, "6 AM  →  9 PM", { size: 6 * s + 1, fill: "#fff", color: "#111", anchor: "middle" }).svg;
    case "night": { const ns = fit(T.org, w * 0.8, { size: 17 * s, min: 7, maxLines: 1, font: "script" }).size; return text(cx, cy + 6 * s, T.org, { size: ns, weight: 800, fill: "none", stroke: c2, sw: 1.6 * s, anchor: "middle", font: "script", ex: k.glow(c2, 2.5) }) + text(cx, cy + 6 * s, T.org, { size: ns, weight: 800, fill: "#fff", anchor: "middle", font: "script", opacity: 0.85 }); }
    case "festive": case "confetti": { const R = rng(t.id); let o = ""; for (let i = 0; i < 26; i++) { const px = x + R() * w, py = y + R() * h; o += t.structure === "festive" ? circle(px, py, (2 + R() * 6) * s, ["#fde68a", "#fff", "#fca5a5"][i % 3], ` opacity="${(0.25 + R() * 0.5).toFixed(2)}"`) : rect(px, py, 4 * s, 7 * s, ["#f43f5e", "#facc15", "#22d3ee", "#a78bfa", "#4ade80"][i % 5], 1, ` transform="rotate(${Math.round(R() * 90)} ${px.toFixed(1)} ${py.toFixed(1)})"`); }
      return o + (t.structure === "confetti" ? head(T.headline, 22) : ""); }
    case "macro": case "focuspull": return circle(x + w * (t.structure === "macro" ? 0.5 : 0.62), y + h * 0.48, m * 0.3, "none", ` stroke="#fff" stroke-width="${1.4 * s}" stroke-dasharray="${4 * s} ${3 * s}"`) + bracket(x + w * (t.structure === "macro" ? 0.5 : 0.62) - m * 0.36, y + h * 0.48 - m * 0.36, m * 0.72, m * 0.72, 8 * s, c2) + lbl(x + 10, y + h - 10, t.structure === "macro" ? "MACRO 1:1 · f/2.8" : "FOCUS PULL", { font: "mono" });
    case "slowmo": case "pour": return [0, 1, 2].map((i) => line(x + w * 0.1, y + h * (0.35 + i * 0.12), x + w * (0.45 - i * 0.08), y + h * (0.35 + i * 0.12), "#fff", 2 * s, ` opacity="${0.7 - i * 0.2}"`)).join("") + k.pill(x + w - 8, y + 8, t.structure === "pour" ? "SLOW POUR · 0.25×" : "120 FPS · 0.25×", { size: 5.5 * s + 1, fill: c2, color: ink(c2), anchor: "end" }).svg;
    case "hands": case "interview": case "teamwork": { const bw = Math.min(w * 0.7, 150 * s), by = y + h * 0.7; return rect(x + 10, by, bw, 15 * s, "#fff", 2) + rect(x + 10, by, 4 * s, 15 * s, c2) + text(x + 10 + 8 * s, by + 10 * s, t.structure === "interview" ? "Happy customer" : t.structure === "teamwork" ? "Meet the team" : "Handmade", { size: 7 * s + 1, weight: 900, fill: "#111" }) + rect(x + 10, by + 15 * s, bw * 0.75, 10 * s, c1) + text(x + 10 + 8 * s, by + 22.5 * s, T.org, { size: 5.5 * s + 1, weight: 700, fill: ink(c1) }) + (t.structure === "interview" ? circle(x + w - 14 * s, y + 14 * s, 3.5 * s, "#ef4444") + lbl(x + w - 20 * s, y + 16.5 * s, "REC", { anchor: "end", font: "mono" }) : ""); }
    case "papercut": return [0, 1, 2].map((i) => pathEl(`M${x} ${y + h * (0.62 + i * 0.12)}q${w * 0.25} -${h * 0.12} ${w * 0.5} 0t${w * 0.5} 0V${y + h}H${x}Z`, [mix(c1, "#ffffff", 0.6), mix(c1, "#ffffff", 0.35), c1][i], k.shadow(-2, 4, 0.3))).join("");
    case "mascot": { const mx = x + w * 0.3, my = y + h * 0.62, r = m * 0.2; return circle(mx, my, r, c2, k.shadow(3, 6, 0.3)) + circle(mx - r * 0.35, my - r * 0.15, r * 0.16, "#fff") + circle(mx + r * 0.35, my - r * 0.15, r * 0.16, "#fff") + circle(mx - r * 0.35, my - r * 0.12, r * 0.07, "#111") + circle(mx + r * 0.35, my - r * 0.12, r * 0.07, "#111") + pathEl(`M${mx - r * 0.3} ${my + r * 0.25}q${r * 0.3} ${r * 0.3} ${r * 0.6} 0`, "none", ` stroke="#111" stroke-width="${1.4 * s}" stroke-linecap="round"`) + pathEl(`M${mx + r * 0.9} ${my - r * 0.2}l${r * 0.5} -${r * 0.7}`, "none", ` stroke="${c2}" stroke-width="${r * 0.28}" stroke-linecap="round"`) + rect(mx + r * 1.3, my - r * 2.1, 46 * s, 18 * s, "#fff", 9 * s, k.shadow(2, 4, 0.2)) + text(mx + r * 1.3 + 23 * s, my - r * 2.1 + 12.5 * s, "Hello!", { size: 8 * s + 1, weight: 900, fill: "#111", anchor: "middle" }); }
    case "loop": return k.blob(x + w * 0.25, y + h * 0.3, m * 0.25, "#fff", { ex: ' opacity=".18"' }) + k.blob(x + w * 0.75, y + h * 0.7, m * 0.3, c2, { ex: ' opacity=".3"' }) + k.pill(x + w - 8, y + 8, "∞ SEAMLESS LOOP", { size: 5.5 * s + 1, fill: "#fff", color: "#111", anchor: "end" }).svg;
    case "unbox": { const bx = cx - 26 * s, by = y + h * 0.58; return rect(bx, by, 52 * s, 30 * s, c2, 3, k.shadow(3, 6, 0.3)) + rect(bx - 3 * s, by - 9 * s, 58 * s, 10 * s, mix(c2, "#ffffff", 0.25), 3) + rect(cx - 4 * s, by - 9 * s, 8 * s, 39 * s, "#fff") + sparkle(cx - 34 * s, by - 16 * s, 5 * s, "#fde047") + sparkle(cx + 36 * s, by - 22 * s, 7 * s, "#fff"); }
    case "flatlay": return circle(cx, cy, m * 0.32, "none", ' stroke="#fff" stroke-width="1" stroke-dasharray="3 3" opacity=".8"') + line(cx, y + 8, cx, y + h - 8, "#fff", 0.6, ' opacity=".5"') + line(x + 8, cy, x + w - 8, cy, "#fff", 0.6, ' opacity=".5"') + lbl(x + 10, y + 16 * s, "TOP VIEW", { font: "mono" });
    case "pricetag": { const tx = cx - 36 * s, ty = cy - 18 * s; return `<g transform="rotate(-8 ${cx} ${cy})">` + pathEl(`M${tx} ${ty}h${62 * s}l${14 * s} ${18 * s}l-${14 * s} ${18 * s}h-${62 * s}z`, "#fff", k.shadow(3, 6, 0.3)) + circle(tx + 66 * s, cy, 3 * s, c1) + text(tx + 31 * s, cy + 3 * s, fit(T.headline, 56 * s, { size: 9 * s, min: 4.5, maxLines: 1 }).lines, { size: fit(T.headline, 56 * s, { size: 9 * s, min: 4.5, maxLines: 1 }).size, weight: 900, fill: c1, anchor: "middle" }) + `</g>` + sparkle(x + w * 0.2, y + h * 0.25, 6 * s, "#fde047") + sparkle(x + w * 0.8, y + h * 0.75, 5 * s, "#fff"); }
    case "dolly": return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, bb]) => line(x + a * w, y + bb * h, cx + (a ? 14 : -14) * s, cy + (bb ? 9 : -9) * s, "#fff", 0.8, ' opacity=".55"')).join("") + rect(cx - 14 * s, cy - 9 * s, 28 * s, 18 * s, "none", 2, ' stroke="#fff" stroke-width="1.4"') + k.pill(x + 8, y + 8, "DOLLY IN →", { size: 5.5 * s + 1, fill: "#fff", color: "#111" }).svg;
    case "rain": { const R = rng(t.id + "r"); let o = ""; for (let i = 0; i < 34; i++) { const px = x + R() * w, py = y + R() * h; o += line(px, py, px - 3 * s, py + 9 * s, "#fff", 0.8, ` opacity="${(0.25 + R() * 0.4).toFixed(2)}"`); } return o + circle(x + w * 0.7, y + h * 0.3, 3 * s, "none", ' stroke="#fff" opacity=".6"') + circle(x + w * 0.3, y + h * 0.6, 2.4 * s, "none", ' stroke="#fff" opacity=".6"'); }
    case "sunrise": return rect(x, y, w, h, k.rad([["#fde68a", 0.75], ["#fb923c", 0.2], ["#fb923c", 0]], 0.25, 0.15, 0.7)) + [0, 1, 2, 3].map((i) => pathEl(`M${x + w * 0.25} ${y + h * 0.15}L${x + w * (0.55 + i * 0.12)} ${y + h}L${x + w * (0.6 + i * 0.12)} ${y + h}Z`, "#fff", ' opacity=".07"')).join("");
    case "aerial-map": return rect(x, y, w, h, k.pattern(18 * s, 18 * s, `<path d="M0 ${9 * s}H${18 * s}M${9 * s} 0V${18 * s}" stroke="#fff" stroke-width=".7" opacity=".45"/>`)) + pathEl(`M${x} ${y + h * 0.8}Q${cx} ${y + h * 0.3} ${x + w} ${y + h * 0.45}`, "none", ` stroke="${c2}" stroke-width="${2.5 * s}"`) + pathEl(`M${cx} ${cy + 4 * s}s-${11 * s} -${12 * s} -${11 * s} -${19 * s}a${11 * s} ${11 * s} 0 0 1 ${22 * s} 0c0 ${7 * s} -${11 * s} ${19 * s} -${11 * s} ${19 * s}z`, "#ef4444", k.shadow(2, 4, 0.3)) + circle(cx, cy - 15 * s, 4 * s, "#fff") + k.pill(cx, cy + 10 * s, T.headline, { size: 6 * s + 1, fill: "#fff", color: "#111", anchor: "middle" }).svg;
    case "crowd": return [0, 1, 2, 3].map((i) => pathEl(`M${x + w * 0.85} ${y + h * (0.82 - i * 0.18)}m0 ${4 * s}s-${7 * s} -${4 * s} -${7 * s} -${8 * s}a${3.5 * s} ${3.5 * s} 0 0 1 ${7 * s} -${1 * s}a${3.5 * s} ${3.5 * s} 0 0 1 ${7 * s} ${1 * s}c0 ${4 * s} -${7 * s} ${8 * s} -${7 * s} ${8 * s}z`, ["#f43f5e", "#fb7185", "#fff", "#f43f5e"][i], ` opacity="${0.95 - i * 0.18}"`)).join("") + k.pill(x + 8, y + 8, "● LIVE", { size: 5.5 * s + 1, fill: "#ef4444", color: "#fff" }).svg;
    case "spin360": return `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.38}" ry="${h * 0.16}" fill="none" stroke="#fff" stroke-width="${1.4 * s}" stroke-dasharray="${5 * s} ${3 * s}"/>` + circle(cx + w * 0.38, cy, 7 * s, c2) + icon("camera", cx + w * 0.38 - 5 * s, cy - 5 * s, 10 * s, ink(c2), 2) + lbl(x + 10, y + 16 * s, "360° ORBIT", { font: "mono" });
    case "stopmotion": return Array.from({ length: 12 }, (_, i) => rect(x + 6 + i * (w - 12) / 12, y + 3, (w - 12) / 24, 5 * s, "#fff", 1, ' opacity=".8"') + rect(x + 6 + i * (w - 12) / 12, y + h - 3 - 5 * s, (w - 12) / 24, 5 * s, "#fff", 1, ' opacity=".8"')).join("") + lbl(x + 10, y + 20 * s, "FRAME 12 / 48", { font: "mono" });
    case "doodle": return pathEl(`M${cx - w * 0.22} ${cy}c0 -${h * 0.3} ${w * 0.44} -${h * 0.3} ${w * 0.44} 0s-${w * 0.42} ${h * 0.3} -${w * 0.44} 0`, "none", ` stroke="${c1}" stroke-width="${2 * s}" stroke-linecap="round"`) + pathEl(`M${x + w * 0.12} ${y + h * 0.82}q${w * 0.15} -${h * 0.2} ${w * 0.28} -${h * 0.06}m-${8 * s} -${6 * s}l${8 * s} ${6 * s}-${9 * s} ${3 * s}`, "none", ` stroke="${c1}" stroke-width="${2 * s}" stroke-linecap="round" stroke-linejoin="round"`) + sparkle(x + w * 0.82, y + h * 0.22, 7 * s, c2);
    case "clay": return [[0.12, 0.2, 9, c2], [0.88, 0.78, 12, c1], [0.85, 0.18, 6, "#fde047"]].map(([px, py, r, col]) => circle(x + w * px, y + h * py, r * s, k.rad([[mix(col, "#ffffff", 0.5), 1], [col, 1], [mix(col, "#000000", 0.3), 1]], 0.35, 0.3, 0.8))).join("");
    case "pixel": return rect(x, y, w, h, pixelGrid(k, 4.5 * s)) + text(cx, y + h * 0.84, "PRESS START", { size: 8 * s + 1, weight: 900, fill: "#fff", anchor: "middle", font: "mono", stroke: "#000", sw: 2 }) + [0, 1, 2].map((i) => rect(x + 10 + i * 9 * s, y + 10, 7 * s, 7 * s, "#ef4444", 0, ' stroke="#000" stroke-width="1"')).join("");
    case "countdown": return circle(cx, cy, m * 0.3, "#000", ' opacity=".35"') + circle(cx, cy, m * 0.3, "none", ` stroke="#fff" stroke-opacity=".3" stroke-width="${4 * s}"`) + circle(cx, cy, m * 0.3, "none", ` stroke="${c2}" stroke-width="${4 * s}" stroke-dasharray="${(m * 0.3 * Math.PI * 2 * 0.66).toFixed(1)} 999" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"`) + text(cx, cy + m * 0.13, "3", { size: m * 0.38, weight: 900, fill: "#fff", anchor: "middle", font: "display" });
    case "seasons": return ["#86efac", "#fde047", "#fb923c", "#bfdbfe"].map((col, i) => rect(x + (w / 4) * i, y, w / 4, h, col, 0, ' opacity=".28"') + text(x + (w / 4) * (i + 0.5), y + h - 8, ["SPRING", "SUMMER", "AUTUMN", "WINTER"][i], { size: 5 * s + 1, weight: 800, fill: "#fff", anchor: "middle", ls: 0.6 })).join("") + [1, 2, 3].map((i) => line(x + (w / 4) * i, y, x + (w / 4) * i, y + h, "#fff", 0.8, ' opacity=".6"')).join("");
    case "underwater": return [0, 1, 2].map((i) => pathEl(`M${x + w * (0.2 + i * 0.25)} ${y}L${x + w * (0.1 + i * 0.3)} ${y + h}L${x + w * (0.22 + i * 0.3)} ${y + h}Z`, "#fff", ' opacity=".12"')).join("") + [[0.2, 0.7, 4], [0.25, 0.55, 2.5], [0.78, 0.6, 3.5], [0.74, 0.4, 2]].map(([px, py, r]) => circle(x + w * px, y + h * py, r * s, "none", ' stroke="#fff" stroke-width="1" opacity=".8"')).join("");
    case "outro-card": return rect(x, y, w, h, "#000", 0, ' opacity=".45"') + circle(x + w * 0.24, cy - 6 * s, m * 0.14, c2) + text(x + w * 0.24, cy - 6 * s + m * 0.05, T.org.split(" ").map((p) => p[0]).join("").slice(0, 2), { size: m * 0.12, weight: 900, fill: ink(c2), anchor: "middle" }) + rect(x + w * 0.24 - 24 * s, cy + m * 0.16, 48 * s, 12 * s, "#ef4444", 6 * s) + text(x + w * 0.24, cy + m * 0.16 + 8.3 * s, "Subscribe", { size: 6 * s + 1, weight: 800, fill: "#fff", anchor: "middle" }) + [0, 1].map((i) => rect(x + w * 0.48, y + h * (0.16 + i * 0.38), w * 0.44, h * 0.3, "none", 4, ' stroke="#fff" stroke-width="1.4"') + lbl(x + w * 0.5, y + h * (0.16 + i * 0.38) + 12 * s, i ? "Watch next" : "Latest video")).join("");
    default: return "";
  }
}
const CENTER_BUSY = new Set(["night", "title", "kinetic", "countdown", "logo", "pricetag", "confetti", "outro-card", "spin360", "beforeafter", "split", "aerial-map", "macro", "turntable"]);
function videoArt(t, size) {
  const k = kit(t.id, size === "full" ? "full" : "");
  const [c1, c2] = t.colors, T = THEME[t.theme] || THEMES[0], ph = mediaPhoto(t), o = t.options;
  const fx = look(k, KEY_LOOK[t.structure] || STYLE_LOOK[o.style] || "photo", { colors: [mix(c1, "#000000", 0.6), mix(c2, "#ffffff", 0.3)] });
  const styleL = `${STYLE_NAME[o.style] || "Cinematic"} · ${o.duration} s`;
  const play = (cx, cy, r) => k.play(cx, cy, r, { fill: "#fff", color: c1, ring: true });
  let s = "";
  if (o.aspect === "16:9") {
    const b = { x: 16, y: 6, w: 288, h: 142 };
    s += rect(0, 0, W, H, k.lin(["#141826", "#07080d"], 90)) + `<g${k.clipRect(b.x, b.y, b.w, b.h, 6)}>` + frameStart(k, t, b, fx, size, ph);
    if (o.style === "cinematic") s += rect(b.x, b.y, b.w, 11, "#000", 0, ' opacity=".85"') + rect(b.x, b.y + b.h - 11, b.w, 11, "#000", 0, ' opacity=".85"');
    s += overlay(k, t, b, c1, c2) + `</g>`;
    s += k.pill(b.x + 8, b.y + 8, "✦ " + styleL, { size: 6.4, fill: "#fff", color: "#111", weight: 800 }).svg;
    if (!CENTER_BUSY.has(t.structure)) s += play(160, b.y + b.h * 0.48, 15);
    s += circle(b.x + 4, 160, 3.5, c2) + text(b.x + 12, 162.5, one(t.prompt, b.w - 64, 7.2), { size: 7.2, fill: "#e2e8f0", weight: 600 }) + text(b.x + b.w, 162.5, `0:03 / 0:${String(o.duration).padStart(2, "0")}`, { size: 6.5, fill: "#fff", anchor: "end", weight: 700, font: "mono" });
    const n = 6, tw = (b.w - (n - 1) * 4) / n, al = ["xMinYMin", "xMidYMid", "xMaxYMax", "xMinYMax", "xMaxYMin", "xMidYMid"];
    for (let i = 0; i < n; i++) s += k.photo(ph, b.x + i * (tw + 4), 170, tw, 24, { size, rx: 3, ex: fx, align: alignFor(ph, t, al[i]) }) + (i === 2 ? rect(b.x + i * (tw + 4), 170, tw, 24, "none", 3, ` stroke="${c2}" stroke-width="1.6"`) : "");
    s += line(b.x + 2 * (tw + 4) + tw * 0.6, 167, b.x + 2 * (tw + 4) + tw * 0.6, 197, "#fff", 1.4) + circle(b.x + 2 * (tw + 4) + tw * 0.6, 167, 3, "#fff");
  } else if (o.aspect === "9:16") {
    s += rect(0, 0, W, H, k.lin([c1, c2], 135)) + k.blob(70, 170, 80, "#fff", { ex: ' opacity=".1"' }) + rect(0, 0, W, H, k.dots("#fff", 11, 1, 0.14));
    const p = k.phone(206, 5, 102, 190), b = { x: p.x, y: p.y, w: p.w, h: p.h };
    s += p.svg + `<g${k.clipRect(b.x, b.y, b.w, b.h, p.rx)}>` + frameStart(k, t, b, fx, size, ph) + overlay(k, t, { x: b.x, y: b.y + 22, w: b.w - 18, h: b.h - 76 }, c1, c2) + k.scrim(b.x, b.y + b.h * 0.55, b.w, b.h * 0.45, "#000", 0, 0.7) + k.scrim(b.x, b.y, b.w, 30, "#000", 0, 0.4, "down") + `</g>`;
    s += text(b.x + 8, b.y + 15, "Reels", { size: 8, weight: 800, fill: "#fff" }) + icon("camera", b.x + b.w - 17, b.y + 7, 10, "#fff", 2);
    ["heart", "quote", "arrow"].forEach((ic, i) => { s += icon(ic, b.x + b.w - 15, b.y + b.h * 0.5 + i * 20, 10, "#fff", 2.2) + text(b.x + b.w - 10, b.y + b.h * 0.5 + i * 20 + 16, ["2.4k", "128", "Share"][i], { size: 4.6, fill: "#fff", anchor: "middle", weight: 700 }); });
    s += circle(b.x + 12, b.y + b.h - 44, 5.5, c2, ' stroke="#fff" stroke-width="1"') + text(b.x + 21, b.y + b.h - 41.5, "@" + T.org.toLowerCase().replace(/[^a-z]+/g, ""), { size: 6, weight: 800, fill: "#fff" });
    s += text(b.x + 8, b.y + b.h - 28, fit(t.prompt, b.w - 34, { size: 5.6, min: 5.6, maxLines: 2 }).lines, { size: 5.6, fill: "#fff", lh: 1.3, weight: 500 }) + text(b.x + 8, b.y + b.h - 8, "♪ Original audio", { size: 5.2, fill: "#fff", opacity: 0.85 });
    if (!CENTER_BUSY.has(t.structure)) s += play(b.x + b.w / 2, b.y + b.h * 0.42, 12);
    s += rect(b.x + 6, b.y + b.h - 3, b.w - 12, 1.6, "#ffffff", 1, ' opacity=".4"') + rect(b.x + 6, b.y + b.h - 3, (b.w - 12) * 0.38, 1.6, "#fff", 1);
    s += text(18, 30, "AI VIDEO · 9:16 REEL", { size: 7, weight: 800, fill: "#fff", ls: 1, opacity: 0.85 });
    s += headline(18, 38, 176, t.layoutName, { size: 26, min: 13, maxLines: 3, weight: 900, fill: "#fff", lh: 0.94 }).svg;
    const f = fit(t.prompt, 172, { size: 7.4, min: 6.6, maxLines: 4 }); s += text(18, 128, f.lines, { size: f.size, fill: "#fff", opacity: 0.85, lh: 1.32, weight: 500 });
    const ch1 = k.pill(18, 172, STYLE_NAME[o.style] || "Cinematic", { size: 6.6, fill: "#fff", color: c1, weight: 800 }); s += ch1.svg + k.pill(22 + ch1.w, 172, `${o.duration} s · 9:16`, { size: 6.6, fill: "none", color: "#fff", stroke: "#fff", weight: 700 }).svg;
  } else {
    s += rect(0, 0, W, H, k.lin([mix(c1, "#ffffff", 0.86), mix(c2, "#ffffff", 0.92)], 90));
    const b = { x: 16, y: 14, w: 172, h: 172 };
    s += `<g transform="rotate(-5 ${b.x + 86} ${b.y + 86})">` + rect(b.x + 10, b.y + 6, b.w, b.h, "#fff", 10, k.shadow(4, 10, 0.18)) + k.photo(ph, b.x + 16, b.y + 12, b.w - 12, b.h - 12, { size, rx: 8, ex: fx, align: alignFor(ph, t, "xMinYMax"), opacity: 0.6 }) + `</g>`;
    s += rect(b.x, b.y, b.w, b.h, "#000", 10, k.shadow(8, 16, 0.3)) + `<g${k.clipRect(b.x, b.y, b.w, b.h, 10)}>` + frameStart(k, t, b, fx, size, ph) + overlay(k, t, b, c1, c2) + k.scrim(b.x, b.y + b.h * 0.65, b.w, b.h * 0.35, "#000", 0, 0.55) + `</g>`;
    if (!CENTER_BUSY.has(t.structure)) s += play(b.x + b.w / 2, b.y + b.h / 2, 14);
    s += rect(b.x + 10, b.y + b.h - 12, b.w - 20, 2.5, "#ffffff", 1.2, ' opacity=".45"') + rect(b.x + 10, b.y + b.h - 12, (b.w - 20) * 0.45, 2.5, c2, 1.2) ;
    s += text(200, 30, "AI VIDEO · SQUARE POST", { size: 6.6, weight: 800, fill: c1, ls: 1 });
    s += headline(200, 38, 110, t.layoutName, { size: 20, min: 11, maxLines: 3, weight: 900, fill: "#0f172a", lh: 0.96 }).svg;
    const f = fit(t.prompt, 108, { size: 6.8, min: 6.2, maxLines: 5 }); s += text(200, 112, f.lines, { size: f.size, fill: "#334155", lh: 1.32, weight: 500 });
    const ch1 = k.pill(200, 172, STYLE_NAME[o.style] || "Cinematic", { size: 6.2, fill: c1, color: ink(c1), weight: 800 }); s += ch1.svg + k.pill(204 + ch1.w, 172, `${o.duration} s · 1:1`, { size: 6.2, fill: "none", color: "#0f172a", stroke: "#0f172a", weight: 700 }).svg;
  }
  return k.svg(W, H, s);
}

// ----- music: album / track cards; genre sets the picture look and the type
const GENRE = {
  lofi: { look: "fadedfilm", font: "sans", upper: false, w: 800, label: "Lo-fi" }, ambient: { look: "blurwash", font: "sans", upper: true, w: 300, ls: 3, label: "Ambient" },
  acoustic: { look: "sunny", font: "serif", upper: false, w: 700, label: "Acoustic" }, hiphop: { look: "mono", font: "display", upper: true, w: 900, label: "Hip-hop" },
  electronic: { look: "night", font: "mono", upper: true, w: 800, ls: 1, label: "Electronic" }, pop: { look: "vibrant", font: "display", upper: false, w: 900, label: "Pop" },
  cinematic: { look: "cinematic", font: "serif", upper: true, w: 700, ls: 2, label: "Cinematic" }, fusion: { look: "retro", font: "display", upper: true, w: 900, label: "Desi fusion" },
};
const MOOD = { happy: "Happy", calm: "Calm", energetic: "Energetic", inspiring: "Inspiring", sad: "Reflective", dramatic: "Dramatic" };
const BPM = { slow: 75, medium: 100, fast: 128 };
function genreDeco(k, g, x, y, w, h, c1, c2) {
  switch (g) {
    case "electronic": return rect(x, y + h * 0.55, w, h * 0.45, k.pattern(14, 10, `<path d="M0 0H14M0 0V10" stroke="${c2}" stroke-width=".8" opacity=".7"/>`)) + circle(x + w / 2, y + h * 0.52, w * 0.22, k.lin(["#fde047", "#f472b6"], 90), ' opacity=".9"');
    case "lofi": return rect(x + w - 34, y + 10, 26, 26, "#fff", 13, ' opacity=".9"') + text(x + w - 21, y + 26.5, "lo-fi", { size: 7, weight: 800, fill: c1, anchor: "middle" });
    case "ambient": return [0.2, 0.32, 0.44].map((r, i) => circle(x + w / 2, y + h * 0.45, w * r, "none", ` stroke="#fff" stroke-width=".8" opacity="${0.5 - i * 0.12}"`)).join("");
    case "acoustic": return pathEl(`M${x + 12} ${y + h - 12}c${w * 0.2} -${h * 0.12} ${w * 0.4} ${h * 0.05} ${w * 0.6} -${h * 0.06}`, "none", ' stroke="#fff" stroke-width="1.2" opacity=".8"');
    case "hiphop": return rect(x, y + h * 0.36, w, h * 0.2, c2, 0, ' opacity=".92"');
    case "pop": return circle(x + w * 0.82, y + h * 0.2, w * 0.13, c2, ' opacity=".9"') + circle(x + w * 0.62, y + h * 0.1, w * 0.05, "#fff", ' opacity=".85"');
    case "cinematic": return rect(x + 8, y + 8, w - 16, h - 16, "none", 0, ' stroke="#e9c46a" stroke-width="1" opacity=".9"');
    case "fusion": return Array.from({ length: 9 }, (_, i) => circle(x + 10 + i * ((w - 20) / 8), y + 10, 3, i % 2 ? "#fde047" : c2)).join("");
    default: return "";
  }
}
function coverArt(k, t, x, y, w, h, size, ph, fx, g, c1, c2, title = true) {
  const G = GENRE[g] || GENRE.pop, T = THEME[t.theme] || THEMES[0];
  let s = k.photo(ph, x, y, w, h, { size, ex: fx }) + k.scrim(x, y + h * 0.3, w, h * 0.7, mix(c1, "#000000", 0.55), 0, 0.85) + genreDeco(k, g, x, y, w, h, c1, c2);
  if (title) {
    const f = fit(t.layoutName, w - 26, { size: w * 0.15, min: 8, maxLines: 2, font: G.font === "serif" ? "sans" : G.font, upper: G.upper, ls: G.ls || 0 });
    s += text(x + 11, y + h - 22 - (f.lines.length - 1) * f.size * 0.98, f.lines, { size: f.size, weight: G.w, fill: "#fff", font: G.font, upper: G.upper, ls: G.ls || 0, lh: 0.98 });
    s += text(x + 11, y + h - 10, T.org.toUpperCase(), { size: Math.max(5.5, w * 0.04), weight: 800, fill: "#fff", opacity: 0.85, ls: 1 });
  }
  return s;
}
function musicArt(t, size) {
  const k = kit(t.id, size === "full" ? "full" : "");
  const [c1, c2] = t.colors, o = t.options, g = o.genre, G = GENRE[g] || GENRE.pop, T = THEME[t.theme] || THEMES[0], ph = mediaPhoto(t);
  const fx = look(k, G.look, { colors: [mix(c1, "#000000", 0.5), c2] }), dur = o.duration, v = (Number(t.palette.slice(1)) - 1) % 3;
  const chips = (x, y, dark, maxW = 200) => { let xx = x; let s = ""; for (const [lab, f] of [[G.label, true], [MOOD[o.mood] || "Calm", false], [`${BPM[o.tempo] || 100} BPM`, false]]) { const p = k.pill(xx, y, lab, { size: 6.2, fill: f ? c1 : "none", color: f ? ink(c1) : dark ? "#0f172a" : "#fff", stroke: f ? "" : dark ? "#94a3b8" : "#ffffff", weight: 800 }); if (xx + p.w > x + maxW) break; s += p.svg; xx += p.w + 4; } return s; };
  let s = "";
  if (v === 0) {
    s += rect(0, 0, W, H, k.lin([mix(c1, "#000000", 0.55), "#0c0c12"], 120));
    s += rect(14, 18, 168, 168, "#000", 8, ' opacity=".35"' + k.blur(6)) + `<g${k.clipRect(14, 14, 168, 168, 8)}>` + coverArt(k, t, 14, 14, 168, 168, size, ph, fx, g, c1, c2) + `</g>`;
    s += text(194, 30, "NOW PLAYING", { size: 6.4, weight: 800, fill: c2, ls: 1 }) + headline(194, 36, 116, t.layoutName, { size: 17, min: 10, maxLines: 2, weight: 900, fill: "#fff" }).svg;
    s += text(194, 88, T.org, { size: 8, fill: "#cbd5e1", weight: 600 }) + chips(194, 96, false, 116);
    s += k.wave(194, 122, 114, 22, "#475569", { bars: 30, played: 0.42, playedFill: c2 }) + text(194, 156, "0:" + String(Math.round(dur * 0.42)).padStart(2, "0"), { size: 6.2, fill: "#94a3b8" }) + text(308, 156, mmss(dur), { size: 6.2, fill: "#94a3b8", anchor: "end" });
    s += pathEl("M214 168l-8 6 8 6zM207 168h-2v12h2z", "#fff") + circle(251, 174, 12, "#fff") + rect(246.5, 168.5, 3, 11, c1, 1) + rect(252.5, 168.5, 3, 11, c1, 1) + pathEl("M288 168l8 6-8 6zM295 168h2v12h-2z", "#fff");
  } else if (v === 1) {
    s += rect(0, 0, W, H, k.lin([mix(c2, "#ffffff", 0.75), mix(c1, "#ffffff", 0.85)], 90));
    const cx = 210, cy = 100, r = 84;
    s += circle(cx + 2, cy + 4, r, "#000", ' opacity=".25"' + k.blur(5)) + circle(cx, cy, r, "#111114") + [0.9, 0.78, 0.66, 0.54].map((f) => circle(cx, cy, r * f, "none", ' stroke="#ffffff" stroke-opacity=".08" stroke-width="1"')).join("");
    s += circle(cx, cy, r * 0.34, c1) + text(cx, cy - 3, one(t.layoutName.toUpperCase(), r * 0.56, 6.4), { size: 6.4, weight: 900, fill: ink(c1), anchor: "middle" }) + text(cx, cy + 7, `${BPM[o.tempo] || 100} BPM`, { size: 5, fill: ink(c1), anchor: "middle", opacity: 0.8 }) + circle(cx, cy, 3, "#f8fafc");
    s += rect(14, 14, 172, 172, "#000", 4, ' opacity=".3"' + k.blur(5)) + `<g${k.clipRect(12, 12, 172, 172, 3)}>` + coverArt(k, t, 12, 12, 172, 172, size, ph, fx, g, c1, c2) + `</g>`;
    s += k.pill(W - 10, 176, `${mmss(dur)} · ${G.label}`, { size: 6.4, fill: "#0f172a", color: "#fff", anchor: "end", weight: 800 }).svg;
  } else {
    s += coverArt(k, t, 0, 0, W, H, size, ph, fx, g, c1, c2, false) + k.scrim(0, 0, W, 60, "#000", 0, 0.45, "down");
    const word = (G.label.split(" ")[0]).toUpperCase(), f = fit(word, W - 28, { size: 64, min: 30, maxLines: 1, font: "display" });
    s += text(14, 96, word, { size: f.size, weight: 900, fill: "none", stroke: "#ffffff", sw: 1.2, font: "display", opacity: 0.55, ls: -1 });
    s += chips(14, 12, false) + text(W - 14, 22, T.org.toUpperCase(), { size: 6.6, weight: 800, fill: "#fff", anchor: "end", ls: 1 });
    s += headline(14, 106, W - 48, t.layoutName, { size: 24, min: 12, maxLines: 1, weight: 900, fill: "#fff" }).svg + text(14, 150, one(t.prompt, W - 28, 7.2), { size: 7.2, fill: "#fff", opacity: 0.85, weight: 500 });
    s += circle(28, 176, 12, "#fff") + pathEl("M24.5 170L34 176L24.5 182Z", c1) + k.wave(48, 166, 220, 20, "#ffffff", { bars: 60, op: 0.9, played: 0.3, playedFill: c2 }) + k.pill(W - 12, 168, mmss(dur), { size: 6.6, fill: "#fff", color: "#0f172a", anchor: "end", weight: 800 }).svg;
  }
  return k.svg(W, H, s);
}

// ----- voice ideas: the voiceover cards of the text to speech templates (persona, radio spot, podcast cover)
const VOICE_LABEL = Object.fromEntries(VOICE_STYLES.map((v) => [v.value, v.label]));
function voiceIdeaArt(t, size) {
  const v = (Number(t.palette.slice(1)) - 1) % 3, o = t.options;
  return voiceArt({ id: t.id, key: t.structure, name: t.layoutName, theme: VTBY[t.theme], script: t.prompt, colors: t.colors, ai: true, speed: o.speed, voiceLabel: "AI voice · " + (VOICE_LABEL[o.voice] || "Warm (female)"), languageLabel: "English",
    // the persona photo is a woman or a man like the chosen voice (storyteller / news reader: the narrator kind decides)
    voiceStyle: o.voice, voiceSex: /female/.test(o.voice || "warm-female") ? "f" : /male/.test(o.voice) ? "m" : null }, 3 + v, size);
}
const THEME = Object.fromEntries(THEMES.map((x) => [x.key, x]));
/** The idea's design as SVG (320×200); size "full" uses full-size photos (the opened template's preview). */
export function design(id, size = "thumb") {
  const t = byId(id) || TEMPLATES[0];
  return t.kind === "video" ? videoArt(t, size) : t.kind === "music" ? musicArt(t, size) : voiceIdeaArt(t, size);
}
/** Thumbnail: the idea's design with small photo files. */
export function thumb(id) { return design(id, "thumb"); }
