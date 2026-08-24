import { expect, test } from '@playwright/test';
import type { TestCaseDefinition } from '../../../types/test-case.types';
import {
  BUSINESS_PROJECTS,
  buildBusinessPlaywrightArgs,
  createBusinessCatalogSelection,
  validateBusinessRunnerArgs,
} from '../../../utils/business-test-selection';

const testCase = (
  id: string,
  status: TestCaseDefinition['automation']['status'],
): TestCaseDefinition => ({
  id,
  title: id,
  module: 'Test',
  priority: 'medium',
  tags: [],
  preconditions: [],
  expectedResult: 'deterministic result',
  automation: { status },
});

test('derives sorted automated and backlog IDs without hard-coded totals', () => {
  const selection = createBusinessCatalogSelection([
    testCase('TC-Z-002', 'NOT_AUTOMATED'),
    testCase('TC-A-001', 'AUTOMATED'),
    testCase('TC-B-001', 'AUTOMATED'),
  ]);

  expect(selection.AutomatedIds).toEqual(['TC-A-001', 'TC-B-001']);
  expect(selection.NotAutomatedIds).toEqual(['TC-Z-002']);
  expect(selection.GrepSource).toBe('(?:^|\\s)(?:TC-A-001|TC-B-001)(?=\\s|$)');
});

test('escapes IDs and never matches a longer similarly prefixed token', () => {
  const selection = createBusinessCatalogSelection([testCase('TC-A.1', 'AUTOMATED')]);
  const pattern = new RegExp(selection.GrepSource);

  expect(pattern.test('[chromium] file › TC-A.1 variant')).toBe(true);
  expect(pattern.test('[chromium] file › TC-Ax1 variant')).toBe(false);
  expect(pattern.test('[chromium] file › TC-A.10 variant')).toBe(false);
});

test('rejects duplicate IDs and an empty automated selection', () => {
  expect(() =>
    createBusinessCatalogSelection([
      testCase('TC-A-001', 'AUTOMATED'),
      testCase('TC-A-001', 'NOT_AUTOMATED'),
    ]),
  ).toThrow(/Duplicate TestCaseId.*TC-A-001/);

  expect(() => createBusinessCatalogSelection([testCase('TC-A-001', 'NOT_AUTOMATED')])).toThrow(
    /No automated business test cases/,
  );
});

test('keeps catalog grep and canonical projects under runner control', () => {
  for (const args of [
    ['--grep', 'anything'],
    ['-g', 'anything'],
    ['--grep-invert', 'anything'],
    ['-G', 'anything'],
    ['--project=firefox'],
    ['--config=other.ts'],
    ['--reporter=line'],
  ]) {
    expect(() => validateBusinessRunnerArgs(args)).toThrow(/controlled by test:business/);
  }

  const selection = createBusinessCatalogSelection([testCase('TC-A-001', 'AUTOMATED')]);
  expect(buildBusinessPlaywrightArgs(selection, ['--list'])).toEqual([
    'test',
    ...BUSINESS_PROJECTS.map((project) => `--project=${project}`),
    '--grep',
    selection.GrepSource,
    '--list',
  ]);
});

test('canonical project selection excludes Firefox and WebKit', () => {
  expect(BUSINESS_PROJECTS).toEqual([
    'framework',
    'chromium',
    'mutating-chromium',
    'appointment-mutating-chromium',
    'production-registration-chromium',
  ]);
  expect(BUSINESS_PROJECTS).not.toContain('firefox');
  expect(BUSINESS_PROJECTS).not.toContain('webkit');
});
