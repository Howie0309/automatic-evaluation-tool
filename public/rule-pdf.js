import { MAX_RULE_CHARACTERS } from './rule-attachment.js';
import { MAX_RULE_IMAGES, validateRuleImages } from './rule-images.js';

export function parsePdfPages(value, pageCount) {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error('PDF 没有可读取的页面');
  const spec = String(value || '').trim().replaceAll('，', ',');
  if (spec.length > 1000) throw new Error('页码范围过长，请简化后重试');
  if (!spec) {
    if (pageCount > MAX_RULE_IMAGES) throw new Error(`PDF 共 ${pageCount} 页，请选择不超过 ${MAX_RULE_IMAGES} 页，例如 1-5,8`);
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set();
  for (const part of spec.split(',')) {
    const match = part.trim().match(/^([1-9]\d*)(?:\s*-\s*([1-9]\d*))?$/);
    if (!match) throw new Error('页码请填写 1-3,5，或留空读取全部页面');
    const first = Number(match[1]), last = Number(match[2] || match[1]);
    if (last < first) throw new Error('结束页码不能早于开始页码');
    if (first > pageCount || last > pageCount) throw new Error(`页码超出文件范围，PDF 共 ${pageCount} 页`);
    if (last - first + 1 > MAX_RULE_IMAGES) throw new Error(`每次最多选择 ${MAX_RULE_IMAGES} 页，请缩小范围`);
    for (let page = first; page <= last; page++) pages.add(page);
    if (pages.size > MAX_RULE_IMAGES) throw new Error(`每次最多选择 ${MAX_RULE_IMAGES} 页，请缩小范围`);
  }
  return [...pages].sort((a, b) => a - b);
}

export function buildPdfRuleAttachment(fileName, document) {
  const pages = document.pages || [];
  const expected = parsePdfPages(document.pageRange, document.pageCount);
  if (expected.length !== pages.length || pages.some((page, index) => page.pageNumber !== expected[index] || !page.image?.dataUrl)) {
    throw new Error('PDF 页面未完整读取，请重新应用页码范围');
  }
  const images = pages.map(page => page.image);
  validateRuleImages(images);
  const text = `评审规则文件：${fileName}\n文件类型：PDF，共 ${document.pageCount} 页，本次使用第 ${expected.join('、')} 页。\n各页原始版式、表格、截图及插图通过页面图像一并提供。可提取文字仅用于辅助理解；阅读顺序与图文关系请结合页面图像。\n\n${pages.map(page => `【第 ${page.pageNumber} 页】\n${page.text?.trim() || '（本页没有可提取文字，请依据页面图像进行评审）'}`).join('\n\n')}`;
  if (text.length > MAX_RULE_CHARACTERS) throw new Error('选中 PDF 规则超过 20 万字符，请缩小页码范围；内容不会自动截断');
  return { fileType: 'pdf', fileName, pageCount: document.pageCount, selections: [{ name: 'PDF 页码', range: expected.join(',') }], text, images };
}
