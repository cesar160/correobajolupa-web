import type { EvidenceItem, ReputationReview, RuleId } from '../api/types';
import { formatDate } from './ui';

const STATE_TEXT: Record<ReputationReview['items'][number]['state'], string> = {
  reported: 'Marcada por al menos 3 motores',
  suspicious: 'Marcada por 1 o 2 motores',
  no_detections: 'Sin detecciones en el informe consultado; no significa que sea segura',
  no_data: 'Sin datos en la fuente; no significa que sea segura',
  error: 'Consulta fallida; no significa que sea segura',
  not_checked: 'No consultada; no significa que sea segura',
};

type FeedFinding = { ruleId: RuleId; evidence: EvidenceItem[] };
type FeedMatch = { key: string; url: string; source: string; match: string | null; date: string | null };

const FUENTES_LOCALES = ['URLhaus', 'OpenPhish'];

/** Solo los R10 de listas descargadas; VirusTotal se muestra en su propia lista. */
export function feedMatches(findings: readonly FeedFinding[]): FeedMatch[] {
  return findings.flatMap((finding, index) => {
    if (finding.ruleId !== 'R10') return [];
    const value = (label: string) => finding.evidence.find((item) => item.label === label)?.value ?? null;
    const source = value('Fuente');
    const url = value('Enlace');
    if (!url || !source || !FUENTES_LOCALES.some((name) => source.startsWith(name))) return [];
    return [{
      key: `${index}-${url}`,
      url,
      source,
      match: value('Coincidencia'),
      date: value('Fecha de la lista'),
    }];
  });
}

/** Solo texto: ningún resultado, ni siquiera la URL desactivada, se convierte en enlace. */
export function ReputationPanel({ review, findings = [] }: { review?: ReputationReview; findings?: readonly FeedFinding[] }) {
  const status = review?.status ?? 'not_configured';
  const matches = feedMatches(findings);
  return (
    <section className="card reputation-panel">
      <h2>Reputación de enlaces</h2>
      <p className="hint">
        Los informes externos solo consultan resultados existentes. La ausencia de detecciones o de datos no demuestra que un enlace sea seguro. Las listas locales se comparan solo por hashes; no se visitan los enlaces.
      </p>
      <h3 className="reputation-subheading">Informes externos</h3>
      {status === 'not_configured' && (
        <p className="notice">Consulta externa no configurada. Las reglas locales siguen funcionando.</p>
      )}
      {status === 'unavailable' && (
        <p className="notice notice-warn">
          Fuente no disponible o cuota agotada. Los resultados locales no cambian; los enlaces sin consultar no son seguros por defecto.
        </p>
      )}
      {status !== 'not_configured' && review?.items.length === 0 && (
        <p className="hint">No hay enlaces elegibles para esta consulta.</p>
      )}
      {review && review.items.length > 0 && (
        <ul className="reputation-list" role="list">
          {review.items.map((item, index) => (
            <li className="reputation-item" key={`${item.displayUrl}-${index}`}>
              <span className="mono reputation-url">{item.displayUrl}</span>
              <span>{STATE_TEXT[item.state]}</span>
              {item.malicious !== null && item.total !== null && (
                <span>Motores que la marcaron: {item.malicious} de {item.total}.</span>
              )}
              {item.analyzedAt && <span className="hint">Informe del {formatDate(item.analyzedAt)} (hora local).</span>}
            </li>
          ))}
        </ul>
      )}
      {matches.length > 0 && (
        <>
          <h3 className="reputation-subheading">Listas locales de reputación</h3>
          <ul className="reputation-list" role="list">
            {matches.map((match) => (
              <li className="reputation-item" key={match.key}>
                <span className="mono reputation-url">{match.url}</span>
                <span>Fuente: {match.source}</span>
                {match.match && <span>Coincidencia: {match.match}</span>}
                {match.date && <span className="hint">Lista del {formatDate(match.date)} (hora local).</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
