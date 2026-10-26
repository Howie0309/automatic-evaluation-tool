import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { readBody } from '../lib/request-body.js';
import { MAX_API_BODY_BYTES, MAX_DATASET_UPLOAD_BYTES, MAX_RULE_UPLOAD_BYTES } from '../public/upload-limits.js';

test('dataset limit is 300 MiB while rules and other API requests remain 100 MiB', () => {
  assert.equal(MAX_DATASET_UPLOAD_BYTES, 314572800);
  assert.equal(MAX_RULE_UPLOAD_BYTES, 104857600);
  assert.equal(MAX_API_BODY_BYTES, MAX_RULE_UPLOAD_BYTES);
});

test('request reader accepts the exact byte limit and preserves bytes', async () => {
  const body = await readBody(Readable.from([Buffer.from('abcd'), Buffer.from('efgh')]), 8);
  assert.equal(body.toString(), 'abcdefgh');
});

test('chunked requests exceeding the limit fail with 413 without destroying the socket', async () => {
  const req = new EventEmitter();
  let destroyed = false;
  req.destroy = () => { destroyed = true; };
  const body = readBody(req, 8);
  const rejected = assert.rejects(body, { status: 413 });
  req.emit('data', Buffer.from('abcdefgh'));
  req.emit('data', Buffer.from('i'));
  req.emit('data', Buffer.from('discard this'));
  req.emit('end');
  await rejected;
  assert.equal(destroyed, false);
});

test('declared content over 300 MiB fails before buffering any upload bytes', async () => {
  const req = new EventEmitter();
  req.headers = { 'content-length': String(MAX_DATASET_UPLOAD_BYTES + 1) };
  await assert.rejects(readBody(req, MAX_DATASET_UPLOAD_BYTES), { status: 413, message: '文件不能超过 300 MB' });
});

test('declared uploads at 100–300 MiB are not rejected by the dataset header check', async () => {
  for (const size of [MAX_RULE_UPLOAD_BYTES + 1, MAX_DATASET_UPLOAD_BYTES]) {
    const req = new EventEmitter();
    req.headers = { 'content-length': String(size) };
    const body = readBody(req, MAX_DATASET_UPLOAD_BYTES);
    // Emulate an interrupted transmission after header validation, without allocating 300 MiB.
    req.emit('aborted');
    await assert.rejects(body, { message: '文件上传已中断，请重试' });
  }
});

test('default API limit still rejects declared uploads over 100 MiB', async () => {
  const req = new EventEmitter();
  req.headers = { 'content-length': String(MAX_RULE_UPLOAD_BYTES + 1) };
  await assert.rejects(readBody(req), { status: 413, message: '文件不能超过 100 MB' });
});

test('empty bodies and stream errors finish without hanging', async () => {
  assert.equal((await readBody(Readable.from([]))).length, 0);
  const req = new EventEmitter();
  const body = readBody(req);
  req.emit('error', new Error('connection lost'));
  await assert.rejects(body, /connection lost/);
});
