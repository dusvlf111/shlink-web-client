import { pb } from '../../lib/pocketbase';
import type { ServerData, ServerWithId } from '../data';

export type ServerConfigRecord = {
  id: string;
  name: string;
  url: string;
  api_key?: string;
};

export const fromPocketBase = (record: ServerConfigRecord): ServerWithId => ({
  id: record.id,
  name: record.name,
  url: record.url,
  apiKey: record.api_key ?? '',
});

export const toPocketBase = (data: ServerData): Omit<ServerConfigRecord, 'id'> => ({
  name: data.name,
  url: data.url,
  api_key: data.apiKey,
});

export const isPocketBaseLoggedIn = (): boolean => pb.authStore.isValid;

export const fetchServerConfigs = async (): Promise<ServerWithId[]> => {
  if (!isPocketBaseLoggedIn()) {
    return [];
  }
  const records = await pb.collection('server_configs').getFullList<ServerConfigRecord>({
    sort: 'name',
  });
  return records.map(fromPocketBase);
};

export const createServerConfig = async (data: ServerData): Promise<ServerWithId> => {
  const created = await pb.collection('server_configs').create<ServerConfigRecord>(toPocketBase(data));
  return fromPocketBase(created);
};
