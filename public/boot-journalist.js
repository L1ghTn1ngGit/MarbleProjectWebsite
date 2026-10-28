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
  // a first visit gets the full loader; arriving from the other mode gets a light veil
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("is-loading");
    if (sessionStorage.getItem("marble-switch"))
      document.documentElement.classList.add("is-switching");
  }
  sessionStorage.removeItem("marble-switch");
} catch (e) {}
// cross-page view transitions: when the browser skips one, its promises reject with
// nobody listening and land in the console as uncaught errors
for (const type of ["pageswap", "pagereveal"]) {
  addEventListener(type, function (event) {
    var transition = event.viewTransition;
    if (!transition) return;
    transition.ready.catch(function () {});
    transition.finished.catch(function () {});
    transition.updateCallbackDone.catch(function () {});
  });
}
// a language switch reloads the same url; chrome tends to abort that transition
// with an error nothing can catch, so skip it up front
addEventListener("pageswap", function (event) {
  var entry = event.activation && event.activation.entry;
  if (event.viewTransition && entry && entry.url === location.href) event.viewTransition.skipTransition();
});
