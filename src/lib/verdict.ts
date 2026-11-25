import type { EvidenceItem, ReportStatus, RuleId } from '../api/types';

/**
 * Veredicto del informe en tres niveles. La API no lo envía: se deriva de los
 * hallazgos. R10 (lista de reputación) y R8 (indicador confirmado) cuentan como
 * "reportada", siempre con su fuente y fecha; cualquier otro hallazgo es
 * "sospechosa"; sin hallazgos es "sin señales", que nunca significa seguro.
 */
export type Verdict =
  | { kind: 'reported'; source: string; date: string | null }
  | { kind: 'suspicious'; signals: string[] }
  | { kind: 'none' };

export interface VerdictFinding {
  ruleId: RuleId;
  title: string;
  evidence: EvidenceItem[];
}

export const NO_SIGNALS_TEXT = 'Sin señales detectadas. Esto no significa que sea seguro.';

const DATE_LABELS = ['Fecha de la lista', 'Fecha del informe'];

function evidenceValue(finding: VerdictFinding, labels: string[]): string | null {
  return finding.evidence.find((item) => labels.includes(item.label))?.value ?? null;
}

/** Devuelve null mientras no haya un resultado que juzgar (en curso, fallido o limitado sin hallazgos). */
export function deriveVerdict(status: ReportStatus, findings: VerdictFinding[]): Verdict | null {
  if (status === 'queued' || status === 'processing' || status === 'failed') return null;

  const listed = findings.find((finding) => finding.ruleId === 'R10');
  if (listed) {
    return {
      kind: 'reported',
      source: evidenceValue(listed, ['Fuente']) ?? 'Lista de reputación',
      date: evidenceValue(listed, DATE_LABELS),
    };
  }
  if (findings.some((finding) => finding.ruleId === 'R8')) {
    return { kind: 'reported', source: 'Indicador confirmado por un analista', date: null };
  }
  if (findings.length > 0) return { kind: 'suspicious', signals: findings.map((finding) => finding.title) };
  if (status === 'limited') return null;
  return { kind: 'none' };
}
