import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../api/client';
import type { IndicatorType, ReportDocument } from '../api/types';
import { ErrorBox, formatDate, Loading, PageHeader, PriorityBadge, ScanBadge, StatusBadge } from '../components/ui';
import { ReputationPanel } from '../components/ReputationPanel';

const INDICATOR_LABEL: Record<IndicatorType, string> = {
  domain: 'Dominio',
  url: 'Enlace',
  sha256: 'SHA-256',
  sender: 'Remitente',
};

export function ReportDocumentPage() {
  const { id = '' } = useParams();
  const [doc, setDoc] = useState<ReportDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setUnavailable(false);
    api.getReportDocument(id)
      .then((data) => { if (alive) setDoc(data); })
      .catch((failure) => {
        if (!alive) return;
        if (failure instanceof ApiError && failure.code === 'report_not_ready') setUnavailable(true);
        else setError(errorMessage(failure));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <Loading label="Cargando informe…" />;

  if (error) return <ErrorBox message={error} />;

  if (unavailable || !doc) {
    return (
      <>
        <PageHeader title="Informe de seguridad" description={id} />
        <p className="notice notice-warn">
          El análisis aún no terminó o el informe no está disponible para este reporte.
        </p>
        <Link className="btn btn-outline" to={`/reports/${id}`}>Volver al reporte</Link>
      </>
    );
  }

  // Varias reglas recomiendan lo mismo: cada acción se muestra una sola vez.
  const actions = [...new Set(doc.findings.flatMap((finding) => finding.whatToDo))];

  return (
    <>
      <PageHeader
        title="Informe de seguridad"
        description={`${doc.reportId} · Conclusión del análisis y acciones recomendadas.`}
      />

      <article className="card doc-hero">
        <div className="doc-hero-head">
          <div>
            <h2>{doc.summary.headline}</h2>
            <p className="doc-summary">{doc.summary.text}</p>
          </div>
          <div className="doc-hero-badges">
            <StatusBadge status={doc.status} findingsCount={doc.findings.length} />
            <PriorityBadge priority={doc.priority} />
          </div>
        </div>
        <div className="doc-meta">
          <span>Generado {formatDate(doc.generatedAt)}</span>
          <span>Reglas {doc.rulesVersion ?? '—'}</span>
          <span>Guía {doc.guideVersion}</span>
        </div>
      </article>

      {doc.notes.map((note) => (
        <p className={`notice ${note.kind === 'limited' ? 'notice-warn' : ''}`} key={note.kind + note.title}>
          <strong>{note.title}</strong> {note.text}
        </p>
      ))}

      {doc.status !== 'failed' && <ReputationPanel review={doc.reputation} findings={doc.findings} />}

      <div className="doc-grid">
        <section className="card">
          <h2>Cómo protegerte</h2>
          <p className="hint">Acciones sugeridas para este mensaje.</p>
          {actions.length === 0 ? (
            <p className="doc-summary">{doc.summary.text}</p>
          ) : (
            <ol className="guide-steps">
              {actions.map((action, index) => (
                <li key={`${action}-${index}`}>
                  <span className="finding-number">{String(index + 1).padStart(2, '0')}</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <h2>Indicadores observados</h2>
          <div className="indicator-list">
            {doc.indicators.length === 0 ? (
              <p className="hint">No se registraron indicadores.</p>
            ) : (
              doc.indicators.map((indicator, index) => (
                <div className="indicator-item" key={`${indicator.type}-${index}`}>
                  <span className="meta-label">{INDICATOR_LABEL[indicator.type]}</span>
                  <span className="mono">{indicator.displayValue}</span>
                </div>
              ))
            )}
          </div>

          {doc.attachments.length > 0 && (
            <>
              <h3 className="doc-subheading">Adjuntos</h3>
              <div className="indicator-list">
                {doc.attachments.map((attachment) => (
                  <div className="indicator-item" key={attachment.sha256}>
                    <span>{attachment.fileName ?? '(sin nombre)'}</span>
                    <ScanBadge status={attachment.scanStatus} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="doc-findings">
        <h2>Hallazgos y evidencias</h2>
        {doc.findings.length === 0 ? (
          <p className="notice">No se registraron hallazgos con las reglas actuales.</p>
        ) : (
          <div className="doc-finding-grid">
            {doc.findings.map((finding, index) => (
              <article className="card guide-card" key={`${finding.ruleId}-${index}`}>
                <h3>
                  <span className="rule-id">{finding.ruleId}</span> {finding.title}
                </h3>
                <div className="guide-section">
                  <span className="meta-label">Qué significa</span>
                  <p>{finding.whatItMeans}</p>
                </div>
                <div className="guide-section">
                  <span className="meta-label">Por qué es riesgoso</span>
                  <p>{finding.whyRisky}</p>
                </div>
                {finding.whatToDo.length > 0 && (
                  <div className="guide-section">
                    <span className="meta-label">Qué hacer</span>
                    <ul>{finding.whatToDo.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
                {finding.forAnalyst.length > 0 && (
                  <div className="guide-section">
                    <span className="meta-label">Para el analista</span>
                    <ul>{finding.forAnalyst.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}
                {finding.evidence.length > 0 && (
                  <div className="guide-section">
                    <span className="meta-label">Evidencia</span>
                    <dl className="evidence-list">
                      {finding.evidence.map((item, index) => (
                        <div key={`${item.label}-${index}`}>
                          <dt>{item.label}</dt>
                          <dd className="mono">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="doc-actions">
        <Link className="btn btn-outline" to={`/reports/${id}`}>Volver a hallazgos</Link>
        <Link className="btn btn-primary" to="/reports">Mis reportes</Link>
      </div>
    </>
  );
}
