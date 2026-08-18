import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { parseWorksheet } from './excel.js';
import { buildExportRows } from '../public/result-export.js';

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

export function buildResultsCsv(results, outputColumns, inputColumns = [], config = {}) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const { rows } = buildExportRows(results, outputColumns, inputColumns, config, { singleLine: true });
  return '\ufeff' + rows.map(row => row.map(quote).join(',')).join('\r\n');
}

export async function buildResultsXlsx(results, outputColumns, inputColumns = [], config = {}) {
  const { schema, rows } = buildExportRows(results, outputColumns, inputColumns, config);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Judge Studio';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('评估结果', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1, activeCell: 'C2' }],
    properties: { defaultRowHeight: 22 }
  });
  worksheet.addRows(rows);
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: rows[0].length } };

  const header = worksheet.getRow(1);
  header.height = 28;
  header.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B52' } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };

  const compactLabels = new Set([
    schema.labels.rowNumber, schema.labels.excelRowNumber, schema.labels.status,
    schema.labels.attempts, schema.labels.elapsed
  ]);
  worksheet.columns.forEach((column, index) => {
    const label = String(rows[0][index] ?? '');
    const sampleLengths = rows.slice(0, 101).map(row => String(row[index] ?? '').replace(/\r\n?|\n/g, ' ↵ ').length);
    const contentWidth = Math.max(label.length + 2, ...sampleLengths.map(length => Math.min(length + 2, 36)));
    column.width = compactLabels.has(label) ? Math.min(Math.max(contentWidth, 10), 14) : Math.min(Math.max(contentWidth, 16), 48);
    column.alignment = {
      vertical: 'top',
      horizontal: compactLabels.has(label) ? 'center' : 'left',
      wrapText: false
    };
  });
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    row.height = 22;
    row.font = { name: 'Arial', size: 10 };
    if (rowIndex % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F8F6' } };
  }
  worksheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return Buffer.from(await workbook.xlsx.writeBuffer());
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
  const csv = buildResultsCsv(record.results, outputColumns, inputColumns, record.config);
  const xlsx = await buildResultsXlsx(record.results, outputColumns, inputColumns, record.config);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, 'result.json'), JSON.stringify(record, null, 2), { flag: 'wx' }),
    writeFile(join(directory, 'result.csv'), csv, { flag: 'wx' }),
    writeFile(join(directory, 'result.xlsx'), xlsx, { flag: 'wx' }),
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
  if (!['csv', 'json', 'xlsx'].includes(format)) {
    const error = new Error('不支持的结果文件格式');
    error.status = 400;
    throw error;
  }
  const jsonContent = await readFile(join(root, 'runs', id, 'result.json'));
  if (format === 'json') return { content: jsonContent, contentType: 'application/json; charset=utf-8' };
  const record = await hydrateLegacyRecord(JSON.parse(jsonContent.toString('utf8')), root);
  if (format === 'csv') {
    const content = Buffer.from(buildResultsCsv(record.results, record.outputColumns, record.inputColumns, record.config));
    return { content, contentType: 'text/csv; charset=utf-8' };
  }
  const content = await buildResultsXlsx(record.results, record.outputColumns, record.inputColumns, record.config);
  return { content, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}

async function hydrateLegacyRecord(record, root) {
  const hasColumns = Array.isArray(record.inputColumns) && record.inputColumns.length;
  const hasSourceRows = record.results?.some(item => item.sourceRow && Object.keys(item.sourceRow).length);
  if (hasColumns && hasSourceRows) return record;

  const fallbackColumns = [...new Set([record.config?.queryColumn, record.config?.answerColumn].filter(Boolean))];
  if (!record.uploadId) return { ...record, inputColumns: hasColumns ? record.inputColumns : fallbackColumns };
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readFile(join(root, 'uploads', record.uploadId, 'source.xlsx')));
    const required = new Set([
      record.config?.queryColumn,
      record.config?.answerColumn,
      ...Object.values(record.config?.promptMappings || {})
    ].filter(Boolean));
    const sheets = workbook.worksheets.map(parseWorksheet).filter(sheet => sheet.rows.length);
    const sheet = sheets.sort((a, b) => {
      const score = candidate => candidate.columns.filter(column => required.has(column)).length;
      return score(b) - score(a);
    })[0];
    if (!sheet) return { ...record, inputColumns: hasColumns ? record.inputColumns : fallbackColumns };
    const results = (record.results || []).map(item => {
      if (item.sourceRow && Object.keys(item.sourceRow).length) return item;
      const sourceIndex = Number(item.rowNumber) - 1;
      return {
        ...item,
        sourceRow: sheet.rows[sourceIndex] || {},
        excelRowNumber: item.excelRowNumber ?? sheet.rowNumbers[sourceIndex] ?? ''
      };
    });
    return { ...record, inputColumns: hasColumns ? record.inputColumns : sheet.columns, results };
  } catch {
    return { ...record, inputColumns: hasColumns ? record.inputColumns : fallbackColumns };
  }
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
