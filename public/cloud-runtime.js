const environmentId = 'job-hop-calculator-d1cu811a446ba';
const cloudHost = `${environmentId}-1319255386.tcloudbaseapp.com`;
const cloudMode = location.hostname === cloudHost;
const gateway = `https://${environmentId}.api.tcloudbasegateway.com`;
const serviceBase = `https://${environmentId}-1319255386.ap-shanghai.app.tcloudbase.com`;

function deviceId() {
  const key = 'judge_cloud_device';
  let value = localStorage.getItem(key);
  if (!value) {
    value = `judge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, value);
  }
  return value;
}

async function accessToken(force = false) {
  const key = 'judge_cloud_token';
  if (!force) {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
  }
  const response = await fetch(`${gateway}/auth/v1/signin/anonymously`, {
    method: 'POST',
    headers: { 'x-device-id': deviceId(), 'content-type': 'application/json' }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.message || '腾讯云匿名登录失败');
  }
  sessionStorage.setItem(key, payload.access_token);
  return payload.access_token;
}

function remoteApiUrl(path) {
  return `${serviceBase}${path}`;
}

export function appUrl(path = '') {
  if (!cloudMode) return path.startsWith('/') ? path : `/${path}`;
  return `/judge-studio/${String(path).replace(/^\/+/, '')}`;
}

export async function apiFetch(path, options = {}, retry = true) {
  if (!cloudMode) return fetch(path, options);
  const headers = new Headers(options.headers || {});
  headers.set('authorization', `Bearer ${await accessToken()}`);
  const response = await fetch(remoteApiUrl(path), { ...options, headers });
  if (response.status !== 401 || !retry) return response;
  sessionStorage.removeItem('judge_cloud_token');
  await accessToken(true);
  return apiFetch(path, options, false);
}

export async function downloadApi(path, fileName) {
  const response = await apiFetch(path);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || payload.message || '下载失败');
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(await response.blob());
  link.download = fileName || 'download';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function isCloudMode() {
  return cloudMode;
}
