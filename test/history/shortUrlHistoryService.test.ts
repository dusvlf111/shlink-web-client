import {
  extractUtmFromUrl,
  fetchShortUrlHistory,
  recordDeletionFromHistory,
  recordShortUrlHistory,
} from '../../src/history/shortUrlHistoryService';
import { pb } from '../../src/lib/pocketbase';

describe('shortUrlHistoryService', () => {
  const getFullListMock = vi.fn();
  const getFirstListItemMock = vi.fn();
  const createMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: getFullListMock,
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

  describe('fetchShortUrlHistory', () => {
    it('returns [] when the collection call throws (e.g. collection missing)', async () => {
      getFullListMock.mockRejectedValueOnce(new Error('missing collection'));
      await expect(fetchShortUrlHistory()).resolves.toEqual([]);
    });

    it('passes a server filter when serverId is provided', async () => {
      getFullListMock.mockResolvedValueOnce([]);
      await fetchShortUrlHistory({ serverId: 'srv-1' });
      // pb.filter binds the value as a quoted literal on server_id.
      const { filter } = getFullListMock.mock.calls[0][0];
      expect(filter).toContain('server_id=');
      expect(filter).toContain('srv-1');
    });

    it('binds the serverId via the parameterized filter helper, neutralizing injection', async () => {
      getFullListMock.mockResolvedValueOnce([]);
      // A value crafted to break out of a naive string-concatenated filter. The
      // pb.filter helper must escape/bind it so the injected operator never
      // becomes part of the filter expression structure.
      await fetchShortUrlHistory({ serverId: 'x\' || created_by != \'' });
      const { filter } = getFullListMock.mock.calls[0][0];
      // The dangerous payload must not appear as a raw boolean expression: the
      // quote that would close the bound literal is escaped by pb.filter.
      expect(filter).not.toContain('\' || created_by != \'');
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
