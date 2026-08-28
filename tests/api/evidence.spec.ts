import { expect, test } from '@playwright/test';
import { readFileSync, symlinkSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { initializeSchema } from '../../database/schema';
import { openDatabase, type DatabaseConnection } from '../../database/sqlite';
import { createApp } from '../../server/app';
import {
  createTestArtifactWorkspace,
  type TestArtifactWorkspace,
} from '../support/test-artifact-workspace';

const RUN_ID = 'RUN-EVD';
const testResultId = 'RES-EVD-TEST-001';
const volatileResultId = 'RES-EVD-VOLATILE';

interface EvidenceFixture {
  readonly id: string;
  readonly resultId?: string;
  readonly type: string;
  readonly recordPath: string;
  readonly contentType: string;
  readonly bytes?: string;
}

interface EvidenceMetadataItem {
  readonly evidenceId: string;
  readonly resultId: string;
  readonly type: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly contentUrl: string;
  readonly available: boolean;
  readonly unavailableReason?: 'FILE_MISSING' | 'OUTSIDE_ROOT' | 'UNSUPPORTED_TYPE';
  readonly path?: string;
  readonly absolutePath?: string;
  readonly physicalPath?: string;
}

test.describe('Evidence API and Security Tests', () => {
  let db: DatabaseConnection;
  let server: Server | undefined;
  let baseUrl: string;
  let workspace: TestArtifactWorkspace;
  let validEvidence: readonly EvidenceFixture[];
  let volatileRelativePath: string;

  const writeRelativeEvidence = async (relativePath: string, bytes: string): Promise<void> => {
    const target = path.join(workspace.evidenceRoot, ...relativePath.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  };

  test.beforeAll(async () => {
    db = openDatabase(':memory:');
    initializeSchema(db);
    workspace = await createTestArtifactWorkspace('propify-evidence-');

    const prefix = `${RUN_ID}/UNMAPPED/chromium/execution`;
    const legacyAbsolutePath = path.join(workspace.evidenceRoot, 'legacy-screenshot.png');
    await writeFile(legacyAbsolutePath, 'legacy-png-bytes');

    validEvidence = [
      {
        id: 'EVD-PNG',
        type: 'SCREENSHOT',
        recordPath: `${prefix}/screenshot.png`,
        contentType: 'image/png',
        bytes: 'png-bytes',
      },
      {
        id: 'EVD-JPEG',
        type: 'SCREENSHOT',
        recordPath: `${prefix}/screenshot.jpeg`,
        contentType: 'image/jpeg',
        bytes: 'jpeg-bytes',
      },
      {
        id: 'EVD-VIDEO',
        type: 'VIDEO',
        recordPath: `${prefix}/video.webm`,
        contentType: 'video/webm',
        bytes: 'webm-bytes',
      },
      {
        id: 'EVD-TRACE',
        type: 'TRACE',
        recordPath: `${prefix}/trace.zip`,
        contentType: 'application/zip',
        bytes: 'zip-bytes',
      },
      {
        id: 'EVD-TEXT',
        type: 'LOG',
        recordPath: `${prefix}/browser.log`,
        contentType: 'text/plain',
        bytes: 'plain log content',
      },
      {
        id: 'EVD-MARKDOWN',
        type: 'LOG',
        recordPath: `${prefix}/error-context.md`,
        contentType: 'text/markdown',
        bytes: '# Error context\n\n<img src=x onerror=alert(1)>',
      },
      {
        id: 'EVD-JSON',
        type: 'OTHER',
        recordPath: `${prefix}/context.json`,
        contentType: 'application/json',
        bytes: '{"reason":"failed"}',
      },
      {
        id: 'EVD-CSV',
        type: 'OTHER',
        recordPath: `${prefix}/context.csv`,
        contentType: 'text/csv',
        bytes: 'key,value\nreason,failed',
      },
      {
        id: 'EVD-LEGACY-ABSOLUTE',
        type: 'SCREENSHOT',
        recordPath: legacyAbsolutePath,
        contentType: 'image/png',
        bytes: 'legacy-png-bytes',
      },
    ];

    for (const evidence of validEvidence) {
      if (!path.isAbsolute(evidence.recordPath)) {
        await writeRelativeEvidence(evidence.recordPath, evidence.bytes ?? '');
      }
    }

    const outsideFile = path.join(workspace.outsideEvidenceRoot, 'outside.png');
    await writeFile(outsideFile, 'outside-bytes');
    const linkedDirectory = path.join(workspace.evidenceRoot, RUN_ID, 'linked');
    await mkdir(path.dirname(linkedDirectory), { recursive: true });
    symlinkSync(
      workspace.outsideEvidenceRoot,
      linkedDirectory,
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    volatileRelativePath = `${prefix}/volatile.log`;
    await writeRelativeEvidence(volatileRelativePath, 'volatile log');
    await writeRelativeEvidence(`${prefix}/extensionless`, 'extensionless bytes');

    db.db.exec(`
      INSERT INTO test_cases (test_case_id, module, title, automation_status, created_at, updated_at)
      VALUES ('TC-EVD', 'Auth', 'Evd Test', 'AUTOMATED', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z');

      INSERT INTO test_runs (run_id, started_at, finished_at, duration_ms, total_executions, mapped_executions, unmapped_executions, unknown_test_case_id_executions, unique_mapped_test_case_ids_executed, passed_executions, failed_executions, skipped_executions, timed_out_executions, interrupted_executions, created_at)
      VALUES ('${RUN_ID}', '2023-01-01T00:00:00Z', '2023-01-01T00:00:01Z', 1000, 2, 0, 2, 0, 0, 0, 2, 0, 0, 0, '2023-01-01T00:00:00Z');

      INSERT INTO test_results (result_id, run_id, traceability_status, title, file_path, status, duration_ms, retry, created_at)
      VALUES ('${testResultId}', '${RUN_ID}', 'UNMAPPED', 'Evidence Test', 'test.ts', 'FAILED', 1000, 0, '2023-01-01T00:00:00Z');

      INSERT INTO test_results (result_id, run_id, traceability_status, title, file_path, status, duration_ms, retry, created_at)
      VALUES ('${volatileResultId}', '${RUN_ID}', 'UNMAPPED', 'Volatile Evidence Test', 'test.ts', 'FAILED', 1000, 0, '2023-01-01T00:00:00Z');
    `);

    const insertEvidence = db.db.prepare(`
      INSERT INTO test_evidence (evidence_id, result_id, type, path, content_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const [index, evidence] of validEvidence.entries()) {
      insertEvidence.run(
        evidence.id,
        evidence.resultId ?? testResultId,
        evidence.type,
        evidence.recordPath,
        evidence.contentType,
        `2023-01-01T00:00:${String(index).padStart(2, '0')}Z`,
      );
    }

    const invalidFixtures: readonly EvidenceFixture[] = [
      {
        id: 'EVD-MISSING',
        type: 'SCREENSHOT',
        recordPath: `${prefix}/missing.png`,
        contentType: 'image/png',
      },
      {
        id: 'EVD-OUTSIDE-RELATIVE',
        type: 'SCREENSHOT',
        recordPath: '../outside-evidence/outside.png',
        contentType: 'image/png',
      },
      {
        id: 'EVD-OUTSIDE-ABSOLUTE',
        type: 'SCREENSHOT',
        recordPath: outsideFile,
        contentType: 'image/png',
      },
      {
        id: 'EVD-SYMLINK-ESCAPE',
        type: 'SCREENSHOT',
        recordPath: `${RUN_ID}/linked/outside.png`,
        contentType: 'image/png',
      },
      {
        id: 'EVD-UNSUPPORTED',
        type: 'SCREENSHOT',
        recordPath: `${prefix}/screenshot.png`,
        contentType: 'text/html',
      },
      {
        id: 'EVD-EXTENSIONLESS',
        type: 'SCREENSHOT',
        recordPath: `${prefix}/extensionless`,
        contentType: 'image/png',
      },
    ];
    for (const [index, evidence] of invalidFixtures.entries()) {
      insertEvidence.run(
        evidence.id,
        testResultId,
        evidence.type,
        evidence.recordPath,
        evidence.contentType,
        `2023-01-01T00:01:${String(index).padStart(2, '0')}Z`,
      );
    }
    insertEvidence.run(
      'EVD-VOLATILE',
      volatileResultId,
      'LOG',
      volatileRelativePath,
      'text/plain',
      '2023-01-01T00:02:00Z',
    );

    const app = createApp({ database: db, evidenceRoot: workspace.evidenceRoot });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${String((server?.address() as AddressInfo).port)}`;
        resolve();
      });
    });
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
      throw new Error('Evidence API cleanup failed.', { cause: firstFailure });
    }
  });

  test('metadata adds availability without exposing a physical path', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/results/${testResultId}/evidence`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { items: EvidenceMetadataItem[] };

    const byId = new Map(body.items.map((item) => [item.evidenceId, item]));
    for (const evidence of validEvidence) {
      expect(byId.get(evidence.id)).toMatchObject({
        evidenceId: evidence.id,
        contentUrl: `/api/evidence/${evidence.id}/content`,
        available: true,
      });
      expect(byId.get(evidence.id)?.unavailableReason).toBeUndefined();
    }
    expect(byId.get('EVD-MISSING')).toMatchObject({
      available: false,
      unavailableReason: 'FILE_MISSING',
    });
    for (const evidenceId of [
      'EVD-OUTSIDE-RELATIVE',
      'EVD-OUTSIDE-ABSOLUTE',
      'EVD-SYMLINK-ESCAPE',
    ]) {
      expect(byId.get(evidenceId)).toMatchObject({
        available: false,
        unavailableReason: 'OUTSIDE_ROOT',
      });
    }
    for (const evidenceId of ['EVD-UNSUPPORTED', 'EVD-EXTENSIONLESS']) {
      expect(byId.get(evidenceId)).toMatchObject({
        available: false,
        unavailableReason: 'UNSUPPORTED_TYPE',
      });
    }

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(workspace.evidenceRoot);
    expect(serialized).not.toContain(workspace.outsideEvidenceRoot);
    for (const item of body.items) {
      expect(item.path).toBeUndefined();
      expect(item.absolutePath).toBeUndefined();
      expect(item.physicalPath).toBeUndefined();
    }
  });

  for (const evidence of [
    { id: 'EVD-PNG', mime: 'image/png', disposition: 'inline', bytes: 'png-bytes' },
    { id: 'EVD-JPEG', mime: 'image/jpeg', disposition: 'inline', bytes: 'jpeg-bytes' },
    { id: 'EVD-VIDEO', mime: 'video/webm', disposition: 'inline', bytes: 'webm-bytes' },
    { id: 'EVD-TRACE', mime: 'application/zip', disposition: 'attachment', bytes: 'zip-bytes' },
    { id: 'EVD-TEXT', mime: 'text/plain', disposition: 'inline', bytes: 'plain log content' },
    {
      id: 'EVD-MARKDOWN',
      mime: 'text/markdown',
      disposition: 'inline',
      bytes: '# Error context\n\n<img src=x onerror=alert(1)>',
    },
    {
      id: 'EVD-JSON',
      mime: 'application/json',
      disposition: 'attachment',
      bytes: '{"reason":"failed"}',
    },
    {
      id: 'EVD-CSV',
      mime: 'text/csv',
      disposition: 'attachment',
      bytes: 'key,value\nreason,failed',
    },
    {
      id: 'EVD-LEGACY-ABSOLUTE',
      mime: 'image/png',
      disposition: 'inline',
      bytes: 'legacy-png-bytes',
    },
  ] as const) {
    test(`streams ${evidence.id} with exact bytes and safe headers`, async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/evidence/${evidence.id}/content`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe(evidence.mime);
      expect(response.headers()['content-disposition']).toContain(`${evidence.disposition};`);
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
      expect((await response.body()).toString()).toBe(evidence.bytes);
    });
  }

  for (const rejection of [
    { id: 'EVD-MISSING', status: 404, code: 'EVIDENCE_FILE_NOT_FOUND' },
    { id: 'EVD-OUTSIDE-RELATIVE', status: 403, code: 'INVALID_EVIDENCE_PATH' },
    { id: 'EVD-OUTSIDE-ABSOLUTE', status: 403, code: 'INVALID_EVIDENCE_PATH' },
    { id: 'EVD-SYMLINK-ESCAPE', status: 403, code: 'INVALID_EVIDENCE_PATH' },
    { id: 'EVD-UNSUPPORTED', status: 400, code: 'UNSUPPORTED_EVIDENCE_TYPE' },
    { id: 'EVD-EXTENSIONLESS', status: 400, code: 'UNSUPPORTED_EVIDENCE_TYPE' },
  ] as const) {
    test(`returns a safe error for ${rejection.id}`, async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/evidence/${rejection.id}/content`);
      expect(response.status()).toBe(rejection.status);
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe(rejection.code);
      expect(JSON.stringify(body)).not.toContain(workspace.evidenceRoot);
      expect(JSON.stringify(body)).not.toContain(workspace.outsideEvidenceRoot);
    });
  }

  test('stream revalidates availability after metadata was returned', async ({ request }) => {
    const target = path.join(workspace.evidenceRoot, ...volatileRelativePath.split('/'));
    const metadataResponse = await request.get(
      `${baseUrl}/api/results/${volatileResultId}/evidence`,
    );
    const metadata = (await metadataResponse.json()) as { items: EvidenceMetadataItem[] };
    expect(metadata.items[0]).toMatchObject({ available: true });

    await unlink(target);

    const contentResponse = await request.get(`${baseUrl}/api/evidence/EVD-VOLATILE/content`);
    expect(contentResponse.status()).toBe(404);
    const body = (await contentResponse.json()) as { error: { code: string } };
    expect(body.error.code).toBe('EVIDENCE_FILE_NOT_FOUND');
  });

  test('GET /api/runs/:runId/results keeps the existing response shape', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/runs/${RUN_ID}/results`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      items: { result_id: string }[];
      pagination: { totalItems: number };
    };
    expect(body.items).toHaveLength(2);
    expect(body.pagination.totalItems).toBe(2);
  });

  test('EvidenceService source does not log physical paths or records', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'server/services/EvidenceService.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/console\.(?:log|warn|error)\s*\(/u);
  });
});
