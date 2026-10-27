#!/usr/bin/env node
// Pulls NYC Department of Education budget lines from the Checkbook NYC Budget API
// and writes one JSON file per fiscal year plus a manifest, using the same column
// names as public/nyc-education-data.csv. See API_MIGRATION_PLAN.md.
//
// Usage:
//   node scripts/sync-checkbook.mjs                      # FY2023..current FY into public/data
//   node scripts/sync-checkbook.mjs --years 2025-2027 --out public/data
//   node scripts/sync-checkbook.mjs --years 2025 --sample 5 --out ./tmp-data   # quick test
//
// No dependencies; needs Node 18+ (global fetch). Read-only requests, one per 20,000 records.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CHECKBOOK_API_URL as API_URL, PAGE_SIZE, currentFiscalYear, parseResponse, requestXml } from '../src/data/checkbook.js';

const PAUSE_MS = 1500;     // be polite between requests

const args = parseArgs(process.argv.slice(2));
const outDir = args.out || 'public/data';
const sample = args.sample ? Number(args.sample) : null;
const years = parseYears(args.years || `2023-${currentFiscalYear()}`);

const files = [];
for (const year of years) {
  const rows = await fetchYear(year);
  const path = `doe-budget-FY${year}.json`;
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, path), JSON.stringify(rows));
  files.push({ year, path, records: rows.length, cashExpense: round(sum(rows, 'Cash Expense')), modified: round(sum(rows, 'Modified')) });
  console.log(`FY${year}: ${rows.length} records, cash expense ${fmt(sum(rows, 'Cash Expense'))}, working budget ${fmt(sum(rows, 'Modified'))}`);
}

const manifest = {
  fetchedAt: new Date().toISOString(),
  source: 'Checkbook NYC Budget API (type_of_data=Budget, agency_code=040)',
  sourceUrl: API_URL,
  sample: sample || undefined,
  files,
};
await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${files.length} file(s) and manifest.json to ${outDir}`);

async function fetchYear(year) {
  const rows = [];
  let from = 1;
  let total = Infinity;
  while (from <= total) {
    const max = sample ? Math.min(sample, PAGE_SIZE) : PAGE_SIZE;
    const page = parseResponse(await post(requestXml(year, from, max)), year);
    total = page.total;
    const batch = page.rows;
    rows.push(...batch);
    if (sample || batch.length === 0) break;
    from += batch.length;
    if (from <= total) await sleep(PAUSE_MS);
  }
  return rows;
}

async function post(body, attempt = 1) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml', 'User-Agent': 'MarbleFoundation-budget-sync/1.0' },
    body,
  });
  const text = await res.text();
  if (res.ok && text.startsWith('<?xml')) return text;
  if (attempt < 3) {
    await sleep(PAUSE_MS * attempt * 2);
    return post(body, attempt + 1);
  }
  throw new Error(`Checkbook API returned ${res.status} (${res.headers.get('content-type')}). It may be rate limiting or blocking automated requests.`);
}

function parseYears(spec) {
  const [a, b] = String(spec).split('-').map(Number);
  const out = [];
  for (let y = a; y <= (b || a); y++) out.push(y);
  return out;
}

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith('--')) out[list[i].slice(2)] = list[i + 1] && !list[i + 1].startsWith('--') ? list[++i] : true;
  }
  return out;
}

function sum(rows, key) { return rows.reduce((s, r) => s + (r[key] || 0), 0); }
function round(n) { return Math.round(n * 100) / 100; }
function fmt(n) { return '$' + (n / 1e9).toFixed(2) + 'B'; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
