import Chart from 'chart.js/auto';
import { state } from '../state.js';
import { formatCurrency } from '../utils.js';

let chartViewListener = null;

function palette() {
  const dark = document.body.classList.contains('dark-mode');
  return dark
    ? { bar: 'rgba(255,255,255,0.9)', border: 'rgba(255,255,255,0.9)', grid: 'rgba(255,255,255,0.08)', ticks: '#f5f5f5' }
    : { bar: 'rgba(0,0,0,0.8)',       border: 'rgba(0,0,0,1)',         grid: 'rgba(0,0,0,0.08)',       ticks: '#212121' };
}

function topDepts() {
  const totals = {};
  for (const row of state.filteredData) {
    const dept = row.Department || 'Unknown';
    totals[dept] = (totals[dept] || 0) + (parseFloat(row['Cash Expense']) || 0);
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

export function createCharts() {
  const select = document.getElementById('chartView');
  createDepartmentChart(select?.value ?? 'bar');

  if (chartViewListener) select?.removeEventListener('change', chartViewListener);
  chartViewListener = e => createDepartmentChart(e.target.value);
  select?.addEventListener('change', chartViewListener);
}

export function createDepartmentChart(type = 'bar') {
  const p      = palette();
  const sorted = topDepts();
  const ctx    = document.getElementById('departmentChart');

  if (state.charts.department) state.charts.department.destroy();

  state.charts.department = new Chart(ctx, {
    type,
    data: {
      labels: sorted.map(x => x[0]),
      datasets: [{
        label: 'Total Spending',
        data: sorted.map(x => x[1]),
        backgroundColor: type === 'pie'
          ? ['#000','#333','#666','#999','#BBB','#DDD','#222','#444','#777','#AAA']
          : p.bar,
        borderColor: p.border,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: type === 'pie', position: 'right' },
        tooltip: { callbacks: { label: c => formatCurrency(c.parsed.y ?? c.parsed) } },
      },
      scales: type === 'bar' ? {
        y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v), color: p.ticks }, grid: { color: p.grid } },
        x: { ticks: { color: p.ticks }, grid: { color: p.grid } },
      } : {},
    },
  });
}
