import {
  faCopy,
  faExternalLinkAlt,
  faSave,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { ShlinkApiClientBuilder } from '../api/services/ShlinkApiClientBuilder';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { withDependencies } from '../container/context';
import { useT } from '../i18n';
import { useServers } from '../servers/reducers/servers';
import {
  useUtmTags,
  useUtmTemplates,
  UTM_CATEGORIES,
  type UtmCategory,
} from './useUtmData';
import { UtmFieldInput } from './UtmFieldInput';

type UtmFields = {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

type ShortCreateOptions = {
  customSlug: string;
  title: string;
  tags: string;
};

const EMPTY: UtmFields = {
  baseUrl: '',
  source: '',
  medium: '',
  campaign: '',
  term: '',
  content: '',
};
const EMPTY_SHORT_OPTIONS: ShortCreateOptions = {
  customSlug: '',
  title: '',
  tags: '',
};

const parseTags = (rawTags: string): string[] =>
  rawTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

type BuilderMode = 'single' | 'multi';

// Per-row input model for multi mode. Each row carries its own title/tags so
// the bulk creation can apply them per link (not shared across rows). The UTM
// fields stay shared (one set applied to every row).
type LinkRow = {
  id: number;
  url: string;
  title: string;
  tags: string;
};

type MultiUrlResult = {
  id: number;
  url: string;
  builtUrl: string;
  ok: boolean;
  title: string;
  tags: string;
};

const buildUtmUrl = (fields: UtmFields): string => {
  if (!fields.baseUrl) return '';

  try {
    const url = new URL(fields.baseUrl);
    if (fields.source) url.searchParams.set('utm_source', fields.source);
    if (fields.medium) url.searchParams.set('utm_medium', fields.medium);
    if (fields.campaign) url.searchParams.set('utm_campaign', fields.campaign);
    if (fields.term) url.searchParams.set('utm_term', fields.term);
    if (fields.content) url.searchParams.set('utm_content', fields.content);

    return url.toString();
  } catch {
    return '';
  }
};

// Apply a single (shared) set of UTM fields to each row that has a non-empty
// URL. Rows with empty URLs are skipped entirely; rows whose URL fails to build
// (invalid format) are kept but flagged as not-ok so the UI can mark them as
// skipped. Per-row title/tags are carried through untouched.
const buildRowResults = (
  rows: LinkRow[],
  fields: Omit<UtmFields, 'baseUrl'>,
): MultiUrlResult[] =>
  rows
    .filter((row) => !!row.url.trim())
    .map((row) => {
      const builtUrl = buildUtmUrl({ ...fields, baseUrl: row.url.trim() });
      return {
        id: row.id,
        url: row.url.trim(),
        builtUrl,
        ok: !!builtUrl,
        title: row.title,
        tags: row.tags,
      };
    });

const extractUtmFieldsFromUrl = (
  baseUrl: string,
): Partial<Omit<UtmFields, 'baseUrl'>> | null => {
  if (!baseUrl.trim()) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    const extracted = {
      source: url.searchParams.get('utm_source') ?? '',
      medium: url.searchParams.get('utm_medium') ?? '',
      campaign: url.searchParams.get('utm_campaign') ?? '',
      term: url.searchParams.get('utm_term') ?? '',
      content: url.searchParams.get('utm_content') ?? '',
    };

    return Object.values(extracted).some((value) => value.trim())
      ? extracted
      : null;
  } catch {
    return null;
  }
};

const hasRequiredFields = (fields: UtmFields) =>
  !!fields.baseUrl.trim() && !!fields.source.trim() && !!fields.medium.trim();

const pickFallbackServerId = (
  servers: Record<string, { id: string; autoConnect?: boolean }>,
): string | null => {
  const list = Object.values(servers);
  return list.find((server) => server.autoConnect)?.id ?? list[0]?.id ?? null;
};

// The page can render via a route element, the bare /utm-builder route, or the
// web-component's createNotFound — in the latter cases useParams() may not see
// :serverId. Read it from the URL so short-url creation targets the server the
// user is actually viewing, NOT the autoConnect/first server. Falling back to
// autoConnect silently created links on the wrong Shlink server.
const serverIdFromPathname = (pathname: string): string | undefined => {
  const matched = pathname.match(/^\/server\/([^/]+)/)?.[1];
  return matched && matched !== 'create' ? matched : undefined;
};

type UtmBuilderPageProps = {
  buildShlinkApiClient: ShlinkApiClientBuilder;
};

const UtmBuilderPageBase: FC<UtmBuilderPageProps> = ({
  buildShlinkApiClient,
}) => {
  const { serverId: paramServerId } = useParams<{ serverId: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const { servers } = useServers();
  const fallbackServerId = useMemo(
    () => pickFallbackServerId(servers),
    [servers],
  );
  const serverId =
    paramServerId ??
    serverIdFromPathname(pathname) ??
    fallbackServerId ??
    undefined;
  const [fields, setFields] = useState<UtmFields>(EMPTY);
  const [copied, setCopied] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);
  const [quickShortUrl, setQuickShortUrl] = useState('');
  const [shortCreateMsg, setShortCreateMsg] = useState('');
  const [showShortOptions, setShowShortOptions] = useState(false);
  const [shortOptions, setShortOptions] =
    useState<ShortCreateOptions>(EMPTY_SHORT_OPTIONS);
  const [appliedTemplateName, setAppliedTemplateName] = useState('');
  const [mode, setMode] = useState<BuilderMode>('single');
  const [linkRows, setLinkRows] = useState<LinkRow[]>([
    { id: 0, url: '', title: '', tags: '' },
  ]);
  const nextRowId = useRef(1);
  const [copiedAll, setCopiedAll] = useState(false);
  const [bulkResults, setBulkResults] = useState<MultiUrlResult[]>([]);

  const { tags } = useUtmTags();
  const { templates, saveTemplate } = useUtmTemplates();

  const utmUrl = useMemo(() => buildUtmUrl(fields), [fields]);
  const canGenerate = hasRequiredFields(fields) && !!utmUrl;
  const selectedServer = serverId ? servers[serverId] : null;

  // Derived (not stored) list: each non-empty row URL gets the shared UTM set.
  // Single mode never touches this so its behavior is untouched.
  const multiResults = useMemo<MultiUrlResult[]>(() => {
    const utmOnly: Omit<UtmFields, 'baseUrl'> = {
      source: fields.source,
      medium: fields.medium,
      campaign: fields.campaign,
      term: fields.term,
      content: fields.content,
    };
    return buildRowResults(linkRows, utmOnly);
  }, [linkRows, fields]);
  const multiValidCount = multiResults.filter((row) => row.ok).length;
  const multiSkippedCount = multiResults.length - multiValidCount;
  const canBuildMulti =
    multiValidCount > 0 && !!fields.source.trim() && !!fields.medium.trim();

  const set = (key: keyof UtmFields) => (val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }));

  const addLinkRow = () =>
    setLinkRows((prev) => [
      ...prev,
      { id: nextRowId.current++, url: '', title: '', tags: '' },
    ]);

  const removeLinkRow = (id: number) =>
    setLinkRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.id !== id),
    );

  const updateLinkRow = (
    id: number,
    key: 'url' | 'title' | 'tags',
    value: string,
  ) =>
    setLinkRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );

  const handleBaseUrlChange = (baseUrl: string) => {
    setFields((prev) => {
      const extracted = extractUtmFieldsFromUrl(baseUrl);

      if (!extracted) {
        return { ...prev, baseUrl };
      }

      return {
        ...prev,
        baseUrl,
        ...extracted,
      };
    });
  };

  const tagsFor = (cat: UtmCategory) =>
    tags.filter((tag) => tag.category === cat);

  const handleCopy = async () => {
    if (!canGenerate) return;

    await navigator.clipboard.writeText(utmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToShorten = () => {
    if (!canGenerate) {
      setShortCreateMsg(
        'URL과 utm_source / utm_medium 값을 먼저 입력해 주세요.',
      );
      return;
    }
    if (!serverId) {
      setShortCreateMsg(
        '연결된 서버가 없어서 이동할 수 없습니다. 좌측 서버 메뉴에서 서버를 선택하거나 관리자에게 등록을 요청해 주세요.',
      );
      return;
    }
    if (!servers[serverId]) {
      setShortCreateMsg(
        '선택된 서버 정보를 찾지 못했습니다. 서버 목록 새로고침 후 다시 시도해 주세요.',
      );
      return;
    }

    navigate(
      `/server/${serverId}/create-short-url?long-url=${encodeURIComponent(utmUrl)}`,
    );
  };

  const handleCreateShortInOneClick = async () => {
    if (creatingShortUrl) {
      return;
    }

    if (!canGenerate) {
      setShortCreateMsg(
        'URL과 utm_source / utm_medium 값을 먼저 입력해 주세요.',
      );
      return;
    }

    if (!selectedServer) {
      setShortCreateMsg(
        serverId
          ? '서버 정보를 찾지 못했습니다. 서버 목록을 새로고침해 주세요.'
          : '연결된 서버가 없습니다. 좌측 서버 메뉴에서 서버를 선택해 주세요.',
      );
      return;
    }

    if (!shortOptions.title.trim()) {
      setShortCreateMsg('제목은 필수입니다.');
      return;
    }

    if (parseTags(shortOptions.tags).length === 0) {
      setShortCreateMsg('태그는 1개 이상 필수입니다.');
      return;
    }

    setCreatingShortUrl(true);
    setShortCreateMsg('단축링크 생성 중...');

    const TIMEOUT_MS = 8_000;

    const extractShlinkErrorMessage = (raw: unknown): string => {
      if (!raw) return '';
      if (raw instanceof Error) return raw.message;
      if (typeof raw === 'object') {
        const obj = raw as {
          status?: number;
          title?: string;
          detail?: string;
          invalidElements?: string[];
        };
        const parts: string[] = [];
        if (typeof obj.status === 'number') parts.push(`HTTP ${obj.status}`);
        if (typeof obj.title === 'string' && obj.title) parts.push(obj.title);
        if (typeof obj.detail === 'string' && obj.detail)
          parts.push(obj.detail);
        if (
          Array.isArray(obj.invalidElements) &&
          obj.invalidElements.length > 0
        ) {
          parts.push(`invalid: ${obj.invalidElements.join(', ')}`);
        }
        return parts.length > 0 ? parts.join(' · ') : JSON.stringify(raw);
      }
      return String(raw);
    };

    try {
      const apiClient = buildShlinkApiClient(selectedServer);
      const customSlug = shortOptions.customSlug.trim() || undefined;
      // 벌크 생성과 동일하게: 사용자가 입력한 제목 뒤에 적용된 템플릿 이름을 붙인다.
      const composedTitle = [
        shortOptions.title.trim(),
        appliedTemplateName.trim(),
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
      const created = await Promise.race([
        apiClient.createShortUrl({
          longUrl: utmUrl,
          customSlug,
          title: composedTitle || undefined,
          tags: parseTags(shortOptions.tags),
          findIfExists: true,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Shlink 서버 응답이 ${TIMEOUT_MS / 1000}초 안에 오지 않았습니다`,
                ),
              ),
            TIMEOUT_MS,
          ),
        ),
      ]);
      setQuickShortUrl(created.shortUrl);
      setShortCreateMsg('단축링크 생성 완료');
    } catch (error) {
      const detail = extractShlinkErrorMessage(error);
      setShortCreateMsg(
        `단축링크 생성에 실패했습니다.${detail ? ` (${detail})` : ''}`,
      );
    } finally {
      setCreatingShortUrl(false);
    }
  };

  const applyTemplate = (tpl: any) => {
    const templateFields = {
      source: tpl.source || '',
      medium: tpl.medium || '',
      campaign: tpl.campaign || '',
      term: tpl.term || '',
      content: tpl.content || '',
    };
    setFields((prev) => ({ ...prev, ...templateFields }));
    setAppliedTemplateName(typeof tpl?.name === 'string' ? tpl.name : '');
  };

  // Switching modes preserves the UTM fields (source/medium/...) and only
  // resets the per-mode short-url results so stale output is not shown.
  const switchMode = (next: BuilderMode) => {
    setMode(next);
    setBulkResults([]);
    setCopiedAll(false);
    setShortCreateMsg('');
  };

  const handleCopyAll = async () => {
    const validUrls = multiResults
      .filter((row) => row.ok)
      .map((row) => row.builtUrl);

    if (validUrls.length === 0) {
      setShortCreateMsg(t('utm.builder.multi.copyAllNeeded'));
      return;
    }

    await navigator.clipboard.writeText(validUrls.join('\n'));
    setCopiedAll(true);
    setShortCreateMsg(t('utm.builder.multi.copyAllDone'));
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Bulk short-url creation: loop over the valid derived rows. Each row applies
  // its OWN title/tags (not a shared set). Title/tags are optional per row, so a
  // blank title becomes undefined and blank tags become an empty array.
  const handleCreateShortInBulk = async () => {
    if (creatingShortUrl) {
      return;
    }

    if (!canBuildMulti) {
      setShortCreateMsg(
        '유효한 URL과 utm_source / utm_medium 값을 먼저 입력해 주세요.',
      );
      return;
    }

    if (!selectedServer) {
      setShortCreateMsg(
        serverId
          ? '서버 정보를 찾지 못했습니다. 서버 목록을 새로고침해 주세요.'
          : '연결된 서버가 없습니다. 좌측 서버 메뉴에서 서버를 선택해 주세요.',
      );
      return;
    }

    setCreatingShortUrl(true);

    const TIMEOUT_MS = 8_000;
    const INTER_REQUEST_DELAY_MS = 750;
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const apiClient = buildShlinkApiClient(selectedServer);
    const validRows = multiResults.filter((row) => row.ok);
    const resultRows: MultiUrlResult[] = [];
    let success = 0;
    let fail = 0;

    for (let index = 0; index < validRows.length; index += 1) {
      const row = validRows[index];
      setShortCreateMsg(
        `${t('utm.builder.multi.creating')} (${index + 1}/${validRows.length})`,
      );

      if (index > 0) {
        await sleep(INTER_REQUEST_DELAY_MS);
      }

      // Per-row title: the row's own title, with the applied template name
      // appended (matching single-mode behavior). Blank => undefined.
      const composedTitle = [row.title.trim(), appliedTemplateName.trim()]
        .filter(Boolean)
        .join(' ')
        .trim();

      try {
        const created = await Promise.race([
          apiClient.createShortUrl({
            longUrl: row.builtUrl,
            customSlug: undefined,
            title: composedTitle || undefined,
            tags: parseTags(row.tags),
            findIfExists: true,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Shlink 서버 응답이 ${TIMEOUT_MS / 1000}초 안에 오지 않았습니다`,
                  ),
                ),
              TIMEOUT_MS,
            ),
          ),
        ]);
        success += 1;
        resultRows.push({ ...row, builtUrl: created.shortUrl, ok: true });
      } catch {
        fail += 1;
        resultRows.push({ ...row, ok: false });
      }
    }

    setBulkResults(resultRows);
    setShortCreateMsg(t('utm.builder.multi.bulkResult', { success, fail }));
    setCreatingShortUrl(false);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;

    await saveTemplate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      ...fields,
    });

    setTemplateName('');
    setTemplateDescription('');
    setSaveMsg('템플릿이 저장되었습니다.');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  return (
    <NoMenuLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
              {t('utm.builder.title')}
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('utm.builder.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 왼쪽: 빌더 */}
          <div className="lg:col-span-2 space-y-4 rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            {/* 단일/다중 링크 토글 */}
            <div className="inline-flex rounded border border-lm-border p-0.5 dark:border-dm-border">
              <button
                type="button"
                onClick={() => switchMode('single')}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  mode === 'single'
                    ? 'bg-lm-main text-white dark:bg-dm-main'
                    : 'text-(--light-text-color) dark:text-(--dark-text-color)'
                }`}
              >
                {t('utm.builder.mode.single')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('multi')}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  mode === 'multi'
                    ? 'bg-lm-main text-white dark:bg-dm-main'
                    : 'text-(--light-text-color) dark:text-(--dark-text-color)'
                }`}
              >
                {t('utm.builder.mode.multi')}
              </button>
            </div>

            {mode === 'single' ? (
              <div>
                <label
                  htmlFor="utm-base-url"
                  className="mb-1 block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)"
                >
                  기본 URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="utm-base-url"
                  type="url"
                  value={fields.baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  URL에 포함된 utm_source, utm_medium, utm_campaign, utm_term,
                  utm_content 값은 아래 입력칸에 자동 반영됩니다.
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('utm.builder.multi.label')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {linkRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="url"
                        aria-label={`${t('utm.builder.multi.row.urlPlaceholder')} ${row.id}`}
                        value={row.url}
                        onChange={(e) =>
                          updateLinkRow(row.id, 'url', e.target.value)
                        }
                        placeholder={t('utm.builder.multi.row.urlPlaceholder')}
                        className="min-w-0 flex-[2] rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                      />
                      <input
                        type="text"
                        aria-label={`${t('utm.builder.multi.row.titlePlaceholder')} ${row.id}`}
                        value={row.title}
                        onChange={(e) =>
                          updateLinkRow(row.id, 'title', e.target.value)
                        }
                        placeholder={t(
                          'utm.builder.multi.row.titlePlaceholder',
                        )}
                        className="min-w-0 flex-1 rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                      />
                      <input
                        type="text"
                        aria-label={`${t('utm.builder.multi.row.tagsPlaceholder')} ${row.id}`}
                        value={row.tags}
                        onChange={(e) =>
                          updateLinkRow(row.id, 'tags', e.target.value)
                        }
                        placeholder={t('utm.builder.multi.row.tagsPlaceholder')}
                        className="min-w-0 flex-1 rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                      />
                      {linkRows.length > 1 && (
                        <button
                          type="button"
                          aria-label={t('utm.builder.multi.row.removeLink')}
                          title={t('utm.builder.multi.row.removeLink')}
                          onClick={() => removeLinkRow(row.id)}
                          className="shrink-0 rounded px-2 py-2 text-sm text-gray-500 hover:text-red-500 dark:text-gray-400"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLinkRow}
                  className="mt-2 rounded border border-lm-border px-3 py-1.5 text-xs font-semibold text-(--light-text-color) hover:border-lm-main dark:border-dm-border dark:text-(--dark-text-color)"
                >
                  {t('utm.builder.multi.row.addLink')}
                </button>
                {multiResults.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('utm.builder.multi.summary', {
                      valid: multiValidCount,
                      skipped: multiSkippedCount,
                    })}
                  </p>
                )}
              </div>
            )}

            {UTM_CATEGORIES.map((cat) => (
              <UtmFieldInput
                key={cat}
                label={`utm_${cat}`}
                value={fields[cat]}
                onChange={set(cat)}
                tags={tagsFor(cat)}
                required={
                  cat === 'source' || cat === 'medium' || cat === 'campaign'
                }
              />
            ))}

            {mode === 'single' ? (
              <>
                {/* 결과 URL */}
                <div className="mt-2">
                  <p className="mb-1 block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                    생성된 URL
                  </p>
                  <div className="min-h-12 break-all rounded border border-lm-border bg-lm-primary/40 px-3 py-2 text-xs text-(--light-text-color) dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)">
                    {utmUrl || (
                      <span className="text-gray-500 dark:text-gray-400">
                        기본 URL을 입력하세요
                      </span>
                    )}
                  </div>
                  {!canGenerate && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      단축링크 생성/복사를 위해 utm_source, utm_medium,
                      utm_campaign은 필수입니다.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-2">
                <p className="mb-1 block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('utm.builder.multi.result.title')}
                </p>
                {multiResults.length === 0 ? (
                  <div className="min-h-12 break-all rounded border border-lm-border bg-lm-primary/40 px-3 py-2 text-xs text-gray-500 dark:border-dm-border dark:bg-dm-main dark:text-gray-400">
                    {t('utm.builder.multi.result.empty')}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(bulkResults.length > 0 ? bulkResults : multiResults).map(
                      (row, index) => (
                        <div
                          key={`${row.id}-${index}`}
                          className="break-all rounded border border-lm-border px-3 py-1.5 text-xs dark:border-dm-border"
                        >
                          {row.ok ? (
                            <span className="text-(--light-text-color) dark:text-(--dark-text-color)">
                              {row.builtUrl}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              {row.url} — {t('utm.builder.multi.skipped')}
                            </span>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              {mode === 'single' ? (
                <button
                  onClick={handleCopy}
                  disabled={!canGenerate}
                  className="flex items-center gap-2 rounded bg-lm-main px-4 py-2 text-sm text-white hover:bg-lm-secondary disabled:opacity-40 dark:bg-dm-main dark:hover:bg-dm-secondary"
                >
                  <FontAwesomeIcon icon={faCopy} />
                  {copied ? '복사됨!' : '복사'}
                </button>
              ) : (
                <button
                  onClick={() => void handleCopyAll()}
                  disabled={multiValidCount === 0}
                  className="flex items-center gap-2 rounded bg-lm-main px-4 py-2 text-sm text-white hover:bg-lm-secondary disabled:opacity-40 dark:bg-dm-main dark:hover:bg-dm-secondary"
                >
                  <FontAwesomeIcon icon={faCopy} />
                  {copiedAll
                    ? t('utm.builder.multi.copiedAll')
                    : t('utm.builder.multi.copyAll')}
                </button>
              )}
              <button
                onClick={() => setShowShortOptions((prev) => !prev)}
                className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                한번에 링크 만들기
              </button>
              {mode === 'single' && (
                <button
                  onClick={handleGoToShorten}
                  className="flex items-center gap-2 rounded bg-lm-primary px-4 py-2 text-sm text-(--light-text-color) hover:bg-lm-secondary dark:bg-dm-primary dark:text-(--dark-text-color) dark:hover:bg-dm-secondary"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  단축링크 만들기
                </button>
              )}
            </div>

            {shortCreateMsg && (
              <p className="text-xs text-blue-600 dark:text-blue-300">
                {shortCreateMsg}
              </p>
            )}
            {showShortOptions && (
              <div className="space-y-2 rounded border border-lm-border p-3 dark:border-dm-border">
                <p className="text-xs font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                  단축링크 생성 옵션
                </p>
                {/* In multi mode title/tags come from each row, so the shared
                    title/tags inputs are only shown in single mode. */}
                {mode === 'single' && (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={shortOptions.title}
                      onChange={(e) =>
                        setShortOptions((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="제목 (필수)"
                      className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                    />
                    <input
                      type="text"
                      value={shortOptions.tags}
                      onChange={(e) =>
                        setShortOptions((prev) => ({
                          ...prev,
                          tags: e.target.value,
                        }))
                      }
                      placeholder="태그 (필수, 쉼표 구분)"
                      className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                    />
                    <input
                      type="text"
                      value={shortOptions.customSlug}
                      onChange={(e) =>
                        setShortOptions((prev) => ({
                          ...prev,
                          customSlug: e.target.value,
                        }))
                      }
                      placeholder="슬러그 직접 입력 (선택)"
                      className="rounded border border-lm-border px-2 py-1.5 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                    />
                  </div>
                )}
                {appliedTemplateName && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    저장 시 제목 뒤에 적용된 템플릿 이름{' '}
                    <strong>{appliedTemplateName}</strong> 이 자동으로 붙습니다.
                  </p>
                )}
                <button
                  onClick={() =>
                    void (mode === 'single'
                      ? handleCreateShortInOneClick()
                      : handleCreateShortInBulk())
                  }
                  disabled={
                    mode === 'single'
                      ? !shortOptions.title.trim() ||
                        parseTags(shortOptions.tags).length === 0 ||
                        creatingShortUrl
                      : !canBuildMulti || creatingShortUrl
                  }
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {mode === 'single'
                    ? '단축링크 생성 실행'
                    : t('utm.builder.multi.createAll')}
                </button>
              </div>
            )}
            {quickShortUrl && (
              <div className="rounded border border-lm-border bg-lm-primary/40 px-3 py-2 text-xs dark:border-dm-border dark:bg-dm-main">
                <p className="mb-1 font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                  생성된 단축링크
                </p>
                <p className="break-all text-(--light-text-color) dark:text-(--dark-text-color)">
                  {quickShortUrl}
                </p>
              </div>
            )}
          </div>

          {/* 오른쪽: 템플릿 검색/적용 */}
          <div className="space-y-4 rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              템플릿 검색 및 적용
            </h2>
            {templates.length === 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  저장된 템플릿이 없습니다.
                </p>
                <button
                  onClick={() =>
                    navigate(`/server/${serverId}/utm-template-manager`)
                  }
                  className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  템플릿 관리
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="w-full rounded border border-lm-border px-3 py-2 text-left hover:border-blue-600 hover:bg-blue-200 dark:border-dm-border dark:hover:border-blue-500 dark:hover:bg-blue-900/50"
                  >
                    <span className="block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                      {tpl.name}
                    </span>
                    {tpl.description && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {tpl.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 템플릿 저장 섹션 */}
            <div className="border-t border-lm-border pt-4 dark:border-dm-border">
              <h3 className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                현재 설정을 템플릿으로 저장
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="템플릿 이름"
                  maxLength={50}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="설명 (선택)"
                  maxLength={200}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim()}
                  className="flex w-full items-center justify-center gap-1 rounded bg-lm-main px-2 py-1.5 text-xs text-white hover:bg-lm-secondary disabled:opacity-40 dark:bg-dm-main dark:hover:bg-dm-secondary"
                >
                  <FontAwesomeIcon icon={faSave} className="text-[10px]" />
                  저장
                </button>
                {saveMsg && (
                  <p className="text-center text-[10px] text-green-600 dark:text-green-400">
                    {saveMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </NoMenuLayout>
  );
};

export const UtmBuilderPage = withDependencies(UtmBuilderPageBase, [
  'buildShlinkApiClient',
]);
