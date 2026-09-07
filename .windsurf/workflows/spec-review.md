---
description: Review implemented code with approved discussion, run tests, and verify evidence (Spec-First Development)
---

1. Apply `../rules/spec-first-development.md`, especially **Persistent task memory** and the **Review** skill routing.
2. Identify the selected discussion file (`docs/tasks/<ticket>-<topic>.md`). Transition to review phase:
   - Set `phase: review`, `validation: pending`.
3. Invoke `discussion-maintainer` to establish the review baseline and task-owned diff.
4. Invoke `technical-reviewer` to analyze the diff against `../rules/technical-rules.md` and produce the Impact Report (`## Impact Analysis`).
5. Invoke `verification-designer` to construct the active test matrix in `## Verification Plan`.
6. Execute Agent-owned verification according to `../rules/build-and-verify.md`:
   - `npm run typecheck`
   - `npm run lint`
   - Scoped Playwright test runs (e.g. `npx playwright test tests/<module>/<file>.spec.ts`).
7. Request only developer-owned manual evidence (real Gmail OTP, production external OAuth, etc.) when strictly necessary.
8. Record returned evidence and exit codes under `## Verification Results`.
9. When a required correction is identified, set `status: blocked` and tell the user:
   `Review found a required correction. Enter /spec-implement to resume implementation.`
10. Declare completion only after all acceptance criteria and `[DoD-n]` are verified:
    - Set `status: completed`, `phase: completed`.
    - Run: `node scripts/validate_discussion.js <file> --phase completion --update-metadata`.
    - Tell user: `Task verification completed successfully.`
