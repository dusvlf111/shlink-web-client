import {
  extractUtmFromUrl,
  fetchHistoryFacets,
  fetchShortUrlHistoryPage,
  recordDeletionFromHistory,
  recordShortUrlHistory,
} from '../../src/history/shortUrlHistoryService';
import { pb } from '../../src/lib/pocketbase';

describe('shortUrlHistoryService', () => {
  const getFullListMock = vi.fn();
  const getListMock = vi.fn();
  const getFirstListItemMock = vi.fn();
  const createMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: getFullListMock,
      getList: getListMock,
      getFirstListItem: getFirstListItemMock,
      create: createMock,
    } as never);
  });

  describe('extractUtmFromUrl', () => {
    it('extracts present utm params and omits absent ones', () => {
      const result = extractUtmFromUrl(
        'https://example.com/p?utm_source=google&utm_medium=cpc&utm_campaign=spring',
      );
      expect(result).toEqual({
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring',
      });
    });

    it('returns {} for invalid or empty URLs', () => {
      expect(extractUtmFromUrl('not a url')).toEqual({});
      expect(extractUtmFromUrl('')).toEqual({});
    });
  });

  describe('fetchShortUrlHistoryPage', () => {
    it('returns an empty page when the collection call throws (e.g. collection missing)', async () => {
      getListMock.mockRejectedValueOnce(new Error('missing collection'));
      await expect(fetchShortUrlHistoryPage(1, 30)).resolves.toEqual({
        items: [],
        page: 1,
        totalPages: 0,
        totalItems: 0,
      });
    });

    it('requests the given page/perPage and maps the result', async () => {
      getListMock.mockResolvedValueOnce({
        items: [{ id: 'rec-1' }],
        page: 2,
        totalPages: 5,
        totalItems: 120,
      });
      const result = await fetchShortUrlHistoryPage(2, 30);
      expect(getListMock).toHaveBeenCalledWith(
        2,
        30,
        expect.objectContaining({ sort: '-created', expand: 'created_by' }),
      );
      expect(result).toEqual({
        items: [{ id: 'rec-1' }],
        page: 2,
        totalPages: 5,
        totalItems: 120,
      });
    });

    it('passes a server filter when serverId is provided', async () => {
      getListMock.mockResolvedValueOnce({
        items: [],
        page: 1,
        totalPages: 0,
        totalItems: 0,
      });
      await fetchShortUrlHistoryPage(1, 30, { serverId: 'srv-1' });
      const { filter } = getListMock.mock.calls[0][2];
      expect(filter).toContain('server_id=');
      expect(filter).toContain('srv-1');
    });

    it('binds every filter value via the parameterized filter helper, neutralizing injection', async () => {
      getListMock.mockResolvedValueOnce({
        items: [],
        page: 1,
        totalPages: 0,
        totalItems: 0,
      });
      // A value crafted to break out of a naive string-concatenated filter. The
      // pb.filter helper must escape/bind it so the injected operator never
      // becomes part of the filter expression structure.
      await fetchShortUrlHistoryPage(1, 30, {
        serverId: 'x\' || created_by != \'',
      });
      const { filter } = getListMock.mock.calls[0][2];
      // The dangerous payload must not appear as a raw boolean expression: the
      // quote that would close the bound literal is escaped by pb.filter.
      expect(filter).not.toContain('\' || created_by != \'');
    });
  });

  describe('fetchHistoryFacets', () => {
    it('returns empty facets when the collection call throws', async () => {
      getFullListMock.mockRejectedValueOnce(new Error('missing collection'));
      await expect(fetchHistoryFacets()).resolves.toEqual({
        tags: [],
        templates: [],
        servers: [],
      });
    });

    it('computes distinct, sorted tags/templates/servers from the fetched rows', async () => {
      getFullListMock.mockResolvedValueOnce([
        {
          tags: ['promo', 'spring'],
          template_name: 'A',
          server_id: 'srv-2',
          server_name: 'Bin02',
        },
        {
          tags: ['promo'],
          template_name: 'B',
          server_id: 'srv-1',
          server_name: 'Bin01',
        },
        {
          tags: [],
          template_name: undefined,
          server_id: 'srv-1',
          server_name: 'Bin01',
        },
      ]);
      const result = await fetchHistoryFacets();
      expect(result).toEqual({
        tags: ['promo', 'spring'],
        templates: ['A', 'B'],
        servers: [
          { id: 'srv-1', name: 'Bin01' },
          { id: 'srv-2', name: 'Bin02' },
        ],
      });
    });

    it('requests only the fields needed to compute the facets', async () => {
      getFullListMock.mockResolvedValueOnce([]);
      await fetchHistoryFacets();
      expect(getFullListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: 'tags,template_name,server_id,server_name',
        }),
      );
    });

    it('scopes to a server when serverId is provided', async () => {
      getFullListMock.mockResolvedValueOnce([]);
      await fetchHistoryFacets({ serverId: 'srv-1' });
      const { filter } = getFullListMock.mock.calls[0][0];
      expect(filter).toContain('server_id=');
      expect(filter).toContain('srv-1');
    });
  });

  describe('recordShortUrlHistory', () => {
    it('does not throw when create fails', async () => {
      pb.authStore.save('token', { id: 'user-1' } as never);
      createMock.mockRejectedValueOnce(new Error('boom'));
      await expect(
        recordShortUrlHistory({
          server_id: 'srv-1',
          short_url: 'https://s.test/abc',
          long_url: 'https://example.com',
        }),
      ).resolves.toBeUndefined();
      pb.authStore.clear();
    });

    it('is a noop when not logged in', async () => {
      pb.authStore.clear();
      await recordShortUrlHistory({
        server_id: 'srv-1',
        short_url: 'https://s.test/abc',
        long_url: 'https://example.com',
      });
      expect(createMock).not.toHaveBeenCalled();
    });

    it('defaults action to "created" when not provided', async () => {
      pb.authStore.save('token', { id: 'user-1' } as never);
      createMock.mockResolvedValueOnce({});
      await recordShortUrlHistory({
        server_id: 'srv-1',
        short_url: 'https://s.test/abc',
        long_url: 'https://example.com',
      });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'created', created_by: 'user-1' }),
      );
      pb.authStore.clear();
    });

    it('persists action "deleted" when provided', async () => {
      pb.authStore.save('token', { id: 'user-1' } as never);
      createMock.mockResolvedValueOnce({});
      await recordShortUrlHistory({
        server_id: 'srv-1',
        short_url: 'https://s.test/abc',
        long_url: 'https://example.com',
        action: 'deleted',
      });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'deleted' }),
      );
      pb.authStore.clear();
    });
  });

  describe('recordDeletionFromHistory', () => {
    it('copies long_url/title/tags/utm from the latest matching created record', async () => {
      pb.authStore.save('token', { id: 'user-1' } as never);
      getFirstListItemMock.mockResolvedValueOnce({
        server_name: 'Bin01',
        short_url: 'https://s.test/abc',
        long_url: 'https://example.com/page?utm_source=google',
        title: 'Original title',
        tags: ['promo'],
        utm_source: 'google',
      });
      createMock.mockResolvedValueOnce({});

      await recordDeletionFromHistory({
        server_id: 'srv-1',
        short_code: 'abc',
        short_url: 'https://s.test/abc',
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'deleted',
          server_name: 'Bin01',
          long_url: 'https://example.com/page?utm_source=google',
          title: 'Original title',
          tags: ['promo'],
          utm_source: 'google',
        }),
      );
      pb.authStore.clear();
    });

    it('falls back to the short_url for long_url when no created record is found', async () => {
      pb.authStore.save('token', { id: 'user-1' } as never);
      getFirstListItemMock.mockRejectedValueOnce(new Error('not found'));
      createMock.mockResolvedValueOnce({});

      await recordDeletionFromHistory({
        server_id: 'srv-1',
        server_name: 'Bin01',
        short_code: 'abc',
        short_url: 'https://s.test/abc',
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'deleted',
          server_name: 'Bin01',
          short_url: 'https://s.test/abc',
          long_url: 'https://s.test/abc',
        }),
      );
      pb.authStore.clear();
    });
  });
});
