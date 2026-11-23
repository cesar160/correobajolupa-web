import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Mailbox, MessageLocation, MessageSummary } from '../api/types';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorBox, PageHeader } from '../components/ui';

const PAGE_SIZE = 20;

const shortDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

export function MessagesPage() {
  const [items, setItems] = useState<MessageSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [mailboxId, setMailboxId] = useState('');
  const [location, setLocation] = useState<MessageLocation | ''>('inbox');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMailboxes()
      .then((data) => setMailboxes(data.items))
      .catch((failure) => setError(errorMessage(failure)));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.listMessages({ mailboxId: mailboxId || undefined, location, page, pageSize: PAGE_SIZE })
      .then((data) => { if (alive) { setItems(data.items); setTotal(data.total); } })
      .catch((failure) => { if (alive) setError(errorMessage(failure)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [mailboxId, location, page]);

  const mailboxLabel = (id: string) => {
    const mailbox = mailboxes.find((item) => item.id === id);
    return mailbox?.address ?? id;
  };

  const pills: Array<{ id: MessageLocation | ''; label: string }> = [
    { id: 'inbox', label: 'Bandeja de entrada' },
    { id: 'quarantine', label: 'Cuarentena' },
    { id: '', label: 'Todos' },
  ];

  return (
    <>
      <PageHeader
        title="Mensajes"
        description="Correos indexados de los buzones del laboratorio. Ningún enlace se visita."
      />

      <ErrorBox message={error} />

      <div className="filter-row">
        <div className="filter-pills" role="group" aria-label="Filtrar por ubicación">
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className="filter-pill"
              aria-pressed={location === pill.id}
              onClick={() => { setLocation(pill.id); setPage(1); }}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className="field field-inline">
          <label htmlFor="mailbox-filter" className="visually-hidden">Buzón</label>
          <select id="mailbox-filter" value={mailboxId} onChange={(event) => { setMailboxId(event.target.value); setPage(1); }}>
            <option value="">Todos los buzones</option>
            {mailboxes.map((mailbox) => (
              <option key={mailbox.id} value={mailbox.id}>{mailbox.address}</option>
            ))}
          </select>
        </div>
      </div>

      <section className="card">
        {loading ? (
          <p className="hint">Cargando mensajes…</p>
        ) : items.length === 0 ? (
          <EmptyState>
            <p>No hay mensajes con estos filtros</p>
            <p>Sincroniza un buzón o cambia la ubicación seleccionada.</p>
          </EmptyState>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="messages-caption" tabIndex={0}>
            <table className="reports-table messages-table">
              <caption id="messages-caption" className="visually-hidden">Mensajes indexados</caption>
              <thead>
                <tr>
                  <th scope="col">Asunto</th>
                  <th scope="col">Buzón</th>
                  <th scope="col">Ubicación</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Ver</th>
                </tr>
              </thead>
              <tbody>
                {items.map((message) => (
                  <tr key={message.id}>
                    <th scope="row">
                      {message.subject ?? '(sin asunto)'}
                      <span className="cell-sub">{message.fromAddress ?? 'remitente desconocido'}</span>
                    </th>
                    <td className="mono">{mailboxLabel(message.mailboxId)}</td>
                    <td>
                      <span className="badge">
                        {message.location === 'inbox' ? 'Bandeja' : 'Cuarentena'}
                        {message.quarantined ? ' · en cuarentena' : ''}
                      </span>
                    </td>
                    <td>{shortDate(message.date)}</td>
                    <td>
                      <Link to={`/messages/${message.id}`} aria-label={`Ver el mensaje ${message.subject ?? message.id}`}>
                        Ver detalle ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="mensajes" onChange={setPage} />
    </>
  );
}
