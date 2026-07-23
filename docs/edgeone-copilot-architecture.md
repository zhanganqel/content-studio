# EdgeOne Copilot 架构

## 适用范围

本文是 Content Studio 第一阶段 Copilot 的会话、接口、状态机和数据边界说明。当前仓库同时承载 React 前端、EdgeOne Agent Functions{-运行有状态 AI 对话的长任务函数}和 EdgeOne Node Functions{-处理健康检查及会话管理的普通函数}。

第一阶段提供普通聊天、显式知识附件、服务端历史恢复、中止和删除。文章策划、大纲、正文和产物修改工作流暂不接入普通 Copilot Agent，只保留现有 UI 组件。

## 目录与路由

```text
Content Studio/
├── src/features/copilot/
│   ├── client.js
│   ├── contracts.js
│   ├── state.js
│   ├── storage.js
│   └── useCopilotController.js
├── agents/
│   ├── _shared/
│   │   ├── attachments.ts
│   │   ├── logger.ts
│   │   ├── prompt.ts
│   │   ├── session.ts
│   │   └── sse.ts
│   ├── chat/index.ts
│   └── stop/index.ts
├── cloud-functions/
│   ├── _shared/
│   ├── health/index.ts
│   ├── conversations/index.ts
│   ├── history/index.ts
│   └── delete-conversation/index.ts
└── edgeone.json
```

- `src/features/copilot/client.js`{-前端 EdgeOne API 客户端:发送 JSON 请求并解析分块 SSE}。
- `src/features/copilot/contracts.js`{-前端协议定义:统一 UUID、附件限制和 SSE 事件解析}。
- `src/features/copilot/state.js`{-会话视图状态归一化器:把服务端会话和流式事件转换为页面数据}。
- `src/features/copilot/storage.js`{-浏览器会话与偏好存储:保存当前标签页匿名身份、会话 UI 状态和长期侧栏偏好}。
- `src/features/copilot/useCopilotController.js`{-Copilot 控制器:负责项目加载、历史恢复、发送、中止和删除}。
- `agents/_shared/session.ts`{-EdgeOne Session 适配器:让 OpenAI Agents SDK 使用平台消息存储并写入匿名用户索引}。
- `agents/chat/index.ts`{-POST /chat Agent 入口:校验请求、加载会话、调用模型并输出 SSE}。
- `agents/stop/index.ts`{-POST /stop Agent 入口:中止指定会话当前运行}。
- `cloud-functions/conversations/index.ts`{-POST /conversations:按匿名用户和项目读取会话列表}。
- `cloud-functions/history/index.ts`{-POST /history:校验会话归属并恢复消息和知识引用}。
- `cloud-functions/delete-conversation/index.ts`{-POST /delete-conversation:校验会话归属后删除服务端记录}。
- `cloud-functions/health/index.ts`{-GET /health:返回模型和配置状态，不暴露密钥}。

`_` 开头的目录只承载内部模块，不生成公开路由。Agent 路由统一导出 `onRequest(context)`{-EdgeOne Agent 请求入口函数}；Node Functions 按方法导出 `onRequestGet` 或 `onRequestPost`{-指定 HTTP 方法的函数入口}。

## 请求契约

`POST /chat`{-Copilot 流式聊天接口}必须同时携带请求头和请求体会话 ID：

```http
Makers-Conversation-Id: 123e4567-e89b-42d3-a456-426614174000
Content-Type: application/json
```

```json
{
  "conversationId": "123e4567-e89b-42d3-a456-426614174000",
  "projectId": "rejin-cnc",
  "userId": "content-studio.rejin-cnc.<anonymous-uuid>",
  "message": "Summarize the selected material.",
  "attachments": []
}
```

- `conversationId`{-会话 UUID:同时用于 EdgeOne 路由、消息存储和前端选择}必须是没有业务前缀的标准 UUID。
- `projectId`{-项目标识:隔离不同品牌项目的会话列表}。
- `userId`{-匿名用户索引:由项目 ID 和浏览器 UUID 组合，只用于当前阶段的数据隔离}。
- `message`{-本轮用户输入}。
- `attachments`{-用户明确选择的知识附件列表}最多 8 项，单项最多 12,000 字符，总计最多 48,000 字符。

单个附件字段固定为 `id`、`kind`、`title`、`content` 和可选 `sourceUrl`。`kind` 只允许 `knowledge_item` 或 `knowledge_file`。

服务端必须校验 `Makers-Conversation-Id` 与请求体 `conversationId` 完全一致。模型密钥只从 `AI_GATEWAY_API_KEY`、`AI_GATEWAY_BASE_URL` 和 `AI_GATEWAY_MODEL` 读取，不进入前端环境变量。

## SSE 事件

每个 SSE 数据对象都必须包含 `type`{-前端事件分派字段}：

| `type` | 用途 |
| --- | --- |
| `process_delta` | 展示安全的执行进度摘要，不输出隐藏思维链。 |
| `message_delta` | 追加助手正文增量。 |
| `source` | 回传本轮显式选择的知识来源。 |
| `error_message` | 返回可展示的服务端错误。 |
| `done` | 结束本轮并携带 `completed`、`cancelled` 或 `error`。 |
| `artifact` | 预留结构化产物事件，第一阶段不发送。 |
| `task_status` | 预留文章任务状态事件，第一阶段不发送。 |
| `workflow_status` | 预留文章工作流状态事件，第一阶段不发送。 |

`createSseParser`{-浏览器分块 SSE 解析器}保留未完整帧到下一网络分包，只有收到空行或流结束后才解析。`error_message` 后仍会收到 `done`，确保请求在前端进入确定的终态。

## 会话状态机

```text
idle -> loading_history -> idle
idle -> running -> completed
                -> error
                -> cancelled
```

- `loading_history`{-控制器从 EdgeOne Session 恢复当前会话消息}。
- `running`{-浏览器正在消费 SSE，EdgeOne Agent 仍在执行}。
- `completed`{-收到 outcome=completed 的 done 事件}。
- `error`{-收到 error_message、HTTP 错误或流解析错误}。
- `cancelled`{-用户中止、项目切换或关闭工作台导致请求结束}。

同一会话只允许一个运行；不同会话可以并行。项目切换时控制器先中止当前项目的浏览器请求和 Agent 运行，再加载新项目的服务端会话。删除会话必须等待服务端成功，失败时 UI 保留原会话。

## 数据边界

EdgeOne Session{-平台消息和会话存储层}是消息和历史的唯一数据源。`createEdgeOneSession`{-项目内 OpenAI Agents SDK Session 适配器}在保存真实用户和助手消息时同时写入匿名 `userId`，不会为会话索引额外制造一条重复用户消息。

知识附件正文会作为当前模型输入的一部分保存，以便后续对话继承上下文；`/history` 在返回 UI 前隐藏附件正文区块，只恢复用户原始输入、附件标签和助手来源摘要。

浏览器 `sessionStorage` 保存：

- 当前标签页 `demoSessionId`{-生成匿名 userId 的会话 UUID}。
- 当前项目选中的会话 ID。
- 项目级置顶和标题显示覆盖。

浏览器 `localStorage` 只保存侧栏折叠状态和一次性旧缓存清理标记。Copilot 请求的匿名 `userId` 使用 `content-studio.<projectId>.<demoSessionId>`；同一标签页刷新后可以恢复服务端历史，新标签页生成新身份并从空白会话开始。

输入草稿只保存在 React 页面内存，不保存会话消息、助手输出、来源或运行记录。首次加载新版本会删除旧 `content-studio-copilot-*`、Copilot 专用 `content-studio-db:*` 表和旧长期匿名身份；业务演示数据由 `demoSessionStore.js`{-Demo 会话存储服务}统一迁移到当前标签页。

## 环境与验证

`@openai/agents`{-OpenAI Agent 编排 SDK:驱动服务端对话和流式任务}固定为 `0.11.4`。`edgeone.json`{-EdgeOne 构建和运行配置:定义依赖安装、构建产物和 Agent 运行参数}使用 `openai-agents-sdk` 运行时适配、300 秒任务超时、`npm ci` 安装和 `npm run build` 构建。

```bash
npm ci
npm run typecheck:edgeone
npm run test:copilot
npm run build
git diff --check
NPM_CONFIG_CACHE=/tmp/content-studio-edgeone-npm-cache ~/.agents/edgeone-cli/bin/edgeone makers dev
```

- `npm ci`：按 `package-lock.json` 清理并安装统一依赖。
- `npm run typecheck:edgeone`：检查 Agents 和 Cloud Functions 的 TypeScript 类型。
- `npm run test:copilot`：验证 UUID、附件限制、SSE 分包、错误和完成事件契约。
- `npm run build`：生成前端生产构建。
- `git diff --check`：检查补丁空白符和格式问题。
- `NPM_CONFIG_CACHE=... edgeone makers dev`：使用可写临时缓存启动 EdgeOne 本地一体化环境，验证 `/health`、会话、聊天、历史、中止和删除。

生产部署后必须再次验证 `GET /health`、`POST /chat` 和 `POST /stop`，并确认每次 SSE 都以 `done` 事件结束。
