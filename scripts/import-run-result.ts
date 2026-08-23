import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { getDefaultDatabase } from '../database/sqlite';
import { TestRunRepository } from '../database/repositories/TestRunRepository';
import type { TestRunResult } from '../types/test-result.types';

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
          Evidence: z.array(z.any()),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const run = () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Lỗi: Vui lòng cung cấp đường dẫn tới file run-result.json');
    process.exit(1);
  }

  const jsonPath = path.resolve(process.cwd(), args[0]!);
  if (!fs.existsSync(jsonPath)) {
    console.error(`Lỗi: Không tìm thấy file tại ${jsonPath}`);
    process.exit(1);
  }

  console.log(`Đang đọc JSON từ ${jsonPath}...`);
  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const validation = TestRunResultSchema.safeParse(rawData);
  if (!validation.success) {
    console.error('Lỗi xác thực (Validation failed):', validation.error.format());
    process.exit(1);
  }

  const runResult = validation.data as TestRunResult;

  const conn = getDefaultDatabase();
  const repo = new TestRunRepository(conn);

  console.log(`Đang import RunId: ${runResult.RunId}`);
  const importRes = repo.importRunResult(runResult);

  conn.close();

  console.log('\n--- Tổng Kết Import ---');
  if (importRes.status === 'SKIPPED') {
    console.log(`Trạng thái: BỎ QUA (${importRes.reason})`);
  } else if (importRes.status === 'ERROR') {
    console.error(`Trạng thái: LỖI`);
    console.error(importRes.reason);
    process.exit(1);
  } else {
    console.log(`Trạng thái: THÀNH CÔNG`);
    console.log(`RunId: ${runResult.RunId}`);
    console.log(`Tổng số thực thi (TotalExecutions): ${runResult.TotalExecutions}`);
    console.log(`Đã map (Mapped): ${runResult.MappedExecutions}`);
    console.log(`Chưa map (Unmapped): ${runResult.UnmappedExecutions}`);
    console.log(`Không rõ (Unknown): ${runResult.UnknownTestCaseIdExecutions}`);
    console.log(`Số Test Case Id duy nhất (UniqueMappedTestCaseIds): ${runResult.UniqueMappedTestCaseIdsExecuted}`);
  }
};

run();
