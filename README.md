# Judge Studio

一个本地运行的自动评估工作台：自定义 System/User Prompt、OpenAI 兼容模型与 API 地址，上传 Excel 后预览并批量执行评估。

OpenAI 模型通过 Responses API 调用，并支持按模型配置推理强度；其他服务商继续使用 OpenAI 兼容的 Chat Completions 接口。

OpenAI 评估可选择关闭、自动或强制联网搜索。搜索使用 Responses API 的 `web_search` 工具；结果详情会展示搜索词和可点击的引用来源，结果 Excel、CSV 和 JSON 也会保留这些信息。联网会增加耗时和工具调用费用，因此默认关闭。

模型输出格式完全由 Prompt 决定。工具会原样保存 JSON、纯文本或其他输出；可选的“分数字段路径”只用于生成分数统计，不参与成功/失败判定。

结果表会优先按 System Prompt 中声明的 JSON 变量分列，同时补充模型实际返回的额外字段。嵌套对象会递归展开为 `父字段.子字段`，长度不固定的数组则合并保留在一个字段中；纯文本输出单独显示在“模型输出”列，错误和中断信息不会重复复制成功结果。Excel 和 CSV 导出会完整保留原始 Excel 的所有列、Markdown 文本和单元格内换行，再在右侧追加评估状态和模型输出；重名的评估字段会自动加 `评估_` 前缀。

每次保存的评估都带有独立交互报告页，可在浏览器中查看各评分维度均分、分页预览 case、全文搜索、按状态筛选、控制输出字段显隐、展开单条输入与结论并复制完整模型输出，无需先下载 Excel。报告会自动识别 `score`、`*.score`及 `score.*` 等数值评分字段，但不自行推断满分或合格线；如果 Judge Prompt 没有输出分数，则保留通用结果预览，不强制生成分数。

运行时可配置 0–3 次自动重试。连接重置、超时、HTTP 429 和常见 5xx 错误会按指数退避重试；鉴权、Prompt 或参数错误不会重试。结果详情和 CSV 会记录实际请求次数。

批量运行支持暂停、继续和中断。暂停时不再调度新 Case，当前请求会正常完成；中断会取消当前请求、停止后续调度，并保留已经完成的结果。

## 启动

```bash
npm install
npm run dev
```

然后访问 `http://localhost:3077`。

## 云端部署

### 腾讯云免费体验版（HTTP 云函数）

项目内置 `cloudbaserc.json` 和 `scf_bootstrap`，可部署到现有 CloudBase 免费体验环境。线上版本使用静态托管 + HTTP 网关 + HTTP 云函数；Excel、评估结果和导出文件写入云存储，运行索引写入文档型数据库，不依赖云函数的临时磁盘。

```bash
tcb fn deploy judge-studio --force --yes
tcb service create -p api -f judge-studio
tcb routes edit --data '{"domain":"*","routes":[{"path":"/api","enablePathTransmission":true}]}' --yes
tcb hosting deploy ./public judge-studio --safe --verify --entry index.html,report.html
```

上线前应在云函数环境变量中设置 `JUDGE_ACCESS_USER` 与 `JUDGE_ACCESS_PASSWORD`，为业务接口启用独立密码保护；密码不要写入 `cloudbaserc.json` 或前端代码。浏览器访问还需开启匿名登录，并用 OPA 只放行所需的 `/api/*` 函数路由。免费体验版额度用尽后会停服，不会自动转为按量扣费。

### Docker / 云服务器

项目包含 `Dockerfile`、`docker-compose.yml` 和 Caddy HTTPS 反向代理配置，可部署到阿里云、腾讯云或百度智能云的国内 Linux 云服务器。`judge_data` 数据卷持久保存上传的 Excel 和评估结果，容器更新不会清空。

云端建议配置 `JUDGE_ACCESS_PASSWORD` 开启访问保护，并使用绑定到服务器的域名由 Caddy 自动提供 HTTPS。可复制 `.env.deploy.example` 为 `.env.deploy`，填写域名、访问账号和强密码，再运行：

```bash
docker compose --env-file .env.deploy up -d --build
```

API Key 仍然只在当前浏览器会话与评估请求中使用，不会写入服务器文件。

## Excel 格式

支持 `.xlsx`。第一行需要是列名。上传后可手动指定“问题列”和“回答列”，所以列名无需固定为 `query` / `answer`。其他列也可通过 `{{列名}}` 在 User Prompt 中引用。

User Prompt 中的每个 `{{变量}}` 都会生成一项 Excel 列映射。工具会自动匹配常见的 query、answer、A/B 回答、分值和备注字段；未映射变量会阻止运行，也可明确选择“固定为空”。

## API Key

API Key 仅存放于浏览器的 `sessionStorage`，并随每次评估请求传给本地服务，由本地服务代理请求模型接口；它不会写入项目文件。

## 文件与结果保存

- 上传的 Excel 会自动保存到 `data/uploads/`。
- 每次评估完成或中断时，已产生的结果会自动保存为 Excel、JSON 和 CSV，位于 `data/runs/`。
- 页面中的“已保存记录”可重新下载原始 Excel、结果 Excel、JSON 和 CSV。
- 历史记录可在二次确认后永久删除；仍被其他记录引用的原始 Excel 不会被误删。
- `data/` 已被 Git 忽略，不会推送到 GitHub；API Key 不会出现在保存文件中。
