import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ListFilter, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ReportSummary } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorBox, Notice, PageHeader, StatusBadge } from '../components/ui';

type Category = 'all' | 'analyzing' | 'findings' | 'clean';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

export function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [newestFirst, setNewestFirst] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ReportSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await api.listReports({ page, pageSize });
        setReports(data.items);
        setTotal(data.total);
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize],
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

  const counts = {
    all: total,
    analyzing: reports.filter((r) => r.status === 'queued' || r.status === 'processing').length,
    findings: reports.filter((r) => r.findingsCount > 0).length,
    clean: reports.filter((r) => r.findingsCount === 0 || r.status === 'limited').length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reports.filter((report) => {
      if (category === 'analyzing' && report.status !== 'queued' && report.status !== 'processing') return false;
      if (category === 'findings' && report.findingsCount <= 0) return false;
      if (category === 'clean' && report.findingsCount > 0 && report.status !== 'limited') return false;
      if (!q) return true;
      return [report.subject, report.fromAddress, report.id].some((value) =>
        value?.toLowerCase().includes(q),
      );
    });
    return newestFirst ? list : [...list].reverse();
  }, [reports, query, category, newestFirst]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteReport(pendingDelete.id);
      setNotice('El reporte se eliminó correctamente.');
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
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);

  const pills: Array<{ id: Category; label: string; count: number }> = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'analyzing', label: 'En análisis', count: counts.analyzing },
    { id: 'findings', label: 'Con hallazgos', count: counts.findings },
    { id: 'clean', label: 'Sin señales altas', count: counts.clean },
  ];

  return (
    <>
      <PageHeader
        title="Mis reportes"
        description="Consulta y organiza los mensajes que has enviado para análisis."
      />

      <ErrorBox message={error} />
      {notice && <Notice message={notice} />}

      <div className="search-row">
        <div className="search-field">
          <Icon as={Search} size={18} />
          <input
            type="search"
            aria-label="Buscar reportes"
            placeholder="Buscar por asunto, remitente o ID de reporte..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Link className="btn btn-primary" to="/reports/new">
          <Icon as={Plus} /> Analizar nuevo correo
        </Link>
      </div>

      <section className="card reports-card">
        <div className="reports-card-head">
          <div>
            <h2>Todos los reportes</h2>
            <p className="hint">Registro de los análisis enviados desde tu cuenta.</p>
          </div>
          <span className="count-pill">{total} reportes</span>
        </div>

        <div className="filter-row">
          <div className="filter-pills" role="group" aria-label="Filtrar reportes">
            {pills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                className="filter-pill"
                aria-pressed={category === pill.id}
                onClick={() => setCategory(pill.id)}
              >
                {pill.label} · {pill.count}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sort-pill"
            onClick={() => setNewestFirst((value) => !value)}
          >
            <Icon as={ListFilter} size={14} />
            {newestFirst ? 'Más recientes' : 'Más antiguos'}
          </button>
        </div>

        {loading ? (
          <EmptyState><p>Cargando reportes…</p></EmptyState>
        ) : reports.length === 0 ? (
          <EmptyState>
            <p>Todavía no has enviado reportes</p>
            <p>Cuando analices un mensaje sospechoso aparecerá aquí para que consultes sus resultados.</p>
            <Link className="btn btn-primary" to="/reports/new">Analizar mi primer correo ↗</Link>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>
            <p>No encontramos coincidencias</p>
            <p>Prueba otro asunto, remitente o identificador de reporte.</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { setQuery(''); setCategory('all'); }}
            >
              Limpiar búsqueda
            </button>
          </EmptyState>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="reports-caption" tabIndex={0}>
            <table className="reports-table">
              <caption id="reports-caption" className="visually-hidden">Listado de reportes</caption>
              <thead>
                <tr>
                  <th scope="col">Asunto del correo</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((report) => (
                  <tr key={report.id}>
                    <th scope="row">
                      <Link
                        to={`/reports/${report.id}`}
                        onClick={(event) => {
                          (event.currentTarget as HTMLElement).style.viewTransitionName = 'report-title';
                        }}
                      >
                        {report.subject ?? '(sin asunto)'}
                      </Link>
                      <span className="cell-sub">
                        {report.id} · {report.fromAddress ?? 'remitente desconocido'}
                      </span>
                    </th>
                    <td>{shortDate(report.createdAt)}</td>
                    <td>
                      <StatusBadge status={report.status} findingsCount={report.findingsCount} />
                    </td>
                    <td>
                      <div className="action-cell">
                        <Link to={`/reports/${report.id}`}>
                          Ver análisis <Icon as={ArrowUpRight} size={14} />
                        </Link>
                        <button
                          type="button"
                          className="row-action"
                          aria-label={`Eliminar el reporte ${report.subject ?? report.id}`}
                          onClick={() => setPendingDelete(report)}
                        >
                          <Icon as={Trash2} size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="pagination">
            <span>Mostrando {from}–{to} de {total} reportes</span>
            <nav aria-label="Paginación de reportes" className="page-controls">
              <button
                type="button"
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  className="page-btn"
                  aria-current={number === page ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Siguiente
              </button>
            </nav>
          </div>
        )}
      </section>

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
