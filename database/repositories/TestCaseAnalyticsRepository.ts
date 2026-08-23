
import { DatabaseConnection } from '../sqlite';

export interface LogicalExecution {
  runId: string;
  playwrightTestId: string | null;
  finalResultId: string;
  finalStatus: string;
  runStartedAt: string;
  finalExecutedAt: string;
  logicalDurationMs: number | null;
  retryFlaky: boolean;
}

export class TestCaseAnalyticsRepository {
  private conn: DatabaseConnection;

  constructor(conn: DatabaseConnection) {
    this.conn = conn;
  }

  /**
   * Retrieves all logical executions for a given canonical test case within a specified day window.
   * A logical execution is uniquely identified by (run_id, playwright_test_id).
   * Fallback for playwright_test_id is result_id.
   * 
   * Returns them ordered newest-first: run_started_at DESC, final_executed_at DESC, final_result_id DESC
   */
  getLogicalExecutionsInWindow(testCaseId: string, days: number): LogicalExecution[] {
    const stmt = this.conn.db.prepare(`
      WITH attempts AS (
        SELECT
          r.result_id,
          r.run_id,
          r.playwright_test_id,
          r.status,
          r.duration_ms,
          r.retry,
          r.created_at as result_created_at,
          tr.started_at as run_started_at,
          ROW_NUMBER() OVER (
            PARTITION BY r.run_id, IFNULL(r.playwright_test_id, r.result_id)
            ORDER BY r.retry DESC, r.created_at DESC, r.result_id DESC
          ) as rn
        FROM test_results r
        JOIN test_runs tr ON r.run_id = tr.run_id
        WHERE r.test_case_id = ?
          AND tr.started_at >= datetime('now', '-' || ? || ' days')
      ),
      logical_executions AS (
        SELECT
          a.run_id,
          IFNULL(a.playwright_test_id, a.result_id) as logical_id,
          a.playwright_test_id,
          MAX(CASE WHEN a.rn = 1 THEN a.status END) as final_status,
          MAX(CASE WHEN a.rn = 1 THEN a.result_id END) as final_result_id,
          MAX(CASE WHEN a.rn = 1 THEN a.result_created_at END) as final_executed_at,
          MAX(CASE WHEN a.rn = 1 THEN a.run_started_at END) as run_started_at,
          SUM(a.duration_ms) as logical_duration_ms,
          MAX(CASE WHEN a.status = 'FAILED' THEN 1 ELSE 0 END) as has_failed_attempt
        FROM attempts a
        GROUP BY a.run_id, logical_id
      )
      SELECT
        run_id as runId,
        playwright_test_id as playwrightTestId,
        final_result_id as finalResultId,
        final_status as finalStatus,
        run_started_at as runStartedAt,
        final_executed_at as finalExecutedAt,
        logical_duration_ms as logicalDurationMs,
        CASE WHEN final_status = 'PASSED' AND has_failed_attempt = 1 THEN 1 ELSE 0 END as retryFlaky
      FROM logical_executions
      ORDER BY run_started_at DESC, final_executed_at DESC, final_result_id DESC
    `);

    const rows = stmt.all(testCaseId, days) as any[];

    return rows.map(row => ({
      runId: row.runId,
      playwrightTestId: row.playwrightTestId,
      finalResultId: row.finalResultId,
      finalStatus: row.finalStatus,
      runStartedAt: row.runStartedAt,
      finalExecutedAt: row.finalExecutedAt,
      logicalDurationMs: row.logicalDurationMs,
      retryFlaky: Boolean(row.retryFlaky)
    }));
  }
}
