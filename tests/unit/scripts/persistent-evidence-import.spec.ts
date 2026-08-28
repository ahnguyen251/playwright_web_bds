import { expect, test } from '@playwright/test';
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { initializeSchema } from '../../../database/schema';
import { TestRunRepository } from '../../../database/repositories/TestRunRepository';
import { openDatabase, type DatabaseConnection } from '../../../database/sqlite';
import { runImportRunResult } from '../../../scripts/import-run-result';
import {
  createTestArtifactWorkspace,
  type TestArtifactWorkspace,
} from '../../support/test-artifact-workspace';
import type { TestEvidence, TestRunResult } from '../../../types/test-result.types';

const RUN_ID = 'RUN-20260827090000-a1b2';

const silentLogger: Pick<Console, 'log' | 'warn' | 'error'> = {
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const createRunResult = (evidence: readonly TestEvidence[] = []): TestRunResult => ({
  RunId: RUN_ID,
  StartedAt: '2026-08-27T02:00:00.000Z',
  FinishedAt: '2026-08-27T02:00:01.000Z',
  DurationMs: 1000,
  TotalExecutions: evidence.length > 0 ? 1 : 0,
  MappedExecutions: 0,
  UnmappedExecutions: evidence.length > 0 ? 1 : 0,
  UnknownTestCaseIdExecutions: 0,
  UniqueMappedTestCaseIdsExecuted: 0,
  PassedExecutions: 0,
  FailedExecutions: evidence.length > 0 ? 1 : 0,
  SkippedExecutions: 0,
  TimedOutExecutions: 0,
  InterruptedExecutions: 0,
  Results:
    evidence.length > 0
      ? [
          {
            TestCaseId: null,
            TraceabilityStatus: 'UNMAPPED',
            PlaywrightTestId: 'playwright-test-id',
            Title: 'Persistent evidence import',
            FilePath: 'tests/example.spec.ts',
            ProjectName: 'chromium',
            Status: 'FAILED',
            ExpectedStatus: 'passed',
            DurationMs: 1000,
            Retry: 0,
            Evidence: evidence,
          },
        ]
      : [],
});

const writeJson = (filePath: string, runResult: TestRunResult): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(runResult));
};

const writeEvidence = (evidenceRoot: string, relativePath: string): void => {
  const target = path.resolve(evidenceRoot, ...relativePath.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, 'evidence');
};

const finalizedManifestPath = (workspace: TestArtifactWorkspace): string =>
  path.join(workspace.evidenceRoot, RUN_ID, 'run-result.json');

const initializeDatabase = (databasePath: string): void => {
  const connection = openDatabase(databasePath);
  try {
    initializeSchema(connection);
  } finally {
    connection.close();
  }
};

interface TrackedOpen {
  readonly open: (databasePath: string) => DatabaseConnection;
  readonly count: () => number;
}

const trackedOpen = (): TrackedOpen => {
  let count = 0;
  return {
    open: () => {
      count += 1;
      return openDatabase(':memory:');
    },
    count: () => count,
  };
};

const expectRejectedBeforeDatabase = (manifestPath: string, evidenceRoot: string): void => {
  const tracked = trackedOpen();
  expect(
    runImportRunResult(manifestPath, 'ignored.db', {
      evidenceRoot,
      logger: silentLogger,
      openDatabase: tracked.open,
    }),
  ).toBe(1);
  expect(tracked.count()).toBe(0);
};

test.describe('persistent evidence import gate', () => {
  let workspace: TestArtifactWorkspace;

  test.beforeEach(async () => {
    workspace = await createTestArtifactWorkspace('persistent-evidence-import-');
  });

  test.afterEach(async () => {
    await workspace.cleanup();
  });

  test('imports a finalized manifest and stores persistent POSIX paths verbatim', () => {
    const screenshotPath = `${RUN_ID}/UNMAPPED/chromium/execution/screenshot-01.png`;
    const markdownPath = `${RUN_ID}/UNMAPPED/chromium/execution/error-context-01.md`;
    const evidence: readonly TestEvidence[] = [
      { type: 'SCREENSHOT', path: screenshotPath, contentType: 'image/png' },
      { type: 'LOG', path: markdownPath, contentType: 'text/markdown' },
    ];
    writeEvidence(workspace.evidenceRoot, screenshotPath);
    writeEvidence(workspace.evidenceRoot, markdownPath);
    const manifestPath = finalizedManifestPath(workspace);
    writeJson(manifestPath, createRunResult(evidence));
    const databasePath = path.join(workspace.root, 'autotest.db');
    initializeDatabase(databasePath);

    expect(
      runImportRunResult(manifestPath, databasePath, {
        evidenceRoot: workspace.evidenceRoot,
        logger: silentLogger,
      }),
    ).toBe(0);

    const connection = openDatabase(databasePath);
    try {
      const rows = connection.db
        .prepare('SELECT type, path, content_type FROM test_evidence ORDER BY type')
        .all() as { type: string; path: string; content_type: string }[];
      expect(rows).toEqual([
        { type: 'LOG', path: markdownPath, content_type: 'text/markdown' },
        { type: 'SCREENSHOT', path: screenshotPath, content_type: 'image/png' },
      ]);
    } finally {
      connection.close();
    }
  });

  test('accepts a finalized run with zero evidence and preserves run-id idempotency', () => {
    const manifestPath = finalizedManifestPath(workspace);
    writeJson(manifestPath, createRunResult());
    const databasePath = path.join(workspace.root, 'autotest.db');
    initializeDatabase(databasePath);

    const dependencies = { evidenceRoot: workspace.evidenceRoot, logger: silentLogger };
    expect(runImportRunResult(manifestPath, databasePath, dependencies)).toBe(0);
    expect(runImportRunResult(manifestPath, databasePath, dependencies)).toBe(0);

    const connection = openDatabase(databasePath);
    try {
      const row = connection.db.prepare('SELECT COUNT(*) AS count FROM test_runs').get() as {
        count: number;
      };
      expect(row.count).toBe(1);
    } finally {
      connection.close();
    }
  });

  test('repository stores the caller-validated evidence path without cwd normalization', () => {
    const connection = openDatabase(':memory:');
    initializeSchema(connection);
    const suppliedPath = path.resolve(workspace.root, 'caller-validated.png');
    try {
      const repository = new TestRunRepository(connection);
      const result = repository.importRunResult(
        createRunResult([{ type: 'SCREENSHOT', path: suppliedPath, contentType: 'image/png' }]),
      );
      expect(result.status).toBe('SUCCESS');
      const stored = connection.db.prepare('SELECT path FROM test_evidence').get() as {
        path: string;
      };
      expect(stored.path).toBe(suppliedPath);
    } finally {
      connection.close();
    }
  });

  for (const location of [
    'staging',
    'trash',
    'test-results',
    'outside-root',
    'wrong-parent',
  ] as const) {
    test(`rejects a manifest from ${location} before opening the database`, () => {
      const manifestPath =
        location === 'staging'
          ? path.join(workspace.evidenceRoot, '.staging', `${RUN_ID}-nonce`, 'run-result.json')
          : location === 'trash'
            ? path.join(workspace.evidenceRoot, '.trash', `${RUN_ID}-nonce`, 'run-result.json')
            : location === 'test-results'
              ? path.join(workspace.transientRoot, RUN_ID, 'run-result.json')
              : location === 'outside-root'
                ? path.join(workspace.outsideEvidenceRoot, RUN_ID, 'run-result.json')
                : path.join(workspace.evidenceRoot, 'RUN-WRONG-PARENT', 'run-result.json');
      writeJson(manifestPath, createRunResult());
      expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);
    });
  }

  test('rejects absolute, UNC, traversal, wrong-run and transient evidence paths', () => {
    const cases: readonly string[] = [
      path.join(workspace.root, 'absolute.png'),
      '\\\\server\\share\\screenshot.png',
      `${RUN_ID}/nested/../screenshot.png`,
      `RUN-OTHER/UNMAPPED/screenshot.png`,
      `${RUN_ID}/test-results/screenshot.png`,
      `${RUN_ID}\\UNMAPPED\\screenshot.png`,
    ];

    for (const evidencePath of cases) {
      const manifestPath = finalizedManifestPath(workspace);
      writeJson(
        manifestPath,
        createRunResult([{ type: 'SCREENSHOT', path: evidencePath, contentType: 'image/png' }]),
      );
      expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);
    }
  });

  test('rejects test-results even when it is injected as the evidence root', () => {
    const manifestPath = path.join(workspace.transientRoot, RUN_ID, 'run-result.json');
    writeJson(manifestPath, createRunResult());

    expectRejectedBeforeDatabase(manifestPath, workspace.transientRoot);
  });

  test('rejects missing files and directories before opening the database', () => {
    const missingPath = `${RUN_ID}/UNMAPPED/missing.png`;
    const manifestPath = finalizedManifestPath(workspace);
    writeJson(
      manifestPath,
      createRunResult([{ type: 'SCREENSHOT', path: missingPath, contentType: 'image/png' }]),
    );
    expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);

    const directoryPath = `${RUN_ID}/UNMAPPED/directory.png`;
    mkdirSync(path.join(workspace.evidenceRoot, ...directoryPath.split('/')), { recursive: true });
    writeJson(
      manifestPath,
      createRunResult([{ type: 'SCREENSHOT', path: directoryPath, contentType: 'image/png' }]),
    );
    expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);
  });

  test('rejects MIME, extension and evidence-role mismatches before opening the database', () => {
    const cases: readonly TestEvidence[] = [
      { type: 'SCREENSHOT', path: `${RUN_ID}/UNMAPPED/mismatch.md`, contentType: 'image/png' },
      { type: 'LOG', path: `${RUN_ID}/UNMAPPED/role.png`, contentType: 'image/png' },
      { type: 'OTHER', path: `${RUN_ID}/UNMAPPED/unsupported.html`, contentType: 'text/html' },
      { type: 'SCREENSHOT', path: `${RUN_ID}/UNMAPPED/extensionless`, contentType: 'image/png' },
    ];

    for (const evidence of cases) {
      writeEvidence(workspace.evidenceRoot, evidence.path);
      const manifestPath = finalizedManifestPath(workspace);
      writeJson(manifestPath, createRunResult([evidence]));
      expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);
    }
  });

  test('rejects a symlink escape from the evidence root before opening the database', () => {
    const outsideFile = path.join(workspace.outsideEvidenceRoot, 'escape.png');
    writeFileSync(outsideFile, 'outside');
    const linkPath = path.join(workspace.evidenceRoot, RUN_ID, 'linked');
    mkdirSync(path.dirname(linkPath), { recursive: true });
    symlinkSync(
      realpathSync(workspace.outsideEvidenceRoot),
      linkPath,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const evidencePath = `${RUN_ID}/linked/escape.png`;
    const manifestPath = finalizedManifestPath(workspace);
    writeJson(
      manifestPath,
      createRunResult([{ type: 'SCREENSHOT', path: evidencePath, contentType: 'image/png' }]),
    );

    expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);
  });

  test('preflights every evidence item so one missing file prevents all database writes', () => {
    const validPath = `${RUN_ID}/UNMAPPED/valid.png`;
    const missingPath = `${RUN_ID}/UNMAPPED/missing.md`;
    writeEvidence(workspace.evidenceRoot, validPath);
    const manifestPath = finalizedManifestPath(workspace);
    writeJson(
      manifestPath,
      createRunResult([
        { type: 'SCREENSHOT', path: validPath, contentType: 'image/png' },
        { type: 'LOG', path: missingPath, contentType: 'text/markdown' },
      ]),
    );

    expectRejectedBeforeDatabase(manifestPath, workspace.evidenceRoot);
  });
});
