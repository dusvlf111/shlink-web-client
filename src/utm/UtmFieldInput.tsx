import type { FC } from 'react';
import { useMemo, useState } from 'react';
import type { UtmTag } from './useUtmData';

type Props = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  tags: UtmTag[];
  required?: boolean;
};

export const UtmFieldInput: FC<Props> = ({ label, value, onChange, tags, required }) => {
  const inputId = `utm-${label}`;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const normalizedValue = value.trim().toLowerCase();

  const suggestedTags = useMemo(() => {
    const valueMap = new Map<string, { value: string; description?: string }>();

    tags.forEach((tag) => {
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

    const uniqueValues = [...valueMap.values()];
    const filtered = uniqueValues.filter(({ value: tagValue }) => {
      if (!normalizedValue) {
        return true;
      }

      const normalizedTagValue = tagValue.toLowerCase();
      return normalizedTagValue.includes(normalizedValue) || normalizedTagValue.startsWith(normalizedValue);
    });

    return filtered.sort((a, b) => a.value.localeCompare(b.value)).slice(0, 8);
  }, [tags, normalizedValue]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
        autoComplete="off"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        placeholder={`${label} 입력`}
      />

      {showSuggestions && suggestedTags.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {suggestedTags.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onMouseDown={() => onChange(tag.value)}
              className="block w-full px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <span className="block">{tag.value}</span>
              {tag.description && (
                <span className="block text-xs text-gray-500 dark:text-gray-400">{tag.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
