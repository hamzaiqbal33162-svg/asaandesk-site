import{o as e}from"./rolldown-runtime-C5USp2td.js";import{i as t,r as n}from"./framework-DGW0pQoC.js";import{t as r}from"./index-DEMGFNcD.js";import{n as i,r as a,t as o}from"./handoff-BwDTZgOB.js";var s=e(t(),1),c=(e=>e.replace(/\/\*[\s\S]*?\*\//g,``).replace(/\s+/g,` `).replace(/\s*([{};,>])\s*/g,`$1`).trim())(`.site.site.home-orbit{--accent:#3b6e12;--accent-dark:#2c5409;--accent-2:#4e8a1a;--accent-3:#8db86a;--soft:#eef5e4;--ink:#1f2a17;--muted:#56644a;
  --line:#d5ddcb;--paper:#f4f9ee;--accent-rgb:78,138,26;--grad:linear-gradient(#3b6e12,#3b6e12);
  --sh-sm:0 1px 2px rgba(31,42,23,.06),0 2px 6px rgba(31,42,23,.05);--sh-md:0 1px 3px rgba(31,42,23,.07),0 6px 16px rgba(31,42,23,.07);--sh-glow:0 1px 3px rgba(31,42,23,.14);
  --cur:#4e8a1a;--o-band:#eef5e4;--o-card:#fff;--o-line:#d5ddcb;--o-fg:#1f2a17;--o-muted:#56644a;--o-green:#4e8a1a;--o-text-green:#3b6e12;
  overflow-x:clip;background:#f4f9ee;color:var(--ink)}

/* ---------- top bars ---------- */
.home-orbit .site-head{background:rgba(244,249,238,.97);border-bottom-color:var(--o-line)}
.home-orbit .site-head .brand{color:var(--o-fg)}
.home-orbit .site-head .brand b{color:var(--o-text-green)}
@media(min-width:1080px){
  .home-orbit .site-head>.site-nav{border-top-color:var(--o-line)}
  .home-orbit .nav-trigger,.home-orbit .nav-list>li>a{position:relative;color:var(--o-fg)}
  .home-orbit .nav-trigger:hover,.home-orbit .nav-list>li>a:hover{background:var(--soft);color:var(--accent-dark)}
}
@media(max-width:1079px){.home-orbit .site-head{background:#f4f9ee}}

/* ---------- the band: hero + ring ---------- */
.home-orbit main#content{padding-top:0!important;margin-top:0!important}
/* the band paints at once: the site's 0.55 s fade-in of each home section (theme.css main#content>*) on a large area
   was most of the screen changing after the first paint (Lighthouse desktop Speed Index +30 ms in runs 6-9) */
.home-orbit main#content>.orbit-band{animation:none}
.home-orbit .orbit-band{position:relative;margin:0 calc(50% - 50vw) 34px;padding:clamp(26px,4vw,46px) calc(50vw - 50%) 30px;
  background:var(--o-band);border-bottom:1px solid var(--o-line);color:var(--o-fg)}
.home-orbit .orbit-band .welcome{position:relative}
.home-orbit .orbit-band .welcome h1{color:var(--o-fg)}
.home-orbit .orbit-band .welcome h1 em{background:none;-webkit-text-fill-color:currentColor;color:var(--o-text-green)}
.home-orbit .orbit-band .welcome p,.home-orbit .orbit-band .hero-actions>span,.home-orbit .orbit-band .quick-links,.home-orbit .orbit-band .quick-links a{color:var(--o-muted)}
/* the hero card: flat, no gradients; the result tile in the soft green */
.home-orbit .orbit-band .hero-board{background:#fff}
.home-orbit .orbit-band .file-demo>div:first-child{background:#fff4e6}
.home-orbit .orbit-band .file-demo>div:last-child{background:var(--soft);border-color:#cde5ae}

/* drop box: hands files to the file drop further down; a plain dashed green border */
.home-orbit .orbit-drop{display:block;width:100%;max-width:520px;margin:22px 0 0;padding:14px 17px;border:2px dashed #8db86a;border-radius:14px;
  background:var(--o-card);box-shadow:var(--sh-sm);color:var(--o-fg);font:inherit;font-size:15px;font-weight:600;text-align:left;cursor:pointer}
.home-orbit .orbit-drop small{display:block;margin-top:3px;font-size:13px;font-weight:400;color:var(--o-muted)}
.home-orbit .orbit-arrow{display:inline-block;margin-right:8px;color:var(--o-text-green)}
.home-orbit .orbit-count{margin:12px 0 0!important;font-size:13px;line-height:1.5;font-weight:500;letter-spacing:.02em;color:var(--o-muted)!important}
.home-orbit .orbit-count b{display:inline-block;text-align:right;color:var(--o-text-green);font-weight:700;font-variant-numeric:tabular-nums}

/* ---------- ring stage (the panels come with RING_CSS) ---------- */
.home-orbit .orbit{position:relative;margin-top:18px}
.home-orbit .orbit-stage{position:relative;height:430px;perspective:1600px;overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none;border-radius:16px}
.home-orbit .orbit-stage:focus-visible{outline:2px solid var(--o-green);outline-offset:-2px}
.home-orbit .orbit-controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin-top:6px}
.home-orbit .orbit-dots{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.home-orbit .orbit-controls button{min-height:34px;padding:7px 14px;border:1px solid var(--o-line);border-radius:999px;background:var(--o-card);color:var(--o-fg);
  font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.home-orbit .orbit-dots button[aria-current=true]{background:var(--o-text-green);border-color:var(--o-text-green);color:#fff}
.home-orbit .orbit-controls .orbit-toggle{background:#cde5ae;border-color:#8db86a;color:var(--o-fg)}
.home-orbit .orbit-hint{margin:10px 0 0!important;text-align:center;font-size:12.5px;color:var(--o-muted)!important}
@media(max-width:560px){.home-orbit .orbit-stage{height:400px}}`),l=[{key:`pdf`,title:`PDF tools`},{key:`image`,title:`Image`},{key:`media`,title:`Audio & Video`},{key:`text`,title:`Text & Data`},{key:`calc`,title:`Calculators`},{key:`design`,title:`Design`},{key:`ai`,title:`AI & Privacy`}],u=n();function d({tools:e,calcs:t}){return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsxs)(`button`,{type:`button`,className:`orbit-drop`,children:[(0,u.jsx)(`span`,{className:`orbit-arrow`,"aria-hidden":`true`,children:`⬆`}),`Drop any file here`,(0,u.jsx)(`small`,{children:`PDF, Word, JPG, PNG, WebP, MP4, MP3…`})]}),(0,u.jsx)(`p`,{className:`orbit-count`,children:[[e,`tools`],[t,`calculators`],[l.length,`categories`]].map(([e,t],n)=>(0,u.jsxs)(`span`,{children:[n>0&&` · `,(0,u.jsx)(`b`,{"data-to":e,style:{minWidth:String(e).length+`ch`},children:e}),` `,t]},t))})]})}function f(){return(0,u.jsxs)(`div`,{className:`orbit`,children:[(0,u.jsxs)(`div`,{className:`orbit-stage`,id:`orbit-stage`,role:`region`,"aria-roledescription":`carousel`,"aria-label":`Tool categories`,tabIndex:0,children:[(0,u.jsx)(`div`,{className:`orbit-floor`,"aria-hidden":`true`}),(0,u.jsx)(`div`,{className:`orbit-ring`,id:`orbit-ring`})]}),(0,u.jsxs)(`div`,{className:`orbit-controls`,children:[(0,u.jsx)(`button`,{type:`button`,className:`orbit-toggle`,"aria-pressed":`false`,children:`Stop`}),(0,u.jsx)(`div`,{className:`orbit-dots`,role:`group`,"aria-label":`Go to a category`,children:l.map((e,t)=>(0,u.jsx)(`button`,{type:`button`,"data-i":t,"data-key":e.key,"aria-current":t===0?`true`:`false`,children:e.title},e.key))})]}),(0,u.jsx)(`p`,{className:`orbit-hint`,children:`Drag the ring or use the arrow keys (← →) to turn it.`})]})}var p=e=>e<1048576?(e/1024).toFixed(1)+` KB`:(e/1048576).toFixed(1)+` MB`;function m(e,t,n){(0,s.useEffect)(()=>{if(!e)return;let i=[],a=(e,t,n)=>{e&&(e.addEventListener(t,n),i.push(()=>e.removeEventListener(t,n)))},o=document.querySelector(`.orbit-drop`);a(o,`click`,()=>n()),a(o,`dragover`,e=>{e.preventDefault(),o.classList.add(`over`)}),a(o,`dragleave`,()=>o.classList.remove(`over`)),a(o,`drop`,e=>{e.preventDefault(),o.classList.remove(`over`);let n=Array.from(e.dataTransfer?.files||[]);n.length&&t(n)});let s=null,c=!1,l=!1,u=null,d=0,f=0,p=!1,m=()=>{s||c||(c=!0,r(()=>import(`./orbit-live-BToi9Rze.js`).then(e=>{p||(s=e.startOrbit({stopped:l,goTo:u}),s&&i.push(s.stop))}),[]).catch(()=>{c=!1}))},h=document.querySelector(`.orbit`);h?.querySelectorAll(`.orbit-dots button`).forEach(e=>a(e,`click`,()=>{let t=Number(e.dataset.i);s?s.goTo(t):(u=t,m())})),a(h?.querySelector(`.orbit-toggle`),`click`,()=>{s?s.toggle():(l=!0,m())});let g=document.getElementById(`orbit-stage`);a(g,`pointerdown`,()=>m()),a(g,`keydown`,e=>{!s&&(e.key===`ArrowLeft`||e.key===`ArrowRight`)&&(u=e.key===`ArrowRight`?1:(h?.querySelectorAll(`.orbit-dots button`).length||1)-1,m())});let _=()=>{d=window.setTimeout(()=>{typeof requestIdleCallback==`function`?f=requestIdleCallback(m,{timeout:2e3}):m()},2500)};return document.readyState===`complete`?_():window.addEventListener(`load`,_,{once:!0}),()=>{p=!0,clearTimeout(d),f&&cancelIdleCallback(f),window.removeEventListener(`load`,_),i.forEach(e=>e())}},[e,t,n])}function h({items:e,orbit:t=!1}){let[n,r]=(0,s.useState)([]),[l,d]=(0,s.useState)(!1),f=(0,s.useRef)(null),h=(0,s.useRef)(null),g=n[0];m(t,(0,s.useCallback)(e=>{r(e),h.current?.scrollIntoView({behavior:`smooth`,block:`center`})},[]),(0,s.useCallback)(()=>f.current?.click(),[]));let _=g?e.filter(e=>o(e.accept,g)):[];async function v(e){e.embed||await a(e.multiple?n:n.slice(0,1)),window.location.assign(`/tools/`+e.slug)}return(0,u.jsxs)(`section`,{ref:h,className:`smart-drop`+(l?` dragging`:``),"aria-label":`Find a tool for your file`,onDragOver:e=>{e.preventDefault(),d(!0)},onDragLeave:()=>d(!1),onDrop:e=>{e.preventDefault(),d(!1),r(Array.from(e.dataTransfer.files))},children:[t&&(0,u.jsx)(`style`,{href:`home-orbit`,precedence:`high`,children:c}),(0,u.jsxs)(`div`,{className:`smart-drop-main`,children:[(0,u.jsx)(`span`,{className:`smart-drop-icon`,"aria-hidden":`true`,children:`↥`}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`h2`,{children:`Drop any file here`}),(0,u.jsx)(`p`,{children:`We will show what you can do with it. PDF, Word, JPG, PNG, WebP, MP4 and MP3 all work.`})]}),(0,u.jsxs)(`button`,{type:`button`,className:`primary`,onClick:()=>f.current?.click(),children:[`Choose file `,(0,u.jsx)(`span`,{"aria-hidden":`true`,children:`→`})]}),(0,u.jsx)(`input`,{ref:f,type:`file`,multiple:!0,hidden:!0,onChange:e=>{r(Array.from(e.target.files||[])),e.target.value=``}})]}),g&&(0,u.jsxs)(`div`,{className:`smart-drop-result`,role:`status`,children:[(0,u.jsxs)(`p`,{children:[(0,u.jsx)(`b`,{children:n.length>1?n.length+` files`:g.name}),` · `,p(n.reduce((e,t)=>e+t.size,0))]}),_.length?(0,u.jsxs)(u.Fragment,{children:[(0,u.jsx)(`p`,{className:`smart-drop-label`,children:`Tools for this file. Click one and your file will already be loaded:`}),(0,u.jsx)(`div`,{className:`smart-drop-tools`,children:_.map(e=>(0,u.jsxs)(`button`,{type:`button`,className:`tool-chip `+e.kind,onClick:()=>v(e),children:[e.name,(0,u.jsx)(`span`,{"aria-hidden":`true`,children:`↗`})]},e.slug))})]}):(0,u.jsxs)(`p`,{className:`smart-drop-label`,children:[`No tool for .`,i(g.name)||`file`,` files yet. Try a PDF, image, MP4 or MP3 file.`]})]})]})}export{d as HeroDrop,f as OrbitStage,h as default};