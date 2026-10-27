import { t } from "../i18n/index.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function setupTour({ isStill, getLenis, getScene, measure, deck }) {
  const button = document.getElementById("tour");
  const label = button.querySelector(".chip__label");
  const icon = button.querySelector(".chip__icon");
  let run = 0;
  let pending = null;

  const setProgress = (value) => button.style.setProperty("--tour", value.toFixed(3));

  const glide = (top, duration, linear = false) =>
    new Promise((resolve) => {
      pending = resolve;
      const lenis = getLenis();
      if (!lenis) {
        window.scrollTo({ top, behavior: "auto" });
        resolve();
        return;
      }
      lenis.scrollTo(top, { duration, easing: linear ? (t) => t : undefined, force: true, onComplete: resolve });
    });

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

        await glide(0, 1);
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

      const stopAt = still ? scene.top : scene.top + scene.length * (target === "over" ? 1 : 0.62);
      await glide(stopAt, target === "over" ? 3.6 : 2.4);
      if (!alive()) return;
      setProgress((n + 1) / steps.length);
      await wait(still ? 3500 : 1900);
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
