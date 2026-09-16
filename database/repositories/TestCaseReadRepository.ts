import type { DatabaseConnection } from '../sqlite';

export class TestCaseReadRepository {
  constructor(private conn: DatabaseConnection) {}

  public getTestCases(filters: { module?: string; automationStatus?: string; search?: string }, limit: number, offset: number) {
    const { db } = this.conn;
    let sql = 'SELECT * FROM test_cases WHERE 1=1';
    const params: any[] = [];

    if (filters.module) {
      sql += ' AND module = ?';
      params.push(filters.module);
    }
    if (filters.automationStatus) {
      sql += ' AND automation_status = ?';
      params.push(filters.automationStatus);
    }
    if (filters.search) {
      const escapedSearch = filters.search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      sql += ' AND (title LIKE ? ESCAPE \'\\\' OR test_case_id LIKE ? ESCAPE \'\\\')';
      params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countSql).get(...params) as { total: number };

    sql += ' ORDER BY test_case_id ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = db.prepare(sql).all(...params) as any[];

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

  public getTestCaseById(id: string) {
    const { db } = this.conn;
    return db.prepare('SELECT * FROM test_cases WHERE test_case_id = ?').get(id) as any | undefined;
  }

  public getTestCaseResults(testCaseId: string, limit: number, offset: number, filters?: { status?: string }) {
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

    const params: any[] = [testCaseId];

    if (filters?.status) {
      sql += ' AND tr.status = ?';
      params.push(filters.status);
    }

    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const totalRow = db.prepare(countSql).get(...params) as { total: number };

    sql += ' ORDER BY r.started_at DESC, tr.created_at DESC, tr.result_id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const items = db.prepare(sql).all(...params) as any[];

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
      ORDER BY module ASC
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
