import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, CircleAlert, FileText, Flag, Link2, Paperclip, ShieldAlert, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../api/client';
import type { Attachment, EvidenceItem, Finding, ReportDetail, ReportDocument, RuleId } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Disclosure } from '../components/Disclosure';
import { Icon } from '../components/Icon';
import { ReputationPanel } from '../components/ReputationPanel';
import { VerdictCard } from '../components/VerdictCard';
import {
  AuthBadge,
  EmptyState,
  ErrorBox,
  formatDate,
  Loading,
  PageHeader,
  PriorityBadge,
  ScanBadge,
  StatusBadge,
  Tabs,
} from '../components/ui';
import { deriveVerdict } from '../lib/verdict';

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(0)} KB`;

const LIMITED_TEXT = {
  missing_headers: 'Faltaban encabezados completos; el análisis es limitado, no “sin señales”.',
  parse_error: 'No se pudo leer el mensaje por completo; el análisis es limitado.',
} as const;

/** Cuántas señales se ven sin desplegar: el resto queda plegado para no saturar. */
const VISIBLE_SIGNALS = 3;

/** Un hallazgo listo para mostrar, venga de la guía del informe o de /findings. */
interface Signal {
  key: string;
  ruleId: RuleId;
  title: string;
  whatItMeans: string;
  whyRisky: string | null;
  forAnalyst: string[];
  evidence: EvidenceItem[];
}

function signalsFrom(document: ReportDocument | null, findings: Finding[]): Signal[] {
  if (document && document.findings.length > 0) {
    return document.findings.map((guide, index) => ({
      key: `${guide.ruleId}-${index}`,
      ruleId: guide.ruleId,
      title: guide.title,
      whatItMeans: guide.whatItMeans,
      whyRisky: guide.whyRisky,
      forAnalyst: guide.forAnalyst,
      evidence: guide.evidence,
    }));
  }
  return findings.map((finding) => ({
    key: finding.id,
    ruleId: finding.ruleId,
    title: finding.ruleName,
    whatItMeans: finding.summary,
    whyRisky: null,
    forAnalyst: [],
    evidence: finding.evidence,
  }));
}

function SignalItem({ signal, analyst }: { signal: Signal; analyst: boolean }) {
  return (
    <li>
      <details className="signal">
        <summary>
          <span className="rule-id">{signal.ruleId}</span>
          <span className="signal-text">
            <span className="signal-title">{signal.title}</span>
            <span className="signal-hint">{signal.whatItMeans}</span>
          </span>
          <Icon as={ChevronDown} size={18} />
        </summary>
        <div className="signal-body">
          {signal.whyRisky && <p>{signal.whyRisky}</p>}
          {signal.evidence.length > 0 && (
            <dl className="evidence-list">
              {signal.evidence.map((item, index) => (
                <div key={`${signal.key}-${index}`}>
                  <dt>{item.label}</dt>
                  <dd className="mono">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {analyst && signal.forAnalyst.length > 0 && (
            <>
              <span className="meta-label">Para el analista</span>
              <ul className="signal-list">
                {signal.forAnalyst.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>
    </li>
  );
}

export function ReportDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const analyst = hasRole('analyst', 'admin');

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [document, setDocument] = useState<ReportDocument | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsError, setAttachmentsError] = useState('');
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
        const finished = detail.status !== 'queued' && detail.status !== 'processing';
        if (!finished) {
          setAttachments([]);
          setAttachmentsError('El análisis aún no terminó; los adjuntos estarán disponibles al finalizar.');
          setDocument(null);
          return;
        }
        const [docResult, attResult] = await Promise.allSettled([
          api.getReportDocument(id),
          api.listAttachments(id),
        ]);
        // Sin la guía, la vista sigue funcionando con los hallazgos de /findings.
        setDocument(docResult.status === 'fulfilled' ? docResult.value : null);
        if (attResult.status === 'fulfilled') {
          setAttachments(attResult.value.items);
          setAttachmentsError('');
        } else {
          setAttachments([]);
          setAttachmentsError(
            attResult.reason instanceof ApiError && attResult.reason.code === 'report_not_ready'
              ? 'El análisis aún no terminó; los adjuntos estarán disponibles al finalizar.'
              : errorMessage(attResult.reason),
          );
        }
        void loadText();
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

  const analyzing = report?.status === 'queued' || report?.status === 'processing';

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

  const signals = signalsFrom(document, findings);
  const verdict = deriveVerdict(report.status, signals);
  const reputationItems = report.reputation.items;
  const flaggedLinks = reputationItems.filter((item) => item.state === 'reported' || item.state === 'suspicious').length;
  const unavailable =
    reputationItems.filter((item) => item.state === 'error').length +
    attachments.filter((item) => item.scanStatus === 'error' || item.scanStatus === 'unsupported').length;
  const notes = document?.notes ?? [];

  // Para el reportante, los pasos son la guía de la API (sin repetir); para el
  // analista, las acciones que puede hacer en la plataforma.
  const reporterSteps = Array.from(new Set((document?.findings ?? []).flatMap((guide) => guide.whatToDo))).slice(0, 3);

  const sortedAttachments = [...attachments].sort(
    (a, b) => Number(a.scanStatus === 'not_detected') - Number(b.scanStatus === 'not_detected'),
  );
  const attachmentRow = (attachment: Attachment) => (
    <li key={attachment.id} className="file-item">
      <span className="file-item-icon"><Icon as={Paperclip} size={16} /></span>
      <div className="file-item-body">
        <span className="mono file-item-name">{attachment.fileName ?? '(sin nombre)'}</span>
        <span className="cell-sub">
          Declarado {attachment.declaredType ?? '—'} · detectado {attachment.detectedType ?? '—'} ·{' '}
          {formatBytes(attachment.sizeBytes)}
        </span>
        <span className="cell-sub mono">SHA-256 {attachment.sha256}</span>
        <span className="file-item-scan">
          <ScanBadge status={attachment.scanStatus} />
          {attachment.scanDetail && <span className="cell-sub">{attachment.scanDetail}</span>}
        </span>
      </div>
    </li>
  );

  return (
    <>
      <PageHeader
        titleTransitionName="report-title"
        title={report.subject ?? '(sin asunto)'}
        description={`De ${report.fromAddress ?? 'dirección desconocida'} · ${formatDate(report.createdAt)}`}
        actions={
          <>
            <Link className="btn btn-outline btn-small" to={`/reports/${id}/informe`}>
              <Icon as={FileText} /> Informe para compartir
            </Link>
            <button type="button" className="btn btn-outline btn-small" onClick={() => setConfirming(true)}>
              <Icon as={Trash2} /> Eliminar
            </button>
          </>
        }
      />

      <ErrorBox message={error} />

      {analyzing && (
        <p className="notice" role="status">
          El análisis sigue en curso. Esta página se actualiza automáticamente.
        </p>
      )}
      {report.limitedReason && <p className="notice notice-warn">{LIMITED_TEXT[report.limitedReason]}</p>}

      <section className="report-hero" aria-label="Resumen y siguiente paso">
        <div className="card report-summary">
          <div className="report-summary-badges">
            <PriorityBadge priority={report.priority} full large />
            <StatusBadge status={report.status} />
          </div>
          {document ? (
            <p className="report-headline">
              {document.summary.headline}
              <span>{document.summary.text}</span>
            </p>
          ) : (
            !analyzing && (
              <p className="report-headline">
                {report.findingsCount === 1 ? '1 señal encontrada' : `${report.findingsCount} señales encontradas`}
                <span>Ninguna regla prueba por sí sola que sea phishing: revisa cada señal antes de decidir.</span>
              </p>
            )
          )}
          {verdict && <VerdictCard verdict={verdict} />}
          {!analyzing && (
            <ul className="report-facts">
              <li>
                <span className="fact-icon fact-icon-dark"><Icon as={Flag} size={17} /></span>
                <span><strong>{report.findingsCount}</strong>{report.findingsCount === 1 ? 'señal' : 'señales'}</span>
              </li>
              <li>
                <span className="fact-icon"><Icon as={Link2} size={17} /></span>
                <span><strong>{flaggedLinks} de {report.links.length}</strong>enlaces marcados</span>
              </li>
              {unavailable > 0 && (
                <li className="fact-warn">
                  <span className="fact-icon"><Icon as={CircleAlert} size={17} /></span>
                  <span><strong>{unavailable} no disponibles</strong>ver detalles técnicos</span>
                </li>
              )}
            </ul>
          )}
        </div>

        <section className="card card-dark next-steps" aria-labelledby="next-steps-title">
          <h2 id="next-steps-title">Qué hacer ahora</h2>
          {analyst ? (
            <ol className="steps">
              <li className="is-main">
                <p className="step-title">Crea un incidente con este reporte</p>
                <p className="step-text">Desde el incidente buscas el correo en los buzones y aplicas la cuarentena.</p>
                <Link className="btn btn-accent btn-small" to="/incidents">
                  <Icon as={ShieldAlert} /> Ir a incidentes
                </Link>
              </li>
              <li>
                <p className="step-title">Propón los indicadores</p>
                <Link className="btn btn-outline-dark btn-small" to="/indicators">
                  <Icon as={Flag} /> Indicadores
                </Link>
              </li>
              <li>
                <p className="step-title">Responde a quien reportó</p>
                <Link className="btn btn-outline-dark btn-small" to={`/reports/${id}/informe`}>
                  <Icon as={FileText} /> Ver la guía
                </Link>
              </li>
            </ol>
          ) : reporterSteps.length > 0 ? (
            <ol className="steps">
              {reporterSteps.map((step) => (
                <li key={step}>
                  <p className="step-title">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="step-text">
              No abras enlaces ni adjuntos de este correo. Si dudas, consulta con tu área de seguridad.
            </p>
          )}
          <p className="next-steps-foot">La cuarentena se aplica dentro de un incidente, mensaje por mensaje, y se puede revertir.</p>
        </section>
      </section>

      <section className="card report-section" aria-labelledby="signals-title">
        <div className="section-head">
          <h2 id="signals-title">Por qué es grave</h2>
          {signals.length > 0 && (
            <p className="hint">
              {Math.min(VISIBLE_SIGNALS, signals.length)} de {signals.length} señales · pulsa para ver la evidencia
            </p>
          )}
        </div>
        {analyzing ? (
          <p className="hint">Análisis en curso. Las señales aparecerán cuando termine; la lista vacía todavía no es un resultado.</p>
        ) : report.status === 'failed' ? (
          <p className="notice notice-warn">El análisis no terminó, así que no hay señales disponibles.</p>
        ) : signals.length === 0 ? (
          <p className="hint">Sin señales detectadas. Esto no significa que sea seguro.</p>
        ) : (
          <>
            <ul className="signal-group">
              {signals.slice(0, VISIBLE_SIGNALS).map((signal) => (
                <SignalItem key={signal.key} signal={signal} analyst={analyst} />
              ))}
            </ul>
            {signals.length > VISIBLE_SIGNALS && (
              <Disclosure
                label={`Ver las otras ${signals.length - VISIBLE_SIGNALS} señales`}
              >
                <ul className="signal-group">
                  {signals.slice(VISIBLE_SIGNALS).map((signal) => (
                    <SignalItem key={signal.key} signal={signal} analyst={analyst} />
                  ))}
                </ul>
              </Disclosure>
            )}
          </>
        )}
      </section>

      <div className="report-two">
        <section className="card report-section" aria-labelledby="links-title">
          <div className="section-head">
            <h2 id="links-title">Enlaces <span className="count-pill">{report.links.length}</span></h2>
            <p className="hint">Desactivados · no se abren</p>
          </div>
          {report.links.length === 0 ? (
            <p className="hint">No se encontraron enlaces en el mensaje.</p>
          ) : (
            <>
              <ul className="link-list">
                {report.links.slice(0, 3).map((link, index) => (
                  <li key={`${link.defangedUrl}-${index}`}>
                    <span className="cell-sub">Texto: «{link.displayText ?? '—'}»</span>
                    <code className="defanged">{link.defangedUrl}</code>
                  </li>
                ))}
              </ul>
              {report.links.length > 3 && (
                <Disclosure label={report.links.length - 3 === 1 ? 'Ver el otro enlace' : `Ver los ${report.links.length - 3} restantes`}>
                  <ul className="link-list">
                    {report.links.slice(3).map((link, index) => (
                      <li key={`${link.defangedUrl}-r${index}`}>
                        <span className="cell-sub">Texto: «{link.displayText ?? '—'}»</span>
                        <code className="defanged">{link.defangedUrl}</code>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </>
          )}
          {!analyzing && report.status !== 'failed' && (
            <Disclosure label="Ver la reputación de los enlaces" openLabel="Ocultar la reputación">
              <ReputationPanel review={report.reputation} findings={signals} />
            </Disclosure>
          )}
        </section>

        <section className="card report-section" aria-labelledby="attachments-title">
          <div className="section-head">
            <h2 id="attachments-title">Adjuntos <span className="count-pill">{attachments.length}</span></h2>
            <p className="hint">Nunca se descargan</p>
          </div>
          {attachmentsError ? (
            <p className="notice notice-warn">{attachmentsError}</p>
          ) : sortedAttachments.length === 0 ? (
            <p className="hint">Este correo no trae adjuntos.</p>
          ) : (
            <>
              <ul className="file-list">{sortedAttachments.slice(0, 1).map(attachmentRow)}</ul>
              {sortedAttachments.length > 1 && (
                <Disclosure label={`Ver ${sortedAttachments.length - 1 === 1 ? 'el otro adjunto' : `los otros ${sortedAttachments.length - 1}`}`}>
                  <ul className="file-list">{sortedAttachments.slice(1).map(attachmentRow)}</ul>
                </Disclosure>
              )}
            </>
          )}
        </section>
      </div>

      <details className="card tech-details" id="detalles-tecnicos">
        <summary>
          <span>
            <span className="tech-title">Detalles técnicos</span>
            <span className="hint">Autenticación, avisos del análisis, versiones y el correo como texto o HTML</span>
          </span>
          <Icon as={ChevronDown} size={20} />
        </summary>
        <div className="tech-body">
          <div className="detail-meta">
            <div>
              <span className="meta-label">Origen</span>
              <span>{report.source === 'eml' ? 'Archivo .eml' : 'Texto pegado'}</span>
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

          {notes.map((note) => (
            <p key={note.kind} className={`notice ${note.kind === 'no_findings' || note.kind === 'auth_informative' ? '' : 'notice-warn'}`}>
              <span>
                <strong>{note.title}.</strong> {note.text}
              </span>
            </p>
          ))}

          {report.authentication && (
            <div className="auth-panel">
              <span className="meta-label">Autenticación del remitente (solo informativa)</span>
              <div className="auth-badges">
                <AuthBadge label="SPF" value={report.authentication.spf} />
                <AuthBadge label="DKIM" value={report.authentication.dkim} />
                <AuthBadge label="DMARC" value={report.authentication.dmarc} />
              </div>
              <p className="hint">Nunca cambia la prioridad: puede estar alterada en un .eml subido.</p>
            </div>
          )}

          <Tabs
            label="Contenido del correo"
            items={[
              {
                id: 'texto',
                label: 'Texto plano',
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
                  <p className="hint">Este correo no traía una parte HTML que se pueda mostrar.</p>
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
        </div>
      </details>

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
