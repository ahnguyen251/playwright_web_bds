# Persistent Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` for every implementation task and `superpowers:verification-before-completion` before reporting completion. In a later execution session, use `superpowers:executing-plans`. Do not create a worktree, commit, or PR because the user explicitly prohibited Git write/integration operations.

**Goal:** Persist Playwright evidence outside `test-results`, import only finalized relative paths, and keep screenshot/video/trace/log evidence available after Playwright cleans transient output.

**Architecture:** The tracking reporter delegates archive writes to `EvidenceArchiveService`. A run is built below `EVIDENCE_ROOT/.staging` and published by atomic directory rename. A separate importer preflights the finalized manifest and files before the repository transaction. API/UI expose availability and prioritize visual evidence without rendering Markdown as HTML.

**Tech stack:** TypeScript 6, Node.js 20+, Playwright Test 1.62, SQLite/better-sqlite3, Express 5, Zod 4, vanilla browser JavaScript.

**Approved design:** [`docs/superpowers/specs/2026-08-25-persistent-evidence-design.md`](../specs/2026-08-25-persistent-evidence-design.md)

## Global constraints

- Do not stage, commit, push, merge, create a branch, or open a PR.
- Preserve unrelated dirty-worktree changes; do not reformat them.
- Do not change Test Case IDs, traceability, catalog status, `Status`, `ExpectedStatus`, or business behavior.
- Keep current trace-generation policy.
- DB evidence paths must be persistent POSIX relative paths; never normalize a temporary path.
- Use `apply_patch` for edits.
- Every task is red-green-refactor: add the focused failing assertion, observe the intended failure, implement the minimum behavior, rerun checks, and inspect the diff.
- Validate isolated temporary targets before recursive deletion.

## Planned file map

```text
config/evidence.config.ts                                      new
services/evidence/evidence-contracts.ts                        new
services/evidence/evidence-policy.ts                           new
services/evidence/evidence-paths.ts                            new
services/evidence/EvidenceArchiveService.ts                    new
fixtures/evidence.fixture.ts                                   new
scripts/cleanup-evidence.ts                                    new
tests/unit/config/evidence.config.spec.ts                      new
tests/unit/services/evidence/*.spec.ts                         new
tests/unit/fixtures/evidence.fixture.spec.ts                   new
tests/unit/scripts/persistent-evidence-import.spec.ts          new
tests/unit/scripts/evidence-cleanup.spec.ts                    new
tests/api/persistent-evidence-lifecycle.spec.ts                new
tests/support/persistent-evidence*.ts                          new

types/test-result.types.ts                                     modify
tsconfig.json                                                   modify
reporters/result-mapper.ts                                      modify
reporters/test-tracking-reporter.ts                             modify
tests/unit/reporters/*.spec.ts                                  modify
fixtures/auth.fixture.ts                                        modify
fixtures/test.fixture.ts                                        modify
playwright.config.ts                                            modify
scripts/import-run-result.ts                                    modify
database/repositories/TestRunRepository.ts                      modify
tests/unit/scripts/database-scripts.spec.ts                     modify
server/index.ts                                                 modify
server/services/EvidenceService.ts                              modify
server/routes/evidence.routes.ts                                modify
tests/api/evidence.spec.ts                                      modify
public/js/components/ResultDetailsModal.js                      modify
tests/ui/run-details.spec.ts                                    modify
tests/support/test-artifact-workspace.ts                        modify
package.json, .env.example, .gitignore, README.md               modify
```

No database migration is planned; the current `test_evidence(type, path, content_type)` table already represents a durable reference.

---

### Task 1: Lock configuration, roles, failure classification, and path policy

**Files:**

- Create: `config/evidence.config.ts`
- Create: `services/evidence/evidence-contracts.ts`
- Create: `services/evidence/evidence-policy.ts`
- Create: `services/evidence/evidence-paths.ts`
- Create: `tests/unit/config/evidence.config.spec.ts`
- Create: `tests/unit/services/evidence/evidence-policy.spec.ts`
- Create: `tests/unit/services/evidence/evidence-paths.spec.ts`
- Modify: `types/test-result.types.ts`
- Modify: `tsconfig.json`

**Required interfaces:**

```ts
export interface EvidenceConfiguration {
  readonly root: string;
}
export const resolveEvidenceConfiguration: (
  source?: NodeJS.ProcessEnv,
  cwd?: string,
) => EvidenceConfiguration;
export const classifyAttachment: (
  name: string,
  contentType: string,
) =>
  | { readonly role: EvidenceType; readonly contentType: string; readonly extension: string }
  | undefined;
export const classifyFailure: (
  actual: TestStatus,
  expected: TestStatus,
  traceability: TraceabilityStatus,
) => FailureClassification;
export const createExecutionKey: (identity: ExecutionIdentity) => string;
export const toSafeEvidenceSegment: (value: string | undefined, fallback: string) => string;
export const assertPersistentRelativePath: (value: string, runId: string) => void;
export const resolveContainedPath: (root: string, relativePath: string) => string;
```

- [ ] **Step 1: Write failing policy/config tests**

Cover the full MIME table, including `text/markdown; charset=utf-8`, and reject HTML, SVG, octet-stream, and mismatched extensions. Lock the independent failure axes:

```ts
expect(classifyFailure('failed', 'failed', 'MAPPED')).toEqual({
  actualFailure: true,
  expectedFailure: true,
  unexpectedFailure: false,
  actualFailedBusinessExecution: true,
});
expect(classifyFailure('failed', 'passed', 'MAPPED')).toMatchObject({
  expectedFailure: false,
  unexpectedFailure: true,
  actualFailedBusinessExecution: true,
});
expect(classifyFailure('passed', 'failed', 'MAPPED')).toMatchObject({
  actualFailure: false,
  unexpectedFailure: true,
});
```

Assert config defaults to `<cwd>/evidence`, accepts a dedicated root, and rejects filesystem root, workspace root, and `test-results`.

- [ ] **Step 2: Write failing path/key tests**

Test deterministic full SHA-256 output; project/test/repeat/retry separation; Unicode NFC normalization; collision-resistant unsafe segments; `.`, `..`, Windows devices, trailing dot/space, drive/UNC/NUL/traversal rejection; exact run-prefix enforcement; and sibling-prefix containment.

- [ ] **Step 3: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence/evidence-policy.spec.ts tests/unit/services/evidence/evidence-paths.spec.ts --project=framework --reporter=line
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement pure contracts**

Add `services/**/*.ts` to `tsconfig.json`. Reuse `EvidenceType`; do not create a competing union. Implement the exact allowlist and versioned full SHA-256 identity from the spec. Use `path.relative` segment checks, never string-prefix containment.

- [ ] **Step 5: Verify and inspect**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence/evidence-policy.spec.ts tests/unit/services/evidence/evidence-paths.spec.ts --project=framework --reporter=line
npx eslint config/evidence.config.ts services/evidence tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence types/test-result.types.ts
npx prettier --check config/evidence.config.ts services/evidence tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence types/test-result.types.ts tsconfig.json
git diff --check
git status --short
```

Expected: pass; read-only inspection only. Do not stage or commit.

---

### Task 2: Implement `EvidenceArchiveService`

**Files:**

- Create: `services/evidence/EvidenceArchiveService.ts`
- Create: `tests/unit/services/evidence/EvidenceArchiveService.spec.ts`
- Modify: `tests/support/test-artifact-workspace.ts`

**Required interface:**

```ts
export class EvidenceArchiveService {
  constructor(options: EvidenceArchiveServiceOptions);
  beginRun(runId: string): Promise<void>;
  persistExecution(input: PersistExecutionInput): Promise<PersistExecutionOutput>;
  finalizeRun(input: FinalizeRunInput): Promise<FinalizeRunOutput>;
  rollbackRun(runId: string): Promise<void>;
}
```

- [ ] **Step 1: Write failing happy-path tests**

Use isolated transient/persistent roots. Persist a path-backed Markdown file and buffer-backed PNG. Assert no final run exists before finalize; returned paths are future-final POSIX paths without `.staging`/`test-results`; staged bytes are exact; final directory contains both files and `run-result.json`; staging disappears after rename.

- [ ] **Step 2: Write failing security/rollback tests**

Cover unsupported HTML skip, missing payload skip, outside source, symlink escape where supported, non-regular source, duplicate execution key, existing final run, accepted attachment I/O failure, unreturned manifest path, rollback idempotency, and no overwrite. Fatal cases must publish no manifest or source path.

- [ ] **Step 3: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/services/evidence/EvidenceArchiveService.spec.ts --project=framework --reporter=line
```

Expected: FAIL because the service is absent.

- [ ] **Step 4: Implement minimum service behavior**

Use `node:fs/promises`, cryptographic nonce, exclusive creation, and service-generated destinations. Register the exact staging directory in private state before any rollback. Process attachments in input order with two-digit sequence names. Unsupported policy results are structured non-fatal skips; failures after policy acceptance are fatal. Write/flush/close `run-result.json.tmp`, rename it inside staging, then atomically rename the run directory.

- [ ] **Step 5: Verify**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/services/evidence --project=framework --reporter=line
npx eslint services/evidence tests/unit/services/evidence tests/support/test-artifact-workspace.ts
npx prettier --check services/evidence tests/unit/services/evidence tests/support/test-artifact-workspace.ts
git diff --check
git status --short
```

Expected: pass; no stage/commit.

---

### Task 3: Make the reporter orchestrate persistence and manifest publication

**Files:**

- Modify: `reporters/test-tracking-reporter.ts`
- Modify: `reporters/result-mapper.ts`
- Modify: `tests/unit/reporters/test-tracking-reporter.spec.ts`
- Modify: `tests/unit/reporters/result-mapper.spec.ts`

Add an injectable `EvidenceArchiver` interface plus optional `evidenceRoot`/`archiveService` reporter options. `onBegin` supplies normalized `FullConfig.projects[].outputDir` roots. `onTestEnd` becomes asynchronous.

- [ ] **Step 1: Write reporter tests first**

Change manifest expectations from `test-results/tracking/<runId>` to `evidence/<runId>`. Prove path/body forwarding with repeat/retry, awaited persistence, evidence built only from returned values, unsupported omission, unchanged status/expected/Test Case ID/traceability, fatal error rollback with no manifest, one finalize at `onEnd`, and unchanged business validation.

- [ ] **Step 2: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/reporters/test-tracking-reporter.spec.ts tests/unit/reporters/result-mapper.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts --project=framework --reporter=line
```

Expected: FAIL on synchronous temporary-path behavior.

- [ ] **Step 3: Wire lifecycle**

Initialize the archive at `onBegin`. In `onTestEnd`, persist first and set `Evidence` only from the service output. Keep a fatal archive-error state without logging physical paths. In `onEnd`, rollback/fail without manifest on archive error; otherwise finalize the unchanged aggregate and print the final manifest path. Remove direct reporter `mkdirSync`/`writeFileSync` calls.

- [ ] **Step 4: Verify reporter boundary**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/reporters tests/api/reporting.spec.ts --project=framework --reporter=line
npm run typecheck
npx eslint reporters services/evidence tests/unit/reporters
npx prettier --check reporters services/evidence tests/unit/reporters
git diff --check
git status --short
```

Expected: pass; no stage/commit.

---

### Task 4: Capture expected-failure screenshots without expected-failure video

**Files:**

- Create: `fixtures/evidence.fixture.ts`
- Create: `tests/unit/fixtures/evidence.fixture.spec.ts`
- Modify: `fixtures/auth.fixture.ts`
- Modify: `fixtures/test.fixture.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write failing fixture tests**

Prove: failed/expected-failed with used page attaches one `expected-failure-screenshot` PNG; an actual/expected mismatch does not use the special fixture attachment; no requested page creates no screenshot; capture error does not mutate statuses; every page-based business test using `test.fail(...)` imports the canonical fixture chain.

- [ ] **Step 2: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/fixtures/evidence.fixture.spec.ts --project=framework --reporter=line --workers=1
```

Expected: FAIL because the fixture is absent.

- [ ] **Step 3: Implement lazy page override**

Override `page`, call `await use(page)`, then capture a full-page PNG buffer only when `testInfo.status === 'failed' && testInfo.expectedStatus === 'failed'`. Catch capture errors without changing test classification. Compose `authTest` from this base so the existing fixture chain inherits it.

- [ ] **Step 4: Align Playwright media policy**

Keep root `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, and trace settings. Remove only browser-project screenshot/video `off` overrides. Preserve project gates, retries, workers, storage state, and trace overrides.

- [ ] **Step 5: Verify**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/fixtures/evidence.fixture.spec.ts tests/component/fixtures/test.fixture.spec.ts tests/unit/config --project=framework --reporter=line --workers=1
npm run typecheck
npx eslint fixtures/evidence.fixture.ts fixtures/auth.fixture.ts fixtures/test.fixture.ts playwright.config.ts tests/unit/fixtures/evidence.fixture.spec.ts
npx prettier --check fixtures/evidence.fixture.ts fixtures/auth.fixture.ts fixtures/test.fixture.ts playwright.config.ts tests/unit/fixtures/evidence.fixture.spec.ts
git diff --check
git status --short
```

Expected: pass; no Test Case/status/traceability changes and no stage/commit.

---

### Task 5: Gate DB import on finalized persistent files

**Files:**

- Modify: `scripts/import-run-result.ts`
- Modify: `database/repositories/TestRunRepository.ts`
- Create: `tests/unit/scripts/persistent-evidence-import.spec.ts`
- Modify: `tests/unit/scripts/database-scripts.spec.ts`

Extend importer dependencies with an injectable `evidenceRoot`. Keep `runImportRunResult` import-safe and its numeric return contract.

- [ ] **Step 1: Write failing preflight tests**

Prove valid screenshot/Markdown import with exact relative DB paths; reject manifests in `.staging`, `.trash`, `test-results`, or outside root; require parent directory equal `RunId`; reject missing file, directory, symlink escape, MIME mismatch, absolute/UNC/traversal, and wrong run prefix before any DB row; prevent partial import when a later item fails; accept finalized zero-evidence runs; preserve run-ID idempotency.

- [ ] **Step 2: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/database-scripts.spec.ts --project=framework --reporter=line
```

Expected: FAIL because evidence is `z.any()` and repository normalizes paths.

- [ ] **Step 3: Implement preflight and strict storage**

Validate finalized manifest location and every evidence file before `withDatabase`. Tighten only evidence fields while keeping unrelated additive manifest fields compatible. Remove `cwd`/absolute normalization from `TestRunRepository`; store validated paths verbatim inside the existing transaction.

- [ ] **Step 4: Verify**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/database-scripts.spec.ts tests/api/reporting.spec.ts --project=framework --reporter=line
npm run typecheck
npx eslint scripts/import-run-result.ts database/repositories/TestRunRepository.ts tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/database-scripts.spec.ts
npx prettier --check scripts/import-run-result.ts database/repositories/TestRunRepository.ts tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/database-scripts.spec.ts
git diff --check
git status --short
```

Expected: pass; no stage/commit.

---

### Task 6: Expose availability and prioritize dashboard evidence

**Files:**

- Modify: `server/index.ts`
- Modify: `server/services/EvidenceService.ts`
- Modify: `server/routes/evidence.routes.ts`
- Modify: `tests/api/evidence.spec.ts`
- Modify: `public/js/components/ResultDetailsModal.js`
- Modify: `tests/ui/run-details.spec.ts`

- [ ] **Step 1: Write failing API tests**

Use persistent relative paths for new fixtures and retain one absolute-inside-root record as legacy read compatibility. Assert `available: true`; `available: false` with `FILE_MISSING`, `OUTSIDE_ROOT`, or `UNSUPPORTED_TYPE`; all visual/text MIME combinations; exact bytes; `X-Content-Type-Options: nosniff`; safe dispositions/errors; and no physical path disclosure.

- [ ] **Step 2: Write failing UI tests**

Seed evidence in reverse order and require `SCREENSHOT`, `VIDEO`, `TRACE`, `LOG`, `OTHER` DOM order. Assert unavailable controls are disabled/no-op with one message. Use Markdown containing `<img src=x onerror=...>` and prove literal text with no generated image/script. Derive expected/unexpected/business-failure labels from existing status fields while preserving the status badge.

- [ ] **Step 3: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/api/evidence.spec.ts tests/ui/run-details.spec.ts --project=framework --reporter=line --workers=1
```

Expected: FAIL because availability and priority behavior are absent.

- [ ] **Step 4: Implement API/UI behavior**

Use `resolveEvidenceConfiguration` in `server/index.ts` so default root is `evidence`. Metadata computes availability without throwing and keeps route shapes. Streaming revalidates containment/existence/allowlist and sends `nosniff`. UI stable-sorts a copied list, separates primary/supplementary evidence, never requests unavailable content, and renders logs only through `response.text()` plus `pre.textContent`. Remove duplicate retry-error nodes.

- [ ] **Step 5: Verify**

```powershell
node node_modules/@playwright/test/cli.js test tests/api/evidence.spec.ts tests/api/reporting.spec.ts tests/ui/run-details.spec.ts tests/ui/dashboard.spec.ts tests/ui/test-case-details.spec.ts --project=framework --reporter=line --workers=1
npm run typecheck
npx eslint server/index.ts server/services/EvidenceService.ts server/routes/evidence.routes.ts public/js/components/ResultDetailsModal.js tests/api/evidence.spec.ts tests/ui/run-details.spec.ts
npx prettier --check server/index.ts server/services/EvidenceService.ts server/routes/evidence.routes.ts public/js/components/ResultDetailsModal.js tests/api/evidence.spec.ts tests/ui/run-details.spec.ts
git diff --check
git status --short
```

Expected: pass; no stage/commit.

---

### Task 7: Add explicit cleanup with DB/file synchronization

**Files:**

- Create: `scripts/cleanup-evidence.ts`
- Create: `tests/unit/scripts/evidence-cleanup.spec.ts`
- Modify if needed: `scripts/database-script-runtime.ts`
- Modify: `tests/unit/scripts/database-scripts.spec.ts`
- Modify: `tests/unit/config/package.scripts.spec.ts`
- Modify: `package.json`

**Runner contract:**

```ts
export interface CleanupEvidenceOptions {
  readonly evidenceRoot: string;
  readonly databasePath: string;
  readonly days: number;
  readonly mode: 'dry-run' | 'apply';
  readonly now?: () => Date;
}
export const runEvidenceCleanup: (
  options: CleanupEvidenceOptions,
  dependencies?: CleanupEvidenceDependencies,
) => Promise<number>;
```

- [ ] **Step 1: Write failing cleanup tests**

With fixed time and isolated DB/root, prove positive `--days` and exactly one mode are required; dry-run changes no byte/row; apply moves only an eligible whole run, deletes only its evidence rows, and preserves run/results; DB failure restores directory and rows; final trash-delete failure exits non-zero with hidden unreferenced trash; missing eligible directory is reconciled only by explicit apply; broad/sibling/unknown/fresh targets are never deleted; script is import-safe and closes DB.

- [ ] **Step 2: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/scripts/evidence-cleanup.spec.ts tests/unit/scripts/database-scripts.spec.ts tests/unit/config/package.scripts.spec.ts --project=framework --reporter=line
```

Expected: FAIL because command/script do not exist.

- [ ] **Step 3: Implement cleanup**

Select candidates from `test_runs.finished_at`. In apply mode atomically rename to `.trash`, delete evidence rows in a DB transaction, restore on DB failure, and purge trash after commit. Print only run IDs/counts/bytes. Add `"evidence:cleanup": "ts-node scripts/cleanup-evidence.ts"`. Do not add scheduler/startup cleanup.

- [ ] **Step 4: Verify**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/scripts/evidence-cleanup.spec.ts tests/unit/scripts/database-scripts.spec.ts tests/unit/config/package.scripts.spec.ts --project=framework --reporter=line
npm run typecheck
npx eslint scripts/cleanup-evidence.ts scripts/database-script-runtime.ts tests/unit/scripts/evidence-cleanup.spec.ts tests/unit/scripts/database-scripts.spec.ts tests/unit/config/package.scripts.spec.ts
npx prettier --check scripts/cleanup-evidence.ts scripts/database-script-runtime.ts tests/unit/scripts/evidence-cleanup.spec.ts tests/unit/scripts/database-scripts.spec.ts tests/unit/config/package.scripts.spec.ts package.json
git diff --check
git status --short
```

Expected: pass; only temporary test roots are deleted; no stage/commit.

---

### Task 8: Prove the mandatory Playwright-to-DB-to-API chain

**Files:**

- Create: `tests/support/persistent-evidence.playwright.config.ts`
- Create: `tests/support/persistent-evidence-browser-probe.spec.ts`
- Create: `tests/support/persistent-evidence-framework-probe.spec.ts`
- Create: `tests/api/persistent-evidence-lifecycle.spec.ts`

The support config receives isolated paths via environment, runs Chromium with one worker and the real reporter, and uses `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, and current trace policy. It must not load production configuration or repository DB data.

- [ ] **Step 1: Write the real subprocess acceptance test**

Spawn Playwright with `process.execPath`, `require.resolve('@playwright/test/cli')`, and `shell: false`. The probe includes: an expected browser failure using a page and `error-context.md`; an unexpected browser failure using a page; and an expected framework failure importing base Playwright without page. The unexpected test makes the child non-zero; assert this is expected and the reporter still finalized.

- [ ] **Step 2: Assert the exact lifecycle order**

```ts
// 1. confirm real files existed under isolated test-results
// 2. confirm reporter finalized persistent files and run-result.json
// 3. runImportRunResult(finalManifest, databasePath, { evidenceRoot })
// 4. query DB: every evidence path is relative and excludes test-results
// 5. validate resolved transient target, then rm(testResults, { recursive: true })
// 6. start createApp({ database, evidenceRoot })
// 7. GET screenshot and Markdown/log content: 200, exact bytes and MIME
```

Also prove expected browser failure has screenshot/no video, unexpected browser failure has screenshot/video, no-page failure has no fabricated media, and any produced trace is persisted. Confirm Markdown HTML-like text remains literal.

- [ ] **Step 3: Add fatal-persist negative coverage**

At reporter integration level, provide an allowlisted source that disappears before copy. Assert rollback, no final manifest, no DB run, and no source path serialized below `EVIDENCE_ROOT`.

- [ ] **Step 4: Observe RED, then correct only integration wiring**

```powershell
node node_modules/@playwright/test/cli.js test tests/api/persistent-evidence-lifecycle.spec.ts --project=framework --reporter=line --workers=1
```

Expected before final wiring: FAIL at the first missing link. Do not mock the child Playwright run, archive service, importer, SQLite, deletion, or HTTP stream. Correct environment injection/async cleanup only through production boundaries.

- [ ] **Step 5: Verify mandatory acceptance criterion**

```powershell
node node_modules/@playwright/test/cli.js test tests/api/persistent-evidence-lifecycle.spec.ts --project=framework --reporter=line --workers=1
git diff --check
git status --short
```

Expected: PASS, proving `Playwright artifact -> persist evidence -> import DB -> delete test-results -> API still streams`. No stage/commit.

---

### Task 9: Document configuration, retention, and backward compatibility

**Files:**

- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `tests/unit/config/package.scripts.spec.ts`
- Modify: `tests/unit/config/runtime-artifact-policy.spec.ts`

- [ ] **Step 1: Write failing policy assertions**

Require non-secret `EVIDENCE_ROOT=evidence`, root-only `/evidence/` ignore, finalized-manifest import instructions, both cleanup modes, unlimited default retention, plain-text Markdown, and explicit historical-unavailable behavior.

- [ ] **Step 2: Observe RED**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/config/package.scripts.spec.ts tests/unit/config/runtime-artifact-policy.spec.ts --project=framework --reporter=line
```

Expected: FAIL until documentation/config reflects the archive.

- [ ] **Step 3: Update operator documentation**

Document these flows and state that apply cleanup runs in an API maintenance window:

```powershell
$env:EVIDENCE_ROOT = 'evidence'
npm run db:import -- evidence/<runId>/run-result.json
npm run evidence:cleanup -- --days 90 --dry-run
npm run evidence:cleanup -- --days 90 --apply
```

Do not claim old missing files are recoverable and do not add automatic cleanup.

- [ ] **Step 4: Verify docs/config**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/config/package.scripts.spec.ts tests/unit/config/runtime-artifact-policy.spec.ts --project=framework --reporter=line
npx prettier --check .env.example .gitignore README.md package.json
git diff --check
git status --short
```

Expected: pass; unrelated dirty changes untouched; no stage/commit.

---

### Task 10: Final regression verification and exit audit

**Files:** Verify only; do not modify generated reports or production DB data to make a check pass.

- [ ] **Step 1: Run all focused evidence tests**

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence tests/unit/fixtures/evidence.fixture.spec.ts tests/unit/reporters tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/evidence-cleanup.spec.ts tests/api/evidence.spec.ts tests/api/persistent-evidence-lifecycle.spec.ts tests/ui/run-details.spec.ts --project=framework --reporter=line --workers=1
```

Expected: zero failures, including physical deletion of `test-results` before successful API requests.

- [ ] **Step 2: Run adjacent regression tests**

```powershell
node node_modules/@playwright/test/cli.js test tests/api/reporting.spec.ts tests/api/analytics.spec.ts tests/ui/dashboard.spec.ts tests/ui/test-case-details.spec.ts tests/component/fixtures/test.fixture.spec.ts --project=framework --reporter=line --workers=1
```

Expected: zero failures and unchanged run/result/dashboard behavior.

- [ ] **Step 3: Typecheck and scoped static checks**

```powershell
npm run typecheck
npx eslint config/evidence.config.ts services/evidence fixtures/evidence.fixture.ts fixtures/auth.fixture.ts fixtures/test.fixture.ts reporters/test-tracking-reporter.ts reporters/result-mapper.ts scripts/import-run-result.ts scripts/cleanup-evidence.ts database/repositories/TestRunRepository.ts server/index.ts server/services/EvidenceService.ts server/routes/evidence.routes.ts public/js/components/ResultDetailsModal.js tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence tests/unit/fixtures/evidence.fixture.spec.ts tests/unit/reporters tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/evidence-cleanup.spec.ts tests/api/evidence.spec.ts tests/api/persistent-evidence-lifecycle.spec.ts tests/ui/run-details.spec.ts tests/support/persistent-evidence.playwright.config.ts tests/support/persistent-evidence-browser-probe.spec.ts tests/support/persistent-evidence-framework-probe.spec.ts
npx prettier --check config/evidence.config.ts services/evidence fixtures/evidence.fixture.ts fixtures/auth.fixture.ts fixtures/test.fixture.ts reporters/test-tracking-reporter.ts reporters/result-mapper.ts scripts/import-run-result.ts scripts/cleanup-evidence.ts database/repositories/TestRunRepository.ts server/index.ts server/services/EvidenceService.ts server/routes/evidence.routes.ts public/js/components/ResultDetailsModal.js tests/unit/config/evidence.config.spec.ts tests/unit/services/evidence tests/unit/fixtures/evidence.fixture.spec.ts tests/unit/reporters tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/evidence-cleanup.spec.ts tests/api/evidence.spec.ts tests/api/persistent-evidence-lifecycle.spec.ts tests/ui/run-details.spec.ts tests/support/persistent-evidence.playwright.config.ts tests/support/persistent-evidence-browser-probe.spec.ts tests/support/persistent-evidence-framework-probe.spec.ts package.json .env.example .gitignore README.md tsconfig.json
```

Expected: all exit 0. Record unrelated pre-existing failures instead of changing unrelated files.

- [ ] **Step 4: Audit invariants read-only**

```powershell
rg -n "test-results.*run-result|run-result.*test-results" reporters scripts database server services
rg -n "writeFile|copyFile|rename|rm" reporters database/repositories/TestRunRepository.ts
rg -n "innerHTML" public/js/components/ResultDetailsModal.js
git diff --check
git status --short
```

Expected: no reporter/DB temp references; reporter/repository do not own evidence file I/O; evidence content never uses `innerHTML`; only intended files plus pre-existing changes are present; index remains untouched.

- [ ] **Step 5: Record exit criteria**

Confirm explicitly:

1. screenshot for every actual browser failure with a page;
2. video only for unexpected browser failure;
3. no fake media for no-page failure;
4. trace persisted only when supplied;
5. LOG/Markdown supplementary and plain text;
6. DB contains only finalized relative paths;
7. historical missing evidence is unavailable;
8. cleanup requires an explicit mode and retention is unlimited by default;
9. mandatory deletion-and-stream chain passes;
10. Test Case ID, traceability, catalog, `Status`, and `ExpectedStatus` have no regression;
11. no stage, commit, push, merge, branch, or PR action occurred.
