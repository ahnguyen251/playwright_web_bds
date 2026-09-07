---
description: Begin implementation from an approved discussion file (Spec-First Development)
---

1. Apply `../rules/spec-first-development.md`, especially **Persistent task memory** and the **Implementation** skill routing.
2. Identify the approved discussion file in `docs/tasks/`. If multiple files are possible, ask the user to select one.
3. Confirm that the user explicitly approved implementation for the current recorded scope (`implementation-approved: true`).
4. Execute `discussion-maintainer` to transition and validate task memory before source changes:
   - Set `phase: implementation`, `implementation-approved: true`, `validation: pending`.
   - Run: `node scripts/validate_discussion.js <file> --phase implementation --update-metadata`.
   - Proceed only if validation passes.
5. Record the current Git revision and relevant existing local changes as the **Change Reconciliation** baseline.
6. Inspect relevant existing code and invoke applicable implementation skills:
   - `playwright-e2e-automation` for test scenarios and assertions;
   - `page-component-design` for Page Objects and components;
   - `test-data-management` for fixtures, factories, and safety flags.
7. Comply strictly with `../rules/technical-rules.md`:
   - No locators in `tests/`;
   - No assertions in `pages/`;
   - No hardcoded `page.waitForTimeout()`;
   - Mutating tests marked with `@mutating` and `.mutating.spec.ts`.
8. Verify TypeScript compilation and linting:
   - `npm run typecheck`
   - `npm run lint`
9. Reconcile implementation state through `discussion-maintainer` under `## Change Reconciliation` and `## Expected File Changes`.
10. Keep the discussion file in the implementation phase and tell the user: `Implementation is ready. Enter /spec-review to begin review.`
