// Tipos generados desde contract/openapi.json v0.4.0 (repo correobajolupa-api).
// Regenerar con:
//   npx openapi-typescript ../correobajolupa-api/contract/openapi.json -o src/api/schema.d.ts
// Los alias de abajo mantienen los nombres que ya usa el front.

import type { components } from './schema';

type Schemas = components['schemas'];

export type Role = Schemas['Role'];
export type ErrorCode = Schemas['ErrorCode'];
export type ErrorDetail = Schemas['ErrorResponse']['details'] extends Array<infer T> | undefined ? T : never;
export type ErrorResponse = Schemas['ErrorResponse'];
export type User = Schemas['User'];
export type Session = Schemas['Session'];
export type RegisterBody = Schemas['RegisterBody'];
export type LoginBody = Schemas['LoginBody'];
export type UpdateUserBody = Schemas['UpdateUserBody'];
export type UserList = Schemas['UserList'];
export type ReportStatus = Schemas['ReportStatus'];
export type ReportSource = Schemas['ReportSource'];
export type Priority = Schemas['Priority'];
export type LimitedReason = Schemas['LimitedReason'];
export type AuthResult = 'pass' | 'fail' | 'none' | 'unknown';
export type ReportLink = Schemas['ReportLink'];
export type ReportSummary = Schemas['ReportSummary'];
export type ReportList = Schemas['ReportList'];
export type Authentication = NonNullable<Schemas['ReportDetail']['authentication']>;
export type ReportDetail = Schemas['ReportDetail'];
export type ReputationReview = Schemas['ReputationReview'];
export type RuleId = Schemas['RuleId'];
export type EvidenceItem = Schemas['EvidenceItem'];
export type Finding = Schemas['Finding'];
export type FindingList = Schemas['FindingList'];
export type PasteBody = Schemas['PasteBody'];

export type ScanStatus = Schemas['ScanStatus'];
export type Attachment = Schemas['Attachment'];
export type AttachmentList = Schemas['AttachmentList'];

export type IndicatorType = Schemas['IndicatorType'];
export type NoteKind = Schemas['ReportNoteKind'];
export type GuideFinding = Schemas['GuideFinding'];
export type ReportDocument = Schemas['ReportDocument'];

export type IndicatorStatus = Schemas['IndicatorStatus'];
export type Indicator = Schemas['Indicator'];
export type MessageSummary = Schemas['MessageSummary'];
export type MessageDetail = Schemas['MessageDetail'];
export type CandidateReason = Schemas['Candidate']['reasons'][number];
export type Candidate = Schemas['Candidate'];
export type Exclusion = Schemas['Exclusion'];

export type MailboxLabel = Schemas['Mailbox']['label'];
export type SyncStatus = Schemas['Mailbox']['lastSyncStatus'];
export type MessageLocation = Schemas['MessageSummary']['location'];
export type Mailbox = Schemas['Mailbox'];
export type SyncResult = Schemas['SyncResult'];

export type IncidentStatus = Schemas['IncidentStatus'];
export type Comment = Schemas['Comment'];
export type IncidentSummary = Schemas['IncidentSummary'];
export type IncidentDetail = Schemas['IncidentDetail'];

export type QuarantineOutcome = Schemas['QuarantineResponse']['results'][number]['outcome'];
export type QuarantineResult = Schemas['QuarantineResponse']['results'][number];
export type QuarantineResponse = Schemas['QuarantineResponse'];
export type Action = Schemas['Action'];
export type RestoreResponse = Schemas['RestoreResponse'];
export type AuditEvent = Schemas['AuditEvent'];

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
