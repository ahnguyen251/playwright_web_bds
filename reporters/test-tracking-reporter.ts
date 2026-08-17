import type { Reporter, TestCase, TestResult, FullConfig, Suite } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import type { TestRunResult, TestExecutionResult } from '../types/test-result.types';
import { mapPlaywrightStatus, mapEvidence, resolveTraceability } from './result-mapper';

class TestTrackingReporter implements Reporter {
  private runId!: string;
  private startedAt!: Date;
  private executions: TestExecutionResult[] = [];

  onBegin(config: FullConfig, suite: Suite) {
    this.startedAt = new Date();
    const dateStr = this.startedAt.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const shortRandom = crypto.randomBytes(2).toString('hex');
    this.runId = `RUN-${dateStr}-${shortRandom}`;
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

  async onEnd() {
    const finishedAt = new Date();

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
    };

    const outputDir = path.resolve(process.cwd(), 'test-results', 'tracking', this.runId);
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
  }
}

export default TestTrackingReporter;
