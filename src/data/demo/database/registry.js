import { goweGroupDemoDatabase } from './projects/gowe-group/index.js';
import { rejinCncDemoDatabase } from './projects/rejin-cnc/index.js';
import { demoTableNameSet } from './schema.js';

// 固定演示数据随前端构建打包，仅作为各项目首次读取的种子数据。
const databases = Object.freeze({
  [goweGroupDemoDatabase.projectId]: goweGroupDemoDatabase,
  [rejinCncDemoDatabase.projectId]: rejinCncDemoDatabase,
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
export function getDemoDatabase(projectId) {
  return clone(databases[String(projectId || '')] ?? null);
}

export function getDemoTableSeed(projectId, tableName) {
  if (!demoTableNameSet.has(tableName)) return undefined;
  return clone(databases[String(projectId || '')]?.tables?.[tableName]);
}
