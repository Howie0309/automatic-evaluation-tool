import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import cloudbase from '@cloudbase/node-sdk';
import { parseWorksheet } from './excel.js';
import {
  buildResultsCsv,
  buildResultsXlsx,
  normalizeRunOutputs,
  sanitizeFilename
} from './storage.js';
import { deriveOutputColumns } from '../public/result-export.js';

const environmentId = process.env.TCB_ENV || process.env.SCF_NAMESPACE;
if (!environmentId) throw new Error('缺少 TCB_ENV，无法连接腾讯云存储');

const app = cloudbase.init({ env: environmentId });
const database = app.database();
const runs = database.collection('judge_studio_runs');
const uploads = database.collection('judge_studio_uploads');

function assertId(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) {
    const error = new Error('文件 ID 无效');
    error.status = 400;
    throw error;
  }
}

function cloudPath(...parts) {
  return ['judge-studio', ...parts].join('/');
}

function safeConfig(config = {}) {
  const allowed = [
    'provider', 'endpoint', 'model', 'systemPrompt', 'userTemplate', 'temperature',
    'reasoningEffort', 'webSearchMode', 'scorePath', 'retryCount', 'concurrency',
    'queryColumn', 'answerColumn', 'promptMappings'
  ];
  return Object.fromEntries(allowed.filter(key => config[key] != null).map(key => [key, config[key]]));
}

function normalizeDocument(document) {
  if (!document || typeof document !== 'object') return null;
  const value = document.data && typeof document.data === 'object' && document.data.id
    ? document.data
    : document;
  return { ...value, __documentId: document._id || value._id || value.id };
}

function responseDocuments(response) {
  const values = Array.isArray(response?.data) ? response.data : response?.data ? [response.data] : [];
  return values.map(normalizeDocument).filter(Boolean);
}

function collectionMissing(error) {
  return /collection.*(not exist|does not exist|不存在)|DATABASE_COLLECTION_NOT_EXIST/i.test(error?.message || error?.code || '');
}

async function getDocument(collection, id) {
  try {
    const direct = responseDocuments(await collection.doc(id).get())[0];
    if (direct) return direct;
    const documents = responseDocuments(await collection.limit(1000).get());
    return documents.find(document => document.id === id) || null;
  } catch (error) {
    if (collectionMissing(error)) return null;
    throw error;
  }
}

async function uploadMany(entries) {
  const uploaded = [];
  try {
    for (const [path, content] of entries) {
      const result = await app.uploadFile({ cloudPath: path, fileContent: content });
      uploaded.push(result.fileID);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await app.deleteFile({ fileList: uploaded }).catch(() => {});
    throw error;
  }
}

async function download(fileID) {
  const response = await app.downloadFile({ fileID });
  return Buffer.from(response.fileContent);
}

export async function saveUpload({ buffer, originalName }) {
  const id = randomUUID();
  const safeName = sanitizeFilename(originalName, 'dataset.xlsx');
  const uploadedAt = new Date().toISOString();
  const metadata = { id, originalName: safeName, size: buffer.length, uploadedAt };
  const [sourceFileID] = await uploadMany([[cloudPath('uploads', id, 'source.xlsx'), buffer]]);
  try {
    await uploads.add({ _id: id, ...metadata, sourceFileID });
  } catch (error) {
    await app.deleteFile({ fileList: [sourceFileID] }).catch(() => {});
    throw error;
  }
  return metadata;
}

export async function saveRun(payload) {
  if (!Array.isArray(payload?.results) || !payload.results.length) {
    const error = new Error('没有可保存的评估结果');
    error.status = 400;
    throw error;
  }
  if (payload.uploadId) assertId(payload.uploadId);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const fileName = sanitizeFilename(payload.fileName, 'evaluation.xlsx');
  const preferredOutputColumns = Array.isArray(payload.outputColumns)
    ? payload.outputColumns.map(column => ({ key: String(column.key), label: String(column.label) }))
    : [];
  const outputColumns = deriveOutputColumns(payload.results, preferredOutputColumns);
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
    webSearchMode: record.config.webSearchMode || 'off',
    resultCount: record.results.length,
    successCount: record.results.filter(item => item.status === 'success').length,
    range: record.range
  };
  const artifacts = await uploadMany([
    [cloudPath('runs', id, 'result.json'), Buffer.from(JSON.stringify(record, null, 2))],
    [cloudPath('runs', id, 'result.csv'), Buffer.from(buildResultsCsv(record.results, outputColumns, inputColumns, record.config))],
    [cloudPath('runs', id, 'result.xlsx'), await buildResultsXlsx(record.results, outputColumns, inputColumns, record.config)]
  ]);
  try {
    await runs.add({
      _id: id,
      ...summary,
      artifactFileIDs: { json: artifacts[0], csv: artifacts[1], xlsx: artifacts[2] }
    });
  } catch (error) {
    await app.deleteFile({ fileList: artifacts }).catch(() => {});
    throw error;
  }
  return summary;
}

export async function listRuns() {
  try {
    const response = await runs.limit(1000).get();
    return responseDocuments(response)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(({ artifactFileIDs, _openid, __documentId, ...summary }) => summary);
  } catch (error) {
    if (collectionMissing(error)) return [];
    throw error;
  }
}

async function hydrateLegacyRecord(record) {
  const hasColumns = Array.isArray(record.inputColumns) && record.inputColumns.length;
  const hasSourceRows = record.results?.some(item => item.sourceRow && Object.keys(item.sourceRow).length);
  if (hasColumns && hasSourceRows) return record;
  const fallbackColumns = [...new Set([record.config?.queryColumn, record.config?.answerColumn].filter(Boolean))];
  if (!record.uploadId) return { ...record, inputColumns: hasColumns ? record.inputColumns : fallbackColumns };
  try {
    const upload = await getDocument(uploads, record.uploadId);
    if (!upload?.sourceFileID) return { ...record, inputColumns: hasColumns ? record.inputColumns : fallbackColumns };
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await download(upload.sourceFileID));
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

export async function readRunArtifact(id, format) {
  assertId(id);
  if (!['csv', 'json', 'xlsx'].includes(format)) {
    const error = new Error('不支持的结果文件格式');
    error.status = 400;
    throw error;
  }
  const metadata = await getDocument(runs, id);
  if (!metadata?.artifactFileIDs?.json) {
    const error = new Error('评估记录不存在');
    error.status = 404;
    throw error;
  }
  const jsonContent = await download(metadata.artifactFileIDs.json);
  const record = normalizeRunOutputs(await hydrateLegacyRecord(JSON.parse(jsonContent.toString('utf8'))));
  if (format === 'json') {
    return { content: Buffer.from(JSON.stringify(record, null, 2)), contentType: 'application/json; charset=utf-8' };
  }
  if (format === 'csv') {
    return {
      content: Buffer.from(buildResultsCsv(record.results, record.outputColumns, record.inputColumns, record.config)),
      contentType: 'text/csv; charset=utf-8'
    };
  }
  return {
    content: await buildResultsXlsx(record.results, record.outputColumns, record.inputColumns, record.config),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

export async function readUploadArtifact(id) {
  assertId(id);
  const metadata = await getDocument(uploads, id);
  if (!metadata?.sourceFileID) {
    const error = new Error('上传文件不存在');
    error.status = 404;
    throw error;
  }
  return {
    content: await download(metadata.sourceFileID),
    fileName: metadata.originalName,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

export async function deleteRun(id) {
  assertId(id);
  const metadata = await getDocument(runs, id);
  if (!metadata) {
    const error = new Error('评估记录不存在');
    error.status = 404;
    throw error;
  }
  const runFiles = Object.values(metadata.artifactFileIDs || {}).filter(Boolean);
  if (runFiles.length) await app.deleteFile({ fileList: runFiles });
  await runs.doc(metadata.__documentId || id).remove();

  let uploadDeleted = false;
  if (metadata.uploadId) {
    const references = responseDocuments(await runs.limit(1000).get())
      .filter(run => run.uploadId === metadata.uploadId);
    if (!references.length) {
      const upload = await getDocument(uploads, metadata.uploadId);
      if (upload?.sourceFileID) await app.deleteFile({ fileList: [upload.sourceFileID] });
      if (upload) await uploads.doc(upload.__documentId || metadata.uploadId).remove();
      uploadDeleted = Boolean(upload);
    }
  }
  return { id, deletedAt: new Date().toISOString(), uploadDeleted, permanent: true };
}
