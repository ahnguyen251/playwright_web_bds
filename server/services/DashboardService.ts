import { ReportingRepository } from '../../database/repositories/ReportingRepository';
import { getDefaultDatabase, DatabaseConnection } from '../../database/sqlite';

export class DashboardService {
  private repo: ReportingRepository;

  constructor(conn?: DatabaseConnection) {
    this.repo = new ReportingRepository(conn || getDefaultDatabase());
  }

  public getSummary() {
    return this.repo.getDashboardSummary();
  }
}
