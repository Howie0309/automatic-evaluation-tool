# GPT-6 完整回答样式图鉴

核对日期：2026-10-22

25项完整模板示例：6项来自用户提供的静态呈现规范；19项交互案例来自11个官方演示和8个第三方实际观察。用户规范与已核实输出分开计数；不代表所有可能布局。

## 口径

按完整回答归类，不把按钮、输入框等原子零件计算为模板。名称是研究归纳，不是官方模板编号。静态与交互按呈现方式区分；公开案例与用户提供规范按证据来源区分。用户规范不算官方或实测证据，仅有运行时名称的条目单列待核实。

本地图鉴为独立重建。结构和关键交互参照同类样例，文字、数据与矢量插图为本地示例，未宣称是原始截图、原版代码或像素级还原。

## 完整模板示例（含来源区分）

| 模板示例 | 呈现方式 | 样式类型 | 组织结构 | 来源 |
| --- | --- | --- | --- | --- |
| 图文分类卡 | 静态展示 | 图文分类 | 图片 → 加粗名称 → 副标题 → 特点 | 用户规范 · 用户提供的图文分类卡规范（会话提供） |
| 图文对比卡 | 静态展示 | 图文对比 | 两张实拍 → 图下名称 → 差异说明 → 可衔接表格 | 用户规范 · 用户提供的图文对比卡规范（会话提供） |
| 步骤卡 | 静态展示 | 步骤指南 | 动作图标 → 步骤名称 → 操作正文 → 官方入口 | 用户规范 · 用户提供的步骤卡规范（会话提供） |
| 时间轴 | 静态展示 | 时间轴 | 统一时间粒度 → 事件标题 → 事件说明 | 用户规范 · 用户提供的时间轴规范（会话提供） |
| 原理关系示意图 | 静态展示 | 关系示意 | 命名对象 → 稳定颜色 → 箭头 → 示意图标题 | 用户规范 · 用户提供的原理关系示意图规范（会话提供） |
| 生成式表格 | 静态展示 | 生成式表格 | 统一表头 → 对齐属性 → 最多一列增强 | 用户规范 · 用户提供的生成式表格规范（会话提供） |
| 结构探索与局部讲解 | 可交互 | 交互讲解 | 大图 → 部件切换 → 对应解释 | [官方 · 7-Speed Bicycle](https://openai.com/index/gpt-6-for-everyone/) |
| 图文菜单与人数联动 | 可交互 | 图文规划 | 菜品图文 → 人数 → 采购量 → 烹饪清单 | [官方 · Planning a Sunday roast](https://openai.com/index/gpt-6-for-everyone/) |
| 胶囊衣橱与搭配清单 | 可交互 | 图文规划 | 风格筛选 → 单品卡 → 组合建议 | [官方 · Building a wardrobe](https://openai.com/index/gpt-6-for-everyone/) |
| 路线地图与站点计划 | 可交互 | 地图与行程 | 路线图 → 站点选择 → 分段说明 | [官方 · Planning a road trip](https://openai.com/index/gpt-6-for-everyone/) |
| 抽样分布与参数实验 | 可交互 | 模拟实验 | 参数控制 → 分布图 → 试验结果 | [官方 · Central limit theorem](https://openai.com/index/gpt-6-for-everyone/) |
| 构成拆解与经济解释 | 可交互 | 交互讲解 | 组成区块 → 数值 → 分项解释 | [官方 · GDP explained simply](https://openai.com/index/gpt-6-for-everyone/) |
| 视角参数与画面预览 | 可交互 | 交互讲解 | 参数滑块 → 视野示意 → 解释 | [官方 · Understanding drone photography](https://openai.com/index/gpt-6-for-everyone/) |
| 选择揭晓与概率实验 | 可交互 | 模拟实验 | 选门 → 揭晓 → 换选 → 统计 | [官方 · Monty Hall problem](https://openai.com/index/gpt-6-for-everyone/) |
| 账单明细与公平分摊 | 可交互 | 参数计算 | 账单 → 人员 → 税费 → 分摊结果 | [官方 · Bill splitter](https://openai.com/index/gpt-6-for-everyone/) |
| 储蓄计算与增长曲线 | 可交互 | 参数计算 | 输入 → 核心结果 → 曲线 → 假设 | [官方 · Retirement savings calculator](https://openai.com/index/gpt-6-for-everyone/) |
| 内嵌可玩小游戏 | 可交互 | 内嵌应用 | 游戏画面 → 控制 → 分数 → 重开 | [官方 · Retro game](https://openai.com/index/gpt-6-for-everyone/) |
| 情绪板与方向选择 | 可交互 | 创意选配 | 视觉参考 → 颜色 → 风格 → 功能 → 方向摘要 | [实测 · Dog vest moodboard](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) |
| 指标看板与情景推演 | 可交互 | 数据看板 | 指标行 → 趋势 → 情景滑块 → 口径 | [实测 · Analytics dashboard](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) |
| 人数调价与套餐估算 | 可交互 | 参数计算 | 人数 → 单价 → 合计 → 说明 | [实测 · Team plan estimate](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) |
| 节奏网格与播放工具 | 可交互 | 内嵌应用 | 音轨 → 节拍格 → 速度 → 播放 | [实测 · Drum Lab AppBlock](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) |
| 识字教学与逐题测验 | 可交互 | 学习测验 | 知识卡 → 选项 → 反馈 → 下一题 | [实测 · Learning Japanese](https://www.techradar.com/ai-platforms-assistants/chatgpt/chatgpt-just-changed-how-it-works-with-intelligent-ui-here-are-5-things-you-can-do-now-that-you-couldnt-before) |
| 多日行程与预算调节 | 可交互 | 地图与行程 | 多日切换 → 预算滑块 → 分配 → 行程 | [实测 · 3-day Tokyo itinerary](https://www.techradar.com/ai-platforms-assistants/chatgpt/chatgpt-just-changed-how-it-works-with-intelligent-ui-here-are-5-things-you-can-do-now-that-you-couldnt-before) |
| 多方案权重与推荐排序 | 可交互 | 偏好决策 | 对象卡 → 维度权重 → 排序 → 对比表 | [实测 · Comparing products](https://www.techradar.com/ai-platforms-assistants/chatgpt/chatgpt-just-changed-how-it-works-with-intelligent-ui-here-are-5-things-you-can-do-now-that-you-couldnt-before) |
| 成本预算与边界校验 | 可交互 | 参数计算 | 多项输入 → 结果行 → 超支 → 重置 | [实测 · Workshop cost calculator](https://app.therundown.ai/guides/chatgpt-intelligent-ui-guide) |

### 图文分类卡

- 案例或规范：用户提供的图文分类卡规范；来源日期 本次会话。
- 适用：三个及以上并列实体的分类、介绍或推荐。
- 本地提问：用静态图文分类卡介绍圆形、三角形和正方形，每项用相同维度说明。
- 还原边界：本地几何插图与对象一一对应；任一缺少可靠图片时全组文字退化，信息不减。

### 图文对比卡

- 案例或规范：用户提供的图文对比卡规范；来源日期 本次会话。
- 适用：恰好两个对象之间的比较和辨析。
- 本地提问：用静态图文对比卡比较相机A和相机B；没有可靠实拍图片就完整保留文字。
- 还原边界：当前无可靠实拍时整组展示文字；主页面上传名称为“相机 A”“相机 B”的实拍素材后重新选中可显示图文。超过两个对象改用分类卡。

### 步骤卡

- 案例或规范：用户提供的步骤卡规范；来源日期 本次会话。
- 适用：有明确先后顺序的操作指南。
- 本地提问：用静态步骤卡说明如何配置自己的OneAPI接口，写清位置、操作和注意事项。
- 还原边界：每步2–3句；图标均为本地支持的动作图标，任一步无合适图标则整组退为文字。

### 时间轴

- 案例或规范：用户提供的时间轴规范；来源日期 本次会话。
- 适用：有确切日期、必须按顺序理解的历史或进展。
- 本地提问：用静态时间轴回顾一个示例项目，所有节点有确切日期并统一粒度。
- 还原边界：这里是明确标注的虚构项目，日期统一到日；真实回答缺日期或粒度不统一时整组保留文字。

### 原理关系示意图

- 案例或规范：用户提供的原理关系示意图规范；来源日期 本次会话。
- 适用：用一个简图解释一个已明确的机制或关系。
- 本地提问：用静态关系示意图说明浏览器、本地服务和模型网关如何衔接。
- 还原边界：只承载简化关系；涉及解剖、精确几何或必须准确表达比例位置时退为文字，不生成通用关系图。

### 生成式表格

- 案例或规范：用户提供的生成式表格规范；来源日期 本次会话。
- 适用：两个及以上对象、各有两个及以上可对齐属性。
- 本地提问：用静态生成式表格比较三个虚构方案，只在状态列使用统一符号。
- 还原边界：数据为虚构；仅状态列使用符号，不叠加字色。未知状态不加符号，信息保持完整。

### 结构探索与局部讲解

- 案例或规范：7-Speed Bicycle；来源日期 2026-10-07。
- 适用：查看自行车结构，点选部件了解作用。
- 本地提问：交互式自行车示意图，点击车架、车轮和传动系统分别解释。
- 还原边界：本地简化矢量图，非工程结构图；另有实测齿轮滑块变体。

### 图文菜单与人数联动

- 案例或规范：Planning a Sunday roast；来源日期 2026-10-07。
- 适用：人数未定的聚餐计划。
- 本地提问：做一份可调整人数的聚餐计划，采购量随人数变化，并附准备清单。
- 还原边界：本地使用标明为示意的菜品插图；份量仅演示，不还原原菜单数据。

### 胶囊衣橱与搭配清单

- 案例或规范：Building a wardrobe；来源日期 2026-10-07。
- 适用：整理有限单品的穿搭方案。
- 本地提问：帮我整理一个胶囊衣橱，按风格选择单品，并显示搭配建议。
- 还原边界：单品为本地示意，没有商品搜索、价格或购买连接。

### 路线地图与站点计划

- 案例或规范：Planning a road trip；来源日期 2026-10-07。
- 适用：多站点行程与停留安排。
- 本地提问：用地图加站点列表展示一段三站自驾行程，点击站点查看安排。
- 还原边界：本地路线仅示意，没有真实底图、地理坐标或导航服务。

### 抽样分布与参数实验

- 案例或规范：Central limit theorem；来源日期 2026-10-07。
- 适用：理解抽样均值如何变化。
- 本地提问：做一个中心极限定理交互演示，能改变样本大小并重新抽样。
- 还原边界：本地均匀分布抽样；随机结果不冒充原演示数据。

### 构成拆解与经济解释

- 案例或规范：GDP explained simply；来源日期 2026-10-07。
- 适用：理解一个总量由什么构成。
- 本地提问：用交互图解释 GDP 构成，点选消费、投资、政府支出和净出口。
- 还原边界：金额为假设数据，非任何国家或年份的真实统计。

### 视角参数与画面预览

- 案例或规范：Understanding drone photography；来源日期 2026-10-07。
- 适用：观察摄影参数对取景的影响。
- 本地提问：用可调整高度和视角的示意图解释无人机摄影覆盖范围。
- 还原边界：采用理想化几何模型，非飞行规划或设备性能预测。

### 选择揭晓与概率实验

- 案例或规范：Monty Hall problem；来源日期 2026-10-07。
- 适用：体验条件概率与决策。
- 本地提问：做三门问题互动实验：先选门，主持人开空门，再决定是否换门。
- 还原边界：主持人总知道奖品位置、总开空门；统计来自本地试验。

### 账单明细与公平分摊

- 案例或规范：Bill splitter；来源日期 2026-10-07。
- 适用：多人共同消费分账。
- 本地提问：做一张可编辑账单，按每道菜的参与人分摊，并展示每人应付。
- 还原边界：本地账单是假设金额；官方另有夹板纸张风格变体。

### 储蓄计算与增长曲线

- 案例或规范：Retirement savings calculator；来源日期 2026-10-07。
- 适用：改变储蓄条件比较累计结果。
- 本地提问：做一个储蓄增长计算器，可以调整月存额、年限和假设年利率。
- 还原边界：按月末存入、月复利；利率为假设，不提供收益承诺。

### 内嵌可玩小游戏

- 案例或规范：Retro game；来源日期 2026-10-07。
- 适用：在回答中直接体验游戏。
- 本地提问：在对话里做一个可玩的复古小游戏，显示规则、得分和重开按钮。
- 还原边界：本地用三连棋展示游戏式回答；游戏种类和美术并非原版复刻。

### 情绪板与方向选择

- 案例或规范：Dog vest moodboard；来源日期 2026-10-08。
- 适用：挑选创意设计方向。
- 本地提问：为宠物背心做一个设计情绪板，可选风格、颜色和功能。
- 还原边界：本地服饰矢量示意，不声称是检索到的真实设计参考图。

### 指标看板与情景推演

- 案例或规范：Analytics dashboard；来源日期 2026-10-08。
- 适用：观察假设变化对指标的影响。
- 本地提问：用虚构数据做一张业务看板，情景滑块能联动指标和趋势图。
- 还原边界：全部虚构，演示统一口径的情景计算，不接真实业务系统。

### 人数调价与套餐估算

- 案例或规范：Team plan estimate；来源日期 2026-10-08。
- 适用：按席位数量估算总价。
- 本地提问：做一个按人数计算每月价格的小工具，假设每人29元。
- 还原边界：固定单价仅用于本地演示，无真实产品报价。

### 节奏网格与播放工具

- 案例或规范：Drum Lab AppBlock；来源日期 2026-10-08。
- 适用：在回答中操作一个专用工具。
- 本地提问：做一个鼓机节奏工具，可切换节拍格、调整速度并播放。
- 还原边界：本地独立 Web Audio 实现；点击播放才发声，不是原 AppBlock 代码。

### 识字教学与逐题测验

- 案例或规范：Learning Japanese；来源日期 2026-10-08。
- 适用：学少量知识后立即自测。
- 本地提问：先介绍五个日语元音假名，再给我一个可点击作答的小测验。
- 还原边界：本地题库与反馈独立编写，不复制原测验。

### 多日行程与预算调节

- 案例或规范：3-day Tokyo itinerary；来源日期 2026-10-08。
- 适用：观察预算怎样影响行程安排。
- 本地提问：做一份三日行程，能调整总预算并查看各天安排。
- 还原边界：行程与预算为虚构；不接航班、酒店或实时地图。

### 多方案权重与推荐排序

- 案例或规范：Comparing products；来源日期 2026-10-08。
- 适用：调整偏好查看推荐变化。
- 本地提问：比较三款虚构电脑，可调续航、便携、价格的重要性并实时重排。
- 还原边界：虚构型号、标准化评分，不冒充实测商品参数。

### 成本预算与边界校验

- 案例或规范：Workshop cost calculator；来源日期 2026-10-08。
- 适用：根据人数与单价检查预算。
- 本地提问：做一个工作坊成本计算器，能改人数、场地费、餐食费、物料费和预算。
- 还原边界：本地计算与校验独立实现，使用假设金额。

## 待核实的服务样式线索

这些名称只说明存在于特定运行时白名单；没有据此确认GPT-6完整回答外观，不计入19项，不伪造视觉预览。

- 天气与预报：`WeatherWidgetV3`、`WeatherCurrentWithSource`
- 行情与市场：`StockChart`、`StockHeatmapWidget`
- 航班与追踪：`FlightCard`、`FlightTrackerWidget`
- 赛事与积分榜：`NbaScoresWidget`、`NbaStandingsWidget`
- 新闻与资讯：`NewsCarousel`、`NewsArticleWidget`
- 地点与餐馆：`LocalBusinessWidget`、`RestaurantMenuWidget`
- 邮件与写作：`DraftEmail`、`WritingBlock`
- 学习卡片与题型：`LearningFlashcards`、`LearningFillBlankCard`
- 个人财务账本：`LedgerNetWorthWidget`、`LedgerSpendByCategoryWidget`
- 任务与自动化：`AutomationPlanSummary`、`ListAutomations`

## 来源

官方展示与第三方观察分开标注。第三方来源是作者对自己ChatGPT输出的实测或响应分析；开源复刻项目不作为ChatGPT真实输出的证据。

- 你提供的六种内容呈现规范（会话提供） · 本次会话
- [OpenAI · GPT-6 官方发布演示](https://openai.com/index/gpt-6-for-everyone/) · 2026-10-07
- [OpenUI · ChatGPT 实际响应分析](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) · 2026-10-08
- [TechRadar · 作者实测与截图](https://www.techradar.com/ai-platforms-assistants/chatgpt/chatgpt-just-changed-how-it-works-with-intelligent-ui-here-are-5-things-you-can-do-now-that-you-couldnt-before) · 2026-10-08
- [The Rundown · 现场操作与校验](https://app.therundown.ai/guides/chatgpt-intelligent-ui-guide) · 2026-10-08

## 使用

打开本地应用的“模板图鉴”，点击任意样式查看完整回答。预览交互在本地完成，不调用模型；“本地回放到对话”会切换回放模式。可复制问题到实时生成模式，但实际输出由当前已配置模型和可用组件决定。

独立HTML包含6个静态展示与19个交互案例，共25个完整预览，可离线打开；静态模板不要求操作控件。图文对比缺实拍时保留完整文字，主应用可使用已添加实拍素材。JSON、Markdown和HTML不含模型密钥或个人对话。

重建材料：`node scripts/build_template_materials.js`。
