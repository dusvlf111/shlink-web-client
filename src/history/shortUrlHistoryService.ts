import { pb, type UserRecord } from '../lib/pocketbase';

// Whether a history record represents a short-url creation or deletion. Older
// records predate this field, so it is optional everywhere and treated as
// 'created' when absent.
export type ShortUrlHistoryAction = 'created' | 'deleted';

// One stored record in the `short_url_history` collection. Mirrors the
// PocketBase schema (pocketbase/schema.json -> short_url_history). `expand`
// carries the resolved `created_by` relation when fetched with expand.
export type ShortUrlHistoryRecord = {
  id: string;
  created_by: string;
  server_id: string;
  server_name?: string;
  short_url: string;
  short_code?: string;
  long_url: string;
  title?: string;
  tags?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  action?: ShortUrlHistoryAction;
  created: string;
  updated: string;
  expand?: {
    created_by?: UserRecord;
  };
};

// Shape callers pass in when logging a creation or deletion. `created_by` is
// filled in by the service from the auth store, so callers never provide it.
export type ShortUrlHistoryInput = {
  server_id: string;
  server_name?: string;
  short_url: string;
  short_code?: string;
  long_url: string;
  title?: string;
  tags?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  action?: ShortUrlHistoryAction;
};

// Read an action from a stored record, defaulting to 'created' for records
// written before the `action` field existed.
export const resolveHistoryAction = (
  record: Pick<ShortUrlHistoryRecord, 'action'>,
): ShortUrlHistoryAction => record.action ?? 'created';

type ExtractedUtm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

// Pull the utm_* query params out of a long URL into a plain object. Only
// non-empty values are included so a record never stores blank strings for
// params that were never present. Returns {} for invalid URLs.
export const extractUtmFromUrl = (longUrl: string): ExtractedUtm => {
  if (!longUrl?.trim()) {
    return {};
  }

  try {
    const { searchParams } = new URL(longUrl);
    const result: ExtractedUtm = {};
    const source = searchParams.get('utm_source');
    const medium = searchParams.get('utm_medium');
    const campaign = searchParams.get('utm_campaign');
    const term = searchParams.get('utm_term');
    const content = searchParams.get('utm_content');

    if (source) result.utm_source = source;
    if (medium) result.utm_medium = medium;
    if (campaign) result.utm_campaign = campaign;
    if (term) result.utm_term = term;
    if (content) result.utm_content = content;

    return result;
  } catch {
    return {};
  }
};

// Best-effort logging of a short-url creation. This is a side effect of the
// real creation flow, so it must NEVER throw or otherwise break that flow:
// any failure (not logged in, collection missing, network error) is swallowed.
export const recordShortUrlHistory = async (
  input: ShortUrlHistoryInput,
): Promise<void> => {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    // Not logged in: nothing to attribute the record to, so skip silently.
    return;
  }

  try {
    await pb.collection('short_url_history').create({
      ...input,
      action: input.action ?? 'created',
      created_by: userId,
    });
  } catch {
    // Swallow: history logging must not affect the short-url creation UX.
  }
};

// Look up the most recent 'created' record for a given server + short code and
// log a matching 'deleted' record, copying over the original long_url, title,
// tags and utm_* so the deletion entry carries the same metadata. This is
// best-effort: if the original cannot be found (or PocketBase is unavailable),
// it falls back to the provided shortUrl as the (required) long_url so a
// deletion is still recorded. Never throws — deletion logging must not break
// the real delete flow.
export const recordDeletionFromHistory = async (params: {
  server_id: string;
  server_name?: string;
  short_code?: string;
  short_url: string;
}): Promise<void> => {
  const { server_id, server_name, short_code, short_url } = params;

  let original: ShortUrlHistoryRecord | undefined;
  if (short_code) {
    try {
      // Find the latest 'created' record for this server + short code.
      original = await pb
        .collection('short_url_history')
        .getFirstListItem<ShortUrlHistoryRecord>(
          pb.filter('server_id={:sid} && short_code={:code}', {
            sid: server_id,
            code: short_code,
          }),
          { sort: '-created' },
        );
    } catch {
      // Not found / collection missing / network error: fall through to the
      // fallback below.
    }
  }

  await recordShortUrlHistory({
    server_id,
    server_name: original?.server_name ?? server_name,
    short_url: original?.short_url || short_url,
    short_code,
    // long_url is required by the schema, so never let it be empty: prefer the
    // original record's long_url, then the short URL string.
    long_url: original?.long_url || short_url,
    title: original?.title,
    tags: original?.tags,
    utm_source: original?.utm_source,
    utm_medium: original?.utm_medium,
    utm_campaign: original?.utm_campaign,
    utm_term: original?.utm_term,
    utm_content: original?.utm_content,
    action: 'deleted',
  });
};

type FetchOptions = {
  serverId?: string;
};

// Load the full history list (newest first), resolving the `created_by` user.
// Returns [] on any error — including the collection not yet existing on the
// live PocketBase instance — so the History page never crashes before the
// collection is imported.
export const fetchShortUrlHistory = async (
  opts: FetchOptions = {},
): Promise<ShortUrlHistoryRecord[]> => {
  try {
    return await pb
      .collection('short_url_history')
      .getFullList<ShortUrlHistoryRecord>({
        sort: '-created',
        expand: 'created_by',
        // Use PocketBase's parameterized filter helper so the serverId is bound
        // as a value, never concatenated into the filter string (prevents
        // filter injection).
        filter: opts.serverId
          ? pb.filter('server_id={:sid}', { sid: opts.serverId })
          : undefined,
      });
  } catch {
    return [];
  }
};
