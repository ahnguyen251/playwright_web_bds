---
name: spec-review
description: Review, verify, and complete a Playwright Web BDS Spec-First task.
---

# spec-review

Review implemented code with approved discussion, run tests, and verify evidence.

Read and follow `.windsurf/workflows/spec-review.md` completely before taking task actions.

## Procedure

1. Identify the selected discussion file (`docs/tasks/<ticket>-<topic>.md`).
2. Transition to review phase: set `phase: review`, `validation: pending`.
3. Invoke `technical-reviewer` to analyze diff against architecture rules and populate `## Impact Analysis`.
4. Invoke `verification-designer` to design the test execution plan in `## Verification Plan`.
5. Execute Agent-owned tests:
   - `npm run typecheck`
   - `npm run lint`
   - Scoped Playwright tests: `npx playwright test <path>`
6. Request developer confirmation only for manual checks (real Gmail OTP, external Google OAuth).
7. Record results in `## Verification Results`.
8. Once all acceptance criteria and DoD are verified:
   - Set `status: completed`, `phase: completed`.
   - Run validation: `node scripts/validate_discussion.js <file> --phase completion --update-metadata`
   - Notify user that the task is completed.
