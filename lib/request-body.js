import { MAX_API_BODY_BYTES } from '../public/upload-limits.js';

export function readBody(req, maxBytes = MAX_API_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, finished = false;
    const fail = error => {
      if (finished) return;
      finished = true;
      chunks.length = 0;
      reject(error);
    };
    const tooLarge = () => fail(Object.assign(new Error(`文件不能超过 ${Math.round(maxBytes / 1024 / 1024)} MB`), { status: 413 }));
    req.on('data', chunk => {
      if (finished) return;
      size += chunk.length;
      if (size > maxBytes) return tooLarge();
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (finished) return;
      finished = true;
      resolve(Buffer.concat(chunks, size));
      chunks.length = 0;
    });
    req.on('error', fail);
    req.on('aborted', () => fail(new Error('文件上传已中断，请重试')));
    // Do not destroy the socket: the client must receive the actionable 413 JSON.
    if (Number(req.headers?.['content-length']) > maxBytes) tooLarge();
  });
}
