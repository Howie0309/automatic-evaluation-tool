/* 生成式 UI 扩展：声明、渲染、演示和局部更新共用一个组件目录。 */
'use strict';
const DemoExtensions = (() => {
  const catalog = {
    ImageList: {cat:'图文模板',desc:'至少三个可视实体的图文分类卡，双端均为左图右文。仅使用素材库中与对象同名的图片；任一缺图或失败时整组保留全部文字并退化。',props:{title:'string'},children:['ImageCard'],example:'<ImageList title="认识几何图形">\n<ImageCard title="圆形" subtitle="曲线轮廓" image="circle">边界是一条闭合曲线，没有顶点。</ImageCard>\n<ImageCard title="三角形" subtitle="三条边" image="triangle">由三条线段围成，有三个顶点。</ImageCard>\n<ImageCard title="正方形" subtitle="四边等长" image="square">四条边相等，四个角都是直角。</ImageCard>\n</ImageList>'},
    ImageCard: {cat:'图文模板',child:true,desc:'一个对象，正文保持相同描述维度；image 填素材 ID，title 必须与素材对象名一致。',props:{title:'string!',subtitle:'string',image:'string'},children:'text'},
    ImageCompare: {cat:'图文模板',desc:'恰好两个对象，左右并排实拍图、图下标题和简介。缺少任一可靠实拍图整组退为文字；超过两个对象按分类列表展示。可在后面衔接 DataTable。',props:{title:'string'},children:['ImageCard'],example:'<ImageCompare title="两款相机对比（无素材时退化演示）">\n<ImageCard title="相机 A" subtitle="示例对象">机身轻便，适合日常随拍。</ImageCard>\n<ImageCard title="相机 B" subtitle="示例对象">握持空间更大，适合搭配较重镜头。</ImageCard>\n</ImageCompare>'},
    GuideSteps: {cat:'内容模板',desc:'操作指南，纵向左图标右文。每步正文交代在哪里、做什么和注意事项。任一步图标不在支持列表中则整组使用文本步骤，信息不减。',props:{title:'string'},children:['GuideStep'],example:'<GuideSteps title="配置自己的模型">\n<GuideStep title="打开设置" icon="settings">点击页面顶部的 API 设置，选择 OneAPI / New API。</GuideStep>\n<GuideStep title="填写接口" icon="edit">输入网关基础地址、可用模型名和令牌；不要把聊天路径填进基础地址。</GuideStep>\n<GuideStep title="保存并体验" icon="check">保存后切到实时生成，发送一个预算工具需求。</GuideStep>\n</GuideSteps>'},
    GuideStep: {cat:'内容模板',child:true,desc:'一步操作。icon 支持 phone/search/edit/check/settings/upload。link 仅填用户提供或已核实的平台官方入口，不可猜测。',props:{title:'string!',icon:'string',link:'string',linkLabel:'string'},children:'text'},
    EventTimeline: {cat:'内容模板',desc:'确切日期的事件时间轴。grain=year/month/day，全组 time 格式必须统一为 YYYY / YYYY-MM / YYYY-MM-DD；缺失或无效整组退为文本，保留所有节点。不编造日期。',props:{title:'string',grain:'enum:year|month|day'},children:['Event'],example:'<EventTimeline title="示例项目历程（虚构数据）" grain="day">\n<Event time="2026-10-12" title="完成原型">团队完成第一版界面，并整理试用反馈。</Event>\n<Event time="2026-10-19" title="接入网关">完成兼容接口的请求转发。</Event>\n<Event time="2026-10-22" title="扩展组件">加入新的内容模板和交互工具。</Event>\n</EventTimeline>'},
    Event: {cat:'内容模板',child:true,desc:'一个事件，正文写清谁在哪里做了什么及直接结果。',props:{time:'string',title:'string!'},children:'text'},
    RelationDiagram: {cat:'关系示意',desc:'用色块、名称、箭头说明一个已确定的关系；标题自动附“示意图”。每个对象用稳定颜色。不能表达精确形态、比例和空间位置；这类场景 precise=true 整组退为文字。',props:{title:'string!',precise:'bool'},children:['DiagramNode','DiagramEdge'],example:'<RelationDiagram title="本机模型请求过程">\n<DiagramNode id="browser" label="浏览器" x={18} y={35}>收集问题并展示界面。</DiagramNode>\n<DiagramNode id="proxy" label="本地服务" x={50} y={70}>保存密钥，转换请求。</DiagramNode>\n<DiagramNode id="gateway" label="OneAPI" x={82} y={35}>按模型名称转发请求。</DiagramNode>\n<DiagramEdge from="browser" to="proxy" label="问题"/>\n<DiagramEdge from="proxy" to="gateway" label="模型调用"/>\n</RelationDiagram>'},
    DiagramNode: {cat:'关系示意',child:true,desc:'有名称的关系对象，x/y 为 10–90 的简化布局坐标。点击对象显示正文说明。',props:{id:'ident!',label:'string!',x:'number',y:'number'},children:'text'},
    DiagramEdge: {cat:'关系示意',child:true,desc:'对象之间的一条有向关系，from/to 引用节点 id。',props:{from:'ident!',to:'ident!',label:'string!'},children:false},
    DataTable: {cat:'内容模板',desc:'生成式表格。至少两个对象、每个对象至少两个对齐属性。head 用 | 分隔；每行 DataRow 的 values 同样分隔。一张表最多一个 markColumn（从 1 起），markMode 只能选 symbol 或 accent。颜色仅表示重点，不表示好坏。未知状态不装饰。',props:{title:'string',head:'string!',markColumn:'number',markMode:'enum:text|symbol|accent'},children:['DataRow'],example:'<DataTable title="虚构方案参数" head="方案|准备时间|适用人数|准备状态" markColumn={4} markMode="symbol">\n<DataRow values="室内活动|1 小时|30 人|已准备" status="yes"/>\n<DataRow values="户外活动|2 小时|30 人|待确认" status="warn"/>\n</DataTable>'},
    DataRow: {cat:'内容模板',child:true,desc:'一行对齐属性。status 为 yes/no/warn 时可增强指定列；其他状态退为文字。',props:{values:'string!',status:'string'},children:false},
    BudgetTable: {cat:'交互工具',desc:'可编辑预算表，稳定 bind 和每行 id 用于多轮局部修改。用户可编辑数量、单价和锁定行。锁定后模型不能修改该行。people/cap/total/rows 会回传。perPerson 行的数量随人数等比例变化，锁定行除外。',props:{bind:'ident!',title:'string',people:'number',cap:'number',currency:'string'},children:['BudgetItem'],example:'<BudgetTable bind="budget" title="团建预算（示例估算）" people={30} cap={6000} currency="元">\n<BudgetItem id="food" name="餐饮" quantity={30} price={100} perPerson/>\n<BudgetItem id="venue" name="场地" quantity={1} price={1500}/>\n<BudgetItem id="supplies" name="物料" quantity={30} price={20} perPerson/>\n</BudgetTable>\n<Button text="增加交通费，人数改为 40" prompt="保留现有编辑和锁定行，将人数改为40，再增加一项交通费，1辆车800元。请用 Patch 局部更新 budget。"/>'},
    BudgetItem: {cat:'交互工具',child:true,desc:'预算项目，id 必须稳定且唯一，quantity/price 为非负数。perPerson 表示数量随人数等比例变化。',props:{id:'ident!',name:'string!',quantity:'number!',price:'number!',perPerson:'bool'},children:false},
    OptionCompare: {cat:'交互工具',desc:'加权方案比较器，权重可拖动。Criterion 声明维度及权重，Option 给对应 0–10 分数。仅用用户提供的数据，或明确标为示例。排名按加权均分计算，不能当成外部事实。',props:{bind:'ident!',title:'string'},children:['Criterion','Option'],example:'<OptionCompare bind="options" title="活动方案比较（虚构评分）">\n<Criterion label="预算友好" weight={50}/>\n<Criterion label="参与体验" weight={30}/>\n<Criterion label="天气适应" weight={20}/>\n<Option name="室内工作坊" scores="7|8|10"/>\n<Option name="户外野餐" scores="9|9|3"/>\n<Option name="城市定向" scores="6|9|6"/>\n</OptionCompare>'},
    Criterion: {cat:'交互工具',child:true,desc:'比较维度及默认非负权重。',props:{label:'string!',weight:'number!'},children:false},
    Option: {cat:'交互工具',child:true,desc:'一个方案，各维度评分按 Criterion 顺序以 | 分隔，每项 0–10。',props:{name:'string!',scores:'string!'},children:false},
    Schedule: {cat:'交互工具',desc:'一周排程。修改任务日期、开始时间和时长会检查重叠及依赖；桌面端可将任务拖到其他日期。start 为 ISO 日期。bind 状态会回传。',props:{bind:'ident!',title:'string',start:'string!'},children:['Task'],example:'<Schedule bind="schedule" title="发布周排程（示例）" start="2026-10-26">\n<Task id="design" title="方案评审" date="2026-10-26" time="09:00" minutes={60}/>\n<Task id="build" title="制作原型" date="2026-10-26" time="09:30" minutes={90} after="design"/>\n<Task id="test" title="试用验证" date="2026-10-27" time="14:00" minutes={60} after="build"/>\n</Schedule>'},
    Task: {cat:'交互工具',child:true,desc:'任务 id 稳定，date=YYYY-MM-DD，time=HH:mm，minutes 为正数，after 可引用一个前置任务 id。',props:{id:'ident!',title:'string!',date:'string!',time:'string!',minutes:'number!',after:'ident'},children:false},
    ImagePanel: {cat:'交互工具',desc:'带标注的图片面板，image 只能引用素材 ID 或 user（用户本次上传图片）。标注 x/y 为百分比，模型不可声称示意坐标是精确检测结果。缺图退为标注文字。',props:{title:'string',image:'string!'},children:['ImagePoint'],example:'<ImagePanel title="三角形结构标注（示意坐标）" image="triangle">\n<ImagePoint label="顶点" x={50} y={16}>两条边相接的位置。</ImagePoint>\n<ImagePoint label="底边" x={50} y={80}>本图下方的这条线段。</ImagePoint>\n</ImagePanel>'},
    ImagePoint: {cat:'交互工具',child:true,desc:'点击标注查看说明。x/y 在 0–100 范围内。',props:{label:'string!',x:'number!',y:'number!'},children:'text'},
    QueueSimulator: {cat:'交互工具',desc:'单队列的简化离散模拟，可调到达人数、每窗口处理能力和窗口数。每一步为一分钟，显示队列变化；非现实预测。',props:{bind:'ident!',title:'string',arrival:'number',service:'number',windows:'number'},children:false,example:'<QueueSimulator bind="queue" title="咖啡店排队模拟" arrival={8} service={3} windows={2}/>'},
    Patch: {cat:'局部更新',desc:'只在修改已有 BudgetTable 时使用，不重新输出整个预算表。target 填原 bind。op=set 可改 people/cap 或指定 row 的 quantity/price/name；op=add 需 row/name/quantity/price；op=remove 需 row。锁定行禁止修改。多条 Patch 作为一组验证，失败不会部分应用。',props:{target:'ident!',op:'enum:set|add|remove!',row:'ident',field:'enum:people|cap|quantity|price|name',value:'any',name:'string',quantity:'number',price:'number'},children:false,example:undefined},
  };
  const media = {
    circle:{subject:'圆形',kind:'illustration',src:'/assets/circle.svg'},
    triangle:{subject:'三角形',kind:'illustration',src:'/assets/triangle.svg'},
    square:{subject:'正方形',kind:'illustration',src:'/assets/square.svg'},
  };
  const icons={phone:'▣',search:'⌕',edit:'✎',check:'✓',settings:'⚙',upload:'↑'};
  const colors=['#4254cf','#18826a','#b57814','#9960bb','#bd5745'];
  const p=(n,k,f='')=>n.props[k]?n.props[k].v:f;
  const children=(n,type)=>n.children.filter(c=>c.type===type);
  const finite=(v,min=0,max=1e9)=>Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
  const num=(n,k,f=0)=>Number(p(n,k,f));
  const text=n=>n.children.filter(c=>c.type==='#text').map(c=>c.text).join('').trim();
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const validDate=(value,grain='day')=>{
    const pattern={year:/^\d{4}$/,month:/^\d{4}-\d{2}$/,day:/^\d{4}-\d{2}-\d{2}$/}[grain];
    if(!pattern||!pattern.test(value))return false;
    const iso=value+(grain==='year'?'-01-01':grain==='month'?'-01':'');
    const date=new Date(iso+'T00:00:00Z');
    return Number.isFinite(+date)&&date.toISOString().slice(0,10)===iso;
  };
  function source(id,subject,photo=false){const m=media[id];return m&&(!subject||m.subject===subject)&&(!photo||m.kind==='photo')?m:null;}
  function materialPrompt(){return '\n\n## 可用图片素材\n'+Object.entries(media).map(([id,m])=>`- image="${id}"：对象名称必须为“${m.subject}”；类型 ${m.kind==='photo'?'用户提供的实拍照片':'简化插图'}。`).join('\n')+'\n- 不得编造图片 URL、来源或对象对应关系。没有匹配素材时省略 image，整组降级。用户最近上传的图片可在 ImagePanel 中用 image="user"。';}
  function install(){
    const block=(n,...kids)=>h('section',{class:'block extended'},p(n,'title')?h('h4',{class:'ext-title'},p(n,'title')):null,...kids);
    const body=(msg,node)=>{const el=h('p');inline(msg,text(node),el);return el;};
    const fallback=(msg,n,items,reason)=>block(n,h('p',{class:'fallback-note'},reason),h('div',{class:'text-items'},items.map(c=>h('article',null,h('strong',null,p(c,'time')?p(c,'time')+' · '+p(c,'title'):p(c,'title',p(c,'label',''))),p(c,'subtitle')?h('small',null,p(c,'subtitle')):null,body(msg,c)))));
    const table=(head,rows)=>h('div',{class:'ext-table-wrap'},h('table',{class:'ext-table'},h('thead',null,h('tr',null,head.map(x=>h('th',{scope:'col'},x)))),h('tbody',null,rows.map(row=>h('tr',null,row.map((x,i)=>h(i===0?'th':'td',i===0?{scope:'row'}:null,x)))))));
    const renderImages=(msg,n,comparison)=>{
      const cards=children(n,'ImageCard'),compare=comparison&&cards.length===2;
      const min=compare?2:3;
      const images=cards.map(c=>source(p(c,'image'),p(c,'title'),compare));
      let el;
      const degrade=()=>{const fallbackEl=fallback(msg,n,cards,'图文已转为文字：素材不完整或不满足模板条件。');if(el){el.className=fallbackEl.className;el.replaceChildren(...fallbackEl.childNodes);}else el=fallbackEl;};
      if(cards.length<min||images.some(x=>!x)){degrade();return el;}
      const articles=cards.map((c,i)=>h('article',{class:'image-card'},h('img',{src:images[i].src,alt:p(c,'title'),loading:'lazy',onerror:degrade}),h('div',null,h('strong',null,p(c,'title')),p(c,'subtitle')?h('small',null,p(c,'subtitle')):null,body(msg,c))));
      el=block(n,h('div',{class:compare?'image-compare':'image-list'},articles));return el;
    };
    Object.assign(R,{
      ImageList:(msg,n)=>renderImages(msg,n,false),
      ImageCompare:(msg,n)=>renderImages(msg,n,true),
      GuideSteps(msg,n){const steps=children(n,'GuideStep'),withIcons=steps.length&&steps.every(s=>icons[p(s,'icon')]);
        return block(n,h('ol',{class:'guide-steps'+(withIcons?'':' plain')},steps.map((s,i)=>{
          const link=p(s,'link');let safeURL;try{const u=new URL(link);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password)safeURL=u.href;}catch{}
          return h('li',null,withIcons?h('span',{class:'guide-icon','aria-hidden':'true'},icons[p(s,'icon')]):null,h('div',null,h('strong',null,`${i+1}、${p(s,'title')}`),body(msg,s),link?(safeURL?h('a',{href:safeURL,target:'_blank',rel:'noopener noreferrer'},p(s,'linkLabel','平台入口')):h('span',null,'入口：'+link)):null));
        })));
      },
      EventTimeline(msg,n){const events=children(n,'Event'),grain=p(n,'grain','day');if(!events.length||events.some(s=>!validDate(p(s,'time'),grain)))return fallback(msg,n,events,'时间未全部确定或粒度不统一，按文字保留全部事件。');
        return block(n,h('ol',{class:'event-timeline'},[...events].sort((a,b)=>p(a,'time').localeCompare(p(b,'time'))).map(e=>h('li',null,h('time',{datetime:p(e,'time')},p(e,'time')),h('div',null,h('strong',null,p(e,'title')),body(msg,e))))));
      },
      DataTable(msg,n){const head=p(n,'head').split('|'),rows=children(n,'DataRow'),column=num(n,'markColumn',0)-1,mode=p(n,'markMode','text');
        const values=rows.map(r=>p(r,'values').split('|'));
        const aligned=head.length>=3&&rows.length>=2&&values.every(r=>r.length===head.length);
        if(!aligned)return block(n,h('p',{class:'fallback-note'},'属性未对齐，保留全部文字。'),...values.map(r=>h('p',null,r.map((v,i)=>(head[i]?head[i]+'：':'')+v).join('；'))));
        const marks={yes:'✓',no:'×',warn:'!'};
        return block(n,table(head,values.map((r,j)=>r.map((v,i)=>{
          const status=p(rows[j],'status');if(i!==column||!marks[status])return v;
          return mode==='symbol'?h('span',null,h('span',{class:'status-symbol','aria-hidden':'true'},marks[status]),v):mode==='accent'?h('span',{class:'cell-accent'},v):v;
        }))));
      },
      RelationDiagram(msg,n){const nodes=children(n,'DiagramNode'),edges=children(n,'DiagramEdge'),ids=new Set(nodes.map(x=>p(x,'id')));
        if(p(n,'precise',false)||!nodes.length||ids.size!==nodes.length||edges.some(e=>!ids.has(p(e,'from'))||!ids.has(p(e,'to'))))return block(n,h('p',{class:'fallback-note'},'此关系用文字呈现，避免示意图造成误解。'),...nodes.map(x=>h('p',null,h('strong',null,p(x,'label')+'：'),text(x))),...edges.map(e=>h('p',null,`${p(e,'from')} → ${p(e,'to')}：${p(e,'label')}`)));
        const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 640 330');svg.setAttribute('role','img');svg.setAttribute('aria-label',p(n,'title')+'示意图');svg.classList.add('relation-svg');
        const make=(tag,attrs,txt)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(txt)e.textContent=txt;return e;};
        const positions=new Map(nodes.map((x,i)=>[p(x,'id'),{x:clamp(num(x,'x',18+(i%3)*32),12,88)*6.4,y:clamp(num(x,'y',25+Math.floor(i/3)*40),15,85)*3.3}]));
        const uid='arrow-'+Math.random().toString(36).slice(2);const defs=make('defs',{}),marker=make('marker',{id:uid,viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'7',markerHeight:'7',orient:'auto-start-reverse'});marker.append(make('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'currentColor'}));defs.append(marker);svg.append(defs);
        edges.forEach(e=>{const a=positions.get(p(e,'from')),b=positions.get(p(e,'to')),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,trim=Math.min(64,length*.3),x1=a.x+dx/length*trim,y1=a.y+dy/length*trim,x2=b.x-dx/length*trim,y2=b.y-dy/length*trim;
          svg.append(make('line',{x1,y1,x2,y2,stroke:'currentColor','stroke-width':'2','marker-end':`url(#${uid})`}));const label=make('text',{x:(a.x+b.x)/2,y:(a.y+b.y)/2-8,'text-anchor':'middle','font-size':'13',fill:'currentColor'},p(e,'label'));svg.append(label);});
        const detail=h('p',{class:'diagram-detail'},'点击对象查看说明');
        nodes.forEach((node,i)=>{const pos=positions.get(p(node,'id')),group=make('g',{role:'button',tabindex:'0','aria-label':p(node,'label')});group.append(make('rect',{x:pos.x-63,y:pos.y-25,width:126,height:50,rx:12,fill:colors[i%colors.length]}),make('text',{x:pos.x,y:pos.y+5,'text-anchor':'middle',fill:'#fff','font-size':14},p(node,'label')));
          const select=()=>{detail.textContent=p(node,'label')+'：'+text(node);};group.addEventListener('click',select);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});svg.append(group);});
        const section=block(n,svg,detail);section.querySelector('h4').textContent=p(n,'title')+' · 示意图';return section;
      },
      BudgetTable(msg,n){const bind=p(n,'bind');if(!msg.state[bind])msg.state[bind]={people:num(n,'people',30),cap:num(n,'cap',6000),rows:children(n,'BudgetItem').map(item=>({id:p(item,'id'),name:p(item,'name'),quantity:num(item,'quantity'),price:num(item,'price'),perPerson:!!p(item,'perPerson',false),locked:false}))};
        const st=msg.state[bind];const seeded=msg.ui['seed:'+bind]||(msg.ui['seed:'+bind]={});for(const item of children(n,'BudgetItem')){const id=p(item,'id');if(!seeded[id]){if(!st.rows.some(r=>r.id===id))st.rows.push({id,name:p(item,'name'),quantity:num(item,'quantity'),price:num(item,'price'),perPerson:!!p(item,'perPerson',false),locked:false});seeded[id]=true;}}
        const currency=p(n,'currency','元'),rows=h('tbody'),total=h('strong'),status=h('p',{class:'budget-status','aria-live':'polite'});
        const people=h('input',{type:'number',min:1,max:100000,'aria-label':'预算人数',onchange:e=>{if(finite(e.target.value,1,100000))setPeople(st,Number(e.target.value));refresh(msg);}});
        const cap=h('input',{type:'number',min:0,max:1e9,'aria-label':'预算上限',onchange:e=>{if(finite(e.target.value))st.cap=Number(e.target.value);refresh(msg);}});
        const draw=()=>{calculateBudget(st);people.value=st.people;cap.value=st.cap;
          rows.replaceChildren(...st.rows.map(row=>{const quantity=h('input',{type:'number',min:0,max:1e9,step:'any',value:row.quantity,disabled:row.locked,'aria-label':row.name+'数量',onchange:e=>{if(finite(e.target.value))row.quantity=Number(e.target.value);refresh(msg);}}),price=h('input',{type:'number',min:0,max:1e9,step:'0.01',value:row.price,disabled:row.locked,'aria-label':row.name+'单价',onchange:e=>{if(finite(e.target.value))row.price=Number(e.target.value);refresh(msg);}}),lock=h('input',{type:'checkbox',checked:row.locked,'aria-label':'锁定'+row.name,onchange:e=>{row.locked=e.target.checked;refresh(msg);}});
            return h('tr',null,h('th',{scope:'row'},row.name,row.perPerson?h('small',null,'随人数变化'):null),h('td',null,quantity),h('td',null,price),h('td',null,(row.quantity*row.price).toFixed(2)),h('td',null,lock));}));
          total.textContent=st.total.toFixed(2)+' '+currency;status.textContent=st.total>st.cap?`超出预算 ${(st.total-st.cap).toFixed(2)} ${currency}`:`剩余预算 ${(st.cap-st.total).toFixed(2)} ${currency}`;status.classList.toggle('over',st.total>st.cap);
        };draw();msg.updaters.push(draw);
        return block(n,h('div',{class:'budget-controls'},h('label',null,'人数',people),h('label',null,'预算上限',cap)),h('div',{class:'ext-table-wrap'},h('table',{class:'ext-table budget-grid'},h('thead',null,h('tr',null,['项目','数量','单价','小计','锁定'].map(t=>h('th',{scope:'col'},t)))),rows)),h('div',{class:'budget-total'},h('span',null,'合计'),total),status,h('small',null,'锁定行会保留你的调整，后续局部修改不会覆盖它。'));
      },
      OptionCompare(msg,n){const bind=p(n,'bind'),criteria=children(n,'Criterion'),options=children(n,'Option');
        const scores=options.map(o=>p(o,'scores').split('|').map(Number));
        if(!criteria.length||options.length<2||scores.some(row=>row.length!==criteria.length||row.some(v=>!finite(v,0,10))))return block(n,h('p',null,'评分数据未对齐，保留原始数据：'),...options.map(o=>h('p',null,p(o,'name')+'：'+p(o,'scores'))));
        if(!msg.state[bind])msg.state[bind]={weights:criteria.map(c=>clamp(num(c,'weight'),0,100))};const st=msg.state[bind],ranking=h('ol',{class:'compare-ranking'});
        const inputs=criteria.map((c,i)=>{const label=h('label',{class:'weight-control'}),out=h('output'),input=h('input',{type:'range',min:0,max:100,value:st.weights[i],'aria-label':p(c,'label')+'权重',oninput:e=>{st.weights[i]=Number(e.target.value);refresh(msg);}});label.append(h('span',null,p(c,'label')),out,input);return {label,out,input};});
        msg.updaters.push(()=>{const sum=st.weights.reduce((a,b)=>a+b,0);st.ranking=options.map((o,i)=>({name:p(o,'name'),score:sum?scores[i].reduce((a,v,j)=>a+v*st.weights[j],0)/sum:0})).sort((a,b)=>b.score-a.score);
          inputs.forEach((ctl,i)=>{ctl.out.value=sum?Math.round(st.weights[i]/sum*100)+'%':'0%';ctl.input.value=st.weights[i];});ranking.replaceChildren(...st.ranking.map((o,i)=>h('li',null,h('span',null,`${i+1}. ${o.name}`),h('strong',null,sum?o.score.toFixed(2)+' / 10':'未设置权重'))));});
        return block(n,...inputs.map(x=>x.label),ranking,table(['方案',...criteria.map(c=>p(c,'label'))],options.map((o,i)=>[p(o,'name'),...scores[i].map(String)])),h('small',null,'按各维度加权均分排序；权重实时归一化。评分须来自用户数据或明确标注的示例。'));
      },
      Schedule(msg,n){const bind=p(n,'bind');if(!msg.state[bind])msg.state[bind]={tasks:children(n,'Task').map(t=>({id:p(t,'id'),title:p(t,'title'),date:p(t,'date'),time:p(t,'time'),minutes:num(t,'minutes'),after:p(t,'after')}))};
        const st=msg.state[bind];const seeded=msg.ui['seed:'+bind]||(msg.ui['seed:'+bind]={});for(const t of children(n,'Task')){const id=p(t,'id');if(!seeded[id]){if(!st.tasks.some(task=>task.id===id))st.tasks.push({id,title:p(t,'title'),date:p(t,'date'),time:p(t,'time'),minutes:num(t,'minutes'),after:p(t,'after')});seeded[id]=true;}}
        const list=h('div',{class:'schedule-list'}),issues=h('p',{class:'schedule-issues','aria-live':'polite'}),week=h('div',{class:'schedule-week'});
        const start=validDate(p(n,'start'))?p(n,'start'):null;if(!start)return block(n,h('p',null,'排程起始日期无效。'),...st.tasks.map(t=>h('p',null,`${t.title} ${t.date} ${t.time} ${t.minutes} 分钟`)));
        const days=Array.from({length:7},(_,i)=>{const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
        const draw=()=>{const warnings=scheduleWarnings(st.tasks);st.warnings=warnings;issues.textContent=warnings.length?warnings.join('；'):'没有时间冲突或依赖冲突';issues.classList.toggle('over',warnings.length>0);
          week.replaceChildren(...days.map(date=>h('div',{class:'schedule-day',ondragover:e=>e.preventDefault(),ondrop:e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const t=st.tasks.find(t=>t.id===id);if(t){t.date=date;refresh(msg);}}},h('strong',null,date.slice(5)),...st.tasks.filter(t=>t.date===date).map(t=>h('div',{class:'task-chip',draggable:true,ondragstart:e=>e.dataTransfer.setData('text/plain',t.id)},t.time+' '+t.title)))));
          list.replaceChildren(...st.tasks.map(task=>h('div',{class:'schedule-task'},h('strong',null,task.title),...['date','time','minutes'].map(field=>{const type=field==='minutes'?'number':field;return h('label',null,{date:'日期',time:'开始',minutes:'分钟'}[field],h('input',{type,value:task[field],min:field==='minutes'?1:null,max:field==='minutes'?1440:null,'aria-label':task.title+{date:'日期',time:'开始',minutes:'时长'}[field],onchange:e=>{const v=e.target.value;if(field==='minutes'?!finite(v,1,1440):field==='date'?!validDate(v):!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)){draw();return;}task[field]=field==='minutes'?Number(v):v;refresh(msg);}}));}))));
        };draw();msg.updaters.push(draw);return block(n,h('small',null,'桌面端可拖动任务到日期；也可直接修改下方日期和时间。'),week,list,issues);
      },
      ImagePanel(msg,n){const points=children(n,'ImagePoint'),src=p(n,'image')==='user'?msg.sourceImage:source(p(n,'image'))?.src;
        if(!src)return fallback(msg,n,points,'缺少图片，保留所有标注说明。');
        const selected=h('p',{class:'annotation-detail'},'点击编号查看说明'),frame=h('div',{class:'annotation-frame'}),image=h('img',{src,alt:p(n,'title','待标注图片'),onerror:()=>{frame.replaceChildren(h('p',null,'图片加载失败；下方保留所有标注说明。'));}});frame.append(image);
        points.forEach((point,i)=>{if(!finite(num(point,'x'),0,100)||!finite(num(point,'y'),0,100))return;frame.append(h('button',{class:'image-point',style:`left:${num(point,'x')}%;top:${num(point,'y')}%`,'aria-label':p(point,'label'),onclick:()=>{selected.textContent=p(point,'label')+'：'+text(point);}},i+1));});
        return block(n,frame,selected,...points.map((point,i)=>h('p',{class:'annotation-legend'},h('strong',null,`${i+1}. ${p(point,'label')}：`),text(point))));
      },
      QueueSimulator(msg,n){const bind=p(n,'bind');if(!msg.state[bind])msg.state[bind]={arrival:num(n,'arrival',8),service:num(n,'service',3),windows:num(n,'windows',2),minute:0,waiting:0,history:[]};const st=msg.state[bind],view=h('div',{class:'queue-display','aria-live':'polite'}),chart=h('div',{class:'queue-bars'});
        const tick=()=>{st.minute++;st.waiting=Math.max(0,st.waiting+st.arrival-st.service*st.windows);st.history.push(st.waiting);st.history=st.history.slice(-20);refresh(msg);};
        const controls=['arrival','service','windows'].map(field=>h('label',null,{arrival:'每分钟到达',service:'单窗口每分钟处理',windows:'窗口数量'}[field],h('input',{type:'number',value:st[field],min:field==='windows'?1:0,max:100,'aria-label':{arrival:'到达人数',service:'处理能力',windows:'窗口数量'}[field],onchange:e=>{if(finite(e.target.value,field==='windows'?1:0,100))st[field]=Number(e.target.value);refresh(msg);}})));
        const play=h('button',{class:'ghost small'},'播放'),key='queue:'+bind;if(!msg.ui[key])msg.ui[key]={run:false};const control=msg.ui[key];play.addEventListener('click',()=>{control.run=!control.run;play.textContent=control.run?'暂停':'播放';});
        const timer=setInterval(()=>{if(control.run&&view.isConnected)tick();},1000);msg.timers.push(timer);
        msg.updaters.push(()=>{view.textContent=`第 ${st.minute} 分钟 · 等待 ${st.waiting} 人 · 服务能力 ${st.service*st.windows} 人/分钟`;chart.replaceChildren(...st.history.map((v,i)=>h('span',{title:`第 ${st.minute-st.history.length+i+1} 分钟：${v} 人`,style:`height:${Math.max(3,v/Math.max(...st.history,1)*90)}px`},h('small',null,v))));});
        return block(n,h('p',{class:'fallback-note'},'简化模拟：每分钟先到达、再服务，参数固定，不代表实际预测。'),h('div',{class:'sim-controls'},controls),view,chart,h('div',{class:'ext-actions'},h('button',{class:'primary small',onclick:tick},'前进 1 分钟'),play,h('button',{class:'ghost small',onclick:()=>{st.minute=0;st.waiting=0;st.history=[];control.run=false;play.textContent='播放';refresh(msg);}},'重置')));
      },
      Patch(){return null;},
    });
  }
  function calculateBudget(st){st.total=Math.round(st.rows.reduce((sum,r)=>sum+r.quantity*r.price,0)*100)/100;}
  function setPeople(st,people){const ratio=people/(st.people||1);st.rows.forEach(row=>{if(row.perPerson&&!row.locked)row.quantity=Math.round(row.quantity*ratio*100)/100;});st.people=people;calculateBudget(st);}
  function scheduleWarnings(tasks){const warnings=[];const start=t=>validDate(t.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)&&finite(t.minutes,1,1440)?Date.parse(t.date+'T'+t.time+':00Z'):NaN;
    tasks.forEach((t,i)=>{const a=start(t);if(!Number.isFinite(a)){warnings.push(t.title+'时间无效');return;}for(let j=0;j<i;j++){const b=start(tasks[j]);if(a<b+tasks[j].minutes*60000&&b<a+t.minutes*60000)warnings.push(t.title+'与'+tasks[j].title+'重叠');}if(t.after){const dep=tasks.find(x=>x.id===t.after);if(!dep)warnings.push(t.title+'的前置任务不存在');else if(a<start(dep)+dep.minutes*60000)warnings.push(t.title+'早于前置任务完成');}});return warnings;
  }
  function patchBudget(current,patches){const next=JSON.parse(JSON.stringify(current));for(const x of patches){
    const row=next.rows.find(r=>r.id===x.row);
    if(x.op==='set'&&!x.row){if(!['people','cap'].includes(x.field)||!finite(x.value,x.field==='people'?1:0,x.field==='people'?100000:1e9))throw new Error('无效的预算全局字段');if(x.field==='people')setPeople(next,Number(x.value));else next.cap=Number(x.value);}
    else if(x.op==='add'){if(row||!x.row||!x.name||!finite(x.quantity)||!finite(x.price))throw new Error('新增行需要唯一 ID、名称和非负数量及单价');next.rows.push({id:x.row,name:String(x.name),quantity:Number(x.quantity),price:Number(x.price),locked:false,perPerson:false});}
    else {if(!row)throw new Error('找不到预算行 '+x.row);if(row.locked)throw new Error(row.name+'已锁定，请先在原表中解锁');if(x.op==='remove')next.rows=next.rows.filter(r=>r.id!==x.row);else if(x.op==='set'&&['quantity','price'].includes(x.field)&&finite(x.value))row[x.field]=Number(x.value);else if(x.op==='set'&&x.field==='name'&&String(x.value||'').trim())row.name=String(x.value);else throw new Error('无效的预算行修改');}
  }calculateBudget(next);return next;}
  function applyPatches(msg,tree){const patches=[];const walk=node=>{for(const c of node.children||[]){if(c.type==='Patch')patches.push(c);else walk(c);}};walk(tree);if(!patches.length)return;
    const staged=new Map();try{if(msg.diags.some(d=>!d.transient))throw new Error('更新指令未通过校验');
      for(const node of patches){const target=p(node,'target'),previous=[...chat.messages].reverse().find(m=>m!==msg&&m.state[target]?.rows&&m.finalized);if(!previous)throw new Error('找不到需要更新的预算表 '+target);if(!staged.has(previous))staged.set(previous,new Map());const changes=staged.get(previous),current=changes.get(target)||previous.state[target];
        const patch={};Object.keys(node.props).forEach(key=>{patch[key]=propVal(msg,node.props[key],computeScope(msg));});changes.set(target,patchBudget(current,[patch]));}
      for(const [previous,changes] of staged){for(const [target,next] of changes)Object.assign(previous.state[target],next);refresh(previous);}
      msg.body.append(h('div',{class:'patch-result',role:'status'},`已在原预算表应用 ${patches.length} 项修改，保留现有编辑和锁定行。`));msg.patchApplied=true;
    }catch(e){msg.body.append(h('div',{class:'callout tone-warn',role:'status'},'本次修改未应用：'+e.message+'。原表保持不变。'));msg.patchApplied=false;}
  }
  const examples=[
    {id:'search-visit-demo',q:'联网搜索故宫最新开放时间和预约入口，给我参观步骤并附来源',comps:['GuideSteps','Facts'],dsl:'这是联网功能的流程回放，不包含实时开放时间或预约结论。切换到实时生成后，服务端才会检索并附上来源。\n<GuideSteps title="联网查询到呈现">\n<GuideStep title="检索官方信息" icon="search">在实时模式发送这个问题，先获取开放时间和预约相关网页摘要。</GuideStep>\n<GuideStep title="核对日期与来源" icon="check">优先查看故宫官方来源，确认当前适用的参观日期。摘要不足时说明需要进一步核实。</GuideStep>\n<GuideStep title="整理参观步骤" icon="edit">模型将可用事实组织成步骤卡，正文使用来源编号，来源链接由服务端单独展示。</GuideStep>\n</GuideSteps>'},
    {id:'search-table-demo',q:'联网查找生成式UI的实现方式，用表格比较组件协议、模型生成与渲染职责，并附来源',comps:['DataTable','RelationDiagram'],dsl:'这是检索与对齐属性表格的预录示例，不代表已查询最新资料。\n<DataTable title="本工具的实现职责" head="模块|输入|职责">\n<DataRow values="模型|用户需求和组件目录|输出符合协议的界面描述"/>\n<DataRow values="渲染器|经过校验的组件描述|展示界面并处理本地交互"/>\n<DataRow values="搜索服务|查询关键词|返回网页标题、链接和摘要"/>\n</DataTable>'},
    {id:'budget-demo',q:'帮我做一个30人团建预算，上限6000元，能编辑并锁定餐饮费用',comps:['BudgetTable','Patch'],dsl:'以下是演示用估算，数量和单价可编辑；锁定一行后，后续修改会保留该行。\n\n'+catalog.BudgetTable.example,kw:/团建预算|预算表/,followup:(snap)=>{const st=snap.budget||{};return '按你的要求，只更新原来的预算表。\n<Patch target="budget" op="set" field="people" value={40}/>\n'+(st.rows?.some(r=>r.id==='transport')?'':'<Patch target="budget" op="add" row="transport" name="交通费" quantity={1} price={800}/>');}},
    {id:'compare-demo',q:'比较三种团建方案，调整偏好看看推荐怎么变化',comps:['OptionCompare'],dsl:'以下评分是虚构演示数据。拖动权重，观察方案排序如何变化。\n\n'+catalog.OptionCompare.example,kw:/团建方案|调整偏好/},
    {id:'image-list-demo',q:'用图文分类卡介绍圆形、三角形和正方形',comps:['ImageList'],dsl:'这三种图形可以按边和顶点的特征区分，配图为本地示意素材。\n\n'+catalog.ImageList.example},
    {id:'image-compare-demo',q:'展示两个对象的图文对比，以及缺图时怎样退化',comps:['ImageCompare'],dsl:'没有可靠实拍图时，整组保留文字，避免用不对应的图片误导。\n\n'+catalog.ImageCompare.example},
    {id:'guide-demo',q:'用步骤卡教我配置 OneAPI',comps:['GuideSteps'],dsl:'按下面三步配置，保存后即可使用自己的模型。\n\n'+catalog.GuideSteps.example},
    {id:'events-demo',q:'用时间轴回顾一个示例项目的发展',comps:['EventTimeline'],dsl:'下面使用虚构项目事件演示时间轴，节点日期统一到日。\n\n'+catalog.EventTimeline.example},
    {id:'diagram-demo',q:'画一张浏览器、本地服务和OneAPI的关系示意图',comps:['RelationDiagram'],dsl:'浏览器通过本地服务请求网关，密钥由本地服务保管。\n\n'+catalog.RelationDiagram.example},
    {id:'table-demo',q:'用生成式表格汇总两个方案，标记准备状态',comps:['DataTable'],dsl:'下面是虚构方案数据，仅在准备状态这一列使用符号。\n\n'+catalog.DataTable.example},
    {id:'schedule-demo',q:'帮我排一周发布任务，检查时间冲突和前后依赖',comps:['Schedule'],dsl:'示例中故意安排了一处重叠；调整制作原型的开始时间，观察冲突提示。\n\n'+catalog.Schedule.example},
    {id:'annotation-demo',q:'在三角形图片上标出顶点和底边',comps:['ImagePanel'],dsl:'点击编号查看解释。位置为示意标注。\n\n'+catalog.ImagePanel.example},
    {id:'simulation-demo',q:'做一个咖啡店排队模拟，看看多开一个窗口有什么变化',comps:['QueueSimulator'],dsl:'当前每分钟到达 8 人，两个窗口合计处理 6 人；可以调整参数观察队列变化。\n\n'+catalog.QueueSimulator.example},
    {id:'fallback-demo',q:'演示缺图、缺时间、缺图标和精确结构的退化规则',comps:['ImageList','GuideSteps','EventTimeline','RelationDiagram'],dsl:'以下故意缺少素材或前提条件，用来验证整组退化后信息仍完整。\n<ImageList title="缺图分类">\n<ImageCard title="圆形" image="circle">没有顶点。</ImageCard>\n<ImageCard title="三角形">有三个顶点。</ImageCard>\n<ImageCard title="正方形" image="square">有四个直角。</ImageCard>\n</ImageList>\n<GuideSteps title="缺图标步骤">\n<GuideStep title="填写信息" icon="edit">在设置页填写内容。</GuideStep>\n<GuideStep title="提交申请">检查后提交并保留结果。</GuideStep>\n</GuideSteps>\n<EventTimeline title="日期待定">\n<Event time="2026-10-22" title="完成原型">完成第一版。</Event>\n<Event title="开展试用">时间待定，收集反馈。</Event>\n</EventTimeline>\n<RelationDiagram title="精确结构" precise>\n<DiagramNode id="part" label="结构说明">此结构需要精确的形态和比例，不能用通用示意图替代。</DiagramNode>\n</RelationDiagram>'},
  ];
  function textExport(node,sc,out){if(node.type==='BudgetTable'){const st=sc[p(node,'bind')];if(st){out.push(p(node,'title','预算表'),...st.rows.map(r=>`${r.name}：${r.quantity} × ${r.price} = ${(r.quantity*r.price).toFixed(2)}${r.locked?'（锁定）':''}`),`合计：${st.total} ${p(node,'currency','元')}`);}return true;}
    if(node.type==='OptionCompare'){const st=sc[p(node,'bind')];out.push(p(node,'title','方案对比'),...(st?.ranking||[]).map(r=>`${r.name}：${r.score.toFixed(2)}`));return true;}
    if(node.type==='Schedule'){out.push(p(node,'title','排程'),...(sc[p(node,'bind')]?.tasks||[]).map(t=>`${t.date} ${t.time} ${t.title} ${t.minutes}分钟`));return true;}
    if(node.type==='QueueSimulator'){out.push(p(node,'title','模拟')+'：'+JSON.stringify(sc[p(node,'bind')]));return true;}
    if(!catalog[node.type])return false;
    if(node.type==='Patch')return true;
    const label=p(node,'title',p(node,'label',p(node,'name','')));if(label)out.push((p(node,'time')?p(node,'time')+' ':'')+label);if(p(node,'subtitle'))out.push(p(node,'subtitle'));if(p(node,'head'))out.push(p(node,'head'));if(p(node,'values'))out.push(p(node,'values'));if(p(node,'link'))out.push(p(node,'link'));if(node.type==='DiagramEdge')out.push(`${p(node,'from')} → ${p(node,'to')}：${p(node,'label')}`);
    for(const c of node.children||[])if(c.type==='#text'){if(c.text.trim())out.push(c.text.trim());}else textOf(c,sc,out);return true;
  }
  return {catalog,install,examples,media,materialPrompt,applyPatches,textExport,validDate,patchBudget,scheduleWarnings};
})();
if(typeof module!=='undefined')module.exports=DemoExtensions;
