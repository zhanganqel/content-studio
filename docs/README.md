# Docs

这里存放 Content Studio 统一仓库的项目文档和开发约束。根目录 `README.md` {-全项目说明入口:说明统一仓库的运行、测试、部署和边界} 是项目入口；本目录负责更细的规范和说明。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| `AGENTS.md` | 项目级 AI Agent 工作规则，指导统一仓库中的前端、EdgeOne Agent 和 Node Functions 开发、测试、部署。 |
| `DESIGN.md` | 项目设计规范，包含 token、组件、icon、Figma/开发一致性规则。 |
| `component-guidelines.md` | 现有共享组件使用规则和复用确认规则。 |
| `ai-workflow-ui-components.md` | Copilot结构化消息、Agent头像、任务状态、输入组件、产物卡和预览规范。 |
| `blog-article-ai-task-flow.md` | 博客文章协同创作、自动创作、未保存退出拦截和任务成文规则。 |
| `demo-data-storage.md` | 固定演示数据库、sessionStorage 业务快照、文章任务和 Copilot 会话存储边界。 |
| `edgeone-copilot-architecture.md` | EdgeOne Copilot 会话、接口、SSE、缓存迁移和部署边界。 |
| `../demo-data/rejin-cnc/README.md` | 演示数据库说明。 |
| `../scripts/README.md` | 支持脚本说明。 |

## 维护规则

- 文档要明确说明适用范围，避免与根 README 重复。
- Agent 工作规则先更新 `AGENTS.md`，再同步根 README 的入口说明。
- 设计和组件规范先更新 `DESIGN.md`，再更新组件级说明。
- EdgeOne 接口、会话状态或 SSE 变化时，同步更新 `edgeone-copilot-architecture.md` 和根 README。
