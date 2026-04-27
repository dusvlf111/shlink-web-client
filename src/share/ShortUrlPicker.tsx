import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ShlinkApiClient, ShlinkShortUrl } from '@shlinkio/shlink-js-sdk/api-contract';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

const RESULT_LIMIT = 8;
const DEBOUNCE_MS = 250;

const matchScore = (url: ShlinkShortUrl, term: string) => {
  if (!term) {
    return 1;
  }
  const haystack = `${url.shortCode} ${url.title ?? ''} ${url.longUrl}`.toLowerCase();
  return haystack.includes(term.toLowerCase()) ? 1 : 0;
};

export type ShortUrlPickerProps = {
  apiClient: ShlinkApiClient | null;
  selectedShortCode: string;
  onSelect: (selection: { shortCode: string; title?: string }) => void;
  onClear: () => void;
  inputId?: string;
};

export const ShortUrlPicker: FC<ShortUrlPickerProps> = ({
  apiClient,
  selectedShortCode,
  onSelect,
  onClear,
  inputId,
}) => {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ShlinkShortUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apiClient) {
      setResults([]);
      setError(t('share.manager.create.serverMissing'));
      return undefined;
    }
    setLoading(true);
    setError('');
    const handle = window.setTimeout(async () => {
      try {
        const list = await apiClient.listShortUrls({
          page: '1',
          itemsPerPage: RESULT_LIMIT,
          searchTerm: query.trim() || undefined,
        });
        setResults(list.data.filter((url) => matchScore(url, query) > 0));
      } catch (err) {
        setResults([]);
        const detail = err instanceof Error && err.message ? ` (${err.message})` : '';
        setError(`${t('share.manager.create.shortCode.error')}${detail}`);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [apiClient, query, t]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {selectedShortCode ? (
        <div className="flex items-center justify-between rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{t('share.manager.create.shortCode.selected')}</p>
            <p className="truncate font-mono text-sm">{selectedShortCode}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="ml-2 rounded p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
            aria-label={t('share.manager.create.shortCode.clear')}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t('share.manager.create.shortCode.placeholder')}
          className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
        />
      )}

      {open && !selectedShortCode && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded border border-lm-border bg-white shadow-lg dark:border-dm-border dark:bg-dm-primary">
          {loading && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{t('share.manager.create.shortCode.searching')}</p>
          )}
          {!loading && error && (
            <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{t('share.manager.create.shortCode.empty')}</p>
          )}
          {!loading && !error && results.map((url) => (
            <button
              key={url.shortCode}
              type="button"
              onClick={() => {
                onSelect({ shortCode: url.shortCode, title: url.title ?? undefined });
                setOpen(false);
              }}
              className="block w-full border-b border-lm-border/50 px-3 py-2 text-left text-sm hover:bg-lm-primary/40 dark:border-dm-border/50 dark:hover:bg-dm-main"
            >
              <p className="truncate font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                {url.title || url.shortCode}
              </p>
              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-mono">{url.shortCode}</span>
                <span className="mx-1">·</span>
                <span className="truncate">{url.longUrl}</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
