# Registration and Gmail OTP Design

> **Superseded on 2026-08-12.** This document assumed that the configured Gmail
> account received OTP messages. The approved business contract instead reads the
> application sender account's Sent mailbox. See
> `2026-08-12-registration-sent-gmail-otp-design.md`. This file is retained only as
> design history.

## 1. Purpose

Add production-safe automation for the successful Propify registration journey while preserving the existing architecture:

```text
Page Object -> Workflow/Helper -> Fixture -> Test
```

The journey has two mandatory checkpoints:

1. submitting valid registration data opens the OTP entry state;
2. retrieving the matching OTP from a dedicated Gmail mailbox and submitting it produces an authenticated UI state for the newly registered email.

This design refines only the registration portion of `2026-08-05-authentication-module-design.md`. It does not add Profile, Listings, Appointments, Transactions, password recovery, OTP resend, account deletion, or unrelated test coverage.

## 2. Current-state constraints

- `RegisterPage` currently models a phone field that is absent from the deployed registration form.
- The deployed registration journey continues to an email OTP stage.
- The OTP mailbox receives messages for multiple registration identities. Each matching message contains both the registered email and its OTP.
- The in-app browser session available during design review was already authenticated. It was inspected read-only; no logout or registration submission was performed.
- No executable registration spec currently proves the OTP journey.
- Existing project names, tags, Test Case IDs, and requirement traceability must remain unchanged. No Test Case ID will be fabricated for the new scenario.
- Full production registration creates persistent data. It must remain opt-in, serial, and disabled by default.

## 3. Considered approaches

### 3.1 Selected: Gmail API with OAuth

Use the Gmail REST API with the `gmail.readonly` scope. A provider polls the dedicated mailbox, correlates messages using the registered email and request time, and extracts the OTP through an explicitly configured contract.

This approach is selected because it is independent of Gmail UI changes, supports unattended CI execution, and does not require browser cookies or a Gmail login state in Playwright.

### 3.2 Rejected: automate the Gmail web UI

Driving Gmail through Playwright would couple the test to Gmail's UI, login state, 2FA, and browser storage. It would be slower, more fragile, and more likely to expose sensitive state.

### 3.3 Rejected: manual or static OTP input

A manually supplied or static OTP cannot validate a fully automated production registration flow and is unsuitable for repeatable CI execution.

## 4. Architecture

### 4.1 `RegisterPage`

`RegisterPage` owns only registration and OTP UI locators and actions. It will:

- model full name, email, password, password confirmation, and registration submit controls;
- remove the incorrect phone-field contract;
- expose the observable OTP state as locators for web-first assertions;
- enter and submit an OTP without retrieving it;
- expose stable authenticated or error states only when their user-facing contract can be verified.

It will not read environment variables, call Gmail, generate test data, poll, sleep, or assert business outcomes.

Locators must prefer `getByRole()`, `getByLabel()`, `getByPlaceholder()`, and stable unique `getByText()`. `getByTestId()` is allowed only for a test ID verified in the application. The implementation must not invent test IDs, use `nth()`, dynamic classes, long CSS chains, DOM-position selectors, or absolute XPath. An unverified or ambiguous OTP/error/success locator is recorded as a risk instead of being hidden behind a positional selector.

### 4.2 `OtpProvider`

The workflow depends on a small provider contract rather than Gmail directly:

```ts
interface OtpProvider {
  getOtp(query: OtpQuery): Promise<string>;
}

interface OtpQuery {
  readonly email: string;
  readonly requestedAfter: Date;
}
```

Timeout and poll interval are provider configuration, not test concerns. Tests may inject a deterministic fake provider.

### 4.3 `GmailOtpProvider`

`GmailOtpProvider` implements `OtpProvider` with Gmail OAuth and the Gmail REST API. It owns:

- refreshing an access token from environment-backed OAuth credentials;
- listing candidate messages received after `requestedAfter`;
- optionally narrowing Gmail search by stable sender and subject contracts;
- loading and decoding candidate MIME content;
- filtering decoded candidates by the exact registration email;
- sorting valid candidates by Gmail `internalDate` descending;
- extracting the OTP with the configured OTP contract;
- bounded polling with sanitized errors.

The provider must not mark messages as read, modify labels, delete mail, or expose Gmail data to Playwright artifacts.

The initial implementation uses Node's built-in `fetch`; it does not add a Gmail SDK dependency unless the existing runtime proves insufficient.

### 4.4 `RegistrationWorkflow`

`RegistrationWorkflow` coordinates the business journey through two public stages:

1. `submitRegistration(data)` opens registration, fills the form, records
   `requestedAfter` immediately before submission, submits, and returns the immutable
   email/timestamp correlation context while leaving the page in the OTP state;
2. after the test asserts checkpoint one, `verifyRegistration(context)` requests the
   OTP for the exact email, enters and submits it, and leaves the page in the
   authenticated state so the test can assert checkpoint two.

The workflow contains no raw selectors and no test assertions. It does not resend OTP automatically.

### 4.5 Fixtures and tests

Fixtures compose the existing Page Object, provider, and workflow layers. Gmail construction remains lazy so routine framework tests do not require Gmail configuration.

Tests contain scenario intent and Playwright assertions only. The production test is the only layer allowed to create a real account, and only behind the explicit production gate.

## 5. Configuration contract

Committed configuration contains placeholders only. Real values belong in local `.env` files or CI secret storage.

Production-registration-specific identity values:

- `REGISTRATION_EMAIL_TEMPLATE`: a unique-address template containing exactly one `{unique}` token;
- `REGISTRATION_FULL_NAME`;
- `REGISTRATION_PASSWORD`.

The production flow uses the shared hardened Gmail OTP contract; it does not define a second Gmail
configuration object. When `RUN_OTP_E2E=true`, that shared contract requires:

- `GMAIL_CLIENT_ID`;
- `GMAIL_CLIENT_SECRET`;
- `GMAIL_REFRESH_TOKEN`;
- `OTP_MAILBOX_ADDRESS`;
- `GMAIL_OTP_SENDER`;
- `GMAIL_OTP_SUBJECT`;
- `GMAIL_OTP_PATTERN`: literal verified email text containing exactly one `{otp}` placeholder.

The shared polling controls are:

- `OTP_TIMEOUT_MS`;
- `OTP_POLL_INTERVAL_MS`.

The OTP pattern is mandatory because the framework must not guess OTP length or extract an arbitrary
number. It is parsed as literal text around the `{otp}` placeholder and never compiled as an
environment-provided regular expression. The exact production pattern is supplied from the verified
email contract, not invented in source code.

The unique email generator replaces `{unique}` with a collision-resistant run value. It does not assume Gmail plus-addressing or a particular domain; the configured template defines the application's valid identity format.

Configuration validation has two distinct outcomes:

- when the production flag is absent or false, the real registration test is skipped at definition time with a clear reason and no production fixture/browser flow starts;
- when the flag is true, every required value and format is validated before the test requests a browser-backed fixture. Missing or invalid configuration fails immediately and must never be converted into a skip.

## 6. Gmail correlation and polling

For every registration attempt:

1. capture `requestedAfter` immediately before the registration submit action;
2. query only Gmail messages whose actual received time is after `requestedAfter`;
3. apply stable sender and subject filters only when configured;
4. decode each candidate and require the exact registration email to appear in its content;
5. sort matching messages by Gmail `internalDate`, newest first;
6. apply the configured OTP parser to the newest matching content;
7. return only the named `otp` capture.

The provider must not select the first inbox result. Gmail list ordering alone is not an acceptance signal.

Polling uses configurable total timeout and poll interval. The interval is an external-service polling delay implemented in the provider; it is not Playwright `waitForTimeout()`. Polling stops on success, timeout, non-retryable OAuth/API errors, or an OTP-contract mismatch in a matching message.

## 7. Error handling

### 7.1 Missing Gmail/OAuth configuration

- Production E2E disabled: skip the real registration scenario with a clear reason.
- Production E2E enabled: fail fast during configuration validation before browser/test flow initialization. Do not turn configuration failure into a skip.

### 7.2 OTP email timeout

If no valid message arrives before the configured timeout, throw a domain error describing the elapsed time and a masked registration email. Do not log message bodies, access tokens, refresh tokens, or OTP values.

### 7.3 Gmail API `401` and `403`

These errors are not polling conditions:

- `401`: stop immediately with an authentication/token configuration error;
- `403`: stop immediately with a permission, API access, or `gmail.readonly` scope error.

No infinite or broad retry is allowed.

### 7.4 Multiple matching messages

Filter by time and configured identity signals, sort by actual received time, and inspect the newest matching message. Never rely on raw inbox position.

### 7.5 OTP contract mismatch

When the correct email message is found but the configured parser does not match, fail immediately with this exact diagnostic:

```text
Matching OTP email found but OTP contract did not match.
```

Do not guess OTP length and do not fall back to an arbitrary numeric substring.

### 7.6 OTP UI is absent

Use a Playwright web-first assertion against a verified locator with a suitable assertion timeout. Do not use `waitForTimeout()`. Existing trace and screenshot settings remain responsible for DOM, network, console, and action diagnostics.

### 7.7 Wrong or expired OTP

Assert the exact UI feedback only if a stable unique locator exists. Do not resend automatically. OTP resend is a separate business scenario and is outside this test's intent.

### 7.8 Registration success is absent

Fail at the success checkpoint. The checkpoint must use a verified URL or authenticated UI signal. The preferred observed signal is the newly registered email displayed in the account UI after authentication. If the deployed UI does not expose a unique semantic locator for this state, implementation records the locator/accessibility risk and recommends a stable accessible name or existing stable test ID; it must not invent a selector.

## 8. Test strategy

### 8.1 Framework/component tests

Always-running tests cover:

- registration Page Object form and OTP contracts;
- transition to the OTP state;
- workflow orchestration with a fake OTP provider;
- successful authenticated checkpoint with representative local markup;
- production gate behavior;
- fail-fast validation when the gate is enabled and configuration is missing;
- unique-email-template validation;
- secret-safe email masking.

### 8.2 Gmail provider contract tests

Deterministic tests use injected/mock HTTP behavior to cover:

- access-token refresh;
- Gmail list/get and MIME text decoding;
- `requestedAfter` filtering;
- optional sender and subject narrowing;
- exact registration-email correlation;
- newest-valid-message selection;
- bounded timeout and configurable poll interval;
- immediate `401` and `403` failures;
- exact OTP-contract mismatch error;
- absence of sensitive values in error messages.

These tests do not call Gmail or production.

### 8.3 Production registration E2E

The production test:

- is skipped by default;
- runs only with `RUN_PRODUCTION_REGISTRATION_E2E=true` and valid configuration;
- is discovered only by the unauthenticated `production-registration-chromium` project;
- runs serially with one worker and `retries: 0`;
- disables screenshot, video, and trace artifacts;
- does not run concurrently with another real-account registration using the same mailbox/data;
- creates a unique test identity when the configured application contract permits it;
- asserts the OTP screen and the final authenticated identity separately;
- does not resend OTP and does not delete the created account;
- reports executed, skipped, and failed status accurately.

Retries remain disabled because the first request may create the account even if a later assertion fails. A retry could create duplicate data or fail because the identity already exists.

## 9. Incremental implementation and verification

Implementation is divided into logical groups:

1. types, configuration validation, and deterministic data helpers;
2. OTP provider contract and Gmail adapter;
3. `RegisterPage` correction and component contracts;
4. `RegistrationWorkflow` and fixture composition;
5. opt-in production registration test and documentation.

After every logical group, run and record the actual result of:

```text
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

The production registration E2E is run separately only when every required environment value and the configured target environment are available. An intentionally skipped or unexecuted production test is never reported as passed.

## 10. Acceptance criteria

1. Existing architecture and business intent remain intact.
2. `RegisterPage` no longer requires an absent phone field.
3. Both OTP-screen and authenticated-identity checkpoints are executable through the Page Object and workflow contracts.
4. Gmail polling honors `requestedAfter`, exact email correlation, optional stable sender/subject filters, actual receive-time sorting, timeout, and poll interval.
5. OTP extraction uses only the configured named-capture contract.
6. OAuth `401` and Gmail `403` fail immediately with sanitized, actionable errors.
7. Disabled production E2E skips clearly; enabled but invalid configuration fails before browser flow.
8. Real registration runs serially with zero retries and a unique configured identity.
9. No sensitive Gmail, OTP, credential, storage-state, or report artifact is committed.
10. No locator, route, endpoint, account, Test Case ID, tag, or business rule is invented.
11. Every required verification command is executed and reported honestly after each implementation group.
12. Missing live Gmail/production execution is recorded as missing verification, not successful coverage.

## 11. Non-goals and known limitations

- OTP resend coverage.
- Wrong/expired OTP coverage without a verified stable UI contract.
- Account cleanup or deletion.
- Gmail UI automation.
- Profile, Listings, Appointments, Transactions, password recovery, or unrelated feature coverage.
- Running a real production registration without user-supplied environment configuration.
- Treating component or mocked Gmail tests as proof that the live Gmail/production integration passed.
