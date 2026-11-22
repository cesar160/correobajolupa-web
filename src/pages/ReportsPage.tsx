import { useCallback, useEffect, useState } from 'react';
import { Filter, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ReportStatus, ReportSummary } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import {
  EmptyState,
  ErrorBox,
  formatDate,
  Loading,
  PageHeader,
  PriorityBadge,
  StatusBadge,
} from '../components/ui';

const STATUSES: ReportStatus[] = ['queued', 'processing', 'completed', 'limited', 'failed'];
const STATUS_TEXT: Record<ReportStatus, string> = {
  queued: 'En cola',
  processing: 'Analizando',
  completed: 'Completado',
  limited: 'Limitado',
  failed: 'Fallido',
};

export function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ReportSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await api.listReports({ page, pageSize, status: status || undefined });
        setReports(data.items);
        setTotal(data.total);
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize, status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const hasPending = reports.some(
    (report) => report.status === 'queued' || report.status === 'processing',
  );

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void load(true), 4000);
    return () => window.clearInterval(timer);
  }, [hasPending, load]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteReport(pendingDelete.id);
      setPendingDelete(null);
      await load(true);
    } catch (failure) {
      setError(errorMessage(failure));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Correos enviados a análisis. El estado se actualiza solo mientras hay análisis en curso."
        actions={
          <Link className="btn btn-primary" to="/reports/new">
            <Icon as={Plus} /> Nuevo análisis
          </Link>
        }
      />

      <ErrorBox message={error} />

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
            <label htmlFor="filter-status">Filtrar por estado</label>
            <select
              id="filter-status"
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ReportStatus | '')}
            >
              <option value="">Todos</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_TEXT[value]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-outline">
            <Icon as={Filter} /> Aplicar filtro
          </button>
        </form>
      </search>

      {loading ? (
        <Loading label="Cargando reportes…" />
      ) : reports.length === 0 ? (
        <EmptyState>
          <p>No hay reportes todavía.</p>
          <Link to="/reports/new">Analizar tu primer correo</Link>
        </EmptyState>
      ) : (
        <div
          className="table-wrapper"
          role="region"
          aria-labelledby="reports-caption"
          tabIndex={0}
        >
          <table className="reports-table">
            <caption id="reports-caption">
              Reportes · página {page} de {totalPages} ({total} en total)
            </caption>
            <thead>
              <tr>
                <th scope="col">Asunto</th>
                <th scope="col">De</th>
                <th scope="col">Estado</th>
                <th scope="col">Prioridad</th>
                <th scope="col">Hallazgos</th>
                <th scope="col">Origen</th>
                <th scope="col">Creado</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <th scope="row">
                    <Link to={`/reports/${report.id}`}>
                      {report.subject ?? '(sin asunto)'}
                    </Link>
                  </th>
                  <td>{report.fromAddress ?? '—'}</td>
                  <td>
                    <StatusBadge status={report.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={report.priority} />
                  </td>
                  <td>{report.findingsCount}</td>
                  <td>{report.source === 'eml' ? 'Archivo .eml' : 'Texto pegado'}</td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => setPendingDelete(report)}
                    >
                      <Icon as={Trash2} /> Eliminar<span className="visually-hidden"> el reporte {report.subject ?? report.id}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > pageSize && (
        <nav aria-label="Paginación de reportes" className="pagination">
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="¿Eliminar este reporte?"
        description="Se borrarán el reporte, sus hallazgos y sus archivos. Esta acción no se puede deshacer."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
