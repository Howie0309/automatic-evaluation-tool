const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  tasks: '<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M9 4V2h7v2M9 10l1 1 2-2m2 1h3M9 16l1 1 2-2m2 1h3"/>',
  report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  scan: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M7 8h10M7 12h6m-6 4h10"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v5m-2.5-2.5h5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 6"/>',
  settings: '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 3-3-2-2 1-3-3-2-1-3Z"/><circle cx="11" cy="11" r="3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  computer: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5M8 21h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.folder}</svg>`;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const labels = { online: '已就绪', offline: '未启动', starting: '启动中', occupied: '需检查', completed: '已完成', stopped: '已中断', pending: '待执行', attention: '需关注', running: '进行中' };
const state = { tools: [], projects: [], records: [], warnings: [], ready: false, disconnected: false, route: '', search: '', filter: 'all', linking: null };
let toastTimer, refreshing = false;
const frames = new Map();
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => $('#toast').hidden = true, 4500); }
async function api(path, method = 'GET', body) {
  const response = await fetch(`/api${path}`, { method, headers: body === undefined ? {} : { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '请求失败');
  return value;
}
function hydrateIcons() { document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); node.removeAttribute('data-icon'); }); }
const toolById = id => state.tools.find(tool => tool.id === id);
const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '时间未知' : d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }); };
const dateTime = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '时间未知' : d.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
const badge = status => `<span class="tag ${esc(status)}">${labels[status] || esc(status)}</span>`;
const serviceStatus = tool => `<span class="status ${esc(tool.status)}">${labels[tool.status]}</span>`;
const footer = () => '<footer class="footer"><span>EVAL SPACE · 让每一次评估，都有据可依。</span><span>个人工作空间 / LOCAL</span></footer>';
function heading(title, description, action = '') { return `<div class="page-heading"><div><h1>${title}</h1><p class="subtitle">${description}</p></div>${action}</div>`; }
const newProjectButton = `<button class="button primary" data-action="new-project">${icon('plus')}新建项目</button>`;
function empty(title, description, action = '', name = 'folder') { return `<div class="empty">${icon(name)}<strong>${title}</strong>${description}<div>${action}</div></div>`; }
function updateNav() {
  $('#tool-count').textContent = String(state.tools.length).padStart(2, '0');
  $('#nav-main').innerHTML = [['home', 'home', '概览'], ['projects', 'folder', '项目空间'], ['tasks', 'tasks', '任务中心'], ['reports', 'report', '报告中心']].map(([id, image, name]) => `<a class="nav-item ${state.route.split('/')[0] === id ? 'active' : ''}" href="#${id}" aria-label="${name}">${icon(image)}<span class="nav-text">${name}</span>${id === 'projects' && state.projects.length ? `<span class="nav-count">${state.projects.filter(p => p.status === 'active').length}</span>` : ''}</a>`).join('');
  $('#nav-tools').innerHTML = state.tools.map(tool => `<a class="nav-item ${state.route === `tool/${tool.id}` ? 'active' : ''}" href="#tool/${tool.id}" title="${esc(tool.name)}">${icon(tool.icon)}<span class="nav-text">${esc(tool.name)}</span></a>`).join('');
  $('[data-nav="settings"]').classList.toggle('active', state.route === 'settings');
}
function toolCards() { return `<div class="tool-grid">${state.tools.map(tool => `<article class="tool-card"><div class="tool-card-head"><div class="tool-icon ${tool.color}">${icon(tool.icon)}</div>${serviceStatus(tool)}</div><h3>${esc(tool.name)}</h3><div class="english">${esc(tool.english)}</div><p>${esc(tool.description)}</p><div class="tool-card-footer"><span>本地运行</span><a href="#tool/${tool.id}">进入工具 ${icon('arrow')}</a></div></article>`).join('')}</div>`; }
function recordTable(records, { compact = false, unlink = false } = {}) {
  if (!records.length) return empty('还没有评估记录', '从工具开始一次评估，保存后的记录会出现在这里。', '<a class="button" href="#tool/judge">开始自动评估</a>', 'report');
  return `<div class="table-wrap"><table><thead><tr><th>记录名称</th>${!compact ? '<th>来源</th>' : ''}<th>状态</th><th>数据量</th><th>时间</th><th></th></tr></thead><tbody>${records.map(record => {
    const tool = toolById(record.tool);
    return `<tr><td><div class="record-cell"><span class="record-icon ${tool?.color || 'blue'}">${icon(tool?.icon || 'report')}</span><div><span class="record-name" title="${esc(record.name)}">${esc(record.name)}</span><span class="record-sub">${esc(record.model || tool?.english || '')}</span></div></div></td>${!compact ? `<td>${esc(tool?.name)}</td>` : ''}<td>${badge(record.status)}</td><td>${record.done} <span class="record-sub">/ ${record.total}</span></td><td title="${esc(record.createdAt)}">${date(record.createdAt)}</td><td><button class="text-link" data-record="${esc(record.key)}">${record.tool === 'judge' ? '报告' : '批次'} ${icon('arrow')}</button>${unlink ? `<button class="text-link" data-unlink="${esc(record.key)}" style="margin-top:8px;display:block">移出项目</button>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function home() {
  const active = state.projects.filter(p => p.status === 'active');
  const completed = state.records.filter(r => r.status === 'completed').length;
  return heading('每一次探索，都更进一步。', '你的评估、采集与研究，都在一个工作空间里。', newProjectButton) +
  `<section class="hero"><div><span class="eyebrow">A BETTER WAY TO EVALUATE</span><h2>从一个问题，走向有依据的判断。</h2><p>连接采集、评估与复核，留住每一次探索的过程。<br>选一个工具开始，或用项目把研究整理在一起。</p></div><div class="hero-art" aria-hidden="true"><div class="art-card back"></div><div class="art-card front"><div class="art-line"></div><div class="art-line"></div><div class="art-bars"><i></i><i></i><i></i><i></i></div></div><div class="art-badge">${icon('check')}</div></div></section>` +
  `<section class="stats" aria-label="工作空间统计">${[
    ['活跃项目', active.length, '个', '持续整理你的研究方向', 'folder'],
    ['评估与采集记录', state.records.length, '份', '来自自动评估和截图批次', 'tasks'],
    ['已完成记录', completed, '份', '随时回顾，随时复核', 'report'],
    ['可用工具', state.tools.filter(t => t.status === 'online').length, `/ ${state.tools.length}`, '进入工具时可自动启动', 'layers']
  ].map(([name, value, unit, note, image]) => `<div class="stat"><div class="stat-top">${name}${icon(image)}</div><div class="stat-number">${value}<small>${unit}</small></div><div class="stat-note">${note}</div></div>`).join('')}</section>` +
  `<section><div class="section-title"><h2>开始你的工作<span>${state.tools.length} 个工具，一个入口</span></h2><a class="text-link" href="#settings">环境管理 ${icon('arrow')}</a></div>${toolCards()}</section>` +
  `<section class="home-bottom"><div class="panel"><div class="panel-title"><h2>最近记录</h2><a class="text-link" href="#reports">查看全部 ${icon('arrow')}</a></div>${recordTable(state.records.slice(0, 4), { compact: true })}</div><div class="panel"><div class="panel-title"><h2>一条完整的评估路径</h2>${icon('sparkles')}</div><div class="workflow">${[['准备问题与规则', '在项目里明确目标，选择合适的评估工具。'], ['采集与评估', '采集产品回答，执行模型评审或截图评估。'], ['复核与沉淀', '查看报告，将相关记录关联到同一个项目。']].map(([name, text], index) => `<div class="workflow-step"><span class="step-number">0${index + 1}</span><div><h3>${name}</h3><p>${text}</p></div></div>`).join('')}</div></div></section>` + footer();
}
function projectsPage() {
  const projects = state.projects.filter(p => (state.filter === 'all' || p.status === state.filter) && `${p.name} ${p.description}`.toLowerCase().includes(state.search.toLowerCase()));
  return heading('项目空间', '让分散的记录，成为可以持续追踪的研究。', newProjectButton) + filters('搜索项目…', [['all', '全部项目'], ['active', '进行中'], ['archived', '已归档']]) +
  (projects.length ? `<div class="projects-grid">${projects.map(project => `<a class="project-card" href="#projects/${project.id}"><div class="project-card-top"><span class="tool-icon orange">${icon('folder')}</span><span class="tag ${project.status === 'active' ? 'running' : 'pending'}">${project.status === 'active' ? '进行中' : '已归档'}</span></div><h3>${esc(project.name)}</h3><p>${esc(project.description || '还没有填写说明，先开始一次探索。')}</p><footer><span>${project.records.length} 份关联记录</span><span>${date(project.updatedAt)} 更新 ${icon('arrow')}</span></footer></a>`).join('')}</div>` : `<div class="panel">${empty('留一个空间，给你的下一次研究', '创建项目后，可以把不同工具的已有记录关联在一起。', newProjectButton)}</div>`) + footer();
}
function projectPage(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return empty('项目不存在', '返回项目空间，选择一个已有项目。', '<a class="button" href="#projects">返回项目空间</a>');
  const records = state.records.filter(r => project.records.includes(r.key));
  return `<a class="text-link back" href="#projects">${icon('back')} 返回项目空间</a>` + heading(esc(project.name), `创建于 ${date(project.createdAt)} · ${project.status === 'active' ? '进行中' : '已归档'}`, `<button class="button" data-action="archive" data-id="${id}">${project.status === 'active' ? '归档项目' : '恢复项目'}</button>`) +
  `<div class="project-banner"><span class="eyebrow">PROJECT BRIEF</span><p>${esc(project.description || '这个项目还没有填写说明。')}</p><div class="project-actions"><button class="button primary" data-action="link-records" data-id="${id}">${icon('link')}关联已有记录</button><a class="button" href="#tool/judge">${icon('scan')}自动评估</a><a class="button" href="#tool/screenshots">${icon('image')}截图评估</a></div></div>` +
  (project.records.length > records.length ? '<div class="notice">部分关联记录在原工具中已被移除或暂时无法读取。</div>' : '') +
  `<div class="panel"><div class="panel-title"><h2>项目记录 <span class="muted">${records.length} 份</span></h2><span class="muted">评估完成后，可在这里关联记录</span></div>${recordTable(records, { unlink: true })}</div>` + footer();
}
function filters(placeholder, options) { return `<div class="toolbar"><div class="search">${icon('search')}<input id="search" type="search" placeholder="${placeholder}" value="${esc(state.search)}" aria-label="${placeholder}"></div><select id="filter" aria-label="筛选记录">${options.map(([id, name]) => `<option value="${id}" ${state.filter === id ? 'selected' : ''}>${name}</option>`).join('')}</select><span class="muted">${state.ready ? '' : '正在读取本地记录…'}</span></div>`; }
function reportsPage() {
  const records = state.records.filter(r => (state.filter === 'all' || r.tool === state.filter) && `${r.name} ${r.model || ''}`.toLowerCase().includes(state.search.toLowerCase()));
  return heading('报告中心', '汇集自动评估记录与截图批次，回看每一次判断的依据。', `<a class="button primary" href="#tool/judge">${icon('plus')}开始评估</a>`) + filters('搜索记录或模型名称…', [['all', '全部来源'], ['judge', '自动评估'], ['screenshots', '截图评估']]) + (state.warnings.length ? `<div class="notice">有 ${state.warnings.length} 条本地记录未能读取，其余记录正常显示。</div>` : '') + `<div class="panel">${recordTable(records)}</div>` + footer();
}
function tasksPage() {
  const records = state.records.filter(r => (state.filter === 'all' || r.status === state.filter) && r.name.toLowerCase().includes(state.search.toLowerCase()));
  return heading('任务中心', '查看截图批次的持久化进度，以及自动评估已保存的执行结果。', `<a class="button" href="#tool/screenshots">${icon('image')}打开截图工具</a>`) + '<div class="notice task-note">暂停、继续与人工验证请在对应工具中操作。自动评估进行中的状态保留在工具页面内，保存后会汇入此处；截图进度来自本地批次记录，服务离线时可能是上次保存的状态。</div>' + filters('搜索任务名称…', [['all', '全部状态'], ['running', '进行中'], ['pending', '待执行'], ['completed', '已完成'], ['attention', '需关注'], ['stopped', '已中断']]) + `<div class="panel">${recordTable(records)}</div>` + footer();
}
function settingsPage() {
  return heading('设置与环境', '在这里检查本地服务，管理工具启动与运行日志。', '<button class="button primary" data-action="start-all">'+ icon('computer') +'启动全部工具</button>') +
  `<section class="settings-section"><h2>工具服务</h2><p>进入工具时会自动启动。已有的服务会直接复用；工作台退出时，只结束由它启动的服务。</p>${state.tools.map(tool => `<div class="service-row"><span class="tool-icon ${tool.color}">${icon(tool.icon)}</span><div class="service-info"><h3>${esc(tool.name)} ${serviceStatus(tool)}</h3><p>${esc(tool.url)} · ${tool.managed ? '由工作台启动' : tool.status === 'online' ? '复用已有服务' : '尚未由工作台启动'}</p>${tool.components.length ? `<p class="components">${tool.components.map(c => `<span title="${esc(c.note)}">${esc(c.id)} ${c.status !== 'online' ? '未就绪' : c.session === 'needs_login' ? '待登录' : c.session === 'ready' ? '✓' : esc(c.session || '✓')}</span>`).join('')}</p>` : ''}${tool.error ? `<p class="service-error">${esc(tool.error)}</p>` : ''}</div><button class="button small" data-action="logs" data-id="${tool.id}">日志</button><button class="button small" data-start="${tool.id}" ${tool.status === 'starting' ? 'disabled' : ''}>${tool.status === 'online' ? '检测 / 补齐服务' : '启动服务'}</button><a class="button small" href="#tool/${tool.id}">进入 ${icon('arrow')}</a></div>`).join('')}</section>` +
  '<section class="settings-section"><h2>模型与浏览器配置</h2><p>各工具已有的模型配置和登录状态继续保留。点击下方入口，在对应工具中完成设置；首次登录或验证码仍需要手动处理。</p><div class="project-actions"><a class="button" href="#tool/judge">自动评估 · 模型与规则</a><a class="button" href="#tool/screenshots">截图工具 · 浏览器与模型</a><a class="button" href="#tool/lab">实验室 · 模型与搜索</a></div></section>' +
  '<section class="settings-section"><h2>本地环境</h2><dl class="environment" id="environment"><dt>正在检查</dt><dd>读取本机环境信息…</dd></dl></section>' + footer();
}
function loadingTool(tool, report = false) {
  return `<div class="tool-loading" data-loading="${tool.id}"><span class="tool-icon ${tool.color}">${icon(tool.icon)}</span><h2>${esc(tool.name)}</h2><p>${tool.error ? esc(tool.error) : tool.status === 'occupied' ? `端口 ${tool.port} 已占用或服务未响应，请在设置中检查运行日志。` : tool.status === 'starting' ? '正在准备本地服务，准备完成后会自动打开。' : '启动本地服务后，即可在这个工作区继续操作。'}</p><button class="button primary" data-start="${tool.id}" ${tool.status === 'starting' ? 'disabled' : ''}>${tool.status === 'starting' ? '正在启动…' : '启动 / 重试'}</button><a class="text-link" href="#settings" style="margin-top:18px">查看设置与日志 ${icon('arrow')}</a></div>`;
}
function renderTool() {
  const [kind, id] = state.route.split('/');
  const record = kind === 'report' ? state.records.find(r => r.key === decodeURIComponent(id || '')) : null;
  const tool = toolById(record?.tool || id);
  if (!tool) { $('#tool-workspace').hidden = true; $('#main').hidden = false; $('#main').innerHTML = empty('没有找到这个工具或报告', '可以从概览重新打开。', '<a class="button" href="#home">返回概览</a>'); return; }
  $('#main').hidden = true; $('#tool-workspace').hidden = false;
  const url = record?.url || tool.url;
  const frameKey = record ? record.key : tool.id;
  $('#tool-toolbar').innerHTML = `<div class="tool-top"><span class="tool-title">${esc(record?.name || tool.name)}</span>${serviceStatus(tool)}<small>${record ? '独立评估报告' : '切换导航后，此页面会继续保留'}</small><div class="tool-actions"><button class="text-link" data-action="reload-frame" data-id="${esc(frameKey)}">${icon('refresh')}重新载入</button><a class="text-link" href="${esc(url)}" target="_blank" rel="noopener">独立窗口 ${icon('external')}</a></div></div>`;
  // Polling also calls this renderer. Never hide the active frame temporarily:
  // Chromium can reset an iframe's scroll/focus when display:none is toggled.
  for (const [key, frame] of frames) {
    if (key !== frameKey && !frame.hidden) frame.hidden = true;
  }
  $('#tool-frames').querySelectorAll('.tool-loading').forEach(node => node.remove());
  if (frames.has(frameKey) || tool.status === 'online') {
    if (!frames.has(frameKey)) {
      const frame = document.createElement('iframe'); frame.src = url; frame.title = record?.name || tool.name; frame.allow = 'clipboard-write'; frame.dataset.tool = tool.id;
      $('#tool-frames').append(frame); frames.set(frameKey, frame);
    }
    const activeFrame = frames.get(frameKey);
    if (activeFrame.hidden) activeFrame.hidden = false;
  } else { $('#tool-frames').insertAdjacentHTML('beforeend', loadingTool(tool)); }
}
function render() {
  updateNav();
  if (state.route.startsWith('tool/') || state.route.startsWith('report/')) { renderTool(); return; }
  for (const frame of frames.values()) frame.hidden = true;
  $('#tool-workspace').hidden = true; $('#main').hidden = false;
  const [page, id] = state.route.split('/');
  const content = page === 'projects' ? id ? projectPage(id) : projectsPage() : page === 'reports' ? reportsPage() : page === 'tasks' ? tasksPage() : page === 'settings' ? settingsPage() : home();
  const focused = document.activeElement?.id;
  const selection = focused === 'search' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  $('#main').innerHTML = (state.disconnected ? '<div class="notice error">工作台连接已断开，请确认本地服务仍在运行，然后点击右上角刷新。</div>' : '') + content;
  if (focused === 'search' && $('#search')) { $('#search').focus(); if (selection) $('#search').setSelectionRange(...selection); }
  if (page === 'settings') loadEnvironment();
}
async function loadEnvironment() {
  try {
    const env = await api('/environment');
    const element = $('#environment');
    if (element) element.innerHTML = [['运行模式', '个人版 · 纯本地'], ['Node.js', env.node], ['系统 / 架构', `${env.platform} / ${env.architecture}`], ['工作目录', env.workspace], ['项目与日志', env.dataDirectory]].map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`).join('');
  } catch (error) { if ($('#environment')) $('#environment').textContent = error.message; }
}
async function refresh({ silent = false } = {}) {
  if (refreshing) return;
  refreshing = true; $('#refresh').classList.add('spinning');
  try {
    const value = await api('/overview'); Object.assign(state, value, { ready: true, disconnected: false });
    for (const [key, frame] of frames) {
      if (!toolById(frame.dataset.tool)) { frame.remove(); frames.delete(key); }
    }
    if (!document.querySelector('dialog[open]') && (document.activeElement?.id !== 'search' || !silent)) render();
  } catch (error) { state.disconnected = true; if (!silent) toast('读取失败：' + error.message); render(); }
  finally { refreshing = false; $('#refresh').classList.remove('spinning'); }
}
async function startTool(id) {
  await api(`/tools/${id}/start`, 'POST', {});
  const tool = toolById(id); if (tool) { tool.status = 'starting'; tool.error = null; }
  render();
}
async function route() {
  const next = location.hash.slice(1) || 'home';
  const changed = state.route !== next;
  if (changed) { state.search = ''; state.filter = 'all'; }
  state.route = next; render();
  if (changed && next.startsWith('tool/')) {
    const tool = toolById(next.split('/')[1]);
    if (tool && tool.status !== 'online' && tool.status !== 'starting' && !tool.error) {
      try { await startTool(tool.id); } catch (error) { toast(error.message); }
    }
  }
  if (changed && next.startsWith('report/')) {
    const record = state.records.find(r => r.key === decodeURIComponent(next.split('/')[1] || ''));
    const tool = record && toolById(record.tool);
    if (tool && tool.status === 'offline') { try { await startTool(tool.id); } catch (error) { toast(error.message); } }
  }
}
async function openLinks(id) {
  const project = state.projects.find(p => p.id === id); if (!project) return;
  state.linking = id;
  $('#link-records').innerHTML = state.records.length ? state.records.map(record => `<label class="link-option"><input type="checkbox" value="${esc(record.key)}" ${project.records.includes(record.key) ? 'checked' : ''}><span>${esc(record.name)}<small>${esc(toolById(record.tool)?.name)} · ${dateTime(record.createdAt)}</small></span></label>`).join('') : empty('暂无可关联的记录', '先到工具中完成并保存一次评估。');
  $('#link-dialog').showModal();
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.hasAttribute('data-close')) { button.closest('dialog').close(); render(); return; }
    if (button.dataset.start) { await startTool(button.dataset.start); return; }
    if (button.dataset.record) {
      const record = state.records.find(r => r.key === button.dataset.record);
      if (record.tool === 'judge') location.hash = `report/${encodeURIComponent(record.key)}`;
      else { location.hash = `tool/${record.tool}`; toast(`请在批次列表中选择「${record.name}」`); }
      return;
    }
    if (button.dataset.unlink) {
      const project = state.projects.find(p => p.id === state.route.split('/')[1]);
      if (project) { await api(`/projects/${project.id}`, 'PATCH', { records: project.records.filter(key => key !== button.dataset.unlink) }); await refresh(); toast('记录已移出项目'); }
      return;
    }
    const action = button.dataset.action;
    if (action === 'new-project') { $('#project-form').reset(); $('#project-dialog').showModal(); }
    if (action === 'link-records') await openLinks(button.dataset.id);
    if (action === 'archive') {
      const project = state.projects.find(p => p.id === button.dataset.id);
      await api(`/projects/${project.id}`, 'PATCH', { status: project.status === 'active' ? 'archived' : 'active' }); await refresh(); toast(project.status === 'active' ? '项目已归档' : '项目已恢复');
    }
    if (action === 'start-all') { await api('/start-all', 'POST', {}); toast('已开始准备全部工具，状态会自动更新'); await refresh(); }
    if (action === 'reload-frame') { const frame = frames.get(button.dataset.id); if (frame && confirm('重新载入可能清空工具中尚未保存的内容。是否继续？')) frame.src = frame.src; }
    if (action === 'logs') {
      button.disabled = true;
      const { logs } = await api(`/tools/${button.dataset.id}/logs`);
      $('#logs-content').innerHTML = logs.map(log => `<h3>${esc(log.name)}</h3><pre>${esc(log.text)}</pre>`).join(''); $('#logs-dialog').showModal();
    }
  } catch (error) { toast(error.message); }
  finally { if (button.isConnected && !button.dataset.start) button.disabled = false; }
});
$('#project-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const data = new FormData(event.target); const { project } = await api('/projects', 'POST', { name: data.get('name'), description: data.get('description') });
    $('#project-dialog').close(); await refresh(); location.hash = `projects/${project.id}`; toast('项目已创建');
  } catch (error) { toast(error.message); } finally { button.disabled = false; }
});
$('#save-links').addEventListener('click', async event => {
  event.target.disabled = true;
  try {
    const project = state.projects.find(p => p.id === state.linking);
    const missing = project.records.filter(key => !state.records.some(record => record.key === key));
    const records = [...$('#link-records').querySelectorAll('input:checked')].map(input => input.value);
    await api(`/projects/${state.linking}`, 'PATCH', { records: [...missing, ...records] });
    $('#link-dialog').close(); await refresh(); toast('项目记录已更新');
  } catch (error) { toast(error.message); } finally { event.target.disabled = false; }
});
document.addEventListener('input', event => { if (event.target.id === 'search') { state.search = event.target.value; render(); } });
document.addEventListener('change', event => { if (event.target.id === 'filter') { state.filter = event.target.value; render(); } });
$('#refresh').addEventListener('click', () => refresh());
window.addEventListener('hashchange', route);
window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); location.hash = 'reports'; setTimeout(() => $('#search')?.focus(), 50); } });
hydrateIcons();
state.route = location.hash.slice(1) || 'home';
$('#main').innerHTML = empty('正在打开你的工作空间', '读取本地工具与历史记录…', '', 'layers');
await refresh();
// Apply the initial route once data is available, including direct tool links.
state.route = ''; await route();
setInterval(() => { if (!document.hidden) refresh({ silent: true }); }, 6000);
