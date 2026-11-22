import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../api/client';
import type { Finding, ReportDetail } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import {
  AuthBadge,
  EmptyState,
  ErrorBox,
  formatDate,
  Loading,
  PageHeader,
  PriorityBadge,
  StatusBadge,
  Tabs,
} from '../components/ui';

const LIMITED_TEXT = {
  missing_headers: 'Faltaban encabezados completos; el análisis es limitado, no “sin señales”.',
  parse_error: 'No se pudo leer el mensaje por completo; el análisis es limitado.',
} as const;

export function ReportDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [text, setText] = useState<string | null>(null);
  const [textError, setTextError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadText = useCallback(async () => {
    try {
      setText(await api.getReportText(id));
      setTextError('');
    } catch (failure) {
      setTextError(errorMessage(failure));
    }
  }, [id]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const [detail, found] = await Promise.all([api.getReport(id), api.listFindings(id)]);
        setReport(detail);
        setFindings(found.items);
        setNotFound(false);
        if (detail.status !== 'queued' && detail.status !== 'processing') void loadText();
      } catch (failure) {
        if (failure instanceof ApiError && failure.code === 'not_found') setNotFound(true);
        else setError(errorMessage(failure));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, loadText],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const analyzing =
    report?.status === 'queued' || report?.status === 'processing';

  useEffect(() => {
    if (!analyzing) return;
    const timer = window.setInterval(() => void load(true), 3000);
    return () => window.clearInterval(timer);
  }, [analyzing, load]);

  const confirmDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.deleteReport(id);
      navigate('/reports', { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  if (notFound) {
    return (
      <>
        <PageHeader title="Reporte no encontrado" />
        <EmptyState>
          <p>Este reporte no existe, fue borrado o no pertenece a tu cuenta.</p>
          <Link to="/reports">Volver a la lista de reportes</Link>
        </EmptyState>
      </>
    );
  }

  if (loading) return <Loading label="Cargando reporte…" />;

  if (!report) {
    return (
      <>
        <ErrorBox message={error || 'No se pudo cargar el reporte.'} />
        <Link to="/reports">Volver a la lista</Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={report.subject ?? '(sin asunto)'}
        description={`Recibido de ${report.fromAddress ?? 'dirección desconocida'} el ${formatDate(report.createdAt)}.`}
        actions={
          <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
            <Icon as={Trash2} /> Eliminar reporte
          </button>
        }
      />

      <ErrorBox message={error} />

      <div className="detail-meta">
        <div>
          <span className="meta-label">Estado</span>
          <StatusBadge status={report.status} />
        </div>
        <div>
          <span className="meta-label">Prioridad</span>
          <PriorityBadge priority={report.priority} />
        </div>
        <div>
          <span className="meta-label">Origen</span>
          <span>{report.source === 'eml' ? 'Archivo .eml' : 'Texto pegado'}</span>
        </div>
        <div>
          <span className="meta-label">Hallazgos</span>
          <span>{report.findingsCount}</span>
        </div>
        <div>
          <span className="meta-label">Analizado</span>
          <span>{report.analyzedAt ? formatDate(report.analyzedAt) : '—'}</span>
        </div>
        <div>
          <span className="meta-label">Se borra</span>
          <span>{formatDate(report.expiresAt)}</span>
        </div>
        {report.rulesVersion && (
          <div>
            <span className="meta-label">Reglas</span>
            <span className="mono">{report.rulesVersion}</span>
          </div>
        )}
      </div>

      {analyzing && (
        <p className="notice" role="status">
          El análisis sigue en curso. Esta página se actualiza automáticamente.
        </p>
      )}

      {report.limitedReason && (
        <p className="notice notice-warn">
          {LIMITED_TEXT[report.limitedReason]}
        </p>
      )}

      {report.authentication && (
        <div className="auth-panel">
          <span className="meta-label">Autenticación del mensaje (solo informativa)</span>
          <div className="auth-badges">
            <AuthBadge label="SPF" value={report.authentication.spf} />
            <AuthBadge label="DKIM" value={report.authentication.dkim} />
            <AuthBadge label="DMARC" value={report.authentication.dmarc} />
          </div>
          <p className="hint">Nunca suma puntaje: puede estar alterada en un .eml subido.</p>
        </div>
      )}

      <Tabs
        label="Secciones del reporte"
        items={[
          {
            id: 'hallazgos',
            label: `Hallazgos (${findings.length})`,
            content:
              findings.length === 0 ? (
                <EmptyState>
                  <p>No hay hallazgos registrados.</p>
                  <p className="hint">
                    Ninguna regla prueba phishing por sí sola; la ausencia de hallazgos no es una garantía.
                  </p>
                </EmptyState>
              ) : (
                <ol className="finding-list">
                  {findings.map((finding) => (
                    <li key={finding.id} className="finding-card">
                      <h3>
                        <span className="rule-id">{finding.ruleId}</span> {finding.ruleName}
                      </h3>
                      <p>{finding.summary}</p>
                      {finding.evidence.length > 0 && (
                        <dl className="evidence-list">
                          {finding.evidence.map((item, index) => (
                            <div key={`${finding.id}-${index}`}>
                              <dt>{item.label}</dt>
                              <dd className="mono">{item.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p className="hint">Reglas {finding.rulesVersion}</p>
                    </li>
                  ))}
                </ol>
              ),
          },
          {
            id: 'enlaces',
            label: `Enlaces (${report.links.length})`,
            content:
              report.links.length === 0 ? (
                <EmptyState>
                  <p>No se encontraron enlaces en el mensaje.</p>
                </EmptyState>
              ) : (
                <>
                  <p className="hint">Los destinos aparecen desactivados. Nunca se visitan ni son clicables.</p>
                  <div className="table-wrapper" role="region" aria-labelledby="links-caption" tabIndex={0}>
                    <table className="reports-table links-table">
                      <caption id="links-caption">Enlaces del correo</caption>
                      <thead>
                        <tr>
                          <th scope="col">Texto visible</th>
                          <th scope="col">Destino desactivado</th>
                          <th scope="col">Dominio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.links.map((link, index) => (
                          <tr key={`${link.defangedUrl}-${index}`}>
                            <th scope="row">{link.displayText ?? '—'}</th>
                            <td className="mono">{link.defangedUrl}</td>
                            <td className="mono">{link.domain ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ),
          },
          {
            id: 'texto',
            label: 'Texto',
            content: textError ? (
              <ErrorBox message={textError} />
            ) : text === null ? (
              <Loading label="Cargando texto…" />
            ) : (
              <pre className="text-view">{text}</pre>
            ),
          },
          {
            id: 'html',
            label: 'HTML saneado',
            content: !report.hasHtml ? (
              <EmptyState>
                <p>Este correo no traía una parte HTML que se pueda mostrar.</p>
              </EmptyState>
            ) : (
              <>
                <p className="hint">
                  El HTML fue saneado por la API y se incrusta en un iframe sin permisos: no puede
                  ejecutar scripts ni acceder a la página.
                </p>
                <iframe
                  className="html-viewer"
                  sandbox=""
                  src={api.reportHtmlUrl(id)}
                  title="Vista HTML saneada del correo"
                />
              </>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={confirming}
        title="¿Eliminar este reporte?"
        description="Se borrarán el reporte, sus hallazgos y sus archivos. Esta acción no se puede deshacer."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
