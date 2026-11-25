import type { ReputationReview } from '../api/types';
import { formatDate } from './ui';

const STATE_TEXT: Record<ReputationReview['items'][number]['state'], string> = {
  reported: 'Marcada por al menos 3 motores',
  suspicious: 'Marcada por 1 o 2 motores',
  no_detections: 'Sin detecciones en el informe consultado; no significa que sea segura',
  no_data: 'Sin datos en la fuente; no significa que sea segura',
  error: 'Consulta fallida; no significa que sea segura',
  not_checked: 'No consultada; no significa que sea segura',
};

/** Solo texto: ningún resultado, ni siquiera la URL desactivada, se convierte en enlace. */
export function ReputationPanel({ review }: { review?: ReputationReview }) {
  const status = review?.status ?? 'not_configured';
  return (
    <section className="card reputation-panel">
      <h2>Reputación de enlaces</h2>
      <p className="hint">
        Esta fuente solo consulta informes existentes. La ausencia de detecciones o de datos no demuestra que un enlace sea seguro.
      </p>
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
    </section>
  );
}
