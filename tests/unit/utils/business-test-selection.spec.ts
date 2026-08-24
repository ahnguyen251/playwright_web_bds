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

test('forwards only the explicitly safe list option', () => {
  expect(() => validateBusinessRunnerArgs([])).not.toThrow();
  expect(() => validateBusinessRunnerArgs(['--list'])).not.toThrow();

  const selection = createBusinessCatalogSelection([testCase('TC-A-001', 'AUTOMATED')]);
  expect(buildBusinessPlaywrightArgs(selection, ['--list'])).toEqual([
    'test',
    ...BUSINESS_PROJECTS.map((project) => `--project=${project}`),
    '--grep',
    selection.GrepSource,
    '--list',
  ]);
});

test.describe('runner-controlled Playwright arguments', () => {
  const unsafeArguments = [
    { name: 'short config override', args: ['-c', 'other.ts'] },
    { name: 'long config override with separate value', args: ['--config', 'other.ts'] },
    { name: 'long config override with equals value', args: ['--config=other.ts'] },
    { name: 'dependency suppression', args: ['--no-deps'] },
    { name: 'positional file filter', args: ['tests/authentication/login.positive.spec.ts'] },
    { name: 'positional title filter', args: ['TC-A-001'] },
    { name: 'short grep override', args: ['-g', 'anything'] },
    { name: 'long grep override with separate value', args: ['--grep', 'anything'] },
    { name: 'long grep override with equals value', args: ['--grep=anything'] },
    { name: 'short inverted grep override', args: ['-G', 'anything'] },
    { name: 'long inverted grep override', args: ['--grep-invert=anything'] },
    { name: 'project override with separate value', args: ['--project', 'firefox'] },
    { name: 'project override with equals value', args: ['--project=firefox'] },
    { name: 'reporter override with separate value', args: ['--reporter', 'line'] },
    { name: 'reporter override with equals value', args: ['--reporter=line'] },
    { name: 'shard discovery restriction with separate value', args: ['--shard', '1/2'] },
    { name: 'shard discovery restriction with equals value', args: ['--shard=1/2'] },
    { name: 'test-list discovery restriction', args: ['--test-list=selected-tests.txt'] },
    { name: 'changed-test discovery restriction', args: ['--only-changed=main'] },
    { name: 'last-failed discovery restriction', args: ['--last-failed'] },
    { name: 'option terminator before a positional filter', args: ['--', 'tests/listings'] },
  ] as const;

  for (const { name, args } of unsafeArguments) {
    test(`rejects ${name}`, () => {
      expect(() => validateBusinessRunnerArgs(args)).toThrow(/controlled by test:business/);
    });
  }
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
