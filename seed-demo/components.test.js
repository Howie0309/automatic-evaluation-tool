const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ext=require('./public/components');
const atoms=require('./public/atomic-kit');
const inventory=require('./public/component-inventory');

class Element {
  constructor(tag){this.tagName=tag;this.nodeType=1;this.childNodes=[];this.attributes={};this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};this.listeners={};}
  append(...nodes){for(const n of nodes){if(n?.tagName==='#fragment')this.childNodes.push(...n.childNodes);else this.childNodes.push(n);}}
  replaceChildren(...nodes){this.childNodes=[];this.append(...nodes);}
  prepend(...nodes){this.childNodes.unshift(...nodes);}
  setAttribute(k,v){this.attributes[k]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  remove(){}
  querySelector(selector){return this.childNodes.find(c=>c.tagName===selector)||this.childNodes.map(c=>c.querySelector?.(selector)).find(Boolean)||null;}
  get textContent(){return this._text||this.childNodes.map(c=>typeof c==='string'?c:c.textContent||'').join('');}
  set textContent(value){this._text=String(value);this.childNodes=[];}
  set innerHTML(value){this._html=value;}
}
function runtime(){
  const context=vm.createContext({console,performance,URL,TextDecoder,TextEncoder,Blob,setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},localStorage:{getItem:()=>null},window:{},document:{createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),createTextNode:t=>({nodeType:3,textContent:t}),createDocumentFragment:()=>new Element('#fragment'),addEventListener(){} }});
  vm.runInContext(fs.readFileSync(__dirname+'/public/presentation-rules.js','utf8'),context);
  vm.runInContext(fs.readFileSync(__dirname+'/public/components.js','utf8'),context);
  for(const file of ['component-inventory','atomic-kit','component-atlas','template-data','template-showcase','template-gallery'])vm.runInContext(fs.readFileSync(__dirname+'/public/'+file+'.js','utf8'),context);
  const main=fs.readFileSync(__dirname+'/public/index.html','utf8').split('<script>')[1].split('</script>')[0];
  vm.runInContext(main,context);return context;
}
function message(context,source){context.inputSource=source;return vm.runInContext(`(()=>{const m={buffer:inputSource,state:{},ui:{},timers:[],seen:new Set(),evalErrors:new Set(),compiles:0,body:document.createElement('div'),final:true};compile(m);return m;})()`,context);}

test('所有新模板及演示均能通过 DSL 校验和渲染',()=>{
  const context=runtime();
  for(const example of ext.examples){const m=message(context,example.dsl);assert.equal(m.diags.length,0,example.id+': '+JSON.stringify(m.diags));assert.equal(m.evalErrors.size,0,example.id);assert.ok(m.body.textContent.length>0,example.id);}
});
test('流式编译逐步补齐预算行，并保留用户编辑',()=>{
  const context=runtime();
  context.inputSource='<BudgetTable bind="budget" people={30}><BudgetItem id="food" name="餐饮" quantity={30} price={100}/></BudgetTable>';
  vm.runInContext(`var m={buffer:inputSource,state:{},ui:{},timers:[],seen:new Set(),evalErrors:new Set(),compiles:0,body:document.createElement('div'),final:false};compile(m);m.state.budget.rows[0].price=80;`,context);
  context.inputSource=ext.catalog.BudgetTable.example;
  const result=vm.runInContext('m.buffer=inputSource;compile(m);m',context);
  assert.equal(result.state.budget.rows.length,3);
  assert.equal(result.state.budget.rows[0].price,80);
  assert.equal(result.state.budget.total,4500);
});
test('锁定行保留，人数联动只调整未锁定行，失败更新不影响原表',()=>{
  const original={people:30,cap:6000,rows:[{id:'food',name:'餐饮',quantity:30,price:80,perPerson:true,locked:true},{id:'material',name:'物料',quantity:30,price:20,perPerson:true,locked:false}]};
  const next=ext.patchBudget(original,[{op:'set',field:'people',value:40},{op:'add',row:'transport',name:'交通费',quantity:1,price:800}]);
  assert.equal(next.rows[0].quantity,30);assert.equal(next.rows[1].quantity,40);assert.equal(next.total,4000);assert.equal(original.people,30);
  assert.throws(()=>ext.patchBudget(original,[{op:'set',field:'cap',value:8000},{op:'set',row:'food',field:'price',value:1}]),/锁定/);
  assert.equal(original.cap,6000);assert.equal(original.rows[0].price,80);
  assert.throws(()=>ext.patchBudget(original,[{op:'add',row:'food',name:'重复',quantity:1,price:1}]),/唯一/);
});
test('最终 Patch 会更新原表，任何指令失败整组不应用',()=>{
  const context=runtime();context.example=ext.catalog.BudgetTable.example;
  vm.runInContext(`var previous={buffer:example,state:{},ui:{},timers:[],seen:new Set(),evalErrors:new Set(),compiles:0,body:document.createElement('div'),final:true,finalized:true};compile(previous);chat.messages.push(previous);`,context);
  context.patch='<Patch target="budget" op="set" field="people" value={40}/><Patch target="budget" op="add" row="transport" name="交通" quantity={1} price={800}/>';
  let result=vm.runInContext(`var update={buffer:patch,state:{},ui:{},timers:[],seen:new Set(),evalErrors:new Set(),compiles:0,body:document.createElement('div'),final:true};compile(update);DemoExtensions.applyPatches(update,update.tree);({state:previous.state.budget,applied:update.patchApplied})`,context);
  assert.equal(result.applied,true);assert.equal(result.state.total,7100);assert.equal(result.state.people,40);
  context.patch='<Patch target="budget" op="set" field="cap" value={9000}/><Patch target="budget" op="remove" row="missing"/>';
  result=vm.runInContext(`update.buffer=patch;compile(update);DemoExtensions.applyPatches(update,update.tree);({state:previous.state.budget,applied:update.patchApplied})`,context);
  assert.equal(result.applied,false);assert.equal(result.state.cap,6000);assert.equal(result.state.rows.length,4);
});
test('整组退化保留所有信息，图片对比超过两个对象变分类布局',()=>{
  const context=runtime();
  const fallback=message(context,ext.examples.find(x=>x.id==='fallback-demo').dsl);
  for(const detail of ['圆形','三角形','正方形','填写信息','提交申请','2026-10-22','开展试用','精确的形态和比例'])assert.ok(fallback.body.textContent.includes(detail),detail);
  assert.equal(fallback.body.querySelector('img'),null);
  const images=message(context,ext.catalog.ImageList.example.replaceAll('ImageList','ImageCompare'));
  assert.ok(images.body.querySelector('img'));
  const textComparison=message(context,ext.catalog.ImageCompare.example);
  assert.equal(textComparison.body.querySelector('img'),null);assert.ok(textComparison.body.textContent.includes('相机 A'));assert.ok(textComparison.body.textContent.includes('相机 B'));
});
test('日期和依赖冲突检查，不把无效日期当确切时间',()=>{
  assert.ok(ext.validDate('2024-02-29'));assert.ok(!ext.validDate('2026-02-29'));assert.ok(!ext.validDate('2026-13','month'));assert.ok(!ext.validDate('明年'));
  const tasks=[{id:'a',title:'评审',date:'2026-10-26',time:'09:00',minutes:60},{id:'b',title:'制作',date:'2026-10-26',time:'09:30',minutes:90,after:'a'}];
  assert.equal(ext.scheduleWarnings(tasks).length,2);tasks[1].time='10:00';assert.equal(ext.scheduleWarnings(tasks).length,0);
});
test('生成式表格只增强一列，未知状态保留普通文字',()=>{
  const context=runtime();
  const m=message(context,'<DataTable head="对象|参数|状态" markColumn={3} markMode="symbol"><DataRow values="A|10|已完成" status="yes"/><DataRow values="B|20|未知" status="mystery"/></DataTable>');
  const spans=[];function walk(node){if(node.className==='status-symbol')spans.push(node);for(const child of node.childNodes||[])walk(child);}walk(m.body);
  assert.equal(spans.length,1);assert.ok(m.body.textContent.includes('未知'));
});

test('图片实际加载失败时整组退化，两个实拍素材按并排模板呈现',()=>{
  const context=runtime();
  const list=message(context,ext.catalog.ImageList.example);
  list.body.querySelector('img').listeners.error();
  assert.equal(list.body.querySelector('img'),null);
  for(const name of ['圆形','三角形','正方形'])assert.ok(list.body.textContent.includes(name));
  vm.runInContext(`DemoExtensions.media.test_a={subject:'A',kind:'photo',src:'/test-a.png'};DemoExtensions.media.test_b={subject:'B',kind:'photo',src:'/test-b.png'};`,context);
  const compare=message(context,'<ImageCompare title="测试素材"><ImageCard title="A" image="test_a">A描述</ImageCard><ImageCard title="B" image="test_b">B描述</ImageCard></ImageCompare>');
  assert.ok(compare.body.querySelector('img'));
  const divs=[];function walk(node){if(node.className==='image-compare')divs.push(node);for(const child of node.childNodes||[])walk(child);}walk(compare.body);assert.equal(divs.length,1);
});
test('默认系统提示词包含新规则且未超过接口长度，保留标识符被拒绝',()=>{
  const context=runtime();
  const prompt=vm.runInContext('instructions()',context);
  assert.ok(!prompt.includes('默认用纯文本（Markdown）回答'));assert.ok(!prompt.includes('只有当用户需要调整数字'));for(const requirement of ['界面既可以是信息呈现，也可以是交互工具','至少三个并列对象','主要比较的对象恰好两个','事件都有确切时间','一张表最多一列','联网搜索与来源'])assert.ok(prompt.includes(requirement));
  assert.ok(prompt.length<40000);for(const key of ['ImageList','ImageCompare','GuideSteps','EventTimeline','RelationDiagram','DataTable','Patch','可用图片素材'])assert.ok(prompt.includes(key));
  const m=message(context,'<BudgetTable bind="__proto__"><BudgetItem id="food" name="食物" quantity={1} price={1}/></BudgetTable>');
  assert.ok(m.diags.length>0);assert.equal(m.tree.children.length,0);
});

test('组件研究覆盖70原子与313宿主，证据完整且不混淆实现状态',()=>{
  assert.equal(inventory.entries.length,383);assert.equal(new Set(inventory.entries.map(x=>x.id)).size,383);
  const native=inventory.entries.filter(x=>x.layer==='native'),host=inventory.entries.filter(x=>x.layer==='host');
  assert.equal(native.length,70);assert.equal(host.length,313);assert.equal(native.filter(x=>x.availability==='partial').length,8);
  assert.equal(host.filter(x=>x.loading==='eager').length,30);assert.equal(host.filter(x=>x.loading==='lazy').length,283);
  assert.ok(host.every(x=>x.availability==='reference'&&x.localTag===null&&x.categoryEvidence==='name-inference'));
  for(const x of inventory.entries)for(const id of x.sourceIds)assert.ok(inventory.sources.some(s=>s.id===id),x.name);
  for(const source of inventory.sources.filter(x=>x.sha256))assert.match(source.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(atoms.catalog).sort(),native.map(x=>x.name).sort());
});
test('70个原子示例与4个组合场景均能安全编译并渲染',()=>{
  const context=runtime();
  for(const [name,spec] of Object.entries(atoms.catalog)){
    const m=message(context,spec.example);assert.equal(m.diags.length,0,name+': '+JSON.stringify(m.diags));assert.equal(m.evalErrors.size,0,name);assert.ok(m.body.childNodes.length>0,name);
  }
  for(const demo of atoms.demos){const m=message(context,demo.dsl);assert.equal(m.diags.length,0,demo.id+': '+JSON.stringify(m.diags));assert.equal(m.evalErrors.size,0,demo.id);}
});
test('原子控件更新绑定与表达式，翻转卡保存当前面，交互无需调用模型',()=>{
  const context=runtime(),m=message(context,atoms.catalog.slider.example),slider=m.body.querySelector('input');
  assert.equal(m.state.atomPeople,8);assert.ok(m.body.textContent.includes('232'));
  slider.value='15';slider.listeners.input();assert.equal(m.state.atomPeople,15);assert.ok(m.body.textContent.includes('435'));
  const number=message(context,'<input type="number" bind="count" default="8"/><text>{count + 2}</text>');assert.equal(number.state.count,8);assert.ok(number.body.textContent.includes('10'));number.body.querySelector('input').value='12';number.body.querySelector('input').listeners.input();assert.equal(number.state.count,12);assert.ok(number.body.textContent.includes('14'));
  const clamped=message(context,'<slider bind="count" min={1} max={10} default={99}/>');assert.equal(clamped.state.count,10);
  const check=message(context,atoms.catalog.checkbox.example),checkbox=check.body.querySelector('input');checkbox.checked=true;checkbox.listeners.change();assert.equal(check.state.atomAgree,true);
  const flip=message(context,atoms.catalog['flashcard-flip'].example),button=flip.body.querySelector('button');assert.ok(button.textContent.includes('DSL 是什么'));button.listeners.click();assert.ok(button.textContent.includes('领域专用语言'));assert.equal(button.getAttribute('aria-pressed'),'true');button.listeners.click();assert.equal(button.getAttribute('aria-pressed'),'false');
});
test('原子组件拒绝危险协议、原型标签和未知宿主标签，HTML不执行',()=>{
  const context=runtime();
  const link=message(context,'<link href="javascript:alert(1)">危险链接</link>');assert.equal(link.body.querySelector('a'),null);
  const html=message(context,'<html-view>&lt;script&gt;alert(1)&lt;/script&gt;</html-view>');assert.equal(html.body.querySelector('script'),null);assert.ok(html.body.textContent.includes('不执行任意 HTML'));
  for(const source of ['<constructor/>','<StockChart/>','<box constructor="x"/>']){const m=message(context,source);assert.ok(m.diags.length>0,source);}
  const invalid=message(context,'<__proto__/>');assert.ok(invalid.tree.children.every(x=>x.type==='#text'));
});
test('组件目录筛选同步详情，无结果后恢复，宿主不显示伪造功能预览',()=>{
  const context=runtime(),elements={};
  for(const id of ['atlas-detail','atlas-counts','atlas-category','atlas-query','atlas-layer','atlas-status','atlas-results','atlas-prev','atlas-next','atlas-items','atlas-reset','atlas-sources']){elements['#'+id]=new Element('div');elements['#'+id].value='';}
  context.document.querySelector=selector=>elements[selector];
  vm.runInContext('ComponentAtlas.init()',context);assert.ok(elements['#atlas-results'].textContent.includes('383'));
  const query=elements['#atlas-query'];query.value='slider';query.listeners.input();assert.ok(elements['#atlas-results'].textContent.startsWith('1 项'));assert.ok(elements['#atlas-detail'].querySelector('input'));
  query.value='no-such-component';query.listeners.input();assert.ok(elements['#atlas-detail'].textContent.includes('没有匹配'));
  query.value='slider';query.listeners.input();assert.ok(elements['#atlas-detail'].querySelector('input'));
  query.value='StockChart';query.listeners.input();assert.ok(elements['#atlas-detail'].textContent.includes('未接入原宿主服务'));assert.equal(elements['#atlas-detail'].querySelector('svg'),null);
  elements['#atlas-reset'].listeners.click();assert.ok(elements['#atlas-results'].textContent.startsWith('383 项'));
});

const templates=require('./public/template-data');
const showcase=require('./public/template-showcase');
function descendants(node,predicate){return (node.childNodes||[]).flatMap(child=>!child||typeof child==='string'?[]:[...(predicate(child)?[child]:[]),...descendants(child,predicate)]);}
test('静态规范和公开交互案例分开计数与溯源',()=>{
  assert.equal(templates.entries.length,25);assert.equal(new Set(templates.entries.map(x=>x.family)).size,16);assert.equal(new Set(templates.entries.map(x=>x.id)).size,25);assert.equal(templates.entries.filter(x=>x.mode==='static').length,6);assert.equal(templates.entries.filter(x=>x.mode==='interactive').length,19);
  assert.equal(templates.entries.filter(x=>x.evidenceLevel==='official').length,11);assert.equal(templates.entries.filter(x=>x.evidenceLevel==='observed').length,8);
  for(const e of templates.entries){const source=templates.sources[e.sourceId];assert.ok(source);assert.ok(e.structure.length>=3);if(e.mode==='static'){assert.equal(e.evidenceLevel,'provided');assert.equal(e.rendering,'local-template');}else{assert.ok(source.url);assert.equal(e.rendering,'local-reconstruction');}assert.ok(e.limit);}
  for(const x of templates.pending)for(const name of x.names)assert.ok(inventory.entries.some(e=>e.layer==='host'&&e.name===name),name);
});
test('25个完整模板都能直接渲染和回放编译，提示词不会把样例标签作为可用接口',()=>{
  const context=runtime();
  for(const example of showcase.examples){const m=message(context,example.dsl);assert.equal(m.diags.length,0,example.id+': '+JSON.stringify(m.diags));assert.equal(m.evalErrors.size,0,example.id);assert.ok(m.body.textContent.includes('本地重建')||m.body.textContent.includes('用户规范示例'),example.id);assert.ok(Object.keys(m.state).some(k=>k.startsWith('style_')),example.id);}
  const prompt=vm.runInContext('instructions()',context);assert.ok(prompt.includes('完整回答的组织方式'));assert.ok(!prompt.includes('<TemplateSample>'));
  assert.equal(vm.runInContext('ALL_ITEMS.length',context),57);
});
test('聚餐人数联动采购量，工作坊保留零人数场地费并拒绝空值与小数人数',()=>{
  const context=runtime(),dinner=message(context,'<TemplateSample id="dinner"/>');
  const range=descendants(dinner.body,n=>n.getAttribute?.('aria-label')==='用餐人数')[0];range.value='10';range.listeners.input();assert.equal(dinner.state.style_dinner.people,10);assert.ok(dinner.body.textContent.includes('2200 g'));
  const budget=message(context,'<TemplateSample id="workshop"/>');const input=descendants(budget.body,n=>n.getAttribute?.('aria-label')==='人数')[0];input.value='0';input.listeners.input();assert.ok(budget.body.textContent.includes('不适用'));assert.ok(budget.body.textContent.includes('200'));
  input.value='';input.listeners.input();assert.ok(budget.body.textContent.includes('请输入有效'));
  input.value='1.5';input.listeners.input();assert.ok(budget.body.textContent.includes('人数必须是整数'));
  const reset=descendants(budget.body,n=>n.tagName==='button'&&n.textContent==='恢复起始值')[0];reset.listeners.click();assert.equal(budget.state.style_workshop.people,20);assert.ok(budget.body.textContent.includes('700'));
});
test('完整工具的计算口径与条件正确，概率实验遵守主持人规则',()=>{
  assert.equal(showcase.savings(1000,10,0).total,120000);assert.ok(Math.abs(showcase.savings(1000,1,12).total-12682.503013196978)<.01);
  assert.deepEqual(showcase.workshop({people:0,room:200,food:18,material:7,budget:900}),{total:200,per:null,left:700});
  assert.equal(showcase.workshop({people:29,room:200,food:18,material:7,budget:900}).total,925);
  assert.equal(showcase.workshop({people:null,room:200,food:18,material:7,budget:900}),null);
  assert.equal(showcase.rank([0,0,10])[0].name,'实惠款 C');assert.equal(showcase.rank([10,0,0])[0].name,'轻便款 A');
  for(const n of [1,5,40])assert.equal(showcase.distribution(n).reduce((a,b)=>a+b,0),600);
  const context=runtime(),m=message(context,'<TemplateSample id="monty"/>');descendants(m.body,n=>n.getAttribute?.('aria-label')==='选择第1扇门')[0].listeners.click();const st=m.state.style_monty;assert.notEqual(st.opened,st.prize);assert.notEqual(st.opened,st.pick);descendants(m.body,n=>n.tagName==='button'&&n.textContent==='换另一扇门')[0].listeners.click();assert.equal(st.played,1);assert.equal(st.done,true);
});
test('完整模板图鉴筛选与详情同步，全部预览可以离线导出',()=>{
  const context=runtime(),elements={};
  for(const id of ['tg-stats','tg-category','tg-query','tg-mode','tg-evidence','tg-results','tg-cards','tg-detail','tg-reset','tg-sources','tg-pending','tg-business','tg-technical']){elements[id]=new Element('div');elements[id].value='';}context.document.getElementById=id=>elements[id];
  vm.runInContext('TemplateGallery.init()',context);assert.equal(elements['tg-results'].textContent,'25 / 25 项');
  elements['tg-evidence'].value='official';elements['tg-evidence'].listeners.change();assert.equal(elements['tg-results'].textContent,'11 / 25 项');
  elements['tg-query'].value='没有这种样式';elements['tg-query'].listeners.input();assert.ok(elements['tg-detail'].textContent.includes('没有匹配'));
  elements['tg-query'].value='采购';elements['tg-query'].listeners.input();assert.ok(elements['tg-detail'].textContent.includes('采购量'));assert.equal(elements['tg-results'].textContent,'1 / 25 项');
  vm.runInContext('TemplateGallery.cleanup();TemplateGallery.init()',context);assert.ok(elements['tg-detail'].textContent.includes('采购量'));
  const offline=fs.readFileSync(__dirname+'/public/reference/template-atlas.html','utf8');assert.ok(offline.includes('TemplateGallery.init()'));assert.ok(offline.includes('成本预算与边界校验'));assert.ok(!offline.includes('/.local-config'));
});

test('六个静态预览不含操作控件，信息完整并保留缺图退化',()=>{
 const context=runtime();
 for(const e of templates.entries.filter(x=>x.mode==='static')){
  const m=message(context,'<TemplateSample id="'+e.id+'"/>');assert.equal(m.diags.length,0,e.id);
  assert.equal(descendants(m.body,n=>['input','button','select','textarea','canvas'].includes(n.tagName)||n.getAttribute?.('role')==='button').length,0,e.id);
  assert.ok(m.body.textContent.includes('用户规范示例'),e.id);
 }
 const classify=message(context,'<TemplateSample id="static-image-list"/>');for(const name of ['圆形','三角形','正方形','闭合曲线','三个顶点','四个直角'])assert.ok(classify.body.textContent.includes(name),name);
 const comparison=message(context,'<TemplateSample id="static-image-compare"/>');assert.equal(comparison.body.querySelector('img'),null);for(const text of ['相机 A','相机 B','长时间携带','稳定操作'])assert.ok(comparison.body.textContent.includes(text));
 vm.runInContext("DemoExtensions.media.camera_a={subject:'相机 A',kind:'photo',src:'/test-a.png'};DemoExtensions.media.camera_b={subject:'相机 B',kind:'photo',src:'/test-b.png'};",context);
 const photos=message(context,'<TemplateSample id="static-image-compare"/>');assert.equal(descendants(photos.body,n=>n.tagName==='img').length,2);photos.body.querySelector('img').listeners.error();assert.equal(photos.body.querySelector('img'),null);assert.ok(photos.body.textContent.includes('长时间携带'));assert.ok(photos.body.textContent.includes('稳定操作'));
 const timeline=message(context,'<TemplateSample id="static-timeline"/>');assert.equal(descendants(timeline.body,n=>n.tagName==='time').length,3);assert.ok(timeline.body.textContent.includes('虚构项目'));
 const relation=message(context,'<TemplateSample id="static-relation"/>');assert.ok(relation.body.querySelector('svg'));assert.ok(relation.body.textContent.includes('示意图'));
 const table=message(context,'<TemplateSample id="static-table"/>');assert.ok(table.body.querySelector('table'));assert.ok(table.body.textContent.includes('未知'));
});
test('静态、交互和来源筛选可组合，重置恢复全量且不混淆公开案例数量',()=>{
 const context=runtime(),els={};for(const id of ['tg-stats','tg-category','tg-query','tg-mode','tg-evidence','tg-results','tg-cards','tg-detail','tg-reset','tg-sources','tg-pending','tg-business','tg-technical']){els[id]=new Element('div');els[id].value='';}context.document.getElementById=id=>els[id];
 vm.runInContext('TemplateGallery.init()',context);assert.ok(els['tg-detail'].textContent.includes('图文分类卡'));
 els['tg-mode'].value='static';els['tg-mode'].listeners.change();assert.equal(els['tg-results'].textContent,'6 / 25 项');
 els['tg-evidence'].value='official';els['tg-evidence'].listeners.change();assert.equal(els['tg-results'].textContent,'0 / 25 项');
 els['tg-evidence'].value='provided';els['tg-evidence'].listeners.change();assert.equal(els['tg-results'].textContent,'6 / 25 项');
 els['tg-reset'].listeners.click();assert.equal(els['tg-mode'].value,'');assert.equal(els['tg-results'].textContent,'25 / 25 项');
 els['tg-mode'].value='interactive';els['tg-mode'].listeners.change();assert.equal(els['tg-results'].textContent,'19 / 25 项');
});
