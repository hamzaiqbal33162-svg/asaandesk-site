// Whiteboard template variants (pure, no DOM): our own colour palettes and content themes.
// A template id is "<layout>" or "<layout>~<palette>~<theme>", e.g. "kanban~p03~school".

/** Default colours used by the base layouts (templates.js), in the order a palette replaces them. */
export const BASE_COLORS = {
  notes: ["#ffe27a", "#ffc29f", "#ffb3cf", "#d9cbff", "#b4dcff", "#b7efd2", "#dff28f"],
  accents: ["#5b4cf0", "#2f80ff", "#14b8a6", "#f59e0b", "#f43f5e", "#22c55e"],
  tints: ["#e8e5fe", "#dbeafe", "#ccfbf1", "#fef3c7", "#ffe4e6", "#dcfce7"],
  dark: "#1b2133", title: "#0f766e",
  extra: { "#16a34a": ["accents", 5], "#e11d48": ["accents", 4], "#3b2fd0": ["accents", 0], "#b45309": ["accents", 3], "#0ea5e9": ["accents", 1], "#ec4899": ["accents", 4] },
};

// Our own palettes: 7 sticky-note colours, 6 accents, 6 light tints, a dark ink and a title colour.
export const PALETTES = [
  { id: "p00", name: "Classic", base: true },
  { id: "p01", name: "Ocean", notes: ["#bfe9ff", "#a5d8ff", "#c3f0ec", "#d0ebff", "#99e2f0", "#b8f2e6", "#e3f6fd"], accents: ["#1971c2", "#1c7ed6", "#0c8599", "#0b7285", "#3b5bdb", "#099268"], tints: ["#e7f5ff", "#d0ebff", "#e3fafc", "#e6fcf5", "#edf2ff", "#ebfbee"], dark: "#0b2545", title: "#1864ab" },
  { id: "p02", name: "Sunset", notes: ["#ffd8a8", "#ffc078", "#ffa8a8", "#fcc2d7", "#ffe066", "#ffd6a5", "#ffec99"], accents: ["#e8590c", "#f76707", "#d6336c", "#f59f00", "#e03131", "#fd7e14"], tints: ["#fff4e6", "#ffe8cc", "#fff0f6", "#fff9db", "#fff5f5", "#fff3bf"], dark: "#3d1f0d", title: "#c2410c" },
  { id: "p03", name: "Forest", notes: ["#d8f5a2", "#b2f2bb", "#c0eb75", "#96f2d7", "#e9fac8", "#a9e34b", "#d3f9d8"], accents: ["#2b8a3e", "#5c940d", "#087f5b", "#e67700", "#c92a2a", "#37b24d"], tints: ["#ebfbee", "#f4fce3", "#e6fcf5", "#fff9db", "#fff5f5", "#d3f9d8"], dark: "#1b3022", title: "#2b8a3e" },
  { id: "p04", name: "Candy", notes: ["#ffdeeb", "#fcc2d7", "#eebefa", "#d0bfff", "#bac8ff", "#ffd8f0", "#f3d9fa"], accents: ["#c2255c", "#ae3ec9", "#7048e8", "#f08c00", "#e64980", "#9c36b5"], tints: ["#fff0f6", "#f8f0fc", "#f3f0ff", "#fff9db", "#ffdeeb", "#f3d9fa"], dark: "#3b1d3a", title: "#a61e4d" },
  { id: "p05", name: "Graphite", notes: ["#f1f3f5", "#e9ecef", "#fff3bf", "#dee2e6", "#e7f5ff", "#f8f9fa", "#ced4da"], accents: ["#343a40", "#495057", "#1c7ed6", "#f59f00", "#e03131", "#2f9e44"], tints: ["#f8f9fa", "#f1f3f5", "#e9ecef", "#fff9db", "#fff5f5", "#ebfbee"], dark: "#212529", title: "#212529" },
  { id: "p06", name: "Citrus", notes: ["#fff3bf", "#ffec99", "#e9fac8", "#d8f5a2", "#ffe066", "#fff9db", "#c0eb75"], accents: ["#f08c00", "#74b816", "#2b8a3e", "#fab005", "#e8590c", "#82c91e"], tints: ["#fff9db", "#f4fce3", "#ebfbee", "#fff3bf", "#fff4e6", "#e9fac8"], dark: "#2b2a10", title: "#5c940d" },
  { id: "p07", name: "Berry", notes: ["#f3d9fa", "#e5dbff", "#ffc9c9", "#fcc2d7", "#d0bfff", "#eebefa", "#ffdeeb"], accents: ["#862e9c", "#5f3dc4", "#a61e4d", "#e67700", "#c92a2a", "#2b8a3e"], tints: ["#f8f0fc", "#f3f0ff", "#fff0f6", "#fff9db", "#fff5f5", "#ebfbee"], dark: "#2d1436", title: "#862e9c" },
  { id: "p08", name: "Earth", notes: ["#f4e1c1", "#ead2ac", "#f2c6b4", "#e3d5ca", "#d6e2c3", "#cfe1d4", "#f6e7b4"], accents: ["#9c4f2e", "#7a5c3e", "#5f7a4a", "#c08a2d", "#b5523b", "#4f7b5d"], tints: ["#faf3e8", "#f5ece0", "#eef3e6", "#fbf3dc", "#f9ebe6", "#ecf3ec"], dark: "#33241a", title: "#7a3e1f" },
  { id: "p09", name: "Midnight", notes: ["#ffe066", "#8ce99a", "#74c0fc", "#ffa8a8", "#b197fc", "#63e6be", "#ffc078"], accents: ["#364fc7", "#1971c2", "#0b7285", "#f59f00", "#e03131", "#2f9e44"], tints: ["#edf2ff", "#e7f5ff", "#e3fafc", "#fff9db", "#fff5f5", "#ebfbee"], dark: "#10153a", title: "#1c2c80" },
  { id: "p10", name: "Spring", notes: ["#fff5b1", "#ffd6e7", "#c9f7d5", "#d6e4ff", "#ffe3c4", "#e0f7fa", "#efe1ff"], accents: ["#4263eb", "#12b886", "#e64980", "#fab005", "#fa5252", "#40c057"], tints: ["#edf2ff", "#e6fcf5", "#fff0f6", "#fff9db", "#fff5f5", "#ebfbee"], dark: "#1f2a44", title: "#0ca678" },
  { id: "p11", name: "Retro", notes: ["#ffd43b", "#ff922b", "#ff8787", "#da77f2", "#4dabf7", "#69db7c", "#ffe8a3"], accents: ["#d9480f", "#1864ab", "#0b7285", "#e67700", "#c92a2a", "#2b8a3e"], tints: ["#fff4e6", "#e7f5ff", "#e3fafc", "#fff9db", "#fff5f5", "#ebfbee"], dark: "#2b1d0e", title: "#d9480f" },
];

// Content themes: our own wording for different kinds of teams. "general" keeps each layout's own text.
// items = 12 short sticky-note phrases; people = 6 first names with roles.
export const THEMES = [
  { id: "general", label: "General" },
  { id: "school", label: "School", topic: "Science fair", items: ["Pick the projects", "Book the school hall", "Invite parents", "Make the posters", "Judges and prizes", "Safety checklist", "Practice day", "Order supplies", "Set up the tables", "Photo corner", "Thank-you notes", "Share the results"], people: ["Ms. Rahman, Principal", "Mr. Ali, Science", "Sana, Art", "Omar, Sports", "Hina, Office", "Bilal, IT"] },
  { id: "shop", label: "Shop", topic: "Summer sale", items: ["Choose the sale items", "New window display", "Price tags", "Post on social media", "Train the staff", "Extra stock", "Loyalty card offer", "Gift wrapping", "Customer survey", "Weekend opening hours", "Count the stock", "Review the sales"], people: ["Asma, Owner", "Danish, Sales", "Noor, Stock", "Kamran, Cashier", "Laila, Social media", "Faisal, Delivery"] },
  { id: "clinic", label: "Clinic", topic: "Patient visit", items: ["Online booking", "Shorter waiting time", "Reminder messages", "Clean waiting room", "Patient forms online", "Follow-up calls", "Staff rota", "Health talks", "Pharmacy stock", "Feedback box", "Wheelchair access", "Lab results by email"], people: ["Dr. Ayesha, Lead", "Dr. Hamid, GP", "Rida, Nurse", "Usman, Front desk", "Maria, Lab", "Tariq, Admin"] },
  { id: "restaurant", label: "Restaurant", topic: "New menu", items: ["Taste test night", "Seasonal dishes", "Print the menus", "Kids' meals", "Delivery partners", "Table booking app", "Train the waiters", "Kitchen order flow", "Happy hour", "Food photos", "Supplier prices", "Guest reviews"], people: ["Zara, Owner", "Chef Imran", "Saad, Floor manager", "Mehak, Hosting", "Ahmed, Kitchen", "Rabia, Marketing"] },
  { id: "wedding", label: "Wedding", topic: "Wedding day", items: ["Guest list", "Book the venue", "Send invitations", "Choose the caterer", "Flowers and decor", "Photographer", "Music and lights", "Outfits fitting", "Seating plan", "Welcome gifts", "Transport", "Thank-you cards"], people: ["Amna, Bride", "Hassan, Groom", "Sara, Planner", "Ali, Best man", "Mona, Family", "Yusuf, Budget"] },
  { id: "real-estate", label: "Real estate", topic: "Open house", items: ["Photos of the home", "List it online", "Price check", "Open house day", "Signs and flyers", "Call past buyers", "Home staging", "Viewing schedule", "Offer follow-up", "Paperwork ready", "Neighbourhood guide", "Closing gift"], people: ["Nadia, Agent", "Farhan, Broker", "Iqra, Marketing", "Shahid, Legal", "Hira, Photos", "Adeel, Viewings"] },
  { id: "fitness", label: "Fitness", topic: "30-day challenge", items: ["Set the goals", "Weekly workouts", "Meal ideas", "Track progress", "Group classes", "Rest days", "Stretching guide", "Step challenge", "Water reminders", "Before and after photos", "Coach check-ins", "Prize for the winner"], people: ["Coach Sami", "Areeba, Yoga", "Kashif, Strength", "Fatima, Nutrition", "Jawad, Front desk", "Nida, Social"] },
  { id: "startup", label: "Tech startup", topic: "App launch", items: ["User interviews", "Landing page", "Beta testers", "Fix sign-up bugs", "Pricing plans", "App store page", "Onboarding emails", "Analytics events", "Press kit", "Support inbox", "Weekly demo", "Investor update"], people: ["Raza, CEO", "Komal, Product", "Hamza, Engineering", "Sobia, Design", "Waqas, Growth", "Anum, Support"] },
  { id: "ngo", label: "Nonprofit", topic: "Charity drive", items: ["Volunteer sign-up", "Donation boxes", "Partner schools", "Story videos", "Thank our donors", "Food packs", "Delivery routes", "Social posts", "Bank details page", "Monthly report", "Community meeting", "Next year's plan"], people: ["Shazia, Director", "Babar, Volunteers", "Uzma, Fundraising", "Naveed, Logistics", "Saima, Outreach", "Ehsan, Finance"] },
  { id: "travel", label: "Travel", topic: "Family trip", items: ["Pick the dates", "Book flights", "Hotel shortlist", "Packing list", "Day trips", "Local food to try", "Travel insurance", "Currency and cards", "Photo spots", "Rainy-day plan", "Souvenirs", "Share the album"], people: ["Ammi, Plans", "Abbu, Budget", "Ayaan, Maps", "Mahnoor, Photos", "Daadi, Food", "Rayan, Games"] },
  { id: "marketing", label: "Marketing", topic: "Brand campaign", items: ["Campaign goal", "Target audience", "Key message", "Video ad", "Influencer list", "Email series", "Landing page", "Ad budget", "Posting calendar", "Giveaway", "Track the clicks", "Final report"], people: ["Mariam, Lead", "Junaid, Content", "Alina, Design", "Hammad, Ads", "Sadia, Social", "Fahad, Data"] },
];

export const paletteById = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/** Colour map (lower-case hex -> hex) from the base colours to a palette. */
export function paletteMap(pal) {
  const m = new Map();
  if (!pal || pal.base) return m;
  const B = BASE_COLORS;
  for (const k of ["notes", "accents", "tints"]) B[k].forEach((c, i) => m.set(c, pal[k][i % pal[k].length]));
  m.set(B.dark, pal.dark); m.set(B.title, pal.title);
  for (const [c, [k, i]] of Object.entries(B.extra)) m.set(c, pal[k][i]);
  return m;
}
/** Recolours built objects in place for a palette. */
export function recolor(objects, pal) {
  const m = paletteMap(pal);
  if (!m.size) return objects;
  for (const o of objects) for (const k of ["fill", "stroke", "color", "textColor"]) { const v = typeof o[k] === "string" ? o[k].toLowerCase() : null; if (v && m.has(v)) o[k] = m.get(v); }
  return objects;
}
/** Splits "layout~p03~school" into its parts (missing parts = defaults). */
export function parseTemplateId(id) {
  const [layout, pal = "p00", theme = "general", font = "sans"] = String(id || "").split("~");
  return { layout, pal, theme, font };
}
