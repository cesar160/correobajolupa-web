// Espejo de contract/openapi.json v0.2.0 (repo correobajolupa-api).
// Rutas, campos y valores en inglés; textos para personas en español.

export type Role = 'reporter' | 'analyst' | 'admin';

export type ErrorCode =
  | 'validation_error'
  | 'unauthenticated'
  | 'invalid_credentials'
  | 'forbidden'
  | 'not_found'
  | 'email_taken'
  | 'conflict'
  | 'report_not_ready'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'rate_limited'
  | 'internal_error';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
  requestId: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Session {
  user: User;
  csrfToken: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  inviteCode?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface UpdateUserBody {
  role?: Role;
  active?: boolean;
}

export interface UserList {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
}

export type ReportStatus = 'queued' | 'processing' | 'completed' | 'limited' | 'failed';
export type ReportSource = 'eml' | 'paste';
export type Priority = 'low' | 'medium' | 'high';
export type LimitedReason = 'missing_headers' | 'parse_error';
export type AuthResult = 'pass' | 'fail' | 'none' | 'unknown';

export interface ReportLink {
  displayText: string | null;
  defangedUrl: string;
  domain: string | null;
}

export interface ReportSummary {
  id: string;
  status: ReportStatus;
  source: ReportSource;
  subject: string | null;
  fromAddress: string | null;
  priority: Priority | null;
  findingsCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface ReportList {
  items: ReportSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Authentication {
  spf: AuthResult;
  dkim: AuthResult;
  dmarc: AuthResult;
}

export interface ReportDetail extends ReportSummary {
  limitedReason: LimitedReason | null;
  rulesVersion: string | null;
  analyzedAt: string | null;
  links: ReportLink[];
  hasHtml: boolean;
  authentication: Authentication | null;
}

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8';

export interface EvidenceItem {
  label: string;
  value: string;
}

export interface Finding {
  id: string;
  ruleId: RuleId;
  ruleName: string;
  summary: string;
  evidence: EvidenceItem[];
  rulesVersion: string;
  createdAt: string;
}

export interface FindingList {
  items: Finding[];
}

export type ScanStatus = 'not_detected' | 'detected' | 'unsupported' | 'error';

export interface Attachment {
  id: string;
  fileName: string | null;
  declaredType: string | null;
  detectedType: string | null;
  sizeBytes: number;
  sha256: string;
  scanStatus: ScanStatus;
  scanDetail: string | null;
  scannedAt: string | null;
}

export interface AttachmentList {
  items: Attachment[];
}

export type IndicatorType = 'domain' | 'url' | 'sha256' | 'sender';

export type NoteKind = 'limited' | 'no_findings' | 'failed' | 'auth_informative';

export interface GuideFinding {
  ruleId: RuleId;
  title: string;
  whatItMeans: string;
  whyRisky: string;
  whatToDo: string[];
  forAnalyst: string[];
  evidence: EvidenceItem[];
}

export interface ReportDocument {
  reportId: string;
  generatedAt: string;
  rulesVersion: string | null;
  guideVersion: string;
  status: ReportStatus;
  limitedReason: LimitedReason | null;
  priority: Priority | null;
  summary: { headline: string; text: string };
  findings: GuideFinding[];
  indicators: { type: IndicatorType; displayValue: string }[];
  attachments: { fileName: string | null; sha256: string; scanStatus: ScanStatus }[];
  notes: { kind: NoteKind; title: string; text: string }[];
}

export interface PasteBody {
  text: string;
}
