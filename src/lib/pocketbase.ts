import PocketBase from 'pocketbase';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export const pb = new PocketBase(POCKETBASE_URL);

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active' | 'inactive';
};

export const getCurrentUser = (): UserRecord | null => {
  if (!pb.authStore.isValid) return null;
  return pb.authStore.record as unknown as UserRecord;
};

export const isAdmin = (): boolean => getCurrentUser()?.role === 'admin';

export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  return pb.authStore.isValid && user?.status === 'active';
};
