// Sample photos (our own SVG drawings, used by the editor's "Sample photos" chips and as a fallback when a template's
// library photo cannot load) and the backdrop pictures the background tools put behind a cut-out. Pure module, no DOM.
import { popBody, popBox } from "./tpl-draw.js";

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

export const SAMPLES = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, { w: v.w, h: v.h, name: v.name }]));
const clean = (s) => String(s).replace(/~/g, "-").replace(/[^a-z0-9-]/gi, "");
/** Full SVG of a sample photo (the editor turns it into pixels). */
export function sceneSvg(name, prefix = "s") {
  const s = S[name] || S.lake, p = clean(prefix) + "-";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">${s.bg(p)}${s.subject(p)}</svg>`;
}
const backdropBody = (spec, p) => (BACKDROP[spec?.kind] || BACKDROP.studio)(p, { c1: "#f3f4fb", c2: "#5b4cf0", c3: "#1b2133", ...spec });
/** SVG of a backdrop picture at w×h (cover). spec = { kind, c1, c2, c3 } or a kind name; kind "pop" is drawn at the
 * picture's own aspect (vivid gradient, pattern, a shape behind the subject), the older kinds in an 800 × 800 box. */
export function backdropSvg(spec, w = 800, h = 800, prefix = "b") {
  const s = typeof spec === "string" ? { kind: spec } : spec;
  if (s?.kind === "pop") { const [VW, VH] = popBox(w, h); return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none">${popBody(s, VW, VH, clean(prefix) + "-")}</svg>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">${backdropBody(s, clean(prefix) + "-")}</svg>`;
}
/** Backdrop body for an inline thumbnail (legacy kinds: 800 × 800 box). */
export const backdropInner = (spec, p) => backdropBody(spec, p);
