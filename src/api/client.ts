import type {
  AttachmentList,
  Candidate,
  ErrorResponse,
  Exclusion,
  Indicator,
  IndicatorStatus,
  Comment,
  IncidentDetail,
  IncidentStatus,
  IncidentSummary,
  IndicatorType,
  Mailbox,
  MessageDetail,
  MessageLocation,
  MessageSummary,
  Paginated,
  SyncResult,
  FindingList,
  LoginBody,
  RegisterBody,
  ReportDetail,
  ReportDocument,
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
    options?: ErrorOptions,
  ) {
    super(message, options);
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
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con la API. Comprueba que el servicio esté disponible.',
      undefined,
      undefined,
      { cause: error },
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
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
    // nginx devuelve el 413 como HTML. Si no hay JSON del contrato, lo
    // reconstruimos con el código y un mensaje que diga qué hacer.
    const err = isJson ? (payload as Partial<ErrorResponse> | undefined) : undefined;
    const tooLarge = response.status === 413 && !isJson;
    const unavailable = response.status === 503 && !isJson;
    const failure = new ApiError(
      response.status,
      err?.code ?? (tooLarge ? 'payload_too_large' : unavailable ? 'service_unavailable' : 'internal_error'),
      err?.message ??
        (tooLarge
          ? 'El archivo o el texto es demasiado grande. Reduce el tamaño e inténtalo de nuevo.'
          : unavailable
            ? 'El servicio de análisis (IMAP o ClamAV) no responde. Inténtalo de nuevo en unos minutos.'
            : `La API respondió ${response.status}.`),
      err?.requestId,
      err?.details,
      { cause: new Error(`Respuesta ${response.status} (${contentType || 'sin content-type'})`) },
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
  listAttachments: (id: string) =>
    request<AttachmentList>(`/reports/${segment(id)}/attachments`),
  getReportDocument: (id: string) =>
    request<ReportDocument>(`/reports/${segment(id)}/report`),

  listIndicators: (params: { status?: IndicatorStatus | ''; type?: IndicatorType | ''; page?: number; pageSize?: number } = {}) =>
    request<Paginated<Indicator>>(`/indicators${query(params)}`),
  createIndicator: (body: { type: IndicatorType; value: string; reportId?: string; note?: string }) =>
    request<Indicator>('/indicators', { method: 'POST', json: body }),
  confirmIndicator: (id: string) =>
    request<Indicator>(`/indicators/${segment(id)}/confirm`, { method: 'POST' }),
  dismissIndicator: (id: string) =>
    request<Indicator>(`/indicators/${segment(id)}/dismiss`, { method: 'POST' }),
  listCandidates: (id: string, params: { page?: number; pageSize?: number } = {}) =>
    request<Paginated<Candidate>>(`/indicators/${segment(id)}/candidates${query(params)}`),

  listExclusions: () => request<{ items: Exclusion[] }>('/exclusions'),
  createExclusion: (body: { domain: string; reason?: string }) =>
    request<Exclusion>('/exclusions', { method: 'POST', json: body }),
  deleteExclusion: (id: string) =>
    request<void>(`/exclusions/${segment(id)}`, { method: 'DELETE' }),

  listMailboxes: () => request<{ items: Mailbox[] }>('/mailboxes'),
  syncMailbox: (id: string) =>
    request<SyncResult>(`/mailboxes/${segment(id)}/sync`, { method: 'POST' }),
  simulateDelivery: (mailboxId: string, reportId: string) =>
    request<{ message: MessageSummary }>(`/mailboxes/${segment(mailboxId)}/simulated-delivery`, {
      method: 'POST',
      json: { reportId },
    }),
  listMessages: (params: { mailboxId?: string; location?: MessageLocation | ''; page?: number; pageSize?: number } = {}) =>
    request<Paginated<MessageSummary>>(`/messages${query(params)}`),
  getMessage: (id: string) => request<MessageDetail>(`/messages/${segment(id)}`),

  listIncidents: (params: { status?: IncidentStatus | ''; page?: number; pageSize?: number } = {}) =>
    request<Paginated<IncidentSummary>>(`/incidents${query(params)}`),
  createIncident: (body: { title: string; description?: string }) =>
    request<IncidentDetail>('/incidents', { method: 'POST', json: body }),
  getIncident: (id: string) => request<IncidentDetail>(`/incidents/${segment(id)}`),
  updateIncident: (id: string, body: { title?: string; description?: string; status?: IncidentStatus }) =>
    request<IncidentDetail>(`/incidents/${segment(id)}`, { method: 'PATCH', json: body }),
  addIncidentReport: (id: string, reportId: string) =>
    request<IncidentDetail>(`/incidents/${segment(id)}/reports`, { method: 'POST', json: { reportId } }),
  removeIncidentReport: (id: string, reportId: string) =>
    request<void>(`/incidents/${segment(id)}/reports/${segment(reportId)}`, { method: 'DELETE' }),
  addIncidentIndicator: (id: string, indicatorId: string) =>
    request<IncidentDetail>(`/incidents/${segment(id)}/indicators`, { method: 'POST', json: { indicatorId } }),
  removeIncidentIndicator: (id: string, indicatorId: string) =>
    request<void>(`/incidents/${segment(id)}/indicators/${segment(indicatorId)}`, { method: 'DELETE' }),
  addComment: (id: string, body: string) =>
    request<Comment>(`/incidents/${segment(id)}/comments`, { method: 'POST', json: { body } }),
  getReportText: (id: string) =>
    request<string>(`/reports/${segment(id)}/text`, { accept: 'text/plain' }),
  reportHtmlUrl: (id: string) => `${API_BASE}/reports/${segment(id)}/html`,
};
