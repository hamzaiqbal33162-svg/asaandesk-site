// Board templates (our own layouts and wording). The builders live in templates-a/b/c.js and draw on a 1280 × 800
// board with the kit in templates-kit.js (bold title header, section panels, sticky notes, icons, photos).
// A template id is "<layout>" or a variant "<layout>~<palette>~<theme>~<font>" (variants.js): same layout, own colours,
// own content theme and font. applyTemplate() copies the objects with new ids, centred on a board point.
import { byIdOf, pasteObjects, normalizeObject } from "./model.js";
import { objectPrims, boardBounds, primsToSvg, noteLayout, shapeLayout } from "./render.js";
import { parseTemplateId, paletteById, themeById, recolor, PALETTES, THEMES } from "./variants.js";
import { setBuild, resetPhotos } from "./templates-kit.js";
import { ALL_PHOTOS, photoUrl } from "../shared/photo-library.js";
import { BUILDERS_A } from "./templates-a.js";
import { BUILDERS_B } from "./templates-b.js";
import { BUILDERS_C } from "./templates-c.js";

const BUILD = { ...BUILDERS_A, ...BUILDERS_B, ...BUILDERS_C };
/** [id, name, description] of every base layout (ids are stable: saved links and variants use them). */
const META = [
  ["brainstorm","Brainstorm","One question in the middle, ideas all around."],
  ["mindmap","Mind map","A main topic with branches and details."],
  ["kanban","Kanban","To do, Doing and Done columns."],
  ["flowchart","Flowchart starter","Start, steps, a yes/no decision and the end."],
  ["swot","SWOT","Strengths, weaknesses, opportunities, threats."],
  ["weekly","Weekly planner","Seven days, with room for notes."],
  ["retro","Retrospective","What went well, what to improve, actions."],
  ["launch-plan","Launch plan","Before and after launch sections with sticky notes."],
  ["timeline","Project timeline","Milestones along a line, month by month."],
  ["venn","Venn diagram","Three circles to compare what is shared and what is not."],
  ["journey","Customer journey map","Stages across, what people do, think and feel down."],
  ["roadmap","Project roadmap","Teams down the side, months across, work as bars."],
  ["fishbone","Fishbone diagram","Find the causes of a problem, sorted by category."],
  ["affinity","Affinity map","Sort many notes into groups with a clear name."],
  ["orgchart","Org chart","Who leads which team, with lines that follow the boxes."],
  ["priority-matrix","Priority matrix","Urgent and important: do, plan, share or drop."],
  ["empathy-map","Empathy map","What a person says, thinks, does and feels."],
  ["business-canvas","Business plan on a page","Nine boxes for a whole business idea."],
  ["meeting","Meeting agenda","Agenda, notes, decisions and next steps with owners."],
  ["pros-cons","Pros and cons","Weigh a decision: good points, bad points, the choice."],
  ["storyboard","Storyboard","Six scenes with a picture box and a caption each."],
  ["crazy-eights","Crazy eights","Eight quick sketch boxes, one idea in each."],
  ["okr","Goals and key results","Three goals, each with results you can measure."],
  ["stakeholder-map","Stakeholder map","Who has power and who cares: keep close, keep happy, inform."],
  ["pest","PEST analysis","Political, economic, social and technology factors."],
  ["lesson-plan","Lesson plan","Goal, warm-up, main activity, practice and wrap-up with times."],
  ["decision-tree","Decision tree","One question, two options, and what each leads to."],
  ["mood-board","Mood board","Picture spaces, colours and words for a look and feel."],
  ["check-in","Team check-in","How is everyone feeling? Vote with a dot, add a note."],
  ["start-stop-continue","Start, stop, continue","A quick retro: what to start, stop and keep doing."],
  ["four-ls","4 Ls retrospective","Liked, learned, lacked and longed for."],
  ["sailboat","Sailboat retrospective","Wind that helps, anchors that slow, rocks ahead and the island goal."],
  ["lean-canvas","Lean canvas","Problem, solution, unique value, customers and money on one page."],
  ["story-map","User story map","Big steps across, details below, sliced into releases."],
  ["impact-effort","Impact and effort matrix","Quick wins, big bets, fill-ins and time sinks on a 2×2."],
  ["sprint-planning","Sprint planning","Sprint goal, backlog, what fits, team capacity and risks."],
  ["pi-planning","Program board","Teams by rows, sprints by columns, with dependencies."],
  ["get-to-know","Get to know the team","An icebreaker card for every person: photo, name and fun facts."],
  ["gantt","Gantt chart","Tasks down the side, weeks across, bars and milestones."],
  ["swimlanes","Swimlane flowchart","Who does what: a lane for each person or team."],
  ["concept-map","Concept map","Ideas in circles joined by labelled lines."],
  ["workshop-agenda","Workshop agenda","A timed agenda down the side and a parking lot for later."],
  ["persona","Persona card","Who we design for: goals, frustrations and a quote."],
  ["five-whys","5 whys","Ask why five times to find the real cause."],
  ["experiment-board","Experiment board","We believe, we will test, we will know when."],
  ["month-calendar","Monthly calendar","A month grid for plans, events and deadlines."],
  ["project-kickoff","Project kickoff","Why, what, who, when and risks for a new project."],
  ["funnel","Funnel","From many people who hear about you to the few who buy again."],
  ["comparison","Comparison table","Three options side by side, feature by feature."],
  ["daily-standup","Daily stand-up","Yesterday, today and blockers for each person."],
  ["brainwriting","Brainwriting 6-3-5","Six people, three ideas each, build on the row above."],
  ["feedback-wall","Feedback wall","What people said, sorted into loved, ideas and fix next."],
  ["cycle","Cycle diagram","Four steps that repeat: plan, do, check, improve."],
  ["pyramid","Pyramid","Layers from the base up: needs, priorities or a hierarchy."],
  ["value-proposition","Value proposition","What customers need on one side, how we help on the other."],
  ["scamper","SCAMPER ideas","Seven ways to rethink an idea: swap, combine, adapt and more."],
  ["checklist","Event checklist","Tasks with owners and tick boxes, grouped by when they happen."],
  ["vision-board","Vision board","Your goals for the year as picture spaces and big words."],
  ["user-flow","User flow","Screens a person goes through, with choices and arrows."],
  ["data-flow","Data flow diagram","Who sends what: people, steps and where data is kept."],
  ["sitemap","Sitemap","Every page of a website as a tree from the home page."],
  ["value-chain","Value chain","Support work above, main steps as arrows, value at the end."],
  ["raci","RACI chart","Who is responsible, accountable, consulted and informed for each task."],
  ["content-calendar","Content calendar","Posts per channel, week by week."],
  ["chore-chart","Chore chart","Who does which job on which day, with stars when done."],
  ["family-tree","Family tree","Grandparents, parents and children joined by lines."],
  ["uml-class","UML class diagram","Classes with their fields and actions, and how they relate."],
  ["architecture","Architecture diagram","How the parts of a system talk: apps, servers, data."],
  ["budget-plan","Budget plan","Money in, money out, what is left and the savings goal."],
  ["daily-planner","Daily planner","Hours of the day, top three priorities, to-dos and notes."],
  ["quarterly-plan","Quarterly plan","Goals and milestones for each quarter of the year."],
  ["project-update","Project update","Status at a glance: done, in progress, blocked and next."],
  ["strategy-map","Strategy map","Goals in four layers, each one helping the layer above."],
  ["brand-board","Brand board","Logo, colours, fonts and words that describe the brand."],
  ["habit-tracker","Habit tracker","Habits down the side, a circle for every day of the week."],
  ["risk-matrix","Risk matrix","How likely and how serious: a 3 by 3 grid from green to red."],
  ["five-forces","Five forces","Rivals in the middle; buyers, suppliers, newcomers and substitutes around."],
  ["renovation-plan","Renovation plan","Room by room: what to change, the budget and the order."],
  ["brainstorm-grid","Brainstorm grid","Ideas sorted into six coloured categories."],
  ["doodle-brainstorm","Doodle brainstorm","A hand-drawn feel: doodles, arrows and notes around one question."],
  ["sequence-diagram","Sequence diagram","Who talks to whom, in order, down the page."],
  ["now-next-later","Now, next, later","A simple roadmap in three time buckets."],
  ["mad-sad-glad","Mad, sad, glad","A feelings retro: what made us mad, sad and glad."],
  ["vertical-timeline","Vertical timeline","Milestones down a centre line, left and right."],
  ["bracket","Tournament bracket","Eight entries, quarter finals to the winner."],
  ["seating-plan","Seating plan","Round tables with seats and names for an event."],
  ["meal-planner","Meal planner","Breakfast, lunch and dinner for every day, plus a shopping list."],
  ["kanban-swimlanes","Kanban with swimlanes","Status columns across, one lane per team or person."],
  ["onion-diagram","Onion diagram","Rings from the core outwards: who is closest to the work."],
  ["radar-chart","Skills radar","Six skills on a spider web: where we are strong and where to grow."],
  ["lotus-blossom","Lotus blossom","One theme, eight ideas around it, each grown into eight more."],
  ["hero-journey","Story circle","A story in eight steps around a circle, from comfort to change."],
  ["burndown","Burndown chart","Work left each day of the sprint against the ideal line."],
  ["pareto","Pareto chart","Causes from biggest to smallest: fix the few that matter most."],
  ["kano","Kano model","Must-haves, performance features and delighters on one chart."],
];
/** Builds a layout with a content theme (null = the layout's own text); seed = template id (photo choice). */
function buildLayout(layout, theme, seed) {
  setBuild(theme, seed);
  resetPhotos();
  try { return BUILD[layout](); } finally { setBuild(null, "board"); }
}
export const TEMPLATES = META.filter(([id]) => BUILD[id]).map(([id, name, desc]) => ({ id, name, desc, build: () => buildLayout(id, null, id) }));

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
      const objs = buildLayout(b.id, themeById(v.theme), id);
      recolor(objs, paletteById(v.pal));
      // Monospace letters are wider than the sans metrics the layouts were fitted with: shrink text to keep it inside.
      const k = v.font === "mono" ? 0.82 : 1;
      if (v.font !== "sans") for (const o of objs) if (o.type === "note" || o.type === "shape" || o.type === "text") {
        if (k < 1 && o.text) o.size = Math.max(8, Math.floor((o.type === "text" ? o.size : (o.type === "note" ? noteLayout(o) : shapeLayout(o)).size) * k));
        o.font = v.font;
        if (o.type === "text") normalizeObject(o);
      }
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

const THUMB_OF = new Map(ALL_PHOTOS.map((p) => [photoUrl(p, "full"), photoUrl(p, "thumb")]));
/** Small SVG preview of a template (for the template picker). */
export function templatePreviewSvg(id, w = 180, h = 112) {
  const objects = templateById(id).build();
  const byId = byIdOf({ objects }), b = boardBounds(objects, byId);
  // Small photo files only (never the full-size photo) in a preview.
  const body = objects.map((o) => primsToSvg(objectPrims(o, byId).map((p) => (p.img != null && THUMB_OF.has(p.img) ? { ...p, img: THUMB_OF.get(p.img) } : p)))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x - 20} ${b.y - 20} ${b.w + 40} ${b.h + 40}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
}
