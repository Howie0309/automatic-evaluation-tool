export function renderTemplate(template, row) {
  return String(template ?? '').replace(/{{\s*([^{}]+?)\s*}}/g, (_, path) => {
    const value = path.split('.').reduce((current, key) => current?.[key], row);
    if (value == null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

export function parseJudgeOutput(content) {
  if (content && typeof content === 'object') return content;
  const text = String(content ?? '').trim();
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let candidate = unfenced;
  for (let depth = 0; depth < 2; depth++) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed !== 'string') return parsed;
      candidate = parsed.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    } catch {
      break;
    }
  }

  let repairNesting = 0;
  let repairQuoted = false;
  let repairEscaped = false;
  for (let index = 0; index < candidate.length; index++) {
    const character = candidate[index];
    if (repairQuoted) {
      if (repairEscaped) repairEscaped = false;
      else if (character === '\\') repairEscaped = true;
      else if (character === '"') repairQuoted = false;
      continue;
    }
    if (character === '"') repairQuoted = true;
    else if (character === '{') repairNesting++;
    else if (character === '}' && repairNesting > 0) repairNesting--;
    else if (character === ',' && repairNesting === 1) {
      const nextObject = candidate.indexOf('{', index + 1);
      const finalBrace = candidate.lastIndexOf('}');
      if (nextObject >= 0 && /^\s*$/.test(candidate.slice(index + 1, nextObject)) && finalBrace > nextObject) {
        try {
          const first = JSON.parse(`${candidate.slice(0, index)}}`);
          const second = JSON.parse(candidate.slice(nextObject, finalBrace));
          if (first && second && typeof first === 'object' && typeof second === 'object') {
            return Object.assign({}, first, second);
          }
        } catch {}
      }
    }
  }

  if (repairNesting > 0 && !repairQuoted) {
    try {
      const repaired = JSON.parse(candidate + '}'.repeat(repairNesting));
      if (repaired && typeof repaired === 'object') return repaired;
    } catch {}
  }

  const fragments = [];
  let start = -1;
  let nesting = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < candidate.length; index++) {
    const character = candidate[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === '{') {
      if (nesting === 0) start = index;
      nesting++;
    } else if (character === '}' && nesting > 0) {
      nesting--;
      if (nesting === 0 && start >= 0) {
        try { fragments.push(JSON.parse(candidate.slice(start, index + 1))); } catch {}
        start = -1;
      }
    }
  }
  const objects = fragments.filter(value => value && typeof value === 'object' && !Array.isArray(value));
  if (objects.length === fragments.length && objects.length) {
    return Object.assign({}, ...objects);
  }
  return text;
}

export function valueAtPath(object, path) {
  return String(path || 'score').split('.').reduce((current, key) => current?.[key], object);
}

export function normalizeEndpoint(endpoint, apiMode = 'chat') {
  const trimmed = String(endpoint ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('API 地址必须以 http:// 或 https:// 开头');
  if (apiMode === 'responses') return trimmed.endsWith('/responses') ? trimmed : `${trimmed}/responses`;
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function responseText(payload) {
  if (payload?.output_text) return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.text) return content.text;
    }
  }
  return null;
}

function addSource(sources, seen, candidate = {}) {
  const citation = candidate?.url_citation ?? candidate;
  const url = String(citation?.url ?? '').trim();
  if (!/^https?:\/\//i.test(url) || seen.has(url)) return;
  seen.add(url);
  sources.push({
    title: String(citation?.title ?? '').trim(),
    url
  });
}

export function extractWebSearchMetadata(payload) {
  const queries = [];
  const sources = [];
  const seenQueries = new Set();
  const seenSources = new Set();
  let used = false;

  const addQuery = value => {
    const query = String(value ?? '').trim();
    if (!query || seenQueries.has(query)) return;
    seenQueries.add(query);
    queries.push(query);
  };

  for (const item of payload?.output ?? []) {
    if (item?.type === 'web_search_call') {
      used = true;
      addQuery(item.action?.query);
      for (const query of item.action?.queries ?? []) addQuery(query);
      for (const source of item.action?.sources ?? []) addSource(sources, seenSources, source);
    }
    for (const content of item?.content ?? []) {
      for (const annotation of content?.annotations ?? []) {
        if (annotation?.type === 'url_citation' || annotation?.url_citation) {
          addSource(sources, seenSources, annotation);
        }
      }
    }
  }

  return { used, queries, sources };
}

export async function callJudge({ apiKey, endpoint, model, provider = 'custom', systemPrompt, userPrompt, temperature = 0, reasoningEffort = 'auto', webSearchMode = 'off' }, fetchImpl = fetch, externalSignal = null) {
  if (!apiKey) throw new Error('请先填写 API Key');
  if (!model) throw new Error('请先填写模型名称');

  const useResponses = provider === 'openai';
  const body = useResponses ? {
    model,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  } : {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: Number(temperature) || 0
  };

  if (useResponses && reasoningEffort !== 'auto') body.reasoning = { effort: reasoningEffort };
  if (useResponses && !/^(gpt-5|o[134])/i.test(model)) body.temperature = Number(temperature) || 0;
  if (useResponses && ['auto', 'required'].includes(webSearchMode)) {
    body.tools = [{ type: 'web_search' }];
    body.tool_choice = webSearchMode;
    body.include = ['web_search_call.action.sources'];
  }
  if (!useResponses && ['deepseek', 'siliconflow'].includes(provider) && reasoningEffort !== 'auto') {
    body.enable_thinking = reasoningEffort === 'on';
  }
  if (!useResponses && provider === 'custom' && reasoningEffort !== 'auto') {
    body.reasoning_effort = reasoningEffort;
  }

  const timeoutSignal = AbortSignal.timeout(120000);
  const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
  const response = await fetchImpl(normalizeEndpoint(endpoint, useResponses ? 'responses' : 'chat'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.message || `模型接口请求失败（HTTP ${response.status}）`);
    error.status = response.status;
    throw error;
  }

  const content = useResponses ? responseText(payload) : payload?.choices?.[0]?.message?.content;
  if (content == null) throw new Error('模型接口没有返回消息内容');
  const webSearch = useResponses ? extractWebSearchMetadata(payload) : { used: false, queries: [], sources: [] };
  if (useResponses && webSearchMode === 'required' && !webSearch.used) {
    const error = new Error('已选择“强制搜索”，但模型接口没有返回 web_search_call。当前模型或 API 代理可能不支持联网搜索，本条结果已拒绝保存。');
    error.status = 422;
    throw error;
  }
  return {
    output: parseJudgeOutput(content),
    rawText: content,
    usage: payload.usage ?? null,
    webSearch,
    raw: payload
  };
}
