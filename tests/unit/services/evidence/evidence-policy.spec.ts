import { expect, test } from '@playwright/test';

import { classifyAttachment, classifyFailure } from '../../../../services/evidence/evidence-policy';

test.describe('classifyAttachment', () => {
  const supported = [
    {
      name: 'failed.png',
      contentType: 'image/png',
      expected: { role: 'SCREENSHOT', contentType: 'image/png', extension: '.png' },
    },
    {
      name: 'failed.JPEG',
      contentType: 'IMAGE/JPEG',
      expected: { role: 'SCREENSHOT', contentType: 'image/jpeg', extension: '.jpeg' },
    },
    {
      name: 'expected-failure-screenshot',
      contentType: 'image/png',
      expected: { role: 'SCREENSHOT', contentType: 'image/png', extension: '.png' },
    },
    {
      name: 'video.webm',
      contentType: 'video/webm',
      expected: { role: 'VIDEO', contentType: 'video/webm', extension: '.webm' },
    },
    {
      name: 'trace.zip',
      contentType: 'application/zip',
      expected: { role: 'TRACE', contentType: 'application/zip', extension: '.zip' },
    },
    {
      name: 'error-context.md',
      contentType: 'text/markdown; charset=utf-8',
      expected: { role: 'LOG', contentType: 'text/markdown', extension: '.md' },
    },
    {
      name: 'browser.log',
      contentType: 'text/plain',
      expected: { role: 'LOG', contentType: 'text/plain', extension: '.log' },
    },
    {
      name: 'payload.json',
      contentType: 'application/json',
      expected: { role: 'OTHER', contentType: 'application/json', extension: '.json' },
    },
    {
      name: 'records.csv',
      contentType: 'text/csv',
      expected: { role: 'OTHER', contentType: 'text/csv', extension: '.csv' },
    },
  ] as const;

  for (const example of supported) {
    test(`maps ${example.contentType} ${example.name} to ${example.expected.role}`, () => {
      expect(classifyAttachment(example.name, example.contentType)).toEqual(example.expected);
    });
  }

  for (const example of [
    { name: 'page.html', contentType: 'text/html' },
    { name: 'vector.svg', contentType: 'image/svg+xml' },
    { name: 'binary.bin', contentType: 'application/octet-stream' },
    { name: 'spoofed.jpg', contentType: 'image/png' },
    { name: 'spoofed.txt', contentType: 'text/markdown' },
    { name: 'archive.exe', contentType: 'application/zip' },
  ]) {
    test(`rejects unsupported or mismatched ${example.contentType} ${example.name}`, () => {
      expect(classifyAttachment(example.name, example.contentType)).toBeUndefined();
    });
  }
});

test.describe('classifyFailure', () => {
  test('keeps expected failure separate from unexpected failure', () => {
    expect(classifyFailure('failed', 'failed', 'MAPPED')).toEqual({
      actualFailure: true,
      expectedFailure: true,
      unexpectedFailure: false,
      actualFailedBusinessExecution: true,
    });
  });

  test('marks a normal mapped failure as unexpected and actually failed', () => {
    expect(classifyFailure('failed', 'passed', 'MAPPED')).toEqual({
      actualFailure: true,
      expectedFailure: false,
      unexpectedFailure: true,
      actualFailedBusinessExecution: true,
    });
  });

  test('marks an unexpected pass of test.fail without calling it an actual failure', () => {
    expect(classifyFailure('passed', 'failed', 'MAPPED')).toEqual({
      actualFailure: false,
      expectedFailure: false,
      unexpectedFailure: true,
      actualFailedBusinessExecution: false,
    });
  });

  test('does not treat skipped execution as unexpected', () => {
    expect(classifyFailure('skipped', 'passed', 'MAPPED')).toEqual({
      actualFailure: false,
      expectedFailure: false,
      unexpectedFailure: false,
      actualFailedBusinessExecution: false,
    });
  });

  test('does not call an unmapped framework failure a failed business execution', () => {
    expect(classifyFailure('timedOut', 'passed', 'UNMAPPED')).toEqual({
      actualFailure: true,
      expectedFailure: false,
      unexpectedFailure: true,
      actualFailedBusinessExecution: false,
    });
  });
});
