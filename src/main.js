import './style.css';

import { loadData } from './modules/data.js';
import { setupNavToggle, setupNavLinks, updateActiveNav } from './modules/nav.js';
import { setupBudgetSlideshow, setupVideoControls } from './modules/slideshow.js';

document.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
  setupNavLinks();
  import('./modules/table.js').then(m => { m.setupTableControls(); m.setupExportModal(); m.setupSorting(); });
  setupBudgetSlideshow();
  setupVideoControls();
  window.addEventListener('scroll', updateActiveNav);
  updateActiveNav();
  loadData();
});
