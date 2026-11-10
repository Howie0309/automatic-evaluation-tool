const {test}=require('node:test');
const assert=require('node:assert/strict');
const search=require('./search');
const rss='<?xml version="1.0"?><rss><channel><item><title>官方 &amp; 开放时间</title><link>https://www.dpm.org.cn/Visit.html</link><description><![CDATA[<b>参观</b>时间与预约信息]]></description><pubDate>Thu, 22 Oct 2026 00:00:00 GMT</pubDate></item><item><title>不安全链接</title><link>javascript:alert(1)</link><description>不使用</description></item></channel></rss>';

test('按需联网识别外部核验需求，关闭和纯计算不搜索',()=>{
  assert.ok(search.shouldSearch('auto','故宫最新开放时间和预约官网'));
  assert.ok(search.shouldSearch('auto','帮我核实产品价格'));
  assert.ok(search.shouldSearch('on','比较两个方案'));
  assert.ok(!search.shouldSearch('off','最新新闻'));
  assert.ok(!search.shouldSearch('auto','帮我做一个30人的预算表'));
  assert.ok(!search.shouldSearch('auto','你好，今天心情很难过'));
  assert.ok(!search.shouldSearch('auto','帮我排一周发布任务'));
  assert.ok(search.shouldSearch('auto','几种常见叶子','联网搜索：几种常见叶子'));
});
test('搜索词不包含多轮界面快照和附件说明',()=>{
  const query=search.queryFor({turns:[{role:'user',content:'早先问题'},{role:'assistant',content:'回答'},{role:'user',content:'联网搜索：故宫 开放时间\n\n（用户附上了一张照片，见图片）\n\n界面状态快照：{"budget":{"private":"secret"}}'}]});
  assert.equal(query,'故宫 开放时间');
  assert.equal(search.queryFor({turns:[{role:'user',content:'联网查一下故宫开放时间，只用两句话回答，带来源编号。'}]}),'故宫 开放时间');assert.ok(!query.includes('secret'));
});
test('RSS 转换过滤危险链接、去重并清理 HTML',()=>{
  const sources=search.parseRSS(rss);assert.equal(sources.length,1);assert.equal(sources[0].id,1);assert.equal(sources[0].title,'官方 & 开放时间');assert.equal(sources[0].snippet,'参观 时间与预约信息');
  assert.equal(search.normalize([{title:'A',url:'https://a.example',snippet:'x'},{title:'B',url:'https://a.example',snippet:'y'},{title:'C',url:'file:///tmp/key',snippet:'z'}]).length,1);
});
test('真实搜索请求格式和资料注入，与模型协议无关',async t=>{
  let requested;
  t.mock.method(globalThis,'fetch',async url=>{requested=String(url);return new Response(rss,{headers:{'Content-Type':'application/rss+xml'}});});
  const result=await search.searchWeb('故宫 开放时间',undefined,{provider:'bing',key:''});assert.ok(requested.startsWith('https://www.bing.com/search?'));assert.equal(new URL(requested).searchParams.get('q'),'故宫 开放时间');assert.equal(result.sources.length,1);
  const original={system:'自定义规则',turns:[{role:'user',content:'故宫开放时间'}]};
  const body=search.withEvidence(original,result);assert.ok(body.system.includes('不可信参考资料'));assert.ok(body.turns[0].content.includes('www.dpm.org.cn'));assert.ok(body.turns[0].content.includes('搜索摘要，并非网页全文'));assert.equal(original.turns[0].content,'故宫开放时间');
});
test('Tavily 使用独立密钥且不暴露响应中的秘密',async t=>{
  t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'https://api.tavily.com/search');assert.equal(options.headers.Authorization,'Bearer test-search-key');const payload=JSON.parse(options.body);assert.equal(payload.query,'测试');assert.equal(payload.include_images,false);return Response.json({results:[{title:'来源',url:'https://example.com',content:'资料'}]});});
  const result=await search.searchWeb('测试',undefined,{provider:'tavily',key:'test-search-key'});assert.ok(!JSON.stringify(result).includes('test-search-key'));assert.equal(result.sources[0].snippet,'资料');
});
test('联网失败显式标注未核实，关闭联网不产生请求',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('fetch failed');});
  const events=[];const body=await search.enrichSearch({webSearch:'on',system:'S',turns:[{role:'user',content:'测试'}]},event=>events.push(event));
  assert.equal(events[0].t,'search_start');assert.equal(events[1].t,'search_error');assert.ok(body.turns[0].content.includes('unavailable'));assert.ok(!body.turns[0].content.includes('"status":"ok"'));
  const noSearch=[];await search.enrichSearch({webSearch:'off',turns:[{role:'user',content:'最新价格'}]},e=>noSearch.push(e));assert.equal(noSearch.length,0);
});
test('搜索中断会取消请求，不继续当作检索成功',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new DOMException('cancelled','AbortError');});const controller=new AbortController();controller.abort();
  await assert.rejects(search.searchWeb('query',controller.signal,{provider:'bing'}),{name:'AbortError'});
});
test('搜索配置保存仅在本地，权限600且公开设置不含密钥',()=>{
  const fs=require('fs'),os=require('os'),path=require('path'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'ui-search-test-')),file=path.join(dir,'search.cjs');
  try{fs.copyFileSync(__dirname+'/search.js',file);const cfg=require(file);cfg.saveSearchConfig({provider:'tavily',key:'test-only-key'});assert.equal(fs.statSync(path.join(dir,'.local-search.json')).mode&0o777,0o600);assert.deepEqual(cfg.publicSearchConfig(),{provider:'tavily',hasKey:true});cfg.saveSearchConfig({provider:'tavily',key:''});assert.equal(cfg.searchConfig().key,'test-only-key');cfg.saveSearchConfig({provider:'bing'});assert.equal(cfg.searchConfig().key,'');assert.throws(()=>cfg.saveSearchConfig({provider:'evil'}));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
