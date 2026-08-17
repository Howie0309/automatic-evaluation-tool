import test from 'node:test';
import assert from 'node:assert/strict';
import { callJudge, normalizeEndpoint, parseJudgeOutput, renderTemplate, valueAtPath } from '../lib/evaluator.js';
import { extractDeclaredFields } from '../public/prompt-fields.js';
import { isRetryableError, retryDelay } from '../public/retry.js';

test('renderTemplate supports nested values and missing values', () => {
  assert.equal(renderTemplate('{{query}} / {{meta.lang}} / {{missing}}', { query: 'Q', meta: { lang: 'zh' } }), 'Q / zh / ');
});

test('parseJudgeOutput accepts plain and fenced JSON', () => {
  assert.deepEqual(parseJudgeOutput('{"score":8}'), { score: 8 });
  assert.deepEqual(parseJudgeOutput('```json\n{"score":9}\n```'), { score: 9 });
  assert.deepEqual(parseJudgeOutput('结果如下： {"score":7,"reason":"ok"}'), { score: 7, reason: 'ok' });
  assert.equal(parseJudgeOutput('合格：回答覆盖了关键事实。'), '合格：回答覆盖了关键事实。');
});

test('valueAtPath supports nested score', () => {
  assert.equal(valueAtPath({ result: { score: 6 } }, 'result.score'), 6);
});

test('extractDeclaredFields returns top-level System Prompt variables', () => {
  const prompt = '请返回 {"result": {"score": 8}, "reason": "说明", "citations": []}';
  assert.deepEqual(extractDeclaredFields(prompt), ['result', 'reason', 'citations']);
  assert.deepEqual(extractDeclaredFields('请直接输出评审意见'), []);
});

test('retry policy only retries transient upstream failures', () => {
  assert.equal(isRetryableError(503, ''), true);
  assert.equal(isRetryableError(400, 'upstream connect error or disconnect/reset before headers'), true);
  assert.equal(isRetryableError(401, 'invalid api key'), false);
  assert.equal(retryDelay(1), 800);
  assert.equal(retryDelay(3), 3200);
});

test('normalizeEndpoint appends chat completions once', () => {
  assert.equal(normalizeEndpoint('https://api.example.com/v1/'), 'https://api.example.com/v1/chat/completions');
  assert.equal(normalizeEndpoint('https://api.example.com/v1/chat/completions'), 'https://api.example.com/v1/chat/completions');
  assert.equal(normalizeEndpoint('https://api.example.com/v1', 'responses'), 'https://api.example.com/v1/responses');
});

test('callJudge uses Responses API and reasoning effort for OpenAI', async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{"score":9,"reason":"稳定"}' }] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  const result = await callJudge({
    apiKey: 'test-key', endpoint: 'https://api.openai.com/v1', provider: 'openai', model: 'gpt-5.6',
    systemPrompt: 'system', userPrompt: 'user', temperature: 0.8, reasoningEffort: 'medium'
  }, fakeFetch);
  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  assert.deepEqual(captured.body.reasoning, { effort: 'medium' });
  assert.equal('temperature' in captured.body, false);
  assert.equal(result.output.score, 9);
});

test('callJudge sends OpenAI-compatible payload and parses the result', async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"score":8,"reason":"清晰"}' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  const result = await callJudge({
    apiKey: 'test-key', endpoint: 'https://api.example.com/v1', model: 'judge-model',
    systemPrompt: 'system', userPrompt: 'user', temperature: 0
  }, fakeFetch);
  assert.equal(captured.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(captured.options.headers.authorization, 'Bearer test-key');
  assert.equal('response_format' in JSON.parse(captured.options.body), false);
  assert.deepEqual(result.output, { score: 8, reason: '清晰' });
});
