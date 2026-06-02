import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import { fromPartial } from '@total-typescript/shoehorn';
import { buildShlinkApiClient } from '../../../src/api/services/ShlinkApiClientBuilder';
import * as historyService from '../../../src/history/shortUrlHistoryService';
import type {
  ReachableServer,
  SelectedServer,
} from '../../../src/servers/data';

vi.mock(
  '../../../src/history/shortUrlHistoryService',
  async (importOriginal) => {
    const actual = await importOriginal<typeof historyService>();
    return {
      ...actual,
      recordShortUrlHistory: vi.fn().mockResolvedValue(undefined),
      recordDeletionFromHistory: vi.fn().mockResolvedValue(undefined),
    };
  },
);

describe('ShlinkApiClientBuilder', () => {
  const server = fromPartial<ReachableServer>;

  const createBuilder = (httpClient: HttpClient = fromPartial({})) => {
    const builder = buildShlinkApiClient(httpClient);
    return (selectedServer: SelectedServer) =>
      builder(() => fromPartial({ selectedServer }));
  };

  it('creates new instances when provided params are different', async () => {
    const builder = createBuilder();
    const firstApiClient = builder(server({ url: 'foo', apiKey: 'bar' }));
    const secondApiClient = builder(server({ url: 'bar', apiKey: 'bar' }));
    const thirdApiClient = builder(server({ url: 'bar', apiKey: 'foo' }));

    expect(firstApiClient).not.toBe(secondApiClient);
    expect(firstApiClient).not.toBe(thirdApiClient);
    expect(secondApiClient).not.toBe(thirdApiClient);
  });

  it('returns existing instances when provided params are the same', () => {
    const builder = createBuilder();
    const selectedServer = server({ url: 'foo', apiKey: 'bar' });

    const firstApiClient = builder(selectedServer);
    const secondApiClient = builder(selectedServer);
    const thirdApiClient = builder(selectedServer);

    expect(firstApiClient).toBe(secondApiClient);
    expect(firstApiClient).toBe(thirdApiClient);
    expect(secondApiClient).toBe(thirdApiClient);
  });

  it('does not fetch from state when provided param is already a server', async () => {
    const url = 'the_url';
    const apiKey = 'the_api_key';
    const jsonRequest = vi.fn();
    const httpClient = fromPartial<HttpClient>({ jsonRequest });
    const apiClient = createBuilder(httpClient)(server({ url, apiKey }));

    await apiClient.health();

    expect(jsonRequest).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${url}`)),
      expect.objectContaining({
        credentials: undefined,
        headers: {
          'X-Api-Key': apiKey,
        },
      }),
    );
  });

  it('includes credentials when forwarding is enabled', async () => {
    const url = 'the_url';
    const apiKey = 'the_api_key';
    const jsonRequest = vi.fn();
    const httpClient = fromPartial<HttpClient>({ jsonRequest });
    const apiClient = createBuilder(httpClient)(
      server({ url, apiKey, forwardCredentials: true }),
    );

    await apiClient.health();

    expect(jsonRequest).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${url}`)),
      expect.objectContaining({
        credentials: 'include',
        headers: {
          'X-Api-Key': apiKey,
        },
      }),
    );
  });

  describe('history logging wrapper', () => {
    const recordShortUrlHistory = vi.mocked(
      historyService.recordShortUrlHistory,
    );
    const recordDeletionFromHistory = vi.mocked(
      historyService.recordDeletionFromHistory,
    );

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('logs a \'created\' history record after createShortUrl succeeds', async () => {
      const created = {
        shortUrl: 'https://s.test/abc',
        shortCode: 'abc',
        longUrl: 'https://example.com/page?utm_source=google&utm_medium=cpc',
        title: 'My title',
        tags: ['promo'],
      };
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockResolvedValue(fromPartial(created));

      // Use a unique server key so we get a freshly-wrapped client (the builder
      // caches by apiKey_url, so previous tests would otherwise be reused).
      const apiClient = createBuilder()(
        server({
          id: 'srv-1',
          name: 'Bin01',
          url: 'https://s.test',
          apiKey: 'key-create',
        }),
      );

      const result = await apiClient.createShortUrl(fromPartial({}));

      expect(result).toEqual(created);
      expect(createSpy).toHaveBeenCalledOnce();
      expect(recordShortUrlHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          server_id: 'srv-1',
          server_name: 'Bin01',
          short_url: 'https://s.test/abc',
          short_code: 'abc',
          long_url: created.longUrl,
          title: 'My title',
          tags: ['promo'],
          utm_source: 'google',
          utm_medium: 'cpc',
          action: 'created',
        }),
      );

      createSpy.mockRestore();
    });

    it('logs a \'deleted\' history record after deleteShortUrl succeeds', async () => {
      const deleteSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'deleteShortUrl')
        .mockResolvedValue(undefined);

      const apiClient = createBuilder()(
        server({
          id: 'srv-2',
          name: 'Bin02',
          url: 'https://s.test/',
          apiKey: 'key-delete',
        }),
      );

      await apiClient.deleteShortUrl({ shortCode: 'xyz' });

      expect(deleteSpy).toHaveBeenCalledWith({ shortCode: 'xyz' }, undefined);
      expect(recordDeletionFromHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          server_id: 'srv-2',
          server_name: 'Bin02',
          short_code: 'xyz',
          short_url: 'https://s.test/xyz',
        }),
      );

      deleteSpy.mockRestore();
    });

    it('does not throw and still returns when history logging fails', async () => {
      const created = {
        shortUrl: 'https://s.test/zzz',
        shortCode: 'zzz',
        longUrl: 'https://example.com',
        title: undefined,
        tags: [],
      };
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockResolvedValue(fromPartial(created));
      recordShortUrlHistory.mockRejectedValueOnce(new Error('logging boom'));

      const apiClient = createBuilder()(
        server({
          id: 'srv-3',
          name: 'Bin03',
          url: 'https://s.test',
          apiKey: 'key-fail',
        }),
      );

      const result = await apiClient.createShortUrl(fromPartial({}));

      expect(result).toEqual(created);
      createSpy.mockRestore();
    });
  });
});
