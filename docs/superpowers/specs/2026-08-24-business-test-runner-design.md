# Catalog-Driven Business Test Runner Design

## Purpose

Add one command, `npm run test:business`, that treats the 83 entries in `test-cases` as the
business-test catalog, runs every existing automated variant belonging to the catalog entries marked
`AUTOMATED`, and reports the remaining entries as not automated.

At the current baseline the command must report 34 automated catalog IDs and 49 not-automated
catalog IDs. These numbers are derived from the catalog and test mappings rather than hard-coded, so
the report updates automatically as coverage grows.

## Constraints

The existing Playwright architecture remains intact. Existing projects, fixtures, Page Objects,
workflows, safety gates, reporters, and test locations are reused. The design does not move tests,
remove framework tests, change `npm test`, or combine business coverage with framework health.

The dedicated business command uses Chromium as the canonical browser. Firefox and WebKit remain a
separate cross-browser concern so they do not multiply business coverage numbers. Authentication
setup required by the selected projects still runs, but setup executions are infrastructure and do
not count toward business coverage.

## Source of truth

`allTestCases` remains the authoritative catalog. Each catalog entry contributes exactly once to
business coverage, regardless of how many Playwright variants, projects, retries, or attempts use
its ID.

Before enabling the command, the current catalog metadata is synchronized with executable evidence:

- the 34 IDs currently found in executable business-test titles are marked `AUTOMATED`;
- the other 49 entries remain `NOT_AUTOMATED`;
- an automated entry retains a primary `automation.scriptPath` where required by the current type;
- additional variants are discovered by exact test-case ID in the Playwright title and do not require
  a catalog schema change.

The runner never promotes a catalog entry to `AUTOMATED` merely because its ID looks valid. Metadata
changes require an executable matching test.

## Command and selection flow

`npm run test:business` invokes a TypeScript runner that:

1. loads `allTestCases`;
2. rejects duplicate catalog IDs;
3. separates `AUTOMATED` and `NOT_AUTOMATED` IDs;
4. builds an escaped, token-boundary-safe Playwright grep filter from the automated IDs;
5. invokes the existing Playwright configuration with only the canonical business-relevant projects;
6. preserves current project dependencies and mutation/external safety gates;
7. forwards the Playwright exit status after coverage validation.

The selected projects are the existing `framework`, `chromium`, `mutating-chromium`,
`appointment-mutating-chromium`, and `production-registration-chromium` projects. The title filter
prevents the 310 general framework tests from entering this run; only framework/component variants
whose titles begin with one of the automated catalog IDs are selected. Firefox and WebKit are not
selected.

Playwright applies `grep` to a composite string containing the project, file, suites, and test title,
so the CLI filter matches an ID as a complete whitespace-delimited token anywhere in that composite
string. The reporter separately requires the ID to be the exact first token of `test.title`. For
example, `TC-LIST-CREATE-001` matches that ID and its titled variants but cannot match a longer,
similarly prefixed ID.

The runner forwards useful Playwright arguments, including `--list`, without allowing callers to
silently replace the catalog-derived ID filter.

## Business Coverage versus Execution

The output contains two explicitly separate sections.

### Business Coverage

Business Coverage describes catalog completeness and counts IDs, not test executions:

```text
Catalog IDs: 83
Automated IDs: 34
Not automated IDs: 49
Automated IDs discovered in this run: 34
Automated IDs missing from this run: 0
Unknown IDs: 0
```

The report lists the 49 not-automated IDs and any automated ID for which Playwright discovered no
variant. A catalog ID is counted once even when it has multiple variants.

Coverage status is independent from a runtime pass or failure. `AUTOMATED` means executable
automation exists; it does not mean the latest execution passed.

### Execution

Execution describes what Playwright actually attempted:

```text
Unique business IDs selected: 34
Logical variants: <dynamic>
Execution attempts: <dynamic>
Passed variants: <dynamic>
Failed variants: <dynamic>
Skipped variants: <dynamic>
```

This section may contain more than 34 variants because one business ID can intentionally own several
tests, such as normal, video, and broker variants.

Framework-only, setup, and reporter self-tests do not affect Business Coverage. Required setup may
be shown separately as infrastructure execution but is excluded from business totals.

## Variant and retry aggregation

Aggregation follows these rules:

1. A business ID is parsed from the exact first token of the test title and must exist in the
   automated-ID allowlist.
2. `PlaywrightTestId` identifies a logical variant. The same ID used by different tests or projects
   represents different variants.
3. Multiple attempts for one `PlaywrightTestId` are retries, not additional variants. Only the final,
   highest retry determines the logical variant's final status; every attempt remains available in
   the detailed execution data.
4. All final variant statuses are aggregated into one ID-level execution status:
   - `FAILED` when any final variant is failed, timed out, or interrupted;
   - `PARTIAL` when at least one final variant passed and at least one was skipped;
   - `PASSED` when every final variant passed;
   - `SKIPPED` when every final variant was skipped;
   - `NOT_RUN` when no matching variant was discovered.
5. ID-level status never changes the catalog's `AUTOMATED` or `NOT_AUTOMATED` classification.

This prevents browser/project duplication, variants, and retries from inflating the 34/83 coverage
figure while preserving their execution detail.

## Reporting integration

Aggregation is implemented as a pure reporting utility with unit tests. The existing tracking
reporter reuses it for business runs and keeps its current execution records backward-compatible.
Business-specific summary fields are additive and are emitted only when the dedicated runner marks
the invocation as a business run.

The reporter derives discovered business IDs from the filtered suite received by `onBegin`, not from
completed executions. As a result, `npm run test:business -- --list` can validate all mappings while
reporting zero execution attempts. The business runner and reporter exchange an explicit run
context/output path rather than selecting the newest result directory after execution. Concurrent or
interrupted runs therefore cannot attach coverage to the wrong result file.

Console output and the JSON result use the same aggregation result. The console presents Business
Coverage first and Execution second; the JSON preserves per-attempt records plus ID- and
variant-level summaries.

## Validation and failure behavior

The command exits non-zero when:

- a catalog ID is duplicated;
- an `AUTOMATED` ID has no discovered Playwright variant;
- a selected title contains an unknown test-case ID;
- any selected variant finishes failed, timed out, or interrupted;
- the runner or reporter cannot write its result.

Skipped variants do not by themselves fail the command because existing external and mutating safety
gates intentionally skip tests when approval or environment prerequisites are absent. They are
reported as `SKIPPED` or `PARTIAL`, never as passed.

The 49 `NOT_AUTOMATED` entries are expected backlog and do not fail the command. They are always
listed so a green execution cannot be mistaken for 83/83 automated coverage.

## Commands and separation

The user-facing command model is:

```text
npm run test:business       catalog-driven business variants on canonical projects
npm run test:framework      unit, component, API, and dashboard health
npm run test:cross-browser  separately selected browser compatibility coverage
npm run test                existing complete Playwright behavior, unchanged
```

`test:framework` and `test:cross-browser` may reuse current Playwright project selection; this design
does not redefine their test content beyond providing the explicit separation requested by the user.

## Verification

Focused tests cover:

- catalog duplicate detection;
- safe regular-expression construction for test-case IDs;
- exact title matching and similarly prefixed IDs;
- one ID with multiple variants;
- retry collapse to the final attempt;
- `PASSED`, `PARTIAL`, `FAILED`, `SKIPPED`, and `NOT_RUN` aggregation;
- separation of infrastructure/unmapped executions from business metrics;
- missing automated IDs and unknown IDs;
- exit-code preservation and validation failure behavior.

Implementation verification includes:

1. `npm run typecheck`;
2. the focused unit tests for selection and aggregation;
3. `npm run test:business -- --list` to prove catalog-driven discovery without executing live tests;
4. a safe business run under the current environment gates;
5. confirmation that existing `npm test` project selection remains unchanged.

## Non-goals

- automating the remaining 49 catalog entries;
- deleting or weakening the 310 framework tests;
- changing current Playwright project definitions or fixture architecture;
- fixing the existing broad end-to-end `testMatch` regex as part of this change;
- running all business variants on Firefox and WebKit;
- treating skipped gated tests as passed;
- forcing a one-to-one relationship between one catalog ID and one Playwright test;
- changing application behavior or production mutation approvals.

## Acceptance criteria

The design is complete when one command derives its selection from the catalog, selects every
existing variant for the automated IDs on canonical projects, and produces separate Business
Coverage and Execution summaries. At the current baseline it reports 34/83 automated IDs and lists
49 not-automated IDs without counting variants or retries as additional coverage.

The implementation must preserve all existing Playwright projects and safety gates, exclude general
framework tests and cross-browser multiplication from the business command, keep detailed execution
attempts, and fail clearly for missing mappings, unknown IDs, duplicate catalog IDs, or failed
business variants.
