import { extractDeclaredFields } from './prompt-fields.js';
import { isRetryableError, retryDelay } from './retry.js';

const $ = selector => document.querySelector(selector);
const state = {
  workbook: null, sheet: null, rows: [], columns: [], results: [], fileName: '',
  running: false, paused: false, stopRequested: false,
  activeControllers: new Set(), pauseWaiters: new Set(), stopWaiters: new Set()
};

const providers = {
  deepseek: { endpoint: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  openai: { endpoint: 'https://api.openai.com/v1', models: ['gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-4.1-mini'] },
  siliconflow: { endpoint: 'https://api.siliconflow.cn/v1', models: ['deepseek-ai/DeepSeek-V3.2', 'Qwen/Qwen3-30B-A3B-Instruct-2507'] },
  custom: { endpoint: '', models: [] }
};

const persistedIds = ['systemPrompt', 'userPrompt', 'provider', 'model', 'endpoint', 'temperature', 'reasoningEffort', 'scorePath', 'concurrency', 'retryCount'];

const help = {
  temperature: { title: '温度是什么？', text: '温度控制输出的随机程度。0 更稳定、更聚焦；数值升高会让措辞和判断更发散。自动评估重视可重复性，建议使用 0。OpenAI 推理模型主要由思考强度控制，本工具不会向它们发送温度参数。' },
  reasoning: { title: '思考强度是什么？', text: '它控制模型在回答前投入多少推理。强度越高，通常质量上限更高，但延迟和推理 token 也会增加。不同模型支持的档位不同；不确定时选“自动”，自动评估建议先比较 low 与 medium。' }
};

function toast(message, isError = false) {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.className = 'toast', 2800);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function updateOutputVariables() {
  const fields = extractDeclaredFields($('#systemPrompt').value);
  $('#outputVariables').innerHTML = fields.length
    ? fields.map(field => `<code>${escapeHtml(field)}</code>`).join('')
    : '<code>自由文本 / 任意结构</code>';
}

function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('judge-studio-settings') || '{}'); } catch {}
  persistedIds.forEach(id => {
    const el = $(`#${id}`);
    if (id === 'reasoningEffort') return;
    if (saved[id] == null) return;
    if (el.type === 'checkbox') el.checked = saved[id]; else el.value = saved[id];
  });
  $('#apiKey').value = sessionStorage.getItem('judge-studio-api-key') || '';
  updateProvider(false);
  if (saved.reasoningEffort && [...$('#reasoningEffort').options].some(option => option.value === saved.reasoningEffort)) {
    $('#reasoningEffort').value = saved.reasoningEffort;
  }
  updateModelControls();
  saveSettings();
  $('#temperatureValue').value = $('#temperature').value;
  updateOutputVariables();
}

function saveSettings() {
  const settings = {};
  persistedIds.forEach(id => {
    const el = $(`#${id}`);
    settings[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  localStorage.setItem('judge-studio-settings', JSON.stringify(settings));
  sessionStorage.setItem('judge-studio-api-key', $('#apiKey').value);
}

function updateProvider(overwrite = true) {
  const config = providers[$('#provider').value];
  if (overwrite) {
    $('#endpoint').value = config.endpoint;
    $('#model').value = config.models[0] || '';
  }
  $('#modelSuggestions').innerHTML = config.models.map(model => `<option value="${escapeHtml(model)}"></option>`).join('');
  updateReasoningOptions();
  saveSettings();
}

function updateReasoningOptions() {
  const provider = $('#provider').value;
  const model = $('#model').value.trim();
  const previous = $('#reasoningEffort').value || 'auto';
  const labels = {
    auto: '自动（模型默认）', none: 'None · 不推理', minimal: 'Minimal · 极少',
    low: 'Low · 较少', medium: 'Medium · 均衡', high: 'High · 深入',
    xhigh: 'XHigh · 很深入', max: 'Max · 最大'
  };
  let efforts = ['auto', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  if (provider === 'openai') {
    if (/^gpt-5\.6/i.test(model)) efforts = ['auto', 'none', 'low', 'medium', 'high', 'xhigh', 'max'];
    else if (/^gpt-5\.[245]/i.test(model)) efforts = ['auto', 'none', 'low', 'medium', 'high', 'xhigh'];
    else if (/^gpt-5\.1/i.test(model)) efforts = ['auto', 'none', 'low', 'medium', 'high'];
    else if (/^gpt-5(?:-|$)/i.test(model)) efforts = ['auto', 'minimal', 'low', 'medium', 'high'];
    else if (!/^o[134]/i.test(model)) efforts = ['auto'];
  }
  const effortOptions = efforts.map(value => [value, labels[value]]);
  const toggleOptions = [['auto', '自动（跟随模型）'], ['off', '关闭思考'], ['on', '开启思考']];
  const options = ['deepseek', 'siliconflow'].includes(provider) ? toggleOptions : effortOptions;
  $('#reasoningEffort').innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  $('#reasoningEffort').value = options.some(([value]) => value === previous) ? previous : 'auto';
  updateModelControls();
}

function updateModelControls() {
  const provider = $('#provider').value;
  const isOpenAIReasoning = provider === 'openai' && /^(gpt-5|o[134])/i.test($('#model').value.trim());
  $('#temperature').disabled = isOpenAIReasoning;
  $('#temperatureHelp').textContent = isOpenAIReasoning
    ? '当前为 OpenAI 推理模型：使用“思考强度”，温度不会发送。'
    : '越低越稳定；自动评估建议设为 0。';
  $('#reasoningHelp').textContent = ['deepseek', 'siliconflow'].includes(provider)
    ? '该服务商使用开启/关闭思考，不提供统一强度档位。'
    : '档位支持情况取决于具体模型；不确定时选择“自动”。';
}

async function uploadFile(file) {
  if (!file || !/\.xlsx$/i.test(file.name)) return toast('请选择 .xlsx 文件', true);
  if (file.size > 20 * 1024 * 1024) return toast('文件不能超过 20 MB', true);
  $('#dropzone strong').textContent = '正在解析 Excel…';
  try {
    const response = await fetch('/api/excel', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(file.name) }, body: await file.arrayBuffer() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '解析失败');
    if (!payload.sheets?.some(sheet => sheet.rows.length)) throw new Error('Excel 中没有可读取的数据');
    state.workbook = payload.sheets;
    state.fileName = file.name;
    $('#sheetSelect').innerHTML = payload.sheets.map((sheet, index) => `<option value="${index}">${escapeHtml(sheet.name)} · ${sheet.rows.length} 行</option>`).join('');
    const firstWithData = payload.sheets.findIndex(sheet => sheet.rows.length);
    $('#sheetSelect').value = String(firstWithData);
    $('#fileName').textContent = file.name;
    $('#fileMeta').textContent = `${(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 0 : 1)} KB · ${payload.sheets.length} 个工作表`;
    $('#datasetCard').classList.remove('hidden');
    $('#dropzone').classList.add('hidden');
    selectSheet();
    toast('Excel 解析完成');
  } catch (error) {
    toast(error.message, true);
    $('#dropzone strong').textContent = '拖拽 Excel 到这里，或点击选择';
  }
}

function selectSheet() {
  state.sheet = state.workbook[Number($('#sheetSelect').value)];
  state.rows = state.sheet.rows;
  state.columns = state.sheet.columns;
  const options = state.columns.map(column => `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`).join('');
  $('#queryColumn').innerHTML = options;
  $('#answerColumn').innerHTML = options;
  $('#queryColumn').value = guessColumn(['query', 'question', '问题', '题目'], 0);
  $('#answerColumn').value = guessColumn(['answer', 'response', '回答', '答案'], Math.min(1, state.columns.length - 1));
  $('#rangeStart').value = 1;
  $('#rangeEnd').value = Math.max(1, state.rows.length);
  $('#rangeStart').max = Math.max(1, state.rows.length);
  $('#rangeEnd').max = Math.max(1, state.rows.length);
  updatePreview();
}

function guessColumn(candidates, fallback) {
  const found = state.columns.find(column => candidates.includes(column.toLowerCase()));
  return found || state.columns[fallback] || '';
}

function updatePreview() {
  const queryColumn = $('#queryColumn').value;
  const answerColumn = $('#answerColumn').value;
  const range = selectedRange();
  if (range.rows.length) {
    $('#rangeStart').value = range.start;
    $('#rangeEnd').value = range.end;
  }
  $('#rowCount').textContent = `${range.rows.length} / ${state.rows.length} 条数据`;
  $('#rangeSummary').textContent = range.rows.length
    ? `将评估 ${range.rows.length} 条数据（第 ${range.start}–${range.end} 条）`
    : '当前范围没有可评估数据';
  $('#extraVariables').innerHTML = state.columns.filter(column => ![queryColumn, answerColumn].includes(column)).slice(0, 5).map(column => `<code>{{${escapeHtml(column)}}}</code>`).join('');
  $('#dataPreview').innerHTML = `<thead><tr><th>#</th><th>${escapeHtml(queryColumn || '问题')}</th><th>${escapeHtml(answerColumn || '回答')}</th></tr></thead><tbody>${range.rows.slice(0, 8).map((row, index) => `<tr><td>${range.start + index}</td><td><div class="cell-clamp">${escapeHtml(row[queryColumn])}</div></td><td><div class="cell-clamp">${escapeHtml(row[answerColumn])}</div></td></tr>`).join('')}</tbody>`;
  $('#runButton').disabled = !range.rows.length || !queryColumn || !answerColumn || state.running;
  document.querySelectorAll('.step')[1].classList.add('active');
}

function selectedRange() {
  if (!state.rows.length) return { start: 0, end: 0, rows: [] };
  const total = state.rows.length;
  const start = Math.min(total, Math.max(1, Number.parseInt($('#rangeStart').value, 10) || 1));
  const end = Math.min(total, Math.max(start, Number.parseInt($('#rangeEnd').value, 10) || total));
  return { start, end, rows: state.rows.slice(start - 1, end) };
}

function applyRangePreset(preset) {
  const total = state.rows.length;
  if (!total) return;
  if (preset === 'first100') {
    $('#rangeStart').value = 1;
    $('#rangeEnd').value = Math.min(100, total);
  } else if (preset === 'last100') {
    $('#rangeStart').value = Math.max(1, total - 99);
    $('#rangeEnd').value = total;
  } else {
    $('#rangeStart').value = 1;
    $('#rangeEnd').value = total;
  }
  updatePreview();
}

function removeFile() {
  Object.assign(state, { workbook: null, sheet: null, rows: [], columns: [], results: [], fileName: '' });
  $('#fileInput').value = '';
  $('#datasetCard').classList.add('hidden');
  $('#dropzone').classList.remove('hidden');
  $('#dropzone strong').textContent = '拖拽 Excel 到这里，或点击选择';
  $('#runButton').disabled = true;
}

function settings() {
  const queryColumn = $('#queryColumn').value;
  const answerColumn = $('#answerColumn').value;
  return {
    apiKey: $('#apiKey').value.trim(), endpoint: $('#endpoint').value.trim(), model: $('#model').value.trim(),
    systemPrompt: $('#systemPrompt').value, userTemplate: $('#userPrompt').value,
    provider: $('#provider').value, temperature: $('#temperature').value,
    reasoningEffort: $('#reasoningEffort').value, scorePath: $('#scorePath').value.trim(),
    retryCount: Number($('#retryCount').value), queryColumn, answerColumn
  };
}

function valueAtPath(object, path) {
  if (!path || object == null || typeof object !== 'object') return undefined;
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function numericScore(output, path) {
  const value = valueAtPath(output, path);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function outputText(output) {
  if (output == null) return '';
  if (typeof output === 'string') return output;
  return JSON.stringify(output, null, 2);
}

function resultOutputColumns(results = state.results.filter(Boolean)) {
  const declared = extractDeclaredFields($('#systemPrompt').value);
  const actual = [];
  let needsRawColumn = false;
  for (const item of results) {
    if (item.status !== 'success') {
      needsRawColumn = true;
      continue;
    }
    const output = item.output;
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      for (const key of Object.keys(output)) if (!actual.includes(key)) actual.push(key);
    } else {
      needsRawColumn = true;
    }
  }
  const fields = [...declared, ...actual.filter(field => !declared.includes(field))];
  const columns = fields.map(field => ({ key: field, label: field }));
  if (needsRawColumn || !columns.length) columns.push({ key: '__raw__', label: '模型输出' });
  return columns;
}

function outputCellValue(output, key, fallback = '') {
  if (key === '__raw__') return typeof output === 'string' ? output : output == null ? fallback : JSON.stringify(output);
  if (output == null || typeof output !== 'object') return '';
  const value = Object.prototype.hasOwnProperty.call(output, key) ? output[key] : valueAtPath(output, key);
  if (value == null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function fillTemplate(template, data) {
  return template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, path) => {
    const value = path.split('.').reduce((current, key) => current?.[key], data);
    return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

async function evaluateOne(row, position, sourceIndex, config) {
  const start = performance.now();
  const normalized = { ...row, query: row[config.queryColumn], answer: row[config.answerColumn] };
  const maxRetries = Math.max(0, Number(config.retryCount) || 0);
  let attempts = 0;
  while (attempts <= maxRetries) {
    if (state.stopRequested) {
      return { position, rowNumber: sourceIndex + 1, query: normalized.query, answer: normalized.answer, status: 'cancelled', score: null, displayOutput: '用户已中断评估', output: null, attempts, elapsed: performance.now() - start };
    }
    attempts++;
    const controller = new AbortController();
    state.activeControllers.add(controller);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...config, userPrompt: fillTemplate(config.userTemplate, normalized) }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || `评估接口请求失败（HTTP ${response.status}）`);
        error.status = response.status;
        throw error;
      }
      const score = numericScore(payload.output, config.scorePath);
      return { position, rowNumber: sourceIndex + 1, query: normalized.query, answer: normalized.answer, status: 'success', score, displayOutput: outputText(payload.output), output: payload.output, attempts, elapsed: performance.now() - start };
    } catch (error) {
      if (controller.signal.aborted && state.stopRequested) {
        return { position, rowNumber: sourceIndex + 1, query: normalized.query, answer: normalized.answer, status: 'cancelled', score: null, displayOutput: '用户已中断评估', output: null, attempts, elapsed: performance.now() - start };
      }
      if (attempts <= maxRetries && isRetryableError(error.status, error.message)) {
        await waitForRetryOrStop(retryDelay(attempts));
        continue;
      }
      return { position, rowNumber: sourceIndex + 1, query: normalized.query, answer: normalized.answer, status: 'error', score: null, displayOutput: error.message, output: null, attempts, elapsed: performance.now() - start };
    } finally {
      state.activeControllers.delete(controller);
    }
  }
}

function waitForRetryOrStop(delay) {
  if (state.stopRequested) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer);
      state.stopWaiters.delete(finish);
      resolve();
    };
    const timer = setTimeout(finish, delay);
    state.stopWaiters.add(finish);
  });
}

function waitWhilePaused() {
  if (!state.paused || state.stopRequested) return Promise.resolve();
  return new Promise(resolve => state.pauseWaiters.add(resolve));
}

function releasePausedWorkers() {
  for (const resolve of state.pauseWaiters) resolve();
  state.pauseWaiters.clear();
}

function togglePause() {
  if (!state.running || state.stopRequested) return;
  state.paused = !state.paused;
  $('#pauseButton').textContent = state.paused ? '▶ 继续' : 'Ⅱ 暂停';
  $('#progressText').textContent = state.paused ? '已暂停 · 等待当前请求完成' : '正在评估…';
  if (!state.paused) releasePausedWorkers();
}

function stopEvaluation() {
  if (!state.running) return;
  state.stopRequested = true;
  state.paused = false;
  releasePausedWorkers();
  for (const resolve of state.stopWaiters) resolve();
  state.stopWaiters.clear();
  for (const controller of state.activeControllers) controller.abort();
  $('#pauseButton').disabled = true;
  $('#stopButton').disabled = true;
  $('#progressText').textContent = '正在中断…';
}

async function runEvaluation() {
  if (state.running) return;
  const config = settings();
  if (!config.apiKey) return toast('请先填写 API Key', true);
  if (!config.endpoint || !config.model) return toast('请填写 API 地址和模型名称', true);
  if (!config.systemPrompt.trim() || !config.userTemplate.trim()) return toast('System Prompt 和 User Prompt 不能为空', true);
  const range = selectedRange();
  const targetRows = range.rows;
  if (!targetRows.length) return toast('请选择有效的数据范围', true);

  saveSettings();
  state.running = true;
  state.paused = false;
  state.stopRequested = false;
  state.activeControllers.clear();
  state.pauseWaiters.clear();
  state.stopWaiters.clear();
  state.results = Array(targetRows.length);
  $('#runButton').disabled = true;
  $('#runButton').innerHTML = '<span>■</span> 评估中';
  $('#pauseButton').disabled = false;
  $('#pauseButton').textContent = 'Ⅱ 暂停';
  $('#stopButton').disabled = false;
  $('#emptyResults').classList.add('hidden');
  $('#results').classList.remove('hidden');
  document.querySelectorAll('.step')[2].classList.add('active');
  renderProgress(0, targetRows.length);

  let cursor = 0, finished = 0;
  const worker = async () => {
    while (cursor < targetRows.length && !state.stopRequested) {
      await waitWhilePaused();
      if (state.stopRequested) break;
      const position = cursor++;
      const sourceIndex = range.start - 1 + position;
      state.results[position] = await evaluateOne(targetRows[position], position, sourceIndex, config);
      finished++;
      renderProgress(finished, targetRows.length);
      renderResults();
    }
  };
  await Promise.all(Array.from({ length: Math.min(Number($('#concurrency').value), targetRows.length) }, worker));
  const wasStopped = state.stopRequested;
  state.running = false;
  state.paused = false;
  state.stopRequested = false;
  releasePausedWorkers();
  $('#runButton').disabled = false;
  $('#runButton').innerHTML = '<span>↻</span> 重新评估';
  $('#pauseButton').disabled = true;
  $('#pauseButton').textContent = 'Ⅱ 暂停';
  $('#stopButton').disabled = true;
  const processed = state.results.filter(item => item && item.status !== 'cancelled').length;
  $('#progressText').textContent = wasStopped ? `已中断 · 保留 ${processed} 条结果` : '评估完成';
  toast(wasStopped ? `评估已中断，保留 ${processed} 条已完成结果` : `已完成第 ${range.start}–${range.end} 条，共 ${targetRows.length} 条评估`);
}

function renderProgress(done, total) {
  $('#progressText').textContent = state.stopRequested
    ? '正在中断…'
    : state.paused
      ? '已暂停 · 等待当前请求完成'
      : done === total ? '评估完成' : '正在评估…';
  $('#progressMeta').textContent = `${done} / ${total}`;
  $('#progressBar').style.width = `${total ? done / total * 100 : 0}%`;
}

function filteredResults() {
  const keyword = $('#resultSearch').value.trim().toLowerCase();
  return state.results.filter(Boolean).filter(item => !keyword || [item.query, item.answer, item.displayOutput].some(value => String(value ?? '').toLowerCase().includes(keyword)));
}

function renderResults() {
  const complete = state.results.filter(Boolean);
  const processed = complete.filter(item => item.status !== 'cancelled');
  const success = processed.filter(item => item.status === 'success');
  const scores = success.map(item => item.score);
  $('#avgScore').textContent = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  $('#completeCount').textContent = processed.length;
  $('#successRate').textContent = processed.length ? `请求成功率 ${Math.round(success.length / processed.length * 100)}%` : '请求成功率 —';
  $('#rangeScore').textContent = scores.length ? `${Math.max(...scores)} / ${Math.min(...scores)}` : '—';
  $('#avgTime').textContent = processed.length ? `${(processed.reduce((sum, item) => sum + item.elapsed, 0) / processed.length / 1000).toFixed(1)}s` : '—';
  const filtered = filteredResults();
  const outputColumns = resultOutputColumns(complete);
  $('#resultCount').textContent = `${filtered.length} 条结果`;
  $('#resultTable').innerHTML = `<thead><tr><th>#</th><th>问题</th><th>回答</th><th>状态</th>${outputColumns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}<th>请求</th><th>耗时</th><th></th></tr></thead><tbody>${filtered.map(item => `<tr><td>${item.rowNumber}</td><td><div class="cell-clamp">${escapeHtml(item.query)}</div></td><td><div class="cell-clamp">${escapeHtml(item.answer)}</div></td><td><span class="status ${item.status}">${item.status === 'success' ? '● 完成' : item.status === 'cancelled' ? '— 已中断' : '× 接口错误'}</span></td>${outputColumns.map(column => `<td><div class="cell-clamp">${escapeHtml(outputCellValue(item.output, column.key, item.displayOutput))}</div></td>`).join('')}<td>${item.attempts || 0}${item.attempts > 1 ? `（重试 ${item.attempts - 1}）` : ''}</td><td>${(item.elapsed / 1000).toFixed(1)}s</td><td><button class="detail-button" data-index="${item.position}">详情</button></td></tr>`).join('')}</tbody>`;
}

function showDetail(index) {
  const item = state.results[index];
  if (!item) return;
  $('#detailContent').innerHTML = `<div class="detail-block"><span>问题</span><p>${escapeHtml(item.query)}</p></div><div class="detail-block"><span>待评估回答</span><p>${escapeHtml(item.answer)}</p></div><div class="detail-block"><span>请求次数</span><p>${item.attempts ?? 0}${item.attempts > 1 ? ` 次（自动重试 ${item.attempts - 1} 次）` : ' 次'}</p></div><div class="detail-block"><span>提取分数</span><p>${item.score ?? '未提取'}</p></div><div class="detail-block"><span>模型原始输出</span><pre>${escapeHtml(typeof item.output === 'string' ? item.output : JSON.stringify(item.output, null, 2) || item.displayOutput)}</pre></div>`;
  $('#detailDialog').showModal();
}

function exportCsv() {
  const rows = state.results.filter(Boolean);
  if (!rows.length) return toast('暂无可导出的结果', true);
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const outputColumns = resultOutputColumns(rows);
  const csv = '\ufeff' + [
    ['数据序号', '问题', '回答', '状态', ...outputColumns.map(column => column.label), '请求次数', '耗时(ms)'],
    ...rows.map(item => [item.rowNumber, item.query, item.answer, item.status, ...outputColumns.map(column => outputCellValue(item.output, column.key, item.displayOutput)), item.attempts ?? 0, Math.round(item.elapsed)])
  ].map(row => row.map(quote).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `${state.fileName.replace(/\.xlsx?$/i, '') || 'evaluation'}-评估结果.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelectorAll('.step').forEach(step => step.addEventListener('click', () => document.getElementById(step.dataset.target).scrollIntoView({ behavior: 'smooth' })));
$('#provider').addEventListener('change', () => updateProvider(true));
$('#model').addEventListener('input', updateReasoningOptions);
persistedIds.forEach(id => $(`#${id}`).addEventListener('input', () => { if (id === 'temperature') $('#temperatureValue').value = $(`#${id}`).value; saveSettings(); }));
$('#systemPrompt').addEventListener('input', updateOutputVariables);
$('#userPrompt').addEventListener('input', updateOutputVariables);
$('#apiKey').addEventListener('input', saveSettings);
$('#toggleKey').addEventListener('click', () => { const hidden = $('#apiKey').type === 'password'; $('#apiKey').type = hidden ? 'text' : 'password'; $('#toggleKey').textContent = hidden ? '隐藏' : '显示'; });
$('#fileInput').addEventListener('change', event => uploadFile(event.target.files[0]));
$('#dropzone').addEventListener('dragover', event => { event.preventDefault(); $('#dropzone').classList.add('dragging'); });
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('dragging'));
$('#dropzone').addEventListener('drop', event => { event.preventDefault(); $('#dropzone').classList.remove('dragging'); uploadFile(event.dataTransfer.files[0]); });
$('#sheetSelect').addEventListener('change', selectSheet);
$('#queryColumn').addEventListener('change', updatePreview);
$('#answerColumn').addEventListener('change', updatePreview);
$('#rangeStart').addEventListener('input', updatePreview);
$('#rangeEnd').addEventListener('input', updatePreview);
document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => applyRangePreset(button.dataset.range)));
$('#removeFile').addEventListener('click', removeFile);
$('#runButton').addEventListener('click', runEvaluation);
$('#pauseButton').addEventListener('click', togglePause);
$('#stopButton').addEventListener('click', stopEvaluation);
$('#resultSearch').addEventListener('input', renderResults);
$('#resultTable').addEventListener('click', event => { if (event.target.matches('[data-index]')) showDetail(Number(event.target.dataset.index)); });
$('#closeDialog').addEventListener('click', () => $('#detailDialog').close());
$('#exportButton').addEventListener('click', exportCsv);
document.querySelectorAll('[data-help]').forEach(button => button.addEventListener('click', () => {
  const item = help[button.dataset.help];
  $('#helpTitle').textContent = item.title;
  $('#helpText').textContent = item.text;
  $('#helpPopover').classList.remove('hidden');
}));
$('#closeHelp').addEventListener('click', () => $('#helpPopover').classList.add('hidden'));
$('#resetButton').addEventListener('click', () => { localStorage.removeItem('judge-studio-settings'); sessionStorage.removeItem('judge-studio-api-key'); location.reload(); });

loadSettings();
