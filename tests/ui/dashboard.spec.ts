import { test, expect } from '@playwright/test';
import { Server } from 'http';
import { createApp } from '../../server/app';
import { openDatabase, DatabaseConnection } from '../../database/sqlite';
import { initializeSchema } from '../../database/schema';

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

test.beforeEach(async () => {
  // Wipe DB
  conn.db.prepare('DELETE FROM test_evidence').run();
  conn.db.prepare('DELETE FROM test_results').run();
  conn.db.prepare('DELETE FROM test_runs').run();
  conn.db.prepare('DELETE FROM test_cases').run();
});

test.describe.serial('Dashboard UI Tests', () => {
  
  test('Dashboard loads successfully with empty state', async ({ page }) => {
    await page.goto(`http://localhost:${port}/`);
    await expect(page).toHaveTitle(/Automation Dashboard/);
    
    // Check nav highlights
    await expect(page.locator('#nav-summary')).toHaveClass(/active/);
    
    // Check metric cards for empty state
    await expect(page.locator('.metric-value').first()).toHaveText('0');
  });

  test('Hash navigation works correctly', async ({ page }) => {
    await page.goto(`http://localhost:${port}/`);
    
    // Go to Test Cases
    await page.click('#nav-test-cases');
    await expect(page.locator('#page-title')).toHaveText('Test Cases');
    
    // Empty state should show since DB is empty
    await expect(page.locator('text=No test cases found.')).toBeVisible();

    // Go to Runs
    await page.click('#nav-runs');
    await expect(page.locator('#page-title')).toHaveText('Test Runs');
    await expect(page.locator('text=No test runs found.')).toBeVisible();
  });

  test.describe('With Seeded Data', () => {
    test.beforeEach(() => {
      // Seed data
      const insertTc = conn.db.prepare('INSERT INTO test_cases (test_case_id, title, module, automation_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
      insertTc.run('TC-01', 'Login Check', 'Auth', 'AUTOMATED', '2026-01-01T10:00Z', '2026-01-01T10:00Z');
      insertTc.run('TC-02', 'Sign Up Check', 'Auth', 'NOT_AUTOMATED', '2026-01-01T10:00Z', '2026-01-01T10:00Z');

      const insertRun = conn.db.prepare('INSERT INTO test_runs (run_id, created_at, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertRun.run('RUN-01', '2026-01-01T10:00Z', '2026-01-01T10:00Z', '2026-01-01T10:01Z', 60000, 2, 2, 0, 0, 1, 1, 1, 0, 0, 0);

      const insertRes = conn.db.prepare('INSERT INTO test_results (result_id, run_id, test_case_id, parsed_test_case_id, traceability_status, status, title, file_path, duration_ms, retry, created_at, project_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertRes.run('RES-01', 'RUN-01', 'TC-01', 'TC-01', 'MAPPED', 'PASSED', 'Login Check', 'test.ts', 1000, 0, '2026-01-01T10:00Z', 'chromium');
    });

    test('Summary metrics render from API data', async ({ page }) => {
      await page.goto(`http://localhost:${port}/#summary`);
      
      // Wait for metrics to load
      await page.waitForSelector('.metrics-grid');
      
      const cards = page.locator('.metric-value');
      // Total Test Cases = 2
      await expect(cards.nth(0)).toHaveText('2');
      // Automated = 1
      await expect(cards.nth(1)).toHaveText('1');
      // Latest Run = RUN-01
      await expect(cards.nth(4)).toHaveText('RUN-01');
    });

    test('Test Case search triggers API-backed results', async ({ page }) => {
      await page.goto(`http://localhost:${port}/#test-cases`);
      
      // Wait for table to load
      await page.waitForSelector('table');
      
      // Both cases should be visible
      await expect(page.locator('tbody tr')).toHaveCount(2);

      // Search for TC-01
      await page.fill('input[placeholder="Search Test Cases..."]', 'Login');
      
      // Wait for debounced fetch and re-render
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.locator('tbody tr').first()).toContainText('TC-01');
    });
  });

  test('API failure renders an error state instead of crashing', async ({ page }) => {
    // Drop table to force API error
    conn.db.prepare('DROP TABLE test_cases').run();

    await page.goto(`http://localhost:${port}/#test-cases`);
    
    // Should render ErrorState
    await expect(page.locator('.error-text')).toBeVisible();
    await expect(page.locator('text=DATABASE_ERROR')).toBeVisible();

    // Recreate for next test
    initializeSchema(conn);
  });
});
