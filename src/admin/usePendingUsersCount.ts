import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { pb } from '../lib/pocketbase';

const PENDING_FILTER = 'status = "pending"';

export const usePendingUsersCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (user?.role !== 'admin') {
      setCount(0);
      return;
    }
    try {
      const list = await pb.collection('users').getList(1, 1, {
        filter: PENDING_FILTER,
        fields: 'id',
      });
      setCount(list.totalItems);
    } catch {
      setCount(0);
    }
  }, [user?.role]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { count, refetch };
};
