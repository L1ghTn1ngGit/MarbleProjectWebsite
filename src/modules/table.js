import Papa from "papaparse";
import { exportBudgetRow } from "../data/records.js";
import { state } from "../state.js";
import { formatCurrency, getStatusInfo } from "../utils.js";
import {
  getDepartmentDescription,
  getProgramDescription,
  toDisplayName,
} from "./labels.js";

let rowsPerPageResizeListener = null;
let tableFilterLinksBound = false;

export function displayTable() {
  const tbody = document.getElementById("tableBody");

  tbody.innerHTML = "";

  const start = (state.currentPage - 1) * state.recordsPerPage;
  const end =
    state.recordsPerPage === "all"
      ? state.filteredData.length
      : start + state.recordsPerPage;
  const page =
    state.recordsPerPage === "all"
      ? state.filteredData.slice(0)
      : state.filteredData.slice(start, end);

  if (!page.length) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="loading-cell">No budget lines match these filters. Try clearing a filter or the search.</td></tr>';
    updateFooter(0, 0, 0);
    return;
  }

  const frag = document.createDocumentFragment();
  page.forEach((row, i) => frag.appendChild(buildRow(row, i)));
  tbody.appendChild(frag);
  applyColumnVisibility();
  updateFooter(start, end, state.filteredData.length);
}

function buildRow(row, index = 0) {
  const modified = row.__modified ?? (parseFloat(row["Modified"]) || 0);
  const cash = row.__cash ?? (parseFloat(row["Cash Expense"]) || 0);
  const diff = row.__diff ?? cash - modified;
  const status = row.__status
    ? {
        type: row.__status,
        label: row.__statusLabel || getStatusInfo(diff, modified).label,
      }
    : getStatusInfo(diff, modified);
  const tr = document.createElement("tr");
  tr.style.setProperty("--i", Math.min(index, 24));

  const ratio = modified > 0 ? cash / modified : null;
  const ratioPct = ratio === null ? 0 : (Math.min(ratio, 1.5) / 1.5) * 100;
  const diffPct =
    modified > 0
      ? `${diff > 0 ? "+" : ""}${((diff / modified) * 100).toFixed(1)}%`
      : "";
  const departmentName =
    row.__departmentDisplay || toDisplayName(row.Department);
  const programName = row.__programDisplay || toDisplayName(row["Budget Name"]);
  const departmentNote =
    row.__departmentDescription || getDepartmentDescription(row.Department);
  const programNote =
    row.__programDescription || getProgramDescription(row["Budget Name"]);

  tr.innerHTML = `
    <td class="col-year" data-label="Year" title="Fiscal year of the record">${escapeAttr(row.Year)}</td>
    <td class="col-dept" data-label="Department / Office" title="${escapeAttr(departmentNote)}">${escapeAttr(departmentName) || "—"}</td>
    <td class="col-prog" data-label="Program / Line Item" title="${escapeAttr(programNote)}">${escapeAttr(programName) || "—"}</td>
    <td class="col-money" data-label="Budgeted Amount" title="Budgeted amount before spending">${formatCurrency(modified)}</td>
    <td class="col-money col-spent" data-label="Cash Expense" title="${ratio === null ? "No working budget for this line" : `Spent ${(ratio * 100).toFixed(1)}% of the working budget`}">${formatCurrency(cash)}<span class="ratio-bar${ratio !== null && ratio > 1 ? " is-over" : ""}" style="--r:${ratioPct.toFixed(1)}%" aria-hidden="true"></span></td>
    <td class="col-money col-diff ${diff > 0 ? "diff-over" : diff < 0 ? "diff-under" : ""}" data-label="Difference" data-filter-diff="${diff > 0 ? "positive" : diff < 0 ? "negative" : "zero"}" title="${diff > 0 ? "Click to filter positive differences" : diff < 0 ? "Click to filter negative differences" : "No difference recorded"}">${formatCurrency(diff)}${diffPct ? `<small class="diff-pct">${diffPct}</small>` : ""}</td>
    <td class="col-status" data-label="Status" data-filter-status="${status.type}" title="Click to filter ${status.label.toLowerCase()}">
      <span class="status-chip"><i aria-hidden="true"></i>${status.label}</span>
    </td>`;

  return tr;
}

function bindTableFilterLinks() {
  if (tableFilterLinksBound) return;
  const tbody = document.getElementById("tableBody");
  if (!tbody) return;

  tbody.addEventListener("click", (event) => {
    const statusCell = event.target.closest?.("[data-filter-status]");
    if (statusCell) {
      const select = document.getElementById("statusFilter");
      if (!select) return;
      const next =
        select.value === statusCell.dataset.filterStatus
          ? "all"
          : statusCell.dataset.filterStatus;
      select.value = next;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const diffCell = event.target.closest?.("[data-filter-diff]");
    if (diffCell) {
      const select = document.getElementById("differenceFilter");
      if (!select) return;
      const next =
        select.value === diffCell.dataset.filterDiff
          ? "all"
          : diffCell.dataset.filterDiff;
      select.value = next;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  tableFilterLinksBound = true;
}

function updateFooter(start, end, total) {
  const totalPages =
    state.recordsPerPage === "all"
      ? 1
      : Math.ceil(total / state.recordsPerPage) || 1;
  document.getElementById("recordCount").textContent = total
    ? `${start + 1}–${Math.min(end, total)} of ${total}`
    : "No records";
  document.getElementById("pageInfo").textContent =
    `${state.currentPage} / ${totalPages}`;
  document.getElementById("prevPage").disabled = state.currentPage === 1;
  document.getElementById("nextPage").disabled =
    state.currentPage >= totalPages;
}

function applyColumnVisibility() {
  const cols = state.visibleColumns;
  const columnOrder = [
    "Year",
    "Department",
    "Budget Name",
    "Modified",
    "Cash Expense",
    "Difference",
    "Status",
  ];
  columnOrder.forEach((column, index) => {
    const selector = `thead th:nth-child(${index + 1}), tbody td:nth-child(${index + 1})`;
    document.querySelectorAll(selector).forEach((cell) => {
      cell.style.display = cols.includes(column) ? "" : "none";
    });
  });
}

export function setupSorting() {
  const statusLock = document.getElementById("statusSortLock");
  if (statusLock) {
    statusLock.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleStatusLock();
    });
    updateStatusLockControl();
    updateStatusSortControl();
  }

  document.querySelectorAll(".sortable").forEach((th) => {
    if (th.dataset.sort === "Status") {
      th.addEventListener("click", (event) => {
        if (event.target.closest?.("#statusSortLock")) return;
        if (state.lockedSort?.key === "Status") return;
        const key = "Status";
        const order =
          state.tableSort?.key === key && state.tableSort?.order === "asc"
            ? "desc"
            : "asc";
        sortTableData(key, order);
        state.currentPage = 1;
        displayTable();
      });
      return;
    }
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      const order =
        state.tableSort?.key === key && state.tableSort?.order === "asc"
          ? "desc"
          : "asc";
      sortTableData(key, order);
      state.currentPage = 1;
      displayTable();
    });
  });
}

function compareRowsByKey(a, b, key, order) {
  const va = sortVal(a, key);
  const vb = sortVal(b, key);
  if (typeof va === "string" || typeof vb === "string") {
    return order === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  }
  return order === "asc" ? va - vb : vb - va;
}

function statusLockMarkup() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 11V8.5a5 5 0 0 1 10 0V11" />
      <rect x="5.5" y="11" width="13" height="9" rx="2.2" ry="2.2" />
      <path d="M12 14.2v2.2" />
    </svg>`;
}

function updateStatusLockControl() {
  const statusLock = document.getElementById("statusSortLock");
  if (!statusLock) return;
  const locked = state.lockedSort?.key === "Status";
  statusLock.dataset.active = locked ? "true" : "false";
  statusLock.setAttribute("aria-pressed", String(locked));
  statusLock.title = locked ? "Unlock status sorting" : "Lock status sorting";
  statusLock.innerHTML = statusLockMarkup();
}

function updateStatusSortControl() {
  const statusHeader = document.querySelector('th[data-sort="Status"]');
  const statusArrow = document.querySelector(".status-sort-arrow");
  if (!statusHeader || !statusArrow) return;

  const active = state.tableSort?.key === "Status";
  const order = active ? state.tableSort?.order || "desc" : null;

  if (order) {
    statusHeader.setAttribute("data-order", order);
    statusArrow.textContent = order === "asc" ? "↑" : "↓";
    statusArrow.style.color = "#ffffff";
    statusArrow.style.opacity = "1";
  } else {
    statusHeader.removeAttribute("data-order");
    statusArrow.textContent = "↕";
    statusArrow.style.color = "#7a7a7a";
    statusArrow.style.opacity = "1";
  }
}

function toggleStatusLock() {
  const active = state.lockedSort?.key === "Status";
  state.lockedSort = active
    ? null
    : {
        key: "Status",
        order:
          state.tableSort?.key === "Status" ? state.tableSort.order : "desc",
      };
  updateStatusLockControl();
  sortTableData(state.tableSort?.key, state.tableSort?.order);
  displayTable();
}

export function sortTableData(
  key = state.tableSort?.key || "Difference",
  order = state.tableSort?.order || "desc",
) {
  state.tableSort = { key, order };

  if (state.lockedSort?.key === key) {
    state.lockedSort = { key, order };
  }

  document.querySelectorAll(".sortable").forEach((header) => {
    if (header.dataset.sort === key) {
      header.setAttribute("data-order", order);
    } else {
      header.removeAttribute("data-order");
    }
  });

  const statusLock = document.getElementById("statusSortLock");
  if (statusLock) updateStatusLockControl();
  updateStatusSortControl();

  state.filteredData.sort((a, b) => {
    try {
      const locked = state.lockedSort;
      if (locked?.key && locked.key !== key) {
        const primary = compareRowsByKey(
          a,
          b,
          locked.key,
          locked.order || "desc",
        );
        if (primary !== 0) return primary;
      }
    } catch (e) {

    }

    return compareRowsByKey(a, b, key, order);
  });
}

export function setupTableControls() {
  const rowsSel = document.getElementById("rowsPerPage");
  const colBtn = document.getElementById("columnToggle");
  const columnsModal = document.getElementById("columnsModal");
  const columnsList = document.getElementById("columnsList");
  const applyBtn = document.getElementById("columnsApplyBtn");
  const cancelBtn = document.getElementById("columnsCancelBtn");

  const defaultRows = window.innerWidth < 768 ? 5 : 50;

  if (rowsSel) {
    if (rowsSel.dataset.userSelected !== "true") {
      state.recordsPerPage = defaultRows;
      rowsSel.value = String(defaultRows);
    } else {
      rowsSel.value = String(state.recordsPerPage);
    }

    rowsSel.addEventListener("change", () => {
      rowsSel.dataset.userSelected = "true";
      const v = rowsSel.value === "all" ? "all" : parseInt(rowsSel.value, 10);
      state.recordsPerPage = v;
      state.currentPage = 1;
      displayTable();
    });

    if (rowsPerPageResizeListener)
      window.removeEventListener("resize", rowsPerPageResizeListener);
    rowsPerPageResizeListener = () => {
      if (rowsSel.dataset.userSelected === "true") return;
      const nextDefault = window.innerWidth < 768 ? 5 : 50;
      if (state.recordsPerPage !== nextDefault) {
        state.recordsPerPage = nextDefault;
        rowsSel.value = String(nextDefault);
        state.currentPage = 1;
        displayTable();
      }
    };
    window.addEventListener("resize", rowsPerPageResizeListener, {
      passive: true,
    });
  }

  if (!columnsModal || !columnsList || !colBtn) return;

  const allCols = [
    "Year",
    "Department",
    "Budget Name",
    "Modified",
    "Cash Expense",
    "Difference",
    "Status",
  ];

  function defaultLockOrderFor(col) {
    if (
      col === "Year" ||
      col === "Modified" ||
      col === "Cash Expense" ||
      col === "Difference" ||
      col === "Status"
    )
      return "desc";
    return "asc";
  }

  function renderColumnsList(target) {
    target.innerHTML = "";
    allCols.forEach((col) => {
      const id = `col_${col.replace(/\s+/g, "")}`;
      const locked = state.lockedSort?.key === col;
      const lockIcon = locked ? "🔒" : "🔓";
      const div = document.createElement("div");
      div.className = "column-lock-row";
      div.innerHTML = `
        <label class="column-lock-label" for="${id}">
          <input type="checkbox" id="${id}" value="${col}" ${state.visibleColumns.includes(col) ? "checked" : ""}>
          <span>${friendlyColumnLabel(col)}</span>
        </label>
        <button type="button" class="column-lock-btn ${locked ? "is-locked" : ""}" data-lock-sort="${col}" aria-pressed="${locked ? "true" : "false"}" title="${locked ? "Unlock sort for" : "Lock sort for"} ${friendlyColumnLabel(col)}" aria-label="${locked ? "Unlock sort for" : "Lock sort for"} ${friendlyColumnLabel(col)}">${lockIcon}</button>`;
      target.appendChild(div);
    });
  }

  columnsList.addEventListener("click", (e) => {
    const button = e.target.closest("[data-lock-sort]");
    if (!button) return;
    const key = button.dataset.lockSort;
    const active = state.lockedSort?.key === key;
    state.lockedSort = active
      ? null
      : {
          key,
          order:
            state.tableSort?.key === key
              ? state.tableSort.order
              : defaultLockOrderFor(key),
        };
    renderColumnsList(columnsList);
    sortTableData(state.tableSort?.key, state.tableSort?.order);
    displayTable();
  });

  colBtn.addEventListener("click", () => {
    renderColumnsList(columnsList);
    columnsModal.classList.remove("hidden");
  });

  applyBtn.addEventListener("click", () => {
    const checked = Array.from(
      columnsList.querySelectorAll("input[type=checkbox]:checked"),
    ).map((i) => i.value);
    state.visibleColumns = checked.length ? checked : allCols;
    applyColumnVisibility();
    columnsModal.classList.add("hidden");
  });

  cancelBtn.addEventListener("click", () =>
    columnsModal.classList.add("hidden"),
  );

  columnsModal.addEventListener("click", (e) => {
    if (
      e.target === columnsModal ||
      e.target.classList.contains("export-modal__backdrop")
    )
      columnsModal.classList.add("hidden");
  });

  applyColumnVisibility();
  bindTableFilterLinks();
}

function sortVal(row, key) {
  if (key === "Modified") return row.__modified ?? (parseFloat(row[key]) || 0);
  if (key === "Cash Expense") return row.__cash ?? (parseFloat(row[key]) || 0);
  if (key === "Difference")
    return (
      row.__diff ??
      (parseFloat(row["Cash Expense"]) || 0) -
        (parseFloat(row["Modified"]) || 0)
    );
  if (key === "Department")
    return row.__departmentDisplay || toDisplayName(row[key]);
  if (key === "Budget Name")
    return row.__programDisplay || toDisplayName(row[key]);
  if (key === "Status") {
    if (row.__status === "critical") return 3;
    if (row.__status === "over") return 2;
    if (row.__status === "under") return 1;
    return 0;
  }
  return row[key] || "";
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function setupExportModal() {
  const modal = document.getElementById("exportModal");
  const pageBtn = document.getElementById("exportPageBtn");
  const allBtn = document.getElementById("exportAllBtn");
  const cancelBtn = document.getElementById("exportCancelBtn");
  const trigger = document.getElementById("exportData");
  if (!modal || !trigger) return;

  const open = () => modal.classList.remove("hidden");
  const close = () => modal.classList.add("hidden");

  const doExport = (pageOnly) => {
    const start = (state.currentPage - 1) * state.recordsPerPage;
    const data = pageOnly
      ? state.recordsPerPage === "all"
        ? state.filteredData.slice(0)
        : state.filteredData.slice(start, start + state.recordsPerPage)
      : state.filteredData;

    const format = document.getElementById("exportFormat")?.value ?? "csv";
    const delim = document.getElementById("exportDelimiter")?.value ?? ",";
    const includeHeaders =
      document.getElementById("exportHeaders")?.checked ?? true;

    const colChecks = document.querySelectorAll(
      "#exportColumnsList input[type=checkbox]",
    );
    const selectedCols = colChecks.length
      ? Array.from(colChecks)
          .filter((i) => i.checked)
          .map((i) => i.value)
      : null;

    const columns = selectedCols?.length ? selectedCols : state.visibleColumns;
    const rows = data.map((row) => exportBudgetRow(row, columns));

    const content =
      format === "json"
        ? JSON.stringify(rows, null, 2)
        : // named fields keep the header row even when the filter matches nothing
          Papa.unparse({ fields: columns, data: rows.map((row) => columns.map((column) => row[column])) }, {
            delimiter: delim === "\\t" ? "\t" : delim,
            header: includeHeaders,
            escapeFormulae: true,
          });
    const mimeType =
      format === "json" ? "application/json" : "text/csv;charset=utf-8";
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `education-budget-${pageOnly ? "page" : "all"}.${format}`,
    });
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  trigger.addEventListener("click", open);
  pageBtn.addEventListener("click", () => {
    doExport(true);
    close();
  });
  allBtn.addEventListener("click", () => {
    doExport(false);
    close();
  });
  cancelBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (
      e.target === modal ||
      e.target.classList.contains("export-modal__backdrop")
    )
      close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });

  document.getElementById("exportData")?.addEventListener("click", () => {
    const list = document.getElementById("exportColumnsList");
    if (!list) return;
    list.innerHTML = "";
    const allCols = [
      "Year",
      "Department",
      "Budget Name",
      "Modified",
      "Cash Expense",
      "Difference",
      "Status",
    ];
    allCols.forEach((col) => {
      const id = `exp_${col.replace(/\s+/g, "")}`;
      const div = document.createElement("div");
      div.innerHTML = `<label><input type="checkbox" id="${id}" value="${col}" ${state.visibleColumns.includes(col) ? "checked" : ""}> ${friendlyColumnLabel(col)}</label>`;
      list.appendChild(div);
    });
  });
}

function friendlyColumnLabel(label) {
  if (label === "Department") return "Department / Office";
  if (label === "Budget Name") return "Program / Line Item";
  if (label === "Modified") return "Budget";
  if (label === "Cash Expense") return "Spent";
  return label;
}
