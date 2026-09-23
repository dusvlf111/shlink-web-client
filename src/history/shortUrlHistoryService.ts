import { pb, type UserRecord } from '../lib/pocketbase';

// Whether a history record represents a short-url creation, edit or deletion.
// Older records predate this field, so it is optional everywhere and treated
// as 'created' when absent.
export type ShortUrlHistoryAction = 'created' | 'updated' | 'deleted';

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
  template_name?: string;
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
  template_name?: string;
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

export type HistoryFilters = {
  serverId?: string;
  query?: string;
  action?: ShortUrlHistoryAction | 'all';
  tags?: string[];
  templates?: string[];
  dateFrom?: string;
  dateTo?: string;
};

export type HistoryListResult = {
  items: ShortUrlHistoryRecord[];
  page: number;
  totalPages: number;
  totalItems: number;
};

// Text fields searched by `filters.query`, matched with OR semantics.
// `created_by.name`/`created_by.email` use PocketBase's relation dot-notation
// to search the resolved user without a separate query.
const QUERY_FIELDS = [
  'title',
  'short_url',
  'short_code',
  'long_url',
  'server_name',
  'server_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'created_by.name',
  'created_by.email',
];

// Build a PocketBase filter expression for the given filters, binding every
// value through `pb.filter` so nothing is ever string-concatenated into the
// expression (prevents filter injection).
const buildFilter = (filters: HistoryFilters): string | undefined => {
  const clauses: string[] = [];

  if (filters.serverId) {
    clauses.push(pb.filter('server_id={:sid}', { sid: filters.serverId }));
  }

  if (filters.action && filters.action !== 'all') {
    // Records written before `action` existed are treated as 'created', so
    // an empty `action` also matches when filtering for 'created'.
    clauses.push(
      pb.filter('(action={:act} || (action="" && {:act}="created"))', {
        act: filters.action,
      }),
    );
  }

  if (filters.tags && filters.tags.length > 0) {
    // `tags` is a JSON array; PocketBase has no array-contains operator, so
    // this matches the JSON-encoded text. Quoting the bound value avoids
    // matching a tag that is merely a substring of another (e.g. "promo" vs
    // "promotion").
    const tagClauses = filters.tags.map((tag, i) =>
      pb.filter('tags~{:tag' + i + '}', { ['tag' + i]: `"${tag}"` }),
    );
    clauses.push(`(${tagClauses.join(' || ')})`);
  }

  if (filters.templates && filters.templates.length > 0) {
    const templateClauses = filters.templates.map((name, i) =>
      pb.filter('template_name={:tpl' + i + '}', { ['tpl' + i]: name }),
    );
    clauses.push(`(${templateClauses.join(' || ')})`);
  }

  if (filters.dateFrom) {
    clauses.push(
      pb.filter('created>={:from}', { from: `${filters.dateFrom} 00:00:00` }),
    );
  }
  if (filters.dateTo) {
    clauses.push(
      pb.filter('created<={:to}', { to: `${filters.dateTo} 23:59:59` }),
    );
  }

  const query = filters.query?.trim();
  if (query) {
    const queryClauses = QUERY_FIELDS.map((field, i) =>
      pb.filter(`${field}~{:q${i}}`, { [`q${i}`]: query }),
    );
    clauses.push(`(${queryClauses.join(' || ')})`);
  }

  return clauses.length > 0 ? clauses.join(' && ') : undefined;
};

// Load one page of history records (newest first), resolving the
// `created_by` user. Returns an empty page on any error — including the
// collection not yet existing on the live PocketBase instance — so the
// History page never crashes before the collection is imported.
export const fetchShortUrlHistoryPage = async (
  page: number,
  perPage: number,
  filters: HistoryFilters = {},
): Promise<HistoryListResult> => {
  try {
    const result = await pb
      .collection('short_url_history')
      .getList<ShortUrlHistoryRecord>(page, perPage, {
        sort: '-created',
        expand: 'created_by',
        filter: buildFilter(filters),
      });
    return {
      items: result.items,
      page: result.page,
      totalPages: result.totalPages,
      totalItems: result.totalItems,
    };
  } catch {
    return { items: [], page, totalPages: 0, totalItems: 0 };
  }
};

export type HistoryFacets = {
  tags: string[];
  templates: string[];
  servers: { id: string; name: string }[];
};

// Load the distinct tags/templates/servers present across the history,
// scoped to a server when given. Fetches only the fields needed to compute
// the facets (not full records) so it stays cheap even with many rows.
// Returns empty facets on any error.
export const fetchHistoryFacets = async (
  opts: { serverId?: string } = {},
): Promise<HistoryFacets> => {
  try {
    const rows = await pb
      .collection('short_url_history')
      .getFullList<
      Pick<
        ShortUrlHistoryRecord,
          'tags' | 'template_name' | 'server_id' | 'server_name'
      >
    >({
        fields: 'tags,template_name,server_id,server_name',
        filter: opts.serverId
          ? pb.filter('server_id={:sid}', { sid: opts.serverId })
          : undefined,
      });

    const tags = new Set<string>();
    const templates = new Set<string>();
    const servers = new Map<string, string>();

    rows.forEach((row) => {
      (row.tags ?? []).forEach((tag) => tags.add(tag));
      const template = row.template_name?.trim();
      if (template) {
        templates.add(template);
      }
      if (!servers.has(row.server_id)) {
        servers.set(row.server_id, row.server_name || row.server_id);
      }
    });

    return {
      tags: Array.from(tags).sort((a, b) => a.localeCompare(b)),
      templates: Array.from(templates).sort((a, b) => a.localeCompare(b)),
      servers: Array.from(servers, ([id, name]) => ({ id, name })).sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    };
  } catch {
    return { tags: [], templates: [], servers: [] };
  }
};
