import { DatabaseConnection } from '../sqlite';
import { TestCaseDefinition } from '../../types/test-case.types';

export class TestCaseRepository {
  constructor(private conn: DatabaseConnection) {}

  public upsertTestCase(testCase: TestCaseDefinition): boolean {
    const { db } = this.conn;

    const stmtCheck = db.prepare(
      'SELECT test_case_id, created_at FROM test_cases WHERE test_case_id = ?',
    );
    const existing = stmtCheck.get(testCase.id) as
      | { test_case_id: string; created_at: string }
      | undefined;

    const now = new Date().toISOString();

    if (existing) {
      const stmtUpdate = db.prepare(`
        UPDATE test_cases 
        SET module = ?, title = ?, automation_status = ?, script_path = ?, updated_at = ?
        WHERE test_case_id = ?
      `);
      stmtUpdate.run(
        testCase.module,
        testCase.title,
        testCase.automation.status,
        testCase.automation.scriptPath || null,
        now,
        testCase.id,
      );
      return false; // updated
    } else {
      const stmtInsert = db.prepare(`
        INSERT INTO test_cases (test_case_id, module, title, automation_status, script_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmtInsert.run(
        testCase.id,
        testCase.module,
        testCase.title,
        testCase.automation.status,
        testCase.automation.scriptPath || null,
        now,
        now,
      );
      return true; // inserted
    }
  }

  public getAllTestCaseIds(): string[] {
    const { db } = this.conn;
    const stmt = db.prepare('SELECT test_case_id FROM test_cases');
    const rows = stmt.all() as { test_case_id: string }[];
    return rows.map((r) => r.test_case_id);
  }
}
