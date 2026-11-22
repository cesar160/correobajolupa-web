import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '../api/types';
import { useAuth } from './AuthContext';

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, ready, hasRole } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="center-state">
        <p>Cargando sesión…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/reports" replace />;
  }

  return <>{children}</>;
}
