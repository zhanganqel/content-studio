import { demoTableNames } from '../../data/demo/database/schema.js';
import {
  getDemoSessionId,
  readDemoSessionTable,
  writeDemoSessionTable,
} from '../../services/demoSessionStore.js';

// Copilot 旧缓存清理标记和侧栏偏好保存在 localStorage。
const cleanupVersionKey = 'content-studio-edgeone-copilot:v2:cleanup';
const sidebarKey = 'content-studio-edgeone-copilot:v2:sidebar-collapsed';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function cleanupLegacyCopilotStorage() {
  if (!canUseStorage() || window.localStorage.getItem(cleanupVersionKey) === '1') return;

  const removableKeys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index) || '';
    const isLegacyCopilotKey =
      key.startsWith('content-studio-copilot-') ||
      (key.startsWith('content-studio-db:') && /:copilot-(artifacts|conversations|messages|runs|seed-meta|sources)$/.test(key));
    if (isLegacyCopilotKey) removableKeys.push(key);
  }
  removableKeys.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(cleanupVersionKey, '1');
}

export function getBrowserUserId() {
  cleanupLegacyCopilotStorage();
  return getDemoSessionId();
}

export function getProjectUserId(projectId) {
  return `content-studio.${String(projectId || 'default')}.${getBrowserUserId()}`;
}

export function getSidebarCollapsedPreference() {
  cleanupLegacyCopilotStorage();
  return canUseStorage() && window.localStorage.getItem(sidebarKey) === 'true';
}

export function saveSidebarCollapsedPreference(collapsed) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(sidebarKey, collapsed ? 'true' : 'false');
}

export function getProjectUiPreferences(projectId) {
  cleanupLegacyCopilotStorage();
  // 当前项目的会话选择、置顶列表和标题覆盖写入 sessionStorage。
  const value = readDemoSessionTable(projectId, demoTableNames.copilotUi, {});
  return {
    activeConversationId: typeof value?.activeConversationId === 'string' ? value.activeConversationId : '',
    pinnedIds: Array.isArray(value?.pinnedIds) ? value.pinnedIds : [],
    titleOverrides: value?.titleOverrides && typeof value.titleOverrides === 'object'
      ? value.titleOverrides
      : {},
  };
}

export function saveProjectUiPreferences(projectId, preferences) {
  writeDemoSessionTable(projectId, demoTableNames.copilotUi, preferences);
}
