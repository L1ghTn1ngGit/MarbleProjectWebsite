# Bundled CSV audit

The audit checks internal consistency of the existing snapshot. It does not establish that the file is complete or reconcile it against a fresh Checkbook NYC download. No source rows were edited or removed from the CSV. The CSV is byte-identical to the original website's copy.

## Scope

- Source: 43,249 rows, FY2023–FY2025.
- Department of Education: 39,667 rows.
- Excluded from analysis: 438 DOE rows with negative working budgets or cash expenses.
- Analyzed: 39,229 rows.
- Parsing: no malformed rows, missing required columns, or invalid budget/spending amounts.
- Exact duplicate rows: 149 in the entire CSV; 123 within the analyzed rows. Retained because the file has no unique record ID and repeated rows cannot safely be classified as erroneous.

## Totals for analyzed rows

| Fiscal year | Rows | Working budget | Cash expense | Lines >10% over budget |
| --- | ---: | ---: | ---: | ---: |
| 2023 | 12,946 | $31,682,756,648.00 | $31,243,657,413.40 | 410 |
| 2024 | 13,075 | $33,521,644,468.00 | $33,174,880,998.06 | 430 |
| 2025 | 13,208 | $34,763,283,369.00 | $33,822,305,520.14 | 425 |
| Total | 39,229 | $99,967,684,485.00 | $98,240,843,931.60 | 1,265 |

Dollar sums are verified in integer cents by `npm test`. The test locks the existing snapshot totals; any intentional source replacement requires reviewing these expectations.

## Export corrections

Search now participates in the same filtering and pagination pipeline as other controls, so visible results and exported rows agree. Export calculates Difference and Status explicitly, rather than reading nonexistent source columns. Amounts remain numeric; labels shown in the UI do not overwrite raw program or department names. Formula-like text is escaped in CSV downloads. The audit round-trips every analyzed record and checks the derived amounts and statuses.

## Interpretation limits

Negative source adjustments are excluded by the inherited analysis policy and therefore these totals are not net agency accounts. Zero-budget lines with spending have no meaningful percentage overrun. Counts represent source budget lines, not unique programs, contracts, students, or projects. Overruns alone do not explain the reason for spending differences. Slideshow budget facts are inherited context and are not calculated from this snapshot; the forecast is explicitly illustrative.
