import { ruleImageLabel, validateRuleImages } from './rule-images.js';

export const MAX_RULE_CHARACTERS = 200000;

function columnNumber(label) {
  return [...label].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
}

export function parseRuleRange(value, rowCount, columnCount) {
  const text = String(value || '').trim().toUpperCase().replaceAll('$', '');
  if (!text) return { top: 1, left: 1, bottom: rowCount, right: columnCount };
  const match = text.match(/^([A-Z]+)([1-9]\d*)(?::([A-Z]+)([1-9]\d*))?$/);
  if (!match) throw new Error('范围请填写 A1:D20，或留空读取整个工作表');
  const left = columnNumber(match[1]), top = Number(match[2]);
  const right = columnNumber(match[3] || match[1]), bottom = Number(match[4] || match[2]);
  if (right < left || bottom < top) throw new Error('范围的结束位置不能早于开始位置');
  if (right > 16384 || bottom > 1048576) throw new Error('范围超出 Excel 行列上限');
  return { top, left, bottom, right };
}

export function buildRuleAttachment(fileName, sheets, selections) {
  const sections = [];
  const selected = [];
  const images = [];
  for (const selection of selections) {
    const sheet = sheets.find(item => item.name === selection.name);
    if (!sheet) throw new Error(`找不到规则工作表：${selection.name}`);
    const range = parseRuleRange(selection.range, sheet.rowCount, sheet.columnCount);
    const lines = [];
    for (const row of sheet.rows) {
      const cells = row.cells.filter(cell => {
        const bounds = cell.merge ? parseRuleRange(cell.merge) : { top: row.rowNumber, bottom: row.rowNumber, left: cell.column, right: cell.column };
        return bounds.bottom >= range.top && bounds.top <= range.bottom && bounds.right >= range.left && bounds.left <= range.right;
      });
      if (cells.length) lines.push(`第 ${row.rowNumber} 行：${cells.map(cell => `${cell.merge || cell.address}=${JSON.stringify(cell.value)}`).join('；')}`);
    }
    const selectedImages = (sheet.images || []).filter(image => image.background || (
      image.bounds.bottom >= range.top && image.bounds.top <= range.bottom && image.bounds.right >= range.left && image.bounds.left <= range.right
    ));
    if (!lines.length && !selectedImages.length) throw new Error(`工作表“${sheet.name}”的选定范围没有文字内容或图片`);
    for (const image of selectedImages) {
      const labeled = { ...image, sheetName: sheet.name };
      lines.push(ruleImageLabel(labeled, images.length));
      images.push(labeled);
    }
    const rangeLabel = String(selection.range || '').trim().toUpperCase() || '全部单元格';
    sections.push(`工作表：${sheet.name}\n范围：${rangeLabel}\n${lines.join('\n')}`);
    selected.push({ name: sheet.name, range: rangeLabel });
  }
  if (!sections.length) throw new Error('请至少选择一个规则工作表');
  const text = `评审规则文件：${fileName}\n单元格值使用 JSON 字符串表示，\\n 表示单元格内换行；合并单元格以完整范围标注。\n\n${sections.join('\n\n')}`;
  if (text.length > MAX_RULE_CHARACTERS) throw new Error(`选中的规则超过 ${MAX_RULE_CHARACTERS.toLocaleString('zh-CN')} 字符，请缩小工作表范围；内容不会自动截断`);
  validateRuleImages(images);
  return { fileName, selections: selected, text, ...(images.length ? { images } : {}) };
}

export function composeJudgeSystemPrompt(systemPrompt, ruleAttachment) {
  const rules = String(ruleAttachment?.text || '');
  if (!rules.trim()) return String(systemPrompt || '');
  if (rules.length > MAX_RULE_CHARACTERS) throw new Error('评审规则过长，请缩小工作表范围');
  const imageNote = ruleAttachment?.images?.length ? '\n规则图片以独立消息随请求提供；它们属于评审规则，不属于待评数据。请结合图片中的评分标准和示例进行评审。' : '';
  const fileType = ruleAttachment?.fileType === 'pdf' ? 'PDF' : 'Excel';
  return `${String(systemPrompt || '')}\n\n【附加评审规则】\n以下内容来自用户上传并选定的 ${fileType} 评审规则文件，请结合以上 System Prompt 进行评估。${imageNote}\n\n${rules}`;
}
