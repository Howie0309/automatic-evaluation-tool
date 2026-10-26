import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePdfRules } from '../lib/rule-pdf.js';
import { buildPdfRuleAttachment, parsePdfPages } from '../public/rule-pdf.js';
import { composeJudgeSystemPrompt } from '../public/rule-attachment.js';
import { ruleImageLabel } from '../public/rule-images.js';
import { makePdf } from './helpers/pdf.js';

test('PDF page selection validates bounds and limits without truncation', () => {
  assert.deepEqual(parsePdfPages('', 2), [1, 2]);
  assert.deepEqual(parsePdfPages('3,1-2，2', 4), [1, 2, 3]);
  for (const value of ['0', '3-1', '1-', '2,', '5', '1.5']) assert.throws(() => parsePdfPages(value, 4));
  assert.throws(() => parsePdfPages('', 31), /30/);
  assert.throws(() => parsePdfPages('1-31', 31), /30/);
  assert.deepEqual(parsePdfPages('31', 31), [31]);
});

test('PDF parses selectable text and renders scanned pages with original page labels', async () => {
  const buffer = makePdf();
  assert.deepEqual(await parsePdfRules(buffer, { metadataOnly: true }), { pageCount: 2 });
  const parsed = await parsePdfRules(buffer);
  assert.match(parsed.pages[0].text, /Preserve meaning/);
  assert.equal(parsed.pages[1].text, '');
  for (const page of parsed.pages) {
    assert.match(page.image.dataUrl, /^data:image\/jpeg;base64,/);
    assert.ok(page.image.size > 1000);
    assert.equal(Buffer.from(page.image.dataUrl.split(',')[1], 'base64').length, page.image.size);
  }
  const attachment = buildPdfRuleAttachment('评分规则.pdf', parsed);
  assert.equal(attachment.fileType, 'pdf');
  assert.equal(attachment.images.length, 2);
  assert.match(attachment.text, /本页没有可提取文字/);
  assert.match(composeJudgeSystemPrompt('评审', attachment), /PDF/);
  assert.match(ruleImageLabel(attachment.images[1], 1), /第 2 页/);
  const selected = await parsePdfRules(buffer, { pageRange: '2' });
  assert.deepEqual(selected.pages.map(page => page.pageNumber), [2]);
  assert.equal(buildPdfRuleAttachment('规则.pdf', selected).selections[0].range, '2');
  assert.throws(() => buildPdfRuleAttachment('缺页.pdf', { ...parsed, pages: parsed.pages.slice(1) }), /完整/);
});

test('long PDFs require an explicit selection; empty and malformed files fail clearly', async () => {
  const buffer = makePdf(31);
  assert.equal((await parsePdfRules(buffer, { metadataOnly: true })).pageCount, 31);
  await assert.rejects(parsePdfRules(buffer), /30/);
  await assert.rejects(parsePdfRules(Buffer.alloc(0)), /请选择/);
  await assert.rejects(parsePdfRules(Buffer.from('not a pdf')), /PDF 无法读取/);
});

test('Chinese rules without embedded fonts preserve selectable text and render a page', async () => {
  const parsed = await parsePdfRules(makePdf(1, { chinese: true }));
  assert.match(parsed.pages[0].text, /语言精炼评审规则：表达清晰、直接/);
  assert.ok(parsed.pages[0].image.size > 1000);
});
