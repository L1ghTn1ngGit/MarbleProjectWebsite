import Papa from 'papaparse';
import { state } from '../state.js';
import { animateNumber } from '../utils.js';
import { createCharts } from './charts.js';
import { displayTable, setupExportModal } from './table.js';
import { generateInsights, generateWorstOffenders } from './insights.js';
import { setupFilters } from './filters.js';

export async function loadData() {
  try {
    const response = await fetch('/nyc-education-data.csv');
    if (!response.ok) throw new Error('Failed to load CSV');
    const text = await response.text();

    const parsed = await new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    });

    state.allData = parsed.data.filter(row => {
      if (!row.Agency || !row.Year) return false;
      return (parseFloat(row['Modified']) || 0) >= 0 && (parseFloat(row['Cash Expense']) || 0) >= 0;
    });

    state.filteredData = [...state.allData];

    updateHeroStats();
    updateMetrics();
    createCharts();
    displayTable();
    generateInsights();
    generateWorstOffenders();
    setupFilters();
    setupExportModal();

  } catch (err) {
    console.error(err);
    document.getElementById('totalSpent').textContent = 'Error loading data';
  }
}

export function updateHeroStats() {
  let totalSpent = 0;
  const programs = new Set();
  let alerts = 0;

  for (const row of state.allData) {
    const cash     = parseFloat(row['Cash Expense']) || 0;
    const modified = parseFloat(row['Modified'])     || 0;
    totalSpent += cash;
    if (row.Department) programs.add(row.Department);
    if (modified > 0 && cash > modified * 1.1) alerts++;
  }

  animateNumber(document.getElementById('heroTotal'),    totalSpent,    1500, '$');
  animateNumber(document.getElementById('heroPrograms'), programs.size, 1200);
  animateNumber(document.getElementById('heroAlerts'),   alerts,        1000);
}

export function updateMetrics() {
  let totalSpent = 0, totalModified = 0, overCount = 0;

  for (const row of state.filteredData) {
    const cash     = parseFloat(row['Cash Expense']) || 0;
    const modified = parseFloat(row['Modified'])     || 0;
    totalSpent    += cash;
    totalModified += modified;
    if (modified > 0 && cash > modified * 1.1) overCount++;
  }

  animateNumber(document.getElementById('totalSpent'),  totalSpent,    1200, '$');
  animateNumber(document.getElementById('totalBudget'), totalModified, 1200, '$');
  animateNumber(document.getElementById('overBudget'),  overCount,     1000);
}
