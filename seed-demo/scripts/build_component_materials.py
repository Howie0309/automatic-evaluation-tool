# coding: utf-8
"""Build evidence-linked inventory; implementation coverage is explicit per item."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
e=json.loads((ROOT/'research/registry-evidence.json').read_text())
groups={
'布局与容器':{'box':'通用容器','row':'横向布局','col':'纵向布局','grid':'网格布局','grid-item':'网格单元','card':'卡片容器','divider':'分隔线','spacer':'留白','flow':'流程布局','flow-item':'流程节点','carousel':'横向轮播','carousel-item':'轮播项','carousel-media-item':'媒体轮播项','form':'表单容器'},
'文字与语义':{'text':'正文','title':'标题','link':'链接','caption':'说明文字','bold':'加粗','italic':'斜体','underline':'下划线','strikethrough':'删除线','blockquote':'引用块','markdown':'Markdown 文本','code':'代码片段','label':'字段标签','math':'数学表达式'},
'输入与操作':{'button':'按钮','pressable':'可按压区域','input':'单行输入','textarea':'多行输入','checkbox':'复选框','radio':'单选项','radio-group':'单选组','select':'下拉选择','segmented-control':'分段选择','slider':'滑块','date-picker':'日期选择'},
'数据展示':{'table':'表格','table-section':'表格分区','table-row':'表格行','table-cell':'表格单元','list':'列表','list-item':'列表项','chart':'笛卡尔图表','pie-chart':'饼图'},
'浮层与翻转':{'popover':'弹出面板','popover-trigger':'弹出触发器','popover-content':'弹出内容','tooltip':'悬浮提示','flashcard-flip':'翻转卡片'},
'图像与媒体':{'icon':'图标','favicon':'站点标识','image':'图片','search-image':'搜索图片','svg':'矢量图形','youtube':'视频入口','html-view':'HTML 视图'},
'状态与动画':{'badge':'徽标','loading':'加载状态','loading-indicator':'加载指示器','loading-block':'骨架占位','pulse-indicator':'脉冲指示','shimmer-text':'流光文字','lottie':'Lottie 动画','celebration':'庆祝效果','animate':'动画容器','animate-group':'动画组','animate-item':'动画项','transition':'过渡容器'}
}
lookup={name:(group,label) for group,items in groups.items() for name,label in items.items()}
partial={'html-view':'展示 HTML 源文本，不执行任意 HTML/JavaScript。','lottie':'以本地 CSS 动画示意；没有捆绑 Lottie 解析器及专有动画资源。','search-image':'只引用已添加的可靠本机素材；未接入 ChatGPT 图片检索服务。','youtube':'显示用户可点击的视频入口，不自动加载第三方播放器。','math':'表达式及等式以排版文本显示；不是完整 LaTeX 引擎。','svg':'本地安全图形参数映射，不执行模型提供的原始 SVG。','favicon':'使用域名首字母标识，不自动请求外站图标。','carousel-media-item':'本地图片及文字卡映射，不含自动播放媒体。'}
def family(name):
 if name.startswith('Calculator') and name!='CalculatorWidget':return '医疗评分（仅名称）'
 if name.startswith('Ledger') or any(k in name for k in ['Stock','Currency','Finance']):return '金融与账本'
 if any(k in name for k in ['Nba','Wnba','Nfl','Nhl','Mlb','Epl','F1','Ipl','Cfb','Nca','Tennis','Soccer','Cricket','Basketball','MarchMadness','Superbowl']):return '体育赛事'
 if any(k in name for k in ['Learning','Homework','WordCard','MultipleChoice','Quiz','Flashcard']):return '学习与测验'
 if any(k in name for k in ['Flight','Restaurant','LocalBusiness','BusinessGallery','Places','Reservation','CareProvider','ArtistUpcoming','EventSidebar']):return '地点旅行与服务'
 if any(k in name for k in ['Image','Video','Media','Speech','Lyrics','Writing','Email','Reddit','News']):return '媒体内容与写作'
 if any(k in name for k in ['Weather','Clock','Timer','Stopwatch','Calculator','UnitConverter','Calendar','Checklist','Nutrition','Exercise','Goal','Holiday','Package']):return '生活效率'
 if any(k in name for k in ['Cite','Citation','Link','Entity','File','Product','Rating','Person','Recommendation','Bento']):return '引用实体与推荐'
 if any(k in name for k in ['Automation','Task','Scheduled','Schedule','PushDrip']):return '任务与自动化'
 return '宿主交互与系统'

sources=[
 {'id':'release-native','title':'本机 OpenAI 客户端发行包：原子渲染注册表','kind':'installed-release','release':e['release'],'asset':e['native']['asset'],'sha256':e['native']['sha256'],'note':'只读提取名称，未复制或执行供应商实现；不是公开 API 合同。'},
 {'id':'release-charts','title':'本机发行包：图表渲染标记','kind':'installed-release','asset':e['charts']['asset'],'sha256':e['charts']['sha256'],'note':'chart / pie-chart 由渲染标记确认，与 68 项基础注册表分开计数。'},
 {'id':'public-runner','title':'公开 DIL Runner：宿主组件白名单','kind':'public-primary-artifact','url':e['host']['sourceURL'],'sha256':e['host']['sha256'],'note':'该文件快照中 30 eager + 283 lazy；只证明名称出现在白名单，不证明功能开放或模型实际调用。'},
 {'id':'openui-analysis','title':'OpenUI 团队的 Intelligent UI 逆向分析','kind':'third-party-analysis','url':'https://www.openui.com/blog/how-chatgpt-intelligent-ui-works','note':'第三方观察，不等于 OpenAI 正式规范。'},
 {'id':'independent-analysis','title':'独立实现分析：组件体系与运行时','kind':'third-party-analysis','url':'https://github.com/Disdjj/intelligent-ui-demo/blob/main/ANALYSIS.md','note':'用于定位可读证据；未使用仓库中的个人对话抓包。'},
 {'id':'official-sdk','title':'OpenAI 官方 UI 指南','kind':'official-documentation','url':'https://developers.openai.com/plugins/concepts/ui-guidelines','note':'官方 Apps SDK UI 是公开组件库，与 DIL 内部注册表不是同一份清单。'}]
natives=e['native']['base']+e['native']['extended']+e['charts']['names']
assert len(natives)==70 and len(set(natives))==70
entries=[]
for name in natives:
 group,label=lookup[name]
 entries.append({'id':'native:'+name,'name':name,'label':label,'layer':'native','category':group,'categoryEvidence':'curated','evidence':'release-render-marker' if name in e['charts']['names'] else 'release-registry','sourceIds':['release-charts' if name in e['charts']['names'] else 'release-native'],'availability':'partial' if name in partial else 'local-demo','localTag':name,'scopeNote':partial.get(name,'本地独立实现，支持演示和组合；属性为本工具适配协议，不是原版完整 DIL 属性规范。')})
for loading in ['eager','lazy']:
 for name in e['host'][loading]:
  entries.append({'id':'host:'+name,'name':name,'label':name,'layer':'host','category':family(name),'categoryEvidence':'name-inference','evidence':'public-allowlist','sourceIds':['public-runner'],'loading':loading,'availability':'reference','localTag':None,'scopeNote':'名称来自运行时白名单；用途分类仅根据名称归类。没有原始属性 schema、服务数据或实际调用证据，不当作已接入功能。'})
assert len(entries)==383 and len({v['id'] for v in entries})==383
manifest={'title':'ChatGPT 组件研究与本地演示','checkedAt':e['checkedAt'],'counts':{'native':70,'nativeRegistry':68,'chartRenderers':2,'host':313,'eager':30,'lazy':283},'coverage':'覆盖本次可读取的两个版本化快照；不是所有时间、所有客户端或所有用户的完整内部组件库。','sources':sources,'entries':entries}
(ROOT/'public/reference/component-inventory.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'public/component-inventory.js').write_text('/* Derived metadata only; no vendor implementation code. */\nconst AtomInventory = '+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\nif(typeof module!=="undefined")module.exports=AtomInventory;\n')
lines=['# ChatGPT 组件清单与证据','',f'核对日期：{e["checkedAt"]}。','',manifest['coverage'],'','## 覆盖范围','',f'- 本机发行包：{e["release"]["CFBundleIdentifier"]} {e["release"]["CFBundleShortVersionString"]} / build {e["release"]["CFBundleVersion"]}。','- 原子层：68 个注册项＋2 个图表渲染项，共 70 个名称。','- 宿主层：30 个常驻＋283 个按需加载，共 313 个白名单名称。','- 原子层均有本地演示；部分能力为受限映射。宿主层仅目录，未冒充原服务。','- 本地可运行协议仍为受限 DSL，不是完整 DIL 兼容运行时；不支持任意 JavaScript、DIL hooks 或私有接口。','','## 证据来源','']
for source in sources:
 lines += ['### '+source['id']+' · '+source['title'],'',source.get('url',source.get('asset','')), '', source['note'],'']
 if source.get('sha256'):lines+=['SHA-256：`'+source['sha256']+'`','']
lines+=['## 70 个原子层组件','','| 原名 | 中文用途 | 分类 | 本地能力 |','| --- | --- | --- | --- |']
for item in entries[:70]:lines.append('| '+item['name']+' | '+item['label']+' | '+item['category']+' | '+('受限映射：'+item['scopeNote'] if item['availability']=='partial' else '独立本地演示，非原版实现')+' |')
lines+=['','## 313 个宿主白名单名称','','以下全为名称证据。分类为名称推断，不提供未经核实的 API、业务数据或医疗评分公式。','']
for category in sorted({x['category'] for x in entries[70:]}):
 lines+=['### '+category,'']
 for item in entries[70:]:
  if item['category']==category:lines.append('- `'+item['name']+'` · '+item['loading'])
 lines+=['']
lines+=['## 可复核方法','','运行 `python3 scripts/extract_component_inventory.py --runner-file /path/to/downloaded-runner.js`。脚本只解析发行包索引和静态字符串，不执行下载代码，不读取账号、缓存或个人对话。','','运行 `python3 scripts/build_component_materials.py` 从提取结果重建 JSON、浏览器目录和本说明。']
report='\n'.join(lines)+'\n'
(ROOT/'research/ChatGPT组件清单.md').write_text(report)
(ROOT/'public/reference/component-inventory.md').write_text(report)
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>生成式UI演示 · ChatGPT组件材料</title>
<style>body{font:15px/1.7 system-ui,sans-serif;color:#202a3b;background:#f5f7fb;max-width:1200px;margin:auto;padding:40px 24px}h1{font-size:34px;letter-spacing:-1px}small,.muted{color:#687588}header{margin-bottom:28px}section,details{background:white;border:1px solid #dce3ef;border-radius:16px;padding:24px;margin:20px 0}.counts{display:flex;gap:14px;flex-wrap:wrap}.counts span{background:#e9eefc;padding:12px 20px;border-radius:10px}input,select,button{font:inherit;padding:10px;border:1px solid #cad4e5;border-radius:8px;background:white}input{flex:1;min-width:180px}.filters{display:flex;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:#f5f7fb;padding:14px 0}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;border-bottom:1px solid #e4e9f1;padding:12px;vertical-align:top}td:first-child{font-family:monospace;overflow-wrap:anywhere}td p{margin:4px 0}a{color:#345bc5}code{overflow-wrap:anywhere}#count{color:#687588}@media(max-width:700px){body{padding:20px 12px}th:nth-child(3),td:nth-child(3){display:none}td,th{padding:8px}section{padding:12px}h1{font-size:27px}}@media print{body{max-width:none;background:white;padding:0;font-size:10pt}.filters,button{display:none}section,details{border:none;padding:0}thead{display:table-header-group}tr{break-inside:avoid}h1{font-size:22pt}}</style>
<header><small>生成式UI演示 · 研究材料 · 2026-10-22</small><h1>ChatGPT 组件图谱</h1><p>70 个原子层名称与 313 个宿主白名单名称。此文件可离线检索、分享或打印；交互预览位于本地应用的“ChatGPT组件”页。</p><div class="counts"><span><b>70</b> 原子层名称</span><span><b>313</b> 宿主白名单</span><span><b>383</b> 总收录</span></div></header>
<section><h2>覆盖范围与使用方式</h2><p id="coverage"></p><p>原子层来自本机发行包 <b>com.openai.codex 26.1013.40934 / build 20770</b>，含68项注册表和2项图表标记。宿主层来自另一个公开 DIL Runner 快照，含30项常驻、283项按需加载。两个快照并非同版本的官方统一目录。</p><p>本地应用为70个名称独立编写预览，其中62项提供本地演示，8项是受限映射；属性使用本工具的受限 DSL，并非完整 DIL 规范。313项宿主只收录名称与证据，分类根据名称推断。它们没有接入原业务服务，也不代表当前模型可调用。</p><button id="print">打印 / 存为 PDF</button> <button id="json">下载完整 JSON</button></section>
<div class="filters"><input id="query" type="search" aria-label="搜索组件" placeholder="搜索原名、中文用途或分类"><select id="layer" aria-label="选择层级"><option value="">全部层级</option><option value="native">原子层</option><option value="host">宿主层</option></select><select id="status" aria-label="选择能力"><option value="">全部能力</option><option value="local-demo">本地演示</option><option value="partial">受限映射</option><option value="reference">仅名称资料</option></select></div><p id="count" role="status"></p>
<section><table><thead><tr><th>组件原名</th><th>用途 / 分类</th><th>层级 / 证据</th><th>本地能力与边界</th></tr></thead><tbody id="rows"></tbody></table></section>
<details open><summary>证据来源与可复核方法</summary><div id="sources"></div><p>只读取静态名称，不执行供应商代码，不读取账户、缓存或个人对话。源码提取及材料构建脚本保存在项目 scripts/ 目录，完整哈希保存在 registry-evidence.json 中。官方 Apps SDK UI 与内部 DIL 注册表为不同目录。</p></details>
<script type="application/json" id="inventory">__DATA__</script><script>
const data=JSON.parse(document.getElementById('inventory').textContent),$=id=>document.getElementById(id);const status={'local-demo':'本地演示',partial:'受限映射',reference:'仅名称资料'};function node(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
$('coverage').textContent=data.coverage;
function render(){const q=$('query').value.trim().toLowerCase(),layer=$('layer').value,s=$('status').value;const found=data.entries.filter(e=>(!layer||e.layer===layer)&&(!s||e.availability===s)&&(!q||(e.name+' '+e.label+' '+e.category).toLowerCase().includes(q)));$('count').textContent=found.length+' / '+data.entries.length+' 项';$('rows').replaceChildren(...found.map(e=>{const tr=document.createElement('tr');tr.append(node('td',e.name),node('td',(e.label===e.name?'':e.label+' · ')+e.category),node('td',(e.layer==='native'?'原子层':'宿主层')+' · '+e.sourceIds.join(', ')),node('td',status[e.availability]+'。'+e.scopeNote));return tr;}));}
for(const id of ['query','layer','status'])$(id).addEventListener(id==='query'?'input':'change',render);
for(const s of data.sources){const p=node('p',s.title+'：'+s.note);if(s.url){const a=node('a',' 查看来源');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);}if(s.sha256)p.append(node('small',' SHA-256: '+s.sha256));$('sources').append(p);}
$('print').onclick=()=>window.print();$('json').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='chatgpt-component-inventory.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};render();
</script></html>'''
(ROOT/'public/reference/component-atlas.html').write_text(html.replace('__DATA__',json.dumps(manifest,ensure_ascii=False).replace('<','\\u003c')))
print('Built 70 native demos + 313 host reference entries, all with source IDs.')
