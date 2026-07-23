# Component Guidelines

本文件是 Content Studio 统一仓库中的共享 React 组件使用规则。视觉 token、颜色、字体、间距、图标和 Figma 生成规范以同目录 `DESIGN.md` 为准；本文件只描述现有前端组件的使用边界，不规定 EdgeOne 接口实现。

新增页面前先检查 `src/components/ui/` 是否已有可复用组件。只有当现有组件无法表达明确的新交互时，才新增组件或变体。

如果开发中发现已有相同或高度相似的模块、布局、交互或页面元素，先列出可复用位置、建议复用方式和影响范围，再询问用户是否创建共享组件、扩展共享组件或直接复用已有组件；未确认前不要在业务页面重复手写一套相同结构。

## Current Coverage

当前已存在的共享组件：

- `src/components/ui/Button.jsx` {-页面级按钮组件:提供 primary、secondary、neutral、danger 四类操作按钮}。
- `src/components/ui/SquareIconButton.jsx` {-方形图标按钮组件:用于筛选、搜索、历史、新建、收起展开等紧凑工具入口}。
- `src/components/ui/PageHeader.jsx` {-页面头部组件:统一页面标题、说明和右侧操作区}。
- `src/components/ui/FixedPageLayout.jsx` {-固定页面布局组件:提供页面头部固定区域和内部滚动主体}。
- `src/components/ui/ListCard.jsx` {-列表卡片组件:统一重复列表项的标题、元信息、标签和操作区}。
- `src/components/ui/Toast.jsx` {-全局提示组件:通过 portal 显示成功、信息、警告和错误提示}。
- `src/components/ui/ConfirmDialog.jsx` {-确认与决策弹窗:统一遮罩、焦点、Escape关闭和操作按钮样式；通过 `actions` 支持三项流程决策}。
- `src/components/knowledge-selection/KnowledgeSelectionModals.jsx` {-共享知识选择弹窗:供文章创作和 Copilot 选择知识条目或已解析文件}。
- `src/components/ai-workflow/` {-AI工作流共享组件:提供Agent头像、任务状态、任务过程、紧凑表单、标题选择、产物卡片和预览}。

当前仍分散在部分业务页面、后续适合迁移到共享组件的高频结构：

- 各业务页局部实现的确认、删除、放弃更改弹窗。
- 表单字段、文本域、下拉、多选、标签输入。
- 搜索栏、筛选按钮、筛选弹层、应用/清除筛选。
- 空状态、无匹配状态、预览空状态。
- 文章、任务、资料、来源等状态标签。
- AI 创作步骤条、产物卡、引用来源卡、预览面板和资源选择弹窗。

## Component Backlog

### P0

- 将各页面局部 `ConfirmDialog`、`DeleteDialog`、`DiscardDialog`、`UnsavedDialog` 逐步迁移到共享 `ConfirmDialog`，避免一次性扩大重构范围。
- `FormField` {-表单字段候选组件:统一 label、required、hint、error、disabled 和字段容器布局}：先支持 input、select、textarea，再扩展自定义 children。
- `StatusBadge` {-状态标签候选组件:统一 success、info、warning、error、neutral 状态色和尺寸}：先覆盖文章状态、任务状态、资料处理状态、文件来源状态。
- `EmptyState` {-空状态候选组件:统一空列表、筛选无结果、预览空和资料空的图标、标题、说明和操作按钮}：替代页面内临时空状态区块。

### P1

- `Drawer` {-右侧抽屉候选组件:统一创建和编辑复杂对象的标题栏、滚动正文、底部操作区和未保存确认}：优先覆盖受众画像和知识类型管理。
- `FilterToolbar` {-筛选工具栏候选组件:统一搜索框、筛选入口、清除全部和列表控制区}：优先覆盖受众画像、博客文章和知识资料。
- `FilterPopover` {-筛选弹层候选组件:统一筛选字段、蓝点状态、应用和清除操作}：与 `FilterToolbar` 配套抽取。
- `TagInput` {-标签输入候选组件:统一标签展示、键盘添加、重复校验、数量上限和移除按钮}：优先覆盖品牌档案、受众画像和 AI 创建任务页。

### P2

- `ArtifactCard` {-AI 产物卡候选组件:统一 AI 创作产物入口的选中态、标题、说明和跳转提示}。
- `ReferenceBlockCard` {-引用来源卡候选组件:统一引用证据、来源跳转、展开收起和生成内容高亮}。
- `AIGenerationShell` {-AI 创作工作台候选组件:统一顶部固定栏、双栏主体、底部操作栏和页面级滚动策略}。
- `ResourceSelectModal` {-资源选择弹窗候选组件:统一知识条目、知识资料、受众等可搜索多选资源的选择体验}。

## Adoption Rule

- 新页面必须优先复用现有共享组件和本 backlog 中已抽取的组件。
- 旧页面不要求一次性重构；后续改到对应区域时，再按 P0、P1、P2 顺序逐步替换。
- 抽取组件前先列出复用页面、props 需求、视觉差异和迁移风险，并向用户确认。
- 组件抽取必须保持原页面行为不变；如果会改变文案、按钮顺序、交互路径或信息架构，先说明差异并等待确认。
- 每次新增或修改共享组件后，同步更新同目录 `DESIGN.md` 和本文件。
- 组件只负责界面、交互状态和已定义的回调；接口请求、SSE 解析和会话持久化继续放在 `src/features/copilot/` {-Copilot 客户端逻辑目录:统一管理请求、状态和浏览器存储} 或 `src/services/` {-业务数据服务目录:管理项目级浏览器数据}。

## Button

- 页面级主要、次要、普通、危险操作必须优先使用 `src/components/ui/Button.jsx`。
- 默认按钮尺寸是 `h-9 px-4`，文本为 `text-sm font-semibold`，圆角为 `rounded-md`。
- 按钮内图标来自 `lucide-react`，默认 16px，并设置为装饰性图标。
- `primary` 用于保存、新建、编辑、应用筛选等主操作。
- `secondary` 用于导出、添加字段、打开选择器等重要辅助操作。
- `neutral` 用于取消、继续编辑、关闭等低风险操作。
- `danger` 只用于删除、放弃更改等破坏性确认。
- 不要在业务页面手写一套新的页面级按钮样式；表格内图标按钮、导航项、分段控制可作为更紧凑的局部控件。

## Square Icon Button

- 仅图标工具入口优先使用 `src/components/ui/SquareIconButton.jsx`，例如收起/展开、筛选、搜索、历史、新建、更多操作。
- `size="xs"` 为 32px 方形按钮，用于标题后的更多操作；`size="sm"` 为 36px，用于卡片头部和密集操作区；`size="md"` 为 44px，用于侧栏入口和主要工具区。
- `variant="outline"` 默认白底浅边框，适合展开态收起按钮、新建会话这类结构性入口；`variant="ghost"` 默认透明无边框，适合标题后更多、上下文操作和收起态导航入口。
- hover 和 `active` 状态使用轻量底色；`ghost` 不在默认状态显示边框或白底。
- 每个方形图标按钮必须提供 `aria-label`；图标来自 `lucide-react`，并作为装饰性图标渲染。
- 单图标新建、搜索、历史这类工具入口不要手写蓝色实心方块，除非需求明确指定主按钮视觉。

## Page Header

- 页面顶部说明区优先使用 `src/components/ui/PageHeader.jsx`。
- Header 承载标题、说明和右侧操作，不承载列表、表单或数据卡片。
- 右侧操作使用共享按钮，并在桌面端靠右上对齐，在较窄空间自然换行。
- 不要在每个业务页面重复手写 header 对齐和间距。

## List Card

- 除非需求明确指定特殊布局，所有列表型卡片必须优先使用 `src/components/ui/ListCard.jsx`。
- `ListCard` 用于可重复列表项，例如文章、任务、受众画像、知识对象；不要在业务页面手写新的卡片边框、标题行、元信息行和操作区布局。
- 卡片标题放在左侧主信息第一行，使用 `text-xl font-bold tracking-normal`。标题可点击时传 `onTitleClick`，由组件渲染为文本按钮；不可点击时由组件渲染普通标题。
- 标题默认不带图标。只有受众画像、知识对象等需要实体识别的列表项才传 `leadingIcon`；入口按钮、任务状态、普通文章标题不额外加标题图标。
- 状态标签通过 `statusTag` 放在标题右侧，使用圆角胶囊样式；状态标签不放到右侧操作区。
- 多字段元信息必须通过 `metaItems` 传入，每个字段是一个独立 item，不要拼成长字符串来控制样式。
- 元信息行统一使用横向排列并自动换行：`flex flex-wrap items-center gap-x-6 gap-y-2`。字段之间不用竖线、圆点或多空格分隔，靠统一间距区分。
- 单个元信息字段采用「字段名：字段值」结构；字段名和值保持在同一 item 内。空值字段不渲染，避免出现空冒号或占位符。
- 元信息字段可以配置 16px lucide 图标。日期、人员、行业、职位这类扫描型字段可以带图标；纯说明型长文本不带图标。
- 长字段必须在自身 item 内截断或随 item 换行，不能挤压标题、状态标签或右侧操作区。
- 标签组通过 `tags` 放在元信息下方；标签用于分类、关键词、已选项等非状态信息，不替代 `statusTag`。
- 右侧文字操作通过 `actions` 传入，桌面端固定在卡片右上角，窄屏时折到正文下方。操作必须使用 lucide 16px 图标；普通操作为蓝色，删除等破坏性操作使用 `tone: 'danger'`。
- 操作区只承载当前列表项的命令，不放元信息、状态说明或筛选控件。

## Toast

- 全局提示必须通过 `ToastProvider` 和 `useToast` 使用，Provider 仅在 `src/main.jsx` 挂载一次；业务页面不得再局部渲染 Toast 或自行维护关闭计时器。
- `useToast` 提供 `success`、`info`、`warning`、`error`、`loading`、`show`、`update`、`dismiss`、`dismissAll`。常规调用使用 `toast.success(message)` 等快捷方法。
- `duration` 默认 3000ms，`duration: 0` 为常驻提示；常驻流程提示必须设置 `showClose: true` 和稳定 `id`，并通过 hook 的 page scope 自动清理。
- Toast 通过 portal 渲染到 `document.body`，固定在视口顶部居中，不得占用页面布局空间；同时最多显示三条，其余排队。
- 视觉使用 RAGSEO 风格：6px 圆角、语义浅色背景、线性图标和轻量阴影，不使用边框。文案固定 14px，短文案自然单行，长文案完整换行且不截断。
- `actions` 支持单个或多个文字操作，包含 `label`、可选 `tone`、`onClick`、`closeOnClick`；默认点击后关闭。多操作用于流程型提示，按钮文案必须短，避免承载复杂表单。
- `id` 相同的 Toast 视为更新，不重复插入；`loading` 完成后必须使用 `update` 更新为成功或失败状态。

## Layout Helpers

- 需要固定视口和内部滚动的页面优先使用 `src/components/ui/FixedPageLayout.jsx`。
- 跨页面复用布局 class 放在 `src/components/layoutClasses.js`。
- 新增页面不要直接修改 `AppShell`、`Topbar`、`Sidebar` 的结构，除非需求涉及全局导航。

## Forms

- 表单字段保持 44px 左右点击高度。
- 必填、错误、禁用、只读状态必须在字段旁可见。
- 多选字段必须支持选中、取消选中、标签移除和键盘触发。
- 表单保存失败时优先展示字段级错误，必要时滚动到第一个错误字段。
- AI工作流内嵌表单使用34px紧凑控件，与文章创作任务表单保持同一视觉密度；其他业务表单继续遵循44px默认点击高度。

## AI Workflow

- Agent头像统一为40px圆形；研究、策略、内容运营和评估使用角色字母，Copilot使用当前会话区的 `Bot` 小机器人图标。
- Agent普通回复使用无气泡内容；用户消息使用黑色字母头像和黑底白字气泡。
- 任务和会话列表必须共用 `TaskStatusIcon`：进行中蓝色旋转圆环、等待黄色时钟、完成绿色对号、失败或中断红色警告、取消黑色静态圆环。
- 任务状态图标使用16px固定槽位，与任务名称第一行垂直居中。
- 任务过程只展示公开执行摘要，不展示模型隐藏推理。
- `ArtifactCard` 宽度跟随父容器；消息内最大520px，右侧栏使用全部可用宽度。
- 具体结构和状态文案以 `docs/ai-workflow-ui-components.md` 为准。
- 顶部会话重命名在标题区域完成，侧栏重命名保留行内编辑；两者必须更新同一会话记录。
- 会话删除等不可逆操作必须使用共享 `ConfirmDialog`，确认前不得执行中止或删除副作用。

## Copilot Composer

- Copilot 输入区使用悬浮卡片，不使用页面级顶部分割线；默认最小高度 152px、圆角 24px，并与消息列保持相同最大宽度。
- 文本框高度在 72px 到 160px 之间自动增长，超过后内部滚动。
- Enter、Shift+Enter、Cmd+Enter 和 Ctrl+Enter 都不发送消息；只有点击右下角圆形发送按钮才提交。
- 发送和停止共用 40px 圆形按钮位置，分别使用 `ArrowUp` 和实心 `Square` 图标。
- 左下角加号通过轻量菜单打开知识条目或知识文件选择弹窗；后续 Skill、Plugin、MCP 和 Agent 入口继续复用该菜单层级。
- 已选知识以可移除附件标签显示，单轮最多 8 项；发送后清空，历史消息只显示附件元数据。
- 当前模型仅作为只读文本显示，不使用伪下拉控件。

## Icons

- 图标库统一使用 `lucide-react`。
- 按钮图标默认 16px，卡片或区域图标默认 20px，页面级说明图标可用 24px。
- 仅图标按钮必须提供 `aria-label`。
- 图标颜色跟随文字或组件状态，不新增独立装饰色。

## Change Rule

- 新增或修改共享组件时，同步更新同目录 `DESIGN.md` 和本文件。
- 如果页面需要新的视觉变体，先把变体命名、状态和使用场景写入规范，再实现。
