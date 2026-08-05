# Authentication Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Refactor the existing Propify Authentication implementation and deliver typed, traceable Login, Registration, Gmail OTP, Password Recovery, Profile, and Change Password automation without placing locators or business logic in tests.

**Architecture:** Retain the current fixture → workflow → Page Object dependency direction. Split feature workflows by responsibility, compose shared authentication/profile UI components, and inject an OtpProvider contract whose first infrastructure adapter uses Gmail API OAuth2.

**Tech Stack:** Node.js 20+, npm, TypeScript 6 strict mode, Playwright Test 1.62, googleapis 174.0.0, Zod 4, ESLint, Prettier, HTML reporter, and Allure Playwright.

## Global Constraints

- Modify existing files in place; do not recreate the framework or change unrelated feature contracts.
- All Page-level objects inherit BasePage; reusable UI regions are composed components.
- Every locator stays in a Page Object or Page component.
- Tests contain scenarios, test metadata, assertions, and technical skip declarations only.
- Workflows contain reusable business journeys but no locators, assertions, environment reads, or Gmail implementation details.
- TypeScript remains strict with noUncheckedIndexedAccess and exactOptionalPropertyTypes.
- Real credentials, OAuth values, OTP values, access tokens, refresh tokens, and message bodies never enter Git, logs, traces, screenshots, or reports.
- Non-mutating authentication tests remain parallel and multi-browser.
- OTP, registration, profile mutation, password recovery, and password change are opt-in through RUN_OTP_E2E and RUN_MUTATING_E2E and execute serially in Chromium.
- Admin, CAPTCHA bypass, Google account-selection automation, and production-user deletion are out of scope.

---

## File map

### Modified files

- package.json — add the pinned Gmail API dependency and authentication scripts.
- tsconfig.json — include helpers.
- config/environment.schema.ts — validate optional Gmail and execution-policy variables.
- config/environment.config.ts and types/environment.types.ts — expose immutable authentication execution configuration.
- constants/tags.ts and constants/timeouts.ts — add OTP/mutating tags and mailbox timing constants.
- types/user.types.ts — correct registration/profile/password contracts.
- pages/authentication/LoginPage.ts, RegisterPage.ts, ForgotPasswordPage.ts — match deployed Propify states.
- pages/profile/ProfilePage.ts — compose profile and change-password controls.
- workflows/authentication/AuthenticationWorkflow.ts — preserve the compatibility facade.
- fixtures/auth.fixture.ts, page.fixture.ts, workflow.fixture.ts, test.fixture.ts — compose the new dependencies.
- playwright.config.ts — isolate mutating Chromium execution.
- .env.example, .gitignore, README.md, docs/traceability/requirements-to-tests.md — document safe execution.

### New files

- types/otp.types.ts
- test-data/static/authentication.json
- test-data/factories/AuthenticationDataFactory.ts
- helpers/otp/GmailApiClient.ts
- helpers/otp/GmailOtpProvider.ts
- helpers/otp/OtpMessageParser.ts
- pages/components/AuthenticationModalComponent.ts
- pages/components/ProfileFormComponent.ts
- pages/components/ChangePasswordComponent.ts
- workflows/authentication/LoginWorkflow.ts
- workflows/authentication/RegistrationWorkflow.ts
- workflows/authentication/PasswordRecoveryWorkflow.ts
- workflows/authentication/ProfileWorkflow.ts
- test-cases/authentication/registration.test-cases.ts
- test-cases/authentication/password-recovery.test-cases.ts
- test-cases/authentication/profile.test-cases.ts
- focused unit, component, E2E, and mutating specifications enumerated in Tasks 1 through 10.

---

### Task 1: Authentication configuration, contracts, and deterministic data

**Files:**

- Modify: package.json
- Modify: tsconfig.json
- Modify: config/environment.schema.ts
- Modify: config/environment.config.ts
- Modify: types/environment.types.ts
- Modify: types/user.types.ts
- Modify: test-data/static/users.json
- Modify: constants/tags.ts
- Modify: constants/timeouts.ts
- Create: types/otp.types.ts
- Create: test-data/static/authentication.json
- Create: test-data/factories/AuthenticationDataFactory.ts
- Test: tests/unit/config/environment.config.spec.ts
- Test: tests/unit/test-data/AuthenticationDataFactory.spec.ts

**Interfaces:**

- Produces: OtpPurpose = 'registration' | 'passwordRecovery'.
- Produces: OtpQuery with recipient, purpose, requestedAfter, timeoutMs, and pollIntervalMs.
- Produces: OtpProvider.waitForOtp(query: OtpQuery): Promise<string>.
- Produces: RegistrationData with fullName, email, password, and passwordConfirmation; no phone.
- Produces: PasswordChangeData and PasswordResetData.
- Produces: AuthenticationDataFactory.createRegistration(baseMailbox, overrides?) and validation-data accessors.
- Produces environment fields runOtpE2e, runMutatingE2e, optional gmail configuration, and a dedicated mutating-user baseline.

- [ ] **Step 1: Add failing environment contract tests**

Add these cases to tests/unit/config/environment.config.spec.ts:

```ts
test('keeps Gmail integration disabled when optional values are absent', () => {
  const config = loadEnvironmentConfig(validEnvironment);

  expect(config.runOtpE2e).toBe(false);
  expect(config.runMutatingE2e).toBe(false);
  expect(config.gmail).toBeUndefined();
});

test('requires complete Gmail OAuth configuration when OTP E2E is enabled', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      RUN_OTP_E2E: 'true',
      OTP_MAILBOX_ADDRESS: 'automation@gmail.com',
    }),
  ).toThrow(/GMAIL_CLIENT_ID|GMAIL_CLIENT_SECRET|GMAIL_REFRESH_TOKEN/);
});
```

- [ ] **Step 2: Add failing factory tests**

Create tests/unit/test-data/AuthenticationDataFactory.spec.ts:

```ts
import { expect, test } from '@playwright/test';

import { AuthenticationDataFactory } from '../../../test-data/factories/AuthenticationDataFactory';

test('creates a correlated Gmail alias without mutating the base address', () => {
  const data = AuthenticationDataFactory.createRegistration('automation@gmail.com', {
    uniqueId: 'AUTH001',
  });

  expect(data.email).toBe('automation+auth-auth001@gmail.com');
  expect(data.password).toBe(data.passwordConfirmation);
});

test('rejects a mailbox that cannot use Gmail plus-addressing', () => {
  expect(() =>
    AuthenticationDataFactory.createRegistration('automation@example.test', {
      uniqueId: 'AUTH001',
    }),
  ).toThrow('Gmail mailbox is required for registration aliases');
});
```

- [ ] **Step 3: Run focused tests to verify RED**

Run: npm test -- tests/unit/config/environment.config.spec.ts tests/unit/test-data/AuthenticationDataFactory.spec.ts --project=framework

Expected: FAIL because the Gmail configuration, OTP types, and authentication factory do not exist.

- [ ] **Step 4: Add dependency and strict contracts**

Run: npm install --save-dev googleapis@174.0.0

Create types/otp.types.ts:

```ts
export type OtpPurpose = 'registration' | 'passwordRecovery';

export interface OtpQuery {
  readonly recipient: string;
  readonly purpose: OtpPurpose;
  readonly requestedAfter: Date;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface OtpProvider {
  waitForOtp(query: OtpQuery): Promise<string>;
}
```

Update types/user.types.ts with exact contracts:

```ts
export interface RegistrationData {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
}

export interface ProfileUpdate {
  readonly fullName: string;
}

export interface PasswordChangeData {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly passwordConfirmation: string;
}

export interface PasswordResetData {
  readonly email: string;
  readonly newPassword: string;
  readonly passwordConfirmation: string;
}
```

- [ ] **Step 5: Implement validated optional Gmail configuration**

Extend the Zod schema with explicit defaults and a superRefine rule:

```ts
RUN_OTP_E2E: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
RUN_MUTATING_E2E: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
GMAIL_CLIENT_ID: z.string().trim().min(1).optional(),
GMAIL_CLIENT_SECRET: z.string().trim().min(1).optional(),
GMAIL_REFRESH_TOKEN: z.string().trim().min(1).optional(),
OTP_MAILBOX_ADDRESS: z.string().trim().pipe(z.email()).optional(),
MUTATING_USER_EMAIL: z.string().trim().pipe(z.email()).optional(),
MUTATING_USER_BASELINE_PASSWORD: z.string().min(8).optional(),
MUTATING_USER_BASELINE_NAME: z.string().trim().min(1).optional(),
OTP_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(2_000),
OTP_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(60_000),
```

When RUN_OTP_E2E is true, add one Zod issue for every missing Gmail key. Reject RUN_MUTATING_E2E=true unless RUN_OTP_E2E=true, and require all three MUTATING_USER baseline keys when mutation is enabled. Expose immutable gmail and mutatingUser objects only when their complete key sets are present.

- [ ] **Step 6: Implement deterministic authentication data**

Create test-data/static/authentication.json with safe values:

```json
{
  "validPassword": "Automation1!",
  "belowMinimumPassword": "Abc123!",
  "invalidEmails": ["plain-address", "@missing-local.test", "missing-domain@"],
  "unicodeFullName": "Nguyễn Kiểm Thử",
  "mismatchedPassword": "Different1!"
}
```

Implement AuthenticationDataFactory.createRegistration using a sanitized lowercase uniqueId and RandomDataGenerator only when uniqueId is omitted. Return Object.freeze and never store real mailbox credentials.

- [ ] **Step 7: Add constants and compile boundaries**

Add TAGS.otp = '@otp' and TAGS.mutating = '@mutating'. Add TIMEOUTS.otpPoll = 2_000 and TIMEOUTS.otp = 60_000. Add helpers/**/*.ts to tsconfig.json include. Extend UserAlias and test-data/static/users.json with mutatingUser whose credential keys are MUTATING_USER_EMAIL and MUTATING_USER_BASELINE_PASSWORD.

- [ ] **Step 8: Verify GREEN**

Run: npm test -- tests/unit/config/environment.config.spec.ts tests/unit/test-data/AuthenticationDataFactory.spec.ts --project=framework

Run: npm run typecheck

Expected: all focused tests and strict compilation pass.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json config constants types test-data tests/unit
git commit -m "feat: add authentication contracts and data"
```

---

### Task 2: Gmail OTP provider with deterministic polling

**Files:**

- Create: helpers/otp/GmailApiClient.ts
- Create: helpers/otp/OtpMessageParser.ts
- Create: helpers/otp/GmailOtpProvider.ts
- Test: tests/unit/helpers/otp/OtpMessageParser.spec.ts
- Test: tests/unit/helpers/otp/GmailOtpProvider.spec.ts

**Interfaces:**

- Consumes: OtpProvider, OtpQuery, and OtpPurpose from types/otp.types.ts.
- Produces: GmailMessage with id, internalDate, recipient, subject, and body.
- Produces: GmailMessageClient.search(query): Promise<readonly GmailMessage[]>.
- Produces: OtpMessageParser.extract(message, purpose): string | undefined.
- Produces: GmailOtpProvider.waitForOtp(query): Promise<string>.

- [ ] **Step 1: Write failing OTP parser tests**

```ts
test('extracts one six-digit registration OTP', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-1',
      internalDate: new Date('2026-08-05T00:00:01Z'),
      recipient: 'automation+auth-1@gmail.com',
      subject: 'Xác thực tài khoản Propify',
      body: 'Mã OTP của bạn là 123456.',
    },
    'registration',
  );

  expect(otp).toBe('123456');
});

test('rejects a message containing multiple candidate codes', () => {
  expect(() =>
    OtpMessageParser.extract(
      {
        id: 'message-2',
        internalDate: new Date(),
        recipient: 'automation@gmail.com',
        subject: 'Propify',
        body: 'Codes 123456 and 654321',
      },
      'passwordRecovery',
    ),
  ).toThrow('Ambiguous OTP message');
});
```

- [ ] **Step 2: Write failing provider correlation tests**

Use a fake GmailMessageClient and fake clock:

```ts
test('ignores old and wrong-recipient messages before returning the newest match', async () => {
  const client = new FakeGmailClient([
    message({ id: 'old', recipient: alias, internalDate: beforeRequest, body: '111111' }),
    message({
      id: 'wrong',
      recipient: 'other@gmail.com',
      internalDate: afterRequest,
      body: '222222',
    }),
    message({ id: 'match', recipient: alias, internalDate: afterRequest, body: '333333' }),
  ]);
  const provider = new GmailOtpProvider(client, immediateClock);

  await expect(provider.waitForOtp(query({ recipient: alias }))).resolves.toBe('333333');
});

test('times out with sanitized diagnostics', async () => {
  const provider = new GmailOtpProvider(new FakeGmailClient([]), advancingClock);

  await expect(provider.waitForOtp(query({ timeoutMs: 5_000 }))).rejects.toThrow(
    /OTP not received.*passwordRecovery/,
  );
});
```

- [ ] **Step 3: Run focused tests to verify RED**

Run: npm test -- tests/unit/helpers/otp --project=framework

Expected: FAIL because the Gmail client, parser, and provider do not exist.

- [ ] **Step 4: Implement the Gmail client boundary**

Define:

```ts
export interface GmailMessage {
  readonly id: string;
  readonly internalDate: Date;
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
}

export interface GmailMessageClient {
  search(query: string): Promise<readonly GmailMessage[]>;
}
```

GmailApiClient creates google.auth.OAuth2 from injected configuration, sets the refresh token, calls users.messages.list with userId: 'me', then users.messages.get with format: 'full'. Decode text/plain and text/html payload parts from base64url. Return message metadata only through the boundary and never log raw Gmail responses.

- [ ] **Step 5: Implement parser and bounded polling**

OtpMessageParser requires exactly one standalone six-digit candidate and verifies purpose-specific Propify signals. GmailOtpProvider builds this Gmail query:

```ts
const gmailQuery = [
  'to:' + query.recipient,
  'after:' + Math.floor(query.requestedAfter.getTime() / 1_000),
].join(' ');
```

Filter again in memory by exact recipient and timestamp. Poll through an injected Clock with now(): Date and delay(ms): Promise<void>. On timeout, throw a sanitized error containing purpose, recipient alias, and elapsed milliseconds but no code or body.

- [ ] **Step 6: Verify GREEN and secret-safe failures**

Run: npm test -- tests/unit/helpers/otp --project=framework

Run: npm run lint

Run: npm run typecheck

Expected: OTP parser/provider tests, lint, and compilation pass; failure output contains no message body.

- [ ] **Step 7: Commit**

```bash
git add helpers/otp tests/unit/helpers/otp
git commit -m "feat: add Gmail OTP provider"
```

---

### Task 3: Shared authentication modal and Login Page

**Files:**

- Create: pages/components/AuthenticationModalComponent.ts
- Modify: pages/authentication/LoginPage.ts
- Modify: tests/component/pages/LoginPage.spec.ts
- Test: tests/component/pages/AuthenticationModalComponent.spec.ts

**Interfaces:**

- Produces: AuthenticationModalComponent.switchToRegister(), switchToLogin(), loginWithGoogle(), and close().
- Produces: LoginPage.fillCredentials(), submit(), submitCredentials(), openForgotPassword(), validationMessage(), serverMessage(), and isSubmitEnabled().
- Preserves: LoginPage.open(), openHome(), and isOpen().

- [ ] **Step 1: Extend component markup with deployed login validation**

Add a component test whose local markup contains heading Xin chào,, placeholders Email của bạn and Mật khẩu, button Quên mật khẩu?, and disabled button Tiếp tục. Assert invalid-email feedback and enabled-state exposure only through LoginPage public methods.

```ts
await loginPage.open();
await loginPage.fillCredentials({ email: 'invalid-email', password: 'x' });
await loginPage.blurEmail();

expect(await loginPage.validationMessage()).toBe('Vui lòng nhập email hợp lệ');
expect(await loginPage.isSubmitEnabled()).toBe(false);
```

- [ ] **Step 2: Run component tests to verify RED**

Run: npm test -- tests/component/pages/LoginPage.spec.ts tests/component/pages/AuthenticationModalComponent.spec.ts --project=framework

Expected: FAIL because the component and intent-based LoginPage API do not exist.

- [ ] **Step 3: Implement the shared modal component**

Use only selectors confirmed on deployed Propify:

```ts
this.googleLoginButton = page.getByRole('button', { name: 'Đăng nhập với Google', exact: true });
this.registerSwitchButton = page.getByRole('button', { name: 'Đăng ký ngay', exact: true });
```

Scope duplicated Đăng nhập controls to the visible authentication dialog/container so the header button and modal switch never create strict-mode ambiguity. Keep all locator fields private readonly.

- [ ] **Step 4: Refactor LoginPage in place**

Use heading Xin chào,, exact placeholders, Quên mật khẩu?, and Tiếp tục. Split fill and submit so validation scenarios do not transmit invalid data. Keep submitCredentials as a compatibility convenience that delegates to the two smaller methods.

- [ ] **Step 5: Verify GREEN**

Run: npm test -- tests/component/pages/LoginPage.spec.ts tests/component/pages/AuthenticationModalComponent.spec.ts --project=framework

Run: npm run typecheck

Expected: component tests and compilation pass.

- [ ] **Step 6: Commit**

```bash
git add pages/components/AuthenticationModalComponent.ts pages/authentication/LoginPage.ts tests/component/pages
git commit -m "refactor: align login page with Propify"
```

---

### Task 4: Registration Page and OTP verification states

**Files:**

- Modify: pages/authentication/RegisterPage.ts
- Test: tests/component/pages/RegisterPage.spec.ts

**Interfaces:**

- Consumes: RegistrationData and AuthenticationModalComponent.
- Produces: open(), fillRegistration(), submit(), register(), enterOtp(code), submitOtp(), resendOtp(), validationMessages(), otpError(), and isOtpExpired().

- [ ] **Step 1: Write failing registration form and validation tests**

Use deployed fields only:

```ts
await registerPage.open();
await registerPage.fillRegistration({
  fullName: 'Nguyễn Kiểm Thử',
  email: 'bad',
  password: 'abc',
  passwordConfirmation: 'xyz',
});
await registerPage.blurAllFields();

expect(await registerPage.validationMessages()).toEqual([
  'Vui lòng nhập email hợp lệ',
  'Mật khẩu phải có ít nhất 8 ký tự',
  'Mật khẩu xác nhận không khớp',
]);
```

Add an assertion that the Page Object has no phone operation.

- [ ] **Step 2: Write failing six-cell OTP behavior test**

Local markup must reproduce six inputs with type=text, inputmode=numeric, maxlength=1, heading Xác thực email, button Xác nhận OTP, resend text Gửi lại, and expiry feedback.

```ts
await registerPage.enterOtp('123456');
await registerPage.submitOtp();

expect(await page.evaluate(() => document.body.dataset.verified)).toBe('true');
```

- [ ] **Step 3: Run the tests to verify RED**

Run: npm test -- tests/component/pages/RegisterPage.spec.ts --project=framework

Expected: FAIL because current RegisterPage expects a phone and has no OTP stage API.

- [ ] **Step 4: Implement deployed form locators**

Use heading Tạo tài khoản, placeholders Họ và tên, Email của bạn, Mật khẩu, and Nhập lại mật khẩu, plus exact button Tạo tài khoản. Remove phoneInput. Compose AuthenticationModalComponent for switching back to Login.

- [ ] **Step 5: Implement scoped OTP locators**

Scope the six OTP inputs to the view headed Xác thực email. Confirm count equals six before filling digits in index order. Positional access is allowed only after this count assertion. Expose OTP error/expiry state without assertions.

- [ ] **Step 6: Verify GREEN**

Run: npm test -- tests/component/pages/RegisterPage.spec.ts --project=framework

Run: npm run lint

Expected: registration component tests and locator ownership lint pass.

- [ ] **Step 7: Commit**

```bash
git add pages/authentication/RegisterPage.ts tests/component/pages/RegisterPage.spec.ts
git commit -m "feat: implement registration page states"
```

---

### Task 5: Forgot Password multi-stage Page Object

**Files:**

- Modify: pages/authentication/ForgotPasswordPage.ts
- Test: tests/component/pages/ForgotPasswordPage.spec.ts

**Interfaces:**

- Produces: requestReset(email), enterOtp(code), submitOtp(), resendOtp(), fillNewPassword(data), submitNewPassword(), backToLogin(), currentStage(), and visibleMessage().

- [ ] **Step 1: Write failing email-request test**

Use exact deployed strings:

```ts
expect(await forgotPasswordPage.currentStage()).toBe('email');
await forgotPasswordPage.requestReset('automation@gmail.com');
expect(await page.evaluate(() => document.body.dataset.requested)).toBe('true');
```

The local view uses heading Quên mật khẩu?, paragraph Nhập email để nhận mã OTP đặt lại mật khẩu, button Gửi mã OTP, and button ← Quay lại đăng nhập.

- [ ] **Step 2: Write failing OTP and new-password stage tests**

Model the deployed six OTP cells, Xác nhận OTP, Gửi lại, Mật khẩu mới, Nhập lại mật khẩu, exact submit label Đặt mật khẩu mới, and success heading Thành công!. Assert behavior only through public Page Object methods.

- [ ] **Step 3: Run tests to verify RED**

Run: npm test -- tests/component/pages/ForgotPasswordPage.spec.ts --project=framework

Expected: FAIL because the current Page Object expects Gửi liên kết and implements only one stage.

- [ ] **Step 4: Implement a discriminated stage API**

Define PasswordRecoveryStage = 'email' | 'otp' | 'newPassword' | 'login'. currentStage checks mutually exclusive headings/controls. requestReset only handles the email stage; OTP and password operations remain separate.

- [ ] **Step 5: Verify GREEN**

Run: npm test -- tests/component/pages/ForgotPasswordPage.spec.ts --project=framework

Run: npm run typecheck

Expected: all Forgot Password stages and strict typing pass.

- [ ] **Step 6: Commit**

```bash
git add pages/authentication/ForgotPasswordPage.ts tests/component/pages/ForgotPasswordPage.spec.ts
git commit -m "feat: implement password recovery page states"
```

---

### Task 6: Profile view, edit, and change-password components

**Files:**

- Create: pages/components/ProfileFormComponent.ts
- Create: pages/components/ChangePasswordComponent.ts
- Modify: pages/profile/ProfilePage.ts
- Test: tests/component/pages/ProfilePage.spec.ts

**Interfaces:**

- Produces: ProfileFormComponent.read(), startEditing(), updateFullName(), save(), cancel(), isEmailDisabled(), isPhoneDisabled(), and isSaveEnabled().
- Produces: ChangePasswordComponent.open(), fill(data), submit(), cancel(), validationMessages(), and isSubmitEnabled().
- Produces: ProfilePage.open(), profile(), changePassword(), and existing compatibility methods where safe.

- [ ] **Step 1: Write failing read-only profile contract test**

```ts
await profilePage.openAccountInformation();
const profile = await profilePage.profile().read();

expect(profile).toEqual({
  fullName: 'Nguyễn Kiểm Thử',
  email: 'automation@gmail.com',
  phone: '0970000000',
});
expect(await profilePage.profile().isEmailDisabled()).toBe(true);
expect(await profilePage.profile().isPhoneDisabled()).toBe(true);
```

- [ ] **Step 2: Write failing edit/no-change tests**

Assert Chỉnh sửa enables only Họ và tên, Hủy restores the original value, and Lưu thay đổi remains disabled until the full name changes.

- [ ] **Step 3: Write failing change-password validation test**

Use placeholders Nhập mật khẩu hiện tại, Nhập mật khẩu mới, Nhập lại mật khẩu mới and exact button Cập nhật mật khẩu. Validate the documented minimum/complexity and confirmation state without submitting a real password.

- [ ] **Step 4: Run tests to verify RED**

Run: npm test -- tests/component/pages/ProfilePage.spec.ts --project=framework

Expected: FAIL because the current ProfilePage assumes editable phone and has no change-password component.

- [ ] **Step 5: Implement focused components and compose ProfilePage**

ProfilePage remains the BasePage subclass and owns route navigation. Components own their locators and return typed observable data. Remove phone mutation from updateProfile; preserve a deprecated compatibility method only if no caller relies on the incorrect signature.

- [ ] **Step 6: Verify GREEN**

Run: npm test -- tests/component/pages/ProfilePage.spec.ts --project=framework

Run: npm run lint

Run: npm run typecheck

Expected: component, architecture, and type checks pass.

- [ ] **Step 7: Commit**

```bash
git add pages/components/ProfileFormComponent.ts pages/components/ChangePasswordComponent.ts pages/profile/ProfilePage.ts tests/component/pages/ProfilePage.spec.ts
git commit -m "feat: implement profile authentication controls"
```

---

### Task 7: Focused authentication workflows

**Files:**

- Create: workflows/authentication/LoginWorkflow.ts
- Create: workflows/authentication/RegistrationWorkflow.ts
- Create: workflows/authentication/PasswordRecoveryWorkflow.ts
- Create: workflows/authentication/ProfileWorkflow.ts
- Modify: workflows/authentication/AuthenticationWorkflow.ts
- Test: tests/unit/workflows/authentication/LoginWorkflow.spec.ts
- Test: tests/unit/workflows/authentication/RegistrationWorkflow.spec.ts
- Test: tests/unit/workflows/authentication/PasswordRecoveryWorkflow.spec.ts
- Test: tests/unit/workflows/authentication/ProfileWorkflow.spec.ts

**Interfaces:**

- Produces: LoginWorkflow.login(credentials): Promise<void>, logout(): Promise<void>, and isAuthenticated(): Promise<boolean>.
- Produces: RegistrationWorkflow.registerAndVerify(data): Promise<void>.
- Produces: PasswordRecoveryWorkflow.resetPassword(data): Promise<void>.
- Produces: ProfileWorkflow.updateFullName(fullName): Promise<void> and changePassword(data): Promise<void>.
- Preserves: AuthenticationWorkflow.login(), logout(), and isAuthenticated().

- [ ] **Step 1: Write failing LoginWorkflow orchestration test**

Use structural fakes and assert the exact call order: open home → open modal → submit credentials → wait authenticated. Do not use Playwright locators in workflow tests.

- [ ] **Step 2: Write failing RegistrationWorkflow OTP correlation test**

```ts
await workflow.registerAndVerify(registration);

expect(otpProvider.lastQuery).toMatchObject({
  recipient: registration.email,
  purpose: 'registration',
});
expect(registerPage.enteredOtp).toBe('123456');
```

Verify requestedAfter is captured immediately before submitting registration and that resend is not called on the success path.

- [ ] **Step 3: Write failing PasswordRecoveryWorkflow test**

Assert request reset → Gmail query with purpose passwordRecovery → enter OTP → verify OTP → set new password → return to Login.

- [ ] **Step 4: Write failing ProfileWorkflow tests**

Assert no-change updates do not click Save, full-name changes save once, and password-change data is delegated without environment reads.

- [ ] **Step 5: Run workflow tests to verify RED**

Run: npm test -- tests/unit/workflows/authentication --project=framework

Expected: FAIL because focused workflows do not exist.

- [ ] **Step 6: Implement minimal workflows with injected dependencies**

Each workflow constructor receives only the Page Objects/components/provider/clock it consumes. Do not catch errors unless adding sanitized context with Error cause. AuthenticationWorkflow delegates existing login/logout calls to LoginWorkflow and HeaderComponent.

- [ ] **Step 7: Verify GREEN**

Run: npm test -- tests/unit/workflows/authentication --project=framework

Run: npm run lint

Expected: workflow tests and locator-boundary lint pass.

- [ ] **Step 8: Commit**

```bash
git add workflows/authentication tests/unit/workflows/authentication
git commit -m "refactor: split authentication workflows"
```

---

### Task 8: Authentication fixture composition

**Files:**

- Modify: fixtures/auth.fixture.ts
- Modify: fixtures/page.fixture.ts
- Modify: fixtures/workflow.fixture.ts
- Modify: fixtures/test.fixture.ts
- Modify: tests/component/fixtures/test.fixture.spec.ts

**Interfaces:**

- Produces fixture otpProvider: OtpProvider.
- Produces loginWorkflow, registrationWorkflow, passwordRecoveryWorkflow, and profileWorkflow.
- Produces lazily requested authenticationData and mutatingUser fixtures for opt-in scenarios.
- Preserves defaultUser, contextForUser, authenticationWorkflow, test, BaseTest, and expect.
- Produces executionPolicy with runOtpE2e and runMutatingE2e.

- [ ] **Step 1: Extend the failing fixture composition test**

```ts
test('composes focused authentication dependencies', ({
  loginPage,
  registerPage,
  forgotPasswordPage,
  profilePage,
  loginWorkflow,
  registrationWorkflow,
  passwordRecoveryWorkflow,
  profileWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(registerPage).toBeInstanceOf(RegisterPage);
  expect(forgotPasswordPage).toBeInstanceOf(ForgotPasswordPage);
  expect(profilePage).toBeInstanceOf(ProfilePage);
  expect(loginWorkflow).toBeInstanceOf(LoginWorkflow);
  expect(registrationWorkflow).toBeInstanceOf(RegistrationWorkflow);
  expect(passwordRecoveryWorkflow).toBeInstanceOf(PasswordRecoveryWorkflow);
  expect(profileWorkflow).toBeInstanceOf(ProfileWorkflow);
});
```

- [ ] **Step 2: Run the fixture test to verify RED**

Run: npm test -- tests/component/fixtures/test.fixture.spec.ts --project=framework

Expected: FAIL because focused workflow fixtures do not exist.

- [ ] **Step 3: Implement lazy Gmail fixture creation**

When runOtpE2e is false, otpProvider must be a DisabledOtpProvider that throws a sanitized configuration message only if called. When enabled, construct GmailApiClient and GmailOtpProvider from validated configuration. This prevents non-OTP tests from initializing Gmail. authenticationData builds a registration alias from OTP_MAILBOX_ADDRESS only when requested. mutatingUser resolves the dedicated alias from environment-backed users.json only when requested.

- [ ] **Step 4: Compose Page Objects and workflows**

Register all focused workflows with constructor injection. Keep AuthenticationWorkflow as the existing fixture name for backward compatibility. Ensure every BrowserContext created by contextForUser closes in teardown.

- [ ] **Step 5: Verify GREEN**

Run: npm test -- tests/component/fixtures/test.fixture.spec.ts --project=framework

Run: npm run typecheck

Expected: fixture composition and strict compilation pass without Gmail secrets.

- [ ] **Step 6: Commit**

```bash
git add fixtures tests/component/fixtures/test.fixture.spec.ts
git commit -m "feat: compose authentication fixtures"
```

---

### Task 9: Typed test cases and non-mutating E2E scenarios

**Files:**

- Modify: test-cases/authentication/login.test-cases.ts
- Create: test-cases/authentication/registration.test-cases.ts
- Create: test-cases/authentication/password-recovery.test-cases.ts
- Create: test-cases/authentication/profile.test-cases.ts
- Replace: tests/authentication/login.spec.ts with categorized specifications
- Create: tests/authentication/login.positive.spec.ts
- Create: tests/authentication/login.negative.spec.ts
- Create: tests/authentication/login.boundary.spec.ts
- Create: tests/authentication/registration.validation.spec.ts
- Create: tests/authentication/password-recovery.validation.spec.ts
- Create: tests/profile/profile.positive.spec.ts
- Create: tests/profile/profile.validation.spec.ts
- Create: tests/profile/change-password.validation.spec.ts

**Interfaces:**

- Consumes fixture-composed workflows, Page Objects, typed cases, and data factory.
- Produces AUTH-LOGIN, AUTH-REGISTER, AUTH-RECOVERY, AUTH-PROFILE, and AUTH-PASSWORD case IDs.

- [ ] **Step 1: Create immutable typed case catalogs**

Define explicit cases for valid login, invalid credentials, invalid email, empty fields, password length seven/eight, registration mismatch, profile disabled fields, no-change save, and change-password confirmation. Every case includes ID, title, module, priority, tags, preconditions, and expectedResult.

- [ ] **Step 2: Write scenario-only login specifications**

Example:

```ts
test(validLoginCase.title, { tag: validLoginCase.tags }, async ({ loginWorkflow, defaultUser }) => {
  await loginWorkflow.login(defaultUser);

  await expect.poll(() => loginWorkflow.isAuthenticated()).toBe(true);
});
```

Negative tests call LoginPage/Workflow public APIs and assert public observable messages. They contain no getByRole, locator, getByText, getByPlaceholder, or reusable login sequence.

- [ ] **Step 3: Write client-side registration and recovery validation scenarios**

Start with empty storage state. Open the correct view through a workflow/Page public API, apply typed data, and assert validation messages or disabled buttons. Do not submit registration or reset requests in validation tests.

- [ ] **Step 4: Write read-only profile scenarios**

Use authenticated storage state to assert profile visibility and disabled email/phone behavior. Change-password validation opens the form and checks client validation without clicking Cập nhật mật khẩu.

- [ ] **Step 5: Verify discovery and safe Chromium execution**

Run: npx playwright test --list

Run: npx playwright test tests/authentication tests/profile --project=chromium --grep-invert @mutating

Expected: all non-mutating Authentication/Profile scenarios are discovered and pass without Gmail configuration or production data changes.

- [ ] **Step 6: Verify cross-browser safe coverage**

Run: npx playwright test tests/authentication tests/profile --project=firefox --grep-invert @mutating

Run: npx playwright test tests/authentication tests/profile --project=webkit --grep-invert @mutating

Expected: non-mutating scenarios pass in Firefox and WebKit.

- [ ] **Step 7: Commit**

```bash
git add test-cases/authentication tests/authentication tests/profile
git commit -m "test: add authentication scenario coverage"
```

---

### Task 10: Opt-in mutating Gmail OTP scenarios and execution isolation

**Files:**

- Modify: playwright.config.ts
- Modify: package.json
- Create: tests/authentication/registration.otp.mutating.spec.ts
- Create: tests/authentication/password-recovery.otp.mutating.spec.ts
- Create: tests/profile/profile.mutating.spec.ts
- Create: tests/profile/change-password.mutating.spec.ts

**Interfaces:**

- Consumes executionPolicy, RegistrationWorkflow, PasswordRecoveryWorkflow, ProfileWorkflow, and AuthenticationDataFactory.
- Produces Playwright project mutating-chromium.
- Produces scripts test:auth and test:auth:mutating.

- [ ] **Step 1: Add mutating project discovery test**

Update configuration expectations so default chromium/firefox/webkit ignore *.mutating.spec.ts. Add mutating-chromium matching only those files, using Desktop Chrome, fullyParallel false, and the auth-setup dependency. Every mutating specification uses test.describe.configure({ mode: 'serial' }); the execution script also passes --workers=1 because workers are configured at the Playwright-run level rather than per project.

- [ ] **Step 2: Write opt-in registration OTP scenario**

```ts
test.beforeEach(({ executionPolicy }) => {
  test.skip(
    !executionPolicy.runOtpE2e || !executionPolicy.runMutatingE2e,
    'Requires Gmail OTP and mutating E2E flags',
  );
});

test(
  registrationOtpCase.title,
  { tag: registrationOtpCase.tags },
  async ({ registrationWorkflow, authenticationWorkflow, authenticationData }) => {
    await registrationWorkflow.registerAndVerify(authenticationData.registration);
    expect(await authenticationWorkflow.isAuthenticated()).toBe(true);
  },
);
```

- [ ] **Step 3: Write recoverable password scenarios**

Before change-password verification, PasswordRecoveryWorkflow restores the configured baseline password for the dedicated automation account. Run password recovery and password change serially. Never use the personal default user for mutation.

- [ ] **Step 4: Write recoverable profile mutation scenario**

Set the dedicated account to its configured baseline display name at setup, update to the test name, assert the new observable value, and restore the baseline through ProfileWorkflow. If assertion fails, the next setup still restores baseline.

- [ ] **Step 5: Add scripts and list tests without secrets**

Add:

```json
"test:auth": "playwright test tests/authentication tests/profile --grep-invert @mutating",
"test:auth:mutating": "playwright test --project=mutating-chromium --grep @mutating --workers=1"
```

Run: npx playwright test --list

Expected: mutating tests are listed only under mutating-chromium and are skipped by policy when flags are absent.

- [ ] **Step 6: Execute opt-in OTP tests only when secrets are configured**

Run: npm run test:auth:mutating

Expected with flags/secrets absent: all mutating tests intentionally skipped with a clear reason.

Expected with flags/secrets present: Gmail OTP scenarios pass serially; reports contain no OTP or OAuth secret.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts package.json tests/authentication tests/profile
git commit -m "test: add opt-in Gmail authentication flows"
```

---

### Task 11: Documentation, environment example, and traceability

**Files:**

- Modify: .env.example
- Modify: .gitignore
- Modify: README.md
- Modify: docs/traceability/requirements-to-tests.md

**Interfaces:**

- Documents exact OAuth variables, run flags, safe default behavior, test commands, case IDs, and extension points.

- [ ] **Step 1: Document safe environment sample values**

Add non-secret sample values only:

```dotenv
RUN_OTP_E2E=false
RUN_MUTATING_E2E=false
GMAIL_CLIENT_ID=replace-with-google-oauth-client-id
GMAIL_CLIENT_SECRET=replace-with-local-secret
GMAIL_REFRESH_TOKEN=replace-with-local-refresh-token
OTP_MAILBOX_ADDRESS=automation-mailbox@gmail.com
MUTATING_USER_EMAIL=automation-mailbox+propify-mutating@gmail.com
MUTATING_USER_BASELINE_PASSWORD=replace-with-local-baseline-secret
MUTATING_USER_BASELINE_NAME=Propify Automation User
OTP_POLL_INTERVAL_MS=2000
OTP_TIMEOUT_MS=60000
```

- [ ] **Step 2: Document execution policy and Gmail setup**

README must explain that validation/read-only suites run by default, mutating flows require both flags, Gmail uses OAuth2, plus-address compatibility is checked, and password/profile mutation uses a dedicated recoverable account.

- [ ] **Step 3: Expand traceability**

Map UC-01 through UC-07 and all Authentication case ID families to Page Objects, workflows, component/unit evidence, non-mutating E2E, and opt-in OTP E2E. Explicitly mark Google OAuth as surface-only and account-selection automation as out of scope.

- [ ] **Step 4: Check credential exclusions and formatting**

Run: git status --short --ignored

Run: npm run format:check

Expected: .env, .auth, reports, and results are ignored; documentation passes formatting; no real credential appears in tracked changes.

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore README.md docs/traceability/requirements-to-tests.md
git commit -m "docs: add authentication execution guide"
```

---

### Task 12: Full verification and architecture audit

**Files:**

- Modify only files required to correct failures discovered by the commands below.

**Interfaces:**

- Produces a clean, passing Authentication delivery with evidence proportional to risk.

- [ ] **Step 1: Run static verification**

Run: npm run typecheck

Run: npm run lint

Run: npm run format:check

Expected: every command exits 0.

- [ ] **Step 2: Run framework verification**

Run: npm test -- tests/unit tests/component --project=framework

Expected: all unit and component tests pass.

- [ ] **Step 3: Audit locator and secret boundaries**

Run: rg -n "getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|\.locator\(" tests workflows fixtures helpers

Expected: no raw UI locator in tests, workflows, fixtures, or helpers.

Run: git grep -n -E "GMAIL_REFRESH_TOKEN=.+|GMAIL_CLIENT_SECRET=.+|DEFAULT_USER_PASSWORD=.+" -- ':!*.example'

Expected: no committed secret value.

- [ ] **Step 4: Run Playwright discovery**

Run: npx playwright test --list

Expected: framework, auth-setup, chromium, firefox, webkit, and mutating-chromium discover the intended non-overlapping specifications.

- [ ] **Step 5: Run safe multi-browser Authentication suites**

Run: npm run test:auth

Expected: safe Authentication/Profile scenarios pass in configured default projects without mutation.

- [ ] **Step 6: Verify mutating policy without secrets**

Run with RUN_OTP_E2E=false and RUN_MUTATING_E2E=false: npm run test:auth:mutating

Expected: Gmail/mutating scenarios are reported as intentionally skipped, not passed.

- [ ] **Step 7: Run opt-in Gmail verification when configuration is available**

Run with the dedicated mailbox and automation account secrets configured: npm run test:auth:mutating

Expected: registration OTP, password recovery OTP, profile mutation, and change-password recovery execute serially and pass. If configuration is unavailable, record this as pending external verification without weakening Tasks 1–6.

- [ ] **Step 8: Inspect reports and Git state**

Run: git diff --check

Run: git status --short

Inspect generated HTML/Allure results for OTP, OAuth token, password, and email-body leakage.

Expected: no whitespace errors, no unintended files, no secret leakage, and only expected implementation changes.

- [ ] **Step 9: Commit final verification fixes**

```bash
git add .
git commit -m "chore: verify authentication module"
```

Skip this commit when Step 8 shows no uncommitted fixes.
