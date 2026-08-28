# Repository Log and Message Localization Implementation Plan

**Goal:** Localize safe operational, developer, and dashboard messages into professional Vietnamese
without changing business behavior, API/machine contracts, assertions, selectors, or traceability.

**Architecture:** Apply conservative, dependency-aware string replacements in place. A focused static
localization guard defines the approved safe phrases and protected deferred phrases. No localization
framework or logging abstraction is introduced.

**Spec:** `docs/superpowers/specs/2026-08-25-repository-localization-design.md`

## Global constraints

- Preserve every pre-existing dirty change and work directly in the current working tree.
- Do not edit an assertion or selector to accommodate translated production output.
- Do not change API response messages, codes, fields, HTTP statuses, status enums, IDs, canonical
  titles, catalog entries, expected results, or traceability mappings.
- Do not translate the import-boundary probe JSON output or persisted report fields.
- Do not add logs, refactor architecture, or rename code symbols/files.
- Do not run live/production E2E, OTP, registration, profile, listing, favorite, appointment, or any
  other mutation.
- Do not reset, restore, checkout, clean, stash, stage, commit, push, merge, or create a PR.
- Follow RED -> GREEN -> REFACTOR and use fresh verification evidence before completion claims.

## Task 1: Capture pre-change safety and traceability baselines

**Read-only evidence:** Git status/staging state, database path/size/SHA-256, current Playwright
discovery count, and catalog/automation-status test output.

- [ ] Confirm branch and dirty paths without modifying them.
- [ ] Confirm `git diff --cached --name-only` is empty.
- [ ] Fingerprint `data/autotest.db` without opening or rewriting it.
- [ ] Run Playwright list discovery and record executions/spec count.
- [ ] Run the focused catalog/traceability baseline tests.

## Task 2: Add the localization regression guard (RED)

**Create:** `tests/unit/localization/human-readable-messages.spec.ts`

- [ ] Add a table of approved safe English phrases by production file and proposed Vietnamese text.
- [ ] Add a protected table for representative API, machine-output, asserted, selector, ID, and
      status strings that must remain unchanged.
- [ ] Run the new test and verify it fails because approved safe English phrases still exist.
- [ ] Do not change any existing test or selector.

## Task 3: Localize safe operational output (GREEN slice 1)

**Expected files:** reporter console summary, database/verification/import scripts,
`scripts/run-business-tests.ts`, `server/index.ts`, and the unhandled-error log prefix.

- [ ] Translate only the phrases listed as safe in the RED test.
- [ ] Preserve identifiers, values, paths, signals, field names, and the business summary formatter.
- [ ] Run the localization guard and focused reporter/script/server tests.
- [ ] Revert and defer any phrase whose translation breaks an existing dependency.

## Task 4: Localize safe dashboard text (GREEN slice 2)

**Expected files:** `public/js/api.js`, `public/js/components/Pagination.js`,
`public/js/components/ResultDetailsModal.js`, and safe accessibility/title text in
`public/js/views/TestCaseDetailsView.js`.

- [ ] Translate fallback/user-visible text not used as a selector or exact assertion.
- [ ] Keep `Search Test Cases...`, raw status values, API fields/codes, and result/application data.
- [ ] Run the localization guard and existing UI tests.
- [ ] Revert and defer any newly discovered test dependency.

## Task 5: Localize safe developer diagnostics (GREEN slice 3)

**Expected files:** selected config, fixture, helper, factory, Page Object, utility, and workflow
files whose message text is not API-exposed or test-dependent.

- [ ] Translate one dependency-audited group at a time.
- [ ] Run the smallest related unit/component test after each group.
- [ ] Leave all exact/substr asserted diagnostics unchanged.
- [ ] Do not translate application-originated assertion text.

## Task 6: Scoped quality gates

- [ ] Run the focused localization guard.
- [ ] Run all affected framework/unit/API/UI tests without production mutation projects.
- [ ] Run `npm run typecheck`.
- [ ] Run scoped ESLint on files changed by this localization task.
- [ ] Run scoped Prettier check on files changed by this localization task.
- [ ] Inspect `git diff` to confirm string-only production changes plus the approved docs/test guard.

## Task 7: Final safety and traceability comparison

- [ ] Run `npx playwright test --list --reporter=list` and compare discovery count.
- [ ] Re-run catalog/traceability baseline tests and compare Test Case IDs/statuses.
- [ ] Recompute database size/SHA-256 and compare with Task 1.
- [ ] Confirm no sensitive value was introduced into output calls.
- [ ] Confirm staging is empty and no commit/push/merge/PR or production mutation occurred.
- [ ] Report exact translated/deferred/preserved counts and changed files.
