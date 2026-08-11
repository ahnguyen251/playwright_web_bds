# AI-Powered Web Test Automation Framework

Enterprise Playwright + TypeScript framework for automated user testing of the
[Propify](https://propifyy.duckdns.org/) real-estate website.

The current delivery implements the reusable framework foundation, Page Object templates for
Authentication, Profile, Listings, Appointments, and Transactions, plus an executable login smoke
test. Admin operations and destructive production scenarios are outside the current scope.

## Technology stack

- Node.js 20+
- npm
- TypeScript 6 in strict mode
- Playwright Test 1.62
- Chromium, Firefox, and WebKit
- Zod environment validation
- HTML and Allure-ready reporting
- ESLint and Prettier

## Prerequisites

- Git
- Node.js 20 or newer
- npm (included with Node.js)
- Java only when generating or opening Allure reports
- Access to a non-destructive Propify test account supplied through local environment variables

The repository does not contain credentials, browser storage state, generated reports, or installed
dependencies. Keep those files local and ignored.

## Step 1 — Folder structure

```text
config/                       Environment validation and selection
constants/                    Routes, tags, and timeouts
fixtures/                     Auth, Page, Workflow, and BaseTest composition
workflows/                    Reusable business flows
  authentication/
  listings/
  appointments/
  transactions/
pages/                        Page Objects and reusable components
  base/
  components/
  authentication/
  profile/
  listings/
  appointments/
  transactions/
tests/                        Executable scenarios and assertions
  setup/
  unit/
  component/
  authentication/
  profile/
  listings/
  appointments/
  transactions/
test-cases/                   Typed manual test-case metadata
test-data/                    Static data, factories, and upload files
types/                        Shared TypeScript contracts
utils/                        Stateless technical helpers
docs/                         Requirements, AI prompts, and traceability
reporters/                    Allure environment metadata
.auth/                        Generated user storage states (ignored)
playwright-report/            Generated HTML report (ignored)
test-results/                 Screenshots, videos, and traces (ignored)
```

## Step 2 — Folder responsibilities

| Folder                | Responsibility                                                                     |
| --------------------- | ---------------------------------------------------------------------------------- |
| `config`              | Validate all runtime variables and expose one immutable environment configuration. |
| `constants`           | Keep routes, tags, and timeout values centralized.                                 |
| `fixtures`            | Instantiate users, contexts, Page Objects, Workflows, and authentication state.    |
| `workflows`           | Coordinate reusable business flows across Page Objects without selectors.          |
| `pages`               | Own all locators and page/component UI operations.                                 |
| `tests`               | Describe scenarios and perform assertions only.                                    |
| `test-cases`          | Store test IDs, priorities, tags, preconditions, and expected results.             |
| `test-data/static`    | Store deterministic non-secret JSON data.                                          |
| `test-data/factories` | Build independent typed objects for parallel tests.                                |
| `test-data/files`     | Store safe upload fixtures.                                                        |
| `types`               | Define contracts shared by configuration, fixtures, data, Workflows, and tests.    |
| `utils`               | Provide technical helpers without feature business rules.                          |
| `docs`                | Preserve requirements, AI prompts, and requirement-to-test traceability.           |
| `reporters`           | Supply reporting metadata and extension points.                                    |

Dependency direction:

```text
Tests -> Fixtures -> Workflows -> Page Objects -> Playwright
                    |             |
                    +-> Types, Test Data, Constants, Utilities
```

Page Objects never depend on tests, fixtures, or Workflows. Workflows never declare locators.

## Step 3 — Installation and environment configuration

Clone the repository, then install the locked dependency versions and Playwright browsers:

```bash
npm ci
npx playwright install
```

Copy the safe placeholder file to a local `.env`:

```powershell
Copy-Item .env.example .env
```

Select an environment with `TEST_ENV=dev`, `staging`, or `production`. The corresponding URL is
selected from `DEV_BASE_URL`, `STAGING_BASE_URL`, or `PRODUCTION_BASE_URL`. Configuration is
validated before Playwright starts.

Required local credential variables:

```dotenv
DEFAULT_USER_EMAIL=your-test-user@example.com
DEFAULT_USER_PASSWORD=your-local-secret
```

Never add credentials to `users.json`. That file stores aliases and environment-key references
only. Do not replace the placeholders in `.env.example` with real values. `.env`, `.auth`,
Playwright storage state, and generated artifacts are ignored by Git.

## Step 4 — Base classes

- `BasePage` provides shared navigation, current URL, and screenshot behavior.
- Every page-level object inherits `BasePage`.
- `fixtures/test.fixture.ts` exports `BaseTest`, `test`, and `expect`. This is the Playwright-native
  BaseTest composition root; fixture composition replaces inheritance-based test classes.

## Step 5 — Utilities

- `DateHelper`: deterministic UTC date formatting and date arithmetic.
- `RandomDataGenerator`: unique strings, emails, phone numbers, and bounded integers.
- `ScreenshotHelper`: named Playwright attachments.
- `FileUploadHelper`: traversal-safe fixture resolution and uploads.
- `APIHelper`: typed HTTP GET/POST/PUT/DELETE wrappers with status validation.
- `BrowserHelper`: storage-state persistence.

## Step 6 — Fixtures and authentication

`auth.fixture.ts` resolves users from environment variables and can create a context for any user
alias stored in `users.json`. `page.fixture.ts` creates Page Objects. `workflow.fixture.ts` composes
business Workflows. `test.fixture.ts` exposes the complete typed test contract.

The `auth-setup` project signs in through the UI and saves `.auth/defaultUser.json`. Authenticated
browser projects depend on that setup project. Login scenarios override storage state with an empty
state so they always verify the real login flow.

To add another user:

1. Add a safe alias and environment-key names to `test-data/static/users.json`.
2. Add the referenced values to the local `.env` or CI secret store.
3. Request the alias through `contextForUser` in a typed fixture.

## Step 7 — Page Object templates

Implemented templates:

- `LoginPage`, `RegisterPage`, and `ForgotPasswordPage`
- `ProfilePage`
- `ListingListPage`, `ListingDetailPage`, `CreateListingPage`, `EditListingPage`, and
  `MyListingsPage`
- `AppointmentPage`
- `TransactionPage`
- shared `HeaderComponent` and `ListingFormComponent`

All locator declarations live in these Page Objects/components. Prefer accessible roles/names,
labels, and stable placeholders. Use `data-testid` only when the deployed application already
provides a verified stable value; use short semantic CSS only as a documented last resort.

## Step 8 — Current executable coverage

The executable end-to-end scenario is `AUTH-LOGIN-001` in
`tests/authentication/login.spec.ts`. The test:

1. starts without storage state;
2. receives the default user and `AuthenticationWorkflow` from fixtures;
3. calls the Workflow to log in;
4. asserts authenticated state.

It contains no locator, password, or repeated UI logic.

The `framework` project also executes focused unit and browser-component specifications for:

- environment validation;
- safe user and listing test-data factories;
- deterministic date, random-data, and file-path utilities;
- fixture composition;
- login-modal actions and forgot-password navigation;
- atomic multi-file selection in the reusable listing form component.

Profile, Listings, Appointments, and Transactions currently contain reusable Page Object and
Workflow templates only. They do not have executable feature `.spec.ts` files and are not claimed as
automated coverage. The listing-form component specification verifies framework upload behavior; it
is not a Listings business-flow test.

## Step 9 — How the architecture works

A test asks a fixture for a Workflow. The fixture creates that Workflow with the exact Page Objects
it needs. The Workflow expresses the reusable user journey, while Page Objects translate that
journey into UI interactions. Typed data crosses layer boundaries through interfaces. Utilities
remain independent and stateless. This separation lets new feature modules be added without
modifying current tests.

## Playwright projects

| Project      | Purpose                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `framework`  | Unit and focused browser-component specifications.                     |
| `auth-setup` | Creates the default user's local storage state through the login UI.   |
| `chromium`   | Authenticated end-to-end specifications using Desktop Chrome settings. |
| `firefox`    | Authenticated end-to-end specifications using Desktop Firefox.         |
| `webkit`     | Authenticated end-to-end specifications using Desktop Safari settings. |

The three browser projects depend on `auth-setup`. The `framework` project does not. Environment
configuration is validated when Playwright loads, so prepare `.env` before running either category.

## Running quality checks and tests

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:smoke
npm run test:regression
npm run test:chromium
npm run test:headed
npm run test:ui
```

Run only framework tests:

```bash
npx playwright test --project=framework
```

List every discovered project and executable specification without running it:

```bash
npx playwright test --list
```

Run the non-destructive login smoke test:

```bash
npx playwright test tests/authentication/login.spec.ts --project=chromium
```

Run tests in parallel using the configured projects and workers:

```bash
npx playwright test --fully-parallel
```

## Tags

Tests use centralized tag constants:

- `@smoke`
- `@regression`
- `@authentication`
- `@profile`
- `@listings`
- `@appointments`
- `@transactions`

Filter directly with `--grep`, for example:

```bash
npx playwright test --grep @smoke
```

## Diagnostics and reports

- Screenshots: captured only on failure.
- Videos: retained on failure.
- Traces: captured on the first retry.
- HTML report: `playwright-report/`.
- Allure raw results: `allure-results/`.

All report and runtime artifact directories are generated locally and ignored by Git. Do not commit
screenshots, videos, traces, authentication state, or report output.

```bash
npm run report:html
npm run report:allure:generate
npm run report:allure:open
```

Allure CLI requires Java. The framework prepares the reporter and environment metadata; CI history
publishing is intentionally deferred.

## Adding a feature

1. Add or extend domain interfaces under `types/`.
2. Add safe deterministic data or a factory under `test-data/`.
3. Create Page Objects under `pages/<feature>/`; keep every locator there.
4. Create a Workflow under `workflows/<feature>/` for reusable business behavior.
5. Register Pages and Workflows in typed fixtures.
6. Add a test-case ID and traceability mapping.
7. Write test scenarios containing Workflow calls and assertions only.

Future modules can follow the same contract for Chat, Payment, Notification, Admin, API, Visual,
and AI testing. The `docs/prompts` area preserves AI-assisted test-design prompts without coupling
runtime tests to a specific AI provider.

## Known limitations

- Only `AUTH-LOGIN-001` is an executable end-to-end business scenario.
- Profile, Listings, Appointments, and Transactions remain templates without executable feature
  specifications.
- Several template-only controls cannot yet be proven unique against the deployed application,
  including generic comboboxes, the unlabelled listing image input, broad listing heading/row
  matching, and potentially duplicated responsive header controls.
- The deployed authentication modal does not expose a dialog landmark. Its user-facing input and
  button names are currently unique and verified by the Chromium login flow, but the application
  should add correct dialog semantics so Page Objects can scope modal locators reliably.
- The six deployed registration OTP inputs have no unique accessible names and no guaranteed stable
  test IDs. Successful OTP entry remains blocked under the locator policy until Propify deploys a
  unique accessible name for each input. No positional selector or invented test ID is used as a
  workaround. The expected accessibility contract is six textboxes with unique names: `Mã OTP 1`,
  `Mã OTP 2`, `Mã OTP 3`, `Mã OTP 4`, `Mã OTP 5`, and `Mã OTP 6`. Until those names are verified in
  the deployed DOM, `RegisterPage.enterOtp()` throws an explicit accessibility-blocker error without
  interacting with the page.
- Dynamic wrong/expired-OTP feedback has no verified stable unique semantic locator. The framework
  therefore does not add a negative OTP assertion or an automatic resend scenario.
- Registration currently has framework-level configuration, Gmail parsing, polling, and Page Object
  contract coverage only. It is not claimed as executable production registration coverage while
  the OTP accessibility contract remains unresolved.
- Propify does not currently guarantee a stable `data-testid` contract. Page Objects therefore use
  accessible roles, labels, placeholders, and scoped user-facing names where those contracts are
  known.
- Allure publishing and history retention are not configured; only local result generation is
  prepared.
- Destructive create, edit, appointment-submission, payment, and transaction scenarios require a
  dedicated safe environment and cleanup policy before automation.

## Safety

The initial suite does not create or edit listings, submit appointments, perform payments, or mutate
transactions against production. Those Page Objects and Workflows are reusable templates until a
dedicated safe test environment and cleanup policy are configured.
