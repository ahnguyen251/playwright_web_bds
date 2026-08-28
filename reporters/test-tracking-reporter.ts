import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import crypto from 'crypto';
import path from 'node:path';
import { resolveEvidenceConfiguration } from '../config/evidence.config';
import { EvidenceArchiveService } from '../services/evidence/EvidenceArchiveService';
import type {
  FinalizeRunInput,
  FinalizeRunOutput,
  PersistExecutionInput,
  PersistExecutionOutput,
} from '../services/evidence/evidence-contracts';
import { allTestCases } from '../test-cases';
import type { TestCaseDefinition } from '../types/test-case.types';
import type {
  BusinessDiscoveredTest,
  TestExecutionResult,
  TestRunResult,
} from '../types/test-result.types';
import { aggregateBusinessRun, formatBusinessRunSummary } from './business-run-aggregation';
import { mapPlaywrightStatus, resolveTraceability } from './result-mapper';

export interface EvidenceArchiver {
  beginRun(runId: string): Promise<void>;
  persistExecution(input: PersistExecutionInput): Promise<PersistExecutionOutput>;
  finalizeRun(input: FinalizeRunInput): Promise<FinalizeRunOutput>;
  rollbackRun(runId: string): Promise<void>;
}

type ReporterLogger = Pick<Console, 'error' | 'log' | 'warn'>;

interface AwaitableTestEndReporter extends Omit<Reporter, 'onTestEnd'> {
  onTestEnd(test: TestCase, result: TestResult): Promise<void>;
}

export interface TestTrackingReporterOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly testCases?: readonly TestCaseDefinition[];
  readonly now?: () => Date;
  readonly randomSuffix?: () => string;
  readonly outputRoot?: string;
  readonly evidenceRoot?: string;
  readonly archiveService?: EvidenceArchiver;
  readonly logger?: ReporterLogger;
}

type ReporterEndResult = { status: FullResult['status'] } | undefined;

class TestTrackingReporter implements AwaitableTestEndReporter {
  private runId!: string;
  private startedAt!: Date;
  private executions: TestExecutionResult[] = [];
  private readonly businessRun: boolean;
  private readonly suppliedBusinessRunId: string | undefined;
  private readonly testCases: readonly TestCaseDefinition[];
  private readonly now: () => Date;
  private readonly randomSuffix: () => string;
  private readonly archiveService: EvidenceArchiver;
  private readonly logger: ReporterLogger;
  private discoveredTests: BusinessDiscoveredTest[] = [];
  private approvedSourceRoots: string[] = [];
  private archiveInitialization: Promise<void> = Promise.resolve();
  private pendingPersistence: Promise<void>[] = [];
  private fatalArchiveError: unknown;
  private endPromise: Promise<ReporterEndResult> | undefined;

  constructor(options: TestTrackingReporterOptions = {}) {
    const env = options.env ?? process.env;
    this.businessRun = env.BUSINESS_TEST_RUN === 'true';
    this.suppliedBusinessRunId = env.BUSINESS_RUN_ID;
    this.testCases = options.testCases ?? allTestCases;
    this.now = options.now ?? (() => new Date());
    this.randomSuffix = options.randomSuffix ?? (() => crypto.randomBytes(2).toString('hex'));
    this.logger = options.logger ?? console;
    this.archiveService =
      options.archiveService ??
      new EvidenceArchiveService({
        evidenceRoot:
          options.evidenceRoot ??
          resolveEvidenceConfiguration(env, options.outputRoot ?? process.cwd()).root,
      });
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

    this.approvedSourceRoots = [
      ...new Set(config.projects.map(({ outputDir }) => path.resolve(outputDir))),
    ];
    this.archiveInitialization = this.archiveService
      .beginRun(this.runId)
      .catch((error: unknown) => {
        this.recordFatalArchiveError(error);
      });

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

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const { testCaseId, traceabilityStatus } = resolveTraceability(test.title);

    const projectName = test.parent.project()?.name;
    const errorMessage = result.error?.message;
    const errorStack = result.error?.stack;

    const executionIndex = this.executions.length;
    const executionResult: TestExecutionResult = {
      TestCaseId: testCaseId,
      TraceabilityStatus: traceabilityStatus,
      PlaywrightTestId: test.id,
      Title: test.title,
      FilePath: test.location.file,
      Status: mapPlaywrightStatus(result.status),
      DurationMs: result.duration,
      Retry: result.retry,
      Evidence: [],
      ...(projectName !== undefined ? { ProjectName: projectName } : {}),
      ExpectedStatus: test.expectedStatus,
      ...(errorMessage !== undefined ? { ErrorMessage: errorMessage } : {}),
      ...(errorStack !== undefined ? { ErrorStack: errorStack } : {}),
    };

    this.executions.push(executionResult);
    const persistence = this.persistExecutionEvidence({
      executionIndex,
      executionResult,
      test,
      result,
      testCaseId,
      ...(projectName !== undefined ? { projectName } : {}),
    });
    this.pendingPersistence.push(persistence);
    await persistence;
  }

  onEnd(result: FullResult): Promise<ReporterEndResult> {
    this.endPromise ??= this.completeRun(result);
    return this.endPromise;
  }

  private async persistExecutionEvidence(input: {
    readonly executionIndex: number;
    readonly executionResult: TestExecutionResult;
    readonly test: TestCase;
    readonly result: TestResult;
    readonly testCaseId: string | null;
    readonly projectName?: string;
  }): Promise<void> {
    await this.archiveInitialization;
    if (this.fatalArchiveError !== undefined) return;

    try {
      const persisted = await this.archiveService.persistExecution({
        runId: this.runId,
        testCaseId: input.testCaseId,
        playwrightTestId: input.test.id,
        repeatEachIndex: input.test.repeatEachIndex,
        retry: input.result.retry,
        attachments: input.result.attachments,
        approvedSourceRoots: this.approvedSourceRoots,
        ...(input.projectName !== undefined ? { projectName: input.projectName } : {}),
      });

      for (const { reason } of persisted.skipped) {
        this.logger.warn(`Evidence attachment skipped: ${reason}.`);
      }
      this.executions[input.executionIndex] = {
        ...input.executionResult,
        Evidence: persisted.evidence,
      };
    } catch (error) {
      this.recordFatalArchiveError(error);
    }
  }

  private async completeRun(result: FullResult): Promise<ReporterEndResult> {
    await this.archiveInitialization;
    await Promise.all(this.pendingPersistence);
    if (this.fatalArchiveError !== undefined) {
      await this.rollbackAfterFatalError();
      return { status: 'failed' };
    }

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
      } else {
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

    let outputPath: string;
    try {
      const finalized = await this.archiveService.finalizeRun({
        runId: this.runId,
        manifest: runResult,
      });
      outputPath = finalized.manifestPath;
    } catch (error) {
      this.recordFatalArchiveError(error);
      await this.rollbackAfterFatalError();
      return { status: 'failed' };
    }

    this.logger.log(`\n=== Tổng kết Reporter theo dõi kiểm thử ===`);
    this.logger.log(`RunId: ${runResult.RunId}`);
    this.logger.log(`Tổng số lần thực thi: ${String(runResult.TotalExecutions)}`);
    this.logger.log(
      `Số Test Case ID đã map duy nhất: ${String(runResult.UniqueMappedTestCaseIdsExecuted)}`,
    );
    this.logger.log(`Thành công: ${String(runResult.PassedExecutions)}`);
    this.logger.log(`Thất bại: ${String(runResult.FailedExecutions)}`);
    this.logger.log(`Bỏ qua: ${String(runResult.SkippedExecutions)}`);
    this.logger.log(`Chưa map: ${String(runResult.UnmappedExecutions)}`);
    this.logger.log(
      `Test Case ID không xác định: ${String(runResult.UnknownTestCaseIdExecutions)}`,
    );
    this.logger.log(`Đầu ra: ${outputPath}\n`);

    if (business) {
      for (const line of formatBusinessRunSummary(business)) this.logger.log(line);
    }

    if (business?.HasValidationErrors) return { status: 'failed' as const };
    return result.status === 'passed' ? undefined : { status: result.status };
  }

  private recordFatalArchiveError(error: unknown): void {
    if (this.fatalArchiveError !== undefined) return;
    this.fatalArchiveError = error;
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : 'UNKNOWN';
    this.logger.error(`Evidence archive failed (${code}); the run will be rolled back.`);
  }

  private async rollbackAfterFatalError(): Promise<void> {
    try {
      await this.archiveService.rollbackRun(this.runId);
    } catch {
      this.logger.error('Evidence archive rollback failed.');
    }
  }
}

export default TestTrackingReporter;
