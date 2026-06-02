import { pb } from '../lib/pocketbase';

/**
 * Per-server sequential slug counter, persisted in the PocketBase
 * `slug_counters` collection (one row per server). The counter is only a
 * *hint* for the next minimal-length slug to attempt: actual uniqueness is
 * enforced by Shlink, and concurrent creations are reconciled by retrying with
 * an incremented index in the API client wrapper. Every function here is
 * best-effort and never throws, so short-URL creation keeps working even when
 * PocketBase is unreachable.
 */

type SlugCounterRecord = {
  id: string;
  server_id: string;
  next_index: number;
};

/**
 * Read the next slug index to try for the given server. Returns 0 when there
 * is no counter row yet (or on any failure), so creation starts from the
 * shortest slug.
 */
export const getNextSlugIndex = async (serverId: string): Promise<number> => {
  try {
    const record = await pb
      .collection('slug_counters')
      .getFirstListItem<SlugCounterRecord>(`server_id="${serverId}"`);
    const next = record.next_index;
    return Number.isInteger(next) && next >= 0 ? next : 0;
  } catch {
    // No row yet, not logged in, or PocketBase unreachable: start from 0.
    return 0;
  }
};

/**
 * Persist that `usedIndex` was consumed for the given server by upserting the
 * counter row to `next_index = max(existing, usedIndex + 1)`. Best-effort.
 */
export const commitSlugIndex = async (
  serverId: string,
  usedIndex: number,
): Promise<void> => {
  const desiredNext = usedIndex + 1;
  try {
    const existing = await pb
      .collection('slug_counters')
      .getFirstListItem<SlugCounterRecord>(`server_id="${serverId}"`);
    const newNext = Math.max(existing.next_index ?? 0, desiredNext);
    if (newNext !== existing.next_index) {
      await pb
        .collection('slug_counters')
        .update(existing.id, { next_index: newNext });
    }
  } catch {
    // No row yet (or read failed): try to create one. If a concurrent creation
    // already inserted it, this create may fail — that is fine, it stays
    // best-effort and the next attempt will reconcile.
    try {
      await pb
        .collection('slug_counters')
        .create({ server_id: serverId, next_index: desiredNext });
    } catch {
      // Swallow: never let counter persistence break short-URL creation.
    }
  }
};
