import { setupLangMenu, translateDom } from "../i18n/index.js";


const RESUME_KEY = "marble-resume";
let whereAmI = () => null;
export function setResumeKey(fn) {
  whereAmI = fn;
}
export function takeResume() {
  try {
    const key = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return key;
  } catch {
    return null;
  }
}


function markSwitch() {
  try {
    sessionStorage.setItem("marble-switch", "1");
    const key = whereAmI();
    if (key) sessionStorage.setItem(RESUME_KEY, key);
  } catch {}
}
document.addEventListener("click", (event) => {
  const link = event.target.closest?.('a[href^="/?view=journalist"], a[href="/"], a[href="/presentation.html"]');
  if (link && !event.defaultPrevented) markSwitch();
});

export function setupModeSwitch(current) {
  const group = document.querySelector(".mode-switch");
  if (!group) return;
  group.dataset.current = current;
  for (const button of group.querySelectorAll("[data-mode]")) {
    const active = button.dataset.mode === current;
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => {
      if (button.dataset.mode === current) return;
      markSwitch();
      location.assign(
        button.dataset.mode === "presentation" ? "/presentation.html" : "/?view=journalist",
      );
    });
  }

  addEventListener("pageshow", () => {
    group.dataset.current = current;
  });
}

export function setupSiteChrome(current) {
  translateDom();
  setupModeSwitch(current);
  setupLangMenu();
}
