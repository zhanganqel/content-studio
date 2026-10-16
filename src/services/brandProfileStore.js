import { getDemoTableSeed } from '../data/demo/database/registry.js';
import { demoTableNames } from '../data/demo/database/schema.js';
import {
  readDemoSessionTable,
  removeDemoSessionTable,
  writeDemoSessionTable,
} from './demoSessionStore.js';

// 目标市场选项作为品牌档案表单的固定候选值。
export const marketOptions = [
  'United States',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Germany',
  'France',
  'Italy',
  'Netherlands',
  'Spain',
  'Australia',
  'Japan',
  'South Korea',
  'Singapore',
  'Vietnam',
  'Thailand',
  'Malaysia',
  'Indonesia',
  'India',
  'United Arab Emirates',
  'Saudi Arabia',
  'Global',
];

function safeJoin(items) {
  return Array.isArray(items) ? items.join('\n') : '';
}

function getSourceUrls(project, ids) {
  const documents = project?.demoProject?.sourceDocuments ?? [];
  return ids
    .map((id) => documents.find((document) => document.id === id)?.url)
    .filter(Boolean);
}

function getDefaultBrandName(project, demoProject) {
  return (
    demoProject?.brandName ??
    demoProject?.name?.replace(/\s+Demo Project$/i, '') ??
    project?.name?.replace(/\s+Demo Project$/i, '') ??
    ''
  );
}

export function createDefaultBrandProfile(project) {
  const demoProject = project?.demoProject;
  const brandProfile = getDemoTableSeed(project?.id, demoTableNames.brandProfile) ?? demoProject?.brandProfile ?? {};
  const defaultCoreCategories = [
    'Precision CNC machining',
    'Custom metal parts',
    'Sheet metal fabrication',
    'Surface finishing',
  ];
  const defaultCompanySourceIds = ['home', 'about', 'service', 'contact'];
  const defaultAuthoritySourceIds = [
    'source-five-axis-cnc-machining',
    'source-dfm-support',
    'source-automotive-connector-case',
    'source-audio-enclosure-case',
    'source-machining-accuracy',
    'source-design-and-prototyping-support',
  ];

  return {
    companyName: demoProject?.name ?? project?.name ?? '',
    brandName: getDefaultBrandName(project, demoProject),
    website: demoProject?.website ?? '',
    industry: demoProject?.industry ?? '',
    coreMarkets: demoProject?.coreMarkets ?? ['Global'],
    coreCategories: demoProject?.coreCategories ?? defaultCoreCategories,
    companyIntroduction: brandProfile.summary ?? '',
    certifications: safeJoin(brandProfile.certifications),
    coreAdvantages: safeJoin(brandProfile.capabilities),
    companyLinks: getSourceUrls(project, demoProject?.companySourceIds ?? defaultCompanySourceIds),
    authorityLinks: getSourceUrls(project, demoProject?.authoritySourceIds ?? defaultAuthoritySourceIds),
    brandPositioning: brandProfile.positioning ?? '',
    brandRequirements: safeJoin(brandProfile.brandStyle?.messagingPrinciples),
  };
}

export function getBrandProfileDraft(project) {
  const defaultProfile = createDefaultBrandProfile(project);
  // 品牌档案草稿从当前标签页的项目快照读取，缺失时回退到演示种子。
  const snapshot = readDemoSessionTable(project.id, demoTableNames.brandProfile, defaultProfile);
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? { ...defaultProfile, ...snapshot }
    : defaultProfile;
}

export function saveBrandProfileDraft(projectId, data) {
  // 保存品牌档案只更新当前项目的 sessionStorage 快照。
  return writeDemoSessionTable(projectId, demoTableNames.brandProfile, data);
}

export function resetBrandProfileDraft(project) {
  removeDemoSessionTable(project.id, demoTableNames.brandProfile);
  return createDefaultBrandProfile(project);
}
