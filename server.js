import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { callJudge } from './lib/evaluator.js';
import { parseWorksheet } from './lib/excel.js';
import { parseRuleWorksheet } from './lib/rule-excel.js';
import { composeJudgeSystemPrompt } from './public/rule-attachment.js';
import { parsePdfRules } from './lib/rule-pdf.js';
import { applicationOwnsCors } from './lib/cors.js';
import { readBody } from './lib/request-body.js';
import { MAX_DATASET_UPLOAD_BYTES, MAX_RULE_UPLOAD_BYTES } from './public/upload-limits.js';
import { extractDatasetImages } from './lib/dataset-images.js';
import { resolveCaseImages } from './lib/case-images.js';
import { deleteRun, listRuns, readRunArtifact, readUploadArtifact, readUploadImage, saveRun, saveUpload } from './lib/storage-runtime.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3077);
const apiVersion = 2;
const startedAt = new Date().toISOString();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
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

async function handleApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      apiVersion,
      startedAt,
      pid: process.pid,
      capabilities: { webSearch: true, ruleExcel: true, ruleImages: true, rulePdf: true, datasetImages: true, imageResizing: true },
      uploadLimits: { datasetBytes: MAX_DATASET_UPLOAD_BYTES, ruleBytes: MAX_RULE_UPLOAD_BYTES }
    });
  }

  if (req.method === 'POST' && pathname === '/api/excel') {
    const buffer = await readBody(req, MAX_DATASET_UPLOAD_BYTES);
    if (!buffer.length) return json(res, 400, { error: '请选择 Excel 文件' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const assets = [];
    const sheets = workbook.worksheets.map(worksheet => {
      const extracted = extractDatasetImages(worksheet);
      const sheet = parseWorksheet(worksheet, extracted);
      assets.push(...extracted.images.map(image => ({ ...image, columnName: sheet.columns[image.columnNumber - 1] })));
      return sheet;
    });
    if (!sheets.some(sheet => sheet.rows.length)) return json(res, 400, { error: 'Excel 中没有可读取的数据' });
    let originalName = '评估数据集.xlsx';
    try { originalName = decodeURIComponent(req.headers['x-file-name'] || originalName); } catch {}
    const upload = await saveUpload({ buffer, originalName, images: assets });
    for (const sheet of sheets) {
      if (sheet.images) sheet.images = sheet.images.map(image => ({ ...image, uploadId: upload.id }));
    }
    return json(res, 200, { sheets, upload });
  }

  if (req.method === 'POST' && pathname === '/api/rules/excel') {
    const buffer = await readBody(req);
    if (!buffer.length) return json(res, 400, { error: '请选择 Excel 评审规则文件' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheets = workbook.worksheets.map(parseRuleWorksheet).filter(sheet => sheet.rows.length || sheet.images.length);
    if (!sheets.length) return json(res, 400, { error: '规则文件中没有可读取的单元格文字或内嵌图片' });
    const characters = sheets.reduce((sum, sheet) => sum + sheet.rows.reduce((total, row) => total + row.cells.reduce((count, cell) => count + cell.value.length, 0), 0), 0);
    if (characters > 2000000) return json(res, 400, { error: '规则文件超过 200 万字符，请删减后上传' });
    const imageBytes = sheets.reduce((sum, sheet) => sum + sheet.images.reduce((total, image) => total + (image.size || 0), 0), 0);
    if (imageBytes > 40 * 1024 * 1024) return json(res, 400, { error: '规则文件内嵌图片总大小超过 40 MB，请压缩或拆分 Excel 后上传' });
    return json(res, 200, { sheets });
  }

  if (req.method === 'POST' && pathname === '/api/rules/pdf') {
    return json(res, 200, await parsePdfRules(await readBody(req), {
      metadataOnly: url.searchParams.get('metadata') === '1', pageRange: url.searchParams.get('pages') || ''
    }));
  }

  if (req.method === 'POST' && pathname === '/api/evaluate') {
    const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort(new Error('客户端已中断请求'));
    });
    const caseImages = await resolveCaseImages(body.caseInput);
    if (controller.signal.aborted) throw new Error('客户端已中断请求');
    const result = await callJudge({ ...body, caseImages, ruleImages: body.ruleAttachment?.images || [], systemPrompt: composeJudgeSystemPrompt(body.systemPrompt, body.ruleAttachment) }, fetch, controller.signal);
    return json(res, 200, { ...result, caseImages: caseImages.map(({ dataUrl, ...image }, index) => ({ ...image, modelImage: result.imageProcessing.caseImages[index] })) });
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

  const uploadImage = pathname.match(/^\/api\/uploads\/([0-9a-f-]{36})\/images\/([a-zA-Z0-9-]{1,80})$/i);
  if (req.method === 'GET' && uploadImage) {
    const image = await readUploadImage(uploadImage[1], uploadImage[2]);
    res.writeHead(200, { 'content-type': image.contentType, 'content-length': image.content.length,
      'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' });
    res.end(image.content);
    return;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const ownsCors = applicationOwnsCors();
    if (ownsCors) {
      res.setHeader('access-control-allow-origin', process.env.JUDGE_CORS_ORIGIN || '*');
      res.setHeader('vary', 'origin');
    }
    if (req.method === 'OPTIONS') {
      const headers = ownsCors ? {
        'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-file-name',
        'access-control-max-age': '86400'
      } : {};
      res.writeHead(204, headers);
      res.end();
      return;
    }
    if (req.url?.startsWith('/api/')) {
      const handled = await handleApi(req, res);
      if (handled === false) json(res, 404, { error: '接口不存在' });
      return;
    }

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
    if (status === 413) res.setHeader('connection', 'close');
    if (req.url?.startsWith('/api/')) json(res, status, { error: error.message || '请求失败' });
    else {
      res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(status === 404 ? 'Not found' : 'Server error');
    }
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Judge Studio running at http://localhost:${port}`);
});
