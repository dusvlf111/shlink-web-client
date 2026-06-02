import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import {
  extractUtmFromUrl,
  recordDeletionFromHistory,
  recordShortUrlHistory,
} from '../../history/shortUrlHistoryService';
import type { ServerWithId } from '../../servers/data';
import { hasServerData } from '../../servers/data';
import { indexToSlug } from '../../servers/sequentialSlug';
import {
  commitSlugIndex,
  getNextSlugIndex,
} from '../../servers/slugCounterService';
import type { GetState } from '../../store';

// Maximum number of sequential slugs to try before giving up and letting Shlink
// assign a random slug. Each retry only happens on a slug collision, so this
// covers reconciling a stale counter against many concurrently-created slugs.
const MAX_SLUG_ATTEMPTS = 50;

// A short-URL creation error that means "this slug is already taken" and should
// be retried with the next sequential index, rather than surfaced to the user.
const isNonUniqueSlugError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { type, status } = error as { type?: unknown; status?: unknown };
  return (
    type === 'https://shlink.io/api/error/non-unique-slug' ||
    status === 400 ||
    status === 409
  );
};

const apiClients: Map<string, ShlinkApiClient> = new Map();

const getSelectedServerFromState = (getState: GetState): ServerWithId => {
  const { selectedServer } = getState();
  if (!hasServerData(selectedServer)) {
    throw new Error('There\'s no selected server or it is not found');
  }

  return selectedServer;
};

// Build a `short_url` string for a deletion when the SDK delete call does not
// return the created short URL. Joins the server base URL and short code,
// tolerating a trailing slash on the base URL. Falls back to the short code
// alone so the value is never empty (long_url is schema-required downstream).
const buildShortUrl = (baseUrl: string, shortCode: string): string => {
  if (!baseUrl) {
    return shortCode;
  }
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/${shortCode}`;
};

// Wrap createShortUrl/deleteShortUrl so every creation and deletion that flows
// through this client is logged to the short-url history (best-effort), and so
// that servers with `minimalSlug` enabled get a sequential minimal-length slug
// injected. The server identity (id/name) is captured here so callers don't
// have to pass it. Logging never throws and never blocks the underlying API
// call.
const wrapWithHistoryLogging = (
  apiClient: ShlinkApiClient,
  server: Pick<ServerWithId, 'id' | 'name' | 'url' | 'minimalSlug'>,
): ShlinkApiClient => {
  // The raw SDK create, used both as the no-op path and inside slug retries.
  const originalCreate = apiClient.createShortUrl.bind(apiClient);
  const originalDelete = apiClient.deleteShortUrl.bind(apiClient);

  // Create a short URL, injecting a sequential minimal-length custom slug when
  // the server has `minimalSlug` enabled and the caller did not specify one.
  // On a slug collision the next index is tried; after MAX_SLUG_ATTEMPTS, or on
  // any other error, it falls back to a plain (random-slug) create so creation
  // never breaks. Returns the created short URL.
  const createWithSlug: typeof originalCreate = async (data) => {
    if (server.minimalSlug !== true || data.customSlug) {
      // Either disabled, or the user provided an explicit slug we must respect.
      return originalCreate(data);
    }

    let idx = await getNextSlugIndex(server.id);
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      const customSlug = indexToSlug(idx);
      try {
        const created = await originalCreate({
          ...data,
          customSlug,
          findIfExists: false,
        });
        // Persist the consumed index so the next creation starts after it.
        await commitSlugIndex(server.id, idx);
        return created;
      } catch (error) {
        if (isNonUniqueSlugError(error)) {
          // Slug already taken (stale counter / concurrent create): try next.
          idx += 1;
          continue;
        }
        // Any other error is a genuine failure; preserve original behaviour.
        throw error;
      }
    }

    // Exhausted attempts: fall back to letting Shlink assign a random slug.
    return originalCreate(data);
  };

  apiClient.createShortUrl = async (data) => {
    const created = await createWithSlug(data);
    try {
      await recordShortUrlHistory({
        server_id: server.id,
        server_name: server.name,
        short_url: created.shortUrl,
        short_code: created.shortCode,
        long_url: created.longUrl,
        title: created.title ?? '',
        tags: created.tags ?? [],
        ...extractUtmFromUrl(created.longUrl),
        action: 'created',
      });
    } catch {
      // Best-effort: never let history logging affect the creation result.
    }
    return created;
  };

  apiClient.deleteShortUrl = async (identifier, options) => {
    await originalDelete(identifier, options);
    try {
      await recordDeletionFromHistory({
        server_id: server.id,
        server_name: server.name,
        short_code: identifier.shortCode,
        short_url: buildShortUrl(server.url, identifier.shortCode),
      });
    } catch {
      // Best-effort: never let history logging affect the deletion result.
    }
  };

  return apiClient;
};

export const buildShlinkApiClient =
  (httpClient: HttpClient) =>
    (getStateOrSelectedServer: GetState | ServerWithId) => {
      const server =
        typeof getStateOrSelectedServer === 'function'
          ? getSelectedServerFromState(getStateOrSelectedServer)
          : getStateOrSelectedServer;
      const { url: baseUrl, apiKey, forwardCredentials } = server;
      const serverKey = `${apiKey}_${baseUrl}_${forwardCredentials ? 'forward' : 'no-forward'}`;
      const existingApiClient = apiClients.get(serverKey);

      // Cache hit returns the already-wrapped instance, so wrapping is applied once.
      if (existingApiClient) {
        return existingApiClient;
      }

      const apiClient = new ShlinkApiClient(
        httpClient,
        { apiKey, baseUrl },
        { requestCredentials: forwardCredentials ? 'include' : undefined },
      );
      const wrapped = wrapWithHistoryLogging(apiClient, {
        id: server.id,
        name: server.name,
        url: server.url,
        minimalSlug: server.minimalSlug,
      });
      apiClients.set(serverKey, wrapped);

      return wrapped;
    };

export type ShlinkApiClientBuilder = ReturnType<typeof buildShlinkApiClient>;
