import { useMemo } from 'react';
import { useLocation } from 'react-router';
import type { ServersMap, ServerWithId } from './data';
import { useSelectedServer } from './reducers/selectedServer';
import { useServers } from './reducers/servers';

// `/server/create` is the only reserved non-id segment under `/server/`, so it
// is excluded when extracting the active serverId from the URL.
const SERVER_PATH_PATTERN = /^\/server\/([^/]+)/;

const serverIdFromPathname = (pathname: string): string | undefined => {
  const matched = pathname.match(SERVER_PATH_PATTERN)?.[1];
  return matched && matched !== 'create' ? matched : undefined;
};

const pickFallbackServerId = (servers: ServersMap): string | undefined => {
  const serverList = Object.values(servers);
  const autoConnect = serverList.find((server) => server.autoConnect);
  return autoConnect?.id ?? serverList[0]?.id;
};

export type ActiveServer = {
  activeServerId?: string;
  activeServer?: ServerWithId;
};

/**
 * Resolve the "active" server with a single, shared priority so the header and
 * sidebar never disagree:
 *
 *   1. The `/server/:id` segment in the URL. The route is authoritative for the
 *      server currently being viewed, so it wins even if that id is not yet in
 *      the servers map (e.g. a deep link before the list has loaded). The
 *      resolved `activeServer` object is looked up from the map and may be
 *      undefined until it is known.
 *   2. The Redux `selectedServer`, when it is a real, identifiable server
 *      (not NotFound / not null). This keeps the server context on non-scoped
 *      pages like `/history`, `/share-stats` and `/settings`, where the URL has
 *      no serverId but the user was just viewing a server.
 *   3. The autoConnect / first registered server as a last resort.
 */
export const useActiveServer = (): ActiveServer => {
  const { pathname } = useLocation();
  const { servers } = useServers();
  const { selectedServer } = useSelectedServer();

  return useMemo(() => {
    const routeServerId = serverIdFromPathname(pathname);
    if (routeServerId) {
      return {
        activeServerId: routeServerId,
        activeServer: servers[routeServerId],
      };
    }

    // Real, identifiable server in Redux (excludes null and { serverNotFound }).
    if (
      selectedServer &&
      'id' in selectedServer &&
      servers[selectedServer.id]
    ) {
      const { id } = selectedServer;
      return { activeServerId: id, activeServer: servers[id] };
    }

    const fallbackId = pickFallbackServerId(servers);
    return fallbackId
      ? { activeServerId: fallbackId, activeServer: servers[fallbackId] }
      : {};
  }, [pathname, selectedServer, servers]);
};
