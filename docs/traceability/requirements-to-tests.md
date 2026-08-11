# Requirements-to-Tests Traceability

| Requirement                  | Implementation evidence                       | Automated evidence                             |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Strict environment selection | `config/environment.*`                        | `tests/unit/config/environment.config.spec.ts` |
| Safe credential indirection  | `UserDataFactory`, `users.json`, `.gitignore` | `UserDataFactory.spec.ts`                      |
| Independent typed data       | `ListingDataFactory`                          | `ListingDataFactory.spec.ts`                   |
| Reusable utilities           | `utils/*`                                     | `tests/unit/utils/*`                           |
| Locator ownership            | `pages/*`, ESLint restricted syntax           | `npm run lint`                                 |
| Base Page inheritance        | `pages/base/BasePage.ts`                      | strict TypeScript compilation                  |
| BaseTest fixture composition | `fixtures/test.fixture.ts`                    | `test.fixture.spec.ts`                         |
| Modal login behavior         | `LoginPage`, `AuthenticationWorkflow`         | `LoginPage.spec.ts`                            |
| Authentication state         | `tests/setup/auth.setup.ts`                   | `auth-setup` Playwright project                |
| Multi-browser support        | `playwright.config.ts`                        | `npx playwright test --list`                   |
| Login smoke coverage         | `AUTH-LOGIN-001`                              | `tests/authentication/login.spec.ts`           |
| Mutation protection          | `config/mutation.policy.ts`, mutating fixture | `mutation.policy.spec.ts`, default skip proof  |
| Appointment data isolation   | `AppointmentDataFactory`                      | `AppointmentDataFactory.spec.ts`               |
| Appointment popup contract   | `AppointmentPage`                             | `AppointmentPage.spec.ts`                      |
| Appointment orchestration    | `AppointmentWorkflow`                         | `AppointmentWorkflow.spec.ts`                  |
| HTML and Allure reporting    | Playwright reporters                          | generated ignored report directories           |

## Appointment Booking - UC-18

| Test Case ID      | Requirement / observable rule                                                         | Classification                | Automated evidence                                                    |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `APPOINTMENT-001` | Authenticated non-owner creates a valid appointment for an eligible published listing | Mutating E2E; default blocked | `tests/appointments/appointment-booking.mutating.spec.ts`             |
| `APPOINTMENT-002` | A time slot is required before submission is enabled                                  | Read-only E2E and component   | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts` |
| `APPOINTMENT-003` | Contact name is required                                                              | Read-only E2E and component   | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts` |
| `APPOINTMENT-004` | Phone must match the deployed Vietnamese format                                       | Read-only E2E and component   | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts` |
| `APPOINTMENT-005` | Email must use the deployed Gmail format                                              | Read-only E2E and component   | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts` |

Every E2E title is generated from `test-cases/appointments/appointment.test-cases.ts` and includes
the Test Case ID plus centralized tags. `APPOINTMENT-001` imports only the automatic mutating fixture.

## Appointment business rules not verified

The following items are intentionally labeled `BUSINESS RULE NOT VERIFIED` rather than represented
as passing automation:

- **Required appointment date - BUSINESS RULE NOT VERIFIED:** the deployed UI selects the first
  available date by default and has no observable blank-date state.
- **Booking one's own listing - BUSINESS RULE NOT VERIFIED:** no controlled owner listing/user pair
  is configured.
- **Duplicate unfinished appointment - BUSINESS RULE NOT VERIFIED:** no resettable booking seed or
  cleanup contract exists.
- **Urgent booking timeout - BUSINESS RULE NOT VERIFIED:** UC-18 describes the timeout, but the UI
  exposes no observable timeout value.
- **Notification delivery - BUSINESS RULE NOT VERIFIED:** no deterministic notification or mailbox
  fixture exists.
- **Network/server failure - BUSINESS RULE NOT VERIFIED:** no sanctioned fault-injection layer
  exists.

## Appointment locator risks

- The deployed appointment popup has no `role="dialog"`, so it cannot be scoped by dialog semantics.
- The popup's icon-only close button has no accessible name. Automation does not use that control.
- Verified unique role names and placeholders are used globally until the application supplies a
  semantic dialog boundary.

## Future traceability

Profile, Listings lifecycle operations, Appointment view/confirm/reject/cancel, and Transactions
currently provide implementation templates. Add a test-case ID and automated evidence row when each
scenario receives controlled state and safe execution policy.
