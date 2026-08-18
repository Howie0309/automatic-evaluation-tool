import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExportSchema } from '../public/result-export.js';

export const defaultStorageRoot = process.env.JUDGE_STORAGE_DIR
  ? resolve(process.env.JUDGE_STORAGE_DIR)
  : fileURLToPath(new URL('../data/', import.meta.url));

export function sanitizeFilename(value, fallback = 'file') {
  const name = basename(String(value || fallback))
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '-')
    .replace(/^\.+/, '')
    .trim();
  return name.slice(0, 160) || fallback;
}

function assertId(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) {
    const error = new Error('文件 ID 无效');
    error.status = 400;
    throw error;
  }
}

async function ensureStorage(root) {
  await Promise.all([
    mkdir(join(root, 'uploads'), { recursive: true }),
    mkdir(join(root, 'runs'), { recursive: true })
  ]);
}

export async function saveUpload({ buffer, originalName }, root = defaultStorageRoot) {
  await ensureStorage(root);
  const id = randomUUID();
  const safeName = sanitizeFilename(originalName, 'dataset.xlsx');
  const extension = extname(safeName).toLowerCase() === '.xlsx' ? '.xlsx' : '.xlsx';
  const directory = join(root, 'uploads', id);
  const uploadedAt = new Date().toISOString();
  const metadata = { id, originalName: safeName, size: buffer.length, uploadedAt };
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, `source${extension}`), buffer, { flag: 'wx' }),
    writeFile(join(directory, 'metadata.json'), JSON.stringify(metadata, null, 2), { flag: 'wx' })
  ]);
  return metadata;
}

function valueAtPath(object, path) {
  return String(path || '').split('.').reduce((current, key) => current?.[key], object);
}

function outputCellValue(output, key, fallback = '') {
  if (key === '__raw__') return typeof output === 'string' ? output : output == null ? fallback : JSON.stringify(output);
  if (output == null || typeof output !== 'object') return '';
  const value = Object.prototype.hasOwnProperty.call(output, key) ? output[key] : valueAtPath(output, key);
  if (value == null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function buildResultsCsv(results, outputColumns, inputColumns = [], config = {}) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const schema = buildExportSchema(inputColumns, outputColumns);
  const sourceValue = (item, column) => {
    if (item.sourceRow && Object.prototype.hasOwnProperty.call(item.sourceRow, column)) return item.sourceRow[column];
    if (column === config.queryColumn) return item.query;
    if (column === config.answerColumn) return item.answer;
    return '';
  };
  const rows = [
    [schema.labels.rowNumber, ...schema.inputColumns, schema.labels.status, ...schema.outputs.map(column => column.exportLabel), schema.labels.attempts, schema.labels.elapsed],
    ...(Array.isArray(results) ? results : []).map(item => [
      item.rowNumber,
      ...schema.inputColumns.map(column => sourceValue(item, column)),
      item.status,
      ...schema.outputs.map(column => outputCellValue(item.output, column.key, item.displayOutput)),
      item.attempts ?? 0,
      Math.round(Number(item.elapsed) || 0)
    ])
  ];
  return '\ufeff' + rows.map(row => row.map(quote).join(',')).join('\n');
}

function safeConfig(config = {}) {
  const allowed = [
    'provider', 'endpoint', 'model', 'systemPrompt', 'userTemplate', 'temperature',
    'reasoningEffort', 'scorePath', 'retryCount', 'concurrency', 'queryColumn', 'answerColumn', 'promptMappings'
  ];
  return Object.fromEntries(allowed.filter(key => config[key] != null).map(key => [key, config[key]]));
}

export async function saveRun(payload, root = defaultStorageRoot) {
  await ensureStorage(root);
  if (!Array.isArray(payload?.results) || !payload.results.length) {
    const error = new Error('没有可保存的评估结果');
    error.status = 400;
    throw error;
  }
  if (payload.uploadId) assertId(payload.uploadId);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const fileName = sanitizeFilename(payload.fileName, 'evaluation.xlsx');
  const outputColumns = Array.isArray(payload.outputColumns)
    ? payload.outputColumns.map(column => ({ key: String(column.key), label: String(column.label) }))
    : [];
  const inputColumns = Array.isArray(payload.inputColumns) ? [...new Set(payload.inputColumns.map(String))] : [];
  const record = {
    id,
    createdAt,
    status: payload.status === 'stopped' ? 'stopped' : 'completed',
    uploadId: payload.uploadId || null,
    fileName,
    range: payload.range || null,
    config: safeConfig(payload.config),
    inputColumns,
    outputColumns,
    results: payload.results
  };
  const summary = {
    id,
    createdAt,
    status: record.status,
    uploadId: record.uploadId,
    fileName,
    model: record.config.model || '',
    provider: record.config.provider || '',
    resultCount: record.results.length,
    successCount: record.results.filter(item => item.status === 'success').length,
    range: record.range
  };
  const directory = join(root, 'runs', id);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, 'result.json'), JSON.stringify(record, null, 2), { flag: 'wx' }),
    writeFile(join(directory, 'result.csv'), buildResultsCsv(record.results, outputColumns, inputColumns, record.config), { flag: 'wx' }),
    writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx' })
  ]);
  return summary;
}

export async function listRuns(root = defaultStorageRoot) {
  await ensureStorage(root);
  const entries = await readdir(join(root, 'runs'), { withFileTypes: true });
  const summaries = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => {
    try {
      return JSON.parse(await readFile(join(root, 'runs', entry.name, 'summary.json'), 'utf8'));
    } catch {
      return null;
    }
  }));
  return summaries.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readRunArtifact(id, format, root = defaultStorageRoot) {
  assertId(id);
  if (!['csv', 'json'].includes(format)) {
    const error = new Error('不支持的结果文件格式');
    error.status = 400;
    throw error;
  }
  const content = await readFile(join(root, 'runs', id, `result.${format}`));
  return { content, contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8' };
}

export async function readUploadArtifact(id, root = defaultStorageRoot) {
  assertId(id);
  const directory = join(root, 'uploads', id);
  const metadata = JSON.parse(await readFile(join(directory, 'metadata.json'), 'utf8'));
  const content = await readFile(join(directory, 'source.xlsx'));
  return { content, fileName: metadata.originalName, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}

export async function deleteRun(id, root = defaultStorageRoot) {
  assertId(id);
  await ensureStorage(root);
  const runDirectory = join(root, 'runs', id);
  const summary = JSON.parse(await readFile(join(runDirectory, 'summary.json'), 'utf8'));
  const deletedAt = new Date().toISOString();
  const runInfo = await lstat(runDirectory);
  if (!runInfo.isDirectory() || runInfo.isSymbolicLink()) throw new Error('评估记录目录异常，已停止删除');

  const existingRuns = await listRuns(root);
  const deleteUpload = summary.uploadId && !existingRuns.some(run => run.id !== id && run.uploadId === summary.uploadId);
  let uploadDirectory = null;
  if (deleteUpload) {
    uploadDirectory = join(root, 'uploads', summary.uploadId);
    try {
      const uploadInfo = await lstat(uploadDirectory);
      if (!uploadInfo.isDirectory() || uploadInfo.isSymbolicLink()) throw new Error('上传文件目录异常，已停止删除');
    } catch (error) {
      if (error.code === 'ENOENT') uploadDirectory = null;
      else throw error;
    }
  }

  await rm(runDirectory, { recursive: true });
  let uploadDeleted = false;
  if (uploadDirectory) {
    await rm(uploadDirectory, { recursive: true });
    uploadDeleted = true;
  }
  return { id, deletedAt, uploadDeleted, permanent: true };
}
