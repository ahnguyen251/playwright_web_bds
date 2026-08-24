import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { FullConfig, FullResult, Suite, TestCase } from '@playwright/test/reporter';
import TestTrackingReporter from '../../../reporters/test-tracking-reporter';
import type { TestCaseDefinition } from '../../../types/test-case.types';

const fixedNow = new Date('2026-08-24T01:02:03.000Z');
const fallbackRunId = 'RUN-20260824010203-cafe';
const safeRunId = 'BUSINESS-RUN-20260824010203-abcd';

const catalog: readonly TestCaseDefinition[] = [
  {
    id: 'TC-A-001',
    title: 'Catalog case',
    module: 'Test',
    priority: 'medium',
    tags: [],
    preconditions: [],
    expectedResult: 'deterministic result',
    automation: { status: 'AUTOMATED' },
  },
];

const suiteWithTitles = (...titles: readonly string[]): Suite =>
  ({
    allTests: () =>
      titles.map(
        (title, index) =>
          ({
            id: `playwright-${String(index)}`,
            title,
            parent: { project: () => ({ name: 'chromium' }) },
          }) as unknown as TestCase,
      ),
  }) as unknown as Suite;

const passedResult: FullResult = {
  status: 'passed',
  startTime: fixedNow,
  duration: 0,
};

const readResult = (outputRoot: string, runId: string): unknown =>
  JSON.parse(
    readFileSync(
      path.join(outputRoot, 'test-results', 'tracking', runId, 'run-result.json'),
      'utf8',
    ),
  ) as unknown;

const begin = (reporter: TestTrackingReporter, suite: Suite): void => {
  reporter.onBegin({} as FullConfig, suite);
};

test('keeps business discovery and supplied run IDs isolated behind explicit opt-in', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_RUN_ID: safeRunId },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    outputRoot,
  });

  begin(reporter, suiteWithTitles('TC-A-001 - discovered variant'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toBeUndefined();
  expect(readResult(outputRoot, fallbackRunId)).toMatchObject({ RunId: fallbackRunId });
  expect(readResult(outputRoot, fallbackRunId)).not.toHaveProperty('Business');
});

test('accepts a safe supplied business ID and captures filtered suite discovery', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_TEST_RUN: 'true', BUSINESS_RUN_ID: safeRunId },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    outputRoot,
  });

  begin(reporter, suiteWithTitles('TC-A-001 - discovered variant'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toBeUndefined();
  expect(readResult(outputRoot, safeRunId)).toMatchObject({
    RunId: safeRunId,
    Business: {
      Coverage: {
        DiscoveredAutomatedIds: ['TC-A-001'],
        MissingAutomatedIds: [],
      },
      Execution: {
        LogicalVariants: 1,
        NotRunVariants: 1,
        Variants: [
          {
            TestCaseId: 'TC-A-001',
            PlaywrightTestId: 'playwright-0',
            ProjectName: 'chromium',
          },
        ],
      },
    },
  });
});

test('replaces an unsafe supplied business ID with a deterministic local ID', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_TEST_RUN: 'true', BUSINESS_RUN_ID: '../unsafe' },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    outputRoot,
  });

  begin(reporter, suiteWithTitles('TC-A-001 - discovered variant'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toBeUndefined();
  expect(readResult(outputRoot, fallbackRunId)).toMatchObject({ RunId: fallbackRunId });
});

test('overrides a passing Playwright result when business discovery validation fails', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_TEST_RUN: 'true', BUSINESS_RUN_ID: safeRunId },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    outputRoot,
  });

  begin(reporter, suiteWithTitles());
  const status = await reporter.onEnd(passedResult);

  expect(status).toEqual({ status: 'failed' });
  expect(readResult(outputRoot, safeRunId)).toMatchObject({
    Business: {
      HasValidationErrors: true,
      ValidationErrors: ['Automated IDs missing from Playwright discovery: TC-A-001'],
    },
  });
});
