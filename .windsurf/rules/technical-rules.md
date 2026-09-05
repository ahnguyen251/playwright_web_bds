---
trigger: always_on
description: Technical architecture and coding standards for Playwright Web BDS
globs:
---

# Playwright Web BDS Technical Rules

Strict implementation conventions for the Playwright TypeScript automation framework for Propify.

---

## 1. Architectural Layers & Boundaries

```text
Tests -> Fixtures -> Workflows -> Page Objects/Components -> Playwright API
                    |
                    +-> Types, Test Data, Constants, Helpers, Utilities
```

1. **`tests/`**:
   - Only describes test scenarios, metadata from `test-cases/`, tags, and web assertions (`expect(...)`).
   - **RULE**: NEVER define locators (`page.locator`, `page.getBy...`) directly inside `tests/`.
2. **`fixtures/`**:
   - Composes page objects, workflows, users, execution policies, and observers.
   - Always import `test` and `expect` from `fixtures/test.fixture.ts`.
3. **`workflows/`**:
   - Orchestrates multi-page business flows.
   - Does NOT contain assertions or persistent cross-test state.
4. **`pages/` & `pages/components/`**:
   - Inherits from `BasePage`.
   - Encapsulates all locators and user interactions.
   - Does NOT import or execute `@playwright/test` `expect(...)`. Exposes state inquiry methods returning promises of boolean/string/number.

---

## 2. Locator Hierarchy & Strict Mode

Use accessible and semantic locators in priority order:
1. `page.getByRole(role, { name, exact })`
2. `page.getByPlaceholder(text, { exact })`
3. `page.getByText(text, { exact })`
4. `page.getByTestId(id)`
5. Scoped locators: `this.container.getByRole(...)`

**FORBIDDEN**:
- Fragile CSS utility classes (e.g. Tailwind `div.flex.items-center.text-sm...`).
- Absolute XPath expressions (`/html/body/div[2]/...`).
- Ambient unscoped element matching causing Playwright strict mode violations.

---

## 3. Asynchrony & Flakiness Prevention

- **FORBIDDEN**: `page.waitForTimeout()` or `setTimeout()`.
- Use web-first auto-retrying assertions:
  ```typescript
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  ```
- Use `expect.poll` when waiting on background API updates or counter changes:
  ```typescript
  await expect.poll(async () => pageObject.getMessage()).not.toBe('');
  ```

---

## 4. Safety Gates & Environment Isolation

- Target URL: `https://propifyy.duckdns.org/` (configured in `.env`).
- **Default Policy**: `RUN_MUTATING_E2E=false`, `RUN_OTP_E2E=false`.
- Any test that modifies state (account creation, appointment booking, listing submission) MUST:
  - Have suffix `*.mutating.spec.ts`;
  - Have tag `@mutating`;
  - Run under project `mutating-chromium` with `workers: 1` and clean `storageState: { cookies: [], origins: [] }`;
  - Skip execution if `RUN_MUTATING_E2E !== true`.
