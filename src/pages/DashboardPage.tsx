import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Clock, FileText, Lock, Mail, Timer, TriangleAlert, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Priority, ReportSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorBox, PageHeader, PriorityBadge, StatusBadge } from '../components/ui';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

/** Cuántos reportes se leen para las cifras: los reportes viven 7 días, así que suele bastar. */
const SAMPLE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const HEADLINE: Record<Priority, string> = {
  high: 'Se encontraron señales de riesgo importantes',
  medium: 'Se encontraron señales que conviene revisar',
  low: 'Se encontró una señal débil',
};

const isPending = (report: ReportSummary) => report.status === 'queued' || report.status === 'processing';

function resultLine(report: ReportSummary): string {
  if (isPending(report)) return 'Lo estamos revisando; tarda unos segundos.';
  if (report.status === 'failed') return 'No se pudo revisar. Vuelve a enviarlo.';
  if (report.priority) return HEADLINE[report.priority];
  return 'Sin señales detectadas. Esto no significa que sea seguro.';
}

const TIPS = [
  { icon: Mail, title: 'Revisa quién lo envía', text: 'Un dominio parecido al de la escuela no es el de la escuela.' },
  { icon: Zap, title: 'Desconfía de la prisa', text: '«Hoy», «24 horas», «será retenido»: la urgencia es una trampa común.' },
  { icon: Lock, title: 'Nunca des tu contraseña', text: 'Ningún área de la escuela te la pedirá por correo.' },
];

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const analyst = hasRole('analyst', 'admin');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.listReports({ page: 1, pageSize: SAMPLE_SIZE });
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

  const hasPending = reports.some(isPending);

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void load(true), 4000);
    return () => window.clearInterval(timer);
  }, [hasPending, load]);

  const count = (priority: Priority) => reports.filter((report) => report.priority === priority).length;
  const withoutResult = reports.filter((report) => !report.priority).length;
  // Date.now() solo se usa para contar los que se borran en menos de un día.
  const expiringSoon = reports.filter((report) => new Date(report.expiresAt).getTime() - Date.now() < DAY_MS).length;

  const stats = [
    { label: analyst ? 'Reportes activos' : 'Reportes enviados', value: total, caption: 'Últimos 7 días', icon: FileText },
    { label: 'Con riesgo alto', value: count('high'), caption: 'Prioridad alta', icon: TriangleAlert },
    { label: 'En análisis', value: reports.filter(isPending).length, caption: 'Pendientes de resultado', icon: Clock },
    { label: 'Se borran pronto', value: expiringSoon, caption: 'En menos de un día', icon: Timer },
  ];

  const segments = [
    { key: 'high', label: 'Riesgo alto', value: count('high') },
    { key: 'medium', label: 'Riesgo medio', value: count('medium') },
    { key: 'low', label: 'Riesgo bajo', value: count('low') },
    { key: 'none', label: 'Sin resultado', value: withoutResult },
  ];
  const latest = reports[0];

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.displayName?.split(' ')[0] ?? ''}`}
        description={
          analyst
            ? 'Resumen de los reportes de la última semana.'
            : 'Gracias por reportar: cada aviso ayuda a proteger a toda la escuela.'
        }
        actions={
          <Link className="btn btn-primary" to="/reports/new">
            Reportar un correo <Icon as={ArrowUpRight} />
          </Link>
        }
      />

      <ErrorBox message={error} />

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="card stat-card" key={stat.label}>
            <div className="stat-head">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-icon"><Icon as={stat.icon} size={18} /></span>
            </div>
            <span className="stat-number">{loading ? '—' : stat.value}</span>
            <span className="stat-caption">{stat.caption}</span>
          </article>
        ))}
      </div>

      {!loading && reports.length === 0 ? (
        <section className="card recent-card">
          <EmptyState>
            <p>Todavía no hay reportes</p>
            <p>Cuando alguien envíe un correo, aquí verás su resultado y qué hacer.</p>
            <Link className="btn btn-primary" to="/reports/new">Reportar un correo ↗</Link>
          </EmptyState>
        </section>
      ) : (
        <>
          <div className="dash-grid">
            {latest && (
              <section className="card dash-latest" aria-labelledby="latest-title">
                <div className="section-head">
                  <h2 id="latest-title">{analyst ? 'Último reporte' : 'Tu último reporte'}</h2>
                  <p className="hint">{shortDate(latest.createdAt)}</p>
                </div>
                <div className="report-summary-badges">
                  {latest.priority ? <PriorityBadge priority={latest.priority} full large /> : null}
                  <StatusBadge status={latest.status} />
                </div>
                <p className="dash-latest-subject">{latest.subject ?? '(sin asunto)'}</p>
                <p className="hint">{resultLine(latest)}</p>
                <Link className="btn btn-primary" to={`/reports/${latest.id}`}>
                  Ver el resultado completo
                </Link>
              </section>
            )}

            <section className="card dash-results" aria-labelledby="results-title">
              <h2 id="results-title">Resultados</h2>
              <div
                className="stack-bar"
                role="img"
                aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}
              >
                {segments
                  .filter((segment) => segment.value > 0)
                  .map((segment) => (
                    <span key={segment.key} className={`stack-bar-${segment.key}`} style={{ flexGrow: segment.value }} />
                  ))}
              </div>
              <ul className="stack-legend">
                {segments.map((segment) => (
                  <li key={segment.key}>
                    <span className={`stack-swatch stack-bar-${segment.key}`} aria-hidden="true" />
                    <span>{segment.label}</span>
                    <strong>{segment.value}</strong>
                  </li>
                ))}
              </ul>
              <p className="hint">«Sin resultado» incluye los que se están analizando y los que no terminaron. Ninguno cuenta como seguro.</p>
            </section>
          </div>

          <div className={analyst ? '' : 'dash-grid'}>
            <section className="card recent-card">
              <div className="recent-card-head">
                <h2>Recientes</h2>
                <Link className="btn btn-outline btn-small" to="/reports">
                  Ver todos <Icon as={ArrowUpRight} size={14} />
                </Link>
              </div>
              <ul className="recent-list">
                {reports.slice(0, analyst ? 6 : 3).map((report) => (
                  <li key={report.id}>
                    <div className="recent-list-text">
                      <Link to={`/reports/${report.id}`}>{report.subject ?? '(sin asunto)'}</Link>
                      <span className="cell-sub">{shortDate(report.createdAt)} · {resultLine(report)}</span>
                    </div>
                    {report.priority ? <PriorityBadge priority={report.priority} /> : <StatusBadge status={report.status} />}
                  </li>
                ))}
              </ul>
              <p className="recent-note">Los reportes y sus adjuntos se eliminan automáticamente después de 7 días.</p>
            </section>

            {!analyst && (
              <section className="card dash-tips" aria-labelledby="tips-title">
                <h2 id="tips-title">Cómo reconocerlos</h2>
                <ul>
                  {TIPS.map((tip) => (
                    <li key={tip.title}>
                      <span className="stat-icon"><Icon as={tip.icon} size={18} /></span>
                      <span>
                        <strong>{tip.title}</strong>
                        <span className="cell-sub">{tip.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
