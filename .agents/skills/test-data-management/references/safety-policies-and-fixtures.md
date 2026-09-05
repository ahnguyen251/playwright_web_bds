# Test Data & Safety Policies Guide

## 1. Safety Policies for Production Testing

Target site: `https://propifyy.duckdns.org/`

The test runner enforces safety policies defined in `.env` and validated by Zod (`config/environment.schema.ts`):

- `RUN_MUTATING_E2E`: Default `false`. When `false`, mutating tests will immediately skip to protect production state.
- `RUN_OTP_E2E`: Default `false`. Controls real Gmail OTP retrieval via Google OAuth API.

## 2. Test Fixture Hierarchy

Composed in `fixtures/`:

- `fixtures/test.fixture.ts`: Aggregates all fixtures into a single `test` export.
- `fixtures/auth.fixture.ts`: Manages default user credentials, login states, and request observers.
- `fixtures/page.fixture.ts`: Instantiates all Page Objects (`loginPage`, `profilePage`, `listingPage`, etc.).
- `fixtures/workflow.fixture.ts`: Instantiates business workflows (`loginWorkflow`, `appointmentWorkflow`).
- `fixtures/mutating.fixture.ts`: Applies safety guards for mutating scenarios.

## 3. Data Factories

- Test data factories reside in `test-data/factories/`.
- Generate unique timestamps or randomized identifiers to prevent collision during concurrent test runs.
- Never hardcode user passwords in plain text in test files; use `defaultUser.password` or environment variables.

## 4. SQLite Tracking & Evidence

- Every test execution run results can be saved into SQLite database (`database/runtime-database.ts`).
- Persistent screenshots/videos on failure stored in `evidence/` and cleaned via `npm run evidence:cleanup`.
