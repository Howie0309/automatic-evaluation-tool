function messagesFor(body) {
  const turns = Array.isArray(body.turns) ? body.turns.slice(-12) : [];
  const lastUser = turns.map(t => t.role).lastIndexOf('user');
  const images = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
  return [{ role: 'system', content: String(body.system || '').slice(0, 40000) }, ...turns.map((t, i) => ({
    role: t.role === 'assistant' ? 'assistant' : 'user',
    content: i === lastUser && images.length ? [
      { type: 'text', text: String(t.content || '') },
      ...images.map(url => ({ type: 'image_url', image_url: { url } })),
    ] : String(t.content || ''),
  }))];
}
function endpoint(base) {
  return base.replace(/\/+$/, '') + (/\/v\d+$/.test(base) ? '' : '/v1') + '/chat/completions';
}
async function chatCompletion(config, body, send, signal) {
  const up = await fetch(endpoint(config.base), {
    method: 'POST', signal, redirect: 'error',
    headers: { Authorization: 'Bearer ' + config.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: messagesFor(body), stream: true }),
  });
  if (!up.ok) {
    // Avoid returning arbitrary upstream bodies which may contain credentials.
    const codes = { 401: 'auth', 403: 'auth', 429: 'rate_limited' };
    send({ t: 'error', code: codes[up.status] || 'upstream_error', message: `OneAPI 返回 ${up.status}，请检查接口地址、令牌权限及模型名称。` });
    return;
  }
  function event(ev, streaming = true) {
    if (ev.error) throw new Error('OneAPI 返回接口错误，请检查令牌额度、模型权限和渠道状态。');
    for (const c of ev.choices || []) {
      if (c.index && c.index !== 0) continue;
      const delta = streaming ? c.delta : c.message;
      if (delta?.reasoning_content) send({ t: 'think' });
      if (typeof delta?.content === 'string' && delta.content) send({ t: 'delta', v: delta.content });
      if (c.finish_reason === 'length') send({ t: 'truncated' });
      if (c.finish_reason === 'content_filter') throw new Error('内容被上游模型过滤，请调整问题。');
    }
  }
  if ((up.headers.get('content-type') || '').includes('application/json')) {
    event(await up.json(), false);
  } else {
    if (!up.body) throw new Error('OneAPI 没有返回响应内容');
    const decoder = new TextDecoder();
    let buffer = '', data = [];
    function line(value) {
      value = value.replace(/\r$/, '');
      if (!value) {
        const raw = data.join('\n'); data = [];
        if (!raw || raw === '[DONE]') return;
        let ev;
        try { ev = JSON.parse(raw); } catch { throw new Error('OneAPI 返回了无法解析的流式数据'); }
        event(ev);
      } else if (value.startsWith('data:')) data.push(value.slice(5).trimStart());
    }
    for await (const chunk of up.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) { line(buffer.slice(0, end)); buffer = buffer.slice(end + 1); }
    }
    buffer += decoder.decode();
    if (buffer) line(buffer);
    line('');
  }
  send({ t: 'done' });
}
module.exports = { endpoint, messagesFor, chatCompletion };
