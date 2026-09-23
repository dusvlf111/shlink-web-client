import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
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
  if (options.length === 0) {
    return null;
  }

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
        {options.map((option) => (
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
