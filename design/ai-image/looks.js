// Style "looks" for template artwork (pure ES module, no DOM): SVG filters that turn a real library photo into an example of
// a picture style (watercolour, pencil sketch, pop art, neon, retro film, clay, anime, flat poster, duotone, pixel art…).
// Used by the AI image / art templates and the AI video / music idea cards. They only restyle our own library photos; they
// never stand for a picture made by AsaanDesk AI.
//   const k = kit(id); const fx = look(k, "watercolour");  k.photo(p, x, y, w, h, { ex: fx })
// Filter sizes are in user units, so a design drawn in the same viewBox looks the same as a thumbnail and full size.

const f3 = (v) => String(Math.round(v * 1000) / 1000);
const rgb = (hex) => { const v = parseInt(String(hex).slice(1), 16); return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
const steps = (n) => Array.from({ length: n }, (_, i) => f3(i / (n - 1))).join(" ");
const GRAY = `type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0"`;
const post = (inn, res, n) => `<feComponentTransfer in="${inn}" result="${res}"><feFuncR type="discrete" tableValues="${steps(n)}"/><feFuncG type="discrete" tableValues="${steps(n)}"/><feFuncB type="discrete" tableValues="${steps(n)}"/></feComponentTransfer>`;
const lin = (inn, res, s, i, ib = i) => `<feComponentTransfer in="${inn}" result="${res}"><feFuncR type="linear" slope="${s}" intercept="${i}"/><feFuncG type="linear" slope="${s}" intercept="${i}"/><feFuncB type="linear" slope="${s}" intercept="${ib}"/></feComponentTransfer>`;
/** Gradient map: luminance -> the given colours (type "table" = smooth, "discrete" = flat bands). */
const gmap = (inn, res, cols, type = "table") => { const c = cols.map(rgb); return `<feColorMatrix in="${inn}" ${GRAY} result="${res}l"/><feComponentTransfer in="${res}l" result="${res}">${["R", "G", "B"].map((ch, j) => `<feFunc${ch} type="${type}" tableValues="${c.map((x) => f3(x[j])).join(" ")}"/>`).join("")}</feComponentTransfer>`; };
/** Pencil-sketch lines (white paper, dark strokes) by the colour-dodge method; ex = darker lines when higher. */
const sketch = (inn, res, sd = 2, ex = 2.4) => `<feColorMatrix in="${inn}" ${GRAY} result="${res}g"/><feComponentTransfer in="${res}g" result="${res}i"><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur in="${res}i" stdDeviation="${sd}" result="${res}b"/><feBlend in="${res}b" in2="${res}g" mode="color-dodge" result="${res}d"/><feComponentTransfer in="${res}d" result="${res}"><feFuncR type="gamma" exponent="${ex}"/><feFuncG type="gamma" exponent="${ex}"/><feFuncB type="gamma" exponent="${ex}"/></feComponentTransfer>`;
const paper = (res, seed = 2, tone = [0.98, 0.96, 0.91]) => `<feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="${seed}" result="${res}n"/><feColorMatrix in="${res}n" type="matrix" values="0 0 0 0 ${tone[0]}  0 0 0 0 ${tone[1]}  0 0 0 0 ${tone[2]}  -.9 -.9 0 0 1.05" result="${res}"/>`;

/** Filter bodies per look. o = { colors: [hex…] for duotone / flat / pop, seed }. */
const LOOKS = {
  photo: () => `<feColorMatrix type="saturate" values="1.12"/><feComponentTransfer><feFuncR type="table" tableValues="0 .32 .7 1"/><feFuncG type="table" tableValues="0 .32 .7 1"/><feFuncB type="table" tableValues="0 .32 .7 1"/></feComponentTransfer>`,
  vibrant: () => `<feColorMatrix type="saturate" values="1.5"/><feComponentTransfer><feFuncR type="table" tableValues="0 .28 .74 1"/><feFuncG type="table" tableValues="0 .28 .74 1"/><feFuncB type="table" tableValues="0 .28 .74 1"/></feComponentTransfer>`,
  cinematic: () => `<feColorMatrix type="matrix" values="1.15 .05 -.05 0 .02  0 1.02 0 0 0  -.1 .05 .95 0 .06  0 0 0 1 0" result="c"/><feComponentTransfer in="c"><feFuncR type="table" tableValues=".05 .35 .7 1"/><feFuncG type="table" tableValues=".1 .35 .62 .92"/><feFuncB type="table" tableValues=".2 .38 .55 .8"/></feComponentTransfer>`,
  night: () => `<feColorMatrix type="matrix" values=".35 0 0 0 0  0 .4 .05 0 .02  .05 .1 .7 0 .08  0 0 0 1 0"/>`,
  bokeh: () => `<feGaussianBlur stdDeviation="3.2" result="b"/><feColorMatrix in="b" type="saturate" values="1.4"/>`,
  watercolour: (o) => `<feGaussianBlur stdDeviation="1.8" result="b0"/><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="${o.seed ?? 4}" result="n"/><feDisplacementMap in="b0" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G" result="d"/><feColorMatrix in="d" type="saturate" values="1.35" result="ds"/>${post("ds", "p", 8)}${lin("p", "w", 0.64, 0.36, 0.34)}${sketch("SourceGraphic", "sk", 1.5, 1.6)}<feBlend in="sk" in2="w" mode="multiply" result="m"/>${paper("pp", o.seed ?? 2)}<feBlend in="pp" in2="m" mode="multiply"/>`,
  pencil: (o) => `${sketch("SourceGraphic", "sk", 2.2, 2.2)}${paper("pp", o.seed ?? 3, [0.99, 0.98, 0.96])}<feBlend in="pp" in2="sk" mode="multiply"/>`,
  colourpencil: (o) => `${sketch("SourceGraphic", "sk", 1.8, 1.6)}<feColorMatrix in="SourceGraphic" type="saturate" values="1.3" result="s"/>${lin("s", "sl", 0.45, 0.55)}<feBlend in="sk" in2="sl" mode="multiply" result="m"/>${paper("pp", o.seed ?? 3)}<feBlend in="pp" in2="m" mode="multiply"/>`,
  ink: () => `${sketch("SourceGraphic", "sk", 2.4, 3.2)}<feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feColorMatrix in="b" ${GRAY} result="bg"/><feComponentTransfer in="bg" result="wash"><feFuncR type="discrete" tableValues=".42 .72 .98 .98"/><feFuncG type="discrete" tableValues=".48 .76 .97 .97"/><feFuncB type="discrete" tableValues=".58 .82 .95 .95"/></feComponentTransfer><feBlend in="sk" in2="wash" mode="multiply"/>`,
  popart: (o) => { const c = (o.colors || ["#1e1b6e", "#ff2d87", "#ffd400", "#fff4cc"]).map(rgb); return `<feGaussianBlur stdDeviation=".8" result="b"/><feColorMatrix in="b" ${GRAY} result="g"/><feComponentTransfer in="g">${["R", "G", "B"].map((ch, j) => `<feFunc${ch} type="discrete" tableValues="${c.map((x) => f3(x[j])).join(" ")}"/>`).join("")}</feComponentTransfer>`; },
  neon: (o) => { const [r, g, b] = rgb((o.colors || ["#ff3df2"])[0]); return `<feGaussianBlur stdDeviation=".6" result="s"/>${sketch("s", "sk", 1.6, 3)}<feComponentTransfer in="sk" result="inv"><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer><feColorMatrix in="inv" type="matrix" values="${f3(r * 1.8)} 0 0 0 0  ${f3(g * 1.8)} 0 0 0 0  ${f3(b * 1.8)} 0 0 0 0  0 0 0 0 1" result="c1"/><feGaussianBlur in="c1" stdDeviation="2.4" result="glow"/><feColorMatrix in="SourceGraphic" type="matrix" values=".22 0 0 0 0  0 .14 0 0 .01  0 0 .38 0 .06  0 0 0 1 0" result="dk"/><feBlend in="glow" in2="dk" mode="screen" result="a"/><feBlend in="c1" in2="a" mode="screen"/>`; },
  retro: (o) => `<feColorMatrix type="matrix" values=".55 .45 .12 0 .07  .32 .52 .12 0 .05  .2 .3 .32 0 .03  0 0 0 1 0" result="s"/><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="${o.seed ?? 7}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .4  .5 0 0 0 -.15" result="gr"/><feBlend in="gr" in2="s" mode="overlay"/>`,
  fadedfilm: () => `<feColorMatrix type="saturate" values=".75" result="s"/><feComponentTransfer in="s"><feFuncR type="table" tableValues=".14 .45 .78 .97"/><feFuncG type="table" tableValues=".12 .42 .74 .93"/><feFuncB type="table" tableValues=".16 .38 .64 .84"/></feComponentTransfer>`,
  mono: () => `<feColorMatrix ${GRAY}/><feComponentTransfer><feFuncR type="table" tableValues="0 .15 .6 1"/><feFuncG type="table" tableValues="0 .15 .6 1"/><feFuncB type="table" tableValues="0 .15 .6 1"/></feComponentTransfer>`,
  clay: () => `<feGaussianBlur stdDeviation="2" result="b"/><feColorMatrix in="b" type="saturate" values="1.45" result="bs"/>${post("bs", "p", 12)}<feGaussianBlur in="p" stdDeviation="1.1" result="pb"/><feColorMatrix in="pb" type="luminanceToAlpha" result="l"/><feGaussianBlur in="l" stdDeviation="1.5" result="lb"/><feSpecularLighting in="lb" surfaceScale="3" specularConstant=".9" specularExponent="22" lighting-color="#fff" result="sp"><feDistantLight azimuth="225" elevation="40"/></feSpecularLighting><feComposite in="sp" in2="SourceGraphic" operator="in" result="spc"/><feBlend in="spc" in2="pb" mode="screen"/>`,
  soft3d: () => `<feGaussianBlur stdDeviation="1.4" result="b"/><feColorMatrix in="b" type="saturate" values="1.4" result="bs"/><feColorMatrix in="bs" type="luminanceToAlpha" result="l"/><feGaussianBlur in="l" stdDeviation="2" result="lb"/><feDiffuseLighting in="lb" surfaceScale="2.5" diffuseConstant="1.15" lighting-color="#fff" result="lit"><feDistantLight azimuth="225" elevation="60"/></feDiffuseLighting><feBlend in="lit" in2="bs" mode="multiply" result="m"/>${lin("m", "o", 1.12, 0.04, 0.06)}`,
  anime: () => `<feGaussianBlur stdDeviation="1.1" result="b"/><feColorMatrix in="b" type="saturate" values="1.4" result="bs"/>${post("bs", "p", 9)}<feGaussianBlur in="p" stdDeviation=".45" result="pb"/>${lin("pb", "pl", 1.05, 0.04)}${sketch("SourceGraphic", "sk", 1.3, 1.7)}<feBlend in="sk" in2="pl" mode="multiply"/>`,
  flat: (o) => `<feGaussianBlur stdDeviation=".9" result="b"/>${gmap("b", "f", o.colors || ["#1d2b53", "#e4572e", "#f3a712", "#fdf0d5"])}${post("f", "fp", 9)}<feGaussianBlur in="fp" stdDeviation=".35"/>`,
  duotone: (o) => gmap("SourceGraphic", "d", o.colors || ["#1b1340", "#ffb703"]),
  // 8-bit look: soft blur + few colour levels (draw pixelGrid() over it for the block pattern)
  pixel: () => `<feGaussianBlur stdDeviation="1.6" result="b"/><feColorMatrix in="b" type="saturate" values="1.5" result="bs"/>${post("bs", "pp", 5)}`,
  truck: () => `<feColorMatrix type="saturate" values="1.8"/><feComponentTransfer><feFuncR type="table" tableValues="0 .3 .78 1"/><feFuncG type="table" tableValues="0 .3 .78 1"/><feFuncB type="table" tableValues="0 .3 .78 1"/></feComponentTransfer>`,
  sunny: () => `<feColorMatrix type="matrix" values="1.1 .08 0 0 .04  0 1.02 0 0 .02  0 0 .86 0 0  0 0 0 1 0"/>`,
  cool: () => `<feColorMatrix type="matrix" values=".86 0 0 0 0  0 .98 .04 0 .01  0 .06 1.12 0 .05  0 0 0 1 0"/>`,
  blurwash: () => `<feGaussianBlur stdDeviation="5"/><feColorMatrix type="saturate" values="1.3"/>`,
};
export const LOOK_NAMES = Object.keys(LOOKS);

/** Adds the look's filter to the kit's defs; returns the filter attribute for an <image> (empty for an unknown look). */
export function look(k, name, o = {}) {
  const body = LOOKS[name]?.(o);
  if (!body) return "";
  const id = k.id("fx");
  k.defs.push(`<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">${body}</filter>`);
  return ` filter="url(#${id})"`;
}
/** Pixel-block grid (for the pixel look) as a fill. */
export const pixelGrid = (k, cell = 5, color = "#000", op = 0.22) => k.pattern(cell, cell, `<path d="M${cell} 0V${cell}H0" fill="none" stroke="${color}" stroke-width=".7" opacity="${op}"/>`);
/** Halftone dot pattern (pop art / comic print) as a fill. */
export const halftone = (k, color = "#1b1340", gap = 6, r = 1.7, op = 0.38) => k.pattern(gap, gap, `<circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}" opacity="${op}"/>`);
/** Film grain / paper fleck overlay: a rect filled with noise (use with opacity). */
export function grain(k, x, y, w, h, op = 0.16, seed = 3) {
  const id = k.id("gn");
  k.defs.push(`<filter id="${id}" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1"/></filter>`);
  return `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(w)}" height="${f3(h)}" fill="#000" opacity="${op}" filter="url(#${id})"/>`;
}
