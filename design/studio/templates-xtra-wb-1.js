// Extra base layouts from the whiteboard helper (ROUND 2). Pure module, no imports; templates.js calls add(k).
// 45 own portrait print layouts: 15 flyers, 15 posters, 15 invitations (ids end in "-wb"). Fifteen different
// compositions (band, split photo, circle photo, magazine cover, minimal frame, photo grid, sidebar, ticket,
// big number, arch window, checklist, retro stripes, polaroids, quote, agenda), each filled with its own content.
export default function add(k) {
  const { tpl, T, S, R, C, E, F, page, flow } = k;
  const { WHITE } = k.K;
  const EDGE = 12;

  // Layouts are drawn in an 800-unit-wide reference space and scaled to the page (same idea as templates-r2-print.js).
  function kit(W, H, ref = 800) {
    const u = W / ref, h = H / u, b = EDGE / u + 0.5;
    const sc = (o = {}) => { const r = { ...o }; for (const key of ["size", "sw", "radius", "ls"]) if (r[key]) r[key] *= u; if (r.border) r.border = { ...r.border, width: r.border.width * u }; return r; };
    const bl = (x, y, w, hh) => {
      let x0 = x, y0 = y, x1 = x + w, y1 = y + hh;
      if (x0 <= 0.5 && x0 > -b) x0 = -b;
      if (y0 <= 0.5 && y0 > -b) y0 = -b;
      if (x1 >= ref - 0.5 && x1 < ref + b) x1 = ref + b;
      if (y1 >= h - 0.5 && y1 < h + b) y1 = h + b;
      return [x0 * u, y0 * u, (x1 - x0) * u, (y1 - y0) * u];
    };
    // Empty strings make no layer (several contents leave a line out).
    const t = (s, x, y, w, o = {}) => (s ? T(s, x * u, y * u, w * u, sc(o)) : null);
    const keep = (items) => { const out = []; for (const it of items) { if (it === null) { if (typeof out[out.length - 1] === "number") out.pop(); continue; } out.push(it); } return out; };
    return {
      u, w: ref, h, t,
      tm: (s, x, y, w, bh, o = {}) => { const l = t(s, x, y, w, o); if (l) l.y = (y + bh / 2) * u - l.h / 2; return l; },
      r: (x, y, w, hh, fill, o = {}) => R(...bl(x, y, w, hh), fill, sc(o)),
      c: (x, y, w, hh, fill, o = {}) => C(x * u, y * u, w * u, hh * u, fill, sc(o)),
      s: (kind, x, y, w, hh, fill, o = {}) => S(kind, x * u, y * u, w * u, hh * u, fill, sc(o)),
      f: (x, y, w, hh, o = {}) => F(...bl(x, y, w, hh), sc(o)),
      e: (id, x, y, w, o = {}) => E(id, x * u, y * u, w * u, o.h ? { ...o, h: o.h * u } : o),
      col: (y, ...items) => flow(y * u, ...keep(items).map((it) => (typeof it === "number" ? it * u : it))),
      colm: (y, bh, ...items0) => { const items = keep(items0); while (typeof items[items.length - 1] === "number") items.pop(); const tot = items.reduce((a, it) => a + (typeof it === "number" ? it * u : it.h), 0); return flow((y + bh / 2) * u - tot / 2, ...items.map((it) => (typeof it === "number" ? it * u : it))); },
      bot: (l) => (l.y + l.h) / u,
    };
  }

  // c = { kicker, title, sub, body, items: [..], cta, meta, num, quote, by, p: { bg, ink, acc, acc2, soft }, serif }
  const A = [
    // 0 diagonal band
    (q, c) => { const { h, t, r, f, e, col } = q, P = c.p; return page(P.bg, [
      t(c.kicker, 50, 50, 700, { size: 24, bold: true, color: P.acc, ls: 5 }),
      r(-60, 150, 920, 250, P.acc, { rot: -5, name: "Band" }),
      t(c.title, 40, 190, 720, { size: 86, bold: true, color: WHITE, align: "center", lh: 0.95, rot: -5 }),
      f(50, 470, 380, 400, { shape: "rounded", radius: 22 }),
      col(480, t(c.sub, 460, 0, 300, { size: 32, bold: true, color: P.ink, lh: 1.15 }), 18, t(c.body, 460, 0, 300, { size: 20, color: P.ink, lh: 1.5, op: 0.85 })),
      e("deco-sparkles", 690, 40, 80, { c1: P.acc2, c2: P.ink }),
      r(0, h - 150, 800, 150, P.ink, { name: "Footer" }),
      t(c.cta, 50, h - 128, 700, { size: 34, bold: true, color: WHITE, align: "center" }),
      t(c.meta, 50, h - 70, 700, { size: 19, color: P.soft, align: "center" }),
    ]); },
    // 1 split: photo left, text right
    (q, c) => { const { h, t, r, f, colm } = q, P = c.p; return page(P.bg, [
      f(0, 0, 370, h, { name: "Photo" }),
      r(370, 0, 12, h, P.acc, { name: "Edge" }),
      colm(0, h, t(c.kicker, 420, 0, 340, { size: 20, bold: true, color: P.acc, ls: 4 }), 22,
        t(c.title, 420, 0, 340, { size: 70, bold: true, color: P.ink, lh: 1, family: c.serif ? "serif" : "sans" }), 26,
        t(c.sub, 420, 0, 340, { size: 26, color: P.ink, lh: 1.3 }), 26,
        t(c.body, 420, 0, 340, { size: 19, color: P.ink, lh: 1.55, op: 0.8 }), 36,
        t(c.cta, 420, 0, 340, { size: 24, bold: true, color: WHITE, bg: { color: P.acc, pad: 0.5, radius: 0.4 } }), 30,
        t(c.meta, 420, 0, 340, { size: 17, color: P.ink, op: 0.7, lh: 1.5 })),
    ]); },
    // 2 circle photo
    (q, c) => { const { h, t, r, cc = q.c, f, e, col } = q, P = c.p; return page(P.bg, [
      cc(220, 60, 360, 360, P.acc, { name: "Ring" }),
      f(236, 76, 328, 328, { shape: "circle" }),
      e("deco-sparkle", 590, 90, 70, { c1: P.acc2 }), e("deco-sparkle", 150, 330, 50, { c1: P.acc2 }),
      col(460, t(c.title, 60, 0, 680, { size: 78, bold: true, color: P.ink, align: "center", lh: 1, family: c.serif ? "serif" : "sans" }), 16,
        t(c.sub, 60, 0, 680, { size: 28, color: P.acc, bold: true, align: "center" }), 26,
        t(c.body, 110, 0, 580, { size: 21, color: P.ink, align: "center", lh: 1.5, op: 0.85 })),
      r(120, h - 230, 560, 2, P.acc, { name: "Rule" }),
      t(c.cta, 60, h - 200, 680, { size: 32, bold: true, color: P.ink, align: "center" }),
      t(c.meta, 60, h - 140, 680, { size: 19, color: P.ink, align: "center", op: 0.7 }),
    ]); },
    // 3 magazine cover
    (q, c) => { const { h, t, r, f, col } = q, P = c.p; return page(P.ink, [
      f(0, 0, 800, h * 0.66, { name: "Cover photo" }),
      t(c.kicker, 40, 40, 720, { size: 26, bold: true, color: WHITE, ls: 8, shadow: { x: 0, y: 2, blur: 8, color: "#000000" } }),
      r(0, h * 0.66 - 180, 800, 180, P.ink, { op: 0.72, name: "Shade" }),
      t(c.title, 40, h * 0.66 - 165, 720, { size: 80, bold: true, color: WHITE, lh: 0.95, family: c.serif ? "serif" : "sans" }),
      col(h * 0.66 + 40, t(c.sub, 40, 0, 720, { size: 30, bold: true, color: P.acc2 }), 18, t(c.body, 40, 0, 720, { size: 21, color: WHITE, lh: 1.5, op: 0.85 })),
      t(c.cta, 40, h - 110, 440, { size: 26, bold: true, color: P.ink, bg: { color: P.acc2, pad: 0.5, radius: 0.3 } }),
      t(c.meta, 480, h - 108, 280, { size: 17, color: WHITE, align: "right", op: 0.8, lh: 1.4 }),
    ]); },
    // 4 minimal frame (serif)
    (q, c) => { const { h, t, r, e, colm } = q, P = c.p; return page(P.bg, [
      r(40, 40, 720, h - 80, "none", { stroke: P.acc, sw: 3, name: "Frame" }),
      r(56, 56, 688, h - 112, "none", { stroke: P.acc, sw: 1, name: "Inner frame" }),
      colm(60, h - 120, t(c.kicker, 120, 0, 560, { size: 22, color: P.acc, align: "center", ls: 6 }), 30,
        t(c.title, 100, 0, 600, { size: 76, family: "serif", color: P.ink, align: "center", lh: 1.05 }), 26,
        e("line-ornament", 300, 0, 200, { c1: P.acc }), 26,
        t(c.sub, 120, 0, 560, { size: 28, family: "serif", italic: true, color: P.ink, align: "center" }), 24,
        t(c.body, 140, 0, 520, { size: 20, color: P.ink, align: "center", lh: 1.6, op: 0.85 }), 40,
        t(c.cta, 120, 0, 560, { size: 24, bold: true, color: P.acc, align: "center", ls: 3 }), 14,
        t(c.meta, 120, 0, 560, { size: 18, color: P.ink, align: "center", op: 0.7 })),
    ]); },
    // 5 photo grid
    (q, c) => { const { h, t, r, f, col } = q, P = c.p; return page(P.bg, [
      f(40, 40, 355, 300, { shape: "rounded", radius: 18 }), f(405, 40, 355, 300, { shape: "rounded", radius: 18 }),
      f(40, 350, 355, 300, { shape: "rounded", radius: 18 }), f(405, 350, 355, 300, { shape: "rounded", radius: 18 }),
      col(690, t(c.kicker, 40, 0, 720, { size: 22, bold: true, color: P.acc, ls: 4 }), 10,
        t(c.title, 40, 0, 720, { size: 66, bold: true, color: P.ink, lh: 1 }), 14,
        t(c.body, 40, 0, 720, { size: 21, color: P.ink, lh: 1.5, op: 0.85 })),
      r(0, h - 110, 800, 110, P.acc, { name: "Footer" }),
      t(c.cta + "  ·  " + c.meta, 40, h - 76, 720, { size: 22, bold: true, color: WHITE, align: "center" }),
    ]); },
    // 6 sidebar list
    (q, c) => { const { h, t, r, f, e, col } = q, P = c.p; return page(P.bg, [
      r(0, 0, 280, h, P.acc, { name: "Sidebar" }),
      col(70, t(c.kicker, 30, 0, 220, { size: 20, bold: true, color: WHITE, ls: 3 }), 30,
        ...c.items.slice(0, 5).flatMap((it) => [t("• " + it, 30, 0, 220, { size: 22, color: WHITE, lh: 1.3 }), 18])),
      t(c.meta, 30, h - 170, 220, { size: 17, color: WHITE, lh: 1.5, op: 0.9 }),
      col(70, t(c.title, 330, 0, 430, { size: 66, bold: true, color: P.ink, lh: 1, family: c.serif ? "serif" : "sans" }), 20,
        t(c.sub, 330, 0, 430, { size: 26, color: P.acc, bold: true })),
      f(330, 420, 430, 420, { shape: "rounded", radius: 20 }),
      t(c.body, 330, 870, 430, { size: 20, color: P.ink, lh: 1.5, op: 0.85 }),
      t(c.cta, 330, h - 110, 430, { size: 26, bold: true, color: P.acc }),
      e("arrow-right", 690, h - 116, 60, { c1: P.acc }),
    ]); },
    // 7 ticket
    (q, c) => { const { h, t, r, cc = q.c, colm } = q, P = c.p; return page(P.acc, [
      r(80, 140, 640, h - 280, P.bg, { radius: 30, name: "Ticket" }),
      cc(48, h / 2 - 32, 64, 64, P.acc, { name: "Notch" }), cc(688, h / 2 - 32, 64, 64, P.acc, { name: "Notch" }),
      ...Array.from({ length: 14 }, (_, i) => r(124 + i * 40, h / 2 + 148, 22, 4, P.acc, { name: "Tear line" })),
      t(c.kicker, 80, 70, 640, { size: 24, bold: true, color: WHITE, align: "center", ls: 8 }),
      colm(170, h / 2 - 50, t(c.title, 120, 0, 560, { size: 72, bold: true, color: P.ink, align: "center", lh: 1 }), 20,
        t(c.sub, 120, 0, 560, { size: 28, color: P.acc, bold: true, align: "center" }), 20,
        t(c.body, 140, 0, 520, { size: 20, color: P.ink, align: "center", lh: 1.5, op: 0.85 })),
      colm(h / 2 + 160, h / 2 - 310, t(c.cta, 120, 0, 560, { size: 36, bold: true, color: P.ink, align: "center" }), 12,
        t(c.meta, 120, 0, 560, { size: 19, color: P.ink, align: "center", op: 0.7 })),
    ]); },
    // 8 big number
    (q, c) => { const { h, t, r, f, col } = q, P = c.p; return page(P.bg, [
      t(c.num, 30, 40, 740, { size: 250, bold: true, color: P.acc, lh: 0.9, align: "left" }),
      col(330, t(c.title, 40, 0, 720, { size: 60, bold: true, color: P.ink, lh: 1 }), 18, t(c.sub, 40, 0, 720, { size: 28, color: P.ink, op: 0.8 })),
      f(40, 560, 720, h - 830, { shape: "rounded", radius: 24 }),
      t(c.body, 40, h - 245, 720, { size: 21, color: P.ink, lh: 1.5, op: 0.85 }),
      r(40, h - 120, 720, 76, P.ink, { radius: 38, name: "Button" }),
      q.tm(c.cta + "  ·  " + c.meta, 60, h - 120, 680, 76, { size: 22, bold: true, color: WHITE, align: "center" }),
    ]); },
    // 9 arch window
    (q, c) => { const { h, t, r, f, e, col } = q, P = c.p; return page(P.soft, [
      f(170, 70, 460, 560, { shape: "rounded", radius: 230 }),
      r(150, 50, 500, 600, "none", { stroke: P.acc, sw: 3, radius: 250, name: "Arch line" }),
      e("deco-sprig", 600, 560, 120, { c1: P.acc }),
      col(690, t(c.title, 60, 0, 680, { size: 64, family: "serif", color: P.ink, align: "center", lh: 1.05 }), 14,
        t(c.sub, 60, 0, 680, { size: 26, family: "serif", italic: true, color: P.acc, align: "center" }), 18,
        t(c.body, 120, 0, 560, { size: 20, color: P.ink, align: "center", lh: 1.5, op: 0.85 }), 24,
        t(c.cta, 60, 0, 680, { size: 22, bold: true, color: P.ink, align: "center", ls: 3 }), 10,
        t(c.meta, 60, 0, 680, { size: 18, color: P.ink, align: "center", op: 0.7 })),
    ]); },
    // 10 checklist
    (q, c) => { const { h, t, r, e, col } = q, P = c.p; return page(P.bg, [
      r(0, 0, 800, 330, P.acc, { name: "Header" }),
      col(60, t(c.kicker, 50, 0, 700, { size: 22, bold: true, color: WHITE, ls: 4, op: 0.9 }), 12, t(c.title, 50, 0, 700, { size: 74, bold: true, color: WHITE, lh: 0.98 })),
      ...c.items.slice(0, 5).flatMap((it, i) => { const st = Math.min(104, (h - 640) / 5); return [e("icon-check-circle", 60, 375 + i * st, 56, { c1: P.acc }), q.tm(it, 140, 375 + i * st, 600, 56, { size: 28, bold: true, color: P.ink })]; }),
      t(c.body, 60, h - 215, 680, { size: 20, color: P.ink, lh: 1.5, op: 0.85 }),
      r(60, h - 120, 360, 72, P.ink, { radius: 36, name: "Button" }),
      q.tm(c.cta, 60, h - 120, 360, 72, { size: 24, bold: true, color: WHITE, align: "center" }),
      t(c.meta, 440, h - 112, 320, { size: 17, color: P.ink, lh: 1.4, op: 0.75 }),
    ]); },
    // 11 retro stripes
    (q, c) => { const { h, t, r, colm } = q, P = c.p; return page(P.bg, [
      ...[P.acc, P.acc2, P.ink, P.acc].map((col, i) => r(0, 70 + i * 44, 800, 30, col, { name: "Stripe" })),
      r(80, 300, 640, 420, WHITE, { radius: 24, name: "Card", stroke: P.ink, sw: 4 }),
      colm(300, 420, t(c.kicker, 120, 0, 560, { size: 22, bold: true, color: P.acc, align: "center", ls: 6 }), 14,
        t(c.title, 110, 0, 580, { size: 74, bold: true, color: P.ink, align: "center", lh: 0.98 }), 16,
        t(c.sub, 120, 0, 560, { size: 26, color: P.ink, align: "center" })),
      t(c.body, 100, 760, 600, { size: 21, color: P.ink, align: "center", lh: 1.5 }),
      ...[P.acc, P.acc2, P.ink, P.acc].map((col, i) => r(0, h - 230 + i * 44, 800, 30, col, { name: "Stripe" })),
      t(c.cta + "  ·  " + c.meta, 40, h - 64, 720, { size: 20, bold: true, color: P.ink, align: "center" }),
    ]); },
    // 12 polaroids
    (q, c) => { const { h, t, r, f, col } = q, P = c.p;
      const pol = (x, y, rot) => [r(x, y, 260, 300, WHITE, { rot, name: "Polaroid" }), f(x + 16, y + 16, 228, 220, { rot })];
      return page(P.soft, [
        ...pol(60, 80, -8), ...pol(270, 50, 4), ...pol(480, 90, -3),
        col(460, t(c.title, 50, 0, 700, { size: 74, bold: true, color: P.ink, lh: 1, family: c.serif ? "serif" : "sans" }), 16,
          t(c.sub, 50, 0, 700, { size: 28, color: P.acc, bold: true }), 20, t(c.body, 50, 0, 700, { size: 21, color: P.ink, lh: 1.5, op: 0.85 })),
        r(50, h - 140, 700, 2, P.ink, { op: 0.3, name: "Rule" }),
        t(c.cta, 50, h - 115, 380, { size: 26, bold: true, color: P.ink }),
        t(c.meta, 440, h - 112, 310, { size: 17, color: P.ink, align: "right", op: 0.7, lh: 1.4 }),
      ]); },
    // 13 quote
    (q, c) => { const { h, t, r, e, colm } = q, P = c.p; return page(P.ink, [
      t("“", 50, 40, 300, { size: 300, family: "serif", color: P.acc, lh: 1 }),
      colm(150, h - 420, t(c.quote, 70, 0, 660, { size: 54, family: "serif", color: WHITE, lh: 1.2 }), 34, t("— " + c.by, 70, 0, 660, { size: 26, color: P.acc2, bold: true })),
      r(70, h - 250, 660, 2, P.acc, { name: "Rule" }),
      t(c.title, 70, h - 220, 660, { size: 34, bold: true, color: WHITE }),
      t(c.meta, 70, h - 160, 660, { size: 19, color: WHITE, op: 0.75, lh: 1.4 }),
      e("deco-sparkle", 680, h - 140, 60, { c1: P.acc2 }),
    ]); },
    // 14 agenda
    (q, c) => { const { h, t, r, cc = q.c, col } = q, P = c.p; return page(P.bg, [
      col(60, t(c.kicker, 60, 0, 680, { size: 22, bold: true, color: P.acc, ls: 5 }), 10, t(c.title, 60, 0, 680, { size: 70, bold: true, color: P.ink, lh: 1, family: c.serif ? "serif" : "sans" }), 12, t(c.sub, 60, 0, 680, { size: 26, color: P.ink, op: 0.8 })),
      r(130, 360, 4, 560, P.acc, { name: "Timeline" }),
      ...c.items.slice(0, 5).flatMap((it, i) => { const [tm, what] = it.split("|"); return [cc(118, 372 + i * 112, 28, 28, P.acc, { name: "Dot" }), t(tm, 160, 368 + i * 112, 200, { size: 22, bold: true, color: P.acc }), t(what, 160, 400 + i * 112, 580, { size: 24, color: P.ink })]; }),
      r(0, h - 130, 800, 130, P.ink, { name: "Footer" }),
      t(c.cta, 60, h - 108, 680, { size: 28, bold: true, color: WHITE }),
      t(c.meta, 60, h - 60, 680, { size: 18, color: WHITE, op: 0.8 }),
    ]); },
  ];

  const PAL = {
    sun: { bg: "#fff7e6", ink: "#1f2937", acc: "#ea580c", acc2: "#facc15", soft: "#fed7aa" },
    sea: { bg: "#f0f9ff", ink: "#0c2d48", acc: "#0284c7", acc2: "#22d3ee", soft: "#bae6fd" },
    leaf: { bg: "#f0fdf4", ink: "#14532d", acc: "#16a34a", acc2: "#a3e635", soft: "#dcfce7" },
    rose: { bg: "#fff1f2", ink: "#4c0519", acc: "#e11d48", acc2: "#fda4af", soft: "#ffe4e6" },
    plum: { bg: "#faf5ff", ink: "#2e1065", acc: "#7c3aed", acc2: "#f0abfc", soft: "#ede9fe" },
    ink: { bg: "#f8fafc", ink: "#0f172a", acc: "#2563eb", acc2: "#fde047", soft: "#e2e8f0" },
    gold: { bg: "#fffbeb", ink: "#3f2a0c", acc: "#b45309", acc2: "#fcd34d", soft: "#fef3c7" },
    mint: { bg: "#f0fdfa", ink: "#134e4a", acc: "#0d9488", acc2: "#fbbf24", soft: "#ccfbf1" },
    night: { bg: "#eef2ff", ink: "#1e1b4b", acc: "#4f46e5", acc2: "#f472b6", soft: "#e0e7ff" },
    clay: { bg: "#fdf6f0", ink: "#3b2418", acc: "#c2410c", acc2: "#f59e0b", soft: "#fde3cf" },
    sage: { bg: "#f6f7f2", ink: "#2f3b2b", acc: "#5f7d4f", acc2: "#d9b26a", soft: "#e6ebdc" },
    berry: { bg: "#fdf2f8", ink: "#500724", acc: "#be185d", acc2: "#fb7185", soft: "#fce7f3" },
    sky: { bg: "#f5faff", ink: "#172554", acc: "#1d4ed8", acc2: "#38bdf8", soft: "#dbeafe" },
    coral: { bg: "#fff5f2", ink: "#431407", acc: "#f97316", acc2: "#fb7185", soft: "#ffedd5" },
    olive: { bg: "#fbfbf3", ink: "#365314", acc: "#65a30d", acc2: "#facc15", soft: "#ecfccb" },
  };

  const FLYERS = [
    ["Weekend market flyer", "market farmers food weekend local", { kicker: "EVERY SATURDAY", title: "FARMERS\nMARKET", sub: "Fresh from local farms", body: "Seasonal fruit and vegetables, warm bread, honey, cheese and flowers from growers within 50 km.", cta: "8 am - 1 pm", meta: "Town Square car park · free entry", p: PAL.leaf }],
    ["Yoga class flyer", "yoga class fitness wellness studio", { kicker: "NEW CLASSES", title: "Morning Yoga", sub: "Stretch, breathe, reset", body: "Gentle flow for every level. Mats and blocks provided, just bring water and a friend.", cta: "First class free", meta: "Lotus Studio\n12 Park Lane\nlotusyoga.studio", p: PAL.mint, serif: true }],
    ["Bake sale flyer", "bake sale cakes charity school fundraiser", { kicker: "SCHOOL FUNDRAISER", title: "Big Bake Sale", sub: "Cakes, cookies and pies", body: "All money raised goes to new books for the school library. Home bakers welcome!", cta: "Friday 3 pm in the hall", meta: "Green Hill Primary School", p: PAL.rose }],
    ["Music night flyer", "music live night gig concert bar", { kicker: "LIVE ON STAGE", title: "Jazz Night", sub: "The Blue Note Trio", body: "Smooth standards, new songs and a late jam session. Food and drinks at the bar.", cta: "Book a table", meta: "Fri 20 June · 8 pm\nThe Corner Club", p: PAL.night }],
    ["Open house flyer", "real estate open house home sale property", { kicker: "OPEN HOUSE", title: "Your Next Home", sub: "3 bed · 2 bath · garden", body: "Bright family home close to schools, parks and the station. Come and look around.", cta: "Sunday 1 - 4 pm", meta: "18 Willow Road · call 0300 123 4567", p: PAL.sage }],
    ["Cafe menu flyer", "cafe coffee menu food shop", { kicker: "NOW SERVING", title: "Coffee & Cake", sub: "", body: "Espresso, flat white, chai latte and fresh cakes baked every morning in our kitchen.", cta: "Open 7 am - 7 pm", meta: "Bean There Cafe", p: PAL.clay }],
    ["Cleaning service flyer", "cleaning service home office business", { kicker: "WE CLEAN", title: "Sparkle Home Cleaning", sub: "Trusted, insured, eco-friendly", body: "Weekly, monthly or one-off deep cleans for homes and small offices.", items: ["Kitchens and bathrooms", "Windows inside and out", "Carpets and floors", "End of tenancy", "Eco products"], cta: "Get a free quote", meta: "sparklehome.co\n0300 555 0101", p: PAL.sky }],
    ["Workshop ticket flyer", "workshop event class ticket learn", { kicker: "ONE-DAY WORKSHOP", title: "Pottery Basics", sub: "Make your own mug", body: "Learn to throw, trim and glaze. All clay and firing included.", cta: "Saturday 10 am", meta: "Clay Corner · 25 seats only", p: PAL.clay }],
    ["Sale percentage flyer", "sale discount shop store offer percent", { kicker: "", num: "50%", title: "Everything must go", sub: "Our biggest sale of the year", body: "Furniture, lamps and rugs at half price while stock lasts. New items added daily.", cta: "This weekend only", meta: "Home & Co", p: PAL.coral }],
    ["Wellness retreat flyer", "retreat wellness spa weekend calm", { kicker: "", title: "Slow Weekend Retreat", sub: "Two days to rest", body: "Yoga, forest walks, warm meals and quiet evenings by the fire.", cta: "Book by 30 May", meta: "Hilltop Lodge · hilltop.stay", p: PAL.sage }],
    ["Tutoring flyer", "tutor tutoring school maths english education", { kicker: "AFTER SCHOOL", title: "Maths & English Tutoring", items: ["Ages 8 to 16", "Small groups of 4", "Exam practice", "Weekly progress notes", "First lesson free"], body: "Qualified teachers who make tricky topics simple.", cta: "Book a trial", meta: "BrightPath Learning\n0300 777 2020", p: PAL.ink }],
    ["Retro roller disco flyer", "disco party retro roller skate event", { kicker: "FRIDAY NIGHT", title: "ROLLER\nDISCO", sub: "Skates, lights and 80s hits", body: "Bring your own skates or hire a pair at the door. All ages until 9 pm.", cta: "7 pm till late", meta: "Rink 21", p: PAL.berry }],
    ["Photography class flyer", "photography class camera workshop", { kicker: "", title: "Learn Photography", sub: "Six weekly lessons", body: "From camera basics to light and composition, with a photo walk every week.", cta: "Starts 3 March", meta: "Lens Club · lensclub.org", p: PAL.gold }],
    ["Volunteer flyer", "volunteer charity community help", { kicker: "", quote: "Small acts, done by many, change a whole town.", by: "Our volunteers", title: "Volunteer with us", meta: "Food bank shifts every weekday · helpinghands.org", p: PAL.leaf }],
    ["Charity run flyer", "run race charity fun run event", { kicker: "5K FUN RUN", title: "Run for Water", sub: "Sunday 14 September", items: ["7:30|Check-in and warm-up", "8:00|5K run starts", "9:00|Medals and photos", "9:30|Breakfast stalls", "10:00|Prize giving"], cta: "Sign up at runwater.org", meta: "Riverside Park · all ages welcome", p: PAL.sea }],
  ];
  const POSTERS = [
    ["Summer festival poster", "festival music summer outdoor event", { kicker: "3 DAYS · 40 ARTISTS", title: "SUNSET\nFESTIVAL", sub: "Music, food and art by the lake", body: "Two stages, street food, a kids' area and fireworks on Saturday night.", cta: "Tickets on sale now", meta: "12 - 14 July · Lakeside Park", p: PAL.sun }],
    ["Art exhibition poster", "art exhibition gallery show painting", { kicker: "NEW EXHIBITION", title: "Colour & Light", sub: "Paintings by Lina Haider", body: "Forty new works about cities at dawn, rain and quiet streets.", cta: "Free entry", meta: "Open daily 10 - 6\nCity Gallery", p: PAL.plum, serif: true }],
    ["Book club poster", "book club reading library", { kicker: "MONTHLY BOOK CLUB", title: "Read with Us", sub: "This month: a mystery", body: "Tea, biscuits and good talk about a good book. New members always welcome.", cta: "Last Thursday, 6 pm", meta: "Central Library, room 2", p: PAL.gold, serif: true }],
    ["Film night poster", "film movie night cinema screening", { kicker: "OPEN-AIR CINEMA", title: "Movie Night Under the Stars", sub: "Bring a blanket", body: "A family film on the big screen, popcorn and hot chocolate.", cta: "Saturday 8 pm", meta: "School field · free", p: PAL.night }],
    ["Gallery talk poster", "talk lecture event museum", { kicker: "EVENING TALK", title: "The Story of Tiles", sub: "A history in colour", body: "An illustrated talk about patterns, glazes and the hands that made them.", cta: "Wednesday 7 pm", meta: "Museum of Craft", p: PAL.clay }],
    ["Travel poster", "travel tourism destination holiday", { kicker: "VISIT THE NORTH", title: "Mountain Valleys", body: "Glacier lakes, wooden villages and the friendliest people you will ever meet.", cta: "Plan your trip", meta: "northvalleys.travel", p: PAL.sea }],
    ["Safety poster", "safety workplace rules health office", { kicker: "SAFETY FIRST", title: "Stay Safe at Work", items: ["Wear your badge", "Keep exits clear", "Report spills now", "Lift with your knees", "Know your first-aider"], cta: "Thank you", meta: "Health and Safety Team", p: PAL.sun }],
    ["Concert ticket poster", "concert music ticket orchestra", { kicker: "ONE NIGHT ONLY", title: "City Orchestra", sub: "Music from the movies", body: "Big themes from favourite films, played live by 60 musicians.", cta: "Sat 9 Nov · 7:30 pm", meta: "Town Hall · tickets from $12", p: PAL.plum }],
    ["Countdown poster", "countdown launch event days", { num: "10", title: "days to launch", sub: "Something new is coming", body: "Follow along as we open the doors to our new studio space.", cta: "Save the date", meta: "@thenewstudio", p: PAL.ink }],
    ["Wedding fair poster", "wedding fair bridal event expo", { title: "The Wedding Fair", sub: "Ideas for your big day", body: "Meet 50 local florists, bakers, photographers and planners.", cta: "Sunday 10 am - 4 pm", meta: "The Grand Hall", p: PAL.rose }],
    ["Recycling poster", "recycling environment green waste", { kicker: "WHAT GOES IN THE GREEN BIN", title: "Recycle Right", items: ["Clean plastic bottles", "Cans and tins", "Flat cardboard", "Glass jars", "Paper and magazines"], body: "Rinse it, squash it, bin it.", cta: "Collected every Tuesday", meta: "Council Recycling Team", p: PAL.leaf }],
    ["Retro diner poster", "diner food retro restaurant burger", { kicker: "SINCE 1962", title: "THE BIG\nDINER", sub: "Burgers · shakes · fries", body: "Classic food served fast, with a jukebox in every booth.", cta: "Open late every day", meta: "Route 9", p: PAL.coral }],
    ["Photo exhibition poster", "photo exhibition gallery photography", { title: "Faces of the City", sub: "A photo exhibition", body: "Portraits of the people who keep our city running, day and night.", cta: "1 - 30 March", meta: "Riverside Gallery", p: PAL.sage }],
    ["Motivational quote poster", "quote motivation inspiration office", { quote: "Start where you are. Use what you have. Do what you can.", by: "A wise teacher", title: "Keep going", meta: "", p: PAL.night }],
    ["Conference poster", "conference event business tech agenda", { kicker: "ANNUAL CONFERENCE", title: "Build the Future", sub: "Ideas, tools and people", items: ["9:00|Welcome and keynote", "10:30|Product workshops", "12:30|Lunch and networking", "14:00|Panel: AI at work", "16:00|Awards and close"], cta: "Register at buildfuture.events", meta: "Expo Centre · 18 October", p: PAL.sky }],
  ];
  const INVITES = [
    ["Birthday party invitation", "birthday party celebration invite", { kicker: "YOU'RE INVITED", title: "Zara is\nturning 7!", sub: "Party time", body: "Games, cake and a magic show. Please come in your brightest colours.", cta: "Sat 14 June · 3 pm", meta: "RSVP to Mum · 0300 111 2233", p: PAL.berry }],
    ["Wedding invitation", "wedding invitation marriage ceremony", { kicker: "TOGETHER WITH THEIR FAMILIES", title: "Amna & Hassan", sub: "invite you to their wedding", body: "We would love you to share our happy day with us.", cta: "Saturday 20 December", meta: "4 pm · The Garden House", p: PAL.sage, serif: true }],
    ["Baby shower invitation", "baby shower invitation party", { kicker: "OH BABY!", title: "Baby Shower", sub: "for Sana", body: "Join us for tea, cake and sweet wishes for the little one on the way.", cta: "Sunday 3 pm", meta: "12 Rose Street", p: PAL.sky }],
    ["Graduation party invitation", "graduation party celebration school", { kicker: "CLASS OF 2026", title: "Graduation Party", sub: "Ali did it!", body: "Come and celebrate with food, music and lots of photos.", cta: "Friday 7 pm", meta: "Our home · 9 Hill Road", p: PAL.ink }],
    ["Dinner party invitation", "dinner party invitation evening", { kicker: "PLEASE JOIN US FOR", title: "Dinner with Friends", sub: "Good food, long talks", body: "A relaxed evening around the table. Bring your appetite.", cta: "Saturday 8 pm", meta: "RSVP by Thursday", p: PAL.gold, serif: true }],
    ["Engagement invitation", "engagement party invitation couple", { kicker: "", title: "We're Engaged!", sub: "Sara & Omar", body: "Celebrate with us over dinner and dancing.", items: ["Dinner", "Music", "Cake"], cta: "Friday 15 August", meta: "The Rooftop", p: PAL.rose }],
    ["Housewarming invitation", "housewarming party new home", { kicker: "NEW HOME", title: "House\nwarming", items: ["Snacks and drinks", "House tour", "Garden games", "Bring a plant!", "Kids welcome"], cta: "Sat 2 pm", meta: "45 Oak Avenue", p: PAL.leaf }],
    ["Gala ticket invitation", "gala dinner charity event ticket", { kicker: "ADMIT ONE", title: "Charity Gala", sub: "Black tie dinner", body: "An evening of music and giving in support of the children's ward.", cta: "Saturday 6 December", meta: "7 pm · The Grand Hotel", p: PAL.plum }],
    ["Anniversary invitation", "anniversary party celebration years", { num: "25", title: "years together", sub: "Rabia & Imran", body: "Please join us to celebrate our silver anniversary.", cta: "Sunday 1 pm · lunch", meta: "RSVP to Nida", p: PAL.gold }],
    ["Bridal shower invitation", "bridal shower party wedding", { title: "Bridal Shower", sub: "honouring Mehak", body: "Brunch, flowers and stories about the bride-to-be.", cta: "Sunday 11 am", meta: "The Tea Room", p: PAL.berry }],
    ["Kids party invitation", "kids party birthday games", { kicker: "ADVENTURE PARTY", title: "Treasure Hunt!", items: ["Pirate games", "Face painting", "Pizza lunch", "Treasure prizes", "Party bags"], body: "Come dressed as a pirate!", cta: "Sat 12 noon", meta: "Ayaan turns 6 · Park Pavilion", p: PAL.sea }],
    ["Retro party invitation", "party retro 70s 80s disco", { kicker: "COME DRESSED UP", title: "Back to the 80s", sub: "Party", body: "Big hair, neon and the best songs of the decade.", cta: "Saturday 9 pm", meta: "Hall 4", p: PAL.night }],
    ["Tea party invitation", "tea party afternoon garden invite", { title: "Afternoon Tea", sub: "in the garden", body: "Sandwiches, scones and pretty cups. Hats are encouraged!", cta: "Sunday 4 pm", meta: "Grandma's garden", p: PAL.mint, serif: true }],
    ["Retirement invitation", "retirement party farewell work", { quote: "After 30 wonderful years, it's time for new adventures.", by: "Mr. Ahmed", title: "Retirement party", meta: "Friday 5 pm · staff room · cake and speeches", p: PAL.clay }],
    ["Eid lunch invitation", "eid lunch family gathering celebration", { kicker: "EID MUBARAK", title: "Eid Lunch", sub: "with family and friends", items: ["1:00|Welcome and sweets", "1:30|Lunch", "3:00|Gifts for the kids", "4:00|Tea and chat", "5:00|Goodbyes"], cta: "Sunday at our home", meta: "Please let us know by Friday", p: PAL.mint }],
  ];

  const mk = (set, preset, suffix) => set.forEach(([title, tags, c], i) => {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-wb";
    tpl(id, title, preset, tags + " " + suffix, (W, H) => {
      const q = kit(W, H, 800);
      const cc = { kicker: "", sub: "", body: "", items: [], cta: "", meta: "", num: "", quote: "", by: "", ...c };
      return [A[i](q, cc)];
    });
  });
  mk(FLYERS, "flyer-a4", "flyer leaflet print");
  mk(POSTERS, "poster-18x24", "poster print wall");
  mk(INVITES, "invitation-5x7", "invitation invite card");
}
