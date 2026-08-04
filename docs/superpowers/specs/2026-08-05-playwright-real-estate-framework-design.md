# AI-Powered Web Test Automation Framework Design

## 1. Purpose

Build a production-quality Playwright and TypeScript automation framework for the Propify real-estate website at `https://propifyy.duckdns.org/`. The initial automation scope covers user authentication, profile, listings, appointments, and transactions. Admin automation is explicitly excluded.

The first delivery creates the complete enterprise-ready framework, Page Object and workflow templates for the current user scope, and one executable login smoke test. The architecture must allow later Chat, Payment, Notification, Admin, API, Visual, and AI testing modules without changing existing test contracts.

## 2. Technology and quality constraints

- Node.js 20 or newer, npm, TypeScript, Playwright Test, and Playwright-supported browsers.
- TypeScript strict mode and explicit domain contracts.
- Async APIs use `async`/`await`.
- No locators or reusable business logic in test specifications.
- Page Objects own UI locators and page-level interactions.
- Workflows coordinate reusable business operations across Page Objects.
- Fixtures compose Playwright contexts, Pages, Workflows, users, and authentication states.
- Shared logic is dependency-directed and follows SOLID and DRY principles.
- Runtime secrets are loaded from environment variables and never committed.
- Generated authentication state, reports, screenshots, videos, and traces are ignored by Git.

## 3. Architecture

The selected approach is a pragmatic Clean Page Object Model. Dependencies flow in one direction:

```text
Test scenarios
  -> typed fixtures
  -> workflows
  -> Page Objects and components
  -> Playwright browser API

Cross-cutting dependencies:
  config, constants, types, test data, and stateless utilities
```

Tests may call a Page Object directly for a single page-level action, but any reusable or multi-page business operation belongs in a Workflow. Page Objects cannot depend on tests, fixtures, or Workflows. Workflows cannot declare locators. Utilities cannot depend on business modules.

`fixtures/test.fixture.ts` is the BaseTest composition root. It extends Playwright's native fixture-based `test`, exports `test` and `expect`, and provides strongly typed Page Objects and Workflows. The framework deliberately avoids inheritance-based test classes because Playwright Test uses fixture composition for isolation and parallelism. `BasePage` remains the shared superclass for Page Objects.

## 4. Folder structure

```text
/
|-- config/
|   |-- environment.config.ts
|   `-- environment.schema.ts
|-- constants/
|   |-- routes.ts
|   |-- tags.ts
|   `-- timeouts.ts
|-- fixtures/
|   |-- auth.fixture.ts
|   |-- page.fixture.ts
|   |-- workflow.fixture.ts
|   `-- test.fixture.ts
|-- workflows/
|   |-- authentication/AuthenticationWorkflow.ts
|   |-- listings/ListingWorkflow.ts
|   |-- appointments/AppointmentWorkflow.ts
|   `-- transactions/TransactionWorkflow.ts
|-- pages/
|   |-- base/BasePage.ts
|   |-- components/HeaderComponent.ts
|   |-- components/ListingFormComponent.ts
|   |-- authentication/LoginPage.ts
|   |-- authentication/RegisterPage.ts
|   |-- authentication/ForgotPasswordPage.ts
|   |-- profile/ProfilePage.ts
|   |-- listings/ListingListPage.ts
|   |-- listings/ListingDetailPage.ts
|   |-- listings/CreateListingPage.ts
|   |-- listings/EditListingPage.ts
|   |-- listings/MyListingsPage.ts
|   |-- appointments/AppointmentPage.ts
|   `-- transactions/TransactionPage.ts
|-- tests/
|   |-- setup/auth.setup.ts
|   |-- authentication/login.spec.ts
|   |-- profile/
|   |-- listings/
|   |-- appointments/
|   `-- transactions/
|-- test-cases/
|   |-- authentication/
|   |-- listings/
|   |-- appointments/
|   `-- transactions/
|-- test-data/
|   |-- static/users.json
|   |-- static/listing.json
|   |-- static/appointment.json
|   |-- factories/UserDataFactory.ts
|   |-- factories/ListingDataFactory.ts
|   `-- files/listing-images/
|-- types/
|   |-- environment.types.ts
|   |-- user.types.ts
|   |-- listing.types.ts
|   |-- appointment.types.ts
|   |-- transaction.types.ts
|   `-- test-case.types.ts
|-- utils/
|   |-- APIHelper.ts
|   |-- BrowserHelper.ts
|   |-- DateHelper.ts
|   |-- FileUploadHelper.ts
|   |-- RandomDataGenerator.ts
|   `-- ScreenshotHelper.ts
|-- docs/
|   |-- requirements/
|   |-- prompts/
|   `-- traceability/
|-- reporters/allure-environment.ts
|-- .auth/
|-- playwright-report/
|-- test-results/
|-- .env.example
|-- .gitignore
|-- package.json
|-- playwright.config.ts
|-- README.md
`-- tsconfig.json
```

## 5. Folder responsibilities

- `config`: validate environment variables and expose one immutable runtime configuration object.
- `constants`: centralize routes, tags, and framework timeout values.
- `fixtures`: construct isolated browser contexts, Page Objects, Workflows, user identities, and authentication state.
- `workflows`: implement reusable business flows without selectors or assertions.
- `pages/base`: provide common navigation, waiting, URL, and safe interaction behavior.
- `pages/components`: model reusable UI regions shared across pages.
- `pages/<feature>`: own locators and feature-specific UI operations.
- `tests`: contain Playwright scenarios and assertions only. `tests/setup` creates reusable storage states.
- `test-cases`: store typed, human-readable case metadata and traceability identifiers independently from executable test code.
- `test-data/static`: store committed, non-sensitive deterministic test data.
- `test-data/factories`: create valid typed runtime data without duplicating object construction.
- `test-data/files`: contain safe upload fixtures.
- `types`: define contracts shared across configuration, data, fixtures, Workflows, and tests.
- `utils`: provide stateless technical helpers with no feature-specific business rules.
- `docs/requirements`: document project requirements and scope.
- `docs/prompts`: preserve AI-related prompt artifacts for graduation-project traceability.
- `docs/traceability`: map requirements and test-case IDs to executable specifications.
- `reporters`: prepare Allure environment metadata and future reporting extensions.
- `.auth`: contain per-user Playwright storage-state files and remain ignored by Git.
- `playwright-report`: contain generated HTML reports and remain ignored by Git.
- `test-results`: contain generated traces, videos, screenshots, and failure artifacts and remain ignored by Git.

## 6. Propify application model

The design is based on read-only inspection of the deployed application:

- Home: `/`
- Sale listings: `/sales`
- Rental listings: `/rent`
- Listing detail: `/listings/:id`
- Account profile: `/profile`
- My listings: `/profile?tab=listings`
- Appointments: `/profile?tab=appointments`
- Favorites: `/profile?tab=favorites`
- Viewed listings: `/profile?tab=viewed`
- Transactions: `/profile?tab=transactions`

Authentication is presented as a modal opened from the home-page header. The login Page Object therefore models the modal rather than assuming a standalone `/login` route. `HeaderComponent` owns shared header navigation, login, account-menu, and logout controls. Profile-feature Page Objects own only the selected profile tab and its content.

## 7. Page Object design

`BasePage` receives Playwright's `Page` through constructor injection and provides protected, reusable primitives such as navigation, URL verification, document readiness, and page screenshots. It does not contain feature locators.

Every concrete Page Object:

- declares locators as private or readonly instance properties;
- exposes intent-based methods such as `submitCredentials`, `searchListings`, or `filterTransactions`;
- returns observable data or another Page Object when navigation changes the user context;
- never embeds user credentials or fixed test data;
- never performs test assertions;
- uses stable selectors in this order: `data-testid`, stable attributes, exact routes, accessible roles and names, then scoped CSS.

`HeaderComponent` is composed into pages that need global navigation. `ListingFormComponent` is composed into both create and edit listing pages to prevent duplicated form logic.

## 8. Workflow design

- `AuthenticationWorkflow`: open the login modal, submit a typed user credential, wait for authenticated UI, and expose a logout flow.
- `ListingWorkflow`: search/filter listings and coordinate create/edit flows through the relevant Page Objects.
- `AppointmentWorkflow`: open a listing, enter appointment information, and coordinate appointment views without embedding selectors.
- `TransactionWorkflow`: navigate to transaction history and apply typed search, date, and status filters.

Workflows accept dependencies through constructors. They return Page Objects or typed results and do not contain assertions, environment reads, or raw Playwright selectors.

## 9. Configuration and environments

`TEST_ENV` selects `dev`, `staging`, or `production`. Environment URLs use separate variables:

- `DEV_BASE_URL`
- `STAGING_BASE_URL`
- `PRODUCTION_BASE_URL`

The committed `.env.example` documents safe placeholders. A local `.env` contains the supplied Propify user credential through named variables such as `DEFAULT_USER_EMAIL` and `DEFAULT_USER_PASSWORD`; `.env` is ignored. `environment.schema.ts` validates the selected environment, URL format, user credential presence, and optional API URL before Playwright starts.

`playwright.config.ts` imports the validated configuration and defines:

- an `auth-setup` project;
- authenticated Chromium, Firefox, and WebKit projects depending on `auth-setup`;
- configurable workers and retries for local and CI use;
- `fullyParallel` execution;
- HTML and list reporters;
- Allure reporter preparation;
- screenshot `only-on-failure`;
- video `retain-on-failure`;
- trace `on-first-retry`;
- artifact output under `test-results`.

## 10. Authentication and multiple users

`users.json` stores safe user aliases, display metadata, and the environment-variable names that supply credentials. It never stores real passwords. Typed user resolution validates that each requested alias has an email and password in the environment.

`tests/setup/auth.setup.ts` authenticates each configured user through the UI and writes `.auth/<user-alias>.json`. Authenticated projects reuse the default user's state. `auth.fixture.ts` can create a fresh context with another named user's state for multi-user tests. Tests that verify login behavior opt out of storage state and start unauthenticated.

An authentication-state failure reports the user alias and missing configuration key but never prints secret values.

## 11. Test data and typing

- `users.json`: safe user aliases and environment-key references.
- `listing.json`: deterministic listing-search and listing-form samples.
- `appointment.json`: deterministic appointment scenarios.
- `UserDataFactory`: resolve or generate typed non-secret user profiles.
- `ListingDataFactory`: merge valid defaults with typed per-test overrides.

JSON imports are checked against TypeScript interfaces at the fixture/factory boundary. Factories create independent objects to prevent shared mutable state during parallel execution.

## 12. Utilities

- `DateHelper`: deterministic formatting, parsing, and relative-date operations.
- `RandomDataGenerator`: unique strings, emails, phone numbers, and numeric values using optional prefixes.
- `ScreenshotHelper`: consistently named attachments integrated with Playwright `testInfo`.
- `FileUploadHelper`: validate fixture paths and upload through Playwright file inputs.
- `APIHelper`: typed HTTP requests through Playwright `APIRequestContext`, with safe status and JSON handling.
- `BrowserHelper`: browser/context operations such as storage-state management, controlled viewport helpers, and page readiness.

Utilities use static methods only when no dependency or state is needed. Injectable wrappers are used when Playwright contexts are required.

## 13. Test design and tagging

The initial executable sample is a login smoke test. It starts unauthenticated, resolves the default user through fixtures, calls `AuthenticationWorkflow.login`, and asserts authenticated header state. The specification contains no locator or credential literal.

Tags are centralized in `constants/tags.ts` and used in test titles or Playwright tag metadata. The required commands support:

- all tests;
- smoke tests via `--grep @smoke`;
- regression tests via `--grep @regression`;
- one browser project;
- fully parallel multi-browser execution;
- headed debugging and Playwright UI mode.

Technical utility behavior is covered with focused Playwright Test unit specifications where it adds meaningful confidence. End-to-end tests remain isolated, avoid ordering dependencies, and do not mutate production data in the initial delivery.

## 14. Error handling and diagnostics

- Configuration errors fail before browser launch and identify only missing key names.
- Page methods wait for observable UI states rather than fixed sleeps.
- Failed actions are rethrown with feature context while preserving the original error cause.
- Workflows do not swallow errors or convert test failures into booleans.
- Screenshots, video, and traces are retained according to Playwright policy.
- Test output and reports must not log passwords, storage-state contents, or authorization headers.
- Destructive listing, appointment, and transaction actions are represented only as templates in the first delivery and are not executed against production.

## 15. Reporting and CI readiness

HTML reporting is immediately usable. Allure packages, reporter configuration, result directory, and environment writer are prepared, but publishing and history retention are deferred to the later CI/CD module. Scripts expose type checking, test execution, smoke/regression filtering, report opening, and Allure generation/opening.

The repository is CI-ready through deterministic npm scripts, environment-driven secrets, ignored artifacts, multi-browser projects, and no dependency on a developer-specific filesystem path.

## 16. Documentation deliverables

The README documents prerequisites, installation, browser installation, local environment setup, architecture, folder responsibilities, test data rules, authentication-state generation, execution commands, reports, debugging, adding a Page Object, adding a Workflow, adding a user, and future extension points.

Requirement and traceability documents map the graduation-project requirements to framework artifacts and the login test-case identifier.

## 17. Acceptance criteria

The delivery is accepted when:

1. The requested and revised folders and files exist, including all originally required utility classes.
2. TypeScript compiles with strict mode and no errors.
3. Playwright lists the setup and three browser projects successfully.
4. Unit-level framework tests pass.
5. The login smoke test is runnable against Propify using local environment credentials.
6. Login test code contains scenarios and assertions but no locators, credentials, or reusable business logic.
7. All locators exist only in Page Objects or Page components.
8. Authentication state is created under `.auth` and excluded from Git.
9. HTML reporting works and Allure is structurally prepared.
10. README and traceability documentation explain the complete architecture and extension workflow.

## 18. Non-goals

- Admin features.
- CI provider configuration or deployment pipelines.
- Publishing Allure history to an external service.
- Executing destructive listing, appointment, payment, or transaction scenarios against production.
- Implementing Chat, Payment, Notification, API suites, Visual suites, or AI-generated test execution in the initial delivery.
