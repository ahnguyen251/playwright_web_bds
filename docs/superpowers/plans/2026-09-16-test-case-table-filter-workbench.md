# Test Case Table Filter Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a command-bar-based Test Case List that filters by module, automation state, and most recent run result; exposes latest-run data; and enables UI-only multi-selection.

**Architecture:** The list API will derive one latest result per test case with a read-only SQL projection, preserving the current pagination envelope. `TestCasesView` will own transient filters and visible-row selection, while the API client serializes those filters. A dedicated dashboard page object and focused local-server spec will isolate new test interactions from raw test locators without refactoring the unrelated legacy dashboard spec.

**Tech Stack:** TypeScript, Express, Better-SQLite3, vanilla JavaScript, CSS, Playwright Test.

**Spec:** `docs/tasks/BDS-251-test-case-table-filter-workbench.md`

## Global Constraints

- Search only test ID, title, and `script_path`; selector persistence/search is out of scope.
- Latest-result filtering is read-only; no test-run execution endpoint or production mutation is introduced.
- Preserve current pagination, module tabs, detail links, and per-row information.
- Tests use a page object with semantic locators; no waits implemented with `page.waitForTimeout()` or `setTimeout()`.

---

### Task 1: Latest-run list contract

**Files:**
- Modify: `database/repositories/TestCaseReadRepository.ts:6-42`
- Modify: `server/schemas/index.ts:8-12`
- Test: `tests/ui/test-case-workbench.spec.ts`

**Interfaces:**
- Consumes: `TestCaseFilterSchema`, `test_cases`, `test_results`, and `test_runs`.
- Produces: `GET /api/test-cases?latestRunStatus=PASSED|FAILED|NOT_RUN` items with `latest_run_status`, `latest_run_at`, and `latest_run_duration_ms` fields.

- [ ] **Step 1: Write the failing integration test**

Seed `TC-01` with a newer `FAILED` result and `TC-02` with no result. Request `GET /api/test-cases?latestRunStatus=FAILED` from the real local server and expect only `TC-01` with `latest_run_status: 'FAILED'`; request `latestRunStatus=NOT_RUN` and expect only `TC-02` with a null latest status.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx playwright test tests/ui/test-case-workbench.spec.ts --grep "latest run filter"`

Expected: FAIL because the list item does not expose a latest-run result and the control does not exist.

- [ ] **Step 3: Add the schema and minimal repository projection**

Add the allowed UI filter value to `TestCaseFilterSchema`:

```ts
latestRunStatus: z.enum(['PASSED', 'FAILED', 'NOT_RUN']).optional(),
```

Change the list query to select the newest `test_results` record for each `test_case_id`, ordered by `test_runs.started_at DESC`, `test_results.created_at DESC`, and `result_id DESC`. Alias the status, time, and duration as `latest_run_status`, `latest_run_at`, and `latest_run_duration_ms`; apply `NOT_RUN` through a `LEFT JOIN`/`NULL` branch without losing test cases that have no results. Extend the list search predicate to include `script_path`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx playwright test tests/ui/test-case-workbench.spec.ts --grep "latest run filter"`

Expected: PASS.

- [ ] **Step 5: Commit the contract change**

```bash
git add database/repositories/TestCaseReadRepository.ts server/schemas/index.ts tests/ui/test-case-workbench.spec.ts
git commit -m "feat: expose latest test case run status"
```

### Task 2: Command-bar filters and chips

**Files:**
- Modify: `public/js/api.js:27-36`
- Modify: `public/js/views/TestCasesView.js:8-307`
- Modify: `public/css/style.css:243-252,591-710`
- Create: `pages/dashboard/TestCaseListPage.ts`
- Test: `tests/ui/test-case-workbench.spec.ts`

**Interfaces:**
- Consumes: `api.getTestCases(page, pageSize, filters, options)` and list-item latest-run fields from Task 1.
- Produces: a command bar with a search input, module/automation/latest-run selects, removable filter chips, and clear-all behavior.

- [ ] **Step 1: Write the failing page-object test**

Create `TestCaseListPage` with semantic methods `open(url)`, `filterByLatestRun(status)`, `clearFilters()`, `getActiveFilterLabels()`, and `visibleTestCaseIds()`. In the workbench spec, use it to select `FAILED`, verify `TC-01` is the only visible ID and the `Failed` chip is present, then clear filters and verify both IDs return.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx playwright test tests/ui/test-case-workbench.spec.ts --grep "command bar clears filters"`

Expected: FAIL because the filter controls, chips, and component methods have no implementation.

- [ ] **Step 3: Implement the minimal client and view behavior**

Replace positional filter arguments with a filters object in `api.getTestCases`:

```js
getTestCases: (page = 1, pageSize = 20, filters = {}, options = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return fetchJSON(`${API_BASE}/test-cases?${params.toString()}`, options);
},
```

In `TestCasesView`, retain filter state as `search`, `module`, `automationStatus`, and `latestRunStatus`; reset `page` to 1 when any filter changes; render only non-empty filter values as labeled chip buttons; and reset all state through one `clearFilters()` method. Use DOM node APIs and `textContent` for dynamic labels rather than interpolating untrusted strings into `innerHTML`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx playwright test tests/ui/test-case-workbench.spec.ts --grep "command bar clears filters"`

Expected: PASS.

- [ ] **Step 5: Commit the command-bar change**

```bash
git add public/js/api.js public/js/views/TestCasesView.js public/css/style.css pages/dashboard/TestCaseListPage.ts tests/ui/test-case-workbench.spec.ts
git commit -m "feat: add test case command bar filters"
```

### Task 3: Table selection and UI-only bulk action

**Files:**
- Modify: `public/js/views/TestCasesView.js:8-307`
- Modify: `public/css/style.css:170-252`
- Modify: `pages/dashboard/TestCaseListPage.ts`
- Modify: `tests/ui/test-case-workbench.spec.ts`

**Interfaces:**
- Consumes: rendered visible test case IDs and `selectedTestCaseIds: Set<string>` view state.
- Produces: per-row checkbox, select-visible checkbox, selected count, and `Chạy test đã chọn` button whose enabled state reflects selection.

- [ ] **Step 1: Write the failing page-object test**

Use `TestCaseListPage.selectTestCase('TC-01')` and assert `selectedCount()` returns `1` and `isRunSelectedEnabled()` returns `true`. Clear selection and assert the count is `0` and the button is disabled.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx playwright test tests/ui/test-case-workbench.spec.ts --grep "selected test action state"`

Expected: FAIL because the selection checkboxes and bulk-action state do not exist.

- [ ] **Step 3: Implement the minimal selection state**

Create `this.selectedTestCaseIds = new Set()` in the view lifecycle. Render a checkbox column keyed by each test-case ID, a select-visible checkbox that toggles only the current page’s items, and a toolbar with the selected count. Set the primary action button’s `disabled` property when the set is empty. Its click handler must not call an API or runner; it may dispatch a local `test-cases:run-selected` event carrying the selected IDs for the later runner-integration ticket.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx playwright test tests/ui/test-case-workbench.spec.ts --grep "selected test action state"`

Expected: PASS.

- [ ] **Step 5: Commit the selection UI**

```bash
git add public/js/views/TestCasesView.js public/css/style.css pages/dashboard/TestCaseListPage.ts tests/ui/test-case-workbench.spec.ts
git commit -m "feat: add selected test case action state"
```

### Task 4: Regression verification and reconciliation

**Files:**
- Modify: `docs/tasks/BDS-251-test-case-table-filter-workbench.md`

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: recorded static and focused-test evidence for the review phase.

- [ ] **Step 1: Run focused dashboard coverage**

Run: `npx playwright test tests/ui/dashboard.spec.ts tests/ui/test-case-workbench.spec.ts`

Expected: PASS with the existing dashboard behaviors and all BDS-251 scenarios.

- [ ] **Step 2: Run static verification**

Run:

```bash
npm run typecheck
npm run lint
```

Expected: both commands exit 0 with no errors or warnings.

- [ ] **Step 3: Record results and reconcile the task memory**

List every modified or added file and the exact command result under `## Change Reconciliation` and `## Verification Results` in the BDS-251 task file. Keep the task in `implementation` until a separate `spec-review` pass.

- [ ] **Step 4: Commit the reconciliation record**

```bash
git add docs/tasks/BDS-251-test-case-table-filter-workbench.md
git commit -m "docs: reconcile BDS-251 implementation"
```
