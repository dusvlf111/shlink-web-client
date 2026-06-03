import {
  faChevronRight,
  faCircleInfo,
  faMagnifyingGlass,
  faTableColumns,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NoMenuLayout } from '../common/NoMenuLayout';
import type { MessageKey } from '../i18n';
import { useT } from '../i18n';
import {
  fetchShortUrlHistory,
  resolveHistoryAction,
  type ShortUrlHistoryAction,
  type ShortUrlHistoryRecord,
} from './shortUrlHistoryService';

const ALL_SERVERS = '__all__';

// Every column the table can show. Order here is the order they render in.
type ColumnKey =
  | 'datetime'
  | 'title'
  | 'shortUrl'
  | 'longUrl'
  | 'tags'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'
  | 'template'
  | 'server'
  | 'createdBy';

type ColumnDef = {
  key: ColumnKey;
  // Either a translated header (labelKey) or a literal one (label, for utm_*).
  labelKey?: MessageKey;
  label?: string;
  // The title column is always on so the row's detail trigger never disappears.
  locked?: boolean;
};

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'datetime', labelKey: 'history.col.datetime' },
  { key: 'title', labelKey: 'history.col.title', locked: true },
  { key: 'shortUrl', labelKey: 'history.col.shortUrl' },
  { key: 'longUrl', labelKey: 'history.col.longUrl' },
  { key: 'tags', labelKey: 'history.col.tags' },
  { key: 'utm_source', label: 'utm_source' },
  { key: 'utm_medium', label: 'utm_medium' },
  { key: 'utm_campaign', label: 'utm_campaign' },
  { key: 'utm_term', label: 'utm_term' },
  { key: 'utm_content', label: 'utm_content' },
  { key: 'template', labelKey: 'history.detail.template' },
  { key: 'server', labelKey: 'history.col.server' },
  { key: 'createdBy', labelKey: 'history.col.createdBy' },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'datetime',
  'title',
  'shortUrl',
  'tags',
  'server',
];

const COLUMNS_STORAGE_KEY = 'history.visibleColumns';

// Load the saved column selection, always keeping the locked title column.
// Falls back to the defaults on missing/corrupt storage.
const loadVisibleColumns = (): Set<ColumnKey> => {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((key): key is ColumnKey =>
          COLUMN_DEFS.some((col) => col.key === key),
        );
        if (valid.length > 0) {
          return new Set<ColumnKey>([...valid, 'title']);
        }
      }
    }
  } catch {
    // Ignore malformed storage and fall back to defaults.
  }
  return new Set(DEFAULT_VISIBLE_COLUMNS);
};

// Local-time YYYY-MM-DD key for a stored timestamp, used for date-range
// filtering with plain lexicographic comparison. '' for unparseable dates.
const toLocalDateKey = (raw: string): string => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const serverLabel = (record: ShortUrlHistoryRecord): string =>
  record.server_name?.trim() || record.server_id;

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

// The utm_* params present on a record, in display order. Empty values are
// dropped so callers can tell whether any UTM data exists at all.
const utmEntries = (
  record: ShortUrlHistoryRecord,
): ReadonlyArray<[string, string]> =>
  (
    [
      ['utm_source', record.utm_source],
      ['utm_medium', record.utm_medium],
      ['utm_campaign', record.utm_campaign],
      ['utm_term', record.utm_term],
      ['utm_content', record.utm_content],
    ] as ReadonlyArray<[string, string | undefined]>
  ).filter((entry): entry is [string, string] => !!entry[1]?.trim());

// Badge color per action: created=green, updated=amber, deleted=red.
const ACTION_BADGE_CLASS: Record<ShortUrlHistoryAction, string> = {
  created:
    'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  updated:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  deleted: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// Row background per action, kept very light so the table stays readable.
const ROW_BG_CLASS: Record<ShortUrlHistoryAction, string> = {
  created: 'bg-white dark:bg-dm-primary',
  updated: 'bg-amber-50 dark:bg-amber-900/15',
  deleted: 'bg-red-50 dark:bg-red-900/15',
};

const ActionBadge: FC<{ record: ShortUrlHistoryRecord }> = ({ record }) => {
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

// Lowercased, space-joined haystack of every searchable field on a record.
const searchHaystack = (record: ShortUrlHistoryRecord): string =>
  [
    record.title,
    record.short_url,
    record.short_code,
    record.long_url,
    record.server_name,
    record.server_id,
    record.utm_source,
    record.utm_medium,
    record.utm_campaign,
    record.utm_term,
    record.utm_content,
    creatorLabel(record),
    ...(record.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

// A pill-shaped toggle button used for the chip filters (action, server, tag,
// template). Sized for easy tapping. Highlighted blue when active.
const FilterChip: FC<{
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={
      active
        ? 'rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white'
        : 'rounded-full border border-lm-border bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-dm-border dark:bg-dm-main dark:text-gray-300 dark:hover:bg-gray-800'
    }
  >
    {children}
  </button>
);

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
const HistoryDetailModal: FC<{
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

const HistoryPageComp: FC = () => {
  const t = useT();
  const [records, setRecords] = useState<ShortUrlHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverFilter, setServerFilter] = useState<string>(ALL_SERVERS);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<
    'all' | ShortUrlHistoryAction
  >('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleCols, setVisibleCols] =
    useState<Set<ColumnKey>>(loadVisibleColumns);
  const [selected, setSelected] = useState<ShortUrlHistoryRecord | null>(null);

  // Persist column choices so the table layout sticks across visits.
  useEffect(() => {
    try {
      localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify([...visibleCols]),
      );
    } catch {
      // Storage may be unavailable (private mode); ignore.
    }
  }, [visibleCols]);

  const toggleColumn = (key: ColumnKey) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      next.add('title'); // title is locked on
      return next;
    });

  const orderedVisibleColumns = COLUMN_DEFS.filter((col) =>
    visibleCols.has(col.key),
  );

  // Servers that actually appear in the loaded history (not the registered
  // server list), so the filter only offers servers you have records for.
  const availableServers = useMemo(() => {
    const byId = new Map<string, string>();
    records.forEach((record) => {
      if (!byId.has(record.server_id)) {
        byId.set(record.server_id, serverLabel(record));
      }
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [records]);

  // Every distinct tag present across the loaded records, used as the chips of
  // the tag filter.
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    records.forEach((record) =>
      (record.tags ?? []).forEach((tag) => set.add(tag)),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Every distinct template name that produced one of the loaded records.
  const availableTemplates = useMemo(() => {
    const set = new Set<string>();
    records.forEach((record) => {
      const name = record.template_name?.trim();
      if (name) {
        set.add(name);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Client-side filtering: text search AND action AND tag AND template. A
  // record passes the tag/template filter when it matches at least one of the
  // selected chips of that group.
  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      if (q && !searchHaystack(record).includes(q)) {
        return false;
      }
      if (
        actionFilter !== 'all' &&
        resolveHistoryAction(record) !== actionFilter
      ) {
        return false;
      }
      if (selectedTags.length > 0) {
        const tags = record.tags ?? [];
        if (!selectedTags.some((tag) => tags.includes(tag))) {
          return false;
        }
      }
      if (selectedTemplates.length > 0) {
        const name = record.template_name?.trim() ?? '';
        if (!selectedTemplates.includes(name)) {
          return false;
        }
      }
      if (serverFilter !== ALL_SERVERS && record.server_id !== serverFilter) {
        return false;
      }
      if (dateFrom || dateTo) {
        const day = toLocalDateKey(record.created);
        if (dateFrom && day < dateFrom) {
          return false;
        }
        if (dateTo && day > dateTo) {
          return false;
        }
      }
      return true;
    });
  }, [
    records,
    query,
    actionFilter,
    selectedTags,
    selectedTemplates,
    serverFilter,
    dateFrom,
    dateTo,
  ]);

  const toggleInArray = (setter: typeof setSelectedTags, value: string) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const hasActiveFilters =
    query.trim() !== '' ||
    actionFilter !== 'all' ||
    selectedTags.length > 0 ||
    selectedTemplates.length > 0 ||
    serverFilter !== ALL_SERVERS ||
    dateFrom !== '' ||
    dateTo !== '';

  const resetFilters = () => {
    setQuery('');
    setActionFilter('all');
    setSelectedTags([]);
    setSelectedTemplates([]);
    setServerFilter(ALL_SERVERS);
    setDateFrom('');
    setDateTo('');
  };

  // Render one table cell for a given column key.
  const renderCell = (
    key: ColumnKey,
    record: ShortUrlHistoryRecord,
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
              onClick={() => setSelected(record)}
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

  // Load every record once; server filtering happens client-side so the chips
  // can reflect the servers present in the history itself.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchShortUrlHistory();
      setRecords(result);
    } finally {
      setLoading(false);
    }
  }, []);

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
        </div>

        {!loading && records.length > 0 && (
          <div className="mb-4 space-y-3">
            {/* 검색 */}
            <div className="relative w-full sm:max-w-md">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
              />
              <input
                id="history-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('history.search.placeholder')}
                aria-label={t('history.search.label')}
                className="w-full rounded-lg border border-lm-border py-2 pl-9 pr-3 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
              />
            </div>

            {/* 구분 필터 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('history.col.action')}
              </span>
              <FilterChip
                active={actionFilter === 'all'}
                onClick={() => setActionFilter('all')}
              >
                {t('history.filter.action.all')}
              </FilterChip>
              <FilterChip
                active={actionFilter === 'created'}
                onClick={() => setActionFilter('created')}
              >
                {t('history.action.created')}
              </FilterChip>
              <FilterChip
                active={actionFilter === 'updated'}
                onClick={() => setActionFilter('updated')}
              >
                {t('history.action.updated')}
              </FilterChip>
              <FilterChip
                active={actionFilter === 'deleted'}
                onClick={() => setActionFilter('deleted')}
              >
                {t('history.action.deleted')}
              </FilterChip>
            </div>

            {/* 서버 필터 (히스토리에 존재하는 서버만) */}
            {availableServers.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t('history.filter.label')}
                </span>
                <FilterChip
                  active={serverFilter === ALL_SERVERS}
                  onClick={() => setServerFilter(ALL_SERVERS)}
                >
                  {t('history.filter.allServers')}
                </FilterChip>
                {availableServers.map((server) => (
                  <FilterChip
                    key={server.id}
                    active={serverFilter === server.id}
                    onClick={() => setServerFilter(server.id)}
                  >
                    {server.name}
                  </FilterChip>
                ))}
              </div>
            )}

            {/* 태그 필터 */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t('history.filter.tags.label')}
                </span>
                {availableTags.map((tag) => (
                  <FilterChip
                    key={tag}
                    active={selectedTags.includes(tag)}
                    onClick={() => toggleInArray(setSelectedTags, tag)}
                  >
                    {tag}
                  </FilterChip>
                ))}
              </div>
            )}

            {/* 템플릿 필터 */}
            {availableTemplates.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t('history.filter.template.label')}
                </span>
                {availableTemplates.map((name) => (
                  <FilterChip
                    key={name}
                    active={selectedTemplates.includes(name)}
                    onClick={() => toggleInArray(setSelectedTemplates, name)}
                  >
                    {name}
                  </FilterChip>
                ))}
              </div>
            )}

            {/* 기간 필터 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('history.filter.dateLabel')}
              </span>
              <input
                type="date"
                aria-label={t('history.filter.dateFrom')}
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded border border-lm-border px-2 py-1 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="date"
                aria-label={t('history.filter.dateTo')}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded border border-lm-border px-2 py-1 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
              />
            </div>

            {/* 행 색상 범례 + 안내 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-lm-border pt-3 dark:border-dm-border">
              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-medium">{t('history.legend.label')}</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded border border-lm-border bg-white dark:border-dm-border dark:bg-dm-primary" />
                  {t('history.action.created')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-amber-100 dark:bg-amber-900/40" />
                  {t('history.action.updated')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-red-100 dark:bg-red-900/40" />
                  {t('history.action.deleted')}
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-300">
                <FontAwesomeIcon icon={faCircleInfo} />
                {t('history.hint.titleClick')}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('history.resultCount', {
                    count: filteredRecords.length,
                  })}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded border border-lm-border px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100 dark:border-dm-border dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t('history.filter.reset')}
                  </button>
                )}
              </div>

              {/* 열 설정 (표시할 컬럼 선택) */}
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
                        onChange={() => toggleColumn(col.key)}
                      />
                      {col.labelKey ? t(col.labelKey) : col.label}
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            {t('history.loading')}
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {t('history.empty')}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {t('history.search.empty')}
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-lm-border dark:border-dm-border">
            <table className="w-full text-sm">
              <thead className="bg-lm-primary/40 dark:bg-dm-main">
                <tr>
                  {orderedVisibleColumns.map((col) => (
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
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    data-testid={`history-row-${resolveHistoryAction(record)}`}
                    className={`align-middle transition-colors ${ROW_BG_CLASS[resolveHistoryAction(record)]}`}
                  >
                    {orderedVisibleColumns.map((col) =>
                      renderCell(col.key, record),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <HistoryDetailModal
          record={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </NoMenuLayout>
  );
};

export const HistoryPage = HistoryPageComp;
