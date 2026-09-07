# Antigravity (Gemini) Instructions for Playwright Web BDS

Treat `AGENTS.md` as the authoritative guideline for repository conventions and boundaries.

## Key Antigravity Behaviors

1. **Spec-First Lifecycle**:
   - For all non-trivial tasks, run or invoke skill `spec-start`.
   - Maintain persistent task memory in `docs/tasks/<ticket>-<topic>.md`.
   - Run validation script:
     `node scripts/validate_discussion.js docs/tasks/<ticket>-<topic>.md --phase <phase> --update-metadata`
   - NEVER start coding without explicit user approval (`implementation-approved: true`).
   - When code is ready, run or invoke skill `spec-review` to verify diff and execute tests.

2. **Strict Playwright Conventions**:
   - No locators in `tests/`.
   - No `@playwright/test` assertions in `pages/` (Page Objects extend `BasePage`).
   - Workflows in `workflows/` coordinate multi-page flows without cross-test state.
   - No `page.waitForTimeout()`.
   - Tag mutating tests `@mutating` in `*.mutating.spec.ts`.

3. **Verification Priority**:
   - Always run `npm run typecheck` and `npm run lint` before declaring completion.
   - Run target Playwright specs using `npx playwright test ...`.
