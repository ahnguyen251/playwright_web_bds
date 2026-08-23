import { test, expect } from '@playwright/test';
import { Server } from 'http';
import { createApp } from '../../server/app';
import { openDatabase, DatabaseConnection } from '../../database/sqlite';
import { initializeSchema } from '../../database/schema';
import * as crypto from 'crypto';

let server: Server;
let port: number;
let conn: DatabaseConnection;

test.beforeAll(async () => {
  conn = openDatabase(':memory:');
  initializeSchema(conn);

  const app = createApp(conn);

  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      resolve();
    });
  });
});

test.afterAll(() => {
  server.close();
  conn.close();
});

test.describe.serial('API Endpoints against Isolated DB', () => {

  test.beforeEach(() => {
    conn.db.prepare('DELETE FROM test_evidence').run();
    conn.db.prepare('DELETE FROM test_results').run();
    conn.db.prepare('DELETE FROM test_runs').run();
    conn.db.prepare('DELETE FROM test_cases').run();
  });

  // ----------------------------------------------------
  // Health
  // ----------------------------------------------------
  test('GET /api/health should return 200 by performing a SELECT 1', async ({ request }) => {
    const response = await request.get(`http://localhost:${port}/api/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  // ----------------------------------------------------
  // Validation
  // ----------------------------------------------------
  test('Runtime Validation - Invalid pagination', async ({ request }) => {
    const cases = ['page=-1', 'page=0', 'page=1.5', 'page=abc', 'pageSize=0', 'pageSize=101'];
    for (const q of cases) {
      const response = await request.get(`http://localhost:${port}/api/test-cases?${q}`);
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('INVALID_REQUEST');
    }
  });

  test('Runtime Validation - Invalid enums', async ({ request }) => {
    const response = await request.get(`http://localhost:${port}/api/test-cases?automationStatus=INVALID`);
    expect(response.status()).toBe(400);
    
    const res2 = await request.get(`http://localhost:${port}/api/runs?status=INVALID`);
    expect(res2.status()).toBe(400);
  });

  test('Runtime Validation - Invalid dates', async ({ request }) => {
    const res1 = await request.get(`http://localhost:${port}/api/runs?from=not-a-date`);
    expect(res1.status()).toBe(400);

    const res2 = await request.get(`http://localhost:${port}/api/runs?from=2024-01-02T00:00:00Z&to=2024-01-01T00:00:00Z`);
    expect(res2.status()).toBe(400);
    const body2 = await res2.json();
    expect(body2.error.message).toContain('from date must be before or equal to to date');
  });

  // ----------------------------------------------------
  // Error Sanitization
  // ----------------------------------------------------
  test('Error Contract - DATABASE_ERROR should not expose stack traces', async ({ request }) => {
    // Drop table temporarily to force a database error
    conn.db.prepare('DROP TABLE test_cases').run();
    
    const response = await request.get(`http://localhost:${port}/api/test-cases`);
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('DATABASE_ERROR');
    expect(body.error.message).toBe('Unable to read reporting data.');
    expect(body.error.stack).toBeUndefined(); // no stack trace

    // Recreate schema
    initializeSchema(conn);
  });

  // ----------------------------------------------------
  // Empty DB Behavior
  // ----------------------------------------------------
  test('Dashboard Summary - Empty database behavior', async ({ request }) => {
    const response = await request.get(`http://localhost:${port}/api/dashboard/summary`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.testCases).toEqual({
      total: 0,
      automated: 0,
      notAutomated: 0,
      coveragePercent: 0
    });
    expect(body.latestRun).toEqual({
      runId: null,
      totalExecutions: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      mapped: 0,
      unmapped: 0,
      unknown: 0,
      uniqueMappedTestCaseIds: 0
    });
  });

  // ----------------------------------------------------
  // Test Cases & Runs & Results with data
  // ----------------------------------------------------
  test.describe('With data', () => {
    test.beforeEach(() => {
      // Seed Test Cases
      const insertTc = conn.db.prepare('INSERT INTO test_cases (test_case_id, title, module, automation_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
      insertTc.run('TC-01', 'Login success % _', 'auth', 'AUTOMATED', '2026-01-01T10:00:00.000Z', '2026-01-01T10:00:00.000Z');
      insertTc.run('TC-02', 'Login fail', 'auth', 'NOT_AUTOMATED', '2026-01-01T10:00:00.000Z', '2026-01-01T10:00:00.000Z');

      // Seed Run
      const insertRun = conn.db.prepare(`
        INSERT INTO test_runs (
          run_id, started_at, finished_at, duration_ms, 
          total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, 
          unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, 
          timed_out_executions, interrupted_executions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertRun.run(
        'RUN-01', '2026-01-01T10:00:00.000Z', '2026-01-01T10:05:00.000Z', 300000,
        4, 2, 1, 1, 1, 2, 2, 0, 0, 0, '2026-01-01T10:00:00.000Z'
      );

      // Seed Results
      const insertRes = conn.db.prepare(`
        INSERT INTO test_results (
          result_id, run_id, test_case_id, parsed_test_case_id, traceability_status, 
          status, title, file_path, duration_ms, retry, created_at, project_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // MAPPED (test_case_id != null)
      insertRes.run('RES-01', 'RUN-01', 'TC-01', 'TC-01', 'MAPPED', 'PASSED', 'Login success', 'test.ts', 1000, 0, '2026-01-01T10:01:00.000Z', 'chromium');
      
      // MAPPED (Multiple executions of the same test case - Execution identity test)
      insertRes.run('RES-02', 'RUN-01', 'TC-01', 'TC-01', 'MAPPED', 'FAILED', 'Login success retry', 'test.ts', 1000, 1, '2026-01-01T10:02:00.000Z', 'firefox');
      
      // UNKNOWN_TEST_CASE_ID (test_case_id == null, parsed_test_case_id != null)
      insertRes.run('RES-03', 'RUN-01', null, 'TC-99', 'UNKNOWN_TEST_CASE_ID', 'FAILED', 'Unknown case', 'test.ts', 1000, 0, '2026-01-01T10:03:00.000Z', 'chromium');
      
      // UNMAPPED (test_case_id == null, parsed_test_case_id == null)
      insertRes.run('RES-04', 'RUN-01', null, null, 'UNMAPPED', 'PASSED', 'Unmapped case', 'test.ts', 1000, 0, '2026-01-01T10:04:00.000Z', 'chromium');
    });

    test('Pagination Contract and Deterministic ordering', async ({ request }) => {
      const response = await request.get(`http://localhost:${port}/api/test-cases?pageSize=1`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.items.length).toBe(1);
      expect(body.items[0].test_case_id).toBe('TC-01'); // test_case_id ASC
      expect(body.pagination).toEqual({
        page: 1,
        pageSize: 1,
        totalItems: 2,
        totalPages: 2
      });
    });

    test('Search Semantics (Escape wildcard % and _)', async ({ request }) => {
      // TC-01 title is "Login success % _"
      // If we search for "%", it should only match TC-01, not TC-02
      const res1 = await request.get(`http://localhost:${port}/api/test-cases?search=%25`); // %
      const body1 = await res1.json();
      expect(body1.items.length).toBe(1);
      expect(body1.items[0].test_case_id).toBe('TC-01');

      const res2 = await request.get(`http://localhost:${port}/api/test-cases?search=_`); // _
      const body2 = await res2.json();
      expect(body2.items.length).toBe(1);
      expect(body2.items[0].test_case_id).toBe('TC-01');
    });

    test('Dashboard Metrics compute from test_results', async ({ request }) => {
      const response = await request.get(`http://localhost:${port}/api/dashboard/summary`);
      const body = await response.json();
      
      expect(body.testCases.coveragePercent).toBe(50); // 1 out of 2

      expect(body.latestRun).toEqual(expect.objectContaining({
        runId: 'RUN-01',
        totalExecutions: 4,
        passed: 2,
        failed: 2,
        skipped: 0,
        mapped: 2,
        unknown: 1,
        unmapped: 1,
        uniqueMappedTestCaseIds: 1 // TC-01 executed twice, but it's 1 unique test case
      }));
    });

    test('Traceability & Execution Identity', async ({ request }) => {
      const response = await request.get(`http://localhost:${port}/api/runs/RUN-01/results`);
      const body = await response.json();
      expect(body.items.length).toBe(4);

      const res1 = body.items.find((r: any) => r.result_id === 'RES-01');
      const res2 = body.items.find((r: any) => r.result_id === 'RES-02');
      const res3 = body.items.find((r: any) => r.result_id === 'RES-03');
      const res4 = body.items.find((r: any) => r.result_id === 'RES-04');

      // MAPPED
      expect(res1.test_case_id).toBe('TC-01');
      expect(res1.traceability_status).toBe('MAPPED');
      
      // Execution Identity
      expect(res2.test_case_id).toBe('TC-01');
      expect(res2.result_id).not.toBe(res1.result_id); // Retrieved independently

      // UNKNOWN_TEST_CASE_ID
      expect(res3.test_case_id).toBeNull();
      expect(res3.parsed_test_case_id).toBe('TC-99');
      expect(res3.traceability_status).toBe('UNKNOWN_TEST_CASE_ID');

      // UNMAPPED
      expect(res4.test_case_id).toBeNull();
      expect(res4.parsed_test_case_id).toBeNull();
      expect(res4.traceability_status).toBe('UNMAPPED');
    });

    test('404 Endpoints', async ({ request }) => {
      let res = await request.get(`http://localhost:${port}/api/test-cases/NOT_EXIST`);
      expect(res.status()).toBe(404);
      expect((await res.json()).error.code).toBe('TEST_CASE_NOT_FOUND');

      res = await request.get(`http://localhost:${port}/api/runs/NOT_EXIST`);
      expect(res.status()).toBe(404);
      expect((await res.json()).error.code).toBe('RUN_NOT_FOUND');

      res = await request.get(`http://localhost:${port}/api/results/NOT_EXIST`);
      expect(res.status()).toBe(404);
      expect((await res.json()).error.code).toBe('RESULT_NOT_FOUND');
    });

    test('GET /api/test-cases/:testCaseId/results should return execution history', async ({ request }) => {
      // Not found test case
      const res404 = await request.get(`http://localhost:${port}/api/test-cases/TC-999/results`);
      expect(res404.status()).toBe(404);

      // TC-02 exists but no MAPPED results
      const resEmpty = await request.get(`http://localhost:${port}/api/test-cases/TC-02/results`);
      expect(resEmpty.status()).toBe(200);
      expect((await resEmpty.json()).items).toHaveLength(0);

      // TC-01 has 2 MAPPED results
      const response = await request.get(`http://localhost:${port}/api/test-cases/TC-01/results`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      
      expect(body.items).toHaveLength(2);
      expect(body.items[0].runId).toBe('RUN-01');
      expect(body.items[0].status).toBe('FAILED');
      expect(body.items[1].runId).toBe('RUN-01');
      expect(body.items[1].status).toBe('PASSED');

      // Filter by FAILED
      const resFailed = await request.get(`http://localhost:${port}/api/test-cases/TC-01/results?status=FAILED`);
      const bodyFailed = await resFailed.json();
      expect(bodyFailed.items).toHaveLength(1);
      expect(bodyFailed.items[0].resultId).toBe('RES-02');
    });
  });
});
