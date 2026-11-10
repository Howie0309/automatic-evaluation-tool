import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync } from 'node:fs';

for (const [file, portEnv] of [
  ['server.mjs', 'AI_LENS_RUNNER_PORT'],
  ['chatgpt-server.mjs', 'AI_LENS_CHATGPT_PORT'],
  ['google-ai-server.mjs', 'AI_LENS_GOOGLE_AI_PORT'],
  ['wenxin-server.mjs', 'AI_LENS_WENXIN_PORT']
]) {
  test(`${file}: launch, health probes and dashboard polling never open a browser in lazy mode`, { skip: !existsSync(new URL(`../../AI-Lens-local/runner/${file}`, import.meta.url)) }, async t => {
    const root = await mkdtemp(join(tmpdir(), 'eval-lazy-browser-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const source = await readFile(new URL(`../../AI-Lens-local/runner/${file}`, import.meta.url), 'utf8');
    await writeFile(join(root, 'runner.mjs'), source);
    // Instrument the browser boundary: any attempted browser connection creates
    // a marker and fails, so this test cannot navigate to a real website.
    await writeFile(join(root, 'shared-browser.mjs'), `import {writeFile} from 'node:fs/promises'; export async function claimSharedPage(){await writeFile('browser-attempted','yes'); throw new Error('Unexpected browser launch');} export function sharedContextRef(){} export async function hideSharedWindow(){} export async function showSharedWindow(){}`);
    const reservation = http.createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
    const child = spawn(process.execPath, ['runner.mjs'], { cwd: root, env: { ...process.env, AI_LENS_LAZY_BROWSER: '1', [portEnv]: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
    t.after(async () => { if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); } });
    const base = `http://127.0.0.1:${port}`;
    let ready = false; const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      try { const response = await fetch(base + '/api/health'); ready = response.ok; if (ready) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(ready, output);
    for (let i = 0; i < 3; i++) {
      const health = await (await fetch(base + '/api/health')).json();
      assert.equal(health.runner, 'online'); assert.equal(health.browserStarted, false);
      const status = await (await fetch(base + '/api/status')).json();
      assert.ok(['needs_login', 'ready'].includes(status.status), JSON.stringify(status));
      assert.equal((await fetch(base + '/api/runs')).status, 200);
    }
    await assert.rejects(access(join(root, 'browser-attempted')));
    // The existing explicit login action still reaches the browser boundary.
    if (file !== 'google-ai-server.mjs') {
      await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      await access(join(root, 'browser-attempted'));
    }
  });
}
