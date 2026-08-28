import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import TestTrackingReporter, {
  type EvidenceArchiver,
} from '../../../reporters/test-tracking-reporter';
import type {
  FinalizeRunInput,
  FinalizeRunOutput,
  PersistExecutionInput,
  PersistExecutionOutput,
} from '../../../services/evidence/evidence-contracts';
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

const testCase = (overrides: Partial<TestCase> = {}): TestCase =>
  ({
    id: 'playwright-execution',
    title: 'TC-TRANS-VIEW-001 - reporter integration',
    repeatEachIndex: 2,
    expectedStatus: 'failed',
    location: { file: 'tests/example.spec.ts', line: 10, column: 1 },
    parent: { project: () => ({ name: 'chromium' }) },
    ...overrides,
  }) as unknown as TestCase;

const testResult = (overrides: Partial<TestResult> = {}): TestResult =>
  ({
    status: 'failed',
    duration: 125,
    retry: 1,
    attachments: [],
    ...overrides,
  }) as unknown as TestResult;

const passedResult: FullResult = {
  status: 'passed',
  startTime: fixedNow,
  duration: 0,
};

const fullConfig = (outputDir: string): FullConfig =>
  ({ projects: [{ outputDir }] }) as unknown as FullConfig;

const readResult = (evidenceRoot: string, runId: string): unknown =>
  JSON.parse(readFileSync(path.join(evidenceRoot, runId, 'run-result.json'), 'utf8')) as unknown;

const begin = (reporter: TestTrackingReporter, suite: Suite, outputDir: string): void => {
  reporter.onBegin(fullConfig(outputDir), suite);
};

interface RecordingArchiverOptions {
  readonly begin?: (runId: string) => Promise<void>;
  readonly persist?: (input: PersistExecutionInput) => Promise<PersistExecutionOutput>;
}

class RecordingArchiver implements EvidenceArchiver {
  readonly beginRunCalls: string[] = [];
  readonly persistExecutionCalls: PersistExecutionInput[] = [];
  readonly finalizeRunCalls: FinalizeRunInput[] = [];
  readonly rollbackRunCalls: string[] = [];

  constructor(private readonly options: RecordingArchiverOptions = {}) {}

  async beginRun(runId: string): Promise<void> {
    this.beginRunCalls.push(runId);
    await this.options.begin?.(runId);
  }

  async persistExecution(input: PersistExecutionInput): Promise<PersistExecutionOutput> {
    this.persistExecutionCalls.push(input);
    if (this.options.persist) return this.options.persist(input);
    return { executionKey: 'execution-key', evidence: [], skipped: [] };
  }

  finalizeRun(input: FinalizeRunInput): Promise<FinalizeRunOutput> {
    this.finalizeRunCalls.push(input);
    return Promise.resolve({
      runDirectory: path.join('evidence', input.runId),
      manifestPath: path.join('evidence', input.runId, 'run-result.json'),
      manifestRelativePath: path.posix.join(input.runId, 'run-result.json'),
    });
  }

  rollbackRun(runId: string): Promise<void> {
    this.rollbackRunCalls.push(runId);
    return Promise.resolve();
  }
}

test('keeps business discovery and supplied run IDs isolated behind explicit opt-in', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const evidenceRoot = path.join(outputRoot, 'evidence');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_RUN_ID: safeRunId },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    evidenceRoot,
  });

  begin(reporter, suiteWithTitles('TC-A-001 - discovered variant'), path.join(outputRoot, 'pw'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toBeUndefined();
  expect(readResult(evidenceRoot, fallbackRunId)).toMatchObject({ RunId: fallbackRunId });
  expect(readResult(evidenceRoot, fallbackRunId)).not.toHaveProperty('Business');
});

test('accepts a safe supplied business ID and captures filtered suite discovery', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const evidenceRoot = path.join(outputRoot, 'evidence');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_TEST_RUN: 'true', BUSINESS_RUN_ID: safeRunId },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    evidenceRoot,
  });

  begin(reporter, suiteWithTitles('TC-A-001 - discovered variant'), path.join(outputRoot, 'pw'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toBeUndefined();
  expect(readResult(evidenceRoot, safeRunId)).toMatchObject({
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
  const evidenceRoot = path.join(outputRoot, 'evidence');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_TEST_RUN: 'true', BUSINESS_RUN_ID: '../unsafe' },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    evidenceRoot,
  });

  begin(reporter, suiteWithTitles('TC-A-001 - discovered variant'), path.join(outputRoot, 'pw'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toBeUndefined();
  expect(readResult(evidenceRoot, fallbackRunId)).toMatchObject({ RunId: fallbackRunId });
});

test('overrides a passing Playwright result when business discovery validation fails', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const evidenceRoot = path.join(outputRoot, 'evidence');
  const reporter = new TestTrackingReporter({
    env: { BUSINESS_TEST_RUN: 'true', BUSINESS_RUN_ID: safeRunId },
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    evidenceRoot,
  });

  begin(reporter, suiteWithTitles(), path.join(outputRoot, 'pw'));
  const status = await reporter.onEnd(passedResult);

  expect(status).toEqual({ status: 'failed' });
  expect(readResult(evidenceRoot, safeRunId)).toMatchObject({
    Business: {
      HasValidationErrors: true,
      ValidationErrors: ['Automated IDs missing from Playwright discovery: TC-A-001'],
    },
  });
});

test('awaits persistence and builds manifest evidence only from the archiver output', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const playwrightOutput = path.join(outputRoot, 'test-results', 'case-output');
  const temporaryScreenshot = path.join(playwrightOutput, 'temporary.png');
  let releasePersistence!: () => void;
  const persistenceGate = new Promise<void>((resolve) => {
    releasePersistence = resolve;
  });
  const archiver = new RecordingArchiver({
    persist: async () => {
      await persistenceGate;
      return {
        executionKey: 'stable-key',
        evidence: [
          {
            type: 'SCREENSHOT',
            path: `${fallbackRunId}/TC-TRANS-VIEW-001/chromium/stable-key/screenshot-01.png`,
            contentType: 'image/png',
          },
          {
            type: 'LOG',
            path: `${fallbackRunId}/TC-TRANS-VIEW-001/chromium/stable-key/error-context-01.md`,
            contentType: 'text/markdown',
          },
        ],
        skipped: [{ name: 'raw-json', reason: 'UNSUPPORTED_TYPE' }],
      };
    },
  });
  const warnings: string[] = [];
  const reporter = new TestTrackingReporter({
    env: {},
    testCases: catalog,
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    archiveService: archiver,
    logger: {
      log: () => undefined,
      warn: (message) => warnings.push(String(message)),
      error: () => undefined,
    },
  });
  begin(reporter, suiteWithTitles(), playwrightOutput);

  let testEndSettled = false;
  const pendingTestEnd = reporter
    .onTestEnd(
      testCase(),
      testResult({
        attachments: [
          { name: 'screenshot', contentType: 'image/png', path: temporaryScreenshot },
          { name: 'error-context.md', contentType: 'text/markdown', body: Buffer.from('context') },
          { name: 'raw-json', contentType: 'application/json', body: Buffer.from('{}') },
        ],
      }),
    )
    .then(() => {
      testEndSettled = true;
    });

  await Promise.resolve();
  expect(testEndSettled).toBe(false);
  releasePersistence();
  await pendingTestEnd;
  await reporter.onEnd(passedResult);

  expect(archiver.persistExecutionCalls).toEqual([
    {
      runId: fallbackRunId,
      testCaseId: 'TC-TRANS-VIEW-001',
      projectName: 'chromium',
      playwrightTestId: 'playwright-execution',
      repeatEachIndex: 2,
      retry: 1,
      attachments: [
        { name: 'screenshot', contentType: 'image/png', path: temporaryScreenshot },
        { name: 'error-context.md', contentType: 'text/markdown', body: Buffer.from('context') },
        { name: 'raw-json', contentType: 'application/json', body: Buffer.from('{}') },
      ],
      approvedSourceRoots: [path.resolve(playwrightOutput)],
    },
  ]);
  expect(archiver.finalizeRunCalls).toHaveLength(1);
  expect(archiver.finalizeRunCalls[0]?.manifest.Results[0]).toMatchObject({
    TestCaseId: 'TC-TRANS-VIEW-001',
    TraceabilityStatus: 'MAPPED',
    PlaywrightTestId: 'playwright-execution',
    Status: 'FAILED',
    ExpectedStatus: 'failed',
    Retry: 1,
    Evidence: [
      {
        type: 'SCREENSHOT',
        path: `${fallbackRunId}/TC-TRANS-VIEW-001/chromium/stable-key/screenshot-01.png`,
      },
      {
        type: 'LOG',
        path: `${fallbackRunId}/TC-TRANS-VIEW-001/chromium/stable-key/error-context-01.md`,
      },
    ],
  });
  expect(JSON.stringify(archiver.finalizeRunCalls[0]?.manifest)).not.toContain(temporaryScreenshot);
  expect(warnings).toEqual(['Evidence attachment skipped: UNSUPPORTED_TYPE.']);
});

test('onEnd waits for unawaited onTestEnd work and finalizes the run exactly once', async () => {
  let releasePersistence!: () => void;
  const persistenceGate = new Promise<void>((resolve) => {
    releasePersistence = resolve;
  });
  const archiver = new RecordingArchiver({
    persist: async () => {
      await persistenceGate;
      return { executionKey: 'stable-key', evidence: [], skipped: [] };
    },
  });
  const reporter = new TestTrackingReporter({
    env: {},
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    archiveService: archiver,
    logger: { log: () => undefined, warn: () => undefined, error: () => undefined },
  });
  begin(reporter, suiteWithTitles(), test.info().outputPath('pw'));

  void reporter.onTestEnd(testCase(), testResult());
  let endSettled = false;
  const firstEnd = reporter.onEnd(passedResult).then((value) => {
    endSettled = true;
    return value;
  });
  const secondEnd = reporter.onEnd(passedResult);

  await Promise.resolve();
  expect(endSettled).toBe(false);
  releasePersistence();
  await expect(firstEnd).resolves.toBeUndefined();
  await expect(secondEnd).resolves.toBeUndefined();
  expect(archiver.finalizeRunCalls).toHaveLength(1);
});

test('rolls back a fatal archive error and never publishes a manifest', async () => {
  const outputRoot = test.info().outputPath('reporter-root');
  const evidenceRoot = path.join(outputRoot, 'evidence');
  const temporaryPath = path.join(outputRoot, 'test-results', 'secret.png');
  const archiver = new RecordingArchiver({
    persist: () => Promise.reject(new Error(`cannot persist ${temporaryPath}`)),
  });
  const errors: string[] = [];
  const reporter = new TestTrackingReporter({
    env: {},
    now: () => fixedNow,
    randomSuffix: () => 'cafe',
    evidenceRoot,
    archiveService: archiver,
    logger: {
      log: () => undefined,
      warn: () => undefined,
      error: (message) => errors.push(String(message)),
    },
  });
  begin(reporter, suiteWithTitles(), path.join(outputRoot, 'test-results'));

  await reporter.onTestEnd(
    testCase(),
    testResult({
      attachments: [{ name: 'screenshot', contentType: 'image/png', path: temporaryPath }],
    }),
  );
  const status = await reporter.onEnd(passedResult);

  expect(status).toEqual({ status: 'failed' });
  expect(archiver.rollbackRunCalls).toEqual([fallbackRunId]);
  expect(archiver.finalizeRunCalls).toHaveLength(0);
  expect(existsSync(path.join(evidenceRoot, fallbackRunId, 'run-result.json'))).toBe(false);
  expect(errors.join('\n')).not.toContain(temporaryPath);
});
