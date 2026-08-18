import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { callJudge } from './lib/evaluator.js';
import { parseWorksheet } from './lib/excel.js';
import { deleteRun, listRuns, readRunArtifact, readUploadArtifact, saveRun, saveUpload } from './lib/storage.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3077);
const maxBody = 20 * 1024 * 1024;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function download(res, { content, contentType, fileName }) {
  const encodedName = encodeURIComponent(fileName);
  res.writeHead(200, {
    'content-type': contentType,
    'content-disposition': `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
    'content-length': content.length
  });
  res.end(content);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBody) {
        reject(new Error('文件不能超过 20 MB'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/excel') {
    const buffer = await readBody(req);
    if (!buffer.length) return json(res, 400, { error: '请选择 Excel 文件' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheets = workbook.worksheets.map(parseWorksheet);
    if (!sheets.some(sheet => sheet.rows.length)) return json(res, 400, { error: 'Excel 中没有可读取的数据' });
    let originalName = '评估数据集.xlsx';
    try { originalName = decodeURIComponent(req.headers['x-file-name'] || originalName); } catch {}
    const upload = await saveUpload({ buffer, originalName });
    return json(res, 200, { sheets, upload });
  }

  if (req.method === 'POST' && pathname === '/api/evaluate') {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort(new Error('客户端已中断请求'));
    });
    const result = await callJudge(body, fetch, controller.signal);
    return json(res, 200, result);
  }

  if (req.method === 'GET' && pathname === '/api/runs') {
    return json(res, 200, { runs: await listRuns() });
  }

  if (req.method === 'POST' && pathname === '/api/runs') {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    return json(res, 201, { run: await saveRun(body) });
  }

  const runRecord = pathname.match(/^\/api\/runs\/([0-9a-f-]{36})$/i);
  if (req.method === 'DELETE' && runRecord) {
    return json(res, 200, { deleted: await deleteRun(runRecord[1]) });
  }

  const runDownload = pathname.match(/^\/api\/runs\/([0-9a-f-]{36})\/download$/i);
  if (req.method === 'GET' && runDownload) {
    const format = url.searchParams.get('format') || 'csv';
    const artifact = await readRunArtifact(runDownload[1], format);
    return download(res, { ...artifact, fileName: `evaluation-${runDownload[1]}.${format}` });
  }

  const uploadDownload = pathname.match(/^\/api\/uploads\/([0-9a-f-]{36})\/download$/i);
  if (req.method === 'GET' && uploadDownload) {
    return download(res, await readUploadArtifact(uploadDownload[1]));
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/api/')) {
      const handled = await handleApi(req, res);
      if (handled === false) json(res, 404, { error: '接口不存在' });
      return;
    }

    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
    const file = join(root, safePath);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    if (res.destroyed || res.writableEnded) return;
    const connectionFailure = /fetch failed|timeout|timed out|econnreset|connection reset|upstream connect|disconnect|connection termination/i.test(error?.message || '');
    const status = error?.code === 'ENOENT' ? 404 : Number(error?.status) || (connectionFailure ? 502 : 400);
    if (req.url?.startsWith('/api/')) json(res, status, { error: error.message || '请求失败' });
    else {
      res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(status === 404 ? 'Not found' : 'Server error');
    }
  }
});

server.listen(port, () => {
  console.log(`Judge Studio running at http://localhost:${port}`);
});
