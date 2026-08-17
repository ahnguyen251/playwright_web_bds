import { DatabaseConnection } from './sqlite';

export const initializeSchema = (conn: DatabaseConnection) => {
  const { db } = conn;

  const transaction = db.transaction(() => {
    // 1. test_cases
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_cases (
        test_case_id TEXT PRIMARY KEY,
        module TEXT NOT NULL,
        title TEXT NOT NULL,
        automation_status TEXT NOT NULL CHECK(automation_status IN ('NOT_AUTOMATED', 'IN_PROGRESS', 'AUTOMATED', 'BLOCKED')),
        script_path TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. test_runs
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_runs (
        run_id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        total_executions INTEGER NOT NULL,
        mapped_executions INTEGER NOT NULL,
        unmapped_executions INTEGER NOT NULL,
        unknown_test_case_id_executions INTEGER NOT NULL,
        unique_mapped_test_case_ids_executed INTEGER NOT NULL,
        passed_executions INTEGER NOT NULL,
        failed_executions INTEGER NOT NULL,
        skipped_executions INTEGER NOT NULL,
        timed_out_executions INTEGER NOT NULL,
        interrupted_executions INTEGER NOT NULL,
        report_path TEXT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 3. test_results
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        result_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        test_case_id TEXT NULL,
        parsed_test_case_id TEXT NULL,
        traceability_status TEXT NOT NULL,
        playwright_test_id TEXT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        project_name TEXT NULL,
        status TEXT NOT NULL,
        expected_status TEXT NULL,
        duration_ms INTEGER NOT NULL,
        retry INTEGER NOT NULL,
        error_message TEXT NULL,
        error_stack TEXT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES test_runs(run_id) ON DELETE CASCADE,
        FOREIGN KEY (test_case_id) REFERENCES test_cases(test_case_id) ON DELETE SET NULL
      );
    `);

    // 4. test_evidence
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_evidence (
        evidence_id TEXT PRIMARY KEY,
        result_id TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        content_type TEXT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (result_id) REFERENCES test_results(result_id) ON DELETE CASCADE
      );
    `);

    // Indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_test_cases_module ON test_cases(module);
      CREATE INDEX IF NOT EXISTS idx_test_cases_automation_status ON test_cases(automation_status);
      
      CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_test_case_id ON test_results(test_case_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_parsed_test_case_id ON test_results(parsed_test_case_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
      CREATE INDEX IF NOT EXISTS idx_test_results_project_name ON test_results(project_name);
      CREATE INDEX IF NOT EXISTS idx_test_results_traceability_status ON test_results(traceability_status);

      CREATE INDEX IF NOT EXISTS idx_test_evidence_result_id ON test_evidence(result_id);
    `);
  });

  transaction();
};
