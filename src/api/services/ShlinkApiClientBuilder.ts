import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import {
  extractUtmFromUrl,
  recordDeletionFromHistory,
  recordShortUrlHistory,
} from '../../history/shortUrlHistoryService';
import type { ServerWithId } from '../../servers/data';
import { hasServerData } from '../../servers/data';
import type { GetState } from '../../store';

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
// through this client is logged to the short-url history (best-effort). The
// server identity (id/name) is captured here so callers don't have to pass it.
// Logging never throws and never blocks the underlying API call.
const wrapWithHistoryLogging = (
  apiClient: ShlinkApiClient,
  server: Pick<ServerWithId, 'id' | 'name' | 'url'>,
): ShlinkApiClient => {
  const originalCreate = apiClient.createShortUrl.bind(apiClient);
  const originalUpdate = apiClient.updateShortUrl.bind(apiClient);
  const originalDelete = apiClient.deleteShortUrl.bind(apiClient);

  apiClient.createShortUrl = async (data) => {
    const created = await originalCreate(data);
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

  apiClient.updateShortUrl = async (identifier, data) => {
    const updated = await originalUpdate(identifier, data);
    try {
      await recordShortUrlHistory({
        server_id: server.id,
        server_name: server.name,
        short_url: updated.shortUrl,
        short_code: updated.shortCode,
        long_url: updated.longUrl,
        title: updated.title ?? '',
        tags: updated.tags ?? [],
        ...extractUtmFromUrl(updated.longUrl),
        action: 'updated',
      });
    } catch {
      // Best-effort: never let history logging affect the update result.
    }
    return updated;
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
      });
      apiClients.set(serverKey, wrapped);

      return wrapped;
    };

export type ShlinkApiClientBuilder = ReturnType<typeof buildShlinkApiClient>;
