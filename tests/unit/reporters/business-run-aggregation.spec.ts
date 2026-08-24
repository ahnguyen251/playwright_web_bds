import { expect, test } from '@playwright/test';
import {
  aggregateBusinessRun,
  formatBusinessRunSummary,
} from '../../../reporters/business-run-aggregation';
import { allTestCases } from '../../../test-cases';
import type { TestCaseDefinition } from '../../../types/test-case.types';
import type { BusinessDiscoveredTest, TestExecutionResult } from '../../../types/test-result.types';

const catalogCase = (id: string, automated = true): TestCaseDefinition => ({
  id,
  title: id,
  module: 'Test',
  priority: 'medium',
  tags: [],
  preconditions: [],
  expectedResult: 'deterministic result',
  automation: { status: automated ? 'AUTOMATED' : 'NOT_AUTOMATED' },
});

const discovered = (id: string, testId: string, project = 'chromium'): BusinessDiscoveredTest => ({
  PlaywrightTestId: testId,
  Title: `${id} variant`,
  ProjectName: project,
});

const attempt = (
  id: string,
  testId: string,
  status: TestExecutionResult['Status'],
  retry: number,
  project = 'chromium',
): TestExecutionResult => ({
  TestCaseId: id,
  TraceabilityStatus: 'MAPPED',
  PlaywrightTestId: testId,
  Title: `${id} variant`,
  FilePath: 'tests/business.spec.ts',
  ProjectName: project,
  Status: status,
  DurationMs: 10,
  Retry: retry,
  Evidence: [],
});

test('counts one ID with multiple variants once and collapses retries to the final attempt', () => {
  const summary = aggregateBusinessRun(
    [catalogCase('TC-A-001'), catalogCase('TC-B-001', false)],
    [discovered('TC-A-001', 'variant-a'), discovered('TC-A-001', 'variant-b')],
    [
      attempt('TC-A-001', 'variant-a', 'FAILED', 0),
      attempt('TC-A-001', 'variant-a', 'PASSED', 1),
      attempt('TC-A-001', 'variant-b', 'SKIPPED', 0),
    ],
  );

  expect(summary.Coverage).toMatchObject({
    CatalogTotal: 2,
    AutomatedTotal: 1,
    NotAutomatedTotal: 1,
    DiscoveredAutomatedIds: ['TC-A-001'],
    MissingAutomatedIds: [],
    NotAutomatedIds: ['TC-B-001'],
  });
  expect(summary.Execution).toMatchObject({
    UniqueBusinessIdsSelected: 1,
    LogicalVariants: 2,
    InfrastructureTests: 0,
    ExecutionAttempts: 3,
    PassedVariants: 1,
    SkippedVariants: 1,
  });
  expect(summary.Execution.Ids).toEqual([
    {
      TestCaseId: 'TC-A-001',
      Status: 'PARTIAL',
      LogicalVariants: 2,
      ExecutionAttempts: 3,
    },
  ]);
});

test('reports discovery separately from zero execution attempts in list mode', () => {
  const summary = aggregateBusinessRun(
    [catalogCase('TC-A-001')],
    [discovered('TC-A-001', 'variant-a')],
    [],
  );

  expect(summary.Coverage.MissingAutomatedIds).toEqual([]);
  expect(summary.Execution).toMatchObject({
    UniqueBusinessIdsSelected: 1,
    LogicalVariants: 1,
    InfrastructureTests: 0,
    ExecutionAttempts: 0,
    NotRunVariants: 1,
  });
  expect(summary.Execution.Ids[0]?.Status).toBe('NOT_RUN');
});

test('real catalog business baseline aggregates to 34 automated and 49 backlog IDs', () => {
  const automated = allTestCases.filter(({ automation }) => automation.status === 'AUTOMATED');
  const discoveredTests = automated.map(({ id }, index) =>
    discovered(id, `variant-${String(index)}`),
  );
  const summary = aggregateBusinessRun(allTestCases, discoveredTests, []);

  expect(summary.Coverage).toMatchObject({
    CatalogTotal: 83,
    AutomatedTotal: 34,
    NotAutomatedTotal: 49,
    MissingAutomatedIds: [],
    UnknownIds: [],
  });
  expect(summary.Execution.NotRunVariants).toBe(34);
});

test('fails validation for missing automated IDs and unknown discovered IDs', () => {
  const summary = aggregateBusinessRun(
    [catalogCase('TC-A-001')],
    [discovered('TC-UNKNOWN-001', 'unknown')],
    [],
  );

  expect(summary.HasValidationErrors).toBe(true);
  expect(summary.Coverage.MissingAutomatedIds).toEqual(['TC-A-001']);
  expect(summary.Coverage.UnknownIds).toEqual(['TC-UNKNOWN-001']);
  expect(summary.ValidationErrors).toEqual([
    'Automated IDs missing from Playwright discovery: TC-A-001',
    'Unknown test case IDs selected: TC-UNKNOWN-001',
  ]);
});

test('formats Business Coverage before Execution', () => {
  const lines = formatBusinessRunSummary(
    aggregateBusinessRun(
      [catalogCase('TC-A-001'), catalogCase('TC-B-001', false)],
      [discovered('TC-A-001', 'variant-a')],
      [attempt('TC-A-001', 'variant-a', 'PASSED', 0)],
    ),
  );

  expect(lines.indexOf('=== Business Coverage ===')).toBeLessThan(
    lines.indexOf('=== Business Execution ==='),
  );
  expect(lines).toContain('Automated IDs: 1/2');
  expect(lines).toContain('Not automated IDs (1): TC-B-001');
});

test.describe('ID status precedence', () => {
  const cases = [
    { statuses: ['PASSED'] as const, expected: 'PASSED' },
    { statuses: ['SKIPPED'] as const, expected: 'SKIPPED' },
    { statuses: ['PASSED', 'SKIPPED'] as const, expected: 'PARTIAL' },
    { statuses: ['PASSED', 'FAILED'] as const, expected: 'FAILED' },
    { statuses: ['PASSED', 'TIMED_OUT'] as const, expected: 'FAILED' },
    { statuses: ['PASSED', 'INTERRUPTED'] as const, expected: 'FAILED' },
  ];

  for (const { statuses, expected } of cases) {
    test(`${statuses.join('+')} aggregates to ${expected}`, () => {
      const tests = statuses.map((_, index) => discovered('TC-A-001', `variant-${String(index)}`));
      const attempts = statuses.map((status, index) =>
        attempt('TC-A-001', `variant-${String(index)}`, status, 0),
      );
      const summary = aggregateBusinessRun([catalogCase('TC-A-001')], tests, attempts);
      expect(summary.Execution.Ids[0]?.Status).toBe(expected);
    });
  }
});
