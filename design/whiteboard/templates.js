// Board templates (our own layouts and wording). Each build() returns objects around (0, 0);
// applyTemplate() copies them with new ids, centred on a board point.
import { makeNote, makeShape, makeText, makeFrame, makeConnector, makeTable, makeStroke, pasteObjects, byIdOf, normalizeObject } from "./model.js";
import { objectPrims, boardBounds, primsToSvg } from "./render.js";
import { parseTemplateId, paletteById, themeById, recolor, PALETTES, THEMES } from "./variants.js";

// Content theme while a variant is being built (see variants.js). th() swaps sticky-note phrases, tv() titles, who() names.
let CUR = null;
const th = (list, off = 0) => (CUR?.items ? list.map((_, i) => CUR.items[(off + i) % CUR.items.length]) : list);
const tv = (def, f) => (CUR?.topic ? f(CUR.topic) : def);
const who = (list, off = 0) => (CUR?.people ? list.map((_, i) => CUR.people[(off + i) % CUR.people.length].replace(", ", "\n")) : list);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const low = (t) => t.charAt(0).toLowerCase() + t.slice(1);

const C = { violet: "#5b4cf0", blue: "#2f80ff", teal: "#14b8a6", amber: "#f59e0b", rose: "#f43f5e", green: "#22c55e", ink: "#1b2133" };
const link = (a, b, o = {}) => makeConnector({ from: { id: a.id, side: o.fromSide || "auto" }, to: { id: b.id, side: o.toSide || "auto" }, kind: o.kind || "straight", arrow: o.arrow ?? "end", text: o.text || "", stroke: o.stroke || "#334155" });
const header = (x, y, w, text, fill) => makeShape({ x, y, w, h: 56, kind: "rounded", fill, stroke: fill, text, size: 20, bold: true });
const column = (x, y, w, h) => makeShape({ x, y, w, h, kind: "rounded", fill: "#f1f2f8", stroke: "#e3e6f0", sw: 1 });
const NOTE = { yellow: "#ffe27a", peach: "#ffc29f", pink: "#ffb3cf", lilac: "#d9cbff", sky: "#b4dcff", mint: "#b7efd2", lime: "#dff28f", white: "#ffffff" };
/** Dark section header pill (white bold text), like a whiteboard section title. */
const pill = (x, y, w, text, fill = "#1b2133", h = 52, size = 20) => { const o = makeShape({ x, y, w, h, kind: "rounded", fill, stroke: fill, text, size, bold: true }); o.textColor = "#ffffff"; return o; };
const title = (x, y, w, text, color = "#0f5132", size = 48) => makeText({ x, y, w, text, size, bold: true, color, align: "center" });
const free = (x1, y1, x2, y2, o = {}) => makeConnector({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, kind: "straight", arrow: o.arrow ?? "none", stroke: o.stroke || "#334155", sw: o.sw ?? 2, text: o.text || "" });
const box = (x, y, w, h, text, fill, stroke, o = {}) => { const s = makeShape({ x, y, w, h, kind: o.kind || "rounded", fill, stroke: stroke ?? fill, text, size: o.size || 18, bold: !!o.bold, sw: o.sw ?? 2 }); if (o.textColor) s.textColor = o.textColor; if (o.opacity != null) s.opacity = o.opacity; return s; };

export const TEMPLATES = [
  {
    id: "brainstorm", name: "Brainstorm", desc: "One question in the middle, ideas all around.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1040, h: 720, name: "Brainstorm" });
      const mid = makeShape({ x: 400, y: 290, w: 240, h: 140, kind: "ellipse", fill: C.violet, stroke: C.violet, text: tv("What should we try next?", (t) => `Ideas for our ${low(t)}`), size: 20, bold: true });
      mid.textColor = "#ffffff";
      const prompts = th(["A quick win", "A bold idea", "What do customers ask for?", "What slows us down?", "Who could help?", "Something new to test", "What would make it easy?", "A small first step"]);
      const colors = ["#ffe27a", "#ffc29f", "#ffb3cf", "#d9cbff", "#b4dcff", "#b7efd2", "#dff28f", "#ffe27a"];
      const notes = prompts.map((text, i) => {
        const a = (i / prompts.length) * Math.PI * 2 - Math.PI / 2;
        return makeNote({ x: 520 + Math.cos(a) * 390 - 75, y: 360 + Math.sin(a) * 255 - 75, w: 150, h: 150, color: colors[i], text });
      });
      return [frame, mid, ...notes];
    },
  },
  {
    id: "mindmap", name: "Mind map", desc: "A main topic with branches and details.",
    build() {
      const main = makeShape({ x: 470, y: 300, w: 220, h: 90, kind: "rounded", fill: C.violet, stroke: C.violet, text: tv("Main topic", (t) => t), size: 22, bold: true });
      main.textColor = "#ffffff";
      const spots = [[160, 120, "Goals", "#dbeafe", C.blue], [160, 520, "People", "#ccfbf1", C.teal], [830, 120, "Ideas", "#fef3c7", C.amber], [830, 520, "Next steps", "#ffe4e6", C.rose]];
      const out = [main];
      for (const [x, y, text, fill, stroke] of spots) {
        const b = makeShape({ x, y, w: 170, h: 64, kind: "rounded", fill, stroke, text, size: 18, bold: true });
        out.push(b, link(main, b, { arrow: "none", stroke }));
        const left = x < 470;
        for (let k = 0; k < 2; k++) {
          const d = makeShape({ x: left ? x - 220 : x + 230, y: y - 52 + k * 100, w: 175, h: 50, kind: "rounded", fill: "#ffffff", stroke, text: CUR?.items ? CUR.items[(out.length + k) % CUR.items.length] : k ? "Another detail" : "Add a detail", size: 15 });
          out.push(d, link(b, d, { kind: "elbow", arrow: "none", stroke }));
        }
      }
      return out;
    },
  },
  {
    id: "kanban", name: "Kanban", desc: "To do, Doing and Done columns.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1090, h: 700, name: tv("Team board", (t) => `${t} board`) });
      const cols = [["To do", "#d9cbff", th(["Write the plan", "Call the supplier"], 0)], ["Doing", "#ffe27a", th(["Design the flyer"], 2)], ["Done", "#b7efd2", th(["Set up the shop page"], 3)]];
      const out = [frame];
      cols.forEach(([title, color, items], i) => {
        const x = 30 + i * 355;
        out.push(column(x, 30, 320, 640), header(x, 30, 320, title, color));
        items.forEach((text, k) => out.push(makeNote({ x: x + 18 + (k % 2) * 148, y: 110 + Math.floor(k / 2) * 150, w: 136, h: 136, color, text })));
      });
      return out;
    },
  },
  {
    id: "flowchart", name: "Flowchart starter", desc: "Start, steps, a yes/no decision and the end.",
    build() {
      const start = makeShape({ x: 300, y: 0, w: 160, h: 70, kind: "ellipse", fill: "#dcfce7", stroke: C.green, text: "Start", bold: true });
      const step = makeShape({ x: 290, y: 130, w: 180, h: 80, kind: "rect", fill: "#e8e5fe", stroke: C.violet, text: th(["First step"], 0)[0] });
      const ask = makeShape({ x: 280, y: 270, w: 200, h: 130, kind: "diamond", fill: "#fef3c7", stroke: C.amber, text: "Is it ready?" });
      const yes = makeShape({ x: 580, y: 295, w: 180, h: 80, kind: "rect", fill: "#e8e5fe", stroke: C.violet, text: th(["Share it"], 11)[0] });
      const no = makeShape({ x: 0, y: 295, w: 180, h: 80, kind: "rect", fill: "#ffe4e6", stroke: C.rose, text: "Fix what is missing" });
      const end = makeShape({ x: 590, y: 470, w: 160, h: 70, kind: "ellipse", fill: "#dcfce7", stroke: C.green, text: "End", bold: true });
      return [start, step, ask, yes, no, end,
        link(start, step, { kind: "elbow" }), link(step, ask, { kind: "elbow" }),
        link(ask, yes, { kind: "elbow", text: "Yes", fromSide: "right", toSide: "left" }), link(ask, no, { kind: "elbow", text: "No", fromSide: "left", toSide: "right" }),
        link(no, step, { kind: "elbow", fromSide: "top", toSide: "left" }), link(yes, end, { kind: "elbow", fromSide: "bottom", toSide: "top" })];
    },
  },
  {
    id: "swot", name: "SWOT", desc: "Strengths, weaknesses, opportunities, threats.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 920, h: 700, name: tv("SWOT analysis", (t) => `${t}: SWOT analysis`) });
      const q = [["Strengths\nWhat we do well", "#dcfce7", C.green], ["Weaknesses\nWhere we can get better", "#ffe4e6", C.rose], ["Opportunities\nChances we can use", "#dbeafe", C.blue], ["Threats\nRisks to watch", "#fef3c7", C.amber]];
      return [frame, ...q.map(([text, fill, stroke], i) => makeShape({ x: 20 + (i % 2) * 450, y: 20 + Math.floor(i / 2) * 340, w: 430, h: 320, kind: "rounded", fill, stroke, text, size: 22, bold: true }))];
    },
  },
  {
    id: "weekly", name: "Weekly planner", desc: "Seven days, with room for notes.",
    build() {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const frame = makeFrame({ x: 0, y: 0, w: 20 + days.length * 190, h: 640, name: "This week" });
      const out = [frame, makeText({ x: 24, y: 18, w: 600, text: "Goals for the week:", size: 22, bold: true })];
      days.forEach((d, i) => {
        const x = 20 + i * 190;
        out.push(column(x, 70, 175, 550), header(x, 70, 175, d, i >= 5 ? "#b4dcff" : "#d9cbff"));
      });
      out.push(makeNote({ x: 37, y: 145, w: 140, h: 140, text: th(["Plan the week"])[0], color: "#ffe27a" }));
      if (CUR?.items) for (let i = 1; i < 6; i++) out.push(makeNote({ x: 37 + i * 190, y: 145 + (i % 2) * 40, w: 140, h: 140, text: CUR.items[i], color: ["#ffc29f", "#b4dcff", "#b7efd2", "#ffb3cf", "#d9cbff"][i - 1] }));
      return out;
    },
  },
  {
    id: "retro", name: "Retrospective", desc: "What went well, what to improve, actions.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1090, h: 660, name: tv("Retrospective", (t) => `${t} retrospective`) });
      const cols = [["What went well", "#b7efd2"], ["What to improve", "#ffc29f"], ["Action items", "#d9cbff"]];
      const out = [frame];
      cols.forEach(([title, color], i) => {
        const x = 30 + i * 355;
        out.push(column(x, 30, 320, 600), header(x, 30, 320, title, color), makeNote({ x: x + 18, y: 110, w: 136, h: 136, color, text: th(["Add a note"], i * 2)[0] }));
      });
      return out;
    },
  },
  {
    id: "launch-plan", name: "Launch plan", desc: "Before and after launch sections with sticky notes.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1240, h: 760, name: "Launch plan", fill: "#ffffff" });
      const out = [frame, title(220, 34, 800, tv("Launch Plan", (t) => `${t} plan`), "#0f766e", 54)];
      const sides = [["Before launch", 40, [["Invite early testers", NOTE.yellow], ["Plan the preview day", NOTE.yellow], ["Write the launch email", NOTE.peach], ["Price and bundles", NOTE.peach]]],
        ["After launch", 650, [["Share happy customer stories", NOTE.lime], ["Partner with local creators", NOTE.mint], ["Collect feedback", NOTE.lime], ["Plan the next update", NOTE.mint]]]];
      for (const [name, x, notes0] of sides) {
        out.push(pill(x, 150, 300, name));
        const notes = CUR?.items ? notes0.map(([, c], i) => [CUR.items[(x > 100 ? 4 : 0) + i], c]) : notes0;
        notes.forEach(([text, color], i) => out.push(makeNote({ x: x + (i % 2) * 280, y: 230 + Math.floor(i / 2) * 260, w: 250, h: 230, color, text, size: 24 })));
      }
      return out;
    },
  },
  {
    id: "timeline", name: "Project timeline", desc: "Milestones along a line, month by month.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1320, h: 560, name: "Timeline" });
      const out = [frame, title(40, 30, 1240, tv("Project timeline", (t) => `${t} timeline`), C.ink, 40), free(60, 290, 1260, 290, { arrow: "end", stroke: C.violet, sw: 4 })];
      const steps = [["January", "Kick-off meeting", NOTE.lilac], ["March", "First draft ready", NOTE.sky], ["May", "Testing with users", NOTE.mint], ["July", "Launch day", NOTE.yellow], ["September", "Review results", NOTE.peach]];
      steps.forEach(([month, text0, color], i) => {
        const text = th([text0], i * 2)[0];
        const cx = 160 + i * 250;
        out.push(box(cx - 14, 276, 28, 28, "", C.violet, "#ffffff", { kind: "ellipse", sw: 4 }));
        out.push(makeText({ x: cx - 100, y: 318, w: 200, text: month, size: 20, bold: true, align: "center", color: C.violet }));
        out.push(makeNote({ x: cx - 90, y: i % 2 ? 360 : 90, w: 180, h: 160, color, text, size: 22 }));
      });
      return out;
    },
  },
  {
    id: "venn", name: "Venn diagram", desc: "Three circles to compare what is shared and what is not.",
    build() {
      const out = [title(0, -40, 760, tv("Compare three ideas", (t) => `${t}: compare three ideas`), C.ink, 36)];
      const circles = [[60, 60, "#5b4cf0", "Idea A"], [330, 60, "#14b8a6", "Idea B"], [195, 290, "#f59e0b", "Idea C"]];
      for (const [x, y, c, t] of circles) out.push(box(x, y, 370, 370, "", c, c, { kind: "ellipse", opacity: 0.28, sw: 3 }));
      out.push(makeText({ x: 90, y: 170, w: 160, text: "Idea A", size: 24, bold: true, align: "center", color: "#3b2fd0" }));
      out.push(makeText({ x: 510, y: 170, w: 160, text: "Idea B", size: 24, bold: true, align: "center", color: "#0f766e" }));
      out.push(makeText({ x: 300, y: 560, w: 160, text: "Idea C", size: 24, bold: true, align: "center", color: "#b45309" }));
      out.push(makeText({ x: 315, y: 300, w: 130, text: "All three", size: 18, bold: true, align: "center" }));
      out.push(makeText({ x: 325, y: 130, w: 110, text: "A and B", size: 16, align: "center" }));
      return out;
    },
  },
  {
    id: "journey", name: "Customer journey map", desc: "Stages across, what people do, think and feel down.",
    build() {
      const stages = ["Discover", "Compare", "Buy", "Use", "Recommend"], rows = [["Doing", NOTE.sky], ["Thinking", NOTE.lilac], ["Feeling", NOTE.yellow], ["Pain points", NOTE.pink], ["Ideas to help", NOTE.mint]];
      const frame = makeFrame({ x: 0, y: 0, w: 220 + stages.length * 220, h: 160 + rows.length * 170, name: tv("Customer journey map", (t) => `${t}: customer journey`) });
      const out = [frame];
      stages.forEach((st, i) => out.push(pill(200 + i * 220, 40, 200, st, i % 2 ? "#2f80ff" : "#5b4cf0")));
      const sample = { "Doing": ["Sees a post from a friend", "Reads reviews", "Pays online", "Opens the box", "Shares a photo"], "Thinking": ["Is this for me?", "Which one is best?", "Is it safe to pay?", "How does it work?", "Who else would like it?"], "Feeling": ["Curious", "Unsure", "Excited", "Happy", "Proud"] };
      rows.forEach(([name, color], r) => {
        const y = 120 + r * 170;
        out.push(makeText({ x: 24, y: y + 60, w: 160, text: name, size: 20, bold: true }));
        stages.forEach((_, i) => out.push(makeNote({ x: 210 + i * 220, y, w: 180, h: 150, color, text: (name === "Doing" && CUR?.items ? CUR.items[i] : name === "Ideas to help" && CUR?.items ? CUR.items[6 + i] : sample[name]?.[i]) || "", size: 20 })));
      });
      return out;
    },
  },
  {
    id: "roadmap", name: "Project roadmap", desc: "Teams down the side, months across, work as bars.",
    build() {
      const months = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"], teams = [["Design", C.violet, [[0, 2, "Research and sketches"], [2, 4, "Final screens"]]], ["Build", C.blue, [[1, 4, "Build the app"], [4, 5, "Fix and polish"]]], ["Marketing", C.teal, [[3, 5, "Launch campaign"], [5, 6, "Partner posts"]]], ["Support", C.amber, [[4, 6, "Help center and training"]]]];
      const cw = 170, x0 = 200, frame = makeFrame({ x: 0, y: 0, w: x0 + months.length * cw + 40, h: 140 + teams.length * 120, name: "Project roadmap" });
      const out = [frame, title(30, 20, 900, tv("Product roadmap", (t) => `${t} roadmap`), C.ink, 34)];
      out[1].align = "left";
      months.forEach((m, i) => out.push(box(x0 + i * cw, 80, cw - 6, 40, m, "#f1f2f8", "#e3e6f0", { size: 16, bold: true, sw: 1 })));
      teams.forEach(([name, color, bars], r) => {
        const y = 140 + r * 120;
        out.push(makeText({ x: 30, y: y + 30, w: 150, text: name, size: 22, bold: true, color }));
        out.push(free(20, y + 105, x0 + months.length * cw, y + 105, { stroke: "#e3e6f0", sw: 1 }));
        for (const [a, b, text0] of bars) out.push(box(x0 + a * cw + 4, y + 20, (b - a) * cw - 14, 60, th([text0], r * 3 + a)[0], color, color, { size: 17, bold: true, textColor: "#ffffff" }));
      });
      return out;
    },
  },
  {
    id: "fishbone", name: "Fishbone diagram", desc: "Find the causes of a problem, sorted by category.",
    build() {
      const out = [title(0, -30, 1100, tv("Why are orders late?", (t) => `What could go wrong with the ${low(t)}?`), C.ink, 34), free(40, 330, 900, 330, { arrow: "end", sw: 4 })];
      out.push(box(910, 280, 200, 100, tv("Orders arrive late", (t) => `${t} risks`), C.rose, C.rose, { bold: true, textColor: "#ffffff", size: 20 }));
      const cats = [["People", 160, NOTE.sky], ["Process", 440, NOTE.lilac], ["Tools", 720, NOTE.mint]];
      for (const [name, x, color] of cats) {
        for (const top of [true, false]) {
          const label = top ? name : ["Materials", "Place", "Time"][cats.findIndex((c) => c[0] === name)];
          const y = top ? 110 : 550;
          out.push(free(x, y, x + 140, 330, { stroke: "#334155", sw: 3 }));
          out.push(box(x - 80, top ? y - 56 : y, 160, 50, label, "#1b2133", "#1b2133", { bold: true, textColor: "#ffffff" }));
          out.push(makeNote({ x: x + (top ? 110 : 130), y: top ? 150 : 400, w: 120, h: 100, color, text: CUR?.items ? CUR.items[(out.length * 7) % CUR.items.length] : top ? "Add a cause" : "Another cause", size: 18 }));
        }
      }
      return out;
    },
  },
  {
    id: "affinity", name: "Affinity map", desc: "Sort many notes into groups with a clear name.",
    build() {
      const groups = [["Speed", NOTE.yellow, ["Pages load slowly", "Checkout takes long", "Search is slow"]], ["Ease of use", NOTE.sky, ["Too many steps", "Menu is confusing", "Hard to find help"]], ["Price", NOTE.pink, ["Shipping costs", "Wants a bundle", "Student discount?"]], ["Wishes", NOTE.mint, ["Dark mode", "Save for later", "Gift wrapping"]]];
      const out = [];
      groups.forEach(([name, color, notes], g) => {
        const x = (g % 2) * 600, y = Math.floor(g / 2) * 470;
        out.push(makeFrame({ x, y, w: 560, h: 420, name, fill: "#fbfbfe" }));
        out.push(pill(x + 20, y + 20, 220, name, "#1b2133", 44, 18));
        th(notes, g * 3).forEach((text, i) => out.push(makeNote({ x: x + 20 + i * 178, y: y + 100 + (i % 2) * 120, w: 160, h: 160, color, text, size: 20 })));
      });
      return out;
    },
  },
  {
    id: "orgchart", name: "Org chart", desc: "Who leads which team, with lines that follow the boxes.",
    build() {
      const mk = (x, y, text, fill, stroke) => box(x, y, 200, 80, text, fill, stroke, { size: 17, bold: true });
      const ceo = mk(400, 0, who(["Team lead\nAyesha Khan"])[0], "#5b4cf0", "#5b4cf0");
      ceo.textColor = "#ffffff";
      const hn = who(["Design\nBilal", "Sales\nSara", "Support\nOmar"], 1);
      const heads = [[100, hn[0], "#e8e5fe", C.violet], [400, hn[1], "#dbeafe", C.blue], [700, hn[2], "#ccfbf1", C.teal]].map(([x, t, f, s]) => mk(x, 170, t, f, s));
      const out = [ceo, ...heads];
      heads.forEach((h, i) => {
        out.push(link(ceo, h, { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top" }));
        for (let k = 0; k < 2; k++) {
          const m = box(h.x + 20, 320 + k * 110, 160, 70, ["Team member", "New role"][k], "#ffffff", h.stroke, { size: 15 });
          out.push(m, link(h, m, { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "left" }));
        }
      });
      return out;
    },
  },
  {
    id: "priority-matrix", name: "Priority matrix", desc: "Urgent and important: do, plan, share or drop.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 900, h: 760, name: "Priority matrix" });
      const out = [frame, makeText({ x: 120, y: 24, w: 360, text: "Urgent", size: 22, bold: true, align: "center" }), makeText({ x: 480, y: 24, w: 360, text: "Not urgent", size: 22, bold: true, align: "center" })];
      const q = [["Do now", "#dcfce7", C.green], ["Plan a time", "#dbeafe", C.blue], ["Ask for help", "#fef3c7", C.amber], ["Drop it", "#ffe4e6", C.rose]];
      q.forEach(([t, f, st], i) => out.push(box(120 + (i % 2) * 370, 70 + Math.floor(i / 2) * 340, 350, 320, t, f, st, { size: 26, bold: true })));
      out.push(makeText({ x: 10, y: 210, w: 100, text: "Important", size: 18, bold: true, align: "center" }), makeText({ x: 10, y: 550, w: 100, text: "Less important", size: 18, bold: true, align: "center" }));
      out.push(makeNote({ x: 140, y: 262, w: 120, h: 120, color: NOTE.yellow, text: th(["Reply to the client"], 5)[0], size: 20 }));
      return out;
    },
  },
  {
    id: "empathy-map", name: "Empathy map", desc: "What a person says, thinks, does and feels.",
    build() {
      const out = [];
      const q = [["Says", NOTE.sky, "\"I need this to be quick.\""], ["Thinks", NOTE.lilac, "Will this save me time?"], ["Does", NOTE.mint, "Compares three apps"], ["Feels", NOTE.pink, "A little worried"]];
      q.forEach(([t, color, note], i) => {
        const x = (i % 2) * 460, y = Math.floor(i / 2) * 400;
        out.push(box(x, y, 440, 380, "", "#fbfbfe", "#d5d9e6", { sw: 1.5 }));
        out.push(pill(x + 20, y + 20, 160, t, "#1b2133", 44, 18));
        out.push(makeNote({ x: x + 40, y: y + 100, w: 170, h: 170, color, text: note, size: 20 }));
      });
      const p = box(350, 300, 200, 180, "Our customer\nName, age, job", "#ffffff", C.violet, { kind: "ellipse", size: 18, bold: true, sw: 3 });
      out.push(p);
      return out;
    },
  },
  {
    id: "business-canvas", name: "Business plan on a page", desc: "Nine boxes for a whole business idea.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1300, h: 820, name: tv("Business plan on a page", (t) => `${t}: plan on a page`) });
      const cells = [[20, 20, 240, 520, "Partners"], [270, 20, 240, 255, "Key activities"], [270, 285, 240, 255, "Resources"], [520, 20, 260, 520, "What we offer"], [790, 20, 240, 255, "Customer care"], [790, 285, 240, 255, "Channels"], [1040, 20, 240, 520, "Customers"], [20, 550, 630, 250, "Costs"], [660, 550, 620, 250, "Income"]];
      const out = [frame];
      cells.forEach(([x, y, w, h, t], i) => {
        const b = box(x, y, w, h, "", i % 2 ? "#f6f5ff" : "#f1fbf9", "#d5d9e6", { sw: 1.5, kind: "rect" });
        out.push(b, makeText({ x: x + 14, y: y + 12, w: w - 28, text: t, size: 20, bold: true }));
      });
      out.push(makeNote({ x: 560, y: 90, w: 180, h: 160, color: NOTE.yellow, text: "Main promise to customers", size: 20 }));
      return out;
    },
  },
  {
    id: "meeting", name: "Meeting agenda", desc: "Agenda, notes, decisions and next steps with owners.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1100, h: 700, name: "Team meeting" });
      const out = [frame, title(30, 24, 1000, tv("Weekly team meeting", (t) => `${t} meeting`), C.ink, 36)];
      out[1].align = "left";
      out.push(...makeTable({ x: 30, y: 100, cols: 3, rows: 5, cw: 170, ch: 56, cells: CUR?.items ? [["Time", "Topic", "Who"], ...["10:00", "10:10", "10:25", "10:40"].map((tm, i) => [tm, CUR.items[i * 2], CUR.people[i].split(",")[0]])] : [["Time", "Topic", "Who"], ["10:00", "Welcome", "Hina"], ["10:05", "Last week", "Ali"], ["10:20", "New ideas", "All"], ["10:40", "Next steps", "Hina"]] }));
      out.push(pill(600, 100, 200, "Decisions", "#5b4cf0", 46, 18), makeNote({ x: 600, y: 170, w: 210, h: 180, color: NOTE.lilac, text: th(["We launch on Friday"], 9)[0], size: 22 }));
      out.push(pill(850, 100, 220, "Next steps", "#14b8a6", 46, 18), makeNote({ x: 850, y: 170, w: 210, h: 180, color: NOTE.mint, text: tv("Ali sends the plan by Tuesday", () => `${CUR.people[1].split(",")[0]}: ${low(CUR.items[10])} by Tuesday`), size: 22 }));
      out.push(pill(30, 420, 200, "Notes", "#1b2133", 46, 18), makeNote({ x: 30, y: 490, w: 200, h: 180, color: NOTE.yellow, text: "Write a note", size: 22 }));
      return out;
    },
  },
  {
    id: "pros-cons", name: "Pros and cons", desc: "Weigh a decision: good points, bad points, the choice.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 900, h: 640, name: "Pros and cons" });
      const out = [frame, title(30, 24, 840, tv("Should we open a second shop?", (t) => `Go ahead with the ${low(t)}?`), C.ink, 32)];
      out.push(pill(40, 100, 390, "Pros", "#16a34a"), pill(470, 100, 390, "Cons", "#e11d48"));
      th(["More customers nearby", "Room for a café corner"], 1).forEach((t, i) => out.push(makeNote({ x: 50 + i * 190, y: 180, w: 170, h: 170, color: NOTE.mint, text: t, size: 20 })));
      th(["Higher rent", "Need two new staff"], 7).forEach((t, i) => out.push(makeNote({ x: 480 + i * 190, y: 180, w: 170, h: 170, color: NOTE.pink, text: t, size: 20 })));
      out.push(box(250, 420, 400, 120, "Our choice:", "#fef3c7", C.amber, { size: 24, bold: true }));
      return out;
    },
  },
  {
    id: "storyboard", name: "Storyboard", desc: "Six scenes with a picture box and a caption each.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1120, h: 760, name: "Storyboard" });
      const out = [frame];
      ["Opening shot", "Meet the hero", "The problem", "Trying things", "The answer", "Happy ending"].forEach((t, i) => {
        const x = 30 + (i % 3) * 365, y = 30 + Math.floor(i / 3) * 365;
        out.push(box(x, y, 335, 220, "Scene " + (i + 1), "#eef0f6", "#c9cede", { size: 18, sw: 1.5, kind: "rect" }));
        out.push(makeText({ x, y: y + 236, w: 335, text: t, size: 20, bold: true }), makeText({ x, y: y + 270, w: 335, text: "What happens here", size: 16, color: "#6a7389" }));
      });
      return out;
    },
  },
  {
    id: "crazy-eights", name: "Crazy eights", desc: "Eight quick sketch boxes, one idea in each.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1160, h: 640, name: tv("Crazy eights", (t) => `${t}: eight quick ideas`) });
      const out = [frame];
      const ideas = th(["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5", "Idea 6", "Idea 7", "Idea 8"], 0);
      ideas.forEach((t, i) => {
        const x = 30 + (i % 4) * 280, y = 30 + Math.floor(i / 4) * 300;
        out.push(box(x, y, 260, 280, "", "#ffffff", "#c9cede", { kind: "rect", sw: 1.5 }));
        out.push(makeText({ x: x + 14, y: y + 12, w: 232, text: `${i + 1}. ${t}`, size: 18, bold: true }));
        out.push(box(x + 40, y + 70, 180, 120, "Sketch here", "#f4f5fa", "#e3e6f0", { kind: "rect", sw: 1, size: 14 }));
      });
      out.push(makeNote({ x: 1000, y: 470, w: 140, h: 140, color: NOTE.yellow, text: "8 minutes, go!", size: 20 }));
      return out;
    },
  },
  {
    id: "okr", name: "Goals and key results", desc: "Three goals, each with results you can measure.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 720, name: tv("Goals and key results", (t) => `${t} goals`) });
      const out = [frame, title(30, 24, 1120, tv("This quarter's goals", (t) => `${t}: this quarter's goals`), C.ink, 36)];
      const goals = [["Goal 1: Happier customers", C.violet, NOTE.lilac], ["Goal 2: Grow faster", C.teal, NOTE.mint], ["Goal 3: Work smarter", C.amber, NOTE.yellow]];
      goals.forEach(([g, col, note], i) => {
        const x = 30 + i * 380;
        out.push(pill(x, 100, 360, g, col, 52, 19));
        th(["Score 9 out of 10 in the survey", "Answer every message in a day", "Fewer returns"], i * 3).forEach((t, k) => out.push(makeNote({ x: x + 10 + (k % 2) * 175, y: 180 + Math.floor(k / 2) * 190, w: 165, h: 165, color: note, text: t, size: 20 })));
        out.push(box(x + 185, 370, 165, 60, "Progress: 0%", "#ffffff", col, { size: 16, bold: true }));
      });
      return out;
    },
  },
  {
    id: "stakeholder-map", name: "Stakeholder map", desc: "Who has power and who cares: keep close, keep happy, inform.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 960, h: 800, name: tv("Stakeholder map", (t) => `${t} stakeholders`) });
      const out = [frame];
      const q = [["Keep happy", "#fef3c7", C.amber], ["Work closely", "#dcfce7", C.green], ["Watch", "#f1f2f8", "#9aa1b5"], ["Keep informed", "#dbeafe", C.blue]];
      q.forEach(([t, f, st], i) => out.push(box(110 + (i % 2) * 420, 40 + Math.floor(i / 2) * 360, 400, 340, "", f, st, { kind: "rect", sw: 1.5 }), makeText({ x: 130 + (i % 2) * 420, y: 56 + Math.floor(i / 2) * 360, w: 360, text: t, size: 22, bold: true })));
      out.push(makeText({ x: 10, y: 380, w: 90, text: "More power", size: 16, bold: true, align: "center" }), makeText({ x: 400, y: 752, w: 340, text: "More interest", size: 16, bold: true, align: "center" }));
      who(["Owner", "Bank", "Customers", "Suppliers", "Staff", "Neighbours"]).forEach((t, i) => out.push(makeNote({ x: 150 + (i % 2) * 420 + (i > 3 ? 160 : 0), y: 120 + Math.floor((i % 4) / 2) * 360, w: 140, h: 120, color: [NOTE.yellow, NOTE.mint, NOTE.sky, NOTE.peach, NOTE.lilac, NOTE.pink][i], text: t, size: 18 })));
      return out;
    },
  },
  {
    id: "pest", name: "PEST analysis", desc: "Political, economic, social and technology factors.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1240, h: 680, name: tv("PEST analysis", (t) => `${t}: PEST analysis`) });
      const out = [frame];
      const cols = [["Political", C.violet, NOTE.lilac], ["Economic", C.teal, NOTE.mint], ["Social", C.amber, NOTE.yellow], ["Technology", C.blue, NOTE.sky]];
      cols.forEach(([t, col, note], i) => {
        const x = 30 + i * 300;
        out.push(column(x, 30, 280, 620), pill(x, 30, 280, t, col, 56, 21));
        th(["New rules", "Prices going up", "What people like now", "New apps to use"], i).forEach((n, k) => { if (k < 2) out.push(makeNote({ x: x + 20, y: 110 + k * 260, w: 240, h: 230, color: note, text: k ? "Add a factor" : n, size: 22 })); });
      });
      return out;
    },
  },
  {
    id: "lesson-plan", name: "Lesson plan", desc: "Goal, warm-up, main activity, practice and wrap-up with times.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1300, h: 600, name: tv("Lesson plan", (t) => `${t} session plan`) });
      const out = [frame, title(30, 24, 1240, tv("Today's lesson", (t) => `${t}: today's session`), C.ink, 36)];
      const parts = [["Goal", "5 min", NOTE.lilac], ["Warm-up", "10 min", NOTE.yellow], ["Main activity", "20 min", NOTE.sky], ["Practice", "15 min", NOTE.mint], ["Wrap-up", "5 min", NOTE.peach]];
      parts.forEach(([t, time, color], i) => {
        const x = 30 + i * 250;
        out.push(pill(x, 100, 230, t, i % 2 ? C.teal : C.violet, 48, 19), box(x + 70, 160, 90, 34, time, "#ffffff", "#c9cede", { size: 14, bold: true, sw: 1 }));
        out.push(makeNote({ x: x + 15, y: 220, w: 200, h: 200, color, text: th(["What students will learn", "A quick question game", "Group work", "Try it alone", "Share one thing learned"], i * 2)[i], size: 20 }));
      });
      out.push(makeText({ x: 30, y: 460, w: 1240, text: "Materials: board, markers, worksheets", size: 18, color: "#6a7389" }));
      return out;
    },
  },
  {
    id: "decision-tree", name: "Decision tree", desc: "One question, two options, and what each leads to.",
    build() {
      const q = box(380, 0, 240, 130, tv("Which way should we go?", (t) => `${t}: which way?`), "#fef3c7", C.amber, { kind: "diamond", size: 17, bold: true });
      const a = box(120, 220, 220, 80, th(["Option A"], 0)[0], "#e8e5fe", C.violet, { size: 17, bold: true });
      const b = box(660, 220, 220, 80, th(["Option B"], 1)[0], "#ccfbf1", C.teal, { size: 17, bold: true });
      const outs = [[0, 400, "Good result", "#dcfce7", C.green], [240, 400, "Risk", "#ffe4e6", C.rose], [540, 400, "Good result", "#dcfce7", C.green], [780, 400, "Risk", "#ffe4e6", C.rose]].map(([x, y, t, f, st]) => box(x, y, 200, 76, t, f, st, { size: 16 }));
      return [q, a, b, ...outs, link(q, a, { kind: "elbow", text: "Yes", fromSide: "left", toSide: "top" }), link(q, b, { kind: "elbow", text: "No", fromSide: "right", toSide: "top" }),
        link(a, outs[0], { kind: "elbow", fromSide: "bottom", toSide: "top" }), link(a, outs[1], { kind: "elbow", fromSide: "bottom", toSide: "top" }), link(b, outs[2], { kind: "elbow", fromSide: "bottom", toSide: "top" }), link(b, outs[3], { kind: "elbow", fromSide: "bottom", toSide: "top" })];
    },
  },
  {
    id: "mood-board", name: "Mood board", desc: "Picture spaces, colours and words for a look and feel.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1200, h: 720, name: tv("Mood board", (t) => `${t} mood board`) });
      const out = [frame, title(30, 24, 700, tv("Look and feel", (t) => t), C.ink, 40)];
      out[1].align = "left";
      [[30, 100, 360, 260], [410, 100, 260, 380], [690, 100, 480, 220], [30, 380, 360, 300], [690, 340, 230, 340]].forEach(([x, y, w, h], i) => out.push(box(x, y, w, h, "Drop a photo here", ["#e8e5fe", "#dbeafe", "#ccfbf1", "#fef3c7", "#ffe4e6"][i], "#ffffff", { kind: "rect", size: 15, sw: 0 })));
      [C.violet, C.teal, C.amber, C.rose].forEach((c, i) => out.push(box(940 + (i % 2) * 120, 350 + Math.floor(i / 2) * 120, 100, 100, "", c, "#ffffff", { kind: "ellipse", sw: 4 })));
      th(["Warm", "Friendly", "Simple"], 0).forEach((t, i) => out.push(makeNote({ x: 410 + i * 90, y: 500 + (i % 2) * 40, w: 120, h: 120, color: [NOTE.yellow, NOTE.pink, NOTE.mint][i], text: t, size: 18 })));
      return out;
    },
  },
  {
    id: "check-in", name: "Team check-in", desc: "How is everyone feeling? Vote with a dot, add a note.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1150, h: 560, name: "Check-in" });
      const out = [frame, title(30, 24, 1090, tv("How are you feeling today?", (t) => `${t}: how are you feeling?`), C.ink, 38)];
      [["Great", C.green], ["Good", C.teal], ["Okay", C.amber], ["Tired", C.violet], ["Busy", C.rose]].forEach(([t, c], i) => {
        const x = 40 + i * 220;
        out.push(box(x, 110, 180, 180, t, c, c, { kind: "ellipse", size: 26, bold: true, textColor: "#ffffff" }));
        out.push(box(x + 60, 310, 26, 26, "", "#1b2133", "#ffffff", { kind: "ellipse", sw: 3 }));
      });
      out.push(makeNote({ x: 40, y: 370, w: 160, h: 150, color: NOTE.yellow, text: th(["One win this week"], 3)[0], size: 20 }), makeNote({ x: 260, y: 370, w: 160, h: 150, color: NOTE.sky, text: "One thing I need", size: 20 }));
      return out;
    },
  },
  {
    id: "start-stop-continue", name: "Start, stop, continue", desc: "A quick retro: what to start, stop and keep doing.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1120, h: 640, name: tv("Start, stop, continue", (t) => `${t}: start, stop, continue`) });
      const out = [frame];
      [["Start", C.green, NOTE.mint, "Begin doing"], ["Stop", C.rose, NOTE.pink, "No longer do"], ["Continue", C.blue, NOTE.sky, "Keep doing"]].forEach(([t, col, note, sub], i) => {
        const x = 30 + i * 365;
        out.push(box(x, 30, 340, 580, "", "#ffffff", col, { sw: 3 }), pill(x + 20, 50, 300, t, col, 54, 22), makeText({ x: x + 20, y: 116, w: 300, text: sub, size: 16, color: "#6a7389", align: "center" }));
        th(["Weekly demos", "Share notes early"], i * 2).forEach((n, k) => out.push(makeNote({ x: x + 20 + k * 155, y: 160 + k * 60, w: 145, h: 145, color: note, text: n, size: 18 })));
      });
      return out;
    },
  },
  {
    id: "four-ls", name: "4 Ls retrospective", desc: "Liked, learned, lacked and longed for.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1000, h: 760, name: tv("4 Ls retrospective", (t) => `${t}: 4 Ls`) });
      const out = [frame];
      [["Liked", NOTE.mint, "#dcfce7", C.green], ["Learned", NOTE.sky, "#dbeafe", C.blue], ["Lacked", NOTE.pink, "#ffe4e6", C.rose], ["Longed for", NOTE.lilac, "#e8e5fe", C.violet]].forEach(([t, note, tint, col], i) => {
        const x = 20 + (i % 2) * 490, y = 20 + Math.floor(i / 2) * 370;
        out.push(box(x, y, 470, 350, "", tint, tint, { kind: "rect", sw: 1 }), makeText({ x: x + 22, y: y + 18, w: 300, text: t, size: 30, bold: true, color: col }));
        th(["Add a sticky"], i * 3).forEach((n) => out.push(makeNote({ x: x + 30, y: y + 90, w: 160, h: 160, color: note, text: n, size: 20 })));
      });
      return out;
    },
  },
  {
    id: "sailboat", name: "Sailboat retrospective", desc: "Wind that helps, anchors that slow, rocks ahead and the island goal.",
    build() {
      const out = [box(0, 520, 1200, 160, "", "#dbeafe", "#dbeafe", { kind: "rect", sw: 0 }), title(0, -70, 1200, tv("Our sailboat", (t) => `${t} sailboat`), C.ink, 40)];
      out.push(box(470, 300, 260, 70, "", "#7c4a2d", "#7c4a2d", { kind: "rounded" }), box(560, 90, 140, 200, "", "#ffffff", "#9aa1b5", { kind: "triangle", sw: 2 }), free(590, 290, 590, 90, { sw: 4, stroke: "#7c4a2d" }));
      out.push(box(960, 400, 220, 120, "Island\nOur goal", "#fef3c7", C.amber, { kind: "ellipse", bold: true }), box(60, 560, 160, 90, "Rocks\nRisks ahead", "#9aa1b5", "#6a7389", { kind: "rounded", bold: true, textColor: "#ffffff" }));
      out.push(free(590, 370, 560, 610, { sw: 3, stroke: "#334155" }), box(520, 600, 90, 60, "Anchor", "#334155", "#334155", { size: 14, bold: true, textColor: "#ffffff" }));
      out.push(makeText({ x: 40, y: 60, w: 300, text: "Wind: what pushes us forward", size: 18, bold: true }), makeText({ x: 760, y: 560, w: 400, text: "Anchors: what slows us down", size: 18, bold: true, color: "#1b2133" }));
      th(["Good teamwork", "Clear goals"], 0).forEach((t, i) => out.push(makeNote({ x: 40 + i * 160, y: 110, w: 145, h: 135, color: NOTE.mint, text: t, size: 18 })));
      th(["Slow approvals"], 4).forEach((t) => out.push(makeNote({ x: 260, y: 560, w: 150, h: 110, color: NOTE.pink, text: t, size: 18 })));
      th(["Budget cuts"], 6).forEach((t) => out.push(makeNote({ x: 760, y: 600, w: 150, h: 100, color: NOTE.peach, text: t, size: 18 })));
      return out;
    },
  },
  {
    id: "lean-canvas", name: "Lean canvas", desc: "Problem, solution, unique value, customers and money on one page.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1320, h: 760, name: tv("Lean canvas", (t) => `${t}: lean canvas`) });
      const out = [frame];
      const W = 252, cells = [[0, 0, 1, 2, "Problem", "Top 3 problems"], [1, 0, 1, 1, "Solution", "Top 3 features"], [1, 1, 1, 1, "Key numbers", "What we measure"], [2, 0, 1, 2, "Unique value", "One clear message"], [3, 0, 1, 1, "Unfair advantage", "Hard to copy"], [3, 1, 1, 1, "Channels", "How we reach people"], [4, 0, 1, 2, "Customers", "Who has the problem"]];
      for (const [c, r, cw, rh, t, sub] of cells) {
        const x = 20 + c * (W + 4), y = 20 + r * 254, h = rh * 254 - 4;
        out.push(box(x, y, W * cw, h, "", c === 2 ? "#f6f5ff" : "#ffffff", "#c9cede", { kind: "rect", sw: 1.5 }), makeText({ x: x + 14, y: y + 12, w: W - 28, text: t, size: 20, bold: true }), makeText({ x: x + 14, y: y + 42, w: W - 28, text: sub, size: 14, color: "#6a7389" }));
      }
      out.push(box(20, 530, 638, 210, "", "#ffffff", "#c9cede", { kind: "rect", sw: 1.5 }), makeText({ x: 34, y: 542, w: 400, text: "Costs", size: 20, bold: true }), box(662, 530, 638, 210, "", "#ffffff", "#c9cede", { kind: "rect", sw: 1.5 }), makeText({ x: 676, y: 542, w: 400, text: "Income", size: 20, bold: true }));
      th(["Customers wait too long", "Simple online booking"], 0).forEach((t, i) => out.push(makeNote({ x: 40 + i * 256, y: 100, w: 150, h: 140, color: i ? NOTE.mint : NOTE.pink, text: t, size: 18 })));
      out.push(makeNote({ x: 570, y: 100, w: 170, h: 150, color: NOTE.yellow, text: tv("Fast, friendly, fair", (t) => `The easiest ${low(t)}`), size: 20 }));
      return out;
    },
  },
  {
    id: "story-map", name: "User story map", desc: "Big steps across, details below, sliced into releases.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1260, h: 780, name: tv("User story map", (t) => `${t}: story map`) });
      const out = [frame];
      const acts = ["Find", "Choose", "Pay", "Get it", "Get help"];
      acts.forEach((a, i) => {
        const x = 140 + i * 220;
        out.push(pill(x, 30, 200, a, C.violet, 50, 20));
        th(["Search", "Compare", "Checkout", "Track", "Chat"], i).slice(0, 1).forEach((t) => out.push(makeNote({ x, y: 100, w: 200, h: 110, color: NOTE.sky, text: t, size: 20 })));
        out.push(makeNote({ x: x + 10, y: 300, w: 180, h: 120, color: NOTE.yellow, text: th(["Basic version"], i * 2)[0], size: 18 }));
        if (i % 2 === 0) out.push(makeNote({ x: x + 10, y: 540, w: 180, h: 120, color: NOTE.peach, text: th(["Nice extra"], i * 2 + 1)[0], size: 18 }));
      });
      out.push(free(20, 260, 1240, 260, { stroke: "#9aa1b5", sw: 2 }), makeText({ x: 20, y: 300, w: 110, text: "Release 1", size: 18, bold: true, color: C.violet }));
      out.push(free(20, 500, 1240, 500, { stroke: "#9aa1b5", sw: 2 }), makeText({ x: 20, y: 540, w: 110, text: "Release 2", size: 18, bold: true, color: C.teal }));
      out.push(makeText({ x: 20, y: 120, w: 110, text: "Steps", size: 18, bold: true }), makeText({ x: 20, y: 42, w: 110, text: "Journey", size: 18, bold: true }));
      return out;
    },
  },
  {
    id: "impact-effort", name: "Impact and effort matrix", desc: "Quick wins, big bets, fill-ins and time sinks on a 2×2.",
    build() {
      const out = [title(0, -60, 900, tv("Impact and effort", (t) => `${t}: impact and effort`), C.ink, 36)];
      out.push(free(60, 780, 60, 0, { arrow: "end", sw: 3 }), free(60, 780, 880, 780, { arrow: "end", sw: 3 }));
      out.push(makeText({ x: 400, y: 790, w: 200, text: "More effort", size: 18, bold: true, align: "center" }), makeText({ x: -60, y: 360, w: 110, text: "More impact", size: 18, bold: true, align: "center" }));
      [["Quick wins", "#dcfce7"], ["Big bets", "#dbeafe"], ["Fill-ins", "#fef3c7"], ["Time sinks", "#ffe4e6"]].forEach(([t, f], i) => {
        const x = 80 + (i % 2) * 400, y = 10 + Math.floor(i / 2) * 385;
        out.push(box(x, y, 390, 375, "", f, f, { kind: "rect", sw: 0 }), makeText({ x: x + 16, y: y + 14, w: 300, text: t, size: 24, bold: true }));
      });
      th(["Fix the sign-up form", "New app", "Tidy the files", "Rebuild everything"], 0).forEach((t, i) => out.push(makeNote({ x: 120 + (i % 2) * 400, y: 80 + Math.floor(i / 2) * 385, w: 150, h: 140, color: [NOTE.mint, NOTE.sky, NOTE.yellow, NOTE.pink][i], text: t, size: 18 })));
      return out;
    },
  },
  {
    id: "sprint-planning", name: "Sprint planning", desc: "Sprint goal, backlog, what fits, team capacity and risks.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1260, h: 700, name: tv("Sprint planning", (t) => `${t} sprint`) });
      const out = [frame, box(30, 30, 1200, 80, tv("Sprint goal: a smoother checkout", (t) => `Sprint goal: ${low(t)} ready to share`), "#e8e5fe", C.violet, { size: 22, bold: true })];
      out.push(column(30, 140, 360, 530), header(30, 140, 360, "Backlog", "#f1f2f8"), column(420, 140, 360, 530), header(420, 140, 360, "In this sprint", "#ffe27a"));
      th(["Login with phone", "Order history", "Gift cards", "Faster search"], 0).forEach((t, i) => out.push(makeNote({ x: 45 + (i % 2) * 170, y: 215 + Math.floor(i / 2) * 170, w: 155, h: 155, color: NOTE.lilac, text: t, size: 18 })));
      th(["Fix the cart", "Pay by card"], 6).forEach((t, i) => out.push(makeNote({ x: 435 + i * 170, y: 215, w: 155, h: 155, color: NOTE.yellow, text: t, size: 18 })));
      out.push(makeText({ x: 820, y: 140, w: 400, text: "Team capacity", size: 20, bold: true }));
      out.push(...makeTable({ x: 820, y: 180, cols: 2, rows: 4, cw: 200, ch: 48, cells: [["Person", "Days"], ...who(["Ali", "Sara", "Omar"], 0).map((p, i) => [p.split("\n")[0], String([8, 6, 9][i])])] }));
      out.push(pill(820, 420, 200, "Risks", C.rose, 44, 18), makeNote({ x: 820, y: 480, w: 180, h: 160, color: NOTE.pink, text: th(["Holiday on Friday"], 9)[0], size: 18 }));
      return out;
    },
  },
  {
    id: "pi-planning", name: "Program board", desc: "Teams by rows, sprints by columns, with dependencies.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1300, h: 640, name: tv("Program board", (t) => `${t}: program board`) });
      const out = [frame];
      const its = ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4", "Sprint 5"], teams = [["Team Blue", C.blue, NOTE.sky], ["Team Green", C.green, NOTE.mint], ["Team Orange", C.amber, NOTE.peach]];
      its.forEach((t, i) => out.push(box(200 + i * 215, 20, 205, 50, t, "#1b2133", "#1b2133", { bold: true, textColor: "#ffffff" })));
      const notes = [];
      teams.forEach(([t, col, note], r) => {
        const y = 90 + r * 180;
        out.push(box(20, y, 170, 170, t, col, col, { bold: true, textColor: "#ffffff", size: 20 }));
        for (let i = 0; i < 5; i++) out.push(box(200 + i * 215, y, 205, 170, "", "#f7f8fc", "#e3e6f0", { kind: "rect", sw: 1 }));
        [r, r + 2].forEach((i, k) => { const n = makeNote({ x: 215 + i * 215, y: y + 15, w: 175, h: 140, color: note, text: th(["Feature"], r * 2 + k)[0], size: 18 }); notes.push(n); out.push(n); });
      });
      out.push(link(notes[0], notes[3], { stroke: C.rose, kind: "elbow" }), link(notes[2], notes[5], { stroke: C.rose, kind: "elbow" }), box(1080, 590, 200, 36, "Red line = depends on", "#ffffff", C.rose, { size: 13, sw: 1 }));
      return out;
    },
  },
  {
    id: "get-to-know", name: "Get to know the team", desc: "An icebreaker card for every person: photo, name and fun facts.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1200, h: 720, name: "Icebreaker" });
      const out = [frame, title(30, 24, 1140, tv("Get to know the team", (t) => `${t} team: get to know us`), C.ink, 38)];
      const names = who(["Ali\nDesign", "Sara\nSales", "Omar\nSupport", "Hina\nOffice", "Bilal\nTech", "Noor\nMarketing"]);
      names.forEach((n, i) => {
        const x = 30 + (i % 3) * 385, y = 100 + Math.floor(i / 3) * 305;
        out.push(box(x, y, 365, 285, "", "#ffffff", "#d5d9e6", { sw: 1.5 }), box(x + 20, y + 20, 90, 90, "Photo", [NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.peach, NOTE.pink, NOTE.yellow][i], "#ffffff", { kind: "ellipse", size: 13, sw: 3 }));
        out.push(makeText({ x: x + 125, y: y + 38, w: 220, text: n, size: 20, bold: true }));
        out.push(makeNote({ x: x + 20, y: y + 130, w: 155, h: 135, color: NOTE.yellow, text: "A fun fact", size: 18 }), makeNote({ x: x + 190, y: y + 130, w: 155, h: 135, color: NOTE.sky, text: "Favourite food", size: 18 }));
      });
      return out;
    },
  },
  {
    id: "gantt", name: "Gantt chart", desc: "Tasks down the side, weeks across, bars and milestones.",
    build() {
      const weeks = 8, cw = 120, x0 = 260;
      const frame = makeFrame({ x: 0, y: 0, w: x0 + weeks * cw + 30, h: 600, name: tv("Gantt chart", (t) => `${t} schedule`) });
      const out = [frame];
      for (let i = 0; i < weeks; i++) out.push(box(x0 + i * cw, 20, cw - 4, 40, "Week " + (i + 1), "#f1f2f8", "#e3e6f0", { kind: "rect", size: 14, bold: true, sw: 1 }));
      const tasks = th(["Plan", "Design", "Build", "Test", "Launch", "Review"], 0), spans = [[0, 1], [1, 3], [2, 6], [5, 7], [7, 8], [7, 8]], cols = [C.violet, C.blue, C.teal, C.amber, C.rose, C.green];
      tasks.forEach((t, r) => {
        const y = 80 + r * 80;
        out.push(makeText({ x: 24, y: y + 16, w: 220, text: t, size: 18, bold: true }), free(20, y + 70, x0 + weeks * cw, y + 70, { stroke: "#eef0f6", sw: 1 }));
        const [a, b] = spans[r];
        if (r === 4) out.push(box(x0 + a * cw + 38, y + 8, 44, 44, "", C.rose, C.rose, { kind: "diamond" }));
        else out.push(box(x0 + a * cw + 4, y + 12, (b - a) * cw - 12, 40, "", cols[r], cols[r], { kind: "rounded" }));
      });
      out.push(makeText({ x: x0 + 7 * cw + 2, y: 384, w: 140, text: "Launch day", size: 14, bold: true, color: C.rose }));
      return out;
    },
  },
  {
    id: "swimlanes", name: "Swimlane flowchart", desc: "Who does what: a lane for each person or team.",
    build() {
      const lanes = who(["Customer", "Shop", "Delivery"]).map((t) => t.split("\n")[0]);
      const out = [];
      lanes.forEach((l, i) => out.push(box(0, i * 200, 1240, 190, "", i % 2 ? "#f7f8fc" : "#ffffff", "#d5d9e6", { kind: "rect", sw: 1 }), box(0, i * 200, 150, 190, l, ["#e8e5fe", "#ccfbf1", "#fef3c7"][i], "#d5d9e6", { kind: "rect", bold: true, size: 18, sw: 1 })));
      const step = (x, lane, text, kind = "rounded", f = "#ffffff") => box(x, lane * 200 + 55, 170, 80, text, f, [C.violet, C.teal, C.amber][lane], { kind, size: 16 });
      const s = [step(190, 0, "Places an order", "ellipse", "#dcfce7"), step(420, 1, th(["Checks the stock"], 0)[0]), step(650, 1, "In stock?", "diamond", "#fef3c7"), step(880, 2, "Packs and ships"), step(1050, 0, "Gets the parcel", "ellipse", "#dcfce7")];
      s[4].x = 1050; s[4].w = 170;
      out.push(...s, link(s[0], s[1], { kind: "elbow" }), link(s[1], s[2], { kind: "elbow" }), link(s[2], s[3], { kind: "elbow", text: "Yes" }), link(s[3], s[4], { kind: "elbow" }));
      return out;
    },
  },
  {
    id: "concept-map", name: "Concept map", desc: "Ideas in circles joined by labelled lines.",
    build() {
      const mid = box(430, 260, 240, 140, tv("Big idea", (t) => t), C.violet, C.violet, { kind: "ellipse", size: 22, bold: true, textColor: "#ffffff" });
      const out = [mid];
      const words = th(["Who it helps", "What it needs", "Why it matters", "How we start", "What could stop it", "Who can help"], 0), verbs = ["helps", "needs", "because", "starts with", "watch for", "ask"];
      words.forEach((w, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2, x = 550 + Math.cos(a) * 420 - 90, y = 330 + Math.sin(a) * 270 - 55;
        const c = box(x, y, 180, 110, w, [NOTE.sky, NOTE.mint, NOTE.yellow, NOTE.peach, NOTE.pink, NOTE.lilac][i], "#9aa1b5", { kind: "ellipse", size: 17, sw: 1.5 });
        out.push(c, link(mid, c, { text: verbs[i], stroke: "#6a7389" }));
      });
      return out;
    },
  },
  {
    id: "workshop-agenda", name: "Workshop agenda", desc: "A timed agenda down the side and a parking lot for later.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 720, name: tv("Workshop", (t) => `${t} workshop`) });
      const out = [frame, title(30, 24, 700, tv("Ideas workshop", (t) => `${t} workshop`), C.ink, 38)];
      out[1].align = "left";
      const items = [["9:00", "Welcome and goals"], ["9:15", "Warm-up game"], ["9:30", "Ideas in pairs"], ["10:15", "Break"], ["10:30", "Vote on ideas"], ["11:00", "Next steps"]];
      out.push(free(100, 110, 100, 680, { stroke: C.violet, sw: 3 }));
      items.forEach(([tm, t], i) => {
        const y = 100 + i * 95;
        out.push(box(85, y + 8, 30, 30, "", "#ffffff", C.violet, { kind: "ellipse", sw: 4 }), makeText({ x: 130, y: y + 6, w: 80, text: tm, size: 18, bold: true, color: C.violet }), box(220, y, 380, 60, th([t], i * 2)[0], "#f6f5ff", "#e3e6f0", { size: 18, sw: 1 }));
      });
      out.push(box(680, 100, 470, 580, "", "#fff9e8", "#f2d98a", { sw: 1.5 }), makeText({ x: 700, y: 118, w: 400, text: "Parking lot", size: 24, bold: true }), makeText({ x: 700, y: 152, w: 420, text: "Good ideas for another day", size: 15, color: "#6a7389" }));
      out.push(makeNote({ x: 710, y: 200, w: 150, h: 140, color: NOTE.yellow, text: "Add an idea", size: 18 }));
      return out;
    },
  },
  {
    id: "persona", name: "Persona card", desc: "Who we design for: goals, frustrations and a quote.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1100, h: 640, name: tv("Persona", (t) => `${t}: persona`) });
      const out = [frame, box(30, 30, 330, 580, "", "#f6f5ff", "#e3e6f0", { sw: 1 }), box(115, 60, 160, 160, "Photo", NOTE.lilac, "#ffffff", { kind: "ellipse", sw: 4, size: 15 })];
      out.push(makeText({ x: 50, y: 240, w: 290, text: who(["Maya, 34\nShop owner"])[0], size: 24, bold: true, align: "center" }), makeText({ x: 50, y: 320, w: 290, text: "“I want things to just work.”", size: 18, align: "center", color: "#5d6478" }));
      out[out.length - 1].italic = true;
      [["Goals", C.green, NOTE.mint, ["Save time every day", "Grow the business"]], ["Frustrations", C.rose, NOTE.pink, ["Too many apps", "Slow replies"]], ["Habits", C.blue, NOTE.sky, ["Phone first", "Works late"]]].forEach(([t, col, note, items], i) => {
        const y = 30 + i * 200;
        out.push(pill(390, y, 180, t, col, 44, 18));
        th(items, i * 2).forEach((n, k) => out.push(makeNote({ x: 390 + k * 175, y: y + 54, w: 160, h: 130, color: note, text: n, size: 18 })));
      });
      return out;
    },
  },
  {
    id: "five-whys", name: "5 whys", desc: "Ask why five times to find the real cause.",
    build() {
      const out = [title(0, -60, 900, tv("Why did it happen?", (t) => `${t}: why did it happen?`), C.ink, 34)];
      const prob = box(250, 0, 400, 80, th(["The order arrived late"], 3)[0], C.rose, C.rose, { bold: true, textColor: "#ffffff", size: 20 });
      out.push(prob);
      let prev = prob;
      for (let i = 1; i <= 5; i++) {
        const b = box(300, 40 + i * 120, 300, 70, i < 5 ? "Because…" : "Real cause:", i < 5 ? "#ffffff" : "#dcfce7", i < 5 ? "#9aa1b5" : C.green, { size: 17, bold: i === 5 });
        out.push(b, makeText({ x: 180, y: 60 + i * 120, w: 110, text: "Why " + i + "?", size: 18, bold: true, color: C.violet }), link(prev, b, { fromSide: "bottom", toSide: "top" }));
        prev = b;
      }
      out.push(makeNote({ x: 660, y: 640, w: 170, h: 130, color: NOTE.yellow, text: "What we will change", size: 18 }));
      return out;
    },
  },
  {
    id: "experiment-board", name: "Experiment board", desc: "We believe, we will test, we will know when.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1240, h: 560, name: tv("Experiment board", (t) => `${t} experiment`) });
      const out = [frame];
      [["We believe", "#e8e5fe", C.violet, "Customers want quick booking"], ["We will test", "#dbeafe", C.blue, "A one-page booking form"], ["We will measure", "#ccfbf1", C.teal, "How many people finish"], ["We are right if", "#dcfce7", C.green, "Half finish in a minute"]].forEach(([t, f, col, note], i) => {
        const x = 30 + i * 300;
        out.push(box(x, 30, 280, 500, "", f, f, { sw: 0 }), makeText({ x: x + 18, y: 48, w: 250, text: t, size: 22, bold: true, color: col }), free(x + 280, 280, x + 300, 280, { arrow: i < 3 ? "end" : "none", stroke: col, sw: 3 }));
        out.push(makeNote({ x: x + 40, y: 120, w: 200, h: 180, color: [NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.lime][i], text: th([note], i * 3)[0], size: 20 }));
      });
      return out;
    },
  },
  {
    id: "month-calendar", name: "Monthly calendar", desc: "A month grid for plans, events and deadlines.",
    build() {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], cw = 160, ch = 120;
      const frame = makeFrame({ x: 0, y: 0, w: 20 + days.length * cw + 20, h: 120 + 5 * ch + 20, name: tv("This month", (t) => `${t}: this month`) });
      const out = [frame, makeText({ x: 24, y: 18, w: 600, text: tv("Month plan", (t) => `${t} month plan`), size: 30, bold: true })];
      days.forEach((d, i) => out.push(box(20 + i * cw, 70, cw - 4, 40, d, i > 4 ? "#dbeafe" : "#e8e5fe", i > 4 ? "#dbeafe" : "#e8e5fe", { kind: "rect", bold: true, size: 15 })));
      for (let k = 0; k < 35; k++) { const day = k - 1; const x = 20 + (k % 7) * cw, y = 116 + Math.floor(k / 7) * ch; out.push(box(x, y, cw - 4, ch - 4, "", "#ffffff", "#e3e6f0", { kind: "rect", sw: 1 })); if (day >= 0 && day < 30) out.push(makeText({ x: x + 8, y: y + 6, w: 40, text: String(day + 1), size: 14, bold: true, color: "#6a7389" })); }
      th(["Team lunch", "Deadline", "Launch day"], 2).forEach((t, i) => out.push(makeNote({ x: 20 + [3, 9, 18][i] % 7 * cw + 30, y: 116 + Math.floor([3, 9, 18][i] / 7) * ch + 24, w: 110, h: 84, color: [NOTE.yellow, NOTE.pink, NOTE.mint][i], text: t, size: 15 })));
      return out;
    },
  },
  {
    id: "project-kickoff", name: "Project kickoff", desc: "Why, what, who, when and risks for a new project.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1260, h: 720, name: tv("Project kickoff", (t) => `${t} kickoff`) });
      const out = [frame, title(30, 24, 1200, tv("Project kickoff", (t) => `${t} kickoff`), C.ink, 40)];
      [["Why", C.violet, NOTE.lilac, "The problem we solve"], ["What", C.blue, NOTE.sky, "What we will deliver"], ["Who", C.teal, NOTE.mint, "Team and roles"], ["When", C.amber, NOTE.yellow, "Key dates"], ["Risks", C.rose, NOTE.pink, "What could go wrong"]].forEach(([t, col, note, sub], i) => {
        const x = 30 + i * 245;
        out.push(box(x, 100, 230, 590, "", "#ffffff", col, { sw: 2 }), box(x, 100, 230, 64, t, col, col, { size: 24, bold: true, textColor: "#ffffff" }), makeText({ x: x + 14, y: 178, w: 202, text: sub, size: 15, color: "#6a7389", align: "center" }));
        out.push(makeNote({ x: x + 25, y: 220, w: 180, h: 160, color: note, text: th([sub], i * 2)[0], size: 18 }));
      });
      return out;
    },
  },
  {
    id: "funnel", name: "Funnel", desc: "From many people who hear about you to the few who buy again.",
    build() {
      const out = [title(0, -60, 1100, tv("Customer funnel", (t) => `${t} funnel`), C.ink, 36)];
      [["Hear about us", C.violet], ["Visit", C.blue], ["Try", C.teal], ["Buy", C.amber], ["Come back", C.rose]].forEach(([t, col], i) => {
        const w = 760 - i * 130;
        out.push(box(380 - w / 2 + 0, i * 110, w, 96, t, col, col, { size: 22, bold: true, textColor: "#ffffff" }));
        out.push(makeNote({ x: 820, y: i * 110 - 4, w: 260, h: 100, color: [NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.yellow, NOTE.pink][i], text: th(["How we do it"], i * 2)[0], size: 17 }));
      });
      return out;
    },
  },
  {
    id: "comparison", name: "Comparison table", desc: "Three options side by side, feature by feature.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 900, h: 560, name: tv("Compare options", (t) => `${t}: compare options`) });
      const out = [frame, title(30, 24, 840, tv("Which option is best?", (t) => `${t}: which option is best?`), C.ink, 32)];
      out.push(...makeTable({ x: 30, y: 100, cols: 4, rows: 6, cw: 210, ch: 64, head: "#e8e5fe", cells: [["", "Option A", "Option B", "Option C"], ["Price", "Low", "Medium", "High"], ["Speed", "Slow", "Fast", "Fast"], ["Quality", "Good", "Good", "Best"], ["Support", "Email", "Chat", "Phone"], ["Our pick", "", "Yes", ""]] }));
      out.push(makeNote({ x: 700, y: 470, w: 170, h: 70, color: NOTE.yellow, text: "Vote with a dot", size: 16 }));
      return out;
    },
  },
  {
    id: "daily-standup", name: "Daily stand-up", desc: "Yesterday, today and blockers for each person.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1120, h: 640, name: tv("Daily stand-up", (t) => `${t} stand-up`) });
      const out = [frame];
      ["Yesterday", "Today", "Blockers"].forEach((t, i) => out.push(pill(230 + i * 290, 30, 270, t, [C.blue, C.teal, C.rose][i], 50, 20)));
      who(["Ali", "Sara", "Omar"]).forEach((p, r) => {
        const y = 110 + r * 170;
        out.push(box(30, y, 180, 150, p, ["#e8e5fe", "#ccfbf1", "#fef3c7"][r], "#d5d9e6", { bold: true, size: 18, sw: 1 }));
        [NOTE.sky, NOTE.mint, NOTE.pink].forEach((c, i) => out.push(makeNote({ x: 230 + i * 290 + 55, y, w: 160, h: 150, color: c, text: i === 2 && r !== 1 ? "None" : th(["Finished the draft"], r * 3 + i)[0], size: 17 })));
      });
      return out;
    },
  },
  {
    id: "brainwriting", name: "Brainwriting 6-3-5", desc: "Six people, three ideas each, build on the row above.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1060, h: 820, name: tv("Brainwriting", (t) => `${t} brainwriting`) });
      const out = [frame, makeText({ x: 30, y: 20, w: 1000, text: tv("Question: how might we make it easier?", (t) => `How might we improve the ${low(t)}?`), size: 26, bold: true })];
      ["Idea 1", "Idea 2", "Idea 3"].forEach((t, i) => out.push(box(150 + i * 300, 80, 290, 44, t, "#1b2133", "#1b2133", { bold: true, textColor: "#ffffff", size: 17 })));
      for (let r = 0; r < 6; r++) {
        out.push(box(30, 134 + r * 112, 110, 104, "Round " + (r + 1), "#f1f2f8", "#e3e6f0", { size: 15, bold: true, sw: 1, kind: "rect" }));
        for (let c = 0; c < 3; c++) out.push(box(150 + c * 300, 134 + r * 112, 290, 104, r === 0 ? th(["First idea"], c * 4)[0] : "", "#ffffff", "#e3e6f0", { kind: "rect", sw: 1, size: 16 }));
      }
      return out;
    },
  },
  {
    id: "feedback-wall", name: "Feedback wall", desc: "What people said, sorted into loved, ideas and fix next.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 680, name: tv("Feedback wall", (t) => `${t} feedback`) });
      const out = [frame, title(30, 24, 1120, tv("What people told us", (t) => `${t}: what people told us`), C.ink, 36)];
      [["Loved it", C.green, NOTE.mint, ["“So easy to use”", "“Great support”", "“Looks lovely”", "“Fast delivery”"]], ["Ideas", C.blue, NOTE.sky, ["“Add dark mode”", "“A mobile app?”", "“Gift cards”", "“More sizes”"]], ["Fix next", C.rose, NOTE.pink, ["“The page was slow”", "“Hard to find help”", "“Emails too often”", "“Login trouble”"]]].forEach(([t, col, note, quotes], i) => {
        const x = 30 + i * 380;
        out.push(pill(x, 100, 180, t, col, 44, 18));
        th(quotes, i * 4).forEach((q, k) => out.push(box(x + (k % 2) * 180, 170 + Math.floor(k / 2) * 230, 170, 210, q, note, note, { kind: "rect", size: 17 })));
      });
      return out;
    },
  },
  {
    id: "cycle", name: "Cycle diagram", desc: "Four steps that repeat: plan, do, check, improve.",
    build() {
      const out = [box(330, 250, 240, 140, tv("Keep improving", (t) => t), "#f6f5ff", C.violet, { kind: "ellipse", size: 20, bold: true })];
      const steps = [["Plan", C.violet, 340, 0], ["Do", C.blue, 680, 270], ["Check", C.teal, 340, 540], ["Improve", C.amber, 0, 270]].map(([t, col, x, y]) => box(x, y, 220, 110, t, col, col, { kind: "rounded", size: 24, bold: true, textColor: "#ffffff" }));
      out.push(...steps);
      steps.forEach((s, i) => out.push(link(s, steps[(i + 1) % 4], { kind: "elbow", stroke: "#6a7389" })));
      th(["Set the goal", "Try it for a week", "Look at the numbers", "Change one thing"], 0).forEach((t, i) => out.push(makeNote({ x: [580, 920, 580, -10][i], y: [0, 400, 520, 400][i], w: 150, h: 110, color: [NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.yellow][i], text: t, size: 16 })));
      return out;
    },
  },
  {
    id: "pyramid", name: "Pyramid", desc: "Layers from the base up: needs, priorities or a hierarchy.",
    build() {
      const out = [title(0, -60, 900, tv("What matters most", (t) => `${t}: what matters most`), C.ink, 34)];
      out.push(box(330, 0, 240, 150, "", C.rose, C.rose, { kind: "triangle" }), makeText({ x: 380, y: 92, w: 140, text: "Vision", size: 20, bold: true, align: "center", color: "#ffffff" }));
      [["Goals", C.amber, 160], ["Plans", C.teal, 300], ["Daily habits", C.blue, 440], ["Values", C.violet, 580]].forEach(([t, col, w], i) => out.push(box(450 - (w + 240) / 2, 160 + i * 100, w + 240, 90, t, col, col, { kind: "rect", size: 22, bold: true, textColor: "#ffffff" })));
      th(["Our big dream", "This year", "This month", "Every day", "Always true"], 0).forEach((t, i) => out.push(makeText({ x: 960, y: 50 + i * 100, w: 260, text: t, size: 18, color: "#5d6478" })));
      return out;
    },
  },
  {
    id: "value-proposition", name: "Value proposition", desc: "What customers need on one side, how we help on the other.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1200, h: 620, name: tv("Value proposition", (t) => `${t}: value proposition`) });
      const out = [frame, box(40, 60, 480, 480, "", "#f6f5ff", C.violet, { kind: "rect", sw: 2 }), box(680, 60, 480, 480, "", "#ecfdf5", C.teal, { kind: "ellipse", sw: 2 })];
      out.push(makeText({ x: 40, y: 20, w: 480, text: "What we offer", size: 22, bold: true, color: C.violet, align: "center" }), makeText({ x: 680, y: 20, w: 480, text: "What customers need", size: 22, bold: true, color: C.teal, align: "center" }));
      out.push(free(530, 300, 670, 300, { arrow: "both", stroke: "#6a7389", sw: 3 }), makeText({ x: 545, y: 255, w: 110, text: "Fit", size: 20, bold: true, align: "center" }));
      th(["Products", "Pain relief", "Extra gains"], 0).forEach((t, i) => out.push(makeNote({ x: 70 + (i % 2) * 220, y: 100 + Math.floor(i / 2) * 210, w: 190, h: 170, color: NOTE.lilac, text: t, size: 18 })));
      th(["Jobs to do", "Pains", "Gains"], 3).forEach((t, i) => out.push(makeNote({ x: [830, 740, 940][i], y: [110, 300, 300][i], w: 160, h: 150, color: NOTE.mint, text: t, size: 18 })));
      return out;
    },
  },
  {
    id: "scamper", name: "SCAMPER ideas", desc: "Seven ways to rethink an idea: swap, combine, adapt and more.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1240, h: 640, name: tv("SCAMPER", (t) => `${t}: SCAMPER`) });
      const out = [frame, box(470, 250, 300, 130, tv("Our idea", (t) => t), "#1b2133", "#1b2133", { kind: "ellipse", size: 22, bold: true, textColor: "#ffffff" })];
      const words = [["Swap", "What can we replace?"], ["Combine", "What can we join?"], ["Adapt", "What can we borrow?"], ["Change", "Bigger, smaller, new look?"], ["Other uses", "Who else could use it?"], ["Remove", "What can we leave out?"], ["Reverse", "What if we flip it?"]];
      words.forEach(([w, q], i) => {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2, x = 620 + Math.cos(a) * 470 - 110, y = 315 + Math.sin(a) * 240 - 60;
        out.push(box(x, y, 220, 120, `${w}\n${q}`, [NOTE.yellow, NOTE.peach, NOTE.pink, NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.lime][i], "#ffffff", { kind: "rounded", size: 16, sw: 0 }));
      });
      return out;
    },
  },
  {
    id: "checklist", name: "Event checklist", desc: "Tasks with owners and tick boxes, grouped by when they happen.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 660, name: tv("Checklist", (t) => `${t} checklist`) });
      const out = [frame, title(30, 24, 1120, tv("Event checklist", (t) => `${t} checklist`), C.ink, 36)];
      [["Weeks before", C.violet], ["Days before", C.teal], ["On the day", C.amber]].forEach(([t, col], i) => {
        const x = 30 + i * 380;
        out.push(pill(x, 100, 360, t, col, 48, 19));
        th(["Book the place", "Send invites", "Order food", "Print signs"], i * 4).forEach((task, k) => {
          const y = 170 + k * 110;
          out.push(box(x, y, 360, 96, "", "#ffffff", "#e3e6f0", { sw: 1 }), box(x + 16, y + 30, 34, 34, "", "#ffffff", col, { kind: "rounded", sw: 2.5 }), makeText({ x: x + 64, y: y + 18, w: 280, text: task, size: 18, bold: true }), makeText({ x: x + 64, y: y + 52, w: 280, text: "Owner: " + who(["Ali", "Sara", "Omar", "Hina"], k)[k % 4].split("\n")[0], size: 14, color: "#6a7389" }));
        });
      });
      return out;
    },
  },
  {
    id: "vision-board", name: "Vision board", desc: "Your goals for the year as picture spaces and big words.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1240, h: 760, name: tv("Vision board", (t) => `${t} vision board`), fill: "#fffaf3" });
      const out = [frame, title(320, 300, 600, tv("My year", (t) => t), "#7a3e1f", 60)];
      const tiles = [[30, 30, 280, 250, "Health"], [330, 30, 300, 230, "Travel"], [650, 30, 260, 260, "Learning"], [930, 30, 280, 340, "Home"], [30, 300, 270, 430, "Family"], [940, 390, 270, 340, "Money"], [320, 420, 290, 310, "Career"], [630, 420, 290, 310, "Joy"]];
      const words = th(["Run 5 km", "See the mountains", "Learn a language", "A cosy corner", "Weekly dinners", "Save each month", "Lead a project", "Paint again"], 0);
      tiles.forEach(([x, y, w, h, t], i) => {
        out.push(box(x, y, w, h, "", [NOTE.peach, NOTE.sky, NOTE.lilac, NOTE.mint, NOTE.yellow, NOTE.lime, NOTE.pink, NOTE.sky][i], "#ffffff", { kind: "rect", sw: 6 }));
        out.push(makeText({ x: x + 16, y: y + 14, w: w - 32, text: t, size: 22, bold: true, color: "#1b2133" }), makeText({ x: x + 16, y: y + h - 52, w: w - 32, text: words[i], size: 17, color: "#3d4458" }));
      });
      return out;
    },
  },
  {
    id: "user-flow", name: "User flow", desc: "Screens a person goes through, with choices and arrows.",
    build() {
      const scr = (x, y, t) => box(x, y, 170, 250, t, "#ffffff", "#1b2133", { size: 17, bold: true, sw: 3 });
      const start = box(0, 105, 120, 50, "Start", C.green, C.green, { bold: true, textColor: "#ffffff" });
      const s1 = scr(170, 5, th(["Home screen"], 0)[0]), s2 = scr(400, 5, th(["Search"], 1)[0]);
      const q = box(630, 60, 150, 140, "Logged in?", "#fef3c7", C.amber, { kind: "diamond", size: 15, bold: true });
      const s3 = scr(840, -170, "Sign in"), s4 = scr(840, 180, th(["Checkout"], 2)[0]);
      const end = box(1080, 280, 120, 50, "Done", C.rose, C.rose, { bold: true, textColor: "#ffffff" });
      return [title(0, -260, 1200, tv("User flow", (t) => `${t}: user flow`), C.ink, 34), start, s1, s2, q, s3, s4, end,
        link(start, s1), link(s1, s2), link(s2, q), link(q, s3, { kind: "elbow", text: "No", fromSide: "top", toSide: "left" }), link(q, s4, { kind: "elbow", text: "Yes", fromSide: "bottom", toSide: "left" }),
        link(s3, s4, { fromSide: "bottom", toSide: "top" }), link(s4, end, { kind: "elbow", fromSide: "right", toSide: "top" })];
    },
  },
  {
    id: "data-flow", name: "Data flow diagram", desc: "Who sends what: people, steps and where data is kept.",
    build() {
      const ent = (x, y, t) => box(x, y, 180, 90, t, "#e8e5fe", C.violet, { kind: "rect", bold: true });
      const proc = (x, y, t) => box(x, y, 170, 170, t, "#ccfbf1", C.teal, { kind: "ellipse", size: 17, bold: true });
      const store = (x, y, t) => [box(x, y, 220, 64, t, "#ffffff", "#ffffff", { kind: "rect", size: 16, sw: 0 }), free(x, y, x + 220, y, { sw: 3 }), free(x, y + 64, x + 220, y + 64, { sw: 3 })];
      const cust = ent(0, 140, who(["Customer"])[0].split("\n")[0]), p1 = proc(330, 100, "1. Take order"), p2 = proc(650, 100, "2. Pack and send"), sup = ent(950, 140, "Courier");
      const d1 = store(330, 400, "D1  Orders"), d2 = store(650, 400, "D2  Stock");
      return [title(0, -80, 1130, tv("Data flow", (t) => `${t}: data flow`), C.ink, 34), cust, p1, p2, sup, ...d1, ...d2,
        link(cust, p1, { text: "Order details" }), link(p1, p2, { text: "Paid order" }), link(p2, sup, { text: "Parcel" }), link(p1, d1[0], { text: "Save" }), link(d2[0], p2, { text: "Stock level" })];
    },
  },
  {
    id: "sitemap", name: "Sitemap", desc: "Every page of a website as a tree from the home page.",
    build() {
      const pg = (x, y, t, f = "#ffffff", st = "#9aa1b5") => box(x, y, 170, 70, t, f, st, { size: 16, bold: true, sw: 2 });
      const home = pg(500, 0, "Home", C.violet, C.violet); home.textColor = "#ffffff";
      const secs = [["About", 50], ["Shop", 290], ["Blog", 530], ["Help", 770], ["Contact", 1010]].map(([t, x]) => pg(x, 160, t, "#e8e5fe", C.violet));
      const out = [title(0, -80, 1230, tv("Website sitemap", (t) => `${t}: website map`), C.ink, 34), home, ...secs];
      secs.forEach((s) => out.push(link(home, s, { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top" })));
      const subs = [["Our story", "Team"], ["Categories", "Product page", "Cart"], ["Latest posts", "Post page"], ["FAQ", "Returns"], ["Map"]];
      subs.forEach((list, i) => list.forEach((t, k) => { const p = pg(secs[i].x + 20, 300 + k * 100, t); p.w = 150; p.h = 56; p.size = 15; out.push(p, link(secs[i], p, { kind: "elbow", arrow: "none", fromSide: "left", toSide: "left" })); }));
      return out;
    },
  },
  {
    id: "value-chain", name: "Value chain", desc: "Support work above, main steps as arrows, value at the end.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1260, h: 640, name: tv("Value chain", (t) => `${t}: value chain`) });
      const out = [frame];
      ["Company setup", "People and hiring", "Tools and technology", "Buying"].forEach((t, i) => out.push(box(30, 30 + i * 78, 1000, 66, t, ["#e8e5fe", "#dbeafe", "#ccfbf1", "#fef3c7"][i], "#ffffff", { kind: "rect", size: 18, bold: true, sw: 2 })));
      ["Getting goods in", "Making", "Sending out", "Marketing and sales", "After-sales help"].forEach((t, i) => out.push(box(30 + i * 200, 360, 196, 240, t, [C.violet, C.blue, C.teal, C.amber, C.rose][i], "#ffffff", { kind: "rect", size: 18, bold: true, textColor: "#ffffff", sw: 2 })));
      out.push(box(1050, 30, 180, 570, "Value for customers", "#1b2133", "#1b2133", { kind: "rect", size: 22, bold: true, textColor: "#ffffff" }));
      th(["Faster delivery"], 4).forEach((t) => out.push(makeNote({ x: 640, y: 480, w: 140, h: 110, color: NOTE.yellow, text: t, size: 16 })));
      return out;
    },
  },
  {
    id: "raci", name: "RACI chart", desc: "Who is responsible, accountable, consulted and informed for each task.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1040, h: 620, name: tv("RACI chart", (t) => `${t}: who does what`) });
      const people = who(["Ali", "Sara", "Omar", "Hina"]).map((p) => p.split("\n")[0]);
      const tasks = th(["Plan the budget", "Design the poster", "Book the venue", "Send invitations", "Final review"], 0);
      const letters = [["A", "R", "C", "I"], ["I", "A", "R", "C"], ["R", "C", "A", "I"], ["C", "I", "R", "A"], ["A", "C", "I", "R"]];
      const out = [frame, ...makeTable({ x: 30, y: 30, cols: 5, rows: 6, cw: 196, ch: 64, cells: [["Task", ...people], ...tasks.map((t, r) => [t, ...letters[r]])] })];
      const legend = [["R", "Responsible: does the work", C.blue], ["A", "Accountable: says yes", C.violet], ["C", "Consulted: gives advice", C.teal], ["I", "Informed: kept up to date", C.amber]];
      legend.forEach(([l, t, col], i) => out.push(box(30 + i * 250, 450, 44, 44, l, col, col, { kind: "ellipse", bold: true, textColor: "#ffffff" }), makeText({ x: 82 + i * 250, y: 456, w: 170, text: t, size: 14 })));
      return out;
    },
  },
  {
    id: "content-calendar", name: "Content calendar", desc: "Posts per channel, week by week.",
    build() {
      const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"], chans = [["Instagram", C.rose, NOTE.pink], ["Blog", C.violet, NOTE.lilac], ["Email", C.teal, NOTE.mint], ["Video", C.amber, NOTE.yellow]];
      const frame = makeFrame({ x: 0, y: 0, w: 200 + weeks.length * 260 + 20, h: 120 + chans.length * 150, name: tv("Content calendar", (t) => `${t}: content calendar`) });
      const out = [frame];
      weeks.forEach((w, i) => out.push(box(200 + i * 260, 30, 250, 50, w, "#1b2133", "#1b2133", { bold: true, textColor: "#ffffff" })));
      const ideas = th(["Behind the scenes", "How-to tips", "Customer story", "New arrivals", "Q and A", "Team photo", "Weekly deals", "Short tutorial"], 0);
      chans.forEach(([c, col, note], r) => {
        const y = 100 + r * 150;
        out.push(box(20, y, 170, 136, c, col, col, { bold: true, textColor: "#ffffff", size: 18 }));
        for (let i = 0; i < 4; i++) if ((r + i) % 3 !== 2) out.push(makeNote({ x: 210 + i * 260, y: y + 8, w: 230, h: 120, color: note, text: ideas[(r * 2 + i) % ideas.length], size: 17 }));
      });
      return out;
    },
  },
  {
    id: "chore-chart", name: "Chore chart", desc: "Who does which job on which day, with stars when done.",
    build() {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], people = who(["Ayaan", "Mahnoor", "Rayan", "Zara"]).map((p) => p.split("\n")[0]);
      const frame = makeFrame({ x: 0, y: 0, w: 220 + days.length * 120 + 20, h: 130 + people.length * 120, name: tv("Chore chart", (t) => `${t} jobs`) });
      const out = [frame, makeText({ x: 24, y: 20, w: 600, text: tv("Our chore chart", (t) => `${t}: who does what`), size: 30, bold: true })];
      days.forEach((d, i) => out.push(box(220 + i * 120, 70, 112, 44, d, i > 4 ? "#dbeafe" : "#e8e5fe", "#ffffff", { bold: true, size: 16 })));
      const jobs = th(["Dishes", "Tidy room", "Feed the cat", "Water plants"], 0);
      people.forEach((p, r) => {
        const y = 126 + r * 120;
        out.push(box(20, y, 190, 108, `${p}\n${jobs[r]}`, [NOTE.peach, NOTE.mint, NOTE.sky, NOTE.yellow][r], "#ffffff", { size: 16, bold: true }));
        days.forEach((_, i) => out.push((i + r) % 3 === 0 ? box(220 + i * 120 + 26, y + 24, 60, 60, "", C.amber, C.amber, { kind: "star" }) : box(220 + i * 120, y, 112, 108, "", "#ffffff", "#e3e6f0", { kind: "rect", sw: 1 })));
      });
      return out;
    },
  },
  {
    id: "family-tree", name: "Family tree", desc: "Grandparents, parents and children joined by lines.",
    build() {
      const person = (x, y, t, f) => box(x, y, 170, 80, t, f, "#ffffff", { size: 16, bold: true, sw: 3 });
      const names = who(["Grandpa\nYusuf", "Grandma\nAmina", "Grandpa\nKarim", "Grandma\nNoor", "Dad\nHassan", "Mum\nSara", "Ali", "Hina", "Omar"]);
      const g = [person(0, 0, names[0], "#dbeafe"), person(200, 0, names[1], "#ffe4e6"), person(640, 0, names[2], "#dbeafe"), person(840, 0, names[3], "#ffe4e6")];
      const p = [person(200, 220, names[4], "#ccfbf1"), person(640, 220, names[5], "#fef3c7")];
      const k = [person(220, 440, names[6], "#e8e5fe"), person(420, 440, names[7], "#e8e5fe"), person(620, 440, names[8], "#e8e5fe")];
      const out = [title(0, -90, 1010, tv("Our family tree", (t) => `${t} family tree`), C.ink, 36), ...g, ...p, ...k];
      out.push(free(170, 40, 200, 40, { sw: 3, stroke: C.rose }), free(810, 40, 840, 40, { sw: 3, stroke: C.rose }), free(370, 260, 640, 260, { sw: 3, stroke: C.rose }));
      out.push(link(g[1], p[0], { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top" }), link(g[2], p[1], { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top" }));
      k.forEach((c) => out.push(link(p[0], c, { kind: "elbow", arrow: "none", fromSide: "bottom", toSide: "top" })));
      return out;
    },
  },
  {
    id: "uml-class", name: "UML class diagram", desc: "Classes with their fields and actions, and how they relate.",
    build() {
      const cls = (x, y, name, fields, acts, col) => {
        const head = box(x, y, 240, 50, name, col, col, { kind: "rect", bold: true, textColor: "#ffffff", size: 18 });
        const f = box(x, y + 50, 240, 30 + fields.length * 24, fields.join("\n"), "#ffffff", col, { kind: "rect", size: 14, sw: 2 });
        const a = box(x, y + 80 + fields.length * 24, 240, 30 + acts.length * 24, acts.join("\n"), "#f7f8fc", col, { kind: "rect", size: 14, sw: 2 });
        f.align = "left"; a.align = "left";
        return [head, f, a];
      };
      const user = cls(0, 0, "Customer", ["- name: text", "- email: text"], ["+ placeOrder()", "+ pay()"], C.violet);
      const order = cls(420, 0, "Order", ["- number: id", "- date: date", "- total: money"], ["+ addItem()", "+ cancel()"], C.blue);
      const item = cls(840, 0, "Product", ["- title: text", "- price: money"], ["+ inStock()"], C.teal);
      const vip = cls(0, 330, "VIP customer", ["- level: number"], ["+ discount()"], C.amber);
      return [title(0, -80, 1080, tv("Class diagram", (t) => `${t}: class diagram`), C.ink, 34), ...user, ...order, ...item, ...vip,
        link(user[1], order[1], { text: "places 1..*" }), link(order[1], item[1], { text: "contains" }), link(vip[0], user[2], { fromSide: "top", toSide: "bottom", text: "is a" })];
    },
  },
  {
    id: "architecture", name: "Architecture diagram", desc: "How the parts of a system talk: apps, servers, data.",
    build() {
      const node = (x, y, t, f, st, kind = "rounded") => box(x, y, 180, 80, t, f, st, { size: 16, bold: true, kind });
      const web = node(0, 120, "Website", "#e8e5fe", C.violet), app = node(0, 260, "Phone app", "#e8e5fe", C.violet);
      const gate = node(300, 190, "Gateway", "#dbeafe", C.blue);
      const s1 = node(590, 80, th(["Orders service"], 0)[0], "#ccfbf1", C.teal), s2 = node(590, 300, "Payments service", "#ccfbf1", C.teal);
      const db = node(900, 80, "Database", "#fef3c7", C.amber, "ellipse"), q = node(900, 300, "Message queue", "#ffe4e6", C.rose);
      const cloud = makeFrame({ x: 270, y: 30, w: 860, h: 400, name: "Cloud", fill: "#fbfbfe" });
      return [cloud, title(0, -80, 1130, tv("System architecture", (t) => `${t}: system architecture`), C.ink, 34), web, app, gate, s1, s2, db, q,
        link(web, gate), link(app, gate), link(gate, s1, { kind: "elbow" }), link(gate, s2, { kind: "elbow" }), link(s1, db, { text: "read / write" }), link(s2, q, { text: "events" }), link(q, s1, { kind: "elbow", fromSide: "top", toSide: "bottom", stroke: "#9aa1b5" })];
    },
  },
  {
    id: "budget-plan", name: "Budget plan", desc: "Money in, money out, what is left and the savings goal.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 680, name: tv("Budget plan", (t) => `${t} budget`) });
      const out = [frame, title(30, 24, 1120, tv("Monthly budget", (t) => `${t}: monthly budget`), C.ink, 36)];
      out.push(pill(30, 100, 340, "Money in", C.green, 50, 20), pill(400, 100, 340, "Money out", C.rose, 50, 20), pill(770, 100, 380, "What is left", C.violet, 50, 20));
      [["Salary", "60,000"], ["Side work", "12,000"]].forEach(([t, v], i) => out.push(makeNote({ x: 40 + i * 170, y: 170, w: 155, h: 140, color: NOTE.mint, text: `${t}\n${v}`, size: 20 })));
      [["Rent", "25,000"], ["Food", "15,000"], ["Bills", "8,000"], ["Travel", "6,000"]].forEach(([t, v], i) => out.push(makeNote({ x: 410 + (i % 2) * 170, y: 170 + Math.floor(i / 2) * 160, w: 155, h: 140, color: NOTE.pink, text: `${t}\n${v}`, size: 20 })));
      out.push(box(780, 170, 360, 120, "18,000 left this month", "#e8e5fe", C.violet, { size: 24, bold: true }));
      out.push(makeText({ x: 780, y: 320, w: 360, text: tv("Savings goal: new laptop", (t) => `Savings goal: ${low(t)}`), size: 18, bold: true }));
      out.push(box(780, 360, 360, 36, "", "#f1f2f8", "#e3e6f0", { kind: "rounded", sw: 1 }), box(780, 360, 220, 36, "60%", C.green, C.green, { kind: "rounded", bold: true, textColor: "#ffffff", size: 15 }));
      return out;
    },
  },
  {
    id: "daily-planner", name: "Daily planner", desc: "Hours of the day, top three priorities, to-dos and notes.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1100, h: 820, name: tv("Daily planner", (t) => `${t}: today`) });
      const out = [frame, makeText({ x: 30, y: 20, w: 700, text: "Today", size: 40, bold: true }), makeText({ x: 30, y: 74, w: 700, text: "Date: ____________", size: 16, color: "#6a7389" })];
      ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00", "5:00"].forEach((h, i) => out.push(makeText({ x: 30, y: 130 + i * 66, w: 70, text: h, size: 16, bold: true, color: C.violet }), free(110, 140 + i * 66, 560, 140 + i * 66, { stroke: "#e3e6f0", sw: 1 })));
      out.push(makeNote({ x: 120, y: 200, w: 200, h: 110, color: NOTE.sky, text: th(["Team call"], 3)[0], size: 18 }));
      out.push(pill(610, 120, 460, "Top 3 priorities", C.rose, 46, 18));
      th(["Finish the report", "Call the bank", "Gym at 6"], 0).forEach((t, i) => out.push(box(610, 180 + i * 70, 460, 58, `${i + 1}.  ${t}`, "#ffffff", "#e3e6f0", { size: 18, sw: 1 })));
      out.push(pill(610, 410, 220, "To do", C.teal, 44, 18), pill(850, 410, 220, "Notes", C.amber, 44, 18));
      th(["Buy milk", "Reply to emails"], 5).forEach((t, i) => out.push(box(610, 470 + i * 56, 220, 46, t, "#ffffff", "#e3e6f0", { size: 16, sw: 1 }), box(620, 482 + i * 56, 22, 22, "", "#ffffff", C.teal, { kind: "rounded", sw: 2 })));
      out.push(makeNote({ x: 860, y: 470, w: 200, h: 180, color: NOTE.yellow, text: "Write a note", size: 18 }));
      return out;
    },
  },
  {
    id: "quarterly-plan", name: "Quarterly plan", desc: "Goals and milestones for each quarter of the year.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1240, h: 700, name: tv("Quarterly plan", (t) => `${t}: year plan`) });
      const out = [frame, title(30, 20, 1180, tv("Our year in four quarters", (t) => `${t}: the year in four quarters`), C.ink, 34)];
      [["Q1", "Jan - Mar", C.violet, NOTE.lilac], ["Q2", "Apr - Jun", C.blue, NOTE.sky], ["Q3", "Jul - Sep", C.teal, NOTE.mint], ["Q4", "Oct - Dec", C.amber, NOTE.yellow]].forEach(([q, m, col, note], i) => {
        const x = 30 + i * 300;
        out.push(box(x, 90, 280, 90, `${q}\n${m}`, col, col, { size: 22, bold: true, textColor: "#ffffff" }), column(x, 196, 280, 470));
        th(["Main goal", "Milestone"], i * 2).forEach((t, k) => out.push(makeNote({ x: x + 20, y: 216 + k * 220, w: 240, h: 200, color: note, text: k ? "Milestone: " + low(t) : t, size: 20 })));
      });
      return out;
    },
  },
  {
    id: "project-update", name: "Project update", desc: "Status at a glance: done, in progress, blocked and next.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 660, name: tv("Project update", (t) => `${t} update`) });
      const out = [frame, title(30, 20, 820, tv("Project update", (t) => `${t}: project update`), C.ink, 36)];
      out[1].align = "left";
      out.push(box(880, 24, 270, 54, "Status: On track", "#dcfce7", C.green, { bold: true, size: 18 }));
      [["Done", C.green, NOTE.mint, ["Designs approved", "Supplier chosen"]], ["In progress", C.blue, NOTE.sky, ["Building the site", "Writing the copy"]], ["Blocked", C.rose, NOTE.pink, ["Waiting for photos"]], ["Next", C.violet, NOTE.lilac, ["Testing", "Launch prep"]]].forEach(([t, col, note, items], i) => {
        const x = 30 + i * 285;
        out.push(box(x, 110, 265, 520, "", "#ffffff", col, { sw: 2 }), box(x, 110, 265, 56, t, col, col, { bold: true, textColor: "#ffffff", size: 20 }));
        out.push(box(x + 110, 182, 44, 44, "", col, "#ffffff", { kind: "ellipse", sw: 3 }));
        th(items, i * 2).forEach((n, k) => out.push(makeNote({ x: x + 22, y: 250 + k * 180, w: 220, h: 160, color: note, text: n, size: 19 })));
      });
      return out;
    },
  },
  {
    id: "strategy-map", name: "Strategy map", desc: "Goals in four layers, each one helping the layer above.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1200, h: 760, name: tv("Strategy map", (t) => `${t}: strategy map`) });
      const out = [frame];
      const rows = [["Money", "#dcfce7", C.green, ["Grow income", "Lower costs"]], ["Customers", "#dbeafe", C.blue, ["Happier customers", "More repeat buyers"]], ["How we work", "#fef3c7", C.amber, ["Faster delivery", "Fewer mistakes"]], ["Learning", "#e8e5fe", C.violet, ["Train the team", "Better tools"]]];
      const nodes = [];
      rows.forEach(([t, f, col, items], r) => {
        const y = 30 + r * 180;
        out.push(box(30, y, 1140, 160, "", f, f, { kind: "rect", sw: 0 }), makeText({ x: 50, y: y + 60, w: 200, text: t, size: 22, bold: true, color: col }));
        nodes.push(th(items, r * 2).map((n, i) => { const b = box(330 + i * 420, y + 35, 300, 90, n, "#ffffff", col, { kind: "ellipse", size: 18, bold: true }); out.push(b); return b; }));
      });
      for (let r = 3; r > 0; r--) nodes[r].forEach((b, i) => out.push(link(b, nodes[r - 1][i], { fromSide: "top", toSide: "bottom", stroke: "#6a7389" })));
      return out;
    },
  },
  {
    id: "brand-board", name: "Brand board", desc: "Logo, colours, fonts and words that describe the brand.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1200, h: 700, name: tv("Brand board", (t) => `${t}: brand board`), fill: "#ffffff" });
      const out = [frame, box(30, 30, 360, 300, tv("Logo here", (t) => t), "#f1f2f8", "#d5d9e6", { size: 24, bold: true, sw: 2 })];
      out.push(makeText({ x: 420, y: 30, w: 300, text: "Colours", size: 22, bold: true }));
      [C.violet, C.teal, C.amber, C.rose, "#1b2133"].forEach((c, i) => out.push(box(420 + i * 150, 76, 130, 130, "", c, "#ffffff", { kind: "ellipse", sw: 4 }), makeText({ x: 420 + i * 150, y: 214, w: 130, text: c.toUpperCase(), size: 14, align: "center", color: "#5d6478" })));
      out.push(makeText({ x: 30, y: 370, w: 300, text: "Fonts", size: 22, bold: true }));
      const h1 = makeText({ x: 30, y: 414, w: 520, text: "Heading in Serif", size: 44, bold: true }); h1.font = "serif";
      const b1 = makeText({ x: 30, y: 480, w: 520, text: "Body text in a clean sans font, easy to read.", size: 20 });
      out.push(h1, b1, makeText({ x: 640, y: 370, w: 300, text: "Our voice", size: 22, bold: true }));
      th(["Friendly", "Clear", "Bold"], 0).forEach((t, i) => out.push(makeNote({ x: 640 + i * 180, y: 420, w: 160, h: 140, color: [NOTE.yellow, NOTE.mint, NOTE.pink][i], text: t, size: 24 })));
      return out;
    },
  },
  {
    id: "habit-tracker", name: "Habit tracker", desc: "Habits down the side, a circle for every day of the week.",
    build() {
      const days = ["M", "T", "W", "T", "F", "S", "S"];
      const habits = th(["Drink water", "Read 20 minutes", "Walk", "No phone after 10", "Sleep by 11"], 0);
      const frame = makeFrame({ x: 0, y: 0, w: 280 + days.length * 100 + 20, h: 140 + habits.length * 100, name: tv("Habit tracker", (t) => `${t}: habits`) });
      const out = [frame, makeText({ x: 24, y: 20, w: 600, text: "This week's habits", size: 30, bold: true })];
      days.forEach((d, i) => out.push(makeText({ x: 280 + i * 100, y: 84, w: 80, text: d, size: 18, bold: true, align: "center", color: "#6a7389" })));
      const cols = [C.violet, C.blue, C.teal, C.amber, C.rose];
      habits.forEach((h, r) => {
        const y = 124 + r * 100;
        out.push(box(20, y, 240, 76, h, "#f6f5ff", "#e3e6f0", { size: 17, bold: true, sw: 1 }));
        days.forEach((_, i) => out.push(box(290 + i * 100, y + 8, 60, 60, "", (i * 3 + r) % 4 !== 3 && i < 5 ? cols[r] : "#ffffff", cols[r], { kind: "ellipse", sw: 3 })));
      });
      return out;
    },
  },
  {
    id: "risk-matrix", name: "Risk matrix", desc: "How likely and how serious: a 3 by 3 grid from green to red.",
    build() {
      const out = [title(0, -70, 900, tv("Risk matrix", (t) => `${t}: risks`), C.ink, 34)];
      const heat = [["#fef3c7", "#fed7aa", "#fecaca"], ["#dcfce7", "#fef3c7", "#fed7aa"], ["#bbf7d0", "#dcfce7", "#fef3c7"]];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(box(140 + c * 250, r * 200, 240, 190, ["High", "Medium", "Low"][r] + " / " + ["Small", "Medium", "Big"][c], heat[r][c], "#ffffff", { kind: "rect", size: 13, sw: 4 }));
      out.push(makeText({ x: 0, y: 270, w: 120, text: "How likely", size: 18, bold: true, align: "center" }), makeText({ x: 400, y: 610, w: 240, text: "How serious", size: 18, bold: true, align: "center" }));
      th(["Supplier is late", "Price goes up", "Staff away"], 0).forEach((t, i) => out.push(makeNote({ x: [660, 420, 180][i], y: [40, 230, 420][i], w: 150, h: 110, color: [NOTE.pink, NOTE.peach, NOTE.mint][i], text: t, size: 17 })));
      return out;
    },
  },
  {
    id: "five-forces", name: "Five forces", desc: "Rivals in the middle; buyers, suppliers, newcomers and substitutes around.",
    build() {
      const mid = box(420, 260, 300, 160, "Rivals\nHow strong is the competition?", "#1b2133", "#1b2133", { size: 17, bold: true, textColor: "#ffffff" });
      const around = [[420, 0, "New players\nHow easy to join?", "#dbeafe", C.blue], [0, 260, "Suppliers\nTheir power", "#ccfbf1", C.teal], [840, 260, "Buyers\nTheir power", "#fef3c7", C.amber], [420, 520, "Substitutes\nOther ways to get it", "#ffe4e6", C.rose]].map(([x, y, t, f, st]) => box(x, y, 300, 160, t, f, st, { size: 17, bold: true }));
      const out = [title(0, -80, 1140, tv("Five forces", (t) => `${t}: five forces`), C.ink, 34), mid, ...around];
      around.forEach((b) => out.push(link(b, mid, { stroke: "#6a7389", sw: 3 })));
      th(["Many small shops nearby"], 2).forEach((t) => out.push(makeNote({ x: 760, y: 470, w: 160, h: 120, color: NOTE.yellow, text: t, size: 17 })));
      return out;
    },
  },
  {
    id: "renovation-plan", name: "Renovation plan", desc: "Room by room: what to change, the budget and the order.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1220, h: 720, name: tv("Renovation plan", (t) => `${t}: renovation plan`) });
      const out = [frame, title(30, 20, 1160, tv("Home renovation", (t) => `${t}: room by room`), "#7a3e1f", 34)];
      const rooms = [["Kitchen", "#fef3c7", C.amber, 30, 90, 560, 290], ["Living room", "#dbeafe", C.blue, 610, 90, 580, 290], ["Bedroom", "#e8e5fe", C.violet, 30, 400, 370, 290], ["Bathroom", "#ccfbf1", C.teal, 420, 400, 370, 290], ["Garden", "#dcfce7", C.green, 810, 400, 380, 290]];
      const ideas = th(["New cupboards", "Brighter lights", "Paint the walls", "Fix the shower", "Plant a hedge"], 0);
      rooms.forEach(([t, f, col, x, y, w, h], i) => {
        out.push(box(x, y, w, h, "", f, col, { kind: "rect", sw: 3 }), makeText({ x: x + 16, y: y + 12, w: w - 120, text: t, size: 22, bold: true, color: col }));
        out.push(box(x + w - 110, y + 12, 96, 34, ["Step 1", "Step 3", "Step 4", "Step 2", "Step 5"][i], "#ffffff", col, { size: 14, bold: true, sw: 1.5 }));
        out.push(makeNote({ x: x + 20, y: y + 64, w: 170, h: 150, color: NOTE.yellow, text: ideas[i], size: 18 }), makeText({ x: x + 210, y: y + 70, w: Math.max(120, w - 230), text: "Budget: ________", size: 16, color: "#5d6478" }));
      });
      return out;
    },
  },
  {
    id: "brainstorm-grid", name: "Brainstorm grid", desc: "Ideas sorted into six coloured categories.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1230, h: 760, name: tv("Brainstorm grid", (t) => `${t}: ideas by category`) });
      const out = [frame];
      const cats = [["People", NOTE.pink, C.rose], ["Product", NOTE.sky, C.blue], ["Marketing", NOTE.yellow, C.amber], ["Money", NOTE.mint, C.green], ["Tools", NOTE.lilac, C.violet], ["Wild ideas", NOTE.peach, "#ea580c"]];
      cats.forEach(([t, note, col], i) => {
        const x = 30 + (i % 3) * 400, y = 30 + Math.floor(i / 3) * 360;
        out.push(box(x, y, 380, 340, "", "#ffffff", col, { sw: 2 }), box(x, y, 380, 52, t, col, col, { bold: true, textColor: "#ffffff", size: 20 }));
        th(["Idea", "Another idea"], i * 2).forEach((n, k) => out.push(makeNote({ x: x + 20 + k * 180, y: y + 80 + k * 30, w: 160, h: 150, color: note, text: n, size: 18 })));
      });
      return out;
    },
  },
  {
    id: "doodle-brainstorm", name: "Doodle brainstorm", desc: "A hand-drawn feel: doodles, arrows and notes around one question.",
    build() {
      const pts = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
      const out = [makeFrame({ x: 0, y: 0, w: 1120, h: 720, name: tv("Doodle brainstorm", (t) => `${t}: doodles`), fill: "#fffdf6" })];
      out.push(makeStroke({ points: pts(60, (t) => [560 + Math.cos(t * Math.PI * 2) * 230 + Math.sin(t * 19) * 6, 360 + Math.sin(t * Math.PI * 2) * 120 + Math.cos(t * 17) * 6]), color: "#1b2133", width: 4 }));
      out.push(makeText({ x: 360, y: 335, w: 400, text: tv("What if we tried…", (t) => `What if our ${low(t)}…`), size: 28, bold: true, align: "center" }));
      out.push(makeStroke({ points: pts(40, (t) => [140 + Math.cos(t * Math.PI * 6) * 40 * t, 140 + Math.sin(t * Math.PI * 6) * 40 * t]), color: C.violet, width: 4 }));
      out.push(makeStroke({ points: pts(10, (t) => { const a = t * Math.PI * 2 * 2 - Math.PI / 2, r = Math.round(t * 10) % 2 ? 22 : 50; return [980 + Math.cos(a) * r, 130 + Math.sin(a) * r]; }), color: C.amber, width: 4 }));
      out.push(makeStroke({ points: pts(30, (t) => [120 + t * 200, 600 + Math.sin(t * Math.PI * 4) * 22]), color: C.teal, width: 5 }));
      out.push(makeStroke({ points: [[340, 360], [210, 230], [230, 262], [210, 230], [244, 228]], color: "#1b2133", width: 3 }));
      out.push(makeStroke({ points: [[790, 360], [910, 470], [880, 462], [910, 470], [904, 440]], color: "#1b2133", width: 3 }));
      th(["Wild idea", "Ask our fans", "Make it a game", "Tiny first step"], 0).forEach((n, i) => out.push(makeNote({ x: [120, 860, 820, 380][i], y: [230, 480, 60, 560][i], w: 170, h: 150, color: [NOTE.pink, NOTE.mint, NOTE.yellow, NOTE.sky][i], text: n, size: 20 })));
      return out;
    },
  },
  {
    id: "sequence-diagram", name: "Sequence diagram", desc: "Who talks to whom, in order, down the page.",
    build() {
      const actors = who(["Customer", "Website", "Payments", "Shop"]).map((p) => p.split("\n")[0]);
      const out = [title(0, -80, 1060, tv("Sequence diagram", (t) => `${t}: step by step`), C.ink, 34)];
      actors.forEach((a, i) => { const x = i * 280; out.push(box(x, 0, 220, 60, a, [C.violet, C.blue, C.teal, C.amber][i], "#ffffff", { bold: true, textColor: "#ffffff", size: 17 }), free(x + 110, 60, x + 110, 640, { stroke: "#9aa1b5", sw: 2 })); });
      const msgs = [[0, 1, "Order"], [1, 2, "Take payment"], [2, 1, "Paid"], [1, 3, "Pack the order"], [3, 0, "Your parcel is on the way"]];
      msgs.forEach(([a, b, t], i) => { const y = 120 + i * 100; out.push(free(a * 280 + 110, y, b * 280 + 110, y, { arrow: "end", stroke: "#1b2133", sw: 2, text: t })); });
      return out;
    },
  },
  {
    id: "now-next-later", name: "Now, next, later", desc: "A simple roadmap in three time buckets.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1150, h: 640, name: tv("Now, next, later", (t) => `${t}: now, next, later`) });
      const out = [frame];
      [["Now", "This month", C.green, NOTE.mint], ["Next", "In 1-3 months", C.blue, NOTE.sky], ["Later", "Some day", C.violet, NOTE.lilac]].forEach(([t, sub, col, note], i) => {
        const x = 30 + i * 370;
        out.push(box(x, 30, 350, 110, `${t}\n${sub}`, col, col, { kind: "rounded", size: 24, bold: true, textColor: "#ffffff" }));
        out.push(free(x + 175, 140, x + 175, 160, { stroke: col, sw: 3 }));
        th(["Fix the basics", "Grow the reach", "Big new idea"], i * 3).forEach((n, k) => k < 2 && out.push(makeNote({ x: x + 20 + k * 165, y: 180 + k * 200, w: 150, h: 150, color: note, text: k ? "Add an item" : n, size: 18 })));
      });
      return out;
    },
  },
  {
    id: "mad-sad-glad", name: "Mad, sad, glad", desc: "A feelings retro: what made us mad, sad and glad.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1120, h: 680, name: tv("Mad, sad, glad", (t) => `${t}: mad, sad, glad`) });
      const out = [frame];
      [["Mad", C.rose, NOTE.pink, "M 0 0"], ["Sad", C.blue, NOTE.sky, ""], ["Glad", C.green, NOTE.mint, ""]].forEach(([t, col, note], i) => {
        const x = 30 + i * 365, cx = x + 170;
        out.push(box(cx - 60, 30, 120, 120, "", col, col, { kind: "ellipse" }));
        out.push(box(cx - 30, 70, 14, 14, "", "#ffffff", "#ffffff", { kind: "ellipse" }), box(cx + 16, 70, 14, 14, "", "#ffffff", "#ffffff", { kind: "ellipse" }));
        const my = i === 2 ? 105 : 120, curve = i === 2 ? 14 : -14;
        out.push(makeStroke({ points: Array.from({ length: 9 }, (_, k) => [cx - 26 + k * 6.5, my + Math.sin((k / 8) * Math.PI) * curve]), color: "#ffffff", width: 5 }));
        out.push(makeText({ x, y: 162, w: 340, text: t, size: 26, bold: true, color: col, align: "center" }), box(x, 210, 340, 440, "", "#ffffff", col, { sw: 2 }));
        out.push(makeNote({ x: x + 20, y: 230, w: 150, h: 140, color: note, text: th(["Add a note"], i * 4)[0], size: 18 }));
      });
      return out;
    },
  },
  {
    id: "vertical-timeline", name: "Vertical timeline", desc: "Milestones down a centre line, left and right.",
    build() {
      const out = [title(0, -80, 900, tv("Our story so far", (t) => `${t}: our story`), C.ink, 36), free(450, 0, 450, 760, { stroke: C.violet, sw: 4 })];
      const steps = th(["The idea", "First customer", "New office", "Team of ten", "Next big step"], 0);
      steps.forEach((t, i) => {
        const y = 40 + i * 145, left = i % 2 === 0;
        out.push(box(432, y + 26, 36, 36, "", "#ffffff", C.violet, { kind: "ellipse", sw: 5 }));
        out.push(box(left ? 60 : 520, y, 320, 90, t, [NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.yellow, NOTE.peach][i], "#ffffff", { size: 19, bold: true, sw: 0 }));
        out.push(makeText({ x: left ? 60 : 520, y: y + 96, w: 320, text: ["2022", "2023", "Spring 2024", "2025", "2026"][i], size: 15, color: "#6a7389", align: left ? "right" : "left" }));
      });
      return out;
    },
  },
  {
    id: "bracket", name: "Tournament bracket", desc: "Eight entries, quarter finals to the winner.",
    build() {
      const out = [title(0, -80, 1100, tv("Idea tournament", (t) => `${t}: idea tournament`), C.ink, 36)];
      const ent = th(["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5", "Idea 6", "Idea 7", "Idea 8"], 0);
      const col = (r) => [C.violet, C.blue, C.teal, C.amber][r];
      let prev = ent.map((t, i) => box(0, i * 90, 200, 64, t, "#ffffff", col(0), { size: 15, bold: true }));
      out.push(...prev);
      for (let r = 1; r <= 3; r++) {
        const next = [];
        for (let i = 0; i < prev.length; i += 2) {
          const a = prev[i], b = prev[i + 1], y = (a.y + b.y) / 2;
          const n = box(r * 280, y, 200, 64, r === 3 ? "Winner" : "", r === 3 ? C.amber : "#f7f8fc", col(r), { size: 18, bold: true, textColor: r === 3 ? "#ffffff" : undefined });
          out.push(n, link(a, n, { kind: "elbow", arrow: "none", fromSide: "right", toSide: "left", stroke: "#9aa1b5" }), link(b, n, { kind: "elbow", arrow: "none", fromSide: "right", toSide: "left", stroke: "#9aa1b5" }));
          next.push(n);
        }
        prev = next;
      }
      return out;
    },
  },
  {
    id: "seating-plan", name: "Seating plan", desc: "Round tables with seats and names for an event.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1180, h: 760, name: tv("Seating plan", (t) => `${t}: seating plan`) });
      const out = [frame, box(390, 30, 400, 70, tv("Stage", (t) => `${t}: stage`), "#1b2133", "#1b2133", { bold: true, textColor: "#ffffff", size: 20 })];
      const people = who(["Ali", "Sara", "Omar", "Hina", "Bilal", "Noor"]).map((p) => p.split("\n")[0]);
      [[200, 230], [590, 230], [980, 230], [395, 520], [785, 520]].forEach(([cx, cy], ti) => {
        out.push(box(cx - 80, cy - 80, 160, 160, "Table " + (ti + 1), ["#e8e5fe", "#dbeafe", "#ccfbf1", "#fef3c7", "#ffe4e6"][ti], "#ffffff", { kind: "ellipse", bold: true, size: 18, sw: 4 }));
        for (let s = 0; s < 6; s++) { const a = (s / 6) * Math.PI * 2; out.push(box(cx + Math.cos(a) * 128 - 32, cy + Math.sin(a) * 128 - 32, 64, 64, ti === 0 ? people[s].split(" ").pop().slice(0, 7) : "", "#ffffff", "#9aa1b5", { kind: "ellipse", size: 13, sw: 2 })); }
      });
      return out;
    },
  },
  {
    id: "meal-planner", name: "Meal planner", desc: "Breakfast, lunch and dinner for every day, plus a shopping list.",
    build() {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], meals = [["Breakfast", NOTE.yellow], ["Lunch", NOTE.mint], ["Dinner", NOTE.peach]];
      const frame = makeFrame({ x: 0, y: 0, w: 180 + days.length * 140 + 300, h: 140 + meals.length * 150, name: tv("Meal planner", (t) => `${t}: meals this week`) });
      const out = [frame, makeText({ x: 24, y: 20, w: 600, text: "Meals this week", size: 30, bold: true })];
      days.forEach((d, i) => out.push(box(180 + i * 140, 74, 130, 44, d, i > 4 ? "#dbeafe" : "#e8e5fe", "#ffffff", { bold: true, size: 16 })));
      const food = th(["Eggs and toast", "Rice and dal", "Grilled chicken", "Oats and fruit", "Pasta salad", "Fish curry", "Pancakes"], 0);
      meals.forEach(([m, note], r) => {
        const y = 130 + r * 150;
        out.push(box(20, y, 150, 136, m, note, "#ffffff", { bold: true, size: 18 }));
        days.forEach((_, i) => out.push((i + r) % 2 === 0 ? makeNote({ x: 180 + i * 140, y, w: 130, h: 136, color: note, text: food[(i + r * 3) % food.length], size: 15 }) : box(180 + i * 140, y, 130, 136, "", "#ffffff", "#e3e6f0", { kind: "rect", sw: 1 })));
      });
      const sx = 180 + days.length * 140 + 20;
      out.push(pill(sx, 74, 260, "Shopping list", C.teal, 44, 18));
      ["Eggs", "Rice", "Chicken", "Fruit", "Milk"].forEach((t, i) => out.push(box(sx, 132 + i * 56, 260, 46, t, "#ffffff", "#e3e6f0", { size: 16, sw: 1 }), box(sx + 12, 144 + i * 56, 22, 22, "", "#ffffff", C.teal, { kind: "rounded", sw: 2 })));
      return out;
    },
  },
  {
    id: "kanban-swimlanes", name: "Kanban with swimlanes", desc: "Status columns across, one lane per team or person.",
    build() {
      const cols = [["Backlog", "#f1f2f8"], ["Doing", "#ffe27a"], ["Review", "#b4dcff"], ["Done", "#b7efd2"]], lanes = who(["Design", "Build", "Marketing"]).map((p) => p.split("\n")[0]);
      const frame = makeFrame({ x: 0, y: 0, w: 200 + cols.length * 260 + 20, h: 110 + lanes.length * 200, name: tv("Team board", (t) => `${t} board`) });
      const out = [frame];
      cols.forEach(([t, c], i) => out.push(header(200 + i * 260, 30, 250, t, c)));
      const items = th(["Wireframes", "Logo ideas", "Login page", "Bug fixes", "Ad copy", "Launch post"], 0);
      lanes.forEach((l, r) => {
        const y = 100 + r * 200;
        out.push(box(20, y, 170, 190, l, ["#e8e5fe", "#ccfbf1", "#ffe4e6"][r], "#ffffff", { bold: true, size: 18 }), free(20, y + 195, 200 + cols.length * 260, y + 195, { stroke: "#e3e6f0", sw: 2 }));
        [r % 4, (r + 1) % 4].forEach((ci, k) => out.push(makeNote({ x: 215 + ci * 260, y: y + 15, w: 220, h: 160, color: cols[ci][1] === "#f1f2f8" ? NOTE.white : cols[ci][1], text: items[r * 2 + k], size: 19 })));
      });
      return out;
    },
  },
  {
    id: "onion-diagram", name: "Onion diagram", desc: "Rings from the core outwards: who is closest to the work.",
    build() {
      const out = [title(0, -80, 1100, tv("Who is involved", (t) => `${t}: who is involved`), C.ink, 34)];
      [[0, 760, "#f1f2f8", "Wider world"], [80, 600, "#dbeafe", "Partners"], [160, 440, "#ccfbf1", "Our team"], [240, 280, "#5b4cf0", ""]].forEach(([o, s, f, t], i) => {
        out.push(box(o, o, s, s, "", f, "#ffffff", { kind: "ellipse", sw: 3 }));
        if (t) out.push(makeText({ x: 380 - 120, y: o + 18, w: 240, text: t, size: 20, bold: true, align: "center", color: "#1b2133" }));
      });
      out.push(box(300, 340, 160, 80, tv("The project", (t) => t), "#5b4cf0", "#5b4cf0", { size: 18, bold: true, textColor: "#ffffff", kind: "rounded" }));
      th(["Customers", "Suppliers", "Core team"], 0).forEach((t, i) => out.push(makeNote({ x: [820, 640, 460][i], y: [80, 260, 520][i], w: 150, h: 110, color: [NOTE.yellow, NOTE.mint, NOTE.lilac][i], text: t, size: 18 })));
      return out;
    },
  },
  {
    id: "radar-chart", name: "Skills radar", desc: "Six skills on a spider web: where we are strong and where to grow.",
    build() {
      const cx = 420, cy = 380, R = 300, skills = th(["Design", "Writing", "Selling", "Planning", "Tech", "Teamwork"], 0), val = [0.8, 0.55, 0.65, 0.9, 0.45, 0.75];
      const pt = (i, k) => [cx + Math.cos((i / 6) * Math.PI * 2 - Math.PI / 2) * R * k, cy + Math.sin((i / 6) * Math.PI * 2 - Math.PI / 2) * R * k];
      const out = [title(0, -40, 840, tv("Skills radar", (t) => `${t}: skills radar`), C.ink, 34)];
      for (const k of [0.25, 0.5, 0.75, 1]) out.push(makeStroke({ points: [0, 1, 2, 3, 4, 5, 0].map((i) => pt(i, k)), color: "#c9cede", width: 2 }));
      for (let i = 0; i < 6; i++) out.push(free(cx, cy, ...pt(i, 1), { stroke: "#c9cede", sw: 2 }));
      out.push(makeStroke({ points: [0, 1, 2, 3, 4, 5, 0].map((i) => pt(i, val[i])), color: C.violet, width: 5 }));
      skills.forEach((s, i) => { const [x, y] = pt(i, 1.18); out.push(makeText({ x: x - 90, y: y - 14, w: 180, text: s, size: 18, bold: true, align: "center" })); const [px, py] = pt(i, val[i]); out.push(box(px - 9, py - 9, 18, 18, "", C.violet, "#ffffff", { kind: "ellipse", sw: 3 })); });
      out.push(makeNote({ x: 880, y: 120, w: 200, h: 170, color: NOTE.yellow, text: "Grow next: " + low(skills[4]), size: 20 }));
      return out;
    },
  },
  {
    id: "lotus-blossom", name: "Lotus blossom", desc: "One theme, eight ideas around it, each grown into eight more.",
    build() {
      const out = [title(0, -80, 1020, tv("Lotus blossom ideas", (t) => `${t}: lotus ideas`), C.ink, 34)];
      const ideas = th(["Idea A", "Idea B", "Idea C", "Idea D", "Idea E", "Idea F", "Idea G", "Idea H"], 0);
      const pos = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
      const S = 330, cell = 104;
      for (let b = 0; b < 9; b++) {
        const bx = (b % 3) * S, by = Math.floor(b / 3) * S, centre = b === 4;
        const k = pos.findIndex(([x, y]) => x === b % 3 && y === Math.floor(b / 3));
        for (let c = 0; c < 9; c++) {
          const x = bx + (c % 3) * (cell + 4), y = by + Math.floor(c / 3) * (cell + 4), mid = c === 4;
          const text = centre ? (mid ? tv("Main theme", (t) => t) : ideas[pos.findIndex(([px, py]) => px === c % 3 && py === Math.floor(c / 3))]) : mid ? ideas[k] : "";
          out.push(box(x, y, cell, cell, text, centre && mid ? C.violet : mid || centre ? [NOTE.yellow, NOTE.peach, NOTE.pink, NOTE.lilac, NOTE.sky, NOTE.mint, NOTE.lime, NOTE.yellow][centre ? Math.max(0, pos.findIndex(([px, py]) => px === c % 3 && py === Math.floor(c / 3))) : k] : "#ffffff", "#d5d9e6", { kind: "rect", size: 14, bold: mid, sw: 1, textColor: centre && mid ? "#ffffff" : undefined }));
        }
      }
      return out;
    },
  },
  {
    id: "hero-journey", name: "Story circle", desc: "A story in eight steps around a circle, from comfort to change.",
    build() {
      const cx = 480, cy = 400, R = 300;
      const out = [title(0, -40, 960, tv("Our story circle", (t) => `${t}: story circle`), C.ink, 34)];
      out.push(makeStroke({ points: Array.from({ length: 73 }, (_, i) => [cx + Math.cos((i / 72) * Math.PI * 2) * R, cy + Math.sin((i / 72) * Math.PI * 2) * R]), color: C.violet, width: 4 }));
      out.push(free(cx - R - 20, cy, cx + R + 20, cy, { stroke: "#c9cede", sw: 2 }), makeText({ x: cx + R + 30, y: cy - 14, w: 160, text: "Everyday world", size: 15, color: "#6a7389" }), makeText({ x: cx + R + 30, y: cy + 8, w: 160, text: "New world", size: 15, color: "#6a7389" }));
      const steps = ["1. Comfort", "2. A need", "3. Go", "4. Search", "5. Find", "6. Pay the price", "7. Return", "8. Changed"];
      steps.forEach((s, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; out.push(box(x - 75, y - 28, 150, 56, s, i < 4 ? "#e8e5fe" : "#ccfbf1", i < 4 ? C.violet : C.teal, { size: 15, bold: true })); });
      out.push(makeNote({ x: cx - 90, y: cy - 80, w: 180, h: 150, color: NOTE.yellow, text: th(["Our hero: a busy parent"], 0)[0], size: 18 }));
      return out;
    },
  },
  {
    id: "burndown", name: "Burndown chart", desc: "Work left each day of the sprint against the ideal line.",
    build() {
      const x0 = 80, y0 = 40, W = 840, H = 440, days = 10, ideal = (d) => 40 - d * 4, real = [40, 38, 37, 33, 30, 28, 22, 18, 12, 6, 2];
      const P = (d, v) => [x0 + (d / days) * W, y0 + H - (v / 40) * H];
      const out = [title(0, -50, 1100, tv("Sprint burndown", (t) => `${t}: sprint burndown`), C.ink, 34)];
      out.push(free(x0, y0 + H, x0 + W + 20, y0 + H, { arrow: "end", sw: 2 }), free(x0, y0 + H, x0, y0 - 20, { arrow: "end", sw: 2 }));
      for (let v = 10; v <= 40; v += 10) out.push(free(x0, P(0, v)[1], x0 + W, P(0, v)[1], { stroke: "#eef0f6", sw: 1 }), makeText({ x: 0, y: P(0, v)[1] - 10, w: 70, text: String(v), size: 14, align: "right", color: "#6a7389" }));
      for (let d = 0; d <= days; d += 2) out.push(makeText({ x: P(d, 0)[0] - 30, y: y0 + H + 10, w: 60, text: "Day " + d, size: 13, align: "center", color: "#6a7389" }));
      out.push(makeStroke({ points: [P(0, ideal(0)), P(days, ideal(days))], color: "#9aa1b5", width: 3 }), makeStroke({ points: real.map((v, d) => P(d, v)), color: C.rose, width: 5 }));
      out.push(makeText({ x: x0 + W + 30, y: 60, w: 200, text: "Ideal", size: 16, bold: true, color: "#6a7389" }), makeText({ x: x0 + W + 30, y: 90, w: 200, text: "Work left", size: 16, bold: true, color: C.rose }));
      out.push(makeNote({ x: x0 + W + 20, y: 150, w: 180, h: 150, color: NOTE.yellow, text: th(["Slow start, strong finish"], 1)[0], size: 18 }));
      return out;
    },
  },
  {
    id: "pareto", name: "Pareto chart", desc: "Causes from biggest to smallest: fix the few that matter most.",
    build() {
      const x0 = 80, y0 = 40, H = 420, causes = th(["Late delivery", "Wrong size", "Damaged box", "Slow reply", "Price", "Other"], 0), n = [42, 25, 14, 9, 6, 4];
      const out = [title(0, -50, 1000, tv("What causes most complaints?", (t) => `${t}: biggest causes first`), C.ink, 34)];
      out.push(free(x0, y0 + H, x0 + 6 * 140 + 20, y0 + H, { sw: 2 }), free(x0, y0 + H, x0, y0 - 10, { sw: 2 }));
      let cum = 0; const line = [];
      n.forEach((v, i) => {
        const h = (v / 50) * H, x = x0 + 20 + i * 140;
        out.push(box(x, y0 + H - h, 110, h, String(v), [C.violet, C.blue, C.teal, C.amber, C.rose, "#9aa1b5"][i], "#ffffff", { kind: "rect", bold: true, textColor: "#ffffff", size: 16, sw: 0 }), makeText({ x: x - 10, y: y0 + H + 10, w: 130, text: causes[i], size: 14, align: "center" }));
        cum += v; line.push([x + 55, y0 + H - (cum / 100) * H]);
      });
      out.push(makeStroke({ points: line, color: "#1b2133", width: 3 }));
      line.forEach(([x, y]) => out.push(box(x - 7, y - 7, 14, 14, "", "#1b2133", "#ffffff", { kind: "ellipse", sw: 2 })));
      out.push(makeText({ x: x0 + 6 * 140 + 40, y: line[5][1] - 10, w: 120, text: "100%", size: 15, bold: true }), makeNote({ x: x0 + 6 * 140 + 40, y: 200, w: 170, h: 150, color: NOTE.pink, text: "Fix the first two first", size: 18 }));
      return out;
    },
  },
  {
    id: "kano", name: "Kano model", desc: "Must-haves, performance features and delighters on one chart.",
    build() {
      const cx = 460, cy = 360, W = 380, H = 280;
      const out = [title(0, -60, 1100, tv("What makes customers happy?", (t) => `${t}: what makes customers happy?`), C.ink, 34)];
      out.push(free(cx - W, cy, cx + W, cy, { arrow: "end", sw: 2 }), free(cx, cy + H, cx, cy - H, { arrow: "end", sw: 2 }));
      out.push(makeText({ x: cx + W - 220, y: cy + 12, w: 220, text: "Done well", size: 15, align: "right", color: "#6a7389" }), makeText({ x: cx - W, y: cy + 12, w: 200, text: "Not done", size: 15, color: "#6a7389" }), makeText({ x: cx + 12, y: cy - H, w: 200, text: "Delighted", size: 15, color: "#6a7389" }), makeText({ x: cx + 12, y: cy + H - 24, w: 200, text: "Unhappy", size: 15, color: "#6a7389" }));
      const curve = (f) => Array.from({ length: 31 }, (_, i) => { const t = i / 30 * 2 - 1; return [cx + t * W * 0.95, cy - f(t) * H * 0.9]; });
      out.push(makeStroke({ points: curve((t) => t * 0.9), color: C.blue, width: 4 }), makeStroke({ points: curve((t) => (t < 0 ? -1 + (t + 1) * 0.9 : -0.1 + t * 0.15)), color: C.rose, width: 4 }), makeStroke({ points: curve((t) => (t > 0 ? 0.1 + t * t * 0.9 : 0.1 * (t + 1))), color: C.green, width: 4 }));
      [["Delighters", C.green, NOTE.mint, 860, 60, "Free gift wrap"], ["Performance", C.blue, NOTE.sky, 860, 260, "Faster delivery"], ["Must-haves", C.rose, NOTE.pink, 860, 460, "Safe payment"]].forEach(([t, col, note, x, y, ex], i) => {
        out.push(makeText({ x, y, w: 220, text: t, size: 20, bold: true, color: col }), makeNote({ x, y: y + 34, w: 200, h: 130, color: note, text: th([ex], i * 3)[0], size: 18 }));
      });
      return out;
    },
  },
];

export const LAYOUT_COUNT = TEMPLATES.length;

const baseById = (id) => TEMPLATES.find((t) => t.id === id) || null;
const STYLE = { sans: "Modern", serif: "Elegant", mono: "Technical", calibri: "Clean", cambria: "Classic" };
export const FONT_VARIANTS = Object.keys(STYLE);
/** Name of a template variant, e.g. "Ocean Elegant School Kanban". */
export function variantName(id) {
  const { layout, pal, theme, font } = parseTemplateId(id), b = baseById(layout);
  if (!b) return "";
  if (pal === "p00" && theme === "general" && font === "sans") return b.name;
  const P = paletteById(pal), T = themeById(theme);
  return [P.base ? "" : P.name, STYLE[font] && font !== "sans" ? STYLE[font] : "", T.id === "general" ? "" : T.label, b.name].filter(Boolean).join(" ");
}
/** A template by id: a base layout ("kanban") or a variant ("kanban~p03~school~serif"): palette, content theme, font. */
export function templateById(id) {
  const base = baseById(id);
  if (base) return base;
  const v = parseTemplateId(id), b = baseById(v.layout);
  if (!b || !PALETTES.some((p) => p.id === v.pal) || !THEMES.some((t) => t.id === v.theme) || !STYLE[v.font]) return null;
  return {
    id, name: variantName(id), desc: b.desc, layout: b.id,
    build() {
      const T = themeById(v.theme);
      CUR = T.items ? T : null;
      let objs;
      try { objs = b.build(); } finally { CUR = null; }
      recolor(objs, paletteById(v.pal));
      if (v.font !== "sans") for (const o of objs) if (o.type === "note" || o.type === "shape" || o.type === "text") { o.font = v.font; if (o.type === "text") normalizeObject(o); }
      return objs;
    },
  };
}

/** Adds a template's objects to the board, centred at (cx, cy). Returns the new ids. */
export function applyTemplate(board, id, cx, cy) {
  const t = templateById(id);
  if (!t) throw new Error("Unknown template " + id);
  const objects = t.build();
  const b = boardBounds(objects, byIdOf({ objects }));
  return pasteObjects(board, { objects }, Math.round(cx - (b.x + b.w / 2)), Math.round(cy - (b.y + b.h / 2)));
}

/** Size of a template's content (for placing it). */
export function templateBounds(id) { const objects = templateById(id).build(); return boardBounds(objects, byIdOf({ objects })); }

/** Small SVG preview of a template (for the template picker). */
export function templatePreviewSvg(id, w = 180, h = 112) {
  const objects = templateById(id).build();
  const byId = byIdOf({ objects }), b = boardBounds(objects, byId);
  const body = objects.map((o) => primsToSvg(objectPrims(o, byId))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x - 20} ${b.y - 20} ${b.w + 40} ${b.h + 40}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
}
