import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, errorMessage, getCsrfToken, setCsrfToken, setUnauthorizedHandler } from './client';

const okJson = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('cliente API', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setCsrfToken(null);
    setUnauthorizedHandler(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa la URL relativa /api/v1 y envía credenciales', async () => {
    fetchMock.mockResolvedValue(okJson({ user: {}, csrfToken: 't' }));
    await api.me();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it('envía X-CSRF-Token solo en peticiones que modifican', async () => {
    setCsrfToken('token-123');
    fetchMock.mockResolvedValue(okJson({ items: [] }));

    await api.listReports();
    const getInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((getInit.headers as Headers).has('X-CSRF-Token')).toBe(false);

    await api.deleteReport('reporte-1');
    const delInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect((delInit.headers as Headers).get('X-CSRF-Token')).toBe('token-123');
    expect(delInit.method).toBe('DELETE');
  });

  it('no envía la cabecera CSRF si no hay token', async () => {
    fetchMock.mockResolvedValue(okJson({ ok: true }));
    await api.logout();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).has('X-CSRF-Token')).toBe(false);
  });

  it('guarda y limpia el token CSRF', () => {
    setCsrfToken('abc');
    expect(getCsrfToken()).toBe('abc');
    setCsrfToken(null);
    expect(getCsrfToken()).toBeNull();
  });

  it('llama al handler de 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'unauthenticated', message: 'No sesión', requestId: 'r1' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('mapea un 413 sin JSON a payload_too_large con mensaje accionable', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>413 Request Entity Too Large</html>', {
        status: 413,
        headers: { 'content-type': 'text/html' },
      }),
    );

    const error = await api.pasteReport('x'.repeat(10)).catch((failure) => failure);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(413);
    expect(error.code).toBe('payload_too_large');
    expect(error.message).toMatch(/demasiado grande/i);
  });

  it('mapea un 503 sin JSON a service_unavailable', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>503</html>', {
        status: 503,
        headers: { 'content-type': 'text/html' },
      }),
    );

    const error = await api.listMailboxes().catch((failure) => failure);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(503);
    expect(error.code).toBe('service_unavailable');
    expect(error.message).toMatch(/no responde/i);
  });

  it('respeta el código del contrato cuando el error sí trae JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'conflict', message: 'Ya existe', requestId: 'r2', details: [{ field: 'domain', message: 'duplicado' }] }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      ),
    );

    const error = await api.createExclusion({ domain: 'x.test' }).catch((failure) => failure);
    expect(error.code).toBe('conflict');
    expect(error.requestId).toBe('r2');
    expect(error.details?.[0].field).toBe('domain');
    expect(errorMessage(error)).toMatch(/domain/);
  });

  it('envuelve los fallos de red con cause', async () => {
    const networkError = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(networkError);

    const error = await api.me().catch((failure) => failure);
    expect(error.code).toBe('network_error');
    expect(error.cause).toBe(networkError);
  });

  it('codifica los segmentos de la ruta', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await api.deleteReport('id con/espacio');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/reports/id%20con%2Fespacio');
  });
});
