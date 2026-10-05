import { resolveRuntimeDatabasePath } from '../../database/runtime-database';
import { runInitDatabase } from '../../scripts/init-db';
import { runSyncTestCases } from '../../scripts/sync-test-cases';

const globalSetup = (): void => {
  const databasePath = resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH);

  runInitDatabase(databasePath, {
    logger: {
      log: () => undefined,
      warn: (msg: string) => console.warn(msg),
      error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
    },
  });

  runSyncTestCases(databasePath, {
    logger: {
      log: () => undefined,
      warn: (msg: string) => console.warn(msg),
      error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
    },
  });
};

export default globalSetup;
