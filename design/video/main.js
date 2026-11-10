// Entry point: /design/video/ (editor), ?preset=youtube (YouTube editor), ?mode=trim (trimmer), ?mode=convert (MP4 converter).
// Each mode is a separate module so the page only loads what it needs.
const params = new URLSearchParams(location.search);
const mode = params.get("mode");
const root = document.getElementById("app"), bar = document.querySelector(".ad-bar");
const start = mode === "trim" ? import("./trim.js").then((m) => m.startTrim(root, bar, params))
  : mode === "convert" ? import("./convert.js").then((m) => m.startConvert(root, bar, params))
  : import("./editor.js").then((m) => m.startEditor(root, bar, params));
start.catch((e) => {
  console.error(e);
  root.innerHTML = '<div class="mx-main"><p class="mx-msg err"></p></div>';
  root.querySelector("p").textContent = "This page couldn't start in this browser: " + (e?.message || e) + ". Try the latest Chrome, Edge, Firefox or Safari.";
});
