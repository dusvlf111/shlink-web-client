/**
 * Sequential minimal-length base-62 slug encoding.
 *
 * A short URL slug is produced from a non-negative integer index so that the
 * shortest possible slugs are used first: indices 0..61 map to a single
 * character, 62..3905 map to two characters, and so on. This mirrors a
 * bijective base-62 numeral system (a.k.a. "spreadsheet column" numbering),
 * which guarantees every length range is fully exhausted before growing.
 */

// 62-character alphabet: lowercase, uppercase, digits. The order is fixed so a
// given index always maps to the same slug across runs.
export const SLUG_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const BASE = SLUG_ALPHABET.length; // 62

/**
 * Encode a non-negative integer index into a minimal-length base-62 slug.
 *
 * Uses bijective base-62 so there are no "leading-zero" collisions:
 * - n = 0  -> 'a'   (first 1-char slug)
 * - n = 61 -> '9'   (last 1-char slug)
 * - n = 62 -> 'aa'  (first 2-char slug)
 * - n = 63 -> 'ab'
 *
 * @param n Index, must be an integer >= 0.
 * @throws RangeError when n is negative or not an integer.
 */
export const indexToSlug = (n: number): string => {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(
      `indexToSlug expects a non-negative integer, received ${n}`,
    );
  }

  // Bijective base-62: repeatedly take (remainder) after shifting by 1 so that
  // the 0..61 range yields 1 digit and the next range rolls over to 2 digits.
  let value = n;
  let slug = '';
  do {
    const remainder = value % BASE;
    slug = SLUG_ALPHABET[remainder] + slug;
    // Subtract one extra before dividing so the carry happens at 62, not 63.
    value = Math.floor(value / BASE) - 1;
  } while (value >= 0);

  return slug;
};
