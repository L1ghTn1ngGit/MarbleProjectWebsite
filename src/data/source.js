import Papa from "papaparse";
import { REQUIRED_COLUMNS, validateBudgetRows } from "./records.js";
import { DATA_CONFIG } from "./config.js";

// Every adapter returns rows shaped like the original CSV (same column names),
// so the rest of the site never needs to know where data came from.
//
// Returns { rows, meta } where meta = { source, label, url, fetchedAt, totalRows, agencyRows, agency }.
export async function loadBudgetData(config = DATA_CONFIG) {
  const { rows, fetchedAt } =
    config.source === "snapshot"
      ? await loadSnapshot(config.snapshotManifestUrl)
      : await loadCsv(config.csvUrl);

  validateBudgetRows(rows);
  const valid = rows;
  const scoped = config.agency
    ? valid.filter((row) => row.Agency === config.agency)
    : valid;

  return {
    rows: scoped,
    meta: {
      source: config.source,
      label: config.sourceLabel,
      url: config.sourceUrl,
      fetchedAt,
      totalRows: valid.length,
      agencyRows: scoped.length,
      agency: config.agency,
    },
  };
}

async function loadCsv(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to load ${url} (${response.status})`);
  const text = await response.text();
  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    throw new Error(`Invalid CSV: ${parsed.errors[0].message}`);
  for (const column of REQUIRED_COLUMNS) {
    if (!parsed.meta.fields.includes(column))
      throw new Error(`Missing required column: ${column}`);
  }
  return { rows: parsed.data, fetchedAt: null };
}

// Snapshot format (written by scripts/sync-checkbook.mjs):
//   manifest.json -> { fetchedAt, source, files: [{ year, path, records }] }
//   each file     -> [{ Agency, Year, Department, ... }]  (CSV column names)
async function loadSnapshot(manifestUrl) {
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`Failed to load ${manifestUrl} (${res.status})`);
  const manifest = await res.json();
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
  const parts = await Promise.all(
    manifest.files.map(async (f) => {
      const r = await fetch(base + f.path);
      if (!r.ok) throw new Error(`Failed to load ${f.path} (${r.status})`);
      return r.json();
    }),
  );
  return { rows: parts.flat(), fetchedAt: manifest.fetchedAt };
}
