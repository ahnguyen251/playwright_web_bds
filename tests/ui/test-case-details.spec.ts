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

test.describe.serial('Test Case Details UI', () => {
  test.beforeEach(async () => {
    conn.db.prepare('DELETE FROM test_evidence').run();
    conn.db.prepare('DELETE FROM test_results').run();
    conn.db.prepare('DELETE FROM test_runs').run();
    conn.db.prepare('DELETE FROM test_cases').run();

    const nowStr = new Date().toISOString();
    
    // Insert dummy data
    conn.db.prepare(`
      INSERT INTO test_cases (test_case_id, module, automation_status, title, created_at, updated_at)
      VALUES 
      ('TC-UI-1', 'Auth', 'AUTOMATED', 'Login Test', ?, ?),
      ('TC-UI-2', 'Auth', 'AUTOMATED', 'Logout Test', ?, ?)
    `).run(nowStr, nowStr, nowStr, nowStr);

    conn.db.prepare(`
      INSERT INTO test_runs (run_id, started_at, finished_at, duration_ms, total_executions, 
        mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed,
        passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions, created_at)
      VALUES 
      ('run-1', ?, ?, 100, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, ?)
    `).run(nowStr, nowStr, nowStr);

    conn.db.prepare(`
      INSERT INTO test_results (result_id, run_id, test_case_id, traceability_status,
        title, file_path, status, duration_ms, retry, playwright_test_id, created_at)
      VALUES 
      ('res-1', 'run-1', 'TC-UI-1', 'MAPPED', 'Login Test', 'login.spec.ts', 'PASSED', 50, 0, 'pw-id-1', ?)
    `).run(nowStr);
  });

  test('Should navigate to Test Case Details and show history', async ({ page }) => {
    page.on('console', msg => console.log('CONSOLE TRÌNH DUYỆT:', msg.text()));
    page.on('pageerror', err => console.log('LỖI TRÌNH DUYỆT:', err.message));
    page.on('response', response => console.log('MẠNG TRÌNH DUYỆT:', response.url(), response.status()));
    await page.goto(`http://localhost:${port}/#test-cases`);

    // Click on TC-UI-1
    await page.click('text=TC-UI-1');
    
    // Wait for route change
    await page.waitForURL(/#test-cases\/TC-UI-1/);

    // Assert Metadata
    await expect(page.locator('#tc-title-id')).toHaveText('TC-UI-1');
    await expect(page.locator('text=Mô-đun:').locator('..')).toContainText('Auth');
    await expect(page.locator('text=Tổng Số Lần Chạy:').locator('..')).toContainText('1');

    await expect(page.locator('.analytics-panel')).toBeVisible();
    await expect(page.locator('.stat-label')).toHaveCount(6);
    await expect(page.locator('text=Tỷ Lệ Pass').locator('..')).toContainText('100%');
    await expect(page.locator('.trend-chart')).toBeVisible();
    await expect(page.locator('.trend-point')).toHaveCount(1);
    
    // Assert history
    const tbody = page.locator('table tbody');
    await expect(tbody.locator('tr')).toHaveCount(1);
    await expect(tbody.locator('tr').nth(0)).toContainText('run-1');
    await expect(tbody.locator('tr').nth(0)).toContainText('PASSED');

    // Open Modal
    await page.click('text=Xem Chi Tiết');
    await expect(page.locator('.modal-content')).toBeVisible();
    await expect(page.locator('#modal-title')).toHaveText('Chi Tiết Kết Quả');
  });

  test('Should handle unknown test case', async ({ page }) => {
    await page.goto(`http://localhost:${port}/#test-cases/NOT-FOUND-TC`);
    await expect(page.locator('.state-container')).toContainText('Không tìm thấy Test Case.');
  });

  test('AbortController debounce prevents stale overwrite', async ({ page }) => {
    // Intercept API calls to simulate network delay for the first query
    let slowRequestResolver: (value?: any) => void;
    const slowRequestPromise = new Promise((resolve) => { slowRequestResolver = resolve; });

    await page.route('**/api/test-cases?*', async route => {
      const url = route.request().url();
      if (url.includes('search=slow')) {
        await slowRequestPromise;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.goto(`http://localhost:${port}/#test-cases`);
    await page.waitForSelector('input[placeholder="Tìm kiếm Test Case..."]');

    // Type 'slow' -> triggers request A after 500ms
    await page.fill('input[placeholder="Tìm kiếm Test Case..."]', 'slow');
    // Wait 600ms to allow debounce
    await page.waitForTimeout(600);

    // Type 'fast' -> triggers request B after 500ms
    await page.fill('input[placeholder="Tìm kiếm Test Case..."]', 'TC-UI-1');
    await page.waitForTimeout(600);

    // Now resolve the slow request
    slowRequestResolver!();

    // Verify UI shows results for 'TC-UI-1' and NOT 'slow' (which should have been aborted or ignored)
    const tbody = page.locator('table tbody');
    await expect(tbody.locator('tr')).toHaveCount(1);
    await expect(tbody.locator('tr').nth(0)).toContainText('TC-UI-1');
    
    // There shouldn't be an ErrorState visible
    await expect(page.locator('.error-state')).toHaveCount(0);
  });
});
