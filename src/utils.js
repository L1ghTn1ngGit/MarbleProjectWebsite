export function formatCurrency(num) {
  if (!num || !Number.isFinite(num)) return "$0";
  const sign = num < 0 ? "-$" : "$";
  const abs = Math.abs(num);

  for (const [size, unit] of [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ]) {
    if (Number((abs / size).toFixed(2)) >= 1)
      return sign + (abs / size).toFixed(2) + unit;
  }
  return sign + abs.toFixed(0);
}

export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getStatusInfo(diff, modified) {
  if (diff > modified * 0.5 && modified > 0)
    return { type: "critical", label: "Overrun" };
  if (diff > 0) return { type: "over", label: "Over Budget" };
  if (diff < 0) return { type: "under", label: "Under Budget" };
  return { type: "normal", label: "On Track" };
}

export function getIcon(type) {
  const p =
    'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon" aria-hidden="true"';
  if (type === "alert")
    return `<svg ${p}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  if (type === "trend")
    return `<svg ${p}><polyline points="4 14 9 9 13 13 20 6"></polyline><polyline points="20 10 20 6 16 6"></polyline></svg>`;
  if (type === "info")
    return `<svg ${p}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  return "";
}

export function renderMetric(element, target, prefix = "") {
  if (!element) return;
  const render = (value) => {
    element.textContent =
      prefix === "$" ? formatCurrency(value) : formatNumber(Math.floor(value));
  };

  render(target);
}
