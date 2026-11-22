import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { Role, User } from '../api/types';
import { EmptyState, ErrorBox, formatDate, Loading, PageHeader, RoleBadge } from '../components/ui';

const ROLES: Role[] = ['reporter', 'analyst', 'admin'];
const ROLE_TEXT: Record<Role, string> = {
  reporter: 'Reportante',
  analyst: 'Analista',
  admin: 'Administrador',
};

interface Draft {
  role?: Role;
  active?: boolean;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [role, setRole] = useState<Role | ''>('');
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await api.listUsers({ page, pageSize, role: role || undefined });
        setUsers(data.items);
        setTotal(data.total);
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize, role],
  );

  useEffect(() => {
    setDrafts({});
    void load();
  }, [load]);

  const setDraft = (userId: string, change: Draft) => {
    setNotice('');
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], ...change },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ids = Object.keys(drafts);
    if (ids.length === 0) return;
    setBusy(true);
    setError('');
    setNotice('');
    const failures: string[] = [];
    for (const userId of ids) {
      try {
        await api.updateUser(userId, drafts[userId]);
      } catch (failure) {
        failures.push(`${userId}: ${errorMessage(failure)}`);
      }
    }
    setDrafts({});
    await load(true);
    if (failures.length) setError(failures.join(' · '));
    else setNotice('Cambios guardados. Las sesiones afectadas se cerraron.');
    setBusy(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Solo administradores. Cambiar el rol o desactivar una cuenta cierra sus sesiones."
      />

      <ErrorBox message={error} />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <search>
        <form
          className="filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <div className="field field-inline">
            <label htmlFor="filter-role">Filtrar por rol</label>
            <select
              id="filter-role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role | '')}
            >
              <option value="">Todos</option>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_TEXT[value]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-outline">
            Aplicar filtro
          </button>
        </form>
      </search>

      {loading ? (
        <Loading label="Cargando usuarios…" />
      ) : users.length === 0 ? (
        <EmptyState>
          <p>No hay usuarios que coincidan con el filtro.</p>
        </EmptyState>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="table-wrapper" role="region" aria-labelledby="users-caption" tabIndex={0}>
            <table className="reports-table users-table">
              <caption id="users-caption">
                Usuarios · página {page} de {totalPages} ({total} en total)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Rol actual</th>
                  <th scope="col">Nuevo rol</th>
                  <th scope="col">Cuenta</th>
                  <th scope="col">Alta</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <th scope="row">{user.displayName}</th>
                    <td>{user.email}</td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <select
                        aria-label={`Nuevo rol de ${user.displayName}`}
                        value={drafts[user.id]?.role ?? user.role}
                        onChange={(event) =>
                          setDraft(user.id, { role: event.target.value as Role })
                        }
                      >
                        {ROLES.map((value) => (
                          <option key={value} value={value}>
                            {ROLE_TEXT[value]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={drafts[user.id]?.active ?? user.active}
                          onChange={(event) => setDraft(user.id, { active: event.target.checked })}
                        />
                        <span>{drafts[user.id]?.active ?? user.active ? 'Activa' : 'Inactiva'}</span>
                      </label>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="save-bar">
            <p className="hint" aria-live="polite">
              {Object.keys(drafts).length > 0
                ? `${Object.keys(drafts).length} usuario(s) con cambios sin guardar.`
                : 'Sin cambios pendientes.'}
            </p>
            <button type="submit" className="btn btn-primary" disabled={busy || Object.keys(drafts).length === 0}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {!loading && total > pageSize && (
        <nav aria-label="Paginación de usuarios" className="pagination">
          <button
            type="button"
            className="btn btn-outline btn-small"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Anterior
          </button>
          <span aria-live="polite">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-small"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Siguiente
          </button>
        </nav>
      )}
    </>
  );
}
