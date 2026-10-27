# Plan: from a static CSV to the Checkbook NYC API

Status: **researched and prototyped (Oct 24, 2026). Not switched on.** The site still reads the CSV. One setting (`src/data/config.js`, `source: 'snapshot'`) switches it once the steps below are approved.

## What we found

| Question | Answer (verified) |
|---|---|
| Where does the current CSV come from? | **Checkbook NYC Budget data** (NYC Comptroller). Its columns match the Checkbook Budget API field for field. The footer said "NYC Open Data"; it now says Checkbook NYC. |
| Does the API reproduce the CSV? | Yes. For FY2023 DOE: 13,096 records in both, identical adopted and working budgets, and cash spent within 0.01% (about $4.4M of $31.2B, consistent with late postings). |
| Is newer data available? | Yes. **FY2026 (complete, 13,507 DOE lines)** and **FY2027 (in progress, 13,516 lines)**. The CSV stops at FY2025. |
| Can the browser call it directly? | **No.** It returns XML over POST with no CORS headers, and the human-facing Checkbook website sits behind an Imperva CAPTCHA. The `/api` endpoint answered automated requests without a CAPTCHA in testing, but that could change. |
| Does NYC Open Data have the same thing? | Only partly. [Expense Budget (mwzb-yiwb)](https://data.cityofnewyork.us/d/mwzb-yiwb) has adopted and modified **budgets** by line (browser-friendly, no key, updated three times a year) but **no actual spending**. Actuals on Open Data are agency-level totals only. The site's overrun analysis needs line-level actuals, so Checkbook is the primary source. |
| Data issue found | The CSV contains ~3,600 lines from other agencies (CUNY, Police, Parks, Pension Contributions…). The site described all of it as DOE spending ($110.74B for FY23–25). It is now scoped to DOE only: **39,229 lines, $98.24B spent** (`agency` in `src/data/config.js`). |

## Recommended architecture: scheduled snapshot, not live calls

```
Checkbook NYC API ──(nightly, server-side)──> scripts/sync-checkbook.mjs
        │                                          │ writes
        │                                          ▼
        │                         public/data/doe-budget-FY2023..2027.json + manifest.json
        │                                          │ committed to git, deployed by Vercel
        ▼                                          ▼
  (never called by visitors)          site reads snapshot (src/data/source.js)
```

Why a snapshot instead of calling the API on every page view:
- **Reliability:** if Checkbook is down, rate limits, or adds bot protection to `/api`, the site keeps working with the last good data.
- **Speed and cost:** each year is ~13.5k records (4.4 MB JSON, ~275 KB compressed). Fetching from Checkbook per visitor would be slow and impolite.
- **Accountability:** every data change is a git commit, so you can show exactly what changed and when. That matters for a transparency project.
- **Security:** no server code runs on visitor requests, so there's no API key to leak and no endpoint to abuse.

## Steps

1. **Done:** shared data layer (`src/data/source.js`, `config.js`). Both site versions use it, and switching sources is one setting.
2. **Done:** `scripts/sync-checkbook.mjs` (no dependencies, Node 18+). Tested for FY2023 against the CSV.
3. **Run the full sync** (FY2023–FY2027) and review the totals it prints. Decide how to label FY2027 as in progress (spending through today vs. full-year budget makes overruns look smaller mid-year).
4. **Switch** `source: 'snapshot'` and check the site. The year filters, trends card, record counts and source note already adapt to new years.
5. **Automate:** a GitHub Action on a nightly schedule runs the sync. If totals change, it commits `public/data/` and Vercel redeploys. It fails loudly (no commit) if the API errors or record counts drop by more than ~5% versus the last snapshot (a guard against partial pulls).
6. **Show freshness:** a "Data retrieved [date] from Checkbook NYC" line (already wired: `#sourceNote` shows the date when the source is a snapshot).
7. **Optional later:** add the OMB Expense Budget (Open Data) as a cross-check of budget totals, and a serverless `/api/latest` endpoint if real-time data is ever needed (it isn't for annual budget data).

## Decisions for the owner
- Include FY2027 (partial year) or only completed years by default?
- Keep the DOE-only scope (recommended, matches the site's claims), or present multiple agencies with an agency filter?
- Slideshow says the DOE gets $38.3B. Checkbook DOE cash spending is ~$33–34B per year. The gap is likely pensions, debt service and fringe benefits budgeted outside the DOE agency code. The slide needs a source and a definition.
- Approve adding a GitHub Action (runs in your GitHub account, needs permission to push commits).

## Risks
- Checkbook could add bot protection to `/api`. Mitigation: the snapshot keeps the site working, and the sync job alerts.
- Checkbook has no published rate limit. The script waits 1.5s between pages and retries with backoff.
- Field definitions can change. The script maps fields explicitly and the site's methodology note documents them.
