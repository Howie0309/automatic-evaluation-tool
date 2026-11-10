import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname, resolve, sep } from 'node:path';
import { tools, workspace } from './lib/catalog.mjs';
import { Services } from './lib/services.mjs';
import { projectStore } from './lib/projects.mjs';
import { readRecords } from './lib/records.mjs';

export function createPlatform({ root = workspace, dataDirectory = join(root, 'data/platform'), port = 3088 } = {}) {
  const services = new Services(root, dataDirectory);
  const projects = projectStore(dataDirectory);
  const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
  const json = (res, code, value) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
  const server = http.createServer(async (req, res) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'same-origin');
    res.setHeader('content-security-policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src http://127.0.0.1:3077 http://127.0.0.1:3210 http://127.0.0.1:8787; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return json(res, 403, { error: '仅允许本机访问' });
      const url = new URL(req.url, `http://${host}`);
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, 403, { error: '不允许跨站操作' });
        if (req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: '不允许跨站操作' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: '需要 JSON 格式' });
      }
      const body = async () => {
        let size = 0; const chunks = [];
        for await (const chunk of req) { size += chunk.length; if (size > 512000) throw Object.assign(new Error('请求过大'), { status: 413 }); chunks.push(chunk); }
        try { const value = JSON.parse(Buffer.concat(chunks).toString() || '{}'); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
        catch { throw Object.assign(new Error('JSON 格式无效'), { status: 400 }); }
      };
      const pathname = url.pathname;
      if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, { ok: true, name: 'evaluation-workspace', version: 1 });
      if (req.method === 'GET' && pathname === '/api/overview') {
        const [serviceList, projectList] = await Promise.all([services.list(), projects.list()]);
        const records = await readRecords(root, { liveTools: serviceList.filter(tool => tool.status === 'online').map(tool => tool.id) });
        return json(res, 200, { tools: serviceList, projects: projectList, ...records, updatedAt: new Date().toISOString() });
      }
      if (req.method === 'GET' && pathname === '/api/environment') return json(res, 200, { node: process.version, platform: process.platform, architecture: process.arch, workspace: root, dataDirectory, local: true });
      if (req.method === 'GET' && pathname === '/api/projects') return json(res, 200, { projects: await projects.list() });
      if (req.method === 'POST' && pathname === '/api/projects') return json(res, 201, { project: await projects.create(await body()) });
      const projectMatch = pathname.match(/^\/api\/projects\/([a-f0-9-]{36})$/);
      if (req.method === 'PATCH' && projectMatch) return json(res, 200, { project: await projects.update(projectMatch[1], await body()) });
      const startMatch = pathname.match(/^\/api\/tools\/([a-z]+)\/start$/);
      if (req.method === 'POST' && startMatch) { await body(); return json(res, 202, await services.start(startMatch[1])); }
      if (req.method === 'POST' && pathname === '/api/start-all') { await body(); for (const tool of tools) await services.start(tool.id); return json(res, 202, { accepted: true }); }
      const logsMatch = pathname.match(/^\/api\/tools\/([a-z]+)\/logs$/);
      if (req.method === 'GET' && logsMatch) return json(res, 200, { logs: await services.logs(logsMatch[1]) });
      if (req.method === 'POST' && pathname === '/api/shutdown') {
        await body(); json(res, 200, { ok: true }); setTimeout(() => { services.close(); server.close(); }, 100); return;
      }
      if (pathname.startsWith('/api/')) return json(res, 404, { error: '接口不存在' });
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: '请求方法不支持' });
      const file = resolve(publicRoot, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(publicRoot + (publicRoot.endsWith(sep) ? '' : sep))) return json(res, 403, { error: '无效路径' });
      const content = await readFile(file);
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!res.headersSent) json(res, error.status || (error.code === 'ENOENT' ? 404 : 500), { error: error.message || '操作失败' });
      else res.end();
    }
  });
  server.on('close', () => services.close());
  return { server, services, listen: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server.address())); }) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const platform = createPlatform({ port: Number(process.env.PLATFORM_PORT || 3088) });
  const address = await platform.listen();
  console.log(`评估工作台已启动：http://127.0.0.1:${address.port}`);
  const shutdown = () => { platform.services.close(); platform.server.close(); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}
