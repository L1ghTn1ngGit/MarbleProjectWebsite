
import "./style.css";
import "./refinement.css";
import "./reading-mode.css";
import "./site-chrome.css";



import { setupReadingMode } from "./modules/reading-mode.js";

import { setupTableControls, setupSorting } from "./modules/table.js";
import { loadData } from "./modules/data.js";
import {
  setupNavToggle,
  setupNavLinks,
  updateActiveNav,
} from "./modules/nav.js";
import {
  setupBudgetSlideshow,
  setupVideoControls,
} from "./modules/slideshow.js";

document.addEventListener("DOMContentLoaded", () => {

  setupReadingMode();
  setupNavToggle();
  setupNavLinks();
  setupTableControls();
  setupSorting();
  setupBudgetSlideshow();
  setupVideoControls();
  window.addEventListener("scroll", updateActiveNav);
  updateActiveNav();
  loadData();
});






