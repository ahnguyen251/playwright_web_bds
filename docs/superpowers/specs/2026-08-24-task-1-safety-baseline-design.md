# Task 1 — Safety Baseline Design Specification

## Scope and decision record

This specification defines Task 1 of the approved risk-first, traceability-first remediation
sequence. It is design-only: it does not authorize implementation, staging, committing, pushing,
merging, production mutation, or execution of external/mutating end-to-end tests.

The design makes four binding safety decisions:

1. importing an application, service, configuration, or database module must not open a database,
   start a server, load `.env`, create a directory, or write an artifact;
2. `TEST_ENV` is required and has no default. The only website target currently supported is selected
   explicitly with `TEST_ENV=production`, while all existing OTP and mutation gates remain
   fail-closed;
3. every database, HTTP server, temporary directory, and evidence workspace has one explicit owner
   that closes or removes it in an awaited lifecycle;
4. the existing `data/autotest.db` file is preserved byte-for-byte and in place. Removing it from
   the Git index is a separate Git operation because `git rm --cached` stages a deletion and is
   incompatible with the current instruction not to stage changes.

No business rule, endpoint contract, catalog status, traceability mapping, assertion, or mutation
gate changes in Task 1.

### Revision summary — 2026-08-25

The previous proposal to default a missing `TEST_ENV` to `dev` is withdrawn. The project has no
separate dev or staging business website, so a missing target now fails validation. Framework/unit/
internal API isolation is described as a test-owned framework environment, not as a dev website.
The existing production website remains the explicit target for read-only and gated mutating E2E.

## 1. Current problem

The current safety baseline has four concrete failure modes.

### 1.1 Environment selection is unsafe by default

`config/environment.schema.ts` defaults `TEST_ENV` to `production`, and `.env.example` also selects
production while containing real-looking Propify/DuckDNS endpoints. A missing or partially loaded
environment can therefore target a live website without an explicit target choice. The schema also
requires dev and staging URLs even though those business websites do not exist, encouraging false
aliases that point multiple environment names at the same production website. In addition,
`config/environment.config.ts` imports `dotenv/config` at module scope, so merely importing the
configuration parser mutates `process.env`.

The existing OTP and mutation booleans default to `false` and the production mutation approvals are
already multi-gated. Those controls are correct and must not be weakened.

### 1.2 Application imports can acquire a shared runtime database

`server/app.ts` exports `createApp(db?, evidenceRoot?)` and also executes `createApp()` to build a
default export. Route factories and `ReportingService`, `DashboardService`, and `EvidenceService`
accept optional dependencies and fall back to `getDefaultDatabase()`. That fallback lazily opens the
workspace file `data/autotest.db` and keeps it in a module singleton.

Consequences include import-time file access, hidden connection ownership, shared state between
tests, no reliable shutdown point, and a health endpoint that can report `ok` without actually
checking a database when no connection was supplied.

### 1.3 A runtime database is treated as repository content

`data/autotest.db` is tracked by Git and is currently modified in the user's dirty worktree. The
schema contains run results, errors, stacks, and evidence paths, so the database is runtime state and
may contain machine-specific or sensitive diagnostic data. The canonical source should be schema
and migration code, not a binary database snapshot.

The current no-stage/no-commit constraint means Task 1 cannot safely execute the index operation
needed to untrack the already tracked file. Adding an ignore rule alone does not untrack it.

### 1.4 Test artifacts are not fully test-owned

`tests/api/evidence.spec.ts` creates a fixed `outside-file.png` in the workspace and suppresses
cleanup errors. `tests/ui/run-details.spec.ts` uses a fixed `.temp-ui-test` directory and also
suppresses cleanup errors. Other API tests create file-backed databases in the repository root and
close HTTP servers without awaiting the close callback.

These patterns can collide across workers, erase a user-owned file with the same name, leave open
handles on Windows, or hide cleanup regressions behind a passing test.

## 2. Desired architecture

The target architecture separates pure construction from resource-owning composition roots.

```text
process entrypoint
  -> explicitly load process environment
  -> explicitly choose runtime paths
  -> open and initialize one database connection
  -> construct createApp({ database, evidenceRoot })
  -> start HTTP server
  -> await server close, then close database

unit/API/UI test fixture
  -> create unique test-owned workspace
  -> open :memory: DB (or unique file only when file behavior is under test)
  -> initialize schema
  -> construct createApp({ database, evidenceRoot })
  -> run assertions
  -> await server close, close DB, remove owned workspace
```

### 2.1 Pure modules

The following operations are pure with respect to external resources:

- `loadEnvironmentConfig(source)` validates only the supplied object and has no default argument;
- importing `database/sqlite.ts` does not open a connection or create a directory;
- `createApp(dependencies)` constructs Express middleware only;
- route and service constructors require their dependencies and never call a global locator;
- importing `server/app.ts` or `server/runtime.ts` does not listen on a port.

### 2.2 Explicit process environment loader

`config/environment.config.ts` remains the pure parser. A new
`config/process-environment.config.ts` owns the call to `dotenv.config()` and exposes
`loadProcessEnvironmentConfig()`. Playwright configuration and fixtures that intentionally consume
the process environment use that function. Tests continue to call the pure parser with an explicit
object.

`TEST_ENV` has no schema default. The current supported website-target schema uses
`z.literal('production')`, requires `PRODUCTION_BASE_URL`, and retains the existing optional
`API_BASE_URL` name to avoid an unrelated rename. `DEV_BASE_URL` and `STAGING_BASE_URL` are removed
from the active configuration because no such websites exist. Missing `TEST_ENV` and unknown values
both fail validation.

This production-only literal is the minimal-change truthful model. Keeping the current three-value
enum would require conditional optional URL fields and would continue advertising targets that cannot
be executed. If a real additional website environment is provisioned later, the schema can be
extended to a discriminated union keyed by `TEST_ENV`, with each target requiring its own real URL.
The broader `TestEnvironment` type may remain temporarily as an extension seam for pure policy-unit
tests, but the process configuration loader accepts only the currently deployed `production` target.
It must not make dev/staging executable or map them to production. Mutation and OTP defaults,
cross-field checks, and production approvals remain unchanged.

### 2.3 Dependency contract

`createApp` has one required object argument:

```ts
interface AppDependencies {
  readonly database: DatabaseConnection;
  readonly evidenceRoot: string;
}

export function createApp(dependencies: AppDependencies): Express;
```

There is no default Express app export and no compatibility overload with optional parameters.
All in-repository consumers are known and will be migrated mechanically. This intentionally makes a
missing dependency a compile-time failure instead of silently opening the runtime database.

Routes receive the same required dependencies, and services require `DatabaseConnection` (plus an
absolute evidence root for `EvidenceService`). `healthRoutes` always checks the injected database.

### 2.4 Resource owners

- `server/index.ts` is the executable composition root. A small testable `server/runtime.ts` owns
  database initialization, HTTP listening, idempotent shutdown, and signal handling.
- each database CLI script opens its selected connection locally and closes it in `finally`;
- `createApp`, routes, services, and repositories borrow the injected connection and never close it;
- Playwright's tracking reporter owns only its output directory/files. It does not open the SQLite
  database; database import remains the explicit responsibility of `db:import`;
- tests own only resources created by their fixture/workspace and clean up exactly those paths.

## 3. Files affected

The implementation plan may reduce this list if a narrower change meets every acceptance criterion,
but it must not expand into business behavior.

### Environment lifecycle

- `.env.example`
- `config/environment.schema.ts`
- `config/environment.config.ts`
- new `config/process-environment.config.ts`
- `playwright.config.ts`
- `fixtures/auth.fixture.ts`
- `fixtures/appointment.fixture.ts`
- `fixtures/mutating.fixture.ts`
- `tests/unit/config/environment.config.spec.ts`
- `tests/unit/config/package.scripts.spec.ts` only where it asserts the environment key contract
- `README.md` and environment/runbook wording that currently advertises nonexistent dev/staging
  website targets; no Test Case ID, mapping, status, or traceability relationship may change
- new focused tests for process-environment loading, if the behavior cannot be covered without
  mutating the current process

### Database and application lifecycle

- `database/sqlite.ts`
- new `database/runtime-database.ts`
- `server/app.ts`
- new `server/runtime.ts`
- `server/index.ts`
- `server/routes/index.ts`
- `server/routes/health.routes.ts`
- `server/routes/dashboard.routes.ts`
- `server/routes/evidence.routes.ts`
- `server/routes/results.routes.ts`
- `server/routes/runs.routes.ts`
- `server/routes/test-cases.routes.ts`
- `server/services/ReportingService.ts`
- `server/services/DashboardService.ts`
- `server/services/EvidenceService.ts`
- `scripts/init-db.ts`
- `scripts/import-run-result.ts`
- `scripts/query-verification.ts`
- `scripts/sync-test-cases.ts`
- all API/UI tests that call `createApp`
- new focused application/runtime lifecycle tests

### Runtime data and artifact cleanup

- `.gitignore`
- `tests/api/evidence.spec.ts`
- `tests/api/analytics.spec.ts`
- `tests/ui/run-details.spec.ts`
- new focused test utility under `tests/support/` only if at least two suites use the same owned
  workspace lifecycle

`data/autotest.db` is explicitly not an implementation target: application/test code must not open
it, and it must not be rewritten, copied, moved, deleted, staged, or normalized during Task 1.
Read-only file metadata or checksum collection is allowed solely to prove preservation. Existing
dirty files are edited only when listed above and only through line-level patches that preserve
unrelated user changes.

## 4. Proposed code and data flow

### 4.1 Environment flow

```text
Playwright/fixture entrypoint
  -> loadProcessEnvironmentConfig()
     -> dotenv.config()
     -> loadEnvironmentConfig(process.env)
        -> environmentSchema.safeParse(source)
        -> immutable EnvironmentConfig
```

Unit tests bypass dotenv and call `loadEnvironmentConfig(explicitSource)`. The parser never reads or
writes `process.env`. Missing or unknown `TEST_ENV` fails validation. Explicit `production` selects
`PRODUCTION_BASE_URL`; credentials and the currently applicable URL fields remain validated. The
configuration no longer requires or invents dev/staging URLs.

### 4.2 Runtime database flow

`database/runtime-database.ts` centralizes only path selection, not a singleton. It resolves
`AUTOTEST_DB_PATH` when explicitly supplied; otherwise it resolves the backward-compatible local
path `data/autotest.db`. It then delegates to `openDatabase(path)`. No connection is cached.

```text
server/index.ts
  -> resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH)
  -> startReportingServer({ databasePath, evidenceRoot, port })
     -> openDatabase(databasePath)
     -> initializeSchema(connection)
     -> createApp({ database: connection, evidenceRoot })
     -> app.listen(port)
```

`startReportingServer` returns a handle with an idempotent asynchronous `close()` operation. Closing
first stops accepting HTTP traffic and awaits the HTTP server's close callback; only then does it
close SQLite. Startup failure closes any already-acquired connection before rethrowing.

CLI scripts follow the same open/initialize/work/close shape with `try/finally`. They do not import a
singleton. `init-db` initializes schema, `sync-test-cases` performs its existing catalog sync,
`db:import` performs its existing import, and query verification remains read-only. Their business
operations do not change in Task 1.

### 4.3 Evidence resolution flow

`EvidenceService` stores an absolute normalized `evidenceRoot`. For backward compatibility, an
absolute evidence record is resolved as absolute and a relative record remains workspace-relative.
The service then uses `path.relative(evidenceRoot, resolvedPath)` and rejects paths that are absolute
relative results, equal to `..`, or start with `..` plus a platform separator. Containment is checked
before existence or MIME checks, preserving the current 403/404/400 precedence and API error codes.

No physical path is added to metadata responses. No new logging prints the evidence record or local
path. Sanitization of stored historical error payloads belongs to Task 7, not Task 1.

## 5. Database lifecycle

### 5.1 Canonical state

`database/schema.ts` and later migration files are the canonical database definition. Test-case
catalog code remains the canonical catalog. SQLite files are disposable runtime projections and are
never treated as source fixtures.

### 5.2 Production/reporting server

The reporting server opens exactly one connection per process, initializes the idempotent schema,
injects the connection, and closes it after the HTTP server stops. `SIGINT` and `SIGTERM` share an
idempotent shutdown path. A second signal or duplicate close cannot close the connection twice.

The reporting SQLite file is local framework state; this lifecycle does not authorize any request or
mutation against the Propify application, its API, or its production database.

### 5.3 Scripts

Every script owns one connection and closes it in `finally`, including parse, validation, repository,
or output failures. Calls to `process.exit()` must not bypass cleanup: executable wrappers set
`process.exitCode` or catch only after the owned connection has been closed.

### 5.4 Tests

Tests use `:memory:` per suite/test by default. A unique file-backed DB under an owned OS temporary
directory is allowed only when file behavior is the subject of the test. Parallel workers never
share a DB path. Schema initialization is explicit, and teardown closes the server before the DB.

### 5.5 Existing runtime database preservation

Implementation may add ignore rules for `/data/*.db`, `/data/*.db-wal`, `/data/*.db-shm`, and their
test/temp equivalents. It must first confirm with read-only Git status that `data/autotest.db`
remains a pre-existing dirty file, then leave the file and Git index untouched.

Untracking requires a later, explicitly authorized command equivalent to
`git rm --cached -- data/autotest.db`. That operation must occur only after recording read-only size
and SHA-256 checks before and after, proving the working file stayed in place. It is deferred from
Task 1 implementation under the current no-stage constraint.

## 6. Environment lifecycle

### 6.1 Configuration boundaries

The configuration lifecycle has three boundaries:

1. `.env.example` is safe documentation: it explicitly declares `TEST_ENV=production`, uses only
   reserved `.example.test` production/API URLs, keeps secrets as placeholders, and leaves every
   mutation/OTP gate `false`;
2. parsing is deterministic: `loadEnvironmentConfig(source)` has no implicit source and returns an
   immutable validated object;
3. process loading is explicit: only executable/configuration entrypoints call
   `loadProcessEnvironmentConfig()`.

A representative safe example is:

```env
TEST_ENV=production
PRODUCTION_BASE_URL=https://production.example.test/
API_BASE_URL=https://api.example.test/

RUN_MUTATING_E2E=false
ALLOW_MUTATING_E2E=false
RUN_PRODUCTION_MUTATING_E2E=false
RUN_OTP_E2E=false
RUN_PRODUCTION_REGISTRATION_E2E=false
```

The real website URL exists only in the uncommitted local `.env`. The example does not declare
`DEV_BASE_URL` or `STAGING_BASE_URL`, and the production URL must never be reused behind a fake dev or
staging label.

### 6.2 Three distinct execution environments

The design distinguishes execution isolation from a deployed website environment:

1. **Framework/unit/internal API tests** use in-memory SQLite, a unique temporary DB when file
   behavior is required, mocks/stubs where appropriate, and a test-owned temporary workspace. They do
   not require the real website unless a specific test explicitly crosses into E2E. This is an
   isolated framework test environment, not a dev website.
2. **Production read-only E2E** explicitly uses `TEST_ENV=production` and the real website. It may be
   authenticated and may support project demonstration, but it does not change business data.
3. **Production mutating E2E** explicitly uses `TEST_ENV=production`, the complete existing mutation/
   OTP gate set, a dedicated test account, known test-owned business records, deterministic cleanup
   or baseline restore, and a rerunnable flow.

No environment helper turns on `RUN_OTP_E2E`, `RUN_MUTATING_E2E`,
`RUN_PRODUCTION_REGISTRATION_E2E`, `RUN_PRODUCTION_MUTATING_E2E`, or `ALLOW_MUTATING_E2E`.
Selecting production identifies only the target; it grants no mutation permission. The current
multi-gate model remains intact and must not be collapsed to one boolean.

### 6.3 Production test-data ownership

Mutating E2E must never target ordinary production user data. The dedicated account and every mutable
record require explicit ownership. Where the business field permits it, newly created records use a
recognizable prefix such as `[DATN-AUTOTEST]`, `[PLAYWRIGHT]`, or `[E2E-TEST]`.

Cleanup identifies the exact record created by the test using its captured stable identifier and
ownership checks. Substring search, first-match fallback, broad title matching, and cleanup of an
uncertain record are forbidden. A flow passes its safety gate only when its setup, mutation, and
cleanup/restore contract make it rerunnable. Task 1 documents this contract but does not implement or
execute profile, listing, favorite, or appointment business mutations.

## 7. Temporary and evidence lifecycle

A focused test-owned workspace utility may expose:

```ts
interface TestArtifactWorkspace {
  readonly root: string;
  readonly evidenceRoot: string;
  readonly outsideEvidenceRoot: string;
  cleanup(): Promise<void>;
}
```

It creates one unique parent with `fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))`. Both the valid
evidence root and the intentionally outside sibling live inside that parent. This preserves traversal
coverage without creating `outside-file.png` or `.temp-*` entries in the repository.

Rules for all affected suites:

- create paths only inside the returned owned parent;
- store exact created paths rather than rediscovering them with globs;
- await HTTP server close before DB close;
- await recursive removal of only the owned parent in `finally`/fixture teardown;
- do not use empty `catch` blocks or `force: true` to hide unexpected cleanup failures;
- if setup fails after allocation, cleanup still runs;
- on Windows, normalize/resolve paths for containment but delete using the exact owned literal path;
- never delete a repository-root path computed from an untrusted DB record.

Reporter output continues under `test-results/tracking/<run-id>`, which is already ignored. The
reporter creates only its selected run directory. Task 1 does not change traceability or result JSON
content; sensitive payload minimization is deferred to Task 7.

## 8. Backward compatibility

The following are preserved:

- all HTTP routes, response bodies, status/error codes, static dashboard behavior, and port default;
- database schema and existing rows in `data/autotest.db`;
- package script names (`start:api`, `db:init`, `db:import`, and existing test commands);
- catalog IDs, automation statuses, script paths, and reporting traceability;
- relative historical evidence paths, while retaining containment checks;
- current mutation, OTP, and production approval gates;
- the default runtime DB location for operators who do not set `AUTOTEST_DB_PATH`.

The intentional source-level breaking change is removal of optional/default `createApp` dependencies.
It is contained within the repository and caught by TypeScript. A compatibility alias or optional
overload is rejected because it would preserve the unsafe hidden fallback. No external package API
is documented for `createApp`.

Changing missing `TEST_ENV` from an implicit/default target to validation failure is an intentional
safety correction. Explicit `TEST_ENV=production` remains backward-compatible. Removing inactive
dev/staging URL keys reflects deployed reality; it does not rename production as dev or alter the
production website itself.

## 9. Risks and mitigations

| Risk                                                           | Mitigation                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Existing callers omit dependencies                             | Make dependencies required and use typecheck plus repository-wide reference search.                        |
| HTTP shutdown races SQLite close                               | Await server close before closing DB; make close idempotent.                                               |
| Startup error leaks a DB handle                                | Acquire inside guarded runtime and close in the startup failure path.                                      |
| Script `process.exit()` skips `finally`                        | Return exit status/set `process.exitCode` after cleanup.                                                   |
| Parallel tests collide                                         | Use per-test/suite `:memory:` DBs and `mkdtemp` workspaces.                                                |
| Windows holds files open                                       | Close streams/server/DB before awaited directory cleanup.                                                  |
| Evidence containment changes historical behavior               | Retain workspace-relative record resolution and test absolute, relative, traversal, and sibling paths.     |
| `.gitignore` appears to untrack the DB                         | Explicitly report that the index remains unresolved until separately authorized.                           |
| Dirty user changes are overwritten                             | Patch only inspected lines, re-read diffs, and never use reset/checkout/clean.                             |
| Explicit production target is mistaken for mutation permission | Keep every existing gate false and run no external/mutating E2E in Task 1.                                 |
| Removing dev/staging keys breaks obsolete local instructions   | Update only environment/runbook wording; do not preserve aliases for websites that do not exist.           |
| Production cleanup selects ordinary user data                  | Require dedicated ownership and exact captured identifiers; forbid substring/fallback cleanup.             |
| Broad lint baseline obscures regressions                       | Require scoped lint/format for touched files while recording the known full-repo lint baseline separately. |

## 10. Test strategy

Implementation follows red-green-refactor in small safety slices. Each failing test must demonstrate
the unsafe baseline before production code changes.

### Environment tests

- missing `TEST_ENV` fails validation before any browser or resource-owning runtime starts;
- explicit `TEST_ENV=production` selects only the production URL;
- unknown `TEST_ENV` fails validation;
- production configuration does not require or expose fake dev/staging URL keys;
- all mutation/OTP gates remain false when omitted;
- `TEST_ENV=production` does not enable any mutation, OTP, or production approval gate;
- the pure parser does not read values absent from its supplied source;
- `.env.example` explicitly selects production, contains only reserved example hosts, and enables no
  mutation or OTP gate.

### Import and dependency tests

- importing `server/app.ts` creates no app, DB file, directory, or listening server;
- `createApp` works with an injected in-memory DB and explicit evidence root;
- health checks the injected DB;
- repository search/typecheck proves no service or route calls `getDefaultDatabase` and no default
  app export remains.

### Runtime lifecycle tests

- startup opens/initializes once and shutdown closes HTTP before DB;
- startup/listen failure closes an acquired DB;
- duplicate shutdown is harmless;
- each CLI connection closes on success and repository/validation failure, using injected factories
  where necessary rather than touching the real runtime file.

### Temp/evidence tests

- valid evidence inside the owned root streams successfully;
- missing evidence returns 404 and unsupported MIME returns 400;
- relative traversal and an absolute sibling outside the evidence root both return 403;
- no workspace-root `outside-file.png`, `.temp-ui-test`, or `.temp-*.db` is created;
- cleanup is awaited and leaves no owned temp parent after the suite;
- cleanup failures fail the test rather than being swallowed.

### Verification sequence

After each coherent slice:

1. run the focused new/changed tests;
2. run `npm run typecheck`;
3. run ESLint and Prettier checks scoped to touched Task 1 files;
4. run all framework tests using an explicit non-database-writing reporter override;
5. run `npx playwright test --list --reporter=list` to verify discovery only;
6. inspect `git diff`, `git status --short`, and the pre-existing dirty-file list.

The known full-repository lint/format failures are not silently accepted: they are reported as
baseline debt and Task 1 must add no new scoped failure. No live E2E, OTP, registration, listing,
profile, appointment, or other mutation test is part of this verification.

## 11. Acceptance criteria

Task 1 implementation is acceptable only when all of the following are evidenced:

1. `TEST_ENV` is required and has no default.
2. Missing `TEST_ENV` fails before E2E or a resource-owning runtime starts.
3. The real production website is selected only by explicit `TEST_ENV=production`.
4. Active configuration and `.env.example` contain no fake dev/staging website target.
5. Selecting production does not enable mutation, OTP, registration, or production approval gates.
6. All current mutation and OTP gates remain `false` when omitted and retain their existing
   cross-field/production checks.
7. The pure environment parser neither loads `.env` nor reads/mutates `process.env` implicitly.
8. Importing application, service, configuration, database, or runtime modules opens no DB, starts no
   server, loads no `.env`, creates no directory, and writes no artifact.
9. `createApp`, every route, and every service receive required explicit dependencies.
10. No default database singleton, cache, or hidden fallback remains in application code.
11. The server and every DB script have one explicit, tested, idempotent, failure-safe lifecycle.
12. Framework/API/UI tests use isolated databases and unique test-owned temporary workspaces; parallel
    workers do not share a DB path.
13. Evidence behavior remains: inside root allowed, missing 404, unsupported MIME 400, relative
    traversal 403, and absolute outside sibling 403, without fixed workspace files or swallowed
    cleanup.
14. Task 1 executes no live mutation, OTP, registration, profile, listing, favorite, or appointment
    flow against production.
15. HTTP API, database schema, catalog, Test Case IDs, traceability, automation status, business
    rules, and package command contracts remain unchanged.
16. `data/autotest.db` retains the same working-tree path, size, and SHA-256 and is not opened by Task
    1 tests, rewritten, moved, deleted, staged, or untracked.
17. No pre-existing dirty change is lost, reset, reverted, checked out, or cleaned.
18. Nothing is staged, committed, pushed, merged, or included in a PR.
19. Focused tests, typecheck, scoped lint/format, framework verification, and discovery verification
    pass without adding a new regression; pre-existing global failures remain separately reported.
20. Findings outside Safety Baseline remain deferred to their named owners in Tasks 2–8.

The Git-index limitation remains explicit: Task 1 adds preventive ignore policy, while the already
tracked database remains pending until a separate staging authorization.

## 12. Audit findings closed or deferred

### Closed by Task 1

- unsafe implicit/default environment selection, replaced by explicit required target selection;
- real-looking service endpoints in `.env.example`;
- active configuration that advertises nonexistent dev/staging websites;
- implicit `.env` loading in the pure environment parser;
- default app construction during `server/app.ts` import;
- optional route/service dependencies and hidden singleton DB acquisition;
- ambiguous server/script ownership of DB connections;
- health success without a database check;
- shared/fixed API/UI temp paths and swallowed cleanup failures in the affected suites;
- workspace-root `outside-file.png` creation/deletion;
- lack of ignore policy for newly created SQLite runtime/WAL/SHM files.

### Explicitly deferred

- removing the already tracked `data/autotest.db` entry from the Git index: deferred because it
  necessarily stages a deletion, which is forbidden by the current instruction;
- strict imported run-result schema and diagnostic-data sanitization: Task 7;
- broad shared fixture consolidation beyond the safety-critical API/UI lifecycle: Task 6;
- weak assertions, 500-status acceptance, and semantic assertion quality: Tasks 2 and 6;
- business-rule conflicts and catalog corrections: handled only in their approved task with source
  evidence; no rule changes are made here;
- coverage/traceability gaps and `AUTOMATED` status changes: Tasks 2–8, only after executable tests
  pass;
- mutation cleanup for profile/listing/appointment business flows: their designated later tasks;
- repository-wide lint/format debt unrelated to Task 1;
- the existing framework aggregation expectation mismatch (34/49 versus 33/50 baseline): the task
  that owns catalog/aggregation traceability, not Safety Baseline.

Approval of this document authorizes only creation of a separate implementation plan. It does not
itself authorize code changes.
