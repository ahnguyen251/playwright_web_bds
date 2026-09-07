# Playwright Code Review Checklist

Review all changed or proposed code against the following rules before approving review:

## 1. Architectural Boundaries

- [ ] **No Locators in Tests**: `tests/**/*.spec.ts` must never invoke `page.locator(...)`, `page.getByRole(...)`, `page.$()`, etc. All interactions must go through Page Objects (`pages/`) or Workflows (`workflows/`).
- [ ] **No Assertions in Pages**: `pages/**/*.ts` must not import or run `@playwright/test` `expect(...)`. They expose actions, state checkers (returning `Promise<boolean>` or `Promise<string>`), or wait helpers.
- [ ] **Workflow Boundary**: `workflows/**/*.ts` coordinate sequences across multiple pages and components. They do not maintain persistent cross-test state.
- [ ] **Inheritance**: All Page Objects must extend `BasePage` and call `super(page)`.
- [ ] **Component Encapsulation**: Shared UI components (like `HeaderComponent`, modal dialogs) are instantiated within Page Objects or injected via fixtures.

## 2. Locator Robustness & Strict Mode

- [ ] **Semantic Locators**: Prefers `getByRole`, `getByPlaceholder`, `getByText`, `getByTestId`.
- [ ] **No Brittle CSS/XPath**: Prohibits class-name chaining (`div.flex.items-center...`) and absolute XPaths (`/html/body/...`).
- [ ] **Strict Mode Compliance**: Locators must not resolve to multiple elements ambiguously. When targeting a list, use `.filter(...)` or explicit indices with clear justification.
- [ ] **Scoping**: Modal or dialog actions must be scoped to their container locator (e.g. `this.dialog.getByRole(...)`).

## 3. Asynchrony & Anti-Flakiness

- [ ] **No Arbitrary Sleep**: Never use `page.waitForTimeout()`.
- [ ] **Auto-Retrying Assertions**: Use `await expect(locator).toBeVisible()`, `toBeEnabled()`, `toHaveText()`.
- [ ] **Polling**: When polling dynamic backend values or network counts, use `await expect.poll(...)`.
- [ ] **Navigation & Waits**: Custom navigations must wait for `'domcontentloaded'` or explicit visual element presence.

## 4. Environment & Mutation Safety

- [ ] **Mutation Protection**: Any test that creates accounts, posts listings, books real appointments, or modifies data must have `.mutating.spec.ts` suffix and tag `@mutating`.
- [ ] **Isolation**: Mutating tests must run on project `mutating-chromium` (`workers: 1`, `storageState: { cookies: [], origins: [] }`).
- [ ] **No Secret Leaks**: No hardcoded passwords, tokens, or personal emails. Always read through environment schemas (`config/`).
- [ ] **External Mocks**: Tests requiring external uncontrolled services (e.g. Google OAuth) must be skipped unless a deterministic mock contract is active.
