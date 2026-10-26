import { readUploadImages, readUploadImage } from './storage-runtime.js';
import { caseImagesForRow } from '../public/dataset-images.js';

export async function resolveCaseImages(input, storage = { readUploadImages, readUploadImage }) {
  if (input == null) return [];
  if (!Number.isInteger(input.excelRowNumber) || input.excelRowNumber < 2 || typeof input.sheetName !== 'string' || !Array.isArray(input.imageColumns) || input.imageColumns.some(column => typeof column !== 'string')) {
    throw new Error('待评图片的工作表、真实行号或图片列配置无效');
  }
  const manifest = await storage.readUploadImages(input.uploadId);
  const selected = caseImagesForRow(manifest.filter(image => image.sheetName === input.sheetName), input.excelRowNumber, input.imageColumns);
  if (input.imageIds && (!Array.isArray(input.imageIds) || input.imageIds.length !== selected.length || input.imageIds.some((id, index) => id !== selected[index].id))) {
    throw new Error('待评图片与已保存的数据不一致，请重新上传 Excel；不能忽略缺失图片继续评估');
  }
  const failed = selected.find(image => image.error);
  if (failed) throw new Error(failed.error);
  if (selected.length > 30) throw new Error('单条待评数据图片超过 30 张，请减少图片列');
  if (selected.reduce((sum, image) => sum + image.size, 0) > 20 * 1024 * 1024) throw new Error('单条待评数据图片超过 20 MB，请压缩图片后重新上传');
  return Promise.all(selected.map(async image => {
    const asset = await storage.readUploadImage(input.uploadId, image.id);
    return { ...image, dataUrl: `data:${asset.contentType};base64,${asset.content.toString('base64')}` };
  }));
}
