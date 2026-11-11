import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useState } from 'react';
import { useT } from '../../i18n';
import { FilterChip } from './FilterChip';

// A collapsible chip-multiselect filter (tags, templates, ...), collapsed by
// default behind a <details>/<summary> disclosure so a long option list does
// not permanently take up space in the filter bar. Mirrors the column-picker
// disclosure pattern used elsewhere on this page: <details> keeps the panel
// open across inner clicks (needed for toggling chips), unlike a menu widget
// that closes itself on item click.
export const HistoryFilterDropdown: FC<{
  label: string;
  icon: IconDefinition;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ label, icon, options, selected, onToggle }) => {
  const t = useT();
  const [query, setQuery] = useState('');

  if (options.length === 0) {
    return null;
  }

  const q = query.trim().toLowerCase();
  const filteredOptions = q
    ? options.filter((option) => option.toLowerCase().includes(q))
    : options;

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded border border-lm-border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-dm-border dark:text-gray-300 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
        <FontAwesomeIcon icon={icon} />
        {label}
        {selected.length > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-medium text-white">
            {selected.length}
          </span>
        )}
      </summary>
      {/* `flex` is a display utility, so it must stay conditional on the group
          being open: an always-on `flex` class would outrank the browser's
          native `details:not([open]) > *` hiding rule (a class selector beats
          a plain-element one) and the panel would never actually collapse. */}
      <div className="absolute left-0 z-10 mt-1 hidden w-64 max-w-[80vw] flex-wrap gap-1.5 rounded-lg border border-lm-border bg-white p-2 shadow-lg group-open:flex dark:border-dm-border dark:bg-dm-primary">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('history.filter.search.placeholder')}
          aria-label={t('history.filter.search.placeholder')}
          className="w-full rounded border border-lm-border px-2 py-1 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
        />
        {filteredOptions.length === 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('history.search.empty')}
          </span>
        )}
        {filteredOptions.map((option) => (
          <FilterChip
            key={option}
            active={selected.includes(option)}
            onClick={() => onToggle(option)}
          >
            {option}
          </FilterChip>
        ))}
      </div>
    </details>
  );
};
