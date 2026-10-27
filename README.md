# Marble Foundation website

A static, Vite-powered site for exploring the bundled NYC Department of Education budget data. The interface keeps the original maps and slideshow, with warm neutral surfaces, readable tables, and manual playback by default.

## Local development

Use Node.js 20.19+ (Node 22.12+ recommended).

```powershell
npm ci
npm run dev
```

## Checks and production build

```powershell
npm test
npm run format:check
npm run build
npm run preview
```

`npm test` validates the bundled CSV, verifies fiscal-year totals in cents, and round-trips every analyzed row through CSV export. See [DATA_AUDIT.md](DATA_AUDIT.md) for scope and limitations.

## Data and interactions

- Source file: `public/nyc-education-data.csv`, a frozen FY2023–FY2025 snapshot attributed to Checkbook NYC. This is not a live feed.
- The source contains 43,249 rows across multiple agencies. Only DOE rows with nonnegative working budget and cash expense enter the analysis (39,229 rows).
- Search and filters share one dataset for the summary totals, spending chart, paginated table, and export. Overruns and insights summarize the full dataset and are labeled accordingly.
- Export retains source department/program names and numeric amounts, with calculated Difference and Status fields. CSV and JSON are supported.
- Budget means the working budget, including in-year changes. Difference means cash expense minus working budget. Source rows with zero working budgets remain visible but are excluded from percentage-overrun counts.
- Identical rows remain in the source; there is no unique record identifier to support safe deduplication.

## Code map

- `src/main.js`: page initialization.
- `src/data/`: source configuration, CSV validation, export record mapping.
- `src/modules/`: charts, filtering, table controls, navigation, slideshow, insights, and readable labels.
- `src/style.css`: original site styles; `src/refinement.css`: scoped theme and layout refinements.
- `scripts/audit-data.mjs`: repeatable data integrity checks.
- `public/`: CSV, video, and favicon. Root SVGs and `fonts/` are resolved by Vite at build time.

For Vercel, use `npm run build` and output directory `dist`. Build output and local experiments are not committed. The optional Checkbook snapshot adapter is configured in `src/data/config.js`; review `API_MIGRATION_PLAN.md` before changing the source. The sync script is experimental and is not run during builds.
