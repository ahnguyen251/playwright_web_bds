# Verification Matrix Format

When `verification-designer` formulates verification plans, it designs structured resources with clear ownership (Agent vs Developer).

## Format for `## Verification Plan`

```markdown
| ID | Criterion / DoD | Verification Resource | Owner | Command / Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **VR-1** | Type & Syntax | Typecheck | Agent | `npm run typecheck` |
| **VR-2** | Lint Conformance | ESLint | Agent | `npm run lint` |
| **VR-3** | `[DoD-1]` Valid login | Playwright Test | Agent | `npx playwright test tests/authentication/login.boundary.spec.ts` |
| **VR-4** | `[DoD-2]` Session persistence | Playwright Test | Agent | `npx playwright test tests/authentication/profile.spec.ts` |
| **VR-5** | Real Gmail OTP Receipt | Manual Scenario | Developer | Developer checks inbox for 6-digit OTP when `RUN_OTP_E2E=true`. |
```

## Format for `## Verification Results`

```markdown
- **VR-1 (Typecheck)**: PASSED (exit code 0, 0 errors).
- **VR-2 (Lint)**: PASSED (exit code 0, 0 warnings).
- **VR-3 (Login Boundary Test)**: PASSED (2 passed, duration: 4.8s).
- **VR-4 (Profile Persistence)**: PASSED (1 passed, duration: 2.3s).
- **VR-5 (Manual Gmail OTP)**: CONFIRMED by developer on 2026-09-06.
```
