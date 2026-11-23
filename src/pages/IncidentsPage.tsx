import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { IncidentStatus, IncidentSummary } from '../api/types';
import { Pagination } from '../components/Pagination';
import { ErrorBox, formatDate, Notice, PageHeader } from '../components/ui';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<IncidentStatus, string> = {
  received: 'Recibido',
  analyzing: 'En análisis',
  contained: 'Contenido',
  closed: 'Cerrado',
  false_positive: 'Falso positivo',
};

export function IncidentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<IncidentSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listIncidents({ status, page, pageSize: PAGE_SIZE });
      setItems(data.items);
      setTotal(data.total);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status, page]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (creating && !dialog.open) dialog.showModal();
    if (!creating && dialog.open) dialog.close();
  }, [creating]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const incident = await api.createIncident({
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setCreating(false);
      setTitle('');
      setDescription('');
      setNotice('Incidente creado.');
      await load();
      navigate(`/incidents/${incident.id}`);
    } catch (failure) {
      setFormError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const pills: Array<{ id: IncidentStatus | ''; label: string }> = [
    { id: '', label: 'Todos' },
    { id: 'received', label: 'Recibidos' },
    { id: 'analyzing', label: 'En análisis' },
    { id: 'contained', label: 'Contenidos' },
    { id: 'closed', label: 'Cerrados' },
    { id: 'false_positive', label: 'Falsos positivos' },
  ];

  return (
    <>
      <PageHeader
        title="Incidentes"
        description="Agrupa reportes e indicadores relacionados para coordinar la respuesta."
      />

      <ErrorBox message={error} />
      {notice && <Notice message={notice} />}

      <div className="filter-row">
        <div className="filter-pills" role="group" aria-label="Filtrar por estado">
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className="filter-pill"
              aria-pressed={status === pill.id}
              onClick={() => { setStatus(pill.id); setPage(1); }}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setFormError(''); setCreating(true); }}>
          Nuevo incidente
        </button>
      </div>

      <section className="card">
        {loading ? (
          <p className="hint">Cargando incidentes…</p>
        ) : items.length === 0 ? (
          <p className="hint">No hay incidentes con este estado.</p>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="incidents-caption" tabIndex={0}>
            <table className="reports-table incidents-table">
              <caption id="incidents-caption" className="visually-hidden">Incidentes</caption>
              <thead>
                <tr>
                  <th scope="col">Incidente</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Reportes</th>
                  <th scope="col">Indicadores</th>
                  <th scope="col">Actualizado</th>
                  <th scope="col">Ver</th>
                </tr>
              </thead>
              <tbody>
                {items.map((incident) => (
                  <tr key={incident.id}>
                    <th scope="row">
                      {incident.title}
                      <span className="cell-sub">{incident.createdBy.displayName}</span>
                    </th>
                    <td><span className={`badge badge-incident-${incident.status}`}>{STATUS_LABEL[incident.status]}</span></td>
                    <td>{incident.reportsCount}</td>
                    <td>{incident.indicatorsCount}</td>
                    <td>{formatDate(incident.updatedAt)}</td>
                    <td><Link to={`/incidents/${incident.id}`}>Abrir ↗</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="incidentes" onChange={setPage} />

      <dialog ref={dialogRef} aria-labelledby="incident-title" onClose={() => setCreating(false)}>
        <h2 id="incident-title">Nuevo incidente</h2>
        <ErrorBox message={formError} />
        <form onSubmit={submit} className="form-stack">
          <div className="field">
            <label htmlFor="new-incident-title">Título</label>
            <input id="new-incident-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="new-incident-desc">Descripción (opcional)</label>
            <textarea id="new-incident-desc" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
