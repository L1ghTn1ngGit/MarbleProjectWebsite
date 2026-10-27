import { setResumeKey, setupSiteChrome, takeResume } from "./site-chrome.js";
import { translateDom } from "../i18n/index.js";

export function setupReadingMode() {
  document.body.dataset.readingMode = "journalist";
  setupSiteChrome("journalist");
  setupResume();

  document.addEventListener("marble:data-ready", () =>
    requestAnimationFrame(() => translateDom()),
  );
}


const TO_SCENE = { "top-stage": "highlights", hero: "roll", overview: "roll", spending: "years", offenders: "over", "data-table": "records", insights: "insights" };
const TO_SECTION = { highlights: "top-stage", roll: "overview", years: "spending", depts: "spending", over: "offenders", records: "data-table", insights: "insights", about: "insights", end: "insights" };

function setupResume() {
  setResumeKey(() => {
    if (scrollY < innerHeight * 0.5) return null;
    let key = null;
    for (const [id, scene] of Object.entries(TO_SCENE)) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= innerHeight * 0.35) key = scene;
    }
    return key;
  });
  const key = takeResume();
  const id = key && TO_SECTION[key];
  if (!id) return;
  const go = () => {
    const el = document.getElementById(id);
    if (!el) return;
    const nav = document.querySelector(".main-nav")?.offsetHeight || 70;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - nav - 8, behavior: "instant" });
  };

  document.addEventListener("marble:data-ready", () => requestAnimationFrame(go), { once: true });
}
