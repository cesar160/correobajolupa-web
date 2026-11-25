import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ReputationReview } from '../api/types';
import { ReputationPanel } from './ReputationPanel';

const item = (state: ReputationReview['items'][number]['state'], malicious: number | null = null): ReputationReview['items'][number] => ({
  displayUrl: 'hxxps://sitio[.]example/ruta',
  state,
  malicious,
  total: malicious === null ? null : 90,
  analyzedAt: null,
});

describe('ReputationPanel', () => {
  it('distingue ausencia de configuración de ausencia de datos', () => {
    const off = renderToStaticMarkup(<ReputationPanel review={{ status: 'not_configured', items: [] }} />);
    expect(off).toContain('Consulta externa no configurada');
    expect(off).not.toContain('Sin detecciones');

    const noData = renderToStaticMarkup(<ReputationPanel review={{ status: 'checked', items: [item('no_data')] }} />);
    expect(noData).toContain('Sin datos en la fuente');
    expect(noData).toContain('no significa que sea segura');
    expect(noData).not.toContain('<a ');
  });

  it('un fallo y una URL no consultada no aparecen como seguras', () => {
    const html = renderToStaticMarkup(<ReputationPanel review={{ status: 'unavailable', items: [item('error'), item('not_checked')] }} />);
    expect(html).toContain('Fuente no disponible');
    expect(html).toContain('Consulta fallida');
    expect(html).toContain('No consultada');
    expect(html).not.toContain('<a ');
  });

  it('muestra cero y tres detecciones como conteos, sin enlazar el destino', () => {
    const html = renderToStaticMarkup(<ReputationPanel review={{ status: 'checked', items: [item('no_detections', 0), item('reported', 3)] }} />);
    expect(html).toContain('0 de 90');
    expect(html).toContain('3 de 90');
    expect(html).toContain('hxxps://sitio[.]example/ruta');
    expect(html).not.toContain('https://sitio.example/ruta');
    expect(html).not.toContain('<a ');
  });
});
