import { DatabaseConnection } from '../sqlite';

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
}
