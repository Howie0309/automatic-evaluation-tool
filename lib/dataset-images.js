import { embeddedImage, imagePosition } from './rule-excel.js';

export function extractDatasetImages(worksheet) {
  const warnings = new Set();
  const images = worksheet.getImages().map((image, index) => {
    const position = imagePosition(image, worksheet);
    const cell = worksheet.getCell(position.bounds.top, position.bounds.left);
    const owner = cell.isMerged ? cell.master : cell;
    if (position.bounds.bottom > owner.row) warnings.add('跨行图片按左上角所属单元格归属，不会重复发给相邻行；请在预览中核对。');
    return {
      ...embeddedImage(worksheet, image.imageId, position, index, true),
      sheetName: worksheet.name, excelRowNumber: owner.row, columnNumber: owner.col, cellAddress: owner.address
    };
  });
  worksheet.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, cell => {
    if (cell.isMerged && cell.master.address !== cell.address) return;
    if (!/\b(?:DISPIMG|IMAGE)\s*\(/i.test(cell.formula || '')) return;
    images.push({
      id: `${worksheet.id}-${cell.address}`, sheetName: worksheet.name,
      excelRowNumber: cell.row, columnNumber: cell.col, cellAddress: cell.address,
      error: `${worksheet.name}!${cell.address} 是 IMAGE/DISPIMG 公式图片，请先在 Excel 中转换为普通“插入图片”；不能将其当作空白继续评估`
    });
  }));
  if (images.some(image => image.excelRowNumber === 1)) warnings.add('表头行的图片不属于待评数据，不会随 case 发送。');
  if (worksheet.getBackgroundImageId() != null) warnings.add('工作表背景图不属于某条待评数据，不会随 case 发送。');
  return { images: images.filter(image => image.excelRowNumber > 1), warnings: [...warnings] };
}

export function assertImageAssetId(id) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(String(id || ''))) throw new Error('图片 ID 无效');
}

export function imageManifest(images) {
  if (images.length > 5000) throw new Error('数据集图片超过 5000 张，请拆分文件后上传');
  if (images.reduce((sum, image) => sum + (image.buffer?.length || 0), 0) > 600 * 1024 * 1024) throw new Error('数据集图片解压后超过 600 MB，请拆分文件后上传');
  const seen = new Set();
  return images.map(({ buffer, dataUrl, ...metadata }) => {
    assertImageAssetId(metadata.id);
    if (seen.has(metadata.id)) throw new Error('数据集图片 ID 重复，请重新保存 Excel');
    seen.add(metadata.id);
    if (!metadata.error && !buffer?.length) throw new Error('数据集图片内容缺失');
    return metadata;
  });
}
