# Playwright Framework Contract Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the existing Propify Playwright framework's reliability, locator contracts,
performance, and maintainability without changing business behavior or fabricating feature coverage.

**Architecture:** Keep the existing Page Object -> Workflow/Helper -> Fixture -> Test dependency
direction. Make targeted changes to verification boundaries, modal locator scoping, file-upload
batching, and tooling exclusions while retaining the current projects, metadata, and production
safety policy.

**Tech Stack:** Node.js 20+, TypeScript 6 strict mode, Playwright Test 1.62, ESLint 10, Prettier 3.

## Global Constraints

- Preserve Playwright project names `framework`, `auth-setup`, `chromium`, `firefox`, and `webkit`.
- Preserve Test Case IDs, tags, routes, requirement traceability, and current business behavior.
- Do not create executable Profile, Listings, Appointments, or Transactions scenarios.
- Do not introduce selectors, test IDs, routes, APIs, accounts, business rules, test frameworks, or dependencies.
- Prefer Playwright user-facing locators and web-first assertions; do not use `waitForTimeout()`.
- Do not use `nth()`, DOM-position selectors, dynamic CSS classes, long CSS chains, or XPath.
- Keep production execution non-destructive and read-only.
- After every task, run type-check, lint, formatting, and the complete `framework` Playwright project.

---

## Planned file map

- `.gitignore`: protect local, generated, sensitive, IDE, log, cache, and temporary content.
- `.prettierignore`: exclude ignored worktrees from formatting traversal.
- `.prettierrc.json`: accept checkout-native line endings without rewriting the repository.
- `eslint.config.mjs`: exclude ignored worktrees from lint traversal.
- `pages/authentication/LoginPage.ts`: scope modal controls to the login dialog and remove snapshot visibility API.
- `pages/authentication/ForgotPasswordPage.ts`: scope the modal view and expose its heading for web-first assertions.
- `pages/authentication/RegisterPage.ts`: scope registration controls to the existing authentication dialog.
- `pages/components/HeaderComponent.ts`: expose the authenticated account control and remove boolean visibility API.
- `workflows/authentication/AuthenticationWorkflow.ts`: keep action orchestration and remove the snapshot assertion wrapper.
- `tests/authentication/login.spec.ts`: assert the Page Object locator with a web-first expectation.
- `tests/component/pages/LoginPage.spec.ts`: protect dialog scoping and retrying assertions.
- `utils/FileUploadHelper.ts`: validate and select multiple files in a single Playwright operation.
- `pages/components/ListingFormComponent.ts`: delegate one collection upload instead of repeatedly replacing input files.
- `tests/unit/utils/FileUploadHelper.spec.ts`: verify one multi-file selection and empty-input behavior.
- `pages/base/BasePage.ts`: remove the unused generic readiness wrapper.
- `utils/BrowserHelper.ts`: remove the duplicate unused document-readiness wrapper.
- `fixtures/auth.fixture.ts`: simplify concurrent context cleanup without changing lifecycle behavior.
- `README.md`: document safe setup, executable coverage, template-only areas, and known limitations.

### Task 0: Harden repository hygiene before framework implementation

**Files:**

- Modify: `.gitignore`

**Interfaces:**

- Consumes: Git ignore matching and the existing tracked `.env.example` placeholder contract.
- Produces: local-development and generated paths that cannot be accidentally staged by default.

- [x] **Step 1: Verify missing ignore behavior**

Run `git check-ignore --no-index` against representative paths for `playwright/.auth/`,
`storage-state/`, `*.storageState.json`, `.vscode/`, `.idea/`, npm/yarn debug logs, `tmp/`, `temp/`,
and `*.tmp`.

Expected before the change: these paths return exit code `1`, while existing dependency, environment,
report, `.auth/`, worktree, OS-file, and generic-log paths return `0`.

- [x] **Step 2: Add categorized, narrow ignore rules**

Keep `.env.example` explicitly unignored. Preserve `.auth/` because the framework writes there, and
also ignore Playwright's conventional `playwright/.auth/`, standalone storage-state files, IDE state,
caches, debug logs, and temporary paths. Do not ignore `document/`, `docs/`, JSON test data, or broad
binary extensions.

- [x] **Step 3: Verify ignore behavior and tracked-file cleanliness**

Re-run `git check-ignore --no-index` for every representative path. Confirm `.env.example` remains
tracked, and use `git ls-files` to prove that no generated/report/auth/worktree/temp path is already
tracked.

- [x] **Step 4: Commit repository hygiene separately**

```powershell
git add -- .gitignore docs/superpowers/specs/2026-08-10-playwright-framework-contract-refactor-design.md docs/superpowers/plans/2026-08-10-playwright-framework-contract-refactor.md
git commit -m "chore: harden repository hygiene"
```

### Task 1: Isolate tooling from ignored worktrees and line-ending noise

**Files:**

- Modify: `.prettierignore`
- Modify: `.prettierrc.json`
- Modify: `eslint.config.mjs`

**Interfaces:**

- Consumes: repository-level `npm run lint` and `npm run format:check` scripts.
- Produces: deterministic checks limited to the active checkout.

- [x] **Step 1: Reproduce the tooling failures**

Run:

```powershell
npm run lint
npm run format:check
```

Expected before the change: lint reports files below `.worktrees`, and formatting reports tracked
files whose only systematic difference is the checkout line-ending convention.

- [x] **Step 2: Add narrow traversal exclusions and line-ending policy**

Add `.worktrees` to `.prettierignore`, add `.worktrees/**` to the ESLint `ignores` list, and add the
following property to `.prettierrc.json`:

```json
"endOfLine": "auto"
```

Do not ignore any active source, test, fixture, or documentation directory.

- [x] **Step 3: Run the complete task verification gate**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`; the Playwright result reports only the executable framework
tests and makes no claim about Listings end-to-end coverage.

- [x] **Step 4: Commit the tooling fix**

```powershell
git add -- .prettierignore .prettierrc.json eslint.config.mjs
git commit -m "chore: isolate framework quality checks"
```

### Task 2: Replace snapshot authentication assertions with locator contracts

**Files:**

- Modify: `pages/authentication/LoginPage.ts`
- Modify: `pages/authentication/ForgotPasswordPage.ts`
- Modify: `pages/authentication/RegisterPage.ts`
- Modify: `pages/components/HeaderComponent.ts`
- Modify: `workflows/authentication/AuthenticationWorkflow.ts`
- Modify: `tests/authentication/login.spec.ts`
- Modify: `tests/component/pages/LoginPage.spec.ts`

**Interfaces:**

- Consumes: the existing `HeaderComponent.waitForAuthenticated(): Promise<void>` synchronization
  contract and authentication fixture composition.
- Produces: `HeaderComponent.authenticatedUserControl: Locator` and
  `ForgotPasswordPage.heading: Locator` for retrying expectations.

- [x] **Step 1: Write failing component assertions for modal scoping and web-first state**

Update the login component markup to include decoy email/password/continue controls outside the
existing `role="dialog"`. After `LoginPage.submitCredentials()`, use `expect.poll()` around a single
`page.evaluate()` result to prove that the dialog controls received the values and the dialog submit
handler ran while the decoy controls remained unchanged.

Replace:

```ts
expect(await forgotPasswordPage.isOpen()).toBe(true);
```

with:

```ts
await expect(forgotPasswordPage.heading).toBeVisible();
```

Run:

```powershell
npx playwright test tests/component/pages/LoginPage.spec.ts --project=framework
```

Expected: FAIL because `heading` is private and login locators are not yet scoped to the dialog.

- [x] **Step 2: Scope authentication modal locators and expose assertion targets**

In each authentication Page Object, create the existing dialog locator with:

```ts
const dialog = page.getByRole('dialog');
```

Resolve modal inputs, buttons, and headings from `dialog` rather than the whole page. Make
`ForgotPasswordPage.heading` public and readonly. Remove `LoginPage.isOpen()` and
`ForgotPasswordPage.isOpen()` because they return non-retrying visibility snapshots.

- [x] **Step 3: Expose authenticated state without putting assertions in workflows**

Rename the private header account locator to:

```ts
public readonly authenticatedUserControl: Locator;
```

Keep `waitForAuthenticated()` for the setup workflow's observable completion point. Remove
`HeaderComponent.isAuthenticated()` and `AuthenticationWorkflow.isAuthenticated()`.

Update the login end-to-end scenario fixture arguments to include `header` and assert:

```ts
await expect(header.authenticatedUserControl).toBeVisible();
```

The `AUTH-LOGIN-001` title, tags, unauthenticated storage state, and workflow call stay unchanged.

- [x] **Step 4: Run the complete task verification gate**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`, including the focused component coverage for dialog scoping.

- [x] **Step 5: Commit the authentication contract refactor**

```powershell
git add -- pages/authentication/LoginPage.ts pages/authentication/ForgotPasswordPage.ts pages/authentication/RegisterPage.ts pages/components/HeaderComponent.ts workflows/authentication/AuthenticationWorkflow.ts tests/authentication/login.spec.ts tests/component/pages/LoginPage.spec.ts
git commit -m "refactor: use web-first authentication contracts"
```

### Task 3: Batch multi-file uploads without changing empty-list behavior

**Files:**

- Modify: `utils/FileUploadHelper.ts`
- Modify: `pages/components/ListingFormComponent.ts`
- Modify: `tests/unit/utils/FileUploadHelper.spec.ts`

**Interfaces:**

- Consumes: `FileUploadHelper.resolveFixturePath(relativePath: string): string` and
  `FileUploadHelper.upload(locator: Locator, relativePath: string): Promise<void>`.
- Produces: `FileUploadHelper.uploadMany(locator: Locator, relativePaths: readonly string[]): Promise<void>`.

- [ ] **Step 1: Write a failing test for atomic multi-file selection**

Create two unique temporary files beneath the existing `test-data/files` root. Pass a narrow fake
`Locator` whose `setInputFiles()` records its argument to `uploadMany()`. Assert one invocation with
both absolute fixture paths in input order. Clean up only the unique temporary directory in a
`finally` block.

Add a second test that passes an empty list and asserts `setInputFiles()` is never called, preserving
the previous loop's no-op behavior.

Run:

```powershell
npx playwright test tests/unit/utils/FileUploadHelper.spec.ts --project=framework
```

Expected: FAIL because `uploadMany()` does not exist.

- [ ] **Step 2: Implement validated collection upload**

Add:

```ts
public static async uploadMany(
  locator: Locator,
  relativePaths: readonly string[],
): Promise<void> {
  if (relativePaths.length === 0) {
    return;
  }

  const absolutePaths = relativePaths.map((relativePath) =>
    FileUploadHelper.resolveFixturePath(relativePath),
  );
  await Promise.all(absolutePaths.map(async (absolutePath) => access(absolutePath)));
  await locator.setInputFiles(absolutePaths);
}
```

Keep `upload()` as a compatibility method delegating to `uploadMany(locator, [relativePath])`.
Change `ListingFormComponent.uploadImages()` to one
`FileUploadHelper.uploadMany(this.imageInput, relativePaths)` call.

- [ ] **Step 3: Run the complete task verification gate**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`; the upload tests prove one selection for multiple files and no
selection for an empty array. This is framework behavior, not executable Listings coverage.

- [ ] **Step 4: Commit the upload fix**

```powershell
git add -- utils/FileUploadHelper.ts pages/components/ListingFormComponent.ts tests/unit/utils/FileUploadHelper.spec.ts
git commit -m "fix: select listing uploads atomically"
```

### Task 4: Remove unused generic readiness duplication

**Files:**

- Modify: `pages/base/BasePage.ts`
- Modify: `utils/BrowserHelper.ts`
- Modify: `fixtures/auth.fixture.ts`

**Interfaces:**

- Consumes: current navigation and storage-state persistence APIs.
- Produces: unchanged `BasePage.navigate()`, `BrowserHelper.saveStorageState()`, and fixture lifecycle behavior.

- [ ] **Step 1: Confirm the wrappers have no consumers**

Run:

```powershell
rg -n "waitUntilReady|waitForDocumentReady" --glob "*.ts"
```

Expected before the change: only the two method declarations are returned.

- [ ] **Step 2: Remove duplicate unused wrappers and simplify cleanup**

Delete `BasePage.waitUntilReady()` and `BrowserHelper.waitForDocumentReady()`; neither represents a
specific application-ready state. Remove the now-unused `Page` import from `BrowserHelper`.

Replace the context cleanup callback:

```ts
await Promise.all(contexts.map(async (context) => context.close()));
```

with:

```ts
await Promise.all(contexts.map((context) => context.close()));
```

- [ ] **Step 3: Run the complete task verification gate**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`, proving the removed wrappers were not required by executable
framework behavior.

- [ ] **Step 4: Commit the cleanup**

```powershell
git add -- pages/base/BasePage.ts utils/BrowserHelper.ts fixtures/auth.fixture.ts
git commit -m "refactor: remove redundant readiness wrappers"
```

### Task 5: Final verification and coverage audit

**Files:**

- Verify only; modify earlier files only if a command exposes a regression.

**Interfaces:**

- Consumes: all preceding task outputs.
- Produces: evidence-backed completion report with explicit unresolved risks and missing coverage.

- [ ] **Step 1: Verify repository scope and source consistency**

```powershell
git status --short
git diff --check HEAD~4
rg -n "waitForTimeout|\.nth\(|xpath=|isVisible\(|waitForLoadState" pages workflows fixtures tests utils
rg --files tests/listings -g "*.spec.ts"
```

Expected: no introduced fixed sleeps, positional/XPath locators, snapshot visibility assertions, or
generic load-state waits; the Listings spec search returns no file unless one pre-existed the refactor.

- [ ] **Step 2: Run final framework verification**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: all commands exit `0`; record the exact Playwright pass count instead of predicting it.

- [ ] **Step 3: Run login separately when configuration is available**

First confirm only that the required variables are present without printing their values. If
present, run:

```powershell
npx playwright test tests/authentication/login.spec.ts --project=chromium
```

Record the real result. A failure or skipped run must not be reported as success.

- [ ] **Step 4: Review unresolved locator and coverage risks**

Report ambiguous template-only locators that cannot be proven unique, including unscoped generic
comboboxes, the unlabelled file input CSS fallback, broad listing heading/row matching, and header
controls that may be duplicated by responsive layouts. Report that Profile, Listings,
Appointments, and Transactions still lack executable feature specifications when the final file
scan confirms that state.

### Task 6: Document safe project operation and audit GitHub readiness

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: verified commands, Playwright project configuration, traceability, and actual executable specs.
- Produces: clone-to-run guidance that distinguishes implemented coverage from reusable templates.

- [ ] **Step 1: Update README from verified repository facts**

Keep the existing purpose, stack, architecture, setup, command, reporting, and safety material.
Clarify Node/npm prerequisites, `.env.example` copying, browser installation, the five Playwright
projects, available quality/test commands, current login and framework coverage, template-only
Profile/Listings/Appointments/Transactions modules, and report directories. Do not claim a feature
test exists unless `rg --files tests/<feature> -g '*.spec.ts'` finds one.

- [ ] **Step 2: Run the complete verification gate after documentation changes**

```powershell
npm run typecheck
npm run lint
npm run format:check
npx playwright test --project=framework
```

Expected: every command exits `0`; record actual test counts.

- [ ] **Step 3: Perform tracked and untracked cleanliness audit**

Use `git ls-files` to check generated/local/sensitive path patterns and secret-keyword scans over
tracked JSON, TypeScript, configuration, Markdown, and example environment files. Review matches
manually to distinguish placeholder/dummy values from credentials. Inspect untracked files without
adding or deleting them. Record `git status --short`, `git diff --stat main...HEAD`, and the exact
branch/worktree paths.

- [ ] **Step 4: Commit README only after its claims match verification**

```powershell
git add -- README.md
git commit -m "docs: clarify safe framework usage"
```
