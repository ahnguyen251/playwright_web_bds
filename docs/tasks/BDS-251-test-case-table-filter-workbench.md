---
ticket: BDS-251
topic: test-case-table-filter-workbench
template-version: 1.1
status: active
phase: discussion
memory-version: 3
implementation-approved: false
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
- [Derived-2] Users can search rendered rows by test ID, title, or selector text.
- [Derived-3] Active filters are visible and removable individually, and users can clear all active filters.
- [Derived-4] Selecting one or more visible rows updates the selection count and enables “Chạy test đã chọn”; no selection leaves the action disabled.
- [Derived-5] Existing Test Case List table information and per-row actions remain available.

## Verified Findings

- `public/js/views/TestCasesView.js` is the active dashboard view for the Test Case List. It already has a module-pill section, an API-backed, debounced search input, a table, and pagination; this file has uncommitted local changes in the baseline.
- `public/js/api.js` calls `GET /api/test-cases` and supports `page`, `pageSize`, `search`, and `module` today.
- `server/schemas/index.ts` accepts `module`, `automationStatus`, and `search`; it has no query parameter for latest-run outcome.
- `database/repositories/TestCaseReadRepository.ts` currently returns only `test_cases` rows. The latest outcome is available only by deriving it from `test_results` joined with `test_runs` and is not included in the list response.
- `test_cases` stores `test_case_id`, `module`, `title`, `automation_status`, and `script_path`; it has no selector-text field. Current server-side search covers only test ID and title.
- `tests/ui/dashboard.spec.ts` has in-memory seeded dashboard coverage for search and module filtering, but it also has uncommitted local changes.

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

- `database/repositories/TestCaseReadRepository.ts`: latest-result projection, search/filter support, and result-status filtering.
- `server/schemas/index.ts`: validate the latest-run-status query parameter.
- `public/js/api.js`: send the expanded list-filter contract.
- `public/js/views/TestCasesView.js`: command bar, chips, selection state, table columns, and bulk-action control.
- `public/css/style.css`: command-bar, filter-chip, selected-row, and bulk-action presentation.
- `tests/ui/dashboard.spec.ts` or a new dashboard-focused page abstraction/spec: regression coverage for the approved interactions.

## Open Questions

- [non-blocking] The later runner-integration ticket must define execution policy, progress reporting, and failure handling for selected cases.

## Risks and Conflicts

- The workspace contains existing uncommitted changes, including the exact `TestCasesView.js`, API, repository, route, CSS, and dashboard test surfaces likely affected by this work. They must be treated as user-owned baseline changes and reconciled before editing overlapping files.

## Impact Analysis

- The list API is consumed by `TestCasesView`; changes to its response need to retain current pagination and item fields.
- Existing dashboard UI tests rely on the `Search Test Cases...` placeholder, table rows, Test Case links, and module tabs.

## Verification Plan

- Add focused UI coverage for the accepted command-bar filters, active-filter reset, and selected-row action state using the in-memory dashboard test setup.
- Run the focused dashboard test, then `npm run typecheck` and `npm run lint` after implementation.

## Verification Results

- Not run during discussion.

## Change Reconciliation

- Baseline branch: `main` at the workspace root. The workspace is a normal checkout, not an isolated linked worktree.
- Baseline contains pre-existing modifications to `data/autotest.db`, backend repositories/services/routes, dashboard assets, page objects, test cases, and UI/unit tests, plus untracked task/test/component files and `.superpowers/` companion artifacts.
