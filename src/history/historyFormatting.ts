import type { ShortUrlHistoryRecord } from './shortUrlHistoryService';

// Local-time YYYY-MM-DD key for a stored timestamp, used for date-range
// filtering with plain lexicographic comparison. '' for unparseable dates.
export const toLocalDateKey = (raw: string): string => {
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
export const formatCreatedAt = (raw: string): string => {
  if (!raw) {
    return '-';
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
};

// Display name for the creator: prefer the expanded user's name, fall back to
// their email, then to the raw relation id.
export const creatorLabel = (record: ShortUrlHistoryRecord): string => {
  const user = record.expand?.created_by;
  return user?.name?.trim() || user?.email?.trim() || record.created_by || '-';
};

export const serverLabel = (record: ShortUrlHistoryRecord): string =>
  record.server_name?.trim() || record.server_id;

// Only http(s) URLs may be rendered as clickable links. Anything else
// (e.g. a `javascript:` URL injected into a stored record) is shown as plain
// text to prevent XSS via the href.
const HTTP_URL_PATTERN = /^https?:\/\//i;

export const safeLinkHref = (url: string): string | undefined =>
  HTTP_URL_PATTERN.test(url) ? url : undefined;

// The utm_* params present on a record, in display order. Empty values are
// dropped so callers can tell whether any UTM data exists at all.
export const utmEntries = (
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
