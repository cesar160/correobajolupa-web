import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { NO_SIGNALS_TEXT, type Verdict } from '../lib/verdict';
import { Icon } from './Icon';
import { formatDate } from './ui';

function formatEvidenceDate(value: string): string {
  // Una fecha de calendario no representa un instante: no desplazarla según la zona del navegador.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
  }
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDate(value) : value;
}

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  if (verdict.kind === 'reported') {
    return (
      <div className="verdict verdict-reported">
        <span className="verdict-icon"><Icon as={ShieldAlert} size={20} /></span>
        <div>
          <span className="meta-label">Veredicto</span>
          <p className="verdict-title">Reportada como maliciosa</p>
          <p className="verdict-meta">
            Fuente: {verdict.source}
            {verdict.date && ` · ${formatEvidenceDate(verdict.date)}`}
          </p>
        </div>
      </div>
    );
  }
  if (verdict.kind === 'suspicious') {
    return (
      <div className="verdict verdict-suspicious">
        <span className="verdict-icon"><Icon as={ShieldQuestion} size={20} /></span>
        <div>
          <span className="meta-label">Veredicto</span>
          <p className="verdict-title">Sospechosa</p>
          <p className="verdict-meta">Señales: {verdict.signals.join(' · ')}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="verdict verdict-none">
      <span className="verdict-icon"><Icon as={ShieldCheck} size={20} /></span>
      <div>
        <span className="meta-label">Veredicto</span>
        <p className="verdict-title">Sin señales</p>
        <p className="verdict-meta">{NO_SIGNALS_TEXT}</p>
      </div>
    </div>
  );
}
