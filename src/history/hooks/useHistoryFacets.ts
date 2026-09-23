import { useEffect, useState } from 'react';
import {
  fetchHistoryFacets,
  type HistoryFacets,
} from '../shortUrlHistoryService';

const EMPTY_FACETS: HistoryFacets = { tags: [], templates: [], servers: [] };

// Loads the distinct tags/templates/servers available for filtering,
// independently of the paginated record list, so the full option set is
// known even though only one page of records is ever loaded at a time.
// Scoped to the selected server, if any.
export const useHistoryFacets = (serverId: string | undefined) => {
  const [facets, setFacets] = useState<HistoryFacets>(EMPTY_FACETS);

  useEffect(() => {
    let cancelled = false;
    void fetchHistoryFacets({ serverId }).then((result) => {
      if (!cancelled) {
        setFacets(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  return facets;
};
