# Task 1 — Safety Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make environment selection, application/database composition, server/CLI ownership, and
test artifact cleanup explicit and fail-safe without changing Propify business behavior or executing
production mutations.

**Architecture:** Pure modules validate or construct objects only. Executable composition roots load
process configuration and own databases, HTTP servers, and shutdown. Framework tests use injected
in-memory databases and unique OS-temporary workspaces; the current production website is an explicit
E2E target but never an implicit mutation permission.

**Tech Stack:** TypeScript 6, Node.js 20+, Playwright Test 1.62, Zod 4, Express 5,
`better-sqlite3`, `dotenv`, PowerShell/Git verification.

**Spec:** `docs/superpowers/specs/2026-08-24-task-1-safety-baseline-design.md`

## Global constraints

- `TEST_ENV` is required; the process configuration currently accepts only the explicit value
  `production`.
- Do not invent or alias dev/staging business website targets.
- `TEST_ENV=production` selects a target only; all mutation, OTP, registration, and production gates
  remain fail-closed.
- Do not execute live E2E, OTP, registration, profile, listing, favorite, or appointment mutations.
- Do not change HTTP contracts, database schema, catalog entries, Test Case IDs, traceability,
  automation status, business rules, project matching, or package command names.
- Preserve all pre-existing dirty changes. Do not reset, revert, checkout, clean, stage, commit, push,
  merge, or create a PR.
- Do not open, rewrite, move, delete, stage, or untrack `data/autotest.db` from application or test
  code. Read-only path/size/SHA-256/status checks are allowed.
- Follow RED → GREEN → REFACTOR within every slice. Do not move to the next slice until the current
  exit gate is satisfied.
- Use scoped lint/format checks because repository-wide lint/format debt is a recorded baseline, not
  Task 1 scope.
- If a step depends on an excluded false-positive, business-rule, catalog, aggregation, broad-fixture,
  general-typing, or mutation-cleanup change, record `DEPENDENCY / DEFERRED FINDING` and stop that
  dependency path.
- Plan execution contains no Git commit step; the skill's usual commit cadence is overridden by the
  user's explicit no-stage/no-commit instruction.

## File responsibility map

| Boundary                      | Files                                                                                                                 | Responsibility                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pure environment parsing      | `config/environment.schema.ts`, `config/environment.config.ts`                                                        | Validate only the supplied source and produce immutable production-target configuration.              |
| Process environment loading   | new `config/process-environment.config.ts`                                                                            | Call `dotenv.config()` only when an entrypoint explicitly invokes the loader.                         |
| Environment consumers         | `playwright.config.ts`, `fixtures/auth.fixture.ts`, `fixtures/appointment.fixture.ts`, `fixtures/mutating.fixture.ts` | Request process configuration explicitly; never import-load `.env`.                                   |
| SQLite primitive/runtime path | `database/sqlite.ts`, new `database/runtime-database.ts`                                                              | Open a requested connection and resolve an explicit/default local reporting path without a singleton. |
| App construction              | `server/app.ts`, `server/routes/*.ts`, `server/services/*.ts`                                                         | Require injected DB/evidence dependencies; never own or locate a DB.                                  |
| Reporting runtime             | new `server/runtime.ts`, `server/index.ts`                                                                            | Open/init/listen once and close HTTP-before-SQLite through one idempotent lifecycle.                  |
| CLI ownership                 | new `scripts/database-script-runtime.ts`, four DB scripts                                                             | Open one connection, perform the existing operation, close in `finally`, and return an exit status.   |
| Test-owned artifacts          | new `tests/support/test-artifact-workspace.ts`, affected API/UI tests                                                 | Create unique OS-temp roots and remove only the exact owned parent with awaited cleanup.              |
| Evidence containment          | `server/services/EvidenceService.ts`, `tests/api/evidence.spec.ts`                                                    | Preserve 200/404/400/403 semantics without exposing or deleting unsafe paths.                         |
| Runtime artifact policy       | `.gitignore`, new policy test                                                                                         | Ignore newly generated runtime/test SQLite files without touching the tracked DB index entry.         |
| Current documentation         | `.env.example`, `README.md`, `docs/traceability/requirements-to-tests.md` environment/runbook paragraphs only         | Describe the real production-only target and fail-closed gates without changing mappings.             |

## Phase 3 pre-flight safety snapshot

Run these read-only commands before Slice 1. Keep the output in the execution transcript for the
Slice 8 and Slice 10 comparisons; do not write into `data/`.

```powershell
$taskDbItem = Get-Item -LiteralPath 'data/autotest.db'
[pscustomobject]@{
  Path = $taskDbItem.FullName
  Size = $taskDbItem.Length
  Sha256 = (Get-FileHash -LiteralPath $taskDbItem.FullName -Algorithm SHA256).Hash
}
git status --short
git diff --cached --name-only
```

Expected evidence:

- the exact absolute DB path, byte size, and SHA-256 are visible;
- `data/autotest.db` is already modified before Task 1 implementation;
- all other pre-existing dirty paths are recorded;
- `git diff --cached --name-only` is empty.

---

### Slice 1: Environment Contract

**1. Goal**

Require explicit `TEST_ENV=production`, remove nonexistent dev/staging URL requirements, keep all
safety gates false by default, and split pure parsing from process-level dotenv loading.

**2. Files affected**

- Modify: `.env.example`
- Modify: `config/environment.schema.ts`
- Modify: `config/environment.config.ts`
- Create: `config/process-environment.config.ts`
- Modify: `playwright.config.ts`
- Modify: `fixtures/auth.fixture.ts`
- Modify: `fixtures/appointment.fixture.ts`
- Modify: `fixtures/mutating.fixture.ts`
- Modify: `tests/unit/config/environment.config.spec.ts` while preserving unrelated dirty changes
- Create: `tests/unit/config/process-environment.config.spec.ts`

Interfaces produced:

```ts
export function loadEnvironmentConfig(source: NodeJS.ProcessEnv): EnvironmentConfig;
export function loadProcessEnvironmentConfig(): EnvironmentConfig;
```

`EnvironmentConfig.environment` remains compatible with `TestEnvironment`; the active process
schema returns only `production`. The broader type may remain for pure policy-unit tests but cannot
make dev/staging executable.

**3. Failing test / RED step**

- [ ] Replace the dev-based fixture object with an explicit production object containing no dev or
      staging URL:

```ts
const validEnvironment = {
  TEST_ENV: 'production',
  PRODUCTION_BASE_URL: 'https://production.example.test/',
  DEFAULT_USER_EMAIL: 'default-user@example.test',
  DEFAULT_USER_PASSWORD: 'default-user-password',
};
```

- [ ] Add focused tests before changing the parser:

```ts
test('requires an explicit target environment', () => {
  const { TEST_ENV: _omitted, ...withoutTarget } = validEnvironment;
  expect(() => loadEnvironmentConfig(withoutTarget)).toThrow(/TEST_ENV/);
});

test('accepts the current production target without dev or staging URLs', () => {
  const config = loadEnvironmentConfig(validEnvironment);
  expect(config.environment).toBe('production');
  expect(config.baseUrl).toBe('https://production.example.test/');
});

test('rejects an unknown target', () => {
  expect(() => loadEnvironmentConfig({ ...validEnvironment, TEST_ENV: 'unknown' })).toThrow(
    /TEST_ENV/,
  );
});

test('production does not grant mutation or OTP permission', () => {
  const config = loadEnvironmentConfig(validEnvironment);
  expect({
    runOtpE2e: config.runOtpE2e,
    runMutatingE2e: config.runMutatingE2e,
    runProductionRegistrationE2e: config.runProductionRegistrationE2e,
    runProductionMutatingE2e: config.runProductionMutatingE2e,
    allowMutatingE2E: config.allowMutatingE2E,
  }).toEqual({
    runOtpE2e: false,
    runMutatingE2e: false,
    runProductionRegistrationE2e: false,
    runProductionMutatingE2e: false,
    allowMutatingE2E: false,
  });
});

test('validates only the supplied source', () => {
  const { TEST_ENV: _omitted, ...withoutTarget } = validEnvironment;
  expect(process.env.TEST_ENV).toBeDefined();
  expect(() => loadEnvironmentConfig(withoutTarget)).toThrow(/TEST_ENV/);
});
```

The last test must save/restore `process.env.TEST_ENV` in `try/finally` if it needs to set a sentinel;
it must not leak process state to other tests.

- [ ] Add one process-loader test that explicitly installs the required keys, invokes the loader, and
      restores every touched key in `finally`:

```ts
test('loads process configuration only when explicitly invoked', () => {
  const keys = Object.keys(validEnvironment);
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, validEnvironment);
  try {
    expect(loadProcessEnvironmentConfig().environment).toBe('production');
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
```

- [ ] Run the focused test and capture RED:

```bash
npx playwright test tests/unit/config/environment.config.spec.ts --project=framework --reporter=list
```

Expected RED: missing `TEST_ENV` currently defaults instead of failing, and production-only input
currently fails because `DEV_BASE_URL`/`STAGING_BASE_URL` are required.

**4. Minimal implementation / GREEN step**

- [ ] Make the active schema truthful and required:

```ts
TEST_ENV: z.literal('production'),
PRODUCTION_BASE_URL: absoluteUrl,
API_BASE_URL: absoluteUrl.optional(),
```

Remove `DEV_BASE_URL`, `STAGING_BASE_URL`, and the `TEST_ENV` default. Keep every existing boolean gate
definition and `superRefine` production check unchanged.

- [ ] Make the parser pure and source-required:

```ts
export const loadEnvironmentConfig = (source: NodeJS.ProcessEnv): EnvironmentConfig => {
  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${formatInvalidKeys(parsed.error.issues)}`);
  }
  return Object.freeze({
    environment: parsed.data.TEST_ENV,
    baseUrl: parsed.data.PRODUCTION_BASE_URL,
    ...(parsed.data.API_BASE_URL === undefined ? {} : { apiBaseUrl: parsed.data.API_BASE_URL }),
    defaultUserEmail: parsed.data.DEFAULT_USER_EMAIL,
    defaultUserPassword: parsed.data.DEFAULT_USER_PASSWORD,
    ...(parsed.data.APPOINTMENT_LISTING_ID === undefined
      ? {}
      : { appointmentListingId: parsed.data.APPOINTMENT_LISTING_ID }),
    ci: parsed.data.CI,
    runOtpE2e: parsed.data.RUN_OTP_E2E,
    runMutatingE2e: parsed.data.RUN_MUTATING_E2E,
    runProductionRegistrationE2e: parsed.data.RUN_PRODUCTION_REGISTRATION_E2E,
    runProductionMutatingE2e: parsed.data.RUN_PRODUCTION_MUTATING_E2E,
    ...(gmail === undefined ? {} : { gmail }),
    ...(mutatingUser === undefined ? {} : { mutatingUser }),
    ...(lockedUser === undefined ? {} : { lockedUser }),
    otpPollIntervalMs: parsed.data.OTP_POLL_INTERVAL_MS,
    otpTimeoutMs: parsed.data.OTP_TIMEOUT_MS,
    allowMutatingE2E: parsed.data.ALLOW_MUTATING_E2E,
  });
};
```

Delete the top-level `import 'dotenv/config'` and the default `process.env` argument.

- [ ] Add the explicit process loader:

```ts
import { config as loadDotenv } from 'dotenv';
import { loadEnvironmentConfig } from './environment.config';
import type { EnvironmentConfig } from '../types/environment.types';

export const loadProcessEnvironmentConfig = (): EnvironmentConfig => {
  loadDotenv();
  return loadEnvironmentConfig(process.env);
};
```

Importing this module must not call `loadDotenv`; only invoking the function may do so.

- [ ] Change process consumers from `loadEnvironmentConfig()` to
      `loadProcessEnvironmentConfig()`. Calls with explicit test sources continue using the pure parser.

- [ ] Replace `.env.example` endpoints with reserved hosts, explicitly keep
      `TEST_ENV=production`, and leave every gate `false`. Do not add dev/staging variables or rename
      `API_BASE_URL`.

**5. Refactor step**

- [ ] Remove now-unused base-URL maps and imports.
- [ ] Keep error text limited to invalid key names so credentials are never echoed.
- [ ] Replace the obsolete staging mutation test with an unsupported-target validation test; do not
      change gate semantics to preserve a nonexistent environment.
- [ ] Re-run the focused tests after formatting.

**6. Backward compatibility**

- Explicit production configuration, credentials, optional `API_BASE_URL`, and all gate names remain
  compatible.
- Missing `TEST_ENV` intentionally changes from implicit selection to fail-fast validation.
- Dev/staging URL keys are intentionally removed from the active contract because no corresponding
  websites exist.
- `createGeneralMutatingProject` matching is not changed in this slice.

**7. Risk**

- `playwright.config.ts` loads before test discovery; a missing local `TEST_ENV` will intentionally
  stop every command early.
- `generic-registration` was only available under dev/staging and is ignored in production.
  `DEPENDENCY / DEFERRED FINDING`: after truthful production-only configuration, that generic flow is
  not executable. Do not retarget it, change project matching, alter registration behavior, or update
  its automation status in Task 1.
- Existing user edits overlap `tests/unit/config/environment.config.spec.ts`; patch only the
  environment-contract assertions.

**8. Verification commands**

```bash
npx playwright test tests/unit/config/environment.config.spec.ts tests/unit/config/process-environment.config.spec.ts --project=framework --reporter=list
npm run typecheck
npx eslint config/environment.schema.ts config/environment.config.ts config/process-environment.config.ts playwright.config.ts fixtures/auth.fixture.ts fixtures/appointment.fixture.ts fixtures/mutating.fixture.ts tests/unit/config/environment.config.spec.ts tests/unit/config/process-environment.config.spec.ts
npx prettier --check .env.example config/environment.schema.ts config/environment.config.ts config/process-environment.config.ts playwright.config.ts fixtures/auth.fixture.ts fixtures/appointment.fixture.ts fixtures/mutating.fixture.ts tests/unit/config/environment.config.spec.ts tests/unit/config/process-environment.config.spec.ts
```

**9. Expected evidence**

- All focused environment tests pass.
- The test input contains only `TEST_ENV=production` and `PRODUCTION_BASE_URL`.
- Missing/unknown targets fail with sanitized `TEST_ENV` diagnostics.
- All five mutation/OTP/registration booleans remain false when omitted.
- Typecheck reports every process consumer was migrated.

**10. Exit criteria**

- [ ] Focused test, typecheck, scoped lint, and scoped format checks pass.
- [ ] `.env.example` contains no real endpoint, secret, dev/staging target, or enabled gate.
- [ ] No E2E project was executed.
- [ ] The generic-registration limitation is recorded, not “fixed.”
- [ ] Staging area remains empty.

---

### Slice 2: Pure Import Boundary

**1. Goal**

Prove that importing configuration, SQLite, app, and runtime modules cannot load `.env`, open a DB,
create a directory, start a listener, or write an artifact.

**2. Files affected**

- Create: `tests/support/import-boundary-probe.cjs`
- Create: `tests/unit/safety/import-boundary.spec.ts`
- Create: `server/runtime.ts` with the side-effect-free runtime interfaces used by Slice 4

Interfaces produced:

```ts
export interface ReportingRuntimeHandle {
  close(): Promise<void>;
}
```

**3. Failing test / RED step**

- [ ] Create an isolated child-process probe that:
  - runs with a unique temporary current directory containing `.env` with
    `IMPORT_BOUNDARY_SENTINEL=loaded`;
  - registers `ts-node/register/transpile-only`;
  - hooks `Module._load` so constructing `better-sqlite3` throws `IMPORT_DB_OPEN`;
  - hooks `fs.mkdirSync`/`fs.writeFileSync` after probe setup so import-time writes throw named errors;
  - snapshots temporary-directory entries before/after import;
  - prints JSON containing `databaseOpenCount`, `sentinelLoaded`, and added paths;
  - exits naturally; the parent kills/fails it if it remains alive, detecting an imported listener.

Probe result contract:

```ts
interface ImportProbeResult {
  readonly databaseOpenCount: number;
  readonly sentinelLoaded: boolean;
  readonly addedPaths: readonly string[];
}
```

- [ ] Add one parameterized test for each exact module:

```ts
for (const target of [
  'config/environment.config.ts',
  'config/process-environment.config.ts',
  'database/sqlite.ts',
  'server/app.ts',
  'server/runtime.ts',
]) {
  test(`importing ${target} has no resource side effect`, async () => {
    const result = await runImportProbe(target);
    expect(result).toEqual({
      databaseOpenCount: 0,
      sentinelLoaded: false,
      addedPaths: [],
    });
  });
}
```

- [ ] Run RED:

```bash
npx playwright test tests/unit/safety/import-boundary.spec.ts --project=framework --reporter=list
```

Expected RED on the old baseline: config import loads `.env`; app import constructs its default app
and attempts to acquire the default DB; `server/runtime.ts` does not yet exist.

**4. Minimal implementation / GREEN step**

- [ ] Rely on Slice 1's callable-only dotenv loader.
- [ ] Remove `export default createApp()` and all top-level app construction from `server/app.ts`.
- [ ] Ensure `database/sqlite.ts` exports functions/types only; do not invoke them at module scope.
- [ ] Add only the concrete runtime handle/options interfaces needed by Slice 4 to
      `server/runtime.ts`; do not open/listen/register signals at import.
- [ ] Make the probe use exact owned temp paths and awaited child termination cleanup.

**5. Refactor step**

- [ ] Centralize child-process timeout/error formatting inside the test support probe runner.
- [ ] Keep the probe test-specific; do not add production hooks or general module mocking.
- [ ] Re-run the probe after Slice 4 so the final runtime implementation remains import-pure.

**6. Backward compatibility**

- Runtime behavior is not started by this slice.
- Removing the default app export is the approved intentional source break; no in-repository default
  import consumer exists.
- Named pure exports remain available.

**7. Risk**

- A child process can hang if a listener is started; enforce a short explicit timeout and always kill
  only that owned child.
- Module mocking must be installed after `ts-node` initialization but before importing the target, or
  it can produce a false negative.
- Do not treat “child exited” alone as proof: assert DB constructor count, env sentinel, and added
  paths separately.

**8. Verification commands**

```bash
npx playwright test tests/unit/safety/import-boundary.spec.ts --project=framework --reporter=list
npm run typecheck
npx eslint server/app.ts server/runtime.ts tests/unit/safety/import-boundary.spec.ts
npx prettier --check server/app.ts server/runtime.ts tests/support/import-boundary-probe.cjs tests/unit/safety/import-boundary.spec.ts
```

**9. Expected evidence**

- Each named module returns `{ databaseOpenCount: 0, sentinelLoaded: false, addedPaths: [] }`.
- Every child exits before timeout.
- No `data/`, DB, artifact, or server port is created by import.

**10. Exit criteria**

- [ ] All five import-boundary targets pass exact side-effect assertions.
- [ ] No default app instance/export remains.
- [ ] Runtime module still contains no top-level execution.
- [ ] Staging area remains empty.

---

### Slice 3: Explicit App Dependencies

**1. Goal**

Make DB and evidence dependencies mandatory from `createApp` through routes and services, eliminating
all application-path fallback acquisition.

**2. Files affected**

- Modify: `server/app.ts`
- Modify: `server/routes/index.ts`
- Modify: `server/routes/health.routes.ts`
- Modify: `server/routes/dashboard.routes.ts`
- Modify: `server/routes/evidence.routes.ts`
- Modify: `server/routes/results.routes.ts`
- Modify: `server/routes/runs.routes.ts`
- Modify: `server/routes/test-cases.routes.ts`
- Modify: `server/services/ReportingService.ts`
- Modify: `server/services/DashboardService.ts`
- Modify: `server/services/EvidenceService.ts`
- Create: `tests/types/create-app.dependencies.typecheck.ts`
- Modify: `tests/api/reporting.spec.ts`
- Modify: `tests/api/analytics.spec.ts`
- Modify: `tests/api/evidence.spec.ts`
- Modify: `tests/ui/dashboard.spec.ts`
- Modify: `tests/ui/run-details.spec.ts`
- Modify: `tests/ui/test-case-details.spec.ts`

Interface produced:

```ts
export interface AppDependencies {
  readonly database: DatabaseConnection;
  readonly evidenceRoot: string;
}

export function createApp(dependencies: AppDependencies): Express;
```

**3. Failing test / RED step**

- [ ] Add type assertions:

```ts
import { createApp } from '../../server/app';

// @ts-expect-error createApp requires all dependencies
createApp();
// @ts-expect-error database is required
createApp({ evidenceRoot: 'test-results' });
// @ts-expect-error evidenceRoot is required
createApp({ database: {} as never });
```

- [ ] Update one API test first to call:

```ts
const app = createApp({ database: conn, evidenceRoot: ownedEvidenceRoot });
```

- [ ] Run typecheck and the one API test. Expected RED: object-form call is not accepted and missing
      dependencies are still allowed by the old signature.

**4. Minimal implementation / GREEN step**

- [ ] Implement the exact `AppDependencies` object contract in `server/app.ts` and pass required
      values to `createRoutes`.
- [ ] Make every route DB parameter required. Evidence/result routes also require `evidenceRoot`.
- [ ] Make these constructors required:

```ts
new ReportingService(database);
new DashboardService(database);
new EvidenceService(database, evidenceRoot);
```

- [ ] Delete `getDefaultDatabase` imports/usages from `server/**` and remove EvidenceService's default
      `test-results` root.
- [ ] Make health always execute `database.db.prepare('SELECT 1').get()` before returning 200.
- [ ] Mechanically migrate every current `createApp` caller with an in-memory DB and explicit evidence
      root. Do not yet broaden their temp cleanup; Slice 6 owns that behavior.

**5. Refactor step**

- [ ] Use `import type` for `DatabaseConnection`/Express-only types.
- [ ] Keep dependency passing positional inside narrow route/service constructors if that is smaller;
      only `createApp` requires the approved object API.
- [ ] Remove dead comments describing fallback compatibility.

**6. Backward compatibility**

- HTTP routes, static dashboard, response bodies, errors, and DB schema remain unchanged.
- The optional/default `createApp` signature intentionally breaks at compile time.
- No compatibility overload is allowed.
- `getDefaultDatabase` may temporarily remain for CLI callers until Slice 5, but `rg` under `server/`
  must be empty now.

**7. Risk**

- Dirty user edits overlap three UI tests; change only setup/teardown dependency calls.
- A caller may supply a DB but omit evidence root because its test does not use evidence; use a unique
  owned placeholder root, never restore optional behavior.
- Changing EvidenceService path semantics belongs to Slice 7; this slice only makes its root required.

**8. Verification commands**

```bash
npm run typecheck
rg -n "getDefaultDatabase|createApp\(\)|export default createApp" server
npx playwright test tests/api/reporting.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/dashboard.spec.ts tests/ui/run-details.spec.ts tests/ui/test-case-details.spec.ts --project=framework --reporter=list
npx eslint server/app.ts server/routes server/services tests/types/create-app.dependencies.typecheck.ts tests/api/reporting.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/dashboard.spec.ts tests/ui/run-details.spec.ts tests/ui/test-case-details.spec.ts
npx prettier --check server/app.ts server/routes server/services tests/types/create-app.dependencies.typecheck.ts tests/api/reporting.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/dashboard.spec.ts tests/ui/run-details.spec.ts tests/ui/test-case-details.spec.ts
```

**9. Expected evidence**

- Typecheck validates required dependencies and identifies no unmigrated caller.
- `rg` returns no unsafe application-path fallback/default construction.
- Existing API/UI status and response assertions pass unchanged.
- Health fails through existing error middleware if the injected DB cannot execute `SELECT 1`.

**10. Exit criteria**

- [ ] Required dependency contract is enforced at compile time.
- [ ] All in-repository callers are migrated.
- [ ] API/UI focused suite passes without contract changes.
- [ ] No compatibility overload, hidden fallback, or source staging exists.

---

### Slice 4: Reporting Runtime Ownership

**1. Goal**

Create one explicit reporting-server composition root that opens/initializes once and closes HTTP
before SQLite through an idempotent asynchronous handle.

**2. Files affected**

- Create: `database/runtime-database.ts`
- Modify: `server/runtime.ts`
- Modify: `server/index.ts`
- Create: `tests/unit/database/runtime-database.spec.ts`
- Create: `tests/unit/server/runtime.spec.ts`

Interfaces produced:

```ts
export interface ReportingRuntimeOptions {
  readonly databasePath: string;
  readonly evidenceRoot: string;
  readonly port: number;
}

export interface ReportingRuntimeFactories {
  readonly openDatabase: typeof openDatabase;
  readonly initializeSchema: typeof initializeSchema;
  readonly createApp: typeof createApp;
  readonly listen: (app: Express, port: number) => Promise<Server>;
}

export interface ReportingRuntimeHandle {
  readonly server: Server;
  close(): Promise<void>;
}

export function startReportingServer(
  options: ReportingRuntimeOptions,
  factories?: ReportingRuntimeFactories,
): Promise<ReportingRuntimeHandle>;
```

**3. Failing test / RED step**

- [ ] Write fakes that append lifecycle events and tests for exact order/count:

```ts
test('opens and initializes once, then closes HTTP before SQLite', async () => {
  const events: string[] = [];
  const runtime = await startReportingServer(options, createFactories(events));
  await runtime.close();
  expect(events).toEqual([
    'db:open',
    'schema:init',
    'app:create',
    'http:listen',
    'http:close',
    'db:close',
  ]);
});

test('duplicate close shares one shutdown', async () => {
  const events: string[] = [];
  const runtime = await startReportingServer(options, createFactories(events));
  await Promise.all([runtime.close(), runtime.close()]);
  expect(events.filter((event) => event === 'http:close')).toHaveLength(1);
  expect(events.filter((event) => event === 'db:close')).toHaveLength(1);
});
```

- [ ] Add separate initialization/create/listen failure tests; each expects exactly one `db:close`.
- [ ] Add signal registration tests proving `SIGINT` and `SIGTERM` call the same handle `close()`.
- [ ] Re-run Slice 2 import probe against the now-real runtime module.
- [ ] Run RED; expected failure is missing runtime functions.

**4. Minimal implementation / GREEN step**

- [ ] Add a pure runtime path resolver:

```ts
export const resolveRuntimeDatabasePath = (
  configuredPath: string | undefined,
  cwd: string = process.cwd(),
): string => path.resolve(cwd, configuredPath ?? path.join('data', 'autotest.db'));
```

It reads no environment variable until the caller passes one.

- [ ] Implement `startReportingServer`: open DB, initialize schema, create app, await listen, and
      return an idempotent handle. On any startup error, close the acquired DB before rethrowing.
- [ ] Implement HTTP close as a Promise around `server.close(callback)`. If the server is already
      closed, resolve without a second SQLite close.
- [ ] Export a callable `registerShutdownSignals(handle, signalSource)` that registers both signals
      against the same `handle.close()` path; do not register at module import.
- [ ] Make `server/index.ts` the only executable composition root: resolve port, DB path, and evidence
      root; start runtime; register signals; set `process.exitCode` on startup/shutdown error.

**5. Refactor step**

- [ ] Keep default factories in one frozen object; tests inject fakes without production monkeypatches.
- [ ] Share one `shutdownPromise` inside the handle.
- [ ] Ensure error logging contains operation context but not credentials or evidence records.

**6. Backward compatibility**

- `start:api`, default port 3000, static dashboard, schema initialization, default runtime DB path,
  and default `test-results` evidence location remain operational.
- `AUTOTEST_DB_PATH` remains an optional operator override.
- Importing runtime/index helper modules does not itself listen; only executing `server/index.ts`
  starts the server.

**7. Risk**

- An Express listen error can occur asynchronously; the default listen adapter must reject on the
  server `error` event and remove temporary listeners.
- SQLite must not close while active HTTP requests still use it.
- Signal callbacks must not call `process.exit()` before awaited cleanup.

**8. Verification commands**

```bash
npx playwright test tests/unit/database/runtime-database.spec.ts tests/unit/server/runtime.spec.ts tests/unit/safety/import-boundary.spec.ts --project=framework --reporter=list
npm run typecheck
npx eslint database/runtime-database.ts server/runtime.ts server/index.ts tests/unit/database/runtime-database.spec.ts tests/unit/server/runtime.spec.ts
npx prettier --check database/runtime-database.ts server/runtime.ts server/index.ts tests/unit/database/runtime-database.spec.ts tests/unit/server/runtime.spec.ts
```

**9. Expected evidence**

- Event-order test shows HTTP close before DB close.
- Open/init/listen counts are exactly one.
- Every startup failure closes the acquired DB exactly once.
- Duplicate close is safe and import probe remains clean.

**10. Exit criteria**

- [ ] All lifecycle/error/signal/import tests pass.
- [ ] `server/index.ts` is the sole reporting-server executor.
- [ ] No runtime singleton/cache exists.
- [ ] No real `data/autotest.db` or production site is touched by tests.

---

### Slice 5: CLI Database Ownership

**1. Goal**

Give each DB CLI one explicit open/work/finally-close lifecycle without allowing `process.exit()` to
bypass cleanup, then remove the default DB singleton globally.

**2. Files affected**

- Create: `scripts/database-script-runtime.ts`
- Modify: `scripts/init-db.ts`
- Modify: `scripts/import-run-result.ts`
- Modify: `scripts/query-verification.ts`
- Modify: `scripts/sync-test-cases.ts`
- Modify: `database/sqlite.ts`
- Create: `tests/unit/scripts/database-script-runtime.spec.ts`
- Create: `tests/unit/scripts/database-scripts.spec.ts`

Interface produced:

```ts
export function withDatabase<T>(
  databasePath: string,
  operation: (connection: DatabaseConnection) => T,
  open: typeof openDatabase = openDatabase,
): T;
```

Each script exports one exact runner returning `0` on success and `1` on handled failure; the
`require.main === module` wrapper assigns `process.exitCode` after the runner returns:

```ts
interface DatabaseScriptDependencies {
  readonly openDatabase?: typeof openDatabase;
  readonly logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

runInitDatabase(databasePath: string, dependencies?: DatabaseScriptDependencies): number;
runImportRunResult(
  jsonPath: string,
  databasePath: string,
  dependencies?: DatabaseScriptDependencies,
): number;
runQueryVerification(databasePath: string, dependencies?: DatabaseScriptDependencies): number;
runSyncTestCases(databasePath: string, dependencies?: DatabaseScriptDependencies): number;
```

**3. Failing test / RED step**

- [ ] Write lifecycle tests first:

```ts
test('closes after success', () => {
  let closeCount = 0;
  const connection = fakeConnection(() => {
    closeCount += 1;
  });
  expect(
    withDatabase(
      'ignored.db',
      () => 'done',
      () => connection,
    ),
  ).toBe('done');
  expect(closeCount).toBe(1);
});

test('closes before rethrowing operation failure', () => {
  let closeCount = 0;
  const connection = fakeConnection(() => {
    closeCount += 1;
  });
  expect(() =>
    withDatabase(
      'ignored.db',
      () => {
        throw new Error('operation failed');
      },
      () => connection,
    ),
  ).toThrow('operation failed');
  expect(closeCount).toBe(1);
});
```

Use a small hand-written counter fake instead of a mocking framework if none exists.

- [ ] Add one injected-`openDatabase` test per exact runner proving its existing operation runs against
      an isolated in-memory connection and the runner returns only after close.
- [ ] Add a source/import assertion that no script executes when imported and no `process.exit(` call
      remains inside an owned lifecycle.
- [ ] Run RED; expected failures are missing helper/exports and top-level script execution.

**4. Minimal implementation / GREEN step**

- [ ] Implement `withDatabase` with literal `try/finally`.
- [ ] Move each script's current body into an exported function while preserving output and operation:
  - `runInitDatabase` calls `initializeSchema`;
  - `runImportRunResult` retains the existing Zod schema and repository import;
  - `runQueryVerification` retains the same read-only queries/output;
  - `runSyncTestCases` retains the same upsert/stale-row behavior.
- [ ] Resolve the path through `resolveRuntimeDatabasePath(process.env.AUTOTEST_DB_PATH)` only in the
      executable wrapper.
- [ ] Replace immediate `process.exit(1)` with returned status/`process.exitCode` after cleanup.
- [ ] Delete `getDefaultDatabase`, its module singleton, and every remaining import.

**5. Refactor step**

- [ ] Keep business operations in their current script files; share only connection ownership.
- [ ] Ensure JSON parse/validation errors in `db:import` preserve current diagnostics while not leaking
      a connection.
- [ ] Do not tighten imported run-result validation; that is Task 7.

**6. Backward compatibility**

- Package command names and console summaries remain unchanged.
- Default path remains `data/autotest.db` for intentional operator CLI execution.
- Schema/import/query/catalog-sync behavior remains unchanged.
- The global singleton API is intentionally removed.

**7. Risk**

- `sync-test-cases` deletes stale local reporting rows by current design; do not execute the real CLI
  during Task 1 verification. Unit tests inject an in-memory/fake connection.
- A parse error may occur before a DB is opened; the test should accept zero opens in that path and
  still prove no leaked connection.
- Do not “fix” permissive import schema, stale catalog logic, or output typing.

**8. Verification commands**

```bash
npx playwright test tests/unit/scripts/database-script-runtime.spec.ts tests/unit/scripts/database-scripts.spec.ts --project=framework --reporter=list
npm run typecheck
rg -n "getDefaultDatabase|process\.exit\(" database server scripts
npx eslint database/sqlite.ts scripts/database-script-runtime.ts scripts/init-db.ts scripts/import-run-result.ts scripts/query-verification.ts scripts/sync-test-cases.ts tests/unit/scripts/database-script-runtime.spec.ts tests/unit/scripts/database-scripts.spec.ts
npx prettier --check database/sqlite.ts scripts/database-script-runtime.ts scripts/init-db.ts scripts/import-run-result.ts scripts/query-verification.ts scripts/sync-test-cases.ts tests/unit/scripts/database-script-runtime.spec.ts tests/unit/scripts/database-scripts.spec.ts
```

**9. Expected evidence**

- Success and failure tests show one open and one close.
- Script imports perform no DB work.
- Repository search finds no `getDefaultDatabase` and no lifecycle-bypassing `process.exit(`.
- No real CLI command is run against `data/autotest.db`.

**10. Exit criteria**

- [ ] Four scripts use the explicit lifecycle helper.
- [ ] Global DB singleton/cache is removed.
- [ ] Focused tests/typecheck/scoped checks pass.
- [ ] CLI names and business output contracts are preserved.

---

### Slice 6: Test-Owned Workspace

**1. Goal**

Replace fixed repository artifacts with unique test-owned OS-temp workspaces and awaited exact-path
cleanup.

**2. Files affected**

- Create: `tests/support/test-artifact-workspace.ts`
- Create: `tests/unit/support/test-artifact-workspace.spec.ts`
- Modify: `tests/api/analytics.spec.ts`
- Modify: `tests/api/evidence.spec.ts`
- Modify: `tests/ui/run-details.spec.ts`
- Modify setup/teardown only where required in `tests/api/reporting.spec.ts`,
  `tests/ui/dashboard.spec.ts`, and `tests/ui/test-case-details.spec.ts`

Interface produced:

```ts
export interface TestArtifactWorkspace {
  readonly root: string;
  readonly evidenceRoot: string;
  readonly outsideEvidenceRoot: string;
  cleanup(): Promise<void>;
}

export function createTestArtifactWorkspace(prefix: string): Promise<TestArtifactWorkspace>;
```

**3. Failing test / RED step**

- [ ] Write utility contract tests first:

```ts
test('creates unique sibling roots under one owned OS-temp parent', async () => {
  const first = await createTestArtifactWorkspace('propify-artifacts-');
  const second = await createTestArtifactWorkspace('propify-artifacts-');
  try {
    expect(first.root).not.toBe(second.root);
    expect(path.dirname(first.evidenceRoot)).toBe(first.root);
    expect(path.dirname(first.outsideEvidenceRoot)).toBe(first.root);
  } finally {
    await Promise.all([first.cleanup(), second.cleanup()]);
  }
});

test('cleanup removes only the exact owned parent', async () => {
  const workspace = await createTestArtifactWorkspace('propify-artifacts-');
  const root = workspace.root;
  await workspace.cleanup();
  await expect(access(root)).rejects.toMatchObject({ code: 'ENOENT' });
});
```

- [ ] Add post-suite assertions that repository-root `outside-file.png`, `.temp-ui-test`, and
      `.temp-analytics-test-*.db` are not created.
- [ ] Run RED; expected failures are missing utility and existing fixed paths.

**4. Minimal implementation / GREEN step**

- [ ] Implement with `fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))`, then create `evidence` and
      `outside-evidence` siblings under the owned parent.
- [ ] Implement `cleanup()` as awaited `rm(root, { recursive: true })` without an empty catch or
      `force: true` masking unexpected failure.
- [ ] Put the analytics file DB at `path.join(workspace.root, 'analytics.db')`.
- [ ] Put evidence/UI files under `workspace.evidenceRoot`; put the intentional outside file under
      `workspace.outsideEvidenceRoot`.
- [ ] In every affected teardown: await HTTP close, close DB, then await workspace cleanup in
      `finally`. Preserve the first failure and surface cleanup failure rather than swallowing it.

**5. Refactor step**

- [ ] Share the workspace utility only across the three suites that demonstrably need it.
- [ ] Keep DB seeding and UI assertions local; do not introduce a generic fixture architecture.
- [ ] Use `DatabaseConnection` consistently instead of raw DB plus duplicate close wrappers where the
      touched setup allows a minimal conversion.

**6. Backward compatibility**

- API/UI assertions, seeded rows, response contracts, and dashboard behavior remain unchanged.
- Only physical temp locations and cleanup timing change.
- Tests remain parallel-safe and use no real runtime DB.

**7. Risk**

- Windows will reject removal while a server/DB/stream is open; teardown order is part of the test.
- `Promise.all` cleanup in the utility test is safe because the roots are distinct; production suites
  clean only their own root.
- Do not delete via globs, computed DB paths, repository root, or a path from an evidence record.

**8. Verification commands**

```bash
npx playwright test tests/unit/support/test-artifact-workspace.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/run-details.spec.ts --project=framework --reporter=list
npm run typecheck
npx eslint tests/support/test-artifact-workspace.ts tests/unit/support/test-artifact-workspace.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/run-details.spec.ts
npx prettier --check tests/support/test-artifact-workspace.ts tests/unit/support/test-artifact-workspace.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/run-details.spec.ts
```

Read-only repository check:

```powershell
Get-ChildItem -LiteralPath . -Force | Where-Object {
  $_.Name -eq 'outside-file.png' -or $_.Name -eq '.temp-ui-test' -or $_.Name -like '.temp-*.db'
}
```

**9. Expected evidence**

- Unique roots are below `os.tmpdir()` and share no paths across workspaces.
- Teardown leaves no owned root.
- Repository check prints no Task 1-created fixed artifact.
- No cleanup exception is caught and discarded.

**10. Exit criteria**

- [ ] Utility and affected suite tests pass.
- [ ] HTTP/DB/workspace teardown is awaited in the required order.
- [ ] No fixed repository temp artifact is created or deleted.
- [ ] No broad fixture refactor or unrelated UI test cleanup is included.

---

### Slice 7: Evidence Containment

**1. Goal**

Preserve evidence API/security semantics using the test-owned workspace and remove sensitive physical
path logging.

**2. Files affected**

- Modify: `server/services/EvidenceService.ts`
- Modify: `tests/api/evidence.spec.ts`
- Modify: `tests/ui/run-details.spec.ts` only if its stored path must follow the clarified contract

Resolver contract:

```ts
const resolvedPath = path.isAbsolute(record.path)
  ? path.resolve(record.path)
  : path.resolve(process.cwd(), record.path);
const relativePath = path.relative(evidenceRoot, resolvedPath);
const outside =
  relativePath === '..' ||
  relativePath.startsWith(`..${path.sep}`) ||
  path.isAbsolute(relativePath);
```

**3. Failing test / RED step**

- [ ] Seed exact owned paths and assert the response matrix:

```ts
const cases = [
  [validEvidenceId, 200, undefined],
  [missingEvidenceId, 404, 'EVIDENCE_FILE_NOT_FOUND'],
  [unsupportedMimeEvidenceId, 400, 'UNSUPPORTED_EVIDENCE_TYPE'],
  [relativeTraversalEvidenceId, 403, 'INVALID_EVIDENCE_PATH'],
  [absoluteOutsideEvidenceId, 403, 'INVALID_EVIDENCE_PATH'],
] as const;
```

- [ ] Construct the relative traversal record with
      `path.relative(process.cwd(), outsideOwnedFile)` and the absolute sibling record with the literal
      `outsideOwnedFile`; both files remain inside the test-owned parent but outside `evidenceRoot`.
- [ ] Add an assertion that metadata contains no `path`, `absolutePath`, or `physicalPath`.
- [ ] Capture logger output or source behavior so a missing file does not log its physical path/record.
- [ ] Run RED against the isolated evidence suite.

**4. Minimal implementation / GREEN step**

- [ ] Normalize required `evidenceRoot` once in the constructor.
- [ ] Resolve absolute records as absolute and historical relative records from `process.cwd()`.
- [ ] Reject only exact parent/parent-prefix/absolute-relative escapes, before existence/MIME checks.
- [ ] Preserve check order: containment → existence → allowlisted type/MIME/extension.
- [ ] Remove the current `console.log` that prints resolved paths and records.

**5. Refactor step**

- [ ] Extract a private `resolveContainedEvidencePath(recordPath)` method if it improves test clarity;
      do not create a generic filesystem abstraction.
- [ ] Keep MIME allowlist and safe filename behavior unchanged.

**6. Backward compatibility**

- Relative historical workspace paths remain resolvable.
- API response bodies, content disposition, 404/400/403 codes, and error codes remain unchanged.
- No new physical path is exposed.

**7. Risk**

- Prefix-only checks such as `startsWith('..')` incorrectly reject names like `..safe`; use the exact
  separator-aware test.
- Existence must not be checked before containment, or outside-path behavior can leak file state.
- Do not broaden MIME acceptance or change stream error behavior.

**8. Verification commands**

```bash
npx playwright test tests/api/evidence.spec.ts tests/ui/run-details.spec.ts --project=framework --reporter=list
npm run typecheck
npx eslint server/services/EvidenceService.ts tests/api/evidence.spec.ts tests/ui/run-details.spec.ts
npx prettier --check server/services/EvidenceService.ts tests/api/evidence.spec.ts tests/ui/run-details.spec.ts
```

**9. Expected evidence**

- Matrix is exactly 200/404/400/403/403 with existing error codes.
- Both outside cases use files owned by the test workspace.
- Metadata and logs contain no physical path.
- Valid image streaming and UI evidence rendering still pass.

**10. Exit criteria**

- [ ] All containment/MIME/existence tests pass.
- [ ] Security check order is explicit.
- [ ] No API contract or physical-path disclosure regression exists.
- [ ] No repository-root traversal fixture exists.

---

### Slice 8: Runtime SQLite Policy

**1. Goal**

Prevent new runtime/test SQLite artifacts from being added while preserving the existing tracked
`data/autotest.db` working file and untouched Git index entry.

**2. Files affected**

- Modify: `.gitignore`
- Create: `tests/unit/config/runtime-artifact-policy.spec.ts`
- Read-only verification target: `data/autotest.db`

**3. Failing test / RED step**

- [ ] Write a behavioral ignore-policy test using `git check-ignore --no-index`, not a weak substring
      assertion:

```ts
for (const candidate of [
  'data/new-runtime.db',
  'data/new-runtime.db-wal',
  'data/new-runtime.db-shm',
  '.temp-worker.db',
  '.temp-worker.db-wal',
  '.temp-worker.db-shm',
]) {
  test(`ignores ${candidate}`, () => {
    expect(spawnSync('git', ['check-ignore', '--no-index', candidate]).status).toBe(0);
  });
}
```

- [ ] Add a negative test proving a deliberate source fixture name such as
      `database/schema.ts` is not ignored.
- [ ] Run RED; representative SQLite candidates are not yet ignored.

**4. Minimal implementation / GREEN step**

- [ ] Add scoped patterns:

```gitignore
# Local SQLite runtime and root-level legacy test artifacts
/data/*.db
/data/*.db-wal
/data/*.db-shm
/.temp-*.db
/.temp-*.db-wal
/.temp-*.db-shm
```

- [ ] Do not run `git rm --cached`, `git add`, or any delete/move command.
- [ ] Re-run `git check-ignore --no-index` tests. `--no-index` is required because the existing DB is
      tracked and normal ignore behavior would be misleading.

**5. Refactor step**

- [ ] Keep patterns narrow enough not to hide intentional fixture/source files in unrelated folders.
- [ ] Remove any redundant root temp pattern only if existing broader rules already prove equivalent
      behavior through the test.

**6. Backward compatibility**

- Runtime default path remains `data/autotest.db`.
- Existing file content, path, and Git index state remain unchanged.
- Only newly generated runtime/WAL/SHM artifacts gain ignore policy.

**7. Risk**

- `.gitignore` does not untrack an existing file; reporting otherwise is a false success.
- Broad `*.db` could hide intentional fixtures; use scoped patterns.
- Hashing is read-only, but no application/test process may open the real DB.

**8. Verification commands**

```bash
npx playwright test tests/unit/config/runtime-artifact-policy.spec.ts --project=framework --reporter=list
git check-ignore --no-index -v data/new-runtime.db data/new-runtime.db-wal data/new-runtime.db-shm .temp-worker.db .temp-worker.db-wal .temp-worker.db-shm
git ls-files --stage -- data/autotest.db
git diff --cached --name-only
```

Recompute preservation evidence:

```powershell
$taskDbItem = Get-Item -LiteralPath 'data/autotest.db'
[pscustomobject]@{
  Path = $taskDbItem.FullName
  Size = $taskDbItem.Length
  Sha256 = (Get-FileHash -LiteralPath $taskDbItem.FullName -Algorithm SHA256).Hash
}
git status --short -- data/autotest.db .gitignore
```

**9. Expected evidence**

- All six candidates show the intended `.gitignore` rule.
- `git ls-files` still shows `data/autotest.db` tracked.
- DB path, size, and SHA-256 exactly match Phase 3 pre-flight.
- Cached diff is empty.

**10. Exit criteria**

- [ ] Ignore-policy tests pass.
- [ ] Existing DB preservation tuple matches exactly.
- [ ] DB remains in place and tracked; untracking remains deferred.
- [ ] No staging, deletion, move, rewrite, or DB open occurred.

---

### Slice 9: Documentation Consistency

**1. Goal**

Align current user-facing environment/runbook documentation with the production-only explicit target
without changing business mappings or rewriting historical design/plan records.

**2. Files affected**

- Modify: `README.md` environment/safety paragraphs only
- Modify: `docs/traceability/requirements-to-tests.md` environment/runbook columns only
- Modify: `tests/unit/config/package.scripts.spec.ts` environment-contract assertion only, preserving
  unrelated dirty changes
- Verify only: `.env.example`
- Do not modify historical `docs/superpowers/specs/*` or `docs/superpowers/plans/*` except this active
  plan/spec pair

**3. Failing test / RED step**

- [ ] Update the documentation contract test first:

```ts
const commonEnvironment = [
  'TEST_ENV',
  'PRODUCTION_BASE_URL',
  'DEFAULT_USER_EMAIL',
  'DEFAULT_USER_PASSWORD',
] as const;

expect(traceability).not.toContain('`DEV_BASE_URL`');
expect(traceability).not.toContain('`STAGING_BASE_URL`');
expect(traceability).toContain('`TEST_ENV=production`');
```

- [ ] For `generic-registration`, assert the runbook records it as unsupported under the current
      production-only target and deferred; do not assert a production command is executable.
- [ ] Run RED; current README/traceability docs still advertise dev/staging.

**4. Minimal implementation / GREEN step**

- [ ] Update README to state `TEST_ENV` is required, current website target is production, and target
      selection does not enable mutations.
- [ ] Update only environment/runbook wording and variable lists in
      `requirements-to-tests.md`: remove dev/staging URL keys, retain production URL/current gate names,
      and mark generic-registration as a deferred unsupported-target dependency.
- [ ] Preserve every Test Case ID, mapping row, automation status, script path, and business evidence
      statement.
- [ ] Keep real URLs/secrets out of all documentation.

**5. Refactor step**

- [ ] Use one consistent phrase: “isolated framework test environment” for unit/internal API/UI tests.
- [ ] Use one consistent phrase: “explicit production target does not grant mutation permission.”
- [ ] Do not rewrite old archived specs/plans merely because they describe historical architecture.

**6. Backward compatibility**

- Commands, project names, IDs, mapping relationships, gates, and automation status remain unchanged.
- Only inaccurate environment availability/configuration wording changes.

**7. Risk**

- `docs/traceability/requirements-to-tests.md` contains executable mapping assertions; patching whole
  rows can accidentally alter traceability. Diff each row and change only environment cells/text.
- Do not mark generic registration automated/not-automated or redirect it to production.
- Existing user changes overlap the documentation contract test; preserve unrelated assertions.

**8. Verification commands**

```bash
npx playwright test tests/unit/config/package.scripts.spec.ts --project=framework --reporter=list
rg -n "DEV_BASE_URL|STAGING_BASE_URL|TEST_ENV=dev|TEST_ENV=staging|default dev" README.md docs/traceability/requirements-to-tests.md .env.example
npx prettier --check README.md docs/traceability/requirements-to-tests.md tests/unit/config/package.scripts.spec.ts .env.example
git diff -- README.md docs/traceability/requirements-to-tests.md tests/unit/config/package.scripts.spec.ts .env.example
```

**9. Expected evidence**

- Contract test passes with production-only variable names.
- Consistency search returns no current-doc dev/staging configuration instruction.
- Diff shows no ID, mapping, status, script path, or business-rule change.
- Generic registration is recorded as deferred, not silently retargeted.

**10. Exit criteria**

- [ ] Current docs and `.env.example` describe one truthful environment model.
- [ ] Traceability relationships remain byte-for-byte unchanged outside environment/runbook wording.
- [ ] Historical records are not rewritten.
- [ ] No excluded scope item is modified.

---

### Slice 10: Final Task 1 Verification

**1. Goal**

Run the complete safe verification gate, distinguish Task 1 regressions from recorded baseline debt,
and prove no Git/DB/production mutation boundary was crossed.

**2. Files affected**

- No source file is modified by this slice.
- Read-only: all Task 1 diffs/status plus `data/autotest.db` metadata/hash.
- Test artifacts may be produced only under already ignored Playwright/test-results locations.

**3. Failing test / RED step**

- [ ] Before the final run, execute every focused command from Slices 1–9. Any failure is RED for its
      owning slice; return there instead of weakening assertions or accepting HTTP 500.
- [ ] Run the import-boundary and artifact-policy suites again after all refactors.

**4. Minimal implementation / GREEN step**

- [ ] Make no new implementation in Slice 10. Fix a failure only in its owning slice with a focused
      RED/GREEN cycle.
- [ ] Never convert a failure to skip/pass, broaden an assertion, accept 500, or modify a catalog
      status to make this gate green.

**5. Refactor step**

- [ ] None. If cleanup is still needed, return to Slice 1–9. Final verification must not mix behavior
      changes with evidence collection.

**6. Backward compatibility**

- Compare API/UI/framework behavior to the pre-Task-1 baseline.
- The known full-framework aggregation mismatch (34/49 expected versus 33/50 actual) remains a
  `DEPENDENCY / DEFERRED FINDING`; it must not be fixed or hidden here.

**7. Risk**

- The default Playwright reporters write tracking/report artifacts; use an explicit list reporter for
  safety-focused runs.
- `--list` performs discovery/config loading but not test execution; it is not evidence that E2E passed.
- A pre-existing framework failure is not permission for a new failure. Compare exact test identity and
  count.

**8. Verification commands**

Focused combined gate:

```bash
npx playwright test tests/unit/config/environment.config.spec.ts tests/unit/config/process-environment.config.spec.ts tests/unit/safety/import-boundary.spec.ts tests/unit/database/runtime-database.spec.ts tests/unit/server/runtime.spec.ts tests/unit/scripts/database-script-runtime.spec.ts tests/unit/scripts/database-scripts.spec.ts tests/unit/support/test-artifact-workspace.spec.ts tests/unit/config/runtime-artifact-policy.spec.ts tests/unit/config/package.scripts.spec.ts tests/api/reporting.spec.ts tests/api/analytics.spec.ts tests/api/evidence.spec.ts tests/ui/dashboard.spec.ts tests/ui/run-details.spec.ts tests/ui/test-case-details.spec.ts --project=framework --reporter=list
npm run typecheck
```

`tests/types/create-app.dependencies.typecheck.ts` is compile-only and is verified exclusively by
`npm run typecheck`; it is intentionally absent from the Playwright command.

Scoped lint/format using the exact changed-file list from Git status (review the list before running):

```powershell
$taskOneFiles = @(
  'config/environment.schema.ts',
  'config/environment.config.ts',
  'config/process-environment.config.ts',
  'playwright.config.ts',
  'database/sqlite.ts',
  'database/runtime-database.ts',
  'server/app.ts',
  'server/runtime.ts',
  'server/index.ts',
  'scripts/database-script-runtime.ts',
  'scripts/init-db.ts',
  'scripts/import-run-result.ts',
  'scripts/query-verification.ts',
  'scripts/sync-test-cases.ts'
)
npx eslint -- $taskOneFiles
npx prettier --check -- $taskOneFiles
```

Run additional scoped commands for the explicitly changed route/service/test/doc paths; do not feed
the entire dirty repository to an auto-fixing command.

Framework and discovery checks:

```bash
npm run test:framework -- --reporter=list
npx playwright test --list --reporter=list
```

Git and DB preservation checks:

```powershell
$taskDbItem = Get-Item -LiteralPath 'data/autotest.db'
[pscustomobject]@{
  Path = $taskDbItem.FullName
  Size = $taskDbItem.Length
  Sha256 = (Get-FileHash -LiteralPath $taskDbItem.FullName -Algorithm SHA256).Hash
}
git status --short
git diff
git diff --cached
```

**9. Expected evidence**

- Focused Task 1 suites, typecheck, scoped lint, and scoped format all pass.
- Framework run has no new failure; if the recorded aggregation mismatch remains, report its exact
  test identity separately and do not change it.
- Discovery completes without executing live tests or mutations.
- Final DB path/size/SHA-256 equals pre-flight.
- `git diff --cached` is empty; status contains all preserved pre-existing dirty paths plus only
  reviewed Task 1 files.
- No production mutation, OTP, registration, or business cleanup flow ran.

**10. Exit criteria**

- [ ] Every Slice 1–9 exit gate is satisfied with retained evidence.
- [ ] No new focused/type/lint/format/API/UI/framework regression exists.
- [ ] DB preservation tuple matches exactly and staging is empty.
- [ ] Diff contains no excluded-scope or unrelated cleanup.
- [ ] Final report explicitly lists closed Task 1 findings and all deferred dependencies.

## Planning-only confirmation

```text
Implementation has NOT started.
No source file changed as part of planning.
No file staged.
No commit.
No push.
No merge.
No PR.
No production mutation executed.
```

Execution starts only after the user approves this implementation plan and selects the Phase 3
execution workflow.
