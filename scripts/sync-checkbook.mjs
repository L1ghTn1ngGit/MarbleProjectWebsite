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

const API_URL = 'https://www.checkbooknyc.com/api';
const AGENCY_CODE = '040'; // Department of Education
const PAGE_SIZE = 20000;   // Checkbook's per-request maximum
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
    const xml = await post(requestXml(year, from, max));
    if (!/<result>success<\/result>/.test(xml)) {
      throw new Error(`Checkbook API error for FY${year}: ${textOf(xml, 'message') || xml.slice(0, 300)}`);
    }
    total = Number(textOf(xml, 'record_count') || 0);
    const batch = [...xml.matchAll(/<transaction>([\s\S]*?)<\/transaction>/g)].map(m => toRow(m[1]));
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

function requestXml(year, from, max) {
  return `<request>
  <type_of_data>Budget</type_of_data>
  <records_from>${from}</records_from>
  <max_records>${max}</max_records>
  <search_criteria>
    <criteria><name>year</name><type>value</type><value>${year}</value></criteria>
    <criteria><name>agency_code</name><type>value</type><value>${AGENCY_CODE}</value></criteria>
  </search_criteria>
</request>`;
}

// Map Checkbook XML fields to the CSV column names the site already uses.
function toRow(t) {
  const num = tag => Number(textOf(t, tag) || 0);
  return {
    'Accrued Expense': num('accrued_expense'),
    'Adopted': num('adopted'),
    'Agency': textOf(t, 'agency'),
    'Budget Code': textOf(t, 'budget_code'),
    'Budget Name': textOf(t, 'budget_name'),
    'Cash Expense': num('cash_expense'),
    'Committed': num('committed'),
    'Department': textOf(t, 'department'),
    'Encumbered': num('encumbered'),
    'Expense Category': textOf(t, 'expense_category'),
    'Modified': num('modified'),
    'Post Adjustments': num('post_adjustment'),
    'Pre-Encumbered': num('pre_encumbered'),
    'Year': Number(textOf(t, 'year')),
  };
}

function textOf(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1].trim()) : '';
}

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function currentFiscalYear(d = new Date()) {
  // NYC fiscal year N runs July 1 (N-1) to June 30 (N).
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
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
