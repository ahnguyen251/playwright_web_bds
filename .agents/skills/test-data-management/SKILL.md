---
name: test-data-management
description: Manage test data, data factories, fixtures composition, mock providers, and safety execution policies (RUN_MUTATING_E2E, RUN_OTP_E2E) for Playwright Web BDS. Use when creating test data, modifying fixtures in fixtures/, configuring storage states, or integrating SQLite test run tracking.
---

# Test Data Management

Safeguard test data integrity and execution safety for Propify automated testing.

## Workflow

1. Check whether the requested test changes application data on Propify.
2. If read-only:
   - Use default storage state `.auth/defaultUser.json` when authenticated session is needed;
   - Use `test.use({ storageState: { cookies: [], origins: [] } })` when testing guest/unauthenticated journeys.
3. If mutating:
   - Verify that `RUN_MUTATING_E2E=true` is set before expecting tests to run;
   - Place in `*.mutating.spec.ts` and add tag `@mutating`;
   - Ensure dynamic data factories in `test-data/factories/` generate collision-free unique values.
4. Compose fixtures under `fixtures/`:
   - Extend `test.fixture.ts` for project-wide injection;
   - Avoid creating global mutable state in fixtures.
5. Record run metadata into SQLite using `scripts/import-run-result.ts` when required.
6. Follow `references/safety-policies-and-fixtures.md`.
