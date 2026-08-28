import { TestCaseReadRepository } from '../../database/repositories/TestCaseReadRepository';
import { TestRunReadRepository } from '../../database/repositories/TestRunReadRepository';
import { TestCaseAnalyticsRepository } from '../../database/repositories/TestCaseAnalyticsRepository';
import type { DatabaseConnection } from '../../database/sqlite';
import { NotFoundError } from '../utils/errors';

export class ReportingService {
  private testCaseRepo: TestCaseReadRepository;
  private testRunRepo: TestRunReadRepository;
  private analyticsRepo: TestCaseAnalyticsRepository;

  constructor(conn: DatabaseConnection) {
    this.testCaseRepo = new TestCaseReadRepository(conn);
    this.testRunRepo = new TestRunReadRepository(conn);
    this.analyticsRepo = new TestCaseAnalyticsRepository(conn);
  }

  public getTestCases(filters: any, limit: number, offset: number) {
    return this.testCaseRepo.getTestCases(filters, limit, offset);
  }

  public getTestCaseById(id: string) {
    const testCase = this.testCaseRepo.getTestCaseById(id);
    if (!testCase) {
      throw new NotFoundError('TEST_CASE_NOT_FOUND', 'Test case was not found.');
    }
    return testCase;
  }

  public getTestCaseResults(testCaseId: string, filters: any, limit: number, offset: number) {
    const testCase = this.testCaseRepo.getTestCaseById(testCaseId);
    if (!testCase) {
      throw new NotFoundError('TEST_CASE_NOT_FOUND', 'Test case was not found.');
    }
    return this.testCaseRepo.getTestCaseResults(testCaseId, limit, offset, filters);
  }

  public getRuns(filters: any, limit: number, offset: number) {
    return this.testRunRepo.getRuns(filters, limit, offset);
  }

  public getRunById(runId: string) {
    const run = this.testRunRepo.getRunById(runId);
    if (!run) {
      throw new NotFoundError('RUN_NOT_FOUND', 'Run was not found.');
    }
    return run;
  }

  public getResultsByRunId(runId: string, filters: any, limit: number, offset: number) {
    const run = this.testRunRepo.getRunById(runId);
    if (!run) {
      throw new NotFoundError('RUN_NOT_FOUND', 'Run was not found.');
    }
    return this.testRunRepo.getResultsByRunId(runId, filters, limit, offset);
  }

  public getResultById(resultId: string) {
    const result = this.testRunRepo.getResultById(resultId);
    if (!result) {
      throw new NotFoundError('RESULT_NOT_FOUND', 'Result was not found.');
    }
    return result;
  }

  public getTestCaseAnalytics(testCaseId: string) {
    const testCase = this.testCaseRepo.getTestCaseById(testCaseId);
    if (!testCase) {
      throw new NotFoundError('TEST_CASE_NOT_FOUND', 'Test case was not found.');
    }

    const DAYS = 30;
    const TREND_LIMIT = 20;

    const executions = this.analyticsRepo.getLogicalExecutionsInWindow(testCaseId, DAYS);

    // Sort oldest -> newest for trend and status change calculation
    const chronological = [...executions].reverse();

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let retryFlakyExecutions = 0;
    let logicalDurationSum = 0;
    let logicalDurationCount = 0;
    let statusChanges = 0;

    let previousStatus: string | null = null;

    for (const exec of chronological) {
      if (exec.finalStatus === 'PASSED') {
        passed++;
        if (exec.retryFlaky) {
          retryFlakyExecutions++;
        }
      } else if (exec.finalStatus === 'FAILED') {
        failed++;
      } else if (exec.finalStatus === 'SKIPPED') {
        skipped++;
      }

      if (exec.logicalDurationMs !== null) {
        logicalDurationSum += exec.logicalDurationMs;
        logicalDurationCount++;
      }

      if (previousStatus !== null && exec.finalStatus !== previousStatus) {
        statusChanges++;
      }
      previousStatus = exec.finalStatus;
    }

    const eligibleExecutions = passed + failed;
    const passRatePercent = eligibleExecutions > 0 ? (passed / eligibleExecutions) * 100 : 0;
    const retryFlakyRatePercent =
      eligibleExecutions > 0 ? (retryFlakyExecutions / eligibleExecutions) * 100 : 0;

    const possibleTransitions = Math.max(executions.length - 1, 0);
    const statusChangeRatePercent =
      possibleTransitions > 0 ? (statusChanges / possibleTransitions) * 100 : 0;

    const averageDurationMs =
      logicalDurationCount > 0 ? Math.round(logicalDurationSum / logicalDurationCount) : null;

    // Latest status/executedAt from the newest (first item in executions array, since it's newest-first)
    const latestExecution = executions[0];
    const latestStatus = latestExecution?.finalStatus ?? null;
    const latestExecutedAt = latestExecution?.finalExecutedAt ?? null;

    // Trend uses latest 20 logical executions
    const trend = chronological.slice(-TREND_LIMIT);

    return {
      testCaseId,
      window: { days: DAYS, trendLimit: TREND_LIMIT },
      summary: {
        totalExecutions: executions.length,
        passed,
        failed,
        skipped,
        retryFlakyExecutions,
        passRatePercent: Math.round(passRatePercent * 100) / 100,
        retryFlakyRatePercent: Math.round(retryFlakyRatePercent * 100) / 100,
        averageDurationMs,
        latestStatus,
        latestExecutedAt,
      },
      stability: {
        statusChanges,
        statusChangeRatePercent: Math.round(statusChangeRatePercent * 100) / 100,
      },
      trend: trend.map((t) => ({
        runId: t.runId,
        resultId: t.finalResultId,
        executedAt: t.finalExecutedAt,
        finalStatus: t.finalStatus,
        retryFlaky: t.retryFlaky,
        durationMs: t.logicalDurationMs,
      })),
    };
  }
}
