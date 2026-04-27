import { fromPartial } from '@total-typescript/shoehorn';
import {
  buildShareUrl,
  isShareTokenExpired,
  type ShareToken,
} from '../../../src/share/services/shareTokenService';

describe('shareTokenService', () => {
  describe('buildShareUrl', () => {
    it('builds the public share URL with the token in the query string', () => {
      const url = buildShareUrl('https://app.example.com', 'abc123', 'super-secret');
      expect(url).toBe('https://app.example.com/share/stats/abc123?token=super-secret');
    });

    it('strips a trailing slash from the origin', () => {
      const url = buildShareUrl('https://app.example.com/', 'abc123', 'token-value');
      expect(url).toBe('https://app.example.com/share/stats/abc123?token=token-value');
    });

    it('encodes special characters in the token query value', () => {
      const url = buildShareUrl('https://app.example.com', 'abc123', 'a/b c+d');
      expect(url).toBe('https://app.example.com/share/stats/abc123?token=a%2Fb%20c%2Bd');
    });
  });

  describe('isShareTokenExpired', () => {
    const baseToken = fromPartial<ShareToken>({ id: 't1', shortCode: 'foo', token: 'abc' });

    it('returns false when the token never expires', () => {
      expect(isShareTokenExpired({ ...baseToken })).toBe(false);
    });

    it('returns true when the expiry date is in the past', () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      expect(isShareTokenExpired({ ...baseToken, expiresAt: past })).toBe(true);
    });

    it('returns false when the expiry date is in the future', () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      expect(isShareTokenExpired({ ...baseToken, expiresAt: future })).toBe(false);
    });
  });
});
