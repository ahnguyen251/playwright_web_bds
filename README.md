# AI-Powered Web Test Automation Framework

Enterprise Playwright + TypeScript framework for automated user testing of the
[Propify](https://propifyy.duckdns.org/) real-estate website.

The current delivery implements the reusable framework foundation, Page Object templates for
Authentication, Profile, Listings, Appointments, and Transactions, plus an executable login smoke
test. Admin operations and destructive production scenarios are outside the current scope.

## Technology

- Node.js 20+
- npm
- TypeScript 6 in strict mode
- Playwright Test 1.62
- Chromium, Firefox, and WebKit
- Zod environment validation
- HTML and Allure-ready reporting
- ESLint and Prettier

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

## Step 3 — Configuration

Install dependencies and the required browsers:

```bash
npm install
npx playwright install
```

Create a local environment file:

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
only. `.env` and `.auth` are ignored by Git.

## Step 4 — Base classes

- `BasePage` provides shared navigation, readiness, current URL, and screenshot behavior.
- Every page-level object inherits `BasePage`.
- `fixtures/test.fixture.ts` exports `BaseTest`, `test`, and `expect`. This is the Playwright-native
  BaseTest composition root; fixture composition replaces inheritance-based test classes.

## Step 5 — Utilities

- `DateHelper`: deterministic UTC date formatting and date arithmetic.
- `RandomDataGenerator`: unique strings, emails, phone numbers, and bounded integers.
- `ScreenshotHelper`: named Playwright attachments.
- `FileUploadHelper`: traversal-safe fixture resolution and uploads.
- `APIHelper`: typed HTTP GET/POST/PUT/DELETE wrappers with status validation.
- `BrowserHelper`: page readiness and storage-state persistence.

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

All locator declarations live in these Page Objects/components. Prefer `data-testid`, stable
attributes, stable routes, accessible roles/names, and finally scoped CSS.

## Step 8 — Sample login test

The executable scenario is `AUTH-LOGIN-001` in `tests/authentication/login.spec.ts`. The test:

1. starts without storage state;
2. receives the default user and `AuthenticationWorkflow` from fixtures;
3. calls the Workflow to log in;
4. asserts authenticated state.

It contains no locator, password, or repeated UI logic.

## Step 9 — How the architecture works

A test asks a fixture for a Workflow. The fixture creates that Workflow with the exact Page Objects
it needs. The Workflow expresses the reusable user journey, while Page Objects translate that
journey into UI interactions. Typed data crosses layer boundaries through interfaces. Utilities
remain independent and stateless. This separation lets new feature modules be added without
modifying current tests.

## Running tests

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

## Safety

The initial suite does not create or edit listings, submit appointments, perform payments, or mutate
transactions against production. Those Page Objects and Workflows are reusable templates until a
dedicated safe test environment and cleanup policy are configured.
