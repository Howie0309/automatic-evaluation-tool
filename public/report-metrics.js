function valueAtPath(value, path) {
  if (!path || value == null) return undefined;
  if (typeof value !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(value, path)) return value[path];
  const separator = path.indexOf('.');
  if (separator < 0) return value[path];
  const head = path.slice(0, separator);
  return valueAtPath(value[head], path.slice(separator + 1));
}

function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function inferScoreScale(values) {
  const maximum = Math.max(0, ...values.map(numericValue).filter(value => value != null));
  if (maximum <= 4) return 4;
  if (maximum <= 5) return 5;
  if (maximum <= 10) return 10;
  if (maximum <= 100) return 100;
  return Math.ceil(maximum || 1);
}

export function detectScoreColumns(results, outputColumns) {
  const successful = results.filter(item => item.status === 'success' && item.output && typeof item.output === 'object');
  const withNumbers = outputColumns.map(column => {
    const values = successful.map(item => numericValue(valueAtPath(item.output, column.key))).filter(value => value != null);
    return { ...column, values };
  }).filter(column => column.values.length);
  const scorePattern = /(^|[.·\s_])(score|scores?|rating|分数|评分)([.·\s_]|$)/i;
  return withNumbers.filter(column => scorePattern.test(column.key) || scorePattern.test(column.label));
}

export function buildScoreMetrics(results, outputColumns) {
  const columns = detectScoreColumns(results, outputColumns);
  const fields = columns.map(column => {
    const sum = column.values.reduce((total, value) => total + value, 0);
    return {
      key: column.key,
      label: column.label,
      average: column.values.length ? sum / column.values.length : 0,
      count: column.values.length,
      minimum: Math.min(...column.values),
      maximum: Math.max(...column.values)
    };
  });
  return {
    fields,
    chartMaximum: Math.max(1, ...fields.map(field => field.maximum))
  };
}

export function paginate(items, page = 1, pageSize = 10) {
  const size = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const currentPage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const start = (currentPage - 1) * size;
  return { items: items.slice(start, start + size), page: currentPage, pageSize: size, totalPages, total: items.length, start };
}

export { numericValue, valueAtPath };
