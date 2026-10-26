import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseRuleWorksheet } from '../lib/rule-excel.js';
import { buildRuleAttachment, composeJudgeSystemPrompt, MAX_RULE_CHARACTERS, parseRuleRange } from '../public/rule-attachment.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveRun, readRunArtifact } from '../lib/storage.js';

function ruleWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('评分标准');
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = '语言精炼评分';
  sheet.getCell('A3').value = '维度';
  sheet.getCell('B3').value = '分值';
  sheet.getCell('C3').value = '标准';
  sheet.getCell('A4').value = '语言精炼';
  sheet.getCell('B4').value = 0;
  sheet.getCell('C4').value = '严重重复\n引用原句';
  sheet.getCell('B5').value = { formula: '1+1', result: 2 };
  sheet.getCell('C6').value = { richText: [{ text: '保留' }, { text: '原意' }] };
  const examples = workbook.addWorksheet('案例');
  examples.getCell('A1').value = '正例';
  examples.getCell('B1').value = '直接回答';
  return workbook;
}

test('rules preserve the first row, merged ranges, zero, rich text, blank row positions and cached formulas', () => {
  const sheet = parseRuleWorksheet(ruleWorkbook().worksheets[0]);
  assert.equal(sheet.rows[0].cells[0].merge, 'A1:C1');
  assert.equal(sheet.rows[0].cells.length, 1);
  assert.equal(sheet.rows[1].rowNumber, 3);
  assert.equal(sheet.rows[2].cells[1].value, '0');
  assert.equal(sheet.rows[2].cells[2].value, '严重重复\n引用原句');
  assert.equal(sheet.rows[3].cells[0].value, '2');
  assert.equal(sheet.rows[4].cells[0].value, '保留原意');
});

test('rule selection keeps cell coordinates and merged content, selects multiple sheets, and never truncates', () => {
  const sheets = ruleWorkbook().worksheets.map(parseRuleWorksheet);
  const attachment = buildRuleAttachment('规则.xlsx', sheets, [{ name: '评分标准', range: 'B1:C4' }, { name: '案例', range: '' }]);
  assert.match(attachment.text, /A1:C1="语言精炼评分"/);
  assert.match(attachment.text, /B4="0"/);
  assert.match(attachment.text, /严重重复\\n引用原句/);
  assert.match(attachment.text, /工作表：案例/);
  assert.doesNotMatch(attachment.text, /B5=/);
  assert.doesNotMatch(attachment.text, /A4=/);
  const huge = [{ name: '超长', rowCount: 1, columnCount: 1, rows: [{ rowNumber: 1, cells: [{ address: 'A1', column: 1, value: 'a'.repeat(MAX_RULE_CHARACTERS) }] }] }];
  assert.throws(() => buildRuleAttachment('规则.xlsx', huge, [{ name: '超长' }]), /不会自动截断/);
});

test('invalid or empty rule selections are rejected without silently replacing the chosen range', () => {
  const sheets = ruleWorkbook().worksheets.map(parseRuleWorksheet);
  assert.deepEqual(parseRuleRange('$a$1:$c$4'), { top: 1, left: 1, bottom: 4, right: 3 });
  assert.throws(() => parseRuleRange('A0:D4'), /范围请填写/);
  assert.throws(() => parseRuleRange('D4:A1'), /结束位置/);
  assert.throws(() => parseRuleRange('XFE1'), /行列上限/);
  assert.throws(() => buildRuleAttachment('规则.xlsx', sheets, []), /至少选择/);
  assert.throws(() => buildRuleAttachment('规则.xlsx', sheets, [{ name: '评分标准', range: 'Z100' }]), /没有文字内容/);
});

test('rules warn about uncalculated formulas and extract embedded images', () => {
  const workbook = ruleWorkbook();
  const sheet = workbook.worksheets[0];
  sheet.getCell('A8').value = { formula: '2+2' };
  const id = workbook.addImage({ base64: 'data:image/png;base64,iVBORw0KGgo=', extension: 'png' });
  sheet.addImage(id, 'D1:E2');
  const parsed = parseRuleWorksheet(sheet);
  assert.match(parsed.rows.at(-1).cells[0].value, /公式未缓存结果/);
  assert.equal(parsed.warnings.length, 1);
  assert.equal(parsed.images.length, 1);
  assert.match(parsed.images[0].dataUrl, /^data:image\/png;base64,/);
});

test('evaluation rules are appended once and historical snapshots preserve the original prompt without API keys', async () => {
  const sheets = ruleWorkbook().worksheets.map(parseRuleWorksheet);
  const attachment = buildRuleAttachment('规则.xlsx', sheets, [{ name: '评分标准' }]);
  const combined = composeJudgeSystemPrompt('只输出 JSON。', attachment);
  assert.equal(composeJudgeSystemPrompt('原规则'), '原规则');
  assert.match(combined, /^只输出 JSON。\n\n【附加评审规则】/);
  assert.ok(combined.endsWith(attachment.text));
  const root = await mkdtemp(join(tmpdir(), 'judge-rule-test-'));
  try {
    const run = await saveRun({ config: { systemPrompt: '只输出 JSON。', ruleAttachment: attachment, apiKey: 'must-not-be-saved' }, results: [{ status: 'success', output: { score: 3 } }] }, root);
    const artifact = await readRunArtifact(run.id, 'json', root);
    const saved = JSON.parse(artifact.content.toString());
    assert.deepEqual(saved.config.ruleAttachment, attachment);
    assert.equal(saved.config.systemPrompt, '只输出 JSON。');
    assert.equal(composeJudgeSystemPrompt(saved.config.systemPrompt, saved.config.ruleAttachment), combined);
    assert.doesNotMatch(artifact.content.toString(), /must-not-be-saved/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
