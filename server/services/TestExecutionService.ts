import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import type { DatabaseConnection } from '../../database/sqlite';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';

export interface ExecuteTestCaseResult {
  readonly success: boolean;
  readonly testCaseId: string;
  readonly runId: string;
  readonly status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMED_OUT' | 'ERROR';
  readonly durationMs: number;
  readonly message?: string | undefined;
  readonly errorMessage?: string | undefined;
}

export class TestExecutionService {
  private static readonly activeRuns = new Set<string>();

  constructor(private readonly conn: DatabaseConnection) {}

  public async executeTestCase(testCaseId: string): Promise<ExecuteTestCaseResult> {
    if (TestExecutionService.activeRuns.has(testCaseId)) {
      throw new AppError(
        409,
        'TEST_CASE_ALREADY_RUNNING',
        `Test case ${testCaseId} hiện đang được thực thi. Vui lòng chờ phiên chạy hoàn tất.`,
      );
    }

    const { db } = this.conn;
    const testCase = db
      .prepare(
        'SELECT test_case_id, title, automation_status, script_path FROM test_cases WHERE test_case_id = ?',
      )
      .get(testCaseId) as
      | {
          test_case_id: string;
          title: string;
          automation_status: string;
          script_path: string | null;
        }
      | undefined;

    if (!testCase) {
      throw new NotFoundError('TEST_CASE_NOT_FOUND', `Không tìm thấy test case ${testCaseId}.`);
    }

    if (testCase.automation_status !== 'AUTOMATED' || !testCase.script_path) {
      throw new ValidationError(
        `Test case ${testCaseId} chưa được tự động hóa hoặc không có script_path.`,
      );
    }

    const shortId = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const adhocRunId = `adhoc-run-${String(Date.now())}-${shortId}`;
    const startTime = Date.now();

    TestExecutionService.activeRuns.add(testCaseId);

    try {
      const isMutating = testCase.script_path.includes('.mutating.spec.ts');
      const normalizedScriptPath = testCase.script_path.replace(/\\/g, '/');

      const args = [
        'playwright',
        'test',
        normalizedScriptPath,
        '-g',
        testCaseId,
        '--headed',
        '--project=adhoc-runner',
      ];

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        ADHOC_RUN_ID: adhocRunId,
        ...(isMutating
          ? {
              RUN_MUTATING_E2E: 'true',
              RUN_OTP_E2E: 'true',
              RUN_PRODUCTION_REGISTRATION_E2E: 'true',
              RUN_PRODUCTION_MUTATING_E2E: 'true',
              ALLOW_MUTATING_E2E: 'true',
            }
          : {}),
      };

      const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';

      let stderrOutput = '';

      await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
          cwd: process.cwd(),
          env,
          shell: true,
        });

        child.stderr.on('data', (chunk) => {
          stderrOutput += String(chunk);
        });

        child.on('error', (err) => {
          reject(err);
        });

        // 180s timeout limit to prevent orphan processes
        const timer = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Test case ${testCaseId} thực thi vượt quá thời gian tối đa (180s)`));
        }, 180000);

        child.on('close', () => {
          clearTimeout(timer);
          resolve();
        });
      });

      const durationMs = Date.now() - startTime;

      // Query result from test_results
      const resultRow = db
        .prepare(
          `
          SELECT status, duration_ms, error_message
          FROM test_results
          WHERE run_id = ? AND (test_case_id = ? OR parsed_test_case_id = ?)
          ORDER BY created_at DESC
          LIMIT 1
        `,
        )
        .get(adhocRunId, testCaseId, testCaseId) as
        | { status: string; duration_ms: number; error_message: string | null }
        | undefined;

      if (resultRow) {
        return {
          success: resultRow.status === 'PASSED',
          testCaseId,
          runId: adhocRunId,
          status: resultRow.status as ExecuteTestCaseResult['status'],
          durationMs: resultRow.duration_ms || durationMs,
          errorMessage: resultRow.error_message ?? undefined,
        };
      }

      return {
        success: false,
        testCaseId,
        runId: adhocRunId,
        status: 'FAILED',
        durationMs,
        errorMessage: stderrOutput || 'Không tìm thấy kết quả kiểm thử được lưu trong cơ sở dữ liệu.',
      };
    } finally {
      TestExecutionService.activeRuns.delete(testCaseId);
    }
  }
}
