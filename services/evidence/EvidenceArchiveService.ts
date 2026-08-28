import { constants } from 'node:fs';
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

import type { TestEvidence } from '../../types/test-result.types';
import type {
  ArchiveAttachmentInput,
  AttachmentClassification,
  CleanupTrashMove,
  EvidenceArchiveErrorCode,
  EvidenceArchiveServiceOptions,
  FinalizedRunInspection,
  FinalizeRunInput,
  FinalizeRunOutput,
  PersistedEvidence,
  PersistExecutionInput,
  PersistExecutionOutput,
  SkippedAttachment,
} from './evidence-contracts';
import { classifyAttachment } from './evidence-policy';
import {
  assertPersistentRelativePath,
  createExecutionKey,
  toSafeEvidenceSegment,
} from './evidence-paths';

const SAFE_RUN_ID = /^(?:BUSINESS-)?RUN-\d{14}-[a-f0-9]{4}$/u;

interface PersistedEvidenceRecord {
  readonly evidence: PersistedEvidence;
  readonly stagingPath: string;
}

interface ActiveArchiveRun {
  readonly runId: string;
  readonly stagingDirectory: string;
  readonly executionKeys: Set<string>;
  readonly evidenceByPath: Map<string, PersistedEvidenceRecord>;
}

interface AcceptedAttachment {
  readonly attachment: ArchiveAttachmentInput;
  readonly classification: AttachmentClassification;
}

export class EvidenceArchiveError extends Error {
  constructor(
    public readonly code: EvidenceArchiveErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'EvidenceArchiveError';
  }
}

const exists = async (target: string): Promise<boolean> =>
  lstat(target).then(
    () => true,
    (error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    },
  );

const isContainedBy = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
};

const isSamePath = (left: string, right: string): boolean => {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
};

const archiveError = (
  code: EvidenceArchiveErrorCode,
  message: string,
  cause?: unknown,
): EvidenceArchiveError =>
  new EvidenceArchiveError(code, message, cause === undefined ? undefined : { cause });

const evidenceBaseName = (
  attachment: ArchiveAttachmentInput,
  classification: AttachmentClassification,
): string => {
  if (
    classification.role === 'LOG' &&
    /(?:^|[-_])error-context(?:[-_.]|$)/iu.test(attachment.name)
  ) {
    return 'error-context';
  }

  switch (classification.role) {
    case 'SCREENSHOT':
      return 'screenshot';
    case 'VIDEO':
      return 'video';
    case 'TRACE':
      return 'trace';
    case 'LOG':
      return 'log';
    case 'OTHER':
      return 'other';
  }
};

export class EvidenceArchiveService {
  private readonly evidenceRoot: string;
  private readonly randomNonce: () => string;
  private activeRun: ActiveArchiveRun | undefined;

  constructor(options: EvidenceArchiveServiceOptions) {
    this.evidenceRoot = path.resolve(options.evidenceRoot);
    this.randomNonce = options.randomNonce ?? (() => crypto.randomBytes(8).toString('hex'));
  }

  public async beginRun(runId: string): Promise<void> {
    this.assertSafeRunId(runId, 'INVALID_RUN_ID');
    if (this.activeRun) {
      throw archiveError('ACTIVE_RUN_EXISTS', 'An evidence archive run is already active.');
    }

    const finalDirectory = path.join(this.evidenceRoot, runId);
    if (await exists(finalDirectory)) {
      throw archiveError('FINAL_RUN_ALREADY_EXISTS', 'The finalized evidence run already exists.');
    }

    const nonce = this.randomNonce();
    if (toSafeEvidenceSegment(nonce, 'nonce') !== nonce) {
      throw archiveError('INVALID_RUN_ID', 'Archive nonce is not safe for staging.');
    }

    const stagingRoot = path.join(this.evidenceRoot, '.staging');
    const stagingDirectory = path.join(stagingRoot, `${runId}-${nonce}`);
    await mkdir(stagingRoot, { recursive: true });
    try {
      await mkdir(stagingDirectory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw archiveError(
          'STAGING_RUN_ALREADY_EXISTS',
          'The evidence staging run already exists.',
          error,
        );
      }
      throw archiveError('PERSIST_FAILED', 'Unable to create evidence staging.', error);
    }

    this.activeRun = {
      runId,
      stagingDirectory,
      executionKeys: new Set(),
      evidenceByPath: new Map(),
    };
  }

  public async persistExecution(input: PersistExecutionInput): Promise<PersistExecutionOutput> {
    const activeRun = this.requireActiveRun(input.runId);
    const executionKey = createExecutionKey(input);
    if (activeRun.executionKeys.has(executionKey)) {
      throw archiveError(
        'EXECUTION_ALREADY_PERSISTED',
        'The evidence execution has already been persisted.',
      );
    }

    const skipped: SkippedAttachment[] = [];
    const accepted: AcceptedAttachment[] = [];
    for (const attachment of input.attachments) {
      const classification = classifyAttachment(attachment.name, attachment.contentType);
      if (!classification) {
        skipped.push({ name: attachment.name, reason: 'UNSUPPORTED_TYPE' });
        continue;
      }

      const hasPath = attachment.path !== undefined;
      const hasBody = attachment.body !== undefined;
      if (!hasPath && !hasBody) {
        skipped.push({ name: attachment.name, reason: 'MISSING_PAYLOAD' });
        continue;
      }
      if (hasPath && hasBody) {
        throw archiveError(
          'INVALID_ATTACHMENT_PAYLOAD',
          'An evidence attachment must have exactly one payload.',
        );
      }
      accepted.push({ attachment, classification });
    }

    const testCaseSegment = toSafeEvidenceSegment(input.testCaseId ?? undefined, 'UNMAPPED');
    const projectSegment = toSafeEvidenceSegment(input.projectName, 'NO_PROJECT');
    const executionDirectory = path.join(
      activeRun.stagingDirectory,
      testCaseSegment,
      projectSegment,
      executionKey,
    );

    if (accepted.length === 0) {
      activeRun.executionKeys.add(executionKey);
      return { executionKey, evidence: [], skipped };
    }

    const persisted: PersistedEvidenceRecord[] = [];
    const roleCounts = new Map<string, number>();
    try {
      await mkdir(executionDirectory, { recursive: true });
      for (const { attachment, classification } of accepted) {
        const currentCount = (roleCounts.get(classification.role) ?? 0) + 1;
        roleCounts.set(classification.role, currentCount);
        const fileName = `${evidenceBaseName(attachment, classification)}-${String(currentCount).padStart(2, '0')}${classification.extension}`;
        const destination = path.join(executionDirectory, fileName);

        if (attachment.body !== undefined) {
          await writeFile(destination, attachment.body, { flag: 'wx' });
        } else if (attachment.path !== undefined) {
          const source = await this.resolveApprovedSource(
            attachment.path,
            input.approvedSourceRoots,
          );
          await copyFile(source, destination, constants.COPYFILE_EXCL);
        }

        const relativePath = path.posix.join(
          input.runId,
          testCaseSegment,
          projectSegment,
          executionKey,
          fileName,
        );
        const evidence: PersistedEvidence = {
          type: classification.role,
          path: relativePath,
          contentType: classification.contentType,
        };
        persisted.push({ evidence, stagingPath: destination });
      }
    } catch (error) {
      await rm(executionDirectory, { recursive: true, force: true });
      if (error instanceof EvidenceArchiveError) throw error;
      throw archiveError('PERSIST_FAILED', 'Unable to persist an evidence attachment.', error);
    }

    for (const record of persisted) {
      activeRun.evidenceByPath.set(record.evidence.path, record);
    }
    activeRun.executionKeys.add(executionKey);
    return {
      executionKey,
      evidence: persisted.map(({ evidence }) => evidence),
      skipped,
    };
  }

  public async finalizeRun(input: FinalizeRunInput): Promise<FinalizeRunOutput> {
    const activeRun = this.requireActiveRun(input.runId);
    if (input.manifest.RunId !== input.runId) {
      throw archiveError('RUN_ID_MISMATCH', 'Manifest run ID does not match the active archive.');
    }

    await this.validateManifestEvidence(
      activeRun,
      input.manifest.Results.flatMap((result) => result.Evidence),
    );

    const finalDirectory = path.join(this.evidenceRoot, input.runId);
    if (await exists(finalDirectory)) {
      throw archiveError('FINAL_RUN_ALREADY_EXISTS', 'The finalized evidence run already exists.');
    }

    const temporaryManifest = path.join(activeRun.stagingDirectory, 'run-result.json.tmp');
    const stagingManifest = path.join(activeRun.stagingDirectory, 'run-result.json');
    try {
      const handle = await open(temporaryManifest, 'wx');
      try {
        await handle.writeFile(JSON.stringify(input.manifest, null, 2), 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryManifest, stagingManifest);
      await rename(activeRun.stagingDirectory, finalDirectory);
    } catch (error) {
      throw archiveError('FINALIZE_FAILED', 'Unable to finalize the evidence archive.', error);
    }

    this.activeRun = undefined;
    return {
      runDirectory: finalDirectory,
      manifestPath: path.join(finalDirectory, 'run-result.json'),
      manifestRelativePath: path.posix.join(input.runId, 'run-result.json'),
    };
  }

  public async rollbackRun(runId: string): Promise<void> {
    if (!this.activeRun) return;
    if (this.activeRun.runId !== runId) {
      throw archiveError('RUN_ID_MISMATCH', 'Rollback run ID does not match the active archive.');
    }

    const stagingRoot = path.join(this.evidenceRoot, '.staging');
    if (!isContainedBy(stagingRoot, this.activeRun.stagingDirectory)) {
      throw archiveError('ROLLBACK_PATH_INVALID', 'Refusing to remove an invalid staging path.');
    }

    const stagingDirectory = this.activeRun.stagingDirectory;
    await rm(stagingDirectory, { recursive: true, force: true });
    this.activeRun = undefined;
  }

  public async inspectFinalizedRun(runId: string): Promise<FinalizedRunInspection> {
    this.assertSafeRunId(runId, 'CLEANUP_RUN_INVALID');
    const runDirectory = path.join(this.evidenceRoot, runId);
    let runStats;
    try {
      runStats = await lstat(runDirectory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { status: 'MISSING', runId, fileCount: 0, bytes: 0 };
      }
      throw archiveError('CLEANUP_RUN_INVALID', 'Unable to inspect cleanup run.', error);
    }

    if (!runStats.isDirectory() || runStats.isSymbolicLink()) {
      throw archiveError(
        'CLEANUP_RUN_INVALID',
        'Cleanup run must be a physical directory under EVIDENCE_ROOT.',
      );
    }

    let realRoot: string;
    let realRunDirectory: string;
    try {
      [realRoot, realRunDirectory] = await Promise.all([
        realpath(this.evidenceRoot),
        realpath(runDirectory),
      ]);
    } catch (error) {
      throw archiveError('CLEANUP_RUN_INVALID', 'Unable to resolve cleanup run.', error);
    }
    if (
      !isContainedBy(realRoot, realRunDirectory) ||
      !isSamePath(path.join(realRoot, runId), realRunDirectory)
    ) {
      throw archiveError(
        'CLEANUP_RUN_INVALID',
        'Cleanup run resolves outside its finalized archive location.',
      );
    }

    const manifestPath = path.join(runDirectory, 'run-result.json');
    try {
      const manifestStats = await lstat(manifestPath);
      if (!manifestStats.isFile() || manifestStats.isSymbolicLink()) {
        return { status: 'NOT_FINALIZED', runId, fileCount: 0, bytes: 0 };
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { status: 'NOT_FINALIZED', runId, fileCount: 0, bytes: 0 };
      }
      throw archiveError('CLEANUP_RUN_INVALID', 'Unable to inspect finalized manifest.', error);
    }

    const summary = await this.measurePhysicalDirectory(runDirectory);
    return { status: 'FINALIZED', runId, ...summary };
  }

  public async moveFinalizedRunToTrash(runId: string): Promise<CleanupTrashMove> {
    const inspection = await this.inspectFinalizedRun(runId);
    if (inspection.status !== 'FINALIZED') {
      throw archiveError(
        'CLEANUP_RUN_NOT_FINALIZED',
        'Only a complete finalized run can be moved to cleanup trash.',
      );
    }

    const nonce = this.randomNonce();
    if (toSafeEvidenceSegment(nonce, 'nonce') !== nonce) {
      throw archiveError('CLEANUP_TRASH_INVALID', 'Cleanup trash nonce is not safe.');
    }
    const trashRoot = path.join(this.evidenceRoot, '.trash');
    const originalDirectory = path.join(this.evidenceRoot, runId);
    const trashDirectory = path.join(trashRoot, `${runId}-${nonce}`);
    await mkdir(trashRoot, { recursive: true });
    if (await exists(trashDirectory)) {
      throw archiveError('CLEANUP_TRASH_INVALID', 'Cleanup trash target already exists.');
    }

    try {
      await rename(originalDirectory, trashDirectory);
    } catch (error) {
      throw archiveError('CLEANUP_MOVE_FAILED', 'Unable to move finalized run to trash.', error);
    }
    return { runId, originalDirectory, trashDirectory };
  }

  public async restoreCleanupTrash(move: CleanupTrashMove): Promise<void> {
    await this.validateCleanupTrashMove(move);
    if (await exists(move.originalDirectory)) {
      throw archiveError(
        'CLEANUP_RESTORE_FAILED',
        'Cannot restore cleanup trash over an existing run.',
      );
    }
    try {
      await rename(move.trashDirectory, move.originalDirectory);
    } catch (error) {
      throw archiveError('CLEANUP_RESTORE_FAILED', 'Unable to restore cleanup trash.', error);
    }
  }

  public async purgeCleanupTrash(move: CleanupTrashMove): Promise<void> {
    await this.validateCleanupTrashMove(move);
    try {
      await rm(move.trashDirectory, { recursive: true });
    } catch (error) {
      throw archiveError('CLEANUP_PURGE_FAILED', 'Unable to purge cleanup trash.', error);
    }
  }

  private requireActiveRun(runId: string): ActiveArchiveRun {
    if (!this.activeRun) {
      throw archiveError('NO_ACTIVE_RUN', 'No evidence archive run is active.');
    }
    if (this.activeRun.runId !== runId) {
      throw archiveError('RUN_ID_MISMATCH', 'Run ID does not match the active evidence archive.');
    }
    return this.activeRun;
  }

  private assertSafeRunId(runId: string, code: 'INVALID_RUN_ID' | 'CLEANUP_RUN_INVALID'): void {
    if (!SAFE_RUN_ID.test(runId) || toSafeEvidenceSegment(runId, 'RUN') !== runId) {
      throw archiveError(code, 'Run ID is not safe for evidence archival.');
    }
  }

  private async measurePhysicalDirectory(
    directory: string,
  ): Promise<{ readonly fileCount: number; readonly bytes: number }> {
    let fileCount = 0;
    let bytes = 0;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      const entryStats = await lstat(entryPath);
      if (entryStats.isSymbolicLink()) {
        throw archiveError(
          'CLEANUP_RUN_INVALID',
          'Finalized cleanup run must not contain symbolic links.',
        );
      }
      if (entryStats.isDirectory()) {
        const nested = await this.measurePhysicalDirectory(entryPath);
        fileCount += nested.fileCount;
        bytes += nested.bytes;
      } else if (entryStats.isFile()) {
        fileCount += 1;
        bytes += entryStats.size;
      } else {
        throw archiveError(
          'CLEANUP_RUN_INVALID',
          'Finalized cleanup run contains an unsupported filesystem entry.',
        );
      }
    }
    return { fileCount, bytes };
  }

  private async validateCleanupTrashMove(move: CleanupTrashMove): Promise<void> {
    this.assertSafeRunId(move.runId, 'CLEANUP_RUN_INVALID');
    const expectedOriginal = path.join(this.evidenceRoot, move.runId);
    const trashRoot = path.join(this.evidenceRoot, '.trash');
    const resolvedTrash = path.resolve(move.trashDirectory);
    if (
      !isSamePath(move.originalDirectory, expectedOriginal) ||
      !isSamePath(path.dirname(resolvedTrash), trashRoot) ||
      !path.basename(resolvedTrash).startsWith(`${move.runId}-`)
    ) {
      throw archiveError('CLEANUP_TRASH_INVALID', 'Cleanup trash target is not service-owned.');
    }

    let trashStats;
    let realTrashRoot: string;
    let realTrash: string;
    try {
      [trashStats, realTrashRoot, realTrash] = await Promise.all([
        lstat(resolvedTrash),
        realpath(trashRoot),
        realpath(resolvedTrash),
      ]);
    } catch (error) {
      throw archiveError('CLEANUP_TRASH_INVALID', 'Cleanup trash target is unavailable.', error);
    }
    if (
      !trashStats.isDirectory() ||
      trashStats.isSymbolicLink() ||
      !isContainedBy(realTrashRoot, realTrash) ||
      !isSamePath(path.join(realTrashRoot, path.basename(resolvedTrash)), realTrash)
    ) {
      throw archiveError('CLEANUP_TRASH_INVALID', 'Cleanup trash target is unsafe.');
    }
  }

  private async resolveApprovedSource(
    sourcePath: string,
    approvedSourceRoots: readonly string[],
  ): Promise<string> {
    let resolvedSource: string;
    try {
      resolvedSource = await realpath(path.resolve(sourcePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw archiveError('SOURCE_NOT_FOUND', 'Evidence source file does not exist.', error);
      }
      throw archiveError('PERSIST_FAILED', 'Unable to inspect the evidence source.', error);
    }

    const resolvedRoots: string[] = [];
    for (const approvedRoot of approvedSourceRoots) {
      try {
        resolvedRoots.push(await realpath(path.resolve(approvedRoot)));
      } catch (error) {
        throw archiveError(
          'APPROVED_SOURCE_ROOT_INVALID',
          'An approved evidence source root is unavailable.',
          error,
        );
      }
    }
    if (!resolvedRoots.some((root) => isContainedBy(root, resolvedSource))) {
      throw archiveError(
        'SOURCE_OUTSIDE_APPROVED_ROOT',
        'Evidence source is outside approved Playwright output roots.',
      );
    }

    const sourceStats = await stat(resolvedSource);
    if (!sourceStats.isFile()) {
      throw archiveError('SOURCE_NOT_REGULAR_FILE', 'Evidence source must be a regular file.');
    }
    return resolvedSource;
  }

  private async validateManifestEvidence(
    activeRun: ActiveArchiveRun,
    manifestEvidence: readonly TestEvidence[],
  ): Promise<void> {
    const seen = new Set<string>();
    if (manifestEvidence.length !== activeRun.evidenceByPath.size) {
      throw archiveError(
        'MANIFEST_EVIDENCE_NOT_PERSISTED',
        'Manifest evidence does not match persisted archive evidence.',
      );
    }

    for (const evidence of manifestEvidence) {
      try {
        assertPersistentRelativePath(evidence.path, activeRun.runId);
      } catch (error) {
        throw archiveError(
          'MANIFEST_EVIDENCE_NOT_PERSISTED',
          'Manifest contains an invalid evidence path.',
          error,
        );
      }
      if (seen.has(evidence.path)) {
        throw archiveError(
          'MANIFEST_EVIDENCE_NOT_PERSISTED',
          'Manifest contains duplicate evidence paths.',
        );
      }
      seen.add(evidence.path);

      const persisted = activeRun.evidenceByPath.get(evidence.path);
      if (
        persisted?.evidence.type !== evidence.type ||
        persisted.evidence.contentType !== evidence.contentType
      ) {
        throw archiveError(
          'MANIFEST_EVIDENCE_NOT_PERSISTED',
          'Manifest evidence does not match persisted archive evidence.',
        );
      }

      let stagedStats;
      try {
        stagedStats = await stat(persisted.stagingPath);
      } catch (error) {
        throw archiveError(
          'STAGED_EVIDENCE_MISSING',
          'A persisted evidence file is unavailable before finalize.',
          error,
        );
      }
      if (!stagedStats.isFile()) {
        throw archiveError(
          'STAGED_EVIDENCE_MISSING',
          'A persisted evidence item is not a regular file.',
        );
      }
    }
  }
}
