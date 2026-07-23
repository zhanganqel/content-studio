# Demo 数据库与会话存储

本文档说明固定演示数据库、浏览器会话快照、文章成文和 Copilot 服务端会话的边界。

## 固定数据库

`src/data/demo/database/`{-前端运行时固定演示数据库目录}保存 Rejin CNC 和 GOWE 两个完整项目的结构化种子。固定数据随前端构建发布，运行时只读，用户操作不得反写这些文件。

核心入口：

- `getDemoDatabase(projectId)`{-读取指定项目完整数据库副本}。
- `getDemoTableSeed(projectId, tableName)`{-读取指定项目单张表的深拷贝}。
- `demoTableNames`{-统一表名常量:防止 Store 使用不同字符串访问同一业务表}。

固定文章位于各项目的 `blog-articles.js`，覆盖草稿、审核中、待发布和已发布。固定任务位于 `article-creation-tasks.js`，覆盖生成中、成功未成文、已中止和生成失败。

## 浏览器会话快照

`demoSessionStore.js`{-Demo 会话存储服务:按项目和表名读写 sessionStorage 快照}使用以下 Key：

```text
content-studio-demo-session:v1:<projectId>:<tableName>
```

- 首次读取没有快照时，返回固定数据库种子或 Store 提供的页面默认值。
- 用户新增、修改或删除后，保存该表的完整快照。
- 同一标签页刷新继续读取快照。
- 新标签页没有旧快照，重新读取统一种子。
- 数据库版本不匹配时删除旧快照，避免旧字段覆盖新结构。

`localStorage`{-长期浏览器偏好存储}只保存语言、主侧边栏、Copilot 侧边栏和一次性迁移标记。画像、品牌、知识、文件、媒体、文章和任务不得写入 `localStorage`。

## 文章与任务

文章读取顺序：

1. `blogArticleStore.getBlogArticleDrafts(project)`{-文章列表读取入口}读取当前项目 `blogArticles` 会话快照。
2. 快照不存在时读取固定 `blogArticles` 种子。
3. 编辑、复制、删除和发布设置写回当前标签页的文章表快照。

任务读取顺序：

1. `blogArticleAiStore.getAiCreationTasks(projectId)`{-文章任务列表读取入口}读取当前项目 `articleCreationTasks` 会话快照。
2. 快照不存在时读取固定四状态任务种子。
3. 任务创建、阶段推进、中止、失败和删除写回任务表快照。

创作页面恢复使用 `articleWorkflowSession`{-记录当前项目、任务 ID 和查看阶段的会话表}：

1. 刷新后先读取当前项目的流程会话。
2. 再用任务 ID 从任务表读取最新任务，不使用页面组件中的旧对象。
3. 任务存在时恢复创建、策划、大纲、正文或自动创作页面。
4. 任务不存在时删除流程会话并返回文章页。

创建任务不会创建文章。成功任务的 `content.savedArticleId`{-任务已保存文章的关联字段}初始为空。点击“保存并编辑”时先写文章表，再写任务关联；任务写入失败会恢复原文章表，避免半完成状态。

## Copilot 会话

Copilot 消息、来源和历史只保存在 EdgeOne Session{-服务端聊天历史存储层}，本地固定数据库不预置聊天消息。

`sessionStorage` 只保存：

- `demoSessionId`{-当前标签页匿名身份 UUID}。
- 当前项目选中的会话 ID。
- 会话置顶和标题显示覆盖。

服务端请求使用 `content-studio.<projectId>.<demoSessionId>` 作为匿名 `userId`。同一标签页刷新后身份不变，可继续调用 `/conversations` 和 `/history` 恢复消息；新标签页生成新身份，不会读取其他用户或标签页的会话。

## 文件与媒体

固定文件和媒体继续从 `demo-data/`{-项目资料与二进制资源目录}加载。标签、处理状态、分块和上传元数据进入当前标签页快照。上传文件的 Blob{-浏览器内存中的文件二进制对象}不写入 sessionStorage，刷新后不保证恢复文件本体。

## 旧缓存清理

`cleanupLegacyDemoLocalStorage()`{-一次性旧业务缓存清理函数}删除旧画像、品牌、知识、文件、媒体、文章、任务和 Copilot 匿名身份，同时保留语言和侧边栏偏好。清理完成后使用迁移标记避免重复扫描。
