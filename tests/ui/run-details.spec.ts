import { expect, test } from '@playwright/test';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { initializeSchema } from '../../database/schema';
import { openDatabase, type DatabaseConnection } from '../../database/sqlite';
import { createApp } from '../../server/app';
import { ReportingRunDetailsComponent } from '../../pages/components/ReportingRunDetailsComponent';
import {
  createTestArtifactWorkspace,
  type TestArtifactWorkspace,
} from '../support/test-artifact-workspace';

const RUN_ID = 'RUN-UI';
const mainResultId = 'RES-UI';
const expectedResultId = 'RES-UI-EXPECTED';
const unavailableResultId = 'RES-UI-UNAVAILABLE';
const retryResultId = 'RES-UI-RETRY';

test.describe('Dashboard Run Details UI', () => {
  let db: DatabaseConnection;
  let server: Server | undefined;
  let baseUrl: string;
  let workspace: TestArtifactWorkspace;
  let retryLogPath: string;

  const writePersistentFile = async (
    relativePath: string,
    contents: string | Buffer,
  ): Promise<string> => {
    const target = path.join(workspace.evidenceRoot, ...relativePath.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
    return target;
  };

  test.beforeAll(async () => {
    db = openDatabase(':memory:');
    initializeSchema(db);
    workspace = await createTestArtifactWorkspace('propify-run-details-');

    const prefix = `${RUN_ID}/UNMAPPED/chromium/execution`;
    const validPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const screenshotPath = `${prefix}/screenshot.png`;
    const videoPath = `${prefix}/video.webm`;
    const tracePath = `${prefix}/trace.zip`;
    const markdownPath = `${prefix}/error-context.md`;
    const otherPath = `${prefix}/context.json`;
    const unavailablePath = `${prefix}/historical-missing.md`;
    const unavailableTracePath = `${prefix}/historical-missing.zip`;
    const unavailableOtherPath = `${prefix}/historical-missing.json`;
    const retryPath = `${prefix}/retry.log`;

    await writePersistentFile(screenshotPath, Buffer.from(validPngBase64, 'base64'));
    await writePersistentFile(videoPath, 'fake-webm');
    await writePersistentFile(tracePath, 'fake-zip');
    await writePersistentFile(
      markdownPath,
      '# Error context\n\n<img src=x onerror="globalThis.__evidenceXss = true">',
    );
    await writePersistentFile(otherPath, '{"kind":"diagnostic"}');
    retryLogPath = await writePersistentFile(retryPath, 'retry content');

    db.db.exec(`
      INSERT INTO test_cases (test_case_id, module, title, automation_status, created_at, updated_at)
      VALUES ('TC-1', 'Mod', 'Test UI', 'AUTOMATED', '2023', '2023');

      INSERT INTO test_runs (run_id, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions, created_at)
      VALUES ('${RUN_ID}', '2023-01-01T00:00:00Z', '2023-01-01T00:00:01Z', 1000, 4, 2, 2, 0, 1, 0, 4, 0, 0, 0, '2023');
    `);

    const insertResult = db.db.prepare(`
      INSERT INTO test_results (result_id, run_id, traceability_status, title, file_path, project_name, status, expected_status, duration_ms, retry, error_message, error_stack, created_at)
      VALUES (?, ?, ?, ?, 'test.ts', 'chromium', 'FAILED', ?, 1000, 0, 'Error in test', 'Stack:\n  at test.ts:1', ?)
    `);
    insertResult.run(
      mainResultId,
      RUN_ID,
      'MAPPED',
      'Unexpected Business Failure',
      'passed',
      '2023-01-01T00:00:00Z',
    );
    insertResult.run(
      expectedResultId,
      RUN_ID,
      'MAPPED',
      'Expected Browser Failure',
      'failed',
      '2023-01-01T00:00:01Z',
    );
    insertResult.run(
      unavailableResultId,
      RUN_ID,
      'UNMAPPED',
      'Historical Missing Evidence',
      'passed',
      '2023-01-01T00:00:02Z',
    );
    insertResult.run(
      retryResultId,
      RUN_ID,
      'UNMAPPED',
      'Retry Log Failure',
      'passed',
      '2023-01-01T00:00:03Z',
    );

    const insertEvidence = db.db.prepare(`
      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Reverse priority order proves the UI sorts a copy instead of trusting DB order.
    insertEvidence.run('EVD-UI-OTHER', mainResultId, 'OTHER', otherPath, 'application/json', '1');
    insertEvidence.run('EVD-UI-LOG', mainResultId, 'LOG', markdownPath, 'text/markdown', '2');
    insertEvidence.run('EVD-UI-TRACE', mainResultId, 'TRACE', tracePath, 'application/zip', '3');
    insertEvidence.run('EVD-UI-VIDEO', mainResultId, 'VIDEO', videoPath, 'video/webm', '4');
    insertEvidence.run(
      'EVD-UI-SCREENSHOT',
      mainResultId,
      'SCREENSHOT',
      screenshotPath,
      'image/png',
      '5',
    );
    insertEvidence.run(
      'EVD-UI-UNAVAILABLE-LOG',
      unavailableResultId,
      'LOG',
      unavailablePath,
      'text/markdown',
      '6',
    );
    insertEvidence.run(
      'EVD-UI-UNAVAILABLE-TRACE',
      unavailableResultId,
      'TRACE',
      unavailableTracePath,
      'application/zip',
      '6.1',
    );
    insertEvidence.run(
      'EVD-UI-UNAVAILABLE-OTHER',
      unavailableResultId,
      'OTHER',
      unavailableOtherPath,
      'application/json',
      '6.2',
    );
    insertEvidence.run('EVD-UI-RETRY', retryResultId, 'LOG', retryPath, 'text/plain', '7');

    const app = createApp({ database: db, evidenceRoot: workspace.evidenceRoot });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${String((server?.address() as AddressInfo).port)}`;
        resolve();
      });
    });
  });

  test.beforeEach(async () => {
    await writeFile(retryLogPath, 'retry content');
  });

  test.afterAll(async () => {
    let firstFailure: unknown;
    try {
      if (server) {
        const currentServer = server;
        await new Promise<void>((resolve, reject) => {
          currentServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    } catch (error) {
      firstFailure = error;
    } finally {
      try {
        db.close();
      } catch (error) {
        firstFailure ??= error;
      } finally {
        try {
          await workspace.cleanup();
        } catch (error) {
          firstFailure ??= error;
        }
      }
    }

    if (firstFailure instanceof Error) throw firstFailure;
    if (firstFailure !== undefined) {
      throw new Error('Run details cleanup failed.', { cause: firstFailure });
    }
  });

  test('prioritizes evidence, preserves status and renders Markdown literally', async ({
    page,
  }) => {
    const details = new ReportingRunDetailsComponent(page);
    await details.open(baseUrl, RUN_ID, 'Unexpected Business Failure');

    await expect(details.statusBadge).toHaveText('FAILED');
    await expect(details.classificationLabels).toHaveText([
      'Unexpected failure',
      'Actual failed business execution',
    ]);

    await expect(details.primaryHeading).toBeVisible();
    await expect(details.supplementaryHeading).toBeVisible();
    const labels = await details.evidenceLabels.allTextContents();
    expect(labels.map((label) => label.split(' ', 1)[0])).toEqual([
      'SCREENSHOT',
      'VIDEO',
      'TRACE',
      'LOG',
      'OTHER',
    ]);

    await expect(details.primaryItems).toHaveCount(3);
    await expect(details.supplementaryItems).toHaveCount(2);
    await expect(details.screenshotImages).toHaveCount(1);

    await expect(details.link('TRACE (trace.zip)', 'Tải Xuống Trace (.zip)')).toHaveAttribute(
      'href',
      '/api/evidence/EVD-UI-TRACE/content',
    );
    await expect(details.link('OTHER (context.json)', 'Tải xuống')).toHaveAttribute(
      'href',
      '/api/evidence/EVD-UI-OTHER/content',
    );

    const logLabel = 'LOG (error-context.md)';
    await details.control(logLabel, 'Xem nội dung').click();
    await expect(details.content(logLabel, 'pre')).toHaveText(
      '# Error context\n\n<img src=x onerror="globalThis.__evidenceXss = true">',
    );
    await expect(details.content(logLabel, 'img')).toHaveCount(0);
    expect(await details.readXssMarker()).toBeUndefined();
  });

  test('opens screenshot details from the thumbnail and explicit control', async ({ page }) => {
    const details = new ReportingRunDetailsComponent(page);
    await details.open(baseUrl, RUN_ID, 'Unexpected Business Failure');

    const screenshotLabel = 'SCREENSHOT (screenshot.png)';
    const screenshot = details.content(screenshotLabel, 'img');
    await screenshot.click();

    await expect(details.screenshotPreview).toBeVisible();
    await expect(details.screenshotPreviewImage).toHaveAttribute(
      'src',
      '/api/evidence/EVD-UI-SCREENSHOT/content',
    );
    await expect(details.screenshotPreviewImage).toHaveAttribute('alt', 'screenshot.png');

    await page.keyboard.press('Escape');
    await expect(details.screenshotPreview).toBeHidden();
    await expect(details.modal).toBeVisible();

    const detailButton = details.control(screenshotLabel, 'Xem chi tiết');
    await detailButton.click();
    await expect(details.screenshotPreview).toBeVisible();
    await details.screenshotPreviewClose.click();
    await expect(details.screenshotPreview).toBeHidden();
    await expect(detailButton).toBeFocused();
  });

  test('keeps supplementary evidence and expanded LOG content aligned', async ({ page }) => {
    const details = new ReportingRunDetailsComponent(page);
    await details.open(baseUrl, RUN_ID, 'Unexpected Business Failure');

    const logLabel = 'LOG (error-context.md)';
    await details.control(logLabel, 'Xem nội dung').click();
    const supplementaryGrid = details.supplementaryGrid;
    const logItem = details.item(logLabel);
    const logContent = details.content(logLabel, 'pre');
    await expect(logContent).toBeVisible();
    const [gridBox, itemBox, contentBox] = await Promise.all([
      supplementaryGrid.boundingBox(),
      logItem.boundingBox(),
      logContent.boundingBox(),
    ]);

    expect(gridBox).not.toBeNull();
    expect(itemBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(itemBox?.width).toBeGreaterThanOrEqual((gridBox?.width ?? 0) - 2);
    expect(contentBox?.x).toBeGreaterThanOrEqual((itemBox?.x ?? 0) - 1);
    expect((contentBox?.x ?? 0) + (contentBox?.width ?? 0)).toBeLessThanOrEqual(
      (itemBox?.x ?? 0) + (itemBox?.width ?? 0) + 1,
    );
  });

  test('does not request unavailable evidence and shows one disabled state', async ({ page }) => {
    let unavailableContentRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/evidence/EVD-UI-UNAVAILABLE-')) {
        unavailableContentRequests += 1;
      }
    });

    const details = new ReportingRunDetailsComponent(page);
    await details.open(baseUrl, RUN_ID, 'Historical Missing Evidence');
    const unavailableLabel = 'LOG (historical-missing.md)';
    await expect(details.content(unavailableLabel, '.evidence-unavailable')).toHaveCount(1);
    await expect(details.control(unavailableLabel, 'Xem nội dung')).toBeDisabled();
    await expect(details.control(unavailableLabel, 'Tải xuống')).toBeDisabled();
    await expect(details.content(unavailableLabel, 'a')).toHaveCount(0);
    const unavailableTraceLabel = 'TRACE (historical-missing.zip)';
    await expect(details.content(unavailableTraceLabel, '.evidence-unavailable')).toHaveCount(1);
    await expect(details.control(unavailableTraceLabel, 'Tải Xuống Trace (.zip)')).toBeDisabled();
    await expect(details.content(unavailableTraceLabel, 'a')).toHaveCount(0);
    const unavailableOtherLabel = 'OTHER (historical-missing.json)';
    await expect(details.content(unavailableOtherLabel, '.evidence-unavailable')).toHaveCount(1);
    await expect(details.control(unavailableOtherLabel, 'Tải xuống')).toBeDisabled();
    await expect(details.content(unavailableOtherLabel, 'a')).toHaveCount(0);
    expect(unavailableContentRequests).toBe(0);
  });

  test('keeps one LOG error message across retries', async ({ page }) => {
    const details = new ReportingRunDetailsComponent(page);
    await details.open(baseUrl, RUN_ID, 'Retry Log Failure');
    const retryLabel = 'LOG (retry.log)';
    const viewButton = details.control(retryLabel, 'Xem nội dung');
    await unlink(retryLogPath);

    await viewButton.click();
    await expect(details.content(retryLabel, '.evidence-load-error')).toHaveCount(1);
    await details.control(retryLabel, 'Xem lại').click();
    await expect(details.content(retryLabel, '.evidence-load-error')).toHaveCount(1);
  });

  test('labels expected failure without replacing the authoritative FAILED badge', async ({
    page,
  }) => {
    const details = new ReportingRunDetailsComponent(page);
    await details.open(baseUrl, RUN_ID, 'Expected Browser Failure');

    await expect(details.statusBadge).toHaveText('FAILED');
    await expect(details.classificationLabels).toHaveText([
      'Expected failure',
      'Actual failed business execution',
    ]);
  });
});
