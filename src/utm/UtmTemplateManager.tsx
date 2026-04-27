import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { useT } from '../i18n';
import { useUtmTags, useUtmTemplates, type UtmCategory } from './useUtmData';

const REQUIRED_FIELDS: UtmCategory[] = ['source', 'medium'];
const OPTIONAL_FIELDS: UtmCategory[] = ['campaign', 'term', 'content'];

export const UtmTemplateManager: FC = () => {
  const t = useT();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Record<UtmCategory, string>>({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });
  const [saveMsg, setSaveMsg] = useState('');
  const [validationError, setValidationError] = useState('');
  const [openSuggestionField, setOpenSuggestionField] = useState<UtmCategory | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const { templates, saveTemplate, updateTemplate, deleteTemplate } = useUtmTemplates();
  const { tags } = useUtmTags();

  const handleFieldChange = (key: UtmCategory, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setValidationError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setValidationError('템플릿 이름은 필수입니다.');
      return;
    }

    if (!fields.source.trim()) {
      setValidationError('캠페인 소스(source)는 필수입니다.');
      return;
    }

    if (!fields.medium.trim()) {
      setValidationError('캠페인 매체(medium)는 필수입니다.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      source: fields.source.trim(),
      medium: fields.medium.trim(),
      campaign: fields.campaign.trim() || undefined,
      term: fields.term.trim() || undefined,
      content: fields.content.trim() || undefined,
    };

    if (editingTemplateId) {
      await updateTemplate(editingTemplateId, payload);
      setSaveMsg('템플릿이 수정됐습니다.');
    } else {
      await saveTemplate(payload);
      setSaveMsg('템플릿이 저장됐습니다.');
    }

    setEditingTemplateId(null);
    setName('');
    setDescription('');
    setFields({ source: '', medium: '', campaign: '', term: '', content: '' });
    setValidationError('');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplateId(template.id);
    setName(template.name);
    setDescription(template.description ?? '');
    setFields({
      source: template.source ?? '',
      medium: template.medium ?? '',
      campaign: template.campaign ?? '',
      term: template.term ?? '',
      content: template.content ?? '',
    });
    setValidationError('');
  };

  const cancelEdit = () => {
    setEditingTemplateId(null);
    setName('');
    setDescription('');
    setFields({ source: '', medium: '', campaign: '', term: '', content: '' });
    setValidationError('');
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

  const templateTags = (template: Record<string, any>) => {
    const allFields: UtmCategory[] = ['source', 'medium', 'campaign', 'term', 'content'];
    return allFields
      .flatMap((category) => {
        const value = template[category]?.trim();
        if (!value) {
          return [];
        }

        const key = `${category}|${value.toLowerCase()}`;
        const description = tagDescriptionMap.get(key);

        return [{
          label: `utm_${category}: ${value}`,
          description,
        }];
      });
  };

  const tagValuesByCategory = (category: UtmCategory) => {
    const valueMap = new Map<string, { value: string; description?: string }>();

    tags
      .filter((tag) => tag.category === category)
      .forEach((tag) => {
        const trimmedValue = tag.value.trim();
        if (!trimmedValue) {
          return;
        }

        if (!valueMap.has(trimmedValue)) {
          valueMap.set(trimmedValue, {
            value: trimmedValue,
            description: tag.description?.trim() || undefined,
          });
          return;
        }

        const existing = valueMap.get(trimmedValue);
        if (existing && !existing.description && tag.description?.trim()) {
          existing.description = tag.description.trim();
        }
      });

    return [...valueMap.values()].sort((a, b) => a.value.localeCompare(b.value));
  };

  const filteredTagValuesByCategory = (category: UtmCategory) => {
    const currentValue = fields[category].trim().toLowerCase();

    return tagValuesByCategory(category)
      .filter(({ value: option }) => {
        if (!currentValue) {
          return true;
        }

        const normalizedOption = option.toLowerCase();
        return normalizedOption.includes(currentValue) || normalizedOption.startsWith(currentValue);
      })
      .slice(0, 8);
  };

  const renderFieldInput = (category: UtmCategory, isRequired: boolean) => (
    <div key={category} className="relative">
      <div className="mb-1 flex items-center gap-1">
        <label htmlFor={`template-${category}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          utm_{category}
        </label>
        {isRequired && <span className="text-red-500" aria-hidden="true">*</span>}
      </div>
      <input
        id={`template-${category}`}
        type="text"
        value={fields[category]}
        onChange={(e) => handleFieldChange(category, e.target.value)}
        onFocus={() => setOpenSuggestionField(category)}
        onBlur={() => setTimeout(() => setOpenSuggestionField((prev) => (prev === category ? null : prev)), 120)}
        autoComplete="off"
        placeholder={`utm_${category} 값`}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      {openSuggestionField === category && filteredTagValuesByCategory(category).length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filteredTagValuesByCategory(category).map((option) => (
            <button
              key={`${category}-${option.value}`}
              type="button"
              onMouseDown={() => handleFieldChange(category, option.value)}
              className="block w-full px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <span className="block">{option.value}</span>
              {option.description && (
                <span className="block text-[11px] text-gray-500 dark:text-gray-400">{option.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <NoMenuLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
            {t('utm.template.title')}
          </h1>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-lm-border bg-white p-3 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              템플릿 입력
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="template-name" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  템플릿 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="템플릿 이름"
                  className="w-full rounded border border-lm-border px-2 py-1.5 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
              </div>

              <div>
                <label htmlFor="template-description" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  설명 (선택)
                </label>
                <input
                  id="template-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="템플릿 설명"
                  maxLength={500}
                  className="w-full rounded border border-lm-border px-2 py-1.5 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
              </div>
            </div>

            {/* Required Fields Section */}
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                필수 항목
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {REQUIRED_FIELDS.map((cat) => renderFieldInput(cat, true))}
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                선택 항목
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {OPTIONAL_FIELDS.map((cat) => renderFieldInput(cat, false))}
              </div>
            </div>

            {/* Buttons and Messages */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex items-center justify-center gap-2 rounded bg-lm-main px-3 py-1.5 text-xs text-white hover:bg-lm-secondary disabled:opacity-40 dark:bg-dm-main dark:hover:bg-dm-secondary"
              >
                <FontAwesomeIcon icon={faSave} /> {editingTemplateId ? '템플릿 수정 저장' : '템플릿 저장'}
              </button>
              {editingTemplateId && (
                <button
                  onClick={cancelEdit}
                  className="rounded bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  수정 취소
                </button>
              )}
              {validationError && <p className="text-xs text-red-600">{validationError}</p>}
              {saveMsg && <p className="text-xs text-green-600">{saveMsg}</p>}
            </div>
          </div>

          {/* Saved Templates List */}
          <div className="rounded-md border border-lm-border bg-white p-3 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              저장된 템플릿
            </h2>
            {templates.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">저장된 템플릿이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {templates.map((tpl) => {
                  const tags = templateTags(tpl);

                  return (
                    <div
                      key={tpl.id}
                      className="rounded border border-lm-border px-3 py-2 dark:border-dm-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 text-sm">
                          <span className="block truncate font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                            {tpl.name}
                          </span>
                          {tpl.description && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{tpl.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTemplate(tpl)}
                            className="text-[11px] text-blue-600 hover:text-blue-700"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => {
                              if (!window.confirm(`'${tpl.name}' 템플릿을 삭제할까요?`)) {
                                return;
                              }

                              if (editingTemplateId === tpl.id) {
                                cancelEdit();
                              }

                              void deleteTemplate(tpl.id);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        {tags.length === 0 ? (
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">UTM 값이 없습니다.</span>
                        ) : (
                          tags.map((tag) => (
                            <span
                              key={`${tpl.id}-${tag.label}`}
                              className="block rounded bg-lm-primary/50 px-1.5 py-0.5 text-[11px] text-(--light-text-color) dark:bg-dm-main dark:text-(--dark-text-color)"
                            >
                              {tag.label}
                              {tag.description ? ` (${tag.description})` : ''}
                            </span>
                          ))
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
