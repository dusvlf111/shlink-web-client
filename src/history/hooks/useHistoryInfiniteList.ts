import { useEffect, useRef, useState } from 'react';
import {
  fetchShortUrlHistoryPage,
  type HistoryFilters,
  type ShortUrlHistoryRecord,
} from '../shortUrlHistoryService';

const PER_PAGE = 30;

// Loads the history list page by page, resetting back to page 1 whenever the
// filters change, and appending pages as `loadMore` is called (driven by the
// table's scroll sentinel). A request token discards any response that
// arrives after a newer request has already started, so switching filters
// quickly never lets a stale page clobber the current one.
export const useHistoryInfiniteList = (filters: HistoryFilters) => {
  const [records, setRecords] = useState<ShortUrlHistoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestToken = useRef(0);

  // Reload from page 1 whenever the filters change.
  useEffect(() => {
    const token = ++requestToken.current;
    setLoading(true);
    setRecords([]);
    setPage(1);
    setTotalPages(0);
    setTotalItems(0);

    void fetchShortUrlHistoryPage(1, PER_PAGE, filters).then((result) => {
      if (token !== requestToken.current) {
        return;
      }
      setRecords(result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
      setLoading(false);
    });
    // `filters` is memoized by useHistoryFilters, so this only re-runs when a
    // filter value actually changes.
  }, [filters]);

  const hasMore = page < totalPages;

  const loadMore = () => {
    if (loadingMore || !hasMore) {
      return;
    }
    const token = requestToken.current;
    const nextPage = page + 1;
    setLoadingMore(true);

    void fetchShortUrlHistoryPage(nextPage, PER_PAGE, filters).then(
      (result) => {
        if (token !== requestToken.current) {
          return;
        }
        setRecords((prev) => [...prev, ...result.items]);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalItems);
        setLoadingMore(false);
      },
    );
  };

  return { records, totalItems, loading, loadingMore, hasMore, loadMore };
};
