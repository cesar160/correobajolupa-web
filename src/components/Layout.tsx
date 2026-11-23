import { useEffect, useState } from 'react';
import { ClipboardList, LogOut, PlusCircle, Users } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';
import { ErrorBox } from './ui';

const TITLES: Record<string, string> = {
  '/reports': 'Mis reportes | CorreoBajoLupa',
  '/reports/new': 'Analizar correo | CorreoBajoLupa',
  '/users': 'Usuarios | CorreoBajoLupa',
};

const ROLE_LABEL = {
  reporter: 'Reportante',
  analyst: 'Analista',
  admin: 'Administrador',
} as const;

export function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    document.title =
      TITLES[location.pathname] ??
      (location.pathname.startsWith('/reports/')
        ? 'Detalle del reporte | CorreoBajoLupa'
        : 'CorreoBajoLupa');
  }, [location.pathname]);

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const initials = (user?.displayName ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <NavLink to="/reports" className="brand">
            CorreoBajoLupa
          </NavLink>
          <span className="sidebar-eyebrow">ESPACIO DE REPORTANTE</span>
        </div>

        <nav aria-label="Navegación principal" className="sidebar-nav">
          <NavLink to="/reports" end>
            <Icon as={ClipboardList} /> Mis reportes
          </NavLink>
          <NavLink to="/reports/new">
            <Icon as={PlusCircle} /> Analizar correo
          </NavLink>
          {hasRole('admin') && (
            <NavLink to="/users">
              <Icon as={Users} /> Usuarios
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom">
          {user && (
            <>
              <div className="user-card">
                <span className="avatar" aria-hidden="true">{initials}</span>
                <span className="user-meta">
                  <span className="user-name">{user.displayName}</span>
                  <span className="user-role">{ROLE_LABEL[user.role]}</span>
                </span>
              </div>
              <button type="button" className="logout-link" onClick={handleLogout}>
                <Icon as={LogOut} /> <span>Cerrar sesión</span>
              </button>
            </>
          )}
        </div>
      </aside>

      <main id="contenido-principal" tabIndex={-1} className="main-content">
        <div className="content-topbar">
          <span className="role-badge">
            {user ? ROLE_LABEL[user.role] : 'Reportante'}
          </span>
        </div>
        <ErrorBox message={error} />
        <Outlet />
      </main>
    </div>
  );
}
