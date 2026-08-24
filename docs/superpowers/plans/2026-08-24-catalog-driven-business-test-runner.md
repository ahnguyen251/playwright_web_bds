# Catalog-Driven Business Test Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `npm run test:business` to run every existing variant for the 34 automated catalog IDs on canonical projects and report 34/83 Business Coverage separately from variant/retry Execution.

**Architecture:** Keep every existing Playwright project and fixture unchanged. A catalog-selection utility derives the automated ID allowlist and a boundary-safe grep expression; a small TypeScript runner invokes the local Playwright Node CLI with existing canonical projects; the tracking reporter aggregates discovered variants and final retry attempts into an optional business summary.

**Tech Stack:** Node.js 20+, TypeScript 6, Playwright Test 1.62, ts-node, existing custom Playwright reporter, ESLint, Prettier.

**Spec:** `docs/superpowers/specs/2026-08-24-business-test-runner-design.md`

## Global Constraints

- Preserve all existing Playwright project definitions, dependencies, fixtures, and production mutation gates.
- Do not modify `playwright.config.ts` or fix its broad end-to-end `testMatch` regex in this feature.
- Use Chromium as the canonical read-only browser; do not select Firefox or WebKit in `test:business`.
- Keep `npm test` behavior unchanged.
- Count each catalog ID once in Business Coverage, regardless of variants, projects, retries, or attempts.
- Keep every variant and retry attempt visible in Execution.
- Treat the 49 `NOT_AUTOMATED` IDs as backlog, not command failures.
- Preserve the user's existing unstaged changes. In particular, consume the current `parseTestCaseId()` behavior in `utils/test-tracking.ts`; do not overwrite or stage that file.
- Commit only the files listed by each task; do not stage unrelated dirty files.

---

## File Structure

### New files

- `utils/business-test-selection.ts` — derives automated/not-automated catalog sets and the safe Playwright grep source.
- `reporters/business-run-aggregation.ts` — pure discovery, retry, variant, ID-status, validation, and output-format aggregation.
- `scripts/run-business-tests.ts` — validates the real catalog, prints the pre-run coverage baseline, and spawns the local Playwright CLI without a shell.
- `tests/unit/test-cases/business-automation-baseline.spec.ts` — locks the current 34/83 automation metadata baseline.
- `tests/unit/utils/business-test-selection.spec.ts` — protects duplicate detection and exact ID filter construction.
- `tests/unit/reporters/business-run-aggregation.spec.ts` — protects variant/retry aggregation and coverage/execution separation.

### Modified files

- `test-cases/appointments/appointment.test-cases.ts` — marks 2 mapped appointment IDs automated.
- `test-cases/authentication/login.test-cases.ts` — marks all 5 mapped login IDs automated.
- `test-cases/authentication/password-recovery.test-cases.ts` — marks all 3 mapped recovery IDs automated.
- `test-cases/authentication/profile.test-cases.ts` — marks 3 mapped profile IDs automated.
- `test-cases/authentication/registration.test-cases.ts` — marks 6 mapped registration IDs automated.
- `test-cases/listings/listing.test-cases.ts` — marks 15 mapped listing IDs automated.
- `types/test-result.types.ts` — adds backward-compatible optional Business Coverage and Execution result types.
- `reporters/test-tracking-reporter.ts` — captures discovery in `onBegin`, aggregates business runs in `onEnd`, and can fail a run for mapping validation errors.
- `package.json` — adds `test:business`, `test:framework`, and `test:cross-browser` command aliases.
- `README.md` — documents command boundaries and explains why variants do not inflate coverage.

---

### Task 1: Synchronize the 34-ID automation baseline

**Files:**

- Create: `tests/unit/test-cases/business-automation-baseline.spec.ts`
- Modify: `test-cases/appointments/appointment.test-cases.ts:8-41`
- Modify: `test-cases/authentication/login.test-cases.ts:27-94`
- Modify: `test-cases/authentication/password-recovery.test-cases.ts:21-53`
- Modify: `test-cases/authentication/profile.test-cases.ts:8-121`
- Modify: `test-cases/authentication/registration.test-cases.ts:47-135`
- Modify: `test-cases/listings/listing.test-cases.ts:8-377`

**Interfaces:**

- Consumes: `allTestCases: readonly TestCaseDefinition[]` and `TestCaseRegistry.validate()`.
- Produces: exactly 34 catalog entries with `automation.status === 'AUTOMATED'`, each with a valid primary `scriptPath`; exactly 49 remaining entries are not automated.

- [ ] **Step 1: Write the failing automation-baseline test**

```ts
import { expect, test } from '@playwright/test';
import { allTestCases } from '../../../test-cases';
import { TestCaseRegistry } from '../../../utils/TestCaseRegistry';

const expectedAutomatedIds = [
  'TC-APT-CREATE-001',
  'TC-APT-CREATE-003',
  'TC-AUTH-FORGOT-001',
  'TC-AUTH-FORGOT-002',
  'TC-AUTH-FORGOT-003',
  'TC-AUTH-LOGIN-001',
  'TC-AUTH-LOGIN-002',
  'TC-AUTH-LOGIN-003',
  'TC-AUTH-LOGIN-004',
  'TC-AUTH-LOGIN-005',
  'TC-AUTH-REGISTER-001',
  'TC-AUTH-REGISTER-002',
  'TC-AUTH-REGISTER-003',
  'TC-AUTH-REGISTER-004',
  'TC-AUTH-REGISTER-005',
  'TC-AUTH-REGISTER-006',
  'TC-LIST-CREATE-001',
  'TC-LIST-CREATE-002',
  'TC-LIST-DETAIL-001',
  'TC-LIST-DETAIL-002',
  'TC-LIST-EDIT-001',
  'TC-LIST-EDIT-002',
  'TC-LIST-FAVORITE-001',
  'TC-LIST-FAVORITE-002',
  'TC-LIST-FILTER-001',
  'TC-LIST-FILTER-002',
  'TC-LIST-REMOVE-001',
  'TC-LIST-REMOVE-002',
  'TC-LIST-SEARCH-001',
  'TC-LIST-VIEW-001',
  'TC-LIST-VIEW-002',
  'TC-PROFILE-CHANGEPW-004',
  'TC-PROFILE-EDIT-002',
  'TC-PROFILE-VIEW-001',
] as const;

test('catalog records the current executable business coverage baseline', () => {
  const automatedIds = allTestCases
    .filter(({ automation }) => automation.status === 'AUTOMATED')
    .map(({ id }) => id)
    .sort();

  expect(allTestCases).toHaveLength(83);
  expect(automatedIds).toEqual([...expectedAutomatedIds].sort());
  expect(allTestCases.length - automatedIds.length).toBe(49);
  expect(() => new TestCaseRegistry().validate(allTestCases)).not.toThrow();
});
```

- [ ] **Step 2: Run the baseline test and verify the current metadata fails**

Run:

```bash
node node_modules/@playwright/test/cli.js test tests/unit/test-cases/business-automation-baseline.spec.ts --project=framework
```

Expected: FAIL because the current catalog reports only the previously marked automated entries, not the exact 34-ID list.

- [ ] **Step 3: Update automation metadata using the verified primary paths**

Use this exact mapping. The first row, for example, becomes:

```ts
automation: {
  status: 'AUTOMATED' as const,
  scriptPath: 'tests/appointments/appointment-booking.mutating.spec.ts',
},
```

| Catalog ID                | Primary `scriptPath`                                          |
| ------------------------- | ------------------------------------------------------------- |
| `TC-APT-CREATE-001`       | `tests/appointments/appointment-booking.mutating.spec.ts`     |
| `TC-APT-CREATE-003`       | `tests/appointments/appointment-validation.read-only.spec.ts` |
| `TC-AUTH-FORGOT-001`      | `tests/authentication/password-recovery.otp.mutating.spec.ts` |
| `TC-AUTH-FORGOT-002`      | `tests/authentication/password-recovery.validation.spec.ts`   |
| `TC-AUTH-FORGOT-003`      | `tests/authentication/password-recovery.otp.mutating.spec.ts` |
| `TC-AUTH-LOGIN-001`       | `tests/authentication/login.positive.spec.ts`                 |
| `TC-AUTH-LOGIN-002`       | `tests/authentication/login.negative.spec.ts`                 |
| `TC-AUTH-LOGIN-003`       | `tests/authentication/login.negative.spec.ts`                 |
| `TC-AUTH-LOGIN-004`       | `tests/authentication/login.boundary.spec.ts`                 |
| `TC-AUTH-LOGIN-005`       | `tests/authentication/login.boundary.spec.ts`                 |
| `TC-AUTH-REGISTER-001`    | `tests/authentication/registration.production.spec.ts`        |
| `TC-AUTH-REGISTER-002`    | `tests/authentication/registration.validation.spec.ts`        |
| `TC-AUTH-REGISTER-003`    | `tests/authentication/registration.validation.spec.ts`        |
| `TC-AUTH-REGISTER-004`    | `tests/authentication/registration.validation.spec.ts`        |
| `TC-AUTH-REGISTER-005`    | `tests/authentication/registration.validation.spec.ts`        |
| `TC-AUTH-REGISTER-006`    | `tests/authentication/registration.validation.spec.ts`        |
| `TC-LIST-CREATE-001`      | `tests/listings/create-listing.mutating.spec.ts`              |
| `TC-LIST-CREATE-002`      | `tests/listings/create-listing.mutating.spec.ts`              |
| `TC-LIST-DETAIL-001`      | `tests/listings/listing-detail.read-only.spec.ts`             |
| `TC-LIST-DETAIL-002`      | `tests/listings/listing-detail.read-only.spec.ts`             |
| `TC-LIST-EDIT-001`        | `tests/component/pages/ListingFormComponent.spec.ts`          |
| `TC-LIST-EDIT-002`        | `tests/listings/edit-listing.mutating.spec.ts`                |
| `TC-LIST-FAVORITE-001`    | `tests/listings/favorite-listing.mutating.spec.ts`            |
| `TC-LIST-FAVORITE-002`    | `tests/listings/favorite-listing.mutating.spec.ts`            |
| `TC-LIST-FILTER-001`      | `tests/listings/filter-listing.read-only.spec.ts`             |
| `TC-LIST-FILTER-002`      | `tests/listings/filter-listing.read-only.spec.ts`             |
| `TC-LIST-REMOVE-001`      | `tests/listings/withdraw-listing.mutating.spec.ts`            |
| `TC-LIST-REMOVE-002`      | `tests/listings/withdraw-listing.mutating.spec.ts`            |
| `TC-LIST-SEARCH-001`      | `tests/listings/search-listing.read-only.spec.ts`             |
| `TC-LIST-VIEW-001`        | `tests/listings/view-own-listings.read-only.spec.ts`          |
| `TC-LIST-VIEW-002`        | `tests/listings/view-own-listings.read-only.spec.ts`          |
| `TC-PROFILE-CHANGEPW-004` | `tests/profile/change-password.validation.spec.ts`            |
| `TC-PROFILE-EDIT-002`     | `tests/profile/profile.validation.spec.ts`                    |
| `TC-PROFILE-VIEW-001`     | `tests/profile/profile.positive.spec.ts`                      |

Leave every other catalog entry's current status unchanged.

- [ ] **Step 4: Run catalog validation and the baseline test**

Run:

```bash
node node_modules/@playwright/test/cli.js test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/utils/TestCaseRegistry.spec.ts --project=framework
npx ts-node scripts/validate-test-cases.ts
```

Expected: both commands exit 0; the validator prints 83 total, 34 automated, and 49 not automated.

- [ ] **Step 5: Commit only the catalog baseline files**

```bash
git add tests/unit/test-cases/business-automation-baseline.spec.ts test-cases/appointments/appointment.test-cases.ts test-cases/authentication/login.test-cases.ts test-cases/authentication/password-recovery.test-cases.ts test-cases/authentication/profile.test-cases.ts test-cases/authentication/registration.test-cases.ts test-cases/listings/listing.test-cases.ts
git commit -m "test: record automated business coverage baseline"
```

---

### Task 2: Build catalog-driven selection and safe CLI arguments

**Files:**

- Create: `utils/business-test-selection.ts`
- Create: `tests/unit/utils/business-test-selection.spec.ts`

**Interfaces:**

- Consumes: `readonly TestCaseDefinition[]` and caller-provided Playwright arguments.
- Produces:
  - `BUSINESS_PROJECTS: readonly string[]`;
  - `BusinessCatalogSelection`;
  - `createBusinessCatalogSelection(testCases): BusinessCatalogSelection`;
  - `validateBusinessRunnerArgs(args): void`;
  - `buildBusinessPlaywrightArgs(selection, forwardedArgs): string[]`.

- [ ] **Step 1: Write failing selection tests**

```ts
import { expect, test } from '@playwright/test';
import type { TestCaseDefinition } from '../../../types/test-case.types';
import {
  BUSINESS_PROJECTS,
  buildBusinessPlaywrightArgs,
  createBusinessCatalogSelection,
  validateBusinessRunnerArgs,
} from '../../../utils/business-test-selection';

const testCase = (
  id: string,
  status: TestCaseDefinition['automation']['status'],
): TestCaseDefinition => ({
  id,
  title: id,
  module: 'Test',
  priority: 'medium',
  tags: [],
  preconditions: [],
  expectedResult: 'deterministic result',
  automation: { status },
});

test('derives sorted automated and backlog IDs without hard-coded totals', () => {
  const selection = createBusinessCatalogSelection([
    testCase('TC-Z-002', 'NOT_AUTOMATED'),
    testCase('TC-A-001', 'AUTOMATED'),
    testCase('TC-B-001', 'AUTOMATED'),
  ]);

  expect(selection.AutomatedIds).toEqual(['TC-A-001', 'TC-B-001']);
  expect(selection.NotAutomatedIds).toEqual(['TC-Z-002']);
  expect(selection.GrepSource).toBe('(?:^|\\s)(?:TC-A-001|TC-B-001)(?=\\s|$)');
});

test('escapes IDs and never matches a longer similarly prefixed token', () => {
  const selection = createBusinessCatalogSelection([testCase('TC-A.1', 'AUTOMATED')]);
  const pattern = new RegExp(selection.GrepSource);

  expect(pattern.test('[chromium] file › TC-A.1 variant')).toBe(true);
  expect(pattern.test('[chromium] file › TC-Ax1 variant')).toBe(false);
  expect(pattern.test('[chromium] file › TC-A.10 variant')).toBe(false);
});

test('rejects duplicate IDs and an empty automated selection', () => {
  expect(() =>
    createBusinessCatalogSelection([
      testCase('TC-A-001', 'AUTOMATED'),
      testCase('TC-A-001', 'NOT_AUTOMATED'),
    ]),
  ).toThrow(/Duplicate TestCaseId.*TC-A-001/);

  expect(() => createBusinessCatalogSelection([testCase('TC-A-001', 'NOT_AUTOMATED')])).toThrow(
    /No automated business test cases/,
  );
});

test('keeps catalog grep and canonical projects under runner control', () => {
  for (const args of [
    ['--grep', 'anything'],
    ['-g', 'anything'],
    ['--grep-invert', 'anything'],
    ['-G', 'anything'],
    ['--project=firefox'],
    ['--config=other.ts'],
    ['--reporter=line'],
  ]) {
    expect(() => validateBusinessRunnerArgs(args)).toThrow(/controlled by test:business/);
  }

  const selection = createBusinessCatalogSelection([testCase('TC-A-001', 'AUTOMATED')]);
  expect(buildBusinessPlaywrightArgs(selection, ['--list'])).toEqual([
    'test',
    ...BUSINESS_PROJECTS.map((project) => `--project=${project}`),
    '--grep',
    selection.GrepSource,
    '--list',
  ]);
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/utils/business-test-selection.spec.ts --project=framework
```

Expected: FAIL because `utils/business-test-selection.ts` does not exist.

- [ ] **Step 3: Implement the selection utility**

```ts
import type { TestCaseDefinition } from '../types/test-case.types';

export const BUSINESS_PROJECTS = Object.freeze([
  'framework',
  'chromium',
  'mutating-chromium',
  'appointment-mutating-chromium',
  'production-registration-chromium',
]);

export interface BusinessCatalogSelection {
  readonly CatalogTotal: number;
  readonly AutomatedIds: readonly string[];
  readonly NotAutomatedIds: readonly string[];
  readonly GrepSource: string;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createBusinessCatalogSelection = (
  testCases: readonly TestCaseDefinition[],
): BusinessCatalogSelection => {
  const seen = new Set<string>();
  for (const testCase of testCases) {
    if (seen.has(testCase.id)) {
      throw new Error(`Duplicate TestCaseId detected: ${testCase.id}`);
    }
    seen.add(testCase.id);
  }

  const automatedIds = testCases
    .filter(({ automation }) => automation.status === 'AUTOMATED')
    .map(({ id }) => id)
    .sort();
  const notAutomatedIds = testCases
    .filter(({ automation }) => automation.status !== 'AUTOMATED')
    .map(({ id }) => id)
    .sort();

  if (automatedIds.length === 0) {
    throw new Error('No automated business test cases are registered.');
  }

  return {
    CatalogTotal: testCases.length,
    AutomatedIds: Object.freeze(automatedIds),
    NotAutomatedIds: Object.freeze(notAutomatedIds),
    GrepSource: `(?:^|\\s)(?:${automatedIds.map(escapeRegex).join('|')})(?=\\s|$)`,
  };
};

const controlledOptions =
  /^(?:-g|-G|--grep(?:=|$)|--grep-invert(?:=|$)|--project(?:=|$)|--config(?:=|$)|--reporter(?:=|$))/;

export const validateBusinessRunnerArgs = (args: readonly string[]): void => {
  const forbidden = args.find((arg) => controlledOptions.test(arg));
  if (forbidden) {
    throw new Error(`${forbidden} is controlled by test:business.`);
  }
};

export const buildBusinessPlaywrightArgs = (
  selection: BusinessCatalogSelection,
  forwardedArgs: readonly string[],
): string[] => {
  validateBusinessRunnerArgs(forwardedArgs);
  return [
    'test',
    ...BUSINESS_PROJECTS.map((project) => `--project=${project}`),
    '--grep',
    selection.GrepSource,
    ...forwardedArgs,
  ];
};
```

- [ ] **Step 4: Run focused tests and formatting**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/utils/business-test-selection.spec.ts --project=framework
npx eslint utils/business-test-selection.ts tests/unit/utils/business-test-selection.spec.ts
npx prettier --check utils/business-test-selection.ts tests/unit/utils/business-test-selection.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the selection unit**

```bash
git add utils/business-test-selection.ts tests/unit/utils/business-test-selection.spec.ts
git commit -m "feat: derive business test selection from catalog"
```

---

### Task 3: Aggregate discovery, variants, retries, and ID status

**Files:**

- Create: `reporters/business-run-aggregation.ts`
- Create: `tests/unit/reporters/business-run-aggregation.spec.ts`
- Modify: `types/test-result.types.ts`

**Interfaces:**

- Consumes: catalog definitions, discovered Playwright tests from `Suite.allTests()`, and existing `TestExecutionResult` attempt records.
- Produces:
  - `BusinessDiscoveredTest`;
  - `BusinessRunSummary` and its nested coverage/execution types;
  - `aggregateBusinessRun(testCases, discoveredTests, executions): BusinessRunSummary`;
  - `formatBusinessRunSummary(summary): readonly string[]`.

- [ ] **Step 1: Add the result contracts required by the failing tests**

Append these exact backward-compatible definitions to `types/test-result.types.ts`, then add optional `Business?: BusinessRunSummary` to `TestRunResult`:

```ts
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
```

- [ ] **Step 2: Write failing aggregation tests**

Use this exact fixture pattern in `tests/unit/reporters/business-run-aggregation.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import {
  aggregateBusinessRun,
  formatBusinessRunSummary,
} from '../../../reporters/business-run-aggregation';
import type { TestCaseDefinition } from '../../../types/test-case.types';
import type { BusinessDiscoveredTest, TestExecutionResult } from '../../../types/test-result.types';

const catalogCase = (id: string, automated = true): TestCaseDefinition => ({
  id,
  title: id,
  module: 'Test',
  priority: 'medium',
  tags: [],
  preconditions: [],
  expectedResult: 'deterministic result',
  automation: { status: automated ? 'AUTOMATED' : 'NOT_AUTOMATED' },
});

const discovered = (id: string, testId: string, project = 'chromium'): BusinessDiscoveredTest => ({
  PlaywrightTestId: testId,
  Title: `${id} variant`,
  ProjectName: project,
});

const attempt = (
  id: string,
  testId: string,
  status: TestExecutionResult['Status'],
  retry: number,
  project = 'chromium',
): TestExecutionResult => ({
  TestCaseId: id,
  TraceabilityStatus: 'MAPPED',
  PlaywrightTestId: testId,
  Title: `${id} variant`,
  FilePath: 'tests/business.spec.ts',
  ProjectName: project,
  Status: status,
  DurationMs: 10,
  Retry: retry,
  Evidence: [],
});

test('counts one ID with multiple variants once and collapses retries to the final attempt', () => {
  const summary = aggregateBusinessRun(
    [catalogCase('TC-A-001'), catalogCase('TC-B-001', false)],
    [discovered('TC-A-001', 'variant-a'), discovered('TC-A-001', 'variant-b')],
    [
      attempt('TC-A-001', 'variant-a', 'FAILED', 0),
      attempt('TC-A-001', 'variant-a', 'PASSED', 1),
      attempt('TC-A-001', 'variant-b', 'SKIPPED', 0),
    ],
  );

  expect(summary.Coverage).toMatchObject({
    CatalogTotal: 2,
    AutomatedTotal: 1,
    NotAutomatedTotal: 1,
    DiscoveredAutomatedIds: ['TC-A-001'],
    MissingAutomatedIds: [],
    NotAutomatedIds: ['TC-B-001'],
  });
  expect(summary.Execution).toMatchObject({
    UniqueBusinessIdsSelected: 1,
    LogicalVariants: 2,
    InfrastructureTests: 0,
    ExecutionAttempts: 3,
    PassedVariants: 1,
    SkippedVariants: 1,
  });
  expect(summary.Execution.Ids).toEqual([
    {
      TestCaseId: 'TC-A-001',
      Status: 'PARTIAL',
      LogicalVariants: 2,
      ExecutionAttempts: 3,
    },
  ]);
});

test('reports discovery separately from zero execution attempts in list mode', () => {
  const summary = aggregateBusinessRun(
    [catalogCase('TC-A-001')],
    [discovered('TC-A-001', 'variant-a')],
    [],
  );

  expect(summary.Coverage.MissingAutomatedIds).toEqual([]);
  expect(summary.Execution).toMatchObject({
    UniqueBusinessIdsSelected: 1,
    LogicalVariants: 1,
    InfrastructureTests: 0,
    ExecutionAttempts: 0,
    NotRunVariants: 1,
  });
  expect(summary.Execution.Ids[0]?.Status).toBe('NOT_RUN');
});

test('fails validation for missing automated IDs and unknown discovered IDs', () => {
  const summary = aggregateBusinessRun(
    [catalogCase('TC-A-001')],
    [discovered('TC-UNKNOWN-001', 'unknown')],
    [],
  );

  expect(summary.HasValidationErrors).toBe(true);
  expect(summary.Coverage.MissingAutomatedIds).toEqual(['TC-A-001']);
  expect(summary.Coverage.UnknownIds).toEqual(['TC-UNKNOWN-001']);
  expect(summary.ValidationErrors).toEqual([
    'Automated IDs missing from Playwright discovery: TC-A-001',
    'Unknown test case IDs selected: TC-UNKNOWN-001',
  ]);
});

test('formats Business Coverage before Execution', () => {
  const lines = formatBusinessRunSummary(
    aggregateBusinessRun(
      [catalogCase('TC-A-001'), catalogCase('TC-B-001', false)],
      [discovered('TC-A-001', 'variant-a')],
      [attempt('TC-A-001', 'variant-a', 'PASSED', 0)],
    ),
  );

  expect(lines.indexOf('=== Business Coverage ===')).toBeLessThan(
    lines.indexOf('=== Business Execution ==='),
  );
  expect(lines).toContain('Automated IDs: 1/2');
  expect(lines).toContain('Not automated IDs (1): TC-B-001');
});
```

Add table-driven cases in the same file asserting these final ID statuses:

```ts
test.describe('ID status precedence', () => {
  const cases = [
    { statuses: ['PASSED'] as const, expected: 'PASSED' },
    { statuses: ['SKIPPED'] as const, expected: 'SKIPPED' },
    { statuses: ['PASSED', 'SKIPPED'] as const, expected: 'PARTIAL' },
    { statuses: ['PASSED', 'FAILED'] as const, expected: 'FAILED' },
    { statuses: ['PASSED', 'TIMED_OUT'] as const, expected: 'FAILED' },
    { statuses: ['PASSED', 'INTERRUPTED'] as const, expected: 'FAILED' },
  ];

  for (const { statuses, expected } of cases) {
    test(`${statuses.join('+')} aggregates to ${expected}`, () => {
      const tests = statuses.map((_, index) => discovered('TC-A-001', `variant-${index}`));
      const attempts = statuses.map((status, index) =>
        attempt('TC-A-001', `variant-${index}`, status, 0),
      );
      const summary = aggregateBusinessRun([catalogCase('TC-A-001')], tests, attempts);
      expect(summary.Execution.Ids[0]?.Status).toBe(expected);
    });
  }
});
```

- [ ] **Step 3: Run the tests and verify the missing aggregator failure**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/reporters/business-run-aggregation.spec.ts --project=framework
```

Expected: FAIL because `reporters/business-run-aggregation.ts` does not exist.

- [ ] **Step 4: Implement pure aggregation**

Implement `aggregateBusinessRun()` with these exact rules:

```ts
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
  if (statuses.every((status) => status === 'SKIPPED')) return 'SKIPPED';
  if (statuses.includes('PASSED') && statuses.includes('SKIPPED')) return 'PARTIAL';
  return 'PASSED';
};
```

The remaining implementation must:

- derive automated and backlog sets from the supplied catalog;
- parse discovered IDs with the existing `parseTestCaseId()`;
- sort every public ID array for deterministic JSON;
- create one variant per discovered `(ProjectName, PlaywrightTestId)` key;
- attach all attempts sharing that key and use only the highest `Retry` for final status;
- count attempts only for automated business variants;
- count discovered tests without a test-case ID as infrastructure and exclude them from business variants;
- emit `NOT_RUN` for discovered variants with no attempt;
- create one ID result for every automated ID;
- produce the two exact validation messages asserted above;
- return console lines with Business Coverage before Business Execution.

- [ ] **Step 5: Run focused aggregation verification**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/reporters/result-mapper.spec.ts --project=framework
npx eslint reporters/business-run-aggregation.ts tests/unit/reporters/business-run-aggregation.spec.ts types/test-result.types.ts
npx prettier --check reporters/business-run-aggregation.ts tests/unit/reporters/business-run-aggregation.spec.ts types/test-result.types.ts
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the aggregation unit**

```bash
git add reporters/business-run-aggregation.ts tests/unit/reporters/business-run-aggregation.spec.ts types/test-result.types.ts
git commit -m "feat: aggregate business coverage and executions"
```

---

### Task 4: Integrate business discovery into the tracking reporter

**Files:**

- Modify: `reporters/test-tracking-reporter.ts`
- Test: `tests/unit/reporters/business-run-aggregation.spec.ts`

**Interfaces:**

- Consumes: `BUSINESS_TEST_RUN=true`, optional `BUSINESS_RUN_ID`, `Suite.allTests()`, attempt records, and `aggregateBusinessRun()`.
- Produces: optional `TestRunResult.Business`, separate console sections, and a reporter-level failed status for mapping validation errors.

- [ ] **Step 1: Extend the existing aggregation test with real-catalog list discovery expectations**

```ts
import { allTestCases } from '../../../test-cases';

test('real catalog business baseline aggregates to 34 automated and 49 backlog IDs', () => {
  const automated = allTestCases.filter(({ automation }) => automation.status === 'AUTOMATED');
  const discoveredTests = automated.map(({ id }, index) => discovered(id, `variant-${index}`));
  const summary = aggregateBusinessRun(allTestCases, discoveredTests, []);

  expect(summary.Coverage).toMatchObject({
    CatalogTotal: 83,
    AutomatedTotal: 34,
    NotAutomatedTotal: 49,
    MissingAutomatedIds: [],
    UnknownIds: [],
  });
  expect(summary.Execution.NotRunVariants).toBe(34);
});
```

- [ ] **Step 2: Run the focused test before reporter integration**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/reporters/business-run-aggregation.spec.ts --project=framework
```

Expected: PASS, establishing the pure reporting contract before wiring Playwright lifecycle hooks.

- [ ] **Step 3: Capture discovered tests and emit optional business output**

Update the reporter imports and class state:

```ts
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { allTestCases } from '../test-cases';
import type {
  BusinessDiscoveredTest,
  TestExecutionResult,
  TestRunResult,
} from '../types/test-result.types';
import {
  aggregateBusinessRun,
  formatBusinessRunSummary,
} from './business-run-aggregation';

private readonly businessRun = process.env.BUSINESS_TEST_RUN === 'true';
private discoveredTests: BusinessDiscoveredTest[] = [];
```

In `onBegin`, preserve current start-time behavior, accept a safe runner-generated ID, and capture the filtered suite:

```ts
const suppliedRunId = process.env.BUSINESS_RUN_ID;
const safeBusinessRunId = /^BUSINESS-RUN-\d{14}-[a-f0-9]{4}$/;
this.runId =
  this.businessRun && suppliedRunId && safeBusinessRunId.test(suppliedRunId)
    ? suppliedRunId
    : `RUN-${dateStr}-${shortRandom}`;

if (this.businessRun) {
  this.discoveredTests = suite.allTests().map((testCase) => ({
    PlaywrightTestId: testCase.id,
    Title: testCase.title,
    ...(testCase.parent.project()?.name !== undefined
      ? { ProjectName: testCase.parent.project()!.name }
      : {}),
  }));
}
```

Change `onEnd()` to `onEnd(result: FullResult)` and construct the optional summary once:

```ts
const business = this.businessRun
  ? aggregateBusinessRun(allTestCases, this.discoveredTests, this.executions)
  : undefined;

const runResult: TestRunResult = {
  RunId: this.runId,
  StartedAt: this.startedAt.toISOString(),
  FinishedAt: finishedAt.toISOString(),
  DurationMs: finishedAt.getTime() - this.startedAt.getTime(),
  TotalExecutions: this.executions.length,
  MappedExecutions: mapped,
  UnmappedExecutions: unmapped,
  UnknownTestCaseIdExecutions: unknownId,
  UniqueMappedTestCaseIdsExecuted: uniqueMappedIds.size,
  PassedExecutions: passed,
  FailedExecutions: failed,
  SkippedExecutions: skipped,
  TimedOutExecutions: timedOut,
  InterruptedExecutions: interrupted,
  Results: this.executions,
  ...(business !== undefined ? { Business: business } : {}),
};
```

After the existing tracking summary, print the same pure formatter output:

```ts
if (business) {
  for (const line of formatBusinessRunSummary(business)) console.log(line);
}

if (business?.HasValidationErrors) return { status: 'failed' as const };
return result.status === 'passed' ? undefined : { status: result.status };
```

Do not change existing non-business JSON fields or console labels.

- [ ] **Step 4: Run reporter-focused and API compatibility tests**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/reporters tests/api/reporting.spec.ts --project=framework
npm run typecheck
```

Expected: reporter unit tests, reporting API tests, and typecheck exit 0.

- [ ] **Step 5: Commit reporter integration**

```bash
git add reporters/test-tracking-reporter.ts tests/unit/reporters/business-run-aggregation.spec.ts
git commit -m "feat: report business coverage separately"
```

---

### Task 5: Add the business runner and user-facing commands

**Files:**

- Create: `scripts/run-business-tests.ts`
- Modify: `package.json`
- Modify: `README.md:197-245`
- Test: `tests/unit/utils/business-test-selection.spec.ts`

**Interfaces:**

- Consumes: `allTestCases`, `TestCaseRegistry`, selection/argument utilities, forwarded CLI arguments.
- Produces: `npm run test:business`, `npm run test:framework`, and `npm run test:cross-browser`.

- [ ] **Step 1: Add runner argument and baseline-output assertions**

Append to `tests/unit/utils/business-test-selection.spec.ts`:

```ts
test('canonical project selection excludes Firefox and WebKit', () => {
  expect(BUSINESS_PROJECTS).toEqual([
    'framework',
    'chromium',
    'mutating-chromium',
    'appointment-mutating-chromium',
    'production-registration-chromium',
  ]);
  expect(BUSINESS_PROJECTS).not.toContain('firefox');
  expect(BUSINESS_PROJECTS).not.toContain('webkit');
});
```

- [ ] **Step 2: Run the focused selection test**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/utils/business-test-selection.spec.ts --project=framework
```

Expected: PASS; this locks the runner's canonical project boundary.

- [ ] **Step 3: Implement the shell-free TypeScript runner**

Create `scripts/run-business-tests.ts` with this structure:

```ts
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { allTestCases } from '../test-cases';
import { TestCaseRegistry } from '../utils/TestCaseRegistry';
import {
  buildBusinessPlaywrightArgs,
  createBusinessCatalogSelection,
} from '../utils/business-test-selection';

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const runId = `BUSINESS-RUN-${timestamp}-${crypto.randomBytes(2).toString('hex')}`;

new TestCaseRegistry().validate(allTestCases);
const selection = createBusinessCatalogSelection(allTestCases);
const playwrightArgs = buildBusinessPlaywrightArgs(selection, process.argv.slice(2));
const playwrightCli = require.resolve('@playwright/test/cli');

console.log('\n=== Business Coverage Baseline ===');
console.log(`Catalog IDs: ${selection.CatalogTotal}`);
console.log(`Automated IDs: ${selection.AutomatedIds.length}`);
console.log(`Not automated IDs: ${selection.NotAutomatedIds.length}`);
console.log(`Not automated ID list: ${selection.NotAutomatedIds.join(', ')}`);

const child = spawn(process.execPath, [playwrightCli, ...playwrightArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    BUSINESS_TEST_RUN: 'true',
    BUSINESS_RUN_ID: runId,
  },
  shell: false,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Unable to start Playwright business run: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Playwright business run interrupted by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
```

The direct Node CLI plus `shell: false` is required: the grep contains `|`, which a Windows `.cmd` shell can otherwise interpret as a pipe.

- [ ] **Step 4: Add package commands without changing `test`**

Add these scripts while preserving the existing `"test": "playwright test"` entry:

```json
"test:business": "ts-node scripts/run-business-tests.ts",
"test:framework": "playwright test --project=framework",
"test:cross-browser": "playwright test --project=chromium --project=firefox --project=webkit"
```

- [ ] **Step 5: Document command semantics in README**

Add a concise command section near the existing Playwright command documentation with these exact behavioral statements:

```markdown
### Business catalog execution

`npm run test:business` derives its test-case ID filter from `test-cases`. It runs every discovered
variant for catalog entries marked `AUTOMATED` on the canonical projects, while Business Coverage
counts each ID once. At the current baseline this is 34/83 automated IDs and 49 not automated IDs.

`npm run test:framework` checks unit, component, API, and reporting health independently.
`npm run test:cross-browser` performs browser compatibility execution independently and does not
change the business coverage numerator.

Use `npm run test:business -- --list` to validate discovery without executing application tests.
Mutating and external variants keep their existing environment gates and may be reported as skipped.
```

- [ ] **Step 6: Verify list-mode discovery end to end**

Run:

```bash
npm run test:business -- --list
```

Expected current baseline:

```text
Catalog IDs: 83
Automated IDs: 34
Not automated IDs: 49
Selected tests: 59 total
Business variants: 58
Infrastructure tests: 1 auth-setup
Unique discovered business IDs: 34
Execution attempts: 0
Missing automated IDs: 0
Unknown IDs: 0
```

The exact standard Playwright list wording may differ, but the business JSON and custom summary must contain the numeric values above and the command must exit 0.

- [ ] **Step 7: Run focused quality checks**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/utils/business-test-selection.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts --project=framework
npm run typecheck
npx eslint scripts/run-business-tests.ts utils/business-test-selection.ts reporters/business-run-aggregation.ts reporters/test-tracking-reporter.ts tests/unit/utils/business-test-selection.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts
npx prettier --check scripts/run-business-tests.ts utils/business-test-selection.ts reporters/business-run-aggregation.ts reporters/test-tracking-reporter.ts tests/unit/utils/business-test-selection.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts package.json README.md
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit runner and documentation**

```bash
git add scripts/run-business-tests.ts package.json README.md tests/unit/utils/business-test-selection.spec.ts
git commit -m "feat: add catalog-driven business test command"
```

---

### Task 6: Verify safe execution and unchanged existing selection

**Files:**

- Verify only; do not modify generated reports or application code.

**Interfaces:**

- Consumes: completed `test:business` command and all prior task outputs.
- Produces: fresh evidence that selection, aggregation, safety gates, and existing full-suite discovery meet the spec.

- [ ] **Step 1: Verify the focused implementation suite**

```bash
node node_modules/@playwright/test/cli.js test tests/unit/utils/business-test-selection.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/result-mapper.spec.ts tests/unit/utils/TestCaseRegistry.spec.ts --project=framework
```

Expected: all selected tests pass with zero failures.

- [ ] **Step 2: Verify catalog-only discovery**

```bash
npm run test:business -- --list
```

Expected: 34 unique automated IDs, 49 not automated IDs, 58 business variants, one infrastructure setup test, zero missing automated IDs, zero unknown IDs, and zero execution attempts.

- [ ] **Step 3: Execute the business command under current safety gates**

```bash
npm run test:business
```

Expected: the command runs canonical variants only; external/mutating scenarios without approval are explicitly skipped; Business Coverage remains 34/83; Execution reports variant and attempt counts separately. Any application-test failure remains a real non-zero result and is reported rather than hidden.

- [ ] **Step 4: Confirm default Playwright discovery is unchanged**

```bash
node node_modules/@playwright/test/cli.js test --list
```

Expected for the current repository baseline: 474 scheduled executions. If the user's concurrent test edits intentionally changed this baseline, compare project counts with the pre-implementation snapshot and confirm this feature introduced no `playwright.config.ts` diff.

- [ ] **Step 5: Run repository quality checks**

```bash
npm run typecheck
npm run lint
npm run format:check
```

Expected: all commands exit 0. If unrelated pre-existing dirty files fail a repository-wide command, record the exact file and rerun the same check scoped to this plan's files; do not modify or stage unrelated user changes.

- [ ] **Step 6: Audit the final diff and commit boundaries**

```bash
git status --short
git diff --stat HEAD~5..HEAD
git log -5 --oneline
```

Expected: implementation commits contain only the files named by Tasks 1-5; the user's unrelated pre-existing modifications remain unstaged and uncommitted.
