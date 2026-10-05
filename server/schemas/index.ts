import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const TestCaseFilterSchema = PaginationSchema.extend({
  module: z.string().optional(),
  automationStatus: z.enum(['NOT_AUTOMATED', 'IN_PROGRESS', 'AUTOMATED', 'BLOCKED']).optional(),
  latestRunStatus: z.enum(['PASSED', 'FAILED', 'NOT_RUN']).optional(),
  search: z.string().optional(),
});

export const RunFilterSchema = PaginationSchema.extend({
  status: z.enum(['PASSED', 'FAILED']).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
}).refine(data => {
  if (data.from && data.to) {
    return new Date(data.from) <= new Date(data.to);
  }
  return true;
}, {
  message: "from date must be before or equal to to date",
  path: ["from"]
});

export const ResultFilterSchema = PaginationSchema.extend({
  status: z.enum(['PASSED', 'FAILED', 'SKIPPED', 'TIMED_OUT', 'INTERRUPTED']).optional(),
  traceabilityStatus: z.enum(['MAPPED', 'UNMAPPED', 'UNKNOWN_TEST_CASE_ID']).optional(),
  projectName: z.string().optional(),
  testCaseId: z.string().optional(),
  search: z.string().optional(),
});
