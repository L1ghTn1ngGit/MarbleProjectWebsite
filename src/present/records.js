import { formatCurrency, formatNumber } from "../utils.js";
import { toDisplayName } from "../modules/labels.js";

import { t } from "../i18n/index.js";
import { newsSearchUrl, topSpendingRows } from "../modules/news.js";

const PER_PAGE = 25;

export function setupRecords(rows, { meta, excluded }) {
  const $ = (id) => document.getElementById(id);
  const body = $("records-body");
  const search = $("record-search");
  const year = $("record-year");
  const status = $("record-status");
  let filtered = rows;
  let page = 0;

  const newsRows = topSpendingRows(rows);
  for (const row of rows) row.__search = `${row.__departmentDisplay} ${row["Budget Name"]} ${row.Department}`.toLowerCase();
  const years = [...new Set(rows.map((row) => row.__year))].sort();
  for (const value of years) year.add(new Option(`FY${value}`, value));
  $("method-count").textContent = `${formatNumber(meta.totalRows)} source rows in the file; ${formatNumber(meta.agencyRows)} Department of Education rows, of which ${formatNumber(excluded)} were excluded for negative values.`;

  function cell(text, className, label) {
    const td = document.createElement("td");
    if (className) td.className = className;

    if (label) td.dataset.label = label;
    td.textContent = text;
    return td;
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    filtered = rows.filter(
      (row) =>
        (year.value === "all" || row.__year === year.value) &&
        (status.value === "all" || (status.value === "over" ? row.__cash > row.__modified : row.__cash <= row.__modified)) &&
        (!query || row.__search.includes(query)),
    );
    const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    page = Math.min(page, pages - 1);
    const fragment = document.createDocumentFragment();
    for (const row of filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)) {
      const tr = document.createElement("tr");
      const name = document.createElement("td");
      name.className = "name";
      const line = document.createElement("span");
      line.className = "line";
      line.textContent = toDisplayName(row["Budget Name"]) || row["Budget Name"];
      const dept = document.createElement("span");
      dept.className = "dept";
      dept.textContent = row.__departmentDisplay;
      name.append(line, dept);
      if (newsRows.has(row)) {
        const news = document.createElement("a");
        news.className = "news";
        news.href = newsSearchUrl(row);
        news.target = "_blank";
        news.rel = "noopener";
        news.textContent = t("Search news coverage");
        const hint = document.createElement("span");
        hint.className = "sr-only";
        hint.textContent = ` ${t("for {name} (opens in a new tab)", { name: line.textContent })}`;
        news.append(hint);
        name.append(news);
      }
      const diff = row.__cash - row.__modified;
      tr.append(
        cell(`FY${row.__year}`, "year"),
        name,
        cell(formatCurrency(row.__modified), "num", t("Working budget")),
        cell(formatCurrency(row.__cash), "num", t("Cash spent")),
        cell(`${diff > 0 ? "+" : ""}${formatCurrency(diff)}`, `num ${diff > 0 ? "is-over" : "is-under"}`, t("Difference")),
      );
      fragment.append(tr);
    }
    body.replaceChildren(fragment);
    if (!filtered.length) {
      const tr = document.createElement("tr");
      const td = cell(t("No matching records. Try another search or filter."), "empty");
      td.colSpan = 5;
      tr.append(td);
      body.append(tr);
    }
    $("record-count").textContent = t("{count} records · Page {page} of {pages}", { count: formatNumber(filtered.length), page: page + 1, pages: formatNumber(pages) });
    $("previous-page").disabled = page === 0;
    $("next-page").disabled = page >= pages - 1;
    $("export-records").disabled = !filtered.length;
  }

  let debounce;
  search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page = 0; render(); }, 120);
  });
  for (const select of [year, status]) select.addEventListener("change", () => { page = 0; render(); });
  $("previous-page").addEventListener("click", () => { page--; render(); });
  $("next-page").addEventListener("click", () => { page++; render(); });
  $("export-records").addEventListener("click", () => {
    const columns = ["Agency", "Year", "Department", "Budget Name", "Modified", "Cash Expense"];

    const escape = (value) => {
      const text = String(value ?? "");
      const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const csv = [columns.map(escape).join(","), ...filtered.map((row) => columns.map((key) => escape(row[key])).join(","))].join("\r\n");
    const bom = "﻿";
    const url = URL.createObjectURL(new Blob([bom + csv],{ type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "marble-doe-budget.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
}
