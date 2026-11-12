// Extra base layouts from the whiteboard helper (ROUND 2). Pure module, no imports; templates.js calls add(k).
// 45 own merch print layouts (ids end in "-wb"): 15 t-shirt prints, 15 hoodie prints (transparent, ready to print)
// and 15 mug wraps. Each tool gets 15 different compositions.
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, flow } = k;
  const { WHITE } = k.K;

  // Drawn in a 1000-unit-wide reference space, scaled to the real page.
  function kit(W, H, ref = 1000) {
    const u = W / ref, h = H / u;
    const sc = (o = {}) => { const r = { ...o }; for (const key of ["size", "sw", "radius", "ls"]) if (r[key]) r[key] *= u; if (r.outline) r.outline = { ...r.outline, width: r.outline.width * u }; return r; };
    const t = (s, x, y, w, o = {}) => (s ? T(s, x * u, y * u, w * u, sc(o)) : null);
    return {
      u, w: ref, h, t,
      tm: (s, x, y, w, bh, o = {}) => { const l = t(s, x, y, w, o); if (l) l.y = (y + bh / 2) * u - l.h / 2; return l; },
      r: (x, y, w, hh, fill, o = {}) => R(x * u, y * u, w * u, hh * u, fill, sc(o)),
      c: (x, y, w, hh, fill, o = {}) => C(x * u, y * u, w * u, hh * u, fill, sc(o)),
      s: (kind, x, y, w, hh, fill, o = {}) => S(kind, x * u, y * u, w * u, hh * u, fill, sc(o)),
      f: (x, y, w, hh, o = {}) => F(x * u, y * u, w * u, hh * u, sc(o)),
      e: (id, x, y, w, o = {}) => E(id, x * u, y * u, w * u, o.h ? { ...o, h: o.h * u } : o),
      col: (y, ...items) => flow(y * u, ...items.filter((it) => it !== null).map((it) => (typeof it === "number" ? it * u : it))),
    };
  }

  /* ---------- apparel prints: centred in the chest area of a 1000-wide canvas (top 900 units) ---------- */
  const AP = [
    // 0 stacked words
    (q, c) => { const { t, col } = q, P = c.p; return col(120, t(c.a, 100, 0, 800, { size: 150, bold: true, color: P.a, align: "center", lh: 0.9 }), 0, t(c.b, 100, 0, 800, { size: 150, bold: true, color: P.b, align: "center", lh: 0.9, outline: { color: P.a, width: 4 } }), 0, t(c.c, 100, 0, 800, { size: 150, bold: true, color: P.a, align: "center", lh: 0.9 }), 30, t(c.small, 100, 0, 800, { size: 34, color: P.a, align: "center", ls: 10 })); },
    // 1 circle badge
    (q, c) => { const { t, c: cc, e, tm } = q, P = c.p; return [cc(200, 100, 600, 600, P.a, { name: "Badge" }), cc(230, 130, 540, 540, "none", { stroke: P.b, sw: 6, name: "Ring" }),
      tm(c.a, 260, 230, 480, 200, { size: 92, bold: true, color: P.b, align: "center", lh: 0.95 }), t(c.small, 260, 470, 480, { size: 30, color: P.b, align: "center", ls: 8 }),
      e("shape-star", 470, 170, 60, { c1: P.b }), e("shape-star", 470, 570, 60, { c1: P.b })]; },
    // 2 sunset
    (q, c) => { const { t, c: cc, r, s } = q, P = c.p; return [cc(250, 80, 500, 500, P.b, { name: "Sun" }), ...[0, 1, 2, 3].map((i) => r(250, 330 + i * 50, 500, 22, P.a, { name: "Stripe", op: 0.9 })),
      s("triangle", 150, 330, 380, 250, P.a, { name: "Mountain" }), s("triangle", 450, 380, 400, 200, P.c || P.a, { name: "Mountain" }),
      t(c.a, 100, 620, 800, { size: 120, bold: true, color: P.a, align: "center", lh: 0.95 }), t(c.small, 100, 760, 800, { size: 36, color: P.a, align: "center", ls: 10 })]; },
    // 3 varsity number
    (q, c) => { const { t, col } = q, P = c.p; return col(100, t(c.b, 100, 0, 800, { size: 70, bold: true, color: P.a, align: "center", ls: 12 }), 10, t(c.a, 100, 0, 800, { size: 330, bold: true, color: P.b, align: "center", lh: 0.85, outline: { color: P.a, width: 10 } }), 10, t(c.small, 100, 0, 800, { size: 44, bold: true, color: P.a, align: "center", ls: 6 })); },
    // 4 mountain badge
    (q, c) => { const { t, c: cc, s, r } = q, P = c.p; return [cc(250, 90, 500, 500, "none", { stroke: P.a, sw: 14, name: "Ring" }), s("triangle", 300, 280, 260, 230, P.a, { name: "Peak" }), s("triangle", 460, 330, 220, 180, P.b, { name: "Peak" }), r(300, 505, 400, 14, P.a),
      t(c.a, 100, 630, 800, { size: 110, bold: true, color: P.a, align: "center", ls: 10 }), t(c.small, 100, 770, 800, { size: 32, color: P.a, align: "center", ls: 6 })]; },
    // 5 pocket print (small, chest left)
    (q, c) => { const { t, e } = q, P = c.p; return [e(c.icon || "icon-heart", 640, 120, 90, { c1: P.b }), t(c.a, 560, 230, 250, { size: 44, bold: true, color: P.a, align: "center", lh: 1 }), t(c.small, 560, 340, 250, { size: 20, color: P.a, align: "center", ls: 4 })]; },
    // 6 stamp
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(150, 160, 700, 440, "none", { stroke: P.a, sw: 14, radius: 20, name: "Stamp" }), r(180, 190, 640, 380, "none", { stroke: P.a, sw: 4, radius: 12, name: "Inner" }),
      tm(c.a, 200, 210, 600, 230, { size: 94, bold: true, color: P.a, align: "center", lh: 0.95 }), t(c.small, 200, 470, 600, { size: 36, color: P.b, align: "center", ls: 6, bold: true })]; },
    // 7 script + swoosh
    (q, c) => { const { t, e } = q, P = c.p; return [t(c.a, 80, 180, 840, { size: 170, family: "serif", italic: true, bold: true, color: P.a, align: "center", lh: 1 }), e("line-swoosh", 200, 400, 600, { c1: P.b }), t(c.small, 100, 520, 800, { size: 40, color: P.a, align: "center", ls: 12 })]; },
    // 8 heart
    (q, c) => { const { t, e } = q, P = c.p; return [t(c.b, 100, 120, 800, { size: 120, bold: true, color: P.a, align: "center" }), e("shape-heart", 380, 280, 240, { c1: P.b }), t(c.a, 100, 540, 800, { size: 120, bold: true, color: P.a, align: "center", lh: 0.95 })]; },
    // 9 checkerboard
    (q, c) => { const { t, r } = q, P = c.p; return [...Array.from({ length: 20 }, (_, i) => r(100 + (i % 10) * 80, 120 + Math.floor(i / 10) * 80, 80, 80, (i + Math.floor(i / 10)) % 2 ? P.b : P.a, { name: "Check" })),
      t(c.a, 100, 320, 800, { size: 160, bold: true, color: P.a, align: "center", lh: 0.9 }), ...Array.from({ length: 10 }, (_, i) => r(100 + i * 80, 640, 80, 40, i % 2 ? P.b : P.a, { name: "Check" })), t(c.small, 100, 710, 800, { size: 34, color: P.a, align: "center", ls: 8 })]; },
    // 10 waves
    (q, c) => { const { t, e } = q, P = c.p; return [...[0, 1, 2].map((i) => e("line-wavy", 200, 140 + i * 50, 600, { c1: i === 1 ? P.b : P.a })), t(c.a, 100, 320, 800, { size: 130, bold: true, color: P.a, align: "center", lh: 0.95 }), ...[0, 1, 2].map((i) => e("line-wavy", 200, 600 + i * 50, 600, { c1: i === 1 ? P.b : P.a }))]; },
    // 11 starburst
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("deco-burst", 200, 80, 600, { c1: P.b }), tm(c.a, 260, 230, 480, 300, { size: 100, bold: true, color: P.a, align: "center", lh: 0.95 }), t(c.small, 100, 720, 800, { size: 38, bold: true, color: P.a, align: "center", ls: 6 })]; },
    // 12 speech bubble
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("bubble-round", 180, 100, 640, { c1: P.b }), tm(c.a, 260, 160, 480, 330, { size: 76, bold: true, color: P.a, align: "center", lh: 1.05 }), t(c.small, 100, 690, 800, { size: 36, color: P.a, align: "center", ls: 6 })]; },
    // 13 icon grid
    (q, c) => { const { t, e } = q, P = c.p, ics = c.icons || ["icon-sun", "icon-leaf", "icon-heart", "icon-star", "icon-moon", "icon-cloud", "icon-idea", "icon-gift", "icon-camera"]; return [...ics.map((ic, i) => e(ic, 290 + (i % 3) * 150, 90 + Math.floor(i / 3) * 150, 110, { c1: i % 2 ? P.b : P.a })), t(c.a, 100, 560, 800, { size: 110, bold: true, color: P.a, align: "center", lh: 0.95 })]; },
    // 14 coordinates
    (q, c) => { const { t, r } = q, P = c.p; return [t(c.a, 100, 200, 800, { size: 150, bold: true, color: P.a, align: "center", ls: 6 }), r(150, 400, 700, 8, P.b), t(c.b, 100, 430, 800, { size: 46, family: "mono", color: P.a, align: "center", ls: 4 }), r(150, 520, 700, 8, P.b), t(c.small, 100, 560, 800, { size: 32, color: P.a, align: "center", ls: 10 })]; },
  ];
  const INK = { a: "#111827", b: "#f97316", c: "#374151" };
  const TEES = [
    ["Good vibes tee", "good vibes positive", { a: "GOOD", b: "VIBES", c: "ONLY", small: "SINCE TODAY", p: { a: "#111827", b: "#fde047" } }],
    ["Coffee club tee", "coffee club cafe", { a: "COFFEE CLUB", small: "BREW · SIP · REPEAT", p: { a: "#7c2d12", b: "#fef3c7" } }],
    ["Weekend sunset tee", "sunset weekend retro beach", { a: "WEEKEND", small: "SUN · SEA · SLEEP", p: { a: "#7c2d12", b: "#fb923c", c: "#9a3412" } }],
    ["Team number tee", "sports team number varsity", { a: "23", b: "TEAM ROCKET", small: "EST. 2026", p: { a: "#1e3a8a", b: "#ffffff" } }],
    ["Explore mountains tee", "mountain hiking outdoor explore", { a: "EXPLORE", small: "THE NORTH VALLEYS", p: { a: "#14532d", b: "#65a30d" } }],
    ["Small heart pocket tee", "minimal pocket heart love", { a: "Be kind", small: "ALWAYS", icon: "icon-heart", p: { a: "#111827", b: "#e11d48" } }],
    ["Family reunion tee", "family reunion event", { a: "FAMILY REUNION", small: "SUMMER 2026", p: { a: "#0f766e", b: "#f59e0b" } }],
    ["Dreamer script tee", "script dreamer typography", { a: "Dreamer", small: "NEVER STOP", p: { a: "#4c1d95", b: "#f472b6" } }],
    ["I heart city tee", "city love heart tourist", { a: "LAHORE", b: "I", p: { a: "#111827", b: "#dc2626" } }],
    ["Race day tee", "race checkered car motor", { a: "RACE DAY", small: "FULL SPEED AHEAD", p: { a: "#111827", b: "#e5e7eb" } }],
    ["Surf club tee", "surf beach waves ocean", { a: "SURF CLUB", p: { a: "#0c4a6e", b: "#38bdf8" } }],
    ["Party crew tee", "party crew birthday event", { a: "PARTY CREW", small: "BIRTHDAY SQUAD", p: { a: "#1e1b4b", b: "#facc15" } }],
    ["Talking bubble tee", "funny quote speech bubble", { a: "Did I say that out loud?", small: "", p: { a: "#111827", b: "#a5f3fc" } }],
    ["Little things tee", "icons doodles happy little things", { a: "LITTLE THINGS", p: { a: "#0f766e", b: "#f97316" } }],
    ["Home city tee", "city coordinates hometown", { a: "HOME", b: "31.5°N  74.3°E", small: "WHERE IT ALL STARTED", p: { a: "#111827", b: "#f59e0b" } }],
  ];
  const HOODIES = [
    ["Night owl hoodie", "night owl late coding", { a: "NIGHT", b: "OWL", c: "CLUB", small: "OPEN AFTER MIDNIGHT", backing: "#1e1b4b", p: { a: "#e5e7eb", b: "#6366f1" } }],
    ["Bookworm badge hoodie", "book reading library", { a: "BOOK WORM", small: "ONE MORE CHAPTER", p: { a: "#7c2d12", b: "#fde68a" } }],
    ["Alpine sunset hoodie", "alpine ski mountain winter", { a: "ALPINE", small: "SNOW · SKI · CHILL", p: { a: "#1e3a8a", b: "#f472b6", c: "#312e81" } }],
    ["Class of 26 hoodie", "graduation class school leavers", { a: "26", b: "CLASS OF", small: "WE MADE IT", p: { a: "#7f1d1d", b: "#ffffff" } }],
    ["Trail runner hoodie", "running trail outdoor", { a: "TRAIL", small: "RUN THE HILLS", p: { a: "#14532d", b: "#a3e635" } }],
    ["Tiny star hoodie", "minimal star pocket", { a: "Shine", small: "QUIETLY", icon: "icon-star", p: { a: "#111827", b: "#f59e0b" } }],
    ["Gym club hoodie", "gym fitness training club", { a: "IRON CLUB", small: "TRAIN · EAT · SLEEP", p: { a: "#111827", b: "#ef4444" } }],
    ["Cozy script hoodie", "cozy winter script", { a: "Cozy", small: "SEASON", p: { a: "#7c2d12", b: "#fdba74" } }],
    ["Dog lover hoodie", "dog pet lover heart", { a: "DOGS", b: "I", p: { a: "#111827", b: "#f43f5e" } }],
    ["Chess club hoodie", "chess club checkered game", { a: "CHESS CLUB", small: "YOUR MOVE", p: { a: "#111827", b: "#d1d5db" } }],
    ["Calm waves hoodie", "calm ocean waves", { a: "STAY CALM", p: { a: "#155e75", b: "#67e8f9" } }],
    ["Gamer hoodie", "gamer gaming level up", { a: "LEVEL UP", small: "PLAYER ONE", p: { a: "#1e1b4b", b: "#22d3ee" } }],
    ["Need coffee hoodie", "coffee funny morning", { a: "Not before coffee", small: "", p: { a: "#111827", b: "#fde68a" } }],
    ["Plant parent hoodie", "plants garden nature icons", { a: "PLANT PARENT", icons: ["icon-leaf", "icon-sun", "icon-leaf", "icon-cloud", "icon-leaf", "icon-umbrella", "icon-leaf", "icon-heart", "icon-leaf"], p: { a: "#166534", b: "#84cc16" } }],
    ["Travel coordinates hoodie", "travel coordinates adventure", { a: "AWAY", b: "36.0°N  74.5°E", small: "HUNZA VALLEY", p: { a: "#1e293b", b: "#38bdf8" } }],
  ];
  const mkAp = (set, preset, tags) => set.forEach(([title, tg, c], i) => {
    tpl(title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-wb", title, preset, tg + " " + tags, (W, H) => {
      const layers = AP[i](kit(W, H), { small: "", b: "", ...c }).filter(Boolean);
      if (!c.backing) return [page("none", layers)];
      // Light words get a dark panel behind them, so the print reads on any garment colour.
      const x0 = Math.min(...layers.map((l) => l.x)), y0 = Math.min(...layers.map((l) => l.y)), x1 = Math.max(...layers.map((l) => l.x + l.w)), y1 = Math.max(...layers.map((l) => l.y + l.h)), pad = W * 0.04;
      return [page("none", [R(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2, c.backing, { radius: W * 0.04, name: "Backing" }), ...layers])];
    });
  });
  mkAp(TEES, "tshirt", "t-shirt tee shirt print apparel merch");
  mkAp(HOODIES, "hoodie", "hoodie sweatshirt print apparel merch");

  /* ---------- mug wraps: 1000 x 412 reference, two print areas (left and right of the handle) ---------- */
  const MUG = [
    (q, c) => { const { t, tm } = q, P = c.p; return [tm(c.a, 40, 0, 440, q.h, { size: 64, bold: true, color: P.a, align: "center", lh: 1 }), tm(c.b, 520, 0, 440, q.h, { size: 64, bold: true, color: P.b, align: "center", lh: 1 })]; },
    (q, c) => { const { c: cc, tm } = q, P = c.p; return [cc(130, 36, 340, 340, P.b), tm(c.a, 150, 36, 300, 340, { size: 42, bold: true, color: WHITE, align: "center", lh: 1.05 }), tm(c.b, 540, 0, 420, q.h, { size: 34, color: P.a, align: "center", lh: 1.3 })]; },
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("line-swoosh", 80, 260, 340, { c1: P.b }), tm(c.a, 40, 60, 440, 200, { size: 92, family: "serif", italic: true, bold: true, color: P.a, align: "center" }), e("line-swoosh", 580, 260, 340, { c1: P.b }), tm(c.a, 520, 60, 440, 200, { size: 92, family: "serif", italic: true, bold: true, color: P.a, align: "center" })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(0, 0, 1000, 90, P.b, { name: "Band" }), r(0, q.h - 90, 1000, 90, P.b, { name: "Band" }), tm(c.a, 40, 90, 920, q.h - 180, { size: 76, bold: true, color: P.a, align: "center", ls: 6 })]; },
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e(c.icon || "icon-chai", 150, 70, 240, { c1: P.b }), tm(c.a, 520, 0, 440, q.h, { size: 58, bold: true, color: P.a, align: "center", lh: 1.05 })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [...Array.from({ length: 7 }, (_, i) => r(60 + i * 60, 80 + i * 0, 40, 250, i % 2 ? P.b : P.a, { radius: 20, name: "Bar" })), tm(c.a, 520, 0, 440, q.h, { size: 60, bold: true, color: P.a, align: "center", lh: 1 })]; },
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("frame-scalloped", 110, 26, 360, { c1: P.b }), tm(c.a, 150, 60, 280, 290, { size: 46, bold: true, color: P.a, align: "center", lh: 1.05 }), e("frame-scalloped", 570, 26, 360, { c1: P.b }), tm(c.b, 610, 60, 280, 290, { size: 46, bold: true, color: P.a, align: "center", lh: 1.05 })]; },
    (q, c) => { const { t, tm } = q, P = c.p; return [tm(c.a, 40, 0, 920, q.h, { size: 120, bold: true, color: P.a, align: "center", outline: { color: P.b, width: 6 } })]; },
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("deco-hearts", 80, 40, 360, { c1: P.b }), tm(c.a, 40, 250, 440, 120, { size: 44, bold: true, color: P.a, align: "center" }), tm(c.b, 520, 0, 440, q.h, { size: 40, family: "serif", italic: true, color: P.a, align: "center", lh: 1.3 })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [r(60, 60, 400, 290, P.b, { radius: 30 }), tm(c.a, 80, 60, 360, 290, { size: 64, bold: true, color: WHITE, align: "center", lh: 1 }), r(540, 60, 400, 290, "none", { stroke: P.b, sw: 6, radius: 30 }), tm(c.b, 560, 60, 360, 290, { size: 40, color: P.a, align: "center", lh: 1.25 })]; },
    (q, c) => { const { t, e, tm } = q, P = c.p; return [...[0, 1, 2, 3, 4, 5].map((i) => e(["icon-sun", "icon-cloud", "icon-umbrella", "icon-moon", "icon-star", "icon-leaf"][i], 60 + (i % 3) * 140, 40 + Math.floor(i / 3) * 170, 110, { c1: i % 2 ? P.b : P.a })), tm(c.a, 520, 0, 440, q.h, { size: 56, bold: true, color: P.a, align: "center", lh: 1.05 })]; },
    (q, c) => { const { t, tm } = q, P = c.p; return [tm(c.a, 40, 30, 440, 200, { size: 150, bold: true, color: P.b, align: "center", lh: 0.9 }), tm(c.b, 40, 240, 440, 140, { size: 34, bold: true, color: P.a, align: "center", ls: 4 }), tm(c.small, 520, 0, 440, q.h, { size: 34, color: P.a, align: "center", lh: 1.4 })]; },
    (q, c) => { const { t, e, tm } = q, P = c.p; return [e("bubble-round", 70, 30, 400, { c1: P.b }), tm(c.a, 110, 50, 320, 240, { size: 44, bold: true, color: P.a, align: "center", lh: 1.1 }), e("face-laughing", 650, 90, 220, { c1: P.b })]; },
    (q, c) => { const { t, r, tm } = q, P = c.p; return [...Array.from({ length: 12 }, (_, i) => r(i * 84, 0, 84, q.h, i % 2 ? P.b : WHITE, { name: "Stripe", op: i % 2 ? 0.35 : 1 })), r(240, 110, 520, 190, WHITE, { radius: 95 }), tm(c.a, 260, 110, 480, 190, { size: 56, bold: true, color: P.a, align: "center" })]; },
    (q, c) => { const { e, tm, c: cc } = q, P = c.p; return [e("badge-seal", 120, 50, 300, { c1: P.b }), cc(166, 96, 208, 208, P.b, { name: "Seal centre", stroke: WHITE, sw: 4 }), tm(c.small, 176, 106, 188, 188, { size: 34, bold: true, color: WHITE, align: "center", lh: 1 }), tm(c.a, 520, 0, 440, q.h, { size: 52, family: "serif", bold: true, color: P.a, align: "center", lh: 1.05 })]; },
  ];
  const MUGS = [
    ["Morning person mug", "funny morning coffee", { a: "Not a\nmorning\nperson", b: "But I\ntry", p: { a: "#111827", b: "#ea580c" } }],
    ["Best teacher mug", "teacher gift school thanks", { a: "BEST\nTEACHER", b: "Thank you for\nevery lesson\nand every smile", p: { a: "#1e3a8a", b: "#2563eb" } }],
    ["Coffee script mug", "coffee script lettering", { a: "Coffee", p: { a: "#7c2d12", b: "#f59e0b" } }],
    ["Boss mug", "office boss work funny", { a: "THE BOSS", p: { a: "#111827", b: "#facc15" } }],
    ["Chai time mug", "chai tea time", { a: "Chai\ntime is\nany time", icon: "icon-chai", p: { a: "#7c2d12", b: "#c2410c" } }],
    ["Equaliser mug", "music equaliser dj", { a: "Turn it\nup", p: { a: "#1e1b4b", b: "#ec4899" } }],
    ["Grandparents mug", "grandma grandpa family gift", { a: "Best\nGrandma", b: "Best\nGrandpa", p: { a: "#7c2d12", b: "#fda4af" } }],
    ["Big word mug", "word typography bold", { a: "HELLO", p: { a: "#ffffff", b: "#111827" } }],
    ["Love note mug", "love valentine couple gift", { a: "Love you", b: "more than\ncoffee", p: { a: "#9f1239", b: "#f43f5e" } }],
    ["Gym mug", "gym fitness protein", { a: "GYM\nTIME", b: "Lift heavy,\ndrink coffee,\nrepeat", p: { a: "#111827", b: "#16a34a" } }],
    ["Weather mug", "weather icons seasons", { a: "Every\nweather\nis tea\nweather", p: { a: "#0c4a6e", b: "#38bdf8" } }],
    ["Birthday number mug", "birthday age number gift", { a: "40", b: "AND FABULOUS", small: "Happy birthday\nto the best\nfriend ever", p: { a: "#111827", b: "#a855f7" } }],
    ["Laughing mug", "funny laugh face joke", { a: "This mug\nis full of\njokes", p: { a: "#111827", b: "#fde047" } }],
    ["Striped name mug", "name stripes personal", { a: "Your name", p: { a: "#1e3a8a", b: "#60a5fa" } }],
    ["Seal of approval mug", "award seal approved gift", { a: "World's okayest\ncook", small: "Award\n2026", p: { a: "#14532d", b: "#16a34a" } }],
  ];
  MUGS.forEach(([title, tg, c], i) => {
    tpl(title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-wb", title, "mug", tg + " mug cup print merch gift", (W, H) => [page(WHITE, MUG[i](kit(W, H), { b: "", small: "", ...c }))]);
  });
  void INK;
}
