import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { pb, type UserRecord } from '../lib/pocketbase';

type AuthContextType = {
  user: UserRecord | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUser = () => {
      if (pb.authStore.isValid && pb.authStore.record) {
        const record = pb.authStore.record as unknown as UserRecord;
        setUser(record.status === 'active' ? record : null);
      } else {
        setUser(null);
      }
    };

    syncUser();
    setIsLoading(false);

    return pb.authStore.onChange(syncUser);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await pb.collection('users').authWithPassword(email, password);
    const record = result.record as unknown as UserRecord;
    if (record.status === 'pending') {
      pb.authStore.clear();
      throw new Error('승인 대기 중인 계정입니다. 관리자 승인 후 로그인할 수 있습니다.');
    }
    if (record.status === 'inactive') {
      pb.authStore.clear();
      throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }
  };

  const logout = () => {
    pb.authStore.clear();
  };

  const register = async (email: string, password: string, name: string) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
      role: 'member',
      status: 'pending',
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
