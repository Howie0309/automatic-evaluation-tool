import { deriveOutputColumns, outputCellValue } from './result-export.js';
import { buildScoreMetrics, numericValue, paginate, valueAtPath } from './report-metrics.js';
import { apiFetch, downloadApi } from './cloud-runtime.js';

const $ = selector => document.querySelector(selector);
const state = {
  record: null,
  outputColumns: [],
  visibleFields: new Set(),
  scoreMetrics: null,
  query: '',
  status: 'all',
  sort: 'row-asc',
  page: 1,
  pageSize: 10
};

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = String(text);
  return node;
}

function append(parent, ...children) {
  parent.append(...children.filter(Boolean));
  return parent;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false });
}

function statusInfo(status) {
  return ({
    success: ['成功', 'success'],
    error: ['接口错误', 'error'],
    cancelled: ['已中断', 'cancelled']
  })[status] || [status || '未知', 'unknown'];
}

function reportToast(message, error = false) {
  const toast = $('#reportToast');
  toast.textContent = message;
  toast.className = `report-toast show${error ? ' error' : ''}`;
  clearTimeout(reportToast.timer);
  reportToast.timer = setTimeout(() => { toast.className = 'report-toast'; }, 2200);
}

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(String(value ?? ''));
    reportToast(`${label}已复制`);
  } catch {
    reportToast('复制失败，请手动选择内容', true);
  }
}

function actionLink(label, href, primary = false) {
  const link = element('a', primary ? 'action-link primary' : 'action-link', label);
  if (href.startsWith('/api/')) {
    link.href = '#';
    link.dataset.apiDownload = href;
  } else {
    link.href = href;
  }
  return link;
}

function renderHeader() {
  const record = state.record;
  const range = record.range ? `第 ${record.range.start}–${record.range.end} 条` : '数据范围未知';
  $('#reportTitle').textContent = record.fileName || '评估报告';
  $('#reportMeta').textContent = `${formatDate(record.createdAt)} · ${record.config?.model || '未知模型'} · ${range}`;
  document.title = `${record.fileName || '评估报告'} · Judge Studio`;
  if (globalThis.__REPORT_DATA__) {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json;charset=utf-8' });
    const jsonLink = actionLink('下载 JSON', URL.createObjectURL(blob), true);
    jsonLink.download = `${String(record.fileName || '评估报告').replace(/\.xlsx$/i, '')}.json`;
    append($('#reportActions'), jsonLink);
    $('.back-link').classList.add('hidden');
  } else {
    append($('#reportActions'),
      actionLink('下载 Excel', `/api/runs/${encodeURIComponent(record.id)}/download?format=xlsx`, true),
      actionLink('下载 CSV', `/api/runs/${encodeURIComponent(record.id)}/download?format=csv`),
      actionLink('下载 JSON', `/api/runs/${encodeURIComponent(record.id)}/download?format=json`)
    );
  }
}

function metric(label, value, note) {
  const card = element('article', 'metric-card');
  append(card, element('span', '', label), element('strong', '', value), element('small', '', note));
  return card;
}

function renderMetrics() {
  const results = state.record.results || [];
  const success = results.filter(item => item.status === 'success').length;
  const errors = results.filter(item => item.status === 'error').length;
  const cancelled = results.filter(item => item.status === 'cancelled').length;
  const elapsed = results.filter(item => item.status !== 'cancelled').map(item => Number(item.elapsed) || 0);
  const average = elapsed.length ? `${(elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length / 1000).toFixed(1)}s` : '—';
  const score = state.scoreMetrics;
  const metrics = score.fields.length ? [
    metric('结果总数', results.length, '已保存记录'),
    metric('评估成功率', results.length ? `${(success / results.length * 100).toFixed(1)}%` : '—', `成功 ${success}/${results.length} 条`),
    metric('评分维度', score.fields.length, '来自模型实际输出'),
    metric('错误 / 中断', `${errors} / ${cancelled}`, `平均耗时 ${average}`)
  ] : [
    metric('结果总数', results.length, '已保存记录'),
    metric('成功', success, results.length ? `占 ${Math.round(success / results.length * 100)}%` : '—'),
    metric('错误 / 中断', `${errors} / ${cancelled}`, '可按状态筛选'),
    metric('平均耗时', average, '不含中断任务')
  ];
  $('#metricGrid').replaceChildren(...metrics);
}

function cleanScoreLabel(field) {
  return String(field.label || field.key)
    .replace(/(^|[.·\s])(score|scores?|分数|评分)(?=$|[.·\s])/ig, '$1')
    .replace(/^[.·\s]+|[.·\s]+$/g, '') || field.label || field.key;
}

function renderScoreChart() {
  const section = $('#scoreSection');
  const chart = $('#scoreChart');
  const fields = state.scoreMetrics.fields;
  section.classList.toggle('hidden', !fields.length);
  if (!fields.length) return;
  $('#scoreDescription').textContent = `共识别 ${fields.length} 个数值评分字段 · 不额外推断满分或合格线`;
  chart.replaceChildren(...fields.map(field => {
    const row = element('article', 'score-row');
    const heading = element('div', 'score-row-heading');
    append(heading,
      element('strong', '', cleanScoreLabel(field)),
      element('span', '', field.average.toFixed(2))
    );
    const track = element('div', 'score-track');
    const fill = element('i');
    fill.style.width = `${Math.max(0, Math.min(100, field.average / state.scoreMetrics.chartMaximum * 100))}%`;
    track.append(fill);
    append(row, heading, track, element('small', '', `样本 ${field.count} · 最低 ${field.minimum} · 最高 ${field.maximum}`));
    return row;
  }));
}

function renderFieldFilters() {
  const container = $('#fieldFilters');
  container.replaceChildren();
  for (const column of state.outputColumns) {
    const button = element('button', 'field-chip active', column.label);
    button.type = 'button';
    button.dataset.field = column.key;
    button.addEventListener('click', () => {
      if (state.visibleFields.has(column.key)) state.visibleFields.delete(column.key);
      else state.visibleFields.add(column.key);
      button.classList.toggle('active', state.visibleFields.has(column.key));
      updateToggleFieldsLabel();
      renderResults();
    });
    container.append(button);
  }
  updateToggleFieldsLabel();
}

function updateToggleFieldsLabel() {
  $('#toggleFields').textContent = state.visibleFields.size ? '全部隐藏' : '全部显示';
}

function outputValueNode(item, column) {
  const rawValue = column.key === '__raw__' ? null : valueAtPath(item.output, column.key);
  const formatted = outputCellValue(item.output, column.key, item.displayOutput);
  if (Array.isArray(rawValue)) {
    const details = element('details', 'array-value');
    const summary = element('summary', '', `${rawValue.length} 项 · 点击展开`);
    const list = element('div', 'array-items');
    rawValue.forEach((entry, index) => {
      const article = element('article');
      append(article, element('strong', '', `#${index + 1}`), element('pre', '', typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2)));
      list.append(article);
    });
    if (!rawValue.length) list.append(element('p', 'empty-value', '空数组 []'));
    return append(details, summary, list);
  }
  return element('pre', formatted ? '' : 'empty-value', formatted || '—');
}

function textSection(title, value, copyLabel) {
  const section = element('section', 'text-section');
  const heading = element('div', 'section-heading');
  const button = element('button', 'copy-action', '复制');
  button.type = 'button';
  button.addEventListener('click', event => {
    event.preventDefault();
    copyText(value, copyLabel);
  });
  append(heading, element('h3', '', title), button);
  append(section, heading, element('pre', '', value || '—'));
  return section;
}

function renderSources(item) {
  if (!item.webSearch?.used && !(item.webSearch?.sources || []).length) return null;
  const section = element('section', 'source-section');
  section.append(element('h3', '', '联网搜索来源'));
  const list = element('ol');
  for (const source of item.webSearch?.sources || []) {
    const row = element('li');
    try {
      const url = new URL(source.url);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      const link = element('a', '', source.title || source.url);
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row.append(link, element('small', '', source.url));
      list.append(row);
    } catch {}
  }
  section.append(list.childElementCount ? list : element('p', 'empty-value', '接口未返回可展示的来源'));
  return section;
}

function resultCard(item) {
  const card = element('details', 'result-card');
  const summary = element('summary');
  const number = element('span', 'row-number', `#${item.rowNumber ?? '—'}`);
  const main = element('div', 'summary-main');
  append(main, element('strong', '', item.query || '（问题为空）'), element('span', '', String(item.answer || '').replace(/\s+/g, ' ').slice(0, 180) || '（回答为空）'));
  const [statusLabel, statusClass] = statusInfo(item.status);
  const status = element('span', `status ${statusClass}`, statusLabel);
  const badges = element('div', 'score-badges');
  for (const field of state.scoreMetrics.fields.slice(0, 8)) {
    const value = numericValue(valueAtPath(item.output, field.key));
    if (value != null) badges.append(element('span', '', `${cleanScoreLabel(field)} ${value}`));
  }
  if (state.scoreMetrics.fields.length > 8) badges.append(element('span', 'more', `+${state.scoreMetrics.fields.length - 8}`));
  append(summary, number, main, badges, status);

  const body = element('div', 'result-body');
  const inputGrid = element('div', 'input-grid');
  append(inputGrid, textSection('问题', item.query, '问题'), textSection('回答', item.answer, '回答'));
  body.append(inputGrid);

  const outputHeading = element('div', 'output-heading');
  const copyOutput = element('button', 'copy-action', '复制完整结论');
  copyOutput.type = 'button';
  copyOutput.addEventListener('click', event => {
    event.preventDefault();
    copyText(typeof item.output === 'string' ? item.output : item.output == null ? item.displayOutput : JSON.stringify(item.output, null, 2), '评估结论');
  });
  append(outputHeading, element('h3', '', '评估结论'), copyOutput);
  body.append(outputHeading);

  const outputGrid = element('div', 'output-grid');
  for (const column of state.outputColumns.filter(column => state.visibleFields.has(column.key))) {
    const formatted = outputCellValue(item.output, column.key, item.displayOutput);
    if (!formatted && column.key === '__raw__') continue;
    const field = element('section', 'output-field');
    append(field, element('h4', '', column.label), outputValueNode(item, column));
    outputGrid.append(field);
  }
  if (!outputGrid.childElementCount) outputGrid.append(element('p', 'empty-value', '当前没有选中可展示的结论字段。'));
  body.append(outputGrid);
  const sources = renderSources(item);
  if (sources) body.append(sources);

  const original = element('details', 'original-data');
  append(original, element('summary', '', `原始 Excel 字段 · ${Object.keys(item.sourceRow || {}).length} 个`), element('pre', '', JSON.stringify(item.sourceRow || {}, null, 2)));
  body.append(original);
  append(card, summary, body);
  return card;
}

function filteredResults() {
  const keyword = state.query.toLowerCase();
  const results = (state.record.results || []).filter(item => {
    if (state.status !== 'all' && item.status !== state.status) return false;
    if (!keyword) return true;
    return JSON.stringify({ query: item.query, answer: item.answer, output: item.output, webSearch: item.webSearch }).toLowerCase().includes(keyword);
  });
  return results.sort((a, b) => {
    if (state.sort === 'row-desc') return Number(b.rowNumber || 0) - Number(a.rowNumber || 0);
    if (state.sort === 'slow-first') return Number(b.elapsed || 0) - Number(a.elapsed || 0);
    return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
  });
}

function renderResults() {
  const list = $('#reportList');
  const results = filteredResults();
  const page = paginate(results, state.page, state.pageSize);
  state.page = page.page;
  list.replaceChildren(...page.items.map(resultCard));
  const range = page.total ? `${page.start + 1}–${page.start + page.items.length}` : '0';
  $('#visibleCount').textContent = `显示 ${range} · 共 ${page.total} 条结果`;
  $('#pageStatus').textContent = `第 ${page.page}/${page.totalPages} 页 · 共 ${page.total} 条`;
  $('#previousPage').disabled = page.page <= 1;
  $('#nextPage').disabled = page.page >= page.totalPages;
  $('#emptyReport').classList.toggle('hidden', results.length > 0);
}

function bindControls() {
  $('#reportActions').addEventListener('click', event => {
    const link = event.target.closest('[data-api-download]');
    if (!link) return;
    event.preventDefault();
    const extension = new URLSearchParams(link.dataset.apiDownload.split('?')[1] || '').get('format') || 'json';
    downloadApi(link.dataset.apiDownload, `evaluation-${state.record.id}.${extension}`).catch(error => reportToast(error.message, true));
  });
  $('#reportSearch').addEventListener('input', event => { state.query = event.target.value.trim(); state.page = 1; renderResults(); });
  $('#statusFilter').addEventListener('change', event => { state.status = event.target.value; state.page = 1; renderResults(); });
  $('#sortOrder').addEventListener('change', event => { state.sort = event.target.value; state.page = 1; renderResults(); });
  $('#previousPage').addEventListener('click', () => { state.page -= 1; renderResults(); scrollToResults(); });
  $('#nextPage').addEventListener('click', () => { state.page += 1; renderResults(); scrollToResults(); });
  $('#expandAll').addEventListener('click', () => document.querySelectorAll('.result-card').forEach(card => { card.open = true; }));
  $('#collapseAll').addEventListener('click', () => document.querySelectorAll('.result-card').forEach(card => { card.open = false; }));
  $('#toggleFields').addEventListener('click', () => {
    if (state.visibleFields.size) state.visibleFields.clear();
    else state.outputColumns.forEach(column => state.visibleFields.add(column.key));
    document.querySelectorAll('.field-chip').forEach(button => button.classList.toggle('active', state.visibleFields.has(button.dataset.field)));
    updateToggleFieldsLabel();
    renderResults();
  });
}

function scrollToResults() {
  document.querySelector('.control-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadReport() {
  let record = globalThis.__REPORT_DATA__;
  if (!record) {
    const runId = new URLSearchParams(location.search).get('run') || '';
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new Error('报告地址缺少有效的评估记录 ID');
    const response = await apiFetch(`/api/runs/${encodeURIComponent(runId)}/download?format=json`);
    record = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(record.error || '评估报告读取失败');
  }
  state.record = record;
  state.outputColumns = deriveOutputColumns(record.results || [], record.outputColumns || []);
  state.visibleFields = new Set(state.outputColumns.map(column => column.key));
  state.scoreMetrics = buildScoreMetrics(record.results || [], state.outputColumns);
  renderHeader();
  renderMetrics();
  renderScoreChart();
  renderFieldFilters();
  renderResults();
}

bindControls();
loadReport().catch(error => {
  $('#reportTitle').textContent = '报告加载失败';
  $('#reportMeta').textContent = error.message;
  $('#emptyReport').classList.remove('hidden');
  $('#emptyReport strong').textContent = '无法打开这份评估报告';
  $('#emptyReport p').textContent = '请返回工作台确认记录仍然存在。';
});
