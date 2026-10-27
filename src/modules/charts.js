import Chart from "chart.js/auto";
import { state } from "../state.js";
import { formatCurrency } from "../utils.js";
import { getDepartmentDescription } from "./labels.js";

let chartViewListener = null;
let chartResizeListener = null;

function palette() {
  return {
    bar: "#56685e",
    border: "#46594f",
    grid: "rgba(65, 53, 39, 0.08)",
    ticks: "#51493f",
  };
}

function topDepts() {
  const totals = new Map();
  for (const row of state.filteredData) {
    const dept = row.__departmentDisplay || row.Department || "Unknown";
    totals.set(
      dept,
      (totals.get(dept) || 0) +
        (row.__cash ?? (parseFloat(row["Cash Expense"]) || 0)),
    );
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({
      label: shortenChartLabel(label),
      value,
      description: getDepartmentDescription(label),
      fullLabel: label,
    }));
}

function shortenChartLabel(label) {
  const trimmed = String(label || "")
    .replace(
      /\s*-\s*(Personal Services|Other Than Personal Services|PS|OTPS)$/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (trimmed.length <= 28) return trimmed;
  return `${trimmed.slice(0, 27).trimEnd()}…`;
}

export function createCharts() {
  const select = document.getElementById("chartView");
  const narrow = window.innerWidth < 768;
  const defaultType = narrow ? "pie" : "bar";
  const currentType =
    select?.dataset.userSelected === "true"
      ? select.value || defaultType
      : defaultType;

  if (select && select.value !== currentType) select.value = currentType;
  createDepartmentChart(currentType);

  if (chartViewListener)
    select?.removeEventListener("change", chartViewListener);
  chartViewListener = (e) => {
    e.target.dataset.userSelected = "true";
    createDepartmentChart(e.target.value);
  };
  select?.addEventListener("change", chartViewListener);

  if (chartResizeListener)
    window.removeEventListener("resize", chartResizeListener);
  chartResizeListener = () => {
    if (!select || select.dataset.userSelected === "true") return;
    const nextDefault = window.innerWidth < 768 ? "pie" : "bar";
    if (select.value !== nextDefault) {
      select.value = nextDefault;
      createDepartmentChart(nextDefault);
    }
  };
  window.addEventListener("resize", chartResizeListener, { passive: true });
}

export function createDepartmentChart(type = "bar") {
  const p = palette();
  const sorted = topDepts();
  const ctx = document.getElementById("departmentChart");
  const narrow = window.innerWidth < 768;
  const horizontalBar = type === "bar" && narrow;
  const chartType = type === "pie" ? "doughnut" : type;
  const piePalette = [
    "#111827",
    "#334155",
    "#475569",
    "#64748b",
    "#7c2d12",
    "#b45309",
    "#d97706",
    "#f59e0b",
    "#94a3b8",
    "#cbd5e1",
  ];
  const pageBg =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--white")
      ?.trim() || "#f6f2eb";

  if (state.charts.department) state.charts.department.destroy();
  state.charts.department = new Chart(ctx, {
    type: chartType,
    indexAxis: horizontalBar ? "y" : "x",
    data: {
      labels: sorted.map((x) => x.label),
      datasets: [
        {
          label: "Total Spending",
          data: sorted.map((x) => x.value),
          backgroundColor: chartType === "doughnut" ? piePalette : p.bar,
          borderColor: chartType === "doughnut" ? pageBg : p.border,
          borderAlign: chartType === "doughnut" ? "inner" : "center",
          spacing: chartType === "doughnut" ? 3 : 0,
          borderWidth: 1,
          borderRadius: chartType === "doughnut" ? 4 : 2,
          borderSkipped: "start",
          barPercentage: 0.9,
          categoryPercentage: 0.8,
          hoverOffset: chartType === "doughnut" ? 2 : 0,
          hoverBorderColor: chartType === "doughnut" ? pageBg : p.border,
          hoverBorderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: chartType === "doughnut" ? (narrow ? "34%" : "38%") : 0,
      radius: chartType === "doughnut" ? (narrow ? "88%" : "82%") : undefined,
      animation: document.body.dataset.readingMode !== "presentation" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? false
        : { duration: 200 },
      layout:
        chartType === "doughnut"
          ? { padding: { top: 8, right: 8, bottom: 8, left: 8 } }
          : {},
      plugins: {
        legend: {
          display: chartType === "doughnut",
          position: "bottom",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 12,
            font: { size: narrow ? 11 : 12 },
          },
        },
        tooltip: {
          backgroundColor: "#302c27",
          titleColor: "#fffaf3",
          bodyColor: "#fffaf3",
          cornerRadius: 4,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) =>
              sorted[items[0].dataIndex]?.fullLabel ||
              sorted[items[0].dataIndex]?.label ||
              "",
            label: (c) =>
              `Spending: ${formatCurrency(typeof c.parsed === "number" ? c.parsed : c.parsed[horizontalBar ? "x" : "y"])}`,
            afterLabel: (c) => sorted[c.dataIndex]?.description || "",
          },
        },
      },
      scales:
        type === "bar"
          ? narrow
            ? {
                x: { display: false, grid: { display: false } },
                y: { display: false, grid: { display: false } },
              }
            : horizontalBar
              ? {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      callback: (v) => formatCurrency(v),
                      color: p.ticks,
                    },
                    grid: { color: p.grid },
                  },
                  y: {
                    ticks: {
                      color: p.ticks,
                      autoSkip: false,
                      font: { size: narrow ? 10 : 11 },
                    },
                    grid: { display: false },
                  },
                }
              : {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (v) => formatCurrency(v),
                      color: p.ticks,
                    },
                    grid: { color: p.grid },
                  },
                  x: {
                    ticks: {
                      color: p.ticks,
                      maxRotation: narrow ? 0 : 18,
                      minRotation: narrow ? 0 : 10,
                      autoSkip: narrow,
                      font: { size: narrow ? 10 : 11 },
                    },
                    grid: { color: p.grid },
                  },
                }
          : {},
    },
  });
}

