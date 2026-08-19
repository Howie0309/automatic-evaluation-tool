export function formatDetailInput({ systemPrompt = '', userPrompt = '' } = {}) {
  return `【System Prompt】\n${String(systemPrompt)}\n\n【User Prompt】\n${String(userPrompt)}`;
}

export function formatDetailOutput(output, fallback = '') {
  if (typeof output === 'string') return output;
  if (output == null) return String(fallback || '');
  return JSON.stringify(output, null, 2);
}

export function formatDetailAll(input, output) {
  return `${String(input)}\n\n====================\n\n【模型输出】\n${String(output)}`;
}
