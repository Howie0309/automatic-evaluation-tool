import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function directories(root) {
  try { return (await readdir(root, { withFileTypes: true })).filter(item => item.isDirectory() && /^[a-zA-Z0-9-]+$/.test(item.name)).map(item => item.name); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export async function readRecords(workspace, { liveTools = [], fetcher = fetch } = {}) {
  const warnings = [];
  async function scan(root, filename, convert) {
    return (await Promise.all((await directories(root)).map(async id => {
      try { return convert(JSON.parse(await readFile(join(root, id, filename), 'utf8')), id); }
      catch (error) { warnings.push(`${id}：${error.code === 'ENOENT' ? '缺少记录文件' : '记录无法读取'}`); return null; }
    }))).filter(Boolean);
  }
  let [judges, screenshots] = await Promise.all([
    scan(join(workspace, 'data/runs'), 'summary.json', (run, id) => ({ key: `judge:${id}`, id, tool: 'judge', name: String(run.fileName || '未命名评估'), createdAt: run.createdAt, status: run.status === 'stopped' ? 'stopped' : 'completed', total: run.resultCount || 0, done: run.successCount || 0, model: String(run.model || ''), url: `http://127.0.0.1:3077/report.html?run=${encodeURIComponent(id)}` })),
    scan(join(workspace, 'pc-screenshots/batches'), 'batch.json', (batch, id) => {
      const items = Array.isArray(batch.items) ? batch.items : [];
      const done = items.filter(item => item.status === 'done').length;
      const failed = items.filter(item => item.status === 'failed' || item.eval?.status === 'failed').length;
      const busy = items.some(item => ['queued', 'shooting'].includes(item.status) || ['queued', 'running'].includes(item.eval?.status));
      return { key: `screenshots:${id}`, id, tool: 'screenshots', name: String(batch.name || id), createdAt: batch.createdAt, status: busy ? 'running' : failed ? 'attention' : done === items.length && items.length ? 'completed' : 'pending', total: items.length, done, failed, evaluated: items.filter(item => item.eval?.status === 'done').length, url: 'http://127.0.0.1:3210/' };
    })
  ]);
  // Reused services can belong to another checkout. Their own read-only APIs
  // are authoritative while online, so the list matches the tool being opened.
  async function live(id, port, path, select, convert) {
    if (!liveTools.includes(id)) return null;
    try {
      const response = await fetcher(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error();
      const rows = select(await response.json());
      if (!Array.isArray(rows)) throw new Error();
      return rows.filter(row => row && /^[a-zA-Z0-9-]{1,100}$/.test(String(row.id))).map(convert);
    } catch { warnings.push(`${id}：在线记录读取失败，暂用本地文件记录`); return null; }
  }
  const number = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  const [liveJudges, liveScreenshots] = await Promise.all([
    live('judge', 3077, '/api/runs', value => value.runs, run => ({ key: `judge:${run.id}`, id: run.id, tool: 'judge', name: String(run.fileName || '未命名评估'), createdAt: run.createdAt, status: run.status === 'stopped' ? 'stopped' : 'completed', total: number(run.resultCount), done: number(run.successCount), model: String(run.model || ''), url: `http://127.0.0.1:3077/report.html?run=${encodeURIComponent(run.id)}` })),
    live('screenshots', 3210, '/api/batches', value => value, batch => {
      const counts = batch.counts || {};
      const total = number(counts.total), done = number(counts.done), failed = number(counts.failed);
      return { key: `screenshots:${batch.id}`, id: batch.id, tool: 'screenshots', name: String(batch.name || batch.id), createdAt: batch.createdAt, status: number(counts.queued) || batch.summaryStatus === 'running' ? 'running' : failed || batch.summaryStatus === 'failed' ? 'attention' : total && done === total ? 'completed' : 'pending', total, done, failed, evaluated: number(counts.evaluated), url: 'http://127.0.0.1:3210/' };
    })
  ]);
  if (liveJudges !== null) judges = liveJudges;
  if (liveScreenshots !== null) screenshots = liveScreenshots;
  return { records: [...judges, ...screenshots].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), warnings };
}
