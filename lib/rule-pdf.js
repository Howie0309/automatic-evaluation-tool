import { createRequire } from 'node:module';
import { dirname, join, sep } from 'node:path';
import { createCanvas, DOMMatrix, ImageData, Path2D, GlobalFonts } from '@napi-rs/canvas';
import { parsePdfPages } from '../public/rule-pdf.js';
import { MAX_RULE_CHARACTERS } from '../public/rule-attachment.js';
import { MAX_RULE_IMAGE_BYTES } from '../public/rule-images.js';

const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
let pdfjsPromise;

// Skia's generic serif/sans-serif fallback can omit simplified Chinese glyphs.
// Append an explicit available CJK family without replacing embedded PDF fonts.
const cjkFallback = ['Noto Sans CJK SC', 'Noto Sans SC', 'Hiragino Sans GB', 'PingFang SC', 'Microsoft YaHei', 'SimSun', 'Heiti TC'].find(name => GlobalFonts.has(name));
function pdfContext(canvas) {
  const context = canvas.getContext('2d');
  if (!cjkFallback) return context;
  const font = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(context), 'font');
  if (!font?.get || !font?.set) return context;
  const suffix = `, "${cjkFallback}"`;
  Object.defineProperty(context, 'font', {
    get() { return font.get.call(this); },
    set(value) { font.set.call(this, value.endsWith(suffix) ? value : value + suffix); }
  });
  return context;
}

async function pdfjs() {
  globalThis.DOMMatrix ||= DOMMatrix;
  globalThis.ImageData ||= ImageData;
  globalThis.Path2D ||= Path2D;
  return pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs');
}

export async function parsePdfRules(buffer, { metadataOnly = false, pageRange = '' } = {}) {
  if (!buffer.length) throw new Error('请选择 PDF 评审规则文件');
  const api = await pdfjs();
  const task = api.getDocument({
    data: Uint8Array.from(buffer), isEvalSupported: false, stopAtErrors: true,
    cMapUrl: join(pdfjsRoot, 'cmaps') + sep, cMapPacked: true,
    standardFontDataUrl: join(pdfjsRoot, 'standard_fonts') + sep,
    wasmUrl: join(pdfjsRoot, 'wasm') + sep,
    useSystemFonts: true, disableFontFace: true, verbosity: 0
  });
  let document;
  try {
    document = await task.promise;
    const pageCount = document.numPages;
    if (metadataOnly) return { pageCount };
    const pageNumbers = parsePdfPages(pageRange, pageCount);
    const pages = [];
    let textCharacters = 0, imageBytes = 0;
    for (const pageNumber of pageNumbers) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      textCharacters += text.length;
      if (textCharacters > MAX_RULE_CHARACTERS) throw new Error('选中 PDF 规则超过 20 万字符，请缩小页码范围');
      const original = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, 2400 / Math.max(original.width, original.height), Math.sqrt(4000000 / (original.width * original.height)));
      if (!Number.isFinite(scale) || scale <= 0) throw new Error(`PDF 第 ${pageNumber} 页的尺寸不正确`);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      try {
        await page.render({ canvas, canvasContext: pdfContext(canvas), viewport, background: '#ffffff' }).promise;
        const jpeg = canvas.toBuffer('image/jpeg', 92);
        imageBytes += jpeg.length;
        if (imageBytes > MAX_RULE_IMAGE_BYTES) throw new Error('选中 PDF 页面图像超过 20 MB，请缩小页码范围');
        pages.push({ pageNumber, text, image: {
          id: `pdf-page-${pageNumber}`, sourceType: 'pdf', pageNumber,
          range: `第 ${pageNumber} 页`, mime: 'image/jpeg', size: jpeg.length,
          dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}`
        } });
      } finally {
        canvas.width = 1;
        canvas.height = 1;
        page.cleanup();
      }
    }
    return { pageCount, pageRange, pages };
  } catch (error) {
    if (error.name === 'PasswordException') throw new Error('PDF 有密码保护，请先解密再上传');
    if (['InvalidPDFException', 'MissingPDFException', 'UnknownErrorException'].includes(error.name)) throw new Error('PDF 无法读取，请确认文件完整且未损坏');
    throw error;
  } finally {
    await task.destroy();
  }
}
