import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { extractDatasetImages, imageManifest } from '../lib/dataset-images.js';
import { parseWorksheet } from '../lib/excel.js';
import { resolveCaseImages } from '../lib/case-images.js';
import { readUploadImage, readUploadImages, saveUpload, saveRun, readRunArtifact, deleteRun } from '../lib/storage.js';
import { buildCaseUserContent, caseImagesForRow, datasetPromptRow, datasetImagePath } from '../public/dataset-images.js';
import { callJudge } from '../lib/evaluator.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTqkAAAAASUVORK5CYII=';
const bytes = Buffer.from(png.split(',')[1], 'base64');

function fixture() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('待评截图');
  sheet.addRow(['query', '截图', '对照图']);
  sheet.getCell('A2').value = '第一条';
  sheet.getCell('A4').value = '第二条';
  const image = workbook.addImage({ base64: png, extension: 'png' });
  sheet.addImage(image, { tl: { col: 1, row: 1 }, ext: { width: 20, height: 15 } });
  sheet.addImage(image, { tl: { col: 2, row: 1 }, ext: { width: 20, height: 15 } });
  sheet.addImage(image, { tl: { col: 1, row: 3 }, ext: { width: 20, height: 15 } });
  sheet.addImage(image, { tl: { col: 1, row: 5 }, ext: { width: 20, height: 15 } });
  return { workbook, sheet, image };
}

test('dataset pictures retain real rows, empty image-only rows and source column names after XLSX serialization', async () => {
  const { workbook } = fixture();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const extracted = extractDatasetImages(loaded.worksheets[0]);
  const parsed = parseWorksheet(loaded.worksheets[0], extracted);
  assert.deepEqual(parsed.rowNumbers, [2, 4, 6]);
  assert.equal(parsed.rows[2]['截图'], '');
  assert.equal(parsed.images.length, 4);
  assert.deepEqual(caseImagesForRow(parsed.images, 2, ['截图']).map(image => image.cellAddress), ['B2']);
  assert.deepEqual(caseImagesForRow(parsed.images, 4).map(image => image.cellAddress), ['B4']);
  assert.equal(caseImagesForRow(parsed.images, 3).length, 0);
  assert.equal(caseImagesForRow(parsed.images, 2, []).length, 0);
  assert.doesNotMatch(JSON.stringify(parsed), /base64|dataUrl|"buffer"/);
  assert.ok(extracted.images.every(image => image.buffer.equals(bytes)));
  const data = datasetPromptRow(parsed.rows[0], caseImagesForRow(parsed.images, 2));
  assert.match(data['截图'], /1 张待评图片/);
  assert.equal(parsed.rows[0]['截图'], '', 'raw source fields must not be rewritten');
});

test('cross-row and header pictures are explicit and never duplicated into neighbouring cases', () => {
  const { workbook, sheet, image } = fixture();
  sheet.addImage(image, 'B8:C12');
  sheet.addImage(image, 'B1:C1');
  sheet.addBackgroundImage(image);
  const extracted = extractDatasetImages(sheet);
  const parsed = parseWorksheet(sheet, extracted);
  assert.ok(extracted.warnings.some(text => /跨行/.test(text)));
  assert.ok(extracted.warnings.some(text => /表头/.test(text)));
  assert.ok(extracted.warnings.some(text => /背景/.test(text)));
  assert.equal(caseImagesForRow(parsed.images, 8).length, 1);
  assert.equal(caseImagesForRow(parsed.images, 9).length, 0);
  assert.equal(caseImagesForRow(parsed.images, 1).length, 0);
  assert.equal(workbook.worksheets.length, 1);
});

test('image-only columns get stable headers and unsupported formulas/formats cannot silently become blanks', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('图片');
  const image = workbook.addImage({ base64: png, extension: 'png' });
  sheet.addImage(image, 'C5:D6');
  sheet.getCell('B7').value = { formula: '_xlfn.DISPIMG("id",1)' };
  const parsed = parseWorksheet(sheet, extractDatasetImages(sheet));
  assert.deepEqual(parsed.columns, ['列1', '列2', '列3']);
  assert.deepEqual(parsed.rowNumbers, [5, 7]);
  assert.match(parsed.images.find(image => image.cellAddress === 'B7').error, /DISPIMG/);
  const bad = workbook.addImage({ buffer: Buffer.from('not an image'), extension: 'png' });
  sheet.addImage(bad, 'A9:B10');
  assert.match(extractDatasetImages(sheet).images.find(image => image.cellAddress === 'A9').error, /格式不支持/);
  assert.throws(() => imageManifest([{ id: '../outside', buffer: bytes }]), /ID 无效/);
});

test('saved images resolve only for selected row/sheet/columns and survive history reload without embedding Base64 in JSON', async t => {
  const root = await mkdtemp(join(tmpdir(), 'judge-case-images-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { workbook, sheet } = fixture();
  const extracted = extractDatasetImages(sheet);
  const parsed = parseWorksheet(sheet, extracted);
  const images = extracted.images.map(image => ({ ...image, columnName: parsed.columns[image.columnNumber - 1] }));
  const upload = await saveUpload({ buffer: await workbook.xlsx.writeBuffer(), originalName: '图片.xlsx', images }, root);
  assert.equal(upload.images.length, 4);
  assert.doesNotMatch(JSON.stringify(upload), /base64|dataUrl|"buffer"/);
  const storage = { readUploadImages: id => readUploadImages(id, root), readUploadImage: (id, image) => readUploadImage(id, image, root) };
  const input = { uploadId: upload.id, sheetName: sheet.name, excelRowNumber: 2, imageColumns: ['截图'] };
  const selected = await resolveCaseImages(input, storage);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].dataUrl, png);
  assert.equal((await storage.readUploadImage(upload.id, selected[0].id)).content.equals(bytes), true);
  assert.equal((await resolveCaseImages({ ...input, excelRowNumber: 4 }, storage))[0].cellAddress, 'B4');
  await assert.rejects(resolveCaseImages({ ...input, excelRowNumber: 4, imageIds: [selected[0].id] }, storage), /不一致/);
  await assert.rejects(resolveCaseImages({ ...input, excelRowNumber: 1 }, storage), /真实行号/);
  const caseImages = selected.map(({ dataUrl, ...metadata }) => metadata);
  const run = await saveRun({ uploadId: upload.id, config: { imageColumns: ['截图'], apiKey: 'must-not-save' }, results: [{ rowNumber: 1, excelRowNumber: 2, status: 'success', sourceRow: parsed.rows[0], caseImages, output: { result: 'OK' } }], inputColumns: parsed.columns }, root);
  const record = JSON.parse((await readRunArtifact(run.id, 'json', root)).content);
  assert.deepEqual(record.config.imageColumns, ['截图']);
  assert.equal(record.config.apiKey, undefined);
  assert.equal(record.results[0].caseImages[0].uploadId, upload.id);
  assert.doesNotMatch(JSON.stringify(record), /base64/);
  assert.match((await readRunArtifact(run.id, 'csv', root)).content.toString(), /待评图片来源/);
  assert.match(datasetImagePath(record.results[0].caseImages[0]), /\/api\/uploads\/.*\/images\//);
  assert.equal(datasetImagePath({ uploadId: upload.id, id: '../../outside' }), '');
  await deleteRun(run.id, root);
  await assert.rejects(readFile(join(root, 'uploads', upload.id, 'images', selected[0].id + '.bin')), { code: 'ENOENT' });
});

test('case images use the final user message and never mix with rule images in either API protocol', async () => {
  const image = { dataUrl: png, sheetName: '待评截图', cellAddress: 'B4', excelRowNumber: 4, columnName: '截图' };
  for (const provider of ['openai', 'custom']) {
    let request;
    await callJudge({ provider, apiKey: 'mock', model: 'vision-test', endpoint: 'http://localhost/v1', systemPrompt: '只按规则', userPrompt: '只评本行', caseImages: [image], ruleImages: [{ dataUrl: png, sheetName: '规则', range: 'A1' }] }, async (_url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify(provider === 'openai' ? { output_text: '{"result":"OK"}' } : { choices: [{ message: { content: '{"result":"OK"}' } }] }));
    });
    const messages = request.input || request.messages;
    assert.equal(messages.length, 3);
    assert.match(messages[1].content[0].text, /不是本条待评内容/);
    assert.equal(messages[2].content[0].text, '只评本行');
    assert.match(messages[2].content[2].text, /B4.*截图.*第 4 行/);
    const part = messages[2].content[3];
    assert.equal(part.type, provider === 'openai' ? 'input_image' : 'image_url');
    assert.equal(provider === 'openai' ? part.image_url : part.image_url.url, png);
  }
  assert.equal(buildCaseUserContent('纯文本', [], true), '纯文本');
  assert.throws(() => buildCaseUserContent('错误', [{ dataUrl: 'https://example.com/remote.png' }], true), /待评图片/);
});

test('oversize or unreadable per-case images are rejected before asset loading', async () => {
  const input = { uploadId: 'unused', sheetName: '图片', excelRowNumber: 2, imageColumns: ['截图'] };
  let loads = 0;
  const image = { id: '1-1', sheetName: '图片', excelRowNumber: 2, columnName: '截图', size: 1 };
  const storage = { readUploadImages: async () => Array(31).fill(image), readUploadImage: async () => { loads++; } };
  await assert.rejects(resolveCaseImages(input, storage), /30 张/);
  storage.readUploadImages = async () => [{ ...image, size: 20 * 1024 * 1024 + 1 }];
  await assert.rejects(resolveCaseImages(input, storage), /20 MB/);
  storage.readUploadImages = async () => [{ ...image, error: '图片无法读取' }];
  await assert.rejects(resolveCaseImages(input, storage), /图片无法读取/);
  assert.equal(loads, 0);
});
