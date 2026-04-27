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
import { useUtmTemplates, useUtmTags } from './useUtmData';

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

type UtmTemplateFields = {
  source: string;
  medium: string;
  campaign?: string;
  term?: string;
  content?: string;
};

type OverrideFields = {
  campaign: string;
  term: string;
  content: string;
};

const pickOverride = (overrideValue: string | undefined, templateValue: string | undefined) => {
  const trimmed = overrideValue?.trim();
  return trimmed ? trimmed : templateValue;
};

const buildUtmUrlFromTemplate = (
  baseUrl: string,
  template: UtmTemplateFields,
  overrides?: Partial<OverrideFields>,
): string => {
  if (!baseUrl.trim()) {
    return '';
  }

  try {
    const url = new URL(baseUrl);

    const values = {
      utm_source: template.source,
      utm_medium: template.medium,
      utm_campaign: pickOverride(overrides?.campaign, template.campaign),
      utm_term: pickOverride(overrides?.term, template.term),
      utm_content: pickOverride(overrides?.content, template.content),
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

const pickFallbackServerId = (servers: Record<string, { id: string; autoConnect?: boolean }>): string | null => {
  const list = Object.values(servers);
  return list.find((server) => server.autoConnect)?.id ?? list[0]?.id ?? null;
};

const UtmBulkBuilderPageBase: FC<UtmBulkBuilderPageProps> = ({ buildShlinkApiClient }) => {
  const { serverId: paramServerId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { templates } = useUtmTemplates();
  const { tags } = useUtmTags();
  const { servers } = useServers();
  const fallbackServerId = useMemo(() => pickFallbackServerId(servers), [servers]);
  const serverId = paramServerId ?? fallbackServerId ?? undefined;

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
  const [overrideFields, setOverrideFields] = useState<OverrideFields>({
    campaign: '',
    term: '',
    content: '',
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
      utmUrl: buildUtmUrlFromTemplate(normalizeBaseUrl(baseUrl), template, overrideFields),
    }))
    .filter((row) => row.utmUrl), [baseUrl, overrideFields, selectedTemplates]);

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
  }, [baseUrl, selectedIds, overrideFields]);

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
      setActionMessage(t('utm.bulk.message.copyAllNeeded'));
      return;
    }

    const shortUrls = generatedRows
      .map((row) => row.shortUrl)
      .filter((url): url is string => !!url);
    const tsv = shortUrls.join('\n');

    await copyText(tsv);
    setCopiedAll(true);
    setActionMessage(t('utm.bulk.message.copyAllDone'));
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleGenerate = () => {
    if (!baseUrl.trim()) {
      setActionMessage(t('utm.bulk.message.needBaseUrl'));
      return;
    }

    if (selectedIds.length === 0) {
      setActionMessage(t('utm.bulk.message.needTemplate'));
      return;
    }

    if (previewRows.length === 0) {
      setActionMessage(t('utm.bulk.message.invalidUrl'));
      return;
    }

    setGeneratedRows(previewRows);
    setHasGenerated(true);
    setActionMessage(t('utm.bulk.message.generated', { count: previewRows.length }));
  };

  const handleCreateShortUrlsInBulk = async () => {
    if (creatingShortUrls) {
      return;
    }

    if (!selectedServer) {
      setActionMessage(t('utm.bulk.message.serverMissing'));
      return;
    }

    if (generatedRows.length === 0) {
      setActionMessage(t('utm.bulk.message.needGenerate'));
      return;
    }

    if (!shortOptions.titlePrefix.trim()) {
      setActionMessage(t('utm.bulk.message.needTitle'));
      return;
    }

    if (parseTags(shortOptions.additionalTags).length === 0) {
      setActionMessage(t('utm.bulk.message.needTags'));
      return;
    }

    setCreatingShortUrls(true);
    setActionMessage(t('utm.bulk.message.creating'));

    const PER_REQUEST_TIMEOUT_MS = 8_000;
    const INTER_REQUEST_DELAY_MS = 750;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const withTimeout = <Result,>(promise: Promise<Result>): Promise<Result> => Promise.race<Result>([
      promise,
      new Promise<Result>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Shlink 서버 응답이 ${PER_REQUEST_TIMEOUT_MS / 1000}초 안에 오지 않았습니다 (서버가 느리거나 rate limit 일 수 있습니다)`)),
          PER_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);

    const extractShlinkErrorMessage = (raw: unknown): string => {
      if (!raw) return '';
      if (raw instanceof Error) return raw.message;
      if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown> & {
          detail?: string;
          title?: string;
          type?: string;
          status?: number;
          invalidElements?: string[];
        };
        const parts: string[] = [];
        if (typeof obj.status === 'number') parts.push(`HTTP ${obj.status}`);
        if (typeof obj.title === 'string' && obj.title) parts.push(obj.title);
        if (typeof obj.detail === 'string' && obj.detail) parts.push(obj.detail);
        if (Array.isArray(obj.invalidElements) && obj.invalidElements.length > 0) {
          parts.push(`invalid: ${obj.invalidElements.join(', ')}`);
        }
        if (parts.length === 0) return JSON.stringify(raw);
        return parts.join(' · ');
      }
      return String(raw);
    };

    const isSlugConflictError = (raw: unknown): boolean => {
      if (!raw) return false;
      if (raw instanceof Error) {
        const m = raw.message;
        return m.includes('slug') || m.includes('conflict') || m.includes('409');
      }
      if (typeof raw === 'object') {
        const obj = raw as { status?: number; type?: string; detail?: string; invalidElements?: string[] };
        if (obj.status === 409) return true;
        if (typeof obj.type === 'string' && obj.type.toLowerCase().includes('slug')) return true;
        if (typeof obj.detail === 'string' && obj.detail.toLowerCase().includes('slug')) return true;
        if (Array.isArray(obj.invalidElements) && obj.invalidElements.includes('customSlug')) return true;
      }
      return false;
    };

    try {
      const apiClient = buildShlinkApiClient(selectedServer);
      const basePrefix = sanitizeSlugPart(shortOptions.slugPrefix);
      const additionalTags = parseTags(shortOptions.additionalTags);

      // Process rows sequentially so we never queue 50 hanging requests at
      // once and so the user sees progress instead of an indefinite spinner.
      const rowsWithShortUrl: GeneratedRow[] = [];
      for (let index = 0; index < generatedRows.length; index += 1) {
        const row = generatedRows[index];
        setActionMessage(`${t('utm.bulk.message.creating')} (${index + 1}/${generatedRows.length})`);

        // Throttle between requests so Shlink does not rate-limit us.
        if (index > 0) {
          await sleep(INTER_REQUEST_DELAY_MS);
        }

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
            shortUrl = await withTimeout(apiClient.createShortUrl({
              ...createPayload,
              customSlug,
            }));
          } catch (slugError) {
            if (customSlug && isSlugConflictError(slugError)) {
              shortUrl = await withTimeout(apiClient.createShortUrl(createPayload));
            } else {
              throw slugError;
            }
          }

          rowsWithShortUrl.push({
            ...row,
            shortUrl: shortUrl.shortUrl,
            shortCode: shortUrl.shortCode,
            createError: undefined,
          });
        } catch (error) {
          const message = extractShlinkErrorMessage(error) || t('utm.bulk.row.errorPrefix');
          rowsWithShortUrl.push({
            ...row,
            createError: `${t('utm.bulk.row.errorPrefix')}: ${message}`,
          });
        }
      }

      setGeneratedRows(rowsWithShortUrl);
      const successCount = rowsWithShortUrl.filter((row) => !!row.shortUrl).length;
      const failCount = rowsWithShortUrl.length - successCount;
      setActionMessage(t('utm.bulk.message.bulkResult', { success: successCount, fail: failCount }));
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
      setActionMessage(`${t('utm.bulk.message.bulkError')}${detail}`);
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

  const tagDescriptionMap = useMemo(() => {
    const map = new Map<string, string>();

    tags.forEach((tag) => {
      if (!tag.description?.trim()) {
        return;
      }

      const key = `${tag.category}|${tag.value.trim().toLowerCase()}`;
      map.set(key, tag.description.trim());
    });

    return map;
  }, [tags]);

  const getTemplateTagsInfo = (template: any) => {
    const result: Array<{ category: string; value: string; description?: string }> = [];

    ['source', 'medium', 'campaign', 'term', 'content'].forEach((category) => {
      const value = template[category]?.trim();
      if (value) {
        const key = `${category}|${value.toLowerCase()}`;
        const description = tagDescriptionMap.get(key);

        result.push({
          category,
          value,
          description,
        });
      }
    });

    return result;
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
              {t('utm.bulk.step1.title')}
            </h2>
            <input
              id="bulk-base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={t('utm.bulk.step1.placeholder')}
              className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('utm.bulk.step1.help')}
            </p>
          </div>

          <div className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              {t('utm.bulk.overrideSection.title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="bulk-override-campaign" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('utm.bulk.override.campaign.label')}
                </label>
                <input
                  id="bulk-override-campaign"
                  type="text"
                  value={overrideFields.campaign}
                  onChange={(e) => setOverrideFields((prev) => ({ ...prev, campaign: e.target.value }))}
                  placeholder={t('utm.bulk.override.campaign.placeholder')}
                  className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
              </div>
              <div>
                <label htmlFor="bulk-override-term" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('utm.bulk.override.term.label')}
                </label>
                <input
                  id="bulk-override-term"
                  type="text"
                  value={overrideFields.term}
                  onChange={(e) => setOverrideFields((prev) => ({ ...prev, term: e.target.value }))}
                  placeholder={t('utm.bulk.override.term.placeholder')}
                  className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
              </div>
              <div>
                <label htmlFor="bulk-override-content" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('utm.bulk.override.content.label')}
                </label>
                <input
                  id="bulk-override-content"
                  type="text"
                  value={overrideFields.content}
                  onChange={(e) => setOverrideFields((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder={t('utm.bulk.override.content.placeholder')}
                  className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('utm.bulk.overrideSection.help')}
            </p>
          </div>

          <div className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                {t('utm.bulk.step2.title')}
              </h2>
              {templates.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded bg-gray-100 px-3 py-1.5 text-xs text-(--light-text-color) hover:bg-gray-200 dark:bg-gray-800 dark:text-(--dark-text-color) dark:hover:bg-gray-700"
                >
                  {allSelected ? t('utm.bulk.step2.deselectAll') : t('utm.bulk.step2.selectAll')}
                </button>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{t('utm.bulk.step2.empty')}</span>
                <Link
                  to={serverId ? `/server/${serverId}/utm-template-manager` : '/utm-template-manager'}
                  className="w-fit rounded bg-blue-700 px-3 py-1.5 text-white no-underline hover:bg-blue-800"
                >
                  {t('utm.bulk.step2.gotoTemplates')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {templates.map((template) => {
                  const checked = selectedIds.includes(template.id);
                  const tagInfo = getTemplateTagsInfo(template);
                  const hasCampaign = tagInfo.some((t) => t.category === 'campaign');

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
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                          {template.name}
                        </span>
                        {template.description && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {template.description}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">
                          source={template.source || '-'} · medium={template.medium || '-'}
                          {hasCampaign && ` · campaign=${template.campaign}`}
                        </span>
                        {tagInfo.some((t) => t.description) && (
                          <div className="mt-1 space-y-0.5">
                            {tagInfo.map((tag) => (
                              tag.description && (
                                <span
                                  key={`${template.id}-${tag.category}`}
                                  className="block text-[10px] text-blue-600 dark:text-blue-400"
                                >
                                  <strong>{tag.category}:</strong> {tag.description}
                                </span>
                              )
                            ))}
                          </div>
                        )}
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
                {t('utm.bulk.step3.title')}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                >
                  {t('utm.bulk.action.generate')}
                </button>
                {serverId && (
                  <button
                    type="button"
                    disabled={creatingShortUrls || !hasGenerated || generatedRows.length === 0}
                    onClick={() => setShowShortOptions((prev) => !prev)}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {creatingShortUrls ? t('utm.bulk.action.makingShortUrls') : t('utm.bulk.action.makeShortUrls')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hasShortUrls}
                  onClick={() => void handleCopyAll()}
                  className="flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faCopy} />
                  {copiedAll ? t('utm.bulk.action.copiedAll') : t('utm.bulk.action.copyAll')}
                </button>
              </div>
            </div>

            {actionMessage && (
              <p className="mb-2 text-xs text-blue-600 dark:text-blue-300">{actionMessage}</p>
            )}

            {showShortOptions && (
              <div className="mb-2 space-y-2 rounded border border-lm-border p-3 dark:border-dm-border">
                <p className="text-xs font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">{t('utm.bulk.options.title')}</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={shortOptions.titlePrefix}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, titlePrefix: e.target.value }))}
                    placeholder={t('utm.bulk.options.titlePrefix.placeholder')}
                    className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                  <input
                    type="text"
                    value={shortOptions.additionalTags}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, additionalTags: e.target.value }))}
                    placeholder={t('utm.bulk.options.tags.placeholder')}
                    className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                  <input
                    type="text"
                    value={shortOptions.slugPrefix}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, slugPrefix: e.target.value }))}
                    placeholder={t('utm.bulk.options.slugPrefix.placeholder')}
                    className="rounded border border-lm-border px-2 py-1.5 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('utm.bulk.options.tagsHelp')}</p>
                <button
                  type="button"
                  disabled={isBulkCreateDisabled}
                  onClick={() => void handleCreateShortUrlsInBulk()}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {creatingShortUrls ? t('utm.bulk.action.makingShortUrls') : t('utm.bulk.options.runBulk')}
                </button>
              </div>
            )}

            {!hasGenerated ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('utm.bulk.step3.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {generatedRows.map((row) => {
                  const template = templates.find((t) => t.id === row.id);
                  const tagInfo = template ? getTemplateTagsInfo(template) : [];
                  const hasCampaign = tagInfo.some((t) => t.category === 'campaign');

                  return (
                    <div
                      key={row.id}
                      className="rounded border border-lm-border px-3 py-2 dark:border-dm-border"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
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

                      {/* Template Fields Info */}
                      <div className="mb-2 flex flex-wrap gap-1">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          source: {template?.source || '-'}
                        </span>
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          medium: {template?.medium || '-'}
                        </span>
                        {hasCampaign && (
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            campaign: {template?.campaign || '-'}
                          </span>
                        )}
                      </div>

                      {/* Tag Descriptions */}
                      {tagInfo.some((t) => t.description) && (
                        <div className="mb-2 space-y-0.5 rounded bg-amber-50 p-2 dark:bg-amber-900/20">
                          {tagInfo.map((tag) => (
                            tag.description && (
                              <div key={`${row.id}-${tag.category}`} className="text-[10px] text-amber-900 dark:text-amber-200">
                                <strong>{tag.category}:</strong> {tag.description}
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      <p className="break-all rounded bg-lm-primary/40 px-2 py-1 text-xs text-(--light-text-color) dark:bg-dm-main dark:text-(--dark-text-color)">
                        {row.utmUrl}
                      </p>

                      {row.shortUrl && (
                        <p className="mt-1 break-all rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          {t('utm.bulk.row.shortLabel')}: {row.shortUrl}
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
                          {row.shortUrl ? t('utm.bulk.row.copyShort') : t('utm.bulk.row.copyUtm')}
                        </button>
                        {serverId && (
                          <button
                            type="button"
                            onClick={() => openShortUrlCreatePage(row.utmUrl)}
                            className="flex items-center gap-2 rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            <FontAwesomeIcon icon={faExternalLinkAlt} />
                            {t('utm.bulk.row.openCreate')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </NoMenuLayout>
  );
};

export const UtmBulkBuilderPage = withDependencies(UtmBulkBuilderPageBase, ['buildShlinkApiClient']);
