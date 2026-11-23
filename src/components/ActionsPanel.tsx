import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { Action } from '../api/types';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorBox, formatDate, Notice } from './ui';

export function ActionsPanel({ incidentId }: { incidentId: string }) {
  const [items, setItems] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listIncidentActions(incidentId);
      setItems(data.items);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async () => {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.restoreAction(pending.id);
      setNotice(`Restauración: ${response.outcome}.`);
      setPending(null);
      await load();
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Acciones</h2>
      <p className="hint">Movimientos de cuarentena y restauración de este incidente.</p>

      <ErrorBox message={error} />
      {notice && <Notice message={notice} />}

      {loading ? (
        <p className="hint">Cargando acciones…</p>
      ) : items.length === 0 ? (
        <p className="hint">Todavía no hay acciones registradas.</p>
      ) : (
        <div className="table-wrapper" role="region" aria-labelledby="actions-caption" tabIndex={0}>
          <table className="reports-table actions-table">
            <caption id="actions-caption" className="visually-hidden">Acciones del incidente</caption>
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Mensaje</th>
                <th scope="col">Estado</th>
                <th scope="col">Actor</th>
                <th scope="col">Fecha</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((action) => (
                <tr key={action.id}>
                  <th scope="row">{action.type === 'quarantine' ? 'Cuarentena' : 'Restauración'}</th>
                  <td className="mono">{action.messageId}</td>
                  <td>
                    <span className={`badge badge-action-${action.status}`}>
                      {action.status === 'done' ? 'Realizada' : 'Fallida'}
                    </span>
                  </td>
                  <td>{action.actor.displayName}</td>
                  <td>{formatDate(action.createdAt)}</td>
                  <td>
                    {action.type === 'quarantine' && action.status === 'done' && (
                      <button type="button" className="row-action" onClick={() => setPending(action)}>
                        Restaurar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="¿Restaurar el mensaje?"
        description="Se verificará el mensaje antes de devolverlo a su ubicación original. La restauración queda en la auditoría."
        confirmLabel="Restaurar"
        busy={busy}
        onConfirm={restore}
        onClose={() => setPending(null)}
      />
    </section>
  );
}
