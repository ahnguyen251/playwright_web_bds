# Playwright Web BDS - AI Agent Development Instructions

## 1. Project Overview

- **Project**: Enterprise Playwright and TypeScript automation framework for Propify (Real Estate).
- **Target Site**: `https://propifyy.duckdns.org/`
- **Project Root**: `D:/PROJECT/playwright_web_bds`
- **Core Tech Stack**: Node.js 20+, TypeScript 6 strict mode, Playwright Test 1.62, Better-SQLite3, Zod, Allure.
- **Scope**: User authentication, profile, listings, appointments, and transactions (Admin is out of scope).

---

## 2. Spec-First Development Workflow

For all non-trivial features, new test cases, refactoring, and bugfixes, this repository strictly follows the **Spec-First Development** methodology.

Persistent task memory files are stored in:
`docs/tasks/<ticket-number>-<discussion-topic>.md`

### AI Agent Command Mapping

| Phase | Windsurf | Codex / Claude Code | Antigravity | Goal |
| :--- | :--- | :--- | :--- | :--- |
| **Discussion** | `/spec-start` | `$spec-start` | `/spec-start` or skill `spec-start` | Explore problem, inspect DOM/code, clarify scope, write acceptance criteria. **NO source code changes.** |
| **Implementation** | `/spec-implement` | `$spec-implement` | `/spec-implement` or skill `spec-implement` | Validate user approval, record baseline, make surgical code changes adhering to 4-layer architecture. |
| **Review & Verify** | `/spec-review` | `$spec-review` | `/spec-review` or skill `spec-review` | Analyze diff, run automated tests, verify DoD evidence, complete task. |

### Lifecycle Gates

1. **Single Source of Truth**: The file in `docs/tasks/` is persistent task memory. Re-read it before taking action and update it whenever scope, decisions, or findings change.
2. **Approval Gate**: NEVER begin coding until `implementation-approved: true` is explicitly granted by the user and all `[blocking]` open questions are resolved.
3. **Automated Validation**: Run validation script across every phase boundary:
   ```bash
   node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase <phase> --update-metadata
   ```
4. **Definition of Done (DoD)**: Tag all user-provided DoD items as `[DoD-n]` in sequential order. Do not weaken or omit them.

---

## 3. Strict 4-Layer Architecture & Coding Rules

```text
Tests -> Fixtures -> Workflows -> Page Objects/Components -> Playwright API
                    |
                    +-> Types, Test Data, Constants, Helpers, Utilities
```

1. **`tests/`**:
   - Only describes test scenarios, metadata from `test-cases/`, tags, and web assertions (`expect(...)`).
   - **CRITICAL RULE**: NEVER place raw locators (`page.locator`, `page.getByRole`, etc.) inside `tests/`.
2. **`fixtures/`**:
   - Composes page objects, workflows, users, execution policies, and observers.
   - Always import `test` and `expect` from `fixtures/test.fixture.ts`.
3. **`workflows/`**:
   - Orchestrates multi-page business flows.
   - Does NOT contain assertions or cross-test mutable state.
4. **`pages/` & `pages/components/`**:
   - Inherits from `BasePage`.
   - Encapsulates all locators and user interactions.
   - Does NOT import `@playwright/test` `expect(...)`. Exposes state inquiry methods returning promises of boolean/string/number.

---

## 4. Locator Hierarchy & Anti-Flakiness Rules

- **Semantic Locators**: `getByRole` > `getByPlaceholder` > `getByText` > `getByTestId`.
- **FORBIDDEN**: Fragile CSS utility classes (e.g. Tailwind `div.flex.items-center...`) and absolute XPaths.
- **FORBIDDEN**: `page.waitForTimeout()` or manual `setTimeout()`.
- **Auto-Retrying Assertions**: Always use web-first assertions (`await expect(locator).toBeVisible()`).
- **Polling Dynamic States**: Use `await expect.poll(async () => ...).toBe(...)`.

---

## 5. Safety Gates & Environment Policies

- Target website is `production` (`https://propifyy.duckdns.org/`).
- **Default Policy**: `RUN_MUTATING_E2E=false`, `RUN_OTP_E2E=false`.
- Any test that modifies data (account creation, appointment booking, listing submission) MUST:
  - Have suffix `*.mutating.spec.ts`;
  - Have tag `@mutating`;
  - Run under project `mutating-chromium` with `workers: 1` and clean `storageState: { cookies: [], origins: [] }`;
  - Check `RUN_MUTATING_E2E` policy.

---

## 6. Verification & Build Commands

```bash
# Typecheck TypeScript (zero errors)
npm run typecheck

# ESLint (zero warnings)
npm run lint

# Run non-mutating smoke tests
npm run test:smoke

# Run specific spec
npx playwright test tests/<path-to-spec>.spec.ts

# Run business catalog runner
npm run test:business
```

---

## 7. Available Skills

Skills are available in `.agents/skills/` and `.windsurf/skills/`:
- `discussion-maintainer`: Persistent task memory & validation.
- `task-investigator`: DOM, selector, test catalog, and contract inspection.
- `technical-reviewer`: Playwright architecture, locator safety, and flakiness review.
- `verification-designer`: E2E test matrices, ownership, and manual scenario design.
- `playwright-e2e-automation`: Spec authoring, assertions, and test tagging.
- `page-component-design`: Page Objects, components, and semantic locator encapsulation.
- `test-data-management`: Fixtures, data factories, and mutation safety gates.
- `spec-start`, `spec-implement`, `spec-review`: Lifecycle wrapper skills.
