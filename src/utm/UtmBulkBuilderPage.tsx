import { faCopy, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { ShlinkApiClientBuilder } from '../api/services/ShlinkApiClientBuilder';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { withDependencies } from '../container/context';
import { useServers } from '../servers/reducers/servers';
import { useT } from '../i18n';
import { useUtmTemplates } from './useUtmData';

type GeneratedRow = {
  id: string;
  name: string;
  description?: string;
  utmUrl: string;
  shortUrl?: string;
  shortCode?: string;
  createError?: string;
};

type BulkShortCreateOptions = {
  slugPrefix: string;
  titlePrefix: string;
  additionalTags: string;
};

type UtmBulkBuilderPageProps = {
  buildShlinkApiClient: ShlinkApiClientBuilder;
};

const buildUtmUrlFromTemplate = (
  baseUrl: string,
  template: { source: string; medium: string; campaign: string; term: string; content: string },
): string => {
  if (!baseUrl.trim()) {
    return '';
  }

  try {
    const url = new URL(baseUrl);

    const values = {
      utm_source: template.source,
      utm_medium: template.medium,
      utm_campaign: template.campaign,
      utm_term: template.term,
      utm_content: template.content,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value?.trim()) {
        url.searchParams.set(key, value.trim());
      }
    });

    return url.toString();
  } catch {
    return '';
  }
};

const normalizeBaseUrl = (rawBaseUrl: string): string => {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const parseTags = (rawTags: string): string[] => rawTags
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean);

const sanitizeSlugPart = (rawValue: string): string => rawValue
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const UtmBulkBuilderPageBase: FC<UtmBulkBuilderPageProps> = ({ buildShlinkApiClient }) => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { templates } = useUtmTemplates();
  const { servers } = useServers();

  const [baseUrl, setBaseUrl] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [generatedRows, setGeneratedRows] = useState<GeneratedRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [creatingShortUrls, setCreatingShortUrls] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [showShortOptions, setShowShortOptions] = useState(false);
  const [shortOptions, setShortOptions] = useState<BulkShortCreateOptions>({
    slugPrefix: '',
    titlePrefix: '',
    additionalTags: '',
  });

  const selectedServer = serverId ? servers[serverId] : null;

  const selectedTemplates = useMemo(() => {
    if (selectedIds.length === 0) {
      return [];
    }

    const selectedIdSet = new Set(selectedIds);
    return templates.filter((template) => selectedIdSet.has(template.id));
  }, [selectedIds, templates]);

  const previewRows = useMemo<GeneratedRow[]>(() => selectedTemplates
    .map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      utmUrl: buildUtmUrlFromTemplate(normalizeBaseUrl(baseUrl), template),
    }))
    .filter((row) => row.utmUrl), [baseUrl, selectedTemplates]);

  useEffect(() => {
    if (templates.length === 0 || selectedIds.length > 0) {
      return;
    }

    setSelectedIds(templates.map((template) => template.id));
  }, [templates, selectedIds.length]);

  useEffect(() => {
    setHasGenerated(false);
    setGeneratedRows([]);
    setCopiedAll(false);
    setActionMessage('');
    setShowShortOptions(false);
  }, [baseUrl, selectedIds]);

  const allSelected = templates.length > 0 && selectedIds.length === templates.length;
  const hasShortUrls = generatedRows.some((row) => !!row.shortUrl);
  const isBulkCreateDisabled = creatingShortUrls
    || !shortOptions.titlePrefix.trim()
    || parseTags(shortOptions.additionalTags).length === 0;

  const toggleSelected = (templateId: string) => {
    setSelectedIds((prev) => (prev.includes(templateId)
      ? prev.filter((id) => id !== templateId)
      : [...prev, templateId]));
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (prev.length === templates.length ? [] : templates.map((template) => template.id)));
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleCopyAll = async () => {
    if (!hasShortUrls) {
      setActionMessage('단축링크 생성 후 전체 복사가 가능합니다.');
      return;
    }

    const shortUrls = generatedRows
      .map((row) => row.shortUrl)
      .filter((url): url is string => !!url);
    const tsv = shortUrls.join('\n');

    await copyText(tsv);
    setCopiedAll(true);
    setActionMessage('전체 복사가 완료되었습니다.');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleGenerate = () => {
    if (!baseUrl.trim()) {
      setActionMessage('기본 URL을 먼저 입력해 주세요.');
      return;
    }

    if (selectedIds.length === 0) {
      setActionMessage('템플릿을 1개 이상 선택해 주세요.');
      return;
    }

    if (previewRows.length === 0) {
      setActionMessage('URL 형식을 확인해 주세요. 예: https://example.com/path');
      return;
    }

    setGeneratedRows(previewRows);
    setHasGenerated(true);
    setActionMessage(`${previewRows.length}개 URL이 생성되었습니다.`);
  };

  const handleCreateShortUrlsInBulk = async () => {
    if (creatingShortUrls) {
      return;
    }

    if (!selectedServer) {
      setActionMessage('선택된 서버를 찾을 수 없습니다. 서버 경로에서 다시 시도해 주세요.');
      return;
    }

    if (generatedRows.length === 0) {
      setActionMessage('먼저 생성하기 버튼으로 URL을 생성해 주세요.');
      return;
    }

    if (!shortOptions.titlePrefix.trim()) {
      setActionMessage('제목은 필수입니다.');
      return;
    }

    if (parseTags(shortOptions.additionalTags).length === 0) {
      setActionMessage('태그는 1개 이상 필수입니다.');
      return;
    }

    setCreatingShortUrls(true);
    setActionMessage('단축링크를 생성하고 있습니다...');

    try {
      const apiClient = buildShlinkApiClient(selectedServer);
      const basePrefix = sanitizeSlugPart(shortOptions.slugPrefix);
      const additionalTags = parseTags(shortOptions.additionalTags);

      const rowsWithShortUrl = await Promise.all(generatedRows.map(async (row, index) => {
        try {
          const normalizedName = sanitizeSlugPart(row.name);
          const customSlug = basePrefix
            ? `${basePrefix}-${normalizedName || 'item'}-${index + 1}`
            : undefined;
          const title = `${shortOptions.titlePrefix.trim()} ${row.name}`.trim();
          const tags = additionalTags;

          const createPayload = {
            longUrl: row.utmUrl,
            title,
            tags,
            findIfExists: true,
          };

          let shortUrl;

          try {
            shortUrl = await apiClient.createShortUrl({
              ...createPayload,
              customSlug,
            });
          } catch (slugError) {
            const isSlugConflict = slugError instanceof Error
              && (slugError.message.includes('slug') || slugError.message.includes('conflict') || slugError.message.includes('409'));

            if (customSlug && isSlugConflict) {
              shortUrl = await apiClient.createShortUrl(createPayload);
            } else {
              throw slugError;
            }
          }

          return {
            ...row,
            shortUrl: shortUrl.shortUrl,
            shortCode: shortUrl.shortCode,
            createError: undefined,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : '단축링크 생성 실패';
          return {
            ...row,
            createError: `단축링크 생성 실패: ${message}`,
          };
        }
      }));

      setGeneratedRows(rowsWithShortUrl);
      const successCount = rowsWithShortUrl.filter((row) => !!row.shortUrl).length;
      const failCount = rowsWithShortUrl.length - successCount;
      setActionMessage(`단축링크 생성 완료: 성공 ${successCount}건, 실패 ${failCount}건`);
    } catch {
      setActionMessage('단축링크 생성 중 오류가 발생했습니다. 서버 연결을 확인해주세요.');
    } finally {
      setCreatingShortUrls(false);
    }
  };

  const openShortUrlCreatePage = (utmUrl: string) => {
    if (!serverId) {
      return;
    }

    navigate(`/server/${serverId}/create-short-url?long-url=${encodeURIComponent(utmUrl)}`);
  };

  return (
    <NoMenuLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
            {t('utm.bulk.title')}
          </h1>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              1. 기본 URL 입력
            </h2>
            <input
              id="bulk-base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com/path"
              className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              선택한 템플릿의 utm_source, utm_medium, utm_campaign, utm_term, utm_content를 자동으로 붙여 여러 URL을 생성합니다.
            </p>
          </div>

          <div className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                2. 템플릿 선택
              </h2>
              {templates.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded bg-gray-100 px-3 py-1.5 text-xs text-(--light-text-color) hover:bg-gray-200 dark:bg-gray-800 dark:text-(--dark-text-color) dark:hover:bg-gray-700"
                >
                  {allSelected ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>저장된 템플릿이 없습니다.</span>
                <Link
                  to={serverId ? `/server/${serverId}/utm-template-manager` : '/utm-template-manager'}
                  className="w-fit rounded bg-blue-700 px-3 py-1.5 text-white no-underline hover:bg-blue-800"
                >
                  템플릿 관리로 이동
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {templates.map((template) => {
                  const checked = selectedIds.includes(template.id);

                  return (
                    <label
                      key={template.id}
                      htmlFor={`bulk-template-${template.id}`}
                      className="flex cursor-pointer items-start gap-2 rounded border border-lm-border px-3 py-2 hover:border-lm-main dark:border-dm-border dark:hover:border-dm-main"
                    >
                      <input
                        id={`bulk-template-${template.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(template.id)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                          {template.name}
                        </span>
                        {template.description && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {template.description}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">
                          source={template.source || '-'} · medium={template.medium || '-'} · campaign={template.campaign || '-'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                3. 생성 결과
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                >
                  생성하기
                </button>
                {serverId && (
                  <button
                    type="button"
                    disabled={creatingShortUrls || !hasGenerated || generatedRows.length === 0}
                    onClick={() => setShowShortOptions((prev) => !prev)}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {creatingShortUrls ? '단축링크 생성 중...' : '한번에 단축링크 만들기'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hasShortUrls}
                  onClick={() => void handleCopyAll()}
                  className="flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faCopy} />
                  {copiedAll ? '전체 복사됨' : '전체 복사(TSV)'}
                </button>
              </div>
            </div>

            {actionMessage && (
              <p className="mb-2 text-xs text-blue-600 dark:text-blue-300">{actionMessage}</p>
            )}

            {showShortOptions && (
              <div className="mb-2 space-y-2 rounded border border-lm-border p-3 dark:border-dm-border">
                <p className="text-xs font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">일괄 단축링크 생성 옵션</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={shortOptions.titlePrefix}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, titlePrefix: e.target.value }))}
                    placeholder="제목 (필수)"
                    className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                  <input
                    type="text"
                    value={shortOptions.additionalTags}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, additionalTags: e.target.value }))}
                    placeholder="태그 (필수, 쉼표 구분)"
                    className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                  <input
                    type="text"
                    value={shortOptions.slugPrefix}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, slugPrefix: e.target.value }))}
                    placeholder="슬러그 접두사 (선택)"
                    className="rounded border border-lm-border px-2 py-1.5 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">추가 태그는 모든 항목에 공통 적용됩니다.</p>
                <button
                  type="button"
                  disabled={isBulkCreateDisabled}
                  onClick={() => void handleCreateShortUrlsInBulk()}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {creatingShortUrls ? '단축링크 생성 중...' : '일괄 단축링크 생성 실행'}
                </button>
              </div>
            )}

            {!hasGenerated ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                기본 URL을 입력하고 템플릿을 선택한 뒤 생성하기 버튼을 눌러주세요.
              </p>
            ) : (
              <div className="space-y-2">
                {generatedRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded border border-lm-border px-3 py-2 dark:border-dm-border"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                          {row.name}
                        </p>
                        {row.description && (
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {row.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="break-all rounded bg-lm-primary/40 px-2 py-1 text-xs text-(--light-text-color) dark:bg-dm-main dark:text-(--dark-text-color)">
                      {row.utmUrl}
                    </p>

                    {row.shortUrl && (
                      <p className="mt-1 break-all rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        단축 URL: {row.shortUrl}
                      </p>
                    )}
                    {row.createError && (
                      <p className="mt-1 text-xs text-red-500">
                        {row.createError}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(row.shortUrl ?? row.utmUrl)}
                        className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-xs text-(--light-text-color) hover:bg-gray-200 dark:bg-gray-800 dark:text-(--dark-text-color) dark:hover:bg-gray-700"
                      >
                        <FontAwesomeIcon icon={faCopy} />
                        {row.shortUrl ? '단축 URL 복사' : 'UTM URL 복사'}
                      </button>
                      {serverId && (
                        <button
                          type="button"
                          onClick={() => openShortUrlCreatePage(row.utmUrl)}
                          className="flex items-center gap-2 rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} />
                          단축링크 만들기
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </NoMenuLayout>
  );
};

export const UtmBulkBuilderPage = withDependencies(UtmBulkBuilderPageBase, ['buildShlinkApiClient']);
