import { state } from '../state.js';
import { formatCurrency, getStatusInfo } from '../utils.js';
import { updateMetrics } from './data.js';
import { createCharts } from './charts.js';
import { displayTable } from './table.js';

export function setupFilters() {
  populateDropdowns();

  ['yearFilter', 'searchBox', 'tableYearFilter', 'programFilter', 'departmentFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', applyAll);
    document.getElementById(id).addEventListener('change', applyAll);
  });

  document.getElementById('tableSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) { displayTable(); return; }
    renderHits(state.filteredData.filter(row => rowMatchesQuery(row, q)));
  });

  document.getElementById('prevPage').addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage--; displayTable(); }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    const total = Math.ceil(state.filteredData.length / state.recordsPerPage);
    if (state.currentPage < total) { state.currentPage++; displayTable(); }
  });
}

function applyAll() {
  const year   = document.getElementById('yearFilter').value;
  const tYear  = document.getElementById('tableYearFilter').value;
  const prog   = document.getElementById('programFilter').value;
  const dept   = document.getElementById('departmentFilter').value;
  const search = document.getElementById('searchBox').value.toLowerCase().trim();

  state.filteredData = state.allData.filter(row => {
    const y = row.Year?.toString();
    if (year  !== 'all' && y !== year)  return false;
    if (tYear !== 'all' && y !== tYear) return false;
    if (prog  !== 'all' && row['Budget Name'] !== prog) return false;
    if (dept  !== 'all' && row.Department !== dept) return false;
    if (search && !rowMatchesQuery(row, search)) return false;
    return true;
  });

  state.currentPage = 1;
  updateMetrics();
  createCharts();
  displayTable();
}

function rowMatchesQuery(row, q) {
  return (
    (row.Department   && row.Department.toLowerCase().includes(q))   ||
    (row['Budget Name'] && row['Budget Name'].toLowerCase().includes(q)) ||
    (row.Agency       && row.Agency.toLowerCase().includes(q))       ||
    (row.Year         && row.Year.toString().includes(q))
  );
}

function populateDropdowns() {
  const programs    = new Set();
  const departments = new Set();

  for (const row of state.allData) {
    if (row['Budget Name']) programs.add(row['Budget Name']);
    if (row.Department)     departments.add(row.Department);
  }

  const progSel = document.getElementById('programFilter');
  const deptSel = document.getElementById('departmentFilter');

  Array.from(programs).sort().forEach(p => {
    progSel.appendChild(Object.assign(document.createElement('option'), { value: p, textContent: p }));
  });
  Array.from(departments).sort().forEach(d => {
    deptSel.appendChild(Object.assign(document.createElement('option'), { value: d, textContent: d }));
  });
}

function renderHits(hits) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (!hits.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No results found</td></tr>';
    document.getElementById('recordCount').textContent = 'No results';
    return;
  }

  const slice = hits.slice(0, state.recordsPerPage);
  const frag  = document.createDocumentFragment();

  for (const row of slice) {
    const modified = parseFloat(row['Modified'])     || 0;
    const cash     = parseFloat(row['Cash Expense']) || 0;
    const diff     = cash - modified;
    const status   = getStatusInfo(diff, modified);
    const tr       = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-year">${row.Year}</td>
      <td class="col-dept">${row.Department || '—'}</td>
      <td class="col-prog">${row['Budget Name'] || '—'}</td>
      <td class="col-money">${formatCurrency(modified)}</td>
      <td class="col-money">${formatCurrency(cash)}</td>
      <td class="col-money col-diff ${diff > 0 ? 'diff-over' : diff < 0 ? 'diff-under' : ''}">${formatCurrency(diff)}</td>
      <td class="col-status"><span class="badge badge-${status.type}">${status.label}</span></td>`;
    frag.appendChild(tr);
  }

  tbody.appendChild(frag);
  document.getElementById('recordCount').textContent = `${slice.length} of ${hits.length} results`;
}
