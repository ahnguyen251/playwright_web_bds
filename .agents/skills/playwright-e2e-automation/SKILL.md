---
name: playwright-e2e-automation
description: Author, update, and maintain Playwright E2E test suites in playwright_web_bds. Use when creating or editing test specs in tests/, adding test cases from test-cases/, configuring storage states, applying test tags (@smoke, @regression, @mutating), or writing auto-retrying assertions and request observers.
---

# Playwright E2E Automation

Author clean, deterministic Playwright test suites adhering to Propify framework standards.

## Structure of a Spec File

```typescript
import { expect, test } from '../../fixtures/test.fixture';
import { loginTestCase } from '../../test-cases/authentication/login.test-cases';

// If test requires clean session:
test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${loginTestCase.id} ${loginTestCase.title}`,
  { tag: [...loginTestCase.tags] },
  async ({ loginPage, defaultUser }) => {
    await loginPage.openHome();
    await loginPage.open();
    await loginPage.submitCredentials(defaultUser);
    await expect.poll(async () => loginPage.isLoggedIn()).toBe(true);
  },
);
```

## Rules

1. **Import from `fixtures/test.fixture`**: Never import `test` or `expect` directly from `@playwright/test` in scenario specs. Use the composed fixture `test` which provides Page Objects, observers, and credentials.
2. **Metadata from `test-cases/`**: Link tests with their typed definition in `test-cases/` to ensure traceability. Include case ID and tags (`@smoke`, `@regression`, `@mutating`).
3. **No Raw Locators**: Specs only interact with Page Objects or Workflows.
4. **Follow Assertion Guide**: Read `references/assertions-and-waits.md` for auto-retrying assertions and polling.
5. **Mutation Quarantine**: All tests that mutate production data must be named `*.mutating.spec.ts`, tagged with `@mutating`, and run under project `mutating-chromium`.
