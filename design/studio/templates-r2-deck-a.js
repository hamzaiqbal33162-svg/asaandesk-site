// ROUND 2 layout batch (see screens/canva-ref/STUDIO-LAYOUT-BRIEF.md): 20 presentation decks, each its own visual
// system (grid, type pairing, shape language, palette, image treatment), 10 slides each with speaker notes.
// Pure module: templates.js calls the default export with its helpers. Team members show people photos of their kind
// (templates-faces.js: woman or man by the name, doctor / teacher / chef… by the role).
import { castFor, member, face, KIND } from "./templates-faces.js";

export default function add(k) {
  const { tpl, T, S, R, C, E, F, page } = k;
  const WHITE = "#ffffff";
  /** Stacks layers downwards from y; a number between two items is the gap between them. */
  function flow(y, ...items) { const out = []; for (const it of items) { if (typeof it === "number") { y += it; continue; } if (!it) continue; it.y = y; y += it.h; out.push(it); } return out; }
  const SL = (b, layers, notes) => { const p = page(b, layers.flat(Infinity)); p.notes = notes; return p; };
  let CAST = null; // the person picker of the deck being built
  const deck = (slug, title, tags, build) => tpl(slug + "-dk1", title, "presentation-16x9", "presentation slides deck " + tags, (W, H) => { CAST = castFor(slug + "-dk1"); return build(W, H); });
  const pick = (v, i) => (Array.isArray(v) ? v[i % v.length] : v);
  /** Background texture (grid / ruled lines) is locked so it is not picked up by accident. */
  const lock = (l) => { l.locked = true; return l; };
  const after = (l, gap = 0) => { const x = Array.isArray(l) ? l[l.length - 1] : l; return x.y + x.h + gap; };
  const mid = (l, cy) => { l.y = cy - l.h / 2; return l; };
  const gaps = (items, g) => items.flatMap((it, i) => (i ? [g, it] : [it]));
  /** Stacks items centred on cy with gap g between them. */
  const stackMid = (cy, g, ...items) => flow(cy - (items.reduce((s, l) => s + l.h, 0) + g * (items.length - 1)) / 2, ...gaps(items, g));
  function mark(kind, x, y, d, fill, o = {}) {
    if (kind === "diamond") return S("polygon", x, y, d, d, fill, { ...o, sides: 4 });
    if (kind === "hex") return S("polygon", x, y, d, d, fill, { ...o, sides: 6 });
    if (kind === "square") return R(x, y, d, d, fill, o);
    if (kind === "star") return S("star", x, y, d, d, fill, o);
    return C(x, y, d, d, fill, o);
  }
  /** Bar chart from our own shapes: value labels above, category labels below. data = [[label, value]]. */
  function barsV(x, y, w, h, data, o = {}) {
    const n = data.length, slot = w / n, bw = slot * (o.bar ?? 0.56), max = o.max || Math.max(...data.map((d) => d[1]));
    const vs = o.vs || 30, ls = o.ls || 24, fam = o.family || "sans";
    const top = y + vs * 1.2 + 14, base = y + h - ls * 1.2 - 18, out = [];
    if (o.grid) for (let g = 0; g <= 4; g++) out.push(R(x, base - ((base - top) * g) / 4, w, o.gw || 2, o.grid, { name: "Grid line" }));
    data.forEach(([lab, v], i) => {
      const bh = Math.max(8, ((base - top) * v) / max), bx = x + slot * i + (slot - bw) / 2, by = base - bh;
      if (o.track) out.push(R(bx, top, bw, base - top, o.track, { radius: o.radius || 0, name: "Bar track" }));
      out.push(R(bx, by, bw, bh, pick(o.fill || "#333333", i), { radius: o.radius || 0, stroke: o.stroke, sw: o.sw, name: "Bar " + lab }));
      out.push(T(o.fmt ? o.fmt(v) : String(v), x + slot * i + 4, by - vs * 1.2 - 10, slot - 8, { size: vs, bold: o.vb ?? true, color: pick(o.vc || "#111111", i), family: o.vf || fam, align: "center", name: "Value " + lab }));
      out.push(T(lab, x + slot * i + 4, base + 16, slot - 8, { size: ls, color: pick(o.lc || "#555555", i), family: o.lf || fam, bold: !!o.lb, align: "center", name: "Label " + lab }));
    });
    if (o.axis) out.push(R(x, base, w, o.aw || 3, o.axis, { name: "Axis" }));
    return out;
  }
  /** Horizontal bars: label column, bar, value. o.stack puts the label above a full-width bar. */
  function barsH(x, y, w, h, data, o = {}) {
    const n = data.length, row = h / n, bh = o.bh || row * (o.bar ?? 0.5), max = o.max || Math.max(...data.map((d) => d[1]));
    const ls = o.ls || 26, vs = o.vs || 28, fam = o.family || "sans", gap = 24, out = [];
    const lw = o.stack ? 0 : o.lw ?? 280, vw = o.vw ?? 150;
    const bx = o.stack ? x : x + lw + gap, full = o.stack ? w : w - lw - gap * 2 - vw;
    data.forEach(([lab, v], i) => {
      const ry = y + row * i, bwid = Math.max(8, (full * v) / max), val = o.fmt ? o.fmt(v) : String(v);
      const lo = { size: ls, color: pick(o.lc || "#333333", i), family: o.lf || fam, bold: !!o.lb, name: "Label " + lab };
      const vo = { size: vs, bold: o.vb ?? true, color: pick(o.vc || "#111111", i), family: o.vf || fam, name: "Value " + lab };
      if (o.stack) {
        const by = ry + row - bh - row * 0.18;
        const lt = T(lab, x, 0, w - vw, lo), vt = T(val, x + w - vw, 0, vw, { ...vo, align: "right" });
        lt.y = by - 12 - lt.h; vt.y = by - 12 - vt.h;
        if (o.track) out.push(R(bx, by, full, bh, o.track, { radius: o.radius || 0, name: "Bar track" }));
        out.push(R(bx, by, bwid, bh, pick(o.fill || "#333333", i), { radius: o.radius || 0, name: "Bar " + lab }), lt, vt);
      } else {
        const by = ry + (row - bh) / 2;
        if (o.track) out.push(R(bx, by, full, bh, o.track, { radius: o.radius || 0, name: "Bar track" }));
        out.push(R(bx, by, bwid, bh, pick(o.fill || "#333333", i), { radius: o.radius || 0, name: "Bar " + lab }));
        out.push(mid(T(lab, x, 0, lw, { ...lo, align: o.la || "right" }), ry + row / 2));
        out.push(mid(T(val, (o.track ? bx + full : bx + bwid) + gap, 0, vw, vo), ry + row / 2));
      }
    });
    return out;
  }
  /** Horizontal timeline: items = [[when, title, desc]]; o.alt alternates the text above / below the line. */
  function tlH(x, y, w, items, o = {}) {
    const n = items.length, slot = w / n, d = o.d || 28, lw = o.lw || 4, fam = o.family || "sans";
    const out = [R(o.full ? x : x + slot / 2, y - lw / 2, o.full ? w : w - slot, lw, o.line || "#999999", { name: "Timeline line" })];
    items.forEach(([when, title, desc], i) => {
      const cx = x + slot * (i + 0.5), col = pick(o.dot || "#333333", i);
      out.push(mark(o.marker, cx - d / 2, y - d / 2, d, col, { stroke: o.ring ? pick(o.ring, i) : undefined, sw: o.ring ? o.rw || 4 : 0, radius: o.mr || 0, name: "Marker " + (i + 1) }));
      if (o.num) out.push(mid(T(String(i + 1), cx - d / 2, 0, d, { size: o.ns || Math.round(d * 0.42), bold: true, color: pick(o.nc || WHITE, i), family: o.nf || fam, align: "center", name: "Step " + (i + 1) }), y));
      const span = o.alt ? slot * 1.6 : slot - (o.pad ?? 24), tx = Math.min(Math.max(cx - span / 2, x), x + w - span);
      const wt = when ? T(when, tx, 0, span, { size: o.ws || 26, bold: o.wb ?? true, italic: !!o.wi, color: pick(o.wc || col, i), family: o.wf || fam, align: "center", ls: o.wls || 0, name: "When " + (i + 1) }) : null;
      const tt = T(title, tx, 0, span, { size: o.ts || 32, bold: o.tb ?? true, italic: !!o.ti, color: o.tc || "#111111", family: o.tf || fam, align: "center", lh: 1.15, name: title });
      const dt = desc ? T(desc, tx, 0, span, { size: o.ds || 22, color: o.dc || "#555555", family: o.df || fam, align: "center", lh: 1.35, name: "Detail " + (i + 1) }) : null;
      const g = d / 2 + (o.tg ?? 22);
      if (o.alt) {
        const blk = [wt, tt, dt].filter(Boolean), hh = blk.reduce((s, l) => s + l.h, 0) + 8 * (blk.length - 1);
        out.push(...flow(i % 2 ? y - g - hh : y + g, ...gaps(blk, 8)));
      } else {
        if (wt) { wt.y = y - g - wt.h; out.push(wt); }
        out.push(...flow(y + g, ...gaps([tt, dt].filter(Boolean), 8)));
      }
    });
    return out;
  }
  /** Vertical timeline: line at x, "when" to the left, title + detail to the right. */
  function tlV(x, y, h, items, o = {}) {
    const n = items.length, row = h / n, d = o.d || 24, lw = o.lw || 3, ww = o.ww ?? 220, tw = o.tw || 760, fam = o.family || "sans";
    const out = [R(x - lw / 2, y + row / 2, lw, h - row, o.line || "#999999", { name: "Timeline line" })];
    items.forEach(([when, title, desc], i) => {
      const cy = y + row * (i + 0.5), col = pick(o.dot || "#333333", i);
      out.push(mark(o.marker, x - d / 2, cy - d / 2, d, col, { stroke: o.ring ? pick(o.ring, i) : undefined, sw: o.ring ? o.rw || 3 : 0, name: "Marker " + (i + 1) }));
      if (when) out.push(mid(T(when, x - d / 2 - 28 - ww, 0, ww, { size: o.ws || 26, bold: o.wb ?? true, italic: !!o.wi, color: pick(o.wc || col, i), family: o.wf || fam, align: "right", ls: o.wls || 0, name: "When " + (i + 1) }), cy));
      const tt = T(title, x + d / 2 + 32, 0, tw, { size: o.ts || 32, bold: o.tb ?? true, italic: !!o.ti, color: o.tc || "#111111", family: o.tf || fam, name: title });
      const dt = desc ? T(desc, x + d / 2 + 32, 0, tw, { size: o.ds || 22, color: o.dc || "#555555", family: o.df || fam, lh: 1.3, name: "Detail " + (i + 1) }) : null;
      out.push(...stackMid(cy, 6, ...[tt, dt].filter(Boolean)));
    });
    return out;
  }
  /** Team row: circle photo frames with name + role under each. */
  function team(x, y, w, people, o = {}) {
    const n = people.length, slot = w / n, d = o.d || 220, fam = o.family || "sans", out = [];
    people.forEach(([name, role], i) => {
      const fx = o.left ? x + slot * i : x + slot * (i + 0.5) - d / 2, rg = o.rg ?? 12;
      if (o.back) {
        const bo = { name: "Accent" }, bx = fx + (o.bx ?? 18), by = y + (o.by ?? 18), c = pick(o.back, i), kind = pick(o.backKind || "circle", i);
        out.push(kind === "rect" ? R(bx, by, d, d, c, bo) : kind === "diamond" ? S("polygon", bx, by, d, d, c, { ...bo, sides: 4 }) : kind === "triangle" ? S("triangle", bx, by, d, d, c, bo) : kind === "blob" ? E("shape-blob", bx - d * 0.08, by - d * 0.08, d * 1.16, { c1: c }) : C(bx, by, d, d, c, bo));
      }
      if (o.ring) out.push(C(fx - rg, y - rg, d + rg * 2, d + rg * 2, "none", { stroke: pick(o.ring, i), sw: o.rw || 4, name: "Ring" }));
      out.push(member(CAST, F(fx, y, d, d, { shape: "circle", name: "Photo " + name, border: o.border ? { width: o.border.width, color: pick(o.border.color, i) } : undefined }), name, role, { base: o.who }));
      const al = o.align || "center", tx = al === "left" ? fx : x + slot * i + 8, tw = al === "left" ? x + slot * (i + 1) - fx - 16 : slot - 16;
      const top = y + d + (o.gap ?? 28) + (o.ring ? rg : 0);
      out.push(...flow(top,
        T(name, tx, 0, tw, { size: o.ns || 32, bold: o.nb ?? true, italic: !!o.ni, color: pick(o.nc || "#111111", i), family: o.nf || fam, align: al, name }), o.ngap ?? 6,
        T(role, tx, 0, tw, { size: o.rs || 22, color: pick(o.rc || "#666666", i), family: o.rf || fam, align: al, ls: o.rls || 0, italic: !!o.ri, bold: !!o.rb, lh: 1.3, name: "Role " + (i + 1) })));
    });
    return out;
  }
  /** Bullet list: marker shape (or sticker) + text, stacked with gap. */
  function bullets(x, y, w, items, o = {}) {
    const size = o.size || 30, lh = o.lh || 1.3, md = o.md || Math.round(size * 0.45), ind = o.ind || md + 24, out = [];
    let cy = y;
    items.forEach((txt, i) => {
      const t = T(txt, x + ind, cy, w - ind, { size, lh, bold: !!o.bold, color: o.color || "#222222", family: o.family || "sans", name: "Point " + (i + 1) });
      const my = cy + (size * lh) / 2 - md / 2;
      out.push(o.icon ? E(o.icon, x, my, md, { c1: pick(o.mc || "#333333", i), c2: o.c2, c3: o.c3 }) : mark(o.marker, x, my, md, pick(o.mc || "#333333", i), { radius: o.mr || 0, name: "Bullet" }), t);
      cy += t.h + (o.gap ?? 20);
    });
    return out;
  }

  /* ───────────── 1. Editorial magazine · research findings ───────────── */
  deck("reading-research", "Reading habit research", "research findings study survey report editorial magazine reading books", () => {
    const PAPER = "#f5f0e8", INK = "#1d1b19", RED = "#c2402b", GREY = "#6f655c";
    const s = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "serif", color: INK, ...o });
    const a = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: INK, ...o });
    const kick = (txt, x, y, w = 820, o = {}) => a(txt.toUpperCase(), x, y, w, { size: 20, bold: true, ls: 4, color: RED, ...o });
    const foot = (n) => [R(120, 1000, 1680, 1.5, INK, { name: "Footer rule" }), a("FIELD NOTES  ·  THE READING HABIT", 120, 1016, 900, { size: 16, ls: 3, color: GREY }), a(String(n).padStart(2, "0"), 1600, 1016, 200, { size: 16, bold: true, color: GREY, align: "right" })];
    const toc = [["Who reads, and when", "Evening has overtaken the morning commute"], ["Minutes that matter", "Daily reading time by age group"], ["Forming the habit", "What the first twelve weeks look like"], ["Voices from the diaries", "Readers in their own words"], ["What it adds up to", "The numbers behind the study"]];
    const P = [];
    P.push(SL(PAPER, [
      F(1040, 0, 880, 1080, { name: "Cover photo" }),
      kick("Field Notes · Issue 04", 120, 120),
      R(120, 160, 840, 2, INK, { name: "Rule" }),
      flow(240, s("The Reading\nHabit", 120, 0, 880, { size: 160, lh: 0.95, name: "Title" }), 40,
        s("What 2,400 readers told us about how, when and why they read.", 120, 0, 760, { size: 40, italic: true, lh: 1.25, color: "#3d3833" })),
      R(120, 820, 120, 6, RED, { name: "Accent" }),
      a("Research findings  ·  November 2026", 120, 852, 840, { size: 24, bold: true }),
      a("Prepared by the Open Shelf Reading Lab", 120, 894, 840, { size: 22, color: GREY }),
    ], "Welcome. For six months, 2,400 people kept a reading diary for us. Today I will share five findings, starting with the one that surprised us most."));
    P.push(SL(PAPER, [
      s("Contents", 120, 110, 560, { size: 110, italic: true }),
      a("Five findings from six months of reading diaries.", 120, 262, 520, { size: 26, color: GREY, lh: 1.35 }),
      F(120, 400, 520, 540, { name: "Feature photo" }),
      a("Morning readers on Line 3, one of our diary groups.", 120, 954, 520, { size: 18, italic: true, color: GREY }),
      toc.map(([t1, d1], i) => { const ry = 120 + i * 168; return [R(760, ry, 1040, 1.5, INK, { name: "Rule" }), s(String(i + 1).padStart(2, "0"), 760, ry + 26, 130, { size: 72, color: RED, lh: 1 }), s(t1, 920, ry + 24, 880, { size: 42, bold: true }), a(d1, 920, ry + 84, 880, { size: 22, color: GREY })]; }),
      R(760, 960, 1040, 1.5, INK, { name: "Rule" }),
      foot(2),
    ], "Here is the running order. Each finding takes about three minutes; questions at the end, please."));
    P.push(SL(RED, [
      s("01", 1160, 140, 640, { size: 520, color: "#d66a55", align: "right", lh: 1, name: "Watermark number" }),
      kick("Part one", 120, 390, 900, { color: "#ffe1d8" }),
      s("Who reads,\nand when", 120, 440, 1000, { size: 140, color: WHITE, lh: 1 }),
      R(120, 760, 160, 3, WHITE, { name: "Rule" }),
      s("Reading has moved from the train to the sofa, and the change is bigger than we expected.", 120, 800, 900, { size: 34, italic: true, color: "#fff1ec", lh: 1.3 }),
    ], "Part one is about timing. Pause here and ask the room when they last read for pleasure."));
    const h4 = flow(120, kick("Finding one", 120, 0), 18, s("Evening is the new reading hour", 120, 0, 1020, { size: 76, lh: 1.05 }), 28,
      s("In six months the busiest reading time moved from 8 am to 9 pm.", 120, 0, 1000, { size: 32, italic: true, color: "#3d3833", lh: 1.3 }));
    const y4 = after(h4, 56);
    P.push(SL(PAPER, [
      h4, R(120, y4 - 28, 1020, 1.5, INK, { name: "Rule" }),
      a("In 2019 most diary entries were written on trains and buses. By 2026, 61% of reading sessions happened after 8 pm, at home, often in bed.", 120, y4, 480, { size: 24, lh: 1.55 }),
      a("Readers told us evening reading feels like a reward, not a task. Sessions were longer too: 34 minutes on average, against 19 minutes on the commute.", 660, y4, 480, { size: 24, lh: 1.55 }),
      F(1240, 120, 560, 720, { name: "Story photo" }),
      a("Evening sessions averaged 34 minutes.", 1240, 856, 560, { size: 18, italic: true, color: GREY }),
      R(120, 650, 1020, 1.5, INK, { name: "Rule" }),
      s("61%", 120, 690, 380, { size: 160, color: RED, lh: 1 }),
      s("of all reading sessions now happen after 8 pm, most of them at home.", 540, 712, 600, { size: 38, italic: true, lh: 1.3 }),
      foot(4),
    ], "Stress the 61 percent. The commute used to be the default reading slot; now it is the evening."));
    const h5 = flow(140, kick("Finding two", 120, 0), 18, s("Minutes that matter", 120, 0, 560, { size: 72, lh: 1.05 }), 30,
      a("Teenagers and readers over 60 read the most each day. People in their thirties read the least, but in longer bursts at weekends.", 120, 0, 540, { size: 26, lh: 1.5, color: "#3d3833" }));
    P.push(SL(PAPER, [
      h5,
      a("Average minutes per day. Source: Open Shelf diaries, n = 2,400.", 120, 900, 560, { size: 18, color: GREY, lh: 1.4 }),
      barsH(780, 140, 1020, 800, [["13–19", 42], ["20–29", 31], ["30–39", 18], ["40–49", 24], ["50–59", 29], ["60+", 47]], { lw: 130, vw: 150, fill: [INK, INK, RED, INK, INK, INK], bar: 0.34, ls: 28, lf: "serif", vs: 28, vf: "serif", la: "left", lc: INK, vc: INK, fmt: (v) => v + " min" }),
      foot(5),
    ], "The red bar is the group to watch: people in their thirties. They read least on weekdays but catch up at weekends."));
    P.push(SL(PAPER, [
      kick("Finding three", 120, 120),
      s("Forming the habit", 120, 160, 1680, { size: 80 }),
      a("What changed, week by week, for readers who kept going.", 120, 270, 1200, { size: 28, color: GREY }),
      tlH(120, 540, 1680, [["Week 1", "Pick a time", "Readers who chose a fixed time kept going twice as often."], ["Week 2", "Keep it short", "Ten pages a day beat one long weekend session."], ["Week 4", "Track it", "A tick in a diary doubled the length of streaks."], ["Week 8", "Share it", "Talking about a book made the habit social."], ["Week 12", "It sticks", "Most readers no longer needed reminders."]],
        { line: INK, lw: 2, marker: "square", d: 22, dot: RED, ws: 56, wf: "serif", wi: true, wb: false, wc: INK, ts: 38, tf: "serif", ds: 26, dc: GREY, full: true }),
      R(120, 850, 1680, 1.5, INK, { name: "Rule" }),
      s("“Week four is where most habits are won or lost.”  Dr. Hana Brooks, lead researcher", 120, 884, 1680, { size: 32, italic: true, color: "#3d3833" }),
      foot(6),
    ], "Walk through the weeks left to right. The biggest jump in streak length came from simply ticking a box each day."));
    P.push(SL(PAPER, [
      kick("The team", 120, 120),
      s("The people behind the study", 120, 160, 1680, { size: 72 }),
      team(120, 390, 1680, [["Dr. Hana Brooks", "LEAD RESEARCHER"], ["Omar Siddiqui", "DATA ANALYST"], ["Lucia Ferrante", "FIELD COORDINATOR"], ["Daniel Okafor", "WRITER & EDITOR"]],
        { d: 270, ring: INK, rg: 14, rw: 1.5, nf: "serif", ns: 38, ni: true, nb: false, nc: INK, rs: 18, rls: 3, rc: RED, rb: true }),
      foot(7),
    ], "A small team of four. Hana designed the diary method; Omar built the analysis; Lucia ran the reader groups."));
    const q8 = flow(380, s("I used to read on the train because I had to. Now I read at night because I want to.", 440, 0, 1240, { size: 72, italic: true, lh: 1.2 }), 50,
      R(440, 0, 100, 3, RED, { name: "Rule" }), 30, a("DIARY ENTRY  ·  READER 1,187  ·  AGE 34", 440, 0, 1000, { size: 20, bold: true, ls: 4, color: GREY }));
    P.push(SL(PAPER, [s("“", 120, 200, 300, { size: 400, color: RED, lh: 1, name: "Quote mark" }), q8, foot(8)],
      "Read the quote slowly. This one line sums up the whole shift from duty to pleasure."));
    P.push(SL(PAPER, [
      s("68%", 100, 130, 900, { size: 330, color: RED, lh: 1 }),
      s("of readers finish more books when they read at the same time every day.", 1040, 190, 760, { size: 50, lh: 1.2 }),
      R(120, 600, 1680, 1.5, INK, { name: "Rule" }),
      [["2,400", "readers kept a daily reading diary"], ["14", "cities across three countries"], ["6", "months of entries, April to October"]].map(([n1, l1], i) => [
        s(n1, 120 + i * 580, 650, 520, { size: 96 }), a(l1, 120 + i * 580, 780, 480, { size: 24, color: GREY, lh: 1.4 }),
        i ? R(120 + i * 580 - 30, 650, 1.5, 230, INK, { name: "Divider" }) : null]),
      foot(9),
    ], "One number to remember: 68 percent. Routine matters more than the amount of free time people have."));
    P.push(SL(PAPER, [
      F(0, 0, 760, 1080, { name: "Closing photo" }),
      kick("Thank you", 880, 200),
      s("Read the\nfull report", 880, 250, 920, { size: 120, lh: 1 }),
      R(880, 530, 120, 6, RED, { name: "Accent" }),
      [["Report", "readinghabit.org/report"], ["Email", "hello@openshelflab.org"], ["Follow", "@openshelflab"]].map(([l1, v1], i) => [
        kick(l1, 880, 600 + i * 110, 400, { color: GREY, size: 18 }), a(v1, 880, 628 + i * 110, 900, { size: 34 })]),
    ], "Thank people for their time, share the report link and invite questions."));
    return P;
  });

  /* ───────────── 2. Swiss grid · product roadmap ───────────── */
  deck("swiss-roadmap", "Swiss grid product roadmap", "product roadmap plan software app swiss grid minimal red black", () => {
    const BLK = "#111111", RED = "#e2231a", GREY = "#6e6e6e", LIGHT = "#ececec";
    const cx = (i) => 96 + 144 * i, cw = (n) => 144 * n - 24;
    const a = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: BLK, ...o });
    const head = (n) => [R(96, 90, 1728, 6, BLK, { name: "Top rule" }), a("Tasklane", 96, 112, cw(3), { size: 22, bold: true }), a("Product roadmap 2027", cx(3), 112, cw(6), { size: 22 }), a(String(n).padStart(2, "0"), cx(11), 112, cw(1), { size: 22, bold: true, align: "right" })];
    const P = [];
    P.push(SL(WHITE, [
      R(96, 90, 1728, 10, BLK, { name: "Top rule" }),
      a("Tasklane", 96, 124, cw(3), { size: 30, bold: true }),
      a("Planning session\n12 January 2027", cx(6), 124, cw(3), { size: 26, lh: 1.25 }),
      a("Internal, for the\nproduct team", cx(9), 124, cw(3), { size: 26, lh: 1.25, color: GREY }),
      a("Product\nroadmap", 96, 300, cw(7), { size: 170, bold: true, lh: 0.92, ls: -4 }),
      a("2027", 96, 650, cw(7), { size: 300, bold: true, color: RED, lh: 0.9, ls: -8 }),
      F(cx(8), 300, cw(4), 620, { name: "Photo" }),
      R(96, 968, 24, 24, RED, { name: "Square" }), a("tasklane.com", 136, 964, cw(4), { size: 24 }),
    ], "Today we agree the roadmap for 2027. Everything here is a proposal until the decisions slide at the end."));
    const ag = [["Where we are", "Usage, feedback and the numbers behind 2026."], ["What users want", "Top requests from 1,200 customer calls."], ["Themes for 2027", "Three bets: speed, AI help and teams."], ["Quarter by quarter", "What ships when, and who owns it."], ["Risks", "What could slow us down."], ["Decisions", "What we need to agree before we leave."]];
    P.push(SL(WHITE, [
      head(2),
      a("Agenda", 96, 200, cw(3), { size: 96, bold: true, lh: 1, ls: -2 }),
      a("Six things we will agree on today.", 96, 320, cw(3), { size: 28, lh: 1.3, color: GREY }),
      ag.map(([t1, d1], i) => {
        const x = cx(3 + 3 * (i % 3)), y = 200 + Math.floor(i / 3) * 390, w = cw(3);
        return [R(x, y, w, 6, BLK, { name: "Cell rule" }), a(String(i + 1), x, y + 24, w, { size: 72, bold: true, color: RED, lh: 1 }), flow(y + 124, a(t1, x, 0, w, { size: 36, bold: true }), 10, a(d1, x, 0, w, { size: 24, lh: 1.35, color: "#555555" }))];
      }),
    ], "Six blocks, about ten minutes each. We will keep the decisions block for the last twenty minutes."));
    P.push(SL(RED, [
      a("01", 96, 90, cw(6), { size: 400, bold: true, color: WHITE, lh: 0.9, ls: -10 }),
      R(96, 600, 1728, 6, WHITE, { name: "Rule" }),
      a("Section", 96, 640, cw(3), { size: 28, bold: true, color: WHITE }),
      a("Usage, feedback and the numbers behind 2026.", 96, 690, cw(4), { size: 28, color: WHITE, lh: 1.3 }),
      a("Where we\nare now", cx(6), 630, cw(6), { size: 120, bold: true, color: WHITE, lh: 0.95, ls: -3 }),
    ], "First, a quick look back at 2026 so everyone starts from the same facts."));
    const h4 = flow(200, a("The problem", 96, 0, cw(5), { size: 26, bold: true, color: RED }), 16,
      a("Teams lose five hours a week chasing status updates", 96, 0, cw(5), { size: 62, bold: true, lh: 1.05, ls: -1 }), 30,
      a("Customers told us the same story again and again: the work is done, but nobody can see it.", 96, 0, cw(5), { size: 28, lh: 1.4, color: "#333333" }));
    P.push(SL(WHITE, [
      head(4), h4,
      bullets(96, after(h4, 40), cw(5), ["Status lives in chat, not in the board", "Managers ask for the same report twice", "Boards are slow with more than 500 cards"], { size: 26, marker: "square", mc: RED, md: 14, gap: 16 }),
      F(cx(6), 200, cw(6), 780, { name: "Photo" }),
    ], "This is the core problem behind most of the 2027 roadmap. Keep it in mind for every theme that follows."));
    P.push(SL(WHITE, [
      head(5),
      flow(200, a("Growth", 96, 0, cw(4), { size: 26, bold: true, color: RED }), 16, a("Weekly active teams", 96, 0, cw(4), { size: 60, bold: true, lh: 1.05, ls: -1 }), 30,
        a("Thousands of teams using Tasklane at least once a week. Q1 2027 is our forecast.", 96, 0, cw(4), { size: 26, lh: 1.4, color: "#555555" })),
      barsV(cx(5), 200, cw(7), 760, [["Q1 2026", 21], ["Q2 2026", 26], ["Q3 2026", 33], ["Q4 2026", 42], ["Q1 2027", 51]], { fill: [BLK, BLK, BLK, BLK, RED], grid: LIGHT, axis: BLK, bar: 0.62, vs: 40, ls: 24, lc: BLK, vc: [BLK, BLK, BLK, BLK, RED], fmt: (v) => v + "k" }),
    ], "Growth doubled through the year. The red bar is the forecast if the Q1 work ships on time."));
    const Q = [["Q1", "Jan–Mar", [["Faster boards", "Load in under one second."], ["Offline mode", "Keep working on the train."]], "Speed"], ["Q2", "Apr–Jun", [["AI summaries", "A weekly digest written for you."], ["Smart due dates", "Suggested from past work."]], "AI help"], ["Q3", "Jul–Sep", [["Team spaces", "One home per team."], ["Guest access", "Invite clients for free."]], "Teams"], ["Q4", "Oct–Dec", [["Workload view", "See who is overloaded."], ["Public API v2", "Build your own tools."]], "Scale"]];
    P.push(SL(WHITE, [
      head(6),
      a("Roadmap", 96, 170, cw(6), { size: 96, bold: true, ls: -2 }),
      R(96, 512, 1728, 3, BLK, { name: "Timeline rule" }),
      R(96, 880, 1728, 3, BLK, { name: "Rule" }),
      Q.map(([q, m, f, th], i) => {
        const x = cx(3 * i), w = cw(3);
        return [R(x, 380, w, 80, i === 0 ? RED : BLK, { name: "Quarter bar" }), mid(a(q, x + 24, 0, 120, { size: 36, bold: true, color: WHITE }), 420), mid(a(m, x + w - 224, 0, 200, { size: 24, color: WHITE, align: "right" }), 420),
          R(x, 503, 20, 20, RED, { name: "Marker" }),
          flow(570, ...f.flatMap(([t1, d1], j) => [j ? 44 : 0, a(t1, x, 0, w, { size: 36, bold: true }), 10, a(d1, x, 0, w, { size: 26, color: "#555555", lh: 1.35 })])),
          R(x, 916, 20, 20, i === 0 ? RED : BLK, { name: "Theme square" }), a("Theme: " + th, x + 36, 908, w - 36, { size: 28, bold: true })];
      }),
    ], "Read the quarters left to right. Q1 is in red because the team has already started on it."));
    P.push(SL(WHITE, [
      head(7),
      a("Who owns what", 96, 170, cw(8), { size: 96, bold: true, ls: -2 }),
      team(96, 400, 1728, [["Mia Novak", "Head of product"], ["Ravi Menon", "Engineering lead"], ["Sofia Lind", "Design lead"], ["Tom Becker", "AI features"], ["Aisha Khan", "Customer research"]], { d: 240, left: true, align: "left", ns: 30, rs: 24, nc: BLK, rc: GREY, gap: 32 }),
      R(96, 860, 1728, 3, BLK, { name: "Rule" }),
    ], "One owner per theme. If something is unclear after today, go straight to the owner."));
    P.push(SL(WHITE, [
      R(0, 0, 288, 1080, RED, { name: "Red band" }),
      a("“", 96, 110, 160, { size: 200, bold: true, color: WHITE, lh: 1 }),
      flow(200, a("We don't need more features. We need the ones we have to be faster.", cx(3), 0, cw(9), { size: 80, bold: true, lh: 1.05, ls: -2 }), 60,
        R(cx(3), 0, cw(1), 6, BLK, { name: "Rule" }), 34, a("Customer interview, design agency with 40 seats", cx(3), 0, cw(6), { size: 28 })),
    ], "This quote came up in some form in almost every customer call. It is why speed is theme number one."));
    P.push(SL(WHITE, [
      head(9),
      a("2026 in numbers", 96, 170, cw(8), { size: 96, bold: true, ls: -2 }),
      [["42k", "weekly active teams"], ["3.1×", "faster boards since version 4"], ["94%", "of paying teams renewed"], ["18", "countries with paying teams"]].map(([n1, l1], i) => [
        R(cx(3 * i), 440, cw(3), 6, BLK, { name: "Cell rule" }), a(n1, cx(3 * i), 470, cw(3), { size: 150, bold: true, lh: 1, ls: -4, color: i === 3 ? RED : BLK }), a(l1, cx(3 * i), 650, cw(3), { size: 28, lh: 1.3 })]),
    ], "Four numbers that show we start 2027 from a strong place."));
    P.push(SL(BLK, [
      a("Thank you.", 96, 200, cw(10), { size: 200, bold: true, color: WHITE, ls: -6, lh: 1 }),
      R(96, 520, 1728, 6, WHITE, { name: "Rule" }),
      [["Questions", "mia@tasklane.com"], ["Roadmap doc", "tasklane.com/roadmap"], ["Next review", "14 April 2027"]].map(([l1, v1], i) => [
        a(l1, cx(4 * i), 560, cw(4), { size: 24, bold: true, color: RED }), a(v1, cx(4 * i), 600, cw(4), { size: 34, color: WHITE })]),
      R(1728, 888, 96, 96, RED, { name: "Square" }),
    ], "Thank everyone, point to the roadmap doc and confirm the date of the next review."));
    return P;
  });

  /* ───────────── 3. Bold geometric · startup pitch ───────────── */
  deck("geometric-pitch", "Bold geometric pitch deck", "pitch startup investor funding seed geometric bold shapes colourful", () => {
    const CREAM = "#fff6e5", BLUE = "#2337ff", YEL = "#ffcf24", CORAL = "#ff5b4a", BLK = "#121212";
    const g = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", bold: true, color: BLK, ...o });
    const P = [];
    P.push(SL(CREAM, [
      C(1120, 100, 760, 760, YEL, { name: "Big circle" }),
      F(1240, 220, 520, 520, { shape: "circle", name: "Product photo" }),
      S("triangle", 1520, 780, 300, 260, CORAL, { name: "Triangle" }),
      R(0, 900, 560, 180, BLUE, { name: "Block" }),
      C(600, 940, 100, 100, BLK, { name: "Dot" }),
      g("Seed pitch · 2027", 120, 140, 400, { size: 26, color: WHITE, bg: { color: BLUE, radius: 0.8, pad: 0.6 } }),
      g("Loopcart", 120, 260, 980, { size: 200, lh: 0.95, ls: -6 }),
      g("Reusable delivery boxes that come back.", 120, 500, 860, { size: 54, bold: false, lh: 1.15 }),
      g("Return. Reuse. Repeat.", 60, 966, 460, { size: 34, color: WHITE }),
    ], "Hi, I'm Nadia. Loopcart makes delivery boxes that come back to the shop instead of going in the bin."));
    const ag = [["The problem", "Single-use boxes pile up"], ["Our solution", "Boxes that come back"], ["Traction", "Pilots with 40 shops"], ["Business model", "Pay per loop"], ["The ask", "A $2M seed round"]];
    const kinds = [["circle", YEL], ["triangle", CORAL], ["square", CREAM], ["circle", CORAL], ["diamond", YEL]];
    P.push(SL(BLUE, [
      g("What we'll\ncover", 120, 140, 700, { size: 110, color: WHITE, lh: 1 }),
      C(120, 560, 400, 400, YEL, { name: "Circle" }), S("triangle", 380, 720, 260, 240, CORAL, { name: "Triangle" }),
      ag.map(([t1, d1], i) => { const ry = 170 + i * 160, [kd, kc] = kinds[i]; return [kd === "triangle" ? S("triangle", 900, ry, 80, 76, kc, { name: "Marker" }) : mark(kd, 900, ry, 80, kc, { name: "Marker" }), g(t1, 1020, ry - 4, 800, { size: 46, color: WHITE }), g(d1, 1020, ry + 54, 800, { size: 28, bold: false, color: "#d5dbff" })]; }),
    ], "Five parts, about two minutes each. The ask comes last."));
    P.push(SL(YEL, [
      C(120, 200, 680, 680, BLK, { name: "Circle" }),
      mid(g("01", 120, 0, 680, { size: 300, color: YEL, align: "center", lh: 1 }), 540),
      g("The\nproblem", 900, 300, 900, { size: 160, lh: 0.95 }),
      g("Every parcel ships in a box that is used once.", 900, 650, 820, { size: 40, bold: false, lh: 1.25 }),
      R(1500, 120, 300, 40, BLUE, { name: "Bar" }), S("triangle", 1620, 860, 200, 180, CORAL, { name: "Triangle" }),
    ], "Start with the problem everyone has seen at home: a hallway full of empty boxes."));
    const h4 = flow(140, g("The problem", 120, 0, 860, { size: 30, color: BLUE }), 20, g("2 billion boxes go in the bin every year", 120, 0, 900, { size: 80, lh: 1.02, ls: -2 }), 34,
      g("Online shops pay for a new box with every order, and most of them are thrown away within a day.", 120, 0, 860, { size: 30, bold: false, lh: 1.4 }));
    P.push(SL(CREAM, [
      R(1160, 200, 640, 760, BLUE, { name: "Offset block" }),
      F(1100, 140, 640, 760, { name: "Photo" }),
      C(1020, 820, 160, 160, YEL, { name: "Circle" }),
      h4,
      bullets(120, after(h4, 40), 860, ["Shops pay for boxes again and again", "Customers have nowhere to put them", "Most cardboard is never recycled"], { size: 30, bold: true, marker: "circle", mc: [BLUE, CORAL, YEL], md: 28, gap: 18 }),
    ], "Two billion is the yearly figure for our home market alone. Most of these boxes travel once."));
    P.push(SL(CREAM, [
      g("Boxes in circulation", 120, 110, 1100, { size: 80, ls: -2 }),
      g("Thousands of Loopcart boxes in use, by quarter of 2026", 120, 220, 1100, { size: 30, bold: false }),
      barsV(120, 320, 1100, 680, [["Q1", 4], ["Q2", 9], ["Q3", 17], ["Q4", 31]], { fill: [BLUE, CORAL, YEL, BLK], bar: 0.7, vs: 54, ls: 32, lb: true, lc: BLK, fmt: (v) => v + "k", axis: BLK, aw: 6 }),
      C(1340, 300, 460, 460, BLUE, { name: "Circle" }),
      stackMid(530, 8, g("+675%", 1340, 0, 460, { size: 110, color: WHITE, align: "center", lh: 1 }), g("growth this year", 1340, 0, 460, { size: 32, bold: false, color: WHITE, align: "center" })),
      S("triangle", 1600, 800, 200, 180, YEL, { name: "Triangle" }),
    ], "We grew from 4,000 to 31,000 boxes in a year with almost no marketing spend."));
    P.push(SL(BLUE, [
      g("How we got here", 120, 120, 1400, { size: 90, color: WHITE, ls: -2 }),
      tlH(120, 580, 1680, [["2024", "The idea", "A box swap at a local market."], ["Early 2025", "First pilot", "12 shops, 3,000 boxes, 91% returned."], ["Late 2025", "Return points", "Drop-off in 60 corner shops."], ["2026", "City launch", "40 shops, 31,000 boxes in use."], ["2027", "Next", "Three new cities with this round."]],
        { d: 120, dot: [YEL, CORAL, CREAM, YEL, CORAL], num: true, nc: BLK, ns: 48, line: CREAM, lw: 6, ws: 34, wc: WHITE, ts: 42, tc: WHITE, ds: 28, dc: "#d5dbff", tg: 30 }),
    ], "Each step proved one thing: people return the box if it is easy."));
    P.push(SL(CORAL, [
      g("The team", 120, 110, 900, { size: 100, ls: -2 }),
      team(120, 360, 1680, [["Nadia Rahman", "CEO, ex-logistics lead"], ["Leo Martins", "CTO, built two marketplaces"], ["Grace Liu", "Operations, 10 years in retail"], ["Sam Adeyemi", "Growth, signed our first 40 shops"]],
        { d: 300, back: [YEL, BLUE, CREAM, BLK], backKind: ["rect", "circle", "rect", "circle"], bx: 30, by: 30, ns: 38, nc: BLK, rs: 26, rc: BLK, gap: 64 }),
    ], "Four founders who have run logistics, built marketplaces and sold to shops."));
    P.push(SL(YEL, [
      g("“", 120, 60, 300, { size: 400, color: BLUE, lh: 1, name: "Quote mark" }),
      flow(260, g("Our customers love that the box comes back. We cut packaging costs by a third in six months.", 440, 0, 1100, { size: 64, lh: 1.15, ls: -1 }), 50,
        R(440, 0, 120, 12, BLK, { name: "Bar" }), 30, g("Priya Nair, owner of Leaf & Ladle", 440, 0, 1000, { size: 34 }), 6, g("Pilot shop since 2025", 440, 0, 1000, { size: 28, bold: false })),
      C(1600, 780, 200, 200, CORAL, { name: "Circle" }), S("triangle", 1640, 160, 160, 140, BLUE, { name: "Triangle" }),
    ], "Priya runs one of our first pilot shops. Her numbers match what we see across all 40 shops."));
    P.push(SL(CREAM, [
      g("By the numbers", 120, 110, 1400, { size: 90, ls: -2 }),
      C(120, 320, 460, 460, BLUE, { name: "Circle" }), R(730, 320, 460, 460, CORAL, { name: "Square" }), S("polygon", 1340, 320, 460, 460, YEL, { sides: 6, name: "Hexagon" }),
      mid(g("91%", 120, 0, 460, { size: 140, color: WHITE, align: "center", lh: 1 }), 550),
      mid(g("40", 730, 0, 460, { size: 140, color: BLK, align: "center", lh: 1 }), 550),
      mid(g("$0.38", 1340, 0, 460, { size: 120, color: BLK, align: "center", lh: 1 }), 550),
      [["of boxes come back", 120], ["partner shops in one city", 730], ["cost per loop, half of cardboard", 1340]].map(([l1, x]) => g(l1, x, 830, 460, { size: 32, bold: false, align: "center", lh: 1.3 })),
    ], "Return rate, shop count and unit cost: the three numbers investors ask about first."));
    P.push(SL(BLUE, [
      g("Thank you!", 120, 200, 1150, { size: 180, color: YEL, lh: 1, ls: -6 }),
      g("Let's close the loop together.", 120, 420, 1000, { size: 48, bold: false, color: WHITE }),
      bullets(120, 600, 1000, ["nadia@loopcart.co", "loopcart.co/invest", "+1 415 555 0142"], { size: 36, color: WHITE, marker: "square", mc: [YEL, CORAL, CREAM], md: 24, gap: 24 }),
      C(1300, 480, 500, 500, YEL, { name: "Circle" }), S("triangle", 1420, 140, 280, 250, CORAL, { name: "Triangle" }), R(1240, 440, 120, 120, CREAM, { name: "Square" }),
    ], "Thank investors, repeat the ask of $2M, and share the data room link."));
    return P;
  });

  /* ───────────── 4. Soft gradient blobs · marketing plan ───────────── */
  deck("blob-marketing", "Soft gradient marketing plan", "marketing plan strategy campaign app wellness soft gradient blobs pastel", () => {
    const PLUM = "#3b1f5c", LILAC = "#c9b8ff", PEACH = "#ffc8a8", PINK = "#ffb8d9", SKY = "#b8ecff", MINT = "#c8f5e0", SOFT = "#6b4f8a";
    const c = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "calibri", color: PLUM, ...o });
    const card = (x, y, w, h, op = 0.78) => R(x, y, w, h, WHITE, { radius: 40, op, name: "Card" });
    const P = [];
    P.push(SL(["#efe7ff", "#ffe9ef", 135], [
      E("shape-blob", 1120, 60, 720, { c1: LILAC, op: 0.75 }), E("shape-blob-2", 60, 700, 320, { c1: PEACH, op: 0.8 }), C(1560, 720, 300, 300, PINK, { op: 0.6, name: "Blob" }),
      F(1260, 180, 480, 640, { shape: "rounded", radius: 240, name: "Photo" }),
      flow(250, c("MARKETING PLAN 2027", 160, 0, 900, { size: 30, bold: true, color: "#8a5cc2", ls: 4 }), 16, c("Calmly", 160, 0, 900, { size: 200, bold: true, lh: 1 }), 24,
        c("Helping one million people take a calm minute every day.", 160, 0, 820, { size: 44, lh: 1.25 })),
      c("Growth team  ·  March 2027", 160, 780, 520, { size: 26, bg: { color: WHITE, radius: 1, pad: 0.7, opacity: 0.85 } }),
    ], "Welcome. This is our plan to grow Calmly from 1.2 million to 3 million downloads this year."));
    const ag = [["Where we are", "1.2M downloads and a loyal core"], ["Who we're for", "Busy parents and night-shift workers"], ["Our message", "One calm minute, anywhere"], ["Channels & budget", "Where each dollar goes"], ["Launch calendar", "What happens when"]];
    const pas = [LILAC, PINK, PEACH, SKY, MINT];
    P.push(SL(["#fbf0ff", "#eaf5ff", 120], [
      E("shape-blob", 120, 600, 380, { c1: PEACH, op: 0.8 }), C(420, 120, 180, 180, SKY, { op: 0.7, name: "Blob" }),
      c("Today's\nplan", 160, 260, 600, { size: 120, bold: true, lh: 1 }),
      card(860, 110, 940, 860),
      ag.map(([t1, d1], i) => { const ry = 160 + i * 156; return [C(940, ry, 88, 88, pas[i], { name: "Dot" }), mid(c(String(i + 1), 940, 0, 88, { size: 40, bold: true, align: "center" }), ry + 44), c(t1, 1070, ry + 2, 680, { size: 40, bold: true }), c(d1, 1070, ry + 54, 680, { size: 28, color: SOFT })]; }),
    ], "Five short parts. Most time goes to channels and budget, since that is where we need a decision."));
    P.push(SL([LILAC, PINK, 120], [
      C(1080, 140, 800, 800, WHITE, { op: 0.35, name: "Soft circle" }),
      mid(c("01", 1080, 0, 800, { size: 360, bold: true, color: PLUM, align: "center", lh: 1, op: 0.85 }), 540),
      E("shape-blob-2", 80, 80, 260, { c1: WHITE, op: 0.4 }),
      flow(380, c("PART ONE", 160, 0, 800, { size: 32, bold: true, ls: 5 }), 20, c("Who we're\ntalking to", 160, 0, 900, { size: 120, bold: true, lh: 1 })),
    ], "Part one is about our audience: who already loves Calmly and who we are missing."));
    const h4 = flow(170, c("OUR AUDIENCE", 160, 0, 800, { size: 26, bold: true, color: "#8a5cc2", ls: 4 }), 16, c("Busy minds need tiny breaks", 160, 0, 820, { size: 80, bold: true, lh: 1.05 }), 30,
      c("Our most loyal users open Calmly for less than three minutes at a time: in the car park, before a shift, after bedtime stories.", 160, 0, 800, { size: 32, lh: 1.4 }));
    const ty = after(h4, 50);
    P.push(SL(["#fff3ea", "#f4eeff", 135], [
      E("shape-blob-2", 1020, 100, 820, { c1: PEACH, op: 0.85 }),
      F(1140, 200, 600, 660, { shape: "rounded", radius: 60, name: "Photo" }),
      h4,
      [["Parents", LILAC], ["Shift workers", PINK], ["Students", SKY]].map(([t1, col], i) => c(t1, 160 + i * 270, ty, 240, { size: 28, bold: true, align: "center", bg: { color: col, radius: 1, pad: 0.6 } })),
    ], "Three groups make up 70 percent of daily users. The campaign speaks to each one in turn."));
    P.push(SL(["#f7f0ff", "#fff1f5", 120], [
      C(1640, 60, 220, 220, PINK, { op: 0.5, name: "Blob" }),
      c("Where the budget goes", 160, 110, 1300, { size: 80, bold: true }),
      c("Total spend: $480,000 for the year", 160, 220, 1000, { size: 32, color: SOFT }),
      barsH(160, 330, 1600, 640, [["Social video", 38], ["Creators", 24], ["Search ads", 16], ["Podcasts", 12], ["Events", 10]], { lw: 300, vw: 140, la: "left", fill: [LILAC, PINK, PEACH, SKY, MINT], track: WHITE, radius: 36, bar: 0.56, family: "calibri", ls: 34, lb: true, vs: 36, lc: PLUM, vc: PLUM, fmt: (v) => v + "%" }),
    ], "Social video gets the biggest share because it brought in 60 percent of last year's new users."));
    const cal = [["JANUARY", "Quiet launch", "Calm Minute goes to 50,000 users first."], ["MARCH", "Creator week", "30 creators share their calm minute."], ["MAY", "Sleep month", "A bedtime series with podcast partners."], ["SEPTEMBER", "Back to routine", "A back-to-school push for parents."]];
    P.push(SL(["#eef9ff", "#fcefff", 120], [
      E("shape-blob", 1560, 60, 300, { c1: MINT, op: 0.8 }),
      c("Launch calendar", 160, 110, 1300, { size: 80, bold: true }),
      R(250, 318, 1420, 6, WHITE, { radius: 3, name: "Line" }),
      cal.map(([m1, t1, d1], i) => { const x = 160 + i * 410; return [C(x + 160, 300, 42, 42, pas[i], { stroke: WHITE, sw: 6, name: "Dot" }), card(x, 390, 370, 520, 0.85), flow(440, c(m1, x + 40, 0, 290, { size: 24, bold: true, color: "#8a5cc2", ls: 3 }), 14, c(t1, x + 40, 0, 290, { size: 40, bold: true, lh: 1.05 }), 16, c(d1, x + 40, 0, 290, { size: 28, color: SOFT, lh: 1.35 })),
        C(x + 40, 768, 100, 100, pas[i], { name: "Icon circle" }), E(["icon-bell", "icon-users", "icon-moon", "icon-calendar"][i], x + 64, 792, 52, { c1: PLUM, c2: PLUM, c3: WHITE })]; }),
    ], "Four moments across the year. Each one has its own creative, but the same message: one calm minute."));
    P.push(SL(["#fdf3ff", "#eef7ff", 135], [
      c("The growth team", 160, 110, 1300, { size: 80, bold: true }),
      team(160, 360, 1600, [["Maya Chen", "Head of growth"], ["Jonah Reyes", "Content & creators"], ["Ama Owusu", "Paid media"], ["Lena Fischer", "Lifecycle & email"]],
        { d: 260, back: pas, backKind: "blob", bx: 34, by: 6, family: "calibri", ns: 36, nc: PLUM, rs: 26, rc: SOFT, gap: 60 }),
    ], "Four people, each owning one part of the plan. Lena also owns the weekly report."));
    P.push(SL([PINK, PEACH, 120], [
      E("shape-blob", 510, 90, 900, { c1: WHITE, op: 0.5 }),
      stackMid(540, 40, c("“I didn't have time for a 20-minute meditation. One minute, I can do.”", 560, 0, 800, { size: 60, bold: true, italic: true, align: "center", lh: 1.2 }), c("App Store review, October 2026", 560, 0, 800, { size: 30, align: "center", color: SOFT })),
      C(160, 760, 200, 200, LILAC, { op: 0.7, name: "Blob" }), C(1600, 140, 160, 160, SKY, { op: 0.8, name: "Blob" }),
    ], "This review became the seed of the whole campaign idea."));
    P.push(SL(["#f3edff", "#fff0f3", 120], [
      c("Calmly today", 160, 110, 1300, { size: 80, bold: true }),
      [["1.2M", "downloads since launch", LILAC], ["4.8", "average App Store rating", PINK], ["62%", "open the app 4+ days a week", PEACH]].map(([n1, l1, col], i) => {
        const x = 160 + i * 540;
        return [C(x + 40, 300, 220, 220, col, { op: 0.8, name: "Blob" }), card(x, 340, 500, 520), flow(430, c(n1, x + 50, 0, 400, { size: 150, bold: true, lh: 1 }), 20, c(l1, x + 50, 0, 400, { size: 32, color: SOFT, lh: 1.3 })), R(x + 50, 760, 140, 12, col, { radius: 6, name: "Accent" })];
      }),
    ], "Three numbers that show people love the product; our job is to reach more of them."));
    P.push(SL([LILAC, SKY, 135], [
      E("shape-blob-2", 1180, 120, 640, { c1: WHITE, op: 0.4 }), C(1600, 790, 200, 200, PINK, { op: 0.6, name: "Blob" }),
      flow(260, c("Thank you", 160, 0, 1100, { size: 170, bold: true, lh: 1 }), 30, c("Take a calm minute today.", 160, 0, 1000, { size: 48 })),
      [["Email", "maya@calmly.app"], ["Plan & budget", "calmly.app/plan-2027"]].map(([l1, v1], i) => flow(620 + i * 110, c(l1.toUpperCase(), 160, 0, 800, { size: 22, bold: true, ls: 3, color: SOFT }), 4, c(v1, 160, 0, 800, { size: 36, bold: true }))),
    ], "Thank everyone and ask for feedback on the budget split by Friday."));
    return P;
  });

  /* ───────────── 5. Dark tech · project kickoff ───────────── */
  deck("dark-tech-kickoff", "Dark tech project kickoff", "project kickoff cloud migration engineering technology it dark tech", () => {
    const BG = "#0a0f1f", PANEL = "#111a33", LINE = "#1c2848", CYAN = "#22d3ee", GREEN = "#4ade80", TXT = "#e6edf7", MUTE = "#8b9bb8";
    const h = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", bold: true, color: TXT, ...o });
    const m = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: MUTE, ...o });
    const grid = () => [...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => R(i * 160, 0, 1, 1080, LINE, { name: "Grid" })), ...[1, 2, 3, 4, 5, 6].map((i) => R(0, i * 160 - 20, 1920, 1, LINE, { name: "Grid" }))].map(lock);
    const brackets = (x, y, w, h2, col, s = 40, t = 4) => [R(x, y, s, t, col), R(x, y, t, s, col), R(x + w - s, y, s, t, col), R(x + w - t, y, t, s, col), R(x, y + h2 - t, s, t, col), R(x, y + h2 - s, t, s, col), R(x + w - s, y + h2 - t, s, t, col), R(x + w - t, y + h2 - s, t, s, col)];
    const tag = (n) => m(`atlas / ${String(n).padStart(2, "0")}`, 1560, 60, 240, { size: 20, align: "right" });
    const P = [];
    P.push(SL(BG, [
      grid(),
      m("> project_kickoff --team=platform", 160, 210, 900, { size: 28, color: CYAN }),
      h("Atlas Cloud\nMigration", 160, 270, 1000, { size: 130, lh: 1 }),
      m("Kickoff  ·  Sprint 0  ·  3 March 2027", 160, 560, 900, { size: 28 }),
      R(160, 640, 300, 64, GREEN, { radius: 8, name: "Status" }), mid(m("STATUS: GO", 160, 0, 300, { size: 28, bold: true, color: BG, align: "center" }), 672),
      R(1120, 290, 640, 460, PANEL, { radius: 16, stroke: LINE, sw: 2, name: "Terminal" }),
      [0, 1, 2].map((i) => C(1150 + i * 34, 314, 18, 18, ["#f87171", "#fbbf24", GREEN][i], { name: "Dot" })),
      m("$ atlas plan --env prod\n  scanning services ...\n  212 services found\n  48 databases\n  3 regions\n  [ok] ready to migrate", 1160, 370, 560, { size: 28, color: TXT, lh: 1.6 }),
    ], "Welcome to the Atlas kickoff. By the end of this hour everyone should know the scope, the plan and their role."));
    const ag = [["Scope & goals", "What moves, what stays"], ["The plan", "Five phases over 14 weeks"], ["Progress so far", "Pilot results from Sprint 0"], ["Who does what", "Squads and owners"], ["Risks & questions", "Open floor"]];
    P.push(SL(BG, [
      grid(), tag(2),
      m("// agenda", 160, 150, 600, { size: 28, color: CYAN }),
      h("What we'll\ncover today", 160, 200, 640, { size: 90, lh: 1.05 }),
      R(880, 150, 880, 800, PANEL, { radius: 16, stroke: LINE, sw: 2, name: "Panel" }),
      ag.map(([t1, d1], i) => { const ry = 190 + i * 150; return [m(String(i + 1).padStart(2, "0"), 930, ry, 100, { size: 40, bold: true, color: CYAN }), h(t1, 1060, ry - 2, 640, { size: 40 }), m(d1, 1060, ry + 56, 640, { size: 24 }), i < 4 ? R(930, ry + 116, 780, 1, LINE, { name: "Divider" }) : null]; }),
    ], "Five items. Keep questions for the last slot so we finish on time."));
    P.push(SL(BG, [
      grid(),
      S("polygon", 1180, 220, 620, 620, "none", { sides: 6, stroke: CYAN, sw: 3, name: "Hexagon" }), S("polygon", 1290, 330, 400, 400, PANEL, { sides: 6, stroke: LINE, sw: 2, name: "Hexagon" }),
      mid(m("01", 1290, 0, 400, { size: 140, bold: true, color: CYAN, align: "center" }), 530),
      m("[ section ]", 160, 360, 700, { size: 32, color: CYAN }),
      h("Scope &\ngoals", 160, 420, 900, { size: 140, lh: 1 }),
      m("What moves to the cloud, and how we will know it worked.", 160, 740, 860, { size: 28, lh: 1.4 }),
    ], "Section one: scope. This is where we agree what is in and what is out."));
    const h4 = flow(170, m("// scope", 160, 0, 800, { size: 26, color: CYAN }), 16, h("Move 212 services without a single outage", 160, 0, 860, { size: 64, lh: 1.08 }), 30,
      T("Everything in the old data centre moves to three cloud regions. Customer-facing systems move last, after the pilot proves the path.", 160, 0, 860, { family: "sans", size: 28, color: MUTE, lh: 1.45 }));
    P.push(SL(BG, [
      grid(), tag(4), h4,
      bullets(160, after(h4, 40), 860, ["Zero planned downtime for customers", "Lower running costs by a third", "Every service monitored from day one"], { size: 28, color: TXT, marker: "square", mc: GREEN, md: 14, gap: 18 }),
      F(1120, 200, 640, 680, { name: "Photo", border: { width: 3, color: CYAN } }),
      brackets(1090, 170, 700, 740, CYAN),
    ], "Three goals: no customer downtime, a third cheaper to run, and full monitoring from day one."));
    P.push(SL(BG, [
      grid(), tag(5),
      m("// pilot results", 160, 150, 600, { size: 26, color: CYAN }),
      h("Services migrated per sprint", 160, 190, 1400, { size: 72 }),
      barsV(160, 330, 1600, 640, [["Sprint 0", 6], ["Sprint 1", 14], ["Sprint 2", 22], ["Sprint 3", 31], ["Sprint 4", 38]], { fill: [CYAN, CYAN, CYAN, CYAN, GREEN], grid: LINE, axis: MUTE, bar: 0.5, family: "mono", vs: 36, ls: 24, vc: TXT, lc: MUTE }),
    ], "Sprint 0 was the pilot with six services. The green bar is our target for Sprint 4."));
    P.push(SL(BG, [
      grid(), tag(6),
      m("// roadmap", 160, 150, 600, { size: 26, color: CYAN }),
      h("Five phases, fourteen weeks", 160, 190, 1400, { size: 72 }),
      tlH(160, 560, 1600, [["WK 1–2", "Discover", "Map every service and owner."], ["WK 3–4", "Pilot", "Move six low-risk services."], ["WK 5–10", "Migrate", "Squads move services in waves."], ["WK 11–12", "Optimise", "Right-size and cut costs."], ["WK 13–14", "Handover", "Run books and on-call ready."]],
        { marker: "hex", d: 96, dot: PANEL, ring: [CYAN, CYAN, GREEN, CYAN, CYAN], rw: 4, line: LINE, lw: 4, full: true, wf: "mono", ws: 28, wc: CYAN, ts: 42, tc: TXT, ds: 28, dc: MUTE, num: true, nc: TXT, nf: "mono", ns: 34, tg: 30 }),
    ], "We are in week three. The migrate phase is the long one; that is where the squads take over."));
    P.push(SL(BG, [
      grid(), tag(7),
      m("// squads", 160, 150, 600, { size: 26, color: CYAN }),
      h("Who does what", 160, 190, 1400, { size: 72 }),
      team(160, 400, 1600, [["Priya Raman", "programme lead"], ["Ken Watanabe", "platform squad"], ["Elena Petrova", "data squad"], ["Marcus Bell", "security"], ["Zara Ahmed", "site reliability"]],
        { d: 200, ring: CYAN, rg: 12, rw: 3, ns: 30, nc: TXT, rf: "mono", rs: 22, rc: CYAN, gap: 34 }),
    ], "Each squad has one owner. Priya runs the programme and the weekly status call."));
    P.push(SL(BG, [
      grid(),
      m("> cat lessons.txt", 160, 240, 800, { size: 30, color: CYAN }),
      stackMid(560, 50, h("Move the boring things first. By the time you reach the scary ones, the path is well worn.", 160, 0, 1500, { size: 76, bold: false, lh: 1.2 }),
        m("Priya Raman, programme lead", 160, 0, 900, { size: 28, color: GREEN })),
      brackets(120, 160, 1680, 760, CYAN, 60, 4),
    ], "This is the principle behind the order of the waves."));
    P.push(SL(BG, [
      grid(), tag(9),
      m("// by the numbers", 160, 150, 600, { size: 26, color: CYAN }),
      h("Atlas at a glance", 160, 190, 1400, { size: 72 }),
      [["212", "services to move"], ["99.9%", "uptime target"], ["-38%", "infrastructure cost"], ["14", "weeks end to end"]].map(([n1, l1], i) => {
        const x = 160 + i * 410;
        return [R(x, 380, 370, 440, PANEL, { radius: 16, stroke: LINE, sw: 2, name: "Panel" }), R(x, 380, 370, 6, i === 2 ? GREEN : CYAN, { name: "Top bar" }), stackMid(600, 20, h(n1, x + 32, 0, 310, { size: 88, color: i === 2 ? GREEN : CYAN }), m(l1, x + 32, 0, 310, { size: 26, color: TXT, lh: 1.35 })), m(`[${String(i + 1).padStart(2, "0")}]`, x + 32, 760, 310, { size: 22, color: MUTE })];
      }),
    ], "Four numbers to remember. The cost saving pays for the whole programme in the first year."));
    P.push(SL(BG, [
      grid(),
      m("$ exit 0", 160, 220, 600, { size: 30, color: GREEN }),
      h("Questions?", 160, 280, 1200, { size: 180, lh: 1 }),
      m("Channel   #atlas-migration\nWiki      wiki.internal/atlas\nLead      priya.raman@northstack.io", 160, 560, 1000, { size: 32, color: TXT, lh: 1.7 }),
      brackets(1300, 300, 460, 460, CYAN, 60, 4), mid(m("EOF", 1300, 0, 460, { size: 90, bold: true, color: CYAN, align: "center" }), 530),
    ], "Open the floor. Point people to the channel for anything we do not cover now."));
    return P;
  });

  /* ───────────── 6. Hand-drawn notebook · writing lesson ───────────── */
  deck("notebook-lesson", "Notebook creative writing lesson", "school lesson class teacher creative writing workshop notebook hand drawn education", () => {
    const PAPER = "#fffdf5", LINE = "#d3e3f4", MARGIN = "#f2a7a7", INK = "#2f3b4c", HL = "#fff176", N1 = "#fff59d", N2 = "#b3e5fc", N3 = "#f8bbd0", TAPE = "#e9dfc7";
    const hw = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "serif", italic: true, color: INK, ...o });
    const ty = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: INK, ...o });
    const paper = () => [...Array.from({ length: 17 }, (_, i) => R(0, 150 + i * 54, 1920, 2, LINE, { name: "Ruled line" })), R(200, 0, 3, 1080, MARGIN, { name: "Margin" })].map(lock);
    const note = (x, y, w, h, col, rot) => [R(x + 10, y + 12, w, h, "#000000", { op: 0.08, rot, name: "Note shadow" }), R(x, y, w, h, col, { rot, name: "Sticky note" })];
    const tape = (x, y, rot) => R(x, y, 150, 42, TAPE, { rot, op: 0.9, name: "Tape" });
    const polaroid = (x, y, w, h, rot) => [R(x + 8, y + 10, w, h, "#000000", { op: 0.08, rot, name: "Shadow" }), R(x, y, w, h, WHITE, { rot, name: "Polaroid" }), F(x + 26, y + 26, w - 52, h - 120, { rot, name: "Photo" })];
    const P = [];
    P.push(SL(PAPER, [
      paper(),
      R(250, 425, 610, 74, HL, { rot: -1, op: 0.85, name: "Highlighter" }),
      hw("Creative Writing", 250, 260, 900, { size: 110, bold: true, lh: 1.1 }),
      hw("Workshop", 260, 398, 700, { size: 110, bold: true, lh: 1.1 }),
      E("line-wavy", 260, 556, 520, { h: 40, c1: "#e57373" }),
      ty("Lesson 3 · Finding your story", 260, 650, 800, { size: 32 }),
      ty("Year 8 English · Room 12 · Ms. Carter", 260, 700, 800, { size: 26, color: "#5f6b7a" }),
      polaroid(1200, 170, 560, 660, 3), tape(1400, 150, -4),
      hw("my first notebook", 1240, 720, 480, { size: 36, rot: 3, align: "center" }),
      E("deco-sparkle", 1060, 160, 90, { c1: "#f6bf26" }), E("arrow-curved", 980, 620, 170, { c1: INK, rot: 150 }),
    ], "Welcome, writers! Today is about finding the story only you can tell. Get your notebooks open."));
    const plan = ["Warm-up: five minutes of free writing", "Show, don't tell", "Plan a story arc", "Write a short scene", "Share with a buddy"];
    P.push(SL(PAPER, [
      paper(),
      hw("Today's plan", 260, 120, 900, { size: 96, bold: true }),
      E("line-hand", 260, 250, 420, { h: 30, c1: "#e57373" }),
      plan.map((t1, i) => { const ry = 330 + i * 108; return [R(270, ry + 6, 44, 44, "none", { stroke: INK, sw: 3, radius: 6, name: "Checkbox" }), i < 1 ? E("icon-check", 268, ry - 4, 56, { c1: "#43a047" }) : null, hw(t1, 350, ry - 2, 820, { size: 46 })]; }),
      note(1340, 330, 420, 400, N2, 4),
      hw("Bring:\nnotebook,\npencil,\nimagination!", 1380, 380, 340, { size: 50, bold: true, rot: 4, lh: 1.15 }),
      tape(1470, 310, -6),
    ], "Tick the warm-up box together once it's done. Point at the sticky note: no laptops today."));
    P.push(SL(PAPER, [
      paper(),
      note(560, 220, 800, 620, N1, -3), tape(860, 190, 3),
      hw("Part 1", 620, 300, 680, { size: 60, rot: -3, align: "center", color: "#c0392b" }),
      hw("Warm-up", 620, 400, 680, { size: 150, bold: true, rot: -3, align: "center", lh: 1 }),
      ty("Write for five minutes.\nDon't stop. Don't erase.", 620, 600, 680, { size: 34, rot: -3, align: "center", lh: 1.4 }),
      E("deco-sparkle", 1440, 200, 110, { c1: "#f6bf26" }), E("deco-squiggle", 300, 800, 220, { c1: "#64b5f6" }),
    ], "Set a timer for five minutes. The only rule: the pencil keeps moving."));
    P.push(SL(PAPER, [
      paper(),
      hw("Show, don't tell", 260, 110, 1100, { size: 96, bold: true }),
      R(262, 240, 600, 18, HL, { op: 0.8, name: "Highlighter" }),
      ty("Tell the reader how a character feels, and they forget.\nShow them, and they feel it too.", 260, 300, 1020, { size: 28, lh: 1.5 }),
      note(260, 480, 400, 320, N3, -2), hw("Tell:", 290, 510, 340, { size: 40, bold: true, rot: -2, color: "#c0392b" }), hw("She was scared.", 290, 580, 340, { size: 44, rot: -2 }),
      note(720, 480, 460, 380, N2, 2), hw("Show:", 750, 510, 400, { size: 40, bold: true, rot: 2, color: "#2e7d32" }), hw("Her hands shook as she reached for the door handle.", 750, 580, 400, { size: 40, rot: 2, lh: 1.2 }),
      polaroid(1320, 260, 440, 560, -3), tape(1460, 240, 5),
      hw("what does scared look like?", 1350, 715, 380, { size: 30, rot: -3, align: "center" }),
    ], "Read both notes aloud. Ask the class which one they can picture."));
    P.push(SL(PAPER, [
      paper(),
      hw("What makes a story stick?", 260, 110, 1400, { size: 84, bold: true }),
      ty("Class vote, 31 students", 260, 230, 800, { size: 26, color: "#5f6b7a" }),
      barsV(260, 300, 1300, 700, [["Characters", 12], ["Conflict", 9], ["Twist", 7], ["Setting", 5], ["Dialogue", 4]], { fill: [N1, N3, N2, "#c8e6c9", "#ffe0b2"], stroke: INK, sw: 3, bar: 0.6, family: "serif", vf: "mono", vs: 36, ls: 34, lc: INK, vc: INK, axis: INK, aw: 3 }),
      E("arrow-curved", 1560, 340, 150, { c1: "#e57373", rot: 200 }),
      hw("characters win!", 1580, 520, 300, { size: 40, bold: true, color: "#c0392b", rot: -6 }),
    ], "Characters won by a mile. That's why today's scene starts with a person, not a place."));
    const pts = [[330, 780], [660, 610], [990, 330], [1320, 620], [1650, 760]];
    const arc = [["Beginning", "Meet the hero"], ["Rising action", "Trouble starts"], ["Climax", "The big moment"], ["Falling action", "Things settle"], ["Ending", "What changed?"]];
    const seg = (a1, b1) => { const dx = b1[0] - a1[0], dy = b1[1] - a1[1], len = Math.hypot(dx, dy); return R((a1[0] + b1[0]) / 2 - len / 2, (a1[1] + b1[1]) / 2 - 2, len, 4, INK, { rot: (Math.atan2(dy, dx) * 180) / Math.PI, name: "Arc line" }); };
    P.push(SL(PAPER, [
      paper(),
      hw("The story arc", 260, 110, 1100, { size: 96, bold: true }),
      pts.slice(1).map((p, i) => seg(pts[i], p)),
      pts.map(([x, y], i) => [R(x - 1, y + 30, 2, 850 - y - 30, "#9fb3c8", { name: "Guide" }), C(x - 26, y - 26, 52, 52, [N1, N3, "#ff8a80", N2, "#c8e6c9"][i], { stroke: INK, sw: 3, name: "Point" })]),
      arc.map(([t1, d1], i) => flow(866, hw(t1, pts[i][0] - 150, 0, 300, { size: 38, bold: true, align: "center" }), 4, ty(d1, pts[i][0] - 150, 0, 300, { size: 22, align: "center" }))),
      E("deco-sparkle", 1040, 230, 80, { c1: "#f6bf26" }),
    ], "Trace the arc with your finger. Every story you love follows some version of this shape."));
    P.push(SL(PAPER, [
      paper(),
      hw("Your workshop team", 260, 110, 1200, { size: 96, bold: true }),
      team(260, 330, 1500, [["Ms. Carter", "English teacher"], ["Mr. Osei", "Librarian"], ["Lily (Year 12)", "Writing mentor"]],
        { d: 300, ring: INK, rg: 10, rw: 3, family: "serif", ni: true, ns: 48, nc: INK, rf: "mono", rs: 24, rc: "#5f6b7a", gap: 40 }),
      E("deco-sparkle", 640, 300, 70, { c1: "#f6bf26" }), E("deco-sparkle", 1650, 640, 70, { c1: "#f6bf26" }),
    ], "Introduce the helpers. Lily won the school story prize last year and will read with small groups."));
    P.push(SL(PAPER, [
      paper(),
      note(460, 180, 1000, 640, N3, 2), tape(880, 150, -3),
      hw("“You can't edit a blank page. Write first, fix later.”", 540, 300, 840, { size: 76, bold: true, rot: 2, align: "center", lh: 1.15 }),
      ty("Ms. Carter's golden rule", 540, 650, 840, { size: 30, rot: 2, align: "center" }),
      E("deco-sparkle", 1500, 760, 110, { c1: "#f6bf26" }), E("line-hand", 300, 900, 300, { h: 30, c1: "#64b5f6" }),
    ], "Say it together. Messy first drafts are not just allowed, they're expected."));
    P.push(SL(PAPER, [
      paper(),
      hw("By the end of today", 260, 110, 1200, { size: 96, bold: true }),
      [["3", "warm-up pages", "#e57373"], ["1", "short scene", "#64b5f6"], ["15", "minutes of free writing", "#81c784"]].map(([n1, l1, col], i) => {
        const x = 260 + i * 520;
        return [C(x, 320, 340, 300, "none", { stroke: col, sw: 6, rot: -6, name: "Circle" }), C(x + 10, 330, 330, 290, "none", { stroke: col, sw: 3, rot: 4, name: "Circle" }), mid(hw(n1, x, 0, 340, { size: 170, bold: true, align: "center", lh: 1 }), 470), hw(l1, x - 40, 680, 420, { size: 44, align: "center" })];
      }),
    ], "These are the three things everyone leaves with today."));
    P.push(SL(PAPER, [
      paper(),
      hw("Thank you, writers!", 260, 160, 1100, { size: 110, bold: true }),
      E("line-wavy", 270, 310, 600, { h: 40, c1: "#e57373" }),
      ty("Questions? ms.carter@hillview.school\nNext class: Friday, Room 12", 260, 420, 900, { size: 32, lh: 1.6 }),
      note(1240, 300, 520, 500, N1, -4), tape(1420, 280, 4),
      hw("Homework", 1280, 340, 440, { size: 56, bold: true, rot: -4, color: "#c0392b" }),
      hw("Finish your scene and bring it on Friday. One page is plenty!", 1280, 440, 440, { size: 40, rot: -4, lh: 1.2 }),
      E("deco-sparkle", 1040, 700, 100, { c1: "#f6bf26" }),
    ], "Remind them of homework and say thank you. Collect the warm-up pages on the way out."));
    return P;
  });

  /* ───────────── 7. Retro 70s bands · festival sponsorship ───────────── */
  deck("retro-festival", "Retro 70s festival sponsorship", "festival music event sponsorship sponsor retro 70s vintage summer", () => {
    const CREAM = "#f7e9cc", BROWN = "#4a2e1f", ORANGE = "#d4601f", MUST = "#f2b33d", RUST = "#b8432a", OLIVE = "#7c8a35";
    const BANDS = [MUST, ORANGE, RUST, BROWN];
    const g = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", bold: true, color: BROWN, ...o });
    const sv = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "serif", italic: true, bold: true, color: RUST, ...o });
    const retro = (col) => ({ x: 6, y: 6, blur: 0, color: col, opacity: 1 });
    const rainbow = (cx, cy, r, step, cols, bg) => [...cols.map((c1, i) => C(cx - (r - i * step), cy - (r - i * step), (r - i * step) * 2, (r - i * step) * 2, c1, { name: "Arc" })), C(cx - (r - cols.length * step), cy - (r - cols.length * step), (r - cols.length * step) * 2, (r - cols.length * step) * 2, bg, { name: "Arc centre" }), R(cx - r - 2, cy, r * 2 + 4, Math.min(r + 4, 1080 - cy), bg, { name: "Arc cover" })];
    const stripes = (x, y, w, hh, gap, cols, rad = 0) => cols.map((c1, i) => R(x, y + i * (hh + gap), w, hh, c1, { radius: rad, name: "Stripe" }));
    const P = [];
    P.push(SL(CREAM, [
      rainbow(1480, 700, 380, 64, BANDS, CREAM),
      stripes(0, 760, 1920, 44, 18, BANDS),
      g("SUNBURST", 120, 170, 1100, { size: 170, lh: 1, ls: 4, shadow: retro(ORANGE) }),
      sv("Music Festival", 130, 360, 900, { size: 90 }),
      g("Sponsorship deck  ·  Summer 2027", 130, 500, 900, { size: 34, bold: false }),
      g("Lake Harbour Park  ·  23–25 July", 130, 560, 900, { size: 34 }),
    ], "Thanks for meeting us. Sunburst is three days of music by the lake, and we'd love you on board as a sponsor."));
    const ag = [["The festival", "Three days, 42 bands"], ["Our crowd", "Who comes and why"], ["The weekend plan", "From line-up to last song"], ["Packages", "Gold, silver and community"], ["Next steps", "Timeline and contacts"]];
    P.push(SL(BROWN, [
      [ORANGE, MUST, CREAM, RUST].map((c1, i) => R(120 + i * 80, 0, 56, 1080, c1, { name: "Stripe" })),
      g("What's\ninside", 520, 140, 500, { size: 110, color: CREAM, lh: 1 }),
      ag.map(([t1, d1], i) => { const ry = 160 + i * 160; return [C(1080, ry, 96, 96, BANDS[i % 3], { name: "Badge" }), mid(g(String(i + 1), 1080, 0, 96, { size: 48, align: "center", color: i % 3 === 2 ? CREAM : BROWN }), ry + 48), g(t1, 1210, ry + 2, 600, { size: 44, color: CREAM }), g(d1, 1210, ry + 58, 600, { size: 28, bold: false, color: MUST })]; }),
    ], "Here's what we'll cover. The packages are on slide nine if you want to jump ahead."));
    P.push(SL(ORANGE, [
      rainbow(960, 640, 440, 56, [MUST, CREAM, RUST, BROWN], ORANGE),
      mid(g("01", 760, 0, 400, { size: 130, color: CREAM, align: "center", lh: 1 }), 565),
      g("The festival", 120, 700, 1680, { size: 120, color: CREAM, align: "center", shadow: retro(BROWN) }),
      g("Three days of music, food and sunshine by the lake", 120, 870, 1680, { size: 38, bold: false, color: CREAM, align: "center" }),
    ], "Part one is the festival itself: what it is, where it is and why people love it."));
    P.push(SL(CREAM, [
      stripes(0, 70, 1920, 26, 12, BANDS),
      F(1080, 240, 700, 720, { shape: "rounded", radius: 120, name: "Photo", border: { width: 12, color: BROWN } }),
      C(1660, 200, 180, 180, MUST, { name: "Sun" }),
      flow(260, g("THE FESTIVAL", 120, 0, 860, { size: 28, color: ORANGE, ls: 4 }), 14, g("Three days by the lake", 120, 0, 860, { size: 84, lh: 1.02 }), 30,
        g("Since 2019 Sunburst has grown from a picnic with one stage into the region's favourite summer weekend.", 120, 0, 840, { size: 32, bold: false, lh: 1.4 })),
      [["3 stages", MUST], ["42 bands", ORANGE], ["60 food stalls", RUST]].map(([t1, col], i) => g(t1, 120 + i * 320, 760, 300, { size: 28, color: i === 2 ? CREAM : BROWN, align: "center", bg: { color: col, radius: 1, pad: 0.7 } })),
    ], "Show the photo of the main stage at sunset. That's the moment sponsors want to be part of."));
    P.push(SL(CREAM, [
      g("Tickets sold", 120, 110, 1000, { size: 90, shadow: retro(MUST) }),
      sv("thousands, by year", 120, 230, 900, { size: 44 }),
      barsV(120, 320, 1680, 680, [["2022", 6.5], ["2023", 9.8], ["2024", 12.4], ["2025", 15.1], ["2026", 18.0]], { fill: [OLIVE, MUST, ORANGE, RUST, BROWN], radius: 60, bar: 0.62, vs: 48, ls: 34, lb: true, lc: BROWN, vc: BROWN, fmt: (v) => v + "k" }),
    ], "Ticket sales nearly tripled in four years, and 2026 sold out three weeks early."));
    P.push(SL(CREAM, [
      g("The road to summer", 120, 110, 1400, { size: 90, shadow: retro(MUST) }),
      R(120, 520, 1680, 10, BROWN, { radius: 5, name: "Road" }),
      [["JAN", "Line-up", "Headliners announced"], ["MAR", "Tickets", "Early birds on sale"], ["MAY", "Partners", "Sponsor stands fixed"], ["JUL", "Festival", "Three days by the lake"], ["AUG", "Report", "Sponsor results pack"]].map(([m1, t1, d1], i) => {
        const cx = 120 + 336 * i + 168;
        return [R(cx - 120, 470, 240, 110, [MUST, ORANGE, RUST, BROWN, OLIVE][i], { radius: 55, name: "Pill" }), mid(g(m1, cx - 120, 0, 240, { size: 46, color: i > 1 ? CREAM : BROWN, align: "center", ls: 3 }), 525),
          flow(640, g(t1, cx - 150, 0, 300, { size: 38, align: "center" }), 8, g(d1, cx - 150, 0, 300, { size: 28, bold: false, align: "center", lh: 1.3 }))];
      }),
    ], "Sponsors who sign by May get their stand and logo on every poster."));
    P.push(SL(MUST, [
      g("The crew", 120, 110, 1000, { size: 100, color: BROWN, shadow: retro(CREAM) }),
      team(120, 380, 1680, [["Rosa Delgado", "Festival director"], ["Ben Clarke", "Music booking"], ["Tasha Grant", "Partnerships"], ["Joel Kim", "Site & production"]],
        { d: 260, ring: [ORANGE, RUST, BROWN, ORANGE], rg: 16, rw: 14, ns: 38, nc: BROWN, rs: 28, rc: BROWN, gap: 40 }),
    ], "Tasha is your day-to-day contact; Rosa signs off every partnership."));
    P.push(SL(BROWN, [
      rainbow(1660, 300, 220, 44, [MUST, ORANGE, RUST, CREAM], BROWN),
      sv("“", 120, 80, 260, { size: 300, color: MUST, lh: 1, name: "Quote mark" }),
      flow(320, g("Best weekend of the summer, and the best crowd we have ever played to.", 400, 0, 1100, { size: 66, color: CREAM, lh: 1.15 }), 50,
        g("The Lakeshore Band, 2026 headliners", 400, 0, 1000, { size: 34, bold: false, color: MUST })),
      stripes(0, 940, 1920, 24, 14, [MUST, ORANGE, RUST]),
    ], "Bands love the crowd, and that energy is what our partners tap into."));
    P.push(SL(CREAM, [
      g("Sunburst in numbers", 120, 110, 1400, { size: 90, shadow: retro(MUST) }),
      [["18k", "visitors in 2026", MUST], ["42", "bands on 3 stages", ORANGE], ["3", "days by the lake", RUST], ["96%", "say they'll be back", BROWN]].map(([n1, l1, col], i) => {
        const x = 120 + i * 430;
        return [C(x, 320, 380, 380, col, { name: "Badge" }), C(x + 24, 344, 332, 332, "none", { stroke: CREAM, sw: 4, name: "Badge ring" }), mid(g(n1, x, 0, 380, { size: 120, color: i ? CREAM : BROWN, align: "center", lh: 1 }), 510), g(l1, x, 740, 380, { size: 34, bold: false, align: "center" })];
      }),
    ], "These are audited ticket numbers. The return rate is from our post-festival survey."));
    P.push(SL(ORANGE, [
      stripes(0, 760, 1920, 50, 20, [MUST, CREAM, RUST, BROWN]),
      g("Let's make summer\nsound better", 120, 150, 1300, { size: 120, color: CREAM, lh: 1.05, shadow: retro(BROWN) }),
      g("tasha@sunburstfest.com  ·  +1 503 555 0199  ·  sunburstfest.com/partners", 120, 500, 1680, { size: 36, color: BROWN }),
    ], "Thank them, leave the partner pack and agree a date to follow up."));
    return P;
  });

  /* ───────────── 8. Corporate blue · quarterly report ───────────── */
  deck("corporate-quarterly", "Corporate blue quarterly report", "quarterly report q3 business results finance corporate company board blue", () => {
    const NAVY = "#0a2f6b", BLUE = "#1f6fd1", LIGHT = "#e9f1fb", GREY = "#5b6878", LINE = "#d5dfec", GREEN = "#14804a";
    const c = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "calibri", color: NAVY, ...o });
    const head = (title, n) => [c(title, 120, 70, 1500, { size: 60, bold: true }), R(120, 160, 90, 6, BLUE, { name: "Accent" }),
      R(0, 1020, 1920, 60, LIGHT, { name: "Footer" }), c("Northwind Logistics  ·  Q3 2026 Quarterly Report", 120, 1036, 1000, { size: 20, color: GREY }), c(String(n), 1700, 1036, 100, { size: 20, bold: true, color: GREY, align: "right" })];
    const logo = (x, y, dark) => [R(x, y, 64, 64, BLUE, { radius: 12, name: "Logo mark" }), mid(c("N", x, 0, 64, { size: 40, bold: true, color: WHITE, align: "center" }), y + 32), mid(c("NORTHWIND LOGISTICS", x + 84, 0, 600, { size: 24, bold: true, color: dark ? WHITE : NAVY, ls: 3 }), y + 32)];
    const P = [];
    P.push(SL(WHITE, [
      // (a business woman on the right half, like Canva's corporate report covers)
      R(0, 0, 1100, 1080, NAVY, { name: "Panel" }), face(CAST, F(1100, 0, 820, 1080, { name: "Photo" }), KIND.business, { sex: "f" }),
      logo(120, 120, true),
      flow(360, c("Q3 2026\nQuarterly Report", 120, 0, 900, { size: 100, bold: true, color: WHITE, lh: 1.05 }), 30, c("Results for July to September 2026", 120, 0, 900, { size: 36, color: "#c7dbf7" })),
      R(120, 760, 120, 8, BLUE, { name: "Accent" }),
      c("Board meeting  ·  14 October 2026", 120, 800, 900, { size: 28, color: WHITE }),
    ], "Good morning. This is our third-quarter report. The short version: revenue up, costs down, and a strong pipeline for Q4."));
    const ag = [["Quarter highlights", "The headlines in one page"], ["Financial results", "Revenue, margin and cash"], ["Operations", "Delivery, fleet and hubs"], ["People", "Leadership and hiring"], ["Outlook", "Targets for Q4"]];
    P.push(SL(WHITE, [
      head("Agenda", 2),
      ag.map(([t1, d1], i) => { const ry = 250 + i * 146; return [R(120, ry, 72, 72, BLUE, { radius: 8, name: "Number box" }), mid(c(String(i + 1), 120, 0, 72, { size: 36, bold: true, color: WHITE, align: "center" }), ry + 36), c(t1, 230, ry - 4, 760, { size: 38, bold: true }), c(d1, 230, ry + 44, 760, { size: 26, color: GREY }), R(120, ry + 112, 900, 1.5, LINE, { name: "Divider" })]; }),
      R(1180, 250, 620, 470, LIGHT, { radius: 16, name: "Panel" }),
      c("Quarter at a glance", 1240, 300, 500, { size: 34, bold: true }),
      bullets(1240, 380, 500, ["Revenue $48.2M, up 12%", "Operating margin 14.1%", "On-time delivery 97.3%", "Fleet now 40% electric"], { family: "calibri", size: 30, color: NAVY, icon: "icon-check-circle", mc: BLUE, md: 34, gap: 30 }),
    ], "Five sections. The panel on the right is the one-minute summary if time is short."));
    P.push(SL([NAVY, BLUE, 120], [
      c("01", 120, 260, 500, { size: 200, bold: true, color: WHITE, lh: 1 }),
      c("Financial results", 120, 500, 1400, { size: 110, bold: true, color: WHITE }),
      R(120, 660, 160, 8, WHITE, { name: "Accent" }),
      c("Revenue, operating margin and cash flow for the quarter.", 120, 710, 1200, { size: 36, color: "#dbe8fb" }),
      logo(1180, 120, true),
    ], "Section one, the numbers. Detailed tables are in the appendix you received on Friday."));
    P.push(SL(WHITE, [
      head("Highlights of the quarter", 4),
      c("Our best quarter since 2019, driven by the new Dallas hub and two large retail contracts.", 120, 220, 860, { size: 32, color: GREY, lh: 1.4 }),
      bullets(120, 380, 860, ["Revenue grew 12% year on year to $48.2M", "Dallas hub opened on time and under budget", "Two retail contracts signed, worth $9M a year", "Customer satisfaction at a record 4.6 out of 5"], { family: "calibri", size: 32, color: NAVY, icon: "icon-check-circle", mc: BLUE, md: 38, gap: 34 }),
      F(1100, 220, 700, 640, { name: "Photo" }),
      c("The new Dallas hub, opened 3 July 2026", 1100, 880, 700, { size: 22, color: GREY }),
    ], "Four headlines. If people remember one thing, it should be the two new retail contracts."));
    P.push(SL(WHITE, [
      head("Quarterly revenue ($M)", 5),
      barsV(120, 220, 1080, 780, [["Q3 2025", 43.0], ["Q4 2025", 44.5], ["Q1 2026", 42.1], ["Q2 2026", 45.2], ["Q3 2026", 48.2]], { fill: ["#b9d2f3", "#b9d2f3", "#b9d2f3", "#b9d2f3", BLUE], grid: LINE, axis: NAVY, bar: 0.6, family: "calibri", vs: 36, ls: 26, vc: NAVY, lc: GREY, fmt: (v) => v.toFixed(1) }),
      R(1300, 240, 500, 700, LIGHT, { radius: 16, name: "Panel" }),
      flow(290, c("+12%", 1350, 0, 400, { size: 110, bold: true, color: GREEN, lh: 1 }), 8, c("year on year", 1350, 0, 400, { size: 30, color: GREY }), 50,
        c("+6.6%", 1350, 0, 400, { size: 110, bold: true, color: BLUE, lh: 1 }), 8, c("against last quarter", 1350, 0, 400, { size: 30, color: GREY })),
    ], "Q3 is the highest bar on the chart. Q1 dipped because of the January storms."));
    P.push(SL(WHITE, [
      head("Q3 milestones", 6),
      [0, 1, 2, 3].map((i) => F(120 + i * 420 + 30, 230, 360, 250, { shape: "rounded", radius: 12, name: "Milestone photo " + (i + 1) })),
      tlH(120, 640, 1680, [["3 July", "Dallas hub opens", "Our largest site, 220,000 sq ft."], ["28 July", "Fleet 40% electric", "120 new electric vans."], ["19 August", "ISO 14001", "Environmental certification."], ["22 September", "Retail deal signed", "Five-year contract with Brightmart."]],
        { d: 44, dot: WHITE, ring: BLUE, rw: 8, line: LINE, lw: 6, family: "calibri", ws: 30, wc: BLUE, ts: 36, tc: NAVY, ds: 26, dc: GREY }),
    ], "Four milestones, all delivered on the dates promised at the start of the year."));
    P.push(SL(WHITE, [
      head("Leadership team", 7),
      team(120, 300, 1680, [["Helen Park", "Chief Executive"], ["David Moreno", "Chief Financial Officer"], ["Aiko Tanaka", "Chief Operating Officer"], ["Samuel Reed", "VP Sales"], ["Fatima Noor", "VP People"]],
        { d: 260, family: "calibri", ns: 34, nc: NAVY, rs: 26, rc: GREY, border: { width: 6, color: LIGHT }, gap: 34 }),
    ], "No changes to the leadership team this quarter. Fatima joined in June as VP People."));
    P.push(SL(LIGHT, [
      R(120, 200, 1680, 680, WHITE, { radius: 20, name: "Card" }), R(120, 200, 12, 680, BLUE, { name: "Accent" }),
      c("“", 200, 220, 200, { size: 240, bold: true, color: BLUE, lh: 1, name: "Quote mark" }),
      stackMid(625, 40, c("Northwind cut our delivery times by two days and never missed a peak week. They feel like part of our team.", 200, 0, 1500, { size: 60, lh: 1.25 }),
        c("Laura Chen, Head of Supply Chain, Brightmart", 200, 0, 1200, { size: 30, bold: true, color: BLUE })),
    ], "Brightmart signed a five-year contract in September; this is from their review call."));
    P.push(SL(LIGHT, [
      c("Key numbers", 120, 70, 1500, { size: 60, bold: true }), R(120, 160, 90, 6, BLUE, { name: "Accent" }),
      [["$48.2M", "Revenue", "+12% vs Q3 2025"], ["14.1%", "Operating margin", "+1.8 pts vs Q3 2025"], ["97.3%", "On-time delivery", "+0.9 pts vs Q2"], ["1,840", "Employees", "+65 this quarter"]].map(([n1, l1, d1], i) => {
        const x = 120 + i * 430;
        return [R(x, 280, 390, 560, WHITE, { radius: 16, name: "KPI card" }), R(x, 280, 390, 10, BLUE, { name: "KPI top" }), flow(350, c(l1, x + 36, 0, 320, { size: 30, color: GREY }), 16, c(n1, x + 36, 0, 330, { size: 84, bold: true, lh: 1 }), 30, c(d1, x + 36, 0, 320, { size: 28, bold: true, color: GREEN })),
          [0.62, 0.7, 0.66, 0.8, 0.92].map((v, j) => R(x + 36 + j * 62, 800 - 150 * v, 44, 150 * v, j === 4 ? BLUE : "#c9dbf3", { radius: 4, name: "Trend bar" }))];
      }),
      R(0, 1020, 1920, 60, WHITE, { name: "Footer" }), c("Northwind Logistics  ·  Q3 2026 Quarterly Report", 120, 1036, 1000, { size: 20, color: GREY }), c("9", 1700, 1036, 100, { size: 20, bold: true, color: GREY, align: "right" }),
    ], "Four KPIs, all moving in the right direction. Green lines show the change."));
    P.push(SL(NAVY, [
      logo(120, 120, true),
      c("Thank you", 120, 340, 1200, { size: 140, bold: true, color: WHITE }),
      c("Questions and discussion", 120, 520, 1200, { size: 40, color: "#c7dbf7" }),
      R(120, 640, 1680, 2, "#2f5592", { name: "Divider" }),
      [["Investor relations", "ir@northwindlogistics.com"], ["Phone", "+1 214 555 0110"], ["Full report", "northwindlogistics.com/q3"]].map(([l1, v1], i) => flow(690, c(l1, 120 + i * 580, 0, 540, { size: 24, color: "#8fb6ee" }), 6, c(v1, 120 + i * 580, 0, 540, { size: 32, bold: true, color: WHITE }))),
    ], "Thank the board and open the floor for questions."));
    return P;
  });

  /* ───────────── 9. Minimal mono · onboarding ───────────── */
  deck("mono-onboarding", "Minimal mono onboarding", "onboarding new hire employee welcome hr team minimal monochrome black white", () => {
    const BG = "#fafaf8", BLK = "#111111", GREY = "#6e6e6e", HAIR = "#d6d6d2";
    const s = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: BLK, ...o });
    const m = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: GREY, ...o });
    const chrome = (n, dark) => [m("Fieldnote Studio — Onboarding", 160, 80, 800, { size: 18, color: dark ? "#a8a8a8" : GREY }), m(`${String(n).padStart(2, "0")} / 10`, 1560, 80, 200, { size: 18, align: "right", color: dark ? "#9a9a9a" : GREY })];
    const P = [];
    P.push(SL(BG, [
      chrome(1),
      s("Welcome\naboard.", 160, 300, 1100, { size: 170, lh: 1, ls: -4 }),
      F(1460, 300, 300, 400, { name: "Photo" }),
      R(160, 800, 1600, 1, BLK, { name: "Hairline" }),
      [["Fieldnote Studio", 160], ["For new team members", 700], ["Version 3 · 2027", 1240]].map(([t1, x]) => m(t1, x, 830, 500, { size: 20, color: BLK })),
    ], "Welcome! This deck walks you through your first week. Keep it open; you'll come back to it."));
    const wk = [["Your first day", "MON"], ["How we work", "MON"], ["Tools and accounts", "TUE"], ["Your first project", "WED"], ["Meet the clients", "THU"], ["Week-one check-in", "FRI"]];
    P.push(SL(BG, [
      chrome(2),
      s("This week", 160, 220, 560, { size: 96, ls: -2 }),
      m("Six things, one a day or so.", 160, 350, 520, { size: 22 }),
      wk.map(([t1, d1], i) => { const ry = 220 + i * 120; return [R(760, ry, 1000, 1, HAIR, { name: "Hairline" }), m(String(i + 1).padStart(2, "0"), 760, ry + 40, 80, { size: 22 }), s(t1, 880, ry + 30, 620, { size: 38 }), m(d1, 1560, ry + 40, 200, { size: 22, align: "right", color: BLK })]; }),
      R(760, 940, 1000, 1, HAIR, { name: "Hairline" }),
    ], "Run through the week. Nothing here is a test; it's just so you know what's coming."));
    P.push(SL(BLK, [
      chrome(3, true),
      m("01", 160, 380, 200, { size: 24, color: "#9a9a9a" }),
      s("How we work", 160, 430, 1600, { size: 140, color: WHITE, ls: -4 }),
      R(160, 640, 1600, 1, "#444444", { name: "Hairline" }),
      s("Small team, clear owners, few meetings.", 160, 680, 1400, { size: 36, color: "#a8a8a8" }),
    ], "A short section on habits. These three ideas explain most of how we behave."));
    const pr = [["Write it down", "Decisions live in the project doc, not in someone's head."], ["Ship small", "Show work early, even when it's rough. Feedback beats polish."], ["Ask early", "If you're stuck for more than an hour, ask. Nobody minds."]];
    P.push(SL(BG, [
      chrome(4),
      s("Three habits", 160, 180, 800, { size: 80, ls: -2 }),
      pr.map(([t1, d1], i) => { const ry = 360 + i * 200; return [R(160, ry, 760, 1, BLK, { name: "Hairline" }), m(String(i + 1).padStart(2, "0"), 160, ry + 30, 80, { size: 22 }), flow(ry + 24, s(t1, 260, 0, 660, { size: 40 }), 10, s(d1, 260, 0, 660, { size: 26, color: GREY, lh: 1.4 }))]; }),
      F(1100, 180, 660, 780, { name: "Photo" }),
    ], "These three habits matter more than any tool. Ask anyone in the studio for an example."));
    P.push(SL(BG, [
      chrome(5),
      s("Your first 30 days", 160, 180, 1200, { size: 80, ls: -2 }),
      m("Share of your time, roughly", 160, 290, 800, { size: 22 }),
      barsH(160, 360, 1600, 600, [["Learning the product", 40], ["Pairing with your buddy", 25], ["Your first project", 20], ["Meetings and admin", 15]], { stack: true, bh: 8, track: HAIR, fill: BLK, ls: 32, lc: BLK, vs: 28, vf: "mono", vb: false, vc: BLK, vw: 200, fmt: (v) => v + "%" }),
    ], "Most of the first month is learning. Nobody expects you to ship big things yet."));
    P.push(SL(BG, [
      chrome(6),
      s("Week one", 160, 180, 600, { size: 80, ls: -2 }),
      m("Day by day", 160, 290, 400, { size: 22 }),
      tlV(980, 180, 800, [["MON", "Laptop, accounts, lunch with the team", "Your buddy meets you at 9:30."], ["TUE", "Product walkthrough", "Two hours with Jonas, bring questions."], ["WED", "Your first project", "A small, real task with a clear owner."], ["THU", "Client call", "Listen in; no need to speak."], ["FRI", "Week-one check-in", "Thirty minutes with Anna."]],
        { d: 12, lw: 1, line: BLK, dot: BLK, ww: 140, wf: "mono", ws: 22, wb: false, wc: GREY, ts: 34, tb: false, tc: BLK, ds: 22, dc: GREY, tw: 700 }),
    ], "A gentle first week. Friday's check-in is about how you feel, not what you've done."));
    P.push(SL(BG, [
      chrome(7),
      s("People you'll meet", 160, 180, 1200, { size: 80, ls: -2 }),
      team(160, 420, 1600, [["Anna Holm", "Founder"], ["Jonas Berg", "Product"], ["Mei Lin", "Design"], ["Kwame Asante", "Engineering"], ["Sara Vidal", "Clients"], ["Leo Park", "Your buddy"]],
        { d: 170, ns: 28, nb: false, nc: BLK, rf: "mono", rs: 18, rc: GREY, gap: 28 }),
    ], "Six faces to know by Friday. Leo is your buddy for the first month."));
    P.push(SL(BG, [
      chrome(8),
      R(910, 300, 100, 1, BLK, { name: "Hairline" }),
      s("“Good work is quiet. It shows up on time and explains itself.”", 360, 380, 1200, { size: 60, align: "center", lh: 1.25, ls: -1 }),
      m("Anna Holm, founder", 360, 660, 1200, { size: 22, align: "center" }),
      R(910, 760, 100, 1, BLK, { name: "Hairline" }),
    ], "Anna says this at every all-hands. It's the closest thing we have to a motto."));
    P.push(SL(BG, [
      chrome(9),
      s("In numbers", 160, 180, 800, { size: 80, ls: -2 }),
      [["12", "people in the studio"], ["4", "days a week in the office"], ["1", "buddy for your first month"]].map(([n1, l1], i) => { const x = 160 + i * 540; return [R(x, 400, 480, 1, BLK, { name: "Hairline" }), s(n1, x, 430, 480, { size: 240, lh: 1, ls: -8 }), m(l1, x, 700, 480, { size: 22, color: BLK })]; }),
    ], "Small numbers on purpose. We stay small so everyone knows everyone."));
    P.push(SL(BG, [
      chrome(10),
      s("Questions?\nAsk anytime.", 160, 260, 1200, { size: 130, lh: 1.05, ls: -4 }),
      R(160, 640, 1600, 1, BLK, { name: "Hairline" }),
      [["People team", "hello@fieldnote.studio"], ["Your buddy", "leo@fieldnote.studio"], ["Handbook", "fieldnote.studio/handbook"]].map(([l1, v1], i) => flow(680, m(l1, 160 + i * 540, 0, 500, { size: 20 }), 8, s(v1, 160 + i * 540, 0, 500, { size: 28 }))),
    ], "End here. Remind them the handbook has everything, and Leo is one message away."));
    return P;
  });

  /* ───────────── 10. Botanical · café business plan ───────────── */
  deck("botanical-cafe", "Botanical café business plan", "business plan cafe coffee shop startup botanical plants green nature", () => {
    const CREAM = "#f3eee4", SAGE = "#9cb09a", DEEP = "#2e4a3b", TERRA = "#b8603f", BLUSH = "#ecd2c3", SAND = "#e6dccb";
    const s = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "serif", color: DEEP, ...o });
    const a = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: DEEP, ...o });
    const cap = (txt, x, y, w, o = {}) => a(txt.toUpperCase(), x, y, w, { size: 20, bold: true, ls: 4, color: TERRA, ...o });
    const sprig = (x, y, w, rot = 0, c1 = SAGE) => E("deco-sprig", x, y, w, { c1, c2: DEEP, rot });
    const P = [];
    P.push(SL(CREAM, [
      R(1190, 110, 620, 880, "none", { stroke: SAGE, sw: 3, radius: 310, name: "Arch outline" }),
      F(1220, 140, 560, 820, { shape: "rounded", radius: 280, name: "Arch photo" }),
      sprig(1030, 700, 220, -20), sprig(1700, 80, 180, 30),
      flow(240, cap("Business plan · 2027", 160, 0, 800), 24, s("Greenhouse\nCafé", 160, 0, 960, { size: 150, lh: 1 }), 30,
        s("Coffee, plants and slow mornings in the old glasshouse on Mill Lane.", 160, 0, 800, { size: 40, italic: true, lh: 1.3 })),
      a("Prepared by Ellie Moss & Tom Avery", 160, 880, 800, { size: 24, color: "#4a5c4f" }),
    ], "Thank you for coming. We want to turn the old glasshouse on Mill Lane into a café full of plants."));
    const ag = [["The idea", "A café inside a greenhouse"], ["The market", "Who will come, and how often"], ["The numbers", "Visitors, costs and break-even"], ["The plan", "From lease to grand opening"], ["The team", "Who makes it happen"]];
    P.push(SL(SAND, [
      R(120, 120, 600, 840, DEEP, { radius: 300, name: "Arch" }),
      s("What's\ninside", 120, 380, 600, { size: 100, italic: true, color: CREAM, align: "center", lh: 1.05 }),
      sprig(320, 160, 200, 0, SAGE),
      ag.map(([t1, d1], i) => { const ry = 170 + i * 156; return [E("icon-leaf", 860, ry + 6, 56, { c1: SAGE, c2: DEEP }), s(t1, 950, ry, 820, { size: 46 }), a(d1, 950, ry + 62, 820, { size: 26, color: "#4a5c4f" }), i < 4 ? R(950, ry + 122, 820, 1, "#c9bda8", { name: "Divider" }) : null]; }),
    ], "Five short chapters. We'll spend most time on the numbers."));
    P.push(SL(DEEP, [
      sprig(1400, 140, 380, 20, SAGE), sprig(140, 700, 260, -30, "#6f8f74"),
      s("Chapter one", 160, 340, 1000, { size: 44, italic: true, color: SAGE }),
      s("The idea", 160, 410, 1300, { size: 160, color: CREAM, lh: 1 }),
      R(160, 620, 120, 3, TERRA, { name: "Rule" }),
      a("Why a greenhouse, and why now.", 160, 660, 1000, { size: 32, color: "#cfdccf" }),
    ], "Chapter one: the idea, and why this building is the right place for it."));
    const h4 = flow(170, cap("The idea", 860, 0, 900), 20, s("A café inside a greenhouse", 860, 0, 900, { size: 80, lh: 1.05 }), 30,
      a("The Mill Lane glasshouse has stood empty for six years. We will restore it, fill it with plants and serve coffee, cake and simple lunches under the glass.", 860, 0, 880, { size: 30, lh: 1.5, color: "#3e5446" }));
    P.push(SL(CREAM, [
      F(160, 140, 560, 800, { shape: "rounded", radius: 280, name: "Arch photo" }),
      sprig(600, 820, 180, 15),
      h4,
      bullets(860, after(h4, 40), 880, ["120 seats among the plants", "A plant shop by the door", "Evening workshops twice a week"], { size: 30, color: DEEP, icon: "icon-leaf", mc: SAGE, c2: DEEP, md: 34, gap: 18 }),
    ], "Three parts to the business: the café, a small plant shop and evening workshops."));
    P.push(SL(CREAM, [
      flow(150, cap("The numbers", 160, 0, 600), 20, s("Projected visitors per month", 160, 0, 560, { size: 70, lh: 1.05 }), 30,
        a("Based on footfall counts on Mill Lane and two similar cafés. Summer peaks with the garden open.", 160, 0, 520, { size: 28, lh: 1.5, color: "#3e5446" })),
      barsV(800, 140, 1000, 820, [["Apr", 3.2], ["May", 4.1], ["Jun", 5.6], ["Jul", 6.4], ["Aug", 6.1], ["Sep", 4.8]], { fill: [SAGE, SAGE, TERRA, TERRA, TERRA, SAGE], radius: 40, bar: 0.6, family: "sans", vf: "serif", vs: 40, ls: 26, vc: DEEP, lc: "#4a5c4f", fmt: (v) => v + "k", axis: "#c9bda8", aw: 2 }),
    ], "Terracotta bars are the summer months, when the garden seating opens."));
    P.push(SL(CREAM, [
      flow(150, cap("The plan", 160, 0, 600), 20, s("From lease to opening", 160, 0, 560, { size: 70, lh: 1.05 })),
      F(160, 480, 420, 460, { shape: "rounded", radius: 210, name: "Arch photo" }),
      tlV(1040, 140, 820, [["February", "Lease signed", "Ten-year lease with the council."], ["April", "Glasshouse restored", "New glass, heating and a kitchen."], ["June", "Soft opening", "Friends, family and neighbours."], ["July", "Grand opening weekend", "Live music and a plant swap."], ["September", "Workshops begin", "Pottery, terrariums and botany."]],
        { d: 26, dot: SAGE, ring: DEEP, rw: 2, line: SAGE, lw: 2, wf: "serif", wi: true, wb: false, ws: 32, wc: TERRA, ww: 240, tf: "serif", ts: 36, tb: false, tc: DEEP, ds: 24, dc: "#4a5c4f", tw: 700 }),
    ], "Five steps over eight months. The big risk is the glass restoration, so it comes first."));
    P.push(SL(BLUSH, [
      flow(130, cap("The team", 160, 0, 600), 16, s("The people behind it", 160, 0, 1400, { size: 80 })),
      team(160, 400, 1600, [["Ellie Moss", "Head barista, 12 years"], ["Tom Avery", "Gardener & plant buyer"], ["Rina Das", "Chef, ex-Hartwell's"], ["Sam Ortiz", "Finance & bookings"]],
        { d: 250, ring: SAGE, rg: 14, rw: 3, nf: "serif", ns: 40, nb: false, nc: DEEP, rs: 24, rc: "#6b5547", gap: 36 }),
      sprig(1680, 120, 160, 25),
    ], "Ellie and Tom are the founders. Rina joins as chef from day one."));
    P.push(SL(SAGE, [
      E("deco-flower", 180, 160, 180, { c1: BLUSH, c2: TERRA }), E("deco-flower", 1560, 720, 200, { c1: CREAM, c2: TERRA }),
      stackMid(520, 40, s("“The best cafés feel like a garden you're allowed to linger in.”", 360, 0, 1200, { size: 72, italic: true, align: "center", lh: 1.2 }), a("ELLIE MOSS, CO-FOUNDER", 360, 0, 1200, { size: 22, bold: true, ls: 4, align: "center" })),
    ], "This is the feeling we're designing for: somewhere people stay."));
    P.push(SL(CREAM, [
      flow(130, cap("At a glance", 160, 0, 600), 16, s("Key numbers", 160, 0, 1400, { size: 80 })),
      [["120", "seats", "#5f7d64"], ["$410k", "start-up budget", TERRA], ["18 mo", "to break even", DEEP]].map(([n1, l1, col], i) => {
        const x = 160 + i * 560;
        return [R(x, 320, 480, 660, col, { radius: 240, name: "Arch" }), stackMid(680, 10, s(n1, x, 0, 480, { size: 120, color: CREAM, align: "center", lh: 1 }), a(l1, x, 0, 480, { size: 30, color: CREAM, align: "center" }))];
      }),
    ], "Seats, budget and payback. The budget includes a 15 percent buffer for the glass."));
    P.push(SL(DEEP, [
      sprig(1380, 600, 420, -10, SAGE), sprig(1580, 120, 220, 35, "#6f8f74"),
      s("Thank you", 160, 260, 1100, { size: 170, italic: true, color: CREAM, lh: 1 }),
      R(160, 500, 120, 3, TERRA, { name: "Rule" }),
      [["Email", "hello@greenhousecafe.co"], ["Phone", "+44 113 496 0752"], ["Visit", "The Glasshouse, Mill Lane"]].map(([l1, v1], i) => flow(560 + i * 110, cap(l1, 160, 0, 600, { color: SAGE }), 6, a(v1, 160, 0, 900, { size: 34, color: CREAM }))),
    ], "Thank everyone and invite them to the site visit next Saturday."));
    return P;
  });

  /* ───────────── 11. Neon on black · sales review ───────────── */
  deck("neon-sales", "Neon sales review", "sales review annual results revenue gaming neon dark glow", () => {
    const BG = "#07060d", MAG = "#ff2fd1", CYAN = "#1ff0ff", LIME = "#b8ff3b", VIO = "#8c5cff", TXT = "#f5f3ff", MUTE = "#b3aed0";
    const NEON = [CYAN, MAG, LIME, VIO];
    const glow = (c1, b = 26) => ({ x: 0, y: 0, blur: b, color: c1, opacity: 0.95 });
    const n = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", bold: true, italic: true, color: TXT, ...o });
    const b = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: MUTE, ...o });
    const m = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: MUTE, ...o });
    const box = (x, y, w, h, c1, sw = 3) => R(x, y, w, h, "none", { stroke: c1, sw, radius: 18, name: "Neon box" });
    const floor = (y0 = 860) => [
      ...[0, 18, 42, 74, 116, 168].map((d, i) => R(0, y0 + d + 30, 1920, 2, VIO, { op: 0.3 + i * 0.12, name: "Floor line" })),
      ...[-3, -2, -1, 0, 1, 2, 3].map((q) => { const x1 = 960 + q * 70, x2 = 960 + q * 305, y1 = y0 + 30, y2 = 1080, len = Math.hypot(x2 - x1, y2 - y1); return R((x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - 1, len, 2, VIO, { rot: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, op: 0.6, name: "Floor line" }); }),
    ].map(lock);
    const P = [];
    P.push(SL(BG, [
      floor(),
      m("ARCADE AUDIO  //  FY 2026", 200, 200, 900, { size: 28, color: CYAN }),
      n("SALES\nREVIEW", 200, 260, 1000, { size: 170, lh: 0.95, shadow: glow(MAG) }),
      n("2026", 200, 600, 600, { size: 120, color: CYAN, shadow: glow(CYAN) }),
      b("Annual sales review  ·  presented 20 January 2027", 200, 770, 900, { size: 30 }),
      box(1250, 230, 480, 560, CYAN, 3),
      F(1220, 200, 480, 560, { name: "Product photo", border: { width: 4, color: MAG } }),
    ], "Welcome to the 2026 sales review. Short version: our best year ever, led by headsets."));
    const ag = [["Year in review", "Revenue, units and margin"], ["Product lines", "What sold and what stalled"], ["Regions", "Where we grew fastest"], ["The team", "Who made it happen"], ["Next year", "Targets for 2027"]];
    P.push(SL(BG, [
      n("GAME PLAN", 160, 120, 1200, { size: 96, shadow: glow(VIO, 20) }),
      ag.map(([t1, d1], i) => {
        const x = i < 3 ? 160 : 1000, y = 320 + (i % 3) * 210;
        return [T(String(i + 1).padStart(2, "0"), x, y, 200, { family: "sans", bold: true, italic: true, size: 120, lh: 1, color: BG, outline: { width: 2, color: NEON[i % 4] }, name: "Number " + (i + 1) }), flow(y + 14, n(t1, x + 220, 0, 560, { size: 46 }), 6, b(d1, x + 220, 0, 560, { size: 28 }))];
      }),
      box(1000, 760, 760, 140, LIME, 3), mid(m("> Q&A after the last slide", 1000, 0, 760, { size: 32, color: LIME, align: "center" }), 830),
    ], "Five parts. We keep fifteen minutes for questions at the end."));
    P.push(SL(BG, [
      T("01", 1060, 180, 740, { family: "sans", bold: true, italic: true, size: 520, lh: 1, align: "right", color: BG, outline: { width: 4, color: CYAN }, shadow: glow(CYAN, 30), name: "Watermark 01" }),
      m("LEVEL 01", 160, 330, 600, { size: 34, color: LIME, shadow: glow(LIME, 14) }),
      n("The year\nin sales", 160, 390, 860, { size: 150, lh: 0.95, shadow: glow(MAG) }),
      b("Revenue, units and margin for FY 2026", 160, 720, 900, { size: 34 }),
    ], "Level one: the headline numbers for the year."));
    const h4 = flow(170, m("// HIGHLIGHT", 160, 0, 800, { size: 26, color: CYAN }), 16, n("Headsets carried the year", 160, 0, 860, { size: 80, lh: 1.05, shadow: glow(VIO, 18) }), 30,
      b("The Pulse X headset launched in March and sold out twice. It brought in 42% of all revenue and pulled keyboard sales up with it.", 160, 0, 840, { size: 30, lh: 1.45 }));
    P.push(SL(BG, [
      h4,
      bullets(160, after(h4, 40), 840, ["Pulse X: 214,000 units sold", "Bundles lifted the average order by 18%", "Returns down to 2.1%"], { size: 30, color: TXT, marker: "square", mc: [CYAN, MAG, LIME], md: 16, gap: 18 }),
      box(1130, 210, 640, 700, MAG, 3),
      F(1100, 180, 640, 700, { name: "Photo", border: { width: 4, color: CYAN } }),
    ], "Pulse X is the story of the year. Show the unboxing photo here."));
    P.push(SL(BG, [
      n("REVENUE BY PRODUCT LINE", 160, 120, 1600, { size: 72, shadow: glow(CYAN, 16) }),
      m("FY 2026, $ millions", 160, 220, 800, { size: 28, color: CYAN }),
      barsH(160, 320, 1600, 640, [["Headsets", 18.4], ["Keyboards", 9.7], ["Mice", 7.2], ["Speakers", 4.9], ["Accessories", 3.1]], { lw: 300, vw: 180, fill: [CYAN, MAG, LIME, VIO, CYAN], track: "#16122a", radius: 8, bar: 0.42, ls: 34, lb: true, lc: TXT, vf: "mono", vs: 34, vc: [CYAN, MAG, LIME, VIO, CYAN], fmt: (v) => "$" + v.toFixed(1) + "M" }),
    ], "Headsets are nearly double the next line. Accessories are small but growing fast."));
    P.push(SL(BG, [
      n("THE YEAR, QUARTER BY QUARTER", 160, 120, 1600, { size: 72, shadow: glow(MAG, 16) }),
      tlH(160, 580, 1600, [["Q1", "Spring launch", "Pulse X ships to 30 countries."], ["Q2", "Esports deal", "Official audio partner of the Nova League."], ["Q3", "Back to school", "Record month in August."], ["Q4", "Holiday peak", "38% of the year's sales in ten weeks."]],
        { d: 100, dot: BG, ring: NEON, rw: 5, line: VIO, lw: 3, ws: 56, wf: "mono", wc: NEON, ts: 50, tc: TXT, ds: 32, dc: MUTE, tg: 36 }),
    ], "Each quarter had one big moment. Q4 alone brought in 38 percent of the year."));
    P.push(SL(BG, [
      n("PLAYER ONE: THE TEAM", 160, 120, 1600, { size: 72, shadow: glow(LIME, 16) }),
      team(160, 360, 1600, [["Jade Moreno", "VP Sales"], ["Kofi Mensah", "Retail partners"], ["Lin Zhao", "Online store"], ["Erik Lund", "Esports & events"]],
        { d: 270, ring: NEON, rg: 14, rw: 5, ns: 38, ni: true, nc: TXT, rf: "mono", rs: 24, rc: NEON, gap: 40 }),
    ], "Four leads, each with a record year in their channel."));
    P.push(SL(BG, [
      box(240, 200, 1440, 680, MAG, 4), box(264, 224, 1392, 632, VIO, 2),
      stackMid(540, 44, n("“We didn't just sell headsets. We sold the sound of winning.”", 340, 0, 1240, { size: 72, align: "center", lh: 1.2, shadow: glow(MAG, 20) }), m("Jade Moreno, VP Sales", 340, 0, 1240, { size: 30, color: CYAN, align: "center" })),
    ], "Jade's line from the partner summit. It became our 2027 campaign line."));
    P.push(SL(BG, [
      n("HIGH SCORES", 160, 120, 1600, { size: 72, shadow: glow(CYAN, 16) }),
      [["$43.3M", "revenue, up from $33.1M"], ["+31%", "growth on 2025"], ["612k", "units sold"], ["48", "countries with sales"]].map(([n1, l1], i) => {
        const x = 160 + i * 410;
        return [R(x, 400, 370, 4, NEON[i], { name: "Neon line" }), n(n1, x, 440, 370, { size: 96, color: NEON[i], shadow: glow(NEON[i], 22) }), b(l1, x, 580, 370, { size: 30, color: TXT, lh: 1.35 }), box(x, 720, 370, 6, NEON[i], 2)];
      }),
    ], "Four high scores to beat next year."));
    P.push(SL(BG, [
      floor(),
      n("THANK YOU", 160, 240, 1600, { size: 190, align: "center", shadow: glow(MAG) }),
      m("GG  //  see you at the 2027 kickoff", 160, 500, 1600, { size: 34, color: CYAN, align: "center" }),
      b("jade.moreno@arcadeaudio.gg   ·   arcadeaudio.gg/investors", 160, 600, 1600, { size: 32, color: TXT, align: "center" }),
    ], "Thank everyone and open the floor for questions."));
    return P;
  });

  /* ───────────── 12. Pastel education · maths lesson ───────────── */
  deck("pastel-fractions", "Pastel fractions lesson", "school lesson maths math fractions class teacher kids education pastel", () => {
    const BG = "#fffaf3", PINK = "#ffd9e4", MINT = "#cdf3e1", LAV = "#e3d9ff", LEM = "#fff1b8", SKY = "#d3ecff", INK = "#2d2a4a", ACC = "#d63c6b", ACC2 = "#5b4bd6", SOFT = "#55526f";
    const c = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "calibri", color: INK, ...o });
    const card = (x, y, w, h, col) => R(x, y, w, h, col, { radius: 36, name: "Card" });
    const fbar = (x, y, w, h, parts, filled, col) => Array.from({ length: parts }, (_, i) => R(x + (w / parts) * i, y, w / parts, h, i < filled ? col : WHITE, { stroke: INK, sw: 4, name: "Fraction part" }));
    const P = [];
    P.push(SL(LEM, [
      c("Maths · Grade 4 · Lesson 5", 160, 160, 480, { size: 28, bold: true, color: WHITE, bg: { color: ACC2, radius: 1, pad: 0.6 } }),
      c("Fractions\nMade Easy", 160, 260, 900, { size: 150, bold: true, lh: 1 }),
      c("Sharing things fairly, one piece at a time.", 160, 600, 820, { size: 40, color: SOFT }),
      fbar(160, 760, 640, 100, 4, 3, ACC), mid(c("= 3/4", 830, 0, 240, { size: 64, bold: true, color: ACC }), 810),
      C(1180, 180, 600, 600, PINK, { name: "Circle" }),
      F(1240, 240, 480, 480, { shape: "rounded", radius: 60, name: "Photo", border: { width: 10, color: WHITE } }),
      E("deco-sparkle", 1700, 120, 110, { c1: ACC2 }), E("shape-star", 1140, 760, 130, { c1: "#ffb020" }),
    ], "Hello class! Today we find out what fractions are, and why they help us share fairly."));
    const ag = [["Learn", "What a fraction is", "icon-idea", PINK], ["Explore", "Fraction bars and pizzas", "icon-search", MINT], ["Practise", "Ten questions in pairs", "icon-pencil", LAV], ["Play", "The fraction match game", "icon-star", SKY]];
    P.push(SL(BG, [
      c("Today we will…", 160, 100, 1400, { size: 90, bold: true }),
      ag.map(([t1, d1, ic, col], i) => { const x = 160 + i * 410; return [card(x, 290, 370, 520, col), C(x + 40, 330, 130, 130, WHITE, { name: "Icon circle" }), E(ic, x + 72, 362, 66, { c1: ACC2 }), flow(510, c("Step " + (i + 1), x + 40, 0, 290, { size: 28, bold: true, color: ACC }), 10, c(t1, x + 40, 0, 290, { size: 48, bold: true }), 14, c(d1, x + 40, 0, 290, { size: 32, color: SOFT, lh: 1.3 }))]; }),
      c("Today's goal: spot a fraction anywhere in the room!", 160, 880, 1000, { size: 34, bold: true, color: WHITE, bg: { color: ACC, radius: 1, pad: 0.6 } }),
    ], "Four steps today. Ask the class which step they think will be the most fun."));
    P.push(SL(MINT, [
      C(160, 240, 600, 600, WHITE, { name: "Circle" }),
      mid(c("1", 160, 0, 600, { size: 360, bold: true, color: ACC2, align: "center", lh: 1 }), 540),
      c("Part 1", 880, 360, 900, { size: 44, bold: true, color: ACC }),
      c("What is a\nfraction?", 880, 420, 920, { size: 130, bold: true, lh: 1 }),
      fbar(880, 740, 480, 70, 2, 1, PINK), E("deco-sparkle", 1640, 160, 120, { c1: ACC2 }),
    ], "Part one: the big idea. A fraction is just a way of naming part of something."));
    P.push(SL(BG, [
      c("A fraction is part of a whole", 160, 100, 1600, { size: 80, bold: true }),
      c("The bottom number tells us how many equal parts the whole is cut into. The top number tells us how many of those parts we have.", 160, 250, 820, { size: 34, lh: 1.4, color: SOFT }),
      fbar(160, 500, 760, 120, 4, 3, PINK),
      c("3", 160, 680, 120, { size: 96, bold: true, color: ACC, align: "center", lh: 1 }), R(180, 788, 80, 8, INK, { radius: 4, name: "Fraction line" }), c("4", 160, 806, 120, { size: 96, bold: true, color: ACC2, align: "center", lh: 1 }),
      mid(c("← parts we have", 320, 0, 600, { size: 36, bold: true }), 728), mid(c("← equal parts in the whole", 320, 0, 600, { size: 36, bold: true }), 854),
      F(1100, 250, 660, 560, { shape: "rounded", radius: 40, name: "Photo" }),
      c("Can you find a fraction in this photo?", 1100, 840, 660, { size: 32, bold: true, color: ACC2, align: "center" }),
    ], "Point to each part of the bar. Then show a pizza photo and ask how many slices are left."));
    P.push(SL(BG, [
      c("Our class's favourite fruit", 160, 90, 1500, { size: 80, bold: true }),
      c("We asked all 28 students to pick one.", 160, 200, 1000, { size: 34, color: SOFT }),
      barsV(160, 280, 1100, 740, [["Apple", 6], ["Banana", 8], ["Mango", 10], ["Grapes", 4]], { fill: [PINK, LEM, "#ffd2a8", LAV], stroke: INK, sw: 4, radius: 24, bar: 0.6, family: "calibri", vs: 52, ls: 36, lb: true, vc: INK, lc: INK }),
      card(1340, 300, 420, 600, SKY),
      flow(350, c("Question", 1380, 0, 340, { size: 32, bold: true, color: ACC2 }), 12, c("What fraction of the class chose mango?", 1380, 0, 340, { size: 44, bold: true, lh: 1.2 })),
      c("Answer: 10/28", 1380, 790, 340, { size: 38, bold: true, color: ACC }),
    ], "Let pairs work out the mango question before you reveal the answer."));
    P.push(SL(BG, [
      c("Lesson steps", 160, 100, 1500, { size: 90, bold: true }),
      c("45 minutes, five steps", 160, 220, 1000, { size: 34, color: SOFT }),
      tlH(160, 560, 1600, [["5 min", "Warm-up", "Fraction of the day"], ["10 min", "Explore", "Bars and pizzas"], ["15 min", "Practise", "Ten questions in pairs"], ["10 min", "Game", "Fraction match"], ["5 min", "Exit ticket", "One question to finish"]],
        { d: 120, dot: [PINK, MINT, LEM, SKY, LAV], ring: INK, rw: 4, num: true, nc: INK, ns: 50, line: INK, lw: 4, family: "calibri", ws: 36, wc: ACC2, ts: 46, tc: INK, ds: 32, dc: SOFT, tg: 30 }),
      [[5, PINK], [10, MINT], [15, LEM], [10, SKY], [5, LAV]].reduce((acc, [mins, col]) => { const x = acc.x, w = (1600 * mins) / 45; acc.out.push(R(x, 900, w, 56, col, { stroke: INK, sw: 3, name: "Time block" })); acc.x += w; return acc; }, { x: 160, out: [] }).out,
      c("45 minutes", 160, 970, 400, { size: 26, bold: true, color: SOFT }),
    ], "Show the plan so students know what's coming. Keep an eye on the clock for the game."));
    P.push(SL(LAV, [
      c("Your helpers today", 160, 100, 1500, { size: 90, bold: true }),
      team(160, 320, 1600, [["Mrs. Patel", "Class teacher"], ["Mr. Lee", "Teaching assistant"], ["Ava (Grade 6)", "Maths buddy"]],
        { d: 320, border: { width: 14, color: [PINK, LEM, SKY] }, family: "calibri", ns: 48, nc: INK, rs: 32, rc: SOFT, gap: 34 }),
    ], "Introduce the helpers. Students can ask any of them for help during practice."));
    P.push(SL(SKY, [
      R(260, 160, 1400, 560, WHITE, { radius: 120, name: "Speech bubble" }), S("triangle", 500, 690, 150, 130, WHITE, { rot: 200, name: "Bubble tail" }),
      mid(c("“Mistakes help our brains grow!”", 340, 0, 1240, { size: 100, bold: true, align: "center", color: ACC2, lh: 1.1 }), 440),
      c("Our class motto", 760, 860, 700, { size: 44, bold: true }),
      E("face-happy", 1620, 760, 180),
    ], "Say the motto together. Wrong answers today are part of learning."));
    P.push(SL(BG, [
      c("Fraction facts", 160, 100, 1500, { size: 90, bold: true }),
      [["1/2 = 2/4", "Same amount!", PINK, [[2, 1], [4, 2]]], ["4/4 = 1", "A whole!", MINT, [[4, 4]]], ["1/3 < 1/2", "More parts, smaller pieces!", LAV, [[3, 1], [2, 1]]]].map(([eq, lab, col, bars], i) => {
        const x = 160 + i * 540;
        return [card(x, 270, 500, 680, col), c(eq, x + 40, 320, 420, { size: 80, bold: true, align: "center" }), bars.map(([p, f], j) => fbar(x + 60, 470 + j * 110, 380, 76, p, f, ACC2)), c(lab, x + 40, 760, 420, { size: 38, bold: true, align: "center", color: ACC2, lh: 1.2 })];
      }),
    ], "Three facts to remember. Ask a student to explain why one third is smaller than one half."));
    P.push(SL(LEM, [
      c("Great job,\nmathematicians!", 160, 200, 1200, { size: 130, bold: true, lh: 1.05 }),
      c("Homework: fraction worksheet, page 12", 160, 540, 780, { size: 40, bold: true, color: WHITE, bg: { color: ACC2, radius: 1, pad: 0.6 } }),
      c("Questions from home? mrs.patel@brookfield.school", 160, 700, 1200, { size: 36, color: SOFT }),
      E("deco-stars", 1440, 140, 300, { c1: ACC2 }), E("face-star-eyes", 1480, 600, 260), E("shape-star", 1300, 420, 120, { c1: "#ffb020" }),
    ], "Praise the effort, hand out the worksheet and remind them it's due on Monday."));
    return P;
  });

  /* ───────────── 13. Construction / industrial · project update ───────────── */
  deck("industrial-bridge", "Construction project update", "construction project update site engineering bridge industrial safety report", () => {
    const YEL = "#ffc20e", ASPH = "#1b1b1b", CONC = "#d9d6cf", STEEL = "#5a6066", DARK = "#2a2a2a", ORG = "#c2410c", OK = "#1f7a3a";
    const g = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", bold: true, color: ASPH, ls: 1, ...o });
    const m = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: ASPH, ...o });
    const body = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: "#333333", lh: 1.45, ...o });
    const hazard = (y, h = 44) => [R(0, y, 1920, h, YEL, { name: "Hazard band" }), ...Array.from({ length: 22 }, (_, i) => E("shape-parallelogram", i * h * 2 + 6, y, h * 1.3, { h, c1: ASPH }))].map(lock);
    const rivets = (x, y, n, gap, col = "#8b9198") => Array.from({ length: n }, (_, i) => C(x, y + i * gap, 16, 16, col, { name: "Rivet" }));
    const P = [];
    P.push(SL(ASPH, [
      hazard(0), hazard(1036),
      m("PROJECT UPDATE  ·  WEEK 32", 120, 150, 900, { size: 30, color: YEL }),
      g("RIVERSIDE\nBRIDGE", 120, 210, 1000, { size: 150, color: YEL, lh: 0.95 }),
      g("Steering group report  ·  8 August 2026", 120, 530, 900, { size: 36, bold: false, color: WHITE }),
      m("PHASE 2 OF 4: DECK", 120, 760, 460, { size: 32, bold: true, bg: { color: YEL, radius: 0.1, pad: 0.5 } }),
      F(1160, 150, 640, 760, { name: "Site photo", border: { width: 10, color: YEL } }),
    ], "Good morning. Week 32 update for the Riverside Bridge: we are on schedule and the deck pour is complete."));
    const ag = [["SITE STATUS", "Where the build stands"], ["PROGRESS", "Concrete, steel and schedule"], ["PHASES", "What comes next"], ["SAFETY", "Incidents and near misses"], ["DECISIONS", "What we need from the group"]];
    P.push(SL(CONC, [
      R(120, 0, 70, 1080, STEEL, { name: "Steel beam" }), rivets(147, 40, 16, 66),
      g("TODAY'S AGENDA", 280, 110, 1400, { size: 80 }),
      ag.map(([t1, d1], i) => { const ry = 270 + i * 146; return [R(280, ry, 120, 96, YEL, { name: "Tag" }), mid(m(String(i + 1).padStart(2, "0"), 280, 0, 120, { size: 44, bold: true, align: "center" }), ry + 48), g(t1, 440, ry + 4, 860, { size: 44 }), m(d1, 440, ry + 60, 860, { size: 24, color: "#3a3a3a" })]; }),
      R(1360, 270, 440, 680, ASPH, { name: "Status panel" }), R(1360, 270, 440, 14, YEL, { name: "Panel top" }),
      flow(330, m("SITE STATUS", 1400, 0, 360, { size: 24, color: YEL }), 12, g("ON TRACK", 1400, 0, 360, { size: 64, color: WHITE }), 40,
        m("SAFETY    GREEN\nSCHEDULE  GREEN\nBUDGET    AMBER", 1400, 0, 360, { size: 28, color: WHITE, lh: 1.8 }), 50,
        R(1400, 0, 360, 2, "#555555", { name: "Rule" }), 30, m("NEXT MILESTONE", 1400, 0, 360, { size: 24, color: YEL }), 12, g("Deck curing\nsigned off 22 Aug", 1400, 0, 360, { size: 34, color: WHITE, lh: 1.2 })),
    ], "Five items. The decision we need today is on the budget line, item five."));
    P.push(SL(YEL, [
      g("01", 120, 120, 900, { size: 400, lh: 0.9 }),
      g("SITE STATUS", 120, 560, 1600, { size: 140 }),
      m("Where the build stands at week 32", 120, 740, 1200, { size: 36 }),
      Array.from({ length: 22 }, (_, i) => lock(E("shape-parallelogram", i * 88 + 6, 980, 57, { h: 44, c1: ASPH }))),
    ], "Section one: where the build stands this week."));
    const h4 = flow(140, m("// UPDATE 32.1", 120, 0, 800, { size: 26, color: ORG, bold: true }), 16, g("DECK POUR COMPLETE", 120, 0, 900, { size: 80 }), 30,
      body("All four spans of the bridge deck were poured between 28 July and 6 August, two days ahead of plan. Curing checks are on track.", 120, 0, 880, { size: 32 }));
    P.push(SL(CONC, [
      h4,
      bullets(120, after(h4, 40), 880, ["1,240 m³ of concrete placed", "Night pours kept river traffic moving", "Test cubes passed at 7 days"], { size: 30, bold: true, color: ASPH, marker: "square", mc: YEL, md: 22, gap: 20 }),
      F(1100, 140, 700, 800, { name: "Site photo", border: { width: 10, color: YEL } }),
      m("PIER 3 · 6 AUGUST", 1130, 860, 340, { size: 22, bold: true, color: YEL, bg: { color: ASPH, radius: 0.1, pad: 0.5 } }),
    ], "Show the photo of the last pour. Thank the night crew."));
    P.push(SL(ASPH, [
      g("CONCRETE POURED", 120, 100, 1400, { size: 80, color: YEL }),
      m("Cubic metres per month, 2026 (August to date)", 120, 200, 1400, { size: 28, color: "#cfcfcf" }),
      barsV(120, 280, 1680, 740, [["MAR", 420], ["APR", 610], ["MAY", 780], ["JUN", 940], ["JUL", 1180], ["AUG", 520]], { fill: [YEL, YEL, YEL, YEL, YEL, STEEL], grid: "#333333", axis: YEL, family: "mono", bar: 0.6, vs: 42, vc: WHITE, ls: 28, lc: "#cfcfcf", fmt: (v) => String(v).replace(/\B(?=(\d{3})+$)/g, ",") }),
    ], "July was the peak with the deck pour. August is grey because it is only eight days in."));
    P.push(SL(CONC, [
      g("BUILD PHASES", 120, 100, 1400, { size: 80 }),
      tlH(120, 580, 1680, [["DONE", "Foundations", "Piles and pile caps, Jan–Mar"], ["DONE", "Piers", "Four river piers, Apr–Jun"], ["NOW", "Deck", "Steel and concrete deck, Jul–Oct"], ["NEXT", "Finishing", "Paving, rails and lights, Nov–Jan"], ["2027", "Opening", "Open to traffic in February"]],
        { marker: "square", d: 100, dot: YEL, ring: ASPH, rw: 6, num: true, nc: ASPH, ns: 44, nf: "mono", line: STEEL, lw: 36, wf: "mono", ws: 32, wc: [OK, OK, ORG, STEEL, STEEL], ts: 46, tc: ASPH, ds: 30, dc: "#3a3a3a", tg: 40 }),
      rivets(140, 572, 1, 0), rivets(1764, 572, 1, 0),
    ], "Two phases done, deck in progress. Opening is still planned for February 2027."));
    P.push(SL(ASPH, [
      g("SITE LEADERSHIP", 120, 100, 1400, { size: 80, color: YEL }),
      team(120, 340, 1680, [["MARCO DIAZ", "Site manager"], ["PRIYA SHAH", "Lead engineer"], ["TOM O'BRIEN", "Safety officer"], ["LENA KOVAC", "Project controls"]],
        { d: 280, ring: YEL, rg: 14, rw: 8, ns: 36, nc: WHITE, rf: "mono", rs: 24, rc: YEL, gap: 40 }),
    ], "The four people to call about the site. Marco is on site every day from 6 am."));
    P.push(SL(YEL, [
      R(240, 180, 1440, 680, WHITE, { stroke: ASPH, sw: 14, radius: 28, name: "Sign" }),
      E("icon-warning", 880, 230, 160, { c1: YEL, c2: ASPH }),
      g("NOBODY GOES HOME HURT.\nCHECK TWICE, LIFT ONCE.", 300, 440, 1320, { size: 76, align: "center", lh: 1.1 }),
      m("SITE RULE NO. 1  ·  MARCO DIAZ, SITE MANAGER", 240, 920, 1440, { size: 30, bold: true, align: "center" }),
    ], "This rule is painted on every gate. Repeat it at every briefing."));
    P.push(SL(ASPH, [
      g("WEEK 32 IN NUMBERS", 120, 100, 1400, { size: 80, color: YEL }),
      [["214", "DAYS WITHOUT A LOST-TIME INCIDENT", 0], ["62%", "OF THE BUILD COMPLETE", 0.62], ["148", "WORKERS ON SITE TODAY", 0], ["58%", "OF THE BUDGET SPENT", 0.58]].map(([n1, l1, pct], i) => {
        const x = 120 + i * 430;
        return [R(x, 280, 390, 600, DARK, { name: "Tile" }), R(x, 280, 390, 12, YEL, { name: "Tile top" }), m(n1, x + 30, 340, 330, { size: 120, bold: true, color: YEL, lh: 1 }), g(l1, x + 30, 500, 330, { size: 28, color: WHITE, lh: 1.3 }),
          pct ? [R(x + 30, 780, 330, 18, "#444444", { name: "Progress track" }), R(x + 30, 780, 330 * pct, 18, YEL, { name: "Progress" })] : R(x + 30, 780, 330, 4, STEEL, { name: "Rule" })];
      }),
    ], "Safety first: 214 days without a lost-time incident. Build progress is slightly ahead of spend."));
    P.push(SL(ASPH, [
      hazard(0), hazard(1036),
      g("QUESTIONS?", 120, 200, 1600, { size: 160, color: YEL }),
      [["SITE OFFICE", "Gate 3, River Road"], ["EMAIL", "site@riversidebridge.org"], ["PHONE", "+44 20 7946 0321"]].map(([l1, v1], i) => flow(520, m(l1, 120 + i * 580, 0, 540, { size: 24, color: YEL }), 10, g(v1, 120 + i * 580, 0, 540, { size: 34, bold: false, color: WHITE }))),
      m("Next update: week 36 · 5 September 2026", 120, 760, 1400, { size: 28, color: "#cfcfcf" }),
    ], "Open the floor. Next update is in four weeks."));
    return P;
  });

  /* ───────────── 14. Medical clean · programme results ───────────── */
  deck("medical-heart", "Healthy heart programme results", "medical health clinic hospital healthcare results programme heart doctor nurse", () => {
    const TEAL = "#0f8b8d", MINT = "#e8f6f5", NAVY = "#12304a", CORAL = "#e5534b", GREY = "#4f6577";
    const s = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: NAVY, ...o });
    const plus = (x, y, d, col = TEAL) => [R(x + d * 0.36, y, d * 0.28, d, col, { radius: d * 0.06, name: "Plus" }), R(x, y + d * 0.36, d, d * 0.28, col, { radius: d * 0.06, name: "Plus" })];
    const pulse = (x, y, k, col) => {
      const pts = [[0, 0], [120, 0], [145, -22], [170, 0], [210, 0], [240, -100], [272, 70], [300, 0], [380, 0], [405, -18], [430, 0], [560, 0]].map(([px, py]) => [x + px * k, y + py * k]);
      return pts.slice(1).map((p, i) => { const a1 = pts[i], dx = p[0] - a1[0], dy = p[1] - a1[1], len = Math.hypot(dx, dy); return R((a1[0] + p[0]) / 2 - len / 2, (a1[1] + p[1]) / 2 - 3, len, 6, col, { radius: 3, rot: (Math.atan2(dy, dx) * 180) / Math.PI, name: "Pulse line" }); });
    };
    const P = [];
    P.push(SL(WHITE, [
      R(1040, 0, 880, 1080, MINT, { name: "Panel" }),
      F(1160, 160, 640, 640, { shape: "rounded", radius: 40, name: "Photo" }),
      C(1080, 700, 180, 180, WHITE, { name: "Badge" }), E("icon-heart", 1115, 735, 110, { c1: CORAL }),
      flow(220, s("CITY HEALTH CLINIC", 160, 0, 800, { size: 24, bold: true, ls: 4, color: TEAL }), 20, s("Healthy Heart\nProgramme", 160, 0, 860, { size: 110, bold: true, lh: 1.05 }), 30,
        s("12-month results  ·  Community care team", 160, 0, 820, { size: 36, color: GREY })),
      pulse(160, 760, 1.3, TEAL),
      s("Presented 18 November 2026", 160, 900, 700, { size: 24, color: GREY }),
    ], "Thank you for coming. These are the results of our first full year of the Healthy Heart Programme."));
    const ag = [["Programme design", "Who, what and why"], ["Who took part", "1,240 patients from four clinics"], ["Results", "Blood pressure, activity and weight"], ["Patient stories", "In their own words"], ["Next steps", "Scaling to eight clinics"]];
    P.push(SL(WHITE, [
      s("Agenda", 160, 110, 900, { size: 80, bold: true }),
      ag.map(([t1, d1], i) => { const ry = 270 + i * 146; return [C(160, ry, 84, 84, MINT, { name: "Icon circle" }), plus(182, ry + 22, 40), s(t1, 290, ry, 760, { size: 40, bold: true }), s(d1, 290, ry + 52, 760, { size: 26, color: GREY })]; }),
      R(1160, 270, 640, 640, MINT, { radius: 28, name: "Card" }),
      s("Programme at a glance", 1220, 320, 520, { size: 36, bold: true }),
      bullets(1220, 410, 520, ["1,240 patients", "12 months of coaching", "4 community clinics", "6 nurses and coaches"], { size: 32, color: NAVY, icon: "icon-check-circle", mc: TEAL, md: 36, gap: 32 }),
    ], "Five sections. The card on the right is the programme in one glance."));
    P.push(SL(TEAL, [
      plus(1300, 220, 460, "#2a9a9c"),
      s("01", 160, 280, 400, { size: 160, bold: true, color: "#c7ebea" }),
      s("Programme design", 160, 490, 1200, { size: 110, bold: true, color: WHITE }),
      s("How the programme works, and who it was for", 160, 640, 1100, { size: 38, color: "#e0f4f3" }),
      pulse(160, 820, 1.2, WHITE),
    ], "Section one: the design of the programme."));
    const h4 = flow(140, s("WHO TOOK PART", 160, 0, 800, { size: 24, bold: true, ls: 4, color: TEAL }), 16, s("1,240 adults with high blood pressure", 160, 0, 820, { size: 70, bold: true, lh: 1.08 }), 30,
      s("Patients were referred by their family doctor. Most had been told about their blood pressure before but had no plan to bring it down.", 160, 0, 800, { size: 30, color: GREY, lh: 1.45 }));
    P.push(SL(WHITE, [
      h4,
      bullets(160, after(h4, 36), 800, ["Aged 40 to 80", "Readings above 140/90 mmHg", "Four clinics across the city"], { size: 30, color: NAVY, marker: "square", mr: 4, mc: TEAL, md: 16, gap: 16 }),
      F(1100, 140, 700, 760, { shape: "rounded", radius: 32, name: "Photo" }),
      R(1000, 760, 380, 180, WHITE, { radius: 20, stroke: "#cfe3e2", sw: 2, name: "Stat card" }),
      flow(788, s("Average age", 1040, 0, 300, { size: 24, color: GREY }), 4, s("58 years", 1040, 0, 300, { size: 60, bold: true, color: TEAL })),
    ], "Most patients knew their numbers were high but had never had a plan. That is what the programme gave them."));
    P.push(SL(WHITE, [
      s("Patients reaching target blood pressure", 160, 100, 1600, { size: 64, bold: true }),
      s("Share of patients below 140/90 mmHg, by month of the programme", 160, 190, 1600, { size: 30, color: GREY }),
      barsV(160, 270, 1600, 750, [["Start", 18], ["Month 3", 34], ["Month 6", 49], ["Month 9", 58], ["Month 12", 63]], { fill: ["#a8dcda", "#7ccac7", "#4fb6b3", "#239f9c", TEAL], radius: 16, bar: 0.5, grid: "#e6eef0", vs: 46, ls: 30, vc: NAVY, lc: GREY, fmt: (v) => v + "%" }),
    ], "From 18 percent at the start to 63 percent after a year. The biggest gain came in the first six months."));
    P.push(SL(MINT, [
      s("The patient journey", 160, 100, 1600, { size: 80, bold: true }),
      tlH(160, 580, 1600, [["Week 0", "Screening", "Blood pressure, bloods and a chat."], ["Week 1", "Personal plan", "Goals set with a nurse."], ["Weeks 2–12", "Coaching", "Weekly calls and walking groups."], ["Monthly", "Check-ins", "Readings sent from home."], ["Month 12", "Review", "Results and next steps."]],
        { d: 110, dot: WHITE, ring: TEAL, rw: 6, num: true, nc: TEAL, ns: 44, line: TEAL, lw: 4, ws: 32, wc: TEAL, ts: 44, tc: NAVY, ds: 30, dc: GREY, tg: 36 }),
    ], "Walk through one patient's year. The weekly coaching calls were rated the most helpful part."));
    P.push(SL(WHITE, [
      s("The care team", 160, 100, 1600, { size: 80, bold: true }),
      team(160, 320, 1600, [["Dr. Amara Okoye", "Lead physician"], ["Ben Hughes", "Nurse coach"], ["Sofia Ruiz", "Dietitian"], ["Raj Patel", "Data & outcomes"]],
        { d: 280, back: MINT, bx: 24, by: 24, ns: 36, nc: NAVY, rs: 26, rc: TEAL, rb: true, gap: 60 }),
    ], "A small team: one physician, coaches, a dietitian and someone to keep the data honest."));
    P.push(SL(MINT, [
      R(240, 200, 1440, 680, WHITE, { radius: 28, name: "Card" }), R(240, 260, 12, 560, TEAL, { radius: 6, name: "Accent" }),
      E("icon-heart", 320, 290, 90, { c1: CORAL }),
      stackMid(590, 40, s("“For the first time, I understand my numbers. I walk every morning now, and my readings are normal.”", 320, 0, 1280, { size: 56, lh: 1.3 }),
        s("Margaret, 64, programme patient", 320, 0, 1000, { size: 30, bold: true, color: TEAL })),
    ], "Margaret's story is typical: understanding the numbers was the turning point."));
    P.push(SL(WHITE, [
      s("Results at 12 months", 160, 100, 1600, { size: 80, bold: true }),
      [["-11", "mmHg average drop in blood pressure", "icon-heart", CORAL], ["1,240", "patients enrolled", "icon-users", TEAL], ["87%", "stayed to the end", "icon-check-circle", TEAL], ["3×", "more active minutes each week", "icon-clock", TEAL]].map(([n1, l1, ic, col], i) => {
        const x = 160 + i * 410;
        return [R(x, 280, 370, 540, MINT, { radius: 24, name: "Card" }), C(x + 36, 320, 110, 110, WHITE, { name: "Icon circle" }), E(ic, x + 61, 345, 60, { c1: col }), flow(490, s(n1, x + 36, 0, 310, { size: 96, bold: true, color: TEAL, lh: 1 }), 16, s(l1, x + 36, 0, 300, { size: 30, color: NAVY, lh: 1.3 }))];
      }),
    ], "Four results. The 11 point drop is enough to cut stroke risk by about a third."));
    P.push(SL(TEAL, [
      plus(1520, 120, 240, "#2a9a9c"),
      flow(220, s("Thank you", 160, 0, 1200, { size: 140, bold: true, color: WHITE }), 10, s("Questions and discussion", 160, 0, 1000, { size: 40, color: "#e0f4f3" })),
      [["icon-mail", "heart@cityhealthclinic.org"], ["icon-call", "+1 312 555 0148"], ["icon-location", "City Health Clinic, 200 Lake Street"]].map(([ic, v1], i) => [E(ic, 160, 520 + i * 90, 50, { c1: WHITE, c2: TEAL, c3: TEAL }), mid(s(v1, 240, 0, 1000, { size: 34, color: WHITE }), 545 + i * 90)]),
      pulse(1000, 900, 1.4, WHITE),
    ], "Thank the team and the patients who shared their stories."));
    return P;
  });

  /* ───────────── 15. Finance navy + gold · annual review ───────────── */
  deck("finance-annual", "Navy and gold annual review", "finance annual review investment fund investors report wealth navy gold", () => {
    const NAVY = "#0d1b33", NAVY2 = "#15284a", GOLD = "#c8a55a", DGOLD = "#8a6a26", IVORY = "#f6f1e6", SLATE = "#a3aec3", INKN = "#41506b";
    const s = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "cambria", color: IVORY, ...o });
    const a = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "calibri", color: SLATE, ...o });
    const caps = (txt, x, y, w, o = {}) => a(txt.toUpperCase(), x, y, w, { size: 22, bold: true, ls: 5, color: GOLD, ...o });
    const frame2 = (inset = 70) => [R(inset, inset, 1920 - inset * 2, 1080 - inset * 2, "none", { stroke: GOLD, sw: 2, name: "Gold frame" }), R(inset + 16, inset + 16, 1920 - inset * 2 - 32, 1080 - inset * 2 - 32, "none", { stroke: GOLD, sw: 1, op: 0.6, name: "Gold frame" })];
    const dia = (x, y, d = 18, c1 = GOLD) => S("polygon", x, y, d, d, c1, { sides: 4, name: "Diamond" });
    const P = [];
    P.push(SL(NAVY, [
      frame2(), dia(948, 170, 24),
      caps("Meridian Wealth Fund", 160, 240, 1600, { align: "center", ls: 10, size: 26 }),
      s("Annual Review\n2026", 160, 300, 1600, { size: 130, align: "center", lh: 1.05 }),
      R(860, 640, 200, 2, GOLD, { name: "Rule" }),
      a("Presented to investors  ·  20 January 2027", 160, 680, 1600, { size: 32, align: "center" }),
      a("Confidential, for investors only", 160, 890, 1600, { size: 20, align: "center" }),
    ], "Good morning and welcome to the Meridian annual review. 2026 was our strongest year since the fund opened."));
    const ag = [["I", "Market review", "A year of steady recovery"], ["II", "Performance", "Returns against the benchmark"], ["III", "Portfolio", "What we bought and sold"], ["IV", "Outlook", "Our view for 2027"], ["V", "Questions", "Open discussion"]];
    P.push(SL(NAVY, [
      caps("Agenda", 160, 200, 600),
      s("This\nmorning", 160, 250, 600, { size: 100, lh: 1.05 }),
      R(160, 490, 120, 2, GOLD, { name: "Rule" }),
      ag.map(([r1, t1, d1], i) => { const ry = 170 + i * 156; return [s(r1, 880, ry, 120, { size: 52, color: GOLD }), s(t1, 1040, ry, 760, { size: 46 }), a(d1, 1040, ry + 62, 760, { size: 26 }), R(880, ry + 128, 920, 1, "#2c3f63", { name: "Divider" })]; }),
    ], "Five parts, about forty minutes in total, then questions."));
    P.push(SL(IVORY, [
      s("I", 160, 180, 400, { size: 300, color: DGOLD, lh: 1 }),
      s("Market review", 160, 520, 1400, { size: 120, color: NAVY }),
      R(160, 690, 160, 3, GOLD, { name: "Rule" }),
      a("A year of steady recovery across global markets", 160, 730, 1300, { size: 36, color: INKN }),
      dia(1680, 200, 70), R(1714, 300, 2, 600, GOLD, { name: "Line" }),
    ], "Part one: the markets we invested in during 2026."));
    const h4 = flow(150, caps("Market review", 160, 0, 800, { color: DGOLD }), 16, s("A year of steady recovery", 160, 0, 880, { size: 76, color: NAVY }), 30,
      a("Falling inflation and lower interest rates helped both shares and bonds. We stayed fully invested and kept costs low.", 160, 0, 820, { size: 30, color: INKN, lh: 1.5 }));
    const y4 = after(h4, 60);
    P.push(SL(IVORY, [
      h4, R(160, y4 - 20, 820, 1, GOLD, { name: "Rule" }),
      [["+18.2%", "global shares"], ["+4.1%", "global bonds"]].map(([n1, l1], i) => flow(y4 + 20, s(n1, 160 + i * 420, 0, 380, { size: 72, color: NAVY }), 6, a(l1, 160 + i * 420, 0, 380, { size: 26, color: INKN }))),
      R(160, 820, 820, 1, GOLD, { name: "Rule" }),
      s("Our view: diversification did the work in 2026, not market timing.", 160, 850, 820, { size: 32, italic: true, color: NAVY, lh: 1.35 }),
      R(1150, 170, 640, 760, "none", { stroke: GOLD, sw: 2, name: "Gold outline" }),
      F(1120, 140, 640, 760, { name: "Photo", border: { width: 2, color: GOLD } }),
    ], "Both shares and bonds had a good year. The fund captured most of the upside with lower swings."));
    P.push(SL(NAVY, [
      caps("Performance", 160, 120, 800),
      s("Annual returns, net of fees", 160, 160, 1400, { size: 72 }),
      barsV(160, 290, 1600, 720, [["2022", 3.1], ["2023", 6.8], ["2024", 8.2], ["2025", 7.4], ["2026", 9.6]], { fill: ["#3a4e74", "#3a4e74", "#3a4e74", "#3a4e74", GOLD], grid: "#1e3157", axis: GOLD, aw: 2, family: "calibri", vf: "cambria", vb: false, vs: 46, vc: [IVORY, IVORY, IVORY, IVORY, GOLD], ls: 28, lc: SLATE, bar: 0.46, fmt: (v) => "+" + v.toFixed(1) + "%" }),
    ], "Five positive years in a row. 2026 is the best of them at 9.6 percent after fees."));
    P.push(SL(IVORY, [
      caps("Portfolio", 160, 120, 800, { color: DGOLD }),
      s("Key decisions in 2026", 160, 160, 1400, { size: 72, color: NAVY }),
      tlH(160, 600, 1600, [["February", "Infrastructure", "Added 6% in long-term infrastructure bonds."], ["May", "Rebalanced tech", "Trimmed US technology from 22% to 17%."], ["July", "Singapore desk", "Opened to cover Asian markets."], ["October", "Lower fees", "Annual fee cut to 0.42%."]],
        { marker: "diamond", d: 34, dot: GOLD, line: NAVY, lw: 2, full: true, family: "calibri", wf: "cambria", wi: true, wb: false, ws: 50, wc: DGOLD, tf: "cambria", tb: false, ts: 48, tc: NAVY, ds: 30, dc: INKN, tg: 40 }),
    ], "Four decisions. The fee cut in October goes straight to investors' returns."));
    P.push(SL(NAVY, [
      caps("Investment committee", 160, 120, 800),
      s("The people who decide", 160, 160, 1400, { size: 72 }),
      team(160, 360, 1600, [["Eleanor Whitfield", "CHAIR"], ["Rahul Mehta", "CHIEF INVESTMENT OFFICER"], ["Grace Okonkwo", "HEAD OF RISK"], ["Julian Hart", "PORTFOLIO MANAGER"]],
        { d: 260, ring: GOLD, rg: 12, rw: 2, nf: "cambria", ns: 38, nb: false, nc: IVORY, rf: "calibri", rs: 20, rc: GOLD, rls: 3, rb: true, gap: 40 }),
    ], "The committee meets monthly. Grace has a veto on any trade that breaks our risk limits."));
    P.push(SL(NAVY2, [
      frame2(),
      s("“", 200, 160, 260, { size: 320, color: GOLD, lh: 1, name: "Quote mark" }),
      stackMid(560, 40, s("We do not chase the market. We stay patient, keep costs low and let time do the heavy lifting.", 480, 0, 1200, { size: 64, italic: true, lh: 1.3 }),
        R(480, 0, 120, 2, GOLD, { name: "Rule" }), caps("Eleanor Whitfield, Chair", 480, 0, 900)),
    ], "Eleanor's line sums up how we run the fund."));
    P.push(SL(IVORY, [
      caps("At a glance", 160, 120, 800, { color: DGOLD }),
      s("2026 in four numbers", 160, 160, 1400, { size: 72, color: NAVY }),
      [["$4.8B", "assets under management"], ["+9.6%", "net return in 2026"], ["0.42%", "annual management fee"], ["12,500", "investors in 31 countries"]].map(([n1, l1], i) => {
        const x = 160 + i * 410;
        return [dia(x - 8, 372, 18), R(x, 400, 2, 360, GOLD, { name: "Rule" }), s(n1, x + 40, 420, 350, { size: 88, color: NAVY }), a(l1, x + 40, 560, 330, { size: 28, color: INKN, lh: 1.35 })];
      }),
    ], "Four numbers to take away. Assets grew by $600 million, mostly from new investors."));
    P.push(SL(NAVY, [
      frame2(), dia(948, 220, 24),
      s("Thank you", 160, 300, 1600, { size: 140, align: "center" }),
      caps("Investor relations", 160, 540, 1600, { align: "center" }),
      a("ir@meridianwealth.com  ·  +44 20 7946 0958  ·  meridianwealth.com", 160, 600, 1600, { size: 32, color: IVORY, align: "center" }),
    ], "Thank investors and open the floor for questions."));
    return P;
  });

  /* ───────────── 16. Travel postcard · tour plan ───────────── */
  deck("postcard-travel", "Travel postcard tour plan", "travel tour trip itinerary holiday vacation coast postcard tourism", () => {
    const PAPER = "#fbf4e6", RED = "#c62a38", BLUE = "#1f4e9c", TEAL = "#1f7f74", SAND = "#e9c46a", BROWN = "#3d2b1f", SKY = "#d6ecf3", LINEC = "#cbb994";
    const sc = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "serif", italic: true, bold: true, color: RED, ...o });
    const g = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", bold: true, color: BLUE, ...o });
    const m = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: BROWN, ...o });
    const airmail = (y, h = 26) => Array.from({ length: 24 }, (_, i) => lock(E("shape-parallelogram", i * 80 + 4, y, 64, { h, c1: i % 2 ? BLUE : RED })));
    const stamp = (x, y, w, h, col, rot = 0) => [E("frame-scalloped", x, y, w, { h, c1: col, c2: col, c3: WHITE, rot }), F(x + w * 0.16, y + h * 0.17, w * 0.68, h * 0.66, { rot, name: "Stamp photo" })];
    const postmark = (x, y, d, col = BROWN) => [C(x, y, d, d, "none", { stroke: col, sw: 3, op: 0.7, name: "Postmark" }), C(x + d * 0.1, y + d * 0.1, d * 0.8, d * 0.8, "none", { stroke: col, sw: 1.5, op: 0.7, name: "Postmark" }), mid(m("NORTH\nCOAST\n2027", x, 0, d, { size: Math.round(d * 0.12), bold: true, align: "center", color: col, op: 0.8, lh: 1.15 }), y + d / 2)];
    const P = [];
    P.push(SL(PAPER, [
      airmail(30), airmail(1024),
      F(120, 130, 880, 820, { rot: -2, name: "Cover photo", border: { width: 18, color: WHITE } }),
      stamp(1600, 110, 200, 240, RED, 4), postmark(1440, 170, 180),
      sc("Greetings from", 1080, 400, 780, { size: 72 }),
      g("THE NORTHERN\nCOAST", 1080, 500, 800, { size: 86, lh: 0.98, ls: 2 }),
      m("7-day small-group tour\nJune to September 2027", 1080, 720, 760, { size: 26, lh: 1.4 }),
    ], "Welcome! This is our new seven-day tour of the northern coast. Let me take you along the route."));
    const ag = ["The route: seven days, five towns", "Highlights along the cliffs", "When to go", "Meet your guides", "Prices and booking"];
    P.push(SL(PAPER, [
      R(120, 100, 1680, 880, WHITE, { stroke: "#e4d6bb", sw: 2, name: "Postcard back" }),
      R(1080, 180, 2, 720, LINEC, { name: "Divider" }),
      sc("Your trip at a glance", 180, 160, 860, { size: 60 }),
      ag.map((t1, i) => { const ry = 320 + i * 110; return [T(t1, 180, ry, 860, { family: "serif", italic: true, size: 40, color: BROWN, name: t1 }), lock(E("line-dotted", 180, ry + 60, 860, { h: 12, c1: LINEC }))]; }),
      stamp(1560, 150, 180, 220, BLUE, 0), postmark(1380, 190, 170),
      [["To:", "you, the traveller"], ["From:", "Harbour Town"], ["Season:", "June to September"], ["Group:", "12 guests at most"]].map(([l1, v1], i) => [m(l1, 1160, 470 + i * 100, 160, { size: 26, bold: true, color: RED }), T(v1, 1320, 462 + i * 100, 440, { family: "serif", italic: true, size: 34, color: BROWN, name: v1 }), R(1160, 515 + i * 100, 600, 2, LINEC, { name: "Address line" })]),
    ], "Like the back of a postcard: our plan on the left, the trip details on the right."));
    P.push(SL(TEAL, [
      C(1300, 220, 460, 460, "none", { stroke: PAPER, sw: 6, name: "Postmark" }), C(1340, 260, 380, 380, "none", { stroke: PAPER, sw: 2, name: "Postmark" }),
      mid(m("DAY 1–3\nTHE CLIFFS", 1300, 0, 460, { size: 44, bold: true, align: "center", color: PAPER, lh: 1.3 }), 450),
      [0, 1, 2].map((i) => E("line-wavy", 880, 330 + i * 70, 380, { h: 30, c1: PAPER })),
      m("PART ONE", 160, 380, 600, { size: 30, color: PAPER, ls: 4 }),
      sc("The route", 160, 430, 700, { size: 150, color: WHITE }),
      g("Seven days along the wild northern coast", 160, 640, 1000, { size: 36, bold: false, color: PAPER }),
    ], "Part one is the route itself."));
    const h4 = flow(150, m("DAYS 1–3", 160, 0, 800, { size: 28, bold: true, color: RED }), 12, sc("Cliff walks & hidden coves", 160, 0, 820, { size: 80, color: BLUE, lh: 1.05 }), 30,
      T("We start in Harbour Town and follow the coastal path north. Expect seal colonies, quiet beaches and the best fish soup on the coast.", 160, 0, 800, { family: "sans", size: 30, color: BROWN, lh: 1.5 }));
    P.push(SL(PAPER, [
      h4,
      bullets(160, after(h4, 40), 800, ["Easy to moderate walks, 8–12 km a day", "Luggage moved for you each day", "Small family-run inns"], { family: "mono", size: 26, color: BROWN, icon: "icon-location", mc: RED, md: 34, gap: 18 }),
      F(1020, 150, 540, 400, { rot: 4, name: "Postcard photo 1", border: { width: 14, color: WHITE } }),
      F(1220, 520, 560, 420, { rot: -3, name: "Postcard photo 2", border: { width: 14, color: WHITE } }),
    ], "Show both photos: the cliff path and the cove at Kestrel Bay."));
    P.push(SL(SKY, [
      sc("When to go", 160, 100, 900, { size: 56 }),
      g("SUNSHINE HOURS PER DAY", 160, 180, 1300, { size: 64 }),
      barsV(160, 290, 1240, 720, [["JUN", 7.4], ["JUL", 8.1], ["AUG", 7.6], ["SEP", 5.9]], { fill: [SAND, RED, SAND, SAND], stroke: BROWN, sw: 3, radius: 12, family: "mono", vs: 44, vc: BROWN, ls: 32, lc: BROWN, lb: true, bar: 0.56, fmt: (v) => v.toFixed(1) + "h" }),
      E("icon-sun", 1560, 300, 200, { c1: SAND }),
      m("Best month:\nJULY", 1480, 540, 360, { size: 40, bold: true, align: "center", color: BLUE, lh: 1.3 }),
      sc("pack sun cream!", 1480, 700, 360, { size: 40, align: "center", rot: -4 }),
    ], "July is the sunniest month, but September is quieter and still lovely."));
    const stops = [["DAY 1", "Harbour Town", "Welcome dinner by the boats"], ["DAY 2–3", "Cliffside", "Coastal path and seal colony"], ["DAY 4", "Saltmere", "Sea kayaking in the bay"], ["DAY 5–6", "Kestrel Bay", "Hidden coves and a cave walk"], ["DAY 7", "Lighthouse Point", "Sunset farewell picnic"]];
    P.push(SL(PAPER, [
      sc("Seven days, five towns", 160, 100, 1600, { size: 80, color: BLUE }),
      E("line-dashed", 200, 608, 1520, { h: 24, c1: BLUE }),
      stops.map(([d1, t1, x1], i) => { const cx = 200 + i * 380; return [m(d1, cx - 170, 420, 340, { size: 30, bold: true, align: "center", color: RED }), E("icon-location", cx - 45, 500, 90, { c1: RED }), C(cx - 12, 608, 24, 24, BLUE, { name: "Stop" }), flow(680, sc(t1, cx - 170, 0, 340, { size: 48, color: BROWN, align: "center" }), 10, T(x1, cx - 170, 0, 340, { family: "sans", size: 28, color: BROWN, align: "center", lh: 1.35, name: x1 }))]; }),
    ], "Trace the route left to right. Day 4 kayaking is optional; there is a boat trip instead."));
    P.push(SL(PAPER, [
      sc("Your guides", 160, 100, 1600, { size: 80, color: BLUE }),
      team(160, 330, 1600, [["Isla Moreau", "Hiking guide"], ["Callum Reid", "Kayak instructor"], ["Nina Brandt", "Local food expert"]],
        { d: 300, ring: RED, rg: 10, rw: 6, border: { width: 8, color: BLUE }, nf: "serif", ni: true, ns: 48, nc: BROWN, rf: "mono", rs: 26, rc: RED, gap: 40, who: KIND.traveller }),
    ], "Introduce the three guides. Isla has walked this coast for fifteen years."));
    P.push(SL(BLUE, [
      R(260, 170, 1400, 740, PAPER, { rot: -2, name: "Postcard" }),
      stamp(1400, 220, 180, 216, RED, -2), postmark(1230, 260, 160),
      sc("“Wish you were here! The lighthouse at sunset was the best moment of my whole year.”", 340, 470, 900, { size: 58, color: BROWN, rot: -2, lh: 1.25 }),
      m("Jo, guest in 2026", 340, 800, 800, { size: 30, rot: -2, color: RED }),
    ], "Read Jo's postcard out loud. It came in the post after last summer's tour."));
    P.push(SL(PAPER, [
      sc("The tour in numbers", 160, 100, 1600, { size: 80, color: BLUE }),
      [["7", "days", RED], ["5", "towns", BLUE], ["120", "km of coastline", TEAL], ["12", "guests at most", "#b5651d"]].map(([n1, l1, col], i) => {
        const x = 160 + i * 410;
        return [E("frame-scalloped", x, 290, 360, { h: 420, c1: col, c2: col, c3: WHITE }), R(x + 50, 340, 260, 320, col, { name: "Stamp colour" }), mid(g(n1, x + 50, 0, 260, { size: 120, color: WHITE, align: "center", lh: 1 }), 500), m(l1, x, 760, 360, { size: 30, bold: true, align: "center" })];
      }),
    ], "Small groups are the point: never more than twelve guests."));
    P.push(SL(PAPER, [
      airmail(30), airmail(1024),
      sc("Book your seat", 160, 220, 1100, { size: 130, color: BLUE }),
      [["icon-mail", "hello@coastalescapes.travel"], ["icon-call", "+353 1 555 0172"], ["icon-globe", "coastalescapes.travel/north"]].map(([ic, v1], i) => [E(ic, 160, 470 + i * 100, 56, { c1: RED }), mid(m(v1, 250, 0, 900, { size: 34 }), 498 + i * 100)]),
      stamp(1440, 250, 300, 360, RED, 6), postmark(1280, 520, 220),
    ], "Bookings open on 1 March. Early bookings get the window rooms."));
    return P;
  });

  /* ───────────── 17. Kids crayon colours · camp welcome ───────────── */
  deck("crayon-camp", "Crayon summer camp welcome", "kids children summer camp parents welcome school fun crayon colourful", () => {
    const BG = "#fffaf0", RED = "#e23b3b", ORG = "#ea580c", YEL = "#facc15", GRN = "#16a34a", BLU = "#2f6fe0", PUR = "#9333ea", INK = "#1f2937", SOFT = "#4b5563";
    const k2 = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "calibri", bold: true, color: INK, ...o });
    const scribble = (x, y, w, col) => E("line-wavy", x, y, w, { h: 34, c1: col });
    const P = [];
    P.push(SL(BG, [
      E("icon-sun", 1560, 60, 300, { c1: YEL }),
      k2("Sunny Days", 160, 170, 960, { size: 140, color: ORG, lh: 1 }),
      k2("Summer Camp", 160, 320, 960, { size: 140, color: BLU, lh: 1 }),
      scribble(170, 500, 600, GRN),
      k2("Welcome evening for parents  ·  2027", 160, 580, 860, { size: 40, bold: false }),
      E("deco-rainbow", 120, 760, 420),
      F(1080, 330, 600, 500, { rot: 4, name: "Camp photo", border: { width: 14, color: PUR } }),
      E("shape-star", 980, 790, 130, { c1: YEL }), E("deco-sparkle", 1000, 220, 100, { c1: RED }),
    ], "Welcome, parents! Tonight you'll find out what a day at Sunny Days looks like."));
    const ag = [["A day at camp", "From drop-off to pick-up"], ["What to pack", "Lunch, hat and swimsuit"], ["Safety", "Lifeguards and first aid"], ["The counsellors", "Who looks after your child"], ["Your questions", "Ask us anything"]];
    P.push(SL(BG, [
      k2("What we'll talk about", 160, 90, 1600, { size: 84, color: PUR }),
      scribble(170, 200, 500, ORG),
      ag.map(([t1, d1], i) => { const ry = 280 + i * 140; return [S("star", 160, ry, 92, 92, [RED, ORG, YEL, GRN, BLU][i], { name: "Star" }), mid(k2(String(i + 1), 160, 0, 92, { size: 36, color: i === 1 || i === 2 ? INK : WHITE, align: "center" }), ry + 52), k2(t1, 290, ry + 2, 860, { size: 48 }), k2(d1, 290, ry + 66, 860, { size: 30, bold: false, color: SOFT })]; }),
      E("shape-blob", 1280, 340, 480, { c1: YEL }),
      mid(k2("Questions\nwelcome\nany time!", 1340, 0, 360, { size: 54, align: "center", lh: 1.1 }), 580),
    ], "Five things tonight. Parents can interrupt with questions at any point."));
    P.push(SL(BLU, [
      C(1240, 200, 560, 560, YEL, { name: "Sun" }), E("face-happy", 1340, 300, 360, { c1: YEL }),
      E("deco-sparkle", 1100, 140, 110, { c1: WHITE }),
      k2("PART 1", 160, 340, 800, { size: 44, color: YEL, ls: 3 }),
      k2("A day at\ncamp", 160, 400, 1000, { size: 160, color: WHITE, lh: 1 }),
    ], "Part one: what a normal day looks like."));
    const h4 = flow(120, k2("Fun, safe and outdoors", 160, 0, 860, { size: 90, color: GRN, lh: 1.05 }), 30,
      k2("Campers spend most of the day outside: games in the meadow, swimming in the lake and crafts under the big oak tree.", 160, 0, 820, { size: 34, bold: false, lh: 1.4 }));
    P.push(SL(BG, [
      h4,
      bullets(160, after(h4, 40), 820, ["Groups of six with one counsellor", "Shade, water and sun cream breaks", "Indoor plan for rainy days"], { family: "calibri", size: 34, bold: true, color: INK, marker: "circle", mc: [RED, BLU, ORG], md: 30, gap: 20 }),
      F(1060, 180, 700, 620, { rot: -3, name: "Camp photo", border: { width: 16, color: ORG } }),
      E("deco-sparkle", 960, 870, 90, { c1: YEL }), E("deco-squiggle", 1500, 860, 240, { c1: BLU }),
    ], "Stress safety: small groups and breaks every hour."));
    P.push(SL(BG, [
      k2("Last summer's favourite activities", 160, 90, 1600, { size: 72, color: BLU }),
      k2("Votes from 120 campers", 160, 190, 1000, { size: 34, bold: false, color: SOFT }),
      barsV(160, 270, 1600, 750, [["Swimming", 34], ["Treasure hunt", 28], ["Campfire songs", 30], ["Football", 25], ["Crafts", 21]], { fill: [BLU, ORG, RED, GRN, PUR], radius: 28, bar: 0.62, family: "calibri", vs: 52, vc: [BLU, ORG, RED, GRN, PUR], ls: 32, lb: true, lc: INK }),
    ], "Swimming won again. Treasure hunt is new this year and came close."));
    P.push(SL("#fff4c2", [
      k2("A day at camp", 160, 90, 1600, { size: 84, color: RED }),
      tlH(140, 600, 1640, [["8:30", "Drop-off", "Hello and name tags"], ["9:00", "Games", "Team games outside"], ["11:00", "Arts & crafts", "Make it, take it home"], ["12:30", "Lunch", "Bring a packed lunch"], ["14:00", "Swimming", "With trained lifeguards"], ["16:00", "Pick-up", "Tired and happy!"]],
        { alt: true, d: 84, dot: [RED, ORG, YEL, GRN, BLU, PUR], ring: WHITE, rw: 6, line: INK, lw: 6, family: "calibri", ws: 44, wc: [RED, ORG, "#b45309", "#15803d", BLU, PUR], ts: 44, tc: INK, ds: 30, dc: SOFT, tg: 28 }),
    ], "Run through the day. Pick-up is from 16:00 to 16:30 at the main gate."));
    P.push(SL(BG, [
      k2("Meet the counsellors", 160, 90, 1600, { size: 84, color: PUR }),
      team(160, 310, 1600, [["Maya", "Swimming & games"], ["Josh", "Arts & crafts"], ["Priya", "Nature walks"], ["Ollie", "Football & songs"]],
        { d: 290, border: { width: 14, color: [RED, BLU, GRN, ORG] }, family: "calibri", ns: 48, nc: INK, rs: 30, rc: SOFT, gap: 30 }),
      E("shape-star", 120, 300, 70, { c1: YEL }), E("shape-star", 1730, 640, 80, { c1: RED }),
    ], "All counsellors are first-aid trained and have worked with children before."));
    P.push(SL(BG, [
      R(260, 160, 1400, 560, "#dbeafe", { radius: 120, name: "Speech bubble" }), S("triangle", 520, 690, 150, 130, "#dbeafe", { rot: 200, name: "Bubble tail" }),
      mid(k2("“My son came home tired, happy and full of stories every single day.”", 340, 0, 1240, { size: 64, align: "center", color: BLU, lh: 1.2 }), 440),
      k2("Sam's mum, camp parent since 2024", 260, 860, 1400, { size: 38, align: "center", color: ORG }),
      E("face-love", 1620, 760, 180),
    ], "A real note from a parent last summer."));
    P.push(SL(BG, [
      k2("Camp in numbers", 160, 90, 1600, { size: 84, color: GRN }),
      [["1:6", "counsellor for every six kids", BLU], ["6", "weeks of summer fun", RED], ["4", "age groups from 5 to 12", PUR], ["100%", "staff trained in first aid", GRN]].map(([n1, l1, col], i) => {
        const x = 160 + i * 410;
        return [E("shape-blob", x, 290, 370, { c1: col, rot: [0, 70, 150, 220][i] }), mid(k2(n1, x + 30, 0, 310, { size: n1.length > 3 ? 88 : 110, color: WHITE, align: "center", lh: 1 }), 475), k2(l1, x, 720, 370, { size: 34, align: "center", lh: 1.25 })];
      }),
    ], "Small groups matter most: one counsellor for every six children."));
    P.push(SL(BG, [
      E("deco-rainbow", 660, 80, 600),
      k2("See you at camp!", 160, 480, 1600, { size: 130, align: "center", color: RED }),
      k2("hello@sunnydayscamp.org  ·  555 0134  ·  sunnydayscamp.org", 160, 680, 1600, { size: 36, bold: false, align: "center" }),
      E("icon-sun", 120, 780, 220, { c1: YEL }), E("deco-balloons", 1580, 760, 220), E("shape-star", 400, 860, 90, { c1: BLU }),
    ], "Thank the parents and hand out the welcome packs at the door."));
    return P;
  });

  /* ───────────── 18. Luxury serif · wedding planning ───────────── */
  deck("luxury-wedding", "Luxury wedding planning", "wedding planning bride groom marriage event celebration luxury elegant serif", () => {
    const IVORY = "#faf6ef", BLACK = "#1c1915", GOLD = "#a8884f", BLUSH = "#efe1d8", TAUPE = "#6f6052", DGOLD = "#8a6d36";
    const s = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "serif", color: BLACK, ...o });
    const caps = (txt, x, y, w, o = {}) => s(txt.toUpperCase(), x, y, w, { size: 22, ls: 8, color: DGOLD, ...o });
    const dframe = (c1 = GOLD) => [R(60, 60, 1800, 960, "none", { stroke: c1, sw: 1.5, name: "Frame" }), R(76, 76, 1768, 928, "none", { stroke: c1, sw: 0.75, name: "Frame" })];
    const orn = (cx, y, w = 300, c1 = GOLD) => E("line-ornament", cx - w / 2, y, w, { c1 });
    const P = [];
    P.push(SL(IVORY, [
      dframe(),
      C(885, 220, 150, 150, "none", { stroke: GOLD, sw: 1.5, name: "Monogram" }), mid(s("A & J", 885, 0, 150, { size: 44, italic: true, align: "center", color: DGOLD }), 295),
      caps("Wedding planning", 160, 440, 1600, { align: "center", size: 26, ls: 12 }),
      s("Amelia & James", 160, 500, 1600, { size: 140, italic: true, align: "center" }),
      orn(960, 690, 360),
      s("Saturday, 12 June 2027  ·  Rosewood Manor", 160, 760, 1600, { size: 36, align: "center", color: TAUPE }),
    ], "Welcome. This is our planning meeting for Amelia and James's wedding on 12 June."));
    const ag = [["I", "The venue"], ["II", "The budget"], ["III", "The countdown"], ["IV", "The wedding party"], ["V", "Final details"]];
    P.push(SL(IVORY, [
      dframe(),
      caps("The plan", 160, 150, 1600, { align: "center" }),
      s("Our planning meeting", 160, 190, 1600, { size: 80, italic: true, align: "center" }),
      orn(960, 310, 300),
      ag.map(([r1, t1], i) => { const ry = 400 + i * 108; return [s(r1, 560, ry, 120, { size: 40, color: GOLD, align: "right" }), s(t1, 730, ry - 4, 640, { size: 50 })]; }),
    ], "Five topics. The countdown is the one to leave with: who does what, and by when."));
    P.push(SL(BLACK, [
      dframe(),
      s("I", 160, 250, 1600, { size: 160, align: "center", color: GOLD }),
      s("The Venue", 160, 460, 1600, { size: 140, italic: true, align: "center", color: IVORY }),
      orn(960, 650, 360),
      caps("Rosewood Manor, Somerset", 160, 720, 1600, { align: "center", color: GOLD }),
    ], "Chapter one: the venue."));
    const h4 = flow(170, caps("The venue", 900, 0, 900), 16, s("Rosewood Manor", 900, 0, 900, { size: 96, italic: true }), 24,
      s("A Georgian house with a walled rose garden, an orangery and an old ballroom, forty minutes from Bath.", 900, 0, 860, { size: 34, color: TAUPE, lh: 1.45 }));
    const y4 = after(h4, 50);
    P.push(SL(IVORY, [
      F(160, 140, 600, 800, { name: "Venue photo" }),
      R(184, 164, 552, 752, "none", { stroke: WHITE, sw: 1.5, name: "Inner line" }),
      h4,
      [["3 pm", "Ceremony in the walled garden"], ["6 pm", "Dinner in the orangery for 150"], ["9 pm", "Dancing in the ballroom until midnight"]].map(([t1, d1], i) => [R(900, y4 + i * 100, 860, 1, GOLD, { name: "Rule" }), s(t1, 900, y4 + i * 100 + 26, 150, { size: 34, italic: true, color: DGOLD }), s(d1, 1070, y4 + i * 100 + 24, 690, { size: 36 })]),
    ], "Show the venue. The garden ceremony has an indoor backup in the orangery if it rains."));
    P.push(SL(IVORY, [
      caps("The budget", 160, 110, 1600, { align: "center" }),
      s("Where the budget goes", 160, 150, 1600, { size: 80, italic: true, align: "center" }),
      barsH(320, 320, 1280, 600, [["Venue & catering", 48], ["Photography", 12], ["Attire", 10], ["Flowers & décor", 9], ["Music", 7], ["Everything else", 14]], { lw: 360, vw: 120, fill: GOLD, track: BLUSH, bar: 0.18, family: "serif", ls: 34, lc: BLACK, vs: 34, vc: DGOLD, vb: false, fmt: (v) => v + "%" }),
      caps("Total budget: $48,000", 160, 960, 1600, { align: "center" }),
    ], "Venue and catering is almost half. The rest is spread fairly evenly."));
    const cd = [["12 months", "Book the venue and photographer"], ["9 months", "Send save-the-date cards"], ["6 months", "Choose the dress and suits"], ["3 months", "Send the invitations"], ["1 month", "Final fittings and seating plan"], ["1 week", "Rehearsal dinner with family"]];
    P.push(SL(IVORY, [
      caps("The countdown", 160, 100, 1600, { align: "center" }),
      s("Twelve months to go", 160, 140, 1600, { size: 72, italic: true, align: "center" }),
      R(959, 290, 2, 690, GOLD, { name: "Line" }),
      cd.map(([w1, t1], i) => { const cy = 330 + i * 124, left = i % 2 === 0; return [S("polygon", 948, cy - 11, 22, 22, GOLD, { sides: 4, name: "Diamond" }), mid(s(w1, left ? 500 : 1010, 0, 410, { size: 40, italic: true, color: DGOLD, align: left ? "right" : "left" }), cy), mid(s(t1, left ? 1010 : 160, 0, 750, { size: 36, align: left ? "left" : "right" }), cy)]; }),
    ], "Read the countdown top to bottom. We are at the nine-month mark now."));
    P.push(SL(IVORY, [
      caps("The wedding party", 160, 100, 1600, { align: "center" }),
      s("With the people we love", 160, 140, 1600, { size: 72, italic: true, align: "center" }),
      team(160, 340, 1600, [["Sophie Grant", "MAID OF HONOUR"], ["Oliver Hayes", "BEST MAN"], ["Clara Moreau", "WEDDING PLANNER"], ["Henry Lewis", "FATHER OF THE BRIDE"]],
        { d: 280, ring: GOLD, rg: 12, rw: 1.5, nf: "serif", ns: 42, ni: true, nb: false, nc: BLACK, rf: "serif", rs: 20, rls: 4, rc: DGOLD, gap: 44 }),
    ], "The people to call. Clara coordinates all suppliers on the day."));
    P.push(SL(BLUSH, [
      dframe(),
      mid(s("“Two hearts, one home, and a lifetime of slow Saturday mornings.”", 260, 0, 1400, { size: 80, italic: true, align: "center", lh: 1.25 }), 470),
      orn(960, 690, 300),
      caps("From Amelia's vows", 160, 760, 1600, { align: "center", size: 24, color: "#6e5326" }),
    ], "A line from Amelia's vows, which she has kindly let us use on the order of service."));
    P.push(SL(IVORY, [
      caps("In numbers", 160, 110, 1600, { align: "center" }),
      s("The day, by the numbers", 160, 150, 1600, { size: 80, italic: true, align: "center" }),
      [["150", "guests"], ["214", "days to go"], ["8", "suppliers booked"], ["3", "courses at dinner"]].map(([n1, l1], i) => {
        const x = 160 + i * 400;
        return [i ? R(x, 420, 1, 260, GOLD, { name: "Divider" }) : null, s(n1, x, 420, 400, { size: 140, color: GOLD, align: "center", lh: 1 }), caps(l1, x, 610, 400, { align: "center", color: TAUPE, size: 22 })];
      }),
      orn(960, 820, 300),
    ], "214 days to go. All eight main suppliers are already booked."));
    P.push(SL(BLACK, [
      dframe(),
      s("With love & thanks", 160, 320, 1600, { size: 110, italic: true, align: "center", color: IVORY }),
      orn(960, 500, 360),
      caps("Clara Moreau Events", 160, 580, 1600, { align: "center", color: GOLD }),
      s("clara@moreauevents.com  ·  +44 117 496 0321  ·  moreauevents.com", 160, 640, 1600, { size: 32, align: "center", color: IVORY }),
    ], "Thank the families. Next meeting is the tasting at Rosewood in March."));
    return P;
  });

  /* ───────────── 19. Architecture lines · design proposal ───────────── */
  deck("architecture-proposal", "Architecture design proposal", "architecture design proposal building project library architect plans lines", () => {
    const BG = "#f1f0ec", INK = "#1e1e1c", LINE = "#bdbab2", BLUE = "#2f5d8a", GREY = "#5e5d59";
    const a = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "sans", color: INK, ...o });
    const m = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "mono", color: GREY, ...o });
    const cross = (x, y, w, h, ext = 40, c1 = INK) => [R(x - ext, y, w + ext * 2, 1, c1, { name: "Guide" }), R(x - ext, y + h, w + ext * 2, 1, c1, { name: "Guide" }), R(x, y - ext, 1, h + ext * 2, c1, { name: "Guide" }), R(x + w, y - ext, 1, h + ext * 2, c1, { name: "Guide" })];
    const dim = (x, y, w, label, c1 = INK) => [R(x, y, w, 1.5, c1, { name: "Dimension" }), R(x, y - 12, 1.5, 24, c1, { name: "Tick" }), R(x + w - 1.5, y - 12, 1.5, 24, c1, { name: "Tick" }), R(x - 8, y, 16, 1.5, c1, { rot: -45, name: "Slash" }), R(x + w - 8, y, 16, 1.5, c1, { rot: -45, name: "Slash" }), m(label, x, y - 36, w, { size: 20, align: "center", color: c1 })];
    const axis = (x, y, label, c1 = INK) => [C(x, y, 44, 44, "none", { stroke: c1, sw: 1.5, name: "Axis bubble" }), mid(m(label, x, 0, 44, { size: 20, align: "center", color: c1 }), y + 22)];
    const P = [];
    P.push(SL(BG, [
      [0, 1, 2, 3, 4].map((i) => [lock(R(160 + i * 400 + 21, 120, 1, 900, LINE, { name: "Grid line" })), axis(160 + i * 400, 66, "ABCDE"[i])]),
      flow(220, m("PROJECT 0417  ·  STAGE 2 CONCEPT DESIGN", 180, 0, 800, { size: 22, color: BLUE }), 24, a("Lakeside\nLibrary", 180, 0, 800, { size: 150, lh: 1, ls: -3 }), 30,
        a("A new public library on the north shore of Alder Lake", 180, 0, 820, { size: 34, color: GREY, lh: 1.3 })),
      m("Halden Architects  ·  March 2027", 180, 900, 700, { size: 22 }),
      F(1040, 260, 720, 560, { name: "Render" }), cross(1040, 260, 720, 560, 40),
      dim(1040, 900, 720, "42 000"),
    ], "Thank you for having us. This is the stage two concept for the Lakeside Library."));
    const ag = [["Site & context", "04"], ["The concept", "07"], ["Plans & sections", "12"], ["Materials", "18"], ["Programme", "22"], ["Team & next steps", "26"]];
    P.push(SL(BG, [
      m("CONTENTS", 160, 140, 600, { size: 22, color: BLUE }),
      a("The proposal\nin six parts", 160, 180, 660, { size: 84, lh: 1.05, ls: -2 }),
      E("arrow-up", 170, 760, 40, { c1: INK }), m("N", 160, 700, 60, { size: 26, bold: true, align: "center", color: INK }),
      ag.map(([t1, p1], i) => { const ry = 180 + i * 130; return [m(String(i + 1).padStart(2, "0"), 900, ry + 6, 80, { size: 26, color: BLUE }), a(t1, 1000, ry, 600, { size: 40 }), m("p. " + p1, 1640, ry + 6, 160, { size: 24, align: "right" }), R(900, ry + 70, 900, 1, INK, { name: "Hairline" }), R(900, ry + 62, 1, 16, INK, { name: "Tick" }), R(1799, ry + 62, 1, 16, INK, { name: "Tick" })]; }),
    ], "Six parts. We will spend most time on the concept and the plans."));
    P.push(SL(INK, [
      [1, 2, 3, 4, 5, 6, 7].map((i) => lock(R(i * 240, 0, 1, 1080, WHITE, { op: 0.12, name: "Grid line" }))), [1, 2, 3].map((i) => lock(R(0, i * 270, 1920, 1, WHITE, { op: 0.12, name: "Grid line" }))),
      m("01", 160, 360, 200, { size: 28, color: "#9fb6d1" }),
      a("Site & context", 160, 410, 1400, { size: 130, color: WHITE, ls: -3 }),
      dim(160, 640, 900, "", WHITE),
      m("ALDER LAKE, NORTH SHORE  ·  1.2 HECTARES", 160, 680, 1200, { size: 24, color: "#cfcfca" }),
    ], "Section one: the site, the lake and the town around it."));
    const h4 = flow(170, m("THE CONCEPT", 1180, 0, 600, { size: 22, color: BLUE }), 16, a("A library that opens to the lake", 1180, 0, 620, { size: 60, lh: 1.1, ls: -1 }), 30,
      a("The reading rooms step down toward the water. A long timber roof ties them together and shades the glass in summer.", 1180, 0, 600, { size: 28, color: GREY, lh: 1.5 }));
    P.push(SL(BG, [
      F(160, 160, 900, 700, { name: "Section drawing" }), cross(160, 160, 900, 700, 40),
      dim(160, 940, 900, "36 000"),
      h4,
      bullets(1180, after(h4, 36), 600, ["Timber frame from local forests", "Terraced reading rooms", "Covered walk along the shore"], { size: 28, color: INK, marker: "square", mc: BLUE, md: 10, gap: 16 }),
    ], "Walk through the section from the street side down to the water."));
    P.push(SL(BG, [
      m("PROGRAMME", 160, 130, 600, { size: 22, color: BLUE }),
      a("Floor area by use (m²)", 160, 170, 1400, { size: 72, ls: -2 }),
      barsH(160, 320, 1600, 620, [["Reading rooms", 820], ["Children's library", 380], ["Café & foyer", 300], ["Study pods", 260], ["Archive", 220], ["Workshops", 180]], { lw: 380, vw: 140, la: "left", fill: [BLUE, INK, INK, INK, INK, INK], bh: 18, track: "#dddbd4", ls: 30, lc: INK, vf: "mono", vs: 28, vc: INK, vb: false }),
      m("TOTAL  2 160 m² NET  ·  2 400 m² GROSS", 160, 980, 1200, { size: 22, color: INK }),
    ], "Reading rooms take the largest share, as the brief asked."));
    P.push(SL(BG, [
      m("TIMELINE", 160, 130, 600, { size: 22, color: BLUE }),
      a("Design and build stages", 160, 170, 1400, { size: 72, ls: -2 }),
      [0, 1, 2, 3, 4, 5].map((i) => R(160 + i * 320, 580, 1.5, 40, INK, { name: "Tick" })),
      tlH(160, 600, 1600, [["Q1 2027", "Concept", "Massing, budget and client sign-off"], ["Q3 2027", "Planning", "Submission and public consultation"], ["Q1 2028", "Technical design", "Structure, services and details"], ["2028–29", "Construction", "Two years on site"], ["Spring 2030", "Opening", "Doors open to the public"]],
        { marker: "square", d: 16, dot: INK, line: INK, lw: 1.5, full: true, wf: "mono", ws: 26, wb: false, wc: BLUE, ts: 44, tb: false, tc: INK, ds: 30, dc: GREY, tg: 44 }),
    ], "Three years from concept to opening, if planning goes through first time."));
    P.push(SL(BG, [
      m("TEAM", 160, 130, 600, { size: 22, color: BLUE }),
      a("Design team", 160, 170, 1400, { size: 72, ls: -2 }),
      team(160, 380, 1600, [["Ingrid Halden", "Lead architect"], ["Mateo Silva", "Project architect"], ["Hannah Cole", "Landscape"], ["Yusuf Demir", "Structural engineer"], ["Elsa Moreau", "Sustainability"]],
        { d: 220, ring: INK, rg: 10, rw: 1, ns: 30, nb: false, nc: INK, rf: "mono", rs: 20, rc: GREY, gap: 36 }),
    ], "One team from concept to opening. Hannah leads the landscape and the shore walk."));
    P.push(SL(BG, [
      R(160, 300, 2, 440, BLUE, { name: "Line" }),
      flow(300, a("“A library should feel like a public living room, with the best view in town.”", 220, 0, 1300, { size: 72, lh: 1.2, ls: -1 }), 40,
        m("INGRID HALDEN, LEAD ARCHITECT", 220, 0, 1000, { size: 24, color: BLUE })),
      axis(1700, 880, "8"), axis(1760, 880, "9"),
    ], "This idea drives every design decision you have seen."));
    P.push(SL(BG, [
      m("KEY FIGURES", 160, 130, 600, { size: 22, color: BLUE }),
      a("The building in numbers", 160, 170, 1400, { size: 72, ls: -2 }),
      R(160, 360, 1600, 420, "none", { stroke: INK, sw: 1.5, name: "Table" }), [1, 2, 3].map((i) => R(160 + i * 400, 360, 1.5, 420, INK, { name: "Divider" })),
      [["2,400", "m² gross floor area over two levels"], ["320", "reading and study seats"], ["60%", "of the facade glazed toward the lake"], ["0", "net operational carbon, all-electric"]].map(([n1, l1], i) => {
        const x = 160 + i * 400;
        return [axis(x + 178, 296, "ABCD"[i]), a(n1, x + 40, 420, 320, { size: 110, lh: 1, ls: -3 }), m(l1, x + 40, 600, 320, { size: 24, color: GREY, lh: 1.4 })];
      }),
    ], "Four figures that matter to the council: size, seats, daylight and carbon."));
    P.push(SL(BG, [
      a("Thank you", 160, 280, 1100, { size: 140, ls: -4 }),
      dim(160, 520, 1000, "HALDEN ARCHITECTS"),
      [["Email", "ingrid@haldenarchitects.com"], ["Phone", "+46 8 555 0193"], ["Project", "haldenarchitects.com/lakeside"]].map(([l1, v1], i) => [m(l1.toUpperCase(), 160, 600 + i * 80, 200, { size: 20, color: BLUE }), m(v1, 380, 596 + i * 80, 800, { size: 28, color: INK })]),
      F(1340, 300, 420, 480, { name: "Building mock-up photo" }), cross(1340, 300, 420, 480, 30),
      E("arrow-up", 1540, 860, 30, { c1: INK }), m("N", 1525, 820, 60, { size: 22, bold: true, align: "center", color: INK }),
    ], "Thank the panel. Next step is the planning pre-application meeting in May."));
    return P;
  });

  /* ───────────── 20. Eco green · sustainability report ───────────── */
  deck("eco-report", "Eco green sustainability report", "sustainability report environment green eco zero waste climate office", () => {
    const FOREST = "#1d4d36", GREEN = "#3f9a55", LIME = "#a8d672", MINT = "#eaf5e4", EARTH = "#7a5a43", SUN = "#f6d36b", DEEPG = "#2f7a46", MOSS = "#3d5a48";
    const c = (txt, x, y, w, o = {}) => T(txt, x, y, w, { family: "calibri", color: FOREST, ...o });
    const leaf = (x, y, w, rot, c1 = GREEN) => E("icon-leaf", x, y, w, { c1, c2: FOREST, rot });
    const P = [];
    P.push(SL(FOREST, [
      C(1160, 140, 680, 680, "none", { stroke: LIME, sw: 6, name: "Ring" }),
      F(1190, 170, 620, 620, { shape: "circle", name: "Photo" }),
      leaf(1060, 700, 200, -30, LIME), leaf(1720, 90, 150, 40, GREEN), leaf(1660, 780, 170, 120, LIME),
      flow(250, c("SUSTAINABILITY REPORT 2026", 160, 0, 900, { size: 28, bold: true, ls: 4, color: LIME }), 20, c("zero waste\noffice", 160, 0, 960, { size: 160, bold: true, color: WHITE, lh: 0.95 }), 40,
        c("Greenleaf Studios  ·  85 people, one shared goal", 160, 0, 900, { size: 36, color: "#cfe6d4" })),
      c("-72% landfill waste this year", 160, 820, 500, { size: 30, bold: true, color: FOREST, bg: { color: LIME, radius: 1, pad: 0.6 } }),
    ], "Welcome to our 2026 sustainability report. The headline: we cut landfill waste by 72 percent."));
    const ag = [["what we measured", "Waste, energy and travel"], ["where it came from", "A look inside our bins"], ["what we changed", "Twelve months, five big moves"], ["the results", "Numbers we are proud of"], ["what's next", "Our 2027 goals"]];
    P.push(SL(MINT, [
      c("what's inside", 160, 100, 1000, { size: 90, bold: true }),
      ag.map(([t1, d1], i) => { const ry = 260 + i * 146; return [R(160, ry, 1000, 120, WHITE, { radius: 60, name: "Pill" }), C(180, ry + 20, 80, 80, [GREEN, LIME, DEEPG, SUN, EARTH][i], { name: "Dot" }), leaf(195, ry + 35, 50, 0, WHITE), c(t1, 290, ry + 14, 820, { size: 40, bold: true }), c(d1, 290, ry + 64, 820, { size: 26, color: MOSS })]; }),
      C(1300, 300, 480, 480, GREEN, { name: "Circle" }),
      stackMid(540, 0, c("5", 1300, 0, 480, { size: 200, bold: true, color: WHITE, align: "center", lh: 1 }), c("waste streams\nsorted every day", 1300, 0, 480, { size: 36, bold: true, color: WHITE, align: "center", lh: 1.2 })),
    ], "Five parts. The circle is a teaser for one of our five big changes."));
    P.push(SL(DEEPG, [
      C(1260, 200, 560, 560, "#3d8c55", { name: "Circle" }), leaf(1380, 320, 320, 20, LIME),
      c("01", 160, 280, 400, { size: 180, bold: true, color: LIME, lh: 1 }),
      c("what we\nmeasured", 160, 480, 1000, { size: 130, bold: true, color: WHITE, lh: 0.95 }),
      c("Waste, energy and travel, every month for a year", 160, 760, 1000, { size: 36, color: "#dcefdf" }),
    ], "Section one: how we measured our footprint."));
    const h4 = flow(150, c("WHERE IT CAME FROM", 160, 0, 800, { size: 26, bold: true, ls: 4, color: DEEPG }), 16, c("A look inside our bins", 160, 0, 860, { size: 84, bold: true, lh: 1.05 }), 26,
      c("In January we weighed every bag before it left the building. This is what our waste was made of.", 160, 0, 820, { size: 32, color: MOSS, lh: 1.45 }));
    P.push(SL(MINT, [
      F(1080, 140, 700, 760, { shape: "rounded", radius: 120, name: "Photo" }),
      leaf(980, 780, 180, -20, GREEN),
      h4,
      bullets(160, after(h4, 36), 820, ["Food waste: 38%", "Paper and card: 27%", "Coffee cups: 16%", "Plastics: 11%", "Other: 8%"], { family: "calibri", size: 32, bold: true, color: FOREST, marker: "circle", mc: [EARTH, SUN, GREEN, LIME, "#9bb3a3"], md: 26, gap: 14 }),
    ], "Food and paper made up two thirds. Coffee cups were the easiest win."));
    P.push(SL(MINT, [
      c("landfill waste per month", 160, 100, 1500, { size: 80, bold: true }),
      c("Kilograms sent to landfill, January to June 2026", 160, 200, 1400, { size: 32, color: MOSS }),
      barsV(160, 280, 1600, 740, [["Jan", 420], ["Feb", 360], ["Mar", 280], ["Apr", 210], ["May", 160], ["Jun", 118]], { fill: [EARTH, "#8d7a4a", "#7f8f4c", "#5f9a52", GREEN, DEEPG], radius: 24, bar: 0.55, family: "calibri", vs: 44, vc: FOREST, ls: 30, lc: FOREST, lb: true, fmt: (v) => v + " kg" }),
    ], "Every month went down. June was less than a third of January."));
    const stops = [["January", "Waste audit", "We weighed every bin for a month."], ["March", "Five bins", "Food, paper, glass, plastic, other."], ["May", "No paper cups", "Mugs for all, and a cup library."], ["August", "Solar roof", "120 panels on the studio roof."], ["November", "Zero week", "A full week with nothing to landfill."]];
    P.push(SL(FOREST, [
      c("our green journey", 160, 100, 1500, { size: 84, bold: true, color: WHITE }),
      tlH(160, 600, 1600, stops, { d: 110, dot: MINT, ring: LIME, rw: 6, line: LIME, lw: 4, family: "calibri", ws: 34, wc: LIME, ts: 46, tc: WHITE, ds: 30, dc: "#cfe6d4", tg: 36 }),
      stops.map((_, i) => leaf(160 + 320 * (i + 0.5) - 32, 568, 64, 0, GREEN)),
    ], "Five changes across the year. The cup library was the staff favourite."));
    P.push(SL(MINT, [
      c("the green team", 160, 100, 1500, { size: 84, bold: true }),
      team(160, 320, 1600, [["Hana Ito", "Team lead"], ["Marcus Bell", "Facilities"], ["Zoe Adams", "Kitchen champion"], ["Kofi Boateng", "Travel & data"]],
        { d: 280, ring: GREEN, rg: 12, rw: 6, family: "calibri", ns: 38, nc: FOREST, rs: 28, rc: DEEPG, gap: 44 }),
      [0, 1, 2, 3].map((i) => [C(420 + i * 400, 530, 84, 84, WHITE, { name: "Badge" }), leaf(434 + i * 400, 544, 56, 0, GREEN)]),
    ], "Four volunteers, two hours a week each. Thank them by name."));
    P.push(SL(FOREST, [
      leaf(160, 140, 220, -25, GREEN), leaf(1560, 720, 240, 140, LIME),
      stackMid(500, 40, c("“The easiest waste to deal with is the waste you never create.”", 260, 0, 1400, { size: 76, bold: true, italic: true, align: "center", color: WHITE, lh: 1.2 }), c("Hana Ito, green team lead", 260, 0, 1400, { size: 34, align: "center", color: LIME })),
    ], "Hana's rule: prevention first, recycling second."));
    P.push(SL(MINT, [
      c("the results", 160, 100, 1500, { size: 84, bold: true }),
      [["-72%", "landfill waste", GREEN], ["3,100", "paper cups saved", EARTH], ["100%", "renewable electricity", DEEPG], ["48", "trees planted with staff", LIME]].map(([n1, l1, col], i) => {
        const x = 180 + i * 410;
        return [C(x, 300, 340, 340, WHITE, { stroke: col, sw: 18, name: "Ring" }), mid(c(n1, x, 0, 340, { size: 84, bold: true, align: "center", lh: 1 }), 470), c(l1, x - 20, 690, 380, { size: 34, bold: true, align: "center", lh: 1.25 })];
      }),
    ], "Four results for 2026. Next year we want to reach zero landfill for a full quarter."));
    P.push(SL(FOREST, [
      leaf(1640, 100, 160, 30, LIME),
      C(1240, 300, 540, 540, "none", { stroke: LIME, sw: 6, name: "Ring" }), F(1270, 330, 480, 480, { shape: "circle", name: "Photo" }),
      flow(240, c("thank you", 160, 0, 1000, { size: 170, bold: true, color: WHITE }), 10, c("Small changes, every day, add up.", 160, 0, 1000, { size: 44, color: LIME })),
      [["icon-mail", "green@greenleafstudios.com"], ["icon-globe", "greenleafstudios.com/impact"]].map(([ic, v1], i) => [E(ic, 160, 620 + i * 90, 50, { c1: LIME, c2: FOREST, c3: FOREST }), mid(c(v1, 240, 0, 900, { size: 34, color: WHITE }), 645 + i * 90)]),
    ], "Thank everyone. The full data is on our impact page."));
    return P;
  });
}
