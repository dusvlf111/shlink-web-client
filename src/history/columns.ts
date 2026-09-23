import { useEffect, useState } from 'react';
import type { MessageKey } from '../i18n';

// Every column the table can show. Order here is the order they render in.
export type ColumnKey =
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

export type ColumnDef = {
  key: ColumnKey;
  // Either a translated header (labelKey) or a literal one (label, for utm_*).
  labelKey?: MessageKey;
  label?: string;
  // The title column is always on so the row's detail trigger never disappears.
  locked?: boolean;
};

export const COLUMN_DEFS: ColumnDef[] = [
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

// Owns the visible-columns selection and persists it to localStorage so the
// table layout sticks across visits.
export const useVisibleColumns = () => {
  const [visibleCols, setVisibleCols] =
    useState<Set<ColumnKey>>(loadVisibleColumns);

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

  return { visibleCols, toggleColumn, orderedVisibleColumns };
};
