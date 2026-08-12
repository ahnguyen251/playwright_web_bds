# Appointment Booking Module Design

## 1. Purpose

Build production-quality Playwright and TypeScript automation for Propify UC-18, appointment
booking, while preserving the repository's existing dependency direction:

```text
Test -> Fixture -> AppointmentWorkflow -> Page Objects -> Playwright
```

The module must prove the user-facing booking journey, protect live data, use only verified business
rules and UI behavior, and provide boundaries that can later support viewing, confirming, rejecting,
and cancelling appointments.

## 2. Authoritative evidence

The design uses the following sources, in priority order:

1. `document/NghiepvuPropify.pdf`, pages 25-26, UC-18;
2. `document/BẤT ĐỘNG SẢN - PRODUCT BACKLOG.pdf`, backlog items 13-17;
3. the deployed Propify appointment form inspected read-only on 2026-08-11;
4. the deployed `AppointmentBookingPopup` and appointment service bundles inspected read-only on
   2026-08-11;
5. the existing Playwright framework code and documentation in this repository.

The deployed form verified these observable contracts:

- the detail-page action is `Đặt lịch xem nhà`;
- the form heading is `Đặt lịch xem nhà`;
- dates and time slots are buttons with user-facing accessible names;
- the first available date is selected by application state, so the UI has no observable blank-date
  state;
- a time slot must be selected before submission is enabled;
- contact inputs use the placeholders `Họ và tên *`, `Số điện thoại *`, `Email *`, and `Ghi chú`;
- phone numbers must match `^0[235789]\d{8}$`;
- email addresses must end with `@gmail.com`;
- notes have a 1000-character maximum;
- the success heading is `Đặt lịch thành công!` and the booking popup subsequently closes.

## 3. Scope

### Automated scope

- open an eligible published listing as an authenticated non-owner;
- open the appointment form;
- explicitly select an available date and time;
- enter valid contact data and an optional note;
- submit a booking only behind the mutation guard;
- assert the success confirmation and popup closure with web-first assertions;
- assert non-mutating, observable validation behavior for required time, required name, Vietnamese
  phone format, and Gmail-only email format;
- verify immutable appointment data creation, environment parsing, mutation policy, fixture
  composition, Page Object interactions, Workflow orchestration, test discovery, and traceability.

### Documented but not automated

The following are `BUSINESS RULE NOT VERIFIED` for deterministic automation in this delivery:

- **Required appointment date:** the current UI always has a first date selected and exposes no
  blank-date state. A required-date test would fabricate behavior.
- **Booking one's own listing:** UC-18 specifies rejection, but the repository has no controlled
  owner listing and user pair for a repeatable assertion.
- **Duplicate unfinished appointment:** UC-18 specifies rejection, but the repository has no
  resettable appointment seed or cleanup contract.
- **Urgent booking timeout:** UC-18 describes a shortened confirmation timeout but the current form
  exposes no observable timeout value.
- **Notification delivery to both parties:** no deterministic notification fixture or mailbox
  contract exists.
- **Network/server failure:** no sanctioned fault-injection layer exists.

These rules remain traceable in documentation and are not represented as passing tests.

## 4. Architecture

### Types

`types/appointment.types.ts` will separate:

- contact input;
- an appointment option preference, either `exact` or `earliest-available`;
- a complete appointment request;
- the date and time labels resolved by the Workflow;
- existing appointment view and status types reserved for future lifecycle flows.

The discriminated preference type avoids magic strings and lets deterministic component tests use
exact labels while environment-facing E2E tests choose an actually available option.

### Test data

`AppointmentDataFactory` will build a new frozen object per call. It will:

- receive the eligible listing ID from runtime configuration;
- generate a valid Vietnamese phone through the existing random-data utility;
- generate a collision-resistant Gmail address accepted by the observed UI;
- use `earliest-available` date and time preferences by default;
- accept typed overrides for focused validation scenarios;
- retain a safe optional note from static data without storing credentials, dates, slots, or listing
  IDs in JSON.

### Page Object

`AppointmentPage` will own every appointment-form locator and direct interaction. It will use:

- `getByRole()` for the form heading, date buttons, time buttons, submission button, and success
  heading;
- `getByPlaceholder()` for the four verified form fields;
- exact text for verified validation messages.

Date options will be matched by their normalized accessible-name pattern, and time slots by their
`HH:mm - HH:mm` accessible-name pattern. The Page Object may collect those semantic option labels,
but it will select the chosen option again by exact accessible name. It will not use `first()`,
`last()`, `nth()`, XPath, dynamic classes, or arbitrary sleeps.

The deployed popup lacks `role="dialog"`, and its icon-only close button lacks an accessible name.
Those are recorded locator risks. The automation does not use the close button. Globally resolved
form controls are acceptable only because the live page and component fixture verify their names are
unique.

The Page Object will expose stable Locator properties for business assertions, including the form
heading, submit control, success heading, and verified field errors. Assertions remain in tests.

### Workflow

`AppointmentWorkflow` will orchestrate:

1. listing-detail navigation;
2. appointment-form opening;
3. preference resolution against options returned by the Page Object;
4. explicit date and time selection;
5. contact and optional-note entry;
6. submission.

The Workflow will return the exact resolved date and time labels from preparation. It will also offer
a preparation path that deliberately omits time for the read-only required-time scenario. It will
contain no selectors and no assertions.

### Fixtures

`fixtures/appointment.fixture.ts` will initialize appointment test data from the environment and the
factory. It will not navigate, select options, submit forms, or contain appointment business logic.
If `APPOINTMENT_LISTING_ID` is absent, only E2E appointment scenarios that require the controlled
listing will skip with a precise reason; unit and component tests remain runnable.

Existing page and workflow fixtures will continue to construct `AppointmentPage` and
`AppointmentWorkflow`. `fixtures/test.fixture.ts` will export the final appointment-aware BaseTest
composition.

### Mutation safety

The framework currently has no executable mutation guard. The design adds:

- `RUN_MUTATING_TESTS=false` by default;
- optional `APPOINTMENT_LISTING_ID` configuration;
- a pure mutation-policy function covered by unit tests;
- `fixtures/mutating.fixture.ts`, an automatic guard fixture used only by mutating specs.

A mutating test may run only when both conditions are true:

1. `RUN_MUTATING_TESTS=true`;
2. `TEST_ENV` is `dev` or `staging`.

Production is always blocked, even if the opt-in flag is accidentally set. The guarded success spec
will be proven to skip by default and will not be executed with the opt-in flag against the current
production target.

## 5. Data flow

```text
Environment configuration
  -> Appointment fixture
  -> AppointmentDataFactory
  -> AppointmentWorkflow.prepareAppointment()
  -> ListingDetailPage.open()/openAppointmentForm()
  -> AppointmentPage option discovery and exact selection
  -> AppointmentPage contact entry
  -> AppointmentWorkflow.submitPreparedAppointment()
  -> AppointmentPage success Locator
  -> Playwright web-first assertions in the test
```

No credentials enter test data. No static date, slot, or listing identifier is embedded in source.

## 6. Test scenarios and traceability

| Test Case ID      | Scenario                                        | Classification              | Evidence                                    |
| ----------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------- |
| `APPOINTMENT-001` | Create an appointment successfully              | Mutating E2E, guarded       | UC-18 main flow and deployed success dialog |
| `APPOINTMENT-002` | Submission remains disabled without a time slot | Read-only E2E and component | Deployed submit predicate                   |
| `APPOINTMENT-003` | Contact name is required                        | Read-only E2E and component | Deployed field error                        |
| `APPOINTMENT-004` | Vietnamese phone format is required             | Read-only E2E and component | Deployed regex and field error              |
| `APPOINTMENT-005` | Gmail email address is required                 | Read-only E2E and component | Deployed regex and field error              |

Test titles will be generated from immutable test-case metadata and include the ID plus centralized
appointment tags. Documentation will map each ID to the requirement, implementation files, and
automated evidence.

## 7. Reliability strategy

- Playwright auto-waiting for interactions;
- web-first Locator assertions in test files;
- exact semantic locators based on verified live labels;
- environment-provided controlled listing state;
- earliest-available selection resolved from current UI options rather than an expiring date;
- independently generated contact data for each test;
- no fixed timeout, positional locator, selector fallback, dependent test ordering, or shared created
  record;
- component fixtures that reproduce the verified modal contract without calling Propify APIs;
- unit coverage for data generation, configuration, and mutation policy;
- Chromium-only live execution for focused verification, with cross-browser discovery retained by
  the existing Playwright projects.

## 8. Error handling and reporting

- Missing `APPOINTMENT_LISTING_ID` produces a precise E2E skip, not an invented default.
- A blocked mutation produces a precise skip explaining the flag or production restriction.
- No available date or time causes the Workflow to throw a descriptive preparation error before
  submission.
- Server rejection remains visible through the deployed failure dialog; scenarios needing a
  deterministic server rejection stay documented until controlled state exists.
- Failed or unexecuted E2E tests will be reported with their real status. Test discovery, component
  success, or a default skip will not be described as a successful live booking.

## 9. Extension path

Future appointment lifecycle work will extend the same slice:

- list and card observations remain in `AppointmentPage` or focused appointment components;
- lifecycle orchestration remains in `AppointmentWorkflow`;
- controlled owner/guest aliases and seeded bookings remain fixture dependencies;
- confirm, reject, and cancel mutations reuse the centralized mutation guard;
- new statuses reuse the existing typed status union after it is reconciled with observed UI labels.

No redesign of test, fixture, workflow, Page Object, or safety boundaries is required.

## 10. Acceptance criteria

The design is implemented when:

- appointment Page Object, Workflow, fixture, data factory, types, metadata, and tests exist;
- the mutating success scenario is discoverable and skips by default;
- read-only validation coverage executes when a controlled listing is configured;
- unit and component appointment tests pass;
- TypeScript compilation succeeds;
- appointment tests are discoverable across configured browser projects;
- focused appointment files pass lint and formatting checks;
- no prohibited sleep or locator workaround is introduced;
- traceability, `BUSINESS RULE NOT VERIFIED` entries, and locator risks are documented;
- all live executions and skips are reported accurately.
