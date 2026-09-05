---
name: spec-implement
description: Begin or resume the implementation phase of an approved Playwright Web BDS Spec-First task.
---

# spec-implement

Begin implementation from an approved discussion file in `docs/tasks/`.

Read and follow `.windsurf/workflows/spec-implement.md` completely before taking task actions.

## Procedure

1. Identify the approved discussion file in `docs/tasks/<ticket>-<topic>.md`.
2. Confirm explicit user approval (`implementation-approved: true`).
3. Set `phase: implementation`, `validation: pending`. Run validation:
   `node scripts/validate_discussion.js <file> --phase implementation --update-metadata`
4. Record the baseline git diff in `## Change Reconciliation`.
5. Invoke domain skills to make code changes:
   - `playwright-e2e-automation` for test scenarios;
   - `page-component-design` for Page Objects and components;
   - `test-data-management` for fixtures and factories.
6. Enforce technical boundaries:
   - No locators in `tests/`;
   - No assertions in `pages/`;
   - No `page.waitForTimeout()`;
   - Mark mutating tests with `@mutating` and suffix `*.mutating.spec.ts`.
7. Verify static correctness:
   `npm run typecheck`
   `npm run lint`
8. Reconcile changes in `## Change Reconciliation` and `## Expected File Changes`.
9. Notify user: `Implementation is ready. Enter /spec-review (or run skill spec-review) to begin review.`
