import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { resolveRuntimeDatabasePath } from '../database/runtime-database';
import { openDatabase } from '../database/sqlite';
import { TestRunRepository } from '../database/repositories/TestRunRepository';
import type { TestRunResult } from '../types/test-result.types';
import { resolveEvidenceConfiguration } from '../config/evidence.config';
import {
  assertPersistentRelativePath,
  resolveContainedPath,
} from '../services/evidence/evidence-paths';
import { classifyAttachment } from '../services/evidence/evidence-policy';
import { withDatabase, type DatabaseScriptDependencies } from './database-script-runtime';

const EvidenceSchema = z
  .object({
    type: z.enum(['SCREENSHOT', 'TRACE', 'VIDEO', 'LOG', 'OTHER']),
    path: z.string().min(1),
    contentType: z.string().min(1),
  })
  // Preserve additive evidence metadata while validating the persistent fields.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  .passthrough();

const TestRunResultSchema = z
  .object({
    RunId: z.string(),
    StartedAt: z.string(),
    FinishedAt: z.string(),
    DurationMs: z.number(),
    TotalExecutions: z.number(),
    MappedExecutions: z.number(),
    UnmappedExecutions: z.number(),
    UnknownTestCaseIdExecutions: z.number(),
    UniqueMappedTestCaseIdsExecuted: z.number(),
    PassedExecutions: z.number(),
    FailedExecutions: z.number(),
    SkippedExecutions: z.number(),
    TimedOutExecutions: z.number(),
    InterruptedExecutions: z.number(),
    Results: z.array(
      z
        .object({
          TestCaseId: z.string().nullable(),
          TraceabilityStatus: z.enum(['MAPPED', 'UNMAPPED', 'UNKNOWN_TEST_CASE_ID']),
          Status: z.enum(['PASSED', 'FAILED', 'SKIPPED', 'TIMED_OUT', 'INTERRUPTED']),
          Title: z.string(),
          FilePath: z.string(),
          DurationMs: z.number(),
          Retry: z.number(),
          Evidence: z.array(EvidenceSchema),
        })
        // Preserve the existing permissive import contract; tightening it belongs to Task 7.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        .passthrough(),
    ),
  })
  // Preserve the existing permissive import contract; tightening it belongs to Task 7.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  .passthrough();

export interface ImportRunResultDependencies extends DatabaseScriptDependencies {
  readonly evidenceRoot?: string;
}

interface FinalizedManifestLocation {
  readonly evidenceRoot: string;
  readonly manifestPath: string;
  readonly runDirectoryName: string;
}

const normalizeFilesystemPath = (value: string): string => {
  const withoutWindowsNamespace = path.resolve(value).replace(/^\\\\\?\\/u, '');
  return process.platform === 'win32'
    ? withoutWindowsNamespace.toLowerCase()
    : withoutWindowsNamespace;
};

const isContainedBy = (root: string, candidate: string): boolean => {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === '' ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`))
  );
};

const validateFinalizedManifestLocation = (
  manifestPath: string,
  evidenceRoot: string,
): FinalizedManifestLocation => {
  const realEvidenceRoot = fs.realpathSync(evidenceRoot);
  if (
    realEvidenceRoot.split(path.sep).some((segment) => segment.toLowerCase() === 'test-results')
  ) {
    throw new Error('EVIDENCE_ROOT must not be inside test-results.');
  }
  const realManifestPath = fs.realpathSync(manifestPath);
  if (!fs.statSync(realManifestPath).isFile()) {
    throw new Error('Finalized manifest must be a regular file.');
  }

  const relativeManifestPath = path.relative(realEvidenceRoot, realManifestPath);
  const segments = relativeManifestPath.split(path.sep);
  if (
    !isContainedBy(realEvidenceRoot, realManifestPath) ||
    segments.length !== 2 ||
    segments[1] !== 'run-result.json' ||
    segments[0] === '.staging' ||
    segments[0] === '.trash'
  ) {
    throw new Error('Manifest is not a finalized run manifest under EVIDENCE_ROOT.');
  }

  return {
    evidenceRoot: realEvidenceRoot,
    manifestPath: realManifestPath,
    runDirectoryName: segments[0] ?? '',
  };
};

const validateEvidenceFile = (
  evidenceRoot: string,
  runId: string,
  evidence: TestRunResult['Results'][number]['Evidence'][number],
): void => {
  assertPersistentRelativePath(evidence.path, runId);
  if (evidence.path.split('/').some((segment) => segment.toLowerCase() === 'test-results')) {
    throw new Error('Persistent evidence path must not reference test-results.');
  }

  const contentType = evidence.contentType;
  if (!contentType) throw new Error('Persistent evidence must declare a content type.');
  const suppliedExtension = path.posix.extname(evidence.path).toLowerCase();
  const classification = classifyAttachment(path.posix.basename(evidence.path), contentType);
  if (
    !classification ||
    !suppliedExtension ||
    classification.extension !== suppliedExtension ||
    classification.role !== evidence.type ||
    classification.contentType !== contentType
  ) {
    throw new Error('Evidence MIME, extension and role must match the persistent allowlist.');
  }

  const resolvedEvidencePath = resolveContainedPath(evidenceRoot, evidence.path);
  const realEvidencePath = fs.realpathSync(resolvedEvidencePath);
  if (
    !isContainedBy(evidenceRoot, realEvidencePath) ||
    normalizeFilesystemPath(resolvedEvidencePath) !== normalizeFilesystemPath(realEvidencePath)
  ) {
    throw new Error('Evidence symlinks and paths outside EVIDENCE_ROOT are not importable.');
  }
  if (!fs.statSync(realEvidencePath).isFile()) {
    throw new Error('Persistent evidence must be a regular file.');
  }
};

const preflightPersistentRun = (
  location: FinalizedManifestLocation,
  runResult: TestRunResult,
): void => {
  if (location.runDirectoryName !== runResult.RunId) {
    throw new Error('Manifest parent directory must equal RunId.');
  }

  for (const result of runResult.Results) {
    for (const evidence of result.Evidence) {
      validateEvidenceFile(location.evidenceRoot, runResult.RunId, evidence);
    }
  }
};

export const runImportRunResult = (
  jsonPath: string,
  databasePath: string,
  dependencies: ImportRunResultDependencies = {},
): number => {
  const logger = dependencies.logger ?? console;

  if (jsonPath.length === 0) {
    logger.error('Lỗi: Vui lòng cung cấp đường dẫn tới file run-result.json');
    return 1;
  }

  const resolvedJsonPath = path.resolve(process.cwd(), jsonPath);
  let manifestLocation: FinalizedManifestLocation;
  let rawData: unknown;
  try {
    const evidenceRoot = path.resolve(
      dependencies.evidenceRoot ?? resolveEvidenceConfiguration().root,
    );
    manifestLocation = validateFinalizedManifestLocation(resolvedJsonPath, evidenceRoot);
    logger.log(`Đang đọc JSON từ ${manifestLocation.manifestPath}...`);
    rawData = JSON.parse(fs.readFileSync(manifestLocation.manifestPath, 'utf-8')) as unknown;
  } catch (error) {
    logger.error('Lỗi khi đọc finalized run-result.json:', error);
    return 1;
  }

  const validation = TestRunResultSchema.safeParse(rawData);
  if (!validation.success) {
    // Keep the operator-facing validation diagnostic backward compatible.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    logger.error('Lỗi xác thực (Validation failed):', validation.error.format());
    return 1;
  }

  const runResult = validation.data as TestRunResult;
  try {
    preflightPersistentRun(manifestLocation, runResult);
  } catch (error) {
    logger.error('Lỗi preflight persistent evidence:', error);
    return 1;
  }

  try {
    return withDatabase(
      databasePath,
      (connection) => {
        const repo = new TestRunRepository(connection);

        logger.log(`Đang import lần chạy với RunId: ${runResult.RunId}`);
        const importResult = repo.importRunResult(runResult);

        logger.log('\n--- Tổng kết import ---');
        if (importResult.status === 'SKIPPED') {
          logger.log(`Trạng thái: BỎ QUA (${String(importResult.reason)})`);
          return 0;
        }
        if (importResult.status === 'ERROR') {
          logger.error('Trạng thái: LỖI');
          logger.error(importResult.reason);
          return 1;
        }

        logger.log('Trạng thái: THÀNH CÔNG');
        logger.log(`RunId: ${runResult.RunId}`);
        logger.log(`Tổng số lần thực thi: ${String(runResult.TotalExecutions)}`);
        logger.log(`Đã map: ${String(runResult.MappedExecutions)}`);
        logger.log(`Chưa map: ${String(runResult.UnmappedExecutions)}`);
        logger.log(`Không xác định: ${String(runResult.UnknownTestCaseIdExecutions)}`);
        logger.log(
          `Số Test Case ID đã map duy nhất: ${String(runResult.UniqueMappedTestCaseIdsExecuted)}`,
        );
        return 0;
      },
      dependencies.openDatabase ?? openDatabase,
    );
  } catch (error) {
    logger.error('Lỗi khi import run-result:', error);
    return 1;
  }
};

if (require.main === module) {
  const databasePath = resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH);
  process.exitCode = runImportRunResult(process.argv[2] ?? '', databasePath);
}
