import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Paperclip, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../api/client';
import type { ReportDetail, ReportDocument } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Disclosure } from '../components/Disclosure';
import { Icon } from '../components/Icon';
import { VerdictCard } from '../components/VerdictCard';
import { EmptyState, ErrorBox, formatDate, Loading, PageHeader, PriorityBadge, StatusBadge } from '../components/ui';
import { deriveVerdict } from '../lib/verdict';

/** Cuántas señales se ven sin desplegar. */
const VISIBLE_SIGNALS = 3;

const GENERIC_STEPS = [
  'No abras los enlaces ni los archivos adjuntos de este correo.',
  'No respondas ni reenvíes el mensaje.',
  'Si ya abriste algo o escribiste datos, avisa a tu área de seguridad lo antes posible.',
];

/**
 * Resultado para quien reportó: solo lo que necesita para decidir qué hacer,
 * en lenguaje simple. Sin evidencia técnica, sin guía para analistas y sin
 * acciones de la plataforma que su rol no puede usar.
 */
export function ReporterReportPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [document, setDocument] = useState<ReportDocument | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const detail = await api.getReport(id);
        setReport(detail);
        setNotFound(false);
        if (detail.status !== 'queued' && detail.status !== 'processing') {
          try {
            setDocument(await api.getReportDocument(id));
          } catch {
            setDocument(null);
          }
        }
      } catch (failure) {
        if (failure instanceof ApiError && failure.code === 'not_found') setNotFound(true);
        else setError(errorMessage(failure));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id],
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
          <p>Este reporte no existe, ya se borró o no es tuyo.</p>
          <Link to="/reports">Volver a mis reportes</Link>
        </EmptyState>
      </>
    );
  }

  if (loading) return <Loading label="Cargando el resultado…" />;

  if (!report) {
    return (
      <>
        <ErrorBox message={error || 'No se pudo cargar el resultado.'} />
        <Link to="/reports">Volver a mis reportes</Link>
      </>
    );
  }

  const guides = document?.findings ?? [];
  const verdict = deriveVerdict(report.status, guides);
  const steps = Array.from(new Set(guides.flatMap((guide) => guide.whatToDo))).slice(0, 3);
  const unscanned = (document?.attachments ?? []).filter(
    (attachment) => attachment.scanStatus === 'error' || attachment.scanStatus === 'unsupported',
  ).length;
  const detected = (document?.attachments ?? []).filter((attachment) => attachment.scanStatus === 'detected').length;

  const signalItem = (guide: (typeof guides)[number], index: number) => (
    <li key={`${guide.ruleId}-${index}`}>
      <details className="signal">
        <summary>
          <span className="signal-dot" aria-hidden="true" />
          <span className="signal-text">
            <span className="signal-title">{guide.title}</span>
            <span className="signal-hint">{guide.whatItMeans}</span>
          </span>
          <Icon as={ChevronDown} size={18} />
        </summary>
        <div className="signal-body signal-body-plain">
          <p>{guide.whyRisky}</p>
        </div>
      </details>
    </li>
  );

  return (
    <>
      <PageHeader
        titleTransitionName="report-title"
        title={report.subject ?? '(sin asunto)'}
        description={`Lo reportaste el ${formatDate(report.createdAt)} · se borra el ${formatDate(report.expiresAt)}`}
        actions={
          <button type="button" className="btn btn-outline btn-small" onClick={() => setConfirming(true)}>
            <Icon as={Trash2} /> Eliminar reporte
          </button>
        }
      />

      <ErrorBox message={error} />

      {analyzing ? (
        <section className="card report-summary">
          <StatusBadge status={report.status} />
          <p className="report-headline">
            Estamos revisando tu correo
            <span>Normalmente tarda unos segundos. Esta página se actualiza sola. Mientras tanto, no abras sus enlaces ni adjuntos.</span>
          </p>
        </section>
      ) : (
        <section className="report-hero" aria-label="Resultado">
          <div className="card report-summary">
            <div className="report-summary-badges">
              <PriorityBadge priority={report.priority} full large />
              {report.status !== 'completed' && <StatusBadge status={report.status} />}
            </div>
            <p className="report-headline">
              {document?.summary.headline ??
                (report.status === 'failed' ? 'El análisis no terminó' : 'Resultado del análisis')}
              <span>
                {document?.summary.text ??
                  'No hay resultado disponible. Eso no significa que el correo sea seguro: vuelve a enviarlo o pide ayuda.'}
              </span>
            </p>
            {verdict && <VerdictCard verdict={verdict} />}
          </div>

          <section className="card card-dark next-steps" aria-labelledby="reporter-steps">
            <h2 id="reporter-steps">Qué hacer ahora</h2>
            <ol className="steps">
              {(steps.length > 0 ? steps : GENERIC_STEPS).map((step, index) => (
                <li key={step} className={index === 0 ? 'is-main' : undefined}>
                  <p className="step-title">{step}</p>
                </li>
              ))}
            </ol>
            <p className="next-steps-foot">Un analista ya puede ver tu reporte. Gracias por avisar.</p>
          </section>
        </section>
      )}

      {(detected > 0 || unscanned > 0) && (
        <p className="notice notice-warn">
          <Icon as={Paperclip} />
          <span>
            {detected > 0
              ? 'El antivirus marcó un adjunto como malicioso. No lo abras ni lo reenvíes.'
              : 'Un adjunto no se pudo revisar. Eso no significa que esté limpio: no lo abras.'}
          </span>
        </p>
      )}

      {!analyzing && guides.length > 0 && (
        <section className="card report-section" aria-labelledby="found-title">
          <div className="section-head">
            <h2 id="found-title">Lo que encontramos</h2>
            <p className="hint">Pulsa una señal para saber por qué es riesgosa</p>
          </div>
          <ul className="signal-group">{guides.slice(0, VISIBLE_SIGNALS).map(signalItem)}</ul>
          {guides.length > VISIBLE_SIGNALS && (
            <Disclosure label={`Ver ${guides.length - VISIBLE_SIGNALS === 1 ? '1 señal más' : `${guides.length - VISIBLE_SIGNALS} señales más`}`}>
              <ul className="signal-group">
                {guides.slice(VISIBLE_SIGNALS).map((guide, index) => signalItem(guide, index + VISIBLE_SIGNALS))}
              </ul>
            </Disclosure>
          )}
        </section>
      )}

      <div className="doc-actions">
        <Link className="btn btn-outline" to="/reports">Volver a mis reportes</Link>
        <Link className="btn btn-primary" to="/reports/new">Reportar otro correo</Link>
      </div>

      <ConfirmDialog
        open={confirming}
        title="¿Eliminar este reporte?"
        description="Se borrarán el reporte y su resultado. Esta acción no se puede deshacer."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
