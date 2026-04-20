import type { FC, ReactNode } from 'react';
import { LoginPage } from './LoginPage';
import { useAuth } from './AuthContext';

export const AuthGuard: FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
};
