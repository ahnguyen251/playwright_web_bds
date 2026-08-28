import type { DatabaseConnection } from '../sqlite';
import type { TestRunResult } from '../../types/test-result.types';
import crypto from 'crypto';

export interface ImportResult {
  status: 'SUCCESS' | 'SKIPPED' | 'ERROR';
  reason?: string;
  runId: string;
}

export class TestRunRepository {
  constructor(private conn: DatabaseConnection) {}

  public importRunResult(runResult: TestRunResult): ImportResult {
    const { db } = this.conn;

    // Check idempotency
    const stmtCheck = db.prepare('SELECT run_id FROM test_runs WHERE run_id = ?');
    const existing = stmtCheck.get(runResult.RunId);
    if (existing) {
      return { status: 'SKIPPED', reason: 'RUN_ALREADY_EXISTS', runId: runResult.RunId };
    }

    const transaction = db.transaction((runData: TestRunResult) => {
      const now = new Date().toISOString();

      const stmtInsertRun = db.prepare(`
        INSERT INTO test_runs (
          run_id, started_at, finished_at, duration_ms,
          total_executions, mapped_executions, unmapped_executions,
          unknown_test_case_id_executions, unique_mapped_test_case_ids_executed,
          passed_executions, failed_executions, skipped_executions,
          timed_out_executions, interrupted_executions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmtInsertRun.run(
        runData.RunId,
        runData.StartedAt,
        runData.FinishedAt,
        runData.DurationMs,
        runData.TotalExecutions,
        runData.MappedExecutions,
        runData.UnmappedExecutions,
        runData.UnknownTestCaseIdExecutions,
        runData.UniqueMappedTestCaseIdsExecuted,
        runData.PassedExecutions,
        runData.FailedExecutions,
        runData.SkippedExecutions,
        runData.TimedOutExecutions,
        runData.InterruptedExecutions,
        now,
      );

      const stmtInsertResult = db.prepare(`
        INSERT INTO test_results (
          result_id, run_id, test_case_id, parsed_test_case_id,
          traceability_status, playwright_test_id, title, file_path,
          project_name, status, expected_status, duration_ms, retry,
          error_message, error_stack, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stmtInsertEvidence = db.prepare(`
        INSERT INTO test_evidence (
          evidence_id, result_id, type, path, content_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const res of runData.Results) {
        const resultId = `RES-${runData.RunId}-${crypto.randomUUID().slice(0, 8)}`;

        const [dbTestCaseId, dbParsedTestCaseId]: readonly [string | null, string | null] =
          res.TraceabilityStatus === 'MAPPED'
            ? [res.TestCaseId, res.TestCaseId]
            : res.TraceabilityStatus === 'UNMAPPED'
              ? [null, null]
              : [null, res.TestCaseId];

        stmtInsertResult.run(
          resultId,
          runData.RunId,
          dbTestCaseId,
          dbParsedTestCaseId,
          res.TraceabilityStatus,
          res.PlaywrightTestId ?? null,
          res.Title,
          res.FilePath,
          res.ProjectName ?? null,
          res.Status,
          res.ExpectedStatus ?? null,
          res.DurationMs,
          res.Retry,
          res.ErrorMessage ?? null,
          res.ErrorStack ?? null,
          now,
        );

        for (const ev of res.Evidence) {
          const evidenceId = `EVD-${crypto.randomUUID()}`;
          stmtInsertEvidence.run(
            evidenceId,
            resultId,
            ev.type,
            ev.path,
            ev.contentType ?? null,
            now,
          );
        }
      }
    });

    try {
      transaction(runResult);
      return { status: 'SUCCESS', runId: runResult.RunId };
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return { status: 'ERROR', reason, runId: runResult.RunId };
    }
  }
}
