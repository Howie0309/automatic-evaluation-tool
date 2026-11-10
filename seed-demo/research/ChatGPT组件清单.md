# ChatGPT 组件清单与证据

核对日期：2026-10-22。

覆盖本次可读取的两个版本化快照；不是所有时间、所有客户端或所有用户的完整内部组件库。

## 覆盖范围

- 本机发行包：com.openai.codex 26.1013.40934 / build 20770。
- 原子层：68 个注册项＋2 个图表渲染项，共 70 个名称。
- 宿主层：30 个常驻＋283 个按需加载，共 313 个白名单名称。
- 原子层均有本地演示；部分能力为受限映射。宿主层仅目录，未冒充原服务。
- 本地可运行协议仍为受限 DSL，不是完整 DIL 兼容运行时；不支持任意 JavaScript、DIL hooks 或私有接口。

## 证据来源

### release-native · 本机 OpenAI 客户端发行包：原子渲染注册表

webview/assets/src-f9346ee4340a.js

只读提取名称，未复制或执行供应商实现；不是公开 API 合同。

SHA-256：`677492cb58784ffda78c94c36cdd8474269565b3aa13c25dbb6de8fbf6769238`

### release-charts · 本机发行包：图表渲染标记

webview/assets/media-bd0563402ea7.js

chart / pie-chart 由渲染标记确认，与 68 项基础注册表分开计数。

SHA-256：`9837c3217b511b9a7dbc6580b3020affdc44ba95592cda2772a05b43b4b032c8`

### public-runner · 公开 DIL Runner：宿主组件白名单

https://cdn.platform.openai.com/assets/dil/runner-C-vppISG.js

该文件快照中 30 eager + 283 lazy；只证明名称出现在白名单，不证明功能开放或模型实际调用。

SHA-256：`414cdc986295e0e883a681151f5dbcd67f2892f32a3c381a98c9f645ab885c9f`

### openui-analysis · OpenUI 团队的 Intelligent UI 逆向分析

https://www.openui.com/blog/how-chatgpt-intelligent-ui-works

第三方观察，不等于 OpenAI 正式规范。

### independent-analysis · 独立实现分析：组件体系与运行时

https://github.com/Disdjj/intelligent-ui-demo/blob/main/ANALYSIS.md

用于定位可读证据；未使用仓库中的个人对话抓包。

### official-sdk · OpenAI 官方 UI 指南

https://developers.openai.com/plugins/concepts/ui-guidelines

官方 Apps SDK UI 是公开组件库，与 DIL 内部注册表不是同一份清单。

## 70 个原子层组件

| 原名 | 中文用途 | 分类 | 本地能力 |
| --- | --- | --- | --- |
| animate | 动画容器 | 状态与动画 | 独立本地演示，非原版实现 |
| animate-group | 动画组 | 状态与动画 | 独立本地演示，非原版实现 |
| animate-item | 动画项 | 状态与动画 | 独立本地演示，非原版实现 |
| badge | 徽标 | 状态与动画 | 独立本地演示，非原版实现 |
| blockquote | 引用块 | 文字与语义 | 独立本地演示，非原版实现 |
| bold | 加粗 | 文字与语义 | 独立本地演示，非原版实现 |
| box | 通用容器 | 布局与容器 | 独立本地演示，非原版实现 |
| button | 按钮 | 输入与操作 | 独立本地演示，非原版实现 |
| card | 卡片容器 | 布局与容器 | 独立本地演示，非原版实现 |
| carousel | 横向轮播 | 布局与容器 | 独立本地演示，非原版实现 |
| carousel-item | 轮播项 | 布局与容器 | 独立本地演示，非原版实现 |
| carousel-media-item | 媒体轮播项 | 布局与容器 | 受限映射：本地图片及文字卡映射，不含自动播放媒体。 |
| caption | 说明文字 | 文字与语义 | 独立本地演示，非原版实现 |
| checkbox | 复选框 | 输入与操作 | 独立本地演示，非原版实现 |
| code | 代码片段 | 文字与语义 | 独立本地演示，非原版实现 |
| col | 纵向布局 | 布局与容器 | 独立本地演示，非原版实现 |
| date-picker | 日期选择 | 输入与操作 | 独立本地演示，非原版实现 |
| divider | 分隔线 | 布局与容器 | 独立本地演示，非原版实现 |
| favicon | 站点标识 | 图像与媒体 | 受限映射：使用域名首字母标识，不自动请求外站图标。 |
| flow | 流程布局 | 布局与容器 | 独立本地演示，非原版实现 |
| flow-item | 流程节点 | 布局与容器 | 独立本地演示，非原版实现 |
| form | 表单容器 | 布局与容器 | 独立本地演示，非原版实现 |
| grid | 网格布局 | 布局与容器 | 独立本地演示，非原版实现 |
| grid-item | 网格单元 | 布局与容器 | 独立本地演示，非原版实现 |
| html-view | HTML 视图 | 图像与媒体 | 受限映射：展示 HTML 源文本，不执行任意 HTML/JavaScript。 |
| icon | 图标 | 图像与媒体 | 独立本地演示，非原版实现 |
| image | 图片 | 图像与媒体 | 独立本地演示，非原版实现 |
| input | 单行输入 | 输入与操作 | 独立本地演示，非原版实现 |
| label | 字段标签 | 文字与语义 | 独立本地演示，非原版实现 |
| link | 链接 | 文字与语义 | 独立本地演示，非原版实现 |
| list | 列表 | 数据展示 | 独立本地演示，非原版实现 |
| list-item | 列表项 | 数据展示 | 独立本地演示，非原版实现 |
| loading | 加载状态 | 状态与动画 | 独立本地演示，非原版实现 |
| loading-indicator | 加载指示器 | 状态与动画 | 独立本地演示，非原版实现 |
| lottie | Lottie 动画 | 状态与动画 | 受限映射：以本地 CSS 动画示意；没有捆绑 Lottie 解析器及专有动画资源。 |
| italic | 斜体 | 文字与语义 | 独立本地演示，非原版实现 |
| markdown | Markdown 文本 | 文字与语义 | 独立本地演示，非原版实现 |
| math | 数学表达式 | 文字与语义 | 受限映射：表达式及等式以排版文本显示；不是完整 LaTeX 引擎。 |
| popover | 弹出面板 | 浮层与翻转 | 独立本地演示，非原版实现 |
| popover-content | 弹出内容 | 浮层与翻转 | 独立本地演示，非原版实现 |
| popover-trigger | 弹出触发器 | 浮层与翻转 | 独立本地演示，非原版实现 |
| pulse-indicator | 脉冲指示 | 状态与动画 | 独立本地演示，非原版实现 |
| pressable | 可按压区域 | 输入与操作 | 独立本地演示，非原版实现 |
| radio | 单选项 | 输入与操作 | 独立本地演示，非原版实现 |
| radio-group | 单选组 | 输入与操作 | 独立本地演示，非原版实现 |
| row | 横向布局 | 布局与容器 | 独立本地演示，非原版实现 |
| search-image | 搜索图片 | 图像与媒体 | 受限映射：只引用已添加的可靠本机素材；未接入 ChatGPT 图片检索服务。 |
| select | 下拉选择 | 输入与操作 | 独立本地演示，非原版实现 |
| segmented-control | 分段选择 | 输入与操作 | 独立本地演示，非原版实现 |
| shimmer-text | 流光文字 | 状态与动画 | 独立本地演示，非原版实现 |
| slider | 滑块 | 输入与操作 | 独立本地演示，非原版实现 |
| spacer | 留白 | 布局与容器 | 独立本地演示，非原版实现 |
| strikethrough | 删除线 | 文字与语义 | 独立本地演示，非原版实现 |
| svg | 矢量图形 | 图像与媒体 | 受限映射：本地安全图形参数映射，不执行模型提供的原始 SVG。 |
| table | 表格 | 数据展示 | 独立本地演示，非原版实现 |
| table-cell | 表格单元 | 数据展示 | 独立本地演示，非原版实现 |
| table-row | 表格行 | 数据展示 | 独立本地演示，非原版实现 |
| table-section | 表格分区 | 数据展示 | 独立本地演示，非原版实现 |
| text | 正文 | 文字与语义 | 独立本地演示，非原版实现 |
| textarea | 多行输入 | 输入与操作 | 独立本地演示，非原版实现 |
| title | 标题 | 文字与语义 | 独立本地演示，非原版实现 |
| tooltip | 悬浮提示 | 浮层与翻转 | 独立本地演示，非原版实现 |
| transition | 过渡容器 | 状态与动画 | 独立本地演示，非原版实现 |
| underline | 下划线 | 文字与语义 | 独立本地演示，非原版实现 |
| celebration | 庆祝效果 | 状态与动画 | 独立本地演示，非原版实现 |
| flashcard-flip | 翻转卡片 | 浮层与翻转 | 独立本地演示，非原版实现 |
| loading-block | 骨架占位 | 状态与动画 | 独立本地演示，非原版实现 |
| youtube | 视频入口 | 图像与媒体 | 受限映射：显示用户可点击的视频入口，不自动加载第三方播放器。 |
| chart | 笛卡尔图表 | 数据展示 | 独立本地演示，非原版实现 |
| pie-chart | 饼图 | 数据展示 | 独立本地演示，非原版实现 |

## 313 个宿主白名单名称

以下全为名称证据。分类为名称推断，不提供未经核实的 API、业务数据或医疗评分公式。

### 任务与自动化

- `AutomationPlanSummary` · eager
- `ListAutomations` · lazy
- `OfferScheduledPrompt` · lazy
- `OfferSiteSchedule` · lazy
- `PushDripSeriesIntro` · lazy
- `StopPushDripSeries` · lazy
- `SuggestAutomation` · lazy
- `TaskAutopauseCard` · lazy
- `TaskExpansionCard` · lazy

### 体育赛事

- `BasketballTournamentWidget` · lazy
- `CfbGames` · lazy
- `CfbGamesWidget` · lazy
- `CricketMatchBoxscoreWidget` · lazy
- `CricketSingleMatch` · lazy
- `EplScheduleWidget` · lazy
- `EplScheduleWidgetWithSource` · lazy
- `EplStandingsWidget` · lazy
- `EplStandingsWidgetWithSource` · lazy
- `F1RacesWidget` · lazy
- `F1RacesWidgetWithSource` · lazy
- `F1StandingsWidget` · lazy
- `F1StandingsWidgetWithSource` · lazy
- `IplScheduleWidget` · lazy
- `IplScheduleWidgetWithSource` · lazy
- `IplStandingsWidget` · lazy
- `IplStandingsWidgetWithSource` · lazy
- `MarchMadness` · lazy
- `MlbScheduleWidget` · lazy
- `MlbScheduleWidgetWithSource` · lazy
- `MlbStandingsWidget` · lazy
- `MlbStandingsWidgetWithSource` · lazy
- `NbaGameBoxscoreWidget` · lazy
- `NbaGameBoxscoreWidgetWithNbaGameBoxScoreSource` · lazy
- `NbaPlayerSummaryWidget` · lazy
- `NbaPlayerSummaryWidgetWithSource` · lazy
- `NbaScheduleWidget` · lazy
- `NbaScheduleWidgetWithSource` · lazy
- `NbaScores` · lazy
- `NbaScoresWidget` · lazy
- `NbaStandingsWidget` · lazy
- `NbaStandingsWidgetWithSource` · lazy
- `NcaambScheduleWidget` · lazy
- `NcaambScheduleWidgetWithSource` · lazy
- `NcaambStandingsWidget` · lazy
- `NcaambStandingsWidgetWithSource` · lazy
- `NcaawbScheduleWidget` · lazy
- `NcaawbScheduleWidgetWithSource` · lazy
- `NcaawbStandingsWidget` · lazy
- `NcaawbStandingsWidgetWithSource` · lazy
- `NflGames` · lazy
- `NflGamesWidget` · lazy
- `NflScheduleWidget` · lazy
- `NflScheduleWidgetWithSource` · lazy
- `NflStandingsWidget` · lazy
- `NflStandingsWidgetWithSource` · lazy
- `NhlScheduleWidget` · lazy
- `NhlScheduleWidgetWithSource` · lazy
- `NhlStandingsWidget` · lazy
- `NhlStandingsWidgetWithSource` · lazy
- `SoccerGames` · lazy
- `SoccerGamesWidget` · lazy
- `SuperbowlRiddleWidget` · lazy
- `TennisPlayerSummaryWidget` · lazy
- `TennisPlayerSummaryWidgetWithSource` · lazy
- `WnbaScheduleWidget` · lazy
- `WnbaScheduleWidgetWithSource` · lazy
- `WnbaStandingsWidget` · lazy
- `WnbaStandingsWidgetWithSource` · lazy

### 医疗评分（仅名称）

- `CalculatorAbcd2ScoreForTransientIschemicAttackWidget` · lazy
- `CalculatorApacheIiScoreWidget` · lazy
- `CalculatorApgarScoreWidget` · lazy
- `CalculatorAsaPhysicalStatusClassificationWidget` · lazy
- `CalculatorBilitoolWidget` · lazy
- `CalculatorBisapScoreForPancreatitisWidget` · lazy
- `CalculatorBishopScoreForCervicalRipeningWidget` · lazy
- `CalculatorCanadianCtHeadRuleWidget` · lazy
- `CalculatorCha2ds2VascScoreForAtrialFibrillationStrokeRiskWidget` · lazy
- `CalculatorChildPughScoreForCirrhosisWidget` · lazy
- `CalculatorCorrectedAdjustedAgeOfPretermInfantsWidget` · lazy
- `CalculatorCurb65ScoreForPneumoniaWidget` · lazy
- `CalculatorDukeTreadmillScoreWidget` · lazy
- `CalculatorFourTScoreForHeparinInducedThrombocytopeniaWidget` · lazy
- `CalculatorGlasgowBlatchfordScoreForUpperGiBleedingWidget` · lazy
- `CalculatorGlasgowComaScaleGcsWidget` · lazy
- `CalculatorGraceScoreForAcuteCoronarySyndromeWidget` · lazy
- `CalculatorHasBledScoreForMajorBleedingRiskWidget` · lazy
- `CalculatorHeartScoreForMajorCardiacEventsWidget` · lazy
- `CalculatorHuntAndHessScoreForSubarachnoidHemorrhageWidget` · lazy
- `CalculatorIchScoreWidget` · lazy
- `CalculatorIsthDicScoreWidget` · lazy
- `CalculatorModifiedRankinScaleWidget` · lazy
- `CalculatorNexusCervicalSpineRuleWidget` · lazy
- `CalculatorNihStrokeScaleNihssWidget` · lazy
- `CalculatorOttawaAnkleRuleWidget` · lazy
- `CalculatorOttawaKneeRuleWidget` · lazy
- `CalculatorPaduaPredictionScoreForVenousThromboembolismRiskWidget` · lazy
- `CalculatorPecarnPediatricHeadInjuryRuleWidget` · lazy
- `CalculatorPediatricEarlyWarningScorePewsWidget` · lazy
- `CalculatorPercRuleForPulmonaryEmbolismWidget` · lazy
- `CalculatorPneumoniaSeverityIndexPsiPortWidget` · lazy
- `CalculatorQsofaScoreWidget` · lazy
- `CalculatorRansonCriteriaForPancreatitisWidget` · lazy
- `CalculatorRevisedCardiacRiskIndexRcriWidget` · lazy
- `CalculatorRevisedGenevaScoreForPulmonaryEmbolismWidget` · lazy
- `CalculatorRochesterCriteriaForFebrileInfantsWidget` · lazy
- `CalculatorRockallScoreForUpperGiBleedingWidget` · lazy
- `CalculatorRoxIndexForHighFlowNasalCannulaWidget` · lazy
- `CalculatorSirsCriteriaWidget` · lazy
- `CalculatorSofaScoreWidget` · lazy
- `CalculatorStopBangScoreForObstructiveSleepApneaWidget` · lazy
- `CalculatorSurgicalApgarScoreWidget` · lazy
- `CalculatorTimiRiskWidget` · lazy
- `CalculatorWellsScoreForDeepVeinThrombosisWidget` · lazy
- `CalculatorWellsScoreForPulmonaryEmbolismWidget` · lazy
- `CalculatorWestleyCroupSeverityScoreWidget` · lazy
- `CalculatorYearsAlgorithmForPulmonaryEmbolismWidget` · lazy

### 地点旅行与服务

- `FlightCard` · eager
- `FlightCarousel` · eager
- `FlightTracker` · eager
- `ArtistUpcomingEventsWidget` · lazy
- `BusinessGalleryRefWidget` · lazy
- `BusinessGalleryWidget` · lazy
- `CareProviderResultsWidget` · lazy
- `CareProviderSidebarWidget` · lazy
- `EventSidebarWidget` · lazy
- `FlightResults` · lazy
- `FlightSearchForm` · lazy
- `FlightTrackerWidget` · lazy
- `LocalBusinessWidget` · lazy
- `PlacesMetadataBar` · lazy
- `ReservationTimePillsRefCarouselWidget` · lazy
- `ReservationTimePillsRefWidget` · lazy
- `RestaurantMenuRefWidget` · lazy
- `RestaurantMenuWidget` · lazy
- `RestaurantReviews` · lazy

### 媒体内容与写作

- `AsyncImage` · eager
- `AsyncImageGroup` · eager
- `AsyncVideo` · eager
- `GenImage` · eager
- `MediaFallback` · eager
- `NewsCarousel` · eager
- `SpeechSynthesizer` · eager
- `WritingBlock` · eager
- `AsyncVideoCarousel` · lazy
- `ConversationalOnboardingWriting` · lazy
- `DraftEmail` · lazy
- `EmailPreview` · lazy
- `ImageGenWidget` · lazy
- `ImageGrid` · lazy
- `LyricsWidget` · lazy
- `LyricsWidgetWithSource` · lazy
- `NewsArticleWidget` · lazy
- `NewsArticleWidgetCarousel` · lazy
- `PulseDraftEmail` · lazy
- `Reddit` · lazy
- `RedditFromProductSearch` · lazy
- `RedditFromSearch` · lazy

### 学习与测验

- `LearningVizDil` · eager
- `PersonalityQuizWidget` · eager
- `FollowUpQuiz` · lazy
- `HomeworkHelperV2` · lazy
- `LearningAudioLabelCard` · lazy
- `LearningFillBlankCard` · lazy
- `LearningFlashcards` · lazy
- `LearningImageChoiceCard` · lazy
- `LearningImageLabelCard` · lazy
- `LearningQuiz` · lazy
- `LearningSentenceBuilderCard` · lazy
- `LearningSpeakCard` · lazy
- `LearningVocabCard` · lazy
- `LearningVoiceModeLauncherCard` · lazy
- `MultipleChoiceBlockV2` · lazy
- `OpenLearningFlashcards` · lazy
- `UpdateLearningFlashcards` · lazy
- `WordCardWidget` · lazy

### 宿主交互与系统

- `OpGenuiResolvedComponentBoundary` · eager
- `CoTToolGroup` · eager
- `CodeBlock` · eager
- `FollowUp` · eager
- `FollowUpActionBar` · eager
- `MessageReaction` · eager
- `AskUserDetails` · lazy
- `AskUserLocation` · lazy
- `AskUserLocationV2` · lazy
- `AskUserLocationV2Bidi` · lazy
- `ConversationFollowUpActionList` · lazy
- `ConversationalOnboardingAdvice` · lazy
- `ConversationalOnboardingFollowUpPills` · lazy
- `ConversationalOnboardingSearch` · lazy
- `ConversationalOnboardingStudy` · lazy
- `CopyWordsWidget` · lazy
- `ElectionInfo` · lazy
- `ElectionResults` · lazy
- `ElectionResultsWidget` · lazy
- `ExampleServerActionButton` · lazy
- `FollowUpCardGroup` · lazy
- `FollowUpChoiceCard` · lazy
- `FollowUpPillGroup` · lazy
- `Gpt4oSystemCard` · lazy
- `Gpt5SystemCard` · lazy
- `InstantSuggestionsWidget` · lazy
- `InternalPartnerAppWidget` · lazy
- `JobsWidget` · lazy
- `OfferVoiceConversation` · lazy
- `OnboardingFeatureCard` · lazy
- `OnboardingPluginSuggestions` · lazy
- `OnboardingSelectionCard` · lazy
- `OnboardingText` · lazy
- `OpenDetailWidget` · lazy
- `OpenaiWidget` · lazy
- `PluginFollowup` · lazy
- `PulseExpansionCard` · lazy
- `SidebarFactTable` · lazy
- `SidebarPeopleAlsoAsk` · lazy
- `TabGroup` · lazy
- `TabbedSectionWidget` · lazy
- `VisualCardCarouselWidget` · lazy
- `WhatsNewCapabilityWelcome` · lazy

### 引用实体与推荐

- `Citation` · eager
- `Cite` · eager
- `CodeCite` · eager
- `Entity` · eager
- `FileCite` · eager
- `FileNavList` · eager
- `Link` · eager
- `LinkCard` · eager
- `MemoryCite` · eager
- `ProductCard` · eager
- `AskUserFiles` · lazy
- `Bento` · lazy
- `EntityCard` · lazy
- `EntityExplorer` · lazy
- `EntityOverviewCarouselWidget` · lazy
- `EntityOverviewWidget` · lazy
- `EntityReviewsRefWidget` · lazy
- `EntityReviewsWidget` · lazy
- `EntityThumbnailList` · lazy
- `FollowUpLinkList` · lazy
- `PersonBento` · lazy
- `PersonBentoAlwaysTrigger` · lazy
- `PersonWidget` · lazy
- `PersonWidgetAlwaysTrigger` · lazy
- `ProductCarousel` · lazy
- `Rating` · lazy
- `RecommendationCard` · lazy
- `RecommendationLinkCard` · lazy
- `WebLinksCarousel` · lazy

### 生活效率

- `CalculatorWidget` · lazy
- `CalendarEventsWidget` · lazy
- `CalendarList` · lazy
- `ChecklistWidget` · lazy
- `ClockWidget` · lazy
- `DigitalStopwatchWidget` · lazy
- `DigitalTimerWidget` · lazy
- `HolidayWidget` · lazy
- `PackageTracker` · lazy
- `PackageTrackerWidget` · lazy
- `PersistedWidgetDogfoodChecklistWidgetWithSource` · lazy
- `PersistedWidgetDogfoodDailyNutritionWidgetWithSource` · lazy
- `PersistedWidgetDogfoodExerciseLogWidgetWithSource` · lazy
- `PersistedWidgetDogfoodGoalWidgetWithSource` · lazy
- `PromptChecklist` · lazy
- `UnitConverterV2Widget` · lazy
- `UnitConverterWidget` · lazy
- `WeatherCurrentWithSource` · lazy
- `WeatherSidebarTitleWidget` · lazy
- `WeatherSidebarTitleWidgetWithSource` · lazy
- `WeatherWidget` · lazy
- `WeatherWidgetV1WithSource` · lazy
- `WeatherWidgetV3` · lazy
- `WeatherWidgetV3WithSource` · lazy
- `WeatherWidgetWithSource` · lazy

### 金融与账本

- `CurrencyConverterV2Widget` · lazy
- `CurrencyConverterV2WidgetWithSource` · lazy
- `CurrencyConverterWidget` · lazy
- `CurrencyConverterWidgetWithSource` · lazy
- `FinanceOnboardingSuggestions` · lazy
- `LedgerAccountBreakdownWidget` · lazy
- `LedgerAccountsWidget` · lazy
- `LedgerCreditScoreDetail` · lazy
- `LedgerCreditScoreDetailWidget` · lazy
- `LedgerCreditScoreWidget` · lazy
- `LedgerEquityUpdatesWidget` · lazy
- `LedgerFeeInterestPaidWidget` · lazy
- `LedgerFinanceOnboardingWidget` · lazy
- `LedgerFinanceStatusBannerWidget` · lazy
- `LedgerIncomeTrackerWidget` · lazy
- `LedgerLowConfidenceCategoryCorrection` · lazy
- `LedgerLowConfidenceCategoryCorrectionCombinedWidget` · lazy
- `LedgerLowConfidenceCategoryCorrectionLegacyWidget` · lazy
- `LedgerNetWorthWidget` · lazy
- `LedgerPortfolioDistributionWidget` · lazy
- `LedgerRecentTransactionsUpcomingActivityWidget` · lazy
- `LedgerRecentTransactionsWidget` · lazy
- `LedgerRecurringTransactionsWidget` · lazy
- `LedgerRepairBankConnectionWidget` · lazy
- `LedgerSpendByCategoryDetail` · lazy
- `LedgerSpendByCategoryDetailWidget` · lazy
- `LedgerSpendByCategoryRecentTransactions` · lazy
- `LedgerSpendByCategoryRecentTransactionsWidget` · lazy
- `LedgerSpendByCategoryWidget` · lazy
- `LedgerSpendSoFarThisMonthWidget` · lazy
- `LedgerTransactionDetail` · lazy
- `LedgerTransactionDetailWidget` · lazy
- `LedgerUpcomingActivityRecentTransactions` · lazy
- `LedgerUpcomingActivityWidget` · lazy
- `LedgerWatchlistWidget` · lazy
- `StockChart` · lazy
- `StockComparisonChart` · lazy
- `StockHeatmap` · lazy
- `StockHeatmapWidget` · lazy
- `StockQuoteComparisonWidget` · lazy
- `StockQuoteWidget` · lazy

## 可复核方法

运行 `python3 scripts/extract_component_inventory.py --runner-file /path/to/downloaded-runner.js`。脚本只解析发行包索引和静态字符串，不执行下载代码，不读取账号、缓存或个人对话。

运行 `python3 scripts/build_component_materials.py` 从提取结果重建 JSON、浏览器目录和本说明。
