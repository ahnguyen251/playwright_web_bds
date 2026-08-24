export type ExecutionStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMED_OUT' | 'INTERRUPTED';

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
  readonly Business?: BusinessRunSummary;
}

export type BusinessVariantStatus = ExecutionStatus | 'NOT_RUN';
export type BusinessIdExecutionStatus = 'PASSED' | 'FAILED' | 'PARTIAL' | 'SKIPPED' | 'NOT_RUN';

export interface BusinessDiscoveredTest {
  readonly PlaywrightTestId: string;
  readonly Title: string;
  readonly ProjectName?: string;
}

export interface BusinessVariantSummary {
  readonly TestCaseId: string;
  readonly VariantKey: string;
  readonly PlaywrightTestId: string;
  readonly ProjectName?: string;
  readonly Status: BusinessVariantStatus;
  readonly ExecutionAttempts: number;
}

export interface BusinessIdExecutionSummary {
  readonly TestCaseId: string;
  readonly Status: BusinessIdExecutionStatus;
  readonly LogicalVariants: number;
  readonly ExecutionAttempts: number;
}

export interface BusinessCoverageSummary {
  readonly CatalogTotal: number;
  readonly AutomatedTotal: number;
  readonly NotAutomatedTotal: number;
  readonly AutomatedIds: readonly string[];
  readonly NotAutomatedIds: readonly string[];
  readonly DiscoveredAutomatedIds: readonly string[];
  readonly MissingAutomatedIds: readonly string[];
  readonly UnknownIds: readonly string[];
}

export interface BusinessExecutionSummary {
  readonly UniqueBusinessIdsSelected: number;
  readonly LogicalVariants: number;
  readonly InfrastructureTests: number;
  readonly ExecutionAttempts: number;
  readonly PassedVariants: number;
  readonly FailedVariants: number;
  readonly SkippedVariants: number;
  readonly TimedOutVariants: number;
  readonly InterruptedVariants: number;
  readonly NotRunVariants: number;
  readonly Ids: readonly BusinessIdExecutionSummary[];
  readonly Variants: readonly BusinessVariantSummary[];
}

export interface BusinessRunSummary {
  readonly Coverage: BusinessCoverageSummary;
  readonly Execution: BusinessExecutionSummary;
  readonly HasValidationErrors: boolean;
  readonly ValidationErrors: readonly string[];
}
