import type { TestStatus } from '@playwright/test/reporter';
import type {
  ExecutionStatus,
  EvidenceType,
  TestEvidence,
  TraceabilityStatus,
} from '../types/test-result.types';
import { parseTestCaseId } from '../utils/test-tracking';
import { allTestCases } from '../test-cases/index';

export const mapPlaywrightStatus = (status: TestStatus): ExecutionStatus => {
  switch (status) {
    case 'passed':
      return 'PASSED';
    case 'failed':
      return 'FAILED';
    case 'skipped':
      return 'SKIPPED';
    case 'timedOut':
      return 'TIMED_OUT';
    case 'interrupted':
      return 'INTERRUPTED';
    default:
      return 'FAILED';
  }
};

export const mapEvidence = (
  attachments: readonly { name: string; contentType: string; path?: string }[],
): TestEvidence[] => {
  return attachments
    .filter((a) => a.path)
    .map((a) => {
      let type: EvidenceType = 'OTHER';
      const cType = a.contentType || '';

      if (cType.startsWith('image/')) type = 'SCREENSHOT';
      else if (cType.startsWith('video/')) type = 'VIDEO';
      else if (cType === 'application/zip' || a.name.includes('trace')) type = 'TRACE';
      else if (cType.startsWith('text/')) type = 'LOG';

      return {
        type,
        path: a.path!,
        contentType: a.contentType,
      };
    });
};

export const resolveTraceability = (
  title: string,
): { testCaseId: string | null; traceabilityStatus: TraceabilityStatus } => {
  const id = parseTestCaseId(title);
  if (!id) {
    return { testCaseId: null, traceabilityStatus: 'UNMAPPED' };
  }

  const exists = allTestCases.some((tc) => tc.id === id);
  if (!exists) {
    return { testCaseId: id, traceabilityStatus: 'UNKNOWN_TEST_CASE_ID' };
  }

  return { testCaseId: id, traceabilityStatus: 'MAPPED' };
};
