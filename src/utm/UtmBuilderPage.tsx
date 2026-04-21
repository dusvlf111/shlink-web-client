import { faCopy, faExternalLinkAlt, faSave } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { ShlinkApiClientBuilder } from '../api/services/ShlinkApiClientBuilder';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { withDependencies } from '../container/context';
import { useServers } from '../servers/reducers/servers';
import { useUtmTags, useUtmTemplates, UTM_CATEGORIES, type UtmCategory } from './useUtmData';
import { UtmFieldInput } from './UtmFieldInput';
import { UtmManagementMenu } from './UtmManagementMenu';

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

const EMPTY: UtmFields = { baseUrl: '', source: '', medium: '', campaign: '', term: '', content: '' };
const EMPTY_SHORT_OPTIONS: ShortCreateOptions = { customSlug: '', title: '', tags: '' };

const parseTags = (rawTags: string): string[] => rawTags
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean);

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

const extractUtmFieldsFromUrl = (baseUrl: string): Partial<Omit<UtmFields, 'baseUrl'>> | null => {
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

    return Object.values(extracted).some((value) => value.trim()) ? extracted : null;
  } catch {
    return null;
  }
};

const hasRequiredFields = (fields: UtmFields) =>
  !!fields.baseUrl.trim() && !!fields.source.trim() && !!fields.medium.trim() && !!fields.campaign.trim();

type UtmBuilderPageProps = {
  buildShlinkApiClient: ShlinkApiClientBuilder;
};

const UtmBuilderPageBase: FC<UtmBuilderPageProps> = ({ buildShlinkApiClient }) => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { servers } = useServers();
  const [fields, setFields] = useState<UtmFields>(EMPTY);
  const [copied, setCopied] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);
  const [quickShortUrl, setQuickShortUrl] = useState('');
  const [shortCreateMsg, setShortCreateMsg] = useState('');
  const [showShortOptions, setShowShortOptions] = useState(false);
  const [shortOptions, setShortOptions] = useState<ShortCreateOptions>(EMPTY_SHORT_OPTIONS);

  const { tags } = useUtmTags();
  const { templates, saveTemplate } = useUtmTemplates();

  const utmUrl = useMemo(() => buildUtmUrl(fields), [fields]);
  const canGenerate = hasRequiredFields(fields) && !!utmUrl;
  const selectedServer = serverId ? servers[serverId] : null;

  const set = (key: keyof UtmFields) => (val: string) => setFields((prev) => ({ ...prev, [key]: val }));

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

  const tagsFor = (cat: UtmCategory) => tags.filter((tag) => tag.category === cat);

  const handleCopy = async () => {
    if (!canGenerate) return;

    await navigator.clipboard.writeText(utmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToShorten = () => {
    if (!canGenerate || !serverId) return;

    navigate(`/server/${serverId}/create-short-url?long-url=${encodeURIComponent(utmUrl)}`);
  };

  const handleCreateShortInOneClick = async () => {
    if (creatingShortUrl) {
      return;
    }

    if (!canGenerate) {
      setShortCreateMsg('URL과 필수 UTM 값을 먼저 입력해 주세요.');
      return;
    }

    if (!selectedServer) {
      setShortCreateMsg('선택된 서버를 찾을 수 없습니다.');
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

    try {
      const apiClient = buildShlinkApiClient(selectedServer);
      const customSlug = shortOptions.customSlug.trim() || undefined;
      const created = await apiClient.createShortUrl({
        longUrl: utmUrl,
        customSlug,
        title: shortOptions.title.trim() || undefined,
        tags: parseTags(shortOptions.tags),
        findIfExists: true,
      });
      setQuickShortUrl(created.shortUrl);
      setShortCreateMsg('단축링크 생성 완료');
    } catch {
      setShortCreateMsg('단축링크 생성에 실패했습니다.');
    } finally {
      setCreatingShortUrl(false);
    }
  };

  const applyTemplate = (tpl: {
    source: string;
    medium: string;
    campaign: string;
    term: string;
    content: string;
  }) => {
    setFields((prev) => ({ ...prev, ...tpl }));
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
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">UTM 빌더</h1>
        </div>

        <UtmManagementMenu />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 왼쪽: 빌더 */}
          <div className="lg:col-span-2 space-y-4 rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <div>
              <label htmlFor="utm-base-url" className="mb-1 block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
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
                URL에 포함된 utm_source, utm_medium, utm_campaign, utm_term, utm_content 값은 아래 입력칸에 자동 반영됩니다.
              </p>
            </div>

            {UTM_CATEGORIES.map((cat) => (
              <UtmFieldInput
                key={cat}
                label={`utm_${cat}`}
                value={fields[cat]}
                onChange={set(cat)}
                tags={tagsFor(cat)}
                required={cat === 'source' || cat === 'medium' || cat === 'campaign'}
              />
            ))}

            {/* 결과 URL */}
            <div className="mt-2">
              <p className="mb-1 block text-sm font-medium text-(--light-text-color) dark:text-(--dark-text-color)">생성된 URL</p>
              <div className="min-h-12 break-all rounded border border-lm-border bg-lm-primary/40 px-3 py-2 text-xs text-(--light-text-color) dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)">
                {utmUrl || <span className="text-gray-500 dark:text-gray-400">기본 URL을 입력하세요</span>}
              </div>
              {!canGenerate && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  단축링크 생성/복사를 위해 utm_source, utm_medium, utm_campaign은 필수입니다.
                </p>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                disabled={!canGenerate}
                className="flex items-center gap-2 rounded bg-lm-main px-4 py-2 text-sm text-white hover:bg-lm-secondary disabled:opacity-40 dark:bg-dm-main dark:hover:bg-dm-secondary"
              >
                <FontAwesomeIcon icon={faCopy} />
                {copied ? '복사됨!' : '복사'}
              </button>
              {serverId && (
                <button
                  onClick={() => setShowShortOptions((prev) => !prev)}
                  className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  한번에 링크 만들기
                </button>
              )}
              {serverId && (
                <button
                  onClick={handleGoToShorten}
                  disabled={!canGenerate}
                  className="flex items-center gap-2 rounded bg-lm-primary px-4 py-2 text-sm text-(--light-text-color) hover:bg-lm-secondary disabled:opacity-40 dark:bg-dm-primary dark:text-(--dark-text-color) dark:hover:bg-dm-secondary"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  단축링크 만들기
                </button>
              )}
            </div>

            {shortCreateMsg && (
              <p className="text-xs text-blue-600 dark:text-blue-300">{shortCreateMsg}</p>
            )}
            {showShortOptions && (
              <div className="space-y-2 rounded border border-lm-border p-3 dark:border-dm-border">
                <p className="text-xs font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">단축링크 생성 옵션</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    type="text"
                    value={shortOptions.title}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="제목 (필수)"
                    className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                  <input
                    type="text"
                    value={shortOptions.tags}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="태그 (필수, 쉼표 구분)"
                    className="rounded border border-red-400 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none dark:border-red-500 dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                  <input
                    type="text"
                    value={shortOptions.customSlug}
                    onChange={(e) => setShortOptions((prev) => ({ ...prev, customSlug: e.target.value }))}
                    placeholder="슬러그 직접 입력 (선택)"
                    className="rounded border border-lm-border px-2 py-1.5 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                  />
                </div>
                <button
                  onClick={() => void handleCreateShortInOneClick()}
                  disabled={!shortOptions.title.trim() || parseTags(shortOptions.tags).length === 0 || creatingShortUrl}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  단축링크 생성 실행
                </button>
              </div>
            )}
            {quickShortUrl && (
              <div className="rounded border border-lm-border bg-lm-primary/40 px-3 py-2 text-xs dark:border-dm-border dark:bg-dm-main">
                <p className="mb-1 font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">생성된 단축링크</p>
                <p className="break-all text-(--light-text-color) dark:text-(--dark-text-color)">{quickShortUrl}</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400">저장된 템플릿이 없습니다.</p>
                <button
                  onClick={() => navigate(`/server/${serverId}/utm-template-manager`)}
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
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{tpl.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 템플릿 저장 섹션 */}
            <div className="border-t border-lm-border pt-4 dark:border-dm-border">
              <h3 className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">현재 설정을 템플릿으로 저장</h3>
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
                {saveMsg && <p className="text-center text-[10px] text-green-600 dark:text-green-400">{saveMsg}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </NoMenuLayout>
  );
};

export const UtmBuilderPage = withDependencies(UtmBuilderPageBase, ['buildShlinkApiClient']);
