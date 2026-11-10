import { spawn } from 'node:child_process';
import { access, mkdir, open, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tools, publicTool } from './catalog.mjs';

export class Services {
  constructor(workspace, dataDirectory) {
    this.workspace = workspace; this.dataDirectory = dataDirectory;
    this.children = new Map(); this.starting = new Set(); this.errors = new Map(); this.closed = false;
  }
  async inspect(port, path = '/', html = false, match = () => true) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(1600), redirect: 'error' });
      const value = html ? await response.text() : await response.json();
      return { status: response.ok && match(value) ? 'online' : 'occupied', value };
    } catch (error) { return { status: error.cause?.code === 'ECONNREFUSED' ? 'offline' : 'occupied' }; }
  }
  async probe(...args) { return (await this.inspect(...args)).status; }
  async status(tool) {
    const status = await this.probe(tool.port, tool.health, tool.html, tool.match);
    const components = [];
    return { ...publicTool(tool), status: this.starting.has(tool.id) ? 'starting' : status, managed: tool.components.some(c => this.children.has(c.id)), components, error: this.errors.get(tool.id) || null };
  }
  async list() { return Promise.all(tools.map(tool => this.status(tool))); }
  async start(id) {
    const tool = tools.find(item => item.id === id);
    if (!tool) throw Object.assign(new Error('工具不存在'), { status: 404 });
    if (this.starting.has(id)) return { accepted: true };
    if (this.closed) throw new Error('工作台正在退出');
    this.starting.add(id); this.errors.delete(id);
    this.launch(tool).catch(error => this.errors.set(id, error.message)).finally(() => this.starting.delete(id));
    return { accepted: true };
  }
  async launch(tool) {
    // Validate every dependency before spawning any part of the tool.
    for (const component of tool.components) {
      try {
        await access(join(this.workspace, component.cwd, component.script));
        if (component.dependency) await access(join(this.workspace, component.cwd, component.dependency));
      } catch { throw new Error(`缺少 ${tool.name} 的运行文件或依赖，请在 ${component.cwd} 目录运行 npm install。`); }
    }
    await mkdir(join(this.dataDirectory, 'logs'), { recursive: true });
    for (const component of tool.components) {
      if (this.closed) return;
      const state = await this.probe(component.port, component.health || tool.health, component.id === tool.id && tool.html,
        component.id === tool.id ? tool.match : data => !!data.runnerVersion);
      if (state === 'online') continue;
      if (state === 'occupied') throw new Error(`端口 ${component.port} 被占用或服务未响应，请检查后重试。`);
      if (this.children.has(component.id)) continue;
      const log = await open(join(this.dataDirectory, 'logs', `${component.id}.log`), 'a');
      const child = spawn(process.execPath, [component.script, ...(component.args || [])], {
        cwd: join(this.workspace, component.cwd), detached: true,
        env: { ...process.env, PORT: String(component.port), HOST: '127.0.0.1', JUDGE_HOST: '127.0.0.1', WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_PATH: '.wrangler/logs', MINIFLARE_REGISTRY_PATH: '.wrangler/registry' },
        stdio: ['ignore', log.fd, log.fd]
      });
      this.children.set(component.id, child);
      child.once('error', error => { this.errors.set(tool.id, error.message); this.children.delete(component.id); });
      child.once('exit', code => {
        this.children.delete(component.id);
        if (code && !this.closed) this.errors.set(tool.id, `${component.id} 启动失败，请查看运行日志。`);
      });
      await log.close();
    }
    const deadline = Date.now() + 25000;
    while (!this.closed && Date.now() < deadline) {
      const status = await this.status(tool);
      if (await this.probe(tool.port, tool.health, tool.html, tool.match) === 'online' && status.components.every(c => c.status === 'online')) return;
      if (this.errors.has(tool.id)) throw new Error(this.errors.get(tool.id));
      await new Promise(resolve => setTimeout(resolve, 750));
    }
    if (!this.closed) throw new Error('启动等待超时，可在设置中查看日志并重新检测。');
  }
  async logs(id) {
    const tool = tools.find(tool => tool.id === id);
    if (!tool) throw Object.assign(new Error('工具不存在'), { status: 404 });
    return Promise.all(tool.components.map(async component => {
      try { return { name: component.id, text: (await readFile(join(this.dataDirectory, 'logs', `${component.id}.log`), 'utf8')).slice(-16000) }; }
      catch { return { name: component.id, text: '暂无由工作台启动的运行日志。' }; }
    }));
  }
  close() {
    this.closed = true;
    for (const child of this.children.values()) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch {}
    }
    this.children.clear();
  }
}
