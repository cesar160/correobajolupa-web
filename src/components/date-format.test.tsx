import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReputationPanel } from './ReputationPanel';
import { formatDate } from './ui';
import { VerdictCard } from './VerdictCard';

afterEach(() => vi.unstubAllEnvs());

describe('fechas mostradas al usuario', () => {
  it('muestra los instantes en la zona local, incluso al cambiar de día', () => {
    vi.stubEnv('TZ', 'America/Mexico_City');
    expect(formatDate('2026-11-25T13:50:00.000Z')).toContain('7:50 a.m.');
    expect(formatDate('2026-11-25T02:30:00.000Z')).toContain('24 nov 2026, 8:30 p.m.');
    expect(formatDate('fecha inválida')).toBe('—');
  });

  it('no confunde la hora local del informe con UTC', () => {
    vi.stubEnv('TZ', 'America/Mexico_City');
    const html = renderToStaticMarkup(<ReputationPanel review={{
      status: 'checked',
      items: [{ displayUrl: 'hxxps://sitio[.]example/', state: 'no_detections', malicious: 0, total: 90, analyzedAt: '2026-11-25T13:50:00.000Z' }],
    }} />);
    expect(html).toContain('7:50 a.m. (hora local)');
    expect(html).not.toContain('(UTC)');
  });

  it('conserva las fechas de calendario sin desplazarlas al día anterior', () => {
    vi.stubEnv('TZ', 'America/Mexico_City');
    const html = renderToStaticMarkup(<VerdictCard verdict={{ kind: 'reported', source: 'Lista', date: '2026-11-25' }} />);
    expect(html).toContain('25 nov 2026');
    expect(html).not.toContain('24 nov 2026');
  });
});
