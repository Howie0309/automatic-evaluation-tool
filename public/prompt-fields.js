export function extractDeclaredFields(prompt) {
  const text = String(prompt ?? '');
  const candidates = [];
  let depth = 0;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '{') {
      depth++;
      continue;
    }
    if (character === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (character !== '"' && character !== "'") continue;

    const quote = character;
    let value = '';
    let cursor = index + 1;
    for (; cursor < text.length; cursor++) {
      if (text[cursor] === '\\' && cursor + 1 < text.length) {
        value += text[cursor + 1];
        cursor++;
        continue;
      }
      if (text[cursor] === quote) break;
      value += text[cursor];
    }
    if (cursor >= text.length) break;
    let after = cursor + 1;
    while (/\s/.test(text[after] || '')) after++;
    if (text[after] === ':' && value.trim()) candidates.push({ name: value.trim(), depth });
    index = cursor;
  }

  if (!candidates.length) return [];
  const minimumDepth = Math.min(...candidates.map(item => item.depth));
  return [...new Set(candidates.filter(item => item.depth === minimumDepth).map(item => item.name))];
}
