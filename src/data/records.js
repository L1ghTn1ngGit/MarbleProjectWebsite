import { getStatusInfo } from "../utils.js";

export const REQUIRED_COLUMNS = [
  "Agency",
  "Year",
  "Department",
  "Budget Name",
  "Modified",
  "Cash Expense",
];


export function validateBudgetRows(rows) {
  for (const [index, row] of rows.entries()) {
    for (const column of REQUIRED_COLUMNS) {
      if (!(column in row))
        throw new Error(`Missing required column: ${column}`);
    }
    if (!String(row.Agency ?? "").trim() || !/^\d{4}$/.test(String(row.Year))) {
      throw new Error(`Invalid agency or fiscal year on data row ${index + 1}`);
    }
    for (const column of ["Modified", "Cash Expense"]) {
      const amount = row[column];
      if (
        amount === null ||
        String(amount).trim() === "" ||
        !Number.isFinite(Number(amount))
      ) {
        throw new Error(`Invalid ${column} on data row ${index + 1}`);
      }
    }
  }
}


export function exportBudgetRow(row, columns) {
  const budget = Number(row.Modified);
  const spent = Number(row["Cash Expense"]);
  const difference = Math.round((spent - budget) * 100) / 100;
  const values = {
    ...row,
    Difference: difference,
    Status: getStatusInfo(difference, budget).label,
  };
  return Object.fromEntries(columns.map((column) => [column, values[column]]));
}
