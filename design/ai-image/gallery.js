// AI image / AI art generator presets (editor Templates panel + the intro pages). Pure ES module, no DOM.
// A template here is a ready prompt + style + shape: it fills the form; pictures only come from AsaanDesk AI.
const P = (id, name, tool, section, style, aspect, prompt, tags, c) => ({ id, name, tool, section, style, aspect, prompt, tags, c });
const LIST = [
  P("product-photo", "Product photo", "ai-image-generator", "Photos", "photo", "1:1", "A handmade ceramic mug on a light wooden table, soft morning light, clean background", ["product", "shop", "photo"], ["#f5efe6", "#c2410c", "#7c5c3b"]),
  P("food-shot", "Food close-up", "ai-image-generator", "Photos", "photo", "4:5", "A plate of steaming biryani with raita, top view, warm restaurant light", ["food", "menu", "restaurant"], ["#fff1e0", "#d9480f", "#eab308"]),
  P("travel-poster", "Travel scene", "ai-image-generator", "Photos", "photo", "16:9", "Snowy mountains above a quiet green valley at sunrise, wide view", ["travel", "landscape", "mountains"], ["#dbeafe", "#2563eb", "#16a34a"]),
  P("social-story", "Story background", "ai-image-generator", "For social media", "minimal", "9:16", "Soft pastel shapes and gentle gradients, plenty of empty space for text", ["story", "background", "social"], ["#fce7f3", "#db2777", "#8b5cf6"]),
  P("blog-header", "Blog header", "ai-image-generator", "For social media", "minimal", "16:9", "A desk with a laptop, a notebook and a cup of tea, flat illustration", ["blog", "header", "work"], ["#ecebff", "#5b4cf0", "#14b8a6"]),
  P("app-icon", "3D icon", "ai-image-generator", "For social media", "3d", "1:1", "A cute 3D rocket icon with rounded shapes, studio light, plain background", ["icon", "3d", "app"], ["#e0f2fe", "#0ea5e9", "#f97316"]),
  P("portrait-anime", "Anime avatar", "ai-image-generator", "People and characters", "anime", "1:1", "A friendly young student with a backpack, anime style avatar, bright colours", ["avatar", "profile", "anime"], ["#ede9fe", "#7c3aed", "#f472b6"]),
  P("kids-book", "Storybook scene", "ai-image-generator", "People and characters", "watercolour", "3:2", "A little girl flying a kite on a rooftop at sunset, storybook illustration", ["kids", "story", "book"], ["#fef3c7", "#f59e0b", "#0f9488"]),
  P("truck-peacock", "Truck art peacock", "ai-art-generator", "Folk and pattern art", "truck-art", "4:5", "A proud peacock with bright tail feathers, framed by flowers and bold borders", ["truck art", "peacock", "folk"], ["#fde68a", "#e11d48", "#16a34a"]),
  P("truck-rickshaw", "Painted rickshaw", "ai-art-generator", "Folk and pattern art", "truck-art", "16:9", "A colourful rickshaw covered in painted flowers and mirrors on a busy street", ["rickshaw", "street", "colour"], ["#fef9c3", "#2563eb", "#dc2626"]),
  P("watercolour-city", "Watercolour city", "ai-art-generator", "Paintings", "watercolour", "3:2", "Old city lanes with arches and balconies in soft watercolour washes", ["city", "painting", "architecture"], ["#e0f2fe", "#0369a1", "#d97706"]),
  P("watercolour-flowers", "Flower painting", "ai-art-generator", "Paintings", "watercolour", "4:5", "A loose bunch of roses and jasmine in a glass jar, watercolour on paper", ["flowers", "painting", "gift"], ["#ffe4e6", "#e11d48", "#22c55e"]),
  P("pencil-portrait", "Pencil sketch", "ai-art-generator", "Sketches", "pencil", "4:5", "An old man reading a newspaper by a window, detailed pencil sketch", ["sketch", "portrait", "drawing"], ["#f3f4f6", "#374151", "#9ca3af"]),
  P("pencil-building", "Building sketch", "ai-art-generator", "Sketches", "pencil", "3:2", "A historic fort gate with tall walls, architectural pencil drawing", ["architecture", "sketch", "history"], ["#f5f5f4", "#44403c", "#a8a29e"]),
  P("minimal-poster", "Minimal poster", "ai-art-generator", "Modern art", "minimal", "4:5", "A single crescent moon over calm water, minimal poster with two colours", ["poster", "minimal", "wall art"], ["#1e1b4b", "#fbbf24", "#6366f1"]),
  P("clay-animals", "Clay animals", "ai-art-generator", "Modern art", "3d", "1:1", "A family of cute clay ducks crossing a tiny road, soft 3D clay look", ["3d", "cute", "kids"], ["#dcfce7", "#16a34a", "#f59e0b"]),
];
// Generated starters: our own recipes (style + shape + how the picture is framed) × subjects. id "<recipe>~<subject>".
const SUBJECTS = [
  ["lake", "Mountain lake", "a calm mountain lake at sunrise with pine trees", ["#dbeafe", "#2563eb", "#16a34a"]],
  ["market", "Fruit market", "a busy fruit market with baskets of oranges and bananas", ["#fef3c7", "#ea580c", "#16a34a"]],
  ["tea", "Tea time", "a cup of tea with biscuits on a small wooden tray", ["#fdf2e9", "#b45309", "#7c2d12"]],
  ["bicycle", "Red bicycle", "a red vintage bicycle leaning on a blue wall", ["#e0f2fe", "#dc2626", "#0369a1"]],
  ["cat", "Sleepy cat", "a ginger cat sleeping on a sunny windowsill", ["#fff7ed", "#f97316", "#78350f"]],
  ["lighthouse", "Lighthouse", "a white lighthouse by a rocky sea at dusk", ["#e0e7ff", "#4f46e5", "#f43f5e"]],
  ["mangoes", "Fresh mangoes", "a bowl of ripe yellow mangoes with green leaves", ["#fefce8", "#eab308", "#15803d"]],
  ["reader", "Reading under a tree", "a girl reading a book under a big shady tree", ["#ecfccb", "#65a30d", "#7c3aed"]],
  ["gate", "Old city gate", "an old city gate with arches and a busy street", ["#fef2f2", "#b91c1c", "#a16207"]],
  ["balloons", "Balloon festival", "colourful hot air balloons over green hills", ["#f0f9ff", "#e11d48", "#f59e0b"]],
  ["caravan", "Desert caravan", "a camel caravan crossing golden sand dunes", ["#fffbeb", "#d97706", "#92400e"]],
  ["corner", "Cosy corner", "a cosy reading corner with plants and a soft lamp", ["#f5f3ff", "#8b5cf6", "#16a34a"]],
];
const RECIPES = [
  ["studio", "Studio photo", "ai-image-generator", "Photos", "photo", "1:1", (s) => `${s}, clean background, soft studio light`],
  ["wide", "Wide scene", "ai-image-generator", "Photos", "photo", "16:9", (s) => `${s}, wide view, golden hour light`],
  ["story", "Story background", "ai-image-generator", "For social media", "minimal", "9:16", (s) => `${s}, simple shapes, lots of empty space for text`],
  ["icon", "3D scene", "ai-image-generator", "For social media", "3d", "1:1", (s) => `${s}, cute soft 3D shapes, studio light`],
  ["anime", "Anime scene", "ai-image-generator", "People and characters", "anime", "3:2", (s) => `${s}, anime illustration, bright colours`],
  ["poster", "Flat poster", "ai-image-generator", "For social media", "minimal", "4:5", (s) => `${s}, flat poster illustration, two or three colours`],
  ["truck", "Truck art", "ai-art-generator", "Folk and pattern art", "truck-art", "4:5", (s) => `${s}, framed by painted flowers and bold borders`],
  ["wash", "Watercolour", "ai-art-generator", "Paintings", "watercolour", "3:2", (s) => `${s}, loose watercolour washes on paper`],
  ["sketch", "Pencil sketch", "ai-art-generator", "Sketches", "pencil", "4:5", (s) => `${s}, detailed graphite pencil sketch`],
  ["mini", "Minimal art", "ai-art-generator", "Modern art", "minimal", "1:1", (s) => `${s}, minimal art print, calm colours`],
  ["clay", "Clay art", "ai-art-generator", "Modern art", "3d", "4:5", (s) => `${s}, handmade clay look, soft shadows`],
  ["manga", "Anime art", "ai-art-generator", "Paintings", "anime", "16:9", (s) => `${s}, anime background painting, dreamy sky`],
];
const SUB = Object.fromEntries(SUBJECTS.map((x) => [x[0], x])), REC = Object.fromEntries(RECIPES.map((x) => [x[0], x]));
const GEN = [];
for (const [tool, off] of [["ai-image-generator", 0], ["ai-art-generator", 5]]) {
  const recs = RECIPES.filter((r) => r[2] === tool), seen = new Set();
  for (let k = 0; seen.size < 16 && k < 400; k++) {
    const r = recs[k % recs.length], sub = SUBJECTS[(k * 5 + off + Math.floor(k / recs.length)) % SUBJECTS.length], id = `${r[0]}~${sub[0]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    GEN.push(P(id, `${r[1]}: ${sub[1]}`, tool, r[3], r[4], r[5], r[6](sub[2].charAt(0).toUpperCase() + sub[2].slice(1)), [r[1].toLowerCase(), sub[1].toLowerCase(), r[4]], sub[3]));
  }
}
// Mixed order: hand-made and generated starters alternate within each tool.
const ALL = [];
for (const tool of ["ai-image-generator", "ai-art-generator"]) {
  const a = LIST.filter((x) => x.tool === tool), b = GEN.filter((x) => x.tool === tool);
  for (let i = 0; i < Math.max(a.length, b.length * 1); i++) { if (a[i]) ALL.push(a[i]); if (b[2 * i]) ALL.push(b[2 * i]); if (b[2 * i + 1]) ALL.push(b[2 * i + 1]); }
}
export const TEMPLATES = ALL.map(({ id, name, tool, section, tags }) => ({ id, name, tool, section, tags }));
export const TOTAL = TEMPLATES.length;
/** Distinct looks: the hand-made presets plus the generator recipes. */
export const LAYOUTS = LIST.length + RECIPES.length;
export const presetById = (id) => { const x = ALL.find((p) => p.id === id); return x ? { id: x.id, name: x.name, tool: x.tool === "ai-art-generator" ? "art" : "image", style: x.style, aspect: x.aspect, prompt: x.prompt } : null; };
const SHAPES = {
  photo: (a, b, c) => `<circle cx="230" cy="60" r="26" fill="${b}" opacity=".85"/><path d="M0 200l90-90 60 50 50-40 120 80z" fill="${c}"/><path d="M0 200l70-50 70 50z" fill="${b}" opacity=".6"/>`,
  watercolour: (a, b, c) => `<ellipse cx="110" cy="100" rx="80" ry="54" fill="${b}" opacity=".35"/><ellipse cx="200" cy="90" rx="70" ry="48" fill="${c}" opacity=".35"/><ellipse cx="160" cy="130" rx="90" ry="40" fill="${b}" opacity=".25"/>`,
  "truck-art": (a, b, c) => `<rect x="14" y="14" width="292" height="172" rx="16" fill="none" stroke="${b}" stroke-width="8" stroke-dasharray="14 8"/>${[0, 1, 2, 3, 4].map((i) => `<circle cx="${60 + i * 50}" cy="100" r="18" fill="${i % 2 ? c : b}"/><circle cx="${60 + i * 50}" cy="100" r="7" fill="#fff"/>`).join("")}`,
  minimal: (a, b, c) => `<circle cx="200" cy="80" r="40" fill="${b}"/><rect x="40" y="130" width="240" height="8" rx="4" fill="${c}"/>`,
  "3d": (a, b, c) => `<ellipse cx="160" cy="160" rx="80" ry="12" fill="#000" opacity=".1"/><circle cx="160" cy="96" r="54" fill="${b}"/><circle cx="140" cy="76" r="16" fill="#fff" opacity=".45"/><rect x="200" y="120" width="40" height="40" rx="12" fill="${c}"/>`,
  anime: (a, b, c) => `<circle cx="160" cy="92" r="46" fill="#f7d6bd"/><path d="M110 86c4-40 96-46 100 0-20-14-60-22-100 0z" fill="${b}"/><circle cx="144" cy="96" r="6" fill="#1b2133"/><circle cx="176" cy="96" r="6" fill="#1b2133"/><path d="M110 200c0-40 100-40 100 0z" fill="${c}"/>`,
  pencil: (a, b, c) => Array.from({ length: 9 }, (_, i) => `<path d="M${40 + i * 28} 160 L${70 + i * 28} 50" stroke="${b}" stroke-width="2" opacity="${0.3 + (i % 3) * 0.2}"/>`).join("") + `<rect x="60" y="60" width="200" height="90" fill="none" stroke="${b}" stroke-width="2.5"/>`,
};
/** Our own drawn thumbnail (320×200 SVG string): the style's look in the preset's colours. */
export function thumb(id) {
  const x = ALL.find((p) => p.id === id) || LIST[0];
  const [a, b, c] = x.c;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${a}"/>${(SHAPES[x.style] || SHAPES.photo)(a, b, c)}<rect x="10" y="166" width="${Math.min(200, 16 + x.name.length * 8)}" height="24" rx="12" fill="#fff" opacity=".92"/><text x="22" y="182" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#1b2133">${x.name}</text></svg>`;
}
