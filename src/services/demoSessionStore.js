import { getDemoTableSeed } from '../data/demo/database/registry.js';
import { demoDatabaseVersion } from '../data/demo/database/schema.js';

const sessionPrefix = `content-studio-demo-session:v${demoDatabaseVersion}`;
const sessionIdKey = `${sessionPrefix}:id`;
const cleanupMarkerKey = `${sessionPrefix}:legacy-local-storage-cleaned`;

const legacyBusinessKeyPrefixes = [
  'content-studio-active-ai-planning-session',
  'content-studio-audience-personas:',
  'content-studio-blog-article-ai-tasks:',
  'content-studio-blog-article-task-article-rule-',
  'content-studio-blog-articles:',
  'content-studio-brand-profile:',
  'content-studio-db:',
  'content-studio-file-library:',
  'content-studio-knowledge-items:',
  'content-studio-media-library:',
];

const legacyCopilotSessionKeys = [
  'content-studio-edgeone-copilot:v2:user-id',
];

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
// 项目业务草稿写入当前标签页的 sessionStorage，关闭标签页后不再保留。
function getSessionStorage() {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

// localStorage 只保存跨标签页的迁移标记和显示偏好，不保存业务草稿。
function getLocalStorage() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export function getDemoSessionTableKey(projectId, tableName) {
  return `${sessionPrefix}:${String(projectId || 'default')}:${tableName}`;
}

/**
 * 读取当前标签页的项目表快照。
 * 快照不存在或版本失配时返回调用方传入的兜底值，否则读取固定数据库种子。
 */
export function readDemoSessionTable(projectId, tableName, fallbackValue) {
  const storage = getSessionStorage();
  const hasExplicitFallback = arguments.length >= 3;
  const fallback = hasExplicitFallback ? fallbackValue : getDemoTableSeed(projectId, tableName);
  if (!storage) return clone(fallback);

  try {
    const raw = storage.getItem(getDemoSessionTableKey(projectId, tableName));
    if (!raw) return clone(fallback);
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== demoDatabaseVersion || !Object.prototype.hasOwnProperty.call(parsed, 'data')) {
      storage.removeItem(getDemoSessionTableKey(projectId, tableName));
      return clone(fallback);
    }
    return clone(parsed.data);
  } catch {
    return clone(fallback);
  }
}

export function writeDemoSessionTable(projectId, tableName, data) {
  const storage = getSessionStorage();
  if (!storage) return data;

  // 表快照按项目和表名隔离，文章、任务、知识资料等业务数据共用此写入入口。
  storage.setItem(
    getDemoSessionTableKey(projectId, tableName),
    JSON.stringify({
      data,
      schemaVersion: demoDatabaseVersion,
      updatedAt: new Date().toISOString(),
    }),
  );
  return data;
}

export function removeDemoSessionTable(projectId, tableName) {
  getSessionStorage()?.removeItem(getDemoSessionTableKey(projectId, tableName));
}

export function resetDemoSession() {
  const storage = getSessionStorage();
  if (!storage) return;

  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index) || '';
    if (key.startsWith(`${sessionPrefix}:`)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function getDemoSessionId() {
  const storage = getSessionStorage();
  if (!storage) return 'server';

  // 浏览器用户标识保存在 sessionStorage，用于隔离当前标签页发起的 Copilot 会话。
  let value = storage.getItem(sessionIdKey) || '';
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || `demo-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage.setItem(sessionIdKey, value);
  }
  return value;
}

/**
 * 清理旧版长期业务缓存。
 * 语言和侧边栏等显示偏好不在删除名单中。
 */
export function cleanupLegacyDemoLocalStorage() {
  const storage = getLocalStorage();
  if (!storage || storage.getItem(cleanupMarkerKey) === '1') return;

  const removableKeys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index) || '';
    if (
      legacyBusinessKeyPrefixes.some((prefix) => key.startsWith(prefix)) ||
      legacyCopilotSessionKeys.includes(key) ||
      key.startsWith('content-studio-edgeone-copilot:v2:project:')
    ) {
      removableKeys.push(key);
    }
  }

  removableKeys.forEach((key) => storage.removeItem(key));
  storage.setItem(cleanupMarkerKey, '1');
}
