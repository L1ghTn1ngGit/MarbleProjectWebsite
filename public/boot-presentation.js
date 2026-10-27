// runs before first paint (kept out of the html so the CSP needs no inline scripts)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
try {
  localStorage.setItem("marble-visited", "1");
  if (localStorage.getItem("marble-motion") === "on") still = false;
  if (!sessionStorage.getItem("marble-switch") && !still)
    document.documentElement.classList.add("is-loading");
  sessionStorage.removeItem("marble-switch");
} catch {}
if (still) document.documentElement.classList.add("motion-off");
