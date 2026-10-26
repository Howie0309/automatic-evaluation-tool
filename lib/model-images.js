import { createCanvas, loadImage } from '@napi-rs/canvas';
import { validateRuleImages } from '../public/rule-images.js';

export const MAX_MODEL_IMAGE_DIMENSION = 8000;

// Keep stored originals intact. Only the request-local copy is transformed.
export async function prepareModelImages(images = [], kind = '规则', signal = null) {
  try { validateRuleImages(images); }
  catch (error) { throw new Error(error.message.replaceAll('规则图片', `${kind}图片`).replaceAll('规则文件', kind === '待评' ? '评估文件' : '规则文件')); }
  const prepared = [];
  // Decode one at a time rather than keeping every full-resolution bitmap alive.
  for (const image of images) {
    if (signal?.aborted) throw signal.reason || new Error('客户端已中断请求');
    let decoded;
    try { decoded = await loadImage(Buffer.from(image.dataUrl.split(',')[1], 'base64')); }
    catch { throw new Error(`${kind}图片（${image.cellAddress || image.range || image.id || prepared.length + 1}）无法解码，请转换为 PNG 或 JPEG 后重新上传`); }
    if (signal?.aborted) throw signal.reason || new Error('客户端已中断请求');
    const originalWidth = decoded.width, originalHeight = decoded.height;
    if (!originalWidth || !originalHeight) throw new Error(`${kind}图片尺寸无效，请重新上传`);
    const scale = Math.min(1, MAX_MODEL_IMAGE_DIMENSION / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
    const resized = scale < 1;
    let dataUrl = image.dataUrl;
    let mime = image.dataUrl.slice(5, image.dataUrl.indexOf(';'));
    if (resized) {
      const canvas = createCanvas(width, height);
      try {
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(decoded, 0, 0, width, height);
        // JPEG screenshots stay JPEG; lossless PNG preserves transparency otherwise.
        const bytes = mime === 'image/jpeg' ? canvas.toBuffer('image/jpeg', 95) : canvas.toBuffer('image/png');
        mime = mime === 'image/jpeg' ? mime : 'image/png';
        dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;
      } finally {
        canvas.width = 1;
        canvas.height = 1;
      }
    }
    prepared.push({ ...image, dataUrl, modelImage: { originalWidth, originalHeight, width, height, resized, mime } });
  }
  // Resampling can increase compressed size. Do not send an oversized payload.
  try { validateRuleImages(prepared); }
  catch (error) { throw new Error(`${kind}图片处理后超出请求限制：${error.message}`); }
  return prepared;
}
