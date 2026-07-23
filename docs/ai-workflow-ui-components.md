# AI Workflow UI Components

本文档是 Copilot 结构化消息、Agent 头像、任务状态、任务过程、输入控件、产物卡片和预览页面的前端说明。当前先由 Copilot 使用；文章创作页仍保留原实现，后续接入真实后端时再迁移。

## Component Ownership

- `src/components/ai-workflow/AiWorkflowComponents.jsx` {-Agent头像、任务状态图标、任务过程和任务组渲染组件}。
- `src/components/ai-workflow/AiInputComponents.jsx` {-AI任务表单、关键词、知识资源和标题选择组件}。
- `src/components/ai-workflow/ArtifactComponents.jsx` {-产物卡片和按产物类型分派的预览组件}。
- `src/components/ai-workflow/taskCatalog.js` {-标准任务名称、所属Agent和状态文案格式器}。

## Agent Presentation

| Agent ID | 名称 | 头像 |
| --- | --- | --- |
| `researcher` | 项目研究专家 | 绿色 `R` |
| `seo_strategist` | SEO策略专家 | 黄色 `S` |
| `content_operator` | 内容运营专员 | 蓝色 `W` |
| `content_evaluator` | 内容评估专家 | 红色 `O` |
| `copilot` | Copilot | 当前会话区的蓝色 `Bot` 小机器人图标 |

用户头像读取用户名首个英文字母并转大写，无法读取时使用 `U`。用户气泡固定为黑底白字；Agent 回复使用无气泡流程布局。

## Task Status

| 状态 | 文案 | 图标 |
| --- | --- | --- |
| `running` | `正在${任务名称}...` | 蓝色旋转圆环 |
| `done` | `${任务名称}完毕。` | 绿色圆形对号 |
| `waiting_input` | `等待用户输入：${待补充内容}` | 黄色时钟 |
| `error` | `${任务名称}失败。` | 红色圆形警告 |
| `interrupted` | `${任务名称}意外中断。` | 红色圆形警告 |
| `cancelled` | `${任务名称}已中止。` | 黑色静态圆环 |

会话列表和任务过程必须使用同一个 `TaskStatusIcon`。图标占用固定16px槽位，并与任务名称第一行垂直居中。

`TaskProcessBlock` 只展示对用户有用的执行步骤、依据摘要和来源说明，不展示模型隐藏推理。

## Message UI Blocks

演示和后续结构化消息可以通过可选 `uiBlocks` 表达：

```js
uiBlocks: [
  { type: 'task_group', agentId, tasks },
  { type: 'article_task_form', values, knowledgeItemIds, knowledgeFileIds },
  { type: 'title_selector', options, selectedTitleId },
]
```

`uiBlocks` 保存在项目级会话消息表中，不发送到后端。没有该字段的旧消息继续按普通文本渲染。

## Input Components

- AI紧凑任务表单的单行控件高度为34px，字段圆角为6px。
- 关键词标签输入高度为86px，支持回车添加、去重、上限和删除。
- 知识条目和知识文件复用共享选择弹窗。
- 标题选择器行高至少42px。选择标题时，空输入框直接填入；已有草稿时换行追加。
- 表单和标题选择直接更新当前消息的 `uiBlocks`；需要刷新恢复的业务状态统一写入项目级 sessionStorage 会话快照，不再写入 localStorage。

## Artifact Components

`ArtifactCard` 使用自适应宽度：消息区最大520px，右侧产物栏使用全部可用宽度。最小高度78px，内容换行时允许自然增高。

`ArtifactPreview` 根据类型展示：

- `references`、`search_results`：来源或搜索结果，并支持添加到输入框。
- `strategy`、`keyword_strategy`：策略与关键词分组。
- `outline`：章节、要点和预计字数。
- `article`、`draft`：文章正文。
- `revision`：修改前后对比。
- `evaluation`、`suggestion`：评估结果与建议。
- `tdk`：标题、关键词和描述。

预览根容器必须使用全部可用宽度。搜索结果卡片随预览栏拖拽宽度自动重排；空间不足时操作按钮换行，不压缩标题到不可读宽度。

消息流和右侧列表点击产物时，都必须调用同一个预览入口。

## Conversation Actions

- 顶部菜单触发重命名时，在顶部标题区域编辑；侧栏触发重命名时，在对应会话行编辑。同一时间只允许一个入口处于编辑状态。
- 两种重命名入口写入同一个项目级会话对象，保存后顶部标题、侧栏列表和浮层列表同步刷新。
- 会话删除必须先使用共享 `ConfirmDialog` 二次确认；确认前不得中止任务、释放线程或删除任何关联数据。
