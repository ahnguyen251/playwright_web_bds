import { resolveRuntimeDatabasePath } from '../database/runtime-database';
import { openDatabase } from '../database/sqlite';
import { withDatabase, type DatabaseScriptDependencies } from './database-script-runtime';

export const runQueryVerification = (
  databasePath: string,
  dependencies: DatabaseScriptDependencies = {},
): number => {
  const logger = dependencies.logger ?? console;

  try {
    return withDatabase(
      databasePath,
      (connection) => {
        const { db } = connection;

        logger.log('\n--- 1. Tổng số Test Case chuẩn ---');
        logger.log(db.prepare('SELECT COUNT(*) as count FROM test_cases').get());

        logger.log('\n--- 2. Có bao nhiêu test case AUTOMATED (đã tự động hóa)? ---');
        logger.log(
          db
            .prepare('SELECT COUNT(*) as count FROM test_cases WHERE automation_status = ?')
            .get('AUTOMATED'),
        );

        logger.log('\n--- 3. Có bao nhiêu test case NOT_AUTOMATED (chưa tự động hóa)? ---');
        logger.log(
          db
            .prepare('SELECT COUNT(*) as count FROM test_cases WHERE automation_status = ?')
            .get('NOT_AUTOMATED'),
        );

        logger.log('\n--- 4. Lần chạy kiểm thử mới nhất và các chỉ số ---');
        logger.log(
          db
            .prepare(
              'SELECT run_id, total_executions, unique_mapped_test_case_ids_executed FROM test_runs ORDER BY created_at DESC LIMIT 1',
            )
            .get(),
        );

        logger.log('\n--- 5. Thông tin lần thực thi của TC-AUTH-LOGIN-001 ---');
        logger.log(
          db
            .prepare(
              `
                SELECT run_id, project_name, status, traceability_status, duration_ms
                FROM test_results
                WHERE parsed_test_case_id = 'TC-AUTH-LOGIN-001'
              `,
            )
            .all(),
        );

        logger.log('\n--- 6. Các lần kiểm thử UNMAPPED ---');
        logger.log(
          db
            .prepare(
              `
                SELECT title, status, traceability_status
                FROM test_results
                WHERE traceability_status = 'UNMAPPED'
              `,
            )
            .all(),
        );

        return 0;
      },
      dependencies.openDatabase ?? openDatabase,
    );
  } catch (error) {
    logger.error('Lỗi khi truy vấn xác minh:', error);
    return 1;
  }
};

if (require.main === module) {
  const databasePath = resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH);
  process.exitCode = runQueryVerification(databasePath);
}
