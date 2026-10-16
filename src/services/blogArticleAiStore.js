import { listChunks } from './fileLibraryApi.js';
import { getBrandProfileDraft } from './brandProfileStore.js';
import { demoTableNames } from '../data/demo/database/schema.js';
import {
  createCollaborativeRunId,
  createContentResetState,
  createOutlineResetState,
  createPlanningResetState,
} from './blogArticleAiStageData.js';
import { readDemoSessionTable, writeDemoSessionTable } from './demoSessionStore.js';

const storageSchemaVersion = 1;

// AI 文章任务选项集中维护，创建任务页只负责展示和收集选择。
export const aiArticleLanguageOptions = ['EN', 'CN'];

export const aiArticleTypeOptions = [
  'Product Reviews（产品介绍）',
  'How-to Guides（操作指南）',
  'Ultimate Guides（深度科普）',
  'Problem-Solving（问题解决）',
  'Industry Insights（行业洞察）',
  'Listicles（清单列表）',
  'Comparison（对比分析）',
  'News（公司新闻）',
  'FAQS（常见问题解答）',
];

export const aiArticleLengthOptions = [
  '800-1200（4-5个H2）',
  '1200 -1400（5-6个H2）',
  '1400 -1600（6-7个H2）',
  '1600-2000（7-8个H2）',
  '2000-3000（8-10个H2）',
];

export const aiToneOptions = [
  'professional（专业）',
  'straightforward（直白）',
  'friendly（亲切）',
  'humorous（幽默）',
  'persuasive（说服）',
  'educational（教育引导）',
  'inspirational（激励）',
  'urgent（紧迫）',
  'empathetic（共情）',
  'objective（客观）',
  'storytelling（故事化）',
  'concise（精炼）',
  'confident（自信）',
  'enthusiastic（热情）',
];

export const aiPersonOptions = ['第一人称', '第二人称', '第三人称'];

export const aiModelOptions = ['GPT-5.5', 'GPT-5', 'GPT-4.1'];

export const aiEvaluationVersion = 'ragseo-ai-writing-evaluation-v1';

// 关键词输入支持数组或中英文逗号分隔文本，保存前统一转成数组。
export function splitAiKeywordText(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value ?? '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 品牌档案链接压缩成可读标签，用于文章内链选择。
function formatUrlLabel(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    return path ? `${parsed.hostname}${path}` : parsed.hostname;
  } catch {
    return url;
  }
}

// 从品牌档案中挑选公司和权威链接，作为最终正文内链候选。
function createSelectedBrandLinkItems(project) {
  const brandProfile = getBrandProfileDraft(project);
  const companyLinks = (brandProfile.companyLinks ?? []).filter(Boolean).slice(0, 2);
  const authorityLinks = (brandProfile.authorityLinks ?? []).filter(Boolean).slice(0, 2);

  return [
    ...companyLinks.map((url, index) => ({
      group: 'company',
      id: `company-link-${index + 1}`,
      label: formatUrlLabel(url),
      url,
    })),
    ...authorityLinks.map((url, index) => ({
      group: 'authority',
      id: `authority-link-${index + 1}`,
      label: formatUrlLabel(url),
      url,
    })),
  ];
}

// 从知识条目中提取可去重的来源链接，供最终正文引用。
function createSelectedKnowledgeLinkItems(knowledgeItems = []) {
  const seenUrls = new Set();

  return knowledgeItems
    .map((item) => item?.sourceUrl || item?.url || item?.productUrl || item?.serviceUrl || item?.caseUrl || item?.faqUrl)
    .filter(Boolean)
    .filter((url) => {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    })
    .slice(0, 4)
    .map((url, index) => ({
      group: 'knowledge',
      id: `knowledge-link-${index + 1}`,
      label: formatUrlLabel(url),
      url,
    }));
}

// 任务输入缺少 URL 时，尝试从项目知识库中补回来源地址。
function resolveKnowledgeSourceItems(inputItems, fallbackItems, project) {
  const sourceItems = Array.isArray(inputItems) ? inputItems : fallbackItems;
  const projectKnowledgeItems = project?.demoProject?.knowledgeItems ?? [];

  return sourceItems.map((item) => {
    if (
      item?.sourceUrl ||
      item?.url ||
      item?.productUrl ||
      item?.serviceUrl ||
      item?.caseUrl ||
      item?.faqUrl
    ) {
      return item;
    }

    const matchedItem = projectKnowledgeItems.find((candidate) => {
      const itemKeys = [item?.id, item?.knowledgeId, item?.sourceId, item?.title, item?.name, item?.label].filter(Boolean);
      return itemKeys.some((key) => [candidate.id, candidate.knowledgeId, candidate.title, candidate.name].includes(key));
    });

    return matchedItem ? { ...matchedItem, ...item, sourceUrl: matchedItem.sourceUrl } : item;
  });
}

export const aiReferenceSearchAnalyses = [
  {
    id: 'competitor-rapiddirect-turning-vs-milling',
    title: 'CNC Turning vs Milling: Which Machining Process is Best for Your Project?',
    url: 'https://www.rapiddirect.com/blog/cnc-turning-vs-milling-differences/',
    articleType: 'Comparison',
    relevance: 98,
    relevanceLabel: 'High',
    summary:
      'A broad process comparison covering definitions, machine movement, tooling, complexity, speed, applications, benefits, and selection criteria.',
    relevanceAnalysis:
      '与 CNC turning vs milling 主题、工艺比较型搜索意图和项目选择任务高度一致，可作为完整比较维度的主要参考。',
    marketFit:
      '英文 B2B 制造内容适合 Global 市场；技术覆盖全面，但需要压缩为更适合海外采购经理阅读的决策路径。',
    titleOpening:
      '标题直接提出项目应选择哪种工艺，开头快速定义 turning 与 milling，并把差异连接到零件制造决策。',
    narrativeStructure:
      '先分别解释两种工艺的原理、组成、操作、优势和局限，再比较运动方式、刀具、复杂度、速度与应用，最后给出选择建议。',
    readability:
      '目录和分段完整，比较维度清晰，适合深度阅读；信息量较大，需要为采购场景提炼重点。',
    eeatSignals:
      '显示作者、发布日期、更新时间、工艺图片和相关服务链接，具备明确的内容责任与维护信号。',
    borrowablePoints:
      '借鉴完整比较维度和应用场景组织方式；不照搬泛化参数、重复段落或供应商自有营销结论。',
    outline: [
      {
        level: 'H2',
        title: 'CNC milling and CNC turning fundamentals',
        children: ['Features and process', 'Benefits and drawbacks', 'Materials and operations'],
      },
      {
        level: 'H2',
        title: 'Similarities, differences, and process selection',
        children: ['Movement and tooling', 'Complexity and speed', 'Applications and final choice'],
      },
    ],
  },
  {
    id: 'competitor-protolabs-cnc-turning',
    title: 'What is CNC turning: Definition, process, and design tips',
    url: 'https://www.hubs.com/knowledge-base/what-is-cnc-turning/',
    articleType: 'Technical Guide',
    relevance: 93,
    relevanceLabel: 'High',
    summary:
      'An engineering-oriented guide to CNC turning with a concise turning-versus-milling table, machine workflow, part anatomy, and design guidance.',
    relevanceAnalysis:
      '以 CNC turning 为主，同时提供 turning 与 milling 的统一比较表，适合支撑工艺边界和设计评估标准。',
    marketFit:
      '英文工程表达简洁，适合 Global 市场技术与采购读者；需补充供应商筛选、质量文件和 RFQ 行动信息。',
    titleOpening:
      '标题以定义、流程和设计建议明确内容价值，开头从加工原理进入零件形状与工艺适配。',
    narrativeStructure:
      '按照基础定义、turning 与 milling 对比、机床流程、设备组成、设计建议、材料与后处理、FAQ 展开。',
    readability:
      '对比表和工程图示便于扫描，技术解释集中，适合转化为采购经理可使用的判断清单。',
    eeatSignals:
      '包含工艺图示、设计说明、技术术语解释和相关知识链接，工程信息之间具有清晰的逻辑连接。',
    borrowablePoints:
      '借鉴简明对比表和设计约束解释；补充质量证据、交付沟通、报价资料与供应商验证内容。',
    outline: [
      {
        level: 'H2',
        title: 'CNC turning fundamentals and comparison',
        children: ['Turning versus milling table', 'Machine process', 'Parts of a turning center'],
      },
      {
        level: 'H2',
        title: 'Design and production guidance',
        children: ['Design tips', 'Materials and post-processing', 'Frequently asked questions'],
      },
    ],
  },
  {
    id: 'competitor-fictiv-cnc-milling',
    title: 'CNC Milling Explained',
    url: 'https://www.fictiv.com/articles/cnc-milling-explained',
    articleType: 'Technical Guide',
    relevance: 91,
    relevanceLabel: 'High',
    summary:
      'A visual, workflow-led explanation of CNC milling that connects design, CAM, machining, machine components, and production choices.',
    relevanceAnalysis:
      '与 CNC milling、custom metal parts 和 DFM 工作流高度相关，可补足 milling 工艺及 CAD-CAM-加工路径的解释。',
    marketFit:
      '英文表达自然、流程感强，适合 Global 市场读者；需要与 turning 内容合并为平衡比较，并加入采购决策视角。',
    titleOpening:
      '标题简洁聚焦 milling，开头直接解释工艺并通过视频和流程说明降低理解门槛。',
    narrativeStructure:
      '从工艺定义进入设计、CAM、加工工作流，再解释机床组成、设备类型和相关制造知识。',
    readability:
      '步骤化结构、视频和图示增强可读性，适合借鉴为 DFM 与 RFQ 准备流程。',
    eeatSignals:
      '显示作者、发布日期、阅读时间、工艺视频、流程图示和 DFM 相关链接，内容责任和专业背景清晰。',
    borrowablePoints:
      '借鉴 CAD-CAM-加工工作流和 DFM 连接方式；补足 turning 对比、供应商质量证明和采购行动建议。',
    outline: [
      {
        level: 'H2',
        title: 'CNC milling definition and workflow',
        children: ['Design', 'CAM preparation', 'Machining'],
      },
      {
        level: 'H2',
        title: 'Machine construction and production options',
        children: ['Parts of a CNC mill', 'Machine types', 'Design and DFM resources'],
      },
    ],
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createAiTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `ai-task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 合并任务补丁时深合并阶段数据，避免只更新一个字段时覆盖整段产物。
function mergeTaskPatch(task, patch) {
  const {
    replaceContent,
    replaceOutline,
    replacePlanning,
    ...nextPatch
  } = patch;

  return {
    ...task,
    ...nextPatch,
    content: replaceContent ?? (nextPatch.content ? { ...(task.content ?? {}), ...nextPatch.content } : task.content),
    planning: replacePlanning ?? (nextPatch.planning ? { ...(task.planning ?? {}), ...nextPatch.planning } : task.planning),
    outline: replaceOutline ?? (nextPatch.outline ? { ...(task.outline ?? {}), ...nextPatch.outline } : task.outline),
    updatedAt: today(),
  };
}

// 任务列表优先读取当前标签页快照，首次进入时使用固定四状态任务种子。
export function getAiCreationTasks(projectId) {
  const tasks = readDemoSessionTable(projectId, demoTableNames.articleCreationTasks);
  return Array.isArray(tasks) ? tasks : [];
}

// 新建任务插入列表顶部，后续阶段通过同一个 taskId 持续更新。
export function saveAiCreationTask(projectId, taskInput) {
  const currentTasks = getAiCreationTasks(projectId);
  const task = {
    id: createAiTaskId(),
    schemaVersion: storageSchemaVersion,
    stage: 'create-task',
    evaluationVersion: aiEvaluationVersion,
    createdAt: today(),
    updatedAt: today(),
    ...taskInput,
  };
  const nextTasks = [task, ...currentTasks];

  // AI 创作任务及其阶段产物写入当前项目的 sessionStorage 快照。
  writeDemoSessionTable(projectId, demoTableNames.articleCreationTasks, nextTasks);

  return task;
}

// 更新任务只替换命中任务，并通过 mergeTaskPatch 保留已有阶段产物。
export function updateAiCreationTask(projectId, taskId, patch) {
  const currentTasks = getAiCreationTasks(projectId);
  const nextTasks = currentTasks.map((task) => (task.id === taskId ? mergeTaskPatch(task, patch) : task));

  writeDemoSessionTable(projectId, demoTableNames.articleCreationTasks, nextTasks);

  return nextTasks.find((task) => task.id === taskId);
}

export function deleteAiCreationTask(projectId, taskId) {
  const currentTasks = getAiCreationTasks(projectId);
  const nextTasks = currentTasks.filter((task) => task.id !== taskId);

  writeDemoSessionTable(projectId, demoTableNames.articleCreationTasks, nextTasks);

  return nextTasks;
}

// 协同创作转自动完成时只改任务模式和运行状态，保留已生成阶段数据。
export function convertCollaborativeTaskToAuto(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    mode: 'auto',
    stage: 'auto-generating',
    content: {
      isStopped: false,
      updatedAt: today(),
    },
  });
}

// 重置策划阶段时保留任务输入，只清空运行状态和策划产物。
// 从任务输入重新开始策划时替换全部阶段数据，防止深合并遗留旧产物。
export function restartCollaborativePlanningTask(projectId, taskId, patch = {}) {
  return updateAiCreationTask(projectId, taskId, {
    ...patch,
    errorMessage: '',
    mode: 'collaborative',
    replaceContent: createContentResetState(today()),
    replaceOutline: createOutlineResetState(today()),
    replacePlanning: createPlanningResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'planning',
  });
}

// 从已确认的策划生成标题大纲时，保留策划并清空大纲与正文。
export function startCollaborativeOutlineTask(projectId, taskId, planning = {}) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    planning,
    replaceContent: createContentResetState(today()),
    replaceOutline: createOutlineResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'outline',
  });
}

// 已中止的大纲从保留的策划结果重新运行，不触碰策划产物。
export function restartCollaborativeOutlineTask(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    replaceContent: createContentResetState(today()),
    replaceOutline: createOutlineResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'outline',
  });
}

// 从已确认的标题大纲生成正文时，保留上游输入并清空正文阶段产物。
export function startCollaborativeContentTask(projectId, taskId, outline = {}) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    outline,
    replaceContent: createContentResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'content',
  });
}

// 重新生成正文不触碰任务输入、策划和标题大纲。
export function restartCollaborativeContentTask(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    replaceContent: createContentResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'content',
  });
}

export function resetAiPlanningTask(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    replaceContent: createContentResetState(today()),
    replaceOutline: createOutlineResetState(today()),
    replacePlanning: createPlanningResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'planning',
  });
}

// 重置大纲阶段时保留策划阶段结果，只清空大纲相关状态。
export function resetAiOutlineTask(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    replaceContent: createContentResetState(today()),
    replaceOutline: createOutlineResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'outline',
  });
}

export function resetAiContentTask(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    replaceContent: createContentResetState(today()),
    runId: createCollaborativeRunId(),
    stage: 'content',
  });
}

export function resetAiAutoTask(projectId, taskId) {
  return updateAiCreationTask(projectId, taskId, {
    errorMessage: '',
    mode: 'auto',
    stage: 'auto-generating',
    content: {
      articleVersions: [],
      completedTaskIds: [],
      currentArtifactId: '',
      evaluationReports: [],
      finalEvaluationReport: null,
      finalArticle: null,
      finalRevisionRounds: [],
      isStopped: false,
      latestEvaluationReportId: '',
      latestFinalArticleId: '',
      latestTdkId: '',
      citationUsages: [],
      referenceBlocks: [],
      revisionRequests: [],
      revisionRecords: [],
      revisionSuggestions: [],
      savedArticleId: '',
      tdk: null,
      updatedAt: today(),
      visibleArtifactIds: [],
    },
    outline: {
      confirmedTitleId: '',
      completedTaskIds: [],
      currentArtifactId: '',
      isStopped: false,
      outlineTree: [],
      selectedTitleId: '',
      titleConfirmed: false,
      titleDraft: '',
      titleOptions: [],
      updatedAt: today(),
    },
    planning: {
      completedTaskIds: [],
      currentArtifactId: '',
      isStopped: false,
      strategyContent: '',
      updatedAt: today(),
    },
  });
}

// 参考文章优先使用任务手动输入，缺失时使用内置搜索分析兜底。
function getReferenceArticles(task) {
  const manualReferences = task?.taskInput?.referenceArticles ?? [];
  const searchAnalyses = task?.searchAnalyses?.length ? task.searchAnalyses : aiReferenceSearchAnalyses;
  const sourceReferences = manualReferences.length ? manualReferences : searchAnalyses.slice(0, 3);

  return sourceReferences.map((reference, index) => {
    const analysis = searchAnalyses.find((item) => item.url === reference.url);
    const source = { ...(analysis ?? {}), ...reference };
    return {
      ...source,
      id: source.id ?? `reference-${index + 1}`,
      title: source.title || `Reference Article ${index + 1}`,
      url: source.url || '',
      summary:
        source.summary ||
        'This article is used as a read-only reference for search intent, structure, and competitive angle analysis.',
      articleType: source.articleType ?? 'Reference',
      relevance: source.relevance ?? 80,
      outline: source.outline ?? [
        {
          level: 'H2',
          title: 'Search intent and decision context',
          children: ['Buyer questions', 'Evaluation criteria', 'Commercial next step'],
        },
        {
          level: 'H2',
          title: 'Core content structure',
          children: ['Problem framing', 'Process comparison', 'Supplier selection checklist'],
        },
      ],
    };
  });
}

// 根据任务输入和项目资料生成策划阶段的结构化文本。
function createStrategyContent(task, project) {
  const input = task?.taskInput ?? {};
  const demoProject = project?.demoProject ?? {};
  const brandProfile = demoProject.brandProfile ?? {};
  const companyName = demoProject.name ?? project?.name ?? 'Rejin CNC Technology Co.,Ltd';
  const brandName = brandProfile.brandName ?? 'Rejin CNC';
  const officialSite = demoProject.website ?? 'https://www.rejincnc.com/';
  const industry = demoProject.industry ?? 'Precision CNC machining and custom metal parts manufacturing';
  const articleTopic = input.articleTopic || 'CNC Turning vs. Milling: How to Choose for Your Next Project';
  const primaryKeyword = input.primaryKeyword || 'CNC machining supplier';
  const secondaryKeywordList = input.secondaryKeywords?.length
    ? input.secondaryKeywords
    : ['custom metal parts', 'DFM support', 'CNC turning vs milling'];
  const secondaryKeywords = secondaryKeywordList.join(', ');
  const audienceName = input.targetAudience?.name || input.targetAudienceName || 'Overseas Procurement Manager';
  const audienceSummary =
    input.targetAudience?.summary ||
    'Needs reliable supplier evaluation, stable quality, clear RFQ communication, and practical process-selection guidance.';
  const targetRegion = input.targetRegion || 'Global';
  const articleLanguage = input.articleLanguage || 'EN';
  const businessGoal =
    input.businessGoal ||
    '帮助海外采购用户理解工艺选择和供应商评估要点，并引导提交图纸咨询或继续阅读相关服务页面。';
  const articleType = input.articleType || 'Product Reviews（产品介绍）';
  const articleLength = input.articleLength || '1200 -1400（5-6个H2）';
  const tone = input.tone || 'professional（专业）';
  const person = input.person || '第三人称';
  const brandRequirements =
    input.brandRequirements ||
    'Keep the tone professional and evidence-based. Avoid exaggerated claims. Highlight export experience, engineering communication, stable quality control, and RFQ response speed.';
  const additionalRequirements = input.additionalRequirements || '当前任务未补充额外生成要求。';
  const capabilities = brandProfile.capabilities?.length
    ? brandProfile.capabilities.join('、')
    : 'CNC turning、CNC milling、5-axis CNC machining、sheet metal fabrication、surface treatments、DFM support';
  const certifications = brandProfile.certifications?.length ? brandProfile.certifications.join('、') : '当前资料未提供明确认证';
  const references = getReferenceArticles(task).slice(0, 4);
  const caseItems = demoProject.knowledgeItems?.filter((item) => item.type === 'case') ?? [];
  const serviceItems = demoProject.knowledgeItems?.filter((item) => item.type === 'service') ?? [];
  const productItems = demoProject.knowledgeItems?.filter((item) => item.type === 'product') ?? [];
  const selectedKnowledgeNames = input.knowledgeItems?.length
    ? input.knowledgeItems.map((item) => item.title || item.name).filter(Boolean).join('、')
    : 'CNC Turning、DFM Support、Quality Control';
  const selectedAssetNames = input.knowledgeAssets?.length
    ? input.knowledgeAssets.map((item) => item.title || item.name).filter(Boolean).join('、')
    : '主营产品.xlsx、主要服务.xlsx、解决方案.xlsx';

  const referenceLines = references.length
    ? references.map(
        (reference, index) =>
          `${index + 1}. ${reference.title}：相关度 ${reference.relevance}，类型 ${reference.articleType}。可借鉴点：${reference.summary}`,
      )
    : ['当前未提供可分析参考文章；后续应基于搜索结果或人工输入补充。'];
  const serviceLines = serviceItems.slice(0, 5).map((item) => `- ${item.title}：${item.summary}`);
  const productLines = productItems.slice(0, 4).map((item) => `- ${item.title}：${item.summary}`);
  const caseLines = caseItems.length
    ? caseItems.slice(0, 3).map((item) => `- ${item.title}：${item.summary}`)
    : ['- 当前任务未选择明确服务案例，不得虚构客户名称、项目结果或合作背景。'];

  return [
    `# 文章策划方案`,
    '',
    `## 1. 项目背景与 E-E-A-T 内容底座`,
    `项目背景用于为整篇文章建立权威性、经验感、可信度与转化信任。以下内容严格基于项目分析报告、品牌档案和已选择知识资料整理，缺失字段不自动补齐。`,
    '',
    `### 1.1 品牌基础信息`,
    `- 公司名称：${companyName}。正文中提到公司时不得改写主体名称。`,
    `- 品牌名称：${brandName}。区分大小写，用于正文自然提及、官网内链锚文本和品牌信任表达。`,
    `- 官方网站：${officialSite}。用于公司介绍来源、官网内链和事实核验。`,
    `- 所属行业：${industry}。文章语境应围绕精密 CNC 加工、定制金属零件、采购决策和工程沟通展开。`,
    '',
    `### 1.2 品牌身份`,
    `- 公司介绍：${brandProfile.summary || `${companyName} 是面向海外工业客户的中国精密制造供应商，资料显示业务覆盖 custom CNC machining、sheet metal fabrication、surface finishing 和 DFM support。成立时间、员工规模、工厂面积等未在当前资料中明确提供，不得虚构。`}`,
    `- 品牌定位：${brandProfile.positioning || '当前品牌定位字段未提供，正文不创造新的品牌口号，只围绕已知制造能力和服务范围表达。'}`,
    `- 公司资质与优势：可使用 ${capabilities} 作为服务能力基础；资质信息可提及 ${certifications}，但仅在来源明确时用于正文论证。`,
    '',
    `### 1.3 行业基准权威参考`,
    `- 当前任务未提供明确的外部权威参考网站。若后续人工补充 ISO、ASME、ASTM、行业协会、目标市场监管或标准机构来源，只能用于行业背景、标准、认证或趋势说明，不得覆盖项目分析报告中的品牌事实。`,
    '',
    `### 1.4 表达边界`,
    `- 品牌语气：${brandProfile.brandStyle?.tone || tone}。正文应保持专业、克制、工程导向、采购友好，避免空泛营销。`,
    `- 禁用表达：不得使用 best、leading、No.1、guaranteed、industry-leading 等未经证实的绝对化表达；不得写“我们一定能解决所有问题”等过度承诺。`,
    `- 禁用品牌/竞品：当前任务未提供禁用品牌清单；正文不主动提及具体竞品品牌。`,
    `- 事实边界：缺失字段不由 AI 自动补齐；无法确认的信息应跳过或标记为需人工补充。不得虚构成立时间、工厂规模、员工数量、出口国家、客户名称、认证、专利、检测报告、项目成果和技术数据。`,
    '',
    `## 2. 文章目标`,
    `基于创建任务中的业务目标、文章主题、关键词、目标市场和目标受众，本篇文章应把用户的创作意向转化为可执行的 SEO 写作策略。`,
    '',
    `### 2.1 业务目标`,
    `- 用户输入业务目标：${businessGoal}`,
    `- 目标判断：本文不是单纯科普，而是“教育市场 + 促进询盘”的混合型文章。内容需要先帮助读者理解工艺选择与供应商能力，再自然引导读者准备图纸、材料、数量、表面处理和交期信息，进入 RFQ 或咨询流程。`,
    `- 转化目标：优先引导读者查看相关服务页面、理解 ${brandName} 的服务能力，并提交图纸或需求进行 manufacturability review / quotation。`,
    '',
    `### 2.2 目标市场`,
    `- 目标市场：${targetRegion}`,
    `- 目标语言：${articleLanguage}`,
    `- 目标市场分析：目标市场读者通常关注供应商可信度、工艺适配、报价透明度、质量控制、交期风险、出口沟通和 RFQ 准备效率。文章表达应使用英语 B2B 采购语境，避免直译腔和过度销售语气。`,
    `- 内容表达重点：把技术信息翻译成采购决策语言，例如“geometry / tolerance / material / finishing / inspection / lead time / RFQ assumptions”。`,
    '',
    `### 2.3 目标受众`,
    `- 目标受众：${audienceName}`,
    `- 受众摘要：${audienceSummary}`,
    `- 目标受众分析：该受众具备基础采购或工程沟通知识，通常不是只想了解定义，而是要判断哪类供应商、哪种工艺和哪些询盘资料能降低风险。`,
    `- 内容深度判断：面向采购角色时，重点放在可靠性、交付、认证、成本、服务能力、RFQ 准备和沟通效率；技术细节需要服务采购决策，不做孤立参数堆砌。`,
    `- 信任建立方式：优先使用公司资质、服务能力、知识资料文本块、参考网页结构和工程解释建立信任；未提供真实服务案例时不得编造案例。`,
    '',
    `## 3. 参考文章拆解`,
    `基于参考文章、文章主题、关键词、文章类型、目标市场和目标语言，对参考/竞对内容进行拆解，沉淀可借鉴的标题方式、结构方式、写作角度和内容空缺。无法访问的链接应跳过，并在执行记录中标明。`,
    '',
    `### 3.1 参考文章来源与相关性判断`,
    ...referenceLines,
    `- 相关性判断：以上参考文章与「${articleTopic}」「${primaryKeyword}」相关，适合借鉴搜索意图覆盖、H2/H3 组织和采购决策表达，但不能直接照搬标题、段落结构或品牌表述。`,
    `- 市场与语言匹配：参考文章以英语 B2B 表达为主，适合 ${targetRegion} / ${articleLanguage} 语境；需补充 ${companyName} 自有知识库中的能力边界。`,
    '',
    `### 3.2 优势 / 可借鉴点`,
    `- 标题优势：清晰包含工艺、选择、供应商、成本、交期等采购关键词，符合目标用户的搜索习惯。`,
    `- 叙事结构优势：通常从问题或选择场景切入，再解释工艺差异、评估标准和行动建议，适合本篇文章采用“对比决策 + 采购指南”的结构。`,
    `- 内容优势：参考文章覆盖技术解释、供应商能力、FAQ、成本交期、质量认证等内容模块，可用于判断目标读者期待的信息完整度。`,
    '',
    `### 3.3 劣势 / 内容空缺`,
    `- 内容缺口：部分参考内容停留在通用工艺介绍，缺少图纸审查、DFM、询盘准备、出口沟通和多工艺供应商协作的具体解释。`,
    `- 信任缺口：部分文章缺少来源、资质、公司能力说明或可验证的服务范围，容易显得泛泛而谈。`,
    `- SEO 缺口：部分文章 FAQ 不完整，关键词覆盖集中在标题和开头，缺少自然分布到 CTA、内链和供应商选择段落的策略。`,
    '',
    `### 3.4 差异化写作要点`,
    `- 差异化角度：围绕“工艺选择如何影响采购风险”展开，而不是只解释 turning 与 milling 的概念。`,
    `- 内容补强方向：补充 DFM review、drawing checklist、inspection report、surface finish、prototype validation、RFQ assumptions 和 export communication。`,
    `- 风险规避：不照搬夸张宣传、无来源参数、泛泛而谈的结论；不把行业常见能力写成 ${companyName} 已具备的未经证实事实。`,
    '',
    `## 4. 文章结构策划（重点）`,
    `后续标题与大纲必须基于本部分生成。文章应围绕“搜索用户如何做出更可靠的 CNC 工艺与供应商选择”构建内容骨架。`,
    '',
    `### 4.1 主题与关键词（映射用户输入）`,
    `- 文章主题：「${articleTopic}」`,
    `- 主要关键词：「${primaryKeyword}」`,
    `- 内容关键词：「${secondaryKeywords}」`,
    `- 文章类型：「${articleType}」`,
    `- 文章长度：「${articleLength}」`,
    `- 语气：「${tone}」`,
    `- 人称：「${person}」`,
    `- 生成要求（重点关注）：品牌要求：${brandRequirements}；补充生成要求：${additionalRequirements}`,
    '',
    `### 4.2 营销文案模型与叙事逻辑`,
    `- 所选模型：对比决策模型 + 采购决策指南 + PAS 轻量结构。`,
    `- 推荐理由：本主题天然包含 CNC turning 与 CNC milling 的选择问题，目标受众需要把技术差异转化为采购判断。对比决策模型有利于覆盖搜索意图，采购决策指南有利于转化，PAS 结构可在引言和 CTA 中强化“痛点 - 风险 - 解决路径”。`,
    `- 第一阶段（引言）：引入海外采购或工程团队面对的具体问题，例如“不确定零件应选择 turning 还是 milling，担心报价后才发现设计不可制造”。自然出现主要关键词 ${primaryKeyword}。`,
    `- 第二阶段（展开）：解释 CNC turning 与 CNC milling 的工艺边界、典型零件、几何特征、材料与公差影响，覆盖内容关键词与长尾表达。`,
    `- 第三阶段（核心论证）：结合知识库中的 CNC Turning、CNC Milling、DFM Support、质量控制和服务能力，说明采购前如何判断工艺适配与供应商能力。`,
    `- 第四阶段（信任建立）：自然呈现 ${companyName} 的服务能力、DFM 支持、质量控制、官网来源和可验证信息，避免硬广式表达。`,
    `- 第五阶段（行动号召）：引导读者准备 drawing、material、quantity、surface finish、tolerance、target lead time，并提交 RFQ 或查看相关服务页面。`,
    '',
    `### 4.3 建议文章骨架`,
    `- H1：应包含主要关键词或核心决策场景，例如「CNC Turning vs. Milling: How to Choose the Right Process and Supplier」。标题需兼顾搜索意图和可读性，避免夸张承诺。`,
    `- 引言：说明选择工艺不仅是技术问题，也会影响报价准确性、交期、质量检查和供应商沟通。引出本文将提供 process fit、supplier capability 和 RFQ checklist。`,
    `- H2 1：CNC Turning vs. Milling: What Each Process Does Best。目标：解释两个工艺适配边界；引用知识条目 CNC Turning / CNC Milling；关键词：CNC turning vs milling、geometry、cylindrical parts、milled components。`,
    `- H2 2：Key Decision Factors Before Sending an RFQ。目标：把用户从“了解工艺”推进到“准备询盘”；覆盖 geometry、tolerance、material、surface finish、quantity、inspection。`,
    `- H2 3：How DFM Support Reduces Procurement Risk。目标：引入 DFM Support，说明 drawing review、manufacturability feedback、prototype validation 如何降低返工与沟通成本。`,
    `- H2 4：How to Evaluate a CNC Machining Supplier。目标：将服务能力、质量控制、出口沟通、响应速度和可验证资料连接到供应商选择。可自然提及 ${companyName}，但不使用硬广表达。`,
    `- H2 5：RFQ Checklist for Overseas Buyers。目标：给出可操作清单，帮助读者准备图纸、材料、数量、公差、表面处理、检测要求和交付目标。`,
    `- H2 6：FAQ。目标：覆盖 People Also Ask 和采购常见疑问，支持长尾搜索与转化前答疑。`,
    `- 结尾 CTA：使用克制直接的行动建议，例如“Send your drawing for a manufacturability review and quotation.” 不写 guaranteed、best choice 等高风险表达。`,
    '',
    `### 4.4 关键词布局建议`,
    `- 第一阶段（引言）：自然出现 ${primaryKeyword}，并用「process selection」「supplier evaluation」「RFQ」建立主题相关性。`,
    `- 第二阶段（展开）：分布内容关键词 ${secondaryKeywords}，同时覆盖 turning parts、milling parts、geometry、tolerance、material 等语义词。`,
    `- 第三阶段（核心论证）：围绕主要关键词展开技术、产品和业务论证，避免机械堆砌，建议密度控制在 1% - 2.5%。`,
    `- 第四阶段（信任建立）：结合 ${brandName}、DFM support、quality control、inspection、export communication、custom metal parts 等关键词。`,
    `- 第五阶段（行动号召）：自然回收 ${primaryKeyword}，引导到服务页面、产品链接或咨询入口。`,
    '',
    `### 4.5 内链建议`,
    `- 锚文本原则：自然、明确、描述目标页面内容；不使用“click here”或重复堆砌同一锚文本。`,
    `- 品牌名称与官网：可用 ${brandName} 或 ${companyName} 作为公司介绍、品牌信任或 About us 相关锚文本。`,
    `- 产品 / 服务名称与链接：在对应段落加入 CNC Turning、CNC Milling、DFM Support、Surface Treatments 等服务页内链。`,
    `- 建议服务内链：`,
    ...serviceLines,
    `- 建议产品 / 应用内链：`,
    ...productLines,
    '',
    `### 4.6 FAQ 写作建议`,
    `- 检索词：${primaryKeyword}、${articleTopic}、CNC turning vs milling、DFM support、RFQ checklist。`,
    `- 问题来源：优先来自目标语言和目标市场对应的搜索结果、People Also Ask、参考文章和用户常见采购问题。`,
    `- Q1：What is the main difference between CNC turning and CNC milling?`,
    `- Q2：How do I know whether a custom metal part should be turned or milled?`,
    `- Q3：What information should buyers prepare before requesting a CNC machining quote?`,
    `- Q4：How does DFM support reduce machining cost and lead time?`,
    `- Q5：What quality checks should an overseas buyer ask a CNC supplier for?`,
    `- Q6：Can one supplier handle turning, milling, finishing, and inspection together?`,
    `- Q7：When should buyers choose prototype validation before production?`,
    '',
    `### 4.7 可调用品牌资产`,
    `- 引用知识条目：${selectedKnowledgeNames}`,
    `- 检索知识资料：${selectedAssetNames}`,
    `- 相关服务案例：`,
    ...caseLines,
    '',
    `## 5. 约束规则`,
    `在文章正式生成及后续修改时，必须按照以下规则执行，保证 SEO 内容真实、可信、可排名、可转化。`,
    '',
    `### 5.1 事实准确，禁止虚构`,
    `- 公司名称、品牌名称、公司简介、服务能力、核心优势和公司资质必须严格依据品牌档案、项目分析报告和知识库。`,
    `- 产品事实必须来自产品管理、产品链接或知识库；不得虚构产品参数、材料、尺寸、性能、认证和适用场景。`,
    `- 服务案例必须来自服务案例对象；未提供案例时，不得编造客户名称、项目结果或合作背景。`,
    `- 权威参考网站仅用于行业背景、标准、认证、趋势和第三方资料引用，不得覆盖用户确认的品牌事实。`,
    `- 不得将“可能、通常、行业常见”的内容写成公司已具备的事实。`,
    `- 最终文章必须保留引用来源清单，包括知识库来源、产品链接、公司官方网站和权威参考网站。`,
    '',
    `### 5.2 SEO 友好`,
    `- 主要关键词需自然出现在标题、引言、核心段落和结尾中，建议密度控制在 1% - 2.5%。`,
    `- 内容关键词优先服务语义覆盖，不得机械堆砌。`,
    `- 标题应兼顾主要关键词、搜索意图和可读性，避免标题党和虚假承诺。`,
    `- 文章结构需匹配 ${articleType} 和 ${articleLength}；长文需要更完整解释链条和 FAQ 支撑。`,
    `- 严禁出现“In conclusion, our brand is the best choice”等高风控、低客单价感表达。`,
    `- CTA 必须服务于业务目标，并基于真实服务能力、产品链接或品牌官网，不得过度承诺。`,
    '',
    `### 5.3 表达合理，符合阅读习惯`,
    `- 正文必须使用 ${articleLanguage}。`,
    `- 表达方式需要符合 ${targetRegion} 的阅读习惯和商业语境。`,
    `- 避免机器翻译腔、低级语法错误和不符合目标市场的表达。`,
    `- 公司名称 ${companyName} 和品牌名称 ${brandName} 必须保持标准写法，区分大小写。`,
    `- 文章语气必须符合 ${tone} 与品牌语气，保持专业、克制、工程导向、采购友好。`,
    `- 避免 best、leading、No.1、guaranteed 等未经证实的绝对化表达。`,
  ].join('\n');
}

// 清理旧模板中遗留的模型说明，避免展示到页面正文。
function normalizeStrategyContent(content) {
  return String(content ?? '').replace(/（参考质量评估模型 P0）/g, '');
}

function formatPlanningInput(value) {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values.map((item) => String(item ?? '').trim()).filter(Boolean);
  return normalized.length ? normalized.join('<br>') : '-';
}

function escapePlanningTableCell(value) {
  return formatPlanningInput(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function createPlanningTableRow(...cells) {
  return `| ${cells.map(escapePlanningTableCell).join(' | ')} |`;
}

function inferPlanningSearchIntent(articleType, articleTopic) {
  const value = `${articleType} ${articleTopic}`.toLowerCase();
  if (/comparison|\bvs\.?\b|对比|比较/.test(value)) return '比较评估';
  if (/how-to|problem-solving|guide|指南|解决/.test(value)) return '问题解决';
  if (/product|review|产品|采购/.test(value)) return '采购研究';
  if (/faq|科普|insight|洞察/.test(value)) return '信息获取';
  if (/brand|company|品牌|公司/.test(value)) return '品牌导航';
  return '信息获取与采购研究';
}

function selectPlanningCopyModel(articleType, articleTopic) {
  const value = `${articleType} ${articleTopic}`.toLowerCase();
  if (/comparison|\bvs\.?\b|对比|比较/.test(value)) {
    return {
      name: '对比模型',
      rationale: '主题包含明确的比较与决策场景，适合使用一致标准呈现差异、限制和适用条件，帮助读者完成公平选型。',
      notSelected: '不选择 Problem-Solution-Proof：当前参考文章正文与独立证明不足，不应把有限供应商资料包装成完整证明链。',
      stageNames: ['比较任务界定', '统一评估标准', '方案适配比较', '证据与限制'],
    };
  }
  if (/product|review|产品/.test(value)) {
    return {
      name: 'FAB',
      rationale: '产品型内容需要把功能与参数转换成采购方可理解的优势和业务收益，避免停留在产品罗列。',
      notSelected: '不选择 Features-to-Benefits：当前文章需要保留特性、相对优势与客户利益三层判断，而不只是功能转利益。',
      stageNames: ['买方场景', '产品特性', '相对优势', '客户利益'],
    };
  }
  if (/problem-solving|问题解决|痛点/.test(value)) {
    return {
      name: 'PAS',
      rationale: '问题解决型内容需要先明确客户问题及其业务影响，再提供有来源支持的解决路径。',
      notSelected: '不选择 PASTOR：普通博客没有足够真实故事、Offer 和异议资料支撑更长的销售叙事。',
      stageNames: ['问题', '业务影响', '解决路径', '证据与应用'],
    };
  }
  if (/how-to|ultimate|faq|guide|指南|科普/.test(value)) {
    return {
      name: 'ACCA',
      rationale: '教育型内容需要让读者从认识问题、理解方法进入证据验证和下一步行动，适合长尾搜索与专业解释。',
      notSelected: '不选择 5W1H：当前任务需要连续建立理解与信任，而不是并列回答六类基础问题。',
      stageNames: ['认知', '理解', '评估', '建立确信'],
    };
  }
  return {
    name: 'QUEST',
    rationale: 'B2B 内容需要先锁定合适读者，再解释问题、提供教育与证明，最后承接咨询或采购行动。',
    notSelected: '不选择 AIDA：当前任务以专业筛选和采购教育为主，不适合用兴趣与欲望驱动全文。',
    stageNames: ['受众筛选', '问题理解', '市场教育', '决策支持'],
  };
}

function createPlanningPreviewContent(task, project) {
  const input = task?.taskInput ?? {};
  const demoProject = project?.demoProject ?? {};
  const brandProfile = demoProject.brandProfile ?? {};
  const companyName = demoProject.name ?? project?.name ?? 'Rejin CNC Technology Co.,Ltd';
  const brandName = brandProfile.brandName ?? companyName;
  const officialSite = demoProject.website || 'https://www.rejincnc.com/';
  const targetRegion = input.targetRegion || 'Global';
  const articleLanguage = input.articleLanguage || 'EN';
  const audienceName = input.targetAudience?.name || input.targetAudience?.title || input.targetAudienceName || 'Overseas Procurement Manager';
  const businessGoal =
    input.businessGoal ||
    'Help overseas procurement teams evaluate Rejin CNC as a reliable custom metal parts supplier and submit a qualified RFQ.';
  const articleTopic = input.articleTopic || 'CNC Turning vs. Milling: How to Choose for Your Next Project';
  const primaryKeyword = input.primaryKeyword || 'CNC machining supplier';
  const secondaryKeywordList = Array.isArray(input.secondaryKeywords)
    ? input.secondaryKeywords.map((item) => String(item).trim()).filter(Boolean)
    : splitAiKeywordText(input.secondaryKeywords);
  const effectiveSecondaryKeywords = secondaryKeywordList.length
    ? secondaryKeywordList
    : ['custom metal parts', 'DFM support', 'CNC turning vs milling'];
  const articleType = input.articleType || 'Product Reviews（产品介绍）';
  const articleLength = input.articleLength || '1200 -1400（5-6个H2）';
  const tone = input.tone || 'professional（专业）';
  const person = input.person || '第三人称';
  const additionalRequirements = input.additionalRequirements || '';
  const brandRequirements =
    input.brandRequirements || brandProfile.brandStyle?.messagingPrinciples?.join('\n') || '';
  const generationRequirements = [
    brandRequirements ? `品牌要求：${brandRequirements}` : '',
    additionalRequirements ? `补充生成要求：${additionalRequirements}` : '',
  ].filter(Boolean);
  const relatedLink = input.relatedLink || input.productLink || '';
  const ctaLink = relatedLink || officialSite;
  const generationRequirementsText = formatPlanningInput(generationRequirements).replace(/\r?\n/g, '<br>');
  const searchIntent = inferPlanningSearchIntent(articleType, articleTopic);
  const copyModel = selectPlanningCopyModel(articleType, articleTopic);
  const references = getReferenceArticles(task).slice(0, 3);
  const knowledgeItems = input.knowledgeItems?.length ? input.knowledgeItems : demoProject.knowledgeItems ?? [];
  const selectedKnowledgeNames = knowledgeItems
    .slice(0, 6)
    .map((item) => item.title || item.name)
    .filter(Boolean);
  const selectedKnowledgeText = selectedKnowledgeNames.length
    ? selectedKnowledgeNames.join('、')
    : '当前任务未选择知识条目';
  const capabilities = brandProfile.capabilities?.length
    ? brandProfile.capabilities.slice(0, 6).join('、')
    : selectedKnowledgeText;
  const caseNames = (demoProject.knowledgeItems ?? [])
    .filter((item) => item.type === 'case')
    .slice(0, 3)
    .map((item) => item.title)
    .filter(Boolean);
  const linkCandidates = [
    ...(input.knowledgeItems ?? []),
    ...(demoProject.knowledgeItems ?? []).filter((item) => ['product', 'service', 'solution'].includes(item.type)),
  ]
    .map((item) => ({
      title: item.title || item.name || '',
      url: item.sourceUrl || item.productUrl || item.serviceUrl || item.url || '',
    }))
    .filter((item, index, items) => item.title && items.findIndex((candidate) => candidate.title === item.title) === index)
    .filter((item) => item.url);
  const keywordCell = (...keywords) => formatPlanningInput(keywords.flat().filter(Boolean));
  const stageRows = [
    {
      name: '引言',
      content: `从海外采购经理拿到零件图纸后，需要在 CNC turning、CNC milling 或组合加工之间做出选择的场景切入。`,
      guidance: `使用 ${tone} 语气和${person}；以零件几何、报价准确性和供应商沟通风险建立阅读价值，不作结果承诺。`,
    },
    {
      name: copyModel.stageNames[0],
      content: `解释 CNC turning 与 milling 的运动方式、典型几何和加工边界，让 ${audienceName} 先判断零件的主要制造任务。`,
      guidance: '综合三篇竞对文章的工艺解释，以知识库服务资料校准 Rejin CNC 的能力表述；不使用无来源参数。',
    },
    {
      name: copyModel.stageNames[1],
      content: `按照零件几何、旋转特征、材料、公差、批量、表面处理、检测和交付要求建立统一评估标准。`,
      guidance: `结合 ${selectedKnowledgeText}，把技术变量转换成采购判断；每项标准说明其对工艺、报价和风险的实际影响。`,
    },
    {
      name: copyModel.stageNames[2],
      content: '用选择矩阵说明圆柱和旋转零件、平面和型腔零件、复杂多面特征及组合加工分别适合的工艺路径。',
      guidance: `使用 Rejin CNC 服务页与知识库解释 turning、milling、5-axis machining 和 DFM support；遵守品牌要求，不扩展无来源能力。`,
    },
    {
      name: copyModel.stageNames[3],
      content: `通过 DFM、质量控制、制造能力和项目案例说明买方应如何验证 ${companyName} 的工艺适配与服务可靠性。`,
      guidance: `可用能力包括 ${capabilities}；案例使用 ${caseNames.join('、')}，只陈述知识库中已有的项目事实和证据边界。`,
    },
    {
      name: '信任建立与 CTA',
      content: '汇总工艺选择与供应商评估清单，引导读者准备图纸、材料、数量、公差、表面处理和交付要求并提交 RFQ。',
      guidance: `CTA 指向 ${ctaLink}，直接承接询价目标；不使用 best、leading、No.1、guaranteed 等绝对化表达。`,
    },
  ];
  const stageKeywordRows = [
    [stageRows[0].name, keywordCell(primaryKeyword), '标题相关表达与引言前段自然出现，不机械重复。', '确认主题实体并承接主搜索意图。'],
    [stageRows[1].name, keywordCell(primaryKeyword, effectiveSecondaryKeywords[2]), '用于定义比较任务和说明两种工艺的基本边界。', '覆盖问题识别与工艺比较意图。'],
    [stageRows[2].name, keywordCell(primaryKeyword, effectiveSecondaryKeywords[0]), '用于零件特征、材料、公差和采购评估标准。', '扩展采购研究与定制零件语义。'],
    [stageRows[3].name, keywordCell(primaryKeyword, effectiveSecondaryKeywords[2]), '与选择矩阵、应用场景和工艺组合自然关联。', '连接方案比较与制造路径判断。'],
    [stageRows[4].name, keywordCell(primaryKeyword, effectiveSecondaryKeywords[1]), '用于图纸审查、案例证据、质量控制和供应商能力说明。', '建立供应商实体可信度和工程支持语义。'],
    [stageRows[5].name, keywordCell(primaryKeyword), 'FAQ、总结和 CTA 中自然回收主要关键词。', '完成长尾覆盖并承接行动转化。'],
  ];
  const findLink = (pattern, fallbackIndex = 0) =>
    linkCandidates.find((item) => pattern.test(item.title)) ?? linkCandidates[fallbackIndex];
  const turningLink = findLink(/turning/i, 0);
  const millingLink = findLink(/milling/i, 1);
  const dfmLink = findLink(/dfm|manufacturability/i, 2);
  const fiveAxisLink = findLink(/5-axis|five-axis/i, 3);
  const linkRow = (stage, candidate, rationale) => [
    stage,
    candidate?.title || brandName,
    candidate?.url || officialSite,
    rationale,
  ];
  const internalLinkRows = [
    [stageRows[0].name, '不建议插入', '-', '开头优先建立采购问题和阅读价值，避免过早打断阅读。'],
    linkRow(stageRows[1].name, turningLink, '在解释旋转零件与 turning 工艺边界时提供服务详情。'),
    linkRow(stageRows[2].name, millingLink, '在说明平面、型腔和复杂几何评估标准时提供服务详情。'),
    linkRow(stageRows[3].name, dfmLink, '把工艺选择连接到图纸审查和可制造性建议。'),
    linkRow(stageRows[4].name, fiveAxisLink, '为复杂多面特征和供应商能力验证提供延伸依据。'),
    [stageRows[5].name, brandName, ctaLink, '在 RFQ 行动建议处连接官网或用户指定的咨询页面。'],
  ];
  const faqItems = [
    ['比较任务界定', `What should buyers understand first about ${articleTopic}?`],
    ['统一评估标准', `How should ${audienceName} compare options related to ${primaryKeyword}?`],
    ['方案适配比较', 'Which specifications, quality records, certifications, or reliability evidence should buyers verify?'],
    ['证据与限制', 'What should buyers know about implementation, use, maintenance, or service support?'],
    ['信任建立与 CTA', `Which delivery, compliance, or service concerns matter in ${targetRegion}?`],
    ['信任建立与 CTA', `What evidence should buyers request when evaluating ${companyName}?`],
    ['信任建立与 CTA', 'How should buyers compare alternatives and cost factors before making a decision?'],
  ];
  const referenceRows = references.map((reference) => [
    reference.title,
    reference.url,
    reference.relevanceAnalysis,
    reference.marketFit,
  ]);
  const referenceStrengthRows = references.map((reference) => [
    reference.title,
    reference.titleOpening,
    reference.narrativeStructure,
    reference.readability,
    reference.eeatSignals,
    reference.borrowablePoints,
  ]);
  const productSearchTerms = selectedKnowledgeNames
    .filter((name) => /turning|milling/i.test(name))
    .slice(0, 2);

  return [
    '# 文章策划方案',
    '',
    '## 1. 文章目标',
    '### 1.1 目标市场分析',
    `面向 ${targetRegion} 市场，以自然、克制的 ${articleLanguage} B2B 表达为主。内容同时回应海外采购人员对工艺适配、质量稳定性、交付风险、沟通效率和报价准备的关注。CTA 引导读者提交图纸、材料、数量、公差和表面处理要求，通过 ${ctaLink} 发起可执行的 RFQ。`,
    '',
    '### 1.2 目标受众分析',
    `目标读者为 ${audienceName}。该受众具备基础采购或工程沟通知识，重点关注供应商风险、质量稳定性、交付可控性和 RFQ 响应效率。文章需要帮助其快速判断零件适合 CNC turning、CNC milling 还是组合加工，识别供应商应提供的 DFM、质量和项目证据，并形成完整的 RFQ 输入清单。`,
    '',
    '### 1.3 搜索意图分析',
    `- **主要搜索意图：**${searchIntent}，重点解决 turning 与 milling 的工艺选择和供应商评估。`,
    '- **辅助搜索意图：**理解两种工艺的原理、应用边界、质量证据与询价准备要求。',
    '- **读者阶段：**从技术理解进入方案验证或供应商筛选。',
    `- **核心问题：**${audienceName} 应如何根据零件要求选择加工路径，并判断一家 ${primaryKeyword} 是否具备可靠的工程与交付支持？`,
    '',
    '### 1.4 业务目标判断',
    `文章主要服务于供应商评估和询盘转化，对应业务目标“${businessGoal}”。内容先帮助读者完成工艺判断，再通过 DFM 支持、质量控制和项目经验说明 ${companyName} 可参与制造可行性评估，最终引导读者提交合格 RFQ。`,
    '',
    '## 2. 参考文章分析',
    '### 2.1 参考文章相关性',
    createPlanningTableRow('参考文章', 'URL', '主题 / 关键词 / 类型相关性', '市场与语言适配'),
    '| --- | --- | --- | --- |',
    ...referenceRows.map((row) => createPlanningTableRow(...row)),
    '',
    '### 2.2 优势 / 可借鉴点',
    createPlanningTableRow('参考文章', '标题与开头', '叙事结构', '可读性', 'E-E-A-T 信号', '可借鉴点与边界'),
    '| --- | --- | --- | --- | --- | --- |',
    ...referenceStrengthRows.map((row) => createPlanningTableRow(...row)),
    '',
    '### 2.3 差异化写作要点',
    '- **统一决策标准：**按照零件几何、旋转特征、材料、公差、批量、表面处理和检测要求比较 turning、milling 与组合加工。',
    '- **采购行动补强：**增加海外采购经理可以直接使用的 RFQ 输入清单，把工艺理解连接到报价与供应商筛选。',
    `- **项目知识利用：**使用 ${selectedKnowledgeText} 和 ${companyName} 已确认的 ${capabilities}；案例包括 ${caseNames.join('、')}。`,
    '- **内容差异：**将三篇竞对的完整比较、工程解释和制造流程优势整合为更紧凑的采购决策路径，并补充 DFM、质量文件和沟通要求。',
    '- **风险规避：**不照搬竞对营销结论，不使用无来源参数、绝对化宣传或超出项目知识库的案例结果。',
    '',
    '## 3. 文章结构策划（核心内容）',
    '',
    '### 3.1 文章基础信息',
    createPlanningTableRow('字段', '值'),
    '| --- | --- |',
    createPlanningTableRow('目标市场', targetRegion),
    createPlanningTableRow('目标语言', articleLanguage),
    createPlanningTableRow('目标受众', audienceName),
    createPlanningTableRow('业务目标', businessGoal),
    createPlanningTableRow('文章主题', articleTopic),
    createPlanningTableRow('主要关键词', primaryKeyword),
    createPlanningTableRow('次要关键词', effectiveSecondaryKeywords),
    createPlanningTableRow('文章类型', articleType),
    createPlanningTableRow('文章长度', articleLength),
    createPlanningTableRow('语气', tone),
    createPlanningTableRow('人称', person),
    createPlanningTableRow('**生成要求**', generationRequirements),
    '',
    '### 3.2 营销文案模型与写作思路',
    `- **所选模型：**${copyModel.name}。`,
    `- **选择依据：**${copyModel.rationale}它同时响应“${businessGoal}”、${audienceName}、${articleType}、主题「${articleTopic}」和 ${searchIntent} 意图。`,
    `- **证据适配：**知识资产 ${selectedKnowledgeText} 支撑品牌能力与服务事实；RapidDirect、Protolabs Network 和 Fictiv 支撑比较结构、工程解释与制造流程策划。`,
    `- **生成要求落实：**${generationRequirementsText}；各阶段严格遵守事实、来源和禁止主张边界。`,
    '- **阶段映射：**',
    createPlanningTableRow('Stage', 'Content', 'Writing Guidance'),
    '| --- | --- | --- |',
    ...stageRows.map((stage) => createPlanningTableRow(stage.name, stage.content, stage.guidance)),
    '',
    '### 3.3 关键词布局建议与内链插入建议',
    '**关键词布局建议：**',
    '关键词布局与对比模型的阶段结构保持一致，以搜索意图和语义覆盖为优先，不机械规定出现次数。',
    createPlanningTableRow('Stage', 'Keywords', 'Placement', 'Purpose'),
    '| --- | --- | --- | --- |',
    ...stageKeywordRows.map((row) => createPlanningTableRow(...row)),
    '- 主要关键词应覆盖标题、引言、至少 2-3 个核心 H2、FAQ 和结尾。',
    '- 次要关键词按语义场景出现，不为填满阶段而机械重复。',
    '- 不设固定关键词密度；密度只作为发布前检查信号，不作为生成目标。',
    '',
    '**内链插入建议：**',
    createPlanningTableRow('Stage', 'Recommended Anchor Text', 'Target Page', 'Insertion Rationale'),
    '| --- | --- | --- | --- |',
    ...internalLinkRows.map((row) => createPlanningTableRow(...row)),
    '- 锚文本应自然、明确、可独立理解，不使用 click here，不重复堆砌同一关键词。',
    '- 仅使用 Rejin CNC 官网与项目知识库中的真实 URL；没有自然、必要内链的阶段明确标记“不建议插入”。',
    '',
    '### 3.4 FAQ 写作建议',
    `- **检索词：**主要关键词（${primaryKeyword}）、产品名称（${productSearchTerms.join('、')}）、文章主题（${articleTopic}）。`,
    '- **问题来源：**优先来自目标语言和目标市场对应的搜索结果、用户常见问题（People Also Ask）和参考文章。',
    ...faqItems.map(([category, question], index) => `- **Q${index + 1}（${category}）：**${question}`),
    '',
    '> **生成规范**',
    `> - **用户输入与生成要求：**<br>${generationRequirementsText}<br>标题、大纲和正文不得擅自改写文章基础信息。`,
    `> - **事实与来源：**${companyName} 的能力、认证、参数和案例只使用项目知识库、官方页面与已选择资料，竞对内容仅用于结构与行业解释。`,
    '> - **禁止虚构：**不得编造参数、认证、案例、客户、规模、结果、市场数据或监管结论；高风险内容需合格专业人员复核。',
    `> - **SEO 与语言：**正文使用 ${articleLanguage}，符合 ${targetRegion} 的 B2B 阅读习惯，围绕「${primaryKeyword}」和 ${searchIntent} 自然写作，不堆砌关键词。`,
    `> - **品牌、内链与 CTA：**公司和品牌名称保持原写法，仅使用真实链接；CTA 服务“${businessGoal}”，不作排名、交付或转化承诺。`,
  ].join('\n');
}

function resolvePlanningPreviewContent(task, project) {
  const savedContent = normalizeStrategyContent(task?.planning?.strategyContent);
  const isLegacyDemoContent =
    savedContent.includes('## 1. 项目背景与 E-E-A-T 内容底座') ||
    savedContent.includes('## 4. 附录：系统约束规则');
  return savedContent && !isLegacyDemoContent ? savedContent : createPlanningPreviewContent(task, project);
}

// 项目分析报告把品牌、市场、知识和任务要求整理成策划依据。
function createProjectAnalysisReport(task, project) {
  const input = task?.taskInput ?? {};
  const demoProject = project?.demoProject ?? {};
  const brandProfile = demoProject.brandProfile ?? {};
  const companyName = demoProject.name ?? project?.name ?? 'Rejin CNC Technology Co.,Ltd';
  const brandName = brandProfile.brandName ?? 'Rejin CNC';
  const officialSite = demoProject.website ?? 'https://www.rejincnc.com/';
  const companyOfficialSite = demoProject.website ?? officialSite;
  const industry = demoProject.industry ?? 'Precision CNC machining and custom metal parts manufacturing';
  const targetRegion = input.targetRegion || 'Global';
  const articleLanguage = input.articleLanguage || 'EN';
  const capabilities = brandProfile.capabilities ?? [];
  const certifications = brandProfile.certifications ?? [];
  const serviceItems = demoProject.knowledgeItems?.filter((item) => item.type === 'service') ?? [];
  const productItems = demoProject.knowledgeItems?.filter((item) => item.type === 'product') ?? [];
  const caseItems = demoProject.knowledgeItems?.filter((item) => item.type === 'case') ?? [];

  return {
    basicInfo: [
      {
        label: '公司名称',
        value: companyName,
        note: '用于事实性公司介绍；提到公司时不得改写主体名称。',
      },
      {
        label: '品牌名称',
        value: brandName,
        note: '区分大小写，用于正文自然提及和官网内链锚文本。',
      },
      {
        label: '品牌官方网站',
        value: officialSite,
        note: '用于品牌介绍来源、官网内链和事实核验。',
      },
      {
        label: '公司官方网站',
        value: companyOfficialSite,
        note: '用于公司介绍来源、官网内链和事实核验。',
      },
      {
        label: '所属行业',
        value: industry,
        note: '用于限定文章语境，避免偏离精密加工与定制金属零件制造场景。',
      },
    ],
    summarySections: [
      {
        title: '公司介绍',
        content:
          `${companyName} 是面向海外工业客户的中国精密制造供应商，当前资料显示其业务覆盖 custom CNC machining、sheet metal fabrication、surface finishing 和 DFM support。公司简介可基于品牌档案与官网服务页展开，但成立时间、员工规模、产能规模等事实在当前资料中未明确提供，不应虚构。`,
      },
      {
        title: '核心市场',
        content:
          `本次任务目标地区为 ${targetRegion}，文章语言为 ${articleLanguage}。内容应面向海外采购、工程和硬件品牌客户，优先使用英语 B2B 采购决策表达，并解释质量、交期、沟通、RFQ 准备等跨境采购关注点。`,
      },
      {
        title: '核心业务范围',
        content:
          capabilities.length
            ? `当前品牌档案中的核心能力包括：${capabilities.join('、')}。这些内容可作为产品介绍、技术指南、采购决策类文章和公司介绍的基础素材。`
            : '当前品牌档案未提供核心能力列表，后续内容应依赖用户选择的知识条目与资料。',
      },
      {
        title: '品牌定位',
        content:
          brandProfile.positioning ||
          '品牌定位字段未提供，后续内容应避免自行创造定位口号，只围绕已知制造能力和服务范围表达。',
      },
    ],
    qualificationRows: certifications.map((certification) => ({
      name: certification,
      proof: '品牌档案 / 官网 About us 信息',
      source: `${officialSite}about-us/`,
      usage: '公司介绍 / 质量控制 / 采购决策类文章',
    })),
    serviceCapabilityRows: [
      {
        type: '生产能力',
        description: 'CNC turning、CNC milling、5-axis CNC machining、sheet metal fabrication、surface treatments 等组合加工能力。',
        source: `${officialSite}service/`,
        usage: '产品介绍 / 公司介绍',
      },
      {
        type: '定制能力',
        description: '面向 custom precision metal parts，适合围绕零件图纸、材料、表面处理、批量和应用场景展开。',
        source: officialSite,
        usage: '解决方案类文章',
      },
      {
        type: '出口能力',
        description: '品牌资料显示面向 overseas customers，内容可强调英文沟通、询盘资料准备和采购风险降低。',
        source: officialSite,
        usage: '采购决策类文章',
      },
      {
        type: '工程支持',
        description: 'DFM support、drawing review、prototype validation 可用于解释设计到生产前的技术协作。',
        source: `${officialSite}service/support-dfm-service/`,
        usage: '技术指南类文章',
      },
      {
        type: '售后服务',
        description: '当前资料未提供明确售后承诺；可在 CTA/FAQ 中提示用户提交图纸、材料、数量和目标交期，不写无法验证的服务承诺。',
        source: '当前知识库未提供明确来源',
        usage: 'CTA / FAQ',
      },
    ],
    caseRows: caseItems.length
      ? caseItems.slice(0, 4).map((item) => ({
          name: item.title,
          description: item.summary,
          source: item.sourceUrl,
          usage: '案例文章 / 解决方案文章 / 采购决策类文章',
        }))
      : [
          {
            name: '当前未选择明确服务案例',
            description: '不应虚构客户名称或项目数据；如需案例论证，应从知识库案例条目或官网案例页补充。',
            source: '当前任务输入未提供明确案例来源',
            usage: '人工补充后用于案例文章 / 公司介绍',
          },
        ],
    strengthRows: [
      {
        type: '供应链能力',
        description: '服务页覆盖多种金属加工与表面处理能力，可支持采购方减少多供应商协调成本。',
        source: `${officialSite}service/`,
        usage: '产品介绍 / 公司资料',
      },
      {
        type: '定制能力',
        description: '围绕 custom metal parts、drawings、materials、tolerances 和 quantities 组织内容。',
        source: officialSite,
        usage: '公司资料 / 解决方案类文章',
      },
      {
        type: '交付能力',
        description: '当前资料可表达 RFQ 响应和采购沟通价值；具体交期数字没有明确来源时不得写死。',
        source: '品牌档案 / 用户任务要求',
        usage: '公司资料',
      },
      {
        type: '技术能力',
        description: 'DFM、prototype、5-axis machining 和 process selection 可支撑技术指南与采购前决策内容。',
        source: `${officialSite}service/support-dfm-service/`,
        usage: '公司资料 / 官网',
      },
      {
        type: '认证资质',
        description: certifications.length ? certifications.join('、') : '当前资料未提供明确认证。',
        source: certifications.length ? `${officialSite}about-us/` : '当前资料未提供明确来源',
        usage: '证书 / 官网 / 质量控制内容',
      },
    ],
    productCategories: [
      {
        name: '核心品类1：服务能力',
        items: serviceItems.slice(0, 6).map((item) => ({
          name: item.title,
          description: item.summary,
          link: item.sourceUrl,
          usage: item.id === 'dfm-support' ? '技术指南 / 采购决策类文章' : '产品介绍 / 公司介绍',
        })),
      },
      {
        name: '核心品类2：产品与应用',
        items: productItems.slice(0, 6).map((item) => ({
          name: item.title,
          description: item.summary,
          link: item.sourceUrl,
          usage: '产品介绍 / 解决方案类文章 / 应用场景内容',
        })),
      },
    ],
    guardrails: [
      '避免写“行业领先、最佳、第一”等绝对化表述，除非有明确证据。',
      '成立时间、员工规模、产能规模、客户名称、交付周期等事实内容不得虚构。',
      '公司名称和品牌名称应保持原文，不随意改写主体名称或大小写。',
    ],
  };
}

export function createPlanningDemoData(task, project) {
  const input = task?.taskInput ?? {};
  const companyName = project?.demoProject?.name ?? project?.name ?? 'Rejin CNC Technology Co.,Ltd';
  const brandName = project?.demoProject?.brandProfile?.brandName ?? 'Rejin CNC';
  const articleTopic = input.articleTopic || 'CNC Turning vs. Milling: How to Choose for Your Next Project';
  const references = getReferenceArticles(task);
  const strategyContent = resolvePlanningPreviewContent(task, project);
  const projectAnalysisReport = createProjectAnalysisReport(task, project);

  return {
    artifacts: {
      'project-report': {
        id: 'project-report',
        title: '项目分析报告',
        subtitle: companyName,
        type: 'project-report',
        report: projectAnalysisReport,
      },
      references: {
        id: 'references',
        title: '参考文章',
        subtitle: `共 ${references.length} 篇参考文章`,
        type: 'references',
        references,
      },
      strategy: {
        id: 'strategy',
        title: '文章策划方案',
        subtitle: articleTopic,
        type: 'strategy',
        content: strategyContent,
      },
    },
    workflow: [
      {
        id: 'load-project',
        agent: '行业研究Agent',
        agentTitle: '项目研究专家 Researcher',
        completedText: '加载品牌信息完成',
        completedTextEn: 'Load Brand Information completed',
        taskName: '加载品牌信息',
        taskNameEn: 'Load Brand Information',
        runningText: '正在加载品牌信息...',
        runningTextEn: 'Loading brand information...',
        thinking: [
          `已读取 ${brandName} 的品牌档案、目标受众、知识条目和知识资料，优先关注品牌要求、业务目标和用户选择的引用资料。`,
          `当前主题是「${articleTopic}」，需要把项目能力与海外采购场景关联起来，而不是只输出通用 CNC 工艺科普。`,
          '知识库中 CNC Turning、CNC Milling、DFM Support 和质量控制信息可作为文章差异化依据，适合支撑后续策划方案。',
        ],
        artifactId: 'project-report',
      },
      {
        id: 'summarize-project',
        agent: 'SEO策略Agent',
        agentTitle: 'SEO策略专家 Strategist',
        completedText: '查看项目分析报告，了解项目背景完毕',
        completedTextEn: 'Reviewed project analysis and context',
        taskName: '查看项目分析报告，了解项目背景',
        taskNameEn: 'Review project analysis and context',
        runningText: '正在查看项目分析报告，了解项目背景...',
        runningTextEn: 'Reviewing project analysis and context...',
        thinking: [
          '品牌要求强调可信、专业、避免夸张承诺，因此后续方案会使用证据型表达，突出能力边界和可验证信息。',
          '知识库中 CNC Turning、CNC Milling、DFM Support 和质量控制信息可支撑文章差异化，避免只输出通用工艺科普。',
        ],
      },
      {
        id: 'analyze-market-audience',
        agent: 'SEO策略Agent',
        agentTitle: 'SEO策略专家 Strategist',
        completedText: '分析目标市场与受众完毕',
        completedTextEn: 'Analyzed target market and audience',
        taskName: '分析目标市场与受众',
        taskNameEn: 'Analyze target market and audience',
        runningText: '正在分析目标市场与受众...',
        runningTextEn: 'Analyzing target market and audience...',
        thinking: [
          '目标受众更关注供应商风险、质量稳定性、交期可控和沟通效率，因此文章需要把技术参数翻译成采购决策语言。',
          '搜索意图不是单纯学习概念，而是为了判断哪种工艺、哪类供应商更适合当前零件需求，内容应包含选择标准与询盘准备建议。',
          '目标市场语境需要兼顾技术说明和采购行动建议，让内容既能服务搜索理解，也能承接询盘转化。',
        ],
      },
      {
        id: 'analyze-references',
        agent: 'SEO策略Agent',
        agentTitle: 'SEO策略专家 Strategist',
        completedText: '分析参考文章完毕',
        completedTextEn: 'Analyzed reference articles',
        taskName: '分析参考文章',
        taskNameEn: 'Analyze Reference Articles',
        runningText: '正在分析参考文章...',
        runningTextEn: 'Analyzing reference articles...',
        thinking: [
          `已整理 ${references.length} 篇参考文章，优先分析标题角度、H2/H3 结构、搜索意图覆盖和可借鉴的内容组织方式。`,
          '参考文章普遍覆盖工艺差异、供应商选择、质量认证和成本交期问题，但通常缺少与 Rejin CNC 知识库相关的具体场景连接。',
          '文章策划会保留竞品内容的结构优势，同时加入 DFM 支持、出口采购沟通和 RFQ 准备清单，形成差异化。',
        ],
        artifactId: 'references',
      },
      {
        id: 'create-strategy',
        agent: 'SEO策略Agent',
        agentTitle: 'SEO策略专家 Strategist',
        completedText: '制定文章策略完成',
        completedTextEn: 'Create Article Strategy completed',
        taskName: '制定文章策略',
        taskNameEn: 'Create Article Strategy',
        runningText: '正在制定文章策略...',
        runningTextEn: 'Creating article strategy...',
        thinking: [
          '正在整合项目知识、目标受众、关键词与参考文章分析，先明确文章的搜索意图和商业目标。',
          '策划方案将采用“问题识别 - 工艺差异 - 选择标准 - 供应商能力 - 行动建议”的结构，确保内容既能被搜索用户理解，也能承接询盘转化。',
          '正在补充关键词布局、差异化信息和 CTA 建议，避免只复述竞品文章结构。',
          '文章策划方案生成完成后，可进入人工编辑确认，再作为标题大纲生成的输入。',
        ],
        artifactId: 'strategy',
      },
    ],
  };
}

// 默认大纲树用于模拟大纲生成结果，并驱动大纲预览层级。
function createOutlineTree() {
  return [
    {
      id: 'outline-h2-process-choice',
      level: 'H2',
      title: 'CNC Turning vs. Milling: What Each Process Does Best',
      children: [
        {
          id: 'outline-h3-turning-fit',
          level: 'H3',
          title: 'When CNC turning is the better fit',
          children: [
            {
              id: 'outline-h4-turning-examples',
              level: 'H4',
              title: 'Typical parts: shafts, sleeves, knobs, and fasteners',
              children: [],
            },
          ],
        },
        {
          id: 'outline-h3-milling-fit',
          level: 'H3',
          title: 'When CNC milling is the better fit',
          children: [
            {
              id: 'outline-h4-milling-examples',
              level: 'H4',
              title: 'Typical parts: housings, brackets, panels, and structural components',
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: 'outline-h2-decision-factors',
      level: 'H2',
      title: 'Key Decision Factors Before Sending an RFQ',
      children: [
        {
          id: 'outline-h3-geometry-tolerance',
          level: 'H3',
          title: 'Geometry, tolerance, and material requirements',
          children: [],
        },
        {
          id: 'outline-h3-cost-lead-time',
          level: 'H3',
          title: 'Cost, lead time, and production volume',
          children: [],
        },
        {
          id: 'outline-h3-finishing',
          level: 'H3',
          title: 'Surface finishing and post-processing expectations',
          children: [],
        },
      ],
    },
    {
      id: 'outline-h2-supplier-capability',
      level: 'H2',
      title: 'How a Capable CNC Supplier Reduces Procurement Risk',
      children: [
        {
          id: 'outline-h3-dfm',
          level: 'H3',
          title: 'DFM review before machining starts',
          children: [
            {
              id: 'outline-h4-dfm-checks',
              level: 'H4',
              title: 'Drawing checks, material advice, and manufacturability feedback',
              children: [],
            },
          ],
        },
        {
          id: 'outline-h3-quality',
          level: 'H3',
          title: 'Quality systems, inspection reports, and repeat order stability',
          children: [],
        },
      ],
    },
    {
      id: 'outline-h2-rejin-fit',
      level: 'H2',
      title: 'Where Rejin CNC Fits in the Selection Process',
      children: [
        {
          id: 'outline-h3-rejin-services',
          level: 'H3',
          title: 'CNC turning, milling, 5-axis machining, sheet metal, and finishing in one workflow',
          children: [],
        },
        {
          id: 'outline-h3-export-communication',
          level: 'H3',
          title: 'Export communication and RFQ response for overseas procurement teams',
          children: [],
        },
      ],
    },
    {
      id: 'outline-h2-rfq-checklist',
      level: 'H2',
      title: 'RFQ Checklist: What to Prepare Before Contacting a Supplier',
      children: [
        {
          id: 'outline-h3-rfq-inputs',
          level: 'H3',
          title: 'Drawings, materials, quantities, tolerances, finishes, and target delivery date',
          children: [],
        },
        {
          id: 'outline-h3-cta',
          level: 'H3',
          title: 'CTA: Send your drawing for manufacturability review and quotation',
          children: [],
        },
      ],
    },
  ];
}

export function createOutlineDemoData(task, project) {
  const input = task?.taskInput ?? {};
  const articleTopic = input.articleTopic || 'CNC Turning vs. Milling: How to Choose for Your Next Project';
  const primaryKeyword = input.primaryKeyword || 'CNC machining supplier';
  const strategyContent = task?.planning?.strategyContent || createStrategyContent(task, project);
  const savedTitleOptions = task?.outline?.titleOptions?.length ? task.outline.titleOptions : null;
  const titleRegenerationPools = {
    'title-choice-best': [
      articleTopic,
      'CNC Turning vs. Milling: How to Choose the Right Process for Custom Parts',
      'CNC Turning vs. Milling: A Practical Guide for Overseas Buyers',
      'CNC Turning vs. Milling: Match the Process to Your Part Before RFQ',
    ],
    'title-choice-process': [
      'CNC Turning vs. Milling: Which Process Fits Your Custom Metal Parts?',
      'CNC Turning or Milling: Which Process Works Best for Your Custom Component?',
      'CNC Turning vs. Milling for Custom Metal Parts: What Buyers Should Compare',
      'CNC Turning and Milling Compared: Process Fit for Precision Metal Parts',
    ],
    'title-choice-rfq': [
      'How to Choose Between CNC Turning and Milling Before Requesting a Quote',
      'Before You Send an RFQ: Choosing Between CNC Turning and Milling',
      'CNC Turning vs. Milling: What to Decide Before Requesting a Machining Quote',
      'RFQ Preparation Guide: CNC Turning or Milling for Your Next Project?',
    ],
    'title-choice-supplier': [
      'CNC Turning or Milling? A Procurement Guide for Custom Metal Components',
      'A Procurement Guide to CNC Turning, Milling, and Supplier Capability',
      'How Procurement Teams Should Compare CNC Turning and Milling Suppliers',
      'CNC Turning vs. Milling for Buyers: Process Choice and Supplier Evaluation',
    ],
    'title-choice-risk': [
      'CNC Turning vs. Milling: Reduce Supplier Risk with the Right Process Choice',
      'Reduce Machining Supplier Risk by Choosing the Right CNC Process',
      'CNC Turning or Milling: How Process Choice Affects Cost, Quality, and Risk',
      'CNC Turning vs. Milling: Avoid RFQ Mistakes and Supplier Risk',
    ],
  };
  const titleOptions =
    savedTitleOptions ??
    [
      {
        id: 'title-choice-best',
        title: articleTopic,
        recommended: true,
      },
      {
        id: 'title-choice-process',
        title: 'CNC Turning vs. Milling: Which Process Fits Your Custom Metal Parts?',
      },
      {
        id: 'title-choice-rfq',
        title: 'How to Choose Between CNC Turning and Milling Before Requesting a Quote',
      },
      {
        id: 'title-choice-supplier',
        title: 'CNC Turning or Milling? A Procurement Guide for Custom Metal Components',
      },
      {
        id: 'title-choice-risk',
        title: 'CNC Turning vs. Milling: Reduce Supplier Risk with the Right Process Choice',
      },
    ];
  const selectedTitleId =
    task?.outline?.selectedTitleId || titleOptions.find((item) => item.recommended)?.id || titleOptions[0]?.id || '';
  const selectedTitle =
    task?.outline?.titleDraft ||
    titleOptions.find((item) => item.id === selectedTitleId)?.title ||
    titleOptions[0]?.title ||
    articleTopic;
  const outlineTree = task?.outline?.outlineTree?.length ? task.outline.outlineTree : createOutlineTree();

  return {
    artifacts: {
      outline: {
        id: 'outline',
        title: '文章大纲',
        subtitle: `标题：${selectedTitle}`,
        type: 'outline',
        outlineTree,
        titleDraft: selectedTitle,
      },
    },
    outlineTree,
    selectedTitle,
    selectedTitleId,
    strategyContent,
    titleRegenerationPools,
    titleOptions,
    workflow: [
      {
        id: 'read-strategy',
        agent: '内容生成Agent',
        agentTitle: '内容运营专员 Writer',
        completedText: '阅读文章策划方案完成',
        completedTextEn: 'Review Article Strategy completed',
        taskName: '阅读文章策划方案',
        taskNameEn: 'Review Article Strategy',
        runningText: '正在阅读文章策划方案...',
        runningTextEn: 'Reviewing article strategy...',
        thinking: [
          `已读取文章策划方案，主题聚焦「${articleTopic}」，核心关键词为 ${primaryKeyword}。`,
          '策划方案要求文章兼顾搜索意图与采购转化，因此标题和大纲需要同时覆盖工艺选择、供应商能力和 RFQ 准备。',
          '后续内容生成必须严格沿用用户确认的标题与大纲，避免偏离文章策划阶段确定的策略。',
        ],
      },
      {
        id: 'write-titles',
        agent: '内容生成Agent',
        agentTitle: '内容运营专员 Writer',
        completedText: '撰写文章标题完成',
        completedTextEn: 'Write Article Titles completed',
        taskName: '撰写文章标题',
        taskNameEn: 'Write Article Titles',
        runningText: '正在撰写文章标题...',
        runningTextEn: 'Writing article titles...',
        thinking: [
          '正在根据搜索意图生成多个标题方向，优先让核心关键词自然出现在标题前部或中部。',
          '标题会避免空泛表达，强调 CNC turning 与 CNC milling 的选择场景，方便采购经理快速判断文章价值。',
          '已选出推荐标题，同时保留多个候选标题供用户切换确认。',
        ],
        titleSelection: true,
      },
      {
        id: 'write-outline',
        agent: '内容生成Agent',
        agentTitle: '内容运营专员 Writer',
        completedText: '撰写文章大纲完成',
        completedTextEn: 'Write Article Outline completed',
        taskName: '撰写文章大纲',
        taskNameEn: 'Write Article Outline',
        runningText: '正在撰写文章大纲...',
        runningTextEn: 'Writing article outline...',
        thinking: [
          '正在围绕选定标题生成 H2/H3/H4 层级，先解释 turning 与 milling 的工艺边界，再进入采购决策标准。',
          '大纲会把 Rejin CNC 的 DFM 支持、质量系统、出口沟通和多工艺能力放在供应商选择部分，而不是生硬插入。',
          '结尾加入 RFQ 准备清单和明确 CTA，为后续内容生成提供可执行结构。',
        ],
        artifactId: 'outline',
      },
    ],
  };
}

// 将大纲树展开为文本，供正文生成和参考预览使用。
function flattenOutlineHeadings(nodes, depth = 0) {
  return (nodes ?? []).flatMap((node) => [
    `${'  '.repeat(depth)}${node.level} ${node.title}`,
    ...flattenOutlineHeadings(node.children ?? [], depth + 1),
  ]);
}

// 根据版本生成正文内容，终稿版本会插入图片和更明确的品牌表达。
function createArticleContent({ companyName, images = [], primaryKeyword, title, version }) {
  const isFinal = version === 'final';
  const processImage = images[0];
  const inspectionImage = images[1];

  return [
    `# ${title}`,
    '',
    `For overseas procurement teams, choosing between CNC turning and CNC milling is rarely a purely technical decision. It affects supplier selection, RFQ clarity, lead time, inspection planning, and the risk of discovering manufacturability issues after the quote is already in motion.`,
    '',
    `## CNC Turning vs. Milling: What Each Process Does Best`,
    '',
    `CNC turning is usually the better fit for cylindrical parts such as shafts, sleeves, bushings, knobs, and fasteners. The workpiece rotates while a cutting tool shapes the outside or inside diameter, making the process efficient when symmetry, concentricity, and repeatability matter.`,
    '',
    `CNC milling is stronger for prismatic or complex geometries such as housings, brackets, panels, robot joint structures, and parts that require pockets, slots, flat faces, or multi-side machining. When a part has several critical features on different planes, milling or 5-axis machining can reduce secondary setups and protect tolerance consistency.`,
    '',
    isFinal && processImage ? `![${processImage.alt}](${processImage.imageUrl})` : '',
    isFinal && processImage ? `Caption: ${processImage.caption}` : '',
    isFinal && processImage ? '' : '',
    `## Key Decision Factors Before Sending an RFQ`,
    '',
    `Start with geometry, tolerance, material, surface finish, and target quantity. A drawing that only states the material is not enough. Procurement teams should also clarify the functional surfaces, inspection points, cosmetic expectations, and whether prototype validation is needed before production.`,
    '',
    isFinal
      ? `${companyName} typically reviews drawings for DFM risks before quoting, including tolerance stack-up, tool access, finish expectations, and whether turning, milling, sheet metal fabrication, or a combined workflow is more practical for the part.`
      : `${companyName} can support CNC turning and milling, but the first draft does not yet connect DFM review clearly enough to the buyer's RFQ preparation process.`,
    '',
    `## How a Capable CNC Supplier Reduces Procurement Risk`,
    '',
    `A capable supplier does more than run a machine. For overseas buyers, useful support includes drawing review, material advice, prototype feedback, inspection reporting, export communication, and clear quotation assumptions. These steps reduce rework because the buyer and supplier agree on what must be controlled before machining starts.`,
    '',
    isFinal && inspectionImage ? `![${inspectionImage.alt}](${inspectionImage.imageUrl})` : '',
    isFinal && inspectionImage ? `Caption: ${inspectionImage.caption}` : '',
    isFinal && inspectionImage ? '' : '',
    `## Where ${companyName} Fits in the Selection Process`,
    '',
    `${companyName} is positioned as a custom metal parts supplier that can coordinate CNC turning, CNC milling, 5-axis machining, sheet metal fabrication, surface treatment, and inspection. That combination is useful when a buyer needs one supplier to evaluate process fit and manage multiple manufacturing steps.`,
    '',
    `## RFQ Checklist: What to Prepare Before Contacting a Supplier`,
    '',
    `Before sending an RFQ, prepare the 2D/3D drawings, material grade, expected quantity, tolerance requirements, surface finish, inspection needs, application context, and delivery target. If the part is still under development, ask for a manufacturability review before locking the design.`,
    '',
    `For a faster quotation, send your drawing and requirements to ${companyName} and ask for process selection feedback before production planning begins.`,
  ]
    .filter((line) => line !== false)
    .join('\n');
}

// 评估报告用固定维度模拟质量门槛，首版保留 Low 项，终稿全部通过。
function createEvaluationReport({ final = false, version }) {
  const makeItem = (name, rating, suggestion = '') => ({
    name,
    pass: rating !== 'Low',
    rating,
    suggestion,
  });

  return {
    id: `evaluation-v${version}`,
    title: `评估报告（第 ${version} 版）`,
    version,
    passed: final,
    summary: final
      ? '第 2 版没有 Low 项，Medium 项已给出轻量优化建议，内容可进入最终整合。'
      : '第 1 版存在 Low 项，需要先补充案例、引用和图片 Alt 文本，再进行二次生成。',
    groups: [
      {
        name: '标题',
        items: [
          makeItem('新颖度/吸引力', final ? 'High' : 'Medium', final ? '' : '标题清晰但常规，可强化 procurement decision angle。'),
          makeItem('关键词布局', 'High'),
          makeItem('搜索意图匹配度', 'High'),
          makeItem('标题长度与可读性', final ? 'High' : 'Medium', final ? '' : '标题略长，建议减少重复表达。'),
        ],
      },
      {
        name: '大纲',
        items: [
          makeItem('层级结构清晰度', 'High'),
          makeItem('同级标题逻辑性', final ? 'High' : 'Medium', final ? '' : '供应商能力章节需要和 RFQ 准备形成更明确递进。'),
          makeItem('次级标题相关性', 'High'),
          makeItem('关键词覆盖（搜索意图匹配）', final ? 'High' : 'Medium', final ? '' : '补充 DFM support 与 supplier risk 相关长尾词。'),
          makeItem('价值点与差异化', final ? 'High' : 'Medium', final ? '' : '需要更自然地放入 Rejin CNC 的多工艺能力。'),
        ],
      },
      {
        name: '文章',
        items: [
          makeItem('AI概率', final ? 'Medium' : 'Low', final ? '保留人工润色建议，进一步降低模板感。' : '部分段落模板化，需要加入更具体的采购场景表达。'),
          makeItem('语法', 'High'),
          makeItem('人称、语气与风格', final ? 'High' : 'Medium', final ? '' : '个别段落从泛科普转向采购建议时衔接偏弱。'),
          makeItem('介绍公司成功案例（经验）', final ? 'Medium' : 'Low', final ? '可在人工编辑阶段补入真实案例数字。' : '缺少具体应用场景或案例化表达。'),
          makeItem('内容深度价值（专业性）', final ? 'High' : 'Medium', final ? '' : '需要补充 DFM、检查点和 RFQ 输入清单。'),
          makeItem('引用权威来源（权威性）', final ? 'Medium' : 'Low', final ? '引用来源已加入，但可继续补充行业报告。' : '需要引用参考文章和知识资料中的具体事实。'),
          makeItem('知识库引用准确性（可信度）', final ? 'High' : 'Medium', final ? '' : '产品参数没有错误，但和上下文融合不够自然。'),
          makeItem('YMYL内容检测（合规性）', 'High'),
          makeItem('内容可读性', final ? 'High' : 'Medium', final ? '' : '技术段落需要拆短句，减少堆叠。'),
          makeItem('CTA 有效性', final ? 'High' : 'Medium', final ? '' : 'CTA 需要更贴近 RFQ 和 drawing review。'),
          makeItem('关键词自然密度', final ? 'High' : 'Medium', final ? '' : '主关键词出现自然度可提升。'),
          makeItem('锚文本与内链相关性', final ? 'High' : 'Medium', final ? '' : '内链锚文本需要具体描述目标页面。'),
          makeItem('图片Alt文本', final ? 'High' : 'Low', final ? '' : '缺少图片 Alt 文本。'),
        ],
      },
    ],
  };
}

// 终稿评估基于最终正文、TDK 和链接数量生成可展示的检查结果。
function createFinalContentEvaluationReport({ finalArticle, primaryKeyword, selectedLinks = [], tdk }) {
  const makeItem = (name, rating, suggestion = '') => ({
    name,
    pass: rating !== 'Low',
    rating,
    suggestion,
  });
  const imageCount = finalArticle?.images?.length ?? 0;
  const knowledgeLinkCount = selectedLinks.filter((link) => link.group === 'knowledge').length;
  const companyLinkCount = selectedLinks.filter((link) => link.group === 'company').length;
  const authorityLinkCount = selectedLinks.filter((link) => link.group === 'authority').length;

  return {
    id: 'final-evaluation',
    title: '文章终稿评估报告',
    version: 'final',
    passed: true,
    summary:
      '文章终稿与 TDK 均无 Low 项，满足进入人工编辑的质量门槛。Medium 项已保留优化建议，可在编辑器中继续人工微调。',
    groups: [
      {
        name: '文章终稿',
        items: [
          makeItem('AI概率', 'Medium', '终稿已降低模板感，但建议人工编辑阶段继续加入更自然的采购经验表达。'),
          makeItem('语法', 'High'),
          makeItem('人称、语气与风格', 'High'),
          makeItem('介绍公司成功案例（经验）', 'Medium', '当前不虚构案例；若后续补充真实案例，可加入应用场景或项目结果。'),
          makeItem('内容深度价值（专业性）', 'High'),
          makeItem('引用权威来源（权威性）', 'Medium', '已保留引用知识与知识资料引用；若有行业标准或第三方报告，可继续补充。'),
          makeItem('知识库引用准确性（可信度）', 'High'),
          makeItem('YMYL内容检测（合规性）', 'High'),
          makeItem('内容可读性', 'High'),
          makeItem('CTA 有效性', 'High'),
          makeItem('关键词自然密度', 'High'),
        ],
      },
      {
        name: '图片与链接',
        items: [
          makeItem('素材插入相关性', imageCount >= 2 ? 'High' : 'Medium', imageCount >= 2 ? '' : '建议至少插入 2 张与工艺和质检段落相关的素材。'),
          makeItem('图片Alt文本', 'High'),
          makeItem('图片与段落相关性', 'High'),
          makeItem('知识条目链接', knowledgeLinkCount >= 1 ? 'High' : 'Medium', knowledgeLinkCount >= 1 ? '' : '建议至少插入 1 条知识条目链接。'),
          makeItem('公司相关链接', companyLinkCount >= 1 ? 'High' : 'Medium', companyLinkCount >= 1 ? '' : '建议至少插入 1 条公司相关链接。'),
          makeItem('权威参考链接', authorityLinkCount >= 1 ? 'High' : 'Medium', authorityLinkCount >= 1 ? '' : '建议至少插入 1 条权威参考链接。'),
          makeItem('链接与段落语义匹配', 'High'),
        ],
      },
      {
        name: 'TDK',
        items: [
          makeItem('Title 关键词布局', 'High'),
          makeItem('Title 搜索意图匹配', 'High'),
          makeItem('Title 长度与可读性', 'Medium', '标题可完整表达主题，但人工编辑时可进一步压缩重复词，提高 SERP 扫读效率。'),
          makeItem('Description 搜索摘要价值', 'High'),
          makeItem('Description CTA 与转化意图', 'High'),
          makeItem('Keywords 语义覆盖', 'High'),
          makeItem('Keywords 堆砌风险', 'High'),
          makeItem('TDK 与正文一致性', 'High'),
          makeItem('品牌与事实边界', 'High'),
        ],
      },
      {
        name: '最终通过条件',
        items: [
          makeItem('文章无 Low 项', 'High'),
          makeItem('TDK 无 Low 项', 'High'),
          makeItem('Medium 项已给出建议', 'High'),
          makeItem('主要关键词自然覆盖', 'High', `主要关键词 ${primaryKeyword} 已覆盖标题、引言、核心段落和 TDK。`),
          makeItem('终稿可进入人工编辑', 'High', `TDK Title 当前为：${tdk.title}`),
        ],
      },
    ],
  };
}

// 修改要求归一化为版本化记录，后续修订轮次按版本递增。
function normalizeRevisionRequest(request, index) {
  const version = request?.version ?? index + 2;
  return {
    createdAt: request?.createdAt ?? today(),
    id: request?.id ?? `revision-request-v${version}`,
    status: request?.status ?? 'submitted',
    text: request?.text ?? request?.content ?? '',
    version,
  };
}

// 根据修改要求中的关键词选择修订重点，避免每次修订都返回同一种结果。
function getRevisionFocusText(requestText) {
  const text = requestText.toLowerCase();

  if (text.includes('压缩') || text.includes('精简') || text.includes('shorter')) {
    return {
      articleNote:
        'This revision makes the buying guidance more concise, removes repeated process explanations, and keeps the RFQ checklist easy to scan.',
      descriptionNote: 'concise RFQ-ready process guidance',
      recordAfter:
        'Compressed repeated explanations and kept the process comparison focused on procurement decisions, RFQ inputs, and supplier risk control.',
    };
  }

  if (text.includes('案例') || text.includes('case')) {
    return {
      articleNote:
        'This revision adds a stronger application-style explanation without inventing customer names, keeping the case-like proof tied to sourced capability information.',
      descriptionNote: 'application-based supplier evaluation proof',
      recordAfter:
        'Added a case-style application angle while avoiding unsupported customer names, project outcomes, or exaggerated proof claims.',
    };
  }

  if (text.includes('转化') || text.includes('询盘') || text.includes('cta') || text.includes('rfq')) {
    return {
      articleNote:
        'This revision strengthens the buyer next step by connecting process selection to drawing review, quotation assumptions, and a clearer RFQ action.',
      descriptionNote: 'clearer RFQ conversion guidance',
      recordAfter:
        'Strengthened the CTA and RFQ preparation paragraph so procurement readers know what information to send and what feedback to request.',
    };
  }

  return {
    articleNote:
      'This revision adjusts the final draft according to the user request while preserving verified brand facts, source-backed product claims, and the existing SEO structure.',
    descriptionNote: 'user-requested editorial improvements',
    recordAfter:
      'Applied the user request to the final draft while preserving verified facts, source-backed claims, keyword coverage, and the existing article structure.',
  };
}

function createRevisedFinalArticleContent({ baseContent, requestText }) {
  const focus = getRevisionFocusText(requestText);
  const closingLine = 'For a faster quotation, send your drawing and requirements';

  if (!baseContent.includes(closingLine)) {
    return `${baseContent}\n\n${focus.articleNote}`;
  }

  return baseContent.replace(closingLine, `${focus.articleNote}\n\n${closingLine}`);
}

// 单轮终稿修订同时生成新正文、评估报告、TDK 和修改记录。
function createFinalRevisionRound({ baseArticle, baseEvaluationReport, baseTdk, primaryKeyword, request }) {
  const version = request.version;
  const focus = getRevisionFocusText(request.text);
  const finalArticle = {
    ...baseArticle,
    id: `final-v${version}`,
    title: `文章终稿（第 ${version} 版）`,
    content: createRevisedFinalArticleContent({ baseContent: baseArticle.content, requestText: request.text }),
  };
  const tdk = {
    ...baseTdk,
  };
  const evaluationReport = {
    ...baseEvaluationReport,
    id: `final-evaluation-v${version}`,
    title: `文章终稿评估报告（第 ${version} 版）`,
    version,
    summary:
      `已根据修改要求完成第 ${version} 版文章终稿评估。文章终稿无 Low 项，Medium 项保留为人工编辑建议。`,
  };
  const revisionRecord = {
    id: `final-revision-record-v${version}`,
    title: '修改记录',
    version,
    changes: [
      {
        type: 'replace',
        before: 'Previous final draft kept the CTA and buyer next step relatively general.',
        after: focus.recordAfter,
      },
      {
        type: 'add',
        after: `User request applied: ${request.text}`,
      },
      {
        type: 'add',
        after:
          'Regenerated the final article and sent the new version back to the evaluation specialist.',
      },
    ],
  };

  return {
    evaluationReport,
    finalArticle,
    id: `final-revision-round-v${version}`,
    request,
    revisionRecord,
    tdk,
    version,
  };
}

// 来源列表支持多种字段名，统一压缩为工作流步骤可展示的 label。
function normalizeSourceListItems(items, fallbackItems = []) {
  const sourceItems = Array.isArray(items) ? items : fallbackItems;

  return sourceItems
    .map((item, index) => {
      const label =
        item?.sourceFileName ||
        item?.fileName ||
        item?.sourceName ||
        item?.title ||
        item?.name ||
        item?.label ||
        item?.id ||
        '';

      return {
        id: item?.id || item?.knowledgeId || item?.sourceId || `source-${index}`,
        label,
      };
    })
    .filter((item) => item.label);
}

function getKnowledgeFileName(file) {
  if (file?.fileName) return file.fileName;
  if (file?.sourceFileName) return file.sourceFileName;
  if (file?.title && file?.fileType && !String(file.title).toLowerCase().endsWith(`.${String(file.fileType).toLowerCase()}`)) {
    return `${file.title}.${file.fileType}`;
  }

  return file?.title || file?.name || file?.id || '知识资料';
}

function getChunkText(chunk) {
  return String(chunk?.editedText || chunk?.originalText || '').replace(/\r/g, '').trim();
}

function getCleanChunkText(file, chunk) {
  const rawText = getChunkText(chunk);
  if (!rawText) return '';

  const ignoredLines = new Set(
    [file?.title, file?.fileName, file?.sourceFileName, file?.usage, getKnowledgeFileName(file)]
      .map((item) => String(item ?? '').trim())
      .filter(Boolean),
  );
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !ignoredLines.has(line))
    .filter((line) => !/^tags:/i.test(line))
    .filter((line) => !/^source urls?:/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/^this fallback chunk/i.test(line));

  return lines.join('\n') || rawText;
}

function summarizeReferenceText(text, maxLength = 180) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function scoreTextByTerms(text, terms) {
  const haystack = String(text ?? '').toLowerCase();
  return terms.reduce((score, term) => {
    const normalizedTerm = String(term ?? '').trim().toLowerCase();
    return normalizedTerm && haystack.includes(normalizedTerm) ? score + 1 : score;
  }, 0);
}

// 从知识资料分块中挑选最相关片段，作为正文生成的引用来源。
function createKnowledgeAssetReferenceBlocks(files, project, queryTerms) {
  const selectedFiles = Array.isArray(files) ? files.filter((file) => file?.id) : [];
  const blocks = selectedFiles.flatMap((file, fileIndex) => {
    const chunks = listChunks(project, file.id)
      .map((chunk, chunkIndex) => ({
        chunk,
        chunkIndex,
        text: getCleanChunkText(file, chunk),
      }))
      .filter((item) => item.text);
    const rankedChunks = chunks
      .map((item) => ({
        ...item,
        score: scoreTextByTerms(`${item.chunk?.title ?? ''} ${item.text} ${(file.tags ?? []).join(' ')}`, queryTerms),
      }))
      .sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex)
      .slice(0, 2);

    return rankedChunks.map((item) => {
      const fileName = getKnowledgeFileName(file);
      return {
        blockKind: 'knowledge-asset',
        chunkId: item.chunk?.id,
        content: summarizeReferenceText(item.text),
        fileType: file.fileType,
        fullContent: item.text,
        id: `asset-${file.id}-${item.chunk?.id ?? item.chunkIndex + 1}`,
        processingStatus: file.processingStatus,
        sourceFileId: file.id,
        sourceFileName: fileName,
        sourceId: file.id,
        sourceLabel: '知识资料',
        sourceName: fileName,
        sourceUrl: file.url,
        title: item.chunk?.title || file.title || fileName,
        type: 'knowledge',
      };
    });
  });

  return blocks.slice(0, 8);
}

// 创建完整创作演示数据，供策划、大纲、正文和自动创作页面共用。
export function createContentDemoData(task, project, options = {}) {
  const input = task?.taskInput ?? {};
  const companyName = project?.demoProject?.name ?? project?.name ?? 'Rejin CNC Technology Co.,Ltd';
  const title =
    task?.outline?.titleDraft ||
    input.articleTopic ||
    'CNC Turning vs. Milling: How to Choose for Your Next Project';
  const primaryKeyword = input.primaryKeyword || 'CNC machining supplier';
  const primaryKeywords = splitAiKeywordText(primaryKeyword);
  const secondaryKeywords = input.secondaryKeywords?.length
    ? input.secondaryKeywords
    : ['custom metal parts', 'DFM support', 'CNC turning vs milling'];
  // 知识条目和知识资料都允许任务输入覆盖，缺失时回退到项目 demo 数据。
  const fallbackKnowledgeItems =
    project?.demoProject?.knowledgeItems?.filter((item) =>
      ['cnc-turning', 'cnc-milling', 'dfm-support'].includes(item.id),
    ) ?? [
      { id: 'cnc-turning', title: 'CNC Turning' },
      { id: 'cnc-milling', title: 'CNC Milling' },
      { id: 'dfm-support', title: 'DFM Support' },
    ];
  const fallbackKnowledgeAssets = project?.demoProject?.fileAssets?.length
    ? project.demoProject.fileAssets.slice(0, 3)
    : [
        { id: 'asset-main-products', title: '主营产品.xlsx' },
        { id: 'asset-service-capability', title: '主要服务.xlsx' },
        { id: 'asset-solution', title: '解决方案.xlsx' },
      ];
  const selectedKnowledgeSourceItems = resolveKnowledgeSourceItems(input.knowledgeItems, fallbackKnowledgeItems, project);
  const selectedKnowledgeItems = normalizeSourceListItems(selectedKnowledgeSourceItems, fallbackKnowledgeItems);
  const selectedKnowledgeAssetFiles = Array.isArray(input.knowledgeAssets) ? input.knowledgeAssets : fallbackKnowledgeAssets;
  const selectedKnowledgeAssets = normalizeSourceListItems(selectedKnowledgeAssetFiles, fallbackKnowledgeAssets);
  const references = getReferenceArticles(task).slice(0, 3);
  const outlineHeadings = flattenOutlineHeadings(task?.outline?.outlineTree?.length ? task.outline.outlineTree : createOutlineTree());
  const queryTerms = [title, ...primaryKeywords, ...secondaryKeywords, ...outlineHeadings].filter(Boolean);
  // 资料分块生成失败或未选择资料时，使用兜底文本块保证引用预览可用。
  const fallbackKnowledgeAssetReferenceBlocks = [
    {
      id: 'asset-main-products',
      blockKind: 'knowledge-asset',
      sourceId: 'main-products',
      sourceLabel: '知识资料',
      sourceName: '主营产品.xlsx',
      title: 'Quality Control',
      content: 'Inspection reports, tolerance checks, surface finish confirmation, and repeat order stability.',
      fullContent:
        'The product knowledge file describes quality control checkpoints for CNC machined parts: dimensional inspection, tolerance checks, surface finish confirmation, material confirmation, packaging checks, and repeat order stability. It should be used to support claims about procurement risk reduction and supplier evaluation.',
      sourceFileName: '主营产品.xlsx',
      type: 'knowledge',
    },
    {
      id: 'asset-service-capability',
      blockKind: 'knowledge-asset',
      sourceId: 'service-capability',
      sourceLabel: '知识资料',
      sourceName: '主要服务.xlsx',
      title: 'Custom Metal Parts Service Capability',
      content: 'CNC turning, CNC milling, sheet metal fabrication, finishing, DFM review, and export communication.',
      fullContent:
        'The service capability file summarizes Rejin CNC service scope: CNC turning, CNC milling, 5-axis CNC machining, sheet metal fabrication, surface treatments, DFM review, prototype support, quotation communication, and export coordination for overseas procurement teams.',
      sourceFileName: '主要服务.xlsx',
      type: 'knowledge',
    },
  ];
  const generatedKnowledgeAssetReferenceBlocks = createKnowledgeAssetReferenceBlocks(
    selectedKnowledgeAssetFiles,
    project,
    queryTerms,
  );
  const shouldUseFallbackKnowledgeAssets =
    !Array.isArray(input.knowledgeAssets) || selectedKnowledgeAssetFiles.length > 0;
  const knowledgeAssetReferenceBlocks = generatedKnowledgeAssetReferenceBlocks.length
    ? generatedKnowledgeAssetReferenceBlocks
    : shouldUseFallbackKnowledgeAssets
      ? fallbackKnowledgeAssetReferenceBlocks
      : [];
  const mediaAssets = project?.demoProject?.mediaAssets ?? [];
  const selectedBrandLinks = createSelectedBrandLinkItems(project);
  const selectedKnowledgeLinks = createSelectedKnowledgeLinkItems(selectedKnowledgeSourceItems);
  const selectedLinks = [...selectedKnowledgeLinks, ...selectedBrandLinks];
  // 从素材库中挑选正文插图，终稿版本会使用这些素材生成图片段落。
  const findMediaAsset = (predicate, fallbackIndex = 0) =>
    mediaAssets.find(predicate) ?? mediaAssets[fallbackIndex] ?? null;
  const finalArticleImages = [
    findMediaAsset((asset) => asset.category === 'services' && asset.tags?.includes('turning')),
    findMediaAsset(
      (asset) =>
        asset.category === 'services' &&
        /inspection|dfm|manufacturability/i.test(`${asset.id} ${asset.title} ${asset.usage} ${asset.sourcePageUrl}`),
      1,
    ),
  ]
    .filter(Boolean)
    .map((asset, index) => ({
      alt:
        index === 0
          ? 'CNC turning service image showing precision lathe parts for process selection'
          : 'DFM and inspection service image supporting CNC machining RFQ review',
      assetId: asset.id,
      caption:
        index === 0
          ? 'Material library image used to illustrate CNC turning capability for cylindrical custom metal parts.'
          : 'Material library image used to support DFM review, inspection, and supplier evaluation guidance.',
      imageUrl: asset.imageUrl,
      sourcePageUrl: asset.sourcePageUrl,
      title: asset.title,
    }));
  // 引用块统一知识条目、知识资料和参考网页，供预览和引用标记共用。
  const referenceBlocks = [
    {
      id: 'ki-cnc-turning',
      blockKind: 'knowledge-item',
      title: 'CNC Turning',
      content: 'Precision turning service for shafts, sleeves, fasteners, knobs, and other cylindrical metal components.',
      fullContent:
        'Precision CNC turning is used for cylindrical components such as shafts, sleeves, fasteners, knobs, bushings, threaded parts, and other round metal components. It is most useful when concentricity, repeatability, surface finish, and stable diameter control matter to the final assembly.',
      knowledgeItemId: 'cnc-turning',
      sourceLabel: '知识条目',
      sourceName: 'CNC Turning',
      sourceUrl: 'https://www.rejincnc.com/service/cnc-turning/',
      type: 'knowledge',
    },
    {
      id: 'ki-dfm-support',
      blockKind: 'knowledge-item',
      title: 'DFM Support',
      content: 'Drawing review, manufacturability feedback, prototype validation, and quotation assumptions before production.',
      fullContent:
        'DFM support includes drawing review, manufacturability feedback, tolerance risk checking, prototype validation, and quotation assumptions before production. This content should be used when explaining how buyers can reduce machining risk before sending a production RFQ.',
      knowledgeItemId: 'dfm-support',
      sourceLabel: '知识条目',
      sourceName: 'DFM Support',
      sourceUrl: 'https://www.rejincnc.com/service/support-dfm-service/',
      type: 'knowledge',
    },
    ...knowledgeAssetReferenceBlocks,
    ...references.map((reference, index) => ({
      id: `ref-${reference.id}`,
      blockKind: 'reference-web',
      title: reference.title,
      content: reference.summary,
      fullContent: reference.summary,
      outline: reference.outline,
      sourceLabel: '网页链接',
      sourceName: reference.url,
      sourceUrl: reference.url,
      type: 'reference',
    })),
  ];
  const firstKnowledgeAssetBlock = knowledgeAssetReferenceBlocks[0];
  const secondKnowledgeAssetBlock = knowledgeAssetReferenceBlocks[1];
  // 引用使用记录把正文片段和来源块绑定，用于展示内容依据。
  const citationUsages = [
    {
      id: 'citation-1',
      marker: 1,
      sourceBlockId: 'ki-cnc-turning',
      sourceName: 'CNC Turning',
      sourceSnippet:
        'Precision CNC turning is used for cylindrical components such as shafts, sleeves, fasteners, knobs, and bushings.',
      sourceType: 'knowledge',
      generatedContent:
        'CNC turning is usually the better fit for cylindrical parts such as shafts, sleeves, bushings, knobs, and fasteners.',
    },
    {
      id: 'citation-2',
      marker: 2,
      sourceBlockId: 'ki-dfm-support',
      sourceName: 'DFM Support',
      sourceSnippet:
        'DFM support includes drawing review, manufacturability feedback, tolerance risk checking, and quotation assumptions before production.',
      sourceType: 'knowledge',
      generatedContent:
        `${companyName} typically reviews drawings for DFM risks before quoting, including tolerance stack-up, tool access, finish expectations, and process fit.`,
    },
    {
      id: 'citation-3',
      marker: 3,
      sourceBlockId: firstKnowledgeAssetBlock?.id ?? '',
      sourceName: firstKnowledgeAssetBlock?.sourceName ?? '知识资料',
      sourceSnippet:
        firstKnowledgeAssetBlock?.content ??
        'Quality control checkpoints include dimensional inspection, tolerance checks, surface finish confirmation, and repeat order stability.',
      sourceType: 'knowledge',
      generatedContent:
        'For overseas buyers, useful support includes drawing review, material advice, prototype feedback, inspection reporting, export communication, and clear quotation assumptions.',
    },
    {
      id: 'citation-4',
      marker: 4,
      sourceBlockId: secondKnowledgeAssetBlock?.id ?? '',
      sourceName: secondKnowledgeAssetBlock?.sourceName ?? '知识资料',
      sourceSnippet:
        secondKnowledgeAssetBlock?.content ??
        'Service scope covers CNC turning, CNC milling, 5-axis CNC machining, sheet metal fabrication, surface treatments, and export coordination.',
      sourceType: 'knowledge',
      generatedContent:
        `${companyName} can coordinate CNC turning, CNC milling, 5-axis machining, sheet metal fabrication, surface treatment, and inspection.`,
    },
    {
      id: 'citation-5',
      marker: 5,
      sourceBlockId: referenceBlocks.find((block) => block.type === 'reference')?.id ?? '',
      sourceName: references[0]?.title ?? 'Reference article',
      sourceSnippet:
        references[0]?.summary ??
        'Reference article summary for supplier evaluation, process comparison, and procurement decision context.',
      sourceType: 'reference',
      generatedContent:
        'A capable supplier does more than run a machine; procurement teams should compare process fit, inspection planning, and quotation assumptions.',
    },
    {
      id: 'citation-6',
      marker: 6,
      sourceBlockId: referenceBlocks.filter((block) => block.type === 'reference')[1]?.id ?? '',
      sourceName: references[1]?.title ?? 'Reference article',
      sourceSnippet:
        references[1]?.summary ??
        'Reference article summary for search intent, buyer questions, and supplier selection criteria.',
      sourceType: 'reference',
      generatedContent:
        'The article should answer buyer questions first, then connect process comparison to a practical RFQ checklist and supplier selection criteria.',
    },
  ].filter((usage) => usage.sourceBlockId);
  // 文章版本模拟初稿到修订稿的演进，页面按版本展示产物。
  const articleVersions = [
    {
      id: 'article-v1',
      title: '文章初稿（第 1 版）',
      version: 1,
      headline: title,
      keywords: [...primaryKeywords, ...secondaryKeywords],
      content: createArticleContent({ companyName, primaryKeyword, title, version: 1 }),
    },
    {
      id: 'article-v2',
      title: '文章初稿（第 2 版）',
      version: 2,
      headline: title,
      keywords: [...primaryKeywords, ...secondaryKeywords, 'supplier risk', 'RFQ checklist'],
      content: createArticleContent({ companyName, primaryKeyword, title, version: 2 }),
    },
  ];
  const finalArticle = {
    id: 'final-article',
    title: '文章终稿',
    headline: title,
    images: finalArticleImages,
    keywords: articleVersions[1].keywords,
    content: createArticleContent({ companyName, images: finalArticleImages, primaryKeyword, title, version: 'final' }),
  };
  const evaluationReports = [
    createEvaluationReport({ final: false, version: 1 }),
    createEvaluationReport({ final: true, version: 2 }),
  ];
  const revisionSuggestions = [
    {
      id: 'suggestion-v1',
      title: '修改建议（第 1 版）',
      version: 1,
      sourceReportId: 'evaluation-v1',
      items: evaluationReports[0].groups.flatMap((group) =>
        group.items
          .filter((item) => item.rating !== 'High')
          .map((item) => ({
            group: group.name,
            metric: item.name,
            rating: item.rating,
            suggestion: item.suggestion,
          })),
      ),
    },
  ];
  const revisionRecords = [
    {
      id: 'revision-record-v1',
      title: '修改记录',
      version: 1,
      changes: [
        {
          type: 'replace',
          before: 'CNC machining is useful for many metal parts and buyers should choose a suitable supplier.',
          after:
            'Procurement teams should compare geometry, tolerance, material, surface finish, inspection needs, and supplier communication before choosing CNC turning or milling.',
        },
        {
          type: 'add',
          after:
            'Added a drawing-review CTA and connected DFM support to RFQ preparation, making the commercial next step clearer.',
        },
        {
          type: 'add',
          after:
            'Added image Alt text guidance and more specific internal-link anchor suggestions for CNC turning, CNC milling, and DFM support pages.',
        },
      ],
    },
  ];
  const tdk = {
    title,
    keywords: [...primaryKeywords, ...secondaryKeywords, 'supplier risk', 'RFQ checklist'],
    description:
      'Compare CNC turning and milling by geometry, tolerance, cost, lead time, and supplier capability. Learn what overseas buyers should prepare before sending an RFQ.',
  };
  const finalEvaluationReport = createFinalContentEvaluationReport({
    finalArticle,
    primaryKeyword,
    selectedLinks,
    tdk,
  });
  // 用户追加修改要求会转成修订轮次，并覆盖最新可保存终稿。
  const revisionRequests = (options.revisionRequests ?? task?.content?.revisionRequests ?? [])
    .map(normalizeRevisionRequest)
    .filter((request) => request.text.trim());
  const finalRevisionRounds = revisionRequests.reduce((rounds, request) => {
    const previousRound = rounds[rounds.length - 1];
    const baseArticle = previousRound?.finalArticle ?? finalArticle;
    const baseTdk = previousRound?.tdk ?? tdk;
    const baseEvaluationReport = createFinalContentEvaluationReport({
      finalArticle: baseArticle,
      primaryKeyword,
      selectedLinks,
      tdk: baseTdk,
    });
    return [
      ...rounds,
      createFinalRevisionRound({
        baseArticle,
        baseEvaluationReport,
        baseTdk,
        primaryKeyword,
        request,
      }),
    ];
  }, []);
  const latestRound = finalRevisionRounds[finalRevisionRounds.length - 1];
  const latestFinalArticle = latestRound?.finalArticle ?? finalArticle;
  const latestTdk = latestRound?.tdk ?? tdk;
  const latestEvaluationReport = latestRound?.evaluationReport ?? finalEvaluationReport;
  const latestFinalArticleId = latestRound?.finalArticle.id ?? 'final';
  const latestTdkId = latestRound?.tdk.id ?? 'tdk';
  const latestEvaluationReportId = latestRound?.evaluationReport.id ?? 'final-evaluation';
  const referencedKnowledgeBlocks = referenceBlocks.filter((block) =>
    ['knowledge-item', 'knowledge-asset'].includes(block.blockKind),
  );
  const revisionArtifacts = Object.fromEntries(
    finalRevisionRounds.flatMap((round) => [
      [
        round.revisionRecord.id,
        {
          ...round.revisionRecord,
          subtitle: `用户要求：${round.request.text}`,
          type: 'revision',
        },
      ],
      [
        round.finalArticle.id,
        {
          ...round.finalArticle,
          subtitle: `标题：${round.finalArticle.headline}`,
          type: 'article',
        },
      ],
      [
        round.evaluationReport.id,
        {
          ...round.evaluationReport,
          subtitle: `文章终稿（第 ${round.version} 版）`,
          type: 'evaluation',
        },
      ],
    ]),
  );
  // artifacts 是右侧预览面板的数据源，工作流步骤通过 artifactId 选中展示。
  const artifacts = {
    references: {
      id: 'references',
      title: '引用知识',
      titleEn: 'Referenced Knowledge',
      subtitle: `共 ${referencedKnowledgeBlocks.length} 个文本块`,
      subtitleEn: `${referencedKnowledgeBlocks.length} text blocks`,
      type: 'references',
      referenceBlocks: referencedKnowledgeBlocks,
    },
    'article-v1': {
      ...articleVersions[0],
      subtitle: `标题：${articleVersions[0].headline}`,
      type: 'article',
    },
    'evaluation-v1': {
      ...evaluationReports[0],
      subtitle: '评估内容：文章初稿（第 1 版）',
      type: 'evaluation',
    },
    'suggestion-v1': {
      ...revisionSuggestions[0],
      subtitle: '评估内容：文章初稿（第 1 版）',
      type: 'suggestion',
    },
    'revision-record-v1': {
      ...revisionRecords[0],
      subtitle: title,
      type: 'revision',
    },
    'article-v2': {
      ...articleVersions[1],
      subtitle: `标题：${articleVersions[1].headline}`,
      type: 'article',
    },
    'evaluation-v2': {
      ...evaluationReports[1],
      title: '评估报告（第 2 版）',
      subtitle: '评估内容：文章初稿（第 2 版）',
      type: 'evaluation',
    },
    final: {
      ...finalArticle,
      subtitle: title,
      type: 'article',
    },
    tdk: {
      id: 'tdk',
      title: 'TDK',
      subtitle: title,
      type: 'tdk',
      tdk,
    },
    'final-evaluation': {
      ...finalEvaluationReport,
      subtitle: '文章终稿 + TDK',
      type: 'evaluation',
    },
    ...revisionArtifacts,
  };
  // 每条用户修改要求都会追加一组“要求 - 修改 - 评估”的工作流步骤。
  const revisionWorkflow = finalRevisionRounds.flatMap((round) => [
    {
      id: `user-revision-request-v${round.version}`,
      agentTitle: '用户',
      completedText: '修改要求',
      completedTextEn: 'Revision Request',
      kind: 'user-request',
      runningText: '修改要求',
      runningTextEn: 'Revision Request',
      taskName: '修改要求',
      taskNameEn: 'Revision Request',
      thinking: [round.request.text],
    },
    {
      id: `revision-write-v${round.version}`,
      agentTitle: '内容运营专员 Writer',
      steps: [
        {
          id: `revision-read-v${round.version}`,
          completedText: '阅读修改要求完成',
          completedTextEn: 'Review Revision Request completed',
          taskName: '阅读修改要求',
          taskNameEn: 'Review Revision Request',
          runningText: '正在阅读修改要求...',
          runningTextEn: 'Reviewing revision request...',
          thinking: [
            `正在理解用户对当前终稿的修改要求，并判断需要调整正文、CTA、素材引用还是 TDK。`,
            '本次修改会保留已通过评估的事实边界、图片 Alt 文本和引用关系，只调整用户指定的表达重点。',
          ],
        },
        {
          id: `revision-modify-v${round.version}`,
          completedText: '修改文章完成',
          completedTextEn: 'Revise Article completed',
          taskName: '修改文章',
          taskNameEn: 'Revise Article',
          runningText: '正在修改文章...',
          runningTextEn: 'Revising article...',
          thinking: [
            '正在把用户要求转化为可执行修改点，并逐段调整文章终稿。',
            `正在生成文章终稿（第 ${round.version} 版），并保留素材库图片、引用知识和已确认标题结构。`,
            '已生成新版文章终稿，等待内容评估专家重新评估文章终稿。',
          ],
          artifactIds: [round.revisionRecord.id, round.finalArticle.id],
        },
      ],
    },
    {
      id: `revision-evaluate-v${round.version}`,
      agentTitle: '内容评估专家',
      completedText: '文章终稿评估完成',
      completedTextEn: 'Evaluate Final Draft completed',
      taskName: '文章终稿评估',
      taskNameEn: 'Evaluate Final Draft',
      runningText: '正在评估文章终稿...',
      runningTextEn: 'Evaluating final draft...',
      thinking: [
        '正在复核用户修改是否破坏事实准确性、关键词自然度、图片 Alt 文本和 CTA 一致性。',
        `文章终稿（第 ${round.version} 版）无 Low 项，可以作为当前最新可保存版本。`,
        '以下是最终的内容评估报告。',
      ],
      artifactId: round.evaluationReport.id,
    },
  ]);

  return {
    articleVersions,
    artifacts,
    citationUsages,
    evaluationReports,
    finalEvaluationReport,
    finalArticle,
    finalRevisionRounds,
    latestEvaluationReport,
    latestEvaluationReportId,
    latestFinalArticle,
    latestFinalArticleId,
    latestTdk,
    latestTdkId,
    outlineHeadings,
    referenceBlocks,
    revisionRequests,
    revisionRecords,
    revisionSuggestions,
    tdk,
    // workflow 决定创作过程左侧任务流的展示顺序和产物揭示节奏。
    workflow: [
      {
        id: 'load-content-knowledge',
        agentTitle: '项目研究专家 Researcher',
        steps: [
          {
            id: 'load-knowledge-items',
            completedText: '加载知识条目完毕',
            completedTextEn: 'Load Knowledge Items completed',
            taskName: '加载知识条目',
            taskNameEn: 'Load Knowledge Items',
            runningText: '正在加载知识条目...',
            runningTextEn: 'Loading knowledge items...',
            sourceList: {
              emptyText: '未选择知识条目',
              emptyTextEn: 'No knowledge items selected',
              items: selectedKnowledgeItems,
              variant: 'knowledge-items',
            },
            thinking: [],
          },
          {
            id: 'parse-knowledge-assets',
            completedText: '解析知识资料完毕',
            completedTextEn: 'Parse Knowledge Files completed',
            taskName: '解析知识资料',
            taskNameEn: 'Parse Knowledge Files',
            runningText: '正在解析知识资料...',
            runningTextEn: 'Parsing knowledge files...',
            sourceList: {
              emptyText: '未选择知识资料',
              emptyTextEn: 'No knowledge files selected',
              items: selectedKnowledgeAssets,
              variant: 'knowledge-assets',
            },
            thinking: [],
          },
          {
            id: 'extract-knowledge-signals',
            completedText: '提取相关信息完毕',
            completedTextEn: 'Extract Key Insights completed',
            taskName: '提取相关信息',
            taskNameEn: 'Extract Key Insights',
            runningText: '正在提取相关信息...',
            runningTextEn: 'Extracting key insights...',
            thinking: [
              `已加载目标受众、知识条目和知识资料，重点关注 ${primaryKeyword}、DFM support、质量控制和 RFQ 准备。`,
              `已整理 ${referenceBlocks.length} 个来源文本块，其中 CNC Turning 与 DFM Support 将作为文章生成时的核心依据。`,
              '已提取可用于文章生成的服务能力、工艺边界、质量控制和 RFQ 准备信息，等待 Writer 结合标题大纲写作。',
            ],
            artifactId: 'references',
          },
        ],
      },
      {
        id: 'write-article-v1',
        agentTitle: '内容运营专员 Writer',
        steps: [
          {
            id: 'read-confirmed-outline',
            completedText: '查看标题大纲完毕',
            completedTextEn: 'Review Title Outline completed',
            taskName: '查看标题大纲',
            taskNameEn: 'Review Title Outline',
            runningText: '正在查看标题大纲...',
            runningTextEn: 'Reviewing title outline...',
            thinking: [
              `已读取用户确认后的文章标题和大纲：${outlineHeadings.slice(0, 4).join(' / ')}。`,
              '大纲要求先解释 CNC turning 与 CNC milling 的工艺边界，再进入采购决策标准、供应商能力和 RFQ 准备。',
              '后续写作会严格沿用用户确认的大纲结构，不新增偏离主题的章节。',
            ],
          },
          {
            id: 'generate-article-v1',
            completedText: '撰写文章初稿完毕',
            completedTextEn: 'Write Article Draft completed',
            taskName: '撰写文章初稿',
            taskNameEn: 'Write Article Draft',
            runningText: '正在撰写文章初稿...',
            runningTextEn: 'Writing article draft...',
            thinking: [
              '正在按照文章策划和标题大纲生成第 1 版文章，先覆盖工艺选择、供应商能力和 RFQ 检查清单。',
              '正在插入知识库引用，并把 Rejin CNC 的 turning、milling、DFM 和出口沟通能力放入供应商选择语境。',
              '第 1 版文章生成完成，等待内容评估专家检查。',
            ],
            artifactId: 'article-v1',
          },
        ],
      },
      {
        id: 'evaluate-v1',
        agentTitle: '内容评估专家',
        steps: [
          {
            id: 'evaluate-v1-check',
            completedText: '文章初稿评估完成',
            completedTextEn: 'Evaluate Draft completed',
            taskName: '文章初稿评估',
            taskNameEn: 'Evaluate Draft',
            runningText: '正在评估文章初稿...',
            runningTextEn: 'Evaluating draft...',
            thinking: [
              '正在按标题、大纲、文章三类指标进行评估；Low 项会阻止通过，Medium 项会保留优化建议。',
              '第 1 版文章在 AI 概率、案例融入、权威引用和图片 Alt 文本上未达标，需要反馈给 Writer 优化。',
            ],
            artifactId: 'evaluation-v1',
          },
          {
            id: 'suggest-v1',
            completedText: '思考优化方向完成',
            completedTextEn: 'Plan Optimization completed',
            taskName: '思考优化方向',
            taskNameEn: 'Plan Optimization',
            runningText: '正在思考优化方向...',
            runningTextEn: 'Planning optimization...',
            thinking: [
              '正在把 Medium 与 Low 项转化为可执行修改建议，优先处理 Low 项。',
              '建议聚焦：补充 DFM/RFQ 场景、增加具体 CTA、补齐图片 Alt 文本、降低模板化表达。',
            ],
            artifactId: 'suggestion-v1',
          },
        ],
      },
      {
        id: 'revise-v2',
        agentTitle: '内容运营专员 Writer',
        steps: [
          {
            id: 'revise-v2-read',
            completedText: '阅读修改建议完成',
            completedTextEn: 'Review Suggestions completed',
            taskName: '阅读修改建议',
            taskNameEn: 'Review Suggestions',
            runningText: '正在阅读修改建议...',
            runningTextEn: 'Reviewing suggestions...',
            thinking: [
              '正在阅读修改建议，并定位需要优先修正的 Low 项与 Medium 项。',
              '修改重点会聚焦 DFM/RFQ 场景、具体 CTA、图片 Alt 文本和降低模板化表达。',
            ],
          },
          {
            id: 'revise-v2-modify',
            completedText: '修改文章完成',
            completedTextEn: 'Revise Article completed',
            taskName: '修改文章',
            taskNameEn: 'Revise Article',
            runningText: '正在修改文章...',
            runningTextEn: 'Revising article...',
            thinking: [
              '正在补充 DFM review、inspection、internal link anchor、image Alt text 和 RFQ checklist。',
              '已生成第 2 版文章，并记录关键修改。',
            ],
            artifactIds: ['revision-record-v1', 'article-v2'],
          },
        ],
      },
      {
        id: 'evaluate-v2',
        agentTitle: '内容评估专家',
        completedText: '文章初稿评估完成',
        completedTextEn: 'Evaluate Draft completed',
        taskName: '文章初稿评估',
        taskNameEn: 'Evaluate Draft',
        runningText: '正在评估文章初稿...',
        runningTextEn: 'Evaluating draft...',
        thinking: [
          '正在复核所有 Low 项是否已消除，并确认 Medium 项是否有建议可留给人工编辑。',
          '第 2 版没有 Low 项。',
          '**内容可通过评估并进入最终整合。**',
        ],
        artifactId: 'evaluation-v2',
      },
      {
        id: 'finalize',
        agentTitle: '内容运营专员 Writer',
        steps: [
          {
            id: 'insert-relevant-media',
            completedText: '插入合适素材完成',
            completedTextEn: 'Insert Relevant Media completed',
            taskName: '插入合适素材',
            taskNameEn: 'Insert Relevant Media',
            runningText: '正在插入合适素材...',
            runningTextEn: 'Inserting relevant media...',
            sourceList: {
              emptyText: '未插入相关素材',
              emptyTextEn: 'No inserted media',
              items: finalArticleImages.map((image, index) => ({
                ...image,
                id: image.assetId || image.imageUrl || `inserted-media-${index + 1}`,
                label: image.title || image.alt || `素材 ${index + 1}`,
              })),
              variant: 'media',
            },
            thinking: [
              '正在搜索素材库中与文章主题、工艺场景和段落语义匹配的素材，并插入到合适位置。',
              '已将 CNC turning 工艺图放入工艺选择段落，将 DFM/inspection 素材图放入供应商风险控制段落，并补齐图片 Alt 文本。',
            ],
          },
          {
            id: 'insert-relevant-links',
            completedText: '插入相关链接完成',
            completedTextEn: 'Insert Relevant Links completed',
            taskName: '插入相关链接',
            taskNameEn: 'Insert Relevant Links',
            runningText: '正在插入相关链接...',
            runningTextEn: 'Inserting relevant links...',
            sourceList: {
              emptyText: '未找到可插入的知识条目或品牌档案链接',
              emptyTextEn: 'No knowledge item or brand profile links available',
              items: selectedLinks,
              variant: 'links',
            },
            thinking: [
              '正在从引用的知识条目和品牌档案中筛选相关链接，优先匹配文章中的服务能力、工艺说明和采购决策段落。',
              '已选择可支持文章可信度与转化路径的链接，等待整合到文章终稿。',
            ],
          },
          {
            id: 'finalize-content-tdk',
            completedText: '整合内容并撰写 TDK 完成',
            completedTextEn: 'Finalize Content & TDK completed',
            taskName: '整合内容并撰写 TDK',
            taskNameEn: 'Finalize Content & TDK',
            runningText: '正在整合内容并撰写 TDK...',
            runningTextEn: 'Finalizing content and writing TDK...',
            thinking: [
              '正在整合初稿、修改内容、素材和相关链接，生成可进入人工编辑的文章终稿。',
              '正在撰写 TDK，将 Title、Description 和 Keywords 与文章主题、主要关键词和 CTA 保持一致。',
              '文章终稿与 TDK 已生成，等待内容评估专家进行最终复核。',
            ],
            artifactIds: ['final', 'tdk'],
          },
        ],
      },
      {
        id: 'final-evaluate',
        agentTitle: '内容评估专家',
        completedText: '文章终稿评估完成',
        completedTextEn: 'Evaluate Final Draft completed',
        taskName: '文章终稿评估',
        taskNameEn: 'Evaluate Final Draft',
        runningText: '正在评估文章终稿...',
        runningTextEn: 'Evaluating final draft...',
        thinking: [
          '正在对文章终稿进行最终质量评估，重点检查事实准确性、知识库引用、关键词自然度、CTA、可读性、素材插入位置、链接相关性和图片 Alt 文本。',
          '正在对 TDK 进行评估，检查 Title 关键词位置、Description 摘要价值、Keywords 语义覆盖和与正文的一致性。',
          '文章终稿与 TDK 均无 Low 项，Medium 项已保留人工优化建议，内容符合评估标准。',
          '以下是最终的内容评估报告。',
        ],
        artifactId: 'final-evaluation',
      },
      ...revisionWorkflow,
    ],
  };
}
