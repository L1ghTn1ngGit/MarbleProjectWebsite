export const CHECKBOOK_API_URL = "https://www.checkbooknyc.com/api";
export const DOE_AGENCY_CODE = "040";
export const PAGE_SIZE = 20000;

export function requestXml(year, from, max = PAGE_SIZE, agencyCode = DOE_AGENCY_CODE) {
  return `<request>
  <type_of_data>Budget</type_of_data>
  <records_from>${Number(from)}</records_from>
  <max_records>${Number(max)}</max_records>
  <search_criteria>
    <criteria><name>year</name><type>value</type><value>${Number(year)}</value></criteria>
    <criteria><name>agency_code</name><type>value</type><value>${agencyCode}</value></criteria>
  </search_criteria>
</request>`;
}

export function parseResponse(xml, year) {
  if (!/<result>success<\/result>/.test(xml)) {
    throw new Error(`Checkbook API error for FY${year}: ${textOf(xml, "message") || xml.slice(0, 300)}`);
  }
  const total = Number(textOf(xml, "record_count") || 0);
  const rows = [...xml.matchAll(/<transaction>([\s\S]*?)<\/transaction>/g)].map((match) => toRow(match[1]));
  return { total, rows };
}

export function toRow(t) {
  const num = (tag) => Number(textOf(t, tag) || 0);
  return {
    "Accrued Expense": num("accrued_expense"),
    Adopted: num("adopted"),
    Agency: textOf(t, "agency"),
    "Budget Code": textOf(t, "budget_code"),
    "Budget Name": textOf(t, "budget_name"),
    "Cash Expense": num("cash_expense"),
    Committed: num("committed"),
    Department: textOf(t, "department"),
    Encumbered: num("encumbered"),
    "Expense Category": textOf(t, "expense_category"),
    Modified: num("modified"),
    "Post Adjustments": num("post_adjustment"),
    "Pre-Encumbered": num("pre_encumbered"),
    Year: Number(textOf(t, "year")),
  };
}

export function textOf(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decode(match[1].trim()) : "";
}

function decode(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function currentFiscalYear(d = new Date()) {
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
}
