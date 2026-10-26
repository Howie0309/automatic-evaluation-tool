import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseRuleWorksheet } from '../lib/rule-excel.js';
import { buildRuleAttachment } from '../public/rule-attachment.js';
import { buildRuleImageMessage, validateRuleImages, MAX_RULE_IMAGES, MAX_RULE_IMAGE_BYTES } from '../public/rule-images.js';
import { ruleSettingsSnapshot } from '../public/rule-cache.js';
import { callJudge } from '../lib/evaluator.js';

export const testPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTqkAAAAASUVORK5CYII=';

test('embedded rule pictures survive real XLSX serialization and range filtering, including image-only sheets', async () => {
  const workbook = new ExcelJS.Workbook();
  const id = workbook.addImage({ base64: testPng, extension: 'png' });
  const sheet = workbook.addWorksheet('示例图');
  sheet.addImage(id, 'B2:D5');
  sheet.addImage(id, 'B20:D25');
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const parsed = parseRuleWorksheet(loaded.worksheets[0]);
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.images.length, 2);
  assert.equal(parsed.rowCount, 25);
  const rule = buildRuleAttachment('规则.xlsx', [parsed], [{ name: '示例图', range: 'C3:C4' }]);
  assert.equal(rule.images.length, 1);
  assert.equal(rule.images[0].sheetName, '示例图');
  assert.equal(rule.images[0].dataUrl, testPng);
  assert.match(rule.text, /规则图片 1/);
  assert.throws(() => buildRuleAttachment('规则.xlsx', [parsed], [{ name: '示例图', range: 'G40:H41' }]), /没有文字内容或图片/);
});

test('one-cell pixel anchors and background images preserve their location without inventing text rows', () => {
  const workbook = new ExcelJS.Workbook();
  const id = workbook.addImage({ base64: testPng, extension: 'png' });
  const sheet = workbook.addWorksheet('图例');
  sheet.addImage(id, { tl: { col: 2, row: 4 }, ext: { width: 100, height: 60 } });
  sheet.addBackgroundImage(id);
  const parsed = parseRuleWorksheet(sheet);
  assert.equal(parsed.images.length, 2);
  assert.deepEqual(parsed.images[0].bounds, { top: 5, left: 3, bottom: 7, right: 4 });
  assert.equal(parsed.images[1].background, true);
});

test('unsupported image types and payload limits block evaluation rather than silently omit pictures', () => {
  const workbook = new ExcelJS.Workbook();
  const id = workbook.addImage({ buffer: Buffer.from('unsupported'), extension: 'png' });
  const sheet = workbook.addWorksheet('规则');
  sheet.addImage(id, 'A1:C3');
  const parsed = parseRuleWorksheet(sheet);
  assert.throws(() => buildRuleAttachment('规则.xlsx', [parsed], [{ name: '规则' }]), /格式不支持/);
  assert.throws(() => validateRuleImages([{ dataUrl: 'https://example.com/private.png' }]), /格式不支持/);
  assert.throws(() => validateRuleImages(Array(MAX_RULE_IMAGES + 1).fill({ dataUrl: testPng })), /超过 30 张/);
  const huge = `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_RULE_IMAGE_BYTES + 3) / 3) * 4)}`;
  assert.throws(() => validateRuleImages([{ dataUrl: huge }]), /总大小超过 20 MB/);
});

test('normal settings contain image metadata only while the full snapshot retains image bytes', () => {
  const attachment = { fileName: '规则.xlsx', text: '评分规则', images: [{ id: 'pic-1', sheetName: '规则', range: 'A1:C3', dataUrl: testPng }] };
  const saved = ruleSettingsSnapshot(attachment, 'cache-123');
  assert.equal(saved.cacheId, 'cache-123');
  assert.equal(saved.images[0].range, 'A1:C3');
  assert.equal(saved.images[0].dataUrl, undefined);
  assert.equal(attachment.images[0].dataUrl, testPng);
  assert.doesNotMatch(JSON.stringify(saved), /base64/);
});

test('image formulas cannot silently degrade into plain text rules', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('公式图');
  sheet.getCell('A1').value = { formula: '_xlfn.DISPIMG("image-id",1)' };
  const parsed = parseRuleWorksheet(sheet);
  assert.throws(() => buildRuleAttachment('规则.xlsx', [parsed], [{ name: '公式图' }]), /转换为“插入图片”/);
});

test('rule images are sent in a separate labeled message before the case in both supported API protocols', async () => {
  const image = { dataUrl: testPng, sheetName: '评分规则', range: 'B2:D5' };
  for (const provider of ['openai', 'custom', 'deepseek', 'siliconflow']) {
    let request;
    const responsePayload = provider === 'openai' ? { output_text: '{"score":4}' } : { choices: [{ message: { content: '{"score":4}' } }] };
    const result = await callJudge({ apiKey: 'local-test-key', model: 'vision-judge', provider, endpoint: 'http://localhost/v1', systemPrompt: '规则', userPrompt: '待评回答', ruleImages: [image] }, async (_url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify(responsePayload), { status: 200 });
    });
    assert.deepEqual(result.output, { score: 4 });
    const messages = request.input || request.messages;
    assert.equal(messages.length, 3);
    assert.equal(messages[0].content, '规则');
    assert.equal(messages[2].content, '待评回答');
    assert.match(messages[1].content[0].text, /不是本条待评内容/);
    assert.match(messages[1].content[1].text, /评分规则.*B2:D5/);
    assert.deepEqual(messages[1], buildRuleImageMessage([image], provider === 'openai'));
  }
});
