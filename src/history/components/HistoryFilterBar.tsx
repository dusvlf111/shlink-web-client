import {
  faCircleInfo,
  faLayerGroup,
  faMagnifyingGlass,
  faTag,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useT } from '../../i18n';
import type { ColumnKey } from '../columns';
import { ALL_SERVERS } from '../hooks/useHistoryFilters';
import type {
  HistoryFacets,
  ShortUrlHistoryAction,
} from '../shortUrlHistoryService';
import { FilterChip } from './FilterChip';
import { HistoryColumnPicker } from './HistoryColumnPicker';
import { HistoryFilterDropdown } from './HistoryFilterDropdown';

export const HistoryFilterBar: FC<{
  facets: HistoryFacets;
  resultCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  actionFilter: 'all' | ShortUrlHistoryAction;
  onActionFilterChange: (value: 'all' | ShortUrlHistoryAction) => void;
  serverFilter: string;
  onServerFilterChange: (value: string) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  selectedTemplates: string[];
  onToggleTemplate: (name: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  visibleCols: Set<ColumnKey>;
  onToggleColumn: (key: ColumnKey) => void;
}> = ({
  facets,
  resultCount,
  query,
  onQueryChange,
  actionFilter,
  onActionFilterChange,
  serverFilter,
  onServerFilterChange,
  selectedTags,
  onToggleTag,
  selectedTemplates,
  onToggleTemplate,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  hasActiveFilters,
  onResetFilters,
  visibleCols,
  onToggleColumn,
}) => {
  const t = useT();

  return (
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
          onChange={(e) => onQueryChange(e.target.value)}
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
          onClick={() => onActionFilterChange('all')}
        >
          {t('history.filter.action.all')}
        </FilterChip>
        <FilterChip
          active={actionFilter === 'created'}
          onClick={() => onActionFilterChange('created')}
        >
          {t('history.action.created')}
        </FilterChip>
        <FilterChip
          active={actionFilter === 'updated'}
          onClick={() => onActionFilterChange('updated')}
        >
          {t('history.action.updated')}
        </FilterChip>
        <FilterChip
          active={actionFilter === 'deleted'}
          onClick={() => onActionFilterChange('deleted')}
        >
          {t('history.action.deleted')}
        </FilterChip>
      </div>

      {/* 서버 필터 (히스토리에 존재하는 서버만) */}
      {facets.servers.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('history.filter.label')}
          </span>
          <FilterChip
            active={serverFilter === ALL_SERVERS}
            onClick={() => onServerFilterChange(ALL_SERVERS)}
          >
            {t('history.filter.allServers')}
          </FilterChip>
          {facets.servers.map((server) => (
            <FilterChip
              key={server.id}
              active={serverFilter === server.id}
              onClick={() => onServerFilterChange(server.id)}
            >
              {server.name}
            </FilterChip>
          ))}
        </div>
      )}

      {/* 태그/템플릿 필터: 값이 많아질 수 있어 드롭다운 안에 접어서 보여준다 */}
      <div className="flex flex-wrap items-center gap-2">
        <HistoryFilterDropdown
          label={t('history.filter.tags.label')}
          icon={faTag}
          options={facets.tags}
          selected={selectedTags}
          onToggle={onToggleTag}
        />
        <HistoryFilterDropdown
          label={t('history.filter.template.label')}
          icon={faLayerGroup}
          options={facets.templates}
          selected={selectedTemplates}
          onToggle={onToggleTemplate}
        />
      </div>

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
          onChange={(e) => onDateFromChange(e.target.value)}
          className="rounded border border-lm-border px-2 py-1 text-xs focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
        />
        <span className="text-xs text-gray-400">~</span>
        <input
          type="date"
          aria-label={t('history.filter.dateTo')}
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateToChange(e.target.value)}
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
            {t('history.resultCount', { count: resultCount })}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded border border-lm-border px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100 dark:border-dm-border dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('history.filter.reset')}
            </button>
          )}
        </div>

        <HistoryColumnPicker
          visibleCols={visibleCols}
          onToggle={onToggleColumn}
        />
      </div>
    </div>
  );
};
