import { ReportingRepository } from '../../database/repositories/ReportingRepository';
import type { DatabaseConnection } from '../../database/sqlite';

export class DashboardService {
  private repo: ReportingRepository;

  constructor(conn: DatabaseConnection) {
    this.repo = new ReportingRepository(conn);
  }

  public getSummary() {
    return this.repo.getDashboardSummary();
  }
}
