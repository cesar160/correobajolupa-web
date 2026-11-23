import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../api/client';
import type { MessageDetail } from '../api/types';
import { AuthBadge, EmptyState, ErrorBox, formatDate, Loading, PageHeader, ScanBadge, Tabs } from '../components/ui';

export function MessageDetailPage() {
  const { id = '' } = useParams();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.getMessage(id)
      .then((data) => { if (alive) setMessage(data); })
      .catch((failure) => {
        if (!alive) return;
        if (failure instanceof ApiError && failure.code === 'not_found') setNotFound(true);
        else setError(errorMessage(failure));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (notFound) {
    return (
      <>
        <PageHeader title="Mensaje no encontrado" />
        <EmptyState>
          <p>Este mensaje no existe o no está disponible para tu cuenta.</p>
          <Link to="/messages">Volver a mensajes</Link>
        </EmptyState>
      </>
    );
  }

  if (loading) return <Loading label="Cargando mensaje…" />;
  if (error) return <ErrorBox message={error} />;
  if (!message) return null;

  return (
    <>
      <PageHeader
        title={message.subject ?? '(sin asunto)'}
        description={`${message.fromAddress ?? 'remitente desconocido'} · ${message.date ? formatDate(message.date) : 'sin fecha'}`}
      />

      <div className="detail-meta">
        <div><span className="meta-label">Ubicación</span><span>{message.location === 'inbox' ? 'Bandeja de entrada' : 'Cuarentena'}</span></div>
        <div><span className="meta-label">UID</span><span className="mono">{message.uid}</span></div>
        <div><span className="meta-label">UIDVALIDITY</span><span className="mono">{message.uidValidity}</span></div>
        <div><span className="meta-label">Enlaces</span><span>{message.linksCount}</span></div>
        <div><span className="meta-label">Adjuntos</span><span>{message.hasAttachments ? 'Sí' : 'No'}</span></div>
        <div><span className="meta-label">Cuarentena</span><span>{message.quarantined ? 'Sí' : 'No'}</span></div>
      </div>

      <Tabs
        label="Secciones del mensaje"
        items={[
          {
            id: 'resumen',
            label: 'Resumen',
            content: (
              <section className="card">
                <h2>Inspección del mensaje</h2>
                <p className="hint">
                  Los enlaces y dominios se muestran desactivados. Los resultados de autenticación
                  son informativos y no prueban el origen del correo.
                </p>
                {message.authentication ? (
                  <div className="auth-badges">
                    <AuthBadge label="SPF" value={message.authentication.spf} />
                    <AuthBadge label="DKIM" value={message.authentication.dkim} />
                    <AuthBadge label="DMARC" value={message.authentication.dmarc} />
                  </div>
                ) : (
                  <p className="hint">Sin datos de autenticación en el mensaje.</p>
                )}
              </section>
            ),
          },
          {
            id: 'enlaces',
            label: `Enlaces (${message.links.length})`,
            content: message.links.length === 0 ? (
              <EmptyState><p>No se encontraron enlaces en el mensaje.</p></EmptyState>
            ) : (
              <section className="card">
                <div className="table-wrapper" role="region" aria-labelledby="message-links-caption" tabIndex={0}>
                  <table className="reports-table links-table">
                    <caption id="message-links-caption" className="visually-hidden">Enlaces del mensaje</caption>
                    <thead>
                      <tr>
                        <th scope="col">Texto visible</th>
                        <th scope="col">Destino desactivado</th>
                        <th scope="col">Dominio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {message.links.map((link, index) => (
                        <tr key={`${link.defangedUrl}-${index}`}>
                          <th scope="row">{link.displayText ?? '—'}</th>
                          <td className="mono">{link.defangedUrl}</td>
                          <td className="mono">{link.domain ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ),
          },
          {
            id: 'adjuntos',
            label: `Adjuntos (${message.attachments.length})`,
            content: message.attachments.length === 0 ? (
              <EmptyState><p>Este mensaje no trae adjuntos.</p></EmptyState>
            ) : (
              <section className="card">
                <div className="table-wrapper" role="region" aria-labelledby="message-attachments-caption" tabIndex={0}>
                  <table className="reports-table attachments-table">
                    <caption id="message-attachments-caption" className="visually-hidden">Adjuntos del mensaje</caption>
                    <thead>
                      <tr>
                        <th scope="col">Archivo</th>
                        <th scope="col">Tipos</th>
                        <th scope="col">Tamaño</th>
                        <th scope="col">Escaneo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {message.attachments.map((attachment) => (
                        <tr key={attachment.id}>
                          <th scope="row">
                            {attachment.fileName ?? '(sin nombre)'}
                            <span className="cell-sub mono">{attachment.sha256}</span>
                          </th>
                          <td>
                            {attachment.declaredType ?? '—'}
                            <span className="cell-sub">{attachment.detectedType ?? 'Sin tipo detectado'}</span>
                          </td>
                          <td>{attachment.sizeBytes} B</td>
                          <td><ScanBadge status={attachment.scanStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ),
          },
        ]}
      />

      <div className="doc-actions">
        <Link className="btn btn-outline" to="/messages">Volver a mensajes</Link>
      </div>
    </>
  );
}
