import type { ShlinkApiClient, ShlinkVisitsList } from '@shlinkio/shlink-js-sdk/api-contract';
import { pb } from '../../lib/pocketbase';

export type ShareSnapshot = {
  data: ShlinkVisitsList;
  shortCode: string;
  fetchedAt: string;
};

export type ShareTokenRecord = {
  id: string;
  short_code: string;
  token: string;
  created_by: string;
  created: string;
  updated: string;
  expires_at?: string;
  label?: string;
  server_id?: string;
  snapshot?: ShareSnapshot;
  snapshot_at?: string;
};

export type ShareToken = {
  id: string;
  shortCode: string;
  token: string;
  createdAt: string;
  expiresAt?: string;
  label?: string;
  serverId?: string;
  snapshot?: ShareSnapshot;
  snapshotAt?: string;
};

const fromRecord = (record: ShareTokenRecord): ShareToken => ({
  id: record.id,
  shortCode: record.short_code,
  token: record.token,
  createdAt: record.created,
  expiresAt: record.expires_at || undefined,
  label: record.label || undefined,
  serverId: record.server_id || undefined,
  snapshot: record.snapshot,
  snapshotAt: record.snapshot_at || undefined,
});

const generateToken = () => {
  // 32-byte random token, hex-encoded → 64 chars, ~256 bits of entropy.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const fetchSnapshotData = async (
  apiClient: ShlinkApiClient,
  shortCode: string,
): Promise<ShareSnapshot> => {
  const data = await apiClient.getShortUrlVisits({ shortCode }, { itemsPerPage: 5000 });
  return { data, shortCode, fetchedAt: new Date().toISOString() };
};

export type CreateShareTokenInput = {
  shortCode: string;
  serverId: string;
  label?: string;
  expiresInDays?: number;
  apiClient: ShlinkApiClient;
};

export const createShareToken = async ({
  shortCode,
  serverId,
  label,
  expiresInDays,
  apiClient,
}: CreateShareTokenInput): Promise<ShareToken> => {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    throw new Error('Authentication required to create a share token.');
  }

  const snapshot = await fetchSnapshotData(apiClient, shortCode);
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : '';

  const created = await pb.collection('public_tokens').create<ShareTokenRecord>({
    short_code: shortCode,
    token: generateToken(),
    created_by: userId,
    expires_at: expiresAt,
    label: label?.trim() ?? '',
    server_id: serverId,
    snapshot,
    snapshot_at: snapshot.fetchedAt,
  });

  return fromRecord(created);
};

export const listShareTokens = async (): Promise<ShareToken[]> => {
  const records = await pb.collection('public_tokens').getFullList<ShareTokenRecord>({
    sort: '-created',
  });
  return records.map(fromRecord);
};

export const deleteShareToken = async (id: string): Promise<void> => {
  await pb.collection('public_tokens').delete(id);
};

export const refreshShareToken = async (
  id: string,
  shortCode: string,
  apiClient: ShlinkApiClient,
): Promise<ShareToken> => {
  const snapshot = await fetchSnapshotData(apiClient, shortCode);
  const updated = await pb.collection('public_tokens').update<ShareTokenRecord>(id, {
    snapshot,
    snapshot_at: snapshot.fetchedAt,
  });
  return fromRecord(updated);
};

export const fetchPublicShareToken = async (
  id: string,
  token: string,
): Promise<ShareToken> => {
  // PocketBase view rule treats the row as visible when the query string token matches.
  // We pass the token via the request query so the rule can read @request.query.token.
  const record = await pb.collection('public_tokens').getOne<ShareTokenRecord>(id, {
    query: { token },
  });
  return fromRecord(record);
};

export const buildShareUrl = (origin: string, id: string, token: string): string => {
  const base = origin.replace(/\/$/, '');
  return `${base}/share/stats/${id}?token=${encodeURIComponent(token)}`;
};

export const isShareTokenExpired = (token: ShareToken): boolean => {
  if (!token.expiresAt) {
    return false;
  }
  return new Date(token.expiresAt).getTime() <= Date.now();
};
