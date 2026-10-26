import { apiFetch, isCloudMode } from './cloud-runtime.js';
import { caseImageLabel, datasetImagePath } from './dataset-images.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function datasetImagesHtml(images = [], compact = false) {
  if (!images.length) return '';
  return `<div class="dataset-picture-grid${compact ? ' compact' : ''}">${images.map((image, index) => {
    if (image.error) return `<p class="dataset-picture-error">${escape(image.error)}</p>`;
    const path = datasetImagePath(image);
    if (!path) return '<p class="dataset-picture-error">图片引用缺失，请重新上传原始 Excel</p>';
    const label = caseImageLabel(image, index);
    const dimensions = image.modelImage;
    const sizing = dimensions ? `${dimensions.resized ? `原图 ${dimensions.originalWidth} × ${dimensions.originalHeight} → ` : ''}发送 ${dimensions.width} × ${dimensions.height} 像素` : '';
    return `<button type="button" class="dataset-picture" data-open-dataset-image="${path}" data-image-label="${escape(label)}"><img ${isCloudMode() ? `data-private-image="${path}"` : `src="${path}"`} alt="${escape(label)}" loading="lazy"><span>${escape(compact ? image.columnName : label)}${sizing ? `<small>${escape(sizing)}</small>` : ''}<small>点击查看原图</small></span></button>`;
  }).join('')}</div>`;
}

export function hydrateDatasetImages(container) {
  const images = [...container.querySelectorAll('img[data-private-image]')];
  if (!images.length) return;
  const load = async image => {
    const path = image.dataset.privateImage;
    delete image.dataset.privateImage;
    try {
      const response = await apiFetch(path);
      if (!response.ok) throw new Error('图片加载失败');
      const url = URL.createObjectURL(await response.blob());
      if (!image.isConnected) return URL.revokeObjectURL(url);
      image.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
      image.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
      image.src = url;
    } catch { image.alt += '（加载失败，请重新上传）'; }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); load(entry.target); }
  });
  images.forEach(image => observer.observe(image));
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-open-dataset-image]');
  if (!button) return;
  event.preventDefault();
  const dialog = document.createElement('dialog');
  dialog.className = 'dataset-image-dialog';
  const close = document.createElement('button');
  close.type = 'button'; close.textContent = '关闭';
  close.addEventListener('click', () => dialog.close());
  const label = document.createElement('p'); label.textContent = button.dataset.imageLabel;
  const image = document.createElement('img'); image.alt = label.textContent;
  dialog.append(close, label, image);
  document.body.append(dialog); dialog.showModal();
  const controller = new AbortController();
  let url;
  dialog.addEventListener('close', () => { controller.abort(); if (url) URL.revokeObjectURL(url); dialog.remove(); }, { once: true });
  try {
    const response = await apiFetch(button.dataset.openDatasetImage, { signal: controller.signal });
    if (!response.ok) throw new Error('图片加载失败，请重新上传原始 Excel');
    const blob = await response.blob();
    if (!dialog.isConnected) return;
    url = URL.createObjectURL(blob); image.src = url;
  } catch (error) { if (dialog.isConnected) label.textContent += '\n' + error.message; }
});
