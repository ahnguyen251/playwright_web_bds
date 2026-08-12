# Registration OTP from Gmail Sent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct registration OTP retrieval so the existing provider reads the application sender Gmail account's Sent mailbox and accepts only the newest message whose timestamp, recipient, subject, optional sender, and six-digit OTP satisfy the approved contracts.

**Architecture:** Preserve `RegisterPage -> RegistrationWorkflow -> OtpProvider -> GmailOtpProvider -> Gmail API`. Strengthen only configuration, MIME/OTP parsing, Gmail Sent correlation, focused tests, and documentation; workflow orchestration, fixture wiring, production gating, and the blocked OTP UI contract remain unchanged.

**Tech Stack:** Node.js 20+, TypeScript 6 strict mode, Playwright Test 1.62, Zod 4, Node built-in `fetch`, Gmail REST API v1, OAuth 2.0 with `gmail.readonly`.

## Global Constraints

- Work only in branch `codex/playwright-contract-refactor` and worktree `.worktrees/codex-playwright-contract-refactor`.
- Preserve the existing Page Object -> Workflow/Helper -> Fixture -> Test architecture.
- Do not redesign `RegisterPage`, `RegistrationWorkflow`, fixtures, or the opt-in production scenario.
- Preserve business behavior, project names, Test Case IDs, tags, and requirement traceability.
- Do not create Profile, Listings, Appointments, Transactions, password-reset, resend, cleanup, or unrelated coverage.
- Use Gmail REST list/get operations with `gmail.readonly`; never modify messages, labels, read state, or mailbox contents.
- Do not add a Gmail SDK, email-address library, testing framework, or other dependency.
- Never commit or log real email addresses, names, passwords, OAuth credentials, tokens, OTPs, message bodies, cookies, or browser state.
- Do not invent routes, endpoints, accounts, selectors, `data-testid` values, or business rules.
- Keep `RegisterPage.enterOtp()` blocked until six unique deployed accessible names are verified; do not use `nth()`, CSS position, DOM order, dynamic classes, guessed test IDs, focus timing, or XPath.
- Do not use Playwright `waitForTimeout()`; provider polling continues to use the injected clock.
- Keep production registration disabled by default, serial, Chromium-only, and `retries: 0`.
- Do not run the real production registration flow without valid local secrets and the verified six-input OTP accessibility contract.
- After every implementation task, run in order: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npx playwright test --project=framework`.
- Commit each logical implementation task separately. Do not merge, push, or create a pull request.

---

## File Structure Map

### Modify

- `types/otp.types.ts` — make the registration subject a required Gmail provider contract.
- `config/registration.config.ts` — require and trim `GMAIL_OTP_SUBJECT` when production registration is enabled.
- `tests/unit/config/registration.config.spec.ts` — prove subject fail-fast behavior without exposing values.
- `helpers/otp/GmailMessageParser.ts` — separate OTP extraction from recipient correlation and require a six-digit named capture.
- `tests/unit/helpers/otp/GmailMessageParser.spec.ts` — prove body-only extraction and six-digit validation.
- `helpers/otp/GmailOtpProvider.ts` — search `in:sent`, correlate exact root headers, and select the newest valid message.
- `tests/unit/helpers/otp/GmailOtpProvider.spec.ts` — prove Sent query, exact-address matching, subject isolation, sorting, and sanitized failures.
- `.env.example` — make the required subject contract explicit with a safe placeholder.
- `README.md` — document sender-mailbox OAuth, strict correlation, security, execution gate, and remaining accessibility blocker.

### Preserve unchanged

- `helpers/otp/GmailApiClient.ts` — existing OAuth refresh and read-only list/get boundary is sufficient.
- `types/otp.types.ts` public `OtpProvider` and `OtpQuery` signatures.
- `pages/authentication/RegisterPage.ts` — explicit six-input accessibility blocker.
- `workflows/authentication/RegistrationWorkflow.ts` — existing request-time capture and orchestration.
- `fixtures/workflow.fixture.ts` — existing lazy composition.
- `tests/authentication/registration.production.spec.ts` — existing opt-in, serial, zero-retry scenario.

No file is created or deleted by the runtime refactor. The old receiving-mailbox design and plan remain committed with superseded notices for project history.

---

### Task 1: Required registration subject and body-only six-digit OTP parsing

**Files:**

- Modify: `types/otp.types.ts`
- Modify: `config/registration.config.ts`
- Modify: `tests/unit/config/registration.config.spec.ts`
- Modify: `helpers/otp/GmailMessageParser.ts`
- Modify: `tests/unit/helpers/otp/GmailMessageParser.spec.ts`
- Modify: `tests/unit/test-data/RegistrationDataFactory.spec.ts`
- Modify: `tests/unit/helpers/otp/GmailApiClient.spec.ts`
- Modify: `tests/unit/helpers/otp/GmailOtpProvider.spec.ts`

**Interfaces:**

- Consumes: existing `ProductionRegistrationConfig` and parsed Gmail message body.
- Produces: `GmailOtpConfig.subject: string` as a required property.
- Produces: `GmailMessageParser.extractOtp(body: string, pattern: RegExp): string | undefined`.
- Guarantees: extraction returns only a named `otp` capture matching `/^\d{6}$/`.
- Preserves: root-header parsing and recursive inline `text/plain`/`text/html` decoding.

- [ ] **Step 1: Write failing configuration tests**

Add a safe subject to the shared test source and add the missing-subject case in `tests/unit/config/registration.config.spec.ts`:

```ts
const completeSource: NodeJS.ProcessEnv = {
  RUN_PRODUCTION_REGISTRATION_E2E: 'true',
  REGISTRATION_EMAIL_TEMPLATE: 'registration+{unique}@example.test',
  REGISTRATION_FULL_NAME: 'Registration Automation',
  REGISTRATION_PASSWORD: 'StrongPassword1',
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REFRESH_TOKEN: 'refresh-token',
  GMAIL_OTP_PATTERN: 'Verification code: (?<otp>\\d{6})',
  GMAIL_OTP_SUBJECT: 'Verify registration',
  GMAIL_OTP_TIMEOUT_MS: '60000',
  GMAIL_OTP_POLL_INTERVAL_MS: '2000',
};

test('requires the exact registration subject when production registration is enabled', () => {
  const source = { ...completeSource };
  delete source.GMAIL_OTP_SUBJECT;

  expect(() => loadProductionRegistrationConfig(source)).toThrow(
    'Invalid production registration configuration: GMAIL_OTP_SUBJECT',
  );
});
```

Also assert the loaded value is trimmed and required:

```ts
test('loads a trimmed registration subject', () => {
  const config = loadProductionRegistrationConfig({
    ...completeSource,
    GMAIL_OTP_SUBJECT: '  Verify registration  ',
  });

  expect(config.gmail.subject).toBe('Verify registration');
});
```

- [ ] **Step 2: Write failing parser tests**

Replace the old email-in-body extraction cases in `tests/unit/helpers/otp/GmailMessageParser.spec.ts` with:

```ts
test('extracts a six-digit named otp capture without requiring the recipient in the body', () => {
  expect(
    GmailMessageParser.extractOtp(
      'Your verification code is 482108',
      /verification code is (?<otp>\d{6})/i,
    ),
  ).toBe('482108');
});

test('does not use an arbitrary number when the configured contract misses', () => {
  expect(
    GmailMessageParser.extractOtp('Reference 999999', /verification code is (?<otp>\d{6})/i),
  ).toBeUndefined();
});

test('rejects a named capture that is not exactly six digits', () => {
  expect(
    GmailMessageParser.extractOtp('Code AB-4821', /Code (?<otp>[A-Z]{2}-\d{4})/),
  ).toBeUndefined();
  expect(GmailMessageParser.extractOtp('Code 48210', /Code (?<otp>\d{5})/)).toBeUndefined();
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
npx playwright test tests/unit/config/registration.config.spec.ts tests/unit/helpers/otp/GmailMessageParser.spec.ts --project=framework
```

Expected: FAIL because the subject is currently optional and `extractOtp` still requires an email argument and accepts non-six-digit captures.

- [ ] **Step 4: Make the subject required in the type and schema**

Change `GmailOtpConfig` in `types/otp.types.ts` to:

```ts
export interface GmailOtpConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly otpPattern: RegExp;
  readonly subject: string;
  readonly sender?: string;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}
```

In `config/registration.config.ts`, replace the optional subject schema entry with:

```ts
GMAIL_OTP_SUBJECT: z.string().trim().min(1),
```

Build the Gmail configuration with the required property rather than conditional spread:

```ts
const gmail = Object.freeze({
  clientId: parsed.data.GMAIL_CLIENT_ID,
  clientSecret: parsed.data.GMAIL_CLIENT_SECRET,
  refreshToken: parsed.data.GMAIL_REFRESH_TOKEN,
  otpPattern: new RegExp(parsed.data.GMAIL_OTP_PATTERN),
  subject: parsed.data.GMAIL_OTP_SUBJECT,
  timeoutMs: parsed.data.GMAIL_OTP_TIMEOUT_MS,
  pollIntervalMs: parsed.data.GMAIL_OTP_POLL_INTERVAL_MS,
  ...(parsed.data.GMAIL_OTP_SENDER === undefined ? {} : { sender: parsed.data.GMAIL_OTP_SENDER }),
});
```

Update every deterministic typed Gmail configuration so Task 1 type-checks before
the provider refactor:

```ts
// tests/unit/test-data/RegistrationDataFactory.spec.ts, inside gmail
subject: 'Verify registration',

// tests/unit/helpers/otp/GmailApiClient.spec.ts, inside config
subject: 'Verify registration',

// tests/unit/helpers/otp/GmailOtpProvider.spec.ts, inside baseConfig
subject: 'Verify registration',
```

Do not change provider matching expectations yet; Task 2 owns that behavior.

- [ ] **Step 5: Implement body-only six-digit extraction**

Replace `GmailMessageParser.extractOtp` with:

```ts
public static extractOtp(body: string, pattern: RegExp): string | undefined {
  const match = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')).exec(body);
  const otp = match?.groups?.otp;
  return otp !== undefined && /^\d{6}$/.test(otp) ? otp : undefined;
}
```

Do not move header correlation into this parser method. Keep `parse()` and MIME decoding unchanged.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the command from Step 3. Expected: all configuration and parser tests PASS.

- [ ] **Step 7: Run the checkpoint verification**

Run in order and record actual exit status/counts:

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: all four commands exit `0`. If any command fails, diagnose and fix within Task 1 before committing.

- [ ] **Step 8: Commit Task 1**

```powershell
git add -- types/otp.types.ts config/registration.config.ts tests/unit/config/registration.config.spec.ts helpers/otp/GmailMessageParser.ts tests/unit/helpers/otp/GmailMessageParser.spec.ts tests/unit/test-data/RegistrationDataFactory.spec.ts tests/unit/helpers/otp/GmailApiClient.spec.ts tests/unit/helpers/otp/GmailOtpProvider.spec.ts
git commit -m "refactor: require registration otp email contract"
```

---

### Task 2: Gmail Sent query and strict root-header correlation

**Files:**

- Modify: `helpers/otp/GmailOtpProvider.ts`
- Modify: `tests/unit/helpers/otp/GmailOtpProvider.spec.ts`

**Interfaces:**

- Consumes: `OtpQuery.email`, `OtpQuery.requestedAfter`, required `GmailOtpConfig.subject`, optional `GmailOtpConfig.sender`, and `GmailMessageParser.extractOtp(body, pattern)`.
- Produces: the existing `GmailOtpProvider.getOtp(query): Promise<string>` behavior.
- Guarantees: Gmail search contains `in:sent`, date, quoted recipient, quoted subject, and optional quoted sender.
- Guarantees: acceptance uses strict timestamp, exact normalized `To`, exact trimmed subject, optional exact normalized `From`, newest-first sorting, and six-digit extraction.

- [ ] **Step 1: Update provider fixtures to the approved numeric OTP contract**

In `tests/unit/helpers/otp/GmailOtpProvider.spec.ts`, use:

```ts
const baseConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  otpPattern: /Verification code: (?<otp>\d{6})/,
  subject: 'Verify registration',
  timeoutMs: 5_000,
  pollIntervalMs: 2_000,
} satisfies GmailOtpConfig;
```

Keep all addresses under the reserved `.test` domain.

- [ ] **Step 2: Write a failing Sent-query and strict-correlation test**

Replace the old substring-based selection test with candidates that prove every rejection boundary:

```ts
test('queries Sent and selects the newest message with exact headers after the request', async () => {
  const after = requestedAfter.getTime();
  const expectedRecipient = query.email;
  const client = new FakeGmailClient(
    new Map([
      [
        'old',
        message('old', after, 'Verification code: 100001', {
          from: 'Propify <otp@example.test>',
          to: expectedRecipient,
          subject: 'Verify registration',
        }),
      ],
      [
        'other-recipient',
        message('other-recipient', after + 7_000, 'Verification code: 100002', {
          from: 'Propify <otp@example.test>',
          to: 'other@example.test',
          subject: 'Verify registration',
        }),
      ],
      [
        'recipient-substring',
        message('recipient-substring', after + 6_000, 'Verification code: 100003', {
          from: 'Propify <otp@example.test>',
          to: `${expectedRecipient}.invalid`,
          subject: 'Verify registration',
        }),
      ],
      [
        'password-reset',
        message('password-reset', after + 5_000, 'Verification code: 100004', {
          from: 'Propify <otp@example.test>',
          to: expectedRecipient,
          subject: 'Reset password',
        }),
      ],
      [
        'partial-subject',
        message('partial-subject', after + 4_000, 'Verification code: 100005', {
          from: 'Propify <otp@example.test>',
          to: expectedRecipient,
          subject: 'Verify registration now',
        }),
      ],
      [
        'wrong-sender',
        message('wrong-sender', after + 3_500, 'Verification code: 100006', {
          from: 'attacker@example.test',
          to: expectedRecipient,
          subject: 'Verify registration',
        }),
      ],
      [
        'newest-valid',
        message('newest-valid', after + 3_000, 'Verification code: 482108', {
          from: 'Propify <OTP@example.test>',
          to: `Automation User <${expectedRecipient.toUpperCase()}>`,
          subject: '  Verify registration  ',
        }),
      ],
      [
        'older-valid',
        message('older-valid', after + 1_000, 'Verification code: 111111', {
          from: 'otp@example.test',
          to: expectedRecipient,
          subject: 'Verify registration',
        }),
      ],
    ]),
  );
  const clock = new FakeClock(0);
  const provider = new GmailOtpProvider(
    client,
    { ...baseConfig, sender: 'otp@example.test' },
    clock,
  );

  await expect(provider.getOtp(query)).resolves.toBe('482108');
  expect(client.queries).toEqual([
    'in:sent after:2026/08/11 to:"registration+run-1@example.test" subject:"Verify registration" from:"otp@example.test"',
  ]);
  expect(clock.sleeps).toEqual([]);
});
```

The valid body deliberately omits the recipient. This proves that correlation comes from the root `To` header.

- [ ] **Step 3: Write failing multiple-recipient and mismatch tests**

Add:

```ts
test('accepts an exact recipient in a multiple-address To header', async () => {
  const client = new FakeGmailClient(
    new Map([
      [
        'multiple-to',
        message('multiple-to', requestedAfter.getTime() + 1_000, 'Verification code: 654321', {
          to: `Other <other@example.test>, Registration <${query.email}>`,
          subject: 'Verify registration',
        }),
      ],
    ]),
  );

  await expect(
    new GmailOtpProvider(client, baseConfig, new FakeClock(0)).getOtp(query),
  ).resolves.toBe('654321');
});

test('fails immediately when the newest strictly correlated message violates the OTP contract', async () => {
  const after = requestedAfter.getTime();
  const client = new FakeGmailClient(
    new Map([
      [
        'matching-invalid',
        message('matching-invalid', after + 1_000, 'Reference 999999', {
          to: query.email,
          subject: 'Verify registration',
        }),
      ],
    ]),
  );
  const clock = new FakeClock(0);

  await expect(new GmailOtpProvider(client, baseConfig, clock).getOtp(query)).rejects.toThrow(
    'Matching OTP email found but OTP contract did not match.',
  );
  expect(clock.sleeps).toEqual([]);
});
```

Keep and adapt the existing bounded-timeout and immediate `401`/`403` tests. Every message intended to correlate must now include exact `To` and subject headers.

- [ ] **Step 4: Run the focused provider tests and verify RED**

```powershell
npx playwright test tests/unit/helpers/otp/GmailOtpProvider.spec.ts --project=framework
```

Expected: FAIL because the current query omits `in:sent` and `to`, header checks use substring/partial matching, and provider correlation still depends on body inclusion.

- [ ] **Step 5: Implement narrow exact-address helpers**

Add focused local helpers to `helpers/otp/GmailOtpProvider.ts`:

```ts
const normalizeAddress = (value: string): string => value.trim().toLowerCase();

const extractAddresses = (header: string | undefined): string[] => {
  if (header === undefined) return [];

  return header
    .split(',')
    .map((part) => /<([^<>]+)>/.exec(part)?.[1] ?? part)
    .map(normalizeAddress)
    .filter((address) => /^[^\s@<>]+@[^\s@<>]+$/.test(address));
};

const hasExactAddress = (header: string | undefined, expected: string): boolean =>
  extractAddresses(header).includes(normalizeAddress(expected));
```

This intentionally supports bare addresses, `Display Name <address>`, and comma-separated values. Do not add substring fallback. Header forms outside this contract remain unmatched and lead to the existing sanitized timeout.

- [ ] **Step 6: Implement Sent search and strict candidate validation**

Update `buildSearchQuery`:

```ts
private buildSearchQuery(query: OtpQuery): string {
  const requestDate = query.requestedAfter.toISOString().slice(0, 10).replaceAll('-', '/');
  return [
    'in:sent',
    `after:${requestDate}`,
    `to:${quoteSearchValue(query.email.trim())}`,
    `subject:${quoteSearchValue(this.config.subject.trim())}`,
    ...(this.config.sender === undefined
      ? []
      : [`from:${quoteSearchValue(this.config.sender.trim())}`]),
  ].join(' ');
}
```

Replace the candidate filters with:

```ts
const matching = messages
  .filter((candidate) => candidate.internalDate > query.requestedAfter.getTime())
  .filter((candidate) => this.matchesCorrelation(candidate, query))
  .sort((left, right) => right.internalDate - left.internalDate);
```

Add exact validation:

```ts
private matchesCorrelation(message: ParsedGmailMessage, query: OtpQuery): boolean {
  if (!hasExactAddress(message.to, query.email)) return false;
  if (message.subject?.trim() !== this.config.subject.trim()) return false;
  return this.config.sender === undefined || hasExactAddress(message.from, this.config.sender);
}
```

Call the Task 1 parser signature:

```ts
const otp = GmailMessageParser.extractOtp(newest.body, this.config.otpPattern);
```

Preserve numeric `internalDate` sorting, bounded polling, the exact mismatch error, masking, and immediate propagation of Gmail API errors.

- [ ] **Step 7: Run focused provider tests and verify GREEN**

Run the command from Step 4. Expected: all provider tests PASS.

- [ ] **Step 8: Run the checkpoint verification**

Run in order and record actual exit status/counts:

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: all four commands exit `0`. If any command fails, diagnose and fix within Task 2 before committing.

- [ ] **Step 9: Commit Task 2**

```powershell
git add -- helpers/otp/GmailOtpProvider.ts tests/unit/helpers/otp/GmailOtpProvider.spec.ts
git commit -m "refactor: correlate registration otp from gmail sent"
```

---

### Task 3: Sender-mailbox documentation and final safe verification

**Files:**

- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**

- Consumes: the finalized Task 1–2 environment and correlation contracts.
- Produces: clone-safe setup instructions with no secrets and an honest execution status.
- Preserves: current production execution command and OTP accessibility blocker.

- [ ] **Step 1: Make the required subject visible in `.env.example`**

Replace the blank subject with a safe instruction, without adding a real sender or address:

```dotenv
GMAIL_OTP_SENDER=
GMAIL_OTP_SUBJECT=replace-with-exact-registration-email-subject
```

Keep `GMAIL_OTP_PATTERN` as an environment-backed verified pattern and do not copy an observed OTP from evidence.

- [ ] **Step 2: Correct README configuration semantics**

Update the required-variable table so `GMAIL_OTP_SUBJECT` is required and described as the exact registration-email subject. Keep only `GMAIL_OTP_SENDER`, timeout, and poll interval in the optional table.

State explicitly:

- Gmail OAuth authorizes the application sender account whose Sent folder holds OTP messages;
- `GMAIL_OTP_SUBJECT` distinguishes registration from password-reset OTP mail;
- the provider searches `in:sent` and rechecks exact root `To`, exact trimmed subject, optional exact `From`, and `internalDate > requestedAfter`;
- the message body need not contain the registered address;
- the named capture must return exactly six digits;
- `gmail.readonly` can read the sender mailbox, so a dedicated test sender is preferred when available;
- secrets remain only in an ignored local `.env` or CI secret store;
- list/get are the only Gmail operations and no mail is changed;
- production registration remains unexecuted and blocked by the six unique OTP accessible names.

Do not change the documented opt-in production command or claim live success.

- [ ] **Step 3: Scan documentation for stale active receiving-mailbox claims and secrets**

Run:

```powershell
rg -n -i "dedicated OTP mailbox|messages received after|body.*email|GMAIL_OTP_SUBJECT.*optional" README.md .env.example
rg -n -i "client_secret|refresh_token|access_token|@[a-z0-9.-]+\\.(com|vn)" README.md .env.example
```

Expected: no active receiving-mailbox/body-correlation language and no real secret or personal mailbox. Placeholder variable names and `example.com` values are acceptable.

- [ ] **Step 4: Run the checkpoint verification**

Run in order and record actual exit status/counts:

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: all four commands exit `0`.

- [ ] **Step 5: Verify the production test remains safely disabled**

With `RUN_PRODUCTION_REGISTRATION_E2E` unset or false, run:

```powershell
npx playwright test tests/authentication/registration.production.spec.ts --project=chromium --no-deps
```

Expected: the production registration scenario is reported as skipped with the existing opt-in reason; no account is created and Gmail is not called. Do not run with the flag enabled.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- .env.example README.md
git commit -m "docs: describe gmail sent otp configuration"
```

- [ ] **Step 7: Perform final verification from the committed branch**

Run again in order:

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Record each actual exit code and the Playwright pass/skip/fail count. Do not report success for a command not executed or for the intentionally skipped production scenario.

- [ ] **Step 8: Perform repository-cleanliness and scope audit**

Run:

```powershell
git status --short --branch
git diff --stat HEAD~3..HEAD
git ls-files | rg "(^|/)(node_modules|playwright-report|test-results|blob-report|allure-results|allure-report|\\.auth|storage-state|\\.worktrees)(/|$)|\\.storageState\\.json$|\\.env$"
git grep -n -I -E "(client_secret|refresh_token|access_token|password[[:space:]]*[:=])" -- ':!package-lock.json' ':!docs/superpowers/plans/**' ':!.env.example'
```

Inspect any matches rather than assuming they are secrets. Confirm that only the scoped files changed, no generated artifacts are tracked, and the worktree is clean.

- [ ] **Step 9: Report actual outcome and remaining blockers**

The final report must include:

1. branch and worktree;
2. files added, modified, and deleted;
3. main changes and code smells fixed;
4. current `.gitignore` coverage and any detected local/generated/sensitive files;
5. tracked files that may need removal;
6. unresolved locator/accessibility risks;
7. features without executable coverage;
8. exact verification commands with actual results;
9. `git status` and `git diff --stat`;
10. whether the branch is safe for review and eventual GitHub submission.

State clearly that the live Gmail/production registration flow was not executed and is not proven while the OTP UI accessibility contract remains blocked.
