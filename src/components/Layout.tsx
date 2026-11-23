import { useEffect, useRef, useState } from 'react';
import {
  Ban,
  ClipboardList,
  Fingerprint,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PlusCircle,
  ScrollText,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';
import { ErrorBox } from './ui';

const TITLES: Record<string, string> = {
  '/panel': 'Panel principal | CorreoBajoLupa',
  '/reports': 'Mis reportes | CorreoBajoLupa',
  '/reports/new': 'Analizar correo | CorreoBajoLupa',
  '/users': 'Usuarios | CorreoBajoLupa',
  '/indicators': 'Indicadores | CorreoBajoLupa',
  '/exclusions': 'Exclusiones | CorreoBajoLupa',
  '/mailboxes': 'Buzones | CorreoBajoLupa',
  '/messages': 'Mensajes | CorreoBajoLupa',
  '/incidents': 'Incidentes | CorreoBajoLupa',
  '/audit': 'Auditoría | CorreoBajoLupa',
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
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title =
      TITLES[location.pathname] ??
      (location.pathname.startsWith('/reports/')
        ? 'Detalle del reporte | CorreoBajoLupa'
        : 'CorreoBajoLupa');
  }, [location.pathname]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const sync = (event: Event) => {
      setMenuOpen((event as Event & { newState: string }).newState === 'open');
    };
    nav.addEventListener('toggle', sync);
    return () => nav.removeEventListener('toggle', sync);
  }, []);

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

  const closeMenu = () => navRef.current?.hidePopover();

  return (
    <div className="app-shell">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <NavLink to="/panel" className="brand">
            CorreoBajoLupa
          </NavLink>
          <span className="sidebar-eyebrow">ESPACIO DE REPORTANTE</span>
        </div>

        <button
          type="button"
          className="menu-button"
          popoverTarget="sidebar-nav"
          aria-controls="sidebar-nav"
          aria-expanded={menuOpen}
        >
          <Icon as={Menu} /> Menú
        </button>

        <nav
          ref={navRef}
          id="sidebar-nav"
          aria-label="Navegación principal"
          className="sidebar-nav"
          popover="auto"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) closeMenu();
          }}
        >
          <NavLink to="/panel" end>
            <Icon as={LayoutDashboard} /> Panel principal
          </NavLink>
          <NavLink to="/reports/new">
            <Icon as={PlusCircle} /> Analizar correo
          </NavLink>
          <NavLink to="/reports" end>
            <Icon as={ClipboardList} /> Mis reportes
          </NavLink>
          <NavLink to="/indicators">
            <Icon as={Fingerprint} /> Indicadores
          </NavLink>
          {hasRole('analyst', 'admin') && (
            <>
              <NavLink to="/mailboxes">
                <Icon as={Inbox} /> Buzones
              </NavLink>
              <NavLink to="/messages">
                <Icon as={Mail} /> Mensajes
              </NavLink>
              <NavLink to="/incidents">
                <Icon as={ShieldAlert} /> Incidentes
              </NavLink>
              <NavLink to="/audit">
                <Icon as={ScrollText} /> Auditoría
              </NavLink>
              <NavLink to="/exclusions">
                <Icon as={Ban} /> Exclusiones
              </NavLink>
            </>
          )}
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
