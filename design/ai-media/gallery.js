// AI video, music and voice generators: prompt idea templates (pure module, no DOM), built by a generator per tool:
// hand-written prompt STRUCTURES x content THEMES (purposes / industries) x own colour PALETTES (thumbnails), with the
// style / shape / length options varied per idea. Ids encode the combination ("vid-drone~p03~travel"); byId(id) and
// thumb(id) rebuild any of them from the id. A template only fills the prompt and the options; it never makes a result
// (results only ever come from AsaanDesk AI when it is switched on). All prompts and artwork are our own.
import { SCRIPT_LAYOUTS, SCRIPT_THEMES } from "../voice/gallery.js";

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
    themeName: t.label, layout: `${pre}-${s.key}`, layoutName: s.name,
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
export const LAYOUTS = VIDEO.length + MUSIC.length + SCRIPT_LAYOUTS.length;
/** Per tool slug: { total, layouts }. */
export const COUNTS = { [SLUG.video]: { total: TEMPLATES.filter((x) => x.kind === "video").length, layouts: VIDEO.length }, [SLUG.music]: { total: TEMPLATES.filter((x) => x.kind === "music").length, layouts: MUSIC.length }, [SLUG.voice]: { total: TEMPLATES.filter((x) => x.kind === "voice").length, layouts: SCRIPT_LAYOUTS.length } };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fit = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const ART = {
  video: (a) => `<g transform="translate(206 44)"><rect width="92" height="64" rx="8" fill="#fff" opacity=".95"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${8 + i * 17}" y="5" width="9" height="6" rx="1.5" fill="${a}" opacity=".5"/><rect x="${8 + i * 17}" y="53" width="9" height="6" rx="1.5" fill="${a}" opacity=".5"/>`).join("")}<path d="M38 20v24l20-12z" fill="${a}"/></g>`,
  music: () => `<g transform="translate(214 40)" fill="#fff"><path d="M22 6l46-8v48a10 10 0 1 1-6-9V10l-34 6v38a10 10 0 1 1-6-9z"/></g>`,
  voice: () => `<g transform="translate(222 38)" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"><rect x="16" y="4" width="22" height="40" rx="11" fill="#fff"/><path d="M6 32q21 30 42 0M27 54v14M16 70h22M58 18q8 14 0 28M68 10q14 22 0 44"/></g>`,
};
/** Thumbnail: own artwork (gradient card, tool icon, idea name, theme and the first words of the prompt). */
export function thumb(id) {
  const t = byId(id) || TEMPLATES[0];
  const [a, b] = t.colors, gid = "am" + t.id.replace(/[^a-z0-9]/gi, "");
  const label = { video: "AI video idea", music: "AI music idea", voice: "AI voice idea" }[t.kind];
  const [nm, th] = t.name.split(": ");
  const words = t.prompt.replace(/\s+/g, " ").split(" ").slice(0, 7).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + `<rect width="320" height="200" rx="14" fill="url(#${gid})"/><circle cx="40" cy="180" r="70" fill="#fff" opacity=".07"/>`
    + `<rect x="20" y="20" width="${label.length * 6.6 + 18}" height="22" rx="11" fill="#fff" opacity=".22"/><text x="29" y="35" font-family="system-ui,Segoe UI,Arial" font-size="11.5" font-weight="700" fill="#fff">${label}</text>`
    + ART[t.kind](a)
    + `<text x="20" y="132" font-family="system-ui,Segoe UI,Arial" font-size="20" font-weight="800" fill="#fff">${esc(fit(nm, 24))}</text>`
    + `<text x="20" y="154" font-family="system-ui,Segoe UI,Arial" font-size="12.5" font-weight="700" fill="#fff" opacity=".9">${esc(th || "")}</text>`
    + `<text x="20" y="176" font-family="system-ui,Segoe UI,Arial" font-size="11.5" fill="#fff" opacity=".8">${esc(fit(words, 46))}</text></svg>`;
}
