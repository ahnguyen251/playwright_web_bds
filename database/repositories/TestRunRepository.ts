import { DatabaseConnection } from '../sqlite';
import { TestRunResult } from '../../types/test-result.types';
import crypto from 'crypto';
import path from 'path';

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

        let dbTestCaseId: string | null = null;
        let dbParsedTestCaseId: string | null = null;

        if (res.TraceabilityStatus === 'MAPPED') {
          dbTestCaseId = res.TestCaseId;
          dbParsedTestCaseId = res.TestCaseId;
        } else if (res.TraceabilityStatus === 'UNMAPPED') {
          dbTestCaseId = null;
          dbParsedTestCaseId = null;
        } else if (res.TraceabilityStatus === 'UNKNOWN_TEST_CASE_ID') {
          dbTestCaseId = null;
          dbParsedTestCaseId = res.TestCaseId;
        }

        stmtInsertResult.run(
          resultId,
          runData.RunId,
          dbTestCaseId,
          dbParsedTestCaseId,
          res.TraceabilityStatus,
          res.PlaywrightTestId || null,
          res.Title,
          res.FilePath,
          res.ProjectName || null,
          res.Status,
          res.ExpectedStatus || null,
          res.DurationMs,
          res.Retry,
          res.ErrorMessage || null,
          res.ErrorStack || null,
          now,
        );

        for (const ev of res.Evidence) {
          const evidenceId = `EVD-${crypto.randomUUID()}`;
          // Normalize absolute paths to relative
          let normalizedPath = ev.path;
          const cwd = process.cwd();
          if (path.isAbsolute(normalizedPath) && normalizedPath.startsWith(cwd)) {
            normalizedPath = path.relative(cwd, normalizedPath);
          }
          normalizedPath = normalizedPath.replace(/\\/g, '/');

          stmtInsertEvidence.run(
            evidenceId,
            resultId,
            ev.type,
            normalizedPath,
            ev.contentType || null,
            now,
          );
        }
      }
    });

    try {
      transaction(runResult);
      return { status: 'SUCCESS', runId: runResult.RunId };
    } catch (e: any) {
      return { status: 'ERROR', reason: e.message, runId: runResult.RunId };
    }
  }
}
