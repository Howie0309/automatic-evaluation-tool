import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { prepareModelImages, MAX_MODEL_IMAGE_DIMENSION } from '../lib/model-images.js';
import { callJudge } from '../lib/evaluator.js';

function fixture(width, height, mime = 'image/png') {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = 'white'; context.fillRect(0, 0, width, height);
  context.fillStyle = 'red'; context.fillRect(0, 0, width, Math.min(100, height));
  context.fillStyle = 'blue'; context.fillRect(0, Math.max(0, height - 100), width, Math.min(100, height));
  return { id: 'test-image', dataUrl: `data:${mime};base64,${canvas.toBuffer(mime).toString('base64')}` };
}
const decode = image => loadImage(Buffer.from(image.dataUrl.split(',')[1], 'base64'));

test('small and boundary images keep their exact original bytes and metadata', async () => {
  for (const image of [fixture(32, 48), fixture(1, 8000)]) {
    const snapshot = structuredClone(image);
    const [prepared] = await prepareModelImages([image]);
    assert.equal(prepared.dataUrl, image.dataUrl);
    assert.equal(prepared.modelImage.resized, false);
    assert.deepEqual(image, snapshot);
  }
  assert.deepEqual(await prepareModelImages([]), []);
});

test('portrait, landscape and square images fit 8000px without cropping or enlarging', async () => {
  for (const [width, height, mime] of [[1264, 8707, 'image/jpeg'], [8515, 1264, 'image/png'], [8001, 8001, 'image/png']]) {
    const image = fixture(width, height, mime);
    const original = image.dataUrl;
    const [prepared] = await prepareModelImages([image], '待评');
    const decoded = await decode(prepared);
    assert.equal(Math.max(decoded.width, decoded.height), MAX_MODEL_IMAGE_DIMENSION);
    assert.equal(decoded.width, Math.max(1, Math.round(width * 8000 / Math.max(width, height))));
    assert.equal(decoded.height, Math.max(1, Math.round(height * 8000 / Math.max(width, height))));
    assert.deepEqual(prepared.modelImage, { originalWidth: width, originalHeight: height, width: decoded.width, height: decoded.height, resized: true, mime });
    assert.equal(image.dataUrl, original);
    assert.notEqual(prepared.dataUrl, original);
    const check = createCanvas(decoded.width, decoded.height).getContext('2d');
    check.drawImage(decoded, 0, 0);
    const top = check.getImageData(0, 0, 1, 1).data;
    const bottom = check.getImageData(0, decoded.height - 1, 1, 1).data;
    assert.ok(top[0] > 200 && top[2] < 30, 'top edge retained');
    assert.ok(bottom[2] > 200 && bottom[0] < 30, 'bottom edge retained');
  }
});

test('lossless non-JPEG resizing retains transparent pixels', async () => {
  const canvas = createCanvas(2, 8001);
  const [prepared] = await prepareModelImages([{ dataUrl: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}` }]);
  const image = await decode(prepared);
  const context = createCanvas(image.width, image.height).getContext('2d');
  context.drawImage(image, 0, 0);
  assert.equal(context.getImageData(0, 0, 1, 1).data[3], 0);
});

test('invalid images fail before requests instead of silently omitting them; abort is respected', async () => {
  await assert.rejects(prepareModelImages([{ dataUrl: 'https://example.com/image.png' }], '待评'), /待评图片/);
  await assert.rejects(prepareModelImages([{ dataUrl: 'data:image/png;base64,YmFk', cellAddress: 'S3' }], '待评'), /待评图片（S3）无法解码/);
  const controller = new AbortController(); controller.abort(new Error('已中断'));
  await assert.rejects(prepareModelImages([fixture(2, 2)], '待评', controller.signal), /已中断/);
});

test('both API protocols send scaled case and rule images with metadata but no changed prompts', async () => {
  const rule = fixture(20, 8500);
  const image = { ...fixture(1264, 8707, 'image/jpeg'), cellAddress: 'S3', excelRowNumber: 3 };
  for (const provider of ['openai', 'custom']) {
    let request;
    const result = await callJudge({ apiKey: 'local-mock', model: 'vision-test', provider, endpoint: 'http://localhost/v1', systemPrompt: '原始规则', userPrompt: '原始输入', ruleImages: [rule], caseImages: [image] }, async (_url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify(provider === 'openai' ? { output_text: '{"ok":true}' } : { choices: [{ message: { content: '{"ok":true}' } }] }));
    });
    const messages = request.input || request.messages;
    assert.equal(messages[0].content, '原始规则');
    assert.equal(messages[2].content[0].text, '原始输入');
    assert.match(messages[2].content[2].text, /S3/);
    const url = part => provider === 'openai' ? part.image_url : part.image_url.url;
    const sentRule = await decode({ dataUrl: url(messages[1].content[2]) });
    const sentCase = await decode({ dataUrl: url(messages[2].content[3]) });
    assert.equal(sentRule.height, 8000);
    assert.deepEqual([sentCase.width, sentCase.height], [1161, 8000]);
    assert.equal(result.imageProcessing.caseImages[0].resized, true);
    assert.doesNotMatch(JSON.stringify(result.imageProcessing), /base64/);
  }
});
