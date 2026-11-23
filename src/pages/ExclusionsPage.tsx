import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { Exclusion } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorBox, formatDate, Notice, PageHeader } from '../components/ui';

export function ExclusionsPage() {
  const [items, setItems] = useState<Exclusion[]>([]);
  const [domain, setDomain] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Exclusion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setError('');
    try {
      const data = await api.listExclusions();
      setItems(data.items);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.createExclusion({
        domain: domain.trim(),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setDomain('');
      setReason('');
      setNotice('Dominio excluido.');
      await load();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pending?.id) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteExclusion(pending.id);
      setNotice('Exclusión eliminada.');
      setPending(null);
      await load();
    } catch (failure) {
      setError(errorMessage(failure));
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Exclusiones"
        description="Dominios que no deben generar candidatos. Las exclusiones de configuración son solo lectura."
      />

      <ErrorBox message={error} />
      {notice && <Notice message={notice} />}

      <section className="card exclusion-form">
        <h2>Añadir dominio</h2>
        <form onSubmit={submit} className="exclusion-fields">
          <div className="field">
            <label htmlFor="exclusion-domain">Dominio</label>
            <input id="exclusion-domain" required value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="ejemplo.invalid" />
          </div>
          <div className="field">
            <label htmlFor="exclusion-reason">Motivo (opcional)</label>
            <input id="exclusion-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Añadir'}
          </button>
        </form>
      </section>

      <section className="card">
        {items.length === 0 ? (
          <p className="hint">No hay exclusiones registradas.</p>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="exclusions-caption" tabIndex={0}>
            <table className="reports-table exclusions-table">
              <caption id="exclusions-caption" className="visually-hidden">Exclusiones</caption>
              <thead>
                <tr>
                  <th scope="col">Dominio</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.domain}-${index}`}>
                    <th scope="row" className="mono">{item.domain}</th>
                    <td>
                      <span className={`badge badge-source-${item.source}`}>
                        {item.source === 'config' ? 'Configuración' : 'Manual'}
                      </span>
                    </td>
                    <td>{item.reason ?? '—'}</td>
                    <td>
                      {item.source === 'manual' && item.id ? (
                        <button
                          type="button"
                          className="row-action"
                          aria-label={`Eliminar exclusión ${item.domain}`}
                          onClick={() => setPending(item)}
                        >
                          Eliminar
                        </button>
                      ) : (
                        <span className="hint">Solo lectura{item.createdAt ? ` · ${formatDate(item.createdAt)}` : ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pending !== null}
        title="¿Eliminar esta exclusión?"
        description={`El dominio ${pending?.domain ?? ''} volverá a considerarse en la búsqueda de candidatos.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPending(null)}
      />
    </>
  );
}
