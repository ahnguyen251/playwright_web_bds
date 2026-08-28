import path from 'node:path';
import type { TestStatus } from '@playwright/test/reporter';

import type { EvidenceType, TraceabilityStatus } from '../../types/test-result.types';
import type { AttachmentClassification, FailureClassification } from './evidence-contracts';

interface EvidenceMimePolicy {
  readonly role: EvidenceType;
  readonly extensions: readonly string[];
  readonly defaultExtension: string;
}

const MIME_POLICIES: Readonly<Record<string, EvidenceMimePolicy>> = Object.freeze({
  'image/png': {
    role: 'SCREENSHOT',
    extensions: ['.png'],
    defaultExtension: '.png',
  },
  'image/jpeg': {
    role: 'SCREENSHOT',
    extensions: ['.jpg', '.jpeg'],
    defaultExtension: '.jpg',
  },
  'video/webm': {
    role: 'VIDEO',
    extensions: ['.webm'],
    defaultExtension: '.webm',
  },
  'application/zip': {
    role: 'TRACE',
    extensions: ['.zip'],
    defaultExtension: '.zip',
  },
  'text/plain': {
    role: 'LOG',
    extensions: ['.txt', '.log'],
    defaultExtension: '.txt',
  },
  'text/markdown': {
    role: 'LOG',
    extensions: ['.md', '.markdown'],
    defaultExtension: '.md',
  },
  'application/json': {
    role: 'OTHER',
    extensions: ['.json'],
    defaultExtension: '.json',
  },
  'text/csv': {
    role: 'OTHER',
    extensions: ['.csv'],
    defaultExtension: '.csv',
  },
});

const normalizeContentType = (contentType: string): string =>
  (contentType.split(';', 1)[0] ?? '').trim().toLowerCase();

export const classifyAttachment = (
  name: string,
  contentType: string,
): AttachmentClassification | undefined => {
  const normalizedContentType = normalizeContentType(contentType);
  const policy = MIME_POLICIES[normalizedContentType];
  if (!policy) return undefined;

  const suppliedExtension = path.extname(name).toLowerCase();
  if (suppliedExtension && !policy.extensions.includes(suppliedExtension)) return undefined;

  return {
    role: policy.role,
    contentType: normalizedContentType,
    extension: suppliedExtension || policy.defaultExtension,
  };
};

export const classifyFailure = (
  actualStatus: TestStatus,
  expectedStatus: TestStatus,
  traceabilityStatus: TraceabilityStatus,
): FailureClassification => {
  const actualFailure = ['failed', 'timedOut', 'interrupted'].includes(actualStatus);
  const expectedFailure = actualStatus === 'failed' && expectedStatus === 'failed';
  const unexpectedFailure = actualStatus !== 'skipped' && actualStatus !== expectedStatus;

  return {
    actualFailure,
    expectedFailure,
    unexpectedFailure,
    actualFailedBusinessExecution: traceabilityStatus === 'MAPPED' && actualFailure,
  };
};
