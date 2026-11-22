import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setCsrfToken, setUnauthorizedHandler } from '../api/client';
import type { LoginBody, RegisterBody, Role, Session, User } from '../api/types';

interface AuthValue {
  user: User | null;
  ready: boolean;
  login: (body: LoginBody) => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const applySession = useCallback((session: Session) => {
    setCsrfToken(session.csrfToken);
    setUser(session.user);
  }, []);

  const clear = useCallback(() => {
    setCsrfToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let alive = true;
    setUnauthorizedHandler(() => {
      if (alive) clear();
    });
    api.me()
      .then((session) => {
        if (alive) applySession(session);
      })
      .catch(() => {
        if (alive) clear();
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
      setUnauthorizedHandler(() => {});
    };
  }, [applySession, clear]);

  const login = useCallback(
    async (body: LoginBody) => {
      applySession(await api.login(body));
    },
    [applySession],
  );

  const register = useCallback(
    async (body: RegisterBody) => {
      applySession(await api.register(body));
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clear();
    }
  }, [clear]);

  const refresh = useCallback(async () => {
    applySession(await api.me());
  }, [applySession]);

  const hasRole = useCallback(
    (...roles: Role[]) => user !== null && roles.includes(user.role),
    [user],
  );

  const value = useMemo<AuthValue>(
    () => ({ user, ready, login, register, logout, refresh, hasRole }),
    [user, ready, login, register, logout, refresh, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
