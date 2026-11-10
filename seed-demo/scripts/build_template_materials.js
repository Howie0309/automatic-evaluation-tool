/* Rebuild reviewable materials from the same data and renderers as the app. */
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');const data=require('../public/template-data');
const write=(file,text)=>fs.writeFileSync(path.join(root,file),text);
write('public/reference/template-inventory.json',JSON.stringify(data,null,2)+'\n');
const lines=['# GPT-6 完整回答样式图鉴','','核对日期：'+data.version,'',data.coverage,'','## 口径','','按完整回答归类，不把按钮、输入框等原子零件计算为模板。名称是研究归纳，不是官方模板编号。静态与交互按呈现方式区分；公开案例与用户提供规范按证据来源区分。用户规范不算官方或实测证据，仅有运行时名称的条目单列待核实。','','本地图鉴为独立重建。结构和关键交互参照同类样例，文字、数据与矢量插图为本地示例，未宣称是原始截图、原版代码或像素级还原。','','## 完整模板示例（含来源区分）','','| 模板示例 | 呈现方式 | 样式类型 | 组织结构 | 来源 |','| --- | --- | --- | --- | --- |'];
const sourceRef=(s,label)=>s.url?`[${label}](${s.url})`:label+'（会话提供）';
for(const e of data.entries){const s=data.sources[e.sourceId],label=({official:'官方',observed:'实测',provided:'用户规范'})[s.kind];lines.push(`| ${e.title} | ${e.mode==='static'?'静态展示':'可交互'} | ${e.family} | ${e.structure.join(' → ')} | ${sourceRef(s,label+' · '+e.evidenceTitle)} |`);}

for(const e of data.entries){const s=data.sources[e.sourceId];lines.push('','### '+e.title,'','- 案例或规范：'+e.evidenceTitle+'；来源日期 '+s.date+'。','- 适用：'+e.intent+'。','- 本地提问：'+e.prompt,'- 还原边界：'+e.limit);}
lines.push('','## 待核实的服务样式线索','','这些名称只说明存在于特定运行时白名单；没有据此确认GPT-6完整回答外观，不计入19项，不伪造视觉预览。','');
for(const x of data.pending)lines.push('- '+x.title+'：'+x.names.map(n=>'`'+n+'`').join('、'));
lines.push('','## 来源','','官方展示与第三方观察分开标注。第三方来源是作者对自己ChatGPT输出的实测或响应分析；开源复刻项目不作为ChatGPT真实输出的证据。','');
for(const s of Object.values(data.sources))lines.push('- '+sourceRef(s,s.title)+' · '+s.date);
lines.push('','## 使用','','打开本地应用的“模板图鉴”，点击任意样式查看完整回答。预览交互在本地完成，不调用模型；“本地回放到对话”会切换回放模式。可复制问题到实时生成模式，但实际输出由当前已配置模型和可用组件决定。','','独立HTML包含6个静态展示与19个交互案例，共25个完整预览，可离线打开；静态模板不要求操作控件。图文对比缺实拍时保留完整文字，主应用可使用已添加实拍素材。JSON、Markdown和HTML不含模型密钥或个人对话。','','重建材料：`node scripts/build_template_materials.js`。');
const report=lines.join('\n')+'\n';write('research/GPT-6完整回答样式图鉴.md',report);write('public/reference/template-inventory.md',report);
const base=`:root{--bg:#f4f6f3;--surface:#fff;--ink:#233c31;--ink-2:#687b6e;--line:#dce5dc;--accent:#26795d;--mono:monospace}*{box-sizing:border-box}body{margin:0;background:var(--bg);font:14px/1.6 system-ui,sans-serif;color:var(--ink);padding:28px}h1{font-size:19px;margin:0 0 22px}button,input,select{font:inherit}button:disabled{cursor:default;opacity:.6}#templates-view{height:auto;overflow:visible;max-width:1350px;margin:auto}#tg-detail{max-height:calc(100vh - 30px)}.tg-app-only,.tg-downloads{display:none!important}@media(max-width:700px){body{padding:16px 8px}#tg-detail{max-height:none}}`;
const css=base+'\n'+fs.readFileSync(path.join(root,'public/template-gallery.css'),'utf8');
const helper=`function h(tag,attrs,...kids){const el=document.createElement(tag);if(attrs)for(const[k,v]of Object.entries(attrs)){if(k==='class')el.className=v;else if(k.startsWith('on'))el.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)el.setAttribute(k,v===true?'':v);}for(const c of kids.flat()){if(c==null||c===false)continue;el.append(c.nodeType?c:document.createTextNode(String(c)));}return el;}\n`;
const code=helper+['template-data','template-showcase','template-gallery'].map(n=>fs.readFileSync(path.join(root,'public/'+n+'.js'),'utf8')).join('\n')+'\nTemplateGallery.init();';
const fragment=fs.readFileSync(path.join(root,'public/template-gallery.html'),'utf8');
write('public/reference/template-atlas.html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>生成式UI演示 · 完整回答样式图鉴</title><style>'+css+'</style><body data-view="templates"><h1>生成式UI演示 · 完整回答样式图鉴</h1>'+fragment+'<script>'+code.replace(/<\/script/gi,'<\\/script')+'</script></body></html>');
console.log('Built '+data.entries.length+' templates ('+data.counts.static+' static, '+data.counts.interactive+' interactive): '+data.entries.filter(e=>e.evidenceLevel==='official').length+' official, '+data.entries.filter(e=>e.evidenceLevel==='observed').length+' observed; '+data.pending.length+' pending families.');
