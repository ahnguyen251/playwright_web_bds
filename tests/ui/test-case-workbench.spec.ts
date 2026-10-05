import type { Server } from 'node:http';
import path from 'node:path';

import { expect, test } from '../../fixtures/test.fixture';
import { TestCaseListPage } from '../../pages/dashboard/TestCaseListPage';
import { createApp } from '../../server/app';
import { initializeSchema } from '../../database/schema';
import { openDatabase, type DatabaseConnection } from '../../database/sqlite';

let server: Server;
let port: number;
let conn: DatabaseConnection;

interface TestCaseListResponse {
  items: {
    test_case_id: string;
    latest_run_status: string | null;
  }[];
}

test.beforeAll(async () => {
  conn = openDatabase(':memory:');
  initializeSchema(conn);

  server = createApp({
    database: conn,
    evidenceRoot: path.resolve(process.cwd(), 'test-results'),
  }).listen(0);

  await new Promise<void>((resolve) => {
    server.once('listening', () => {
      port = (server.address() as { port: number }).port;
      resolve();
    });
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  conn.close();
});

test.beforeEach(() => {
  conn.db.prepare('DELETE FROM test_evidence').run();
  conn.db.prepare('DELETE FROM test_results').run();
  conn.db.prepare('DELETE FROM test_runs').run();
  conn.db.prepare('DELETE FROM test_cases').run();
});

test('latest run filter returns failed and unrun test cases separately', async ({ request }) => {
  const insertTestCase = conn.db.prepare(
    'INSERT INTO test_cases (test_case_id, title, module, automation_status, script_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertTestCase.run(
    'TC-01',
    'Login check',
    'Authentication',
    'AUTOMATED',
    'tests/authentication/login.spec.ts',
    '2026-01-01T10:00:00.000Z',
    '2026-01-01T10:00:00.000Z',
  );
  insertTestCase.run(
    'TC-02',
    'Password reset check',
    'Authentication',
    'NOT_AUTOMATED',
    null,
    '2026-01-01T10:00:00.000Z',
    '2026-01-01T10:00:00.000Z',
  );

  conn.db
    .prepare(
      'INSERT INTO test_runs (run_id, created_at, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      'RUN-01',
      '2026-01-02T10:00:00.000Z',
      '2026-01-02T10:00:00.000Z',
      '2026-01-02T10:01:00.000Z',
      60000,
      1,
      1,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      0,
    );
  conn.db
    .prepare(
      'INSERT INTO test_results (result_id, run_id, test_case_id, parsed_test_case_id, traceability_status, status, title, file_path, duration_ms, retry, created_at, project_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      'RESULT-01',
      'RUN-01',
      'TC-01',
      'TC-01',
      'MAPPED',
      'FAILED',
      'Login check',
      'tests/authentication/login.spec.ts',
      1200,
      0,
      '2026-01-02T10:00:30.000Z',
      'chromium',
    );

  const failedResponse = await request.get(
    `http://localhost:${String(port)}/api/test-cases?latestRunStatus=FAILED`,
  );
  const failedBody = (await failedResponse.json()) as unknown as TestCaseListResponse;
  expect(failedResponse.status()).toBe(200);
  expect(failedBody.items).toHaveLength(1);
  expect(failedBody.items[0]).toMatchObject({
    test_case_id: 'TC-01',
    latest_run_status: 'FAILED',
  });

  const unrunResponse = await request.get(
    `http://localhost:${String(port)}/api/test-cases?latestRunStatus=NOT_RUN`,
  );
  const unrunBody = (await unrunResponse.json()) as unknown as TestCaseListResponse;
  expect(unrunResponse.status()).toBe(200);
  expect(unrunBody.items).toHaveLength(1);
  expect(unrunBody.items[0]).toMatchObject({
    test_case_id: 'TC-02',
    latest_run_status: null,
  });
});

test('command bar clears latest run filters and restores visible test cases', async ({ page }) => {
  const insertTestCase = conn.db.prepare(
    'INSERT INTO test_cases (test_case_id, title, module, automation_status, script_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertTestCase.run(
    'TC-01',
    'Login check',
    'Authentication',
    'AUTOMATED',
    'tests/authentication/login.spec.ts',
    '2026-01-01T10:00:00.000Z',
    '2026-01-01T10:00:00.000Z',
  );
  insertTestCase.run(
    'TC-02',
    'Password reset check',
    'Authentication',
    'NOT_AUTOMATED',
    null,
    '2026-01-01T10:00:00.000Z',
    '2026-01-01T10:00:00.000Z',
  );

  conn.db
    .prepare(
      'INSERT INTO test_runs (run_id, created_at, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      'RUN-01',
      '2026-01-02T10:00:00.000Z',
      '2026-01-02T10:00:00.000Z',
      '2026-01-02T10:01:00.000Z',
      60000,
      1,
      1,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      0,
    );
  conn.db
    .prepare(
      'INSERT INTO test_results (result_id, run_id, test_case_id, parsed_test_case_id, traceability_status, status, title, file_path, duration_ms, retry, created_at, project_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      'RESULT-01',
      'RUN-01',
      'TC-01',
      'TC-01',
      'MAPPED',
      'FAILED',
      'Login check',
      'tests/authentication/login.spec.ts',
      1200,
      0,
      '2026-01-02T10:00:30.000Z',
      'chromium',
    );

  const testCaseListPage = new TestCaseListPage(page);
  await testCaseListPage.open(`http://localhost:${String(port)}/#test-cases`);
  await testCaseListPage.filterByLatestRun('FAILED');

  await expect.poll(() => testCaseListPage.visibleTestCaseIds()).toEqual(['TC-01']);
  await expect.poll(() => testCaseListPage.getActiveFilterLabels()).toContain('Failed');

  await testCaseListPage.clearFilters();
  await expect.poll(() => testCaseListPage.visibleTestCaseIds()).toEqual(['TC-01', 'TC-02']);
});

test('selected test action state follows row selection', async ({ page }) => {
  const insertTestCase = conn.db.prepare(
    'INSERT INTO test_cases (test_case_id, title, module, automation_status, script_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertTestCase.run(
    'TC-01',
    'Login check',
    'Authentication',
    'AUTOMATED',
    'tests/authentication/login.spec.ts',
    '2026-01-01T10:00:00.000Z',
    '2026-01-01T10:00:00.000Z',
  );
  insertTestCase.run(
    'TC-02',
    'Password reset check',
    'Authentication',
    'NOT_AUTOMATED',
    null,
    '2026-01-01T10:00:00.000Z',
    '2026-01-01T10:00:00.000Z',
  );

  const testCaseListPage = new TestCaseListPage(page);
  await testCaseListPage.open(`http://localhost:${String(port)}/#test-cases`);

  expect(await testCaseListPage.isRunSelectedEnabled()).toBe(false);
  await testCaseListPage.selectTestCase('TC-01');
  await expect.poll(() => testCaseListPage.getSelectedCount()).toBe('1 test case đã chọn');
  await expect.poll(() => testCaseListPage.isRunSelectedEnabled()).toBe(true);

  await testCaseListPage.unselectTestCase('TC-01');
  await expect.poll(() => testCaseListPage.getSelectedCount()).toBe('0 test case đã chọn');
  await expect.poll(() => testCaseListPage.isRunSelectedEnabled()).toBe(false);
});
