function uniqueLabel(label, used) {
  const original = String(label || '未命名字段');
  let candidate = used.has(original) ? `评估_${original}` : original;
  const base = candidate;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}_${suffix++}`;
  used.add(candidate);
  return candidate;
}

export function buildExportSchema(inputColumns = [], outputColumns = []) {
  const sourceColumns = [...new Set((Array.isArray(inputColumns) ? inputColumns : []).map(String))];
  const used = new Set(sourceColumns);
  const rowNumber = uniqueLabel('数据序号', used);
  const status = uniqueLabel('评估状态', used);
  const outputs = (Array.isArray(outputColumns) ? outputColumns : []).map(column => ({
    ...column,
    exportLabel: uniqueLabel(column.label, used)
  }));
  const attempts = uniqueLabel('请求次数', used);
  const elapsed = uniqueLabel('耗时(ms)', used);
  return { inputColumns: sourceColumns, outputs, labels: { rowNumber, status, attempts, elapsed } };
}
