---
name: technical-reviewer
description: Review Playwright Web BDS test automation code, Page Objects, workflows, fixtures, and locators for architectural conformance, locator resilience, mutation safety, flakiness prevention, and type correctness. Use during spec-review or standalone code review.
---

# Technical Reviewer

Review Playwright Web BDS diffs and implementations against framework standards.

## Workflow

1. Read the active discussion file (`docs/tasks/<ticket>-<topic>.md`), identifying `[DoD-n]`, Acceptance Criteria, and `## Expected File Changes`.
2. Review the diff of all modified/created files using `references/playwright-review-checklist.md`.
3. Check strict 4-layer boundaries:
   - Tests do not touch locators directly;
   - Page Objects do not execute assertions;
   - Workflows orchestrate journeys cleanly;
   - Fixtures handle composition and lifecycle isolation.
4. Verify anti-flakiness rules:
   - Zero hardcoded sleeps (`page.waitForTimeout`);
   - Web-first assertions with auto-retry;
   - Correct handling of asynchronous dialogs and transitions.
5. Verify mutation safety gates:
   - Mutation tests isolated in `mutating-chromium` project with single worker;
   - Guarded by `RUN_MUTATING_E2E`.
6. Format findings using `references/impact-report-format.md` and pass them to `discussion-maintainer` to record in `## Impact Analysis`.
