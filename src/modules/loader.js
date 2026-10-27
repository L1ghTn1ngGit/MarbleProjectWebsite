// loadin screen, counts up kinda choppy on purpose so it dosent look fake
import { t } from "../i18n/index.js";

const root = document.documentElement;

const SOURCE_TEXT = {
  api: "Contacting Checkbook NYC",
  snapshot: "Opening the saved Checkbook NYC snapshot",
  csv: "Opening the saved budget dataset",
};

export function createLoader() {
  const loader = document.querySelector(".loader");
  const count = loader?.querySelector("[data-loader-count]");
  let active = root.classList.contains("is-loading") && !!loader;
  if (!active) {
    loader?.remove();
    return { progress() {}, stage() {}, step() {}, assets() {}, done() {}, fail() {} };
  }


  const start = performance.now();
  const duration = 1000 + Math.random() * 500;
  let target = 0;
  let shown = 0;
  let timer = 0;
  let closing = false;

  function tick() {
    timer = 0;
    const clock = Math.min(1, (performance.now() - start) / (duration - 300));
    // the counter never runs ahead of what has actually loaded
    const goal = Math.min(clock, target);
    const gap = goal - shown;
    // big jumps in real progress are closed quickly, so a fast load is not held back
    if (gap > 0) shown = Math.min(goal, shown + Math.max(gap * 0.6, Math.min(gap, 0.05 + Math.random() * 0.14)));
    count.textContent = String(Math.round(shown * 100));
    loader.style.setProperty("--load", shown.toFixed(3));
    for (const [at, name] of [[0.4, "fetch"], [0.72, "parse"], [0.96, "build"]])
      if (shown >= at) loader.querySelector(`[data-step="${name}"]`)?.classList.add("is-done");
    if (shown >= 1) return complete();
    timer = setTimeout(tick, 45 + Math.random() * 70);
  }
  function set(value) {
    target = Math.max(target, Math.min(1, value));
  }
  function complete() {
    if (closing) return;
    closing = true;
    loader.classList.add("is-complete");
    setTimeout(hide, 300);
  }
  function hide() {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    try {
      sessionStorage.setItem("marble-loaded", "1");
    } catch {}
    root.classList.add("is-loaded-in");
    root.classList.remove("is-loading");
    setTimeout(() => loader.remove(), 600);
    const logo = loader.querySelector("img");
    document.dispatchEvent(new CustomEvent("marble:loader-hidden", { detail: { logo, from: logo?.getBoundingClientRect() } }));
  }
  timer = setTimeout(tick, 60);
  // a slow load gets a way out to the lighter journalist page
  const slow = loader.querySelector(".loader__slow");
  // counted from when the page started loading, not from when this script arrived
  if (slow) setTimeout(() => {
    if (!active || closing) return;
    loader.classList.add("is-slow");
    slow.removeAttribute("tabindex");
  }, Math.max(0, 5000 - performance.now()));
  const item = (name) => loader.querySelector(`[data-step="${name}"]`);

  return {
    
    progress(value) {
      set(value * 0.6);
    },
    
    stage(source, previous) {
      const line = item("fetch");
      if (line) line.textContent = t(SOURCE_TEXT[source] || SOURCE_TEXT.csv);
      if (previous) set(0.04);
    },
    step(name) {
      item(name)?.classList.add("is-done");
      if (name === "fetch") set(0.6);
      if (name === "parse") set(0.72);
    },
    // marble, pillar, fonts and opening images, as a share of the rest
    assets(share) {
      set(0.72 + Math.min(1, share) * 0.26);
    },
    done() {
      item("build")?.classList.add("is-done");
      set(1);
    },
    fail() {
      hide();
    },
  };
}
