import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { initializeSchema } from '../../../database/schema';
import { openDatabase } from '../../../database/sqlite';
import {
  parseCleanupEvidenceArguments,
  runEvidenceCleanup,
} from '../../../scripts/cleanup-evidence.js';
import { EvidenceArchiveService } from '../../../services/evidence/EvidenceArchiveService.js';
import type { CleanupTrashMove } from '../../../services/evidence/evidence-contracts.js';
import { createTestArtifactWorkspace } from '../../support/test-artifact-workspace';

const NOW = new Date('2026-08-27T00:00:00.000Z');
const OLD_FINISHED_AT = '2026-07-01T00:00:00.000Z';
const FRESH_FINISHED_AT = '2026-08-20T00:00:00.000Z';

interface SeededRun {
  readonly runId: string;
  readonly resultId: string;
  readonly evidenceId: string;
}

const silentLogger: Pick<Console, 'log' | 'warn' | 'error'> = {
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const seedRun = (
  databasePath: string,
  runId: string,
  finishedAt: string,
  suffix: string,
): SeededRun => {
  const connection = openDatabase(databasePath);
  try {
    initializeSchema(connection);
    const resultId = `RESULT-${suffix}`;
    const evidenceId = `EVIDENCE-${suffix}`;
    connection.db
      .prepare(
        `INSERT INTO test_runs (
          run_id, started_at, finished_at, duration_ms, total_executions,
          mapped_executions, unmapped_executions, unknown_test_case_id_executions,
          unique_mapped_test_case_ids_executed, passed_executions, failed_executions,
          skipped_executions, timed_out_executions, interrupted_executions,
          report_path, created_at
        ) VALUES (?, ?, ?, 1000, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, NULL, ?)`,
      )
      .run(runId, finishedAt, finishedAt, finishedAt);
    connection.db
      .prepare(
        `INSERT INTO test_results (
          result_id, run_id, test_case_id, parsed_test_case_id, traceability_status,
          playwright_test_id, title, file_path, project_name, status, expected_status,
          duration_ms, retry, error_message, error_stack, created_at
        ) VALUES (?, ?, NULL, NULL, 'UNMAPPED', ?, 'cleanup fixture',
          'tests/cleanup.spec.ts', 'framework', 'FAILED', 'PASSED', 1000, 0,
          'fixture error', NULL, ?)`,
      )
      .run(resultId, runId, `PW-${suffix}`, finishedAt);
    connection.db
      .prepare(
        `INSERT INTO test_evidence (
          evidence_id, result_id, type, path, content_type, created_at
        ) VALUES (?, ?, 'LOG', ?, 'text/markdown', ?)`,
      )
      .run(evidenceId, resultId, `${runId}/UNMAPPED/framework/execution/log-01.md`, finishedAt);
    return { runId, resultId, evidenceId };
  } finally {
    connection.close();
  }
};

const createFinalizedRun = async (evidenceRoot: string, runId: string): Promise<string> => {
  const runDirectory = path.join(evidenceRoot, runId);
  const evidencePath = path.join(runDirectory, 'UNMAPPED', 'framework', 'execution', 'log-01.md');
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, '# persistent evidence', 'utf8');
  await writeFile(path.join(runDirectory, 'run-result.json'), JSON.stringify({ RunId: runId }));
  return runDirectory;
};

const queryCounts = (databasePath: string, runId: string) => {
  const connection = openDatabase(databasePath);
  try {
    return {
      runs: (
        connection.db
          .prepare('SELECT COUNT(*) AS count FROM test_runs WHERE run_id = ?')
          .get(runId) as {
          count: number;
        }
      ).count,
      results: (
        connection.db
          .prepare('SELECT COUNT(*) AS count FROM test_results WHERE run_id = ?')
          .get(runId) as { count: number }
      ).count,
      evidence: (
        connection.db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM test_evidence evidence
             JOIN test_results result ON result.result_id = evidence.result_id
             WHERE result.run_id = ?`,
          )
          .get(runId) as { count: number }
      ).count,
    };
  } finally {
    connection.close();
  }
};

const runCleanup = (
  evidenceRoot: string,
  databasePath: string,
  mode: 'dry-run' | 'apply',
  archiveService?: EvidenceArchiveService,
) =>
  runEvidenceCleanup(
    { evidenceRoot, databasePath, days: 30, mode, now: () => NOW },
    { logger: silentLogger, ...(archiveService ? { archiveService } : {}) },
  );

test.describe('evidence cleanup CLI policy', () => {
  test('requires a positive integer day count and exactly one explicit mode', () => {
    expect(parseCleanupEvidenceArguments(['--days', '30', '--dry-run'])).toEqual({
      days: 30,
      mode: 'dry-run',
    });
    expect(parseCleanupEvidenceArguments(['--days', '7', '--apply'])).toEqual({
      days: 7,
      mode: 'apply',
    });

    for (const args of [
      [],
      ['--dry-run'],
      ['--days', '0', '--dry-run'],
      ['--days', '-1', '--apply'],
      ['--days', '1.5', '--apply'],
      ['--days', '30'],
      ['--days', '30', '--dry-run', '--apply'],
      ['--days', '30', '--apply', '--unknown'],
    ]) {
      expect(() => parseCleanupEvidenceArguments(args), args.join(' ')).toThrow();
    }
  });
});

test.describe('explicit evidence cleanup', () => {
  test('dry-run leaves finalized bytes and database rows unchanged', async () => {
    const workspace = await createTestArtifactWorkspace('evidence-cleanup-dry-run-');
    const databasePath = path.join(workspace.root, 'data', 'autotest.db');
    const runId = 'RUN-20260701000000-a001';
    try {
      seedRun(databasePath, runId, OLD_FINISHED_AT, 'DRY');
      const runDirectory = await createFinalizedRun(workspace.evidenceRoot, runId);
      const beforeManifest = await readFile(path.join(runDirectory, 'run-result.json'));

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'dry-run')).toBe(0);
      expect(queryCounts(databasePath, runId)).toEqual({ runs: 1, results: 1, evidence: 1 });
      expect(await readFile(path.join(runDirectory, 'run-result.json'))).toEqual(beforeManifest);
      expect(existsSync(path.join(workspace.evidenceRoot, '.trash'))).toBe(false);
    } finally {
      await workspace.cleanup();
    }
  });

  test('apply removes only an eligible whole finalized run and preserves run/result rows', async () => {
    const workspace = await createTestArtifactWorkspace('evidence-cleanup-apply-');
    const databasePath = path.join(workspace.root, 'data', 'autotest.db');
    const oldRun = 'RUN-20260701000000-a002';
    const freshRun = 'RUN-20260820000000-a003';
    const incompleteRun = 'RUN-20260701000000-a004';
    const unknownRun = 'RUN-20260701000000-a005';
    const siblingFile = path.join(workspace.outsideEvidenceRoot, 'keep.txt');
    try {
      seedRun(databasePath, oldRun, OLD_FINISHED_AT, 'OLD');
      seedRun(databasePath, freshRun, FRESH_FINISHED_AT, 'FRESH');
      seedRun(databasePath, incompleteRun, OLD_FINISHED_AT, 'INCOMPLETE');
      const oldDirectory = await createFinalizedRun(workspace.evidenceRoot, oldRun);
      const freshDirectory = await createFinalizedRun(workspace.evidenceRoot, freshRun);
      const incompleteDirectory = path.join(workspace.evidenceRoot, incompleteRun);
      const unknownDirectory = await createFinalizedRun(workspace.evidenceRoot, unknownRun);
      await mkdir(incompleteDirectory, { recursive: true });
      await writeFile(path.join(incompleteDirectory, 'partial.txt'), 'keep', 'utf8');
      await writeFile(siblingFile, 'keep sibling', 'utf8');

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'apply')).toBe(0);

      expect(existsSync(oldDirectory)).toBe(false);
      expect(queryCounts(databasePath, oldRun)).toEqual({ runs: 1, results: 1, evidence: 0 });
      expect(queryCounts(databasePath, freshRun)).toEqual({ runs: 1, results: 1, evidence: 1 });
      expect(queryCounts(databasePath, incompleteRun)).toEqual({
        runs: 1,
        results: 1,
        evidence: 1,
      });
      expect(existsSync(freshDirectory)).toBe(true);
      expect(existsSync(incompleteDirectory)).toBe(true);
      expect(existsSync(unknownDirectory)).toBe(true);
      expect(await readFile(siblingFile, 'utf8')).toBe('keep sibling');
      expect(await readdir(path.join(workspace.evidenceRoot, '.trash'))).toEqual([]);
    } finally {
      await workspace.cleanup();
    }
  });

  test('restores the finalized directory and rows when the DB transaction fails', async () => {
    const workspace = await createTestArtifactWorkspace('evidence-cleanup-db-failure-');
    const databasePath = path.join(workspace.root, 'data', 'autotest.db');
    const runId = 'RUN-20260701000000-a006';
    try {
      seedRun(databasePath, runId, OLD_FINISHED_AT, 'DBFAIL');
      const runDirectory = await createFinalizedRun(workspace.evidenceRoot, runId);
      const connection = openDatabase(databasePath);
      try {
        connection.db.exec(`
          CREATE TRIGGER reject_evidence_cleanup
          BEFORE DELETE ON test_evidence
          BEGIN
            SELECT RAISE(ABORT, 'cleanup rejected');
          END;
        `);
      } finally {
        connection.close();
      }

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'apply')).toBe(1);
      expect(existsSync(runDirectory)).toBe(true);
      expect(queryCounts(databasePath, runId)).toEqual({ runs: 1, results: 1, evidence: 1 });
      expect(await readdir(path.join(workspace.evidenceRoot, '.trash'))).toEqual([]);
    } finally {
      await workspace.cleanup();
    }
  });

  test('leaves hidden unreferenced trash and returns non-zero when purge fails after commit', async () => {
    const workspace = await createTestArtifactWorkspace('evidence-cleanup-purge-failure-');
    const databasePath = path.join(workspace.root, 'data', 'autotest.db');
    const runId = 'RUN-20260701000000-a007';
    class PurgeFailingArchiveService extends EvidenceArchiveService {
      public override purgeCleanupTrash(move: CleanupTrashMove): Promise<void> {
        void move;
        return Promise.reject(new Error('injected purge failure'));
      }
    }

    try {
      seedRun(databasePath, runId, OLD_FINISHED_AT, 'PURGEFAIL');
      const runDirectory = await createFinalizedRun(workspace.evidenceRoot, runId);
      const archiveService = new PurgeFailingArchiveService({
        evidenceRoot: workspace.evidenceRoot,
        randomNonce: () => 'purge-failure',
      });

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'apply', archiveService)).toBe(
        1,
      );
      expect(existsSync(runDirectory)).toBe(false);
      expect(queryCounts(databasePath, runId)).toEqual({ runs: 1, results: 1, evidence: 0 });
      expect(await readdir(path.join(workspace.evidenceRoot, '.trash'))).toEqual([
        `${runId}-purge-failure`,
      ]);
    } finally {
      await workspace.cleanup();
    }
  });

  test('reconciles an eligible missing directory only in explicit apply mode', async () => {
    const workspace = await createTestArtifactWorkspace('evidence-cleanup-missing-');
    const databasePath = path.join(workspace.root, 'data', 'autotest.db');
    const runId = 'RUN-20260701000000-a008';
    try {
      seedRun(databasePath, runId, OLD_FINISHED_AT, 'MISSING');

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'dry-run')).toBe(0);
      expect(queryCounts(databasePath, runId).evidence).toBe(1);

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'apply')).toBe(0);
      expect(queryCounts(databasePath, runId)).toEqual({ runs: 1, results: 1, evidence: 0 });
      expect(existsSync(path.join(workspace.evidenceRoot, '.trash'))).toBe(false);
    } finally {
      await workspace.cleanup();
    }
  });

  test('rejects unsafe run IDs and linked run directories without deleting outside targets', async () => {
    const workspace = await createTestArtifactWorkspace('evidence-cleanup-containment-');
    const databasePath = path.join(workspace.root, 'data', 'autotest.db');
    const unsafeRunId = '..';
    const linkedRunId = 'RUN-20260701000000-a009';
    const outsideDirectory = path.join(workspace.outsideEvidenceRoot, linkedRunId);
    const linkedDirectory = path.join(workspace.evidenceRoot, linkedRunId);
    try {
      seedRun(databasePath, unsafeRunId, OLD_FINISHED_AT, 'UNSAFE');
      seedRun(databasePath, linkedRunId, OLD_FINISHED_AT, 'LINKED');
      await createFinalizedRun(workspace.outsideEvidenceRoot, linkedRunId);
      await symlink(
        outsideDirectory,
        linkedDirectory,
        process.platform === 'win32' ? 'junction' : 'dir',
      );

      expect(await runCleanup(workspace.evidenceRoot, databasePath, 'apply')).toBe(1);
      expect(queryCounts(databasePath, unsafeRunId).evidence).toBe(1);
      expect(queryCounts(databasePath, linkedRunId).evidence).toBe(1);
      expect(existsSync(path.join(outsideDirectory, 'run-result.json'))).toBe(true);
      expect(existsSync(linkedDirectory)).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });
});
