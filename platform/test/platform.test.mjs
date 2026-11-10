import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { createPlatform } from '../server.mjs';
import { projectStore } from '../lib/projects.mjs';
import { readRecords } from '../lib/records.mjs';
import { Services } from '../lib/services.mjs';

async function temp(t) { const root = await mkdtemp(join(tmpdir(), 'eval-space-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
test('project store serializes writes, validates input, and persists associations', async t => {
  const root = await temp(t); const store = projectStore(root);
  assert.throws(() => store.create({ name: '   ' }), /项目名称/);
  const projects = await Promise.all(Array.from({ length: 12 }, (_, i) => store.create({ name: `研究 ${i}`, description: '说明' })));
  assert.equal((await store.list()).length, 12);
  await store.update(projects[0].id, { records: ['judge:abc', 'judge:abc'], status: 'archived' });
  const saved = (await projectStore(root).list()).find(p => p.id === projects[0].id);
  assert.deepEqual(saved.records, ['judge:abc']); assert.equal(saved.status, 'archived');
  await assert.rejects(store.update(projects[0].id, { records: ['../../secret'] }), /格式无效/);
  await assert.rejects(store.update('missing', {}), /项目不存在/);
});
test('record adapter reads tool histories without modifying them and reports corrupt records', async t => {
  const root = await temp(t);
  for (const directory of ['data/runs/run-1', 'data/runs/broken', 'pc-screenshots/batches/batch-1']) await mkdir(join(root, directory), { recursive: true });
  await writeFile(join(root, 'data/runs/run-1/summary.json'), JSON.stringify({ fileName: '<test>.xlsx', createdAt: '2026-10-29T00:00:00Z', resultCount: 2, successCount: 1, status: 'stopped' }));
  await writeFile(join(root, 'data/runs/broken/summary.json'), 'invalid');
  await writeFile(join(root, 'pc-screenshots/batches/batch-1/batch.json'), JSON.stringify({ name: '截图', items: [{ status: 'done' }, { status: 'queued' }], createdAt: '2026-10-28T00:00:00Z' }));
  const { records, warnings } = await readRecords(root);
  assert.equal(records.length, 2); assert.equal(warnings.length, 1);
  assert.equal(records[0].status, 'stopped'); assert.equal(records[1].status, 'running'); assert.equal(records[1].done, 1);
  assert.ok(records[0].url.includes('run=run-1'));
});
test('HTTP API creates and updates projects; cross-origin mutations and invalid bodies are rejected', async t => {
  const root = await temp(t); const app = createPlatform({ root, port: 0 });
  const address = await app.listen(); t.after(() => { app.services.close(); app.server.close(); });
  const base = `http://127.0.0.1:${address.port}`;
  const send = (path, body, method = 'POST', extra = {}) => fetch(base + path, { method, headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
  assert.equal((await (await fetch(base + '/api/health')).json()).name, 'evaluation-workspace');
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await send('/api/projects', { name: 'X' }, 'POST', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await fetch(base + '/api/projects', { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await send('/api/projects', [])).status, 400);
  const created = await send('/api/projects', { name: '质量研究' }); assert.equal(created.status, 201);
  const { project } = await created.json();
  assert.equal((await send(`/api/projects/${project.id}`, { records: ['judge:test'], status: 'archived' }, 'PATCH')).status, 200);
  const list = await (await fetch(base + '/api/projects')).json(); assert.equal(list.projects[0].status, 'archived');
  assert.equal((await send('/api/tools/unknown/start', {})).status, 404);
  assert.equal((await send('/api/tools/lens/start', {})).status, 404);
  assert.equal((await fetch(base + '/api/tools/lens/logs')).status, 404);
  assert.equal((await fetch(base + '/api/tools/unknown/logs')).status, 404);
  const missing = await fetch(base + '/not-a-file'); assert.equal(missing.status, 404);
});
test('online records come from the active tool, with offline fallback on API failure', async t => {
  const root = await temp(t);
  await mkdir(join(root, 'pc-screenshots/batches/offline-batch'), { recursive: true });
  await writeFile(join(root, 'pc-screenshots/batches/offline-batch/batch.json'), JSON.stringify({ name: '磁盘批次', items: [] }));
  const fetcher = async () => new Response(JSON.stringify([{ id: 'online-batch', name: '正在使用的服务', counts: { total: 3, done: 2, queued: 1 } }]));
  const online = await readRecords(root, { liveTools: ['screenshots'], fetcher });
  assert.equal(online.records.length, 1); assert.equal(online.records[0].id, 'online-batch');
  assert.equal(online.records[0].status, 'running'); assert.equal(online.records[0].done, 2);
  const offline = await readRecords(root, { liveTools: ['screenshots'], fetcher: async () => { throw new Error('断开'); } });
  assert.equal(offline.records[0].id, 'offline-batch'); assert.equal(offline.warnings.length, 1);
});
test('service probes distinguish an unrelated service and close preserves externally started services', async t => {
  const root = await temp(t); const services = new Services(root, root);
  const external = http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end('{"name":"fixture"}'); });
  await new Promise(resolve => external.listen(0, '127.0.0.1', resolve)); t.after(() => external.close());
  const port = external.address().port;
  assert.equal(await services.probe(port, '/', false, data => data.name === 'fixture'), 'online');
  assert.equal(await services.probe(port, '/', false, data => data.name === 'other'), 'occupied');
  services.close(); assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
});
test('service manager starts a child with a health check and shuts down its process group', async t => {
  const root = await temp(t); const services = new Services(root, root); t.after(() => services.close());
  const reservation = http.createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  await writeFile(join(root, 'fixture.mjs'), `import http from 'node:http'; http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end('{"ok":true}')}).listen(Number(process.env.PORT),'127.0.0.1');`);
  const tool = { id: 'fixture', port, health: '/', match: data => data.ok, components: [{ id: 'fixture', cwd: '.', script: 'fixture.mjs', port }] };
  await services.launch(tool); assert.equal(services.children.size, 1);
  assert.equal(await services.probe(port, '/', false, tool.match), 'online');
  services.close();
  const deadline = Date.now() + 3000;
  while (await services.probe(port) !== 'offline' && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(await services.probe(port), 'offline');
});
