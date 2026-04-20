import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useState } from 'react';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { useUtmTags, UTM_CATEGORIES, type UtmCategory } from './useUtmData';
import { UtmManagementMenu } from './UtmManagementMenu';

export const UtmTagManager: FC = () => {
  const [category, setCategory] = useState<UtmCategory>('source');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const { tags, addTag, updateTag, deleteTag } = useUtmTags();

  const handleSave = async () => {
    if (!value.trim()) return;

    if (editingTagId) {
      await updateTag(editingTagId, category, value.trim(), description.trim());
      setSaveMsg('태그가 수정됐습니다.');
    } else {
      await addTag(category, value.trim(), description.trim());
      setSaveMsg('태그가 저장됐습니다.');
    }

    setEditingTagId(null);
    setValue('');
    setDescription('');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleEdit = (tagId: string, tagCategory: UtmCategory, tagValue: string, tagDescription?: string) => {
    setEditingTagId(tagId);
    setCategory(tagCategory);
    setValue(tagValue);
    setDescription(tagDescription ?? '');
  };

  const cancelEdit = () => {
    setEditingTagId(null);
    setCategory('source');
    setValue('');
    setDescription('');
  };

  const tagsByCategory = (cat: UtmCategory) => tags.filter((tag) => tag.category === cat);

  return (
    <NoMenuLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">태그 관리</h1>
        </div>

        <UtmManagementMenu />

        <div className="space-y-4">
          <div className="rounded-md border border-lm-border bg-white p-3 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              태그 입력
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="tag-category" className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  id="tag-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as UtmCategory)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {UTM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      utm_{cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tag-value" className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  태그 값 <span className="text-red-500">*</span>
                </label>
                <input
                  id="tag-value"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="태그 값 입력"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="tag-description" className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  설명 (선택)
                </label>
                <input
                  id="tag-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="태그 설명"
                  maxLength={500}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!value.trim()}
                className="flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faPlus} /> {editingTagId ? '태그 수정 저장' : '태그 저장'}
              </button>
              {editingTagId && (
                <button
                  onClick={cancelEdit}
                  className="rounded bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  수정 취소
                </button>
              )}
              {saveMsg && <p className="text-xs text-green-600">{saveMsg}</p>}
            </div>
          </div>

          <div className="rounded-md border border-lm-border bg-white p-3 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              저장된 태그
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {UTM_CATEGORIES.map((cat) => {
                const categoryTags = tagsByCategory(cat);
                return (
                  <div key={cat} className="rounded border border-lm-border p-2 dark:border-dm-border">
                    <h3 className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">utm_{cat}</h3>
                    {categoryTags.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">태그가 없습니다.</p>
                    ) : (
                      <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                        {categoryTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center justify-between rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800"
                          >
                            <div className="min-w-0">
                              <span className="block truncate font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                                {tag.value}
                              </span>
                              {tag.description && (
                                <span className="block truncate text-gray-500 dark:text-gray-400">{tag.description}</span>
                              )}
                            </div>
                            <div className="ml-2 flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(tag.id, tag.category, tag.value, tag.description)}
                                className="text-[11px] text-blue-600 hover:text-blue-700"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => {
                                  if (!window.confirm(`'${tag.value}' 태그를 삭제할까요?`)) {
                                    return;
                                  }

                                  if (editingTagId === tag.id) {
                                    cancelEdit();
                                  }

                                  void deleteTag(tag.id);
                                }}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </NoMenuLayout>
  );
};
