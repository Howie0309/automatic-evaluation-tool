import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const workspace = fileURLToPath(new URL('../../', import.meta.url));
export const tools = [
  { id: 'judge', name: '自动评估', english: 'Judge Studio', description: '从一份数据集开始，让每条回答都有可追溯的评估。', detail: 'Excel 数据集 · 自定义评分规则 · 批量模型评审', icon: 'scan', color: 'orange', port: 3077, health: '/api/health', match: data => data.apiVersion === 2 && !!data.capabilities, components: [{ id: 'judge', cwd: '.', script: 'server.js', port: 3077, dependency: 'node_modules/exceljs' }] },
  { id: 'screenshots', name: '截图与视觉评估', english: 'Visual Review', description: '留住完整页面，用模型评审和人工标注发现细节。', detail: 'PC / 手机长截图 · 视觉评分 · 批次导出', icon: 'image', color: 'purple', port: 3210, health: '/api/status', match: data => typeof data.chrome === 'boolean' && !!data.capture, components: [{ id: 'screenshots', cwd: 'pc-screenshots', script: 'server.mjs', port: 3210, dependency: 'node_modules/sharp' }] },
  { id: 'lab', name: '生成式 UI 实验室', english: 'UI Playground', description: '探索回答的更多呈现方式，从模板到交互体验。', detail: '模板图鉴 · 交互演示 · 提示词实验', icon: 'sparkles', color: 'green', port: 8787, health: '/api/health', match: data => 'needCode' in data && 'search' in data, components: [{ id: 'lab', cwd: 'seed-demo', script: 'server.js', port: 8787 }] }
];
export const publicTool = ({ match, components, health, html, ...tool }) => ({ ...tool, url: `http://127.0.0.1:${tool.port}/` });
export const resolveWorkspace = (...parts) => join(workspace, ...parts);
