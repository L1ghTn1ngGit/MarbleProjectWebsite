// proxy for checkbook nyc bc there api has no cors and speaks xml
import { CHECKBOOK_API_URL, PAGE_SIZE, currentFiscalYear, parseResponse, requestXml } from "../src/data/checkbook.js";

const FIRST_YEAR = 2010;
const REQUEST_TIMEOUT_MS = 25000;
// stay under vercel's 60s maxDuration so a slow upstream still gets a clean 502
const TOTAL_BUDGET_MS = 50000;
// a DOE year is ~15k rows (one page); anything past this means upstream is misbehaving
const MAX_PAGES = 5;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }
  // only ?year=YYYY, so extra or odd params can't dodge the CDN cache and hit checkbook again
  const query = req.query || {};
  const raw = query.year;
  const keys = Object.keys(query);
  const year = Number(raw);
  if (keys.length !== 1 || typeof raw !== "string" || !/^\d{4}$/.test(raw) || year < FIRST_YEAR || year > currentFiscalYear() + 1) {
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(400).json({ error: `use ?year=YYYY with a fiscal year from ${FIRST_YEAR} to ${currentFiscalYear() + 1}` });
  }
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  try {
    const rows = [];
    let from = 1;
    let total = Infinity;
    for (let pages = 0; from <= total; pages++) {
      if (pages >= MAX_PAGES) throw new Error(`more than ${MAX_PAGES} pages for FY${year} (record_count ${total})`);
      const page = parseResponse(await post(requestXml(year, from, PAGE_SIZE), deadline), year);
      total = Number.isFinite(page.total) ? page.total : 0;
      rows.push(...page.rows);
      if (!page.rows.length) break;
      from += page.rows.length;
    }

    if (!rows.length) throw new Error(`Checkbook returned no records for FY${year}`);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({
      year,
      fetchedAt: new Date().toISOString(),
      source: "Checkbook NYC Budget API (type_of_data=Budget, agency_code=040)",
      rows,
    });
  } catch (error) {
    // details go to the function log, the browser only needs to know to fall back
    console.error(`budget FY${year}:`, error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Checkbook NYC is unavailable right now" });
  }
}

async function post(body, deadline) {
  const left = deadline - Date.now();
  if (left <= 1000) throw new Error("ran out of time waiting on Checkbook");
  const response = await fetch(CHECKBOOK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml", "User-Agent": "MarbleFoundation-budget/1.0" },
    body,
    signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, left)),
  });
  const text = await response.text();
  if (!response.ok || !text.startsWith("<?xml")) {
    throw new Error(`Checkbook API returned ${response.status}; it may be down or blocking automated requests`);
  }
  return text;
}
