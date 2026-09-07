---
trigger: always_on
description: Spec-First Development lifecycle for Playwright Web BDS
globs:
---

# Spec-First Development

## 1. Task Interpretation

For every development or test automation task:
- **Goal**: Desired business or testing outcome.
- **Background**: Application and test framework context.
- **Task**: The requested automated test case, Page Object, fixture, or refactoring.
- **Definition of Done (DoD)**: Mandatory completion scope provided with the task.

Use `discussion-maintainer` rules for source precedence, classification, and DoD preservation.

## 2. Persistent Task Memory

The selected discussion file in `docs/tasks/<ticket-number>-<discussion-topic>.md` is the persistent memory and single source of truth for the task.
- Read it completely before analysis, clarification, coding, or review.
- If conversation and the file conflict, ask the user to clarify and reconcile via `discussion-maintainer`.
- Never modify source code until `implementation-approved: true` is explicitly granted.
- Run `node scripts/validate_discussion.js <file> --phase <phase> --update-metadata` across phase transitions.

## 3. Skill Routing by Phase

### Phase 1: Discussion (`spec-start`)
1. Use `discussion-maintainer` to create or resume task memory and maintain readiness.
2. Use `task-investigator` to inspect Page Objects, test cases catalog, DOM dumps, and contracts.
3. Reconcile findings into `## Verified Findings`, define testable acceptance criteria, preserve `[DoD-n]`.
4. Ask at most 1-2 high-impact clarification questions.

### Phase 2: Implementation (`spec-implement`)
1. Use `discussion-maintainer` to enter implementation and validate approval before making changes.
2. Use `playwright-e2e-automation` when authoring or modifying test specs in `tests/`.
3. Use `page-component-design` when creating or modifying Page Objects or Components in `pages/`.
4. Use `test-data-management` when updating fixtures, test data, or safety policies.
5. Obey `technical-rules.md` strictly (layer separation, resilient locators, auto-retrying assertions).
6. Reconcile code changes under `## Change Reconciliation` and `## Expected File Changes`. Implementation never marks the task completed.

### Phase 3: Review & Verification (`spec-review`)
1. `discussion-maintainer` establishes the review transition and git diff.
2. `technical-reviewer` analyzes the diff for layer boundaries, locator safety, flakiness, and mutation risks.
3. `discussion-maintainer` records findings and impacts into `## Impact Analysis`.
4. `verification-designer` formulates the execution matrix in `## Verification Plan`.
5. Run Agent-owned verification (typecheck, lint, scoped tests) per `build-and-verify.md`.
6. Record outputs in `## Verification Results`.
7. Once all criteria and DoD pass, transition to `completed`.
