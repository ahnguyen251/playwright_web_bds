import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseConnection, openDatabase } from '../../database/sqlite';
import { initializeSchema } from '../../database/schema';
import { createApp } from '../../server/app';

test.describe('Dashboard Run Details UI', () => {
  let db: DatabaseConnection;
  let server: any;
  let baseUrl: string;
  let tempEvidenceRoot: string;

  test.beforeAll(async () => {
    db = openDatabase(':memory:');
    initializeSchema(db);

    tempEvidenceRoot = path.join(process.cwd(), '.temp-ui-test');
    if (!fs.existsSync(tempEvidenceRoot)) fs.mkdirSync(tempEvidenceRoot, { recursive: true });
    
    const validImg = path.join(tempEvidenceRoot, 'test-ui.png');
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    fs.writeFileSync(validImg, Buffer.from(validPngBase64, 'base64'));

    db.db.exec(`
      INSERT INTO test_cases (test_case_id, module, title, automation_status, created_at, updated_at) 
      VALUES ('TC-1', 'Mod', 'Test UI', 'AUTOMATED', '2023', '2023');

      INSERT INTO test_runs (run_id, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions, created_at)
      VALUES ('RUN-UI', '2023-01-01T00:00:00Z', '2023-01-01T00:00:01Z', 1000, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, '2023');
      
      INSERT INTO test_results (result_id, run_id, traceability_status, title, file_path, status, duration_ms, retry, error_message, error_stack, created_at)
      VALUES ('RES-UI', 'RUN-UI', 'MAPPED', 'Test UI Failure', 'test.ts', 'FAILED', 1000, 0, 'Error in test', 'Stack:\\n  at test.ts:1', '2023');

      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES ('EVD-UI', 'RES-UI', 'SCREENSHOT', '.temp-ui-test/test-ui.png', 'image/png', '2023');
    `);

    const app = createApp(db, tempEvidenceRoot);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    if (server) server.close();
    if (db) db.close();
    try { fs.rmSync(tempEvidenceRoot, { recursive: true, force: true }); } catch (e) {}
  });

  test('should display Run Details and drill down to Result Modal', async ({ page }) => {
    await page.goto(`${baseUrl}/#runs`);
    
    // Click on the Run
    await page.click('text=RUN-UI');
    
    // Verify hash changed to #runs/RUN-UI
    expect(page.url()).toContain('#runs/RUN-UI');
    
    // Check if Run details loaded
    await expect(page.locator('text=Test UI Failure')).toBeVisible();
    await expect(page.locator('td >> text=FAILED')).toBeVisible();

    // Click on View action
    await page.click('button:has-text("View")');
    
    // Check Modal
    await expect(page.locator('.modal-content')).toBeVisible();
    await expect(page.locator('#modal-title')).toHaveText('Result Details');
    
    // Check Error Info
    await expect(page.locator('text=Error in test')).toBeVisible();
    await expect(page.locator('text=Stack:')).toBeVisible();

    // Check Evidence
    const screenshot = page.locator('.evidence-item img');
    await expect(screenshot).toBeVisible();
    
    // Close Modal
    await page.click('.modal-close');
    await expect(page.locator('.modal-content')).toBeHidden();
  });
});
