# Persistent Evidence Design

**Date:** 2026-08-25  
**Status:** Proposed for implementation approval  
**Scope:** Reporter-owned persistent evidence archive for Playwright results

## 1. Purpose and invariants

The reporting pipeline must not store long-lived references to Playwright's transient
`test-results` directory. The tracking reporter persists accepted attachments while they still
exist, publishes the run atomically, and only then exposes a manifest that may be imported into
SQLite.

The following invariants are mandatory:

- Screenshot is the default primary evidence for every actual browser `FAILED` result.
- An expected failure (`actual=failed`, `expected=failed`) is captured explicitly when that test
  used a live `page`; it must not be reclassified as unexpected to retain video.
- Video is retained only for unexpected browser failures according to Playwright's
  `retain-on-failure` policy.
- Unit, API, or framework failures without a page do not receive a fabricated screenshot.
- Trace is persisted when Playwright supplies it; the current trace-generation policy is not
  broadened.
- Markdown and text logs are supplementary evidence and are rendered as plain text only.
- `Status`, `ExpectedStatus`, Test Case ID, traceability, catalog data, and business behavior remain
  authoritative and unchanged.
- SQLite stores only POSIX-style relative paths below `EVIDENCE_ROOT`.
- No manifest or database row may contain a Playwright temporary path.
- Historical missing evidence is explicitly unavailable; it is never represented as present.
- Retention is disabled by default. Deletion is possible only through the explicit cleanup command.
- This design does not authorize staging, committing, pushing, merging, or opening a PR.

## 2. Persistent directory structure

`EVIDENCE_ROOT` defaults to `<workspace>/evidence`. It must not resolve to the workspace root,
filesystem root, or any configured Playwright output directory.

```text
evidence/
  .staging/
    <runId>-<archiveNonce>/
      <testCaseSegment>/
        <projectSegment>/
          <executionKey>/
            screenshot-01.png
            video-01.webm
            trace-01.zip
            error-context-01.md
            log-02.txt
      run-result.json
  .trash/
    <runId>-<cleanupNonce>/
  <runId>/
    <testCaseSegment>/
      <projectSegment>/
        <executionKey>/
          ...
    run-result.json
```

`testCaseSegment` is the mapped/parsed Test Case ID when it is a safe segment, otherwise a
collision-resistant sanitized segment. A missing ID uses `UNMAPPED`. A missing project name uses
`NO_PROJECT`. Attachment names never become directory names and never determine destination paths.

The manifest remains a `TestRunResult`. Its existing fields and evidence object shape remain
unchanged; only the meaning of `Evidence[].path` becomes strict: it is a finalized path relative to
`EVIDENCE_ROOT`, such as:

```text
BUSINESS-RUN-20260825090000-abcd/TC-PROFILE-EDIT-003/chromium/4e9.../screenshot-01.png
```

## 3. `EvidenceArchiveService` structure

The service is placed under `services/evidence/` and is the sole owner of archive filesystem I/O.
The module boundary is:

```text
services/evidence/
  evidence-contracts.ts       Public input/output/error types
  evidence-policy.ts          Role, MIME, extension, and failure classification helpers
  evidence-paths.ts           Segment, containment, execution-key, and relative-path helpers
  EvidenceArchiveService.ts   Staging, copy/write, manifest, finalize, rollback
```

Responsibilities are deliberately separated:

- `EvidenceArchiveService`: validate sources, write buffers/copy files, assign canonical names,
  stage, finalize, and rollback.
- Tracking reporter: derive execution metadata, call the archive service, and build the manifest
  only from returned persistent evidence records.
- Import script: validate a finalized manifest and all referenced files before opening the write
  transaction.
- `TestRunRepository`: write validated values to SQLite verbatim; it does not normalize paths or
  touch files.
- Evidence API: resolve relative paths under the same configured root, report availability, and
  stream allowlisted content.

No reporter or repository function may call `copyFile`, `writeFile`, `rename`, or `rm` for evidence
outside this service.

## 4. Service input/output contract

The service is asynchronous and dependency-injectable for unit testing.

```ts
export type EvidenceRole = 'SCREENSHOT' | 'VIDEO' | 'TRACE' | 'LOG' | 'OTHER';

export interface ArchiveAttachmentInput {
  readonly name: string;
  readonly contentType: string;
  readonly path?: string;
  readonly body?: Buffer;
}

export interface PersistExecutionInput {
  readonly runId: string;
  readonly testCaseId: string | null;
  readonly playwrightTestId: string;
  readonly projectName?: string;
  readonly repeatEachIndex: number;
  readonly retry: number;
  readonly attachments: readonly ArchiveAttachmentInput[];
  readonly approvedSourceRoots: readonly string[];
}

export interface PersistedEvidence {
  readonly type: EvidenceRole;
  readonly path: string; // POSIX path relative to EVIDENCE_ROOT
  readonly contentType: string;
}

export interface SkippedAttachment {
  readonly name: string;
  readonly reason: 'UNSUPPORTED_TYPE' | 'MISSING_PAYLOAD';
}

export interface PersistExecutionOutput {
  readonly executionKey: string;
  readonly evidence: readonly PersistedEvidence[];
  readonly skipped: readonly SkippedAttachment[];
}

export interface FinalizeRunInput {
  readonly runId: string;
  readonly manifest: TestRunResult;
}

export interface FinalizeRunOutput {
  readonly runDirectory: string; // absolute internal result, never written to DB
  readonly manifestPath: string; // absolute internal result for operator/import command
  readonly manifestRelativePath: string;
}
```

Lifecycle methods:

```ts
beginRun(runId: string): Promise<void>;
persistExecution(input: PersistExecutionInput): Promise<PersistExecutionOutput>;
finalizeRun(input: FinalizeRunInput): Promise<FinalizeRunOutput>;
rollbackRun(runId: string): Promise<void>;
```

`beginRun` creates one nonce-qualified staging directory on the same filesystem as the final root.
`persistExecution` accepts exactly one payload form per attachment (`path` XOR `body`). A body is
written directly; a path is copied after source validation. It never returns a temporary source
path. `finalizeRun` accepts only evidence paths previously returned by this service instance.

Unsupported attachments are returned as structured skips and do not enter the manifest. An
allowlisted attachment that cannot be read, copied, or written is a fatal archive error. That error
causes run rollback at `onEnd` and no manifest is published.

## 5. Stable, collision-resistant `executionKey`

The key is the lowercase, full 64-character SHA-256 hex digest of a versioned canonical identity:

```ts
JSON.stringify({
  version: 1,
  projectName: projectName ?? 'NO_PROJECT',
  playwrightTestId,
  repeatEachIndex,
  retry,
});
```

Object fields are emitted in the exact order above. Inputs are normalized to Unicode NFC before
serialization. The full digest avoids truncation risk, and `repeatEachIndex` plus `retry`
distinguishes repeated/retried attempts. The parent run directory separates different runs.

`persistExecution` fails with `EXECUTION_ALREADY_PERSISTED` if the same key is requested twice in
one run. It never merges or overwrites directories. This catches duplicate reporter callbacks and
turns even a theoretical identity collision into an explicit failure.

Human-readable segments use these rules:

- accept only `[A-Za-z0-9][A-Za-z0-9._-]{0,79}`;
- reject `.`, `..`, trailing dot/space, and Windows reserved device names;
- otherwise use `<safe-prefix>--<first-12-hex-of-SHA256(original)>`;
- cap the final segment at 80 characters.

Therefore two unsafe inputs that sanitize to the same prefix still receive different suffixes.

## 6. MIME/extension allowlist and role mapping

The same policy module is used by archive and streaming code. Matching requires both declared MIME
and final extension.

| Role         | Accepted MIME                  | Canonical extensions               | UI priority | Meaning                               |
| ------------ | ------------------------------ | ---------------------------------- | ----------: | ------------------------------------- |
| `SCREENSHOT` | `image/png`, `image/jpeg`      | `.png`, `.jpg`, `.jpeg`            |           1 | Primary visual evidence               |
| `VIDEO`      | `video/webm`                   | `.webm`                            |           2 | Unexpected browser-failure diagnostic |
| `TRACE`      | `application/zip`              | `.zip`                             |           3 | Playwright diagnostic trace           |
| `LOG`        | `text/plain`, `text/markdown`  | `.txt`, `.log`, `.md`, `.markdown` |           4 | Supplementary plain text              |
| `OTHER`      | `application/json`, `text/csv` | `.json`, `.csv`                    |           5 | Supplementary safe download           |

Rules:

- MIME matching is case-insensitive after stripping parameters such as `; charset=utf-8`.
- A trusted canonical extension is selected from the MIME and role. The service does not copy the
  caller's filename verbatim.
- Image MIME maps to `SCREENSHOT`, WebM to `VIDEO`, zip or a trace-named zip to `TRACE`, supported
  text/Markdown to `LOG`, and JSON/CSV to `OTHER`.
- HTML, SVG, JavaScript, XML, executables, arbitrary octet streams, and mismatched MIME/extensions
  are not persisted.
- The API sends `X-Content-Type-Options: nosniff`. Markdown is never transformed to HTML.
- Default canonical basenames are role-based and sequence-numbered within the execution. The
  source name may influence `error-context` versus `log`, but cannot add directories or change the
  allowed extension.

## 7. Path traversal and source validation

Every path crosses two independent validation boundaries.

### Source attachment boundary

For a path-backed attachment, the service:

1. Resolves and `realpath`s the source.
2. Resolves and `realpath`s each approved Playwright output root supplied from
   `FullConfig.projects[].outputDir`.
3. Requires the source to be a regular file whose real relative path is contained in one approved
   root.
4. Rejects symlinks that resolve outside those roots, directories, FIFOs, devices, and missing
   files.
5. Copies to a service-generated staging destination.

Buffer-backed attachments do not have a source-path boundary and are written only to generated
destinations.

### Persistent path boundary

All returned and imported evidence paths must:

- be non-empty POSIX-style relative paths;
- have no drive, UNC prefix, NUL, empty segment, `.` segment, or `..` segment;
- start with exactly `<runId>/` after finalize;
- resolve below `realpath(EVIDENCE_ROOT)`;
- resolve to a regular file for import/streaming;
- satisfy the shared role/MIME/extension allowlist.

Containment is based on `path.relative`, path-segment boundaries, and `realpath`; it never uses a
string-prefix check. Final destination components are generated, not accepted from clients.

## 8. Staging, finalize, and rollback

### Staging

- `beginRun` creates `EVIDENCE_ROOT/.staging/<runId>-<nonce>` with exclusive-create semantics.
- The nonce is cryptographically random and is never placed in DB paths.
- Every `persistExecution` writes only inside that staging run.
- Existing execution destinations or files are fatal; files are never overwritten.
- Evidence records held by the reporter already use their future final relative path
  `<runId>/...`, not the `.staging` path.

### Finalize

`onEnd` builds the complete manifest from service-returned records. The service then:

1. Validates that every manifest evidence record belongs to the active run and corresponds to a
   successfully staged file.
2. Writes `run-result.json.tmp` inside the staging run with exclusive-create semantics.
3. Flushes and closes the manifest, then renames it to `run-result.json` inside staging.
4. Verifies the final `<EVIDENCE_ROOT>/<runId>` does not exist.
5. Atomically renames the entire staging run directory to the final run directory.

Staging and final directories share the same parent filesystem, which is required for atomic rename.
The final directory becomes visible only after all attachments and the manifest are complete.

### Rollback and crash recovery

- Any fatal persistence or finalize error marks the reporter archive as failed.
- `onEnd` calls `rollbackRun`, which removes only the resolved nonce-qualified staging directory
  registered for that service instance.
- Rollback never deletes an existing finalized run and never computes a recursive-delete target
  from unvalidated input.
- No manifest is published and the reporter returns `{ status: 'failed' }`.
- A process crash may leave an old `.staging` directory. Runtime startup does not delete it.
  Cleanup may report stale staging directories and removes them only with an explicit apply mode.

## 9. Reporter integration (`onTestEnd` / `onEnd`)

`onBegin` stores all normalized project `outputDir` values as approved source roots and calls
`beginRun`. `onTestEnd` becomes asynchronous and performs this sequence:

1. Preserve the current Test Case ID and traceability resolution.
2. Preserve actual `Status`, `ExpectedStatus`, title, file, project, retry, errors, and duration.
3. Pass attachment `path`/`body`, test ID, project, `repeatEachIndex`, and retry to
   `persistExecution`.
4. Set `Evidence` only to the returned persistent evidence records.
5. Log structured unsupported skips without paths.
6. On fatal archive error, record the error state and continue collecting execution metadata with
   an empty evidence array; do not expose source paths.

`onEnd` waits for all persistence work, creates the unchanged run/business aggregate, and:

- if any fatal archive error exists, rolls back and returns reporter status `failed` without a
  manifest;
- otherwise calls `finalizeRun`, prints the finalized manifest path, and preserves the existing
  Playwright/business status return behavior.

The reporter never opens SQLite. Finalized manifest import remains a separate explicit operation.

## 10. Expected, unexpected, and actual business failure

These are separate dimensions, not mutually exclusive replacements for `Status`:

```ts
const isActualFailure = ['failed', 'timedOut', 'interrupted'].includes(actualStatus);
const isExpectedFailure = actualStatus === 'failed' && expectedStatus === 'failed';
const isUnexpectedFailure = actualStatus !== 'skipped' && actualStatus !== expectedStatus;
const isActualFailedBusinessExecution = traceabilityStatus === 'MAPPED' && isActualFailure;
```

Consequences:

- `test.fail(...)` that actually fails is both an expected failure and an actual failed business
  execution, but it is not an unexpected failure.
- A normal browser test that fails, times out, or is interrupted against a different expected status
  is unexpected.
- A `test.fail(...)` test that passes is unexpected because actual and expected differ, but it is not
  an actual failed business execution.
- No classification mutates `Status`, `ExpectedStatus`, traceability, or catalog aggregation.

The dashboard derives the expectation label from existing result fields and shows it beside the
authoritative status. No database column is added for a redundant derived value.

## 11. Expected-failure screenshot capture

A minimal fixture overrides Playwright's built-in `page` fixture in the canonical browser fixture
chain. Because the override executes only when a test actually requests `page`, it does not create a
page solely to manufacture evidence.

After `await use(page)`, the fixture checks:

```ts
testInfo.status === 'failed' && testInfo.expectedStatus === 'failed';
```

If true and the page is still usable, it captures a full-page PNG buffer and calls
`testInfo.attach('expected-failure-screenshot', { body, contentType: 'image/png' })`. The reporter
then persists the buffer in `onTestEnd`.

Screenshot capture failure is caught and attached as a plain-text supplementary diagnostic when
possible. It does not change test status or expected status. It does not enable video. Browser test
files must use the canonical fixture; an architecture test guards that rule for page-based business
tests using `test.fail(...)`.

Playwright configuration keeps:

- `screenshot: 'only-on-failure'` for unexpected failures;
- `video: 'retain-on-failure'`, which Playwright retains only when actual differs from expected;
- existing trace policy unchanged.

Project-level `screenshot: 'off'` and `video: 'off'` overrides are removed for browser projects so
the repository-wide policy is consistent. Framework/unit/API tests without `page` receive no fake
image.

## 12. DB import after successful archive

The only importable manifest is a finalized
`<EVIDENCE_ROOT>/<runId>/run-result.json`. The import script receives both the manifest path and the
resolved `EVIDENCE_ROOT` (environment default or injected dependency), then validates before any DB
write:

1. Manifest is inside the configured root, below a finalized run directory, and not below
   `.staging` or `.trash`.
2. Directory name equals `RunId`.
3. Zod validates all existing run/result fields plus evidence role, relative path, and MIME.
4. Every evidence path starts with `<RunId>/`, resolves inside the root, exists as a regular file,
   and matches the shared allowlist.
5. No evidence path contains `test-results` or resolves into any configured Playwright output root.

Only after the entire manifest passes does the script open the repository transaction. The
repository stores `ev.path` verbatim and removes its current `cwd`-relative normalization. A single
invalid/missing item aborts import; no run, result, or evidence rows are written.

Runs with zero evidence are valid if their manifest itself is finalized under the persistent run
directory. Existing run-ID idempotency behavior remains unchanged.

## 13. API/UI behavior and historical unavailable evidence

No evidence endpoint is renamed or removed.

`GET /api/results/:resultId/evidence` preserves its current fields and adds:

```json
{
  "available": false,
  "unavailableReason": "FILE_MISSING"
}
```

`unavailableReason` is present only when unavailable and is one of `FILE_MISSING`, `OUTSIDE_ROOT`,
or `UNSUPPORTED_TYPE`. `contentUrl` remains the endpoint identifier for backward compatibility, but
the new dashboard does not invoke it when `available` is false. Physical paths remain secret.

`GET /api/evidence/:evidenceId/content` keeps the existing safe `404`, `403`, and `400` responses.
It resolves relative DB paths against `EVIDENCE_ROOT`, validates real containment and the shared
allowlist, and streams finalized files after `test-results` is deleted.

For read-only backward compatibility, an old absolute DB path may still stream only when its
`realpath` is contained by the current `EVIDENCE_ROOT`. The reporter and importer never create a new
absolute-path row, and the API never falls back to the old `test-results` root.

Dashboard behavior:

- sort `SCREENSHOT`, `VIDEO`, `TRACE`, `LOG`, then `OTHER`;
- show screenshots first as primary evidence;
- show video controls and trace download next;
- place LOG/Markdown and OTHER in a supplementary section;
- load Markdown/text through `response.text()` and assign only `textContent` to a `<pre>`;
- never use `innerHTML` for evidence content;
- disable view/download for unavailable items and show one non-duplicated unavailable message;
- derive `Expected failure`, `Unexpected failure`, or `Actual failed business execution` labels
  from existing result fields without changing the authoritative status badge.

Historical DB rows are not rewritten and missing files are not synthesized. Paths from the old
`test-results` lifecycle will naturally report `OUTSIDE_ROOT` or `FILE_MISSING` under the persistent
root. There is no fallback lookup in `test-results`.

## 14. Cleanup and retention policy

There is no scheduled, startup, reporter, or API deletion. The default retention period is
unlimited.

The explicit command is:

```text
npm run evidence:cleanup -- --days <positive-integer> --dry-run
npm run evidence:cleanup -- --days <positive-integer> --apply
```

Exactly one mode is required; absence of a mode is an error. Candidates are complete finalized run
directories whose DB `finished_at` is older than the cutoff. Cleanup preserves `test_runs` and
`test_results` but deletes their `test_evidence` rows.

Dry-run performs no writes and reports run ID, evidence-row count, file count, and bytes without
printing absolute paths. Apply mode, intended for a maintenance window with the API stopped, does:

1. Validate every candidate and target under `EVIDENCE_ROOT`.
2. Atomically rename `<root>/<runId>` to `<root>/.trash/<runId>-<nonce>`.
3. In a DB transaction, delete only `test_evidence` rows joined through results for that run.
4. If DB deletion fails, roll back and rename the trash directory back.
5. After DB commit, remove the trash directory. If final physical removal fails, exit non-zero and
   leave the hidden trash directory for a later explicit cleanup; DB and dashboard already contain
   no evidence reference.

A candidate whose run directory is already missing can have its now-unavailable evidence rows
deleted during explicit apply, with a warning. Unknown directories and non-candidate runs are never
deleted. Stale `.staging`/`.trash` entries are listed separately and require an explicit cleanup
option plus age threshold; they are never included implicitly with normal run retention.

## 15. TDD test strategy

Implementation follows red-green-refactor in these layers:

1. **Policy/path unit tests:** deterministic execution key, repeat/retry separation, unsafe segment
   collision resistance, MIME/extension table, POSIX relative paths, traversal, UNC, drive paths,
   symlink escape, and source-root containment.
2. **Archive service unit tests:** body write, file copy, deterministic naming, duplicate execution
   rejection, unsupported skip, I/O failure, manifest validation, atomic finalize, rollback, existing
   final run refusal, and no overwrite.
3. **Reporter unit tests:** `onTestEnd` awaits persistence, keeps status/expected/traceability,
   records only returned paths, handles body attachments, omits unsupported/temp paths, rolls back
   on fatal persistence, and publishes only at `onEnd`.
4. **Fixture integration tests:** expected browser failure with a used page attaches screenshot and
   no video; unexpected browser failure has screenshot/video; a no-page expected framework failure
   has neither fabricated screenshot nor video.
5. **Import/repository tests:** finalized-manifest gate, full preflight before transaction, relative
   path storage verbatim, missing/path-traversal/temporary-path rejection, zero-evidence run, and
   idempotency.
6. **API tests:** persistent streaming, availability metadata, historical missing/outside evidence,
   allowlist, `nosniff`, and no physical path disclosure.
7. **UI tests:** priority order, unavailable controls, expected/unexpected label derivation, and
   Markdown displayed literally without executable HTML.
8. **Cleanup tests:** dry-run purity, explicit apply, whole-run scope, DB rollback plus directory
   restore, post-commit trash handling, missing directory, and broad-target rejection.

### Mandatory architecture acceptance test

One real subprocess-backed integration test must prove this exact chain:

```text
Playwright artifact
  -> EvidenceArchiveService persists during reporter onTestEnd
  -> reporter atomically finalizes run-result.json during onEnd
  -> import validates finalized files and writes relative DB paths
  -> test deletes the isolated Playwright test-results directory
  -> Evidence API still streams the screenshot and Markdown/log bytes from EVIDENCE_ROOT
```

The probe contains an expected browser failure, an unexpected browser failure, and a no-page
framework failure. Assertions include:

- expected browser failure has a persisted screenshot and no video;
- unexpected browser failure has a persisted screenshot and WebM video;
- no-page failure has no fabricated screenshot;
- trace is persisted if the probe policy produces one;
- DB paths are relative, start with the run ID, and contain no `test-results` segment;
- deleting the isolated transient directory succeeds before the API requests;
- screenshot and Markdown/log content endpoints return `200` with exact bytes/content types;
- Markdown payload containing HTML-like text is returned unchanged and the UI treats it as text;
- if persistence is deliberately failed, neither manifest nor DB contains a source path.

The test uses only temporary roots and a temporary SQLite database and validates resolved targets
before recursive deletion.

## 16. Backward compatibility

- Database schema remains unchanged.
- `TestEvidence` keeps `type`, `path`, and optional `contentType`; path semantics are tightened for
  newly imported manifests.
- Existing status, expected status, Test Case ID, traceability, catalog, aggregation, and result API
  fields remain unchanged.
- Existing evidence URLs remain valid route shapes.
- Evidence metadata additions are additive.
- Historical rows remain queryable; unavailable files are explicitly marked and content requests
  retain safe error responses.
- Old manifests stored under `test-results` are not accepted for new import because doing so would
  recreate the defect. Operators may retain DB history, but missing media cannot be recovered.
- Trace generation behavior is unchanged; only persistence of supplied trace attachments changes.

## 17. Verification commands and exit criteria

Focused verification uses the repository's `framework` project and scoped quality checks before any
broader suite:

```powershell
node node_modules/@playwright/test/cli.js test tests/unit/services/evidence tests/unit/reporters tests/unit/scripts/persistent-evidence-import.spec.ts tests/unit/scripts/evidence-cleanup.spec.ts --project=framework --reporter=line
node node_modules/@playwright/test/cli.js test tests/api/evidence.spec.ts tests/api/persistent-evidence-lifecycle.spec.ts tests/ui/run-details.spec.ts --project=framework --reporter=line --workers=1
npm run typecheck
npx eslint services/evidence fixtures/evidence.fixture.ts reporters/test-tracking-reporter.ts reporters/result-mapper.ts scripts/import-run-result.ts scripts/cleanup-evidence.ts database/repositories/TestRunRepository.ts server/services/EvidenceService.ts server/routes/evidence.routes.ts public/js/components/ResultDetailsModal.js tests/unit/services/evidence tests/unit/reporters tests/unit/scripts tests/api/evidence.spec.ts tests/api/persistent-evidence-lifecycle.spec.ts tests/ui/run-details.spec.ts tests/support/persistent-evidence*
npx prettier --check services/evidence fixtures/evidence.fixture.ts reporters/test-tracking-reporter.ts reporters/result-mapper.ts scripts/import-run-result.ts scripts/cleanup-evidence.ts database/repositories/TestRunRepository.ts server/services/EvidenceService.ts server/routes/evidence.routes.ts public/js/components/ResultDetailsModal.js tests/unit/services/evidence tests/unit/reporters tests/unit/scripts tests/api/evidence.spec.ts tests/api/persistent-evidence-lifecycle.spec.ts tests/ui/run-details.spec.ts tests/support/persistent-evidence* package.json .env.example .gitignore README.md
```

Exit criteria:

- all focused unit/API/UI/integration tests pass;
- the mandatory artifact-to-stream chain passes after physical deletion of `test-results`;
- typecheck, scoped ESLint, scoped Prettier, and `git diff --check` exit zero;
- no new DB evidence path is absolute, contains traversal, or references `test-results`;
- expected failure, unexpected failure, and actual failed business execution remain distinguishable;
- expected failures do not retain video solely because of `test.fail(...)`;
- no-page failures have no fabricated media;
- old missing evidence is shown as unavailable;
- cleanup is inert without an explicit mode and dry-run performs no writes;
- traceability/catalog/status behavior has no regression;
- no stage, commit, push, merge, or PR operation is performed.
