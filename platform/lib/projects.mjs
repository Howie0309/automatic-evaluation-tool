import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function projectStore(directory) {
  const file = join(directory, 'projects.json');
  let pending = Promise.resolve();
  async function list() {
    try {
      const value = JSON.parse(await readFile(file, 'utf8'));
      if (!Array.isArray(value)) throw new Error('项目数据格式错误');
      return value;
    } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  function mutate(action) {
    const next = pending.then(async () => {
      const projects = await list();
      const result = action(projects);
      await mkdir(directory, { recursive: true });
      const temp = `${file}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(projects, null, 2), { mode: 0o600 });
      await rename(temp, file);
      return result;
    });
    pending = next.catch(() => {});
    return next;
  }
  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  return {
    list,
    create(input) {
      if (!text(input.name, 100)) throw Object.assign(new Error('请填写项目名称'), { status: 400 });
      return mutate(projects => {
        const now = new Date().toISOString();
        const project = { id: randomUUID(), name: text(input.name, 100), description: text(input.description, 1000), status: 'active', records: [], createdAt: now, updatedAt: now };
        projects.unshift(project); return project;
      });
    },
    update(id, input) {
      return mutate(projects => {
        const project = projects.find(item => item.id === id);
        if (!project) throw Object.assign(new Error('项目不存在'), { status: 404 });
        if ('name' in input) {
          if (!text(input.name, 100)) throw Object.assign(new Error('请填写项目名称'), { status: 400 });
          project.name = text(input.name, 100);
        }
        if ('description' in input) project.description = text(input.description, 1000);
        if (['active', 'archived'].includes(input.status)) project.status = input.status;
        if ('records' in input) {
          if (!Array.isArray(input.records) || input.records.length > 5000 || input.records.some(key => typeof key !== 'string' || !/^(judge|screenshots):[a-zA-Z0-9-]{1,100}$/.test(key))) throw Object.assign(new Error('关联记录格式无效'), { status: 400 });
          project.records = [...new Set(input.records)];
        }
        project.updatedAt = new Date().toISOString();
        return project;
      });
    }
  };
}
