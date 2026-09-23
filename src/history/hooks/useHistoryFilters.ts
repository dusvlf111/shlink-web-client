import { useEffect, useMemo, useState } from 'react';
import type {
  HistoryFilters,
  ShortUrlHistoryAction,
} from '../shortUrlHistoryService';

export const ALL_SERVERS = '__all__';

// Debounce delay for the free-text search input, so every keystroke does not
// trigger a new server request.
const QUERY_DEBOUNCE_MS = 300;

// Owns every history filter's UI state and derives the `HistoryFilters` value
// sent to the service. The search query is debounced; every other filter
// applies immediately.
export const useHistoryFilters = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<
    'all' | ShortUrlHistoryAction
  >('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [serverFilter, setServerFilter] = useState<string>(ALL_SERVERS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query.trim()),
      QUERY_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag],
    );

  const toggleTemplate = (name: string) =>
    setSelectedTemplates((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name],
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

  const filters = useMemo<HistoryFilters>(
    () => ({
      serverId: serverFilter !== ALL_SERVERS ? serverFilter : undefined,
      query: debouncedQuery || undefined,
      action: actionFilter,
      tags: selectedTags,
      templates: selectedTemplates,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [
      serverFilter,
      debouncedQuery,
      actionFilter,
      selectedTags,
      selectedTemplates,
      dateFrom,
      dateTo,
    ],
  );

  return {
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
  };
};
