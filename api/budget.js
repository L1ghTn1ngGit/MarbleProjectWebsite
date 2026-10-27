// proxy for checkbook nyc bc there api has no cors and speaks xml
import { CHECKBOOK_API_URL, PAGE_SIZE, currentFiscalYear, parseResponse, requestXml } from "../src/data/checkbook.js";

const FIRST_YEAR = 2010;
const REQUEST_TIMEOUT_MS = 25000;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const year = Number(req.query?.year);
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > currentFiscalYear() + 1) {
    return res.status(400).json({ error: `year must be a fiscal year from ${FIRST_YEAR} to ${currentFiscalYear() + 1}` });
  }
  try {
    const rows = [];
    let from = 1;
    let total = Infinity;
    while (from <= total) {
      const page = parseResponse(await post(requestXml(year, from, PAGE_SIZE)), year);
      total = page.total;
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
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: error.message || "Checkbook NYC is unavailable" });
  }
}

async function post(body) {
  const response = await fetch(CHECKBOOK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml", "User-Agent": "MarbleFoundation-budget/1.0" },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok || !text.startsWith("<?xml")) {
    throw new Error(`Checkbook API returned ${response.status}; it may be down or blocking automated requests`);
  }
  return text;
}
