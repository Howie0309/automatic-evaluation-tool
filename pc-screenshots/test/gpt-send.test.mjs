import test from 'node:test';
import assert from 'node:assert/strict';
import { sendQuery } from '../lib/gpt.mjs';
function pageFixture({ available = true, ariaDisabled = false, onClick = () => {}, initialTurns = 0 } = {}) {
  let clicks = 0, turns = initialTurns;
  const button = { isVisible: async () => true, isEnabled: async () => true, getAttribute: async () => ariaDisabled ? 'true' : null, click: async () => { clicks++; onClick(() => turns++); } };
  const page = { locator(selector) {
    if (selector.includes('send-button')) return { count: async () => available ? 2 : 0, nth: i => i === 0 ? { isVisible: async () => false } : button };
    if (selector.includes('stop-button')) return { first: () => ({ isVisible: async () => false }) };
    return { count: async () => turns };
  }, keyboard: { press() { throw new Error('手机视图不应回车发送'); } } };
  return { page, clicks: () => clicks };
}
test('mobile send waits for an enabled visible button, clicks once and confirms a new turn', async () => {
  const fixture = pageFixture({ onClick: add => setTimeout(add, 10) });
  await sendQuery(fixture.page, { buttonTimeout: 100, confirmationTimeout: 100, pollInterval: 2 });
  assert.equal(fixture.clicks(), 1);
});
test('an old conversation cannot be mistaken for a successful new submission', async () => {
  const fixture = pageFixture({ initialTurns: 2 });
  await assert.rejects(sendQuery(fixture.page, { buttonTimeout: 50, confirmationTimeout: 15, pollInterval: 2 }), /未检测到新消息/);
  assert.equal(fixture.clicks(), 1);
});
test('a disabled or missing send button never falls back to Enter on mobile', async () => {
  for (const options of [{ available: false }, { ariaDisabled: true }]) {
    const fixture = pageFixture(options);
    await assert.rejects(sendQuery(fixture.page, { buttonTimeout: 10, pollInterval: 2 }), /发送按钮未就绪/);
    assert.equal(fixture.clicks(), 0);
  }
});
