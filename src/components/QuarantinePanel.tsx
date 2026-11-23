import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { CandidateReason, Indicator, MessageSummary, QuarantineResult } from '../api/types';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState, ErrorBox, Notice } from './ui';

interface Row {
  message: MessageSummary;
  reasons: CandidateReason[];
}

const OUTCOME_LABEL: Record<string, string> = {
  quarantined: 'En cuarentena',
  already_quarantined: 'Ya estaba en cuarentena',
  uidvalidity_mismatch: 'UIDVALIDITY distinto',
  not_found: 'No encontrado',
  error: 'Error',
};

export function QuarantinePanel({ incidentId, indicators }: { incidentId: string; indicators: Indicator[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<QuarantineResult[] | null>(null);

  useEffect(() => {
    let alive = true;
    const confirmed = indicators.filter((indicator) => indicator.status === 'confirmed');
    if (confirmed.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all(confirmed.map((indicator) => api.listCandidates(indicator.id, { page: 1, pageSize: 100 })))
      .then((responses) => {
        const byMessage = new Map<string, Row>();
        responses.forEach((response) => {
          response.items.forEach((candidate) => {
            const existing = byMessage.get(candidate.message.id);
            if (existing) existing.reasons.push(...candidate.reasons);
            else byMessage.set(candidate.message.id, { message: candidate.message, reasons: [...candidate.reasons] });
          });
        });
        if (alive) setRows([...byMessage.values()]);
      })
      .catch((failure) => { if (alive) setError(errorMessage(failure)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [indicators]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const execute = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await api.quarantineMessages(incidentId, [...selected]);
      setResults(response.results);
      setConfirming(false);
    } catch (failure) {
      setError(errorMessage(failure));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card quarantine-panel">
      <h2>Cuarentena</h2>
      <p className="hint">
        Aprueba mensaje por mensaje. Solo se moverán los que selecciones; la acción queda registrada.
      </p>

      <ErrorBox message={error} />
      {results && (
        <Notice message={`Se procesaron ${results.length} mensaje(s). Revisa el resultado por mensaje.`} />
      )}

      {loading ? (
        <p className="hint">Cargando candidatos…</p>
      ) : rows.length === 0 ? (
        <EmptyState>
          <p>No hay candidatos para poner en cuarentena</p>
          <p>Necesitas indicadores confirmados con mensajes relacionados.</p>
        </EmptyState>
      ) : (
        <ul className="quarantine-list">
          {rows.map((row) => (
            <li key={row.message.id}>
              <label className="quarantine-item">
                <input
                  type="checkbox"
                  checked={selected.has(row.message.id)}
                  onChange={() => toggle(row.message.id)}
                />
                <span>
                  <strong>{row.message.subject ?? '(sin asunto)'}</strong>
                  <span className="cell-sub">{row.message.fromAddress ?? 'remitente desconocido'}</span>
                  <span className="cell-sub">
                    {row.reasons.map((reason) => `${reason.location}: ${reason.matchedValue}`).join(' · ')}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="quarantine-actions">
        <span className="hint">{selected.size} mensaje(s) seleccionado(s)</span>
        <button
          type="button"
          className="btn btn-danger"
          disabled={selected.size === 0 || busy}
          onClick={() => setConfirming(true)}
        >
          {busy ? 'Aplicando…' : 'Poner en cuarentena'}
        </button>
      </div>

      {results && (
        <div className="table-wrapper" role="region" aria-labelledby="quarantine-results-caption" tabIndex={0}>
          <table className="reports-table">
            <caption id="quarantine-results-caption" className="visually-hidden">Resultado por mensaje</caption>
            <thead>
              <tr>
                <th scope="col">Mensaje</th>
                <th scope="col">Resultado</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.messageId}>
                  <th scope="row" className="mono">{result.messageId}</th>
                  <td><span className={`badge badge-outcome-${result.outcome}`}>{OUTCOME_LABEL[result.outcome]}</span></td>
                  <td>{result.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="¿Poner los mensajes en cuarentena?"
        description={`Se moverán ${selected.size} mensaje(s) a la carpeta de cuarentena del laboratorio. La acción es reversible desde "Acciones".`}
        busy={busy}
        onConfirm={execute}
        onClose={() => setConfirming(false)}
      />
    </section>
  );
}
