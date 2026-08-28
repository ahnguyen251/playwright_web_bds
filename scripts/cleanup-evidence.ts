import { resolveEvidenceConfiguration } from '../config/evidence.config';
import { resolveRuntimeDatabasePath } from '../database/runtime-database';
import { openDatabase, type DatabaseConnection } from '../database/sqlite';
import { EvidenceArchiveService } from '../services/evidence/EvidenceArchiveService';
import type { CleanupTrashMove } from '../services/evidence/evidence-contracts';
import { withDatabaseAsync, type DatabaseScriptDependencies } from './database-script-runtime';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CleanupEvidenceOptions {
  readonly evidenceRoot: string;
  readonly databasePath: string;
  readonly days: number;
  readonly mode: 'dry-run' | 'apply';
  readonly now?: () => Date;
}

export interface CleanupEvidenceDependencies extends DatabaseScriptDependencies {
  readonly archiveService?: EvidenceArchiveService;
}

interface CleanupArguments {
  readonly days: number;
  readonly mode: 'dry-run' | 'apply';
}

interface CleanupCandidate {
  readonly run_id: string;
  readonly evidence_count: number;
}

export const parseCleanupEvidenceArguments = (args: readonly string[]): CleanupArguments => {
  let days: number | undefined;
  const modes: ('dry-run' | 'apply')[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--days') {
      if (days !== undefined) throw new Error('--days must be supplied exactly once.');
      const rawDays = args[index + 1];
      if (!rawDays || !/^[1-9]\d*$/u.test(rawDays)) {
        throw new Error('--days requires a positive integer.');
      }
      days = Number(rawDays);
      if (!Number.isSafeInteger(days)) throw new Error('--days is outside the supported range.');
      index += 1;
    } else if (argument === '--dry-run') {
      modes.push('dry-run');
    } else if (argument === '--apply') {
      modes.push('apply');
    } else {
      throw new Error(`Unsupported cleanup argument: ${argument ?? ''}`);
    }
  }

  if (days === undefined) throw new Error('--days <positive integer> is required.');
  if (modes.length !== 1) throw new Error('Exactly one of --dry-run or --apply is required.');
  const mode = modes.shift();
  if (mode === undefined) throw new Error('Cleanup mode is required.');
  return { days, mode };
};

const validateOptions = (options: CleanupEvidenceOptions): void => {
  if (!Number.isSafeInteger(options.days) || options.days <= 0) {
    throw new Error('Cleanup days must be a positive integer.');
  }
};

const selectCandidates = (
  connection: DatabaseConnection,
  cutoff: string,
): readonly CleanupCandidate[] =>
  connection.db
    .prepare(
      `SELECT run.run_id,
              COUNT(evidence.evidence_id) AS evidence_count
       FROM test_runs run
       LEFT JOIN test_results result ON result.run_id = run.run_id
       LEFT JOIN test_evidence evidence ON evidence.result_id = result.result_id
       WHERE run.finished_at < ?
       GROUP BY run.run_id
       ORDER BY run.finished_at ASC, run.run_id ASC`,
    )
    .all(cutoff) as CleanupCandidate[];

const deleteEvidenceForRun = (connection: DatabaseConnection, runId: string): number => {
  const transaction = connection.db.transaction((targetRunId: string): number => {
    const result = connection.db
      .prepare(
        `DELETE FROM test_evidence
         WHERE result_id IN (
           SELECT result_id FROM test_results WHERE run_id = ?
         )`,
      )
      .run(targetRunId);
    return result.changes;
  });
  return transaction(runId);
};

const restoreAfterDatabaseFailure = async (
  archiveService: EvidenceArchiveService,
  move: CleanupTrashMove,
): Promise<void> => {
  await archiveService.restoreCleanupTrash(move);
};

export const runEvidenceCleanup = async (
  options: CleanupEvidenceOptions,
  dependencies: CleanupEvidenceDependencies = {},
): Promise<number> => {
  const logger = dependencies.logger ?? console;
  try {
    validateOptions(options);
    const now = (options.now ?? (() => new Date()))();
    const cutoffTimestamp = now.getTime() - options.days * DAY_MS;
    if (!Number.isFinite(cutoffTimestamp)) throw new Error('Cleanup cutoff is invalid.');
    const cutoff = new Date(cutoffTimestamp).toISOString();
    const archiveService =
      dependencies.archiveService ??
      new EvidenceArchiveService({ evidenceRoot: options.evidenceRoot });

    return await withDatabaseAsync(
      options.databasePath,
      async (connection) => {
        const candidates = selectCandidates(connection, cutoff);
        let exitCode = 0;

        for (const candidate of candidates) {
          let inspection;
          try {
            inspection = await archiveService.inspectFinalizedRun(candidate.run_id);
          } catch {
            logger.error(`Run ${candidate.run_id}: invalid cleanup target; skipped.`);
            exitCode = 1;
            continue;
          }

          if (inspection.status === 'NOT_FINALIZED') {
            logger.warn(`Run ${candidate.run_id}: directory is not finalized; skipped.`);
            continue;
          }

          logger.log(
            `Run ${candidate.run_id}: evidenceRows=${String(candidate.evidence_count)}, files=${String(inspection.fileCount)}, bytes=${String(inspection.bytes)}, state=${inspection.status}.`,
          );
          if (options.mode === 'dry-run') continue;

          if (inspection.status === 'MISSING') {
            try {
              const deletedRows = deleteEvidenceForRun(connection, candidate.run_id);
              logger.warn(
                `Run ${candidate.run_id}: missing directory reconciled; deletedEvidenceRows=${String(deletedRows)}.`,
              );
            } catch {
              logger.error(`Run ${candidate.run_id}: database reconciliation failed.`);
              exitCode = 1;
            }
            continue;
          }

          let move: CleanupTrashMove;
          try {
            move = await archiveService.moveFinalizedRunToTrash(candidate.run_id);
          } catch {
            logger.error(`Run ${candidate.run_id}: move to cleanup trash failed.`);
            exitCode = 1;
            continue;
          }

          try {
            const deletedRows = deleteEvidenceForRun(connection, candidate.run_id);
            logger.log(
              `Run ${candidate.run_id}: deletedEvidenceRows=${String(deletedRows)} after archive move.`,
            );
          } catch {
            try {
              await restoreAfterDatabaseFailure(archiveService, move);
            } catch {
              logger.error(`Run ${candidate.run_id}: database failed and archive restore failed.`);
              exitCode = 1;
              continue;
            }
            logger.error(`Run ${candidate.run_id}: database failed; archive restored.`);
            exitCode = 1;
            continue;
          }

          try {
            await archiveService.purgeCleanupTrash(move);
          } catch {
            logger.error(
              `Run ${candidate.run_id}: trash purge failed after database commit; archive was not restored.`,
            );
            exitCode = 1;
          }
        }

        return exitCode;
      },
      dependencies.openDatabase ?? openDatabase,
    );
  } catch {
    logger.error('Evidence cleanup failed before completion.');
    return 1;
  }
};

const runFromCommandLine = async (): Promise<number> => {
  try {
    const parsed = parseCleanupEvidenceArguments(process.argv.slice(2));
    return await runEvidenceCleanup({
      evidenceRoot: resolveEvidenceConfiguration().root,
      databasePath: resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH),
      ...parsed,
    });
  } catch {
    console.error(
      'Usage: npm run evidence:cleanup -- --days <positive-integer> (--dry-run | --apply)',
    );
    return 1;
  }
};

if (require.main === module) {
  void runFromCommandLine().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
