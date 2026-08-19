import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { callJudge, normalizeEndpoint, parseJudgeOutput, renderTemplate, valueAtPath } from '../lib/evaluator.js';
import ExcelJS from 'exceljs';
import { buildResultsCsv, buildResultsXlsx, deleteRun, listRuns, readRunArtifact, readUploadArtifact, sanitizeFilename, saveRun, saveUpload } from '../lib/storage.js';
import { buildPromptData, EMPTY_MAPPING, extractTemplateVariables, suggestPromptMapping } from '../public/prompt-mapping.js';
import { extractDeclaredFields } from '../public/prompt-fields.js';
import { buildExportSchema } from '../public/result-export.js';
import { formatDetailAll, formatDetailInput, formatDetailOutput } from '../public/detail-format.js';
import { parseWorksheet } from '../lib/excel.js';
import { isRetryableError, retryDelay } from '../public/retry.js';

test('renderTemplate supports nested values and missing values', () => {
  assert.equal(renderTemplate('{{query}} / {{meta.lang}} / {{missing}}', { query: 'Q', meta: { lang: 'zh' } }), 'Q / zh / ');
});

test('parseJudgeOutput accepts plain and fenced JSON', () => {
  assert.deepEqual(parseJudgeOutput('{"score":8}'), { score: 8 });
  assert.deepEqual(parseJudgeOutput('```json\n{"score":9}\n```'), { score: 9 });
  assert.deepEqual(parseJudgeOutput('结果如下： {"score":7,"reason":"ok"}'), { score: 7, reason: 'ok' });
  assert.equal(parseJudgeOutput('合格：回答覆盖了关键事实。'), '合格：回答覆盖了关键事实。');
});

test('valueAtPath supports nested score', () => {
  assert.equal(valueAtPath({ result: { score: 6 } }, 'result.score'), 6);
});

test('detail formatter preserves complete model input and output for copying', () => {
  const input = formatDetailInput({ systemPrompt: '系统规则\n第二行', userPrompt: '问题：测试\n回答：完整内容' });
  const output = formatDetailOutput({ result: 'PASS', reason: '完整理由' });
  assert.match(input, /【System Prompt】\n系统规则\n第二行/);
  assert.match(input, /【User Prompt】\n问题：测试\n回答：完整内容/);
  assert.equal(output, '{\n  "result": "PASS",\n  "reason": "完整理由"\n}');
  assert.match(formatDetailAll(input, output), /【模型输出】[\s\S]*完整理由/);
  assert.equal(formatDetailOutput('**Markdown**\n完整输出'), '**Markdown**\n完整输出');
});

test('extractDeclaredFields returns top-level System Prompt variables', () => {
  const prompt = '请返回 {"result": {"score": 8}, "reason": "说明", "citations": []}';
  assert.deepEqual(extractDeclaredFields(prompt), ['result', 'reason', 'citations']);
  assert.deepEqual(extractDeclaredFields('请直接输出评审意见'), []);
});

test('prompt mapping extracts variables and suggests A/B dataset columns', () => {
  const template = '{{query}} {{answer_a}} {{answer_b}} {{a_qu}} {{b_comment}} {{context}} {{answer_a}}';
  assert.deepEqual(extractTemplateVariables(template), ['query', 'answer_a', 'answer_b', 'a_qu', 'b_comment', 'context']);
  const columns = ['query（多轮会话）', '百度answer', '豆包answer', '百度qu分值', '豆包qu分值', '百度备注', '豆包备注', 'QU GSB', '备注'];
  const options = { queryColumn: columns[0], answerColumn: columns[1] };
  assert.equal(suggestPromptMapping('query', columns, options), columns[0]);
  assert.equal(suggestPromptMapping('answer_a', columns, options), '百度answer');
  assert.equal(suggestPromptMapping('answer_b', columns, options), '豆包answer');
  assert.equal(suggestPromptMapping('a_qu', columns, options), '百度qu分值');
  assert.equal(suggestPromptMapping('b_comment', columns, options), '豆包备注');
  assert.equal(suggestPromptMapping('gsb', columns, options), 'QU GSB');
  assert.equal(suggestPromptMapping('context', columns, options), '');
});

test('prompt mapping injects selected columns and supports explicit empty values', () => {
  const row = { '问题列': 'Q', 'A回答': 'A1', 'B回答': 'A2' };
  const data = buildPromptData(row, {
    queryColumn: '问题列', answerColumn: 'A回答',
    promptMappings: { query: '问题列', answer_a: 'A回答', answer_b: 'B回答', context: EMPTY_MAPPING }
  });
  assert.deepEqual({ query: data.query, answer: data.answer, answer_a: data.answer_a, answer_b: data.answer_b, context: data.context }, {
    query: 'Q', answer: 'A1', answer_a: 'A1', answer_b: 'A2', context: ''
  });
});

test('retry policy only retries transient upstream failures', () => {
  assert.equal(isRetryableError(503, ''), true);
  assert.equal(isRetryableError(400, 'upstream connect error or disconnect/reset before headers'), true);
  assert.equal(isRetryableError(401, 'invalid api key'), false);
  assert.equal(retryDelay(1), 800);
  assert.equal(retryDelay(3), 3200);
});

test('normalizeEndpoint appends chat completions once', () => {
  assert.equal(normalizeEndpoint('https://api.example.com/v1/'), 'https://api.example.com/v1/chat/completions');
  assert.equal(normalizeEndpoint('https://api.example.com/v1/chat/completions'), 'https://api.example.com/v1/chat/completions');
  assert.equal(normalizeEndpoint('https://api.example.com/v1', 'responses'), 'https://api.example.com/v1/responses');
});

test('callJudge uses Responses API and reasoning effort for OpenAI', async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{"score":9,"reason":"稳定"}' }] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  const result = await callJudge({
    apiKey: 'test-key', endpoint: 'https://api.openai.com/v1', provider: 'openai', model: 'gpt-5.6',
    systemPrompt: 'system', userPrompt: 'user', temperature: 0.8, reasoningEffort: 'medium'
  }, fakeFetch);
  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  assert.deepEqual(captured.body.reasoning, { effort: 'medium' });
  assert.equal('temperature' in captured.body, false);
  assert.equal(result.output.score, 9);
});

test('callJudge sends OpenAI-compatible payload and parses the result', async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"score":8,"reason":"清晰"}' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  const result = await callJudge({
    apiKey: 'test-key', endpoint: 'https://api.example.com/v1', model: 'judge-model',
    systemPrompt: 'system', userPrompt: 'user', temperature: 0
  }, fakeFetch);
  assert.equal(captured.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(captured.options.headers.authorization, 'Bearer test-key');
  assert.equal('response_format' in JSON.parse(captured.options.body), false);
  assert.deepEqual(result.output, { score: 8, reason: '清晰' });
});

test('storage saves uploaded Excel and result artifacts without API keys', async t => {
  const root = await mkdtemp(join(tmpdir(), 'judge-studio-storage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = Buffer.from('fake-xlsx-content');
  const upload = await saveUpload({ buffer: source, originalName: '../数据集.xlsx' }, root);
  const uploadedArtifact = await readUploadArtifact(upload.id, root);
  assert.equal(uploadedArtifact.fileName, '数据集.xlsx');
  assert.deepEqual(uploadedArtifact.content, source);

  const results = [{
    rowNumber: 2, sourceRow: { query: '问题', answer: '回答', '人工备注': '原始字段保留' }, query: '问题', answer: '回答', status: 'success', output: { verdict: '通过', reason: '完整' },
    displayOutput: '{"verdict":"通过"}', attempts: 1, elapsed: 123
  }];
  const run = await saveRun({
    uploadId: upload.id,
    fileName: '数据集.xlsx',
    status: 'completed',
    range: { start: 1, end: 1 },
    config: { provider: 'openai', model: 'gpt-test', apiKey: 'must-not-be-saved' },
    inputColumns: ['query', 'answer', '人工备注'],
    outputColumns: [{ key: 'verdict', label: '结论' }, { key: 'reason', label: '理由' }],
    results
  }, root);
  const jsonArtifact = await readRunArtifact(run.id, 'json', root);
  const csvArtifact = await readRunArtifact(run.id, 'csv', root);
  const xlsxArtifact = await readRunArtifact(run.id, 'xlsx', root);
  assert.equal(jsonArtifact.content.includes('must-not-be-saved'), false);
  assert.match(csvArtifact.content.toString('utf8'), /"结论".*"理由"/);
  assert.match(csvArtifact.content.toString('utf8'), /"通过".*"完整"/);
  assert.match(csvArtifact.content.toString('utf8'), /"人工备注"/);
  assert.match(csvArtifact.content.toString('utf8'), /"原始字段保留"/);
  assert.equal(xlsxArtifact.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal((await listRuns(root))[0].id, run.id);

  const deleted = await deleteRun(run.id, root);
  assert.equal(deleted.permanent, true);
  assert.equal(deleted.uploadDeleted, true);
  assert.deepEqual(await listRuns(root), []);
  await assert.rejects(() => readRunArtifact(run.id, 'json', root), { code: 'ENOENT' });
  await assert.rejects(() => readUploadArtifact(upload.id, root), { code: 'ENOENT' });
});

test('storage sanitizes artifact filenames and builds quoted CSV', () => {
  assert.equal(sanitizeFilename('../../bad:name.xlsx'), 'bad-name.xlsx');
  const csv = buildResultsCsv([
    { rowNumber: 1, sourceRow: { query: 'a,b', answer: '"quoted"' }, query: 'a,b', answer: '"quoted"', status: 'success', output: 'ok', attempts: 1, elapsed: 10 }
  ], [{ key: '__raw__', label: '模型输出' }], ['query', 'answer'], { queryColumn: 'query', answerColumn: 'answer' });
  assert.match(csv, /"a,b"/);
  assert.match(csv, /"""quoted"""/);
});

test('CSV keeps every result on one physical line and marks embedded line breaks', () => {
  const csv = buildResultsCsv([
    { rowNumber: 1, excelRowNumber: 2, sourceRow: { query: '第一行\n第二行' }, status: 'success', output: { reason: '甲\r\n乙' }, attempts: 1, elapsed: 10 }
  ], [{ key: 'reason', label: '理由' }], ['query']);
  assert.equal(csv.split(/\r?\n/).length, 2);
  assert.match(csv, /第一行 ↵ 第二行/);
  assert.match(csv, /甲 ↵ 乙/);
});

test('Excel export keeps one result per row with readable fixed-height rows', async () => {
  const content = await buildResultsXlsx([
    { rowNumber: 3, excelRowNumber: 4, sourceRow: { query: '问题\n补充', answer: '回答' }, status: 'success', output: { reason: '理由\n详情' }, attempts: 1, elapsed: 123 }
  ], [{ key: 'reason', label: '理由' }], ['query', 'answer']);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content);
  const sheet = workbook.getWorksheet('评估结果');
  assert.equal(sheet.rowCount, 2);
  assert.equal(sheet.getCell('A2').value, 3);
  assert.equal(sheet.getCell('B2').value, 4);
  assert.equal(sheet.getCell('C2').value, '问题\n补充');
  assert.equal(sheet.getCell('F2').value, '理由\n详情');
  assert.equal(sheet.getRow(2).height, 22);
  assert.equal(sheet.views[0].state, 'frozen');
});

test('Excel parser preserves the real row number when blank rows exist', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('数据');
  sheet.addRow(['query', 'answer']);
  sheet.addRow(['第一条', '回答一']);
  sheet.addRow([]);
  sheet.addRow(['第二条', '回答二']);
  const parsed = parseWorksheet(sheet);
  assert.deepEqual(parsed.rowNumbers, [2, 4]);
  assert.deepEqual(parsed.rows.map(row => row.query), ['第一条', '第二条']);
});

test('legacy run downloads recover source columns and real rows from the saved Excel', async t => {
  const root = await mkdtemp(join(tmpdir(), 'judge-studio-legacy-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceWorkbook = new ExcelJS.Workbook();
  const sourceSheet = sourceWorkbook.addWorksheet('数据');
  sourceSheet.addRow(['query', 'answer']);
  sourceSheet.addRow(['第一条', '回答一']);
  sourceSheet.addRow([]);
  sourceSheet.addRow(['第二条', '回答二']);
  const upload = await saveUpload({ buffer: Buffer.from(await sourceWorkbook.xlsx.writeBuffer()), originalName: '旧数据.xlsx' }, root);
  const run = await saveRun({
    uploadId: upload.id,
    fileName: '旧数据.xlsx',
    config: { queryColumn: 'query', answerColumn: 'answer' },
    inputColumns: ['query', 'answer'],
    outputColumns: [{ key: 'result', label: '结论' }],
    results: [{ rowNumber: 2, excelRowNumber: 4, sourceRow: { query: '第二条', answer: '回答二' }, query: '第二条', answer: '回答二', status: 'success', output: { result: '通过' } }]
  }, root);
  const jsonPath = join(root, 'runs', run.id, 'result.json');
  const legacy = JSON.parse(await readFile(jsonPath, 'utf8'));
  delete legacy.inputColumns;
  delete legacy.results[0].sourceRow;
  delete legacy.results[0].excelRowNumber;
  await writeFile(jsonPath, JSON.stringify(legacy));

  const artifact = await readRunArtifact(run.id, 'xlsx', root);
  const exported = new ExcelJS.Workbook();
  await exported.xlsx.load(artifact.content);
  const resultSheet = exported.getWorksheet('评估结果');
  assert.deepEqual(resultSheet.getRow(1).values.slice(1, 7), ['数据序号', 'Excel行号', 'query', 'answer', '评估状态', '结论']);
  assert.deepEqual(resultSheet.getRow(2).values.slice(1, 7), [2, 4, '第二条', '回答二', '成功', '通过']);
});

test('export schema preserves source labels and prefixes conflicting evaluation fields', () => {
  const schema = buildExportSchema(['query', 'score', '评估状态'], [
    { key: 'score', label: 'score' },
    { key: 'reason', label: 'reason' },
    { key: 'status', label: '评估状态' }
  ]);
  assert.deepEqual(schema.inputColumns, ['query', 'score', '评估状态']);
  assert.equal(schema.labels.status, '评估_评估状态');
  assert.deepEqual(schema.outputs.map(column => column.exportLabel), ['评估_score', 'reason', '评估_评估状态_2']);
});

test('deleting one run keeps an upload referenced by another run', async t => {
  const root = await mkdtemp(join(tmpdir(), 'judge-studio-shared-upload-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const upload = await saveUpload({ buffer: Buffer.from('shared'), originalName: 'shared.xlsx' }, root);
  const base = {
    uploadId: upload.id,
    fileName: 'shared.xlsx',
    config: { model: 'judge' },
    outputColumns: [{ key: '__raw__', label: '模型输出' }],
    results: [{ rowNumber: 1, status: 'success', output: 'ok' }]
  };
  const first = await saveRun(base, root);
  const second = await saveRun(base, root);
  const deleted = await deleteRun(first.id, root);
  assert.equal(deleted.uploadDeleted, false);
  assert.equal((await listRuns(root))[0].id, second.id);
  assert.deepEqual((await readUploadArtifact(upload.id, root)).content, Buffer.from('shared'));
});
