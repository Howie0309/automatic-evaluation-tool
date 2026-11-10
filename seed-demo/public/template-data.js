/* Whole-answer patterns; names are our classification, not official template IDs. */
const TemplateData=(()=>{
 const sources={
 userSpec:{title:'你提供的六种内容呈现规范',kind:'provided',date:'本次会话',note:'用户需求规范，不是GPT-6官方样例或实测证据。'},
 launch:{title:'OpenAI · GPT-6 官方发布演示',url:'https://openai.com/index/gpt-6-for-everyone/',kind:'official',date:'2026-10-07'},
 thesys:{title:'OpenUI · ChatGPT 实际响应分析',url:'https://www.openui.com/blog/how-chatgpt-intelligent-ui-works',kind:'observed',date:'2026-10-08'},
 techradar:{title:'TechRadar · 作者实测与截图',url:'https://www.techradar.com/ai-platforms-assistants/chatgpt/chatgpt-just-changed-how-it-works-with-intelligent-ui-here-are-5-things-you-can-do-now-that-you-couldnt-before',kind:'observed',date:'2026-10-08'},
 rundown:{title:'The Rundown · 现场操作与校验',url:'https://app.therundown.ai/guides/chatgpt-intelligent-ui-guide',kind:'observed',date:'2026-10-08'}
 };
 // Each row refers to a visible or explicitly demonstrated complete experience.
 const rows=[
 ['bike','结构探索与局部讲解','解释与学习','launch','7-Speed Bicycle','大图 / 部件切换 / 对应解释','查看自行车结构，点选部件了解作用','交互式自行车示意图，点击车架、车轮和传动系统分别解释。','本地简化矢量图，非工程结构图；另有实测齿轮滑块变体。'],
 ['dinner','图文菜单与人数联动','生活规划','launch','Planning a Sunday roast','菜品图文 / 人数 / 采购量 / 烹饪清单','人数未定的聚餐计划','做一份可调整人数的聚餐计划，采购量随人数变化，并附准备清单。','本地使用标明为示意的菜品插图；份量仅演示，不还原原菜单数据。'],
 ['wardrobe','胶囊衣橱与搭配清单','生活规划','launch','Building a wardrobe','风格筛选 / 单品卡 / 组合建议','整理有限单品的穿搭方案','帮我整理一个胶囊衣橱，按风格选择单品，并显示搭配建议。','单品为本地示意，没有商品搜索、价格或购买连接。'],
 ['roadtrip','路线地图与站点计划','生活规划','launch','Planning a road trip','路线图 / 站点选择 / 分段说明','多站点行程与停留安排','用地图加站点列表展示一段三站自驾行程，点击站点查看安排。','本地路线仅示意，没有真实底图、地理坐标或导航服务。'],
 ['clt','抽样分布与参数实验','解释与学习','launch','Central limit theorem','参数控制 / 分布图 / 试验结果','理解抽样均值如何变化','做一个中心极限定理交互演示，能改变样本大小并重新抽样。','本地均匀分布抽样；随机结果不冒充原演示数据。'],
 ['gdp','构成拆解与经济解释','解释与学习','launch','GDP explained simply','组成区块 / 数值 / 分项解释','理解一个总量由什么构成','用交互图解释 GDP 构成，点选消费、投资、政府支出和净出口。','金额为假设数据，非任何国家或年份的真实统计。'],
 ['drone','视角参数与画面预览','解释与学习','launch','Understanding drone photography','参数滑块 / 视野示意 / 解释','观察摄影参数对取景的影响','用可调整高度和视角的示意图解释无人机摄影覆盖范围。','采用理想化几何模型，非飞行规划或设备性能预测。'],
 ['monty','选择揭晓与概率实验','解释与学习','launch','Monty Hall problem','选门 / 揭晓 / 换选 / 统计','体验条件概率与决策','做三门问题互动实验：先选门，主持人开空门，再决定是否换门。','主持人总知道奖品位置、总开空门；统计来自本地试验。'],
 ['bill','账单明细与公平分摊','计算与决策','launch','Bill splitter','账单 / 人员 / 税费 / 分摊结果','多人共同消费分账','做一张可编辑账单，按每道菜的参与人分摊，并展示每人应付。','本地账单是假设金额；官方另有夹板纸张风格变体。'],
 ['savings','储蓄计算与增长曲线','计算与决策','launch','Retirement savings calculator','输入 / 核心结果 / 曲线 / 假设','改变储蓄条件比较累计结果','做一个储蓄增长计算器，可以调整月存额、年限和假设年利率。','按月末存入、月复利；利率为假设，不提供收益承诺。'],
 ['game','内嵌可玩小游戏','创作与工具','launch','Retro game','游戏画面 / 控制 / 分数 / 重开','在回答中直接体验游戏','在对话里做一个可玩的复古小游戏，显示规则、得分和重开按钮。','本地用三连棋展示游戏式回答；游戏种类和美术并非原版复刻。'],
 ['moodboard','情绪板与方向选择','创作与工具','thesys','Dog vest moodboard','视觉参考 / 颜色 / 风格 / 功能 / 方向摘要','挑选创意设计方向','为宠物背心做一个设计情绪板，可选风格、颜色和功能。','本地服饰矢量示意，不声称是检索到的真实设计参考图。'],
 ['dashboard','指标看板与情景推演','数据分析','thesys','Analytics dashboard','指标行 / 趋势 / 情景滑块 / 口径','观察假设变化对指标的影响','用虚构数据做一张业务看板，情景滑块能联动指标和趋势图。','全部虚构，演示统一口径的情景计算，不接真实业务系统。'],
 ['pricing','人数调价与套餐估算','计算与决策','thesys','Team plan estimate','人数 / 单价 / 合计 / 说明','按席位数量估算总价','做一个按人数计算每月价格的小工具，假设每人29元。','固定单价仅用于本地演示，无真实产品报价。'],
 ['drum','节奏网格与播放工具','创作与工具','thesys','Drum Lab AppBlock','音轨 / 节拍格 / 速度 / 播放','在回答中操作一个专用工具','做一个鼓机节奏工具，可切换节拍格、调整速度并播放。','本地独立 Web Audio 实现；点击播放才发声，不是原 AppBlock 代码。'],
 ['quiz','识字教学与逐题测验','解释与学习','techradar','Learning Japanese','知识卡 / 选项 / 反馈 / 下一题','学少量知识后立即自测','先介绍五个日语元音假名，再给我一个可点击作答的小测验。','本地题库与反馈独立编写，不复制原测验。'],
 ['travel-budget','多日行程与预算调节','生活规划','techradar','3-day Tokyo itinerary','多日切换 / 预算滑块 / 分配 / 行程','观察预算怎样影响行程安排','做一份三日行程，能调整总预算并查看各天安排。','行程与预算为虚构；不接航班、酒店或实时地图。'],
 ['compare','多方案权重与推荐排序','计算与决策','techradar','Comparing products','对象卡 / 维度权重 / 排序 / 对比表','调整偏好查看推荐变化','比较三款虚构电脑，可调续航、便携、价格的重要性并实时重排。','虚构型号、标准化评分，不冒充实测商品参数。'],
 ['workshop','成本预算与边界校验','计算与决策','rundown','Workshop cost calculator','多项输入 / 结果行 / 超支 / 重置','根据人数与单价检查预算','做一个工作坊成本计算器，能改人数、场地费、餐食费、物料费和预算。','本地计算与校验独立实现，使用假设金额。']
 ];
 const sourceImages={
  compare:'https://cdn.mos.cms.futurecdn.net/v2/t%3A33%2Cl%3A320%2Ccw%3A2105%2Cch%3A1184%2Cq%3A80/4beEjd75jKrNR8y7AnehuK.jpg',
  'travel-budget':'https://cdn.mos.cms.futurecdn.net/v2/t%3A346%2Cl%3A431%2Ccw%3A1841%2Cch%3A1035%2Cq%3A80/GSCboCAxdc64BKo7uejr5A.jpg',
  quiz:'https://cdn.mos.cms.futurecdn.net/v2/t%3A349%2Cl%3A571%2Ccw%3A1939%2Cch%3A1091%2Cq%3A80/jRKXyeiWzworTU5YuXE8Qk.jpg'
 };
 const families={bike:'交互讲解',gdp:'交互讲解',drone:'交互讲解',dinner:'图文规划',wardrobe:'图文规划',roadtrip:'地图与行程','travel-budget':'地图与行程',clt:'模拟实验',monty:'模拟实验',bill:'参数计算',savings:'参数计算',pricing:'参数计算',workshop:'参数计算',compare:'偏好决策',quiz:'学习测验',moodboard:'创意选配',dashboard:'数据看板',game:'内嵌应用',drum:'内嵌应用'};
 const interactiveEntries=rows.map(([id,title,category,sourceId,evidenceTitle,structure,intent,prompt,limit])=>({id,title,category,family:families[id],sourceId,evidenceTitle,structure:structure.split(' / '),intent,prompt,limit,evidenceLevel:sources[sourceId].kind,mode:'interactive',rendering:'local-reconstruction',referenceImage:sourceImages[id]||null,originalDemo:id==='bill'?'https://cdn.openai.com/ctf-cdn/intelligent-ui/bill-splitter-v5.html':null,note:'有原始样例证据；本地独立重建同类结构与交互，非 ChatGPT 截图或像素级还原。'}));
 const staticRows=[
 ['static-image-list','图文分类卡','图文分类','图片 / 加粗名称 / 副标题 / 特点','三个及以上并列实体的分类、介绍或推荐','用静态图文分类卡介绍圆形、三角形和正方形，每项用相同维度说明。','本地几何插图与对象一一对应；任一缺少可靠图片时全组文字退化，信息不减。'],
 ['static-image-compare','图文对比卡','图文对比','两张实拍 / 图下名称 / 差异说明 / 可衔接表格','恰好两个对象之间的比较和辨析','用静态图文对比卡比较相机A和相机B；没有可靠实拍图片就完整保留文字。','当前无可靠实拍时整组展示文字；主页面上传名称为“相机 A”“相机 B”的实拍素材后重新选中可显示图文。超过两个对象改用分类卡。'],
 ['static-steps','步骤卡','步骤指南','动作图标 / 步骤名称 / 操作正文 / 官方入口','有明确先后顺序的操作指南','用静态步骤卡说明如何配置自己的OneAPI接口，写清位置、操作和注意事项。','每步2–3句；图标均为本地支持的动作图标，任一步无合适图标则整组退为文字。'],
 ['static-timeline','时间轴','时间轴','统一时间粒度 / 事件标题 / 事件说明','有确切日期、必须按顺序理解的历史或进展','用静态时间轴回顾一个示例项目，所有节点有确切日期并统一粒度。','这里是明确标注的虚构项目，日期统一到日；真实回答缺日期或粒度不统一时整组保留文字。'],
 ['static-relation','原理关系示意图','关系示意','命名对象 / 稳定颜色 / 箭头 / 示意图标题','用一个简图解释一个已明确的机制或关系','用静态关系示意图说明浏览器、本地服务和模型网关如何衔接。','只承载简化关系；涉及解剖、精确几何或必须准确表达比例位置时退为文字，不生成通用关系图。'],
 ['static-table','生成式表格','生成式表格','统一表头 / 对齐属性 / 最多一列增强','两个及以上对象、各有两个及以上可对齐属性','用静态生成式表格比较三个虚构方案，只在状态列使用统一符号。','数据为虚构；仅状态列使用符号，不叠加字色。未知状态不加符号，信息保持完整。']
 ];
 const staticEntries=staticRows.map(([id,title,family,structure,intent,prompt,limit])=>({id,title,category:'静态信息呈现',family,sourceId:'userSpec',evidenceTitle:'用户提供的'+title+'规范',structure:structure.split(' / '),intent,prompt,limit,evidenceLevel:'provided',mode:'static',rendering:'local-template',referenceImage:null,originalDemo:null,note:'依据用户提供的使用条件、布局与退化规则实现；不计作GPT-6官方样例或已核实输出。'}));
 const entries=[...staticEntries,...interactiveEntries];
 const counts={total:entries.length,static:staticEntries.length,interactive:interactiveEntries.length,official:entries.filter(e=>e.evidenceLevel==='official').length,observed:entries.filter(e=>e.evidenceLevel==='observed').length,provided:staticEntries.length,families:new Set(entries.map(e=>e.family)).size};
 const pending=[
 ['天气与预报',['WeatherWidgetV3','WeatherCurrentWithSource']],['行情与市场',['StockChart','StockHeatmapWidget']],['航班与追踪',['FlightCard','FlightTrackerWidget']],['赛事与积分榜',['NbaScoresWidget','NbaStandingsWidget']],['新闻与资讯',['NewsCarousel','NewsArticleWidget']],['地点与餐馆',['LocalBusinessWidget','RestaurantMenuWidget']],['邮件与写作',['DraftEmail','WritingBlock']],['学习卡片与题型',['LearningFlashcards','LearningFillBlankCard']],['个人财务账本',['LedgerNetWorthWidget','LedgerSpendByCategoryWidget']],['任务与自动化',['AutomationPlanSummary','ListAutomations']]
 ].map(([title,names])=>({title,names,evidence:'仅有公开运行时名称线索，未据此确认完整视觉样式，不计入已核实样例。'}));
 const guide='静态信息呈现与交互工具都属于完整界面。分类、对比、步骤、时间轴、关系说明和属性汇总可直接用静态排版，不必添加滑块、按钮或输入框；只有用户需要调整、选择、填写或计算时才加入对应交互。静态模板仍严格执行可靠图片、日期粒度和整组退化规则，信息不减。按完整回答选择结构，而不是堆叠底层控件。图文规划要把对象、步骤、行动组织为一个整体；计算工具把输入、结果、图表和假设放在一起；解释类用主图、局部选择和对应说明；决策类把对象、偏好、推荐理由和对比表连起来。模板图鉴是已出现样式的研究归纳，不是固定官方模板库。用当前支持的组件组合实现，不能生成只存在于参考目录的宿主标签，也不要使用内部样例标签 TemplateSample。';
 return{version:'2026-10-22',title:'GPT-6 完整回答样式图鉴',sources,entries,pending,guide,counts,coverage:'25项完整模板示例：6项来自用户提供的静态呈现规范；19项交互案例来自11个官方演示和8个第三方实际观察。用户规范与已核实输出分开计数；不代表所有可能布局。'};
})();
if(typeof module!=='undefined')module.exports=TemplateData;
