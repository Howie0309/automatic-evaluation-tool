import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { buildRuleAttachment, composeJudgeSystemPrompt } from '../public/rule-attachment.js';
import { buildPdfRuleAttachment } from '../public/rule-pdf.js';
import { makePdf } from './helpers/pdf.js';
import { MAX_DATASET_UPLOAD_BYTES, MAX_RULE_UPLOAD_BYTES } from '../public/upload-limits.js';

test('Excel rule upload reaches both API formats and is independent of dataset uploads', { timeout: 20000 }, async t => {
  const received = [];
  const upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push({ url: req.url, body: JSON.parse(Buffer.concat(chunks).toString()) });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(req.url.endsWith('/responses')
      ? { output: [{ type: 'message', content: [{ type: 'output_text', text: '{"score":4}' }] }] }
      : { choices: [{ message: { content: '{"score":4}' } }] }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  t.after(() => new Promise(resolve => upstream.close(resolve)));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const storage = await mkdtemp(join(tmpdir(), 'judge-rules-api-'));
  t.after(() => rm(storage, { recursive: true, force: true }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, PORT: String(port), JUDGE_STORAGE_BACKEND: 'local', JUDGE_STORAGE_DIR: storage },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    if (child.exitCode == null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(([code]) => { throw new Error(`Test server exited: ${code}`); })
  ]);
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${base}/api/health`).then(r => r.json())).capabilities.ruleExcel, true);
  assert.equal((await fetch(`${base}/api/health`).then(r => r.json())).capabilities.ruleImages, true);
  assert.deepEqual((await fetch(`${base}/api/health`).then(r => r.json())).uploadLimits, {
    datasetBytes: MAX_DATASET_UPLOAD_BYTES, ruleBytes: MAX_RULE_UPLOAD_BYTES
  });
  for (const [path, size, limit] of [
    ['/api/excel', MAX_DATASET_UPLOAD_BYTES + 1, 300],
    ['/api/rules/excel', MAX_RULE_UPLOAD_BYTES + 1, 100],
    ['/api/rules/pdf', MAX_RULE_UPLOAD_BYTES + 1, 100]
  ]) {
    const oversized = await postDeclaredSize(base + path, size);
    assert.equal(oversized.status, 413);
    assert.match(oversized.body.error, new RegExp(String(limit)));
  }
  const workbook = new ExcelJS.Workbook();
  const rules = workbook.addWorksheet('评分规则');
  rules.addRow(['维度', '分数', '定义']);
  rules.addRow(['表达', 4, '自然直接，保留全部信息']);
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTqkAAAAASUVORK5CYII=';
  const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
  rules.addImage(imageId, 'A1:B2');
  workbook.addWorksheet('只有图片').addImage(imageId, 'B2:D5');
  const buffer = await workbook.xlsx.writeBuffer();
  const dataset = await fetch(`${base}/api/excel`, { method: 'POST', body: buffer });
  assert.equal(dataset.status, 200);
  const datasetPayload = await dataset.json();
  assert.ok(datasetPayload.upload.id);
  assert.equal(datasetPayload.sheets[0].rows[0]['维度'], '表达');
  const uploaded = await fetch(`${base}/api/rules/excel`, { method: 'POST', body: buffer });
  assert.equal(uploaded.status, 200);
  const parsed = await uploaded.json();
  assert.equal(parsed.sheets[0].rows[0].rowNumber, 1);
  assert.equal(parsed.sheets[0].rows[0].cells[0].value, '维度');
  assert.equal(parsed.sheets[0].images[0].dataUrl, dataUrl);
  assert.equal(parsed.sheets[1].name, '只有图片');
  assert.equal(parsed.sheets[1].images.length, 1);
  assert.deepEqual((await fetch(`${base}/api/runs`).then(r => r.json())).runs, []);
  const attachment = buildRuleAttachment('评审规则.xlsx', parsed.sheets, [{ name: '评分规则', range: 'A1:C2' }]);
  for (const provider of ['custom', 'openai']) {
    const response = await fetch(`${base}/api/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: 'local-test-key', endpoint: `http://127.0.0.1:${upstream.address().port}/v1`, model: 'test-judge', systemPrompt: '按规则返回 JSON。', ruleAttachment: attachment, userPrompt: '问题：测试\n回答：样例' })
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).output, { score: 4 });
  }
  assert.equal(received[0].url, '/v1/chat/completions');
  assert.equal(received[1].url, '/v1/responses');
  for (const request of received) {
    const messages = request.body.input || request.body.messages;
    assert.equal(messages[0].content, composeJudgeSystemPrompt('按规则返回 JSON。', attachment));
    assert.equal(messages[2].content, '问题：测试\n回答：样例');
    assert.match(messages[1].content[0].text, /评审标准或参考示例/);
    assert.equal(providerImageUrl(request), dataUrl);
    assert.equal(messages[0].content.split('【附加评审规则】').length, 2);
  }
  const saved = await fetch(`${base}/api/runs`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileName: '测试数据.xlsx', config: { systemPrompt: '按规则返回 JSON。', ruleAttachment: attachment }, results: [{ status: 'success', output: { score: 4 } }] })
  }).then(r => r.json());
  const downloaded = await fetch(`${base}/api/runs/${saved.run.id}/download?format=json`).then(r => r.json());
  assert.equal(downloaded.config.ruleAttachment.images[0].dataUrl, dataUrl);
  const invalidImage = await fetch(`${base}/api/evaluate`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'openai', model: 'test', apiKey: 'test', ruleAttachment: { text: '规则', images: [{ dataUrl: 'https://invalid.example/image.png' }] } })
  });
  assert.equal(invalidImage.status, 400);
  assert.equal(received.length, 2);
  const empty = await fetch(`${base}/api/rules/excel`, { method: 'POST', body: new Uint8Array() });
  assert.equal(empty.status, 400);
  const invalid = await fetch(`${base}/api/rules/excel`, { method: 'POST', body: 'not an xlsx' });
  assert.equal(invalid.status, 400);
  assert.equal((await fetch(`${base}/api/health`).then(r => r.json())).capabilities.rulePdf, true);
  const pdf = makePdf();
  const metadata = await fetch(`${base}/api/rules/pdf?metadata=1`, { method: 'POST', body: pdf }).then(r => r.json());
  assert.deepEqual(metadata, { pageCount: 2 });
  const pdfResponse = await fetch(`${base}/api/rules/pdf?pages=2`, { method: 'POST', body: pdf });
  assert.equal(pdfResponse.status, 200);
  const pdfAttachment = buildPdfRuleAttachment('扫描规则.pdf', await pdfResponse.json());
  assert.equal(pdfAttachment.images.length, 1);
  assert.equal(pdfAttachment.images[0].pageNumber, 2);
  for (const provider of ['custom', 'openai']) {
    const response = await fetch(`${base}/api/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: 'local-test-key', endpoint: `http://127.0.0.1:${upstream.address().port}/v1`, model: 'test-judge', systemPrompt: '按 PDF 评分', ruleAttachment: pdfAttachment, userPrompt: '只评估这条回答' })
    });
    assert.equal(response.status, 200);
  }
  for (const request of received.slice(2)) {
    const messages = request.body.input || request.body.messages;
    assert.match(messages[0].content, /PDF/);
    assert.match(messages[1].content[1].text, /第 2 页/);
    assert.equal(providerImageUrl(request), pdfAttachment.images[0].dataUrl);
    assert.equal(messages[2].content, '只评估这条回答');
  }
  const savedPdf = await fetch(`${base}/api/runs`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileName: '数据.xlsx', config: { ruleAttachment: pdfAttachment }, results: [{ status: 'success', output: { score: 4 } }] })
  }).then(r => r.json());
  const downloadedPdf = await fetch(`${base}/api/runs/${savedPdf.run.id}/download?format=json`).then(r => r.json());
  assert.equal(downloadedPdf.config.ruleAttachment.fileType, 'pdf');
  assert.equal(downloadedPdf.config.ruleAttachment.images[0].dataUrl, pdfAttachment.images[0].dataUrl);
  for (const [query, body] of [['?pages=3', pdf], ['', 'not a pdf'], ['', new Uint8Array()]]) {
    assert.equal((await fetch(`${base}/api/rules/pdf${query}`, { method: 'POST', body })).status, 400);
  }
  assert.equal((await fetch(`${base}/api/health`).then(r => r.json())).capabilities.datasetImages, true);
  const datasetBook = new ExcelJS.Workbook();
  const dataSheet = datasetBook.addWorksheet('带图数据');
  dataSheet.addRow(['query', 'answer', '截图']);
  dataSheet.getCell('A2').value = '第一条';
  dataSheet.getCell('A4').value = '第二条';
  const datasetImage = datasetBook.addImage({ base64: dataUrl, extension: 'png' });
  const longDataUrl = `data:image/jpeg;base64,${createCanvas(1264, 8707).toBuffer('image/jpeg').toString('base64')}`;
  const longDatasetImage = datasetBook.addImage({ base64: longDataUrl, extension: 'jpeg' });
  dataSheet.addImage(datasetImage, { tl: { col: 2, row: 1 }, ext: { width: 20, height: 15 } });
  dataSheet.addImage(longDatasetImage, { tl: { col: 2, row: 3 }, ext: { width: 20, height: 15 } });
  const dataResponse = await fetch(`${base}/api/excel`, { method: 'POST', body: await datasetBook.xlsx.writeBuffer() });
  assert.equal(dataResponse.status, 200);
  const data = await dataResponse.json();
  assert.doesNotMatch(JSON.stringify(data), /base64|dataUrl|"buffer"/);
  assert.deepEqual(data.sheets[0].rowNumbers, [2, 4]);
  const imageMeta = data.sheets[0].images[1];
  assert.equal(imageMeta.cellAddress, 'C4');
  const imagePath = `/api/uploads/${data.upload.id}/images/${imageMeta.id}`;
  const imageResponse = await fetch(base + imagePath);
  assert.equal(imageResponse.headers.get('content-type'), 'image/jpeg');
  assert.equal(Buffer.from(await imageResponse.arrayBuffer()).toString('base64'), longDataUrl.split(',')[1]);
  const countBefore = received.length;
  for (const provider of ['custom', 'openai']) {
    const response = await fetch(`${base}/api/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: 'local-test-key', endpoint: `http://127.0.0.1:${upstream.address().port}/v1`, model: 'vision-test', systemPrompt: '规则', ruleAttachment: attachment, userPrompt: '评估第二条',
        caseInput: { uploadId: data.upload.id, sheetName: '带图数据', excelRowNumber: 4, imageColumns: ['截图'], imageIds: [imageMeta.id] } })
    });
    assert.equal(response.status, 200);
    const evaluated = await response.json();
    assert.equal(evaluated.caseImages[0].cellAddress, 'C4');
    assert.equal(evaluated.caseImages[0].dataUrl, undefined);
    assert.equal(evaluated.caseImages[0].modelImage.originalHeight, 8707);
    assert.equal(evaluated.caseImages[0].modelImage.height, 8000);
    assert.equal(evaluated.imageProcessing.caseImages[0].resized, true);
    assert.doesNotMatch(JSON.stringify(evaluated.caseImages), /base64/);
  }
  for (const request of received.slice(countBefore)) {
    const messages = request.body.input || request.body.messages;
    assert.equal(messages.length, 3);
    assert.match(messages[1].content[0].text, /评审规则/);
    assert.equal(messages[2].content[0].text, '评估第二条');
    assert.match(messages[2].content[2].text, /C4.*第 4 行/);
    assert.doesNotMatch(JSON.stringify(messages[2]), /C2/);
    const image = messages[2].content[3];
    const sent = typeof image.image_url === 'string' ? image.image_url : image.image_url.url;
    assert.notEqual(sent, longDataUrl);
    const decoded = await loadImage(Buffer.from(sent.split(',')[1], 'base64'));
    assert.deepEqual([decoded.width, decoded.height], [1161, 8000]);
  }
  const mismatch = await fetch(`${base}/api/evaluate`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ caseInput: { uploadId: data.upload.id, sheetName: '带图数据', excelRowNumber: 2, imageColumns: ['截图'], imageIds: [imageMeta.id] } })
  });
  assert.equal(mismatch.status, 400);
  assert.match((await mismatch.json()).error, /不一致/);
  assert.equal(received.length, countBefore + 2);
  const unchanged = Buffer.from(await (await fetch(base + imagePath)).arrayBuffer());
  assert.equal(unchanged.toString('base64'), longDataUrl.split(',')[1]);
});

function providerImageUrl(request) {
  const part = (request.body.input || request.body.messages)[1].content[2];
  return typeof part.image_url === 'string' ? part.image_url : part.image_url.url;
}

function postDeclaredSize(url, size) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method: 'POST', headers: { 'content-length': String(size) } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.setTimeout(3000, () => request.destroy(new Error('Oversize response timed out')));
    request.end();
  });
}
