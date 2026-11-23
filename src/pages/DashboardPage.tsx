import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, CircleCheck, Clock, FileText, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ReportSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorBox, PageHeader, StatusBadge } from '../components/ui';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

export function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.listReports({ page: 1, pageSize: 5 });
      setReports(data.items);
      setTotal(data.total);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const stats = [
    {
      label: 'Total de reportes',
      value: total,
      caption: 'Registrados esta semana',
      icon: FileText,
    },
    {
      label: 'En análisis',
      value: reports.filter((r) => r.status === 'queued' || r.status === 'processing').length,
      caption: 'Pendientes de resultado',
      icon: Clock,
    },
    {
      label: 'Con hallazgos',
      value: reports.filter((r) => r.findingsCount > 0).length,
      caption: 'Señales detectadas',
      icon: TriangleAlert,
    },
    {
      label: 'Sin señales altas',
      value: reports.filter(
        (r) => r.findingsCount === 0 && r.status !== 'queued' && r.status !== 'processing',
      ).length,
      caption: 'Sin señales relevantes',
      icon: CircleCheck,
    },
  ];

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.displayName?.split(' ')[0] ?? ''}`}
        description="Resumen de tus mensajes y resultados recientes."
      />

      <ErrorBox message={error} />

      <article className="hero-card">
        <div>
          <p className="hero-eyebrow">
            <span className="hero-dot" aria-hidden="true" /> Centro de análisis
          </p>
          <h2>¿Recibiste un correo sospechoso?</h2>
          <p>
            Carga el mensaje original o pega su contenido para identificar señales de riesgo y
            consultar un informe detallado.
          </p>
        </div>
        <Link className="btn btn-light" to="/reports/new">
          Analizar un correo <Icon as={ArrowUpRight} />
        </Link>
      </article>

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="card stat-card" key={stat.label}>
            <div className="stat-head">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-icon"><Icon as={stat.icon} size={16} /></span>
            </div>
            <span className="stat-number">{stat.value}</span>
            <span className="stat-caption">{stat.caption}</span>
          </article>
        ))}
      </div>

      <section className="card recent-card">
        <div className="recent-card-head">
          <div>
            <h2>Reportes recientes</h2>
            <p className="hint">Últimos mensajes enviados para revisión de seguridad.</p>
          </div>
          <Link className="btn btn-outline btn-small" to="/reports">
            Ver todos <Icon as={ArrowUpRight} size={14} />
          </Link>
        </div>

        {loading ? (
          <EmptyState><p>Cargando reportes…</p></EmptyState>
        ) : reports.length === 0 ? (
          <EmptyState>
            <p>Todavía no tienes reportes</p>
            <p>Cuando analices tu primer correo, aquí encontrarás su asunto, fecha y estado.</p>
            <Link className="btn btn-primary" to="/reports/new">Analizar mi primer correo ↗</Link>
          </EmptyState>
        ) : (
          <div className="table-wrapper" role="region" aria-labelledby="recent-caption" tabIndex={0}>
            <table className="reports-table recent-table">
              <caption id="recent-caption" className="visually-hidden">Reportes recientes</caption>
              <thead>
                <tr>
                  <th scope="col">Asunto del correo</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Ver</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <th scope="row">
                      <Link to={`/reports/${report.id}`}>{report.subject ?? '(sin asunto)'}</Link>
                    </th>
                    <td>{shortDate(report.createdAt)}</td>
                    <td>
                      <StatusBadge status={report.status} findingsCount={report.findingsCount} />
                    </td>
                    <td>
                      <Link to={`/reports/${report.id}`} aria-label={`Ver el reporte ${report.subject ?? report.id}`}>
                        <Icon as={ArrowUpRight} size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="recent-note">
          Los reportes y sus adjuntos se eliminan automáticamente después de 7 días.
        </p>
      </section>
    </>
  );
}
