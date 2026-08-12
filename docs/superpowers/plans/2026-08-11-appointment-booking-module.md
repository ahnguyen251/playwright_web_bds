# Appointment Booking Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, reusable, traceable Appointment Booking automation module for Propify UC-18.

**Architecture:** Preserve `Test -> Fixture -> AppointmentWorkflow -> Page Objects -> Playwright`.
Resolve current date/time choices from semantic UI options, keep data in a typed factory, and isolate
all live mutations behind an automatic environment guard that never permits production writes.

**Tech Stack:** Node.js 20+, TypeScript 6 strict mode, Playwright Test 1.62, Zod 4, ESLint 10,
Prettier 3.

## Global Constraints

- Do not use `waitForTimeout()`, arbitrary sleeps, `first()`, `last()`, `nth()`, XPath, dynamic CSS
  selectors, hard-coded credentials, hard-coded dates, or a hard-coded listing ID.
- Use verified semantic locators and Playwright web-first assertions.
- Keep selectors and direct UI interactions in Page Objects, orchestration in Workflows, dependency
  initialization in fixtures, data in factories/static JSON, and assertions in tests.
- A mutating test requires `RUN_MUTATING_TESTS=true` and `TEST_ENV=dev|staging`; production is
  always blocked.
- Do not run the opt-in mutating scenario against the currently configured production target.
- Preserve existing appointment view/status types for future lifecycle extension.
- Report every skipped or unexecuted live scenario accurately.

---

## Planned file map

- `config/environment.schema.ts`: parse the mutation flag and optional appointment listing ID.
- `config/environment.config.ts`: expose parsed appointment settings.
- `config/mutation.policy.ts`: provide a pure, testable mutation decision.
- `types/environment.types.ts`: type the new environment fields.
- `.env.example`: document safe defaults.
- `tests/unit/config/environment.config.spec.ts`: cover parsing and defaults.
- `tests/unit/config/mutation.policy.spec.ts`: prove flag and production blocking.
- `types/appointment.types.ts`: define contact, preference, request, and resolved-selection types.
- `test-data/static/appointment.json`: keep only safe, non-expiring defaults.
- `test-data/factories/AppointmentDataFactory.ts`: create independent immutable requests.
- `tests/unit/test-data/AppointmentDataFactory.spec.ts`: cover defaults, overrides, and invalid IDs.
- `pages/appointments/AppointmentPage.ts`: model the verified deployed booking popup.
- `tests/component/support/appointment-form.fixture.ts`: deterministic verified UI fixture.
- `tests/component/pages/AppointmentPage.spec.ts`: protect locator and interaction contracts.
- `workflows/appointments/AppointmentWorkflow.ts`: orchestrate preparation and submission.
- `tests/component/workflows/AppointmentWorkflow.spec.ts`: prove end-to-end orchestration locally.
- `fixtures/appointment.fixture.ts`: initialize configured appointment data only.
- `fixtures/test.fixture.ts`: export appointment-aware BaseTest composition.
- `fixtures/mutating.fixture.ts`: enforce the automatic mutation guard.
- `tests/component/fixtures/test.fixture.spec.ts`: verify appointment Page/Workflow composition.
- `test-cases/appointments/appointment.test-cases.ts`: define APPOINTMENT-001 through 005.
- `tests/appointments/appointment-booking.mutating.spec.ts`: guarded success journey.
- `tests/appointments/appointment-validation.read-only.spec.ts`: non-mutating UI validations.
- `docs/traceability/requirements-to-tests.md`: map UC-18 and unverified rules.
- `README.md`: document configuration, commands, and safety.

### Task 1: Environment contract and mutation policy

**Files:**

- Modify: `config/environment.schema.ts`
- Modify: `config/environment.config.ts`
- Create: `config/mutation.policy.ts`
- Modify: `types/environment.types.ts`
- Modify: `.env.example`
- Modify: `tests/unit/config/environment.config.spec.ts`
- Create: `tests/unit/config/mutation.policy.spec.ts`

**Interfaces:**

- Produces: `EnvironmentConfig.runMutatingTests: boolean`.
- Produces: `EnvironmentConfig.appointmentListingId?: number`.
- Produces: `mutationBlockReason(config): string | undefined`.

- [ ] **Step 1: Write failing configuration and policy tests**

Add assertions that omitted `RUN_MUTATING_TESTS` defaults to `false`, `true` parses correctly, a
positive `APPOINTMENT_LISTING_ID` parses as a number, invalid IDs are rejected, dev/staging require
the flag, and production is always blocked.

```ts
expect(loadEnvironmentConfig(validEnvironment).runMutatingTests).toBe(false);
expect(
  loadEnvironmentConfig({
    ...validEnvironment,
    RUN_MUTATING_TESTS: 'true',
    APPOINTMENT_LISTING_ID: '48',
  }),
).toMatchObject({ runMutatingTests: true, appointmentListingId: 48 });

expect(mutationBlockReason({ environment: 'production', runMutatingTests: true })).toContain(
  'production',
);
expect(mutationBlockReason({ environment: 'staging', runMutatingTests: true })).toBeUndefined();
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx playwright test tests/unit/config/environment.config.spec.ts tests/unit/config/mutation.policy.spec.ts --project=framework
```

Expected: FAIL because the fields and policy module do not exist.

- [ ] **Step 3: Implement the minimal schema, config mapping, and policy**

Use a blank-to-undefined preprocessor around `z.coerce.number().int().positive().optional()`. Map
the parsed fields with exact optional-property handling. Implement:

```ts
export const mutationBlockReason = (
  config: Pick<EnvironmentConfig, 'environment' | 'runMutatingTests'>,
): string | undefined => {
  if (config.environment === 'production') {
    return 'Mutating tests never run against production.';
  }
  if (!config.runMutatingTests) {
    return 'Set RUN_MUTATING_TESTS=true to run mutating tests on dev or staging.';
  }
  return undefined;
};
```

Document `RUN_MUTATING_TESTS=false` and an empty `APPOINTMENT_LISTING_ID=` in `.env.example`.

- [ ] **Step 4: Verify GREEN**

Run the Task 1 test command and `npm run typecheck`. Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add -- .env.example config/environment.schema.ts config/environment.config.ts config/mutation.policy.ts types/environment.types.ts tests/unit/config/environment.config.spec.ts tests/unit/config/mutation.policy.spec.ts
git commit -m "feat: guard appointment mutations"
```

### Task 2: Typed independent appointment data

**Files:**

- Modify: `types/appointment.types.ts`
- Modify: `test-data/static/appointment.json`
- Create: `test-data/factories/AppointmentDataFactory.ts`
- Create: `tests/unit/test-data/AppointmentDataFactory.spec.ts`

**Interfaces:**

- Produces: `AppointmentContactData`, `AppointmentOptionPreference`, `AppointmentData`, and
  `ResolvedAppointmentSelection`.
- Produces: `AppointmentDataFactory.create(listingId, overrides?)`.

- [ ] **Step 1: Write failing factory tests**

```ts
test('creates independent valid requests without expiring options', () => {
  const first = AppointmentDataFactory.create(48);
  const second = AppointmentDataFactory.create(48);
  expect(first).not.toBe(second);
  expect(first.phone).toMatch(/^0[235789]\d{8}$/);
  expect(first.email).toMatch(/@gmail\.com$/);
  expect(first.date).toEqual({ strategy: 'earliest-available' });
  expect(first.timeSlot).toEqual({ strategy: 'earliest-available' });
  expect(first.email).not.toBe(second.email);
});

test('accepts invalid contact overrides for negative UI scenarios', () => {
  expect(AppointmentDataFactory.create(48, { phone: '0101234567' }).phone).toBe('0101234567');
});

test('rejects an invalid listing id', () => {
  expect(() => AppointmentDataFactory.create(0)).toThrow('Appointment listing ID must be positive');
});
```

- [ ] **Step 2: Verify RED**

Run the new factory spec. Expected: FAIL because the factory does not exist.

- [ ] **Step 3: Implement the types and factory**

Use this discriminated option contract:

```ts
export type AppointmentOptionPreference =
  | { readonly strategy: 'earliest-available' }
  | { readonly strategy: 'exact'; readonly label: string };

export interface AppointmentData extends AppointmentContactData {
  readonly listingId: number;
  readonly date: AppointmentOptionPreference;
  readonly timeSlot: AppointmentOptionPreference;
}
```

Generate a fresh phone with `RandomDataGenerator.phoneNumber()` and a Gmail address from
`RandomDataGenerator.string('appointment')`. Freeze the request and nested preferences. Remove the
listing ID, date, and time from static JSON.

- [ ] **Step 4: Verify GREEN**

Run the focused factory spec and typecheck. Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add -- types/appointment.types.ts test-data/static/appointment.json test-data/factories/AppointmentDataFactory.ts tests/unit/test-data/AppointmentDataFactory.spec.ts
git commit -m "feat: add appointment test data factory"
```

### Task 3: Appointment Page Object contract

**Files:**

- Modify: `pages/appointments/AppointmentPage.ts`
- Create: `tests/component/support/appointment-form.fixture.ts`
- Create: `tests/component/pages/AppointmentPage.spec.ts`

**Interfaces:**

- Produces public Locator properties `formHeading`, `submitButton`, `successHeading`,
  `nameRequiredError`, `phoneInvalidError`, and `emailInvalidError`.
- Produces `availableDateLabels`, `availableTimeSlotLabels`, `selectDate`, `selectTimeSlot`,
  `fillContact`, and `submitAppointment`.

- [ ] **Step 1: Create the deterministic popup fixture and failing Page tests**

The fixture must use the verified headings, placeholders, option labels, validation strings, and
success heading. Its script must change state only after semantic button/input actions and must not
call a network API.

```ts
await page.setContent(appointmentFormFixture());
const appointmentPage = new AppointmentPage(page);
expect(await appointmentPage.availableDateLabels()).toEqual([
  'Thứ 4 12 Tháng 8',
  'Thứ 5 13 Tháng 8',
]);
await appointmentPage.selectDate('Thứ 5 13 Tháng 8');
await appointmentPage.selectTimeSlot('10:00 - 11:00');
await appointmentPage.fillContact(validContact);
await appointmentPage.submitAppointment();
await expect(appointmentPage.successHeading).toBeVisible();
```

Add separate tests that expose the exact name, phone, and email errors and prove the submit control
stays disabled without a time selection.

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx playwright test tests/component/pages/AppointmentPage.spec.ts --project=framework
```

Expected: FAIL because the verified popup API is absent.

- [ ] **Step 3: Implement semantic locators and interactions**

Use role-name patterns for dates and time slots:

```ts
this.dateOptions = page.getByRole('button', {
  name: /^(?:Hôm nay|Chủ nhật|Thứ [2-7]) \d{1,2} Tháng \d{1,2}$/,
});
this.timeSlotOptions = page.getByRole('button', {
  name: /^\d{2}:\d{2} - \d{2}:\d{2}$/,
});
```

Normalize each option's `innerText` whitespace, then click a chosen label with an exact role locator.
Fill fields in UI order and move focus from email when no note is supplied so observed blur
validation can render. Preserve existing appointment list methods.

- [ ] **Step 4: Verify GREEN**

Run the component Page spec and typecheck. Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add -- pages/appointments/AppointmentPage.ts tests/component/support/appointment-form.fixture.ts tests/component/pages/AppointmentPage.spec.ts
git commit -m "feat: model appointment booking popup"
```

### Task 4: Appointment Workflow orchestration

**Files:**

- Modify: `workflows/appointments/AppointmentWorkflow.ts`
- Create: `tests/component/workflows/AppointmentWorkflow.spec.ts`

**Interfaces:**

- Produces `prepareAppointment(data): Promise<ResolvedAppointmentSelection>`.
- Produces `prepareAppointmentWithoutTime(data): Promise<string>`.
- Preserves `submitPreparedAppointment` and future appointment-list navigation.

- [ ] **Step 1: Write failing real-Page Workflow tests**

Route `**/listings/48` to the deterministic form fixture, instantiate real
`ListingDetailPage`, `AppointmentPage`, and `AppointmentWorkflow`, then verify earliest-available and
exact selection. Add a test that requests an unavailable exact option and expects a descriptive
error. Add a without-time test that proves the submit Locator remains disabled.

```ts
const selection = await workflow.prepareAppointment(AppointmentDataFactory.create(48));
expect(selection).toEqual({
  dateLabel: 'Thứ 4 12 Tháng 8',
  timeSlotLabel: '10:00 - 11:00',
});
```

- [ ] **Step 2: Verify RED**

Run the Workflow component spec. Expected: FAIL because preference resolution is absent.

- [ ] **Step 3: Implement minimal orchestration**

Resolve `exact` by membership and `earliest-available` by intentional array index `options[0]` after
an explicit non-empty check. This is data selection, not a positional Locator workaround. Open the
listing and popup before discovering options. Keep selectors out of the Workflow.

- [ ] **Step 4: Verify GREEN**

Run both appointment component specs and typecheck. Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add -- workflows/appointments/AppointmentWorkflow.ts tests/component/workflows/AppointmentWorkflow.spec.ts
git commit -m "feat: orchestrate appointment booking"
```

### Task 5: Appointment and mutation fixtures

**Files:**

- Create: `fixtures/appointment.fixture.ts`
- Create: `fixtures/mutating.fixture.ts`
- Modify: `fixtures/test.fixture.ts`
- Modify: `tests/component/fixtures/test.fixture.spec.ts`

**Interfaces:**

- Produces fixture `appointmentData: AppointmentData` for configured E2E scenarios.
- Produces fixture `appointmentDataFor(listingId): AppointmentData` for environment-independent
  composition and future controlled-state consumers.
- Produces `mutatingTest` with an automatic mutation guard.

- [ ] **Step 1: Extend the composition test before changing fixtures**

Assert that the final fixture composition provides real `AppointmentPage` and
`AppointmentWorkflow` instances plus an `appointmentDataFor` function. Call the function twice with
listing ID 48 and prove it creates independent data. Do not request `appointmentData` in this
component test, because a controlled listing is intentionally optional.

```ts
test('composes appointment dependencies and environment-independent data', ({
  appointmentPage,
  appointmentWorkflow,
  appointmentDataFor,
}) => {
  expect(appointmentPage).toBeInstanceOf(AppointmentPage);
  expect(appointmentWorkflow).toBeInstanceOf(AppointmentWorkflow);
  expect(appointmentDataFor(48)).not.toBe(appointmentDataFor(48));
});
```

- [ ] **Step 2: Verify RED**

Run the fixture component spec. Expected: FAIL because `appointmentDataFor` is not part of the final
fixture contract.

- [ ] **Step 3: Implement initialization-only fixtures**

Implement `appointmentDataFor` as an initialization-only closure around
`AppointmentDataFactory.create(listingId)`. Load environment configuration once in
`appointment.fixture.ts`. For `appointmentData`, if the ID is absent, call
`testInfo.skip(true, 'APPOINTMENT_LISTING_ID is not configured for appointment E2E tests.')` and
return before `use`; otherwise pass a fresh factory result to `use`.

In `mutating.fixture.ts`, extend `appointmentTest` with an automatic `mutationGuard` fixture that
computes `mutationBlockReason`, skips when a reason exists, and otherwise calls `use()`.

- [ ] **Step 4: Verify GREEN**

Run the fixture component spec and typecheck. Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add -- fixtures/appointment.fixture.ts fixtures/mutating.fixture.ts fixtures/test.fixture.ts tests/component/fixtures/test.fixture.spec.ts
git commit -m "feat: compose appointment fixtures"
```

### Task 6: Traceable E2E scenario files

**Files:**

- Create: `test-cases/appointments/appointment.test-cases.ts`
- Create: `tests/appointments/appointment-booking.mutating.spec.ts`
- Create: `tests/appointments/appointment-validation.read-only.spec.ts`

**Interfaces:**

- Produces immutable APPOINTMENT-001 through APPOINTMENT-005 metadata and title generation.
- Consumes ordinary `test` for read-only scenarios and only `mutatingTest` for APPOINTMENT-001.

- [ ] **Step 1: Add metadata and scenario tests before any E2E-specific implementation change**

Use these titles and expected results:

- `APPOINTMENT-001 Create appointment successfully`;
- `APPOINTMENT-002 Require appointment time`;
- `APPOINTMENT-003 Require contact name`;
- `APPOINTMENT-004 Validate Vietnamese phone number`;
- `APPOINTMENT-005 Require Gmail email address`.

The success scenario calls `prepareAppointment`, submits, then uses web-first assertions for
`successHeading` visible and `formHeading` hidden. Validation scenarios prepare overridden data and
assert the verified error Locator or disabled submit control.

- [ ] **Step 2: Prove discovery and default mutation skip**

Run:

```powershell
npx playwright test tests/appointments --list
npx playwright test tests/appointments/appointment-booking.mutating.spec.ts --project=chromium --no-deps
```

Expected: all five IDs are listed per browser project; APPOINTMENT-001 skips without any submission.
If the optional listing ID is absent, the read-only scenarios also skip precisely.

- [ ] **Step 3: Run read-only E2E only when the controlled listing is configured**

Check for the key without printing its value. When present, run the read-only file on Chromium.
Record actual pass/fail/skip status. Do not set `RUN_MUTATING_TESTS=true`.

- [ ] **Step 4: Commit**

```powershell
git add -- test-cases/appointments/appointment.test-cases.ts tests/appointments/appointment-booking.mutating.spec.ts tests/appointments/appointment-validation.read-only.spec.ts
git commit -m "test: add appointment booking scenarios"
```

### Task 7: Documentation and traceability

**Files:**

- Modify: `README.md`
- Modify: `docs/traceability/requirements-to-tests.md`

**Interfaces:**

- Produces operational setup, safe commands, locator risks, and requirement mappings.

- [ ] **Step 1: Add exact documentation**

Document both new environment keys, controlled-listing preconditions, default skip behavior,
production blocking, read-only and mutating commands, all five Test Case IDs, and each `BUSINESS
RULE NOT VERIFIED` item from the design. State that the popup lacks dialog semantics and the close
button lacks an accessible name.

- [ ] **Step 2: Verify documentation consistency**

Run `rg` across metadata, specs, README, and traceability for every APPOINTMENT ID and every
unverified rule. Expected: each automated ID maps to one test file and each deferred rule is labeled.

- [ ] **Step 3: Commit**

```powershell
git add -- README.md docs/traceability/requirements-to-tests.md
git commit -m "docs: document appointment coverage"
```

### Task 8: Final verification and audit

**Files:**

- Verify all appointment changes; modify only a file whose focused check exposes a defect.

- [ ] **Step 1: Run focused appointment quality gates**

```powershell
npm run typecheck
npx eslint config/environment.schema.ts config/environment.config.ts config/mutation.policy.ts types/environment.types.ts types/appointment.types.ts test-data/factories/AppointmentDataFactory.ts pages/appointments/AppointmentPage.ts workflows/appointments/AppointmentWorkflow.ts fixtures/appointment.fixture.ts fixtures/mutating.fixture.ts test-cases/appointments/appointment.test-cases.ts tests/unit/config/environment.config.spec.ts tests/unit/config/mutation.policy.spec.ts tests/unit/test-data/AppointmentDataFactory.spec.ts tests/component/support/appointment-form.fixture.ts tests/component/pages/AppointmentPage.spec.ts tests/component/workflows/AppointmentWorkflow.spec.ts tests/component/fixtures/test.fixture.spec.ts tests/appointments/appointment-booking.mutating.spec.ts tests/appointments/appointment-validation.read-only.spec.ts
npx prettier --check config/environment.schema.ts config/environment.config.ts config/mutation.policy.ts types/environment.types.ts types/appointment.types.ts test-data/static/appointment.json test-data/factories/AppointmentDataFactory.ts pages/appointments/AppointmentPage.ts workflows/appointments/AppointmentWorkflow.ts fixtures/appointment.fixture.ts fixtures/mutating.fixture.ts fixtures/test.fixture.ts test-cases/appointments/appointment.test-cases.ts tests/unit/config/environment.config.spec.ts tests/unit/config/mutation.policy.spec.ts tests/unit/test-data/AppointmentDataFactory.spec.ts tests/component/support/appointment-form.fixture.ts tests/component/pages/AppointmentPage.spec.ts tests/component/workflows/AppointmentWorkflow.spec.ts tests/component/fixtures/test.fixture.spec.ts tests/appointments/appointment-booking.mutating.spec.ts tests/appointments/appointment-validation.read-only.spec.ts README.md docs/traceability/requirements-to-tests.md
```

Expected: all focused checks exit 0. Report the pre-existing repository-wide formatting failure and
lint timeout separately if they remain.

- [ ] **Step 2: Run executable framework coverage**

```powershell
npx playwright test tests/unit tests/component --project=framework
```

Expected: all unit and component tests pass with the new appointment coverage included.

- [ ] **Step 3: Prove test discovery and mutation protection**

```powershell
npx playwright test tests/appointments --list
npx playwright test tests/appointments/appointment-booking.mutating.spec.ts --project=chromium --no-deps
```

Expected: appointment tests are discovered; the mutation test skips and creates no appointment.

- [ ] **Step 4: Audit prohibited patterns and repository state**

```powershell
rg -n "waitForTimeout|\.nth\(|\.first\(|\.last\(|xpath=|APPOINTMENT_LISTING_ID\s*=\s*[0-9]|date\s*:\s*['\"]\d{4}-" pages/appointments workflows/appointments fixtures tests/appointments test-data/factories/AppointmentDataFactory.ts
git diff --check HEAD~7
git status --short
```

Expected: no prohibited appointment implementation pattern, no whitespace errors, and no
uncommitted implementation files.

- [ ] **Step 5: Fresh completion verification**

Repeat Steps 1-3 after all commits. Record exact pass/skip/discovery counts. Never claim a live
appointment was created unless the guarded scenario actually ran in dev/staging and passed.

---

## Plan self-review

- [x] Every automated design requirement maps to a task and an exact verification command.
- [x] Every new public type and method used by later tasks is defined earlier.
- [x] Test data contains no static listing ID, date, credential, or production mutation default.
- [x] APPOINTMENT-001 imports only the centralized mutating fixture.
- [x] The required-date scenario is excluded because the verified UI has no blank-date state.
- [x] Owner, duplicate, urgent-timeout, notification, and fault-injection rules remain explicitly
      unverified.
- [x] No task introduces positional locators, arbitrary waits, fragile selectors, or dependent test
      ordering.
