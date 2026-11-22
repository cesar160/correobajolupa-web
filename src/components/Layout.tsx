import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorBox, RoleBadge } from './ui';

const TITLES: Record<string, string> = {
  '/reports': 'Reportes | CorreoBajoLupa',
  '/reports/new': 'Nuevo análisis | CorreoBajoLupa',
  '/users': 'Usuarios | CorreoBajoLupa',
};

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

  return (
    <div className="app-shell">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/reports" className="brand">
            Correo<span>BajoLupa</span>
          </NavLink>

          <nav aria-label="Navegación principal" className="main-nav">
            <NavLink to="/reports" end>
              Reportes
            </NavLink>
            <NavLink to="/reports/new">Nuevo análisis</NavLink>
            {hasRole('admin') && <NavLink to="/users">Usuarios</NavLink>}
          </nav>

          {user && (
            <div className="session-area">
              <div className="session-user">
                <span className="session-name">{user.displayName}</span>
                <RoleBadge role={user.role} />
              </div>
              <button type="button" className="btn btn-outline btn-small" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main id="contenido-principal" tabIndex={-1} className="main-content">
        <ErrorBox message={error} />
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>CorreoBajoLupa · Análisis explicable de correos sospechosos</p>
      </footer>
    </div>
  );
}
