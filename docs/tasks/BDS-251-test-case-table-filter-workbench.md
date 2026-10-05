---
ticket: BDS-251
topic: test-case-table-filter-workbench
template-version: 1.1
status: active
phase: implementation
memory-version: 5
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-09-16
---

# BDS-251 - test-case-table-filter-workbench

## Objective

Refine the Test Case List interface so QA users can find and filter test cases quickly, review the most relevant run status, select multiple cases, and initiate the selected-test action from a focused command bar.

## Current Understanding

The work is limited to the Test Case List interface. The approved visual direction is a compact, command-bar layout above the data table; broader execution behaviour is a later phase.

## Requirements

- Provide one command bar containing search and filters for module, automation status, and latest run outcome.
- Search must cover test ID, title, and script path.
- Surface active filters as removable chips with a clear-all action.
- Retain the table information for test ID, module, title, automation status, latest run, and row actions.
- Support individual and all-visible-row selection.
- Show the selected count and a disabled-until-selection primary action labeled “Chạy test đã chọn”.

## Acceptance Criteria

- [Derived-1] Users can filter the rendered Test Case List by module, automation status, and latest run outcome (Pass, Fail, or Chưa chạy).
- [Derived-2] Users can search rendered rows by test ID, title, or script path.
- [Derived-3] Active filters are visible and removable individually, and users can clear all active filters.
- [Derived-4] Selecting one or more visible rows updates the selection count and enables “Chạy test đã chọn”; no selection leaves the action disabled.
- [Derived-5] Existing Test Case List table information and per-row actions remain available.

## Verified Findings

- `public/js/views/TestCasesView.js` is the active dashboard view for the Test Case List. It already has a module-pill section, an API-backed, debounced search input, a table, and pagination.
- `public/js/api.js` calls `GET /api/test-cases` and supports `page`, `pageSize`, `search`, and `module` today.
- `server/schemas/index.ts` accepts `module`, `automationStatus`, and `search`; it has no query parameter for latest-run outcome.
- `database/repositories/TestCaseReadRepository.ts` currently returns only `test_cases` rows. The latest outcome is available only by deriving it from `test_results` joined with `test_runs` and is not included in the list response.
- `test_cases` stores `test_case_id`, `module`, `title`, `automation_status`, and `script_path`; it has no selector-text field. Current server-side search covers only test ID and title.
- `tests/ui/dashboard.spec.ts` has in-memory seeded dashboard coverage for search and module filtering.

## Confirmed Decisions

- The user selected the compact command-bar layout (option A) over a persistent filter sidebar.
- Initial filters are module, automation status, and latest run outcome.
- The user wants the selected-test run action as the initial bulk action.
- This ticket focuses on the interface; runner execution integration is deferred to a later functional phase.
- Search uses the available script path instead of selector text; introducing selector storage/search is deferred because no selector field or authoritative source exists today.

## Constraints

- Preserve unrelated uncommitted workspace changes.
- Avoid implementing or invoking mutating test execution in this UI-focused phase.
- The dashboard has no stored selector text; selector storage/search is out of scope for this UI-focused ticket.

## Out of Scope

- Changes to test execution orchestration, persistence, or production data.
- New filtering dimensions beyond the confirmed initial filters.

## Proposed Implementation

- Extend the Test Case List contract with a safe, read-only latest-result projection and an optional latest-run-status filter.
- Update the client API and the existing TestCasesView command bar to combine module, automation-status, and latest-run filters; render removable active-filter chips.
- Add table selection state and an enabled-only-when-selected “Chạy test đã chọn” interface control without invoking the runner.
- Preserve the existing module tabs, test-detail links, row information, pagination, and existing local work while integrating the new controls.

## Expected File Changes

- `database/repositories/TestCaseReadRepository.ts`: added a typed latest-result projection, latest-run-status filtering, and script-path search.
- `server/schemas/index.ts`: validates `latestRunStatus` as `PASSED`, `FAILED`, or `NOT_RUN`.
- `public/js/api.js`: sends a filter object to the list endpoint.
- `public/js/views/TestCasesView.js`: added the command bar, removable chips, latest-run column, selection state, and a UI-only bulk-action control.
- `public/css/style.css`: added command-bar, filter-chip, selected-row, bulk-action, and visually-hidden-label presentation.
- `pages/dashboard/TestCaseListPage.ts`: added semantic locators and interaction methods for the dashboard Test Case List.
- `tests/ui/test-case-workbench.spec.ts`: added local-server coverage for latest-run API filtering, chip reset, and selected-row action state.
- `docs/superpowers/plans/2026-09-16-test-case-table-filter-workbench.md`: implementation plan for this ticket.

## Open Questions

- [non-blocking] The later runner-integration ticket must define execution policy, progress reporting, and failure handling for selected cases.

## Risks and Conflicts

- The existing dashboard UI tests use direct locators. New coverage for this ticket must follow the project’s Page Object and locator-boundary rules without widening the refactor unnecessarily.

## Impact Analysis

- The list API is consumed by `TestCasesView`; changes to its response need to retain current pagination and item fields.
- Existing dashboard UI tests rely on the `Search Test Cases...` placeholder, table rows, Test Case links, and module tabs.

## Verification Plan

- Add focused UI coverage for the accepted command-bar filters, active-filter reset, and selected-row action state using the in-memory dashboard test setup.
- Run the focused dashboard test, then `npm run typecheck` and `npm run lint` after implementation.

## Verification Results

- `npx playwright test tests/ui/test-case-workbench.spec.ts --project=framework --reporter=line`: PASS (3 tests).
- `npx playwright test tests/ui/dashboard.spec.ts tests/ui/test-case-workbench.spec.ts --project=framework --reporter=line`: PASS (9 tests).
- `npx playwright test tests/ui/dashboard.spec.ts tests/ui/test-case-workbench.spec.ts tests/ui/test-case-details.spec.ts tests/ui/run-details.spec.ts`: PASS (21 tests).
- `npm run typecheck`: PASS (exit 0).
- `npx eslint database/repositories/TestCaseReadRepository.ts server/schemas/index.ts pages/dashboard/TestCaseListPage.ts tests/ui/test-case-workbench.spec.ts`: PASS (exit 0).

## Change Reconciliation

- Implementation approval: explicit user confirmation after the command-bar design and mockup visual alignment.
- Baseline branch: `main` at commit `e367af585a7dbeba584cd72ee2cd08fe5a4ed0f2` (`feat: add testcase listing`).
- Implemented complete UI redesign matching user mockup:
  - Sidebar: Added `Propify Playwright` logo, `BẢNG ĐIỀU KHIỂN` section title, navigation icons, test case count badge, and QA profile footer.
  - Topbar: Added breadcrumb with live status dot, `[▶ Chạy Toàn Bộ Test Suite]` green button, and `[+ Thêm Test Case Mới]` blue button.
  - 4 KPI metric cards: Tổng test toàn hệ thống, Bao phủ tự động (dynamic module calculation), Cần tự động hoá, Tỷ lệ pass Playwright.
  - Module pills: Replaced raw tabs with rounded module pills displaying count badges and active highlight.
  - Toolbar: Search input, status select dropdown (`Tất cả trạng thái`), and `[📥 Xuất File]` button.
  - Module strip: Added module name, stats (Tổng, Tự động, Chưa tự động), and progress bar.
  - Table: Standardized columns to `MÃ`, `MÔ-ĐUN`, `TIÊU ĐỀ & MỤC TIÊU KIỂM THỬ`, `TRẠNG THÁI`, `LẦN CHẠY TRƯỚC`, `THAO TÁC`. Included action buttons `[▶]`, `[</>]`, `[+ Viết Script]`, `[⋮]`.
  - Bulk action toolbar: Selection count and `Chạy test đã chọn` button.
- Retained full backward compatibility with existing tests and 4-layer architecture.
