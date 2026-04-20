import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useState } from 'react';
import type { UtmTag } from './useUtmData';

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  tags: UtmTag[];
  onAddTag: (val: string) => Promise<void>;
  onDeleteTag: (tag: UtmTag) => Promise<void>;
  required?: boolean;
};

export const UtmFieldInput: FC<Props> = ({ label, value, onChange, tags, onAddTag, onDeleteTag, required }) => {
  const [showTags, setShowTags] = useState(false);
  const inputId = `utm-${label}`;
  const normalizedValue = value.trim().toLowerCase();

  const suggestedTags = tags
    .map((tag) => {
      const normalizedTag = tag.value.toLowerCase();
      let score = 2;

      if (!normalizedValue) {
        score = 0;
      } else if (normalizedTag.startsWith(normalizedValue)) {
        score = 0;
      } else if (normalizedTag.includes(normalizedValue)) {
        score = 1;
      }

      return { tag, score };
    })
    .sort((a, b) => a.score - b.score || a.tag.value.localeCompare(b.tag.value))
    .filter(({ score }) => !normalizedValue || score < 2)
    .map(({ tag }) => tag);

  const handleAddTag = async () => {
    if (!value.trim()) return;
    await onAddTag(value.trim());
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowTags(true)}
          onBlur={() => setTimeout(() => setShowTags(false), 150)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder={`${label} 입력 또는 태그 선택`}
        />
        <button
          type="button"
          onClick={handleAddTag}
          title="현재 값을 태그로 저장"
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>

      {showTags && suggestedTags.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {suggestedTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <button
                type="button"
                className="flex-1 text-left text-gray-800 dark:text-gray-200"
                onMouseDown={() => onChange(tag.value)}
              >
                <span className="block">{tag.value}</span>
                {!!tag.description && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{tag.description}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onDeleteTag(tag)}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
