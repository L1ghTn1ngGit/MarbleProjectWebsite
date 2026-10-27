// runs before first paint (kept out of the html so the CSP needs no inline scripts)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
// A first visit opens Presentation view; after that "/" is Journalist
// view. Links that ask for this view (?view=journalist) always stay.
try {
  var params = new URLSearchParams(location.search);
  if (
    !localStorage.getItem("marble-visited") &&
    params.get("view") !== "journalist"
  ) {
    localStorage.setItem("marble-visited", "1");
    location.replace("/presentation.html" + location.search + location.hash);
  } else localStorage.setItem("marble-visited", "1");
  if (
    !sessionStorage.getItem("marble-switch") &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    document.documentElement.classList.add("is-loading");
  sessionStorage.removeItem("marble-switch");
} catch (e) {}
