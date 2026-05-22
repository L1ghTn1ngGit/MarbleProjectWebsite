export const state = {
  allData: [],
  filteredData: [],
  currentPage: 1,
  recordsPerPage: 50,
  tableSort: { key: 'Difference', order: 'desc' },
  visibleColumns: ['Year','Department','Budget Name','Modified','Cash Expense','Difference','Status'],
  charts: {},
};
