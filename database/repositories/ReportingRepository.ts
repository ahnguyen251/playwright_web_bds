import { DatabaseConnection } from '../sqlite';

export class ReportingRepository {
  constructor(private conn: DatabaseConnection) {}

  public getDashboardSummary() {
    const { db } = this.conn;

    // Test Case metrics
    const tcRow = db.prepare(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN automation_status = 'AUTOMATED' THEN 1 ELSE 0 END) as automated,
        SUM(CASE WHEN automation_status = 'NOT_AUTOMATED' THEN 1 ELSE 0 END) as notAutomated
      FROM test_cases
    `).get() as any;

    const totalTestCases = tcRow?.total || 0;
    const automatedTestCases = tcRow?.automated || 0;
    const notAutomatedTestCases = tcRow?.notAutomated || 0;
    const coveragePercent = totalTestCases > 0 ? (automatedTestCases / totalTestCases) * 100 : 0;

    const testCases = {
      total: totalTestCases,
      automated: automatedTestCases,
      notAutomated: notAutomatedTestCases,
      coveragePercent
    };

    // Latest Run metrics from actual test_results instead of trusting test_runs cache
    const latestRunRow = db.prepare('SELECT run_id FROM test_runs ORDER BY created_at DESC, run_id DESC LIMIT 1').get() as { run_id: string } | undefined;
    
    let latestRun = null;

    if (latestRunRow) {
      const runId = latestRunRow.run_id;

      const resultsRow = db.prepare(`
        SELECT 
          COUNT(*) as totalExecutions,
          SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
          SUM(CASE WHEN traceability_status = 'MAPPED' THEN 1 ELSE 0 END) as mapped,
          SUM(CASE WHEN traceability_status = 'UNMAPPED' THEN 1 ELSE 0 END) as unmapped,
          SUM(CASE WHEN traceability_status = 'UNKNOWN_TEST_CASE_ID' THEN 1 ELSE 0 END) as unknown
        FROM test_results
        WHERE run_id = ?
      `).get(runId) as any;

      const uniqueMappedRow = db.prepare(`
        SELECT COUNT(DISTINCT test_case_id) as uniqueMappedTestCaseIds
        FROM test_results
        WHERE run_id = ? AND traceability_status = 'MAPPED'
      `).get(runId) as { uniqueMappedTestCaseIds: number };

      latestRun = {
        runId,
        totalExecutions: resultsRow?.totalExecutions || 0,
        passed: resultsRow?.passed || 0,
        failed: resultsRow?.failed || 0,
        skipped: resultsRow?.skipped || 0,
        mapped: resultsRow?.mapped || 0,
        unmapped: resultsRow?.unmapped || 0,
        unknown: resultsRow?.unknown || 0,
        uniqueMappedTestCaseIds: uniqueMappedRow?.uniqueMappedTestCaseIds || 0
      };
    } else {
      // Empty contract if no run exists
      latestRun = {
        runId: null,
        totalExecutions: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        mapped: 0,
        unmapped: 0,
        unknown: 0,
        uniqueMappedTestCaseIds: 0
      };
    }

    return {
      testCases,
      latestRun
    };
  }
}
