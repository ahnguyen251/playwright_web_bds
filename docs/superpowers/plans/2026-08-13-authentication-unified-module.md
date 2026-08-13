# Unified Authentication Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 16 authoritative `TC-AUTH-*` Playwright scenarios for Propify MODULE 01 while preserving the working Gmail OTP flow and the repository's current risk-based project separation.

**Architecture:** Keep `Tests → Fixtures → Workflows/Helpers → Page Objects → Playwright`. Validation tests remain read-only and multi-browser; Gmail/password/account mutations remain serial Chromium tests behind existing safety gates. Exact test-case metadata is centralized, request observation is reusable, secrets stay in environment variables, and missing deterministic infrastructure is represented by explicit skipped tests rather than mocks that fake business outcomes.

**Tech Stack:** TypeScript 6, Playwright Test 1.62, Zod 4, Node.js 20+, Gmail API adapter already present in the repository.

## Global Constraints

- The authoritative source is `document/Propify_Playwright_TestCase_Unified.md`.
- Every Playwright test name starts with its exact `TC-AUTH-*` ID.
- Preserve the current `RegistrationWorkflow`/`PasswordRecoveryWorkflow` → `OtpProvider` → Gmail flow and its `requestedAfter` timing.
- Never hard-code or log credentials, OTP values, cookies, or JWT values.
- Do not automate real Google OAuth.
- Do not use `any`, `waitForTimeout()`, fixed sleeps, ambiguous `nth()` workarounds, or brittle selectors when semantic locators exist.
- Validation cases that require no API call must assert a zero request count.
- Do not modify Propify application behavior or unrelated repository modules.
- Preserve all pre-existing dirty Listing and utility files; stage only files named by the active task.

---

## File Structure

### Create

- `constants/authentication.ts`: exact AUTH API paths, expected auth cookie names, and stable blocker reasons.
- `helpers/network/AuthRequestObserver.ts`: typed request counting and response observation for AUTH operations.
- `tests/component/helpers/AuthRequestObserver.spec.ts`: deterministic component coverage for the observer without mocking E2E business outcomes.
- `tests/unit/test-cases/authentication-unified.test-cases.spec.ts`: verifies the exact 16-ID catalog, tags, and authoritative data tables.

### Modify

- `.env.example`: add placeholder-only Locked-account variables.
- `config/environment.schema.ts`, `config/environment.config.ts`, `types/environment.types.ts`: optional all-or-nothing Locked-account configuration.
- `types/user.types.ts`, `test-data/static/users.json`, `test-data/static/authentication.json`, `test-data/factories/AuthenticationDataFactory.ts`: typed Locked alias and authoritative AUTH validation data.
- `constants/tags.ts`: add `@external` for Gmail-dependent tests.
- `test-cases/authentication/registration.test-cases.ts`: exact eight registration cases.
- `test-cases/authentication/login.test-cases.ts`: exact five login cases.
- `test-cases/authentication/password-recovery.test-cases.ts`: exact three forgot-password cases.
- `pages/authentication/RegisterPage.ts`, `LoginPage.ts`, `ForgotPasswordPage.ts`: missing semantic operations and observable state.
- `utils/BrowserHelper.ts`: auth-cookie presence check that never returns values.
- `fixtures/auth.fixture.ts`: optional Locked-user fixture and existing external execution gates.
- `tests/component/pages/RegisterPage.spec.ts`, `LoginPage.spec.ts`, `ForgotPasswordPage.spec.ts`: Page Object contract coverage.
- `tests/unit/config/environment.config.spec.ts`, `tests/unit/fixtures/auth.fixture.spec.ts`, `tests/unit/utils/BrowserHelper.spec.ts`: configuration and fixture behavior.
- `tests/authentication/registration.validation.spec.ts`, `registration.otp.mutating.spec.ts`, `registration.production.spec.ts`: authoritative registration tests.
- `tests/authentication/login.positive.spec.ts`, `login.negative.spec.ts`, `login.boundary.spec.ts`: authoritative login tests, including the conditionally executable Locked account.
- `tests/authentication/password-recovery.validation.spec.ts`, `password-recovery.otp.mutating.spec.ts`: authoritative forgot-password tests.
- `docs/traceability/requirements-to-tests.md`: per-ID automated/partial/blocked evidence.
- `package.json`: make `test:auth` target AUTH only and add an explicit command for external/mutating AUTH execution without changing global projects.

---

### Task 1: Lock the exact AUTH catalog and typed environment contract

**Files:**

- Create: `tests/unit/test-cases/authentication-unified.test-cases.spec.ts`
- Modify: `test-cases/authentication/registration.test-cases.ts`
- Modify: `test-cases/authentication/login.test-cases.ts`
- Modify: `test-cases/authentication/password-recovery.test-cases.ts`
- Modify: `test-data/static/authentication.json`
- Modify: `test-data/factories/AuthenticationDataFactory.ts`
- Modify: `constants/tags.ts`
- Modify: `.env.example`
- Modify: `config/environment.schema.ts`
- Modify: `config/environment.config.ts`
- Modify: `types/environment.types.ts`
- Modify: `types/user.types.ts`
- Modify: `test-data/static/users.json`
- Test: `tests/unit/config/environment.config.spec.ts`

**Interfaces:**

- Produces: `registrationTestCases`, `loginTestCases`, and `passwordRecoveryTestCases`, whose combined IDs equal the authoritative 16 IDs.
- Produces: `AuthenticationValidationData.invalidRegistrationEmails`, `invalidRegistrationPasswords`, `validPassword`, `mismatchedPassword`, and exact expected-message fields.
- Produces: `EnvironmentConfig.lockedUser?: { readonly email: string; readonly password: string }`.
- Produces: `TAGS.external === '@external'` and `UserAlias` including `'lockedUser'`.

- [ ] **Step 1: Write the failing catalog and environment tests**

```ts
const expectedIds = [
  'TC-AUTH-REGISTER-001', 'TC-AUTH-REGISTER-002', 'TC-AUTH-REGISTER-003',
  'TC-AUTH-REGISTER-004', 'TC-AUTH-REGISTER-005', 'TC-AUTH-REGISTER-006',
  'TC-AUTH-REGISTER-007', 'TC-AUTH-REGISTER-008', 'TC-AUTH-LOGIN-001',
  'TC-AUTH-LOGIN-002', 'TC-AUTH-LOGIN-003', 'TC-AUTH-LOGIN-004',
  'TC-AUTH-LOGIN-005', 'TC-AUTH-FORGOT-001', 'TC-AUTH-FORGOT-002',
  'TC-AUTH-FORGOT-003',
] as const;

expect([
  ...registrationTestCases,
  ...loginTestCases,
  ...passwordRecoveryTestCases,
].map(({ id }) => id)).toEqual(expectedIds);
expect(AuthenticationDataFactory.getValidationData().invalidRegistrationEmails).toEqual([
  'auto_reg@gmail', 'auto_reg', 'auto@.com',
]);
expect(AuthenticationDataFactory.getValidationData().invalidRegistrationPasswords).toEqual([
  '1234567', 'admin123', 'ADMIN123', 'AdminAsdf',
]);
```

Add environment tests proving both Locked keys are accepted together, neither is accepted alone,
and validation errors contain only key names rather than values.

- [ ] **Step 2: Run the tests and verify the expected failures**

Run:

```powershell
npx playwright test tests/unit/test-cases/authentication-unified.test-cases.spec.ts tests/unit/config/environment.config.spec.ts --project=framework --workers=1
```

Expected: FAIL because the `TC-AUTH-*` catalog, `@external`, and `lockedUser` environment contract do not exist yet.

- [ ] **Step 3: Implement the exact metadata, data tables, tags, and environment parsing**

Use an all-or-nothing optional Locked-user pair:

```ts
const lockedUser =
  parsed.data.LOCKED_USER_EMAIL && parsed.data.LOCKED_USER_PASSWORD
    ? Object.freeze({
        email: parsed.data.LOCKED_USER_EMAIL,
        password: parsed.data.LOCKED_USER_PASSWORD,
      })
    : undefined;
```

The Zod `superRefine` must add an issue for the missing counterpart when exactly one Locked key is configured. `.env.example` contains only:

```dotenv
LOCKED_USER_EMAIL=replace-with-locked-user@example.test
LOCKED_USER_PASSWORD=replace-with-locked-user-password
```

Do not copy the credential supplied in chat into a tracked file.

- [ ] **Step 4: Run the catalog and environment tests until green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit only Task 1 files**

```powershell
git add -- .env.example constants/tags.ts config/environment.schema.ts config/environment.config.ts types/environment.types.ts types/user.types.ts test-data/static/users.json test-data/static/authentication.json test-data/factories/AuthenticationDataFactory.ts test-cases/authentication tests/unit/test-cases/authentication-unified.test-cases.spec.ts tests/unit/config/environment.config.spec.ts
git commit -m "test: align authentication catalog with unified cases"
```

---

### Task 2: Add typed AUTH network and authenticated-cookie observation

**Files:**

- Create: `constants/authentication.ts`
- Create: `helpers/network/AuthRequestObserver.ts`
- Create: `tests/component/helpers/AuthRequestObserver.spec.ts`
- Modify: `utils/BrowserHelper.ts`
- Modify: `tests/unit/utils/BrowserHelper.spec.ts`

**Interfaces:**

- Produces: `type AuthOperation = 'registration' | 'login' | 'forgotPassword'`.
- Produces: `AuthRequestObserver.countDuring(operation, action): Promise<number>`.
- Produces: `AuthRequestObserver.waitForResponse(operation, action): Promise<AuthResponseSnapshot>` where the snapshot contains only `status` and parsed `body: unknown`.
- Produces: `BrowserHelper.hasAuthenticationCookies(context): Promise<boolean>`; it checks names only and never exposes cookie values.

- [ ] **Step 1: Write failing helper tests**

```ts
await page.route('**/api/v1/auth/login', async (route) => {
  await route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"rejected"}' });
});
const observer = new AuthRequestObserver(page);
const count = await observer.countDuring('login', async () => {
  await page.evaluate(() => fetch('/api/v1/auth/login', { method: 'POST' }));
});
expect(count).toBe(1);
```

Also test zero requests, listener cleanup, exact-path matching, response status/body typing, both required cookie names present, and one cookie missing.

- [ ] **Step 2: Run helper tests and verify they fail**

Run:

```powershell
npx playwright test tests/component/helpers/AuthRequestObserver.spec.ts tests/unit/utils/BrowserHelper.spec.ts --project=framework --workers=1
```

Expected: FAIL because the observer, constants, and cookie method do not exist.

- [ ] **Step 3: Implement minimal exact-path observation**

```ts
export const AUTH_API_PATHS = Object.freeze({
  registration: '/api/v1/auth/register',
  login: '/api/v1/auth/login',
  forgotPassword: '/api/v1/auth/forgot-password',
});

export const AUTH_COOKIE_NAMES = Object.freeze([
  'propify_user_access_token',
  'propify_user_refresh_token',
] as const);
```

Attach and remove Playwright listeners inside `try/finally`. Never retain `Request`, `Response`, headers, request bodies, or cookie values beyond the operation.

- [ ] **Step 4: Run helper tests until green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit only Task 2 files**

```powershell
git add -- constants/authentication.ts helpers/network/AuthRequestObserver.ts tests/component/helpers/AuthRequestObserver.spec.ts utils/BrowserHelper.ts tests/unit/utils/BrowserHelper.spec.ts
git commit -m "test: add safe authentication state observers"
```

---

### Task 3: Extend AUTH Page Objects without changing OTP orchestration

**Files:**

- Modify: `pages/authentication/RegisterPage.ts`
- Modify: `pages/authentication/LoginPage.ts`
- Modify: `pages/authentication/ForgotPasswordPage.ts`
- Modify: `tests/component/pages/RegisterPage.spec.ts`
- Modify: `tests/component/pages/LoginPage.spec.ts`
- Modify: `tests/component/pages/ForgotPasswordPage.spec.ts`

**Interfaces:**

- Produces on `RegisterPage`: `fillFullName`, `fillEmail`, `fillPassword`, `fillPasswordConfirmation`, matching blur methods, `fieldValidationMessages`, `serverMessage`, `submitAndObserveTransition`, `isResendEnabled`, and `waitForResendEnabled`.
- `submitAndObserveTransition()` clicks submit and returns `{ readonly disabledObserved: boolean; readonly loadingTextObserved: boolean }` after observing `Tạo tài khoản → Đang xử lý...`.
- Produces on `LoginPage`: exact server message access and required-field operations without exposing locators to tests.
- Produces on `ForgotPasswordPage`: exact feedback, `isResendEnabled`, and state-preserving OTP operations.

- [ ] **Step 1: Write failing Page Object component tests**

Add deterministic DOM fixtures that prove:

```ts
expect(await registerPage.submitAndObserveTransition()).toEqual({
  disabledObserved: true,
  loadingTextObserved: true,
});
expect(await registerPage.fieldValidationMessages()).toEqual([
  'Email không hợp lệ',
]);
await expect.poll(async () => registerPage.isResendEnabled()).toBe(true);
```

For forgot-password, use six uniquely labelled OTP inputs in the component fixture so the Page Object does not add new positional selectors. For login, verify exact server feedback and separate empty-email/empty-password filling.

- [ ] **Step 2: Run Page Object tests and verify failures**

Run:

```powershell
npx playwright test tests/component/pages/RegisterPage.spec.ts tests/component/pages/LoginPage.spec.ts tests/component/pages/ForgotPasswordPage.spec.ts --project=framework --workers=1
```

Expected: FAIL on the new missing methods and state observations.

- [ ] **Step 3: Implement the smallest Page Object changes**

Keep all locators private except existing public web-first checkpoints. Use `MutationObserver` inside `RegisterPage.submitAndObserveTransition()` to capture the transient disabled/text states without delaying the backend. Do not change provider selection, correlation timing, or Gmail behavior in this task.

- [ ] **Step 4: Run Page Object tests until green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit only Task 3 files**

```powershell
git add -- pages/authentication/RegisterPage.ts pages/authentication/LoginPage.ts pages/authentication/ForgotPasswordPage.ts tests/component/pages/RegisterPage.spec.ts tests/component/pages/LoginPage.spec.ts tests/component/pages/ForgotPasswordPage.spec.ts
git commit -m "test: expose authoritative authentication UI states"
```

---

### Task 4: Implement registration traceability and executable cases

**Files:**

- Modify: `fixtures/auth.fixture.ts`
- Modify: `tests/unit/fixtures/auth.fixture.spec.ts`
- Modify: `tests/authentication/registration.validation.spec.ts`
- Modify: `tests/authentication/registration.otp.mutating.spec.ts`
- Modify: `tests/authentication/registration.production.spec.ts`
- Modify: `workflows/authentication/RegistrationWorkflow.ts`
- Modify: `tests/unit/workflows/authentication/RegistrationWorkflow.spec.ts`

**Interfaces:**

- Consumes: Task 1 registration metadata/data, Task 2 `AuthRequestObserver`, existing `registrationWorkflow`, `otpProvider`, and unique registration factories.
- Produces: `RegistrationSubmission extends RegistrationCorrelation` with `submitState`, returned by `RegistrationWorkflow.submitRegistration()`, `register()`, and `registerAndVerify()`; `verifyRegistration(context)` continues to consume the same correlation fields.
- Produces: all registration test names beginning `TC-AUTH-REGISTER-001` through `TC-AUTH-REGISTER-008`.

- [ ] **Step 1: Write/rename registration tests so discovery fails against old IDs**

First add a workflow unit test proving `requestedAfter` is captured before `submitAndObserveTransition()` and the returned `RegistrationSubmission` contains the observation. Then use one Playwright test per authoritative case, with `test.step` loops for the exact data-driven values. Combined negative/state cases use two names with the same exact ID and descriptive suffix:

```ts
test('TC-AUTH-REGISTER-003 - Chặn đăng ký khi Email sai định dạng', async ({ registerPage }) => {
  for (const email of registrationInvalidEmailTestCase.invalidEmails) {
    await test.step(email, async () => {
      await registerPage.fillEmail(email);
      await registerPage.blurEmail();
      expect(await registerPage.fieldValidationMessages()).toContain('Email không hợp lệ');
    });
  }
});
```

`TC-AUTH-REGISTER-002` wraps the empty-form interaction in `AuthRequestObserver.countDuring('registration', action)` and asserts zero. `TC-AUTH-REGISTER-001` uses the existing workflow and asserts submit transition, response status/body contract when exposed, authenticated UI, home URL, and cookie-name presence. `TC-AUTH-REGISTER-007 - OTP sai` derives a six-digit value that differs from the retrieved OTP. `TC-AUTH-REGISTER-007 - OTP hết hạn` is explicitly skipped with the stable expiry blocker. `TC-AUTH-REGISTER-008` asserts disabled then waits web-first for enabled.

- [ ] **Step 2: Run discovery and focused read-only registration tests**

Run:

```powershell
npx playwright test tests/authentication/registration.validation.spec.ts --project=chromium --workers=1
npx playwright test tests/authentication/registration.otp.mutating.spec.ts tests/authentication/registration.production.spec.ts --list
```

Expected before implementation: old IDs remain or new tests fail because fixture/Page Object behavior is incomplete.

- [ ] **Step 3: Implement the minimal fixture wiring and registration test bodies**

Update `RegistrationWorkflow` to call `submitAndObserveTransition()` immediately after capturing `requestedAfter`, return the observation with the existing correlation, and otherwise preserve the current OTP sequence. Preserve the existing production/non-production registration split and safety gates. Do not replace Gmail retrieval. Do not report environment skips as passes. Keep persistent-account creation restricted by the existing explicit execution flags.

- [ ] **Step 4: Run registration component/unit/read-only tests**

Run:

```powershell
npx playwright test tests/unit/workflows/authentication/RegistrationWorkflow.spec.ts tests/unit/fixtures/auth.fixture.spec.ts tests/component/pages/RegisterPage.spec.ts --project=framework --workers=1
npx playwright test tests/authentication/registration.validation.spec.ts --project=chromium --workers=1
```

Expected: framework and non-external registration validation tests PASS; external cases are discovered and gated according to environment.

- [ ] **Step 5: Commit only Task 4 files**

```powershell
git add -- fixtures/auth.fixture.ts workflows/authentication/RegistrationWorkflow.ts tests/unit/fixtures/auth.fixture.spec.ts tests/authentication/registration.validation.spec.ts tests/authentication/registration.otp.mutating.spec.ts tests/authentication/registration.production.spec.ts tests/unit/workflows/authentication/RegistrationWorkflow.spec.ts
git commit -m "test: implement unified registration scenarios"
```

---

### Task 5: Implement login, including the environment-backed Locked account

**Files:**

- Modify: `fixtures/auth.fixture.ts`
- Modify: `tests/unit/fixtures/auth.fixture.spec.ts`
- Modify: `tests/authentication/login.positive.spec.ts`
- Modify: `tests/authentication/login.negative.spec.ts`
- Modify: `tests/authentication/login.boundary.spec.ts`
- Test: `tests/unit/workflows/authentication/LoginWorkflow.spec.ts`

**Interfaces:**

- Consumes: `EnvironmentConfig.lockedUser`, Task 2 observers, `LoginWorkflow`, `LoginPage`, `HeaderComponent`, and `BrowserHelper.hasAuthenticationCookies`.
- Produces: fixture `lockedUser: UserCredentials | undefined` without logging values.
- Produces: all login names beginning `TC-AUTH-LOGIN-001` through `TC-AUTH-LOGIN-005`.

- [ ] **Step 1: Write failing fixture and login tests**

```ts
test('TC-AUTH-LOGIN-003 - Chặn đăng nhập với tài khoản bị khóa', async ({
  lockedUser,
  loginPage,
  loginWorkflow,
}) => {
  test.skip(lockedUser === undefined, LOCKED_ACCOUNT_BLOCKER);
  if (lockedUser === undefined) return;
  await loginPage.openHome();
  await loginPage.open();
  await loginPage.submitCredentials(lockedUser);
  expect(await loginPage.serverMessage()).toBe('Tài khoản của bạn đã bị khóa');
  expect(await loginWorkflow.isAuthenticated()).toBe(false);
});
```

`TC-AUTH-LOGIN-001` asserts home URL, account UI, and cookie-name presence. `TC-AUTH-LOGIN-002` asserts the exact MD message and unchanged URL. `TC-AUTH-LOGIN-004` checks both missing-field variants and zero POSTs to `/api/v1/auth/login`. `TC-AUTH-LOGIN-005` is an explicit skipped test with the deterministic OAuth-mock blocker and never clicks Google.

- [ ] **Step 2: Run focused login tests and verify failures**

Run:

```powershell
npx playwright test tests/unit/fixtures/auth.fixture.spec.ts tests/unit/workflows/authentication/LoginWorkflow.spec.ts tests/component/pages/LoginPage.spec.ts --project=framework --workers=1
npx playwright test tests/authentication/login.positive.spec.ts tests/authentication/login.negative.spec.ts tests/authentication/login.boundary.spec.ts --project=chromium --workers=1
```

Expected before implementation: fixture/ID/assertion failures reveal the old catalog and missing Locked wiring.

- [ ] **Step 3: Implement optional Locked fixture and scenario bodies**

Construct the fixture only when the validated pair exists. The real credential remains in untracked `.env`; tracked code contains only variable names. Keep `TC-AUTH-LOGIN-005` excluded until a repository-owned OAuth mock contract exists.

- [ ] **Step 4: Run focused login tests until green or explicitly skipped**

Run the Step 2 command. Expected: `001`, `002`, and `004` PASS; `003` PASS when the two Locked variables are set or SKIP with its exact blocker; `005` SKIP.

- [ ] **Step 5: Commit only Task 5 files**

```powershell
git add -- fixtures/auth.fixture.ts tests/unit/fixtures/auth.fixture.spec.ts tests/authentication/login.positive.spec.ts tests/authentication/login.negative.spec.ts tests/authentication/login.boundary.spec.ts tests/unit/workflows/authentication/LoginWorkflow.spec.ts
git commit -m "test: implement unified login scenarios"
```

---

### Task 6: Implement forgot-password scenarios with guaranteed cleanup

**Files:**

- Modify: `tests/authentication/password-recovery.validation.spec.ts`
- Modify: `tests/authentication/password-recovery.otp.mutating.spec.ts`
- Modify: `workflows/authentication/PasswordRecoveryWorkflow.ts`
- Modify: `tests/unit/workflows/authentication/PasswordRecoveryWorkflow.spec.ts`
- Modify: `test-data/factories/AuthenticationDataFactory.ts`

**Interfaces:**

- Consumes: existing `PasswordRecoveryWorkflow`, shared `OtpProvider`, `mutatingUser`, Task 1 forgot-password metadata, Task 2 observer, and Task 3 Page Object feedback.
- Produces: a unique valid Gmail-format nonexistent email factory result.
- Produces: `PasswordRecoveryWorkflow.beginPasswordRecovery(email): Promise<OtpQuery>` and `submitOtp(code): Promise<void>`; `resetPassword()` composes those methods and keeps its public signature unchanged.
- Produces: all forgot-password names beginning `TC-AUTH-FORGOT-001` through `TC-AUTH-FORGOT-003`.

- [ ] **Step 1: Write failing authoritative forgot-password tests**

First extend the workflow unit test to prove `beginPasswordRecovery()` captures `requestedAfter` immediately before `requestReset()` and `resetPassword()` composes the new methods in the original order. `TC-AUTH-FORGOT-001` keeps the existing `try/finally` baseline restoration but uses the exact ID and asserts success stage plus login with the changed password before cleanup. `TC-AUTH-FORGOT-002` submits a unique valid email, waits for `/api/v1/auth/forgot-password`, asserts the exact visible error and that the stage stays `email`. `TC-AUTH-FORGOT-003 - OTP sai` calls `beginPasswordRecovery()`, retrieves the real OTP through the shared fixture, derives a different six-digit value, calls workflow `submitOtp()`, and asserts retry remains possible. `TC-AUTH-FORGOT-003 - OTP hết hạn` is skipped with the exact expiry-infrastructure blocker.

- [ ] **Step 2: Run workflow and discovery tests to verify failures**

Run:

```powershell
npx playwright test tests/unit/workflows/authentication/PasswordRecoveryWorkflow.spec.ts tests/component/pages/ForgotPasswordPage.spec.ts --project=framework --workers=1
npx playwright test tests/authentication/password-recovery.validation.spec.ts --project=chromium --workers=1
npx playwright test tests/authentication/password-recovery.otp.mutating.spec.ts --list
```

Expected before implementation: old `AUTH-RECOVERY-*` IDs or new behavior failures.

- [ ] **Step 3: Implement the minimal data and test changes**

Refactor `PasswordRecoveryWorkflow.resetPassword()` through `beginPasswordRecovery()` and `submitOtp()` while keeping `requestedAfter` immediately before `requestReset`. Do not create another OTP provider. Always restore the dedicated user's baseline password in `finally`; cleanup failure remains a test failure and is never swallowed.

- [ ] **Step 4: Run focused forgot-password tests**

Run the Step 2 commands. Expected: validation/nonexistent-email behavior PASS when the deployed contract matches; Gmail/mutating tests run only under the existing safety flags; expiry remains explicitly skipped.

- [ ] **Step 5: Commit only Task 6 files**

```powershell
git add -- test-data/factories/AuthenticationDataFactory.ts workflows/authentication/PasswordRecoveryWorkflow.ts tests/authentication/password-recovery.validation.spec.ts tests/authentication/password-recovery.otp.mutating.spec.ts tests/unit/workflows/authentication/PasswordRecoveryWorkflow.spec.ts
git commit -m "test: implement unified password recovery scenarios"
```

---

### Task 7: Final traceability, scripts, and full verification

**Files:**

- Modify: `docs/traceability/requirements-to-tests.md`
- Modify: `package.json`
- Modify: `tests/unit/config/package.scripts.spec.ts`
- Verify: every file changed in Tasks 1–6

**Interfaces:**

- Produces: `npm run test:auth` for non-mutating AUTH tests only.
- Produces: `npm run test:auth:external` for approved serial Chromium OTP/mutating AUTH tests.
- Produces: a traceability row for each exact `TC-AUTH-*` ID with Automated, Partial, BLOCKED, or EXCLUDED status.

- [ ] **Step 1: Write failing package-script and traceability assertions**

Update `tests/unit/config/package.scripts.spec.ts` to require:

```ts
expect(scripts['test:auth']).toBe(
  'playwright test tests/authentication --grep-invert "@external|@mutating" --workers=2',
);
expect(scripts['test:auth:external']).toBe(
  'playwright test tests/authentication --grep "@external|@mutating" --workers=1',
);
```

Add traceability rows for all 16 IDs. Mark combined expiry cases Partial/BLOCKED, OAuth EXCLUDED, and environment-gated tests Automated/conditional rather than Pass.

- [ ] **Step 2: Run the script test and verify failure**

Run:

```powershell
npx playwright test tests/unit/config/package.scripts.spec.ts --project=framework --workers=1
```

Expected: FAIL because the new scripts are absent.

- [ ] **Step 3: Update scripts and traceability**

Do not include Profile in `test:auth`. Do not loosen Playwright global mutation gates. Document the exact external prerequisites without secret values.

- [ ] **Step 4: Run formatting, static checks, focused tests, discovery, and the module**

Run exactly:

```powershell
npx prettier --write constants/authentication.ts helpers/network/AuthRequestObserver.ts config/environment.schema.ts config/environment.config.ts types/environment.types.ts types/user.types.ts test-data/static/users.json test-data/static/authentication.json test-data/factories/AuthenticationDataFactory.ts test-cases/authentication pages/authentication fixtures/auth.fixture.ts utils/BrowserHelper.ts tests/authentication tests/component/helpers/AuthRequestObserver.spec.ts tests/component/pages/RegisterPage.spec.ts tests/component/pages/LoginPage.spec.ts tests/component/pages/ForgotPasswordPage.spec.ts tests/unit/test-cases/authentication-unified.test-cases.spec.ts tests/unit/config/environment.config.spec.ts tests/unit/config/package.scripts.spec.ts tests/unit/fixtures/auth.fixture.spec.ts tests/unit/utils/BrowserHelper.spec.ts tests/unit/workflows/authentication docs/traceability/requirements-to-tests.md package.json .env.example
npm run typecheck
npm run lint
npx playwright test tests/unit/test-cases/authentication-unified.test-cases.spec.ts tests/component/helpers/AuthRequestObserver.spec.ts tests/component/pages/RegisterPage.spec.ts tests/component/pages/LoginPage.spec.ts tests/component/pages/ForgotPasswordPage.spec.ts tests/unit/config/environment.config.spec.ts tests/unit/config/package.scripts.spec.ts tests/unit/fixtures/auth.fixture.spec.ts tests/unit/utils/BrowserHelper.spec.ts tests/unit/workflows/authentication --project=framework --workers=1
npx playwright test tests/authentication --list
npx playwright test tests/authentication --workers=1
```

Expected: static and framework checks PASS. Each AUTH E2E result is recorded individually; environment-gated or infrastructure-blocked cases remain SKIPPED with explicit reasons rather than being reported as passing.

- [ ] **Step 5: Inspect the final diff and confirm unrelated files are untouched**

Run:

```powershell
git diff --check
git status --short
git diff --name-only 4d665cf..HEAD
```

Expected: no whitespace errors; only AUTH/support/traceability files from this plan plus the user's pre-existing unrelated dirty files appear.

- [ ] **Step 6: Commit final traceability and script changes**

```powershell
git add -- docs/traceability/requirements-to-tests.md package.json tests/unit/config/package.scripts.spec.ts
git commit -m "docs: report unified authentication traceability"
```

- [ ] **Step 7: Prepare the final per-ID report**

For each of the 16 IDs report: Automated/Partial/BLOCKED/EXCLUDED, exact spec file, supporting Page Object/Workflow/Fixture, execution result, and blocker. Include the exact module command `npx playwright test tests/authentication --workers=1`. Do not print credential, OTP, cookie, token, request body, or response body containing sensitive data.
