import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { callJudge } from './lib/evaluator.js';

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
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && req.url === '/api/excel') {
    const buffer = await readBody(req);
    if (!buffer.length) return json(res, 400, { error: '请选择 Excel 文件' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheets = workbook.worksheets.map(worksheet => {
      const headerRow = worksheet.getRow(1);
      const columns = [];
      for (let columnIndex = 1; columnIndex <= headerRow.cellCount; columnIndex++) {
        columns.push(headerRow.getCell(columnIndex).text.trim() || `列${columnIndex}`);
      }
      const rows = [];
      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const excelRow = worksheet.getRow(rowIndex);
        const row = Object.fromEntries(columns.map((column, index) => [column, excelRow.getCell(index + 1).text]));
        if (Object.values(row).some(value => value !== '')) rows.push(row);
      }
      return { name: worksheet.name, rows, columns };
    });
    return json(res, 200, { sheets });
  }

  if (req.method === 'POST' && req.url === '/api/evaluate') {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort(new Error('客户端已中断请求'));
    });
    const result = await callJudge(body, fetch, controller.signal);
    return json(res, 200, result);
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
