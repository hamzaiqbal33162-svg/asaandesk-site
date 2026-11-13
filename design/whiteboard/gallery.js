// Whiteboard template gallery (pure module: no DOM). Used by the editor's Templates panel and the intro page.
// Every entry is a real, editable board built by templates.js; thumb(id) draws that same board as a small SVG.
import { TEMPLATES as BOARDS, templateById, variantName, FONT_VARIANTS } from "./templates.js";
import { PALETTES, THEMES } from "./variants.js";
import { objectBounds, objectPrims, primsToSvg, rotTransform } from "./render.js";
import { unionRect } from "./geometry.js";
import { byIdOf } from "./model.js";
import { PHOTOS, photoUrl } from "../shared/photo-library.js";

const SECTION = {
  brainstorm: "Brainstorm and ideas", mindmap: "Brainstorm and ideas", affinity: "Brainstorm and ideas", "empathy-map": "Brainstorm and ideas", venn: "Brainstorm and ideas",
  kanban: "Plan and organise", "launch-plan": "Plan and organise", timeline: "Plan and organise", roadmap: "Plan and organise", weekly: "Plan and organise", meeting: "Plan and organise", "priority-matrix": "Plan and organise",
  flowchart: "Diagrams and maps", orgchart: "Diagrams and maps", fishbone: "Diagrams and maps", journey: "Diagrams and maps", storyboard: "Diagrams and maps",
  swot: "Strategy and reviews", retro: "Strategy and reviews", "business-canvas": "Strategy and reviews", "pros-cons": "Strategy and reviews",
  "crazy-eights": "Brainstorm and ideas", "mood-board": "Brainstorm and ideas", "check-in": "Meetings and teams", okr: "Plan and organise",
  "stakeholder-map": "Strategy and reviews", pest: "Strategy and reviews", "lesson-plan": "Education", "decision-tree": "Diagrams and maps",
};
Object.assign(SECTION, {
  meeting: "Meetings and teams", retro: "Meetings and teams", "start-stop-continue": "Meetings and teams", "four-ls": "Meetings and teams", sailboat: "Meetings and teams",
  "get-to-know": "Meetings and teams", "workshop-agenda": "Meetings and teams", "lean-canvas": "Strategy and reviews", "impact-effort": "Strategy and reviews",
  "experiment-board": "Strategy and reviews", "five-whys": "Strategy and reviews", "story-map": "Plan and organise", "sprint-planning": "Plan and organise",
  "pi-planning": "Plan and organise", gantt: "Plan and organise", "month-calendar": "Plan and organise", swimlanes: "Diagrams and maps",
  "concept-map": "Diagrams and maps", persona: "Brainstorm and ideas", "project-kickoff": "Plan and organise", funnel: "Strategy and reviews",
  comparison: "Strategy and reviews", "daily-standup": "Meetings and teams", brainwriting: "Brainstorm and ideas", "feedback-wall": "Brainstorm and ideas",
  cycle: "Diagrams and maps", pyramid: "Diagrams and maps", "value-proposition": "Strategy and reviews", scamper: "Brainstorm and ideas", checklist: "Plan and organise",
  "vision-board": "Brainstorm and ideas", "user-flow": "Diagrams and maps", "data-flow": "Diagrams and maps", sitemap: "Diagrams and maps", "value-chain": "Strategy and reviews",
  raci: "Plan and organise", "content-calendar": "Plan and organise", "chore-chart": "Plan and organise", "family-tree": "Diagrams and maps", "uml-class": "Diagrams and maps",
  architecture: "Diagrams and maps", "budget-plan": "Plan and organise", "daily-planner": "Plan and organise", "quarterly-plan": "Plan and organise", "project-update": "Meetings and teams",
  "strategy-map": "Strategy and reviews", "brand-board": "Brainstorm and ideas", "habit-tracker": "Plan and organise", "risk-matrix": "Strategy and reviews", "five-forces": "Strategy and reviews",
  "renovation-plan": "Plan and organise", "brainstorm-grid": "Brainstorm and ideas", "doodle-brainstorm": "Brainstorm and ideas", "sequence-diagram": "Diagrams and maps",
  "now-next-later": "Plan and organise", "mad-sad-glad": "Meetings and teams", "vertical-timeline": "Plan and organise", bracket: "Diagrams and maps",
  "seating-plan": "Plan and organise", "meal-planner": "Plan and organise", "kanban-swimlanes": "Plan and organise", "onion-diagram": "Diagrams and maps",
  "radar-chart": "Strategy and reviews", "lotus-blossom": "Brainstorm and ideas", "hero-journey": "Diagrams and maps", burndown: "Plan and organise",
  pareto: "Strategy and reviews", kano: "Strategy and reviews",
});
const TAGS2 = {
  "start-stop-continue": ["retrospective", "retro", "team"], "four-ls": ["retrospective", "liked", "learned"], sailboat: ["retrospective", "retro", "boat", "risks"],
  "lean-canvas": ["startup", "business model", "plan"], "story-map": ["user stories", "agile", "releases"], "impact-effort": ["2x2", "matrix", "prioritise"],
  "sprint-planning": ["agile", "scrum", "backlog"], "pi-planning": ["program", "agile", "dependencies"], "get-to-know": ["icebreaker", "team", "fun"],
  gantt: ["schedule", "project", "weeks"], swimlanes: ["process", "flowchart", "lanes"], "concept-map": ["ideas", "links", "mind map"],
  "workshop-agenda": ["agenda", "workshop", "parking lot"], persona: ["ux", "customer", "user"], "five-whys": ["root cause", "problem", "why"],
  "experiment-board": ["hypothesis", "test", "lean"], "month-calendar": ["calendar", "month", "events"],
  "project-kickoff": ["kickoff", "project", "scope"], funnel: ["marketing", "sales", "conversion"], comparison: ["table", "options", "compare"],
  "daily-standup": ["scrum", "standup", "team"], brainwriting: ["ideas", "6-3-5", "workshop"], "feedback-wall": ["feedback", "quotes", "customers"],
  cycle: ["loop", "process", "pdca"], pyramid: ["hierarchy", "layers", "levels"], "value-proposition": ["customer", "fit", "product"],
  scamper: ["creativity", "ideas", "innovation"], checklist: ["event", "tasks", "to do"],
  "vision-board": ["goals", "dreams", "moodboard"], "user-flow": ["ux", "screens", "app"], "data-flow": ["dfd", "system", "process"], sitemap: ["website", "pages", "tree"],
  "value-chain": ["business", "porter", "activities"], raci: ["roles", "responsibility", "matrix"], "content-calendar": ["social media", "posts", "marketing"],
  "chore-chart": ["family", "kids", "jobs"], "family-tree": ["family", "genealogy", "relatives"], "uml-class": ["uml", "software", "classes"],
  architecture: ["system", "cloud", "software"], "budget-plan": ["money", "finance", "savings"], "daily-planner": ["day", "schedule", "to do"],
  "quarterly-plan": ["year", "quarters", "goals"], "project-update": ["status", "report", "progress"], "strategy-map": ["balanced scorecard", "goals", "strategy"],
  "brand-board": ["brand", "logo", "colours", "fonts"], "habit-tracker": ["habits", "week", "tracker"], "risk-matrix": ["risk", "likelihood", "impact"],
  "five-forces": ["porter", "competition", "market"], "renovation-plan": ["home", "rooms", "budget"], "brainstorm-grid": ["categories", "ideas", "grid"],
  "doodle-brainstorm": ["doodle", "hand drawn", "ideas"], "sequence-diagram": ["uml", "messages", "steps"], "now-next-later": ["roadmap", "priorities"],
  "mad-sad-glad": ["retrospective", "retro", "feelings"], "vertical-timeline": ["history", "milestones", "story"], bracket: ["tournament", "compare", "vote"],
  "seating-plan": ["event", "wedding", "tables"], "meal-planner": ["food", "week", "shopping list"], "kanban-swimlanes": ["kanban", "lanes", "agile"],
  "onion-diagram": ["stakeholders", "rings", "layers"], "radar-chart": ["spider", "skills", "chart"], "lotus-blossom": ["ideas", "creativity", "grid"],
  "hero-journey": ["story", "writing", "circle"], burndown: ["agile", "sprint", "chart"], pareto: ["chart", "causes", "quality"], kano: ["product", "features", "customers"],
};
const TAGS = {
  brainstorm: ["ideas", "sticky notes", "workshop"], mindmap: ["mind map", "branches", "topics"], kanban: ["tasks", "to do", "agile", "board"],
  flowchart: ["process", "diagram", "decision"], swot: ["analysis", "strategy", "strengths"], weekly: ["planner", "week", "schedule"],
  retro: ["retrospective", "team", "sprint"], "launch-plan": ["launch", "product", "marketing", "sections"], timeline: ["milestones", "schedule", "dates"],
  venn: ["compare", "circles", "overlap"], journey: ["customer", "experience", "ux"], roadmap: ["product", "teams", "months", "gantt"],
  fishbone: ["cause", "problem", "root cause", "ishikawa"], affinity: ["groups", "research", "clusters"], orgchart: ["team", "people", "hierarchy"],
  "priority-matrix": ["urgent", "important", "eisenhower", "priorities"], "empathy-map": ["persona", "ux", "feelings"],
  "business-canvas": ["business model", "startup", "plan"], meeting: ["agenda", "notes", "actions", "table"], "pros-cons": ["decision", "compare"],
  storyboard: ["video", "scenes", "story"], "crazy-eights": ["sketch", "ideas", "design sprint"], okr: ["goals", "okr", "results"],
  "stakeholder-map": ["people", "power", "interest"], pest: ["pestle", "analysis", "market"], "lesson-plan": ["class", "teacher", "school"],
  "decision-tree": ["choice", "options", "flow"], "mood-board": ["inspiration", "colours", "style"], "check-in": ["feelings", "team", "vote", "icebreaker"],
  ...TAGS2,
};
// Order shown in the panel and on the intro page (the most asked-for first).
// The first 40 are 40 different layouts, led by the kinds Canva shows first (brainstorm, launch plan, concept map, user flow, …).
const ORDER = ["brainstorm", "launch-plan", "concept-map", "user-flow", "mindmap", "kanban", "flowchart", "vision-board", "gantt", "orgchart",
  "content-calendar", "raci", "timeline", "retro", "swot", "venn", "journey", "roadmap", "fishbone", "family-tree", "sitemap", "mood-board",
  "business-canvas", "stakeholder-map", "data-flow", "daily-planner", "budget-plan", "value-chain", "storyboard", "project-update",
  "quarterly-plan", "chore-chart", "lean-canvas", "affinity", "sailboat", "priority-matrix", "story-map", "empathy-map", "decision-tree", "brand-board",
  "start-stop-continue", "impact-effort", "meeting", "pros-cons", "sprint-planning", "weekly", "persona", "four-ls", "crazy-eights", "swimlanes",
  "okr", "get-to-know", "five-whys", "pest", "lesson-plan", "pi-planning", "workshop-agenda", "experiment-board", "check-in", "month-calendar",
  "project-kickoff", "funnel", "daily-standup", "comparison", "brainwriting", "feedback-wall", "cycle", "pyramid", "value-proposition", "scamper",
  "checklist", "uml-class", "architecture", "strategy-map", "habit-tracker", "risk-matrix", "five-forces", "brainstorm-grid", "doodle-brainstorm",
  "renovation-plan", "sequence-diagram", "now-next-later", "mad-sad-glad", "vertical-timeline", "bracket", "seating-plan", "meal-planner", "kanban-swimlanes",
  "onion-diagram", "radar-chart", "lotus-blossom", "hero-journey", "burndown", "pareto", "kano"];

/** Canva's whiteboard template count (canva.com/whiteboards/templates, 11 Nov 2026): we offer the same number. */
export const COUNT = 5247;
const LAYOUT_IDS = ORDER.filter((id) => templateById(id)).concat(BOARDS.map((t) => t.id).filter((id) => !ORDER.includes(id)));
export const LAYOUTS = LAYOUT_IDS.length;
const STYLE_TAG = { sans: "modern", serif: "elegant", mono: "technical", calibri: "clean", cambria: "classic" };
function entry(id, layout, pal, theme, font) {
  const t = templateById(layout);
  const tags = [...(TAGS[layout] || []), ...(pal.base ? [] : [pal.name.toLowerCase()]), ...(theme.id === "general" ? [] : [theme.label.toLowerCase()]), STYLE_TAG[font]];
  return { id, name: id === layout ? t.name : variantName(id), desc: t.desc, tool: "whiteboard", app: "whiteboard",
    layout, layoutName: t.name, palette: pal.id, paletteName: pal.name, theme: theme.id, themeName: theme.label, font,
    section: id === layout ? "Popular whiteboards" : SECTION[layout] || "More templates for you", tags };
}
/** Filter chips for the Templates panel (keys are template fields). */
export const FILTERS = [
  { key: "layout", label: "Type", options: () => LAYOUT_IDS.map((id) => ({ value: id, label: templateById(id).name })) },
  { key: "theme", label: "Topic", options: () => THEMES.map((t) => ({ value: t.id, label: t.label })) },
  { key: "palette", label: "Colours", options: () => PALETTES.map((p) => ({ value: p.id, label: p.name })) },
].map((f) => ({ ...f, options: f.options() }));
/** Name of any template id (also ids not in the first COUNT). */
export function templateMeta(id) { const t = templateById(id); return t ? { id, name: t.name } : null; }
// Every base layout first, then layout × palette × content theme × font combinations in a well-mixed order:
// a fixed stride through the whole space (coprime with its size) so neighbours differ in layout, colours and theme.
function generate() {
  const L = LAYOUT_IDS.length, P = PALETTES.length, T = THEMES.length, F = FONT_VARIANTS.length, S = L * P * T * F;
  const out = LAYOUT_IDS.map((id) => entry(id, id, PALETTES[0], THEMES[0], "sans"));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let step = 7919; while (gcd(step, S) !== 1) step += 2;
  for (let k = 0; out.length < Math.min(COUNT, S) && k < S; k++) {
    let n = (k * step + 13) % S;
    const l = n % L; n = Math.floor(n / L);
    const p = n % P; n = Math.floor(n / P);
    const t = n % T; n = Math.floor(n / T);
    const f = n % F;
    if (p === 0 && t === 0 && f === 0) continue; // that is the base layout itself
    const layout = LAYOUT_IDS[l], pal = PALETTES[p], theme = THEMES[t], font = FONT_VARIANTS[f];
    out.push(entry(`${layout}~${pal.id}~${theme.id}~${font}`, layout, pal, theme, font));
  }
  return out;
}
export const TEMPLATES = generate();
export const TOTAL = TEMPLATES.length;

// Thumbnails are built on demand from the id and a few hundred are kept.
const cache = new Map();
// Template photos: the small file in thumbnails (never the full-size photo).
const THUMB_OF = new Map(PHOTOS.map((p) => [photoUrl(p, "full"), photoUrl(p, "thumb")]));
/** Self-contained 320 × 200 SVG preview of a template: the real board, frames without their name labels. */
export function thumb(id) {
  if (cache.has(id)) return cache.get(id);
  const t = templateById(id);
  if (!t) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="#f4f5fa"/></svg>';
  const objects = t.build(), byId = byIdOf({ objects });
  const b = unionRect(objects.map((o) => (o.type === "frame" ? { x: o.x, y: o.y, w: o.w, h: o.h } : objectBounds(o, byId))));
  const pad = Math.max(b.w, b.h) * 0.012;
  const body = objects.map((o) => {
    let prims = objectPrims(o, byId);
    if (o.type === "frame") prims = prims.filter((p) => p.t == null);
    if (o.type === "image") prims = prims.map((p) => (p.img != null && THUMB_OF.has(p.img) ? { ...p, img: THUMB_OF.get(p.img) } : p));
    const s = primsToSvg(prims), tr = rotTransform(o);
    return tr ? `<g transform="${tr}">${s}</g>` : s;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${t.name.replace(/[<&"]/g, "")} template">` +
    `<rect width="320" height="200" fill="#eceef5"/>` +
    `<svg x="4" y="4" width="312" height="192" viewBox="${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}" preserveAspectRatio="xMidYMid meet">${body}</svg></svg>`;
  cache.set(id, svg);
  if (cache.size > 400) cache.delete(cache.keys().next().value);
  return svg;
}
