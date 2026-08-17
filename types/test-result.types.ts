export type ExecutionStatus =
  | 'PASSED'
  | 'FAILED'
  | 'SKIPPED'
  | 'TIMED_OUT'
  | 'INTERRUPTED';

export type TraceabilityStatus = 'MAPPED' | 'UNMAPPED' | 'UNKNOWN_TEST_CASE_ID';

export type EvidenceType = 'SCREENSHOT' | 'TRACE' | 'VIDEO' | 'LOG' | 'OTHER';

export interface TestEvidence {
  readonly type: EvidenceType;
  readonly path: string;
  readonly contentType?: string;
}

export interface TestExecutionResult {
  readonly TestCaseId: string | null;
  readonly TraceabilityStatus: TraceabilityStatus;
  readonly PlaywrightTestId?: string;
  readonly Title: string;
  readonly FilePath: string;
  readonly ProjectName?: string;
  readonly Status: ExecutionStatus;
  readonly ExpectedStatus?: string;
  readonly DurationMs: number;
  readonly Retry: number;
  readonly ErrorMessage?: string;
  readonly ErrorStack?: string;
  readonly Evidence: readonly TestEvidence[];
}

export interface TestRunResult {
  readonly RunId: string;
  readonly StartedAt: string;
  readonly FinishedAt: string;
  readonly DurationMs: number;

  readonly TotalExecutions: number;
  readonly MappedExecutions: number;
  readonly UnmappedExecutions: number;
  readonly UnknownTestCaseIdExecutions: number;

  readonly UniqueMappedTestCaseIdsExecuted: number;

  readonly PassedExecutions: number;
  readonly FailedExecutions: number;
  readonly SkippedExecutions: number;
  readonly TimedOutExecutions: number;
  readonly InterruptedExecutions: number;

  readonly Results: readonly TestExecutionResult[];
}
