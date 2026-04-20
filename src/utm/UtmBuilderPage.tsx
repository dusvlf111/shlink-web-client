import { faCopy, faExternalLinkAlt, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useUtmTags, useUtmTemplates,UTM_CATEGORIES, type UtmCategory } from './useUtmData';
import { UtmFieldInput } from './UtmFieldInput';

type UtmFields = {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

const EMPTY: UtmFields = { baseUrl: '', source: '', medium: '', campaign: '', term: '', content: '' };

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

const hasRequiredFields = (fields: UtmFields) =>
  !!fields.baseUrl.trim() && !!fields.source.trim() && !!fields.medium.trim() && !!fields.campaign.trim();

export const UtmBuilderPage: FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const [fields, setFields] = useState<UtmFields>(EMPTY);
  const [copied, setCopied] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const { tags, addTag, deleteTag } = useUtmTags();
  const { templates, saveTemplate, deleteTemplate } = useUtmTemplates();

  const utmUrl = useMemo(() => buildUtmUrl(fields), [fields]);
  const canGenerate = hasRequiredFields(fields) && !!utmUrl;

  const set = (key: keyof UtmFields) => (val: string) => setFields((prev) => ({ ...prev, [key]: val }));

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

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    await saveTemplate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      source: fields.source,
      medium: fields.medium,
      campaign: fields.campaign,
      term: fields.term,
      content: fields.content,
    });
    setTemplateName('');
    setTemplateDescription('');
    setSaveMsg('템플릿이 저장됐습니다.');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const applyTemplate = (tpl: { source: string; medium: string; campaign: string; term: string; content: string }) => {
    setFields((prev) => ({ ...prev, ...tpl }));
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">UTM 빌더</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 왼쪽: 빌더 */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label htmlFor="utm-base-url" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              기본 URL <span className="text-red-500">*</span>
            </label>
            <input
              id="utm-base-url"
              type="url"
              value={fields.baseUrl}
              onChange={(e) => set('baseUrl')(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {UTM_CATEGORIES.map((cat) => (
            <UtmFieldInput
              key={cat}
              label={`utm_${cat}`}
              value={fields[cat]}
              onChange={set(cat)}
              tags={tagsFor(cat)}
              onAddTag={(val) => addTag(cat, val)}
              onDeleteTag={deleteTag}
              required={cat === 'source' || cat === 'medium' || cat === 'campaign'}
            />
          ))}

          {/* 결과 URL */}
          <div className="mt-2">
            <p className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">생성된 URL</p>
            <div className="min-h-[48px] break-all rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {utmUrl || <span className="text-gray-400">기본 URL을 입력하세요</span>}
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
              className="flex items-center gap-2 rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faCopy} />
              {copied ? '복사됨!' : '복사'}
            </button>
            {serverId && (
              <button
                onClick={handleGoToShorten}
                disabled={!canGenerate}
                className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                단축링크 만들기
              </button>
            )}
          </div>
        </div>

        {/* 오른쪽: 템플릿 */}
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">템플릿 저장</h2>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="템플릿 이름"
              className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="템플릿 설명 (선택)"
              rows={3}
              maxLength={500}
              className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faSave} /> 현재 값 저장
            </button>
            {saveMsg && <p className="mt-1 text-xs text-green-600">{saveMsg}</p>}
          </div>

          {templates.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">저장된 템플릿</h2>
              <div className="space-y-2">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <button
                      onClick={() => applyTemplate(tpl)}
                      className="flex-1 text-left text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <span className="block">{tpl.name}</span>
                      {!!tpl.description && (
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{tpl.description}</span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm(`'${tpl.name}' 템플릿을 삭제할까요?`)) {
                          return;
                        }

                        void deleteTemplate(tpl.id);
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
