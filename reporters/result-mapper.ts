import type { TestStatus } from '@playwright/test/reporter';
import type { ExecutionStatus, TraceabilityStatus } from '../types/test-result.types';
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
