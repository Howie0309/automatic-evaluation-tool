let database;
function openDatabase() {
  database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('judge-studio-rule-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('浏览器无法保存规则图片，请检查本地存储权限'));
  });
  return database;
}

export async function saveRuleDraft(id, attachment) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    // A single draft keeps replaced rule images from accumulating on disk.
    tx.objectStore('drafts').put({ id, attachment }, 'current');
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () => reject(new Error('规则图片保存失败，当前浏览器存储空间可能不足'));
  });
}

export async function loadRuleDraft(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get('current');
    request.onsuccess = () => resolve(request.result?.id === id ? request.result.attachment : null);
    request.onerror = () => reject(new Error('规则图片读取失败，请重新上传规则文件'));
  });
}

export async function clearRuleDraft() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').delete('current');
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () => reject(new Error('规则图片缓存移除失败'));
  });
}

export function ruleSettingsSnapshot(attachment, cacheId) {
  if (!attachment?.images?.length) return attachment;
  return { ...attachment, cacheId, images: attachment.images.map(({ dataUrl, ...metadata }) => metadata) };
}
