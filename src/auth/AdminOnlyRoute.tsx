import type { FC, ReactElement } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';

export type AdminOnlyRouteProps = {
  children: ReactElement;
  redirectTo?: string;
};

/**
 * Hides the wrapped route from non-admin users by redirecting them away.
 * Used to gate server create/edit pages that PocketBase only accepts from
 * admin role tokens — without this guard non-admins would still see the
 * forms and only fail at the API call.
 */
export const AdminOnlyRoute: FC<AdminOnlyRouteProps> = ({ children, redirectTo = '/' }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (user?.role !== 'admin') {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};
