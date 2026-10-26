export const state = {
  allData: [],
  meta: null,
  filteredData: [],
  currentPage: 1,
  recordsPerPage: 50,
  tableSort: { key: "Year", order: "desc" },
  lockedSort: null,
  visibleColumns: [
    "Year",
    "Department",
    "Budget Name",
    "Modified",
    "Cash Expense",
    "Difference",
    "Status",
  ],
  charts: {},
};
