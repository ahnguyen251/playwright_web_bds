import { TestCaseReadRepository } from '../../database/repositories/TestCaseReadRepository';
import { TestRunReadRepository } from '../../database/repositories/TestRunReadRepository';
import { getDefaultDatabase, DatabaseConnection } from '../../database/sqlite';
import { NotFoundError } from '../utils/errors';

export class ReportingService {
  private testCaseRepo: TestCaseReadRepository;
  private testRunRepo: TestRunReadRepository;

  constructor(conn?: DatabaseConnection) {
    const db = conn || getDefaultDatabase();
    this.testCaseRepo = new TestCaseReadRepository(db);
    this.testRunRepo = new TestRunReadRepository(db);
  }

  public getTestCases(filters: any, limit: number, offset: number) {
    return this.testCaseRepo.getTestCases(filters, limit, offset);
  }

  public getTestCaseById(id: string) {
    const testCase = this.testCaseRepo.getTestCaseById(id);
    if (!testCase) {
      throw new NotFoundError('TEST_CASE_NOT_FOUND', 'Test case was not found.');
    }
    return testCase;
  }

  public getRuns(filters: any, limit: number, offset: number) {
    return this.testRunRepo.getRuns(filters, limit, offset);
  }

  public getRunById(runId: string) {
    const run = this.testRunRepo.getRunById(runId);
    if (!run) {
      throw new NotFoundError('RUN_NOT_FOUND', 'Run was not found.');
    }
    return run;
  }

  public getResultsByRunId(runId: string, filters: any, limit: number, offset: number) {
    const run = this.testRunRepo.getRunById(runId);
    if (!run) {
      throw new NotFoundError('RUN_NOT_FOUND', 'Run was not found.');
    }
    return this.testRunRepo.getResultsByRunId(runId, filters, limit, offset);
  }

  public getResultById(resultId: string) {
    const result = this.testRunRepo.getResultById(resultId);
    if (!result) {
      throw new NotFoundError('RESULT_NOT_FOUND', 'Result was not found.');
    }
    return result;
  }
}
