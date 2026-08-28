import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initializeSchema } from '../../../database/schema';
import { openDatabase, type DatabaseConnection } from '../../../database/sqlite';
import { createTestArtifactWorkspace } from '../../support/test-artifact-workspace';

const silentLogger: Pick<Console, 'log' | 'warn' | 'error'> = {
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

interface TrackedOpen {
  readonly open: typeof openDatabase;
  readonly counts: () => { readonly opens: number; readonly closes: number };
}

const trackedMemoryOpen = (initializeBeforeOperation: boolean): TrackedOpen => {
  let opens = 0;
  let closes = 0;

  return {
    open: (requestedPath: string): DatabaseConnection => {
      expect(requestedPath).toBe('ignored.db');
      opens += 1;
      const connection = openDatabase(':memory:');
      if (initializeBeforeOperation) {
        initializeSchema(connection);
      }

      return {
        db: connection.db,
        close: () => {
          closes += 1;
          connection.close();
        },
      };
    },
    counts: () => ({ opens, closes }),
  };
};

const expectRunnerExport = (scriptPath: string, exportName: string): void => {
  const source = readFileSync(resolve(process.cwd(), scriptPath), 'utf8');
  expect(source, `${scriptPath} must define ${exportName} before it is imported`).toContain(
    `export const ${exportName}`,
  );
};

test.describe('database script runners', () => {
  test('runInitDatabase initializes an injected database and closes before returning', async () => {
    expectRunnerExport('scripts/init-db.ts', 'runInitDatabase');
    const { runInitDatabase } = await import('../../../scripts/init-db.js');
    const tracked = trackedMemoryOpen(false);

    expect(
      runInitDatabase('ignored.db', { openDatabase: tracked.open, logger: silentLogger }),
    ).toBe(0);
    expect(tracked.counts()).toEqual({ opens: 1, closes: 1 });
  });

  test('runImportRunResult imports validated JSON and closes before returning', async () => {
    expectRunnerExport('scripts/import-run-result.ts', 'runImportRunResult');
    const { runImportRunResult } = await import('../../../scripts/import-run-result.js');
    const tracked = trackedMemoryOpen(true);
    const workspace = await createTestArtifactWorkspace('database-script-import-');
    const evidenceRoot = workspace.evidenceRoot;
    const jsonPath = resolve(evidenceRoot, 'RUN-SCRIPT-TEST', 'run-result.json');
    try {
      mkdirSync(dirname(jsonPath), { recursive: true });
      writeFileSync(
        jsonPath,
        JSON.stringify({
          RunId: 'RUN-SCRIPT-TEST',
          StartedAt: '2026-08-25T00:00:00.000Z',
          FinishedAt: '2026-08-25T00:00:01.000Z',
          DurationMs: 1000,
          TotalExecutions: 0,
          MappedExecutions: 0,
          UnmappedExecutions: 0,
          UnknownTestCaseIdExecutions: 0,
          UniqueMappedTestCaseIdsExecuted: 0,
          PassedExecutions: 0,
          FailedExecutions: 0,
          SkippedExecutions: 0,
          TimedOutExecutions: 0,
          InterruptedExecutions: 0,
          Results: [],
        }),
      );

      expect(
        runImportRunResult(jsonPath, 'ignored.db', {
          evidenceRoot,
          openDatabase: tracked.open,
          logger: silentLogger,
        }),
      ).toBe(0);
      expect(tracked.counts()).toEqual({ opens: 1, closes: 1 });
    } finally {
      await workspace.cleanup();
    }
  });

  test('runEvidenceCleanup inspects an injected database and closes before returning', async () => {
    expectRunnerExport('scripts/cleanup-evidence.ts', 'runEvidenceCleanup');
    const { runEvidenceCleanup } = await import('../../../scripts/cleanup-evidence.js');
    const tracked = trackedMemoryOpen(true);
    const workspace = await createTestArtifactWorkspace('database-script-cleanup-');
    try {
      await expect(
        runEvidenceCleanup(
          {
            evidenceRoot: workspace.evidenceRoot,
            databasePath: 'ignored.db',
            days: 30,
            mode: 'dry-run',
            now: () => new Date('2026-08-27T00:00:00.000Z'),
          },
          { openDatabase: tracked.open, logger: silentLogger },
        ),
      ).resolves.toBe(0);
      expect(tracked.counts()).toEqual({ opens: 1, closes: 1 });
    } finally {
      await workspace.cleanup();
    }
  });

  test('runQueryVerification performs its read-only queries and closes before returning', async () => {
    expectRunnerExport('scripts/query-verification.ts', 'runQueryVerification');
    const { runQueryVerification } = await import('../../../scripts/query-verification.js');
    const tracked = trackedMemoryOpen(true);

    expect(
      runQueryVerification('ignored.db', { openDatabase: tracked.open, logger: silentLogger }),
    ).toBe(0);
    expect(tracked.counts()).toEqual({ opens: 1, closes: 1 });
  });

  test('runSyncTestCases syncs the canonical catalog and closes before returning', async () => {
    expectRunnerExport('scripts/sync-test-cases.ts', 'runSyncTestCases');
    const { runSyncTestCases } = await import('../../../scripts/sync-test-cases.js');
    const tracked = trackedMemoryOpen(true);

    expect(
      runSyncTestCases('ignored.db', { openDatabase: tracked.open, logger: silentLogger }),
    ).toBe(0);
    expect(tracked.counts()).toEqual({ opens: 1, closes: 1 });
  });

  test('scripts are import-only modules and never call process.exit', () => {
    for (const scriptPath of [
      'scripts/init-db.ts',
      'scripts/cleanup-evidence.ts',
      'scripts/import-run-result.ts',
      'scripts/query-verification.ts',
      'scripts/sync-test-cases.ts',
    ]) {
      const source = readFileSync(resolve(process.cwd(), scriptPath), 'utf8');
      expect(source).toContain('require.main === module');
      expect(source).not.toMatch(/process\.exit\s*\(/u);
    }
  });
});
