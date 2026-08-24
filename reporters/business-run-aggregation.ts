import type { TestCaseDefinition } from '../types/test-case.types';
import type {
  BusinessDiscoveredTest,
  BusinessIdExecutionStatus,
  BusinessIdExecutionSummary,
  BusinessRunSummary,
  BusinessVariantStatus,
  BusinessVariantSummary,
  TestExecutionResult,
} from '../types/test-result.types';
import { parseTestCaseId } from '../utils/test-tracking';

const variantKey = (projectName: string | undefined, playwrightTestId: string): string =>
  `${projectName ?? '<no-project>'}:${playwrightTestId}`;

const finalAttempt = (attempts: readonly TestExecutionResult[]): TestExecutionResult | undefined =>
  [...attempts].sort((left, right) => right.Retry - left.Retry)[0];

const aggregateIdStatus = (
  statuses: readonly BusinessVariantStatus[],
): BusinessIdExecutionStatus => {
  if (statuses.length === 0 || statuses.every((status) => status === 'NOT_RUN')) return 'NOT_RUN';
  if (statuses.some((status) => ['FAILED', 'TIMED_OUT', 'INTERRUPTED'].includes(status))) {
    return 'FAILED';
  }
  if (statuses.includes('NOT_RUN')) return 'PARTIAL';
  if (statuses.every((status) => status === 'SKIPPED')) return 'SKIPPED';
  if (statuses.includes('PASSED') && statuses.includes('SKIPPED')) return 'PARTIAL';
  return 'PASSED';
};

const sorted = (values: Iterable<string>): string[] => [...values].sort();

export const aggregateBusinessRun = (
  testCases: readonly TestCaseDefinition[],
  discoveredTests: readonly BusinessDiscoveredTest[],
  executions: readonly TestExecutionResult[],
): BusinessRunSummary => {
  const catalogIds = new Set(testCases.map((testCase) => testCase.id));
  const automatedIds = new Set(
    testCases
      .filter((testCase) => testCase.automation.status === 'AUTOMATED')
      .map((testCase) => testCase.id),
  );
  const notAutomatedIds = new Set(
    testCases
      .filter((testCase) => testCase.automation.status !== 'AUTOMATED')
      .map((testCase) => testCase.id),
  );

  const discoveredAutomatedIds = new Set<string>();
  const unknownIds = new Set<string>();
  const discoveredVariants = new Map<
    string,
    { readonly testCaseId: string; readonly test: BusinessDiscoveredTest }
  >();
  let infrastructureTests = 0;

  for (const discoveredTest of discoveredTests) {
    const testCaseId = parseTestCaseId(discoveredTest.Title);
    if (testCaseId === null) {
      infrastructureTests += 1;
      continue;
    }
    if (!catalogIds.has(testCaseId)) {
      unknownIds.add(testCaseId);
      continue;
    }
    if (!automatedIds.has(testCaseId)) continue;

    discoveredAutomatedIds.add(testCaseId);
    const key = variantKey(discoveredTest.ProjectName, discoveredTest.PlaywrightTestId);
    if (!discoveredVariants.has(key)) {
      discoveredVariants.set(key, { testCaseId, test: discoveredTest });
    }
  }

  const attemptsByVariant = new Map<string, TestExecutionResult[]>();
  for (const execution of executions) {
    if (execution.PlaywrightTestId === undefined) continue;
    const key = variantKey(execution.ProjectName, execution.PlaywrightTestId);
    if (!discoveredVariants.has(key)) continue;

    const attempts = attemptsByVariant.get(key) ?? [];
    attempts.push(execution);
    attemptsByVariant.set(key, attempts);
  }

  const variants: BusinessVariantSummary[] = [...discoveredVariants.entries()]
    .map(([key, { testCaseId, test }]) => {
      const attempts = attemptsByVariant.get(key) ?? [];
      const status: BusinessVariantStatus = finalAttempt(attempts)?.Status ?? 'NOT_RUN';
      return {
        TestCaseId: testCaseId,
        VariantKey: key,
        PlaywrightTestId: test.PlaywrightTestId,
        ...(test.ProjectName === undefined ? {} : { ProjectName: test.ProjectName }),
        Status: status,
        ExecutionAttempts: attempts.length,
      };
    })
    .sort(
      (left, right) =>
        left.TestCaseId.localeCompare(right.TestCaseId) ||
        left.VariantKey.localeCompare(right.VariantKey),
    );

  const ids: BusinessIdExecutionSummary[] = sorted(automatedIds).map((testCaseId) => {
    const idVariants = variants.filter((variant) => variant.TestCaseId === testCaseId);
    return {
      TestCaseId: testCaseId,
      Status: aggregateIdStatus(idVariants.map((variant) => variant.Status)),
      LogicalVariants: idVariants.length,
      ExecutionAttempts: idVariants.reduce(
        (total, variant) => total + variant.ExecutionAttempts,
        0,
      ),
    };
  });

  const missingAutomatedIds = sorted(automatedIds).filter(
    (testCaseId) => !discoveredAutomatedIds.has(testCaseId),
  );
  const sortedUnknownIds = sorted(unknownIds);
  const validationErrors: string[] = [];
  if (missingAutomatedIds.length > 0) {
    validationErrors.push(
      `Automated IDs missing from Playwright discovery: ${missingAutomatedIds.join(', ')}`,
    );
  }
  if (sortedUnknownIds.length > 0) {
    validationErrors.push(`Unknown test case IDs selected: ${sortedUnknownIds.join(', ')}`);
  }

  return {
    Coverage: {
      CatalogTotal: catalogIds.size,
      AutomatedTotal: automatedIds.size,
      NotAutomatedTotal: notAutomatedIds.size,
      AutomatedIds: sorted(automatedIds),
      NotAutomatedIds: sorted(notAutomatedIds),
      DiscoveredAutomatedIds: sorted(discoveredAutomatedIds),
      MissingAutomatedIds: missingAutomatedIds,
      UnknownIds: sortedUnknownIds,
    },
    Execution: {
      UniqueBusinessIdsSelected: discoveredAutomatedIds.size,
      LogicalVariants: variants.length,
      InfrastructureTests: infrastructureTests,
      ExecutionAttempts: variants.reduce((total, variant) => total + variant.ExecutionAttempts, 0),
      PassedVariants: variants.filter((variant) => variant.Status === 'PASSED').length,
      FailedVariants: variants.filter((variant) => variant.Status === 'FAILED').length,
      SkippedVariants: variants.filter((variant) => variant.Status === 'SKIPPED').length,
      TimedOutVariants: variants.filter((variant) => variant.Status === 'TIMED_OUT').length,
      InterruptedVariants: variants.filter((variant) => variant.Status === 'INTERRUPTED').length,
      NotRunVariants: variants.filter((variant) => variant.Status === 'NOT_RUN').length,
      Ids: ids,
      Variants: variants,
    },
    HasValidationErrors: validationErrors.length > 0,
    ValidationErrors: validationErrors,
  };
};

const formatIds = (ids: readonly string[]): string => ids.join(', ') || 'none';

export const formatBusinessRunSummary = (summary: BusinessRunSummary): readonly string[] => [
  '=== Business Coverage ===',
  `Catalog IDs: ${String(summary.Coverage.CatalogTotal)}`,
  `Automated IDs: ${String(summary.Coverage.AutomatedTotal)}/${String(summary.Coverage.CatalogTotal)}`,
  `Not automated IDs (${String(summary.Coverage.NotAutomatedTotal)}): ${formatIds(summary.Coverage.NotAutomatedIds)}`,
  `Discovered automated IDs (${String(summary.Coverage.DiscoveredAutomatedIds.length)}): ${formatIds(summary.Coverage.DiscoveredAutomatedIds)}`,
  `Missing automated IDs (${String(summary.Coverage.MissingAutomatedIds.length)}): ${formatIds(summary.Coverage.MissingAutomatedIds)}`,
  `Unknown IDs (${String(summary.Coverage.UnknownIds.length)}): ${formatIds(summary.Coverage.UnknownIds)}`,
  '=== Business Execution ===',
  `Unique business IDs selected: ${String(summary.Execution.UniqueBusinessIdsSelected)}`,
  `Logical variants: ${String(summary.Execution.LogicalVariants)}`,
  `Infrastructure tests: ${String(summary.Execution.InfrastructureTests)}`,
  `Execution attempts: ${String(summary.Execution.ExecutionAttempts)}`,
  `Passed variants: ${String(summary.Execution.PassedVariants)}`,
  `Failed variants: ${String(summary.Execution.FailedVariants)}`,
  `Skipped variants: ${String(summary.Execution.SkippedVariants)}`,
  `Timed out variants: ${String(summary.Execution.TimedOutVariants)}`,
  `Interrupted variants: ${String(summary.Execution.InterruptedVariants)}`,
  `Not run variants: ${String(summary.Execution.NotRunVariants)}`,
  ...summary.ValidationErrors.map((error) => `Validation error: ${error}`),
];
