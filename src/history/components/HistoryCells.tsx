import type { FC } from 'react';
import { useT } from '../../i18n';
import { safeLinkHref } from '../historyFormatting';
import {
  resolveHistoryAction,
  type ShortUrlHistoryRecord,
} from '../shortUrlHistoryService';

export const UrlCell: FC<{ url: string; className: string }> = ({
  url,
  className,
}) => {
  const href = safeLinkHref(url);
  if (!href) {
    return (
      <span className={`block ${className}`} title={url}>
        {url}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={url}
      className={`${className} hover:underline`}
    >
      {url}
    </a>
  );
};

// Badge color per action: created=green, updated=amber, deleted=red.
const ACTION_BADGE_CLASS: Record<string, string> = {
  created:
    'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  updated:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  deleted: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// Row background per action, kept very light so the table stays readable.
export const ROW_BG_CLASS: Record<string, string> = {
  created: 'bg-white dark:bg-dm-primary',
  updated: 'bg-amber-50 dark:bg-amber-900/15',
  deleted: 'bg-red-50 dark:bg-red-900/15',
};

export const ActionBadge: FC<{ record: ShortUrlHistoryRecord }> = ({
  record,
}) => {
  const t = useT();
  const action = resolveHistoryAction(record);
  return (
    <span
      data-testid={`history-action-${action}`}
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${ACTION_BADGE_CLASS[action]}`}
    >
      {t(`history.action.${action}`)}
    </span>
  );
};
