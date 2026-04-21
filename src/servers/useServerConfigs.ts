import { useEffect, useState } from 'react';
import { pb } from '../lib/pocketbase';

export type ServerConfig = {
  id: string;
  name: string;
  url: string;
  api_key?: string;
};

export const useServerConfigs = () => {
  const [configs, setConfigs] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      return;
    }

    setLoading(true);
    pb.collection('server_configs')
      .getFullList<ServerConfig>({ sort: 'name' })
      .then(setConfigs)
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false));
  }, []);

  return { configs, loading };
};
