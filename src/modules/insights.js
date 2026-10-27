import { state } from "../state.js";
import { formatCurrency, getIcon } from "../utils.js";
import {
  getDepartmentDescription,
  getProgramDescription,
  toDisplayName,
} from "./labels.js";

export function generateInsights() {
  const container = document.getElementById("insightsContainer");
  container.innerHTML = "";

  let maxRow = null,
    maxAmount = 0;
  for (const row of state.allData) {
    const modified = row.__modified ?? (parseFloat(row["Modified"]) || 0);
    const cash = row.__cash ?? (parseFloat(row["Cash Expense"]) || 0);
    const diff = row.__diff ?? cash - modified;
    if (diff > maxAmount && modified >= 100000) {
      maxAmount = diff;
      maxRow = row;
    }
  }

  if (maxRow) {
    container.appendChild(
      card(
        "alert",
        `
      <h3>${getIcon("alert")} Largest Overrun</h3>
      <p><strong>${escapeHtml(maxRow.__departmentDisplay || toDisplayName(maxRow.Department))}</strong></p>
      <p title="${escapeHtml(maxRow.__departmentDescription || getDepartmentDescription(maxRow.Department))}">${escapeHtml(maxRow.__programDisplay || toDisplayName(maxRow["Budget Name"]))}</p>
      <div class="amount">${formatCurrency(maxAmount)}</div>
      <p class="muted-note">over working budget in ${escapeHtml(maxRow.Year)}</p>
    `,
      ),
    );
  }

  const yTotals = {};
  for (const row of state.allData) {
    yTotals[row.Year] =
      (yTotals[row.Year] || 0) +
      (row.__cash ?? (parseFloat(row["Cash Expense"]) || 0));
  }
  const years = Object.keys(yTotals)
    .map(Number)
    .sort((a, b) => a - b);
  const latest = years[years.length - 1];
  const changes = years
    .slice(1)
    .slice(-2)
    .map((y) => {
      const g = growthPct(yTotals[y], yTotals[y - 1]);
      return `<p>FY${y} vs FY${y - 1}: <strong>${g > 0 ? "+" : ""}${g}%</strong></p>`;
    })
    .join("");

  container.appendChild(
    card(
      "",
      `
    <h3>${getIcon("trend")} Spending Trends</h3>
    ${sparkline(
      years.map((y) => yTotals[y]),
      years.map((y) => `FY${y}`),
    )}
    ${changes}
    <div class="amount">${formatCurrency(yTotals[latest] || 0)}</div>
    <p class="muted-note">Total FY${latest} spending</p>
  `,
      "delay-1",
    ),
  );

  const forecast = buildYearlyForecast();
  if (forecast) {
    container.appendChild(
      card(
        "alert",
        `
      <h3>${getIcon("trend")} Forecast</h3>
      <p><strong>Simple linear regression</strong> on yearly cash spending.</p>
      ${sparkline(forecast.values, forecast.labels, forecast.nextValue)}
      <div class="amount">${formatCurrency(forecast.nextValue)}</div>
      <p class="muted-note">Projected ${forecast.nextYear} spending</p>
      <p class="muted-note small">Based only on the ${forecast.startYear}–${forecast.endYear} trend. An illustration, not an official projection.</p>
    `,
        "delay-2",
      ),
    );
  }
}

export function generateWorstOffenders() {
  const offenders = [];

  for (const row of state.allData) {
    const modified = row.__modified ?? (parseFloat(row["Modified"]) || 0);
    const cash = row.__cash ?? (parseFloat(row["Cash Expense"]) || 0);
    const diff = row.__diff ?? cash - modified;
    if (diff > 0 && modified > 0) {
      offenders.push({
        ...row,
        overrun: diff,
        overrunPct: (diff / modified) * 100,
      });
    }
  }

  offenders.sort((a, b) => b.overrun - a.overrun);

  const list = document.getElementById("offendersList");
  list.innerHTML = "";

  if (!offenders.length) {
    list.innerHTML =
      '<li class="loading-cell">No budget lines exceeded their working budget.</li>';
    return;
  }

  offenders.slice(0, 5).forEach((o, i) => {
    const department = o.__departmentDisplay || toDisplayName(o.Department);
    const program = o.__programDisplay || toDisplayName(o["Budget Name"]);
    const li = document.createElement("li");
    li.className = "overrun-item";
    li.innerHTML = `
      <span class="overrun-rank" aria-hidden="true">${i + 1}</span>
      <div class="overrun-names">
        <h3 title="${escapeHtml(o.__departmentDescription || getDepartmentDescription(o.Department))}">${escapeHtml(department)}</h3>
        <p title="${escapeHtml(o.__programDescription || getProgramDescription(o["Budget Name"]))}">${escapeHtml(program)}</p>
      </div>
      <div class="overrun-figures">
        <span class="overrun-amount">${formatCurrency(o.overrun)} over</span>
        <span class="overrun-detail">${o.overrunPct.toFixed(1)}% above a ${formatCurrency(o.__modified ?? (parseFloat(o["Modified"]) || 0))} budget · FY${escapeHtml(o.Year)}</span>
      </div>
      <div class="overrun-bar" style="--b:${(100 / (1 + o.overrunPct / 100)).toFixed(2)}%" aria-hidden="true"><span class="overrun-bar__budget"></span><span class="overrun-bar__over"></span></div>`;
    list.appendChild(li);
  });
}


function sparkline(values, labels, projected = null) {
  const all = projected === null ? values : [...values, projected];
  if (all.length < 2) return "";
  const w = 240,
    h = 64,
    pad = 6;
  const min = Math.min(...all),
    max = Math.max(...all);
  const x = (i) => pad + (i / (all.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const pts = values
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const proj =
    projected === null
      ? ""
      : `<polyline class="spark-proj" points="${x(values.length - 1).toFixed(1)},${y(values[values.length - 1]).toFixed(1)} ${x(values.length).toFixed(1)},${y(projected).toFixed(1)}"/>`;
  const dots = all
    .map(
      (v, i) =>
        `<circle class="${i >= values.length ? "spark-dot is-proj" : "spark-dot"}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>`,
    )
    .join("");
  const area = `${x(0).toFixed(1)},${h - pad} ${pts} ${x(values.length - 1).toFixed(1)},${h - pad}`;
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" role="img" aria-label="${labels.map((l, i) => `${l}: ${formatCurrency(values[i])}`).join(", ")}">
    <polygon class="spark-area" points="${area}"/><polyline class="spark-line" points="${pts}"/>${proj}${dots}</svg>`;
}

function growthPct(a, b) {
  return b > 0 ? +(((a - b) / b) * 100).toFixed(1) : 0;
}

function buildYearlyForecast() {
  const yearTotals = new Map();

  for (const row of state.allData) {
    const year = Number(row.Year);
    if (!Number.isFinite(year)) continue;
    yearTotals.set(
      year,
      (yearTotals.get(year) || 0) + (parseFloat(row["Cash Expense"]) || 0),
    );
  }

  const points = [...yearTotals.entries()].sort((a, b) => a[0] - b[0]);
  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((sum, [year]) => sum + year, 0);
  const sumY = points.reduce((sum, [, value]) => sum + value, 0);
  const sumXY = points.reduce((sum, [year, value]) => sum + year * value, 0);
  const sumXX = points.reduce((sum, [year]) => sum + year * year, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const nextYear = points[points.length - 1][0] + 1;
  const nextValue = Math.max(0, slope * nextYear + intercept);

  return {
    values: points.map((p) => p[1]),
    labels: points.map((p) => `FY${p[0]}`),
    nextYear,
    nextValue,
    startYear: points[0][0],
    endYear: points[points.length - 1][0],
  };
}

function card(extraClass, html, delayClass = "") {
  const div = document.createElement("div");
  div.className = ["insight-card slide-up", extraClass, delayClass]
    .filter(Boolean)
    .join(" ");
  div.innerHTML = html;
  return div;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
