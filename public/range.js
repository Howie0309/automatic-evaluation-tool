export function normalizeRange(startValue, endValue, totalRows) {
  const total = Math.max(0, Number(totalRows) || 0);
  if (!total) return { start: 0, end: 0 };
  const parsedStart = Number.parseInt(startValue, 10);
  const parsedEnd = Number.parseInt(endValue, 10);
  const start = Math.min(total, Math.max(1, Number.isFinite(parsedStart) ? parsedStart : 1));
  const end = Math.min(total, Math.max(start, Number.isFinite(parsedEnd) ? parsedEnd : total));
  return { start, end };
}
