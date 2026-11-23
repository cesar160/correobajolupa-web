import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Candidate, IndicatorType } from '../api/types';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorBox, PageHeader } from '../components/ui';

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<IndicatorType, string> = {
  domain: 'Dominio',
  url: 'URL',
  sha256: 'SHA-256',
  sender: 'Remitente',
};

const LOCATION_LABEL: Record<string, string> = {
  link: 'Enlace',
  from: 'Remitente',
  reply_to: 'Reply-To',
  attachment: 'Adjunto',
};

export function CandidatesPage() {
  const { id = '' } = useParams();
  const [items, setItems] = useState<Candidate[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.listCandidates(id, { page, pageSize: PAGE_SIZE })
      .then((data) => { if (alive) { setItems(data.items); setTotal(data.total); } })
      .catch((failure) => { if (alive) setError(errorMessage(failure)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, page]);

  return (
    <>
      <PageHeader
        title="Candidatos"
        description="Mensajes que comparten un indicador confirmado. Son candidatos a investigación, no una campaña confirmada."
      />

      <ErrorBox message={error} />

      {loading ? (
        <p className="hint">Cargando candidatos…</p>
      ) : items.length === 0 ? (
        <EmptyState>
          <p>No hay candidatos para este indicador</p>
          <p>Cuando aparezcan mensajes relacionados, se listarán aquí con sus razones.</p>
        </EmptyState>
      ) : (
        <div className="candidate-list">
          {items.map((candidate) => (
            <article className="card candidate-card" key={candidate.message.id}>
              <div className="candidate-head">
                <div>
                  <h2>{candidate.message.subject ?? '(sin asunto)'}</h2>
                  <p className="hint">
                    {candidate.message.fromAddress ?? 'remitente desconocido'} · {candidate.message.location === 'inbox' ? 'Bandeja de entrada' : 'Cuarentena'}
                  </p>
                </div>
                <span className="badge">
                  {candidate.reasons.length} {candidate.reasons.length === 1 ? 'razón' : 'razones'}
                </span>
              </div>
              <ul className="reason-list">
                {candidate.reasons.map((reason, index) => (
                  <li key={`${reason.indicatorId}-${index}`}>
                    <span className="meta-label">{LOCATION_LABEL[reason.location] ?? reason.location} · {TYPE_LABEL[reason.kind]}</span>
                    <span className="mono">{reason.matchedValue}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="candidatos" onChange={setPage} />

      <div className="doc-actions">
        <Link className="btn btn-outline" to="/indicators">Volver a indicadores</Link>
      </div>
    </>
  );
}
