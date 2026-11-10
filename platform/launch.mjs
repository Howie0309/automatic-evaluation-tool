import { spawn } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PLATFORM_PORT || 3088);
const url = `http://127.0.0.1:${port}`;
async function running() {
  try { const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) }); return (await response.json()).name === 'evaluation-workspace'; } catch { return false; }
}
if (process.argv.includes('--stop')) {
  if (await running()) { await fetch(`${url}/api/shutdown`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); console.log('工作台已停止。由它启动的工具服务也会退出。'); }
  else console.log('工作台尚未运行。');
} else {
  if (!(await running())) {
    const logDir = join(root, 'data/platform/logs'); await mkdir(logDir, { recursive: true });
    const log = await open(join(logDir, 'platform.log'), 'a');
    const child = spawn(process.execPath, [join(root, 'platform/server.mjs')], { cwd: root, env: process.env, detached: true, stdio: ['ignore', log.fd, log.fd] });
    let spawnError; child.once('error', error => spawnError = error); child.unref(); await log.close();
    const deadline = Date.now() + 12000;
    while (!(await running()) && Date.now() < deadline && !spawnError) await new Promise(resolve => setTimeout(resolve, 400));
    if (!(await running())) { console.error('启动失败：端口可能已被占用。请查看 data/platform/logs/platform.log。'); process.exitCode = 1; }
  }
  if (!process.exitCode) {
    console.log(`评估工作台：${url}`);
    if (process.platform === 'darwin' && !process.argv.includes('--no-open')) { const browser = spawn('/usr/bin/open', [url], { stdio: 'ignore' }); browser.once('error', () => console.log('请手动打开上方地址。')); }
    else console.log('请在浏览器中打开上方地址。');
  }
}
