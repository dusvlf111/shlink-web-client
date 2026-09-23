import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useT } from '../../i18n';
import type { ColumnDef, ColumnKey } from '../columns';
import {
  creatorLabel,
  formatCreatedAt,
  serverLabel,
} from '../historyFormatting';
import {
  resolveHistoryAction,
  type ShortUrlHistoryRecord,
} from '../shortUrlHistoryService';
import { ROW_BG_CLASS, UrlCell } from './HistoryCells';

// Observes the sentinel row at the bottom of the table and calls onLoadMore
// once it enters the viewport, driving the infinite scroll. Stops observing
// while a fetch is already in flight or there is nothing left to load.
const useLoadMoreSentinel = (
  onLoadMore: () => void,
  { enabled }: { enabled: boolean },
) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const node = sentinelRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore]);

  return sentinelRef;
};

// Render one table cell for a given column key.
const renderCell = (
  key: ColumnKey,
  record: ShortUrlHistoryRecord,
  t: ReturnType<typeof useT>,
  onOpenDetail: (record: ShortUrlHistoryRecord) => void,
): ReactNode => {
  switch (key) {
    case 'datetime':
      return (
        <td
          key={key}
          className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300"
        >
          {formatCreatedAt(record.created)}
        </td>
      );
    case 'title':
      return (
        <td key={key} className="max-w-[280px] px-3 py-2.5">
          <button
            type="button"
            onClick={() => onOpenDetail(record)}
            title={t('history.modal.openHint')}
            className="group flex max-w-full items-center gap-1.5 text-left font-medium text-(--light-text-color) underline-offset-2 hover:text-lm-main hover:underline dark:text-(--dark-text-color) dark:hover:text-dm-main"
          >
            <span className="truncate">
              {record.title?.trim() || t('history.detail.noTitle')}
            </span>
            <FontAwesomeIcon
              icon={faChevronRight}
              aria-hidden
              className="shrink-0 text-[10px] text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-lm-main"
            />
          </button>
        </td>
      );
    case 'shortUrl':
      return (
        <td key={key} className="max-w-[300px] px-3 py-2.5">
          <UrlCell
            url={record.short_url}
            className="block overflow-hidden text-ellipsis whitespace-nowrap text-blue-600 dark:text-blue-400"
          />
        </td>
      );
    case 'longUrl':
      return (
        <td key={key} className="max-w-[320px] px-3 py-2.5">
          <UrlCell
            url={record.long_url}
            className="block overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 dark:text-gray-300"
          />
        </td>
      );
    case 'tags':
      return (
        <td key={key} className="max-w-[200px] px-3 py-2.5">
          {record.tags && record.tags.length > 0 ? (
            <span
              className="block overflow-hidden text-ellipsis whitespace-nowrap"
              title={record.tags.join(', ')}
            >
              {record.tags.map((tag) => (
                <span
                  key={tag}
                  className="mr-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  {tag}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      );
    case 'utm_source':
    case 'utm_medium':
    case 'utm_campaign':
    case 'utm_term':
    case 'utm_content': {
      const value = record[key]?.trim();
      return (
        <td
          key={key}
          className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2.5 text-[11px] text-blue-700 dark:text-blue-300"
          title={value}
        >
          {value || <span className="text-gray-400">-</span>}
        </td>
      );
    }
    case 'template':
      return (
        <td
          key={key}
          className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2.5 text-(--light-text-color) dark:text-(--dark-text-color)"
          title={record.template_name}
        >
          {record.template_name?.trim() || (
            <span className="text-gray-400">-</span>
          )}
        </td>
      );
    case 'server':
      return (
        <td
          key={key}
          className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2.5 text-(--light-text-color) dark:text-(--dark-text-color)"
          title={serverLabel(record)}
        >
          {serverLabel(record)}
        </td>
      );
    case 'createdBy':
      return (
        <td
          key={key}
          className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300"
          title={creatorLabel(record)}
        >
          {creatorLabel(record)}
        </td>
      );
    default:
      return null;
  }
};

export const HistoryTable: FC<{
  records: ShortUrlHistoryRecord[];
  columns: ColumnDef[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelectRecord: (record: ShortUrlHistoryRecord) => void;
}> = ({
  records,
  columns,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelectRecord,
}) => {
  const t = useT();
  const sentinelRef = useLoadMoreSentinel(onLoadMore, {
    enabled: hasMore && !loadingMore,
  });

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-lm-border dark:border-dm-border">
      <table className="w-full text-sm">
        <thead className="bg-lm-primary/40 dark:bg-dm-main">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300"
              >
                {col.labelKey ? t(col.labelKey) : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-lm-border dark:divide-dm-border">
          {records.map((record) => (
            <tr
              key={record.id}
              data-testid={`history-row-${resolveHistoryAction(record)}`}
              className={`align-middle transition-colors ${ROW_BG_CLASS[resolveHistoryAction(record)]}`}
            >
              {columns.map((col) =>
                renderCell(col.key, record, t, onSelectRecord),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {(hasMore || loadingMore) && (
        <div
          ref={sentinelRef}
          className="py-4 text-center text-xs text-gray-400"
        >
          {t('history.loadingMore')}
        </div>
      )}
    </div>
  );
};
