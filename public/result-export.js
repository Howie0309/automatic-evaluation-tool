function uniqueLabel(label, used) {
  const original = String(label || '未命名字段');
  let candidate = used.has(original) ? `评估_${original}` : original;
  const base = candidate;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}_${suffix++}`;
  used.add(candidate);
  return candidate;
}

export function buildExportSchema(inputColumns = [], outputColumns = [], { includeWebSearch = false } = {}) {
  const sourceColumns = [...new Set((Array.isArray(inputColumns) ? inputColumns : []).map(String))];
  const used = new Set(sourceColumns);
  const rowNumber = uniqueLabel('数据序号', used);
  const excelRowNumber = uniqueLabel('Excel行号', used);
  const status = uniqueLabel('评估状态', used);
  const outputs = (Array.isArray(outputColumns) ? outputColumns : []).map(column => ({
    ...column,
    exportLabel: uniqueLabel(column.label, used)
  }));
  const webSearch = includeWebSearch ? {
    status: uniqueLabel('搜索状态', used),
    queries: uniqueLabel('搜索词', used),
    sources: uniqueLabel('搜索来源', used)
  } : null;
  const attempts = uniqueLabel('请求次数', used);
  const elapsed = uniqueLabel('耗时(ms)', used);
  return { inputColumns: sourceColumns, outputs, webSearch, labels: { rowNumber, excelRowNumber, status, attempts, elapsed } };
}

export function outputCellValue(output, key, fallback = '') {
  if (key === '__raw__') return typeof output === 'string' ? output : output == null ? fallback : JSON.stringify(output);
  if (output == null || typeof output !== 'object') return '';
  const value = String(key || '').split('.').reduce((current, part) => current?.[part], output);
  if (value == null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function singleLineCell(value) {
  return String(value ?? '')
    .replace(/\r\n?|\n/g, ' ↵ ')
    .replace(/\t/g, ' ');
}

export function buildExportRows(results, outputColumns, inputColumns = [], config = {}, { singleLine = false } = {}) {
  const resultItems = Array.isArray(results) ? results : [];
  const includeWebSearch = config.webSearchMode && config.webSearchMode !== 'off'
    || resultItems.some(item => item.webSearch?.used);
  const schema = buildExportSchema(inputColumns, outputColumns, { includeWebSearch });
  const sourceValue = (item, column) => {
    if (item.sourceRow && Object.prototype.hasOwnProperty.call(item.sourceRow, column)) return item.sourceRow[column];
    if (column === config.queryColumn) return item.query;
    if (column === config.answerColumn) return item.answer;
    return '';
  };
  const normalize = singleLine ? singleLineCell : value => value ?? '';
  const statusLabel = status => ({ success: '成功', error: '接口错误', cancelled: '已中断' })[status] || status || '';
  const webSearchValues = item => {
    if (!schema.webSearch) return [];
    const metadata = item.webSearch || { used: false, queries: [], sources: [] };
    const status = metadata.used ? '已搜索' : item.status === 'success' ? '未调用搜索' : '';
    const queries = (metadata.queries || []).join(' | ');
    const sources = (metadata.sources || []).map(source => {
      const title = String(source.title || '').trim();
      const url = String(source.url || '').trim();
      return title && title !== url ? `${title} (${url})` : url;
    }).filter(Boolean).join('\n');
    return [status, queries, sources];
  };
  const rows = [
    [schema.labels.rowNumber, schema.labels.excelRowNumber, ...schema.inputColumns, schema.labels.status, ...schema.outputs.map(column => column.exportLabel), ...(schema.webSearch ? Object.values(schema.webSearch) : []), schema.labels.attempts, schema.labels.elapsed],
    ...resultItems.map(item => [
      item.rowNumber,
      item.excelRowNumber ?? (Number.isFinite(Number(item.rowNumber)) ? Number(item.rowNumber) + 1 : ''),
      ...schema.inputColumns.map(column => sourceValue(item, column)),
      statusLabel(item.status),
      ...schema.outputs.map(column => outputCellValue(item.output, column.key, item.displayOutput)),
      ...webSearchValues(item),
      item.attempts ?? 0,
      Math.round(Number(item.elapsed) || 0)
    ])
  ];
  return { schema, rows: rows.map(row => row.map(normalize)) };
}
