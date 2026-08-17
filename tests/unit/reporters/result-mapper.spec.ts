import { test, expect } from '@playwright/test';
import {
  mapPlaywrightStatus,
  mapEvidence,
  resolveTraceability,
} from '../../../reporters/result-mapper';
import { allTestCases } from '../../../test-cases/index';

test.describe('Result Mapper Utilities', () => {
  test('mapPlaywrightStatus -> correctly maps statuses', () => {
    expect(mapPlaywrightStatus('passed')).toBe('PASSED');
    expect(mapPlaywrightStatus('failed')).toBe('FAILED');
    expect(mapPlaywrightStatus('skipped')).toBe('SKIPPED');
    expect(mapPlaywrightStatus('timedOut')).toBe('TIMED_OUT');
    expect(mapPlaywrightStatus('interrupted')).toBe('INTERRUPTED');
  });

  test('mapEvidence -> categorizes evidence correctly based on contentType and name', () => {
    const rawAttachments = [
      { name: 'screenshot', contentType: 'image/png', path: 'path/to/img.png' },
      { name: 'video', contentType: 'video/webm', path: 'path/to/vid.webm' },
      { name: 'trace', contentType: 'application/zip', path: 'path/to/trace.zip' },
      { name: 'log', contentType: 'text/plain', path: 'path/to/log.txt' },
      { name: 'unknown', contentType: 'application/json', path: 'path/to/data.json' },
      { name: 'no-path', contentType: 'image/png' },
    ];

    const mapped = mapEvidence(rawAttachments);

    expect(mapped).toHaveLength(5); // no-path is filtered out
    expect(mapped.find((e) => e.path === 'path/to/img.png')?.type).toBe('SCREENSHOT');
    expect(mapped.find((e) => e.path === 'path/to/vid.webm')?.type).toBe('VIDEO');
    expect(mapped.find((e) => e.path === 'path/to/trace.zip')?.type).toBe('TRACE');
    expect(mapped.find((e) => e.path === 'path/to/log.txt')?.type).toBe('LOG');
    expect(mapped.find((e) => e.path === 'path/to/data.json')?.type).toBe('OTHER');
  });

  test('resolveTraceability -> returns MAPPED for existing ID', () => {
    const existingId = allTestCases[0]!.id;
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
