function uniqueHeaders(headerRow) {
  const used = new Set();
  return Array.from({ length: headerRow.cellCount }, (_, index) => {
    const base = headerRow.getCell(index + 1).text.trim() || `列${index + 1}`;
    let label = base;
    let suffix = 2;
    while (used.has(label)) label = `${base}_${suffix++}`;
    used.add(label);
    return label;
  });
}

export function parseWorksheet(worksheet) {
  const columns = uniqueHeaders(worksheet.getRow(1));
  const rows = [];
  const rowNumbers = [];
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const excelRow = worksheet.getRow(rowIndex);
    const row = Object.fromEntries(columns.map((column, index) => [column, excelRow.getCell(index + 1).text]));
    if (Object.values(row).some(value => value !== '')) {
      rows.push(row);
      rowNumbers.push(rowIndex);
    }
  }
  return { name: worksheet.name, rows, columns, rowNumbers };
}
