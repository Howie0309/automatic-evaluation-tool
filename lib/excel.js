function uniqueHeaders(headerRow, columnCount = headerRow.cellCount) {
  const used = new Set();
  return Array.from({ length: columnCount }, (_, index) => {
    const base = headerRow.getCell(index + 1).text.trim() || `列${index + 1}`;
    let label = base;
    let suffix = 2;
    while (used.has(label)) label = `${base}_${suffix++}`;
    used.add(label);
    return label;
  });
}

export function parseWorksheet(worksheet, options = {}) {
  const images = options.images || [];
  const columns = uniqueHeaders(worksheet.getRow(1), Math.max(worksheet.getRow(1).cellCount, ...images.map(image => image.columnNumber)));
  const imageRows = new Set(images.map(image => image.excelRowNumber));
  const rows = [];
  const rowNumbers = [];
  const lastRow = Math.max(worksheet.rowCount, ...images.map(image => image.excelRowNumber));
  for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
    const excelRow = worksheet.getRow(rowIndex);
    const row = Object.fromEntries(columns.map((column, index) => [column, excelRow.getCell(index + 1).text]));
    if (Object.values(row).some(value => value !== '') || imageRows.has(rowIndex)) {
      rows.push(row);
      rowNumbers.push(rowIndex);
    }
  }
  return { name: worksheet.name, rows, columns, rowNumbers,
    ...(images.length ? { images: images.map(({ buffer, ...image }) => ({ ...image, columnName: columns[image.columnNumber - 1] })) } : {}),
    ...(options.warnings?.length ? { imageWarnings: options.warnings } : {}) };
}
