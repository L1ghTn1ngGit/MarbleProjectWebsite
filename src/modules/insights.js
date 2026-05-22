import { state } from '../state.js';
import { formatCurrency, getIcon } from '../utils.js';

export function generateInsights() {
  const container = document.getElementById('insightsContainer');
  container.innerHTML = '';

  let maxRow = null, maxAmount = 0;
  for (const row of state.allData) {
    const modified = parseFloat(row['Modified'])     || 0;
    const cash     = parseFloat(row['Cash Expense']) || 0;
    const diff     = cash - modified;
    if (diff > maxAmount && modified >= 100000) { maxAmount = diff; maxRow = row; }
  }

  if (maxRow) {
    container.appendChild(card('alert', `
      <h3>${getIcon('alert')} Largest Overrun</h3>
      <p><strong>${maxRow.Department}</strong></p>
      <p>${maxRow['Budget Name']}</p>
      <div class="amount">${formatCurrency(maxAmount)}</div>
      <p style="color:#6B7280;">over working budget in ${maxRow.Year}</p>
    `));
  }

  const yTotals = { 2023: 0, 2024: 0, 2025: 0 };
  for (const row of state.allData) {
    if (yTotals[row.Year] !== undefined) yTotals[row.Year] += parseFloat(row['Cash Expense']) || 0;
  }

  const g24 = growthPct(yTotals[2024], yTotals[2023]);
  const g25 = growthPct(yTotals[2025], yTotals[2024]);

  container.appendChild(card('', `
    <h3>${getIcon('trend')} Spending Trends</h3>
    <p>2024 vs 2023: <strong>${g24 > 0 ? '+' : ''}${g24}%</strong></p>
    <p>2025 vs 2024: <strong>${g25 > 0 ? '+' : ''}${g25}%</strong></p>
    <div class="amount">${formatCurrency(yTotals[2025])}</div>
    <p style="color:#6B7280;">Total 2025 spending</p>
  `, 'delay-1'));
}

export function generateWorstOffenders() {
  const offenders = [];

  for (const row of state.allData) {
    const modified = parseFloat(row['Modified'])     || 0;
    const cash     = parseFloat(row['Cash Expense']) || 0;
    const diff     = cash - modified;
    if (diff > 0 && modified > 0) {
      offenders.push({ ...row, overrun: diff, overrunPct: (diff / modified) * 100 });
    }
  }

  offenders.sort((a, b) => b.overrun - a.overrun);

  const slider = document.getElementById('offendersSlider');
  slider.innerHTML = '';

  for (const o of offenders.slice(0, 5)) {
    const el = document.createElement('div');
    el.className = 'offender-card';
    el.innerHTML = `
      <div class="offender-card-inner">
        <h3>${o.Department}</h3>
        <p>${o['Budget Name']}</p>
        <div class="amount">${formatCurrency(o.overrun)}</div>
        <p><strong>${o.overrunPct.toFixed(1)}%</strong> over budget in ${o.Year}</p>
      </div>`;
    slider.appendChild(el);
  }

  setupSlider();
}

function setupSlider() {
  const slider  = document.getElementById('offendersSlider');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');
  if (!slider?.children.length) return;

  let idx = 0;
  const total = slider.children.length;

  const visible = () => {
    if (window.innerWidth <= 768)  return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  };

  const update = () => {
    const max = Math.max(0, total - visible());
    idx = Math.min(Math.max(idx, 0), max);
    const w = slider.querySelector('.offender-card')?.offsetWidth ?? 0;
    slider.style.transform = `translateX(-${idx * w}px)`;
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx >= max;
  };

  nextBtn.addEventListener('click', () => { idx++; update(); });
  prevBtn.addEventListener('click', () => { idx--; update(); });
  window.addEventListener('resize', update);
  update();
}

function growthPct(a, b) {
  return b > 0 ? +((a - b) / b * 100).toFixed(1) : 0;
}

function card(extraClass, html, delayClass = '') {
  const div = document.createElement('div');
  div.className = ['insight-card slide-up', extraClass, delayClass].filter(Boolean).join(' ');
  div.innerHTML = html;
  return div;
}
