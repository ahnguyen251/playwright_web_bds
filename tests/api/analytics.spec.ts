import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { initializeSchema } from '../../database/schema';
import Database from 'better-sqlite3';
import { createApp } from '../../server/app';

let server: any;
let port: number;
let db: import('better-sqlite3').Database;
let dbPath: string;

test.describe('Test Case Analytics API Endpoints', () => {
  test.beforeAll(async () => {
    dbPath = path.resolve(__dirname, `../../.temp-analytics-test-${Math.random().toString(36).slice(2)}.db`);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    db = new Database(dbPath);
    initializeSchema({ db, close: () => db.close() });

    // Seed test cases
    db.prepare(`
      INSERT INTO test_cases (test_case_id, title, module, automation_status, created_at, updated_at)
      VALUES 
        ('TC-A', 'Flaky Case', 'Mod A', 'AUTOMATED', ?, ?),
        ('TC-B', 'Zero State Case', 'Mod A', 'AUTOMATED', ?, ?),
        ('TC-C', 'Multiple Projs Case', 'Mod A', 'AUTOMATED', ?, ?)
    `).run(new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    const nowStr = new Date().toISOString();
    db.prepare(`
      INSERT INTO test_runs (
        run_id, started_at, finished_at, duration_ms,
        total_executions, mapped_executions, unmapped_executions,
        unknown_test_case_id_executions, unique_mapped_test_case_ids_executed,
        passed_executions, failed_executions, skipped_executions,
        timed_out_executions, interrupted_executions, created_at
      ) VALUES ('RUN-1', ?, ?, 1000, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, ?)
    `).run(nowStr, nowStr, nowStr);

    // Seed results for TC-A (Flaky, 3 retries in same run)
    // Retry 0: FAILED, Retry 1: FAILED, Retry 2: PASSED
    const insertResult = db.prepare(`
      INSERT INTO test_results (
        result_id, run_id, test_case_id, parsed_test_case_id,
        traceability_status, playwright_test_id, title, file_path,
        project_name, status, expected_status, duration_ms, retry,
        error_message, error_stack, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Retry 0
    insertResult.run('RES-A-0', 'RUN-1', 'TC-A', 'TC-A', 'MAPPED', 'playwright-id-a', 'Flaky', 'a.ts', 'chromium', 'FAILED', 'passed', 1000, 0, null, null, nowStr);
    // Retry 1
    insertResult.run('RES-A-1', 'RUN-1', 'TC-A', 'TC-A', 'MAPPED', 'playwright-id-a', 'Flaky', 'a.ts', 'chromium', 'FAILED', 'passed', 1100, 1, null, null, nowStr);
    // Retry 2
    insertResult.run('RES-A-2', 'RUN-1', 'TC-A', 'TC-A', 'MAPPED', 'playwright-id-a', 'Flaky', 'a.ts', 'chromium', 'PASSED', 'passed', 1200, 2, null, null, nowStr);

    // Seed results for TC-C (Multiple projects, same run)
    insertResult.run('RES-C-chr', 'RUN-1', 'TC-C', 'TC-C', 'MAPPED', 'playwright-id-c-chr', 'Multi', 'c.ts', 'chromium', 'PASSED', 'passed', 500, 0, null, null, nowStr);
    insertResult.run('RES-C-ff', 'RUN-1', 'TC-C', 'TC-C', 'MAPPED', 'playwright-id-c-ff', 'Multi', 'c.ts', 'firefox', 'PASSED', 'passed', 600, 0, null, null, nowStr);
    insertResult.run('RES-C-wk', 'RUN-1', 'TC-C', 'TC-C', 'MAPPED', 'playwright-id-c-wk', 'Multi', 'c.ts', 'webkit', 'FAILED', 'passed', 700, 0, null, null, nowStr);

    const app = createApp({ db, close: () => db.close() });
    server = app.listen(0);
    port = server.address().port;
  });

  test.afterAll(() => {
    if (server) server.close();
    if (db) db.close();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  test('Should return 404 for unknown test case', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/test-cases/NOT-FOUND/analytics`);
    expect(res.status()).toBe(404);
  });

  test('Should return zero-state for test case with no mapped executions', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/test-cases/TC-B/analytics`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.summary.totalExecutions).toBe(0);
    expect(data.summary.passed).toBe(0);
    expect(data.summary.passRatePercent).toBe(0);
    expect(data.summary.retryFlakyRatePercent).toBe(0);
    expect(data.summary.averageDurationMs).toBeNull();
    expect(data.summary.latestStatus).toBeNull();
    expect(data.trend).toEqual([]);
  });

  test('Should correctly calculate retry flaky logical execution', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/test-cases/TC-A/analytics`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    
    // We have 1 logical execution consisting of 3 retries.
    expect(data.summary.totalExecutions).toBe(1);
    expect(data.summary.passed).toBe(1); // Final is PASSED
    expect(data.summary.failed).toBe(0);
    expect(data.summary.retryFlakyExecutions).toBe(1);
    expect(data.summary.passRatePercent).toBe(100);
    expect(data.summary.retryFlakyRatePercent).toBe(100);
    // Duration should be sum of attempts: 1000 + 1100 + 1200 = 3300
    expect(data.summary.averageDurationMs).toBe(3300);
    
    expect(data.trend.length).toBe(1);
    expect(data.trend[0].finalStatus).toBe('PASSED');
    expect(data.trend[0].retryFlaky).toBe(true);
    expect(data.trend[0].durationMs).toBe(3300);
  });

  test('Should correctly isolate logical executions across projects', async ({ request }) => {
    const res = await request.get(`http://localhost:${port}/api/test-cases/TC-C/analytics`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    
    // We have 3 logical executions in the same run (Chromium, Firefox, WebKit)
    expect(data.summary.totalExecutions).toBe(3);
    expect(data.summary.passed).toBe(2);
    expect(data.summary.failed).toBe(1);
    expect(data.summary.retryFlakyExecutions).toBe(0);
    expect(data.summary.passRatePercent).toBe(66.67);
    
    // Duration average: (500 + 600 + 700) / 3 = 600
    expect(data.summary.averageDurationMs).toBe(600);
    
    expect(data.trend.length).toBe(3);
  });
});
