import {
  Check,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe2,
  Image,
  Library,
  PlayCircle,
  Search,
  Scissors,
  Tag as TagIcon,
  Tags,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteUploadedFile,
  formatFileSize,
  listFiles,
  parseWebPage,
  processFile,
  updateFileTags,
  uploadFiles,
} from '../../services/fileLibraryApi.js';
import {
  deleteUploadedMediaAsset,
  listMediaAssets,
  updateMediaAssetTags,
  uploadMediaFiles,
} from '../../services/mediaLibraryApi.js';
import Button from '../ui/Button.jsx';
import FixedPageLayout from '../ui/FixedPageLayout.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import { useToast } from '../ui/Toast.jsx';
import KnowledgeFileChunksPage from './KnowledgeFileChunksPage.jsx';

const mediaCategoryIds = ['all', 'brand', 'services', 'products', 'cases', 'materials-process'];
const fileCategoryIds = ['all', 'word', 'excel', 'pdf', 'text', 'chunked', 'failed'];

// 媒体搜索覆盖标题、分类、用途、来源链接和标签。
function getMediaSearchText(asset) {
  return [
    asset.title,
    asset.category,
    asset.usage,
    asset.sourcePageUrl,
    asset.originalImageUrl,
    ...(asset.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

// 文件搜索覆盖文件名、类型、用途、来源链接和标签。
function getFileSearchText(file) {
  return [
    file.title,
    file.fileName,
    file.fileType,
    file.usage,
    ...(file.sourceUrls ?? []),
    ...(file.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

// 文件分类包含文件类型和处理状态两类筛选。
function matchesFileCategory(file, activeCategory) {
  if (activeCategory === 'all') return true;
  if (activeCategory === 'word') return file.fileType === 'docx' || file.fileType === 'doc';
  if (activeCategory === 'excel') return file.fileType === 'xlsx' || file.fileType === 'xls';
  if (activeCategory === 'pdf') return file.fileType === 'pdf';
  if (activeCategory === 'text') return file.fileType === 'txt' || file.fileType === 'md';
  if (activeCategory === 'chunked') return file.processingStatus === 'chunked';
  if (activeCategory === 'failed') return file.processingStatus === 'failed';
  return true;
}

function getSourceKind(item) {
  return item.sourceKind ?? item.source ?? 'demo';
}

function getSourceUrl(item) {
  return item.sourcePageUrl || item.sourceUrls?.[0] || '';
}

// 上传文件没有外部来源页，只有 demo 数据可以打开来源链接。
function canViewSource(item) {
  return getSourceKind(item) !== 'uploaded' && Boolean(getSourceUrl(item));
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TagFilterButton({ activeTag, copy, onTagChange, tagOptions }) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef(null);
  const hasActiveTag = activeTag !== 'all';

  useEffect(() => {
    // 标签筛选弹层只在打开时监听外部点击。
    function handleClickOutside(event) {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setTagMenuOpen(false);
      }
    }

    if (tagMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tagMenuOpen]);

  function selectTag(tag) {
    onTagChange(tag);
    setTagMenuOpen(false);
  }

  return (
    <div ref={tagMenuRef} className="relative">
      <button
        type="button"
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-md border text-sm font-semibold transition ${
          hasActiveTag || tagMenuOpen
            ? 'border-blue-200 bg-blue-50 text-blue-600'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }`}
        aria-expanded={tagMenuOpen}
        aria-label={copy.tagFilter}
        onClick={() => setTagMenuOpen((current) => !current)}
      >
        <Tags className="h-4 w-4" />
        {hasActiveTag ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" /> : null}
      </button>

      {tagMenuOpen ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[calc(100vw-64px)] rounded-lg border border-slate-200 bg-white p-2 shadow-menu sm:w-[320px]">
          <button
            type="button"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
              activeTag === 'all'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            onClick={() => selectTag('all')}
          >
            {copy.allTags}
            {activeTag === 'all' ? <Check className="h-4 w-4" /> : null}
          </button>
          <div className="mt-1 max-h-72 overflow-y-auto">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  activeTag === tag
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                onClick={() => selectTag(tag)}
              >
                <span className="truncate">{tag}</span>
                {activeTag === tag ? <Check className="ml-3 h-4 w-4 flex-none" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterPanel({
  activeCategory,
  activeTag,
  categoryIds,
  copy,
  getCategoryLabel,
  onCategoryChange,
  onSearchChange,
  onTagChange,
  searchPlaceholder,
  searchQuery,
  tagOptions,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {categoryIds.map((category) => (
            <button
              key={category}
              type="button"
              className={`inline-flex h-8 items-center rounded-md px-3 text-sm font-bold transition ${
                activeCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              onClick={() => onCategoryChange(category)}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <label className="relative block w-full sm:w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              value={searchQuery}
            />
          </label>
          <TagFilterButton
            activeTag={activeTag}
            copy={copy}
            onTagChange={onTagChange}
            tagOptions={tagOptions}
          />
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ copy, status }) {
  const styles = {
    pending: 'bg-slate-100 text-slate-600',
    processing: 'bg-blue-50 text-blue-600',
    chunked: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-red-50 text-red-500',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles[status] ?? styles.pending}`}>
      {copy.fileStatuses[status] ?? status}
    </span>
  );
}

function SourceBadge({ copy, sourceKind }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
      {copy.sourceLabels?.[sourceKind] ?? sourceKind}
    </span>
  );
}

function FileTypeIcon({ fileType }) {
  const Icon = fileType === 'xlsx' || fileType === 'xls' ? FileSpreadsheet : FileText;
  return (
    <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function FileCard({ copy, file, onDelete, onOpenChunks, onOpenPreview, onOpenSource, onOpenTags }) {
  const metaText = [
    file.fileType?.toUpperCase(),
    formatFileSize(file.size),
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-4">
        <FileTypeIcon fileType={file.fileType} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge copy={copy} status={file.processingStatus} />
            <SourceBadge copy={copy} sourceKind={getSourceKind(file)} />
            {metaText ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{metaText}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="line-clamp-2 text-left text-lg font-bold tracking-normal text-slate-800 transition hover:text-blue-600"
            onClick={() => onOpenPreview(file)}
          >
            {file.title}
          </button>
          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-slate-500">{file.usage}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {file.tags.slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
          >
            <TagIcon className="h-3 w-3" />
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-500"
          onClick={() => onOpenChunks(file)}
        >
          <Scissors className="h-4 w-4" />
          {copy.files.viewChunks}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-500"
          onClick={() => onOpenTags(file)}
        >
          <Tags className="h-4 w-4" />
          {copy.files.addTags}
        </button>
        {canViewSource(file) ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-500"
            onClick={() => onOpenSource(file)}
          >
            <ExternalLink className="h-4 w-4" />
            {copy.viewSource}
          </button>
        ) : null}
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 text-sm font-bold transition ${
            file.canDelete ? 'text-red-500 hover:text-red-400' : 'text-slate-300'
          }`}
          onClick={() => onDelete(file)}
        >
          <Trash2 className="h-4 w-4" />
          {copy.files.delete}
        </button>
      </div>
    </article>
  );
}

function AssetCard({ asset, copy, onDelete, onOpenSource, onOpenTags }) {
  const isVideo = asset.assetType === 'video';

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
      <div className="aspect-[16/10] bg-slate-100">
        {isVideo ? (
          <video className="h-full w-full object-cover" controls muted src={asset.imageUrl} />
        ) : (
          <img alt={asset.title} className="h-full w-full object-cover" loading="lazy" src={asset.imageUrl} />
        )}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              {copy.categories[asset.category] ?? asset.category}
            </span>
            <SourceBadge copy={copy} sourceKind={getSourceKind(asset)} />
            {isVideo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                <PlayCircle className="h-3 w-3" />
                {asset.fileType?.toUpperCase() ?? 'VIDEO'}
              </span>
            ) : null}
          </div>
          <h3 className="line-clamp-2 text-lg font-bold tracking-normal text-slate-800">{asset.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-slate-500">{asset.usage}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {asset.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
            >
              <TagIcon className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-500"
            onClick={() => onOpenTags(asset)}
          >
            <Tags className="h-4 w-4" />
            {copy.files.addTags}
          </button>
          {canViewSource(asset) ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-500"
              onClick={() => onOpenSource(asset)}
            >
              <ExternalLink className="h-4 w-4" />
              {copy.viewSource}
            </button>
          ) : null}
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 text-sm font-bold transition ${
              asset.canDelete ? 'text-red-500 hover:text-red-400' : 'text-slate-300'
            }`}
            onClick={() => onDelete(asset)}
          >
            <Trash2 className="h-4 w-4" />
            {copy.files.delete}
          </button>
        </div>
      </div>
    </article>
  );
}

function TagEditDialog({ copy, file, onCancel, onSave }) {
  const [tags, setTags] = useState(file.tags ?? []);
  const [value, setValue] = useState('');

  function addTag() {
    const nextValue = value.trim();
    if (!nextValue) return;
    setTags((current) => [...new Set([...current, nextValue])]);
    setValue('');
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-6">
      <div className="w-full max-w-[520px] rounded-lg bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <h3 className="text-xl font-bold text-slate-800">{copy.files.tagDialogTitle}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{file.title}</p>

        <div className="mt-5 flex min-h-[120px] flex-wrap content-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200"
            >
              {tag}
              <button
                type="button"
                className="text-slate-400 transition hover:text-red-500"
                onClick={() => setTags((current) => current.filter((item) => item !== tag))}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <input
            className="h-10 flex-1 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder={copy.files.tagInputPlaceholder}
          />
          <Button variant="secondary" onClick={addTag}>
            {copy.files.addTag}
          </Button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="neutral" onClick={onCancel}>
            {copy.actions.cancel}
          </Button>
          <Button variant="primary" onClick={() => onSave(tags)}>
            {copy.actions.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ copy, file, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-6">
      <div className="w-full max-w-[480px] rounded-lg bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <h3 className="text-xl font-bold text-slate-800">{copy.files.deleteTitle}</h3>
        <p className="mt-3 text-base leading-7 text-slate-500">{copy.files.deleteBody(file.title)}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="neutral" onClick={onCancel}>
            {copy.actions.cancel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {copy.files.delete}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WebParseDialog({ copy, onCancel, onSubmit }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const nextUrl = url.trim();
    if (!nextUrl) {
      setError(copy.files.webUrlRequired);
      return;
    }

    if (!isValidHttpUrl(nextUrl)) {
      setError(copy.files.webUrlInvalid);
      return;
    }

    onSubmit(nextUrl);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-6">
      <div className="w-full max-w-[560px] rounded-lg bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <h3 className="text-xl font-bold text-slate-800">{copy.files.parseWebTitle}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{copy.files.parseWebBody}</p>

        <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="web-url-input">
          {copy.files.webUrlLabel}
        </label>
        <input
          id="web-url-input"
          className={`mt-2 h-10 w-full rounded-md border px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
          }`}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError('');
          }}
          placeholder={copy.files.webUrlPlaceholder}
        />
        {error ? <p className="mt-2 text-sm font-semibold text-red-500">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="neutral" onClick={onCancel}>
            {copy.actions.cancel}
          </Button>
          <Button variant="primary" icon={Globe2} onClick={handleSubmit}>
            {copy.files.parseWeb}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeAssetsPage({ project, t }) {
  // 当前知识文件页固定展示资料库；素材库数据保留给后续独立入口。
  const copy = t.knowledgeAssets;
  const activeTab = 'files';
  const [files, setFiles] = useState(() => listFiles(project));
  const [mediaAssets, setMediaAssets] = useState(() => listMediaAssets(project));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTag, setActiveTag] = useState('all');
  const [editingTagsItem, setEditingTagsItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [webParseOpen, setWebParseOpen] = useState(false);
  const [chunkFileId, setChunkFileId] = useState('');
  const toast = useToast();
  const fileUploadInputRef = useRef(null);
  const mediaUploadInputRef = useRef(null);
  const bodyScrollRef = useRef(null);

  useEffect(() => {
    // 切换项目时重新读取文件、媒体和分块入口状态。
    setSearchQuery('');
    setActiveCategory('all');
    setActiveTag('all');
    setFiles(listFiles(project));
    setMediaAssets(listMediaAssets(project));
    setChunkFileId('');
  }, [project]);

  function showToast(message, type = 'success') {
    toast.show({ message, type });
  }

  const activeItems = activeTab === 'files' ? files : mediaAssets;
  const tagOptions = useMemo(
    () => [...new Set(activeItems.flatMap((item) => item.tags ?? []))].sort((a, b) => a.localeCompare(b)),
    [activeItems],
  );

  const filteredFiles = useMemo(() => {
    // 文件筛选同时应用分类、标签和搜索词。
    const query = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const matchesCategory = matchesFileCategory(file, activeCategory);
      const matchesTag = activeTag === 'all' || file.tags.includes(activeTag);
      const matchesQuery = !query || getFileSearchText(file).includes(query);
      return matchesCategory && matchesTag && matchesQuery;
    });
  }, [activeCategory, activeTag, files, searchQuery]);

  const filteredAssets = useMemo(() => {
    // 媒体筛选使用媒体分类、标签和搜索词。
    const query = searchQuery.trim().toLowerCase();
    return mediaAssets.filter((asset) => {
      const matchesCategory = activeCategory === 'all' || asset.category === activeCategory;
      const matchesTag = activeTag === 'all' || asset.tags.includes(activeTag);
      const matchesQuery = !query || getMediaSearchText(asset).includes(query);
      return matchesCategory && matchesTag && matchesQuery;
    });
  }, [activeCategory, activeTag, mediaAssets, searchQuery]);

  const fileMetrics = useMemo(() => {
    const fileTypeCount = new Set(files.map((file) => file.fileType)).size;
    const tagCount = new Set(files.flatMap((file) => file.tags ?? [])).size;
    const chunkedCount = files.filter((file) => file.processingStatus === 'chunked').length;
    return { fileTypeCount, tagCount, chunkedCount };
  }, [files]);

  const mediaMetrics = useMemo(() => {
    const sourceCount = new Set(mediaAssets.map((asset) => asset.sourcePageUrl).filter(Boolean)).size;
    const tagCount = new Set(mediaAssets.flatMap((asset) => asset.tags ?? [])).size;
    return { sourceCount, tagCount };
  }, [mediaAssets]);

  function openPreview(file) {
    // 文件预览使用独立 URL 打开，避免主页面状态被预览页影响。
    const url = `${window.location.origin}${window.location.pathname}?view=knowledge-file-preview&projectId=${project.id}&fileId=${file.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openSource(item) {
    const sourceUrl = getSourceUrl(item);
    if (!sourceUrl) {
      showToast(copy.toast.sourceMissing, 'warning');
      return;
    }
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleFileUpload(event) {
    // 文件上传后立即尝试浏览器端解析分块，失败时仍保留上传记录。
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selectedFiles.length) return;

    try {
      const uploadedFiles = await uploadFiles(project, selectedFiles);
      setFiles(listFiles(project));
      const results = await Promise.allSettled(uploadedFiles.map((file) => processFile(project, file.id)));
      setFiles(listFiles(project));
      if (results.some((result) => result.status === 'rejected')) {
        showToast(copy.toast.processFailed, 'warning');
      } else {
        showToast(copy.toast.uploaded, 'success');
      }
    } catch (error) {
      if (error.code === 'fileTooLarge') {
        showToast(copy.toast.fileTooLarge, 'error');
      } else if (error.code === 'unsupportedType') {
        showToast(copy.toast.unsupportedType, 'error');
      } else {
        showToast(copy.toast.uploadFailed, 'error');
      }
    }
  }

  async function handleMediaUpload(event) {
    // 媒体上传只写入媒体库，不进入文件分块处理流程。
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selectedFiles.length) return;

    try {
      await uploadMediaFiles(project, selectedFiles);
      setMediaAssets(listMediaAssets(project));
      showToast(copy.toast.mediaUploaded, 'success');
    } catch (error) {
      if (error.code === 'mediaFileTooLarge') {
        showToast(copy.toast.mediaFileTooLarge, 'error');
      } else if (error.code === 'unsupportedType') {
        showToast(copy.toast.unsupportedMediaType, 'error');
      } else {
        showToast(copy.toast.uploadFailed, 'error');
      }
    }
  }

  async function handleParseWebPage(url) {
    // 网页解析入口目前依赖服务配置，未配置时显示明确提示。
    try {
      await parseWebPage(project, url);
      setWebParseOpen(false);
      setFiles(listFiles(project));
      showToast(copy.toast.webParsed, 'success');
    } catch (error) {
      if (error.code === 'invalidUrl') {
        showToast(copy.toast.invalidUrl, 'error');
      } else if (error.code === 'webParserNotConfigured') {
        showToast(copy.toast.webParserNotConfigured, 'info');
      } else {
        showToast(copy.toast.webParseFailed, 'error');
      }
    }
  }

  function handleSaveTags(nextTags) {
    // 标签保存根据当前对象类型写回文件库或媒体库。
    if (!editingTagsItem) return;

    if (editingTagsItem.type === 'media') {
      updateMediaAssetTags(project, editingTagsItem.item.id, nextTags);
      setMediaAssets(listMediaAssets(project));
    } else {
      updateFileTags(project, editingTagsItem.item.id, nextTags);
      setFiles(listFiles(project));
    }

    setEditingTagsItem(null);
    showToast(copy.toast.tagsSaved, 'success');
  }

  function handleDelete(item, type = activeTab === 'media' ? 'media' : 'file') {
    // demo 数据受保护，只有用户上传的文件或媒体允许删除。
    if (!item.canDelete) {
      showToast(copy.toast.demoProtected, 'warning');
      return;
    }
    setDeletingItem({ item, type });
  }

  function confirmDelete() {
    if (!deletingItem) return;

    if (deletingItem.type === 'media') {
      deleteUploadedMediaAsset(project, deletingItem.item.id);
      setMediaAssets(listMediaAssets(project));
    } else {
      deleteUploadedFile(project, deletingItem.item.id);
      setFiles(listFiles(project));
    }

    setDeletingItem(null);
    showToast(copy.toast.deleted, 'success');
  }

  if (chunkFileId) {
    // 分块编辑页复用当前项目上下文，返回后重新读取文件状态。
    return (
      <KnowledgeFileChunksPage
        fileId={chunkFileId}
        onBack={() => {
          setFiles(listFiles(project));
          setChunkFileId('');
        }}
        project={project}
        t={t}
      />
    );
  }

  const isFilesTab = activeTab === 'files';
  // 筛选面板根据文件和媒体标签页切换分类集合。
  const filterPanel = isFilesTab ? (
    <FilterPanel
      activeCategory={activeCategory}
      activeTag={activeTag}
      categoryIds={fileCategoryIds}
      copy={copy}
      getCategoryLabel={(category) => copy.fileCategories[category] ?? category}
      onCategoryChange={setActiveCategory}
      onSearchChange={setSearchQuery}
      onTagChange={setActiveTag}
      searchPlaceholder={copy.files.searchPlaceholder}
      searchQuery={searchQuery}
      tagOptions={tagOptions}
    />
  ) : (
    <FilterPanel
      activeCategory={activeCategory}
      activeTag={activeTag}
      categoryIds={mediaCategoryIds}
      copy={copy}
      getCategoryLabel={(category) =>
        category === 'all' ? copy.allCategories : copy.categories[category] ?? category
      }
      onCategoryChange={setActiveCategory}
      onSearchChange={setSearchQuery}
      onTagChange={setActiveTag}
      searchPlaceholder={copy.searchPlaceholder}
      searchQuery={searchQuery}
      tagOptions={tagOptions}
    />
  );

  return (
    <div className="h-full min-h-0">
      <FixedPageLayout
        bodyClassName="space-y-7 pb-8"
        scrollRef={bodyScrollRef}
        header={
          <PageHeader
            description={copy.description}
            title={copy.title}
            actions={
              isFilesTab ? (
                <>
                  <input
                    ref={fileUploadInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".docx,.xlsx,.xls,.pdf,.txt,.md"
                    onChange={handleFileUpload}
                  />
                  <Button variant="secondary" icon={Globe2} onClick={() => setWebParseOpen(true)}>
                    {copy.files.parseWeb}
                  </Button>
                  <Button icon={Upload} onClick={() => fileUploadInputRef.current?.click()}>
                    {copy.files.uploadSource}
                  </Button>
                </>
              ) : (
                <>
                  <input
                    ref={mediaUploadInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.mov,image/*,video/*"
                    onChange={handleMediaUpload}
                  />
                  <Button icon={Upload} onClick={() => mediaUploadInputRef.current?.click()}>
                    {copy.files.uploadMedia}
                  </Button>
                </>
              )
            }
          />
        }
        controls={
          <>
            {filterPanel}
          </>
        }
      >

      {isFilesTab ? (
        <>
          <div className="grid gap-5 xl:grid-cols-4">
            <MetricCard icon={FileText} label={copy.fileMetrics.files} value={files.length} />
            <MetricCard icon={FileSpreadsheet} label={copy.fileMetrics.types} value={fileMetrics.fileTypeCount} />
            <MetricCard icon={TagIcon} label={copy.fileMetrics.tags} value={fileMetrics.tagCount} />
            <MetricCard icon={Scissors} label={copy.fileMetrics.chunked} value={fileMetrics.chunkedCount} />
          </div>

          {filteredFiles.length ? (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  copy={copy}
                  file={file}
                  onDelete={handleDelete}
                  onOpenChunks={(item) => setChunkFileId(item.id)}
                  onOpenPreview={openPreview}
                  onOpenSource={openSource}
                  onOpenTags={(item) => setEditingTagsItem({ item, type: 'file' })}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-10 text-center">
              <h3 className="text-xl font-bold text-slate-800">{copy.fileEmpty.title}</h3>
              <p className="mt-3 text-base font-medium text-slate-500">{copy.fileEmpty.body}</p>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-4">
            <MetricCard icon={Image} label={copy.metrics.assets} value={mediaAssets.length} />
            <MetricCard icon={Library} label={copy.metrics.categories} value={mediaCategoryIds.length - 1} />
            <MetricCard icon={TagIcon} label={copy.metrics.tags} value={mediaMetrics.tagCount} />
            <MetricCard icon={Database} label={copy.metrics.sources} value={mediaMetrics.sourceCount} />
          </div>

          {filteredAssets.length ? (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  copy={copy}
                  onDelete={(item) => handleDelete(item, 'media')}
                  onOpenSource={openSource}
                  onOpenTags={(item) => setEditingTagsItem({ item, type: 'media' })}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-10 text-center">
              <h3 className="text-xl font-bold text-slate-800">{copy.empty.title}</h3>
              <p className="mt-3 text-base font-medium text-slate-500">{copy.empty.body}</p>
            </section>
          )}
        </>
      )}
      </FixedPageLayout>

      {editingTagsItem ? (
        <TagEditDialog
          copy={copy}
          file={editingTagsItem.item}
          onCancel={() => setEditingTagsItem(null)}
          onSave={handleSaveTags}
        />
      ) : null}
      {deletingItem ? (
        <DeleteDialog
          copy={copy}
          file={deletingItem.item}
          onCancel={() => setDeletingItem(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
      {webParseOpen ? (
        <WebParseDialog
          copy={copy}
          onCancel={() => setWebParseOpen(false)}
          onSubmit={handleParseWebPage}
        />
      ) : null}
    </div>
  );
}
