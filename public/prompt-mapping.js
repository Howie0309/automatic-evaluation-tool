export const EMPTY_MAPPING = '__empty__';

export function extractTemplateVariables(template) {
  const variables = [];
  for (const match of String(template || '').matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
    const variable = match[1].trim();
    if (variable && !variables.includes(variable)) variables.push(variable);
  }
  return variables;
}

function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, '');
}

function variableSlot(variable) {
  const value = String(variable).toLowerCase();
  if (/(^|_)(a|1)($|_)/.test(value) || /(?:a|1)$/.test(value)) return 0;
  if (/(^|_)(b|2)($|_)/.test(value) || /(?:b|2)$/.test(value)) return 1;
  return null;
}

function chooseCandidate(variable, candidates) {
  if (!candidates.length) return '';
  if (/gsb/i.test(variable)) return candidates.at(-1);
  const slot = variableSlot(variable);
  return slot == null ? (candidates.length === 1 ? candidates[0] : '') : candidates[slot] || '';
}

export function suggestPromptMapping(variable, columns, { queryColumn = '', answerColumn = '' } = {}) {
  const available = Array.isArray(columns) ? columns : [];
  if (!available.length) return '';
  const value = String(variable || '').trim();
  const lower = value.toLowerCase();
  if (lower === 'query' || lower === 'question') return queryColumn || '';
  if (lower === 'answer' || lower === 'response') return answerColumn || '';

  const exact = available.find(column => column.toLowerCase() === lower);
  if (exact) return exact;
  const compact = normalized(value);
  const fuzzy = available.find(column => {
    const candidate = normalized(column);
    return candidate === compact || candidate.endsWith(compact) || candidate.startsWith(compact);
  });
  if (fuzzy) return fuzzy;

  const answerColumns = available.filter(column => /answer|response|回答|答案/i.test(column));
  const scoreColumns = available.filter(column => /score|分值|评分/i.test(column));
  const commentColumns = available.filter(column => /comment|remark|reason|备注|说明|理由/i.test(column));
  if (/answer|response|回答|答案/i.test(value)) return chooseCandidate(value, answerColumns);
  if (/score|(^|_)qu($|_)|分值|评分/i.test(value)) return chooseCandidate(value, scoreColumns);
  if (/comment|remark|reason|备注|说明|理由/i.test(value)) return chooseCandidate(value, commentColumns);
  if (/context|background|上下文|背景|语境/i.test(value)) {
    return available.find(column => /context|background|上下文|背景|语境/i.test(column)) || '';
  }
  return '';
}

function setValueAtPath(object, path, value) {
  const keys = String(path).split('.').filter(Boolean);
  if (!keys.length) return;
  let current = object;
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    current = current[key];
  }
  current[keys.at(-1)] = value;
}

export function buildPromptData(row, { queryColumn, answerColumn, promptMappings = {} }) {
  const data = { ...row, query: row[queryColumn], answer: row[answerColumn] };
  for (const [variable, column] of Object.entries(promptMappings)) {
    if (!column) continue;
    setValueAtPath(data, variable, column === EMPTY_MAPPING ? '' : row[column]);
  }
  return data;
}
