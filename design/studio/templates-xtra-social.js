// More own Instagram post layouts (1080 × 1080), each its own composition. Pure module, called from
// templates.js with its helpers (no imports).
export default function add(k) {
  const { tpl, T, R, C, S, E, F, page, flow } = k;
  const { INK, MUTED, IND, COR, TEA, AMB, ROS, WHITE, GOLD, NAVY } = k.K;
  const P = "instagram-post";

  // 1. Quote card: big quote block on a soft paper card.
  tpl("quote-card-ig-x3", "Quote card post", P, "quote card motivation words inspiration instagram", () => [page("#f4efe6", [
    R(90, 90, 900, 900, WHITE, { radius: 36, name: "Card" }),
    R(90, 90, 900, 24, "#c2410c", { name: "Card top band" }),
    T("“", 150, 150, 200, { size: 240, family: "serif", bold: true, color: "#c2410c", lh: 1, name: "Quote mark" }),
    T("Do what you can, with what you have, where you are.", 160, 380, 760, { size: 70, family: "serif", color: INK, lh: 1.2, name: "Quote" }),
    R(160, 790, 120, 6, "#c2410c", { name: "Rule" }),
    T("Daily words · Your Studio", 160, 820, 700, { size: 34, bold: true, color: MUTED, name: "Credit" }),
  ])]);

  // 2. Flash sale: diagonal colour slab and a huge percentage.
  tpl("flash-sale-ig-x3", "Flash sale post", P, "flash sale discount offer percent shop instagram", () => [page(INK, [
    S("triangle", 0, 420, 1080, 660, AMB, { name: "Slab" }),
    T("FLASH", 80, 90, 920, { size: 120, bold: true, color: WHITE, ls: 10, name: "Flash" }),
    T("SALE", 80, 240, 920, { size: 190, bold: true, color: AMB, lh: 1, name: "Sale" }),
    T("40% OFF", 300, 600, 700, { size: 150, bold: true, color: INK, align: "right", lh: 1, name: "Percent" }),
    T("Today only · ends midnight", 300, 790, 700, { size: 40, bold: true, color: INK, align: "right", name: "Deadline" }),
    E("deco-sparkles", 860, 90, 140, { c1: GOLD, c2: WHITE }),
  ])]);

  // 3. Announcement: big circle badge in the middle.
  tpl("announcement-ig-x3", "Big announcement post", P, "announcement news update launch instagram", () => [page([IND, "#2f80ff", 135], [
    C(190, 190, 700, 700, WHITE, { op: 0.12, name: "Halo" }),
    C(250, 250, 580, 580, WHITE, { name: "Badge" }),
    T("WE HAVE", 270, 380, 540, { size: 46, bold: true, color: IND, align: "center", ls: 8, name: "Kicker" }),
    T("BIG NEWS", 270, 440, 540, { size: 100, bold: true, color: INK, align: "center", lh: 1, name: "Headline" }),
    T("Stay tuned for Friday", 270, 580, 540, { size: 38, color: MUTED, align: "center", name: "Line" }),
    E("deco-confetti", 40, 40, 240, { c1: GOLD, c2: COR }),
    E("deco-sparkle", 900, 880, 110, { c1: GOLD }),
  ])]);

  // 4. Carousel cover: numbered title with a swipe arrow.
  tpl("carousel-cover-ig-x3", "Carousel cover post", P, "carousel cover swipe guide series instagram", () => [page("#ecfdf5", [
    R(0, 0, 360, 1080, TEA, { name: "Side band" }),
    T("01", 60, 80, 260, { size: 160, bold: true, color: WHITE, lh: 1, name: "Number" }),
    T("5 easy ways to save money every month", 420, 220, 600, { size: 76, bold: true, color: "#064e3b", lh: 1.12, name: "Title" }),
    T("A short guide in five slides", 420, 680, 600, { size: 36, color: "#047857", name: "Subtitle" }),
    R(420, 860, 330, 96, "#064e3b", { radius: 48, name: "Swipe pill" }),
    T("Swipe  →", 420, 884, 330, { size: 40, bold: true, color: WHITE, align: "center", name: "Swipe" }),
  ])]);

  // 5. Testimonial: avatar circle + stars + review.
  tpl("testimonial-ig-x3", "Customer review post", P, "testimonial review customer feedback stars instagram", () => [page("#fff7ed", [
    C(420, 90, 240, 240, "#fed7aa", { name: "Avatar ring" }),
    F(440, 110, 200, 200, { shape: "circle", name: "Customer photo" }),
    ...[0, 1, 2, 3, 4].map((i) => S("star", 300 + i * 100, 370, 80, 80, AMB, { name: "Star" })),
    T("“Fast delivery and the quality is even better than the photos. I will order again!”", 120, 500, 840, { size: 54, family: "serif", italic: true, color: INK, align: "center", lh: 1.3, name: "Review" }),
    T("Sana R., Lahore", 120, 850, 840, { size: 38, bold: true, color: "#9a3412", align: "center", name: "Name" }),
    T("Verified customer", 120, 905, 840, { size: 28, color: MUTED, align: "center", name: "Role" }),
  ])]);

  // 6. Event invite: ticket shape with date block.
  tpl("event-invite-ig-x3", "Event invite post", P, "event invite ticket concert meetup date instagram", () => [page(NAVY, [
    R(90, 200, 900, 680, WHITE, { radius: 32, name: "Ticket" }),
    C(60, 500, 80, 80, NAVY, { name: "Notch" }), C(940, 500, 80, 80, NAVY, { name: "Notch" }),
    R(90, 200, 300, 680, ROS, { radius: 32, name: "Date block" }),
    T("SAT", 90, 330, 300, { size: 54, bold: true, color: WHITE, align: "center", name: "Day" }),
    T("14", 90, 400, 300, { size: 170, bold: true, color: WHITE, align: "center", lh: 1, name: "Date" }),
    T("DEC", 90, 590, 300, { size: 54, bold: true, color: WHITE, align: "center", name: "Month" }),
    T("You're invited", 440, 290, 500, { size: 40, bold: true, color: ROS, name: "Kicker" }),
    T("Open Mic Night", 440, 350, 500, { size: 88, bold: true, color: INK, lh: 1.05, name: "Event" }),
    T("7 pm · The Corner Café", 440, 580, 500, { size: 36, color: MUTED, name: "Details" }),
    T("Free entry · Bring a friend", 440, 760, 500, { size: 32, bold: true, color: INK, name: "Note" }),
  ])]);

  // 7. Product spotlight: large photo frame with a price tag.
  tpl("product-spotlight-ig-x3", "Product spotlight post", P, "product spotlight new item shop price instagram", () => [page("#f1f5f9", [
    F(80, 80, 920, 640, { shape: "rounded", radius: 40, name: "Product photo" }),
    R(80, 760, 600, 240, WHITE, { radius: 28, name: "Info card" }),
    T("Linen tote bag", 120, 790, 540, { size: 64, bold: true, color: INK, name: "Product" }),
    T("Handmade · four colours", 120, 880, 540, { size: 34, color: MUTED, name: "Details" }),
    C(740, 740, 260, 260, IND, { name: "Price circle" }),
    T("$24", 740, 820, 260, { size: 84, bold: true, color: WHITE, align: "center", name: "Price" }),
  ])]);

  // 8. Tips list: checklist rows.
  tpl("tips-list-ig-x3", "Tips list post", P, "tips list checklist advice how to instagram", () => [page(WHITE, [
    R(0, 0, 1080, 230, "#0ea5e9", { name: "Header" }),
    T("4 tips for better sleep", 80, 70, 920, { size: 70, bold: true, color: WHITE, name: "Title" }),
    ...["Same bedtime every night", "No screens one hour before", "Keep the room cool and dark", "Short walk in the morning"].flatMap((t, i) => [
      C(80, 300 + i * 175, 100, 100, "#e0f2fe", { name: "Tick circle" }),
      T(String(i + 1), 80, 322 + i * 175, 100, { size: 50, bold: true, color: "#0369a1", align: "center", name: "Number" }),
      T(t, 220, 322 + i * 175, 780, { size: 48, color: INK, name: "Tip" }),
    ]),
    T("Save this post for later", 80, 1000, 920, { size: 30, bold: true, color: "#0369a1", name: "Footer" }),
  ])]);

  // 9. Before / after split.
  tpl("before-after-ig-x3", "Before and after post", P, "before after split result transformation compare instagram", () => [page(INK, [
    F(0, 0, 540, 1080, { name: "Before photo" }),
    F(540, 0, 540, 1080, { name: "After photo" }),
    R(530, 0, 20, 1080, WHITE, { name: "Divider" }),
    R(40, 40, 240, 80, INK, { radius: 40, name: "Before tag" }), T("BEFORE", 40, 58, 240, { size: 38, bold: true, color: WHITE, align: "center", name: "Before" }),
    R(800, 40, 240, 80, TEA, { radius: 40, name: "After tag" }), T("AFTER", 800, 58, 240, { size: 38, bold: true, color: WHITE, align: "center", name: "After" }),
    R(240, 900, 600, 110, WHITE, { radius: 55, name: "Caption pill" }),
    T("Kitchen makeover in 3 days", 240, 930, 600, { size: 40, bold: true, color: INK, align: "center", name: "Caption" }),
  ])]);

  // 10. Giveaway: gift sticker, rules list.
  tpl("giveaway-ig-x3", "Giveaway post", P, "giveaway contest win prize free gift instagram", () => [page([ROS, "#a64bf4", 150], [
    E("deco-confetti", 760, 30, 280, { c1: GOLD, c2: WHITE }),
    T("GIVEAWAY", 80, 90, 920, { size: 150, bold: true, color: WHITE, lh: 1, name: "Title" }),
    T("Win a gift box worth $100", 80, 270, 920, { size: 50, color: "#fde2f3", name: "Prize" }),
    R(80, 400, 920, 500, WHITE, { radius: 36, name: "Rules card" }),
    T("How to enter", 130, 440, 820, { size: 48, bold: true, color: ROS, name: "Rules title" }),
    T("1. Follow our page\n2. Like this post\n3. Tag two friends", 130, 520, 820, { size: 46, color: INK, lh: 1.5, name: "Rules" }),
    T("Winner announced Monday", 80, 950, 920, { size: 36, bold: true, color: WHITE, align: "center", name: "Footer" }),
  ])]);

  // 11. We're hiring: big type with role chips.
  tpl("hiring-ig-x3", "We're hiring post", P, "hiring job vacancy career team join instagram", () => [page(GOLD, [
    T("We're", 80, 80, 920, { size: 110, family: "serif", italic: true, color: INK, lh: 1, name: "We're" }),
    T("HIRING", 80, 190, 920, { size: 190, bold: true, color: INK, lh: 1, name: "Hiring" }),
    ...["Designer", "Sales lead", "Driver"].flatMap((t, i) => [R(80, 470 + i * 140, 520, 110, INK, { radius: 55, name: "Role pill" }), T(t, 80, 498 + i * 140, 520, { size: 48, bold: true, color: GOLD, align: "center", name: "Role" })]),
    C(680, 560, 320, 320, WHITE, { name: "Apply circle" }),
    T("Apply\nby DM", 680, 640, 320, { size: 64, bold: true, color: INK, align: "center", lh: 1.05, name: "Apply" }),
  ])]);

  // 12. New menu item: plate circle and price ribbon.
  tpl("new-menu-ig-x3", "New menu item post", P, "menu food new dish restaurant cafe instagram", () => [page("#14532d", [
    C(240, 120, 600, 600, "#166534", { name: "Plate ring" }),
    F(290, 170, 500, 500, { shape: "circle", name: "Dish photo" }),
    R(0, 760, 1080, 140, "#fbbf24", { name: "Ribbon" }),
    T("NEW ON THE MENU", 0, 798, 1080, { size: 60, bold: true, color: "#14532d", align: "center", ls: 4, name: "Ribbon text" }),
    T("Grilled veggie wrap · $9", 0, 950, 1080, { size: 46, color: WHITE, align: "center", name: "Dish" }),
    E("deco-sprig", 860, 80, 160, { c1: "#86efac", c2: "#bbf7d0", rot: 15 }),
  ])]);

  // 13. Countdown: three number boxes.
  tpl("countdown-ig-x3", "Countdown post", P, "countdown launch days left timer coming instagram", () => [page("#111827", [
    T("LAUNCH IN", 80, 150, 920, { size: 70, bold: true, color: "#a5b4fc", align: "center", ls: 10, name: "Kicker" }),
    ...[["03", "DAYS"], ["12", "HOURS"], ["45", "MINS"]].flatMap(([n, l], i) => [
      R(90 + i * 310, 330, 280, 320, "#1f2937", { radius: 28, name: "Box" }),
      T(n, 90 + i * 310, 380, 280, { size: 150, bold: true, color: WHITE, align: "center", lh: 1, name: "Count" }),
      T(l, 90 + i * 310, 560, 280, { size: 36, bold: true, color: "#a5b4fc", align: "center", name: "Unit" }),
    ]),
    T("Turn on notifications so you don't miss it", 120, 780, 840, { size: 40, color: "#d1d5db", align: "center", lh: 1.3, name: "Line" }),
    E("deco-sparkles", 470, 900, 140, { c1: "#a5b4fc", c2: WHITE }),
  ])]);

  // 14. This or that poll.
  tpl("this-or-that-ig-x3", "This or that poll post", P, "poll this or that vote choose question instagram", () => [page(WHITE, [
    R(0, 0, 540, 1080, "#fde68a", { name: "Left half" }),
    R(540, 0, 540, 1080, "#bfdbfe", { name: "Right half" }),
    T("THIS", 0, 90, 540, { size: 110, bold: true, color: "#92400e", align: "center", name: "This" }),
    T("THAT", 540, 90, 540, { size: 110, bold: true, color: "#1e3a8a", align: "center", name: "That" }),
    F(90, 280, 360, 360, { shape: "circle", name: "Option A photo" }),
    F(630, 280, 360, 360, { shape: "circle", name: "Option B photo" }),
    T("Tea", 0, 690, 540, { size: 70, bold: true, color: INK, align: "center", name: "Option A" }),
    T("Coffee", 540, 690, 540, { size: 70, bold: true, color: INK, align: "center", name: "Option B" }),
    C(440, 440, 200, 200, INK, { name: "VS circle" }),
    T("VS", 440, 497, 200, { size: 70, bold: true, color: WHITE, align: "center", name: "VS" }),
    T("Vote in the comments", 0, 920, 1080, { size: 44, bold: true, color: INK, align: "center", name: "Prompt" }),
  ])]);

  // 15. Behind the scenes: film strip of photo frames.
  tpl("behind-scenes-ig-x3", "Behind the scenes post", P, "behind the scenes studio process making team instagram", () => [page("#1c1917", [
    T("Behind the scenes", 80, 70, 920, { size: 80, family: "serif", italic: true, color: "#fafaf9", name: "Title" }),
    R(0, 230, 1080, 560, "#0c0a09", { name: "Film strip" }),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => R(30 + i * 135, 250, 70, 30, "#44403c", { radius: 6, name: "Sprocket" })),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => R(30 + i * 135, 740, 70, 30, "#44403c", { radius: 6, name: "Sprocket" })),
    F(40, 310, 320, 400, { name: "Photo 1" }), F(380, 310, 320, 400, { name: "Photo 2" }), F(720, 310, 320, 400, { name: "Photo 3" }),
    T("How our candles are poured by hand", 80, 850, 920, { size: 46, color: "#e7e5e4", name: "Caption" }),
    T("@yourstudio", 80, 950, 920, { size: 32, bold: true, color: "#a8a29e", name: "Handle" }),
  ])]);

  // 16. Holiday greeting: framed card with ornament.
  tpl("holiday-greeting-ig-x3", "Holiday greeting post", P, "holiday greeting season wishes festive card instagram", () => [page("#7f1d1d", [
    R(60, 60, 960, 960, "none", { stroke: GOLD, sw: 6, name: "Frame" }),
    R(84, 84, 912, 912, "none", { stroke: GOLD, sw: 2, name: "Inner frame" }),
    E("deco-hanging-stars", 160, 84, 220, { c1: GOLD, c2: GOLD }),
    E("deco-hanging-stars", 700, 84, 220, { c1: GOLD, c2: GOLD }),
    T("Season's", 120, 380, 840, { size: 90, family: "serif", italic: true, color: "#fde68a", align: "center", name: "Season's" }),
    T("Greetings", 120, 480, 840, { size: 140, family: "serif", bold: true, color: WHITE, align: "center", lh: 1, name: "Greetings" }),
    E("line-ornament", 340, 660, 400, { c1: GOLD }),
    T("Warm wishes from all of us", 120, 760, 840, { size: 42, color: "#fecaca", align: "center", name: "Wishes" }),
  ])]);

  // 17. Milestone thank-you: big number with burst.
  tpl("milestone-ig-x3", "Milestone thank-you post", P, "milestone followers thank you celebrate number instagram", () => [page("#fdf4ff", [
    E("deco-burst", 140, 140, 800, { c1: "#f5d0fe", c2: "#fae8ff" }),
    T("THANK YOU FOR", 80, 200, 920, { size: 54, bold: true, color: "#a21caf", align: "center", ls: 6, name: "Kicker" }),
    T("10K", 80, 300, 920, { size: 260, bold: true, color: "#701a75", align: "center", lh: 1, name: "Number" }),
    T("followers", 80, 590, 920, { size: 80, family: "serif", italic: true, color: "#a21caf", align: "center", name: "Followers" }),
    T("We couldn't have done it without you.", 120, 800, 840, { size: 40, color: INK, align: "center", name: "Line" }),
    E("deco-confetti", 40, 830, 220, { c1: AMB, c2: ROS }),
  ])]);

  // 18. Meet the team: grid of four circles with names.
  tpl("meet-team-ig-x3", "Meet the team post", P, "meet the team staff people about us company instagram", () => [page(WHITE, [
    T("Meet the team", 80, 60, 920, { size: 84, bold: true, color: INK, align: "center", name: "Title" }),
    ...[["Ayesha", "Founder"], ["Bilal", "Design"], ["Sara", "Sales"], ["Omar", "Support"]].flatMap(([n, r], i) => {
      const x = 150 + (i % 2) * 460, y = 210 + Math.floor(i / 2) * 420;
      return [C(x, y, 320, 320, i % 3 ? "#e0e7ff" : "#ffe4e6", { name: "Photo ring" }), F(x + 20, y + 20, 280, 280, { shape: "circle", name: n + " photo" }),
        T(n, x - 40, y + 325, 400, { size: 42, bold: true, color: INK, align: "center", name: "Name" }), T(r, x - 40, y + 375, 400, { size: 30, color: MUTED, align: "center", name: "Role" })];
    }),
  ])]);
}
