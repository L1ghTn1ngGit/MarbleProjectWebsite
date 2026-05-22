import Papa from 'papaparse';
import { state } from '../state.js';
import { formatCurrency, getStatusInfo } from '../utils.js';

export function displayTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const start = (state.currentPage - 1) * state.recordsPerPage;
  const end   = state.recordsPerPage === 'all' ? state.filteredData.length : start + state.recordsPerPage;
  const page  = state.recordsPerPage === 'all' ? state.filteredData.slice(0) : state.filteredData.slice(start, end);

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No records found</td></tr>';
    updateFooter(0, 0, 0);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const row of page) {
    frag.appendChild(buildRow(row));
  }
  tbody.appendChild(frag);

  updateFooter(start, end, state.filteredData.length);
}

function buildRow(row) {
  const modified = parseFloat(row['Modified'])     || 0;
  const cash     = parseFloat(row['Cash Expense']) || 0;
  const diff     = cash - modified;
  const status   = getStatusInfo(diff, modified);
  const tr       = document.createElement('tr');

  tr.innerHTML = `
    <td class="col-year" data-label="Year">${row.Year}</td>
    <td class="col-dept" data-label="Department">${row.Department || '—'}</td>
    <td class="col-prog" data-label="Program">${row['Budget Name'] || '—'}</td>
    <td class="col-money" data-label="Budget">${formatCurrency(modified)}</td>
    <td class="col-money" data-label="Spent">${formatCurrency(cash)}</td>
    <td class="col-money col-diff ${diff > 0 ? 'diff-over' : diff < 0 ? 'diff-under' : ''}" data-label="Difference">${formatCurrency(diff)}</td>
    <td class="col-status" data-label="Status">
      <span class="badge badge-${status.type}">${status.label}</span>
    </td>`;

  return tr;
}

function updateFooter(start, end, total) {
  const totalPages = state.recordsPerPage === 'all' ? 1 : Math.ceil(total / state.recordsPerPage) || 1;
  document.getElementById('recordCount').textContent =
    total ? `${start + 1}–${Math.min(end, total)} of ${total}` : 'No records';
  document.getElementById('pageInfo').textContent = `${state.currentPage} / ${totalPages}`;
  document.getElementById('prevPage').disabled = state.currentPage === 1;
  document.getElementById('nextPage').disabled = state.currentPage >= totalPages;
}

function applyColumnVisibility() {
  const cols = state.visibleColumns;
  const mapping = {
    'Year': '.col-year',
    'Department': '.col-dept',
    'Budget Name': '.col-prog',
    'Modified': '.col-money',
    'Cash Expense': '.col-money',
    'Difference': '.col-money',
    'Status': '.col-status'
  };

  Object.entries(mapping).forEach(([label, selector]) => {
    const show = cols.includes(label);
    document.querySelectorAll(`thead ${selector}`)?.forEach(el => el.style.display = show ? '' : 'none');
    document.querySelectorAll(`tbody ${selector}`)?.forEach(el => el.style.display = show ? '' : 'none');
  });
}

export function setupSorting() {
  let col   = null;
  let order = 'asc';

  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      order = col === key ? (order === 'asc' ? 'desc' : 'asc') : 'asc';
      col   = key;

      document.querySelectorAll('.sortable').forEach(h => h.dataset.sort !== key && h.removeAttribute('data-order'));
      th.setAttribute('data-order', order);

      state.filteredData.sort((a, b) => {
        const va = sortVal(a, key);
        const vb = sortVal(b, key);
        if (typeof va === 'string') return order === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return order === 'asc' ? va - vb : vb - va;
      });

      state.currentPage = 1;
      displayTable();
    });
  });
}

export function setupTableControls() {
  const rowsSel = document.getElementById('rowsPerPage');
  const colBtn  = document.getElementById('columnToggle');
  const columnsModal = document.getElementById('columnsModal');
  const columnsList  = document.getElementById('columnsList');
  const applyBtn = document.getElementById('columnsApplyBtn');
  const cancelBtn = document.getElementById('columnsCancelBtn');

  if (rowsSel) {
    rowsSel.value = state.recordsPerPage;
    rowsSel.addEventListener('change', () => {
      const v = rowsSel.value === 'all' ? 'all' : parseInt(rowsSel.value, 10);
      state.recordsPerPage = v;
      state.currentPage = 1;
      displayTable();
    });
  }

  if (!columnsModal || !columnsList || !colBtn) return;

  const allCols = ['Year','Department','Budget Name','Modified','Cash Expense','Difference','Status'];

  function renderColumnsList(target) {
    target.innerHTML = '';
    allCols.forEach(col => {
      const id = `col_${col.replace(/\s+/g,'')}`;
      const div = document.createElement('div');
      div.innerHTML = `<label><input type="checkbox" id="${id}" value="${col}" ${state.visibleColumns.includes(col)?'checked':''}> ${col}</label>`;
      target.appendChild(div);
    });
  }

  colBtn.addEventListener('click', () => {
    renderColumnsList(columnsList);
    columnsModal.classList.remove('hidden');
  });

  applyBtn.addEventListener('click', () => {
    const checked = Array.from(columnsList.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
    state.visibleColumns = checked.length ? checked : allCols;
    applyColumnVisibility();
    columnsModal.classList.add('hidden');
  });

  cancelBtn.addEventListener('click', () => columnsModal.classList.add('hidden'));

  columnsModal.addEventListener('click', e => {
    if (e.target === columnsModal || e.target.classList.contains('export-modal__backdrop')) columnsModal.classList.add('hidden');
  });

  applyColumnVisibility();
}

function sortVal(row, key) {
  if (key === 'Modified' || key === 'Cash Expense') return parseFloat(row[key]) || 0;
  if (key === 'Difference') return (parseFloat(row['Cash Expense']) || 0) - (parseFloat(row['Modified']) || 0);
  if (key === 'Status') {
    const mod = parseFloat(row['Modified']) || 0;
    const d   = (parseFloat(row['Cash Expense']) || 0) - mod;
    if (d > mod * 0.5 && mod > 0) return 3;
    if (d > 0) return 2;
    if (d < 0) return 1;
    return 0;
  }
  return row[key] || '';
}

export function setupExportModal() {
  const modal     = document.getElementById('exportModal');
  const pageBtn   = document.getElementById('exportPageBtn');
  const allBtn    = document.getElementById('exportAllBtn');
  const cancelBtn = document.getElementById('exportCancelBtn');
  const trigger   = document.getElementById('exportData');
  if (!modal || !trigger) return;

  const open  = () => modal.classList.remove('hidden');
  const close = () => modal.classList.add('hidden');

  const doExport = (pageOnly) => {
    const start = (state.currentPage - 1) * state.recordsPerPage;
    const data  = pageOnly
      ? (state.recordsPerPage === 'all' ? state.filteredData.slice(0) : state.filteredData.slice(start, start + state.recordsPerPage))
      : state.filteredData;

    const format = document.getElementById('exportFormat')?.value ?? 'csv';
    const delim  = document.getElementById('exportDelimiter')?.value ?? ',';
    const includeHeaders = document.getElementById('exportHeaders')?.checked ?? true;

    const colChecks = document.querySelectorAll('#exportColumnsList input[type=checkbox]');
    const selectedCols = colChecks.length ? Array.from(colChecks).filter(i=>i.checked).map(i=>i.value) : null;

    const rows = data.map(r => {
      if (!selectedCols) return r;
      const obj = {};
      selectedCols.forEach(k => { obj[k] = r[k]; });
      return obj;
    });

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: pageOnly ? 'education-budget-page.json' : 'education-budget-all.json' }).click();
      return;
    }

    const csv = Papa.unparse(rows, { delimiter: delim, header: includeHeaders });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), {
      href: url,
      download: pageOnly ? `education-budget-page.${format}` : `education-budget-all.${format}`,
    }).click();
  };

  trigger.addEventListener('click', open);
  pageBtn.addEventListener('click',   () => { doExport(true);  close(); });
  allBtn.addEventListener('click',    () => { doExport(false); close(); });
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('export-modal__backdrop')) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('export-modal__backdrop')) close();
  });

  document.getElementById('exportData')?.addEventListener('click', () => {
    const list = document.getElementById('exportColumnsList');
    if (!list) return;
    list.innerHTML = '';
    const allCols = ['Year','Department','Budget Name','Modified','Cash Expense','Difference','Status'];
    allCols.forEach(col => {
      const id = `exp_${col.replace(/\s+/g,'')}`;
      const div = document.createElement('div');
      div.innerHTML = `<label><input type="checkbox" id="${id}" value="${col}" ${state.visibleColumns.includes(col)?'checked':''}> ${col}</label>`;
      list.appendChild(div);
    });
  });
}
