import { toDisplayName } from "./labels.js";

export const NEWS_LINES = 250;

export function topSpendingRows(rows, count = NEWS_LINES) {
  return new Set([...rows].sort((a, b) => b.__cash - a.__cash).slice(0, count));
}

export function newsSearchUrl(row) {
  const name = (toDisplayName(row["Budget Name"]) || row["Budget Name"] || "").replace(/["“”]/g, "").trim();
  const query = `"NYC Department of Education" "${name}" budget`;
  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}
