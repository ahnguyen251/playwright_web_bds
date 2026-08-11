# Registration and Gmail OTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an opt-in, serial, zero-retry Propify production registration test that verifies the OTP screen, retrieves the correctly correlated OTP through Gmail OAuth, and verifies the newly authenticated email without leaking secrets or inventing locators.

**Architecture:** Preserve the existing Page Object -> Workflow/Helper -> Fixture -> Test structure. `RegisterPage` owns only verified UI contracts, `RegistrationWorkflow` coordinates the two registration stages, and an injected `OtpProvider` is implemented by a read-only Gmail adapter. Pure configuration, parsing, and correlation logic receive deterministic unit coverage in the existing `framework` project.

**Tech Stack:** Node.js 20+, TypeScript 6 strict mode, Playwright Test 1.62, Zod 4, Node built-in `fetch`, Gmail REST API v1, OAuth 2.0 refresh tokens.

## Global Constraints

- Keep the current Page Object -> Workflow/Helper -> Fixture -> Test architecture; do not rewrite the framework.
- Preserve current business behavior, project names, Test Case IDs, tags, and requirement traceability.
- Do not fabricate Profile, Listings, Appointments, or Transactions coverage.
- Keep production registration disabled by default; when disabled, report a clear skip.
- When production registration is enabled, validate every required Gmail/registration variable before a browser-backed fixture starts; invalid configuration is a failure, never a skip.
- Use `gmail.readonly`; never modify, label, mark read, or delete Gmail messages.
- Never commit or log credentials, OAuth values, access tokens, refresh tokens, OTP values, email bodies, cookies, or storage state.
- Do not add a Gmail SDK or another test framework; use Node's built-in `fetch`.
- Do not invent routes, application API endpoints, test accounts, Test Case IDs, tags, selectors, `data-testid` values, or business rules.
- Prefer `getByRole()`, `getByLabel()`, `getByPlaceholder()`, and stable unique `getByText()`.
- Do not use `nth()`, `first()`, dynamic CSS classes, long CSS chains, DOM-position selectors, absolute XPath, or focus timing to enter OTP.
- Do not use Playwright `waitForTimeout()`; Gmail polling uses an injected timer outside the browser.
- Production registration runs only in Chromium, serially, with `retries: 0` and a unique configured identity.
- Do not implement OTP resend in the successful registration scenario.
- Do not claim live Gmail or production registration passed unless the configured live command actually executes successfully.
- After each logical task run, in this order: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npx playwright test --project=framework`.
- Keep `.worktrees/`, `.env*` except `.env.example`, generated reports, traces, screenshots, videos, and authentication state ignored and untracked.

---

## Verified External Contracts and Execution Gate

The deployed Propify registration bundle inspected read-only on 2026-08-11 proves these user-facing contracts:

- registration heading: `Tạo tài khoản`;
- inputs: `Họ và tên`, `Email của bạn`, `Mật khẩu`, `Nhập lại mật khẩu`;
- submit button: `Tạo tài khoản`;
- OTP heading: `Xác thực email`;
- OTP UI: six numeric, one-character text inputs;
- OTP submit button: `Xác nhận`;
- success heading: `Đăng ký thành công!`;
- completion button: `Khám phá ngay`.

The same bundle proves that the six deployed OTP inputs currently have no accessible name and no stable test ID. They cannot be uniquely targeted under the approved locator policy. Do not replace this missing contract with positional indexing, collection order, CSS, or auto-focus typing.

**Hard execution gate before Task 5:** Propify must deploy a unique user-facing accessible name for each OTP input. The recommended contract is `aria-label="Mã OTP 1"` through `aria-label="Mã OTP 6"`. After deployment, verify those exact names in a fresh unauthenticated DOM snapshot before adding them to `RegisterPage`. If Propify chooses different accessible names, update this plan and the component fixture to the exact deployed values before implementation. A stable test ID is acceptable only if Propify actually deploys and guarantees it.

Official Gmail contracts used by Tasks 2 and 3:

- [users.messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)
- [users.messages.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get)
- [Gmail Message resource and internalDate](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages)
- [OAuth refresh-token REST flow](https://developers.google.com/identity/protocols/oauth2/web-server#offline)

---

## File Structure Map

### Create

- `config/registration.config.ts` — opt-in flag and fail-fast production registration configuration.
- `types/otp.types.ts` — OTP provider, Gmail configuration, correlation, and Gmail message contracts.
- `test-data/factories/RegistrationDataFactory.ts` — unique immutable registration identity generation.
- `helpers/otp/GmailMessageParser.ts` — base64url MIME decoding, header lookup, exact email correlation, and configured OTP extraction.
- `helpers/otp/GmailApiClient.ts` — OAuth refresh plus Gmail list/get REST calls and sanitized status errors.
- `helpers/otp/GmailOtpProvider.ts` — bounded polling, receive-time filtering, newest-message selection, and masking.
- `workflows/authentication/RegistrationWorkflow.ts` — two-stage UI/mailbox orchestration.
- `tests/unit/config/registration.config.spec.ts` — gate and fail-fast configuration coverage.
- `tests/unit/test-data/RegistrationDataFactory.spec.ts` — unique-template and secret-safe data coverage.
- `tests/unit/helpers/otp/GmailMessageParser.spec.ts` — MIME and explicit OTP-contract coverage.
- `tests/unit/helpers/otp/GmailApiClient.spec.ts` — OAuth/Gmail HTTP contract coverage.
- `tests/unit/helpers/otp/GmailOtpProvider.spec.ts` — polling, correlation, sorting, timeout, and status coverage.
- `tests/component/pages/RegisterPage.spec.ts` — verified registration and OTP UI contract coverage.
- `tests/component/workflows/RegistrationWorkflow.spec.ts` — workflow/provider coordination coverage.
- `tests/authentication/registration.production.spec.ts` — opt-in real registration scenario.

### Modify

- `types/user.types.ts` — remove registration phone and add explicit password confirmation.
- `tsconfig.json` — include `helpers/**/*.ts`.
- `pages/authentication/RegisterPage.ts` — replace stale form locators and add verified OTP/success operations.
- `pages/components/HeaderComponent.ts` — expose exact authenticated email locator.
- `fixtures/workflow.fixture.ts` — lazily compose `OtpProvider` and `RegistrationWorkflow`.
- `tests/component/fixtures/test.fixture.spec.ts` — verify registration fixture composition with a fake provider.
- `.env.example` — add safe registration/Gmail placeholders only.
- `README.md` — document Gmail setup, commands, coverage, safety, and the OTP accessibility gate.

No existing file is deleted. No registration Test Case ID is added because no approved ID was supplied.

---

### Task 1: Registration types, configuration, and unique identity factory

**Files:**

- Create: `config/registration.config.ts`
- Create: `types/otp.types.ts`
- Create: `test-data/factories/RegistrationDataFactory.ts`
- Create: `tests/unit/config/registration.config.spec.ts`
- Create: `tests/unit/test-data/RegistrationDataFactory.spec.ts`
- Modify: `types/user.types.ts`
- Modify: `tsconfig.json`

**Interfaces:**

- Produces: `OtpQuery`, `OtpProvider`, `RegistrationCorrelation`, `GmailOtpConfig`, and `ProductionRegistrationConfig` from `types/otp.types.ts`.
- Produces: `isProductionRegistrationEnabled(source?: NodeJS.ProcessEnv): boolean`.
- Produces: `loadProductionRegistrationConfig(source?: NodeJS.ProcessEnv): ProductionRegistrationConfig`.
- Produces: `RegistrationDataFactory.create(config, uniqueValue?): RegistrationData`.
- Produces: `RegistrationData` with `fullName`, `email`, `password`, and `passwordConfirmation`; removes the stale `phone` field.
- Consumes later: Tasks 2, 3, 6, and 7 use these exact contracts.

- [ ] **Step 1: Write failing gate and fail-fast configuration tests**

Create `tests/unit/config/registration.config.spec.ts` with these cases:

```ts
import { expect, test } from '@playwright/test';

import {
  isProductionRegistrationEnabled,
  loadProductionRegistrationConfig,
} from '../../../config/registration.config';

const completeSource: NodeJS.ProcessEnv = {
  RUN_PRODUCTION_REGISTRATION_E2E: 'true',
  REGISTRATION_EMAIL_TEMPLATE: 'registration+{unique}@example.test',
  REGISTRATION_FULL_NAME: 'Registration Automation',
  REGISTRATION_PASSWORD: 'StrongPassword1',
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REFRESH_TOKEN: 'refresh-token',
  GMAIL_OTP_PATTERN: 'Mã OTP: (?<otp>\\d{6})',
  GMAIL_OTP_TIMEOUT_MS: '60000',
  GMAIL_OTP_POLL_INTERVAL_MS: '2000',
};

test('keeps production registration disabled by default', () => {
  expect(isProductionRegistrationEnabled({})).toBe(false);
});

test('enables production registration only for the exact true value', () => {
  expect(isProductionRegistrationEnabled(completeSource)).toBe(true);
  expect(isProductionRegistrationEnabled({ RUN_PRODUCTION_REGISTRATION_E2E: 'TRUE' })).toBe(false);
});

test('fails fast with missing key names and no configured secret values', () => {
  const source = { ...completeSource };
  delete source.GMAIL_CLIENT_ID;

  expect(() => loadProductionRegistrationConfig(source)).toThrow(
    'Invalid production registration configuration: GMAIL_CLIENT_ID',
  );

  try {
    loadProductionRegistrationConfig(source);
  } catch (error) {
    expect(String(error)).not.toContain('client-secret');
    expect(String(error)).not.toContain('refresh-token');
  }
});

test('requires exactly one unique token in the registration email template', () => {
  expect(() =>
    loadProductionRegistrationConfig({
      ...completeSource,
      REGISTRATION_EMAIL_TEMPLATE: 'fixed@example.test',
    }),
  ).toThrow(/REGISTRATION_EMAIL_TEMPLATE/);
});

test('requires a compilable OTP pattern with a named otp capture', () => {
  expect(() =>
    loadProductionRegistrationConfig({
      ...completeSource,
      GMAIL_OTP_PATTERN: '\\d{6}',
    }),
  ).toThrow(/GMAIL_OTP_PATTERN/);
});
```

- [ ] **Step 2: Write failing registration data factory tests**

Create `tests/unit/test-data/RegistrationDataFactory.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { RegistrationDataFactory } from '../../../test-data/factories/RegistrationDataFactory';
import type { ProductionRegistrationConfig } from '../../../types/otp.types';

const config = {
  fullName: 'Registration Automation',
  emailTemplate: 'registration+{unique}@example.test',
  password: 'StrongPassword1',
  gmail: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    refreshToken: 'refresh-token',
    otpPattern: /Mã OTP: (?<otp>\d{6})/,
    timeoutMs: 60_000,
    pollIntervalMs: 2_000,
  },
} satisfies ProductionRegistrationConfig;

test('creates immutable registration data from the explicit unique token', () => {
  const data = RegistrationDataFactory.create(config, 'run-123');

  expect(data).toEqual({
    fullName: 'Registration Automation',
    email: 'registration+run-123@example.test',
    password: 'StrongPassword1',
    passwordConfirmation: 'StrongPassword1',
  });
  expect(Object.isFrozen(data)).toBe(true);
});

test('generates a different identity for each default call', () => {
  expect(RegistrationDataFactory.create(config).email).not.toBe(
    RegistrationDataFactory.create(config).email,
  );
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
npx playwright test tests/unit/config/registration.config.spec.ts tests/unit/test-data/RegistrationDataFactory.spec.ts --project=framework
```

Expected: FAIL because the new config, OTP types, factory, and corrected `RegistrationData` contract do not exist.

- [ ] **Step 4: Implement the minimal typed contracts**

Create `types/otp.types.ts`:

```ts
export interface OtpQuery {
  readonly email: string;
  readonly requestedAfter: Date;
}

export interface OtpProvider {
  getOtp(query: OtpQuery): Promise<string>;
}

export type RegistrationCorrelation = OtpQuery;

export interface GmailOtpConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly otpPattern: RegExp;
  readonly sender?: string;
  readonly subject?: string;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface ProductionRegistrationConfig {
  readonly fullName: string;
  readonly emailTemplate: string;
  readonly password: string;
  readonly gmail: GmailOtpConfig;
}
```

Update `types/user.types.ts`:

```ts
export interface RegistrationData {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
}
```

Add `helpers/**/*.ts` to the `tsconfig.json` `include` array now so subsequent tasks type-check without another configuration change.

- [ ] **Step 5: Implement conditional production configuration validation**

Create `config/registration.config.ts` with a schema that is called only by `loadProductionRegistrationConfig`:

```ts
import { z } from 'zod';

import type { ProductionRegistrationConfig } from '../types/otp.types';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const registrationSchema = z
  .object({
    REGISTRATION_EMAIL_TEMPLATE: z.string().trim().min(1),
    REGISTRATION_FULL_NAME: z.string().trim().min(1),
    REGISTRATION_PASSWORD: z.string().min(1),
    GMAIL_CLIENT_ID: z.string().trim().min(1),
    GMAIL_CLIENT_SECRET: z.string().min(1),
    GMAIL_REFRESH_TOKEN: z.string().min(1),
    GMAIL_OTP_PATTERN: z.string().min(1),
    GMAIL_OTP_SENDER: optionalNonEmptyString,
    GMAIL_OTP_SUBJECT: optionalNonEmptyString,
    GMAIL_OTP_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    GMAIL_OTP_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  })
  .superRefine((data, context) => {
    const uniqueTokenCount = data.REGISTRATION_EMAIL_TEMPLATE.match(/\{unique\}/g)?.length ?? 0;
    if (uniqueTokenCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['REGISTRATION_EMAIL_TEMPLATE'],
        message: 'must contain exactly one {unique} token',
      });
    }

    try {
      const pattern = new RegExp(data.GMAIL_OTP_PATTERN);
      if (!pattern.source.includes('(?<otp>')) {
        context.addIssue({
          code: 'custom',
          path: ['GMAIL_OTP_PATTERN'],
          message: 'must contain a named otp capture',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['GMAIL_OTP_PATTERN'],
        message: 'must be a valid JavaScript regular expression source',
      });
    }

    if (data.GMAIL_OTP_TIMEOUT_MS < data.GMAIL_OTP_POLL_INTERVAL_MS) {
      context.addIssue({
        code: 'custom',
        path: ['GMAIL_OTP_TIMEOUT_MS'],
        message: 'must be greater than or equal to the poll interval',
      });
    }
  });

const formatInvalidKeys = (issues: readonly { readonly path: PropertyKey[] }[]): string =>
  [...new Set(issues.map((issue) => String(issue.path[0] ?? 'environment')))].sort().join(', ');

export const isProductionRegistrationEnabled = (source: NodeJS.ProcessEnv = process.env): boolean =>
  source.RUN_PRODUCTION_REGISTRATION_E2E === 'true';

export const loadProductionRegistrationConfig = (
  source: NodeJS.ProcessEnv = process.env,
): ProductionRegistrationConfig => {
  const parsed = registrationSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid production registration configuration: ${formatInvalidKeys(parsed.error.issues)}`,
    );
  }

  const gmail = Object.freeze({
    clientId: parsed.data.GMAIL_CLIENT_ID,
    clientSecret: parsed.data.GMAIL_CLIENT_SECRET,
    refreshToken: parsed.data.GMAIL_REFRESH_TOKEN,
    otpPattern: new RegExp(parsed.data.GMAIL_OTP_PATTERN),
    timeoutMs: parsed.data.GMAIL_OTP_TIMEOUT_MS,
    pollIntervalMs: parsed.data.GMAIL_OTP_POLL_INTERVAL_MS,
    ...(parsed.data.GMAIL_OTP_SENDER === undefined ? {} : { sender: parsed.data.GMAIL_OTP_SENDER }),
    ...(parsed.data.GMAIL_OTP_SUBJECT === undefined
      ? {}
      : { subject: parsed.data.GMAIL_OTP_SUBJECT }),
  });

  return Object.freeze({
    fullName: parsed.data.REGISTRATION_FULL_NAME,
    emailTemplate: parsed.data.REGISTRATION_EMAIL_TEMPLATE,
    password: parsed.data.REGISTRATION_PASSWORD,
    gmail,
  });
};
```

Do not add these optional variables to the global environment schema because routine tests must not require Gmail. The thrown error includes sorted key names only; it never includes Zod messages or parsed values.

- [ ] **Step 6: Implement unique registration data**

Create `RegistrationDataFactory.ts` with the existing random helper and a direct-call guard:

```ts
import type { ProductionRegistrationConfig } from '../../types/otp.types';
import type { RegistrationData } from '../../types/user.types';
import { RandomDataGenerator } from '../../utils/RandomDataGenerator';

export class RegistrationDataFactory {
  public static create(
    config: ProductionRegistrationConfig,
    uniqueValue = RandomDataGenerator.string('registration'),
  ): RegistrationData {
    if ((config.emailTemplate.match(/\{unique\}/g)?.length ?? 0) !== 1) {
      throw new Error('Registration email template must contain exactly one {unique} token.');
    }

    return Object.freeze({
      fullName: config.fullName,
      email: config.emailTemplate.replace('{unique}', uniqueValue),
      password: config.password,
      passwordConfirmation: config.password,
    });
  }
}
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the focused command from Step 3. Expected: all new configuration and factory tests PASS.

- [ ] **Step 8: Run the required logical-group verification**

Run in order:

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`; framework count increases by the exact number of new tests added in this task.

- [ ] **Step 9: Commit Task 1**

```powershell
git add -- config/registration.config.ts types/otp.types.ts types/user.types.ts test-data/factories/RegistrationDataFactory.ts tests/unit/config/registration.config.spec.ts tests/unit/test-data/RegistrationDataFactory.spec.ts tsconfig.json
git commit -m "feat: add production registration configuration"
```

---

### Task 2: Explicit OTP contract and Gmail MIME parser

**Files:**

- Create: `helpers/otp/GmailMessageParser.ts`
- Create: `tests/unit/helpers/otp/GmailMessageParser.spec.ts`

**Interfaces:**

- Consumes: configured `RegExp` and registration email from Task 1.
- Produces: `GmailMessagePart`, `GmailMessage`, and `ParsedGmailMessage` types local to the helper.
- Produces: `GmailMessageParser.parse(message): ParsedGmailMessage`.
- Produces: `GmailMessageParser.extractOtp(body, email, pattern): string | undefined`.
- Task 3 consumes these exact methods.

- [ ] **Step 1: Write failing base64url and multipart tests**

Create deterministic Gmail-shaped messages. Encode fixtures with:

```ts
const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
```

Cover a root `text/plain` body and a nested `multipart/alternative` body. Assert that `parse()` returns the numeric `internalDate`, lower-cased header lookup values, and concatenated decoded text without logging or returning authorization data.

- [ ] **Step 2: Write failing explicit OTP-contract tests**

Add:

```ts
test('extracts only the configured named otp capture for the exact email', () => {
  const body = 'registration+run-1@example.test — Verification code: AB-4821';

  expect(
    GmailMessageParser.extractOtp(
      body,
      'registration+run-1@example.test',
      /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
    ),
  ).toBe('AB-4821');
});

test('does not use an arbitrary number when the configured contract misses', () => {
  const body = 'registration+run-1@example.test reference 999999';

  expect(
    GmailMessageParser.extractOtp(
      body,
      'registration+run-1@example.test',
      /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
    ),
  ).toBeUndefined();
});

test('rejects a message for another registration identity', () => {
  expect(
    GmailMessageParser.extractOtp(
      'other@example.test — Verification code: AB-4821',
      'registration+run-1@example.test',
      /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
    ),
  ).toBeUndefined();
});
```

- [ ] **Step 3: Run parser tests and verify RED**

```powershell
npx playwright test tests/unit/helpers/otp/GmailMessageParser.spec.ts --project=framework
```

Expected: FAIL because `GmailMessageParser` does not exist.

- [ ] **Step 4: Implement MIME decoding and exact parser behavior**

Implement recursive traversal of `MessagePart.parts`. Decode only inline `text/plain` and `text/html` `body.data` values with `Buffer.from(data, 'base64url').toString('utf8')`. Keep root RFC headers for `From`, `To`, and `Subject`. Convert `internalDate` from its epoch-millisecond string and reject a missing or non-finite value.

Implement `extractOtp()` with this exact decision order:

```ts
if (!body.includes(email)) return undefined;
const match = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')).exec(body);
const otp = match?.groups?.otp;
return otp === undefined || otp.length === 0 ? undefined : otp;
```

Do not add a numeric fallback, assumed OTP length, or message-body text to any thrown error.

- [ ] **Step 5: Run focused parser tests and verify GREEN**

Run the Step 3 command. Expected: all parser tests PASS.

- [ ] **Step 6: Run the required logical-group verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- helpers/otp/GmailMessageParser.ts tests/unit/helpers/otp/GmailMessageParser.spec.ts
git commit -m "feat: parse configured gmail otp messages"
```

---

### Task 3: Gmail REST client and bounded OTP polling

**Files:**

- Create: `helpers/otp/GmailApiClient.ts`
- Create: `helpers/otp/GmailOtpProvider.ts`
- Create: `tests/unit/helpers/otp/GmailApiClient.spec.ts`
- Create: `tests/unit/helpers/otp/GmailOtpProvider.spec.ts`

**Interfaces:**

- Consumes: `GmailOtpConfig`, `OtpProvider`, and `OtpQuery` from Task 1.
- Consumes: `GmailMessageParser` from Task 2.
- Produces: `GmailClient.listMessageIds(query): Promise<readonly string[]>`.
- Produces: `GmailClient.getMessage(id): Promise<GmailMessage>`.
- Produces: `GmailApiClient(config, fetchImpl?)` implementing `GmailClient`.
- Produces: `GmailOtpProvider(client, config, clock?)` implementing `OtpProvider.getOtp()`.

- [ ] **Step 1: Write failing OAuth and Gmail HTTP contract tests**

In `GmailApiClient.spec.ts`, inject a `fetch` spy that returns real `Response` objects. Assert:

- token refresh is a form-encoded `POST https://oauth2.googleapis.com/token` containing `client_id`, `client_secret`, `refresh_token`, and `grant_type=refresh_token`;
- Gmail calls put the access token only in `Authorization: Bearer ...`, never the URL;
- list uses `GET https://gmail.googleapis.com/gmail/v1/users/me/messages`, `q`, `maxResults=100`, and follows `nextPageToken`;
- get uses `GET .../messages/{encodedId}?format=full`;
- token failure throws `Gmail OAuth authentication failed.` without response body or credentials;
- Gmail `401` throws `Gmail API authentication failed with status 401.`;
- Gmail `403` throws `Gmail API permission denied with status 403; verify API access and gmail.readonly scope.`.

- [ ] **Step 2: Write failing polling, correlation, and sorting tests**

Create a fake `GmailClient` and injected clock:

```ts
interface PollingClock {
  now(): number;
  sleep(milliseconds: number): Promise<void>;
}
```

Cover these exact behaviors in `GmailOtpProvider.spec.ts`:

- a message with `internalDate <= requestedAfter` is ignored;
- messages for other registration emails are ignored;
- stable configured sender and subject are added to the coarse query and rechecked against decoded headers;
- candidates are sorted by numeric `internalDate` descending, regardless of list order;
- the newest valid matching message returns the named OTP capture;
- the correct newest email with no OTP contract match immediately throws `Matching OTP email found but OTP contract did not match.`;
- no candidates cause repeated calls separated by exactly `pollIntervalMs` until `timeoutMs`;
- timeout includes only a masked email such as `r***@example.test` and never message bodies, OTPs, client secret, or refresh token;
- client `401` or `403` errors propagate immediately and `sleep()` is not called afterward.

- [ ] **Step 3: Run focused Gmail tests and verify RED**

```powershell
npx playwright test tests/unit/helpers/otp/GmailApiClient.spec.ts tests/unit/helpers/otp/GmailOtpProvider.spec.ts --project=framework
```

Expected: FAIL because the Gmail client and provider do not exist.

- [ ] **Step 4: Implement the REST client with no new dependency**

Use only the official endpoints shown in the verified-contract section. Cache the access token for one client instance. Implement list pagination until `nextPageToken` is absent. Parse response JSON through narrow runtime guards; do not trust arbitrary response shapes and do not attach raw response bodies to errors.

Define a status-bearing sanitized error so the provider can stop immediately:

```ts
export class GmailApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GmailApiError';
  }
}
```

Use `URLSearchParams` for both OAuth form data and Gmail query parameters. The core request methods are:

```ts
private async getAccessToken(): Promise<string> {
  if (this.accessToken !== undefined) return this.accessToken;
  const body = new URLSearchParams({
    client_id: this.config.clientId,
    client_secret: this.config.clientSecret,
    refresh_token: this.config.refreshToken,
    grant_type: 'refresh_token',
  });
  const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new GmailApiError('Gmail OAuth authentication failed.', response.status);
  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload.access_token !== 'string') {
    throw new GmailApiError('Gmail OAuth authentication failed.', response.status);
  }
  this.accessToken = payload.access_token;
  return this.accessToken;
}

private async gmailGet(url: URL): Promise<unknown> {
  const response = await this.fetchImpl(url, {
    headers: { authorization: `Bearer ${await this.getAccessToken()}` },
  });
  if (response.status === 401) {
    throw new GmailApiError('Gmail API authentication failed with status 401.', 401);
  }
  if (response.status === 403) {
    throw new GmailApiError(
      'Gmail API permission denied with status 403; verify API access and gmail.readonly scope.',
      403,
    );
  }
  if (!response.ok) {
    throw new GmailApiError(`Gmail API request failed with status ${response.status}.`, response.status);
  }
  return response.json() as Promise<unknown>;
}
```

Define `isRecord(value): value is Record<string, unknown>` locally. `listMessageIds()` validates `messages` as an optional array of objects with string `id`, validates `nextPageToken` as an optional string, appends IDs, and repeats with that page token. `getMessage()` validates `id`, `internalDate`, and `payload` before returning the narrow message contract consumed by `GmailMessageParser`.

- [ ] **Step 5: Implement bounded provider polling**

Build a coarse Gmail search using the UTC request date in `after:YYYY/MM/DD` form plus optional `from:` and `subject:` terms. Treat this only as a coarse server filter; always enforce strict `internalDate > requestedAfter.getTime()` after `messages.get`.

Use this polling skeleton:

```ts
const deadline = this.clock.now() + this.config.timeoutMs;
while (this.clock.now() < deadline) {
  const messages = await this.loadCandidates(query);
  const matching = messages
    .filter((message) => message.internalDate > query.requestedAfter.getTime())
    .filter((message) => this.matchesConfiguredHeaders(message))
    .filter((message) => message.body.includes(query.email))
    .sort((left, right) => right.internalDate - left.internalDate);

  const newest = matching[0];
  if (newest !== undefined) {
    const otp = GmailMessageParser.extractOtp(newest.body, query.email, this.config.otpPattern);
    if (otp === undefined) {
      throw new Error('Matching OTP email found but OTP contract did not match.');
    }
    return otp;
  }

  await this.clock.sleep(
    Math.min(this.config.pollIntervalMs, Math.max(0, deadline - this.clock.now())),
  );
}
throw new Error(`OTP email was not received before timeout for ${maskEmail(query.email)}.`);
```

The default clock uses `Date.now()` and a Promise around `setTimeout`. It must not import Playwright or call `waitForTimeout()`.

- [ ] **Step 6: Run focused Gmail tests and verify GREEN**

Run the Step 3 command. Expected: all Gmail client/provider tests PASS with no live network calls.

- [ ] **Step 7: Run the required logical-group verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`; no error output contains fixture secrets.

- [ ] **Step 8: Commit Task 3**

```powershell
git add -- helpers/otp/GmailApiClient.ts helpers/otp/GmailOtpProvider.ts tests/unit/helpers/otp/GmailApiClient.spec.ts tests/unit/helpers/otp/GmailOtpProvider.spec.ts
git commit -m "feat: add bounded gmail otp polling"
```

---

### Task 4: Correct verified registration UI contracts and record the OTP locator risk

**Files:**

- Modify: `pages/authentication/RegisterPage.ts`
- Modify: `pages/components/HeaderComponent.ts`
- Create: `tests/component/pages/RegisterPage.spec.ts`
- Modify: `README.md`

**Interfaces:**

- Consumes: corrected `RegistrationData` from Task 1.
- Produces: `RegisterPage.openHome()`, `open()`, `fillRegistration(data)`, and `submit()`.
- Produces: public retrying locators `otpHeading` and `registrationSuccessHeading`.
- Produces: `RegisterPage.completeRegistration()` that waits for the verified success heading and clicks the verified `Khám phá ngay` button.
- Produces: `HeaderComponent.accountEmail(email): Locator` using exact user-facing email text.
- Does not yet produce `enterOtp()`; Task 5 is blocked until the deployed accessibility gate passes.

- [ ] **Step 1: Write failing component coverage for the deployed form**

Build local markup using only verified production copy:

```html
<button>Đăng ký ngay</button>
<section hidden>
  <h1>Tạo tài khoản</h1>
  <input placeholder="Họ và tên" />
  <input placeholder="Email của bạn" />
  <input placeholder="Mật khẩu" type="password" />
  <input placeholder="Nhập lại mật khẩu" type="password" />
  <button>Tạo tài khoản</button>
</section>
```

Assert `open()`, `fillRegistration()`, and `submit()` populate all four fields and set a submitted marker. The test must fail against the stale phone locator and stale button/confirmation contracts.

- [ ] **Step 2: Write failing web-first checkpoint coverage**

Extend the local markup so submit hides the form and shows heading `Xác thực email`; a separate simulated successful state shows `Đăng ký thành công!` and `Khám phá ngay`. Assert only through:

```ts
await expect(registerPage.otpHeading).toBeVisible();
await expect(registerPage.registrationSuccessHeading).toBeVisible();
await registerPage.completeRegistration();
```

Add a component case for `HeaderComponent.accountEmail('registration+run@example.test')` using exact visible text.

- [ ] **Step 3: Run component tests and verify RED**

```powershell
npx playwright test tests/component/pages/RegisterPage.spec.ts --project=framework
```

Expected: FAIL because `RegisterPage` still requires phone, uses stale locators, and lacks the checkpoint API.

- [ ] **Step 4: Implement only verified semantic locators**

Use these exact locator contracts:

```ts
this.openRegistrationButton = page.getByRole('button', {
  name: 'Đăng ký ngay',
  exact: true,
});
this.fullNameInput = page.getByPlaceholder('Họ và tên', { exact: true });
this.emailInput = page.getByPlaceholder('Email của bạn', { exact: true });
this.passwordInput = page.getByPlaceholder('Mật khẩu', { exact: true });
this.confirmPasswordInput = page.getByPlaceholder('Nhập lại mật khẩu', { exact: true });
this.submitButton = page.getByRole('button', { name: 'Tạo tài khoản', exact: true });
this.otpHeading = page.getByRole('heading', { name: 'Xác thực email', exact: true });
this.registrationSuccessHeading = page.getByRole('heading', {
  name: 'Đăng ký thành công!',
  exact: true,
});
this.completeRegistrationButton = page.getByRole('button', {
  name: 'Khám phá ngay',
  exact: true,
});
```

Keep `waitFor({ state: 'visible' })` inside `open()` as an action precondition. Assertions stay in tests.

Implement completion as a Page Object action precondition followed by the user action:

```ts
public async completeRegistration(): Promise<void> {
  await this.registrationSuccessHeading.waitFor({ state: 'visible' });
  await this.completeRegistrationButton.click();
}
```

- [ ] **Step 5: Record the deployed OTP accessibility risk**

In README Known limitations, state that the six production OTP inputs have no unique accessible name or guaranteed stable test ID. State that successful OTP entry remains blocked under the locator policy until Propify deploys unique accessible names. Also record that the dynamic wrong/expired-OTP feedback has no stable unique semantic locator, so no negative OTP assertion or resend scenario is added. Do not claim executable registration coverage.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 3 command. Expected: form and checkpoint component tests PASS; no OTP-entry test exists yet.

- [ ] **Step 7: Run the required logical-group verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`.

- [ ] **Step 8: Commit Task 4**

```powershell
git add -- pages/authentication/RegisterPage.ts pages/components/HeaderComponent.ts tests/component/pages/RegisterPage.spec.ts README.md
git commit -m "fix: match deployed registration ui contracts"
```

---

### Task 5: Unique accessible OTP input contract

**Execution gate:** Do not start this task until a fresh deployed DOM snapshot proves six unique OTP accessible names. The currently deployed UI does not satisfy this gate.

**Files:**

- Modify: `pages/authentication/RegisterPage.ts`
- Modify: `tests/component/pages/RegisterPage.spec.ts`
- Modify: `README.md`

**Interfaces:**

- Consumes: the exact accessible names verified after the application change.
- Produces: `RegisterPage.enterOtp(code: string): Promise<void>`.
- Task 6 consumes this method.

- [ ] **Step 1: Verify the external accessibility change read-only**

Open registration in a fresh unauthenticated session, reach the OTP view with an approved synthetic identity, and capture the DOM after the submit action. Confirm that all six inputs have unique accessible names. Do not continue if any name is absent, duplicated, or different from the agreed deployed contract.

Expected gate result for the recommended application change:

```text
textbox "Mã OTP 1"
textbox "Mã OTP 2"
textbox "Mã OTP 3"
textbox "Mã OTP 4"
textbox "Mã OTP 5"
textbox "Mã OTP 6"
```

- [ ] **Step 2: Write a failing six-digit component test**

Add six inputs with the exact deployed accessible names and reproduce the verified numeric, one-character behavior. Assert:

```ts
await registerPage.enterOtp('123456');
```

Read all six input values in the component test through a single read-only `page.evaluate()` result, as existing component tests do, and assert the returned array equals `['1', '2', '3', '4', '5', '6']`. Add negative tests that reject values not matching `/^\d{6}$/` before interacting with the page. Do not call locator builders directly from the test.

- [ ] **Step 3: Run the component test and verify RED**

```powershell
npx playwright test tests/component/pages/RegisterPage.spec.ts --project=framework
```

Expected: FAIL because `enterOtp()` does not exist.

- [ ] **Step 4: Implement one unique semantic locator per OTP digit**

If the recommended contract was deployed exactly, create the locators without position selectors:

```ts
this.otpInputs = Array.from({ length: 6 }, (_, index) =>
  page.getByRole('textbox', { name: `Mã OTP ${index + 1}`, exact: true }),
);
```

`enterOtp()` validates `/^\d{6}$/`, then fills each uniquely named locator with its corresponding digit. It does not click resend and does not use `nth()`, `.first()`, `.last()`, collection order, CSS, XPath, or keyboard focus.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 3 command. Expected: all registration component tests PASS.

- [ ] **Step 6: Remove the resolved README locator blocker**

Replace the blocker with the exact deployed accessible-name contract and retain a note that stable user-facing names are required for continued execution.

- [ ] **Step 7: Run the required logical-group verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`.

- [ ] **Step 8: Commit Task 5**

```powershell
git add -- pages/authentication/RegisterPage.ts tests/component/pages/RegisterPage.spec.ts README.md
git commit -m "feat: automate accessible registration otp entry"
```

---

### Task 6: Two-stage workflow and lazy fixture composition

**Files:**

- Create: `workflows/authentication/RegistrationWorkflow.ts`
- Create: `tests/component/workflows/RegistrationWorkflow.spec.ts`
- Modify: `fixtures/workflow.fixture.ts`
- Modify: `tests/component/fixtures/test.fixture.spec.ts`

**Interfaces:**

- Consumes: `RegisterPage.enterOtp()` from Task 5 and `OtpProvider` from Task 1.
- Produces: `RegistrationWorkflow.submitRegistration(data): Promise<RegistrationCorrelation>`.
- Produces: `RegistrationWorkflow.verifyRegistration(context): Promise<void>`.
- Produces fixtures: `otpProvider: OtpProvider` and `registrationWorkflow: RegistrationWorkflow`.

- [ ] **Step 1: Write failing workflow timing and correlation tests**

Use a local registration/OTP/success UI, a fake provider, and injected `now` function. Assert:

```ts
const context = await registrationWorkflow.submitRegistration(data);
expect(context).toEqual({
  email: data.email,
  requestedAfter: new Date('2026-08-11T01:02:03.000Z'),
});
await expect(registerPage.otpHeading).toBeVisible();

await registrationWorkflow.verifyRegistration(context);
expect(fakeOtpProvider.lastQuery).toEqual(context);
expect(await page.evaluate(() => document.body.dataset.registrationComplete)).toBe('true');
```

The local OTP UI must auto-transition to success after all six uniquely named inputs receive values, matching the verified deployed behavior.

- [ ] **Step 2: Run the workflow test and verify RED**

```powershell
npx playwright test tests/component/workflows/RegistrationWorkflow.spec.ts --project=framework
```

Expected: FAIL because `RegistrationWorkflow` does not exist.

- [ ] **Step 3: Implement the two public workflow stages**

Use this constructor and method boundary:

```ts
export class RegistrationWorkflow {
  public constructor(
    private readonly registerPage: RegisterPage,
    private readonly otpProvider: OtpProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async submitRegistration(data: RegistrationData): Promise<RegistrationCorrelation> {
    await this.registerPage.openHome();
    await this.registerPage.open();
    await this.registerPage.fillRegistration(data);
    const context = Object.freeze({ email: data.email, requestedAfter: this.now() });
    await this.registerPage.submit();
    return context;
  }

  public async verifyRegistration(context: RegistrationCorrelation): Promise<void> {
    const otp = await this.otpProvider.getOtp(context);
    await this.registerPage.enterOtp(otp);
    await this.registerPage.completeRegistration();
  }
}
```

Do not assert, locate, resend, retry browser actions, or log OTP in the workflow.

- [ ] **Step 4: Write failing lazy fixture composition coverage**

Extend the imported `test` in `tests/component/fixtures/test.fixture.spec.ts` with a fake `otpProvider`, request `registrationWorkflow`, and assert it is a `RegistrationWorkflow`. Also keep the existing Login/Authentication fixture assertions unchanged.

- [ ] **Step 5: Implement lazy production provider composition**

Add `otpProvider` and `registrationWorkflow` to `WorkflowFixtures`. The `otpProvider` fixture calls `loadProductionRegistrationConfig()` only when a test requests it, then constructs `GmailApiClient` and `GmailOtpProvider`. The registration fixture composes `registerPage` with that provider.

The production spec in Task 7 performs an earlier module-level validation when enabled. Lazy fixture construction protects all unrelated framework and login tests from Gmail requirements.

- [ ] **Step 6: Run focused workflow/fixture tests and verify GREEN**

```powershell
npx playwright test tests/component/workflows/RegistrationWorkflow.spec.ts tests/component/fixtures/test.fixture.spec.ts --project=framework
```

Expected: all workflow and fixture tests PASS using only the fake provider.

- [ ] **Step 7: Run the required logical-group verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`.

- [ ] **Step 8: Commit Task 6**

```powershell
git add -- workflows/authentication/RegistrationWorkflow.ts fixtures/workflow.fixture.ts tests/component/workflows/RegistrationWorkflow.spec.ts tests/component/fixtures/test.fixture.spec.ts
git commit -m "feat: compose registration otp workflow"
```

---

### Task 7: Opt-in production scenario, safe environment documentation, and final audit

**Files:**

- Create: `tests/authentication/registration.production.spec.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**

- Consumes: all Task 1–6 public contracts.
- Produces: one discoverable production registration scenario using only the existing `@authentication` tag; no fabricated Test Case ID or new tag.
- Produces: documented safe setup and exact execution command.

- [ ] **Step 1: Write the production test with definition-time gate and fail-fast validation**

Use this structure:

```ts
import { expect, test } from '../../fixtures/test.fixture';
import {
  isProductionRegistrationEnabled,
  loadProductionRegistrationConfig,
} from '../../config/registration.config';
import { RegistrationDataFactory } from '../../test-data/factories/RegistrationDataFactory';
import { TAGS } from '../../constants/tags';

const enabled = isProductionRegistrationEnabled();
const registrationConfig = enabled ? loadProductionRegistrationConfig() : undefined;

test.describe('production registration', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });
  test.use({
    storageState: { cookies: [], origins: [] },
    trace: 'retain-on-failure',
  });
  test.skip(!enabled, 'Set RUN_PRODUCTION_REGISTRATION_E2E=true to run real registration.');
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Production registration runs once in Chromium only.',
  );

  test(`registers and verifies a unique user ${TAGS.authentication}`, async ({
    registrationWorkflow,
    registerPage,
    header,
  }) => {
    if (registrationConfig === undefined) {
      throw new Error('Production registration configuration was not loaded.');
    }
    const data = RegistrationDataFactory.create(registrationConfig);
    const context = await registrationWorkflow.submitRegistration(data);

    await expect(registerPage.otpHeading).toBeVisible();

    await registrationWorkflow.verifyRegistration(context);
    await header.openAccountMenu();
    await expect(header.accountEmail(data.email)).toBeVisible();
  });
});
```

Module-level `loadProductionRegistrationConfig()` is the fail-fast boundary. It runs during test-file loading when the flag is true, before `page`, `browser`, or the registration fixtures are requested. Do not catch and convert its error into a skip.

The suite-level trace override is deliberate: global `trace: 'on-first-retry'` cannot capture this zero-retry mutating scenario. Screenshots and video continue to use the existing global failure policies.

- [ ] **Step 2: Verify disabled behavior**

With `RUN_PRODUCTION_REGISTRATION_E2E` unset or false, run:

```powershell
npx playwright test tests/authentication/registration.production.spec.ts --project=chromium --no-deps
```

Expected: one production registration test is reported as skipped with the explicit flag reason; no registration form is submitted.

- [ ] **Step 3: Verify enabled-but-incomplete fail-fast behavior**

In a child PowerShell process, set only `RUN_PRODUCTION_REGISTRATION_E2E=true` and keep at least one required registration/Gmail variable absent. Run the same `--project=chromium --no-deps` command.

Expected: non-zero exit during configuration/test-file loading with only missing environment key names. The output must not say skipped and must not contain a browser action, Gmail request, secret, or OTP.

- [ ] **Step 4: Add safe placeholders to `.env.example`**

Append only non-secret placeholders:

```dotenv
RUN_PRODUCTION_REGISTRATION_E2E=false
REGISTRATION_EMAIL_TEMPLATE=registration+{unique}@example.com
REGISTRATION_FULL_NAME=Registration Automation
REGISTRATION_PASSWORD=replace-with-a-local-secret
GMAIL_CLIENT_ID=replace-with-google-oauth-client-id
GMAIL_CLIENT_SECRET=replace-with-google-oauth-client-secret
GMAIL_REFRESH_TOKEN=replace-with-google-oauth-refresh-token
GMAIL_OTP_PATTERN=replace-with-verified-pattern-containing-named-otp-capture
GMAIL_OTP_SENDER=
GMAIL_OTP_SUBJECT=
GMAIL_OTP_TIMEOUT_MS=60000
GMAIL_OTP_POLL_INTERVAL_MS=2000
```

Do not put a real mailbox, domain, password, OAuth credential, sender, subject, or production OTP pattern into this file.

- [ ] **Step 5: Update README without fabricating live coverage**

Document:

- why Gmail API/OAuth is used instead of Gmail UI;
- how to obtain a refresh token outside the repository with only `gmail.readonly` consent;
- every required and optional environment key;
- unique `{unique}` template behavior;
- disabled, enabled-invalid, and configured execution commands;
- Chromium-only, serial, zero-retry, persistent-account behavior;
- no resend or cleanup behavior;
- framework/component and mocked Gmail coverage that actually exists;
- live Gmail/production status as not executed until a configured run passes;
- exact remaining OTP accessibility risk if Task 5 is still blocked.

- [ ] **Step 6: Run the required logical-group verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`.

- [ ] **Step 7: Run final safe discovery and disabled production checks**

```powershell
npx playwright test --list
npx playwright test tests/authentication/registration.production.spec.ts --project=chromium --no-deps
```

Expected: discovery lists the registration scenario; the disabled command reports an intentional skip, not a pass.

- [ ] **Step 8: Run live production registration only when all external gates are satisfied**

Preconditions:

- Task 5 accessible OTP contract is deployed and verified;
- all local/CI secrets are configured outside Git;
- the registered email template produces unique identities accepted by Propify;
- the dedicated Gmail mailbox receives messages containing the exact registered email;
- `GMAIL_OTP_PATTERN`, optional sender, and optional subject match verified production mail;
- user explicitly enables the mutating run.

Run:

```powershell
$env:RUN_PRODUCTION_REGISTRATION_E2E='true'
npx playwright test tests/authentication/registration.production.spec.ts --project=chromium --no-deps
```

Expected only when configured: one executed test PASS, both web-first checkpoints pass, and one persistent production account is created. If the command is not run or is skipped, report live registration as not verified.

- [ ] **Step 9: Commit Task 7**

```powershell
git add -- tests/authentication/registration.production.spec.ts .env.example README.md
git commit -m "test: add gated production registration flow"
```

- [ ] **Step 10: Perform final requirement and repository-cleanliness audit**

Run and record exact output/status for:

```powershell
git status --short --branch
git diff --stat HEAD~7..HEAD
git ls-files | rg "(^|/)(node_modules|playwright-report|test-results|blob-report|allure-results|allure-report|\.auth|storage-state|\.worktrees)(/|$)|\.storageState\.json$|\.env$"
git grep -n -I -E "(client_secret|refresh_token|access_token|password\s*[:=])" -- ':!package-lock.json' ':!docs/superpowers/plans/**' ':!.env.example'
```

Manually map every acceptance criterion in `docs/superpowers/specs/2026-08-11-registration-gmail-otp-design.md` to current source and test evidence. Record any live Gmail, production, accessibility, or cleanup limitation as incomplete; do not convert absence of evidence into success.

Leave branch `codex/playwright-contract-refactor` and worktree `.worktrees/codex-playwright-contract-refactor` unchanged after the audit. Do not merge, push, create a PR, or commit generated artifacts.
