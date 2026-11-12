// Photo template gallery (pure module: no DOM, no imports). Used by the photo editor's Templates panel and the intro pages
// of the four photo tools (photo-editor, background-remover, image-enhancer, ai-photo-editor).
// Templates come from a generator: our own base layouts × colour palettes × content themes (sample photo + matching text).
// The id encodes the combination (tool~layout~theme[~palette], e.g. "pe~instant-photo~beach~p02"); templateById(id) and
// thumb(id) build from it, and the editor really applies it to the open photo (or to the theme's sample photo when no photo
// is open yet): a look (adjustments + filter), a layout (crop shape, frame, text), a new background, enhancer settings, or
// an AI edit idea. The sample photos are our own SVG drawings (no stock photos), turned into pixels by the editor.

/* ---------- sample photos (own artwork). Each scene has a background and a subject so the background templates can swap it. */
const S = {
  lake: {
    w: 960, h: 640, name: "Lake at sunset",
    bg: (p) => `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3f8f"/><stop offset=".45" stop-color="#e0617a"/><stop offset=".72" stop-color="#ffb86b"/></linearGradient>
<linearGradient id="${p}wat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f29a6b"/><stop offset="1" stop-color="#2c3770"/></linearGradient></defs>
<rect width="960" height="640" fill="url(#${p}sky)"/><circle cx="600" cy="360" r="70" fill="#ffe2a1"/>
<path d="M0 400 L140 250 L250 340 L380 200 L520 330 L640 260 L790 360 L960 240 L960 420 L0 420Z" fill="#4a3566"/>
<path d="M0 420 L180 330 L330 400 L470 320 L640 410 L820 330 L960 400 L960 430 L0 430Z" fill="#2f2550"/>
<rect y="420" width="960" height="220" fill="url(#${p}wat)"/>
${Array.from({ length: 14 }, (_, i) => `<rect x="${520 + ((i * 37) % 160)}" y="${440 + i * 13}" width="${150 - i * 8}" height="3" rx="1.5" fill="#ffe2a1" opacity="${0.75 - i * 0.04}"/>`).join("")}
<g fill="#1d1838"><path d="M60 520 l40-70 40 70z"/><path d="M110 540 l30-55 30 55z"/><rect x="96" y="520" width="8" height="30"/></g>`,
    subject: () => `<g><path d="M300 520 h170 l-24 30 h-122z" fill="#1d1838"/><rect x="380" y="430" width="5" height="92" fill="#1d1838"/><path d="M385 432 l58 74 h-58z" fill="#fff4e0"/></g>`,
  },
  city: {
    w: 960, h: 640, name: "City at dusk",
    bg: (p) => `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2a5a"/><stop offset=".6" stop-color="#6c5bd4"/><stop offset="1" stop-color="#f3a6c8"/></linearGradient></defs>
<rect width="960" height="640" fill="url(#${p}sky)"/>${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 149) % 960}" cy="${(i * 71) % 220 + 20}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity=".8"/>`).join("")}
<circle cx="770" cy="120" r="38" fill="#fdf2c4"/>`,
    subject: () => {
      const b = [[20, 330, 110], [140, 250, 90], [240, 300, 120], [370, 180, 100], [480, 280, 90], [580, 220, 130], [720, 300, 100], [830, 240, 110]];
      return b.map(([x, y, w], i) => `<rect x="${x}" y="${y}" width="${w}" height="${640 - y}" fill="${i % 2 ? "#232846" : "#2d3358"}"/>` +
        Array.from({ length: Math.floor((600 - y) / 34) * 3 }, (_, k) => `<rect x="${x + 14 + (k % 3) * (w - 28) / 3}" y="${y + 18 + Math.floor(k / 3) * 34}" width="${(w - 40) / 3}" height="16" rx="2" fill="${(k * 7 + i) % 5 ? "#ffd27a" : "#3a4170"}"/>`).join("")).join("") +
        `<rect y="600" width="960" height="40" fill="#151a33"/><rect x="0" y="612" width="960" height="4" fill="#ffd27a" opacity=".5"/>`;
    },
  },
  flowers: {
    w: 960, h: 640, name: "Flowers by the window",
    bg: (p) => `<defs><linearGradient id="${p}wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde7d9"/><stop offset="1" stop-color="#f6c6b8"/></linearGradient></defs>
<rect width="960" height="640" fill="url(#${p}wall)"/><rect x="560" y="60" width="320" height="400" rx="12" fill="#bfe3f5" stroke="#fff" stroke-width="16"/>
<path d="M720 60v400M560 260h320" stroke="#fff" stroke-width="12"/><circle cx="650" cy="150" r="40" fill="#fff7c2" opacity=".9"/>
<rect y="500" width="960" height="140" fill="#c98b5e"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 80}" y="500" width="2" height="140" fill="#a8704a"/>`).join("")}`,
    subject: () => `<g><path d="M300 380 h180 l-24 150 h-132z" fill="#3c7dd9"/><rect x="290" y="372" width="200" height="22" rx="8" fill="#2f66b8"/>
<g stroke="#3f8a4a" stroke-width="7" fill="none"><path d="M390 372 C380 300 330 260 300 200"/><path d="M390 372 C400 290 440 250 470 180"/><path d="M390 372 V160"/></g>
<g fill="#4fa35a"><ellipse cx="350" cy="300" rx="30" ry="12" transform="rotate(-30 350 300)"/><ellipse cx="430" cy="290" rx="30" ry="12" transform="rotate(30 430 290)"/></g>
${[[300, 200, "#ff6b8b"], [470, 180, "#ffb703"], [390, 160, "#f15bb5"]].map(([x, y, c]) => Array.from({ length: 6 }, (_, k) => `<ellipse cx="${x + 26 * Math.cos(k * 1.047)}" cy="${y + 26 * Math.sin(k * 1.047)}" rx="22" ry="14" transform="rotate(${k * 60} ${x + 26 * Math.cos(k * 1.047)} ${y + 26 * Math.sin(k * 1.047)})" fill="${c}"/>`).join("") + `<circle cx="${x}" cy="${y}" r="15" fill="#ffe066"/>`).join("")}</g>`,
  },
  portrait: {
    w: 720, h: 900, name: "Portrait in a room",
    bg: (p) => `<rect width="720" height="900" fill="#d9e4dd"/><rect x="40" y="80" width="300" height="520" fill="#8a5a3c"/>
${[0, 1, 2, 3].map((r) => `<rect x="52" y="${92 + r * 128}" width="276" height="10" fill="#6b4329"/>` + Array.from({ length: 9 }, (_, k) => `<rect x="${60 + k * 30}" y="${112 + r * 128 - (k % 3) * 8}" width="${22 + (k % 2) * 4}" height="${98 + (k % 3) * 8 - 10}" fill="${["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261"][(k + r) % 5]}"/>`).join("")).join("")}
<rect x="470" y="120" width="190" height="240" rx="6" fill="#fff" stroke="#c7b8a1" stroke-width="10"/><path d="M490 330 l50-80 40 50 30-30 30 60z" fill="#7fb7a4"/>
<rect y="700" width="720" height="200" fill="#b98b6a"/>`,
    subject: () => `<g><path d="M150 900 C160 720 240 640 360 640 C480 640 560 720 570 900Z" fill="#2f6fd6"/><path d="M320 640 h80 l-10 60 h-60z" fill="#e8b28c"/>
<ellipse cx="360" cy="480" rx="112" ry="138" fill="#f0c19c"/><path d="M246 470 C240 330 320 310 360 312 C430 312 486 350 476 470 C470 410 430 380 360 382 C300 382 258 410 246 470Z" fill="#3a2418"/>
<circle cx="318" cy="480" r="9" fill="#2b1d14"/><circle cx="402" cy="480" r="9" fill="#2b1d14"/><path d="M325 552 q35 26 70 0" stroke="#b5574b" stroke-width="7" fill="none" stroke-linecap="round"/>
<ellipse cx="300" cy="520" rx="16" ry="9" fill="#f2a08a" opacity=".6"/><ellipse cx="420" cy="520" rx="16" ry="9" fill="#f2a08a" opacity=".6"/></g>`,
  },
  product: {
    w: 800, h: 800, name: "Mug on a table",
    bg: (p) => `<rect width="800" height="800" fill="#f1e3c8"/>${Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => `<circle cx="${c * 80 + (r % 2) * 40 + 20}" cy="${r * 60 + 24}" r="9" fill="#e2c99c"/>`).join("")).join("")}
<rect y="560" width="800" height="240" fill="#6d4c3d"/><rect y="560" width="800" height="14" fill="#5a3d30"/>${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${600 + i * 34} C200 ${590 + i * 34} 600 ${614 + i * 34} 800 ${600 + i * 34}" stroke="#5e4134" stroke-width="3" fill="none"/>`).join("")}`,
    subject: () => `<g><ellipse cx="380" cy="640" rx="150" ry="22" fill="#3d2a22" opacity=".5"/><path d="M250 330 h260 v270 a40 40 0 0 1 -40 40 h-180 a40 40 0 0 1 -40 -40z" fill="#14b8a6"/>
<path d="M510 380 c90 0 90 160 0 160" stroke="#0e9384" stroke-width="30" fill="none"/><ellipse cx="380" cy="330" rx="130" ry="22" fill="#0e9384"/><ellipse cx="380" cy="332" rx="112" ry="15" fill="#5b3a26"/>
<path d="M330 290 c-20-30 20-40 0-80M390 290 c-20-30 20-40 0-80M450 290 c-20-30 20-40 0-80" stroke="#fff" stroke-width="7" fill="none" opacity=".7" stroke-linecap="round"/>
<path d="M330 450 l30-30 30 30 30-30 30 30" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/></g>`,
  },
  beach: {
    w: 960, h: 640, name: "Beach day",
    bg: (p) => `<defs><linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ec6ff"/><stop offset="1" stop-color="#d7f1ff"/></linearGradient></defs>
<rect width="960" height="640" fill="url(#${p}sky)"/><circle cx="180" cy="120" r="56" fill="#fff3a6"/><path d="M520 120 q30-20 60 0 q30-20 60 0 q-10 26-60 22 q-50 4-60-22z" fill="#fff" opacity=".9"/>
<rect y="330" width="960" height="140" fill="#1f9bd1"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 110} ${360 + (i % 3) * 30} q25-12 50 0 q25 12 50 0" stroke="#bfe9ff" stroke-width="4" fill="none"/>`).join("")}
<path d="M0 450 C250 420 600 470 960 430 V640 H0Z" fill="#f4d9a4"/>${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 960}" cy="${480 + ((i * 53) % 150)}" r="2.4" fill="#d9b77b"/>`).join("")}`,
    subject: () => `<g><path d="M740 600 C730 480 720 380 690 300" stroke="#8b5a2b" stroke-width="22" fill="none" stroke-linecap="round"/>
${[[-150, "#2e9e4f"], [-100, "#38b25b"], [-40, "#2e9e4f"], [20, "#38b25b"], [70, "#2e9e4f"]].map(([a, c]) => `<path d="M690 300 q${Math.round(120 * Math.cos(a * Math.PI / 180))} ${Math.round(120 * Math.sin(a * Math.PI / 180)) - 40} ${Math.round(200 * Math.cos(a * Math.PI / 180))} ${Math.round(200 * Math.sin(a * Math.PI / 180))}" stroke="${c}" stroke-width="26" fill="none" stroke-linecap="round"/>`).join("")}
<path d="M300 560 l60-110 60 110z" fill="#ff7a59"/><rect x="356" y="450" width="8" height="140" fill="#7a4b2a"/><ellipse cx="420" cy="590" rx="90" ry="14" fill="#c99c5a" opacity=".6"/></g>`,
  },
  food: {
    w: 800, h: 800, name: "Fruit plate",
    bg: (p) => `<rect width="800" height="800" fill="#b07a4f"/>${Array.from({ length: 9 }, (_, i) => `<rect y="${i * 92}" width="800" height="4" fill="#8f5f3b"/>`).join("")}${Array.from({ length: 30 }, (_, i) => `<path d="M${(i * 131) % 800} ${(i * 67) % 800} q40 6 80 0" stroke="#9c6a43" stroke-width="3" fill="none"/>`).join("")}
<rect x="40" y="560" width="220" height="200" rx="18" fill="#e9eef7" transform="rotate(-10 150 660)"/>`,
    subject: () => `<g><circle cx="410" cy="390" r="260" fill="#fdfdfb"/><circle cx="410" cy="390" r="215" fill="#f1f1ec"/>
<circle cx="340" cy="330" r="62" fill="#ff8a00"/><circle cx="340" cy="330" r="48" fill="#ffad42"/>${Array.from({ length: 8 }, (_, k) => `<path d="M340 330 L${340 + 46 * Math.cos(k * 0.785)} ${330 + 46 * Math.sin(k * 0.785)}" stroke="#ff8a00" stroke-width="3"/>`).join("")}
<ellipse cx="490" cy="330" rx="70" ry="40" fill="#7ac74f" transform="rotate(-25 490 330)"/><ellipse cx="490" cy="330" rx="52" ry="26" fill="#c4f08a" transform="rotate(-25 490 330)"/>
${[[380, 470], [420, 500], [455, 470], [400, 440], [440, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#7b2cbf"/><circle cx="${x - 6}" cy="${y - 6}" r="5" fill="#b77fe0"/>`).join("")}
<path d="M290 450 c30 20 60 20 80 0 c-20 60-70 70-80 0z" fill="#e63946"/></g>`,
  },
  cat: {
    w: 800, h: 800, name: "Cat on a cushion",
    bg: (p) => `<rect width="800" height="800" fill="#cfe1f3"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 100}" width="50" height="800" fill="#c2d6ec"/>`).join("")}<rect y="600" width="800" height="200" fill="#4b5d7a"/>`,
    subject: () => `<g><ellipse cx="400" cy="640" rx="280" ry="70" fill="#e76f51"/><ellipse cx="400" cy="620" rx="260" ry="55" fill="#f4a261"/>
<ellipse cx="400" cy="520" rx="170" ry="110" fill="#f5b041"/><path d="M560 540 c80 0 90-90 40-120" stroke="#f5b041" stroke-width="30" fill="none" stroke-linecap="round"/>
<circle cx="330" cy="380" r="100" fill="#f5b041"/><path d="M250 320 l-10-100 70 60z M410 320 l10-100 -70 60z" fill="#f5b041"/><path d="M262 300 l-6-60 40 36z M398 300 l6-60 -40 36z" fill="#f8c9a0"/>
<ellipse cx="295" cy="380" rx="14" ry="20" fill="#2d6a4f"/><ellipse cx="365" cy="380" rx="14" ry="20" fill="#2d6a4f"/><path d="M320 420 l10 8 10-8z" fill="#c0392b"/>
<path d="M330 428 q-12 16-26 6 M330 428 q12 16 26 6" stroke="#7a4b2a" stroke-width="3" fill="none"/>${[0, 1, 2].map((i) => `<path d="M${380} ${470 + i * 30} q40 -6 80 0" stroke="#d68910" stroke-width="10" fill="none" stroke-linecap="round"/>`).join("")}</g>`,
  },
};
/* ---------- backdrops for the background templates (palette coloured; drawn at the photo's size by the editor) ---------- */
// spec = { kind, c1 (light), c2 (accent), c3 (dark) }
const BACKDROP = {
  studio: (p, s) => `<defs><radialGradient id="${p}b" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9ced8"/></radialGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/>`,
  night: (p, s) => `<defs><radialGradient id="${p}b" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#3a3f9f"/><stop offset="1" stop-color="#0d0f2e"/></radialGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/>${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 233) % 800}" cy="${(i * 151) % 800}" r="${1 + (i % 4) * 0.7}" fill="#fff" opacity="${0.5 + (i % 5) / 10}"/>`).join("")}<circle cx="620" cy="160" r="60" fill="#fef3c7"/><circle cx="645" cy="145" r="55" fill="#1d2160"/>`,
  leaves: (p, s) => `<rect width="800" height="800" fill="#d8f3dc"/>${Array.from({ length: 28 }, (_, i) => `<ellipse cx="${(i * 173) % 800}" cy="${(i * 97) % 800}" rx="70" ry="26" transform="rotate(${(i * 47) % 180} ${(i * 173) % 800} ${(i * 97) % 800})" fill="${["#52b788", "#40916c", "#74c69d"][i % 3]}"/>`).join("")}`,
  gradient: (p, s) => `<defs><linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.c1}"/><stop offset="1" stop-color="${s.c2}"/></linearGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/>`,
  dots: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 11 }, (_, r) => Array.from({ length: 11 }, (_, c) => `<circle cx="${c * 76 + (r % 2) * 38 + 10}" cy="${r * 76 + 20}" r="13" fill="${s.c2}" opacity=".55"/>`).join("")).join("")}`,
  stripes: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 110 - 800} 800 L${i * 110} 0 h50 L${i * 110 - 750} 800z" fill="${s.c2}" opacity=".35"/>`).join("")}`,
  spotlight: (p, s) => `<defs><radialGradient id="${p}b" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="${s.c1}"/><stop offset=".55" stop-color="${s.c2}"/><stop offset="1" stop-color="${s.c3}"/></radialGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/>`,
  confetti: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 70 }, (_, i) => { const x = (i * 211) % 800, y = (i * 137) % 800, c = [s.c2, s.c3, "#ffd166", "#ffffff"][i % 4]; return i % 3 ? `<rect x="${x}" y="${y}" width="22" height="9" rx="3" fill="${c}" transform="rotate(${(i * 53) % 180} ${x} ${y})"/>` : `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/>`; }).join("")}`,
  arch: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/><path d="M170 800 V360 a230 230 0 0 1 460 0 V800z" fill="${s.c2}"/><rect y="690" width="800" height="110" fill="${s.c3}" opacity=".25"/>`,
  waves: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${300 + i * 90} C200 ${250 + i * 90} 400 ${360 + i * 90} 800 ${290 + i * 90} V800 H0z" fill="${s.c2}" opacity="${0.12 + i * 0.06}"/>`).join("")}`,
  grid: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 17 }, (_, i) => `<path d="M${i * 50} 0V800M0 ${i * 50}H800" stroke="${s.c2}" stroke-width="2" opacity=".45"/>`).join("")}`,
  sunset: (p, s) => `<defs><linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.c2}"/><stop offset=".7" stop-color="${s.c1}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/><circle cx="400" cy="560" r="210" fill="#ffffff" opacity=".35"/>`,
  brick: (p, s) => `<rect width="800" height="800" fill="${s.c3}"/>${Array.from({ length: 16 }, (_, r) => Array.from({ length: 7 }, (_, c) => `<rect x="${c * 120 - (r % 2) * 60 + 4}" y="${r * 50 + 4}" width="112" height="42" rx="4" fill="${s.c2}" opacity="${0.55 + ((r * 7 + c * 3) % 5) * 0.08}"/>`).join("")).join("")}`,
  wood: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/><rect y="560" width="800" height="240" fill="#a0693f"/>${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${590 + i * 32} C250 ${580 + i * 32} 550 ${602 + i * 32} 800 ${588 + i * 32}" stroke="#7d4f2c" stroke-width="3" fill="none"/>`).join("")}<rect y="556" width="800" height="10" fill="#7d4f2c"/>`,
  marble: (p, s) => `<rect width="800" height="800" fill="#f4f3f1"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${-50 + i * 110} 0 C${40 + i * 110} 200 ${-60 + i * 110} 420 ${80 + i * 110} 800" stroke="${i % 2 ? "#c9c6c1" : s.c2}" stroke-width="${1.5 + (i % 3)}" fill="none" opacity=".45"/>`).join("")}`,
  bokeh: (p, s) => `<rect width="800" height="800" fill="${s.c3}"/>${Array.from({ length: 34 }, (_, i) => `<circle cx="${(i * 197) % 800}" cy="${(i * 113) % 800}" r="${24 + (i % 5) * 14}" fill="${[s.c2, "#ffd166", "#ffffff"][i % 3]}" opacity="${0.12 + (i % 4) * 0.07}"/>`).join("")}`,
  clouds: (p, s) => `<defs><linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#e3f3ff"/></linearGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/>${[[150, 160], [520, 110], [660, 330], [260, 420], [80, 620], [560, 650]].map(([x, y]) => `<g fill="#fff" opacity=".9"><ellipse cx="${x}" cy="${y}" rx="90" ry="34"/><ellipse cx="${x - 40}" cy="${y - 16}" rx="44" ry="34"/><ellipse cx="${x + 30}" cy="${y - 26}" rx="54" ry="40"/></g>`).join("")}`,
  podium: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/><circle cx="640" cy="170" r="120" fill="${s.c2}" opacity=".25"/><ellipse cx="400" cy="640" rx="300" ry="60" fill="${s.c2}"/><rect x="100" y="640" width="600" height="160" fill="${s.c2}"/><ellipse cx="400" cy="640" rx="300" ry="60" fill="#ffffff" opacity=".35"/>`,
  rays: (p, s) => `<rect width="800" height="800" fill="${s.c2}"/>${Array.from({ length: 18 }, (_, i) => { const a = (i * 20 * Math.PI) / 180, b = ((i * 20 + 10) * Math.PI) / 180; return `<path d="M400 400 L${400 + 900 * Math.cos(a)} ${400 + 900 * Math.sin(a)} L${400 + 900 * Math.cos(b)} ${400 + 900 * Math.sin(b)}z" fill="${s.c1}" opacity=".35"/>`; }).join("")}`,
  halftone: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 20 }, (_, r) => Array.from({ length: 20 }, (_, c) => `<circle cx="${c * 40 + 20}" cy="${r * 40 + 20}" r="${2 + (c + r) * 0.42}" fill="${s.c2}" opacity=".7"/>`).join("")).join("")}`,
  plaid: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 100 + 20}" width="34" height="800" fill="${s.c2}" opacity=".3"/><rect y="${i * 100 + 20}" width="800" height="34" fill="${s.c2}" opacity=".3"/><rect x="${i * 100 + 70}" width="6" height="800" fill="${s.c3}" opacity=".25"/>`).join("")}`,
  terrazzo: (p, s) => `<rect width="800" height="800" fill="#f6f1ea"/>${Array.from({ length: 70 }, (_, i) => `<path d="M${(i * 173) % 800} ${(i * 97) % 800} l${12 + (i % 4) * 6} ${4 + (i % 3) * 5} l${-6} ${10 + (i % 5) * 3}z" fill="${[s.c2, s.c3, "#f4a261", "#2a9d8f"][i % 4]}" opacity=".75"/>`).join("")}`,
  blobs: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/><path d="M120 160c120-90 300-40 340 60s-60 200-200 190S0 250 120 160z" fill="${s.c2}" opacity=".55"/><path d="M520 480c110-60 250 0 250 120s-150 170-260 120-100-180 10-240z" fill="${s.c3}" opacity=".35"/><circle cx="650" cy="180" r="70" fill="${s.c2}" opacity=".3"/>`,
  checkfloor: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/><g transform="translate(400 560) scale(1 .45) rotate(45)">${Array.from({ length: 12 }, (_, r) => Array.from({ length: 12 }, (_, c) => (r + c) % 2 ? `<rect x="${c * 90 - 540}" y="${r * 90 - 540}" width="90" height="90" fill="${s.c2}" opacity=".7"/>` : "").join("")).join("")}</g><rect width="800" height="470" fill="${s.c1}"/>`,
  split: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/><path d="M0 0H800V800z" fill="${s.c2}"/>`,
  rainbow: (p, s) => `<rect width="800" height="800" fill="#fffaf0"/>${["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"].map((c, i) => `<path d="M${40 + i * 40} 800 A${360 - i * 40} ${360 - i * 40} 0 0 1 ${760 - i * 40} 800" stroke="${c}" stroke-width="40" fill="none" opacity=".75"/>`).join("")}`,
  stars: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 40 }, (_, i) => { const x = (i * 211) % 800, y = (i * 139) % 800, r = 12 + (i % 3) * 6; return `<path d="M${x} ${y - r}l${r * 0.29} ${r * 0.6} ${r * 0.66} ${r * 0.1}-${r * 0.48} ${r * 0.46} ${r * 0.12} ${r * 0.66}-${r * 0.59}-${r * 0.31}-${r * 0.59} ${r * 0.31} ${r * 0.12}-${r * 0.66}-${r * 0.48}-${r * 0.46} ${r * 0.66}-${r * 0.1}z" fill="${s.c2}" opacity=".6"/>`; }).join("")}`,
  hearts: (p, s) => `<rect width="800" height="800" fill="${s.c1}"/>${Array.from({ length: 36 }, (_, i) => { const x = (i * 223) % 800, y = (i * 131) % 800; return `<path d="M${x} ${y + 14}c-24-18-30-34-18-44 9-7 18-2 18 6 0-8 9-13 18-6 12 10 6 26-18 44z" fill="${s.c2}" opacity=".55"/>`; }).join("")}`,
  grass: (p, s) => `<defs><linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8dcff"/><stop offset=".6" stop-color="#e9f7ff"/></linearGradient></defs><rect width="800" height="800" fill="url(#${p}b)"/><path d="M0 560 C200 520 600 600 800 540 V800 H0z" fill="#6ab04c"/>${Array.from({ length: 60 }, (_, i) => `<path d="M${(i * 41) % 800} 800 q4 -60 10 -${90 + (i % 5) * 20}" stroke="#4a8a2c" stroke-width="4" fill="none"/>`).join("")}`,
  paper: (p, s) => `<rect width="800" height="800" fill="#fbf8f2"/>${Array.from({ length: 26 }, (_, i) => `<path d="M0 ${i * 32 + 16}H800" stroke="${s.c2}" stroke-width="1" opacity=".18"/>`).join("")}<path d="M90 0V800" stroke="#e5989b" stroke-width="2" opacity=".6"/>`,
  scene: (p, s) => "",
};

/* ---------- the template generator: own base layouts × colour palettes × content themes ---------- */
const PE = "photo-editor", BR = "background-remover", IE = "image-enhancer", AI = "ai-photo-editor";
// How many templates each tool lists. Canva has no template type for these four tools (they are editor features), so a
// starter set per tool; raise a number to list more distinct combinations.
export const COUNTS = { [PE]: 48, [BR]: 48, [IE]: 24, [AI]: 30 };
const THEMES = {
  travel: { sample: "lake", title: "Weekend escape", line: "Find your quiet place", label: "Lake", tags: ["travel", "nature", "sunset"] },
  city: { sample: "city", title: "City lights", line: "Out on the town tonight", label: "City", tags: ["city", "night", "urban"] },
  garden: { sample: "flowers", title: "Spring garden", line: "Fresh blooms this week", label: "Flowers", tags: ["flowers", "home", "spring"] },
  people: { sample: "portrait", title: "Meet Sara", line: "Our new team lead", label: "Portrait", tags: ["portrait", "people", "team"] },
  cafe: { sample: "product", title: "Coffee break", line: "Freshly brewed every morning", label: "Coffee mug", tags: ["cafe", "product", "shop"] },
  beach: { sample: "beach", title: "Summer days", line: "Sun, sand and sea", label: "Beach", tags: ["beach", "summer", "holiday"] },
  kitchen: { sample: "food", title: "Fresh today", line: "Fruit bowls from 9 am", label: "Fruit plate", tags: ["food", "menu", "healthy"] },
  pets: { sample: "cat", title: "Nap time", line: "Ginger's favourite spot", label: "Cat", tags: ["pets", "cat", "cute"] },
};
const CUTOUT_THEMES = ["cafe", "people", "pets", "kitchen", "garden"]; // subjects that cut out cleanly
const PAL = [
  { id: "p01", name: "Snow", text: "#ffffff", ink: "#1b2133", accent: "#5b4cf0", frame: "#ffffff", warm: 0, tint: 0, k: 1 },
  { id: "p02", name: "Coral", text: "#fff5f0", ink: "#3d1f1a", accent: "#ff6b5b", frame: "#ffe4dc", warm: 10, tint: 4, k: 0.9 },
  { id: "p03", name: "Mint", text: "#f0fff8", ink: "#0f3d33", accent: "#14b8a6", frame: "#dff7ef", warm: -6, tint: -6, k: 0.85 },
  { id: "p04", name: "Sky", text: "#f2f8ff", ink: "#13294b", accent: "#2f80ff", frame: "#e3efff", warm: -12, tint: 0, k: 1 },
  { id: "p05", name: "Sunshine", text: "#fffbe8", ink: "#3b2a05", accent: "#f59e0b", frame: "#fff3c4", warm: 16, tint: 0, k: 1 },
  { id: "p06", name: "Berry", text: "#fff0f7", ink: "#3a0d24", accent: "#d6336c", frame: "#ffe0ee", warm: 4, tint: 12, k: 0.9 },
  { id: "p07", name: "Forest", text: "#f3fff0", ink: "#1e3a1a", accent: "#2f9e44", frame: "#e6f5e1", warm: 2, tint: -10, k: 0.8 },
  { id: "p08", name: "Midnight", text: "#eef0ff", ink: "#0d1033", accent: "#3b3f9f", frame: "#1d2160", warm: -8, tint: 6, k: 1 },
  { id: "p09", name: "Sand", text: "#fffaf0", ink: "#3d3020", accent: "#c08a4f", frame: "#f4e6cf", warm: 12, tint: 2, k: 0.75 },
  { id: "p10", name: "Ink", text: "#ffffff", ink: "#111111", accent: "#111111", frame: "#111111", warm: 0, tint: 0, k: 1 },
  { id: "p11", name: "Lilac", text: "#f7f0ff", ink: "#2e1a47", accent: "#8b5cf6", frame: "#efe5ff", warm: -2, tint: 10, k: 0.9 },
  { id: "p12", name: "Rose gold", text: "#fff6f2", ink: "#4a2c28", accent: "#b76e79", frame: "#f6dcd6", warm: 8, tint: 6, k: 0.85 },
];
const palById = Object.fromEntries(PAL.map((p) => [p.id, p]));
// one section per tool, so the mixed order does not split the list into many small sections
const LOOKS = "Photo looks and layouts", LAYOUTS_S = LOOKS, BACKS = "New backgrounds", ENH = "Enhance presets", IDEAS = "AI edit ideas";
const f = (id, n, pal) => [id, Math.min(100, Math.round(n * (pal?.k ?? 1)))];
const tone = (pal, a = {}) => ({ ...a, warmth: (a.warmth || 0) + pal.warm, tint: (a.tint || 0) + pal.tint });
const T_ = (th, extra) => ({ text: th.title, x: 0.5, y: 0.5, size: 0.08, bold: true, shadow: true, ...extra });

// photo editor: looks and layouts. build(theme, palette) -> recipe
const PE_LAYOUTS = [
  { id: "warm-glow", name: "Warm glow", section: LOOKS, tags: ["warm", "golden"], build: (th, p) => ({ kind: "look", filter: f("lahore-gold", 90, p), adjust: tone(p, { warmth: 18 }) }) },
  { id: "cool-fresh", name: "Cool and fresh", section: LOOKS, tags: ["cool", "blue"], build: (th, p) => ({ kind: "look", filter: f("frost", 100, p), adjust: tone(p, { exposure: 12 }) }) },
  { id: "classic-mono", name: "Black and white", section: LOOKS, tags: ["mono", "grey", "classic"], build: (th, p) => ({ kind: "look", filter: f("mono", 100), adjust: { contrast: 20 }, frame: { id: "solid", color: p.frame, width: 3 } }) },
  { id: "vintage-film", name: "Vintage film", section: LOOKS, tags: ["retro", "grain"], build: (th, p) => ({ kind: "look", filter: f("film", 100, p), adjust: tone(p, { grain: 30, fade: 18 }) }) },
  { id: "bright-airy", name: "Bright and airy", section: LOOKS, tags: ["light", "pastel"], build: (th, p) => ({ kind: "look", adjust: tone(p, { exposure: 22, shadows: 35, highlights: -12, saturation: -12, fade: 12 }) }) },
  { id: "moody-dusk", name: "Moody dusk", section: LOOKS, tags: ["dark", "vignette"], build: (th, p) => ({ kind: "look", filter: f("night", 80, p), adjust: tone(p, { vignette: 45, contrast: 15 }) }) },
  { id: "pop-colour", name: "Pop colour", section: LOOKS, tags: ["vivid", "bright"], build: (th, p) => ({ kind: "look", filter: f("vivid", 100, p), adjust: tone(p, { vibrance: 20 }) }) },
  { id: "soft-glow", name: "Soft glow", section: LOOKS, tags: ["soft", "dreamy"], build: (th, p) => ({ kind: "look", filter: f("soft", 90, p), adjust: tone(p, { clarity: -18, warmth: 8 }) }) },
  { id: "instant-photo", name: "Instant photo", section: LAYOUTS_S, tags: ["polaroid", "frame", "caption"], build: (th, p) => ({ kind: "look", aspect: "1:1", frame: { id: "polaroid", color: p.frame, width: 5 }, adjust: tone(p),
    texts: [T_(th, { y: 0.93, size: 0.055, color: p.ink, family: "serif", bold: false, shadow: false })] }) },
  { id: "square-post", name: "Square post", section: LAYOUTS_S, tags: ["post", "square", "social"], build: (th, p) => ({ kind: "look", aspect: "1:1", adjust: tone(p, { vibrance: 15 }),
    texts: [T_(th, { y: 0.13, size: 0.09, color: p.text }), T_(th, { text: th.line, y: 0.88, size: 0.042, bold: false, color: p.text, bg: p.accent, shadow: false })] }) },
  { id: "quote-card", name: "Quote card", section: LAYOUTS_S, tags: ["quote", "words"], build: (th, p) => ({ kind: "look", aspect: "4:5", adjust: tone(p, { brightness: -38, exposure: -10, vignette: 35 }),
    texts: [T_(th, { text: `“${th.line}.”`, y: 0.44, size: 0.055, color: p.text, family: "serif", italic: true, bold: false })] }) },
  { id: "story-cover", name: "Story cover", section: LAYOUTS_S, tags: ["story", "vertical", "9:16"], build: (th, p) => ({ kind: "look", aspect: "9:16", filter: f("vivid", 60, p), adjust: tone(p),
    texts: [T_(th, { text: th.title.toUpperCase(), y: 0.16, size: 0.05, color: "#ffffff", bg: p.accent, shadow: false }), T_(th, { text: th.line, y: 0.86, size: 0.032, bold: false, color: p.text })] }) },
  { id: "round-profile", name: "Round profile picture", section: LAYOUTS_S, tags: ["profile", "avatar", "circle"], build: (th, p) => ({ kind: "look", aspect: "1:1", frame: { id: "circle", color: p.frame, width: 4 }, adjust: tone(p, { vibrance: 12 }) }) },
  { id: "film-strip", name: "Film strip", section: LAYOUTS_S, tags: ["film", "frame", "retro"], build: (th, p) => ({ kind: "look", aspect: "16:9", frame: { id: "film", color: p.ink, width: 4 }, filter: f("film", 60, p), adjust: tone(p) }) },
  { id: "poster-border", name: "Poster with border", section: LAYOUTS_S, tags: ["poster", "border", "title"], build: (th, p) => ({ kind: "look", aspect: "4:5", frame: { id: "double", color: p.frame, width: 4 }, adjust: tone(p, { contrast: 10 }),
    texts: [T_(th, { y: 0.84, size: 0.085, color: p.text, outline: p.ink, shadow: false })] }) },
  { id: "caption-bar", name: "Wide photo with caption", section: LAYOUTS_S, tags: ["caption", "banner", "16:9"], build: (th, p) => ({ kind: "look", aspect: "16:9", adjust: tone(p),
    texts: [T_(th, { text: `${th.title}: ${th.line}`, y: 0.88, size: 0.05, bold: false, color: p.text, bg: p.ink, shadow: false })] }) },
  { id: "floating-card", name: "Floating card", section: LAYOUTS_S, tags: ["card", "shadow", "frame"], build: (th, p) => ({ kind: "look", aspect: "4:5", frame: { id: "shadow", color: p.frame, width: 4 }, adjust: tone(p, { clarity: 10 }),
    texts: [T_(th, { y: 0.1, size: 0.06, color: p.text })] }) },
  // more looks: our filters, duotones and tone recipes
  { id: "sea-breeze", name: "Sea breeze", section: LOOKS, tags: ["sea", "blue", "fresh"], build: (th, p) => ({ kind: "look", filter: f("karachi-sea", 100, p), adjust: tone(p, { clarity: 8 }) }) },
  { id: "rainy-day", name: "Rainy day", section: LOOKS, tags: ["rain", "cool", "moody"], build: (th, p) => ({ kind: "look", filter: f("monsoon", 100, p), adjust: tone(p, { fade: 10 }) }) },
  { id: "mountain-morning", name: "Mountain morning", section: LOOKS, tags: ["morning", "clear", "nature"], build: (th, p) => ({ kind: "look", filter: f("hunza-morning", 100, p), adjust: tone(p) }) },
  { id: "tea-time", name: "Tea time", section: LOOKS, tags: ["warm", "cosy", "brown"], build: (th, p) => ({ kind: "look", filter: f("chai", 100, p), adjust: tone(p, { vignette: 15 }) }) },
  { id: "garden-green", name: "Garden green", section: LOOKS, tags: ["green", "plants", "fresh"], build: (th, p) => ({ kind: "look", filter: f("mehndi", 100, p), adjust: tone(p) }) },
  { id: "rose-blush", name: "Rose blush", section: LOOKS, tags: ["pink", "soft", "romantic"], build: (th, p) => ({ kind: "look", filter: f("rose-petal", 100, p), adjust: tone(p, { clarity: -10 }) }) },
  { id: "old-town", name: "Old town", section: LOOKS, tags: ["vintage", "sepia", "history"], build: (th, p) => ({ kind: "look", filter: f("old-fort", 100, p), adjust: tone(p, { grain: 18 }) }) },
  { id: "kite-sky", name: "Bright sky", section: LOOKS, tags: ["sunny", "bright", "summer"], build: (th, p) => ({ kind: "look", filter: f("kite-day", 100, p), adjust: tone(p) }) },
  { id: "noir-drama", name: "Noir drama", section: LOOKS, tags: ["black and white", "dramatic", "film"], build: (th, p) => ({ kind: "look", filter: f("noir", 100), adjust: { contrast: 30, vignette: 50, grain: 22 } }) },
  { id: "duotone-pop", name: "Duotone pop", section: LOOKS, tags: ["duotone", "two colours", "poster"], build: (th, p) => ({ kind: "look", duotone: DUO_OF[p.id] || "berry", adjust: { contrast: 15 } }) },
  { id: "faded-matte", name: "Faded matte", section: LOOKS, tags: ["matte", "faded", "soft"], build: (th, p) => ({ kind: "look", adjust: tone(p, { fade: 35, contrast: -15, saturation: -12, shadows: 15 }) }) },
  { id: "gritty-mono", name: "Gritty black and white", section: LOOKS, tags: ["mono", "grain", "street"], build: (th, p) => ({ kind: "look", filter: f("mono", 100), adjust: { contrast: 45, grain: 40, clarity: 30 }, frame: { id: "film", color: "#111111", width: 4 } }) },
  // more layouts: text and shapes over the photo
  { id: "magazine-cover", name: "Magazine cover", section: LAYOUTS_S, tags: ["magazine", "cover", "title"], build: (th, p) => ({ kind: "look", aspect: "4:5", adjust: tone(p, { clarity: 10 }),
    texts: [T_(th, { text: th.title.toUpperCase(), y: 0.11, size: 0.1, color: p.text, family: "serif", shadow: false, outline: p.ink }), T_(th, { text: th.line, y: 0.86, size: 0.04, bold: false, color: p.text }), T_(th, { text: "ISSUE 07", x: 0.86, y: 0.2, size: 0.03, color: p.ink, bg: p.frame, shadow: false })] }) },
  { id: "postcard", name: "Postcard", section: LAYOUTS_S, tags: ["postcard", "travel", "greetings"], build: (th, p) => ({ kind: "look", aspect: "16:9", frame: { id: "solid", color: p.frame, width: 3 }, adjust: tone(p, { vibrance: 15 }),
    texts: [T_(th, { text: "Greetings from", y: 0.32, size: 0.06, bold: false, italic: true, family: "serif", color: p.text }), T_(th, { text: th.title, y: 0.5, size: 0.14, color: p.text, outline: p.ink, shadow: false })] }) },
  { id: "video-thumbnail", name: "Video thumbnail", section: LAYOUTS_S, tags: ["youtube", "thumbnail", "16:9"], build: (th, p) => ({ kind: "look", aspect: "16:9", adjust: tone(p, { contrast: 20, vibrance: 25 }),
    shapes: [{ shape: "rect", x: 0.25, y: 0.5, w: 0.5, h: 1, fill: p.ink, opacity: 0.55 }, { shape: "arrow", x: 0.6, y: 0.62, w: 0.16, h: 0.12, fill: p.accent }],
    texts: [T_(th, { text: th.title.toUpperCase(), x: 0.25, y: 0.42, size: 0.13, color: "#ffffff", outline: p.accent, shadow: false }), T_(th, { text: "5 TIPS", x: 0.25, y: 0.66, size: 0.08, color: p.ink, bg: p.frame, shadow: false })] }) },
  { id: "meme", name: "Top and bottom caption", section: LAYOUTS_S, tags: ["meme", "caption", "funny"], build: (th, p) => ({ kind: "look", aspect: "1:1", adjust: tone(p),
    texts: [T_(th, { text: "WHEN IT'S " + th.title.toUpperCase(), y: 0.1, size: 0.075, color: "#ffffff", outline: "#000000", shadow: false }), T_(th, { text: "AND YOU LOVE IT", y: 0.9, size: 0.075, color: "#ffffff", outline: "#000000", shadow: false })] }) },
  { id: "price-tag", name: "Product with price badge", section: LAYOUTS_S, tags: ["product", "price", "shop"], build: (th, p) => ({ kind: "look", aspect: "1:1", adjust: tone(p, { clarity: 12 }),
    shapes: [{ shape: "star", x: 0.8, y: 0.2, w: 0.3, h: 0.3, fill: p.accent }],
    texts: [T_(th, { text: "25% OFF", x: 0.8, y: 0.2, size: 0.055, color: "#ffffff", shadow: false }), T_(th, { text: th.title, y: 0.9, size: 0.06, color: p.ink, bg: p.frame, shadow: false })] }) },
  { id: "sale-banner", name: "Sale banner", section: LAYOUTS_S, tags: ["sale", "banner", "shop"], build: (th, p) => ({ kind: "look", aspect: "16:9", adjust: tone(p, { vibrance: 20 }),
    shapes: [{ shape: "rect", x: 0.5, y: 0.84, w: 1, h: 0.32, fill: p.accent, opacity: 0.92 }],
    texts: [T_(th, { text: "WEEKEND SALE", y: 0.8, size: 0.1, color: "#ffffff", shadow: false }), T_(th, { text: th.line, y: 0.93, size: 0.04, bold: false, color: "#ffffff", shadow: false })] }) },
  { id: "event-flyer", name: "Event flyer", section: LAYOUTS_S, tags: ["event", "flyer", "date"], build: (th, p) => ({ kind: "look", aspect: "4:5", adjust: tone(p, { brightness: -10 }),
    shapes: [{ shape: "rect", x: 0.5, y: 0.13, w: 1, h: 0.26, fill: p.accent, opacity: 0.9 }],
    texts: [T_(th, { text: th.title, y: 0.1, size: 0.075, color: "#ffffff", shadow: false }), T_(th, { text: "SAT 14 JUNE · 6 PM", y: 0.2, size: 0.035, bold: false, color: "#ffffff", shadow: false }), T_(th, { text: th.line, y: 0.9, size: 0.04, bold: false, color: p.text })] }) },
  { id: "recipe-card", name: "Recipe card", section: LAYOUTS_S, tags: ["recipe", "food", "card"], build: (th, p) => ({ kind: "look", aspect: "4:5", adjust: tone(p, { vibrance: 15 }),
    shapes: [{ shape: "rounded", x: 0.5, y: 0.82, w: 0.86, h: 0.26, fill: "#ffffff", opacity: 0.94 }],
    texts: [T_(th, { text: th.title, y: 0.77, size: 0.06, color: p.ink, shadow: false, family: "serif" }), T_(th, { text: "Ready in 20 minutes · serves 2", y: 0.87, size: 0.032, bold: false, color: p.ink, shadow: false })] }) },
  { id: "travel-stamp", name: "Travel stamp", section: LAYOUTS_S, tags: ["travel", "stamp", "badge"], build: (th, p) => ({ kind: "look", aspect: "1:1", adjust: tone(p, { vibrance: 10 }),
    shapes: [{ shape: "ellipse", x: 0.78, y: 0.78, w: 0.32, h: 0.32, fill: "transparent", stroke: p.text, strokeWidth: 1.4 }],
    texts: [T_(th, { text: "2026", x: 0.78, y: 0.78, size: 0.06, color: p.text, shadow: false }), T_(th, { text: th.title, x: 0.3, y: 0.12, size: 0.065, color: p.text })] }) },
  { id: "birthday-card", name: "Birthday card", section: LAYOUTS_S, tags: ["birthday", "card", "party"], build: (th, p) => ({ kind: "look", aspect: "4:5", frame: { id: "solid", color: p.frame, width: 4 }, adjust: tone(p, { exposure: 8 }),
    shapes: [{ shape: "heart", x: 0.15, y: 0.15, w: 0.12, h: 0.11, fill: p.accent }, { shape: "star", x: 0.85, y: 0.14, w: 0.13, h: 0.13, fill: "#ffd166" }, { shape: "heart", x: 0.86, y: 0.84, w: 0.1, h: 0.09, fill: p.accent }],
    texts: [T_(th, { text: "Happy birthday!", y: 0.86, size: 0.08, color: p.text, family: "serif", outline: p.ink, shadow: false })] }) },
  { id: "profile-banner", name: "Profile banner", section: LAYOUTS_S, tags: ["banner", "linkedin", "header"], build: (th, p) => ({ kind: "look", aspect: "16:9", adjust: tone(p, { brightness: -6 }),
    shapes: [{ shape: "rect", x: 0.2, y: 0.5, w: 0.4, h: 1, fill: p.ink, opacity: 0.78 }],
    texts: [T_(th, { text: th.title, x: 0.2, y: 0.42, size: 0.08, color: "#ffffff", shadow: false }), T_(th, { text: th.line, x: 0.2, y: 0.58, size: 0.035, bold: false, color: "#ffffff", shadow: false })] }) },
  { id: "testimonial", name: "Testimonial", section: LAYOUTS_S, tags: ["review", "quote", "customer"], build: (th, p) => ({ kind: "look", aspect: "1:1", adjust: tone(p, { brightness: -35, saturation: -20 }),
    texts: [T_(th, { text: "“", y: 0.22, size: 0.22, color: p.accent, family: "serif", shadow: false }), T_(th, { text: `${th.line}.`, y: 0.48, size: 0.05, bold: false, italic: true, color: "#ffffff", family: "serif" }), T_(th, { text: "— A happy customer", y: 0.66, size: 0.035, bold: false, color: p.frame })] }) },
];
// duotone per palette (the "Duotone pop" layout)
const DUO_OF = { p01: "violet", p02: "coral", p03: "teal", p04: "ocean", p05: "lemon", p06: "berry", p07: "forest", p08: "ocean", p09: "sunset", p10: "violet", p11: "berry", p12: "coral" };
const PE_EXTRA = [{ id: "pe~passport~people", layout: "passport", theme: "people", name: "Passport photo 35 × 45 mm", section: LAYOUTS_S, tags: ["passport", "id", "35x45"], recipe: { kind: "look", aspect: "passport", panel: "export" } }];

// background remover: palette backdrops; a few fixed ones (see-through, blur, studio, night sky, leaves)
const BR_LAYOUTS = [
  { id: "solid", name: "Solid colour", tags: ["colour", "plain"], bg: (p) => ({ mode: "color", color: p.accent }) },
  { id: "pastel", name: "Soft pastel", tags: ["pastel", "light", "shop"], bg: (p) => ({ mode: "color", color: p.frame }), aspect: "1:1" },
  { id: "gradient", name: "Gradient", tags: ["gradient", "colour"], bg: (p) => ({ mode: "image", backdrop: { kind: "gradient", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "dots", name: "Polka dots", tags: ["pattern", "dots", "fun"], bg: (p) => ({ mode: "image", backdrop: { kind: "dots", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "stripes", name: "Stripes", tags: ["pattern", "stripes"], bg: (p) => ({ mode: "image", backdrop: { kind: "stripes", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "spotlight", name: "Spotlight", tags: ["studio", "light", "product"], bg: (p) => ({ mode: "image", backdrop: { kind: "spotlight", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "confetti", name: "Party confetti", tags: ["party", "birthday", "fun"], bg: (p) => ({ mode: "image", backdrop: { kind: "confetti", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "arch", name: "Arch", tags: ["arch", "modern", "shop"], bg: (p) => ({ mode: "image", backdrop: { kind: "arch", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "waves", name: "Waves", tags: ["waves", "calm"], bg: (p) => ({ mode: "image", backdrop: { kind: "waves", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "grid", name: "Grid paper", tags: ["grid", "school", "clean"], bg: (p) => ({ mode: "image", backdrop: { kind: "grid", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "sunset", name: "Sunset glow", tags: ["sunset", "warm", "gradient"], bg: (p) => ({ mode: "image", backdrop: { kind: "sunset", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "profile-circle", name: "Profile circle", tags: ["profile", "avatar", "circle"], bg: (p) => ({ mode: "color", color: p.accent }), aspect: "1:1", frame: { id: "circle", color: "#ffffff", width: 4 } },
  { id: "see-through", name: "See-through PNG", tags: ["transparent", "png", "cut out"], fixed: true, bg: () => ({ mode: "transparent" }) },
  { id: "soft-blur", name: "Soft blur", tags: ["blur", "focus", "portrait"], fixed: true, bg: () => ({ mode: "blur", blur: 60 }) },
  { id: "studio", name: "Studio light", tags: ["studio", "grey", "product"], fixed: true, bg: () => ({ mode: "image", backdrop: { kind: "studio" } }) },
  { id: "night", name: "Night sky", tags: ["stars", "night"], fixed: true, bg: () => ({ mode: "image", backdrop: { kind: "night" } }) },
  { id: "leaves", name: "Green leaves", tags: ["nature", "green"], fixed: true, bg: () => ({ mode: "image", backdrop: { kind: "leaves" } }) },
  { id: "brick", name: "Brick wall", tags: ["wall", "brick", "urban"], bg: (p) => ({ mode: "image", backdrop: { kind: "brick", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 10, blur: 18 } }) },
  { id: "shelf", name: "On a wooden shelf", tags: ["product", "wood", "shelf"], bg: (p) => ({ mode: "image", backdrop: { kind: "wood", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 8, blur: 14, angle: 90 } }) },
  { id: "marble", name: "Marble", tags: ["marble", "luxury", "product"], bg: (p) => ({ mode: "image", backdrop: { kind: "marble", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 6, blur: 24, angle: 90, alpha: 30 } }) },
  { id: "bokeh", name: "Party lights", tags: ["bokeh", "lights", "night"], bg: (p) => ({ mode: "image", backdrop: { kind: "bokeh", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "clouds", name: "Blue sky", tags: ["sky", "clouds", "outdoor"], fixed: true, bg: () => ({ mode: "image", backdrop: { kind: "clouds" } }) },
  { id: "podium", name: "Product podium", tags: ["podium", "product", "shop"], bg: (p) => ({ mode: "image", backdrop: { kind: "podium", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 6, blur: 16, angle: 90 } }) },
  { id: "rays", name: "Sun rays", tags: ["rays", "bright", "sale"], bg: (p) => ({ mode: "image", backdrop: { kind: "rays", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "halftone", name: "Halftone dots", tags: ["pop art", "dots", "comic"], bg: (p) => ({ mode: "image", backdrop: { kind: "halftone", c1: p.frame, c2: p.accent, c3: p.ink }, outline: { width: 6 } }) },
  { id: "plaid", name: "Plaid", tags: ["pattern", "check", "cosy"], bg: (p) => ({ mode: "image", backdrop: { kind: "plaid", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "terrazzo", name: "Terrazzo", tags: ["pattern", "modern", "speckles"], bg: (p) => ({ mode: "image", backdrop: { kind: "terrazzo", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 8, blur: 20 } }) },
  { id: "blobs", name: "Soft shapes", tags: ["abstract", "shapes", "modern"], bg: (p) => ({ mode: "image", backdrop: { kind: "blobs", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "checkfloor", name: "Checked floor", tags: ["floor", "retro", "room"], bg: (p) => ({ mode: "image", backdrop: { kind: "checkfloor", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 8, blur: 16, angle: 100 } }) },
  { id: "split", name: "Two-tone", tags: ["two colours", "diagonal", "bold"], bg: (p) => ({ mode: "image", backdrop: { kind: "split", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "rainbow", name: "Rainbow", tags: ["rainbow", "kids", "happy"], fixed: true, bg: () => ({ mode: "image", backdrop: { kind: "rainbow" } }) },
  { id: "stars", name: "Star pattern", tags: ["stars", "pattern", "kids"], bg: (p) => ({ mode: "image", backdrop: { kind: "stars", c1: p.frame, c2: p.accent, c3: p.ink }, outline: { width: 7 } }) },
  { id: "hearts", name: "Hearts", tags: ["love", "hearts", "valentine"], bg: (p) => ({ mode: "image", backdrop: { kind: "hearts", c1: p.frame, c2: p.accent, c3: p.ink } }) },
  { id: "meadow", name: "Green meadow", tags: ["grass", "outdoor", "spring"], fixed: true, bg: () => ({ mode: "image", backdrop: { kind: "grass" } }) },
  { id: "notebook", name: "Notebook paper", tags: ["paper", "school", "notes"], bg: (p) => ({ mode: "image", backdrop: { kind: "paper", c1: p.frame, c2: p.accent, c3: p.ink }, shadow: { dist: 6, blur: 12 } }) },
  { id: "sticker", name: "Sticker with outline", tags: ["sticker", "outline", "cut out"], bg: (p) => ({ mode: "color", color: p.frame, outline: { width: 10, color: "#ffffff" }, shadow: { dist: 6, blur: 10, alpha: 30 } }) },
  { id: "floating", name: "Floating with shadow", tags: ["shadow", "white", "product"], fixed: true, bg: () => ({ mode: "color", color: "#ffffff", shadow: { dist: 18, blur: 30, angle: 90, alpha: 35 } }) },
  { id: "id-blue", name: "ID photo, light blue", tags: ["passport", "id", "blue"], fixed: true, bg: () => ({ mode: "color", color: "#dbeafe" }), aspect: "passport" },
  { id: "id-white", name: "ID photo, white", tags: ["passport", "id", "white"], fixed: true, bg: () => ({ mode: "color", color: "#ffffff" }), aspect: "passport" },
  { id: "dark-studio", name: "Dark studio", tags: ["dark", "studio", "dramatic"], bg: (p) => ({ mode: "image", backdrop: { kind: "spotlight", c1: p.accent, c2: p.ink, c3: "#05060a" } }) },
];

// image enhancer presets (no palette)
const IE_LAYOUTS = [
  ["sharpen-2x", "Sharper and 2× bigger", [2, 20, 45, 1, 1, 0], ["upscale", "2x", "sharpen"]],
  ["upscale-4x", "Upscale 4×", [4, 15, 30, 0, 0, 0], ["upscale", "4x", "print"]],
  ["clean-noise", "Clean up noise", [1, 80, 15, 0, 1, 0], ["noise", "grain"]],
  ["old-photo", "Fix an old photo", [2, 55, 30, 1, 1, 1], ["restore", "old", "colour"]],
  ["portrait", "Face-safe portrait", [2, 30, 25, 1, 1, 1], ["portrait", "skin", "face"]],
  ["product", "Product detail", [2, 10, 60, 1, 1, 0], ["product", "shop", "detail"]],
  ["low-light", "Low light rescue", [1, 60, 20, 1, 1, 0], ["dark", "night"]],
  ["crisp", "Same size, crisper", [1, 15, 55, 1, 0, 0], ["sharpen", "crisp"]],
  ["print-2x", "Ready to print 2×", [2, 25, 40, 1, 1, 0], ["print", "2x"]],
  ["web-ready", "Clean for the web", [1, 20, 30, 1, 1, 0], ["web", "blog"]],
  ["social-2x", "Social post 2×", [2, 35, 20, 1, 1, 1], ["social", "post"]],
  ["landscape", "Landscape detail", [2, 15, 50, 0, 1, 0], ["landscape", "nature"]],
  ["screenshot", "Text and screenshots", [2, 0, 70, 0, 0, 0], ["text", "screenshot", "sharp"]],
  ["night-clean", "Night photo clean-up", [1, 90, 10, 0, 1, 0], ["night", "noise"]],
  ["gentle-2x", "Gentle 2× upscale", [2, 40, 15, 0, 0, 1], ["gentle", "2x", "soft"]],
  ["face-4x", "Portrait 4×", [4, 30, 20, 1, 1, 1], ["portrait", "4x", "face"]],
  ["logo-crisp", "Logo and graphics 4×", [4, 0, 75, 0, 0, 0], ["logo", "graphics", "4x"]],
  ["document", "Document scan", [2, 20, 65, 0, 1, 0], ["document", "scan", "text"]],
  ["print-4x", "Poster print 4×", [4, 25, 35, 1, 1, 0], ["poster", "print", "4x"]],
  ["pet-fur", "Pet fur detail", [2, 15, 50, 1, 1, 0], ["pets", "fur", "detail"]],
  ["food-photo", "Food photo", [2, 20, 40, 1, 1, 0], ["food", "menu", "colour"]],
  ["sky-clean", "Smooth sky", [1, 70, 10, 1, 1, 0], ["sky", "smooth", "landscape"]],
  ["sign-text", "Signs and labels", [2, 10, 60, 0, 1, 0], ["sign", "label", "text"]],
  ["memory", "Family memory", [2, 50, 25, 1, 1, 1], ["family", "old", "restore"]],
].map(([id, name, [scale, denoise, sharpen, ac, at, fs], tags]) => ({ id, name, tags, enhance: { scale, denoise, sharpen, autoColor: !!ac, autoContrast: !!at, faceSafe: !!fs } }));

// AI photo editor ideas: the prompt for AsaanDesk AI, plus a close look made with the free tools until AI is on
const AI_LAYOUTS = [
  ["blue-sky", "Make the sky blue", "Make the sky a clear blue", { adjust: { warmth: -40, tint: -10, saturation: 15 } }],
  ["evening", "Turn it into evening", "Make it look like a warm evening", { filter: ["thar-dusk", 90], adjust: { exposure: -15 } }],
  ["studio-light", "Soft studio light", "Add soft studio light", { adjust: { exposure: 15, shadows: 30, clarity: -10 } }],
  ["remove-people", "Remove people at the back", "Remove the people at the back", { panel: "erase" }],
  ["snow-day", "Snowy day", "Make it a snowy winter day", { filter: ["frost", 100], adjust: { exposure: 18, saturation: -25 } }],
  ["watercolour", "Watercolour painting", "Turn the photo into a watercolour painting", { adjust: { blur: 12, saturation: 25, fade: 25, clarity: -30 } }],
  ["retro-poster", "Retro poster", "Make it look like a retro travel poster", { filter: ["film", 100], adjust: { contrast: 30, grain: 25 } }],
  ["golden-hour", "Golden hour glow", "Give it a golden hour glow", { filter: ["lahore-gold", 100], adjust: { vignette: 20 } }],
  ["film-noir", "Film noir", "Make it a dramatic black and white film still", { filter: ["noir", 100], adjust: { contrast: 25, vignette: 35 } }],
  ["neon-night", "Neon night", "Add neon city light colours", { filter: ["night", 70], adjust: { tint: 40, saturation: 30, contrast: 15 } }],
  ["autumn", "Autumn colours", "Change the leaves to autumn colours", { adjust: { warmth: 35, tint: 10, saturation: 15 } }],
  ["spring", "Fresh spring", "Make everything look fresh and green", { adjust: { vibrance: 30, exposure: 10, tint: -8 } }],
  ["dreamy", "Dreamy and soft", "Make it soft and dreamy", { filter: ["soft", 100], adjust: { fade: 20, blur: 6, exposure: 10 } }],
  ["comic", "Comic book style", "Turn it into a comic book picture", { adjust: { contrast: 45, saturation: 40, clarity: 40 } }],
  ["cinematic", "Cinematic colour", "Give it a cinematic teal and orange look", { adjust: { warmth: 15, tint: -15, contrast: 20, vignette: 30 } }],
  ["foggy", "Foggy morning", "Add a soft morning fog", { adjust: { fade: 40, contrast: -25, saturation: -20, exposure: 8 } }],
  ["day-to-night", "Day to night", "Turn this daytime photo into night", { filter: ["night", 100], adjust: { exposure: -30, warmth: -25 } }],
  ["oil-painting", "Oil painting", "Make it look like an oil painting", { adjust: { saturation: 30, clarity: -35, blur: 6, contrast: 15 } }],
  ["seventies", "1970s photo", "Make it look like a photo from the 1970s", { filter: ["film", 100], adjust: { warmth: 25, fade: 25, grain: 30 } }],
  ["pastel", "Pastel dream", "Give it soft pastel colours", { adjust: { exposure: 15, saturation: -25, fade: 30, tint: 10 } }],
  ["neon-duotone", "Neon poster", "Turn it into a bold two-colour poster", { duotone: "violet", adjust: { contrast: 25 } }],
  ["sepia", "Sepia memory", "Make it an old sepia photo", { filter: ["old-fort", 100], adjust: { saturation: -40, grain: 20 } }],
  ["summer", "Bright summer", "Make it a bright summer day", { filter: ["kite-day", 100], adjust: { exposure: 12, vibrance: 25 } }],
  ["moody-rain", "Moody rain", "Make it look like a rainy evening", { filter: ["monsoon", 100], adjust: { exposure: -12, vignette: 30 } }],
  ["golden-autumn", "Golden autumn", "Give it warm autumn light", { filter: ["chai", 100], adjust: { warmth: 20 } }],
  ["product-white", "Product on white", "Put the product on a clean white background", { panel: "bg" }],
  ["sharpen-upscale", "Sharper and bigger", "Make the photo sharper and bigger", { panel: "enhance" }],
  ["remove-object", "Remove an object", "Remove the bin from the corner", { panel: "erase" }],
  ["cartoon", "Cartoon look", "Turn the photo into a cartoon", { adjust: { contrast: 35, saturation: 45, clarity: 45, sharpen: 40 } }],
  ["blueprint", "Blueprint", "Make it look like a blueprint", { duotone: "ocean", invert: true }],
].map(([id, name, prompt, look]) => ({ id, name, prompt, ...look }));

const TOOLS = {
  [PE]: { pre: "pe", layouts: PE_LAYOUTS, themes: Object.keys(THEMES), pals: PAL, extra: PE_EXTRA },
  [BR]: { pre: "br", layouts: BR_LAYOUTS, themes: CUTOUT_THEMES, pals: PAL, extra: [] },
  [IE]: { pre: "ie", layouts: IE_LAYOUTS, themes: Object.keys(THEMES), pals: null, extra: [] },
  [AI]: { pre: "ai", layouts: AI_LAYOUTS, themes: Object.keys(THEMES), pals: null, extra: [] },
};
const PRE_TOOL = Object.fromEntries(Object.entries(TOOLS).map(([k, v]) => [v.pre, k]));

/** Build the recipe for an id like "pe~instant-photo~beach~p02" (tool~layout~theme[~palette]). */
function recipe(id) {
  const [pre, lid, tid, pid] = String(id || "").split("~"), tool = PRE_TOOL[pre], d = TOOLS[tool];
  if (!d) return null;
  const extra = d.extra.find((x) => x.id === id);
  if (extra) return { ...extra.recipe, id, tool, sample: THEMES[extra.theme].sample, theme: extra.theme, layout: extra.layout, layoutName: extra.name, themeName: THEMES[extra.theme].label, name: extra.name, section: extra.section, tags: extra.tags };
  const L = d.layouts.find((x) => x.id === lid), th = THEMES[tid];
  if (!L || !th || !d.themes.includes(tid)) return null;
  const pal = d.pals && !L.fixed ? palById[pid] : null;
  if (d.pals && !L.fixed && !pal) return null;
  if ((L.fixed || !d.pals) && pid) return null;
  const base = { id, tool, sample: th.sample, theme: tid, layout: lid, palette: pal?.id || null, layoutName: L.name, themeName: th.label };
  if (tool === PE) return { ...base, ...L.build(th, pal), name: `${L.name} · ${th.title} · ${pal.name}`, section: L.section, tags: [...L.tags, ...th.tags, pal.name.toLowerCase()] };
  if (tool === BR) return { ...base, kind: "bg", bg: L.bg(pal || PAL[0]), aspect: L.aspect, frame: L.frame, name: `${L.name}${pal ? " · " + pal.name : ""} · ${th.label}`, section: BACKS, tags: [...L.tags, ...th.tags, pal ? pal.name.toLowerCase() : "background"] };
  if (tool === IE) return { ...base, kind: "enhance", enhance: { ...L.enhance }, name: `${L.name} · ${th.label}`, section: ENH, tags: [...L.tags, ...th.tags] };
  return { ...base, kind: "ai", prompt: L.prompt, filter: L.filter, adjust: L.adjust, duotone: L.duotone, invert: L.invert, panel: L.panel, name: `${L.name} · ${th.label}`, section: IDEAS, tags: [...L.tags || [], ...th.tags, "ai"] };
}
/** Every combination of one layout, in a mixed order (themes and palettes rotate), as ids. */
function combos(tool, L, l) {
  const d = TOOLS[tool], nT = d.themes.length, pals = d.pals && !L.fixed ? d.pals : [null], nP = pals.length, out = [];
  for (let r = 0; r < nT * nP; r++) {
    const q = Math.floor(r / nT), t = r % nT, th = d.themes[(t + l) % nT], pal = pals[(q + t + 5 * l) % nP];
    out.push(`${d.pre}~${L.id}~${th}${pal ? "~" + pal.id : ""}`);
  }
  return out;
}
/** The first COUNT distinct combinations, round-robin over the layouts (no run of one layout). */
function listFor(tool) {
  const d = TOOLS[tool], lists = d.layouts.map((L, l) => combos(tool, L, l)), out = [];
  for (const x of d.extra) out.push(x.id);
  for (let r = 0; out.length < COUNTS[tool]; r++) {
    let any = false;
    for (const ls of lists) if (r < ls.length) { any = true; out.push(ls[r]); if (out.length >= COUNTS[tool]) break; }
    if (!any) break;
  }
  // keep the fixed extras near the front but not first
  if (d.extra.length && out.length > 6) { const ex = out.splice(0, d.extra.length); out.splice(5, 0, ...ex); }
  return out;
}
const RECIPE_CACHE = new Map();
export const templateById = (id) => { if (!RECIPE_CACHE.has(id)) RECIPE_CACHE.set(id, recipe(id)); return RECIPE_CACHE.get(id); };
export const TEMPLATES = Object.keys(TOOLS).flatMap((tool) => listFor(tool).map((id) => { const r = templateById(id); return { id, name: r.name, tool, app: "photo", section: r.section, tags: r.tags, layout: r.layout, layoutName: r.layoutName, theme: r.theme, themeName: r.themeName, palette: r.palette }; }));
export const TOTAL = TEMPLATES.length;
export const LAYOUTS = Object.values(TOOLS).reduce((n, d) => n + d.layouts.length + d.extra.length, 0);
export const TOTALS = Object.fromEntries(Object.keys(TOOLS).map((t) => [t, TEMPLATES.filter((x) => x.tool === t).length]));
export const LAYOUTS_BY_TOOL = Object.fromEntries(Object.entries(TOOLS).map(([t, d]) => [t, d.layouts.length + d.extra.length]));
export const SAMPLES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { w: v.w, h: v.h, name: v.name }]));
/** Which photo tool (slug) uses which editor mode. */
export const TOOL_MODE = { [PE]: "full", [BR]: "bg", [IE]: "enhance", [AI]: "ai" };
export const MODE_TOOL = { full: PE, bg: BR, enhance: IE, ai: AI };

const clean = (s) => String(s).replace(/~/g, "-").replace(/[^a-z0-9-]/gi, "");
/** Full SVG of a sample photo (the editor turns it into pixels). */
export function sceneSvg(name, prefix = "s") {
  const s = S[name] || S.lake, p = clean(prefix) + "-";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">${s.bg(p)}${s.subject(p)}</svg>`;
}
const backdropBody = (spec, p) => (BACKDROP[spec?.kind] || BACKDROP.studio)(p, { c1: "#f3f4fb", c2: "#5b4cf0", c3: "#1b2133", ...spec });
/** SVG of a backdrop picture at w×h (cover). spec = { kind, c1, c2, c3 } or a kind name. */
export function backdropSvg(spec, w = 800, h = 800, prefix = "b") {
  const s = typeof spec === "string" ? { kind: spec } : spec;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">${backdropBody(s, clean(prefix) + "-")}</svg>`;
}

/* ---------- thumbnails (320 × 200, self-contained, ids unique per template) ---------- */
const ASPECT = { "1:1": 1, "4:5": 0.8, "9:16": 0.5625, passport: 35 / 45, "16:9": 16 / 9 };
const esc = (s) => String(s).replace(/[<&"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", '"': "&quot;" })[c]);
// duotone colours for thumbnails (same pairs as adjust.js DUOTONES)
const DUO_COLORS = { berry: ["#2b1055", "#ff7eb3"], ocean: ["#0b2545", "#7ee8fa"], sunset: ["#3a0ca3", "#ffb703"], forest: ["#1b4332", "#d8f3dc"], lemon: ["#283618", "#fefae0"], coral: ["#22223b", "#ff8c69"], violet: ["#240046", "#c77dff"], teal: ["#03045e", "#48cae4"] };
const hex3 = (h) => { const n = parseInt(String(h).slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(3)); };
/** One overlay shape in a thumbnail box (x, y, w, h of the photo area). */
function shapeSvg(sh, x0, y0, w, h) {
  const cx = x0 + sh.x * w, cy = y0 + sh.y * h, sw = sh.w * w, shh = sh.h * h, fill = sh.fill || "#5b4cf0", op = sh.opacity ?? 1;
  const st = sh.stroke && sh.strokeWidth ? ` stroke="${sh.stroke}" stroke-width="${Math.max(1, (sh.strokeWidth / 100) * Math.min(w, h))}"` : "";
  const a = `fill="${fill === "transparent" ? "none" : fill}" opacity="${op}"${st}`;
  switch (sh.shape) {
    case "ellipse": return `<ellipse cx="${cx}" cy="${cy}" rx="${sw / 2}" ry="${shh / 2}" ${a}/>`;
    case "rounded": return `<rect x="${cx - sw / 2}" y="${cy - shh / 2}" width="${sw}" height="${shh}" rx="${Math.min(sw, shh) * 0.18}" ${a}/>`;
    case "star": { const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.4 : 1, an = -Math.PI / 2 + (i * Math.PI) / 5; return `${(cx + Math.cos(an) * r * sw / 2).toFixed(1)},${(cy + Math.sin(an) * r * shh / 2).toFixed(1)}`; }).join(" "); return `<polygon points="${pts}" ${a}/>`; }
    case "heart": return `<path d="M${cx} ${cy + shh * 0.4}C${cx - sw * 0.6} ${cy} ${cx - sw * 0.45} ${cy - shh * 0.55} ${cx} ${cy - shh * 0.15}C${cx + sw * 0.45} ${cy - shh * 0.55} ${cx + sw * 0.6} ${cy} ${cx} ${cy + shh * 0.4}z" ${a}/>`;
    case "triangle": return `<polygon points="${cx},${cy - shh / 2} ${cx + sw / 2},${cy + shh / 2} ${cx - sw / 2},${cy + shh / 2}" ${a}/>`;
    case "arrow": return `<polygon points="${cx - sw / 2},${cy - shh * 0.18} ${cx + sw * 0.1},${cy - shh * 0.18} ${cx + sw * 0.1},${cy - shh / 2} ${cx + sw / 2},${cy} ${cx + sw * 0.1},${cy + shh / 2} ${cx + sw * 0.1},${cy + shh * 0.18} ${cx - sw / 2},${cy + shh * 0.18}" ${a}/>`;
    default: return `<rect x="${cx - sw / 2}" y="${cy - shh / 2}" width="${sw}" height="${shh}" ${a}/>`;
  }
}
/** A rough SVG colour matrix for a look (the real look is worked out on pixels by adjust.js). */
function lookFilter(t, fid) {
  const a = t.adjust || {}, f = t.filter?.[0];
  let sat = 1 + ((a.saturation || 0) + (a.vibrance || 0) * 0.6) / 100, br = 1 + ((a.exposure || 0) + (a.brightness || 0)) / 180, con = 1 + (a.contrast || 0) / 150, warm = (a.warmth || 0) / 400;
  let mono = false, sepia = false;
  if (f === "mono" || f === "noir") mono = true;
  if (f === "film") sepia = true;
  let green = 0, pink = 0;
  if (f === "lahore-gold" || f === "thar-dusk") warm += 0.08;
  if (f === "thar-dusk") br -= 0.08;
  if (f === "frost") warm -= 0.08;
  if (f === "vivid") sat += 0.35;
  if (f === "night") br -= 0.15;
  if (f === "soft") con -= 0.12;
  if (f === "karachi-sea") { warm -= 0.07; sat += 0.15; green += 0.02; }
  if (f === "monsoon") { warm -= 0.05; sat -= 0.25; br -= 0.06; }
  if (f === "hunza-morning") { warm -= 0.04; br += 0.08; con -= 0.05; }
  if (f === "chai") { warm += 0.1; sat -= 0.12; }
  if (f === "mehndi") { green += 0.07; sat += 0.1; }
  if (f === "rose-petal") { pink += 0.07; con -= 0.06; }
  if (f === "old-fort") { sepia = true; br -= 0.04; }
  if (f === "kite-day") { sat += 0.25; br += 0.05; }
  if (f === "noir") con += 0.3;
  if (mono) sat = 0;
  const parts = [`<feColorMatrix type="saturate" values="${Math.max(0, sat).toFixed(2)}"/>`];
  if (sepia) parts.push(`<feColorMatrix type="matrix" values=".45 .55 .14 0 0  .38 .5 .12 0 0  .3 .4 .1 0 0  0 0 0 1 0"/>`);
  const k = (v) => v.toFixed(3);
  parts.push(`<feComponentTransfer><feFuncR type="linear" slope="${k(br * con)}" intercept="${k(0.5 - 0.5 * con + warm + pink)}"/><feFuncG type="linear" slope="${k(br * con)}" intercept="${k(0.5 - 0.5 * con + green - pink * 0.5)}"/><feFuncB type="linear" slope="${k(br * con)}" intercept="${k(0.5 - 0.5 * con - warm + pink * 0.4)}"/></feComponentTransfer>`);
  if ((a.blur || 0) > 0) parts.push(`<feGaussianBlur stdDeviation="${(a.blur / 20).toFixed(1)}"/>`);
  const duo = t.duotone && DUO_COLORS[t.duotone];
  if (duo) {
    const A = hex3(duo[0]), B = hex3(duo[1]);
    parts.push(`<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues="${A[0]} ${B[0]}"/><feFuncG type="table" tableValues="${A[1]} ${B[1]}"/><feFuncB type="table" tableValues="${A[2]} ${B[2]}"/></feComponentTransfer>`);
  }
  if (t.invert) parts.push(`<feComponentTransfer><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer>`);
  return `<filter id="${fid}" color-interpolation-filters="sRGB">${parts.join("")}</filter>`;
}
const sceneBox = (name, p, x, y, w, h, filt = "", only = "all") => {
  const s = S[name] || S.lake;
  const body = only === "subject" ? s.subject(p) : only === "bg" ? s.bg(p) : s.bg(p) + s.subject(p);
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${s.w} ${s.h}" preserveAspectRatio="xMidYMid slice"><g${filt ? ` filter="url(#${filt})"` : ""}>${body}</g></svg>`;
};
const cache = new Map();
export function thumb(id) {
  if (cache.has(id)) return cache.get(id);
  const t = templateById(id);
  if (!t) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="#eef0f7"/></svg>';
  const p = clean(id) + "-", out = [];
  out.push(`<rect width="320" height="200" fill="#eceef6"/>`);
  if (t.kind === "look" || t.kind === "ai") {
    const ar = ASPECT[t.aspect] || 1.6, H = 184, W = Math.min(304, Math.round(H * ar)), w = ar >= 1.6 ? 304 : W, hh = ar >= 1.6 ? Math.round(304 / ar) : H;
    let x = (320 - w) / 2, y = (200 - hh) / 2;
    const fr = t.frame?.id;
    out.push(`<defs>${lookFilter(t, p + "f")}<clipPath id="${p}c"><circle cx="160" cy="100" r="88"/></clipPath></defs>`);
    const fc = t.frame?.color || "#ffffff";
    if (fr === "polaroid") { out.push(`<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${hh + 4}" fill="${fc}" rx="3"/>`); y += 6; x += 8; const iw = w - 16, ih = hh - 40; out.push(sceneBox(t.sample, p, x, y, iw, ih, p + "f")); }
    else if (fr === "circle") out.push(`<g clip-path="url(#${p}c)">${sceneBox(t.sample, p, 72, 12, 176, 176, p + "f")}</g><circle cx="160" cy="100" r="88" fill="none" stroke="${fc}" stroke-width="4"/>`);
    else {
      if (fr === "shadow") out.push(`<rect x="${x + 6}" y="${y + 8}" width="${w}" height="${hh}" rx="4" fill="#1b2133" opacity=".22"/>`);
      out.push(sceneBox(t.sample, p, x, y, w, hh, p + "f"));
      if (fr === "solid") out.push(`<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${hh - 6}" fill="none" stroke="${fc}" stroke-width="6"/>`);
      if (fr === "double") out.push(`<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${hh - 8}" fill="none" stroke="${fc}" stroke-width="3"/><rect x="${x + 11}" y="${y + 11}" width="${w - 22}" height="${hh - 22}" fill="none" stroke="${fc}" stroke-width="1.5"/>`);
      if (fr === "film") out.push(`<rect x="${x}" y="${y}" width="${w}" height="12" fill="${fc}"/><rect x="${x}" y="${y + hh - 12}" width="${w}" height="12" fill="${fc}"/>${Array.from({ length: Math.floor(w / 14) }, (_, i) => `<rect x="${x + 4 + i * 14}" y="${y + 3}" width="7" height="6" rx="1" fill="#fff"/><rect x="${x + 4 + i * 14}" y="${y + hh - 9}" width="7" height="6" rx="1" fill="#fff"/>`).join("")}`);
      for (const sh of t.shapes || []) out.push(shapeSvg(sh, x, y, w, hh));
    }
    for (const tx of t.texts || []) {
      const ty = fr === "polaroid" ? y + hh - 22 : y + tx.y * hh, fs = Math.max(7, Math.min(22, tx.size * hh * (fr === "polaroid" ? 1.6 : 1.4), (w * (tx.bg ? 0.66 : 0.84)) / (tx.text.length * (tx.bold === false ? 0.58 : 0.74))));
      const fam = tx.family === "serif" ? "Georgia, serif" : tx.family === "hand" ? "'Comic Sans MS', cursive" : "system-ui, sans-serif";
      if (tx.bg) { const bw = Math.min(w * 0.9, tx.text.length * fs * (tx.bold === false ? 0.56 : 0.66) + fs), cxb = tx.x == null ? 160 : x + tx.x * w; out.push(`<rect x="${cxb - bw / 2}" y="${ty - fs * 0.85}" width="${bw}" height="${fs * 1.3}" rx="3" fill="${tx.bg}"/>`); }
      const tx0 = fr === "polaroid" || tx.x == null ? 160 : x + tx.x * w;
      out.push(`<text x="${tx0}" y="${ty}" text-anchor="middle" font-family="${fam}" font-size="${fs.toFixed(1)}" font-weight="${tx.bold === false ? 500 : 800}"${tx.italic ? ' font-style="italic"' : ""} fill="${tx.color}"${tx.outline ? ` stroke="${tx.outline}" stroke-width="1.6" paint-order="stroke"` : tx.shadow ? ' stroke="rgba(0,0,0,.55)" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round"' : ""}>${esc(tx.text)}</text>`);
    }
    if (t.aspect === "passport") out.push(`<g fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 3"><ellipse cx="160" cy="88" rx="38" ry="50"/></g><text x="160" y="194" text-anchor="middle" font-family="system-ui" font-size="9" fill="#1b2133">35 × 45 mm</text>`);
    if (t.kind === "ai") out.push(`<g transform="translate(14 150)"><rect width="${Math.min(292, 40 + Math.min(40, t.prompt.length) * 6.3)}" height="34" rx="17" fill="#fff" opacity=".95"/><path d="M17 9l2.4 5.6L25 17l-5.6 2.4L17 25l-2.4-5.6L9 17l5.6-2.4z" fill="#8b5cf6"/><text x="32" y="21.5" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#1b2133">${esc(t.prompt.length > 40 ? t.prompt.slice(0, 38) + "…" : t.prompt)}</text></g>`);
  } else if (t.kind === "bg") {
    const s = S[t.sample], ar = s.w / s.h, round = t.frame?.id === "circle";
    const H = round ? 176 : 184, W = round ? 176 : Math.round(H * ar), x = (320 - W) / 2, y = (200 - H) / 2;
    let back = "";
    if (t.bg.mode === "transparent") back = `<defs><pattern id="${p}ck" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#fff"/><rect width="8" height="8" fill="#dfe2ec"/><rect x="8" y="8" width="8" height="8" fill="#dfe2ec"/></pattern></defs><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#${p}ck)"/>`;
    else if (t.bg.mode === "color") back = `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${t.bg.color}"/>`;
    else if (t.bg.mode === "blur") back = `<defs><filter id="${p}bl"><feGaussianBlur stdDeviation="6"/></filter></defs><g filter="url(#${p}bl)">${sceneBox(t.sample, p + "b", x, y, W, H, "", "bg")}</g>`;
    else back = `<svg x="${x}" y="${y}" width="${W}" height="${H}" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">${backdropBody(t.bg.backdrop, p + "bd")}</svg>`;
    let subj = sceneBox(t.sample, p, x, y, W, H, "", "subject");
    if (t.bg.shadow || t.bg.outline) {
      // silhouettes of the subject (colour matrices only, so every SVG renderer draws them): shadow, then outline copies
      const rgb = (hx) => hex3(hx).map(Number);
      const tint = (fid, hx) => { const [r, g, b] = rgb(hx); return `<filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0"/></filter>`; };
      const parts = [], defs = [];
      if (t.bg.shadow) {
        const a = ((t.bg.shadow.angle ?? 60) * Math.PI) / 180, d = (t.bg.shadow.dist ?? 12) / 3;
        defs.push(tint(p + "sh", "#000000"));
        parts.push(`<g opacity="${(t.bg.shadow.alpha ?? 40) / 100}" transform="translate(${(Math.cos(a) * d).toFixed(1)} ${(Math.sin(a) * d).toFixed(1)})" filter="url(#${p}sh)">${subj}</g>`);
      }
      if (t.bg.outline) {
        const r = Math.max(1.5, (t.bg.outline.width || 8) / 3.5);
        defs.push(tint(p + "ol", t.bg.outline.color || "#ffffff"));
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; parts.push(`<g transform="translate(${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)})" filter="url(#${p}ol)">${subj}</g>`); }
      }
      subj = `<defs>${defs.join("")}</defs>${parts.join("")}${subj}`;
    }
    if (round) out.push(`<defs><clipPath id="${p}rc"><circle cx="160" cy="100" r="88"/></clipPath></defs><g clip-path="url(#${p}rc)">${back}${subj}</g><circle cx="160" cy="100" r="88" fill="none" stroke="#fff" stroke-width="4"/>`);
    else out.push(back, subj);
    out.push(`<g transform="translate(${x + W - 74} ${y + 8})"><rect width="66" height="22" rx="11" fill="#1b2133" opacity=".8"/><text x="33" y="15" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#fff">${t.bg.mode === "transparent" ? "PNG" : t.bg.mode === "blur" ? "Blur" : t.bg.mode === "color" ? "Colour" : "Picture"}</text></g>`);
  } else {
    // enhancer: blurry "before" on the left, crisp "after" on the right, with the upscale badge
    const e = t.enhance;
    out.push(`<defs><filter id="${p}bf"><feGaussianBlur stdDeviation="${e.denoise > 50 ? 1.2 : 2.4}"/><feColorMatrix type="saturate" values=".7"/></filter><filter id="${p}af" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.12" intercept="-.04"/><feFuncG type="linear" slope="1.12" intercept="-.04"/><feFuncB type="linear" slope="1.12" intercept="-.04"/></feComponentTransfer></filter><clipPath id="${p}l"><rect x="8" y="8" width="152" height="184"/></clipPath><clipPath id="${p}r"><rect x="160" y="8" width="152" height="184"/></clipPath></defs>`);
    out.push(`<g clip-path="url(#${p}l)">${sceneBox(t.sample, p + "a", 8, 8, 304, 184, p + "bf")}</g><g clip-path="url(#${p}r)">${sceneBox(t.sample, p + "z", 8, 8, 304, 184, p + "af")}</g>`);
    out.push(`<rect x="158.5" y="8" width="3" height="184" fill="#fff"/><circle cx="160" cy="100" r="12" fill="#fff"/><path d="M155 100l-3-3v6zM165 100l3-3v6z" fill="#1b2133"/>`);
    out.push(`<g font-family="system-ui, sans-serif" font-size="10" font-weight="700"><rect x="16" y="16" width="48" height="18" rx="9" fill="#1b2133" opacity=".7"/><text x="40" y="28.5" text-anchor="middle" fill="#fff">Before</text><rect x="256" y="16" width="44" height="18" rx="9" fill="#5b4cf0"/><text x="278" y="28.5" text-anchor="middle" fill="#fff">After</text>
<rect x="250" y="164" width="52" height="22" rx="11" fill="#fff"/><text x="276" y="179" text-anchor="middle" fill="#5b4cf0" font-size="11">${e.scale === 1 ? "Crisp" : e.scale + "×"}</text></g>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="${esc(t.name)} template">${out.join("")}</svg>`;
  cache.set(id, svg);
  return svg;
}
