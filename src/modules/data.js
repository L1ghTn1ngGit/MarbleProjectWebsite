import { loadBudgetData } from "../data/source.js";
import { createLoader } from "./loader.js";
import { state } from "../state.js";
import { renderMetric, formatNumber, getStatusInfo } from "../utils.js";
import {
  categorizeDepartment,
  categorizeProgram,
  getDepartmentDescription,
  getProgramDescription,
  normalizeLookupValue,
  toDisplayName,
} from "./labels.js";
import { createCharts } from "./charts.js";
import { displayTable, setupExportModal, sortTableData } from "./table.js";
import { generateInsights, generateWorstOffenders } from "./insights.js";
import { setupFilters } from "./filters.js";

export async function loadData() {
  const loader = createLoader();
  try {
    const { rows: sourceRows, meta } = await loadBudgetData(undefined, {
      onProgress: loader.progress,
      onStage: loader.stage,
    });
    loader.step("fetch");
    state.meta = meta;
    state.allData = sourceRows
      .filter(
        (row) =>
          (parseFloat(row["Modified"]) || 0) >= 0 &&
          (parseFloat(row["Cash Expense"]) || 0) >= 0,
      )
      .map(enhanceRow);

    state.filteredData = [...state.allData];
    sortTableData();
    loader.step("parse");

    updateMetrics();
    populateYearOptions();
    updateMethodNote(meta);
    updateSourceNotes(meta);
    createCharts();
    displayTable();
    generateInsights();
    generateWorstOffenders();
    setupFilters();
    setupExportModal();
    loader.done();
    document.dispatchEvent(new CustomEvent("marble:data-ready"));
  } catch (err) {
    console.error(err);
    loader.fail();
    showLoadError();
  }
}

function showLoadError() {
  const message = "Data could not be loaded. Please refresh the page.";
  for (const id of ["totalSpent", "totalBudget", "overBudget"]) {
    const el = document.getElementById(id);
    if (el) el.textContent = "N/A";
  }
  const tbody = document.getElementById("tableBody");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">${message}</td></tr>`;
  const insights = document.getElementById("insightsContainer");
  if (insights)
    insights.innerHTML = `<div class="loading-cell">${message}</div>`;
}

function populateYearOptions() {
  const years = [...new Set(state.allData.map((row) => row.__year))].sort();
  for (const id of ["yearFilter", "tableYearFilter"]) {
    const select = document.getElementById(id);
    if (!select) continue;
    select
      .querySelectorAll('option:not([value="all"])')
      .forEach((o) => o.remove());
    for (const y of years) select.add(new Option(`FY${y}`, y));
  }
}

function yearSpan() {
  const years = [...new Set(state.allData.map((row) => row.__year))].sort();
  return years.length ? `FY${years[0]}–FY${years[years.length - 1]}` : "";
}

function updateSourceNotes(meta) {
  const note = document.getElementById("sourceNote");
  if (note) {
    const fetched = meta.fetchedAt
      ? `, retrieved ${new Date(meta.fetchedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
      : "";
    note.textContent = `${formatNumber(state.allData.length)} DOE budget lines, ${yearSpan()}${fetched}`;
  }
  const span = document.getElementById("heroYears");
  if (span) span.textContent = yearSpan();
}

function updateMethodNote(meta) {
  const sourceCount = meta.agencyRows;
  const analyzed = state.allData.length;
  const excluded = sourceCount - analyzed;
  const zeroBudget = state.allData.filter(
    (row) => row.__modified === 0 && row.__cash > 0,
  ).length;
  const set = (key, text) => {
    const el = document.querySelector(`[data-method="${key}"]`);
    if (el) el.textContent = text;
  };

  const heroCount = document.getElementById("heroRecordCount");
  if (heroCount) heroCount.textContent = formatNumber(analyzed);
  set("raw", formatNumber(meta.totalRows));
  set(
    "agency",
    meta.agency
      ? `${formatNumber(sourceCount)} belong to the ${meta.agency}; lines from other agencies are not included`
      : `all ${formatNumber(sourceCount)} are included`,
  );
  set("analyzed", excluded > 0 ? formatNumber(analyzed) : "All");
  set(
    "excluded",
    excluded > 0
      ? `${formatNumber(excluded)} lines with a negative budget or spending amount`
      : "none",
  );
  set(
    "zero",
    `${formatNumber(zeroBudget)} lines with a $0 working budget but recorded spending`,
  );
}

export function updateMetrics() {
  let totalSpent = 0,
    totalModified = 0,
    overCount = 0;

  for (const row of state.filteredData) {
    totalSpent += row.__cash;
    totalModified += row.__modified;
    if (row.__modified > 0 && row.__cash > row.__modified * 1.1) overCount++;
  }

  renderMetric(document.getElementById("totalSpent"), totalSpent, "$");
  renderMetric(document.getElementById("totalBudget"), totalModified, "$");
  renderMetric(document.getElementById("overBudget"), overCount);

  const lines = state.filteredData.length || 1;
  const spentPct = totalModified > 0 ? (totalSpent / totalModified) * 100 : 0;
  const overPct = (overCount / lines) * 100;
  const setMeter = (id, pct) => {
    const el = document.getElementById(id);
    if (el) el.style.setProperty("--p", `${Math.min(pct, 100).toFixed(1)}%`);
  };
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setMeter("spentMeter", spentPct);
  setMeter("overMeter", overPct);
  setText(
    "spentCaption",
    `${spentPct.toFixed(1)}% of the working budget spent`,
  );
  setText(
    "overCaption",
    `${overPct.toFixed(1)}% of ${formatNumber(state.filteredData.length)} lines`,
  );
}

function enhanceRow(row) {
  const modified = parseFloat(row["Modified"]) || 0;
  const cash = parseFloat(row["Cash Expense"]) || 0;
  const diff = cash - modified;
  const status = getStatusInfo(diff, modified);
  const department = normalizeLookupValue(row.Department);
  const program = normalizeLookupValue(row["Budget Name"]);

  return {
    ...row,
    Department: department,
    "Budget Name": program,
    __modified: modified,
    __cash: cash,
    __diff: diff,
    __status: status.type,
    __statusLabel: status.label,
    __departmentDisplay: toDisplayName(department),
    __programDisplay: toDisplayName(program),
    __departmentDescription: getDepartmentDescription(department),
    __programDescription: getProgramDescription(program),
    __departmentCategory: categorizeDepartment(department),
    __programCategory: categorizeProgram(program),
    __year: String(row.Year),
  };
}
