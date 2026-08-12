# Registration OTP from the Gmail Sent Mailbox

## 1. Purpose

Correct the Gmail OTP integration to match the approved business behavior: the
configured Gmail account is the application sender. It sends a registration OTP to
each newly registered address, so automation reads the sender account's Sent mailbox
rather than a shared receiving mailbox.

The existing architecture remains unchanged:

```text
RegisterPage -> RegistrationWorkflow -> OtpProvider -> GmailOtpProvider -> Gmail API
```

This design changes only registration-email correlation and its configuration,
tests, and documentation. It does not redesign unrelated framework layers or add
new product coverage.

## 2. Verified email contract

The supplied registration-email evidence establishes these stable business facts:

- the message is a registration-account verification email;
- the registration subject is distinct from the password-reset subject;
- the newly registered email address appears in the root `To` header;
- the body contains a six-digit numeric OTP;
- the displayed validity period is three minutes.

The screenshots do not prove the raw MIME/HTML representation, the deployed OTP UI
locators, or a permanent sender address. Therefore:

- the subject and OTP extraction pattern remain environment-backed contracts;
- no personal name, real email address, or observed OTP is committed;
- body parsing continues to support decoded inline `text/plain` and `text/html`
  parts without assuming a particular HTML layout;
- no locator is inferred from the email design.

## 3. Considered approaches

### 3.1 Selected: read the Gmail sender's Sent mailbox

Use Gmail REST API list/get operations with OAuth `gmail.readonly`. Search `in:sent`,
narrow by recipient, registration subject, and request date, then strictly validate
the loaded message headers and timestamp before extracting its OTP.

This matches the actual mail flow, is independent of Gmail's web UI, remains
read-only, and preserves the existing `GmailOtpProvider` abstraction.

### 3.2 Rejected: read a shared receiving mailbox

The application Gmail account does not receive all registration OTP messages. This
would encode the wrong business behavior and fail unless an unrelated catch-all or
forwarding rule were introduced.

### 3.3 Deferred: staging mail sink or backend test hook

A dedicated mail sink or test-only backend contract could provide stronger isolation
in a future staging environment. It is outside the current system contract and would
require product/backend changes, so this refactor must not invent it.

## 4. Component responsibilities

### 4.1 `RegisterPage`

`RegisterPage` continues to own registration and OTP UI actions only. It does not
know about Gmail, OAuth, MIME messages, polling, or environment configuration.

`enterOtp()` remains an explicit accessibility blocker until the deployed page
exposes six independently addressable OTP inputs with unique accessible names such
as `Mã OTP 1` through `Mã OTP 6`. The implementation must not use `nth()`, positional
CSS, DOM-order assumptions, guessed test IDs, dynamic classes, or XPath as a
fallback.

### 4.2 `OtpProvider`

The existing provider boundary stays unchanged:

```ts
interface OtpProvider {
  getOtp(query: OtpQuery): Promise<string>;
}

interface OtpQuery {
  readonly email: string;
  readonly requestedAfter: Date;
}
```

The workflow asks for an OTP using only the generated registration identity and the
timestamp captured immediately before form submission.

### 4.3 `GmailApiClient`

`GmailApiClient` remains a small Gmail REST adapter. It refreshes an OAuth access
token and performs only message list/get operations. It must not change read state,
labels, message content, or mailbox contents.

### 4.4 `GmailMessageParser`

The parser decodes root headers and inline MIME text. It exposes `From`, `To`,
`Subject`, `internalDate`, and decoded body content.

OTP extraction receives only the decoded body and configured regular expression.
Recipient correlation does not belong in the body parser and must not require the
registration email to appear in message content.

### 4.5 `GmailOtpProvider`

The provider owns Sent-mailbox search, strict header correlation, timestamp
selection, OTP extraction, bounded polling, and sanitized domain errors. It keeps
the existing class name to avoid an unrelated architecture change.

### 4.6 Workflow, fixtures, and production test

`RegistrationWorkflow` continues to orchestrate UI actions and the `OtpProvider`
without raw selectors or Gmail logic. Fixtures perform construction only and remain
lazy so ordinary framework tests do not require Gmail credentials. The production
test remains opt-in and is discovered only by its unauthenticated, artifact-free,
single-worker Chromium project with zero retries.

## 5. Configuration contract

The production-registration-specific configuration contains only identity values:

- `REGISTRATION_EMAIL_TEMPLATE`;
- `REGISTRATION_FULL_NAME`;
- `REGISTRATION_PASSWORD`.

The flow consumes the same hardened Gmail OTP configuration as every other OTP flow.
When `RUN_OTP_E2E=true`, the shared environment contract requires:

- `GMAIL_CLIENT_ID`;
- `GMAIL_CLIENT_SECRET`;
- `GMAIL_REFRESH_TOKEN`;
- `OTP_MAILBOX_ADDRESS`;
- `GMAIL_OTP_SENDER`;
- `GMAIL_OTP_PATTERN`;
- `GMAIL_OTP_SUBJECT`.

`GMAIL_OTP_SUBJECT` becomes mandatory because registration and password-reset
messages both contain OTPs. Exact subject equality prevents the provider from using
a password-reset OTP for registration.

The shared polling controls are:

- `OTP_TIMEOUT_MS`;
- `OTP_POLL_INTERVAL_MS`.

The OAuth client and refresh token must authorize the Gmail sender mailbox whose
Sent folder contains the registration message. The required scope is
`gmail.readonly`. Secrets belong only in a local ignored `.env` file or CI secret
store. `.env.example` contains placeholders or non-secret examples only.

`GMAIL_OTP_PATTERN` is literal verified email text with exactly one `{otp}`
placeholder. The provider escapes the surrounding text and requires the placeholder
value to be exactly six digits; it never compiles an environment-provided regular
expression or uses an arbitrary-number fallback.

## 6. Sent-message correlation algorithm

For each registration attempt:

1. `RegistrationWorkflow` captures `requestedAfter` immediately before submitting
   the registration form.
2. `GmailOtpProvider` builds a coarse Gmail query containing:
   - `in:sent`;
   - `after:YYYY/MM/DD`, derived from `requestedAfter`;
   - `to:"<generated registration email>"`;
   - `subject:"<configured registration subject>"`;
   - an optional sender filter when `GMAIL_OTP_SENDER` is configured.
3. The client loads all returned message IDs and fetches the full messages.
4. The provider independently revalidates every loaded candidate:
   - numeric `internalDate` is strictly greater than `requestedAfter`;
   - the root `To` header contains the complete registration address;
   - the root subject, after trimming, exactly equals `GMAIL_OTP_SUBJECT` after
     trimming;
   - when configured, the root `From` header contains the complete
     `GMAIL_OTP_SENDER` address.
5. Valid candidates are sorted by numeric `internalDate` descending.
6. The newest valid candidate is parsed with `GMAIL_OTP_PATTERN`.
7. Only the six-digit named `otp` capture is returned.

Gmail search is only a performance filter. It is never the acceptance signal, and
Gmail list ordering never determines which message wins.

## 7. Address-matching contract

Header matching is case-insensitive, compares complete normalized addresses, and
supports these verified/common forms without adding a new dependency:

```text
person@example.test
Display Name <person@example.test>
First <first@example.test>, Second <second@example.test>
```

The matcher extracts candidate addresses, trims them, lowercases them, and tests
exact membership. It must reject substring collisions such as
`person@example.test.invalid` when the expected address is `person@example.test`.

The initial implementation intentionally supports standard bare and angle-address
forms only. If the actual sender emits a different header representation, the
candidate is ignored or fails with a sanitized contract diagnostic; the framework
must not guess using substring matching.

## 8. Polling and error behavior

- Polling is bounded by the configured timeout and interval. The external-service
  delay uses the provider clock, not Playwright `waitForTimeout()`.
- No matching Sent message before timeout produces an error containing only elapsed
  context and a masked recipient address.
- A strictly correlated message whose body does not match the configured OTP contract
  fails immediately with exactly:

  ```text
  Matching OTP email found but OTP contract did not match.
  ```

- Gmail `401` stops immediately with a sanitized OAuth/configuration error.
- Gmail `403` stops immediately with a sanitized API/scope/permission error.
- Message bodies, access tokens, refresh tokens, client secrets, full recipient
  addresses, and OTP values are never logged.
- The provider does not resend OTP, mark mail as read, modify labels, or delete mail.

If Gmail does not place a sent copy in the authorized mailbox, that is an external
integration failure. The framework does not silently switch to Inbox or another
mailbox.

## 9. Security model

`gmail.readonly` can read the authorized sender mailbox, not just a single message.
A dedicated test sender is preferred when the product environment supports one. If
the production sender must be used, its refresh token must remain in local/CI secret
storage with tightly controlled access and rotation.

The implementation uses only read-only Gmail list/get endpoints. It does not persist
raw Gmail responses, create Playwright attachments from email data, or emit secret
values in errors. OAuth credentials, browser storage state, reports, traces, videos,
and screenshots from local runs remain ignored by Git.

## 10. Test strategy

Deterministic framework tests must cover:

- the shared OTP configuration rejects a missing registration subject;
- the Gmail query contains `in:sent`, exact recipient narrowing, registration
  subject narrowing, and the request date;
- an optional sender filter is applied when configured;
- exact `To` matching accepts bare and display-name forms;
- exact `To` matching accepts the expected member of a multiple-address header;
- recipient substring collisions and different recipients are rejected;
- exact trimmed subject matching rejects the password-reset subject and partial
  subject matches;
- a matching message remains valid when its body does not contain the recipient;
- only candidates newer than `requestedAfter` are accepted;
- the newest strictly valid candidate wins;
- the named capture must yield exactly six digits;
- the existing exact OTP-contract-mismatch error is preserved;
- never-settling list and message-read calls remain bounded by the absolute timeout;
- timeout masking and immediate `401`/`403` behavior remain sanitized;
- parser tests cover root headers and inline plain/HTML MIME content without assuming
  a specific production HTML structure.

Tests use fake HTTP behavior and synthetic, non-personal addresses. They do not call
Gmail or production.

The real production registration test remains disabled by default. Its dedicated
project runs serially with one worker and `retries: 0`, uses empty storage, and turns
screenshot, video, and trace off. It must not run without valid local secrets and the
resolved OTP input accessibility contract. A skipped or blocked production test is
never reported as a pass.

## 11. Incremental implementation scope

The follow-up implementation plan may modify only the focused contracts and their
tests/documentation:

1. configuration and types, making the registration subject mandatory;
2. MIME/OTP parser responsibilities;
3. Sent-query construction and strict header matching in `GmailOtpProvider`;
4. deterministic configuration/parser/provider tests;
5. `.env.example` and README guidance;
6. references that still describe a receiving mailbox.

Workflow orchestration, fixture layering, production gating, registration business
intent, project names, tags, traceability, and the non-destructive default strategy
remain unchanged unless a compilation-only adjustment is required by the stronger
configuration type.

## 12. Acceptance criteria

1. The configured Gmail account is documented and implemented as the OTP sender.
2. Gmail polling searches `in:sent` and correlates the exact generated recipient,
   exact registration subject, and strict post-request timestamp.
3. Recipient correlation uses root headers, never body inclusion or substring
   matching.
4. Password-reset messages and messages for other recipients cannot provide the
   registration OTP.
5. OTP extraction uses only the configured named capture and returns exactly six
   digits.
6. Gmail operations remain read-only and all diagnostics remain secret-safe.
7. The existing Page Object -> Workflow/Helper -> Fixture -> Test architecture is
   preserved.
8. The unresolved six-input OTP accessibility contract remains an explicit blocker;
   no brittle locator fallback is introduced.
9. Production registration remains opt-in, serial, zero-retry, and unexecuted without
   secrets and verified locators.
10. Each implementation checkpoint runs and reports the requested type-check, lint,
    formatting, and framework-test commands truthfully.

## 13. Non-goals and known limitations

- Gmail UI automation.
- Reading a catch-all receiving mailbox.
- Creating backend endpoints, test hooks, forwarding rules, Gmail filters, accounts,
  aliases, routes, selectors, or business rules.
- Password-reset automation, OTP resend, expired/wrong OTP, or account cleanup.
- Profile, Listings, Appointments, Transactions, or unrelated coverage.
- Proving the production flow before valid secrets and unique accessible OTP input
  names are available.
- Treating deterministic framework tests as proof of live Gmail delivery.
