---
version: alpha
name: Content Studio Design System
description: "Content Studio 是面向外贸企业营销内容生产的后台 SaaS 原型。设计系统以冷静的工作台体验为目标：深色左侧导航、浅灰工作区、白色内容面板、企业蓝主操作、紧凑表单与数据卡片。规范优先服务 React/Tailwind 开发、Figma 高保真原型和 AI Agent 生成页面。"

colors:
  brand: "#365EFF"
  brand-hover: "#2547D0"
  brand-soft: "#EEF3FF"
  brand-subtle: "#F4F6FF"
  canvas: "#F7F8FB"
  surface: "#FFFFFF"
  surface-muted: "#F5F7FA"
  sidebar: "#020617"
  sidebar-surface: "#1E293B"
  text-primary: "#303133"
  text-heading: "#232E45"
  text-secondary: "#606266"
  text-tertiary: "#909399"
  text-disabled: "#A8ABB2"
  line: "#DCDFE6"
  line-soft: "#EBEEF5"
  line-strong: "#E4E7ED"
  success: "#00A85F"
  success-soft: "#ECFDF5"
  warning: "#F59E0B"
  warning-soft: "#FFFBEB"
  danger: "#FF4346"
  danger-soft: "#FFF1F0"

typography:
  page-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.30
    letterSpacing: 0
  section-title:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0
  card-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: 0
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

layout:
  sidebar-width: 300px
  topbar-height: 72px
  content-max-width: 1600px
  page-padding: 32px

components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: 0 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand}"
    borderColor: "{colors.brand}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: 0 16px
  button-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    borderColor: "{colors.line}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: 0 16px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: 0 16px
  square-icon-button:
    outlineBackgroundColor: "{colors.surface}"
    ghostBackgroundColor: "transparent"
    textColor: "{colors.text-tertiary}"
    outlineBorderColor: "{colors.line}"
    ghostBorderColor: "transparent"
    activeBackgroundColor: "{colors.brand-soft}"
    activeTextColor: "{colors.brand}"
    activeBorderColor: "#C8D2FF"
    rounded-xs: "{rounded.sm}"
    rounded-sm: "{rounded.md}"
    rounded-md: "{rounded.lg}"
    size-xs: 32px
    size-sm: 36px
    size-md: 44px
  page-header:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.md}"
    padding: 24px 28px
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line-soft}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 24px
  text-input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: 44px
    padding: 0 12px
  toast:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.lg}"
    minHeight: 40px
---

## Overview

Content Studio 是工作型后台产品，不是营销落地页。界面应该安静、密集、可扫描，优先支持重复操作、表单填写、资料管理和 AI 内容生成流程。

视觉基调由三部分构成：

- 深色左侧导航，承载产品身份、项目切换和模块层级。
- 浅灰工作区，降低长时间使用的视觉疲劳。
- 白色内容面板，承载表单、列表、卡片、抽屉和弹窗。

企业蓝 `#365EFF` 是主操作色，只用于关键操作、选中状态、焦点态和重要链接。不要把蓝色扩展成大面积装饰背景。

## Current Source Audit

当前共享组件集中在 `src/components/ui/` {-共享 UI 组件目录:承载跨页面复用的按钮、卡片、页面头部、弹窗、Toast 和布局组件}，已覆盖 `Button`、`SquareIconButton`、`PageHeader`、`FixedPageLayout`、`ListCard`、`ConfirmDialog`、`Toast`。跨业务的知识选择能力位于 `src/components/knowledge-selection/` {-知识选择组件目录:为 Copilot 和文章创作提供统一的资源选择弹窗}；AI 创作公共区块位于 `src/components/ai-workflow/` {-AI 创作组件目录:提供任务状态、输入、产物和预览组件}。

源码中高频重复但尚未统一为共享组件的结构：

- 确认、删除、放弃更改弹窗：分散在品牌档案、受众画像、知识条目、知识资料、博客文章和 AI 创作页。
- 表单字段：`TextField`、`TextAreaField`、`SelectField`、`TagInput`、`MultiSelectField` 在多个业务页面局部实现。
- 筛选和搜索：受众画像、博客文章、知识资料都有自写搜索框、筛选按钮、筛选弹层、应用和清除操作。
- 空状态：列表空、筛选无结果、预览空、资料空分别自写图标、标题、说明和操作按钮。
- 状态标签：文章状态、任务状态、资料处理状态、文件来源状态都有局部 `StatusBadge`。
- AI 创作工作台：步骤条、产物卡、引用来源卡、预览面板在策划、大纲、正文、自动创作页面高度重复。

后续新增页面不得继续复制局部 `Dialog`、`Field`、`Filter`、`EmptyState`、`StatusBadge` 样式。旧页面不要求一次性全量重构；后续改到对应区域时，应先说明可复用范围和迁移风险，再按 `docs/component-guidelines.md` {-组件规范:说明共享 UI 组件的复用、新增和变体规则} 的组件 backlog 逐步抽取。

AI 创作页和资料预览页仍存在较多裸 hex、固定字号和固定阴影。这些属于历史实现，可在不改动相关区域时保留；后续新增或重构时必须优先映射到本文件 token。

## Colors

### Brand

- `{colors.brand}`：主操作、选中状态、焦点边框、核心链接。
- `{colors.brand-hover}`：主按钮 hover、active。
- `{colors.brand-soft}` / `{colors.brand-subtle}`：选中底色、轻量提示、图标底色。

### Surface

- `{colors.canvas}`：主内容区背景。
- `{colors.surface}`：卡片、弹窗、抽屉、输入框背景。
- `{colors.surface-muted}`：页面头部、弱分区、只读输入区域。
- `{colors.sidebar}`：全局左侧导航背景。

### Text

- `{colors.text-heading}`：页面标题和强标题。
- `{colors.text-primary}`：正文和表单主要文字。
- `{colors.text-secondary}`：说明文字。
- `{colors.text-tertiary}`：占位、辅助信息、元数据。
- `{colors.text-disabled}`：禁用和弱提示。

### Semantic

- 成功：`{colors.success}` / `{colors.success-soft}`。
- 警告：`{colors.warning}` / `{colors.warning-soft}`。
- 危险：`{colors.danger}` / `{colors.danger-soft}`。

## Typography

- 字体统一使用 Inter，中文 fallback 使用系统字体、`PingFang SC`、`Microsoft YaHei`。
- 后台界面不使用 hero 级大标题。页面标题以 24px 为上限，卡片标题通常 18px。
- 字号不随视口宽度动态缩放。
- `letter-spacing` 保持 0，避免压缩中文或中英混排。
- 粗体用于层级，不用于大面积正文。

## Layout

- 左侧导航固定宽度 300px。
- 顶部栏固定高度 72px。
- 主内容最大宽度 1600px。
- 页面基础间距使用 8px 系统：8、12、16、24、32、48。
- 页面级内容优先使用单层布局；不要把整页 section 做成嵌套卡片。
- 卡片只用于具体条目、表单分组、弹窗或工具面板。

## Components

### Buttons

- 页面级按钮使用 `src/components/ui/Button.jsx`。
- `primary`：保存、新建、应用、确认等主操作。
- `secondary`：添加字段、打开选择器、导出等强辅助操作。
- `neutral`：取消、关闭、继续编辑等低风险操作。
- `danger`：删除、放弃更改等破坏性操作。
- 按钮图标统一 16px，优先放在文本左侧。
- 方形图标按钮使用 `src/components/ui/SquareIconButton.jsx`，用于收起/展开、筛选、搜索、历史、新建、更多操作等紧凑工具入口。
- 方形图标按钮分为 `outline` 和 `ghost`：结构性入口用白底浅边框 `outline`，标题后更多、上下文操作、收起态导航入口优先用无框 `ghost`。
- 方形图标按钮 hover 和 active 使用轻量底色表达状态；仅图标按钮必须有 `aria-label`。

### Forms

- 输入框高度 44px，圆角 6px。
- 必填字段用 `*` 标记，错误提示靠近字段展示。
- 焦点态使用品牌蓝边框和浅蓝 ring。
- 多选组件必须支持标签移除、下拉选择、点击外部关闭。
- 保存失败时滚动到首个错误字段。

### Cards And Panels

- 标准卡片使用白底、细边框、8px 圆角。
- 卡片 hover 可以使用轻量边框变化或低强度阴影，不使用强装饰阴影。
- 页面头部说明区使用浅灰底，不承载复杂交互。
- 列表型卡片统一使用左内容、右操作结构：标题、状态标签、元信息和标签在左侧，文字操作在右上角，窄屏时操作折到正文下方。
- 列表标题默认不带图标；只有实体识别型列表项可以配置左侧 20px 图标。状态标签紧跟标题，不放入操作区。
- 列表元信息行由多个独立字段组成，字段使用「字段名：字段值」结构，横向排列并自动换行，字段间只使用统一间距，不使用竖线、圆点或手写空格分隔。
- 元信息字段可以使用 16px lucide 图标辅助扫描；长字段必须在自身字段内截断或换行，不能挤压标题、状态标签和操作区。
- 列表文字操作必须带 16px lucide 图标，普通操作为蓝色，破坏性操作为红色，不使用按钮外框。

### Toast

- Toast 通过全局队列固定在视口顶部居中，不占页面布局空间；同时最多显示三条，超出内容进入队列。
- 视觉参照 RAGSEO `ElMessage`：6px 圆角、语义浅色背景、线性状态图标、轻量阴影，不使用边框。
- 支持 `success`、`info`、`warning`、`error`、`loading`。成功为绿色、信息为中性灰、警告为黄色、错误为红色、加载为品牌蓝。
- 文案固定 14px；短文案保持自然单行，长文案在最大 640px 宽度内完整换行，不截断。
- 默认 3 秒自动关闭；`duration: 0` 表示常驻，并可按需显示关闭按钮。
- 多操作 Toast 只用于流程型提示，操作按钮保持文字命令样式，不使用按钮外框；按钮顺序按“继续当前动作、退出/放弃、转入替代流程”排列。
- 常驻 Toast 必须绑定页面 scope，页面离开时自动清理，避免遗留失效操作。

### Modal And Drawer

- 弹窗用于确认、选择、集中表单。
- 抽屉用于创建/编辑复杂对象，右侧进入，底部固定操作区。
- 有未保存改动时关闭必须提示确认。

### Dialog / ConfirmDialog

- 确认、删除、放弃更改、离开页面等弹窗优先使用共享 `ConfirmDialog`；尚未迁移的局部弹窗按页面逐步替换。
- 两项确认继续使用 `cancelLabel / confirmLabel`；三项流程决策使用 `actions`，具体顺序和颜色按业务决策优先级定义，主推荐操作放在最右侧。
- 遮罩使用 `bg-slate-950/40` 或等价 token，不使用纯黑全遮罩。
- 容器宽度默认 `max-w-md`，复杂表单弹窗可放宽到 `520px` 或 `560px`。
- 弹窗圆角使用 8px 或 12px，阴影使用轻量高层级阴影，不新增强装饰阴影。
- 标题使用 18px 或 20px 粗体，正文使用 14px 或 15px，操作区右对齐。
- 危险确认按钮使用 `Button` 的 `danger` 变体；取消和继续编辑使用 `neutral`。
- 所有弹窗必须提供键盘可达的关闭路径；破坏性操作必须有明确确认按钮文案。
- 删除会话时，取消或关闭弹窗不得中止任务、释放线程或修改会话数据；所有副作用必须推迟到确认操作之后。

### Drawer

- 右侧抽屉用于创建/编辑复杂对象，例如受众画像、知识类型、批量字段配置。
- 抽屉遮罩覆盖除左侧导航外的可操作区域；宽度默认 `max-w-[860px]`，不要超过工作区可读宽度。
- 抽屉结构固定为顶部标题栏、可滚动正文、底部固定操作区。
- 顶部标题栏高度建议 72px，底部操作区使用白底和上边框。
- 关闭抽屉时如果存在未保存改动，必须触发 `ConfirmDialog`。
- 抽屉内表单字段必须使用统一 `FormField` 规则，不在抽屉内部重新定义另一套字段样式。

### FormField

- `FormField` 是后续抽取候选，用于统一 label、required、hint、error、disabled 和字段容器布局。
- label 使用 14px，中等或粗体；必填星号跟随 label，不单独占行。
- input/select 高度默认 44px，textarea 默认 120px 起，特殊编辑器可单独登记。
- 错误文案显示在字段下方，使用危险色，不能只改变边框不显示原因。
- hint 显示在 label 下方或字段下方，颜色使用 `{colors.text-tertiary}`。
- disabled 和 read-only 使用 `{colors.surface-muted}`，文字使用 `{colors.text-secondary}` 或 `{colors.text-disabled}`。

### TagInput / Chip

- 标签、关键词、市场、多选字段的可移除项统一为 `Chip` 候选。
- 普通 chip 使用白底、浅边框、圆角胶囊；选中或强调 chip 使用 `{colors.brand-soft}` 和 `{colors.brand}`。
- 删除按钮必须是图标按钮或可点击图标，并提供 `aria-label`。
- `TagInput` 输入高度遵循 44px，支持回车添加、重复校验、数量上限、错误提示和标签移除。
- 不要在不同业务页面分别手写标签间距、删除按钮和错误样式。

### FilterToolbar / FilterPopover

- 搜索、筛选、清除、应用这类列表控制应收敛为 `FilterToolbar` 和 `FilterPopover` 候选。
- 搜索框高度默认 44px，左侧使用搜索图标，placeholder 使用 `{colors.text-tertiary}`。
- 筛选按钮使用 `SquareIconButton`；存在筛选条件时显示品牌蓝状态和蓝点。
- 弹层宽度默认 360px，窄屏可使用 `calc(100vw - 64px)`，右侧或按钮下方对齐。
- 弹层内字段使用 `FormField` 规则；底部操作区使用“清除”和“应用”。
- 清除筛选必须重置搜索、下拉、多选、日期等所有条件；空结果必须配合 `EmptyState` 展示。

### EmptyState

- 空状态用于列表空、筛选无结果、预览空、资料空和选择器无匹配。
- 结构为图标、标题、说明、可选主操作按钮；不要只放一行弱提示文字，除非空间非常紧凑。
- 图标默认 24px 或 48px，颜色使用 `{colors.brand}` 或 `{colors.text-tertiary}`。
- 标题使用 18px 粗体，说明使用 14px 或 16px，最大宽度控制在 420px。
- 空状态容器可使用虚线边框或浅灰背景，但不得成为嵌套卡片。

### StatusBadge

- `StatusBadge` 是后续抽取候选，用于文章状态、任务状态、资料处理状态、文件来源状态。
- 尺寸默认 24px 高，圆角胶囊，文字 12px 或 13px，中等粗细。
- `success` 使用 `{colors.success}` / `{colors.success-soft}`。
- `info` 使用 `{colors.brand}` / `{colors.brand-soft}`。
- `warning` 使用 `{colors.warning}` / `{colors.warning-soft}`。
- `error` 使用 `{colors.danger}` / `{colors.danger-soft}`。
- `neutral` 使用 `{colors.text-secondary}` / `{colors.surface-muted}`。
- 状态文案必须来自 i18n 或页面 copy，不在组件内部写死业务文案。

### AIGenerationLayout

- AI 创作页使用工作台式布局：顶部固定栏、双栏主体、底部固定操作栏。
- 左侧承载过程、步骤、Agent 消息和可编辑内容；右侧承载产物预览、引用来源和评估结果。
- 策划、大纲、正文、自动创作页面的步骤条、产物卡、引用来源卡、预览面板应按统一候选组件收敛。
- `ArtifactCard` 用于可选择的 AI 产物入口，必须有选中态、标题、说明和进入提示。
- `ReferenceBlockCard` 用于引用来源或证据块，必须支持折叠、来源跳转和高亮生成内容。
- AI 页面历史裸 hex 可保留；新实现和重构必须先映射到 token，不新增新的临时色板。

### AI Workflow Message

- Agent头像为40px圆形；Copilot使用现有蓝色小机器人图标，其他专家使用角色首字母和对应语义色。
- 用户头像和气泡统一为黑底白字，气泡圆角8px；Agent输出不使用白色气泡。
- 任务状态图标为16px，并放在固定宽度槽位中：蓝色进行中、黄色等待、绿色完成、红色失败或中断、黑色静态中止。
- 任务过程正文使用14px/22px，左侧使用2px分隔线；强调步骤使用品牌蓝分隔线。
- AI紧凑表单控件高度34px、圆角6px；关键词标签输入高度86px；标题候选行最小高度42px。
- 产物卡片使用自适应宽度和最小78px高度，不能依赖固定宽度维持布局。
- 产物预览使用全部可用栏宽；搜索结果卡片在窄栏下允许操作按钮换行，不与标题或链接重叠。

### Copilot Composer

- 会话输入区使用白色悬浮卡片，圆角 24px、浅边框和轻阴影；不在卡片上方增加页面级分割线。
- 卡片最小高度 152px，正文输入区最小 72px、最大 160px；底部工具行固定为 40px 并保持垂直居中。
- 左侧放上下文添加入口和附件标签，右侧放只读模型名称及发送/停止按钮。
- 发送必须由显式按钮点击触发；Enter 仅用于换行，避免长任务要求误提交。
- 知识条目和知识文件使用共享资源选择弹窗，附件默认只作用于当前一轮输入。

## Icons

- 图标库统一使用 `lucide-react`。
- 常规按钮图标 16px。
- 卡片、列表、分区图标 20px。
- 页面级空状态或大提示图标可用 24px。
- 仅图标按钮必须有 `aria-label`。
- 图标颜色跟随文字或状态，不单独使用新的装饰色。

## Figma And AI Generation Rules

- Figma 图层命名使用英文前缀加中文说明，例如 `Button / Primary / 保存画像`。
- 原型图必须使用本文件 token，不新增未登记主色。
- 后台页面第一屏直接呈现可操作界面，不做营销站 hero。
- 按钮、输入框、卡片、Toast、Modal、Drawer 要与 React 组件命名一致。
- 生成 Figma 标注时，交互说明文字必须是可编辑文本，不要只放截图。
- 原型图中的文案、按钮位置、按钮顺序、交互状态、数据展示或页面跳转逻辑不清楚时，不要自行猜测；先列出模糊点和推荐处理方式，并向用户确认。

## Development Rules

- 新增 UI 前先读本文件和 `docs/component-guidelines.md`。
- 优先复用 `src/components/ui/`。
- 不在业务页面新增另一套按钮、Toast、页面头部、确认弹窗、表单字段、筛选弹层、空状态或状态标签样式。
- 开发时如果出现重复元素、重复布局、重复交互或已有相同可复用模块，应先说明可复用位置、建议抽取或复用方式，并询问用户是否创建共享组件、扩展共享组件或复用已有组件。
- 未经确认，不在业务页面中重复手写一套相同结构。
- 新增颜色、字号、圆角、阴影前，先判断是否能映射到现有 token。
- `src/` 和 `demo-data/` 是运行时关键目录，移动前必须同步更新引用并运行构建验证。
- Figma、文档、规范说明改动不要求构建验证；如果通过 React/Vite 代码实现 UI，则按代码改动处理。
- 代码实现的 UI、页面文案、交互、默认内容改动完成后，必须执行 `npm run build`；影响可见页面时还要浏览器验证最新内容可见。
- 开发任务与现有已开发内容、组件规范、设计规范或目录边界冲突时，不要直接覆盖已有实现；先说明冲突位置、影响范围和可选方案，并等待用户确认。

## Known Legacy Areas

- 现有页面仍混用 Tailwind 语义色和少量裸 hex，这是历史原型阶段留下的实现。
- 本规范先作为后续新增和重构标准，不要求一次性全站像素重构。
- 当前 `demo-data/` 同时服务产品可读资料和前端演示数据，路径不可随意移动。
