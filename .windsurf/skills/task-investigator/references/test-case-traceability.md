# Test Case Catalog & Traceability Investigation

When investigating existing test coverage, case IDs, and business requirements:

## 1. Traceability Sources

1. **Requirements & Backlog Docs**:
   - `docs/traceability/requirements-to-tests.md`: Master matrix connecting business requirements, test case IDs, and Playwright spec files.
   - `document/Propify_Playwright_TestCase_Unified.md`: Detailed business test case specifications.
   - `document/NghiepvuPropify.pdf`, `document/Mô tả màn hình.pdf`: Original functional specifications and UI designs.

2. **Typed Test Case Catalogs**:
   - Located under `test-cases/`:
     - `test-cases/authentication/`: Login, register, forgot password, profile cases.
     - `test-cases/listings/`: Search, filter, view details, create listing.
     - `test-cases/appointments/`: Booking, reschedule, cancel.
     - `test-cases/transactions/`: Payment history, transaction packages.
     - `test-cases/chat/`, `test-cases/ranking/`, `test-cases/packages/`.
   - Each catalog exports typed objects conforming to `TestCaseDefinition`:
     - `id`: e.g. `AUTH-LOGIN-001`
     - `title`: human-readable description
     - `priority`: `'P0'` | `'P1'` | `'P2'`
     - `tags`: e.g. `['@smoke', '@regression', '@authentication']`
     - `expectedResult`: description of expected outcome

3. **Database Runtime Tracking**:
   - Run results are persisted in SQLite: `database/runtime-database.ts`, `database/schema.ts`.
   - Use `npx ts-node scripts/query-verification.ts` to inspect recent test runs and flaky failures.

4. **Recording Findings**:
   - Extract the exact test case ID, module path, and execution policy before drafting changes.
   - Record in `## Verified Findings` of the active discussion file.
