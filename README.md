# Judge Studio

一个本地运行的自动评估工作台：自定义 System/User Prompt、OpenAI 兼容模型与 API 地址，上传 Excel 后预览并批量执行评估。

OpenAI 模型通过 Responses API 调用，并支持按模型配置推理强度；其他服务商继续使用 OpenAI 兼容的 Chat Completions 接口。

模型输出格式完全由 Prompt 决定。工具会原样保存 JSON、纯文本或其他输出；可选的“分数字段路径”只用于生成分数统计，不参与成功/失败判定。

结果表会优先按 System Prompt 中声明的顶层 JSON 变量分列，同时补充模型实际返回的额外字段。纯文本输出则显示为单独的“模型输出”列。CSV 导出会完整保留原始 Excel 的所有列，再在右侧追加评估状态和模型输出；重名的评估字段会自动加 `评估_` 前缀。

运行时可配置 0–3 次自动重试。连接重置、超时、HTTP 429 和常见 5xx 错误会按指数退避重试；鉴权、Prompt 或参数错误不会重试。结果详情和 CSV 会记录实际请求次数。

批量运行支持暂停、继续和中断。暂停时不再调度新 Case，当前请求会正常完成；中断会取消当前请求、停止后续调度，并保留已经完成的结果。

## 启动

```bash
npm install
npm run dev
```

然后访问 `http://localhost:3077`。

## Excel 格式

支持 `.xlsx`。第一行需要是列名。上传后可手动指定“问题列”和“回答列”，所以列名无需固定为 `query` / `answer`。其他列也可通过 `{{列名}}` 在 User Prompt 中引用。

User Prompt 中的每个 `{{变量}}` 都会生成一项 Excel 列映射。工具会自动匹配常见的 query、answer、A/B 回答、分值和备注字段；未映射变量会阻止运行，也可明确选择“固定为空”。

## API Key

API Key 仅存放于浏览器的 `sessionStorage`，并随每次评估请求传给本地服务，由本地服务代理请求模型接口；它不会写入项目文件。

## 文件与结果保存

- 上传的 Excel 会自动保存到 `data/uploads/`。
- 每次评估完成或中断时，已产生的结果会自动保存为 JSON 和 CSV，位于 `data/runs/`。
- 页面中的“已保存记录”可重新下载原始 Excel、JSON 和 CSV。
- 历史记录可在二次确认后永久删除；仍被其他记录引用的原始 Excel 不会被误删。
- `data/` 已被 Git 忽略，不会推送到 GitHub；API Key 不会出现在保存文件中。
