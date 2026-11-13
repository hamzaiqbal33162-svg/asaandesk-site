// Elements kit › Shapes: Lines, Basic shapes, Polygons, Stars, Arrows, Callouts, Flowchart (our own geometry).
// Every item: {id, name, tags, spec}; spec = the insert interface's shape spec {kind, d, vb, fill, stroke, strokeWidth,
// dash, radius (fraction of the shorter side), sides, points, inner, arrow}. kind is a native Studio kind (rect, ellipse,
// triangle, line, arrow, star, polygon, heart) when it matches, else "path"; d + vb always describe the geometry.
import { INK, n, ptsPath, regPoly, starPts, rrect, ell, ellRev, heartD } from "./assets-svg.js";

const F = (id, name, tags, kind, d, vb = [100, 100], x = {}) => ({ id, name, tags, spec: { kind, d, vb, fill: INK, stroke: "none", ...x } });
const L = (id, name, tags, kind, d, vb = [200, 24], x = {}) => ({ id, name, tags, line: true, spec: { kind, d, vb, fill: "none", stroke: INK, strokeWidth: 4, ...x } });
const O = (id, name, tags, d, vb = [120, 80], x = {}) => ({ id, name, tags, spec: { kind: "path", d, vb, fill: "#ffffff", stroke: INK, strokeWidth: 3, ...x } });

// ---------- lines (stroke-only paths; heads are open chevrons so one stroked path draws the whole line)
const head = (x, y, ang, s = 9) => { const a = (ang * Math.PI) / 180, p = (da) => [x - s * Math.cos(a + da), y - s * Math.sin(a + da)]; const [ax, ay] = p(0.6), [bx, by] = p(-0.6); return `M${n(ax)} ${n(ay)}L${n(x)} ${n(y)}L${n(bx)} ${n(by)}`; };
const LINES = [
  L("line", "Line", "line straight solid divider rule", "line", "M2 12H198"),
  L("line-dashed", "Dashed line", "line dashed dash divider", "line", "M2 12H198", undefined, { dash: "dashed" }),
  L("line-dotted", "Dotted line", "line dotted dots divider", "line", "M2 12H198", undefined, { dash: "dotted" }),
  L("line-arrow", "Arrow line", "line arrow pointer connector", "arrow", "M2 12H198" + head(198, 12, 0), undefined, { arrow: { end: "arrow" } }),
  L("line-double-arrow", "Double arrow line", "line arrow both double two way", "path", head(2, 12, 180) + "M2 12H198" + head(198, 12, 0), undefined, { arrow: { start: "arrow", end: "arrow" } }),
  L("line-thick", "Thick line", "line thick bold heavy bar", "line", "M5 12H195", undefined, { strokeWidth: 10 }),
  L("line-dashed-arrow", "Dashed arrow", "line arrow dashed connector", "path", "M2 12H198" + head(198, 12, 0), undefined, { dash: "dashed", arrow: { end: "arrow" } }),
  L("line-circle-ends", "Line with dots", "line circle ends dot connector", "path", `${ell(8, 12, 6)}M14 12H186${ell(192, 12, 6)}`, undefined, { arrow: { start: "circle", end: "circle" } }),
  L("line-bar-ends", "Line with end bars", "line bar ends measure dimension", "path", "M2 3V21M2 12H198M198 3V21"),
  L("line-elbow", "Elbow connector", "connector elbow line arrow flowchart", "path", "M2 6H100V54H198" + head(198, 54, 0), [200, 60], { arrow: { end: "arrow" } }),
  L("line-curve", "Curved connector", "connector curved line arrow flowchart", "path", "M2 54C70 54 120 6 198 6" + head(198, 6, -8), [200, 60], { arrow: { end: "arrow" } }),
  L("line-wave", "Wavy line", "line wave wavy squiggle", "path", "M2 12" + Array.from({ length: 8 }, (_, i) => `Q${n(14 + i * 24.5)} ${i % 2 ? 22 : 2} ${n(26.25 + i * 24.5)} 12`).join(""), undefined, { strokeWidth: 3.5 }),
  L("line-zigzag", "Zigzag line", "line zigzag zig zag", "path", "M2 18" + Array.from({ length: 12 }, (_, i) => `L${n(18.3 + i * 16.3)} ${i % 2 ? 18 : 4}`).join(""), undefined, { strokeWidth: 3.5 }),
  L("line-double", "Double line", "line double two parallel", "path", "M2 7H198M2 17H198", undefined, { strokeWidth: 3 }),
  L("line-diamond-end", "Line with diamond", "line diamond end connector", "path", "M2 12H182M182 12L190 4L198 12L190 20Z"),
  L("line-vertical", "Vertical line", "line vertical upright divider", "line", "M12 2V198", [24, 200]),
];

// ---------- basic shapes
const BASIC = [
  F("square", "Square", "square box rectangle block", "rect", rrect(0, 0, 100, 100)),
  F("rounded-square", "Rounded square", "rounded square corner soft box", "rect", rrect(0, 0, 100, 100, 18), undefined, { radius: 0.18 }),
  F("circle", "Circle", "circle round dot ellipse", "ellipse", ell(50, 50, 50)),
  F("triangle", "Triangle", "triangle up", "triangle", ptsPath([[50, 0], [100, 100], [0, 100]])),
  F("triangle-down", "Inverted triangle", "triangle down inverted", "path", ptsPath([[0, 0], [100, 0], [50, 100]])),
  F("rectangle", "Rectangle", "rectangle wide box banner", "rect", rrect(0, 0, 160, 100), [160, 100]),
  F("oval", "Oval", "oval ellipse egg", "ellipse", ell(80, 50, 80, 50), [160, 100]),
  F("pill", "Pill", "pill capsule rounded button", "rect", rrect(0, 0, 160, 70, 35), [160, 70], { radius: 0.5 }),
  F("diamond", "Diamond", "diamond rhombus", "path", ptsPath([[50, 0], [100, 50], [50, 100], [0, 50]])),
  F("parallelogram", "Parallelogram", "parallelogram slanted", "path", ptsPath([[30, 0], [140, 0], [110, 90], [0, 90]]), [140, 90]),
  F("trapezoid", "Trapezoid", "trapezoid trapezium", "path", ptsPath([[28, 0], [112, 0], [140, 90], [0, 90]]), [140, 90]),
  F("right-triangle", "Right triangle", "triangle right angle", "path", ptsPath([[0, 0], [100, 100], [0, 100]])),
  F("semicircle", "Semicircle", "semicircle half circle dome", "path", "M0 50A50 50 0 0 1 100 50Z", [100, 50]),
  F("quarter-circle", "Quarter circle", "quarter circle pie corner", "path", "M0 0A100 100 0 0 1 100 100H0Z"),
  F("arch", "Arch", "arch window door", "path", "M0 100V50A50 50 0 0 1 100 50V100Z", [100, 100]),
  F("ring", "Ring", "ring donut circle outline hollow", "path", ell(50, 50, 50) + ellRev(50, 50, 32)),
  F("heart", "Heart", "heart love valentine", "heart", heartD(0, 0, 100, 92), [100, 92]),
  F("plus", "Plus", "plus cross add medical", "path", ptsPath([[34, 0], [66, 0], [66, 34], [100, 34], [100, 66], [66, 66], [66, 100], [34, 100], [34, 66], [0, 66], [0, 34], [34, 34]])),
  F("cross-x", "Cross", "cross x multiply close", "path", ptsPath([[14, 0], [50, 36], [86, 0], [100, 14], [64, 50], [100, 86], [86, 100], [50, 64], [14, 100], [0, 86], [36, 50], [0, 14]])),
  F("cloud", "Cloud", "cloud weather sky", "path", "M30 90C12 90 0 78 0 62C0 47 12 36 27 37C30 18 46 6 64 9C78 11 88 22 91 35C108 33 124 45 124 63C124 78 112 90 96 90Z", [124, 90]),
  F("teardrop", "Teardrop", "teardrop drop water location", "path", "M50 0C50 0 90 46 90 70A40 40 0 0 1 10 70C10 46 50 0 50 0Z", [100, 110]),
  F("crescent", "Crescent moon", "crescent moon night eid ramadan", "path", "M62 4A48 48 0 1 0 96 76A40 40 0 1 1 62 4Z"),
  F("leaf", "Leaf", "leaf nature plant", "path", "M4 96C4 40 40 4 96 4C96 60 60 96 4 96Z"),
  F("blob", "Blob", "blob organic abstract", "path", "M52 2C76 0 98 18 98 44C98 70 80 98 50 98C22 98 2 78 4 50C6 24 28 4 52 2Z"),
];

// ---------- polygons and stars (native polygon / star kinds, d for everyone else)
const POLY_NAMES = { 5: "Pentagon", 6: "Hexagon", 7: "Heptagon", 8: "Octagon", 9: "Nonagon", 10: "Decagon", 12: "Dodecagon" };
const POLYGONS = [
  ...[5, 6, 7, 8, 9, 10, 12].map((k) => F(`polygon-${k}`, POLY_NAMES[k], `polygon ${POLY_NAMES[k].toLowerCase()} ${k} sides`, "polygon", ptsPath(regPoly(k, 50, 50, 50)), undefined, { sides: k })),
  F("hexagon-flat", "Flat hexagon", "hexagon flat honeycomb polygon", "path", ptsPath(regPoly(6, 50, 43.3, 50, 0).map(([x, y]) => [x, y])), [100, 86.6]),
  F("octagon-flat", "Stop sign octagon", "octagon flat stop polygon", "path", ptsPath(regPoly(8, 50, 50, 50, -22.5))),
  F("triangle-round", "Rounded triangle", "triangle rounded soft polygon", "path", "M43 6Q50 -6 57 6L97 82Q103 94 89 94H11Q-3 94 3 82Z", [100, 96]),
];
const STAR_DEF = [[4, 0.38, "4-point star", "sparkle twinkle"], [5, 0.42, "5-point star", "rating favourite"], [5, 0.55, "Chubby star", "soft rating"], [6, 0.55, "6-point star", "hexagram"], [7, 0.55, "7-point star", ""], [8, 0.6, "8-point star", "compass"], [10, 0.65, "10-point star", "badge"], [12, 0.7, "12-point star", "seal badge"], [16, 0.78, "16-point burst", "burst sale"], [24, 0.84, "24-point burst", "burst sale price"], [32, 0.9, "Seal", "seal certificate stamp badge"]];
const STARS = [
  ...STAR_DEF.map(([k, r, name, t]) => F(`star-${k}-${Math.round(r * 100)}`, name, `star ${k} points ${t}`, "star", ptsPath(starPts(k, 50, 50, 50, 50 * r)), undefined, { points: k, inner: r })),
  F("star-sparkle", "Sparkle", "sparkle twinkle shine star magic", "path", "M50 0C54 36 64 46 100 50C64 54 54 64 50 100C46 64 36 54 0 50C36 46 46 36 50 0Z"),
];

// ---------- block arrows
const ARROWS = [
  F("arrow-right", "Right arrow", "arrow right next forward", "path", ptsPath([[0, 30], [90, 30], [90, 0], [150, 50], [90, 100], [90, 70], [0, 70]]), [150, 100]),
  F("arrow-left", "Left arrow", "arrow left back previous", "path", ptsPath([[150, 30], [60, 30], [60, 0], [0, 50], [60, 100], [60, 70], [150, 70]]), [150, 100]),
  F("arrow-up", "Up arrow", "arrow up increase", "path", ptsPath([[30, 150], [30, 60], [0, 60], [50, 0], [100, 60], [70, 60], [70, 150]]), [100, 150]),
  F("arrow-down", "Down arrow", "arrow down decrease", "path", ptsPath([[30, 0], [30, 90], [0, 90], [50, 150], [100, 90], [70, 90], [70, 0]]), [100, 150]),
  F("arrow-left-right", "Left-right arrow", "arrow both double left right exchange", "path", ptsPath([[0, 50], [45, 0], [45, 30], [135, 30], [135, 0], [180, 50], [135, 100], [135, 70], [45, 70], [45, 100]]), [180, 100]),
  F("arrow-up-down", "Up-down arrow", "arrow both double up down vertical", "path", ptsPath([[50, 0], [100, 45], [70, 45], [70, 135], [100, 135], [50, 180], [0, 135], [30, 135], [30, 45], [0, 45]]), [100, 180]),
  F("chevron", "Chevron", "chevron arrow step process", "path", ptsPath([[0, 0], [100, 0], [140, 50], [100, 100], [0, 100], [40, 50]]), [140, 100]),
  F("pentagon-arrow", "Pentagon arrow", "pentagon arrow tag label step home plate", "path", ptsPath([[0, 0], [110, 0], [150, 50], [110, 100], [0, 100]]), [150, 100]),
  F("arrow-notched", "Notched arrow", "arrow notched right", "path", ptsPath([[0, 30], [90, 30], [90, 0], [150, 50], [90, 100], [90, 70], [0, 70], [18, 50]]), [150, 100]),
  F("arrow-quad", "Four-way arrow", "arrow four way move cross all directions", "path", ptsPath([[50, 0], [72, 22], [58, 22], [58, 42], [78, 42], [78, 28], [100, 50], [78, 72], [78, 58], [58, 58], [58, 78], [72, 78], [50, 100], [28, 78], [42, 78], [42, 58], [22, 58], [22, 72], [0, 50], [22, 28], [22, 42], [42, 42], [42, 22], [28, 22]])),
  F("arrow-bent", "Bent arrow", "arrow bent turn corner", "path", "M0 100V50Q0 20 30 20H90V0L130 35L90 70V50H38Q30 50 30 58V100Z", [130, 100]),
  F("arrow-uturn", "U-turn arrow", "arrow u turn return back", "path", "M0 100V45A45 45 0 0 1 90 45V60H110L75 100L40 60H60V45A15 15 0 0 0 30 45V100Z", [110, 100]),
  F("arrow-curved", "Curved arrow", "arrow curved bend swoosh", "path", "M0 90C10 40 50 14 100 14V0L140 30L100 60V44C64 44 30 60 20 90Z", [140, 90]),
  F("arrow-circular", "Circular arrow", "arrow circle refresh repeat cycle loop", "path", "M50 8A42 42 0 1 1 13 30L28 38A25 25 0 1 0 50 25V40L20 16L50 -8Z", [100, 100]),
  F("arrow-striped", "Striped arrow", "arrow striped speed fast", "path", "M0 30H8V70H0ZM16 30H28V70H16ZM36 30H90V0L150 50L90 100V70H36Z", [150, 100]),
  F("arrow-thin", "Slim arrow", "arrow slim thin right", "path", ptsPath([[0, 42], [110, 42], [110, 20], [150, 50], [110, 80], [110, 58], [0, 58]]), [150, 100]),
];

// ---------- callouts (speech bubbles)
const CALLOUTS = [
  F("bubble-round", "Speech bubble", "speech bubble chat talk callout comment", "path", rrect(0, 0, 140, 90, 18) + "M24 86L52 88L16 116Z", [140, 116]),
  F("bubble-oval", "Oval speech bubble", "speech bubble oval talk callout", "path", "M70 0C109 0 140 20 140 46C140 72 109 92 70 92C62 92 55 91 48 90L18 112L28 82C10 74 0 61 0 46C0 20 31 0 70 0Z", [140, 112]),
  F("bubble-rect", "Rectangle callout", "callout rectangle note box talk", "path", "M0 0H140V88H60L34 114V88H0Z", [140, 114]),
  F("bubble-right", "Bubble, tail right", "speech bubble right reply chat", "path", rrect(0, 0, 140, 90, 18) + "M116 86L124 116L88 88Z", [140, 116]),
  F("bubble-thought", "Thought bubble", "thought bubble think cloud idea", "path", "M34 78C14 78 2 66 4 50C6 36 18 28 32 30C34 12 52 0 72 4C86 6 96 14 100 24C118 20 136 32 136 50C136 68 120 80 102 78C94 88 78 92 64 86C56 90 42 88 34 78Z" + ell(26, 96, 9) + ell(12, 112, 5), [140, 118]),
  F("bubble-shout", "Shout bubble", "shout bubble exclaim burst comic", "path", ptsPath([[0, 30], [26, 26], [20, 0], [48, 18], [70, 0], [84, 20], [116, 4], [112, 30], [140, 34], [120, 52], [138, 74], [108, 72], [112, 98], [84, 82], [64, 108], [52, 82], [22, 96], [30, 70], [2, 64], [20, 48]]), [140, 108]),
  F("bubble-circle", "Round bubble", "speech bubble circle round chat", "path", "M60 0A60 60 0 1 1 30 112L4 120L14 94A60 60 0 0 1 60 0Z", [120, 122]),
  F("bubble-wide", "Wide bubble", "speech bubble wide banner chat", "path", rrect(0, 0, 200, 64, 32) + "M40 60L66 62L30 86Z", [200, 86]),
  F("bubble-chat-two", "Chat bubbles", "chat bubbles conversation two messages", "path", rrect(0, 0, 100, 60, 14) + "M18 58L38 60L12 78Z" + rrect(48, 46, 92, 54, 14) + "M120 98L128 116L104 100Z", [140, 116]),
  F("bubble-square-up", "Callout, tail up", "callout tail up note box", "path", "M0 26H34L50 0L60 26H140V116H0Z", [140, 116]),
];

// ---------- flowchart (outline style: white fill, dark border, so text fits inside)
const FLOW = [
  O("fc-process", "Process", "flowchart process step box rectangle", rrect(1.5, 1.5, 117, 77), [120, 80], { kind: "rect" }),
  O("fc-alt", "Alternate process", "flowchart alternate process rounded", rrect(1.5, 1.5, 117, 77, 16), [120, 80], { kind: "rect", radius: 0.2 }),
  O("fc-decision", "Decision", "flowchart decision diamond question yes no", ptsPath([[60, 2], [118, 40], [60, 78], [2, 40]])),
  O("fc-terminator", "Start / end", "flowchart terminator start end pill", rrect(1.5, 12, 117, 56, 28)),
  O("fc-data", "Data", "flowchart data input output parallelogram", ptsPath([[24, 2], [118, 2], [96, 78], [2, 78]])),
  O("fc-document", "Document", "flowchart document page", "M2 2H118V68C98 58 82 58 60 70C38 82 22 80 2 70Z"),
  O("fc-multidoc", "Multiple documents", "flowchart multiple documents pages", "M14 14V2H118V58H106M8 14V8H112V64H106M2 14H106V70C88 62 74 62 54 72C36 80 20 78 2 70Z"),
  O("fc-predefined", "Predefined process", "flowchart predefined process subroutine", "M2 2H118V78H2ZM16 2V78M104 2V78"),
  O("fc-manual-input", "Manual input", "flowchart manual input keyboard", ptsPath([[2, 24], [118, 2], [118, 78], [2, 78]])),
  O("fc-preparation", "Preparation", "flowchart preparation hexagon", ptsPath([[24, 2], [96, 2], [118, 40], [96, 78], [24, 78], [2, 40]])),
  O("fc-delay", "Delay", "flowchart delay wait d shape", "M2 2H80A38 38 0 0 1 80 78H2Z"),
  O("fc-database", "Database", "flowchart database cylinder storage", "M2 14C2 4 118 4 118 14V66C118 76 2 76 2 66ZM2 14C2 24 118 24 118 14", [120, 80]),
  O("fc-connector", "Connector", "flowchart connector circle", ell(40, 40, 38), [80, 80], { kind: "ellipse" }),
  O("fc-offpage", "Off-page connector", "flowchart off page connector pentagon", ptsPath([[2, 2], [78, 2], [78, 56], [40, 78], [2, 56]]), [80, 80]),
  O("fc-merge", "Merge", "flowchart merge triangle down", ptsPath([[2, 2], [118, 2], [60, 78]])),
  O("fc-manual-op", "Manual operation", "flowchart manual operation trapezoid", ptsPath([[2, 2], [118, 2], [96, 78], [24, 78]])),
  O("fc-display", "Display", "flowchart display screen", "M2 40L24 2H90C110 2 118 22 118 40C118 58 110 78 90 78H24Z"),
  O("fc-stored", "Stored data", "flowchart stored data", "M20 2H118C106 12 102 26 102 40C102 54 106 68 118 78H20C10 68 2 56 2 40C2 24 10 12 20 2Z"),
];

export const SHAPE_SECTIONS = [
  { id: "lines", label: "Lines", layout: "lines", items: LINES },
  { id: "basic", label: "Basic shapes", items: BASIC },
  { id: "polygons", label: "Polygons", items: POLYGONS },
  { id: "stars", label: "Stars", items: STARS },
  { id: "arrows", label: "Arrows", items: ARROWS },
  { id: "callouts", label: "Callouts", items: CALLOUTS },
  { id: "flowchart", label: "Flowchart", items: FLOW },
];
