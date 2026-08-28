import type { EvidenceType, TestRunResult } from '../../types/test-result.types';

export interface AttachmentClassification {
  readonly role: EvidenceType;
  readonly contentType: string;
  readonly extension: string;
}

export interface FailureClassification {
  readonly actualFailure: boolean;
  readonly expectedFailure: boolean;
  readonly unexpectedFailure: boolean;
  readonly actualFailedBusinessExecution: boolean;
}

export interface ExecutionIdentity {
  readonly projectName?: string;
  readonly playwrightTestId: string;
  readonly repeatEachIndex: number;
  readonly retry: number;
}

export interface ArchiveAttachmentInput {
  readonly name: string;
  readonly contentType: string;
  readonly path?: string;
  readonly body?: Buffer;
}

export interface PersistExecutionInput extends ExecutionIdentity {
  readonly runId: string;
  readonly testCaseId: string | null;
  readonly attachments: readonly ArchiveAttachmentInput[];
  readonly approvedSourceRoots: readonly string[];
}

export interface PersistedEvidence {
  readonly type: EvidenceType;
  readonly path: string;
  readonly contentType: string;
}

export interface SkippedAttachment {
  readonly name: string;
  readonly reason: 'UNSUPPORTED_TYPE' | 'MISSING_PAYLOAD';
}

export interface PersistExecutionOutput {
  readonly executionKey: string;
  readonly evidence: readonly PersistedEvidence[];
  readonly skipped: readonly SkippedAttachment[];
}

export interface FinalizeRunInput {
  readonly runId: string;
  readonly manifest: TestRunResult;
}

export interface FinalizeRunOutput {
  readonly runDirectory: string;
  readonly manifestPath: string;
  readonly manifestRelativePath: string;
}

export interface EvidenceArchiveServiceOptions {
  readonly evidenceRoot: string;
  readonly randomNonce?: () => string;
}

export interface FinalizedRunInspection {
  readonly status: 'FINALIZED' | 'MISSING' | 'NOT_FINALIZED';
  readonly runId: string;
  readonly fileCount: number;
  readonly bytes: number;
}

export interface CleanupTrashMove {
  readonly runId: string;
  readonly originalDirectory: string;
  readonly trashDirectory: string;
}

export type EvidenceArchiveErrorCode =
  | 'ACTIVE_RUN_EXISTS'
  | 'APPROVED_SOURCE_ROOT_INVALID'
  | 'CLEANUP_MOVE_FAILED'
  | 'CLEANUP_PURGE_FAILED'
  | 'CLEANUP_RESTORE_FAILED'
  | 'CLEANUP_RUN_INVALID'
  | 'CLEANUP_RUN_NOT_FINALIZED'
  | 'CLEANUP_TRASH_INVALID'
  | 'EXECUTION_ALREADY_PERSISTED'
  | 'FINALIZE_FAILED'
  | 'FINAL_RUN_ALREADY_EXISTS'
  | 'INVALID_ATTACHMENT_PAYLOAD'
  | 'INVALID_RUN_ID'
  | 'MANIFEST_EVIDENCE_NOT_PERSISTED'
  | 'NO_ACTIVE_RUN'
  | 'PERSIST_FAILED'
  | 'ROLLBACK_PATH_INVALID'
  | 'RUN_ID_MISMATCH'
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_NOT_REGULAR_FILE'
  | 'SOURCE_OUTSIDE_APPROVED_ROOT'
  | 'STAGED_EVIDENCE_MISSING'
  | 'STAGING_RUN_ALREADY_EXISTS';
