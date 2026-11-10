const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '.local-config.json');
let saved = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;

function loadConfig() {
  if (saved) return { ...saved };
  const oneapi = !!process.env.ONEAPI_BASE;
  return {
    provider: oneapi ? 'oneapi' : 'ark',
    base: (oneapi ? process.env.ONEAPI_BASE : process.env.ARK_BASE || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, ''),
    model: oneapi ? process.env.ONEAPI_MODEL || '' : process.env.ARK_MODEL || 'doubao-seed-2-1-pro-260915',
    key: (oneapi ? process.env.ONEAPI_API_KEY : process.env.ARK_API_KEY) || '',
  };
}
function publicConfig() {
  const { key, ...config } = loadConfig();
  return { ...config, hasKey: !!key };
}
function saveConfig(body) {
  if (!body || !['ark', 'oneapi'].includes(body.provider)) throw new Error('请选择接口类型');
  const base = String(body.base || '').trim().replace(/\/+$/, '');
  let url;
  try { url = new URL(base); } catch { throw new Error('请填写有效的接口地址'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('地址需为 HTTP 或 HTTPS，不能包含账号、查询参数或片段');
  if (/\/(chat\/completions|responses)$/.test(url.pathname)) throw new Error('请填写基础地址（如 https://你的域名/v1），不要包含 /chat/completions 或 /responses');
  const model = String(body.model || '').trim();
  if (!model || model.length > 200) throw new Error('请填写模型名称，长度不超过 200 字符');
  const previous = loadConfig();
  const key = String(body.key || '').trim() || (previous.provider === body.provider && previous.base === base ? previous.key : '');
  if (!key || /[\r\n]/.test(key)) throw new Error('请填写有效的 API Key；更换地址或接口类型时需重新输入');
  const next = { provider: body.provider, base, model, key };
  const temp = FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(temp, 0o600);
  fs.renameSync(temp, FILE);
  saved = next;
}
function localSettingsRequest(req) {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return false;
  if (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers.forwarded) return false;
  let host;
  try { host = new URL('http://' + req.headers.host); } catch { return false; }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host.hostname)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  if (req.method === 'POST' && req.headers.origin !== host.origin) return false;
  return !req.headers.origin || req.headers.origin === host.origin;
}
module.exports = { loadConfig, publicConfig, saveConfig, localSettingsRequest };
