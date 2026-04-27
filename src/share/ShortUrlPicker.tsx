import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ShlinkApiClient, ShlinkShortUrl } from '@shlinkio/shlink-js-sdk/api-contract';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

const RESULT_LIMIT = 8;
// Shlink's `searchTerm` only checks longUrl + title + tags, so users typing a
// shortCode like "4ONyC" or a partial URL like "letscareer-team" might get
// nothing back. Pull a wider page once and filter client-side instead.
const FETCH_PAGE_SIZE = 200;
const FETCH_DEBOUNCE_MS = 0;

const tokenize = (input: string) => input.toLowerCase().split(/\s+/).filter(Boolean);

const matchesAllTokens = (url: ShlinkShortUrl, tokens: string[]) => {
  if (tokens.length === 0) return true;
  const tags = (url.tags ?? []).join(' ');
  const haystack = `${url.shortCode} ${url.title ?? ''} ${url.longUrl ?? ''} ${tags}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
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
  const [allShortUrls, setAllShortUrls] = useState<ShlinkShortUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch a single wide page when the apiClient is ready; we then filter
  // client-side as the user types so shortCode and partial-URL searches work.
  useEffect(() => {
    if (!apiClient) {
      setAllShortUrls([]);
      setError(t('share.manager.create.serverMissing'));
      return undefined;
    }
    setLoading(true);
    setError('');
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const list = await apiClient.listShortUrls({
          page: '1',
          itemsPerPage: FETCH_PAGE_SIZE,
        });
        if (!cancelled) {
          setAllShortUrls(list.data);
        }
      } catch (err) {
        if (!cancelled) {
          setAllShortUrls([]);
          const detail = err instanceof Error && err.message ? ` (${err.message})` : '';
          setError(`${t('share.manager.create.shortCode.error')}${detail}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, FETCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [apiClient, t]);

  const tokens = tokenize(query);
  const filtered = allShortUrls.filter((url) => matchesAllTokens(url, tokens)).slice(0, RESULT_LIMIT);

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
          {!loading && !error && filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{t('share.manager.create.shortCode.empty')}</p>
          )}
          {!loading && !error && filtered.map((url) => (
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
