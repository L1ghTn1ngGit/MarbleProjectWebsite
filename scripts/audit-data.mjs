import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { validateBudgetRows, exportBudgetRow } from "../src/data/records.js";

const csv = readFileSync(
  new URL("../public/nyc-education-data.csv", import.meta.url),
  "utf8",
);
const parsed = Papa.parse(csv, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: "greedy",
});
assert.deepEqual(
  parsed.errors,
  [],
  "CSV must parse without missing or extra fields",
);
validateBudgetRows(parsed.data);
const doe = parsed.data.filter(
  (row) => row.Agency === "Department of Education",
);
const analyzed = doe.filter(
  (row) => row.Modified >= 0 && row["Cash Expense"] >= 0,
);
const cents = (amount) => Math.round(Number(amount) * 100);
const expected = {
  2023: [12946, 3168275664800, 3124365741340, 410],
  2024: [13075, 3352164446800, 3317488099806, 430],
  2025: [13208, 3476328336900, 3382230552014, 425],
};
assert.equal(parsed.data.length, 43249);
assert.equal(doe.length, 39667);
assert.equal(analyzed.length, 39229);
const summary = [];
for (const [year, totals] of Object.entries(expected)) {
  const rows = analyzed.filter((row) => String(row.Year) === year);
  const budget = rows.reduce((sum, row) => sum + cents(row.Modified), 0);
  const spent = rows.reduce((sum, row) => sum + cents(row["Cash Expense"]), 0);
  const over = rows.filter(
    (row) =>
      row.Modified > 0 &&
      cents(row["Cash Expense"]) * 10 > cents(row.Modified) * 11,
  ).length;
  assert.deepEqual(
    [rows.length, budget, spent, over],
    totals,
    `FY${year} snapshot changed; review source and update the documented audit`,
  );
  summary.push({
    year,
    rows: rows.length,
    budget: budget / 100,
    spent: spent / 100,
    over10Percent: over,
  });
}
const duplicates = (rows) =>
  rows.length - new Set(rows.map((row) => JSON.stringify(row))).size;
console.table(summary);
console.log(
  JSON.stringify(
    {
      sourceRows: parsed.data.length,
      doeRows: doe.length,
      excludedNegative: doe.length - analyzed.length,
      analyzed: analyzed.length,
      exactDuplicates: duplicates(parsed.data),
      analyzedDuplicates: duplicates(analyzed),
    },
    null,
    2,
  ),
);

// Every exported record must survive a CSV round trip with numeric derived values.
const columns = [
  "Year",
  "Department",
  "Budget Name",
  "Modified",
  "Cash Expense",
  "Difference",
  "Status",
];
const exported = analyzed.map((row) => exportBudgetRow(row, columns));
const roundTrip = Papa.parse(Papa.unparse(exported), {
  header: true,
  dynamicTyping: true,
});
assert.deepEqual(roundTrip.errors, []);
assert.equal(roundTrip.data.length, analyzed.length);
for (const [index, row] of roundTrip.data.entries()) {
  assert.equal(
    cents(row.Difference),
    cents(analyzed[index]["Cash Expense"]) - cents(analyzed[index].Modified),
  );
  assert.ok(
    ["Overrun", "Over Budget", "Under Budget", "On Track"].includes(row.Status),
  );
}
const invalid = { ...analyzed[0], Modified: "broken" };
assert.throws(() => validateBudgetRows([invalid]), /Invalid Modified/);
assert.throws(
  () => validateBudgetRows([{ ...analyzed[0], "Cash Expense": "" }]),
  /Invalid Cash Expense/,
);
const zeroBudget = exportBudgetRow({ Modified: 0, "Cash Expense": 25 }, [
  "Difference",
  "Status",
]);
assert.deepEqual(zeroBudget, { Difference: 25, Status: "Over Budget" });
console.log(
  "CSV validation, source totals, export round trip, and invalid-value checks passed.",
);
