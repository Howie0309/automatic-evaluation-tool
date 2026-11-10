/* Searchable research material with explicit proof and implementation status. */
const ComponentAtlas=(()=>{
  let initialized=false,activeMessage=null,page=0,activeId='native:box';
  const pageSize=24;
  const statuses={'local-demo':'本地可演示',partial:'受限本地映射',reference:'仅名称资料'};
  const evidenceNames={'release-registry':'发行包注册表','release-render-marker':'发行包渲染标记','public-allowlist':'公开运行时白名单'};
  function cleanup(){if(activeMessage)(activeMessage.timers||[]).forEach(clearInterval);activeMessage=null;}
  function sourceLink(source){return source.url?h('a',{href:source.url,target:'_blank',rel:'noopener noreferrer'},source.title):h('span',null,source.title);}
  function show(item){
    cleanup();activeId=item.id;
    const target=$('#atlas-detail'),native=item.layer==='native',spec=AtomicKit.catalog[item.name];
    const proof=AtomInventory.sources.filter(source=>item.sourceIds.includes(source.id));
    target.replaceChildren(h('div',{class:'atlas-detail-head'},h('span',{class:'atlas-tag'},native?'原子层':'宿主层'),h('h3',null,item.name),h('p',null,item.label===item.name?item.category:item.label),h('span',{class:'atlas-state state-'+item.availability},statuses[item.availability])),h('p',{class:'atlas-scope'},item.scopeNote));
    if(native){
      const stage=h('div',{class:'atlas-stage'});activeMessage=newMsg(stage,null);activeMessage.foot.remove();activeMessage.thinking.remove();activeMessage.buffer=activeMessage.target=spec.example||'';activeMessage.final=activeMessage.finalized=true;compile(activeMessage);
      target.append(stage);
      const errors=activeMessage.diags.filter(d=>!d.transient);if(errors.length)target.append(h('p',{class:'atlas-error'},errors.map(x=>x.msg).join('；')));
      const action=h('button',{class:'primary small',type:'button',onclick:()=>{const example={id:'atom-'+item.name,q:'用本地原子组件 '+item.name+' 展示一个小示例',comps:[item.name],dsl:'以下是 '+item.name+' 的本地组件演示，使用本工具的受限协议。\n'+spec.example};runItem(example);}},'在对话里演示');
      action.title='按当前实时/回放模式运行';
      const code=h('details',{class:'atlas-code'},h('summary',null,'查看本地 DSL 与属性'),h('pre',null,spec.example),h('p',null,'以下是本演示的属性协议，不是原版 DIL 的完整 schema。'),h('dl',{class:'atlas-props'},Object.entries(spec.props).map(([key,type])=>h('div',null,h('dt',null,key),h('dd',null,type)))));
      target.append(h('div',{class:'atlas-detail-actions'},action),code);
    }else{
      target.append(h('div',{class:'atlas-reference'},h('strong',null,'已收录名称，未接入原宿主服务'),h('p',null,'此项来自 '+item.loading+' 白名单。分类根据名称推断，不能据此确认功能已开放、当前模型会调用它，或其业务数据、参数及视觉实现。'),h('p',null,'本材料不生成该组件的伪造实时数据或未核实计算公式。')));
      const mapping={'AsyncImage':'image','AsyncImageGroup':'carousel','Link':'link','CodeBlock':'code','LinkCard':'card','ProductCard':'card','ProductCarousel':'carousel','StockChart':'chart','StockComparisonChart':'chart','Rating':'badge','CalendarList':'date-picker','ChecklistWidget':'checkbox','LearningFlashcards':'flashcard-flip','ImageGrid':'grid'};
      const equivalent=mapping[item.name];if(equivalent)target.append(h('p',{class:'atlas-alternative'},'可参考本地的 '+equivalent+'，只演示相近界面能力，不是原组件复刻。'),h('button',{class:'ghost small',type:'button',onclick:()=>show(AtomInventory.entries.find(x=>x.id==='native:'+equivalent))},'查看相近的本地组件'));
    }
    const metadata=h('details',{class:'atlas-proof'},h('summary',null,'证据、版本与边界'),h('p',null,evidenceNames[item.evidence]+' · 核对日期 '+AtomInventory.checkedAt));
    for(const source of proof)metadata.append(h('div',{class:'atlas-proof-source'},sourceLink(source),source.asset?h('code',null,source.asset):null,source.release?h('small',null,source.release.CFBundleIdentifier+' '+source.release.CFBundleShortVersionString+' / '+source.release.CFBundleVersion):null,source.sha256?h('small',null,'SHA-256 '+source.sha256):null,h('p',null,source.note)));
    if(!native)metadata.append(h('small',null,'用途分类证据：名称推断。'));
    target.append(metadata);
  }
  function init(){if(initialized)return;initialized=true;
    const entries=AtomInventory.entries;
    $('#atlas-counts').replaceChildren(...[['70','原子层名称'],['313','宿主白名单'],['30 / 283','常驻 / 按需'],['383','总收录']].map(([number,label])=>h('div',null,h('strong',null,number),h('span',null,label))));
    const categories=[...new Set(entries.map(e=>e.category))];$('#atlas-category').append(...categories.map(c=>h('option',{value:c},c)));
    const render=()=>{
      const query=$('#atlas-query').value.trim().toLowerCase(),layer=$('#atlas-layer').value,status=$('#atlas-status').value,category=$('#atlas-category').value;
      const filtered=entries.filter(e=>(!layer||e.layer===layer)&&(!status||e.availability===status)&&(!category||e.category===category)&&(!query||(e.name+' '+e.label+' '+e.category).toLowerCase().includes(query)));
      const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages-1);
      if(filtered.length&&!filtered.some(e=>e.id===activeId))show(filtered[0]);
      if(!filtered.length){cleanup();activeId=null;$('#atlas-detail').replaceChildren(h('p',{class:'atlas-empty'},'没有匹配的组件。调整筛选后可查看证据与预览。'));}
      $('#atlas-results').textContent=filtered.length+' 项 · 第 '+(page+1)+' / '+pages+' 页';$('#atlas-prev').disabled=page===0;$('#atlas-next').disabled=page>=pages-1;
      $('#atlas-items').replaceChildren(...filtered.slice(page*pageSize,(page+1)*pageSize).map(item=>h('button',{type:'button',class:'atlas-item'+(item.id===activeId?' selected':''),onclick:()=>{show(item);render();}},h('span',{class:'atlas-item-top'},h('strong',null,item.name),h('span',{class:'atlas-state state-'+item.availability},statuses[item.availability])),item.label!==item.name?h('span',{class:'atlas-item-label'},item.label):null,h('small',null,item.category+' · '+evidenceNames[item.evidence]))));
      if(!filtered.length)$('#atlas-items').append(h('p',{class:'atlas-empty'},'没有符合条件的组件；试试原名、中文用途或更宽的分类。'));
    };
    for(const id of ['atlas-query','atlas-layer','atlas-status','atlas-category'])$('#'+id).addEventListener(id==='atlas-query'?'input':'change',()=>{page=0;render();});
    $('#atlas-prev').addEventListener('click',()=>{page=Math.max(0,page-1);render();});$('#atlas-next').addEventListener('click',()=>{page++;render();});
    $('#atlas-reset').addEventListener('click',()=>{for(const id of ['atlas-query','atlas-layer','atlas-status','atlas-category'])$('#'+id).value='';page=0;render();});
    const sources=$('#atlas-sources');sources.replaceChildren(...AtomInventory.sources.map(source=>h('li',null,sourceLink(source),h('small',null,source.note))));
    render();show(entries.find(e=>e.id===activeId)||entries[0]);
  }
  return{init,cleanup,show};
})();
