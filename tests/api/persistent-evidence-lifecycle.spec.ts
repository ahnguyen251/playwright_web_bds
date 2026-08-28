import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, realpath, rm, unlink, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { initializeSchema } from '../../database/schema';
import { openDatabase } from '../../database/sqlite';
import TestTrackingReporter from '../../reporters/test-tracking-reporter';
import { runImportRunResult } from '../../scripts/import-run-result';
import { createApp } from '../../server/app';
import type { TestRunResult } from '../../types/test-result.types';
import type { FullConfig, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { createTestArtifactWorkspace } from '../support/test-artifact-workspace';

const EXPECTED_BROWSER_TITLE = 'persistent expected browser failure';
const UNEXPECTED_BROWSER_TITLE = 'persistent unexpected browser failure';
const NO_PAGE_TITLE = 'persistent expected no-page framework failure';
const MARKDOWN_PAYLOAD =
  '# Error context\n\n<img src=x onerror=alert("persisted")>\n<script>window.evidencePwned=true</script>';

interface ChildResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

interface ImportedEvidenceRow {
  readonly title: string;
  readonly retry: number;
  readonly expected_status: string | null;
  readonly evidence_id: string;
  readonly type: 'SCREENSHOT' | 'VIDEO' | 'TRACE' | 'LOG' | 'OTHER';
  readonly path: string;
  readonly content_type: string;
}

interface ImportedResultRow {
  readonly title: string;
  readonly retry: number;
  readonly status: string;
  readonly expected_status: string | null;
}

const collectFiles = async (root: string): Promise<readonly string[]> => {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  };
  await visit(root);
  return files.sort();
};

const subprocessEnvironment = (evidenceRoot: string, transientRoot: string): NodeJS.ProcessEnv => {
  const source = process.env;
  const environment: NodeJS.ProcessEnv = {
    PERSISTENT_EVIDENCE_ROOT: evidenceRoot,
    PERSISTENT_EVIDENCE_TRANSIENT_ROOT: transientRoot,
    BUSINESS_TEST_RUN: 'false',
  };
  for (const key of [
    'Path',
    'PATH',
    'SystemRoot',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'LOCALAPPDATA',
    'USERPROFILE',
    'PLAYWRIGHT_BROWSERS_PATH',
    'NODE_OPTIONS',
  ]) {
    if (source[key] !== undefined) environment[key] = source[key];
  }
  return environment;
};

const runPlaywrightProbe = (
  configPath: string,
  evidenceRoot: string,
  transientRoot: string,
): Promise<ChildResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [require.resolve('@playwright/test/cli'), 'test', '--config', configPath],
      {
        cwd: process.cwd(),
        env: subprocessEnvironment(evidenceRoot, transientRoot),
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const assertSafeTransientTarget = async (workspaceRoot: string, transientRoot: string) => {
  const realWorkspace = await realpath(workspaceRoot);
  const realTransient = await realpath(transientRoot);
  const relativeTarget = path.relative(realWorkspace, realTransient);
  expect(relativeTarget).toBe('test-results');
  expect(path.isAbsolute(relativeTarget)).toBe(false);
  return realTransient;
};

test('streams persisted Playwright evidence after physical transient artifact deletion', async () => {
  test.setTimeout(180_000);
  const workspace = await createTestArtifactWorkspace('persistent-evidence-lifecycle-');
  const databasePath = path.join(workspace.root, 'data', 'acceptance.db');
  let apiDatabase: ReturnType<typeof openDatabase> | undefined;
  let server: Server | undefined;
  try {
    const configPath = path.resolve(
      process.cwd(),
      'tests/support/persistent-evidence.playwright.config.ts',
    );
    const child = await runPlaywrightProbe(
      configPath,
      workspace.evidenceRoot,
      workspace.transientRoot,
    );
    expect(child.exitCode, `${child.stdout}\n${child.stderr}`).toBe(1);

    const transientFiles = await collectFiles(workspace.transientRoot);
    expect(transientFiles.some((file) => file.toLowerCase().endsWith('.png'))).toBe(true);
    expect(transientFiles.some((file) => file.toLowerCase().endsWith('.webm'))).toBe(true);
    expect(transientFiles.some((file) => file.toLowerCase().endsWith('.md'))).toBe(true);
    expect(transientFiles.some((file) => file.toLowerCase().endsWith('.zip'))).toBe(true);

    const finalizedRuns = (await readdir(workspace.evidenceRoot, { withFileTypes: true })).filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.'),
    );
    expect(finalizedRuns).toHaveLength(1);
    const finalizedRun = finalizedRuns[0];
    if (!finalizedRun) throw new Error('Expected one finalized persistent evidence run.');
    const runId = finalizedRun.name;
    const manifestPath = path.join(workspace.evidenceRoot, runId, 'run-result.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as TestRunResult;
    expect(manifest.RunId).toBe(runId);
    expect(manifest.Results.map((result) => result.Title)).toContain(EXPECTED_BROWSER_TITLE);
    expect(manifest.Results.map((result) => result.Title)).toContain(UNEXPECTED_BROWSER_TITLE);
    expect(manifest.Results.map((result) => result.Title)).toContain(NO_PAGE_TITLE);

    const setupDatabase = openDatabase(databasePath);
    initializeSchema(setupDatabase);
    setupDatabase.close();
    expect(
      runImportRunResult(manifestPath, databasePath, {
        evidenceRoot: workspace.evidenceRoot,
        logger: { log: () => undefined, warn: () => undefined, error: () => undefined },
      }),
    ).toBe(0);

    const inspectionDatabase = openDatabase(databasePath);
    const resultRows = inspectionDatabase.db
      .prepare(
        `SELECT title, retry, status, expected_status
         FROM test_results
         WHERE run_id = ?
         ORDER BY title, retry`,
      )
      .all(runId) as ImportedResultRow[];
    const evidenceRows = inspectionDatabase.db
      .prepare(
        `SELECT result.title, result.retry, result.expected_status,
                evidence.evidence_id, evidence.type, evidence.path, evidence.content_type
         FROM test_evidence evidence
         JOIN test_results result ON result.result_id = evidence.result_id
         WHERE result.run_id = ?
         ORDER BY result.title, result.retry, evidence.type, evidence.path`,
      )
      .all(runId) as ImportedEvidenceRow[];
    inspectionDatabase.close();

    expect(evidenceRows.length).toBeGreaterThan(0);
    for (const row of evidenceRows) {
      expect(path.isAbsolute(row.path), row.path).toBe(false);
      expect(path.win32.isAbsolute(row.path), row.path).toBe(false);
      expect(path.posix.isAbsolute(row.path), row.path).toBe(false);
      expect(row.path.startsWith(`${runId}/`), row.path).toBe(true);
      expect(row.path.split('/')).not.toContain('test-results');
    }

    const expectedResults = resultRows.filter((row) => row.title === EXPECTED_BROWSER_TITLE);
    const unexpectedResults = resultRows.filter((row) => row.title === UNEXPECTED_BROWSER_TITLE);
    const noPageResults = resultRows.filter((row) => row.title === NO_PAGE_TITLE);
    expect(expectedResults).toMatchObject([{ status: 'FAILED', expected_status: 'failed' }]);
    expect(unexpectedResults).toMatchObject([
      { retry: 0, status: 'FAILED', expected_status: 'passed' },
      { retry: 1, status: 'FAILED', expected_status: 'passed' },
    ]);
    expect(noPageResults).toMatchObject([{ status: 'FAILED', expected_status: 'failed' }]);

    const expectedEvidence = evidenceRows.filter((row) => row.title === EXPECTED_BROWSER_TITLE);
    expect(expectedEvidence.filter((row) => row.type === 'SCREENSHOT')).toHaveLength(1);
    expect(expectedEvidence.filter((row) => row.type === 'VIDEO')).toHaveLength(0);
    expect(expectedEvidence.some((row) => row.type === 'LOG')).toBe(true);

    const unexpectedEvidence = evidenceRows.filter((row) => row.title === UNEXPECTED_BROWSER_TITLE);
    expect(unexpectedEvidence.some((row) => row.type === 'SCREENSHOT')).toBe(true);
    expect(unexpectedEvidence.some((row) => row.type === 'VIDEO')).toBe(true);

    const noPageEvidence = evidenceRows.filter((row) => row.title === NO_PAGE_TITLE);
    expect(noPageEvidence.some((row) => row.type === 'SCREENSHOT')).toBe(false);
    expect(noPageEvidence.some((row) => row.type === 'VIDEO')).toBe(false);

    const transientTraceCount = transientFiles.filter((file) =>
      file.toLowerCase().endsWith('.zip'),
    ).length;
    expect(transientTraceCount).toBeGreaterThan(0);
    expect(evidenceRows.some((row) => row.type === 'TRACE')).toBe(true);

    const screenshot = expectedEvidence.find((row) => row.type === 'SCREENSHOT');
    const markdown = expectedEvidence.find(
      (row) => row.type === 'LOG' && row.content_type === 'text/markdown',
    );
    expect(screenshot).toBeDefined();
    expect(markdown).toBeDefined();
    if (!screenshot || !markdown) throw new Error('Expected screenshot and Markdown evidence.');
    const screenshotBytes = await readFile(
      path.join(workspace.evidenceRoot, ...screenshot.path.split('/')),
    );
    const markdownBytes = await readFile(
      path.join(workspace.evidenceRoot, ...markdown.path.split('/')),
    );
    expect(markdownBytes.toString('utf8')).toBe(MARKDOWN_PAYLOAD);

    const transientTarget = await assertSafeTransientTarget(
      workspace.root,
      workspace.transientRoot,
    );
    await rm(transientTarget, { recursive: true });
    expect(existsSync(workspace.transientRoot)).toBe(false);

    apiDatabase = openDatabase(databasePath);
    const app = createApp({ database: apiDatabase, evidenceRoot: workspace.evidenceRoot });
    server = await new Promise<Server>((resolve, reject) => {
      const listening = app.listen(0, () => resolve(listening));
      listening.once('error', reject);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${String(address.port)}`;

    const screenshotResponse = await fetch(
      `${baseUrl}/api/evidence/${screenshot.evidence_id}/content`,
    );
    expect(screenshotResponse.status).toBe(200);
    expect(screenshotResponse.headers.get('content-type')).toBe('image/png');
    expect(screenshotResponse.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await screenshotResponse.arrayBuffer())).toEqual(screenshotBytes);

    const markdownResponse = await fetch(`${baseUrl}/api/evidence/${markdown.evidence_id}/content`);
    expect(markdownResponse.status).toBe(200);
    expect(markdownResponse.headers.get('content-type')).toBe('text/markdown');
    expect(markdownResponse.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await markdownResponse.text()).toBe(MARKDOWN_PAYLOAD);
  } finally {
    if (server) await closeServer(server);
    apiDatabase?.close();
    await workspace.cleanup();
  }
});

test('fatal allowlisted persistence failure rolls back without a manifest or DB import', async () => {
  const workspace = await createTestArtifactWorkspace('persistent-evidence-fatal-');
  const databasePath = path.join(workspace.root, 'data', 'fatal.db');
  const vanishedSource = path.join(workspace.transientRoot, 'vanished-screenshot.png');
  const runId = 'RUN-20260827010203-dead';
  try {
    await mkdir(path.dirname(vanishedSource), { recursive: true });
    await writeFile(vanishedSource, 'temporary screenshot bytes');
    const reporter = new TestTrackingReporter({
      env: {},
      evidenceRoot: workspace.evidenceRoot,
      now: () => new Date('2026-08-27T01:02:03.000Z'),
      randomSuffix: () => 'dead',
      logger: { log: () => undefined, warn: () => undefined, error: () => undefined },
    });
    reporter.onBegin(
      { projects: [{ outputDir: workspace.transientRoot }] } as unknown as FullConfig,
      { allTests: () => [] } as unknown as Suite,
    );
    await unlink(vanishedSource);
    await reporter.onTestEnd(
      {
        id: 'fatal-persist-probe',
        title: 'fatal persistence probe',
        repeatEachIndex: 0,
        expectedStatus: 'passed',
        location: { file: 'tests/support/fatal-probe.spec.ts', line: 1, column: 1 },
        parent: { project: () => ({ name: 'persistent-evidence-chromium' }) },
      } as unknown as TestCase,
      {
        status: 'failed',
        duration: 1,
        retry: 0,
        attachments: [
          {
            name: 'vanished-screenshot',
            contentType: 'image/png',
            path: vanishedSource,
          },
        ],
      } as unknown as TestResult,
    );
    const endResult = await reporter.onEnd({
      status: 'failed',
      startTime: new Date('2026-08-27T01:02:03.000Z'),
      duration: 1,
    });

    expect(endResult).toEqual({ status: 'failed' });
    expect(existsSync(path.join(workspace.evidenceRoot, runId))).toBe(false);
    const archivedFiles = await collectFiles(workspace.evidenceRoot);
    expect(archivedFiles).toEqual([]);
    expect(JSON.stringify(archivedFiles)).not.toContain(vanishedSource);

    const database = openDatabase(databasePath);
    initializeSchema(database);
    const runCount = database.db.prepare('SELECT COUNT(*) AS count FROM test_runs').get() as {
      count: number;
    };
    database.close();
    expect(runCount.count).toBe(0);
  } finally {
    await workspace.cleanup();
  }
});
