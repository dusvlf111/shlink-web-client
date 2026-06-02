import { pb } from '../../lib/pocketbase';
import type { ServerData, ServerWithId } from '../data';

export type ServerConfigRecord = {
  id: string;
  name: string;
  url: string;
  api_key?: string;
  minimal_slug?: boolean;
};

export const fromPocketBase = (record: ServerConfigRecord): ServerWithId => ({
  id: record.id,
  name: record.name,
  url: record.url,
  apiKey: record.api_key ?? '',
  minimalSlug: record.minimal_slug ?? false,
});

export const toPocketBase = (
  data: ServerData,
): Omit<ServerConfigRecord, 'id'> => ({
  name: data.name,
  url: data.url,
  api_key: data.apiKey,
  minimal_slug: data.minimalSlug ?? false,
});

export const isPocketBaseLoggedIn = (): boolean => pb.authStore.isValid;

export const fetchServerConfigs = async (): Promise<ServerWithId[]> => {
  if (!isPocketBaseLoggedIn()) {
    return [];
  }
  const records = await pb
    .collection('server_configs')
    .getFullList<ServerConfigRecord>({
      sort: 'name',
    });
  return records.map(fromPocketBase);
};

export const createServerConfig = async (
  data: ServerData,
): Promise<ServerWithId> => {
  const created = await pb
    .collection('server_configs')
    .create<ServerConfigRecord>(toPocketBase(data));
  return fromPocketBase(created);
};

export const updateServerConfig = async (
  id: string,
  data: ServerData,
): Promise<ServerWithId> => {
  const updated = await pb
    .collection('server_configs')
    .update<ServerConfigRecord>(id, toPocketBase(data));
  return fromPocketBase(updated);
};
