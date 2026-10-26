import { parseRuleRange } from '../public/rule-attachment.js';

function columnLabel(number) {
  let label = '';
  while (number > 0) { number--; label = String.fromCharCode(65 + number % 26) + label; number = Math.floor(number / 26); }
  return label;
}

function endCell(start, pixels, sizeAt, maximum) {
  let index = Math.floor(start);
  let remaining = pixels + (start - index) * sizeAt(index + 1);
  while (remaining > sizeAt(index + 1) && index < maximum - 1) {
    remaining -= sizeAt(index + 1);
    index++;
  }
  return index + 1;
}

export function imagePosition(image, worksheet) {
  const tl = image.range?.tl;
  if (!tl || !Number.isFinite(tl.row) || !Number.isFinite(tl.col)) throw new Error('无法读取规则图片的单元格位置，请用 Excel 重新插入图片后保存');
  const top = Math.floor(tl.row) + 1, left = Math.floor(tl.col) + 1;
  const br = image.range.br;
  const ext = image.range.ext;
  const right = Math.max(left, br ? Math.ceil(br.col) : endCell(tl.col, Number(ext?.width) || 1, col => (worksheet.getColumn(col).width || worksheet.properties.defaultColWidth || 8.43) * 7 + 5, 16384));
  const bottom = Math.max(top, br ? Math.ceil(br.row) : endCell(tl.row, Number(ext?.height) || 1, row => (worksheet.getRow(row).height || worksheet.properties.defaultRowHeight || 15) * 96 / 72, 1048576));
  return { bounds: { top, left, bottom, right }, range: `${columnLabel(left)}${top}:${columnLabel(right)}${bottom}` };
}

export function embeddedImage(worksheet, imageId, position, index, binary = false) {
  const media = worksheet.workbook.getImage(Number(imageId));
  let buffer;
  if (media?.buffer) buffer = Buffer.isBuffer(media.buffer) ? media.buffer : Buffer.from(media.buffer);
  else if (media?.base64) buffer = Buffer.from(media.base64.replace(/^data:[^,]*,/, ''), 'base64');
  const header = buffer?.subarray(0, 12);
  const mime = header?.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : header?.[0] === 255 && header?.[1] === 216 && header?.[2] === 255 ? 'image/jpeg'
    : /^GIF8[79]a/.test(header?.toString('ascii') || '') ? 'image/gif'
    : header?.toString('ascii', 0, 4) === 'RIFF' && header?.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : '';
  return {
    id: `${worksheet.id}-${index + 1}`, ...position,
    ...(mime ? { mime, size: buffer.length, ...(binary ? { buffer } : { dataUrl: `data:${mime};base64,${buffer.toString('base64')}` }) }
      : { error: `工作表“${worksheet.name}”的图片（${position.range}）无法读取或格式不支持，请转换为 PNG、JPEG、GIF 或 WebP 后重新插入` })
  };
}

export function parseRuleWorksheet(worksheet) {
  const merges = new Map((worksheet.model.merges || []).map(address => {
    const bounds = parseRuleRange(address);
    return [`${bounds.top}:${bounds.left}`, { address, ...bounds }];
  }));
  const rows = [];
  const formulaImages = [];
  const warnings = new Set();
  let count = 0;
  let characterCount = 0;
  let rowCount = 0, columnCount = 0;
  worksheet.eachRow({ includeEmpty: false }, row => {
    const cells = [];
    row.eachCell({ includeEmpty: false }, cell => {
      if (cell.isMerged && cell.master.address !== cell.address) return;
      if (/\b(?:DISPIMG|IMAGE)\s*\(/i.test(cell.formula || '')) {
        formulaImages.push({
          id: `${worksheet.id}-${cell.address}`, range: cell.address,
          bounds: { top: cell.row, bottom: cell.row, left: cell.col, right: cell.col },
          error: `工作表“${worksheet.name}”的 ${cell.address} 使用 IMAGE/DISPIMG 图片公式，请先转换为“插入图片”后重新上传；本次不能忽略这张规则图片`
        });
      }
      let value = cell.text;
      if (cell.formula && cell.result == null) {
        value = `（公式未缓存结果：${cell.formula}）`;
        warnings.add('部分公式没有缓存结果，请先用 Excel 重新计算并保存；本工具不会执行公式。');
      }
      if (cell.value instanceof Date) value = cell.value.toISOString();
      if (!String(value).trim()) return;
      characterCount += value.length;
      if (++count > 100000 || characterCount > 2000000) throw new Error('规则表内容过多，请删减后上传（最多 10 万个非空单元格或 200 万字符）');
      const merge = merges.get(`${cell.row}:${cell.col}`);
      cells.push({ address: cell.address, column: cell.col, value, ...(merge ? { merge: merge.address } : {}) });
      rowCount = Math.max(rowCount, merge?.bottom || cell.row);
      columnCount = Math.max(columnCount, merge?.right || cell.col);
    });
    if (cells.length) rows.push({ rowNumber: row.number, cells });
  });
  const images = worksheet.getImages().map((image, index) => embeddedImage(worksheet, image.imageId, imagePosition(image, worksheet), index));
  images.push(...formulaImages);
  const backgroundId = worksheet.getBackgroundImageId();
  if (backgroundId != null) images.push(embeddedImage(worksheet, backgroundId, { background: true, range: '工作表背景', bounds: { top: 1, left: 1, bottom: Math.max(1, rowCount), right: Math.max(1, columnCount) } }, images.length));
  for (const image of images) {
    rowCount = Math.max(rowCount, image.bounds.bottom);
    columnCount = Math.max(columnCount, image.bounds.right);
  }
  return { name: worksheet.name, rows, images, rowCount, columnCount, warnings: [...warnings] };
}
