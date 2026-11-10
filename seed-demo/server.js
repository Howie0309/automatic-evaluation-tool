// 生成式UI演示：本地模型代理与联网搜索
// 作用：保存 API Key、转发请求到火山方舟 Responses API、把流式结果转给浏览器。
// 运行：node --env-file=.env server.js   （Node.js 20.6 及以上，无需安装依赖）
// 分享：bash share.sh   （会同时启动本服务和 Cloudflare 临时隧道）
const http = require('http');
const fs = require('fs');
const path = require('path');

const { loadConfig, publicConfig, saveConfig, localSettingsRequest } = require('./config');
const { chatCompletion } = require('./oneapi');
const { enrichSearch, searchWeb, publicSearchConfig, saveSearchConfig } = require('./search');
const PORT = Number(process.env.PORT || 8787);
const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();
const RATE_PER_MIN = Number(process.env.RATE_PER_MIN || 6);    // 每人每分钟
const RATE_PER_DAY = Number(process.env.RATE_PER_DAY || 60);   // 每人每天
const DAILY_CAP = Number(process.env.DAILY_CAP || 300);        // 所有人每天合计
const INDEX = path.join(__dirname, 'public', 'index.html');

if (!loadConfig().key) console.warn('⚠ 尚未配置 API Key，可在页面的 API 设置中添加。');

const today = () => new Date().toISOString().slice(0, 10);
let day = today(), totalToday = 0;
const hits = new Map(), fails = new Map();
const clientIP = req => (req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '').trim();
const viaTunnel = req => !!(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']);
function rateCheck(ip) {
  const d = today(); if (d !== day) { day = d; totalToday = 0; hits.clear(); }
  const now = Date.now(); const h = hits.get(ip) || { min: [], day: 0 };
  h.min = h.min.filter(t => now - t < 60000);
  if (totalToday >= DAILY_CAP) return '今天的总调用次数已经用完了，明天再来。';
  if (h.day >= RATE_PER_DAY) return '你今天的调用次数已经用完了，明天再来。';
  if (h.min.length >= RATE_PER_MIN) return '发得太快了，等一分钟再试。';
  h.min.push(now); h.day++; totalToday++; hits.set(ip, h); return null;
}
function codeCheck(req, ip) {
  if (!ACCESS_CODE) return viaTunnel(req) ? { code: 'access', message: '分享模式必须设置 ACCESS_CODE，请在 .env 里加上访问码后重启。' } : null;
  const f = fails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 3600000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 10) return { code: 'rate_limited', message: '访问码错误次数太多，一小时后再试。' };
  if (String(req.headers['x-access-code'] || '').trim() === ACCESS_CODE) return null;
  f.n++; fails.set(ip, f); return { code: 'access', message: '访问码不对。' };
}

function readBody(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('请求太大')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// 把前端的对话转换成 Responses API 的 input
function toInput(system, turns, images) {
  const input = [{ role: 'system', content: system }];
  const lastUser = turns.map(t => t.role).lastIndexOf('user');
  turns.forEach((t, i) => {
    if (t.role === 'assistant') { input.push({ role: 'assistant', content: t.content }); return; }
    const parts = [];
    if (i === lastUser) for (const url of images || []) parts.push({ type: 'input_image', image_url: url });
    parts.push({ type: 'input_text', text: t.content });
    input.push({ role: 'user', content: parts });
  });
  return input;
}

function codeFor(status) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limited';
  if (status >= 400 && status < 500) return 'bad_request';
  return 'upstream_error';
}

async function handleChat(req, res) {
  const send = obj => res.write(JSON.stringify(obj) + '\n');
  // 用 text/event-stream，经过 Cloudflare 隧道时不会被缓冲
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
  const config = loadConfig();
  if (!config.key) { send({ t: 'error', code: 'auth', message: '请先在 API 设置中配置 API Key' }); return res.end(); }
  const ip = clientIP(req);
  const denied = codeCheck(req, ip);
  if (denied) { console.log('拒绝', ip, denied.message); send({ t: 'error', ...denied }); return res.end(); }
  const limited = rateCheck(ip);
  if (limited) { console.log('限流', ip, limited); send({ t: 'error', code: 'rate_limited', message: limited }); return res.end(); }

  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { send({ t: 'error', code: 'bad_request', message: '请求格式错误：' + e.message }); return res.end(); }

  const upstreamCtl = new AbortController();
  res.on('close', () => { if (!res.writableEnded) upstreamCtl.abort(); });

  try { body = await enrichSearch(body, send, upstreamCtl.signal); }
  catch (e) { if (e.name !== 'AbortError') send({ t: 'error', code: 'upstream_error', message: e.message }); return res.end(); }

  if (config.provider === 'oneapi') {
    try { await chatCompletion(config, body, send, upstreamCtl.signal); }
    catch (e) { if (e.name !== 'AbortError') send({ t: 'error', code: 'upstream_error', message: e.message }); }
    return res.end();
  }

  const payload = {
    model: config.model,
    input: toInput(String(body.system || '').slice(0, 40000), Array.isArray(body.turns) ? body.turns.slice(-12) : [], (body.images || []).slice(0, 2)),
    stream: true,
    thinking: { type: body.thinking === 'enabled' ? 'enabled' : 'disabled' },
  };
  const t0 = Date.now(); let first = 0; let text = '';
  try {
    const up = await fetch(config.base + '/responses', {
      method: 'POST', signal: upstreamCtl.signal,
      headers: { 'Authorization': 'Bearer ' + config.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!up.ok || !up.body) {
      const detail = await up.text().catch(() => '');
      console.error('方舟返回', up.status, detail.slice(0, 500));
      send({ t: 'error', code: codeFor(up.status), message: '方舟返回 ' + up.status + '：' + detail.slice(0, 300) });
      return res.end();
    }
    const reader = up.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      buf = buf.replace(/\r\n/g, '\n');
      let k;
      while ((k = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, k); buf = buf.slice(k + 2);
        const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (!data || data === '[DONE]') continue;
        let ev; try { ev = JSON.parse(data); } catch { continue; }
        switch (ev.type) {
          case 'response.output_text.delta':
            if (!first) first = Date.now();
            text += ev.delta || ''; send({ t: 'delta', v: ev.delta || '' }); break;
          case 'response.reasoning_summary_text.delta':
          case 'response.reasoning_text.delta':
            send({ t: 'think' }); break;
          case 'response.completed': {
            const u = ev.response && ev.response.usage;
            console.log(`完成 ${ip} ${payload.model} 思考=${payload.thinking.type} 首字 ${first ? first - t0 : '-'}ms 总计 ${Date.now() - t0}ms` + (u ? ` 输入 ${u.input_tokens} 输出 ${u.output_tokens} tokens` : ''));
            break;
          }
          case 'response.incomplete':
            send({ t: 'truncated' }); break;
          case 'response.failed':
          case 'error': {
            const err = ev.response && ev.response.error || ev.error || ev;
            send({ t: 'error', code: 'upstream_error', message: (err.code ? err.code + '：' : '') + (err.message || '生成失败') });
            break;
          }
        }
      }
    }
    send({ t: 'done' });
  } catch (e) {
    if (e.name !== 'AbortError') { console.error(e); send({ t: 'error', code: 'upstream_error', message: e.message }); }
  }
  res.end();
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const staticFiles = {
    '/components.js': 'text/javascript; charset=utf-8',
    '/components.css': 'text/css; charset=utf-8',
    '/theme.css': 'text/css; charset=utf-8',
    '/presentation-rules.js': 'text/javascript; charset=utf-8',
    '/template-data.js': 'text/javascript; charset=utf-8',
    '/template-showcase.js': 'text/javascript; charset=utf-8',
    '/template-gallery.js': 'text/javascript; charset=utf-8',
    '/template-gallery.css': 'text/css; charset=utf-8',
    '/reference/template-atlas.html': 'text/html; charset=utf-8',
    '/reference/template-inventory.json': 'application/json; charset=utf-8',
    '/reference/template-inventory.md': 'text/markdown; charset=utf-8',
    '/atomic-kit.js': 'text/javascript; charset=utf-8',
    '/atomic-kit.css': 'text/css; charset=utf-8',
    '/component-inventory.js': 'text/javascript; charset=utf-8',
    '/component-atlas.js': 'text/javascript; charset=utf-8',
    '/reference/component-inventory.json': 'application/json; charset=utf-8',
    '/reference/component-inventory.md': 'text/markdown; charset=utf-8',
    '/reference/component-atlas.html': 'text/html; charset=utf-8',
    '/assets/circle.svg': 'image/svg+xml',
    '/assets/triangle.svg': 'image/svg+xml',
    '/assets/square.svg': 'image/svg+xml',
  };
  if (req.method === 'GET' && Object.hasOwn(staticFiles, url.pathname)) {
    res.writeHead(200, { 'Content-Type': staticFiles[url.pathname], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(path.join(__dirname, 'public', url.pathname)).pipe(res);
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return fs.createReadStream(INDEX).pipe(res);
  }
  if (url.pathname === '/api/search-config' || url.pathname === '/api/search') {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    if (!localSettingsRequest(req)) return json(403, { error: '搜索设置与测试仅允许本机页面访问' });
    if (req.method === 'GET' && url.pathname === '/api/search-config') return json(200, publicSearchConfig());
    if (req.method !== 'POST') return json(405, { error: '不支持此请求方法' });
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(415, { error: '需要 JSON 格式' });
    try {
      const data = JSON.parse(await readBody(req, 16384));
      if (url.pathname === '/api/search-config') { saveSearchConfig(data); return json(200, publicSearchConfig()); }
      const controller = new AbortController();
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      return json(200, await searchWeb(data.query, controller.signal));
    } catch(e) { if (res.destroyed) return; return json(400, { error: e.code ? '搜索服务暂不可用，请检查设置与网络' : e.message }); }
  }
  if (url.pathname === '/api/config') {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    if (!localSettingsRequest(req)) return json(403, { error: 'API 设置仅允许本机页面访问' });
    if (req.method === 'GET') return json(200, publicConfig());
    if (req.method !== 'POST') return json(405, { error: '不支持此请求方法' });
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(415, { error: '需要 JSON 格式' });
    try { saveConfig(JSON.parse(await readBody(req, 16384))); return json(200, publicConfig()); }
    catch (e) { return json(400, { error: e.code ? '保存失败，请检查本地配置文件权限' : e.message }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ ok: !!loadConfig().key, model: loadConfig().model, provider: loadConfig().provider, needCode: !!ACCESS_CODE, search: publicSearchConfig() }));
  }
  if (req.method === 'POST' && url.pathname === '/api/chat') return handleChat(req, res);
  res.writeHead(404); res.end('Not found');
}).listen(PORT, '127.0.0.1', () => console.log(`打开 http://localhost:${PORT}  模型 ${loadConfig().model}` + (ACCESS_CODE ? '  已启用访问码' : '  未设置访问码（仅限本机使用）') + `  限流：每人每分钟 ${RATE_PER_MIN} 条、每天 ${RATE_PER_DAY} 条，全部合计每天 ${DAILY_CAP} 条`));
