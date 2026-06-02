import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import { fromPartial } from '@total-typescript/shoehorn';
import { buildShlinkApiClient } from '../../../src/api/services/ShlinkApiClientBuilder';
import * as historyService from '../../../src/history/shortUrlHistoryService';
import type {
  ReachableServer,
  SelectedServer,
} from '../../../src/servers/data';
import * as slugCounterService from '../../../src/servers/slugCounterService';

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

vi.mock('../../../src/servers/slugCounterService', () => ({
  getNextSlugIndex: vi.fn().mockResolvedValue(0),
  commitSlugIndex: vi.fn().mockResolvedValue(undefined),
}));

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

  describe('minimal-length sequential slug wrapper', () => {
    const getNextSlugIndex = vi.mocked(slugCounterService.getNextSlugIndex);
    const commitSlugIndex = vi.mocked(slugCounterService.commitSlugIndex);

    beforeEach(() => {
      vi.clearAllMocks();
      getNextSlugIndex.mockResolvedValue(0);
      commitSlugIndex.mockResolvedValue(undefined);
    });

    it('injects a sequential custom slug for minimalSlug servers', async () => {
      const created = {
        shortUrl: 'https://s.test/a',
        shortCode: 'a',
        longUrl: 'https://example.com',
        tags: [],
      };
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockResolvedValue(fromPartial(created));

      const apiClient = createBuilder()(
        server({
          id: 'srv-slug-1',
          name: 'Slug01',
          url: 'https://s.test',
          apiKey: 'key-slug-1',
          minimalSlug: true,
        }),
      );

      const result = await apiClient.createShortUrl(
        fromPartial({ longUrl: 'https://example.com' }),
      );

      expect(result).toEqual(created);
      expect(getNextSlugIndex).toHaveBeenCalledWith('srv-slug-1');
      expect(createSpy).toHaveBeenCalledOnce();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ customSlug: 'a', findIfExists: false }),
      );
      expect(commitSlugIndex).toHaveBeenCalledWith('srv-slug-1', 0);

      createSpy.mockRestore();
    });

    it('retries with the next index when a slug is already taken', async () => {
      const created = {
        shortUrl: 'https://s.test/b',
        shortCode: 'b',
        longUrl: 'https://example.com',
        tags: [],
      };
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockRejectedValueOnce({
          type: 'https://shlink.io/api/error/non-unique-slug',
          status: 400,
        })
        .mockResolvedValueOnce(fromPartial(created));

      const apiClient = createBuilder()(
        server({
          id: 'srv-slug-2',
          name: 'Slug02',
          url: 'https://s.test',
          apiKey: 'key-slug-2',
          minimalSlug: true,
        }),
      );

      const result = await apiClient.createShortUrl(
        fromPartial({ longUrl: 'https://example.com' }),
      );

      expect(result).toEqual(created);
      expect(createSpy).toHaveBeenCalledTimes(2);
      // First attempt uses index 0 -> 'a', retry uses index 1 -> 'b'.
      expect(createSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ customSlug: 'a' }),
      );
      expect(createSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ customSlug: 'b' }),
      );
      expect(commitSlugIndex).toHaveBeenCalledWith('srv-slug-2', 1);

      createSpy.mockRestore();
    });

    it('respects an explicit custom slug provided by the caller', async () => {
      const created = {
        shortUrl: 'https://s.test/mine',
        shortCode: 'mine',
        longUrl: 'https://example.com',
        tags: [],
      };
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockResolvedValue(fromPartial(created));

      const apiClient = createBuilder()(
        server({
          id: 'srv-slug-3',
          name: 'Slug03',
          url: 'https://s.test',
          apiKey: 'key-slug-3',
          minimalSlug: true,
        }),
      );

      const result = await apiClient.createShortUrl(
        fromPartial({ longUrl: 'https://example.com', customSlug: 'mine' }),
      );

      expect(result).toEqual(created);
      expect(getNextSlugIndex).not.toHaveBeenCalled();
      expect(commitSlugIndex).not.toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ customSlug: 'mine' }),
      );

      createSpy.mockRestore();
    });

    it('does not inject a slug for non-minimalSlug servers', async () => {
      const created = {
        shortUrl: 'https://s.test/random',
        shortCode: 'random',
        longUrl: 'https://example.com',
        tags: [],
      };
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockResolvedValue(fromPartial(created));

      const apiClient = createBuilder()(
        server({
          id: 'srv-slug-4',
          name: 'Slug04',
          url: 'https://s.test',
          apiKey: 'key-slug-4',
          minimalSlug: false,
        }),
      );

      const result = await apiClient.createShortUrl(
        fromPartial({ longUrl: 'https://example.com' }),
      );

      expect(result).toEqual(created);
      expect(getNextSlugIndex).not.toHaveBeenCalled();
      expect(commitSlugIndex).not.toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({ customSlug: expect.anything() }),
      );

      createSpy.mockRestore();
    });

    it('rethrows non-slug errors without retrying', async () => {
      const createSpy = vi
        .spyOn(ShlinkApiClient.prototype, 'createShortUrl')
        .mockRejectedValue({
          type: 'https://shlink.io/api/error/invalid-data',
          status: 500,
        });

      const apiClient = createBuilder()(
        server({
          id: 'srv-slug-5',
          name: 'Slug05',
          url: 'https://s.test',
          apiKey: 'key-slug-5',
          minimalSlug: true,
        }),
      );

      await expect(
        apiClient.createShortUrl(
          fromPartial({ longUrl: 'https://example.com' }),
        ),
      ).rejects.toMatchObject({ status: 500 });
      expect(createSpy).toHaveBeenCalledOnce();
      expect(commitSlugIndex).not.toHaveBeenCalled();

      createSpy.mockRestore();
    });
  });
});
