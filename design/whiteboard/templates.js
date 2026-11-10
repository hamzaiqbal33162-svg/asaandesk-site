// Board templates (our own layouts and wording). Each build() returns objects around (0, 0);
// applyTemplate() copies them with new ids, centred on a board point.
import { makeNote, makeShape, makeText, makeFrame, makeConnector, pasteObjects, byIdOf } from "./model.js";
import { objectPrims, boardBounds, primsToSvg } from "./render.js";

const C = { violet: "#5b4cf0", blue: "#2f80ff", teal: "#14b8a6", amber: "#f59e0b", rose: "#f43f5e", green: "#22c55e", ink: "#1b2133" };
const link = (a, b, o = {}) => makeConnector({ from: { id: a.id, side: o.fromSide || "auto" }, to: { id: b.id, side: o.toSide || "auto" }, kind: o.kind || "straight", arrow: o.arrow ?? "end", text: o.text || "", stroke: o.stroke || "#334155" });
const header = (x, y, w, text, fill) => makeShape({ x, y, w, h: 56, kind: "rounded", fill, stroke: fill, text, size: 20, bold: true });
const column = (x, y, w, h) => makeShape({ x, y, w, h, kind: "rounded", fill: "#f1f2f8", stroke: "#e3e6f0", sw: 1 });

export const TEMPLATES = [
  {
    id: "brainstorm", name: "Brainstorm", desc: "One question in the middle, ideas all around.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1040, h: 720, name: "Brainstorm" });
      const mid = makeShape({ x: 400, y: 290, w: 240, h: 140, kind: "ellipse", fill: C.violet, stroke: C.violet, text: "What should we try next?", size: 20, bold: true });
      mid.textColor = "#ffffff";
      const prompts = ["A quick win", "A bold idea", "What do customers ask for?", "What slows us down?", "Who could help?", "Something new to test", "What would make it easy?", "A small first step"];
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
      const main = makeShape({ x: 470, y: 300, w: 220, h: 90, kind: "rounded", fill: C.violet, stroke: C.violet, text: "Main topic", size: 22, bold: true });
      main.textColor = "#ffffff";
      const spots = [[160, 120, "Goals", "#dbeafe", C.blue], [160, 520, "People", "#ccfbf1", C.teal], [830, 120, "Ideas", "#fef3c7", C.amber], [830, 520, "Next steps", "#ffe4e6", C.rose]];
      const out = [main];
      for (const [x, y, text, fill, stroke] of spots) {
        const b = makeShape({ x, y, w: 170, h: 64, kind: "rounded", fill, stroke, text, size: 18, bold: true });
        out.push(b, link(main, b, { arrow: "none", stroke }));
        const left = x < 470;
        for (let k = 0; k < 2; k++) {
          const d = makeShape({ x: left ? x - 210 : x + 240, y: y - 50 + k * 100, w: 150, h: 46, kind: "rounded", fill: "#ffffff", stroke, text: k ? "Another detail" : "Add a detail", size: 15 });
          out.push(d, link(b, d, { kind: "elbow", arrow: "none", stroke }));
        }
      }
      return out;
    },
  },
  {
    id: "kanban", name: "Kanban", desc: "To do, Doing and Done columns.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1090, h: 700, name: "Team board" });
      const cols = [["To do", "#d9cbff", ["Write the plan", "Call the supplier"]], ["Doing", "#ffe27a", ["Design the flyer"]], ["Done", "#b7efd2", ["Set up the shop page"]]];
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
      const step = makeShape({ x: 290, y: 130, w: 180, h: 80, kind: "rect", fill: "#e8e5fe", stroke: C.violet, text: "First step" });
      const ask = makeShape({ x: 280, y: 270, w: 200, h: 130, kind: "diamond", fill: "#fef3c7", stroke: C.amber, text: "Is it ready?" });
      const yes = makeShape({ x: 580, y: 295, w: 180, h: 80, kind: "rect", fill: "#e8e5fe", stroke: C.violet, text: "Share it" });
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
      const frame = makeFrame({ x: 0, y: 0, w: 920, h: 700, name: "SWOT analysis" });
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
      out.push(makeNote({ x: 37, y: 145, w: 140, h: 140, text: "Plan the week", color: "#ffe27a" }));
      return out;
    },
  },
  {
    id: "retro", name: "Retrospective", desc: "What went well, what to improve, actions.",
    build() {
      const frame = makeFrame({ x: 0, y: 0, w: 1090, h: 660, name: "Retrospective" });
      const cols = [["What went well", "#b7efd2"], ["What to improve", "#ffc29f"], ["Action items", "#d9cbff"]];
      const out = [frame];
      cols.forEach(([title, color], i) => {
        const x = 30 + i * 355;
        out.push(column(x, 30, 320, 600), header(x, 30, 320, title, color), makeNote({ x: x + 18, y: 110, w: 136, h: 136, color, text: "Add a note" }));
      });
      return out;
    },
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || null;

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
