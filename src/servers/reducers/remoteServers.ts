import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { useCallback, useEffect, useRef } from 'react';
import pack from '../../../package.json';
import { useDependencies } from '../../container/context';
import { useAppDispatch } from '../../store';
import { createAsyncThunk } from '../../store/helpers';
import { hasServerData } from '../data';
import type { ServerWithId } from '../data';
import { ensureUniqueIds } from '../helpers';
import { fetchServerConfigs, isPocketBaseLoggedIn } from '../services/serverConfigsService';
import { createServers, replaceServers, useServers } from './servers';

const responseToServersList = (data: any) => ensureUniqueIds(
  {},
  (Array.isArray(data) ? data.filter(hasServerData) : []),
);

const fetchPocketBaseServers = async (): Promise<ServerWithId[]> => {
  if (!isPocketBaseLoggedIn()) {
    return [];
  }
  try {
    return await fetchServerConfigs();
  } catch {
    return [];
  }
};

const fetchStaticServers = async (httpClient: HttpClient): Promise<ServerWithId[]> => {
  try {
    const resp = await httpClient.jsonRequest<any>(`${pack.homepage}/servers.json`);
    return responseToServersList(resp);
  } catch {
    return [];
  }
};

export const fetchServers = createAsyncThunk(
  'shlink/remoteServers/fetchServers',
  async (httpClient: HttpClient, { dispatch }): Promise<void> => {
    const pocketBaseServers = await fetchPocketBaseServers();
    if (pocketBaseServers.length > 0) {
      // PocketBase is the canonical source — replace the cache so renames
      // and removals propagate, instead of merging on top of stale rows.
      dispatch(replaceServers(pocketBaseServers));
      return;
    }

    const staticServers = await fetchStaticServers(httpClient);
    if (staticServers.length > 0) {
      dispatch(replaceServers(staticServers));
    } else {
      // No remote source returned anything — keep whatever was already in
      // redux so users do not lose their manually-imported list.
      dispatch(createServers([]));
    }
  },
);

export const useRemoteServers = () => {
  const dispatch = useAppDispatch();
  const [httpClient] = useDependencies<[HttpClient]>('HttpClient');
  const dispatchFetchServer = useCallback(() => dispatch(fetchServers(httpClient)), [dispatch, httpClient]);

  return { fetchServers: dispatchFetchServer };
};

export const useLoadRemoteServers = () => {
  const { fetchServers } = useRemoteServers();
  const { servers } = useServers();
  const initialServers = useRef(servers);

  useEffect(() => {
    // Always re-sync from the remote source on app mount when PocketBase is
    // available — otherwise renames in the DB never reach a user whose
    // localStorage already has the old value. Static servers.json is only a
    // first-time bootstrap and stays gated on the empty check.
    if (isPocketBaseLoggedIn() || Object.keys(initialServers.current).length === 0) {
      fetchServers();
    }
  }, [fetchServers]);
};
