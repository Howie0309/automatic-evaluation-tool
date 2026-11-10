const { test } = require('node:test');
const assert = require('node:assert/strict');
const { endpoint, messagesFor, chatCompletion } = require('./oneapi');
const { localSettingsRequest, publicConfig } = require('./config');

test('OneAPI 地址和多轮图片消息转换', () => {
  assert.equal(endpoint('https://gateway.example'), 'https://gateway.example/v1/chat/completions');
  assert.equal(endpoint('https://gateway.example/v1'), 'https://gateway.example/v1/chat/completions');
  const messages = messagesFor({ system: 'system', turns: [{ role: 'user', content: '第一轮' }, { role: 'assistant', content: '答' }, { role: 'user', content: '看图片' }], images: ['data:image/png;base64,AA=='] });
  assert.equal(messages[1].content, '第一轮');
  assert.equal(messages[2].role, 'assistant');
  assert.equal(messages[3].content[1].image_url.url, 'data:image/png;base64,AA==');
});

test('流式转发支持跨块 UTF-8、CRLF、思考和截断', async t => {
  let payload;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://gateway.example/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    payload = JSON.parse(options.body);
    const raw = new TextEncoder().encode('data: {"choices":[{"index":0,"delta":{"reasoning_content":"想"}}]}\r\n\r\ndata: {"choices":[{"index":0,"delta":{"content":"你好"}}]}\r\n\r\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"length"}]}\r\n\r\ndata: [DONE]\r\n\r\n');
    return new Response(new ReadableStream({ start(c) { for (const byte of raw) c.enqueue(Uint8Array.of(byte)); c.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const events = [];
  await chatCompletion({ base: 'https://gateway.example/v1', key: 'test-only', model: 'my-model' }, { system: 's', turns: [] }, e => events.push(e));
  assert.equal(payload.model, 'my-model');
  assert.equal(payload.stream, true);
  assert.ok(!('thinking' in payload));
  assert.deepEqual(events, [{ t: 'think' }, { t: 'delta', v: '你好' }, { t: 'truncated' }, { t: 'done' }]);
});

test('支持普通 JSON 返回，错误不泄露上游正文', async t => {
  const config = { base: 'https://gateway.example', key: 'test-only', model: 'm' };
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '成功' } }] }));
  const result = [];
  await chatCompletion(config, {}, e => result.push(e));
  assert.equal(result[0].v, '成功');
  globalThis.fetch = async () => new Response('test-only-secret', { status: 401 });
  const errors = [];
  await chatCompletion(config, {}, e => errors.push(e));
  assert.equal(errors[0].code, 'auth');
  assert.ok(!JSON.stringify(errors).includes('secret'));
});

test('配置接口阻止跨域、隧道和非本机请求且不返回密钥', () => {
  const req = { method: 'POST', socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:8787', origin: 'http://127.0.0.1:8787' } };
  assert.ok(localSettingsRequest(req));
  assert.ok(!localSettingsRequest({ ...req, headers: { ...req.headers, origin: 'https://other.example' } }));
  assert.ok(!localSettingsRequest({ ...req, headers: { ...req.headers, 'x-forwarded-for': '1.2.3.4' } }));
  assert.ok(!localSettingsRequest({ ...req, socket: { remoteAddress: '10.0.0.2' } }));
  assert.ok(!localSettingsRequest({ ...req, headers: { host: 'evil.example', origin: 'http://evil.example' } }));
  assert.ok(!('key' in publicConfig()));
});

test('配置保存权限、重启读取及密钥保留规则', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-config-test-'));
  const moduleFile = path.join(dir, 'config.cjs');
  try {
    fs.copyFileSync(path.join(__dirname, 'config.js'), moduleFile);
    let config = require(moduleFile);
    config.saveConfig({ provider: 'oneapi', base: 'https://test.example/v1/', model: 'test-model', key: 'fake-test-key' });
    assert.equal(fs.statSync(path.join(dir, '.local-config.json')).mode & 0o777, 0o600);
    assert.equal(config.publicConfig().hasKey, true);
    assert.ok(!JSON.stringify(config.publicConfig()).includes('fake-test-key'));
    config.saveConfig({ provider: 'oneapi', base: 'https://test.example/v1', model: 'new-model', key: '' });
    assert.equal(config.loadConfig().key, 'fake-test-key');
    assert.throws(() => config.saveConfig({ provider: 'oneapi', base: 'https://other.example/v1', model: 'm', key: '' }), /重新输入/);
    delete require.cache[require.resolve(moduleFile)];
    config = require(moduleFile);
    assert.equal(config.loadConfig().model, 'new-model');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
