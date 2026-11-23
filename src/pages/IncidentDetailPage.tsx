import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../api/client';
import type { IncidentDetail, IncidentStatus } from '../api/types';
import { EmptyState, ErrorBox, formatDate, Loading, Notice, PageHeader, StatusBadge, Tabs } from '../components/ui';

const STATUS_LABEL: Record<IncidentStatus, string> = {
  received: 'Recibido',
  analyzing: 'En análisis',
  contained: 'Contenido',
  closed: 'Cerrado',
  false_positive: 'Falso positivo',
};

export function IncidentDetailPage() {
  const { id = '' } = useParams();
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [assoc, setAssoc] = useState<'report' | 'indicator' | null>(null);
  const [assocValue, setAssocValue] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      setDetail(await api.getIncident(id));
      setNotFound(false);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'not_found') setNotFound(true);
      else setError(errorMessage(failure));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (assoc && !dialog.open) dialog.showModal();
    if (!assoc && dialog.open) dialog.close();
  }, [assoc]);

  const changeStatus = async (status: IncidentStatus) => {
    setNotice('');
    try {
      setDetail(await api.updateIncident(id, { status }));
      setNotice('Estado actualizado.');
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const addAssociation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assoc) return;
    setSaving(true);
    setError('');
    try {
      setDetail(assoc === 'report'
        ? await api.addIncidentReport(id, assocValue.trim())
        : await api.addIncidentIndicator(id, assocValue.trim()));
      setAssoc(null);
      setAssocValue('');
      setNotice(assoc === 'report' ? 'Reporte asociado.' : 'Indicador asociado.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const removeAssociation = async (kind: 'report' | 'indicator', value: string) => {
    setError('');
    try {
      if (kind === 'report') await api.removeIncidentReport(id, value);
      else await api.removeIncidentIndicator(id, value);
      setNotice('Asociación eliminada.');
      await load(true);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.addComment(id, comment.trim());
      setComment('');
      await load(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <>
        <PageHeader title="Incidente no encontrado" />
        <EmptyState>
          <p>Este incidente no existe o no está disponible para tu cuenta.</p>
          <Link to="/incidents">Volver a incidentes</Link>
        </EmptyState>
      </>
    );
  }

  if (loading) return <Loading label="Cargando incidente…" />;
  if (error) return <ErrorBox message={error} />;
  if (!detail) return null;

  return (
    <>
      <PageHeader
        title={detail.title}
        description={detail.description ?? `Creado por ${detail.createdBy.displayName} el ${formatDate(detail.createdAt)}`}
      />

      <ErrorBox message={error} />
      {notice && <Notice message={notice} />}

      <div className="detail-meta">
        <div><span className="meta-label">Estado</span><span className={`badge badge-incident-${detail.status}`}>{STATUS_LABEL[detail.status]}</span></div>
        <div><span className="meta-label">Reportes</span><span>{detail.reportsCount}</span></div>
        <div><span className="meta-label">Indicadores</span><span>{detail.indicatorsCount}</span></div>
        <div><span className="meta-label">Creado por</span><span>{detail.createdBy.displayName}</span></div>
        <div><span className="meta-label">Actualizado</span><span>{formatDate(detail.updatedAt)}</span></div>
      </div>

      <div className="filter-row">
        <div className="field field-inline">
          <label htmlFor="incident-status">Cambiar estado</label>
          <select
            id="incident-status"
            value={detail.status}
            onChange={(event) => void changeStatus(event.target.value as IncidentStatus)}
          >
            {(Object.keys(STATUS_LABEL) as IncidentStatus[]).map((value) => (
              <option key={value} value={value}>{STATUS_LABEL[value]}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs
        label="Secciones del incidente"
        items={[
          {
            id: 'reportes',
            label: `Reportes (${detail.reports.length})`,
            content: (
              <section className="card">
                <div className="reports-card-head">
                  <h2>Reportes asociados</h2>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => { setError(''); setAssoc('report'); }}>
                    Asociar reporte
                  </button>
                </div>
                {detail.reports.length === 0 ? (
                  <p className="hint">No hay reportes asociados.</p>
                ) : (
                  <ul className="assoc-list">
                    {detail.reports.map((report) => (
                      <li key={report.id}>
                        <Link to={`/reports/${report.id}`}>{report.subject ?? report.id}</Link>
                        <StatusBadge status={report.status} findingsCount={report.findingsCount} />
                        <button type="button" className="row-action" onClick={() => void removeAssociation('report', report.id)}>Quitar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: 'indicadores',
            label: `Indicadores (${detail.indicators.length})`,
            content: (
              <section className="card">
                <div className="reports-card-head">
                  <h2>Indicadores asociados</h2>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => { setError(''); setAssoc('indicator'); }}>
                    Asociar indicador
                  </button>
                </div>
                {detail.indicators.length === 0 ? (
                  <p className="hint">No hay indicadores asociados.</p>
                ) : (
                  <ul className="assoc-list">
                    {detail.indicators.map((indicator) => (
                      <li key={indicator.id}>
                        <span className="rule-id">{indicator.type}</span>
                        <span className="mono">{indicator.displayValue}</span>
                        <button type="button" className="row-action" onClick={() => void removeAssociation('indicator', indicator.id)}>Quitar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: 'comentarios',
            label: `Comentarios (${detail.comments.length})`,
            content: (
              <section className="card">
                <h2>Comentarios</h2>
                <p className="hint">Los comentarios no se editan ni se borran.</p>
                <form onSubmit={submitComment} className="comment-form">
                  <label htmlFor="new-comment" className="visually-hidden">Nuevo comentario</label>
                  <textarea
                    id="new-comment"
                    rows={3}
                    maxLength={2000}
                    placeholder="Escribe un comentario…"
                    required
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={saving}>Añadir comentario</button>
                </form>
                {detail.comments.length === 0 ? (
                  <p className="hint">Todavía no hay comentarios.</p>
                ) : (
                  <ul className="comment-list">
                    {detail.comments.map((item) => (
                      <li key={item.id}>
                        <div className="comment-head">
                          <strong>{item.author.displayName}</strong>
                          <span className="hint">{formatDate(item.createdAt)}</span>
                        </div>
                        <p>{item.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
        ]}
      />

      <div className="doc-actions">
        <Link className="btn btn-outline" to="/incidents">Volver a incidentes</Link>
      </div>

      <dialog ref={dialogRef} aria-labelledby="assoc-title" onClose={() => setAssoc(null)}>
        <h2 id="assoc-title">{assoc === 'report' ? 'Asociar reporte' : 'Asociar indicador'}</h2>
        <ErrorBox message={error} />
        <form onSubmit={addAssociation} className="form-stack">
          <div className="field">
            <label htmlFor="assoc-value">ID {assoc === 'report' ? 'del reporte' : 'del indicador'}</label>
            <input id="assoc-value" required value={assocValue} onChange={(event) => setAssocValue(event.target.value)} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setAssoc(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>Asociar</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
