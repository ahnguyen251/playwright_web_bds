# Playwright Real-Estate Automation Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a strict TypeScript, multi-environment, multi-browser Playwright framework for Propify with typed fixtures, clean Page Objects, reusable Workflows, authentication state, diagnostics, reports, documentation, and one executable login smoke scenario.

**Architecture:** Tests depend on typed fixtures, fixtures compose Workflows and Page Objects, Workflows coordinate business flows, and Page Objects exclusively own locators and UI operations. Configuration, types, safe test data, and stateless utilities are cross-cutting dependencies with no upward dependency on tests or Workflows.

**Tech Stack:** Node.js 20+, npm, TypeScript 5, Playwright Test, dotenv, Zod, Allure Playwright, ESLint, Prettier.

## Global Constraints

- Target application: `https://propifyy.duckdns.org/`.
- Initial modules: authentication, profile, listings, appointments, and transactions.
- Admin features are excluded.
- Tests contain scenarios and assertions only; no locators, credentials, or reusable business logic.
- Every locator is declared in a Page Object or Page component.
- Credentials come from ignored environment files; committed JSON contains no password.
- Chromium, Firefox, and WebKit projects must be supported.
- Screenshot is `only-on-failure`, video is `retain-on-failure`, and trace is `on-first-retry`.
- HTML reporting is active and Allure reporting is prepared.
- Destructive scenarios must not run against production in this delivery.

---

## File map

- `package.json`: dependencies and execution/reporting scripts.
- `tsconfig.json`: strict TypeScript compiler contract.
- `playwright.config.ts`: projects, environments, authentication dependency, retries, parallelism, artifacts, and reporters.
- `.env.example`: documented safe runtime variables.
- `.gitignore`: secret, authentication, report, and artifact exclusions.
- `config/*`: validated environment selection.
- `constants/*`: routes, tags, and timeout constants.
- `types/*`: domain and fixture data contracts.
- `test-data/static/*`: non-secret deterministic JSON data.
- `test-data/factories/*`: typed data construction and environment credential resolution.
- `utils/*`: stateless technical utilities.
- `pages/base/*`: common Page Object behavior.
- `pages/components/*`: reusable header and listing form controls.
- `pages/<feature>/*`: feature-specific locators and interactions.
- `workflows/*`: reusable user business flows.
- `fixtures/*`: Page, Workflow, auth, and BaseTest fixture composition.
- `tests/setup/auth.setup.ts`: storage-state generation.
- `tests/authentication/login.spec.ts`: sample smoke scenario.
- `test-cases/*` and `docs/*`: test metadata, requirements, prompts, and traceability.
- `reporters/allure-environment.ts`: Allure environment properties.

### Task 1: Foundation, package scripts, and validated environment configuration

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `config/environment.schema.ts`
- Create: `config/environment.config.ts`
- Create: `types/environment.types.ts`
- Create: `constants/routes.ts`
- Create: `constants/tags.ts`
- Create: `constants/timeouts.ts`
- Test: `tests/unit/config/environment.config.spec.ts`

**Interfaces:**

- Produces: `TestEnvironment = 'dev' | 'staging' | 'production'`.
- Produces: `EnvironmentConfig` with `environment`, `baseUrl`, `apiBaseUrl`, `defaultUserEmail`, `defaultUserPassword`, and `ci`.
- Produces: `loadEnvironmentConfig(source?: NodeJS.ProcessEnv): EnvironmentConfig`.
- Produces: immutable `ROUTES`, `TAGS`, and `TIMEOUTS` constants.

- [ ] **Step 1: Create the npm and TypeScript test foundation**

Create scripts for `typecheck`, `lint`, `format:check`, `test`, `test:smoke`, `test:regression`, `test:chromium`, `test:headed`, `test:ui`, `report:html`, `report:allure:generate`, and `report:allure:open`. Configure `module` and `moduleResolution` as `NodeNext`, `strict: true`, `resolveJsonModule: true`, and `noEmit: true`.

- [ ] **Step 2: Write the failing environment tests**

```ts
import { expect, test } from '@playwright/test';
import { loadEnvironmentConfig } from '../../../config/environment.config';

test('selects the dev base URL', () => {
  const config = loadEnvironmentConfig({
    TEST_ENV: 'dev',
    DEV_BASE_URL: 'https://dev.example.test',
    STAGING_BASE_URL: 'https://staging.example.test',
    PRODUCTION_BASE_URL: 'https://production.example.test',
    DEFAULT_USER_EMAIL: 'user@example.test',
    DEFAULT_USER_PASSWORD: 'secret-value',
  });

  expect(config.environment).toBe('dev');
  expect(config.baseUrl).toBe('https://dev.example.test');
});

test('rejects an unsupported environment', () => {
  expect(() =>
    loadEnvironmentConfig({
      TEST_ENV: 'qa',
      DEV_BASE_URL: 'https://dev.example.test',
      STAGING_BASE_URL: 'https://staging.example.test',
      PRODUCTION_BASE_URL: 'https://production.example.test',
      DEFAULT_USER_EMAIL: 'user@example.test',
      DEFAULT_USER_PASSWORD: 'secret-value',
    }),
  ).toThrow(/TEST_ENV/);
});
```

- [ ] **Step 3: Run the environment test and verify RED**

Run: `npm test -- tests/unit/config/environment.config.spec.ts`

Expected: FAIL because `config/environment.config.ts` does not exist.

- [ ] **Step 4: Implement the typed environment loader and constants**

Use a Zod schema to validate `TEST_ENV`, all three absolute URL variables, required default-user credentials, optional `API_BASE_URL`, and `CI`. Select exactly one base URL from the validated environment and return a frozen `EnvironmentConfig`. Define exact Propify routes and centralized tag/timeout constants.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- tests/unit/config/environment.config.spec.ts`

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore config constants types/environment.types.ts tests/unit/config/environment.config.spec.ts
git commit -m "feat: add validated framework configuration"
```

### Task 2: Typed test data and factories

**Files:**

- Create: `types/user.types.ts`
- Create: `types/listing.types.ts`
- Create: `types/appointment.types.ts`
- Create: `types/transaction.types.ts`
- Create: `types/test-case.types.ts`
- Create: `test-data/static/users.json`
- Create: `test-data/static/listing.json`
- Create: `test-data/static/appointment.json`
- Create: `test-data/factories/UserDataFactory.ts`
- Create: `test-data/factories/ListingDataFactory.ts`
- Test: `tests/unit/test-data/UserDataFactory.spec.ts`
- Test: `tests/unit/test-data/ListingDataFactory.spec.ts`

**Interfaces:**

- Produces: `UserAlias`, `UserRecord`, `UserCredentials`, `ListingData`, `AppointmentData`, `TransactionStatus`, and `TestCaseDefinition`.
- Produces: `UserDataFactory.getCredentials(alias, source): UserCredentials`.
- Produces: `ListingDataFactory.create(overrides?): ListingData`.

- [ ] **Step 1: Write failing factory tests**

```ts
import { expect, test } from '@playwright/test';
import { UserDataFactory } from '../../../test-data/factories/UserDataFactory';

test('resolves credentials through environment-key references', () => {
  const credential = UserDataFactory.getCredentials('defaultUser', {
    DEFAULT_USER_EMAIL: 'user@example.test',
    DEFAULT_USER_PASSWORD: 'secret-value',
  });

  expect(credential).toEqual({
    alias: 'defaultUser',
    email: 'user@example.test',
    password: 'secret-value',
  });
});

test('reports the missing key without printing credential values', () => {
  expect(() => UserDataFactory.getCredentials('defaultUser', {})).toThrow(/DEFAULT_USER_EMAIL/);
});
```

```ts
import { expect, test } from '@playwright/test';
import { ListingDataFactory } from '../../../test-data/factories/ListingDataFactory';

test('creates independent listing objects with typed overrides', () => {
  const first = ListingDataFactory.create({ title: 'First listing' });
  const second = ListingDataFactory.create({ title: 'Second listing' });

  expect(first.title).toBe('First listing');
  expect(second.title).toBe('Second listing');
  expect(first).not.toBe(second);
});
```

- [ ] **Step 2: Run factory tests and verify RED**

Run: `npm test -- tests/unit/test-data`

Expected: FAIL because the factory modules do not exist.

- [ ] **Step 3: Implement contracts, safe JSON, and factories**

Commit only environment-key names in `users.json`. Provide deterministic valid listing and appointment JSON. Factories validate aliases, never log secret values, merge immutable defaults with typed overrides, and return new objects.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/test-data`

Expected: all factory tests pass.

- [ ] **Step 5: Commit**

```bash
git add types test-data tests/unit/test-data
git commit -m "feat: add typed test data factories"
```

### Task 3: Reusable technical utilities

**Files:**

- Create: `utils/DateHelper.ts`
- Create: `utils/RandomDataGenerator.ts`
- Create: `utils/FileUploadHelper.ts`
- Create: `utils/ScreenshotHelper.ts`
- Create: `utils/APIHelper.ts`
- Create: `utils/BrowserHelper.ts`
- Test: `tests/unit/utils/DateHelper.spec.ts`
- Test: `tests/unit/utils/RandomDataGenerator.spec.ts`
- Test: `tests/unit/utils/FileUploadHelper.spec.ts`

**Interfaces:**

- Produces: `DateHelper.format(date, format): string`, `DateHelper.addDays(date, days): Date`.
- Produces: unique `RandomDataGenerator.string`, `.email`, `.phoneNumber`, and `.integer` methods.
- Produces: `FileUploadHelper.resolveFixturePath(relativePath): string` and `.upload(locator, relativePath): Promise<void>`.
- Produces: `ScreenshotHelper.capture(page, testInfo, name): Promise<void>`.
- Produces: typed `APIHelper.get/post/put/delete` methods.
- Produces: `BrowserHelper.waitForDocumentReady(page)` and `.saveStorageState(context, path)`.

- [ ] **Step 1: Write failing utility behavior tests**

```ts
import { expect, test } from '@playwright/test';
import { DateHelper } from '../../../utils/DateHelper';

test('formats a date without using locale-dependent output', () => {
  expect(DateHelper.format(new Date('2026-08-05T00:00:00Z'), 'DD/MM/YYYY')).toBe('05/08/2026');
});

test('adds days without mutating the input date', () => {
  const input = new Date('2026-08-05T00:00:00Z');
  const result = DateHelper.addDays(input, 2);
  expect(result.toISOString()).toBe('2026-08-07T00:00:00.000Z');
  expect(input.toISOString()).toBe('2026-08-05T00:00:00.000Z');
});
```

```ts
import { expect, test } from '@playwright/test';
import { RandomDataGenerator } from '../../../utils/RandomDataGenerator';

test('generates unique prefixed email addresses', () => {
  const first = RandomDataGenerator.email('graduate');
  const second = RandomDataGenerator.email('graduate');
  expect(first).toMatch(/^graduate\.[a-z0-9]+@example\.test$/);
  expect(second).not.toBe(first);
});
```

- [ ] **Step 2: Run utility tests and verify RED**

Run: `npm test -- tests/unit/utils`

Expected: FAIL because utility modules do not exist.

- [ ] **Step 3: Implement the smallest typed utility APIs**

Use deterministic date tokens, cryptographic random IDs, validated workspace-relative fixture paths, Playwright attachments, typed API status checking, document readiness, and storage-state directory creation. Include no feature-specific rules.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/utils`

Expected: all utility tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils tests/unit/utils
git commit -m "feat: add reusable framework utilities"
```

### Task 4: Base Page Object and shared components

**Files:**

- Create: `pages/base/BasePage.ts`
- Create: `pages/components/HeaderComponent.ts`
- Create: `pages/components/ListingFormComponent.ts`
- Test: `tests/component/pages/LoginPage.spec.ts`

**Interfaces:**

- Produces: `BasePage` constructor `(page: Page)` and protected `navigate`, `waitUntilReady`, `currentUrl`, and `captureScreenshot` methods.
- Produces: `HeaderComponent` with `openLogin`, `openAccountMenu`, `navigateToProfile`, `logout`, and `isAuthenticated`.
- Produces: `ListingFormComponent` with typed `fill`, `uploadImages`, and `submit` operations.

- [ ] **Step 1: Write the failing login Page Object behavior test**

```ts
import { expect, test } from '@playwright/test';
import { LoginPage } from '../../../pages/authentication/LoginPage';

test('submits credentials through the Propify login modal', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section role="dialog" hidden>
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <button>Tiếp tục</button>
    </section>
    <script>
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('[role="dialog"]').hidden = false;
      };
      document.querySelector('button:last-of-type').onclick = () => {
        document.body.dataset.submitted = 'true';
      };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.submitCredentials({
    alias: 'defaultUser',
    email: 'user@example.test',
    password: 'secret-value',
  });

  expect(await page.evaluate(() => document.body.dataset.submitted)).toBe('true');
});
```

- [ ] **Step 2: Run the boundary test and verify RED**

Run: `npm test -- tests/component/pages/LoginPage.spec.ts`

Expected: FAIL because `LoginPage.ts` does not exist.

- [ ] **Step 3: Implement BasePage and components**

Use constructor injection, protected common behavior, actual Propify accessible names, private readonly locators, intent-based public methods, and no assertions or test data literals. Add the minimal `LoginPage` implementation needed by the behavior test, then keep shared header behavior in `HeaderComponent`.

- [ ] **Step 4: Verify GREEN and type safety**

Run: `npm test -- tests/component/pages/LoginPage.spec.ts`

Run: `npm run typecheck`

Expected: boundary test and TypeScript compilation pass.

- [ ] **Step 5: Commit**

```bash
git add pages/base pages/components pages/authentication/LoginPage.ts tests/component/pages
git commit -m "feat: add Page Object foundation"
```

### Task 5: Feature Page Objects

**Files:**

- Create: `pages/authentication/LoginPage.ts`
- Create: `pages/authentication/RegisterPage.ts`
- Create: `pages/authentication/ForgotPasswordPage.ts`
- Create: `pages/profile/ProfilePage.ts`
- Create: `pages/listings/ListingListPage.ts`
- Create: `pages/listings/ListingDetailPage.ts`
- Create: `pages/listings/CreateListingPage.ts`
- Create: `pages/listings/EditListingPage.ts`
- Create: `pages/listings/MyListingsPage.ts`
- Create: `pages/appointments/AppointmentPage.ts`
- Create: `pages/transactions/TransactionPage.ts`

**Interfaces:**

- Produces concrete Page Objects extending `BasePage` and exposing intent-based feature methods.
- Consumes `HeaderComponent`, `ListingFormComponent`, domain types, `ROUTES`, and Playwright `Page`.

- [ ] **Step 1: Extend the login component test with observable modal behavior and verify RED**

Add a scenario that calls `LoginPage.openForgotPassword()` and asserts the visible heading `Quên mật khẩu`. Run `npm test -- tests/component/pages/LoginPage.spec.ts`; expect failure because the method and Forgot Password Page Object do not exist.

- [ ] **Step 2: Implement feature Page Objects**

Model the inspected Propify routes and accessible UI: modal login, profile tabs, `/sales`, `/rent`, `/listings/:id`, listing management, appointment filters, and transaction filters. Use reusable components for header and listing forms. Templates must be callable and type-safe without triggering destructive actions by default.

- [ ] **Step 3: Verify Page Object behavior, lint boundaries, and compilation**

Run: `npm test -- tests/component/pages/LoginPage.spec.ts`

Run: `npm run lint`

Run: `npm run typecheck`

Expected: component behavior, architectural lint rules, and compilation pass.

- [ ] **Step 4: Commit**

```bash
git add pages tests/component/pages
git commit -m "feat: add Propify feature Page Objects"
```

### Task 6: Workflows and typed fixture composition

**Files:**

- Create: `workflows/authentication/AuthenticationWorkflow.ts`
- Create: `workflows/listings/ListingWorkflow.ts`
- Create: `workflows/appointments/AppointmentWorkflow.ts`
- Create: `workflows/transactions/TransactionWorkflow.ts`
- Create: `fixtures/auth.fixture.ts`
- Create: `fixtures/page.fixture.ts`
- Create: `fixtures/workflow.fixture.ts`
- Create: `fixtures/test.fixture.ts`
- Test: `tests/component/fixtures/test.fixture.spec.ts`

**Interfaces:**

- Produces: `AuthenticationWorkflow.login(credentials): Promise<void>` and `.logout(): Promise<void>`.
- Produces: typed listing, appointment, and transaction workflow methods.
- Produces: extended `test` and `expect` from `fixtures/test.fixture.ts`.
- Produces: Page and Workflow fixture interfaces available to tests by fixture name.

- [ ] **Step 1: Write the failing fixture composition test**

```ts
import { expect, test } from '../../../fixtures/test.fixture';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';

test('BaseTest composition provides real Page Objects and Workflows', async ({
  loginPage,
  authenticationWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(authenticationWorkflow).toBeInstanceOf(AuthenticationWorkflow);
});
```

- [ ] **Step 2: Run the fixture test and verify RED**

Run: `npm test -- tests/component/fixtures/test.fixture.spec.ts`

Expected: FAIL because `fixtures/test.fixture.ts` does not exist.

- [ ] **Step 3: Implement Workflows and fixtures**

Compose fixtures in dependency order: auth identity, Page Objects, then Workflows. Keep login details in `AuthenticationWorkflow`; keep all selectors in Page Objects; expose the default typed user without logging credentials. Provide a named-user context factory based on `.auth/<alias>.json`.

- [ ] **Step 4: Verify GREEN, locator ownership, and type safety**

Run: `npm test -- tests/component/fixtures tests/component/pages`

Run: `npm run typecheck`

Expected: fixture and architecture tests pass with no type errors.

- [ ] **Step 5: Commit**

```bash
git add workflows fixtures tests/component/fixtures
git commit -m "feat: compose typed Workflows and fixtures"
```

### Task 7: Authentication setup, Playwright projects, reporting, and login smoke test

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/setup/auth.setup.ts`
- Create: `tests/authentication/login.spec.ts`
- Create: `reporters/allure-environment.ts`
- Create: `test-cases/authentication/login.test-cases.ts`

**Interfaces:**

- Consumes environment config, `AuthenticationWorkflow`, fixture-composed `test`, tags, and user factory.
- Produces `auth-setup`, `chromium`, `firefox`, and `webkit` Playwright projects.
- Produces storage state under `.auth/defaultUser.json`.

- [ ] **Step 1: Write the failing login smoke scenario**

Create `login.spec.ts` using the wished-for fixture and Workflow API. Run `npm test -- tests/authentication/login.spec.ts --project=chromium`; expect failure because `playwright.config.ts` and the auth setup do not exist.

- [ ] **Step 2: Implement projects, auth setup, reporting, and the sample scenario**

Configure HTML, list, and Allure reporters. Make browser projects depend on `auth-setup` and use `.auth/defaultUser.json`. The login smoke test must import `test` and `expect` from `fixtures/test.fixture`, reset storage state, call only the authentication Workflow/Page Object public contract, and assert authenticated state. Add test-case ID `AUTH-LOGIN-001` and tags `@smoke`, `@regression`, and `@authentication`.

- [ ] **Step 3: Verify configuration behavior and test discovery**

Run: `npx playwright test --list`

Expected: configuration tests pass and Playwright lists setup plus three browser projects without executing destructive scenarios.

- [ ] **Step 4: Run the login smoke test when local credentials are available**

Run: `npx playwright test tests/authentication/login.spec.ts --project=chromium`

Expected: login completes and the authenticated-header assertion passes. If Propify is unavailable, report the external failure separately while retaining successful compile, unit, and discovery evidence.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/setup tests/authentication reporters test-cases/authentication
git commit -m "feat: add authentication setup and login smoke test"
```

### Task 8: Documentation, traceability, formatting, and final verification

**Files:**

- Modify: `README.md`
- Create: `docs/requirements/framework-requirements.md`
- Create: `docs/prompts/framework-generation-prompt.md`
- Create: `docs/traceability/requirements-to-tests.md`
- Create: `test-cases/listings/.gitkeep`
- Create: `test-cases/appointments/.gitkeep`
- Create: `test-cases/transactions/.gitkeep`
- Create: `tests/profile/.gitkeep`
- Create: `tests/listings/.gitkeep`
- Create: `tests/appointments/.gitkeep`
- Create: `tests/transactions/.gitkeep`
- Create: `test-data/files/listing-images/.gitkeep`

**Interfaces:**

- Produces complete onboarding and extension instructions.
- Produces traceability from requirements to `AUTH-LOGIN-001` and framework files.

- [ ] **Step 1: Write the documentation and traceability artifacts**

Document prerequisites, npm/browser installation, environment selection, safe credentials, architecture, every folder responsibility, authentication state, multi-user execution, browsers, parallelism, tags, diagnostics, HTML/Allure reports, debugging, and extension steps for Pages, Workflows, users, modules, API, Visual, and AI testing.

- [ ] **Step 2: Install dependencies and browsers needed for verification**

Run: `npm install`

Run: `npx playwright install chromium`

Expected: dependencies and Chromium install successfully.

- [ ] **Step 3: Run static verification**

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm run format:check`

Expected: each command exits 0 with no errors.

- [ ] **Step 4: Run automated verification**

Run: `npm test -- tests/unit`

Run: `npx playwright test --list`

Expected: every unit/architecture test passes and all intended projects/specifications are discoverable.

- [ ] **Step 5: Run the non-destructive Chromium login smoke test**

Run: `npx playwright test tests/authentication/login.spec.ts --project=chromium`

Expected: the test passes against Propify with local credentials. Do not run create/edit listing, appointment submission, or transaction mutations.

- [ ] **Step 6: Inspect Git exclusions and repository diff**

Run: `git status --short --ignored`

Run: `git diff --check`

Expected: `.env`, `.auth`, `playwright-report`, `allure-results`, and `test-results` are ignored; tracked changes contain no whitespace errors or credential values.

- [ ] **Step 7: Commit**

```bash
git add README.md docs test-cases tests/profile tests/listings tests/appointments tests/transactions test-data/files
git commit -m "docs: add framework guidance and traceability"
```

- [ ] **Step 8: Run fresh completion verification**

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm run format:check`

Run: `npm test -- tests/unit`

Run: `npx playwright test --list`

Run: `npx playwright test tests/authentication/login.spec.ts --project=chromium`

Expected: all static checks, unit tests, discovery, and the login smoke scenario pass with zero failures.
