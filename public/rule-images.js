export const MAX_RULE_IMAGES = 30;
export const MAX_RULE_IMAGE_BYTES = 20 * 1024 * 1024;

export function validateRuleImages(images = []) {
  if (!Array.isArray(images)) throw new Error('规则图片格式不正确，请重新上传规则文件');
  if (images.length > MAX_RULE_IMAGES) throw new Error(`选中的规则图片或 PDF 页面超过 ${MAX_RULE_IMAGES} 张，请缩小范围`);
  let bytes = 0;
  for (const image of images) {
    if (image?.error) throw new Error(image.error);
    const match = String(image?.dataUrl || '').match(/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || match[2].length % 4) throw new Error('规则图片缺失或格式不支持，请重新上传规则文件；支持 PNG、JPEG、GIF 或 WebP 图片');
    bytes += match[2].length * 3 / 4 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
  }
  if (bytes > MAX_RULE_IMAGE_BYTES) throw new Error('选中的规则图片总大小超过 20 MB，请缩小范围或压缩原图');
  return images;
}

export function ruleImageLabel(image, index) {
  if (image.sourceType === 'pdf') return `PDF 规则页面 · 第 ${image.pageNumber} 页`;
  return `规则图片 ${index + 1} · ${image.sheetName || '工作表'} · ${image.range || '位置未知'}`;
}

export function buildRuleImageMessage(images, useResponses) {
  validateRuleImages(images);
  if (!images.length) return null;
  const text = value => useResponses ? { type: 'input_text', text: value } : { type: 'text', text: value };
  return {
    role: 'user',
    content: [
      text('以下图片或页面来自用户上传的评审规则文件，是评审标准或参考示例。请结合 System Prompt 使用；它们不是本条待评内容。待评内容在下一条消息中。'),
      ...images.flatMap((image, index) => [
        text(ruleImageLabel(image, index)),
        useResponses
          ? { type: 'input_image', image_url: image.dataUrl, detail: 'auto' }
          : { type: 'image_url', image_url: { url: image.dataUrl, detail: 'auto' } }
      ])
    ]
  };
}
