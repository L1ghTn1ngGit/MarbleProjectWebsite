// tries the live api first then falls back to the saved data, dont delete the csv
import Papa from "papaparse";
import { REQUIRED_COLUMNS, validateBudgetRows } from "./records.js";
import { DATA_CONFIG } from "./config.js";


const ADAPTERS = {
  api: (config, options) => loadApi(config.apiUrl, config.apiYears, options),
  snapshot: (config, options) => loadSnapshot(config.snapshotManifestUrl, options),
  csv: (config, options) => loadCsv(config.csvUrl, options),
};

export async function loadBudgetData(config = DATA_CONFIG, { onProgress, onStage } = {}) {
  const order = config.sources || [config.source || "csv"];
  const fallbacks = [];
  for (const source of order) {
    const adapter = ADAPTERS[source];
    if (!adapter) continue;
    onStage?.(source, fallbacks.at(-1) || null);
    const timeout = config.timeoutMs?.[source] ?? 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeout / 1000}s`)), timeout);
    try {
      const { rows, fetchedAt } = await adapter(config, { onProgress, signal: controller.signal });
      validateBudgetRows(rows);
      if (!rows.length) throw new Error("no records");
      const scoped = config.agency ? rows.filter((row) => row.Agency === config.agency) : rows;
      if (!scoped.length) throw new Error(`no ${config.agency} records`);
      return {
        rows: scoped,
        meta: {
          source,
          label: config.sourceLabel,
          url: config.sourceUrl,
          fetchedAt,
          totalRows: rows.length,
          agencyRows: scoped.length,
          agency: config.agency,
          fallbacks,
        },
      };
    } catch (error) {
      const reason = controller.signal.aborted ? controller.signal.reason?.message || "timed out" : error.message;
      fallbacks.push({ source, reason });
      if (source !== order.at(-1)) console.info(`Budget data: ${source} unavailable (${reason}); trying the next source.`);
    } finally {
      clearTimeout(timer);
    }
  }
  const detail = fallbacks.map((item) => `${item.source}: ${item.reason}`).join("; ");
  throw new Error(`No budget data source answered (${detail})`);
}


async function loadApi(url, years, { onProgress, signal }) {
  if (!url || !years?.length) throw new Error("API not configured");
  let done = 0;
  const parts = await Promise.all(
    years.map(async (year) => {
      const response = await fetch(`${url}?year=${encodeURIComponent(year)}`, { signal, headers: { Accept: "application/json" } });
      const type = response.headers.get("content-type") || "";

      if (!response.ok || !type.includes("application/json")) throw new Error(`FY${year}: HTTP ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body.rows)) throw new Error(`FY${year}: malformed response`);
      onProgress?.(++done / years.length);
      return body;
    }),
  );
  const fetchedAt = parts.map((part) => part.fetchedAt).filter(Boolean).sort()[0] || null;
  return { rows: parts.flatMap((part) => part.rows), fetchedAt };
}

async function loadCsv(url, { onProgress, signal } = {}) {
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(`Failed to load ${url} (${response.status})`);
  const text = onProgress
    ? await readWithProgress(response, onProgress)
    : await response.text();
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


async function loadSnapshot(manifestUrl, { onProgress, signal } = {}) {
  const res = await fetch(manifestUrl, { signal });
  if (!res.ok || !(res.headers.get("content-type") || "").includes("json"))
    throw new Error(`no snapshot at ${manifestUrl} (${res.status})`);
  const manifest = await res.json();
  if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error("empty snapshot manifest");
  let done = 0;
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);
  const parts = await Promise.all(
    manifest.files.map(async (f) => {
      const r = await fetch(base + f.path, { signal });
      if (!r.ok) throw new Error(`Failed to load ${f.path} (${r.status})`);
      const rows = await r.json();
      onProgress?.(++done / manifest.files.length);
      return rows;
    }),
  );
  return { rows: parts.flat(), fetchedAt: manifest.fetchedAt };
}


async function readWithProgress(response, onProgress) {
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body || !total) {
    const text = await response.text();
    onProgress(1);
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(1, received / total));
  }
  onProgress(1);
  return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
}
