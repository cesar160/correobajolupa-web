import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import type { Mailbox, MailboxLabel, SyncResult } from '../api/types';
import { Icon } from '../components/Icon';
import { ErrorBox, formatDate, Notice, PageHeader } from '../components/ui';

const LABEL: Record<MailboxLabel, string> = {
  student: 'Estudiantes',
  teacher: 'Docentes',
  staff: 'Administrativo',
};

const SYNC_LABEL = {
  ok: 'Correcta',
  error: 'Con error',
  never: 'Nunca',
};

export function MailboxesPage() {
  const [items, setItems] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<Mailbox | null>(null);
  const [reportId, setReportId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listMailboxes();
      setItems(data.items);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (delivering && !dialog.open) dialog.showModal();
    if (!delivering && dialog.open) dialog.close();
  }, [delivering]);

  const sync = async (mailbox: Mailbox) => {
    setSyncing(mailbox.id);
    setError('');
    setNotice('');
    try {
      const result: SyncResult = await api.syncMailbox(mailbox.id);
      setNotice(
        `Sincronización de ${LABEL[mailbox.label]}: ${result.fetched} obtenidos, ${result.added} nuevos, ${result.updated} actualizados.` +
          (result.uidValidityChanged ? ' El buzón cambió de UIDVALIDITY: vuelve a sincronizar.' : ''),
      );
      await load();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSyncing(null);
    }
  };

  const deliver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!delivering) return;
    setSaving(true);
    setFormError('');
    try {
      await api.simulateDelivery(delivering.id, reportId.trim());
      setDelivering(null);
      setReportId('');
      setNotice('Mensaje entregado al buzón de laboratorio.');
      await load();
    } catch (failure) {
      setFormError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Buzones"
        description="Buzones del laboratorio IMAP. La sincronización y la entrega simulada son acciones auditadas."
      />

      <ErrorBox message={error} />
      {notice && <Notice message={notice} />}

      <section className="card">
        {loading ? (
          <p className="hint">Cargando buzones…</p>
        ) : items.length === 0 ? (
          <p className="hint">No hay buzones configurados.</p>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="mailboxes-caption" tabIndex={0}>
            <table className="reports-table mailboxes-table">
              <caption id="mailboxes-caption" className="visually-hidden">Buzones del laboratorio</caption>
              <thead>
                <tr>
                  <th scope="col">Buzón</th>
                  <th scope="col">Dirección</th>
                  <th scope="col">Mensajes</th>
                  <th scope="col">Última sincronización</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((mailbox) => (
                  <tr key={mailbox.id}>
                    <th scope="row">{LABEL[mailbox.label]}</th>
                    <td className="mono">{mailbox.address}</td>
                    <td>{mailbox.messageCount}</td>
                    <td>
                      <span className={`badge badge-sync-${mailbox.lastSyncStatus}`}>
                        {SYNC_LABEL[mailbox.lastSyncStatus]}
                      </span>
                      {mailbox.lastSyncAt && <span className="cell-sub">{formatDate(mailbox.lastSyncAt)}</span>}
                    </td>
                    <td>
                      <div className="action-cell">
                        <button
                          type="button"
                          className="row-action"
                          disabled={syncing === mailbox.id}
                          onClick={() => void sync(mailbox)}
                        >
                          <Icon as={RefreshCw} size={14} />
                          {syncing === mailbox.id ? 'Sincronizando…' : 'Sincronizar'}
                        </button>
                        <button
                          type="button"
                          className="row-action"
                          onClick={() => { setFormError(''); setDelivering(mailbox); }}
                        >
                          <Icon as={Send} size={14} /> Simular entrega
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <dialog ref={dialogRef} aria-labelledby="delivery-title" onClose={() => setDelivering(null)}>
        <h2 id="delivery-title">Entrega simulada</h2>
        <p>Se agregará al buzón {delivering?.address ?? ''} el mensaje de un reporte subido como .eml.</p>
        <ErrorBox message={formError} />
        <form onSubmit={deliver} className="form-stack">
          <div className="field">
            <label htmlFor="delivery-report">ID del reporte</label>
            <input id="delivery-report" required value={reportId} onChange={(event) => setReportId(event.target.value)} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setDelivering(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Entregando…' : 'Entregar'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
