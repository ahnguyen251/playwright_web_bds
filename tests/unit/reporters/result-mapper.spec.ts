import { test, expect } from '@playwright/test';
import { mapPlaywrightStatus, resolveTraceability } from '../../../reporters/result-mapper';
import { allTestCases } from '../../../test-cases/index';

test.describe('Result Mapper Utilities', () => {
  test('mapPlaywrightStatus -> correctly maps statuses', () => {
    expect(mapPlaywrightStatus('passed')).toBe('PASSED');
    expect(mapPlaywrightStatus('failed')).toBe('FAILED');
    expect(mapPlaywrightStatus('skipped')).toBe('SKIPPED');
    expect(mapPlaywrightStatus('timedOut')).toBe('TIMED_OUT');
    expect(mapPlaywrightStatus('interrupted')).toBe('INTERRUPTED');
  });

  test('resolveTraceability -> returns MAPPED for existing ID', () => {
    const firstTestCase = allTestCases[0];
    if (!firstTestCase) throw new Error('The test-case catalog must not be empty.');
    const existingId = firstTestCase.id;
    const { testCaseId, traceabilityStatus } = resolveTraceability(`${existingId} - Some Title`);

    expect(testCaseId).toBe(existingId);
    expect(traceabilityStatus).toBe('MAPPED');
  });

  test('resolveTraceability -> returns UNKNOWN_TEST_CASE_ID for non-existing ID', () => {
    const { testCaseId, traceabilityStatus } = resolveTraceability(`TC-FAKE-999 - Some Title`);

    expect(testCaseId).toBe('TC-FAKE-999');
    expect(traceabilityStatus).toBe('UNKNOWN_TEST_CASE_ID');
  });

  test('resolveTraceability -> returns UNMAPPED for no ID', () => {
    const { testCaseId, traceabilityStatus } = resolveTraceability(`Just a generic test title`);

    expect(testCaseId).toBeNull();
    expect(traceabilityStatus).toBe('UNMAPPED');
  });
});
