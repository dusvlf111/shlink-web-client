import type { FC } from 'react';
import { useState } from 'react';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { useT } from '../i18n';
import { useVisibleColumns } from './columns';
import { HistoryDetailModal } from './components/HistoryDetailModal';
import { HistoryFilterBar } from './components/HistoryFilterBar';
import { HistoryTable } from './components/HistoryTable';
import { useHistoryFacets } from './hooks/useHistoryFacets';
import { useHistoryFilters } from './hooks/useHistoryFilters';
import { useHistoryInfiniteList } from './hooks/useHistoryInfiniteList';
import type { ShortUrlHistoryRecord } from './shortUrlHistoryService';

const HistoryPageComp: FC = () => {
  const t = useT();
  const [selected, setSelected] = useState<ShortUrlHistoryRecord | null>(null);
  const { visibleCols, toggleColumn, orderedVisibleColumns } =
    useVisibleColumns();

  const {
    filters,
    query,
    setQuery,
    actionFilter,
    setActionFilter,
    selectedTags,
    toggleTag,
    selectedTemplates,
    toggleTemplate,
    serverFilter,
    setServerFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    hasActiveFilters,
    resetFilters,
  } = useHistoryFilters();

  const facets = useHistoryFacets(filters.serverId);
  const { records, totalItems, loading, loadingMore, hasMore, loadMore } =
    useHistoryInfiniteList(filters);

  // A server is worth showing filters for once at least one record has ever
  // been seen for it; `facets.servers` (independent of pagination) is what
  // tells us that, not the currently loaded page.
  const hasAnyHistory = facets.servers.length > 0 || records.length > 0;

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

        {!loading && hasAnyHistory && (
          <HistoryFilterBar
            facets={facets}
            resultCount={totalItems}
            query={query}
            onQueryChange={setQuery}
            actionFilter={actionFilter}
            onActionFilterChange={setActionFilter}
            serverFilter={serverFilter}
            onServerFilterChange={setServerFilter}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            selectedTemplates={selectedTemplates}
            onToggleTemplate={toggleTemplate}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
            visibleCols={visibleCols}
            onToggleColumn={toggleColumn}
          />
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            {t('history.loading')}
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {hasActiveFilters ? t('history.search.empty') : t('history.empty')}
          </div>
        ) : (
          <HistoryTable
            records={records}
            columns={orderedVisibleColumns}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            onSelectRecord={setSelected}
          />
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
