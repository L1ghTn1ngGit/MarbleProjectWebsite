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
