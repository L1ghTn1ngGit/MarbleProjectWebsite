import { state } from "../state.js";
import { getStatusInfo } from "../utils.js";
import { updateMetrics } from "./data.js";
import { createCharts } from "./charts.js";
import { displayTable, sortTableData } from "./table.js";
import {
  categorizeDepartment,
  categorizeProgram,
  normalizeLookupValue,
  toDisplayName,
  getDepartmentDescription,
  getProgramDescription,
} from "./labels.js";

export function setupFilters() {
  populateDropdowns();

  [
    "yearFilter",
    "searchBox",
    "tableSearch",
    "tableYearFilter",
    "programFilter",
    "departmentFilter",
    "statusFilter",
    "differenceFilter",
  ].forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    field.addEventListener("input", applyAll);
    field.addEventListener("change", applyAll);
  });

  document.getElementById("prevPage").addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      displayTable();
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    const total = Math.ceil(state.filteredData.length / state.recordsPerPage);
    if (state.currentPage < total) {
      state.currentPage++;
      displayTable();
    }
  });

  document
    .getElementById("clearTableFilters")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      resetTableFilters();
      updateFiltersCount();
    });

  setupFiltersToggle();
}

const COUNTED_FILTERS = [
  "programFilter",
  "tableYearFilter",
  "departmentFilter",
  "statusFilter",
  "differenceFilter",
];

function updateFiltersCount() {
  const badge = document.getElementById("filtersCount");
  if (!badge) return;
  const active = COUNTED_FILTERS.filter((id) => {
    const el = document.getElementById(id);
    return el && el.value !== "all";
  }).length;
  badge.textContent = active ? `(${active})` : "";
}

function setupFiltersToggle() {
  const toggle = document.getElementById("filtersToggle");
  const panel = document.getElementById("tableFilters");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  panel.addEventListener("change", updateFiltersCount);
  updateFiltersCount();
}

function applyAll() {
  const year = document.getElementById("yearFilter").value;
  const tableYear = document.getElementById("tableYearFilter").value;
  const program = document.getElementById("programFilter").value;
  const department = document.getElementById("departmentFilter").value;
  const status = document.getElementById("statusFilter")?.value || "all";
  const difference =
    document.getElementById("differenceFilter")?.value || "all";
  const queries = ["searchBox", "tableSearch"]
    .map((id) => document.getElementById(id).value.toLowerCase().trim())
    .filter(Boolean);

  state.filteredData = state.allData.filter((row) => {
    const rowYear = row.Year?.toString();
    const modified = row.__modified ?? (parseFloat(row["Modified"]) || 0);
    const cash = row.__cash ?? (parseFloat(row["Cash Expense"]) || 0);
    const diff = row.__diff ?? cash - modified;
    const statusInfo = getStatusInfo(diff, modified);
    if (year !== "all" && rowYear !== year) return false;
    if (tableYear !== "all" && rowYear !== tableYear) return false;
    if (
      program !== "all" &&
      normalizeLookupValue(row["Budget Name"]) !== program
    )
      return false;
    if (
      department !== "all" &&
      normalizeLookupValue(row.Department) !== department
    )
      return false;
    if (status !== "all" && statusInfo.type !== status) return false;
    if (difference !== "all") {
      if (difference === "positive" && diff <= 0) return false;
      if (difference === "negative" && diff >= 0) return false;
      if (difference === "zero" && diff !== 0) return false;
    }
    if (!queries.every((query) => rowMatchesQuery(row, query))) return false;
    return true;
  });

  state.currentPage = 1;
  sortTableData();
  updateMetrics();
  createCharts();
  displayTable();
  updateFiltersCount();
}

function resetTableFilters() {
  const defaults = {
    yearFilter: "all",
    searchBox: "",
    tableSearch: "",
    tableYearFilter: "all",
    programFilter: "all",
    departmentFilter: "all",
    statusFilter: "all",
    differenceFilter: "all",
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (!field) return;
    field.value = value;
    field.dataset.userSelected = "";
  });

  state.filteredData = [...state.allData];
  state.currentPage = 1;
  sortTableData();
  updateMetrics();
  createCharts();
  displayTable();
}

function rowMatchesQuery(row, q) {
  return (
    (row.__departmentDisplay &&
      row.__departmentDisplay.toLowerCase().includes(q)) ||
    (row.__programDisplay && row.__programDisplay.toLowerCase().includes(q)) ||
    (row.__departmentDescription &&
      row.__departmentDescription.toLowerCase().includes(q)) ||
    (row.__programDescription &&
      row.__programDescription.toLowerCase().includes(q)) ||
    (row.Department && row.Department.toLowerCase().includes(q)) ||
    (row["Budget Name"] && row["Budget Name"].toLowerCase().includes(q)) ||
    (row.Agency && row.Agency.toLowerCase().includes(q)) ||
    (row.Year && row.Year.toString().includes(q))
  );
}

function populateDropdowns() {
  const programs = new Map();
  const departments = new Map();

  for (const row of state.allData) {
    const program = normalizeLookupValue(row["Budget Name"]);
    const department = normalizeLookupValue(row.Department);
    if (program) programs.set(program, categorizeProgram(program));
    if (department)
      departments.set(department, categorizeDepartment(department));
  }

  const programSelect = document.getElementById("programFilter");
  const departmentSelect = document.getElementById("departmentFilter");

  programSelect.innerHTML = '<option value="all">All Programs</option>';
  departmentSelect.innerHTML = '<option value="all">All Departments</option>';

  renderGroupedOptions(programSelect, programs, PROGRAM_ORDER);
  renderGroupedOptions(departmentSelect, departments, DEPARTMENT_ORDER);
}

function renderGroupedOptions(select, items, order) {
  const grouped = new Map();

  for (const [label, category] of items) {
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(label);
  }

  for (const category of order) {
    const values = grouped.get(category);
    if (!values || !values.length) continue;

    const group = document.createElement("optgroup");
    group.label = category;
    values
      .sort((a, b) => a.localeCompare(b))
      .forEach((value) => {
        const option = Object.assign(document.createElement("option"), {
          value,
          textContent: toDisplayName(value),
        });
        option.title =
          select.id === "departmentFilter"
            ? getDepartmentDescription(value)
            : getProgramDescription(value);
        group.appendChild(option);
      });
    select.appendChild(group);
  }
}

const PROGRAM_ORDER = [
  "Core instruction",
  "Special education",
  "Early childhood",
  "Youth and community",
  "Operations and facilities",
  "Administration and finance",
  "Safety and transportation",
  "Grants and relief",
  "Charter and non-public",
  "Other",
];

const DEPARTMENT_ORDER = [
  "Core instruction",
  "Special education",
  "Early childhood",
  "Youth and community",
  "Operations and facilities",
  "Administration and finance",
  "Safety and transportation",
  "Grants and relief",
  "Charter and non-public",
  "Other",
];
