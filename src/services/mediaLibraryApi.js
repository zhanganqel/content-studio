import { getDemoTableSeed } from '../data/demo/database/registry.js';
import { demoTableNames } from '../data/demo/database/schema.js';
import { readDemoSessionTable, writeDemoSessionTable } from './demoSessionStore.js';

const maxMediaFileSize = 100 * 1024 * 1024;
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']);
const videoExtensions = new Set(['mp4', 'webm', 'mov']);
// 上传媒体本体仅保存在当前页面内存，刷新后只保留 sessionStorage 中的元数据。
const uploadedMediaBlobStore = new Map();

// 媒体库支持项目对象和项目 ID 两种入参，页面调用可以保持简洁。
function getProjectId(projectOrId) {
  return typeof projectOrId === 'string' ? projectOrId : projectOrId?.id ?? 'default';
}

function getDemoMedia(projectOrId) {
  const projectId = getProjectId(projectOrId);
  const databaseAssets = getDemoTableSeed(projectId, demoTableNames.mediaAssets);
  return Array.isArray(databaseAssets)
    ? databaseAssets
    : typeof projectOrId === 'string'
      ? []
      : projectOrId?.demoProject?.mediaAssets ?? [];
}

function createEmptyState() {
  return {
    tagOverrides: {},
    uploadedAssets: [],
  };
}

function readState(projectId) {
  const snapshot = readDemoSessionTable(projectId, demoTableNames.mediaAssets, createEmptyState());
  return snapshot && typeof snapshot === 'object' ? { ...createEmptyState(), ...snapshot } : createEmptyState();
}

function writeState(projectId, state) {
  writeDemoSessionTable(projectId, demoTableNames.mediaAssets, state);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function getExtension(fileName = '') {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return extension === fileName.toLowerCase() ? '' : extension;
}

function removeExtension(fileName = '') {
  return fileName.replace(/\.[^.]+$/, '');
}

function getAssetType(fileType) {
  return videoExtensions.has(fileType) ? 'video' : 'image';
}

// 上传文件的 blob 只保存在当前浏览器会话，元数据写入当前标签页快照。
function normalizeMediaAsset(asset, projectId, state, source = 'demo') {
  const tags = state.tagOverrides[asset.id] ?? asset.tags ?? [];
  const uploadedBlob = source === 'uploaded' ? uploadedMediaBlobStore.get(asset.id) : null;

  return {
    ...asset,
    assetType: asset.assetType ?? getAssetType(asset.fileType ?? ''),
    canDelete: source === 'uploaded',
    imageUrl: uploadedBlob ? uploadedBlob.url : asset.imageUrl,
    projectId,
    source,
    sourceKind: asset.sourceKind ?? source,
    tags,
  };
}

// 列表由 demo 媒体和当前会话仍可访问的上传媒体合并得到。
export function listMediaAssets(projectOrId) {
  const projectId = getProjectId(projectOrId);
  const state = readState(projectId);
  const demoAssets = getDemoMedia(projectOrId).map((asset) =>
    normalizeMediaAsset({ ...asset, sourceKind: asset.sourceKind ?? 'demo' }, projectId, state, 'demo'),
  );
  const uploadedAssets = state.uploadedAssets
    .filter((asset) => uploadedMediaBlobStore.has(asset.id))
    .map((asset) => normalizeMediaAsset(asset, projectId, state, 'uploaded'));

  return [...demoAssets, ...uploadedAssets];
}

// 上传时校验文件类型和大小，并为浏览器预览创建 object URL。
export async function uploadMediaFiles(projectOrId, files) {
  const projectId = getProjectId(projectOrId);
  const state = readState(projectId);
  const uploaded = [];

  for (const file of Array.from(files ?? [])) {
    const extension = getExtension(file.name);
    if (!imageExtensions.has(extension) && !videoExtensions.has(extension)) {
      throw Object.assign(new Error('Unsupported media type'), {
        code: 'unsupportedType',
        fileName: file.name,
      });
    }

    if (file.size > maxMediaFileSize) {
      throw Object.assign(new Error('Media file is too large'), {
        code: 'mediaFileTooLarge',
        fileName: file.name,
      });
    }

    const id = `media-upload-${Date.now()}-${slugify(removeExtension(file.name))}-${Math.random()
      .toString(16)
      .slice(2, 7)}`;
    const objectUrl = URL.createObjectURL(file);
    const fileType = extension;
    const metadata = {
      id,
      title: removeExtension(file.name),
      category: 'uploaded',
      tags: ['uploaded'],
      usage: 'Uploaded media file for reusable content generation assets.',
      sourceKind: 'uploaded',
      sourcePageUrl: '',
      originalImageUrl: '',
      localPath: 'Uploaded in browser session',
      fileName: file.name,
      fileType,
      assetType: getAssetType(fileType),
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    uploadedMediaBlobStore.set(id, { file, url: objectUrl });
    state.uploadedAssets.push(metadata);
    uploaded.push(normalizeMediaAsset(metadata, projectId, state, 'uploaded'));
  }

  writeState(projectId, state);
  return uploaded;
}

// 标签覆盖只写入本地状态，不修改原始 demo 媒体数据。
export function updateMediaAssetTags(projectOrId, assetId, tags) {
  const projectId = getProjectId(projectOrId);
  const state = readState(projectId);
  state.tagOverrides[assetId] = [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  writeState(projectId, state);
  return listMediaAssets(projectOrId).find((asset) => asset.id === assetId) ?? null;
}

// 只能删除上传媒体，demo 媒体通过保护错误阻止误删。
export function deleteUploadedMediaAsset(projectOrId, assetId) {
  const projectId = getProjectId(projectOrId);
  const state = readState(projectId);
  const target = state.uploadedAssets.find((asset) => asset.id === assetId);
  if (!target) {
    throw Object.assign(new Error('Demo media cannot be deleted'), { code: 'demoMediaProtected' });
  }

  const uploadedBlob = uploadedMediaBlobStore.get(assetId);
  if (uploadedBlob?.url) {
    URL.revokeObjectURL(uploadedBlob.url);
  }

  state.uploadedAssets = state.uploadedAssets.filter((asset) => asset.id !== assetId);
  delete state.tagOverrides[assetId];
  uploadedMediaBlobStore.delete(assetId);
  writeState(projectId, state);
}
