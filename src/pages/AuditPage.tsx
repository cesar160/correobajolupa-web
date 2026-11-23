import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { AuditEvent } from '../api/types';
import { ErrorBox, formatDate, PageHeader } from '../components/ui';

export function AuditPage() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.listAudit({
      action: action || undefined,
      actorId: actorId || undefined,
      from: from || undefined,
      to: to || undefined,
      page: 1,
      pageSize: 100,
    })
      .then((data) => { if (alive) setItems(data.items); })
      .catch((failure) => { if (alive) setError(errorMessage(failure)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [action, actorId, from, to]);

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro de acciones del sistema. Nunca incluye asuntos, cuerpos ni direcciones completas."
      />

      <ErrorBox message={error} />

      <div className="filter-row">
        <div className="field field-inline">
          <label htmlFor="audit-action">Acción</label>
          <input id="audit-action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="quarantine.execute" />
        </div>
        <div className="field field-inline">
          <label htmlFor="audit-actor">ID de actor</label>
          <input id="audit-actor" value={actorId} onChange={(event) => setActorId(event.target.value)} />
        </div>
        <div className="field field-inline">
          <label htmlFor="audit-from">Desde</label>
          <input id="audit-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="field field-inline">
          <label htmlFor="audit-to">Hasta</label>
          <input id="audit-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>

      <section className="card">
        {loading ? (
          <p className="hint">Cargando auditoría…</p>
        ) : items.length === 0 ? (
          <p className="hint">No hay eventos con estos filtros.</p>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="audit-caption" tabIndex={0}>
            <table className="reports-table audit-table">
              <caption id="audit-caption" className="visually-hidden">Eventos de auditoría</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Resultado</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Objetivo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.at)}</td>
                    <th scope="row" className="mono">{event.action}</th>
                    <td><span className={`badge badge-audit-${event.result}`}>{event.result}</span></td>
                    <td>{event.actor?.displayName ?? 'Sistema'}</td>
                    <td>
                      {event.targetType ?? '—'}
                      {event.requestId && <span className="cell-sub mono">{event.requestId}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
