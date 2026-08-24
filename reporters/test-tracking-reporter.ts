import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { allTestCases } from '../test-cases';
import type { TestCaseDefinition } from '../types/test-case.types';
import type {
  BusinessDiscoveredTest,
  TestExecutionResult,
  TestRunResult,
} from '../types/test-result.types';
import { aggregateBusinessRun, formatBusinessRunSummary } from './business-run-aggregation';
import { mapPlaywrightStatus, mapEvidence, resolveTraceability } from './result-mapper';

export interface TestTrackingReporterOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly testCases?: readonly TestCaseDefinition[];
  readonly now?: () => Date;
  readonly randomSuffix?: () => string;
  readonly outputRoot?: string;
}

class TestTrackingReporter implements Reporter {
  private runId!: string;
  private startedAt!: Date;
  private executions: TestExecutionResult[] = [];
  private readonly businessRun: boolean;
  private readonly suppliedBusinessRunId: string | undefined;
  private readonly testCases: readonly TestCaseDefinition[];
  private readonly now: () => Date;
  private readonly randomSuffix: () => string;
  private readonly outputRoot: string;
  private discoveredTests: BusinessDiscoveredTest[] = [];

  constructor(options: TestTrackingReporterOptions = {}) {
    const env = options.env ?? process.env;
    this.businessRun = env.BUSINESS_TEST_RUN === 'true';
    this.suppliedBusinessRunId = env.BUSINESS_RUN_ID;
    this.testCases = options.testCases ?? allTestCases;
    this.now = options.now ?? (() => new Date());
    this.randomSuffix = options.randomSuffix ?? (() => crypto.randomBytes(2).toString('hex'));
    this.outputRoot = options.outputRoot ?? process.cwd();
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startedAt = this.now();
    const dateStr = this.startedAt.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const shortRandom = this.randomSuffix();
    const suppliedRunId = this.suppliedBusinessRunId;
    const safeBusinessRunId = /^BUSINESS-RUN-\d{14}-[a-f0-9]{4}$/;
    this.runId =
      this.businessRun && suppliedRunId && safeBusinessRunId.test(suppliedRunId)
        ? suppliedRunId
        : `RUN-${dateStr}-${shortRandom}`;

    if (this.businessRun) {
      this.discoveredTests = suite.allTests().map((testCase) => {
        const projectName = testCase.parent.project()?.name;
        return {
          PlaywrightTestId: testCase.id,
          Title: testCase.title,
          ...(projectName !== undefined ? { ProjectName: projectName } : {}),
        };
      });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const { testCaseId, traceabilityStatus } = resolveTraceability(test.title);

    const projectName = test.parent.project()?.name;
    const errorMessage = result.error?.message;
    const errorStack = result.error?.stack;

    const executionResult: TestExecutionResult = {
      TestCaseId: testCaseId,
      TraceabilityStatus: traceabilityStatus,
      PlaywrightTestId: test.id,
      Title: test.title,
      FilePath: test.location.file,
      Status: mapPlaywrightStatus(result.status),
      DurationMs: result.duration,
      Retry: result.retry,
      Evidence: mapEvidence(result.attachments),
      ...(projectName !== undefined ? { ProjectName: projectName } : {}),
      ...(test.expectedStatus !== undefined ? { ExpectedStatus: test.expectedStatus } : {}),
      ...(errorMessage !== undefined ? { ErrorMessage: errorMessage } : {}),
      ...(errorStack !== undefined ? { ErrorStack: errorStack } : {}),
    };

    this.executions.push(executionResult);
  }

  async onEnd(result: FullResult) {
    const finishedAt = this.now();

    let mapped = 0;
    let unmapped = 0;
    let unknownId = 0;

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let timedOut = 0;
    let interrupted = 0;

    const uniqueMappedIds = new Set<string>();

    for (const exec of this.executions) {
      if (exec.TraceabilityStatus === 'MAPPED') {
        mapped++;
        if (exec.TestCaseId) uniqueMappedIds.add(exec.TestCaseId);
      } else if (exec.TraceabilityStatus === 'UNMAPPED') {
        unmapped++;
      } else if (exec.TraceabilityStatus === 'UNKNOWN_TEST_CASE_ID') {
        unknownId++;
      }

      switch (exec.Status) {
        case 'PASSED':
          passed++;
          break;
        case 'FAILED':
          failed++;
          break;
        case 'SKIPPED':
          skipped++;
          break;
        case 'TIMED_OUT':
          timedOut++;
          break;
        case 'INTERRUPTED':
          interrupted++;
          break;
      }
    }

    const business = this.businessRun
      ? aggregateBusinessRun(this.testCases, this.discoveredTests, this.executions)
      : undefined;

    const runResult: TestRunResult = {
      RunId: this.runId,
      StartedAt: this.startedAt.toISOString(),
      FinishedAt: finishedAt.toISOString(),
      DurationMs: finishedAt.getTime() - this.startedAt.getTime(),
      TotalExecutions: this.executions.length,
      MappedExecutions: mapped,
      UnmappedExecutions: unmapped,
      UnknownTestCaseIdExecutions: unknownId,
      UniqueMappedTestCaseIdsExecuted: uniqueMappedIds.size,
      PassedExecutions: passed,
      FailedExecutions: failed,
      SkippedExecutions: skipped,
      TimedOutExecutions: timedOut,
      InterruptedExecutions: interrupted,
      Results: this.executions,
      ...(business !== undefined ? { Business: business } : {}),
    };

    const outputDir = path.resolve(this.outputRoot, 'test-results', 'tracking', this.runId);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'run-result.json');

    fs.writeFileSync(outputPath, JSON.stringify(runResult, null, 2), 'utf-8');

    console.log(`\n=== Test Tracking Reporter Summary ===`);
    console.log(`RunId: ${runResult.RunId}`);
    console.log(`TotalExecutions: ${runResult.TotalExecutions}`);
    console.log(`UniqueMappedTestCaseIdsExecuted: ${runResult.UniqueMappedTestCaseIdsExecuted}`);
    console.log(`Passed: ${runResult.PassedExecutions}`);
    console.log(`Failed: ${runResult.FailedExecutions}`);
    console.log(`Skipped: ${runResult.SkippedExecutions}`);
    console.log(`Unmapped: ${runResult.UnmappedExecutions}`);
    console.log(`UnknownTestCaseIds: ${runResult.UnknownTestCaseIdExecutions}`);
    console.log(`Output: ${outputPath}\n`);

    if (business) {
      for (const line of formatBusinessRunSummary(business)) console.log(line);
    }

    if (business?.HasValidationErrors) return { status: 'failed' as const };
    return result.status === 'passed' ? undefined : { status: result.status };
  }
}

export default TestTrackingReporter;
