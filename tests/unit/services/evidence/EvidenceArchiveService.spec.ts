import { access, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { EvidenceArchiveService } from '../../../../services/evidence/EvidenceArchiveService';
import type {
  PersistExecutionInput,
  PersistedEvidence,
} from '../../../../services/evidence/evidence-contracts';
import type { TestRunResult } from '../../../../types/test-result.types';
import {
  createTestArtifactWorkspace,
  type TestArtifactWorkspace,
} from '../../../support/test-artifact-workspace';

const runId = 'RUN-20260826090000-abcd';
const executionKey = '574cb10759e5552a4c1669eef290c148fd83d9c5fb91244663fa771f6f765057';
const nonce = 'feedface';

const exists = async (target: string): Promise<boolean> =>
  access(target).then(
    () => true,
    () => false,
  );

const createManifest = (
  evidence: readonly PersistedEvidence[] = [],
  selectedRunId: string = runId,
): TestRunResult => ({
  RunId: selectedRunId,
  StartedAt: '2026-08-26T09:00:00.000Z',
  FinishedAt: '2026-08-26T09:00:01.000Z',
  DurationMs: 1_000,
  TotalExecutions: 1,
  MappedExecutions: 1,
  UnmappedExecutions: 0,
  UnknownTestCaseIdExecutions: 0,
  UniqueMappedTestCaseIdsExecuted: 1,
  PassedExecutions: 0,
  FailedExecutions: 1,
  SkippedExecutions: 0,
  TimedOutExecutions: 0,
  InterruptedExecutions: 0,
  Results: [
    {
      TestCaseId: 'TC-A-001',
      TraceabilityStatus: 'MAPPED',
      PlaywrightTestId: 'playwright-test-id',
      Title: 'TC-A-001 persistent evidence probe',
      FilePath: 'tests/probe.spec.ts',
      ProjectName: 'chromium',
      Status: 'FAILED',
      ExpectedStatus: 'passed',
      DurationMs: 1_000,
      Retry: 0,
      Evidence: evidence,
    },
  ],
});

const executionInput = (
  workspace: TestArtifactWorkspace,
  attachments: PersistExecutionInput['attachments'],
): PersistExecutionInput => ({
  runId,
  testCaseId: 'TC-A-001',
  playwrightTestId: 'playwright-test-id',
  projectName: 'chromium',
  repeatEachIndex: 0,
  retry: 0,
  attachments,
  approvedSourceRoots: [workspace.transientRoot],
});

const stagingRun = (workspace: TestArtifactWorkspace): string =>
  path.join(workspace.evidenceRoot, '.staging', `${runId}-${nonce}`);

test.describe('EvidenceArchiveService', () => {
  let workspace: TestArtifactWorkspace;

  test.beforeEach(async () => {
    workspace = await createTestArtifactWorkspace('propify-archive-service-');
  });

  test.afterEach(async () => {
    await workspace.cleanup();
  });

  test('persists path and body attachments in staging before atomically finalizing the run', async () => {
    const sourceDirectory = path.join(workspace.transientRoot, 'probe');
    const markdownSource = path.join(sourceDirectory, 'error-context.md');
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(markdownSource, '# failure context', 'utf8');

    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);
    const persisted = await service.persistExecution(
      executionInput(workspace, [
        { name: 'error-context.md', contentType: 'text/markdown', path: markdownSource },
        {
          name: 'expected-failure-screenshot',
          contentType: 'image/png',
          body: Buffer.from('png-bytes'),
        },
      ]),
    );

    expect(persisted).toEqual({
      executionKey,
      evidence: [
        {
          type: 'LOG',
          path: `${runId}/TC-A-001/chromium/${executionKey}/error-context-01.md`,
          contentType: 'text/markdown',
        },
        {
          type: 'SCREENSHOT',
          path: `${runId}/TC-A-001/chromium/${executionKey}/screenshot-01.png`,
          contentType: 'image/png',
        },
      ],
      skipped: [],
    });

    const stagingExecution = path.join(stagingRun(workspace), 'TC-A-001', 'chromium', executionKey);
    expect(await readFile(path.join(stagingExecution, 'error-context-01.md'), 'utf8')).toBe(
      '# failure context',
    );
    expect(await readFile(path.join(stagingExecution, 'screenshot-01.png'), 'utf8')).toBe(
      'png-bytes',
    );
    expect(await exists(path.join(workspace.evidenceRoot, runId))).toBe(false);

    const finalized = await service.finalizeRun({
      runId,
      manifest: createManifest(persisted.evidence),
    });

    expect(finalized).toEqual({
      runDirectory: path.join(workspace.evidenceRoot, runId),
      manifestPath: path.join(workspace.evidenceRoot, runId, 'run-result.json'),
      manifestRelativePath: `${runId}/run-result.json`,
    });
    expect(await exists(stagingRun(workspace))).toBe(false);
    const markdownEvidence = persisted.evidence[0];
    if (!markdownEvidence) throw new Error('Expected persisted Markdown evidence.');
    expect(await readFile(path.join(workspace.evidenceRoot, markdownEvidence.path), 'utf8')).toBe(
      '# failure context',
    );
    expect(JSON.parse(await readFile(finalized.manifestPath, 'utf8')) as TestRunResult).toEqual(
      createManifest(persisted.evidence),
    );
  });

  test('skips unsupported and missing-payload attachments without serializing source paths', async () => {
    const outsideSource = path.join(workspace.outsideEvidenceRoot, 'page.html');
    await writeFile(outsideSource, '<script>unsafe</script>', 'utf8');
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);

    const persisted = await service.persistExecution(
      executionInput(workspace, [
        { name: 'page.html', contentType: 'text/html', path: outsideSource },
        { name: 'missing.log', contentType: 'text/plain' },
      ]),
    );

    expect(persisted.evidence).toEqual([]);
    expect(persisted.skipped).toEqual([
      { name: 'page.html', reason: 'UNSUPPORTED_TYPE' },
      { name: 'missing.log', reason: 'MISSING_PAYLOAD' },
    ]);
    expect(JSON.stringify(persisted)).not.toContain(outsideSource);
    expect(
      await exists(path.join(stagingRun(workspace), 'TC-A-001', 'chromium', executionKey)),
    ).toBe(false);
  });

  test('rejects an allowlisted source outside approved Playwright roots', async () => {
    const outsideSource = path.join(workspace.outsideEvidenceRoot, 'failed.png');
    await writeFile(outsideSource, 'outside', 'utf8');
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);

    const operation = service.persistExecution(
      executionInput(workspace, [
        { name: 'failed.png', contentType: 'image/png', path: outsideSource },
      ]),
    );

    await expect(operation).rejects.toMatchObject({ code: 'SOURCE_OUTSIDE_APPROVED_ROOT' });
    await expect(operation).rejects.not.toThrow(outsideSource);
    expect(
      await exists(path.join(stagingRun(workspace), 'TC-A-001', 'chromium', executionKey)),
    ).toBe(false);
  });

  test('rejects a symlink that escapes an approved source root', async () => {
    const outsideDirectory = path.join(workspace.outsideEvidenceRoot, 'linked-target');
    const outsideSource = path.join(outsideDirectory, 'outside.png');
    const linkedDirectory = path.join(workspace.transientRoot, 'linked-target');
    const linkedSource = path.join(linkedDirectory, 'outside.png');
    await mkdir(outsideDirectory);
    await writeFile(outsideSource, 'outside', 'utf8');
    try {
      await symlink(
        outsideDirectory,
        linkedDirectory,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      test.skip(code === 'EPERM' || code === 'EACCES', 'Host does not permit file symlinks.');
      throw error;
    }

    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);

    await expect(
      service.persistExecution(
        executionInput(workspace, [
          { name: 'linked.png', contentType: 'image/png', path: linkedSource },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'SOURCE_OUTSIDE_APPROVED_ROOT' });
  });

  test('rejects a directory presented as an allowlisted attachment file', async () => {
    const directorySource = path.join(workspace.transientRoot, 'directory.png');
    await mkdir(directorySource);
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);

    await expect(
      service.persistExecution(
        executionInput(workspace, [
          { name: 'directory.png', contentType: 'image/png', path: directorySource },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'SOURCE_NOT_REGULAR_FILE' });
  });

  test('rejects a duplicate execution without overwriting persisted bytes', async () => {
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);
    const input = executionInput(workspace, [
      { name: 'failed.png', contentType: 'image/png', body: Buffer.from('first') },
    ]);
    await service.persistExecution(input);

    await expect(service.persistExecution(input)).rejects.toMatchObject({
      code: 'EXECUTION_ALREADY_PERSISTED',
    });
    expect(
      await readFile(
        path.join(stagingRun(workspace), 'TC-A-001', 'chromium', executionKey, 'screenshot-01.png'),
        'utf8',
      ),
    ).toBe('first');
  });

  test('refuses to start when the finalized run directory already exists', async () => {
    await mkdir(path.join(workspace.evidenceRoot, runId));
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });

    await expect(service.beginRun(runId)).rejects.toMatchObject({
      code: 'FINAL_RUN_ALREADY_EXISTS',
    });
    expect(await exists(stagingRun(workspace))).toBe(false);
  });

  test('removes partial execution files after an accepted attachment fails to persist', async () => {
    const missingSource = path.join(workspace.transientRoot, 'missing.md');
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);

    await expect(
      service.persistExecution(
        executionInput(workspace, [
          { name: 'failed.png', contentType: 'image/png', body: Buffer.from('partial') },
          { name: 'missing.md', contentType: 'text/markdown', path: missingSource },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'SOURCE_NOT_FOUND' });

    expect(
      await exists(path.join(stagingRun(workspace), 'TC-A-001', 'chromium', executionKey)),
    ).toBe(false);
    expect(await exists(path.join(stagingRun(workspace), 'run-result.json'))).toBe(false);
    expect(await exists(path.join(workspace.evidenceRoot, runId))).toBe(false);
  });

  test('rejects a manifest path that was not returned by the active archive', async () => {
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);
    await service.persistExecution(
      executionInput(workspace, [
        { name: 'failed.png', contentType: 'image/png', body: Buffer.from('png') },
      ]),
    );
    const inventedEvidence: PersistedEvidence = {
      type: 'SCREENSHOT',
      path: `${runId}/TC-A-001/chromium/${executionKey}/invented.png`,
      contentType: 'image/png',
    };

    await expect(
      service.finalizeRun({ runId, manifest: createManifest([inventedEvidence]) }),
    ).rejects.toMatchObject({ code: 'MANIFEST_EVIDENCE_NOT_PERSISTED' });
    expect(await exists(path.join(workspace.evidenceRoot, runId))).toBe(false);
    expect(await exists(path.join(stagingRun(workspace), 'run-result.json'))).toBe(false);
  });

  test('rolls back only its registered staging run and remains idempotent', async () => {
    const unrelated = path.join(workspace.evidenceRoot, '.staging', 'unrelated-run');
    await mkdir(unrelated, { recursive: true });
    await writeFile(path.join(unrelated, 'keep.txt'), 'keep', 'utf8');
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);
    await service.persistExecution(
      executionInput(workspace, [
        { name: 'failed.png', contentType: 'image/png', body: Buffer.from('png') },
      ]),
    );

    await service.rollbackRun(runId);
    await service.rollbackRun(runId);

    expect(await exists(stagingRun(workspace))).toBe(false);
    expect(await readFile(path.join(unrelated, 'keep.txt'), 'utf8')).toBe('keep');
    expect(await exists(path.join(workspace.evidenceRoot, runId))).toBe(false);
  });

  test('rejects unsafe run IDs without creating paths outside the archive', async () => {
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });

    await expect(service.beginRun('../unsafe')).rejects.toMatchObject({ code: 'INVALID_RUN_ID' });
    expect(await readdir(workspace.evidenceRoot)).toEqual([]);
    expect(await exists(path.join(workspace.root, 'unsafe'))).toBe(false);
  });

  test('rejects an ambiguous attachment with both path and body', async () => {
    const source = path.join(workspace.transientRoot, 'failed.png');
    await writeFile(source, 'source', 'utf8');
    const service = new EvidenceArchiveService({
      evidenceRoot: workspace.evidenceRoot,
      randomNonce: () => nonce,
    });
    await service.beginRun(runId);

    await expect(
      service.persistExecution(
        executionInput(workspace, [
          {
            name: 'failed.png',
            contentType: 'image/png',
            path: source,
            body: Buffer.from('body'),
          },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_ATTACHMENT_PAYLOAD' });
  });
});
