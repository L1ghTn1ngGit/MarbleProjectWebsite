import Chart from 'chart.js/auto';
import { state } from '../state.js';
import { formatCurrency } from '../utils.js';

let chartViewListener = null;
let chartResizeListener = null;

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
  const narrow = window.innerWidth < 768;
  const defaultType = narrow ? 'pie' : 'bar';
  const currentType = select?.dataset.userSelected === 'true'
    ? (select.value || defaultType)
    : defaultType;

  if (select && select.value !== currentType) select.value = currentType;
  createDepartmentChart(currentType);

  if (chartViewListener) select?.removeEventListener('change', chartViewListener);
  chartViewListener = e => {
    e.target.dataset.userSelected = 'true';
    createDepartmentChart(e.target.value);
  };
  select?.addEventListener('change', chartViewListener);

  if (chartResizeListener) window.removeEventListener('resize', chartResizeListener);
  chartResizeListener = () => {
    if (!select || select.dataset.userSelected === 'true') return;
    const nextDefault = window.innerWidth < 768 ? 'pie' : 'bar';
    if (select.value !== nextDefault) {
      select.value = nextDefault;
      createDepartmentChart(nextDefault);
    }
  };
  window.addEventListener('resize', chartResizeListener, { passive: true });
}

export function createDepartmentChart(type = 'bar') {
  const p      = palette();
  const sorted = topDepts();
  const ctx    = document.getElementById('departmentChart');
  const narrow = window.innerWidth < 768;
  const horizontalBar = type === 'bar' && narrow;
  const chartType = type === 'pie' ? 'doughnut' : type;
  const piePalette = ['#111827', '#334155', '#475569', '#64748b', '#0f766e', '#14b8a6', '#d97706', '#f59e0b', '#94a3b8', '#cbd5e1'];

  if (state.charts.department) state.charts.department.destroy();

  state.charts.department = new Chart(ctx, {
    type: chartType,
    indexAxis: horizontalBar ? 'y' : 'x',
    data: {
      labels: sorted.map(x => x[0]),
      datasets: [{
        label: 'Total Spending',
        data: sorted.map(x => x[1]),
        backgroundColor: chartType === 'doughnut'
          ? piePalette
          : p.bar,
        borderColor: p.border,
        borderWidth: 1,
        borderRadius: chartType === 'doughnut' ? 8 : 3,
        hoverOffset: chartType === 'doughnut' ? 8 : 0,
        spacing: chartType === 'doughnut' ? 2 : 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: chartType === 'doughnut' ? (narrow ? '58%' : '52%') : 0,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          display: chartType === 'doughnut',
          position: narrow ? 'bottom' : 'right',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.96)',
          titleColor: '#fff',
          bodyColor: '#f9fafb',
          padding: 12,
          callbacks: { label: c => formatCurrency(c.parsed.y ?? c.parsed) },
        },
      },
      scales: type === 'bar' ? (horizontalBar ? {
        x: { beginAtZero: true, ticks: { callback: v => formatCurrency(v), color: p.ticks }, grid: { color: p.grid } },
        y: { ticks: { color: p.ticks, autoSkip: false, font: { size: narrow ? 11 : 12 } }, grid: { display: false } },
      } : {
        y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v), color: p.ticks }, grid: { color: p.grid } },
        x: { ticks: { color: p.ticks, maxRotation: narrow ? 0 : 30, minRotation: narrow ? 0 : 20, autoSkip: narrow }, grid: { color: p.grid } },
      }) : {},
    },
  });
}
