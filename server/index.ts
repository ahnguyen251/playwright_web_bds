import { resolveEvidenceConfiguration } from '../config/evidence.config';
import { resolveRuntimeDatabasePath } from '../database/runtime-database';
import { registerShutdownSignals, startReportingServer } from './runtime';

const main = async (): Promise<void> => {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const runtime = await startReportingServer({
    databasePath: resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH),
    evidenceRoot: resolveEvidenceConfiguration().root,
    port,
  });

  registerShutdownSignals(runtime, process, (error) => {
    console.error('Không thể dừng Reporting API:', error);
    process.exitCode = 1;
  });
  console.log(`Máy chủ Reporting API đang chạy tại http://localhost:${String(port)}`);
};

void main().catch((error: unknown) => {
  console.error('Không thể khởi động Reporting API:', error);
  process.exitCode = 1;
});
