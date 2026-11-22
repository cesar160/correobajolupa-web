import type {
  ErrorResponse,
  FindingList,
  LoginBody,
  RegisterBody,
  ReportDetail,
  ReportList,
  ReportSummary,
  Session,
  UpdateUserBody,
  User,
  UserList,
} from './types';

/** Todas las llamadas son relativas: el navegador siempre ve el mismo origen. */
export const API_BASE = '/api/v1';

let csrfToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: ErrorResponse['details'],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details?.length) {
      return `${error.message} (${error.details.map((d) => d.field).join(', ')})`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  json?: unknown;
  body?: BodyInit;
  accept?: string;
  signal?: AbortSignal;
}

const MUTATING = new Set<Method>(['POST', 'PATCH', 'DELETE']);

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, body, accept = 'application/json', signal } = options;
  const headers = new Headers();
  headers.set('Accept', accept);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  // La API exige CSRF en toda petición que modifica datos, salvo login y registro.
  if (MUTATING.has(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ?? (json !== undefined ? JSON.stringify(json) : undefined),
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', 'No se pudo conectar con la API. Comprueba que el servicio esté disponible.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown;
  if (response.status === 204) {
    payload = undefined;
  } else if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const err = payload as Partial<ErrorResponse> | undefined;
    const failure = new ApiError(
      response.status,
      err?.code ?? 'internal_error',
      err?.message ?? `La API respondió ${response.status}.`,
      err?.requestId,
      err?.details,
    );
    if (response.status === 401) onUnauthorized?.();
    throw failure;
  }

  return payload as T;
}

type QueryValue = string | number | boolean | undefined | null;

function query(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

const segment = (id: string) => encodeURIComponent(id);

export const api = {
  health: () => request<{ status: 'ok' }>('/health'),

  register: (body: RegisterBody) =>
    request<Session>('/auth/register', { method: 'POST', json: body }),
  login: (body: LoginBody) =>
    request<Session>('/auth/login', { method: 'POST', json: body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<Session>('/auth/me'),

  listUsers: (params: { page?: number; pageSize?: number; role?: string } = {}) =>
    request<UserList>(`/users${query(params)}`),
  updateUser: (userId: string, body: UpdateUserBody) =>
    request<User>(`/users/${segment(userId)}`, { method: 'PATCH', json: body }),

  uploadReport: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ReportSummary>('/reports', { method: 'POST', body: form });
  },
  pasteReport: (text: string) =>
    request<ReportSummary>('/reports/paste', { method: 'POST', json: { text } }),
  listReports: (params: { page?: number; pageSize?: number; status?: string } = {}) =>
    request<ReportList>(`/reports${query(params)}`),
  getReport: (id: string) => request<ReportDetail>(`/reports/${segment(id)}`),
  deleteReport: (id: string) =>
    request<void>(`/reports/${segment(id)}`, { method: 'DELETE' }),
  listFindings: (id: string) =>
    request<FindingList>(`/reports/${segment(id)}/findings`),
  getReportText: (id: string) =>
    request<string>(`/reports/${segment(id)}/text`, { accept: 'text/plain' }),
  reportHtmlUrl: (id: string) => `${API_BASE}/reports/${segment(id)}/html`,
};
