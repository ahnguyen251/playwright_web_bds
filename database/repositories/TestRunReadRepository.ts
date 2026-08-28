import { stripVTControlCharacters } from 'node:util';
import type { DatabaseConnection } from '../sqlite';

interface TestResultRecord {
  [column: string]: unknown;
  error_message: string | null;
  error_stack: string | null;
}

type SqlRow = Record<string, unknown>;

const sanitizeStoredResult = (result: TestResultRecord): TestResultRecord => {
  const projectRootPattern = new RegExp(process.cwd().replace(/\\/g, '\\\\'), 'g');

  if (result.error_message) {
    result.error_message = stripVTControlCharacters(result.error_message).replace(
      projectRootPattern,
      '<PROJECT_ROOT>',
    );
  }

  if (result.error_stack) {
    result.error_stack = stripVTControlCharacters(result.error_stack)
      .replace(projectRootPattern, '<PROJECT_ROOT>')
      .replace(/([?&]token=)[^&\s]+/g, '$1***')
      .replace(/([?&]access_token=)[^&\s]+/g, '$1***');
  }

  return result;
};

export class TestRunReadRepository {
  constructor(private conn: DatabaseConnection) {}

  public getRuns(
    filters: { status?: string; from?: string; to?: string },
    limit: number,
    offset: number,
  ) {
    const { db } = this.conn;
    let sql = 'SELECT * FROM test_runs WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters.status) {
      if (filters.status === 'PASSED') {
        sql += ' AND failed_executions = 0';
      } else if (filters.status === 'FAILED') {
        sql += ' AND failed_executions > 0';
      }
    }
    // Filter by run actual timestamp (created_at)
    if (filters.from) {
      sql += ' AND created_at >= ?';
      params.push(filters.from);
    }
    if (filters.to) {
      sql += ' AND created_at <= ?';
      params.push(filters.to);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countSql).get(...params) as { total: number };

    sql += ' ORDER BY created_at DESC, run_id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = db.prepare(sql).all(...params) as SqlRow[];
    const totalItems = totalRow.total;

    return {
      items,
      pagination: {
        page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
        pageSize: limit,
        totalItems,
        totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 0,
      },
    };
  }

  public getRunById(runId: string) {
    const { db } = this.conn;
    return db.prepare('SELECT * FROM test_runs WHERE run_id = ?').get(runId) as SqlRow | undefined;
  }

  public getResultsByRunId(
    runId: string,
    filters: {
      status?: string;
      traceabilityStatus?: string;
      projectName?: string;
      testCaseId?: string;
      search?: string;
    },
    limit: number,
    offset: number,
  ) {
    const { db } = this.conn;
    let sql = 'SELECT * FROM test_results WHERE run_id = ?';
    const params: (string | number)[] = [runId];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.traceabilityStatus) {
      sql += ' AND traceability_status = ?';
      params.push(filters.traceabilityStatus);
    }
    if (filters.projectName) {
      sql += ' AND project_name = ?';
      params.push(filters.projectName);
    }
    if (filters.testCaseId) {
      sql += ' AND parsed_test_case_id = ?';
      params.push(filters.testCaseId);
    }
    if (filters.search) {
      const escapedSearch = filters.search
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      sql += " AND (title LIKE ? ESCAPE '\\' OR parsed_test_case_id LIKE ? ESCAPE '\\')";
      params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countSql).get(...params) as { total: number };

    sql += ' ORDER BY created_at ASC, result_id ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = (db.prepare(sql).all(...params) as TestResultRecord[]).map(sanitizeStoredResult);
    const totalItems = totalRow.total;

    return {
      items,
      pagination: {
        page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
        pageSize: limit,
        totalItems,
        totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 0,
      },
    };
  }

  public getResultById(resultId: string) {
    const { db } = this.conn;
    const result = db.prepare('SELECT * FROM test_results WHERE result_id = ?').get(resultId) as
      TestResultRecord | undefined;

    return result ? sanitizeStoredResult(result) : undefined;
  }
}
