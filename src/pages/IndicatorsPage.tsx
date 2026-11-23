import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Indicator, IndicatorStatus, IndicatorType } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Pagination } from '../components/Pagination';
import { ErrorBox, formatDate, Notice, PageHeader } from '../components/ui';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<IndicatorStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  dismissed: 'Descartado',
};

const TYPE_LABEL: Record<IndicatorType, string> = {
  domain: 'Dominio',
  url: 'URL',
  sha256: 'SHA-256',
  sender: 'Remitente',
};

export function IndicatorsPage() {
  const { hasRole } = useAuth();
  const canDecide = hasRole('analyst', 'admin');
  const [items, setItems] = useState<Indicator[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<IndicatorStatus | ''>('');
  const [type, setType] = useState<IndicatorType | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [proposing, setProposing] = useState(false);
  const [formType, setFormType] = useState<IndicatorType>('domain');
  const [formValue, setFormValue] = useState('');
  const [formReportId, setFormReportId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listIndicators({ status, type, page, pageSize: PAGE_SIZE });
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
  }, [status, type, page]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (proposing && !dialog.open) dialog.showModal();
    if (!proposing && dialog.open) dialog.close();
  }, [proposing]);

  const decide = async (id: string, action: 'confirm' | 'dismiss') => {
    setError('');
    setNotice('');
    try {
      await (action === 'confirm' ? api.confirmIndicator(id) : api.dismissIndicator(id));
      setNotice(action === 'confirm' ? 'Indicador confirmado.' : 'Indicador descartado.');
      await load();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.createIndicator({
        type: formType,
        value: formValue.trim(),
        ...(formReportId.trim() ? { reportId: formReportId.trim() } : {}),
        ...(formNote.trim() ? { note: formNote.trim() } : {}),
      });
      setProposing(false);
      setFormValue('');
      setFormReportId('');
      setFormNote('');
      setNotice('Indicador propuesto.');
      await load();
    } catch (failure) {
      setFormError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const pills: Array<{ id: IndicatorStatus | ''; label: string }> = [
    { id: '', label: 'Todos' },
    { id: 'proposed', label: 'Propuestos' },
    { id: 'confirmed', label: 'Confirmados' },
    { id: 'dismissed', label: 'Descartados' },
  ];

  return (
    <>
      <PageHeader
        title="Indicadores"
        description="Señales propuestas a partir de los correos analizados. Una coincidencia no confirma una campaña."
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
        <div className="field field-inline">
          <label htmlFor="indicator-type" className="visually-hidden">Tipo de indicador</label>
          <select
            id="indicator-type"
            value={type}
            onChange={(event) => { setType(event.target.value as IndicatorType | ''); setPage(1); }}
          >
            <option value="">Todos los tipos</option>
            {(Object.keys(TYPE_LABEL) as IndicatorType[]).map((value) => (
              <option key={value} value={value}>{TYPE_LABEL[value]}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setProposing(true)}>
          Proponer indicador
        </button>
      </div>

      <section className="card">
        {loading ? (
          <p className="hint">Cargando indicadores…</p>
        ) : items.length === 0 ? (
          <p className="hint">No hay indicadores que coincidan con el filtro.</p>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="indicators-caption" tabIndex={0}>
            <table className="reports-table indicators-table">
              <caption id="indicators-caption" className="visually-hidden">Indicadores</caption>
              <thead>
                <tr>
                  <th scope="col">Indicador</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Propuesto por</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((indicator) => (
                  <tr key={indicator.id}>
                    <th scope="row">
                      <span className="rule-id">{TYPE_LABEL[indicator.type]}</span>
                      <span className="cell-sub mono">{indicator.displayValue}</span>
                    </th>
                    <td><span className={`badge badge-indicator-${indicator.status}`}>{STATUS_LABEL[indicator.status]}</span></td>
                    <td>{indicator.proposedBy.displayName}</td>
                    <td>{formatDate(indicator.createdAt)}</td>
                    <td>
                      <div className="action-cell">
                        {canDecide && indicator.status === 'proposed' && (
                          <>
                            <button type="button" className="row-action" aria-label={`Confirmar ${indicator.displayValue}`} onClick={() => void decide(indicator.id, 'confirm')}>
                              Confirmar
                            </button>
                            <button type="button" className="row-action" aria-label={`Descartar ${indicator.displayValue}`} onClick={() => void decide(indicator.id, 'dismiss')}>
                              Descartar
                            </button>
                          </>
                        )}
                        {indicator.status === 'confirmed' && (
                          <Link to={`/indicators/${indicator.id}/candidates`}>Ver candidatos ↗</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="indicadores" onChange={setPage} />

      <dialog ref={dialogRef} aria-labelledby="propose-title" onClose={() => setProposing(false)}>
        <h2 id="propose-title">Proponer indicador</h2>
        <p>El valor se normalizará y se entregará desactivado.</p>
        <ErrorBox message={formError} />
        <form onSubmit={submit} className="form-stack">
          <div className="field">
            <label htmlFor="new-type">Tipo</label>
            <select id="new-type" value={formType} onChange={(event) => setFormType(event.target.value as IndicatorType)}>
              {(Object.keys(TYPE_LABEL) as IndicatorType[]).map((value) => (
                <option key={value} value={value}>{TYPE_LABEL[value]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-value">Valor</label>
            <input id="new-value" required value={formValue} onChange={(event) => setFormValue(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="new-report">ID del reporte</label>
            <input id="new-report" value={formReportId} onChange={(event) => setFormReportId(event.target.value)} placeholder="Obligatorio si eres reportante" />
          </div>
          <div className="field">
            <label htmlFor="new-note">Nota (opcional)</label>
            <textarea id="new-note" rows={3} value={formNote} onChange={(event) => setFormNote(event.target.value)} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setProposing(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Proponer'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
