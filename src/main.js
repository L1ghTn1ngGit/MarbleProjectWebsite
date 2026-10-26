import "./style.css";
import "./refinement.css";

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
