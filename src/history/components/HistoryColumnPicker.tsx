import { faTableColumns } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useT } from '../../i18n';
import { COLUMN_DEFS, type ColumnKey } from '../columns';

export const HistoryColumnPicker: FC<{
  visibleCols: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
}> = ({ visibleCols, onToggle }) => {
  const t = useT();

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded border border-lm-border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-dm-border dark:text-gray-300 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
        <FontAwesomeIcon icon={faTableColumns} />
        {t('history.columns.label')}
      </summary>
      <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border border-lm-border bg-white p-2 shadow-lg dark:border-dm-border dark:bg-dm-primary">
        {COLUMN_DEFS.map((col) => (
          <label
            key={col.key}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-(--light-text-color) hover:bg-gray-100 dark:text-(--dark-text-color) dark:hover:bg-gray-800"
          >
            <input
              type="checkbox"
              checked={visibleCols.has(col.key)}
              disabled={col.locked}
              onChange={() => onToggle(col.key)}
            />
            {col.labelKey ? t(col.labelKey) : col.label}
          </label>
        ))}
      </div>
    </details>
  );
};
