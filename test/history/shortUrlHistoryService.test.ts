import {
  extractUtmFromUrl,
  fetchShortUrlHistory,
  recordShortUrlHistory,
} from '../../src/history/shortUrlHistoryService';
import { pb } from '../../src/lib/pocketbase';

describe('shortUrlHistoryService', () => {
  const getFullListMock = vi.fn();
  const createMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: getFullListMock,
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
  });
});
