const TemplateGallery=(()=>{
 let initialized=false,active='static-image-list',preview=null;
 const $tg=id=>document.getElementById(id);
 const status=e=>({official:'官方样例',observed:'第三方实测',provided:'用户规范'})[e.evidenceLevel];
 const modeLabel=e=>e.mode==='static'?'静态展示':'可交互';
 function cleanup(){if(preview){(preview.timers||[]).forEach(clearInterval);(preview.cleanups||[]).forEach(fn=>fn());}preview=null;}
 function sourceLink(source){return source.url?h('a',{href:source.url,target:'_blank',rel:'noopener noreferrer'},source.title):h('span',null,source.title);}
 function show(item){
  cleanup();active=item.id;const source=TemplateData.sources[item.sourceId],target=$tg('tg-detail');
  preview={state:{},ui:{},timers:[],cleanups:[]};
  const sample=TemplateShowcase.render(preview,item.id);
  const actions=[h('button',{type:'button',onclick:async event=>{const button=event.currentTarget;try{await navigator.clipboard.writeText(item.prompt);button.textContent='提问已复制';}catch{button.textContent='请展开详情手动复制';}}},'复制示例提问')];
  if(typeof setView==='function')actions.push(h('button',{type:'button',onclick:()=>{if(chat.busy){flash('请等待当前生成完成。');return;}setMode('replay');setView('chat');runItem(TemplateShowcase.examples.find(x=>x.id==='style-'+item.id));}},'本地回放到对话'));
  const reference=h('div',{class:'tg-reference'},h('span',null,(item.evidenceLevel==='provided'?'规范来源：':'原样例：')+item.evidenceTitle+' · '),source.url?h('a',{href:source.url,target:'_blank',rel:'noopener noreferrer'},'查看来源'):h('span',null,source.title));
  if(item.originalDemo)reference.append(h('a',{href:item.originalDemo,target:'_blank',rel:'noopener noreferrer'},'打开官方原演示'));
  if(item.referenceImage){const picture=h('details',null,h('summary',null,'查看来源中的实际截图（联网）'));picture.addEventListener('toggle',()=>{if(picture.open&&!picture.querySelector('img'))picture.append(h('img',{src:item.referenceImage,alt:source.title+'中的'+item.evidenceTitle+'实际截图',loading:'lazy',referrerpolicy:'no-referrer'}));});reference.append(picture);}
  target.replaceChildren(h('div',{class:'tg-detail-head'},h('div',null,h('span',{class:'tg-origin origin-'+item.evidenceLevel},status(item)),h('h3',null,item.title)),h('span',{class:'tg-rebuilt'},modeLabel(item)+' · 本地示例')),
   reference,
   h('div',{class:'tg-structure'},item.structure.map((part,i)=>h('span',null,(i?'→ ':'')+part))),
   h('div',{class:'tg-sample-frame'},sample),h('div',{class:'tg-actions'},actions),
   h('details',{class:'tg-proof'},h('summary',null,'原始案例、适用需求与还原边界'),h('dl',null,h('dt',null,'原始样例'),h('dd',null,item.evidenceTitle),h('dt',null,'来源与日期'),h('dd',null,sourceLink(source),' · '+source.date),h('dt',null,'适用需求'),h('dd',null,item.intent),h('dt',null,'本地示例提问'),h('dd',null,item.prompt),h('dt',null,'还原边界'),h('dd',null,item.limit),h('dt',null,'证据口径'),h('dd',null,item.note))));
  target.scrollTop=0;
 }
 function init(){if(initialized){if(!preview&&active)show(TemplateData.entries.find(e=>e.id===active));return;}initialized=true;
  const counts=TemplateData.counts;$tg('tg-stats').replaceChildren(...[[counts.total,'完整模板示例'],[counts.static,'静态展示'],[counts.interactive,'交互案例']].map(([value,label])=>h('span',null,h('b',null,value),label)),h('span',null,'19个公开案例与6项用户规范分开标注'));
  const categories=[...new Set(TemplateData.entries.map(x=>x.family))];$tg('tg-category').append(...categories.map(c=>h('option',{value:c},c)));
  function paint(){const q=$tg('tg-query').value.trim().toLowerCase(),mode=$tg('tg-mode').value,category=$tg('tg-category').value,evidence=$tg('tg-evidence').value;
   const found=TemplateData.entries.filter(x=>(!mode||x.mode===mode)&&(!category||x.family===category)&&(!evidence||x.evidenceLevel===evidence)&&(!q||(x.title+' '+x.family+' '+x.category+' '+x.intent+' '+x.structure.join(' ')+' '+x.evidenceTitle).toLowerCase().includes(q)));
   $tg('tg-results').textContent=found.length+' / '+TemplateData.entries.length+' 项';
   if(found.length&&!found.some(x=>x.id===active))show(found[0]);
   if(!found.length){cleanup();active=null;$tg('tg-detail').replaceChildren(h('p',{class:'tg-empty'},'没有匹配的样式。调整关键词或筛选条件试试。'));}
   $tg('tg-cards').replaceChildren(...found.map(item=>h('button',{type:'button',class:'tg-card'+(item.id===active?' selected':''),'aria-pressed':String(item.id===active),onclick:()=>{show(item);paint();}},h('span',{class:'tg-card-meta'},item.family,h('span',{class:'tg-mode-badge'},modeLabel(item)),h('small',{class:'tg-origin origin-'+item.evidenceLevel},status(item))),h('strong',null,item.title),h('span',{class:'tg-card-structure'},item.structure.join(' · ')),h('small',{class:'tg-card-intent'},item.intent))));
  }
  for(const id of ['tg-query','tg-mode','tg-category','tg-evidence'])$tg(id).addEventListener(id==='tg-query'?'input':'change',paint);
  $tg('tg-reset').addEventListener('click',()=>{for(const id of ['tg-query','tg-mode','tg-category','tg-evidence'])$tg(id).value='';paint();});
  $tg('tg-sources').replaceChildren(...Object.values(TemplateData.sources).map(source=>h('p',null,sourceLink(source),h('small',null,' · '+source.date+' · '+({official:'官方发布演示',observed:'第三方实际观察',provided:'用户提供的呈现规范'})[source.kind]))));
  $tg('tg-pending').replaceChildren(...TemplateData.pending.map(x=>h('div',null,h('strong',null,x.title),h('code',null,x.names.join(' / ')))));
  $tg('tg-business')?.addEventListener('click',()=>setView('gallery'));$tg('tg-technical')?.addEventListener('click',()=>setView('atlas'));
  paint();show(TemplateData.entries.find(x=>x.id===active)||TemplateData.entries[0]);
 }
 return{init,show,cleanup};
})();
