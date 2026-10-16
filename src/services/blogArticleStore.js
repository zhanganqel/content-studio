import { getDemoTableSeed } from '../data/demo/database/registry.js';
import { demoTableNames } from '../data/demo/database/schema.js';
import { readDemoSessionTable, writeDemoSessionTable } from './demoSessionStore.js';

export const articleStatusOptions = ['draft', 'review', 'pending', 'published'];

export const articleTypeOptions = [
  'How-to Guide',
  'Comparison',
  'Ultimate Guide',
  'Product Review',
  'Industry Insight',
  'News',
  'FAQ',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getPersonaName(project, personaId) {
  const persona = project?.demoProject?.audiencePersonas?.find((item) => item.id === personaId);
  return persona?.title ?? '';
}

function guessArticleType(seed) {
  const title = seed.title?.toLowerCase() ?? '';

  if (title.includes(' vs ') || title.includes('compare') || title.includes('choose')) {
    return 'Comparison';
  }

  if (title.includes('how to')) {
    return 'How-to Guide';
  }

  return 'How-to Guide';
}

function getKeywordsFromTitle(title) {
  return title
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 6);
}

function getDefaultContent(seed, project) {
  const personaName = getPersonaName(project, seed.audiencePersonaId) || 'Target audience';
  return [
    seed.title,
    '',
    `Target audience: ${personaName}`,
    '',
    'Draft outline:',
    '1. Introduce the search scenario and decision context.',
    '2. Explain the key comparison points with practical manufacturing details.',
    '3. Summarize next steps for requesting a quote or validating requirements.',
  ].join('\n');
}

// 首次进入项目时由内容种子生成可编辑文章草稿。
function articleFromSeed(seed, index, project) {
  const title = seed.title ?? `Blog Article ${index + 1}`;

  return {
    id: seed.id ?? `blog-article-${index + 1}`,
    title,
    status: index === 0 ? 'pending' : 'draft',
    articleType: guessArticleType(seed),
    targetAudiencePersonaId: seed.audiencePersonaId ?? '',
    targetAudienceName: getPersonaName(project, seed.audiencePersonaId),
    keywords: getKeywordsFromTitle(title),
    content: getDefaultContent(seed, project),
    updatedAt: index === 0 ? '2026-06-29' : today(),
    updatedBy: 'Angel',
  };
}

export function createDefaultBlogArticles(project) {
  const databaseArticles = getDemoTableSeed(project?.id, demoTableNames.blogArticles);
  if (Array.isArray(databaseArticles)) return databaseArticles;

  const seeds = project?.demoProject?.contentSeeds?.filter((seed) => seed.type === 'blog') ?? [];
  return seeds.map((seed, index) => articleFromSeed(seed, index, project));
}

export function createBlankBlogArticle(title) {
  return {
    id: createBlogArticleId(),
    title,
    status: 'draft',
    articleType: '',
    targetAudiencePersonaId: '',
    targetAudienceName: '',
    keywords: [],
    content: '',
    updatedAt: today(),
    updatedBy: 'Angel',
  };
}

// 文章列表优先读取当前标签页快照，首次进入时使用固定数据库种子。
export function getBlogArticleDrafts(project) {
  return readDemoSessionTable(project.id, demoTableNames.blogArticles, createDefaultBlogArticles(project));
}

export function saveBlogArticleDrafts(projectId, articles) {
  // 文章列表写入当前项目的 sessionStorage 快照，不修改固定演示文章。
  return writeDemoSessionTable(projectId, demoTableNames.blogArticles, articles);
}

// 保存或插入文章时保持最新文章在列表顶部。
export function upsertBlogArticle(project, article) {
  const currentArticles = getBlogArticleDrafts(project);
  const exists = currentArticles.some((item) => item.id === article.id);
  const nextArticles = exists
    ? currentArticles.map((item) => (item.id === article.id ? article : item))
    : [article, ...currentArticles];

  return saveBlogArticleDrafts(project.id, nextArticles);
}

export function createBlogArticleId(prefix = 'blog-article') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getTodayString() {
  return today();
}
