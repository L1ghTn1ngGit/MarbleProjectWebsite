import { t } from "../i18n/index.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function setupTour({ isStill, getLenis, getScene, measure, deck, rewindMotion }) {
  const button = document.getElementById("tour");
  const label = button.querySelector(".chip__label");
  const icon = button.querySelector(".chip__icon");
  let run = 0;
  let pending = null;

  const setProgress = (value) => button.style.setProperty("--tour", value.toFixed(3));

  const glide = (top, duration, easing) =>
    new Promise((resolve) => {
      pending = resolve;
      const lenis = getLenis();
      if (!lenis) {
        window.scrollTo({ top, behavior: "auto" });
        resolve();
        return;
      }
      lenis.scrollTo(top, { duration, easing, force: true, onComplete: resolve });
    });
  // starting the tour away from the top plays the same rewind as the logo does
  const home = () =>
    new Promise((resolve) => {
      pending = resolve;
      if (scrollY < 2 || !rewindMotion) {
        resolve();
        return;
      }
      rewindMotion().then(resolve);
    });
  // through the overruns the cards ease in, then slow down steadily as they pass, so the
  // roll into the data follows on without a stop
  const passBy = (t) => Math.min(1, t * 3) * (1 - Math.pow(1 - t, 2));
  // the roll after them starts from rest too, so slowing down and rolling on read as one move
  const fromRest = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  async function start() {
    const id = ++run;
    button.setAttribute("aria-pressed", "true");
    label.textContent = t("Stop");
    icon.textContent = "■";
    measure();
    const alive = () => id === run;
    const top = (selector) => document.querySelector(selector)?.getBoundingClientRect().top + scrollY;
    const still = isStill();
    const steps = ["#highlights", "roll", "years", "depts", "over", "records", "insights", "about", "end"];
    const SLIDE_MS = 1300;
    for (const [n, target] of steps.entries()) {
      if (!alive()) return;
      setProgress(n / steps.length);
      if (target.startsWith("#")) {

        await home();
        const box = document.querySelector(target);
        for (let i = 0; deck && i < deck.count && alive(); i++) {
          deck.show(i);
          setProgress((n + i / deck.count) / steps.length);
          await wait(SLIDE_MS);
          if (alive() && box?.matches(":hover")) await wait(SLIDE_MS);
        }
        continue;
      }
      const scene = getScene(target);
      if (!scene) continue;

      const over = target === "over";
      // the overrun cards stop where the last two sit by the pillar; the next roll goes over them
      const stopAt = still ? scene.top : scene.top + scene.length * (over ? 0.93 : 0.62);
      const easing = still ? undefined : over ? passBy : steps[n - 1] === "over" ? fromRest : undefined;
      await glide(stopAt, over ? 4.4 : 2.4, easing);
      if (!alive()) return;
      setProgress((n + 1) / steps.length);
      await wait(still ? 3500 : over ? 0 : 1900);
    }
    if (alive()) stop();
  }

  function stop() {
    run++;
    pending?.();
    pending = null;
    getLenis()?.stop();
    getLenis()?.start();
    button.setAttribute("aria-pressed", "false");
    setProgress(0);
    label.textContent = t("Tour");
    icon.textContent = "▶";
  }

  button.addEventListener("click", () => (button.getAttribute("aria-pressed") === "true" ? stop() : start()));
  for (const type of ["wheel", "touchstart", "keydown"]) {
    window.addEventListener(type, (event) => {
      if (button.getAttribute("aria-pressed") !== "true") return;
      if (type === "keydown" && event.target.closest?.("#tour")) return;
      stop();
    }, { passive: true });
  }
  return { stop };
}
