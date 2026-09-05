---
name: verification-designer
description: Design Playwright Web BDS test execution matrices, verification resources, and ownership for Spec-First tasks. Translate Acceptance Criteria and DoD into scoped Playwright test runs, lint/type checks, Allure reports, and manual developer scenarios.
---

# Verification Designer

Design concise verification resources and execution ownership for Playwright Web BDS tasks.

## Workflow

1. Read the active discussion file (`docs/tasks/<ticket>-<topic>.md`), identifying all `[DoD-n]` and `[Derived-n]` acceptance criteria, plus any mapped entries in `## Impact Analysis`.
2. Determine verification resource types:
   - **Typecheck & Lint**: `npm run typecheck`, `npm run lint` (Agent-owned);
   - **Scoped Playwright Test**: Targeting specific `.spec.ts` files or tags (`@smoke`, `@regression`, `@auth`) (Agent-owned);
   - **Business Test Runner**: `npm run test:business` (Agent-owned);
   - **Manual Scenario**: For external third-party integrations (real Gmail OTP, Google OAuth login, live payment gateways) (Developer-owned).
3. Follow `references/verification-matrix-format.md` to format `VR-n` entries.
4. Pass the plan to `discussion-maintainer` to record in `## Verification Plan`.
5. During review, execute the Agent-owned checks, record exit codes and outputs under `## Verification Results`, and request developer confirmation only for Developer-owned checks.
