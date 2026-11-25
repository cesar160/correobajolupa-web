import { describe, expect, it } from 'vitest';
import { deriveVerdict, type VerdictFinding } from './verdict';

const finding = (ruleId: VerdictFinding['ruleId'], evidence: VerdictFinding['evidence'] = []): VerdictFinding => ({
  ruleId,
  title: `Regla ${ruleId}`,
  evidence,
});

describe('deriveVerdict', () => {
  it('R10 es reportada y lleva la fuente y la fecha de su evidencia', () => {
    const verdict = deriveVerdict('completed', [
      finding('R2'),
      finding('R10', [
        { label: 'Fuente', value: 'Lista de prueba' },
        { label: 'Fecha de la lista', value: '2026-11-24' },
      ]),
    ]);
    expect(verdict).toEqual({ kind: 'reported', source: 'Lista de prueba', date: '2026-11-24' });
  });

  it('R8 también es reportada, con el indicador como fuente', () => {
    expect(deriveVerdict('completed', [finding('R8')])).toMatchObject({ kind: 'reported' });
  });

  it('otros hallazgos son sospechosa y listan sus señales', () => {
    expect(deriveVerdict('completed', [finding('R1'), finding('R5')])).toEqual({
      kind: 'suspicious',
      signals: ['Regla R1', 'Regla R5'],
    });
  });

  it('sin hallazgos y completo es "sin señales", nunca "seguro"', () => {
    expect(deriveVerdict('completed', [])).toEqual({ kind: 'none' });
  });

  it('no juzga un análisis en curso, fallido o limitado sin hallazgos', () => {
    expect(deriveVerdict('queued', [])).toBeNull();
    expect(deriveVerdict('processing', [finding('R1')])).toBeNull();
    expect(deriveVerdict('failed', [])).toBeNull();
    expect(deriveVerdict('limited', [])).toBeNull();
  });
});
