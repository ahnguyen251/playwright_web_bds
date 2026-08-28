import { resolveRuntimeDatabasePath } from '../database/runtime-database';
import { initializeSchema } from '../database/schema';
import { openDatabase } from '../database/sqlite';
import { withDatabase, type DatabaseScriptDependencies } from './database-script-runtime';

export const runInitDatabase = (
  databasePath: string,
  dependencies: DatabaseScriptDependencies = {},
): number => {
  const logger = dependencies.logger ?? console;
  logger.log('Đang khởi tạo cấu trúc cơ sở dữ liệu...');

  try {
    withDatabase(databasePath, initializeSchema, dependencies.openDatabase ?? openDatabase);
    logger.log('Khởi tạo cấu trúc cơ sở dữ liệu thành công.');
    return 0;
  } catch (error) {
    logger.error('Lỗi khi khởi tạo cấu trúc cơ sở dữ liệu:', error);
    return 1;
  }
};

if (require.main === module) {
  const databasePath = resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH);
  process.exitCode = runInitDatabase(databasePath);
}
