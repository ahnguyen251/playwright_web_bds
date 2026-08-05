# Authentication Module Design

## 1. Purpose

Extend the existing Propify Playwright framework with production-quality automation for user authentication and profile behavior. The implementation covers login, registration, email OTP verification, password recovery, profile viewing and editing, password changes, authentication state, and positive, negative, boundary, and validation scenarios.

The module must follow the deployed Propify UI and the documented UC-01 through UC-07 behavior. It must not recreate the framework or introduce Admin functionality.

## 2. Current-state findings

The existing architecture already separates tests, fixtures, workflows, Page Objects, types, test data, and utilities. The following focused corrections are required:

- `RegisterPage` currently models a phone field that is absent from the deployed registration form.
- `ForgotPasswordPage` expects a reset link, while the deployed application sends an OTP.
- `ProfilePage` assumes the phone field is editable, but the deployed application disables both email and verified phone fields.
- Authentication behavior is concentrated in one workflow and will grow beyond a single responsibility.
- Login is the only executable authentication scenario; registration, password recovery, profile, password change, negative, boundary, and validation coverage are missing.
- OTP acquisition has no abstraction or automated mailbox integration.

Refactoring remains limited to Authentication and Profile dependencies. Unrelated modules retain their current contracts.

## 3. Selected approach

Use the existing pragmatic Clean Page Object Model with feature-specific workflows and an injected OTP provider. Gmail API is the first OTP adapter because the dedicated mailbox supports automated reading. The workflows depend only on the `OtpProvider` contract, so Gmail can later be replaced by IMAP, a test-mail service, or an internal API without modifying tests or Page Objects.

Dependency direction:

```text
Tests
  -> Authentication fixtures
  -> Feature workflows
  -> Page Objects and components
  -> Playwright

Feature workflows
  -> OtpProvider contract
  <- GmailOtpProvider adapter
```

Page Objects do not depend on tests, fixtures, workflows, test data, environment variables, or Gmail. Workflows contain no locators or assertions. Gmail integration contains no UI behavior.

## 4. Targeted folder changes

```text
pages/
  authentication/
    LoginPage.ts
    RegisterPage.ts
    ForgotPasswordPage.ts
  profile/
    ProfilePage.ts
  components/
    AuthenticationModalComponent.ts
    ProfileFormComponent.ts
    ChangePasswordComponent.ts

workflows/authentication/
  AuthenticationWorkflow.ts
  LoginWorkflow.ts
  RegistrationWorkflow.ts
  PasswordRecoveryWorkflow.ts
  ProfileWorkflow.ts

fixtures/
  auth.fixture.ts
  page.fixture.ts
  workflow.fixture.ts
  test.fixture.ts

helpers/otp/
  GmailOtpProvider.ts

types/
  user.types.ts
  otp.types.ts

test-data/
  static/authentication.json
  factories/AuthenticationDataFactory.ts

test-cases/authentication/
  login.test-cases.ts
  registration.test-cases.ts
  password-recovery.test-cases.ts
  profile.test-cases.ts

tests/authentication/
  login.positive.spec.ts
  login.negative.spec.ts
  registration.validation.spec.ts
  registration.otp.spec.ts
  password-recovery.validation.spec.ts
  password-recovery.otp.spec.ts

tests/profile/
  profile.positive.spec.ts
  profile.validation.spec.ts
  change-password.validation.spec.ts
```

Existing files are modified in place. The new components, workflows, OTP adapter, data, and scenarios are added only where a distinct responsibility requires them.

## 5. Page Object design

### 5.1 AuthenticationModalComponent

Owns controls shared by login and registration views: modal readiness, close control, Google authentication control, and switching between Login and Register. It does not submit feature forms or make assertions.

### 5.2 LoginPage

Models the deployed login view with email, password, password-visibility control, Forgot Password, Continue, and observable validation or server-feedback messages. Public methods express intent such as opening the modal, filling credentials, submitting, switching view, and reading visible feedback.

### 5.3 RegisterPage

Models full name, email, password, password confirmation, Create Account, Google Login, and the subsequent OTP verification state. It removes the incorrect phone locator. It exposes separate form-fill, submit, OTP entry, resend, and observable-feedback operations so workflows can test wrong or expired OTP states without duplicating UI logic.

### 5.4 ForgotPasswordPage

Models all recovery stages: email request, OTP verification, and new-password confirmation. It uses the deployed labels such as `Gửi mã OTP` and the actual `Quên mật khẩu?` heading. Stage-specific methods avoid a single stateful method that assumes every request succeeds.

### 5.5 ProfilePage and components

`ProfilePage` owns profile navigation and composes:

- `ProfileFormComponent` for view/edit/cancel/save behavior, avatar controls, enabled full name, and disabled email/verified phone state.
- `ChangePasswordComponent` for current password, new password, confirmation, validation feedback, cancel, and submit controls.

Components contain locators and UI operations only. Profile data updates and password-change journeys remain in `ProfileWorkflow`.

## 6. Workflow design

- `LoginWorkflow`: open an unauthenticated home page, submit credentials, and wait for an authenticated or rejected outcome.
- `RegistrationWorkflow`: create a unique Gmail alias, submit registration, request the matching OTP, verify the account, and expose alternate OTP paths.
- `PasswordRecoveryWorkflow`: request a reset OTP, retrieve it, set a new password, and return to the login state.
- `ProfileWorkflow`: view profile data, update allowed fields, cancel edits, and exercise password-change behavior.
- `AuthenticationWorkflow`: remains as a compatibility facade for the existing `login`, `logout`, and `isAuthenticated` contract. It delegates to focused workflows rather than accumulating all new behavior.

Workflows return typed observable results or leave the UI in a state that Page Objects can expose. Assertions remain in test scenarios.

## 7. OTP contract and Gmail adapter

The `OtpProvider` contract accepts an immutable query containing:

- recipient address or Gmail alias;
- purpose: registration or password recovery;
- request start timestamp;
- timeout and polling interval.

`GmailOtpProvider` uses OAuth2 and the Gmail API to poll messages received after the request timestamp. It narrows candidates by recipient alias and purpose-specific subject/body signals, selects the newest unique match, extracts the configured OTP shape, and returns only the code.

The adapter must:

- never log message bodies, access tokens, refresh tokens, or OTP values;
- ignore messages older than the request timestamp;
- reject zero or ambiguous matches with sanitized diagnostics;
- stop polling at a bounded timeout;
- leave mailbox messages intact by default;
- support dependency injection of a clock and Gmail client for deterministic unit tests.

Gmail OAuth client ID, client secret, refresh token, mailbox address, polling interval, and timeout are loaded from validated environment variables. Secrets remain in `.env` or CI secret storage and never enter JSON test data, traces, or reports.

The environment contract uses explicit keys: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `OTP_MAILBOX_ADDRESS`, `OTP_POLL_INTERVAL_MS`, and `OTP_TIMEOUT_MS`. `RUN_OTP_E2E=true` enables mailbox-dependent scenarios, while `RUN_MUTATING_E2E=true` is additionally required for account creation, profile updates, password recovery, or password changes against the selected environment.

## 8. Test data and aliases

Committed authentication data contains only safe validation samples, boundary strings, error expectations, and environment-key references. Real credentials and Gmail tokens remain outside Git.

`AuthenticationDataFactory` creates immutable, independent data for parallel tests. Registration uses Gmail plus-addressing, for example a sanitized unique suffix under the configured mailbox. Each alias is correlated with its OTP request.

A one-time alias-compatibility scenario confirms that Propify treats Gmail plus-addresses as distinct accounts. If the application normalizes aliases to the base Gmail address, registration switches to one dedicated deterministic automation identity and does not attempt parallel account creation.

The initial implementation validates actual application behavior rather than inventing undocumented maximum lengths. Where the UI or business documentation provides only a minimum password length, boundary coverage targets the exact minimum and one value below it. Additional server-enforced limits are added only after observable evidence.

## 9. Authentication fixtures

Fixtures provide:

- default and named user credentials from environment variables;
- unauthenticated storage state for authentication scenarios;
- authenticated storage state for profile scenarios;
- Page Objects and focused workflows;
- a lazily created Gmail OTP provider only for OTP-tagged tests;
- named browser contexts with deterministic cleanup.

Non-OTP login and validation tests do not initialize Gmail. Existing storage-state paths and the `test`/`expect` composition root remain compatible.

## 10. Scenario coverage

### Positive

- valid email/password login and logout;
- registration form acceptance and OTP verification with a unique alias;
- password recovery through a mailbox OTP;
- authenticated profile view;
- allowed full-name update and cancel behavior.

### Negative

- invalid credentials;
- unknown recovery email;
- duplicate registration email;
- incorrect and expired OTP where the application exposes the state;
- wrong current password;
- mismatched password confirmation.

### Boundary

- password length immediately below and at the documented minimum of eight characters;
- empty required fields;
- Unicode full names and surrounding whitespace;
- OTP length and empty OTP behavior;
- Gmail polling timeout.

### Validation

- invalid email formats;
- disabled submit state for incomplete or invalid forms;
- registration password mismatch;
- new-password complexity feedback shown by the deployed profile UI;
- profile email and verified phone fields remain disabled;
- save remains disabled when profile data has not changed.

Tests use typed test-case metadata and centralized tags. OTP tests receive a dedicated tag and may be excluded from routine smoke execution.

## 11. Parallelism and production safety

Read-only login, negative, boundary, validation, and profile-view scenarios remain fully parallel across supported browsers.

State-changing OTP and profile scenarios run in a dedicated serial group or a single browser project because they share a production mailbox or account state. Registration aliases prevent OTP cross-talk, but repeated production registration still creates persistent accounts. Therefore full registration is opt-in through an environment flag and is intended for staging by default.

Password recovery and password change never run concurrently for the same account. A dedicated recoverable automation account is used. The setup path restores a known password through the mailbox when needed; tests do not rely solely on teardown because teardown may not execute after infrastructure failures.

Profile mutation also uses the dedicated automation account. Setup records or restores the configured baseline display name before exercising an update. The suite does not modify the personal default user's profile.

No test deletes production data or modifies Admin state.

## 12. Error handling and diagnostics

- Page Objects wait on visible UI states rather than fixed sleeps.
- Workflows preserve original errors and add only sanitized feature context.
- Gmail timeouts report purpose, alias, start time, and elapsed time without exposing message content or OTP.
- UI validation and server rejection are modeled separately.
- Screenshots, video, trace, HTML, and Allure artifacts follow existing configuration, with secrets excluded from attachments and custom messages.
- OAuth or mailbox unavailability skips only explicitly mailbox-dependent scenarios when configuration is intentionally absent; invalid configured credentials fail clearly.

## 13. Verification strategy

Implementation follows test-driven development:

1. component tests for every Page Object state and locator contract using representative local markup;
2. unit tests for factories, OTP parsing, message correlation, polling timeout, and sanitized errors;
3. fixture composition tests for the new dependencies;
4. non-destructive E2E validation against Propify;
5. opt-in Gmail OTP E2E scenarios when all required secrets and execution flags are present;
6. strict type checking, ESLint architectural boundaries, Prettier, Playwright discovery, and multi-browser verification.

The suite must not claim OTP coverage passed when Gmail configuration is absent. Reports distinguish executed, intentionally skipped, and failed OTP scenarios.

## 14. Acceptance criteria

1. Existing files are evolved rather than recreated, and unrelated feature contracts continue compiling.
2. All locators remain inside Page Objects or components.
3. Tests contain scenarios and assertions only.
4. Focused workflows obey single-responsibility boundaries and contain no locators.
5. Registration, Forgot Password, and Profile match the deployed Propify UI.
6. Gmail OTP retrieval is automated through an injected provider with no secret leakage.
7. Positive, negative, boundary, and validation test cases are typed and traceable.
8. Destructive and state-changing production scenarios are opt-in and serialized.
9. Static checks, unit/component tests, discovery, and safe E2E scenarios pass.
10. README and traceability documentation explain Gmail setup, test selection, and extension points.

## 15. Non-goals

- Admin authentication or account management.
- CAPTCHA bypass or Google OAuth account selection automation.
- Deleting production users created by registration tests without a supported cleanup API.
- Implementing Chat, Payment, Notification, Listings, Appointments, Transactions, API, Visual, or AI testing beyond keeping their current contracts compatible.
- CI provider configuration; the module only exposes CI-ready scripts, tags, flags, and secret contracts.
