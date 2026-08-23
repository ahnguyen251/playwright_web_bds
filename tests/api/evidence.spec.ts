import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseConnection, openDatabase } from '../../database/sqlite';
import { initializeSchema } from '../../database/schema';
import { createApp } from '../../server/app';

test.describe('Evidence API and Security Tests', () => {
  let db: DatabaseConnection;
  let server: any;
  let baseUrl: string;
  let testResultId = 'RES-EVD-TEST-001';
  let tempEvidenceRoot: string;
  let validScreenshotId = 'EVD-VALID-IMG';
  let invalidPathEvidenceId = 'EVD-INVALID-PATH';
  let missingFileEvidenceId = 'EVD-MISSING-FILE';
  let unsupportedMimeEvidenceId = 'EVD-UNSUPPORTED-MIME';
  let outsideRootEvidenceId = 'EVD-OUTSIDE-ROOT';

  test.beforeAll(async () => {
    db = openDatabase(':memory:');
    initializeSchema(db);

    const randomStr = Math.random().toString(36).substring(7);
    tempEvidenceRoot = path.join(process.cwd(), `.temp-evidence-test-${randomStr}`);
    if (!fs.existsSync(tempEvidenceRoot)) {
      fs.mkdirSync(tempEvidenceRoot, { recursive: true });
    }

    const validImgPathRelative = `.temp-evidence-test-${randomStr}/test-file.png`;
    const validImgPathAbsolute = path.resolve(process.cwd(), validImgPathRelative);
    fs.writeFileSync(validImgPathAbsolute, 'fake-png-data');

    const outsideFilePathAbsolute = path.join(process.cwd(), 'outside-file.png');
    fs.writeFileSync(outsideFilePathAbsolute, 'fake-outside-data');

    db.db.exec(`
      INSERT INTO test_cases (test_case_id, module, title, automation_status, created_at, updated_at) 
      VALUES ('TC-EVD', 'Auth', 'Evd Test', 'AUTOMATED', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

      INSERT INTO test_runs (run_id, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions, created_at)
      VALUES ('RUN-EVD', '2023-01-01T00:00:00Z', '2023-01-01T00:00:01Z', 1000, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, '2023-01-01T00:00:00Z');
      
      INSERT INTO test_results (result_id, run_id, traceability_status, title, file_path, status, duration_ms, retry, created_at)
      VALUES ('${testResultId}', 'RUN-EVD', 'UNMAPPED', 'Evidence Test', 'test.ts', 'FAILED', 1000, 0, '2023-01-01T00:00:00Z');

      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES ('${validScreenshotId}', '${testResultId}', 'SCREENSHOT', '${validImgPathRelative}', 'image/png', '2023-01-01T00:00:00Z');

      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES ('${invalidPathEvidenceId}', '${testResultId}', 'SCREENSHOT', '../outside-file.png', 'image/png', '2023-01-01T00:00:00Z');

      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES ('${missingFileEvidenceId}', '${testResultId}', 'SCREENSHOT', '.temp-evidence-test-${randomStr}/non-existent.png', 'image/png', '2023-01-01T00:00:00Z');

      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES ('${unsupportedMimeEvidenceId}', '${testResultId}', 'SCREENSHOT', '${validImgPathRelative}', 'text/html', '2023-01-01T00:00:00Z');
      
      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES ('${outsideRootEvidenceId}', '${testResultId}', 'SCREENSHOT', '${outsideFilePathAbsolute.replace(/\\/g, '/')}', 'image/png', '2023-01-01T00:00:00Z');
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
    try { fs.unlinkSync(path.join(process.cwd(), 'outside-file.png')); } catch (e) {}
  });

  test('GET /api/results/:resultId/evidence should return metadata without DB path', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/results/${testResultId}/evidence`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThan(0);
    
    const validEvd = body.items.find((i: any) => i.evidenceId === validScreenshotId);
    expect(validEvd).toBeDefined();
    expect(validEvd.contentUrl).toBe(`/api/evidence/${validScreenshotId}/content`);
    
    body.items.forEach((item: any) => {
      expect(item.path).toBeUndefined();
      expect(item.absolutePath).toBeUndefined();
      expect(item.physicalPath).toBeUndefined();
    });
  });

  test('GET /api/evidence/:evidenceId/content should stream valid evidence', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/evidence/${validScreenshotId}/content`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    expect(res.headers()['content-disposition']).toContain('inline; filename="test-file.png"');
    
    const buf = await res.body();
    expect(buf.toString()).toBe('fake-png-data');
  });

  test('GET /api/evidence/:evidenceId/content should reject missing file', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/evidence/${missingFileEvidenceId}/content`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('EVIDENCE_FILE_NOT_FOUND');
  });

  test('GET /api/evidence/:evidenceId/content should reject unsupported MIME type', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/evidence/${unsupportedMimeEvidenceId}/content`);
    const body = await res.json();
    if (res.status() !== 400) {
      console.log('KIỂM TRA MIME KHÔNG HỖ TRỢ THẤT BẠI. Body:', body);
    }
    expect(res.status()).toBe(400);
    expect(body.error.code).toBe('UNSUPPORTED_EVIDENCE_TYPE');
  });

  test('GET /api/evidence/:evidenceId/content should reject path traversal attempt', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/evidence/${invalidPathEvidenceId}/content`);
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_EVIDENCE_PATH');
  });

  test('GET /api/evidence/:evidenceId/content should reject absolute paths outside root', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/evidence/${outsideRootEvidenceId}/content`);
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_EVIDENCE_PATH');
  });

  test('GET /api/runs/:runId/results should return paginated test results', async ({ request }) => {
    const res = await request.get(`${baseUrl}/api/runs/RUN-EVD/results`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].result_id).toBe(testResultId);
    expect(body.pagination.totalItems).toBe(1);
  });
});
