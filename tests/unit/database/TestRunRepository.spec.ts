import { test, expect } from '@playwright/test';
import { openDatabase, DatabaseConnection } from '../../../database/sqlite';
import { initializeSchema } from '../../../database/schema';
import { TestCaseRepository } from '../../../database/repositories/TestCaseRepository';
import { TestRunRepository } from '../../../database/repositories/TestRunRepository';
import type { TestRunResult } from '../../../types/test-result.types';

test.describe('Database Repositories', () => {
  let conn: DatabaseConnection;

  test.beforeEach(() => {
    conn = openDatabase(':memory:');
    initializeSchema(conn);
  });

  test.afterEach(() => {
    conn.close();
  });

  test('TestCaseRepository -> upsertTestCase creates new test case and updates existing', () => {
    const repo = new TestCaseRepository(conn);

    const tc1 = {
      id: 'TC-001',
      module: 'AUTH',
      title: 'Login Test',
      automation: { status: 'AUTOMATED' as const },
    } as any;

    const isNew1 = repo.upsertTestCase(tc1);
    expect(isNew1).toBe(true);

    const tc1Updated = {
      ...tc1,
      title: 'Login Test Updated',
    };

    const isNew2 = repo.upsertTestCase(tc1Updated);
    expect(isNew2).toBe(false);

    const ids = repo.getAllTestCaseIds();
    expect(ids).toEqual(['TC-001']);
  });

  test('TestRunRepository -> transaction rollback works on bad foreign key (mapped test case missing)', () => {
    const repo = new TestRunRepository(conn);

    const fakeRun: TestRunResult = {
      RunId: 'RUN-1',
      StartedAt: new Date().toISOString(),
      FinishedAt: new Date().toISOString(),
      DurationMs: 100,
      TotalExecutions: 1,
      MappedExecutions: 1,
      UnmappedExecutions: 0,
      UnknownTestCaseIdExecutions: 0,
      UniqueMappedTestCaseIdsExecuted: 1,
      PassedExecutions: 1,
      FailedExecutions: 0,
      SkippedExecutions: 0,
      TimedOutExecutions: 0,
      InterruptedExecutions: 0,
      Results: [
        {
          TestCaseId: 'TC-NOT-EXIST',
          TraceabilityStatus: 'MAPPED',
          Title: 'Fake Test',
          FilePath: 'fake.spec.ts',
          Status: 'PASSED',
          DurationMs: 10,
          Retry: 0,
          Evidence: [],
        },
      ],
    };

    const res = repo.importRunResult(fakeRun);
    expect(res.status).toBe('ERROR');
    expect(res.reason).toContain('FOREIGN KEY constraint failed');

    // Verify nothing is inserted in test_runs due to rollback
    const runRows = conn.db.prepare('SELECT * FROM test_runs').all();
    expect(runRows.length).toBe(0);
  });

  test('TestRunRepository -> imports valid run with multiple traceability statuses', () => {
    const tcRepo = new TestCaseRepository(conn);
    tcRepo.upsertTestCase({
      id: 'TC-VALID',
      module: 'TEST',
      title: 'Valid',
      automation: { status: 'AUTOMATED' },
    } as any);

    const runRepo = new TestRunRepository(conn);

    const run: TestRunResult = {
      RunId: 'RUN-2',
      StartedAt: new Date().toISOString(),
      FinishedAt: new Date().toISOString(),
      DurationMs: 500,
      TotalExecutions: 3,
      MappedExecutions: 1,
      UnmappedExecutions: 1,
      UnknownTestCaseIdExecutions: 1,
      UniqueMappedTestCaseIdsExecuted: 1,
      PassedExecutions: 3,
      FailedExecutions: 0,
      SkippedExecutions: 0,
      TimedOutExecutions: 0,
      InterruptedExecutions: 0,
      Results: [
        {
          TestCaseId: 'TC-VALID',
          TraceabilityStatus: 'MAPPED',
          Title: 'Mapped Test',
          FilePath: 'mapped.spec.ts',
          Status: 'PASSED',
          DurationMs: 100,
          Retry: 0,
          Evidence: [{ type: 'SCREENSHOT', path: 'path/to/screenshot.png' }],
        },
        {
          TestCaseId: null,
          TraceabilityStatus: 'UNMAPPED',
          Title: 'Unmapped Test',
          FilePath: 'unmapped.spec.ts',
          Status: 'PASSED',
          DurationMs: 100,
          Retry: 0,
          Evidence: [],
        },
        {
          TestCaseId: 'TC-FAKE',
          TraceabilityStatus: 'UNKNOWN_TEST_CASE_ID',
          Title: 'Unknown Test',
          FilePath: 'unknown.spec.ts',
          Status: 'PASSED',
          DurationMs: 100,
          Retry: 0,
          Evidence: [],
        },
      ],
    };

    const importRes = runRepo.importRunResult(run);
    expect(importRes.status).toBe('SUCCESS');

    // Verify run idempotency (skips duplicate)
    const duplicateRes = runRepo.importRunResult(run);
    expect(duplicateRes.status).toBe('SKIPPED');
    expect(duplicateRes.reason).toBe('RUN_ALREADY_EXISTS');

    // Verify results in DB
    const results = conn.db
      .prepare('SELECT test_case_id, parsed_test_case_id FROM test_results')
      .all() as any[];

    // There should be 3 results
    expect(results.length).toBe(3);

    // MAPPED: test_case_id = TC-VALID, parsed = TC-VALID
    const mapped = results.find((r) => r.test_case_id === 'TC-VALID');
    expect(mapped).toBeDefined();
    expect(mapped.parsed_test_case_id).toBe('TC-VALID');

    // UNMAPPED: test_case_id = null, parsed = null
    const unmapped = results.find(
      (r) => r.test_case_id === null && r.parsed_test_case_id === null,
    );
    expect(unmapped).toBeDefined();

    // UNKNOWN: test_case_id = null, parsed = TC-FAKE
    const unknown = results.find(
      (r) => r.test_case_id === null && r.parsed_test_case_id === 'TC-FAKE',
    );
    expect(unknown).toBeDefined();

    // Verify evidence
    const evidence = conn.db.prepare('SELECT * FROM test_evidence').all();
    expect(evidence.length).toBe(1);
  });
});
