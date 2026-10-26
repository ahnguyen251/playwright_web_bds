import type { DatabaseConnection } from '../sqlite';

type SqlParameter = string | number;

interface CountRow {
  total: number;
}

export interface TestCaseListItem {
  test_case_id: string;
  module: string;
  title: string;
  automation_status: string;
  script_path: string | null;
  created_at: string;
  updated_at: string;
  latest_run_status: string | null;
  latest_run_at: string | null;
  latest_run_duration_ms: number | null;
}

interface TestCaseRecord {
  test_case_id: string;
  module: string;
  title: string;
  automation_status: string;
  script_path: string | null;
  created_at: string;
  updated_at: string;
}

interface TestCaseResultItem {
  resultId: string;
  runId: string;
  runTimestamp: string;
  title: string;
  status: string;
  projectName: string;
  durationMs: number;
  traceabilityStatus: string;
  testCaseId: string;
}

export class TestCaseReadRepository {
  constructor(private conn: DatabaseConnection) {}

  public getTestCases(
    filters: {
      module?: string;
      automationStatus?: string;
      latestRunStatus?: string;
      search?: string;
    },
    limit: number,
    offset: number,
  ) {
    const { db } = this.conn;
    const latestResults = `
      WITH latest_results AS (
        SELECT
          tr.test_case_id,
          tr.status AS latest_run_status,
          r.started_at AS latest_run_at,
          tr.duration_ms AS latest_run_duration_ms,
          ROW_NUMBER() OVER (
            PARTITION BY tr.test_case_id
            ORDER BY r.started_at DESC, tr.created_at DESC, tr.result_id DESC
          ) AS result_rank
        FROM test_results tr
        JOIN test_runs r ON r.run_id = tr.run_id
      )
    `;
    let fromAndWhere = `
      FROM test_cases tc
      LEFT JOIN latest_results lr
        ON lr.test_case_id = tc.test_case_id AND lr.result_rank = 1
      WHERE 1=1
    `;
    const params: SqlParameter[] = [];

    if (filters.module) {
      fromAndWhere += ' AND tc.module = ?';
      params.push(filters.module);
    }
    if (filters.automationStatus) {
      fromAndWhere += ' AND tc.automation_status = ?';
      params.push(filters.automationStatus);
    }
    if (filters.latestRunStatus === 'NOT_RUN') {
      fromAndWhere += ' AND lr.latest_run_status IS NULL';
    } else if (filters.latestRunStatus) {
      fromAndWhere += ' AND lr.latest_run_status = ?';
      params.push(filters.latestRunStatus);
    }
    if (filters.search) {
      const escapedSearch = filters.search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      fromAndWhere += `
        AND (
          tc.title LIKE ? ESCAPE '\\'
          OR tc.test_case_id LIKE ? ESCAPE '\\'
          OR COALESCE(tc.script_path, '') LIKE ? ESCAPE '\\'
        )
      `;
      params.push(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`);
    }

    const countSql = `${latestResults} SELECT COUNT(*) as total ${fromAndWhere}`;
    const totalRow = db.prepare(countSql).get(...params) as CountRow;

    const sql = `
      ${latestResults}
      SELECT
        tc.*,
        lr.latest_run_status,
        lr.latest_run_at,
        lr.latest_run_duration_ms
      ${fromAndWhere}
      ORDER BY tc.test_case_id ASC
      LIMIT ? OFFSET ?
    `;
    const itemParams = [...params, limit, offset];

    const items = db.prepare(sql).all(...itemParams) as TestCaseListItem[];

    const totalItems = totalRow.total;
    return {
      items,
      pagination: {
        page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
        pageSize: limit,
        totalItems,
        totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 0
      }
    };
  }

  public getTestCaseById(id: string): TestCaseRecord | undefined {
    const { db } = this.conn;
    return db.prepare('SELECT * FROM test_cases WHERE test_case_id = ?').get(id) as
      | TestCaseRecord
      | undefined;
  }

  public getTestCaseResults(testCaseId: string, limit: number, offset: number, filters?: { status?: string; runType?: string }) {
    const { db } = this.conn;

    let sql = `
      SELECT 
        tr.result_id as resultId,
        tr.run_id as runId,
        r.started_at as runTimestamp,
        tr.title,
        tr.status,
        tr.project_name as projectName,
        tr.duration_ms as durationMs,
        tr.traceability_status as traceabilityStatus,
        tr.test_case_id as testCaseId
      FROM test_results tr
      JOIN test_runs r ON tr.run_id = r.run_id
      WHERE tr.test_case_id = ?
    `;

    const params: SqlParameter[] = [testCaseId];

    if (filters?.runType === 'SINGLE') {
      sql += " AND r.run_id LIKE 'adhoc-%'";
    } else {
      sql += " AND r.run_id NOT LIKE 'adhoc-%'";
    }


    if (filters?.status) {
      sql += ' AND tr.status = ?';
      params.push(filters.status);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const totalRow = db.prepare(countSql).get(...params) as CountRow;

    sql += ' ORDER BY r.started_at DESC, tr.created_at DESC, tr.result_id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = db.prepare(sql).all(...params) as TestCaseResultItem[];

    return {
      items,
      pagination: {
        page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
        pageSize: limit,
        totalItems: totalRow.total,
        totalPages: limit > 0 ? Math.ceil(totalRow.total / limit) : 0
      }
    };
  }

  public getModulesSummary(): ModuleSummary[] {
    const { db } = this.conn;
    const sql = `
      SELECT 
        module,
        COUNT(*) as totalTestCases,
        SUM(CASE WHEN automation_status = 'AUTOMATED' THEN 1 ELSE 0 END) as automatedCount,
        SUM(CASE WHEN automation_status = 'NOT_AUTOMATED' THEN 1 ELSE 0 END) as notAutomatedCount,
        SUM(CASE WHEN automation_status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressCount,
        SUM(CASE WHEN automation_status = 'BLOCKED' THEN 1 ELSE 0 END) as blockedCount
      FROM test_cases
      GROUP BY module
      ORDER BY 
        CASE module
          WHEN 'Authentication' THEN 1
          WHEN 'Profile' THEN 2
          WHEN 'Home' THEN 3
          WHEN 'Ranking' THEN 4
          WHEN 'Listings' THEN 5
          WHEN 'Appointments' THEN 6
          WHEN 'Transactions' THEN 7
          WHEN 'Packages' THEN 8
          WHEN 'Chat' THEN 9
          ELSE 100
        END ASC,
        module ASC
    `;
    return db.prepare(sql).all() as ModuleSummary[];
  }
}

export interface ModuleSummary {
  module: string;
  totalTestCases: number;
  automatedCount: number;
  notAutomatedCount: number;
  inProgressCount: number;
  blockedCount: number;
}
