import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  assertPersistentRelativePath,
  createExecutionKey,
  resolveContainedPath,
  toSafeEvidenceSegment,
} from '../../../../services/evidence/evidence-paths';

const baseIdentity = {
  projectName: 'chromium',
  playwrightTestId: 'playwright-test-id',
  repeatEachIndex: 0,
  retry: 0,
} as const;

test('creates the stable full SHA-256 execution key from canonical identity', () => {
  expect(createExecutionKey(baseIdentity)).toBe(
    '574cb10759e5552a4c1669eef290c148fd83d9c5fb91244663fa771f6f765057',
  );
});

test('separates project, test, repeat, and retry identities', () => {
  const baseline = createExecutionKey(baseIdentity);
  const variants = [
    { ...baseIdentity, projectName: 'firefox' },
    { ...baseIdentity, playwrightTestId: 'another-test-id' },
    { ...baseIdentity, repeatEachIndex: 1 },
    { ...baseIdentity, retry: 1 },
  ];

  expect(new Set([baseline, ...variants.map(createExecutionKey)]).size).toBe(5);
});

test('normalizes execution identity text to Unicode NFC', () => {
  const composed = createExecutionKey({ ...baseIdentity, playwrightTestId: 'caf\u00e9' });
  const decomposed = createExecutionKey({ ...baseIdentity, playwrightTestId: 'cafe\u0301' });

  expect(decomposed).toBe(composed);
});

test('keeps safe evidence segments readable', () => {
  expect(toSafeEvidenceSegment('TC-PROFILE-EDIT-003', 'UNMAPPED')).toBe('TC-PROFILE-EDIT-003');
  expect(toSafeEvidenceSegment(undefined, 'UNMAPPED')).toBe('UNMAPPED');
});

test('makes unsafe segments contained and collision resistant', () => {
  const slash = toSafeEvidenceSegment('unsafe/value', 'UNMAPPED');
  const backslash = toSafeEvidenceSegment('unsafe\\value', 'UNMAPPED');

  for (const value of [slash, backslash]) {
    expect(value).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u);
    expect(value.length).toBeLessThanOrEqual(80);
    expect(value).not.toContain('/');
    expect(value).not.toContain('\\');
  }
  expect(slash).not.toBe(backslash);
});

test('transforms dot segments, reserved devices, and trailing Windows characters', () => {
  for (const unsafe of ['.', '..', 'CON', 'lpt1.txt', 'trailing.', 'trailing ']) {
    const segment = toSafeEvidenceSegment(unsafe, 'UNMAPPED');
    expect(segment).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u);
    expect(segment).not.toBe(unsafe);
    expect(segment).not.toBe('.');
    expect(segment).not.toBe('..');
  }
});

test('accepts only finalized POSIX paths below the exact run prefix', () => {
  const runId = 'RUN-20260825090000-abcd';

  expect(() =>
    assertPersistentRelativePath(
      `${runId}/TC-PROFILE-EDIT-003/chromium/key/screenshot-01.png`,
      runId,
    ),
  ).not.toThrow();

  for (const invalid of [
    '',
    runId,
    `${runId}//file.png`,
    `${runId}/./file.png`,
    `${runId}/../file.png`,
    `${runId}\\file.png`,
    `/absolute/${runId}/file.png`,
    `C:/${runId}/file.png`,
    `//server/share/${runId}/file.png`,
    `OTHER-RUN/file.png`,
    `${runId}/file\0.png`,
  ]) {
    expect(() => assertPersistentRelativePath(invalid, runId), invalid).toThrow();
  }
});

test('resolves contained relative paths without accepting a sibling-prefix escape', () => {
  const root = path.resolve('D:/isolated/evidence');
  const contained = 'RUN-20260825090000-abcd/TC-A/chromium/key/file.png';

  expect(resolveContainedPath(root, contained)).toBe(path.resolve(root, contained));
  expect(() => resolveContainedPath(root, '../evidence-old/file.png')).toThrow();
  expect(() =>
    resolveContainedPath(root, path.resolve(root, '..', 'evidence-old', 'file.png')),
  ).toThrow();
});
