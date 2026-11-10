/* Local implementations of evidence-linked component names. Not an OpenAI DIL runtime. */
'use strict';
const AtomicKit = (() => {
  const inventory = typeof AtomInventory!=='undefined' ? AtomInventory : require('./component-inventory');
  const natives=inventory.entries.filter(e=>e.layer==='native');
  const catalog={};
  const layout={padding:'number',gap:'number',border:'bool',radius:'enum:none|sm|md|lg|xl',background:'enum:default|secondary|accent',align:'enum:start|center|end',justify:'enum:start|center|end|between'};
  const typography={size:'enum:sm|md|lg|xl',color:'enum:default|secondary|accent',weight:'enum:normal|medium|bold'};
  const binding={bind:'ident',label:'string',default:'string',disabled:'bool'};
  function def(name,props,children,example){const item=natives.find(e=>e.name===name);catalog[name]={cat:'原子·'+item.category,desc:item.label+'。'+(item.availability==='partial'?item.scopeNote:'本地独立映射；可组合，不是完整 DIL 实现。'),props,children,example,atomic:true,proof:item.id};}
  for(const name of ['box','row','col','card','grid','grid-item','flow','flow-item'])def(name,{...layout,...(['grid','grid-item'].includes(name)?{columns:'number',span:'number'}:{})},'any',`<${name}${name==='grid'?' columns={2}':''} padding={3} gap={2} border>\n<text>内容 A</text>\n<text color="secondary">内容 B</text>\n</${name}>`);
  def('divider',{},false,'<text>第一部分</text>\n<divider/>\n<text>第二部分</text>');
  def('spacer',{size:'number'},false,'<text>上方内容</text>\n<spacer size={6}/>\n<text>下方内容</text>');
  for(const name of ['text','title','caption','bold','italic','underline','strikethrough','blockquote','markdown','code','label','math','shimmer-text'])def(name,{...typography,...(name==='label'?{for:'string'}:{}),...(name==='code'?{language:'string'}:{})},'text',`<${name}>${({'title':'一个清晰的标题',caption:'补充说明与数据口径',bold:'重点内容',italic:'斜体强调',underline:'下划线强调',strikethrough:'已被替换的内容',blockquote:'引用一段有出处的话',markdown:'**结构化说明**：正文支持基础 Markdown。',code:'const total = people * price;',label:'你的姓名',math:'E = m × c²','shimmer-text':'正在组织界面…'})[name]||'这是正文内容。'}</${name}>`);
  def('badge',{text:'string',tone:'enum:neutral|success|warn|accent'},'text','<badge tone="success">已完成</badge>');
  def('button',{text:'string',prompt:'string',submit:'bool',disabled:'bool'},'text','<button>点击测试本地动作</button>');
  def('pressable',{label:'string',prompt:'string'},'any','<pressable label="方案 A">\n<title size="sm">选择方案 A</title>\n<caption>可点击的内容区域</caption>\n</pressable>');
  def('input',{...binding,type:'enum:text|number|email',placeholder:'string'},false,'<input bind="atomName" label="姓名" placeholder="输入你的称呼"/>');
  def('textarea',{...binding,placeholder:'string',rows:'number'},false,'<textarea bind="atomNote" label="备注" placeholder="填写需求" rows={3}/>');
  def('checkbox',{bind:'ident',label:'string',default:'bool',disabled:'bool'},false,'<checkbox bind="atomAgree" label="已完成资料检查"/>');
  def('radio',{bind:'ident',label:'string',value:'string',default:'string'},false,'<radio bind="atomRadio" label="方案 A" value="A" default="A"/>\n<radio bind="atomRadio" label="方案 B" value="B"/>');
  for(const name of ['select','radio-group','segmented-control'])def(name,{...binding,options:'string!'},false,`<${name} bind="atomChoice" label="出行方式" options="步行|公交|骑行" default="公交"/>`);
  def('slider',{bind:'ident',label:'string',min:'number',max:'number',step:'number',default:'number',unit:'string'},false,'<slider bind="atomPeople" label="人数" min={1} max={50} default={8} unit="人"/>\n<text>按每人 29 元计算：{atomPeople * 29} 元</text>');
  def('date-picker',{...binding,min:'string',max:'string'},false,'<date-picker bind="atomDate" label="计划日期" default="2026-10-26"/>');
  def('form',{bind:'ident',title:'string',prompt:'string',submit:'string'},'any','<form bind="atomForm" title="活动需求" prompt="请按这些信息继续规划" submit="继续规划">\n<input bind="atomFormName" label="活动名称"/>\n<select bind="atomFormStyle" label="形式" options="室内|户外"/>\n</form>');
  def('table',{head:'string',rows:'string'},'any','<table head="项目|数量|状态" rows="餐饮|30|已确认;交通|1|待确认"/>');
  def('table-section',{label:'string'},'any','<table><table-section label="物资"><table-row><table-cell>帐篷</table-cell><table-cell>3 顶</table-cell></table-row></table-section></table>');
  def('table-row',{},'any','<table><table-row><table-cell>项目</table-cell><table-cell>数量</table-cell></table-row><table-row><table-cell>饮水</table-cell><table-cell>18 升</table-cell></table-row></table>');
  def('table-cell',{header:'bool'},'text',catalog['table-row'].example);
  def('list',{ordered:'bool'},'any','<list ordered>\n<list-item>确认人数与预算</list-item>\n<list-item>选择地点</list-item>\n<list-item>安排交通</list-item>\n</list>');
  def('list-item',{},'any',catalog.list.example);
  def('carousel',{label:'string'},'any','<carousel label="候选方案">\n<carousel-item title="室内工作坊">不受天气影响。</carousel-item>\n<carousel-item title="户外野餐">需要准备天气预案。</carousel-item>\n<carousel-item title="城市定向">适合小组协作。</carousel-item>\n</carousel>');
  def('carousel-item',{title:'string'},'any',catalog.carousel.example);
  def('carousel-media-item',{title:'string',image:'string'},'any','<carousel label="图形素材"><carousel-media-item title="圆形" image="circle">曲线轮廓</carousel-media-item><carousel-media-item title="三角形" image="triangle">三个顶点</carousel-media-item></carousel>');
  def('icon',{name:'string',label:'string',size:'enum:sm|md|lg'},false,'<row gap={3}><icon name="search" label="搜索"/><icon name="check" label="完成"/><icon name="calendar" label="日历"/></row>');
  def('favicon',{url:'string!',label:'string'},false,'<favicon url="https://www.openui.com" label="OpenUI"/>');
  def('image',{image:'string!',alt:'string',caption:'string'},false,'<image image="triangle" alt="三角形" caption="本机可靠插图素材"/>');
  def('search-image',{query:'string!',image:'string',alt:'string'},false,'<search-image query="圆形" image="circle" alt="圆形"/>');
  def('link',{href:'string!',label:'string'},'text','<link href="https://www.openui.com/blog/how-chatgpt-intelligent-ui-works">查看来源文章</link>');
  def('youtube',{videoId:'string!',title:'string'},false,'<youtube videoId="M7lc1UVf-VE" title="视频入口示例（点击才访问）"/>');
  def('svg',{shape:'enum:circle|triangle|square',label:'string'},false,'<svg shape="circle" label="圆形矢量示意"/>');
  def('html-view',{title:'string'},'text','<html-view title="HTML 源码展示">&lt;h1&gt;示例标题&lt;/h1&gt;</html-view>');
  def('popover',{label:'string'},'any','<popover label="查看费用说明"><popover-trigger>费用说明</popover-trigger><popover-content>预算为演示估算，不代表真实报价。</popover-content></popover>');
  def('popover-trigger',{},'text',catalog.popover.example);
  def('popover-content',{},'any',catalog.popover.example);
  def('tooltip',{content:'string!',label:'string'},'text','<tooltip content="解释缩写或补充口径">点击或悬浮查看说明</tooltip>');
  def('flashcard-flip',{front:'string!',back:'string!'},false,'<flashcard-flip front="DSL 是什么？" back="领域专用语言，用一套有限规则描述特定任务。"/>');
  for(const name of ['loading','loading-indicator','loading-block','pulse-indicator'])def(name,{label:'string'},false,`<${name} label="正在准备示例数据"/>`);
  def('lottie',{label:'string'},false,'<lottie label="动画能力的本地示意"/>');
  def('celebration',{label:'string'},false,'<celebration label="任务完成，点击庆祝"/>');
  for(const name of ['animate','animate-group','animate-item','transition'])def(name,{effect:'enum:fade|slide|scale'},'any',`<${name} effect="slide"><card padding={3}><title size="sm">新的内容已准备好</title><text>点击重播查看动画效果。</text></card></${name}>`);
  def('chart',{title:'string',type:'enum:bar|line|scatter',data:'string!',unit:'string'},false,'<chart title="示例参与人数" type="line" data="周一:12|周二:18|周三:15|周四:26" unit="人"/>');
  def('pie-chart',{title:'string',data:'string!',unit:'string'},false,'<pie-chart title="预算构成（示例）" data="餐饮:3000|场地:1500|物料:600" unit="元"/>');
  if(Object.keys(catalog).length!==70)throw new Error('Atomic catalog must cover all 70 evidence-linked names.');
  const p=(n,key,fall='')=>n.props[key]?.v??fall;
  const pv=(m,n,key,sc,fall='')=>n.props[key]?propVal(m,n.props[key],sc):fall;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const text=n=>n.children.filter(x=>x.type==='#text').map(x=>x.text).join('').trim();
  const URLfor=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u:null;}catch{return null;}};
  function install(){
    function fill(msg,node,key,target){node.children.forEach((child,i)=>{if(child.type==='#text')markdown(msg,child.text,target,key+'.t'+i);else{const rendered=renderNode(msg,child,key+'.'+i);if(rendered)target.append(rendered);}});return target;}
    function sentence(msg,node,tag,attrs={}){const el=h(tag,{class:'atom-text',...attrs});inline(msg,text(node),el);return el;}
    function styled(node,el){
      el.dataset.atom=node.type;
      const spacing=(key,f)=>clamp(p(node,key,f),0,12)*4;
      if(node.props.padding)el.style.padding=spacing('padding',0)+'px';
      if(node.props.gap)el.style.gap=spacing('gap',0)+'px';
      if(p(node,'border',false))el.classList.add('atom-border');
      const radius={none:0,sm:5,md:9,lg:14,xl:20}[p(node,'radius','md')];el.style.borderRadius=radius+'px';
      if(p(node,'background'))el.dataset.background=p(node,'background');
      if(p(node,'size'))el.dataset.size=p(node,'size');
      if(p(node,'color'))el.dataset.color=p(node,'color');
      if(p(node,'weight'))el.style.fontWeight={normal:400,medium:500,bold:700}[p(node,'weight')];
      return el;
    }
    function bound(msg,node,key,initial){const bind=p(node,'bind');const host=bind?msg.state:msg.ui;const name=bind||'atom:'+key;if(!Object.hasOwn(host,name))host[name]=initial;return{get:()=>host[name],set:value=>{host[name]=value;refresh(msg);}};}
    function control(msg,node,key,kind){
      const numeric=kind==='slider'||(kind==='input'&&p(node,'type')==='number');
      const minimum=Number(p(node,'min',0)),maximum=Math.max(minimum,Number(p(node,'max',100)));
      const initial=kind==='checkbox'?!!p(node,'default',false):numeric?(kind==='slider'?clamp(p(node,'default',minimum),minimum,maximum):Number(p(node,'default',0))||0):String(p(node,'default',''));
      const state=bound(msg,node,key,initial),id='atom-'+Math.random().toString(36).slice(2),label=p(node,'label',node.type),wrap=h('label',{class:'atom-control',for:id});
      const el=h(kind==='textarea'?'textarea':'input',{id,type:kind==='date-picker'?'date':kind==='slider'?'range':kind==='checkbox'?'checkbox':p(node,'type','text'),'aria-label':label,placeholder:p(node,'placeholder'),disabled:!!p(node,'disabled',false)});
      if(kind==='textarea')el.rows=clamp(p(node,'rows',3),1,12);
      if(kind==='slider'){el.min=minimum;el.max=maximum;el.step=Math.max(0.001,Number(p(node,'step',1)));}
      if(kind==='date-picker'){if(p(node,'min'))el.min=p(node,'min');if(p(node,'max'))el.max=p(node,'max');}
      const readout=h('output');
      const update=()=>{const value=kind==='checkbox'?el.checked:numeric?(kind==='slider'?clamp(el.value,minimum,maximum):Number(el.value)||0):el.value;state.set(value);};
      el.addEventListener(kind==='checkbox'||kind==='date-picker'?'change':'input',update);
      msg.updaters.push(()=>{if(kind==='checkbox')el.checked=!!state.get();else if(String(el.value)!==String(state.get()))el.value=state.get();if(kind==='slider')readout.value=fmt(state.get())+' '+p(node,'unit');});
      if(kind==='checkbox')wrap.append(el,h('span',null,label));else{wrap.append(h('span',null,label),el);if(kind==='slider')wrap.append(readout);}
      return styled(node,wrap);
    }
    const renderers={};
    for(const name of ['box','row','col','card','grid','grid-item','flow','flow-item'])renderers[name]=(msg,node,key)=>{const el=fill(msg,node,key,h('div',{class:'atom-layout atom-'+name}));if(name==='grid')el.style.gridTemplateColumns=`repeat(${clamp(p(node,'columns',2),1,6)},minmax(0,1fr))`;if(name==='grid-item'&&p(node,'span'))el.style.gridColumn='span '+clamp(p(node,'span'),1,6);if(p(node,'align'))el.style.alignItems={start:'flex-start',center:'center',end:'flex-end'}[p(node,'align')];if(p(node,'justify'))el.style.justifyContent={start:'flex-start',center:'center',end:'flex-end',between:'space-between'}[p(node,'justify')];return styled(node,el);};
    renderers.divider=(_,node)=>styled(node,h('hr',{class:'atom-divider'}));
    renderers.spacer=(_,node)=>{const el=h('div',{'aria-hidden':'true',class:'atom-spacer'});el.style.height=clamp(p(node,'size',4),0,24)*4+'px';return styled(node,el);};
    const textTags={text:'p',title:'h3',caption:'small',bold:'strong',italic:'em',underline:'u',strikethrough:'s',blockquote:'blockquote',label:'label',math:'div','shimmer-text':'p'};
    for(const [name,tag]of Object.entries(textTags))renderers[name]=(m,n)=>styled(n,sentence(m,n,tag,{class:'atom-text atom-'+name}));
    renderers.markdown=(m,n,k)=>{const el=h('div',{class:'atom-markdown'});markdown(m,text(n),el,k);return styled(n,el);};
    renderers.code=(m,n)=>styled(n,h('pre',{class:'atom-code'},h('code',null,text(n))));
    renderers.badge=(m,n)=>styled(n,sentence(m,n,'span',{class:'atom-badge tone-'+p(n,'tone','neutral')}));
    renderers.button=(msg,n)=>{let count=0;const button=h('button',{class:'primary small',type:p(n,'submit',false)?'submit':'button',disabled:!!p(n,'disabled',false)},p(n,'text')||text(n)||'继续');const status=h('span',{class:'atom-action-status',role:'status'});button.addEventListener('click',()=>{if(p(n,'submit',false))return;if(p(n,'prompt'))ask(msg,interp(p(n,'prompt'),computeScope(msg)));else status.textContent='已点击 '+(++count)+' 次';});return styled(n,h('div',{class:'atom-action'},button,status));};
    renderers.pressable=(m,n,k)=>{const el=fill(m,n,k,h('button',{class:'atom-pressable',type:'button','aria-label':p(n,'label','可点击区域'),'aria-pressed':'false'}));el.addEventListener('click',()=>{if(p(n,'prompt'))ask(m,interp(p(n,'prompt'),computeScope(m)));else el.setAttribute('aria-pressed',el.getAttribute('aria-pressed')==='true'?'false':'true');});return styled(n,el);};
    for(const kind of ['input','textarea','checkbox','slider','date-picker'])renderers[kind]=(m,n,k)=>control(m,n,k,kind);
    for(const name of ['select','radio-group','segmented-control'])renderers[name]=(m,n,k)=>{
      const options=p(n,'options').split('|').map(s=>s.trim()).filter(Boolean);const state=bound(m,n,k,p(n,'default',options[0]||''));const label=p(n,'label','选择'),group=h('div',{class:'atom-choice-group'},h('span',{class:'atom-choice-label'},label));
      if(name==='select'){const select=h('select',{'aria-label':label,disabled:!!p(n,'disabled',false)},options.map(o=>h('option',{value:o},o)));select.addEventListener('change',()=>state.set(select.value));m.updaters.push(()=>select.value=state.get());group.append(select);}
      else{const controls=options.map(option=>h('button',{type:'button',class:'atom-choice',disabled:!!p(n,'disabled',false),onclick:()=>state.set(option)},option));m.updaters.push(()=>controls.forEach((button,i)=>button.setAttribute('aria-pressed',String(options[i]===state.get()))));group.append(h('div',{class:name==='segmented-control'?'atom-segment':'atom-radios',role:'group','aria-label':label},controls));}
      return styled(n,group);
    };
    renderers.radio=(m,n,k)=>{const state=bound(m,n,k,p(n,'default','')),value=p(n,'value',p(n,'label')),input=h('input',{type:'radio',name:p(n,'bind','radio-'+k),value,'aria-label':p(n,'label',value)});input.addEventListener('change',()=>{if(input.checked)state.set(value);});m.updaters.push(()=>input.checked=state.get()===value);return styled(n,h('label',{class:'atom-radio'},input,p(n,'label',value)));};
    renderers.form=(m,n,k)=>{const el=fill(m,n,k,h('form',{class:'atom-form'}));if(p(n,'title'))el.prepend(h('h4',null,p(n,'title')));el.append(h('button',{type:'submit',class:'primary small'},p(n,'submit','提交')));el.addEventListener('submit',event=>{event.preventDefault();ask(m,p(n,'prompt','请根据当前填写的信息继续。'));});return styled(n,el);};
    renderers.table=(m,n,k)=>{const table=h('table',{class:'atom-table'});if(p(n,'head'))table.append(h('thead',null,h('tr',null,p(n,'head').split('|').map(v=>h('th',{scope:'col'},v)))));if(p(n,'rows'))table.append(h('tbody',null,p(n,'rows').split(';').map(row=>h('tr',null,row.split('|').map((value,i)=>h(i===0?'th':'td',i===0?{scope:'row'}:null,value))))));if(n.children.some(c=>c.type!=='#text'))fill(m,n,k,table);return styled(n,h('div',{class:'atom-table-wrap'},table));};
    renderers['table-section']=(m,n,k)=>{const el=fill(m,n,k,h('tbody'));if(p(n,'label'))el.prepend(h('tr',null,h('th',{colspan:20,scope:'rowgroup'},p(n,'label'))));return styled(n,el);};
    renderers['table-row']=(m,n,k)=>styled(n,fill(m,n,k,h('tr')));
    renderers['table-cell']=(m,n)=>styled(n,sentence(m,n,p(n,'header',false)?'th':'td'));
    renderers.list=(m,n,k)=>styled(n,fill(m,n,k,h(p(n,'ordered',false)?'ol':'ul',{class:'atom-list'})));
    renderers['list-item']=(m,n,k)=>styled(n,fill(m,n,k,h('li')));
    renderers.carousel=(m,n,k)=>{const track=fill(m,n,k,h('div',{class:'atom-carousel-track',tabindex:0,'aria-label':p(n,'label','轮播内容')}));const back=h('button',{class:'ghost small',type:'button','aria-label':'上一项',onclick:()=>track.scrollBy({left:-240,behavior:'smooth'})},'←'),next=h('button',{class:'ghost small',type:'button','aria-label':'下一项',onclick:()=>track.scrollBy({left:240,behavior:'smooth'})},'→');return styled(n,h('section',{class:'atom-carousel'},h('div',{class:'atom-carousel-head'},h('strong',null,p(n,'label','候选项')),h('span',null,back,next)),track));};
    for(const name of ['carousel-item','carousel-media-item'])renderers[name]=(m,n,k)=>{const el=h('article',{class:'atom-carousel-item'});if(name==='carousel-media-item'){const item=DemoExtensions.media[p(n,'image')];if(item)el.append(h('img',{src:item.src,alt:item.subject}));else el.append(h('p',null,'没有已核实的对应图片'));}if(p(n,'title'))el.append(h('strong',null,p(n,'title')));fill(m,n,k,el);return styled(n,el);};
    const icons={search:'⌕',check:'✓',calendar:'▦',star:'☆',info:'ⓘ',heart:'♡',arrow:'→',settings:'⚙',copy:'▣',play:'▶',image:'▧',location:'⌖'};
    renderers.icon=(_,n)=>styled(n,h('span',{class:'atom-icon',role:'img','aria-label':p(n,'label',p(n,'name'))},icons[p(n,'name')]||'◇'));
    renderers.favicon=(_,n)=>{const url=URLfor(p(n,'url'));return styled(n,h('span',{class:'atom-favicon',title:url?.hostname||p(n,'label')},(url?.hostname||'?').replace(/^www\./,'').slice(0,1).toUpperCase()));};
    for(const name of ['image','search-image'])renderers[name]=(m,n)=>{const id=p(n,'image'),item=DemoExtensions.media[id]||Object.values(DemoExtensions.media).find(x=>name==='search-image'&&x.subject===p(n,'query'));if(!item)return styled(n,h('p',{class:'atom-limited'},'没有匹配的已添加素材：'+p(n,'query',id)+'。不伪造图片或搜索结果。'));const figure=h('figure',{class:'atom-image'},h('img',{src:item.src,alt:p(n,'alt',item.subject),onerror:()=>figure.replaceChildren(h('p',null,'图片加载失败：'+item.subject))}),p(n,'caption')?h('figcaption',null,p(n,'caption')):null);return styled(n,figure);};
    renderers.link=(m,n)=>{const url=URLfor(p(n,'href')),label=p(n,'label')||text(n)||p(n,'href');return styled(n,url?h('a',{class:'atom-link',href:url.href,target:'_blank',rel:'noopener noreferrer'},label):h('span',null,label+'（无有效链接）'));};
    renderers.youtube=(_,n)=>{const id=p(n,'videoId'),valid=/^[A-Za-z0-9_-]{11}$/.test(id);return styled(n,h('div',{class:'atom-video'},h('span',{'aria-hidden':'true'},'▶'),h('strong',null,p(n,'title','视频入口')),valid?h('a',{href:'https://www.youtube.com/watch?v='+id,target:'_blank',rel:'noopener noreferrer'},'打开视频（不自动加载播放器）'):h('p',null,'无效的视频 ID')));};
    renderers.svg=(_,n)=>{const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 240 140');svg.setAttribute('role','img');svg.setAttribute('aria-label',p(n,'label','简化形状'));svg.setAttribute('class','atom-svg');let shape;const kind=p(n,'shape','circle');if(kind==='circle'){shape=document.createElementNS(ns,'circle');shape.setAttribute('cx',120);shape.setAttribute('cy',70);shape.setAttribute('r',48);}else if(kind==='square'){shape=document.createElementNS(ns,'rect');shape.setAttribute('x',72);shape.setAttribute('y',22);shape.setAttribute('width',96);shape.setAttribute('height',96);}else{shape=document.createElementNS(ns,'path');shape.setAttribute('d','M120 15 L183 120 L57 120 Z');}shape.setAttribute('fill','currentColor');svg.append(shape);return styled(n,svg);};
    renderers['html-view']=(_,n)=>styled(n,h('section',{class:'atom-html-view'},h('strong',null,p(n,'title','HTML 视图')),h('p',{class:'atom-limited'},'本地仅展示源文本，不执行任意 HTML 或 JavaScript。'),h('pre',{class:'atom-code'},text(n))));
    renderers.popover=(m,n,k)=>{const trigger=n.children.find(c=>c.type==='popover-trigger'),content=n.children.filter(c=>c.type!=='popover-trigger');const body=fill(m,{...n,children:content},k,h('div',{class:'atom-popover-body'}));return styled(n,h('details',{class:'atom-popover'},h('summary',null,trigger?text(trigger):p(n,'label','查看详情')),body));};
    renderers['popover-trigger']=(m,n)=>styled(n,sentence(m,n,'span',{class:'atom-popover-trigger'}));
    renderers['popover-content']=(m,n,k)=>styled(n,fill(m,n,k,h('div',{class:'atom-popover-content'})));
    renderers.tooltip=(m,n)=>{const body=h('span',{class:'atom-tooltip-content',role:'tooltip',hidden:true},p(n,'content'));const button=h('button',{type:'button',class:'ghost small',title:p(n,'content'),'aria-expanded':'false',onclick:()=>{body.hidden=!body.hidden;button.setAttribute('aria-expanded',String(!body.hidden));}},p(n,'label')||text(n)||'查看解释');return styled(n,h('div',{class:'atom-tooltip'},button,body));};
    renderers['flashcard-flip']=(m,n,k)=>{const slot='flash:'+k;if(m.ui[slot]==null)m.ui[slot]=false;const button=h('button',{type:'button',class:'atom-flashcard','aria-label':'翻转学习卡',onclick:()=>{m.ui[slot]=!m.ui[slot];paint();}});function paint(){button.replaceChildren(h('small',null,m.ui[slot]?'答案 · 再点返回':'问题 · 点击翻面'),h('strong',null,p(n,m.ui[slot]?'back':'front')));button.setAttribute('aria-pressed',String(m.ui[slot]));}paint();return styled(n,button);};
    for(const name of ['loading','loading-indicator','loading-block','pulse-indicator'])renderers[name]=(_,n)=>styled(n,h('div',{class:'atom-status atom-'+name,role:'status'},h('span',{class:name==='loading-block'?'atom-skeleton':'atom-spinner','aria-hidden':'true'}),h('span',null,p(n,'label','正在加载'))));
    renderers.lottie=(_,n)=>{const dot=h('span',{class:'atom-lottie-shape','aria-hidden':'true'},'◇'),button=h('button',{type:'button',class:'ghost small',onclick:()=>{const paused=dot.style.animationPlayState==='paused';dot.style.animationPlayState=paused?'running':'paused';button.textContent=paused?'暂停':'播放';}},'暂停');return styled(n,h('div',{class:'atom-lottie'},dot,h('small',null,p(n,'label','本地动画示意')+' · CSS 映射，非 Lottie 文件解析'),button));};
    renderers.celebration=(_,n)=>{const output=h('div',{class:'atom-confetti','aria-hidden':'true'},'✦  ✧  ✦  ✧  ✦'),button=h('button',{type:'button',class:'primary small',onclick:()=>{output.classList.remove('play');void output.offsetWidth;output.classList.add('play');}},p(n,'label','庆祝完成'));return styled(n,h('div',{class:'atom-celebration'},output,button));};
    for(const name of ['animate','animate-group','animate-item','transition'])renderers[name]=(m,n,k)=>{const content=fill(m,n,k,h('div',{class:'atom-motion-content atom-effect-'+p(n,'effect','fade')}));const replay=h('button',{type:'button',class:'ghost small',onclick:()=>{content.classList.remove('play');void content.offsetWidth;content.classList.add('play');}},'重播动画');content.classList.add('play');return styled(n,h('div',{class:'atom-motion'},content,replay));};
    function data(n){return p(n,'data').split('|').map(part=>{const at=part.lastIndexOf(':');return{label:part.slice(0,at),value:Number(part.slice(at+1))};}).filter(v=>v.label&&Number.isFinite(v.value));}
    renderers.chart=(m,n)=>{const values=data(n),mode=p(n,'type','bar'),max=Math.max(...values.map(x=>Math.abs(x.value)),1),min=Math.min(...values.map(x=>x.value),0),range=max-min||1,readout=h('p',{class:'atom-chart-readout',role:'status'},'点击数据项查看数值');const section=h('section',{class:'atom-chart'},h('h4',null,p(n,'title','图表')),h('small',null,'本地单序列 '+mode+' 图映射，数据由当前描述提供。'));if(!values.length)return h('p',null,'没有有效图表数据');
      if(mode==='bar'){section.append(h('div',{class:'atom-bars'},values.map(v=>h('button',{type:'button',class:'atom-bar',onclick:()=>{readout.textContent=v.label+'：'+v.value+' '+p(n,'unit');}},h('span',null,v.label),h('i',{style:'width:'+Math.max(2,Math.abs(v.value)/max*100)+'%'}),h('strong',null,v.value)))));}
      else{const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 400 180');svg.setAttribute('class','atom-line-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',values.map(v=>v.label+' '+v.value).join('，'));const coords=values.map((v,i)=>({x:30+i/Math.max(1,values.length-1)*340,y:145-(v.value-min)/range*120}));if(mode==='line'){const path=document.createElementNS(ns,'path');path.setAttribute('d',coords.map((v,i)=>(i?'L':'M')+v.x+' '+v.y).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','3');svg.append(path);}coords.forEach((point,i)=>{const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',point.x);circle.setAttribute('cy',point.y);circle.setAttribute('r',5);circle.setAttribute('fill','currentColor');circle.setAttribute('tabindex','0');circle.setAttribute('role','button');circle.setAttribute('aria-label',values[i].label+' '+values[i].value);const pick=()=>{readout.textContent=values[i].label+'：'+values[i].value+' '+p(n,'unit');};circle.addEventListener('click',pick);circle.addEventListener('keydown',e=>{if(e.key==='Enter')pick();});svg.append(circle);const label=document.createElementNS(ns,'text');label.setAttribute('x',point.x);label.setAttribute('y',169);label.setAttribute('text-anchor','middle');label.setAttribute('font-size',11);label.setAttribute('fill','currentColor');label.textContent=values[i].label;svg.append(label);});section.append(svg);}
      section.append(readout,h('small',null,values.map(v=>v.label+' '+v.value).join(' · ')));return styled(n,section);
    };
    renderers['pie-chart']=(m,n)=>{const values=data(n).filter(v=>v.value>=0),sum=values.reduce((a,v)=>a+v.value,0),palette=['#4466df','#26a081','#d5a03c','#ab65c5','#d06861'];if(!sum)return h('p',null,'占比总和需大于零');let start=0;const gradient=values.map((v,i)=>{const end=start+v.value/sum*100,part=`${palette[i%5]} ${start}% ${end}%`;start=end;return part;}).join(',');const chart=h('div',{class:'atom-pie',style:'background:conic-gradient('+gradient+')',role:'img','aria-label':values.map(v=>`${v.label} ${Math.round(v.value/sum*100)}%`).join('，')});return styled(n,h('section',{class:'atom-chart'},h('h4',null,p(n,'title','占比')),h('div',{class:'atom-pie-layout'},chart,h('ul',null,values.map((v,i)=>h('li',null,h('span',{style:'color:'+palette[i%5]},'● '),v.label+' '+v.value+' '+p(n,'unit')+' · '+Math.round(v.value/sum*100)+'%'))))));};
    for(const name of Object.keys(catalog)){if(!renderers[name])throw new Error('Missing local renderer: '+name);R[name]=renderers[name];}
  }
  function textExport(n,sc,out){if(!catalog[n.type])return false;const b=p(n,'bind');if(b&&Object.hasOwn(sc,b))out.push(p(n,'label',n.type)+'：'+fmt(sc[b]));for(const k of ['label','title','caption','front','back','content','data','head','rows','href','query'])if(p(n,k))out.push(String(p(n,k)));for(const c of n.children||[])if(c.type==='#text'){const value=c.text.trim();if(value)out.push(interp(value,sc));}else textOf(c,sc,out);return true;}
  const demos=[
    {id:'atom-composition',q:'用原子组件组合一个人数与价格联动的小工具',comps:['box','row','slider','text','badge'],dsl:'这是本地原子组件组合演示，价格为假设值。\n<box border padding={4} gap={3}><row gap={2}><title size="lg">团队套餐</title><badge tone="accent">示例估算</badge></row><slider bind="seats" label="团队人数" min={1} max={50} default={8} unit="人"/><text size="lg">每月合计：{seats * 29} 元</text><caption>假设每人每月29元；拖动滑块本地更新，无需再次调用模型。</caption></box>'},
    {id:'atom-controls',q:'体验原子输入控件：日期、下拉、复选框和文本输入',comps:['date-picker','select','checkbox','input'],dsl:'这些控件由本地实现，状态可以随下一轮问题传给模型。\n<card border padding={3} gap={3}><input bind="guestName" label="姓名"/><date-picker bind="visitDate" label="出行日期" default="2026-10-26"/><select bind="travelMode" label="出行方式" options="步行|公交|骑行" default="公交"/><checkbox bind="needGuide" label="需要讲解"/><text>已选日期：{visitDate}；方式：{travelMode}</text></card>'},
    {id:'atom-overlay',q:'演示弹出说明、提示、翻转卡和轮播的原子组合',comps:['popover','tooltip','flashcard-flip','carousel'],dsl:'无需调用模型即可展开说明、翻转卡片或浏览候选项。\n'+catalog.popover.example+'\n'+catalog.tooltip.example+'\n'+catalog['flashcard-flip'].example+'\n'+catalog.carousel.example},
    {id:'atom-charts',q:'用原子图表展示虚构的参与人数和预算分配',comps:['chart','pie-chart'],dsl:'以下均为虚构演示数据。\n'+catalog.chart.example+'\n'+catalog['pie-chart'].example},
  ];
  return {catalog,install,textExport,demos,inventory};
})();
if(typeof module!=='undefined')module.exports=AtomicKit;
