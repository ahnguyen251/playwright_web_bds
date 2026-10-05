import { resolveRuntimeDatabasePath } from '../database/runtime-database';
import { openDatabase, type DatabaseConnection } from '../database/sqlite';
import { TestCaseRepository } from '../database/repositories/TestCaseRepository';
import { allTestCases } from '../test-cases/index';
import { withDatabase, type DatabaseScriptDependencies } from './database-script-runtime';

export interface SyncCatalogResult {
  inserted: number;
  updated: number;
  stale: number;
  deleted: number;
}

export const syncCatalogToConnection = (
  connection: DatabaseConnection,
  logger: Pick<Console, 'log' | 'warn' | 'error'> = console,
): SyncCatalogResult => {
  const repo = new TestCaseRepository(connection);
  let inserted = 0;
  let updated = 0;
  const canonicalIds = new Set(allTestCases.map((testCase) => testCase.id));

  for (const testCase of allTestCases) {
    const isNew = repo.upsertTestCase(testCase);
    if (isNew) inserted += 1;
    else updated += 1;
  }

  const databaseIds = repo.getAllTestCaseIds();
  let stale = 0;
  let deleted = 0;
  for (const databaseId of databaseIds) {
    if (!canonicalIds.has(databaseId)) {
      logger.warn(
        `[TEST_CASE_CU] ${databaseId} tồn tại trong DB nhưng không có trong danh sách chuẩn. Đang xóa...`,
      );
      connection.db.prepare('DELETE FROM test_cases WHERE test_case_id = ?').run(databaseId);
      deleted += 1;
      stale += 1;
    }
  }

  return { inserted, updated, stale, deleted };
};

export const runSyncTestCases = (
  databasePath: string,
  dependencies: DatabaseScriptDependencies = {},
): number => {
  const logger = dependencies.logger ?? console;

  try {
    return withDatabase(
      databasePath,
      (connection) => {
        logger.log('Đang đồng bộ Test Case chuẩn vào SQLite...');
        const result = syncCatalogToConnection(connection, logger);

        logger.log('\n--- Tổng Kết Đồng Bộ Test Case ---');
        logger.log(`Bản chuẩn: ${String(allTestCases.length)}`);
        logger.log(`Đã thêm:   ${String(result.inserted)}`);
        logger.log(`Cập nhật:  ${String(result.updated)}`);
        logger.log(`Bị cũ:     ${String(result.stale)}`);
        logger.log(`Đã xóa:    ${String(result.deleted)}`);
        return 0;
      },
      dependencies.openDatabase ?? openDatabase,
    );
  } catch (error) {
    logger.error('Lỗi khi đồng bộ Test Case:', error);
    return 1;
  }
};

if (require.main === module) {
  const databasePath = resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH);
  process.exitCode = runSyncTestCases(databasePath);
}
