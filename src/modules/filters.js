import { state } from '../state.js';
import { formatCurrency, getStatusInfo } from '../utils.js';
import { updateMetrics } from './data.js';
import { createCharts } from './charts.js';
import { displayTable, sortTableData } from './table.js';

export function setupFilters() {
  populateDropdowns();

  ['yearFilter', 'searchBox', 'tableYearFilter', 'programFilter', 'departmentFilter'].forEach(id => {
    const field = document.getElementById(id);
    field.addEventListener('input', applyAll);
    field.addEventListener('change', applyAll);
  });

  document.getElementById('tableSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      displayTable();
      return;
    }
    renderHits(state.filteredData.filter(row => rowMatchesQuery(row, q)));
  });

  document.getElementById('prevPage').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      displayTable();
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    const total = Math.ceil(state.filteredData.length / state.recordsPerPage);
    if (state.currentPage < total) {
      state.currentPage++;
      displayTable();
    }
  });
}

function applyAll() {
  const year = document.getElementById('yearFilter').value;
  const tableYear = document.getElementById('tableYearFilter').value;
  const program = document.getElementById('programFilter').value;
  const department = document.getElementById('departmentFilter').value;
  const search = document.getElementById('searchBox').value.toLowerCase().trim();

  state.filteredData = state.allData.filter(row => {
    const rowYear = row.Year?.toString();
    if (year !== 'all' && rowYear !== year) return false;
    if (tableYear !== 'all' && rowYear !== tableYear) return false;
    if (program !== 'all' && normalizeName(row['Budget Name']) !== program) return false;
    if (department !== 'all' && normalizeName(row.Department) !== department) return false;
    if (search && !rowMatchesQuery(row, search)) return false;
    return true;
  });

  state.currentPage = 1;
  sortTableData();
  updateMetrics();
  createCharts();
  displayTable();
}

function rowMatchesQuery(row, q) {
  return (
    (row.Department && row.Department.toLowerCase().includes(q)) ||
    (row['Budget Name'] && row['Budget Name'].toLowerCase().includes(q)) ||
    (row.Agency && row.Agency.toLowerCase().includes(q)) ||
    (row.Year && row.Year.toString().includes(q))
  );
}

function populateDropdowns() {
  const programs = new Map();
  const departments = new Map();

  for (const row of state.allData) {
    const program = normalizeName(row['Budget Name']);
    const department = normalizeName(row.Department);
    if (program) programs.set(program, categorizeProgram(program));
    if (department) departments.set(department, categorizeDepartment(department));
  }

  const programSelect = document.getElementById('programFilter');
  const departmentSelect = document.getElementById('departmentFilter');

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

    const group = document.createElement('optgroup');
    group.label = category;
    values.sort((a, b) => a.localeCompare(b)).forEach(value => {
      group.appendChild(Object.assign(document.createElement('option'), { value, textContent: value }));
    });
    select.appendChild(group);
  }
}

function normalizeName(value) {
  return (value || '')
    .toString()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*-/g, ' -')
    .replace(/-\s*/g, '- ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categorizeProgram(value) {
  const name = value.toLowerCase();
  if (name.includes('special education') || name.includes('sped') || name.includes('se ')) return 'Special education';
  if (name.includes('pre-k') || name.includes('earlylearn') || name.includes('early childhood') || name.includes('head start')) return 'Early childhood';
  if (name.includes('youth') || name.includes('after school') || name.includes('beacon') || name.includes('compass') || name.includes('sonyc') || name.includes('community')) return 'Youth and community';
  if (name.includes('admin') || name.includes('office') || name.includes('central') || name.includes('finance') || name.includes('budget') || name.includes('management')) return 'Administration and finance';
  if (name.includes('transport') || name.includes('safety') || name.includes('security') || name.includes('bus')) return 'Safety and transportation';
  if (name.includes('lease') || name.includes('facility') || name.includes('maint') || name.includes('custodial') || name.includes('energy') || name.includes('food service')) return 'Operations and facilities';
  if (name.includes('grant') || name.includes('arpa') || name.includes('crrsa') || name.includes('fema') || name.includes('cdbg') || name.includes('federal')) return 'Grants and relief';
  if (name.includes('charter') || name.includes('non-public') || name.includes('nps')) return 'Charter and non-public';
  if (name.includes('instruction') || name.includes('school supervision') || name.includes('teacher') || name.includes('curriculum') || name.includes('learning')) return 'Core instruction';
  return 'Other';
}

function categorizeDepartment(value) {
  const name = value.toLowerCase();
  if (name.includes('special ed') || name.includes('sped')) return 'Special education';
  if (name.includes('pre-k') || name.includes('early childhood')) return 'Early childhood';
  if (name.includes('instruction') || name.includes('school') || name.includes('curriculum') || name.includes('learning')) return 'Core instruction';
  if (name.includes('safety') || name.includes('transport') || name.includes('maintenance') || name.includes('operations') || name.includes('facil') || name.includes('cust')) return 'Operations and facilities';
  if (name.includes('admin') || name.includes('office') || name.includes('finance') || name.includes('management') || name.includes('budget')) return 'Administration and finance';
  if (name.includes('youth') || name.includes('community') || name.includes('student')) return 'Youth and community';
  if (name.includes('charter') || name.includes('non-public') || name.includes('nps')) return 'Charter and non-public';
  if (name.includes('grant') || name.includes('relief')) return 'Grants and relief';
  if (name.includes('transport')) return 'Safety and transportation';
  return 'Other';
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
  const frag = document.createDocumentFragment();

  for (const row of slice) {
    const modified = parseFloat(row['Modified']) || 0;
    const cash = parseFloat(row['Cash Expense']) || 0;
    const diff = cash - modified;
    const status = getStatusInfo(diff, modified);
    const tr = document.createElement('tr');

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

const PROGRAM_ORDER = [
  'Core instruction',
  'Special education',
  'Early childhood',
  'Youth and community',
  'Operations and facilities',
  'Administration and finance',
  'Safety and transportation',
  'Grants and relief',
  'Charter and non-public',
  'Other'
];

const DEPARTMENT_ORDER = [
  'Core instruction',
  'Special education',
  'Early childhood',
  'Youth and community',
  'Operations and facilities',
  'Administration and finance',
  'Safety and transportation',
  'Grants and relief',
  'Charter and non-public',
  'Other'
];
