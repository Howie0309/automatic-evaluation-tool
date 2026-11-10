// ChatGPT 网页版截图核心逻辑，CLI（shot-gpt.mjs）与网页服务（server.mjs）共用
import fs from 'node:fs';
import { chromium } from 'playwright-core';

export const CDP_URL = `http://127.0.0.1:${process.env.CDP_PORT || 9222}`;
export const APP = 'GPT';
const HOME_URL = 'https://chatgpt.com/';
const MAX_SHOT_PIXELS = 30000; // 长图物理像素高度上限，避免浏览器渲染失败
const ANSWER_TIMEOUT = 5 * 60 * 1000;

// 截图视图：pc 为桌面网页；手机视图用 DevTools 设备模拟（等同「检查」里切换手机视图）
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
export const DEVICES = {
  pc: { label: 'PC', width: 1440, height: 900, dpr: 1 },
  mobile: { label: 'Mobile', file: 'Mobile', width: 390, height: 844, dpr: 3, isMobile: true, userAgent: IPHONE_UA },
  // 440×956 对应 iPhone 16/17 Pro Max
  mobile440: { label: 'Mobile 440', file: 'Mobile440', width: 440, height: 956, dpr: 3, isMobile: true, userAgent: IPHONE_UA },
};
export const isMobile = (device) => !!DEVICES[device]?.isMobile;

// 页面选择器集中放这里，ChatGPT 改版后只需改这一处（PC 与手机视图的 DOM 不同，取并集）
const SEL = {
  input: '[contenteditable="true"].ProseMirror, [contenteditable="true"][data-lexical-editor="true"], #prompt-textarea:not([class*="fallbackTextarea"])',
  send: 'button[data-testid="send-button"], button#composer-submit-button, button[aria-label*="发送"], button[aria-label*="Send prompt"]',
  stop: 'button[aria-label="停止"], button[aria-label="Stop"], button[aria-label*="停止生成"], button[aria-label*="Stop generating"], button[aria-label*="Stop streaming"], button[aria-label*="停止流式"], [data-testid="stop-button"]',
  turn: '[data-turn-key], [data-message-author-role], [data-testid^="conversation-turn-"], [data-turn="user"], [data-turn="assistant"]',
  shotArea: 'main',
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parseQueries(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

export function safeName(s) {
  return s.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

// 文件名前缀：GPT / GPT-Mobile / GPT-Mobile440
export const fileLabel = (device) => (isMobile(device) ? `${APP}-${DEVICES[device].file}` : APP);

export async function connectBrowser() {
  // noDefaults：不对默认上下文下发下载行为等覆盖。Chrome 156 起会拒绝这些调用（Browser context management is not supported）
  return chromium.connectOverCDP(CDP_URL, { noDefaults: true }).catch((e) => {
    if (/ECONNREFUSED|retrieving websocket url/i.test(e.message) && !/Protocol error/.test(e.message)) {
      throw new Error(`连不上 ${CDP_URL}，请先启动专用 Chrome 并登录 ChatGPT`);
    }
    throw new Error(`连接 Chrome 失败：${e.message.split('\n')[0]}`);
  });
}

// 视口尺寸统一走 CDP 设备模拟，PC 与手机视图共用
async function setViewport(page, device, height) {
  const d = DEVICES[device];
  page._cdp ??= await page.context().newCDPSession(page);
  await page._cdp.send('Emulation.setDeviceMetricsOverride', {
    width: d.width,
    height: height ?? d.height,
    deviceScaleFactor: d.dpr,
    mobile: isMobile(device),
  });
}

// 新开一个标签页并应用视图；手机视图额外模拟 UA 与触屏，需在打开网页前设置
export async function openPage(browser, device = 'pc') {
  const page = await browser.contexts()[0].newPage();
  await setViewport(page, device);
  if (isMobile(device)) {
    await page._cdp.send('Emulation.setUserAgentOverride', { userAgent: DEVICES[device].userAgent, platform: 'iPhone' });
    await page._cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  return page;
}
// 发送按钮可用即提交，以新增轮次或生成状态确认，手机视图不使用回车。
export async function sendQuery(page, { buttonTimeout = 12000, confirmationTimeout = 30000, pollInterval = 200 } = {}) {
  const before = await page.locator(SEL.turn).count();
  const deadline = Date.now() + buttonTimeout;
  let button;
  while (Date.now() < deadline && !button) {
    const candidates = page.locator(SEL.send);
    for (let index = 0; index < await candidates.count(); index++) {
      const candidate = candidates.nth(index);
      if (!await candidate.isVisible().catch(() => false)) continue;
      if (!await candidate.isEnabled().catch(() => false)) continue;
      if (await candidate.getAttribute('aria-disabled').catch(() => null) === 'true') continue;
      button = candidate; break;
    }
    if (!button) await sleep(pollInterval);
  }
  if (!button) throw new Error('发送按钮未就绪，请检查页面登录状态或输入框；手机视图不能用回车代替发送');
  // Click once. Retrying the click can submit the same query twice when the
  // response or conversation navigation is slow.
  await button.click();
  const confirmationDeadline = Date.now() + confirmationTimeout;
  while (Date.now() < confirmationDeadline) {
    if (await page.locator(SEL.turn).count() > before) return;
    if (await page.locator(SEL.stop).first().isVisible().catch(() => false)) return;
    await sleep(pollInterval);
  }
  throw new Error('已点击发送，但未检测到新消息或生成状态，请检查 ChatGPT 页面是否报错');
}

// Read all completion signals in one browser round trip. In fast responses the
// stop button may disappear before polling begins; waiting for it wastes 20s.
export function readAnswerState(stopSelector) {
  const visible = node => !!node && !!(node.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const main = document.querySelector('main');
  if (!main) return { text: '', busy: false, complete: false };
  const answers = [...main.querySelectorAll('[data-message-author-role="assistant"], [data-turn="assistant"]')];
  let answer = answers.at(-1);
  if (!answer) {
    answer = [...main.querySelectorAll('article, [data-testid^="conversation-turn-"], [data-turn-key]')]
      .filter(node => [...node.querySelectorAll('h4,h5,[role="heading"]')].some(heading => /ChatGPT (说|said)|ChatGPT:|ChatGPT：/i.test(heading.textContent || ''))).at(-1);
  }
  const wholeText = main.innerText || '';
  const marker = /ChatGPT\s*(?:说|said)\s*[:：]/i;
  const markerIndex = wholeText.search(marker);
  const root = answer?.closest('article,[data-testid^="conversation-turn-"],[data-turn-key]') || answer || main;
  const complete = [...root.querySelectorAll('button')].some(button => visible(button) && (
    /^(复制|复制回复|Copy|Copy response|朗读|Read aloud|重新生成回复|Regenerate response)$/i.test(button.getAttribute('aria-label') || button.innerText.trim()) ||
    /^(copy-turn-action-button|good-response-turn-action-button|bad-response-turn-action-button)$/.test(button.getAttribute('data-testid') || '')
  ));
  const busy = [...document.querySelectorAll(stopSelector)].some(visible) ||
    (root.matches('[aria-busy="true"],[data-is-streaming="true"]') || [...root.querySelectorAll('[aria-busy="true"],[data-is-streaming="true"]')].some(visible));
  // Some builds expose the reply as generic containers without author roles or
  // visible headings. Reply-only action buttons still establish completion.
  const text = answer ? answer.innerText.trim() : markerIndex >= 0 ? wholeText.slice(markerIndex).replace(marker, '').trim() : complete ? wholeText.trim() : '';
  return { text, busy, complete };
}

export async function waitAnswerDone(page, { timeout = ANSWER_TIMEOUT, stableMs = 1200, fallbackStableMs = 4000, pollInterval = 250, now = Date.now, wait = sleep, onSample = () => {} } = {}) {
  let last = '';
  let stableSince = now();
  const deadline = now() + timeout;
  while (now() < deadline) {
    const { text, busy, complete } = await page.evaluate(readAnswerState, SEL.stop);
    onSample({ hasText: Boolean(text), busy, complete });
    if (!text || text !== last || busy) {
      last = text; stableSince = now();
    } else if (now() - stableSince >= (complete ? stableMs : fallbackStableMs)) {
      return;
    }
    await wait(pollInterval);
  }
  throw new Error('等待完整回答超时，请检查网页是否仍在生成或出现错误');
}

export async function prepareConversation(page, { timeout = 2500, now = Date.now, wait = sleep } = {}) {
  if (page._captureHasChat && page.url().startsWith(HOME_URL)) {
    for (const role of ['button', 'link']) {
      const control = page.getByRole(role, { name: /^(新聊天|New chat)$/i }).first();
      if (!await control.isVisible().catch(() => false)) continue;
      try {
        await control.click({ timeout: 2000 });
        const deadline = now() + timeout;
        while (now() < deadline) {
          if (new URL(page.url()).pathname === '/' && await page.locator(SEL.turn).count() === 0 &&
            await page.locator(SEL.input).first().isVisible().catch(() => false)) return;
          await wait(100);
        }
      } catch { /* Fall back to a clean navigation, without reusing a thread. */ }
      break;
    }
  }
  await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
}

// 回答区是页面内部的滚动容器（PC 与手机视图不是同一个元素，手机视图的容器在 main 外层），取可滚动距离最大的那个
const scrollerExtra = (page) =>
  page.evaluate(() => {
    let best = null;
    let max = 0;
    for (const el of document.querySelectorAll('body *')) {
      const oy = getComputedStyle(el).overflowY;
      const d = el.scrollHeight - el.clientHeight;
      if (/(auto|scroll)/.test(oy) && d > max) [best, max] = [el, d];
    }
    if (best) best.scrollTop = 0;
    return max;
  });

// 直接走 CDP 截图：Playwright 自带截图会重置设备模拟，导致倍率和手机视图失效
async function capture(page, file, clip, type = 'png') {
  const { data } = await page._cdp.send('Page.captureScreenshot', {
    format: type,
    ...(type === 'jpeg' ? { quality: 80 } : {}),
    clip: { ...clip, scale: 1 },
  });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

// fullPage 截不全内部滚动容器：把视口撑高到内容总高度，让容器无需滚动即可完整展示，再截 main 区域。
// withTiles 为 true 时额外按固定高度切出 JPEG 分段图，供 VLM 分析使用。
async function captureLong(page, file, device, withTiles) {
  const d = DEVICES[device];
  const maxCss = Math.floor(MAX_SHOT_PIXELS / d.dpr);
  const want = d.height + (await scrollerExtra(page));
  const truncated = want > maxCss;
  const height = Math.min(want, maxCss);
  await setViewport(page, device, height);
  await sleep(1500); // 等图片、懒加载内容渲染
  await scrollerExtra(page); // 回到顶部

  // PC 只截 main（去掉侧边栏）；手机视图截整屏，保留顶栏，贴近真机效果
  const box =
    isMobile(device)
      ? { x: 0, y: 0, width: d.width, height }
      : await page.locator(SEL.shotArea).first().boundingBox();
  await capture(page, file, box);
  await setViewport(page, device);
  return { truncated, width: Math.round(box.width * d.dpr), height: Math.round(box.height * d.dpr) };
}

// 需要暂停整个队列、人工处理的错误（登录失效、触发限流），自动重试没有意义
export class FatalError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const LOGIN_RE = /^(登录|Log in|Sign in)$/i;
const LIMIT_RE = /(已达到.{0,12}(上限|限制)|usage limit|rate limit|too many requests|请求过于频繁|请求过多)/i;
const ERROR_RE = /(出错了|Something went wrong|网络错误|network error)/i;
const CHALLENGE_RE = /(cloudflare|challenge|captcha|verify you are human|人机验证|安全验证)/i;

// 回答区出现带「重试」按钮的错误块（如 cloudflare_challenge、网络错误）时，返回错误块文字
async function answerIssue(page) {
  return page.evaluate(() => {
    const root = document.querySelector('main') || document.body;
    const btns = [...root.querySelectorAll('button')].filter(
      (b) => b.offsetParent && !b.closest('form') && /^(重试|Retry|重新尝试|Try again)$/i.test(b.innerText.trim()),
    );
    if (!btns.length) return null;
    // 往上找到包含错误说明文字的容器
    let el = btns[btns.length - 1];
    for (let i = 0; i < 4 && el.parentElement; i++) {
      el = el.parentElement;
      const t = el.innerText.replace(/(重试|Retry|重新尝试|Try again)\s*$/i, '').trim();
      if (t) return t.slice(0, 200);
    }
    return '页面出现「重试」按钮';
  });
}

// 取最后一条助手回答的文本，供 Excel 导出和文本类分析使用
async function answerText(page) {
  return page.evaluate(() => {
    const roles = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (roles.length) return roles[roles.length - 1].innerText.trim();
    const turns = document.querySelectorAll('[data-turn-key]');
    return (turns.length ? turns[turns.length - 1] : document.querySelector('main'))?.innerText.trim() || '';
  });
}

// 在指定页面上完成一条 query：新建对话 → 输入 → 等回答结束 → 截长图
export async function shotOne(page, query, file, { device = 'pc', onProgress = () => {} } = {}) {
  const startedAt = Date.now();
  const timings = {};
  try {
    onProgress({ phase: 'navigation' });
    await prepareConversation(page);
    onProgress({ phase: 'input' });
    const input = page.locator(SEL.input).first();
    const ready = await input.waitFor({ state: 'visible', timeout: 30000 }).then(() => true, () => false);
    if (!ready) {
      const needLogin = await page.getByRole('button', { name: LOGIN_RE }).first().isVisible().catch(() => false);
      if (needLogin) throw new FatalError('LOGIN', 'ChatGPT 登录已失效，请在专用 Chrome 中重新登录');
      throw new Error('输入框未出现，页面可能未加载完成');
    }
    timings.navigationMs = Date.now() - startedAt;
    const sendStartedAt = Date.now();
    // ChatGPT 会保留上次未发送的草稿，先清空再输入
    await input.fill(query);
    onProgress({ phase: 'send' });
    await sendQuery(page);
    page._captureHasChat = true;
    timings.sendMs = Date.now() - sendStartedAt;
    const answerStartedAt = Date.now();
    onProgress({ phase: 'answer' });
    await waitAnswerDone(page, { onSample: sample => onProgress({ phase: 'answer', ...sample }) });
    timings.answerMs = Date.now() - answerStartedAt;
    const issue = await answerIssue(page);
    if (issue && CHALLENGE_RE.test(issue)) {
      throw new FatalError('CHALLENGE', `ChatGPT 触发了人机验证（${issue}），请在专用 Chrome 中打开 chatgpt.com 完成验证后点「继续」`);
    }
    if (issue) throw new Error(`回答生成失败：${issue}`);
    const text = await answerText(page);
    if (LIMIT_RE.test(text.slice(0, 300))) throw new FatalError('LIMIT', `疑似触发 ChatGPT 限流：${text.slice(0, 80)}`);
    if (text.length < 60 && ERROR_RE.test(text)) throw new Error(`回答生成失败：${text}`);
    if (text.replace(query, '').trim().length < 2) throw new Error('回答为空');
    const screenshotStartedAt = Date.now();
    onProgress({ phase: 'screenshot' });
    const shot = await captureLong(page, file, device);
    timings.screenshotMs = Date.now() - screenshotStartedAt;
    timings.totalMs = Date.now() - startedAt;
    return { ...shot, answerText: text, url: page.url(), timings };
  } catch (e) {
    await setViewport(page, device).catch(() => {});
    if (e instanceof FatalError) throw e;
    throw new Error(e.message.split('\n')[0]);
  }
}
