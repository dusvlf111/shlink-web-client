import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC, ReactNode } from 'react';
import { useEffect } from 'react';
import { useT } from '../../i18n';
import {
  creatorLabel,
  formatCreatedAt,
  serverLabel,
  utmEntries,
} from '../historyFormatting';
import {
  resolveHistoryAction,
  type ShortUrlHistoryRecord,
} from '../shortUrlHistoryService';
import { ActionBadge, UrlCell } from './HistoryCells';

const TagList: FC<{ tags: string[] }> = ({ tags }) => (
  <span className="flex flex-wrap gap-1">
    {tags.map((tag) => (
      <span
        key={tag}
        className="inline-block rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      >
        {tag}
      </span>
    ))}
  </span>
);

// One label/value row inside the detail modal.
const DetailRow: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div className="grid grid-cols-[88px_1fr] gap-3 sm:grid-cols-[110px_1fr]">
    <dt className="pt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
      {label}
    </dt>
    <dd className="min-w-0 break-words text-(--light-text-color) dark:text-(--dark-text-color)">
      {children}
    </dd>
  </div>
);

// Full-detail modal for a single history record. Shows every stored field so
// the user can inspect exactly how a short URL was configured. Closes on
// backdrop click or the Escape key.
export const HistoryDetailModal: FC<{
  record: ShortUrlHistoryRecord;
  onClose: () => void;
}> = ({ record, onClose }) => {
  const t = useT();
  const utm = utmEntries(record);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dash = <span className="text-gray-400">-</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop is a real button so the click-to-close is keyboard/SR
          accessible without slapping handlers on a non-interactive div. */}
      <button
        type="button"
        aria-label={t('history.modal.close')}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
      />
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-dm-primary"
        role="dialog"
        aria-modal="true"
        aria-label={t('history.modal.title')}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
            {t('history.modal.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('history.modal.close')}
            className="shrink-0 rounded px-2 py-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <DetailRow label={t('history.col.action')}>
            <ActionBadge record={record} />
          </DetailRow>
          <DetailRow label={t('history.col.title')}>
            {record.title?.trim() || dash}
          </DetailRow>
          <DetailRow label={t('history.col.shortUrl')}>
            <UrlCell
              url={record.short_url}
              className="block break-all text-blue-600 dark:text-blue-400"
            />
          </DetailRow>
          <DetailRow label={t('history.detail.shortCode')}>
            {record.short_code?.trim() || dash}
          </DetailRow>
          <DetailRow label={t('history.col.longUrl')}>
            <UrlCell
              url={record.long_url}
              className="block break-all text-gray-600 dark:text-gray-300"
            />
          </DetailRow>
          <DetailRow label={t('history.col.tags')}>
            {record.tags && record.tags.length > 0 ? (
              <TagList tags={record.tags} />
            ) : (
              dash
            )}
          </DetailRow>
          <DetailRow label={t('history.col.utm')}>
            {utm.length > 0 ? (
              <div className="space-y-0.5">
                {utm.map(([key, value]) => (
                  <div key={key} className="text-[13px]">
                    <span className="text-gray-500 dark:text-gray-400">
                      {key}
                    </span>
                    <span className="mx-1 text-gray-400">=</span>
                    <span className="break-all text-blue-700 dark:text-blue-300">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              dash
            )}
          </DetailRow>
          <DetailRow label={t('history.detail.template')}>
            {record.template_name?.trim() || dash}
          </DetailRow>
          <DetailRow label={t('history.col.server')}>
            {serverLabel(record)}
          </DetailRow>
          <DetailRow label={t('history.col.createdBy')}>
            {creatorLabel(record)}
          </DetailRow>
          <DetailRow
            label={t(
              resolveHistoryAction(record) === 'deleted'
                ? 'history.detail.deletedAt'
                : resolveHistoryAction(record) === 'updated'
                  ? 'history.detail.updatedAt'
                  : 'history.col.createdAt',
            )}
          >
            {formatCreatedAt(record.created)}
          </DetailRow>
        </dl>
      </div>
    </div>
  );
};
