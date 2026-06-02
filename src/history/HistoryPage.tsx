import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { useT } from '../i18n';
import { useServers } from '../servers/reducers/servers';
import {
  fetchShortUrlHistory,
  resolveHistoryAction,
  type ShortUrlHistoryRecord,
} from './shortUrlHistoryService';

const ALL_SERVERS = '__all__';

// Render the created date in a human-readable local format. Falls back to the
// raw string if the value is not a parseable date.
const formatCreatedAt = (raw: string): string => {
  if (!raw) {
    return '-';
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
};

// Display name for the creator: prefer the expanded user's name, fall back to
// their email, then to the raw relation id.
const creatorLabel = (record: ShortUrlHistoryRecord): string => {
  const user = record.expand?.created_by;
  return user?.name?.trim() || user?.email?.trim() || record.created_by || '-';
};

// Only http(s) URLs may be rendered as clickable links. Anything else
// (e.g. a `javascript:` URL injected into a stored record) is shown as plain
// text to prevent XSS via the href.
const HTTP_URL_PATTERN = /^https?:\/\//i;

const safeLinkHref = (url: string): string | undefined =>
  HTTP_URL_PATTERN.test(url) ? url : undefined;

const UrlCell: FC<{ url: string; className: string }> = ({
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

const UtmCell: FC<{ record: ShortUrlHistoryRecord }> = ({ record }) => {
  const parts = [
    record.utm_source && `source=${record.utm_source}`,
    record.utm_medium && `medium=${record.utm_medium}`,
    record.utm_campaign && `campaign=${record.utm_campaign}`,
    record.utm_term && `term=${record.utm_term}`,
    record.utm_content && `content=${record.utm_content}`,
  ].filter(Boolean) as string[];

  if (parts.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span
      className="block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-blue-700 dark:text-blue-300"
      title={parts.join(' · ')}
    >
      {parts.join(' · ')}
    </span>
  );
};

const HistoryPageComp: FC = () => {
  const t = useT();
  const { servers } = useServers();
  const [records, setRecords] = useState<ShortUrlHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverFilter, setServerFilter] = useState<string>(ALL_SERVERS);

  const serverList = useMemo(() => Object.values(servers), [servers]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchShortUrlHistory(
        serverFilter === ALL_SERVERS ? {} : { serverId: serverFilter },
      );
      setRecords(result);
    } finally {
      setLoading(false);
    }
  }, [serverFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <NoMenuLayout>
      <div className="w-full">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
              {t('history.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('history.subtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="history-server-filter"
              className="text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t('history.filter.label')}
            </label>
            <select
              id="history-server-filter"
              aria-label={t('history.filter.label')}
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
            >
              <option value={ALL_SERVERS}>
                {t('history.filter.allServers')}
              </option>
              {serverList.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            {t('history.loading')}
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {t('history.empty')}
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-lm-border dark:border-dm-border">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-lm-primary/40 dark:bg-dm-main">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.action')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.server')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.shortUrl')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.longUrl')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.title')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.tags')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.utm')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.createdBy')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                    {t('history.col.createdAt')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lm-border dark:divide-dm-border">
                {records.map((record) => {
                  const action = resolveHistoryAction(record);

                  return (
                    <tr
                      key={record.id}
                      className="bg-white align-middle dark:bg-dm-primary"
                    >
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          data-testid={`history-action-${action}`}
                          className={
                            action === 'deleted'
                              ? 'inline-block whitespace-nowrap rounded bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'inline-block whitespace-nowrap rounded bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          }
                        >
                          {t(`history.action.${action}`)}
                        </span>
                      </td>
                      <td
                        className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-(--light-text-color) dark:text-(--dark-text-color)"
                        title={record.server_name?.trim() || record.server_id}
                      >
                        {record.server_name?.trim() || record.server_id}
                      </td>
                      <td className="max-w-[260px] px-3 py-2">
                        <UrlCell
                          url={record.short_url}
                          className="block overflow-hidden text-ellipsis whitespace-nowrap text-blue-600 dark:text-blue-400"
                        />
                      </td>
                      <td className="max-w-[360px] px-3 py-2">
                        <UrlCell
                          url={record.long_url}
                          className="block overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 dark:text-gray-300"
                        />
                      </td>
                      <td
                        className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-(--light-text-color) dark:text-(--dark-text-color)"
                        title={record.title?.trim() || ''}
                      >
                        {record.title?.trim() || '-'}
                      </td>
                      <td className="max-w-[180px] px-3 py-2">
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
                      <td className="px-3 py-2">
                        <UtmCell record={record} />
                      </td>
                      <td
                        className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300"
                        title={creatorLabel(record)}
                      >
                        {creatorLabel(record)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                        {formatCreatedAt(record.created)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </NoMenuLayout>
  );
};

export const HistoryPage = HistoryPageComp;
