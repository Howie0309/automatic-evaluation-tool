import test from 'node:test';
import assert from 'node:assert/strict';
import { waitAnswerDone, prepareConversation } from '../lib/gpt.mjs';

function completionFixture(samples) {
  let time = 0, reads = 0;
  return {
    page: { evaluate: async () => samples[Math.min(reads++, samples.length - 1)] },
    options: { now: () => time, wait: async ms => { time += ms; }, pollInterval: 100, timeout: 10000 },
    elapsed: () => time
  };
}
test('a fast completed response does not wait for a stop button that already disappeared', async () => {
  const f = completionFixture([{ text: '完整回答', busy: false, complete: true }]);
  await waitAnswerDone(f.page, f.options);
  assert.equal(f.elapsed(), 1200);
});
test('unchanged text during generation is never treated as completion', async () => {
  const generating = Array.from({ length: 60 }, () => ({ text: '还在思考', busy: true, complete: true }));
  const f = completionFixture([...generating, { text: '完整回答', busy: false, complete: true }]);
  await waitAnswerDone(f.page, f.options);
  assert.ok(f.elapsed() >= 7200);
});
test('without a completion marker, text must remain stable longer; a late chunk resets the timer', async () => {
  const f = completionFixture([
    ...Array.from({ length: 30 }, () => ({ text: '第一段', busy: false, complete: false })),
    { text: '第一段与第二段', busy: false, complete: false }
  ]);
  await waitAnswerDone(f.page, f.options);
  assert.equal(f.elapsed(), 7000);
});
test('an empty answer times out rather than saving an empty screenshot as success', async () => {
  const f = completionFixture([{ text: '', busy: false, complete: false }]);
  await assert.rejects(waitAnswerDone(f.page, { ...f.options, timeout: 1000 }), /完整回答超时/);
});
function navigationFixture({ stale = false, controls = true } = {}) {
  let navigations = 0, clicks = 0, time = 0, url = 'https://chatgpt.com/c/old';
  const page = {
    _captureHasChat: true, url: () => url,
    goto: async target => { navigations++; url = target; },
    getByRole: () => ({ first: () => ({ isVisible: async () => controls, click: async () => { clicks++; url = 'https://chatgpt.com/'; } }) }),
    locator: selector => selector.includes('conversation-turn-') ? { count: async () => stale ? 2 : 0 } : { first: () => ({ isVisible: async () => true }) }
  };
  return { page, options: { now: () => time, wait: async ms => { time += ms; }, timeout: 200 }, result: () => ({ clicks, navigations }) };
}
test('new chat reuses the loaded page without a full reload when previous messages are cleared', async () => {
  const f = navigationFixture(); await prepareConversation(f.page, f.options);
  assert.deepEqual(f.result(), { clicks: 1, navigations: 0 });
});
test('new chat falls back to a clean navigation if old messages remain or the control is missing', async () => {
  for (const options of [{ stale: true }, { controls: false }]) {
    const f = navigationFixture(options); await prepareConversation(f.page, f.options);
    assert.equal(f.result().navigations, 1);
  }
});

test('generic reply containers can finish via reply-only copy controls without role attributes', async () => {
  const { readAnswerState } = await import('../lib/gpt.mjs');
  const savedDocument = globalThis.document, savedStyle = globalThis.getComputedStyle;
  const button = { getClientRects: () => [1], getAttribute: key => key === 'aria-label' ? '复制' : null, innerText: '' };
  const main = { innerText: '测试问题\n完整测试回答', matches: () => false, querySelectorAll: selector => selector === 'button' ? [button] : [] };
  globalThis.document = { querySelector: () => main, querySelectorAll: () => [] };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  try { assert.deepEqual(readAnswerState('.stop'), { text: '测试问题\n完整测试回答', busy: false, complete: true }); }
  finally { globalThis.document = savedDocument; globalThis.getComputedStyle = savedStyle; }
});
