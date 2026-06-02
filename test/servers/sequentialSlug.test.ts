import { indexToSlug, SLUG_ALPHABET } from '../../src/servers/sequentialSlug';

describe('sequentialSlug', () => {
  describe('indexToSlug', () => {
    it('maps index 0 to the first single-character slug', () => {
      expect(indexToSlug(0)).toEqual('a');
      expect(indexToSlug(0)).toEqual(SLUG_ALPHABET[0]);
    });

    it('maps index 61 to the last single-character slug', () => {
      expect(indexToSlug(61)).toEqual('9');
      expect(indexToSlug(61)).toEqual(SLUG_ALPHABET[61]);
    });

    it('rolls over to two characters at index 62', () => {
      // 62 single-char slugs (0..61) are exhausted, so index 62 is the first
      // two-character slug.
      expect(indexToSlug(61)).toHaveLength(1);
      expect(indexToSlug(62)).toEqual('aa');
      expect(indexToSlug(62)).toHaveLength(2);
    });

    it('continues sequentially within the two-character range', () => {
      expect(indexToSlug(63)).toEqual('ab');
      expect(indexToSlug(64)).toEqual('ac');
    });

    it('produces unique slugs across the 1-char / 2-char boundary', () => {
      const slugs = Array.from({ length: 130 }, (_, i) => indexToSlug(i));
      expect(new Set(slugs).size).toEqual(slugs.length);
    });

    it('uses single characters for the entire first range and two for the next', () => {
      for (let i = 0; i < 62; i += 1) {
        expect(indexToSlug(i)).toHaveLength(1);
      }
      for (let i = 62; i < 62 + 62 * 62; i += 1) {
        expect(indexToSlug(i)).toHaveLength(2);
      }
    });

    it('throws for negative or non-integer indices', () => {
      expect(() => indexToSlug(-1)).toThrow(RangeError);
      expect(() => indexToSlug(1.5)).toThrow(RangeError);
    });
  });
});
